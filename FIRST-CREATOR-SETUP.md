# First creator setup

Use this when the founder/owner is the first live creator and already bought the first 72 phone numbers.

The production setup endpoint is:

```text
POST https://api.velvetrope2you.com/owner/first-creator
```

It is protected by the `X-Owner-Key` header and requires the Worker secret `OWNER_API_KEY` to be configured.

## Direct-charge founder mode

If you do not pass a `stripeAccountId`, the endpoint turns on `allowDirectCharge`. That means the first live charges land in the platform Stripe account while you prove the call flow. Add a connected account later when you want creator payout splitting on this same record.

```bash
curl -X POST "https://api.velvetrope2you.com/owner/first-creator" \
  -H "Content-Type: application/json" \
  -H "X-Owner-Key: $OWNER_API_KEY" \
  --data '{
    "userId": "owner",
    "username": "tom",
    "displayName": "Tom",
    "email": "you@example.com",
    "pricePerCall": 10,
    "twilioNumber": "+1772XXXXXXX",
    "forwardNumber": "+1YOURPHONE",
    "callMode": "code"
  }'
```

The response includes the live caller URL:

```text
https://velvetrope2you.com/call/tom
```

## Connect mode

If you already have a Stripe Connect account for the first creator, include it and set charges/payouts according to Stripe's account state:

```json
{
  "userId": "owner",
  "username": "tom",
  "stripeAccountId": "acct_...",
  "chargesEnabled": true,
  "payoutsEnabled": true
}
```

## Required live checks

- `STRIPE_SECRET_KEY` is a live `sk_live_...` Worker secret.
- Stripe webhook points to `https://api.velvetrope2you.com/webhook`.
- `OWNER_API_KEY` is configured before calling the setup endpoint.
- The first creator has a `twilioNumber` or the Worker has `PLATFORM_CALL_NUMBER`.
- The first creator has a `forwardNumber` so Twilio can ring the creator.
