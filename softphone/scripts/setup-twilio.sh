#!/usr/bin/env bash
#
# Provision Twilio for the softphone, via the REST API.
#
# Run once for the laptop softphone, then again with --with-sip on the day
# you add a physical phone. Safe to re-run: existing resources are reused
# rather than duplicated.
#
#   export TWILIO_ACCOUNT_SID=AC...
#   export TWILIO_AUTH_TOKEN=...
#   export WORKER_URL=https://twilio-softphone.<subdomain>.workers.dev
#   ./scripts/setup-twilio.sh
#
# Credentials are read from the environment and never written to disk.

set -euo pipefail

API="https://api.twilio.com/2010-04-01"
NUMBER="${SOFTPHONE_NUMBER:-+16025615116}"
APP_NAME="${APP_NAME:-Softphone Browser Client}"
KEY_NAME="${KEY_NAME:-Softphone Worker}"
CRED_LIST_NAME="${CRED_LIST_NAME:-Softphone Devices}"
WITH_SIP=0

for arg in "$@"; do
  case "$arg" in
    --with-sip) WITH_SIP=1 ;;
    -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }

command -v jq >/dev/null || die "jq is required (brew install jq)."
command -v curl >/dev/null || die "curl is required."

: "${TWILIO_ACCOUNT_SID:?Set TWILIO_ACCOUNT_SID}"
: "${TWILIO_AUTH_TOKEN:?Set TWILIO_AUTH_TOKEN}"
: "${WORKER_URL:?Set WORKER_URL to your deployed worker origin}"

