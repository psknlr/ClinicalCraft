# The care team · 手术团队

How the staff of a room work **on their own**, as a team, in in-world mode: nobody tells them each step. A case
with a `team` names the room, the members and their duties. In the case's team phases, each member:

- decides what to do next from **their own view**: what their body perceives, what was said to them, and the tasks
  they carry;
- talks to colleagues with **check-back**: a request, a read-back, then a confirmation;
- acts with their **own body** through the world's action bus;
- **verifies** results with their own eyes.

Authored **team scenarios** set up initial conditions (a need, a colleague on a break, an instrument somewhere else,
a swab out of sight) and never the steps.

This is the contract (code: `packages/agent/src/session/team/`, `packages/core/src/schema/team.ts`,
`packages/core/src/engine/team.ts`, `packages/world/src/conceal.ts`, `packages/bench/src/team/`,
`packages/web/src/ui/panels/team.ts`; the count record: `packages/core/src/engine/count.ts`,
`packages/agent/src/session/count.ts`). If code and this page disagree, fix one of them in the same change.

Learner-facing words follow [GLOSSARY.md](GLOSSARY.md): the care team (手术团队), circulating nurse (巡回护士), scrub
nurse (洗手护士), surgeon (术者), first and second assistant (第一助手、第二助手), controls (分工权限), your place in the
team (你担任的岗位), stand-in surgeon (主刀同事), line-up (团队配置), read-back (复述确认), count (清点), count
discrepancy (清点不符), hold on closure (暂停关闭), unsafe progression (不安全推进), observer mode (观察模式).

## 1. What a case declares

```jsonc
"team": {
  "room": "or-7",                        // the room the team works in
  "phases": ["operation"],               // the case phases in which it works on its own
  "waitRounds": 3,                       // rounds a member waits for an answer before rerouting or escalating
  "members": [
    { "staff": "or-7.circulating-nurse", "duties": ["circulate"] },
    { "staff": "or-7.scrub-nurse", "duties": ["instruments", "count"] },
    { "staff": "or-7.anaesthetist", "duties": ["anaesthesia"] },
    { "staff": "surgeon", "duties": ["surgeon"] }      // the learner (or the simulated surgeon, observer mode)
  ],
  "cover": [                             // optional: who takes over a member's duty when they must leave (§5)
    { "staff": "l1-anaesthetist", "duties": ["anaesthesia"] }
  ],
  "count": {                             // optional: the count the team keeps, item by item (§4.3)
    "item": "sc-gauze-swab", "name": { "zh-CN": "纱布", "en": "swabs" },
    "when": { "procedure": { "specimen": "extracted" } },
    "searchPlaces": ["or-7.mayo", "or-7.back-table", "or-7.lap-tower"],
    "closure": "record"                  // closure on an open count: "record" (an unsafe progression) or "refuse"
  },
  "scenarios": [ … ]                     // §6
}
```

Duties:
- `circulate`: the circulating nurse. She notices needs, chooses whom to ask, verifies and escalates; she also
  searches the room when the count is short.
- `instruments`: the scrub nurse. She locates, carries and hands over instruments.
- `count`: the member who counts.
- `surgeon`: the surgeon.
- `anaesthesia`: the room's anaesthetist. No team policy acts on it; asked to leave the room while the patient is
  under anaesthesia, they hand over first (§5, "leaving an anaesthetised patient").
- `assist`: an assistant at the table with the surgeon, a first or a second assistant; their controls say for what. No
  team policy acts on it yet.

### Positions and controls

A member's **position** (docs/CHARACTERS.md §2) is their own `position` when the team gives one — needed when two
members share a duty, as a first and a second assistant both `assist` — else it follows from their duties, read by
priority, never by their order: `surgeon`, `anaesthesia`, `instruments`, `assist`, `circulate`, `count` (so
`[count, instruments]` is a scrub nurse). `assistant-surgeon`, the first assistant's old name, counts as
`first-assistant` wherever controls, places or sterility are decided (`canonicalPosition`).

A **control** is a named permission to work one part of an operation (`SurgicalControlSchema`, named by
`CONTROL_TITLES`): `operate`, `camera`, `retract` (traction), `suction`, `close`, `instruments` (the instrument table),
`count`, `equipment`, `anaesthesia`. The first six are worked at the sterile field and go to scrubbed positions only
(`STERILE_POSITIONS`: the surgeon, both assistants, the scrub nurse), `equipment` and `anaesthesia` to the others, and
`count` is held on both sides. Who works at a given moment is decided by holding — a port's holder in the field, a
carried item's holder in the world — never by the control alone.

