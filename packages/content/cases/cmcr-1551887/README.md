# cmcr-1551887 — Sleep disturbance and difficulty concentrating · 31-year-old woman

> **Spoilers for facilitators.** This guide names the diagnosis. Learners open the case from the case
> library, whose title, summary and triage note give nothing away. The patient (钟女士 / Ms Zhong) and
> her family member are pseudonymous teaching roles; the hospital, calendar dates and the testing
> laboratory's location are removed. Times are relative to the first visit (day 0).

## Case card

| | |
|---|---|
| Case | `cmcr-1551887` · v1.1.1 · CMCR collection (`cmcr-20`) |
| Source | 梁建明, 葉婉婷, 鄧紫瑩, 趙凱茵. 家族性致死性失眠症患者1例. 鏡湖醫學. 2025;25(1):57-58 |
| Setting | Outpatient first visit (`outpatient`) → ward admission → specialist clinic → later course (phase locations) |
| Facility | `general-hospital` |
| Difficulty | 4 / 5 |
| Estimated time | ~35 min (static clock — a staged review of the historical record, no physiology) |
| Specialty | Neurology, sleep medicine, clinical genetics |
| Languages | zh-CN (source language), en |
| Learner level | Final-year medical students, foundation/resident doctors in neurology, psychiatry and general medicine |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have a neurologist (ideally one with prion-disease and clinical-genetics experience) review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Reconstruct the timeline of this rapidly progressive illness from the first visit to death
   (relative to the first visit as day 0) and identify the conflict between the duration the authors
   state and the dates in the text.
2. Grade the recorded evidence as possible, probable or definite FFI with the 2018 Chinese consensus
   (and its 2022 revision), naming the missing evidence: autonomic features, PSG, PET/SPECT and the
   specific PRNP variant (D178N-129M).
3. Explain why a normal MRI, EEG and routine CSF do not exclude genetic prion disease, and arrange tests
   for the treatable mimics (serum and CSF autoimmune-encephalitis antibodies, a paraneoplastic screen)
   alongside genetic testing.
4. Apply the WHO 2000 TSE infection-control precautions to invasive procedures, CSF and tissue
   specimens and instruments, and explain why the patient needs no isolation.
