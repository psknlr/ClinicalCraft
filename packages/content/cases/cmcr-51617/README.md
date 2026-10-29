# cmcr-51617 — Persistent fever and drowsiness · 34-day-old girl

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners
> should open the case from the case library, where the title, summary, chief
> complaint and tags give nothing away.

**Published-case adaptation.** The case follows a case report in 中华儿科杂志
(杜曾庆, 2014). The patient (朵朵 / Duoduo) and her parent are pseudonymous;
the hospital and every calendar date are removed and times are relative
(admission = illness day 10 = day 34 of life). The report's historical
treatment is recorded as fact; current guidance is taught in the decisions,
feedback and debrief.

## Case card

| | |
|---|---|
| id / version | `cmcr-51617` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (paediatric ward bed `ward-1`) |
| specialty | paediatrics, paediatric cardiology |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: four staged phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have a paediatric cardiologist review it before teaching use |
| phases | `initial` (入院：病程第10天 / Admission: illness day 10) → `workup` (入院后：检查与初始治疗 / After admission) → `discharge` (住院第11天：出院前 / Hospital day 11) → `followup` (出院后随访：2个月至3岁3个月 / Follow-up); one-way, none learner-switchable |
| content | 23 history items (4 required, 10 `unknown`, 1 `volunteer`, 4 phase twins) · 6 exam findings (4 required) · 11 investigations (4 essential, 1 not recorded, 2 record reviews) · 13 interventions (1 contraindicated, 3 neutral) · 6 objectives · 4 decisions · 11 rubric items (10 deterministic, weight 22, + 1 examiner-judged) · 3 NPCs · 5 learning outcomes · 39 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise that an infant aged 6 months or younger with 7 or more days of
   unexplained fever and raised inflammatory markers needs evaluation for
   incomplete Kawasaki disease, including blood tests and an echocardiogram
   even with few or no principal features (AHA 2017).
2. Elicit transient early mucocutaneous signs from the parent and check each
   AHA 2017 supplementary laboratory criterion as met, not met or not tested.
3. Explain why absolute coronary diameters under-grade coronary involvement in
   infants, and obtain length, body surface area and Z-scores before choosing
   antithrombotic therapy by risk level (AHA 2017/2024).
4. Give IVIG 2 g/kg as a single infusion when Kawasaki disease is diagnosed
   after day 10 with persisting fever or coronary changes and inflammation, and
   identify high-risk features such as age under 6 months that favour
   intensified primary therapy (AHA 2017; AHA 2024).
5. Interpret infant CSF against age-specific reference values, separate the
   authors' diagnosis from what the record shows, and compare each historical
   dose with current recommendations.

These are the case's `learningOutcomes` (case card and debrief); the six HUD
`objectives` below are the in-game task list.

## Clinical summary

**Presentation (illness day 10, day 34 of life).** A 4.3-kg girl, ill since
day 24 of life, has had 10 days of fever without an obvious trigger (highest
38.9 °C). At another hospital she had IV amoxicillin for 2 days and cefepime
for 3 days "and other treatment"; she is still febrile, feeding poorly,
listless, drowsy and slightly coughing. The clinic admitted her as "fever of
unknown origin — sepsis?". Early in the illness both eyes and her lips were
red; the parents deny a rash or neck swelling.

**Examination.** T 37.4 °C rising to 38.5 °C, HR 124/min, RR 36/min. Poor
general condition, drowsy, no signs of hypoxia. Anterior fontanelle flat,
2.5 × 2.5 cm, tension rather raised; neck stiffness equivocal. No conjunctival
injection, lips not red or cracked, cervical nodes not enlarged, no rash.
Regular rhythm without a pathological murmur; coarse breath sounds, no
crackles; soft abdomen, no hepatosplenomegaly; no sclerema.

**Results.**

