# 72 — Lexicon (defined terms)

**The vocabulary packet. This is the authoritative meaning of every term 72 uses in a
document, a contract, a policy, or a dispute.**

Undefined words are drift's easiest entry point: two parties use the same term, mean
different things, and neither notices until the disagreement is expensive. A lexicon
closes that gap *before* it opens. Where any other 72 document uses a term listed here,
**this file governs** — every other use is a copy.

- **Status:** working draft for legal drafting. Not itself a contract.
- **Last reviewed:** 2026-07-31
- **How to use in drafting:** paste this alongside `legal-drafting-brief.md`. Capitalized
  terms in agreements should match these definitions verbatim, or the agreement should
  say explicitly where it departs and why.

---

## A note on why capitalization matters
In an agreement, a **Capitalized Term** signals "this word has a defined meaning, look
it up." A lowercase word means its ordinary English sense. Mixing the two is how a
contract ends up with two meanings for "call." Keep the discipline: if it's defined
here, capitalize it there.

---

## 1. The parties

**Platform** · 72, operating at velvetrope2you.com. The intermediary that provides the
Line, processes payment, and takes the Platform Fee. **The Platform is not a party to
the Conversation** and does not provide, supervise, or warrant the service a Member
delivers. *Do not use:* "the company," "we" (in operative clauses), "the app."

**Member** · A person who holds a 72 account and can receive paid contact. Sets the
Rate, controls availability, receives the Member Share. *Also acceptable in
marketing:* creator, host. *Do not use in legal text:* "seller," "provider," or
"employee" — each implies a relationship 72 does not have.

**Caller** · A person who pays to reach a Member. *Do not use:* "customer" (ambiguous —
Members are customers of the Platform too), "user" (covers both parties, so it defines
nothing).

**Visitor** · Anyone using the site who is neither a Member nor a Caller. Matters for
privacy terms, where obligations differ by role.

---

## 2. The thing being sold

**Line** · The Member's 72 phone number and the access channel attached to it. What a
Member holds; what a Caller reaches. A Line is **provisioned to** a Member — it is not
sold, and under current terms it is not the Member's property. *This is the term most
likely to drift, because the long-term product vision treats a number as owned property
(see* `VISION-LONGARC.md`*). Until that ships, agreements must not imply ownership.*

**Rate** · The price a Member sets to be reached. Per Connection, not per minute, unless
a document says otherwise in the same sentence. *Do not use:* "fee" (reserved for the
Platform Fee), "toll" (fine in marketing, undefined in law).

**Proof Call** · The fixed-price first Connection between a given Caller and a given
Member. A marketing name for a specific priced event — define the amount in the
document; don't rely on the name to carry it.

