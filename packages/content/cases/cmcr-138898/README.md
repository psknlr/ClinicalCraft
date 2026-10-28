# cmcr-138898 — Fatigue, poor appetite and bruising · 57-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners should open the case from the case
> library, where the title, summary, chief complaint and tags give nothing away.

**Published-case adaptation.** The case is adapted from a case report in a Chinese Medical Association journal
(CMCR collection; see [docs/CMCR_CASES.md](../../../../docs/CMCR_CASES.md)). The patient, 聂先生（化名）/ Mr Nie
(pseudonym), and his relative are teaching personas; the clinical course is the report's, in relative time. Not
medical advice (`disclaimer`).

## Case card

| | |
|---|---|
| id / version | `cmcr-138898` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (ward bed; he lies in bed throughout) |
| specialty | haematology, oncology |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: four one-way phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have a haematologist or oncologist review it before teaching use |
| phases | `initial` (admission day, day 0) → `workup` (hospital days 1–5) → `deterioration` (hospital day 5, the day of transfer to oncology) → `followup` (the outcome in the report); none is learner-switchable, each opens when the previous chapter's objective is complete |
| content | 20 history items (4 `unknown`, 1 `volunteer`, 7 required, 2 later-phase status items) · 11 exam findings (5 required; 2 on day 5) · 19 investigations (7 chart reviews, 9 results the source does not have on that day or at all, 1 low-value) · 12 interventions (4 wrong choices) · 5 objectives · 4 decisions · 12 rubric items (11 deterministic, 1 examiner-judged) · 5 NPCs · a relative as companion · 6 learning outcomes · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise the features that argue against AML despite many marrow “blasts” — no Auer rods, a negative POX, a
   lineage-negative immunophenotype, a slow course, CD56 expression — and hold off induction.
2. Order a marrow trephine with immunohistochemistry and a search for a solid primary (chest CT, PET-CT, tumour
   markers) before any induction chemotherapy.
3. Interpret an epithelial/neuroendocrine immunohistochemical profile (AE1/AE3, CAM5.2, synaptophysin, CgA positive;
   MPO, LCA negative) as metastatic small-cell carcinoma, infer a lung primary from imaging, NSE and ProGRP, and
   stage it as extensive disease (TNM 8th edition: N3, M1).
4. Explain paraneoplastic hyponatraemia (SIADH) and ectopic pancreatic-enzyme production in small-cell lung cancer,
   and plan the SIADH work-up and a safe correction rate for chronic hyponatraemia (European guideline 2014).
5. Explain why a normal chest X-ray does not exclude a central lung tumour (the report quotes a sensitivity of about
   26 %), and get an early chest CT when lung cancer is suspected.
6. Manage fever with a new lung opacity and respiratory failure in an immunocompromised patient — oxygen, prompt
   empirical antibiotics (SSC 2021) and blood products — and open an early goals-of-care conversation with the
   patient and family.

These are the case's `learningOutcomes` (case card and debrief); the five HUD `objectives` below are the in-game
task list.

## Clinical summary

**Before admission.** A 57-year-old man (no smoking; long-term heavy drinking, abstinent since an episode of
alcohol-related acute pancreatitis two years earlier; family and marital history unremarkable) has had three months
of tiredness and poor appetite without an obvious trigger, 14 kg of weight loss, and a week of bruising over the
abdomen and groins. About a month before admission a local hospital found **pancytopenia** (white cells 2.7–1.9,
haemoglobin 106–88 g/L, platelets 25–23 ×10⁹/L), **sodium 121 mmol/L**, LDH 660 U/L, lipase 1200 U/L and amylase
335 U/L, with normal liver and renal function, clotting, viral serology, **thyroid function** and **chest X-ray**;
head MRI (left corona radiata ischaemic focus), echo (EF 74 %), abdominal ultrasound and gastroscopy (chronic
gastritis) were otherwise unremarkable. Their marrow showed many blasts; flow found an abnormal population of 12.6 %
expressing CD15, **CD56**, CD81 and CD117 (partly CD13), CD34+ cells 0.2 %. They diagnosed **AML and acute
pancreatitis**; fasting, fluids and acid suppression did not help, and the hyponatraemia persisted. This hospital's
emergency marrow (14 days before admission): blasts 0.76, **no Auer rods, POX negative**; a P2 population of 41.4 %,
CD15+ and CD117+, every other lineage marker tested negative. Lipase 1686–2086 and amylase 216–264 U/L; stool occult
blood negative.

