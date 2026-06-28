# Worklog — 2026-06-28
## 72: opal landing, the boneyard, and a memory system

### Shipped (committed + pushed to `claude/workers-completion-40a0lp`)
- **`72-landing-opal.html`** — new opal velvet-rope landing variant
  - Background went through 3 directions: cool opal → warm opal → final **abstract "colour-change film"** (slowly drifting warm-opal gradient, pure CSS, no image dependency).
  - **Iridescent shimmer headlines** (gradient-clipped, animated); dropped the heavy "stickered" drop-shadow.
  - **"velvet rope"** = deep red-carpet red, bold.
  - **Responsive** (680px / 400px breakpoints). Note: headless Chromium floors at ~500px, so true-phone preview only verifiable on a real device.
  - **Signup wired**: validate name/email/phone → Stripe Payment Link today, or Worker `/create-checkout-session` once `WORKER_URL` is set.
- **`boneyard/`** — salvage system for killed builds: screenshots (the memory) + `parts/` (reusable CSS/SVG) + `index.json` (the "rolo" catalog). Renamed from `growing-pains/`.
- **`CLAUDE.md`** — auto-loaded project guide; points every future session at the boneyard before building UI from scratch.
- **`docs/claude-project-*.md`** — paste/upload bundle for a claude.ai Project (custom instructions + knowledge).
- **PR #1** opened. Backlog **issues #2–#6** created.

### Principles established (the durable part)
- **Secrets stay out of the repo/HTML** — Stripe secret key only via `wrangler secret put`.
- **Killed builds → boneyard *with their code*** + a rolo card. Don't delete, don't leave rotting in the tree.
- **Scan `boneyard/index.json` before hand-building any UI.**
- **Data ≠ Tool.** Durable store holds the data; tools *read* from it. Don't bury memory inside half-built apps — the app gets abandoned and takes the memory with it.
- **Capture essence, not transcripts.** Write the *delta from generic* (the "cocktail"); a capable model regenerates the commodity base.

### Status
- Cloudflare Worker **code complete, NOT deployed** — `WORKER_URL` placeholders still in the dashboards.

### Open threads (GitHub issues)
- #2 canonical homepage (opal vs index.html) · #3 dedupe `72-landing-merged.html` · #4 deploy Worker + secrets · #5 wire `WORKER_URL` · #6 systematic file-org pass

### Out of scope for this repo (intentionally)
- A separate **private venture's core asset** currently lives in one fragile place (a Downloads file). To be consolidated into **its own private store — NOT this repo.** Details omitted on purpose (compartmentalized / secret sauce).
