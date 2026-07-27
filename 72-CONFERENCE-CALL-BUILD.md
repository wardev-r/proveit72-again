# Build spec — the Front Desk call flow (a per-member choice)

**Status:** ✅ BUILT (2026-07-25), inert until switched on. Per-member option, NOT a rip-and-
replace — both flows stay live; each member picks how their line works. Default is the proven
`code` flow, so nothing changes for anyone until a member sets `callMode='frontdesk'` AND the
Twilio secrets exist. Still needs ONE real proof call before offering the toggle to members.

### What shipped
- **Worker:** `POST /call/start`, `/twiml/{lobby,frontdesk,accept,decline}`, `/call/member-status`,
  `/call/caller-status`, `endCallerLobby` — reuse `captureSessionByRoom`/`voidSessionByRoom`.
  `handleCallCheckout` branches on `callMode`; `call-info` returns it; `/creator/{id}` PUT accepts it.
- **Frontend:** `frontdesk.html` (we-call-you success page, retries `/call/start` until authorized,
  polls to approved/void with agANT voice); `call-first.html` collects the caller's number for
  front-desk members; dashboard has a Code ⟷ Front desk toggle.

### To switch on (owner)
1. Set Worker secrets: `wrangler secret put TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
   (never in the repo). `PLATFORM_API` should point at `https://api.velvetrope2you.com`.
2. In the dashboard, flip a test member to **Front desk**.
3. Proof call: pay $10 → your phone rings → press 1 → connected → $7.20 captured. Second run:
   don't press 1 → $0 (voided), caller hears "not charged". Then offer the toggle to members.

## The choice (per member, set in the dashboard)
Each member picks their **call mode** on their record — default stays the proven one:
- **`code`** — *Dial-in.* Caller pays, gets a 6-digit code, calls the number, enters it.
  (Today's live, proven flow. The safe default.)
- **`frontdesk`** — *We call you.* Caller pays, we ring the caller AND the member, park the
  caller muted in a lobby, the member screens & accepts, we unmute. No code. (This spec.)

One field on the creator record: `callMode: 'code' | 'frontdesk'` (default `'code'`). A toggle
in `72-app-dashboard.html`. Routing branches on it — nothing else about the member changes.

## Why offer Front Desk
The code exists only because an *inbound* call has to be matched to a payment. In Front Desk
the caller pays and **WE place the call** — the Worker already knows the paid session, so
there's nothing to verify, no code. Cleaner for the caller, screening built in for the member,
and the whole call state lands **in our hands.** Some members will want the friction-free
"we call you"; others will prefer the simple dial-in. Let them choose.

## The flow (hotel front desk — no code, ever)
1. **Caller pays** on the web. Stripe authorizes the hold (existing money engine, untouched).
   We collect the **caller's phone number** at checkout — the one new input. Their $10 → 72%
   ($7.20) to the member is unchanged.
2. **Worker → Twilio REST API** rings the **caller first**. TwiML drops them into a
   `<Conference>` named after the session — **muted, hold music** ("One moment… the line's
   this way."). They're in the lobby.
3. **Worker dials the member** into the same conference. Member's leg: *"72 call for you.
   Press 1 to open the rope."* `<Gather numDigits=1>` — the screen. This IS the velvet rope.
4. **Member presses 1 → joins conference → Worker unmutes the caller** (POST participant,
   `muted=false`). They talk. (Decline / no-answer / timeout → nobody joins.)
5. **Conference status callbacks** (`participant-join` for both legs) → Worker **captures**
   the $10. Decline / no-answer → **void.** Exact duration comes from conference events →
   feeds the API `interaction.duration`.

## Endpoints / pieces (all on the existing Worker)
- `POST /call/start` (after Stripe success) — reads session, calls Twilio `Calls` API twice:
  caller leg (→ `/twiml/lobby?room=`) then member leg (→ `/twiml/frontdesk?room=`).
- `GET/POST /twiml/lobby?room=` — `<Dial><Conference muted=true startConferenceOnEnter=false
  waitUrl=hold>ROOM</Conference></Dial>`.
- `POST /twiml/frontdesk?room=` — `<Gather numDigits=1 action=/twiml/accept?room=>
  <Say>72 call for you. Press 1 to open the rope.</Say></Gather>` (no input → hang up → void).
- `POST /twiml/accept?room=` — Digit 1 → `<Dial><Conference startConferenceOnEnter=true
  endConferenceOnExit=true>ROOM</Conference></Dial>`; then unmute the caller participant.
- `POST /conf/status?room=` — conference `statusCallbackEvent="start end join leave"`:
  both-in → `captureSessionByRoom`; decline/leave-before-join / timeout → `voidSessionByRoom`.
  (Reuses the existing capture/void helpers — money logic unchanged.)

## What changes
- **Twilio cost:** we now pay **two outbound legs + conference** instead of the caller's
  inbound minutes. Pennies/min against a $10 call, absorbed by the platform's 28%. **72%
  untouched.**
- **New input:** caller's phone number on `call-first.html` checkout.
- **New secret:** `TWILIO_AUTH_TOKEN` (+ Account SID) as Worker secrets so the Worker can
  *originate* calls. `wrangler secret put` — NEVER in the repo (same rule as the Stripe key).

## v1 vs later
- **v1 = ring the caller's phone** (chosen — no WebRTC, any device, "we call you" is premium).
- **v2 = browser mic** via Twilio Voice JS SDK (never ask for a number). More build; later.

## Rollout (money-safe, both flows coexist)
1. Build the conference path on new routes — the live PIN flow keeps running untouched.
2. Add `callMode` to the creator record + a dashboard toggle (default `'code'`).
3. `call-first` checkout success routes on `callMode`: `'code'` → today's code page;
   `'frontdesk'` → `/call/start` (rings caller + member, conference, capture on both-in).
4. One real proof call in `frontdesk` mode (accept → captured $7.20; decline → $0 voided),
   both sides witnessed — before any member is offered the toggle.
5. Both modes live side by side, forever if we want. Neither is thrown away.

## Ties into the 72 API (Gia's spec)
This flow *is* `POST /v1/interaction` under the hood: identity (member) + skin (number) →
routed call → captured → `interaction_id`, `duration`, `status`, `minted:true`. Building the
front desk builds the API's core interaction primitive. One engine, both faces.
