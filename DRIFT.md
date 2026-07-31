# Drift

### How the record and the reality come apart — and how to close the gap

*A general-purpose field guide. Written from a software failure, but the pattern is
domain-neutral: it shows up in paperwork, filings, benefits, custody, medical records,
contracts, and anywhere more than one person acts on a shared account of the facts.*

---

## 1. The base problem, in one sentence

> **Drift is what happens when the record of a thing stops matching the thing, and
> everyone keeps acting on the record.**

Nothing dramatic announces it. No alarm, no error, no refusal. The system keeps
running — smoothly — on a description of the world that is no longer true. Every
decision made from that point is confidently, invisibly wrong.

That is what makes drift different from an ordinary mistake. A mistake is an event.
**Drift is a condition.** A mistake announces itself when it fails. Drift *succeeds* —
it just succeeds at the wrong thing, and it keeps succeeding until something expensive
finally forces a comparison.

---

## 2. Why it is nearly always invisible

Every system that tracks anything real has two layers:

- **The territory** — what is actually true. The money that actually moved. The form
  that was actually received. The code that is actually running. The address someone
  actually lives at.
- **The map** — the record of what is true. The file, the note, the doc, the entry in
  someone's system, the thing you *remember* being decided.

You almost never touch the territory directly. You act on the map. The map is faster,
closer to hand, and usually right — which is exactly why nobody checks it.

**Drift is the gap between the two.** It is invisible because the map is still
perfectly readable. It looks authoritative. It *is* consistent — internally. It's just
no longer connected to the thing it describes.

The tell is that everything continues to work. Right up until it doesn't.

---

## 3. The five ways drift gets in

Nearly every case reduces to one of these. Learn to name them and you can spot them
early.

### 3.1 The copy that multiplies
One record becomes two — a duplicate, a version, a "working copy," a second folder, a
second office holding the same file. Neither is labeled as *the* one. Both get updated
sometimes. Now there is no fact of the matter about what's true; there is only *which
copy you happened to open.*

> **Signature:** two people describe the same situation differently and both are
> reading real documents.

### 3.2 The plan mistaken for the fact
Someone writes down what *will* be done. Later, someone reads it as what *was* done.
An unchecked box, a draft, a proposal, an intention — all get quoted later as history.
Nobody lied. The document simply outlived its tense.

> **Signature:** the only evidence for a claim is a document written *before* the thing
> would have happened.

### 3.3 The half-finished change
An action has two or more parts that must land together, and only one lands. The
paperwork is filed but the fee isn't paid. The account is closed but the
auto-payment isn't. The decision is made but never entered anywhere. The change is
approved in one system and not the other.

Each half is individually correct, so nothing flags an error — and the whole is
broken.

> **Signature:** "But I did that." And you did. You did *part* of it.

### 3.4 The stale authority
The record was true when written. Conditions changed. The record didn't. Everyone keeps
citing it because it's the only written thing, and written things carry weight far
past their expiry.

> **Signature:** the document has a date on it, and nobody has looked at that date.

### 3.5 Silence read as confirmation
Nothing came back, so it must have worked. But "no news" is not evidence — it is the
*absence* of evidence, and the two feel identical from the inside. Most systems are
much better at telling you something failed loudly than telling you something quietly
never happened at all.

> **Signature:** your belief that something is done rests on not having heard otherwise.

---

## 4. Why it compounds

Drift does not stay one error. It breeds, for three structural reasons:

**It gets re-derived.** Each new person who arrives reads the map, not the territory.
They inherit the gap and add their own work on top — now the wrong version has more
invested in it, and correcting it costs more than it did yesterday.

**It gets laundered into authority.** A wrong entry gets cited by a second document,
which gets cited by a third. By the fourth, the claim has "sources." Nobody can point
to where it entered. Age starts to look like verification.

**It survives the people.** Individuals forget, move on, lose access, change roles. The
record persists. Whatever the record says becomes what happened, because the humans who
could contradict it are gone or no longer believed.

And the cost is never distributed evenly. **Drift is paid for by whoever has the least
access to the authoritative record.** The institution holds the file; the person
affected holds a photocopy and a memory. When the two disagree, the file wins by
default — not because it's more accurate, but because it's more *available.* That
asymmetry is the whole reason this is worth taking seriously.

---

## 5. The fix: six principles

Not tools. Habits. They work at any scale, with or without technology.

### 5.1 Name the single source of truth — out loud, in writing
For any fact that matters, one place is **authoritative** and every other copy is
explicitly labeled a **copy**. Not "the main one," not "the latest" — *the* one, named.

The point isn't tidiness. It's that ambiguity about which record governs **is itself
the defect**, and it will be resolved — under pressure, by whoever benefits from
resolving it their way.

### 5.2 Record what happened, not what was decided
Two different things, written two different ways:

