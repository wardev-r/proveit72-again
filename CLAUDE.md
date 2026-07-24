# 72 — project guide for Claude (and humans)

<!-- ═══════════════════════════════════════════════════════════════════════ -->
## 🧭 START HERE — read this before touching anything (added 2026-07-20)

**There is ONE source-of-truth branch: `claude/twilio-emergence-4qbonn` ("emergence").**
It is a clean *superset* of everything else — the real, complete product lives here:
the paid **$10 first-call** flow (`call-first.html`), authorize-then-capture money
logic, the **ringing Accept/Decline** dashboard + **Claim-number (772)** card, the
test rig (`wrangler.test.toml`, `scripts/seed-test.sh`), and the go-live runbook
(`docs/golive-emergence.md`). **Edit here. Do all new work here.**

**Do NOT start "fixing" the old branches.** They are thinner, older copies. The pain
this project keeps hitting = a fresh session lands on an old branch, can't find the
real work, and re-does it. If a file looks unfinished, you're probably on the wrong
branch — come back to emergence.

**Branch map (2026-07-20):**
- `claude/twilio-emergence-4qbonn` — ⭐ KING. All real work. Becomes live via `docs/golive-emergence.md`.
- `claude/twilio-deploy-bi6sbr` — the OLDER live-deploy branch (thinner copy). Emergence supersets it.
- `claude/72-marketplace-deployment-ax8w3w` — kept in sync with bi6sbr; possible Pages prod branch. **Confirm the real Pages production branch in the Cloudflare `vrpi72-home` settings — that ambiguity is the root of the drift.**
- everything else — dead/retired.

**Before acting:** read the latest `.claude/handoffs/*.md`, then `agents.json`, then this file.

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

```
index.html                    — canonical marketing landing (gold design, Stripe Payment Link)
call-first.html               — $10 first-call flow (routed via _redirects /call/*)
call.html                     — standard per-call connect (routed via _redirects /pay/*)
connect.html / room.html      — call and room pages
meet.html / events.html       — live video meets and fan events
paygate.html / why72.html     — paid calls gate and why-72 marketing
terms.html / privacy.html     — legal
qr.html                       — QR-code maker tool
uninterrupted.mp4             — hero video asset

dashboards/
  app.html                    — creator dashboard (QR, price, ring/accept, claim number)
  owner.html                  — owner/admin analytics and creator management
  mission-control.html        — internal ops tracker (page+task status)

worker/
  stripe-worker.js            — Cloudflare Worker: Stripe checkout, KV, Twilio routing
  wrangler.toml               — live Worker config (name, KV binding, custom domain route)
  wrangler.test.toml          — throwaway *.workers.dev config for test deploys
  deploy.sh                   — interactive deploy script (sets secrets, runs wrangler deploy)

docs/
  deployment.md               — step-by-step deploy runbook
  project-handoff.md          — project overview and handoff notes
  golive-emergence.md         — go-live checklist for the emergence branch
  brand-voice.md              — brand voice and copy guidelines
  punch.md                    — consolidation punch list
  think-about-it.md           — parked ideas (not now, not lost)
  access-provider-agreement.md / privacy-policy.md / terms-of-service.md — legal drafts
  claude-project-instructions.md / claude-project-knowledge.md — Claude context

boneyard/                     — salvage from killed builds; scan index.json before building UI
scripts/
  seed-test.sh                — seed KV with a test creator for local testing
  validate-agents.mjs         — validate agents.json schema
```

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
- Stripe **secret** key never goes in the repo or HTML — only `cd worker && wrangler secret put STRIPE_SECRET_KEY` on the Worker.
