# cmcr-70172 — Double vision, dizziness and progressive leg weakness · 9-year-old boy

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary and triage note name neither thiamine deficiency nor Wernicke encephalopathy. The patient (朱予宁 /
> Zhu Yuning) and his relative are pseudonymous; the case is a teaching adaptation of a published case report,
> not medical advice.
> 导师指南，含剧透。患者及家属均为化名；本病例改编自已发表的病例报告，不构成医疗建议。

## Case card

| | |
|---|---|
| Case | `cmcr-70172` · v1.1.0 · CMCR collection (`cmcr-105`) |
| Source | 张波, 杨诺, 张艳凤, 郝云鹏, 王江涛, 陈银波. 小儿维生素B1缺乏性脑病一例. 中国小儿急救医学. 2014;21(3):193-194 (DOI checked against the publisher page on 2026-10-29, `scripts/cmcr-105-sources.json`) |
| Setting | Children's ward (`inpatient`): admission six days into the illness, then the first week and one month of treatment |
| Facility | `general-hospital` |
| Difficulty | 4 / 5 — the diagnosis has to be made at the bedside, outside the alcohol setting, with no level and before the scan; thiamine has to come before glucose; the mimics have to be kept honestly in view |
| Estimated time | ~35 min (static clock; four phases, five decisions, 13 interventions) |
| Specialty | Paediatrics, paediatric neurology (`pediatrics`, `neurology`) |
| Languages | zh-CN (source), en |
| Learner level | Final-year medical students, paediatric and neurology residents; ward nurses for the glucose, swallow and refeeding points |
| The patient | Zhu Yuning (朱予宁, pseudonym), 9-year-old boy, drowsy in a ward bed. A relative (which relative is not recorded) answers the history; the boy says a few words about his eyes and his dizziness |
| What the learner can do | Take the history; examine; check a bedside glucose and weigh him (no results are recorded); send bloods; read the MRI, CSF, neostigmine-test, progress-note and outcome records; give or withhold injected or oral thiamine, glucose-containing or glucose-free fluids, mannitol, aciclovir and IVIG; order a swallow screen and neurological observations; involve the dietitian, the surgeons and gastroenterologists; arrange follow-up; answer five decisions |
| Review status | Editorial review 2026-11-14 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**. The facts are version 1.0.0's extraction and have **not yet been checked against the full source article** (`extensions.sourceTextChecked: false`); have a paediatric neurologist review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Recognise Wernicke encephalopathy outside the setting of alcohol — in a 9-year-old with eye signs, reduced
   alertness and a nutritional risk (recurrent vomiting, selective eating) — using the EFNS 2010 criteria as a
   prompt rather than a gate.
2. Give injected thiamine at a treatment dose before any glucose-containing fluid, without waiting for a level or
   an MRI (EFNS 2010), and agree a child's weight-based dose with the pharmacist.
3. Distinguish thiamine deficiency (encephalopathy with weak legs, absent knee reflexes and tender calves) from
   Miller Fisher or Guillain–Barré syndrome, encephalitis and myasthenia using the examination, CSF, neostigmine
   test and MRI, stating what each normal result cannot exclude (EAN/PNS 2023).
4. Interpret the MRI pattern of thiamine deficiency — symmetrical thalamic, fornix and deep grey-matter signal —
   and explain why a normal scan would not exclude it.
5. Plan safe refeeding for a child whose refeeding risk cannot yet be graded: thiamine before feeds, potassium,
   magnesium and phosphate checked before and during a gradual build-up (ASPEN 2020), and a swallow screen while
   the gag reflex is weak.
6. State the diagnosis honestly when the deficiency was never measured — a clinical diagnosis supported by the
   response — and plan treatment of the cause and neurological follow-up.

These are `learningOutcomes` in `case.json`. They name the diagnosis, so front-ends show them before play only
behind the closed **Learning outcomes · may reveal the diagnosis** disclosure and list them in every debrief
(CASE_AUTHORING §9.4, GLOSSARY §4).

## Clinical summary (spoilers)

A 9-year-old boy is admitted six days into an illness of dizziness, double vision and progressive weakness of
both legs; he has become increasingly listless and sleepy and can no longer walk. Three days of treatment for
presumed encephalitis at another hospital — mannitol and an antiviral medicine were used — have not helped. Part
of his colon was removed for intestinal atresia on day 4 of life; he has vomited on and off ever since, vomited
once a day in the week before this illness began, and does not like meat (selective eating).

On examination he has bilateral ptosis, restricted adduction and abduction of the eyes with horizontal and
vertical nystagmus, leg power grade III, knee reflexes that cannot be elicited, no pathological reflexes, calf
tenderness, a slightly weak gag reflex and steady, accurate finger–nose testing. The brain MRI shows symmetrical
abnormal signal in both thalami, the lentiform nuclei and the fornix, high on FLAIR, with slightly high DWI
signal in the lentiform nuclei. Routine CSF and CSF biochemistry are normal; the blood count and muscle enzymes
show no obvious abnormality; the neostigmine test is negative; quantitative vitamin B1 testing could not be done.

Vitamin B1 was given (its dose, route and duration are not recorded). One week later his double vision,
dizziness and eye movements had improved and he could walk a few metres; at one month his leg power was grade V
and the MRI was reported normal. Nothing after one month is recorded.

**Diagnosis:** vitamin B1 (thiamine) deficiency encephalopathy — Wernicke encephalopathy — in a child: a clinical
diagnosis supported by the MRI and the response, never measured. The weak legs with absent knee reflexes and
tender calves suggest a thiamine-deficiency neuropathy as well (no nerve conduction study is recorded). Years of
intermittent vomiting and selective eating are the likeliest contributors; a part played by the neonatal
colectomy is unproven.

