# 72 / velvetrope2you — Roadmap

Alive-and-waiting features (NOT the boneyard — these are "definitely revisit").

---

## 🔴 Live Now Discovery — Phase 2
**Status:** parked · revisit **once the Worker's KV is bound + first creator record exists.**

**What:** presence + pay-to-connect, à la Chaturbate but 1:1 calls —
1. **Gate page** `/c?u=<creator>` — checks the creator's online status via the Worker:
   - **online** → "Connect ($X)" → pay → Jitsi room
   - **offline** → "back soon" message, **no charge → no refunds**
2. **"Live Now" directory** `/live` — a browsable grid of creators where `isOnline = true`; offline creators hidden/greyed.

**Why it matters:** one online-status field powers **both** the refund-blocking gate *and* on-platform discovery. Building the gate lays the track for the grid.

**Depends on:**
- Worker **KV binding** (`KV_72`) + creator records (`isOnline`, `pricePerCall`, `paymentLink`, `jitsiRoom`)
- Dashboard online/offline toggle writing `isOnline` to KV

**When we build it:** QR points at the **gate page** instead of the raw Stripe link — better branding + the offline block comes free.

---

*Launch now = Jitsi + Stripe Payment Link + manual online control (deactivate link when offline). The above is the automated upgrade.*
