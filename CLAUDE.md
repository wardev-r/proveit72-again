# 72 — project guide for Claude (and humans)

72 is a creator phone marketplace: claim a number, set a per-call price ($5 base,
no ceiling), keep 72%, platform takes 28% via Stripe. Static HTML front-ends + one
Cloudflare Worker backend.

## 🚨 HARDLINE — the URL is set FIRST. Non-negotiable.
On every build, the live domain is wired up and confirmed loading **before** any
other work. Robert does not budge on this. Do not treat the domain as a "last step."

The DNS truth so this never causes a 2-day panic again:
- **If the domain's nameservers already point to Cloudflare** (velvetrope2you.com
  does), DNS/Pages changes are authoritative and land in **seconds to minutes — NOT
  48 hours.** The "up to 48h" warning ONLY applies when changing nameservers at the
  registrar. That's the one slow step; everything after is fast.
- To know if a fix works **without waiting**: open the Pages **`.pages.dev`** URL
  directly. It serves the exact same deploy, bypasses DNS entirely, and updates
  immediately. The custom domain is just a pretty pointer at that.
- "Site can't be found" on the custom domain = almost always one of: (a) nameservers
  not fully switched to Cloudflare yet, (b) the Pages project's **Custom domain**
  isn't attached / SSL still provisioning, or (c) a stale/conflicting DNS record on
  the apex. Check those in the Cloudflare dashboard — do not just "wait it out."

## Repo map
- `index.html` — live marketing landing (gold design, Stripe Payment Link)
- `72-landing-opal.html` — opal velvet-rope landing variant (animated gradient, wired signup)
- `72-landing-merged.html` — ⚠️ duplicate of `index.html`; still linked from the dashboards. Consolidate before it confuses anyone.
- `72-app-dashboard.html` / `72-owner-dashboard.html` — creator & owner dashboards
- `72-stripe-worker.js` + `wrangler.toml` — Cloudflare Worker (Stripe, KV)
- `72-DEPLOYMENT-FINAL.md` / `72-PROJECT-HANDOFF.md` — deploy + handoff docs
- `boneyard/` — salvage from killed builds (see below)

## 🦴 Boneyard — check it before building UI from scratch
`boneyard/` holds parts stripped off abandoned directions so they can be reused.
**Before hand-building any visual/component, scan `boneyard/index.json`** — a
card there (palette, background, SVG, etc.) may already do the job. Reusable code
lives in `boneyard/parts/`; screenshots are the memory of what/why.

When a build or design gets killed: don't just delete it. Move it to `boneyard/`
**with its code**, add a card to `boneyard/index.json` (id, type, file, tags,
good_for, why it died), and drop a screenshot for memory.

## Working conventions
- Develop on a **feature branch**, not `main`. Current branch: `claude/workers-completion-40a0lp`.
- One clear, descriptive commit per change; push to the branch.
- Promote to `index.html` / merge to `main` deliberately — keep `main` presentable.
- Stripe **secret** key never goes in the repo or HTML — only `wrangler secret put STRIPE_SECRET_KEY` on the Worker.