| test | result |
|---|---|
| blood count, CRP | Hb 118 g/L, WBC 14.9 ×10⁹/L (N 0.65, L 0.35), platelets 822 ×10⁹/L, CRP > 200 mg/L; ESR not recorded |
| CSF | protein 0.49 g/L; glucose, chloride and cell count "normal" (no values) |
| cultures | blood and CSF: no growth (after 5 days of antibiotics) |
| chemistry | bilirubin 30.9 (direct 9.2, indirect 21.7) µmol/L; ALT, AST, urea, creatinine, LDH and isoenzymes, α-HBDH, CK, CK-MB normal; glucose 5.8 mmol/L; albumin not recorded |
| urinalysis | not recorded |
| ECG | sinus tachycardia (rate not given) |
| chest radiograph | increased lung markings |
| abdominal ultrasound | liver, gallbladder, spleen, kidneys: no obvious abnormality |
| echocardiogram | LCA 3.0 mm, "mild dilatation", irregular intima; RCA 3.1–4.7 mm, "moderate dilatation", irregular intima; funnel-shaped PDA; no BSA or Z-scores |

**Diagnosis.** The report: incomplete Kawasaki disease with aseptic
meningitis. The case teaches: incomplete Kawasaki disease with coronary
dilatation that is very likely aneurysmal at her size (Z-scores need her
length, which was not recorded); the CSF is within age norms and does not
demonstrate meningitis.

**Historical treatment (the report).** Mannitol (dose not recorded), IVIG
7.5 g once (≈ 1.7 g/kg), aspirin 100 mg twice daily (≈ 47 mg/kg/day) and
supportive care; afebrile 2 days later; home after 11 days on aspirin 50 mg
twice daily (≈ 23 mg/kg/day at the admission weight) with advice to avoid
chickenpox contacts. Pre-discharge Hb 116 g/L, WBC 8.8 ×10⁹/L, platelets
915 ×10⁹/L, CRP 20.9 mg/L. No periungual peeling.

**Follow-up (the report).** 2 months after discharge: coronary lesions not
improved, platelets 652 ×10⁹/L, aspirin up to 100 mg twice daily. About 6
months later: PDA closed, RCA 4.2 mm, LCA 2.8 mm. 2 years 11 months: LCA
normal, RCA 3.9 mm, aspirin 100 mg three times daily. 3 years 3 months: 96 cm,
13 kg, normal growth, development and neurological examination; LCA normal,
RCA 3.4 mm with irregular intima; still on aspirin 100 mg three times daily
(≈ 23 mg/kg/day).

**Reference plan (current guidance).** Parallel evaluation for serious
bacterial infection and incomplete Kawasaki disease, including an
echocardiogram; IVIG 2 g/kg as a single infusion with aspirin 30–50 mg/kg/day;
paediatric cardiology involvement because she is high-risk (under 6 months),
with intensified initial therapy considered; length, BSA and coronary Z-scores;
at discharge low-dose aspirin 3–5 mg/kg/day, anticoagulation if the Z grade is
a large or giant aneurysm, early echocardiographic review, annual inactivated
influenza vaccine, no ibuprofen, Reye syndrome precautions, and measles and
varicella vaccines deferred for 11 months after IVIG.

## Scenario timeline and physiology

