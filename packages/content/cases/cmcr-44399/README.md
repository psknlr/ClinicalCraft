# cmcr-44399 — Abdominal pain and muscle twitching after a medication error · 9-year-old boy

> **Spoilers — facilitator guide.** This file names the diagnosis and the outcome. Learners open the case from the
> case library, where the title, summary, chief complaint, triage note and objective titles give neither away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 贲英姿, 沈莉, 康云峰. 儿童误服新斯的明中毒一例. 中华儿科杂志.
2011;49(9):707-708. Version 1.1.0 re-authors the case to the clinical content standard **from the facts that version
1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet been checked
against the full source article** (STANDARD §6). The boy (魏清和 / Wei Qinghe) is a pseudonym, his parent is unnamed,
and the paediatric emergency attending (方医生 / Dr Fang), the nurse (唐护士 / Nurse Tang) and the clinical
toxicologist (陆医生 / Dr Lu) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not
record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-44399` / `1.1.0` |
| setting / facility | `emergency` / `general-hospital` (ED resuscitation bay; later phases are the same admission) |
| specialty | paediatrics, clinical toxicology, emergency medicine |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: five record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-11-14); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a paediatric emergency physician or clinical toxicologist review it before teaching use |
| the patient | a 9-year-old boy (9 years 3 months, 36 kg), awake but listless, who says a few words himself; a parent of unrecorded sex gives the history |
| phases | `arrival` 到院：服药后约四小时 / Arrival → `results` 入院化验结果回报 / Admission results back → `two-hours` 入院约两小时 / About two hours after admission → `course` 治疗过程中 / Later in his treatment → `outcome` 住院经过与随访 / Hospital course and follow-up — all one-way, none learner-switchable |
| content | 22 history items (10 recorded facts, 1 labelled teaching device, 11 unknown; 8 required) · 7 exam findings (6 on admission, 1 at two hours) · 8 investigations (2 record reviews; 3 orderable tests with no recorded result) · 14 interventions (5 harmful — 3 `critical: true`, 2 `critical: false`) · 5 decisions · 6 objectives · 15 rubric items (14 deterministic, total weight 36, + 1 examiner-judged) · 43 matcher test utterances |
| what the learner can do | take the history from the parent and the boy; examine him; order an ECG, a bedside glucose, the cholinesterase and electrolytes (staged: back in the next phase), a blood gas and a chest film (no result recorded); read the observation chart and, at the end, the hospital-course record; monitor, cannulate, give atropine and fluids, call the poisons service, arrange a monitored bed, stop the drug, report the error and teach back; answer five decisions |

## Learning outcomes

By the end of the case the learner can:

1. Work out the dose taken from the tablet strength and count (15 × 15 mg = 225 mg; 6.25 mg/kg), compare it with the
   intended quarter tablet (3.75 mg) and state the size of the error (60-fold).
2. Recognise a cholinergic crisis from a neostigmine (carbamate cholinesterase inhibitor) overdose by its muscarinic
   and nicotinic signs, and explain why 4-mm pupils and a heart rate of 72/min do not exclude it.
3. Plan the first hour: continuous cardiorespiratory monitoring, IV atropine titrated to the signs (FDA neostigmine
   prescribing information, revised 2015), poisons-service advice, and no further gut decontamination four hours after
   the tablets (AACT/EAPCCT 2013, 2005).
4. Interpret a cholinesterase of 1790 U/L, sinus rhythm and a sodium of 126.7 mmol/L for what each can and cannot show,
   and act on them: isotonic maintenance fluid (AAP 2018) and no suxamethonium if he needs intubation.
5. Recognise the fall in heart rate to 47/min about two hours after admission as a muscarinic effect and treat it with
   repeated, titrated atropine under continuous monitoring, following the PALS steps if perfusion fails (AHA/AAP 2025).
6. Close the error chain before discharge: stop the drug and question its indication, report and disclose the error,
   and confirm dose instructions written in mg and in tablets by teach-back (AHRQ 2024).

## Clinical summary (spoilers)

A 9-year-old boy weighing 36 kg had two days of fever and cough; at the clinic his eyes were watering, he was
photophobic and reluctant to open them, and alongside anti-infective treatment he was prescribed **neostigmine 15 mg
tablets, a quarter of a tablet each time**. His parent read the quarter as a quarter of the bottle and gave him **15
tablets — 225 mg, 6.25 mg/kg, 60 times the intended 3.75 mg**. About 20 minutes later came abdominal pain, sweating,
salivation, vomiting and twitching of the limbs and jaw; there was no seizure, coma, rash or diarrhoea. After a gastric
lavage locally he was transferred and admitted about four hours after the tablets: alert but lethargic, moist skin,
unable to stand unaided, limb twitching, pupils 4 mm reacting briskly to light, heart rate 72/min and increased bowel
sounds. The cholinesterase was **1790 U/L** (reference 5000–12000), sodium **126.7 mmol/L**, potassium 3.79 mmol/L, and
the ECG showed sinus rhythm. **About two hours after admission his heart rate reached a lowest 47/min**, with continuing
abdominal pain and moist skin. Under antagonist treatment and monitoring his symptoms then improved and the
cholinesterase rose gradually; with atropine and continuous monitoring the symptoms gradually resolved, treatment was
stopped on day 5, he was discharged on day 6, and five days after discharge he had no complaints and a normal
cholinesterase.

**Diagnosis taught:** cholinergic crisis from an accidental 60-fold oral overdose of neostigmine, a quaternary
carbamate cholinesterase inhibitor, caused by a misread fractional dose instruction. The diagnosis is clinical; the
low cholinesterase confirms it. Normal-sized pupils and an arrival heart rate of 72/min do not exclude it; the danger
lies ahead (bradycardia, secretions, respiratory-muscle weakness).

**Today's management, taught against the report.** Continuous cardiorespiratory monitoring from arrival; IV atropine
titrated to heart rate, secretions, sweating and the chest, repeated for the slow rate; poisons-service advice; a
monitored bed; no further gut decontamination four hours out (no second lavage, no charcoal); isotonic maintenance
fluid for the low sodium; no further anticholinesterase, and no suxamethonium if he needs intubation; then, before
discharge, stop the drug and question its indication, report and disclose the error, and teach back a written dose in
mg and tablets. **What the report records:** a lavage locally before transfer; antagonist treatment and monitoring;
atropine with continuous monitoring; treatment stopped on day 5; discharge on day 6. The atropine doses and timing,
the fluids, the reason for the prescription and every observation other than the heart rate are not recorded.

## Scenario timeline and physiology (staged evidence by phase)

Static clock (`clock.mode: "static"`, no `physiology`): phases advance by themselves when their `enterWhen` holds,
results belong to the phase in which they existed, and nothing physiological is simulated.

| phase | opens when | what the learner meets |
|---|---|---|
| `arrival` (initial) | start | the parent's history and the boy's own words; the admission examination; the ECG (sinus rhythm) and the observation chart (heart rate 72/min; nothing else charted); bloods can be sent but the cholinesterase and electrolytes are "not back yet"; glucose, blood gas and chest film have no recorded result; decisions 1 (toxidrome) and 2 (first hour) |
| `results` | decisions 1 and 2 answered | the cholinesterase (1790 U/L) and electrolytes (Na 126.7, K 3.79 mmol/L) — re-order to read the staged result; the admission ECG again; decision 3 (results) |
| `two-hours` | decision 3 answered | the nurse calls the learner back: reassessment and observation chart show the heart rate at its lowest 47/min with continuing abdominal pain and moist skin; the boy says it still hurts; decision 4 (the slow rate) |
| `course` | decision 4 answered | the observation chart: improvement under antagonist treatment and monitoring, cholinesterase rising (values not recorded); the boy feels better; decision 5 (before discharge, select all) |
| `outcome` (`learnerSwitchable: false`) | all five decisions answered | the hospital-course record (atropine and continuous monitoring, gradual resolution, treatment stopped day 5, discharge day 6, no complaints and a normal cholinesterase five days after discharge) and the post-discharge cholinesterase |

The staged return of the bloods (sent on arrival, read in `results`) and the nurse's call at two hours are labelled
teaching devices; 1.0.0 places the bloods among the "initial investigations" and the slow heart rate about two hours
after admission, and records no times for the results.

## Decisions and assessment

### Objectives (HUD task list)

| id | title | complete when |
|---|---|---|
| `obj-story` | Find out what he took and when / 问清吃了什么、什么时候吃的 | asked `presenting`, `medicine-taken`, `onset`, `lavage-transfer` |
| `obj-bedside` | Examine him and name what is happening / 查体并判断发生了什么 | examined skin, muscles, pupils + decision 1 answered |
| `obj-first-hour` | Make the first hour safe / 保障第一个小时的安全 | decision 2 answered + monitoring started (any time) |
| `obj-results` | Interpret the admission results / 解读入院检查结果 | cholinesterase and electrolytes read in `results` + decision 3 |
| `obj-watch` | Keep reassessing and act on what you find / 持续评估，发现变化及时处理 | decision 4 answered + atropine given (any time) |
| `obj-home` | Plan a safe discharge and review the outcome / 安排安全出院并核对转归 | decision 5 answered + outcome record read |

No `completeWhen` holds a condition that can become permanently false (no phase leaf, no `whenIndicated`, no
`decidedFirstTry`); the contract's late-learner replay confirms the case can always be finished.

### Decisions

Options appear shuffled as letters; ids name the content. Every option has its own feedback.

1. **`toxidrome` — what explains the picture?** (opens after the medicine and onset questions and the examination of
   skin, muscles, pupils, heart rate and abdomen). Key **`cholinergic-crisis`**: muscarinic signs (sweating, drooling,
   vomiting, abdominal pain; moist skin and increased bowel sounds on arrival) and nicotinic ones (twitching) about 20
   minutes after a cholinesterase inhibitor; neither miosis nor bradycardia is needed. Distractors: `no-poisoning`
   (brisk 4-mm pupils and the lavage "clear" him — AACT/EAPCCT 2013: studies have failed to show that lavage improves
   outcome), `myasthenic-crisis` (the eye symptoms as myasthenia, more drug needed — FDA label 2015: the crises can be
   hard to tell apart and more neostigmine in a cholinergic crisis could have grave consequences; no myasthenia is
   recorded), `sepsis-cns` (fever explains it — not the drooling and twitching 20 minutes after 15 tablets).
2. **`first-hour` — the plan for the first hour** (after decision 1 and the pre-transfer question). Key
   **`monitor-antidote`**: resuscitation bay on continuous ECG, SpO₂ and blood pressure with close checks of breathing
   and strength, IV access and bloods, titrated IV atropine, the poisons service, no further gut decontamination (FDA
   label 2015: support ventilation, monitor cardiac function, immediate atropine in a cholinergic crisis; AACT/EAPCCT
   2013 and 2005). Distractors: `relavage-charcoal` (a second lavage and charcoal, then routine ward observations),
   `ward-observation` (four-hourly observations; atropine only below 60/min), `await-enzyme` (atropine held for the
   cholinesterase; antiemetic; no monitor).
3. **`results` — what the admission results mean** (after reading the cholinesterase and electrolytes in `results`).
   Key **`confirms-keep-watching`**: they confirm the inhibition but not the danger ahead; keep monitoring, treat the
   signs not the level, isotonic fluid and a repeat sodium (AAP 2018: hyponatraemia is a sodium below 135 mmol/L;
   isotonic maintenance fluid lowers its risk), and avoid suxamethonium (its label: not recommended with known reduced
   plasma cholinesterase activity; anticholinesterases potentiate its phase I block). Distractors:
   `level-guides-atropine` (atropine until the enzyme normalises — atropine does not restore the enzyme),
   `ecg-clears-heart` (sinus rhythm and a potassium of 3.79 mmol/L "clear" the heart; the sodium can wait),
   `pesticide-exposure` (the level is "too low" for tablets).
4. **`slow-rate` — the heart rate of 47/min at about two hours** (after the reassessment or the two-hour chart). Key
   **`atropine-titrate`**: assess airway, breathing and perfusion; repeat IV atropine on the monitor, titrated to rate,
   secretions and chest; CPR if the rate stays below 60/min with poor perfusion despite oxygen and ventilation (FDA label
   2015: bradycardia is a muscarinic effect of overdose that may be managed with atropine or glycopyrrolate; AHA/AAP 2025 PALS:
   atropine for bradycardia with cardiopulmonary compromise from increased vagal tone; the PALS bradycardia algorithm for
   oxygenation, ventilation and CPR). Distractors: `adrenaline-pacing` (adrenaline and pacing first — in the PALS
   algorithm atropine is the drug for increased vagal tone; the perfusion at this point is not recorded),
   `relavage-now` (lavage six hours out), `sleeping-rate` (47/min "can be a sleeping rate"; no blood pressure is recorded
   at all).
5. **`discharge` — what must be in place before he goes home (select all)** (after reading the course chart). Keys
   **`stop-question-drug`** (stop neostigmine and ask the prescriber what it was for: no indication is recorded),
   **`teach-back-plan`** (a written plan in mg and in tablets, checked by teach-back — AHRQ 2024), **`report-disclose`**
   (report the 60-fold error and explain openly). Distractors: `resume-correct-dose` (restart at a quarter tablet),
   `home-atropine` (atropine tablets for home use). The keys are not the three longest options in either language.

No key is the uniquely longest option of its decision in either language (strict lint).

### Rubric (14 deterministic items, total weight 36, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 3 | asked presenting complaint, medicine, onset, clinic visit, pre-transfer care, breathing, weight |
| `rb-exam` | examination | 2 | examined conscious level, skin, muscles and standing, pupils, heart rate, abdomen |
| `rb-toxidrome` | diagnosis | 3 | decision 1 right first time |
| `rb-first-hour` | management | 3 | decision 2 right first time |
| **`rb-monitoring`** | management | 3 | **critical** — monitoring started while indicated (`arrival` or `results`: `whenIndicated`) |
| `rb-escalation` | management | 2 | IV access, poisons service, monitored bed |
| `rb-tests` | investigations | 2 | ECG, bedside glucose, cholinesterase and electrolytes ordered in `arrival` |
| `rb-results` | diagnosis | 3 | decision 3 right first time |
| `rb-slow-rate` | management | 3 | decision 4 right first time |
| **`rb-atropine`** | management | 4 | **critical** — IV atropine given while indicated (`arrival`, `results` or `two-hours`: before the course record shows the improvement) |
| **`rb-safety`** | safety | 3 | **critical** — no repeat lavage, no early discharge or removal from monitoring, no further neostigmine (`{"intervened": …, "valid": false}`); scored once any of them is given or decisions 1–3 are attempted |
| `rb-low-value` | safety | 1 | no charcoal, no hypotonic maintenance fluid; scored once either is given or decisions 2–3 are attempted |
| `rb-error-chain` | management | 2 | neostigmine stopped, error reported and disclosed, discharge teaching by teach-back |
| `rb-discharge` | management | 2 | decision 5 right first time |
| `rb-communication` | communication | 1 | examiner-judged (Calgary–Cambridge; teach-back; no promise beyond the record) — not in the deterministic total |

### How wrong choices score (measured with core `reduce`/`assess` on 2026-11-14)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 36/36 (100 %) | none | passed |
| start and do nothing | 0/32 | `rb-monitoring`, `rb-atropine` | passed |
| wrong first answer at all five decisions, then right | 22/36 (61 %) | none | passed |
| wrong first answer at decision 1, 2, 3 or 4 only | 33/36 (92 %) each | none | passed |
| wrong first answer at decision 5 only | 34/36 (94 %) | none | passed |
| reference path plus a repeat lavage on arrival | 33/36 (92 %) | `rb-safety` | **failed** (`repeat-lavage`) |
| reference path plus neostigmine on arrival | 33/36 (92 %) | `rb-safety` | **failed** (`neostigmine-dose`) |
| reference path plus discharge or an unmonitored bed on arrival | 33/36 (92 %) | `rb-safety` | **failed** (`early-discharge`) |
| reference path plus discharge in the `course` phase (still on treatment) | 33/36 (92 %) | `rb-safety` | **failed** (`early-discharge`) |
| reference path plus discharge in the `outcome` phase (not contraindicated) | 36/36 (100 %) | none | passed |
| reference path plus activated charcoal | 35/36 (97 %) | none (`rb-low-value` lost) | passed (`critical: false`) |
| reference path plus hypotonic maintenance fluid | 35/36 (97 %) | none (`rb-low-value` lost) | passed (`critical: false`) |
| monitoring started only at two hours (late) | 33/36 (92 %) | `rb-monitoring` | passed |
| atropine first given at two hours, for the slow rate | 36/36 (100 %) | none | passed |
| atropine given only in the `course` phase (late) | 32/36 (89 %) | `rb-atropine` | passed |
| reference path without stopping the drug, reporting and teach-back | 34/36 (94 %) | none (`rb-error-chain` lost) | passed |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item; the avoided-harm items
count only once their harm was possible (`scoredWhen`), so doing nothing earns 0 (the finish is refused while
objectives are open). **Timing of the critical acts.** Monitoring counts only when started on arrival or while the
first results are awaited; atropine counts when given before the `course` record (which shows the improvement under
antagonist treatment) can be read — so neither can be earned in hindsight. Atropine first given at the slow heart rate
earns the item: that is atropine in time for the life-threatening sign; decision 2 (scored first time) is where the
case tests giving it in the first hour. Harmful acts are scored only when given while contraindicated (`"valid":
false`), so a discharge after all five decisions — the recorded discharge on day 6 — costs nothing.

### Critical items

`rb-monitoring` and `rb-atropine` are acts done in time (`{"intervened": …, "whenIndicated": true}`); `rb-safety` is
the avoided-harm item that carries the three `critical: true` interventions. None reads a final-phase record and none is
a decision alone.

**Safety outcome.** Three interventions are `critical: true` and fail the run's safety outcome whatever the score: a
**repeat gastric lavage** (contraindicated throughout: AACT/EAPCCT 2013 — not routinely, if at all; contraindicated with
an unprotected airway or where it adds aspiration risk; aspiration pneumonia and arrhythmia among its complications — in
a child four hours out who vomited, drooled and cannot stand unaided), **further neostigmine** (contraindicated
throughout: FDA label 2015 — more anticholinesterase in a cholinergic crisis could have grave consequences) and
**discharge or an unmonitored bed before the outcome phase** (FDA label 2015 — ventilation support and cardiac
monitoring after an overdose; a cholinergic crisis can kill through the respiratory muscles, and his heart rate later
fell to 47/min). Activated charcoal four hours out and hypotonic maintenance fluid are `risk: moderate`,
`critical: false` — recoverable, low-value or harmful choices that cost `rb-low-value`, not the safety outcome. Atropine
is `risk: moderate` with no contraindication in this case.

## Reference path (`solution`)

72 steps, static clock: start → 20 history questions to the parent and the boy (presenting complaint, medicine and
tablets, onset, clinic visit, the prescription's purpose, pre-transfer care, fits/rash/diarrhoea, breathing, earlier
weakness, tablets left, how the dose was explained, allergies, regular medicines, past health, vaccinations, family,
weight, fever now, worries, the boy's own words) → examine conscious level, skin, muscles and standing, pupils, heart
rate, abdomen → **monitoring**, **IV access** → order and read the ECG, glucose, cholinesterase and electrolytes (both
"not back yet") and the observation chart → **decision 1** → **atropine**, **poisons service**, **stop neostigmine** →
**decision 2** → `results`: re-order and read the cholinesterase, electrolytes and ECG → **isotonic fluid**, **monitored
bed** → **decision 3** → `two-hours`: reassess, read the chart, ask the boy → **atropine** (repeat) → **decision 4** →
`course`: read the chart and the cholinesterase, ask the boy → **report and disclose**, **discharge teaching by
teach-back** → **decision 5** → `outcome`: read the hospital-course record and the cholinesterase → finish. It gives no
intervention while contraindicated, has no dose error and ends with the safety outcome passed (`cases verify`).

## Clinical numbers check

| number | source | derived values and notes |
|---|---|---|
| age 9.25 years | 1.0.0 `patient.age` | 9 years 3 months; title "9-year-old" |
| weight 36 kg | 1.0.0 history ("the source records a weight of 36 kg") | no other weight recorded |
| neostigmine 15 mg per tablet; 15 tablets; instruction a quarter tablet each time | 1.0.0 history | **derived:** 15 × 15 mg = 225 mg; 225 ÷ 36 = 6.25 mg/kg; intended ¼ × 15 mg = 3.75 mg; 225 ÷ 3.75 = **60-fold** |
| onset about 20 minutes after the tablets | 1.0.0 history | — |
| fever and cough for two days | 1.0.0 history | — |
| admission about 4 h after the tablets; chief complaint "for four hours" | 1.0.0 history and chief complaint | both approximate (see contradictions) |
| pupils 4 mm; heart rate 72/min | 1.0.0 admission examination | the heart rate is flagged `abnormal: false`; teaching texts call it at most "normal-looking" (decision 1's key) and only a distractor calls it normal |
| cholinesterase 1790 U/L (reference 5000–12000) | 1.0.0 initial investigations | **derived:** about 36 % of the lower reference limit (1790 ÷ 5000); assay (plasma or red-cell) not recorded |
| sodium 126.7 mmol/L; potassium 3.79 mmol/L | 1.0.0 initial investigations | reference ranges not recorded; 126.7 is below the 135 mmol/L that AAP 2018 uses to define hyponatraemia |
| heart rate at its lowest 47/min about 2 h after admission | 1.0.0 subsequent monitored changes | **derived:** about 6 h after the tablets (used in decision 4's lavage feedback) |
| treatment stopped day 5; discharged day 6; no complaints and normal cholinesterase 5 days after discharge | 1.0.0 outcome | value not recorded |
| atropine 50 micrograms/kg IV, max 3 mg, doubled every 5 min while ineffective | Perth Children's Hospital monograph (reviewed Aug 2024), cholinergic crisis | **derived:** 1.8 mg at 36 kg (below the 3 mg cap); not a dose the report records |
| atropine 20 micrograms/kg, max 600 micrograms, repeat once | same monograph, bradycardia with haemodynamic compromise | **derived:** 0.72 mg at 36 kg, capped at 0.6 mg (taught in a teaching point only) |
| atropine 0.02 mg/kg, minimum 0.1 mg | AHA/AAP 2025 PALS, as restated by its writing group (2026) | **derived:** 0.72 mg at 36 kg |
| activated charcoal 0.5–1 g/kg (ages 1–12) | AACT/EAPCCT 2005 (quoting USP DI 2003) | **derived:** 18–36 g; offered only as a harmful option |

No `doseSpec` is set: atropine is a titrated, repeated regimen (KIT §6 exempts titrations) and is not a high-alert
medicine; charcoal is a range with two routes; the neostigmine option names alternatives.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions.** "How did you feel when you worked out 15 tablets of 15 mg?" "How do you think the parent felt?"
- **Description.** "Walk me through the first ten minutes: what did you ask, look at and start?"
- **Analysis.**
  - "Which of his signs are muscarinic and which nicotinic — and which danger does atropine not treat?"
  - "Why did 4-mm pupils and a heart rate of 72/min not reassure you? What did they reassure others about?"
  - "He had a lavage before transfer. What would a second one have added? What does AACT/EAPCCT 2013 say, and when
    might charcoal have been considered?"
  - "What did the cholinesterase of 1790 U/L tell you — and what could it not? Which assay was it?"
  - "Why a sodium of 126.7 mmol/L matters in a child who vomited, sweated and had a lavage — and what fluid?"
  - "At two hours his heart rate was 47/min. Why atropine rather than adrenaline here? What would make you start CPR?"
  - "Carbamate inhibition reverses on its own (ATSDR 2023), yet his treatment was stopped only on day 5: what might
    explain a course of days? (The report's explanation is not recorded — keep it a question.)"
  - "Why was a 9-year-old with fever, cough and sore eyes given neostigmine at all? Who should answer that question?"
- **Summary.** "What three things would you hand over about him?" "What will you say to the parent before discharge,
  and how will you check it landed?"

### Common learner errors and how the case surfaces them

| error | where it shows |
|---|---|
| calling the pupils and heart rate "normal" and stopping there | decision 1 (`no-poisoning`), decision 2 (`ward-observation`) |
| reaching for the stomach (re-lavage, charcoal) four hours out | decision 2 (`relavage-charcoal`), decision 4 (`relavage-now`), `repeat-lavage` (critical) and `activated-charcoal` interventions |
| treating the cholinesterase number instead of the child | decision 2 (`await-enzyme`), decision 3 (`level-guides-atropine`) |
| reading the inability to stand as myasthenia and giving more drug | decision 1 (`myasthenic-crisis`), `neostigmine-dose` (critical) |
| no monitor, or a ward bed, after one reassuring ECG | decision 3 (`ecg-clears-heart`), `early-discharge` (critical), `rb-monitoring` |
| reflex adrenaline or pacing for the slow rate | decision 4 (`adrenaline-pacing`) |
| hypotonic fluid with a sodium of 126.7 mmol/L | `hypotonic-fluids` intervention, decision 3 |
| sending him home on the "correct" quarter tablet | decision 5 (`resume-correct-dose`), `rb-error-chain` |

Learners may ask about breathing, oxygen saturation, blood pressure or the chest: none is recorded. The nurse and the
parent say so; use it to discuss why respiratory-muscle weakness must be watched for when the record is silent.

## Embodied mode

- **Facility:** `general-hospital`; the case runs in the ED resuscitation bay and its later phases are the same
  admission (no transport is modelled). Capabilities used: `cardiac-monitor`, `iv-access`, `medications`,
  `ecg-12lead`, `lab-chemistry`, `point-of-care`, `lab-blood-gas`, `xray`, `records`; `caseCapabilityGaps` is empty.
- **Bedside vs records:** history, examination, the ECG, glucose and portable chest film are bedside acts; the
  cholinesterase, electrolytes and blood gas go to the laboratory; the observation chart and the hospital-course record
  are read at a records terminal (`requires: ["records"]`, `performedAt: "records"`, `risk: "none"`). The
  hospital-course record does not exist before the `outcome` phase.
- **Speakers:** the boy is verbal (no `nonVerbalWhen`): questions put to him (`child-*` items, `speaker: "patient"`) are
  answered in his own short words; the parent (`companion.answersHistory`) answers the rest. The parent's sex is not
  recorded, so the companion has no `presentation` and a neutral name (KIT §5).
- **In-world demonstration:** `embodied-autopilot.test.ts -t "cmcr-44399:"` replays the `solution` in en and zh-CN.

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age 9 years 3 months, male,
36 kg; two days of fever and cough, with tearing, photophobia and reluctance to open the eyes at the clinic;
neostigmine prescribed alongside anti-infective treatment; 15 mg tablets; a quarter-tablet dose taken (by the parent,
in the Chinese text) to mean a quarter of the bottle; 15 tablets given; about 20 minutes later abdominal pain,
sweating, salivation, vomiting and twitching of the limbs and jaw; no seizure, coma, rash or diarrhoea after the
tablets; lavage locally, transfer, admission about four hours after the tablets; on admission alert but lethargic,
moist skin, unable to stand unaided, limb twitching, pupils 4 mm with a brisk (zh) / reactive (en) light reflex, heart
rate 72/min, increased bowel sounds; cholinesterase 1790 U/L (reference 5000–12000), sodium 126.7 mmol/L, potassium
3.79 mmol/L, sinus rhythm; about two hours after admission a heart rate at its lowest 47/min with continuing abdominal
pain and moist skin; subsequent improvement under antagonist treatment and monitoring with a gradually rising
cholinesterase; atropine with continuous monitoring, gradual resolution, treatment stopped on day 5, discharge on day
6; no complaints and a normal cholinesterase five days after discharge.

**Extraction map (every 1.0.0 fact → its 1.1.0 home).** Age, sex, weight → `patient`, history `weight`, triage note;
chief complaint → `patient.chiefComplaint`, history `presenting`; drug, strength, instruction, misreading, 15 tablets →
history `medicine-taken`; onset and symptoms → history `onset`; clinic visit → history `clinic-visit`; lavage,
transfer, admission time → history `lavage-transfer`; no seizure/coma/rash/diarrhoea → history `associated`;
admission examination → exam `general`, `skin`, `neuromuscular`, `pupils`, `heart-rate`, `abdomen` (and the heart rate
on the `obs-record` chart); initial investigations → `cholinesterase` and `electrolytes` (`results` phase) and `ecg`
(`arrival`, `results`); subsequent monitored changes → exam `reassess-2h` and `obs-record` (`two-hours`), `obs-record`
and `cholinesterase` (`course`), the boy's `child-now-2h` and `child-course`; treatment and outcome → `outcome` record
and `cholinesterase` (`outcome`); 1.0.0's unknowns (bottle check, continuous waveforms, long-term follow-up) →
`unknowns`, history `tablets-left`. 1.0.0's allergy, family, surgery, medication, past-health, vaccination, function,
expectations and other-admission slots stay unknown (merged into fewer, natural questions).

**Adapted for teaching (labelled devices, no clinical fact added).** The ED resuscitation-bay setting (1.0.0
`setting: "emergency"`); the five phases, with the bloods staged to come back in `results` and the nurse's call at two
hours; the parent at the bedside and the parent's two voiced worries (`ice` item and `persona.concerns`: "Is he going
to be all right?", "How was that medicine supposed to be given?"); the boy's few words ("My tummy hurts… my arms and
legs are twitching…", "It still hurts…", "I feel better.") voicing recorded symptoms; the observation chart that repeats
the recorded heart rates and says what is not charted; the orderable tests with no recorded result (glucose, blood
gas, chest film) and the "no result is recorded" entries for later phases; the staff; the decisions, options, feedback and rubric; the 14
interventions, whose responses say what the record does or does not hold; the order warning that only one,
unspecified cholinesterase exists. Unknown items answer in the parent's voice ("这个我说不准，医生。" / "I'm not sure,
doctor.").

**Inconsistencies and gaps kept, not resolved.**
- **Pupillary reflex:** 1.0.0's Chinese says 对光反射敏捷 (brisk), its English "reactive". The case uses "brisk" in both
  languages (the more specific reading, from the Chinese).
- **Who misread the dose:** the Chinese names 家长 (the parent); the English is passive. The parent says "we took it to
  mean…"; which parent, and where, is not recorded.
- **Timing:** the chief complaint says symptoms "for four hours", while symptoms began about 20 minutes after the
  tablets and admission was about four hours after them; both are approximate and both are kept.
- **Eye symptoms:** the Chinese places the tearing, photophobia and reluctance to open the eyes at the clinic visit
  (就诊时); the English lists them with the fever and cough. The case says "at the clinic".
- **Heart rate:** the Chinese says the rate was at its lowest 47/min (最低), the English that it "fell to 47/min"; the
  records use "at its lowest", the decision prompt "has fallen to".
- **Monitoring:** the outcome text says continuous monitoring (持续监测) in Chinese and monitoring in English; the course
  record keeps "antagonist treatment and monitoring". The case does not state that the antagonist was atropine,
  though the outcome record names atropine.
- **"停药" on day 5:** what was stopped is not stated (1.0.0 English: "treatment stopped"); the case says "treatment was
  stopped" and lists it as unknown.
- **Reported versus absent:** 1.0.0's English says no seizure, coma, rash or diarrhoea "was reported"; its Chinese says
  there was none. The parent denies them.

**Privacy.** Pseudonymous patient (魏清和 / Wei Qinghe, unique in the library and distinct from the cmcr-20 cases);
an unnamed parent; no hospitals, places, dates or identifiers; relative time only. No figure of the report is approved
for display (no entry in `scripts/cmcr-105-media-review.json`), so the case has no assets.

## Matcher notes

- The `presenting` item (topic `presenting-complaint`, `arrival` and `results`) takes the plain openers in both
  languages; `case-check.ts` confirms all twelve reach a history item in `arrival`. Multi-word keywords that reduce to one
  token are written run together (`whatbringsyouin`, `whendiditstart`, `howlonghasthisbeengoingon`), as the strict lint
  requires; "since when" is run together so that "since then" does not reach it.
- `excludeKeywords` separate neighbours: the presenting item yields to questions about tablets, lavage, the clinic or
  timing; `medicine-taken` yields to the bottle ("bring", 带来, 还剩), the purpose and what is left; `clinic-visit` yields
  to "still"/"now"; `regular-medicines` yields to neostigmine questions.
- The boy's three items share his phrases and are phase twins (`supersedes`), so "How are you feeling?" reaches the
  version for the current phase.
- The corpus has 43 utterances (25 en, 18 zh-CN), four of them look-alike negatives (`expect: []`), one or more for every
  required item; `cases verify` passes 43/43.
- Cholinesterase orders naming a specific enzyme (plasma, red-cell, pseudo-, butyryl-, acetyl-; 血浆, 红细胞, 全血) reach
  the one record with a notice that its assay is not recorded.

## References

1. 贲英姿, 沈莉, 康云峰. 儿童误服新斯的明中毒一例. 中华儿科杂志. 2011;49(9):707-708. doi:10.3760/cma.j.issn.0578-1310.2011.09.016. Available from: https://rs.yiigle.com/cmaid/44399
2. US Food and Drug Administration. Neostigmine methylsulfate injection, NDA 203629: prescribing information, 5.5 Cholinergic crisis and 10 Overdosage. Revised January 2015. Available from: https://www.accessdata.fda.gov/drugsatfda_docs/nda/2015/203629Orig1s000Lbl.pdf
3. Benson BE, Hoppu K, Troutman WG, Bedry R, Erdman A, Höjer J, et al. Position paper update: gastric lavage for gastrointestinal decontamination. Clin Toxicol (Phila). 2013;51(3):140-6. doi:10.3109/15563650.2013.770154
4. Chyka PA, Seger D, Krenzelok EP, Vale JA; American Academy of Clinical Toxicology; European Association of Poisons Centres and Clinical Toxicologists. Position paper: single-dose activated charcoal. Clin Toxicol (Phila). 2005;43(2):61-87. doi:10.1081/clt-200051867
5. Feld LG, Neuspiel DR, Foster BA, Leu MG, Garber MD, Austin K, et al. Clinical practice guideline: maintenance intravenous fluids in children. Pediatrics. 2018;142(6):e20183083. doi:10.1542/peds.2018-3083
6. Lasa JJ, Dhillon GS, Duff JP, Hayes J, Kamath-Rayne BD, Levy A, et al. Part 8: Pediatric Advanced Life Support: 2025 American Heart Association and American Academy of Pediatrics Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care. Circulation. 2025;152(16 Suppl 2):S479-S537. doi:10.1161/CIR.0000000000001368
7. Lasa JJ, Topjian A; PALS 2025 Writing Group. Writing group response to a letter on atropine dosing in the 2025 PALS guidelines. American Heart Association; 2026 Apr 30.
8. Perth Children's Hospital. Medication Management Manual: Atropine monograph. Perth: Child and Adolescent Health Service; last reviewed August 2024.
9. Agency for Toxic Substances and Disease Registry. Case Studies in Environmental Medicine: Cholinesterase Inhibitors. Part 4, Section 11: 2-PAM (pralidoxime). Last reviewed 2023 Jun 26.
10. Pfizer. Quelicin (succinylcholine chloride injection, USP) prescribing information: sections 5.8 and 5.9.
11. Brach C, editor. AHRQ Health Literacy Universal Precautions Toolkit. 3rd ed. Rockville (MD): Agency for Healthcare Research and Quality; 2024. AHRQ Publication No. 23-0075.

**Checked online on 2026-11-14:** the FDA label's sections 5.5 and 10 (full text, revised January 2015; application NDA 203629); the AACT/EAPCCT 2013 and 2005 papers (full text:
recommendations, contraindications, complications, the paediatric charcoal dose quoted from USP DI 2003); AAP 2018 key
action statement 1A and its definition of hyponatraemia; the PCH atropine monograph (full text, last reviewed August
2024); ATSDR's CSEM page on pralidoxime (last reviewed 26 June 2023); Quelicin §5.8 and §5.9 (Pfizer's current label);
the AHRQ toolkit's edition (3rd, March 2024); the PALS 2025 writing group's letter (posted 30 April 2026). Citations
of references 3–6 were matched on PubMed (PMIDs 23418938, 15822758, 30478247, 41122885). The DOI of the source article
is the one the source map verifies (2026-10-29).

### To verify

**In the source article (the facts 1.0.0 gives, and what it leaves out):**
- Every extracted fact listed under "Source and adaptation", in particular: the pupillary reflex wording (brisk or
  reactive); who gave the tablets and how the instruction was given (written or spoken); the tablet count left in the
  bottle; when the eye symptoms occurred; the duration in the chief complaint against the 20-minute onset and the
  four-hour admission; whether the heart rate "fell to" or was "at its lowest" 47/min, and when exactly.
- Why neostigmine was prescribed (the indication), and by whom.
- The lavage: when, where and with what fluid; anything else given before transfer (charcoal, atropine).
- The cholinesterase assay (plasma or red-cell), its serial values and the reference ranges for sodium and potassium;
  any urea, creatinine, glucose or blood gas.
- Blood pressure, breathing rate, oxygen saturation, temperature and chest findings at any point; whether he ever needed
  respiratory support.
- The atropine doses, route, timing (before or after the slow heart rate) and endpoints; any glycopyrrolate or
  pralidoxime; what exactly was stopped on day 5; the fluids given.
- Any follow-up after the record five days after discharge; the authors' discussion and their references.

**For a clinician of the specialty (paediatric emergency medicine or clinical toxicology):**
- The atropine starting dose for a neostigmine overdose with these signs: the case uses the PCH cholinergic-crisis
  regimen (50 micrograms/kg, max 3 mg, doubling), whose listed examples are organophosphates and nerve agents; confirm,
  or prefer a lower starting dose (such as PCH's 20 micrograms/kg bradycardia dose) titrated upward.
- The PALS 2025 bradycardia statements: the case cites the writing group's letter for atropine in bradycardia from
  increased vagal tone (0.02 mg/kg, minimum 0.1 mg); the algorithm points it uses (oxygenation and ventilation first,
  CPR below 60/min with poor perfusion despite them, adrenaline as the general drug, a 0.5 mg maximum single atropine
  dose) were seen only in AHA's algorithm as indexed by a search engine — the Part 8 text and the algorithm PDF could not
  be opened from the authoring environment.
- The critical flags: a repeat lavage is graded `critical: true` (aspiration in a weak, secretory child); an examiner
  might grade it recoverable. Discharge before the outcome phase is critical; discharge in the `outcome` phase is
  allowed.
- `abnormal: false` on the heart rate of 72/min: commonly quoted PALS reference ranges for awake school-age children
  start around 75/min (not verified here); the case avoids calling the rate normal in its teaching.
- The suxamethonium teaching, given that the assay measured is not recorded.

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the single history slot per
  topic became natural questions in the parent's and the boy's words; the one combined "toxidrome" examination became six
  findings plus the two-hour reassessment; the "initial investigations" record became the cholinesterase, electrolytes
  and ECG; "subsequent monitored changes" became the two-hour reassessment, the observation chart and the course entries;
  the outcome record stays in the final phase.
- **Template defects replaced.** Three decisions of three options → five decisions at the real decision points (the
  toxidrome, the first hour, the results, the slow heart rate, discharge), 4–5 options each with their own feedback; no
  interventions → 14 (the report's monitoring and atropine, today's steps, five harmful or low-value options); 15
  generic history slots with "the source does not provide" answers → 22 items in lay voice; the hindsight critical item
  (a decision) → two critical acts done in time and a critical avoided-harm item; stock objectives and rubric texts →
  case-specific ones; a debrief with dated, guideline-attributed teaching points; 43 genuine matcher paraphrases.
- **Safety and teaching fixes.** 1.0.0's management key praised "individualised antagonism" without saying what to do
  and offered no act; the case now keys continuous monitoring, titrated atropine and no further decontamination, makes
  more neostigmine, a repeat lavage and early discharge critical errors, and teaches the low sodium (isotonic fluid),
  suxamethonium avoidance and closing the error chain (stop the drug, report, teach back). 1.0.0 cited only the FDA
  label; the case now cites nine sources, each checked in its own text where it could be reached.
- **Fixes made to an earlier, unreleased draft of 1.1.0.** The atropine dose follows the PCH monograph (the draft's
  0.02 mg/kg = 0.72 mg exceeded the monograph's 600-microgram cap for its bradycardia dose); the FDA label is cited by
  its application number (the draft had named another product); unverified PALS heart-rate ranges were dropped from feedback; sequences the record does not
  state (when the lavage was done, symptoms "at the same time") and descriptors it does not hold ("too weak", "the
  medicine stopped") were removed; harms count only when given while contraindicated, so the recorded discharge costs
  nothing.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, one examination
  finding, three record reviews, three decisions of three options, 11 rubric items (one critical, a decision) and no
  interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-44399/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-44399 --lang en                                                 # 72 steps · objectives 6/6 · decisions 5/5 · utterances 43/43 · rubric 36/36 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-44399                                       # reference 100 % · do nothing 0/32 · wrong first 61 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-44399:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-44399:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-11-14: all five pass.

## 中文摘要

**病例概要。** 9岁男孩（36 kg）因发热、咳嗽两天就诊，就诊时流泪、畏光、不愿睁眼，除抗感染外被开了新斯的明（每片15 mg，每次
四分之一片）。家长把“四分之一片”当成“四分之一瓶”，给他吃了15片——225 mg，6.25 mg/kg，为医嘱剂量的60倍。约20分钟后腹痛、
出汗、流涎、呕吐，四肢和下颌肌肉抖动；没有抽搐、昏迷、皮疹或腹泻。当地洗胃后转院，服药约四小时入院：清醒但萎靡，皮肤潮
湿，不能自行站立，四肢肌肉震颤，瞳孔4 mm、对光反射敏捷，心率72次/分，肠鸣音增强；胆碱酯酶1790 U/L（参考5000–12000），钠
126.7 mmol/L，钾3.79 mmol/L，心电图窦性心律。入院约两小时心率最低47次/分，仍腹痛、皮肤潮湿。此后在拮抗和监测治疗下好转，
胆碱酯酶逐渐上升；用阿托品并持续监测，症状逐渐消退，第5天停药，第6天出院，出院后5天无不适、胆碱酯酶正常。诊断：新斯的明
（氨基甲酸酯类胆碱酯酶抑制剂）60倍过量引起的胆碱能危象。阿托品剂量、开药理由以及心率以外的生命体征均无记录。本版依据1.0.0版
提取的事实改写，尚未对照原文全文核对，也尚未经执业医师审核。

**学习目标。**

1. 根据片剂规格和片数算出225 mg（6.25 mg/kg），与医嘱3.75 mg比较，说出60倍的差错。
2. 根据毒蕈碱样和烟碱样表现识别胆碱能危象，说明瞳孔4 mm、心率72次/分不能排除。
3. 安排第一个小时：持续监护、滴定静脉阿托品（美国FDA说明书，2015年修订）、中毒咨询，服药4小时后不再去污（AACT/EAPCCT
   2013、2005）。
4. 解读胆碱酯酶、窦性心律和血钠126.7 mmol/L的意义与局限：等张维持液（AAP 2018），需插管时避免琥珀胆碱。
5. 把入院约两小时心率降至47次/分识别为毒蕈碱样作用，在监护下重复、滴定阿托品，必要时按PALS步骤处理（AHA/AAP 2025）。
6. 出院前切断差错链：停药并追问指征，上报并坦诚告知，用回授法核实毫克和片数写明的用法（AHRQ 2024）。

**关键决策。**

- 决策1（判断）：胆碱能危象——服药后约20分钟出现毒蕈碱样和烟碱样表现，不需要缩瞳或心动过缓。
- 决策2（第一个小时）：抢救区持续监护，开通静脉，滴定静脉阿托品，联系中毒咨询，不再洗胃、不用活性炭。
- 决策3（入院结果）：结果证实抑制但预示不了危险；继续监护，按体征治疗，等张液并复查血钠，避免琥珀胆碱。
- 决策4（心率47次/分）：评估气道、呼吸和灌注，在监护下重复滴定阿托品；经供氧和通气后心率仍低于60次/分且灌注差时开始心肺
  复苏。
- 决策5（出院前，多选）：停用新斯的明并追问指征；书面用法写明毫克和片数并用回授法核实；上报并坦诚告知差错。

**复盘要点。** 洗胃与活性炭的“当时与现在”（AACT/EAPCCT 2013、2005）；胆碱能危象与肌无力危象（美国FDA说明书，2015年修订）；
儿童阿托品的两种剂量（珀斯儿童医院用药专论，2024年审核；AHA/AAP 2025 PALS）；低钠与等张维持液（AAP 2018）；胆碱酯酶能说明
什么（ATSDR 2023；琥珀胆碱说明书）；切断差错链与回授法（AHRQ 2024）。

**安全结果。** 再次洗胃、再给新斯的明、在结局阶段之前出院或撤离监护为`critical: true`，一旦执行，无论得分多少本次安全结果
均判为不通过；服药4小时后给活性炭和使用低张维持液为`critical: false`，只扣除`rb-low-value`的分数。
