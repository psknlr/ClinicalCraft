# `new-onset-t2dm`: tiredness and thirst (48-year-old man)

> **Spoilers for case authors and faculty.** This file names the diagnosis.
> Learners should open the case from the case library, where the title,
> summary, chief complaint and tags give nothing away.

> **Synthetic case.** This is a fictional teaching case. The patient (赵立新 /
> Zhao Lixin, a pseudonym), his family, his employer and every clinical value
> are invented. Nothing is based on a real patient. The case is not medical
> advice (`disclaimer`: 虚构教学病例，不构成医疗建议。/ Fictional teaching case —
> not medical advice.).

| | |
|---|---|
| id / version | `new-onset-t2dm` / `1.0.0` |
| setting / facility | `outpatient` / `general-hospital` (outpatient consulting room) |
| locales | `zh-CN` (source language), `en` |
| clock | `static`. Two one-way phases, neither learner-switchable: `initial` (初诊 / First visit, Tuesday 08:40, fasting) → `review` (3个月复诊 / Three-month review, week 13), entered automatically once objectives 1–5 are complete and the review has been arranged (`iv-follow-up`) |
| difficulty / time | 3 / 5, about 40 min |
| content | 42 history items (3 `unknown`, 2 `specific`, 2 `volunteer` — one per phase, 10 required, 7 review-only) · 20 exam findings (6 required) · 18 investigations (8 essential, 2 low-value) · 18 interventions (6 wrong or low-value choices) · 6 objectives · 4 decisions · 15 rubric items (12 deterministic, 3 examiner-judged) · 6 NPCs · 56 test utterances |

## Clinical story

**First visit.** A 48-year-old regional sales coordinator at a logistics
company has had about 3 months of tiredness (worst in the afternoons), a dry
mouth, thirst (3–4 L/day, much of it iced tea and cola), polyuria with
nocturia 2–3 times a night, and about 3 kg of weight loss he was not trying for
(92 → 89 kg). He has no nausea, vomiting, abdominal pain, breathlessness or
confusion. In the past few weeks his screen has gone blurry in the afternoons.
Last month he had a boil. Asked directly, he admits a month of genital itching
and occasional erectile difficulty. Last year's work check-up found a fasting
glucose of "six-point-something" and a BP of 146/92 mmHg; he followed up
neither. Two years ago an ultrasound showed fatty liver.

He takes no regular medicines; he occasionally buys ibuprofen for knee pain.
He has never had steroids and has no known allergies. He has smoked about 20 a
day for 25 years (25 pack-years) and drinks beer at business dinners once or
twice a week (about 47 g of alcohol per occasion, well under the MetALD
threshold). He skips breakfast, eats takeaway lunches and large dinners, and
walks about 3,000 steps a day. His father developed type 2 diabetes at 55, was
on insulin for over ten years, once collapsed from hypoglycaemia, and had a
stroke at 68. His mother has hypertension and his brother has type 2 diabetes.
He lives with his supportive wife (a teacher) and their 16-year-old daughter,
and has employee medical insurance. Two or three days a week he drives the company car
to see clients.

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

## Learning design

| # | objective | completes when |
|---|---|---|
| 1 | Explore the symptoms, risk factors and the patient's perspective | polyuria, polydipsia, weight loss, emergency red flags, family history, smoking, ICE concerns asked |
| 2 | Focused physical examination | anthropometry, BP, skin of neck and axillae, foot inspection, monofilament, foot pulses |
| 3 | Interpret the key tests and make the diagnosis | FPG + HbA1c + (urinalysis or POC ketones) read, `dec-diagnosis` |
| 4 | Assess complications and cardiovascular risk | lipids, renal, UACR, LFT read; retinal screening ordered |
| 5 | Agree an initial plan with the patient | `dec-first-line`, `dec-cv-risk`; lifestyle/DSMES, metformin (titrated), statin, ACE inhibitor, smoking cessation |
| 6 | Three-month review | review arranged (`iv-follow-up`; the phase then opens automatically); review HbA1c, UACR, renal, lipids read; adherence asked; `dec-review`; SGLT2 inhibitor |