- **Static clock, four one-way phases.** No physiology model (the collection
  contract forbids one): every result is the report's, and treatment responses
  are not simulated.
  - `initial` — admission, illness day 10. History from the parent and the
    bedside examination. Tests ordered here have no record ("no record in this
    phase"): the results open only in `workup`.
  - `workup` — entered when `next-step` is decided, so the learner commits to
    a plan before seeing any result. The report does not date the individual
    tests; results carry "after admission (day not stated)".
  - `discharge` — entered when objective `obj-treat` is complete (treatment
    decided, IVIG and acute aspirin given). It holds the report's inpatient
    course (`course`, a record review) and the pre-discharge blood count.
  - `followup` — entered when `obj-discharge` is complete (course read,
    `long-term` decided). It holds the follow-up record and the serial
    echocardiograms.
- **Present-tense history is phase-bound.** Fever, feeding, cough, the
  medicines and the parent's worry are limited to `initial`/`workup`; their
  phase twins answer later: `status-discharge` and `meds-discharge`
  (discharge), `status-followup` and `meds-followup` (follow-up).
- **Exam.** Admission findings are available in `initial` and `workup`; the
  fingertip/toe check (`extremities`: no peeling at any time) belongs to
  `discharge`. Anything else falls to `examNotRecorded`.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-history` Take the fever history from the parent | `presentation`, `medications`, `mucosal`, `feeding` asked |
| 2 | `obj-exam` Examine her | `general`, `fontanelle`, `mucosa`, `cardiorespiratory` examined |
| 3 | `obj-workup` Investigate and put the results together | `next-step` decided; blood count, CSF, echo read (workup); `diagnosis` decided |
| 4 | `obj-treat` Start acute treatment | `treatment` decided; `ivig` and `aspirin-acute` given → `discharge` |
| 5 | `obj-discharge` Plan discharge and long-term care | `course` read (discharge); `long-term` decided → `followup` |
| 6 | `obj-outcome` Review the reported follow-up | `followup` read (follow-up) |

Hints ask the question that leads to the answer ("On illness day 10, what is
still worth giving? Which risk group is she in?") and never state a result
the learner has not obtained.

### Decisions

- `next-step` (single, `initial`; needs the fever, medicines and mucosal
  history and the general/fontanelle examination). ✔ parallel evaluation for
  serious bacterial infection and incomplete KD with an echocardiogram (AHA
  2017 infant pathway). ✘ broaden antibiotics because KD "needs four
  features"; ✘ treat as meningitis first (imaging, lower intracranial
  pressure); ✘ KD excluded because the red eyes and lips have gone.
- `diagnosis` (single, `workup`; needs blood count, CSF, cultures and echo).
  ✔ incomplete KD with coronary dilatation, CSF within age norms. ✘ **the
  report's own diagnosis** — KD with aseptic meningitis from a "raised" CSF
  protein (feedback gives Shah 2011 and the pleocytosis point); ✘
  culture-negative sepsis or partly treated meningitis.
- `treatment` (single; needs `diagnosis`). ✔ IVIG 2 g/kg single infusion +
  aspirin, high-risk → discuss intensified initial therapy, Z-scores decide
  the antithrombotic plan. ✘ "too late after day 10"; ✘ trust the report's
  mild/moderate millimetre grades; ✘ antibiotics and a repeat LP first.
- `long-term` (single, `discharge`; needs the inpatient-course record, which
  shows the report's discharge dose). ✔ low-dose aspirin, Z-graded
  anticoagulation, echo follow-up, influenza vaccine, no ibuprofen, Reye
  precautions, live-vaccine deferral after IVIG. ✘ **the report's regimen**
  (50 mg twice daily ≈ 23 mg/kg/day until the coronaries recover); ✘ stop
  aspirin at discharge; ✘ routine vaccines with no precautions.

Every option has its own feedback. Each decision opens before the record that
would answer it: the historical treatment and doses are visible only after
`treatment` is decided, and the follow-up only after `long-term`.

### Rubric (deterministic items, total weight 22)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-hx-fever` | history | 2 | fever, medicines, feeding asked |
| `rb-hx-mucosal` | history | 2 | early red eyes/lips asked |
| `rb-exam` | examination | 1 | general, fontanelle, mucosa, heart and lungs |
| `rb-inv` | investigations | 2 | blood count, CSF, cultures, echo read |
| `rb-next-step` | investigations | 2 | `next-step` right first time |
| `rb-dx` | diagnosis | 3 | `diagnosis` right first time |
| `rb-safety-ivig` | safety | **4** | `treatment` right first time **and** IVIG given |
| `rb-mgmt-acute` | management | 2 | acute aspirin, and Z-score calculation or cardiology consult |
| `rb-safety-longterm` | safety | 3 | `long-term` right first time |
| `rb-outcome` | management | 1 | follow-up record read |

One examiner-judged communication item (`rb-comm`): explaining Kawasaki
disease, the lumbar puncture, the echocardiogram, IVIG and long-term follow-up
to the parent, with teach-back.

### How wrong choices score

- Decisions are scored with `decidedFirstTry`: guessing through the options
  costs the item.
- `ibuprofen` is `contraindicated` once aspirin has been started (it
  antagonises aspirin's antiplatelet effect): a safety event in the debrief.
- `mannitol`, continued `antibiotics` and `anticoagulation` are `neutral`;
  their responses explain the reasoning (no evidence of raised intracranial
  pressure; antibiotics do not treat KD; anticoagulation waits for the Z
  grade). Mannitol is the report's own historical step.
- `steroid-adjunct` is `indicated` once the diagnosis is made and cardiology
  has been involved; it is not required (AHA 2024 says intensification "may
  benefit"), so the reference path leaves it out.
- `iv-access`, `ivig`, `aspirin-acute`, `z-score`, `cardiology-consult`,
  `aspirin-low`, `discharge-teaching` and `echo-follow-up` are `indicated`
  in their phases.

### Framework annotations (pending)

`S/pr3/fxc-annotations/cmcr-51617.json` (not in `case.json`; the coordinator
applies it when the framework fields land): `course` and `followup` are
record reviews (`performedAt: "records"`); the patient is non-verbal
throughout (`nonVerbalWhen: {always: true}` — a 34-day-old cannot speak; the
parent answers); `rb-safety-ivig` and `rb-safety-longterm` are `critical`.

## Reference path (`solution`)

69 steps, static clock:

1. **History** (19 questions): fever, trigger, medicines, early eyes and
   lips, feeding, cough, rash, neck lumps, hands and feet, birth, feeding
   type, nappies, sick contacts, maternal fever/GBS, vaccines, allergies,
   past illness, family, worries.
2. **Examination** (5): general, fontanelle and neck, mucosa and skin, heart
   and lungs, abdomen.
3. **`next-step`** → `workup`; IV access.
4. **Tests** (9, ordered and read): blood count/CRP, CSF, cultures,
   chemistry, urinalysis (not recorded), ECG, chest radiograph, abdominal
   ultrasound, echocardiogram.
5. Cardiology consult, Z-score step, **`diagnosis`**, **`treatment`**, IVIG,
   acute aspirin → `discharge`.
6. Fingertip check, status and medicine questions, inpatient course and
   pre-discharge blood count read, **`long-term`**, low-dose aspirin,
   discharge teaching, echo follow-up → `followup`.
7. Follow-up questions, follow-up record and serial echocardiograms read,
   finish.

`cases verify` passes: 6/6 objectives, 4/4 decisions, 22/22 rubric points,
39/39 utterances, no contraindicated intervention.

## Clinical numbers check

- **Timeline.** Fever began 10 days before admission at 34 days of age →
  onset on day 24 of life (as the report says); 11-day stay → home at about
  day 45 of life.
- **IVIG.** Report 7.5 g ÷ 4.3 kg = 1.74 g/kg (≈ 1.7, derived); current
  2 g/kg × 4.3 kg = 8.6 g.
- **Aspirin.** Report: 100 mg × 2 = 200 mg/day ÷ 4.3 kg = 46.5 mg/kg/day
  (within the 30–50 moderate band); discharge 50 mg × 2 = 100 mg/day ÷
  4.3 kg = 23.3 mg/kg/day (admission weight; discharge weight not recorded);
  3 years 3 months 100 mg × 3 = 300 mg/day ÷ 13 kg = 23.1 mg/kg/day. Current:
  acute 30–50 mg/kg/day = 129–215 mg/day; low dose 3–5 mg/kg/day =
  12.9–21.5 mg/day at 4.3 kg (39–65 mg/day at 13 kg). The report's long-term
  dose is roughly 5–8 times the current antiplatelet dose.
- **Body surface area** (Mosteller √(cm × kg / 3600), derived): 4.3 kg with
  an assumed length of 50–58 cm → 0.24–0.26 m²; 96 cm and 13 kg at 3 years
  3 months → 0.59 m². No Z-score is stated anywhere in the case.
- **CSF protein.** 0.49 g/L = 49 mg/dL; Shah 2011 95th centile for 29–42
  days 89 mg/dL (0.89 g/L); whole-cohort median 58 mg/dL (IQR 48–72). Below
  both.
- **CRP.** > 200 mg/L = > 20 mg/dL, above the 3.0 mg/dL threshold.
- **Supplementary criteria (AHA 2017).** Anaemia for age — no (118 g/L);
  platelets ≥ 450 ×10⁹/L after day 7 — yes (822 on day 10); albumin
  ≤ 3.0 g/dL — not tested; raised ALT — no; WBC ≥ 15 ×10⁹/L — no (14.9);
  urine ≥ 10 WBC/hpf — not tested. One met → the echocardiogram decides.
- **Bilirubin.** 9.2 + 21.7 = 30.9 µmol/L (as reported).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to face a drowsy one-month-old whose fever
   had not responded to five days of antibiotics?"
2. **Description.** "In two sentences: what made you think beyond sepsis, and
   what did you start?"
3. **Analysis.**
   - "Which features of Kawasaki disease did she have, and which had already
     gone by the time she was examined?"
   - "Which supplementary criteria were met, not met or never tested — and
     what decided the diagnosis?"
   - "The authors called the CSF protein raised. What reference did you read
     it against?"
   - "Why might 3.0 and 4.7 mm be a bigger problem in a 4.3-kg baby than the
     report's 'mild' and 'moderate' suggest? What would you need to grade them?"
   - "She was diagnosed on day 10. What made IVIG still worth giving?"
   - "Compare the report's aspirin doses with today's. What would you change at
     discharge, and what would you tell the parent about chickenpox, flu and
     vaccines?"
4. **Summary.** "What will you do next time an infant under 6 months has had
   fever for a week without an explanation?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Waiting for four principal features | `next-step` and `diagnosis` feedback (AHA 2017 infant pathway) | `rb-next-step`, `rb-dx` |
| Discounting the transient red eyes and lips | `mucosal` is required; `kd-excluded` feedback | `rb-hx-mucosal` |
| Accepting the report's "aseptic meningitis" | `kd-meningitis` option is the report's diagnosis; feedback gives Shah 2011 | `rb-dx` |
| "Too late for IVIG after day 10" | `too-late` option | `rb-safety-ivig` (weight 4) |
| Grading by millimetres | `absolute-grade` option; `z-score` and cardiology responses | `rb-safety-ivig`, `rb-mgmt-acute` |
| Treating raised intracranial pressure | `mannitol` (neutral) response; `neuro-first` option | `rb-next-step` |
| Copying the historical aspirin dose | `report-dose` option shows the report's regimen | `rb-safety-longterm` |
| Ibuprofen for fever on aspirin | `ibuprofen` contraindicated | safety event |
| Forgetting vaccines and Reye syndrome | `routine-vaccines` option; discharge teaching | `rb-safety-longterm` |

## Embodied mode

- **Where she is.** A ward bed (`ward-1`, setting `inpatient`); no phase moves
  her. The ward has an IV-capable crash cart, an infusion pump, an ECG cart, a
  glucometer and a records terminal at the nurse station.
- **Grounding the kit (EMBODIED §6).** `iv-access` (a procedure needing the
  cannulation kit on the ward crash cart) comes before IVIG, mannitol and IV
  antibiotics (`iv-access` in their `requires`); IVIG also needs the bedside
  `infusion-pump`; drugs need `medications` (delivered). Bloods, CSF and
  urine are sampled at the patient (bloods may be ordered from a records
  terminal once the cannula has drawn them); the ECG uses the ward ECG cart;
  the echocardiogram and abdominal ultrasound need the radiology ultrasound
  machine, a cart the embodied autopilot wheels to the bedside. The chest
  radiograph keeps the default `performedAt: "provider"` (the report does not
  say it was a portable film): the autopilot takes her on her bed to the X-ray
  room and back. `course` and `followup` are chart reviews (`requires:
  ["records"]`) read at a records terminal. Exam items use the personal kit
  (`thermometer`, `stethoscope`).
- **Scope of practice.** No intervention sets `scope`: medications and the IV
  access are nursing acts by kind, consults and the Z-score step are medical.
- **Demonstration.** `exec --autopilot --provider offline` scores 22/22
  (100 %) in clinical and in-world mode, in both languages, with all six
  objectives complete; the static clock charges no minutes for walks.

## Source and adaptation

### What comes from the report

Age, sex, weight, onset on day 24 of life, the 10-day fever (highest
38.9 °C), the outside antibiotics ("and other treatment"), the clinic's
admitting impression, the early red eyes and lips, the denied rash and neck
swelling; every examination finding; every test value with its unit; the
authors' diagnosis and differential (scarlet fever, measles, erythema
multiforme, sepsis, systemic JIA; purulent, tuberculous and fungal meningitis);
mannitol, IVIG 7.5 g once and aspirin 100 mg twice daily; defervescence after
2 days, the 11-day stay, the pre-discharge blood count, the discharge aspirin
dose and varicella advice, the absence of periungual peeling; every follow-up
visit with its echo, platelet, growth and aspirin data; the authors' note of 3
years 2 months of aspirin without obvious adverse effects.

### What is adapted for teaching

- Dialogue: the parent's lay wording, the opening line and the worry item
  (the report records no ICE); the parent's sex is not given, so the
  companion is "the baby's parent".
- Relative times replace the admission and follow-up dates; mg/kg values and
  body surface areas are derived and labelled as such.
- Phases, decisions, interventions, objectives, rubric and NPC briefs are
  teaching design. Results open by phase so that decisions come before the
  records that would answer them.
- Unrecorded data (length, ESR, albumin, urinalysis, CSF values, the IVIG day
  and duration, the mannitol dose, whether antibiotics continued, birth,
  feeding, vaccines, family and maternal history) stay unknown: `unknown`
  history items, an `available: false` urinalysis, "not recorded" lab values
  and the case `unknowns`.

### Labelled discrepancies and interpretations

- **CSF.** The report calls the protein "raised" and diagnoses aseptic
  meningitis; its own values (normal cells, glucose and chloride; 0.49 g/L)
  are within age-specific norms (Shah 2011). The case keeps the authors'
  wording in the CSF result note and the `kd-meningitis` option, and teaches
  the age-norm reading in feedback and the debrief.
- **Coronary grading.** The report grades by absolute diameter ("mild",
  "moderate"); the case keeps those words in the echo result and teaches
  Z-score grading in the decisions, the cardiology and Z-score responses and
  the debrief, without stating a Z value.
- **Counting principal features.** The authors count fever as one of "3
  principal symptoms" (with conjunctival injection and red lips); AHA counts
  fever as the entry criterion and five other principal features, so she had
  two. Same facts, different convention.
- The report describes WBC 14.9 ×10⁹/L and N 0.65 as "markedly raised"; the
  case reports the values without that adjective.

### Figures and PDF

The article has no figures or tables. The source PDF (`source-pdf`, local
only, opened after completion) was checked page by page: page 1 begins with
the end of another article, including that article's fetal echocardiography
and neonatal ECG figures (no name, ID, hospital or acquisition stamp visible);
the asset title now says so. The PDF also prints the author's institution and
the article's own dates, as published; no figure of this case is used.

## Matcher notes

- Run-together English keywords where a phrase would reduce to one token:
  `howisshenow`, `goinghomeon`, `howshelooks`, `beforethis`,
  `howisshenowadays`.
- `excludeKeywords`: the medicine items ignore allergy questions
  (过敏 / allerg); `family` ignores sick-contact questions.
- Phase twins (`supersedes`): `status-discharge` and `status-followup` answer
  "how is she?" after treatment; `meds-discharge` and `meds-followup` answer
  "what is she taking?" in their phases. The corpus checks one of each.
- 39 utterances (both languages; lay and clinical phrasings; none identical to
  a canonical question); every required item has at least two.

## References

- 杜曾庆. 新生儿不完全性川崎病并发无菌性脑膜炎一例. 中华儿科杂志. 2014;52(1):63-64. doi:10.3760/cma.j.issn.0578-1310.2014.01.016. https://rs.yiigle.com/cmaid/51617
- McCrindle BW, Rowley AH, Newburger JW, et al. Diagnosis, treatment, and long-term management of Kawasaki disease: a scientific statement for health professionals from the American Heart Association. Circulation. 2017;135(17):e927-e999. doi:10.1161/CIR.0000000000000484
- Jone PN, Tremoulet A, Choueiter N, et al. Update on diagnosis and management of Kawasaki disease: a scientific statement from the American Heart Association. Circulation. 2024;150(23):e481-e500. doi:10.1161/CIR.0000000000001295
- 中华医学会儿科学分会心血管学组, 中华医学会儿科学分会风湿学组, 中华医学会儿科学分会免疫学组, 等. 川崎病诊断和急性期治疗专家共识. 中华儿科杂志. 2022;60(1):6-13. doi:10.3760/cma.j.cn112140-20211018-00879
- 陕西省川崎病诊疗中心/陕西省人民医院儿童病院, 国家儿童医学中心/首都医科大学附属北京儿童医院, 上海交通大学医学院附属儿童医院, 等. 中国儿童川崎病诊疗循证指南（2023年）. 中国当代儿科杂志. 2023;25(12):1198-1210. doi:10.7499/j.issn.1008-8830.2309038
- Shah SS, Ebberson J, Kestenbaum LA, Hodinka RL, Zorc JJ. Age-specific reference values for cerebrospinal fluid protein concentration in neonates and young infants. J Hosp Med. 2011;6(1):22-27. doi:10.1002/jhm.711

How the DOIs were checked (2026-10-28; doi.org, Crossref, PubMed and
rs.yiigle.com are not reachable from this environment): the source DOI is
printed in the PDF and the export record; AHA 2017 and AHA 2024 on the
publisher's pages (ahajournals.org; the AHA "Top Things to Know" page shows a
different DOI, …0001265, but the article page and its correction notices use
…0001295); Shah 2011 on the publisher's page (Wiley, J Hosp Med); the 2022
Chinese consensus from the NLM record (PMID 34986616) as mirrored by library
catalogues; the 2023 Chinese guideline on the journal's own site
(zgddek.com).

### To verify

- AHA 2017 wording of the vaccine advice (measles and varicella deferred 11
  months after IVIG; annual inactivated influenza vaccine on long-term
  aspirin) and of the ibuprofen–aspirin interaction: confirmed only through
  secondary summaries.
- AHA 2024: the exact high-risk wording (sources give "≤ 6 months" and
  "< 6 months"), Table 2 risk levels and both corrections
  (doi:10.1161/CIR.0000000000001313, February 2025; doi:10.1161/CIR.0000000000001324,
  April 2025 — the second was not read).
- The Chinese 2022 consensus and 2023 guideline aspirin wording (read through
  secondary reproductions); the 2023 guideline's author list (institutions
  only were confirmed).
