# Consolidation Punch List — do it in this order

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

## PHASE 1 — Stand up the ONE host (DON'T touch the domain yet)
- [ ] Cloudflare → Workers & Pages → **Create → Pages → Connect to Git** → `proveit72-again`
- [ ] Production branch: **`claude/72-marketplace-deployment-ax8w3w`**
- [ ] Framework: **None** · Build command: **(empty)** · Output dir: **`/`**
- [ ] Deploy → open the **`.pages.dev`** URL
- [ ] ✅ VERIFY it shows the current site (gold pills, visible headline) — do NOT proceed until this is right

## PHASE 2 — Move the domain (the delicate step)
- [ ] In that Pages project → **Custom domains → Set up** → `velvetrope2you.com`
      (auto-configures since the domain's already on Cloudflare; add `www` too)
- [ ] Wait for it to go green + SSL
- [ ] ✅ VERIFY `velvetrope2you.com` (incognito / hard refresh) now loads the Pages site — do NOT proceed until confirmed

## PHASE 3 — Now safe to tear down the old (site already works, nothing breaks)
- [ ] **Netlify:** remove velvetrope2you.com from the Netlify project → then delete/pause the project → cancel any paid plan (no $9 charge)
- [ ] **Cloudflare Pages:** delete the 2 stale extra Pages projects (keep the live one — confirm which is live FIRST)
- [ ] **Railway:** open it, see what it runs. If nothing's needed → delete the project. (Check before deleting.)

## PHASE 4 — Tidy the rest
- [ ] **Twilio:** cancel paid support plan (reverts to free) + request refund for the accidental/early charge. Keep the account.
- [ ] **GitHub (later, low priority):** clean up branches / set a real default branch. Not urgent.
- [ ] **Stripe:** confirm Live mode + Live payment link in use.

---

### Verify-gates (never skip these)
1. `.pages.dev` shows the right site  → before touching the domain
2. `velvetrope2you.com` shows the right site → before deleting Netlify
3. Know which Pages project is live → before deleting the others
4. Know what Railway runs → before deleting it
