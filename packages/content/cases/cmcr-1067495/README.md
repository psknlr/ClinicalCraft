# cmcr-1067495 — Headache, visual disturbance and left-sided numbness at 37 weeks · 21-year-old woman

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (李知远 / Li Zhiyuan) and her
> relative are pseudonymous; the case is a teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患者及家属均为化名；本病例改编自已发表的病例报告，不构成医疗建议。
>
> **Status of the facts.** Version 1.1.0 was re-authored from the facts that version 1.0.0 extracted from the
> report. The full article was not available; no patient fact has been added or changed, and none has yet been
> checked against the full text (`extensions.sourceTextChecked: false`). The "To verify" list names what to look
> for in the source.

## Case card

| | |
|---|---|
| Case | `cmcr-1067495` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 龚洵, 邓东锐. 妊娠期血栓性血小板减少性紫癜一例. 中华产科急救电子杂志. 2013;2(3):212-214 |
| Setting / facility | Ward (`inpatient`) → theatre → ward → ICU · `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 minutes (static clock; four phases, five decisions, 18 interventions) |
| Specialty | Obstetrics, haematology, critical care |
| Languages | zh-CN (source language), en |
| Learner level | Final-year students, obstetric, haematology and ICU residents, midwives |
| Review status | Editorial review 2026-10-30 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; patient facts not yet checked against the full article. Have an obstetrician, a haematologist and an intensivist review it before teaching use |
| Content | 23 history items (12 not recorded, 7 required) · 7 exam findings · 20 investigations (6 record reviews, 8 without any recorded result) · 18 interventions (6 contraindicated in some or all phases or orders) · 6 objectives · 5 decisions (21 options) · 12 rubric items (11 deterministic, weight 28; 1 examiner-judged; 2 critical) · 4 staff characters · 6 learning outcomes · 6 teaching points · 39 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Distinguish TTP from HELLP syndrome, severe pre-eclampsia and immune thrombocytopenia in late pregnancy: put a
   thrombotic microangiopathy first when single-figure platelets come with anaemia, neurological or renal involvement
   and normal clotting, and confirm the microangiopathic haemolysis on the blood film (ISTH 2020).
2. Take the ADAMTS13 sample before any plasma, then start plasma exchange with plasma (1.5 plasma volumes at first)
   and methylprednisolone 1 g daily for 3 days at once, without waiting for the result (ISTH 2020; BSH 2023).
3. Explain why platelet transfusion is avoided in suspected TTP (BSH 2023) and why plasma infusion alone does not
   replace plasma exchange.
4. Plan the birth for a woman at term with a very low platelet count: delivery once she is stable (ACOG 2020),
   magnesium sulfate seizure prophylaxis, general rather than neuraxial anaesthesia for a caesarean (SOAP 2021) and
   the neonatal team present.
5. Recognise that the thrombotic microangiopathy has not settled after the birth (after the caesarean: recurrent
   impaired consciousness, LDH rising from 1600 to 4880 U/L, a lowest count of 8×10⁹/L, creatinine up to
   268 μmol/L), escalate to daily plasma exchange in intensive care, and plan the work-up for ADAMTS13,
   complement-mediated TMA and congenital TTP.
6. Lead a family meeting when relatives consider withdrawing treatment, using the SPIKES framework and the ACCM/ATS
   2016 principles of shared decision making.

These are `learningOutcomes`. They name the diagnosis, so front-ends show them before play only behind the closed
**Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief (CASE_AUTHORING §9.4,
GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A 21-year-old in her first pregnancy, at 37+1 weeks, has had a day of headache and visual disturbance (眼花) without a
clear trigger and an episode of left-sided limb numbness that settled by itself after about 20 minutes. At an earlier
antenatal visit her blood pressure was 138/90 mmHg with negative urine protein (untreated); at the onset of this
illness it was 140/100 mmHg with urine protein ++. An earlier platelet count was 7×10⁹/L. On admission she is alert
and pale, with no petechiae or bruising; temperature 36.2 °C, BP 120/79 mmHg, fetal heart rate 145/min. Before the
delivery (exact timing not recorded): haemoglobin 66 g/L, platelets 6×10⁹/L, routine coagulation normal, creatinine
115 μmol/L, ALT 51 U/L, urine red cells +++ and protein ++.

She was delivered by caesarean section (indication, anaesthetic and neonatal outcome not recorded). Afterwards she
**still** had recurrent impaired consciousness; the lowest count recorded after the caesarean was 8×10⁹/L, LDH rose
from 1600 to 4880 U/L and the highest recorded creatinine was 268 μmol/L. A brain MRI showed multiple acute ischaemic
lesions, a later blood film many schistocytes, and a first head CT was normal (the timing of all three is not
recorded). The report's team
considered TTP only late: fresh frozen plasma was given, platelets were transfused repeatedly, and no plasma exchange
is recorded. She went on to heart failure, intubation, deep coma and vasopressor support, and her family withdrew her
from treatment and took her away; what happened afterwards is not recorded.

**Diagnosis (as taught):** a thrombotic microangiopathy at term — reported by the authors as thrombotic
thrombocytopenic purpura (TTP) — with neurological, renal and later cardiac involvement, progressing after
delivery. No ADAMTS13 activity or inhibitor result is recorded, so immune TTP, congenital TTP and complement-mediated
TMA cannot be separated; severe pre-eclampsia may have coexisted.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires: the case shows the
report's recorded states and never simulates the learner's treatment. Every phase is one-way
(`learnerSwitchable: false`).

| Phase | When | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | admission at 37+1 weeks, before delivery | start | her own history (she is alert and answers), exam (conscious level and colour, skin, vital signs, fetal heart), the presenting bloods and urine (dated "before delivery, exact timing not recorded"), the first head CT (normal, timing not recorded), unrecorded tests (film, LDH, haemolysis screen, ADAMTS13, troponin, ECG, CTG, marrow); decisions 1–3; the treatments, the delivery and the traps |
| `postpartum` | after the caesarean (back on the ward) | objectives 1–2 done, decisions 1–3 right **and** the caesarean performed | her relative answers (she cannot speak); post-delivery conscious level, lowest platelet count, LDH, creatinine, operation note; the MRI and the later blood film (both dated "timing not recorded"); decision 4 |
| `icu` | intensive care | objective 5 done, decision 4 right **and** the ICU transfer made | the relative (her condition now, the family's thinking, her wishes); bedside review, ICU notes (heart failure, intubation, deep coma, vasopressors); decision 5 and the family meeting |
| `followup` | to leaving hospital | all five decisions right and the family meeting held | the report's course and outcome record |

Gating choices: decision 3 (the birth plan) opens only once plasma exchange has started, so the TPE act comes before
the delivery; the postpartum phase needs the caesarean (the report's act). The caesarean is scored neutral, not
"indicated": it is the report's delivery, whose timing, indication and anaesthetic are not recorded, and the static
clock cannot show the days of daily exchange that "once she is stable" means; done before plasma exchange has started
it is flagged as contraindicated. The ICU phase needs the transfer the learner orders. No prompt, hint, phase
description or order response states the report's management before the follow-up record; a harmful order's response
(platelets, FFP) names what the report's team also did only after the learner has chosen it. Intervention names and
dose texts are listed from the start, so they name no diagnosis, no ADAMTS13 test and no decision key (the anaesthetic
for the caesarean, the steroid–exchange pairing and the platelet policy are taught in the decisions and their feedback).

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-history` — Take the history of this illness and pregnancy (headache, vision, numbness, pregnancy, BP history).
2. `obj-assess` — Examine her and read the first results (four exam findings; blood count, clotting, renal, liver, urine).
3. `obj-working-diagnosis` — Name the problem and send the right tests (decision 1; film, LDH and ADAMTS13 ordered).
4. `obj-before-birth` — Treat her and plan the birth (decision 2, plasma exchange, methylprednisolone, decision 3, the caesarean).
5. `obj-after-birth` — Reassess her after the birth (conscious level, post-delivery results incl. the film, decision 4, ICU transfer).
6. `obj-family-outcome` — Talk with the family and review the reported outcome (ICU review, notes, the family's view, decision 5, family meeting, outcome record).

Hints are Socratic questions; none contains a key's text (`cases validate` checks it).

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `working-diagnosis` | the five core history items, four exam findings and the five presenting results | a thrombotic microangiopathy treated as TTP until proved otherwise, severe pre-eclampsia not excluded; film, LDH, haemolysis tests now and the ADAMTS13 sample before any plasma | near-misses that also send the film and LDH but commit to the wrong frame and plan: HELLP with platelets to cover the operation and delivery today (the report's evolving obstetric framing); ITP with IVIG, prednisolone and platelets to 50×10⁹/L for a regional block; severe pre-eclampsia with BP control, delivery once stable and plasma only if the count fails after the birth |
| 2 | `first-hours` | decision 1 | ADAMTS13 sample, then emergency plasma exchange with plasma and methylprednisolone 1 g/day; no platelets unless bleeding is life-threatening; magnesium; close monitoring | repeated platelets to > 50×10⁹/L (**the report's practice**); FFP and wait for ADAMTS13 (**the report's plasma**); deliver first and reassess |
| 3 | `delivery-plan` | decision 2, plasma exchange started, fetal heart heard (the prompt says no count after exchange is recorded) | deliver at term once stable on exchange (count rising on daily exchange, neurology settled); CTG; mode by obstetric indication; general anaesthesia, no neuraxial block; no routine platelet cover (cover for an operation that cannot wait is a joint haematology–anaesthesia decision); neonatal team | spinal after platelets to 50; continue to 40 weeks; induction with an epidural after platelets to 80 |
| 4 | `after-delivery` | post-delivery conscious level, lowest platelet count, LDH, creatinine and MRI read (the film is not needed) | delivery has not switched it off: daily exchange with steroids, rituximab with haematology, no platelets, ICU; reassess for complement-mediated TMA if ADAMTS13 is not severely low (the feedback adds caplacizumab as a haematology decision) | FFP and repeated platelets for wound bleeding (**the report's course**); postpartum HELLP — wait 72 h; thrombolysis for the MRI lesions after platelets; atypical HUS — stop exchange for eculizumab |
| 5 | `goals-of-care` | ICU review, ICU notes and the family's thinking | a family meeting (senior intensivist, haematologist, nurse): what they understand, what exchange can still offer, the uncertainty, what she would want, decide together | persuade them to continue; discharge on request without a meeting; advise futility from the coma and MRI |

All decisions are single best answer with option-specific feedback naming the guidance. Options were balanced for
length: the key is the uniquely longest option in no decision in either language (lengths are reported by the
authoring script and checked by `cases validate`). Nor is the key the only option that tests: in decision 1 every
option sends the film and LDH, and the key differs by its frame (TTP first) and the ADAMTS13 sample before plasma.

### Rubric (11 deterministic items, weight 28, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-history-and-red-flags` | History | headache and vision, numbness, gestation and parity, BP and urine before admission; and bleeding, fits or weakness, upper abdominal pain, fetal movements, medicines, allergies (all unrecorded: asking is the competency) | 3 |
| `rb-examination` | Examination | conscious level and colour, skin, vital signs, fetal heart | 2 |
| `rb-admission-workup` | Investigations | presenting count, clotting, renal function, urinalysis read; film, LDH and ADAMTS13 **ordered in the admission phase** | 2 |
| `rb-working-diagnosis` | Diagnosis | decision 1 first time | 3 |
| `rb-first-hours-plan` | Management | decision 2 first time | 3 |
| `rb-plasma-exchange-started` | Management · **critical** | plasma exchange **and** methylprednisolone given (the missed life-saving act) | 4 |
| `rb-delivery-plan` | Management | decision 3 first time, anaesthetic review, neonatal team | 2 |
| `rb-avoided-harm` | Safety · **critical** | no platelet transfusion, no neuraxial block, no thrombolysis; `scoredWhen` decision 2 attempted or any of the three given | 3 |
| `rb-no-unindicated-treatment` | Safety | no IV labetalol (no recorded reading calls for it) and no separate plasma infusion (exchange is available from the start); `scoredWhen` decision 2 attempted or either given | 1 |
| `rb-postpartum-escalation` | Management | decision 4 first time, ICU transfer, plasma exchange given at least twice | 3 |
| `rb-goals-of-care` | Management | decision 5 first time and the family meeting held | 2 |
| `rb-communication` | Communication (examiner) | SPIKES conversation with the family about her condition, the options and the uncertain outlook | 1 |

### How wrong choices score (measured 2026-10-30 with the core engine)

| Path | Score | Critical items missed | Flagged in the debrief |
|---|---|---|---|
| Reference `solution` | 28/28 (100 %) | none | none |
| Start and do nothing | 0/24 (0 %) | `rb-plasma-exchange-started` | — (`rb-avoided-harm` and `rb-no-unindicated-treatment` not scored) |
| Wrong first answer at every decision, then the key | 15/28 (54 %) | none | none |
| Wrong first at decision 1, 2 or 4 only | 25/28 (89 %) | none | none |
| Wrong first at decision 3 or 5 only | 26/28 (93 %) | none | none |
| Reference plus the report's platelets and FFP before plasma exchange | 24/28 (86 %) | `rb-avoided-harm` | platelet transfusion, FFP infusion (contraindicated) |
| Reference plus a neuraxial block and alteplase | 25/28 (89 %) | `rb-avoided-harm` | both contraindicated |
| Reference plus labetalol at admission (BP 120/79 mmHg) | 27/28 (96 %) | none | labetalol (contraindicated) |
| Reference plus a plasma infusion after exchange has started | 27/28 (96 %) | none | FFP infusion (contraindicated) |
| No plasma exchange or steroids | 17/28 (61 %), stuck before delivery (decision 3 stays locked) | `rb-plasma-exchange-started` | the caesarean, if attempted (contraindicated) |
| Caesarean before plasma exchange | 28/28 (100 %) | none | caesarean (contraindicated) |

Ordering cannot be scored by the condition language (CMCR_CASES "Known limits"): a caesarean before plasma exchange
is flagged as a contraindicated safety event in the debrief but costs no marks. The platelet, neuraxial and
thrombolysis harms are scored by the critical safety item. IV labetalol (no recorded blood pressure calls for it) and a
separate plasma infusion (exchange is available from the start, so an infusion is never needed as a bridge) need no
ordering condition: both are contraindicated in every phase and scored by `rb-no-unindicated-treatment`. To keep the
rubric at twelve items, the two history items were merged into `rb-history-and-red-flags`.

## Reference path (`solution`)

88 steps: start → 17 admission history items (including the 10 unrecorded ones she cannot answer) → the four exam
findings → IV access → blood count, clotting, renal, liver and urine ordered and read → head CT ordered and read (the
first CT: normal, timing not recorded) → film, LDH, haemolysis screen, ADAMTS13 sample, troponin, ECG and CTG ordered
(no recorded result) → decision 1 → haematology consultation → decision 2 → plasma
exchange, methylprednisolone, magnesium sulfate, red cells, anaesthetic review, neonatal team → decision 3 → caesarean
(→ `postpartum`) → the relative's account (her state, the delivery, the baby) → conscious level → post-delivery count,
LDH, renal function, MRI and operation note read; newborn record ordered → decision 4 → blood film read →
second plasma exchange, rituximab, ICU transfer (→ `icu`) → the relative (her condition, the family's thinking, her
wishes) → bedside review and depth of coma → ICU notes read → troponin ordered → noradrenaline → decision 5 → family
meeting (→ `followup`) → outcome record → finish. It scores **28/28** with no contraindicated act; `cases verify`
passes, and the offline demonstration finishes with every objective at the clinical score in clinical and in-world
mode, in both languages. The demonstration moves to the report's caesarean straight after decision 3, because the
static clock cannot show the days of exchange before it; the act is scored neutral for that reason (see the gating
choices above).

## Clinical numbers check

Every value is version 1.0.0's, unchanged; no reference range, vital sign or dose of the report has been added.
Extraction map (1.0.0 field → 1.1.0 field):

| Fact (as recorded) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 21-year-old woman | `patient.age`, `sex` | `patient` |
| First pregnancy, 37+1 weeks | `history.pregnancy` | `history.pregnancy`, triage note, chief complaint |
| Headache and 眼花 from a day before, no clear trigger | `history.headache`, `openingLine` | `history.headache`, `history.vision`, opening line |
| Left-sided limb numbness about 20 min, settled by itself | `history.neuro`, chief complaint | `history.numbness`, triage note |
| Earlier antenatal BP 138/90 mmHg, urine protein negative, untreated; at onset 140/100 mmHg, protein ++ | `history.bp` | `history.bp-history` |
| Regular antenatal care, no abnormality early on | `history.antenatal` | `history.antenatal-care` |
| Platelets "曾" (previously) 7×10⁹/L | `patient.triageNote` | triage note, `fbc` (admission) text |
| Alert, anaemic appearance, no petechiae or ecchymoses, T 36.2 °C | `exam.general` | `exam.general`, `exam.skin`, `exam.vitals` |
| Admission BP 120/79 mmHg, fetal heart rate 145/min | `exam.obstetric` | `exam.vitals`, `exam.fetal-heart` |
| Hb 66 g/L, platelets 6×10⁹/L, routine coagulation normal | `investigations.cbc` | `fbc`, `coagulation` (admission; dated "before delivery, exact timing not recorded") |
| Creatinine 115 μmol/L, ALT 51 U/L, urine RBC +++, protein ++ | `investigations.organ` | `renal-function`, `liver-function`, `urinalysis` (admission; dated as above) |
| Caesarean delivery | `investigations.postpartum` | phase `postpartum`, `operative-note`, `caesarean-section` response |
| After the caesarean still (仍) recurrent impaired consciousness | `investigations.postpartum` | `exam.postpartum-consciousness`, `history.postpartum-status`, nonverbal reason |
| Lowest platelet count after the caesarean 8×10⁹/L; LDH 1600 then 4880 U/L; highest creatinine 268 μmol/L | `investigations.postpartum` | `fbc`, `ldh`, `renal-function` (postpartum, dated "after the caesarean") |
| MRI: multiple acute ischaemic lesions | `investigations.tma` | `brain-mri` (postpartum, icu; dated "timing not recorded") |
| Later smear: many schistocytes | `investigations.tma` | `blood-film` (postpartum, icu; dated "timing not recorded") |
| First CT normal | decision `evidence`, option `normal-ct` and its feedback | `head-ct` (from admission on, as the "initial" CT; dated "timing not recorded") |
| ADAMTS13 activity, inhibitor, full haemolysis panel not documented | `investigations.tma`, `unknowns` | `adamts13`, `haemolysis-screen` (no result), unknowns |
| TTP considered late; FFP given; no plasma exchange documented | `investigations.followup` | `followup`, FFP and TPE responses |
| Repeated platelet transfusions | `learningOutcomes[3]`, `rubric.rb-safety` | `followup`, platelet response, decision distractors |
| Heart failure, intubation, deep coma, vasopressor support | `investigations.followup`, `nonVerbalReason` | `icu-notes`, `exam.icu-*`, `history.icu-status`, `followup` |
| Family withdrew her from treatment; outcome after leaving not recorded | `investigations.followup` | `followup`; staged as the family's thinking in `history.family-concerns` |

Derived values (editorial, for teaching): creatinine 115 μmol/L ≈ 1.30 mg/dL (÷ 88.4), above the ACOG 2020
severe-feature threshold of 1.1 mg/dL (≈ 97 μmol/L); 268 μmol/L ≈ 3.03 mg/dL; Hb 66 g/L = 6.6 g/dL; LDH 1600 →
4880 U/L is a ≈ 3.1-fold rise; platelets 6–8×10⁹/L = 6,000–8,000/μL. PLASMIC cannot be completed: the recorded items
give platelets < 30×10⁹/L, creatinine < 2.0 mg/dL at admission and (as "normal" clotting) presumably INR < 1.5, but
haemolysis markers, MCV and the cancer and transplant history are not recorded — say so rather than estimate a score.

Doses in the case are guideline formulas, not the report's: methylprednisolone 1 g/day × 3 days and plasma exchange
1.5 → 1.0 plasma volumes (BSH 2023); magnesium sulfate 4–6 g loading, 1–2 g/h (ACOG 2020); rituximab 375 mg/m²
weekly × 4; labetalol 20 mg IV; alteplase 0.9 mg/kg (max 90 mg). No weight is recorded, so no dose is computed.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did it feel when the platelet count came back at 6, with a baby still to be born?"
2. **Description** — "Take me through the first hours: what did you think it was, what did you send, and what did
   you start before the delivery?"
3. **Analysis**
   * "Which findings did severe pre-eclampsia explain, and which did it not? What made HELLP less likely?"
   * "Why does the ADAMTS13 sample go before any plasma — and why not wait for its result?"
   * "She had focal symptoms and a count of 6. What imaging did you want before anything invasive, and why?"
   * "Her count was 6. Why did you not transfuse platelets? When would you — and who decides on cover for an operation
     that cannot wait?"
   * "What anaesthetic did you plan for the caesarean, and what threshold were you thinking of?"
   * "After the birth, which numbers told you the disease had not stopped?"
   * "The MRI showed acute ischaemic lesions. What would thrombolysis have done here?"
   * "The report's team gave plasma, not plasma exchange, and platelets repeatedly. What would you say to them today?"
   * "The family wanted to take her out of hospital. How did you open that conversation, and what did you learn about her?"
4. **Summary** — "What will you do the next time a pregnant woman has single-figure platelets and neurological
   symptoms?"

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it | Where it scores |
|---|---|---|
| Calling it HELLP or pre-eclampsia and relying on delivery | decision 1 and 2 distractors; feedback cites ACOG 2020 criteria and ISTH 2020 | `rb-working-diagnosis`, `rb-first-hours-plan` |
| Waiting for ADAMTS13 before plasma exchange; plasma infusion instead | decision 2 distractor; FFP contraindicated in every phase (exchange is available) | `rb-first-hours-plan`, `rb-no-unindicated-treatment` |
| Platelet transfusion to "make her safe" (the report's practice) | decisions 2–4 distractors; `platelet-transfusion` always contraindicated | `rb-avoided-harm` (critical) |
| Spinal or epidural at single-figure platelets | decision 3 distractors; `neuraxial-block` contraindicated | `rb-delivery-plan`, `rb-avoided-harm` |
| Operating before plasma exchange has started | caesarean contraindicated before exchange; decision 3 locked until exchange starts | flagged |
| Treating the earlier BP of 140/100 now (admission 120/79) | `labetalol` contraindicated in every phase (no recorded reading calls for it) | `rb-no-unindicated-treatment` |
| Expecting the disease to settle after delivery | decision 4 distractors (HELLP, wait 72 h) | `rb-postpartum-escalation` |
| Stroke pathway for the MRI lesions | decision 4 distractor; `alteplase` contraindicated | `rb-avoided-harm` |
| Futility or persuasion instead of shared decisions | decision 5 distractors; examiner item | `rb-goals-of-care`, `rb-communication` |
| No head imaging despite focal symptoms and a count of 6 | the head CT is an `essential` record: never ordered, it is listed among the missing essential tests in the debrief | — |
| Inventing the unrecorded (vital signs, ADAMTS13, the baby) | unknown items, no-result records, `examNotRecorded` | — |

## Embodied mode

* **Where she is.** Ward bed 1 (`inpatient`) at the start. The caesarean takes her to the operating theatre
  (`destination: { setting: "operating-room" }`), the `postpartum` phase brings her back to a ward bed
  (`location: { setting: "inpatient" }`), and the ICU transfer moves her to ICU bed 1 (`destination` and the `icu`
  phase `location`). No investigation moves her: the head CT and MRI are existing reports (`requires: ["records"]`),
  read at a records terminal or at the bedside.
* **Kit.** IV access is a procedure (`iv-access`, treatment or crash cart); plasma exchange needs the apheresis
  machine (a cart in the ward equipment bay and in the ICU), blood products and IV access; the CTG cart stands by
  ward bed 1 (bedside test, no recorded trace); the 12-lead ECG needs the ECG cart (`ecg-12lead`, at the nursing
  station; no recorded tracing); magnesium, rituximab and noradrenaline need the bedside infusion pump; bloods are
  sampled at the patient. The caesarean, the consultations and the family meeting need only the clinician.
* **Record reviews.** Head CT, MRI, operation note, newborn record, ICU notes and the outcome record are
  `performedAt: "records"`, `requires: ["records"]`, `risk: "none"`.
* **Who speaks.** She is alert on admission and answers for herself (`speaker: "patient"` on every admission item).
  From the caesarean on she cannot speak (`nonVerbalWhen: { "not": { "phase": "admission" } }`, reason "recurrent
  impaired consciousness since the caesarean"), and her relative answers the later items in the relative's own voice
  (`companion.answersHistory: true`; the later items carry no `speaker`). The per-case check notes that a 21-year-old
  with an answering companion should be justified: here the companion answers only while she cannot speak — every
  item she can answer is hers.
* **Scope of practice.** Plasma exchange, the caesarean and the neuraxial block are medical; drugs, fluids and blood
  products follow their kinds (nursing administration); consultations, the transfer and the family meeting are
  clinician acts.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-1067495:"` passes in en and zh-CN (every objective done,
  in-world score equal to the clinical score).

## Source and adaptation (fidelity limits)

**From the report, via version 1.0.0 (kept as fact).** Every fact in the extraction map above: her age, the first
pregnancy at 37+1 weeks, the day of headache and 眼花, the 20-minute left-sided limb numbness, the BP and urine
history, the regular antenatal care, the earlier platelet count, the admission examination and results, the
caesarean, the postpartum course and results, the MRI, the first CT, the film, the late consideration of TTP, the FFP,
the repeated platelet transfusions, heart failure, intubation, deep coma, vasopressors and the family's withdrawal.

**Adapted for teaching.** Her lay words and her worries (labelled as part of the role; they add no fact); the
relative (version 1.0.0 records "the family", with no relationship) and the relative's words; the staging of the
family's thinking about stopping into the ICU phase (1.0.0 records that the family eventually took her away); the
first head CT shown from admission on (1.0.0 calls it the initial CT) and the MRI and the later film placed after the
delivery, all three dated "timing not recorded"; the presenting blood results dated "before delivery (exact timing not
recorded)", as 1.0.0 lists them apart from the post-caesarean values without a time; the ward–theatre–ward–ICU
staging; the staff characters (Midwife Lan, Dr Cen, Dr Pang, Dr Fan); the decisions, interventions, rubric,
feedback, teaching points and doses (current guidance).

**Inconsistencies in 1.0.0 kept, not resolved.**
* Three platelet counts: "previously" 7×10⁹/L (triage note), 6×10⁹/L (the presenting count, dated before the delivery) and a postpartum "lowest"
  of 8×10⁹/L, although 6 is lower than 8. The case keeps all three as written.
* BP 140/100 mmHg "at onset" against 120/79 mmHg on admission; where and when the first was measured, and whether
  anything was given in between, is not recorded.
* "剖宫产后**仍**反复意识不清": the "still" implies impaired consciousness before the caesarean, while the admission
  examination records her as alert. The case keeps "still" and records no pre-delivery episode.
* The first head CT exists in 1.0.0 only inside a decision option ("an initially normal CT") and its feedback; the
  case shows it as normal from admission on, with its timing "not recorded".

**Not recorded and kept unknown** (`unknowns`, unknown history items, no-result records, `examNotRecorded`):
ADAMTS13 activity and inhibitor, genetic testing; the full haemolysis panel, admission LDH, white cells and red cell
indices; the caesarean's timing, indication, anaesthetic and blood loss; the baby; the CT, MRI and film timing and the
MRI sites; transfusion numbers and doses; magnesium, antihypertensives, corticosteroids; all other vital signs, the
basis of the heart-failure diagnosis (no troponin, ECG or echocardiogram result), ventilator settings and vasopressor
doses; past history, medicines, allergies,
family history; the family's reasons and the outcome after she left.

**Wording of unknowns (STANDARD §6.3).** Because the article has not been checked, no text claims that the *report*
lacks something: no-result records say "No result is recorded for this test" / “此项检查没有结果记录”, steps the case
does not record say "This case does not record whether…; it does not simulate the effect", `examNotRecorded` says
"This case does not record this examination." / “本病例没有记录这项检查。”, and the patient and relative answer
unknowns in lay words ("I'm not sure, doctor." / “这个我说不上来，医生。”).

**Privacy.** Pseudonym 李知远 / Li Zhiyuan (unchanged from 1.0.0); no hospital, date, place or occupation; relative
time only. **Figures.** The figure extracted from the report for this case (the MRI, `fig01.png`) is withheld in
the media review (residual overlay text cannot be excluded); its finding is kept as text, and no decision depends on
reading the image.

### To verify

Details to look for in the full article (the source check is pending):
* The full presenting blood panel and when it was taken: white cells, MCV, reticulocytes, bilirubin, haptoglobin, direct antiglobulin test,
  AST, admission LDH, and the actual PT/APTT/fibrinogen values behind "routine coagulation normal".
* The sequence and timing of the three platelet counts (7, 6 and the lowest after the caesarean, 8 ×10⁹/L) and of the two LDH values.
* Where and when BP 140/100 mmHg and protein ++ were measured; any antihypertensive or magnesium sulfate given.
* Whether impaired consciousness began before the caesarean (the 1.0.0 "仍"); any seizure.
* The caesarean: timing after admission, indication, anaesthetic, platelet cover, blood loss; the baby's condition
  (Apgar score, platelet count, outcome).
* The first head CT (timing, report) — 1.0.0 mentions it only in a decision option; the MRI timing and lesion sites
  (figure withheld); the blood film timing and schistocyte percentage.
* When and why TTP was first considered; FFP volumes and dates; the number of platelet transfusions; any
  corticosteroid, rituximab or plasma exchange, and why exchange was not done (availability?).
* The basis of the heart-failure diagnosis (echo, troponin), and when she was intubated and started on vasopressors.
* The family's reasons for withdrawing treatment; any follow-up of mother or baby.
* Whether the article reports any ADAMTS13 or inhibitor result after all (1.0.0 says none).

Guidance details to confirm in the full texts (taken from abstracts and secondary summaries):
* ISTH 2020 diagnosis guideline: the exact recommendations on pre-test probability and ADAMTS13 turnaround (start TPE
  with steroids when probability is high and the result is not available promptly).
* BSH 2023: the platelet-transfusion recommendation and its grade (1B in a secondary summary); the TPE start time
  ("within 4–8 hours" appears only in a teaching summary, so the case says "at once"); methylprednisolone 1 g/day × 3
  days (from the guideline's checklist); TTP first presenting in pregnancy (TPE and steroids as for immune TTP).
* ACOG Practice Bulletin 222: the magnesium regimen (4–6 g, 1–2 g/h), the HELLP thresholds (LDH ≥ 600 IU/L, AST/ALT
  > 2× upper limit, platelets < 100×10⁹/L), the severe-range BP rule (≥ 160/110 mmHg for 15 minutes or more) and
  delivery at ≥ 34 weeks after maternal stabilisation — taken from memory and secondary sources, not the full text.
* SOAP 2021: that the ≥ 70×10⁹/L low-risk threshold is stated for gestational thrombocytopenia, ITP and hypertensive
  disorders without other risk factors (confirmed at abstract level) and does not address TTP.
* AHA/ASA 2026 acute ischaemic stroke guideline (it replaces the 2018 guideline and its 2019 update): the exact
  wording and class of its thrombocytopenia item (platelets < 100×10⁹/L) among the thrombolysis contraindications,
  which the 2026 text revised. The case says only that a single-figure count with a fresh caesarean wound rules lysis
  out and that < 100×10⁹/L has long been an exclusion; the guideline, DOI and online date were confirmed by search
  (PubMed 41582814, the AHA professional page), the text was not reachable.
* Caplacizumab: the ISTH 2020 remarks (immune TTP confirmed, or highly probable while ADAMTS13 is pending; with
  exchange and immunosuppression), the 2025 focused update's wording (search summaries confirm the recommendation is
  unchanged in direction and strength), the BSH 2023 recommendation, and the labelling on pregnancy and breastfeeding
  (avoid in pregnancy as a precaution; a decision on breastfeeding) — from memory and secondary summaries. The Chinese
  name 卡普赛珠单抗 is given with the INN.
* BSH 2023: a troponin and an ECG at presentation of suspected TTP (cardiac involvement).
* ISTH 2025 focused update: volume, pages and full author list (DOI confirmed; issue not yet assigned in the record seen).
* Rituximab 375 mg/m² weekly × 4 in TTP (standard regimen; not checked against a guideline text here).
* The DOI of the Chinese hypertensive-disorders guideline (2020) could not be confirmed, so it is cited without one.
* Clinician input: an obstetric anaesthetist and a haematologist should review decision 3 (in particular whether to
  give platelet cover for an unavoidable caesarean) and the ICU team decision 5.

## Matcher notes

* 39 `extensions.testUtterances` (22 zh-CN, 17 en; 2 look-alike negatives), none equal to a canonical question or a
  keyword; every required item and both phase twins are covered. `cases verify`: 39/39, no extra selections.
* **Phase twins.** `postpartum-status` supersedes `headache`, `vision` and `numbness` (asking how she is after the
  operation answers for the admission complaints and credits them); `icu-status` supersedes `postpartum-status`.
* **Overlaps separated with `excludeKeywords`:** `headache` vs numbness, BP and vision questions; `pregnancy` vs fetal
  movements and BP/protein; `antenatal-care` vs BP and urine protein; `epigastric-pain` vs fetal movements (肚子);
  `medications` vs allergies and BP tablets; `pmh` vs family; `family-history` vs the family's plans (家里打算…);
  `delivery-story` vs questions about the baby.
* English canonical questions were checked for reducing to one token ("How is she now?" reduced to "now" and was
  rephrased); run-together keywords (`broughtyouin`, `howisshenow`, `lookather`) avoid one-word wildcards.
* **Orders.** The ADAMTS13 test has a neutral name ("Send-away specialist haemostasis assay") so no confirmatory test
  is named before decision 1; its aliases (ADAMTS13, vWF-cleaving protease…) find it. Short aliases that are
  substrings of other words ("ct", "alt", "film", "dat", "nst", "tte") were avoided.
* Interventions: "platelets" reaches the platelet transfusion; red cells exclude 血小板/platelet; the thrombolysis item
  answers to "tpa", plasma exchange to "tpe/pex/plex". The ECG answers to "ecg/ekg/心电图", the echocardiogram to
  "echo/心超/心脏彩超"; neither alias is a substring of the other's.

## References

1. 龚洵, 邓东锐. 妊娠期血栓性血小板减少性紫癜一例. 中华产科急救电子杂志. 2013;2(3):212-214.
   doi:10.3877/cma.j.issn.2095-3259.2013.03.015. Available from: https://rs.yiigle.com/cmaid/1067495
2. Zheng XL, Vesely SK, Cataland SR, Coppo P, Geldziler B, Iorio A, et al. ISTH guidelines for the diagnosis of
   thrombotic thrombocytopenic purpura. J Thromb Haemost. 2020;18(10):2486-2495. doi:10.1111/jth.15006
3. Zheng XL, Vesely SK, Cataland SR, Coppo P, Geldziler B, Iorio A, et al. ISTH guidelines for treatment of thrombotic
   thrombocytopenic purpura. J Thromb Haemost. 2020;18(10):2496-2502. doi:10.1111/jth.15010
4. Zheng XL, et al. 2025 focused update of the 2020 ISTH guidelines for management of thrombotic thrombocytopenic
   purpura. J Thromb Haemost. 2025. doi:10.1016/j.jtha.2025.06.002
5. Scully M, Rayment R, Clark A, et al. A British Society for Haematology guideline: diagnosis and management of
   thrombotic thrombocytopenic purpura and thrombotic microangiopathies. Br J Haematol. 2023;203(4):546-563.
   doi:10.1111/bjh.19026
6. 中华医学会血液学分会血栓与止血学组. 血栓性血小板减少性紫癜诊断与治疗中国指南(2022年版). 中华血液学杂志.
   2022;43(1):7-12. doi:10.3760/cma.j.issn.0253-2727.2022.01.002
7. American College of Obstetricians and Gynecologists. Gestational hypertension and preeclampsia: ACOG Practice
   Bulletin, Number 222. Obstet Gynecol. 2020;135(6):e237-e260. doi:10.1097/AOG.0000000000003891
8. Bauer ME, Arendt K, Beilin Y, et al. The Society for Obstetric Anesthesia and Perinatology interdisciplinary
   consensus statement on neuraxial procedures in obstetric patients with thrombocytopenia. Anesth Analg.
   2021;132(6):1531-1544. doi:10.1213/ANE.0000000000005355
9. Kon AA, Davidson JE, Morrison W, Danis M, White DB. Shared decision making in ICUs: an American College of Critical
   Care Medicine and American Thoracic Society policy statement. Crit Care Med. 2016;44(1):188-201.
   doi:10.1097/CCM.0000000000001396

These nine strings are `debrief.references`. Also named in the case's feedback and checked the same way:
Rock GA, Shumak KH, Buskard NA, et al. Comparison of plasma exchange with plasma infusion in the treatment of
thrombotic thrombocytopenic purpura. N Engl J Med. 1991;325(6):393-397. doi:10.1056/NEJM199108083250604 ·
Goel R, Ness PM, Takemoto CM, Krishnamurti L, King KE, Tobian AA. Platelet transfusions in platelet consumptive
disorders are associated with arterial thrombosis and in-hospital mortality. Blood. 2015;125(9):1470-1476.
doi:10.1182/blood-2014-10-605493 · Prabhakaran S, et al. 2026 guideline for the early management of patients with
acute ischemic stroke: a guideline from the American Heart Association/American Stroke Association. Stroke. 2026.
doi:10.1161/STR.0000000000000513 ·
中华医学会妇产科学分会妊娠期高血压疾病学组. 妊娠期高血压疾病诊治指南(2020). 中华妇产科杂志. 2020;55(4):227-238.

**How they were checked (2026-10-30).** doi.org, Crossref and the publishers' sites are not reachable from this
environment (HTTP 403 at the proxy), so each DOI was confirmed by web search against indexing records that print it:
refs 2–3 (PubMed 32914582 and 32914526), ref. 4 (McMaster and ISTH records; issue and pages not yet assigned), ref. 5
(PubMed 37586700), ref. 6 (PubMed 35231985, PMC8980665), ref. 7 (PubMed 32443079), ref. 8 (PubMed 33861047), ref. 9
(PMC4788386); Rock 1991 (McMaster and Scilit records), Goel 2015 (PubMed 25588677), AHA/ASA 2026 (PubMed 41582814 and
the AHA professional page: published online 26 January 2026; volume and pages not yet seen). The
source article's DOI is the one verified in `scripts/cmcr-105-sources.json` (publisher check 2026-10-29). The 1.0.0
guideline URL `https://pmc.ncbi.nlm.nih.gov/articles/PMC13470878/` and its commentary were removed: the URL could
not be verified (the survey flagged it), and the 2025 update is cited by its verified DOI instead.

## Changelog

### 1.1.0 — 2026-10-30

1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked
against the full source article.

* **Safety and validity (survey critic and template findings).** A pre-delivery decision point now exists: decisions
  1–3 open at admission, before the caesarean (1.0.0's first decision opened after an off-screen delivery). The
  management key names the act — ADAMTS13 sample, then plasma exchange with corticosteroids, no platelet transfusion
  — instead of "assessment including plasma exchange". Magnesium sulfate, blood-pressure control, anaesthesia at a
  platelet count of 6, the CTG, delivery timing and mode, and the newborn are now taught; the neonatal outcome is an
  unknown. The family's withdrawal of treatment is taught with a decision and a SPIKES communication item. The
  critical items are now two acts (plasma exchange with steroids; no platelets, neuraxial block or thrombolysis), not
  a multiple-choice answer.
* **Voice.** The alert 21-year-old answers her own history (1.0.0 had a "Companion (educational role)" speak for her
  throughout); her relative answers only once she cannot speak. No answer says "the source does not provide this".
* **Spoilers.** The summary no longer names a thrombotic microangiopathy; the title names the presentation only; the
  ADAMTS13 test has a neutral name.
* **Structure.** Phases `initial`/`workup`/`confirmation`/`followup` → `admission`/`postpartum`/`icu`/`followup`; 15
  template history items → 23 (admission items limited to admission, phase twins after delivery and in ICU); exam
  2 → 7 (re-examination after delivery and in ICU); investigations 5 bundles → 19 single tests with structured values;
  interventions 0 → 18; decisions 3 → 5; rubric 11 → 12 (descriptive ids, `rb-unknown` removed); objectives 4 → 6;
  staff 1 → 4; references rebuilt in Vancouver form (the unverified PMC URL and the commentary removed).
* **Ids changed** (none referenced outside this case): history `neuro` → `numbness`, `bp` → `bp-history`,
  `antenatal` → `antenatal-care`, `family` → `family-history`, `surgery` → `psh`, `regular-medication` →
  `medications`, `prior-health` → `pmh`; `vaccines`, `exposure`, `function`, `expectations` removed (age-irrelevant or
  template slots); investigations `cbc` → `fbc` + `coagulation`, `organ` → `renal-function` + `liver-function` +
  `urinalysis`, `postpartum` → post-delivery results of `fbc`, `ldh`, `renal-function` and an exam finding, `tma` →
  `brain-mri` + `blood-film`; decisions `diagnosis`/`evidence`/`management` → `working-diagnosis`, `first-hours`,
  `delivery-plan`, `after-delivery`, `goals-of-care`; option ids neutral (1.0.0 used `yes`).
* **Contract wording.** The English review note ends "The case is not yet reviewed by a licensed clinician." (the
  collection test matches the lower-case phrase); otherwise it is the standard's §6 text.
* **Independent clinical review applied (2026-10-30).** The caesarean is no longer scored "indicated" after a single
  exchange: it is the report's delivery, scored neutral, still contraindicated before exchange, with a harm text that
  puts the bleeding risk on the single-figure count and a response that says its timing and indication are not
  recorded; decision 3's prompt says no count after exchange is recorded, its key says "no routine platelet cover",
  and its feedback defines "stable" and makes cover for an operation that cannot wait a joint haematology–anaesthesia
  decision; the debrief says "deliver once stable (general anaesthesia if a caesarean is needed)". Learning outcome 1
  no longer states a "single figures with normal clotting" rule: a TMA comes first with anaemia and neurological or
  renal involvement, confirmed on the film. Decision 1's distractors are near-misses that send the film and LDH too.
  Caplacizumab (ISTH 2020, conditional, unchanged in 2025) is in teaching point 2, the haematologist's knowledge and
  decision 4's feedback as a haematology decision (no intervention: a TTP-only drug in the treatment list would name
  the diagnosis from the start). Thrombolysis is cited to the AHA/ASA 2026 guideline. Labetalol and a separate plasma
  infusion are contraindicated in every phase and scored by the new `rb-no-unindicated-treatment` (the two history
  items merged to keep twelve). The MRI and the film are dated "timing not recorded", the presenting bloods "before
  delivery (exact timing not recorded)"; decision 4, learning outcome 5 and key reasoning 4 rest progression after the
  birth on the post-caesarean values. The head CT is an `essential` record shown from admission (the "initial" CT),
  a troponin and a 12-lead ECG can be ordered at presentation (no result recorded), and key reasoning 2 says that
  treatment waits for the film, not for ADAMTS13.

### 1.0.0

* Initial template version (PR #5).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1067495/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1067495 --lang en        # 88 steps · objectives 6/6 · decisions 5/5 · utterances 39/39 · rubric 28/28
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-1067495                   # PASS (depth floor, do nothing 0, wrong-first < reference)
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1067495:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1067495:"  # demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 21岁初产妇，孕37+1周，头痛、眼花1天（无明显诱因），曾左侧肢体麻木约20分钟后自行缓解；早先产检血压
138/90 mmHg、尿蛋白阴性未处理，发病时140/100 mmHg、尿蛋白++；此前血小板7×10⁹/L。入院神志清楚、贫血貌，无出血点
瘀斑，体温36.2 ℃，血压120/79 mmHg，胎心145次/分；分娩前（具体时间未记录）血红蛋白66 g/L，血小板6×10⁹/L，凝血常规
正常，肌酐115 μmol/L，ALT 51 U/L，尿红细胞+++、尿蛋白++。剖宫产后仍反复意识不清，血小板最低8×10⁹/L，LDH 1600后升至
4880 U/L，肌酐最高268 μmol/L；头颅MRI多发急性缺血病灶、首次头颅CT正常、后续血涂片见大量破碎红细胞（三者时间均未
记录）。原报告后期才考虑
TTP，输新鲜冰冻血浆、反复输注血小板，未记录血浆置换；之后出现心力衰竭、气管插管、深昏迷、升压药支持，家属最终带离
治疗，离院后结局未记录。ADAMTS13及抑制物、完整溶血指标和新生儿情况均未记录。本版患者事实全部沿用1.0.0版的提取，
尚未对照原文全文核对。

**学习目标。**
1. 鉴别TTP、HELLP、重度子痫前期和妊娠合并ITP：血小板个位数并伴贫血、神经或肾脏受累而凝血正常时首先考虑血栓性微血管病，并用血涂片确认微血管病性溶血（ISTH 2020）。
2. 输任何血浆前留ADAMTS13标本，立即开始血浆置换（首次1.5倍血浆容量）和甲泼尼龙1 g/d×3天，不等结果（ISTH 2020；BSH 2023）。
3. 说明疑似TTP为何避免输血小板（BSH 2023），以及血浆输注为何不能代替置换。
4. 为血小板极低的足月孕妇制定分娩方案：母体稳定后分娩（ACOG 2020）、硫酸镁、全身麻醉而非椎管内阻滞（SOAP 2021）、新生儿团队到场。
5. 依据剖宫产后的记录（反复意识不清、LDH 1600→4880 U/L、血小板最低8×10⁹/L、肌酐最高268 μmol/L）识别TMA未随分娩缓解，升级为ICU内每日血浆置换，并规划ADAMTS13、补体介导TMA和先天性TTP的鉴别。
6. 家属考虑撤除治疗时，按SPIKES和ACCM/ATS 2016共同决策原则主持家庭会议。

**关键决策。** ① 入院工作诊断：按TTP对待的血栓性微血管病，不排除重度子痫前期，立即查涂片、LDH、溶血指标并在输血浆前留
ADAMTS13（干扰项同样送涂片和LDH，但判断和处理有误：HELLP输板后当天分娩、ITP用丙球和激素并输板做椎管内麻醉、重度子痫前期
产后不恢复才用血浆）；② 分娩前处理：立即血浆置换加甲泼尼龙，不输血小板，硫酸镁（干扰项：原报告的反复输血小板、输血浆等结果、
先分娩）；③ 分娩方案：置换后稳定（血小板回升、神经症状平稳）再分娩，剖宫产用全身麻醉、不做椎管内阻滞，不常规预防性输板
（不能等待的手术是否输板由血液科与麻醉科共同决定），新生儿团队到场（干扰项：输板后腰麻、继续妊娠到40周、引产加硬膜外）；
④ 产后：病情没有随分娩缓解，每日置换加激素、利妥昔单抗、不输板、转ICU，卡普赛珠单抗由血液科决定（干扰项：原报告的血浆加
反复输板、等待产后HELLP缓解、溶栓、改用依库珠单抗）；⑤ ICU家庭会议：共同决策（干扰项：说服继续、
不谈话即出院、断言徒劳）。

**复盘要点（PEARLS）。** 先谈感受；复述最初几小时的判断、送检和分娩前治疗；分析：哪些表现子痫前期解释不了、为何先留
ADAMTS13标本又不等结果、为何不输血小板、剖宫产麻醉怎么选、分娩后哪些指标说明病情没停、溶栓为何有害、原报告的血浆与输板
放到今天怎么看、怎样与家属开始谈话；总结下次遇到孕妇血小板个位数伴神经症状时怎么做。待核实：完整的入院化验、三次血小板
计数的顺序、剖宫产与新生儿情况、首次头颅CT、ADAMTS13及治疗细节、AHA/ASA 2026溶栓禁忌的原文、卡普赛珠单抗的妊娠与哺乳
说明（见上文 To verify）。本病例为人工智能辅助编写、经编辑审核
的教学材料，尚未经执业医师审核。
