---
name: harv-sift
description: Harvest past AI chats/sessions and sift them for reusable or marketable assets, then log the finds to a durable ranked index. Use when the user wants to go down their chat history, "mine my sessions", "see what else is in there", or turn a backlog of old conversations into a ranked menu of buildable/sellable parts. ADHD-friendly speed-triage; catch-don't-build.
---

# Harv-Sift 2.0 — harvest your chats, sift for gold

The user generates more value than they capture. Their chat history is **inventory they forgot they own** — each old conversation is a room with something on the table they walked out without. This skill turns that backlog into a **ranked menu of assets**, fast, without rabbit-holing.

Core rule: **catching ≠ shipping.** This is inventory, not the execute button. Keep it low-stakes and moving.

## Trigger Phrases
- "harv-sift" / "harvest my chats" / "sift my sessions"
- "go down the list and see what emerges"
- "what else is in my chat history?"
- "mine my old chats / sessions for assets"
- "turn my history into a list of things to build"

## The Two Gears

| Gear | What it does | When |
|---|---|---|
| **Speed Pass** | Rip through the *whole* list, ~60s/chat, catch only | Default — do this first, always |
| **Deep Dive** | Pull ONE 🚀 winner apart into a real plan | Only after a speed pass, only on winners |

Never deep-dive during a speed pass. Momentum dies in rabbit holes.

## Speed Pass — the 60-second triage (per chat)

For each chat the user names (or pastes the title of), ask ONE question:

> *"Is there a thing in here someone would pay for, or that I'd reuse?"*

Then drop it in a bucket — **don't build, just CATCH:**

- 🚀 **Asset** — buildable or sellable. Capture a card (below).
- 🦴 **Boneyard** — good part, wrong time. Note it, move on.
- 🗑️ **Nothing** — skip it. **No guilt.** Speed matters more than completeness.

If the user is going down their sidebar, take whatever they throw you — a title, a one-liner, a paste — and triage it. Don't demand all fields. Infer what you can, ask at most one quick question, log it, move to the next.

## The Card (what to log for each 🚀 Asset)

Append to `harvest/index.json`:

```json
{
  "id": <next int>,
  "source": "<chat title — surface/date if known>",
  "name": "<short product-y name>",
  "one_line": "<what it is, plain>",
  "who_wants_it": "<who would pay / reuse>",
  "bucket": "asset",
  "marketable": <1-5>,
  "effort": "S | M | L",
  "score": <marketable, weighted down by effort — see below>,
  "next_step": "<the single smallest next action>",
  "status": "caught"
}
```

**Score heuristic (for ranking):** `score = marketable × {S:3, M:2, L:1}`. High marketable + low effort floats to the top. It's a rough sort, not gospel — used only to surface "do this one first."

🦴 Boneyard finds get a lighter card (`bucket: "boneyard"`, name + one_line + why-not-now). 🗑️ gets nothing.

## After a Speed Pass — surface the menu

When the user signals they've reached the bottom of the list (or says "that's it"):

1. **Sort the 🚀 assets by `score` descending.**
2. Show a tight ranked menu: name · one_line · marketable · effort.
3. Name the **top 1–3** as "do these first."
4. Ask which ONE they want to Deep Dive — or whether to just bank the list and stop.

Banking the list IS a complete, valid outcome. Capturing the inventory was the whole job.

## Deep Dive — turning one 🚀 into a plan (only on request)

For the chosen asset:
1. Pull the original chat's relevant content (user pastes it).
2. Define: the product shape (skill/app/extension/SaaS/template), the smallest shippable version, the moat (what's not copyable), the first 3 build steps.
3. Capture as its own card/issue. Still don't push the big button — produce the *plan*, let the user choose to start.

## Framing Rules (hold these)
1. **Speed over completeness.** A fast pass that catches 8 of 10 beats a perfect pass that stalls on chat #1.
2. **Catch, don't build.** Logging an asset is a save, not a commitment. Reassure the user of this if they hesitate.
3. **No guilt on 🗑️.** Most chats are nothing. That's normal and fine.
4. **One question max per chat.** Don't interrogate. Infer, log, move.
5. **The index is the deliverable.** A durable, ranked menu of assets they already own. That's the win — not a finished product.

## Durable store
Finds live in `harvest/index.json` (this repo) — same rolo pattern as `boneyard/index.json`. The data lives in the store; any tool can read it. Suggest the user keep a second copy on their SD card / a private repo so the harvest survives the room.
