# 72 Marketplace — Deployment Guide

## Overview

72 is a creator phone marketplace. This guide walks through deploying all components from scratch.

**Architecture:**
```
Landing page (static HTML)
    │
    └─▶ Cloudflare Worker (worker/stripe-worker.js)
            │
            ├─▶ Stripe API (subscriptions, payments, Connect)
            └─▶ Cloudflare KV (creator profiles)
```

---

## Prerequisites

- Cloudflare account (free tier works)
- Stripe account with Application Fees / Connect enabled
- A domain (or use Cloudflare Pages free subdomain)
- Node.js + Wrangler CLI (for Worker deployment)

---

## Step 1 — Stripe Setup

### 1a. Activate Stripe Connect

1. Log into [dashboard.stripe.com](https://dashboard.stripe.com)
2. Go to **Settings → Connect settings**
3. Enable **Express accounts**
4. Set your platform name to "72"

### 1b. Confirm the subscription product

Product ID already created: `prod_Ulrihflh9rgLYB`

Verify at **Products** in your Stripe dashboard. The product should show:
- Name: 72 – First month free
- Price: $7.20/month with 30-day free trial

If it's missing, create it:
```
Name: 72 – First month free
Price: $7.20 / month
Trial: 30 days
```

### 1c. Create a Webhook endpoint

1. Go to **Developers → Webhooks → Add endpoint**
2. URL: `https://your-worker.your-subdomain.workers.dev/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.trial_will_end`
   - `customer.subscription.deleted`
   - `account.updated`
   - `payment_intent.succeeded`
4. Copy the **Signing secret** (starts with `whsec_`)

---

## Step 2 — Cloudflare Worker Deployment

### 2a. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2b. Create wrangler.toml

Create `wrangler.toml` in the same directory as `worker/stripe-worker.js`:

```toml
name = "72-marketplace"
main = "worker/stripe-worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "KV_72"
id = "YOUR_KV_NAMESPACE_ID"
```

### 2c. Create KV namespace

```bash
wrangler kv namespace create "KV_72"
# Copy the ID and paste it into wrangler.toml above
```

### 2d. Set environment variables (secrets)

```bash
wrangler secret put STRIPE_SECRET_KEY
# Paste your sk_test_... key from Stripe dashboard → Developers → API keys
# (switch to sk_live_... for production)

wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste: whsec_... (from Step 1c)

wrangler secret put PLATFORM_URL
# Paste: https://your-domain.com

wrangler secret put OWNER_API_KEY
# Paste: a long random string (keep it secret — used to protect owner dashboard API)
```

### 2e. Deploy the Worker

```bash
wrangler deploy
# Output: https://72-marketplace.YOUR-SUBDOMAIN.workers.dev
```

Note your Worker URL — you'll need it in the next step.

---

## Step 3 — Update Frontend with Worker URL

In **three files**, replace the placeholder Worker URL:

**index.html** (line ~260):
```js
const WORKER_URL = 'https://72-marketplace.YOUR-SUBDOMAIN.workers.dev';
```

**dashboards/app.html** (line ~260):
```js
const WORKER_URL = 'https://72-marketplace.YOUR-SUBDOMAIN.workers.dev';
const BASE_CALL_URL = 'https://your-domain.com/call/';
```

**dashboards/owner.html** (line ~220):
```js
const WORKER_URL = 'https://72-marketplace.YOUR-SUBDOMAIN.workers.dev';
const OWNER_KEY  = 'YOUR_OWNER_API_KEY'; // same value as secret above
```

---

## Step 4 — Deploy Static Files

### Option A: Cloudflare Pages (recommended — free, fast)

```bash
# Install Pages CLI
npm install -g @cloudflare/pages-cli

# Create a Pages project
# In Cloudflare dashboard → Pages → Create project → Direct upload
# Upload these files:
#   index.html  → rename to index.html
#   dashboards/app.html
#   dashboards/owner.html
#   wagoneer.png
```

Or via git:
1. Push this repo to GitHub
2. Connect it in Cloudflare Pages (auto-deploys on push)
3. Set your custom domain in Pages settings

### Option B: Any static host

Upload the four files (3 HTML + 1 PNG) to:
- Netlify Drop (drag & drop)
- GitHub Pages
- AWS S3 + CloudFront
- Vercel

---

## Step 5 — Custom Domain (optional)

In Cloudflare dashboard:
1. Add your domain to Cloudflare
2. In Pages → your project → Custom domains → Add domain
3. DNS auto-configures

For the Worker:
1. Workers & Pages → your Worker → Triggers → Custom Domains
2. Add `api.your-domain.com`
3. Update `WORKER_URL` in all HTML files to the custom domain

---

## Step 6 — Go Live Checklist

### Test mode verification
- [ ] Landing page loads with wagoneer.png background
- [ ] Rotating headlines cycle every 4 seconds
- [ ] Email form calls Worker and redirects to Stripe Checkout
- [ ] Stripe Checkout shows $7.20/month with 30-day trial
- [ ] After checkout, redirected back to landing page with success message
- [ ] Creator dashboard loads at `/dashboards/app.html`
- [ ] Price slider moves from $3 to $72
- [ ] Online/offline toggle calls Worker
- [ ] QR code generates for the creator's call link
- [ ] "Connect bank" calls Worker and redirects to Stripe Connect Express
- [ ] Owner dashboard at `/dashboards/owner.html` shows creator table
- [ ] Revenue chart renders
- [ ] Export CSV downloads correctly

### Switch to live mode
1. In Stripe dashboard, switch from Test to Live
2. Replace `sk_test_...` with `sk_live_...` in Worker secrets:
   ```bash
   wrangler secret put STRIPE_SECRET_KEY
   # paste sk_live_...
   ```
3. Create a new live webhook endpoint for the same events
4. Update `STRIPE_WEBHOOK_SECRET` with the live `whsec_...`
5. Redeploy the Worker: `wrangler deploy`

---

## Stripe Keys Reference

| Key | Value |
|-----|-------|
| Publishable (test) | Found in your Stripe dashboard → Developers → API keys |
| Secret (test) | Set via `wrangler secret put` — never in code |
| Product ID | `prod_Ulrihflh9rgLYB` |

---

## Revenue Model Summary

| Scenario | Caller pays | Creator earns | Platform earns |
|----------|-------------|---------------|----------------|
| Min call | $3.00 | $2.16 | $0.84 |
| Mid call | $36.00 | $25.92 | $10.08 |
| Max call | $72.00 | $51.84 | $20.16 |
| Subscription | — | — | $7.20/mo per creator |

---

## Troubleshooting

**Stripe checkout fails with CORS error**
→ Check that the Worker's CORS headers include the landing page origin. The Worker allows `*` by default.

**QR code doesn't generate**
→ QRCode.js loads from CDN. If offline, falls back to `api.qrserver.com` image API.

**Webhook events not received**
→ Verify the webhook URL points to `https://your-worker.../webhook` and the signing secret matches.

**Creator data not persisting**
→ Confirm KV namespace is bound in `wrangler.toml` and deployed. Test with:
```bash
wrangler kv key list --binding=KV_72
```

**"Not Found" from Worker**
→ Verify you're hitting the correct route. All routes are case-sensitive.
