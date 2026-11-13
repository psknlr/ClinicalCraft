# Characters · 角色

Every person in the simulated hospital is a **character** with a job of their own: the patient and their companion,
the attending who teaches, and every member of staff — the scrub and circulating nurses, the anaesthetist, the
assistant surgeon, the porter, the pharmacist, the theatre coordinator. This page is the contract for how characters
are designed, how they are driven (by rules, or each by its own model) and how they collaborate without leaving the
facts or the physics of the simulation.

Code: `packages/core/src/schema/facility.ts` (`StaffPositionSchema`, `staff.position`),
`packages/agent/src/characters/` (`roles.ts` — the role cards and `positionOf`; `team-mind.ts` — a model-driven
care-team member; `voice.ts` — a staff line worded by a model), `packages/agent/src/session/character-models.ts`,
`packages/agent/src/session/team/` (the scheduler's `decide` hook). If code and this page disagree, fix one of them in
the same change.

## 1. The principle

**The model chooses and speaks; the engine keeps the physics and the protocol.** A character's model never moves a
body, hands over an item, changes the record or states a fact on its own: it chooses among the moves the engine says
are legal now, and it words what the character says. Every act still goes through the one world-action path (reach,
custody, sterility, the scope of practice, continuous anaesthesia responsibility — docs/TEAM.md §5, EMBODIED.md), and
every line is checked against what that character perceives. When a model is missing, slow, fails or answers
outside the options, **the rules decide** — the deterministic policy that drives the character in `rules` mode — with
one warning per character and a diagnostic record of what was refused. So a model-driven team is never less safe and
never less complete than the rules, and the benchmarks stay deterministic (they run with `rules`).

## 2. Positions and role cards

A staff member's **position** is the job they hold, finer than their facility `role` (which decides what their body
may do in the world; in the 3D world the position also decides what they wear — a scrub nurse is gowned and gloved, an
anaesthetist in theatre scrubs: FACILITIES.md "Staff in the 3D world"): a nurse is a scrub, circulating, ward or recovery nurse; an attending is a surgeon, an assistant
surgeon, an anaesthetist, a physician or an educator. Positions (`StaffPositionSchema`): `surgeon`,
`assistant-surgeon`, `anaesthetist`, `scrub-nurse`, `circulating-nurse`, `ward-nurse`, `recovery-nurse`,
`theatre-coordinator`, `physician`, `educator`, `radiologist`, `radiographer`, `pathologist`, `lab-technician`,
`transfusion-scientist`, `pharmacist`, `receptionist`, `porter`, `paramedic`.

**Where a position comes from** (`positionOf`): the facility's `staff.position` (or a room template instance's staff
override), else the case team's duty (`anaesthesia` → anaesthetist, `instruments` → scrub nurse, `circulate` or
`count` → circulating nurse, `surgeon` → surgeon; the scenario's relief colleagues too), else the facility role's
default (`nurse` → ward nurse, `attending` → physician, `lab-tech` → laboratory technician, …). An agent answering as
itself, with no staff member named, holds its profile's position (`PROFILE_POSITION`: the nurse is a ward nurse, the
attending is the educator). The patient, the companion, the examiner and the demonstrating clinician are not staff.

Each position has a **role card** (`ROLE_CARDS`):

| field | what it holds | example (scrub nurse) |
|---|---|---|
| `mission` | why the position exists | "Keeps the sterile field and its instruments, and hands the surgeon what they need." |
| `responsibilities` | what it is there to do | know where every instrument and swab is; hand instruments into the surgeon's hand, naming them; count with the circulating nurse |
| `may` | its authority here | hand over sterile instruments; count and set items aside; ask the circulator for anything outside the field |
| `mayNot` | hard limits | leave the sterile field unrelieved; touch anything not sterile; fetch from outside the field |
| `protocol` | how it communicates | read back a request; report the hand-over done; call a count discrepancy at once and ask for a hold |
| `escalatesTo` | whom it raises what it cannot resolve to, in order | circulating nurse, then surgeon |
| `knows` | the only sources of its facts | what is on the sterile field and in your hands; what the surgeon and the circulator tell you |

