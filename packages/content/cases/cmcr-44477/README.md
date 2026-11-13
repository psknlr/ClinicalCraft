# cmcr-44477 — Years of thirst and heavy urination, now vomiting · 13-year-old boy

> Facilitator guide. Spoilers: the diagnosis, every result and the reported course follow. Version 1.1.0 is
> re-authored from the facts recorded in version 1.0.0; **they have not yet been checked against the full source
> article** (see "To verify").

## Case card

| Field | Value |
|---|---|
| Title | 多年多饮多尿，近3天呕吐 · 13岁男孩 / Years of thirst and heavy urination, now vomiting · 13-year-old boy |
| Patient | Yang Qinghe (pseudonym) / 杨清和（化名）, 13-year-old boy, 27 kg |
| Setting / facility | inpatient (children's ward; a high-dependency or ICU bed in the acute phase) / `general-hospital` |
| Difficulty / time | 4 of 5 / about 40 minutes |
| Specialties | paediatrics, endocrinology, neurology |
| Phases | 4 — admission → ward after the acute phase → further assessments → reported course |
| Content | 25 history items (8 required), 7 examination findings, 17 investigations, 17 interventions, 5 decisions, 12 rubric items (2 critical), 6 objectives, 4 staff |
| Languages | Simplified Chinese (source language) and English |
| Review status | `editorial` (2026-10-30): AI-assisted teaching design with an editorial review against the cited guidance; the patient facts are those of version 1.0.0 and have not yet been checked against the full article; not yet reviewed by a licensed clinician |
| Source | 林宏华, 华山, 吴成, 董扬, 刘光辉, 倪虹. Wolfram综合征一例. 中华儿科杂志. 2011;49(6):470-471. doi:10.3760/cma.j.issn.0578-1310.2011.06.017 |

## Learning outcomes

Shown before play only on request (they name the diagnosis); listed in every debrief.

1. Diagnose diabetic ketoacidosis from glucose, ketones and acid–base values and grade it by the worse of pH and
   bicarbonate (ISPAD 2022: severe if pH < 7.1 or bicarbonate < 5 mmol/L), working out the glucose-corrected sodium
   and the effective osmolality.
2. Start paediatric DKA treatment safely: 0.9% sodium chloride 10 mL/kg over 30 minutes, the remaining deficit plus
   maintenance over 48 hours with potassium chloride 40 mmol/L, and IV insulin 0.05–0.1 unit/kg/h from at least an
   hour after the fluids, with no bolus and no bicarbonate (NICE NG18 2020 update; BSPED 2021; ISPAD 2022).
3. Watch for cerebral oedema: name this patient's presenting risk factors (severe acidosis, possible hypocapnia),
   observe neurological status hourly, track the rise in sodium expected as the glucose falls, and keep mannitol or
   hypertonic saline calculated for his weight at the bedside (ISPAD 2022; Glaser 2001).
4. Recognise hypotonic polyuria that persists after glucose control, investigate it with paired plasma and urine
   osmolality and a supervised inpatient water-deprivation–desmopressin test, and never restrict water outside such
   a test (Patti 2022).
5. Make a clinical diagnosis of Wolfram syndrome from antibody-negative diabetes and optic atrophy before 16 years,
   with diabetes insipidus, sensorineural hearing loss and urinary tract dilatation, and complete the work-up with
   WFS1 testing and brain and pituitary MRI (GeneReviews WFS1 spectrum disorder, updated 2023; ISPAD 2022 monogenic
   diabetes).
6. Plan multidisciplinary care: bladder-emptying assessment and urology referral for hydronephrosis with voiding
   difficulty (EAU/ESPU 2020), free access to water with an emergency plan, insulin self-management education,
   ophthalmology, audiology, genetic counselling and psychological support (SID/SIEDP 2025).

## Clinical summary (spoilers)

A very thin 13-year-old boy (27 kg) has drunk about 4,200–6,000 mL a day, with a similar volume of clear urine and
occasional bedwetting, for seven years. Doctors had considered psychogenic polydipsia or diabetes insipidus; herbal
medicine and vasopressin, taken irregularly, did not help. He is admitted after three days of non-projectile vomiting
after meals, unable to eat and increasingly listless. He is alert but listless, very thin, with dry skin and
mucous membranes, poor turgor, deep long breathing and cool peripheries; heart rate 102/min, blood pressure
95/60 mmHg. Glucose 38.74 mmol/L, urine glucose ++++ and ketones ++, pH 7.21, bicarbonate 4.2 mmol/L, anion gap
35.6 mmol/L, sodium 116 mmol/L, potassium 4.0 mmol/L; GADA and IAA negative: **severe diabetic ketoacidosis** (graded
by the bicarbonate) with true hyponatraemia (corrected sodium about 128 mmol/L).

After emergency treatment his glucose settles, but he still drinks 4,700–5,800 mL a day with a urine specific
gravity of 1.000–1.005: a water diuresis. The further assessments record a poor response to vasopressin, optic
atrophy, high-frequency sensorineural hearing loss, bilateral hydronephrosis with ureteric dilatation, and voiding
difficulty. The report made a **clinical diagnosis of Wolfram syndrome** (diabetes mellitus, diabetes insipidus,
optic atrophy, deafness, urinary tract involvement); no genetic result is recorded and the mechanism of the diabetes
insipidus is not established by the recorded data. He was treated with insulin and hydrochlorothiazide, went home
after about two weeks and was stable at two follow-up visits within a year.

What the case teaches: a long-standing "drinks too much" label can hide diabetes; severe paediatric DKA is treated
with fluids before an insulin infusion, no bolus and no bicarbonate, with cerebral oedema in mind; dilute polyuria
after glucose control is a separate problem, tested only under supervision; antibody-negative diabetes with optic
atrophy before 16 is a syndromic, genetic diagnosis; and the dilated urinary tract with voiding difficulty needs a
bladder assessment now.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`), no physiology model: the values are the record's, and no treatment response is
simulated. Phases open by themselves; none can be selected before the case reaches it.

| Phase | Opens when | What is available (staged evidence) |
|---|---|---|
| `admission` — Admission: day 3 of vomiting | start | history (presenting, vomiting, energy, seven-year pattern, earlier labels and treatment, past head problems, birth and development, family, unknown items); examination (alertness and build, pulse and BP, hydration, breathing, perfusion, weight); glucose, urinalysis (glucose, ketones), blood gas, electrolytes, islet antibodies; blood ketones, renal function, HbA1c, osmolality and head CT have no result recorded |
| `ward` — Ward: after the acute phase (location: a ward bed) | decisions 1 and 2 answered **and** the saline bolus, the insulin infusion and the potassium-containing rehydration given | status twin ("better, but still thirsty"), voiding difficulty, fundoscopy (optic atrophy), intake chart (4,700–5,800 mL a day), urinalysis (specific gravity 1.000–1.005), islet antibodies; the vasopressin test and urinary imaging have no result at this stage |
| `assessment` — Further assessments | decisions 1–3 answered | vasopressin test ("poor response"), hearing report (high-frequency sensorineural loss), urinary tract imaging (bilateral hydronephrosis, ureteric dilatation); MRI and genetic testing have no result recorded |
| `followup` — Reported course and follow-up | all five decisions answered | the outcome record (diagnosis, insulin and hydrochlorothiazide, discharge at about two weeks, two stable visits within a year); follow-up status twin |

The ward phase waits for the three first-hours acts as well as the decisions, so the in-time critical item can only be
met in the admission phase and the "stabilised" ward state never appears before treatment has started. The order of the
ward and further-assessment results is teaching design: 1.0.0 records them all "after the glucose had settled", without
dates or sequence.

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-history` — Ask about seven years of polyuria and these three days (presenting, volumes, earlier labels and
   treatment, vomiting, past head problems).
2. `obj-examine` — Assess his hydration, breathing and circulation (alertness and build, pulse and BP, hydration,
   breathing pattern, perfusion).
3. `obj-first-hours` — Recognise the emergency and start the first hours' treatment (decisions 1–2; bolus, insulin
   infusion, potassium-containing rehydration).