**Decisions.**
* `dec-diagnosis` (single): what the two-abnormal-results rule means when both
  results come from the same sample. The distractors are OGTT, a repeat
  HbA1c, prediabetes and "type 1/LADA → insulin".
* `dec-first-line` (single): lifestyle + DSMES + titrated metformin. The
  distractors are insulin, a sulfonylurea, lifestyle alone, full-dose
  metformin, and GLP-1 RA instead of metformin. The GLP-1 RA feedback explains
  why it is "not the best" rather than wrong, and the correct-answer feedback
  acknowledges ADA's option of initial combination therapy.
* `dec-cv-risk` (select all): statin, ACE inhibitor, smoking cessation and a
  repeat UACR are correct. Routine aspirin, coronary screening, dual RAS
  blockade and "LDL < 4.9, so no statin" are wrong.
* `dec-review` (select all): add an SGLT2 inhibitor, continue metformin,
  maximise the ACE inhibitor and continue the statin are correct. Insulin,
  switching to a sulfonylurea, stopping the ACE inhibitor for a 4 % creatinine
  rise and stopping the statin because of the old ALT are wrong.

**Tempting wrong interventions and their engine appropriateness.**
* Basal insulin and "lifestyle only, recheck in 6–12 months" are always
  `contraindicated`.
* A sulfonylurea is `contraindicated` unless metformin has been started; as
  an add-on it is `neutral` but still fails `r-safety`.
* Metformin, the ACE inhibitor and the SGLT2 inhibitor are `contraindicated`
  until renal function has been read, which teaches "check the eGFR and baseline K/creatinine
  first". A silent scenario event (`ev-rx-before-egfr`) also sets the flag
  `rx-before-egfr`, which fails `r-safety`. Up-titrating perindopril is `contraindicated` until review renal
  function has been read.
* Full-dose metformin from day 1, GLP-1 RA, aspirin and fenofibrate are
  `neutral`. Their response text explains why they are second-best or not
  indicated.
* An SGLT2 inhibitor is `neutral` at the first visit once renal function has
  been read (reasonable but not yet indicated; he also has active candidal
  balanitis) and `indicated` at review once the repeat UACR has been read.

**Rubric.** There are 21 deterministic points.
* `r-dx` uses `decidedFirstTry` on `dec-diagnosis`; `r-mgmt-glycaemic` uses
  `decidedFirstTry` on `dec-first-line` (so guessing through the options
  costs marks) plus the lifestyle and titrated-metformin prescriptions.
* `r-safety` checks that no insulin, sulfonylurea or "lifestyle only" was
  given and that no renally dosed drug was started before the renal function
  was read (`rx-before-egfr`).
* Decision `requires` use first-visit (`phase: initial`) results only.
* `r-efficiency` checks that no OGTT and no coronary CTA or stress test was ordered.

There are also three examiner-judged communication items:
* shared decision-making about insulin and driving
* teach-back of the metformin titration, sick-day rules, the ACE-inhibitor
  blood test and the quit plan
* ICE and motivational interviewing.

## Teaching notes

1. **Diagnosis.** Two abnormal results confirm diabetes. They may come from the
   same sample (FPG + HbA1c). A repeat of the *same* test is needed only when
   just one result is abnormal (ADA; the Chinese guideline accepts a single
   diagnostic value when typical symptoms are present, so he qualifies either
   way). Capillary meters are never diagnostic. Check
   that nothing invalidates the HbA1c, such as anaemia, a haemoglobin variant,
   recent transfusion or pregnancy. Here the CBC is normal and the method shows
   no variant.
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
   poorly or becomes catabolic. Starting insulin anyway would confirm his worst fear,
   add hypoglycaemia risk to his driving job, and add weight.
