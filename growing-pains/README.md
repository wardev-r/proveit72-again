# Growing Pain Relics 🪦 → ♻️

The folder of shame, but the honest name. These are **directions that cost real
iteration** before we landed the right one — *and* they're salvage. None of it
fit the 72 landing, but the pieces can be tweaked into other things later. A
graveyard you can shop in.

Two kinds of stuff lives here:
- **Screenshots** = the memory. What it looked like, why we killed it. Keeps us
  from re-pitching a dead idea.
- **`parts/`** = the reusable bits. Actual CSS/SVG lifted out so future-you can
  drop them into something else and tweak — not a PNG you'd have to rebuild from.

**Rules:**
- Nothing here is used in production. It's a parts bin, not a source tree.
- A thing that dies comes here *with its code*, not just a picture of it.
- Each entry gets a line: *what it was*, *why it died*, *what it's good for*.

---

## Relics

### `01-cool-opal-too-grey.png`
First opalescent landing background. Pearly, but **too cool/grey** — read as
overcast instead of luxurious.
**Died because:** verdict was "homely — warmer." Replaced by a warm golden-hour
palette.

### `02-semipic-beach-rejected.png`
The warm version, but built as a semi-realistic *picture*: palm silhouettes, a
horizon line, a sun and its reflection on the water.
**Died because:** "make it a colour-change film instead of a semi pic." Replaced
by an abstract drifting warm-opal gradient (no representational elements, no hard
lines). That's the version that shipped as `72-landing-opal.html`.

---

## Salvageable parts (`parts/`)

Lifted out so they can be tweaked into other projects:

| File | What it is | Good for |
|------|------------|----------|
| `palm-silhouette.svg` | Coconut-palm silhouette, pure SVG | Any tropical / beach / vacation visual; recolor + scale freely |
| `beach-scene.css` | Warm golden-hour sunset background (sky, sun, sea, reflection) + palm placement | A drop-in sunset backdrop for some future page |
| `cool-opal-palette.css` | Pearly periwinkle/lilac/blush palette + gradient | A calmer, cooler brand than 72 |

---

## Lesson tax paid here
- Pin the *subject* before polishing pixels (we warmed a beach scene that the
  brief never wanted to be a scene at all).
- "Opalescent" needed to be **warm**, not literally pearl-grey.
- Abstract gradient > literal illustration for a background that must never
  compete with the copy.
