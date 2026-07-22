# HANDOFF — 72 goes live as a PAID PHONE NUMBER (not a video room)

**Read this first, act fast, don't re-derive.** Owner (Robert) has decided: skip the
test-mode/Jane dry-run, build for real, prove with ONE real call, go live by morning.
He wants speed and explicit steps — direct him click-by-click, no lectures.

---
## ✅ STATUS (end of 2026-07-22 build session) — the CODE and COPY are DONE and pushed
All on `claude/twilio-emergence-4qbonn` (HEAD ~`fa9ef35`). **Nothing is live yet** — it's all
staged on emergence; the live site still serves the OLD frontend. Code + copy go live TOGETHER
when emergence is promoted (Robert's step).

- **§2 Phone pay-gate — BUILT (`node --check` clean):** `handleCallCheckout` mints a 6-digit
  `callpass:<pin>` → room, and routes checkout success to **`connect.html`** (phone; default) or
  **`room.html`** (video, `channel:'video'` = the upsell). Voice legs: `/voice` `<Gather>`s the
  code → **`/voice/verify`** validates the paid session, spends the code, `<Dial>`s the member's
  `forwardNumber` with a status callback → **`/voice/status`** captures on `DialCallStatus=completed`,
  voids otherwise (via shared `captureSessionByRoom` / `voidSessionByRoom`). Reuses the existing
  manual-capture money engine — **72% ($7.20) intact.** New **`connect.html`** = after-pay page:
  the 772 number (tap-to-call), the code, and a live status line that flips to charged/not-charged.
- **§5 Copy truth-pass — DONE.** index/paygate/why72/call/meet/events swept: killed "No phone
  number needed"; "audio or video / land in your room" → "your 72 number rings, video optional";
  `meet.html` = the video **upsell**; "paid out weekly" → "paid out through Stripe" (no cadence
  promise). Meta/OG fixed. **$10-or-join / $8.28 pricing untouched — that's the design.**

## ▶️ REMAINING = go-live, all Robert-side (then verify). Everything code/copy is ready.
1. **Promote emergence to production** / confirm the live worker `proveit72-again` builds from it
   (Workers Builds git auto-deploy — NOT local wrangler, it crashes on his machine).
2. **Twilio:** each 772 number → Voice "A call comes in" → Webhook POST →
   `https://api.velvetrope2you.com/voice`.
3. **Assign his number** to the member record (`twilioNumber` + `forwardNumber`) in KV.
4. **Smoke call (the proof):** pay his own $10 → call the 772 → enter code → his phone rings →
   Stripe shows $10 captured / $7.20 to him. Second run: don't answer → confirm $0 (voided).
   Then open to others.
---

---

## 0. VISION LOCK (the correction that reframes everything)
**The product IS the phone number.** A real **772** number that rings the member's real
phone. Caller pays → the call connects → they *talk on the phone.* The **video/Jitsi room
was drift** — every prior session swapped in a browser video room because Twilio was
harder. That was wrong. **Phone is the platform. Kill the room as the core.**

Money model is unchanged and correct: **first call $10 → member keeps $7.20 (72%)**,
INVIOLABLE. 772 area code only. Every member is a member first ($7.20/mo, first month free).

## 1. SEQUENCE (do in this order — do NOT reorder)
1. **Build the phone pay-gate** (§2). 2. **One REAL $10 call by Robert to himself** (§4 smoke
test) — this replaces the dry run. 3. **Copy truth-pass** (§5) ships *with* the code. 4. **Flip
live** (§3). **Copy and code move together** — never ship phone copy while code still does video,
and never open to the public before the one real call connects and captures cleanly.

## 2. THE CODE — pre-pay PIN phone gate (simplest, uses numbers he already owns)
Reuse the existing money engine (`/create-call-checkout`, authorize→capture,
`transfer_data.destination` keeps 72%, `/room/:room/connected|void`). **Replace the DELIVERY
only**: Jitsi room → phone PIN + Twilio `<Dial>`.

Build in `72-stripe-worker.js`:
- **On paid checkout** (`onCheckoutComplete`, kind=call): generate a 4–6 digit **PIN**, store
  `callpass:<PIN>` → `{ creatorId, forwardNumber, paymentIntentId, room, exp: now+15min, used:false }`.
  Return the PIN to the success page.
- **Success page** (rewrite `room.html`/success): stop embedding Jitsi. Show: *"You're paid.
  Call **<772 number>** now and enter code **<PIN>** to connect. If they don't pick up, you're
  not charged."*
- **`/voice` (Twilio webhook, rewrite `handleVoice`)**: answer → `<Gather numDigits=6>` "Enter
  your access code." → POST to `/voice/verify`.
- **`/voice/verify`**: look up `callpass:<PIN>`. Invalid/expired/used → `<Say>` reject + hang up.
  Valid → mark used, `<Dial callerId=<772>>` the `forwardNumber`, and set `action` callback to
  `/voice/status`.
- **`/voice/status`**: on `DialCallStatus=completed` (they actually talked) → **capture** the
  PaymentIntent (member gets $7.20). On no-answer/failed → **void** it (caller not charged).
  This is the phone version of the room connected/void logic — reuse those functions.
- Keep `/provision-number` (772-only, on request) for the "Claim your number" button.
- **DELETE from the product path:** Jitsi embed, `meet.html` (video-meet page), the "audio or
  video / private room" flow. Park them in `boneyard/` with a card, don't just delete.

No Twilio Pay Connector needed for v1 (that's the fancier in-call `<Pay>` path — note it as a
future upgrade). Pre-pay PIN is fully buildable on the numbers he owns.

## 3. GO-LIVE — Robert's actions (he clicks; you direct). NOT via local wrangler.
`wrangler` CRASHES on his Windows (`UV_HANDLE_CLOSING`) and his terminal mangles pastes. **Do
NOT route him through `wrangler deploy`.** Deploy the worker via **Cloudflare Workers Builds
(git auto-deploy on push)** — confirm the live worker `proveit72-again` (api.velvetrope2you.com)
is git-connected; if so, a push to the production branch ships it.
1. **Twilio:** each 772 number → Voice "A call comes in" → **Webhook (POST)** →
   `https://api.velvetrope2you.com/voice`. (He owns 4 numbers already — real inventory.)
2. **Assign a number to the member** in KV (`twilioNumber` + `forwardNumber` on the creator).
3. **Stripe LIVE keys** already set on the live worker (verify `STRIPE_SECRET_KEY` = `sk_live_`,
   webhook live). Connect must be ON for real payouts (or run the first proof as a direct charge
   to himself and wire Connect right after).
4. **Cloudflare Pages:** confirm/point Production branch → the branch this ships on
   (emergence is king; promote per `GOLIVE-EMERGENCE.md`). One push = one deploy.

## 4. SMOKE TEST (replaces the dry run — this is the proof)
Robert, with his own phone + a second phone (or a friend): open his `/call/<handle>` → pay the
real **$10** → get the PIN → call the 772 number → enter PIN → **his phone rings** → answer →
confirm Stripe shows **$10 captured, $7.20 transferred**. Hang up without answering on a second
run → confirm **$0 charged (voided)**. That's the entire business proven. THEN open to others.

## 5. COPY TRUTH-PASS (the "polish run" — every claim must be TRUE; ships WITH the code)
Kill-list found 2026-07-22 (fix all; phone-truth + no unproven claims):
- **paygate.html:78** `"No phone number needed"` → **DELETE** (it's the opposite of the product).
  Whole page reframes to *paid phone calls*.
- **"private call room" / "land in your room" / "audio or video, their choice"** — everywhere
  (paygate 79/84, why72 70/91, call.html 76/79/80, call-first 197, room.html) → **phone-call**
  language: *"they call your 772 number and you talk."*
- **index.html:693** `"A plumber walks a fix over video"` → *over the phone.*
- **meet.html** (entire "Live video meets" page) → remove from nav/footers or rebuild as phone.
  Footer "Live video" link appears on every page — kill it site-wide.
- **"paid out weekly"** (footers everywhere, index:723-724) → only claim a payout cadence that's
  actually configured in Stripe. If not set, say *"Payouts via Stripe"* — no timing promise.
- **"Five ring free" whitelist** (paygate 88-110) — not built. Cut or mark clearly as coming.
- **Any present-tense claim that a call "connects/works"** — until the smoke test passes, keep
  honest beta hedges ("rolling out to early members"). After it passes, they become true.
- Pricing: **$10 is the first-call price** (`call-first.html` correct). Purge stray "$5"/"from $5"
  /per-minute framing so one price story holds.
- Keep what's already TRUE & on-vision: events.html ("fans call your number"), "Real 772 phone
  number", membership ($7.20/mo, first month free), "in beta".

## 6. GUARDRAILS (do not repeat past pain)
- **No fake-Jane Express onboarding** — it demands real ID + money (live-mode trap). Skip it.
- **No local wrangler** — Workers Builds or bust.
- **Never ship phone copy while code still delivers video** — they go together.
- **Money-safe order:** one real call by Robert BEFORE the public. He said "trust your coding" —
  honor that by proving it once for real, not by shipping unproven money-telephony to strangers.
- 72% is INVIOLABLE. 772 only.

**First move next room:** confirm the live worker is git-auto-deploy (Workers Builds); if yes,
build §2 on the king branch, push, then walk Robert through §3→§4. If Connect isn't ready, run
the first proof as a direct charge to himself and wire Connect immediately after. Keep it tight.