3. **Metformin.** Start at 500 mg with a meal and step up weekly to 2000
   mg/day. Dose by eGFR (≥ 45 full dose; 30–44 maximum 1000 mg/day;
   contraindicated < 30). Teach sick-day rules (SADMANS). With long-term use,
   check vitamin B12.
4. **Treat cardiorenal risk, not just glucose.**
   * Hypertension is confirmed when BP is ≥ 130/80 on two occasions. With
     albuminuria, use an ACE inhibitor or ARB (never both), check K and
     creatinine at 1–2 weeks, and accept a creatinine rise of < 30 %.
   * Give a high-intensity statin. ADA aims for LDL-C < 1.8 mmol/L and a
     ≥ 50 % reduction; Chinese guidance often starts at moderate intensity and
     adds ezetimibe to reach the target. MASLD with ALT < 3 × ULN is not a
     contraindication.
   * Offer smoking cessation with medication.
   * Without ASCVD there is no routine aspirin and no coronary screening.
5. **Albuminuria must be confirmed.** You need 2 of 3 samples abnormal over 3–6
   months, persisting > 3 months. The first sample was taken with
   uncontrolled glucose and BP. Once albuminuria persists (CKD G1A2), add an
   SGLT2 inhibitor with proven kidney benefit (eGFR ≥ 20), regardless of
   HbA1c. GLP-1 RA is the alternative or addition when weight or ASCVD is the
   driver. Starting an SGLT2 inhibitor and up-titrating the ACE inhibitor
   1–2 weeks apart makes creatinine changes easier to interpret.
6. **Screen for complications from day one.**
   * Retina: formal photography or a dilated exam, not bedside
     ophthalmoscopy.
   * Feet (IWGDF risk 0 here, so annual review): inspection, 10 g
     monofilament at 4 sites, vibration or ankle reflexes, and pulses.
   * Kidneys: UACR plus eGFR.
   * Lipids.
   * Liver: FIB-4 first, then elastography if ≥ 1.3.
   * Vaccinations: hepatitis B for adults aged 19–59 with diabetes, plus
     influenza and pneumococcal.
   * Sleep apnoea (STOP-Bang is at least 4 here; neck circumference was not
     measured).
   * Mood and diabetes distress.
7. **Communication.**
   * Elicit ICE and answer the real fears. Metformin, SGLT2 inhibitors, GLP-1
     RAs, statins and ACE inhibitors do not cause hypoglycaemia, so driving is
     unaffected. A sulfonylurea or insulin would mean checking glucose before
     driving and following local licensing rules.
   * Hyperglycaemic blurred vision settles with control, so new glasses
     should wait.
   * Use teach-back rather than "do you understand?".
   * At review, answer "tablets for life?" honestly. Type 2 diabetes is
     progressive and most people need long-term therapy. Sustained weight loss
     can improve it and sometimes induce remission, but any change to
     medication must be supervised.

## Implementation notes for authors

* **Static clock, two one-way phases.** Both phases are fixed records. The
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
* **Vitals follow the phase.** `physiology.baseline` holds the first-visit
  vitals (BP 142/88, HR 78), and `noise` is 0 so the panel matches the exam
  text exactly. Because the phases are one-way, a single scenario event
  (`ev-vitals-review`, `when: {phase: review}`) switches the panel to the
  review values (128/79, HR 74). The exam items `ex-bp` and `ex-bp-review`
  remain the authoritative per-phase readings.
* **Interventions have no vital effects.** This is outpatient management. The
  BP improvement is part of the fixed review record.
