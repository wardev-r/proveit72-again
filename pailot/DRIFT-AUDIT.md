# PAILOT — drift audit

*Applying `DRIFT.md` to PAILOT itself. Dated 2026-07-31.*

---

## 1. The finding that reframes the folder

PAILOT's own architecture line is a drift-control system:

> `CONFIG`-driven engine → enrich → **human verify-queue** → **seal (notary +
> timestamp)** → publish. Moat = **verified data + provenance.**

Read against the framework, every stage maps onto a principle:

| PAILOT stage | Drift principle it implements |
|---|---|
| human **verify-queue** | §5.3 — verify at the boundary; a human confirms before it counts |
| **seal** (notary + timestamp) | §5.5 + §5.6 — positive confirmation, and everything dated |
| **provenance** | §5.6 — who said it, when, and how they knew |
| **publish** last | §5.4 — nothing propagates until it's confirmed |

**So PAILOT is not just a salvage folder. It is the productized form of the drift
framework** — a machine whose entire value proposition is that its records can be
trusted to match reality. The manifest calls the moat "verified data + provenance."
That *is* the anti-drift claim, stated as a business model.

That reframing matters for two reasons:
1. It tells you what PAILOT is actually selling — not features, but **trustworthy
   records**. Every design decision should be judged against "does this make the
   record harder to drift?"
2. It raises the standard PAILOT is held to. A drift-control product whose own
   manifest has drifted is a credibility problem, not just a housekeeping one.

Which brings us to the audit.

---

## 2. Where the manifest has drifted

The manifest is a **map**. The files are the **territory**. Right now they disagree
in specific, nameable ways.

### 2.1 `PARTIAL` and `HAVE*` are unresolved gaps — §3.1, the copy that multiplies
Several rows say the source exists but "only fragments pasted" or "re-paste to
guarantee byte-fidelity." That is the manifest telling you, in writing, that **there
is no authoritative copy** of those pieces. There's a version in a chat log, a version
in the folder, and no rule about which one is real.

`HVAC` is the sharpest case: marked `HAVE*` with a footnote admitting the asterisk
means *not actually verified*. A status that requires a footnote to contradict itself
is not a status.

**Fix:** every row is `VERIFIED` (opened, checked, dated) or it is `UNVERIFIED`. Delete
`PARTIAL` and `HAVE*` — a half-status invites the reader to round up.

### 2.2 The manifest has no dates — §5.6, distrust the undated
Not one row carries a date. So "HAVE" means *someone believed this at some unknown
point*. Six months from now that's a fossil, not a fact — and the person reading it
will be you, with no way to judge whether it's still true.

**Fix:** a `Checked` column. A date, and who checked.

### 2.3 The fill order is a plan stored next to facts — §3.2, plan mistaken for fact
"Fill order: 1. engine.html 2. hvac.html…" sits in the same document as the status
table. That is a to-do list living beside a record of facts, which §5.2 warns is the
exact condition under which intentions get read as history. A future reader — or a
future room — will see the numbered list and assume the steps were done.

**Fix:** move the fill order to its own file, or mark it unmistakably as **PLANNED,
not done**, with the tense to match.

### 2.4 The security flags are the highest-consequence drift — §4, who pays
Three rows carry ⚠️ with real landmines: an embedded AI key, an `sk_live` field in
localStorage, a passphrase in JS the manifest itself calls "theater."

Those flags are correct. The danger is that a flag in a manifest is a **map**, and the
key in the file is the **territory**. If someone deploys from the file without reading
the manifest, the flag protected nothing. Documentation of a landmine is not
disarmament.

**Fix:** this is the one class where you don't record the gap, you **close** it. Strip
the secrets now, then the flag becomes history instead of a live warning that depends
on someone reading it in time. Until then, treat every ⚠️ row as **undeployable**, not
"deployable with care."

### 2.5 Sensitive material has a stated location it isn't in — §3.3, the half-finished change
The header says Mantra "should move to encrypted USB, not public git." *Should* is
future tense. Meanwhile the row exists in a manifest that is in git.

Either the move happened (say so, with a date) or it didn't (say that too). The current
phrasing lets a reader assume it's handled.

**Fix:** state the actual location as a fact, dated. If it hasn't moved, that's a
Phase 0 item.

---

## 3. The repair, in the framework's order

**Phase 0 — stop.** No new pieces added to the manifest until the existing rows have
verified status. Adding rows to a drifting index deepens the gap.

**Phase 1 — ground truth.** Open each file listed. Does it exist? Is it complete? Does
it run? Write what you *saw*, with today's date. This is the whole job; everything
after is bookkeeping.

**Phase 2 — map the gaps.** For each row: what the manifest claims · what's actually in
the folder · which way it cuts. Rank by consequence — the ⚠️ security rows outrank
everything, because they're the ones that can hurt someone who isn't you.

**Phase 3 — fix the authoritative copy.** The folder is authoritative; the manifest is
derived. So correct the *files* first (strip the keys), then update the manifest to
describe what's now true.

**Phase 4 — kill the ambiguity.** Replace the status vocabulary with states that can't
be rounded up, add the `Checked` date column, and separate plans from facts.

**Phase 5 — make truth cheap to check.** The manifest should be verifiable in minutes,
not re-derived from memory. Ideally the check is mechanical: a list of files, an
expected state, and a way to see at a glance which rows are stale.

---

## 4. Proposed manifest columns

| Piece | File | Class | **State** | **Checked** | **By** | Sec |
|---|---|---|---|---|---|---|

Where **State** is exactly one of:

- **`VERIFIED`** — opened and confirmed complete on the Checked date.
- **`UNVERIFIED`** — present but nobody has confirmed it. *Not* a soft yes.
- **`MISSING`** — not in the folder.
- **`BLOCKED`** — present but must not be used until a listed condition clears
  (the security rows live here until stripped).

No asterisks, no footnotes that reverse a status. If a row needs a caveat to be
accurate, the status is wrong.

---

## 5. The one line

PAILOT sells verified records. **A verified-records product with an unverified
manifest is the product failing its own test on the front page.** Fixing the manifest
isn't housekeeping — it's the first demo.
