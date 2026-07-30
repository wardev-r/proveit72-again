# This directory is a standalone project

It is **not** part of the 72 marketplace build. It shares nothing with
`72-stripe-worker.js` — no Stripe, no KV, no routes, no secrets. Its own
`wrangler.toml` deploys its own worker (`twilio-softphone`). The only thing
it touches is the phone number `+1 602 561 5116`.

It lives here purely so the work survives: it was built in an ephemeral
container and the session's GitHub token could not create a new repository
(`403 Resource not accessible by integration`).

## Moving it to its own repo

The intent is for this to be its own repository. Create an empty repo on
GitHub, then from this directory:

```sh
cd softphone
git init -b main
git add -A
git commit -m "Softphone for 602-561-5116"
git remote add origin git@github.com:<you>/twilio-softphone.git
git push -u origin main
```

Nothing needs to change in the code for that to work — no paths, imports
or config reference the parent repo.

## Do not

- Merge its worker into `72-stripe-worker.js`. The separation is the point:
  the marketplace worker handles live money, and a softphone has no
  business sharing that blast radius.
- Point it at `api.velvetrope2you.com`. It gets its own URL.
- Assume it is unfinished because it is in a subdirectory. It is complete
  and tested (`npm test`, 18 tests). See `README.md` for setup.
