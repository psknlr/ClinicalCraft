# cmcr-639083 — Low blood glucose · 11-hour-old girl

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (周予宁 / Zhou Yuning) is a
> pseudonym, and her relative, the attending (孟医生 / Dr Meng), the nurse (邹护士 / Nurse Zou), the endocrinology
> consultant (钱医生 / Dr Qian), the radiologist (秦医生 / Dr Qin) and the pharmacist (鲁药师 / Pharmacist Lu) are
> teaching roles. The case adapts one published case report; it is not medical advice.
> 导师指南，含剧透。患者为化名，家属与医护人物为教学角色；本病例改编自已发表的单例报告，不构成医疗建议。

**Status of the facts.** Version 1.1.0 was re-authored from the facts recorded in version 1.0.0 (commit
`88ed0d2`), the only fact base available in the authoring environment. Those facts have **not yet been
checked against the full source article** (`extensions.sourceTextChecked: false`); the source pass follows
when the article text is available. Everything listed under "To verify" belongs to that pass.

## Case card

| | |
|---|---|
| id / version | `cmcr-639083` · `1.1.0` · CMCR additional collection (`cmcr-105`) |
| Source | 桑艳梅, 李文京, 王焕民, 徐子迪. 胰腺局灶增生型先天性高胰岛素血症一例. 中华糖尿病杂志. 2013;5(11):705-707 |
| Setting / facility | Newborn care on a ward bed (`inpatient`) / `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 min (static clock; five phases, five decisions, 16 investigations, 19 interventions) |
| Specialty | Neonatology, endocrinology, paediatric surgery, genetics (`neonatology`, `endocrinology`, `pediatric-surgery`, `genetics`) |
| Languages | `zh-CN` (source language), `en` |
| Learner level | Final-year students, paediatric and neonatal residents; neonatal nurses for the first two phases |
| Review status | `editorial`, 2026-10-30 — AI-assisted teaching design with an editorial review against the cited guidance; **not yet reviewed by a licensed clinician**, and the patient facts are not yet checked against the full article. Have a neonatologist and a paediatric endocrinologist review it before teaching use |
| Phases | `first-low` 生后11小时：第一次血糖偏低 / 11 hours old: the first low glucose → `recurrent` 此后：低血糖反复出现 / Afterwards: the lows keep coming back → `medical` 药物治疗期间 / On medical treatment → `localisation` 转诊与专科检查 / Referral and specialist tests → `outcome` 报告记录的转归与随访 / The recorded outcome and follow-up — none learner-switchable |
| Content | 23 history items (6 required, 10 unknown; the relative answers) · 1 examination finding (the only one 1.0.0 records) · 16 investigations (4 record reviews; 8 results with no record) · 19 interventions (5 always contraindicated, 3 contraindicated in the wrong order) · 6 objectives · 5 decisions (20 options) · 12 rubric items (11 deterministic, weight 29; 1 examiner-judged; 2 critical) · 5 staff · 6 learning outcomes · 6 teaching points · 38 test utterances |

## Learning outcomes

After the case the learner can:

1. Treat recurrent neonatal hypoglycaemia at once — 10% glucose 2 mL/kg IV, then a continuous infusion adjusted by
   glucose infusion rate (AAP 2011) — and take the critical sample during a low without delaying treatment.
2. Interpret a critical sample by the 2024 international hyperinsulinism guideline — measurable insulin and
   C-peptide with β-hydroxybutyrate < 1.8 mmol/L at a glucose < 2.8 mmol/L — keep glucose above 3.9 mmol/L once a
   persistent disorder is suspected (PES 2015), and tell it from transitional hypoglycaemia, hypopituitarism and
   fatty-acid oxidation disorders.
3. Start diazoxide safely in an infant with an atrial septal defect and a patent ductus — a low starting dose with a
   thiazide, and fluid and pulmonary-hypertension surveillance (FDA 2015; PES 2020) — and judge the response by a
   supervised fast in hospital, never a fast at home.
4. When diazoxide fails, send urgent ABCC8/KCNJ11 testing for the baby and both parents, refer for ¹⁸F-DOPA PET at a
   specialist centre, and explain why a normal ultrasound or MRI cannot exclude a focal lesion (2024 international
   guideline).
5. Choose a PET-guided limited pancreatectomy with frozen-section margins over near-total pancreatectomy for focal
   disease, and state the consequences of each.
6. Explain to the family what a variant found in neither parent means for the focal mechanism and for future
   pregnancies, and plan follow-up: a fast to confirm cure, neurodevelopmental assessment and genetic counselling.

These are the case's `learningOutcomes`; they name the diagnosis, so front-ends show them before play only behind
the closed "Learning outcomes (6) · may reveal the diagnosis" disclosure and list them in every debrief
(CASE_AUTHORING §9.4, GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A girl born at term by vaginal delivery, weighing 4.05 kg and without asphyxia, to non-consanguineous parents with no
family history of hypoglycaemia or diabetes and a mother who was healthy in pregnancy with no history of glucose
intolerance, had a low glucose at 11 hours of age and repeated readings below 2.8 mmol/L afterwards. No signs during
the lows, feeding details, vital signs or examination beyond the birth weight are recorded.

**Work-up:** a sample taken during hypoglycaemia (age at sampling not recorded) showed glucose 1.8 mmol/L, insulin
11 µU/mL, C-peptide 0.74 nmol/L and β-hydroxybutyrate 0.5 mmol/L; an ammonia result exists but its unit is doubtful
and its value is not carried in the case. Thyroid function and ACTH were normal; pancreatic ultrasound and brain and
pituitary MRI showed no abnormality; the echocardiogram showed an atrial septal defect, a patent ductus arteriosus and
mild tricuspid regurgitation.

**Course:** frequent hypoglycaemia continued despite diazoxide and octreotide (doses, order and duration not in the
case). After a later referral (age not recorded), ABCC8 c.1792C>T, p.(Arg598*) (the report's p.Arg598X) was found in
her and not at this position in either parent, with no KCNJ11 abnormality, and ¹⁸F-DOPA localised a 12.2 × 9.5 mm
lesion in the distal pancreatic body. A focal partial resection was done and histology confirmed the focal form
(**focal congenital hyperinsulinism**, 胰腺局灶增生型先天性高胰岛素血症). At "three months" — of age or after surgery, the
case does not say — fasting glucose was about 4.4–6.0 mmol/L and post-meal glucose about 7 mmol/L. Long-term
neurodevelopment, recurrence and pancreatic function are not recorded.

**Today's answer:** IV 10% glucose (2 mL/kg, then an infusion) and a critical sample at the first recurrent lows;
read the sample against the glucose (2024 international guideline); diazoxide from a low dose with a thiazide and
pulmonary-hypertension surveillance because of the ASD/PDA (FDA 2015; PES 2020); once it fails, urgent ABCC8/KCNJ11
testing with both parents, referral to an experienced centre and ¹⁸F-DOPA PET; a PET-guided limited resection with
frozen sections, a fast to confirm cure, neurodevelopmental follow-up and genetic counselling.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires. The case shows
the recorded states only; no response to the learner's treatment is simulated, and every intervention's response
says what the case does and does not record.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `first-low` (initial) | 11 hours of age | start | the nurse's handover (her glucose has just been found low), the relative's history (birth, pregnancy, family; unrecorded items answered honestly; a labelled worry), the birth-weight finding, the learner's own bedside recheck "low, value not recorded" (critical), first-response interventions (glucose checks, feeds, IV access, IV glucose) |
| `recurrent` | afterwards (times not recorded) | objective `obj-first-look` complete (history core, size, bedside glucose read, glucose checks set up) | the relative's account of the further lows, repeated bedside readings below 2.8 mmol/L (critical), the critical sample (critical), ammonia (doubtful unit), thyroid, ACTH/cortisol/GH, FFA/lactate and metabolic screen (no result), pancreatic ultrasound, brain/pituitary MRI, echo; decisions 1, 2 and 3 |
| `medical` | during drug treatment (timing not recorded) | `obj-stabilise` and `obj-read-sample` complete, decision 3 right, diazoxide given | the treatment record (diazoxide and octreotide, frequent lows), bedside glucose, the relative's account and worries; decision 4; genetics and referral as acts |
| `localisation` | later (age at referral, timing and place not recorded) | decision 4 right, genetic samples sent, referral made | the genetic report (baby and parents) and the ¹⁸F-DOPA PET report (record reviews); decision 5; the operation as an act |
| `outcome` | the operation and "three months" | all five decisions right and the partial pancreatectomy arranged | the reported treatment and outcome record, the follow-up glucose, the relative's account; the follow-up plan |

Gates are written so that nothing confirming can be read before the act or decision it would give away: the drug
record (which shows that diazoxide was used) opens only after decision 3; the genetic and PET reports only after
decision 4 and the acts that lead to them; the outcome only after every decision and the operation. The `medical`
phase also waits for IV glucose (inside `obj-stabilise`) and diazoxide, so neither can be credited in hindsight.
Order-entry notices say that the genetic and PET reports exist only at the referral stage
(`orderMatching.warnings`).

## Decisions and assessment

### Objectives (HUD chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-first-look` Take the handover and assess the baby | onset, birth, mother's glucose, family asked; size examined; bedside glucose read in `first-low`; glucose checks set up |
| 2 | `obj-stabilise` Make her glucose safe and catch a sample during a low | recurrence asked; bedside glucose read in `recurrent`; critical sample ordered in `recurrent`; IV glucose bolus and infusion given; decision 1 right |
| 3 | `obj-read-sample` Read what the sample taken during the low shows | critical sample, thyroid, ACTH read in `recurrent`; decision 2 right |
| 4 | `obj-medicines` Start treatment safely and judge the response | echo read; decision 3 right; diazoxide given; treatment record read in `medical`; decision 4 right; genetics sent; referral made |
| 5 | `obj-specialist-tests` Read the specialist centre's tests and decide the treatment | genetic and PET reports read in `localisation`; decision 5 right; partial pancreatectomy arranged |
| 6 | `obj-outcome` Review the recorded outcome and plan follow-up | outcome record read; follow-up plan made |

