# cmcr-655474 — Bone pain in several places and a limp · girl aged 11 years 5 months

> **Facilitator guide — spoilers below.** Learners meet this case through a title, summary, chief complaint,
> tags and triage note that name no diagnosis. The girl (魏予宁 / Wei Yuning) is a pseudonym; her parent, the
> attending (宋医生 / Dr Song), the ward nurse (林护士 / Nurse Lin), the radiologist (方医生 / Dr Fang) and the
> pathologist (乔医生 / Dr Qiao) are teaching roles. The case adapts one published case report and is not
> medical advice.
> 导师指南，含剧透。患者为化名，家长与医护人物为教学角色；本病例改编自一篇已发表的单例报告，不构成医疗建议。

**Status of the facts.** Version 1.1.0 is re-authored from the facts that version 1.0.0 records (commit
`88ed0d2`), the only fact base in the authoring environment. Those facts have **not yet been checked against
the full source article** (`extensions.sourceTextChecked: false`); a source pass follows once the article text
is available, and everything under "To verify" belongs to it.

## Case card

| | |
|---|---|
| id / version | `cmcr-655474` · `1.1.0` · CMCR additional collection (`cmcr-105`) |
| Source | 文川, 梁青春, 万伍卿, 刘晓艳, 易著文. 儿童Erdheim－Chester病一例. 中华儿科杂志. 2011;49(3):231-232 |
| Setting / facility | Children's ward bed (`inpatient`) / `general-hospital` |
| Difficulty / time | 4 / 5 · about 35 min (static clock; four phases, five decisions, 19 investigations, 11 interventions) |
| Specialty | Paediatrics, orthopaedics, radiology, pathology (`pediatrics`, `orthopedics`, `radiology`, `pathology`) |
| Languages | `zh-CN` (source language), `en` |
| Learner level | Final-year medical students and paediatric residents; orthopaedic, radiology and pathology trainees for the imaging and biopsy parts |
| Review status | `editorial`, 2026-10-30 — AI-assisted teaching design with an editorial review against the cited guidance; **not yet reviewed by a licensed clinician**, and the patient facts are not yet checked against the full article. Ask a paediatric haemato-oncologist with histiocytosis experience, a paediatric radiologist and a pathologist to review it before teaching |
| Phases | `admission` 入院：骨痛九个月 / Admission: nine months of bone pain → `pathology` 活检之后：病理结果 / After the biopsy: the pathology report → `planning` 确定下一步：治疗前评估与家庭谈话 / Next steps: the pre-treatment work-up and the family conversation → `outcome` 原报告记录的结局 / Reported course and outcome — none learner-switchable |
| Content | 22 history items (8 required, 12 unknown; the girl answers for her own symptoms, her parent for the rest) · 6 exam findings · 19 investigations (2 record reviews; 13 with no result recorded) · 11 interventions (5 contraindicated, 2 of them critical) · 6 objectives · 5 decisions (21 options) · 12 rubric items (11 deterministic, weight 30; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 5 teaching points · 40 test utterances |

The case card no longer lists haematology: in 1.0.0 it pointed a learner with a bone-pain presentation straight
at a blood or histiocytic disease. Orthopaedics (the presenting problem), radiology and pathology (the two
readings the case turns on) replace it.

## Learning outcomes

After the case the learner can:

1. Recognise the red flags that take a child's bone pain beyond growing pains — a limp, weight loss, pain in
   the spine and ribs, focal bony tenderness and raised inflammatory markers — and arrange a blood count, a film
   and imaging of the painful sites at once (NICE NG12, 2015, updated 2026).
2. Plan the diagnosis of bone lesions at several levels with flattened vertebrae in a child: exclude leukaemia,
   biopsy the safest accessible lesion for histology, immunohistochemistry, molecular tests and culture, and give
   no corticosteroid or steroid-containing chemotherapy before the samples are taken.
3. Read CD68-positive foamy histiocytes that are CD1a- and S100-negative as a non-Langerhans
   (xanthogranuloma-family) histiocytosis, tell it from Langerhans cell histiocytosis, Rosai–Dorfman disease and
   chronic osteomyelitis, and explain why Erdheim–Chester disease is diagnosed with the clinical and radiological
   picture (WHO 5th edition, 2022; Histiocyte Society revised classification, 2016).
4. Complete the pre-treatment work-up the 2020 international ECD consensus sets out: BRAF V600E and
   MAPK-pathway testing of the biopsy, whole-body FDG PET-CT including the legs, brain and pituitary MRI, cardiac
   and endocrine assessment, and referral to an experienced histiocytosis centre.
5. Explain today's treatment options — a BRAF or MEK inhibitor chosen by mutation status, or conventional
   therapy such as interferon-alpha, approved for adults and decided for a child by a specialist centre — and why
   a 2011 report's course is not today's prognosis.
6. Share a rare diagnosis with an 11-year-old and her parent using SPIKES (2000), seek her assent alongside the
   parent's permission (American Academy of Pediatrics, 2016), and when the family is reluctant to treat, explore
   their reasons, give accurate information and keep follow-up open.

These are the case's `learningOutcomes`. They name the diagnosis, so front-ends show them before play only on
request and list them in every debrief; the six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

An 11-year-5-month-old girl had nine months of bone pain that began in both knees and later involved her back,
ribs and hip. For four months she had limped, with left hip pain on squatting, and she had lost weight (no amount
recorded); she had no excessive thirst, drinking or urination. On examination her trunk and pelvis tilted to the
left and she limped; the sacrococcygeal region was tender and the left FABER (figure-of-four) test positive, with
no local redness, warmth or skin breakdown, and limb power, tone and reflexes were normal. No vital signs,
weight or height are recorded.

Haemoglobin was 108 g/L, white cells 7.8 × 10⁹/L, platelets 324 × 10⁹/L, ESR 38 mm/h and CRP 22.8 mg/L. Imaging
(method not recorded) showed flattened T2 and T10 vertebral bodies, low-density change at L3, L5 and S2 and an
osteolytic lesion of the right ilium, with normal hip and sacroiliac joint spaces. An iliac biopsy (method and
side not recorded) showed yellow 肉芽组织 — granulation tissue as written, "granulomatous tissue" in 1.0.0's
English — with fibrosis and foamy histiocytes; CD68 and alpha-1-antichymotrypsin (AACT) were positive, CD1a and
S100 negative. The report diagnosed Erdheim–Chester disease (ECD) in a child. The family declined further
treatment, and no later outcome is recorded.

What the case teaches is the path a clinician should take today: name the red flags at the bedside, investigate
at once, obtain tissue before any treatment (no steroid, no LCH chemotherapy, no empirical antituberculosis
drugs), read the immunophenotype correctly, stage and test for BRAF V600E/MAPK changes before choosing therapy
(2020 consensus), and talk with the girl and her parent in a way that leaves them able to decide — so that a
refusal, if it comes, is an informed one.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires. Every
intervention's response says what the case does and does not record; nothing the report does not record is
simulated.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | after nine months of pain and four of limping | start | the history from the girl and her parent (two labelled teaching wishes), the six recorded examination findings, the blood count, ESR, CRP and the spine and pelvis imaging report (record review), tests with no result recorded (blood film, bone chemistry, spine MRI, long-bone X-rays, marrow, osmolality, HLA-B27), decisions `bone-pain-triage` and `lesion-plan`, the biopsy booking and the tempting wrong treatments |
| `pathology` | after the iliac biopsy (day not recorded) | decision `lesion-plan` answered and the biopsy booked (`request-biopsy`) | the histology and immunohistochemistry, tissue culture and molecular testing (no result recorded), decision `biopsy-reading` |
| `planning` | once the histology is back | decision `biopsy-reading` answered | the pre-treatment work-up (molecular tests, PET-CT or whole-body MRI, brain and pituitary MRI, echocardiogram, osmolality — no result recorded), the parent's understanding (phase twin), decisions `staging-plan` and `family-talk`, the family meeting and follow-up plan |
| `outcome` | after the diagnosis | all five decisions answered and `obj-staging` complete | the reported diagnosis and the family's decision (record review) |

1.0.0 put the report's diagnosis inside the histology result, which would have answered decision 3 the moment it
opened; 1.1.0 keeps the histology as the evidence and moves the report's diagnosis to the outcome record. The
biopsy is booked as an intervention and gates the pathology phase, so the histology can never appear before the
act that produces it; ordering the histology earlier shows an order-entry notice saying so.

## Decisions and assessment

### Objectives (HUD chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-story` Hear the nine-month story from her and her parent | presentation, pain start, pain spread, limp, squat pain, weight loss and thirst/urine asked |
| 2 | `obj-examine` Examine her posture, gait, pelvis, hips and limbs | all six recorded manoeuvres examined |
| 3 | `obj-first-results` Make sense of the first results and arrange the diagnosis | blood count, ESR, CRP and imaging read in `admission`; decisions 1 and 2 right; biopsy booked |
| 4 | `obj-pathology` Read the biopsy | histology read in `pathology`; decision 3 right |
| 5 | `obj-staging` Complete the work-up that must come before treatment | decision 4 right; molecular testing, PET-CT (or whole-body MRI) and brain MRI ordered; haematology-oncology referral |
| 6 | `obj-family` Talk with her and her parent, then review the outcome | the parent's understanding asked; family meeting; decision 5 right; outcome record read |

No objective holds a phase leaf, a `whenIndicated` leaf or a first-try condition, and the outcome phase waits for
`obj-staging`, so a learner who orders the staging tests late can still finish (the contract's late-learner
replay finds no trap).

### Decisions

| id | Opens after | Key | Distractors (why they tempt) |
|---|---|---|---|
| `bone-pain-triage` (single) | the pain story, limp, squat pain, weight loss asked; all six manoeuvres examined | `red-flag-workup`: not growing pains or strain — same-day count with film, ESR, CRP and imaging of the painful sites | `growing-pains` (normal neurology, no local inflammation); `enthesitis-arthritis` (sacral tenderness and a positive FABER really do suggest sacroiliitis); `mechanical-back` (pelvic tilt, squat pain) |
| `lesion-plan` (single) | decision 1; count, ESR, CRP and imaging read in `admission` | `biopsy-before-treatment`: film, marrow and iliac biopsy under one anaesthetic for histology, immunohistochemistry, molecular tests and culture, no steroid before the samples | `lch-chemo` (vertebra plana is the classic sign of LCH); `spinal-tb` (several vertebrae, raised ESR/CRP — and common); `crmo-nsaid` (near-normal count, normal joint spaces) |
| `biopsy-reading` (single) | histology read in `pathology` | `non-langerhans`: xanthogranuloma-family histiocytosis, ECD first; long-bone imaging, staging and BRAF to confirm | `lch-poor-sample` (vertebra plana again; "the negative stains are artefact"); `rosai-dorfman` (foamy histiocytes and fibrosis); `infection-reaction` (xanthogranulomatous osteomyelitis is real) |
| `staging-plan` (select all) | decision 3 | `mutation-testing`, `whole-body-staging`, `endocrine-tests` | `start-braf-inhibitor` ("about half carry the mutation"); `steroid-bridge` (relieve the pain while waiting) |
| `family-talk` (single) | decision 4; the parent's understanding asked | `shared-plan`: SPIKES with both, the child's view and assent, honest uncertainty, targeted drugs exist, a time to talk again | `parent-only` (protect the child); `historical-pessimism` (1.0.0's "no treatment options" distractor turned into a tempting frankness); `insist-now` (pressure, threat, waiver) |

Every option has its own feedback (2–4 sentences naming the guidance, its issuing body and year). Option ids name
their content. In single-best decisions the key is the uniquely longest option only in `family-talk` (allowed
once per language); in decisions 1–3 a distractor is longer than the key in both languages.

### Rubric (11 deterministic items, weight 30, + 1 examiner-judged)

| id | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history` | history | 3 | the seven presentation items asked, plus night pain, fevers, leg weakness/bladder and TB contact (unrecorded: asking is the competency) |
| `rb-examination` | examination | 2 | posture, gait, sacrum, FABER, local skin, limb neurology |
| `rb-first-tests` | investigations | 2 | count, ESR, CRP and imaging read in `admission`; blood film ordered in `admission` |
| `rb-triage` | diagnosis | 2 | decision 1 right first time |
| `rb-lesion-plan` | diagnosis | 3 | decision 2 right first time and the biopsy booked |
| `rb-no-treatment-before-tissue` | safety | 4 | **critical** — no prednisolone and no LCH chemotherapy while contraindicated (before the biopsy, i.e. in `admission`); `scoredWhen` = decision 2 attempted or either drug given |
| `rb-pathology-reading` | diagnosis | 3 | decision 3 right first time |
| `rb-staging-acts` | management | 4 | **critical** — molecular testing, PET-CT or whole-body MRI, and brain/pituitary MRI ordered in `pathology` or `planning` |
| `rb-staging-plan` | management | 3 | decision 4 right first time; echocardiogram, osmolality and spine MRI ordered; haematology-oncology and spinal referrals |
| `rb-family-plan` | management | 2 | decision 5 right first time; family meeting; written follow-up plan |
| `rb-avoid-unproven` | safety | 2 | no discharge as growing pains, no empirical antituberculosis drugs, no BRAF inhibitor without a result; `scoredWhen` = decision 2 attempted or any of the three given |
| `rb-communication` | communication | (judged) | SPIKES within Calgary–Cambridge with the girl and her parent; assent; refusal handled by exploring reasons and keeping care open (see judge guidance) |

**Critical items are acts.** `rb-no-treatment-before-tissue` is the case's dangerous error (treatment before
tissue), lost only when a steroid or steroid-containing chemotherapy is given while contraindicated
(`{intervened, valid: false}`). `rb-staging-acts` is the missed life-saving act — without the molecular result and
the staging, the brain, heart and great-vessel involvement that decides ECD's urgency and the choice of a targeted
drug stay unknown — and it is met only by orders placed in `pathology` or `planning`, never in hindsight from the
outcome phase. 1.0.0's only critical item was a first-try answer to a management question; that is now
`rb-staging-plan` and carries no critical flag.

### How wrong choices score (measured 2026-11-13 with core `assess`)

| Path | Score | Critical items missed |
|---|---|---|
| Reference path (`solution`) | 30/30 (100 %) | none |
| Do nothing (start, then try to finish) | 0 (finish refused: objectives incomplete) | `rb-staging-acts` |
| A wrong first answer at every decision, then the right one | 17/30 (57 %) | none |
| One wrong first answer at decision 1 or 5 (each distractor) | 28/30 (93 %) | none |
| One wrong first answer at decision 2, 3 or 4 (each distractor) | 27/30 (90 %) | none |
| Reference path plus prednisolone, or plus LCH chemotherapy, in `admission` | 26/30 (87 %) and the **safety outcome fails** | `rb-no-treatment-before-tissue` |
| Reference path plus discharge as growing pains, empirical antituberculosis drugs or vemurafenib | 28/30 (93 %); the act is a contraindicated safety event | none |
| Prednisolone after the biopsy (in `planning`) | 30/30 — neutral, neither indicated nor contraindicated | none |
| Whole-body MRI instead of PET-CT (to spare a child radiation) | 30/30 (100 %) — `whole-body-mri` is the PET-CT's `alternativeTo` | none |
| No molecular testing, PET-CT or brain MRI | stays in `planning` (the outcome phase waits for `obj-staging`); 26/30 if the learner stops | `rb-staging-acts` |
| No biopsy booked | stays in `admission`; 15/30 (50 %) | `rb-staging-acts` |
| No red-flag questions (night pain, fevers, leg weakness/bladder, TB contact) | 27/30 (90 %) | none |
| No blood film | 28/30 (93 %) | none |
| No echocardiogram, osmolality, spine MRI or referrals | 27/30 (90 %); cannot finish until the haematology-oncology referral is made (`obj-staging`) | none |
| No family meeting or follow-up plan | 28/30 (93 %); cannot finish until the family meeting is held (`obj-family`) | none |

**Safety outcome.** `prednisolone-trial` (risk moderate) and `lch-chemo-now` (risk high) are `critical: true`: given
before the biopsy they can partly treat leukaemia, lymphoma or LCH, leave the tissue non-diagnostic and set off
tumour lysis, so either fails the assessment's safety outcome whatever the score. `empirical-anti-tb` and
`discharge-reassure` (risk moderate) and `vemurafenib-now` (risk high) are explicitly `critical: false`: each is a
serious but recoverable misjudgement that the next clinician corrects, and each costs the `rb-avoid-unproven`
item.

## Reference path (`solution`)

75 steps: start → the seven presentation items, the twelve unrecorded items a clinician would ask about (night
pain, fevers, injury, earlier care, leg weakness or bladder trouble, headaches and vision, past history,
medicines, allergies, growth and puberty, TB contact, family history) and the two labelled worries → posture,
gait, sacrum, FABER, local skin, limb neurology → decision 1 → regular paracetamol → blood count, ESR, CRP, blood
film, bone chemistry, imaging report, spine MRI, long-bone X-rays → haematology-oncology and spinal referrals →
decision 2 → marrow → biopsy booking → (`pathology`) histology, tissue culture, molecular testing → decision 3 →
(`planning`) PET-CT, brain and pituitary MRI, echocardiogram, osmolality → decision 4 → the parent's
understanding → family meeting, written follow-up plan → decision 5 → (`outcome`) outcome record → finish. It
scores 30/30 with no contraindicated act, in clinical and in-world mode, in both languages.

## Clinical numbers check

Every patient value below is taken from version 1.0.0 (its field in brackets) with its unit; none is new. The
check against the full article is pending.

| Value | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| Age 11 years 5 months (stored as 137/12 = 11.4166… years: the schema caps `age` at 120, so 137 months cannot be stored; core shows "11 years 5 months" / "11岁5个月") | `title`, `patient.age` | `title`, `patient.age`, triage note, nurse handover |
| Bone pain for 9 months, first in both knees, later the back (腰背), ribs and hip | history `pain`, `duration`; `chiefComplaint`; `openingLine` | history `presentation`, `pain-start`, `pain-spread`; `chiefComplaint`; `openingLine`; triage note |
| Limp for 4 months; left hip pain on squatting | history `limp` | history `limp`, `squat-pain` |
| Weight loss, amount not recorded | history `weight-loss` | history `weight-loss` (on-ask; the gap said in lay words) |
| No excessive thirst, drinking or urination | history `thirst` | history `thirst-urine` |
| Trunk and pelvis tilted to the left; limp | exam `musculoskeletal` | exam `posture`, `gait` |
| Sacrococcygeal tenderness; left FABER (“4”字试验) positive; no local redness, warmth or skin breakdown | exam `musculoskeletal` | exam `sacrum-tenderness`, `faber`, `local-inflammation` |
| Limb strength, tone and reflexes normal | exam `neuro` | exam `limb-neuro` |
| Flattened T2 and T10; low-density change at L3, L5, S2; osteolytic right ilium; normal hip and sacroiliac joint spaces | investigation `imaging` (`workup`) | `spine-pelvis-imaging` (`admission`, record review) |
| Hb 108 g/L, WBC 7.8 × 10⁹/L, platelets 324 × 10⁹/L | investigation `labs` (`workup`) | `fbc` (`admission`) values |
| ESR 38 mm/h; CRP 22.8 mg/L | investigation `labs` (`workup`) | `esr`, `crp` (`admission`) values |
| Yellow 肉芽组织 with fibrosis and foamy histiocytes; CD68+, AACT+, CD1a−, S100− | investigation `pathology` (`confirmation`) | `biopsy-histology` (`pathology`) text and values |
| The report's diagnosis, ECD | investigation `pathology` text | `outcome` record (moved: it answers decision 3) |
| The family declined further treatment; no later outcome | investigation `followup` | `outcome` record |

**Reference ranges.** None is recorded, so every value carries "reference range not recorded". The flags are
interpretation, not a recorded range: haemoglobin L (below the WHO anaemia threshold of 115 g/L for children aged
5–11 years — see "To verify"), ESR H and CRP H (above any usual laboratory upper limit); the histology markers carry
A for a positive stain.

**Derived values.** None: no weight, height or body surface area is recorded, so every dose in the case is a
formula (paracetamol 15 mg/kg per dose; prednisolone 1–2 mg/kg/day, maximum 60 mg; vinblastine 6 mg/m² weekly with
prednisolone 40 mg/m²/day) and no concrete dose is calculated.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "Nine months of pain before this admission. How did that land with you when you met her?"
2. **Description** — "Walk me through what you heard and found at the bedside, and what you sent first."
3. **Analysis**
   * "Which single finding would you use to convince a colleague that this is not growing pains?"
   * "Flattened vertebrae and a lytic iliac lesion — what was on your list, which lesion would you biopsy, and what
     would you ask the surgeon to send?"
   * "Why does a steroid before the biopsy matter so much in a child like this? What else looked reasonable and
     could have hidden the diagnosis?"
   * "What did CD1a and S100 negativity rule out? What did the biopsy still leave open, and how would you close it?"
   * "Which results do you need before anyone chooses a drug for her, and why those?"
   * "How did you involve an 11-year-old in a conversation about her own treatment?"
   * "The family declined further treatment. What would you want to have done before that point — and what does this
     2011 outcome say, or not say, about treatment today?"
4. **Summary** — "What will you do differently the next time a child's pain 'just won't settle'?"

### Common learner errors and how the case surfaces them

| Error | What the case does | Where it scores |
|---|---|---|
| Accepting growing pains or mechanical pain | `growing-pains`, `mechanical-back`; `discharge-reassure` contraindicated | `rb-triage`, `rb-avoid-unproven` |
| Reading sacral tenderness and FABER as JIA and stopping there | `enthesitis-arthritis`; HLA-B27 is a low-value test with a note | `rb-triage` |
| A steroid trial for pain and a raised ESR | `prednisolone-trial` critical in `admission`; `steroid-bridge` later | `rb-no-treatment-before-tissue`, `rb-staging-plan` |
| "Vertebra plana = LCH" without tissue | `lch-chemo`, `lch-poor-sample`; `lch-chemo-now` critical in `admission` | `rb-lesion-plan`, `rb-pathology-reading`, `rb-no-treatment-before-tissue` |
| Empirical antituberculosis treatment | `spinal-tb`; `empirical-anti-tb` contraindicated | `rb-lesion-plan`, `rb-avoid-unproven` |
| Trusting a normal white count to exclude leukaemia | the key and its feedback; blood film and marrow offered | `rb-first-tests` |
| Reading CD68 as diagnostic, or the negative stains as artefact | `lch-poor-sample`, `rosai-dorfman`, `infection-reaction` | `rb-pathology-reading` |
| Starting a BRAF inhibitor without a result | `start-braf-inhibitor`; `vemurafenib-now` contraindicated | `rb-staging-plan`, `rb-avoid-unproven` |
| Treating without staging | `obj-staging` keeps the outcome closed until the staging is ordered | `rb-staging-acts` (critical) |
| Talking over the child, or frightening or discouraging the family | `parent-only`, `insist-now`, `historical-pessimism` | `rb-family-plan`, communication |

## Embodied mode

* **Where she is.** A children's ward bed in the general hospital (`inpatient`), sitting up; she can walk, which is
  why gait is an examination finding. The imaging report and the outcome record are record reviews
  (`performedAt: "records"`, `requires: ["records"]`, risk none), read at a records terminal or the bedside.
* **Tests.** There is no IV-access procedure (she needs no IV drug in the reference path), so the bloods are
  ordered at her bedside and sampled there; results are read at a records terminal or the bedside. MRI (spine, brain,
  whole body), long-bone X-rays and PET-CT are `provider` tests — she is taken to the scanner; the echocardiogram is a bedside study. The
  biopsy is booked as a consult (`request-biopsy`, a doctor's act at the bedside); the operation itself is
  off-screen and the pathology phase opens when it is booked and decision 2 is answered.
* **Who speaks.** She is 11 and answers for herself about where it hurts, squatting, thirst, night pain, injury,
  leg weakness, headaches and her own wish (`speaker: "patient"`); her parent (`companion`, role `parent`,
  "魏予宁的家长（化名）/ Wei Yuning's parent (pseudonym)") answers for the story of the illness, her weight, her
  background and the family's worries. 1.0.0 records only that her 家长 declined treatment, so the parent is drawn
  neither as a mother nor a father (`presentation` left out) and the persona says so. Adult social history is not
  asked of her.
* **Scope of practice.** Drugs follow their kinds; the referrals and biopsy booking are consults; the family
  meeting is a doctor's act.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-655474:"` passes: the offline demonstration finishes
  in-world with every objective done and the clinical-mode score.

## Source and adaptation (fidelity limits)

**From the facts of version 1.0.0 (kept, reorganised into phases and lay speech, not yet checked against the
article).** Age and sex; pain beginning in both knees and over nine months reaching the back, ribs and hip; a
four-month limp with left hip pain on squatting; weight loss without an amount; no polydipsia or polyuria; the
admission examination; the imaging; the blood count, ESR and CRP; the iliac biopsy with its immunohistochemistry
and the report's diagnosis; the family's refusal of further treatment with no later outcome; the inpatient
setting.

**Extraction summary.** 1.0.0 held these facts in 5 history items, 2 exam findings and 4 records; 1.1.0 splits
them into 7 history items, 6 exam findings and 6 records with values (see "Clinical numbers check" for every value
and its old and new field). The report's diagnosis moved from the histology result to the outcome record. 1.0.0's
ten "the source case does not provide that information" slots became twelve case-specific unrecorded items in
lay voice ("这个我说不上来，医生。" / "I'm not sure, doctor."); 1.0.0's README sentence "Molecular results, systemic
organ screening and long-term outcome are unknown" became unrecorded tests with "No result is recorded for this
test." and the case's `unknowns`.

**Adapted for teaching (labelled).** The parent as a speaking companion (1.0.0 records only 家长 — her parents or
guardians — declining treatment); who answers what; all dialogue; two worries and one understanding that add no
clinical fact (`concerns-admission`, `child-worry`, `family-understanding`, sourced as teaching devices — the last
one names the hip bone because 1.0.0 records an iliac biopsy); the staff; the phases; decisions, options, feedback,
interventions, rubric, teaching points; the unrecorded tests offered to the learner; the order-entry notice on the
histology.

**Contradictions and ambiguities kept, not resolved.**
* 1.0.0 writes the biopsy as 黄色肉芽组织 (yellow granulation tissue) in Chinese and "yellow granulomatous tissue" in
  English. The result keeps 肉芽组织 and says "granulation tissue", and its note names both readings.
* The recorded signs are left-sided (left hip pain on squatting, positive left FABER, a leftward tilt) while the
  only iliac lesion recorded is on the right; the side and method of the biopsy are not recorded. The case does
  not say which lesion was biopsied.
* "腰背" is rendered "back": it may mean the lower back or the back as a whole.
* 1.0.0's README says "Historical drug doses are omitted from actionable options" and its rubric spoke of "historical
  therapeutic pessimism", yet no treatment is recorded anywhere in 1.0.0; whether the article reports any treatment
  before the refusal is left to the source pass.

**Privacy.** The pseudonym is unique in the collection; no hospital, city, date or identifying detail appears;
times are durations. The source citation, which names the diagnosis, is shown only after the case.

**Figures.** `fig01` is approved in `scripts/cmcr-105-media-review.json` (checksum unchanged). Its review reason is
a grouped one ("imaging, specimen or histology") and its content could not be inspected here, so it stays a
local-only asset attached to no result, as in 1.0.0; the new title says it is a composite that may show later
findings and is for the debrief.

**Survey findings fixed** (survey.json: template SI-01 to SI-25 and the critic's systemic gaps; the survey has no
audit specific to this case): the fill-in history slots, the authoring language in the patient's and parent's
mouths ("这项情况原病例资料没有说明，不能补成没有或正常", "Companion (educational role)", persona fields about
"current-stage records") and the instruction-style triage note replaced; the diagnosis-bearing summary and specialty
removed; one rubric item that rewarded asking about an unrecorded allergy as "safety" dropped; the critical item
turned from a first-try answer into acts; the length cue (1.0.0's key was the longest option in all three
decisions) removed in four of five decisions; interventions, examination, investigations, objectives, staff,
teaching points and unknowns brought to the revised-20 depth; the matcher corpus rewritten as paraphrases with
negatives; review status `editorial` with seven named guidelines; one Vancouver citation (no zero-padded issue,
`doi:` without a space, no bare duplicate URLs); one extension schema (`sourceDoi` + `doiVerifiedAt` replace
`sourceDoiVerification`; `sourceTextChecked: false`). The age stays 137/12 years — the closest the schema allows to
the integer-months rule — and prints as "11 years 5 months" everywhere.

## Matcher notes

* 40 `extensions.testUtterances` (23 zh-CN, 17 en) written as learners type them; none equals a keyword or a
  canonical question; 2 look-alike negatives (a favourite school subject, ward parking). Every required item and the
  phase twin have a paraphrase; `cases verify` passes 40/40 with no extra selections.
* Items tested in one language only were probed in the other with core `matchHistory` while authoring, each
  selecting its item alone: "Has she been ill before or had operations?" → `pmh`, "Any allergies to medicines?" →
  `allergies`, "Has she started her periods yet?" → `growth-puberty`, "Does anything like this run in the family?"
  → `family-history`, "Any headaches or trouble with her eyes?" → `headache-vision`, "What would help you most?" →
  `child-worry`; "她小时候长个子正常吗？" →
  `growth-puberty`, "你晚上睡觉会疼醒吗" → `night-pain`, "之前用过哪些药治这个病？" → `earlier-care`.
* The pain items are kept apart by when and where: `pain-start` (first, knees) excludes "else/since then/spread";
  `pain-spread` (back, ribs, hip) excludes "first/began"; `squat-pain` owns squat and crouch; `night-pain` owns
  night and waking and excludes sweats, which belong to `fever-sweats`. `thirst-urine` excludes control and leaks,
  which belong to `weakness-bladder`; `medications` (regular medicines) excludes painkillers, which belong to
  `earlier-care`; `tb-contact` and `family-history` exclude each other's words; `weight-loss` excludes growth words.
* Phase twin: `family-understanding` (`planning`) supersedes `concerns-admission`, so a worry question in the
  planning phase reaches the parent's current understanding; the twin carries its own "what have you been told"
  keywords and no worry words (the matcher scores every item whatever its phase).
* English keywords of three or more words are run together where they would reduce to one token
  (`broughtherin`, `whatsthematter`, `seenadoctor`, `beeninhospital`, `howshestands`).

## References

1. 文川, 梁青春, 万伍卿, 刘晓艳, 易著文. 儿童Erdheim－Chester病一例. 中华儿科杂志. 2011;49(3):231-232.
   doi:10.3760/cma.j.issn.0578-1310.2011.03.017. Available from: https://rs.yiigle.com/cmaid/655474
2. Goyal G, Heaney ML, Collin M, et al. Erdheim-Chester disease: consensus recommendations for evaluation,
   diagnosis, and treatment in the molecular era. Blood. 2020;135(22):1929-1945. doi:10.1182/blood.2019003507
3. Emile JF, Abla O, Fraitag S, et al. Revised classification of histiocytoses and neoplasms of the
   macrophage-dendritic cell lineages. Blood. 2016;127(22):2672-2681. doi:10.1182/blood-2016-01-690636
4. Khoury JD, Solary E, et al. The 5th edition of the World Health Organization Classification of Haematolymphoid
   Tumours: Myeloid and Histiocytic/Dendritic Neoplasms. Leukemia. 2022;36(7):1703-1719.
   doi:10.1038/s41375-022-01613-1
5. Haupt R, Minkov M, Astigarraga I, et al. Langerhans cell histiocytosis (LCH): guidelines for diagnosis, clinical
   work-up, and treatment for patients till the age of 18 years. Pediatr Blood Cancer. 2013;60(2):175-184.
   doi:10.1002/pbc.24367
6. National Institute for Health and Care Excellence. Suspected cancer: recognition and referral. NICE guideline
   NG12. London: NICE; 2015 (updated 2026).
7. Children's Cancer and Leukaemia Group. Information for professionals, section 6 (treatment): introduction to
   steroids. Available from: https://www.cclg.org.uk/information-professionals/outreach-information-resource/section-6-treatment/introduction-steroids
8. World Health Organization. WHO consolidated guidelines on tuberculosis. Module 5: management of tuberculosis in
   children and adolescents. Geneva: World Health Organization; 2022.
9. Katz AL, Webb SA; Committee on Bioethics. Informed consent in decision-making in pediatric practice. Pediatrics.
   2016;138(2):e20161485.
10. Baile WF, Buckman R, Lenzi R, Glober G, Beale EA, Kudelka AP. SPIKES—a six-step protocol for delivering bad
    news: application to the patient with cancer. Oncologist. 2000;5(4):302-311. doi:10.1634/theoncologist.5-4-302

The article's DOI is the verified one in `scripts/cmcr-105-sources.json` (publisher check 2026-10-29). The other DOIs
and bibliographic details were confirmed by web search on 2026-11-13 (Blood 2020 consensus,
Histiocyte Society 2016, WHO-HAEM5 myeloid/histiocytic paper, Euro Histio Net 2013, SPIKES); NICE NG12's 2026 update
date, the FDA approvals of vemurafenib (2017, adults with BRAF-V600 ECD) and cobimetinib (2022, adults with
histiocytic neoplasms), the CCLG steroid statement and the AAP 2016 statement were confirmed the same way. No DOI is
given for Katz 2016 because it was not confirmed. The NCCN Histiocytic Neoplasms guideline (version 2.2021, J Natl
Compr Canc Netw 2021) was consulted but is not cited: it is written for adults and adds nothing to the 2020 consensus
for this child.

### To verify

**In the source article (the source pass):**
* Vital signs, weight and height on admission; any examination of the knees, spine or other systems.
* The imaging method and date for each finding (X-ray, CT, MRI, bone scan); whether the knees and leg long bones
  were imaged (ECD's typical diaphyseal and metaphyseal osteosclerosis); disc spaces and any soft tissue or canal
  extension at T2 and T10.
* Whether 肉芽组织 is meant as granulation tissue or granulomatous (xanthogranulomatous) tissue; Touton giant
  cells; any further stains (CD163, factor XIIIa, langerin, BRAF VE1) and any culture of the tissue.
* The side and method of the iliac biopsy, given the left-sided signs and the right iliac lesion.
* Whether a blood film, marrow, LDH, alkaline phosphatase, calcium, renal and liver tests or urine and plasma
  osmolality were done.
* The course over the nine months before this assessment: earlier care and medicines, night pain, fevers.
* Any treatment given before the family declined further treatment (1.0.0's README mentions "historical drug doses"
  and "historical therapeutic pessimism"), the family's reasons, and any later course or outcome.
* Whether the article reports any molecular test or organ staging (1.0.0's feedback said BRAF was not reported).

**In the guidance:**
* NICE NG12: the 2026 update date, and that the children's recommendations quoted (very urgent full blood count
  within 48 hours for persistent or unexplained bone pain; a very urgent X-ray considered for unexplained bone pain or
  swelling) are unchanged in the current version.
* CCLG's steroid statement: the date or version of the web resource.
* Goyal 2020: the exact wording on BRAF V600E testing in every patient and wider MAPK testing when negative; the
  baseline evaluation list (PET-CT including the legs, brain MRI, cardiac assessment, endocrine evaluation); the
  statement that most patients need treatment; the place of corticosteroids; and the full author list after the
  third author.
* Haupt 2013: the diagnostic criteria (CD1a and/or CD207) and the LCH induction doses quoted in `lch-chemo-now`
  (vinblastine 6 mg/m² weekly; prednisolone 40 mg/m²/day).
* WHO Module 5 (2022): the wording on bacteriological confirmation in children and the treatment duration for bone
  and joint TB (the case says only "at least six months").
* The WHO haemoglobin threshold behind the L flag (115 g/L at 5–11 years).
* Paediatric doses quoted as formulas (paracetamol 15 mg/kg per dose, at most four doses in 24 hours; prednisolone
  1–2 mg/kg/day, at most 60 mg) against the BNF for Children and 中国国家处方集（儿童版）.
* The author lists abbreviated with "et al." in references 2–6 and the DOI of Katz 2016.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* Case card: spoiler-free title ("Bone pain in several places and a limp · girl aged 11 years 5 months"), summary
  and triage note (a handover, no longer an instruction); haematology removed from the specialties; difficulty 4,
  35 minutes; topic tags.
* Patient: the girl speaks for her own symptoms and her parent for the rest; case-specific persona, opening line
  and lay unknowns; two labelled teaching wishes.
* Four phases with descriptions, the pathology phase gated on the biopsy booking, the outcome phase on every
  decision and the staging objective.
* 22 history items, 6 examination findings, 19 investigations (structured values, record reviews, unrecorded tests),
  11 interventions with harm texts and the `critical` decision on the high-risk ones; the report's diagnosis moved
  out of the histology into the outcome record.
* Five decisions at the real decision points (red flags, the plan for multifocal bone lesions, the biopsy reading,
  the pre-treatment work-up, the family conversation) with neutral option ids, feedback naming guidance and year,
  and no length cue beyond the one allowed.
* 12 rubric items with two critical acts, avoided-harm items with `scoredWhen`, and a case-specific communication
  item.
* Staff (attending, nurse, radiologist, pathologist), six objectives, debrief with key reasoning, five dated
  teaching points, seven unknowns and ten references; 40-utterance matcher corpus.
* Review status `editorial` (2026-10-30) with the standard notes; `extensions` in the collection schema.

### 1.0.0 — 2026-10-28

Initial template adaptation (three generic decisions, no interventions, a first-try critical item, template history
slots). Superseded by 1.1.0.

## Validation

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-655474/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-655474 --lang en                                                 # 75 steps · 6/6 · 5/5 · utterances 40/40 · 30/30 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-655474                       # depth floor, do-nothing 0, wrong-first 17/30 < 30/30
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-655474:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-655474:"  # in-world demonstration, en + zh-CN
```

All five passed on 2026-11-13.

## 中文摘要

**病例概要：** 11岁5个月女孩，骨痛从双膝开始，九个月来累及腰背、肋骨和髋部；近四个月跛行、下蹲时左髋痛，伴消瘦，无多饮多尿。查体躯干和骨盆左倾、跛行，骶尾部压痛，左侧4字试验阳性，局部无红热破溃，四肢肌力、肌张力和反射正常。血红蛋白108 g/L，白细胞7.8×10⁹/L，血小板324×10⁹/L，血沉38 mm/h，C反应蛋白22.8 mg/L；影像示T2、T10椎体扁平，L3、L5、S2低密度改变，右髂骨溶骨性病变，髋和骶髂关节间隙正常。髂骨活检见黄色肉芽组织、纤维化和泡沫样组织细胞，CD68、AACT阳性，CD1a、S100阴性，原报告诊断儿童Erdheim–Chester病。家长拒绝进一步治疗，之后的结局没有记录。病例事实沿用1.0.0版，尚未对照原文全文核对。

**学习目标：** 识别不能按生长痛处理的骨痛危险信号并立即检查（NICE NG12）；对伴椎体扁平的多部位骨病变先排除白血病、再取组织，取样前不用激素；把CD68阳性、CD1a和S100阴性的泡沫样组织细胞判读为非朗格汉斯细胞组织细胞病，并说明ECD要结合临床和影像诊断；按2020年国际共识在治疗前完成BRAF/MAPK检测和全身分期；说明当前靶向和常规治疗的选择；用SPIKES与孩子和家长沟通，争取孩子的认同。

**关键决策：** ①骨痛的危险信号与第一步检查；②多部位骨病变的确诊计划（涂片、骨髓、髂骨活检，取样前不用激素）；③活检判读（非朗格汉斯细胞组织细胞病，首先考虑ECD，还缺什么）；④治疗前评估（多选：分子检测、全身分期、内分泌检查）；⑤与孩子和家长的谈话方式。

**复盘要点：** 危险信号来自病史和查体；没有组织就治疗是最危险的捷径；CD1a和S100阴性指向黄色肉芽肿家族，ECD要结合全身表现；治疗取决于突变和受累器官；家长拒绝治疗是沟通结局，不是对现代治疗的评价。待核实的内容见上文“To verify”。

**安全结果：** 活检取样前给泼尼松龙或按LCH方案化疗是本例的危险错误（`critical: true`），无论得分多少都判为安全不合格；经验性抗结核、按生长痛出院和无BRAF结果用维莫非尼是可纠正的错误（`critical: false`），计入安全项扣分。