**Today's answer (the case's key):** suspect it at the bedside and give injected thiamine at a treatment dose
before any glucose-containing fluid, without waiting for a level or the MRI (EFNS 2010); weigh him and agree the
child's dose with the pharmacist; keep Miller Fisher/Guillain–Barré syndrome (EAN/PNS 2023), encephalitis
(ABN/BPAIIG 2012) and myasthenia honestly in view; refeed gradually with potassium, magnesium and phosphate
monitoring and a swallow screen (ASPEN 2020); state the diagnosis as clinical; find the cause; follow him up.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model — the CMCR contract forbids one. The case shows the
report's recorded states only and never invents how the boy would have responded to the learner's treatment;
every response text says what is and is not recorded. No phase is learner-switchable: time moves forward through
the learner's own acts, so each decision is committed before the next stage shows what happened.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | six days into the illness | start | the relative's and the boy's history; the admission examination; bedside glucose and weight (no results recorded); bloods — blood count and muscle enzymes (no obvious abnormality), electrolytes with liver and renal function, blood gas, anti-ganglioside antibodies (no results recorded), the thiamine assay (could not be done); decisions `bedside-diagnosis` and `thiamine-regimen` (and `feeding-safety` once the gag reflex is examined); every intervention |
| `workup` | the admission work-up | objectives `obj-story`, `obj-reserves`, `obj-neuro-exam` met **and** decisions 1 and 2 answered | the MRI, CSF and neostigmine-test records; CSF pathogen tests and nerve conduction/EMG (no results recorded); decisions `workup-interpretation` and `feeding-safety` |
| `first-week` | the first week on vitamin B1 | `obj-treat-first` (decisions 1 and 2 answered **and** injected thiamine given) and `obj-workup` (MRI, CSF and neostigmine test read in the work-up; decisions 3 and 4 answered) | the relative's account, the improved eye movements, walking a few metres, the progress notes; decision `outlook` |
| `one-month` (outcome) | one month | all five decisions answered | the relative's account, leg power grade V, the repeat MRI reported normal, the outcome record with the report's figure |

The work-up phase does not wait for thiamine: a learner who insists on the scan first can read it, but the
critical item `rb-thiamine-early` closes the moment the MRI is read. The first-week phase does wait for injected
thiamine — without it there is no treatment response to show. When each test was actually done relative to the
vitamin B1 is not recorded; placing the MRI, CSF and neostigmine test after the first two decisions is a labelled
teaching device (see "Source and adaptation").

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-story` — Hear the story of this illness (presentation, leg weakness, drowsiness, earlier treatment).
2. `obj-reserves` — Find out how he usually eats and what he has had before (vomiting in the week before onset,
   long-standing vomiting, diet, the neonatal operation).
3. `obj-neuro-exam` — Examine his eyes, his legs and how alert he is (eyelids, eye movements, alertness, leg
   power, reflexes, calves).
4. `obj-treat-first` — Decide what to treat first (decisions 1 and 2; injected thiamine given).
5. `obj-workup` — Interpret the work-up and plan fluids and feeding (MRI, CSF and neostigmine test read in the
   work-up; decisions 3 and 4).
6. `obj-course` — Follow his course on treatment (first-week progress notes, decision 5, outcome record).

No objective holds a condition that can become permanently false; the contract test replays every act of the
reference path late and the case still finishes.

### Decisions

| id | opens after | key | distractors (why they tempt) |
|---|---|---|---|
| `bedside-diagnosis` | objectives 1–3 — before any result | Wernicke encephalopathy from thiamine deficiency, probably with a peripheral neuropathy: treat now, work up the rest alongside (EFNS 2010: suspect it in any condition that can lead to deficiency; treat on suspicion) | Miller Fisher–Guillain–Barré overlap → IVIG first (ophthalmoplegia, absent knee reflexes, weak legs — but drowsiness, an accurate finger–nose test and the nutritional risk); viral encephalitis not yet responding → continue the antiviral and mannitol (**the course before admission**); myasthenia → neostigmine test, then pyridostigmine (ptosis and eye palsy); Bickerstaff encephalitis or ADEM → pulse methylprednisolone (drowsiness with ophthalmoplegia) |
| `thiamine-regimen` | decision 1 | by injection now (IV if possible), a treatment dose repeated through the day and before any glucose-containing fluid; weigh him, but do not wait for a level (EFNS 2010; the adult regimen is 200 mg three times daily IV) | tablets with meals, IV only after a week without improvement; send a level and treat once it confirms; a 10% glucose drip first to correct intake, then one IV dose |
| `workup-interpretation` | MRI, CSF and neostigmine test read in the work-up; blood count, muscle enzymes and thiamine assay read | the results support it: the symmetrical thalamic, fornix and lentiform signal fits, the other results weigh against infection and myasthenia, but an early normal CSF cannot exclude Guillain–Barré syndrome (EFNS 2010; Zuccoli and Pipitone 2009; EAN/PNS 2023) | Leigh-type mitochondrial disease → stop the vitamins so nothing is masked; deep cerebral venous thrombosis → anticoagulate now; "everything is excluded, no nerve conduction or antibodies needed"; "unproven without a level → stop the vitamin B1" |
| `feeding-safety` | decision 2 and the gag reflex examined | glucose, potassium, magnesium and phosphate checked and repeated as intake rises; swallow screened first; weigh him and build up feeds gradually with the dietitian, thiamine continuing (ASPEN 2020) | rapid catch-up with full-energy meals and a concentrated glucose infusion; a week nil by mouth on plain glucose until the MRI clears; a normal diet today, electrolytes only if unwell, no dietitian |
| `outlook` | the first-week progress notes | a clinical diagnosis supported by the response but never measured: continue thiamine (by mouth once he eats without vomiting), find the cause of the vomiting and diet, follow him up | "the response proves it, the stores are full: stop and discharge"; "the response proves colectomy malabsorption: lifelong oral thiamine, no further work-up"; "the legs lag behind the eyes, so it was Guillain–Barré after all: stop thiamine, give IVIG, repeat the LP" |

Every option has feedback of its own that says why it is right or wrong and names its guidance. Decisions never
lock once open, so a learner who answers wrongly can answer again; the rubric scores the first attempt
(`decidedFirstTry`). No key is the uniquely longest option in any decision in either language.

### Rubric (12 deterministic items, 28 points, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-history` | History | the course, the earlier treatment and medicines, the long-standing and pre-onset vomiting, the diet and the neonatal operation | 2 |
| `rb-neuro-exam` | Examination | eyelids, eye movements, alertness, leg power, knee and pathological reflexes, calves and gag reflex | 2 |
| `rb-workup-records` | Investigations | MRI, CSF and neostigmine test read in the work-up; muscle enzymes read | 1 |
| `rb-bedside-diagnosis` | Diagnosis | decision 1, first attempt | 3 |
| `rb-thiamine-early` | Management — **critical** | injected thiamine given before the MRI is read (`{"intervened": "thiamine-iv", "whenIndicated": true}`; `indicatedWhen`: the MRI not yet read in the work-up) | 4 |
| `rb-thiamine-regimen` | Management | decision 2, first attempt | 3 |
| `rb-no-glucose-first` | **Safety — critical** | no glucose-containing infusion while injected thiamine has not been given (counted once glucose or injected thiamine is given or decision 2 attempted) | 3 |
| `rb-no-early-alternatives` | **Safety** | neither oral-only thiamine nor IVIG ahead of injected thiamine (counted once one of them or injected thiamine is given, or decision 1 or 2 attempted) | 2 |
| `rb-workup-reading` | Diagnosis | decision 3, first attempt | 2 |
| `rb-feeding-plan` | Safety | decision 4, first attempt | 2 |
| `rb-feeding-steps` | Management | bedside glucose, weight and electrolytes ordered; swallow screen; dietitian | 2 |
| `rb-outlook` | Management | decision 5, first attempt | 2 |
| `rb-communication` | Communication (examiner) | Calgary–Cambridge with the relative and the boy: what they know and fear, a plain explanation, why the injections come before any result and before glucose, the honest uncertainty (no level; Guillain–Barré still being looked into), eyes first and legs later without promising a full recovery, no blame for his eating, teach-back and when to call for help | 1 |

