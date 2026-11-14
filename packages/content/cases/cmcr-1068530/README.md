# cmcr-1068530 — Right hip pain after bowel cancer surgery · 29-year-old woman

Version 1.1.0 (2026-11-14). Re-authored to the library's clinical content standard from the patient facts that
version 1.0.0 extracted from a published case report; those facts have **not yet been checked against the full source
article**, and the case is **not yet reviewed by a licensed clinician**. Have an oncologist, clinical geneticist or
gastroenterologist review it before teaching use.

## Case card

| | |
|---|---|
| Setting | General hospital: an inpatient ward admission (three phases), then a clinic visit months later, then the reported outcome. Static clock: no physiology is simulated. |
| Level | Final-year medical students, foundation doctors and residents in oncology, gastroenterology or general medicine. Difficulty 4/5. |
| Time | About 40 minutes, plus 15–20 minutes of debrief. |
| The patient | Zhou Zhiyuan (pseudonym), a 29-year-old woman with bowel symptoms since adolescence, a rectal and total colonic resection with an ileostomy and 12 cycles of FOLFOX6, admitted with three months of right hip pain. She answers for herself; no companion is recorded. |
| What the learner does | Takes her history at the bedside, examines her, reads her records at the ward station, orders tests, gives treatments and makes referrals, answers five decisions on the case board, and sees her again at a later clinic visit. |
| Staff | Nurse Tang (ward, ISBAR handover), Dr Liang (medical oncology attending, Socratic, PEARLS debrief), Dr Shen (clinical genetics), Dr Fang (radiology). |
| Specialties | Oncology, clinical genetics, gastroenterology. |
| Languages | zh-CN and en, the same facts in both. |
| Review | Editorial (AI-assisted); not yet reviewed by a licensed clinician; facts not yet checked against the full source article (`extensions.sourceTextChecked: false`). |

## Learning outcomes

1. Treat new bone pain with a hard left supraclavicular node and lumbar tenderness after rectal cancer treatment as metastatic recurrence until proven otherwise, and read a staging PET-CT report site by site.
2. Choose the most accessible, safest lesion for tissue (blood count and clotting checked first) and request MMR/MSI, RAS and BRAF testing to guide systemic treatment.
3. Handle an indeterminate adrenal lesion in a patient with cancer as ESE/ENSAT 2023 advises: metanephrines first, and no biopsy unless phaeochromocytoma is excluded and histology would change management.
4. Explain why normal colonoscopies in her parents and older sister do not exclude an inherited polyposis (de novo APC variants, recessive MUTYH), and arrange germline testing of the patient first, then predictive testing and surveillance for relatives (BSG/ACPGBI/UKCGG 2020).
5. Plan care for painful bone metastases: single 8 Gy radiotherapy when uncomplicated, a bone-modifying agent after a dental check with calcium and vitamin D, regular analgesia, and cord compression warning signs before discharge (ESMO 2020; NICE NG234 2023).
6. Respond to new difficulty passing urine and leg swelling in a patient with lumbar metastases as possible cord or cauda equina compression (MRI within 24 hours; NICE NG234 2023), confirm the doses she actually received with the radiotherapy department before any further radiotherapy, and meet her refusal of admission by checking capacity, agreeing what she will accept and safety-netting — without withdrawing care.

## Clinical summary (spoilers)

**The recorded course (version 1.0.0's facts).** A 29-year-old woman has had recurrent abdominal pain, diarrhoea and
bleeding since adolescence — more than ten years in the Chinese extraction, 17 years in the English — with three to
seven stools a day, often with white mucus and dark-red blood, and no specific treatment in the early years. Bowel
cancer and many polyps were eventually found: the colonoscopy and resection pathology record multiple polyps throughout
the colon, the largest about 1.2 × 1.2 cm, tubular and tubulovillous adenomas, and a moderately to well differentiated
rectal adenocarcinoma invading the outer layer of the bowel wall, with 6 of 27 lymph nodes positive. She had a rectal
and total colonic resection with an ileostomy and then 12 cycles of FOLFOX6, with regular follow-up afterwards. Her
parents and older sister had colonoscopies without obvious abnormality. She is admitted with three months of right hip
pain. On examination there is a hard, poorly mobile left supraclavicular node of about 1 cm without redness or
tenderness, a right lower abdominal stoma with healed scars, mild tenderness over the right hip and lumbar spine, and no
leg oedema. A recent PET-CT, done for the hip pain, shows abnormal uptake in pelvic-wall, retroperitoneal and left
supraclavicular lymph nodes, the right acetabulum, L3 and L5, reported as metastases, and a bulky left adrenal in which
metastasis is not excluded. The notes give a clinical and pathological diagnosis of familial adenomatous polyposis (FAP);
no APC or other germline result is recorded. She had bone-protective treatment and radiotherapy to the hip and lumbar
spine (the dose entries read "4000 Gy" and "5000 Gy"); her pain eased in hospital but persisted afterwards, and she
declined further systemic chemotherapy. Months later she had oedema of the lower limbs and vulva and difficulty passing
urine; admission was advised and she declined. Nothing later, including survival, is recorded.

**What the case teaches.** Recurrence first (and confirmed in tissue from the accessible node, which also gives the
biomarkers); the adrenal is not the target (metanephrines first; ESE/ENSAT 2023); a polyposis phenotype with cancer
before 30 needs germline testing of the patient herself, whatever her family's colonoscopies show (BSG/ACPGBI/UKCGG 2020;
EHTG–ESCP 2024); painful bone metastases are treated with radiotherapy, analgesia and a bone-modifying agent after a
dental check (ESMO 2020; NICE NG234 2023); months later, bladder symptoms with lumbar metastases are possible cord or
cauda equina compression — an oncological emergency with an MRI within 24 hours (NICE NG234 2023); a dose record of
thousands of gray must be checked with the radiotherapy department, not converted on a guess; and declining treatment
is not declining care (capacity, negotiation, safety-netting, early palliative care; ASCO 2024).

