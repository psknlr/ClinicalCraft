# cmcr-44614 — Fever and leg pain after treatment for a bone tumour · 6-year-old girl

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (何清和 / He Qinghe) is a
> pseudonym, and her relative, the attending (岑医生 / Dr Cen), the nurse (梁护士 / Nurse Liang), the pathologist
> (麦医生 / Dr Mai) and the haemato-oncology consultant (邱医生 / Dr Qiu) are teaching roles. The case adapts one
> published case report; it is not medical advice.
> 导师指南，含剧透。患者为化名，家属与医护人物为教学角色；本病例改编自已发表的单例报告，不构成医疗建议。

**Status of the facts.** Version 1.1.0 was re-authored from the facts recorded in version 1.0.0 (commit
`88ed0d2`), the only fact base available in the authoring environment. Those facts have **not yet been checked
against the full source article** (`extensions.sourceTextChecked: false`); the source pass follows when the article
text is available. Everything listed under "To verify" is part of that pass.

## Case card

| | |
|---|---|
| id / version | `cmcr-44614` · `1.1.0` · CMCR additional collection (`cmcr-105`) |
| Source | 吴诸丽, 张永红, 金玲, 等. 淋巴母细胞淋巴瘤误诊为尤文肉瘤一例. 中华儿科杂志. 2011;49(9):708-709 |
| Setting / facility | Children's ward bed (`inpatient`) / `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 min (static clock; three phases, five decisions, 14 investigations, 15 interventions) |
| Specialty | Paediatrics, oncology, haematology, pathology (`pediatrics`, `oncology`, `hematology`, `pathology`) |
| Languages | `zh-CN` (source language), `en` |
| Learner level | Final-year students and paediatric residents; paediatric haemato-oncology and pathology trainees for decisions 3–4; ward nurses for the first-hours part |
| Review status | `editorial`, 2026-10-30 — AI-assisted teaching design with an editorial review against the cited guidance; **not yet reviewed by a licensed clinician**, and the patient facts are not yet checked against the full article. Have a paediatric haemato-oncologist and a paediatric (or bone) pathologist review it before teaching use |
| Phases | `admission` 入院：发热两周、不能走路 / Admission: two weeks of fever, unable to walk → `diagnosis` 骨髓结果与病理复核 / Marrow results and the pathology review → `outcome` 原报告记录的治疗与转归 / Reported treatment and outcome — none learner-switchable |
| Content | 25 history items (7 required, 12 unrecorded, 2 labelled teaching devices; the relative answers, the girl answers for her own pain and walking) · 6 exam findings · 14 investigations (2 record reviews; 8 with no result recorded) · 15 interventions (6 contraindicated, 3 of them critical) · 6 objectives · 5 decisions (21 options; one select-all) · 12 rubric items (11 deterministic, weight 31; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 6 teaching points · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise marrow infiltration in a child previously treated for "Ewing sarcoma" — fever, pain in both legs,
   pallor, petechiae, an enlarged liver and spleen, a raised white count of mostly lymphocytes and low platelets —
   and re-examine the original diagnosis instead of anchoring on it.
2. Manage fever in a child with a suspected acute leukaemia as febrile neutropenia until the neutrophil count is
   known: blood cultures, then as soon as possible the antipseudomonal β-lactam monotherapy that the international
   paediatric fever-and-neutropenia guideline (2023 update) recommends for high-risk febrile neutropenia — no
   ibuprofen with a low platelet count and no corticosteroid before the diagnostic samples.
3. Handle an implausible laboratory value safely: recognise a haemoglobin written as 7.1 g/L as incompatible with
   life and probably a unit or transcription error, repeat the count before any red-cell transfusion, and decide on
   the measured value against the BSH 2016 threshold for stable children (70 g/L) — never acting on the written
   figure or correcting it silently.
4. Explain why CD99 and FLI-1 protein cannot separate Ewing sarcoma from lymphoblastic lymphoma (Folpe 2000; Lucas
   2001), and which tests do: TdT with B- and T-lineage markers, and testing for an EWSR1 rearrangement or FET::ETS
   fusion (WHO Classification of Soft Tissue and Bone Tumours, 5th edition, 2020).
5. Diagnose B-lymphoblastic leukaemia/lymphoma from the marrow morphology, flow cytometry (CD10, CD19, CD79a,
   HLA-DR, CD34) and TdT under the WHO 5th edition (2022), and plan ALL-type treatment — as for lymphoblastic
   lymphoma (EURO-LB02, 2017) — with CNS staging, genetics, MRD and the toxicity of the earlier chemotherapy taken
   into account.
6. Explain the changed diagnosis to the family with SPIKES (Baile 2000) — what changed, why and what it means —
   openly and without speculating about blame, and explain it to the girl herself in words a 6-year-old understands.

These are the case's `learningOutcomes`; they name the diagnosis, so front-ends show them before play only behind
the closed "Learning outcomes (6) · may reveal the diagnosis" disclosure and list them in every debrief
(CASE_AUTHORING §9.4, GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A 6-year-old girl had pain in the left leg and the right upper arm a year and ten months before this admission, with
local swelling and restricted movement but no fever or anaemia; her blood count was normal, and no marrow
examination is recorded. The other hospital's bone biopsy showed bone destruction and a small round cell tumour,
CD99, FLI-1 and CD3 positive and CD20 negative, with no TdT stain recorded; it was diagnosed and treated as **Ewing
sarcoma**, and after six courses of chemotherapy she was assessed as in complete remission. The limb pain has
recurred on and off over the whole period.

**This admission:** two weeks of fever and pain in both legs; she can no longer walk. Temperature 38.6 °C, an
anaemic appearance, scattered petechiae most marked on the legs, liver 3 cm and spleen 2.5 cm below the costal
margins. Blood count: white cells 42.38 × 10⁹/L, lymphocytes 91 %, platelets 20 × 10⁹/L, and a haemoglobin
**written as 7.1 g/L** — a value incompatible with life, probably a unit or transcription error, kept unchanged.

**Diagnosis:** marrow lymphoblasts and immature lymphocytes (原始幼稚淋巴细胞) 84.5 %; flow cytometry CD10, CD19,
CD79a, HLA-DR and CD34; review of the original bone biopsy and the new marrow: TdT positive, CD99 positive, CD79
partly positive, supporting a B-lymphoblastic neoplasm. The report's diagnosis: **B-lymphoblastic lymphoma
misdiagnosed as Ewing sarcoma, with extensive leukaemic marrow involvement at recurrence.**

**Course:** treatment was changed to a paediatric lymphoblastic regimen; no immature cells were seen in the
peripheral blood on day 8, complete remission was assessed on day 33, and she was on maintenance treatment at
publication. Drugs, doses, CSF, genetics, MRD and the later outcome are not recorded.

**Today's answer:** a small round cell tumour in a child's bone is not Ewing sarcoma until a panel with TdT and
lineage markers has excluded its mimics, and a FET::ETS fusion — the alteration that defines Ewing sarcoma in WHO
2020, where its molecular proof is a desirable rather than an essential criterion — settles a doubtful case. Fever
with a leukaemic count is treated as febrile neutropenia (cultures, then an antipseudomonal β-lactam as soon as
possible — 2023 guideline); no steroid and no
chemotherapy before the marrow, flow and CSF samples; tumour-lysis prevention; the impossible haemoglobin is
re-measured before any transfusion; and the disease is treated on a contemporary paediatric ALL protocol with CNS
staging after platelet support, genetics, MRD and the earlier anthracycline dose checked. The family is told openly
why the diagnosis changed.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires. The case shows
the recorded states only; no response to the learner's treatment is simulated, and every intervention's response
says what the case does and does not record.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | Admission day (1 year 10 months after the first symptoms) | start | the relative's and the girl's history (incl. a labelled teaching worry), the admission examination, the outside biopsy report (record review), the admission blood count, unrecorded admission tests (repeat count and film, blood culture, TLS bloods, clotting, MRI), decisions `working-diagnosis` and `first-hours`, the first-hours interventions and the requests for the pathology review and the haemato-oncology consultation |
| `diagnosis` | later in the admission (day not recorded) | objectives `obj-history`, `obj-examine`, `obj-first-hours` complete — history, examination, outside biopsy and blood count read, decisions 1–2 right, cultures, antibiotics, the repeat count, TLS bloods, hydration, allopurinol and the pathology-review request done | marrow morphology, flow cytometry and the pathology review; leukaemia genetics, EWSR1 testing and the echocardiogram (no result recorded); the family's second teaching worry; decisions `classification`, `treatment-plan`, `family-talk`; platelets, the lumbar puncture with intrathecal therapy, induction and the family meeting |
| `outcome` | to publication | all five decisions decided, `obj-classify` and `obj-plan` complete | the reported diagnosis, treatment and outcome record (with the approved histology figure) |

Marrow, flow, review and genetic results exist only in `diagnosis`; ordering them earlier shows an order-entry notice
saying so (`orderMatching.warnings`), and the pathology review says it must first be requested as an action. The
outcome record opens only in the final phase.

## Decisions and assessment

### Objectives (HUD chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-history` Find out about this illness and the first one | presentation, fever, walking (the girl), first symptoms, outside diagnosis, biopsy, previous chemotherapy asked |
| 2 | `obj-examine` Examine her | temperature, general look, skin, liver, spleen, walking examined |
| 3 | `obj-first-hours` Read the first results and act in the first hours | outside biopsy and blood count read in `admission`; decisions 1 and 2 right; blood culture, repeat count and TLS bloods ordered in `admission`; antibiotics, hydration, allopurinol and the pathology-review request given — all before the marrow results exist |
| 4 | `obj-classify` Establish what the disease is | marrow, flow and review read in `diagnosis`; decision 3 right |
| 5 | `obj-plan` Plan treatment and talk with the family | decisions 4 and 5 right; family meeting held |
| 6 | `obj-outcome` Compare your plan with the reported course | outcome record read |

Titles and hints name no diagnosis and contain no option text.

### Decisions

| id | Opens after | Key | Distractors (why they tempt) |
|---|---|---|---|
| `working-diagnosis` (single) | presentation, walking, first symptoms, outside diagnosis and chemotherapy asked; temperature, colour, skin, liver, spleen examined; outside biopsy and blood count read | `lymphoblastic-neoplasm`: a lymphoblastic leukaemia/lymphoma in the marrow, which the first tumour may also have been — marrow with flow now, and review of the original biopsy with TdT, lineage markers and EWSR1 testing | `ewing-marrow-relapse` (the anchoring answer: CD99 and FLI-1 "settled" it — restage and second-line Ewing chemotherapy); `therapy-related-leukaemia` (a real risk after sarcoma chemotherapy — the near-miss that keeps the old label); `reactive-infection` (fever after chemotherapy, repeat the count in a week) |
| `first-hours` (select all) | decision 1, blood count read | `cultures-antibiotics` + `repeat-count` + `tls-prevention` | `steroid-for-pain` (settle her fever and pain before the marrow); `red-cells-now` (transfuse on the written 7.1 g/L) |
| `classification` (single) | marrow, flow and review read in `diagnosis` | `b-lbl-progressed`: the first tumour was a B-lymphoblastic lymphoma taken for Ewing sarcoma (lymphoblasts also express CD99 and FLI-1); with marrow involvement above 25 % it is managed as B-lymphoblastic leukaemia | `two-diseases` (Ewing in remission plus therapy-related B-ALL); `mixed-phenotype` (reads the old CD3 as a T lineage — the recorded inconsistency made into a near-miss); `ewing-aberrant-b` (aberrant B antigens in Ewing, wait for EWSR1 to justify sarcoma treatment) |
| `treatment-plan` (single) | decision 3 | `all-protocol`: a current paediatric ALL protocol at a haemato-oncology centre, LP with the first intrathecal dose after platelets, genetics, MRD-guided risk, echo and the earlier anthracycline dose | `lymphoma-chop` (treat it like other lymphomas, no intrathecal therapy, radiotherapy to the old sites); `transplant-first` ("relapse after six courses"); `palliation` (relapse after intensive chemotherapy) |
| `family-talk` (single) | decision 3 | `open-explanation`: say plainly what changed and why, acknowledge distress, no guessing about fault, the new plan | `reassure-same` (false reassurance that nothing was lost); `blame-others` (speculating about the other hospital's fault); `defer-question` (answer only after induction) |

Every option has its own feedback (2–4 sentences: the reason, and the guidance, issuing body or paper and year where
one applies). Option ids name their content. The length cue is controlled: in English only `classification` has a
key that is uniquely the longest option (207 vs 204 characters); in Chinese no key is uniquely the longest
(`working-diagnosis` ties at 71); in the select-all `first-hours` the three keys are not the three longest options in
either language (English 113, 106, 92 against distractors of 94 and 93; Chinese 36, 35, 28 against 32 and 26). No
hedging cue: the qualifier in the `working-diagnosis` key ("which the first tumour may also have been") is matched by
two distractors ("which the earlier chemotherapy may have caused", "which may also explain").

### Rubric (11 deterministic items, weight 31, + 1 examiner-judged)

| id | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history` | history | 3 | presentation, fever, walking, weakness/sphincters (unrecorded: asking is the competency), first symptoms, outside diagnosis, biopsy, chemotherapy, medicines in the last two weeks (unrecorded) asked |
| `rb-examination` | examination | 2 | temperature, general look, skin, liver, spleen, walking |
| `rb-investigations` | investigations | 2 | outside biopsy and blood count read and TLS bloods ordered in `admission`; marrow, flow and review read and leukaemia genetics ordered in `diagnosis` |
| `rb-working-diagnosis` | diagnosis | 3 | decision 1 right first time and the pathology review requested |
| `rb-sepsis-first-hours` | management | 4 | **critical** — blood culture ordered in `admission` and antibiotics given while indicated (`indicatedWhen: {phase: admission}`, scored `whenIndicated`); the diagnostic phase also waits for both |
| `rb-first-hours` | management | 3 | decision 2 right first time; repeat count ordered in `admission`; hydration, allopurinol, paracetamol and the haemato-oncology referral given |
| `rb-no-harm` | safety | 4 | **critical** — none of: Ewing second-line chemotherapy (any time), dexamethasone in `admission`, ALL induction in `admission` (`valid: false` leaves); `scoredWhen` = decision 2 attempted or any of the three acts |
| `rb-safe-support` | safety | 2 | none of: ibuprofen, red cells before the repeat count was ordered, the LP before platelets or in `admission`; `scoredWhen` = decision 2 attempted or any of the three |
| `rb-classification` | diagnosis | 3 | decision 3 right first time |
| `rb-treatment-plan` | management | 3 | decision 4 right first time; platelets; LP with intrathecal therapy given validly; echocardiogram ordered in `diagnosis`; induction given validly |
| `rb-family` | management | 2 | decision 5 right first time; family meeting held |
| `rb-communication` | communication | (judged) | SPIKES within a Calgary–Cambridge structure: why the diagnosis changed, the new plan, uncertainty, no blame, the girl's own explanation (see judge guidance) |

**Critical items are acts**, not decisions: `rb-sepsis-first-hours` (the missed life-saving act) and `rb-no-harm`
(the dangerous errors). The antibiotics cannot be credited in hindsight: `obj-first-hours`, which opens the
diagnostic phase, needs the culture and the antibiotics, and the rubric counts only antibiotics given while
`admission` held. No critical item is met by a decision, and no decision reads a final-phase record.

### How wrong choices score (measured 2026-11-13 with core `assess`)

| Path | Score | Critical items missed | Safety outcome |
|---|---|---|---|
| Reference path (`solution`) | 31/31 (100 %) | none | passed |
| Do nothing (start, then try to finish) | 0 (finish refused: objectives incomplete) | `rb-sepsis-first-hours` | passed |
| A wrong first answer at every decision, then the right one | 17/31 (55 %) | none | passed |
| One wrong first answer at decision 1, 2, 3 or 4 (each of the 15 distractors) | 28/31 (90 %) | none | passed |
| One wrong first answer at decision 5 (each of the 3 distractors) | 29/31 (94 %) | none | passed |
| Reference path + Ewing second-line chemotherapy, dexamethasone in `admission` or induction in `admission` | 27/31 (87 %) | `rb-no-harm` | **failed** (critical intervention) |
| Reference path + ibuprofen, red cells before the repeat count, or the LP before platelets | 29/31 (94 %) | none | passed (contraindicated, non-critical) |
| No antibiotics, or no blood culture (the learner stops there) | stays in `admission`; 17/31 (55 %) | `rb-sepsis-first-hours` | passed |
| No pathology-review request, no TLS prophylaxis or no repeat count (the learner stops there) | stays in `admission`; 18/31 (58 %) | none | passed |
| Antibiotics held back until the marrow results | not possible: `diagnosis` stays closed until they are given | — | — |
| No platelets, LP or induction | 28/31 (90 %) | none | passed |
| No family meeting | stays in `diagnosis` (`obj-plan`); 29/31 if the learner stops there | none | passed |
| Dexamethasone given in `diagnosis` (after the marrow and flow samples, possibly before the LP) | 31/31 — neutral, not contraindicated: the case flags a steroid only before the marrow (see "To verify") | none | passed |

Contraindicated acts are listed as safety events in every debrief.

**Safety outcome.** Three interventions are `critical: true`: `ewing-relapse-chemo` (sarcoma chemotherapy on an
unproven label, deepening marrow suppression in a febrile child with platelets of 20 × 10⁹/L and delaying the real
treatment), `steroid-now` in `admission` and `all-induction` in `admission` (a steroid or chemotherapy before the
marrow, flow cytometry and CSF samples can make the diagnosis and risk group impossible to complete and can
precipitate tumour lysis; the Children's Cancer and Leukaemia Group advises no corticosteroid before referral when
leukaemia or lymphoma is possible, CCLG 2026). Giving any of them while contraindicated fails the assessment's safety outcome
(`safety.passed: false`) whatever the score. `lp-intrathecal` is high-risk and explicitly `critical: false`: an LP
before platelet support or before the diagnosis is a serious but recoverable misjudgement that the rubric
(`rb-safe-support`) and the debrief record. `ibuprofen` and `red-cells` are moderate-risk contraindicated steps.

## Reference path (`solution`)

68 steps: start → 24 admission-time history questions (including the 12 unrecorded ones, which teach what to ask:
weakness and sphincters, bleeding, B symptoms, a focus of infection, the first marrow, the earlier drugs, the
length of remission, recent medicines including steroids, allergies, family history, vaccinations and weight) →
temperature, general look, skin, liver, spleen, walking → outside biopsy report (records) → IV access → blood count
→ blood culture, repeat count and film, TLS bloods, clotting → decision 1 → pathology-review request,
haemato-oncology referral → piperacillin–tazobactam, paracetamol, potassium-free hydration, allopurinol → decision 2
(the three correct options) → (`diagnosis`) the family's worry → marrow, flow cytometry, pathology review → decision 3
→ leukaemia genetics, EWSR1 testing, echocardiogram → decision 4 → platelets, LP with intrathecal therapy, induction
→ family meeting → decision 5 → (`outcome`) the outcome record → finish. It scores 31/31 with no contraindicated act,
in clinical and in-world mode, in both languages. The demonstration does not order the MRI (no result is recorded;
learners may still order it).

## Clinical numbers check

Every patient value below is from version 1.0.0 (field in brackets) and keeps its unit; none is new. The source check
against the full article is pending.

| Value | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| Girl, 6 years | `patient` | `patient`, title, triage note |
| Limb pain recurring for 1 year 10 months; fever (again, zh) for 2 weeks | `patient.chiefComplaint` | `chiefComplaint`; history `pain-course`, `presentation` |
| First illness: pain in the left lower limb and right upper arm, local swelling, restricted movement, no fever or anaemia | history `original` | history `first-pain`, `first-swelling`, `first-negatives` |
| Blood count normal at the first illness; no first marrow examination recorded | history `initial-count` | history `first-negatives`, `first-marrow` (unknown) |
| Outside diagnosis: Ewing sarcoma | history `old-label` | history `first-diagnosis`; `outside-biopsy` result |
| Six courses of chemotherapy, then assessed as complete remission | history `treatment` | history `previous-chemo`; triage note |
| Fever and pain in both legs from 2 weeks before admission; now unable to walk | history `recurrence` | history `presentation`, `fever`, `leg-pain`, `walking`; triage note |
| T 38.6 °C; anaemic appearance; scattered petechiae, most marked on the lower limbs; liver 3 cm and spleen 2.5 cm below the costal margins; unable to walk | exam `systemic` | exam `temperature`, `general-look`, `skin`, `liver`, `spleen`, `gait`; triage note (temperature) |
| Old pathology: bone destruction; small round cell tumour; CD99 +, FLI-1 +, CD3 +, CD20 −; no TdT recorded | `old-path` (workup) | `outside-biopsy` (`admission`) text and values |
| WBC 42.38 × 10⁹/L, lymphocytes 91 %, platelets 20 × 10⁹/L; Hb written as 7.1 g/L (suspected value or unit error, not changed) | `blood` (workup) | `fbc` (`admission`) values and note |
| Marrow 原始幼稚淋巴细胞 84.5 % | `review` (confirmation) | `marrow` (`diagnosis`) |
| Flow: CD10, CD19, CD79a, HLA-DR, CD34 | `review` (confirmation) | `flow` (`diagnosis`) |
| Review of the old bone biopsy and the new marrow: TdT +, CD99 +, CD79 partly +; supports a B-lymphoblastic neoplasm | `review` (confirmation) | `path-review` (`diagnosis`: the stains); the conclusion moved to `outcome` |
| Reclassified as B-lymphoblastic lymphoma; extensive leukaemic marrow involvement at recurrence | `debrief.conclusion` | `outcome` record; debrief |
| Paediatric lymphoblastic regimen; day 8 peripheral immature cells 0; day 33 complete remission; on maintenance at publication | `followup` (followup) | `outcome` record; `all-induction` response (the regimen only) |

**Reference ranges.** None is recorded; every lab value carries "reference range not recorded". White cells are
flagged H and platelets L (no range is implied); the haemoglobin carries no flag, because the written value is
not believed.

**Derived values (facilitator orientation only; not shown to learners).**
* Lymphocytes ≈ 42.38 × 0.91 ≈ 38.6 × 10⁹/L; all other white cells together ≈ 3.8 × 10⁹/L (9 %). The neutrophil
  count is therefore somewhere between 0 and about 3.8 × 10⁹/L — not known, which is why decision 2 treats the fever
  as febrile neutropenia until a manual count is available.
* Haemoglobin: 7.1 g/L would be 0.71 g/dL. Read as 7.1 g/dL it would be 71 g/L — just above the BSH 2016 restrictive
  threshold of 70 g/L for stable children, so even the "probable" value would not by itself call for red cells.
  The case never states 71 g/L as her haemoglobin.
* Timing: the first symptoms began 1 year 10 months before this admission; the fever and leg pain began 2 weeks
  before it. When the six courses were given and how long the remission lasted are not recorded.
* Thresholds used in teaching: ALL with a white count below 100 × 10⁹/L is intermediate tumour-lysis risk unless
  the LDH is at least twice the upper limit (then high) (Cairo 2010; see "To verify"); prophylactic platelets below
  10 × 10⁹/L in stable children, below 20 × 10⁹/L with sepsis or severe mucositis (BSH 2016); marrow involvement of
  more than 25 % is conventionally called leukaemia rather than lymphoma.
* Doses in the intervention texts are formulas only (no weight or height is recorded): piperacillin–tazobactam
  90 mg/kg (80 mg/kg piperacillin + 10 mg/kg tazobactam) every 6 hours, maximum 4.5 g per dose; paracetamol
  10–15 mg/kg every 4–6 hours, at most 4 doses in 24 hours; allopurinol about 10 mg/kg/day in 2–3 doses;
  hyperhydration about 3 L/m²/day; red cells and platelets 10–15 mL/kg. No `doseSpec` is given, because every
  dose is per kg or per m² and no weight is recorded.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "She had been told she was in remission. How did it feel when her count came back?"
2. **Description** — "Take me through what you knew at the bedside, what the outside report said, and what you did
   before the marrow result."
3. **Analysis**
   * "Which of her findings told you the marrow was involved, and which could infection explain?"
   * "What did CD99 and FLI-1 prove in the first biopsy — and what would the same stains show in a lymphoblastic
     lymphoma? What did the CD3 result and the missing TdT stain tell you?"
   * "Her neutrophil count was unknown. Why did you (or didn't you) give antibiotics before you knew it?"
   * "What did you do with a haemoglobin of 7.1 g/L? What would have happened if you had transfused on it, or
     quietly changed it to 71?"
   * "Why no steroid for her pain before the marrow? Why no ibuprofen?"
   * "Lymphoma or leukaemia — did the name change your treatment? What has to happen before the first lumbar puncture?"
   * "How did you answer the family when they asked whether the first diagnosis was wrong?"
   * "The report's patient was in remission on day 33. What does that tell us — and what does it not?"
4. **Summary** — "What will you check the next time a child arrives with an old diagnosis that does not fit?"

### Common learner errors and how the case surfaces them

| Error | What the case does | Where it scores |
|---|---|---|
| Anchoring on the old label: "her Ewing sarcoma has relapsed" | `ewing-marrow-relapse`; `ewing-relapse-chemo` is critical | `rb-working-diagnosis`, `rb-no-harm` |
| Accepting a therapy-related leukaemia and never questioning the first biopsy | `therapy-related-leukaemia`, `two-diseases` | `rb-working-diagnosis`, `rb-classification` |
| "It's just an infection — repeat the count next week" | `reactive-infection` | `rb-working-diagnosis` |
| Waiting for a neutrophil count before antibiotics | `first-hours` key; `obj-first-hours` keeps the diagnostic phase closed until cultures and antibiotics are done | `rb-sepsis-first-hours` (critical) |
| Steroids for pain or fever before the samples | `steroid-for-pain`; `steroid-now` is critical in `admission` | `rb-first-hours`, `rb-no-harm` |
| Ibuprofen with platelets of 20 × 10⁹/L | `ibuprofen` contraindicated | `rb-safe-support` |
| Transfusing on — or silently correcting — the impossible haemoglobin | `red-cells-now`; `red-cells` contraindicated until the repeat count is ordered | `rb-first-hours`, `rb-safe-support` |
| Reading the old CD3 as a second lineage | `mixed-phenotype` (feedback: tissue CD3 also stains reactive T cells; MPAL needs lineage markers on the blasts) | `rb-classification` |
| Treating LBL like other lymphomas, or rushing to transplant, or offering palliation only | `lymphoma-chop`, `transplant-first`, `palliation` | `rb-treatment-plan` |
| LP straight away with platelets of 20 × 10⁹/L | `lp-intrathecal` contraindicated before platelets or in `admission` (`critical: false`) | `rb-safe-support`, `rb-treatment-plan` |
| False reassurance, blaming the other hospital, or deferring the question | `reassure-same`, `blame-others`, `defer-question` | `rb-family`, communication (judged) |

## Embodied mode

* **Where she is.** A children's ward bed in the general hospital (`inpatient`), lying; she is never moved by the
  reference path. The outside biopsy report and the outcome record are record reviews (`performedAt: "records"`,
  `requires: ["records"]`, risk none), read at a records terminal or in the notes at the bedside.
* **IV access** is a nursing procedure (`iv-access`, the ward's treatment cart); it is placed before the first IV
  item and draws the bloods. Laboratory, culture, marrow, flow, histopathology, cytogenetic and molecular samples are
  taken at the patient; results are read at a records terminal or at the bedside.
* **Devices.** Fluids run on the ward's infusion pump; drugs and blood products are delivered to the bedside; the
  echocardiogram is a bedside study (`performedAt: "bedside"`, the cart-based ultrasound/echo machine is wheeled to
  her). The MRI of the spine and legs would take her to the scanner (`performedAt: "provider"`); the reference path
  does not order it.
* **Who speaks.** She is 6 and can talk: her relative (`companion`, role `carer`, "何清和的家属（化名）/ He Qinghe's
  relative (pseudonym)" — the case does not record which relative, so the companion has no `presentation`) answers the
  history (`answersHistory: true`), and the girl answers for her own pain and walking (`speaker: "patient"` on
  `leg-pain` and `walking`). The opening line is hers.
* **Scope of practice.** IV access is nursing scope; fluids and drugs follow their kinds; the lumbar puncture is a
  medical procedure; the family meeting is a doctor's act; the pathology review and the haemato-oncology referral are
  consults.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-44614:"` passes: the offline demonstration finishes in-world
  in en and zh-CN with every objective done and the clinical-mode score.

## Source and adaptation (fidelity limits)

**From the facts of version 1.0.0 (kept, reorganised into phases and lay speech, not yet checked against the
article).** Age and sex; the recurrent limb pain over 1 year 10 months; the first illness (left lower limb and right
upper arm, local swelling, restricted movement, no fever or anaemia, a normal blood count, no recorded marrow
examination); the outside diagnosis of Ewing sarcoma and the old pathology (bone destruction, small round cell tumour,
CD99/FLI-1/CD3 positive, CD20 negative, no TdT recorded); six courses of chemotherapy and complete remission; two
weeks of fever and pain in both legs, unable to walk; the admission examination; the blood count with the written
haemoglobin; the marrow, flow cytometry and pathology review; the reclassification; the paediatric lymphoblastic
regimen, the day-8 and day-33 responses and maintenance at publication.

**Extraction summary (1.0.0 field → 1.1.0 field).** Chief complaint → `chiefComplaint`, `pain-course`, `presentation`;
history `original` → `first-pain`, `first-swelling`, `first-negatives`; `old-label` → `first-diagnosis` (+ the
`outside-biopsy` result); `treatment` → `previous-chemo`; `recurrence` → `presentation`, `fever`, `leg-pain`,
`walking`; `initial-count` → `first-negatives`, `first-marrow`; exam `systemic` → six findings; `old-path` →
`outside-biopsy`; `blood` → `fbc`; `review` → `marrow`, `flow`, `path-review` (and its conclusion → `outcome`);
`followup` → `outcome`. 1.0.0's ten template "unknown" slots were replaced by twelve unrecorded questions a clinician
would ask of this child (weakness and sphincters, bleeding, B symptoms, infection focus, first marrow, earlier drugs,
remission length, recent medicines, allergies, family history, vaccinations, weight).

**Moved to the phase where it is true.** The old pathology report and the admission count, which 1.0.0 held in a
second "workup" phase, are available on admission (the report predates the encounter; the count is the admission
count). The pathology reviewer's conclusion ("supports a B-lymphoblastic neoplasm") moved to the outcome record, so
the review record shows the stains and decision 3 asks the learner to interpret them.

**Adapted for teaching (labelled).** The relative (relationship not recorded — the persona says so), all dialogue
including the girl's words, and two worries that add no clinical fact (`concerns`, `family-worries`, sourced
"Teaching device"; the same worry is the persona's `concerns` entry); the relative's question in decision 5; the staff;
the phases' wording; decisions, options, feedback, interventions, rubric, teaching points; the unrecorded tests
offered to the learner with "No result is recorded for this test."; the order-entry notices.

**Contradictions and ambiguities kept, not resolved.**
* **Haemoglobin "7.1 g/L".** Incompatible with life as written; probably a unit (g/dL) or transcription error. The
  case shows it as written, flags it in a note, and teaches re-measurement; it never states 71 g/L as a fact.
* **CD3 positive in the old biopsy** of what was reclassified as a B-lymphoblastic neoplasm. 1.0.0 does not say
  whether the CD3 positivity was in the tumour cells or in background T cells; the case keeps it and uses it as the
  near-miss `mixed-phenotype`.
* **"再次发热" (fever again)** in the Chinese chief complaint, although the first illness had no fever; the English
  chief complaint of 1.0.0 dropped "again". Both are kept ("这两周又发烧了" / "she's had a fever again").
* **The review's stains are recorded jointly** for the old biopsy and the new marrow; the case keeps them joint and
  says so in the result note.
* **"Bone destruction"** may be an imaging or a pathology description; the result note says it is not stated.
* **"原始幼稚淋巴细胞 84.5 %"** counts lymphoblasts and immature lymphocytes together (1.0.0's English said
  "blasts/immature lymphocytes"); the case keeps both categories.

**Privacy.** Pseudonym unique in the collection; no hospital, city, date or identifying detail; times are relative
("a year and ten months ago", "day 8", "day 33"). The source citation (which names the diagnosis) is shown only after
the case.

**Figures.** `fig01` (approved in `scripts/cmcr-105-media-review.json` as histology panels with cells, figure labels
and the publication watermark only; checksum unchanged) is now attached to the outcome record, which opens only after
every decision; its title says it may show later findings and is for the debrief. Its content could not be viewed in
this environment (no local asset), so the case describes no finding from it.

**Survey findings fixed** (survey.json: template SI-01–SI-03 and the other systemic findings; the code review's
summary-spoiler finding names this case): the summary no longer echoes "review of the original small-round-cell
pathology" (decision 1's key) and the title no longer reads as a hint; template history slots and authoring language
in the relative's mouth ("这项情况原病例资料没有说明…", "Companion (educational role)") replaced; the triage note is a
handover, not an instruction; three generic decisions with role-named option ids (`review`, `same`, `correct-number`…)
replaced by five reasoning decisions with content ids and controlled length cue; the hindsight critical item (a
decision) replaced by two critical acts; interventions (none in 1.0.0), investigations, examination, objectives,
staff and unknowns at the revised-20 depth; review status editorial with five named guidelines; one Vancouver
citation (no zero-padded issue, no duplicated bare URLs); one extension schema (`sourceDoi` + `doiVerifiedAt` replace
`sourceDoiVerification`, `sourceTextChecked: false`).

## Matcher notes

* 40 `extensions.testUtterances` (20 zh-CN, 20 en), written as a learner would type them; none equals a keyword or a
  canonical question; 4 look-alike negatives (the district they live in, her kindergarten, her school, parking). Every
  required item and the phase twin have a paraphrase; `cases verify` passes 40/40 with no extra selections. The cap of
  40 leaves some items tested in one language only (en: `b-symptoms`, `infection-focus`, `first-marrow`,
  `remission-length`, `allergies`, `weight`, `family-worries`; zh: `first-swelling`, `first-negatives`, `chemo-details`,
  `medicines-now`, `family-history`, `immunisations`, `concerns`).
* Present-illness items exclude first-illness words and vice versa: `presentation`, `fever` and `leg-pain` exclude
  "当时 / 最开始 / back then / at the start"; `first-pain` excludes "这次 / now / swelling / fever / marrow", so
  "刚开始那会儿有没有发烧、贫血？" reaches `first-negatives` and not `fever`.
* `fever` excludes infection-focus words (咳嗽, 耳朵, 拉肚子 / cough, earache, tummy) so "Any coughing, earache or a
  tummy bug along with the fever?" reaches `infection-focus` alone; `previous-chemo` excludes drug-name words (哪些药,
  什么药, drug names) so they reach `chemo-details`.
* `biopsy` and `first-negatives` exclude marrow words, which go to `first-marrow`; `walking` excludes weakness and
  sphincter words, which go to `weakness-or-pain`.
* Phase twin: `family-worries` (`diagnosis`) supersedes `concerns` (`admission`).
* English keywords of three or more words are run together where they would reduce to one token
  (`broughtherin`, `atthebeginning`, `whatdidtheysay`, `anythingathome`, `onyourmind`…).

## References

1. 吴诸丽, 张永红, 金玲, 金眉, 杨菁, 段彦龙, 李伟京, 薛学敏, 黄爽, 张蕊. 淋巴母细胞淋巴瘤误诊为尤文肉瘤一例. 中华儿科杂志.
   2011;49(9):708-709. doi:10.3760/cma.j.issn.0578-1310.2011.09.017. Available from: https://rs.yiigle.com/cmaid/44614
2. Folpe AL, et al. Immunohistochemical detection of FLI-1 protein expression: a study of 132 round cell tumors with
   emphasis on CD99-positive mimics of Ewing's sarcoma/primitive neuroectodermal tumor. Am J Surg Pathol.
   2000;24(12):1657-1662.
3. Lucas DR, Bentley G, Dan ME, Tabaczka P, Poulik JM, Mott MP. Ewing sarcoma vs lymphoblastic lymphoma. A comparative
   immunohistochemical study. Am J Clin Pathol. 2001;115(1):11-17. doi:10.1309/K1XJ-6CXR-BQQU-V255
4. WHO Classification of Tumours Editorial Board. Soft tissue and bone tumours. 5th ed. Lyon: International Agency for
   Research on Cancer; 2020. (WHO classification of tumours series; vol. 3).
5. Alaggio R, Amador C, Anagnostopoulos I, et al. The 5th edition of the World Health Organization Classification of
   Haematolymphoid Tumours: Lymphoid Neoplasms. Leukemia. 2022;36(7):1720-1748. doi:10.1038/s41375-022-01620-2
6. Lehrnbecher T, Robinson PD, Ammann RA, et al. Guideline for the management of fever and neutropenia in pediatric
   patients with cancer and hematopoietic cell transplantation recipients: 2023 update. J Clin Oncol.
   2023;41(9):1774-1785. doi:10.1200/JCO.22.02224
7. Cairo MS, Coiffier B, Reiter A, Younes A; TLS Expert Panel. Recommendations for the evaluation of risk and
   prophylaxis of tumour lysis syndrome (TLS) in adults and children with malignant diseases: an expert TLS panel
   consensus. Br J Haematol. 2010;149(4):578-586. doi:10.1111/j.1365-2141.2010.08143.x
8. New HV, Berryman J, Bolton-Maggs PH, et al. Guidelines on transfusion for fetuses, neonates and older children.
   Br J Haematol. 2016;175(5):784-828. doi:10.1111/bjh.14233
9. Landmann E, Burkhardt B, Zimmermann M, et al. Results and conclusions of the European Intergroup EURO-LB02 trial in
   children and adolescents with lymphoblastic lymphoma. Haematologica. 2017;102(12):2086-2096.
   doi:10.3324/haematol.2015.139162
10. Gajjar A, et al. Traumatic lumbar puncture at diagnosis adversely affects outcome in childhood acute lymphoblastic
    leukemia. Blood. 2000;96(10):3381-3384.
11. Baile WF, Buckman R, Lenzi R, Glober G, Beale EA, Kudelka AP. SPIKES—a six-step protocol for delivering bad news:
    application to the patient with cancer. Oncologist. 2000;5(4):302-311. doi:10.1634/theoncologist.5-4-302
12. Children's Cancer and Leukaemia Group. Introduction to steroids. In: Community care information resource,
    section 6: treatment [Internet]. CCLG; updated 2026 Jan. Available from:
    https://www.cclg.org.uk/information-professionals/outreach-information-resource/section-6-treatment/introduction-steroids

The same strings are `debrief.references`. Twelve references are three more than the standard's "article + 3–8":
each is cited in the case text, and the pathology question (refs 2–4), the first-hours safety (refs 6–8, 10, 12) and
the treatment and communication (refs 5, 9, 11) each need their own sources. How they were checked (web search records,
2026-11-13; PubMed, Crossref and publisher pages could not be fetched directly): ref. 1 — the source map's
`verifiedDoi` (publisher page checked 2026-10-29); ref. 2 — bibliographic records of the paper (journal, volume,
issue, pages; 132 round cell tumours; FLI-1 protein not specific, lymphoblastic lymphomas, which are CD99 positive,
mostly FLI-1 positive) — co-authors and DOI not confirmed, so "et al." and no DOI; ref. 3 — bibliographic and abstract
records (authors, journal, volume, pages; all cases CD99 positive; a CD99 + TdT panel with other lymphoid markers
separates the two) and the DOI as listed for the journal page — the issue, 115(1), was confirmed on review (2026-11-14);
ref. 4 — secondary summaries of the classification (Ewing sarcoma defined by EWSR1 or FUS fusions with ETS-family
genes; CD99 sensitive but not specific; on review, 2026-11-14, a review of the 2020 classification and a WHO lecture
deck give small round cell morphology and membranous CD99 as essential and the fusion as desirable, so the case says
the classification *defines* Ewing sarcoma by the fusion, never that it *requires* a fusion test); ref. 5 — as checked for cmcr-655458; ref. 6 — the open-access PDF record
(J Clin Oncol 41(9):1774-1785, doi:10.1200/JCO.22.02224) and summaries (strong recommendation for monotherapy with an
antipseudomonal β-lactam, a fourth-generation cephalosporin or a carbapenem in high-risk febrile neutropenia; a good
practice statement to start empirical therapy as soon as possible in unstable patients); ref. 7 — PubMed record
20331465 (authors, journal, volume, issue, pages, DOI) and summaries of its risk table (ALL with white cells below
100 × 10⁹/L and LDH below twice the upper limit listed as intermediate risk); ref. 8 — as checked for cmcr-655458, with
the UK paediatric transfusion summary of its thresholds (platelets below 10 × 10⁹/L for most stable children, below 20
with sepsis or severe mucositis; haemoglobin 70 g/L for stable non-cyanotic children); ref. 9 — the journal's PDF
header and repository records (102(12):2086-2096, DOI; ALL-type, BFM-derived strategies efficacious in LBL); ref. 10
— bibliographic and abstract records (Blood 96(10):3381-3384; 546 patients; blast contamination of the CSF at the
diagnostic LP associated with worse event-free survival) — co-authors not confirmed; ref. 11 — PubMed 10964998 and
the DOI record; ref. 12 — the CCLG page itself, read on review (2026-11-14; "last updated January 2026": when
leukaemia or non-Hodgkin lymphoma is a consideration, corticosteroids must not be given before referral, as they may
partially treat the disease, make the diagnosis hard to confirm and risk tumour lysis syndrome).

### To verify

**Against the full source article (the source pass):**
* Every patient fact listed in "Clinical numbers check" and "Source and adaptation", word for word.
* The haemoglobin: the value and unit as printed (7.1 g/L, 7.1 g/dL or 71 g/L), and the rest of the admission blood
  count — neutrophils, the film description, reticulocytes.
* The other admission findings: heart rate, respiratory rate, blood pressure, lymph nodes, bone tenderness or swelling
  at the original sites, the neurological examination of the legs, weight and height.
* LDH, urate, potassium, phosphate, calcium, creatinine, clotting, blood cultures, CSF and chest imaging.
* The first illness: which bones were affected and biopsied, the imaging (X-ray, MRI, CT or bone scan) and whether
  "bone destruction" was an imaging or a pathology finding; whether a marrow examination was done at that time.
* The old immunohistochemistry: whether the CD3 positivity was in the tumour cells; the full panel (CD45, CD43, CD79a,
  PAX5, CD10, NKX2.2, desmin, myogenin…); whether TdT was not done or done and negative; whether EWSR1 FISH or
  RT-PCR was ever done, then or at the review.
* The six earlier courses: drugs and doses (cumulative anthracycline), dates, any radiotherapy or surgery, how the
  remission was assessed, and how long it lasted; what "再次发热" refers to.
* The review: which stains were positive in the old biopsy and which in the new marrow; the flow cytometry specimen
  and the size of the abnormal population; the marrow morphology wording (原始幼稚淋巴细胞).
* The regimen: its name, drugs and doses, the CNS status and intrathecal therapy, genetics, MRD, and the time from
  this admission to the start of treatment.
* The outcome after maintenance; who accompanied the child (to name the companion by relation).

**Guidance details not confirmed in this environment (web-search budget exhausted):**
* Ref. 2: the full author list and DOI; the per-tumour figures (the case quotes no figure).
* Ref. 7: the exact cell placement of ALL in the risk table (a 2010 Br J Haematol cohort quotes it as the case does:
  white cells below 100 × 10⁹/L with an LDH at least twice the upper limit is high risk) and the prophylaxis it
  recommends for intermediate risk.
* The hydration volume (about 3 L/m²/day, potassium-free) and allopurinol dose (about 10 mg/kg/day) in the
  intervention texts, against BSH 2015 (Jones et al., Br J Haematol 2015;169:661-671) or Coiffier et al. 2008.
* The red-cell and platelet volumes (10–15 mL/kg) against BSH 2016, and the platelet threshold BSH 2016 gives for a
  lumbar puncture in children (the case names no figure).
* Piperacillin–tazobactam: the BNFC entry for children 1 month–11 years (the case uses the UK SmPC regimen for
  neutropenic children, 80 mg/10 mg per kg every 6 hours, with a 4.5 g per-dose maximum from a UK children's hospital
  policy).
* That day 8 and day 33 are the response time points of BFM-type protocols (prednisone response on day 8, end of
  induction on day 33), as teaching point 5 says.
* The WHO-HAEM5 (2022) wording of the 25 % marrow convention for leukaemia versus lymphoma.
* The co-authors of ref. 10 and the third author onwards of ref. 6.
* `fig01`: its panels and whether its title fits once the image can be viewed.
* Ref. 4: the essential and desirable criteria for Ewing sarcoma in the book itself.

**For the clinician review (paediatric haemato-oncology and paediatric pathology):**
* Treating the fever of an undiagnosed leukaemia with an unknown neutrophil count as high-risk febrile neutropenia is
  the case's teaching (common practice); the 2023 guideline's recommendations address established febrile
  neutropenia, and the case cites it for the regimen only.
* `lp-intrathecal` is `critical: false`: an LP before platelet support or before the diagnosis is scored as a serious
  but recoverable error (the traumatic-tap risk of Gajjar 2000). Confirm that judgement.
* Dexamethasone is contraindicated only in `admission`; given in `diagnosis` before the LP it is not flagged,
  although it could clear blasts from the CSF before CNS staging.
* `red-cells` stops being contraindicated once the repeat count is ordered; no repeat value is recorded, so the case
  cannot judge a transfusion on it.
* Allopurinol is keyed while the LDH is unknown; an LDH at least twice the upper limit would make the tumour-lysis
  risk high, where the 2010 panel prefers rasburicase.
* The `ibuprofen` harm names no guidance (none was found for a child off treatment; CCLG's NSAID advice concerns
  children on treatment for solid tumours).

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- **Template defects replaced.** A spoiler-free title and summary; 25 history items in the relative's and the girl's
  voices (were 15 generic slots, ten of them "the source case does not provide that information"); six examination
  findings (were one); 14 investigations with phase-specific results and the haemoglobin kept as written (were four
  record reviews); three phases built on the learner's acts; option ids that name their content (were `review`,
  `same`, `correct-number`…).
- **Added.** 15 interventions (none in 1.0.0): the report's switch to ALL-type therapy, today's first-hours care
  (cultures and antibiotics, the repeat count, tumour-lysis prevention, the pathology review, the haemato-oncology
  referral) and six tempting wrong steps, three of them critical; five decisions (were three of three options); a
  rubric with two critical acts (the critical item was a decision taken after the corroborating records); four
  staff; six learning outcomes and teaching points; 40 matcher utterances; this facilitator guide.
- **Guidance cited:** WHO 2020 and 2022 classifications, the 2023 paediatric fever-and-neutropenia guideline, the 2010
  TLS consensus, BSH 2016 transfusion, EURO-LB02, SPIKES.
- **Independent review (2026-11-14), fixes within 1.1.0.** (1) *Guidance:* WHO 2020 defines Ewing sarcoma by a
  FET::ETS fusion but lists its molecular proof as desirable, not essential — the keyed feedback of decision 1, a
  distractor's feedback in decisions 1 and 3, a teaching point, the pathologist's brief and this guide no longer say
  the classification "needs" or "requires" a fusion test; the `mixed-phenotype` feedback no longer says MPAL needs both
  lineages on the same cells (one blast population or two separate ones, WHO 2022); learning outcome 2 cites the 2023
  guideline for the regimen it recommends; the more-than-25 % convention. (2) *Assessment validity:* in the select-all
  `first-hours` the English keys were exactly the three longest options (two distractors rewritten to the keys'
  length); the `working-diagnosis` key was the only hedged option (two distractors now carry the same kind of
  qualifier). (3) *Harms naming their guidance:* the steroid and induction harms and the steroid feedback cite the
  CCLG community care resource (2026), reference 12. (4) *Facts:* the summary and the admission phase no longer say she
  was "told" of the remission or "admitted again" (1.0.0: assessed as in complete remission); the English conclusion
  now states what the Chinese states (bone destruction, CD20 negative, CD79 partly positive, scattered petechiae, both
  legs). (5) *Spoilers:* three objective hints no longer point at the marrow, the lymphoblast or the change of
  diagnosis; the figure title says "may show", as the image has not been viewed. (6) *This guide:* the changelog in the
  standard's form, the case-check path, Lucas 2001's issue, and a clinician list under "To verify".

### 1.0.0 — 2026-10-28 — initial de-identified educational adaptation (template version)

- Generated from the collection template: four phases, 15 generic history slots, one examination finding, four
  record reviews, no interventions, three decisions of three options with role-named ids, and a critical item scored
  on a decision.

## Validation

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-44614/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-44614 --lang en                                                 # 68 steps, 6/6 objectives, 5/5 decisions, 40/40 utterances, 31/31 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-44614                                       # depth floor, do nothing 0, wrong first 55 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-44614:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-44614:"  # in-world demonstration, en + zh-CN
```

All five passed on 2026-11-13, and again on 2026-11-14 after the independent review's fixes (results above).

## 中文摘要

**病例概要：** 6岁女孩，一年十个月前左下肢和右上臂疼痛、肿胀、活动受限，外院骨活检为小圆细胞肿瘤（CD99、FLI-1、CD3阳性，
CD20阴性，没有TdT记录），按尤文肉瘤化疗6个疗程后评估为完全缓解。这次发热2周、双下肢疼痛、不能行走：体温38.6 ℃，贫血貌，散在
出血点，肝肋下3 cm、脾肋下2.5 cm；白细胞42.38×10⁹/L、淋巴细胞91%，血小板20×10⁹/L，血红蛋白记为7.1 g/L（与生命不相容，很可
能是单位或录入错误，原样保留）。骨髓原始及幼稚淋巴细胞84.5%，流式表达CD10、CD19、CD79a、HLA-DR、CD34；复核原骨活检和本次骨髓
TdT、CD99阳性，CD79部分阳性。报告诊断：被误诊为尤文肉瘤的B淋巴母细胞淋巴瘤，复发时广泛累及骨髓。改用儿童淋巴母细胞方案后第8天
外周血幼稚细胞为0，第33天完全缓解，报告时在维持治疗。

**学习目标：** 识别骨髓浸润并质疑旧诊断；把可疑白血病患儿的发热按发热伴中性粒细胞减少处理（2023年国际儿童指南）；安全处理不可信的
血红蛋白数值（BSH 2016）；说明CD99、FLI-1不能区分尤文肉瘤和淋巴母细胞淋巴瘤，需要TdT、系别标记和EWSR1/FET::ETS检测（WHO
2020）；按WHO 2022诊断B淋巴母细胞白血病/淋巴瘤并按急淋式方案计划治疗（EURO-LB02）；用SPIKES坦诚说明诊断的改变。

**关键决策：** ① 现在最可能是什么、下一步怎么诊断——骨髓穿刺加流式，同时复核原活检；② 最初几小时（多选）——先血培养再尽快用抗
假单胞菌β-内酰胺类，复查血常规核实血红蛋白，不含钾水化加别嘌醇；不用激素，不按7.1 g/L输血；③ 判定原肿瘤是被误作尤文肉瘤的B淋巴
母细胞淋巴瘤，现按B淋巴母细胞白血病处理；④ 现行儿童急淋方案：输血小板后腰穿并首剂鞘注，查遗传学和微小残留病，核对既往蒽环类剂
量；⑤ 坦诚说明诊断为什么改变，不作不实安慰、不指责、不回避。

**复盘要点：** 旧诊断只是工作标签；中性粒细胞不明时先按发热伴中性粒细胞减少处理；取标本前不用激素和化疗；不可信的数值先复查；
淋巴瘤还是白血病，治疗都是急淋式方案。待核实：血红蛋白原文数值和单位、CD3阳性的细胞、EWSR1检测、既往化疗方案、脑脊液、遗传学和
长期结局等（见上文“To verify”）。本稿尚未经执业医师审核，患者事实尚未对照原文全文核对。

**安全结果。** 按旧标签给尤文肉瘤二线化疗、入院阶段（取诊断标本前）用地塞米松或开始诱导化疗，均为`critical: true`：一旦发生，评估的
安全结果判为不通过；血小板升高前腰穿为高风险但`critical: false`。