Titles and hints name no diagnosis and contain no option text (the journal lists later titles early).

### Decisions

| id | Opens after | Key | Distractors (why they tempt) |
|---|---|---|---|
| `first-response` | recurrence asked, bedside glucose read in `recurrent`, birth, mother's glucose and size known | `iv-glucose-and-sample`: IV access, critical sample during the low without delay, 10% glucose 2 mL/kg then an infusion, keep feeding, frequent checks, target > 3.9 mmol/L | `feed-and-gel` (first 48 h "transitional"); `results-before-glucose` (protect the sample); `strong-glucose-push` (50 % glucose for speed) |
| `sample-reading` | critical sample, thyroid and ACTH read | `insulin-excess`: measurable insulin and C-peptide with suppressed ketones at 1.8 mmol/L; keep > 3.9 mmol/L; persistence beyond the transitional days; repeat the ammonia | `normal-transition` (insulin "in the fasting range"); `fat-oxidation-defect` (hypoketotic hypoglycaemia); `cortisol-deficiency` (empirical hydrocortisone) |
| `first-medicine` | decision 2, echo read | `diazoxide-with-thiazide`: low start within 5–15 mg/kg/day, thiazide, IV glucose while titrating, weights, fluids, repeat echo, supervised fast after several days | `diazoxide-full-dose` (maximum dose, fluid restriction, failure on day 2); `octreotide-first` (avoid diazoxide because of the heart); `steroid-cover` (hydrocortisone, floor 2.8 mmol/L) |
| `after-medicines` | treatment record read in `medical`, pancreatic ultrasound read | `genes-then-pet`: diazoxide-unresponsive HI → urgent ABCC8/KCNJ11 with both parents, experienced centre, ¹⁸F-DOPA PET if focal is suggested, glucose kept safe | `near-total-now` (normal ultrasound = diffuse); `ct-mri-search` (look for an insulinoma first); `home-with-meter` (maximal octreotide and home) |
| `operation` | genetic and PET reports read | `limited-resection`: PET-guided partial pancreatectomy, frozen-section margins, fast to confirm cure | `near-total-to-be-safe` (variant absent from parents "acts dominant"); `pet-false-positive` (not paternal, so not focal); `enucleate-without-frozen` (spare tissue, no frozen sections) |

