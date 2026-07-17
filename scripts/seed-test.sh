#!/usr/bin/env bash
# Seed / manage a test creator in KV_72 for the Emergence go-live test run.
# See GOLIVE-EMERGENCE.md step 3–5.
#
# Usage:
#   STRIPE_ACCT=acct_123 FORWARD=+15551234567 ./scripts/seed-test.sh seed
#   ./scripts/seed-test.sh get
#   ./scripts/seed-test.sh list
#   ./scripts/seed-test.sh offline        # flip the test creator offline
#   ./scripts/seed-test.sh online
#   ./scripts/seed-test.sh session <room> # inspect one call's lifecycle
#   ./scripts/seed-test.sh clean          # delete the test creator
#
# Requires: wrangler (logged in to the account that owns the Worker).
# Newer wrangler uses `kv key`; older uses `kv:key` — set KV="kv:key" if needed.

set -euo pipefail

NS="${NS:-0fb09e694dcc4b2fa5bab232724482f8}"   # KV_72 namespace id (from wrangler.toml)
KV="${KV:-kv key}"                              # override with KV="kv:key" on older wrangler
KEY="creator:testcreator"

# Fill these in (env vars), or edit the defaults — they are placeholders on purpose.
STRIPE_ACCT="${STRIPE_ACCT:-acct_REPLACE_ME}"
FORWARD="${FORWARD:-+1XXXXXXXXXX}"
USERNAME="${USERNAME:-jane}"
DISPLAY="${DISPLAY:-Jane Rivers}"
PRICE="${PRICE:-20}"

record() {
  local online="$1"
  cat <<JSON
{"userId":"testcreator","username":"${USERNAME}","displayName":"${DISPLAY}","stripeAccountId":"${STRIPE_ACCT}","chargesEnabled":true,"isOnline":${online},"pricePerCall":${PRICE},"forwardNumber":"${FORWARD}","subscriptionStatus":"active_trial","acquisitionCallUsed":false}
JSON
}

kv() { wrangler $KV "$@" --namespace-id="$NS" --remote; }

case "${1:-seed}" in
  seed)
    if [ "$STRIPE_ACCT" = "acct_REPLACE_ME" ] || [ "$FORWARD" = "+1XXXXXXXXXX" ]; then
      echo "⚠  Set a real STRIPE_ACCT (acct_...) and FORWARD (+1...) first:"
      echo "   STRIPE_ACCT=acct_123 FORWARD=+15551234567 $0 seed"
      exit 1
    fi
    kv put "$KEY" "$(record true)"
    echo "✓ seeded $KEY  (call it at /call/${USERNAME} · dashboard: 72-app-dashboard.html?userId=testcreator)"
    ;;
  get)     kv get "$KEY" ;;
  list)    kv list --prefix "creator:" ;;
  online)  kv put "$KEY" "$(record true)";  echo "✓ online" ;;
  offline) kv put "$KEY" "$(record false)"; echo "✓ offline" ;;
  session)
    [ -n "${2:-}" ] || { echo "usage: $0 session <room-name>"; exit 1; }
    kv get "callsession:$2" ;;
  clean)   kv delete "$KEY"; echo "✓ deleted $KEY" ;;
  *) echo "usage: $0 {seed|get|list|online|offline|session <room>|clean}"; exit 1 ;;
esac