The two critical items are acts done in time (or a harm avoided once it was possible), never a decision alone and
never creditable in hindsight.

**How wrong choices score.** Measured on 2026-11-14 with core `assess` on replays of the reference path (score;
critical items missed; safety outcome):

| Path | Score | Critical items missed | Safety outcome |
|---|---|---|---|
| Reference path (`solution`) | 28/28 (100 %) | none | passed |
| Start and do nothing | 0 (0/23 counted) | `rb-thiamine-early` | passed (nothing given) |
| Every decision answered wrongly first, then correctly | 16/28 (57 %) | none | passed |
| Glucose-containing drip before injected thiamine | 25/28 (89 %) | `rb-no-glucose-first` | **failed** (`glucose-infusion`) |
| Oral-only thiamine before injected thiamine | 26/28 (93 %) | none | passed (recorded as contraindicated) |
| IVIG before injected thiamine | 26/28 (93 %) | none | passed (recorded as contraindicated) |
| Injected thiamine only after the MRI is read | 24/28 (86 %) | `rb-thiamine-early` | passed |
| The course before admission continued (mannitol, aciclovir), thiamine after the MRI | 24/28 (86 %) | `rb-thiamine-early` | passed |
| Every dangerous act, every decision wrong first | 11/28 (39 %) | `rb-no-glucose-first` | **failed** |
| Glucose-containing fluid after injected thiamine | 28/28 (100 %) | none | passed (the right order) |

Doing nothing counts only the 23 points whose items were in play (an avoided-harm item counts once its harm was
possible). Oral thiamine and IVIG are contraindicated only before injected thiamine: afterwards oral thiamine is
the continuation, and IVIG is a judgement for the Guillain–Barré question. Mannitol and aciclovir are neutral; their
responses say what was already given and why they are not indicated now (no recorded sign of raised intracranial
pressure; ABN/BPAIIG 2012 lets aciclovir stop once an alternative diagnosis is made). Skipping ahead is refused
(`phase-locked`; the outcome phase waits for every decision).

**Safety outcome.** `glucose-infusion` (a glucose-containing maintenance infusion, `risk: "moderate"`) is
`critical: true`: started before injected thiamine in a child with suspected Wernicke encephalopathy, glucose
uses up what thiamine is left and can precipitate or worsen the encephalopathy, with permanent memory and
neurological damage (EFNS 2010: thiamine before any carbohydrate). Giving it fails the run's safety outcome
whatever the score, every debrief and export shows it, and it costs the critical item `rb-no-glucose-first`.
Oral-only thiamine first (`thiamine-oral`, `risk: "low"`) and IVIG first (`ivig`, `risk: "moderate"`) are
`critical: false`: recoverable misjudgements that delay the right treatment — recorded as contraindicated and
costing `rb-no-early-alternatives`. No intervention is `risk: "high"`. No `doseSpec` is set: the case states no
fixed dose (his weight and the report's vitamin B1 dose are not recorded; the IVIG text is a weight-based
schedule). Hypoglycaemia rescue is not modelled: the harm text says glucose must never be withheld if his bedside
glucose were low — give the thiamine first or alongside it.

