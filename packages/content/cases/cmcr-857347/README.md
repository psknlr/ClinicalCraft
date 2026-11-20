# cmcr-857347 — Thirst, then vomiting and breathlessness · 25-year-old man

> Facilitator guide (导师指南). **Spoilers:** the diagnosis, the records and the outcome follow. Version 1.1.0 was
> re-authored from the facts recorded in version 1.0.0; those facts have **not yet been checked against the full
> source article** (see "To verify").

A 25-year-old man without known diabetes reaches the emergency department after over a month of thirst, about 10 kg of
weight loss and three days of vomiting, breathing deeply at 40/min. The learner has to read the blood gas and protect
his respiratory compensation (no NIV, no intubation), start ketoacidosis treatment safely (the potassium known before
insulin, no bicarbonate, isotonic fluid with a sodium of 112 mmol/L), and recognise that crepitus at his neck after days
of vomiting means air escaping from the chest — so oesophageal rupture is excluded (nil by mouth, CT before endoscopy)
while the ketoacidosis is treated.

## Case card

| Field | Value |
|---|---|
| Title | 口干多饮后呕吐、气促 · 25岁男性 / Thirst, then vomiting and breathlessness · 25-year-old man |
| Setting / facility | emergency (ED resus area) → ward / `general-hospital` |
| Difficulty / time | 4 / 5; about 35 minutes |
| Specialties | emergency medicine, endocrinology, respiratory medicine |
| Patient | 孔予宁（化名）/ Kong Yuning (pseudonym), 25-year-old man; answers for himself (no companion) |
| Phases | 4: `ed` → `ct-review` → `ward` → `followup` (static clock, no physiology model) |
| Content | 25 history items (8 required, 15 unknown), 5 examination findings, 15 investigations, 20 interventions (2 `critical`), 5 decisions, 12 rubric items (3 critical), 4 staff, 45 matcher utterances |
| Languages | Simplified Chinese (source language) and English |
| Review status | `editorial` (AI-assisted, 2026-10-30; independent review 2026-11-14) against the cited guidance; patient facts not yet checked against the full source article; **not yet reviewed by a licensed clinician** |
| Version | 1.1.0 (see Changelog) |

## Learning outcomes

1. Diagnose and grade diabetic ketoacidosis from the glucose, ketones and blood gas, and choose the place of care
   (2024 ADA/EASD/JBDS-IP/AACE/DTS consensus; JBDS-IP 2023 markers for level-2 care).
2. Use Winter's formula to recognise maximal respiratory compensation in severe metabolic acidosis, and explain why
   Kussmaul breathing is not an indication for NIV (BTS/ICS 2016) and why sedation or under-set ventilation is dangerous.
3. Start first-hour treatment — isotonic fluid, a fixed-rate insulin infusion of 0.1 units/kg/h, potassium replacement
   at 3.5–5.5 mmol/L once he is passing urine, and no bicarbonate at pH 7.0 or above — and adapt fluids and monitoring to a glucose-corrected
   sodium of about 118–121 mmol/L (2024 consensus; JBDS-IP 2023; European hyponatraemia guideline 2014).
4. Recognise crepitus at the neck and chest after vomiting as air escaping from the chest, keep the patient nil by mouth
   and request CT for a possible oesophageal perforation (WSES 2019) before considering endoscopy.
5. Interpret a CT showing pneumomediastinum without a tear: choose conservative care with surveillance, and keep cervical
   drainage for air that threatens the airway, breathing or circulation.
6. Plan the step-down from intravenous insulin and discharge — resolution criteria, basal insulin 1–2 hours before the
   infusion stops, classification by islet autoantibodies, education and sick-day rules (2024 consensus; ADA Standards
   of Care 2026).

Front-ends show these before play only on request (they name the diagnosis) and list them in every debrief.

## Clinical summary (spoilers)

**Diagnosis:** diabetic ketoacidosis (new-onset diabetes) complicated by spontaneous pneumomediastinum and subcutaneous
emphysema, with coffee-ground vomiting, a profound hyponatraemia (< 125 mmol/L) and a raised creatinine.

- **History:** over a month of dry mouth and heavy drinking; about 10 kg lost over the past month; three days of poor
  appetite, weakness, nausea and coffee-ground vomiting; marked breathlessness from the day before admission. No previous
  diabetes, hypertension or chronic lung disease. Everything else (pain, polyuria, fever, medicines, allergies, family
  and social history) is not recorded.
- **Examination:** heart rate 120/min; deep, rapid breathing at 40/min; crepitus (握雪感) at the neck, anterior chest and
  abdominal wall; breath sounds reduced on both sides. No blood pressure, temperature, saturation or conscious level is
  recorded.
- **Admission tests:** glucose 26.3 mmol/L; urine ketones 14.4 mmol/L; pH 7.10, PaCO₂ 10 mmHg, HCO₃⁻ 3.1 mmol/L;
  sodium 112 mmol/L, potassium 3.8 mmol/L, creatinine 217 µmol/L.
- **Chest CT:** mediastinal and subcutaneous air, a dilated oesophagus, no definite oesophageal or tracheal tear.
- **Later gastroscopy (after the CT):** coffee-ground material and duodenal congestion; no obvious perforation of the
  oesophagus or stomach wall.
- **Recorded treatment and outcome:** improvement after fluids, insulin, gastric decompression and cervical drainage; the
  air had largely resorbed within about a week; laboratory values later recovered; discharge after about two weeks; no
  recurrence over two years of follow-up.
- **Today's answer:** severe DKA by bicarbonate with JBDS level-2 markers → HDU; isotonic fluid, fixed-rate insulin
  0.1 units/kg/h, potassium in the fluids once he is passing urine (K⁺ 3.8 mmol/L, creatinine 217 µmol/L; JBDS gives none
  in the first resuscitation litre), no bicarbonate (pH 7.10 ≥ 7.0), corrected
  sodium tracked (≈ 118–121 mmol/L, effective osmolality ≈ 250 mOsm/kg: hypotonic) with neurological observations at
  age 25; protect the respiratory compensation (no NIV, no intubation, no sedation); nil by mouth, CT before endoscopy and a thoracic
  surgical review until oesophageal rupture is excluded; conservative care of the pneumomediastinum, drainage only for
  compromise; basal insulin before the infusion stops, autoantibody-based classification, education.

## Scenario timeline and physiology (staged evidence by phase)

| Phase | Opens when | What the learner can get | Records staged here |
|---|---|---|---|
| `ed` — arrival in the ED resus area | start | history (25 items), examination (5 findings), bedside and laboratory tests, all first-hour treatment, the CT request | glucose, urinalysis, arterial gas, electrolytes and renal function; placeholders ("no result is recorded") for blood ketones, FBC, ECG, chest X-ray, HbA1c, C-peptide and islet autoantibodies; the CT request (report not back yet) |
| `ct-review` — the chest CT report | objectives 1–4 complete (story and examination; why he breathes like this; the first-hour treatment given; the examination findings acted on, including nil by mouth and the CT request) | the CT report in the records; repeat bedside and laboratory tests | chest CT report; "the CT has been done" for a repeat CT request; "no repeat result is recorded" for glucose, urine ketones, gas and electrolytes, and placeholders for the other tests |
| `ward` — later in the admission (location: ward) | objectives 1–5 complete (CT read, decision 4 right) | gastroscopy at the endoscopy suite, the step-down plan | gastroscopy; placeholders for C-peptide and islet autoantibodies; the same repeat-test placeholders; no repeat CT recorded |
| `followup` — recorded course and outcome | objectives 1–5 and decision 5 | the outcome record (with the approved figure) | reported course and outcome |

