# 2026-07-31 — the broken purchase, and the branch question answered for good

Read this before touching branches or the payment path.

## The branch answer (stop re-deriving it)

**Pages production branch = `claude/twilio-deploy-bi6sbr`.** Confirmed from the
go-live worklog and the `GOLIVE-EMERGENCE.md` header. It has been production
since 2026-07-16 and never moved. `PUNCH.md` used to list
`72-marketplace-deployment-ax8w3w` in an unchecked box — that line was a ghost,
never executed, and it is what kept sending fresh sessions to the wrong branch.
It is corrected now.

**The foundation was never unstable. The paperwork about it was.** 72/28, the
stack, the domain, the brand, the vision — none of it has moved. Only three
things ever drifted: which branch deploys, where the agANT files lived, and what
172collect was for. All three are resolved.

**Ship by fast-forwarding** — emergence is the edit branch, bi6sbr is the deploy:

```sh
git push origin origin/claude/twilio-emergence-4qbonn:refs/heads/claude/twilio-deploy-bi6sbr
git push origin origin/claude/twilio-emergence-4qbonn:refs/heads/claude/72-marketplace-deployment-ax8w3w
```

## ⚠️ Git does not deploy the Worker

Pushing ships **only** the static HTML through Pages. `72-stripe-worker.js` goes
live solely via `wrangler deploy`. A worker fix merged into a green branch is
still not running. This distinction is the single most expensive thing in this
repo — it is why a fix can look shipped and not be.

## What broke today

A member (Peggy) paid, then could not claim her 772 number no matter how many
times she tried. Because she had no number, nobody could buy a call from her
either — which is how it first surfaced as "my product is broken."

Root cause, in order:

1. `72-app-dashboard.html` printed *"Welcome to 72! Your account is active"*
   straight from the `signup=success` query param. It never verified anything.
2. Real activation only happens when the Stripe webhook flips
   `subscriptionStatus`. If that webhook is slow, misconfigured, or absent, the
   member stays inactive.
3. The worker then correctly refused: *"An active membership is required to
   claim a number."*
4. `claimNumber()` caught that with `catch (_)` and replaced it with "Could not
   claim a number — please try again." The one sentence explaining everything
   was deleted right before it reached her.

**`catch (_)` is the villain of this whole day.** It appeared in the dashboard,
`call-first.html`, and `promo-tom.html`, each time discarding a specific,
actionable reason in favour of "try again." Never do this on a money path.

## Fixed and pushed (live on Pages)

- Dashboard calls `/membership-confirm` against the checkout session instead of
  assuming success, and reports what actually happened.
- `claimNumber()` surfaces the worker's real reason.
- `call-first.html` surfaces real checkout errors; the member-rate fallback is
  kept but now only fires for genuine member-rate failures.
- `connect.html` no longer promises a text that nothing sends — the worker has
  **no SMS code at all**.

## Fixed but NOT live — needs `wrangler deploy`

- Worker refuses to create a Stripe session when the code path has no number to
  dial. Previously it authorized the card anyway and dropped the caller on
  `connect.html?num=` with a hidden call button and a PIN they could not use.

## Still open

- **Stripe → Developers → Webhooks.** Verify an endpoint points at
  `api.velvetrope2you.com/webhook`. If it is missing or failing, that is the
  original cause, and renewals/cancellations are not being recorded either.
- **Peggy's account** may still need activating — reloading the dashboard with
  her original `?signup=success&session=...` link should now confirm it.
  Otherwise flip `subscriptionStatus` in KV.
- **Uncaptured PaymentIntents.** Authorizations release on their own in ~7 days;
  void any stragglers so holds drop sooner.
- **`PLATFORM_URL`** must be set as a worker secret. Two of four fallbacks in
  `72-stripe-worker.js` still default to `https://your-domain.com`.
- **`/create-vip-checkout` does not exist.** `promo-tom.html` is safe only
  because `DEMO = true`. Do not flip that flag before building the endpoint.
- `promo-tom.html` and `deploy-172collect/tom/index.html` are duplicates that
  will drift.

## Also added

`softphone/` — a standalone browser softphone for 602-561-5116, unrelated to the
marketplace (own worker, own config). It also lives in the `ward-constructions`
repo, which is its real home.