- Not cited, bibliographic data unconfirmed: 川崎病冠状动脉病变的临床处理建议
  （2020年修订版）（中华儿科杂志 2020;58(9 or 10):718-724）; 阿司匹林在川崎病治疗中的儿科
  专家共识（中国当代儿科杂志 2022;24(6):597-603, doi:10.7499/j.issn.1008-8830.2203190 —
  bibliography confirmed, content not read).
- A coronary Z-score range for an assumed length (50–58 cm): for a paediatric
  cardiologist; the case states none.
- Teaching dose texts that the report does not give: mannitol 0.25–1 g/kg,
  the IVIG infusion time of 10–12 hours, enoxaparin by anti-Xa.

## Changelog

### 1.1.0 — 2026-10-28 (editorial revision)

- **Clinical content.** The management decision now teaches IVIG 2 g/kg as a
  single infusion after day 10 (AHA 2017), high-risk intensification (AHA
  2024) and antithrombotic therapy by Z-score, instead of "assess
  immunotherapy, plan antiplatelets" (audit A1). The CSF is no longer taught
  as meningitis: the authors' diagnosis is kept as a labelled option and
  explained against Shah 2011 (A2). Absolute coronary grading is flagged
  wherever coronary size is used (A3).
- **Source facts restored.** The historical regimen with derived mg/kg (IVIG
  7.5 g ≈ 1.7 g/kg; aspirin 100 mg twice daily ≈ 47 mg/kg/day; 50 mg twice
  daily at discharge; 100 mg twice daily at 2 months; 100 mg three times daily
  from 2 years 11 months), mannitol labelled as the authors' historical step
  (A4); the ECG (B1); the follow-up platelets, RCA 3.9 mm, height and weight,
  pre-discharge blood count (B2); the clinic's admitting impression in the
  triage note (B3); "and other treatment" (B4); units on the bilirubin and
  structured values on every lab (C3).