Phases advance by themselves and cannot be selected back before they are reached. Every decision opens before the
result that answers it: decision 2 (what to do about the crepitus) opens on the history and examination, and the CT
report exists only in `ct-review`, which waits for the CT request and nil by mouth; decision 4 reads the CT; decision 5
reads the gastroscopy. The outcome phase waits for all five decisions. No physiology is modelled: no intervention changes
a value, and every response says what the case records. Every test a learner might repeat has a record in each phase
where it can be ordered (a placeholder when nothing is recorded), and every condition that reads a record names its phase,
so no placeholder can open a decision or score an item.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-story-exam` Take his story and examine him | presenting complaint, breathlessness onset, thirst, weight loss, vomiting and what came up asked; vital signs, breathing, neck, chest and abdominal wall, lungs examined |
| 2 | `obj-why-breathing` Find what is driving his breathing | glucose, urinalysis and arterial gas read (`ed`); `acid-base` right |
| 3 | `obj-first-hour` Start the first hour of treatment | electrolytes read (`ed`); `first-hour` right; isotonic fluid, insulin infusion and potassium given |
| 4 | `obj-air-plan` Act on what the examination found | `air-leak-plan` right; nil by mouth; CT requested |
| 5 | `obj-ct` Read the chest CT and adjust the plan | CT report read (`ct-review`); `ct-reading` right |
| 6 | `obj-step-down` Plan the step-down and discharge, then review the outcome | gastroscopy read (`ward`); `discharge-plan` right; outcome record read |

Titles name no finding or diagnosis ("Act on what the examination found"), and neither a title nor a hint says where the
examination will find something (the guidance, shown on request, lists the manoeuvres); hints are Socratic and state no
result the learner has not obtained ("If the examination found something unexpected, what is the most dangerous
explanation after days of vomiting?"). No completion condition can become permanently false (no phase leaf, no
`whenIndicated`, no `decidedFirstTry`), so a learner who acts late can still finish (contract check).

### Decisions

- **1 `acid-base`** (single; needs breathing and vital signs examined, glucose, urinalysis and gas read). Key:
  `ketoacidosis-compensating` — DKA with severe metabolic acidosis; PaCO₂ 10 mmHg is near-maximal compensation (Winter's
  ≈ 10.7–14.7 mmHg), so the breathing is compensation, not failure. Distractors: `added-respiratory-acidosis` ("he is
  tiring, ventilate"), `primary-respiratory-alkalosis` (pain or anxiety), `lactate-or-fasting` ("stress and starvation;
  insulin can wait"). No option mentions air in the chest: the decision can open before the neck has been examined.
- **2 `air-leak-plan`** (single; needs the vomiting and what came up, neck, chest-wall and lung examination). Key:
  `nbm-ct-surgeons` — nil by mouth, urgent CT of neck and chest (water-soluble oral contrast if rupture is suspected),
  thoracic surgical review. Distractors: `blame-kussmaul` (alveolar rupture assumed, no imaging), `scope-first` (urgent
  gastroscopy before CT), `bilateral-drains` (drains for "bilateral pneumothoraces" without imaging).
- **3 `first-hour`** (single; needs decision 1, the electrolytes and vital signs). Key: `fluid-insulin-potassium` —
  isotonic fluid, fixed-rate insulin 0.1 units/kg/h, potassium in the fluids once he is passing urine (JBDS-IP 2023 gives
  none with the first resuscitation litre; his creatinine is 217 µmol/L and his urine output is not recorded), hourly
  glucose and ketones, close sodium checks and a high-dependency bed. Distractors: `bicarbonate-first`, `insulin-hold-potassium` ("3.8 is
  normal"), `hypotonic-fluid` (0.45 % saline "because he must be hyperosmolar").
- **4 `ct-reading`** (single; needs decisions 2 and 3 and the CT report). Key: `conservative-watch` — spontaneous
  pneumomediastinum likeliest; stay nil by mouth with gastric decompression, continue DKA treatment, watch the airway,
  re-image if pain, fever or an effusion appears. Distractors: `thoracotomy-today`, `resume-eating` ("no tear = no
  perforation"), `cpap-splint`, `routine-neck-drainage` — the report's own cervical drainage generalised to every
  patient; its feedback says the report's team drained his neck and that the case does not record why.
- **5 `discharge-plan`** (select all; needs decisions 3 and 4 and the gastroscopy). Keys: `basal-before-stop`,
  `type-workup`, `education-sick-day`. Distractors: `metformin-switch`, `correction-doses-only`.

Every option has its own feedback (2–4 sentences, naming the guidance and year). Option ids name content, never
correctness; in no single-best decision is the key the longest option in either language (measured: the key is shorter
than the longest distractor in all four), and in the select-all decision the three keys are not the three longest
options (in English a distractor is the longest; in Chinese a distractor ties a key).

### Rubric (11 deterministic items, total weight 31, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 2 | presenting complaint, thirst, weight loss, vomiting, what came up, breathlessness onset, previous diabetes, allergies asked |
| `rb-examination` | examination | 2 | vital signs, breathing, neck, chest and abdominal wall, lungs examined |
| `rb-ed-tests` | investigations | 2 | glucose, urinalysis, gas and electrolytes read in `ed`; ECG ordered in `ed` |
| `rb-acid-base` | diagnosis | 3 | `acid-base` right first time |
| `rb-first-hour-plan` | management | 3 | `first-hour` right first time + monitoring plan + HDU referral, with no bicarbonate and no 0.45 % saline given |
| `rb-dka-acts` | management | 4 | **critical** — isotonic fluid; insulin infusion and potassium each given while indicated (after the potassium was read in `ed`) |
| `rb-air-reasoning` | diagnosis | 3 | `air-leak-plan` right first time + thoracic surgical review |
| `rb-air-acts` | safety | 4 | **critical** — CT ordered in `ed` + nil by mouth |
| `rb-ct-review` | diagnosis | 3 | CT report read in `ct-review` + `ct-reading` right first time |
| `rb-step-down` | management | 2 | `discharge-plan` right first time + basal insulin + diabetes education, with no switch to metformin |
| `rb-no-positive-pressure` | safety | 3 | **critical** — no NIV and no intubation; scored once decision 1 or 4 was attempted or either was given (`scoredWhen`) |
| `rb-communication` | communication | 1 | examiner-judged (Calgary–Cambridge; case-specific guidance) |

### How wrong choices score (re-measured with the reducer on 2026-11-14, after the independent review)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 31/31 (100 %) | none | passed |
| start and do nothing | 0/28 (the positive-pressure item not scored); cannot finish | `rb-dka-acts`, `rb-air-acts` | passed |
| wrong first answer at all five decisions, then right | 17/31 (55 %) | none | passed |
| wrong first answer at decision 1, 2, 3 or 4 only | 28/31 (90 %) each | none | passed |
| wrong first answer at decision 5 only | 29/31 (94 %) | none | passed |
| insulin infusion and potassium started before the potassium was read | 27/31 (87 %) | `rb-dka-acts` | passed (recoverable process error) |
| reference path plus NIV | 28/31 (90 %) | `rb-no-positive-pressure` | **not passed** (critical intervention `niv`) |
| reference path plus intubation | 28/31 (90 %) | `rb-no-positive-pressure` | **not passed** (critical intervention `rsi-intubation`) |
| reference path plus bicarbonate, or plus 0.45 % saline | 28/31 (90 %) each (`rb-first-hour-plan` lost) | none | passed |
| reference path plus the metformin switch | 29/31 (94 %) (`rb-step-down` lost) | none | passed |
| reference path without the monitoring plan and HDU referral | 28/31 (90 %) | none | passed |
| reference path without the thoracic surgical review | 28/31 (90 %) | none | passed |
| reference path without nil by mouth: the CT stage never opens and the case cannot be finished | 22/31 (71 %) | `rb-air-acts` | passed |
| reference path without the ECG, without asking about diabetes and allergies, or without basal insulin and education | 29/31 (94 %) each | none | passed |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The harmful interventions
are `contraindicated` (each with its own harm text); the positive-pressure item counts only once the harm was possible
(`scoredWhen`: decision 1 or 4 attempted, or NIV or intubation given), and the bicarbonate, 0.45 % saline and metformin
harms sit inside items that also need acts, so doing nothing earns 0. **Known limits:** the rubric's conditions carry no
clock, so the order of acts within the ED phase (fluids before or after the CT request) is not scored — debrief it from
the transcript; and a learner who starts insulin before reading the potassium cannot restart it (`maxDoses: 1`), so
`rb-dka-acts` stays missed even though the case continues.

### Critical items

`rb-dka-acts` (the missed life-saving act: fluids, a fixed-rate insulin infusion and potassium started in the ED, with
insulin and potassium only once the potassium is known), `rb-air-acts` (the missed act that protects against the
dangerous miss: nil by mouth and a CT request in the ED, before any imaging result exists) and `rb-no-positive-pressure`
(the dangerous error: NIV or intubation for breathing that is compensation, in a vomiting patient with air in the
mediastinum). All three are acts; the phase that shows the CT report waits for the first two, so neither can be met in
hindsight, and none reads a final-phase record.

**Safety outcome.** `niv` and `rsi-intubation` are `critical: true`: giving either fails the assessment's safety outcome
whatever the score. Positive pressure on a mask or a tube in a patient who has been vomiting, with air leaking from the
chest, risks aspiration and tension pneumothorax; NIV is not indicated without hypercapnia (BTS/ICS 2016); and the apnoea
of induction and a ventilator that cannot match his own minute ventilation remove the compensation that holds his pH at
7.10. The other high-risk step, `sodium-bicarbonate`, is explicitly `critical: false` (not indicated at pH 7.10, harmful
but recoverable with monitoring), as are the moderate-risk `friii` and `potassium-replacement` before the potassium is
known (a process error, recoverable once the level is measured — his was 3.8 mmol/L), `half-normal-saline` and
`metformin-only`. Neither insulin item nor potassium has a dose preset (`doseSpec`): the insulin infusion is dosed per
kilogram as a schedule (0.1 units/kg/h, reduced to 0.05 units/kg/h once the glucose is below 14 mmol/L) and his weight is
not recorded, so a per-kg preset could not be compared with an order in absolute units (`cases validate` requires
`patient.weightKg` for one, and none may be invented); potassium is prescribed as a concentration in the fluid
(40 mmol/L), which a preset cannot express.

## Reference path (`solution`)

77 steps, static clock: start → presenting complaint, breathlessness onset, thirst, weight loss, appetite and energy,
vomiting, what came up → vital signs, breathing, neck, chest and abdominal wall, lungs → **monitoring**, **IV cannula
and bloods** → glucose, urinalysis, blood ketones (no result recorded), **arterial gas**, **electrolytes**, ECG and FBC (no
results recorded) → `acid-base` → previous diabetes, other illness, medicines, allergies → **isotonic fluid** →
`first-hour` → monitoring plan (urine output among it) and HDU referral → **insulin infusion**, **potassium** (once he
is passing urine) → the rest of the history (pain, neck,
swallowing, abdomen, urine, fever and cough, injury, drowsiness, smoking and alcohol, drugs, family, operations, home,
his worry) → `air-leak-plan` → IV PPI, chest X-ray and HbA1c (no results recorded), thoracic surgical review, **nil by
mouth**, **CT request** → (phase `ct-review`) CT report → gastric decompression → `ct-reading` → (phase `ward`)
gastroscopy, islet autoantibodies (no result recorded; no C-peptide, which is not tested within 2 weeks of a
hyperglycaemic emergency), basal insulin, diabetes education →
`discharge-plan` → (phase `followup`) outcome record → finish. `cases verify`: objectives 6/6, decisions 5/5, rubric
31/31 (100 %), utterances 45/45. It gives no intervention while contraindicated, and replays as the in-world
demonstration (示范接诊) in both languages.

## Clinical numbers check

Every value with its unit, its 1.0.0 field and its field in 1.1.0. Derived values are calculations made for teaching
and are labelled as such.

| Fact (1.0.0 wording) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 25-year-old man | `patient.age`, `sex` | `patient`; title; triage note |
| Dry mouth and heavy drinking for over a month (chief complaint: one month) | `history.thirst`; `patient.chiefComplaint` | `history.thirst`; chief complaint ("一个多月"); both readings kept in `provenance.notes` |
| About 10 kg lost over the past month | `history.weight-loss` | `history.weight-loss` |
| Three days of poor appetite, weakness, nausea, coffee-ground vomiting | `history.vomiting` | `history.appetite-energy`, `vomiting`, `vomit-look` |
| Marked breathlessness from the day before admission | `history.breathlessness` | `history.breath-onset`; `presenting` |
| No diabetes, hypertension or chronic lung disease | `history.past-health` | `history.diabetes-before`, `other-illness` |
| Heart rate 120/min, respiratory rate 40/min, deep and rapid | `exam.breathing` | `exam.vitals`, `exam.breathing`; triage note |
| Crepitus at the neck, anterior chest and abdominal wall | `exam.breathing` | `exam.neck-palpation`, `exam.chest-wall-palpation` |
| Reduced breath sounds, both lungs (zh 双肺) | `exam.breathing` | `exam.lungs` |
| Glucose 26.3 mmol/L | `investigations.dka` (workup) | `investigations.glucose` (`ed`) |
| Urine ketones 14.4 mmol/L | `investigations.dka` | `investigations.urine-ketones` (`ed`) |
| pH 7.10, HCO₃⁻ 3.1 mmol/L, PaCO₂ 10 mmHg | `investigations.dka` | `investigations.blood-gas` (`ed`) |
| Sodium 112, potassium 3.8 mmol/L (one unit written after both) | `investigations.dka` | `investigations.electrolytes` (`ed`), sodium entered as mmol/L |
| Creatinine 217 µmol/L | `investigations.dka` | `investigations.electrolytes` (`ed`) |
| CT: mediastinal and subcutaneous air, dilated oesophagus, no definite oesophageal/tracheal tear | `investigations.chest` (confirmation) | `investigations.ct-report` (`ct-review`) |
| Later gastroscopy: coffee-ground material, duodenal congestion, no obvious oesophageal/gastric perforation | `investigations.chest` | `investigations.gastroscopy` (`ward`) |
| Improvement after fluids, insulin, gastric decompression and cervical drainage; air largely resorbed in about a week; laboratory values recovered; discharge after about two weeks; no recurrence over two years | `investigations.followup` | `investigations.outcome` (`followup`); intervention responses for the recorded steps |
| Reported diagnosis: DKA with spontaneous pneumomediastinum and subcutaneous emphysema | `debrief.conclusion` | `investigations.outcome` (`followup`, first sentence); `debrief.conclusion` |

**Derived (teaching calculations, not recorded values):**

- Henderson–Hasselbalch check: 6.1 + log₁₀(3.1 / (0.03 × 10)) = 6.1 + 1.01 ≈ 7.11 — consistent with the recorded pH 7.10.
- Winter's formula: expected PaCO₂ = 1.5 × 3.1 + 8 ± 2 = 12.65 ± 2 ≈ 10.7–14.7 mmHg; recorded 10 mmHg = at/just below the
  lower limit (maximal compensation; PaCO₂ 10 mmHg ≈ 1.3 kPa).
- Glucose-corrected sodium: (26.3 − 5.6) / 5.6 = 3.7 steps → +1.6 per step ≈ 117.9 mmol/L; +2.4 per step ≈ 120.9 mmol/L
  (the case rounds to "about 118–121 mmol/L"). The 2024 consensus states the 1.6 factor (per 5.6 mmol/L of glucose);
  the 2014 European guideline's own formula adds 2.4 mmol/L per 5.5 mmol/L above 5.5 mmol/L, ≈ 121.1 mmol/L.
- Effective osmolality: 2 × 112 + 26.3 ≈ 250 mOsm/kg (hypotonic; urea not recorded, so total osmolality cannot be
  calculated).
- Anion gap: not calculable (no chloride recorded).
- Grading: pH 7.10 falls in the 2024 consensus' moderate band (7.0–7.25), HCO₃⁻ 3.1 mmol/L in its severe band (< 10);
  JBDS-IP 2023 level-2 markers present: HCO₃⁻ < 5 mmol/L and pulse > 100/min (urine ketones cannot be read against the
  blood-ketone marker).
- Unit conversions for reference only: glucose 26.3 mmol/L ≈ 474 mg/dL; creatinine 217 µmol/L ≈ 2.45 mg/dL.

No reference range, weight, blood pressure, saturation, chloride, urea, ketone, haemoglobin or repeat value was
reconstructed. The insulin dose is given as a formula (0.1 units/kg/h, then 0.05 units/kg/h below a glucose of
14 mmol/L) because his weight is not recorded, so it has no machine-readable preset; potassium is written as a concentration in the fluid (40 mmol/L), which a preset cannot express.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions:** When you saw a young man breathing at 40/min, what did you first think was wrong — his lungs or his
  blood? What did you feel when your fingers found the crackling under his skin?
- **Description:** In two sentences, what did the gas, the electrolytes and the examination tell you, and what did you
  do in the first hour?
- **Analysis:**
  - By Winter's formula, what PaCO₂ goes with a bicarbonate of 3.1 mmol/L — and what would happen to his pH if he were
    sedated or put on a ventilator at a "normal" rate?
  - Why is a potassium of 3.8 mmol/L not reassuring in this acidosis? What did you need before the insulin started — and,
    with a creatinine of 217 µmol/L, what did you check before the potassium went into the fluid?
  - Sodium 112 with glucose 26.3: what is the corrected sodium and the effective osmolality — is he hyperosmolar or
    hypotonic, and what does that mean for the fluid and for a 25-year-old's brain?
  - After days of vomiting, crepitus in the neck: what is the one diagnosis you could not afford to miss, and why does
    the CT come before the gastroscope?
  - The CT shows no tear. What does that exclude and what not? When would you drain the neck?
  - The report's team drained his neck and decompressed his stomach. Which of these would you do today, and on what
    findings?
  - Does one episode of ketoacidosis tell you his diabetes type? How will you take him off the infusion?
- **Summary:** Name two things you will do the next time a breathless, vomiting young adult has a high glucose — and one
  you will not do.

### Common learner errors and how the case surfaces them

| Error | Where it shows |
|---|---|
| Reading the breathing as respiratory failure and reaching for NIV or intubation | decision 1 distractor `added-respiratory-acidosis`; `niv` and `rsi-intubation` are contraindicated and **critical** (safety outcome fails); `rb-no-positive-pressure` (critical) |
| Starting insulin (or potassium) before the potassium result | `friii` and `potassium-replacement` contraindicated until the electrolytes are read; `rb-dka-acts` (critical) lost |
| Calling K⁺ 3.8 "normal" and leaving potassium out | decision 3 distractor `insulin-hold-potassium` |
| Potassium into the first resuscitation litre, or without checking that he is passing urine (creatinine 217 µmol/L) | decision 3 key and feedback (JBDS-IP 2023), the potassium item's dose text and the preceptor's question; not scored separately, because his urine output is not recorded |
| Bicarbonate for pH 7.10 | decision 3 distractor; `sodium-bicarbonate` contraindicated; `rb-first-hour-plan` lost |
| Treating the high glucose as "hyperosmolar" and giving 0.45 % saline | decision 3 distractor `hypotonic-fluid`; `half-normal-saline` contraindicated; `rb-first-hour-plan` lost |
| Blaming the crepitus on Kussmaul breathing without imaging; feeding him | decision 2 distractor `blame-kussmaul`; the CT stage does not open without nil by mouth and a CT request; `rb-air-acts` (critical) |
| Gastroscopy before CT | decision 2 distractor `scope-first` (gastroscopy in `ed`/`ct-review` has no result) |
| Chest drains for "bilateral pneumothoraces" on auscultation alone | decision 2 distractor `bilateral-drains` |
| "No tear on CT, so he can eat" / thoracotomy for a dilated oesophagus | decision 4 distractors |
| Routine neck drainage | decision 4 distractor `routine-neck-drainage` (the report's step generalised) |
| Typing the diabetes from one episode; metformin; sliding scale only | decision 5 distractors; `metformin-only` contraindicated; `rb-step-down` lost |

### Teaching points for the debrief

The six teaching points in `debrief.teachingPoints` (each with its guidance and year, each contrasting the record with
current practice): diagnosis and grading (2024 consensus, JBDS-IP 2023); protecting the compensation (Winter's formula,
BTS/ICS 2016); the first hour (fluids, insulin, potassium, no bicarbonate); the sodium read with the glucose (European
hyponatraemia guideline 2014, the JBDS 18–25 caution); crepitus after vomiting (WSES 2019; conservative care; drainage
only for compromise); the step-down and classification (2024 consensus, ADA Standards of Care 2026).

## Embodied mode

- **Where:** the patient starts lying on a trolley in the general hospital's ED resus room (setting `emergency`); phase
  `ward` moves him to a ward bed (`location: {setting: "ward"}`, a scene setting — the report does not say where he was
  nursed); `followup` is a record review.
- **Records terminal vs bedside:** the glucose and blood ketones are point-of-care tests (the meter is at the ED nurse
  station); urinalysis, gas, chemistry and blood count are sampled at the patient and run in the laboratory once the
  IV-access procedure has drawn the bloods; the ECG and the portable chest film are bedside tests (no results recorded).
  The CT request (`ct-chest`, `performedAt: provider`) takes him to the CT suite; its report (`ct-report`) is a record
  read at a records terminal in `ct-review`. The gastroscopy takes him to the endoscopy suite in `ward`. The outcome is
  a record (`followup`).
- **Capabilities:** `iv-access` (the case's IV-access procedure, needed before any IV item), `infusion-pump` (insulin,
  potassium), `medications`, `cardiac-monitor`, `oxygen`, `suction` (nasogastric tube), `niv` and `ventilator` (the resus
  ventilator) and `airway` (the crash cart) — only for the contraindicated NIV and intubation steps —, `point-of-care`, `lab-*`, `ecg-12lead`, `xray`, `ct`, `endoscopy`, `records`; all are
  provided by the general hospital (`caseCapabilityGaps` is empty).
- **Voice and scope:** he answers for himself (no companion; `nonVerbalWhen` not set) — the history-taking is the
  case's staging; his conscious level is not recorded. Nil by
  mouth and the nasogastric tube are within nursing scope; NIV and intubation are medical acts.
- **Monitor:** no physiology model; the triage note gives the heart and respiratory rates, and the monitoring response
  says no other reading is recorded.

## Source and adaptation (fidelity limits)

**Source:** 邢西迁, 王晋, 杨志坚, 等. 糖尿病酮症酸中毒并发纵隔气肿一例. 中华结核和呼吸杂志. 2011;34(11):859-860.
DOI 10.3760/cma.j.issn.1001-0939.2011.11.021 (verified 2026-10-29). The full article was **not available** in the
authoring environment: version 1.1.0 is re-authored only from the facts that version 1.0.0 (commit `88ed0d2`) recorded,
following STANDARD §6. `extensions.sourceTextChecked` is `false`, and every history item, examination finding and
result carries a `source` note "(as extracted for version 1.0.0; check against the full article pending)". The
extraction map is the table under "Clinical numbers check".

**What was adapted.** The facts were reorganised, not added to: the compound chief complaint and history slot split
into items in the patient's lay voice; the single examination record split into five bedside manoeuvres; the single
"metabolic studies" record split into orderable tests (glucose, urinalysis, gas, electrolytes) with structured values;
the CT and gastroscopy separated and staged after the decisions they inform; the reported treatment kept in the outcome
record and in the responses of the matching interventions (fluids, insulin, gastric decompression, cervical drainage).
Everything the 1.0.0 version did not record stays unknown — 15 history items answer "I'm not sure, doctor", tests a
learner would order have "no result is recorded" placeholders, `examNotRecorded` covers other examinations, and the
seven `unknowns` list the rest.

**Inconsistencies of version 1.0.0 kept (both readings, nothing resolved):**

1. Its teaching text (a decision's feedback, a teaching point) speaks of an "acid-correction" (纠酸) step, while its
   outcome record lists only fluids, insulin, gastric decompression and cervical drainage. This version does not assert
   that alkali was given (`sodium-bicarbonate` responds "this case does not record whether any alkali was given").
2. The chief complaint gives one month of thirst (口干多饮一个月), the history "over a month" (一个多月); the case uses
   "over a month".
3. The sodium is written "钠112、钾3.8 mmol/L" — one unit after both values; it is entered as 112 mmol/L.
4. The English 1.0.0 text says "reduced breath sounds", the Chinese 双肺呼吸音低 (both lungs); the case uses "both sides".

**Privacy.** Pseudonym (unique in the collection); no hospital, date, place or occupation; relative time only.

**Teaching devices (labelled, adding no clinical fact):** the phases, decisions, options and feedback, interventions,
rubric, objectives; the staff (Nurse Wen, Dr Long, Dr Bai, Dr Ji); the patient's voiced worry ("Is this something
serious?") and his acting notes; the ED resus and ward locations.

**Collection survey findings applied (template defects and governance):** the 1.0.0 triage note named the answer
("Assess the metabolic crisis alongside the source of thoracic air") — replaced by a handover of the presenting facts;
the specialty id `respiratory` → canonical `respiratory-medicine`; the template's generic history slots (vaccinations
for an adult, "other admissions", record-facing answers such as "the source case does not provide that information" in
the patient's mouth) replaced by case-specific questions in lay voice; three generic decisions → five at the real
decision points; no interventions → 20 (the recorded steps, today's steps, and the tempting wrong ones with harm texts);
the hindsight critical item (`rb-safety`, met by a decision answered after the confirming records) → three critical
items that are acts (two gated before the CT result, and the avoided positive-pressure ventilation); option ids that named the answer (`dual`, `bounded`, `coordinated`) → content ids; no length
cue.

**Unsafe or weak teaching in 1.0.0 that this version corrects:** its management key ("monitored adult DKA care and
specialist assessment of air-leak severity") named no act, drug, dose or threshold; it never taught potassium before
insulin (K⁺ 3.8), the danger of hypotonic fluid with a sodium of 112 mmol/L, the meaning of the PaCO₂ of 10 mmHg or the
harm of positive-pressure ventilation; and it accepted "symptom-based assessment" of the air leak without nil by mouth or
imaging before endoscopy.

## Matcher notes

- 45 test utterances (24 Chinese, 21 English), written as learners speak — colloquial ("Been really thirsty lately?"),
  abbreviated ("how long have u had the dry mouth"), British lay words ("Are you weeing more than usual?") — including
  three look-alike negatives (sleep, travel, eyesight) that must select nothing. `cases verify`: 45/45, no extra
  selections.
- Keywords that would reduce to one token are written run together (`whatbringsyou`, `outofbreath`, `whatcameup`,
  `whosathome`).
- `excludeKeywords` keep look-alikes apart: the presenting complaint ignores "blood"/"vomit" (so "Was there any blood in
  what you brought up?" reaches `vomit-look`); `vomiting` ignores questions about colour, blood and appearance;
  `abdominal-pain` ignores chest, neck and back; `diabetes-before` ignores family words (→ `family-diabetes`);
  `medicines` ignores allergy and street-drug words; `thirst` ignores alcohol.
- Probed in the independent review (2026-11-14) with the core matcher, question by question, in both languages: "有没有吐？"
  (a required item), "How long have you been unwell?" / "这次病了多久？", "Are you eating?" / "吃饭怎么样？" and "Examine his
  abdomen" / "Feel his tummy" reached nothing or the wrong item; keywords and five utterances were added, with exclusions
  that keep look-alikes apart (`appetite-energy` ignores 吐/vomit/stick, so "吐的东西什么颜色？" and "Does food stick when
  you eat?" stay with `vomit-look` and `swallowing`; `neck-palpation` ignores abdomen words). "What did you bring up?"
  still reaches nothing: a "bring up" keyword pulled "What brings you in?" to `vomit-look`, so it was left out.
- Every required item (presenting, breath-onset, thirst, weight-loss, vomiting, vomit-look, diabetes-before, allergies)
  has at least one paraphrase; no utterance equals a canonical question or a keyword.

## References

1. 邢西迁, 王晋, 杨志坚, 肖谊, 魏星, 李志东, 吴绪伟. 糖尿病酮症酸中毒并发纵隔气肿一例. 中华结核和呼吸杂志. 2011;34(11):859-860. doi:10.3760/cma.j.issn.1001-0939.2011.11.021. Available from: https://rs.yiigle.com/cmaid/857347
2. Umpierrez GE, Davis GM, ElSayed NA, et al. Hyperglycemic crises in adults with diabetes: a consensus report. Diabetes Care. 2024;47(8):1257-1275. doi:10.2337/dci24-0032
3. Dhatariya KK; Joint British Diabetes Societies for Inpatient Care. The management of diabetic ketoacidosis in adults—an updated guideline from the Joint British Diabetes Society for Inpatient Care. Diabet Med. 2022;39(6):e14788. doi:10.1111/dme.14788 (JBDS 02, revised March 2023)
4. Spasovski G, Vanholder R, Allolio B, et al. Clinical practice guideline on diagnosis and treatment of hyponatraemia. Eur J Endocrinol. 2014;170(3):G1-G47. doi:10.1530/EJE-13-1020
5. Chirica M, Kelly MD, Siboni S, et al. Esophageal emergencies: WSES guidelines. World J Emerg Surg. 2019;14:26. doi:10.1186/s13017-019-0245-2
6. Davidson AC, Banham S, Elliott M, et al. BTS/ICS guideline for the ventilatory management of acute hypercapnic respiratory failure in adults. Thorax. 2016;71(Suppl 2):ii1-ii35.
7. O'Driscoll BR, Howard LS, Earis J, Mak V. BTS guideline for oxygen use in adults in healthcare and emergency settings. Thorax. 2017;72(Suppl 1):ii1-ii90. doi:10.1136/thoraxjnl-2016-209729
8. American Diabetes Association Professional Practice Committee. 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S27-S49. doi:10.2337/dc26-S002
9. American Diabetes Association Professional Practice Committee. 16. Diabetes care in the hospital: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S339-S355. doi:10.2337/dc26-S016

Checked by web search on 2026-11-13 (search summaries; the publisher and PMC pages could not be opened from this
session): the WSES 2019 citation and DOI, and its recommendation of CT for a suspected perforation (Grade 1B in its
foreign-body section; the perforation section's own statement, read in the independent review below, is Grade 1C); the BTS/ICS 2016 threshold for NIV (pH < 7.35 with pCO₂ > 6.5 kPa despite optimal medical
therapy, Grade A); the 2024 consensus diagnostic criteria (urine ketones 2+ or more accepted), its potassium rules
(insulin delayed below 3.5 mmol/L with replacement at 10 mmol/h; replacement below 5.0 mmol/L, aiming at 4–5 mmol/L),
dextrose below 250 mg/dL and the resolution criteria; the JBDS severity markers for level-2 care (among them a
bicarbonate below 5 mmol/L and a pulse over 100/min), its 40 mmol/L of potassium at 3.5–5.5 mmol/L and its more cautious
fluids at 18–25 years; the 10 mmol/L limit in the first 24 hours of the 2014 European hyponatraemia guideline; the ADA
Standards of Care 2026 section 2 citation and its autoantibody recommendation for adults whose features overlap with
type 1 diabetes (numbered 2.10 in the 2026 edition). References 2, 3 and 9 also stand as checked in `dka-adult` (the 2024
consensus severity bands and the 1–2 h overlap; JBDS 02; the 2026 hospital chapter's citation). Reference 6 is cited
without a DOI because the DOI was not confirmed.

**Independent review (2026-11-14): guidance read in full.** The 2024 consensus (its Diabetologia copy,
doi:10.1007/s00125-024-06183-8): potassium replacement started below 5.0 mmol/L, aiming at 4–5 mmol/L, with 20–30 mmol per
litre of fluid sufficient for most patients; below 3.5 mmol/L, 10 mmol/h with insulin delayed; isotonic saline or a
balanced crystalloid at 500–1000 mL/h for the first 2–4 h in adults *without renal or cardiac compromise*; bicarbonate only
below pH 7.0; Table 2's severity bands (moderate pH 7.0–7.25, bicarbonate 10 to < 15; severe pH < 7.0, bicarbonate < 10,
suggested care in the ICU; not every variable need be met); a 1.6 mmol/L sodium rise per 5.6 mmol/L fall in glucose;
0.05 U/kg/h with dextrose once the glucose is below 13.9 mmol/L; resolution at ketones < 0.6 mmol/L with venous pH ≥ 7.3
or bicarbonate ≥ 18 mmol/L; basal insulin 1–2 h before the infusion stops. JBDS 02 (revised March 2023): the severity
markers (bicarbonate < 5.0 mmol/L, pulse > 100/min, among others) that prompt referral to a Level 2/HDU bed; **no
potassium with the initial resuscitation fluid** (pre-renal kidney injury), then 40 mmol/L while the potassium is below
5.5 mmol/L **and the person is passing urine**; more cautious fluids at 18–25 years; the infusion reduced to
0.05 units/kg/h below 14 mmol/L; bicarbonate may delay the fall in ketones; in a new diagnosis, basal insulin
0.25 units/kg once daily alongside the infusion. The 2014 European hyponatraemia guideline: 6.2.1.1 (correct the measured
sodium for the glucose; 2.4 mmol/L per 5.5 mmol/L above 5.5 mmol/L), 6.1.1.3 ("profound" hyponatraemia < 125 mmol/L),
7.4.1.4 (no rise of more than 10 mmol/L in the first 24 h and 8 mmol/L in each 24 h after). WSES 2019, perforation
section (PMC6544956): contrast-enhanced CT and CT oesophagography are the imaging of choice (1C); diagnostic endoscopy
helps when the CT is doubtful (1C), with the risk of enlarging the perforation; non-operative care with nil by mouth,
broad-spectrum antibiotics and a PPI (1C) and an endoscopically placed nasogastric tube (2A); CO₂ insufflation appears only
in its trauma section, and the case does not attribute it to WSES. ADA Standards of Care 2026, section 2 (PMC12690183;
S27–S49 confirmed): recommendation 2.10 (islet autoantibodies in adults whose features overlap with type 1 diabetes,
grade E) and "do not test C-peptide within 2 weeks of a hyperglycemic emergency"; section 16's citation (S339–S355) was
confirmed in a secondary listing. BTS/ICS 2016 recommendation 25 (NIV when pH < 7.35 and pCO₂ > 6.5 kPa persist or
develop despite optimal medical therapy, grade A) was read in its BMJ Open Respiratory Research copy.

### To verify

**In the source article** (the facts a source pass must check or restore):

- The full admission observations: blood pressure, temperature, oxygen saturation, conscious level (GCS) and weight
  (with a weight, the insulin infusion could carry a per-kg preset dose), and his urine output on admission and during
  treatment (the condition for potassium in the fluid).
- The admission laboratory panel: chloride (anion gap), urea, osmolality, blood β-hydroxybutyrate, lactate, haemoglobin
  and white count, amylase/lipase, HbA1c — and any repeat values during treatment.
- The sodium of 112 mmol/L: its unit, whether a corrected value is reported, and the method (lipaemia, direct electrode).
- The ketone value of 14.4 mmol/L: urine or blood, strip or quantitative.
- Chest X-ray and ECG findings, if any; the CT's timing, whether intravenous or oral contrast was used, and whether it
  showed a pneumothorax or pleural effusion.
- The gastroscopy: its timing relative to the CT and the drainage, the site of the coffee-ground material and any lesion,
  biopsies, and whether CO₂ insufflation was used.
- The treatment: fluid type and volumes, the insulin regimen and doses, potassium, **whether alkali (sodium bicarbonate)
  was given and at what dose** (1.0.0 inconsistency 1), antibiotics, the timing of gastric decompression, and the
  timing, method and **indication of the cervical drainage** (e.g. airway or voice compromise).
- Diabetes classification: C-peptide, islet autoantibodies, the final type and the discharge regimen; what "no
  recurrence over two years" refers to (pneumomediastinum, ketoacidosis or both).
- Symptoms the case leaves unknown: chest or neck pain, painful swallowing, voice change, fever, polyuria.
- The chief complaint's duration (one month vs over a month) and the breath-sounds wording (both lungs).
- What the approved figure (fig01) shows, to give it a descriptive title.
- The wording of the reported diagnosis (DKA with spontaneous pneumomediastinum and subcutaneous emphysema), which the
  outcome record now states.

**In the guidance** (statements this pass could not confirm online):

- WSES 2019: its perforation section says "CT oesophagography" without naming the contrast, and mentions CO₂
  insufflation only for trauma; the case teaches water-soluble contrast and CO₂ insufflation as general practice, not as
  WSES statements — a surgeon should confirm both.
- Potassium with a creatinine of 217 µmol/L: the case keys JBDS-IP 2023's rule (none in the first resuscitation litre,
  then 40 mmol/L once he is passing urine) beside the 2024 consensus's (replacement below 5.0 mmol/L, which names no
  urine condition); an endocrinologist or acute physician should confirm the keyed plan.
- Fluids: the 2024 consensus's 500–1000 mL/h applies to adults without renal or cardiac compromise; whether a creatinine of
  217 µmol/L of unknown chronicity counts as compromise is a clinical judgement the case leaves to the learner.
- The 2014 European hyponatraemia guideline: how its correction limits apply while insulin lowers the glucose (the case
  applies the 10 mmol/L limit to the glucose-corrected sodium, an inference).
- ADA Standards of Care 2026, section 16: the exact 2026 wording on correction insulin alone (confirmed only through
  secondary summaries).
- BTS/ICS 2016: the DOI.
- Intubation in DKA: no society guideline on ventilator targets was found; the `rsi-intubation` harm text rests on
  physiology (induction apnoea, matching his minute ventilation, positive pressure with mediastinal air).
- Spontaneous pneumomediastinum: whether any society guidance (imaging, drainage indications) has been published; the
  case states only the general principle that drainage is reserved for compromise.
- The DKA chapter of 中国糖尿病防治指南（2024版）(中华糖尿病杂志. 2025;17(1):16-139) was not consulted; check for
  differences (potassium threshold, insulin dose, resolution criteria) before teaching in China.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- New spoiler-free title, summary, triage note (a handover of the presenting facts) and topic tags; specialty ids
  canonical.
- History: 25 case-specific items in the patient's lay voice (8 required, 15 honest unknowns) replacing the template
  slots; no authoring language in the patient's mouth.
- Examination: five bedside manoeuvres from the one recorded examination.
- Investigations: 15 one-test records with structured values, staged across four phases; placeholders for the tests a
  learner would order that the case does not record.
- Interventions: 20 (the report's steps, today's steps, the tempting wrong ones with harm texts and `critical` set).
- Decisions: five at the real decision points (acid–base, the air leak, the first hour, the CT, the step-down), neutral
  option ids, feedback naming the guidance and year.
- Rubric: 12 items, three critical (two acts gated before the CT result, and the positive-pressure avoided-harm item
  with `scoredWhen`), a case-specific communication item.
- Staff: nurse, attending, endocrinologist and thoracic surgeon with case-specific knowledge.
- Debrief: new conclusion, five reasoning steps, six dated teaching points, seven unknowns, nine references.
- Provenance: `editorial` review against seven named guidelines; the 1.0.0 inconsistencies kept and listed; DOI fields
  normalised (`sourceDoi`, `doiVerifiedAt`); `sourceTextChecked: false`.
- Survey findings applied (triage-note spoiler, template defects, hindsight critical item, answer-bearing option ids).
- Completion pass (2026-11-13), after an interrupted run, re-read against the 1.0.0 facts and the guidance:
  descriptors 1.0.0 does not record removed ("forceful"/"剧烈" vomiting, "一直吐", a "true" hyponatraemia that the case
  cannot establish); decision 1's distractors no longer mention air in the chest before the neck has been examined;
  guideline statements re-checked by web search and narrowed to what could be confirmed (the 2024 consensus potassium
  rule instead of an unconfirmed 20–30 mmol/L, WSES 2019, the ADA autoantibody recommendation); potassium written as a
  concentration and its risk set to moderate; a contraindicated, critical `rsi-intubation` added beside `niv`, with a
  critical avoided-harm item `rb-no-positive-pressure` (the bicarbonate, 0.45 % saline and metformin harms now sit in
  `rb-first-hour-plan` and `rb-step-down`); the reported diagnosis added to the outcome record; "no repeat result is
  recorded" placeholders in the later phases for the tests a learner would repeat (so a re-check is answered, not
  rejected); the WSES DOI added after verification; the score table re-measured.
- **Independent review (2026-11-14).** Against the 1.0.0 facts, the standard and guidance read in full (above):
  - Potassium keyed as JBDS-IP 2023 gives it — none in the first resuscitation litre, then 40 mmol/L while he is passing
    urine — instead of "from the start", which no cited guideline says; his creatinine (217 µmol/L) and unrecorded urine
    output named in the key, its feedback, the potassium dose text, a reasoning step, a teaching point, a learning
    outcome and the preceptor's questions; the reference path sets the monitoring plan (urine output) before insulin and
    potassium; the consensus's 20–30 mmol per litre added.
  - The insulin infusion's dose text states the guideline schedule (0.1, then 0.05 units/kg/h below 14 mmol/L; JBDS-IP
    2023, 2024 consensus) and its zh rate as "单位/kg/h" (the dose reader took "单位/(kg·h)" for an absolute dose):
    the new high-alert lint had failed `cases validate --strict`; no per-kg preset, since his weight is not recorded.
  - Wording that added to the facts: the conclusion's "crepitus from neck to abdominal wall" (now neck, front of the chest
    and abdominal wall); "dry all the time", "no strength at all", "nothing wrong with my lungs before" (1.0.0: no
    chronic lung disease); the persona's weight loss "for over a month" (1.0.0: over the past month); "the gastroscopy
    later in the admission" (1.0.0: after the CT); responses implying he was nil by mouth or had no hypotonic fluid.
  - "Severe" hyponatraemia renamed "profound" (< 125 mmol/L), as the 2014 European guideline the case cites names it;
    bicarbonate's slower ketone clearance attributed to JBDS-IP 2023; the consensus's ICU suggestion for severe DKA;
    C-peptide timing (not within 2 weeks of a hyperglycaemic emergency) and C-peptide taken out of the reference path;
    the consensus's fluid rate limited to adults without renal compromise; urine output added to the unknowns.
  - The first objective's title and two hints no longer say where the examination finds something; the select-all
    decision's keys are no longer its three longest options (English); a placeholder for a repeat CT request.
  - Matcher: five gaps found by probing plain questions fixed, with five new utterances (45).
  - README: the WSES grade and ADA recommendation number corrected, guidance read in full listed, "To verify" narrowed
    to what is still open, the case-check path and validation results updated.

### 1.0.0 — 2026-10-28

Initial de-identified adaptation from a fill-in template (three decisions, no interventions, record-review only).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-857347/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-857347 --lang en                                                 # 77 steps · objectives 6/6 · decisions 5/5 · utterances 45/45 · rubric 31/31 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-857347                                      # depth floor, do-nothing 0, wrong-first 55 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-857347:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-857347:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-11-14 for version 1.1.0, after the independent review: all five pass.

## 中文摘要

**病例概要。** 25岁男性，既往无糖尿病、高血压和慢性肺病。口干多饮一个多月，一个月内体重下降约 10 kg，近 3 天食欲下降、乏力、
恶心并呕吐咖啡渣样物，入院前 1 天明显呼吸困难。到院时心率 120 次/分，呼吸深快 40 次/分，颈部、前胸和腹壁可触及握雪感，双肺
呼吸音低。血糖 26.3 mmol/L，尿酮 14.4 mmol/L，pH 7.10，PaCO₂ 10 mmHg，HCO₃⁻ 3.1 mmol/L；钠 112 mmol/L，钾 3.8 mmol/L，
肌酐 217 µmol/L。胸部 CT 示纵隔及皮下积气、食管扩张，未见明确的食管或气管撕裂；CT 之后的胃镜见咖啡渣样物和十二指肠充血，未见
明显穿孔。诊断：糖尿病酮症酸中毒合并自发性纵隔气肿和皮下气肿。报告记录经补液、胰岛素、胃肠减压和颈部引流后好转，积气约
1 周基本吸收，化验恢复，住院约 2 周出院，随访 2 年未复发。本版依据 1.0.0 版提取的事实改写，尚未对照原文全文核对。

**学习目标。**

1. 根据血糖、酮体和血气诊断酮症酸中毒并分级，决定治疗地点（2024 年 ADA/EASD/JBDS-IP/AACE/DTS 共识；JBDS-IP 2023）。
2. 用 Winter 公式识别最大呼吸代偿，说明深快呼吸不是无创通气的指征（BTS/ICS 2016），镇静或通气不足为何危险。
3. 开始第一个小时的治疗：等渗液、0.1 单位/(kg·h) 固定速率胰岛素、血钾 3.5–5.5 mmol/L 且有尿时补钾、pH ≥ 7.0 不用碳酸氢钠，
   并按校正后约 118–121 mmol/L 的血钠调整液体和监测（2024 年共识；JBDS-IP 2023；2014 年欧洲低钠血症指南）。
4. 识别呕吐后颈胸部握雪感提示的胸腔内漏气：让患者禁食，先行 CT 排查食管穿孔（WSES 2019），再考虑内镜。
5. 解读纵隔气肿而无裂口的 CT：保守处理并持续观察，颈部引流只用于积气危及气道、呼吸或循环时。
6. 制订停用静脉胰岛素和出院的计划：纠正标准、停泵前 1–2 小时给基础胰岛素、以胰岛自身抗体分型、教育与生病期间规则
   （2024 年共识；ADA 2026 糖尿病诊疗标准）。

**关键决策。**

- 决策 1（血气与呼吸）：酮症酸中毒伴严重代谢性酸中毒，PaCO₂ 10 mmHg 是接近极限的代偿，不是呼吸衰竭；干扰项为“合并呼吸性
  酸中毒、需要通气支持”“原发性呼吸性碱中毒”“乳酸酸中毒或饥饿性酮症”。
- 决策 2（颈胸部握雪感）：立即禁食，尽快颈胸部 CT（疑食管破裂时加口服水溶性造影剂），请胸外科会诊；干扰项为“只怪深快呼吸、
  不做影像”“先做胃镜”“双侧盲目置管”。
- 决策 3（第一个小时）：等渗液、固定速率胰岛素、确认有尿后尽早补钾（JBDS：首袋复苏液不加钾；他的肌酐 217 µmol/L）、每小时监测、
  转入高依赖病房；干扰项为“先用碳酸氢钠”“钾 3.8 正常、
  先不补”“0.45% 低渗盐水”。
- 决策 4（CT）：最可能是自发性纵隔气肿，继续禁食和胃肠减压、治疗酮症酸中毒、观察气道，必要时复查影像；干扰项包括急诊开胸、
  “没看到裂口就可以进食”、CPAP，以及把报告中的颈部引流推广为常规。
- 决策 5（出院前，多选）：先给基础胰岛素再停泵、用抗体等检查分型、出院前教育；不改用二甲双胍，不单用纠正剂量胰岛素。

**安全结果。** `niv`（无创正压通气）和 `rsi-intubation`（快速顺序诱导插管）标为 `critical: true`：他靠深快呼吸代偿酸中毒，近几天呕吐，纵隔有气，正压面罩或插管会去掉代偿、增加误吸和张力性气胸的风险，无论得分多少，安全结果都判为不通过，并对应关键项 `rb-no-positive-pressure`；碳酸氢钠（高风险）标为 `critical: false`，在血钾已知之前开始胰岛素或补钾、0.45% 盐水和改用二甲双胍都属于可以纠正的判断失误。

**复盘要点（PEARLS）。** 先谈看到他每分钟呼吸 40 次、摸到皮下握雪感时的第一反应；用两句话说清血气、电解质和查体结果以及第一个
小时的处理；分析 Winter 公式与呼吸储备、为什么要先看钾再开胰岛素、钠 112 与血糖一起看说明他是低渗还是高渗、呕吐后颈部握雪感
最不能漏的是什么、为什么先 CT 后胃镜、一次没看到裂口的 CT 能排除什么、什么时候才需要颈部引流、一次发作能否确定糖尿病类型；
总结下次遇到又吐又喘、血糖很高的年轻人时要做和不做的事。评分：确定性总分 31 分，三项关键项（在急诊、看到血钾之后开始补液、
胰岛素和补钾；在急诊就禁食并申请 CT；不给无创通气、不插管），沟通项由考官评判。记录中的处置（胃肠减压、颈部引流、CT 之后的胃镜）只作为历史对照。
本病例经人工智能辅助编辑审核（2026-11-14 独立复核），尚未经执业医师审核；待核实事项见上文 “To verify”。
