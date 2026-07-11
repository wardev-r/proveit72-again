# 72 — Product brief for legal drafting

Paste this whole file into GPT (or a lawyer) with the instruction at the top. It
describes exactly what 72 is, how money and data flow, and the specific clauses
the documents must contain. Fill the **[BRACKETED]** blanks first — they're the
facts only you know.

---

## Instruction to the drafter

> Using the facts below, draft three documents for a US-based, beta-stage online
> marketplace called **72** (velvetrope2you.com): (1) **Terms of Service**,
> (2) **Privacy Policy**, (3) a short **Creator Agreement / acceptable-use
> addendum**. Plain English, US consumer law, 18+ only. Return each as clean
> Markdown with numbered sections and an "Effective date" line. Flag anything
> that needs a lawyer's review. Do not invent facts I did not provide — leave a
> visible placeholder instead.

---

## 1. What 72 is (in one paragraph)

72 is a marketplace that lets anyone charge for their time and attention. A
creator/professional claims a spot, sets a per-interaction price, and shares one
link or QR code. A "caller" (buyer) pays first through Stripe, then lands in a
private call or live video room with the creator. It is deliberately for
everyone with a phone number and time worth money — plumbers, lawyers,
therapists, coaches, consultants, tutors, creators. 72 is the intermediary/
platform; it is **not** a party to the actual conversation or the service the
creator delivers.

## 2. The parties

- **The Platform** — "72", operated by **[LEGAL ENTITY NAME / SOLE PROPRIETOR NAME]**, located at **[BUSINESS ADDRESS]**, contact **support@velvetrope2you.com**.
- **Creators (sellers)** — members who set a price and provide the call/session.
- **Callers (buyers)** — people who pay to reach a creator.
- A single user can be both.

## 3. Money — how it flows (be precise; the docs must match)

- **Membership:** every user is a member. **First month free, then $7.20/month**
  recurring subscription (30-day free trial). Billed via Stripe. Cancelable
  anytime; **[STATE REFUND POLICY: e.g. no prorated refunds on the monthly fee]**.
- **Per-call price:** creators set their own rate, **$5 minimum, no maximum.**
- **Revenue split:** on each paid call the **creator keeps 72%**, the **platform
  keeps 28%**. Creator payouts are made **weekly via Stripe** (Stripe Connect to
  the creator's connected account).
- **Planned "toll pack":** a 10-call pack at $7.20 (72¢/call) for reaching a
  creator past their free whitelist — **not yet live**; mention as a future feature.
- **Payment processor:** **Stripe** handles all card processing and stores all
  card data. 72 never sees or stores full card numbers.
- **Taxes:** creators are responsible for their own income taxes; 72 is not an
  employer. **[CONFIRM: sales-tax handling, 1099 issuance thresholds]**.

## 4. How a session actually happens (tech facts for the Privacy Policy)

- Static site on **Cloudflare Pages**; backend on a **Cloudflare Worker** with
  **Cloudflare KV** storing creator records (handle, rate, connected-account id).
- Payments + payouts: **Stripe** (incl. Stripe Connect).
- **Live video/audio calls run on Jitsi (meet.jit.si)** — a third-party,
  browser-based room. No app install. 72 does not record calls **[CONFIRM: no
  recording]**.
- **QR codes** deep-link a caller into the pay-then-room flow.
- Form submissions (signup / collab requests) are sent through **Web3Forms**.
- **Phone numbers / call routing:** **Twilio** (planned).
- Hosting/DNS: **Cloudflare** (domain velvetrope2you.com).

## 5. Data 72 collects (enumerate in the Privacy Policy)

- **Account/creator:** name, handle, email, chosen rate, optional description.
- **Payment:** processed and stored by Stripe; 72 receives payout/transaction
  metadata (amounts, fees, connected-account id, call id), not card details.
- **Usage:** basic call metadata (amount, timestamps, call id).
- **Forms:** anything submitted via the signup/collab forms (via Web3Forms).
- **NOT collected/stored by 72:** full card numbers; call recordings **[CONFIRM]**.
- **Subprocessors to name:** Stripe, Cloudflare, Jitsi (8x8), Web3Forms, Twilio.
- **[CONFIRM: analytics/cookies — is anything tracking used? If none, say so.]**

## 6. Clauses the documents MUST include

**Terms of Service**
1. 18+ only; eligibility.
2. Membership terms: free trial, $7.20/mo, auto-renew, cancellation, refund stance.
3. Per-call payment terms + the 72/28 split + $5 minimum, no ceiling.
4. **Platform-as-intermediary disclaimer:** 72 only connects people and processes
   payment; it does not provide, supervise, endorse, or guarantee any creator's
   service, advice, or conduct.
5. **Professional-advice disclaimer (important — lawyers/therapists/trades use
   this):** interactions do **not** create any professional-client, attorney-
   client, or provider-patient relationship **with 72**; creators are solely
   responsible for their own licensing, credentials, scope of practice, and legal
   compliance; content shared in a call is not professional advice from 72.
6. Acceptable use / prohibited conduct: no illegal activity, harassment, fraud,
   adult sexual services, minors, IP infringement, circumventing payment, etc.
7. Creator obligations: accurate rates, showing up, own tax/compliance.
8. Beta disclaimer: service provided "as is" during beta; features may change.
9. Payments via Stripe; chargebacks/disputes handling; payout timing.
10. Third-party services (Stripe, Jitsi, Cloudflare, Twilio) governed by their own terms.
11. Limitation of liability — keep the existing cap: **total liability capped at
    the greater of what the user paid in the prior 3 months or US$100.**
12. Indemnification, termination/suspension, changes to terms.
13. **Governing law: State of Arizona, USA; disputes in Arizona courts** (matches
    current draft) **[CONFIRM or change]**. Consider an arbitration/class-waiver clause **[DECIDE]**.
14. Contact: support@velvetrope2you.com.

**Privacy Policy**
1. What's collected (§5), why, and legal basis.
2. Stripe handles payment data; 72 doesn't store cards.
3. Named subprocessors (§4/§5) and that data is shared with them to run the service.
4. Video calls occur on Jitsi (third party); link to their privacy stance.
5. Data retention, user rights (access/delete), how to request (email).
6. Security posture; breach-notification intent.
7. 18+; no knowing collection from minors.
8. Cookies/analytics **[CONFIRM what's used, if any]**.
9. Changes + effective date; contact.

**Creator Agreement / AUP (short addendum)**
- Creator is an independent party, not an employee/agent of 72.
- Responsible for own licensing, taxes, service quality, and legal compliance.
- Stripe Connect payout terms; 28% platform fee acknowledgment.
- Grounds for removal; content standards.

## 7. Blanks to fill before drafting

- [ ] Legal entity name / owner name and business address
- [ ] Confirm governing law (currently Arizona) + arbitration decision
- [ ] Membership refund policy specifics
- [ ] Per-call refund/dispute policy (what happens if a call doesn't connect)
- [ ] Whether calls are ever recorded (assumed: no)
- [ ] Analytics/cookies in use (assumed: none)
- [ ] Tax handling / 1099 thresholds for creators
- [ ] Data retention periods

## 8. Tone / house style

Match the site: clear, direct, no jargon, honest about beta. Short sentences.
Every document ends with an "Effective date" and the support email. Include the
standard "this is a template, not legal advice — have an attorney review"
disclaimer at the end of each.
