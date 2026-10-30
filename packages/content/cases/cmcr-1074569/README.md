# cmcr-1074569 — Multiple liver lesions found at a health check · 55-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners should open the case from the case
> library, where the title, summary, chief complaint and tags give nothing away.

**Published-case adaptation.** The case is adapted from a case report in a Chinese Medical Association journal
(CMCR collection; see [docs/CMCR_CASES.md](../../../../docs/CMCR_CASES.md)). The patient, 程女士（化名）/ Ms Cheng
(pseudonym), is a teaching persona; the clinical course is the report's, in relative time. Not medical advice
(`disclaimer`).

## Case card

| | |
|---|---|
| id / version | `cmcr-1074569` / `1.1.1` |
| setting / facility | `outpatient` / `general-hospital` (consulting room; she sits throughout) |
| specialty | oncology, colorectal surgery, hepatobiliary surgery |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: four one-way phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have an oncologist or colorectal/HPB surgeon review it before teaching use |
| phases | `initial` (first visit and work-up, from day 0) → `conversion` (about months 1–3) → `surveillance` (about months 3–20) → `followup` (from about month 20 to the time of the report); none is learner-switchable, each opens when the previous chapter's objective is complete |
| content | 18 history items (9 `unknown`, 1 `volunteer`, 4 required, 3 later-phase status items) · 3 exam findings (all required) · 18 investigations (6 chart reviews, 4 results the source does not have, 1 low-value) · 10 interventions (4 wrong choices) · 6 objectives · 5 decisions · 12 rubric items (11 deterministic, 1 examiner-judged) · 5 NPCs · 6 learning outcomes · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. Identify synchronous colorectal liver metastases from the colonoscopy biopsy, CEA, AFP, HBsAg and imaging, and
   exclude primary liver cancer.
2. Specify the biomarkers needed before first-line therapy for metastatic colorectal cancer — extended RAS
   (KRAS/NRAS exons 2–4), BRAF V600E and MMR/MSI — and how each changes treatment (ESMO 2026, ASCO 2023).
3. Sequence treatment within an MDT for an obstructing primary with potentially resectable liver metastases: the
   primary first, then conversion therapy with repeated review of resectability.
4. Time liver resection promptly after a conversion response, and explain the cost of prolonged pre-operative
   chemotherapy (chemotherapy-related liver injury, “disappearing” metastases).
5. Stage from the pathology: recognise tumour deposits as N1c, and that fewer than 12 examined nodes may
   understage the nodes (AJCC/UICC TNM 8th edition).
6. Respond to a rising CEA at follow-up with imaging and MDT review, and choose repeat resection for an isolated,
   resectable liver recurrence.

These are the case's `learningOutcomes` (case card and debrief); the six HUD `objectives` below are the in-game task
list.

## Clinical summary

**First visit (day 0).** A 55-year-old woman, married with one son, attends one week after a health check found
multiple liver lesions. She has always been well: no hepatitis, hypertension or heart disease; familial hereditary
disease is denied. The report records **no symptoms at all** — bowel symptoms, weight, medicines, allergies,
smoking, alcohol, occupation and screening history are unknown. Examination: performance status 0, no enlarged
superficial nodes, no obvious abdominal signs.

**Work-up.** Full blood count and liver and renal function are reported as unremarkable (no values); HBsAg negative.
CEA **781.4 ng/mL**, AFP 1.5 ng/mL, CA19-9 287 ng/mL (unit as printed; no reference ranges). Abdominal CT, MRI and
PET/CT, reported together: focal colonic wall thickening, multiple small pericolic nodes, multiple hypodense liver
lesions — the MDT describes one as large and confluent (fig. 1, MRI, withheld). Colonoscopy: a mass 35 cm from the
anal verge encircling the lumen; the scope cannot pass; biopsy **adenocarcinoma**. K-ras and B-raf wild type (scope
of testing not stated). Admission diagnosis: sigmoid adenocarcinoma with liver metastases, **cT3NxM1**.

**Diagnosis.** Sigmoid adenocarcinoma with synchronous multiple liver metastases (stage IV).

**Course in the report.**