**Admission (day 0).** Alert, pale; T 36.6 °C, P 80, R 20, BP 120/77 mmHg, SpO₂ 98 % on air. Scattered petechiae and
bruises on the abdominal wall and groins; firm, mobile, non-tender inguinal nodes up to 1 × 1 cm; clear chest; normal
heart; slightly firm abdominal wall with mild epigastric/RUQ tenderness, no organomegaly or mass; no oedema; normal
reflexes, Kernig negative. No abdominal pain this time, and no cough, sputum or chest pain.

**Days 1–5.** White cells 1.9–2.5, haemoglobin 62–69 g/L, platelets 21 → 11 ×10⁹/L, reticulocytes 0.021. Supportive
care (nutrition, transfusion, electrolytes) while the team withheld AML induction. NSE 250.4 μg/L, **ProGRP > 5000
ng/L**; CYFRA 21-1, CA19-9, CA15-3, PSA normal. Chest CT: enlarged left hilum and mediastinal nodes (fig. 1). PET-CT:
a 1.6 × 2.9 cm left upper-lobe perihilar nodule (SUVmax 5.6), left hilar and **left supraclavicular** node
metastases, diffuse uneven marrow uptake, nothing in the liver, biliary tree, pancreas or spleen. **Trephine:**
carcinoma replacing the marrow — AE1/AE3, CD10, CAM5.2, synaptophysin positive, CgA and CD15 weak, MPO, LCA, TTF-1
and the lymphoid markers negative, Ki-67 30 % → **small-cell neuroendocrine carcinoma**.

**Diagnosis.** Small-cell lung cancer (central, left hilar) metastatic to the bone marrow — extensive stage; the
report wrote T1N2M1, stage IV.

**Day 5.** Transferred to oncology; the same day fever, breathlessness, bilateral crackles, a large right-lung
opacity on the chest film (“haemorrhage? infection?”) and type I respiratory failure. Despite reservoir-mask oxygen,
transfusion, haemostatic treatment and empirical meropenem he kept deteriorating; his family declined further
resuscitation and took him home, and he died on the way the same day. No anticancer treatment was given.

## Scenario timeline and physiology

- **Static clock, four one-way phases**, no physiology (the collection test requires none):
  - `workup` ← `obj-assess` (history and examination) and `obj-next` (outside and emergency records read;
    `next-step` and `sodium` answered). This is the audit's main fix: the decision about AML induction is asked
    **before** any result that names the carcinoma can be read.
  - `deterioration` ← `obj-diagnosis` (trephine, chest CT, PET-CT and tumour markers read in `workup`; `diagnosis`
    answered; transfer to oncology).
  - `followup` ← `obj-deterioration` (reassessed on day 5; bedside film and blood gas read; `deterioration`
    answered).
- **What exists when.** Everything done before admission (the other hospital's tests, this hospital's emergency
  marrow and enzyme monitoring) is a chart review on day 0. The tests done after admission (trephine, chest CT,
  PET-CT, tumour markers, the in-hospital blood counts) have no result on day 0 — ordering them then says "no result
  yet" — and their results open in `workup`, where they are ordered again. The in-hospital count range covers days
  0–5, so it is shown in `workup`, not on day 0.