4. `obj-polyuria` — Explain the polyuria that outlasts the glucose (intake chart and ward urinalysis read in the ward
   phase; decision 3; the supervised test ordered).
5. `obj-synthesis-plan` — Bring the findings together and plan for the long term (the three assessment records read,
   fundi examined; decisions 4–5; bladder assessment, water-access plan, genetics referral).
6. `obj-outcome` — Compare with the reported treatment and the year of follow-up (the outcome record).

Titles and hints name no diagnosis, result or keyed act ("Which value decides how severe it is, and what must come
first in treatment?"). No objective holds a time window: a learner who gives the potassium late, or never treats in
the admission phase, cannot reach the ward until they do, and a learner who misses the window loses the critical item
but can still finish.

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `acid-base` | glucose, urinalysis, blood gas and electrolytes read (admission) | severe DKA graded by the bicarbonate (4.2 mmol/L); corrected sodium about 128 mmol/L, true hyponatraemia | mild DKA by the pH and a "dilutional" sodium (**the near-miss: grading by pH alone**); hyperglycaemic hyperosmolar state; water intoxication from habitual drinking (**anchoring on the seven-year label**) |
| 2 | `first-hours` | decision 1; alertness, hydration, breathing and perfusion examined | 0.9% saline 10 mL/kg over 30 minutes, deficit over 48 hours; insulin 0.05–0.1 unit/kg/h from an hour or more after the fluids, no bolus; potassium 40 mmol/L; no bicarbonate; hourly neurological checks | insulin bolus and fluids to a urine-output end point; **bicarbonate for a bicarbonate of 4.2 mmol/L** (the historical reflex 1.0.0 alludes to); sodium first, insulin only above 130 mmol/L |
| 3 | `polyuria` | decision 2; ward intake chart and ward urinalysis read | dilute polyuria the glucose no longer explains — diabetes insipidus or primary polydipsia: paired plasma sodium and osmolalities, then a supervised water-deprivation–desmopressin test | persisting osmotic diuresis, more insulin; **habitual polydipsia, restrict to 2 L at home** (the seven-year label acted on); empirical full-dose desmopressin with restriction |
| 4 | `synthesis` | decisions 1 and 3; vasopressin test, hearing report and urinary imaging read (assessment); fundi examined; voiding asked; islet antibodies read | clinical Wolfram syndrome; WFS1 testing, brain and pituitary MRI; the diabetes insipidus type unproven | type 1 diabetes plus a "proven" nephrogenic diabetes insipidus and diabetic complications (**the poor vasopressin response over-read**); maternally inherited diabetes and deafness (a near-miss for diabetes with deafness); a sellar lesion (a near-miss for diabetes insipidus with optic atrophy — why the MRI matters) |
| 5 | `care-plan` | decision 4 | residual volume and renal function now, urodynamics, intermittent catheterisation if he does not empty; free access to water with a written plan; insulin education; eye, hearing, genetic and psychological care | **hydrochlorothiazide and insulin, assume the hydronephrosis will settle** (the reported drugs, without a bladder assessment); fluid restriction to protect the kidneys; wait for the genetic result before any referral |

Single best answer each, 4 options (20 in all), every option with its own 2–4-sentence feedback naming its guidance.
Option ids name content (`severe-dka-true-low-sodium`, `habit-restrict-at-home`, `sellar-lesion`…). Length cue: the
key is the uniquely longest option only in decision 2 (in both languages); in the other four a distractor is as long
or longer (`cases validate --strict` checks it).

### Rubric (11 deterministic items, weight 30, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 2 | presenting, volumes, earlier labels, earlier treatment, current vasopressin use, vomiting, past head problems, parents' health and consanguinity, voiding asked |
| `rb-examination` | examination | 2 | alertness and build, pulse and BP, hydration, breathing, perfusion, fundi examined |
| `rb-investigations` | investigations | 2 | admission glucose, urinalysis, gas and electrolytes read; blood ketones and renal function ordered; ward intake chart and urinalysis read; vasopressin test, hearing report and urinary imaging read (assessment) |
| `rb-acid-base` | diagnosis | 3 | decision 1 right first time |
| `rb-first-hours` | management | 3 | decision 2 right first time |
| `rb-resuscitation-in-time` | **management · critical** | 4 | the saline bolus, the insulin infusion and the potassium-containing rehydration each given **while its `indicatedWhen` held** (`{"intervened": …, "whenIndicated": true}`): the bolus in the admission phase; the insulin in the admission phase after the bolus; the potassium in the admission phase after the bolus and once the potassium was read |
| `rb-no-harm` | **safety · critical** | 4 | none of: insulin bolus, bicarbonate, fluid restriction, desmopressin given before the supervised test (`valid: false`); `scoredWhen`: decision 2, 3 or 5 attempted, or any of the four harms |
| `rb-polyuria` | diagnosis | 3 | decision 3 right first time |
| `rb-synthesis` | diagnosis | 3 | decision 4 right first time |
| `rb-care-plan` | management | 2 | decision 5 right first time |
| `rb-care-acts` | management | 2 | IV access, monitoring, high-dependency transfer, observation plan, supervised test ordered, bladder assessment and urology, water-access plan, insulin education, specialist follow-up, genetics referral |
| `rb-communication` | communication (examiner) | 1 | Calgary–Cambridge with SPIKES for a possibly progressive genetic diagnosis, the adolescent first and in private, the safety messages (never restrict water, early care when vomiting), uncertainty stated, teach-back |

Both critical items are **acts**, gated before the results that would confirm the diagnosis: the in-time item is met
only by acts done in the admission phase (the window is each intervention's `indicatedWhen`), and the ward phase waits
for them; the avoided-harm item counts only once a harm was possible, so doing nothing earns 0.

### How wrong choices score (measured 2026-11-13, engine replay)

| Path | Score | Critical items missed | Safety outcome |
|---|---:|---|---|
| Reference `solution` | 30/30 (100 %) | — | passed |
| Do nothing (start; finish refused) | 0/26 | `rb-resuscitation-in-time` | passed (`rb-no-harm` not scored) |
| Wrong first answer at every decision, then right | 16/30 (53 %) | — | passed |
| IV sodium bicarbonate added after the bolus | 26/30 (87 %) | `rb-no-harm` | **failed** (`sodium-bicarbonate`) |
| IV insulin bolus added after the saline | 26/30 (87 %) | `rb-no-harm` | **failed** (`insulin-bolus`) |
| Insulin infusion started before the saline bolus | 26/30 (87 %) | `rb-resuscitation-in-time` | passed (contraindicated, non-critical) |
| Potassium-containing fluid before the potassium is known | 26/30 (87 %) | `rb-resuscitation-in-time` | passed (contraindicated, non-critical) |
| Fluid restriction on the ward | 26/30 (87 %) | `rb-no-harm` | **failed** (`fluid-restriction`) |
| Desmopressin before the supervised test | 26/30 (87 %) | `rb-no-harm` | passed (contraindicated, non-critical) |
| No bladder assessment, genetics or specialist referral | 28/30 (93 %); cannot finish until done | — | passed |

**Safety outcome.** Three interventions are `critical: true`, so giving them while contraindicated fails the run's
safety outcome whatever the score: the IV insulin bolus and IV sodium bicarbonate (both raise the risk of cerebral
oedema in paediatric DKA; Glaser 2001, ISPAD 2022, NICE NG18) and restriction of his drinking (life-threatening
hypernatraemic dehydration with a concentrating defect). The insulin infusion before any fluid or before the potassium
is known, and desmopressin before the supervised test, are explicitly `critical: false`: recoverable misjudgements,
flagged as contraindicated and scored through the rubric (the first through the in-time item, the second through
`rb-no-harm`). The potassium-containing rehydration before the potassium is known is contraindicated (moderate risk)
and costs the in-time item.

## Reference path (`solution`)

83 steps: start → the admission history from the boy himself (20 items, from the presenting problem to his worries)
→ examination (alertness and build, pulse and BP, hydration, breathing, perfusion, weight) → IV access and
monitoring → glucose, blood ketones, blood gas, electrolytes, urinalysis, renal function and islet antibodies ordered
and read → decision 1 → saline bolus, high-dependency transfer, hourly observation plan, potassium-containing
rehydration, insulin infusion → decision 2 (the ward phase opens) → status, voiding and the confidential psychosocial
and mood questions → fundoscopy → intake chart, ward urinalysis and osmolality → insulin education and water-access
plan → decision 3 (further assessments open) → vasopressin test, hearing report, urinary imaging, brain and pituitary
MRI → decision 4 → bladder assessment and urology, specialist follow-up, genetics referral and genetic testing →
decision 5 → outcome record → follow-up status → finish. No contraindicated act, no dose error, every objective and
every deterministic rubric item met (30/30).

## Clinical numbers check

Every value below is from version 1.0.0 (the source check is pending). "Field" is where 1.0.0 recorded it and where it
is now.

| Value | 1.0.0 field | Now |
|---|---|---|
| Age 13 years, male; weight 27 kg | `patient` | `patient`; exam `weight` (admission; when it was measured is not recorded) |
| Drinking about 4,200–6,000 mL a day for 7 years, similar urine volume, clear urine, occasional enuresis | history `polyuria` | history `polyuria-volume`, `enuresis`; chief complaint |
| Psychogenic polydipsia or diabetes insipidus considered; irregular herbal medicine and vasopressin, poor benefit | history `prior-treatment` | `prior-diagnosis`, `prior-treatment` |
| Vomiting 3 days, non-projectile, after meals, unable to eat; worsening lethargy | history `vomiting` | `presenting`, `vomiting`, `lethargy` |
| Past head injury, headache, vomiting, coma denied | history `neurological-history` | `neuro-history` |
| Term vaginal birth; growth and intelligence like peers; parents healthy; no consanguinity in the parents' or grandparents' generation | history `family-known` | `birth-development`, `family-health` |
| Alert but listless, very thin, dry skin and mucosa, poor turgor, deep breathing, cool peripheries; HR 102/min, BP 95/60 mmHg | exam `dehydration` | exam `general`, `hydration`, `breathing`, `perfusion`, `vitals`; triage note |
| Glucose 38.74 mmol/L | investigation `metabolic` | `glucose` (admission) |
| Urine glucose ++++, ketones ++ | `metabolic` | `urinalysis` (admission) |
| pH 7.21; bicarbonate 4.2 mmol/L | `metabolic` | `blood-gas` (admission) |
| Sodium 116, potassium 4.0, anion gap 35.6 mmol/L | `metabolic` | `electrolytes` (admission) |
| GAD and IAA negative | `metabolic` | `islet-antibodies` (all three pre-outcome phases; sampling time not recorded) |
| After glucose stabilised: drinking 4,700–5,800 mL a day | investigation `persistent` | `fluid-chart` (ward, assessment) |
| Urine specific gravity 1.000–1.005 | `persistent` | `urinalysis` (ward, assessment) |
| Bilateral hydronephrosis, ureteric dilatation | `persistent` | `urinary-imaging` (assessment; imaging method not recorded) |
| Voiding difficulty | `persistent` | history `voiding` (ward, assessment) |
| Optic atrophy (fundus) | `persistent` | exam `fundoscopy` (ward, assessment) |
| High-frequency sensorineural hearing loss | `persistent` | `audiology` (assessment) |
| Poor response to vasopressin | `persistent` | `vasopressin-test` (assessment) |
| Stabilised after emergency care; insulin and hydrochlorothiazide; discharge at about 2 weeks; stable at two follow-ups within a year | `followup` | `outcome` (followup); history `status-ward`, `status-followup` |
| Clinical diagnosis of Wolfram syndrome with DKA; genetic subtype and DI mechanism unproven | `debrief.conclusion` | `outcome`, debrief |

Derived values (teaching, not record):

- Glucose 38.74 mmol/L ≈ 698 mg/dL.
- Corrected sodium (ISPAD formula, Na + 2 × [(glucose − 5.6)/5.6]): 116 + 11.8 ≈ **127.8 mmol/L** (the Katz and
  Hillier corrections give about 125.6 and 130.4 mmol/L): the hyponatraemia is real by any of them.
- Effective osmolality (2 × Na + glucose): 232 + 38.74 ≈ **271 mOsm/kg** — not hyperosmolar.
- Implied PaCO₂ (Henderson–Hasselbalch, pH 7.21, bicarbonate 4.2 mmol/L): about **10.6 mmHg (1.4 kPa)**, below the
  Winter's-formula expectation of 1.5 × 4.2 + 8 = 14.3 ± 2 mmHg — either near-maximal respiratory compensation with a
  respiratory alkalosis, or the pH and bicarbonate are not from one sample (both unrecorded: "To verify").
- Implied chloride: 76.2 mmol/L if the anion gap was Na − (Cl + HCO₃⁻), 80.2 mmol/L if potassium was included — the
  formula and the chloride are not recorded.
- ISPAD 2022 grade: severe by the bicarbonate (< 5 mmol/L); by the pH alone (7.21) it would read as mild.
- Intake per kilogram: 4,200–6,000 mL a day ≈ 156–222 mL/kg/day; 4,700–5,800 mL ≈ 174–215 mL/kg/day (a
  body-surface-area figure needs a height, which is not recorded).
- Doses at 27 kg (in the `response`/teaching only, never in a dose text): bolus 10 mL/kg = 270 mL; insulin 0.05–0.1
  unit/kg/h = 1.35–2.7 units/h.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions:** How did it feel to meet a boy who had been "drinking too much" for seven years and was now vomiting?
  What did you want to do first?
- **Description:** Walk me through his first hour: which results came back, how you graded them, and in what order
  you gave the fluid, the insulin and the potassium.
- **Analysis:**
  - His pH of 7.21 and bicarbonate of 4.2 mmol/L disagree — which sets the grade, and what does that change at the
    bedside?
  - What is his sodium once corrected for the glucose, and what should happen to it as the glucose falls?
  - Why is bicarbonate tempting here, and why does ISPAD 2022 keep it for so few children? Where is the evidence on
    cerebral oedema?
  - Once his glucose had settled, why was his urine still so dilute? What would you need to tell vasopressin
    deficiency, vasopressin resistance and primary polydipsia apart — and what makes a water-deprivation test safe?
  - The report records a "poor response to vasopressin" and treated him with hydrochlorothiazide. What else, in this
    boy, could blunt the response to vasopressin?
  - Which single diagnosis explains antibody-negative diabetes, optic atrophy, diabetes insipidus, hearing loss and a
    dilated urinary tract — and what would still make you order an MRI?
  - He struggles to pass urine and both kidneys are dilated. What happens if nobody checks how well he empties?
- **Summary:** What will you do the next time a child with "habit polydipsia" presents, and what are the two safety
  messages his family must take home?

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it |
|---|---|
| Anchoring on the old "drinks too much" label | decision 1 (water intoxication) and decision 3 (restrict at home); the fluid-restriction intervention is critical |
| Grading by pH alone | decision 1 near-miss (mild DKA by pH 7.21) |
| Insulin bolus, or insulin before fluid or before the potassium is known | the insulin-bolus intervention (critical) and the insulin infusion's `contraindicatedWhen` (before the bolus, or before the electrolytes are read); the in-time item is lost |
| Bicarbonate for a low bicarbonate | decision 2 distractor and the critical bicarbonate intervention |
| Potassium before it is known, or forgetting it | `contraindicatedWhen` on the rehydration before the electrolytes are read; the ward phase waits for it |
| Reading persisting polyuria as poor glucose control | decision 3 distractor (more insulin) |
| Unsupervised water deprivation, or empirical desmopressin | decision 3 distractors; fluid restriction is critical, early desmopressin is contraindicated and loses `rb-no-harm` |
| Over-reading the vasopressin test as proof of a nephrogenic cause | decision 4 distractor; the outcome record states the type is unproven |
| Splitting the findings into unrelated diagnoses | decision 4 distractors (MIDD, sellar lesion) |
| Treating the polyuria and forgetting the bladder | decision 5 distractor (thiazide and wait); the bladder assessment is part of the last objective |

### Teaching points (debrief)

Six points, each naming its guidance and year: grading and the numbers (ISPAD 2022 thresholds, corrected sodium,
effective osmolality, the implied PaCO₂); the first hours then and now (NICE NG18 2020 update, BSPED 2021, ISPAD 2022);
bicarbonate and cerebral oedema (ISPAD 2022, Glaser 2001); polyuria after glucose control (Patti 2022, the 2022
renaming); one diagnosis and its genetics (GeneReviews 2023, ISPAD 2022 monogenic); protecting the urinary tract and
long-term care (EAU/ESPU 2020, SID/SIEDP 2025).

## Embodied mode

- **Facility:** `general-hospital`. He starts in a ward bed (`setting: "inpatient"`). The high-dependency transfer
  (`hdu-care`, `destination: {"setting": "icu"}`) moves him to an ICU bed; the ward phase (`location: {"setting":
  "inpatient"}`) brings him back to a ward bed.
- **Records terminal vs bedside:** the intake chart, the hearing report and the outcome record are record reviews
  (`performedAt: "records"`, `requires: ["records"]`, `risk: "none"`), read at the nurses' station or in the notes at
  the bedside; the hearing report and the outcome record do not exist before their phases. Laboratory tests are
  sampled at the bedside (or ordered at a records terminal once the IV access has drawn the bloods); the blood ketone
  meter is bedside (`point-of-care`).
- **Transport:** the urinary tract imaging (`ultrasound`), the brain and pituitary MRI and the low-value head CT are
  done at the device (`performedAt: "provider"`): in-world, he is wheeled there and back. The reference path takes him
  to ultrasound and MRI.
- **Capabilities used:** `iv-access` (treatment or crash trolley), `cardiac-monitor`, `infusion-pump`,
  `medications`, `point-of-care`, `lab-chemistry`, `lab-blood-gas`, `lab-urinalysis`, `lab-serology`,
  `lab-endocrine`, `molecular`, `ultrasound`, `mri`, `ct`, `records` — all present in the general hospital
  (`caseCapabilityGaps` is empty). There is no audiometry station, so the hearing assessment is a record review, and
  the urology, genetics and specialist steps are consults.
- **Voice:** a conscious 13-year-old answers his own history (no `answersHistory`); a relative (relationship not
  recorded, no `presentation`) sits at the bedside and is part of the communication task. The psychosocial and mood
  questions are asked with the relative out of the room.
- **Scope of practice:** fluids, insulin and monitoring are nursing-scope (delegable); the transfer, consults and the
  water-restriction instruction are medical.

## Fidelity limits

- The case is built from the facts version 1.0.0 extracted from the report; the full article has not been checked
  (source pass pending). Every patient fact traces to 1.0.0; nothing is added from memory of the article or from a
  typical presentation.
- No vital signs beyond the admission heart rate and blood pressure, no repeat results, no fluid or insulin doses,
  no vasopressin-test data, no imaging method, no visual acuity or audiogram, no renal function and no genetic result
  are recorded; the case says so instead of filling them in.
- The phases after admission stage results that 1.0.0 records only as "after the glucose had settled"; their order is
  teaching design.
- Static clock: the reported course is a record, not a prediction of how the boy would respond to the learner's
  actions.

## Source and adaptation

**Adapted:** title, summary and tags were rewritten without the diagnosis (1.0.0's title and tags were already
spoiler-free; its summary was rewritten as one library sentence). The patient now answers his own history (the survey
critic flagged that conscious adolescents never spoke in the template versions); a relative is present as a teaching
device, relationship not recorded. All dialogue, the four phases, five decisions, seventeen interventions, the rubric,
staff and teaching points are teaching design; history answers reword 1.0.0's facts in a 13-year-old's voice.

**Extraction summary (fact → 1.0.0 field → new field):** see the Clinical numbers check. 1.0.0's single composite
examination finding is split into five manoeuvres plus weight; its three narrative records become nine single-test
records with structured values plus the outcome record, with the fundoscopy and the voiding difficulty moved to the
examination and the history; its "family-known" item is split into birth/development and family items; its
unknown slots are replaced by case-specific questions a clinician would ask (current vasopressin use, earlier glucose
tests, abdominal pain, headache now, weight loss, vision, hearing, wider family, allergies, home and school, mood), each
answered with the lay "I'm not sure, doctor."

**Contradictions and tensions kept, not resolved:**
- "Growth and intelligence comparable to peers" (history) versus "very thin" and 27 kg at 13 (examination, patient
  weight): both kept as recorded.
- pH 7.21 with bicarbonate 4.2 mmol/L implies a PaCO₂ of about 11 mmHg; whether both came from one sample is not
  recorded.
- A sodium of 116 mmol/L (corrected about 128) after years of polyuria and three days of vomiting is unusual; it is
  kept as recorded and taught as true hyponatraemia.
- 1.0.0's teaching text spoke of "historical routine bicarbonate", "deprivation testing" and a "historical nephrogenic
  label"; its outcome record names only emergency care, insulin and hydrochlorothiazide. None of these is written in as
  a patient fact; all are listed under "To verify".

**Unknowns without claims about the article:** 1.0.0 said the dynamic test data and genetic results were "not given" by
the source; this version says only that this case does not record them (record-facing text: "No result is recorded
for this test." / "此项检查没有结果记录。"; the boy: "I'm not sure, doctor.").

**Privacy:** pseudonym 杨清和 / Yang Qinghe (unique in the collection), no hospital, city, date or identifying detail;
relative times only (day 3 of vomiting, about two weeks in hospital, a year of follow-up). Authors' names appear only
in the citation. No figures: `scripts/cmcr-105-media-review.json` approves none for this case.

**Labelled teaching devices:** the relative at the bedside; the boy's worries ("Is this serious?", "Can I still drink
when I'm thirsty?") in `persona.concerns` and the `worries` item, which restate only the recorded thirst; his
`affect` (anxious); the staff (Dr Wen, Nurse Zhou, Pharmacist Tang, Dr Lu) and their briefs.

**Survey findings applied:** no case-specific audit exists for cmcr-44477; the critic's finding that this 13-year-old
never spoke is fixed (he answers his own history; confidential psychosocial and mood items added), and the template
defects are all addressed: no generic slots or "the source notes" answers, case-specific decisions with neutral option
ids and no length cue, interventions including the tempting wrong steps, critical items that are acts, a staged
timeline, structured results, four staff and a README in the library template.

**Capability decisions:** audiometry → record review (no audiology station); urology, genetics, ophthalmology,
audiology, neurology and psychology → consults; the high-dependency bed → a transfer to the ICU slot.

## Matcher notes

- 40 test utterances (23 zh-CN, 17 en), written as learners phrase things — colloquial, multi-clause, both
  registers — with at least one for every required item and for the ward status twin, and four look-alike negatives
  ("我先给你量一下血压。", "Let me check your blood pressure." …) that must select nothing.
- `status-ward` supersedes `presenting`, `vomiting` and `lethargy` in the ward and assessment phases ("are you still
  being sick?" there gets the current answer, never the stale one); `status-followup` answers in the follow-up phase.
- Overlaps handled with `excludeKeywords`: earlier labels vs earlier treatment vs current vasopressin use; vomiting vs
  past head problems vs thirst; voiding vs volumes vs bedwetting; parents' health vs wider family; presenting vs "what
  did doctors say before". English multi-word keywords that reduce to one token are written run together
  (`howmuchdoyoudrink`, `whathaveyoutaken`); "ears" and "hear" were dropped because "early" and "heart" prefix-match
  them.

## References

1. 林宏华, 华山, 吴成, 董扬, 刘光辉, 倪虹. Wolfram综合征一例. 中华儿科杂志. 2011;49(6):470-471.
   doi:10.3760/cma.j.issn.0578-1310.2011.06.017. Available from: https://rs.yiigle.com/cmaid/44477
2. Glaser N, Fritsch M, Priyambada L, Rewers A, Cherubini V, Estrada S, Wolfsdorf JI, Codner E. ISPAD Clinical Practice
   Consensus Guidelines 2022: diabetic ketoacidosis and hyperglycemic hyperosmolar state. Pediatr Diabetes.
   2022;23(7):835-856. doi:10.1111/pedi.13406
3. National Institute for Health and Care Excellence. Diabetes (type 1 and type 2) in children and young people:
   diagnosis and management. NICE guideline NG18. London: NICE; 2015 [diabetic ketoacidosis recommendations updated
   2020 Dec; shock bolus updated 2022 Oct].
4. Rugg-Gunn CEM, Deakin M, Hawcutt DB. Update and harmonisation of guidance for the management of diabetic
   ketoacidosis in children and young people in the UK. BMJ Paediatr Open. 2021;5(1):e001079.
   doi:10.1136/bmjpo-2021-001079
5. Glaser N, Barnett P, McCaslin I, et al. Risk factors for cerebral edema in children with diabetic ketoacidosis. N
   Engl J Med. 2001;344(4):264-269.
6. Greeley SAW, Polak M, Njølstad PR, et al. ISPAD Clinical Practice Consensus Guidelines 2022: the diagnosis and
   management of monogenic diabetes in children and adolescents. Pediatr Diabetes. 2022;23(8):1188-1211.
   doi:10.1111/pedi.13426
7. Barrett T, Tranebjærg L, Gupta R, et al. WFS1 spectrum disorder. In: Adam MP, et al., editors. GeneReviews®
   [Internet]. Seattle (WA): University of Washington, Seattle; 1993-. 2009 Feb 24 [updated 2023 Oct 5]. Available
   from: https://www.ncbi.nlm.nih.gov/books/NBK4144/
8. Frontino G, Delvecchio M, Prudente S, et al. SID/SIEDP expert consensus on optimizing clinical strategies for early
   detection and management of Wolfram syndrome. J Endocrinol Invest. 2025;48(3):507-525.
   doi:10.1007/s40618-024-02495-z
9. Patti G, Napoli F, Fava D, Casalini E, Di Iorgi N, Maghnie M. Approach to the pediatric patient: central diabetes
   insipidus. J Clin Endocrinol Metab. 2022;107(5):1407-1416. doi:10.1210/clinem/dgab930

Also checked for this revision (cited in the teaching text, not in the debrief list): Stein R, Bogaert G, Dogan HS, et
al. EAU/ESPU guidelines on the management of neurogenic bladder in children and adolescent part I diagnostics and
conservative treatment. Neurourol Urodyn. 2020;39(1):45-57. doi:10.1002/nau.24211.

Guideline existence, issuing body, year and DOI were confirmed by web search on 2026-11-13 (publisher, PubMed or
society pages; several full texts were not reachable from this environment — see "To verify"). The source DOI was
verified on 2026-10-29 (`scripts/cmcr-105-sources.json`).

## To verify

In the source article (the details to look for):
- the admission vital signs beyond heart rate and blood pressure (temperature, breathing rate, oxygen saturation,
  capillary refill, conscious level), the height and when the 27 kg weight was measured;
- the full admission blood panel: whether the glucose was a plasma value, whether the pH and bicarbonate came from one
  (arterial or venous) sample, the PaCO₂, chloride, urea, creatinine, osmolality, β-hydroxybutyrate, HbA1c and
  C-peptide, and the anion-gap formula;
- the emergency treatment: fluids, volumes, insulin route and dose, potassium, and **whether bicarbonate was given**
  (1.0.0's teaching text alludes to "historical routine bicarbonate");
- the polyuria work-up: whether a water-deprivation test was done, its duration, weights, plasma sodium and plasma and
  urine osmolality, the vasopressin preparation and dose, and **whether the report classifies the diabetes insipidus as
  nephrogenic** (1.0.0 refers to a "historical nephrogenic label");
- the imaging method behind the hydronephrosis and ureteric dilatation, which sides, bladder findings, residual volume
  and any urodynamics;
- the eye (acuity, fields, one or both eyes) and hearing (audiogram, one or both ears) details;
- any MRI, any genetic testing (WFS1/CISD2), siblings and wider family history;
- the insulin and hydrochlorothiazide regimens and doses, what was measured at the two follow-up visits, and the course
  beyond one year;
- the tension between "growth and intelligence comparable to peers" and a weight of 27 kg at 13 years.

In the guidance (wording not reachable in full text from this environment):
- ISPAD 2022 DKA chapter: the exact wording on insulin starting at least 1 hour after fluids, the 0.05–0.1 unit/kg/h
  range, no IV bolus, potassium starting with insulin when normal, the cerebral oedema risk factors (insulin in the
  first hour of fluids), the sodium that fails to rise, the HHS criteria (venous pH > 7.25, bicarbonate > 15 mmol/L),
  and the 2–4-hourly repeat bloods;
- NICE NG18 (current version): the 1–2-hour insulin start and the "no bolus" wording; BSPED 2021: version number and
  the 40 mmol/L potassium wording in the current revision;
- ISPAD 2022 monogenic diabetes: the Wolfram-specific recommendation for genetic testing in antibody-negative diabetes
  with extra-pancreatic features;
- Patti 2022: the paediatric water-deprivation protocol and stopping criteria;
- SID/SIEDP 2025: the specific surveillance schedule (eyes, hearing, urology, neurology, psychology);
- Chinese paediatric guidance (中华医学会儿科学分会内分泌遗传代谢学组：中国儿童1型糖尿病标准化诊断与治疗专家共识（2020版），
  中华儿科杂志 2020;58(6):447-454；儿童糖尿病酮症酸中毒诊疗指南（2009年版），中华儿科杂志 2009;47(6):421-425): confirmed to
  exist but not read; check the case against them.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- Patient voice: the boy answers his own history; confidential psychosocial and mood items; a relative present as a
  labelled teaching device; no authoring language in any answer.
- Four staged phases (admission, ward, further assessments, reported course) with descriptions and gates; 25 history
  items, 7 examination findings, 17 single-test investigations with structured values and honest "no result
  recorded" placeholders, 17 interventions (the first-hours acts, today's steps, the tempting wrong ones with harm
  texts, three of them critical).
- Five case-specific decisions with neutral option ids, no length cue beyond one decision and guideline-named feedback
  on every option; 12 rubric items with two critical acts; six objectives; four staff with case-specific briefs.
- Debrief rewritten: conclusion with the decisive numbers, six key reasoning steps, six dated teaching points
  contrasting the recorded course with current guidance, seven unknowns, nine Vancouver references.
- Review status set to `editorial` with eight named guidelines; extensions moved to the collection schema
  (`sourceDoi`, `doiVerifiedAt`, `sourceTextChecked: false`).
- Corrected from 1.0.0: the patient no longer says the source "does not provide" information; the critical item is an
  act, not an answer to a management question; option ids no longer name the answer; the bicarbonate, deprivation-test
  and nephrogenic-label allusions are no longer presented as facts.

### 1.0.0 — 2026-10-28

Initial de-identified adaptation from the template (three generic decisions, no interventions).

## Validation

Run from the worktree root (all passed for 1.1.0 on 2026-11-13):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-44477/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-44477 --lang en                                                 # 83 steps, 6/6 objectives, 5/5 decisions, 40/40 utterances, 30/30 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-44477                       # depth floor, do-nothing 0, wrong-first < reference
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-44477:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-44477:"  # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要：** 13岁男孩（27 kg，极度消瘦）七年来每天喝水约4200–6000 mL、尿量相近，偶有遗尿，曾被认为是精神性多饮或尿崩症，
不规律用过中药和加压素。这次呕吐3天、不能进食、精神萎靡入院：皮肤黏膜干燥、呼吸深长、末梢凉，心率102次/分，血压95/60 mmHg；
血糖38.74 mmol/L，尿糖++++、尿酮体++，pH 7.21，HCO₃⁻ 4.2 mmol/L，阴离子间隙35.6 mmol/L，钠116 mmol/L（校正约128），
钾4.0 mmol/L，GADA和IAA阴性——重度糖尿病酮症酸中毒。血糖平稳后他仍每天喝4700–5800 mL水，尿比重1.000–1.005，对加压素反应差，
并有视神经萎缩、高频感音神经性听力下降、双肾积水、输尿管扩张和排尿困难。报告临床诊断为Wolfram综合征，没有基因结果记录；
之后用胰岛素和氢氯噻嗪，约2周出院，一年内两次随访稳定。患者事实沿用1.0.0版，尚未对照原文全文核对。

**学习目标：** 按pH和HCO₃⁻中较重的一项给DKA分级并校正血钠（ISPAD 2022）；先补液、补液1小时以上后胰岛素输注、不推注、
不补碱，补钾40 mmol/L（NICE NG18；BSPED 2021）；监测脑水肿；识别血糖控制后的低渗性多尿并只在监护下检查（Patti 2022）；
作出Wolfram综合征的临床诊断并做WFS1检测和MRI（GeneReviews 2023）；制定膀胱、饮水安全和多学科随访计划（EAU/ESPU 2020；
SID/SIEDP 2025）。

**关键决策：** 1. 入院检查结果怎样判断（重度DKA、真性低钠）；2. 最初几小时怎么处理（补液在先、胰岛素输注不推注、补钾、不补碱）；
3. 血糖平稳后仍然多尿怎样解释和检查（低渗性多尿，配对渗透压，住院监护下的禁水–去氨加压素试验）；4. 综合判断（临床Wolfram
综合征，WFS1和MRI，尿崩症类型未证实）；5. 现阶段最能保护他的计划（膀胱排空评估、随时饮水、多学科随访）。

**复盘要点：** 多年“喝水太多”的标签不能代替查血糖和尿酮；pH与HCO₃⁻不一致时按较重的一项分级；碳酸氢钠只用于危及生命的
高钾或pH＜6.9伴心肌收缩力受损（ISPAD 2022），在Glaser 2001中与脑水肿相关；血糖平稳后的稀释尿是另一个问题，禁水只能在
监护下作为试验；“反应差”定不了肾性；排尿困难合并肾积水要马上评估膀胱排空。待核实：见上文“To verify”。

**安全结果。** 推注胰岛素、静脉碳酸氢钠和限制饮水为严重安全错误（`critical: true`），做了即判定安全结果不通过；补液前开胰岛素
和试验前用去氨加压素为可纠正的判断失误（`critical: false`），作为禁忌操作标出并通过评分体现。