## Reference path (`solution`)

81 steps: the history (21 admission items, including the nine he or the relative cannot answer) → the admission
examination (alertness, eyelids, eye movements, finger–nose, gag, leg power, reflexes, calves, gait) → bedside
glucose and weight (no results recorded) → decision `bedside-diagnosis` → IV access → the thiamine assay ordered
before the first dose (it could not be done) → **injected thiamine** → electrolytes and liver and renal function,
blood gas (no results), blood count and muscle enzymes (no obvious abnormality), anti-ganglioside antibodies (no
result) → neurological observations and a swallow screen → decision `thiamine-regimen` → work-up: MRI, CSF,
neostigmine test, CSF pathogen tests and nerve conduction (no results) → decision `workup-interpretation` →
dietitian → decision `feeding-safety` → first week: the relative's account, eye movements, gait, progress notes,
surgical and gastroenterology review, neurology follow-up → decision `outlook` → one month: the relative's
account, leg power, the repeat MRI, the outcome record → finish. It scores **28/28** with no contraindicated act
(safety passed), in clinical mode and in the in-world demonstration, in both languages.

## Clinical numbers check

* **Ages and times (all from 1.0.0).** 9 years old; six days of illness at admission; three days of treatment
  elsewhere; operation on day 4 of life; vomiting once a day in the week before onset (1.0.0's Chinese “每天吐一次”;
  its English says only “daily”); improvement one week after vitamin B1; review at one month.
* **Leg power.** Grade III at admission and grade V at one month, on the 0–V (0–5) power scale: III moves against
  gravity but not against resistance, V is normal power. One week after vitamin B1 he “could walk a few metres”
  (可走数米) — no distance is recorded and none is added.
* **Imaging.** No measurements are recorded; “slightly high” DWI signal in the lentiform nuclei is the record's
  wording.
* **Laboratory.** No vital signs, weight, height, glucose, electrolytes, CSF cell counts or protein, blood counts
  or enzyme values are recorded. The CSF and blood results are conclusions only (“normal”, “no obvious
  abnormality”) and are kept as such; no reference ranges are added.
* **Thiamine.** The report's dose, route, frequency and duration are not recorded. The case prints only the EFNS
  2010 adult regimen — 200 mg three times daily, preferably IV (600 mg a day, derived) — and says a child's dose is
  calculated by weight and age from the paediatric formulary and checked with the pharmacist. No milligram dose
  for this boy is printed, and the item has no `doseSpec`.
* **Refeeding (ASPEN 2020).** Potassium, magnesium and phosphate before feeding and repeatedly over the first
  3 days; energy started below goal and built up gradually. ASPEN's paediatric thiamine prevention dose (2 mg/kg,
  maximum 100–200 mg/day before feeding, as secondary summaries quote it) is not printed in the case (see To verify).
* **IVIG (a distractor intervention).** 0.4 g/kg once daily for 5 days = 2 g/kg in total (EAN/PNS 2023; the total
  is derived).
* **Glucose-containing maintenance fluid (the trap).** “Such as 10% glucose with electrolytes … at the maintenance
  rate for his weight” — no rate is printed, as no weight is recorded.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — “How did it feel to start a treatment before any result was back?”
2. **Description** — “Take me through what made you think of a vitamin deficiency in a 9-year-old.”
3. **Analysis**
   * “Which of the four signs in the EFNS 2010 criteria did he have — and which could you not establish?”
   * “Why the injection before the glucose drip? What would you have done if his bedside glucose had been low?”
   * “His knee reflexes were absent and his eyes would not move fully. What keeps Miller Fisher and Guillain–Barré
     syndromes on the list, and when would you send nerve conduction studies or anti-GQ1b antibodies?”
   * “The CSF was normal and the neostigmine test negative. What can each of those not exclude?”
   * “He had part of his colon removed as a newborn. Does that explain a thiamine deficiency?”
   * “The level was never measured. How would you write the diagnosis in his discharge letter?”
4. **Summary** — “What will you do the next time a child who vomits or eats poorly becomes drowsy with eye signs?”

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| “No alcohol, so not Wernicke”; anchoring on encephalitis (the course before admission) | decision 1 distractor (continue the antiviral and mannitol); mannitol and aciclovir are neutral, with responses that say why they are not indicated; the attending's Socratic questions |
| Waiting for the MRI or a level | `rb-thiamine-early` (critical) closes when the MRI is read; decision 2 distractor (level first); the thiamine assay “could not be done” |
| A glucose drip first | `glucose-infusion` is contraindicated before injected thiamine and `critical`; decision 2 distractor; the nurse reminds the learner not to hang a glucose drip before thiamine |
| Tablets as the first treatment | `thiamine-oral` contraindicated before injected thiamine; decision 2 distractor |
| IVIG or pulse steroids first | `ivig` contraindicated before injected thiamine; decision 1 distractors |
| Reading a normal CSF or a negative neostigmine test as exclusion | decision 3 distractor (“everything excluded”) |
| Stopping thiamine for a Leigh-type or venous-thrombosis reading, or for want of a level | decision 3 distractors |
| Feeding fast, or nil by mouth; no swallow screen | decision 4 distractors; `rb-feeding-steps` |
| Overstating the diagnosis or the colectomy | decision 5 distractors |

## Embodied mode

* **Where the patient is.** A ward bed (`inpatient`), lying (`posture: "lying"`), in a gown. He never leaves the
  ward: the MRI, CSF, neostigmine test, CSF pathogen tests, nerve conduction/EMG, the first-week progress notes and
  the outcome are records read at a records terminal (`requires: ["records"]`, `performedAt: "records"`,
  `risk: "none"`) — no transport to imaging or neurophysiology.