Every position also follows the **shared protocol** (`SHARED_PROTOCOL`, TeamSTEPPS): closed-loop communication
(request → read-back → confirmation → done-report); one owner per task, handed over in words; say only what you can
see, hear or were told, and its source — unchecked is unknown, never "fine"; stay in your role (decline kindly with who
does it instead); safety first (a concern said at once and plainly, escalated if unresolved); short, specific,
addressed lines.

The card is the character's job description in every model call: `roleSection` renders it as the `<role>` section of
the system prompt — for a colleague the learner talks to by name (Nurse Lim answers as the scrub nurse, Dr Tanaka as
the anaesthetist — never the learner's preceptor —, Dr Mori as the assistant surgeon), for a care-team member's
decision and for a staff line worded by a model. A card never grants an act: the world and the scope of practice
refuse what a body may not do whatever its card says.

`ClinicalSession.staffStates()` reports each staff member's `position` with their goal, task, place, responsibilities,
holdings, reservations, pending requests and what blocks them (docs/TEAM.md §5).

## 3. The character engine (`characters.engine`)

| setting | `rules` (default) | `llm` |
|---|---|---|
| a colleague the learner talks to | their model, from their role card (offline responder without one) | the same |
| a care-team member's move each round | the team's deterministic policy (docs/TEAM.md §4) | the member's own model chooses among the legal moves and words what it says (below) |
| a staff line the engine decides is said (the anaesthetist answering an alarm) | the template | the speaker's model words it, grounded in the facts (§4) |

Set it in any settings layer (`"characters": {"engine": "llm", "timeoutMs": 8000}`), with `clinicalcraft
--characters llm`, in the browser (Settings → Agents → **Model-driven characters** / 大模型驱动的角色: saved with the
other settings and sent to the running encounter at once — `configurePatch`; with no model chosen it says the
characters follow the rules until one is), or at runtime with `configure {characters: {engine}}` (an unknown value is
refused, `invalid_config`). A character's model is the one their
facility role speaks through (`STAFF_AGENT`: a nurse's is `agents.nurse`, an anaesthetist's or assistant surgeon's
`agents.attending`), with that agent's provider, model, temperature, effort and retries. `timeoutMs` (default 8000,
500–60000) is how long a model may take before the rules decide.

### A care-team member's decision (`ModelTeamMind`)

Each round the scheduler asks each member for at most one move (docs/TEAM.md §2). With `llm` it computes the policy's
own proposal first and hands it to the member's model as one of the **options**:

| option | what it is | offered when |
|---|---|---|
| `act` | the protocol's move — the policy's proposal (notice a need, ask the colleague whose duty it is, read back, confirm, hand over, report, count, search, escalate), in the member's own words when it speaks | the policy has a move; an **owed** move — a closed-loop reply (read-back, confirmation, report, decline, escalation), anything about the count, or a step of the operative site's verification (a look, the pause, the mark, the confirmation: docs/TEAM.md §4.5) — is then the only option |
| `wait` | not now | the move is not owed, and was not deferred last round (a member never waits twice in a row on one move) |
| `notice` | tell a colleague in the room what you see or are doing (`to`), creating no obligation | a colleague is in the room |
| `escalate` | raise your own task, stuck waiting, to the person it is for, saying what was tried | the member owns a task in `waiting` |

The model sees its role card, a `<deciding>` instruction and its **situation** — only what the member perceives
(`MemberView`): where they are and what they hold, the unread messages said to them, their own tasks, the needs they
noticed, their colleagues (in the room, on a break, reachable by phone, busy) and the count as the team can know it —
never the hidden state. It answers JSON (`team_decision`: `option`, `to`, `line`, `why`). The engine then:

- refuses an option that was not offered (the rules decide);
- for `act`, keeps the policy's move — its addressee, its kind, its thread, its task changes — and only replaces the
  words in the session's language with `line` when the line is grounded (the other language keeps the team's
  wording, so a change of language never shows a stale line);
- builds `notice` and `escalate` itself (an escalation ends the task `escalated`, as the policy's would);
- records every decision (`diagnostic` transcript item, `source: "characters"`: option, accepted or refused and why,
  the line, the model's private `why`) — never an event.

Bookkeeping (taking a message in) is never sent to a model, and a member with nothing to do and nothing said to them is
not asked: the cost is one call per member move.

## 4. Grounded lines (`lineProblem`)

A line a model wrote is said only if it is:

- one line, at most 240 characters, in the session's language (Chinese for `zh-CN`, otherwise no Chinese);
- free of any number that is not in what the speaker perceives (the situation and the options, or the facts given);
- free of any member of staff the speaker cannot address (by full name, name without its title, or surname);
- for a line the engine gives a place (`where`: the record has the speaker at the patient, or away from them —
  `placeClaimProblem`), free of a claim to be elsewhere, in either language: a responder whose walk is blocked never
  says "I'm at the bedside", "I've arrived", "checking the patient", 我在床旁 or 正在检查病人 — nor that they
  touched the patient or did anything at the bedside, however worded ("I have just palpated the patient's pulse",
  "pulse feels thready", "bagging him", 刚摸了脉搏, 颈动脉搏动细弱); one at the patient never says they cannot get there
  or are on the way; and no line claims a treatment given ("I've given…", 我推了…) — that is an intervention, in the
  record or not at all. The anaesthetist's alarm lines carry it (`blocked` → `away`,
  `arrived` → `at-patient`), so a model's wording can never put them at a bedside the record does not.

Otherwise the template is said. `wordLine` applies the same check to a staff line the engine decides is said: it gives
the speaker's model the intent ("a new critical alarm … you are now at the patient"), the facts the line may state
("critical alarm: SBP 72") and the template; the anaesthetist answering an alarm uses it (`StaffAutonomy`, docs/TEAM.md
§5).

## 5. Tested

- `packages/agent/src/characters/characters.test.ts`: every position has a complete, distinct card; positions from the
  facility, the team's duties and the facility role; the role section; a model-driven member does the protocol's move
  in its own words, refuses ungrounded lines (a stray number, a colleague not in view, the wrong language), waits at
  most once and never on a read-back it owes, falls back to the rules on an option not offered, an unreadable answer,
  no model or a slow model (one warning), notices to a colleague and escalates its stuck task; grounded staff lines;
  a line never claims a place the record contradicts (shut out: no "I'm at the bedside" in English or Chinese; at the
  patient: no "I can't get there").
- SurgeryCraft `tools/case126-characters.test.ts`: every member of staff in the IMPF hospital holds a position; Nurse
  Lim, Dr Tanaka and Dr Mori each speak from their own card; with `llm`, the two nurses hand the surgeon a needle
  holder with every move decided by their models — the same closed loop and world acts as the rules, in their own
  words — and a line stating what nobody perceived is refused while the loop still closes. SurgeryCraft
  `tools/case126-staff.test.ts`: with `llm`, the anaesthetist's model saying "I am at the bedside" while shut out of
  OR 7 is refused (the record's blocked line is said), and the same words are said once they are there.

## 6. Limits (stated as they are)

- The options are the policy's move plus `wait`, `notice` and `escalate`: a model reorders the team's priorities only
  within them (a member cannot invent a new kind of act). New kinds of moves come from the policy, where the engine can
  check them.
- The grounding check is lexical (numbers, names, language, one line, first-person place claims): it does not judge
  tone or clinical register, and a place claim worded in a way the patterns do not know is not caught (the record
  stays right; only the words could be wrong).
- Lines worded by a model are in the session's language only; the other language keeps the template.
- Only the care team's decisions and the anaesthetist's alarm call are model-driven beyond conversation; the staff's
  other fixed lines (a study's progress, a hand-over summary) still use their templates.