* **Matcher tuning.** `excludeKeywords` separate items that share keywords:
  * `hx-meds` vs allergy and side-effect questions
  * `hx-smoking` vs the review-phase `hx-rv-smoking`
  * `hx-living` vs family-history questions
  * `hx-family` and `hx-living` vs pet questions ("宠物", "pets")
  * `hx-polydipsia` vs alcohol and step-count questions; `hx-alcohol` vs water
  * `hx-thyroid-sx` vs night-sweat questions; `hx-pmh` vs family history
  * `hx-exercise` / `hx-rv-lifestyle` vs claudication and chest-pain questions
  * `hx-occupation` vs "work out"; `hx-diet` vs medicine questions
  * `hx-rv-adherence` vs side-effect, allergy and recreational-drug questions
  * `ex-bp` vs foot pulses; `ex-monofilament` vs `ex-vibration` (both ways)
  * `iv-acei` vs `iv-acei-uptitrate`; `iv-lifestyle-only` vs dietitian/DSMES referral

  Generic words were removed from the `specific` genital item (瘙痒, 霉菌, 下体 —
  "查一下体" contains 下体), so only a targeted question reveals it.

  `inv-urinalysis` has `alternativeTo: ["inv-poc"]`, because either test
  excludes ketosis. The corpus in `extensions.testUtterances` passes the
  same check as the SMZL parity test: every expected id scores ≥ 0.55 and
  the top hit is expected. Two utterances (pets) correctly select nothing.
  Sixteen of the 56 are deliberately hard (colloquial Chinese such as
  一晚上起来几回 / 三多一少 / 那方面, typos such as 糖尿并 and "nite", and
  abbreviations such as DKA, FHx, PMH, cigs, ED).
* **Prescribing needs no equipment.** Prescriptions and referrals use
  `requires: []` because they are written in the consulting room.
  Anthropometry also has `requires: []`: the nurse has already measured
  height and weight (triage note), and in `general-hospital` the only scale is
  in ED triage while the web client lets bedside examination use only
  capabilities in the patient's room. Ophthalmoscopy needs `otoscope`
  (personal kit). Retinal screening is a referral ordered at a records
  terminal (`requires: ["records"]`; an investigation with no `requires` cannot
  be ordered at any web workstation). Labs use the canonical laboratory
  capabilities.
* `extensions.clinicalScores` records every derived value with its formula:
  * BMI, MAP, anion gap, calculated osmolality and corrected Na
  * CKD-EPI 2021 eGFR (101.6 / 98.7 / 97.3)
  * HbA1c in IFCC units and eAG
  * Friedewald LDL-C, UACR in mg/g, FIB-4
  * pack-years, grams of alcohol, partial STOP-Bang.

## Guideline references

* American Diabetes Association Professional Practice Committee. Standards of Care in Diabetes—2025. *Diabetes Care* 2025;48(Suppl 1).
* 中华医学会糖尿病学分会. 中国糖尿病防治指南（2024版）. 中华糖尿病杂志, 2025.
* Davies MJ, et al. Management of hyperglycaemia in type 2 diabetes, 2022. ADA/EASD consensus report. *Diabetes Care* / *Diabetologia* 2022.
* KDIGO 2022 Clinical Practice Guideline for Diabetes Management in Chronic Kidney Disease. *Kidney International* 2022.
* KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease. *Kidney International* 2024.
* 中国血脂管理指南修订联合专家委员会. 中国血脂管理指南（2023年）. 中华心血管病杂志, 2023.
* 中国高血压防治指南修订委员会等. 中国高血压防治指南（2024年修订版）. 中华高血压杂志, 2024.
* IWGDF Guidelines on the prevention and management of diabetes-related foot disease, 2023 update.
* EASL–EASD–EASO Clinical Practice Guidelines on the management of MASLD. *Journal of Hepatology* 2024.
* WHO clinical treatment guideline for tobacco cessation in adults. Geneva: WHO, 2024.

## Validation

```bash
clinicalcraft cases validate packages/content/cases/new-onset-t2dm/case.json   # schema + integrity
clinicalcraft cases verify new-onset-t2dm                                      # replays `solution`
clinicalcraft play new-onset-t2dm --provider offline
```

At authoring time the schema was VALID, `checkCaseIntegrity` and
`parseCase` warnings were both empty, and `verifyCase` returned ok with a
rubric score of 21/21 (100 %), all four decisions correct at the first
attempt and no contraindicated interventions. The matcher corpus passed
56/56 (recall@3 1.00 in both locales).