- ❌ *"Production will be switched to the new system."*
- ✅ *"Production was switched on the 16th; confirmed by opening it and seeing the new
  version."*

The second has a date, an action in past tense, and a verification. The first is a
promise that will be read as history within a month.

**Keep intentions and outcomes in separate places.** A to-do list that lives next to a
record of facts will eventually be read as a record of facts.

### 5.3 Verify at the boundary, not from inside
Check the **territory**, not another copy of the map. Confirm at the place the change
actually has to be true:

- Not "the letter says it was filed" → the receiving office's own record shows it
- Not "I remember agreeing" → the signed version says so
- Not "it's marked complete" → the thing itself is observably different

One rule covers most of it: **the authoritative record is the one held by whoever
enforces the outcome.** Go read *that* one. Everything else is a rumor about it.

### 5.4 Change one thing, then confirm, then the next
Batching changes destroys your ability to tell which one broke. Sequence and verify:
change → confirm it landed → next. Slower per step, dramatically faster overall,
because you never spend a week bisecting a pile of simultaneous changes.

Never let a verification step be optional "if we're in a hurry." Hurry is precisely
when drift gets in.

### 5.5 Close the loop with positive confirmation
Never let *silence* count as done. Require a signal that says **yes, this is now true**:
a stamped receipt, a confirmation number, a screenshot, a reply, an entry you can see
with your own eyes. If you cannot produce that artifact, the item is **not done** — it
is *submitted*, which is a different state, and should be written down as a different
state.

### 5.6 Date everything, and distrust the undated
An undated record cannot be evaluated. It is not a fact, it is a *fossil* — evidence
that someone once believed something. Every entry gets a date and, where it matters,
a source: **who** said it, **when**, and **how they knew.**

---

## 6. The roadmap — repairing a system that has already drifted

Use in order. Skipping ahead is how repairs create new drift.

### Phase 0 — Stop the bleeding
Don't fix anything yet. **Stop making new changes** based on the suspect record.
Every action taken while drift is unresolved adds to the pile you'll have to untangle.

### Phase 1 — Find ground truth
Pick the handful of facts everything else depends on — the load-bearing ones. For each,
go to the **enforcing authority's own record** and read it directly. Not your file, not
your notes, not what you were told. Write down what you find, with the date you found it
and how you looked.

This is the whole job. Everything after is bookkeeping.

### Phase 2 — Map the gaps
For each fact, write three columns: **what the record says · what is actually true ·
which way the gap cuts.** That third column matters. Some gaps are harmless. Some are
quietly costing you every day. Some are the only reason a decision went the way it did.
Rank by consequence, not by how annoying they are.

### Phase 3 — Correct the authoritative copy first
Fix the version that *governs*, not the convenient one. A corrected personal file next
to an uncorrected official one has changed nothing — it has only given you false
confidence, which is worse than knowing you're exposed.

Then propagate outward to copies, and **retire the copies you don't need.** Every
surviving duplicate is a future contradiction.

### Phase 4 — Kill the ambiguity that let it in
Repairing the facts without repairing the structure buys you months, not a solution.
Ask: *why was there room for these to disagree?* Usually it's one of:

- two places to look and no rule about which wins → **name the winner**
- a step that could half-complete → **bind the halves together, or add a check that
  catches the half-done state**
- plans stored alongside facts → **separate them**
- no confirmation required → **require the artifact**

### Phase 5 — Make the truth cheaper to check than to assume
This is the only durable fix. Drift wins when verifying is expensive and assuming is
free. Flip that: keep the authoritative record where you can reach it in seconds, write
the check-step into the routine so skipping it takes effort, and prefer **one place that
is occasionally inconvenient** over three places that are always convenient.

---

## 7. Early warning signs

You are probably drifting *right now* if any of these are true:

- You cannot say, in one sentence, **which copy is the real one.**
- Your confidence that something is done comes from **remembering doing it.**
- Two documents disagree and you've been **working around it** rather than resolving it.
- The most-cited document is **the oldest one.**
- A key record has **no date**, or the date is old and nobody has noticed.
- Someone new re-derived a conclusion **from scratch** — a sign the record didn't carry.
- You've said **"but I already handled that"** more than once about the same item.
- The only proof that something went through is that **nothing came back.**

---

## 8. The one line to keep

> **Drift is not caused by carelessness. It's caused by acting on a copy.**

Careful people drift constantly, because carefulness applies to the *action* — and the
defect is upstream, in the record the action was based on. The discipline that stops
drift isn't trying harder. It's the small, unglamorous habit of **going back to the
source before you act, and writing down what you actually saw.**

---

*This is a framework for thinking about records and verification. It is not legal
advice, and it doesn't substitute for a professional who can look at the specifics of
your situation. What it can do is help you arrive with the right questions, an accurate
picture of where the gaps are, and dated notes on how you know.*
