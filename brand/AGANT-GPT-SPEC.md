# The agANT — GPT image spec (anti-drift sheet)

**Paste "THE LOCK" into GPT once per session, then paste ONE pose prompt at a time.**
Never describe the character from memory — memory is where drift comes from. The lock
below is copied from the approved renders; it is the character.

---

## THE LOCK — paste this first, every time

> You are generating poses for an established mascot. The character is FIXED. Do not
> reinterpret, restyle, redesign, or "improve" him. Match these traits exactly in every
> image.
>
> **THE 72 agANT — character lock**
> - A stylized cartoon **ant** (not a human, not a bee) standing upright, 3D-rendered,
>   glossy, Pixar-style, friendly and confident.
> - **Body/skin:** warm **gold-bronze** metallic-matte. Rounded head, big expressive
>   eyes, small friendly smile, subtle brow.
> - **Two antennae** curving up from under the cap — bronze, bent, with rounded tips.
> - **Abdomen:** a **segmented gold sphere** at the rear, panel lines visible.
> - **Legs:** thin bronze jointed insect legs — he wears shoes on the front pair.
> - **Wardrobe (never changes):**
>   - Black **tuxedo jacket**, white dress shirt, **gold bow tie**.
>   - Small **gold "72"** on the left lapel/chest.
>   - **Black baseball cap worn BACKWARD**, with a **gold "72"** on the band at the front.
>   - **Black wayfarer sunglasses.**
>   - **Black Chuck Taylor high-top sneakers** — white rubber toe caps, white soles,
>     white laces, and a small **gold "72"** on the outer side.
> - **Mood:** the welcoming bouncer. Confident, warm, in charge. Never menacing, never
>   cutesy, never a "worker ant."
>
> **RENDER RULES (critical — the images get cut out programmatically):**
> - **Pure white background. Nothing else in frame** except what the pose names.
> - **NO text, NO captions, NO numbers, NO labels, NO watermark, NO borders, NO panels.**
> - **One character, one pose, full body, centered**, with clear space around him.
> - Soft studio lighting, subtle contact shadow directly under him only.
> - Square or 4:3 framing unless the pose says wide.
>
> Confirm you've locked the character, then wait for the pose.

---

## POSE PROMPTS — paste ONE at a time, after the lock

Each line already assumes the lock. Keep the file name given in **bold** — it maps
straight onto the site.

**`gate.png`** — *"You've got 72." Greeting / verifying a caller.*
> Pose: standing square to camera, one hand raised in a friendly "hold up" / greeting
> gesture at chest height, other hand relaxed at his side. Chin slightly up, welcoming
> but checking you out. Full body, centered, pure white background, no text.

**`onit.png`** — *"One moment…" Loading / processing.*
> Pose: one finger raised ("just a sec"), head tilted slightly, patient half-smile, other
> hand on hip. Full body, centered, pure white background, no text.

**`closed.png`** — *"Rope's closed." Member offline.*
> Pose: standing with arms crossed, giving a small apologetic shrug, one shoulder lifted,
> mouth in a flat "sorry, not tonight" line. Calm, not hostile. Full body, centered, pure
> white background, no text.

**`phonebill.png`** — *"…did you pay your phone bill?" Call didn't connect.*
> Pose: holding an old-style telephone handset away from his ear, looking at it sideways
> with a skeptical raised brow and a smirk. Playful, teasing. Full body, centered, pure
> white background, no text.

**`splat.png`** — *The time-waster gets tossed.*
> Pose: mid-motion tossing something small out of frame with one arm, weight shifted, a
> satisfied "and stay out" expression. He is throwing OUT, not hitting anyone. Nothing
> else in frame. Full body, centered, pure white background, no text.

**`zen.png`** — *Stay zen. Waiting / empty states.*
> Pose: seated cross-legged, floating slightly, hands resting on knees in a calm
> meditation pose, serene closed-mouth smile. Full body, centered, pure white background,
> no text.

**`vibe.png`** — *The Look. 404 / "you sure about that?"*
> Pose: head tilted down, looking over the top of his sunglasses at the viewer with one
> eyebrow up, arms crossed. Deadpan, skeptical, funny. Full body, centered, pure white
> background, no text.

### Already have these — only redo if you want a cleaner cut
`boss` (arms crossed, on duty) · `welcome` (hand on stanchion, other arm open, rope
unhooked — **wide/landscape, this one is the hero**) · `call` (phone to ear) ·
`approved` (fist up, payment landed) · `backend` (at the desk with headset) ·
`seeya` (waving goodbye) · `coin` (holding the 72% money bag) ·
`director` (megaphone, share & grow)

---

## WHAT TO DO WITH THE FILES
1. Save each as its **exact file name** above (`gate.png`, `onit.png`, …).
2. Upload them to the repo: branch `claude/twilio-emergence-4qbonn` → `brand/agant/source/`
3. Say "they're up." They get cut transparent, trimmed, and wired into the site — the
   pose keys are already live in `agant.js` across 7 pages.

## WHY THIS FILE EXISTS
The character drifts every time someone describes him from memory. This sheet is the
memory. Anyone regenerating a pose pastes THE LOCK verbatim first — no exceptions, no
paraphrasing, no "he's basically a…". If a render comes back off-model, don't accept it
and don't patch it in prompt-speak: re-paste the lock and try the pose again.
