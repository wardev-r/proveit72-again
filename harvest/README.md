# Harvest 🌾 — Harv-Sift 2.0

Your chat history is **inventory you forgot you own.** Every old conversation is a
room with something on the table you walked out without. Harv-Sift turns that
backlog into a **ranked menu of assets you already built.**

## How it works
1. Go down your chat list. For each one, 60-second triage:
   *"Is there a thing in here someone would pay for, or that I'd reuse?"*
2. Three buckets — **catch, don't build:**
   - 🚀 **Asset** → logged here as a card
   - 🦴 **Boneyard** → good part, wrong time
   - 🗑️ **Nothing** → skip, no guilt
3. Speed-pass the *whole* list first. Deep-dive winners later.

**Catching ≠ shipping.** This is inventory, not the execute button. Low stakes.

## The store
- `index.json` — the ranked catch-list. `score = marketable × {S:3, M:2, L:1}`;
  sort descending to see what to build first.
- Driven by the `harv-sift` skill (`.claude/skills/harv-sift/`). Say "harv-sift"
  or "go down the list" and start throwing chat titles at it.

## Rules
- Speed over completeness — a fast 8/10 beats a stalled perfect pass.
- One question max per chat.
- The **index is the deliverable** — a durable menu of assets you already own.
- Keep a second copy (SD card / private repo) so the harvest survives the room.