* **Who speaks.** The relative answers the history (`companion.answersHistory: true`); the boy answers questions
  about his vision and his dizziness (`speaker: "patient"` on `double-vision` and `dizziness`). He is drowsy but
  speaks, so there is no `nonVerbalWhen`. Which relative is with him is not recorded, so the companion has adult
  stature and no `presentation` (KIT §5), and is named neutrally.
* **Bedside and laboratory.** The capillary glucose (point-of-care) and weight and height (scale) are bedside
  checks with no recorded result; bloods go to the laboratory (chemistry, haematology, blood gas, serology).
* **IV access.** Not in place on arrival (`extensions.embodied.ivAccessInSitu: false`): `iv-access` (nursing)
  comes before injected thiamine, fluids, mannitol, aciclovir or IVIG.
* **Scope of practice.** IV access, the swallow screen and neurological observations are nursing; the dietitian
  and the surgical and gastroenterology review are consults; follow-up is a disposition.
* **Demonstration.** The in-world autopilot replays the reference path in the general hospital in en and zh-CN and
  finishes with the clinical-mode score (`embodied-autopilot.test.ts`, 2026-11-14); `caseCapabilityGaps` is empty.

## Source and adaptation (fidelity limits)

**From version 1.0.0 (kept as fact; not yet checked against the full article).** Age 9 and male sex; dizziness,
double vision and progressive leg weakness for six days; no improvement after treatment, with increasing
listlessness, somnolence and inability to walk; three days of treatment for presumed encephalitis at another
hospital without relief; mannitol and antiviral medicines used (the antiviral not named, no doses); vomiting once
a day in the week before onset; does not like meat (selective eating, 偏食); part of the colon removed for
intestinal atresia on day 4 of life; intermittent vomiting since that operation; bilateral ptosis, restricted
adduction and abduction, horizontal and vertical nystagmus; leg power grade III, knee reflexes not elicited, calf
tenderness, pathological signs negative; slightly weak gag reflex, accurate finger–nose test; the MRI description;
routine CSF and CSF biochemistry normal; blood count and muscle enzymes without obvious abnormality; neostigmine
test negative; quantitative vitamin B1 testing unavailable; vitamin B1 given; one week later double vision,
dizziness and eye movements improved and he walked a few metres; at one month leg power grade V and the MRI
reported normal; the report's diagnosis of vitamin B1 deficiency encephalopathy (its title).

**Extraction summary (1.0.0 → 1.1.0).** 1.0.0's `presentation`, `onset` and `progression` answers became
`presentation`, `double-vision`, `dizziness`, `leg-weakness` and `drowsiness`; `associated` became
`vomiting-week` and `diet`; `operations` → `neonatal-surgery`; `medications` → `prior-medicines`; `prior` →
`prior-treatment`; `baseline` → `vomiting-chronic`; its seven unknown items (past illnesses, allergies, family,
exposures, function, red flags, worries) became the unknown items `allergies`, `family`, `fever-infection`,
`swallowing`, `bowel-habit`, `growth`, `leg-sensation`, `regular-medicines`, `glucose-fluids` and the role's
`concerns`. Exam records 1–3 became `ex-eyelids`, `ex-eye-movements`, `ex-leg-power`, `ex-reflexes`, `ex-calves`,
`ex-gag` and `ex-coordination`. The MRI record → `mri` (work-up); “CSF and routine tests” → `csf`, `blood-count`,
`muscle-enzymes`; “differential tests and nutritional record” → `neostigmine-test`, `thiamine-level`, and the
history items `vomiting-chronic` and `diet`; the follow-up record → `week1-course` and `outcome`, with
`ex-eye-movements-week1`, `ex-gait-week1`, `ex-leg-power-month1`, the one-month `mri` result and the relative's
`status-week1` and `status-month1`.

**Adapted for teaching (labelled design, not facts of the report).** The relative and all dialogue (lay words
built on the recorded facts); the boy's few words; the relative's worries (will he walk again; is it something in
his brain that cannot be fixed); the four phases and the staging of the MRI, CSF and neostigmine test after the
first two decisions (the report does not say when they were done relative to the vitamin B1); placing the blood
count and muscle enzymes at admission (their timing is not recorded); showing the recorded somnolence and
inability to walk as admission findings (`ex-alertness`, `ex-gait`, labelled in their sources); the staff (Dr Ren,
attending; Nurse Bai; Dr Xu, radiologist; Pharmacist Qin); the bedside glucose, weight, blood gas, biochemistry,
antibody, CSF pathogen and nerve conduction tests, all without results; the decisions, interventions, rubric and
feedback (current guidance). The one-week and one-month findings are shown in the order the record gives them.

**Contradictions and ambiguities kept (not resolved).**
* The one-week outcome: 1.0.0's Chinese says “给维生素 B1 后 1 周” (one week after), its English “within a week”.
  The case says “by one week after vitamin B1 was started” / “1周”, and both readings are named in the record's
  source note.
* “Biochemistry”: the Chinese “脑脊液常规生化正常” is CSF routine and CSF biochemistry; the English “Routine
  CSF/biochemistry” could be read as blood biochemistry. The case follows the Chinese; blood biochemistry stays
  unknown.
* The vomiting before onset: Chinese “每天吐一次” (once a day), English “vomited daily” — the more specific Chinese
  is kept.
* The diet: “不爱吃肉” (does not like meat) and “偏食” (selective eating); 1.0.0's English “avoids meat” is
  rendered “does not like meat”.
