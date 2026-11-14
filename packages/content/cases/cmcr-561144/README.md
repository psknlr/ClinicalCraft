# cmcr-561144 — Day 5 after thoracic sympathectomy · 51-year-old woman

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (华清和 / Hua Qinghe) is a pseudonym,
> and the relative in intensive care is a teaching role; the case is a teaching adaptation of a published case
> report, not medical advice. 导师指南，含剧透。患者为化名，ICU中的家属为教学角色；本病例改编自已发表的病例报告，不构成医疗建议。
>
> **Status of the facts.** Version 1.1.0 was re-authored from the facts that version 1.0.0 extracted from the
> report. The full article was not available; no patient fact has been added or changed, and none has yet been
> checked against the full text (`extensions.sourceTextChecked: false`). The "To verify" list names what to look
> for in the source.

## Case card

| | |
|---|---|
| Case | `cmcr-561144` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 宗酉明, 郁慧杰, 王海波. 中心静脉导管拔管后致脑空气栓塞一例. 中华医学杂志. 2014;94(11):880 |
| Setting / facility | Ward (`inpatient`) → intensive care (the ICU's monoplace hyperbaric chamber) · `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 minutes (static clock; four phases, five decisions, 19 interventions) |
| Specialty | Critical care, anaesthesiology, thoracic surgery, neurology |
| Languages | zh-CN (source language), en |
| Learner level | Final-year students; foundation doctors and residents in surgery, anaesthesia and intensive care; ward and ICU nurses |
| Review status | Editorial review 2026-10-30, independent review 2026-11-13 and review rounds 2 and 3 on 2026-11-14 (AI-assisted, against the guidance below; round 2 read the full texts of Moon 2019, ECHM 2016, the Pennsylvania advisory of 2012, WS/T 433—2023, the GMC/NMC candour guidance, Decree No. 701 and the AES 2016 algorithm; round 3 re-read them, re-checked that each is still the current edition and replayed the assessment) — **not yet reviewed by a licensed clinician**; patient facts not yet checked against the full article. Have an intensivist, a hyperbaric physician and an adult congenital cardiologist review it before teaching use |
| Content | 15 history items (6 not recorded, 7 required) · 7 exam findings · 11 investigations (5 record reviews, 6 without any recorded result) · 19 interventions (6 contraindicated in some or all circumstances) · 6 objectives · 5 decisions (23 options) · 13 rubric items (12 deterministic, weight 31; 1 examiner-judged; 3 critical) · 4 staff characters · 6 learning outcomes · 6 teaching points · 56 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Remove an internal jugular line safely — site below the heart, out during a breath-hold with a Valsalva manoeuvre,
   pressure to haemostasis, an air-occlusive dressing (kept sealed for 24 hours under China's WS/T 433—2023), a period
   lying flat (Pennsylvania Patient Safety Authority 2012) — and treat an intracardiac shunt with pulmonary
   hypertension as a reason for extra care.
2. Recognise cerebral gas embolism at the bedside when unresponsiveness and seizures follow line removal within
   minutes, without waiting for imaging (Moon, UHMS 2019), and tell it apart from convulsive syncope, ischaemic stroke,
   pulmonary embolism and a first epileptic seizure.
3. Start first aid in the first minutes: seal the site, keep the patient horizontal rather than head-down, give
   100 % oxygen, secure the airway, stop a continuing seizure as AES 2016 recommends, and check the glucose.
4. Arrange urgent hyperbaric oxygen (a Type 1 recommendation for gas embolism, ECHM 2016) with its pre-compression
   checks — a pneumothorax excluded and drained after chest surgery, saline in the tube cuff — and explain why a clear CT
   would not cancel it (Moon, UHMS 2019).
5. Explain why the route the air took cannot be established from the record, and what a shunt with pulmonary
   hypertension means for her future lines and cardiac follow-up (ESC 2020 adult congenital heart disease).
6. Disclose an iatrogenic complication to the family honestly, apologise and report it (GMC/NMC professional duty of candour 2015, updated 2024; China's Regulations on the Prevention and Handling of Medical Disputes 2018).

These are `learningOutcomes`. They name the diagnosis, so front-ends show them before play only behind the closed
**Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief (CASE_AUTHORING §9.4,
GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A 51-year-old woman first sought care for hands that turn white and painful in the cold; on that assessment an
atrial septal defect and pulmonary hypertension were found (an earlier echocardiogram records both). She underwent a
thoracic sympathectomy (胸交感神经链切断术). On post-operative day 5 her right internal jugular central venous
catheter was removed with her lying flat (平卧); the site was pressed for about 1 minute and covered with ordinary
adhesive tape (普通胶布). About 3 minutes after the removal, as she sat up, she suddenly became unresponsive (呼之不应), with
short, rapid breaths (呼吸短促) and convulsions (抽搐); a central pulse was palpable, the pupils were equal and the
right reacted sluggishly to light. She was given oxygen and intubated, and the emergency head CT showed intracranial
air embolism. She received respiratory support, hyperbaric oxygen and rehabilitation; the next day she was alert
but with severe left hemiplegia, and she improved gradually to walk independently by about day 35. No longer
follow-up is recorded. Version 1.0.0 records that the report discusses more than one mechanism (paradoxical embolism
across the ASD, retrograde venous passage) without direct observation of the route.

**Diagnosis (as taught):** cerebral (arterial and/or retrograde venous) gas embolism after removal of a right
internal jugular central venous catheter, in a patient with an atrial septal defect and pulmonary hypertension. The
route cannot be established from the record.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires: the case shows
the report's recorded states and never simulates the learner's treatment. Every phase is one-way
(`learnerSwitchable: false`).

| Phase | When | Entered when | What is there |
|---|---|---|---|
| `ward` (initial) | post-operative day 5, before the line comes out | start | her own history (she is alert and answers), the earlier echo, the operation note and the line record; decision 1; the removal and positioning steps |
| `collapse` (label "After the removal") | about 3 minutes after the removal, as she sits up | objective 1 done (core history, echo and line record read, decision 1 right, the line removed) | she cannot speak; six bedside findings (responsiveness, breathing, convulsions, central pulse, pupils, the neck site); glucose, ECG and blood gas (no recorded result); the removal record; decision 2; first aid, airway, ICU transfer and the traps |
| `icu` | intensive care, intubated and on respiratory support | `obj-at-bedside` done (bedside assessment, glucose ordered, decision 2, intubation **and** the ICU transfer) | her relative (teaching role) answers; airway and ventilation check; the emergency head CT; chest film, MRI and bedside echo (no recorded result); decisions 3–5; hyperbaric oxygen, disclosure, incident report, rehabilitation |
| `followup` | from the event to about day 35 | all five decisions right, hyperbaric oxygen given **and** the family meeting held | the report's course and outcome record (with the approved figure) |

Gating choices. Decision 2 opens on any one bedside examination — never on a record — and the CT result exists only
in the ICU phase, so recognition and first aid cannot wait for, or be read off, the scan. Decision 3 opens on the
ICU airway check, before the CT is read (hyperbaric oxygen must not wait for imaging). Time-critical acts are scored
through a time window, never through a phase-bound objective: calling for help, sealing the site, laying her flat
and high-flow oxygen are `indicatedWhen` the `collapse` phase holds **and** she has not yet been transferred to
intensive care, and `rb-first-minute` counts them only when given inside that window (`whenIndicated`). A phase leaf
alone would not close it — the engine lets a learner return to a locked phase that has been reached while its
`enterWhen` still holds — but the ICU transfer closes it for good. Hyperbaric oxygen counts for `rb-hbot-given` only
when given in intensive care, not while contraindicated (the chest film ordered), and before the outcome record is
read; the outcome phase cannot open without it. The ICU phase does **not** wait for the first-aid acts: a learner who
intubates and transfers without them moves on, can still do them late (the first-minutes objective latches on the
acts alone, so the case stays finishable — the collection contract replays every step late), and misses the critical
item (measured below).

The removal itself follows the report whatever technique the learner chose in decision 1: the `remove-line` response
says what the report records, and the `collapse` description adds "From here the case follows the report".

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-before-removal` — Before the line comes out: know her and plan the removal (status today, operation, heart
   and lungs, neck line; earlier echo and line record read; decision 1; the line removed).
2. `obj-first-minute` — The first minutes (call for help, seal the site, lay her flat, high-flow oxygen). The chapter
   appears as soon as she stops responding and latches whenever the acts are done; whether they were done in time is scored
   by `rb-first-minute`, not by the objective.
3. `obj-at-bedside` — After the removal: assess and stabilise her (responsiveness, breathing, central pulse, pupils,
   neck site; glucose ordered; decision 2; intubation; ICU transfer).
4. `obj-icu-hbot` — Intensive care: the next few hours (airway check, decision 3, chest film ordered in ICU,
   hyperbaric physician, hyperbaric oxygen).
5. `obj-route-family` — Where it came from, and the family (CT read, decision 4, the relative's knowledge and worry,
   decision 5, family meeting, incident report).
6. `obj-outcome` — Review the reported course and outcome.

Hints are Socratic questions; none contains a key's text or names the diagnosis (`cases validate` checks the first).
Objective titles, phase labels and the intervention and test names are visible before the event, so they describe
steps and places, not the event or the diagnosis (the CT is "Head CT"; the transfer "Transfer to intensive care"; the
family step "Hold a family meeting"). The HUD shows the first unfinished chapter: objective 1 completes only once the
line is out, so "The first minutes" appears the moment she stops responding, and objective 3 completes only at the ICU
transfer, so each chapter's quest-card text appears only when its events have happened.

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `line-removal` | operation and neck line asked; earlier echo and line record read (ward) | flat, head-down if tolerated, site below the heart; out as she holds her breath and bears down (Valsalva); pressure to haemostasis; air-occlusive dressing ≥ 24 h; flat about 30 min | flat, a minute of pressure, ordinary tape, then up whenever she likes (close to what the report records — flat, about a minute of pressure, ordinary tape, sitting up about 3 minutes later; what she was told about getting up is **not** recorded — and not labelled as such before the event); sitting at 45° with a deep breath in; right position and breath-hold but dry gauze and up at once; keep the line until the ASD is repaired |
| 2 | `collapse-action` | any one bedside examination | air through the neck puncture until proven otherwise: seal, flat, 100 % oxygen, call for help, airway, stop the fit, glucose, alert ICU and the hyperbaric team, no scan first | convulsive syncope (legs up, wait 10 min); paradoxical thromboembolic stroke — CT, CTA, alteplase; massive PE — heparin, CTPA, lysis; first epileptic seizure — diazepam, EEG tomorrow |
| 3 | `hbot-plan` | decision 2 and the ICU airway check (before the CT is read) | urgent hyperbaric oxygen without waiting for imaging; chest film first (drain a pneumothorax), saline in the cuff, chamber-safe ventilator; 100 % oxygen, normal blood pressure and glucose meanwhile | let the CT decide; steroids and mannitol first, HBOT once off the ventilator; "HBOT is for divers" with 24 h head-down; hyperventilation and hypertonic saline, HBOT after 24 h |
| 4 | `route` | decision 3, the ICU head CT, the earlier echo, the pupil examination | either route fits, neither was seen; treatment the same; de-air every future line, filters, cardiology to assess the ASD and pressures | the echo proves paradoxical embolism — close the ASD before discharge; the right pupil proves retrograde ascent, the ASD is irrelevant; the route does not matter, no precautions or follow-up |
| 5 | `disclosure` | the relative's worry asked; decision 3 | meet the family with the senior doctor: air most likely entered through the neck puncture after the removal, apologise, explain HBOT and the uncertain outlook, record it, report the incident | call it a stroke and say nothing of the line; wait for the outcome before explaining; blame her for sitting up, no apology |

All decisions are single best answer with option-specific feedback naming the guidance. Options were balanced for
length: in no decision is the key the uniquely longest option in either language (measured by the authoring script
and checked by `cases validate`).

### Rubric (12 deterministic items, weight 31, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-history` | History | status today, the hands, the operation, heart and lungs, the neck line, medicines and blood thinners, fits or diabetes, the chest since surgery (the last three unrecorded: asking is the competency) | 2 |
| `rb-records-before-removal` | Investigations | earlier echo, operation note and line record read **in the ward phase** | 1 |
| `rb-line-removal` | Management | decision 1 first time | 3 |
| `rb-bedside-assessment` | Examination | responsiveness, breathing, convulsions, central pulse, pupils, neck site; glucose ordered in the `collapse` phase | 2 |
| `rb-recognition` | Diagnosis | decision 2 first time | 3 |
| `rb-first-minute` | Safety · **critical** | call for help, site sealed, laid flat and high-flow oxygen, each given in the `collapse` phase before the ICU transfer (`whenIndicated` on that window) | 4 |
| `rb-hbot-plan` | Management | decision 3 first time **and** the chest film ordered in ICU | 3 |
| `rb-hbot-given` | Management · **critical** | hyperbaric oxygen given in intensive care, not while contraindicated (chest film ordered), before the outcome record is read (`whenIndicated`; the outcome phase cannot open without it), and no compression ever given before the film (no `{intervened: hbot, valid: false}`) | 4 |
| `rb-no-harm` | Safety · **critical** | no alteplase and no therapeutic heparin; `scoredWhen` decision 2 attempted or either drug given | 3 |
| `rb-air-entry-safety` | Safety | none of the air-entry and positioning harms — the line removed before decision 1 or with her sitting up (sat up and neither laid flat nor tilted since; review round 3), sitting her up after the removal before hyperbaric oxygen, a head-down tilt after the collapse (each counted only when given while contraindicated, `{intervened, valid: false}`); `scoredWhen` decision 1 attempted or any of the three given (added in review round 2) | 2 |
| `rb-route` | Diagnosis | decision 4 first time | 2 |
| `rb-candour` | Management | decision 5 first time, family meeting held, incident reported | 2 |
| `rb-communication` | Communication (examiner) | honest, plain-language disclosure, apology, HBOT explained with its risks, uncertainty, teach-back (Calgary–Cambridge, SPIKES, duty of candour) | 1 |

### How wrong choices score (measured 2026-11-14 with the core engine)

| Path | Score | Critical items missed | Flagged in the debrief |
|---|---|---|---|
| Reference `solution` | 31/31 (100 %) | none | none |
| Start and do nothing | 0/26 (0 %) | `rb-first-minute`, `rb-hbot-given` | — (`rb-no-harm` and `rb-air-entry-safety` not scored) |
| Wrong first answer at every decision, then the key | 18/31 (58 %) | none | none |
| Wrong first at decision 1, 2 or 3 only | 28/31 (90 %) | none | none |
| Wrong first at decision 4 or 5 only | 29/31 (94 %) | none | none |
| The option closest to the report's removal (`flat-tape-up`) chosen first at decision 1 | 28/31 (90 %) | none | none |
| First aid (help, seal, flat, oxygen) done only after the ICU transfer | 27/31 (87 %), finishes | `rb-first-minute` | — |
| First aid done only after reading the outcome, back in the `collapse` phase | 27/31 (87 %), finishes | `rb-first-minute` | — |
| No hyperbaric oxygen | 27/31 (87 %), stays in ICU (no outcome record) | `rb-hbot-given` | — |
| Hyperbaric oxygen before any chest film (the film ordered afterwards) | 27/31 (87 %), finishes | `rb-hbot-given` | hyperbaric oxygen (contraindicated without the film) |
| The same, then compression repeated after the film, before the outcome is read | 27/31 (87 %) | `rb-hbot-given` | the first, contraindicated compression |
| Reference plus alteplase at the collapse | 28/31 (90 %) | `rb-no-harm` | alteplase — **critical safety failure** (safety outcome fails) |
| Reference plus therapeutic heparin at the collapse | 28/31 (90 %) | `rb-no-harm` | heparin (contraindicated; safety outcome passes) |
| Reference plus "sit her up" after the removal, on the ward or in ICU (before hyperbaric oxygen) | 29/31 (94 %) | none (`rb-air-entry-safety` lost) | sit-up (contraindicated) |
| Reference plus a head-down tilt after the collapse, on the ward or in ICU | 29/31 (94 %) | none (`rb-air-entry-safety` lost) | head-down tilt (contraindicated) |
| The line removed before decision 1 is answered | 29/31 (94 %) | none (`rb-air-entry-safety` lost) | line removal (and the reference's head-down tilt, which then comes after the event) |
| Reference plus "sit her up" just before the removal (an upright removal; review round 3) | 29/31 (94 %) | none (`rb-air-entry-safety` lost) | line removal (contraindicated while she sits) |

Timing is scored where it saves the brain — the first-aid window and hyperbaric oxygen before the outcome (above).
Every act with a harm text costs points (KIT §3.15c, measured above): thrombolysis and heparin lose the critical
`rb-no-harm`; a compression before the chest film loses the critical `rb-hbot-given`, even when it is repeated properly
afterwards; and since review round 2 the air-entry and positioning harms that were only flagged before — the line
removed before decision 1, sitting her up after the removal until she has had hyperbaric oxygen (afterwards it is not
contraindicated), a head-down tilt after the collapse, and since review round 3 an upright removal (the line taken out
after she was sat up and before she was laid flat or tilted: `remove-line`'s `contraindicatedWhen` reads the order of
`sit-up`, `lie-flat` and `head-down-tilt` with `inOrder`) — lose `rb-air-entry-safety`, which counts only attempts made
while the act was contraindicated (`{intervened, valid: false}`; the CMCR_CASES "Known limits" note on ordering
predates that condition). The head-down tilt is **indicated** in the ward phase (for the removal) and contraindicated
after the collapse — a deliberate contrast. A harm text is shown to the learner as soon as the act is done, so the ones that can come before a
decision (the early or upright removal before decision 1; head-down or sitting up before decision 2) do not state
that decision's answer (review round 3).

**Safety outcome.** IV thrombolysis (`alteplase`, high risk) is `critical: true`: given five days after intrathoracic
surgery, for gas rather than clot, it risks life-threatening bleeding at the operation site or in the brain, so
giving it fails the run's safety outcome whatever the score, and the critical avoided-harm item `rb-no-harm` records
it. Therapeutic heparin (moderate risk, contraindicated throughout) also costs `rb-no-harm` but, as a recoverable
misjudgement (it can be stopped and reversed), does not fail the safety outcome by itself; nor do hyperbaric oxygen before the pre-compression chest film (moderate risk; it costs `rb-hbot-given`), sitting her up
before hyperbaric oxygen, a head-down tilt after the collapse or removing the line before decision 1 or with her sitting
up (low risk; each costs `rb-air-entry-safety`) — all flagged.
Rapid-sequence intubation is high risk but never contraindicated here (the report records it), so it carries no
`critical` flag.

## Reference path (`solution`)

60 steps: start → 11 ward history items (5 of them unrecorded, which she cannot answer) → earlier echo, operation
note and line record ordered and read → decision 1 → head-down tilt → line removed (→ `collapse`) → responsiveness →
call for help, seal the site, lay her flat, non-rebreather oxygen → breathing, convulsions, central pulse, pupils,
neck site → monitor → glucose ordered (no recorded result) → decision 2 → IV access, benzodiazepine, blood gas
ordered → removal record read → hyperbaric physician → intubation → ICU transfer (→ `icu`) → airway check → decision 3
→ chest film ordered (no recorded result) → the relative (who, what they were told, worry, her medicines) →
hyperbaric oxygen (into the chamber) → head CT read → decision 4 → incident report, rehabilitation → decision 5 →
family meeting (→ `followup`) → outcome record read → finish. It scores **31/31** with no contraindicated act;
`cases verify` passes, and the offline demonstration finishes with every objective at the clinical score in
clinical and in-world mode, in both languages.

## Clinical numbers check

Every value is version 1.0.0's, unchanged; no vital sign, reference range, dose or timing of the report has been
added. Extraction map (1.0.0 field → 1.1.0 field):

| Fact (as recorded) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 51-year-old woman | `patient.age`, `sex` | `patient`, title |
| First sought care for hands white and painful in the cold (双手遇冷发白疼痛就诊) | `history.pmh` | `history.hands`, triage note, patient tag |
| ASD and pulmonary hypertension found on assessment; earlier echo: 房间隔缺损及肺动脉高压 | `history.pmh`, `investigations.echo` | `history.heart-history`, `echo-earlier` (ward, collapse, icu) |
| Thoracic sympathectomy (胸交感神经链切断术) | `history.operations` | `history.operation`, `operation-note`, title, phase `ward` |
| Right internal jugular line removed on post-operative day 5 | `history.operations` | `history.line-today`, `history.neck-line`, `line-record` (ward), opening line, chief complaint |
| Removal lying flat (平卧), pressure about 1 minute, ordinary adhesive tape (普通胶布覆盖) | `history.prior`, `investigations.procedure` | `line-record` (collapse, icu), `exam.line-site`, `remove-line` response |
| About 3 minutes after removal, on sitting up, the event | `history.onset`, `investigations.procedure` | phase `collapse` description, `line-record`, decision 2 prompt |
| Unresponsive (呼之不应 / 叫不应), rapid short breathing (呼吸短促 / 呼吸急), convulsions (抽搐) | `exam.exam-1`, `history.presentation` | `exam.responsiveness`, `exam.breathing`, `exam.convulsions`, `nonVerbalReason`, `history.relative-told` |
| Central pulse palpable (大动脉搏动可触及) | `history.associated` | `exam.central-pulse` |
| Pupils equal; right light reflex sluggish (双瞳孔等大，右侧光反应迟钝) | `exam.exam-2` | `exam.pupils` (右侧对光反射迟钝), decision 4 prompt |
| Oxygen, then intubation | `history.progression` | `exam.icu-support`, `oxygen-nrb` and `intubation` responses, phase `icu` |
| Emergency head CT: intracranial air embolism | `investigations.ct` | `head-ct` (icu) |
| Respiratory support, hyperbaric oxygen, rehabilitation | `investigations.outcome` | `outcome` (followup), `hbot` response |
| Alert next day with severe left hemiplegia (zh 左侧重瘫); improving; independent walking by about day 35; no longer follow-up | `investigations.outcome` | `outcome` (followup: 左侧重度偏瘫), debrief |
| The report discusses several mechanisms without direct observation of the route | decision `safety` (option and feedback) | `outcome` record, decision 4 feedback, debrief |
| Air volume, dynamic shunt evidence, long-term cognition not recorded | `unknowns` | `unknowns`, echo and CT notes |
| Setting `icu`; "acutely unconscious and intubated" | `setting`, `nonVerbalReason` | phase `icu`; the ward start and `nonVerbalWhen` by phase are adaptations (below) |

No derived values: the report as extracted gives no measurement (no vital sign, blood value, pressure or ventricular
size). Doses in the case are guideline formulas, not the report's: lorazepam 0.1 mg/kg IV (max 4 mg), diazepam
0.15–0.2 mg/kg IV (max 10 mg), midazolam 10 mg IM for > 40 kg (AES 2016; each read in the AES algorithm itself in review round 2); alteplase 0.9 mg/kg (max 90 mg, a trap);
oxygen 15 L/min by non-rebreather mask, FiO₂ 1.0 once intubated. No weight is recorded, so no dose is computed.
"At least 24 hours" (dressing) and "about 30 minutes" (lying flat) in decision 1's key are the Pennsylvania Patient
Safety Authority's recommendations (Feil 2012, read in full in review round 2); WS/T 433—2023 §6.8.4 also requires a CVC
puncture site to stay sealed for 24 hours after removal.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "What went through your head when she stopped responding about three minutes after the line came out, as she sat
   up?"
2. **Description** — "Take me through the line removal you planned, then the first minute after she stopped responding:
   what did you do, in what order, and why?"
3. **Analysis**
   * "Why does it matter where the puncture is relative to her heart, and what does breathing in do at that moment?"
   * "What did her atrial septal defect and pulmonary hypertension add to your worry before you touched the line?"
   * "What did sitting up change for the neck vein — and why did a minute of pressure and ordinary tape not protect her?"
   * "If her CT had been clear, what would you have done?"
   * "Why 100 % oxygen, why horizontal, and why is head-down no longer advised?"
   * "What must be checked before compression five days after chest surgery?"
   * "Which side was the line on, which pupil was sluggish — and what can that tell you about the route, and what not?"
   * "Her relative asked whether taking the line out caused this. What did you say, and what did you leave out?"
4. **Summary** — "What will you do differently the next time you take out a neck line — and the next time someone
   stops responding just after one comes out?"

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it | Where it scores |
|---|---|---|
| Removing the line routinely (brief pressure, ordinary tape, up at once) or sitting up with a deep breath in | decision 1 distractors; `remove-line` flagged before decision 1 and when she was sat up for it; `sit-up` flagged from the removal until hyperbaric oxygen | `rb-line-removal`; `rb-air-entry-safety` (removal before decision 1 or sitting up, sitting up afterwards) |
| Treating the collapse as a faint, a stroke for lysis, a PE or a first seizure | decision 2 distractors; `alteplase` and `heparin` always contraindicated | `rb-recognition`, `rb-no-harm` (critical; alteplase fails the safety outcome) |
| Scanning before first aid; leaving the site unsealed; leaving her sitting | decision 2 key ("no scan first"); the CT has no result before ICU; objective 2 ("The first minutes") | `rb-first-minute` (critical; counted only before the ICU transfer) |
| Head-down "to keep air from the brain" | `head-down-tilt` contraindicated after the collapse (indicated before removal); decision 3 distractor. Learners may quote the 2012 Pennsylvania advisory, which the case cites for the removal technique: its emergency advice is a left side-lying head-down position; Moon (UHMS 2019) no longer recommends head-down for gas embolism, and the case follows Moon | `rb-air-entry-safety`; `rb-hbot-plan` |
| Waiting for a CT to decide on hyperbaric oxygen, or giving steroids first | decision 3 distractors | `rb-hbot-plan`, `rb-hbot-given` (critical) |
| Compressing without excluding a pneumothorax after chest surgery | `hbot` contraindicated without the chest film; decision 3 key | `rb-hbot-plan`; `rb-hbot-given` (critical) is lost by any compression before the film |
| Over-reading the echo or the pupil sign as proof of the route; urgent ASD closure | decision 4 distractors (ESC 2020 ACHD) | `rb-route` |
| Concealment, delay or blaming the patient | decision 5 distractors; examiner item | `rb-candour`, `rb-communication` |
| Inventing the unrecorded (vital signs, glucose, CT details, HBOT pressure) | unknown items, no-result records, `examNotRecorded` | — |

## Embodied mode

* **Where she is.** Ward bed 1 (`inpatient`) at the start; the `collapse` phase stays there. The ICU transfer moves her
  to ICU bed 1 (`destination` and the `icu` phase `location`). Hyperbaric oxygen is a disposition with
  `destination: { capability: "hyperbaric-oxygen" }` and `requires: ["hyperbaric-oxygen"]`: the team moves her into
  the ICU's monoplace chamber (by the ICU door) when it is given, and the capability keeps the case out of a facility
  without a chamber. No study moves her: the CT is an existing report (`requires: ["records"]`), the chest film and
  bedside echo are bedside studies with no recorded result.
* **Posture.** She lies in bed before the removal (supine removal, as recorded); `remove-line` leaves her sitting —
  in the report she sat up about 3 minutes later — so the collapse finds her sitting until the learner lays her flat
  (`lie-flat`, `lying`). `head-down-tilt` and the ICU transfer also leave her lying; `sit-up` sits her up (before the removal, the removal is
  then contraindicated until she is laid flat or tilted again).
* **Kit.** The ward bed has an oxygen outlet (non-rebreather mask shown on the face) and a monitor; the crash cart
  provides airway, suction and cannulation kit; the glucometer and ECG carts are on the ward; drugs are delivered.
  IV access is a procedure (`iv-access`), no line is in situ (`extensions.embodied.ivAccessInSitu: false`).
* **Who speaks.** On the ward she is alert and answers for herself (`speaker: "patient"` on every ward item). From the
  collapse she cannot speak (`nonVerbalWhen` = `collapse` or `icu`; reason "suddenly unresponsive after the line came out, then intubated"). In ICU her relative answers the ICU items in the relative's own voice (`companion.answersHistory:
  true`; the ICU items carry no `speaker`). The per-case check notes that a 51-year-old with an answering companion
  should be justified: the companion answers only while she cannot speak — every item she can answer is hers. In the
  `followup` phase she is no longer marked non-verbal, but no item is available there (her later speech is not
  recorded).
* **Scope of practice.** Line removal, sealing the site, oxygen, positioning, monitoring and drugs follow their kinds
  or `scope: "nursing"`; intubation and hyperbaric oxygen are medical; consultations and transfers are clinician acts.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-561144:"` passes in en and zh-CN (every objective done,
  in-world score equal to the clinical score).

## Source and adaptation (fidelity limits)

**From the report, via version 1.0.0 (kept as fact).** Every fact in the extraction map above: her age and sex, the
hands, the ASD and pulmonary hypertension and the echo, the sympathectomy, the right jugular line and its removal on
day 5 (flat, about 1 minute of pressure, ordinary tape), the event about 3 minutes after the removal, on sitting up
(unresponsive, rapid short breathing, convulsions, palpable central pulse, equal pupils with a sluggish right light
reflex), oxygen and intubation, the emergency CT, respiratory support, hyperbaric oxygen, rehabilitation, the
next-day state and walking by about day 35, and the statement that the report discusses several mechanisms.

**Adapted for teaching.** The ward start before the removal (1.0.0 began after the event, in ICU; where the removal
happened is not recorded; that she was alert and able to answer before it is inferred from 1.0.0's "suddenly
unresponsive" / 突然叫不应 "when she sat up" / 坐起来时, not recorded as such); her lay words and her worries (labelled as part of the role; they add no fact); the
relative in ICU (no relative is recorded; the relationship is "not recorded") and the relative's words and worries;
the staff (Dr Meng, Nurse Shao, Dr Gan, Dr Li); the ICU transfer as a step; the emergency head CT shown in the ICU phase (1.0.0 does not record when it was done); the decisions, interventions, rubric,
feedback, teaching points and doses (current guidance). The `remove-line` act follows the report whatever the learner
planned, and says so.

**Inconsistencies and editorial wording in 1.0.0, kept or corrected — not resolved by invention.**
* 1.0.0 wrote 左侧重瘫 in Chinese and "severe left hemiplegia" in English; this version writes 左侧重度偏瘫 (matching
  the English) and lists the original wording to verify.
* The breathing descriptor: 呼吸急 / "breathed rapidly" (history) and 呼吸短促 / "short rapid breathing" (exam); the
  case uses 呼吸短促 / "short, rapid breaths" and lists the exact wording to verify.
* 1.0.0's removal record said "brief pressure and non-airtight coverage" — an editorial judgement; the case keeps the
  recorded "about 1 minute" and 普通胶布 and moves the judgement into feedback and teaching points (survey finding).
* 1.0.0 filed the palpable central pulse under "associated symptoms" and the oxygen and intubation under
  "progression"; they are now an examination finding and the ICU state.
* "About day 35" has no stated reference point (from the event, the operation or admission?).
* "The collapse" (the ids `collapse` and `collapse-action`, and this guide) is a label for the event — sudden
  unresponsiveness with rapid breathing and convulsions as she sat up. 1.0.0 records no fall; the learner-facing
  English says "stopped responding" / "the event", as the Chinese says 失去反应 / 出事 (review round 3).
* The several-mechanisms statement appears in 1.0.0 only in a decision option and its feedback.
* 1.0.0's `authorChecks` booleans (`sourceValuesRetained`, `mediaAwaitingPrivacyReview`…) and its claim that the
  source contains two examination findings could not be verified; they are removed.

**Not recorded and kept unknown** (`unknowns`, unknown history items, no-result records, `examNotRecorded`): every
vital sign, the Glasgow score and glucose; the echo details (ASD type and size, shunt direction, pulmonary pressures,
date, bubble study); the operation details, chest drains, any pneumothorax or chest film, when and why the line was
inserted; who removed it, where, any breath-hold or tilt, whether she sat up unaided; the volume of air; the CT
timing, site, distribution and amount of gas, any repeat imaging; the HBOT delay, chamber, pressure, sessions;
other drugs, ventilation time, extubation; the seizure type and duration; residual deficits, cognition, discharge
and the plan for the ASD; her medicines, allergies, fits or diabetes, family history.

**Wording of unknowns (STANDARD §6.3).** Because the article has not been checked, no text claims that the *report*
lacks something: no-result records say "No result is recorded for this test" / "此项检查没有结果记录", steps the case
does not record say "This case does not record whether…; it does not simulate its effect", `examNotRecorded` says
"This case does not record this examination." / "本病例没有记录这项检查。", and the patient and relative answer unknowns
in lay words ("I'm not sure, doctor." / "这个我说不上来，医生。").

**Survey audit findings applied.** The critical item moved from a hindsight route question to two acts (first-minute
measures; hyperbaric oxygen), each scored in its time window, and a critical avoided-harm item (F0); recognition and first aid no longer locked behind the CT
(F1, F21); 19 interventions with harm logic (F2); forward-only ward → collapse → ICU → follow-up phases (F3); realistic
distractors (F4, F5) and a separate hyperbaric decision with pre-compression checks (F5); the route question reworded,
placed before the outcome and given its clinical consequences (F6); a removal-technique decision (F7); case-specific
history, named bedside examination, single-test investigations with aliases (F8–F10); four staff (F11); the relative's
voice without meta-language and with an unrecorded relationship (F12); citations rebuilt (F13); outcomes, key reasoning
and teaching points rewritten (F14); rubric (F15); spoiler-free card (F16); review governance per STANDARD §6.6 and the
`authorChecks` removed (F17); one media status (F18); grounding of "brief/non-airtight" (F19); terminology (F20, e.g.
适应证, 对光反射, "a 51-year-old woman"); README rebuilt (F22); hyperbaric oxygen in-world via the ICU chamber (F23);
utterances (F24); objectives (F25); unknowns enumerated (F26); the hands with pulmonary hypertension raised only as
reasoning in the attending's brief (F27). Not applied: the suggested descriptive CT text (site, distribution, amount)
— 1.0.0 records none, so the result keeps the report's wording with a note; the suggested `unreviewed` status — the
standard's §6.6 status (`editorial`, with the §6 notes) is used instead.

**Privacy.** Pseudonym 华清和 / Hua Qinghe (unchanged from 1.0.0); no hospital, date, place or occupation; relative
time only. **Figures.** `fig01.png` is approved in `scripts/cmcr-105-media-review.json` (checksum unchanged); it is
attached only to the outcome record in the follow-up phase, with a neutral title in both languages ("Report figure 1
(for the debrief)"), because its content and legend are not described in 1.0.0. The source PDF is not displayed.

### To verify

Details to look for in the full article (the source check is pending):
* The indication for the sympathectomy and the diagnosis named for the hands (Raynaud's phenomenon or syndrome?); any
  connective-tissue disease work-up; how and when the ASD and pulmonary hypertension were found.
* The echocardiogram verbatim: ASD type and size, shunt direction, pulmonary pressures with units, date relative to
  surgery; any bubble study.
* The operation: approach (thoracoscopic?), side and levels, anaesthetic; chest drains; any post-operative pneumothorax
  or chest film; when and why the right jugular line was inserted.
* Where the removal happened (ward or ICU), who removed the line, the exact sequence (breath-hold, head-down tilt),
  the dressing (ordinary tape alone or over gauze), whether she sat up unaided.
* The event as recorded: 呼吸急促 or 短促, the convulsions (generalised or focal, duration), any heart rate, blood
  pressure, SpO₂ or Glasgow score, pupil sizes, limb findings, glucose.
* Immediate management: oxygen device and flow, positioning, sealing of the site, timing and drugs of intubation,
  anticonvulsants, the ICU transfer.
* The head CT: time after the event and the verbatim report (site, distribution, amount); any repeat CT or MRI; the
  fig01 legend (which images, which stage).
* Any other tests (blood gas, chest film, ECG, repeat echo, blood values with reference ranges).
* Hyperbaric oxygen: delay from the event, chamber type, pressure as printed (MPa or ATA), session length and number,
  ventilation in the chamber, complications.
* Other treatments with doses (dehydrating agents, corticosteroids, neuroprotective or anticonvulsant drugs).
* ICU course: duration of ventilation, extubation, recurrent seizures.
* Outcome: the wording behind 左侧重瘫 and any power grades; the reference point for "about day 35"; discharge, residual
  deficits, cognition, follow-up, any plan for the ASD.
* The authors' discussion of mechanisms (paradoxical, retrograde, transpulmonary) and their prevention advice; 1.0.0
  states only that several mechanisms are discussed without direct observation.
* Medication context (anticoagulation, antiplatelets, insulin), family communication and incident reporting.

Guidance details still to confirm (review round 2 read the full texts of Moon 2019, ECHM 2016, Feil 2012, WS/T 433—2023,
the GMC/NMC candour guidance and Decree No. 701; what follows could not be read here):
* INS Infusion Therapy Standards of Practice, 9th edition (2024): the removal and air-embolism standards (a secondary summary gives Standard 49, "Air Embolism"). The publisher's text is paywalled here and third-party copies were not used,
  so the case now attributes the removal steps to the Pennsylvania advisory (Feil 2012) and the 24-hour seal to
  WS/T 433—2023 §6.8.4; cite INS again only once its wording (position, Valsalva or breath-hold, petroleum-based dressing
  and its duration, time lying flat) has been read.
* Moon and Mitchell 2025 (Undersea Hyperb Med 52(1):41-53; by its title the 15th edition's chapter 1, though the
  front matter read here does not name that chapter's authors): its abstract restates the imaging, hypocapnia and oxygen-then-HBOT statements (cited beside Moon 2019); confirm
  in its full text the statements still cited to the 2019 text alone — head-down no longer recommended, the recovery
  position, a chest tube before monoplace treatment, the adjunct classes (anticoagulants IIb, corticosteroids III), low-molecular-weight heparin as
  thromboprophylaxis after 24 hours' immobility (class I) and time to treatment.
* The 2026 Chinese Nursing Association expert consensus on CVAD removal nursing (中华护理杂志 2026;61(9):1157-1162,
  doi:10.3761/j.issn.0254-1769.2026.09.001): only its abstract was reachable; a current Chinese source on position and
  breathing at removal to compare with decision 1's key.
* ECHM 2016: whether an eleventh ECHM consensus supersedes it (gas embolism Type 1, Level C, confirmed in its text).
* Chinese hyperbaric indications: a 2013 list of 中华医学会高压氧医学分会 was found; a 2018 version could not be
  confirmed, so none is cited.
* AHA/ASA 2026 AIS guideline (Stroke 2026;57(8):e316-e436, PMID 41582814; it replaces the 2018 guideline and its 2019
  update): the wording and window for recent major surgery (a secondary excerpt gives non-CNS surgery within 10 days,
  weighed individually). Its text could not be read here, so the case no longer cites it for that point.
* ESC/ERS 2022 pulmonary hypertension: its shunt-closure recommendations for PAH with congenital heart disease (the page
  text was cut before that section); the closure criterion is attributed to ESC 2020 ACHD, whose text holds it. No later
  ESC edition of the PE (2019), ACHD (2020) or PH (2022) guideline exists (ESC Congress 2026 issued heart failure, cardiac
  rehabilitation and CVD–CKD guidelines).
* The 2025 ACC/AHA adult congenital heart disease guideline (Circulation 2026;153(8):e115-e251,
  doi:10.1161/CIR.0000000000001402): its PVR thresholds for ASD closure in pulmonary hypertension (not cited in the case).
* Bothma and Schlimp 2014 has no abstract and its full text was not read (the publisher refused access again in review
  round 3): it is cited only for the mechanism its title names (retrograde cerebral venous gas embolism); the focal
  signs of arterial gas are cited to Moon 2019. Confirm that the editorial describes the upright posture and the
  neurological presentation the case attributes to that mechanism.
* Corticosteroids: class III (level C) in Moon 2019's adjunct list; the case says only that they have no proven role.
* Clinician input: an intensivist and a hyperbaric physician should review decisions 2–3 (positioning — the case follows
  Moon 2019's horizontal position, not the left side-lying head-down position of the 2012 Pennsylvania advisory — the
  benzodiazepine step, pre-compression checks) and an adult congenital cardiologist decision 4.

## Matcher notes

* 56 `extensions.testUtterances` (27 zh-CN, 29 en; 3 look-alike negatives), none equal to a canonical question or a
  keyword; every required item is covered. `cases verify`: 56/56, no extra selections.
* **Plain openers (review round 2).** `scripts/case-check.ts` probes plain opening questions in the first phase; nine
  reached no item. `line-today` now carries them (en run together: `whathappened`, `whatstheproblem`, `beengoingon`,
  `goingon`, `howlong`, `whendiditstart`…; zh 怎么了, 这次怎么了, 哪里不舒服, 怎么回事, 有什么不舒服, 多久了,
  什么时候开始, 情况怎么样) with topic exclusions (hands, heart, medicines, allergies, family, chest, fits, diabetes, and
  the line's insertion: `put in`, `been in`, 放了多久, 什么时候放) so the specific items still win; in ICU the same
  openers reach `relative-told` (`whathappened`, `goingon`, 怎么回事, 发生了什么, 怎么了). Lay examination words were
  added (awake, `hearme`, rouse; fit, 在抽, 抽吗). 59 history and 16 examination probes in both languages, beyond the test utterances, reach the intended item.
* **New wordings (review round 2, second session).** A further 52 history and 15 examination probes in new words
  found 14 more gaps, three of them reaching the wrong item: 你的手怎么了 and "How long have you had the drip in your
  neck?" reached `line-today` (its openers), and "Is the line coming out today?" reached `ice`. Fixed with keywords
  and exclusions — `line-today` ("line coming out today"; excludes worry and question words, `hadtheline`…, and
  你的手, 手怎么, 双手, 手冷, 变色), `hands` (你的手, 手怎么, 手冷, 变色), `neck-line` ("drip in your neck", `hadtheline`…),
  `ice` (questions), `medications` (哪些药, 什么药), `relative-who` (husband, wife, son, daughter…; 丈夫, 爱人, 儿子…),
  `relative-told` (`theytellyou`), `relative-worry` (最怕, 怕什么) and the examination words "open your eyes" / 睁眼,
  睁开眼 (responsiveness; the pupils exclude `openyoureyes`), shaking, twitching and "line came out" — and the English
  `ice` question no longer repeats "the line coming out today", so a plain question about the plan does not select it.
  All 134 probes reach the intended item; six of them became test utterances.
* **New wordings (review round 3).** 87 further history and examination probes and 17 intervention orders in new
  words (the reviewer's own scripts) found 14 gaps: "What brings you in?", "What brings
  you here?", "Why are you here?", "Why are you in hospital?" and "What were you admitted for?" reached no ward item;
  "Did you have a tube in your chest after surgery?" reached `operation`; in ICU "What do you understand about her
  condition?" and "Is there anything you're scared of?" reached nothing; the examination request "Shake her and shout
  her name" reached `convulsions`, and 她醒着吗, 她喘得厉害吗 and 有没有脉 nothing; "Roll her onto her side" no
  intervention; and an order for low-molecular-weight heparin prophylaxis (低分子肝素预防血栓) resolved to the
  therapeutic-heparin trap, costing the critical `rb-no-harm` for the thromboprophylaxis Moon 2019 recommends (class I).
  Fixed with keywords (`line-today`: `brings`, `inhospital`, `admitted`, `herefor`, `whyareyouhere`;
  `chest-after-surgery`: chest tube; `relative-told`: understand; `relative-worry` and `ice`: scared; examination:
  shout, `shakeher`, 醒着, 喘得, 有脉…; `lie-flat`: `ontoherside`) and exclusions (`operation`: tube; `convulsions`:
  `shakeher`; the non-rebreather: hyperbaric, chamber, 高压氧; the heparin trap: low molecular, LMWH, prophylaxis,
  enoxaparin…, 低分子, 预防), and five test utterances. All 87 + 17 now reach the intended item (or, for the
  prophylaxis order, no trap); the 134 probes of round 2 still do.
* **Ward and ICU items must not compete:** `cases verify` ranks the expected item against items of every phase, so the
  ICU relative's medicine/allergy item answers only questions about *her* (zh keywords with 她; en run-together
  `shetakes`, `doesshehave`, `herallergies`…), and the ward `medications` and `allergies` items exclude 她 and those
  forms. `relative-told` and `line-today` share the plain openers, which is safe because they are never available in the same
  phase in play; `cases verify`, which ranks the items of every phase together, reports no extra selection for the
  test utterances that use them (这次是怎么回事 → `line-today`, 发生了什么 → `relative-told`).
* **Other overlaps separated with `excludeKeywords`:** `line-today` vs the operation; `heart-history` vs family
  history; `operation` vs the chest drain and the neck; `neck-line` vs chest drains and the breathing tube;
  `chest-after-surgery` vs the neck; `medications` vs allergies.
* English multi-word keywords that reduce to one token were written run together (`howareyou`, `howarethings`,
  `whatdoyouknow`, `knowher`, `whichop`, `sofar`, `explainedtoyou`; interventions `onherside`, `sitherup`,
  `tellthefamily`), as `cases validate` requires.
* Orders: the CT is named "Head CT" (no diagnosis; its result is the emergency CT report); the earlier echo ("Echocardiogram report (earlier)") and
  the bedside echo ("Bedside echocardiogram (with bubble study)") have distinct aliases; short aliases that are
  substrings of other words were avoided.
* Interventions: "oxygen" reaches the non-rebreather, "lie flat"/"recovery position" the horizontal positioning,
  "head down"/"trendelenburg" the tilt, "tpa" the thrombolysis trap, "hbot"/"recompression" the chamber; "hyperbaric"
  never reaches the non-rebreather and a prophylactic low-molecular-weight heparin order never reaches the therapeutic
  heparin trap (review round 3).

## References

1. 宗酉明, 郁慧杰, 王海波. 中心静脉导管拔管后致脑空气栓塞一例. 中华医学杂志. 2014;94(11):880.
   doi:10.3760/cma.j.issn.0376-2491.2014.11.023. Available from: https://rs.yiigle.com/cmaid/561144
2. Moon RE. Hyperbaric treatment of air or gas embolism: current recommendations. Undersea Hyperb Med.
   2019;46(5):673-683.
3. Mathieu D, Marroni A, Kot J. Tenth European Consensus Conference on Hyperbaric Medicine: recommendations for accepted
   and non-accepted clinical indications and practice of hyperbaric oxygen treatment. Diving Hyperb Med.
   2017;47(1):24-32. doi:10.28920/dhm47.1.24-32
4. Moon RE, Mitchell SJ. Hyperbaric treatment of air or gas embolism: current recommendations. Undersea Hyperb Med.
   2025;52(1):41-53.
5. Feil M. Reducing risk of air embolism associated with central venous access devices. Pa Patient Saf Advis.
   2012;9(2):58-64.
6. 中华人民共和国国家卫生健康委员会. WS/T 433—2023 静脉治疗护理技术操作标准. 2023.
7. Bothma PA, Schlimp CJ. Retrograde cerebral venous gas embolism: are we missing too many cases? Br J Anaesth.
   2014;112(3):401-404. doi:10.1093/bja/aet433
8. General Medical Council, Nursing and Midwifery Council. Openness and honesty when things go wrong: the professional
   duty of candour. London: GMC; 2015 [updated 2024 Dec 13].
9. 中华人民共和国国务院. 医疗纠纷预防和处理条例（国务院令第701号）. 2018.

These nine strings are `debrief.references`. Also named in the case's feedback and checked as described below:
Undersea and Hyperbaric Medical Society. Hyperbaric medicine indications manual. 15th ed. Huang ET, editor. Best
Publishing Company; 2023 · Glauser T, Shinnar S, Gloss D, et al. Evidence-based guideline: treatment of convulsive
status epilepticus in children and adults: report of the Guideline Committee of the American Epilepsy Society. Epilepsy Curr. 2016;16(1):48-61. doi:10.5698/1535-7597-16.1.48 · Konstantinides SV, Meyer G, Becattini C, et al. 2019 ESC Guidelines for the diagnosis and
management of acute pulmonary embolism developed in collaboration with the European Respiratory Society. Eur Heart J.
2020;41(4):543-603. doi:10.1093/eurheartj/ehz405 · Baumgartner H, De Backer J, Babu-Narayan SV, et al. 2020 ESC
Guidelines for the management of adult congenital heart disease. Eur Heart J. 2021;42(6):563-645.
doi:10.1093/eurheartj/ehaa554 · Humbert M, Kovacs G, Hoeper MM, et al. 2022 ESC/ERS Guidelines for the diagnosis and
treatment of pulmonary hypertension. Eur Heart J. 2022;43(38):3618-3731. doi:10.1093/eurheartj/ehac237. No longer cited
since review round 2 (their texts could not be read here; see To verify): the INS Infusion Therapy Standards of Practice,
9th edition (J Infus Nurs. 2024;47(1S Suppl 1):S1-S285), the AHA/ASA 2026 acute ischaemic stroke guideline and the 2022
NEJM review by Mitchell, Bennett and Moon.

**How they were checked (2026-10-30).** PubMed, the publishers' and DOI resolvers' pages could not be fetched from
this environment, so each item was confirmed by web search against indexing records: Moon 2019 (PubMed 31683367 record; abstract statements on imaging and hypocapnia — the head-down statement is in the full text, not the abstract; see round 2), Moon and Mitchell 2025 (Duke
Scholars record; content not seen), the UHMS manual (UHMS front matter: 15th edition, 2023, editor Huang ET, chapter 1
air or gas embolism), ECHM (PMC6147240; DOI in the record; gas embolism listed as Type 1), Mitchell 2022 (DOI in the
record), INS 2024 (PubMed 38211609; DOI cited by the record), WS/T 433—2023 (published 2023-08-29, in force
2024-02-01, replacing WS/T 433-2013), Bothma 2014 (DOI cited by citing articles), GMC/NMC (GMC page: published 29 June
2015, updated 15 March 2022), Decree No. 701 (gov.cn: adopted 20 June 2018, in force 1 October 2018; Articles 13 and
17), AES 2016 (PMC4749120 and algorithm reproductions), AHA/ASA 2026 (AHA professional page and DOI), ESC 2019 PE and
ESC/ERS 2022 PH (institutional repository records with DOIs), ESC 2020 ACHD (journal pages from a secondary summary;
DOI not seen, so not given), Feil 2012 (NLM collection record; pages not seen). The source article's DOI is the one
verified in `scripts/cmcr-105-sources.json` (publisher check 2026-10-29). The 1.0.0 reference "UHMS. Hyperbaric
treatment of air or gas embolism: current recommendations. 2019" with a `/fr/` URL was a journal article, not a UHMS
guideline; it is now cited in Vancouver form, and the bare yiigle URL is part of the source citation. The independent
review of 2026-11-13 re-read every citation against this log but could not repeat the web checks; it added no
new reference, and the items under "To verify" remain open.

**Review round 2 (2026-11-14).** Read in full: Moon 2019 (the UHMS PDF of the 14th-edition chapter), ECHM 2016 (PMC
full text: gas embolism Type 1, Level C; nothing on pneumothorax), Feil 2012 (the advisory PDF, pp 58-64: 24 reports,
"head elevated during removal" the most frequent factor, and the removal recommendations), WS/T 433—2023 (the NHC PDF: of the four removal clauses of §6.8 only §6.8.4 — check the catheter's integrity and keep
a PICC or CVC puncture site sealed for 24 h — concerns the site; none covers position, breathing or time lying flat), the GMC/NMC candour guidance (NMC PDF: in effect 29 June 2015, last updated
13 December 2024), Decree No. 701 (gov.cn: Articles 13 and 17), the ESC 2019 PE guideline's Table 10 and the ESC 2020
ACHD text on ASD closure (publisher pages), the UHMS 15th-edition front matter (© 2023, ISBN 978-1-947239-42-5) and
the PubMed records of Moon and Mitchell 2025 (abstract), Bothma 2014, Mitchell 2022 and INS 2024 (bibliographic). The round's second session also read the AES 2016 algorithm itself (PMC4749120, figure 1: IM midazolam 10 mg above
40 kg, IV lorazepam 0.1 mg/kg to 4 mg or IV diazepam 0.15–0.2 mg/kg to 10 mg, each IV dose repeatable once, all
Level A; DOI 10.5698/1535-7597-16.1.48) and the PubMed record of Moon and Mitchell 2025 through NCBI E-utilities (its
abstract: imaging cannot exclude, no benefit of induced hypocapnia in animal studies, oxygen then hyperbaric oxygen),
and confirmed that ESC Congress 2026 issued no new PE, ACHD or PH guideline. Not readable here: INS 2024, the AHA/ASA
2026 guideline, the full text of Moon and Mitchell 2025 and the ESC/ERS 2022 shunt-closure section (see To verify).

**Review round 3 (2026-11-14).** Re-read from the texts saved in round 2, against every statement the case attributes:
Moon 2019 (imaging; first aid; head-down no longer recommended; supine or recovery position; definitive HBO2 and the
delay; the chest tube before monoplace treatment, stated for a pneumothorax; USN Table 6; the adjunct classes; LMWH
prophylaxis class I; hyperglycaemia; isocapnia; focal neurological deficits as a manifestation of arterial gas), the
abstract of Moon and Mitchell 2025, Feil 2012 (Valsalva or expiration; pressure to haemostasis, one to five minutes;
occlusive petroleum gauze and film for at least 24 hours, plain gauze letting air through a persistent tract; flat
for 30 minutes; head elevated during removal in 6 of 24 reports; and its own emergency advice of a left side-lying
head-down position, which the case does not follow), WS/T 433—2023 §6.8, ECHM 2016 (Type 1, Level C), the candour
guidance (last updated 13 December 2024) and Decree No. 701 (Articles 13 and 17). Currency searches: no newer GMC/NMC
candour revision, no eleventh ECHM consensus and no 16th edition of the UHMS manual were found, and ESC Congress 2026
issued heart failure, CVD–CKD and cardiac rehabilitation guidelines only. Bothma and Schlimp 2014: the DOI resolves to
the publisher, which refused access, so its attribution was narrowed (To verify).

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Safety and validity (survey audit of this case).** The encounter now starts before the line comes out, so the two
  real decision points exist: how to remove a jugular line in a patient with an ASD and pulmonary hypertension, and
  what to do in the first minute of the collapse. Recognition and first aid open on any bedside step and no longer wait
  for a CT that states the answer; hyperbaric oxygen is a decision of its own with its pre-compression checks and is
  decided before the CT is read. The critical items are now acts (seal, flat and oxygen at the collapse; hyperbaric
  oxygen before the outcome) instead of a route question answered after the outcome. The tempting errors are playable
  and flagged (lysis, heparin, sitting up, head-down after the collapse, compression without the chest film).
* **Voice.** On the ward the patient answers for herself; in ICU a relative (teaching role, relationship not
  recorded) answers in lay first person; no answer mentions "the source".
* **Spoilers.** Title, summary, triage note and tags no longer name central-line removal followed by seizures; the CT
  has a neutral name and no result before ICU.
* **Structure.** Phases `initial`/`workup`/`followup` → `ward`/`collapse`/`icu`/`followup`; 15 template history items →
  15 case-specific items (8 template unknown slots removed); exam 2 → 7 named manoeuvres; investigations 4 → 11
  (single tests; 6 with no recorded result); interventions 0 → 19; decisions 3 → 5; rubric 11 → 12 (descriptive ids);
  objectives 4 → 6; staff 1 → 4; references rebuilt in Vancouver form; governance per STANDARD §6.6
  (`sourceTextChecked: false`; `authorChecks` and `sourceTextSha256` removed until the source pass; `sourceDoi` and
  `doiVerifiedAt` added from the source map).
* **Ids changed** (none referenced outside this case): history `presentation`/`onset`/`progression`/`associated`/
  `prior` → `line-today`, `relative-told` and exam findings; `pmh` → `hands` + `heart-history`; `operations` →
  `operation` + `neck-line`; `exposure`, `function`, `redflags`, `baseline`, `concerns` removed (template slots);
  `concerns` → `ice`; exam `exam-1`/`exam-2` → `responsiveness`, `breathing`, `convulsions`, `pupils` (+
  `central-pulse`, `line-site`, `icu-support`); investigations `ct` → `head-ct`, `echo` → `echo-earlier`,
  `procedure` → `line-record`; decisions `interpretation`/`management`/`safety` → `line-removal`, `collapse-action`,
  `hbot-plan`, `route`, `disclosure`; option ids neutral (1.0.0 used `supported` and `alternative-N`).
* **Independent review (2026-11-13).** The first-aid critical item could be earned in hindsight — a learner could
  return to the `collapse` phase after reading the outcome and do the acts there — and the objective behind it held a
  phase leaf. The four acts now have a time window (the `collapse` phase, before the ICU transfer) scored with
  `whenIndicated`; their objective, now chapter 2 and shown as soon as she collapses, latches on the acts alone.
  Hyperbaric oxygen counts only when given in intensive care with the chest film ordered and before the outcome is
  read. `alteplase` is `critical: true`, `rb-no-harm` is a critical avoided-harm item, and a **Safety outcome**
  paragraph was added; the scoring table was re-measured. Wording: the English non-verbal reason (she became
  unresponsive minutes after the removal, not at it), the English conclusion now names the diagnosis as the Chinese
  does, and the pupil-sign feedback cites Bothma and Schlimp. No patient fact was added or changed.
* **Review round 2 (2026-11-14).** A fresh review traced every patient fact to 1.0.0 in both languages, read the cited
  sources' own texts where they could be reached and replayed the assessment. Found and changed: a fall or slump that
  1.0.0 never records, in a debrief question ("slumped"), twice in the 中文摘要 (倒下) and in a feedback ("severe enough
  to fell her" / 让人倒下) — removed; "about 3 minutes later" anchored to the dressing instead of the removal in eight
  strings, "whenever" / 一碰到冷就, "ventilated" / 呼吸机 / 机械通气 where 1.0.0 says respiratory support, "circulation
  preserved" and "at the very moment" — reworded to 1.0.0's facts; three harms that cost nothing (the line removed
  before decision 1, sitting her up before hyperbaric oxygen, a head-down tilt after the collapse) and a compression
  before the chest film repeated afterwards (100 %) — now the new `rb-air-entry-safety` (safety, weight 2) and a
  stricter `rb-hbot-given`; nine plain opening questions that reached no first-phase history item (the per-case check
  failed) — opener keywords, topic exclusions, lay examination words and five test utterances; citations — ECHM 2016
  credited with a pre-compression pneumothorax check it does not contain (now Moon 2019), the candour guidance cited as
  updated in 2022 (last updated 13 December 2024), INS 2024 and the AHA/ASA 2026 stroke guideline asserted although
  their texts could not be read (the removal steps now cite the Pennsylvania advisory and WS/T 433—2023 §6.8.4, both
  read; the surgical bleeding point is taught without a name), WS/T 433—2023 presented as governing the whole
  technique (it holds the 24-hour seal), the heparin harm naming no guidance and calling heparin useless for gas where
  Moon 2019 rates anticoagulants class IIb, and Moon 2019 cited alone where its 2025 update restates the point; decision
  1's key now words the breathing step as the advisory does (breath held with a Valsalva manoeuvre, or removal during
  expiration). A second session of the round found and changed: the heparin harm and the massive-PE feedback, which said
  anticoagulants are "at most" class IIb in Moon 2019 — that text also recommends low-molecular-weight heparin (class I)
  as thromboprophylaxis after 24 hours' immobility from neurological injury, so both now say that anticoagulants are
  only a class IIb adjunct for the embolism and name the prophylaxis; 14 further matcher gaps in new wordings, three
  of them reaching the wrong item (keywords, exclusions, a reworded English `ice` question, six test utterances —
  51 in all); the convulsive-syncope distractor's "first sitting up after surgery" / 术后第一次坐起, a premise 1.0.0
  does not record (now "five days after surgery" / 术后第5天); the rehabilitation response, which quoted the report's
  course in intensive care before the outcome record; the operation note's "anaesthetic record" alias (another
  record); the English conclusion's missing "suddenly" (突然 in 1.0.0's Chinese); and the README's unlabelled
  placement of the CT in the ICU phase. The AES 2016 doses were confirmed in the algorithm itself. Scores re-measured
  (31/31; do nothing 0/26; every harm costs points). No patient fact was added.
* **Review round 3 (2026-11-14).** A third fresh review traced every string again in both languages, re-read the saved
  source texts, replayed new paths and probed new wordings. Found and changed: the README attributed to the report a
  removal sequence ending "up when she likes" / 原报告的…随意坐起 (decision 1's distractor; 1.0.0 records only flat
  removal, about a minute of pressure, ordinary tape and sitting up about 3 minutes later — what she was told is not
  recorded), and its 中文摘要 tied the next-day state to the treatments (经…治疗，次日神志转清; 1.0.0 lists them); the
  relative's words "一坐起来就" / "she sat up and suddenly" narrowed 1.0.0's 坐起来时, as did the attending's "the moment
  she sat up" / 那一刻; an upright removal (sit her up, then take the line out) scored 100 % although decision 1 and
  teaching point 1 teach it as the most often reported cause — `remove-line` is now contraindicated after `sit-up` until
  she is laid flat or tilted, costing `rb-air-entry-safety`; 13 matcher gaps (plain openers "What brings you in?" and
  "Why are you here?" reached no ward item, two wordings reached the wrong item) and a low-molecular-weight heparin
  prophylaxis order that resolved to the therapeutic-heparin trap (keywords, exclusions, five test utterances — 56 in
  all); the disclosure key and the examiner guidance placed the air entry "at the removal" / 拔管时, against the case's
  own teaching and 1.0.0's 拔管后 (now "after the removal"); "collapse(d)" in English narrative where the Chinese says
  失去反应 / 出事 (now "stopped responding" / "the event"; the README label explained); the patient's "my hands go
  white" (present) for 1.0.0's past (now "would go"); 意识丧失 / 昏迷 where the English and 1.0.0 say unresponsive; the
  sit-up harm's "with the tract unsealed" (wrong once the site is sealed); three harm texts, which the learner sees
  at once, gave away answers not yet given — the early-removal harm listed decision 1's technique (so removing the line
  first, then answering, outscored an honest wrong answer), and the head-down and sit-up harms named arterial bubbles
  and air drawn in before decision 2 (now worded without the answer; the mechanism stays in the feedback and teaching
  points); and the pupil-sign feedback crediting
  Bothma and Schlimp (text unreadable) with more than the mechanism they name (the focal signs of arterial gas now cite
  Moon 2019). The attending's brief and the facilitator notes now say that the 2012 Pennsylvania advisory's emergency
  position (left side-lying, head-down) predates Moon 2019, whom the case follows. Re-measured: reference 31/31, do
  nothing 0/26, wrong first 58 %, every harm (now including the upright removal) costs points. No patient fact was
  added.
* **Contract wording.** The English review note ends "The case is not yet reviewed by a licensed clinician." (the
  collection test matches the lower-case phrase); otherwise it is the standard's §6 text.

### 1.0.0 — 2026-10-28

* Initial template version (PR #5).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-561144/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-561144 --lang en        # 60 steps · objectives 6/6 · decisions 5/5 · utterances 56/56 · rubric 31/31
npx tsx --conditions=source scripts/case-check.ts cmcr-561144                                  # PASS (depth floor, do nothing 0, wrong-first < reference, plain openers, patient voice)
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-561144:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-561144:"  # demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 51岁女性，因双手遇冷发白、疼痛就诊，检查中发现房间隔缺损和肺动脉高压（此前超声心动图），行胸交感神经链切断术。
术后第5天平卧拔除右颈内静脉导管，按压约1分钟，用普通胶布覆盖；拔管后约3分钟坐起时突然呼之不应、呼吸短促并抽搐，大动脉搏动可触及，
双侧瞳孔等大、右侧对光反射迟钝。给氧后气管插管，急诊头颅CT示颅内空气栓塞。原报告记录她接受了呼吸支持、高压氧和康复治疗；次日神志转清
但左侧重度偏瘫（1.0.0版中文作“左侧重瘫”），逐渐好转，约第35天能独立行走；无更长随访。生命体征、血糖、超声心动图数值、CT细节、高压氧
方案和拔管地点均未记录。本版患者事实全部沿用1.0.0版的提取，尚未对照原文全文核对。

**学习目标。**
1. 安全拔除颈内静脉导管（穿刺点低于心脏、屏气并做Valsalva动作时拔出、按压止血、封闭敷料至少24小时、拔后平卧约30分钟；宾夕法尼亚患者安全管理局2012；WS/T 433—2023要求穿刺点密闭24小时），有心内分流伴肺动脉高压时格外小心。
2. 拔管后数分钟内出现呼之不应和抽搐时，在床旁识别脑气体栓塞，不等影像，并与惊厥性晕厥、卒中、肺栓塞和首次癫痫发作鉴别。
3. 最初几分钟：封闭穿刺点、水平位（不用头低位）、纯氧、保护气道、按AES 2016控制抽搐、查血糖。
4. 尽快安排高压氧并完成加压前检查（胸部手术后排除气胸、气管导管套囊注生理盐水），并说明CT阴性为何不取消治疗。
5. 说明进气途径为何无法从记录中确定，以及分流伴肺动脉高压对今后输液和心脏随访的意义。
6. 向家属坦诚说明医源性并发症、道歉并上报不良事件。

**关键决策。** ① 拔管方法：平卧（能耐受则略头低）、屏气并向下用力（Valsalva）时拔出、按压止血、封闭敷料至少24小时、拔后平卧约30分钟（干扰项：平卧、按压约1分钟、普通胶布后随时可以坐起下床——与原报告记录的平卧拔管、按压约1分钟、普通胶布相近，但原报告没有记录是否这样告诉过她；半坐位深吸气；干纱布马上下床；留管等修补）；
② 床旁判断与急救：按经针道进入的空气栓塞处理，封闭、放平、纯氧、呼救、气道、止抽、血糖、通知ICU和高压氧科，不等CT（干扰项：晕厥、溶栓、肺栓塞用肝素、首次癫痫）；
③ ICU：尽快高压氧，先胸片排除气胸、套囊注盐水（干扰项：看CT再定、先用激素、只限潜水员加头低位、过度通气等24小时）；
④ 途径：反常栓塞和逆行均可能、都未被证实，处理相同；今后排净管路空气、心内科评估（干扰项：超声证明反常栓塞马上封堵、瞳孔证明逆行、途径无关紧要）；
⑤ 告知家属：坦诚说明空气很可能是拔管后经颈部针眼进入的、道歉、解释高压氧和不确定预后、记录并上报（干扰项：说成中风、等结局再说、怪她坐起）。

**安全结果。** 静脉溶栓（阿替普酶）设为危急操作（`critical: true`）：术后第5天、针对的是气体而非血栓，可致危及生命的出血，一旦给药，本次运行的安全结果即为不合格；治疗剂量肝素、未开胸片即加压、拔管后让她坐起、发病后头低位以及未定方案先拔管或让她坐着拔管均作为禁忌操作标记并扣分（肝素扣`rb-no-harm`，未开胸片即加压扣`rb-hbot-given`，后三者扣`rb-air-entry-safety`），但不单独导致安全结果不合格。最初几分钟的急救（呼救、封闭穿刺点、放平、纯氧）只有在转入ICU之前完成才计分。

**复盘要点（PEARLS）。** 先谈她坐起时突然失去反应那一刻的感受；复述拔管方案和最初一分钟做了什么；分析：穿刺点与心脏的高低、吸气的作用、
缺损伴肺高压增加了什么风险、普通胶布为何不够、CT阴性怎么办、为何纯氧和水平位、为何不再头低位、加压前要查什么、瞳孔体征能说明
什么、家属问“是不是拔管出的事”怎么回答；总结下次拔颈部导管和遇到拔管后突然失去反应时怎么做。待核实：手术与超声心动图细节、拔管地点和
方式、发病时体征、CT细节、高压氧方案、“左侧重瘫”原文、“约35天”的起算点（见上文 To verify）。本病例为人工智能辅助编写、经编辑审核（含2026-11-14第二、三轮审核）的教学材料，尚未经执业医师审核。
