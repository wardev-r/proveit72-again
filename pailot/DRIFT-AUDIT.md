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

## 5. What PAILOT must not produce

*Binding on the build. Sections 1–4 are about PAILOT's records drifting. This section
is about the opposite and more dangerous failure: records that can't drift, and are
wrong.*

### 5.1 The core hazard: sealing proves integrity, not truth
A notary, timestamp, and hash prove exactly two things: **this text existed at this
time**, and **it has not changed since.** They prove *nothing* about whether the content
was accurate when it went in.

That gap is the whole danger. Unverified assertion in → sealed, dated, anchored
artifact out — which now *looks* like evidence. **The seal does not merely preserve a
claim; it upgrades it.** A pipeline that can do that is a machine for laundering
assertions into proof, and it will be used that way whether or not that was the intent.

> **Rule:** PAILOT may never present "sealed" as a synonym for "true," in UI, in
> export, or in marketing copy.

### 5.2 Two claims, always shown separately
Every output must distinguish, visibly and structurally:

- **Provenance** — *"Recorded on [date] by [who], unchanged since."* PAILOT can prove
  this. It is the product.
- **Corroboration** — *"Independently supported by [what evidence]."* PAILOT cannot
  prove this on its own, and must never imply it.

If an artifact cannot display both separately, readers will read the weaker as the
stronger. A record with no corroboration field is not neutral — it reads as verified.

### 5.3 "Verify" is not a verb until it's defined
A human verify-queue whose verb is undefined is a rubber stamp with a UI. Verified
*what* — that it was typed? that a document was seen? that a fact was independently
confirmed?

> **Rule:** every record type declares what its verification step actually checks, and
> that declaration travels **on the artifact**, not in documentation nobody opens.

### 5.4 The paradox: drift-proof is also correction-proof
Immutability cuts both ways. Everything that stops a record from quietly changing also
stops an error from being quietly fixed. Anti-drift measures without a correction path
do not produce truth — they produce **permanent mistakes with excellent provenance.**

> **Rule:** the correction path must be as strong, as permanent, and as discoverable as
> the seal. Amendments, retractions, and disputes attach to the original and travel with
> it in every export and view. A record that cannot be answered is not a record; it is
> an accusation.

### 5.5 Records about people require the subject to have standing
The verify-queue serves the **author**. Nobody serves the **subject** — the person the
record describes, who may not know it exists and cannot contest it. That asymmetry is
the exact harm `DRIFT.md` §4 identifies (the party with least access to the record pays
for it), rebuilt on purpose and sealed shut.

For any record naming an identifiable person:
- **Accuracy is a duty, not a preference.** Publishing false factual claims about a real
  person is defamation, and permanence is an aggravating factor, not a defense.
- **The subject can know, and can answer.** A response attaches to the record with the
  same weight as the original.
- **Redact PII by default**, per the manifest's own security rules.
- **Private by default; publication is a deliberate, separate act** with its own gate.

### 5.6 The scope line — the one that decides what PAILOT is
There are two products here and they must not ship under one roof by accident:

| | **Own-facts PAILOT** | **Third-party PAILOT** |
|---|---|---|
| Records | your own dealings — what you filed, when, what you were told | claims about other people |
| Effect | **arms the party with least access to the record** | **creates a dossier on someone who has none** |
| Risk | low; you are the subject and the author | defamation, surveillance, permanent harm |
| Status | **the product** | **out of scope without a deliberate, separately-designed consent and dispute regime** |

The first version is the genuinely good one, and it is the one that fulfills the
framework's own logic: a person keeping an unfalsifiable record of their own dealings is
precisely the fix for the asymmetry in `DRIFT.md` §4. Pointed outward at other people,
the same machine *creates* that asymmetry instead of curing it.

> **Standing rule:** Mantra (accountability/records) stays **private and own-facts**
> until a consent-and-dispute regime is designed on purpose. The manifest already says
> "keep private." This is that instinct written as a rule instead of a preference.

### 5.7 Pre-ship checklist
No PAILOT output ships until every line is true:

- [ ] The artifact states what was verified, and by what standard.
- [ ] Provenance and corroboration are visually separate; neither implies the other.
- [ ] "Sealed" never appears as a synonym for "true."
- [ ] A correction/dispute can be attached, and travels with every copy and export.
- [ ] No secrets in client code (see §2.4) — flagged is not stripped.
- [ ] If any identifiable third party is named: subject has notice and a right of
      response, PII is redacted, and publication was a deliberate separate act.

---

## 6. The one line

PAILOT sells verified records. **A verified-records product with an unverified
manifest is the product failing its own test on the front page** — and a sealing
product without a correction path is the product failing the person it sealed a
mistake about. Fixing the manifest isn't housekeeping; it's the first demo. Building
the correction path isn't a feature; it's the license to seal anything at all.
