# Consolidation Punch List — do it in this order

> **STATUS 2026-07-31 — read before acting on the boxes below.**
> Phases 1 and 2 are **done**. The site has been live on the domain since
> 2026-07-16. The unchecked boxes below were never updated, which is the
> whole reason this list read as "nothing shipped."
>
> **Pages production branch = `claude/twilio-deploy-bi6sbr`.** Not the
> marketplace branch named in Phase 1 — that line was wrong, and chasing it
> is what kept sending sessions to the wrong place.
>
> As of today `bi6sbr`, `twilio-emergence-4qbonn` and
> `72-marketplace-deployment-ax8w3w` are all aligned on the same commit, so
> the ambiguity is gone. Edit on emergence, fast-forward the other two.
>
> **The Worker is not deployed by git.** Pushing only ships the HTML via
> Pages. `72-stripe-worker.js` goes live solely through `wrangler deploy`.
> A worker fix sitting in a green branch is still not running.

**GOLDEN RULE:** Never delete the old thing until the new thing is proven working.
Move the domain ONLY after the new host is confirmed live. Change one thing,
verify, then the next. The domain (velvetrope2you.com) is the live wire — treat
it last and gently.

**Target end state (one clean stack):**
GitHub (code) → **Cloudflare Pages** (site) + **Cloudflare Worker** (backend) +
**Cloudflare** (domain/DNS) · **Stripe** (pay) · **Jitsi** (calls).
Killed: Netlify, Railway, extra Pages projects, Twilio paid support.

---

## PHASE 0 — Earning (independent, do anytime, breaks nothing)
- [ ] Jitsi room chosen (e.g. `meet.jit.si/velvetrope-test`)
- [ ] Stripe Payment Link → **After payment: Redirect** → the Jitsi room URL
- [ ] Test with card `4242 4242 4242 4242` → lands in the room ✅
- [ ] Activate Stripe **Live mode** + remake link in Live = real money

## PHASE 1 — Stand up the ONE host ✅ DONE (2026-07-16)
- [x] Cloudflare → Workers & Pages → **Create → Pages → Connect to Git** → `proveit72-again`
- [x] Production branch: **`claude/twilio-deploy-bi6sbr`** ← the real one
- [x] Framework: **None** · Build command: **(empty)** · Output dir: **`/`**
- [x] Deploy → open the **`.pages.dev`** URL
- [x] ✅ VERIFIED — site serves correctly

## PHASE 2 — Move the domain ✅ DONE (2026-07-16)
- [x] In that Pages project → **Custom domains → Set up** → `velvetrope2you.com`
- [x] Green + SSL
- [x] ✅ VERIFIED — `velvetrope2you.com` is live and has stayed live

## PHASE 3 — Now safe to tear down the old (site already works, nothing breaks)
- [ ] **Netlify:** remove velvetrope2you.com from the Netlify project → then delete/pause the project → cancel any paid plan (no $9 charge)
- [ ] **Cloudflare Pages:** delete the 2 stale extra Pages projects (keep the live one — confirm which is live FIRST)
- [ ] **Railway:** open it, see what it runs. If nothing's needed → delete the project. (Check before deleting.)

## PHASE 4 — Tidy the rest
- [x] **Twilio:** paid support cancelled — reverted to free (status back) and the accidental/early charge was refunded. Account kept. ✅ RESOLVED
- [ ] **GitHub (later, low priority):** clean up branches / set a real default branch. Not urgent.
- [ ] **Stripe:** confirm Live mode + Live payment link in use.

---

### Verify-gates (never skip these)
1. `.pages.dev` shows the right site  → before touching the domain
2. `velvetrope2you.com` shows the right site → before deleting Netlify
3. Know which Pages project is live → before deleting the others
4. Know what Railway runs → before deleting it