5. Plan genetic counselling (maternal-line relatives, voluntary predictive testing, no assumptions
   about her mother's status) and start palliative care and advance care planning before swallowing
   and consciousness fail.

These are `learningOutcomes` in `case.json`. They name the diagnosis, so front-ends show them before
play only behind the closed "Learning outcomes (5) · may reveal the diagnosis" disclosure and list them
in every debrief (CASE_AUTHORING §9.4, GLOSSARY §4).

## Clinical summary

A 31-year-old woman presents to an outpatient clinic with sleep disturbance and difficulty
concentrating. In her own words: after starting the oral contraceptive pill for irregular periods her
sleep got worse — shallow sleep, frequent nightmares, startling easily and feeling panicky — with
daytime sleepiness and poor concentration; no obvious low mood; appetite preserved but 6 kg weight
loss; she took alprazolam on her own. About 3 months later her family notices muddled speech and
involuntary movements of all four limbs; at about 4 months she is anxious, her memory is failing and
she complains of blurred vision, and a COVID test is positive a few days before she is admitted with
"six months of tension and overthinking and over a month of progressive memory decline". On admission
she is tense with poor memory and calculation, normal tone and a mild bilateral arm tremor. Brain MRI,
MR venography, routine CSF, abdominal ultrasound, chest X-ray and ECG are unremarkable; the EEG is mildly
abnormal (an 8–9 Hz posterior alpha background with many scattered 5–7 Hz theta waves, no epileptiform
discharges). At a specialist clinic about 5 months after the first visit the doctor learns that a
maternal uncle had a similar illness, diagnosed at the time as cerebral atrophy and Parkinson's
disease, and died. Blood is sent for PRNP testing; the report reads only "PRNP (+)", and the authors
diagnose **fatal familial insomnia (FFI)**.

Later course (followup phase): about 6 months — laboured breathing, rigidity and coma, improved with
supportive care; about 7–8 months — pneumonia, poor sleep, failing swallowing and poor intake needing a
nasogastric tube; about 9–10 months — hypoglycaemia, poor consciousness and malnutrition, death from
respiratory failure on day 8 of that admission.

**Teaching diagnosis.** By the 2018 Chinese consensus that the report reproduces in its Table 2, the
recorded evidence fits **probable FFI** (group A sleep disturbance + group B rapidly progressive
cognitive and neuropsychiatric features + a positive family history as a suggestive feature). The
report gives no variant or codon-129 genotype, so "definite" cannot be checked against the same
criteria. Group C (autonomic) features, PSG and PET are not reported.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`), no `physiology` block: this is a staged historical review, not
a physiological simulation. The learner switches between the first three phases; the last opens itself.

| Phase | When (relative) | Location (embodied) | What the learner can do |
|---|---|---|---|
| `initial` 首诊（门诊） | Day 0 | outpatient consult room | Her own account (sleep, onset after the pill, concentration, mood, weight, medicines); no examination or tests are recorded for this visit |
| `workup` 入院检查 | ~4 months | ward bed (`location: inpatient`) | The family member's account of the last month or two, the admission complaint, the admission examination, the admission reports (record reviews), the work-up and infection-control decisions |
| `clinic` 专科门诊 | ~5 months | outpatient consult room | The family history, PRNP testing (a real send-out order), the diagnosis-grading and family decisions, genetic counselling and palliative care |
| `followup` 后续病程与结局 | ~6–10 months | ward bed | Locked (`learnerSwitchable: false`); opens when all four decisions are answered; the record of the later course and outcome |

Relative times were computed from the dates in the source (first visit dated to the month only):
the first family-reported changes ≈ 3 months, the next ≈ 4 months, admission ≈ 4 months, specialist clinic ≈ 5 months,
coma episode ≈ 6 months (5.7–6.7), pneumonia ≈ 7–8 months (7.1–8.1), hypoglycaemia ≈ 9–10 months
(9.1–10.1), death 8 days later (≈ 9.3–10.3 months). In the admission phase the family member speaks
relative to the admission ("since last month", "since the start of this month").

## Decisions and assessment

### Objectives (HUD task list)

1. **First visit: understand the sleep problem** — presentation, onset relative to the pill, sleep
   pattern, appetite and weight, medicines.
2. **Admission: progression and examination** — admission complaint, speech and movements, memory;
   cognition and motor examination.
3. **Review the admission reports and plan the next steps** — MRI/MRV, EEG, CSF, then `dec-workup`.
4. **Specialist clinic: family history, genetic test and grading** — family history, PRNP result,
   `dx-criteria`.
5. **Safety, the family and the care plan** — `dec-infection`, `dec-family`, TSE precautions, genetic
   counselling, palliative care.
6. **Review the course and outcome** — the followup record.

### Decisions (5 options each; every option has its own feedback)

| id | kind | opens when | correct answer | distractors |
|---|---|---|---|---|
| `dec-workup` | multiple | MRI, EEG, CSF read (workup) + speech/movements or memory asked | detailed family history · serum and CSF autoimmune-encephalitis antibodies + tumour screen · PRNP testing after counselling, asking for the variant and codon 129 | "tests normal — treat as anxiety, more alprazolam, stop the pill" · brain biopsy |
| `dx-criteria` | single | sleep pattern + progression asked, cognition examined, family history asked, PRNP read (clinic) | probable FFI on clinical grounds; "definite" cannot be checked without D178N/codon 129 | definite FFI, nothing to check (the report's own conclusion) · prion disease excluded by normal tests · cannot be graded without PSG/PET · primary insomnia with anxiety |
| `dec-infection` | single | `dec-workup` decided + CSF read | standard precautions, no isolation; TSE precautions for invasive procedures, CSF/tissue specimens and instruments | full isolation with N95 · no measures because it is genetic · withhold invasive procedures · routine autoclaving is enough |
| `dec-family` | single | family history asked + PRNP read | genetic counselling; 50% risk to each child; voluntary predictive testing for at-risk adults; obtain the full report | test every relative now · uncle's old diagnosis is unrelated · mother must be a carrier · withhold the risk |

`dec-workup` opens in the admission phase, before the family history (which the report records only at
the specialist clinic) and before the PRNP result, so it tests reasoning rather than reading. The PRNP
result names the authors' diagnosis but not the grade, which is what `dx-criteria` asks.

### Rubric (11 deterministic items, 24 points, + 1 examiner-judged)

| Domain | Item | Weight |
|---|---|---|
| History | First-visit sleep history: presentation, onset relative to the pill, sleep pattern, weight, medicines | 2 |
| History | Progression from the family: admission complaint, speech/movements, memory | 2 |
| History | Family history (the uncle) | 3 |
| Examination | Cognition and motor examination | 2 |
| Investigations | Admission MRI/MRV, EEG and CSF reviewed | 2 |
| Investigations | `dec-workup` right at the first attempt | 2 |
| Diagnosis | `dx-criteria` right at the first attempt | 3 |
| Safety | `dec-infection` right first time + TSE precautions applied + no unnecessary isolation (annotation: `critical`) | 3 |
| Management | `dec-family` right first time + genetic counselling referral | 2 |
| Management | Palliative care referral and advance care planning | 2 |
| Safety | No escalating sedative hypnotics once the work-up is planned (counts only after `dec-workup` is attempted; annotation: `scoredWhen`) | 1 |
| Communication (examiner) | Talking with her and her family: illness, uncertainty, genetic risk, goals of care | 2 |

### How wrong choices score

Decisions are scored with `decidedFirstTry`: a wrong first answer followed by the right one unlocks the
case but loses the item. Isolation is a neutral intervention whose response corrects it, but it loses
the weight-3 safety item. Escalating hypnotics is neutral (risk moderate, a corrective response) and
loses the sedation item. A nasogastric tube before the followup phase is *contraindicated* (no
dysphagia is recorded then) and appears as a safety event. Stopping the pill is neutral; its response
explains that sequence is not causation.

## Reference path (`solution`)

56 steps: the first-visit history (16 questions, including the unknowns), the admission phase (8
questions, both examinations, the four admission reports), `dec-workup`, the autoimmune-encephalitis
antibody order (no result in the source), `dec-infection` and TSE precautions; the specialist clinic
(family history, genetic counselling, PRNP, PSG and PET record checks), `dx-criteria`, palliative care,
`dec-family`; then the followup record and finish. It scores **24/24** with no contraindicated action
(clinical and embodied mode alike).

## Clinical numbers check

* **Timeline.** See the phase table; the authors' "about nine months from onset to death" fits the
  first-visit-to-death interval only at its lower bound (≈ 9.3–10.3 months) and conflicts with the
  onset implied by the admission complaint (six months of tension before an admission at ≈ 4 months,
  i.e. onset ≈ 2 months before the first visit, ≈ 12 months before death). Kept and labelled.
* **Weight.** 6 kg loss, no baseline weight or height recorded (no BMI is derived).
* **EEG.** Posterior alpha 8–9 Hz, 20–60 μV, symmetrical; a few beta 14–20 Hz, 10–20 μV; many theta
  5–7 Hz, 20–50 μV; no epileptiform or focal change — "mildly abnormal" (as printed).
* **Criteria applied (2018 consensus as in source Table 2).**

  | Item | Recorded? | Evidence |
  |---|---|---|
  | A — organic sleep disturbance | yes | insomnia, shallow sleep, nightmares, startle |
  | B — rapidly progressive dementia / neuropsychiatric | yes | memory and calculation decline over a month or more, muddled speech, anxiety, tremor |
  | C — progressive sympathetic features | not recorded | no BP, heart rate, sweating or breathing pattern reported |
  | Suggestive: family history of RPD and insomnia | arguably yes | maternal uncle with "similar symptoms" (details not given) |
  | Suggestive: PSG; SPECT/PET thalamic hypometabolism | not done / not reported | — |
  | Definite: PRNP D178N with codon-129 genotype | not verifiable | report gives "PRNP (+)" only |

  Possible = A + 1–2 of B/C (met); probable = ≥ 2 core groups + ≥ 1 suggestive feature (met if the
  uncle's illness counts); definite = PRNP-positive as specified (cannot be checked).
* **Units.** μV and Hz as printed; no laboratory values are given in the source.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did it feel to follow her from a sleep complaint to her death in under a year?"
2. **Description** — "Walk me through the timeline. When did each new symptom appear, and who told you
   about it?"
3. **Analysis**
   * "At the first visit, what made this more than primary insomnia?"
   * "The MRI, EEG and CSF were essentially normal. What did that rule out — and what not?"
   * "Which treatable conditions did you look for before the genetic result?"
   * "The report says 'PRNP (+), confirming FFI'. How did you grade it, and what would you need to call
     it definite?"
   * "She had a lumbar puncture. What changes for the ward, the laboratory and the instruments — and
     what does not?"
   * "Her family asks whether this is inherited. What did you say about her mother, her relatives and
     testing?"
   * "When would you have raised feeding and resuscitation with her, and why then?"
4. **Summary** — "What will you do the next time a young patient's insomnia comes with rapid cognitive
   decline?"

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| Anchoring on the pill or on anxiety | `onset`/`medications` answers give only the sequence; `dx-criteria` and `dec-workup` distractors; `stop-ocp` response |
| Treating normal tests as reassuring | `dx-criteria` "excluded" distractor; `dec-workup` "treat as anxiety" distractor |
| Accepting "PRNP (+)" as definite | `dx-criteria` "definite" distractor (the report's own conclusion) |
| Forgetting treatable mimics | `dec-workup` requires the antibody option; AE antibodies are orderable (no result in the source) |
| Isolating the patient, or ignoring instrument risk | `dec-infection` distractors; `isolation` response; weight-3 safety item |
| Inferring the mother's genotype, or blanket testing | `dec-family` distractors |
| Leaving goals of care until dysphagia | palliative-care item; NG tube contraindicated before the followup phase; teaching point 6 |

### Teaching points (as in the debrief)

1. Grade against criteria, not the report's conclusion (Wu 2018; Chu 2022; GeneReviews 2021).
2. Normal MRI, EEG and routine CSF do not exclude FFI (2018 consensus: low sensitivity of tests).
3. Exclude treatable mimics: autoimmune encephalitis, paraneoplastic disease, anti-IgLON5 disease
   (Graus 2016; Chinese AE consensus 2022; Sabater 2014).
4. TSE infection control: no isolation, standard precautions, TSE handling of instruments and specimens
   (WHO 2000; PHAC 2007).
5. Genetic counselling: autosomal dominant, 50% to each child, voluntary predictive testing, no
   inference about the mother (GeneReviews 2021).
6. Early palliative care and advance care planning (GeneReviews 2021: no treatment of the cause).

## Embodied mode

* **Where the patient goes.** The case `setting` is `outpatient` (a consult room). Phase locations move
  her: `workup` and `followup` → the first ward bed (`{"setting": "inpatient"}`), `clinic` → back to a
  consult room (`{"setting": "outpatient"}`); `initial` also names `outpatient`, so switching back puts
  her in clinic again. Nothing is charged for these moves.
* **Record reviews.** MRI/MRV, EEG, CSF, routine tests, PSG, PET and the followup record are
  `category: "record"` with `requires: ["records"]` and `risk: "none"`: they are read at a records
  terminal (the ward nurse station or the ED station in `general-hospital`), never on a scanner or by
  sampling. The annotation file adds `performedAt: "records"` for them when the framework supports it.
* **Real orders.** PRNP (`molecular`) is ordered and read at the pathology workstation; the
  autoimmune-encephalitis antibodies (`lab-serology`) are a blood/CSF sample taken at the patient's side
  (the case has no IV-access procedure), with no result in the source (`available: false`).
* **Scope of practice.** `swallow-screen` and `ng-tube` are authored `scope: "nursing"`; consults
  (genetics, palliative care) can be placed from anywhere; `tse-precautions` and `isolation` are bedside
  acts (`kind: "other"`).
* **Speech.** Her family member (`persona.companion`, `answersHistory: true`) answers the admission and
  clinic history; her own first-visit account and her concerns are `speaker: "patient"`. The annotation
  `patient.nonVerbalWhen: {"phase": "followup"}` makes her non-verbal in the course review once the
  framework supports it.
* The offline demonstration scores 24/24 in both clinical and in-world mode.

## Source and adaptation

**From the report (paraphrased):** age, sex, the chief complaint and first-visit self-report (sleep,
onset after the pill, concentration, mood, appetite, 6 kg weight loss, self-medicated alprazolam); the
family-reported changes at ≈ 3 and ≈ 4 months (muddled speech, involuntary limb movements,
anxiety, memory decline, blurred vision), the COVID test, the admission complaint; the admission
examination (tense, poor memory and calculation, normal tone, mild bilateral arm tremor); the admission
tests (ultrasound, X-ray, MRI, MR venography, ECG, the full EEG description, CSF "no abnormality"); the
specialist-clinic family history; "PRNP (+)"; the later admissions and death; the authors' differential
(familial CJD, GSS, autoimmune encephalitis, paraneoplastic syndrome) and their Tables 1–2 (the 2018
criteria).

**Adapted for teaching:** dialogue and lay wording; the companion (the report says only "家人", so the
relation is unstated); the split into four phases with relative times; the family history made
answerable from the admission onwards (the report records it at the specialist clinic and does not say
whether it was asked earlier — the `source` note and debrief say so); the PRNP test as an order the
learner places; decisions, interventions (genetic counselling, palliative care, TSE precautions,
isolation, hypnotics, stopping the pill, swallow screen, NG tube), rubric and debrief. Infection
control, genetic counselling and palliative care are **not** in the report and are labelled as added
from current guidance.

**Labelled contradictions and unclear source text (kept, not resolved):**
* Duration: the discussion's "about nine months from onset to death" vs the dates (≈ 9–10 months from
  the first visit; ≈ 12 months from the onset the admission complaint implies) — `followup` result
  note, key reasoning 6.
* "其后出现感能力差" (first-visit self-report): meaning unclear, confirmed in the print at 300 dpi; not
  used and not rewritten as "memory" or "perception" — `unknowns`, the `concentration` item's `source`.

**De-identification:** calendar dates and month names → relative times; the named city of the testing
laboratory → "an external laboratory"; the hospital is not named in case text (the journal title in the
citation is kept).

**Figures and PDF:** the article has no figures (two tables, used as the criteria, not as patient data).
The source PDF (2 pages) was viewed in full: no patient identifier; the foot of page 2 carries the
continued references of another article ("上接77頁"), which the PDF title now says. The first page
shows the authors' affiliation and e-mail (the publication's byline). Nothing was withdrawn.

## Matcher notes

* 25 history items (9 required), 2 exam findings, 9 investigations, 8 interventions.
* Phase restriction carries the timeline: first-visit items are `initial`-only; family-reported items
  are `workup`-only; `family` is `workup` + `clinic`; unknowns (allergies, operations, smoking, alcohol,
  occupation, autonomic symptoms, concerns) are available in every phase.
* `excludeKeywords` stop look-alikes: medicine questions about dose (几片, how many) go to `dose`; "help
  you sleep" goes to `medications`, not `sleep-pattern`; "what are you most worried about" goes to
  `expectations`, not the family's `anxiety` item; "focus at work" stays off `occupation`.
* The first-visit `concentration` item carries no memory keywords: the report records no memory
  complaint at the first visit, so a memory question there gets the "not recorded" fallback.
* English multi-word keywords that would reduce to one token are written run together
  (`whatbringsyou`, `whendiditstart`, `whyissheinhospital`, `manageonherown`).
* 40 `extensions.testUtterances` (20 zh-CN, 20 en; every required item has at least one) pass `cases
  verify`; a separate realistic probe set (track notes) reached 38/38 history, 12/12 exam (including two
  unrecorded manoeuvres that correctly select nothing), 16/16 orders and 14/14 interventions.

## References

1. 梁建明, 葉婉婷, 鄧紫瑩, 趙凱茵. 家族性致死性失眠症患者1例. 鏡湖醫學. 2025;25(1):57-58.
   https://rs.yiigle.com/cmaid/1551887. doi:10.12408/j.issn2223-4462.2025.01.014
2. Wu LY, Zhan SQ, Huang ZY, et al. Expert consensus on clinical diagnostic criteria for fatal familial
   insomnia. Chin Med J (Engl). 2018;131(13):1613-1617. doi:10.4103/0366-6999.235115
3. Chu M, Xie K, et al. Proposal of new diagnostic criteria for fatal familial insomnia. J Neurol.
   2022;269(9):4909-4919. doi:10.1007/s00415-022-11135-6
4. Zerr I, Schmitz M. Genetic prion disease. 2003 [updated 2021 Jan 7]. In: Adam MP, et al., editors.
   GeneReviews® [Internet]. Seattle (WA): University of Washington, Seattle; 1993-. Available from:
   https://www.ncbi.nlm.nih.gov/books/NBK1229/
5. World Health Organization. WHO infection control guidelines for transmissible spongiform
   encephalopathies: report of a WHO consultation, Geneva, Switzerland, 23-26 March 1999. Geneva: World
   Health Organization; 2000. WHO/CDS/CSR/APH/2000.3
6. Public Health Agency of Canada. Classic Creutzfeldt-Jakob disease in Canada: quick reference guide
   2007. Ottawa: Public Health Agency of Canada; 2007.
7. Graus F, Titulaer MJ, Balu R, et al. A clinical approach to diagnosis of autoimmune encephalitis.
   Lancet Neurol. 2016;15(4):391-404. doi:10.1016/S1474-4422(15)00401-9
8. 中华医学会神经病学分会神经感染性疾病与脑脊液细胞学学组. 中国自身免疫性脑炎诊治专家共识（2022年版）.
   中华神经科杂志. 2022;55(9):931-949.
9. Sabater L, Gaig C, Gelpi E, et al. A novel non-rapid-eye movement and rapid-eye-movement parasomnia
   with sleep breathing disorder associated with antibodies to IgLON5: a case series, characterisation
   of the antigen, and post-mortem study. Lancet Neurol. 2014;13(6):575-586.
   doi:10.1016/S1474-4422(14)70051-1

The same strings are `debrief.references` in `case.json`. How each was checked (2026-10-28):
ref. 1 — the DOI printed in the article's PDF footer and the export record (doi.org, Crossref and
rs.yiigle.com are not reachable from this environment); refs. 2, 3, 7, 9 — PubMed/PMC records found by
web search (PMC6032681; PMID 35501502 / PMC9363306; PMID 26906964; PMID 24703753); ref. 4 — the NCBI
Bookshelf record (NBK1229, updated 2021-01-07); ref. 5 — the WHO IRIS record (10665/66707); ref. 6 —
the Government of Canada publication record (HP40-66/2007E); ref. 8 — only the reference lists of citing
articles, so it is cited without a DOI (see To verify). Guidance documents 4–6 have no DOI.

### To verify

* Chu 2022 (ref. 3): the full author list (search results disagree beyond Chu M and Xie K) and the
  wording of its "definite" tier — the case cites it only for the possible → probable step and the two
  added exclusion items.
* GeneReviews (ref. 4): its wording on MRI, EEG and CSF in FFI and on predictive testing of at-risk
  relatives (including minors) — the case teaches only the 50% risk, no treatment of the cause, and
  voluntary testing after counselling.
* WHO 2000 (ref. 5): the exact recommendations for CSF (low-infectivity tissue) and for instruments
  used in lumbar puncture — the case states only the high/low infectivity classes, no isolation, no
  denial of procedures and TSE handling of instruments and specimens.
* Graus 2016 / the Chinese 2022 consensus (refs. 7–8): the wording on paired serum and CSF antibody
  testing.
* The Chinese 2022 consensus (ref. 8): its bibliographic details (issuing group, pages) and its DOI —
  doi:10.3760/cma.j.cn113694-20220219-00118 as given in citing articles' reference lists — against the
  publisher's page; add the DOI to the reference only once confirmed.
* The source DOI (ref. 1) against the publisher's landing page.

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

* **Options rebalanced so the key is not cued by length.** The keyed option was the uniquely longest in all 3
  single-best decisions in both languages; now it is in one (`dec-family`). Each distractor states its reasoning in the
  key's register: definite FFI (the report's conclusion) from the clinical features, the uncle and the positive PRNP;
  prion disease excluded by the normal MRI, MRV and CSF and an EEG without epileptiform discharges; no grade without
  PSG and PET or SPECT; anxiety-related insomnia from the pill, the benzodiazepine and six months of tension;
  isolation because the route of spread is uncertain; no special measures because the disease is inherited; no more
  procedures to protect staff; routine autoclaving under standard precautions; testing every relative, children
  included, to find carriers early; the uncle's old diagnosis as unrelated; the mother as the certain carrier because
  the uncle is her brother; withholding the risk while she is so ill. The keys are tighter wording of the same content;
  in the multiple-answer `dec-workup` the brain-biopsy distractor states its reason. The autoclave feedback now credits
  its correct half (standard precautions, no isolation). Correct flags and scoring are unchanged.
* **Option ids:** all already name their content; none changed.

### 1.1.0 — 2026-10-28 (editorial revision)

* **Diagnosis decision rebuilt on criteria** (audit A2): `dx-criteria` grades the record by the 2018
  consensus the report reproduces — probable FFI; "definite" unverifiable without the variant — with
  the report's own "definite" claim as a distractor. Replaces `diagnosis`.
* **Three new decisions** (E2): `dec-workup` (multiple: family history, autoimmune-encephalitis
  antibodies, PRNP after counselling), `dec-infection` (TSE precautions, A1) and `dec-family`
  (counselling and predictive testing, A5). Replaces `management`. Five options each with distinct
  feedback; scored with `decidedFirstTry`.
* **Examination objective fixed** (C1): it now requires the real findings (`cognition`, `motor`); the
  two "not recorded" placeholders `initial-exam` and `initial-neuro` are removed (unrecorded manoeuvres
  fall to `examNotRecorded`).
* **Record reviews** (C2): MRI/MRV, EEG and CSF are `category: "record"`, `requires: ["records"]`,
  `risk: "none"`, named "Review the … report" — no scanner trip, no bedside sampling. Added the routine
  admission tests (B5), PSG and PET record checks and an orderable autoimmune-encephalitis antibody
  panel (no result in the source).
* **Phases** (C5, B2): first visit (outpatient) → admission (inpatient) → specialist clinic → locked
  followup; `setting` is now `outpatient`; relative times throughout.
* **Source facts restored** (B2, B4–B6): the admission complaint; who reported what (her own account vs
  her family's); the full EEG description; ultrasound, X-ray and ECG; the course (coma episode,
  pneumonia with dysphagia and NG tube, hypoglycaemia, death on day 8).
* **Labelled** (B1, B3): the inconsistent duration; the unclear "感能力差".
* **Spoiler-free texts** (C3): new summary and a different triage note; patient tags no longer repeat
  the chief complaint.
* **Voice** (C4, D1–D3): pseudonym 何女士/Ms He → 钟女士/Ms Zhong ("He" collides with an English word);
  the companion is "家属 / Family member" (relation not recorded) with a lay persona; first-person lay
  answers (噩梦 not 恶梦); the patient no longer comments on causation; the library's fallback voice;
  British English questions; title "31-year-old woman".
* **Interventions** (E3): 8 — genetic counselling, palliative care and advance care planning, TSE
  precautions, isolation (corrective), hypnotic escalation (corrective), stopping the pill (corrective),
  swallow screen, NG tube (the report's step; contraindicated before the followup phase).
* **Rubric** (E4): 12 items (11 deterministic, 24 points; 2 safety items; 1 judged communication item).
* **Teaching** (E1, A3, A4): 5 learning outcomes; 6 key-reasoning points; 6 teaching points naming their
  guidance; `unknowns` extended.
* **Matcher** (F1): keywords rewritten (≥ 4 per item and locale, lay and clinical, both languages);
  40 genuine test utterances.
* **References** (F2): Vancouver strings; the consensus, its 2022 revision, GeneReviews, WHO 2000,
  PHAC 2007, the autoimmune-encephalitis criteria and the anti-IgLON5 paper added.
* **Governance** (F5): `provenance.review` (editorial), version 1.1.0, difficulty 4, ~35 min; PDF
  title notes the other article's references on page 2; asset credit names the authors (as printed, in
  Chinese characters — the report gives no English byline).
* Removed ids (none are referenced by tests or e2e): history `progression` (split into
  `admission-complaint`, `speech-movements`, `memory`, `anxiety`, `vision`), exam `initial-exam` and
  `initial-neuro`, decisions `diagnosis` and `management`, objectives `objective-1`…`objective-4`,
  rubric `rubric-1`…`rubric-4`. Kept: phase and investigation `followup` (the collection test uses them).

### 1.0.0

* Initial CMCR adaptation (PR #3).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1551887/case.json --strict   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1551887        # solution 56 steps · objectives 6/6 · decisions 4/4 · utterances 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1551887
npm run -s cc -- exec --case cmcr-1551887 --autopilot --approval bypass --provider offline --output-format json             # 24/24
npm run -s cc -- exec --case cmcr-1551887 --autopilot --approval bypass --provider offline --output-format json --embodied  # 24/24
npm run cc -- play cmcr-1551887 --provider offline
```

## 中文摘要

**病例概要。** 31岁女性因“睡眠障碍，注意力难以集中”首诊：自述服避孕药后睡眠变差（眠浅、噩梦多、易惊跳惊慌），
白天嗜睡，无明显情绪低落，体重下降6 kg，曾自服阿普唑仑。首诊后约3个月家属发现言语错乱、四肢不自主活动；约4个月
焦虑、记忆力进行性下降、视物模糊，新冠检测阳性后入院（主诉“紧张、多虑半年，进行性记忆力下降1月余”）。查体：精神紧张，
记忆力和计算力欠佳，四肢肌张力正常，双上肢轻度震颤。颅脑MRI、MRV、脑脊液常规、腹部超声、胸片、心电图未见异常，
脑电图轻度异常（较多散在θ波）。约5个月专科门诊追问得知舅舅有类似病史，PRNP检测报告“PRNP（+）”，作者诊断FFI。
其后昏迷发作、肺炎伴吞咽下降需留置胃管、低血糖与营养不良，首诊后约9–10个月死于呼吸衰竭。按原文表2转载的2018年
中国专家共识，记录资料符合“很可能的FFI”；报告未给出D178N及129位密码子，“确诊”无法核实。

**学习目标。**
1. 从首诊到死亡重建这例快速进展疾病的时间线（以首诊为第0天的相对时间），并指出作者所述病程时长与文中日期的矛盾。
2. 用2018年中国专家共识（及2022年修订）把记录资料分级为可能、很可能或确诊的FFI，并说出缺失的证据：自主神经表现、PSG、PET/SPECT和具体PRNP变异（D178N-129M）。
3. 解释为什么MRI、脑电图和脑脊液常规正常不能排除遗传性朊蛋白病，并在基因检测的同时安排可治疗类似疾病的检查（血清和脑脊液自身免疫性脑炎抗体、副肿瘤筛查）。
4. 按WHO 2000 TSE感染控制指南为有创操作、脑脊液和组织标本及器械落实防护，并说明为什么不需要隔离患者。
5. 规划遗传咨询（母系亲属、自愿的预测性检测、不推断母亲的基因状况），并在吞咽和意识恶化之前开始舒缓照护和预立医疗照护计划。

**关键决策。** ① 入院检查基本正常后的下一步（多选）：详细家族史、血清和脑脊液自身免疫性脑炎抗体及副肿瘤筛查、
遗传咨询后PRNP检测（不是按焦虑加安眠药，也不是脑活检）；② 诊断分级：临床上“很可能的FFI”，“确诊”因缺少变异信息
无法核实；③ 感染控制：标准预防、无需隔离，有创操作、标本和器械按TSE要求处理；④ 家属：遗传咨询、每个子女50%风险、
成年亲属自愿的预测性检测，不推断母亲的基因状况。

**复盘要点（PEARLS）。** 先谈感受，再按时间线复述；分析环节聚焦：首诊时为何不只是失眠；正常的MRI、脑电图和脑脊液
能排除什么；可治疗的类似疾病查了没有；“PRNP（+）”为何不等于“确诊”；腰椎穿刺后的感染控制（不需要隔离）；如何与家属
谈遗传风险；何时开始谈喂养方式和抢救意愿。原报告未记录感染控制、遗传咨询和舒缓照护，这些是按现行指南加入的教学
内容；病程时长的矛盾和“感能力差”保留原样并标注。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