| when (relative) | what the report records |
|---|---|
| month 0 | MDT: primary obstructing; multiple liver metastases, one large and confluent; **potentially resectable** → primary first, then chemotherapy plus targeted therapy |
| same month | robot-assisted Dixon resection; at operation 3 right-lobe nodules (≈10, 3, 3 cm) and 2 left-lobe nodules (≈3 cm each); a 6 cm circumferential upper-sigmoid mass involving the full thickness and the left abdominal wall. Pathology: ulcerating adenocarcinoma, grade II–III, vascular tumour emboli, margins clear, nodes **0/6 plus 4 tumour deposits → pT4N1cM1** |
| months 1–3 | 4 cycles FOLFOX + cetuximab every 2 weeks (doses as printed); CEA fell markedly, MRI shrinkage; MDT: **partial response** → resect the liver |
| month 3 | partial resection of both lobes with intra-operative ultrasound: 5 tumours, 1.5–5.5 cm (segments IV, III, VII, VIII); adenocarcinoma consistent with colorectal metastases (no margin reported) |
| months 3–20 | 8 more cycles of the same regimen, then capecitabine maintenance; checks normal |
| month 20 | CEA rose markedly; MRI and CT: **one new caudate-lobe metastasis**; MDT → resect. Caudate lobectomy + hilar lymphadenectomy: 1.5 × 1.3 × 1 cm grade II adenocarcinoma; hilar node **1/1 positive** |
| months 21–27 | 12 cycles FOLFIRI + cetuximab |
| month 27 onwards | fluorouracil + calcium folinate + cetuximab every 2 weeks; **no recurrence at regular reviews** up to the time of the report |

## Scenario timeline and physiology

- **Static clock, four one-way phases.** No physiology (the collection test requires none). Each later phase opens
  automatically (`enterWhen`) when the previous chapter's objective is complete, and none is learner-switchable, so
  the record of what the team did next is never readable before the learner has decided:
  - `conversion` ← objectives `obj-assess`, `obj-diagnosis` and `obj-plan` (diagnosis, sequence and biomarker
    decisions answered; MDT referral, primary resection referral and conversion therapy given);
  - `surveillance` ← `obj-conversion` (operation/pathology record, CEA and MRI read in `conversion`; timing decision;
    liver resection referral);
  - `followup` ← `obj-recurrence` (liver operation record, CEA and imaging read in `surveillance`; recurrence
    decision; a second liver referral).
- **Results are keyed by phase.** CEA (`tumour-markers`) and the liver MRI have a result in each phase where the
  report gives one; a learner re-orders them in the new phase ("repeat the CEA"). Orders keep their phase, so
  first-visit results stay readable later.
- **History.** First-visit items are `phases: ["initial"]`; each later phase has one status item in her own words,
  linked as phase twins (`status-surveillance` supersedes `status-conversion`, `status-followup` supersedes
  `status-surveillance`), all drawn from the report's “went smoothly / checks normal / no recurrence”.
- **Interventions have no vital effects.** They are prescriptions and referrals; the next phase shows what the team
  actually did.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | Establish how she came to clinic and examine her | presentation, past history, family history, bowel symptoms asked; PS, abdomen, nodes examined |
| 2 | Find the primary and stage the disease | colonoscopy, tumour markers and CT/MRI/PET-CT read (`initial`); `dx-primary` |
| 3 | Agree the initial treatment with the MDT | `mdt-sequence`, `biomarkers`; MDT referral, primary resection referral, conversion therapy |
| 4 | Reassess the conversion response and time the surgery | operation/pathology record, CEA and MRI read (`conversion`); `conversion-timing`; liver resection referral |
| 5 | Act on the new finding at follow-up | liver operation record, CEA and MRI or CT read (`surveillance`); `recurrence`; second liver referral |
| 6 | Check the later treatment and outcome in the report | follow-up record read (`followup`) |

