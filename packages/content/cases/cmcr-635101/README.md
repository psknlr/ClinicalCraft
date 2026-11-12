# cmcr-635101 — Thirst, polyuria and vomiting · 24-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 叶艺艺, 陆泽元, 邵豪, 赖丽萍, 庄雄杰. 暴发性1型糖尿病并β地中海贫血一例报道.
中华糖尿病杂志. 2010;2(4):307. Version 1.1.0 re-authors the case to the clinical content standard **from the facts that
version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet been
checked against the full source article** (STANDARD §6). The patient (赵予宁 / Zhao Yuning) is the pseudonym 1.0.0 gave
him; the nurse (唐护士 / Nurse Tang), the endocrinology attending (严医生 / Dr Yan) and the haematology consultant
(符医生 / Dr Fu) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not record stays
unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-635101` / `1.1.0` |
| setting / facility | `emergency` / `general-hospital` (ED resus bay; a ward bed from the third phase) |
| specialty | endocrinology, emergency medicine (haematology enters through the ward results and the consultant; it is kept off the card because it would hint at the finding) |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have an endocrinologist or emergency physician review it before teaching use |
| phases | `ed` 急诊抢救区：到院时 / ED resus bay: on arrival → `treatment-12h` 补液和胰岛素治疗 12 小时后 / Twelve hours into fluids and insulin → `ward` 病房：入院次日起 / On the ward: from the day after admission (ward bed) → `followup` 随访：2 周与 3 个月 / Follow-up: two weeks and three months — all one-way, none learner-switchable |
| content | 20 history items (6 recorded facts, 2 labelled teaching devices, 12 unknown; 7 required) · 7 exam findings (4 required, all at presentation) · 16 investigations (1 record review; 10 with an `available: false` result in one or more phases) · 19 interventions (7 always contraindicated, 2 contraindicated in a window) · 6 objectives · 5 decisions (24 options) · 12 rubric items (11 deterministic, weight 29; 1 examiner-judged; 2 critical) · 3 staff · 6 learning outcomes · 6 teaching points · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. Diagnose diabetic ketoacidosis from glucose, ketone and acid–base results and grade it, with the level of care, by
   the 2024 ADA/EASD/JBDS-IP/AACE/DTS consensus — without being misled by the absent fruity breath or the prominent
   vomiting.
2. Start isotonic fluid and a fixed-rate intravenous insulin infusion at 0.1 units/kg/h in the first hour, withhold
   potassium at 6.23 mmol/L under ECG monitoring until it falls below 5.0–5.5 mmol/L, and give no bicarbonate at pH 7.17
   (2024 consensus; JBDS-IP 2023).
3. Calculate the glucose-corrected sodium and the effective osmolality for Na⁺ 117.05 mmol/L with glucose 23.8 mmol/L,
   and choose isotonic fluid and plan sodium monitoring from them (European hyponatraemia guideline 2014).
4. Confirm that ketoacidosis has resolved (ketones < 0.6 mmol/L with venous pH ≥ 7.3 or bicarbonate ≥ 18 mmol/L) and
   give subcutaneous basal insulin 1–2 hours before stopping the infusion (2024 consensus).
5. Apply the Japan Diabetes Society 2012 criteria to diagnose fulminant type 1 diabetes and distinguish it from classic
   autoimmune type 1, ketosis-prone type 2 and monogenic diabetes.
6. Explain why β-thalassaemia trait can make HbA1c unreliable, judge control by glucose monitoring, glycated albumin or
   fructosamine instead, give no iron without proven deficiency, and offer carrier counselling and partner testing (ADA
   2026; BSH 2023).

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list.

## Clinical summary (spoilers)

**Presentation.** A 24-year-old man (BMI 17.62 kg/m²) with **five days of thirst and polyuria** and **three days of nausea
and vomiting**. He looks acutely unwell, with dry skin and reduced turgor; temperature 36.7 °C, pulse 106/min,
respiratory rate 25/min, blood pressure 106/59 mmHg; **no fruity smell on his breath**; no obvious abnormality of the
heart or lungs. No diabetes had been diagnosed before (1.0.0's wording — see To verify), and there is no family history
of diabetes or autoimmune disease.

**Emergency results.** Glucose **23.8 mmol/L**; urine glucose ++++, **ketones +++**; **pH 7.173, bicarbonate 7.1 mmol/L,
base excess −21.6 mmol/L**; **K⁺ 6.23 mmol/L, Na⁺ 117.05 mmol/L, creatinine 179 μmol/L**. This is diabetic ketoacidosis:
moderate by pH, severe by bicarbonate (2024 consensus bands), with hyperkalaemia, a sodium that stays low once corrected
for glucose (about 122–125 mmol/L; effective osmolality about 258 mOsm/kg) and a raised creatinine.

**The recorded course.** After fluids and insulin, **pH 7.375 and bicarbonate 20 mmol/L at 12 hours**; **insulin-pump
treatment began the next day**. The day after admission **HbA1c was 6.8 %**; after the acidosis was corrected **fasting /
2-hour post-meal C-peptide was 50 / 70 pmol/L**, then 80 / 100 at two weeks and 60 / 170 at three months; **GAD, ICA and
IAA were negative**. Repeated blood counts showed **haemoglobin 110.7–126 g/L with persistent microcytosis**; **HbA2 was
4.6 %** and he was **heterozygous for a β-globin (HBB) codon 17 variant** (recorded as "M/N"). At three months HbA1c was
6.9 % and the C-peptide remained low. Nothing later is recorded.

**Diagnosis.** Fulminant type 1 diabetes presenting in diabetic ketoacidosis, with **β-thalassaemia trait** (a
heterozygous carrier state; the report's title says "β地中海贫血", β-thalassaemia). He meets all three Japan Diabetes
Society 2012 criteria: ketoacidosis five days after hyperglycaemic symptoms; glucose 23.8 mmol/L (≥ 16.0) with HbA1c
6.8 % (< 8.7 % NGSP); fasting C-peptide 50 pmol/L (< 100) and post-meal 70 pmol/L (< 170).

**Today's answer.** Isotonic fluid and a fixed-rate intravenous insulin infusion at 0.1 units/kg/h in a monitored bed;
ECG monitoring with potassium withheld until a repeat value is below 5.0 mmol/L (5.5 in JBDS-IP); no bicarbonate above
pH 7.0; no hypotonic fluid with a corrected sodium of about 122–125 mmol/L; confirm resolution with ketones and give basal
insulin 1–2 h before the infusion stops; classify by onset and C-peptide, not by HbA1c alone, because his trait can bias
HbA1c by method; judge control by glucose data; no iron without proven deficiency; carrier counselling with partner and
family testing.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the recorded one. There is
  no monitor baseline: the monitoring step's response says the readings are not recorded.
- **Four one-way phases** (none learner-switchable):
  - `ed` — the history in his own words (recorded: thirst and polyuria five days, nausea and vomiting three days, no
    diabetes diagnosed before, no family history of diabetes or autoimmune disease; the rest unknown), the presenting
    examination (7 findings), the bedside glucose, urinalysis, blood gas and kidney function with electrolytes, the ECG
    and blood-ketone orders (no result recorded), decisions 1 and 2 and the first-hour acts. The HbA1c and C-peptide can
    be sent here; their results say the recorded values come later.
  - `treatment-12h` — opens once `obj-ed-assess`, `obj-ed-tests` and `obj-first-hour` are complete; the last needs decision
    2 right **and** a fluid act (isotonic fluid or 0.45 % saline) **and** an insulin act (the infusion or subcutaneous
    insulin on the ward). Holds the **repeat blood gas 12 hours after fluids and insulin** (pH 7.375, bicarbonate 20
    mmol/L); the glucose, ketone and electrolyte orders answer "no result is recorded". Decision 3 and a committed
    transition act (basal insulin, a pump, correction doses or stopping the infusion).
  - `ward` — opens once `obj-12h` is complete and moves him to a **ward bed** (`location: {setting: "ward"}`, a staging
    convention: 1.0.0 does not record where he was). The **next-day HbA1c**, the **C-peptide after correction of the
    acidosis**, the **islet antibodies** (decision 4), then the **repeated blood counts**, **haemoglobin electrophoresis**
    and the **send-away genetic test** (decision 5); iron studies and glycated albumin answer "no result is recorded".
  - `followup` — opens once all five decisions are decided and `obj-ward` is complete: the **C-peptide at two weeks and
    three months**, the **three-month HbA1c** and the **reported course and outcome** record.
- **Staging conventions** (not recorded times or places): the emergency results are shown in the ED; on the ward the
  HbA1c ("next day" in 1.0.0), the C-peptide ("after the acidosis was corrected") and the islet antibodies, blood counts,
  electrophoresis and genetic test (no time recorded); the two-week C-peptide with the three-month results (1.0.0 does
  not say what the two weeks are counted from).
- No prompt, hint, order response or harm text states a later phase's result before its record opens. The ED-phase
  HbA1c and C-peptide placeholders say only when the recorded values were taken.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-ed-assess` See the patient: history and bedside assessment | presentation, thirst, vomiting, diabetes before, family diabetes asked; general state, vital signs, hydration, breath examined |
