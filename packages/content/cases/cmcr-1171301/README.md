# cmcr-1171301 — Unsteady head control and not yet sitting · 11-month-old boy

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags, triage note, objective titles and investigation names give no diagnosis away.
> The patient (魏知远 / Wei Zhiyuan) is a pseudonym; his relative, the attending (严医生 / Dr Yan), the nurse
> (范护士 / Nurse Fan) and the two consultants (顾医生 / Dr Gu, paediatric nephrology; 沈医生 / Dr Shen, clinical
> genetics) are teaching roles. The case adapts one published case report; it is not medical advice.
> 导师指南，含剧透。患者为化名，家属与医护人物为教学角色；本病例改编自已发表的单例报告，不构成医疗建议。

**Status of the facts.** Version 1.1.0 was re-authored from the facts recorded in version 1.0.0 (commit
`88ed0d2`), the only fact base available in the authoring environment. Those facts have **not yet been checked
against the full source article** (`extensions.sourceTextChecked: false`); the source pass follows when the article
text is available. Everything listed under "To verify" is part of that pass.

## Case card

| | |
|---|---|
| id / version | `cmcr-1171301` · `1.1.0` · CMCR additional collection (`cmcr-105`) |
| Source | 江芳, 高岩, 欧志英. Lowe综合征OCRL1基因突变一例. 中华儿科杂志. 2012;50(9):708-709 (the title names the diagnosis; it is shown only after the case) |
| Setting / facility | Children's ward bed (`inpatient`) / `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 min (static clock; four phases, five decisions, 19 investigations, 12 interventions) |
| Specialty | Paediatrics, neurology, ophthalmology, genetics (`pediatrics`, `neurology`, `ophthalmology`, `genetics`). Nephrology is deliberately not on the card: the kidney involvement is what the learner has to find |
| Languages | `zh-CN` (source language), `en` |
| Learner level | Final-year students and paediatric residents (neurology, nephrology and genetics rotations); paediatric nurses for the handover, samples and referrals |
| Review status | `editorial`, 2026-10-30 — AI-assisted teaching design with an editorial review against the cited guidance; the patient facts are not yet checked against the full article; **not yet reviewed by a licensed clinician**. Have a paediatric neurologist or nephrologist and a clinical geneticist review it before teaching use |
| Phases | `admission` 入院：病史与查体 / Admission: history and examination → `first-results` 住院期间：首批检查结果 / During the admission: the first results → `genetics` 基因检测回报 / The genetic report → `outcome` 本病例记录的结局 / Recorded course and outcome — none learner-switchable |
| Content | 24 history items (6 required; 7 recorded facts, 2 labelled teaching devices, 15 unknown; the relative answers) · 6 exam findings · 19 investigations (2 record reviews; 11 with a recorded result, 8 offered with "No result is recorded for this test.") · 12 interventions (4 contraindicated, 1 of them critical) · 6 objectives · 5 decisions (24 options) · 12 rubric items (11 deterministic, weight 29; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 5 teaching points · 47 test utterances |

## Learning outcomes

After the case the learner can:

1. In an infant with operated congenital cataract and glaucoma, hypotonia and absent reflexes, think of a
   multisystem eye–brain–kidney disorder and, choosing tests from the whole phenotype (AAP 2025), check the blood
   gas, electrolytes and urine alongside SMN1 testing (international SMA care consensus, 2018).
2. Read a urine pH of 7.0 during acidaemia as a renal tubular acidosis, place it in the proximal tubule from urine
   β2-microglobulin above 500 µg/L and generalised aminoaciduria (a renal Fanconi-type picture), and tell it from
   distal RTA, cystinosis and — 0.86 g/24 h of protein with no albumin recorded — nephrotic syndrome as IPNA 2022
   defines it.
3. Measure potassium, phosphate, calcium and creatinine, then correct the chronic acidosis gradually with oral
   citrate or bicarbonate divided through the day (with feeds at his age), titrated to the serum bicarbonate, adding
   potassium, phosphate and calcitriol as the results require (GeneReviews: Lowe syndrome, 2019; the ERKNet/ESPN 2021
   principles for distal RTA) — with no IV bicarbonate bolus and no steroids for tubular proteinuria.
4. Interpret a nonsense variant in OCRL (legacy name OCRL1) under ACMG/AMP 2015, explain that a negative maternal
   blood test does not exclude germline mosaicism, and offer counselling, a maternal slit-lamp lens examination and
   prenatal or pre-implantation testing in a future pregnancy.
5. Plan lifelong multidisciplinary follow-up — eye pressure and vision, a prompt diagnostic hearing assessment with
   amplification (JCIH 2019), tubular, bone and kidney-function monitoring and early intervention — and look for a
   separate cause of the haemoglobin of 70 g/L.
6. Explain the diagnosis, the treatment, the inheritance and its uncertainties to the family in a
   Calgary–Cambridge structure, breaking the genetic diagnosis as bad news with SPIKES and checking understanding
   by teach-back.

These are the case's `learningOutcomes`; they name the diagnosis, so front-ends show them before play only behind
the closed "Learning outcomes (6) · may reveal the diagnosis" disclosure and list them in every debrief
(CASE_AUTHORING §9.4, GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A boy, his mother's second pregnancy and second birth, was born vaginally at 41 weeks with no asphyxia, birth
injury or resuscitation. At 3 months his eyes did not follow light or objects; congenital cataracts and glaucoma
were diagnosed and operated on. He still could not roll at 8 months, and at 11 months his head control was
unsteady and he could not sit. His 10-year-old brother is healthy. His weight is recorded as 8.7 kg (when it was
measured is not recorded).

**Examination:** slow responses; unable to stand with support or to grasp and transfer objects; lax, hypotonic
limbs; tendon reflexes not elicited. Eyes: a small white patch lateral to the left pupil and a slit-like
post-operative appearance above both pupils; visual acuity not quantified.

**First results:** blood gas pH 7.271, bicarbonate 17.9 mmol/L, base excess −8.4 mmol/L; haemoglobin 70 g/L;
urine pH 7.0 (specific gravity printed as "1.0"), urine protein 0.86 g/24 h, urine β2-microglobulin > 500 µg/L,
generalised aminoaciduria; SMN1 without abnormality; EEG normal; auditory evoked potentials with prolonged
latencies and partly abnormal hearing thresholds.

**Genetics and diagnosis:** a nonsense variant in exon 15 of OCRL1 (current HGNC symbol OCRL), c.1528C>T, not
detected in his mother's peripheral blood or in 20 control chromosomes; 1.0.0 states that germline mosaicism was
not assessed. The report's diagnosis: **Lowe syndrome (the oculocerebrorenal syndrome of Lowe)**. The case records
no treatment, no later course and no follow-up of kidney function, vision, hearing or development.

**Today's answer:** the eye–brain–kidney pattern is recognised from the history and examination; SMN1 is sent
because of the areflexic hypotonia (international SMA care consensus, 2018), together with the blood gas,
electrolytes and a tubular urine screen chosen from the whole phenotype (AAP 2025). The acidosis with an alkaline
urine shows a renal tubular acidosis, which β2-microglobulinuria and generalised aminoaciduria place in the proximal
tubule (a distal RTA leaks amino acids and small proteins mainly when it is untreated and severe in infancy — his
bicarbonate is 17.9 mmol/L — and does not explain his eyes or tone); potassium, phosphate, calcium and creatinine are
measured and oral alkali is started in divided doses through the day (with feeds at his age) and titrated to the
serum bicarbonate (GeneReviews 2019; the ERKNet/ESPN 2021 principles for distal RTA) — never an IV bicarbonate bolus,
never steroids for tubular proteinuria. The OCRL nonsense variant is pathogenic evidence under ACMG/AMP 2015; the
negative maternal blood test lowers but does not remove the recurrence risk (germline mosaicism), so the family is offered
counselling, a maternal slit-lamp examination and prenatal or pre-implantation testing in a future pregnancy. He
needs lifelong eye-pressure and vision care, prompt diagnostic audiology and amplification (JCIH 2019), nephrology
follow-up of acid–base, bone and kidney function, early intervention, and a separate work-up of his anaemia.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires. The case shows
the recorded states only; no response to the learner's treatment is simulated, and every intervention's response
says what the case does and does not record.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | on admission, aged 11 months | start | the relative's history (incl. a labelled teaching worry), the six examination manoeuvres, the unrecorded tests a learner may send early (electrolytes, bone profile, spot urine solutes, CK, TORCH serology: "No result is recorded for this test."), decision `first-tests` |
| `first-results` | during the admission (day not recorded) | objectives `obj-story`, `obj-examine`, `obj-first-tests` complete | blood gas, haemoglobin, urinalysis, urine protein, urine β2-microglobulin, urine amino acids, SMN1, EEG, the auditory evoked potential report (record review); unrecorded electrolytes, bone profile, urine solutes, anaemia work-up, kidney ultrasound, brain MRI, CK, TORCH; decisions `unifying-diagnosis` and `acid-base-plan`; oral alkali, nephrology review, the genetic test with consent (and the traps) |
| `genetics` | when the genetic report came back (timing not recorded) | objectives `obj-unify` (results read, decision 2, genetic test sent) and `obj-acid-base` (decision 3, oral alkali started) complete | the genetic report (proband and mother), the relative's second worry (phase twin), decisions `variant-counselling` and `follow-up-plan`, counselling and the eye, hearing and therapy referrals |
| `outcome` | after the genetic diagnosis | all five decisions decided | the "Recorded course and outcome" record |

Results exist only in the phase they belong to; ordering a test in another phase shows an order-entry notice
saying where its result is read (`orderMatching.warnings`). The genetic report cannot be read before the genetic
test has been sent, the alkali started and decisions 2–3 answered; the outcome record opens only in the final
phase.

## Decisions and assessment

### Objectives (HUD chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-story` Hear about his development, his eyes and his birth | motor milestones now and at 8 months, eye history, birth order and delivery, asphyxia/resuscitation, siblings asked |
| 2 | `obj-examine` Examine his responses, motor function, tone, reflexes and eyes | the six manoeuvres examined |
| 3 | `obj-first-tests` Decide which tests to send first | decision 1 answered |
| 4 | `obj-unify` Read the first results and find one explanation | blood gas, urinalysis, the three other urine tests, SMN1 and the auditory evoked potentials read in `first-results`; decision 2 answered; genetic test sent |
| 5 | `obj-acid-base` Start his treatment safely | decision 3 answered; oral alkali started |
| 6 | `obj-family` Talk with his family and plan his long-term follow-up | genetic report read in `genetics`; decisions 4 and 5; counselling meeting; ophthalmology, audiology and early-intervention referrals; outcome record read |

Titles and hints name no diagnosis and contain no option text. The journal lists later objectives by title from the
start, so no title announces a result before it is read (objective 5 was "Treat the acidosis safely" and objective
6 "Explain the genetic result…" until the 2026-11-14 review: both told the learner, before decision 1, that the gas
would show an acidosis and that a genetic result would come). No `completeWhen` holds a condition that can become
permanently false, so a learner who acts late can still finish (the contract replays each act late).

### Decisions

| id | Opens after | Key | Distractors (why they tempt) |
|---|---|---|---|
| `first-tests` (select all) | motor and eye history; responses, standing, grasp, tone and reflexes examined | `gas-and-electrolytes`, `urine-tubular-screen`, `smn1-testing` | `muscle-biopsy` (the classic work-up of a floppy infant before genetics); `head-ct` (developmental delay → "scan the brain") |
| `unifying-diagnosis` | blood gas, the four urine results, SMN1 and the auditory evoked potentials read | `oculocerebrorenal-lowe`: one X-linked eye–brain–kidney syndrome; confirm with OCRL testing | `nephropathic-cystinosis` (the commonest inherited renal Fanconi syndrome of infancy); `distal-rta-deafness` (acid blood with alkaline urine plus abnormal hearing); `congenital-rubella` (cataract, glaucoma, hearing, delay); `infantile-nephrotic` (0.86 g/24 h read as nephrotic → steroids) |
| `acid-base-plan` | decision 2; blood gas and urinalysis read | `measure-then-oral-alkali`: K, phosphate, Ca, creatinine first, then oral citrate or bicarbonate in 3–4 doses titrated to a normal serum bicarbonate | `iv-bicarbonate-correction` (the base-deficit formula as an IV bolus); `await-gene-result` (mild and chronic: wait for the cause); `fixed-low-dose` (the right drug at a distal-RTA dose, once daily, held down because the urine is already alkaline) |
| `variant-counselling` | genetic report read in `genetics` | `confirmed-small-residual-risk`: the variant explains his condition; the maternal blood test does not exclude germline mosaicism, so the risk is low, not zero — counselling, maternal slit-lamp examination, prenatal or pre-implantation testing | `no-recurrence` (de novo, so no risk); `mother-carrier-half-sons` (X-linked, so she must be a carrier: 50 % and advise no more children); `test-brother-now` (carrier-test the healthy 10-year-old brother); `vus-confirm-first` (call it a VUS and say nothing until a second laboratory repeats it) |
| `follow-up-plan` (select all) | genetic report read; decision 4 | `eye-pressure-vision`, `hearing-amplification`, `kidney-bone-growth` | `stop-kidney-tests` (the genetic diagnosis "explains" the kidneys); `hearing-later` (wait for speech at 2 years) |

Every option has its own feedback (2–4 sentences naming the guidance, issuing body and year, and the reason). Option
ids name their content. No single-best key is the uniquely longest option of its decision in either language, and in
the two select-all decisions the keys are not the longest options (distractors were lengthened in this pass).

### Rubric (11 deterministic items, weight 29, + 1 examiner-judged)

| id | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history-development` | history | 2 | motor milestones now and at 8 months, eye history, birth order and delivery, asphyxia/resuscitation, siblings |
| `rb-history-gaps` | history | 1 | maternal male relatives, hearing and newborn screen, urine output and thirst, infection in pregnancy, newborn period asked (all unrecorded: asking is the competency) |
| `rb-examination` | examination | 2 | responses, standing, grasp and transfer, tone, reflexes, eyes |
| `rb-first-tests` | investigations | 3 | decision 1 right first time; blood gas, the four urine results, SMN1 and AEP read in `first-results` |
| `rb-diagnosis` | diagnosis | 3 | decision 2 right first time; genetic test sent with consent |
| `rb-acidosis-treated` | management | 4 | **critical** — electrolytes sent in `admission` or `first-results`, and oral alkali given while indicated (blood gas read and electrolytes already sent) |
| `rb-acid-base-plan` | management | 3 | decision 3 right first time; nephrology review; bone profile and spot urine solutes sent before the genetic report; anaemia work-up sent in `first-results` |
| `rb-no-bicarbonate-bolus` | safety | 3 | **critical** — no IV bicarbonate bolus; `scoredWhen` = decision 3 attempted or the bolus given |
| `rb-no-harm` | safety | 2 | no prednisolone, no zero-risk promise, no routine discharge; `scoredWhen` = decision 2, 4 or 5 attempted or any of the three acts |
| `rb-counselling` | management | 3 | decision 4 right first time; post-test counselling meeting |
| `rb-follow-up` | management | 3 | decision 5 right first time; ophthalmology, audiology and early-intervention referrals |
| `rb-communication` | communication | (judged) | Calgary–Cambridge conversation with the relative, the genetic diagnosis broken as bad news with SPIKES, teach-back; written for this family (see judge guidance) |

### Critical items

**Critical items are acts**, not decisions, and neither can be met in hindsight:

* `rb-acidosis-treated` (the missed safety-critical act). The genetic report — the result that confirms the
  diagnosis — opens only when `obj-acid-base` is complete, and that needs the oral alkali, so the alkali is given
  before the confirmation. The electrolytes count only when ordered in `admission` or `first-results`, and a dose of
  alkali counts only while its `indicatedWhen` holds: the blood gas read and the electrolytes already sent
  ("potassium first"). Alkali given before the electrolytes were sent, or electrolytes sent after the genetic report,
  miss the item.
* `rb-no-bicarbonate-bolus` (the dangerous error), scored once decision 3 has been attempted or the bolus given, so
  doing nothing earns nothing.

### How wrong choices score (measured 2026-11-13 with core `assess`; re-measured unchanged 2026-11-14)

| Path | Score | Critical items missed |
|---|---|---|
| Reference path (`solution`) | 29/29 (100 %) | none |
| Do nothing (start, then try to finish) | 0 (finish refused: objectives incomplete) | `rb-acidosis-treated` |
| A wrong first answer at every decision, then the right one | 14/29 (48 %) | none |
| Any one of the 15 distractors first at its decision only | 26/29 (90 %) | none |
| An incomplete selection first at a select-all decision (each key left out in turn) | 26/29 (90 %) | none |
| Reference path plus an IV bicarbonate bolus after reading the gas | 26/29 (90 %); **safety outcome fails** (`iv-bicarbonate-bolus`) | `rb-no-bicarbonate-bolus` |
| Reference path plus prednisolone, the zero-risk promise or routine discharge (each) | 27/29 (93 %); a contraindicated safety event, safety outcome passes | none |
| No electrolytes sent | 25/29 (86 %) | `rb-acidosis-treated` |
| Oral alkali given before the electrolytes were sent (not repeated) | 25/29 (86 %) | `rb-acidosis-treated` |
| Electrolytes sent only after the genetic report | 25/29 (86 %) | `rb-acidosis-treated` |
| No oral alkali | stays in `first-results` (the genetic report never opens); 19/29 (66 %) if the learner stops | `rb-acidosis-treated` |
| No genetic test sent | stays in `first-results`; 20/29 (69 %) | none |
| No counselling meeting, or no eye/hearing/therapy referrals | the case cannot be finished (`obj-family`); 26/29 (90 %) at that point | none |
| No nephrology review; or no bone, urine-mineral and anaemia tests | 26/29 (90 %) each | none |
| None of the questions about the unknowns | 28/29 (97 %) | none |

Contraindicated acts are listed as safety events in every debrief. `phosphate-calcitriol` is neutral (no phosphate,
alkaline phosphatase or PTH is recorded, and its response says so).

**Safety outcome.** `iv-bicarbonate-bolus` is `critical: true`: an IV bicarbonate bolus in an already floppy infant
with an untreated Fanconi-type tubulopathy and unknown potassium and calcium risks life-threatening hypokalaemia and
hypocalcaemic tetany, so giving it fails the assessment's safety outcome (`safety.passed: false`) whatever the score,
and every debrief and export shows it beside the score. `prednisolone-nephrotic`, `zero-risk-reassurance` and
`routine-discharge` are moderate-risk and explicitly `critical: false`: harmful misjudgements that the next clinician
can correct (steroids would be stopped once the tubular origin is recognised; counselling and follow-up can be
reinstated), scored in `rb-no-harm`.

## Reference path (`solution`)

76 steps: start → 23 history questions in `admission` (the seven recorded items — milestones now and at 8 months,
eye history, birth order and delivery, birth asphyxia and resuscitation, the sibling, the weight — the labelled
worry, and the fifteen unrecorded items a careful clinician would still ask: vision, glasses and drops, hearing,
birth weight, newborn period, pregnancy, maternal relatives, parents, feeding, urine and thirst, fits, sounds,
medicines, allergies, vaccines) → the six examination manoeuvres → decision 1
(→ `first-results`) → blood gas, then electrolytes, haemoglobin, urinalysis, urine protein, β2-microglobulin, amino
acids, spot urine solutes, bone profile, SMN1, EEG, the AEP report, anaemia work-up and kidney ultrasound, each
ordered and read → decision 2 → genetic test with consent → oral alkali → nephrology review → decision 3
(→ `genetics`) → the relative's second worry → genetic report → counselling meeting → decision 4 → ophthalmology,
audiology and early-intervention referrals → decision 5 (→ `outcome`) → the outcome record → finish. It scores
29/29 with no contraindicated act, in clinical and in-world mode, in both languages. The demonstration does not
order the brain MRI, CK or TORCH serology (neutral tests with no recorded result).

## Clinical numbers check

Every patient value below is from version 1.0.0 (field in brackets) and keeps its unit; none is new. The source check
against the full article is pending.

| Value | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| Age 11 months, male | `patient.age`, `title` | `patient.age`, `title`, triage note |
| Weight 8.7 kg (not dated) | `patient.weightKg` | `patient.weightKg`, history `weight`, nurse handover |
| At 11 months head control unsteady, cannot sit unsupported | history `motor`, `chiefComplaint`, opening line | history `motor-now`, `chiefComplaint`, triage note, opening line |
| Could not roll at 8 months | history `earlier` | history `rolling` |
| At 3 months not following light or objects; congenital cataracts and glaucoma diagnosed and operated on | history `eyes`, triage note | history `eye-history`; triage note ("eye surgery earlier in infancy") |
| Second pregnancy, second birth; vaginal delivery at 41 weeks; no asphyxia, birth injury or resuscitation | history `birth` | `birth`, `birth-resus` |
| Brother aged 10, healthy | history `family` | `family-sibling` |
| Slow responses; unable to stand with support or to grasp and transfer objects; lax, hypotonic limbs; tendon reflexes not elicited | exam `neuro` | exam `exam-responsiveness`, `exam-standing`, `exam-hands`, `exam-tone`, `exam-reflexes` |
| Small white patch lateral to the left pupil; slit-like post-operative appearance above both pupils; acuity not quantified | exam `eyes-exam` | exam `exam-eyes`; acuity → unknowns |
| pH 7.271, HCO₃⁻ 17.9 mmol/L, BE −8.4 mmol/L | `acid` (workup) | `blood-gas` (`first-results`) values |
| Hb 70 g/L | `acid` (workup) | `haemoglobin` (`first-results`) value |
| Urine pH 7.0; specific gravity printed "1.0" | `tubular` (workup) | `urinalysis` (`first-results`) values, note |
| Urine protein 0.86 g/24 h | `tubular` (workup) | `urine-protein` (`first-results`) value |
| Urine β2-microglobulin > 500 µg/L | `tubular` (workup) | `urine-b2m` (`first-results`) value |
| Generalised aminoaciduria | `tubular` (workup) | `urine-amino-acids` (`first-results`) |
| SMN1 without abnormality; EEG normal | `differential` (workup) | `smn1`, `eeg` (`first-results`) |
| AEP: prolonged latencies, partly abnormal hearing thresholds | `differential` (workup) | `hearing-aep` (`first-results`, record review) |
| OCRL1 exon 15 c.1528C>T nonsense variant; not detected in maternal peripheral blood or 20 control chromosomes; germline mosaicism not assessed | `gene` (confirmation) | `genetic-report` (`genetics`); "not assessed" → "this case does not record any test for germline mosaicism" |
| Report ends at the molecular diagnosis; no treatment or long-term follow-up | `followup` | `outcome` record ("this case does not record…") |
| Diagnosis: Lowe syndrome | README clinical summary; citation title | `outcome` record, debrief |

**Reference ranges.** None is recorded; every value carries "reference range not recorded". Flags are interpretive and
add no range: L for pH, bicarbonate, base excess and haemoglobin, H for urine protein and β2-microglobulin, none for
urine pH and specific gravity.

**Derived values (facilitator orientation only; not shown to learners).**
* Expected PCO₂ for a bicarbonate of 17.9 mmol/L (Winters: 1.5 × 17.9 + 8 ± 2) ≈ 33–37 mmHg; no PCO₂ is recorded, so
  the compensation cannot be judged. Without sodium and chloride no anion gap can be calculated.
* The trap's formula (base deficit × weight × 0.3) gives 8.4 × 8.7 × 0.3 ≈ 21.9 mmol, half ≈ 11 mmol as a bolus; the
  case prints only the formula.
* Urine protein ≈ 0.86 g ÷ 8.7 kg ≈ 99 mg/kg/day if the undated weight applies. No length is recorded, so no measured
  body surface area exists; a weight-only estimate (Costeff: (4 × 8.7 + 7) ÷ (8.7 + 90) ≈ 0.42 m²) gives ≈ 2.0
  g/m²/day (≈ 85 mg/m²/h), above the IPNA 2022 nephrotic-range threshold (1 g/m²/day, 40 mg/m²/h) by amount alone.
  Learners see neither figure; the case's teaching rests on the unrecorded serum albumin and the tubular pattern
  (β2-microglobulin, aminoaciduria), never on the protein being "below the nephrotic range".
* Haemoglobin 70 g/L = 7.0 g/dL.
* c.1528 is the first base of codon 510 if the numbering starts at the A of the ATG start codon (HGVS); 1.0.0 records
  neither the reference transcript nor the protein change, so the case prints no codon (see "To verify").

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "He had already had eye surgery and still could not sit at 11 months. What did you feel when the
   urine results came back?"
2. **Description** — "Take me through what you asked his relative, what you examined, and why you chose your first
   tests."
3. **Analysis**
   * "His reflexes could not be elicited. Which diagnosis did that make you test for first, and what about him did not
     fit it?"
   * "What should the urine pH be when the blood is acidic? What did a pH of 7.0 tell you — and what would you need to
     know to say whether the defect is distal or proximal?"
   * "Which urine findings place the leak in the proximal tubule? Why is 0.86 g/24 h of protein not a reason for
     prednisolone?"
   * "What did you check before the first dose of alkali, and why not give bicarbonate intravenously to 'correct the
     base deficit'?"
   * "His mother's blood was negative. How did you explain the risk for a future baby — and why is it neither zero nor
     one in two? What would you say about his healthy 10-year-old brother?"
   * "Which findings in this case are not explained by the syndrome, and what will you do about them?"
   * "The report ends at the genetic diagnosis in 2012. What would his care look like today, and who coordinates it?"
4. **Summary** — "What will you look for the next time a floppy infant has had cataract surgery?"

### Common learner errors and how the case surfaces them

| Error | What the case does | Where it scores |
|---|---|---|
| Treating him as "cerebral motor delay" and sending only brain tests | `head-ct`; `muscle-biopsy`; the tubular screen is a key of decision 1 | `rb-first-tests` |
| Stopping at SMA because the reflexes are absent | `smn1-testing` is a key, but decision 2 needs the kidney and eye findings explained | `rb-diagnosis` |
| Calling the proteinuria nephrotic and starting prednisolone | `infantile-nephrotic`; `prednisolone-nephrotic` contraindicated (the harm text names the eye pressure after glaucoma surgery) | `rb-diagnosis`, `rb-no-harm` |
| Reading acid blood with alkaline urine as distal RTA | `distal-rta-deafness` (distal RTA explains neither the eyes nor the areflexic hypotonia; it leaks amino acids and small proteins mainly when untreated and severe in infancy, and his bicarbonate is 17.9 mmol/L) | `rb-diagnosis` |
| Correcting the base deficit with IV bicarbonate | `iv-bicarbonate-correction`; `iv-bicarbonate-bolus` critical | `rb-acid-base-plan`, `rb-no-bicarbonate-bolus` (critical) |
| Starting alkali without knowing the potassium | `oral-alkali` counts only once the electrolytes are sent | `rb-acidosis-treated` (critical) |
| Waiting for the gene result before treating the acidosis | `await-gene-result`; the genetic report stays closed until alkali is started | `rb-acid-base-plan`, `rb-acidosis-treated` |
| "De novo, so no risk" or "X-linked, so 50 %" | `no-recurrence`, `mother-carrier-half-sons`; `zero-risk-reassurance` contraindicated | `rb-counselling`, `rb-no-harm` |
| Carrier-testing the healthy brother | `test-brother-now` | `rb-counselling` |
| Postponing hearing aids or stopping kidney monitoring after the diagnosis | `hearing-later`, `stop-kidney-tests`; `routine-discharge` contraindicated | `rb-follow-up`, `rb-no-harm` |
| Putting the anaemia down to the syndrome | key reasoning step 6, the nephrology consultant, learning outcome 5; `anaemia-screen` in `rb-acid-base-plan` | `rb-acid-base-plan` |

## Embodied mode

* **Where he is.** A ward bed in the general hospital (`inpatient`), lying; he is never moved. The auditory evoked
  potential report and the outcome record are record reviews (`performedAt: "records"`, `requires: ["records"]`,
  risk none), read at a records terminal or at the bedside. The hospital has no audiology suite, so the hearing test
  that 1.0.0 records is an existing report rather than a test the learner performs; the diagnostic audiology the case
  teaches is a referral (`audiology-referral`).
* **Samples and tests.** Blood and urine samples are taken at the bed and sent to the laboratory order workstation
  (blood gas, haematology, chemistry, urinalysis, serology, endocrine); SMN1 and the genetic test go to the molecular
  laboratory (`molecular`). The EEG is a bedside test with the ward's video-EEG cart (`eeg`); it is not a nursing
  test. The kidney ultrasound is a bedside test (`ultrasound`); the brain MRI is a provider test that would
  need sedation and transfer (offered, neutral, not in the reference path).
* **He cannot speak** (`nonVerbalWhen: {always: true}`, reason "an infant, too young to speak" — true in every phase).
  His relative (`companion`, role `carer`, "魏知远的家属（化名）/ Wei Zhiyuan's relative (pseudonym)") answers every
  question; which relative it is is not recorded, so the companion's figure has no `presentation`. The opening line is
  a bracketed narration.
* **No IV access is needed** on the reference path (all treatment is oral or a referral); only the IV bicarbonate trap
  requires `iv-access`.
* **Scope of practice.** Orders, drugs and the counselling meeting are a doctor's acts; referrals are consults; the
  nurse takes samples, sends them and gives prescribed medicines.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-1171301:"` passes: the offline demonstration finishes
  in-world in en and zh-CN with every objective done and the clinical-mode score.

## Source and adaptation (fidelity limits)

**From the facts of version 1.0.0 (kept, reorganised into phases and lay speech, not yet checked against the
article).** Age, sex and weight; the motor milestones at 8 and 11 months; the eye history at 3 months with congenital
cataracts and glaucoma operated on; birth order, gestation, mode of delivery and the absence of asphyxia, birth injury
or resuscitation; the healthy 10-year-old brother; the neurological and eye examination; the blood gas, haemoglobin,
urine pH and specific gravity, urine protein, β2-microglobulin and aminoaciduria; SMN1, EEG and the auditory evoked
potentials; the genetic result in the proband, the mother's blood and the controls; the diagnosis; the end of the
record at the molecular diagnosis.

**Extraction.** The 1.0.0 bundles were split into single records: "Blood gas and haematology" → `blood-gas` and
`haemoglobin`; "Urinary tubular evidence" → `urinalysis`, `urine-protein`, `urine-b2m`, `urine-amino-acids`;
"Neurological and related screening" → `smn1`, `eeg`, `hearing-aep`; "OCRL1 analysis" → `genetic-report` (renamed so
that no investigation name gives the diagnosis away); "Reported treatment and outcome" → `outcome`. The single
neurological finding became five manoeuvres, each with the words 1.0.0 used. The full table is in "Clinical numbers
check".

**Moved to the phase where it is true.** 1.0.0 showed every early result in one `workup` phase opened by examining;
the results now open after the first-tests decision, and the genetic report only after the diagnosis and the acidosis
plan.

**Adapted for teaching (labelled).** The relative (role and relationship not recorded — the persona says so), all
dialogue, and two worries that add no clinical fact (`concerns-admission`, `concerns-genetics`, sourced "Teaching
device"); the staff; the phase wording; decisions, options, feedback, interventions, rubric, objectives, teaching
points; the eight unrecorded tests offered with "No result is recorded for this test."; the order-entry notices; the
cot-side staging in the opening line.

**Contradictions and ambiguities kept, not resolved.**
* The urine specific gravity is printed "1.0", which is not a valid reading (normally 1.0xx); it is shown as recorded,
  with a note that it cannot be interpreted.
* Whether the haemoglobin of 70 g/L came from a blood count or the blood-gas analyser is not stated (1.0.0 groups it
  with the gas).
* 1.0.0 records a weight of 8.7 kg without saying when it was measured, while its guide says weights were not
  reconstructed; the weight is kept, undated.
* Whether the urine pH was measured at the time of the blood gas is not recorded; the teaching reads them together and
  the unknowns say so.
* "不能扶站或抓握交换物体" is read as "cannot stand with support, cannot grasp or transfer objects"; it could also mean
  he cannot do the grasp-and-transfer manoeuvre.
* "原报告未评估生殖腺嵌合" (germline mosaicism not assessed) is kept as "this case does not record any test for germline
  mosaicism", without claiming what the article says.

**Privacy.** Pseudonym unique in the collection; no hospital, city, date or identifying detail; times are ages and
phases. The source citation, which names the diagnosis, is shown only after the case.

**Figures.** `fig01` (approved in `scripts/cmcr-105-media-review.json`: "sequencing chromatograms show only bases,
position numbers and panel labels"; checksum unchanged) stays a local-only asset attached to no result, titled "原报告配图：
测序峰图（复盘时查看）/ Figure from the report: sequencing chromatograms (for the debrief)". It could not be inspected in this
environment, so whether its panels can be attached to the genetics-phase report is under "To verify".

**Capability check.** Every test and intervention exists in `general-hospital` (`caseCapabilityGaps` is empty): the
hearing test is a record review and the audiology, ophthalmology, nephrology, genetics and early-intervention steps
are consults or referrals.

**Survey findings fixed** (survey.json: the template defects; governance finding on spoiling summaries and
investigation names, which quoted this case's summary and "OCRL1 analysis"): the summary no longer says "a
multisystem genetic disorder" and differs from the triage note; no investigation is named after the gene; template
history slots and authoring language in the relative's mouth ("这项情况原病例资料没有说明…", "Companion (educational
role)") replaced by lay answers; 3 generic decisions with `supported`/`distractor` options → 5 decisions with content
ids and no length cue; the hindsight critical item on the third decision → two critical acts; interventions (0 → 12),
investigations, examination, objectives, staff and unknowns at the revised-20 depth; review status editorial with
eight named guidelines; one Vancouver citation; one extension schema (`sourceTextChecked: false`).

**Guidance corrected in this pass (2026-11-13).** The AAP 2014 clinical report, which the draft cited as current, has
been superseded by the AAP Council on Genetics 2025 clinical report; the case now cites 2025 for phenotype-led testing.
"MRI is preferred to CT" is no longer attributed to AAP 2014 (it is the 2003 AAN/CNS practice parameter's wording; the
case states it without attribution). Statements the review could not confirm in the primary texts were removed from
learner-facing text (the alkali dose of "more than 10 mmol/kg/day" for proximal wasting; "nephrotic syndrome before
1 year calls for genetic testing first" as an IPNA 2022 recommendation; "severe hypokalaemia is corrected first" as an
ERKNet/ESPN 2021 statement) and listed under "To verify". The derived "premature stop at codon 510" was removed (the
reference transcript is not recorded); PVS1 is called very strong evidence, as ACMG/AMP 2015 grades it.

## Matcher notes

* 47 `extensions.testUtterances` (25 zh-CN, 22 en), written as a learner would type them; none equals a keyword or a
  canonical question; 3 look-alike negatives (the distance from home, nursery, driving in). Every required item and
  both phase twins have a paraphrase; `cases verify` passes 47/47 with no extra selections.
* The chief complaint asked in plain words (fixed in the 2026-11-14 review): "孩子怎么了？" and "孩子会坐了吗？" had
  reached the sibling item, "What's the problem with him?" the eye history, and "What brings him in today?", "What's
  been going on?", "Why has he been admitted?" and "这次为什么住院？" nothing. `motor-now` now carries those phrasings
  (run-together English forms such as `whatstheproblem`, `bringshimin`, and 孩子怎么了、为什么住院、会坐), excludes
  eye and hearing words so "眼睛怎么了？" stays with `eye-history`, and — like `rolling` — answers in every phase (the
  relative's account does not change once the results are back). Five of the new corpus lines test these;
  "他能看见东西吗？" now reaches `vision-now` (it reached `eye-history`) and "Was he born at term?" / "他是早产的吗？"
  reach `birth` alone.
* Items without a corpus line in one language were probed with core `matchHistory` while authoring, each selecting its
  item alone: "Does he wear glasses or have any eye drops now?", "How much does he weigh now?", "Is he breast or bottle
  fed?", "Do you know his birth weight?", "Any allergies to medicines?", "Has he had all his jabs?", "Is anyone else in
  the family affected the same way?"; "他现在看东西怎么样，能看清人脸吗？", "爸妈是不是近亲结婚？", "他刚出生那几天黄不黄？",
  "平时吃什么药没有？", "他会不会咿咿呀呀发声？".
* Collisions fixed in this pass: "Was mum unwell or on medication during the pregnancy?" tied `birth`, `pregnancy` and
  `medicines` — `birth` now excludes medication, illness and "during the pregnancy", `medicines` excludes pregnancy
  and mother words, and `pregnancy` gained "during the pregnancy" and "when mum was pregnant"; "What's the long-term
  plan for him?" no longer half-matches `birth` through "full term" (`birth` excludes long-term and plan words);
  "孩子他爸妈身体都好吗？" now reaches `parents` (new keywords 爸妈, 父母健康).
* Keywords are kept apart across neighbouring items: `motor-now` excludes rolling and earlier-milestone words
  (→ `rolling`); `eye-history` excludes glasses, drops and current-vision words (→ `eye-care-now`, `vision-now`) and
  family words (→ `maternal-relatives`); `birth` excludes asphyxia, weight, fever and rash words (→ `birth-resus`,
  `birth-weight`, `pregnancy`); `family-sibling` excludes inheritance and maternal-relative words; `weight` excludes
  birth words; `sounds` excludes hearing words.
* Phase twin: `concerns-genetics` (`genetics`, `outcome`) supersedes `concerns-admission`.

## References

1. 江芳, 高岩, 欧志英. Lowe综合征OCRL1基因突变一例. 中华儿科杂志. 2012;50(9):708-709.
   doi:10.3760/cma.j.issn.0578-1310.2012.09.016. Available from: https://rs.yiigle.com/cmaid/1171301
2. Lewis RA, Nussbaum RL, Brewer ED. Lowe syndrome. 2001 Jul 24 [updated 2019 Apr 18]. In: Adam MP, Feldman J,
   Mirzaa GM, et al., editors. GeneReviews® [Internet]. Seattle (WA): University of Washington, Seattle; 1993-.
   Available from: https://www.ncbi.nlm.nih.gov/books/NBK1480/
3. Mercuri E, Finkel RS, Muntoni F, et al. Diagnosis and management of spinal muscular atrophy: Part 1:
   Recommendations for diagnosis, rehabilitation, orthopedic and nutritional care. Neuromuscul Disord.
   2018;28(2):103-115. doi:10.1016/j.nmd.2017.11.005
4. Rodan LH, Stoler J, Chen E, Geleske T, Weaver KN; Council on Genetics. Genetic evaluation of the child with
   intellectual disability or global developmental delay: clinical report. Pediatrics. 2025;156(1):e2025072219.
   doi:10.1542/peds.2025-072219
5. Richards S, Aziz N, Bale S, et al. Standards and guidelines for the interpretation of sequence variants: a joint
   consensus recommendation of the American College of Medical Genetics and Genomics and the Association for Molecular
   Pathology. Genet Med. 2015;17(5):405-424. doi:10.1038/gim.2015.30
6. Joint Committee on Infant Hearing. Year 2019 position statement: principles and guidelines for early hearing
   detection and intervention programs. J Early Hear Detect Interv. 2019;4(2):1-44. doi:10.15142/fptk-b748
7. Trepiccione F, Walsh SB, Ariceta G, et al. Distal renal tubular acidosis: ERKNet/ESPN clinical practice points.
   Nephrol Dial Transplant. 2021;36(9):1585-1596. doi:10.1093/ndt/gfab171
8. Emma F, Nesterova G, Langman C, et al. Nephropathic cystinosis: an international consensus document. Nephrol Dial
   Transplant. 2014;29 Suppl 4:iv87-iv94. doi:10.1093/ndt/gfu090
9. Trautmann A, Boyer O, Hodson E, et al. IPNA clinical practice recommendations for the diagnosis and management of
   children with steroid-sensitive nephrotic syndrome. Pediatr Nephrol. 2023;38(3):877-919.
   doi:10.1007/s00467-022-05739-3

The same strings are `debrief.references`. How they were checked (2026-11-13; PubMed, PMC and publisher full texts
could not be fetched from this environment, so web-search records were used): ref. 1 — the source map's verified DOI
(publisher metadata, 2026-10-29); ref. 2 — NCBI Bookshelf records (NBK1480; authors Richard Alan Lewis, Robert L
Nussbaum, Eileen D Brewer; posted 2001 Jul 24, updated 2019 Apr 18), and that the chapter reports dense congenital
cataract in all affected boys, infantile glaucoma in about half, characteristic lens opacities in most heterozygous
women on slit-lamp examination, and germline mosaicism; ref. 3 — repository records (volume, issue, pages, DOI);
ref. 4 — journal and society records (AAP Council on Genetics, July 2025 issue, DOI; phenotype-first test selection,
an agnostic approach otherwise); ref. 6 — the JCIH executive summary's reference (volume, issue, pages, DOI); ref. 7 —
repository records (volume, issue, pages, DOI); ref. 9 — PubMed/PMC records (PMID 36269406; DOI; the definition of
nephrotic syndrome by nephrotic-range proteinuria with serum albumin below 30 g/L, oedema only when albumin is not
available). Refs. 5 and 8 were not re-checked in this pass (ref. 5 is the standard ACMG/AMP citation; ref. 8 is
printed without a DOI).

Re-checked in the independent review of 2026-11-14: ref. 2 — the update date (2019 Apr 18) and, through a summary of
the chapter, its management of the tubulopathy (oral sodium and potassium bicarbonate or citrate for acidosis and
hypokalaemia; oral phosphate and calcitriol for hypophosphataemia and renal rickets); ref. 3 — the full text of the
Diagnosis section ("Genetic testing of SMN1/SMN2 … is first line investigation when the condition is suspected in a
typical case … there is no need for a muscle biopsy"; with both full SMN1 copies present "a diagnosis of SMA is
highly unlikely"); ref. 4 — the five authors (Rodan, Stoler, Chen, Geleske, Weaver), published online 2025 Jun 23,
phenotype-first test selection and an agnostic approach (exome or genome) otherwise; ref. 7 — the publisher's full
text: alkali "as frequent as possible" (small amounts with each feed in infants, three to four times daily in older
children), plasma bicarbonate, chloride, potassium and urinary calcium kept in the age-appropriate range, the
diagnostic urine pH > 5.5 with a positive urine anion gap, low-molecular-weight proteinuria and aminoaciduria in
untreated dRTA (mainly infants with severe acidosis) resolving on alkali, and no statement on correcting hypokalaemia
before alkali; ref. 8 — PubMed 25165189, DOI 10.1093/ndt/gfu090 (now printed), "the most common cause of inherited
renal Fanconi syndrome in young children".

### To verify

**Against the full source article (the source pass):**
* Every patient fact listed in "Clinical numbers check" and "Source and adaptation", word for word.
* The weight of 8.7 kg: whether the article records it and when it was measured; length and head circumference.
* Vital signs on admission, and whether any growth chart or nutritional assessment is given.
* The full admission blood panel: sodium, potassium, chloride, calcium, phosphate, magnesium, urea, creatinine,
  albumin, alkaline phosphatase, PTH, vitamin D, CK, LDH; and whether the haemoglobin of 70 g/L comes from a blood
  count (with red-cell indices) or the gas analyser.
* The blood gas: sample type, PCO₂, lactate, and whether the urine pH was taken at the same time.
* The urine: the true specific gravity (printed "1.0"), glycosuria, phosphaturia, calcium/creatinine ratio, the
  urine albumin and any other low-molecular-weight protein; the method of the amino-acid analysis.
* The eyes: the type and timing of the operations (lensectomy, IOL or aphakia; the glaucoma procedure), what the
  white patch lateral to the left pupil is, intraocular pressures, visual function, current drops or correction.
* The hearing test: the side, the wave latencies and thresholds, whether it was a brainstem response, and the newborn
  hearing screen.
* Brain imaging, if any; whether seizures, feeding problems or a newborn course are described.
* The genetic test: method (Sanger of all exons, panel or exome), the reference transcript and protein-level name
  (p.?), whether the father or the brother was tested, and whether germline mosaicism was discussed; the content and
  panel labels of `fig01`, and whether it can be attached to the `genetics`-phase report.
* Any treatment given (alkali, potassium, phosphate, vitamin D), the discharge and any follow-up — 1.0.0 records none.
* Who accompanied the child (to name the companion by relation) and the family history on the mother's side.

**Guidance details (for a clinician of the specialty; the items checked in full text are listed above):**
* GeneReviews (2019): the exact treatment wording for the renal tubulopathy (oral bicarbonate or citrate, potassium,
  phosphate, calcitriol) — confirmed only through a summary citing the chapter (NCBI Bookshelf could not be opened from
  this environment); the age threshold and percentage for lens opacities in heterozygous women; the germline-mosaicism
  figure (a secondary record gives 4.5 %; the case quotes no number); the statement that kidney function declines with
  age.
* AAP 2025 clinical report: whether it says anything about metabolic or renal screening tests in a child whose
  phenotype suggests a multisystem disorder (the case cites it only for phenotype-led test selection, which secondary
  records confirm).
* Applying the distal-RTA practice points (ERKNet/ESPN 2021) to a proximal tubulopathy: the case uses them only for the
  principles (oral alkali, frequent dosing, a normal plasma bicarbonate as the target) and says so; a paediatric
  nephrologist should confirm the regimen for an 11-month-old with proximal bicarbonate wasting.
* The alkali requirement in proximal bicarbonate wasting: clinical references give 5–15 or 10–15 mmol/kg/day; the case
  says only "several times the distal-RTA dose" until a guideline figure is confirmed.
* IPNA 2022 (steroid-sensitive nephrotic syndrome): the age range it covers and its advice for onset before 1 year (an
  earlier draft of this case attributed "genetic testing first" to it; removed until confirmed).
* "MRI preferred to CT" for imaging in developmental delay: the 2003 AAN/Child Neurology Society practice parameter
  (Shevell et al., Neurology 2003;60:367-380) is its source; whether AAP 2025 or a current neurology guideline restates
  it.
* JCIH 2019: the timing it asks for diagnostic audiology and amplification after a late-identified hearing loss.
* Chinese guidance a reviewer may add: national consensus on SMA diagnosis and management and on hereditary tubulopathies
  (versions not confirmed in this review).
* The 0.86 g/24 h of protein: with no length recorded the case gives no per-m² figure; a weight-only estimate of body
  surface area (see "Clinical numbers check") puts it in the nephrotic range by amount, which a nephrologist may want
  to address explicitly in the debrief (the case's teaching rests on the missing albumin and the tubular pattern, not
  on the amount).

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Card.** Title "Unsteady head control and not yet sitting · 11-month-old boy"; a spoiler-free summary (1.0.0's said
  "a multisystem genetic disorder") distinct from the triage note; specialty ids canonical (`pediatrics`, `neurology`,
  `ophthalmology`, `genetics`); topic tags without the diagnosis.
* **Story and phases.** `initial` / `workup` / `confirmation` / `followup` → `admission` → `first-results` →
  `genetics` → `outcome`, gated on objectives and decisions, the outcome after all five decisions.
* **Decisions.** 3 → 5 with 24 options and their own guideline-based feedback: first tests, the unifying diagnosis,
  the acid–base plan, explaining the genetic result, long-term follow-up. Option ids `supported` / `distractor` →
  content ids; no length cue.
* **Interventions.** 0 → 12: oral alkali, phosphate and calcitriol (neutral), nephrology review, genetic test with
  consent, post-test counselling, ophthalmology, audiology and early-intervention referrals, and four contraindicated
  traps with harm texts (IV bicarbonate bolus — critical; prednisolone for "nephrotic syndrome"; a zero-risk promise;
  routine discharge).
* **History and examination.** 15 template slots (8 "the source case does not provide…" answers; adult items such as
  surgery and function) → 24 items in the relative's voice (6 required, 15 honest unknowns in lay words, 2 labelled
  worries); 2 bundled findings → 6 manoeuvres; `examNotRecorded` now says "This case does not record this examination."
* **Investigations.** 5 bundles → 19 single records with structured values ("reference range not recorded"), neutral
  tests, and honest "No result is recorded for this test." entries; "OCRL1 analysis" renamed "Genetic test report".
* **Assessment.** The single critical item, met by answering the management decision right first time (`rb-safety`), → 2 critical acts (`rb-acidosis-treated`,
  `rb-no-bicarbonate-bolus` with `scoredWhen`); 12 rubric items with first-try scoring; a Calgary–Cambridge
  communication item written for this family. Do nothing scores 0; a wrong first answer everywhere scores 48 %.
* **Teaching layer.** 6 learning outcomes, 6 key reasoning steps, 5 teaching points with guidance and year, 8 unknowns,
  4 staff (attending, nurse, nephrology and genetics consultants), 9 Vancouver references, editorial review status with
  eight guidelines and the review notes STANDARD §1.2 and §6.3 require.
* **Completed 2026-11-13 (same version).** The interrupted draft was reviewed against the fact base and the standard:
  the review note's wording; AAP 2014 → AAP 2025 (superseded report); the "MRI over CT" attribution removed; unconfirmed
  guideline statements and the proximal alkali dose removed from learner text; the derived codon removed; PVS1 graded
  very strong; the diagnosis removed from the nephrology consultant's brief, from harm texts reachable before decision 2
  and from the provenance notes; the genetics consultant limited to the SMN1 result and test choice until the report is
  read; "the report records … but not the counselling" rewritten as what this case records; oral alkali counts for the
  critical item only after the electrolytes are sent; select-all distractors lengthened; three matcher collisions fixed;
  the conclusion trimmed to 1,000 characters; this guide written.
* **Independent review 2026-11-14 (same version).** Every patient fact re-traced to 1.0.0 (none added or changed).
  Fixed: the objective titles "Treat the acidosis safely" and "Explain the genetic result…", which the journal shows
  from the start and which announced the acidosis and a genetic result before decision 1 (now "Start his treatment
  safely", "Talk with his family and plan his long-term follow-up"); the chief complaint asked in plain words reached
  the sibling or eye item or nothing (keywords, every-phase motor history, eight new corpus lines); the distal-RTA
  feedback and teaching point 2 said distal RTA never leaks amino acids or small proteins and cited ERKNet/ESPN 2021,
  which says such a leak occurs in untreated infants with severe acidosis — rewritten with that guidance; the urine pH
  of 7.0 is now taught as showing a tubular acidosis that the leak localises, not as a proximal sign itself
  (learning outcome 2, the decision-2 key's feedback); dosing "as frequent as possible, with feeds in an infant" as
  ERKNet/ESPN 2021 says; ERKNet/ESPN cited as distal-RTA guidance wherever it appears; the muscle-biopsy and
  VUS feedback no longer attribute to the SMA consensus and ACMG/AMP what they do not say; SPIKES for the genetic
  diagnosis in the communication item and learning outcome 6; the relative's genetic worry no longer makes them a
  parent ("another baby of ours"); zh/en parity of the IV-bolus distractor (30 minutes) and the conclusion (birth
  order, birth injury, the evoked-potential findings); all five AAP 2025 authors and the cystinosis consensus DOI;
  this guide's validation command, To-verify list and derived per-m² protein estimate. Scores re-measured: unchanged.

### 1.0.0 — 2026-10-28

* Initial template version (PR #5): 15 history items, 2 exam findings, 5 records, 3 decisions, 11 rubric items, no
  interventions.

## Validation

Run from the worktree root (all passed on 2026-11-13 and again after the review on 2026-11-14):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-1171301/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1171301 --lang en          # 76 steps · objectives 6/6 · decisions 5/5 · utterances 47/47 · rubric 29/29
npx tsx --conditions=source scripts/case-check.ts cmcr-1171301        # depth floor, do-nothing 0, wrong-first 48 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1171301:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1171301:"   # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 男婴，母亲第二胎第二产，41周顺产，无窒息、产伤及抢救史。3个月时眼睛不追光物，诊断先天性白内障和青光眼并
手术；8个月仍不会翻身，11个月抬头不稳、不能独坐；10岁哥哥健康；记录体重8.7 kg（称重时间不详）。查体：反应迟钝，不能扶站，
不能抓握、交换物体，四肢松弛、肌张力低，腱反射未引出；左瞳孔外侧少许白斑，双瞳孔上方裂缝样术后改变，视力未量化。血气pH 7.271、
HCO₃⁻ 17.9 mmol/L、BE −8.4 mmol/L；血红蛋白70 g/L；尿pH 7.0（尿比重记为“1.0”），尿蛋白0.86 g/24 h，尿β2微球蛋白 > 500 µg/L，
广泛性氨基酸尿；SMN1未见异常；脑电图正常；听觉诱发电位潜伏期延长、部分听阈异常。OCRL1（现行HGNC符号OCRL）第15外显子
c.1528C>T无义变异，母亲外周血及20条对照染色体未检出；报告诊断为Lowe综合征（眼脑肾综合征）。本病例没有记录治疗和随访。
本版事实沿用1.0.0版的提取内容，尚未对照原文全文核对。

**学习目标。**
1. 对先天性白内障和青光眼术后、低张力伴腱反射消失的婴儿，想到眼脑肾多系统疾病，按整体表型选择检查（AAP 2025），在送SMN1
   （2018年国际脊髓性肌萎缩诊疗共识）的同时查血气、电解质和尿液。
2. 把血酸时尿pH 7.0判读为肾小管性酸中毒，用β2微球蛋白 > 500 µg/L和广泛性氨基酸尿把它定位在近端小管（肾性范科尼型表现），
   并与远端肾小管酸中毒、胱氨酸病和IPNA 2022定义的肾病综合征鉴别（0.86 g/24 h尿蛋白而没有白蛋白记录，不足以诊断肾病综合征）。
3. 先测钾、磷、钙和肌酐，再全天分次口服枸橼酸盐或碳酸氢钠（这个月龄可随喂奶少量给），按血碳酸氢根逐步纠正，按结果补钾、
   补磷和骨化三醇（GeneReviews 2019；ERKNet/ESPN 2021远端肾小管酸中毒的原则）；不静推碳酸氢钠，不对肾小管性蛋白尿用激素。
4. 按ACMG/AMP 2015判读OCRL无义变异，说明母亲血液阴性不能排除生殖腺嵌合，提供遗传咨询、母亲裂隙灯晶状体检查和再孕时的
   产前或胚胎植入前检测。
5. 制订终身多学科随访：眼压和视功能、尽快诊断性听力评估并助听（JCIH 2019）、肾小管、骨骼和肾功能监测、早期干预，并另查
   70 g/L血红蛋白的原因。
6. 按Calgary–Cambridge结构向家属解释诊断、治疗、遗传方式和不确定性，用SPIKES告知基因诊断这一坏消息，用回授法确认理解。

**关键决策。** ① 首批检查（多选）：血气加电解质、钙磷和肌酐，尿pH、尿蛋白、β2微球蛋白和尿氨基酸，SMN1（干扰项：全麻下
肌活检、头颅CT）；② 统一诊断：X连锁眼脑肾综合征（Lowe综合征），送OCRL确诊（干扰项：胱氨酸病、伴耳聋的远端肾小管酸中毒、
先天性风疹、婴儿型肾病综合征）；③ 纠酸：先查钾磷钙肌酐，再分次口服碱剂按血碳酸氢根调整（干扰项：按碱缺失静推碳酸氢钠、
等基因结果、每日一次小剂量）；④ 解释基因结果：变异解释病情，母亲血液阴性不能排除生殖腺嵌合，风险低但不为零（干扰项：零风险、
母亲必为携带者50%、给哥哥做携带者检测、当作意义不明的变异先不谈）；⑤ 长期随访（多选）：眼压与视力、听力评估与助听、肾脏骨骼
与生长（干扰项：停止肾脏化验、2岁再看听力）。关键项：基因报告回来前先送电解质再开始口服碱剂（基因报告在开始碱剂之后才开放），
以及不静推碳酸氢钠。

**安全结果。** `iv-bicarbonate-bolus` 标为 `critical: true`：对低张力、肾小管病未治疗且血钾血钙未知的婴儿静推碳酸氢钠，可能诱发致命的低钾和低钙抽搐，给予即判安全结果不通过，无论得分多少；泼尼松、零风险保证和常规出院为中度风险，`critical: false`。

**复盘要点（PEARLS）。** 先谈感受；复述病史、查体和首批检查的理由；分析：腱反射消失让你先想到什么、哪些表现不符合；血酸时
尿pH 7.0说明什么、哪些尿检把漏出定位在近端小管、为什么0.86 g/24 h的尿蛋白不是用激素的理由；给碱剂前先查了什么、为什么不静推
碳酸氢钠；母亲血液阴性时怎样解释再发风险（既不是零也不是一半），健康的哥哥要不要检测；哪些异常不能归到综合征上（贫血）；
2012年的报告止于基因诊断，今天的照护应是怎样、由谁协调。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