| position | default controls (`DEFAULT_CONTROLS`) |
|---|---|
| surgeon | operate, camera, retract, suction, close |
| first assistant (and the assistant surgeon) | retract, suction — and camera while no second assistant is present |
| second assistant | camera, retract, suction |
| scrub nurse | instruments, count |
| circulating nurse | count, equipment |
| anaesthetist | anaesthesia |
| every other position | none |

The surgeon's controls cover every assistant's work, so no reference path depends on an assistant. A member's own
`controls` replace their position's defaults and the camera rule (a scrub nurse who also holds the camera:
`["instruments", "count", "camera"]`; a team whose surgeon keeps the camera gives the first assistant
`["retract", "suction"]`). The **team as it is** in an encounter (`effectiveTeam`) is the base members, the chosen
line-up's assistants and the chosen team scenario's relief colleagues, less whoever that scenario makes absent: who is
present decides who holds the camera, never the learner's place.

```jsonc
"members": [
  …,
  { "staff": "or-1.assistant", "duties": ["assist"] },                         // the first assistant (illustrative ids)
  { "staff": "surgeon", "duties": ["surgeon"], "standIn": "or-1.surgeon" }     // the operator while the learner holds a place
],
"lineups": [{                            // optional: assistants added for one encounter (`start {lineup}`)
  "id": "three-surgeons", "name": { … }, "provenance": "authored",
  "members": [{ "staff": "or-1.second", "duties": ["assist"], "position": "second-assistant" }]
}]
```

The resolvers (core `engine/seats.ts`) read only the case and the start's choices — the facility only for a staff
member outside the team: `memberPosition`, `staffPosition` (for role cards and dress: the team's position, the
facility's, the duties, the facility role's default), `memberControls`, `fieldControls` (the operative field: whoever
operates is unrestricted, a member holds their controls, a colleague outside the team traction and suction),
`bodyControls` (a body, in the field or in the world), `seatsOf`, `canJoinTeam`, `seatMember`, `operatorOf`,
`standingBy`, `memberBody` and `refOfBody`. `refOfBody` is closed: a call with no body is the learner's body; it answers
the operator (no actor) for the learner's body while the learner operates and for the stand-in's while the learner
holds a place, a staff id for the learner's body in a place (that place's member) and for any other staff body, and
nothing (`null`, to be refused) for the colleague standing by and for any other body. **The operative field enforces
the controls** (docs/PROCEDURE.md §3: `seatCheck` — a colleague's step needs the control it is worked with, and taking
an instrument its control; `passingRequired` — passes in the scrub nurse's place; the stand-in normalised to the
operator, `normaliseStep`); the world's operations, the scope of practice, delegation and the policies below do not
read them yet.

### Places

The learner chooses a **place** once, at `start {seat, lineup}`, recorded with the variant and the team scenario:
- `surgeon` — the operating surgeon: the learner as always, who may also do the team's parts. It is the default and is
  recorded as no place (`SessionState.seat` absent), with a team or without.
- `first-assistant`, `second-assistant`, `scrub-nurse` — a place in the team. It is offered (`seatsOf`) when the team's
  surgeon member names a stand-in (`standIn`: the colleague who is the operator meanwhile), the case can be joined
  (`canJoinTeam`: it carries its reference solution, or starts in one of the team's phases) and the team, with the
  chosen line-up, has a member in that place who is present — a team scenario that makes them absent refuses it —,
  with the base anatomical variant only. A place is a base member's or a line-up assistant's, never a relief
  colleague's. A case served without its reference solution (the content API's `publicCase` / `learnerCase`, what the
  browser loads under `serve`) offers the operating surgeon's place only, and its start refuses another.
- A place is taken at the start of an **untouched encounter**: nothing accepted before the start — not a phase
  switched to, a note or a flag —, else the start is refused, because the join follows the reference path from its
  beginning.
- A start in a place **joins at the team's phase**: within the start, the case's reference path after its own start is
  applied, each action by the system, until the case is in one of the team's phases (never a finish or the
  operation's close). It is one recorded action, so a transcript or a save replays it to the same state; what the team
  did is kept in `SessionState.joined`. It counts a sequence number for itself and one for each action it joins
  after, so the records those actions leave keep the operator's order; the start is the last of its numbers
  (`act-<joined.seq>`), and the numbers before it are no action's id (`actionIdsBetween` skips them). A refused step,
  or a path that never reaches the team's phases, refuses the start (`checkTeamDefinition` reports such a case).
