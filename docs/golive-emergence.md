# Go-Live Checklist — 72 Emergence (paid completed-call flow)

Branch: `claude/twilio-emergence-4qbonn` · Worker: `lively-mud-9c4b` (api.velvetrope2you.com) · Live target: `claude/twilio-deploy-bi6sbr`

**Golden rule (unchanged): change one thing, verify, then the next. Do the whole
run in Stripe TEST mode before a single live key touches the Worker.**

The money model this ships: caller **authorizes** (card held, not charged) → member
**Accepts** the ring → both **connect** in the room → payment **captures**. No accept /
no connect → the hold **voids**. Nothing is ever refunded because nothing is charged
until a real connection.

---

## ⚠ Confirmed from the Cloudflare dashboard (2026-07-17)
- **Worker name:** `api.velvetrope2you.com` is served by the Worker **`proveit72-again`**,
  NOT `lively-mud-9c4b`. `worker/wrangler.toml` `name` is now set to `proveit72-again` so
  `cd worker && wrangler deploy` lands on the live worker. **Confirm this is the right worker before
  first deploy** (Workers & Pages list) — if `lively-mud-9c4b` is actually the live one,
  revert the name.
- **"Others can't see the site" fix:** DNS is correct (apex + www CNAME → `vrpi72-home.pages.dev`,
  proxied). The missing piece is attaching the hostname to the Pages project:
  **Workers & Pages → `vrpi72-home` → Custom domains → add `velvetrope2you.com` + `www` →
  wait for green/SSL.** Verify anytime via `https://vrpi72-home.pages.dev` (bypasses DNS).
- **MX/email warning** in the dashboard is unrelated to the site loading — ignore for now.

## 0 · Pre-flight (no deploy yet)
- [ ] Confirm you're promoting **`claude/twilio-emergence-4qbonn`**, not the abandoned
      `claude/twilio-account-restored-4qbonn`.
- [ ] Skim the diff vs live — it should be 6 files only:
      `git diff --stat origin/claude/twilio-deploy-bi6sbr..origin/claude/twilio-emergence-4qbonn`
- [ ] `node --check worker/stripe-worker.js` passes.

## 1 · Worker secrets (set on `lively-mud-9c4b`)
Run each separately. Use **test** Stripe keys first.
- [ ] `wrangler secret put STRIPE_SECRET_KEY`      → `sk_test_...`
- [ ] `wrangler secret put STRIPE_WEBHOOK_SECRET`  → `whsec_...` (from step 2)
- [ ] `wrangler secret put PLATFORM_URL`           → `https://velvetrope2you.com`
- [ ] `wrangler secret put PLATFORM_API`           → `https://api.velvetrope2you.com`
      (optional — the Worker already falls back to this exact value)
- [ ] `wrangler secret put TWILIO_ACCOUNT_SID`     → `AC...`
- [ ] `wrangler secret put TWILIO_AUTH_TOKEN`      → the restored account's token
- [ ] `wrangler secret put OWNER_API_KEY`          → any long random string (guards `/creators`)
- [ ] KV `KV_72` is already bound in `worker/wrangler.toml` — no action.

> Until the two `TWILIO_*` secrets exist, **`/provision-number` no-ops safely** —
> the dashboard shows "not switched on yet," nothing is bought. Good for the test run.

## 2 · Stripe config (TEST mode first)
- [ ] Stripe **Connect** enabled; test creator has an Express account via `/connect-onboard`
      (`chargesEnabled: true` on their record).
- [ ] Webhook endpoint → `https://api.velvetrope2you.com/webhook`, events:
      `checkout.session.completed`, `payment_intent.succeeded`,
      `customer.subscription.trial_will_end`, `customer.subscription.deleted`,
      `account.updated`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Note: checkout now sets **`capture_method: manual`** — expect authorizations that
      sit in **`requires_capture`** until a call connects. This is intended.

## 3 · Deploy (preview / test)
- [ ] `cd worker && wrangler deploy` the Worker with the **test** secrets.
- [ ] Cloudflare Pages: deploy this branch to a **preview** URL (do NOT point the
      production domain at it yet).