* The one-month MRI: “1 个月下肢肌力 V 级，MRI 报告正常” does not say whether “one month” counts from the vitamin B1
  or from admission; the case says “at one month”.

**Inferences (derived, not new facts).** “For years” of intermittent vomiting (from day 4 of life to age 9);
“since infancy”; the leg-power scale meaning; the likely neuropathy (from weak legs, absent knee reflexes and calf
tenderness — labelled “probably”, no study recorded); the repeat MRI being a repeat (an MRI at admission and one
at one month).

**Unknown and kept unknown** (`unknowns`, unknown history items, `examNotRecorded`, records without results): his
weight, height and growth; vital signs and a conscious-level score; bedside glucose, electrolytes, blood gas and
lactate; the CSF and blood values; the vitamin B1 dose, route, frequency and duration and any other vitamins; the
fluids he received and whether they contained glucose; the antiviral's name and the doses of mannitol and the
antiviral; how encephalitis was diagnosed elsewhere; nerve conduction, anti-ganglioside antibodies and CSF
pathogen tests; upper-limb power, sensation, ankle reflexes, pupils and fundi; allergies, family history, fever or
infection, swallowing, bowel habit, leg pain or numbness, regular medicines; the details of the neonatal operation
(the extent of the resection, any small-bowel involvement); the cause of the long-standing vomiting; anything after
one month.

**What 1.0.0 got wrong, and what replaced it.** The template's three decisions of three options with one-line
feedback and role-named option ids; no interventions at all; 15 generic history slots with “the source notes do
not provide that information” in the carer's mouth; a critical rubric item that was a decision answered in
hindsight after the outcome (`safety`); a management key that only “assesses” thiamine treatment; a distractor
(“always withhold life-saving glucose”) that taught the glucose rule as a caricature. 1.1.0 treats with injected
thiamine before glucose at the bedside, scores that act in time, and keeps the hypoglycaemia caveat in the harm
text.

**Privacy.** Pseudonyms only (朱予宁 / Zhu Yuning, unique in the library); no dates, hospitals, places or
identifiers; times are relative.

**Figures.** One report figure group (`fig01`), approved in `scripts/cmcr-105-media-review.json` (local only,
sha256 recorded), is attached to the outcome record in the one-month phase only, because it may show follow-up
findings. Its content was not viewable in the authoring environment; the title says only that it holds clinical
images and may include follow-up findings.

## Matcher notes

* 57 `extensions.testUtterances` (29 zh-CN, 28 en), five look-alike negatives (blood pressure, school year,
  headache, the scan report, vaccinations), none equal to a canonical question; every required history item has
  at least two paraphrases.
* **Natural openers.** “What brings you in today?”, “What's the problem?”, “What seems to be the matter?”, “When
  did it start?” and “Tell me what's been going on” reach `presentation`; because the tokenizer drops stop words
  (“what”, “when”, “going”, “the”), these are compact keywords (`bringsyou`, `whatstheproblem`, `thematter`,
  `whendiditstart`, `goingon`), which match only as whole phrases.
* **Past history.** “Any past medical history?” / “以前得过什么病？” selects both `neonatal-surgery` and
  `vomiting-chronic` (the natural answer); both exclude 家族/家里/family so “Any family history?” stays with
  `family`.
* **Vomiting.** A bare “Has he been vomiting?” selects both vomiting items; `vomiting-week` excludes 平时/一直/
  长期/since the surgery, and `vomiting-chronic` excludes 发病前/before it started.
* **Phase twins.** `status-week1` supersedes `presentation`, `double-vision`, `dizziness` and `leg-weakness` in
  the first week; `status-month1` supersedes those and `status-week1` at one month, so “How is he now?” or “Can he
  walk now?” gets the stage's answer.
* **Collisions removed.** `growth` no longer uses “thin” (inside “anything”); `fever-infection` excludes
  “everything” (“of everything” contains “fever”); `leg-weakness` excludes pins/needles/numb/tingling;
  `leg-sensation` excludes 头疼/头痛/headache; `regular-medicines` excludes 吃饭/饭 so “平时吃饭怎么样？” reaches `diet`.
* **Interventions.** No item answers to a bare “thiamine” / “维生素B1”: “give thiamine” is ambiguous (named,
  nothing done) until the learner says the route — “IV thiamine”, “thiamine injection”, “肌注维生素B1” reach
  `thiamine-iv`; “oral thiamine”, “thiamine by mouth”, “口服维生素B1” reach `thiamine-oral`. Glucose words reach
  `glucose-infusion`, which excludes saline; `saline-fluid` excludes glucose.
* **Orders.** `orderMatching` keeps CSF pathogen tests apart from the CSF record, CSF words apart from blood
  biochemistry, and B12/B6/folate away from the thiamine assay; ordering the MRI, CSF or neostigmine test before
  decisions 1 and 2 explains when the work-up opens.

## References

1. 张波, 杨诺, 张艳凤, 郝云鹏, 王江涛, 陈银波. 小儿维生素B1缺乏性脑病一例. 中国小儿急救医学. 2014;21(3):193-194.
   doi:10.3760/cma.j.issn.1673-4912.2014.03.028. Available from: https://rs.yiigle.com/cmaid/70172
2. Galvin R, Bråthen G, Ivashynka A, Hillbom M, Tanasescu R, Leone MA. EFNS guidelines for diagnosis, therapy and
   prevention of Wernicke encephalopathy. Eur J Neurol. 2010;17(12):1408-1418. doi:10.1111/j.1468-1331.2010.03153.x
3. Sechi G, Serra A. Wernicke's encephalopathy: new clinical settings and recent advances in diagnosis and
   management. Lancet Neurol. 2007;6(5):442-455. doi:10.1016/S1474-4422(07)70104-7