Every option has its own feedback (2–4 sentences naming the guidance, issuing body and year). Option ids name their
content. The key is the uniquely longest option in at most one decision per locale (`first-response` in zh-CN; none
in en).

### Rubric (11 deterministic items, weight 29, + 1 examiner-judged)

| id | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history-course` | history | 2 | onset, birth, mother's glucose, family, recurrence asked |
| `rb-history-gaps` | history | 1 | signs during the lows, feeding, mother's medicines asked (all unrecorded: asking is the competency) |
| `rb-size` | examination | 1 | birth weight assessed for gestation |
| `rb-iv-glucose` | safety | 4 | **critical** — IV 10% glucose bolus and continuous infusion given (the later phases wait for both, so they cannot be given in hindsight) |
| `rb-sample-and-workup` | investigations | 2 | critical sample ordered and read in `recurrent`; thyroid, ACTH and echo read |
| `rb-first-response` | management | 3 | decision 1 right first time |
| `rb-mechanism` | diagnosis | 3 | decision 2 right first time |
| `rb-diazoxide-safety` | safety | 3 | decision 3 right first time; diazoxide and thiazide given |
| `rb-after-medicines` | management | 3 | decision 4 right first time; genetic samples sent; referral made |
| `rb-operation` | management | 3 | decision 5 right first time; partial pancreatectomy arranged |
| `rb-no-harm` | safety | 4 | **critical** — none of: 50 % glucose push, empirical hydrocortisone, a fast at home, near-total pancreatectomy, discharge without a fasting check; `scoredWhen` = decision 1 attempted or any of those five acts |
| `rb-communication` | communication | (judged) | Calgary–Cambridge conversation with the family (see judge guidance) |

**Critical items are acts**, not decisions: `rb-iv-glucose` (the missed life-saving act) and `rb-no-harm` (the
dangerous errors). Three further wrong-order acts are flagged as contraindicated safety events in the debrief without
a rubric penalty (the rubric cannot express "A before B"): diazoxide before the critical sample has been read,
octreotide before diazoxide, and a partial pancreatectomy before the PET report has been read.

### How wrong choices score (measured 2026-10-30 with core `assess`)

| Path | Score | Critical items missed |
|---|---|---|
| Reference path (`solution`) | 29/29 (100 %) | none |
| Do nothing (start, then try to finish) | 0/25 (finish refused: objectives incomplete) | `rb-iv-glucose` |
| A wrong first answer at every decision, then the right one | 14/29 (48 %) | none |
| A wrong first answer at one decision only (each of the five) | 26/29 (90 %) | none |
| Reference path plus any one of the five dangerous acts | 25/29 (86 %), and the act is a contraindicated safety event | `rb-no-harm` |
| Reference path without the thiazide | 26/29 (90 %) | none |
| Reference path without the three unrecorded-history questions | 28/29 (97 %) | none |
| Decisions 1 and 2 answered but no IV glucose (the case cannot move past `recurrent`) | 14/29 (48 %) so far; cannot finish | `rb-iv-glucose` |
| Reference path plus octreotide before diazoxide | 29/29, with octreotide listed as a contraindicated act | none |

## Reference path (`solution`)

76 steps: start → twelve admission questions (onset, birth, birth weight, Apgar, mother's glucose and medicines,
family, signs during the lows, feeding, medicines since birth, vaccines, the relative's worry — five of them
unrecorded, which teaches what to ask) → size → bedside glucose (`first-low`) → feeds, glucose checks →
(`recurrent`) the further lows → bedside glucose → IV access, critical sample, 10% glucose bolus, infusion →
decision 1 → critical sample, thyroid, ACTH/cortisol/GH, ammonia, FFA/lactate, metabolic screen → decision 2 → echo,
pancreatic ultrasound, brain/pituitary MRI → decision 3 → thiazide, diazoxide → (`medical`) the relative's account,
doses, side effects, worries → bedside glucose, treatment record → decision 4 → genetic samples, referral →
(`localisation`) the relative's account, age at referral, worries → genetic and PET reports → decision 5 → partial
pancreatectomy → (`outcome`) the relative's account, development, pancreatic function → follow-up glucose, outcome
record → follow-up plan → finish. It scores 29/29 with no contraindicated act, in clinical and in-world mode, in both
languages.

## Clinical numbers check

Every patient value below is from version 1.0.0 (field in brackets) and keeps its unit; none is new. The source check
against the full article is pending.

| Value | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| Hypoglycaemia from 11 hours of age (stored 0.4583 days; core shows "11 hours") | `patient.age`, history `onset`, `chiefComplaint` | `patient.age`, title, triage note, history `onset`, `bedside-glucose` (`first-low`; value not recorded) |
| Repeated glucose readings < 2.8 mmol/L afterwards | history `recurrent` | history `recurrence`, `bedside-glucose` (`recurrent`, value "repeatedly < 2.8 mmol/L"), decision 1 prompt |
| Term, vaginal birth, 4.05 kg, no asphyxia | history `birth`, exam `birth-review`, `patient.weightKg` | history `birth`, `birth-weight`, `apgar` (no asphyxia; scores not recorded), exam `size`, triage note, `patient.weightKg` |
| Mother healthy in pregnancy, no history of glucose intolerance | history `maternal` | history `maternal-glucose` |
| Non-consanguineous parents; no family history of hypoglycaemia or diabetes | history `family` | history `family` |
| Glucose 1.8 mmol/L, insulin 11 µU/mL, C-peptide 0.74 nmol/L, β-hydroxybutyrate 0.5 mmol/L | `critical` (workup) text | `critical-sample` (`recurrent`) values, critical |
| Ammonia reported with a doubtful unit; value not normalised | `critical` text | `ammonia` (`recurrent`): "result exists, unit doubtful, value not shown" |
| Pancreatic ultrasound and brain/pituitary MRI without abnormality | `imaging` (workup) | `pancreas-us`, `brain-mri` (`recurrent`) |
| Echo: ASD (房缺), PDA, mild tricuspid regurgitation | `imaging` | `echo` (`recurrent`) |
| Thyroid function and ACTH normal | `imaging` | `thyroid`, `acth-cortisol` (`recurrent`) |
| Diazoxide and octreotide tried; frequent hypoglycaemia continued; historical doses withheld | `response` (workup) | `drug-course` (`medical`), `bedside-glucose` (`medical`), history `status-medical`, intervention responses |
| ABCC8 c.1792C>T (p.Arg598X); parents normal at this position; no KCNJ11 abnormality | `localisation` (confirmation) | `genetics` (`localisation`), written c.1792C>T, p.(Arg598*) |
| ¹⁸F-DOPA localised a 12.2 × 9.5 mm lesion in the distal pancreatic body | `localisation` | `dopa-pet` (`localisation`) |
| A later referral; age at referral not recorded | triage note, `nonVerbalReason`, README | phase `localisation` description, history `status-localisation`, `referral-age` (unknown), `refer-specialist-centre` response |
| Focal partial resection; histology confirmed the focal form | `followup` | `outcome` (`outcome`), history `status-outcome`, `partial-pancreatectomy` response |
| At three months fasting glucose about 4.4–6.0, post-meal about 7 mmol/L | `followup` | `outcome`, `bedside-glucose` (`outcome`), history `status-outcome` |
| Long-term neurodevelopment, recurrence and pancreatic function not provided | `followup` | history `development`, `pancreas-function` (unknown), unknowns |

**Reference ranges.** None is recorded; every lab value carries "reference range not recorded". Glucose values
carry flag L; no other analyte is flagged, because the abnormality of insulin, C-peptide and ketones lies in their
relation to the glucose, which decision 2 asks the learner to judge.

**Derived values (facilitator orientation only; not shown to learners).**
* Glucose 1.8 mmol/L ≈ 32 mg/dL; 2.8 mmol/L ≈ 50 mg/dL; 3.9 mmol/L ≈ 70 mg/dL; 1.7 mmol/L ≈ 30 mg/dL; fasting
  4.4–6.0 mmol/L ≈ 79–108 mg/dL; post-meal 7 mmol/L ≈ 126 mg/dL (× 18).
* Insulin 11 µU/mL ≈ 66 pmol/L (× 6.0) or ≈ 76 pmol/L (× 6.945), depending on the laboratory's factor.
* C-peptide 0.74 nmol/L ≈ 2.2 ng/mL (÷ 0.331).
* β-hydroxybutyrate 0.5 mmol/L against the 2024 guideline's < 1.8 mmol/L at a glucose < 2.8 mmol/L.
* Birth weight 4.05 kg: over 4 kg (macrosomia, 巨大儿 ≥ 4,000 g); no gestation in weeks or centile is recorded, so
  "large for gestational age" cannot be stated.
* Weight-based orientation on the birth weight (her later weights are not recorded; the case prints only formulas):
  bolus 2 mL/kg of 10% glucose ≈ 8.1 mL (200 mg/kg ≈ 810 mg); an infusion of 5–8 mg/kg/min with 10% glucose ≈
  12–19 mL/h (GIR = % × mL/h ÷ 6 ÷ kg); diazoxide 5–15 mg/kg/day ≈ 20–61 mg/day.
* PET lesion 12.2 × 9.5 mm; no third dimension or uptake value is recorded.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "The first low came at 11 hours and kept coming back. How did that feel at the cot side, with her
   relative asking whether it was serious?"
2. **Description** — "Take me from the first low through the treatment, the sample and the tests you read."
3. **Analysis**
   * "At 11 hours, what made you think beyond transitional hypoglycaemia — and what told you once the lows recurred?"
   * "What does an insulin of 11 µU/mL mean at a glucose of 1.8 mmol/L? Which results that would strengthen the
     diagnosis are missing here?"
   * "Why draw the sample before the glucose goes in — and why not wait for the result?"
   * "What did 4.05 kg and a mother without glucose intolerance add?"
   * "How did the ASD and PDA change the way you started diazoxide?"
   * "When can you call diazoxide a failure? Why not near-total pancreatectomy at that point?"
   * "Why a PET scan when the ultrasound and MRI were normal? Why test both parents?"
   * "The variant was found in neither parent. How can the lesion still be focal, and what does it mean for a
     future pregnancy?"
   * "Glucose was normal at three months. What does that tell us — and what does it not?"
4. **Summary** — "What will you do in the first hour the next time a big baby of a non-diabetic mother keeps going
   low?"

### Common learner errors and how the case surfaces them

| Error | What the case does | Where it scores |
|---|---|---|
| Treating recurrent lows as transitional (feeds, gel, wait for symptoms) | `feed-and-gel`; progress waits for IV glucose | `rb-first-response`, `rb-iv-glucose` |
| Waiting for the laboratory before IV glucose | `results-before-glucose` | `rb-first-response` |
| 50 % glucose in a newborn | `strong-glucose-push`; `concentrated-glucose-push` contraindicated | `rb-first-response`, `rb-no-harm` |
| Reading insulin 11 µU/mL against a fasting range | `normal-transition` | `rb-mechanism` |
| Low ketones read as a fatty-acid oxidation defect | `fat-oxidation-defect` | `rb-mechanism` |
| Empirical steroids for neonatal hypoglycaemia | `cortisol-deficiency`, `steroid-cover`; `hydrocortisone` contraindicated | `rb-mechanism`, `rb-diazoxide-safety`, `rb-no-harm` |
| Diazoxide at full dose without a diuretic despite ASD/PDA; failure called on day 2 | `diazoxide-full-dose`; thiazide scored | `rb-diazoxide-safety` |
| Octreotide first in a newborn | `octreotide-first`; octreotide contraindicated before diazoxide | `rb-diazoxide-safety`, safety event |
| Blind near-total pancreatectomy after a normal ultrasound | `near-total-now`, `near-total-to-be-safe`; contraindicated | `rb-after-medicines`, `rb-operation`, `rb-no-harm` |
| Searching for an insulinoma with CT/MRI or invasive venous sampling | `ct-mri-search`; `pancreas-ct` low-value, `venous-sampling` harmful (no result) | `rb-after-medicines` |
| Discharge or a fast at home | `home-with-meter`; `discharge-home`, `home-fast` contraindicated | `rb-after-medicines`, `rb-no-harm` |
| "Not paternal, so not focal" | `pet-false-positive` | `rb-operation` |
| Operating without frozen sections | `enucleate-without-frozen` | `rb-operation` |

## Embodied mode

* **Where she is.** A ward bed in the general hospital stands in for the newborn unit (`inpatient`); she lies in her
  cot and is moved only for the brain MRI (`brain-mri`, performed at the scanner). The treatment record, genetic
  report, PET report and outcome record are record reviews (`performedAt: "records"`, `requires: ["records"]`, risk
  none), read at a records terminal or the nursing station; the later phases need no transport.
* **Bedside tests.** The bedside glucose (`point-of-care`) comes with the glucometer cart; the pancreatic
  ultrasound and the echo (`performedAt: "bedside"`) with the portable ultrasound cart.
* **IV access** is a nursing procedure (`iv-access`, the treatment or crash cart) placed before the first IV item;
  it draws the bloods, so the critical sample, thyroid, ACTH, ammonia and other laboratory samples are taken at the
  patient and read at a records terminal or the bedside. The glucose infusion needs the infusion pump.
* **She cannot speak** (`nonVerbalWhen: {always: true}`, reason "a young baby who cannot talk yet"): her relative
  (`companion`, role `carer`, "周予宁的家属（化名）/ Zhou Yuning's relative (pseudonym)") answers every question; the
  opening line is the relative's.
* **Scope of practice.** IV access, glucose checks, feeds and the glucose bolus and infusion are nursing scope;
  sending the genetic samples, the supervised fast and the follow-up plan are a doctor's acts; drugs follow their
  kinds; the referral and both operations are consults (an operation is arranged, not performed on the ward).
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-639083:"` passes: the offline demonstration finishes
  in-world in en and zh-CN with every objective done and the clinical-mode score.

