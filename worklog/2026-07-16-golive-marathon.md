# Worklog — 2026-07-16
## 72: go-live marathon — site + worker live, real signup taken

### Shipped (committed + pushed to `claude/twilio-deploy-bi6sbr`, which is now the Cloudflare Pages production branch — auto-deploys on push)

**Live & working**
- **velvetrope2you.com is live.** Cloudflare Pages (`vrpi72-home`), custom domain active. Added the missing `www` CNAME (→ `vrpi72-home.pages.dev`, Proxied). Domain bought at Cloudflare (nameservers auto-correct).
- **Membership checkout is LIVE and verified.** Live Buy Button (`buy_btn_1TsIzu…` + `pk_live_…`) on `paygate.html`; landing signup routes to it. A **real signup** confirmed it bills **monthly ($7.20, first month FREE — $0 charged on the trial).** Exactly the intended model.
- **Worker deployed** via Cloudflare **Workers Builds** (from GitHub, not local wrangler — Windows fought us) → **`api.velvetrope2you.com`** (custom_domain route), **KV_72 bound**, **4 secrets set in the dashboard** (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, PLATFORM_URL, OWNER_API_KEY). Live Stripe webhook → `/webhook`.

**Built this session**
- **Dressed the whole public site** to read finished & trustworthy: unified trust footer everywhere, launchpad button-row hub on the landing, "for-everyone" framing (plumbers/lawyers/therapists/creators), real `why72.html`, new **`meet.html`** (QR-accessed live video).
- **`/call/<handle>` pay-then-room flow** — `call.html` (pay page) + `room.html` (Jitsi) + `_redirects` + Worker routes `/call-info/<handle>` & `/create-call-checkout` (hosted Checkout, **destination charge keeps the creator's 72%**, ephemeral room per call). *Built, not yet tested live.*
- **SEO / share:** `og-card.png` (1200×630 share image) + `og:image` on all shareable pages, `robots.txt`, `sitemap.xml`, Organization JSON-LD on the landing.
- **Agent execution layer:** `agents.json` (board) + `llms.txt` + invisible per-page `#agent-spec` + `scripts/validate-agents.mjs` + SessionStart hook + GitHub Actions CI gate (green).
- **Legal:** governing law → **Nevada** (Clark County); business address **6881 W. Charleston Blvd, Ste A, Unit 5072, Las Vegas, NV 89117** (umbrella address; "72" is the operating name) in `terms.html`/`privacy.html`; launch legal `docs/*.md` merged in.
- Consolidated the duplicate landing (`72-landing-merged.html` → redirect). Scrubbed the 72¢/10-call toll (kept the free-5 whitelist). Worker product created inline (`PRODUCT_NAME`, no hardcoded product id → works in test & live).

### Principles / decisions locked this session
- **72% creator share is INVIOLABLE** — guardrail in `72-stripe-worker.js` (comment on `PLATFORM_FEE_PERCENT`) **and** `agents.json` (`creator_share_rule`). Owner's stance: **close doors before ever going to 71%.** Any fee comes from the caller's total or the platform's 28%, never the creator's 72%.
- **Every user is a member:** first month free, then **$7.20/month** (verified live).
- **Twilio: 772 area code ONLY** (on-brand with "72").
- **Dashboards (`72-app-dashboard.html`, `72-owner-dashboard.html`) left untouched** per owner — only fixed a dead QR URL + price floor + a chart-crash bug earlier.
- Two-branch mess resolved: Pages production branch is now `claude/twilio-deploy-bi6sbr`; every push auto-deploys — **no more manual merges.**

### Status
- **Front-of-house LIVE:** site + membership signup work end to end. A stranger can find it (send the link — the `2` gets mistyped, so paste, don't dictate) and sign up today.
- **Back-of-house (the actual product = the call flow) NOT yet proven.** Needs: **Stripe Connect turned on** + **one creator onboarded** (dashboard → Connect bank) to run a real `/call/` payment. The video/QR flow needs **no Twilio**.

### Open threads / next up
- **Post-payment redirect (membership):** after paying the membership Buy Button, the caller is **left on Stripe's default confirmation page** — no route back. The Buy Button's after-payment behavior is set in the **Stripe dashboard** (not our code): Stripe → Buy Button → *After payment → Redirect* → `https://velvetrope2you.com/72-app-dashboard.html`. **Also a code bug:** the worker's `/create-checkout` `success_url` points to `/dashboard.html` (line ~151) but the file is `72-app-dashboard.html` — even the redirect path 404s. Fix the worker string.
- **"No 772 number after paying":** expected — **no Twilio number provisioning exists.** The paid `/call/<handle>` flow routes to a **video room** (`room.html`), not a phone number. The 772 *phone* side is unbuilt (see Twilio item below). Signup assigns no number today.
- **Prove the call flow:** enable Stripe **Connect** → onboard creator #1 → pay own `/call/<handle>` link → land in room.
- **Twilio phone numbers (772):** ~$45.50 credit on hand. Worker's `handleVoice` has **NO payment gate** yet — wiring numbers now would leak free calls. Needs pay-gating (Twilio `<Pay>` / pre-pay).
- **REVAMP (owner's plan):** port + clean the working pay-gated call flow from the **OLD poker repo (likely `wardev-r/proveit72`)** — audit out the **"disqometer" hijacker script** (flagged in mission-control TK-10), integrate clean into 72's worker. NOT a copy-paste; learn from it, build fresh here.
- Owner console shows mock until `OWNER_KEY` / server-side auth (`harden-owner-auth`).
- Real per-member QR (meet.html QR is illustrative). Google Search Console verify + submit sitemap. `72-landing-opal.html` still on the test payment link.
- Owner's own test membership (Rob Ward, `sub_1Ttbxl…`) kept intentionally — will bill $7.20 on **Aug 15** unless cancelled.

### Meta
- Full machine-readable state lives in **`agents.json`** (13 actions, ~7 open) — the durable source of truth for what's left. `72-mission-control.html` is the human mirror.