4. Zuccoli G, Pipitone N. Neuroimaging findings in acute Wernicke's encephalopathy: review of the literature. AJR
   Am J Roentgenol. 2009;192(2):501-508. doi:10.2214/AJR.07.3959
5. da Silva JSV, Seres DS, Sabino K, Adams SC, Berdahl GJ, Citty SW, et al. ASPEN consensus recommendations for
   refeeding syndrome. Nutr Clin Pract. 2020;35(2):178-195. doi:10.1002/ncp.10474
6. van Doorn PA, Van den Bergh PYK, Hadden RDM, Avau B, Vankrunkelsven P, Attarian S, et al. European Academy of
   Neurology/Peripheral Nerve Society guideline on diagnosis and treatment of Guillain-Barré syndrome. Eur J
   Neurol. 2023;30(12):3646-3674. doi:10.1111/ene.16073
7. Kneen R, Michael BD, Menson E, Mehta B, Easton A, Hemingway C, et al. Management of suspected viral
   encephalitis in children - Association of British Neurologists and British Paediatric Allergy, Immunology and
   Infection Group national guidelines. J Infect. 2012;64(5):449-477. doi:10.1016/j.jinf.2011.11.013

The same strings are `debrief.references`. Checked on 2026-11-14: ref. 1 by the source map's publisher check
(2026-10-29); refs 2–7 against Europe PMC records (DOI, volume, issue, pages; PubMed 20642790, 17434099, 19155417,
32115791, 37814552, 22120594). EFNS 2010's nine recommendations and EAN/PNS 2023's treatment and antibody
statements were read in their abstracts; ABN/BPAIIG 2012's criteria for stopping aciclovir in the Encephalitis
Society's synopsis of the guideline; ASPEN 2020's paediatric thiamine, electrolyte and energy statements in
secondary summaries (BAPEN 2024 guidance; WikEM), as the consensus' full text was not reachable.

### To verify

* **Source pass (against the full article; `sourceTextChecked` stays false until then):** every fact above,
  especially the one-week outcome (“1 周” vs “within a week”), whether “生化” is CSF or blood biochemistry, the
  vomiting frequency, the exact examination wording (“眼球内收外展受限” — which eye or both), the MRI wording and
  timing, whether the neostigmine test, CSF and MRI came before or after the vitamin B1, the vitamin B1 dose and
  route, the antiviral's name, the extent of the neonatal resection (colon only, or small bowel too), anything
  after one month, and what the article's figure shows (to give `fig01` a precise title).
* **EFNS 2010:** the guideline's wording on duration of treatment (the case states none) and on children; the
  attribution of its four signs to Caine and colleagues is not stated in the case.
* **ASPEN 2020:** check the paediatric statements in the full consensus (thiamine 2 mg/kg to a maximum of 100–200
  mg/day before feeding or dextrose-containing fluids; potassium, magnesium and phosphate before feeding and every
  12 hours for 3 days in high-risk patients; energy started at 40–50 % of goal) — the case quotes only the
  qualitative steps — and its paediatric risk criteria, which this case cannot apply without a weight or intake.
* **EAN/PNS 2023:** the full-text wording on normal CSF protein early in Guillain–Barré syndrome (the case says
  only that it “can be normal early”).
* **Zuccoli and Pipitone 2009:** the case says atypical sites such as the basal ganglia are reported “mainly in
  patients without alcohol use”; the review and the authors' 2009 AJNR series support this, a 2010 letter
  disputes how sharp the difference is.
* **Clinician input:** a paediatric neurologist should confirm the bedside key (treating as Wernicke encephalopathy
  before the scan in this boy), the `critical` status of a glucose drip before thiamine, and the advice to agree a
  weight-based paediatric thiamine dose with the pharmacist rather than print one; a paediatric dietitian should
  review the refeeding key.

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Template replaced.** Three single-best decisions of three options with role-named ids (`supported`,
  `alternative-1`…) and one-line feedback became five decisions at the real decision points (bedside diagnosis,
  thiamine regimen, work-up interpretation, safe refeeding, outlook) with 4–5 options each, content-named ids and
  feedback of their own that names its guidance. 15 generic history slots, seven of them “the source notes do not
  provide that information”, became 23 items in the relative's and the boy's own words, unknowns said in voice.
  The phases `initial`/`workup`/`followup` became `admission` → `workup` → `first-week` → `one-month`, all
  forward-only, the outcome waiting for every decision.
* **Safety fixes.** 1.0.0 had no interventions, its management key only “assessed” thiamine treatment, and its
  critical rubric item was a decision answered after reading the outcome. 1.1.0 keys injected thiamine at the
  bedside before glucose and before the scan, scores it in time (`rb-thiamine-early`, critical), makes a glucose
  drip before thiamine a critical safety failure (`glucose-infusion`, `rb-no-glucose-first`), and keeps glucose
  for hypoglycaemia in the harm text instead of 1.0.0's “always withhold life-saving glucose” distractor.
* **Interventions added (13).** The report's (vitamin B1; the mannitol and antiviral used before admission),
  today's (IV access with a pre-dose sample, injected thiamine, glucose-free fluid, swallow screen, neurological
  observations, dietitian, surgical and gastroenterology review, neurology follow-up) and the tempting wrong ones
  (oral-only thiamine, a glucose-containing drip, IVIG first).
* **Investigations.** 15: the decisive records split into MRI, CSF, neostigmine test, blood count, muscle enzymes
  and the thiamine assay, the progress notes and the outcome; bedside glucose, weight, biochemistry, blood gas,
  anti-ganglioside antibodies, CSF pathogen tests and nerve conduction added without results.
