# deploy-172collect — drag-and-drop bundle for 172collect.com

Drop this WHOLE FOLDER into Cloudflare Pages → Create → Pages → Upload assets.

    /                → 1·72·COLLECT "reverse the charges" (the brand — the front door)
    /tom             → the Tom MacDonald drop (the campaign pitch)

## Rules
- The apex is the BRAND. Campaigns live on paths, never the front door.
- `/tom` is intentionally **unlisted** — nothing on the apex links to it, and the page
  is `noindex`. It's a private pitch: Tom's name/brand must not be publicly advertised
  before he agrees. Send the link directly; don't announce it.
- `/tom` stays `DEMO=true` (no real charges) until Tom is signed on AND a real, named,
  tracked U.S. VETS handoff exists.

## Refresh
Regenerate from the sources when they change:

    cp 172collect/index.html   deploy-172collect/index.html
    cp promo-tom.html          deploy-172collect/tom/index.html
