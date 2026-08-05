# agANT pose drop zone

This folder is where the live site looks for finished mascot pose files.

The loader in `../agant.js` is already wired so missing files remove themselves cleanly in the browser. That means you do **not** need fake PNG placeholders here; just drop in the real exported art when each pose is ready.

## Live now

- `boss.svg` — on-duty corner mascot used on the main landing page.

## PNG slots already wired

Save finished transparent-background PNGs with these exact names:

- `gate.png` — greeting / verifying a caller.
- `welcome.png` — onboarding / connecting.
- `coin.png` — pricing / payment.
- `approved.png` — payment approved / call captured.
- `call.png` — connected / in-call.
- `onit.png` — loading / processing.
- `closed.png` — member offline.
- `splat.png` — time-waster / spam.
- `phonebill.png` — call did not connect.
- `director.png` — owner dashboard.
- `backend.png` — member dashboard.
- `zen.png` — waiting / empty state.
- `seeya.png` — call ended.
- `vibe.png` — 404 / vibe check.

See `../agant.js` for the source of truth that maps pose keys to these filenames.