Hints coach with questions ("Which results are still missing before a targeted drug?", "What is conversion therapy
aiming for — disappearance on imaging, or resectability?") and never contain a correct option.

### Decisions

- `dx-primary` (single; needs colonoscopy, markers, imaging): sigmoid adenocarcinoma with synchronous liver
  metastases ✓. Distractors: primary liver cancer with a separate colonic tumour (AFP normal, HBsAg negative);
  benign liver lesions with localised colon cancer (does not explain CEA 781.4); unknown primary needing liver biopsy
  (the colonic biopsy already proves adenocarcinoma).
- `mdt-sequence` (single; needs the diagnosis, the MRI and the PS): MDT — deal with the primary at risk of
  obstruction first, then high-response conversion therapy with repeated resectability review ✓ (the report's MDT).
  Distractors: one-stage resection of everything now; palliative single agent without an MDT; systemic therapy first
  leaving an obstructing primary (right for an asymptomatic primary, wrong here).
- `biomarkers` (select all; needs the diagnosis and the K-ras/B-raf result): extended RAS (KRAS/NRAS exons 2–4) ✓,
  BRAF V600E ✓, MMR/MSI ✓; EGFR immunohistochemistry ✗ and PD-L1 ✗ (not predictive in colorectal cancer). This is
  where the report's practice at the time (K-ras/B-raf only) is set against current guidance.
- `conversion-timing` (single; needs the repeat CEA and MRI): resect promptly once the MDT confirms resectability ✓
  (the report). Distractors: continue until the metastases disappear; stop and watch; switch to second line.
- `recurrence` (single; needs the repeat CEA and MRI or CT at month 20): MDT, exclude disease elsewhere, re-resect
  the isolated lesion ✓ (the report). Distractors: palliative second line only; carry on with maintenance and
  recheck in 3 months; repeat the CEA and ignore the imaging.

Every option has its own feedback, citing the guidance or the report's commentary where it matters.

### Rubric (deterministic items, total weight 21)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-hx-context` | history | 1 | presentation, past history, family history asked |
| `rb-hx-bowel` | history | 1 | bowel symptoms asked (the answer is "not recorded") |
| `rb-ex` | examination | 1 | PS, abdomen, superficial nodes examined |
| `rb-inv-primary` | investigations | 2 | colonoscopy, tumour markers, HBsAg and CT/MRI/PET-CT read at the first visit |
| `rb-dx` | diagnosis | 2 | `dx-primary` right first time |
| `rb-mgmt-sequence` | management | 2 | `mdt-sequence` right first time; MDT referral |
| `rb-mgmt-biomarkers` | management | 3 | `biomarkers` right first time; further molecular testing requested |
| `rb-mgmt-timing` | management | 3 | `conversion-timing` right first time; liver resection referral |
| `rb-mgmt-recurrence` | management | 2 | `recurrence` right first time; second liver referral |
| `rb-inv-records` | investigations | 1 | primary operation/pathology and first MDT record (`conversion`) and liver operation record (`surveillance`) read |
| `rb-safety` | safety | **3** | `mdt-sequence` attempted, and none of: one-stage resection, single-agent palliation, chemotherapy until the lesions vanish, abandoning surgery at recurrence |

One examiner-judged communication item (`rb-comm`): explaining the diagnosis and the staged plan in plain language,
honest about uncertainty, responding to her fear that it is cancer and cannot be treated.

### How wrong choices score

- `simultaneous-resection`, `palliative-capecitabine`, `continue-until-cr` and `abandon-surgery-chemo` are always
  `contraindicated` (a safety event with a `harm` text) and fail `rb-safety`.
- `refer-hepatectomy` is `contraindicated` in the first-visit phase (liver surgery before conversion) and
  `indicated` after `conversion-timing` or `recurrence`.
- `conversion-chemo` (the report's FOLFOX + cetuximab) is `contraindicated` until further molecular testing has
  been requested and the primary referred for resection — the teaching layer, not a judgement on the practice of the time; the
  reference path requests the testing (its result is "not in the source") first.
- `post-hepatectomy-chemo` and `post-recurrence-chemo` (the report's post-operative regimens) are neutral: the case
  does not score whether cetuximab should continue after surgery.
- `liver-biopsy` is `low-value` (and has no result: not done in the report).
- `rb-safety` is earned only after the sequencing decision has been attempted, so doing nothing earns nothing; the
  annotation file adds `scoredWhen` for the coming framework (below).

## Reference path (`solution`)

90 steps, static clock:

1. **First visit:** 15 history questions, 3 examinations; health-check report (no record), FBC, liver/renal tests,
   HBsAg, tumour markers, abdominal CT, liver MRI, PET/CT, colonoscopy with biopsy, K-ras/B-raf read;
   `dx-primary`, `mdt-sequence`, `biomarkers`; further molecular testing (no record in the source); MDT referral,
   primary resection referral, FOLFOX + cetuximab → `conversion`.
2. **Conversion:** status question; operation/pathology, MDT and chemotherapy records; repeat CEA and MRI;
   `conversion-timing`; liver resection referral → `surveillance`.
3. **Surveillance:** status question; liver operation, MDT and chemotherapy records; post-hepatectomy therapy; repeat
   CEA, MRI and CT; `recurrence`; MDT referral and a second liver referral → `followup`.
4. **Follow-up:** status question; second-operation, MDT, chemotherapy, CEA and follow-up records; post-recurrence
   therapy; finish.

`cases verify` passes (6/6 objectives, 5/5 decisions); the deterministic rubric scores 21/21 with every decision
right first time and no contraindicated intervention.

## Clinical numbers check

- **Tumour markers:** CEA 781.4 ng/mL, AFP 1.5 ng/mL, CA19-9 287 ng/mL — CA19-9 is printed in ng/ml (usually
  U/mL); no reference ranges, so no value is flagged.
- **Staging:** admission cT3NxM1 → pathological pT4N1cM1; 0/6 nodes with 4 tumour deposits = N1c (TNM 8th). Six
  nodes is below the usual minimum of 12.
- **Liver disease:** 5 nodules at the first operation (≈10, 3, 3 cm right; ≈3, 3 cm left) and 5 tumours of
  1.5–5.5 cm at hepatectomy after conversion — consistent with shrinkage after the partial response.
- **Regimens as printed:** cetuximab 500 mg/m², calcium folinate 400 mg/m², oxaliplatin 85 mg/m² or irinotecan
  180 mg/m², every 2 weeks, match the usual biweekly schedules; **fluorouracil 3200 mg/m²** is printed as one figure
  and does not match the usual bolus + 46-hour infusion split (400 + 2400 mg/m²) — kept as printed and labelled "not a
  dosing reference".
- **Timeline:** 4 cycles every 2 weeks ≈ 8 weeks (months 1–3); recurrence at month 20 (17 months after the
  hepatectomy); 12 FOLFIRI cycles ≈ 24 weeks (months 21–27). The source's CEA curve (fig. 3, withheld) spans about 28 months.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to tell a frightened woman with no symptoms that the liver lesions came from her
   bowel?"
2. **Description.** "In two sentences: what was the diagnosis, and what did the team do first — and why?"
3. **Analysis.**
   - "Which results made primary liver cancer unlikely?"
   - "Why the bowel first here, when an asymptomatic primary would usually get chemotherapy first?"
   - "The report started cetuximab on 'K-ras wild type'. What would you need to know today before that drug?"
   - "After a partial response at four cycles, why not keep going until the lesions disappear?"
   - "Nodes 0/6 — why is she N1c, and what does a six-node harvest mean?"
   - "The CEA rose at month 20. What would you have done if the scans had been normal?"
4. **Summary.** "What will you check at every new diagnosis of metastatic colorectal cancer before choosing
   first-line treatment?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Treating the liver as the primary | `dx-primary` distractor (AFP, HBsAg feedback) | `rb-dx` |
| Liver biopsy before anything else | `cup-biopsy-first` feedback; `liver-biopsy` is low-value with no result | `rb-dx` |
| Operating on everything at once | `simultaneous-resection` contraindicated; surgeons decline | `rb-safety`, `rb-mgmt-sequence` |
| Chemotherapy first with an obstructing primary | `chemo-first-leave-primary` feedback; `conversion-chemo` contraindicated before the primary is referred | `rb-mgmt-sequence` |
| Accepting "K-ras wild type" as enough for cetuximab | `biomarkers` decision; `conversion-chemo` contraindicated until further testing is requested | `rb-mgmt-biomarkers` (weight 3) |
| Chemotherapy until the lesions disappear | `continue-until-gone` feedback; `continue-until-cr` contraindicated | `rb-mgmt-timing`, `rb-safety` |
| Reading 0/6 as N0 | operation/pathology record; debrief teaching point | debrief |
| Ignoring or over-reading the CEA | `recurrence` decision (`repeat-cea-first`, `continue-maintenance`) | `rb-mgmt-recurrence` |
| Giving up surgery at recurrence | `abandon-surgery-chemo` contraindicated | `rb-safety` |

### Teaching points for the debrief

The six `debrief.teachingPoints` (biomarkers before the regimen; choosing the regimen; how the primary is handled;
resectability and conversion timing; staging from pathology; CEA with imaging and repeat resection) each name the
guidance they rest on and say where the report's practice at the time differs from today.

## Embodied mode

- **Where she goes.** She sits in consulting room 1 for the whole encounter. The studies done on the patient at a
  fixed device take her there and back (`transport_patient`; static clock, so no time is charged): CT, MRI, PET/CT
  and the endoscopy suite at the first visit, MRI in `conversion`, MRI and CT in `surveillance` — 7 round trips in
  the offline embodied demonstration in `general-hospital`. No intervention has a `destination`: the operations are
  referrals (`consult`) and the later phases are clinic reviews, so nothing moves her to theatre (which has no
  records terminal).
- **Chart reviews.** The health-check report, operation and pathology notes, MDT records, chemotherapy records and
  the follow-up record are `category: "record"`, `requires: ["records"]`, risk none — read at a records terminal.
  The annotation file marks them `performedAt: "records"` for the framework change now in progress.
- **Tests she has.** Bloods are `lab-*` (sampled at her side — the case has no IV procedure); imaging and endoscopy
  keep their device capabilities (`ct`, `mri`, `pet-ct`, `endoscopy`; risk low); molecular testing is ordered at the
  pathology workstation (`molecular`); the low-value liver biopsy needs `histopathology`.
- **Prescriptions and referrals** have `requires: []`: they are written in the consulting room, and the chemotherapy
  courses are given later in the day unit, so no cannula is placed in clinic. Chemotherapy items are
  `scope: "medical"`.
- The offline demonstration scores 21/21 (100 %) in clinical and in-world mode alike, all objectives complete.

## Source and adaptation (fidelity limits)

**From the report** (林奇, 叶青海, 余一祎, et al. 中华结直肠疾病电子杂志 2014;3(1):45-46, checked line by line against
the full text and both PDF pages): age, sex, marital history, past and family history as recorded, examination,
every result, the MDT judgements, both operations and their pathology, the regimens and doses as printed, the CEA
course and the outcome. Calendar dates are converted to relative time (day 0 = the first visit; later events in months).

**Adapted for teaching:** the dialogue (her answers are lay renderings of the record; the status items paraphrase
“went smoothly”, “checks normal” and “no recurrence”); her persona, anxiety and her one concern ("is it cancer, can
it be treated?" — the `ice` item, labelled as a teaching adaptation); the decisions, options, feedback, rubric,
interventions and objectives; the contrast with current guidance. Unrecorded facts — bowel symptoms, weight,
medicines, allergies, smoking, alcohol, occupation, surgery and screening history, the family cancer history — stay
unknown (`disclosure: "unknown"`, the library's "That isn't recorded in my case notes" line).

**Contradictions and gaps kept, labelled, not resolved** (`unknowns`, result notes, debrief):

- **Obstruction:** the MDT and discussion call the primary obstructing, yet no obstructive symptom, sign or image is
  recorded — only that the scope could not pass.
- **pT4:** rests on the operative finding (left abdominal wall involved); the pathology text says only “invading the
  full thickness and the surrounding fat”.
- **R0:** the discussion claims an R0 hepatectomy; no margin is recorded.
- **CA19-9 unit:** printed as ng/ml.
- **Fluorouracil dose:** printed as a single 3200 mg/m² figure.
- **Age:** the withheld MRI composite's overlay implies a different age; the case keeps the text's 55 years and does
  not use or transcribe the figure's fields.

**Figures.** `fig01` (the liver MRI composite, source figs 1–2) and the source PDF are **withdrawn** (identifying
overlays; `scripts/cmcr-withdrawn-assets.json`); their findings are kept as text in the MRI results. `fig02` (source
fig. 3, the CEA curve) is **withdrawn** too: its x-axis carries the calendar dates of the patient's tests, and the
case content uses relative time only. The follow-up record says so; the course itself is given in the records.

## Matcher notes

- `excludeKeywords` separate look-alike questions: `pmh` vs family questions (家里/家族/family); `bowel` vs family
  history and colonoscopy screening; `medications` vs allergy and "maintenance" questions; `marital` vs cancer/family
  history; `palliative-capecitabine` vs capecitabine maintenance.
- The English occupation question is "What work do you do?": "What do you do for a living?" reduces to the token
  `liv`, so "Who lives with you?" selected it.
- `status-*` items are phase twins; "现在感觉怎么样 / How are you feeling?" asked at the first visit falls through to
  the "not recorded" line, because no symptom is recorded then.
- Order entry: `orderMatching.rules` keep "PET/CT" off the CT items and route NRAS/MMR/MSI/"extended" queries to
  `extended-molecular`; `exact` sends a bare "CT" to the abdominal CT and "MRI" to the liver MRI; a notice on the MRI
  says its images are withheld.
- The corpus (40 utterances, 24 zh-CN and 16 en, one deliberate non-match) passes `cases verify` with no extra
  selections; it includes colloquial phrasings (大便里有没有见过血, 肚子胀不胀还排气吗, back passage, tummy ache).

## References

1. 林奇, 叶青海, 余一祎, 侯英勇, 王健, 周波, 等. 多学科协作治疗T4N1cM1期结肠癌一例. 中华结直肠疾病电子杂志. 2014;3(1):45-46.
   doi:10.3877/cma.j.issn.2095-3224.2014.01.12. Available from: https://rs.yiigle.com/cmaid/1074569
2. Cremolini C, Chalabi M, Elez E, et al.; ESMO Guidelines Committee. Metastatic colorectal cancer: ESMO Clinical
   Practice Guideline for diagnosis, treatment and follow-up. Ann Oncol. 2026;37(6):759-776.
3. Cervantes A, Adam R, Roselló S, et al.; ESMO Guidelines Committee. Metastatic colorectal cancer: ESMO Clinical
   Practice Guideline for diagnosis, treatment and follow-up. Ann Oncol. 2023;34(1):10-32.
   doi:10.1016/j.annonc.2022.10.003
4. Morris VK, Kennedy EB, Baxter NN, et al. Treatment of metastatic colorectal cancer: ASCO guideline. J Clin Oncol.
   2023;41(3):678-700. doi:10.1200/JCO.22.01690

How each was checked (2026-10-28): ref. 1 — authors, title, journal, volume, issue and pages from the export record
and the PDF; the DOI is the one printed on PDF p. 45 and in the export record (doi.org and Crossref were not reachable
from the editing session). Ref. 2 — authors, journal, year, volume, issue and pages from the publication record
(web search: Tampere University research portal, Guideline Central); no DOI is given because none could be
confirmed. Refs 3 and 4 — citation and DOI from the publisher/indexer records found by the audit (esmo.org and the
White Rose repository; PubMed record 36252154 via a library catalogue and Guideline Central).

### To verify

- **ESMO 2026 (ref. 2):** its DOI, and its exact wording on the points the case attributes to "ESMO mCRC
  2023/2026" — biomarkers at diagnosis (RAS exons 2–4, BRAF V600E, MMR/MSI), the handling of a symptomatic vs
  asymptomatic primary, MDT review of resectability, resection as soon as conversion succeeds, and follow-up with CEA
  and imaging. They were checked against the 2023 guideline (in part through an unofficial copy) and the 2026
  summaries, not the 2026 full text. Whether ESMO 2026 lists HER2 among the biomarkers needed at diagnosis (left out
  of the `biomarkers` decision for that reason).
- **≥ 12 nodes:** the "at least 12 lymph nodes" benchmark (NCCN; ESMO 2020 localised colon cancer) — wording not
  re-checked; not cited in the case's references.
- **AJCC/UICC TNM 8th edition:** cited by version in the teaching point and `provenance.review`, but no reference
  string is given (the manual's bibliographic details were not web-verified).
- **Regimen comparison:** the usual 400 + 2400 mg/m² fluorouracil split in the Clinical numbers check comes from
  standard regimen references not re-checked in this pass.
- **Chinese guidance** (CSCO colorectal cancer guideline; 中国结直肠癌肝转移诊断和综合治疗指南) was not checked in this
  pass.
- **New EPOC / post-operative anti-EGFR:** not discussed in the case; a clinician reviewer may want a teaching point on
  continuing cetuximab after resection.

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

- **Options rebalanced so the key is not cued by length.** In 3 of the 4 single-best decisions (`mdt-sequence`,
  `conversion-timing`, `recurrence`) the keyed option was the uniquely longest in both languages (up to about twice
  the mean option length); now it is in none. The `mdt-sequence` and `conversion-timing` keys say the same in fewer
  words, and the `recurrence` key now names the restaging and the caudate lesion; the distractors carry the key's
  detail and say why they tempt — one-stage resection because she is fully active (PS 0), single-agent palliation
  because the liver disease looks unresectable, chemotherapy first because the liver disease decides her outlook,
  chemotherapy until a complete response because the regimen is working, stopping to spare toxicity, a
  "non-cross-resistant" switch, giving up surgery because the recurrence came early, waiting to see whether the new
  lesion grows, and a normal repeat CEA as reassurance. Medical meaning, correct flags, scoring and the reference path
  are unchanged; the feedback of `one-stage-now` and `chemo-only` now also answers the reason their text gives.
  `dx-primary` (its key was already the shortest option) and the select-all `biomarkers` had no cue and are untouched.
- **Option ids neutral:** every id already names its content; none renamed, so no solution, test, benchmark scenario
  or e2e spec changes.

### 1.1.0 — 2026-10-28 (editorial revision)

- Privacy: source fig. 3 (the CEA curve) withdrawn — its axis shows the calendar dates of the patient's tests
  (`scripts/cmcr-withdrawn-assets.json`); the follow-up record says why.
- **Decisions rebuilt:** 2 binary questions with identical feedback on both options → 5 decisions (one select-all)
  with 4–5 options and distinct feedback, opened only when their evidence exists and before the record that answers
  them: diagnosis, sequencing with an obstructing primary, biomarkers before first-line therapy, conversion timing,
  recurrence.
- **Phases:** 3 → 4 one-way phases (`initial`, `conversion`, `surveillance`, `followup`); the MDT judgements
  ("potentially resectable", "resect the primary first") moved out of the MRI result into MDT records that open after
  the decisions they would answer.
- **Interventions:** 0 → 10 (MDT referral, primary and liver resection referrals, the report's regimens, and four
  tempting wrong choices with `harm` texts).
- **Rubric:** 4 items scoring `decided` (everyone who finished scored 100 %) → 12 items with `decidedFirstTry`, a
  safety item (weight 3) and an examiner-judged communication item.
- **Source facts restored:** marital history; the admission stage cT3NxM1; operative findings and full pathology of
  both resections; the hepatectomy findings; doses as printed; the 8 post-operative cycles and capecitabine
  maintenance; the 12 FOLFIRI + cetuximab cycles; the hilar node 1/1; the outcome as reported.
- **Contradictions labelled:** obstruction without recorded evidence, pT4 basis, R0 claim, CA19-9 unit,
  fluorouracil dose.
- **Bundles split:** routine bloods, HBsAg and tumour markers; CT, MRI and PET/CT (each with the joint-report note);
  chart reviews now `records`, studies keep their devices.
- **Patient voice:** first-person lay answers; persona, opening line and the library's "not recorded" line replace
  the chart/meta voice; British English questions; title "55-year-old woman".
- **Matcher:** keywords per item 1–2 → 4–20; 16 verbatim-question utterances → 40 genuine paraphrases.
- **Teaching:** 6 learning outcomes; 6 teaching points naming ESMO 2026/2023, ASCO 2023 and TNM 8th (the old
  "teaching point" about the withheld figure moved to this README); Vancouver references; `provenance.review`;
  summary and triage note rewritten (distinct, spoiler-free); version 1.0.0 → 1.1.0; difficulty 4, 35 min.
- **Not applied:** removing "（化名）/(pseudonym)" from the displayed name (audit D4) — every case in the library shows
  it, so a change belongs to the whole collection; a scored "not recorded" rectal examination (E4) — the standard
  forbids authored findings that say "not recorded" (DRE falls to `examNotRecorded`); a separate AFP-only "liver
  cancer screen" order (E5) — AFP is already in the tumour-marker panel the report printed, so a second item would
  only duplicate that result (the low-value liver biopsy covers the "wrong next test" choice).

### 1.0.0

- First release in PR #3 (CMCR collection).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1074569/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1074569                                        # 90 steps · 6/6 · 5/5 · 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1074569
npm run -s cc -- exec --case cmcr-1074569 --autopilot --approval bypass --provider offline --output-format json [--embodied]   # 21/21 both
```

## 中文摘要

**病例概要。** 55岁女性，已婚，育1子，体检发现肝内多发占位1周来诊；既往体健，无症状记录。查体PS 0分，浅表淋巴结无肿大，腹部无明显阳性体征。CEA 781.4 ng/mL，AFP 1.5 ng/mL，CA19-9 287 ng/mL（单位按原文），HBsAg阴性；腹部CT、MRI和PET/CT示结肠局部肠壁增厚、肠周多发小淋巴结、肝内多发低密度灶（其中1枚巨大融合）；结肠镜距肛缘35 cm环周占位、内镜不能通过，活检腺癌；K-ras、B-raf野生型。诊断乙状结肠腺癌伴同时性多发肝转移（cT3NxM1）。MDT认为原发灶有梗阻、肝转移潜在可切除：先行机器人辅助Dixon术（pT4N1cM1，淋巴结0/6、癌结节4枚），4个周期FOLFOX联合西妥昔单抗后部分缓解，行肝左右叶部分切除；约第20个月CEA升高、尾状叶孤立复发，再次切除（肝门淋巴结1/1阳性），继以FOLFIRI联合西妥昔单抗及维持治疗，至报告截稿未见复发。

**学习目标。**

1. 整合结肠镜活检、CEA、AFP、HBsAg和影像，判断肝内多发病灶为结肠癌同时性肝转移，并排除原发性肝癌。
2. 列出转移性结直肠癌一线治疗前必须完成的生物标志物（RAS扩展检测、BRAF V600E、MMR/MSI），并说明各自如何改变治疗。
3. 在MDT框架内为梗阻性原发灶合并潜在可切除肝转移安排治疗顺序。
4. 在转化治疗获得缓解后及时安排肝切除，并说明延长术前化疗的代价。
5. 依据术后病理分期：癌结节对应N1c；检出淋巴结少于12枚时分期可能不足。
6. 对随访中的CEA升高，以影像和MDT评估作出处理，孤立可切除的复发首选再次切除。

**关键决策。**

- 诊断：乙状结肠腺癌伴同时性肝转移（AFP不高、HBsAg阴性，不支持原发性肝癌；结肠已有腺癌病理，无需先做肝穿刺）。
- 治疗顺序：提交MDT，先处理有梗阻风险的原发灶，再以转化为目标的高效全身治疗，并反复复评可切除性。
- 生物标志物（多选）：RAS扩展检测、BRAF V600E、MMR/MSI；EGFR免疫组化和PD-L1不用于选择方案。
- 转化时机：部分缓解后经MDT确认即行肝切除，不追求影像上完全消失。
- 复发：孤立的尾状叶复发经MDT评估后再次切除。

**复盘要点。**

- 原报告的分子检测只有K-ras、B-raf；按今天的标准，使用西妥昔单抗前还需RAS扩展检测和MMR/MSI。
- 左半结肠、RAS/BRAF野生型、pMMR者一线首选双药化疗联合抗EGFR单抗——原报告的方案家族今天仍合理。
- “梗阻”只见于MDT记录，病例中只有“内镜不能通过”这一证据；pT4和R0的依据也不完整，均作标注、不作更正。
- 淋巴结0/6不等于N0；CEA要与影像和病理一起解读。
- 本病例经人工智能辅助编辑审核，尚未经执业医师审核；用于教学前请由该专科的临床医生审核。
