# Softphone — 602 561 5116

A standalone softphone for one Twilio number. Make and receive calls from
a laptop browser today; register a physical phone to the same number later
without touching code.

Deliberately independent: no Stripe, no KV, no marketplace logic, no
shared worker. The only thing it knows about is the number.

## How it works

One Cloudflare Worker serves both the dialer page and the Twilio webhooks
behind it, so there is a single deploy and a single URL.

```
                    ┌──────────────────────────────┐
  caller ──────────>│  +1 602 561 5116  (Twilio)   │
                    └──────────────┬───────────────┘
                                   │ POST /voice/inbound
                                   v
                    ┌──────────────────────────────┐
                    │      softphone worker        │
                    │  TwiML · access tokens · UI  │
                    └──────────────┬───────────────┘
                                   │ one <Dial>, both legs
                        ┌──────────┴──────────┐
                        v                     v
                  <Client>laptop       <Sip>phone (later)
                  browser dialer       Groundwire / Zoiper
```

Inbound calls ring every registered device at once and the first to answer
wins; the rest stop ringing. Unanswered calls fall through to a 2-minute
voicemail recording, retrievable in the Twilio console.

Outbound calls from either device show `+1 602 561 5116` as caller ID.

### Routes

| Route | Purpose |
| --- | --- |
| `GET /` | The dialer page |
| `POST /token` | Mints a 1-hour Voice access token (passcode-gated) |
| `POST /voice/inbound` | The number rang — fan out to your devices |
| `POST /voice/client-outbound` | Browser dialed out |
| `POST /voice/sip-outbound` | SIP phone dialed out |
| `GET /health` | Which config is present (never echoes values) |

## Setup

You need a Twilio account with 602 561 5116 on it, plus Node and `jq`.

**1. Deploy the worker** so you have a URL to point Twilio at.

```sh
npm install
npx wrangler deploy
```

Note the printed `https://twilio-softphone.<subdomain>.workers.dev`.

**2. Provision Twilio.** Credentials come from your environment and are
never written to disk. Get them from the Twilio Console dashboard.

```sh
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export WORKER_URL=https://twilio-softphone.<subdomain>.workers.dev

./scripts/setup-twilio.sh
```

This creates an API key and a TwiML app, and points the number's voice
webhook at the worker. It finishes by printing the exact `wrangler secret
put` commands with the real values filled in.

**3. Set the secrets** it printed, then choose a passcode for the page:

```sh
npx wrangler secret put SOFTPHONE_PASSCODE
```

**4. Redeploy** so the secrets are picked up:

```sh
npx wrangler deploy
```

**5. Open the worker URL**, enter the passcode, allow the microphone. The
status dot turns green and the number is live on your laptop.

Confirm config landed with `curl https://<worker-url>/health`.

## Adding a phone later

Nothing in the code changes. Run the script again with `--with-sip`:

```sh
export SIP_SUBDOMAIN=pick-something-globally-unique
./scripts/setup-twilio.sh --with-sip
```

It creates a Twilio SIP domain, a SIP credential, and the registration and
calling mappings, then prints the domain, username and password. Put those
three values into `wrangler.toml`:

```toml
SIP_ENABLED  = "true"
SIP_DOMAIN   = "pick-something-globally-unique.sip.twilio.com"
SIP_USERNAME = "phone"
```

Redeploy, then register any SIP app with the printed credentials — use TLS
on port 5061 with SRTP enabled. Known-good clients:

- **Groundwire** (iOS/Android, paid) — has real push, so it rings with the
  app closed. The right pick for a phone you actually carry.
- **Zoiper** or **Linphone** (free) — fine for desktop or testing; free
  tiers generally need the app foregrounded to ring.

Save the SIP password when it is printed. Twilio will not show it again;
re-running the script issues a new one.

**Why the flag:** dialing an unregistered SIP address adds a failing leg
to every inbound call, which delays the ring. `SIP_ENABLED=false` keeps
that leg out of the TwiML until a phone is genuinely registered.

## Security notes

- `POST /token` is passcode-gated. An open token endpoint lets anyone on
  the internet place calls billed to your Twilio account.
- Every `/voice/*` webhook verifies Twilio's `X-Twilio-Signature`, so a
  stranger cannot POST the worker into dialing out. Unsigned requests get
  a 403.
- On a custom domain, set `PUBLIC_BASE_URL` in `wrangler.toml` so
  signature verification uses the exact origin Twilio requested.
- The Twilio auth token and API key secret live only in worker secrets —
  never in this repo, never in the page.
- Tokens last an hour and refresh in place; the passcode is held in memory
  for the tab session only.

## Development

```sh
npm test          # signature + TwiML logic, no Twilio account needed
npm run dev       # local worker on :8787 (secrets from .dev.vars)
npm run vendor    # refresh the bundled Voice SDK from node_modules
```

The Twilio Voice SDK is vendored into `public/vendor/` rather than pulled
from a CDN, so the dialer has no external dependency and still loads on a
locked-down network. Bump it with `npm update @twilio/voice-sdk && npm run
vendor`.

For local dev, put fake secrets in `.dev.vars` (gitignored) and set
`PUBLIC_BASE_URL=http://127.0.0.1:8787` if you want to exercise signature
verification over plain HTTP.

## Things worth knowing

- **The tab must be open** to receive calls on the laptop. That is a
  WebRTC constraint, and the main reason to add a phone later.
- **Voicemail** recordings live in Twilio (Monitor → Logs → Recordings).
  There is no notification wired up.
- **One call at a time.** A second inbound call while you are talking is
  declined rather than allowed to steal the line.
- **Outbound normalization:** 10 digits assume +1, and 11 digits starting
  with 1 are taken as US. Anything else needs an explicit `+`.
- The dialpad sends DTMF tones mid-call instead of editing the number, so
  phone trees work.
