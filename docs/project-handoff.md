# 72 Marketplace — Project Handoff

## What is 72?

72 is a creator phone marketplace. Creators claim a dedicated phone number, set their own price per call ($3–$72), and earn 72% of every call payment. The platform takes 28% via Stripe Application Fees.

**Owner:** Robie (ward602@gmail.com)
**Model:** Stripe Application Fees with manual creator payouts at scale
**Status:** Ready for deployment

---

## Files in This Repository

| File | Purpose |
|------|---------|
| `index.html` | Marketing landing page + Stripe subscription checkout |
| `dashboards/app.html` | Creator dashboard (QR, price slider, status, earnings) |
| `dashboards/owner.html` | Platform analytics + creator management (owner only) |
| `worker/stripe-worker.js` | Cloudflare Worker — all backend/Stripe logic |
| `wagoneer.png` | Hero background image for landing page |
| `docs/deployment.md` | Step-by-step deployment guide |
| `docs/project-handoff.md` | This file |

---

## Architecture

```
Creator signs up
    │
    ▼
index.html
    │  POST /create-checkout-session
    ▼
worker/stripe-worker.js (Cloudflare Worker)
    │  Stripe Checkout Session (subscription)
    ▼
Stripe → $7.20/month, 30-day trial
    │  webhook: checkout.session.completed
    ▼
Worker stores creator in Cloudflare KV
    │
    ▼
Creator accesses dashboards/app.html
    ├── Sets price ($3–$72) → PUT /creator/:id
    ├── Toggles online/offline → PUT /creator/:id
    ├── Connects bank → POST /connect-onboard → Stripe Express
    └── Shares QR code / call link

Caller pays for a call
    │
    ▼
POST /create-call-payment (from telephony layer)
    │  Stripe PaymentIntent with application_fee_amount
    ▼
Stripe splits automatically:
    ├── 72% → Creator's connected Stripe account
    └── 28% → Platform Stripe account

Robie monitors via dashboards/owner.html
    ├── Platform revenue, gross volume, MRR
    ├── Creator table (status, calls, earnings)
    └── Export CSV for manual payout records
```

---

## Stripe Payment Model

### Creator subscription
- **Product:** `prod_Ulrihflh9rgLYB` (72 – First month free)
- **Price:** $7.20/month
- **Trial:** 30 days free
- **Flow:** Landing page → Worker → Stripe Checkout → success redirect

### Per-call payments (Application Fees)
- Caller pays $X (where $3 ≤ X ≤ $72)
- Worker creates a `PaymentIntent` with:
  - `application_fee_amount`: 28% of the total in cents
  - `transfer_data.destination`: creator's Stripe Connect account ID
- Stripe automatically splits the funds on capture
- No manual payout needed for creators — Stripe handles it

### Creator payout setup
- Creator clicks "Connect bank" in their dashboard
- Worker creates a Stripe Connect Express account
- Creator completes KYC on Stripe's hosted page
- Stripe sends weekly/daily payouts to their bank automatically

---

## Worker API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/create-checkout-session` | Creator subscription Stripe Checkout |
| POST | `/create-call-payment` | Per-call PaymentIntent with app fee |
| POST | `/connect-onboard` | Create Stripe Express account + onboarding link |
| GET | `/dashboard-link` | Stripe Express dashboard login link |
| GET | `/creator/:id` | Fetch creator profile from KV |
| PUT | `/creator/:id` | Update price, status, display name |
| GET | `/creators` | List all creators (requires X-Owner-Key header) |
| POST | `/webhook` | Stripe webhook receiver |

---

## Environment Variables (Worker)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `PLATFORM_URL` | Base URL of your deployed site |
| `OWNER_API_KEY` | Secret key to protect owner-only routes |
| `KV_72` | Cloudflare KV namespace binding (creator data) |

---

## Creator Dashboard Features

- **Status toggle** — Creator sets themselves online (taking calls) or offline
- **Price slider** — $3 to $72 per call in $1 increments; saved to Worker/KV
- **QR code** — Auto-generated from `BASE_CALL_URL + username`; shareable/downloadable
- **Earnings stats** — Today / this week / all time from KV stored totals
- **Payout connect** — Triggers Stripe Connect Express onboarding flow
- **Call history** — Table populated from call data (wire to telephony system)

---

## Owner Dashboard Features

- **Platform metrics** — Gross volume, platform revenue (28%), MRR, subscriber count
- **Revenue chart** — 30-day line chart (live data from Stripe, mock on initial load)
- **Revenue split doughnut** — Visual 72/28 breakdown
- **Creator table** — Sortable, searchable; shows status, rate, calls, earnings, subscription
- **Force offline** — Owner can override any creator's status
- **Export CSV** — Downloads all creator data as spreadsheet
- **Invite link** — Generates pre-filled signup URL for specific email

---

## What's NOT Included (Robie Handles)

- **Telephony / call routing** — The platform needs a service (Twilio, Bandwidth, etc.) to:
  1. Assign dedicated numbers to creators
  2. Charge callers and call `/create-call-payment` before connecting
  3. Record call duration and status for the call history table
- **Creator support** — Handled directly by Robie
- **Creator payouts at scale** — Stripe handles automatic payouts; Robie oversees via owner dashboard

---

## Stripe Credentials (Test)

```
Publishable key:  See Stripe dashboard → Developers → API keys
Secret key:       Set via `wrangler secret put` — never in source code
Product ID:       prod_Ulrihflh9rgLYB
```

Switch to live keys (`sk_live_...`, `pk_live_...`) when going to production.

---

## Next Steps for Developer

1. Deploy Cloudflare Worker (see `docs/deployment.md`)
2. Update `WORKER_URL` in all three HTML files
3. Host HTML files on Cloudflare Pages or any static host
4. Wire telephony (Twilio recommended) to the `/create-call-payment` endpoint
5. Test end-to-end with Stripe test cards before going live
6. Switch to live Stripe keys
