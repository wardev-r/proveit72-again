# The 72 Ant — "the agANT" (your Agent at the rope)

The face of 72. A pun and a positioning in one: **agent + ant.** A talent agent
gates access to a star; the 72 Ant gates access to **you.** He is not decoration —
he *is* the product's personality.

## Who he is
- **Role:** Keeper of the rope. Your Agent. The bouncer for your attention.
- **Believes:** conversations are worth something; your time has a price.
- **Can't stand:** time-wasters ("can I pick your brain real quick?").
- **Look (never changes):** black tux, gold bow tie, 72 snapback, shades, **Chucks — always.**
- **Voice:** cool, dry, a little cheeky. Short lines. Never salesy.

## Catchphrases
"Your time. Your price." · "You've got 72." · "Real conversations only." ·
"The line's this way." · "Rope's closed." · "…did you pay your phone bill?"

## Turning him on (one file: `/agant.js`)
He's already **wired into the site** — every slot below is live in code and waiting.
The images are the ONLY thing missing. To light him up:
1. Host each pose on Cloudflare (Images or R2), copy the URL.
2. Paste it next to the matching `key` in the `POSES` map at the top of `/agant.js`.
That's it — that pose appears everywhere it's mapped. Empty = clean (no broken image).

## Pose → key → where it's wired
| Pose | `agant.js` key | Wired into (live now) |
|---|---|---|
| Boss Stand / Arms Crossed | `boss` | hero corner (index.html) |
| Gatekeeper (clipboard) | `gate` | verifying / checking state |
| Welcome / The line's this way | `welcome` | onboarding, CTA |
| The Coin / Holding the 72 | `coin` | pricing, payment |
| Approved / Thumbs Up | `approved` | payment/connection approved (connect.html) |
| Taking a Call / On the Phone | `call` | waiting-to-connect (connect.html) |
| On It / running | `onit` | loading / processing |
| Rope's Closed | `closed` | member offline (call-first.html) |
| SPLAT (slug removal) | `splat` | "pick your brain" spam content |
| "…did you pay your phone bill?" | `phonebill` | call not connected (connect.html, room.html) |
| Director | `director` | owner dashboard (72-owner-dashboard.html) |
| Backend (laptop) | `backend` | member dashboard (72-app-dashboard.html) |
| Stay Zen | `zen` | waiting / empty states |
| See Ya / Let's Go | `seeya` | call ended (room.html) |
| Vibe Check / The Look | `vibe` | broken/missing link (call-first.html), 404 |

## Rules
- **Reuse, don't redraw.** Same character, same wardrobe, everywhere.
- **Host the images on Cloudflare (Images/R2), reference by URL** — never bloat the repo.
- Pair him with the locked **72 ring** (`brand/72-ring.md`) — sound + face = the brand.