## Source and adaptation (fidelity limits)

**From the facts of version 1.0.0 (kept, reorganised into phases and lay speech, not yet checked against the
article).** Sex; hypoglycaemia from 11 hours of age and repeated readings below 2.8 mmol/L; term vaginal birth,
4.05 kg, no asphyxia; a mother healthy in pregnancy without glucose intolerance; non-consanguineous parents without a
family history of hypoglycaemia or diabetes; the critical sample (glucose, insulin, C-peptide, β-hydroxybutyrate) and
the doubtful ammonia unit; normal pancreatic ultrasound, brain and pituitary MRI, thyroid function and ACTH; the echo
findings; diazoxide and octreotide with continued frequent hypoglycaemia; a later referral of unrecorded age; the
ABCC8 variant, the parents' result at that position and the KCNJ11 result; the ¹⁸F-DOPA localisation; the focal
partial resection with focal histology; the glucose at three months; the absence of long-term data.

**Moved to the phase where it is true.** The 1.0.0 chief complaint ("hypoglycaemia began at eleven hours and
recurred") sat beside an age of 11 hours. The case now opens at the first low (11 hours, value not recorded) and
moves the recurrences into the next phase without inventing their times; every later result carries "timing not
recorded". The diazoxide/octreotide record, which 1.0.0 showed before the mechanism decision (and so gave its answer
away), opens only after decision 3. The outcome's glucose also appears as the relative's account and a follow-up
bedside reading in the final phase.