- **History.** Admission items are `initial` (respiratory and confusion also `workup`); `status-workup` and
  `status-deterioration` speak for the later phases, the latter superseding the respiratory item on day 5 ("Fever…
  can't get my breath…").
- **Interventions have no vital effects**; the `followup` record states what the team's treatment achieved.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | Piece together the illness, the earlier care and the examination | presentation, bruising, weight, outside label, abdominal pain, respiratory symptoms, alcohol asked; vitals, skin, nodes, abdomen, chest examined |
| 2 | Review the records and decide what comes next | outside bloods, emergency marrow and enzyme records read; `next-step`, `sodium` |
| 3 | Find the primary and make the diagnosis | trephine, chest CT, PET-CT, tumour markers read (`workup`); `diagnosis`; transfer to oncology |
| 4 | Manage the sudden deterioration on the day of transfer | reassessed (chest or general state); bedside film and blood gas read; `deterioration` |
| 5 | Check the outcome in the report | follow-up record read (`followup`) |

### Decisions

- `next-step` (single; needs the outside label, outside bloods, emergency marrow and enzymes — **not** the trephine or
  imaging): withhold induction, support, chase the trephine and look for a solid primary ✓ (the report). Distractors:
  start "7 + 3" today; keep treating pancreatitis; correct the sodium fast first.
- `sodium` (single; needs the outside bloods, the electrolyte record, his consciousness, alcohol and weight):
  chronic hyponatraemia without severe symptoms — volume status, serum/urine osmolality, urine sodium, adrenal
  function, treat the cause, rise ≤ 10 mmol/L in 24 h and ≤ 8 mmol/L per 24 h after, aiming lower for drinking and
  malnutrition ✓. Distractors: hypertonic bolus; normal within 24 h; "just poor eating, no work-up".
- `diagnosis` (single; needs trephine, CT, PET-CT, markers): small-cell lung cancer with marrow metastasis,
  extensive stage, lung primary inferred ✓; the feedback also corrects the report's N2 to N3. Distractors:
  pancreatic neuroendocrine primary (no pancreatic uptake); AML with aberrant markers (MPO/LCA negative, epithelial
  markers positive); "must bronchoscope first" (histology already from the marrow; the authors judged bronchoscopy
  too risky).
- `deterioration` (single; needs the day-5 reassessment, bedside film, blood gas and the in-hospital counts):
  reservoir-mask oxygen, cultures then prompt empirical antibiotics, blood products, senior/critical-care review and
  an early goals-of-care conversation ✓. Distractors: bronchoscopy first; wait for culture results; chemotherapy
  today and ignore the opacity.

Every option has its own feedback, naming the guidance or the report's reasoning where it matters.

### Rubric (deterministic items, total weight 21)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-hx-course` | history | 1 | presentation, bruising, weight asked |
| `rb-hx-label` | history | 2 | outside label, abdominal pain, respiratory symptoms asked |
| `rb-hx-risk` | history | 1 | alcohol, smoking asked |
| `rb-ex` | examination | 1 | vitals, skin, nodes, abdomen, chest examined |
| `rb-inv-records` | investigations | 2 | outside bloods and chest X-ray, emergency marrow and enzyme records read |
| `rb-dx-next` | diagnosis | **3** | `next-step` right first time |
| `rb-inv-solid` | investigations | 2 | trephine, chest CT, PET-CT, tumour markers read (`workup`) |
| `rb-dx` | diagnosis | 2 | `diagnosis` right first time |
| `rb-mgmt-sodium` | management | 2 | `sodium` right first time; osmolality/urine sodium ordered |
| `rb-mgmt-deterioration` | management | 2 | `deterioration` right first time; blood cultures ordered; oxygen; meropenem |
| `rb-safety` | safety | **3** | `next-step` attempted, and no AML induction, hypertonic bolus, rapid correction or further pancreatitis fasting |

One examiner-judged communication item (`rb-comm`): honest about the uncertainty and the revised diagnosis, and a
goals-of-care conversation with him and his relative when he deteriorates.

### How wrong choices score

- `aml-induction`, `hypertonic-bolus`, `rapid-correction` and `pancreatitis-nbm` are always `contraindicated` (a
  safety event with its `harm` text) and fail `rb-safety`; `rb-safety` is earned only once `next-step` has been
  attempted, so doing nothing earns nothing (the annotation file adds `scoredWhen` and `critical`).
- `bronchoscopy` is `low-value` (no result: not done, with the authors' reason).
- Oxygen, meropenem and goals of care are `indicated` on day 5; `sodium-plan` once `sodium` is answered; transfusion
  once a blood count has been read; transfer once the diagnosis is made.

## Reference path (`solution`)

82 steps, static clock:

1. **Day 0:** 18 history questions; 9 examinations; outside bloods, imaging, chest X-ray and marrow, emergency marrow
   and enzyme records read; IV access; electrolytes, osmolality/urine sodium (no result in the source) and cortisol
   (no result); `next-step`, `sodium`; sodium plan, transfusion, nutrition → `workup`.
2. **Days 1–5:** status question; blood counts, trephine, chest CT, PET-CT, tumour markers read; `diagnosis`;
   transfer to oncology → `deterioration`.
3. **Day 5:** status question; general state and chest re-examined; reservoir-mask oxygen; bedside film, blood gas,
   blood cultures (not recorded) read; meropenem; transfusion; goals-of-care conversation; `deterioration` →
   `followup`.
4. **Outcome:** follow-up record; finish.

`cases verify` passes (5/5 objectives, 4/4 decisions); the deterministic rubric scores 21/21 with every decision
right first time and no contraindicated intervention.

## Clinical numbers check

- **Counts:** pancytopenia outside (WBC 2.7–1.9, Hb 106–88 g/L, platelets 25–23 ×10⁹/L) and worse in hospital (Hb
  62–69 g/L, platelets 21 → 11 ×10⁹/L); reticulocytes 0.021 (2.1 %) — inappropriately low for the anaemia, in keeping
  with marrow replacement.
- **Marrow percentages:** outside flow 12.6 %, emergency smear 76 % blasts with a 41.4 % P2 population — different
  samples and denominators, not comparable.
- **Sodium:** 121 mmol/L is "profound" in the European guideline's grading (< 125 mmol/L); a safe first-day rise is
  ≤ 10 mmol/L (to ≤ 131 mmol/L), and normal (≥ 135) within 24 h would be a rise of ≥ 14 mmol/L.
- **Enzymes:** lipase 1200 → 1686–2086 U/L and amylase 335 → 216–264 U/L, painless, unchanged by pancreatitis
  treatment (no reference ranges in the source).
- **Staging:** PET left supraclavicular node → N3 (TNM 7th and 8th editions alike); diffuse marrow uptake and
  trephine-proven marrow disease → M1, stage IV, extensive stage. The report's T1N2M1 is kept as printed and
  labelled.
- **Timeline:** onset 3 months before admission; outside work-up about 1 month before; emergency marrow 14 days
  before; bruising 7 days before; admission = day 0; diagnosis, transfer, deterioration and death on day 5.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to hold back treatment from a man who had already been told he had leukaemia?"
2. **Description.** "In two sentences: what did the marrow really contain, and how did the team find out?"
3. **Analysis.**
   - "Which findings made you doubt AML? Which ones would have changed your mind?"
   - "What could leukaemia not explain here?"
   - "How would you have worked up and corrected his sodium — and what made him high-risk?"
   - "The chest X-ray a month earlier was normal. What does that tell you?"
   - "On day 5, what did you treat first, and why not bronchoscopy?"
   - "How did you talk with him and his family when he deteriorated?"
4. **Summary.** "Next time you see 'blasts' with pancytopenia, what will you check before induction?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Accepting the outside AML label | `next-step` (`start-induction`); `aml-induction` contraindicated | `rb-dx-next` (weight 3), `rb-safety` |
| Treating the enzymes as pancreatitis | `treat-pancreatitis` feedback; `pancreatitis-nbm` contraindicated | `rb-dx-next`, `rb-safety` |
| Rapid or hypertonic sodium correction | `sodium` distractors; `hypertonic-bolus`, `rapid-correction` contraindicated | `rb-mgmt-sodium`, `rb-safety` |
| Ignoring the hyponatraemia | `ignore` feedback | `rb-mgmt-sodium` |
| Reading pancreatic primary from the enzymes | `pancreatic-net` feedback (PET) | `rb-dx` |
| Insisting on bronchoscopy | `must-bronchoscope`, `bronchoscopy-first` feedback; low-value test | `rb-dx`, `rb-mgmt-deterioration` |
| Waiting for cultures before antibiotics | `wait-cultures` feedback; meropenem response | `rb-mgmt-deterioration` |
| No goals-of-care conversation | `resus-bundle` feedback; `goals-of-care` intervention | `rb-comm` |

### Teaching points for the debrief

The six `debrief.teachingPoints` ("blasts" are not always leukaemia; hyponatraemia work-up and correction; the
normal chest X-ray; raised enzymes without pancreatitis; staging and first-line treatment of SCLC; the acute
deterioration) each name what they rest on — the report's own lessons ("启示" box, p. 625), the European
hyponatraemia guideline 2014, ESMO SCLC 2021 with TNM 8th, and the Surviving Sepsis Campaign 2021.

## Embodied mode

- **Where he is.** He lies in a ward bed throughout. Chest CT and PET-CT take him to the scanners and back (2 round
  trips in the offline embodied demonstration in `general-hospital`; static clock). The day-5 chest film is
  `performedAt: "bedside"` (a portable film on a hypoxaemic man), ordered at the radiology console with nobody moved.
  The low-value bronchoscopy would take him to the endoscopy suite. The transfer to oncology is a `disposition` with
  no `destination` — the oncology ward is another ward bed, so he stays.
- **Chart reviews.** The other hospital's bloods, imaging, chest X-ray and marrow, this hospital's emergency marrow
  and enzyme monitoring, and the follow-up record are `category: "record"`, `requires: ["records"]`, risk none —
  read at a records terminal (the ward nurse station has one). The annotation file marks them
  `performedAt: "records"`.
- **Kit.** The case has an IV-access procedure (`iv-access`, nursing scope); transfusion, IV drugs and the wrong IV
  choices need it first. Blood products and drugs are delivered (`blood-bank`, `medications`); the reservoir mask
  needs the ward's oxygen (`device: "non-rebreather-mask"`); the trephine is requested at the pathology workstation
  (`histopathology`); bloods, gases and cultures are laboratory tests.
- **Companion.** His relative (`role: "carer"` — the report says only “family”, not the relation) does not answer
  history; the relative is there for the conversations about the illness and the goals of care. The annotation file
  makes him non-verbal in `followup`.
- The offline demonstration scores 21/21 (100 %) in clinical and in-world mode alike, all objectives complete.

## Source and adaptation (fidelity limits)

**From the report** (张路, 王书杰, 杨辰. 中华医学杂志 2014;94(8):624-626, checked line by line against the full text and
all three PDF pages): every history fact, the admission examination, every result with its unit and the source's
own "raised/low/normal", the timeline, the team's reasoning (including the "诊断难点/启示" box on p. 625), and the
outcome — including that the **family declined further resuscitation**. Calendar dates are relative (day 0 =
admission).

**Adapted for teaching:** the dialogue (lay renderings of the record; the "nothing else bothered me", "breathing's
been all right" and "my head's clear" answers paraphrase the source's "no other obvious symptoms", "no cough, sputum,
chest pain or other respiratory symptoms" and "alert, no change in consciousness"); his concern about the leukaemia
label (`ice`, labelled a teaching adaptation); the relative; the decisions, options, feedback, rubric, interventions
and objectives; doses not in the report (meropenem 1 g every 8 h, the "7 + 3" and hypertonic-saline regimens) are
labelled as usual doses. Unrecorded facts — medicines, allergies, occupation, other past illnesses, other bleeding,
vital signs and gas values on day 5, cultures — stay unknown.

**Corrected from PR #3's 1.0.0:** the family history is now "unremarkable" (the source says 家族史无特殊; 1.0.0
marked it unknown); the follow-up says who stopped resuscitation (the family) and what was given; the respiratory
answer no longer hints at the later deterioration; the sodium is no longer in the patient's mouth.

**Contradictions kept, labelled, not resolved** (`unknowns`, the trephine note, the diagnosis feedback):

- **N category:** T1N2M1 in the text, but a left supraclavicular node metastasis on PET (N3).
- **Marker grouping:** the discussion calls CD56 epithelial and CAM5.2 neuroendocrine (it is the other way round).
- **Atypical profile:** TTF-1 negative and Ki-67 30 % are unusual for small-cell carcinoma.
- **POX:** the discussion treats a negative POX as excluding myeloid leukaemia; the case's key reasoning says that
  POX-negative AML exists and that the trephine was decisive.

**Figures.** `fig01` (source fig. 1, chest CT) was viewed: an "R" marker, a 10 cm scale bar and the journal
watermark, no direct identifier; it belongs to the chest CT result in `workup` (done after admission). The source
PDF (pp. 624–626) contains only this article and no burned-in identifier (all three pages viewed); its text keeps
the published dates and the authors' affiliations, as the provenance note says. It opens after the case, titled as
containing the outcome.

## Matcher notes

- `excludeKeywords`: the outside label vs the old pancreatitis (前年/喝酒/以前得过 → `alcohol`); abdominal pain vs the
  old alcohol-related pain; `medications` vs allergies, acid suppression and the outside hospital's treatment; `pmh`
  and `marital` vs family history; the inguinal-node finding vs neck, supraclavicular and axillary requests (those
  regions are not recorded and fall to `examNotRecorded`).
- Fever and night-sweat questions on admission reach `onset` ("nothing else really bothered me", the source's "no
  other obvious symptoms"; T 36.6 °C on the vitals finding); on day 5 they reach `status-deterioration`.
- Order entry: "外院/previous" routes chest X-ray and marrow queries to the other hospital's records; "床旁/portable/
  urgent" to the day-5 film; bare "CT" → chest CT, bare "胸片/CXR" → the day-5 film.
- The corpus (40 utterances, 24 zh-CN and 16 en, one deliberate non-match) passes `cases verify` with no extra
  selections.

## References

1. 张路, 王书杰, 杨辰. 第311例 全血细胞减少—胰酶升高—低钠血症—骨髓中大量原始细胞. 中华医学杂志. 2014;94(8):624-626.
   doi:10.3760/cma.j.issn.0376-2491.2014.08.018. Available from: https://rs.yiigle.com/cmaid/138898
2. Dingemans AC, Früh M, Ardizzoni A, et al.; ESMO Guidelines Committee. Small-cell lung cancer: ESMO Clinical
   Practice Guidelines for diagnosis, treatment and follow-up. Ann Oncol. 2021;32(7):839-853.
   doi:10.1016/j.annonc.2021.03.207
3. Spasovski G, Vanholder R, Allolio B, et al. Clinical practice guideline on diagnosis and treatment of
   hyponatraemia. Eur J Endocrinol. 2014;170(3):G1-G47. doi:10.1530/EJE-13-1020
4. Evans L, Rhodes A, Alhazzani W, et al. Surviving Sepsis Campaign: international guidelines for management of
   sepsis and septic shock 2021. Crit Care Med. 2021;49(11):e1063-e1143. doi:10.1097/CCM.0000000000005337
5. Prescott HC, Antonelli M, Alhazzani W, et al. Surviving Sepsis Campaign: international guidelines for management of
   sepsis and septic shock 2026. Crit Care Med. 2026.

How each was checked (2026-10-28): ref. 1 — authors, title, journal, volume, issue and pages from the export record
and the PDF; the DOI is the one printed on PDF p. 624 and in the export record (doi.org and Crossref were not
reachable from the editing session); the title's full-width space is normalised. Refs 2 and 3 — citation and DOI
from the records the audit found (esmo.org and PMC for ref. 2, PMID 33864941; the Erasmus repository for ref. 3).
Ref. 4 — citation and DOI as the audit verified them (LSTM research portal record); the author list as the library's
`septic-shock-cap` case gives it. Ref. 5 — authors and year as `septic-shock-cap` gives them; no DOI here, because
this editor could not check one (see To verify).
The NCI PDQ summary cited by 1.0.0 is dropped (a summary, not a guideline).

### To verify

- **ESMO SCLC 2021 wording and grade** for platinum–etoposide plus atezolizumab or durvalumab in PS 0–1 (a secondary
  summary gives [I, A]; one review disputes ESMO's position); no newer ESMO SCLC guideline was found by the audit.
  The co-authors after the first in ref. 2 were taken from the guideline's known author list, not re-checked.
- **European hyponatraemia guideline 2014:** the exact recommendation text and grades for the 10/8 mmol/L limits, the
  stricter targets in high-risk patients (alcoholism, malnutrition — also in the US expert recommendations), the
  SIADH criteria and fluid restriction as first-line treatment; whether a newer edition exists.
- **SSC 2026** (ref. 5): its DOI (`septic-shock-cap` cites doi:10.1097/CCM.0000000000007075 as checked by its editor;
  not re-checked here), volume and pages, and its wording on the timing of antibiotics, which the case still
  attributes to SSC 2021.
- **POX-negative AML subtypes** (minimally differentiated, megakaryoblastic, many monoblastic leukaemias) and the
  typical TTF-1/Ki-67 profile of small-cell carcinoma — against WHO-HAEM5/ICC 2022 and the WHO Thoracic Tumours 5th
  edition.
- **Chinese guidance** (CSCO small-cell lung cancer guideline; Chinese hyponatraemia consensus) was not checked in
  this pass.

## Changelog

### 1.1.0 — 2026-10-28 (editorial revision)

- **Decision timing fixed (audit A1):** "no AML induction" was asked only after the carcinoma was proven; now
  `next-step` is answered on day 0 from the outside and emergency records, before the trephine, CT, PET-CT and
  markers can be read (they open in the new `workup` phase).
- **Hyponatraemia taught (A2):** a `sodium` decision, a slow-correction plan, two tempting wrong choices, the work-up
  tests (not done in the source) and a teaching point on the European guideline 2014.
- **Phases:** 3 → 4 one-way phases (`initial`, `workup`, `deterioration`, `followup`); the day-5 deterioration is a
  decision point (oxygen, cultures and antibiotics, blood products, goals of care).
- **Source facts restored (B1–B5):** the full admission examination (vitals, heart, neurology, legs, the node and
  abdominal details); the other hospital's complete work-up (counts, chemistry, LDH, clotting, serology, thyroid,
  chest X-ray, head MRI, echo, ultrasound, gastroscopy, blood film, flow with CD56); the emergency marrow's full
  panel; the trephine's full panel; PET's pertinent negatives; the outcome with the family's decision and the
  treatments given. Family history corrected from "unknown" to "unremarkable".
- **Bundles split (C1):** counts, electrolytes, PET-CT, tumour markers, enzymes and abdominal imaging are separate;
  chart reviews are `records`; `pet-markers` → `pet-ct` + `tumour-markers` (ids changed; nothing outside the case
  referenced them).
- **Decisions/rubric/interventions (E2, E3):** 2 binary decisions with identical feedback → 4 decisions × 4 options
  with distinct feedback; 4 `decided` rubric items → 12 with `decidedFirstTry`, a safety item and a communication
  item; 0 → 12 interventions (IV access, transfusion, nutrition, sodium plan, transfer, oxygen, meropenem, goals of
  care, and four contraindicated choices including AML induction).
- **Spoiler removed (F2):** the summary and triage note no longer announce that the outside diagnosis is wrong; they
  are now distinct texts.
- **Patient voice:** first-person lay answers, the library's "not recorded" line, a persona and a relative; the
  pseudonym changed from 陆先生/Mr Lu to 聂先生/Mr Nie, a surname no other case uses (陆 was also in use in the collection
  when this pass began).
- **Matcher:** 1–2 keywords per item → 4–13; 16 verbatim-question utterances → 40 paraphrases.
- **Teaching:** 6 learning outcomes; 6 teaching points (previously none); Vancouver references naming ESMO SCLC 2021,
  the European hyponatraemia guideline 2014 and SSC 2021/2026; `provenance.review`; version 1.0.0 → 1.1.0;
  difficulty 4, 35 min.
- **Not applied:** removing "（化名）/(pseudonym)" from the displayed name (library-wide convention).

### 1.0.0

- First release in PR #3 (CMCR collection).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-138898/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-138898                                        # 82 steps · 5/5 · 4/4 · 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-138898
npm run -s cc -- exec --case cmcr-138898 --autopilot --approval bypass --provider offline --output-format json [--embodied]   # 21/21 both
```

## 中文摘要

**病例概要。** 57岁男性，乏力、食欲下降3个月，皮肤瘀斑1周，体重下降14 kg；长期大量饮酒，两年前饮酒后急性胰腺炎，此后戒酒；不吸烟。外院查见全血细胞减少、血钠121 mmol/L、LDH和胰酶升高，胸片、甲状腺功能等正常，骨髓“大量原始细胞”，诊断“急性髓系白血病、急性胰腺炎”，治疗无效转入。本院急诊骨髓涂片原始细胞0.76，但无Auer小体、POX阴性，免疫表型仅CD15、CD117阳性；胰酶持续升高，本次无腹痛。团队暂缓诱导化疗：骨髓活检免疫组化AE1/AE3、CAM5.2、Syn阳性，MPO、LCA阴性，符合小细胞神经内分泌癌；胸部CT左肺门占位，PET-CT左肺上叶近肺门结节伴左肺门、左锁骨上淋巴结转移及骨髓摄取增高；NSE 250.4 μg/L、ProGRP > 5000 ng/L。入院第5天诊断小细胞肺癌骨髓转移（广泛期）。当天转入肿瘤科后发热、呼吸衰竭、右肺大片阴影，经吸氧、输血、止血和美罗培南仍进展，家属放弃抢救，当日转运途中死亡。

**学习目标。**

1. 识别不支持急性髓系白血病的特征，在骨髓“原始细胞”增多时暂缓诱导化疗。
2. 诱导化疗前安排骨髓活检免疫组化并寻找实体瘤原发灶。
3. 把上皮/神经内分泌免疫组化谱解读为转移性小细胞癌，推定肺原发并分期为广泛期。
4. 解释副肿瘤性低钠和异位胰酶升高，按欧洲指南（2014）评估SIADH并安全纠正慢性低钠。
5. 说明胸片正常不能排除中心型肺肿瘤，可疑时尽早做胸部CT。
6. 处理免疫低下患者的发热、新发肺部阴影和呼吸衰竭，并及早与患者及家属讨论治疗目标。

**关键决策。**

- 入院当天：暂缓诱导化疗，支持治疗，追查骨髓活检并寻找原发灶（而非按AML诱导、继续按胰腺炎禁食或快速补钠）。
- 低钠：慢性、无严重症状——评估容量和渗透压、尿钠及肾上腺功能，针对病因；24小时内升高≤10 mmol/L，此后每24小时≤8 mmol/L，饮酒和营养不良者更保守。
- 诊断：小细胞肺癌骨髓转移（广泛期），肺原发为临床推定；左锁骨上淋巴结转移应为N3（原报告写作N2）。
- 病情恶化：储氧面罩给氧，留取培养后尽快经验性抗生素，输注血小板等血制品，请上级/重症医生评估，并及早讨论治疗目标。

**复盘要点。**

- “原始细胞”不等于白血病；POX阴性本身不能排除所有AML，本例决定性的是骨髓活检免疫组化。
- 白血病解释不了的低钠和无腹痛的胰酶升高，是小细胞肺癌的副肿瘤线索。
- 胸片敏感度低（原文引用约26%），可疑时尽早做胸部CT。
- 原报告的N分期、标记归类及TTF-1/Ki-67等不一致之处均作标注，未作更正。
- 本病例经人工智能辅助编辑审核，尚未经执业医师审核；用于教学前请由该专科的临床医生审核。