## Scenario timeline and physiology

The clock is static (`clock.mode: "static"`, no `physiology`): a historical report establishes no physiological
response model, so no vital sign moves and results appear as soon as they are read. Phases advance by themselves when
their `enterWhen` holds; none can be switched to by hand.

| Phase | Opens when | What is there |
|---|---|---|
| 1 `admission` — Admission assessment (ward) | Start | Her history; four examination findings; the earlier colonoscopy and resection pathology at the ward station. Decision 1 (hip pain) opens once her hip pain, what was found and the chemotherapy have been asked about, all four examinations done and the pathology read; decision 2 (hereditary) once the pathology is read and her bowel and family history asked. |
| 2 `workup` — Work-up | Decision 1 answered correctly | The PET-CT report (done before admission; staged here as teaching design). Decision 3 (tissue and adrenal). Bloods, the node biopsy, tumour biomarkers, metanephrines, germline panel and imaging can be ordered; none has a recorded result. |
| 3 `treatment` — Inpatient care | Decisions 2 and 3 answered correctly | The recorded diagnosis (FAP, no germline result); her wish not to have more chemotherapy; decision 4 (bone care). Analgesia, spine MRI, radiotherapy, dental review, bone-modifying agent, oncology, palliative care, warning-sign advice. |
| 4 `later` — Seen again months later (clinic) | Decision 4 answered correctly, radiotherapy referred and the bone-modifying agent given | The patient moves to the outpatient slot. New swelling and urinary difficulty, her refusal of admission, the inpatient treatment record (dose entries "4000 Gy", "5000 Gy"). Decision 5. |
| 5 `outcome` — Reported outcome | All five decisions answered correctly, admission advised and the urgent MSCC referral made **during the later visit** (`whenIndicated`) | The follow-up record: admission advised and declined; nothing later recorded. Not switchable. |

## Decisions and assessment

### Objectives (HUD chapters)

1. **Take her history** — the presenting complaint, the bowel history, what was found, the operation, the chemotherapy and the family's colonoscopies.
2. **Examine her and read her earlier records** — the four examination findings and the pathology record.
3. **Make sense of her pain and her family history** — decisions 1 and 2 and the genetics referral.
4. **Confirm the diagnosis safely** — read the PET-CT; order blood count, clotting, node biopsy, tumour biomarkers and metanephrines; decision 3.
5. **Treat her pain and plan her care** — decision 4; analgesia, spine MRI, radiotherapy, dental review, bone-modifying agent, oncology, palliative care, warning signs.
6. **See her again when things change** — decision 5; advise admission; the urgent MSCC referral; the capacity discussion; read the follow-up record.

No objective holds a condition that can become permanently false (no phase leaf, no `whenIndicated`, no
`decidedFirstTry`): a learner who acts late can still finish.

### Decisions

1. **`hip-pain` — leading concern and first step** (admission). Key `recurrence-first`: metastatic recurrence until
   proven otherwise; read the PET-CT, find a lesion to sample safely and stage the disease. Why: new persistent bone pain
   after a node-positive rectal cancer, a hard poorly mobile left supraclavicular node and lumbar tenderness; NICE NG234
   (2023) Box 1 lists a past cancer with localised spinal tenderness among the features of spinal metastases.
   Distractors: mechanical hip pain with physiotherapy for six weeks; avascular necrosis with a hip MRI only; referred
   pain with a reactive node and review in three months.
2. **`hereditary` — the hereditary question** (admission or work-up). Key `germline-patient-first`: clinical genetics
   now, germline testing of the patient (APC, MUTYH, polyposis panel), predictive testing for her sister once a family
   variant is known. Why: BSG/ACPGBI/UKCGG 2020 Table 2 (CRC at 30 or younger; ≥10 adenomas before 60); EHTG–ESCP 2024
   (15–30% of APC variants de novo); MUTYH recessive; relatives of someone with clinical FAP and no known variant have
   5-yearly colonoscopy from 12–14 until polyposis appears or national screening age. Distractors: normal family
   colonoscopies make it sporadic; test the relatives first; the phenotype alone is enough; defer genetics.
3. **`tissue-plan` — confirm and characterise** (work-up). Key `node-core-biopsy`: ultrasound-guided core biopsy of the
   left supraclavicular node after blood count and clotting, MMR/RAS/BRAF on the tissue, metanephrines for the adrenal.
   Why: ASCP/CAP/AMP/ASCO 2017 (metastatic or recurrent tissue preferred for predictive biomarkers, primary acceptable);
   ESE/ENSAT 2023 R.6.3.1 (metanephrines), R.6.3.4 (imaging follow-up when the adrenal's nature would not change
   management), R.6.3.5 (three criteria before any adrenal biopsy). Distractors: adrenal biopsy first; no biopsy and
   second-line chemotherapy now; acetabular biopsy; watch and repeat the PET-CT.
