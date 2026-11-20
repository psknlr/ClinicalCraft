# cmcr-138892 — Left lower abdominal pain, fever and a rising white count · 81-year-old man

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (朱知远 / Zhu Zhiyuan) is a
> pseudonym; the attending (江医生 / Dr Jiang), the ward nurse (陆护士 / Nurse Lu) and the three consultants
> (孔医生 / Dr Kong, general surgery; 唐医生 / Dr Tang, pathology; 沈医生 / Dr Shen, haematology) are teaching roles. The case adapts one published
> clinicopathological case discussion; it is not medical advice.
> 导师指南，含剧透。患者为化名，医护人物为教学角色；本病例改编自一篇已发表的临床病例讨论，不构成医疗建议。

**Status of the facts.** Version 1.1.0 was re-authored from the facts recorded in version 1.0.0 (commit
`88ed0d2`), the only fact base available in the authoring environment. Those facts have **not yet been checked
against the full source article** (`extensions.sourceTextChecked: false`); the source pass follows when the
article text is available, and everything listed under "To verify" belongs to it.

## Case card

| | |
|---|---|
| id / version | `cmcr-138892` · `1.1.0` · CMCR additional collection (`cmcr-105`) |
| Source | 古丽米拉·达列力汗, 钦丹萍, 倪桂宝, 郑兰芝, 金素娟, 余建法, 黄宣. 第310例 腹腔孤立性占位—发热—白细胞持续升高. 中华医学杂志. 2014;94(6):467-469 |
| Setting / facility | Medical ward bed (`inpatient`) / `general-hospital`; theatre for the exploration phase |
| Difficulty / time | 4 / 5 · about 40 min (static clock; five phases, five decisions, 19 investigations, 15 interventions) |
| Specialty | Gastroenterology, general surgery, haematology, infectious disease (`gastroenterology`, `general-surgery`, `hematology`, `infectious-disease`) — the presenting disciplines; oncology and pathology, which name the answer, are left off the card |
| Languages | `zh-CN` (source language), `en` |
| Learner level | Final-year students and residents in internal medicine, gastroenterology and general surgery; useful for haematology and pathology trainees in the later phases |
| Review status | `editorial`, 2026-10-30 — AI-assisted teaching design with an editorial review against the cited guidance; **not yet reviewed by a licensed clinician**, and the patient facts are not yet checked against the full article. Have a gastroenterologist or general surgeon, a pathologist and a haematologist review it before teaching use |
| Phases | `admission` 入院：腹痛、发热不退 / Admission: pain and fever not settling → `work-up` 住院检查 / Work-up in hospital → `exploration` 手术探查 / Surgical exploration (theatre) → `pathology` 术后：病理与血象 / After the operation: pathology and blood counts (ward) → `outcome` 原报告记录的病程与转归 / Reported course and outcome — none learner-switchable |
| Content | 24 history items (7 required, 13 honest unknowns, 2 labelled teaching worries; the patient answers himself) · 6 examination findings · 19 investigations (3 record reviews; 12 with no result recorded in one or more phases, 2 of them staged "comes back at the next stage") · 15 interventions (5 contraindicated, 2 of them critical) · 6 objectives · 5 decisions (20 options) · 12 rubric items (11 deterministic, weight 31; 1 examiner-judged; 2 critical) · 5 staff · 6 learning outcomes · 6 teaching points · 46 test utterances |

## Learning outcomes

After the case the learner can:

1. Manage fever, localised left lower quadrant peritonism and a rising neutrophil count that outlast antimicrobial
   treatment before admission in an older man as a possible complicated intra-abdominal infection: screen with NEWS2 rather than
   qSOFA alone (SSC 2026), take cultures before IV cover of enteric Gram-negative and anaerobic bacteria (SIS 2024),
   and get contrast CT the same day (IDSA 2024).
2. Use colonoscopy and a small-bowel contrast study to place an abdominal mass inside or outside the bowel, and obtain
   tissue by image-guided core biopsy (or laparoscopy) rather than by cytology alone or an unplanned resection.
3. Treat an intraoperative frozen section as provisional and explain why, with the mesenteric root involved and
   disease widespread, the operation should take generous tissue and not an irreversible resection decided on the
   frozen reading (PSOGI/EURACAN 2021).
4. Judge a calretinin-positive, CEA-negative peritoneal tumour against the International Mesothelioma Interest Group
   2023 update — two mesothelial and two carcinoma markers, with BAP1 or MTAP immunostaining (or CDKN2A FISH) where
   malignancy is in doubt — and take an occupational asbestos history.
5. Accept a leukaemoid reaction behind a mature neutrophilia above 100 × 10⁹/L only by exclusion — chronic myeloid and
   chronic neutrophilic leukaemia (BCR::ABL1, CSF3R; WHO 5th edition, 2022), occult infection and drugs — without
   cytoreduction or blind antibiotic escalation (IDSA/SHEA 2016).
6. Use SPIKES to tell an 81-year-old man about a diagnosis of peritoneal mesothelioma and its uncertainty, weighing
   cytoreductive surgery (PSOGI/EURACAN 2021), systemic treatment and palliative care against his own priorities.

## Clinical summary (spoilers)

An 81-year-old man had dull left lower abdominal pain and fever; he first sought care three days after onset.
Another hospital considered a small-bowel tumour and a urinary infection. At the start he had frequency, urgency and
dysuria and felt cold, without rigors, diarrhoea or blood in his stools. Antimicrobial treatment before admission
eased the urinary symptoms; the pain and fever did not settle.

On admission his abdomen was distended, tender in the left lower quadrant with rebound but no guarding; no definite
mass was felt, and the left renal angle was tender to percussion. White cells rose from 28.8 to 33.3 × 10⁹/L, mainly
mature neutrophils. Imaging showed a mixed cystic and solid mass of about 7.1 × 6.3 × 9.9 cm in the left lower
abdomen, with blurred surrounding fat and fluid in the abdomen and pelvis; ultrasound showed vascularity. Colonoscopy
was unremarkable; a small-bowel contrast study showed extrinsic compression without leakage, in keeping with a mass
outside the bowel. Two blood cultures were negative, and the bone marrow showed active granulopoiesis without obvious
morphological abnormality.

At surgical exploration there was a mass at the root of the mesentery with widespread miliary nodules. The frozen
section suggested metastatic adenocarcinoma; the final histology with immunohistochemistry diagnosed **malignant
mesothelioma** (calretinin, CK18 and vimentin positive; CEA negative) — peritoneal, as 1.0.0's debrief puts it. Given
his condition and the surgical assessment, the mass was not completely removed; tissue was taken. His white count later
reached 113.7 × 10⁹/L, mainly neutrophils, and antibacterial treatment did not help; the team considered a
**leukaemoid reaction**. He then left hospital; his long-term outcome is unknown.