- **Structure.** Four one-way phases (admission → work-up → before discharge →
  follow-up) so decisions are tested in time; 4 decisions × 3–4 options with
  option-specific feedback, including the report's own choices as
  distractors; the distractor that cited unseen doses is gone (C1, C2, E2);
  13 interventions (E4); 11-item rubric with two safety items (E3); 6
  objectives; 5 learning outcomes (E1); 6 teaching points and 5 key-reasoning
  points.
- **Voice and register.** Pseudonym 朵朵 / Duoduo (小宁 / Ning was shared with
  another case); the parent speaks in lay first person; persona fields brief
  an actor; `fallbackUnknown` and unknown answers in the library voice; adult
  template questions (occupation, self-care, smoking, prenatal alcohol)
  replaced by infant-relevant unknowns (D1–D5); keywords rewritten (≥ 4 per
  locale, no run-together junk) and 39 paraphrased test utterances (C5).
- **Library text.** Spoiler-free summary and a separate triage handover (F1);
  title "34-day-old girl" (D4).
- **Investigations.** Tests done in this admission keep their devices (CSF is
  a lumbar puncture, `risk: moderate`); the inpatient course and follow-up are
  record reviews; `other-tests` split into chemistry, ECG, chest radiograph and
  abdominal ultrasound; urinalysis added as not recorded (F4, C4).