**Conversation** · The actual exchange between Member and Caller. **The Platform does
not supply, monitor, or warrant the Conversation.** The distinction between the
Conversation (theirs) and the Connection (the Platform's) is load-bearing for
liability — keep them separate words.

---

## 3. The money — the sequence, in order

These four terms describe one payment's lifecycle. Using them out of order, or
interchangeably, is the single most likely source of a payment dispute.

**Authorization** · The Caller's card is checked and the amount is **held, not
charged.** No money has moved. A held amount may appear as "pending" on a Caller's
statement — say so in consumer-facing text, because it looks like a charge and isn't.

**Connection** · The Member accepts and both parties are actually joined. **This is the
event that earns the money.** Everything in the payment model keys off it.

**Capture** · The held amount is taken, following a Connection. This is when a charge
exists.

**Void** · The hold is released without a charge, because no Connection occurred.
*Do not use:* "refund." A Void is not a refund — nothing was charged, so nothing is
returned. Calling it a refund invites a dispute over a transaction that never happened,
and misstates the mechanism to a card network.

> **The rule this vocabulary encodes:** no Connection, no Capture. Money moves only when
> the thing paid for actually happened.

**Refund** · Reserved strictly for reversing a completed Capture. Rare by design. If a
document uses "refund" where it means Void, the document is wrong.

---

## 4. The split

**Gross Amount** · What the Caller pays, before anything is deducted.

**Processing Costs** · Third-party payment fees (Stripe). Taken **off the top** — from
the Gross Amount, before the split — so no party's stated percentage is silently
reduced. Any document stating percentages must also state this, or the percentages are
misleading.

**Member Share** · **72%** of the Gross Amount. The defining number of the product.
Inviolable: promotions, discounts, and platform giveaways come out of the Platform
Fee, never out of the Member Share.

**Platform Fee** · **28%** of the Gross Amount. What the Platform retains for payment
processing, the Line, the room, and support.

**Fund Share** · On a designated cause campaign only, a portion **carved out of the
Platform Fee** and directed to a named beneficiary. It reduces what the Platform keeps;
it never touches the Member Share. Any document naming a beneficiary must name the
actual organization and how funds reach it.

**Payout** · Transfer of the Member Share to the Member, on the stated schedule
(weekly), via the payment processor. *Do not use:* "instant" unless it is.

---

## 5. Campaigns and access

**Drop** · A time-bounded campaign in which a Member sells access at a fixed price to
many Callers at once.

**VIP Access** · The guaranteed digital good a Drop delivers — entry to gated content.
**Guaranteed** is operative: every payer receives it. This is what makes a Drop a
promotion rather than a game of chance.

**Access Code** · The unique credential delivered on payment that unlocks VIP Access.
Proof of purchase; treat as a bearer credential.

**Incidental Benefit** · Anything a payer *might* additionally receive — a live call,
a prize draw. Must never be the primary thing purchased. *Legal significance: because
the Gross Amount buys VIP Access outright, an Incidental Benefit rides on top of a
completed sale. Structuring it the other way — paying for a chance — creates a
regulated lottery. Any document describing a Drop must make the guaranteed good
unmistakably primary.*

---

## 6. Terms from the long-arc vision — **not yet operative**

These describe the intended future product. **Do not use them in a binding document
until the corresponding capability actually exists**, because each one implies rights a
Member does not currently have. Listed here so their meaning is fixed in advance rather
than improvised later.

**Core Number** · A permanent number an account holder would own, as distinct from a
provisioned Line.

**Skin** · A context-specific alias layered over a Core Number (work, business,
personal), separately revocable.

**Deed** · The title to a Core Number and its Skins — the instrument that would make a
number ownable, transferable, and inheritable.

> **Standing rule:** if a term appears in this section, marketing may describe it as a
> plan. Agreements may not grant it.

---

## 7. Words 72 does not use

| Avoid | Why | Use instead |
|---|---|---|
| "commodity" (for a Member's time) | means cheap and interchangeable — the opposite of the claim | "your time" |
| "subscription" (for a paid call) | implies recurring billing; a call is a single event | "per-Connection" |
| "refund" (for an uncaptured hold) | nothing was charged; misstates the mechanism | "Void" |
| "guaranteed" (for reaching a Member) | Members control availability; nothing guarantees a Connection | "if they accept" |
| "instant" (for Payout) | Payouts are weekly | "weekly" |
| "employee," "contractor," "agent" (for a Member) | implies a relationship 72 does not have | "Member" |
| "escrow," "trust account" | regulated terms with specific legal meaning | "held," "authorized" |
| "lottery," "raffle," "sweepstakes" (casually) | regulated categories; casual use invites the classification | describe the guaranteed good |

---

## 8. Maintaining this file

1. **One meaning per term.** If a term needs two meanings, it needs two terms.
2. **Date every change** and note who made it. An undated definition can't be relied on.
3. **When product reality changes, this file changes first** — then the documents that
   cite it. Updating an agreement without updating the lexicon recreates the drift this
   file exists to prevent.
4. **Section 6 is a holding pen.** Terms graduate out of it only when the capability
   ships — and graduating a term is a deliberate, dated decision, not a side effect of
   someone reusing the word.
