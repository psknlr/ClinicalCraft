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
`packages/web/src/ui/panels/team.ts`). If code and this page disagree, fix one of them in the same change.

Learner-facing words follow [GLOSSARY.md](GLOSSARY.md): the care team (手术团队), circulating nurse (巡回护士), scrub
nurse (洗手护士), surgeon (术者), read-back (复述确认), count (清点), hold on closure (暂停关闭), observer mode
(观察模式).

## 1. What a case declares

```jsonc
"team": {
  "room": "or-7",                        // the room the team works in
  "phases": ["operation"],               // the case phases in which it works on its own
  "waitRounds": 3,                       // rounds a member waits for an answer before rerouting or escalating
  "members": [
    { "staff": "or-7.circulating-nurse", "duties": ["circulate"] },
    { "staff": "or-7.scrub-nurse", "duties": ["instruments", "count"] },
    { "staff": "surgeon", "duties": ["surgeon"] }      // the learner (or the simulated surgeon, observer mode)
  ],
  "count": {                             // optional: the count the team keeps, item by item (§4.3)
    "item": "sc-gauze-swab", "name": { "zh-CN": "纱布", "en": "swabs" },
    "when": { "procedure": { "specimen": "extracted" } },
    "searchPlaces": ["or-7.mayo", "or-7.back-table", "or-7.lap-tower"]
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
- `anaesthesia`: declared only; no policy acts on it yet.

`checkTeamDefinition` (part of `checkCaseIntegrity`) checks the team on its own:
- known phases;
- each member listed once, with exactly one surgeon;
- somebody circulates;
- needs are for members;
- absent members are members, and the surgeon is never absent;
- relief colleagues are not members;
- the solution's `start {team}` names a scenario;
- `expect` matches what is set up.

`teamFacilityIssues` (run by `cases validate`) checks the team against its facility:
- the room exists;
- the members are staff of that room;
- relief colleagues exist;
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
| `auto` (default) | after each op of the learner, until a round passes with nothing done; in the browser also one `step` every `TEAM_STEP_MS` (2 s) while the encounter runs, so a learner who only watches sees the team work |
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

When the count's `when` holds (Case 126: the specimen is out), the member who **counts**:
- counts the items of the type she perceives in the room, lying or in anyone's hands;
- reports the number against the baseline, which is every one in the room before incision ("Count of swabs: 4 of 5.").

The circulating nurse then:

| the count | what follows |
|---|---|
| correct | told to the surgeon ("Count of swabs correct: 5 of 5."), with no hold |
| short | **the line stops**: she asks the surgeon to *hold closure and check the wound* (a `request` with `hold`). The surgeon reads it back and she confirms (check-back). She **searches the room** — she walks to each place in `searchPlaces`, in order, and `search`es within reach. The places are the same whatever happened, so nothing points to where an item is. She stops early once she can see them all. She waits a while for the surgeon's wound check, then asks for a **recount** |
| recount correct | the surgeon may close ("Recount correct: 5 of 5 swabs — you may close.") |
| recount still short | **escalated** ("Still 4 of 5 swabs after searching the room — an X-ray before the patient leaves."), never pretended solved |

Every member searches with their own body (`search`, [EMBODIED.md](EMBODIED.md) §8.6). A swab in the wound is found
only by a search *of the wound* (the patient), which brings it out into the searcher's hand.

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
| `team` op | `step`, `run {rounds?}` (until settled), `pause` (autonomy `step`), `resume` (`auto`), `surgeon {learner \| simulated}`, `reply {message, kind, text?}`, `need {item, for?}` (the surgeon says what they need; the team takes it from there). A case without a team: `error` `no_team` |
| `team_event` | a message, a receipt, a task changed, or the scheduler's status (round, autonomy, surgeon) |
| `ClinicalSession.team()` | the team as it stands (a `TeamCheckpoint`), for front-ends |
| acts | through `EmbodiedSession.act` on a nurse's tool path: the role's authority and scope of practice apply, as for any staff member |
| browser | the HUD's **Team** button (in the team's phases) opens the panel: pace (Auto / Step / Next step), the surgeon (I am the surgeon / Observe), Search within reach / Check the wound, what was said (lines to the learner marked, with their answers), the tasks (with "seen to be done"), the count. The team clock (`TEAM_STEP_MS`) runs while the encounter runs, or while the panel is open |
| saves | the web's save keeps `team` with the world (`persistence.ts`); a resume restores both |

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
  "expect": { "count": "reconciled" }          // the team benchmark's ground truth (delivered: true | false; count)
}
```