- **References and governance.** Vancouver strings with the source URL;
  AHA 2017, the 2022 and 2023 Chinese guidance and Shah 2011 added (F2);
  `provenance.review` (editorial, AI-assisted, not clinician-reviewed);
  version 1.0.0 → 1.1.0; this README (F3).

### 1.0.0

- PR #3 first release: 3 phases, 2 binary decisions, 4 rubric items, no
  interventions, learning outcomes or teaching points.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-51617/case.json
npm run -s cc -- cases verify cmcr-51617
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-51617
npm run -s cc -- exec --case cmcr-51617 --autopilot --approval bypass --provider offline --output-format json
npm run -s cc -- exec --case cmcr-51617 --autopilot --approval bypass --provider offline --output-format json --embodied
```

## 中文摘要

**病例概要。** 34日龄女婴，体重4.3 kg，生后第24天起发热，入院时已发热10天（最高38.9 ℃），外院静滴阿莫西林2天、头孢吡肟3天等无效，精神饮食差、嗜睡、稍咳。病初有过双眼红、口唇红，已消退；无皮疹及颈部淋巴结肿大。查体前囟平、张力较高，颈抵抗可疑。血红蛋白118 g/L，白细胞14.9×10⁹/L，血小板822×10⁹/L，CRP>200 mg/L；脑脊液蛋白0.49 g/L，糖、氯化物、细胞数正常，血及脑脊液培养阴性；超声心动图左冠3.0 mm、右冠3.1–4.7 mm，内膜毛糙，动脉导管未闭。原报告诊断不完全川崎病并发无菌性脑膜炎，给予甘露醇、IVIG 7.5 g（约1.7 g/kg）及阿司匹林100 mg每日2次（约47 mg/kg/日），2天退热；随访至3岁3个月，左冠恢复正常，右冠仍3.4 mm。

**学习目标。**

1. 识别≤6月龄婴儿不明原因发热≥7天伴炎症指标升高时须评估不完全川崎病（含超声心动图）。
2. 追问已消退的早期黏膜表现，并逐项判断AHA 2017补充实验室标准。
3. 说明绝对内径会低估婴儿冠脉病变，先测身长、算Z值，再按危险分层制定抗栓方案。
4. 发病10天后确诊而炎症持续时仍给予IVIG 2 g/kg单次输注，识别<6月龄等高危特征并考虑强化初始治疗。
5. 按日龄参考值解读脑脊液，区分原作者诊断与病历实际证据，并对比历史剂量与现行推荐。

**关键决策。**

- 下一步：同时评估严重细菌感染与不完全川崎病，尽快做超声心动图（干扰项：只升级抗生素、先按脑膜炎降颅压、因眼红唇红已消退而排除川崎病）。
- 诊断：不完全川崎病伴冠脉扩张；脑脊液在该日龄正常范围内（干扰项包括原报告的“并发无菌性脑膜炎”）。
- 治疗：IVIG 2 g/kg单次加阿司匹林；高危，与儿童心脏科讨论强化治疗；按Z值定抗栓方案（干扰项：“已过第10天”、按毫米分级、先复查腰穿）。
- 出院：小剂量阿司匹林3–5 mg/kg/日，按Z值决定是否抗凝，早期复查超声；流感疫苗、避免布洛芬、瑞氏综合征防护，IVIG后11个月内暂缓麻疹、水痘疫苗（干扰项包括原报告的50 mg每日2次长期方案）。

**复盘要点。**

- 小婴儿川崎病常常不典型，主要表现可能一过性，病史中出现过就算数。
- 补充标准只满足1项时，由超声心动图决定；冠脉须按体表面积校正的Z值分级。
- 0.49 g/L的脑脊液蛋白在34日龄属正常，细胞数也正常——病历本身未证明脑膜炎；无颅内压增高证据时不用甘露醇。
- 原报告的IVIG用量和阿司匹林剂量是当年的做法，与现行推荐不同，复盘时逐项对比。
- 本病例经人工智能辅助编辑审核，尚未经执业医师审核；用于教学前请由儿童心脏科医生审核。