**Adapted for teaching (labelled).** The encounter staging: the case opens at the moment the low glucose at 11 hours
is found, with a nurse handing over and a relative at the cot (1.0.0 records the low glucose at 11 hours, not how
it was measured or who was present — the learner's bedside recheck returns "low, value not recorded"). The relative
(which relative is not recorded — the persona says so), all dialogue, the two persona concerns and three worries (`ice-first`, `ice-medical`, `ice-surgery`, sourced "Teaching
device") that add no clinical fact; the staff; the phases' wording; decisions, options, feedback, interventions,
rubric, teaching points; the unrecorded tests offered with "No result is recorded for this test."; the order-entry
notices.

**Contradictions and ambiguities kept, not resolved.**
* "Three months" does not say whether it is her age or the time after surgery; the case says so wherever it appears.
* The parents were "normal at this position" (父母该位点正常). Focal disease usually follows a paternally inherited
  variant; the case keeps the record and teaches that a new variant on the paternal chromosome also fits. If the
  article reports paternal inheritance, the record is wrong and must be corrected (see "To verify").
* The ammonia was printed with a doubtful unit; 1.0.0 did not carry the value. The case shows neither.
* 1.0.0 implies that the article gives the historical drug doses and chose not to reproduce them; the case therefore
  says "this case does not include the doses", never that the report lacks them.
* 1.0.0's English said "no KCNJ11 abnormality reported", its Chinese "KCNJ11未见异常" (no abnormality found); the case
  uses "no abnormality".
* "18F-DOPA" is named without the scanner type (PET or PET/CT); the case says "¹⁸F-DOPA PET" and that whether CT was
  combined is not recorded.
* "局灶部分切除" does not say how much was removed (lesionectomy or distal pancreatectomy).
* The order of diazoxide and octreotide, and whether the genetics and PET were done before or after the referral, are
  not recorded; the `localisation` phase says "when and where they were done is not recorded".

**Not restorable without the article (see "To verify").** Vital signs and the admission examination (only the birth
weight is recorded, so the case has a single examination finding and `examNotRecorded` answers the rest),
gestation in weeks and Apgar scores, feeding, glucose values and times, glucose infusion rate, the drug doses, the
missing parts of the critical sample, echo and operative details.

**Privacy.** Pseudonym unique in the collection; no hospital, city, date or identifying detail; times are hours of
life and stages of the course. The source citation (which names the diagnosis) is shown only after the case.

**Figures.** `fig01` and `fig02` (approved in `scripts/cmcr-105-media-review.json` as "PET/CT or sequence composite
inspected without identifying overlay", checksums unchanged) stay local-only assets attached to no result, as in
1.0.0: their content could not be inspected in this environment, and a composite may show later findings. Their
titles now say "imaging composite … for the debrief".

**Survey findings fixed** (survey.json audit of cmcr-639083, the template findings on fractional ages, governance
finding 1 and the critic's priority list): no treatment possible (critical) → 19 interventions, IV glucose as a
critical act that the later phases wait for; spoiler summary → presentation-only; the mechanism decision gated on the
drug record → record moved after decision 3; age/recurrence inconsistency → staged phases with honest timing; birth
weight marked abnormal and taught; bundled records → 16 single tests with structured values and honest "no result"
entries; strawman decisions → five decisions at the real decision points with plausible, guideline-based
distractors; no targets, GIR or 48-hour caveat → taught in decisions 1–2 and the teaching points; the echo
uninterpreted → decision 3, the pharmacist and the FDA 2015 teaching; template history slots and authoring language in
the carer's mouth → 23 items in lay speech; triage note and opening line rewritten; generic rubric → 12 items with two
critical acts and a `scoredWhen` gate; teaching points, outcomes, staff, communication guidance and references
written for this case; the unsupported allusion to the report's statement on PET accuracy dropped; Chinese terms
standardised (低血糖, β-羟丁酸, ¹⁸F-DOPA PET, p.(Arg598*), 近全胰切除); citation volume without the leading zero. The age
stays 0.4583 days: the schema has no hour unit, and the core formatter shows "11 hours" everywhere.

## Matcher notes

* 38 `extensions.testUtterances` (19 zh-CN, 19 en), written as a learner would type them; none equals a keyword or a
  canonical question; 2 look-alike negatives (a home address, parking). Every required item (onset, recurrence,
  birth, mother's glucose, family, the treatment status) has at least one paraphrase; `cases verify` passes 38/38
  with no extra selections in both languages.
* `cases verify` scores every history item whatever its phase, so keywords are kept apart: the onset and recurrence
  items exclude words about signs (抖, 抽, jitter, fits), which go to `symptoms`; feeding and signs exclude each other;
  `newborn-medicines` excludes the mother, vaccines and side-effect words; `maternal-glucose` excludes family and
  medicine words; `family` and `pancreas-function` exclude pregnancy and mother words so "diabetes" questions reach
  the right item; `status-outcome` excludes development, insulin and stool words.
* Phase twin: `status-medical` (medical) supersedes `recurrence`. The three ICE items live in separate phases.
* English keywords of three or more words are written run together (`whendiditstart`, `howmanytimes`,
  `howmanydays`, `whenshemoved`, `howisshenow`), so none reduces to a one-word wildcard.

## References

1. 桑艳梅, 李文京, 王焕民, 徐子迪. 胰腺局灶增生型先天性高胰岛素血症一例. 中华糖尿病杂志. 2013;5(11):705-707.
   doi:10.3760/cma.j.issn.1674-5809.2013.11.014. Available from: https://rs.yiigle.com/cmaid/639083
2. De Leon DD, Arnoux JB, Banerjee I, et al. International Guidelines for the Diagnosis and Management of
   Hyperinsulinism. Horm Res Paediatr. 2024;97(3):279-298. doi:10.1159/000531766
3. Thornton PS, Stanley CA, De Leon DD, et al. Recommendations from the Pediatric Endocrine Society for Evaluation
   and Management of Persistent Hypoglycemia in Neonates, Infants, and Children. J Pediatr. 2015;167(2):238-245.
   doi:10.1016/j.jpeds.2015.03.057
4. 中华医学会儿科学分会新生儿学组. 新生儿低血糖临床规范管理专家共识（2021）. 中国当代儿科杂志. 2022;24(1):1-13.
   doi:10.7499/j.issn.1008-8830.2108061
5. British Association of Perinatal Medicine. Identification and Management of Neonatal Hypoglycaemia in the Full
   Term Infant (Birth – 72 hours): A BAPM Framework for Practice. London: BAPM; 2024.
6. Brar PC, Heksch R, Cossen K, et al. Management and Appropriate Use of Diazoxide in Infants and Children with
   Hyperinsulinism. J Clin Endocrinol Metab. 2020;105(12):3750-3761. doi:10.1210/clinem/dgaa543
7. US Food and Drug Administration. FDA Drug Safety Communication: FDA warns about a serious lung condition in infants
   and newborns treated with Proglycem (diazoxide). Silver Spring (MD): FDA; 2015 Jul.
8. Adamkin DH; Committee on Fetus and Newborn. Postnatal glucose homeostasis in late-preterm and term infants.
   Pediatrics. 2011;127(3):575-579. doi:10.1542/peds.2010-3851
9. Laje P, Halaby L, Adzick NS, Stanley CA. Necrotizing enterocolitis in neonates receiving octreotide for the
   management of congenital hyperinsulinism. Pediatr Diabetes. 2010;11(2):142-147.

The same strings are `debrief.references`. How they were checked (2026-10-30, by web search; PubMed, PMC, Karger
and journal pages could not be fetched from this environment, so search records were used): ref. 1 — the source map's
`verifiedDoi` (publisher page checked 2026-10-29); ref. 2 — Karger and PMC records (authors, volume, issue, pages,
DOI; online July 2023, issue 2024) and the diagnostic features quoted in the case (β-hydroxybutyrate < 1.8 mmol/L,
free fatty acids < 1.7 mmol/L, glucagon response ≥ 30 mg/dL at a glucose < 50 mg/dL); ref. 3 — PubMed listing
(DOI); ref. 4 — the journal's page (issuing body 中华医学会儿科学分会新生儿学组, not the 中国医师协会 body the survey
suggested; DOI; 21 recommendations for ≥ 35 weeks); ref. 5 — the BAPM resource page dated January 2024; ref. 6 —
bibliographic records (DOI; pulmonary hypertension and neutropenia named as serious adverse effects); ref. 7 — the
FDA page and secondary reports (11 cases; congenital heart disease among the risk factors; resolution on stopping);
ref. 8 — PubMed 21357346 (DOI; 200 mg/kg minibolus and 5–8 mg/kg/min infusion via secondary copies); ref. 9 —
citations in later case reports (no DOI printed).

### To verify

**Against the full source article (the source pass):**
* Every patient fact in "Clinical numbers check" and "Source and adaptation", word for word.
* Her age at each step: the critical sample (inside or beyond the first 48 hours?), the echo, ultrasound and MRI,
  the start and stop of diazoxide and octreotide, the referral (1.0.0 said its age in months was unrecorded), the
  genetic test and PET (before or after the referral, and where), the operation, discharge, and whether "three
  months" is her age or the time after surgery.
* Birth details: gestation in weeks, Apgar scores, perinatal stress, the mother's glucose screening, her medicines
  and any glucose drip in labour; the birth-weight centile.
* The lows: values and times, their relation to feeds, the signs during them (jitteriness, seizures, apnoea,
  lethargy); feeding type, volume and interval.
* Glucose support: IV glucose concentration and glucose infusion rate, any central line, glucagon, continuous feeds.
* The full critical-sample panel as printed with reference ranges: laboratory glucose, insulin, C-peptide (unit),
  β-hydroxybutyrate, free fatty acids, lactate, cortisol, growth hormone, any acylcarnitines or organic acids — and
  the ammonia value with its printed unit; any glucagon stimulation test.
* Thyroid function and ACTH values with ranges.
* The admission examination: weight, length and head circumference, vital signs, general state, neurological signs,
  overgrowth or dysmorphic features (e.g. of Beckwith–Wiedemann syndrome), liver, heart murmur.
* Echo details and timing (ASD or PFO, PDA size and shunt, pulmonary pressure) and any repeat echo on diazoxide.
* Ultrasound and MRI details, including any sign of hypoglycaemic brain injury.
* Diazoxide and octreotide: doses, divisions, duration, order, any diuretic, adverse effects (fluid retention,
  hypertrichosis, pulmonary hypertension, necrotising enterocolitis) and how unresponsiveness was judged.
* Genetics: method, genes tested, reference transcript, zygosity of c.1792C>T p.(Arg598*), each parent's result
  (confirm "父母该位点正常": a new variant or paternal inheritance?), any paternity check, genotyping of the lesion
  (11p15 loss of heterozygosity), genetic counselling.
* ¹⁸F-DOPA: PET or PET/CT, preparation, uptake values, whether the 12.2 × 9.5 mm size comes from PET or CT, any
  other uptake; the captions of `fig01`/`fig02`, so the assets can get descriptive titles and possibly attach to the
  PET result.
* The operation: approach, extent (lesionectomy or distal pancreatectomy), frozen sections and margins, intraoperative
  glucose, complications; the histology description.
* The postoperative course (glucose, any hyperglycaemia, a fasting test, discharge) and all follow-up data.
* The authors' discussion (statements on PET accuracy, on the genetics of focal disease, any recommendations) — the
  case cites none of it until it has been read.
* Which relative accompanied the baby, to name the companion by relation.

**Guidance details (secondary sources only in this review):**
* 2024 international hyperinsulinism guideline: the exact wording and grading of the diagnostic features quoted; the
  glucose target > 70 mg/dL (3.9 mmol/L), confirmed only in secondary summaries; the diazoxide dose band and
  starting dose, the thiazide recommendation, the definition of diazoxide responsiveness (fast duration, timing after
  starting — about 5 days in one centre's protocol), the genetic-testing and PET recommendations (including how a
  variant absent from both parents is handled), the surgical recommendations and any neurodevelopmental follow-up
  recommendation.
* PES 2015: the > 70 mg/dL target for suspected genetic hypoglycaemia disorders, evaluation at ≥ 48 hours, and its
  wording on a safety fast before discharge (the case cites PES 2015 for "show an age-appropriate fast before
  discharge").
* PES 2020 diazoxide consensus (Brar et al.): the starting-dose advice (the case says "start at the low end"),
  echocardiography before and after starting, the thiazide wording, and the adverse-effect frequencies (2–3 %
  pulmonary hypertension, 15 % neutropenia in the abstract; not printed in the case).
* AAP 2011 clinical report: whether it has been reaffirmed, revised or retired (AAP clinical reports expire after
  five years unless reaffirmed); the case uses it only for the 200 mg/kg minibolus and the 5–8 mg/kg/min infusion.
* BAPM 2024 framework: whether it keeps the 2017 framework's dextrose-gel step and IV bolus volume (2.5 mL/kg of 10%
  glucose in 2017); the case cites BAPM only for "feeding support and gel first for a well baby with a mild low".
* Chinese 2021 consensus: its thresholds are not printed in the case; no Chinese consensus on congenital
  hyperinsulinism was found — check before citing one.
* FDA Drug Safety Communication: the exact day in July 2015; Laje 2010: the DOI.
* The peripheral limit for glucose concentration (commonly 12.5 %) — the case says only "concentrated glucose needs
  a central line"; glucagon and octreotide doses are left to the formulary and the specialist team.
* Collection contract vs STANDARD §6.6: the contract matches the English review note with the case-sensitive
  pattern "not yet reviewed by a licensed clinician", which §6.6's last sentence ("Not yet reviewed …") does not
  match; the case ends with "The case is not yet reviewed by a licensed clinician.", as most re-authored cases do.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Story and phases.** `initial` / `workup` / `confirmation` / `followup` → `first-low` (11 hours) → `recurrent` →
  `medical` → `localisation` → `outcome`, gated on objectives, decisions and acts; the drug record after the first
  medicine decision, the outcome after all five decisions and the operation.
* **Decisions.** 3 → 5, each with 4 options and its own guideline-based feedback: the first response, reading the
  critical sample, starting diazoxide safely, the next step after it fails, the operation. Option ids `yes` /
  `normal-insulin` / `transient` … → content ids; the key is the longest option in one decision in zh-CN only.
* **Interventions.** 0 → 19: IV access, 10% glucose bolus and infusion, glucose checks, feeds, glucagon, diazoxide,
  thiazide, octreotide, genetic samples, referral, partial pancreatectomy, supervised fast, follow-up plan, and five
  contraindicated traps with harm texts (50 % glucose, hydrocortisone, a fast at home, near-total pancreatectomy,
  discharge without a fasting check); three wrong-order acts flagged.
* **History and examination.** 15 template slots (eight "the source case does not provide…" answers) → 23 items in
  the relative's voice (6 required, 10 honest unknowns, three labelled worries, status items for later phases);
  the birth-weight record → an examination finding marked abnormal; `examNotRecorded` now says "This case does not
  record this examination."
* **Investigations.** 5 bundles → 16 single tests with structured values ("reference range not recorded"), critical
  glucose results, low-value and harmful choices, honest "No result is recorded for this test." entries.
* **Assessment.** The single critical item (a multiple-choice answer) → 2 critical acts (`rb-iv-glucose`,
  `rb-no-harm` with `scoredWhen`); 12 rubric items with first-try scoring; a Calgary–Cambridge communication item
  for this family. Do nothing scores 0; a wrong first answer everywhere scores 48 %.
* **Teaching layer.** 6 learning outcomes, 6 key reasoning steps, 6 teaching points with guidance and year, 8
  unknowns, 5 staff (attending, nurse, endocrinology consultant, radiologist, pharmacist), 9 Vancouver references,
  editorial review status with seven guidelines and the §6.6 notes.
* **Card and voice.** Title "Low blood glucose · 11-hour-old girl"; spoiler-free summary distinct from the triage
  note; 3 patient tags; specialty adds `genetics`; the relative named in character; persona fields written as actor
  briefs; no authoring language in anything the carer says.
* **Corpus and schema.** 38 paraphrased utterances with negatives; `sourceTextChecked: false` added.
* **Media.** `fig01`, `fig02` kept (approved, unattached), retitled.

### 1.0.0 — 2026-10-28

* Initial template version (PR #5): 15 history items, 1 examination item, 5 records, 3 decisions, 11 rubric items,
  no interventions.

## Validation

Run from the worktree root (all passed on 2026-10-30):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-639083/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-639083 --lang en          # 76 steps · objectives 6/6 · decisions 5/5 · utterances 38/38 · rubric 29/29
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-639083        # depth floor, do-nothing 0, wrong-first 48 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-639083:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-639083:"   # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 足月顺产女婴，出生体重4.05 kg，无窒息；母亲孕期健康、无糖耐量异常史；父母非近亲，无低血糖或糖尿病家族史。
生后11小时出现低血糖，此后多次低于2.8 mmol/L。低血糖时标本：血糖1.8 mmol/L，胰岛素11 μU/mL，C肽0.74 nmol/L，
β-羟丁酸0.5 mmol/L（采样日龄未记录）；血氨所附单位存疑，未收录数值。甲状腺功能和ACTH正常，胰腺超声、头颅及垂体MRI
未见异常；心脏超声示房间隔缺损、动脉导管未闭、轻度三尖瓣反流。用过二氮嗪和奥曲肽仍频繁低血糖（剂量未收录）。后来转诊
（年龄未记录）：患儿ABCC8 c.1792C>T，p.(Arg598*)（报告写作p.Arg598X），父母该位点均未检出，KCNJ11未见异常；
¹⁸F-DOPA定位胰体远端12.2 mm×9.5 mm病灶。行局灶部分切除，病理证实局灶型；“三个月”时空腹血糖约4.4–6.0 mmol/L、餐后约
7 mmol/L（是月龄还是术后三个月未说明）。远期神经发育、复发和胰腺功能没有记录。本版事实沿用1.0.0版的提取内容，尚未对照
原文全文核对。

**学习目标。**
1. 对反复发作的新生儿低血糖立即静脉补糖（10%葡萄糖2 mL/kg静推后持续输注，AAP 2011），并在低血糖时留取关键标本而不推迟治疗。
2. 按2024年国际高胰岛素血症指南判读关键标本，疑似持续性低血糖症时维持血糖>3.9 mmol/L（PES 2015），并与过渡期低血糖、
   垂体功能低下和脂肪酸氧化障碍鉴别。
3. 在有房间隔缺损和动脉导管未闭的婴儿中安全开始二氮嗪：低剂量起始、合用噻嗪类利尿剂、监测液体平衡和肺动脉高压
   （FDA 2015；PES 2020），用院内监护下的禁食试验判断疗效，绝不在家禁食。
4. 二氮嗪无效时急查患儿及父母的ABCC8/KCNJ11，转诊做¹⁸F-DOPA PET，并说明超声或MRI正常不能排除局灶病灶。
5. 对局灶型选择PET引导、冰冻切片确认切缘的局部切除，而不是近全胰切除，并说明两者的后果。
6. 向家属解释父母都未检出的变异对局灶机制和再生育的意义，并安排术后禁食试验、神经发育随访和遗传咨询。

**关键决策。** ① 低血糖反复：建立静脉通路，趁低血糖先抽关键标本，10%葡萄糖2 mL/kg静推后持续输注，目标>3.9 mmol/L
（干扰项：喂奶加凝胶等症状、先等化验结果、50%葡萄糖静推）；② 判读标本：胰岛素过多（干扰项：正常过渡、脂肪酸氧化障碍、
皮质醇缺乏并用激素）；③ 开始用药：低剂量二氮嗪加噻嗪类利尿剂，复查心超，禁食试验判断疗效（干扰项：一开始满量并第2天判失败、
先用奥曲肽、长期激素）；④ 药物无效：急查基因（含父母）、转诊、¹⁸F-DOPA PET（干扰项：立即近全胰切除、先做CT/MRI找胰岛素瘤、
加量奥曲肽后带血糖仪回家）；⑤ 手术：PET引导的局部切除加冰冻切片（干扰项：近全胰切除、认定PET假阳性、只剜除结节不做冰冻）。
关键项：低血糖反复时静脉补糖（推注加持续输注），以及避免五种危险处置。

**复盘要点（PEARLS）。** 先谈感受；复述从第一次低血糖到治疗、留标本和读结果的经过；分析：什么让你不再认为是过渡期低血糖、
血糖1.8 mmol/L时胰岛素11 μU/mL意味着什么、为什么先抽标本却不等结果、4.05 kg和母亲无糖代谢异常提示什么、房间隔缺损和动脉导管
未闭怎样改变二氮嗪的用法、何时才能判定药物无效、超声和MRI正常为什么还要做PET、父母都没有的变异为什么仍可能是局灶型及其对
再生育的意义、三个月时血糖正常能说明什么不能说明什么；最后总结下一次遇到反复低血糖的大体重新生儿时第一个小时怎么做。本病例为
人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核；待核实事项见上文“To verify”。
