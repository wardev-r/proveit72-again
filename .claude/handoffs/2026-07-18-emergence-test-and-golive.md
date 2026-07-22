# Session Handoff — 72 "Emergence" · test the paid-call flow, then go live

You're picking up a project in flight. This is the full context. Read it top to bottom before doing anything, then greet Robert and continue directing him.

---

## How to work with Robert (read this first — it matters more than the tech)

- **He learns by trial-and-error and wants a DIRECTOR, not a lecturer.** Give the exact next click/command, let him run it, react to what he pastes back. Drop pep-talks and coddling — he'll tell you if he's stressed (he'll say "I'm good"). Match his energy: fast, blunt, a little humor.
- **He prefers CLICKING (dashboards) over the terminal** wherever possible. When a thing can be done in the Cloudflare or Stripe web UI, route him there instead of the CLI.
- **Windows + Git Bash.** His terminal mangles pasted secrets ("bracketed paste" injects phantom characters). Two safe workarounds: (a) paste into **Notepad** then load from file (`tr -d '[:space:]' < f.txt | …`), or (b) do it in a **web dashboard** (browser paste is clean). Never have him paste a long secret straight into a `read`/prompt.
- **His laptop freezes constantly** and sessions get long — hence this handoff. Nothing is ever lost (it's all server-side); reassure and continue.
- **Messages are fast and typo-heavy** (voice-to-text, dropped words). Infer intent; when a message is a garbled word or two, it's usually a slip — ask lightly, don't over-analyze.
- **⚠️ YOU (Claude) cannot reach Cloudflare or Stripe from your sandbox.** Outbound to their hosts returns `403` (network-walled). You cannot run `wrangler` against his account, cannot hit their APIs/dashboards, cannot even fetch `developers.cloudflare.com`. **All Cloudflare/Stripe actions are done BY HIM in his browser/terminal — you direct.** Don't offer to "just do it with a token"; the wall is the network, not permissions.

## The mission

Ship **"72 Emergence"** — the paid, completed-call flow — live on velvetrope2you.com. The code is **built and staged** on a branch; the job right now is to **run one real (test-mode) $10 call end-to-end to prove the money logic**, then promote to production.

**The model (inviolable rules — these are load-bearing):**
- Creator keeps **72%** always (`PLATFORM_FEE_PERCENT = 0.28`, never higher). Any discount/fee comes out of the platform's 28% or the caller's total, **never** the creator's 72%.
- **First call is a fixed $10** → creator gets **$7.20**.
- **Join = a one-time new-member acquisition deal**: a caller who becomes a member gets **17.2% covered** → pays **$8.28**, creator **still gets $7.20** (platform eats the discount). Burned once per member on a completed call, then they pay standard rates. It's acquisition cost, not a standing discount.
- **Lights off = no call, no charge.** `isOnline:false` → checkout is blocked server-side.
- **Authorize-then-capture.** Payment is **held** on pay, **captured only on a real connection** (both parties in the Jitsi room), **voided** on no-show/decline. No accepted connection ⇒ nothing captured ⇒ **nothing to refund.**
- **The number is claimed ON REQUEST** (a "Claim number" button on the dashboard), not auto-provisioned. **772 area code ONLY.**

## Where the code lives

- **Repo:** `wardev-r/proveit72-again`
- **Work branch:** `claude/twilio-emergence-4qbonn` ← all the Emergence work is here (preview/staged, NOT promoted)
- **Live/production branch:** `claude/twilio-deploy-bi6sbr` ← Cloudflare Pages project **`vrpi72-home`** builds this to velvetrope2you.com. **Do NOT confuse the two.** The emergence branch was cut FROM this live branch, so it's a clean superset (only ~6 files differ + docs).
- **Live API worker:** `api.velvetrope2you.com` is served by the Worker named **`proveit72-again`**.

## What's built on the emergence branch (the "cued-up changes")

- `72-stripe-worker.js` — the engine: `/create-call-checkout` (manual capture; mode-aware `first-call`=$10 / `join`=$8.28 / default=creator rate); `/membership-start` + `/membership-confirm` (free-month signup for the join path, synchronous confirm — no webhook race); `/provision-number` (772-only, on request); call-session state (`callsession:{room}`: pending→authorized→completed|voided); `/room/:room` (GET status), `/room/:room/connected` (capture), `/room/:room/void`; one-time acquisition gate (`acquisitionCallUsed`); `clearCreatorActiveRoom`.
- `call-first.html` — caller entry: **Call $10** / **Join → $8.28**; join collects email → free-month signup → returns as member → $8.28; **decline anywhere → $10**.
- `room.html` — embeds Jitsi via the **IFrame API**, detects a real connection (both present) → captures; leave/no-show → voids; honest "card held → charged / not charged" banner.
- `72-app-dashboard.html` — the **ringing Accept/Decline card** (polls `creator.activeRoom` while online) and the **Claim-number card**; `WORKER_URL = https://api.velvetrope2you.com`.
- `_redirects` — `/call/*` → `call-first.html` (primary $10 entry); `/pay/*` → `call.html` (the simple pay-your-rate option, left available).
- `wrangler.toml` — `name = "proveit72-again"` (the LIVE api worker; real go-live deploys here).
- `wrangler.test.toml` — `name = "proveit72-test"`, `workers_dev = true`, **no custom domain** (isolated testing; shares the live KV namespace).
- `CLAUDE.md` — added the **"URL is set FIRST" hardline** + DNS truth. `GOLIVE-EMERGENCE.md` — the go-live runbook. `scripts/seed-test.sh` — seed/manage a test creator in KV. `THINK-ABOUT-IT.md` — parked agent-readiness audit.

## Where we landed (test setup — this is exactly where to resume)

- ✅ **Domain live.** velvetrope2you.com resolves for the world. (The earlier "only I can see it" saga was NOT DNSSEC — it's Cloudflare-registered — it was the Pages **custom domain** needing to be attached to `vrpi72-home`. Done.)
- ✅ **Test worker deployed:** `https://proveit72-test.ward602.workers.dev` (via `wrangler deploy --config wrangler.test.toml`; isolated, no custom domain).
- ✅ **`STRIPE_SECRET_KEY`** (test `sk_test_…`) set on the test worker via the Cloudflare dashboard.
- ✅ **Stripe test webhook** "upbeat-celebration" → `https://proveit72-test.ward602.workers.dev/webhook`, listening to `checkout.session.completed` + `payment_intent.succeeded`. Stripe **sandbox id: `wtvrwnvr`**.
- 🔄 **Connect payout account for creator "jane"** — Robert made several while fighting Stripe's UI (`acct_1TuRlCL5h8MzgviF`, `acct_1TuZa1PxRH6hMZgu`, + a newest one). He's finishing one now. Need **Transfers: Active** + its **`acct_…` id**. (Only Transfers matters for us — Payouts/bank can stay paused; the bank nag does NOT block us.)
- ✅ **A split-screen demo** was built and he loved it (put it in his "HOF"): shows caller pays → dashboard rings → accept → capture / decline → void. It's the "see it work" win; the steps below are to make it *real*.

## Immediate next steps (in order)

1. **Get Jane's `acct_…` id** — Robert finishes her Connect account (Transfers → Active) and pastes the id. If stuck: Stripe **Connect → Accounts → click the account row** → Capabilities panel. Test values that auto-verify: SSN `000-00-0000`, DOB `01/01/1990`, phone = his **real landline** (all-zeros gets rejected), address `123 Test St, San Francisco, CA 94103`; **skip the bank**.
2. **Seed the creator in KV** (via the Cloudflare dashboard — Workers & Pages → KV → the namespace → **Add entry** → clicking, no terminal). Key `creator:testcreator`, value (fill in Jane's acct):
   ```json
   {"userId":"testcreator","username":"jane","displayName":"Jane Rivers","stripeAccountId":"acct_JANE","chargesEnabled":true,"isOnline":true,"pricePerCall":20,"forwardNumber":"+15555550100","subscriptionStatus":"active_trial","acquisitionCallUsed":false}
   ```
3. **Build a self-contained tester served BY the test worker** (PLANNED, not built yet). Add a `GET /test` route to the worker that returns a small HTML harness (Start $10 call → Stripe checkout → on return show room+token → "connect & capture" button → "void" button). Set `PLATFORM_URL` secret on the test worker to `https://proveit72-test.ward602.workers.dev` so Stripe's success redirect lands back on `/test`. **This avoids the frontend↔PLATFORM_URL redirect coupling** (the committed frontend hardcodes `api.velvetrope2you.com`, so you can't just open it locally). Redeploy test worker + set PLATFORM_URL.
4. **Run the real test** (Stripe test mode, card `4242 4242 4242 4242`): pay → PI should be **`requires_capture`** (held) → capture → **`succeeded`** → Jane's account receives the transfer ($7.20). Then a **decline/no-show** run → PI **`canceled`** (nothing charged). Watch it in the Stripe test dashboard.
5. **Then promote to production** per `GOLIVE-EMERGENCE.md`: verify the immediate→manual-capture switch, flip to `sk_live_`, point the Pages production branch at emergence (or merge into `claude/twilio-deploy-bi6sbr`), one real $10 call, domain last. **Worker+frontend must move together** (see What NOT to Do).

## Reference numbers / constants

- Cloudflare **account id:** `fa57824b7342b9ef2109cc5e8c449b04`
- **KV namespace id (KV_72):** `0fb09e694dcc4b2fa5bab232724482f8`
- Test worker: `proveit72-test.ward602.workers.dev` · Live API: `api.velvetrope2you.com` · Live worker name: `proveit72-again` · Pages project: `vrpi72-home`
- Stripe **sandbox:** `wtvrwnvr` · Test card `4242 4242 4242 4242` (any future exp/CVC) · Test SSN `000-00-0000` · DOB `01/01/1990` · Bank routing `110000000` / acct `000123456789`
- Auth for `wrangler`: Robert uses a **Cloudflare User API token** ("Edit Cloudflare Workers" template) via `export CLOUDFLARE_API_TOKEN=…` **(not** `wrangler login` — Opera blocks the OAuth popup). Pair with `export CLOUDFLARE_ACCOUNT_ID=fa57824b7342b9ef2109cc5e8c449b04`.

## What NOT to do

- **Do NOT deploy the emergence worker onto the LIVE `api.velvetrope2you.com` (`proveit72-again`) yet.** The live site is still the *old* frontend (charges immediately, no capture signal). If the new manual-capture worker goes on the live API alone, real calls would **authorize and never capture** — callers not charged, creators not paid. **Worker + emergence frontend must be promoted together.** Test only on `proveit72-test`.
- **Do NOT promote the emergence branch to Pages production** until the test passes and you flip to live Stripe keys.
- **Do NOT paste secrets into chat.** Secrets go in the Cloudflare dashboard or via the Notepad-file method on his machine.
- **Do NOT try to reach Cloudflare/Stripe from your sandbox** (403 wall) — direct Robert instead.
- **Do NOT trust the terminal for pasting secrets** (bracketed-paste mangling) — Notepad-file or dashboard.
- **Do NOT confuse the two Connect accounts / area codes / the two branches.** 772 area code only; creator keeps 72% always.

## "Site changes cued up" — what he means

The **entire emergence branch is the cued-up change set** awaiting test + promote. Robert also mentioned wanting to **perfect a few more site things** after — unspecified, so **ask him what those are** once the test is green.

---

## Parked for later — pricing architecture + site-copy pass (added 2026-07-20)
Decided, NOT yet built. Do these **after** the Emergence test proves the flow (one
variable at a time). Full rationale is in chat + `72-BRAND-VOICE.md`.

**Pricing architecture (Stripe):**
- **"The Proof Call"** ($10 first call) → make it a real Stripe **Product + fixed $10
  Price** (shared by all creators). Cleaner reporting; receipts say "Proof Call." Worker
  would reference the price id instead of inline `price_data`.
- **Member join discount** → implement as a real Stripe **coupon "17.2% off" (= $1.72)**
  applied to the Proof Call price → the receipt literally prints **"–$1.72"** (the 72
  winks). Replaces the hand-computed $8.28. Keep `application_fee_amount` set so the
  creator still nets **$7.20**.
- **Creator's ongoing rate** → keep **dynamic `price_data`** (any amount, true "no
  ceiling"). **Do NOT** pre-build a product per price tier — breaks "no ceiling", ~40
  objects, zero gain.
- **Tiered slider** ($1 steps to ~$20, $5 to $50, $10 after, open "custom" at the top)
  → pure **UI slider step logic**, no Stripe product behind each notch.

**Site-copy tweak pass (greenlit by Robert, NOT yet applied — index.html / paygate.html / why72.html):**
- **Hero:** swap the 4 rotator slides to the **table voice**, $10 as the only price.
  Drafted slides: *"72 is the seat at the table"* / *"Not everyone gets a seat"* /
  *"$10 to reach you · you keep 72%"* / *"One link. Your table. All yours."*
- **Payout = weekly** everywhere (fix "Instant payouts", index.html:723).
- **$10 is the ONLY price written in** — remove "From $5", the per-minute dropdown
  (paygate.html:146/150), and the "$3 call" example (index.html:766 → **"$7.20 on a
  $10 call"**).
- **One CTA:** "Claim your number →" → **"Claim your 72 link →"** (Robert may pick
  "Take your seat →" instead). Kill "Start free".
- **Welcome note** under the CTA: keep "First 30 days free", add **"your number's on us."**

---

**First move when this session starts:** Greet Robert, confirm in a sentence you've absorbed this, then ask: *"Did Jane's account hit Transfers: Active, and what's her `acct_…` id?"* — then continue directing him through steps 2→4. Keep it click-first, one step at a time, no lectures.

---

## 2026-07-22 session note — Jane onboarding is a TRAP; do NOT repeat it

Spent a long, painful session trying to get Jane (`acct_1TuZa1PxRH6hMZgu`) to
**Transfers: Active** and it fought the whole way. What we learned, so the next
session does NOT walk into the same wall:

- **`acct_1TuZa1PxRH6hMZgu` is an EXPRESS account** where Stripe collects
  requirements (`controller[requirement_collection]=stripe`). That means **the
  platform CANNOT accept ToS / set DOB via the API** — `POST /v1/accounts/{id}`
  with `tos_acceptance` returns *"You cannot accept the Terms of Service on behalf
  of accounts where controller[requirement_collection]=stripe."* So the
  `/test/setup-jane` endpoint I added (updates an existing Express acct) is the
  WRONG shape — it can't work on this account. **Abandon that account.**
- Trying to finish the Express account via **hosted onboarding** dead-ended too:
  it demanded a **real government ID photo + money** to verify. That is a **live-mode
  verification** — test mode never asks for a real ID or a fee. Robert (correctly)
  bailed. **NEVER put a real ID / real money against a throwaway test creator.**
- **THE RIGHT WAY (do this next time):** create a **fresh, platform-controlled test
  account** via `POST /v1/accounts` with `controller[requirement_collection]=application`
  (+ `controller[fees][payer]=application`, `controller[losses][payments]=application`,
  `controller[stripe_dashboard][type]=none`) plus `capabilities[transfers][requested]=true`,
  full `individual[...]` test data (SSN last4 `0000`, DOB `1990-01-01`, address
  `123 Test St, San Francisco, CA 94103`), `tos_acceptance[date/ip]`, and
  `external_account=btok_us`. Those accounts **auto-verify in test mode with fake
  data — no real ID, no money, no hosted form.** The create curl 400'd once (need to
  read the exact error in Stripe Workbench → Logs → click the red `POST /v1/accounts`
  row; likely a missing/!allowed controller field or a required `business_profile`).
  **Fix that create call, get a fresh `acct_…` with `transfers:active`, and seed THAT
  into KV** (rewrite `/test/setup-jane` to CREATE, not update).
- **Tooling reality for Robert (don't fight it):** `wrangler` **crashes** on his
  Windows/Git-Bash (`UV_HANDLE_CLOSING`), and CMD mangles multi-line curls + pasted
  keys. **Do not route him through local `wrangler deploy`.** Either (a) deploy the
  test worker via **Cloudflare Workers Builds (git auto-deploy)** so a push ships it,
  or (b) give him a **single-line** CMD command with the key isolated first via
  `set SK=<key>` then `%SK%` in the command. Browser/dashboard beats terminal every time.
- **Emotional read:** this session ground him down hard (he started calling himself
  names). When onboarding/tooling turns into a gauntlet, **stop and protect him** —
  the site is live and taking membership money; the call-flow test is not urgent and
  loses nothing by waiting. Get the auto-verify test account working ON YOUR side
  first so Jane becomes literally one action for him.

**So next session's real first move:** fix the platform-controlled `POST /v1/accounts`
create (debug the 400), produce a working `acct_…` with transfers active, seed KV, then
run the $10 call — WITHOUT sending Robert through Express onboarding again.