WORKER_URL="${WORKER_URL%/}"
[[ "$WORKER_URL" == https://* ]] || die "WORKER_URL must start with https://"

AUTH="${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}"

# Wrapper that surfaces Twilio's own error text instead of a bare exit code.
tw() {
  local method="$1" path="$2"; shift 2
  local args=() body status
  for p in "$@"; do args+=(--data-urlencode "$p"); done

  body="$(curl -sS -u "$AUTH" -X "$method" \
            -w $'\n%{http_code}' \
            "${args[@]}" \
            "${API}/Accounts/${TWILIO_ACCOUNT_SID}${path}")" \
    || die "Network call to Twilio failed."

  status="$(tail -n1 <<<"$body")"
  body="$(sed '$d' <<<"$body")"

  if [[ "$status" != 2* ]]; then
    local msg
    msg="$(jq -r '.message // empty' <<<"$body" 2>/dev/null || true)"
    die "Twilio ${method} ${path} -> HTTP ${status}${msg:+: $msg}"
  fi
  printf '%s' "$body"
}

bold "1. Verifying credentials"
FRIENDLY="$(tw GET ".json" | jq -r '.friendly_name')"
ok "Authenticated as: ${FRIENDLY}"

bold "2. Locating ${NUMBER}"
NUM_JSON="$(tw GET "/IncomingPhoneNumbers.json" "PhoneNumber=${NUMBER}")"
NUM_SID="$(jq -r '.incoming_phone_numbers[0].sid // empty' <<<"$NUM_JSON")"
[[ -n "$NUM_SID" ]] || die "${NUMBER} is not on this Twilio account."
ok "Found ${NUMBER} (${NUM_SID})"

bold "3. Creating an API key for the worker"
# Key secrets are returned exactly once, at creation, so a fresh key is
# minted each run. Delete superseded keys in the Twilio console.
KEY_JSON="$(tw POST "/Keys.json" "FriendlyName=${KEY_NAME}")"
KEY_SID="$(jq -r '.sid' <<<"$KEY_JSON")"
KEY_SECRET="$(jq -r '.secret' <<<"$KEY_JSON")"
[[ -n "$KEY_SECRET" && "$KEY_SECRET" != "null" ]] || die "No API key secret returned."
ok "API key ${KEY_SID}"

bold "4. TwiML app for outbound browser calls"
APPS="$(tw GET "/Applications.json" "FriendlyName=${APP_NAME}")"
APP_SID="$(jq -r '.applications[0].sid // empty' <<<"$APPS")"
if [[ -n "$APP_SID" ]]; then
  tw POST "/Applications/${APP_SID}.json" \
    "VoiceUrl=${WORKER_URL}/voice/client-outbound" "VoiceMethod=POST" >/dev/null
  ok "Reused and re-pointed app ${APP_SID}"
else
  APP_SID="$(tw POST "/Applications.json" \
    "FriendlyName=${APP_NAME}" \
    "VoiceUrl=${WORKER_URL}/voice/client-outbound" \
    "VoiceMethod=POST" | jq -r '.sid')"
  ok "Created app ${APP_SID}"
fi

bold "5. Pointing ${NUMBER} at the worker"
tw POST "/IncomingPhoneNumbers/${NUM_SID}.json" \
  "VoiceUrl=${WORKER_URL}/voice/inbound" "VoiceMethod=POST" >/dev/null
ok "Inbound calls -> ${WORKER_URL}/voice/inbound"

SIP_DOMAIN=""
SIP_USER=""
SIP_PASS=""

if [[ "$WITH_SIP" == "1" ]]; then
  bold "6. SIP domain for a physical phone"
  : "${SIP_SUBDOMAIN:?Set SIP_SUBDOMAIN (globally unique, e.g. rb-softphone)}"
  SIP_DOMAIN="${SIP_SUBDOMAIN}.sip.twilio.com"
  SIP_USER="${SIP_USERNAME:-phone}"

  DOMAINS="$(tw GET "/SIP/Domains.json")"
  DOMAIN_SID="$(jq -r --arg d "$SIP_DOMAIN" \
    '.domains[] | select(.domain_name==$d) | .sid' <<<"$DOMAINS" | head -n1)"

  if [[ -n "$DOMAIN_SID" ]]; then
    tw POST "/SIP/Domains/${DOMAIN_SID}.json" \
      "VoiceUrl=${WORKER_URL}/voice/sip-outbound" \
      "VoiceMethod=POST" "SipRegistration=true" >/dev/null
    ok "Reused SIP domain ${SIP_DOMAIN}"
  else
    DOMAIN_SID="$(tw POST "/SIP/Domains.json" \
      "DomainName=${SIP_DOMAIN}" \
      "FriendlyName=Softphone" \
      "VoiceUrl=${WORKER_URL}/voice/sip-outbound" \
      "VoiceMethod=POST" \
      "SipRegistration=true" | jq -r '.sid')"
    ok "Created SIP domain ${SIP_DOMAIN}"
  fi

  # Twilio requires mixed case, digits and 12+ chars.
  SIP_PASS="Sp$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 18)7"

  LISTS="$(tw GET "/SIP/CredentialLists.json")"
  CL_SID="$(jq -r --arg n "$CRED_LIST_NAME" \
    '.credential_lists[] | select(.friendly_name==$n) | .sid' <<<"$LISTS" | head -n1)"
  if [[ -z "$CL_SID" ]]; then
    CL_SID="$(tw POST "/SIP/CredentialLists.json" \
      "FriendlyName=${CRED_LIST_NAME}" | jq -r '.sid')"
    ok "Created credential list ${CL_SID}"
  else
    ok "Reused credential list ${CL_SID}"
  fi

  # Replace any existing credential for this username so the printed
  # password is always the one that actually works.
  EXISTING="$(tw GET "/SIP/CredentialLists/${CL_SID}/Credentials.json")"
  OLD="$(jq -r --arg u "$SIP_USER" \
    '.credentials[] | select(.username==$u) | .sid' <<<"$EXISTING" | head -n1)"
  if [[ -n "$OLD" ]]; then
    curl -sS -u "$AUTH" -X DELETE \
      "${API}/Accounts/${TWILIO_ACCOUNT_SID}/SIP/CredentialLists/${CL_SID}/Credentials/${OLD}.json" \
      >/dev/null || true
  fi
  tw POST "/SIP/CredentialLists/${CL_SID}/Credentials.json" \
    "Username=${SIP_USER}" "Password=${SIP_PASS}" >/dev/null
  ok "Credential ${SIP_USER} set"

  # Registration mapping lets the phone register; the calls mapping lets
  # it dial out. Both are needed, and both 400 if already mapped.
  for kind in Registrations Calls; do
    curl -sS -u "$AUTH" -X POST \
      --data-urlencode "CredentialListSid=${CL_SID}" \
      "${API}/Accounts/${TWILIO_ACCOUNT_SID}/SIP/Domains/${DOMAIN_SID}/Auth/${kind}/CredentialListMappings.json" \
      >/dev/null 2>&1 || true
  done
  ok "Credential list mapped for registration and calling"
fi

echo
bold "Done. Set these worker secrets:"
cat <<EOF

  printf %s '${TWILIO_ACCOUNT_SID}' | npx wrangler secret put TWILIO_ACCOUNT_SID
  printf %s '${TWILIO_AUTH_TOKEN}'  | npx wrangler secret put TWILIO_AUTH_TOKEN
  printf %s '${KEY_SID}'            | npx wrangler secret put TWILIO_API_KEY_SID
  printf %s '${KEY_SECRET}'         | npx wrangler secret put TWILIO_API_KEY_SECRET
  printf %s '${APP_SID}'            | npx wrangler secret put TWIML_APP_SID

Then pick a passcode for the softphone page:

  npx wrangler secret put SOFTPHONE_PASSCODE

EOF

if [[ "$WITH_SIP" == "1" ]]; then
  cat <<EOF
$(bold "Then enable the phone leg in wrangler.toml:")

  SIP_ENABLED = "true"
  SIP_DOMAIN  = "${SIP_DOMAIN}"
  SIP_USERNAME = "${SIP_USER}"

...redeploy, and register your softphone app with:

  Domain / server : ${SIP_DOMAIN}
  Username        : ${SIP_USER}
  Password        : ${SIP_PASS}
  Transport       : TLS (port 5061), SRTP enabled

Save that password now — it is not recoverable from Twilio.

EOF
fi

bold "Deploy with: npx wrangler deploy"
