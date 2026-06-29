# 72 — project guide for Claude (and humans)

72 is a creator phone marketplace: claim a number, set a per-call price ($3–$72),
keep 72%, platform takes 28% via Stripe. Static HTML front-ends + one Cloudflare
Worker backend.

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