- The join is the record's only: the world's own device state machines are not driven by it. A record that says the
  baseline count or the Time Out is done can stand beside a count board still at its first state.
- After the operation closes, the learner in a place may finish; the Sign Out and the later steps are the operator's,
  not the place's.
- A place is assessed on the rubric items whose `seats` list it (an item without `seats` is the operating surgeon's),
  and what the team did before the learner joined is reported apart, never credited (`AssessmentReport.joined`): the
  history, examination, investigation and decision sections count what was left to do. Safety gates stay the team's
  outcomes.

In the engine the stand-in's steps are the operator's — recorded with no actor (docs/PROCEDURE.md §3) — and an
`operate` with no actor is the operator's step, whoever sends it; nothing drives the stand-in yet, and no session
stamps the learner's place on their steps. So a session refuses a place in the team (`permission_denied`,
docs/PROTOCOL.md) and no front-end offers one; only the engine's own tests take one.

### Checks

`checkTeamDefinition` (part of `checkCaseIntegrity`) checks the team on its own:
- known phases;
- each member listed once; only the member `surgeon` has the duty `surgeon`, and it has it;
- somebody circulates;
- needs are for members (a line-up's assistants and the scenario's relief colleagues too);
- absent members are members (or a line-up's assistants, or relief colleagues), and the surgeon is never absent;
- relief and cover colleagues are not members (and nobody covers the surgeon);
- the solution's `start {team}` names a scenario;
- `expect` matches what is set up;
- `operate` and the position `surgeon` are the surgeon member's alone, and the surgeon's own `controls` keep `operate`;
- the sterile field's controls only on scrubbed positions, `equipment` and `anaesthesia` only on the others;
- one member to each place (first assistant, second assistant, scrub nurse), in the base team, with each line-up and in
  each team scenario (the team as it is: whoever is absent left out, the relief colleagues counted) — a relief
  colleague never doubles a member who is there;
- a stand-in is named on the surgeon member only and is no member, cover, relief colleague or line-up assistant; a team
  with a stand-in works in every phase of the operation;
- line-ups: unique ids, each adding new staff with the duties `["assist"]`, a first or a second assistant;
- with a stand-in, every place the team offers, with each line-up, can be joined along the reference path.

The reference solution is the operating surgeon's: `checkCaseIntegrity` refuses a seat on its start, and a line-up
the team does not have.

`teamFacilityIssues` (run by `cases validate`) checks the team against its facility:
- the room exists;
- the members, the stand-in and the line-ups' assistants are staff of that room;
- the stand-in is a surgeon there: position `surgeon` (their own, a room template's, or what their role gives) and a
  doctor's role (`attending` or `clinician`), since they operate with the surgeon member's controls;
- relief and cover colleagues exist;
- a member's facility position is their position in the team — the card they speak from and the controls they hold
  are one job;
- the needed items and the counted item are handheld types;
- the count's search places and the scenarios' placements exist.

## 2. The scheduler and time

One `TeamScheduler` per session. It is created when the encounter starts, because the team scenario is chosen at
`start`, like a procedure variant, and kept hidden. It works only in the team's phases, with autonomy other than `off`.

**Rounds.** A round wakes the members who have something to do, in a fixed order:
1. those answering an unread message (oldest message first);
2. those with work under way;
3. those noticing something (a need, a count that has fallen due);
4. ties go to the stable staff id.

Each awakened member proposes at most one thing: a message, a world act, or a change to their own tasks. Waits are
counted in rounds, so a colleague who doesn't answer is rerouted or escalated after a bounded wait.

**One step operation.** The browser and a headless run advance the team the same way, through the session's `team`
op ([PROTOCOL.md](PROTOCOL.md)), queued with the learner's own ops:

| autonomy | how the team advances |
|---|---|
| `auto` (default) | after each op of the learner, until a round passes with nothing done; in the browser also one `step` every `TEAM_STEP_MS` (2 s) while the encounter runs — the same clock as the staff's round (`encounterClockRuns`: the learner operating in the surgery window, reading the chart or watching the team does not stop it; the pause menu, settings, help, a reset confirmation or an approval waiting does) — so a learner who only watches, or operates, sees the team work |
| `step` | only on `team step` / `team run` (the "Next step" button; tests; the benchmark) |
| `off` | never |

The world charges simulated time for every walk, search and hand-over, as it does for anyone.

## 3. What is recorded

Everything is plain JSON (`TeamState`), saved as a whole: `TeamCheckpoint`, format `clinicalcraft-team@1`.

- **Messages** have a thread, sender, recipient, kind (`request`, `readback`, `confirm`, `report`, `decline`,
  `escalate`, `notice`), bilingual text, what they are about (item, person, need, a decline's reason code, a count) and
  the evidence relied on. Delivered, read, read back and verified are kept apart.
  - A message is delivered if the recipient is in the room, is a relief colleague (by phone), or is the person an
    escalation is raised to.
  - Each line is heard as that member's own (`agent_message`, speaker = their name).
- **Action receipts** record:
  - the stable action id `team.<task>.<n>`; a retried id returns the recorded result, and a completed id is never run
    again;
  - the actor;
  - the operation, target and recipient;
  - the **true initiator** (the colleague who set the task in motion; the act is done `onBehalfOf` them);
  - the outcome and code, the world version, the minute and the simulated seconds.
- **Tasks**, per member: `supply` (see that someone gets an item), `deliver`, `count`, `check` (a count discrepancy
  seen through), `wound` (the simulated surgeon checks the wound). Each has a status, the round it last changed, the
  colleagues already asked, the act counter, whether the result was verified, and the reason.
- **Claims** map an item to the task carrying it. Two tasks never carry one item: the first claim holds.
- **The count's record** (`CountLedger`): the baseline, when the count fell due, when a hold was asked for, when it
  was settled, the outcome, the holds asked for, and whether closure began on a hold.
- **Observations**, per member, each with an evidence reference.

Saving: `SessionSnapshot.team`, and a `team` transcript item after each change. Restoring:
`SessionOptions.embodied.team`, applied together with the world snapshot it acted in. A restored session resumes
outstanding work, and no completed act runs again (§8, the save/restore test).

## 4. The policies (offline, deterministic)

`policy.ts` is pure: the same view gives the same proposal, so a replay needs no model and a restored session decides
as the original did. **A member uses only what is in their view** (`MemberView`, built by the scheduler):
- items of a type they perceive through their own body (`find` with their awareness), and nothing that is only
  remembered: a remembered item may have moved since;
- whom they can see holding what;
- colleagues' presence and whether each is busy;
- their inbox and their own tasks.

The scenario's hidden set-up reaches a policy only through the world.

### 4.1 Circulating nurse (`circulate`)

1. **Answers first.** A read-back that names the same item for the same person is confirmed (check-back step 3); a
   wrong one is asked again. A decline either reopens the task (another colleague may help) or, when the reason lies
   with the person (`recipient-absent`, `hands-full`), escalates at once, saying why.
2. **A need she notices.** She opens a supply task and acknowledges it aloud to the person ("A needle holder for the
   surgeon — on its way."). She records what that person already holds; those items do not count later.
3. **Asking.** She asks the nearest colleague whose duty it is, if free and in the room, else a relief colleague (by
   phone). A colleague busy in the room is worth waiting for, for a while (`waitRounds × 2`). Nobody left: she
   escalates ("… hasn't arrived — nobody is free to bring it.").
4. **Watching.** No read-back within `waitRounds`: she reroutes. Accepted but nothing has come of it within
   `waitRounds × 4`: she escalates.
5. **Verifying with her own eyes.** A supply task is done only when she **sees** the person holding an item of the
   type that they did not hold before and that no other request was credited with. If the person is in the room but
   out of her sight, she steps to look.

### 4.2 Scrub nurse (`instruments`)

1. A request is **read back** before anything is done ("A needle holder to the surgeon — confirm?"). If she is in the
   room and can see none of that type, she declines at once with the reason (`not-found`).
2. On the confirmation she locates one she can **see** (nearest; never one another task claimed), claims it, and walks
   to it or picks it up. Called in from outside (a relief colleague), she walks to the room first, then looks.
3. **Holding it:** the person must be at the table. If they are not, she waits (`waitRounds`), then declines
   (`recipient-absent`). Otherwise she reaches them (`navigate` follow) and does `hand_over {to}`. A refusal for reach
   sends her where the world points; full hands become a decline (`hands-full`). She then reports ("Needle holder
   passed to the surgeon.").

### 4.3 The count, item by item

The count is **one record per encounter and operating room**, kept by the engine (`SessionState.count`,
`core/src/engine/count.ts`) **by item identity**, never by a bare number. Everyone reads it: the count board and the
RF wand (record-backed boards, [EMBODIED.md](EMBODIED.md) §8.1), the closure (`operate close`), the case's WHO Sign Out
(through `{ "count": … }` conditions), the team, `case_status` and the assessment (`AssessmentReport.count`).

| entry (`count` action) | what it records | who writes it |
|---|---|---|
| `baseline` | the items opened onto the field: the operating room's placements of the counted type, by entity id — taken at the start of an in-world encounter, before a scenario moves anything | the session (`system`) |
| `count {stage}` | the items the team in the room can account for now — lying in the room or in the hands of someone in it, never one concealed — and, against the expected set, what is `missing` and what is `unexpected` (not in the count) | the count board's operations; the member who counts |
| `scan` | what the RF wand finds inside the patient | the RF wand's `scan` |
| `recover` | an item searched out of the patient (the wound), and who took it out | the world (`search` of the patient) |
| `add` / `transfer` | documented additions; documented removals off the field (a swab sent with the specimen; an item not in the count set aside) | a scenario's `transfer`; the circulating nurse |
| `escalate` | a discrepancy raised, to whom, why (credited apart from settling it) | the circulating nurse; the board's escalation |

No caller supplies the ids: the session computes them from the world (`agent/src/session/count.ts`), and a learner's
`clinical_action` of type `count` is refused whatever it claims. **Six of five** (an item not in the count) and
**five of five made up with another room's swab** (one missing, one not in the count) are discrepancies, never
"correct". The status (`countStatus`): `baseline` → `correct`, or `discrepancy` → (`unresolved` once escalated →
`excluded` once a clear scan after the escalation excludes a retained item) → `reconciled` once a clean count
accounts for every item again. A scan that detects an item keeps the count open until it is recovered (or a clear
scan follows). **Closure** while the count is not settled (`correct`, `reconciled`, `excluded`) is refused
(`closure: "refuse"`) or carried out and recorded as an **unsafe progression** (`closure: "record"`, teaching mode):
kept for the debrief, never erased by a later count. A case without a world (text mode) keeps no record and does not
judge closure on it.

When the count's `when` holds (Case 126: the specimen is out), the member who **counts** counts the items the team in
the room can account for and says it ("Count of swabs: 4 of 5.", "Count of swabs: 5 of 5, and 1 not in the count."):
the scheduler records it in the case's count. The circulating nurse then:

| the count | what follows |
|---|---|
| every expected item, nothing else | told to the surgeon ("Count of swabs correct: 5 of 5."), with no hold |
| an item missing, or one not in the count | **the line stops**: she asks the surgeon to *hold closure and check the wound* (a `request` with `hold`). The surgeon reads it back and she confirms (check-back). An item not in the count she takes off the field and documents as set aside. She **searches the room** — she walks to each place in `searchPlaces`, in order, and `search`es within reach. The places are the same whatever happened, so nothing points to where an item is. She stops early once every item is accounted for. She waits a while for the surgeon's wound check, then asks for a **recount** |
| recount reconciled | the surgeon may close ("Recount correct: 5 of 5 swabs — you may close.") |
| recount still not reconciled | **escalated** ("Still 4 of 5 swabs after searching the room — an X-ray before the patient leaves."), never pretended solved; the escalation is the nurse's in the record — and the count stays open until a clear scan excludes a retained swab |

Every member searches with their own body (`search`, [EMBODIED.md](EMBODIED.md) §8.6). A swab in the wound is found
only by a search *of the wound* (the patient), or detected by the RF wand; the search brings it out into the
searcher's hand, recorded as recovered.

### 4.4 The surgeon

- **Learner mode** (default): the learner answers with the `team reply` op or the panel's buttons: Read back, Wound
  checked, Understood. They search with their own world action ("Check the wound", "Search within reach").
- **Observer mode** (`team surgeon simulated`): a simulated surgeon answers instead:
  - reads a hold back;
  - checks the wound (`search` of the patient);
  - takes out what it finds;
  - reports "Wound checked.";
  - acknowledges an escalation.

  The learner watches.

## 5. In the session

| piece | what it is |
|---|---|
| `team` op | `step`, `run {rounds?}` (until settled), `pause` (autonomy `step`), `resume` (`auto`), `surgeon {learner \| simulated}`, `reply {message, kind, text?, item?}`, `need {item, for?}` (the surgeon says what they need; the team takes it from there). A case without a team: `error` `no_team` |
| replies | the learner answers only what was said to them (else `permission_denied`); a read-back about another item than asked (`item`, or named in its words) reads back nothing — the sender asks again |
| one scheduling path | the team takes its turn after every act of the learner (`user_message`, `clinical_action`, `world_action`, `external_tool_call`, `autopilot`) and after every step of the offline autopilot (`AutopilotHost.afterStep`): the browser, the learner, external agents and a headless run drive it the same way, and an autopilot never runs ahead of a team it is waiting for |
| `team_event` | a message, a receipt, a task changed, or the scheduler's status (round, autonomy, surgeon) |
| `ClinicalSession.team()` | the team as it stands (a `TeamCheckpoint`), for front-ends |
| acts | through `EmbodiedSession.act` on a nurse's tool path: the role's authority and scope of practice apply, as for any staff member |
| browser | the HUD's **Team** button (in the team's phases) opens the panel: pace (Auto / Step / Next step), the surgeon (I am the surgeon / Observe), Search within reach / Check the wound, what was said (lines to the learner marked, with their answers), the tasks (with "seen to be done"), the count. The team clock (`TEAM_STEP_MS`) runs while the encounter runs, whichever panel is open, and stops only with the encounter's explicit pause |
| anaesthesia responsibility | continuous (`SessionState.anaesthesia`, core `engine/anaesthesia.ts`): the responsible anaesthetist is the team's `anaesthesia` member until a hand-over moves it. While the patient is under anaesthesia (`patient.nonVerbalWhen`) the responsible anaesthetist never leaves the patient's room by **any** path — a walk, a request to fetch, a delegated task, the team's own move, a learner's world action on their body: every one goes through `EmbodiedSession.act`, which refuses a movement whose destination is outside the patient's room (`NOT_AUTHORIZED`, "Continuous anaesthesia responsibility is required. Arrange relief before leaving the patient."); within the room they move freely, and moving with the patient (a transport) is staying |
| leaving an anaesthetised patient | asked to go out of the room (back to a post elsewhere, to show the way), the responsible anaesthetist first asks a colleague from `team.cover` (else the team's own anaesthetist) — `anaesthesia request-relief`; the colleague walks to the patient with their own body and the world confirms them there — `relief-arrived`; the structured hand-over is accepted — `handover {from, to, airway, ventilation, haemodynamics, drugs, unresolved}`, taken from the record (airway interventions, the vitals now, the drugs given, open holds), said in the new anaesthetist's voice; responsibility is transferred, and only then does the first one go. The new anaesthetist is bound by the same rule at once. Nobody to take over, or they cannot come: the anaesthetist stays and says why. Before induction or after emergence they just go (`staff-requests.ts`, `handover.ts`). A learner's `anaesthesia` action is refused (`permission_denied`) |
| staff working on their own | `StaffAutonomy` (`session/staff-autonomy.ts`): one round of what every staff member does without being told each step — the circulating nurse's work on a new investigation (device fetched and reserved, acquired at the patient, reported, reviewed: docs/STUDIES.md), a colleague holding a port who is no longer at the table letting go (`assist.ts`), the operation's equipment checked against the room and, once the operation has begun, a device it lacks that is only switched off switched on by the circulating nurse (docs/PROCEDURE.md "Equipment"), and the responsible anaesthetist of an anaesthetised patient answering a **new** critical alarm. Each alarm is an episode in the record (`SessionState.alarms`, the `alarm-response` action by the system): **detected**; the anaesthetist goes to the patient with their own body; only once the world has them within reach is it **arrived** and said ("Alarm: SBP 72 — I'm at the patient and checking it."); a walk that fails (a locked door, no route) is **blocked** with its reason and said once per reason ("Alarm: SBP 72 — I can't get to the patient: <reason> I need someone at the bedside now."), and the walk is tried again every round until it succeeds; an alarm no longer critical is **cleared** (a recurrence is a new episode). A save and resume replays the episodes: a blocked responder keeps trying, an arrival already said is never said again. With model-driven characters the anaesthetist's words carry the record's place (docs/CHARACTERS.md §4): a blocked responder's line that claims the bedside is refused and the template that states the record is said. No drug or treatment of their own: what follows is the case's or the operator's. The round runs after every act of the learner and on the **staff's own clock**: Op `staff_step`, which the browser sends every `STAFF_STEP_MS` while the encounter runs, whatever the learner is looking at — so work goes on off-screen (in a case whose clock moves only with what is done, what needs time waits for the clock). `ClinicalSession.staffStates(): RoleState[]` — each staff member's goal, current task, place (room, x, z, level), responsibility (`anaesthesia`, `port B`, an order, a team task), held items, reservations, pending requests and what blocks them, **derived** from the record and the world, so a reload agrees by construction |
| model-driven members | with `characters.engine: "llm"` (docs/CHARACTERS.md) each member decides each round with their own model, from their role card and what they perceive: the policy's move (`act`, in their own words — and the only option when it is owed: a closed-loop reply or the count), `wait` (never twice in a row on one move), `notice` a colleague, or `escalate` their own stuck task; a line is said only when grounded, and the rules decide whenever the model is missing, slow or off-script (`TeamHost.decide`, `ModelTeamMind`) |
| saves | the web's save keeps `team` with the world (`persistence.ts`); a resume restores both. The scenario's lifecycle is saved with it — `pending` (the team's phases not begun, nothing set up in the world), `active` (set up once: `setup {round, at, worldVersion}`), `completed` — so a save before the operation sets the scenario up when the operation begins, exactly as a run never interrupted, and a save after it never sets anything up twice; holds, requests, hand-overs and item positions are in the checkpoint and the world snapshot |

## 6. Team scenarios (authored)

```jsonc
{
  "id": "swab-on-floor",
  "name": { … }, "summary": { … },          // facilitator text, never shown to the team
  "provenance": "authored",
  "needs": [{ "id": "needle-holder", "item": "sc-needle-holder", "for": "surgeon", "name": { … } }],
  "absent": ["or-7.scrub-nurse"],              // on a break
  "relief": [{ "staff": "or-6.scrub-nurse", "duties": ["instruments"] }],
  "items": [{ "placement": "or-7-swab-5", "beside": "or-7.mayo", "concealed": true }],   // or beside "patient", "inside": true
  // a documented transfer off the field: { "placement": …, "beside": …, "transfer": { "to": { … }, "reason": { … } } }
  "expect": { "count": "reconciled" }          // the team benchmark's ground truth (delivered: true | false; count)
}
```

A scenario is chosen at `start` (`{ "type": "start", "team": "swab-on-floor" }`) and recorded as hidden state
(`SessionState.teamScenario`); in the browser a facilitator chooses it for the next encounter with `?team=<id>`. A start without `team` sets nothing up: the team still works on what is asked of it
(`team need`) and keeps the count. Case 126 (SurgeryCraft) has eleven team scenarios:
- the needle holder needed;
- the scrub nurse on a break (relief from OR 6);
- the needle holder on the Mayo stand;
- no needle holder in the room;
- the count correct (the control);
- a swab under the Mayo stand;
- a swab in the wound;
- a swab gone from the room;
- six of five (OR 6's swab on the Mayo tray);
- five of five made up with OR 6's swab while the fifth is in the wound;
- a swab sent with the specimen, documented (the positive control: no hold).

## 7. The team benchmark

`clinicalcraft bench team [--case ids] [--scenario ids] [--out dir]` runs every team scenario of the cases that have
them, headless, in **observer mode**:
1. the case is replayed (its reference solution) up to the moment the scenario is about: the team's phase, or the
   count falling due for a count scenario;
2. the surgeon's body goes to the table;
3. the team then works alone (`team run`) until what was set in motion has ended.

The score comes from the session's own record (the team checkpoint, the case's count record, what bodies hold), never
from the team's say-so, checked against the scenario's `expect`. Its denominator is the scenario's **obligations**,
enumerated by id at the start (`obligations`): every need — its recipient, the physical outcome (they hold an item of
the type, one no other need was credited with), whether the circulating nurse verified it — and the count, when the
scenario expects an outcome. Each ends `met`, `escalated` (with its reason; appropriate when expected), `failed`, or
`unfinished` when the run stopped — a run with an unfinished obligation never passes, however many rounds it ran. A
scenario is `activated` when it was set up in the world and its work began; one assigned and never activated is
**invalid** (nothing about the team can be concluded from it). The report publishes the denominators apart: scenarios
assigned, activated, completed, appropriately escalated and invalid; obligations, and those unfinished. The nurse
who escalates a missing swab keeps that credit even when the run then fails because closure went ahead on it.
The report (`team-report.json`, `team-report.md`) gives, per scenario:

| metric | meaning |
|---|---|
| needs: delivered / verified / escalated | each need ended with the person holding the item, seen to be done by the circulating nurse; or escalated with a reason |
| count: outcome · holds · detection latency | correct / reconciled / unresolved; holds on closure asked for; rounds from the count falling due to the hold |
| false hold | a hold when every item was there (the control) |
| obligations: met / escalated / unfinished / failed | the scenario's obligations as they ended |
| inappropriate progression | closure began while the count was not settled (the count record's unsafe progression; `closedOnHold`) |
| exactly once | no action id carried out twice; no more hand-overs than needs |
| rounds · messages · acts · seconds | the work it took (simulated seconds) |

Every scenario must pass (exit 1 otherwise). It is separate from the operative benchmark
([BENCHMARK_OPERATIVE.md](BENCHMARK_OPERATIVE.md)): the team, not the surgeon at the table, is what is measured.

## 8. Tested

- `core/src/engine/team.test.ts`: consistency, facility fit, the scenario at `start`; positions, controls, the stand-in
  and line-ups (a failing case per rule, every earlier message unchanged).
- `core/src/engine/seats.test.ts`: every position's default controls, the assistant surgeon as the first assistant,
  positions by duty priority, the camera following who is present (two surgeons, three, one away, an override), the
  places offered, members' bodies and their inverse, controls in the field and in the world.
- `core/src/engine/places.test.ts`: the operating surgeon's seat recorded as no place; what a place needs; the join at
  the team's phase (the reference path's events and state) and a transcript replaying to the same state; the reference
  path's checks; assessment by place.
- `world/src/conceal.test.ts`: concealed items out of everyone's sight, untouchable by id, revealed by a search within
  reach or of what they are in, kept by a snapshot.
- `agent/src/session/team/policy.test.ts`: every rule above on hand-built views.
- `agent/src/session/team/session-team.test.ts`: the op without a team, the transcript replay, checkpoint validation.
- `core/src/engine/count.test.ts`: the count record — clean, recoverable, unresolved (closure recorded, never
  erased; or refused), excluded, six of five, a false five of five, a documented transfer.
- `bench/src/team/score.test.ts`: obligations — two requests with one delivery is not a pass; one item cannot answer
  two requests; a scenario never activated is invalid; an escalation credited while closure on it fails the run.
- SurgeryCraft `tools/case126-team.test.ts`, run by its `tools/check.sh` against this repository:
  - the two-nurse handoff while the learner watches;
  - relief, moved and missing instruments;
  - the surgeon away from the table;
  - two requests for one needle holder (one owner);
  - save and restore mid-handoff (one hand-over);
  - every count ending, in learner and observer mode, and closing on a hold;
  - who a reply is for and what it reads back.
- SurgeryCraft `tools/case126-count.test.ts`: the field, the board, the RF wand, the Sign Out, the team and the score
  agree on every count ending; a save before the operation activates the same obligations as a run never interrupted;
  the headless autopilot works the assigned scenario.
- `bench team` over Case 126: 11 / 11 (11 activated, 11 completed, 2 appropriately escalated, 0 invalid).

## 9. Limits (stated as they are)

- The policies are **rules**, written for the instrument handoff and the count. No language model drives a team
  member, and no live model has been asked to work with this team.
- **Time is logical.** A round is not a clock interval, and a member does one thing per round.
- **Perception stands in for a glance round the room.** Verification uses what the body perceives (line of sight
  within 8 m counts, whatever the facing); a count is what the team in the room can account for (every item in the
  room or in hands there, never a concealed one) — not a model of a nurse miscounting. A member outside the room
  knows whether someone is in it.
- **The surgeon is the learner's body.** In observer mode the simulated surgeon acts with it.
- **Places and controls are the engine's only.** A place in the team can be taken at the engine's `start` and joins
  at the team's phase, but nothing drives the stand-in surgeon yet and no session stamps the learner's place on their
  steps (an `operate` with no actor is the operator's step), so a session refuses a place and no front-end offers one.
  The join drives the record only — the world's device state machines (the count board) are not driven by it —, the
  Sign Out and the steps after the operation are the operator's, and a case served without its reference solution
  offers no place. The controls are enforced in the operative field only (docs/PROCEDURE.md §3) — not in the world,
  the scope of practice, delegation or these policies.
  There is no place for the circulating nurse or the anaesthetist, and a place does not change during an encounter.
- **Only the duties above have policies.** `anaesthesia` is declared only. Relief colleagues are reached "by phone";
  nobody walks to fetch an instrument from another room.
- The **benchmark measures the reference policies** (it must stay at 100 %). Measuring an agent or a learner in a
  team member's place is future work.
- Not reviewed by perioperative nurses. The check-back follows TeamSTEPPS and the count follows AORN / WHO practice
  in outline, not any institution's policy.