A scenario is chosen at `start` (`{ "type": "start", "team": "swab-on-floor" }`) and recorded as hidden state
(`SessionState.teamScenario`). A start without `team` sets nothing up: the team still works on what is asked of it
(`team need`) and keeps the count. Case 126 (SurgeryCraft) has eight team scenarios:
- the needle holder needed;
- the scrub nurse on a break (relief from OR 6);
- the needle holder on the Mayo stand;
- no needle holder in the room;
- the count correct (the control);
- a swab under the Mayo stand;
- a swab in the wound;
- a swab gone from the room.

## 7. The team benchmark

`clinicalcraft bench team [--case ids] [--scenario ids] [--out dir]` runs every team scenario of the cases that have
them, headless, in **observer mode**:
1. the case is replayed (its reference solution) up to the moment the scenario is about: the team's phase, or the
   count falling due for a count scenario;
2. the surgeon's body goes to the table;
3. the team then works alone (`team run`) until what was set in motion has ended.

The score comes from the session's own record (the team checkpoint), never from the team's say-so, checked against
the scenario's `expect`. The report (`team-report.json`, `team-report.md`) gives, per scenario:

| metric | meaning |
|---|---|
| needs: delivered / verified / escalated | each need ended with the person holding the item, seen to be done by the circulating nurse; or escalated with a reason |
| count: outcome · holds · detection latency | correct / reconciled / unresolved; holds on closure asked for; rounds from the count falling due to the hold |
| false hold | a hold when every item was there (the control) |
| inappropriate progression | closure began while the count was short (`closedOnHold`) |
| exactly once | no action id carried out twice; no more hand-overs than needs |
| rounds · messages · acts · seconds | the work it took (simulated seconds) |

Every scenario must pass (exit 1 otherwise). It is separate from the operative benchmark
([BENCHMARK_OPERATIVE.md](BENCHMARK_OPERATIVE.md)): the team, not the surgeon at the table, is what is measured.

## 8. Tested

- `core/src/engine/team.test.ts`: consistency, facility fit, the scenario at `start`.
- `world/src/conceal.test.ts`: concealed items out of everyone's sight, untouchable by id, revealed by a search within
  reach or of what they are in, kept by a snapshot.
- `agent/src/session/team/policy.test.ts`: every rule above on hand-built views.
- `agent/src/session/team/session-team.test.ts`: the op without a team, the transcript replay, checkpoint validation.
- SurgeryCraft `tools/case126-team.test.ts`, run by its `tools/check.sh` against this repository:
  - the two-nurse handoff while the learner watches;
  - relief, moved and missing instruments;
  - the surgeon away from the table;
  - two requests for one needle holder (one owner);
  - save and restore mid-handoff (one hand-over);
  - every count ending, in learner and observer mode, and closing on a hold.
- `bench team` over Case 126: 8 / 8.

## 9. Limits (stated as they are)

- The policies are **rules**, written for the instrument handoff and the count. No language model drives a team
  member, and no live model has been asked to work with this team.
- **Time is logical.** A round is not a clock interval, and a member does one thing per round.
- **Perception stands in for a glance round the room.** Verification and counting use what the body perceives (line
  of sight within 8 m counts, whatever the facing). A member outside the room knows whether someone is in it.
- **The surgeon is the learner's body.** In observer mode the simulated surgeon acts with it.
- **Only the duties above have policies.** `anaesthesia` is declared only. Relief colleagues are reached "by phone";
  nobody walks to fetch an instrument from another room.
- The **benchmark measures the reference policies** (it must stay at 100 %). Measuring an agent or a learner in a
  team member's place is future work.
- Not reviewed by perioperative nurses. The check-back follows TeamSTEPPS and the count follows AORN / WHO practice
  in outline, not any institution's policy.
