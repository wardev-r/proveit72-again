# 72 — project guide for Claude (and humans)

<!-- ═══════════════════════════════════════════════════════════════════════ -->
## 🧭 START HERE — read this before touching anything (added 2026-07-20)

**There is ONE source-of-truth branch: `claude/twilio-emergence-4qbonn` ("emergence").**
It is a clean *superset* of everything else — the real, complete product lives here:
the paid **$10 first-call** flow (`call-first.html`), authorize-then-capture money
logic, the **ringing Accept/Decline** dashboard + **Claim-number (772)** card, the
test rig (`wrangler.test.toml`, `scripts/seed-test.sh`), and the go-live runbook
(`GOLIVE-EMERGENCE.md`). **Edit here. Do all new work here.**

**Do NOT start "fixing" the old branches.** They are thinner, older copies. The pain
this project keeps hitting = a fresh session lands on an old branch, can't find the
real work, and re-does it. If a file looks unfinished, you're probably on the wrong
branch — come back to emergence.

**Branch map (updated 2026-07-31 — the ambiguity is RESOLVED):**
- `claude/twilio-emergence-4qbonn` — ⭐ KING. Edit here.
- `claude/twilio-deploy-bi6sbr` — ✅ **THE PAGES PRODUCTION BRANCH.** Confirmed.
  It has been production since 2026-07-16 and never changed. What drifted was
  the paperwork, not the deploy. Pushing here is what puts the site live.
- `claude/72-marketplace-deployment-ax8w3w` — kept in sync with bi6sbr. Not production.
- everything else — dead/retired.

As of 2026-07-31 all three are aligned on one commit. Ship by fast-forwarding
bi6sbr (and marketplace) to emergence — no merge, no conflicts:

```sh
git push origin origin/claude/twilio-emergence-4qbonn:refs/heads/claude/twilio-deploy-bi6sbr
git push origin origin/claude/twilio-emergence-4qbonn:refs/heads/claude/72-marketplace-deployment-ax8w3w
```

**⚠️ Git does NOT deploy the Worker.** A push ships only the static HTML via
Pages. `72-stripe-worker.js` goes live solely through `wrangler deploy`. A
worker fix merged to a green branch is still not running — this bit a real
customer on 2026-07-31.

**Before acting:** read the latest `.claude/handoffs/*.md`, then `agents.json`, then this file.

**The long-arc vision is canon in `VISION-LONGARC.md`.** The $10 Proof Call is only
Phase 1 — the real play is a phone number as *owned property* (deed → core → skins,
an inheritable estate, a 40–50 yr arc). It has been re-derived cold too many times.
Read it before "reinventing" the vision; extend it, don't rebuild it.

**The permanent fix (owner action):** in Cloudflare Pages `vrpi72-home`, point the
Production branch at ONE branch (ideally emergence once it's live) and retire the rest,
so edit-branch = deploy-branch = source-of-truth. No gap left to drift.
<!-- ═══════════════════════════════════════════════════════════════════════ -->

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
- Develop on the ONE king branch: `claude/twilio-emergence-4qbonn` (see START HERE at top).
- One clear, descriptive commit per change; push to the branch.
- Promote to `index.html` / merge to `main` deliberately — keep `main` presentable.
- Stripe **secret** key never goes in the repo or HTML — only `wrangler secret put STRIPE_SECRET_KEY` on the Worker.