| 2 | `obj-ed-tests` Emergency tests and a working diagnosis | glucose, urinalysis, blood gas, kidney function and electrolytes read (phase `ed`); `ed-diagnosis` right |
| 3 | `obj-first-hour` The first hour of treatment | `first-hour` right **and** a fluid act (`isotonic-fluid` or `half-normal-saline`) **and** an insulin act (`friii` or `sc-insulin-ward`) |
| 4 | `obj-12h` The next step at twelve hours | 12-hour gas read; `transition` right; a transition act (`sc-basal-insulin`, `csii-start`, `correction-only-insulin` or `stop-friii`) |
| 5 | `obj-ward` On the ward: inpatient tests and the long-term plan | HbA1c, C-peptide, islet antibodies, blood count, electrophoresis and genetic test read (phase `ward`); `classification` and `hba1c-plan` right |
| 6 | `obj-followup` Follow-up at two weeks and three months | follow-up C-peptide and HbA1c and the outcome record read |

Titles name no finding, test result or diagnosis (the journal lists later titles before they are reached). Hints are
Socratic questions that state no result the learner has not read ("With a very high glucose but only days of symptoms,
what would you expect the HbA1c to show — and which evidence does not depend on HbA1c at all?"). Objectives 3 and 4 need a **committed act**, right or wrong, so the 12-hour record cannot
open before the learner has started fluids and insulin, and the ward cannot open before a transition step; which act is
the learner's choice, so the critical act can still be missed. No objective contains a condition that can become
permanently false (no phase leaf, `whenIndicated`, first-try or `not`).

### Decisions

- **1 `ed-diagnosis`** (single; needs thirst and vomiting asked, vital signs, hydration and breath examined, and the four
  ED results read). Key: `dka-monitored-bed` — DKA with bicarbonate in the severe band, high potassium, low sodium and a
  raised creatinine: a monitored high-dependency or intensive care bed. Distractors: `mild-dka-ward` (no fruity breath,
  BP holding, pH > 7.1 → ward and SC insulin), `gastroenteritis` (the classic mimic), `starvation-ketosis` (underweight,
  three days of vomiting), `hhs` (fluids alone first).
- **2 `first-hour`** (single; needs decision 1). Key: `saline-insulin-hold-k` — 0.9 % saline 1 L in the first hour,
  insulin infusion 0.1 units/kg/h, no potassium until below 5.0–5.5 mmol/L, ECG monitoring and a recheck within 2 h.
  Distractors: `potassium-from-start` (40 mmol KCl in the first litre), `bicarbonate-first`, `half-saline` (0.45 %
  saline), `sc-insulin-oral-fluids` (the consensus's SC option misapplied).
- **3 `transition`** (single; needs decision 2 and the 12-hour gas). Key: `confirm-then-basal` — check ketones < 0.6
  mmol/L and that he can eat, give SC basal insulin, stop the infusion 1–2 h later. Distractors: `stop-now`,
  `correction-doses` (sliding scale only), `await-results` (infusion until HbA1c and C-peptide are back). The key's
  feedback names the report's own step (a pump from the next day) and the rule that applies to it.
- **4 `classification`** (single; needs decision 3, diabetes-before and family history asked, and the ward HbA1c,
  C-peptide and antibodies read). Key: `fulminant-t1d` (JDS 2012, lifelong insulin). Distractors:
  `ketosis-prone-t2d`, `classic-autoimmune` ("not the best answer": the fulminant subtype, no honeymoon),
  `monogenic` (MODY), `stress-hyperglycaemia`.
- **5 `hba1c-plan`** (select all; needs decision 4 and the blood count, electrophoresis and genetic test read). Keys:
  `diagnosis-stands`, `glucose-based-monitoring`, `carrier-counselling`. Distractors: `oral-iron`, `lower-insulin`
  (HbA1c 6.8 % "already at target").

Every option has its own feedback (2–4 sentences) naming the 2024 consensus, JBDS-IP 2023, the Japan Diabetes Society
2012 criteria, the ADA Standards of Care 2026, the 2023 laboratory guideline (Sacks et al.), the 2014 European
hyponatraemia guideline or BSH 2023. Option ids name their content. **No length cue:** in no single-best decision is the
key the uniquely longest option, in either language (measured on 2026-10-30, key / longest distractor in characters:
decision 1 zh-CN 51 / 54, en 160 / 164; decision 2 83 / 85, 172 / 193; decision 3 48 / 49, 137 / 142; decision 4 70 /
71, 157 / 162).

### Rubric (11 deterministic items, total weight 29, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 2 | presentation, thirst, vomiting, diabetes before, family diabetes, medicines, allergies asked (the last two unknown — asking is the competency) |
| `rb-bedside` | examination | 2 | general appearance, vital signs, hydration, breath examined |
| `rb-ed-tests` | investigations | 2 | glucose, urinalysis, blood gas, kidney function and electrolytes read in phase `ed` |
| `rb-ed-diagnosis` | diagnosis | 3 | `ed-diagnosis` right first time **and** `hdu-referral` given while in the ED (`whenIndicated`) |
| `rb-first-hour-plan` | management | 3 | `first-hour` right first time **and** `monitoring-plan` charted in the ED or at 12 h (`whenIndicated`) |
| `rb-first-hour-acts` | management | 4 | **critical** — `isotonic-fluid` and `friii` given while in the ED (`whenIndicated`, window `{phase: "ed"}`) |
| `rb-potassium-safe` | safety | 3 | **critical** — ECG ordered in phase `ed`, `cardiac-monitoring` given in the ED (`whenIndicated`), and no `kcl-added` |
| `rb-avoided-harm` | safety | 3 | no bicarbonate, 0.45 % saline, SC insulin on the ward, correction-only insulin, oral agent or oral iron, and `stop-friii` only once basal insulin or a pump was given (`whenIndicated`); scored once decision 2, 3 or 5 is attempted or any of these is given |
| `rb-transition` | management | 2 | `transition` right first time **and** SC basal insulin or a pump started |
| `rb-classification` | diagnosis | 3 | `classification` right first time |
| `rb-hba1c-plan` | management | 2 | `hba1c-plan` right first time **and** `genetic-counselling` and `diabetes-education` given |
| `rb-communication` | communication | (judged) | Calgary–Cambridge, case-specific: the emergency in plain words and why no potassium yet; the new sudden-onset type 1 diabetes and lifelong insulin; sick-day rules, ketones, hypoglycaemia; the carrier state, why HbA1c may mislead, partner and family testing; teach-back |

### How wrong choices score (measured with the reducer on 2026-10-30)

| path | deterministic score | critical items missed |
|---|---:|---|
| reference path (`solution`) | 29/29 (100 %) | none |
| start and do nothing | 0/26 | `rb-first-hour-acts`, `rb-potassium-safe` (finishing is refused: objectives incomplete) |
| wrong first answer at all five decisions, then right | 16/29 (55 %) | none |
| wrong first answer at decision 1, 2 or 4 only | 26/29 (90 %) | none |
| wrong first answer at decision 3 or 5 only | 27/29 (93 %) | none |
| reference path plus potassium chloride in the ED | 26/29 (90 %) | `rb-potassium-safe` |
| reference path without cardiac monitoring, or without the ED ECG | 26/29 (90 %) | `rb-potassium-safe` |
| 0.45 % saline and SC insulin on the ward instead of isotonic fluid and the infusion | 22/29 (76 %) | `rb-first-hour-acts` |
| … with isotonic fluid and the infusion given only at 12 hours | 22/29 (76 %) | `rb-first-hour-acts` |
| reference path plus bicarbonate in the ED | 26/29 (90 %) | none (`rb-avoided-harm` lost) |
| infusion stopped before the basal insulin | 26/29 (90 %) | none (`rb-avoided-harm` lost) |
| correction-only insulin at 12 h instead of basal insulin | 24/29 (83 %) | none (`rb-avoided-harm`, `rb-transition` lost) |
| reference path plus oral iron, or plus metformin, on the ward | 26/29 (90 %) | none (`rb-avoided-harm` lost) |
| reference path without genetic counselling | 27/29 (93 %) | none |
| reference path without the HDU referral, monitoring plan, education and CGM | 21/29 (72 %) | none |
| the report's own transition — an insulin pump in place of the basal injection | 29/29 (100 %) | none |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The seven always-harmful
interventions are `contraindicated` in every phase (each named in the debrief's safety list with its own harm text);
`stop-friii` is contraindicated until basal insulin or a pump has been given, and `csii-start` in the ED. The
avoided-harm item counts only once a harm was possible (`scoredWhen`), so doing nothing earns 0.

### Critical items

`rb-first-hour-acts` (the missed life-saving act: isotonic fluid and the insulin infusion started while he is still in
the ED — the 12-hour record opens only after a fluid act and an insulin act, so a learner who chose 0.45 % saline or SC
insulin cannot make it up later) and `rb-potassium-safe` (the dangerous error at K⁺ 6.23 mmol/L: no ECG, no monitoring, or
potassium added against that value). Both are acts timed to the ED phase; neither reads a final-phase record. **Known
limit:** the potassium trap is contraindicated in every phase, because 1.0.0 records no potassium after the first value —
a learner who adds potassium at 12 hours "by protocol" is told why (no repeat value is recorded) and loses the critical
item. Debrief it as the teaching point it is: potassium follows a measured value.

## Reference path (`solution`)

89 steps, static clock: start → presentation, thirst, vomiting → general state, vital signs, hydration, breath, heart,
lungs, BMI → **IV cannula and bloods** → glucose, urinalysis, blood gas, kidney function and electrolytes (read in the ED)
→ **cardiac monitoring** → **ECG** (no result recorded) → blood ketones (no result recorded) → diabetes before, family
history, prodrome, abdominal pain, weight, drowsiness, eating, drinks → `ed-diagnosis` → **HDU referral** → allergies,
medicines, alcohol and drugs, earlier glucose tests, past illnesses, his worry → amylase and lipase (no result recorded)
→ `first-hour` → **isotonic fluid** → **monitoring plan** → **insulin infusion** → (phase `treatment-12h`) repeat gas,
electrolytes, ketones and glucose (only the gas has a result) → diabetes education → `transition` → **SC basal insulin** →
(phase `ward`) **stop the infusion** → his worry about insulin → HbA1c, C-peptide, antibodies → `classification` → blood
count, earlier blood problems, family blood conditions → electrophoresis, genetic test, iron studies and glycated
albumin (the last two no result) → CGM → **genetic counselling** → `hba1c-plan` → (phase `followup`) C-peptide, HbA1c,
outcome record → finish. `cases verify` passes: objectives 6/6, decisions 5/5, rubric 29/29, utterances 40/40. The
demonstration asks only questions a clinician would ask a 24-year-old in this situation.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 24-year-old man | `patient.age`, `sex` | `patient.age`, `sex`; title |
| thirst and polyuria for 5 days; nausea and vomiting for 3 days | `chiefComplaint`; `history.osmotic`, `history.vomiting` | `chiefComplaint` (lay words), `triageNote`; `history.presenting`, `thirst-duration`, `vomiting-duration` |
| no prior diabetes diagnosis given ("the source supplied no prior diabetes diagnosis", disclosure on-ask) | `history.diabetes-background` | `history.diabetes-before` ("nobody's ever told me I had diabetes") — To verify |
| no family history of diabetes or autoimmune disease | `history.family-known` | `history.family-diabetes` |
| the blood disorder identified only after repeated abnormal blood counts | `history.anaemia-context` | `history.blood-known` (ward and follow-up phases: he did not know of a blood problem before admission) |
| acutely unwell; dry skin, reduced turgor; BMI 17.62 kg/m²; T 36.7 °C, P 106/min, RR 25/min, BP 106/59 mmHg; no fruity breath; heart and lungs without obvious abnormality | `exam.dehydration` | `exam.ex-general`, `ex-hydration`, `ex-bmi`, `ex-vitals`, `ex-breath`, `ex-heart`, `ex-lungs` (phase `ed`); `triageNote` (vital signs as triage readings); `appearance.build: "slim"` |
| glucose 23.8 mmol/L; urine glucose ++++, ketones +++; pH 7.173, bicarbonate 7.1 mmol/L, base excess −21.6 mmol/L; K⁺ 6.23, Na⁺ 117.05 mmol/L; creatinine 179 μmol/L | `investigations.dka` (workup) | `investigations.glucose`, `urinalysis`, `blood-gas`, `u-and-e` (phase `ed`, structured `values`) |
| after fluids and insulin: pH 7.375, bicarbonate 20 mmol/L at 12 hours | `investigations.followup` | `investigations.blood-gas` (phase `treatment-12h`); `outcome` |
| insulin-pump treatment the next day | `investigations.followup` | `interventions.csii-start` response; `outcome`; decision 3 key feedback; teaching point 4 |
| next-day HbA1c 6.8 % | `investigations.classification` | `investigations.hba1c` (phase `ward`) |
| fasting / 2-h C-peptide after acidosis correction 50 / 70 pmol/L; 80 / 100 at two weeks; 60 / 170 at three months | `investigations.classification` | `investigations.c-peptide` (phases `ward`, `followup`); the zh "餐后2小时" gives the 2-h value as post-meal |
| GAD, ICA, IAA negative | `investigations.classification` | `investigations.islet-antibodies` (phase `ward`) |
| haemoglobin 110.7–126 g/L, persistent microcytosis; MCV unit exponent inconsistent | `investigations.classification` | `investigations.fbc` (phase `ward`; no MCV number) |
| HbA2 4.6 %; β-globin codon 17 heterozygous ("M/N") | `investigations.classification` | `investigations.hb-electrophoresis`, `globin-genes` (phase `ward`) |
| HbA1c 6.9 % at three months; C-peptide remained low | `investigations.followup` | `investigations.hba1c` (phase `followup`); `outcome` |
| diagnosis: fulminant type 1 diabetes with β-thalassaemia | 1.0.0 README, `debrief.conclusion` | `outcome` ("the report's diagnosis"); debrief |
| long-term complications and fuller immune classification not reported; HbA1c method, red-cell lifespan, a full antibody panel and long-term follow-up absent | `investigations.followup`, `debrief.unknowns` | `unknowns` (8), `available: false` results, the outcome record's last sentence |

**Derived values** (computed here, not recorded): glucose 23.8 mmol/L ≈ 429 mg/dL. **Corrected sodium** 117.05 + 1.6 ×
(23.8 − 5.6) / 5.6 ≈ **122.3 mmol/L** (Katz) or 117.05 + 2.4 × (23.8 − 5.6) / 5.6 ≈ **124.9 mmol/L** (Hillier): about
122–125 mmol/L. **Effective osmolality** 2 × 117.05 + 23.8 ≈ **258 mOsm/kg** (urea is not recorded, so total osmolality
cannot be calculated; chloride is not recorded, so neither can the anion gap). **Implied PCO₂** from pH 7.173 and
bicarbonate 7.1 mmol/L (Henderson–Hasselbalch) ≈ 20 mmHg (2.7 kPa), within Winter's expected 1.5 × 7.1 + 8 ± 2 =
16.7–20.7 mmHg — compensation appropriate if the sample was arterial (its type is not recorded). Over 12 hours bicarbonate
rose by 12.9 mmol/L (7.1 → 20). **HbA1c** 6.8 % ≈ 51 mmol/mol and 6.9 % ≈ 52 mmol/mol (IFCC); the ADAG estimated
average glucose for 6.8 % is about 8.2 mmol/L, far below the presenting 23.8 mmol/L — the discordance that points to a
very short illness (or to a biased HbA1c). **C-peptide** (1 ng/mL = 0.331 nmol/L): 50 pmol/L = 0.05 nmol/L ≈ 0.15 ng/mL;
70 = 0.07 nmol/L ≈ 0.21 ng/mL (JDS cut-offs 0.10 nmol/L ≈ 0.3 ng/mL fasting, 0.17 nmol/L ≈ 0.5 ng/mL stimulated); two
weeks 80 / 100 pmol/L ≈ 0.24 / 0.30 ng/mL; three months 60 / 170 pmol/L ≈ 0.18 / 0.51 ng/mL (the stimulated value equals
the onset cut-off; the JDS criteria apply at onset). Creatinine 179 μmol/L ≈ 2.0 mg/dL; no eGFR is computed (not a
steady state, baseline unknown). BMI 17.62 kg/m² is below the WHO 18.5 cut-off (underweight); weight and height are not
recorded, so **no weight-based dose is computed** — the doses are formulas.

**Guidance numbers used in teaching text:** DKA criteria glucose ≥ 11.1 mmol/L or known diabetes, β-hydroxybutyrate
≥ 3.0 mmol/L, pH < 7.3 and/or bicarbonate < 18 mmol/L; severity mild pH > 7.25 and bicarbonate ≥ 15, moderate pH
7.0–7.25 and bicarbonate 10 to < 15, severe pH < 7.0 and bicarbonate < 10 mmol/L (β-OHB ≤ 6 / > 6; mental status); fluids
500–1,000 mL/h for 2–4 h; insulin 0.1 units/kg/h; 5–10 % glucose below 13.9 mmol/L; potassium replaced below 5.0 mmol/L,
insulin delayed below 3.5, potassium checked 2 h after insulin; bicarbonate only below pH 7.0; resolution ketones < 0.6
mmol/L with pH ≥ 7.3 or bicarbonate ≥ 18; basal insulin 1–2 h before stopping (2024 consensus). JBDS-IP 2023: diagnosis
with urine ketones ++ or more and bicarbonate < 15 mmol/L; potassium none above 5.5, 40 mmol/L at 3.5–5.5 (to verify).
JDS 2012: ketosis within about 7 days; glucose ≥ 16.0 mmol/L with HbA1c < 8.7 % (NGSP); fasting C-peptide < 0.10 nmol/L
and post-meal or post-glucagon < 0.17 nmol/L (2004: HbA1c < 8.5 %, JDS value). Sodium rise ≤ 10 mmol/L in the first 24 h
(European 2014). HHS ≥ 33.3 mmol/L with effective osmolality > 300 mOsm/kg (to verify).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to stand at the trolley of a young man who looked like he had a stomach bug, holding a
   gas with a bicarbonate of 7.1?"
2. **Description.** "In two sentences: what did the bedside and the first results show, and what did you start in the
   first hour?"
3. **Analysis.**
   - "His breath did not smell fruity. How much weight did you give that, and why?"
   - "pH 7.173 is moderate, bicarbonate 7.1 is severe. Which did you act on, and where did you want him treated?"
   - "Potassium 6.23 mmol/L: is his body short of potassium or overloaded? When does potassium go into the bag, and what
     makes that safe?"
   - "Sodium 117: what is it once corrected for the glucose, and what is his effective osmolality? What does that do to
     your choice between 0.9 % and 0.45 % saline?"
   - "Why no bicarbonate at pH 7.17?"
   - "At 12 hours the gas is normal. What else must you know, and what must already be in him, before the drip comes
     down? The 2010 team started a pump the next day — what comes first today?"
   - "Glucose 23.8 with an HbA1c of 6.8 %: what are the two explanations, and which other results decide between them?"
   - "Which of the three fulminant criteria does his β-thalassaemia trait touch, and which does it not?"
   - "Microcytosis on every count — why not iron?"
   - "How did you explain lifelong insulin, ketone checks when ill, and what his blood result means for a future family?"
4. **Summary.** "What will you check first the next time a young adult arrives vomiting after days of thirst — and what
   will you look at instead of HbA1c when a haemoglobin variant is in play?"

The record gives no fluid volumes, insulin doses, place of care, later potassium or sodium, or ketone values: do not let
the group praise or blame the 2010 team for steps the record does not show.

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| "No fruity breath, BP fine — mild DKA, ward" | `mild-dka-ward` feedback | `rb-ed-diagnosis` |
| Calling it gastroenteritis or starvation ketosis | `gastroenteritis`, `starvation-ketosis` feedback | `rb-ed-diagnosis` |
| Potassium in the first bag "because total-body K is low" | `potassium-from-start` feedback; `kcl-added` contraindicated | `rb-first-hour-plan`, `rb-potassium-safe` (critical) |
| No ECG or monitoring with K⁺ 6.23 | — | `rb-potassium-safe` (critical) |
| Bicarbonate for a bicarbonate of 7.1 | `bicarbonate-first` feedback; `sodium-bicarbonate` contraindicated | `rb-first-hour-plan`, `rb-avoided-harm` |
| 0.45 % saline for "water loss" with Na⁺ 117 | `half-saline` feedback; `half-normal-saline` contraindicated | `rb-first-hour-plan`, `rb-first-hour-acts`, `rb-avoided-harm` |
| SC insulin on the ward for complicated DKA | `sc-insulin-oral-fluids` feedback; `sc-insulin-ward` contraindicated | `rb-first-hour-acts` (critical), `rb-avoided-harm` |
| Stopping the drip on a normal gas, or sliding scale only | `stop-now`, `correction-doses` feedback; `stop-friii` contraindicated before basal; `correction-only-insulin` contraindicated | `rb-transition`, `rb-avoided-harm` |
| "Antibody-negative, HbA1c 6.8 % — type 2, tablets soon" | `ketosis-prone-t2d` feedback; `oral-agent` contraindicated | `rb-classification`, `rb-avoided-harm` |
| Reading HbA1c 6.8 % as good control; iron for microcytosis | `lower-insulin`, `oral-iron` feedback; `oral-iron` contraindicated | `rb-hba1c-plan`, `rb-avoided-harm` |
| Forgetting the carrier conversation | `carrier-counselling` key; no `genetic-counselling` | `rb-hba1c-plan`, `rb-communication` |
| Inventing a weight, ketone value, later sodium or an ECG | unknown history items, `examNotRecorded`, `available: false` results, the nurse's brief | — |

### Teaching points for the debrief

The six `debrief.teachingPoints`: (1) recognise and grade DKA — the 2024 consensus criteria and bands, breath odour and
vomiting change nothing, then and now; (2) the first hour — fluids, 0.1 units/kg/h, potassium below 5.0 (5.5 JBDS),
dextrose below 13.9 mmol/L, bicarbonate only below pH 7.0, ECG monitoring at K⁺ 6.23; (3) the sodium read with the
glucose — corrected about 122–125 mmol/L, effective osmolality about 258 mOsm/kg, isotonic fluid only, 2–4-hourly
sodium, pseudohyponatraemia, ≤ 10 mmol/L in 24 h (European 2014); (4) coming off the infusion — resolution criteria,
basal 1–2 h before, the report's next-day pump; (5) fulminant type 1 diabetes by JDS 2012, with his values and the 2004
cut-off the 2010 authors would have used; (6) HbA1c in β-thalassaemia trait — method-dependent bias, glucose data
instead, no iron without deficiency, carrier counselling (ADA 2026; Sacks 2023; BSH 2023).

## Embodied mode

- **Where things are (`general-hospital`).** He lies in an ED resus bay (`setting: "emergency"`) for `ed` and
  `treatment-12h`. Entering `ward` moves him to a ward bed (`location: {setting: "ward"}`), where `followup` also happens.
  Both are **staging conventions**: 1.0.0 does not record where he was treated at 12 hours (the case does not move him
  to an HDU — the referral is a call, and no intervention has a `destination`), on the ward, or at follow-up (an
  outpatient visit is not modelled).
- **Tests.** The glucose and blood-ketone meters are point-of-care tests at the bedside (`point-of-care`, `performedAt:
  "bedside"`); the 12-lead ECG uses the bay's ECG machine (`ecg-12lead`, bedside). Laboratory tests (urinalysis, blood gas,
  chemistry, haematology, endocrine, serology, molecular) are sampled at the patient or, once the cannula has drawn the
  bloods, ordered at a records terminal. The only record review is the outcome record (`performedAt: "records"`,
  `requires: ["records"]`, risk none).
- **Kit.** Monitoring needs the bay's monitor (`cardiac-monitor`); the infusion needs an infusion pump, medications and
  IV access; fluids and the trap drugs need IV access from the case's IV-access procedure (`iv-access`, nursing scope),
  which the reference path places before the first IV item (`extensions.embodied.ivAccessInSitu: false`).
- **Scope of practice.** The cannula, monitoring, fluids and medicines are nursing-scope by kind; the referrals, the
  monitoring plan, education, CGM and stopping the infusion are medical by kind.
- **He can speak throughout** (a conscious adult; no companion). Unrecorded examinations answer with `examNotRecorded`
  ("This case holds no record of this examination; treat it as unknown — neither normal nor abnormal.").
- **Measured (offline demonstration, 2026-10-30).** `embodied-autopilot.test.ts -t "cmcr-635101:"` passes in en and
  zh-CN: the demonstration finishes the case in the general hospital with the clinical-mode score.

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; five days of thirst
and polyuria and three days of nausea and vomiting; no prior diabetes diagnosis given; no family history of diabetes or
autoimmune disease; the presenting examination and vital signs; the emergency glucose, urinalysis, gas and electrolytes;
fluids and insulin with the 12-hour gas; pump treatment from the next day; the next-day HbA1c, the C-peptide series and
the negative GAD, ICA and IAA; the repeated blood counts with persistent microcytosis, HbA2 4.6 % and the heterozygous
codon 17 variant; the three-month HbA1c and the low C-peptide; the diagnosis of fulminant type 1 diabetes with
β-thalassaemia.

**Adapted for teaching.** The four phases and their staging (above); the patient's dialogue (lay rewording of the
recorded facts); the staff; the five decisions, their options and feedback; the 19 interventions (their responses say
what the record shows or that the case does not record whether they were done); the rubric; the unrecorded tests a
learner would order (blood ketones, ECG, amylase and lipase, iron studies, glycated albumin) as honest `available: false`
results. **Labelled teaching devices:** his two voiced worries ("Is it just a stomach bug?" in the ED; "Does this mean
I'll need insulin every day?" on the ward; `persona.concerns` and the `ice-ed` / `ice-ward` items) add no clinical fact;
1.0.0 records none. Unknown history items answer with the collection's lay unknown ("这个我说不上来，医生。" / "I'm not
sure, doctor."); for a conscious adult asked about a fever or his drinks this is an artefact of the record, not a persona
trait — say so if learners remark on it.

**Contradictions and readings kept.** (1) 1.0.0 notes that the report's **MCV unit exponent is inconsistent**; the case
shows "persistently low (microcytic)" with no number and says why. (2) 1.0.0's diabetes-history answer ("the source
supplied no prior diabetes diagnosis") can be read as a recorded negative or as silence; it was marked on-ask (recorded),
so the patient says nobody had told him he had diabetes — the point matters because the JDS HbA1c criterion does not apply
to previously known glucose intolerance (To verify). (3) 1.0.0's zh family history is a negative ("无…家族史") while its en
reads "was reported"; the case follows the zh negative (To verify). (4) 1.0.0 gives the 2-hour C-peptide as "餐后2小时" (2 h
after a meal) in zh and "two-hour" in en; the case uses "after a meal" in both. (5) 1.0.0's English "β-thalassaemia"
describes what the record shows to be a heterozygous carrier state; the case says "β-thalassaemia trait" and quotes the
report's diagnosis separately. Nothing was resolved by invention.

**Unknowns kept honest.** Weight and height, conscious level, oxygen saturation and the rest of the examination; blood
ketones, chloride, urea, osmolality, triglycerides, PCO₂ and the sample type; ECG, pancreatic enzymes; the treatment
regimen and later electrolytes; the HbA1c method, C-peptide stimulus and antibody timing; MCV/MCH, HbF, ferritin,
α-globin and the exact HBB change; prodrome, pain, weight change, intake, medicines, allergies, alcohol and drugs, family
blood disease; the three-month regimen and anything later. Record-facing texts say "No result is recorded for this test"
or "This case does not record whether this was done; it does not simulate its effect" — never that the article lacks
something.

**Figures and privacy.** `scripts/cmcr-105-media-review.json` lists no media for this case; `assets` is empty. The
pseudonym 赵予宁 / Zhao Yuning is kept from 1.0.0; no hospital, date, initials or occupation appear. The investigation
for the gene result is named "Send-away genetic test report (blood)" because the test list shows from the start and a
gene name would point at the finding.

**Survey findings applied** (`survey.json` audit of cmcr-635101, written without the source too). Applied: the spoilers
in the title, summary and triage note (now presentation-only, the triage note a handover); interventions 0 → 19 with the
traps the audit listed (KCl, bicarbonate, 0.45 % saline, stopping IV insulin early, oral agents, oral iron); the sodium
brought into decision 2, a teaching point, the numbers check and the 0.45 % saline trap; potassium moved to the ED
decision; the JDS 2012 criteria made a decision of their own with the case's values; "β-thalassaemia trait" wording; the
phases staged ED → 12 h → ward → follow-up with descriptions; the ED results no longer gated on the family history;
the patient's first-person lay voice and an actor brief; natural keywords (the audit's "How long have you been
thirsty?", "口渴多久了？" and "What brings you in today?" now select their items); the examination split into 7 findings
with keywords; one investigation per test with structured values, ordered by clinical names ("blood gas", "血气分析",
"心电图", "C肽" …); the anaemia-context item replaced by questions the patient can answer, in the ward phase; neutral ids;
named staff; a 12-item rubric with two critical acts and a scored avoided-harm item; dated teaching points and outcomes;
Vancouver references. **Not applied (they need the source or would add facts):** the prodrome, abdominal pain, weight
loss, fluid intake, conscious level, abdomen, pallor, HbF, iron studies, the method of HbA1c and the C-peptide stimulus
stay unknown; no oral glucose tolerance test was added as a harmful order (the test list keeps to what a clinician would order here or what the record holds); hypertonic saline is
discussed in no option, because with his conscious level unrecorded its indication cannot be judged; no reference range
is invented. The critic's general findings (option ids, length cue, hindsight critical items, team-handover keys,
template voice) are all addressed.

**Extensions.** `sourceArticleId`, `sourceUrl`, `historicalReview` and `collection` kept; the 1.0.0
`sourceDoiVerification` object (verified 2026-10-29) is carried into the collection's single schema as `sourceDoi` +
`doiVerifiedAt: "2026-10-29"` (the source map's `verifiedDoi` and `publisherCheckedAt`); `sourceTextChecked: false`;
`embodied.ivAccessInSitu: false`; no `sourceTextSha256` until the source pass (STANDARD §6.6).

## Matcher notes

- **No phase twins.** No history answer describes a present state that later phases change: the presenting answers are
  phrased in the past ("three days before I came in") and are true in every phase. Questions about how he feels now get
  the lay unknown, because 1.0.0 records no later symptom.
- **Phase-restricted items.** `ice-ed` (`ed`); `blood-known`, `family-blood` and `ice-ward` (`ward`, `followup`), so the
  blood questions do not appear before the blood results exist.
- **Shared words separated with `excludeKeywords`:** `diabetes-before` vs the family items (家里 / 家族 / 父母 / 爸妈 /
  兄弟 / 姐妹 / family / parents) and earlier glucose tests (查过 / 测过 / 体检 / checked / screening); `family-diabetes` vs
  his own history (以前 / 你有 / 说过你), blood disease and "does your family know you are here" (知道你 / know you);
  `thirst-duration` vs drinks and alcohol (饮料 / 可乐 / 喝酒 / juice / alcohol); `fluid-intake` vs duration questions
  (多久 / how long — not 几天, which every "这几天…" question contains); `abdominal-pain` vs throat and fever questions
  (嗓子 / 发烧); `medications` vs allergies; `alcohol-drugs` vs water and thirst; `ex-lungs` vs breathing pattern and smell
  (Kussmaul breathing is not recorded, so it falls to `examNotRecorded` rather than "lungs: no obvious abnormality");
  `ex-vitals` vs oxygen saturation (not recorded); `csii-start` vs "泵入" (in Chinese "胰岛素泵入" is the IV infusion).
- **English keywords** avoid one-token wildcards: `whatbringsyou`, `bringsyouin`, `whatswrong`, `doyoudrink`,
  `anyquestions` run together; "what drinks" was dropped from `fluid-intake` because it reduced to "drink" and took
  "Do you drink?" from the alcohol item.
- **Order entry.** `orderMatching.rules` keep urine queries off the blood-ketone meter, HbA1c queries ("糖化", "a1c",
  "glycated") off the blood count and electrophoresis, albumin/fructosamine queries off HbA1c, electrophoresis queries off
  the blood count, and gene queries off both.
- **Interventions.** "subcutaneous insulin" / "皮下胰岛素" reaches basal insulin (the safe reading), not the ward SC
  protocol, whose aliases are specific ("sc insulin every 2 hours"); "monitoring plan" no longer reaches cardiac
  monitoring.
- **Corpus.** 40 test utterances (27 zh-CN, 13 en), written as learners speak; every required item is covered. Two
  **look-alike negatives** (`expect: []`): "你家里人知道你住院了吗？" (family wording; it selected `family-blood` at 0.60
  before `知道你` was excluded) and "Can I get you a glass of water?" (thirst wording). `cases verify` reports 40/40 with no
  extra selections.

## References

1. 叶艺艺, 陆泽元, 邵豪, 赖丽萍, 庄雄杰. 暴发性1型糖尿病并β地中海贫血一例报道. 中华糖尿病杂志. 2010;2(4):307.
   doi:10.3760/cma.j.issn.1674-5809.2010.04.017. Available from: https://rs.yiigle.com/cmaid/635101
2. Umpierrez GE, Davis GM, ElSayed NA, et al. Hyperglycemic crises in adults with diabetes: a consensus report.
   Diabetes Care. 2024;47(8):1257-1275. doi:10.2337/dci24-0032
3. Dhatariya KK; Joint British Diabetes Societies for Inpatient Care. The management of diabetic ketoacidosis in
   adults—an updated guideline from the Joint British Diabetes Society for Inpatient Care. Diabet Med.
   2022;39(6):e14788. doi:10.1111/dme.14788 (the current full text is JBDS 02, revised March 2023)
4. Imagawa A, Hanafusa T, Awata T, et al. Report of the Committee of the Japan Diabetes Society on the Research of
   Fulminant and Acute-onset Type 1 Diabetes Mellitus: new diagnostic criteria of fulminant type 1 diabetes mellitus
   (2012). J Diabetes Investig. 2012;3(6):536-539. doi:10.1111/jdi.12024
5. 中华医学会糖尿病学分会, 中国医师协会内分泌代谢科医师分会, 中华医学会内分泌学分会, 等. 中国1型糖尿病诊治指南(2021版).
   中华糖尿病杂志. 2022;14(11):1143-1250.
6. American Diabetes Association Professional Practice Committee. 6. Glycemic goals, hypoglycemia, and hyperglycemic
   crises: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S132-S149. doi:10.2337/dc26-S006
7. Sacks DB, Arnold M, Bakris GL, et al. Guidelines and recommendations for laboratory analysis in the diagnosis and
   management of diabetes mellitus. Clin Chem. 2023;69(8):808-868.
8. Spasovski G, Vanholder R, Allolio B, et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia.
   Eur J Endocrinol. 2014;170(3):G1-G47. doi:10.1530/EJE-13-1020
9. British Society for Haematology. Significant haemoglobinopathies: a guideline for screening and diagnosis. Br J
   Haematol. 2023.

**How they were checked (2026-10-30).** Ref. 1 — citation and DOI from the source map (`verifiedDoi`, publisher check
2026-10-29). Ref. 4 — authors, title, journal, volume, issue, pages and DOI confirmed in this session from indexer
records (PMC4015434, Scilit), with the criteria (HbA1c < 8.7 % NGSP; the 2004 version's < 8.5 % JDS value; C-peptide
< 0.10 nmol/L fasting and < 0.17 nmol/L stimulated; the HbA1c criterion not applying to previously known glucose
intolerance). Ref. 2 — the strings and DOI as the library's dka-adult editorial review verified them on 2026-10-28; its
diagnostic criteria, severity bands and level of care, fluid rates, insulin rate, dextrose threshold, potassium rules,
bicarbonate threshold, SC option, resolution criteria and the 1–2 h basal overlap were confirmed in this session from
published summaries of the consensus (Cleveland Clinic Journal of Medicine review; consultqd; EASD e-learning), not from
its full text. Ref. 3 — string and DOI as dka-adult gives them; the 2023 revision's diagnostic criteria were confirmed
from the JBDS 02 single-page pathway (March 2023). Ref. 5 — the string dka-adult cites (no DOI). Ref. 6 — as
cmcr-1423446 cites it (title, pages and DOI checked there on 2026-10-28 from web-search records). Ref. 8 — as cmcr-138898 cites it (DOI checked from the Erasmus
repository record). Refs 7 and 9 — **no DOI**, because none could be verified in this session; see To verify.

### To verify

**In the source article (the details 1.0.0 does not give):**

- The presenting history in the report's words: any prodrome (fever, sore throat, cough, diarrhoea), abdominal pain,
  weight loss, drowsiness, what he drank, urine output; the exact wording on earlier diabetes and any earlier glucose
  test (1.0.0's "the source supplied no prior diabetes diagnosis" could be a negative or a silence; the JDS HbA1c
  criterion does not apply to previously known glucose intolerance); medicines, allergies, alcohol, smoking.
- The family-history wording (1.0.0's zh says none, its en "was reported") and any anaemia, thalassaemia or hereditary
  disease in relatives; whether relatives were tested.
- The admission examination beyond 1.0.0's line: conscious level, breathing pattern (Kussmaul or not), the weight and
  height behind BMI 17.62 kg/m², mucosa, abdomen, pallor, jaundice, spleen; whether the vital signs were triage readings.
- The emergency biochemistry exactly as printed, with units and reference ranges: whether the glucose of 23.8 mmol/L
  was capillary or laboratory; the gas sample type and PCO₂, PO₂, lactate; **confirm Na⁺ 117.05 mmol/L** and the method
  (direct or indirect electrode; lipaemia, triglycerides); chloride, urea, the creatinine method; osmolality;
  β-hydroxybutyrate; amylase and lipase; liver tests; infection markers; any ECG.
- The treatment as given: fluid type, volumes and rates; insulin route, dose and rate; potassium (when and how much);
  bicarbonate; how the sodium was handled; the place of care; the glucose, ketones, potassium and sodium alongside the
  12-hour pH 7.375 and bicarbonate 20 mmol/L; when the infusion stopped; what "next day" counts from for the pump; pump
  settings, total daily dose and education; the discharge regimen.
- The classification tests: the HbA1c method (and whether the same at three months); glycated albumin or fructosamine if
  measured; the C-peptide stimulus (standard meal?), assay, units, reference range and timing (relative to correction of
  the acidosis and to insulin doses); what the "two weeks" are counted from; the GAD, ICA and IAA methods and timing; any
  IA-2A, ZnT8A or HLA typing.
- The haematology: **the MCV and MCH as printed** (1.0.0 notes an inconsistent unit exponent), RDW, red-cell count and
  reticulocytes; the time points of the Hb range 110.7–126 g/L; the HbA2 method and HbF; ferritin or iron studies; **the
  exact HBB variant and its notation** ("17位点 M/N" — the codon 17 variant common in southern China is HBB:c.52A>T,
  p.Lys18Ter; confirm which change the authors found); any α-globin testing; how the authors worded the haematological
  diagnosis (trait, minor, heterozygous).
- Which fulminant type 1 criteria and version the 2010 authors applied (presumably JDS 2004, HbA1c < 8.5 % JDS value),
  and their discussion of whether — and in which direction — the trait biased HbA1c, with any alternative marker.
- Follow-up: the insulin regimen and hypoglycaemia at three months, complications, follow-up after three months; whether
  "C-peptide remained low" is the authors' wording.
- Whether the article has figures or tables (none were reviewed for this case).

**In the guidance (primary texts not read in this session):**

- 2024 consensus: confirmed only through published summaries; to check in the full text — how discordant severity
  markers are combined (the case treats the worse band as decisive), whether its ketone criterion accepts urine ketones,
  its HHS definition (the case uses glucose ≥ 33.3 mmol/L with effective osmolality > 300 mOsm/kg), and the wording of the
  subcutaneous option for mild and moderate DKA.
- JBDS-IP 2023 (JBDS 02): the potassium bands (none above 5.5 mmol/L; 40 mmol/L at 3.5–5.5) and "no initial insulin
  bolus", as the library's dka-adult cites them; the level-2 markers; the caution in young adults aged 18–25.
- 中国1型糖尿病诊治指南（2021版）: whether its fulminant criteria match JDS 2012; and whether 中国糖尿病防治指南（2024版）
  (中华糖尿病杂志 2025;17(1):16-139) or a newer Chinese hyperglycaemic-crisis guideline should be cited for DKA care.
- ADA Standards of Care 2026, section 6: the wording on haemoglobin variants, CGM metrics and fructosamine or glycated
  albumin (checked against earlier editions' recommendations only).
- Sacks et al. 2023: the author list after the third author and the DOI; its statements on HbA1c interference by
  haemoglobin variants and on C-peptide.
- European hyponatraemia guideline 2014: the glucose correction and the 10 mmol/L-in-24-hours limit — the case applies the
  limit to the glucose-corrected sodium in DKA as a teaching rule; check that this is how a current source frames it.
- BSH 2023 (ref. 9): authors, volume, pages and DOI; its statements that iron deficiency lowers HbA2 and on partner and
  family testing. Cite also the NGSP list of HbA1c assay interferences (ngsp.org) for his laboratory's method, with the
  access date.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the single examination line
  became 7 findings; the "emergency metabolic record" became the glucose, urinalysis, blood gas and electrolyte tests;
  the "subsequent glycaemic and haemoglobin records" became HbA1c, C-peptide (two phases), antibodies, blood count,
  electrophoresis and the genetic test; the outcome record's 12-hour gas became a phase result of the blood gas.
- **History.** 15 template items (10 answering in authoring language — "The source case does not provide that information" or "The report supplies no additional details") → 20 items in the
  patient's lay voice: 6 recorded facts, 12 honest unknowns, 2 labelled ICE devices; 7 required.
- **Phases and gates.** 4 template phases (the ED results gated on the family history; the potassium question asked
  after the three-month results) → ED, 12 hours, ward, follow-up, gated on objectives that need committed acts; the
  follow-up opens only after all five decisions.
- **Investigations.** 3 bundled records → 16 tests with structured values, aliases and honest `available: false`
  results; 1 record review.
- **Interventions.** 0 → 19: cannula, monitoring, isotonic fluid, the insulin infusion, a monitoring plan, an HDU
  referral, basal insulin, stopping the infusion, the report's pump, education, CGM, genetic counselling; traps —
  potassium, bicarbonate, 0.45 % saline, SC insulin for complicated DKA, correction-only insulin, oral agents, oral iron —
  each with a harm text citing its guidance.
- **Decisions.** 3 template decisions (ids `dka` / `limits` / `glucose`, hedged keys, the potassium question after the
  outcome) → 5 decisions with 24 options and content ids: diagnosis and place of care; the first hour; the transition;
  classification; the trait and the plan (select all).
- **Rubric.** 11 template items (the one critical item a first-try decision) → 12: two critical acts timed to the ED,
  a scored avoided-harm item, decisions paired with their acts, a case-specific Calgary–Cambridge item.
- **Teaching layer.** 6 learning outcomes, 6 objectives, 3 named staff, 5 key reasoning steps, 6 dated teaching points, 8
  unknowns, 9 Vancouver references.
- **Card.** New spoiler-free title (1.0.0's named the acidosis), summary (1.0.0's announced the red-cell twist), lay chief
  complaint, triage note as a handover (1.0.0's was an instruction naming the diagnosis), four presenting-feature tags,
  topic tags; haematology moved off the card; estimated time 30 → 40 min.
- **Governance.** Review status and notes in the STANDARD §6.6 wording, with the collection's English ending ("The case
  is not yet reviewed by a licensed clinician.", which the collection contract matches case-sensitively);
  `sourceTextChecked: false`; `sourceDoi` + `doiVerifiedAt` in place of `sourceDoiVerification`.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, one examination
  line, three record reviews, three decisions, 11 rubric items and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-635101/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-635101 --lang en                                                 # 89 steps · objectives 6/6 · decisions 5/5 · utterances 40/40 · rubric 29/29 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-635101                       # depth floor, do-nothing 0, wrong-first 55 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-635101:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-635101:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-10-30: all five pass.

## 中文摘要

**病例概要。** 24岁男性（BMI 17.62 kg/m²），口渴、多尿 5 天，恶心呕吐 3 天来急诊：急性病容，皮肤干燥、弹性差，体温
36.7 ℃，脉搏 106 次/分，呼吸 25 次/分，血压 106/59 mmHg，呼出气无烂苹果味，心肺无明显异常；以前没有被诊断过糖尿病，
无糖尿病和自身免疫病家族史。血糖 23.8 mmol/L，尿糖 ++++、尿酮体 +++，pH 7.173，HCO₃⁻ 7.1 mmol/L，BE −21.6 mmol/L，钾
6.23 mmol/L，钠 117.05 mmol/L（按血糖校正约 122–125，有效渗透压约 258 mOsm/kg），肌酐 179 μmol/L：糖尿病酮症酸中毒，按
pH 属中度、按 HCO₃⁻ 属重度。补液和胰岛素治疗 12 小时后 pH 7.375、HCO₃⁻ 20 mmol/L，次日开始胰岛素泵。入院次日 HbA1c
6.8%，酸中毒纠正后空腹/餐后 2 小时 C 肽 50/70 pmol/L（2 周 80/100，3 个月 60/170），GAD、ICA、IAA 阴性，符合日本糖尿病学会
2012 年暴发性 1 型糖尿病标准。多次血常规血红蛋白 110.7–126 g/L、持续小细胞性，HbA2 4.6%，β 珠蛋白基因第 17 位密码子杂合
突变，为 β 地中海贫血携带状态，可使 HbA1c 失真。3 个月时 HbA1c 6.9%，C 肽仍低。本版依据 1.0.0 版提取的事实改写，尚未对照
原文全文核对。

**学习目标。**

1. 依据血糖、酮体和酸碱结果诊断糖尿病酮症酸中毒并分级、决定治疗地点（2024 年 ADA/EASD/JBDS-IP/AACE/DTS 共识），不因没有
   烂苹果味或呕吐突出而误判。
2. 第一小时开始等渗补液和 0.1 U/(kg·h) 静脉胰岛素；血钾 6.23 mmol/L 时心电监护、暂不补钾；pH 7.17 不用碳酸氢钠。
3. 计算校正血钠和有效渗透压，据此只用等渗液并安排血钠监测（2014 年欧洲低钠血症指南）。
4. 确认酮症酸中毒纠正后，停输注前 1–2 小时先给皮下基础胰岛素。
5. 应用日本糖尿病学会 2012 年标准诊断暴发性 1 型糖尿病，并与经典 1 型、酮症倾向 2 型和单基因糖尿病鉴别。
6. 说明 β 地中海贫血携带状态为何使 HbA1c 不可靠，改用血糖数据评估；不在未证实缺铁时补铁；提供携带者咨询和配偶检测。

**关键决策。**

- 决策 1（急诊诊断与治疗地点）：糖尿病酮症酸中毒，HCO₃⁻ 在重度范围，合并高钾、低钠和肌酐升高，收入监护床位；干扰项为
  “没有烂苹果味属轻度、普通病房”、胃肠炎、饥饿性酮症、高渗状态。
- 决策 2（第一小时）：0.9% 氯化钠第 1 小时 1 L，胰岛素 0.1 U/(kg·h)，血钾低于 5.0–5.5 mmol/L 前不补钾，心电监护，2 小时内
  复查；干扰项为第一袋就补钾、先用碳酸氢钠、0.45% 盐水、普通病房皮下胰岛素。必须在急诊阶段实际开始等渗补液和静脉胰岛素
  （关键项），并在血钾 6.23 时做心电图、上监护、不加钾（关键项）。
- 决策 3（12 小时）：先确认血酮 < 0.6 mmol/L、能进食，皮下基础胰岛素后 1–2 小时再停输注；报告中的团队次日开始胰岛素泵。
- 决策 4（分型）：暴发性 1 型糖尿病（JDS 2012），终身胰岛素；干扰项为酮症倾向 2 型、经典自身免疫性 1 型、MODY、应激性高血糖。
- 决策 5（多选）：诊断不变（起病时间和 C 肽不依赖 HbA1c）；用血糖或 CGM、果糖胺或糖化白蛋白评估控制；携带者咨询与配偶、
  亲属检测；不补铁，不因 HbA1c 6.8% 减胰岛素。

**复盘要点（PEARLS）。** 先谈面对“像胃肠炎”的年轻人时的感受；用两句话说清床旁和首批结果以及第一小时做了什么；分析烂苹果味
的分量、pH 与 HCO₃⁻ 分级不一致时怎么办、高钾时体内总钾是多是少及何时补钾、校正血钠与有效渗透压对选液体的意义、为什么不用
碳酸氢钠、停输注前还缺什么、血糖与 HbA1c 不相称的两种解释、携带状态动摇了哪条诊断标准、为什么不补铁、怎样向他解释终身胰岛素
和携带状态；总结下次遇到口渴后呕吐的年轻人先查什么。评分：确定性总分 29 分，两项关键项（急诊阶段实际开始等渗补液和静脉胰岛
素；血钾 6.23 时做心电图、上监护、不加钾），沟通项由考官评判。报告中的处置（补液和胰岛素、次日胰岛素泵）只作为历史记录，
不代表现行推荐；治疗方案、治疗地点和此后的电解质均未记录。本病例经人工智能辅助编辑审核，尚未经执业医师审核；待核实事项见上文
“To verify”。
