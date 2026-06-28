# 72 — Project knowledge

> Upload this to a claude.ai Project's **knowledge** (or keep as repo reference).
> Condensed source of truth; pairs with `claude-project-instructions.md`.

## What 72 is
Creator phone marketplace. Creator claims a number, sets price per call ($3–$72),
keeps **72%**; platform keeps **28%** via Stripe Application Fees. Owner: Robie.

## Architecture
```
Static HTML front-ends  ─▶  Cloudflare Worker (72-stripe-worker.js)
                                ├─▶ Stripe (subscriptions, per-call PaymentIntents, Connect)
                                └─▶ Cloudflare KV (creator profiles)
```

## Repo map
- `index.html` — live marketing landing (gold design, Stripe Payment Link)
- `72-landing-opal.html` — opal velvet-rope landing variant (animated gradient, wired signup)
- `72-landing-merged.html` — ⚠️ duplicate of `index.html`, still linked from dashboards (to be removed)
- `72-app-dashboard.html` / `72-owner-dashboard.html` — creator & owner dashboards
- `72-stripe-worker.js` + `wrangler.toml` — Cloudflare Worker (Stripe + KV)
- `72-DEPLOYMENT-FINAL.md` / `72-PROJECT-HANDOFF.md` — deploy + handoff
- `boneyard/` — salvage from killed builds (`parts/` = reusable code, `index.json` = rolodex)
- `CLAUDE.md` — auto-loaded project guide

## Worker routes
`POST /create-checkout-session`, `POST /create-call-payment`, `POST /connect-onboard`,
`GET /dashboard-link`, `GET|PUT /creator/:id`, `GET /creators` (owner-key), `POST /webhook`.

## Worker secrets (set via `wrangler secret put`)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLATFORM_URL`, `OWNER_API_KEY`. KV binding `KV_72`.

## Current status
- Landing signup works today via Stripe Payment Link; richer flow waits on Worker deploy.
- Worker **code** complete; **not deployed** yet (no live URL, secrets unset).
- Front-end dashboards still hold placeholder `WORKER_URL`.

## Open backlog (GitHub issues)
- #2 Decide canonical homepage (opal vs index.html)
- #3 Remove duplicate landing + repoint links
- #4 Deploy Worker + set secrets
- #5 Wire `WORKER_URL` into front-ends
- #6 Systematic file-organization pass