4. **`bone-plan` — the bone disease during the admission** (inpatient care). Key `rt-bone-agent-analgesia`: regular
   analgesia, radiotherapy to the painful sites (single 8 Gy if uncomplicated), a bone-modifying agent after a dental
   check, and cord compression warning signs. Why: ESMO 2020 bone health (EBRT for localised moderate-to-severe pain and
   single 8 Gy [I, A]; zoledronate or denosumab with life expectancy ≥ 3 months [I, B]; dental evaluation [III, A];
   calcium and vitamin D [I, A]); NICE NG234 2023 (1.10.2, 1.5.3, 1.2.2). Distractors: bone agent alone; long-course
   radiotherapy to every PET-avid site; prophylactic acetabular surgery first; opioids alone waiting for chemotherapy.
5. **`new-symptoms` — the later visit** (clinic). Key `urgent-mri-and-capacity`: possible cord or cauda equina
   compression; advise admission for a whole-spine MRI within 24 hours; if she still declines, check capacity, agree
   what she accepts and safety-net. Why: NICE NG234 2023 (1.3.2 immediate MSCC coordinator, 1.5.2 MRI within 24 hours,
   1.8.1 dexamethasone 16 mg); NICE NG158 (Wells; active cancer scores a point) for the leg swelling; Mental Capacity
   Act 2005 ss1 and 3 as one legal model. Distractors: lymphoedema with stockings, a diuretic and a routine MRI; admit
   her regardless of refusal; close her follow-up; a urinary infection with review in two weeks.

Every option has feedback of its own; the key is the uniquely longest option only in decision 1 (lint-checked, both
languages).

### Rubric (13 deterministic items, total weight 28, + 1 examiner-judged)

