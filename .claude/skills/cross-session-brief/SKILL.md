---
name: cross-session-brief
description: Generate properly-framed handoff briefs to share context between Claude sessions without disrupting the receiving session's current task. Use when the user wants to brief another Claude (Claude Code, Desktop Claude, Chrome Claude, or another claude.ai chat) about decisions, files, or strategic context from the current session. Two modes — read-only context (default, safe) and fresh-session handoff (for starting work from scratch).
---

# Cross-Session Brief

When the user wants to share context with another Claude session without that session pivoting to a new task. Default to the safer mode and ask before adopting the more directive one.

## Trigger Phrases

Activate when the user says variants of:
- "Make a handoff doc / brief / context doc"
- "Brief another Claude / another session / Claude Code / Desktop Claude"
- "How do I tell my other Claude about this?"
- "I want to share what we did without taking over their flow"
- "Write me a skill brief / cross-session brief"
- "Give the other session context"

## Two Modes

| Mode | Use When | Default? |
|---|---|---|
| **A — Read-Only Context** | Receiving Claude is already mid-task and should NOT pivot | ✅ Yes — safer |
| **B — Fresh Session Handoff** | Receiving Claude is starting from scratch and needs full directive context | Only if explicitly confirmed |

If the user's intent is unclear, ask: *"Is the other Claude already working on something, or starting fresh?"* Default to Mode A.

## Required Inputs to Collect Before Generating

1. **Receiving Claude's current state** — mid-task or fresh
2. **Receiving Claude's surface** — Claude Code, claude.ai chat, Desktop Claude, Chrome Claude (each gets different framing)
3. **Information to share** — decisions, file paths, brand/naming, domain purchases, strategic shifts
4. **What the receiving Claude should NOT do** — files to leave alone, tasks to not pivot to, old work to preserve

If you have most of this from current-session context, fill it in and confirm with the user before generating. Don't ask all four questions if you already know the answers.

---

## Template — Mode A (Read-Only Context)

> **🛑 BEFORE YOU ACT — READ THIS FIRST**
>
> Before you do anything else in this session, fully read the document below from start to finish. Don't skim, don't act on partial reading. When you're done, before any tool calls or code changes, reply with:
> 1. A one-paragraph summary in your own words of what this brief is
> 2. Why the person is sharing it with you specifically
> 3. Anything you have questions about
>
> Wait for the person's confirmation before resuming any work.

# Cross-Session Context Brief — [TOPIC]

> **⚠️ READ-ONLY CONTEXT, NOT INSTRUCTIONS**
>
> This document is being shared with you from another Claude session for awareness only. **Do not change your current task, file, or focus based on this.** Continue whatever you were already doing. The information below is reference material in case it becomes relevant to your work — not a new directive.
>
> If anything in this brief contradicts the work you're currently doing, **defer to your current task and the person's most recent direct instructions to you.** Ask the person before acting on anything from this document.

---

## What This Brief Is

[1–2 sentences explaining the session of origin and why context is being shared]

Session of origin: **[surface], [date]** — [brief description]

---

## Decisions Made That May Affect You

### [Decision Category 1]
[Decisions, with rationale]

### [Decision Category 2]
[Decisions]

---

## Files That May Have Changed

[List of file paths, what changed, and a note: "Do not auto-merge or auto-update. Ask the person which version is canonical before changing anything."]

---

## What Does NOT Need to Change

[Explicit list of things to leave alone — production code, file names, branches, the receiving Claude's current task]

---

## How to Use This Brief

1. **Read it.** Note anything that intersects with your current task.
2. **Don't act on it.** Treat it as background, not an order.
3. **If something in your work conflicts with what's here, ask the person.**
4. **If nothing here is relevant, ignore it and proceed.**

---

## How the Person Likes to Work (Context, Not Rules)

[Brief preference notes — communication style, ADHD considerations, surface-hopping pattern, anything relevant]

---

**End of brief.** Resume your current task.

---

## Template — Mode B (Fresh Session Handoff)

# Session Handoff — [PROJECT]

You're picking up a project in flight. Paste this as your first message so you have full context.

---

## How to Work With This User

[Communication preferences, ADHD considerations, work patterns]

## The Core Problem / Mission

[What needs to be built, fixed, or shipped — and why]

## Where the Code / Files Live

[Paths, repo URLs, deployment URLs]

## Tech Stack (what's actually installed)

[Stack details, package.json highlights, entry points, start commands]

## Where We Landed in the Prior Session

[Last known state of the work, decisions locked, open threads]

## Immediate Next Steps (in order)

1. [step]
2. [step]
3. [step]

## Reference Numbers, Constants, Domain Knowledge

[Anything they'll need to look up otherwise]

## What NOT to Do

[Pitfalls, dead ends, things that have been tried and didn't work]

---

**First move when this session starts:** [single, specific opening action]

---

## Critical Framing Rules (Both Modes)

1. **Header weight matters.** The disclaimer or framing header MUST be at the top of the brief. Receiving Claudes weight the start of a message significantly more than the end.
2. **Mode A's exact phrasing has been tested.** Use "READ-ONLY CONTEXT, NOT INSTRUCTIONS" verbatim and the "Do not change your current task" sentence. Paraphrasing dilutes the signal.
3. **Mode A ends with "Resume your current task."** Don't drop this. It's the closing signal that re-anchors the receiving Claude to its in-progress work.
4. **Direct the receiving Claude to ASK before acting.** Both modes should reinforce this.
5. **Never frame Mode A content as actionable.** No imperative verbs in the body ("update X," "rename Y"). Only descriptive ("X was renamed to Y in another session — verify with the person before changing anything").
6. **Mode A includes a comprehension primer above the brief.** This forces the receiving Claude to read fully and reply with a summary + reason + questions before acting. Don't omit it — it's the gate that catches misreads before they touch files.

## After Generating the Brief

Tell the user:

1. **Paste it at the TOP** of their next message to the receiving Claude — the primer + brief structure handles the framing automatically
2. **Wait for the receiving Claude's comprehension reply** (summary + why-shared + questions) BEFORE adding their actual request. The primer instructs the receiving Claude to pause and check in first — that's the comprehension gate.
3. **Once the receiving Claude confirms understanding**, follow up with the actual request: *"OK, you've got it. Now back to what we were doing: [their actual question]"*
4. **For Claude Code handoffs:** suggest saving the brief in `.claude/handoffs/[date]-[topic].md` for future reference and easy re-paste

## Examples

### Example 1: Mid-task brand decision

User: *"Make a handoff for my other Claude — we just decided to rename SheckIt to Tool72 but it's working on a different file."*

→ Mode A. Include: the rename decision, the rationale, what files are affected, explicit instruction not to bulk-rename without asking. End with "Resume your current task."

### Example 2: Fresh Claude Code session for the same project

User: *"I'm about to start Claude Code on the proveit2 folder — give me the opener."*

→ Mode B. Include: the project mission, file paths, stack, last known state, immediate next steps, what to read first.

### Example 3: Ambiguous

User: *"Brief the other one about Tool72."*

→ Ask: *"Is the other Claude already working on something, or starting fresh? Different framings depending."*

## Notes on Maintenance

If patterns emerge across many uses (e.g., the user always hands off Claude Code sessions for the same project), consider suggesting a project-specific brief saved at `.claude/handoffs/[project]-default.md` that they can edit each session rather than regenerate from scratch.