* **Teaching.** Six learning outcomes; six teaching points, five dated and guideline-attributed (EFNS 2010,
  Zuccoli and Pipitone 2009, EAN/PNS 2023, ABN/BPAIIG 2012, ASPEN 2020); a 13-item rubric with two critical items and
  three safety items; staff (attending, nurse, radiologist, pharmacist); seven Vancouver references with verified
  DOIs; 57 test utterances; this facilitator guide.
* **Facts.** Nothing added. The Chinese “每天吐一次” (once a day) restored where 1.0.0's English said “daily”; the
  one-week and biochemistry discrepancies named; the specialty `nutrition` dropped (`pediatrics`, `neurology`).
* **Ids changed** (none referenced outside this case): phases, history items (`onset`, `progression`,
  `associated`, `pmh`, `operations`, `medications`, `exposure`, `function`, `redflags`, `prior`, `baseline` →
  the items above), exam `exam-1…3` → `ex-*`, investigations `differential` → `neostigmine-test` and
  `thiamine-level`, objectives `history`/`evidence`/`reasoning`/`review` → `obj-*`, decisions
  `interpretation`/`management`/`safety` → the five above, rubric ids → `rb-*`.

### 1.0.0

* 2026-10-28 — template version authored for PR #5 (`cmcr-105`): three decisions of three options, no
  interventions, 15 history slots, record review of three reports and the follow-up, review status
  “unreviewed”.

## Validation

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-70172/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-70172 --lang en             # solution 81 steps · objectives 6/6 · decisions 5/5 · utterances 57/57 · rubric 28/28 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-70172   # reference 100 % · do nothing 0/23 · wrong first at every decision 57 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-70172:"                 # 1 passed
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-70172:"  # 1 passed (en + zh-CN)
```

Run on 2026-11-14 from the worktree root; all five pass.

## 中文摘要

**病例概要。** 9岁男孩，头晕、复视、双下肢进行性无力6天，精神越来越差、嗜睡，已不能行走；外院按脑炎治疗3天（用过甘露醇和抗病毒药）
无好转。出生第4天因肠闭锁行部分结肠切除，此后间断呕吐，发病前一周每天呕吐一次，不爱吃肉（偏食）。查体：双侧上睑下垂，眼球内收、
外展受限，水平及垂直眼震；双下肢肌力Ⅲ级，膝反射未引出，病理征阴性，腓肠肌压痛；咽反射稍弱，指鼻试验稳准。头颅MRI示双侧丘脑、
豆状核及穹隆对称性异常信号，FLAIR高信号，豆状核DWI稍高；脑脊液常规、生化正常，血常规和肌酶无明显异常，新斯的明试验阴性，无法开展
维生素B1定量。给予维生素B1（剂量、途径和疗程未记录）后1周，复视、头晕和眼球运动改善，能走数米；1个月时双下肢肌力Ⅴ级，MRI报告正常。
诊断：维生素B1缺乏性脑病（韦尼克脑病），由MRI和治疗反应支持的临床诊断，可能合并硫胺素缺乏性周围神经病。

**学习目标。**
1. 在与饮酒无关的情形下，依据眼征、清醒程度下降和营养风险识别韦尼克脑病，把EFNS 2010的诊断标准当作提醒而不是门槛。
2. 在任何含葡萄糖的液体之前、不等血药浓度或MRI，注射治疗剂量的维生素B1（EFNS 2010），并与药师按体重确定儿童剂量。
3. 结合查体、脑脊液、新斯的明试验和MRI，与米勒-费希尔/吉兰-巴雷综合征、脑炎和重症肌无力鉴别，说明正常结果排除不了什么（EAN/PNS 2023）。
4. 解读硫胺素缺乏的MRI表现，并解释MRI正常也不能排除诊断。
5. 风险无法分级时按有风险安排再喂养：喂养前补充硫胺素，监测钾、镁、磷，逐步加量（ASPEN 2020），咽反射减弱时先做吞咽筛查。
6. 如实表述未经测定的临床诊断，处理病因并安排神经科随访。

**关键决策。** ① 检查结果回报前，在床旁按维生素B1缺乏所致韦尼克脑病（可能合并周围神经病变）治疗，同时排查其他病因；② 现在就注射
治疗剂量的维生素B1（首选静脉）、先于任何含葡萄糖的液体，称体重定剂量但不等化验；③ 入院检查支持诊断，但早期脑脊液正常排除不了
吉兰-巴雷综合征；④ 查血糖、钾、镁、磷并在加量期间复查，先做吞咽筛查，与营养师一起逐步加量；⑤ 由治疗反应支持、未经测定的临床
诊断：继续维生素B1，查找呕吐和偏食的原因，安排随访。

**复盘要点（PEARLS）。** 先谈在结果回报前就开始治疗的感受；复述是什么让人想到一个9岁孩子的维生素缺乏；分析环节聚焦：EFNS 2010的
四项体征他具备哪些、哪些无法确定；为什么先注射再输葡萄糖、血糖低时怎么办；膝反射消失和眼肌麻痹为何让米勒-费希尔/吉兰-巴雷综合征
留在鉴别中；正常脑脊液和阴性新斯的明试验各自排除不了什么；新生儿期结肠切除能否解释缺乏；没有测得水平时出院诊断怎样写。

**安全结果。** 在注射维生素B1之前输注含葡萄糖的液体（`glucose-infusion`）为危急错误（`critical: true`），无论得分如何，本次评估的安全结果
均判为未通过；单纯口服维生素B1或先用免疫球蛋白为可纠正的判断失误（`critical: false`），记为禁忌操作并扣分。本病例为人工智能辅助编写、
经编辑审核的教学材料，尚未经执业医师审核，事实尚未对照原文全文核对。