| Item | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history` | history | 2 | presenting complaint, bowel history, what was found, operation, chemotherapy, family asked |
| `rb-exam` | examination | 1 | node, abdomen, hip and spine, legs examined |
| `rb-hip-pain` | diagnosis | 3 | decision 1 right first time |
| `rb-records` | investigations | 1 | pathology and PET-CT read |
| `rb-hereditary` | management | 2 | decision 2 right first time + genetics referral |
| `rb-tissue` | investigations | 3 | decision 3 right first time + blood count, clotting, node biopsy, tumour biomarkers, metanephrines ordered |
| `rb-bone` | management | 3 | decision 4 right first time + analgesia + spine MRI ordered in work-up or inpatient care + radiotherapy referral + bone-modifying agent given while indicated (after the dental review and bone bloods) |
| `rb-supportive` | management | 2 | palliative care + oncology review + warning-sign advice during the admission |
| `rb-urgent` | management | 3 | **critical** — at the later visit, admission advised and the urgent MSCC referral made, both while indicated |
| `rb-refusal` | management | 2 | decision 5 right first time + capacity discussion and dexamethasone at the later visit |
| `rb-safety` | safety | 3 | **critical** — none of: adrenal biopsy; routine review given while contraindicated (later visit); diuretic; admission against her refusal; discharge from follow-up; dexamethasone given while contraindicated. Scored once decision 3 or 5 is attempted or any of these acts is given. |
| `rb-rt-dose` | safety | 2 | treatment record read at the later visit + radiotherapy summary requested then |
| `rb-outcome` | investigations | 1 | follow-up record read |
| `rb-communication` | communication | 1 | examiner-judged (SPIKES for the news of spread; teach-back; exploring her refusal; no unrecorded prognosis) |

### How wrong choices score (measured with core `assess` on 2026-11-14)

| Path | Deterministic score | Critical items missed | Safety outcome |
|---|---:|---|---|
| Reference path (`solution`) | 28/28 (100 %) | none | passed |
| Start and do nothing | 0/25 (0 %) | `rb-urgent` | passed (nothing given); the case cannot be finished |
| Wrong first answer at all five decisions, then right | 15/28 (54 %) | none | passed |
| Wrong first answer at decision 1, 3 or 4 only | 25/28 (89 %) | none | passed |
| Wrong first answer at decision 2 or 5 only | 26/28 (93 %) | none | passed |
| Reference path + CT-guided adrenal biopsy (work-up) | 25/28 (89 %) | `rb-safety` | **failed** (critical intervention) |
| Reference path + routine clinic review in four weeks at the later visit | 25/28 (89 %) | `rb-safety` | **failed** (critical intervention) |
| Reference path + routine clinic review during the admission | 28/28 (100 %) | none | passed (not contraindicated there) |
| Reference path + diuretic for the swelling | 25/28 (89 %) | `rb-safety` | passed |
| Reference path + admission against her refusal | 25/28 (89 %) | `rb-safety` | passed |
| Reference path + discharge from oncology follow-up | 25/28 (89 %) | `rb-safety` | passed |
| Reference path + dexamethasone in the admission phase | 25/28 (89 %) | `rb-safety` | passed |
| Bone-modifying agent before the dental review and bloods (then the reference path) | 25/28 (89 %) | none (`rb-bone` lost: the later valid dose is refused, `maxDoses: 1`) | passed |
| Reference path without the urgent MSCC referral (or without advising admission) | 24/28 when it stops | `rb-urgent` | passed; the outcome phase never opens, so the case cannot be finished until the act is done at the visit |
| Reference path without the radiotherapy summary request | 26/28 (93 %) | none | passed |
| Reference path without dexamethasone at the later visit | 26/28 (93 %) | none | passed |
| Reference path without the inpatient spine MRI | 25/28 at the end of the path | none | passed; objective 5 waits for an MRI order |

Decisions are scored with `decidedFirstTry`, so guessing costs the item. The repository check
(`scripts/case-check.ts`) reports: reference 100 %, do nothing 0/25, wrong first at every decision 54 %.

### Critical items

- `rb-urgent` is an act done in time: advising admission and the urgent MSCC referral are scored with
  `{intervened, whenIndicated: true}` and a window of the later visit, and the outcome phase waits for both, so they
  cannot be credited after the follow-up record is read.
- `rb-safety` is the avoided-harm item: its leaves are the harmful interventions, and `scoredWhen` lists each of them
  and the decisions that expose the choice (3 and 5).

**Safety outcome.** Two interventions are marked `critical: true`, and giving either while contraindicated fails the
run's safety outcome whatever the score. **CT-guided adrenal biopsy** (`adrenal-biopsy`, risk high, always
contraindicated here): ESE/ENSAT 2023 R.6.3.5 allows adrenal biopsy only when phaeochromocytoma has been excluded, the
lesion is not benign on imaging and histology would change management; no metanephrine result exists, her nodal and
bone disease already defines the stage, and puncturing an unsuspected phaeochromocytoma can cause a hypertensive crisis.
**A routine clinic review for the new symptoms** (`routine-review`, risk moderate, contraindicated at the later visit):
new bladder symptoms with lumbar metastases are an oncological emergency (NICE NG234 2023); a four-week wait risks
permanent paralysis and loss of bladder function. The same booking during the admission is not contraindicated. Marked
explicitly `critical: false` (recoverable misjudgements that cost `rb-safety` or another item): the **bone-modifying
agent** before the dental review and bloods (ESMO 2020; osteonecrosis of the jaw and hypocalcaemia are risks the next
step can still mitigate), **dexamethasone** outside the later visit (no neurological symptom or sign recorded; NICE NG234
1.8.1, 1.8.3), a **diuretic** for the swelling (NICE NG158: assess for DVT first), **admission against her refusal**
(MCA 2005 as one legal model) and **discharge from follow-up** (ASCO 2024; NICE NG234 1.2.2). The reference path gives
nothing while contraindicated and has no dose error (`cases verify`).

## Reference path (`solution`)

73 steps. Admission: start; ask the 21 admission items (presenting complaint, hip pain detail, bowel history, stools,
early care, what was found, timing of diagnosis, operation, chemotherapy, side effects, follow-up, family, other
relatives, children, past illnesses, current medicines, allergies, weight and appetite, leg and bladder symptoms,
smoking and work, concerns); examine the node, abdomen, hip and spine, and legs; regular analgesia; order and read the
pathology record; decision 1 → work-up. Work-up: order and read the PET-CT; decision 2; clinical genetics referral;
order blood count, clotting, renal function/calcium/albumin, CEA, metanephrines, node biopsy, tumour biomarkers;
decision 3 → inpatient care. Inpatient care: order and read the diagnosis record; ask about more chemotherapy and her
reasons; order the spine MRI; radiotherapy referral, dental review, bone-modifying agent, oncology review, palliative
care, warning-sign advice; decision 4 → the later visit. Later visit: ask about the new symptoms, their onset, the hip,
back and leg symptoms, admission and her reasons; order and read the inpatient treatment record; advise admission; the
urgent MSCC referral; bladder scan and leg vein ultrasound; dexamethasone 16 mg orally; the capacity discussion; ask
the radiotherapy department for the treatment summary; decision 5 → outcome. Outcome: order and read the follow-up
record; finish.

## Clinical numbers check

| Number | Where | Source | Note |
|---|---|---|---|
| 29 years, female | patient | 1.0.0 | — |
| Hip pain 3 months | history, triage, records | 1.0.0 (onset 3 months; opening line "several months") | the two are compatible; 3 months is used |
| Bowel symptoms 17 years / 十几年 | `bowel-history` | 1.0.0 en / zh | both readings kept in both languages; onset in adolescence (青春期) |
| 3–7 stools a day, white mucus, dark-red blood | `stool-pattern` | 1.0.0 | "often" kept |
| Largest polyp about 1.2 × 1.2 cm | pathology record | 1.0.0 | number of polyps not recorded |
| 6 of 27 nodes positive | pathology record | 1.0.0 | pN category not recorded and not derived |
| 12 cycles of FOLFOX6 | `chemo` | 1.0.0 (en "12 cycles", zh "12次") | drugs and doses not recorded |
| Node about 1 cm | `node-exam` | 1.0.0 | — |
| L3, L5 | PET-CT | 1.0.0 | — |
| "4000 Gy", "5000 Gy" | treatment record | 1.0.0 | not converted; a centigray entry is one possibility the radiotherapy department must confirm; site of each entry not recorded |
| Under 30 at cancer diagnosis | decision 2 prompt | derived | she is 29 at admission and the cancer was found earlier |
| 8 Gy single fraction | decision 4, teaching | ESMO 2020 [I, A]; NICE NG234 1.10.2 | guidance, not her recorded dose |
| Zoledronic acid 4 mg IV / denosumab 120 mg SC every 4 weeks | `bone-agent` dose text | ESMO 2020 | alternatives, so no `doseSpec`; her drug is not recorded |
| Life expectancy ≥ 3 months | decision 4 feedback | ESMO 2020 [I, B] | — |
| Dexamethasone 16 mg orally, then 16 mg daily | `dexamethasone` (`doseSpec` 16 mg PO) | NICE NG234 1.8.1 | not recorded as given in the report |
| MRI within 24 hours / within 1 week | decisions 4–5 | NICE NG234 1.5.2 / 1.5.3 | — |
| CRC ≤ 30 years; ≥ 10 adenomas before 60 | decision 2 | BSG/ACPGBI/UKCGG 2020 Table 2 | — |
| Colonoscopy from 12–14, 5-yearly | decision 2, geneticist | BSG/ACPGBI/UKCGG 2020 | until polyposis or national screening age (FAP unlikely if none by 50) |
| 15–30% de novo | decision 2 feedback | EHTG–ESCP 2024 | — |
| Adrenal masses 2–3× more common in FAP | decision 3 feedback | EHTG–ESCP 2024 OEM.5–6 | — |
| Wells: active cancer 1 point | decision 5, diuretic harm | NICE NG158 (Table 1) | ultrasound within 4 hours when DVT is likely (1.1.3) |

No vital sign, blood value or reference range is recorded or invented.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions:** How did it feel to find spread to lymph nodes and bone in a 29-year-old? And when she said no to admission?
- **Description:** Walk through what you knew at admission, what the PET-CT added, and what changed at the later visit.
- **Analysis:**
  - Which findings made a simple musculoskeletal cause unlikely, and what would have happened with six weeks of physiotherapy?
  - Why the node and not the adrenal or the acetabulum? What must be known before anyone puts a needle in an adrenal lesion?
  - Her parents and sister had normal colonoscopies — why does that not settle the hereditary question, and whose DNA is tested first?
  - What do you check before a bone-modifying agent, and why?
  - What does new difficulty passing urine mean with L3 and L5 metastases, and how fast must you act?
  - The record says "4000 Gy" and "5000 Gy" — what do you do with that before any further radiotherapy?
  - She declined admission: how did you assess capacity, and what did you still offer her?
- **Summary:** One thing you will do differently with the next patient with bone pain after cancer, and one thing you will say differently when a patient declines.

### Common learner errors and how the case surfaces them

- **A trial of analgesia and physiotherapy for "mechanical" hip pain** — decision 1 distractor; feedback cites NICE NG234 Box 1.
- **Biopsying the adrenal or the bone** — decision 3 distractors and the critical `adrenal-biopsy` intervention (safety outcome fails).
- **"The family is clear, so it is sporadic"** — decision 2 distractor; feedback cites EHTG–ESCP 2024 and BSG 2020.
- **Testing relatives before the patient** — decision 2 distractor.
- **Starting a bone-modifying agent before the dental check and bloods** — `bone-agent` is contraindicated until both are done; `rb-bone` is lost.
- **Steroids "for pain" during the admission** — `dexamethasone` outside the later visit costs `rb-safety`.
- **A routine appointment for new bladder symptoms** — the critical `routine-review` at the later visit fails the safety outcome.
- **A diuretic for the swelling** — costs `rb-safety`; feedback: DVT assessment (NICE NG158) and spinal imaging first.
- **Overriding or abandoning her** — admission against her refusal and discharge from follow-up both cost `rb-safety`.
- **Copying the dose record** — `rb-rt-dose` rewards asking the radiotherapy department for the true doses; the attending asks about it.

### Teaching points for the debrief

The six dated, guideline-attributed teaching points in `debrief.teachingPoints`: tissue and biomarkers
(ASCP/CAP/AMP/ASCO 2017); the indeterminate adrenal (ESE/ENSAT 2023; EHTG–ESCP 2024); germline testing and family
surveillance (BSG/ACPGBI/UKCGG 2020; EHTG–ESCP 2024); painful bone metastases (ESMO 2020; NICE NG234 2023); metastatic
cord compression and the previous radiotherapy dose (NICE NG234 2023, 1.3.2, 1.5.2, 1.8.1, 1.10.10); refusal, capacity
and palliative care (Mental Capacity Act 2005 as one legal model; ASCO 2024). Each "then and now" line contrasts what
the report records with what today's guidance asks for.

## Embodied mode

- **Facility:** general hospital. Phases 1–3 use an inpatient ward bed; phase 4 moves her to the outpatient slot
  (`location: {"setting": "outpatient"}`). She lies throughout (`posture: "lying"`).
- **Records vs bedside:** the pathology, PET-CT, diagnosis, treatment and follow-up records are read at the ward-station
  records terminal (`requires: ["records"]`, `performedAt: "records"`, risk none). History and examination are at the
  bedside. Blood tests go to the laboratory; the node biopsy to histopathology; tumour biomarkers and the germline panel
  to the molecular laboratory; metanephrines to the endocrine laboratory; the MRI needs the patient taken to the scanner
  (she cannot walk: a bed or trolley); bladder scan and leg vein ultrasound use the ultrasound machine.
- **The urgent referral at the later visit** is a consult, so it needs no transport; the MRI order itself remains
  available.
- **Non-verbal handling:** none needed; she speaks for herself. No companion is recorded.
- **Capabilities:** records, lab-hematology, lab-chemistry, lab-endocrine, histopathology, molecular, mri, ultrasound,
  medications — all provided by the general hospital (`caseCapabilityGaps` empty). The offline autopilot finishes in both
  locales with the clinical-mode score.

## Source and adaptation (fidelity limits)

- **Source:** 杨雁鸿, 唐利娟, 周文文, 才丽娜. 家族性结肠息肉病一例. 中华结直肠疾病电子杂志. 2013;2(1):32-33.
  doi:10.3877/cma.j.issn.2095-3224.2013.01.08 (verified by the project's publisher check, 2026-10-29).
  https://rs.yiigle.com/cmaid/1068530
- **The facts are version 1.0.0's extraction** (commit 88ed0d2); the check against the full article is pending
  (`extensions.sourceTextChecked: false`). Nothing was added: every patient fact in 1.1.0 traces to 1.0.0.
- **Extraction summary.** Age and sex → patient. Right hip pain (several months; three months) → `presenting`,
  chief complaint, triage note. Recurrent abdominal pain, diarrhoea and bleeding (17 years en / 十几年 zh) → `bowel-history`.
  Symptoms from adolescence, no specific early treatment → `bowel-history`, `early-care`. 3–7 stools/day with white
  mucus and dark-red blood → `stool-pattern`. Cancer and many polyps found, surgery and chemotherapy, hip pain after →
  `cancer-found`. Rectal and total colonic resection, ileostomy → `operation`. 12 cycles of FOLFOX6 after surgery →
  `chemo`. Parents' and sister's colonoscopies without obvious abnormality → `family`. Regular follow-up after surgery;
  recent PET-CT for the hip pain → `follow-up`, PET-CT record note. Node, stoma and scars, hip and lumbar tenderness, no
  leg oedema → four examination findings. Pathology → `resection-pathology`. PET-CT → `pet-ct`. FAP diagnosis without a
  germline result → `diagnosis-record`. Bone protection, hip and lumbar radiotherapy, pain relief then persistence,
  chemotherapy declined, dose entries 4000/5000 Gy → `treatment-record`, `hip-now`, `chemo-wish`. Months later oedema of
  legs and vulva, difficulty passing urine, admission advised and declined → `new-symptoms`, `new-onset`,
  `admission-wish`, `outcome-record`. No final outcome → outcome record and unknowns.
- **Contradictions kept (both readings):** 17 years (en) vs 十几年 (zh); "colonic" (en) vs 全结肠 "throughout the colon"
  (zh); "extending through the wall" (en) vs 侵外膜 "invading the adventitia" (zh) — written as "invading the outer layer
  of the bowel wall (the adventitia)"; "pelvic" (en) vs 盆壁 "pelvic wall" (zh); adrenal "indeterminate" (en) vs
  不排除转移 "metastasis not excluded" (zh); "sister" (en) vs 姐姐 "older sister" (zh); "without redness or tenderness"
  (en) vs 无红肿压痛 (zh, which also says no swelling); "bone-directed treatment" (en) vs 骨保护 "bone protection" (zh).
- **Inferences (derived, not new):** cancer diagnosed before 30 (she is 29); the dose entries cannot be gray as written
  (a teaching judgement, as in 1.0.0).
- **What stays unknown:** vital signs, blood results, the number of polyps, dates and her age at each stage, stage and
  margins, MMR/MSI/RAS/BRAF, any germline result, any metastatic biopsy, spine MRI, adrenal biochemistry and density,
  the bone-protective drug, the true radiotherapy doses, analgesics, her reasons for declining, the cause of the later
  symptoms, survival — all said in her voice ("I'm not sure, doctor.") or as "No result is recorded for this test."
- **Labelled teaching devices:** the staging of the records (the PET-CT, done before admission, opens in phase 2; the
  diagnosis record in phase 3; the treatment record at the later visit; the follow-up record last); the clinic setting
  of the later visit (1.0.0 does not say where she was seen); placing her refusal of further chemotherapy in the
  inpatient phase (1.0.0 does not say when she declined); her refusal of admission spoken by her; the four staff and
  their knowledge; the responses of the learner's own acts (referrals accepted; nothing they produce is recorded).
- **Privacy:** pseudonym only (周知远 / Zhou Zhiyuan); no dates, hospitals, cities or identifiers. No figure is approved
  for display (`assets: []`).
- **Version 1.0.0's teaching errors replaced:** a hindsight critical item (the safety decision answered after reading the
  outcome), no interventions, generic history slots answered "the source notes do not provide that information", and a
  hereditary decision that did not ask who is tested first.

## Matcher notes

- 29 history items, 7 required; 43 test utterances (en and zh-CN), 3 look-alike negatives, at least one paraphrase for
  every required item; `cases verify` 43/43.
- One `presenting-complaint` item answers the plain openers in both languages ("what brings you in", "what happened",
  "what's the problem", "where does it hurt", "how long"; 怎么了, 哪里不舒服, 怎么回事, 有什么不舒服, 多久了, 什么时候开始的),
  probed with `matchHistory` in the admission phase. At the later visit `new-symptoms` supersedes it, so the same openers
  reach the new complaint.
- Collisions fixed while probing: "chemotherapy" contains "mother" (the family item uses "mum", "mom", "dad"); bowel
  history excludes the operation, findings, follow-up and chemotherapy words; the new-symptoms item yields timing
  questions to `new-onset`; the reasons for declining chemotherapy and admission exclude each other; "Are you pregnant?"
  reaches no item (the fallback "That I couldn't tell you, doctor.").
- Unknown items answer in her voice; none uses authoring language.

## References

1. 杨雁鸿, 唐利娟, 周文文, 才丽娜. 家族性结肠息肉病一例. 中华结直肠疾病电子杂志. 2013;2(1):32-33. doi:10.3877/cma.j.issn.2095-3224.2013.01.08. Available from: https://rs.yiigle.com/cmaid/1068530
2. Monahan KJ, Bradshaw N, Dolwani S, et al. Guidelines for the management of hereditary colorectal cancer from the British Society of Gastroenterology (BSG)/Association of Coloproctology of Great Britain and Ireland (ACPGBI)/United Kingdom Cancer Genetics Group (UKCGG). Gut. 2020;69(3):411-444. doi:10.1136/gutjnl-2019-319915
3. Zaffaroni G, Mannucci A, Koskenvuo L, et al. Updated European guidelines for clinical management of familial adenomatous polyposis (FAP), MUTYH-associated polyposis (MAP), gastric adenocarcinoma, proximal polyposis of the stomach (GAPPS) and other rare adenomatous polyposis syndromes: a joint EHTG-ESCP revision. Br J Surg. 2024;111(5):znae070. doi:10.1093/bjs/znae070
4. Fassnacht M, Tsagarakis S, Terzolo M, et al. European Society of Endocrinology clinical practice guidelines on the management of adrenal incidentalomas, in collaboration with the European Network for the Study of Adrenal Tumors. Eur J Endocrinol. 2023;189(1):G1-G42. doi:10.1093/ejendo/lvad066
5. Sepulveda AR, Hamilton SR, Allegra CJ, et al. Molecular biomarkers for the evaluation of colorectal cancer: guideline from the American Society for Clinical Pathology, College of American Pathologists, Association for Molecular Pathology, and American Society of Clinical Oncology. Am J Clin Pathol. 2017;147(3):221-260. doi:10.1093/ajcp/aqw209
6. Coleman R, Hadji P, Body JJ, et al. Bone health in cancer: ESMO Clinical Practice Guidelines. Ann Oncol. 2020;31(12):1650-1663. doi:10.1016/j.annonc.2020.07.019
7. National Institute for Health and Care Excellence. Spinal metastases and metastatic spinal cord compression. NICE guideline NG234. London: NICE; 2023. Available from: https://www.nice.org.uk/guidance/ng234
8. National Institute for Health and Care Excellence. Venous thromboembolic diseases: diagnosis, management and thrombophilia testing. NICE guideline NG158. London: NICE; 2020 (updated 2023). Available from: https://www.nice.org.uk/guidance/ng158
9. Sanders JJ, Temin S, Ghoshal A, et al. Palliative care for patients with cancer: ASCO guideline update. J Clin Oncol. 2024;42(19):2336-2357. doi:10.1200/JCO.24.00542
10. Mental Capacity Act 2005, c. 9, ss. 1-3 (England and Wales). Available from: https://www.legislation.gov.uk/ukpga/2005/9

Guideline statements were checked in the guidelines' own text on 2026-11-14 (BSG 2020 Table 1, Table 2 and the FAP
and MCRA recommendations; EHTG–ESCP 2024 introduction and OEM.5–7B; ESE/ENSAT 2023 R.6.3.1, R.6.3.4, R.6.3.5; ESMO
2020 recommendations; NICE NG234 Box 1, 1.2.2, 1.3.2–1.3.3, 1.5.2–1.5.3, 1.7.1–1.7.3, 1.8.1–1.8.3, 1.10.2, 1.10.6,
1.10.9–1.10.10; NICE NG158 1.1.2–1.1.3 and Table 1; ASCP/CAP/AMP/ASCO 2017 statement 7). The ASCO 2024 referral
recommendation was checked online in the guideline's summary.

### To verify

**The source pass (against the full article) must check:**

1. The duration of the bowel symptoms: 十几年 (zh) or 17 years (en), and the age at onset (青春期).
2. The pathology: polyps throughout the colon (全结肠) or "colonic"; the number of polyps; the largest 1.2 × 1.2 cm;
   the histology; the depth of invasion (侵外膜 / "through the wall") and the pT/pN stage; 6/27 nodes; which findings came
   from colonoscopy and which from the resection specimen.
3. The operation (rectal and total colonic resection with an ileostomy) and the chemotherapy (12 cycles — 12次 — of
   FOLFOX6, after surgery); their dates and her age.
4. The family: "parents and older sister" (姐姐) or "sister", and their colonoscopies without obvious abnormality.
5. The hip pain (several months; three months) and the examination (node about 1 cm, hard, poorly mobile, no redness,
   swelling (红肿) or tenderness; right lower abdominal stoma; healed scars; mild right hip and lumbar tenderness; no
   leg oedema).
6. The PET-CT: pelvic-wall (盆壁) or pelvic nodes; the adrenal wording ("bulky, metastasis not excluded" or
   "indeterminate"); its timing.
7. The diagnosis of FAP (clinical and pathological) and whether any genetic test is reported.
8. The treatment: the bone-protective drug; radiotherapy sites and the dose entries "4000 Gy" and "5000 Gy" (units,
   site of each, fractionation); pain relief in hospital then persistence; when she declined further chemotherapy.
9. The later course: oedema of the legs and vulva, difficulty passing urine, how long after the admission, where she
   was seen, admission advised and declined; any later outcome.

**A clinician of the specialty should confirm:**

1. The critical acts and errors: the urgent referral and admission advice at the later visit as the time-critical act;
   adrenal biopsy and a routine appointment as the critical errors; the other harms as non-critical.
2. Dexamethasone at the later visit when urinary difficulty is the only recorded neurological symptom and pelvic disease
   could also explain it.
3. Single 8 Gy radiotherapy for the weight-bearing acetabular lesion (fracture-risk assessment), and the statement that
   acid decalcification of bone samples can compromise molecular tests (RAS, BRAF, MSI).
4. The use of the Mental Capacity Act 2005 as a legal model in a case from China; local law on refusal of admission.
5. Edition currency: BSG/ACPGBI/UKCGG 2020 and ESMO 2020 bone health remain the latest editions found on 2026-11-14;
   the 2026 ESMO metastatic colorectal cancer guideline could not be read and is not cited — confirm that its biomarker
   recommendations agree with ASCP/CAP/AMP/ASCO 2017 as taught.
6. That a core biopsy (rather than fine-needle aspiration) of the supraclavicular node is the preferred sample for
   biomarkers in this setting.

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- **Template defects replaced.** Three generic decisions of three options → five decisions at the real decision points
  (hip pain, hereditary, tissue and adrenal, bone care, the later visit), 4–5 options each with feedback of its own and
  no length cue. No interventions → 18: the report's management (analgesia, radiotherapy, bone-modifying agent, advising
  admission), today's steps (genetics, dental review, oncology, palliative care, warning signs, MSCC referral,
  dexamethasone, capacity discussion, radiotherapy summary) and six tempting wrong ones with harm texts that name their
  guidance. Fifteen generic history slots answered "the source notes do not provide that information" → 29 items in her
  own voice, unknowns in voice. A hindsight critical item (a decision answered after reading the outcome) → a critical act
  done in time (`rb-urgent`, gated) and a critical avoided-harm item. Records staged across five phases. The README
  rewritten as the facilitator guide.
- **Safety and teaching fixes.** The 1.0.0 key asked only to "discuss refusal" of new urinary symptoms; 1.1.0 teaches
  the MSCC pathway (NICE NG234 2023) as the time-critical act. The 1.0.0 dose warning becomes an act: ask the
  radiotherapy department for the true doses before any further radiotherapy (NG234 1.10.10). Adrenal biopsy before
  metanephrines is the critical error; the bone-modifying agent requires the dental check and bloods first. The
  hereditary decision now asks whose DNA is tested first.
- **Guidance and references.** One reference (GeneReviews) → ten in Vancouver style, the source article first, each
  statement checked in the guideline's own text; review guidelines listed (eight).
- **Facts.** Unchanged in substance; Chinese/English differences of 1.0.0 kept in neutral wording and listed under To
  verify; "puberty" not used (1.0.0 says adolescence); "scars" not "surgical scars".

### 1.0.0 — 2026-10-28

Template version: authored from the source with three decisions of three options, no interventions, fifteen generic
history items, four objectives, a rubric whose critical item was a first-try decision, and a README without measured
assessment beyond the template table.

## Validation

Run from the worktree root (all passed on 2026-11-14):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-1068530/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1068530 --lang en                                                 # 73 steps, objectives 6/6, decisions 5/5, utterances 43/43, rubric 28/28 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-1068530                                       # reference 100 %, do nothing 0/25, wrong first 54 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1068530:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1068530:"  # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要：** 29岁女性（化名周知远），青春期起反复腹痛、腹泻、便血十几年（1.0.0版英文为17年），全结肠多发息肉伴直肠中高分化
腺癌（淋巴结6/27阳性），行直肠及全结肠切除、回肠造口和12次FOLFOX6化疗；父母及姐姐肠镜无明显异常。右髋痛3个月入院：左锁骨上
约1 cm质硬淋巴结，右髋及腰椎轻压痛；PET-CT示淋巴结及右髋臼、L3、L5转移，左肾上腺饱满；临床及病理诊断家族性腺瘤性息肉病，
无胚系检测结果。骨保护及髋部、腰椎放疗（剂量栏记为4000 Gy和5000 Gy）后住院时疼痛缓解、之后持续，拒绝进一步化疗；数月后下肢
及外阴水肿、排尿困难，建议住院仍拒绝，之后结局未记录。事实来自1.0.0版提取，尚未对照原文全文核对；尚未经执业医师审核。

**学习目标：** 按转移复发评估肿瘤治疗后的新发骨痛；从可及的淋巴结取材并检测MMR、RAS、BRAF；肾上腺先查甲氧基肾上腺素类、
不做活检；先为患者本人做胚系检测并安排家属随访；疼痛性骨转移的放疗、骨改良药物和口腔检查；排尿困难按可能的脊髓压迫24小时内
MRI，核实真实放疗剂量，尊重并评估她的拒绝而不放弃照护。

**关键决策：** ① 髋痛首先考虑转移复发并分期；② 先为患者本人做胚系检测，家人肠镜正常不能排除遗传；③ 超声引导下锁骨上淋巴结
穿刺并检测生物标志物，肾上腺先查甲氧基肾上腺素类；④ 规律止痛、放疗（无并发症时单次8 Gy）、口腔检查后骨改良药物并交代警示
症状；⑤ 疑脊髓或马尾受压：建议住院、24小时内MRI，她拒绝时评估决策能力、商定可接受的处理并交代返诊指征。

**复盘要点：** 组织证实与生物标志物（ASCP/CAP/AMP/ASCO 2017）；肾上腺偶发瘤（ESE/ENSAT 2023）；遗传性息肉病（BSG/ACPGBI/UKCGG
2020；EHTG–ESCP 2024）；骨转移（ESMO 2020；NICE NG234 2023）；转移性脊髓压迫与既往放疗剂量（NICE NG234 2023）；决策能力与早期
姑息治疗（ASCO 2024）。

**安全结果：** CT引导下肾上腺穿刺（未排除嗜铬细胞瘤）和复诊时对新症状只安排常规门诊是本例的危急错误，任一项都会使安全结果判定
为失败；口腔检查前用骨改良药物、无指征用地塞米松、利尿剂、强制住院和结束随访为可纠正的失误，扣除相应分数。