**Today's answer.** Treat the presentation first as a possible complicated intra-abdominal infection (NEWS2-based
screening, cultures before IV Gram-negative and anaerobic cover, contrast CT); obtain tissue by the least invasive
route; trust the paraffin report over the frozen section but complete the immunohistochemical panel to the IMIG
standard and take an asbestos history; prove a tumour-related leukaemoid reaction by excluding CML, chronic
neutrophilic leukaemia and occult infection, without cytoreduction or blind antibiotic escalation; and plan with him,
honestly, between systemic treatment and palliative-focused care.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires. The case shows
the recorded states only; no vital sign is recorded at any point, so none is shown, and every intervention's response
says what the case does and does not record.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | on admission (onset was three days before his first consultation; the interval to this admission is not recorded) | start | his history (incl. a labelled teaching worry), the abdominal examination, the first recorded count (28.8 × 10⁹/L), blood cultures and imaging ordered with "comes back at the next stage", unrecorded urine tests, CRP/procalcitonin and chemistry, decision `admission-plan`, the first-hours interventions |
| `work-up` | during the admission (no day recorded for any test) | `obj-history`, `obj-examine`, `obj-first-hours` complete — history, examination, the count read, decision 1 right, blood cultures sent, IV antibiotics given and imaging requested | the imaging report, colonoscopy, small-bowel study, the 33.3 × 10⁹/L count, two negative blood cultures, the marrow, unrecorded paracentesis, molecular tests, cytokines, tumour markers, chest CT and core biopsy, decision `mass-origin` |
| `exploration` | during the operation (`location`: operating theatre) | `obj-localise` complete — the work-up records read in `work-up`, decision 2 right and the core biopsy requested | the operative findings and frozen section (record review at the theatre's records terminal), decision `frozen-section`; he is under anaesthesia (`nonVerbalWhen: {phase: exploration}`) |
| `pathology` | after the operation (`location`: back to the ward) | `obj-theatre` complete — operative record read and decision 3 right | the operation note (no complete resection; tissue taken), the final pathology report, the 113.7 × 10⁹/L count, unrecorded further stains, BCR::ABL1/CSF3R, cytokines and chest CT, his questions (labelled teaching device), decisions `final-pathology` and `neutrophilia`, the care-planning interventions |
| `outcome` | later in the admission to his leaving hospital | all five decisions decided | the reported course and outcome record (leukaemoid reaction considered; left hospital; outcome unknown) |

The blood cultures and imaging ordered on admission answer "Sent; the result comes back at the next stage." and give
their recorded result once the case reaches `work-up`. The final pathology and the operative record exist only from
their phases (`availability.earliestPhase`); ordering the outcome record earlier shows an order-entry notice.

## Decisions and assessment

### Objectives (HUD chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-history` Hear how his illness has gone | presentation, onset, progression, urinary and bowel symptoms, care elsewhere asked |
| 2 | `obj-examine` Examine his abdomen and renal angles | inspection, tenderness, rebound, guarding, mass, renal-angle percussion |
| 3 | `obj-first-hours` Act in his first hours on the ward | admission count read; decision 1 right; blood cultures ordered; IV antibiotics given; imaging requested — so cultures, antibiotics and imaging all precede the imaging result |
| 4 | `obj-localise` Read the work-up and plan the diagnosis | imaging, colonoscopy, small-bowel study, repeat count, blood cultures and marrow read in `work-up`; decision 2 right; core biopsy requested |
| 5 | `obj-theatre` Advise when the first tissue result comes back | operative findings and frozen section read; decision 3 right |
| 6 | `obj-diagnosis` Weigh the pathology and the count, and plan with him | operation note, final pathology and latest count read; decisions 4 and 5 right; conversation with him arranged; outcome record read |

Titles and hints name no diagnosis and contain no option text; because the journal lists later titles early, no title
announces the operation or a disagreement between the pathology reports (hints show only for the current objective,
on request). Every
`completeWhen` uses only conditions that cannot become permanently false: a read in a phase that can be selected
again, or an act that can still be done.

### Decisions

| id | Opens after | Key | Distractors (why they tempt) |
|---|---|---|---|
| `admission-plan` | presentation, onset, progression, urinary symptoms and earlier care asked; all six findings examined; admission count read | `cultures-iv-cover-ct`: treat as a possible complicated abdominal infection — blood and urine cultures first, then IV Gram-negative and anaerobic cover, contrast CT today | `pyelonephritis-iv` (urinary symptoms + renal-angle tenderness; anchoring on the earlier UTI); `colonoscopy-first` (the outside hospital's "bowel tumour"; stop antibiotics, scope first — perforation risk with peritonism); `tumour-fever-steroid` (failed antibiotics → "tumour fever", dexamethasone) |
| `mass-origin` | imaging, colonoscopy and small-bowel study read in `work-up` | `core-biopsy-mdt`: extraintestinal mass — image-guided core biopsy of the solid part, diagnostic tap of the ascites, MDT | `explore-resect` (close to the report's route — the team did explore surgically — but letting a frozen section set the resection; near-miss); `fna-cytology` (least invasive, but too little for typing); `abscess-reimage` (two more weeks of antibiotics and re-imaging) |
| `frozen-section` | operative findings and frozen section read | `biopsies-no-resection`: generous biopsies for paraffin and immunostaining, fresh tissue for culture including TB, record the extent, no resection | `resect-debulk` (frozen "metastatic adenocarcinoma" → debulk); `single-biopsy-primary` (frozen is the diagnosis; one small piece, then hunt for a primary); `washings-close` (keep an 81-year-old's operation short; washings only) |
| `final-pathology` | final pathology read; decision 3 | `final-report-complete-panel`: the paraffin report outranks the frozen section and supports mesothelioma, but add a second mesothelial marker and carcinoma markers, expert review, asbestos history | `frozen-stands` (fresh tissue; CEA can be negative in GI adenocarcinoma); `two-stains-enough` (near-miss: calretinin + CEA settle it); `vimentin-sarcoma` (keratin + vimentin read as sarcoma) |
| `neutrophilia` | 113.7 × 10⁹/L count read in `pathology`; marrow and blood cultures read in `work-up`; decision 4 | `leukaemoid-by-exclusion`: probably a tumour-related leukaemoid reaction, proved by exclusion — film review, BCR::ABL1 and CSF3R, a renewed search for an undrained source, stop untargeted antibiotics, read it as a grave sign | `cml-cytoreduce` (count > 100 → CML, hydroxycarbamide now); `escalate-cover` (negative cultures don't exclude infection → carbapenem + antifungal); `gcsf-proven` (1.0.0's "G-CSF secretion is proven" made plausible) |

Every option has its own feedback (2–4 sentences naming the guidance, issuing body and year). Option ids name their
content. No key is the uniquely longest option of its decision in either locale (measured: in `admission-plan`,
`mass-origin` and `frozen-section` (zh) the key ties with a distractor; elsewhere a distractor is longer).

### Rubric (11 deterministic items, weight 31, + 1 examiner-judged)

| id | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history` | history | 2 | presentation, onset, pain site, progression, fever detail, urinary, bowel, earlier care, antimicrobials, regular medicines, allergies asked (the last two are unrecorded: asking is the competency) |
| `rb-examination` | examination | 2 | the six abdominal and renal-angle manoeuvres |
| `rb-investigations` | investigations | 2 | admission count read and urinalysis/urine culture ordered in `admission`; imaging, colonoscopy, small-bowel study, blood cultures and marrow read in `work-up` |
| `rb-first-hours` | management | 4 | **critical** — blood cultures ordered in `admission`, IV antibiotics given while indicated (in `admission` and after the cultures were ordered: `whenIndicated`), and imaging requested in `admission` |
| `rb-admission-plan` | diagnosis | 3 | decision 1 right first time; observations with NEWS2 arranged |
| `rb-tissue` | diagnosis | 4 | decisions 2 and 3 right first time; core biopsy requested in `work-up` |
| `rb-pathology` | diagnosis | 3 | decision 4 right first time; further immunostains ordered in `pathology`; asbestos asked |
| `rb-neutrophilia` | management | 3 | decision 5 right first time; BCR::ABL1/CSF3R ordered; antibiotic review done in `pathology` (`whenIndicated`) |
| `rb-care-plan` | management | 2 | MDT referral, conversation with him, palliative care involved |
| `rb-no-critical-harm` | safety | 4 | **critical** — no dexamethasone to bring down his fever (contraindicated throughout) and no resection of the mass; `scoredWhen` = decision 1 attempted or either act |
| `rb-no-harm` | safety | 2 | no hydroxycarbamide, no carbapenem-plus-antifungal escalation, no discharge on oral antibiotics; `scoredWhen` = decision 1 attempted or any of the three |
| `rb-communication` | communication | (judged) | SPIKES conversation with him about the diagnosis, its uncertainty and his priorities (see judge guidance) |

**Critical items are acts**, not decisions: `rb-first-hours` (the missed life-saving act — cultures, timely IV
antibiotics and imaging) and `rb-no-critical-harm` (the two dangerous errors). The timing of the first item is
enforced twice: the antibiotics count only when given in `admission` after the cultures were ordered
(`indicatedWhen`), and `work-up` — where the imaging result lives — opens only once cultures, antibiotics and the
imaging request are done (`obj-first-hours`).

### How wrong choices score (measured 2026-11-14 with core `assess`)

| Path | Score | Critical items missed | Safety outcome |
|---|---|---|---|
| Reference path (`solution`) | 31/31 (100 %) | none | passed |
| Do nothing (start, then try to finish) | 0 (finish refused: objectives incomplete) | `rb-first-hours` | passed |
| A wrong first answer at every decision, then the right one | 18/31 (58 %) | none | passed |
| One wrong first answer at decision 1, 4 or 5 (any distractor) | 28/31 (90 %) | none | passed |
| One wrong first answer at decision 2 or 3 (any distractor) | 27/31 (87 %) | none | passed |
| Reference + dexamethasone on admission | 27/31 (87 %) | `rb-no-critical-harm` | **failed** (`dexamethasone`) |
| Reference + resection of the mass in theatre | 27/31 (87 %) | `rb-no-critical-harm` | **failed** (`radical-resection`) |
| Reference + hydroxycarbamide, or carbapenem + antifungal, or discharge on oral antibiotics (each) | 29/31 (94 %) | none | passed (contraindicated act listed) |
| IV antibiotics given before the blood cultures were ordered | 27/31 (87 %) | `rb-first-hours` | passed |
| No antibiotics, or no imaging request, on admission | stays in `admission`; 15/31 (48 %) | `rb-first-hours` | passed |
| No core biopsy requested | stays in `work-up`; 21/31 (68 %) | none | passed |
| No MDT, conversation or palliative care | 29/31, and the case cannot finish until the conversation is arranged | none | passed |
| No NEWS2 / no BCR::ABL1 / no antibiotic review / no asbestos question / no further stains (each) | 28/31 (90 %) | none | passed |
| No urine tests | 29/31 (94 %) | none | passed |
| Dexamethasone after the final pathology has been read | 27/31 (87 %) | `rb-no-critical-harm` | **failed** (`dexamethasone`: infection is still not excluded, and a steroid raises the neutrophil count the learner is working up) |

Contraindicated acts are listed as safety events in every debrief. The other interventions are indicated in their
phases (`news2-obs`, `paracetamol` and `iv-access` throughout; `surgical-review` in admission and work-up; the
consults and the antibiotic review later) or neutral.

**Safety outcome.** `dexamethasone` and `radical-resection` are `critical: true`. Dexamethasone given to bring down his
fever is contraindicated throughout (`contraindicatedWhen: always`): before the tissue diagnosis it can mask an
abdominal infection and leave a lymphoma (still in the differential) undiagnosable; after it, infection has still not
been excluded, and a steroid raises the very neutrophil count decision 5 asks the learner to explain. A resection at
the mesenteric root decided on a frozen section is an irreversible, dangerous operation that cannot clear widespread
disease. Either fails the assessment's safety outcome (`safety.passed: false`) whatever the score.
`hydroxycarbamide`, `broad-escalation` and `discharge-oral` are contraindicated but `critical: false` — recoverable
misjudgements (`risk: "moderate"`) that cost marks in `rb-no-harm`.

## Reference path (`solution`)

91 steps: start → the admission history (22 questions: the recorded presentation, onset, pain, course, fever,
urinary, bowel and earlier-care items, and the unrecorded ones — pain spread and severity, nausea, weight and sweats,
regular medicines, allergies, past and surgical history, TB, smoking and alcohol, family history, function — which
teach what to ask; the worry) → the six findings → IV access and NEWS2 observations → count (read), blood cultures,
urine tests, CRP/procalcitonin and chemistry (sent; no results recorded) → decision 1 → IV antibiotics, paracetamol,
surgical review → imaging requested (this opens `work-up`) → imaging, repeat count, blood cultures, colonoscopy,
small-bowel study, marrow, paracentesis (no result) → haematology review, MDT referral → decision 2 → core biopsy
requested (this opens `exploration`) → operative record → decision 3 (opens `pathology`) → operation note, final
pathology, latest count → asbestos question → further stains → decision 4 → BCR::ABL1/CSF3R, cytokines, chest CT
(no results) → antibiotic review → his questions, the conversation, palliative care → decision 5 (opens `outcome`) →
outcome record → finish. It scores 31/31 with no contraindicated act, in clinical and in-world mode, in both
languages. It does not order the neutral tumour markers.

## Clinical numbers check

Every patient value below comes from version 1.0.0 (field in brackets) and keeps its unit; none is new. The check
against the full article is pending.

| Value | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| Age 81, male | `patient` | `patient`, title, triage note |
| Onset three days before the first consultation | history `onset` | history `onset`; decision 1 prompt; `admission` description |
| Small-bowel tumour and urinary infection considered (zh: by another hospital, 外院) | history `prior` | history `prior-care` |
| Antimicrobial treatment before admission (agents not recorded) | history `medications` | history `antimicrobials`; triage note |
| Urinary symptoms eased with treatment; pain and fever persisted | history `progression` | history `progression`; triage note; summary |
| Frequency, urgency, dysuria and chilliness; no rigors, diarrhoea or bloody stools | history `associated` | `urinary`, `fever-detail`, `bowel` |
| Dull left lower abdominal pain and fever | `openingLine`, history `presentation` | `presentation`, `pain-site`, chief complaint, opening line |
| Distended abdomen; left lower quadrant tenderness and rebound; no guarding | `exam-1` | exam `abdomen-inspect`, `abdomen-tenderness`, `abdomen-rebound`, `abdomen-guarding` |
| No definite mass; left renal-angle (zh: renal-area percussion) tenderness | `exam-2` | exam `abdomen-mass`, `renal-angle` |
| White cells 28.8 → 33.3 × 10⁹/L, mainly mature neutrophils | `blood` (workup) | `fbc` (`admission`: 28.8; `work-up`: 33.3 with the neutrophil description) |
| Marrow: active granulopoiesis without obvious atypia | `blood` | `marrow` (`work-up`) |
| Two blood cultures negative | `blood` | `blood-cultures` (`work-up`) |
| Mixed cystic/solid mass about 7.1 × 6.3 × 9.9 cm, blurred surrounding fat, abdominopelvic fluid; vascularity on (Doppler) ultrasound | `imaging` | `abdo-imaging` (`work-up`); decision 2 prompt |
| Colonoscopy unremarkable | `bowel` | `colonoscopy` (`work-up`) |
| Small-bowel contrast: extrinsic compression, no leak, supporting an extraintestinal mass | `bowel` | `small-bowel-study` (`work-up`) |
| Mesenteric-root mass with widespread (zh: miliary) nodules; frozen section suggested metastatic adenocarcinoma | `pathology` | `exploration` (`exploration`); decision 3 prompt |
| Final histology/immunophenotype: malignant mesothelioma; calretinin, CK18, vimentin positive; CEA negative | `pathology` | `final-pathology` (`pathology`) values; decision 4 prompt |
| Complete resection not performed after clinical and surgical assessment; tissue taken | `outcome` | `exploration` (`pathology`: operation note); `outcome` |
| White cells later 113.7 × 10⁹/L, mainly neutrophils, despite antimicrobials | `outcome` | `fbc` (`pathology`); decision 5 prompt |
| Leukaemoid reaction considered by the team | `outcome` | `outcome` only (the answer to decision 5) |
| Left hospital; long-term outcome unknown | `outcome` | `outcome` |
| "Peritoneal mesothelioma" | `debrief.conclusion` | `outcome` ("malignant (peritoneal) mesothelioma"), debrief |

**Reference ranges.** None is recorded: every value carries "reference range not recorded". The white counts are
flagged H, H and HH (1.0.0 calls the rise "leukocytosis" and the last value "extreme"); the immunostains carry
positive/negative as text values.

**Derived values (facilitator orientation only; not shown to learners).**
* White cells +4.5 × 10⁹/L (+15.6 %) from 28.8 to 33.3, then +80.4 × 10⁹/L to 113.7 — 3.4 times the second count
  and about 3.9 times the first. No differential is recorded, so no absolute neutrophil count can be calculated.
* The commonly used leukaemoid threshold (> 50 × 10⁹/L) is exceeded only by the last count; the first two are a
  neutrophilic leucocytosis.
* Mass volume as an ellipsoid ≈ π/6 × 7.1 × 6.3 × 9.9 ≈ 232 cm³; its longest diameter, 9.9 cm, is the "almost
  10 cm" of the key reasoning — notable because no definite mass was felt in a distended abdomen.
* No weight, height or renal function is recorded, so every dose in the case is a formula or a standard adult dose
  "adjusted to renal function"; paracetamol carries a 1 g preset (`doseSpec`) and states the < 50 kg reduction.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "An 81-year-old with a fever that would not settle and a count that kept climbing — how did that
   feel to manage?"
2. **Description** — "Take me through what you did in his first hours on the ward, and in what order."
3. **Analysis**
   * "His urinary symptoms eased but the pain and fever did not. What did that tell you about where the problem was?"
   * "Why blood cultures before the antibiotics — and how much weight do two negative cultures carry in a man who had
     already had antimicrobials?"
   * "A mass of almost 10 cm that nobody could feel: what did the normal colonoscopy and the small-bowel study add?"
   * "Why a core biopsy rather than fine-needle cytology or an operation — and what did the report's team do?"
   * "The surgeon calls with 'metastatic adenocarcinoma' on frozen section. What do you need from the operation, and
     what must it not do?"
   * "Calretinin positive, CEA negative, CK18 and vimentin positive: is that panel complete by today's standard? What
     would you add, and why does his work history matter?"
   * "The count reached 113.7 × 10⁹/L on antibiotics. What had to be excluded before calling it a leukaemoid reaction,
     and what would you not do to the count itself?"
   * "How did you open the conversation with him, and what choices did you set out?"
4. **Summary** — "What will you do first the next time an older patient's fever and abdominal pain outlast a course
   of antibiotics?"

### Common learner errors and how the case surfaces them

| Error | What the case does | Where it scores |
|---|---|---|
| Anchoring on the earlier urinary infection | `pyelonephritis-iv` distractor; `discharge-oral` contraindicated | `rb-admission-plan`, `rb-no-harm` |
| Antibiotics before cultures, or no imaging on admission | `iv-antibiotics` counts only after cultures are ordered in `admission`; `work-up` waits for cultures, antibiotics and the imaging request | `rb-first-hours` (critical) |
| Colonoscopy first while peritonism is unexplained | `colonoscopy-first` distractor (WSES 2020) | `rb-admission-plan` |
| "Tumour fever" and dexamethasone to bring the temperature down | `tumour-fever-steroid` distractor; `dexamethasone` contraindicated throughout, critical | `rb-admission-plan`, `rb-no-critical-harm` |
| Fearing a carbapenem is always wrong, or escalating for the count | an empirical carbapenem on admission counts as IV antibiotics (`iv-antibiotics` accepts meropenem or ertapenem); a carbapenem plus an antifungal later is the `broad-escalation` trap | `rb-first-hours`, `rb-no-harm` |
| Cytology alone, or two more weeks of antibiotics | `fna-cytology`, `abscess-reimage` distractors | `rb-tissue` |
| Resecting on a frozen section | `resect-debulk` distractor; `radical-resection` contraindicated, critical | `rb-tissue`, `rb-no-critical-harm` |
| Trusting the frozen section over the paraffin report, or accepting a two-marker panel | `frozen-stands`, `two-stains-enough` distractors; further stains orderable (no result recorded) | `rb-pathology` |
| Reading keratin + vimentin as sarcoma | `vimentin-sarcoma` distractor | `rb-pathology` |
| Treating the count: hydroxycarbamide / "CML" | `cml-cytoreduce` distractor; `hydroxycarbamide` contraindicated | `rb-neutrophilia`, `rb-no-harm` |
| Escalating antibiotics for the count alone | `escalate-cover` distractor; `broad-escalation` contraindicated | `rb-neutrophilia`, `rb-no-harm` |
| Calling G-CSF secretion proven | `gcsf-proven` distractor (1.0.0's template distractor made plausible) | `rb-neutrophilia` |
| Quoting survival figures or deciding for him | judge guidance | communication (judged) |

## Embodied mode

* **Where he is.** A ward bed in the general hospital (`inpatient`), lying. Contrast imaging (`ct`), colonoscopy
  (`endoscopy`) and the small-bowel study (`fluoroscopy`) are provider studies: in in-world mode he is taken to the CT
  room, the endoscopy suite and the fluoroscopy room. The paracentesis is a bedside procedure with a portable
  ultrasound (`performedAt: "bedside"`). The `exploration` phase moves him to theatre (`location: {roomKind:
  "operating-room"}`); the `pathology` phase brings him back to a ward bed (`location: {setting: "inpatient"}`).
* **Records.** The operative record, the final pathology report and the outcome record are record reviews
  (`performedAt: "records"`, `requires: ["records"]`, risk none), read at a records terminal (theatre has one) or at
  the bedside.
* **IV access** is a nursing procedure (`iv-access`), placed before the first IV item; it draws the bloods. Laboratory,
  microbiology, marrow, molecular and pathology samples are taken at the patient; results are read at a records
  terminal or the bedside.
* **He speaks for himself** (81, conscious): no companion. During `exploration` he is under anaesthesia
  (`nonVerbalWhen: {phase: "exploration"}`, reason "under anaesthesia in theatre for the exploration"), so nobody answers
  history there; the reference path asks nothing in theatre.
* **Staff.** The attending (Socratic, PEARLS debrief), the ward nurse (ISBAR handover; says there is nothing recorded
  to report when asked for numbers the case does not hold), and three consultants: Dr Kong, general surgery (source
  control, the operative findings once read; he phones from theatre with the frozen section and asks for the learner's
  view without answering for them), Dr Tang, pathology, and Dr Shen, haematology. None reveals the diagnosis.
* **Scope of practice.** IV access and the NEWS2 observations are nursing scope; the antibiotic review and the
  conversation with him are a doctor's acts; drugs follow their kind; referrals are consults. The resection requires the
  theatre (`surgery`) and is a trap only.
* **Capability check.** Every test and intervention of the case exists in `general-hospital` (`caseCapabilityGaps`
  is empty): CT, endoscopy, fluoroscopy, ultrasound, cytology, histopathology, molecular, the laboratories, records,
  medications, IV access and theatre. Nothing had to be modelled as a transfer or a referral.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-138892:"` passes: the offline demonstration finishes in-world
  in en and zh-CN with every objective done and the clinical score.

## Source and adaptation (fidelity limits)

**From the facts of version 1.0.0 (kept, reorganised into phases and lay speech, not yet checked against the
article).** Age and sex; onset three days before the first consultation; another hospital's impressions of a
small-bowel tumour and a urinary infection; antimicrobial treatment before admission, after which the urinary symptoms
eased while the pain and fever persisted; the early frequency, urgency, dysuria and chilliness without rigors,
diarrhoea or bloody stools; the two examination findings (split into six manoeuvres); the counts 28.8 and 33.3 × 10⁹/L
with mature neutrophils; the imaging summary; colonoscopy; the small-bowel study; the marrow; the two negative blood
cultures; the operative findings and frozen section; the final histology with four immunostains; incomplete removal;
the 113.7 × 10⁹/L count despite antimicrobials; the team's consideration of a leukaemoid reaction; his leaving hospital
with the long-term outcome unknown.

**Moved to the phase where it is true.** 1.0.0 showed all work-up and pathology records at once and kept the
113.7 × 10⁹/L count and "antibacterial treatment ineffective" in the outcome record. Now the first count is an
admission result, the second a work-up result, the operative findings and the final pathology their own phases, and
the 113.7 × 10⁹/L count is shown in the post-operative phase (its timing relative to the operation is not recorded, and its date says so), so the learner acts on each before the outcome opens. The team's
leukaemoid interpretation and his leaving hospital stay in the outcome record.

**Adapted for teaching (labelled).** All dialogue; the two worries (`concerns`, `concerns-now`: "Teaching device
(ICE)", adding no clinical fact; his "just tell me straight" shapes the SPIKES conversation, not the clinical record);
the staff; the surgeon's call from theatre (a staging of the frozen-section decision); the phase wording; decisions,
options, feedback, interventions, rubric and teaching points; unrecorded tests offered with "No result is recorded for
this test."; the staged "comes back at the next stage" placeholders; the anaesthesia narration in theatre.

**Contradictions and ambiguities kept, not resolved.**
* 1.0.0's Chinese text says another hospital (外院) considered the small-bowel tumour and urinary infection; its English
  says only "initially considered". The case keeps "another hospital" (the source-language reading) and the README
  lists it to verify.
* The Chinese records "widespread miliary nodules" (广泛粟粒结节) and left renal-area percussion tenderness (左肾区叩痛);
  the English had "widespread nodules" and "renal-angle tenderness". The case uses the fuller Chinese readings in both
  languages.
* The pathology says "malignant mesothelioma"; 1.0.0's debrief says "peritoneal mesothelioma". The outcome record says
  "malignant (peritoneal) mesothelioma".
* The day and place of each count are not recorded, nor whether 28.8 × 10⁹/L was measured here or elsewhere; the first
  result is dated "the first recorded count (when and where it was taken is not recorded)". "Later" for the
  113.7 × 10⁹/L count does not say how it relates to the operation; the result is placed after the operation, where
  1.0.0's outcome text puts it, with a note.
* 1.0.0's mention of "mainly mature neutrophils" describes the rise, not one sample; the description is attached to the
  33.3 × 10⁹/L result with a note. The 113.7 × 10⁹/L count is "mainly neutrophils" (no "mature").
* The imaging summary does not say which modality showed each finding except the vascularity on ultrasound; the order
  is named "Abdominal and pelvic imaging (CT, ultrasound)" and its result carries a note.
* 1.0.0's key reasoning refers to "the source's old nm-23 interpretation" without a result; the case records no nm23
  result and the pathologist explains that such markers are not part of current criteria.

**What stays unknown (1.0.0 records none of it).** Vital signs and temperature readings; weight; past and surgical
history; regular medicines; allergies; smoking, alcohol, family history and function; occupation and asbestos exposure;
the antimicrobials used; urinalysis, CRP, procalcitonin, chemistry and tumour markers; chest imaging; ascitic fluid;
whether the exploration was laparoscopic or open; the histological subtype, further stains and proliferation index;
cytokine and clonality studies; treatment after the diagnosis; how and why he left; the outcome.

**Survey findings addressed (governance; no case audit or critic note named this case).** The review notes no longer
claim that "each source case was read and checked" (§6.6 wording; `authorChecks` dropped; `sourceTextSha256` removed
until the source pass); the README no longer says both that images await privacy review and that three are approved
(the three approved figures are attached as debrief assets, retitled); British "leucocytosis"/"leukaemoid" replace
"leukocytosis"/"leukemoid"; the title ends "· 81-year-old man". Template defects of the 105 (generic slots, three
straw-man decisions, no interventions, hindsight critical item, role-named option ids, length cue, authoring language
in the patient's mouth) are all replaced.

**Privacy.** Pseudonym unique in the collection; no hospital, city, date or identifying detail; times are relative
("three days before the first consultation", "after the operation"). Authors' names appear only in the citation.

**Media.** `fig01`, `fig03` and `fig04` are approved in `scripts/cmcr-105-media-review.json` and kept as debrief assets,
not attached to any result (a composite can show later findings); `fig02` (withheld there) is not used.

## Matcher notes

* 46 `extensions.testUtterances` (27 zh-CN, 19 en), written as a learner would type them; none equals a keyword or a
  canonical question; 3 look-alike negatives (the weather, the car park twice). Every required item and the phase twin
  `concerns-now` has a paraphrase; `cases verify` passes 46/46 with no extra selections.
* The review's probe (2026-11-14) found plain questions that reached nothing or the wrong item — "What brings you in
  today?", "Do you have a fever?", "Where does it hurt?", "肚子哪里痛？" (answered as pain spread), "What do you do for a
  living?", "Who lives with you at home?" — and "Do you feel tired?" answered with the chills. Keywords were added
  (`bringsyouin`, `whatbringsyou`, `fever`/`发烧`/`发热`, `wheredoesithurt`, `哪里痛`, `foraliving`, `livewithyou`,
  `tired`/`乏力` under the unrecorded `constitutional` item), duration words are excluded from `fever-detail` so
  "发烧几天了？" stays with `onset`, and seven of these questions are now test utterances.
* Orders: a bare carbapenem ("IV meropenem", "美罗培南", "ertapenem") is an empirical antibiotic (`iv-antibiotics`);
  only an antifungal or an escalation ("switch to meropenem and add fluconazole", "escalate to meropenem", "升级抗生素")
  reaches the `broad-escalation` trap; "antibiotic review" reaches `antibiotic-review`, not a new course; "leukapheresis"
  no longer maps to hydroxycarbamide.
* English keywords of three or more words are written run together where they would otherwise reduce to one token
  (`broughtyouin`, `whendiditstart`, `howmanydays`, `outoften`, `didithelp`, `offyourfood`, `whatdidtheysay`,
  `whereithurts`, `liketoknow`). `home-function` had "day to day", which the probe showed matching any "days" question at
  1.0 — now `daytoday`.
* Exclusions keep neighbours apart: `onset` excludes antibiotic and medicine words (they go to `antimicrobials`);
  `antimicrobials` excludes regular, allergy and steroid words; `regular-meds` excludes antibiotics and allergy;
  `pmh` excludes family and TB words; `family-history` excludes TB; `presentation` excludes "other hospital";
  `pain-site` excludes spread and severity words; `progression` excludes drug-name questions.
* Phase twins: `concerns-now` (pathology, outcome) supersedes `concerns` (admission, work-up). Present-tense items
  (`presentation`, `progression`, `fever-detail`) are limited to `admission` and `work-up`.

## References

1. 古丽米拉·达列力汗, 钦丹萍, 倪桂宝, 郑兰芝, 金素娟, 余建法, 黄宣. 第310例 腹腔孤立性占位—发热—白细胞持续升高. 中华医学杂志.
   2014;94(6):467-469. doi:10.3760/cma.j.issn.0376-2491.2014.06.018. Available from: https://rs.yiigle.com/cmaid/138892
2. Prescott HC, Antonelli M, Alhazzani W, et al. Surviving Sepsis Campaign: international guidelines for management of
   sepsis and septic shock 2026. Crit Care Med. 2026. doi:10.1097/CCM.0000000000007075
3. Huston JM, Barie PS, Dellinger EP, et al. The Surgical Infection Society guidelines on the management of
   intra-abdominal infection: 2024 update. Surg Infect (Larchmt). 2024;25(6):419-435. doi:10.1089/sur.2024.137
4. Bonomo RA, Chow AW, Edwards MS, et al. 2024 clinical practice guideline update by the Infectious Diseases Society of
   America on complicated intra-abdominal infections: risk assessment, diagnostic imaging, and microbiological
   evaluation in adults, children, and pregnant people. Clin Infect Dis. 2024;79(Suppl 3):S81-S87. doi:10.1093/cid/ciae346
5. Sartelli M, Weber DG, Kluger Y, et al. 2020 update of the WSES guidelines for the management of acute colonic
   diverticulitis in the emergency setting. World J Emerg Surg. 2020;15(1):32. doi:10.1186/s13017-020-00313-4
6. Kusamura S, Kepenekian V, Villeneuve L, et al. Peritoneal mesothelioma: PSOGI/EURACAN clinical practice guidelines
   for diagnosis, treatment and follow-up. Eur J Surg Oncol. 2021;47(1):36-59. doi:10.1016/j.ejso.2020.02.011
7. Husain AN, Chapel DB, Attanoos R, et al. Guidelines for pathologic diagnosis of mesothelioma: 2023 update of the
   consensus statement from the International Mesothelioma Interest Group. Arch Pathol Lab Med. 2024;148(11):1251-1271.
   doi:10.5858/arpa.2023-0304-RA
8. Khoury JD, Solary E, Abla O, et al. The 5th edition of the World Health Organization Classification of
   Haematolymphoid Tumours: Myeloid and Histiocytic/Dendritic Neoplasms. Leukemia. 2022;36(7):1703-1719.
9. Barlam TF, Cosgrove SE, Abbo LM, et al. Implementing an antibiotic stewardship program: guidelines by the Infectious
   Diseases Society of America and the Society for Healthcare Epidemiology of America. Clin Infect Dis.
   2016;62(10):e51-e77.
10. 中华人民共和国卫生部. 糖皮质激素类药物临床应用指导原则. 卫办医政发〔2011〕23号. 2011.
11. 国家卫生健康委员会, 人力资源社会保障部, 国家疾病预防控制局, 中华全国总工会. 职业病分类和目录. 国卫职健发〔2024〕39号. 2024.
12. Baile WF, Buckman R, Lenzi R, Glober G, Beale EA, Kudelka AP. SPIKES—a six-step protocol for delivering bad news:
    application to the patient with cancer. Oncologist. 2000;5(4):302-311. doi:10.1634/theoncologist.5-4-302

**Checked online in the independent review (2026-11-14).** SSC 2026 (the SCCM guideline page: published March 2026;
NEWS, NEWS2, MEWS or SIRS preferred over qSOFA as a single screening tool). SIS 2024 (PubMed record and a published
summary of its recommendations: metronidazole as the preferred anti-anaerobic partner in combinations; source control
within 12 hours, or within 6 hours in higher-risk patients with septic shock; no empirical antifungal therapy in
lower-risk patients) — it replaces the 2017 guideline 1.1.0 first cited. IDSA 2024 (the IDSA guideline page and PubMed:
CT as the first imaging for a suspected diverticulitis or abscess in adults; blood cultures when a raised temperature
comes with hypotension, tachypnoea or delirium, or resistant organisms are a concern) — 1.1.0 had attributed "contrast
CT the same day" to SIS 2017, whose scope (risk assessment, source control, antimicrobial therapy) does not include
imaging. WSES 2020 (full text: contrast-enhanced CT as the imaging of first choice, 2B; colonic evaluation 4–6 weeks
after a diverticular abscess treated without an operation). PSOGI/EURACAN 2021 (guideline text: Recommendation 2 —
tissue from a core needle biopsy or exploratory laparoscopy is mandatory rather than effusion cytology or fine-needle
material, I-A; expert pathology review and a specialised MDT mandatory; CRS-HIPEC only with resectable disease, fitness
for a major operation and a specialised centre; massive small-bowel serosal involvement an absolute contraindication).
IMIG 2023 update (PubMed record and summaries: an immunopanel of two mesothelial and two epithelial markers is generally
advisable; BAP1 and MTAP immunostains and CDKN2A FISH separate benign from malignant proliferations) — it supersedes
the 2017 update 1.1.0 first cited. The occupational-disease catalogue (gov.cn: 国卫职健发〔2024〕39号, issued
11 December 2024, in force from 1 August 2025, replacing the 2013 catalogue; category IX, item 1 "石棉所致肺癌、间皮瘤").
The DOIs of refs. 3–7 come from their PubMed or PMC records. **Not confirmed online:** the exact sentence of the 2011
glucocorticoid principles (ref. 10), and a 2023 edition by the Chinese Society of Endocrinology exists; both stay under
"To verify".

### To verify

**Against the full source article (the source pass):**
* Every patient fact listed under "Clinical numbers check", word for word, including whether "another hospital"
  (外院) and "miliary" (粟粒) are the article's words.
* Vital signs and temperature readings on admission and later; his weight.
* The full blood panels with each count (haemoglobin, platelets, differential, any immature cells or blasts), the day
  and place of the 28.8, 33.3 and 113.7 × 10⁹/L counts, and whether 113.7 × 10⁹/L came before or after the operation.
* Urinalysis and urine culture, CRP/procalcitonin, renal and liver function, LDH, serum tumour markers.
* The imaging: which modality (CT, ultrasound, MRI) gave each finding, enhancement, the ascites, any chest imaging.
* The antimicrobials before and during the admission (agents, doses, duration), whether and when they were stopped,
  and when the blood cultures were taken relative to them.
* The exploration: laparoscopic or open, the distribution of the nodules, the fluid, and what "因病情及手术评估" (his
  condition and the surgical assessment) refers to.
* The final pathology: histological subtype, the full immunohistochemical panel (WT1, D2-40, CK5/6, BAP1 and any
  carcinoma markers beyond CEA), proliferation index, and the nm23 stain with the article's interpretation.
* Any G-CSF or IL-6 measurement, karyotype, BCR::ABL1, CSF3R or leucocyte alkaline phosphatase score.
* Occupation and asbestos exposure, past history, regular medicines (steroids, G-CSF), allergies.
* Treatment after the diagnosis, how he left hospital (discharge, self-discharge, transfer) and any follow-up.
* `fig01`, `fig03`, `fig04`: what each shows, descriptive titles, and whether one can be attached to a result.

**Guidance details:**
* 糖皮质激素类药物临床应用指导原则 (ref. 10): the sentence that names using glucocorticoids purely to reduce a fever or
  relieve pain as misuse, the document number (卫办医政发〔2011〕23号), and whether the 2023 edition (中华医学会内分泌学分会,
  中国内分泌代谢病专科联盟) keeps it — if it does, cite the 2023 edition in the harm and feedback texts.
* SIS 2024 (ref. 3): its definition of higher-risk patients and its empirical regimens, against the `iv-antibiotics`
  dose text (piperacillin–tazobactam; a carbapenem where resistant organisms are likely).
* IDSA 2024 (ref. 4): whether to cite the section papers on diverticulitis and abscess imaging (doi:10.1093/cid/ciae350,
  doi:10.1093/cid/ciae351) beside the overview.
* IMIG 2023 update (ref. 7): the exact wording of the two-plus-two panel and of BAP1, MTAP and CDKN2A, against the full
  text (only the abstract and secondary summaries could be read).
* WHO 5th edition myeloid (ref. 8): the chronic neutrophilic leukaemia criteria (CSF3R) and the DOI recorded in
  `cmcr-33666` (10.1038/s41375-022-01613-1), which no review has confirmed.
* IDSA/SHEA 2016 (ref. 9): the recommendations the feedback relies on (reviewing empirical courses, de-escalation,
  avoiding untargeted broad-spectrum therapy); DOI; whether a newer stewardship guideline replaces it.
* The leukaemoid definition (> 50 × 10⁹/L) and the statement that tumour-related extreme leucocytosis usually signals
  a poor prognosis (e.g. Granger and Kontoyiannis, Cancer 2009) before any figure is quoted.
* Paracetamol dosing for older adults in the current BNF / 中国药典 临床用药须知.

**For the specialty reviewers (a licensed clinician of each should confirm):**
* General surgery / gastroenterology: the admission key (cultures, IV Gram-negative and anaerobic cover, contrast CT the
  same day); that an empirical carbapenem on admission counts as acceptable cover for this 81-year-old after failed
  treatment; the image-guided core biopsy as the reference route to tissue (laparoscopy where there is no safe window);
  the theatre key (generous biopsies, fresh tissue for culture including TB, no resection).
* Pathology: the stains to add for a peritoneal tumour in a man (D2-40 or CK5/6; claudin-4, MOC-31 or Ber-EP4; BAP1 or
  MTAP) and the place of the frozen section.
* Haematology: the exclusion work-up before calling the leucocytosis a leukaemoid reaction, and stopping untargeted
  antibiotics while a source is sought again.
* Safety outcome: whether `dexamethasone` should stay `critical` after the final pathology (the review made it
  contraindicated throughout: infection not excluded, and a steroid raises the neutrophil count under work-up).

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Story and phases.** `initial` / `workup` / `followup` → `admission` → `work-up` → `exploration` (theatre) →
  `pathology` (ward) → `outcome`, each gated on the objectives before it; the outcome after all five decisions. The
  second count, the operation and the 113.7 × 10⁹/L count became phases the learner acts in.
* **Decisions.** 3 → 5, each with 4 options and its own guideline-based feedback: the admission plan, the route to
  tissue, the frozen section, the final pathology, the extreme neutrophilia. Option ids `supported` / `alternative-N`
  → content ids; no key is the uniquely longest option. The appraisal question "What does later extreme leukocytosis
  establish?" (critical, read only from the outcome record) is gone; its content now sits in decision 5, which opens
  before the outcome.
* **Interventions.** 0 → 15: IV access, NEWS2 observations, IV antibiotics (in time: after cultures, in
  `admission`), paracetamol, surgical, haematology and MDT referrals, antibiotic review, palliative care, the
  conversation with him, and five contraindicated traps with harm texts (dexamethasone and resection, both critical;
  hydroxycarbamide, carbapenem-plus-antifungal escalation, discharge on oral antibiotics).
* **History and examination.** 15 template slots (nine "the source notes do not provide that information" answers,
  generic "red flags", "baseline" and "exposure" items) → 24 items in his own voice (7 required, 13 honest unknowns in
  lay words, 2 labelled worries); 2 bundled findings → 6 manoeuvres; `examNotRecorded` says "This case does not record
  this examination."
* **Investigations.** 5 bundled records → 19 single tests: structured counts ("reference range not recorded"),
  immunostains as values, staged cultures and imaging, three record reviews, and honest "No result is recorded for
  this test." entries for what a learner would order (urine, CRP, chemistry, BCR::ABL1/CSF3R, cytokines, markers,
  paracentesis, core biopsy, further stains, chest CT).
* **Assessment.** The single critical item on an appraisal decision → 2 critical acts (`rb-first-hours`,
  `rb-no-critical-harm` with `scoredWhen`), 12 rubric items with first-try scoring and a SPIKES communication item
  written for him. Do nothing scores 0; a wrong first answer everywhere scores 58 %.
* **Teaching layer.** 6 learning outcomes, 5 key reasoning steps, 6 teaching points with guidance and year, 8
  unknowns, 5 staff (attending, nurse, general surgeon, pathologist, haematologist), 12 Vancouver references, editorial
  review status with ten guidelines and the §6.6 notes.
* **Card and voice.** Title "· 81-year-old man"; spoiler-free summary distinct from the triage note; specialty without
  `oncology` (the answer) and with general surgery and infectious disease; 4 patient tags; persona fields written as
  actor briefs; no authoring language in anything he says.
* **Corpus and schema.** 46 paraphrased utterances with negatives; extensions unified (`sourceDoi`, `doiVerifiedAt`,
  `sourceTextChecked: false`; `authorChecks` and `sourceTextSha256` dropped).
* **Media.** `fig01`, `fig03`, `fig04` kept (approved, unattached), retitled.
* **Independent review (2026-11-14), against the 1.0.0 facts, the standard and current guidance.**
  * Facts: the debrief conclusion said "no guarding or mass" where 1.0.0 records "no definite mass" palpated, and
    dropped "widespread", "without obvious atypia", the site and the blurred fat that the Chinese kept — restored in
    both languages; "normal colonoscopy" became "no obvious abnormality" (无明显异常) wherever it appeared; the persona's
    "worn down" / "人有些乏" (a fatigue 1.0.0 does not record) was removed; the 113.7 × 10⁹/L count's date no longer
    asserts "after the operation", which its own note says is not recorded.
  * Safety: `dexamethasone` is contraindicated throughout (it had stopped being contraindicated once the final
    pathology was read, although infection is still not excluded then and a steroid raises the neutrophil count the
    learner is working up); `rb-no-critical-harm` reworded.
  * Currency: SIS 2017 → SIS 2024; "contrast CT the same day" re-attributed from SIS 2017 (which does not cover
    imaging) to IDSA 2024; IMIG 2017 → IMIG 2023 update (published 2024; MTAP beside BAP1 and CDKN2A, D2-40 or CK5/6
    as the second mesothelial marker); the 2013 occupational-disease catalogue → the 2024 catalogue in force since
    August 2025; PSOGI/EURACAN 2021 quoted as it reads (core needle biopsy or exploratory laparoscopy, not effusion
    cytology or fine-needle material); the steroid principle reworded to what the 2011 text is recalled to say, with
    its exact sentence under "To verify".
  * Validity: an empirical carbapenem ordered on admission reached the carbapenem-plus-antifungal trap (a harm, and no
    credit for antibiotics) — it now counts as IV antibiotics, and only an antifungal or an escalation reaches the
    trap; "leukapheresis" no longer gives hydroxycarbamide; decision 4's prompt no longer asks "what is still
    missing?" (it presupposed the key); the `obj-theatre` and `obj-diagnosis` titles, listed from the start, no longer
    announce the operation or a disagreement between the pathology reports.
  * Staff and voice: a general surgeon (Dr Kong) for the theatre phone call and source control; the nurse says there
    is nothing recorded to report instead of "this case records none"; the communication guidance says the mass was
    not removed (not that the operation "could not" remove it).
  * Matcher: plain questions that reached nothing or the wrong item now reach theirs (Matcher notes); seven new test
    utterances.

### 1.0.0

* Initial template version (PR #5): 15 history items, 2 exam findings, 5 records, 3 decisions, 11 rubric items, no
  interventions.

## Validation

Run from the worktree root (all passed on 2026-11-14, after the independent review):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-138892/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-138892 --lang en          # 91 steps · objectives 6/6 · decisions 5/5 · utterances 46/46 · rubric 31/31
npx tsx --conditions=source scripts/case-check.ts cmcr-138892        # depth floor, do-nothing 0, wrong-first 58 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-138892:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-138892:"   # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 81岁男性，左下腹隐痛伴发热，起病3天后首次就诊；外院考虑小肠肿瘤和尿路感染。起病时有尿频、尿急、尿痛和怕冷，
无寒战、腹泻或便血；入院前经抗感染治疗，尿路症状减轻，但腹痛、发热持续。入院查体：腹部膨隆，左下腹压痛、反跳痛，无肌紧张，
未触及明确包块，左肾区叩痛。白细胞由28.8×10⁹/L升至33.3×10⁹/L，以成熟中性粒细胞为主。影像：左下腹囊实性混合肿块约
7.1 cm×6.3 cm×9.9 cm，周围脂肪模糊，腹盆腔积液，超声见血流。结肠镜无明显异常；小肠造影见外压、无外漏，支持肠外占位。两次血培养
阴性；骨髓粒系增生活跃，无明显形态异常。手术探查见肠系膜根部肿块及广泛粟粒结节，冰冻考虑转移性腺癌；最终组织学及免疫组化诊断
恶性间皮瘤（calretinin、CK18、vimentin阳性，CEA阴性）。因病情及手术评估未完整切除，仅取组织。之后白细胞升至113.7×10⁹/L，以中性
粒细胞为主，抗菌治疗无效，原团队考虑类白血病反应；患者离院，远期结局不详。本版事实沿用1.0.0版的提取内容，尚未对照原文全文核对。

**学习目标。**
1. 把高龄患者入院前抗感染治疗后仍有的发热、左下腹局限性腹膜刺激征和中性粒细胞升高按可能的复杂性腹腔感染处理：用NEWS2而不是单用qSOFA
   筛查（SSC 2026），先留培养再静脉覆盖肠道革兰阴性菌和厌氧菌（SIS 2024），当天做增强CT（IDSA 2024）。
2. 用结肠镜和小肠造影判断肿块在肠内还是肠外，选择影像引导下粗针活检（必要时腹腔镜）取组织。
3. 把术中冰冻当作初步意见；肠系膜根部受累、病变广泛时只取足量组织、不凭冰冻做不可逆切除（PSOGI/EURACAN 2021）。
4. 按IMIG 2023年更新的标准（两个间皮标志物和两个癌标志物，必要时BAP1或MTAP免疫组化、CDKN2A荧光原位杂交）评价calretinin阳性、CEA阴性的腹膜肿瘤，
   并采集职业性石棉接触史。
5. 把超过100×10⁹/L、以成熟中性粒细胞为主的白细胞增多作为排除性诊断认定为类白血病反应：按WHO第5版（2022）排除慢性髓性白血病和
   慢性中性粒细胞白血病（BCR::ABL1、CSF3R）、隐匿感染和药物因素，不降细胞、不盲目升级抗菌药（IDSA/SHEA 2016）。
6. 用SPIKES向81岁的老人说明腹膜间皮瘤的诊断和不确定性，在他的目标下讨论减瘤手术、全身治疗和姑息治疗。

**关键决策。** ① 入院：按可能的复杂性腹腔感染处理——先留血、尿培养，再静脉覆盖肠道革兰阴性菌和厌氧菌，当天增强CT（干扰项：按肾盂
肾炎等48小时、先停药做肠镜、按“肿瘤热”用地塞米松）；② 定位与取材：肠外肿块，影像引导下粗针活检并抽腹水，提交多学科讨论（干扰项：
直接手术探查、凭冰冻定切除范围（接近原报告的路径，原团队做的是手术探查）；细针穿刺细胞学；再用两周抗菌药后复查）；③ 术中：多处取足量组织、留新鲜组织培养（含结核），
不切除（干扰项：凭冰冻减瘤、取一小块后找原发灶、只做冲洗液细胞学）；④ 最终病理：以石蜡为准、支持间皮瘤，但补做第二个间皮标志物
和癌标志物、专家复核、问石棉接触史（干扰项：以冰冻为准、两项染色已足够、按肉瘤处理）；⑤ 极度白细胞增多：多半是肿瘤相关的类白血病
反应，靠排除认定——复核涂片、查BCR::ABL1和CSF3R、再找感染灶、停用无目标的抗菌药（干扰项：按慢性髓性白血病用羟基脲、升级碳青霉烯加
抗真菌药、认定已证明分泌G-CSF）。关键项：入院阶段先送血培养、再给静脉抗菌药并申请影像（不完成这些，检查阶段不会开放），以及避免两种
危险操作。

**安全结果。** `dexamethasone`（用地塞米松退热，全程禁忌：组织诊断前会掩盖感染、妨碍活检，确诊后感染仍未排除，且激素本身升高中性粒细胞）和 `radical-resection`（凭冰冻切除肠系膜根部肿块）标为 `critical: true`，
给予任一项即判安全结果不通过（`safety.passed: false`），无论得分多少；羟基脲、升级抗菌药和口服抗菌药出院为可纠正的错误（`critical: false`）。

**复盘要点（PEARLS）。** 先谈感受；复述最初几小时的处置和顺序；分析：尿路症状好了而腹痛发热未好说明什么、为什么先留培养再用抗菌药、
两次阴性培养的分量、摸不到的近10 cm肿块和两项肠道检查说明什么、为什么首选粗针活检、术中冰冻之后该做什么不该做什么、这组免疫组化够不够
以及石棉接触史为何重要、白细胞升到113.7×10⁹/L时先要排除什么而不该对数字本身做什么、怎样和他谈；最后总结下次遇到抗菌治疗后仍发热腹痛的
老年患者先做什么。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