- [ ] Seed a test creator in KV: `creator:<userId>` with `username`, `stripeAccountId`,
      `chargesEnabled:true`, `isOnline:true`, `pricePerCall`, `forwardNumber` (your real
      phone), and later `twilioNumber` (claimed in step 5).

## 4 · Verify the money switch (TEST mode — the critical one)
Card `4242 4242 4242 4242`, any future expiry/CVC.
- [ ] **Authorize:** open `/call/<username>` → *Call now $10* → pay. In Stripe, the
      PaymentIntent is **`requires_capture`** (held, not charged).
- [ ] **Capture on connect:** on the member dashboard the ring appears → **Accept** →
      both land in the room → PaymentIntent flips to **`succeeded`**; member record
      `totalEarningsCents` grows by **720**.
- [ ] **Void on no-show:** new call, member **Decline** (or nobody joins) → PaymentIntent
      **`canceled`**, card never charged. Confirm there is **no refund** (there shouldn't be).
- [ ] **Lights off:** toggle creator offline → `/call/<username>` checkout is **blocked**.

## 5 · Verify the acquisition funnel (TEST mode)
- [ ] **Join:** as a fresh caller, *Join & call $8.28* → email → free-month signup
      (Checkout `subscription`, 30-day trial, $0 now) → returns → auto-runs the **$8.28**
      call. Member 72% is still **$7.20**.
- [ ] **Decline → $10:** on the join card hit *No thanks* → lands on the $10 call.
- [ ] **One-time deal:** complete a join call, then try join again → rejected
      ("one-time welcome — already used"). They now pay standard rates.
- [ ] **Claim number:** log into the dashboard as that new member → *Claim number →*
      buys a Twilio number and sets its Voice webhook to `/voice`. (Needs step 1 Twilio
      secrets; test with a real number purchase once, then release it if you want.)
- [ ] **Real call rings the number:** dial the claimed number → `/voice` forwards to
      `forwardNumber`; a signed-up caller hears "first 72 call is on us" if applicable.

## 6 · Flip to LIVE
- [ ] Swap Worker secrets to **live**: `STRIPE_SECRET_KEY=sk_live_...`, live
      `STRIPE_WEBHOOK_SECRET` from a **live-mode** webhook endpoint.
- [ ] Stripe → **Live mode** on; confirm Connect payouts enabled for real creators.
- [ ] `cd worker && wrangler deploy` again with live secrets.
- [ ] Promote the site: point Cloudflare Pages production at
      `claude/twilio-emergence-4qbonn` (or merge it into `claude/twilio-deploy-bi6sbr`
      and keep that as production). **Do the domain last.**
- [ ] Run **one** real $10 call end to end. Watch it authorize → capture. Confirm the
      creator's $7.20 lands in their Stripe balance.

## 7 · Rollback (if capture misbehaves)
- [ ] Redeploy the previous Worker version (`wrangler rollback` or deploy the prior
      commit). Any outstanding **authorizations auto-expire in ~7 days** — no stuck
      charges.
- [ ] The static site can be repointed to the prior Pages deployment instantly.

---

## Known beta-grade edges (fine to launch with; harden later)
- **Capture is triggered client-side** from the room (Jitsi IFrame "both present").
  A caller who blocks that call could dodge a legit charge. Acceptable for a trusted
  beta; later, confirm connection server-side (e.g. a min-duration or a Jitsi
  server signal) before capturing.
- **Stale holds:** an authorized call that never connects relies on the room's
  void-on-leave, backstopped by Stripe's ~7-day auth expiry. A small cron that voids
  `callsession` records left `authorized` > N hours would tidy this.
- **`/provision-number` double-click:** guarded by the button disable + a
  `twilioNumber` check; a hard race could still buy two. Low volume in beta.
- **Auth on member actions:** the dashboard identifies a member by `userId` only
  (no login/password yet). `activeRoomToken` gates connect/void. Fine for beta;
  add real auth before scale.

## KV keys in play
- `creator:<userId>` — member/creator record (also holds `activeRoom`,
  `activeRoomToken`, `subscriptionStatus`, `twilioNumber`, `acquisitionCallUsed`)
- `callsession:<room>` — one call's lifecycle (`authorized → completed | voided`)
