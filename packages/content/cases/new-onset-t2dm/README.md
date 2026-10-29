# new-onset-t2dm — Tiredness and thirst · 48-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners
> should open the case from the case library, where the title, summary, chief
> complaint and tags give nothing away.

**Synthetic case.** This is a fictional teaching case. The patient (赵立新 /
Zhao Lixin, a pseudonym), his family, his employer and every clinical value
are invented. Nothing is based on a real patient. The case is not medical
advice (`disclaimer`: 虚构教学病例，不构成医疗建议。/ Fictional teaching case —
not medical advice.).

## Case card

| | |
|---|---|
| id / version | `new-onset-t2dm` / `1.1.1` |
| setting / facility | `outpatient` / `general-hospital` (outpatient consulting room) |
| specialty | endocrinology, general practice, internal medicine |
| difficulty | 3 / 5 |
| estimated time | about 40 min (static clock: two visits, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have an endocrinologist or GP review it before teaching use |
| phases | `initial` (初诊 / First visit, Tuesday 08:40, fasting) → `review` (3个月复诊 / Three-month review, week 13), entered automatically once objectives 1–5 are complete and the review has been arranged (`iv-follow-up`); neither is learner-switchable |
| content | 42 history items (3 `unknown`, 2 `specific`, 2 `volunteer` — one per phase, 10 required, 7 review-only) · 20 exam findings (6 required) · 18 investigations (8 essential, 2 low-value) · 18 interventions (6 wrong or low-value choices) · 6 objectives · 4 decisions · 15 rubric items (12 deterministic, 3 examiner-judged) · 6 NPCs · 6 learning outcomes · 72 test utterances |

## Learning outcomes

After the case the learner can:

1. Diagnose type 2 diabetes from two concordant abnormal results on the same
   fasting sample (FPG ≥ 7.0 mmol/L and HbA1c ≥ 6.5%) without an OGTT or a
   capillary meter, and exclude a hyperglycaemic emergency with ketones, the
   anion gap and osmolality.
2. Complete the baseline complication and risk assessment at diagnosis: BMI and
   waist, standardised BP, a full foot examination, lipids, eGFR, UACR, liver
   tests with FIB-4, and a referral for formal retinal screening.
3. Start lifestyle therapy with DSMES and metformin titrated weekly from
   500 mg/day after checking the eGFR, and justify why insulin and a
   sulfonylurea are not indicated (ADA and Chinese thresholds, hypoglycaemia
   risk for a driver).
4. Treat cardiorenal risk from the first visit — a high-intensity statin, an ACE
   inhibitor for hypertension with albuminuria (potassium and creatinine at
   1–2 weeks) and pharmacological smoking cessation — with no routine aspirin or
   coronary screening.
5. Confirm persistent albuminuria from two raised UACRs at least 3 months
   apart, then add an SGLT2 inhibitor and up-titrate the ACE inhibitor
   regardless of the HbA1c.
6. Use shared decision-making and teach-back to address his fears about insulin
   and driving, and agree specific behaviour-change goals with him.

These are the case's `learningOutcomes` (case card and debrief); the six HUD
`objectives` below are the in-game task list.

## Clinical summary

**First visit.** A 48-year-old regional sales coordinator at a logistics
company (mostly office-based) has had about 3 months of tiredness (worst in the
afternoons), a dry mouth, thirst (3–4 L/day, much of it iced tea and cola),
polyuria with nocturia 2–3 times a night, and about 3 kg of weight loss he was
not trying for (92 → 89 kg). He has no nausea, vomiting, abdominal pain,
breathlessness or confusion. In the past few weeks his screen has gone blurry in
the afternoons. Last month he had a boil. Asked directly, he admits a month of
genital itching and occasional erectile difficulty. Last year's work check-up
found a fasting glucose of "six-point-something" and a BP of 146/92 mmHg; he
followed up neither. Two years ago an ultrasound showed fatty liver.

He takes no regular medicines; he occasionally buys ibuprofen for knee pain.
He has never had steroids and has no known allergies. He has smoked about 20 a
day for 25 years (25 pack-years) and drinks beer at business dinners once or
twice a week (about 47 g of alcohol per occasion, well under the MetALD
threshold). He skips breakfast, eats takeaway lunches and large dinners, and
walks about 3,000 steps a day. His father developed type 2 diabetes at 55, was
on insulin for over ten years, once collapsed from hypoglycaemia, and had a
stroke at 68. His mother has hypertension and his brother has type 2 diabetes.
He lives with his supportive wife (a teacher) and their 16-year-old daughter,
and has employee medical insurance. Two or three days a week he drives the
company car to see clients.

**ICE.** *Ideas*: "internal heat", or maybe diabetes like his father.
*Concerns*: having to inject insulin, and losing his job if he cannot drive.
*Expectations*: a clear answer, tablets rather than injections, and practical
advice for business dinners.

**Examination.** BMI 30.1 kg/m² (172 cm, 89.0 kg), waist 104 cm. BP 144/90 and
140/86 mmHg, mean 142/88 (MAP 106), taken with a large cuff after 5 minutes'
rest; pulse 78/min, regular. He has acanthosis nigricans of the neck and
axillae with skin tags, slightly dry mucosae, and no Kussmaul breathing or
ketotic odour. There are no Cushingoid features, the thyroid is normal, and the
heart, carotids, chest and abdomen are unremarkable. Feet: the skin is intact,
with interdigital tinea and a little callus. Monofilament, vibration sense and
ankle reflexes are normal, and the dorsalis pedis and posterior tibial pulses
are palpable. Bedside undilated ophthalmoscopy gives only a limited view and
cannot exclude retinopathy. Visual acuity is 6/6 in each eye. Genital
examination (with consent and a chaperone) suggests candidal balanitis.

**First-visit results.**

| test | result |
|---|---|
| FPG (venous, same sample as HbA1c) | **9.8 mmol/L** (177 mg/dL) |
| HbA1c | **8.6 % (70 mmol/mol)**, eAG 11.1 mmol/L; NGSP-certified HPLC, no variant |
| capillary glucose / β-hydroxybutyrate | 10.4 / 0.2 mmol/L (meter, not diagnostic) |
| urinalysis | glucose 3+, **ketones negative**, protein negative, SG 1.020 |
| electrolytes, renal | Na 139, K 4.3, Cl 102, HCO₃⁻ 25 → anion gap 12; urea 5.6; creatinine 82 µmol/L → eGFR 102 (CKD-EPI 2021); uric acid 452 µmol/L |
| UACR | **5.2 mg/mmol** (46 mg/g), A2, one sample only |
| lipids | TC 6.0, TG 2.6, HDL-C 0.92, **LDL-C 3.9** (Friedewald 6.0 − 0.92 − 2.6/2.2 = 3.90), non-HDL-C 5.1 mmol/L |
| liver | ALT 68, AST 41, GGT 72 U/L; albumin 45 g/L; ultrasound shows moderate steatosis; **FIB-4 0.97** (low risk) |
| CBC | Hb 156 g/L, platelets 246 ×10⁹/L (nothing to distort the HbA1c) |
| ECG | sinus rhythm 78/min, no LVH, no Q waves, no ST–T change |
| hepatitis serology | HBsAg, anti-HBc and anti-HCV negative; anti-HBs < 10 mIU/mL, so **not immune** and should be vaccinated |
| C-peptide / GADA (neutral) | 1.12 nmol/L / negative |
| TSH, ABI (neutral) | normal |
| OGTT, coronary CTA/stress test (low value) | not performed. The result text explains why |
| retinal screening | referral made and photography booked for week 6. **No result at this visit.** |

**Diagnosis.** New-onset type 2 diabetes, with obesity, hypertension,
albuminuria still to be confirmed, atherogenic dyslipidaemia, MASLD and
hyperuricaemia. There is no hyperglycaemic emergency: ketones are negative,
the anion gap is 12 and calculated osmolality is 2 × 139 + 9.8 + 5.6 ≈ 293
mOsm/kg.

**Reference plan.** Medical nutrition therapy and DSMES (aim for ≥ 5 % weight
loss); metformin titrated from 500 mg/day to 1000 mg twice daily over 4 weeks
(after checking the eGFR); atorvastatin 40 mg; perindopril 4 mg with potassium
and creatinine checked at 2 weeks; varenicline plus the stop-smoking clinic;
home BP monitoring; hepatitis B vaccination; topical clotrimazole; retinal
screening; and a three-month review with fasting bloods and a repeat UACR the
week before, plus safety-netting (vomiting, abdominal pain, drowsiness, fast
breathing or worsening thirst → come back sooner).

**Three-month review (week 13).** He has lost 3.0 kg (86.0 kg, BMI 29.1, waist
101 cm). BP is 128/79 mmHg (home average 124/77). The metformin GI upset
settled after he took it with food. He has had no hypoglycaemia, no ACE
inhibitor cough and no myalgia. He misses 2–3 evening metformin doses a month
after business dinners. He has stopped sugary drinks, walks after dinner and
has been smoke-free for 9 weeks (one slip). Results: HbA1c **7.1 % (54
mmol/mol)**, FPG 7.3, LDL-C **1.7** (−56 %), TG 1.6, HDL-C 1.02. Creatinine is
85 µmol/L (+4 %), eGFR 97, K 4.6; the 2-week check showed K 4.4 and creatinine
84. ALT is 46. Retinal photographs show no retinopathy. **UACR is 3.9 mg/mmol
(34 mg/g).** Two raised samples 13 weeks apart, the second taken on an ACE
inhibitor with better glucose and BP, make this **persistent albuminuria: CKD
G1A2**. Next steps: add dapagliflozin 10 mg (KDIGO 2022 and ADA recommend it
regardless of HbA1c), titrate perindopril to 8 mg, and continue metformin and
atorvastatin.

## Scenario timeline and physiology

- **Static clock, two one-way phases.** Both phases are fixed records. The
  review phase is what happened after the reference plan was followed and
  does not change with the learner's first-visit actions; the phase
  descriptions say so. Neither phase is learner-switchable: `review` has
  `enterWhen` = flag `review-booked` (set by `iv-follow-up`) **and**
  objectives 1–5 complete. This stops a learner from opening the review
  early, where the adherence answer and the repeat results would give away
  the first-visit plan, and it guarantees every first-visit-only item
  (`phases: ["initial"]`) is still reachable while it is needed. Arranging
  the review early is harmless: the transition waits for the last first-visit
  objective. First-visit results stay readable from the review (orders keep
  their phase). Time-specific history and exam items carry `phases`.
- **Vitals follow the phase.** `physiology.baseline` holds the first-visit
  vitals (BP 142/88, HR 78), and `noise` is 0 so the panel matches the exam
  text exactly. Because the phases are one-way, a single scenario event
  (`ev-vitals-review`, `when: {phase: review}`) switches the panel to the
  review values (128/79, HR 74). The exam items `ex-bp` and `ex-bp-review`
  remain the authoritative per-phase readings.
- **Interventions have no vital effects.** This is outpatient management. The
  BP improvement is part of the fixed review record.
- **A silent safety event.** `ev-rx-before-egfr` sets the flag
  `rx-before-egfr` when metformin, the ACE inhibitor or the SGLT2 inhibitor is
  started before the renal function has been read; it fails `r-safety`.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | Explore the symptoms, risk factors and the patient's perspective | polyuria, polydipsia, weight loss, emergency red flags, family history, smoking, ICE concerns asked |
| 2 | Focused physical examination | anthropometry, BP, skin of neck and axillae, foot inspection, monofilament, foot pulses |
| 3 | Interpret the key tests and make the diagnosis | FPG + HbA1c + (urinalysis or POC ketones) read, `dec-diagnosis` |
| 4 | Assess complications and cardiovascular risk | lipids, renal, UACR, LFT read; retinal screening ordered |
| 5 | Agree an initial plan with the patient | `dec-first-line`, `dec-cv-risk`; lifestyle/DSMES, metformin (titrated), statin, ACE inhibitor, smoking cessation |
| 6 | Three-month review | review arranged (`iv-follow-up`; the phase then opens automatically); review HbA1c, UACR, renal, lipids read; adherence asked; `dec-review`; SGLT2 inhibitor |

### Decisions

- `dec-diagnosis` (single): what the two-abnormal-results rule means when both
  results come from the same sample. The distractors are OGTT, a repeat
  HbA1c, prediabetes and "type 1/LADA → insulin".
- `dec-first-line` (single): lifestyle + DSMES + titrated metformin. The
  distractors are insulin, a sulfonylurea, lifestyle alone, full-dose
  metformin, and GLP-1 RA instead of metformin. The GLP-1 RA feedback explains
  why it is "not the best" rather than wrong, and the correct-answer feedback
  acknowledges ADA's option of initial combination therapy.
- `dec-cv-risk` (select all): statin, ACE inhibitor, smoking cessation and a
  repeat UACR are correct. Routine aspirin, coronary screening, dual RAS
  blockade and "LDL < 4.9, so no statin" are wrong.
- `dec-review` (select all): add an SGLT2 inhibitor, continue metformin,
  maximise the ACE inhibitor and continue the statin are correct. Insulin,
  switching to a sulfonylurea, stopping the ACE inhibitor for a 4 % creatinine
  rise and stopping the statin "to protect his liver" are wrong (the option does
  not quote his first-visit ALT or the fatty liver, which this decision does
  not require the learner to have read).

Decision `requires` use first-visit (`phase: initial`) results only. The
objective hints coach with questions ("How many abnormal results does the
diagnosis need — and does it matter that they come from the same sample?",
"which first-line drug suits him, what must you check before prescribing
it?") rather than naming the answers.

### Rubric (deterministic items, total weight 22)

| id | domain | weight | met when |
|---|---|---:|---|
| `r-hx-symptoms` | history | 2 | polyuria, polydipsia, weight loss, emergency red flags asked |
| `r-hx-risk` | history | 1 | medicines, family history, smoking, alcohol, diet, exercise |
| `r-ex-foot` | examination | 2 | inspection, monofilament, vibration or ankle reflexes, pulses |
| `r-ex-metabolic` | examination | 1 | anthropometry, BP, acanthosis |
| `r-inv-dx` | investigations | 2 | FPG, HbA1c and ketones (urine or POC) read |
| `r-inv-baseline` | investigations | 2 | lipids, renal, UACR, LFT read; retinal screening ordered |
| `r-dx` | diagnosis | 2 | `dec-diagnosis` right first time |
| `r-mgmt-glycaemic` | management | 2 | `dec-first-line` right first time; lifestyle and titrated metformin |
| `r-mgmt-cvr` | management | 2 | statin, ACE inhibitor, smoking cessation |
| `r-safety` | safety | **3** | no insulin, sulfonylurea or "lifestyle only", and no renally dosed drug before the eGFR was read — scored once the first-line decision is reached, metformin is started or one of these is prescribed |
| `r-efficiency` | efficiency | 1 | no OGTT, no coronary CTA or stress test — scored once the diagnosis decision is reached or one of them is ordered |
| `r-review` | management | 2 | `dec-review` answered and SGLT2 inhibitor added |

Three examiner-judged communication items: shared decision-making about
insulin and driving (`r-comm-sdm`); teach-back of the metformin titration,
sick-day rules, the ACE-inhibitor blood test and the quit plan
(`r-comm-teachback`); ICE and motivational interviewing (`r-comm-ice`).

### How wrong choices score

The percentage comes from the weighted deterministic rubric; contraindicated
prescriptions are also listed as safety events in the debrief. `r-dx` and
`r-mgmt-glycaemic` use `decidedFirstTry`, so guessing through the options
costs marks.

- Basal insulin and "lifestyle only, recheck in 6–12 months" are always
  `contraindicated`.
- A sulfonylurea is `contraindicated` unless metformin has been started; as
  an add-on it is `neutral` but still fails `r-safety`.
- Metformin, the ACE inhibitor and the SGLT2 inhibitor are `contraindicated`
  until renal function has been read, which teaches "check the eGFR and
  baseline K/creatinine first"; `ev-rx-before-egfr` also fails `r-safety`.
  Up-titrating perindopril is `contraindicated` until review renal function has
  been read.
- Full-dose metformin from day 1, GLP-1 RA, aspirin and fenofibrate are
  `neutral`. Their response text explains why they are second-best or not
  indicated.
- An SGLT2 inhibitor is `neutral` at the first visit once renal function has
  been read (reasonable but not yet indicated; he also has active candidal
  balanitis) and `indicated` at review once the repeat UACR has been read.

## Reference path (`solution`)

87 steps, static clock:

1. **First-visit history** (22 questions): the presenting complaint, polyuria,
   polydipsia, weight loss, emergency red flags, vision, the targeted genital
   question, weight-loss red flags, PMH, previous glucose and BP, medicines,
   allergies, family history, smoking, alcohol, diet, exercise, occupation and
   ICE.
2. **Examination** (10): general, anthropometry, BP, acanthosis, foot
   inspection, monofilament, vibration, pulses, fundoscopy, genitalia (with
   consent and a chaperone).
3. **Diagnosis:** FPG, HbA1c and urinalysis read; `dec-diagnosis`.
4. **Work-up:** lipids, renal, UACR, LFT and hepatitis serology read; retinal
   screening ordered.
5. **Plan:** `dec-first-line`, `dec-cv-risk`; lifestyle/DSMES, metformin,
   atorvastatin, perindopril, varenicline, home BP, hepatitis B vaccine,
   antifungal; review arranged (`iv-follow-up`) → `review` phase.
6. **Review:** symptoms, adherence, side effects, lifestyle, smoking and
   concerns asked; weight and BP re-measured; HbA1c, lipids, renal, UACR, LFT
   and retinal photographs read; `dec-review`; dapagliflozin; perindopril 8 mg.

`cases verify` passes; the deterministic rubric scores 22/22 with all four
decisions right first time and no contraindicated interventions.

## Clinical numbers check

`extensions.clinicalScores` records every derived value with its formula:

- BMI 89.0/1.72² = 30.08 → 86.0/1.72² = 29.07 (−3.0 kg, −3.4 %).
- MAP 88 + 54/3 = 106 → 79 + 49/3 = 95.
- Anion gap 139 − (102 + 25) = 12 → 140 − (103 + 24) = 13.
- Calculated osmolality 2 × 139 + 9.8 + 5.6 = 293.4 mOsm/kg.
- Corrected Na (glucose 176.6 mg/dL): Katz 140.2, Hillier 140.8.
- CKD-EPI 2021 eGFR (male, 48 y): creatinine 82 / 84 / 85 µmol/L →
  101.6 / 98.7 / 97.3; creatinine rise +3.7 %.
- HbA1c IFCC = (NGSP − 2.15) × 10.929: 8.6 % → 70, 7.1 % → 54 mmol/mol;
  eAG = 1.59 × HbA1c − 2.59: 11.1 → 8.7 mmol/L.
- Friedewald LDL-C 6.0 − 0.92 − 1.18 = 3.90 → 3.4 − 1.02 − 0.73 = 1.65 (−56 %);
  non-HDL-C 5.1 → 2.4.
- UACR 38 mg/L ÷ 7.3 mmol/L = 5.21 mg/mmol (46 mg/g) → 31 ÷ 8.0 = 3.88
  (34 mg/g): A2 on two samples 13 weeks apart → CKD G1A2.
- FIB-4 (48 × 41) / (246 × √68) = 0.97 (< 1.3, low risk of advanced fibrosis).
- 25 pack-years; alcohol ≈ 47 g per beer occasion (3 × 500 mL at ~4 %),
  100 mL baijiu at 52 % ≈ 41 g, ≈ 47–135 g/week — below the MetALD threshold
  for men (210 g/week).
- STOP-Bang ≥ 4 (snoring, tiredness, pressure, male; neck not measured).
- Early-insulin thresholds not met: HbA1c 8.6 % (< 10 % ADA; < 9.0 % Chinese),
  FPG 9.8 mmol/L (< 16.7 ADA; < 11.1 Chinese), no ketosis.
- ≥ 5 % weight-loss goal ≈ 4.5 kg (in the `iv-lifestyle` response only).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to give him this diagnosis? What did you
   notice when insulin came up?"
2. **Description.** "In two sentences: how did you make the diagnosis, and
   what did you start today?"
3. **Analysis.**
   - "Why were two abnormal results on the same sample enough — and when would
     you have repeated a test?"
   - "What made you decide he did not need insulin today? What would change
     your mind?"
   - "Which of his risks would you rank first for his heart and kidneys? Why a
     statin at an LDL-C of 3.9, and why an ACE inhibitor?"
   - "Why did you not act on the first UACR alone, and what changed at the
     review?"
   - "How did you answer his question about driving?"
   - "How did you check he had understood the metformin titration and the
     sick-day rules?"
4. **Summary.** "What will you do at every new diagnosis of type 2 diabetes,
   whatever the glucose?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Ordering an OGTT or repeating the HbA1c | the OGTT result is "not performed" with the laboratory's reason; `dx-ogtt` / `dx-repeat` feedback | `r-efficiency`, `r-dx` |
| Diagnosing from the meter | the POC result says meters are not diagnostic | — |
| Leading with insulin | contraindicated; he resists ("That's what made my dad collapse") | `r-safety` (weight 3), safety event |
| A sulfonylurea first | contraindicated before metformin; pharmacist's driving warning | `r-safety` |
| Prescribing before the eGFR | contraindicated; `ev-rx-before-egfr` | `r-safety` |
| Lifestyle only | contraindicated ("That's it? What about the thirst?") | `r-safety` |
| Full-dose metformin | neutral; pharmacist explains GI intolerance | `r-mgmt-glycaemic` (decision first try) |
| Routine aspirin or coronary screening | aspirin: the attending asks about bleeding risk; CTCA "not performed" | `dec-cv-risk`, `r-efficiency` |
| Missing the foot examination | objective 2 cannot complete | `r-ex-foot` |
| Bedside ophthalmoscopy as retinal screening | the finding says the view cannot exclude retinopathy | objective 4 |
| Acting on one UACR / missing persistence at review | `cv-repeat-uacr`, `dec-review` feedback | `r-review` |
| Stopping the ACE inhibitor for +4 % creatinine | `rv-stop-acei` feedback | `dec-review` |

### Teaching points for the debrief

1. **Diagnosis.** Two abnormal results confirm diabetes. They may come from the
   same sample (FPG + HbA1c). A repeat of the *same* test is needed only when
   just one result is abnormal (ADA; the Chinese guideline accepts a single
   diagnostic value when typical symptoms are present, so he qualifies either
   way). Capillary meters are never diagnostic. Check that nothing invalidates
   the HbA1c, such as anaemia, a haemoglobin variant, recent transfusion or
   pregnancy. Here the CBC is normal and the method shows no variant.
2. **Exclude a crisis before anything else.** Check ketones (urine or blood),
   the anion gap and calculated osmolality. Insulin at diagnosis needs an
   indication. ADA: consider early insulin with ongoing catabolism (weight
   loss), symptoms of hyperglycaemia, HbA1c > 10 % or glucose ≥ 16.7
   mmol/L, ketosis, or suspected type 1. Chinese guideline: short-term
   intensive insulin when HbA1c ≥ 9.0 % or FPG ≥ 11.1 mmol/L with marked
   symptoms. He has osmotic symptoms and slight weight loss, so insulin
   deserves consideration, but the weight loss is only ~3 % (still obese,
   good appetite), there is no ketosis and his levels are well below these
   thresholds, so oral therapy comes first, with reassessment if he responds
   poorly or becomes catabolic. Starting insulin anyway would confirm his worst
   fear, add hypoglycaemia risk to his driving job, and add weight.
3. **Metformin.** Start at 500 mg with a meal and step up weekly to 2000
   mg/day. Dose by eGFR (≥ 45 full dose; 30–44 maximum 1000 mg/day;
   contraindicated < 30). Teach sick-day rules (SADMANS). With long-term use,
   check vitamin B12.
4. **Treat cardiorenal risk, not just glucose.**
   - Hypertension is confirmed when BP is ≥ 130/80 on two occasions. With
     albuminuria, use an ACE inhibitor or ARB (never both), check K and
     creatinine at 1–2 weeks, and accept a creatinine rise of < 30 %.
   - Give a high-intensity statin. ADA aims for LDL-C < 1.8 mmol/L and a
     ≥ 50 % reduction; the Chinese lipid guideline (2023) starts at moderate
     intensity and adds ezetimibe to reach the target. MASLD with ALT < 3 × ULN
     is not a contraindication.
   - Offer smoking cessation with medication (WHO 2024: varenicline, NRT,
     bupropion or cytisine, with behavioural support).
   - Without ASCVD there is no routine aspirin and no coronary screening.
5. **Albuminuria must be confirmed.** You need 2 of 3 samples abnormal over 3–6
   months, persisting > 3 months. The first sample was taken with
   uncontrolled glucose and BP. Once albuminuria persists (CKD G1A2), add an
   SGLT2 inhibitor with proven kidney benefit (eGFR ≥ 20), regardless of
   HbA1c. GLP-1 RA is the alternative or addition when weight or ASCVD is the
   driver. Starting an SGLT2 inhibitor and up-titrating the ACE inhibitor
   1–2 weeks apart makes creatinine changes easier to interpret.
6. **Screen for complications from day one.**
   - Retina: formal photography or a dilated exam, not bedside ophthalmoscopy.
   - Feet (IWGDF risk 0 here, so annual review): inspection, 10 g
     monofilament at 4 sites, vibration or ankle reflexes, and pulses.
   - Kidneys: UACR plus eGFR.
   - Lipids.
   - Liver: FIB-4 first, then elastography if ≥ 1.3 (EASL–EASD–EASO 2024).
   - Vaccinations: hepatitis B for adults aged 19–59 with diabetes, plus
     influenza and pneumococcal.
   - Sleep apnoea (STOP-Bang is at least 4 here; neck circumference was not
     measured).
   - Mood and diabetes distress.
7. **Communication.**
   - Elicit ICE and answer the real fears. Metformin, SGLT2 inhibitors, GLP-1
     RAs, statins and ACE inhibitors do not cause hypoglycaemia, so driving is
     unaffected. A sulfonylurea or insulin would mean checking glucose before
     driving and following local licensing rules.
   - Hyperglycaemic blurred vision settles with control, so new glasses
     should wait.
   - Use teach-back rather than "do you understand?".
   - At review, answer "tablets for life?" honestly. Type 2 diabetes is
     progressive and most people need long-term therapy. Sustained weight loss
     can improve it and sometimes induce remission, but any change to
     medication must be supervised.

## Embodied mode

- **Grounding (docs/EMBODIED.md §6, CASE_AUTHORING §8).** `iv-home-bp` (home
  blood-pressure monitoring) is kind `other`: it is advice for home, not a
  bedside monitor (the kind default monitoring → `cardiac-monitor` would have
  demanded one in the consult room). There is no IV-access procedure in this
  outpatient case, so its blood tests (HbA1c, glucose, lipids…) are sampled
  and ordered at the patient's side; their results can be read at a records
  terminal, at the patient or at the laboratory workstation (the benchmark
  scenario `workflow-t2dm-hba1c-at-lab` does exactly this).
- **Prescribing needs no equipment.** Prescriptions and referrals use
  `requires: []` because they are written in the consulting room.
  Anthropometry also has `requires: []`: the nurse has already measured
  height and weight (triage note), and in `general-hospital` the only scale is
  in ED triage while the web client lets bedside examination use only
  capabilities in the patient's room. Ophthalmoscopy needs `otoscope`
  (personal kit). Retinal screening is a referral ordered at a records
  terminal (`requires: ["records"]`; an investigation with no `requires` cannot
  be ordered at any web workstation). Labs use the canonical laboratory
  capabilities.
- **Scope of practice and transport.** No intervention is authored with a
  `scope`, `destination` or `posture`: he sits in the consulting room for both
  visits and is never moved. No study in the reference path needs him at a
  fixed device; the low-value coronary CTA (`inv-ctca`, `requires: ["ct"]`,
  no result) would need him taken to CT in embodied mode.

## Fidelity limits

- The review is a fixed record of the standard plan having been followed; it
  does not change with the learner's first-visit choices.
- Interventions carry no physiological effect; the vitals change once, when
  the review opens.
- The case has no continuous glucose monitoring, sleep study, neck
  circumference, dental examination or formal depression/diabetes-distress
  questionnaire; driving-licence rules vary by jurisdiction and none are
  specified. Drug choices should also reflect local formularies and cost.

## Matcher notes

- **`excludeKeywords`** separate items that share keywords:
  - `hx-meds` vs allergy and side-effect questions
  - `hx-smoking` vs the review-phase `hx-rv-smoking`
  - `hx-living` vs family-history questions
  - `hx-family` and `hx-living` vs pet questions ("宠物", "pets")
  - `hx-polydipsia` vs alcohol and step-count questions; `hx-alcohol` vs water
  - `hx-thyroid-sx` vs night-sweat questions; `hx-pmh` vs family history
  - `hx-exercise` / `hx-rv-lifestyle` vs claudication and chest-pain questions
  - `hx-occupation` vs "work out"; `hx-diet` vs medicine questions
  - `hx-rv-adherence` vs side-effect, allergy and recreational-drug questions
  - `ex-bp` vs foot pulses; `ex-monofilament` vs `ex-vibration` (both ways)
  - `iv-acei` vs `iv-acei-uptitrate`; `iv-lifestyle-only` vs dietitian/DSMES referral
- Generic words were removed from the `specific` genital item (瘙痒, 霉菌, 下体 —
  "查一下体" contains 下体), so only a targeted question reveals it.
- `inv-urinalysis` has `alternativeTo: ["inv-poc"]`, because either test
  excludes ketosis.
- The corpus in `extensions.testUtterances` (72) passes the same check as the
  SMZL parity test: every expected id scores ≥ 0.55 and the top hit is
  expected. Two utterances (pets) correctly select nothing. Many are
  deliberately hard (colloquial Chinese such as 一晚上起来几回 / 三多一少 / 那方面,
  typos such as 糖尿并 and "nite", and abbreviations such as DKA, FHx, PMH,
  cigs, ED).
- **Dose and label texts are formulas, not his findings.** The lifestyle
  referral aims for ≥ 5 % weight loss (≈ 4.5 kg for him is in its `response`);
  basal insulin reads "10 units (or 0.1–0.2 U/kg/day)"; the antifungal is
  "Topical antifungal cream (clotrimazole 1%)", applied to the affected skin
  until 1–2 weeks after it clears, so neither the label nor the dose names the
  balanitis or tinea before he is examined. Urinalysis and hepatitis serology
  values are per-locale `LocalizedText` (阴性 / negative).

## References

- American Diabetes Association Professional Practice Committee. 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S27-S49. doi:10.2337/dc26-S002
- American Diabetes Association Professional Practice Committee. 9. Pharmacologic approaches to glycemic treatment: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S183-S215. doi:10.2337/dc26-S009
- American Diabetes Association Professional Practice Committee. 10. Cardiovascular disease and risk management: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S216-S245. doi:10.2337/dc26-S010
- American Diabetes Association Professional Practice Committee. 11. Chronic kidney disease and risk management: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S246-S260. doi:10.2337/dc26-S011
- 中华医学会糖尿病学分会. 中国糖尿病防治指南（2024版）. 中华糖尿病杂志. 2025;17(1):16-139.
- Davies MJ, Aroda VR, Collins BS, et al. Management of hyperglycemia in type 2 diabetes, 2022. A consensus report by the American Diabetes Association (ADA) and the European Association for the Study of Diabetes (EASD). Diabetes Care. 2022;45(11):2753-2786. doi:10.2337/dci22-0034
- Kidney Disease: Improving Global Outcomes (KDIGO) Diabetes Work Group. KDIGO 2022 clinical practice guideline for diabetes management in chronic kidney disease. Kidney Int. 2022;102(5S):S1-S127. doi:10.1016/j.kint.2022.06.008
- Kidney Disease: Improving Global Outcomes (KDIGO) CKD Work Group. KDIGO 2024 clinical practice guideline for the evaluation and management of chronic kidney disease. Kidney Int. 2024;105(4S):S117-S314. doi:10.1016/j.kint.2023.10.018
- 中国血脂管理指南修订联合专家委员会. 中国血脂管理指南（2023年）. 中华心血管病杂志. 2023;51(3):221-255.
- 中国高血压防治指南修订委员会, 高血压联盟（中国）, 中国医疗保健国际交流促进会高血压病学分会, 等. 中国高血压防治指南（2024年修订版）. 中华高血压杂志. 2024;32(7):603-700.
- Schaper NC, van Netten JJ, Apelqvist J, et al. Practical guidelines on the prevention and management of diabetes-related foot disease (IWGDF 2023 update). Diabetes Metab Res Rev. 2024;40(3):e3657. doi:10.1002/dmrr.3657
- European Association for the Study of the Liver (EASL), European Association for the Study of Diabetes (EASD), European Association for the Study of Obesity (EASO). EASL–EASD–EASO clinical practice guidelines on the management of metabolic dysfunction-associated steatotic liver disease (MASLD). J Hepatol. 2024;81(3):492-542. doi:10.1016/j.jhep.2024.04.031
- World Health Organization. WHO clinical treatment guideline for tobacco cessation in adults. Geneva: World Health Organization; 2024.

DOIs were checked on 2026-10-28 against the publisher or indexer record (title,
journal, year, volume and pages); none is given where that could not be done.
The Chinese guidelines carry no DOI: their volume and pages were confirmed
from the journal listings and citing articles, but no DOI could be confirmed
against a publisher record.

### To verify

- The Chinese-guideline statements (one diagnostic value suffices with typical
  symptoms; short-term intensive insulin at HbA1c ≥ 9.0 % or FPG ≥ 11.1 mmol/L
  with marked symptoms; prediabetes FPG 6.1–6.9 mmol/L; metformin first line)
  were written to 中国糖尿病防治指南（2024版）, whose full text was not accessed
  in this review.
- The 2026 Standards of Care were checked through the 2026 summary of revisions
  and published summaries of Sections 2, 9, 10 and 11, not line by line: the
  early-insulin thresholds, initial combination therapy at HbA1c 1.5–2.0 %
  above goal, statin intensity, aspirin for primary prevention, hepatitis B
  vaccination at 19–59 years and retinal rescreening every 1–2 years are as
  the case states them from the 2025 edition.
- The C-peptide/GADA result note cites the Chinese LADA expert consensus (2021),
  which is not in the reference list and was not checked.
- Terminology: the zh-CN text names MASLD 代谢相关脂肪性肝病 (the Chinese
  Medical Association's 2024 term); a reviewer may prefer
  代谢功能障碍相关脂肪性肝病 as the literal rendering of MASLD.

## Changelog

### 1.1.1 — 2026-10-28 (assessment integrity)

- **Avoided-harm items count only once the harm was possible** (`scoredWhen`):
  `r-safety` once the first-line decision is reached, metformin is started or
  one of its harms happens; `r-efficiency` once the diagnosis decision is
  reached or an OGTT or coronary CTA is ordered. Doing nothing scored 4/22
  (18 %) from these two items and now scores 0/18 (0 %); the reference path
  keeps 22/22, and insulin, a sulfonylurea, "lifestyle only" or metformin
  before the eGFR still cost `r-safety`.
- **Matcher corpus:** eight `extensions.testUtterances` that repeated their
  item's canonical question are now paraphrases (`cases validate --strict`);
  no history item, answer or keyword changed.

### 1.1.0 — 2026-10-28 (editorial review)

- **Clinical content:** no correction was needed — the diagnostic, therapeutic
  and monitoring statements agree with the guidance checked (see
  `provenance.review.guidelines`); the 2026 Standards of Care changes found
  (heart failure, MASH pharmacotherapy for high-risk MASLD, type 1 diabetes)
  do not affect this patient (FIB-4 0.97, no heart failure).
- **Hints coach, not answer.** Four objective hints gave decision answers away
  (`obj-diagnosis`: two tests on one sample count; `obj-plan`: lifestyle +
  DSMES + metformin, statin, ACE inhibitor/ARB, smoking cessation; `obj-workup`
  and `obj-review`: the repeat UACR and the persistence rule). They now ask
  the questions that lead there; the guidance (quest-card) texts are unchanged.
- **Rubric:** `r-safety` (no insulin, sulfonylurea or "lifestyle only"; no
  renally dosed drug before the eGFR) weight 2 → 3, so the safety item weighs
  most; the deterministic total is now 22.
- **References:** ADA Standards of Care 2025 → 2026, cited by section (2, 9, 10,
  11) with verified DOIs; DOIs added for the ADA/EASD 2022 consensus, KDIGO 2022
  and 2024, IWGDF 2023 and EASL–EASD–EASO 2024; volume and pages added for the
  Chinese diabetes (2024), lipid (2023) and hypertension (2024 revision)
  guidelines, with the hypertension guideline's issuing bodies; the IWGDF
  volume and issue completed; one Vancouver-style string each.
- **Governance:** `learningOutcomes` (6) and `provenance.review` (editorial,
  AI-assisted, not clinician-reviewed) added; `provenance.notes` records the
  2026 review; version 1.0.0 → 1.1.0.
- **README** restructured to the facilitator-guide template.

### 1.0.0

- First release. At authoring time the schema was valid, `checkCaseIntegrity`
  and `parseCase` warnings were empty, and `verifyCase` returned ok with a
  rubric score of 21/21 (100 %), all four decisions correct at the first
  attempt and no contraindicated interventions; the matcher corpus passed 56/56
  (recall@3 1.00 in both locales) and has since grown to 72 utterances.

## Validation

```bash
npm run cc -- cases validate packages/content/cases/new-onset-t2dm/case.json   # schema + integrity
npm run cc -- cases verify new-onset-t2dm                                      # replays `solution` + the utterance corpus
npm run cc -- play new-onset-t2dm --provider offline
npm run -s cc -- bench grounding --split dev --case new-onset-t2dm
```

## 中文摘要

**病例概要。** 48岁男性，物流公司区域销售协调员（大部分时间坐办公室，每周两三天开车拜访客户）。乏力、口干、多饮（每天3–4升，多为含糖饮料）、多尿伴夜尿2–3次约3个月，体重非刻意下降约3 kg；无恶心呕吐、腹痛、气促或意识改变。去年体检空腹血糖“6点几”、血压146/92 mmHg均未复查；吸烟25包年；父亲和哥哥有2型糖尿病。查体：BMI 30.1 kg/m²，腰围104 cm，血压142/88 mmHg，黑棘皮征，足部检查正常，趾间足癣，念珠菌性龟头炎。同一份空腹血样FPG 9.8 mmol/L、HbA1c 8.6%；尿酮阴性，阴离子间隙12，渗透压约293 mOsm/kg。诊断：新发2型糖尿病，伴肥胖、高血压、待确认的白蛋白尿（UACR 5.2 mg/mmol）、血脂异常（LDL-C 3.9 mmol/L）和脂肪肝（FIB-4 0.97），无高血糖危象。3个月复诊：HbA1c 7.1%，LDL-C 1.7 mmol/L，血压128/79 mmHg，UACR仍为3.9 mg/mmol——持续白蛋白尿（CKD G1A2）。

**学习目标。**

1. 依据同一份空腹血样两项一致的异常结果（FPG ≥ 7.0 mmol/L且HbA1c ≥ 6.5%）诊断2型糖尿病，不依赖OGTT或指尖血糖仪，并用酮体、阴离子间隙和渗透压排除高血糖危象。
2. 在诊断时完成基线并发症和危险评估：BMI和腰围、规范血压测量、完整足部检查、血脂、eGFR、UACR、肝功能与FIB-4，并转诊规范的视网膜筛查。
3. 核对eGFR后启动生活方式干预、DSMES和自500 mg/日起逐周加量的二甲双胍，并说明为何不需要胰岛素和磺脲类。
4. 从初诊起管理心肾风险：高强度他汀，高血压合并白蛋白尿时用ACEI（1–2周后查血钾和肌酐），药物辅助戒烟；不常规用阿司匹林、不做冠脉筛查。
5. 根据相隔 ≥ 3个月的两次UACR升高确认持续白蛋白尿，随后不论HbA1c如何，加用SGLT2抑制剂并将ACEI加至最大耐受剂量。
6. 运用共同决策和复述确认回应他对胰岛素和开车的担忧，并共同设定具体的行为改变目标。

**关键决策。**

- 诊断：同一份血样FPG和HbA1c两项达标即可确诊，无需OGTT或择日复查（中国指南：有典型症状者一项达标即可）。
- 初始降糖：生活方式+DSMES+逐步加量的二甲双胍；HbA1c 8.6%、FPG 9.8 mmol/L、无酮症，未达ADA（HbA1c > 10%或血糖 ≥ 16.7 mmol/L）或中国指南（HbA1c ≥ 9.0%或FPG ≥ 11.1 mmol/L伴明显症状）的胰岛素阈值；GLP-1受体激动剂“不是最佳”而非错误。
- 心肾风险（多选）：他汀、ACEI、戒烟、3–6个月内复查UACR；不常规用阿司匹林、不做冠脉筛查、不联用ACEI和ARB。
- 复诊调整（多选）：加用SGLT2抑制剂，继续二甲双胍和他汀，ACEI加至最大耐受剂量；肌酐升高4%不是停用ACEI的理由。

**复盘要点。**

- “两项异常结果”规则；指尖血糖仪不用于诊断；先排除高血糖危象。
- 胰岛素需要指征：没有指征时带来的是低血糖（危及驾驶工作）、体重增加和不必要的恐惧。
- 二甲双胍：先查eGFR、小剂量随餐起始、每周加量；病日规则；长期使用查维生素B12。
- 心肾保护与降糖同样重要；白蛋白尿需复查确认，确认后不论HbA1c都加用有证据的SGLT2抑制剂。
- 并发症筛查从诊断时开始：视网膜（规范照相）、足部、UACR+eGFR、血脂、肝脏（FIB-4）、疫苗、睡眠呼吸暂停、心理状态。
- 用复述确认理解，回应“要不要打针”“还能不能开车”“药是不是要吃一辈子”。
- 本病例经AI辅助编辑审校，尚未经执业临床医师审阅；用于教学前请由本专科医师审核。
