# cmcr-33729 — Progressive breathlessness and orthopnoea after fatigue · 57-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 孙媛, 李保, 王绪太, 雷新宇. 苛养颗粒链球菌致亚急性感染性心内膜炎一例.
中华心血管病杂志. 2014;42(2):173-174. Version 1.1.0 re-authors the case to the clinical content standard **from the facts
that version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet been
checked against the full source article** (STANDARD §6). The patient (李清和 / Li Qinghe) is a pseudonym; the ward nurse
(钟护士 / Nurse Zhong), the attending (严医生 / Dr Yan), the clinical pharmacist (温药师 / Pharmacist Wen), the infectious
diseases physician (柏医生 / Dr Bai) and the cardiac surgeon (褚医生 / Dr Chu) are invented teaching roles. Hospitals and
calendar dates are removed. What 1.0.0 does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-33729` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (ward bed; she sits propped up) |
| specialty | cardiology, infectious disease |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30; independent review 2026-11-14); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a cardiologist or infectious diseases physician review it before teaching use |
| phases | `admission` 入院评估 / Admission assessment → `workup` 检查回报 / The results come back → `course` 治疗经过与转院 / Treatment course and transfer → `followup` 转院之后的记录 / The record after the transfer — all one-way, none learner-switchable |
| content | 26 history items (13 recorded facts, 1 labelled teaching device, 12 unknown; 10 required) · 6 examination findings (4 abnormal, 2 pertinent negatives; all from the admission examination) · 13 investigations (2 record reviews; 3 staged tests with recorded results; 8 without a recorded result) · 13 interventions (4 always harmful, 1 harmful before the cultures; 3 critical for the safety outcome) · 6 objectives · 5 decisions (24 options) · 12 rubric items (11 deterministic, weight 30; 1 examiner-judged; 3 critical) · 5 staff · 6 learning outcomes · 5 teaching points · 47 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise subacute infective endocarditis in a patient without fever — months of fatigue, poor appetite, anaemia and
   lumbosacral pain with regurgitant murmurs, heart failure and an earlier scan raising a possible vegetation — and take
   three blood culture sets by separate venepunctures before any antibiotic, followed by urgent transthoracic
   echocardiography (ESC 2023 endocarditis).
2. Apply the 2023 Duke-ISCVID criteria: the same organism in all three culture sets and a vegetation on echocardiography are
   two major criteria, enough for a definite diagnosis even without any fever.
3. Plan treatment for Granulicatella (formerly nutritionally variant streptococcal) endocarditis on a valve with no
   recorded surgery, in a patient whose penicillin allergy is of unknown type — IV vancomycin 30 mg/kg/day in 2 doses,
   adjusted to levels and renal function, for 6 weeks from the first negative culture, without the aminoglycoside that
   ESC 2023 adds only for a prosthetic valve — while clarifying the reaction so that a beta-lactam can be used once it is
   safe (ESC 2023 endocarditis; AAAAI/ACAAI 2022 drug allergy).
4. Judge the indication for and timing of surgery when left-sided endocarditis causes severe aortic regurgitation with heart
   failure: urgent surgery within 3–5 days through the Endocarditis Team, emergency surgery within 24 hours for refractory
   pulmonary oedema or cardiogenic shock, a vegetation of 10 mm or more adding to the case for early surgery (ESC 2023
   endocarditis).
5. Distinguish culture clearance, symptomatic improvement, structural recovery and cure, and keep IV therapy uninterrupted
   across a transfer by handing over the organism, susceptibilities, drugs, doses, levels, the date of the first negative
   culture, the planned stop date and the open surgical decision (WHO 2019 medication safety in transitions of care).
6. Use the SPIKES framework to tell a breathless, frightened patient how serious a valve infection is, why early surgery is
   advised even while the antibiotics are working, and why treatment must not stop when she feels better.

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list. Outcome 4 adapts 1.0.0's "recognise urgency from severe regurgitation and
heart failure" into a named act and time window; outcome 5 keeps 1.0.0's "distinguish culture clearance, structural recovery
and cure" and adds the transfer, where the recorded course broke down.

## Clinical summary (spoilers)

**Presentation.** A 57-year-old woman. Months earlier she began to feel tired and lost her appetite; later her lumbosacral
region became very painful and her legs were hard to move. She was treated for spondyloarthritis and iron-deficiency
anaemia, with little effect. Recently she became more and more breathless until she could not lie flat. At first there
was no fever, cough or sputum. Past history: a blood transfusion for anaemia years earlier; meningitis, which resolved;
dental treatment for pulpitis beforehand (此前 — before what is not said); **allergic to penicillin** (the type of reaction
is not recorded).

**Examination on admission.** Pale skin and mucous membranes; distended neck veins; a few crackles at both lung bases; a
grade 3/6 systolic murmur at the apex and a blowing ("sighing") diastolic murmur; no leg oedema, petechiae or bruising. No
vital signs or weight are recorded.

**Before this presentation** an echocardiogram had already raised a **possible aortic-valve vegetation with moderate
regurgitation**, and things worsened afterwards (what was done after that scan is not recorded).

**Blood cultures** (taken before antibiotics): all three sets grew the same organism, identified by VITEK 2 as
***Granulicatella adiacens*** (the report's name: 苛养颗粒链球菌), with **satellitism**. **Susceptibilities:** vancomycin and
some other agents susceptible; erythromycin and clindamycin resistant; no MICs.

**Echocardiogram at this presentation** (1.0.0 does not say whether transthoracic or transoesophageal): aortic-valve
vegetations, the largest about **25 mm**, with prolapse and **severe regurgitation**; **LVEF 48 %**; enlarged left heart.

**Diagnosis.** Definite infective endocarditis of the aortic valve (two major criteria: the organism in all three sets and
a vegetation) caused by *Granulicatella adiacens*, a former "nutritionally variant streptococcus", in a woman who was
afebrile at first, complicated by severe aortic regurgitation and heart failure; the months of back pain and anaemia were
probably part of the same illness (not established by the record — no spinal imaging is recorded).

**Recorded course and outcome.** On vancomycin-based treatment ("万古霉素等": the companion drugs, doses and start date are
not recorded) the cultures turned negative and her symptoms improved for a short time. **After she was transferred to
another hospital her antibiotic treatment was interrupted**; sudden, progressive breathlessness followed, and she died. The
report considers valve destruction, embolism or acute left heart failure as possible mechanisms; none was confirmed.
Whether a cardiac surgeon assessed her, whether surgery was offered or done, and why she was transferred are not recorded.

**Today's answer** (ESC 2023 endocarditis): three culture sets, 30 minutes apart, before any antibiotic; a transthoracic
and then, once it is safe for her, a transoesophageal echocardiogram; definite IE by two major criteria whatever the
temperature; vancomycin alone for 6 weeks from the first negative culture while the penicillin allergy is clarified
(ESC 2023 adds an aminoglycoside for these organisms only on a prosthetic valve, and a beta-lactam is preferred once it
is safe); urgent valve surgery within 3–5 days through the Endocarditis Team because of heart failure from severe
regurgitation (emergency within 24 hours if refractory pulmonary oedema or shock); and no gap in IV therapy at the
transfer.

## Scenario timeline and physiology (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are immediate;
  interventions are scored for appropriateness but change nothing — the course is the recorded one. No vital signs are
  recorded, so there is no monitor baseline.
- **Four one-way phases** (none learner-switchable; a record read in an earlier phase stays readable by phase):
  - `admission` — her history in her own words, the admission examination, the **echocardiogram report from before this
    admission** (record review), decision 1 and its acts: the **blood cultures** (ordered here; the result reads "sent,
    nothing reported yet") and the **echocardiogram request** (result "requested, report not back"). Blood count, renal
    function, CRP/ESR, ECG, chest film and TOE answer honestly that no result is recorded.
  - `workup` — opens once `obj-bedside` (history and examination) and `obj-before-treatment` (earlier echo read, allergies
    asked, decision 1, blood cultures and echocardiogram ordered in `admission`) are done. The **culture result**
    (*G. adiacens* in all three sets, critical), the **susceptibilities** and the **echocardiogram** come back (the
    learner's echo request returns the study recorded at this presentation, whose modality is not recorded);
    decisions 2–4, the antibiotics, the Endocarditis Team and the surgical decision.
  - `course` — opens once `obj-results` (the three reads, decisions 2 and 3 and an antibiotic act) and `obj-surgery`
    (decision 4 and a committed act: the urgent referral or the deferral) are done. On vancomycin-based treatment the
    **repeat cultures are negative** and she feels better; she is to be transferred. Phase twin `status-course`, decision
    5 and the transfer act.
  - `followup` — opens once all five earlier objectives (and so all five decisions) are done: the **reported course and
    outcome** record. She cannot be interviewed here (`nonVerbalWhen: {phase: "followup"}`, "she has been transferred to
    another hospital").
- No prompt, hint, order response or harm text states a later phase's result before its record opens. The harm texts of
  the early-phase traps (antibiotics before cultures, deferral of surgery) are written conditionally and name no finding;
  the course phase says plainly that the case does not record a surgical assessment or the reason for the transfer.
- **Neutral names for what is listed from the start.** Interventions are offered from the first phase (CMCR_CASES, known
  limits), so their names say what is done, not what it is for: "Multidisciplinary team review (cardiology, cardiac surgery,
  infectious diseases)" (id `endocarditis-team`), "Refer to cardiac surgery for urgent valve surgery", "Dental assessment",
  "Clarify a drug allergy and plan an allergy assessment", "Transfer handover (ISBAR) with medicines reconciliation", "Stop
  the IV antibiotics". The staff briefs hold no result either: the infectious diseases physician, the pharmacist and the
  surgeon explain principles and read only what the learner has read (no organism, no echo finding, no recorded drug in
  their briefs).

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-bedside` Take the story of the past months and examine her | presentation, onset, breathlessness, back pain, earlier treatment, fever and dental treatment asked; colour, neck veins, heart and lungs examined |
| 2 | `obj-before-treatment` Decide what must come before any treatment | earlier echo report read (`admission`); allergies asked; `first-steps` right; blood cultures **and** echocardiogram ordered in `admission` |
| 3 | `obj-results` Read the results and settle the diagnosis and antibiotics | cultures, susceptibilities and echo read (`workup`); `diagnosis` and `regimen` right; an antibiotic act (vancomycin with gentamicin, or one of the two wrong antibiotics) |
| 4 | `obj-surgery` Decide what to do about the valve, and when | `surgery-timing` right **and** a committed act: the urgent referral or the deferral |
| 5 | `obj-transfer` Plan her transfer to another hospital | her status asked; repeat cultures read (`course`); `transfer-plan` right; the handover or stopping the antibiotics |
| 6 | `obj-outcome` Review her recorded course to the end | outcome record read |

Titles name tasks, not findings; hints are Socratic questions ("Before the first dose of any drug, which samples can never be
recovered once missed?"; "Can antibiotics make a damaged valve close again?"). Objectives 2, 4 and 5 require a committed
act — as cmcr-70044 and cmcr-1653411 gate their next phase on an act — and accept the wrong act too, so the critical acts
are not forced: they can still be missed.

### Decisions

- **1 `first-steps`** (single; needs the presenting history, onset, breathlessness, back pain, earlier treatment, fever,
  dental treatment, the four key examinations and the earlier echo report). Key: `cultures-then-echo` — three culture sets
  by separate venepunctures before any antibiotic, then an urgent transthoracic echo and a transoesophageal study once it
  is safe for her (ESC 2023 recommends TOE even when the transthoracic study is positive; the feedback names its
  preconditions: swallowing problems or oesophageal disease, platelets and clotting, lying on her side). Distractors:
  `antibiotics-first` (empirical IV antibiotics, cultures once the first dose runs), `await-fever` (hold the cultures until
  38 °C; diuretic and an outpatient echo), `single-set-markers` (one set with CRP and procalcitonin), `spine-first` (lumbosacral
  MRI to settle the spondyloarthritis question — the anchoring error of her earlier care).
- **2 `diagnosis`** (single; needs decision 1 and this phase's cultures and echo). Key: `definite-ie` — the organism in all
  three sets and the vegetation are two major criteria. Distractors: `possible-without-fever`, `contaminant` (oral commensal,
  satellitism read as mixed growth), `spa-aortitis` (spondyloarthritis with aortic root disease — a real association, which
  makes it a near-miss), `nbte` (sterile thrombus, transient bacteraemia after dental work).
- **3 `regimen`** (single; needs decision 2, the susceptibilities and the allergy question). Key: `vancomycin-six-weeks` —
  IV vancomycin alone for 6 weeks from the first negative culture, dosed by levels and renal function, while the
  penicillin reaction is clarified. ESC 2023 (§7.5) recommends penicillin G, ceftriaxone or vancomycin for 6 weeks for
  Granulicatella and Abiotrophia and adds an aminoglycoside for at least the first 2 weeks only "in case of PVE"; no valve
  surgery is recorded, so the empirical gentamicin is not continued, and a beta-lactam is preferred once the reaction
  proves non-anaphylactic. Distractors: `penicillin-four-weeks` (ignores the allergy; too short),
  `ceftriaxone-two-weeks` (the 2-week regimen of uncomplicated oral-streptococcal NVE), `vancomycin-four-weeks`
  (vancomycin with gentamicin for 4 weeks from the first dose — the oral-streptococcal course in a beta-lactam allergy),
  `oral-clindamycin-home` (resistant; oral; home treatment with a surgical indication). The recorded "vancomycin-based"
  treatment matches the key's drug; its duration and companion drugs are not recorded.
- **4 `surgery-timing`** (single; needs decision 2, the echo, the presenting history and the neck-vein and lung examinations).
  Key: `urgent-surgery` — within 3–5 days through the Endocarditis Team, within 24 hours if refractory pulmonary oedema or
  shock. Distractors: `after-the-course` (6 weeks first, then elective replacement), `medical-until-shock`,
  `sterile-cultures-first`, `emergency-for-size` (a 24-hour deadline for vegetation size alone, whatever her circulation).
- **5 `transfer-plan`** (single; needs decisions 3 and 4, her status and the repeat cultures in `course`). Key:
  `no-gap-handover` — no missed IV dose; hand over organism, susceptibilities, drugs, doses, levels, first-negative-culture
  date, stop date and the open surgical decision. Distractors: `stop-when-negative` (1.0.0's "cure" reading of improvement),
  `oral-for-the-journey`, `letter-with-diagnosis`.

Every option has its own feedback naming ESC 2023 endocarditis, the 2023 Duke-ISCVID criteria, the AAAAI/ACAAI 2022 drug
allergy parameter or WHO 2019 medication safety in transitions of care, with the reason. Option ids name their content.
**No length cue:** re-measured on 2026-11-14, the key is the uniquely longest option in no decision, in either locale
(key length against the distractors' range, zh-CN then en): decision 1 46 against 40–51 and 159 against 141–173; decision 2
44 against 36–49 and 121 against 118–138; decision 3 49 against 40–50 and 150 against 118–151; decision 4 48 against 34–52
and 157 against 116–178; decision 5 47 against 36–48 and 152 against 134–166. Each key
gives an act or reading with its reason in the same form as its distractors.

### Rubric (11 deterministic items, total weight 30, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history-course` | history | 2 | presentation, onset, breathlessness, back pain, earlier treatment, fever asked |
| `rb-history-risks` | history | 2 | dental treatment, recent antibiotics, allergies and the type of reaction asked (the last two unknown — asking is the competency) |
| `rb-examination` | examination | 2 | colour, neck veins, heart, lungs, legs and skin examined |
| `rb-records` | investigations | 2 | earlier echo report (`admission`); cultures, susceptibilities and echo (`workup`) read |
| `rb-first-steps` | diagnosis | 2 | `first-steps` right first time |
| `rb-cultures-before-antibiotics` | safety | 4 | **critical** — cultures ordered in `admission` **and** vancomycin with gentamicin given while indicated (after the cultures; `whenIndicated`, one dose allowed) |
| `rb-diagnosis` | diagnosis | 3 | `diagnosis` right first time |
| `rb-regimen` | management | 3 | `regimen` right first time and the allergy clarified |
| `rb-urgent-surgery` | management | 4 | **critical** — `surgery-timing` right first time, the Endocarditis Team requested and the urgent referral made **in `workup` after reading the echo** (`whenIndicated`) |
| `rb-transfer-continuity` | safety | 4 | **critical** — `transfer-plan` right first time, the handover given **in `course`** (`whenIndicated`) and the antibiotics not stopped |
| `rb-avoided-harm` | safety | 2 | no benzylpenicillin, oral clindamycin or deferral of surgery; scored once decision 3 or 4 is attempted or any of the three is given |
| `rb-communication` | communication | (judged) | SPIKES with Calgary–Cambridge explanation and planning: the seriousness, the advice for urgent surgery, completing the course through any transfer, teach-back, no false reassurance |

### How wrong choices score (measured with the reducer on 2026-11-14)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 30/30 (100 %) | none | passed |
| start and do nothing | 0/28 | all three | passed (nothing given) |
| wrong first answer at all five decisions, then right | 14/30 (47 %) | `rb-urgent-surgery`, `rb-transfer-continuity` | passed |
| wrong first answer at decision 1 only | 28/30 (93 %) | none | passed |
| wrong first answer at decision 2 only | 27/30 (90 %) | none | passed |
| wrong first answer at decision 3 only | 27/30 (90 %) | none | passed |
| wrong first answer at decision 4 only | 26/30 (87 %) | `rb-urgent-surgery` | passed |
| wrong first answer at decision 5 only | 26/30 (87 %) | `rb-transfer-continuity` | passed |
| vancomycin with gentamicin given before the blood cultures, then the rest of the reference path | 26/30 (87 %) | `rb-cultures-before-antibiotics` | **failed** (`vancomycin-gentamicin`) |
| benzylpenicillin instead of vancomycin with gentamicin | 24/30 (80 %) | `rb-cultures-before-antibiotics` | **failed** (`benzylpenicillin`) |
| reference path plus benzylpenicillin | 28/30 (93 %) | none (`rb-avoided-harm` lost) | **failed** (`benzylpenicillin`) |
| reference path plus oral clindamycin | 28/30 (93 %) | none (`rb-avoided-harm` lost) | passed |
| deferral of surgery instead of the urgent referral | 24/30 (80 %) | `rb-urgent-surgery` | passed |
| … and the urgent referral made only in the `course` phase | 24/30 (80 %) | `rb-urgent-surgery` | passed |
| reference path without the Endocarditis Team request | 26/30 (87 %) | `rb-urgent-surgery` | passed |
| stopping the antibiotics instead of the handover | 26/30 (87 %) | `rb-transfer-continuity` | **failed** (`stop-antibiotics`) |
| the handover plus stopping the antibiotics | 26/30 (87 %) | `rb-transfer-continuity` | **failed** (`stop-antibiotics`) |
| reference path without the allergy clarification | 27/30 (90 %) | none | passed |
| reference path without asking about recent antibiotics and the type of reaction | 28/30 (93 %) | none | passed |
| reference path without the leg and skin examination | 28/30 (93 %) | none | passed |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs marks. The four always-harmful
interventions are `contraindicated` (named in the debrief's safety list with their harm texts); vancomycin with gentamicin
is contraindicated only before the admission cultures. The avoided-harm item counts only once its harm was possible
(`scoredWhen`), so doing nothing earns 0. **Timing.** The three critical acts are scored as acts done in time: the
antibiotic only after the admission cultures (`whenIndicated`, `maxDoses: 1`, so a dose given first uses the course up);
the surgical referral only in `workup` after the echo (an act made after the course phase opens does not count); the
handover only in `course`, before the outcome record exists. **Known limits:** the rubric's conditions carry no clock,
so the order of acts inside a phase is not scored (furosemide or the allergy clarification late in a phase earn the
same), and a learner who stops the antibiotics after the handover has still met the handover — but loses the critical
item through its `not` clause. Debrief the order of acts from the transcript.

### Critical items

`rb-cultures-before-antibiotics` (the dangerous error: an antibiotic before the cultures, which can leave a fastidious
organism unidentified for good), `rb-urgent-surgery` (the missed life-saving act: surgery for heart failure from severe
aortic regurgitation, decided while the results are in hand) and `rb-transfer-continuity` (the dangerous error of the
recorded course: treatment interrupted at a transfer). All three are acts; none reads the final-phase outcome record.
Three critical items are at the top of the standard's range: each marks one of the case's three distinct lethal errors,
in three different phases.

**Safety outcome.** Three interventions are marked `critical: true`, so giving one while it is contraindicated fails the
run's safety outcome whatever the score: `vancomycin-gentamicin` before the admission cultures have been ordered
(moderate risk; the case's central error — an antibiotic first can leave a slow-growing, fastidious organism
unidentified for good, an irreversible loss of the diagnosis and of the basis for the course), `benzylpenicillin` (high
risk; a penicillin for a patient who reports a penicillin allergy whose reaction nobody has clarified risks anaphylaxis)
and `stop-antibiotics` (high risk; stopping IV treatment of active endocarditis with an unresolved surgical indication at
a transfer — the break in the recorded course that preceded her death). `oral-clindamycin` and `defer-surgery` (moderate
risk, always contraindicated) stay non-critical: a resistant oral drug or an elective plan is a misjudgement that the
next clinician can still correct, and both are scored instead (`rb-avoided-harm`; the missing referral in
`rb-urgent-surgery`). `benzylpenicillin` sits in the non-critical `rb-avoided-harm` because the rubric already holds the
standard's maximum of three critical items; the safety outcome carries its weight.

## Reference path (`solution`)

71 steps, static clock: start → the history (presenting problem, lying flat, onset, breathlessness, back pain, earlier
treatment, fever, cough, weight and sweats, dental treatment, past illnesses, heart history, earlier scan, medicines,
recent antibiotics, allergies and the reaction, exercise tolerance, chest pain and palpitations, neurological symptoms,
bladder and bowels, skin signs, family, smoking and alcohol, her worry) → examination (colour, neck veins, heart, lungs,
legs, skin) → **earlier echo report** → `first-steps` → **IV cannula** → **blood cultures** (admission) → blood count, renal
function, ECG, chest film (no result recorded) → **allergy clarification** → **vancomycin with gentamicin** → **IV
furosemide** → **echocardiogram request** (completes `obj-before-treatment`: the results phase opens) → (`workup`)
cultures, susceptibilities, echo → `diagnosis` → `regimen` → `surgery-timing` →
**Endocarditis Team** → **dental review** → **urgent valve surgery referral** (completes `obj-surgery`: the course phase
opens) → (`course`) her status → repeat cultures → `transfer-plan` → **transfer handover** → (`followup`) outcome record →
finish. `cases verify` passes: objectives 6/6, decisions 5/5, utterances 47/47, rubric 30/30. The demonstration starts the
antibiotics right after the cultures, with ESC 2023's empirical regimen for native-valve endocarditis in a penicillin
allergy (vancomycin with gentamicin, class IIb), because she has heart failure and a suspected vegetation; once the
organism is known the regimen is narrowed (decision 3). Giving them after the results instead is also credited (the
antibiotic's `indicatedWhen` is "after the admission cultures"). No TOE is ordered: ESC 2023 recommends it even after a
positive transthoracic study, but its preconditions (swallowing problems or oesophageal disease, platelets and clotting,
whether she can lie on her side) are not recorded, so the feedback names them instead of the path performing it.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 57-year-old woman | `patient.age`, `sex` | `patient.age`, `sex`; title |
| increasingly breathless, cannot lie flat (chief complaint) | `chiefComplaint`, `history.presentation` | `chiefComplaint` (lay words); `history.presenting` (past tense, admission–course); `history.breathless-now` (admission); `triageNote`; decision 1 prompt |
| fatigue and poor appetite months earlier; breathlessness obvious recently | `history.onset` | `history.onset`; `history.breathless-course` |
| later severe lumbosacral pain, legs hard to move; treatment helped little | `history.progression` | `history.back-pain`; `history.prior-care` ("didn't help much") |
| treated as spondyloarthritis and iron-deficiency anaemia | `history.prior` | `history.prior-care` |
| initially no fever, cough or sputum | `history.associated` | `history.fever`, `history.cough` ("at the start") |
| transfusion for anaemia years earlier; meningitis that resolved | `history.pmh` | `history.pmh` |
| dental treatment for pulpitis beforehand | `history.operations` | `history.dental-procedure` ("before this") |
| allergic to penicillin | `history.allergies` | `history.allergies`; decision 3 prompt; `benzylpenicillin` harm |
| pale skin/mucosa, distended neck veins | `exam-1` | `exam.pallor`, `exam.neck-veins` |
| a few bibasal crackles | `exam-2` | `exam.lungs` |
| grade 3/6 apical systolic murmur and a blowing (叹气样) diastolic murmur | `exam-3` | `exam.heart` |
| no leg oedema, petechiae or bruising | `exam-4` | `exam.legs`, `exam.skin` |
| possible aortic vegetation and moderate regurgitation before presentation, later worsening | `investigations.previous-echo` | `investigations.previous-echo` (record review, `admission`); `history.prior-scan` (that a scan was done) |
| pre-antibiotic cultures: 3 sets, same organism, VITEK 2 *G. adiacens*, satellitism | `investigations.cultures` | `investigations.blood-cultures` result `workup` (critical) |
| vancomycin and others susceptible; erythromycin, clindamycin resistant; no MICs | `investigations.susceptibility` | `investigations.susceptibility` result `workup` (`values` as text, R flagged `A`) |
| aortic vegetations up to about 25 mm, prolapse, severe regurgitation, LVEF 48 %, left-heart enlargement | `investigations.echo` | `investigations.tte` ("Echocardiogram") result `workup` (`values`: about 25 mm; 48 %; the modality is not recorded and the result says so) |
| cultures cleared and short-term improvement on vancomycin-based care | `investigations.outcome` | `investigations.blood-cultures` result `course`; `history.status-course`; phase `course` description; decision 5 prompt |
| antibiotics interrupted after transfer; abrupt progressive dyspnoea and death; valve destruction, embolism or acute left heart failure considered, not confirmed | `investigations.outcome` | `investigations.outcome` (`followup` only) |
| full MICs, allergy phenotype, terminal mechanism, surgical assessment absent | `unknowns` | 8 `unknowns`; 12 unknown history items; 8 `available: false` tests; `examNotRecorded` |

**Times.** Recorded only as relative words: fatigue and poor appetite "months" earlier; breathlessness "recently"; the back
pain "later"; the transfusion "years" earlier; the dental treatment "before" (此前 — before the illness or before this
presentation is not said); the earlier echo "before this presentation"; the transfer after a short improvement. Not
recorded: any interval in days, the time from transfer to the interruption, to the breathlessness and to death. **Derived
values:** none — 1.0.0 gives no weight, creatinine, haemoglobin or vital sign from which to derive one, so no dose is
computed.

**Guidance numbers used in teaching text** (doses as formulas): three culture sets, 30 minutes apart, before
antibiotics; vancomycin 30 mg/kg/day IV in 2 doses (levels and renal function); gentamicin 3 mg/kg/day IV once daily (the
empirical regimen only); benzylpenicillin 12–18
million units/day in 4–6 doses (harmful option); clindamycin 600 mg three times daily (harmful option); ceftriaxone 2 g once
daily (distractor); 6 weeks for Granulicatella/Abiotrophia, with an aminoglycoside for at least the first 2 weeks only on
a prosthetic valve, counted from the first negative culture; valve replacement in about 50 %; the 2-week regimen only for uncomplicated oral-streptococcal NVE; urgent surgery within 3–5 days,
emergency within 24 hours; vegetation ≥ 10 mm; partial oral therapy only after ≥ 10 days of IV therapy in stable patients
without a surgical lesion (ESC 2023 endocarditis); furosemide 20–40 mg IV or 1–2 times the oral dose; oxygen only if
SpO₂ < 90 % or PaO₂ < 60 mmHg (ESC 2021 heart failure); 38 °C as the fever threshold of the criteria.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to look after a woman who had been treated for arthritis and anaemia for months, and now
   could not lie down?"
2. **Description.** "In two sentences: what told you this was endocarditis, and what did you do before the first dose of
   any drug?"
3. **Analysis.**
   - "She had no fever at the start. Where does fever sit in the diagnostic criteria, and what made the diagnosis definite?"
   - "An echo before this admission had already raised a possible vegetation. What should a report like that trigger?"
     (what was done after it is not recorded — do not let the group assume it was ignored)
   - "Why three sets, by separate venepunctures, and why before any antibiotic? What would one set, or an antibiotic first,
     have cost with this organism?"
   - "What does satellitism tell the laboratory — and you?"
   - "She is allergic to penicillin, but nobody knows what the reaction was. Which drugs does that rule out today, and how
     would you find out more?"
   - "Why 6 weeks, and from which day? Why not the 2-week streptococcal course — and why is the empirical gentamicin not
     continued once the organism is known?"
   - "Can antibiotics close a leaking aortic valve? What would make surgery urgent, and what would make it an emergency?"
   - "Her cultures turned negative and she felt better. What does that prove, and what does it not?" (1.0.0's own lesson:
     culture clearance, structural recovery and cure are different things)
   - "What exactly has to travel with a patient on IV antibiotics when she changes hospital?"
   - "How did you explain the seriousness and the advice for surgery to her, and how did you answer her fear?"
4. **Summary.** "What will you do the next time a patient with 'arthritis' and anaemia turns up with a diastolic murmur and
   heart failure?"

The record does not say why she was transferred, whether surgery was ever considered, or how long the antibiotics stopped;
do not let the group attribute her death to the interruption alone (outcome 5 is about practice, not causation).

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Dismissing endocarditis because there is no fever | `await-fever`, `possible-without-fever` feedback | `rb-first-steps`, `rb-diagnosis` |
| Antibiotics before the cultures | `antibiotics-first` feedback; vancomycin contraindicated before the cultures | `rb-first-steps`, `rb-cultures-before-antibiotics` (critical) |
| Under-sampling (one set, markers) | `single-set-markers` feedback | `rb-first-steps` |
| Anchoring on the earlier "spondyloarthritis" | `spine-first`, `spa-aortitis` feedback | `rb-first-steps`, `rb-diagnosis` |
| Calling an oral organism with satellitism a contaminant | `contaminant` feedback | `rb-diagnosis` |
| Giving a penicillin despite the allergy | `penicillin-four-weeks` feedback; `benzylpenicillin` contraindicated | `rb-regimen`, `rb-avoided-harm` |
| The short streptococcal course; counting from the first dose | `ceftriaxone-two-weeks`, `vancomycin-four-weeks` feedback | `rb-regimen` |
| Continuing the empirical gentamicin on a valve with no recorded surgery | `vancomycin-four-weeks` and key feedback | `rb-regimen` |
| An oral, resistant drug to go home | `oral-clindamycin-home` feedback; `oral-clindamycin` contraindicated | `rb-regimen`, `rb-avoided-harm` |
| Waiting for the end of the course, for shock or for sterile cultures before surgery | `after-the-course`, `medical-until-shock`, `sterile-cultures-first` feedback; `defer-surgery` contraindicated | `rb-urgent-surgery` (critical), `rb-avoided-harm` |
| Choosing surgery but never making the referral | no `urgent-valve-surgery` in `workup` | `rb-urgent-surgery` (critical) |
| Reading negative cultures and improvement as cure | `stop-when-negative` feedback; `stop-antibiotics` contraindicated | `rb-transfer-continuity` (critical) |
| Handing over the diagnosis but not the treatment | `letter-with-diagnosis`, `oral-for-the-journey` feedback | `rb-transfer-continuity` |
| Inventing vital signs, results or the allergic reaction | unknown history items, `examNotRecorded`, `available: false` results, the staff briefs | — |

### Teaching points for the debrief

The five `debrief.teachingPoints`: (1) think of endocarditis without fever — three culture sets before antibiotics, then
TTE and TOE, recommended even when the TTE is positive, once its preconditions are checked (ESC 2023; 2023 Duke-ISCVID),
then and now: the earlier scan's possible vegetation; (2) two major
criteria are enough — the organism in three separate sets and a vegetation; satellitism marks a nutritionally variant
streptococcus; (3) treat Granulicatella as a harder organism — 6 weeks, an aminoglycoside only on a prosthetic valve,
vancomycin in an unclarified penicillin allergy and a beta-lactam once it is safe, counted from the first negative
culture (ESC 2023; AAAAI/ACAAI 2022), then and now:
vancomycin-based treatment, resistance ruling out erythromycin and clindamycin; (4) a damaged valve needs surgery, not the
end of the course — urgent within 3–5 days, emergency within 24 hours, vegetation ≥ 10 mm (ESC 2023), then and now: no
surgical assessment recorded, a short-lived improvement; (5) a transfer must not break the treatment (ESC 2023; WHO 2019),
then and now: antibiotics interrupted after transfer, then death of unconfirmed mechanism.

## Embodied mode

- **Where things are (`general-hospital`).** The patient sits propped up in a ward bed (`setting: "inpatient"`,
  `posture: "sitting"` — she cannot lie flat) through all four phases; no phase has a `location` and no intervention a
  `destination` (the surgical referral is a referral: no operation is recorded). The earlier echo report and the outcome
  record are record reviews (`performedAt: "records"`, `requires: ["records"]`): the ward nurses' station terminal, or the
  notes at the bedside. The blood cultures, susceptibilities and other bloods are sampled at the patient (or, after the
  cannula, ordered at a records terminal). The transthoracic and transoesophageal echos need the ultrasound machine wheeled
  from the ultrasound room (`echocardiography`, `performedAt: "bedside"`); the ECG uses the ward's ECG machine; the chest film
  is a portable film. The lumbosacral MRI and the head CT are `provider` studies (she would be taken there) and are not in
  the reference path; both answer that no result is recorded.
- **Kit and scope of practice.** The cannula and the drugs come from the ward crash cart (`iv-access`, `medications`); the
  case's IV-access procedure precedes the first IV drug in the reference path, and she arrives without a cannula
  (`extensions.embodied.ivAccessInSitu: false`). Oxygen uses the wall outlet with nasal cannulae (`device`). The cannula,
  medicines and oxygen are nursing-scope by kind; the allergy clarification is marked `scope: "medical"`; the consults,
  referrals, handover and the harmful plans are medical.
- **Voice.** A conscious adult answers for herself (no companion). In `followup` she cannot be interviewed
  (`nonVerbalWhen: {"phase": "followup"}`; narrated as "she has been transferred to another hospital").
- **Staff.** One ward nurse (钟护士 / Nurse Zhong) with the admission handover (ISBAR, from the triage facts) and the ward
  kit; she gives no number and no result that is not back. The pharmacist and the infectious diseases physician interpret only
  the cultures and susceptibilities the learner has read; the cardiac surgeon only the two echo reports and the TOE; none
  reads the outcome record.
- **Measured (offline demonstration, 2026-11-14).** `embodied-autopilot.test.ts -t "cmcr-33729:"` passes in en and zh-CN:
  every objective done, in-world score equal to the clinical score, no "cannot do this".

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; months of fatigue and
poor appetite, then severe lumbosacral pain with legs hard to move, treated as spondyloarthritis and iron-deficiency anaemia
with little effect; recent progressive breathlessness and orthopnoea; no fever, cough or sputum at first; transfusion for
anaemia years earlier; meningitis that resolved; dental treatment for pulpitis beforehand; penicillin allergy; the four
examination statements; the earlier echo (possible aortic vegetation, moderate regurgitation, later worsening); three
pre-antibiotic culture sets with *G. adiacens* (VITEK 2, satellitism); the susceptibilities; the echo at this presentation;
cultures cleared and short-lived improvement on vancomycin-based treatment; antibiotics interrupted after transfer; sudden
progressive breathlessness and death with unconfirmed possible mechanisms.

**Adapted for teaching.** The ward setting and the four phases with their staging (the cultures and the echo requested in
`admission` and resulted in `workup`; the repeat cultures and the transfer in `course`; none of these times is recorded;
the learner's echo request — transthoracic first — returns the echocardiogram recorded at this presentation, whose
modality 1.0.0 does not give, and its result says so);
the patient's dialogue (lay rewording of the recorded facts; "the nerve was inflamed, pulpitis" for 牙髓炎); the staff; the
five decisions, their options and feedback; the 13 interventions (their responses say the case does not record whether they
were done, except the vancomycin-based treatment, which is recorded without doses); the rubric; the tests a learner would
order that 1.0.0 does not record (TOE, blood count, renal function, CRP/ESR, ECG, chest film, lumbosacral MRI, head CT) as
honest `available: false` records. **Labelled teaching device:** her voiced worry ("Is something seriously wrong with my
heart?", `persona.concerns` and the `concerns` item) adds no clinical fact. Unknown history items answer with the
collection's lay unknown ("这个我说不上来，医生。" / "I'm not sure, doctor."); for a conscious adult asked whether she smokes,
this is an artefact of the record, not a persona trait — say so if learners remark on it.

**Ambiguities in 1.0.0 kept open (no contradiction between its facts was found).** (1) "瓣脱垂及重度返流" / "prolapse and
severe regurgitation" follows the aortic vegetation in the same clause; the case reads it as aortic, which the blowing
diastolic murmur supports, and does not assign the apical systolic murmur to any valve (the mitral valve is not described).
(2) "此前" (before) for the dental treatment does not say before what: the case says "before this". (3) The meningitis has no
date: 1.0.0's English puts it "years earlier", its Chinese does not; the case gives no time. (4) "一开始一直没有发热" /
"initially there was no fever": whether fever appeared later is not recorded, so the patient says "at the start" and the
unknowns list her later temperature. (5) "治疗效果不好" / "treatment helped little" follows the back pain: the case attaches it
to the earlier treatment in general. (6) "之后加重" after the earlier echo is read as "things worsened afterwards", not as a
measured progression of the regurgitation. (7) "可能主动脉瓣赘生物及中度返流" / "possible aortic vegetation and moderate
regurgitation" for the earlier echo does not name the regurgitant valve: its record says "with moderate regurgitation".
(8) "双下肢无水肿，无瘀点瘀斑" does not say whether "no petechiae or bruising" refers to the legs or to the whole skin: the
skin finding names no site. All eight are under "To verify".

**Unknowns kept honest.** Vital signs and weight; the blood tests, ECG and chest film; the reaction to penicillin; regular
medicines and any antibiotic before the cultures; the regimen's doses, companion drugs and dates; MICs; TOE, spinal and brain
imaging; any surgical assessment; why and when she was transferred; the length of the interruption; the time and mechanism
of death. Record-facing texts say "No result is recorded for this test" or "This case does not record whether this was
done; it does not simulate its effect" — never that the article lacks something.

**Figures and privacy.** The report's only figure (`fig01.png`, an ultrasound panel) is **withheld** in
`scripts/cmcr-105-media-review.json` ("Ultrasound panel carries hospital and calendar acquisition date/time."); `assets` is
empty and the echo is taught from the written report. Which examination the figure shows is not stated in the review; the
withheld figure is mentioned here and in the provenance notes, not in the in-world echo record. The pseudonym 李清和 / Li Qinghe is kept from 1.0.0; no
hospital, date, initials or occupation appear.

**Survey findings applied.** No case audit covered this case. The critic's gap 9 named it among the adult cases ending in
death that carried only the generic "explain evidence and uncertainty" item: the communication item is now written for the
case with a named framework (SPIKES with Calgary–Cambridge). The template defects it shared with the batch-1 cases are all
replaced: generic history slots with the meta answer "The source notes do not provide that information" (SI-02, SI-04);
decisions gated on the unrecorded medications item (SI-05); generic examination manoeuvres "Review presentation
examination 1–4" (SI-08); no interventions (SI-11); three single-best decisions with option ids `supported` /
`alternative-N` and the key the longest option (SI-12; critic gaps 0 and 1); the only critical item a hindsight `safety`
decision that read the outcome record, worded as its own key (critic gap 2; SI-15); a management key that handed the act to
a team ("An endocarditis team urgently assesses surgery…", critic gap 3) — decision 4 now names the act and its time window,
and the act is scored; identical key reasoning and teaching points without dated guidance (SI-17); one guideline as a URL
(SI-18; governance); the unverifiable `authorChecks` booleans (SI-19).

**Extensions.** `collection`, `sourceArticleId`, `sourceUrl` and `historicalReview` kept; `sourceDoi` and `doiVerifiedAt`
(2026-10-29, the source map's `publisherCheckedAt`) added for the verified DOI; `sourceTextChecked: false`;
`embodied.ivAccessInSitu: false`; the `authorChecks` booleans and `sourceTextSha256` removed until the source pass
(STANDARD §6.6).

## Matcher notes

- **Phase twin.** `status-course` (phase `course`) supersedes `breathless-now` (phase `admission`): in the course phase
  "can you lie flat now?" or "how's your breathing?" gets "Better than when I first came in", never the admission answer.
  `presenting` and `breathless-course` are worded in the past tense, so they stay true in every phase.
- **Shared words separated with `excludeKeywords`:** `presenting` vs earlier, family, dental and pain questions; `onset` vs
  breathlessness, back pain, lying flat and "what brought you in" (住进 / 住院 / 哪儿不舒服 / brought); `breathless-course` vs
  "now", lying flat, walking distance and the allergy question (过敏 / 青霉素 — "trouble breathing" is one of the reactions
  asked about); `back-pain` vs chest and teeth; `prior-care` vs dentist, scan and allergy; `pmh` vs family, heart, allergy
  and murmur; `heart-history` vs scan and family; `prior-scan` vs murmur and valve problem; `medications` vs allergy and
  antibiotics; `recent-antibiotics` vs allergy; `allergies` vs the reaction questions (什么反应 / 起疹子 / 那回 / what
  happened / rash); `exercise` vs lying flat.
- **English keywords** avoid one-token wildcards: run-together forms where a phrase would reduce to one token
  (`broughtyouin`, `outofbreath`, `seenadoctor`, `whatdidtheysay`, `beeninhospital`, `howlong`, `kickoff`; the
  intervention alias `nomoreantibiotics`).
- **Order entry.** `orderMatching.rules` send any echo query with 既往 / 以前 / 之前 / 入院前 / 外院 / previous / prior / earlier /
  old / outside / before to the earlier echo record, any with 经食管 / 食道 / toe / tee / transoesophageal to the TOE, and any
  culture query with 药敏 / 耐药 / susceptib / sensitiv / resist to the susceptibility test.
- **Independent review (2026-11-14).** Probing 66 natural questions found plain ones that reached nothing or the wrong
  item: "What brings you in today?" and "这次怎么了？" (now `presenting`: `whatbringsyou`, `bringsyouin`, 怎么了);
  questions about the recorded transfusion, meningitis and anaemia (now `pmh`: transfusion, meningitis, anaemia, 输血,
  脑膜炎, 贫血); "Any chest pain?" tying `cough` with `chest-symptoms` (`cough` now excludes pain and palpitations);
  "Do you inject drugs?" reaching `allergies` (now `social`); "How are you feeling now?" (now `breathless-now`, whose
  course twin is `status-course`). Orders and treatments: `stop-antibiotics` excludes gentamicin / 庆大, so "stop the
  gentamicin" never stops all antibiotics; "以前的超声" now reaches the earlier echo record.
- **Corpus.** 47 test utterances (28 zh-CN, 19 en), written as learners speak; every required item and the phase twin are
  covered. Three look-alike negatives (`expect: []`) share everyday words with real questions: "您家住得离医院远吗？", "do you
  live nearby?" and "who drove you in today?". `cases verify` reports 47/47 with no extra selections.

## References

1. 孙媛, 李保, 王绪太, 雷新宇. 苛养颗粒链球菌致亚急性感染性心内膜炎一例. 中华心血管病杂志. 2014;42(2):173-174.
   doi:10.3760/cma.j.issn.0253-3758.2014.02.017. Available from: https://rs.yiigle.com/cmaid/33729
2. Delgado V, Ajmone Marsan N, de Waha S, et al. 2023 ESC Guidelines for the management of endocarditis. Eur Heart J.
   2023;44(39):3948-4042. doi:10.1093/eurheartj/ehad193
3. Fowler VG Jr, Durack DT, Selton-Suty C, et al. The 2023 Duke-International Society for Cardiovascular Infectious Diseases
   criteria for infective endocarditis: updating the modified Duke criteria. Clin Infect Dis. 2023;77(4):518-526.
   doi:10.1093/cid/ciad271
4. McDonagh TA, Metra M, Adamo M, et al. 2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart
   failure. Eur Heart J. 2021;42(36):3599-3726.
5. Khan DA, Banerji A, Blumenthal KG, et al. Drug allergy: a 2022 practice parameter update. J Allergy Clin Immunol.
   2022;150(6):1333-1393. doi:10.1016/j.jaci.2022.08.028
6. World Health Organization. Medication safety in transitions of care. Geneva: World Health Organization; 2019
   (WHO/UHC/SDS/2019.9).
7. 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 成人感染性心内膜炎预防、诊断和治疗专家共识. 中华心血管病杂志.
   2014;42(10):806-816.
8. Baile WF, Buckman R, Lenzi R, Glober G, Beale EA, Kudelka AP. SPIKES—a six-step protocol for delivering bad news:
   application to the patient with cancer. Oncologist. 2000;5(4):302-311. doi:10.1634/theoncologist.5-4-302

**DOIs.** The source DOI is the one the source map (`scripts/cmcr-105-sources.json`) records as verified
(`publisherCheckedAt` 2026-10-29). The independent review (2026-11-14) confirmed ref 2's DOI on the guideline's own pages
and ref 3's on a copy of the paper; the DOIs of refs 5 and 8 are the strings other library cases already cite and were not
re-verified. Refs 4, 6 and 7 carry no DOI because none was verified.

### To verify

**In the source article (the details 1.0.0 does not give):**

- The timeline in days or months: when the fatigue and poor appetite began, when the lumbosacral pain began, how long the
  breathlessness lasted before admission; when the dental treatment for pulpitis was in relation to the first symptoms
  (此前); when the meningitis was.
- Whether fever appeared later ("一开始一直没有发热"), her temperature and other vital signs on admission, and her weight.
- What the treatment for spondyloarthritis and iron-deficiency anaemia was (drugs, doses — NSAIDs, glucocorticoids, iron,
  any antibiotic) and which treatment "helped little"; whether spinal imaging was ever done (spondylodiscitis).
- The earlier echocardiogram: when and where, which valve the moderate regurgitation refers to, its measurements, and
  what was done in response; what "之后加重" refers to.
- The echo at this presentation: whether it was transthoracic or transoesophageal; that the prolapse and severe
  regurgitation are aortic; the mitral valve (the apical systolic murmur); perivalvular extension; chamber sizes;
  pulmonary pressure; whether a TOE was done; what `fig01` shows and whether its legend adds findings.
- The cultures: draw times and intervals, time to positivity, media, how satellitism was shown; whether any antibiotic
  preceded them; the full susceptibility panel (penicillin, ceftriaxone), the method and any MIC.
- Laboratory values (haemoglobin, iron studies, white cells, CRP/ESR, procalcitonin, renal function, natriuretic peptide,
  urinalysis, rheumatoid factor), ECG and chest film.
- The type and date of the penicillin reaction.
- Whether "no petechiae or bruising" (双下肢无水肿，无瘀点瘀斑) describes the legs or the whole skin.
- The regimen behind "万古霉素等" (companion drugs, doses, levels, start date), the date of the first negative culture and
  the days of treatment before the transfer.
- Whether the Endocarditis Team or a cardiac surgeon assessed her and whether surgery was offered, declined or judged
  contraindicated; why and where she was transferred; who interrupted the antibiotics and why; the intervals from transfer
  to the interruption, the breathlessness and death; whether an autopsy was done; how the authors weigh valve destruction,
  embolism and acute left heart failure.
- That the aortic valve was native (no earlier valve surgery is recorded) and that "转院" means a transfer to another
  hospital.
- The authors' discussion (nutritionally variant streptococci, the afebrile course, the earlier diagnoses), which 1.0.0 does
  not represent.

**In the guidance (re-checked online on 2026-11-14 in the independent review; what is still open):**

- ESC 2023 endocarditis — **read in the published text:** §7.5 (Granulicatella and Abiotrophia: penicillin G, ceftriaxone
  or vancomycin for 6 weeks, an aminoglycoside for at least the first 2 weeks "in case of PVE"; large vegetations > 10 mm
  and valve replacement around 50 %); Recommendation Table 7 (vancomycin 30 mg/kg/day in 2 doses; penicillin G 12–18
  million U/day in 4–6 doses; ceftriaxone 2 g/day; gentamicin 3 mg/kg/day in 1 dose; the 2-week regimen only for
  non-complicated NVE with normal renal function; with a penicillin allergy, desensitisation, or a cephalosporin after a
  non-anaphylactic reaction, otherwise vancomycin, a beta-lactam being superior to a glycopeptide); Recommendation
  Table 10 (community-acquired NVE with a penicillin allergy: cefazolin or vancomycin with gentamicin may be considered);
  three sets at 30-minute intervals before antibiotics, from a peripheral vein; duration counted from the first day of
  effective therapy (the first negative culture); TOE recommended in suspected IE even when the TTE is positive (except
  isolated right-sided native-valve IE with a good-quality TTE); surgery timing (emergency within 24 h, urgent within
  3–5 days) and the heart-failure and vegetation ≥ 10 mm rows; oral or outpatient therapy only after ≥ 10 days of
  appropriate IV therapy in stable patients without an abscess or a valve lesion needing surgery; diagnosis and
  management of complicated IE in a Heart Valve Centre with an Endocarditis Team; MRI or PET/CT for suspected
  spondylodiscitis. **Still open:** vancomycin level targets (the case quotes none).
- 2023 Duke-ISCVID: Granulicatella and Abiotrophia among the typical organisms — confirmed by comparative studies of the
  criteria, not yet in the primary text; the definition of separate blood culture sets.
- ESC 2021 heart failure (not re-checked): initial IV furosemide 20–40 mg in loop-naive patients (1–2 times the oral dose
  otherwise); oxygen if SpO₂ < 90 % or PaO₂ < 60 mmHg; whether the 2023 focused update changes either.
- AAAAI/ACAAI 2022 drug allergy: secondary summaries confirm a cephalosporin with a dissimilar side chain without testing
  after a non-anaphylactic penicillin reaction and, as a conditional suggestion, after anaphylaxis; the primary wording
  for severe cutaneous reactions and the de-labelling pathway are still to check.
- WHO 2019 Medication safety in transitions of care (not re-checked): the document number and the recommendations cited
  (structured handover, medicines reconciliation).
- 中华医学会心血管病学分会 2014 consensus: the citation (Chin J Cardiol 2014;42(10):806-816) is confirmed by citing articles;
  whether a newer Chinese endocarditis guideline supersedes it is open.
- The DOIs of refs 5 and 8, and DOIs for refs 4, 6 and 7; whether newer editions (an ESC heart-failure guideline after
  2021, an AHA endocarditis statement after 2015) change any statement used here.

**For a clinician of the specialty (cardiology, infectious diseases):** whether to continue the empirical gentamicin for a
native-valve Granulicatella infection, where guidance differs (ESC 2023 adds an aminoglycoside only on a prosthetic
valve); when a TOE is safe for a patient who cannot lie flat.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the compound history answers
  are split (presenting problem, lying flat, onset, breathlessness, back pain, earlier treatment, fever, cough), the four
  generic examination records become six manoeuvres, the echo and culture records are staged (requested in `admission`,
  resulted in `workup`), the outcome record's cleared cultures and improvement become the `course` phase, and the
  interruption and death stay in the `followup` outcome record.
- **History.** 15 template slots (8 with the meta answer "The source notes do not provide that information") → 26 items in
  her lay voice: 13 recorded facts, 12 honest unknowns, one labelled ICE device; 10 required; the phase twin
  `status-course`.
- **Phases and gates.** 3 template phases (the first two learner-switchable, nested `all` gates) → 4 one-way phases gated on
  the preceding objectives, each needing a committed act; the outcome phase opens only after all five decisions.
- **Investigations.** 5 record reviews → 13 records: the earlier echo and the outcome as record reviews; blood cultures (three
  phase results), susceptibilities and TTE as orderable tests; eight honest `available: false` tests.
- **Interventions (SI-11, critic gap 3).** 0 → 13: IV access, oxygen (conditional), IV furosemide, vancomycin with gentamicin
  (contraindicated before the cultures), the allergy clarification, the Endocarditis Team, the urgent surgical referral, the
  dental review, the transfer handover; harmful: benzylpenicillin, oral clindamycin, deferral of surgery, stopping the
  antibiotics at transfer — each with a harm text citing its guidance.
- **Decisions.** 3 template decisions (ids `supported` / `alternative-N`, the key the longest, the third a hindsight
  appraisal reading the outcome) → 5 decisions with 4–5 options each and content ids: the first steps, the diagnosis, the
  regimen, the surgery and its timing, the transfer.
- **Rubric.** 10 template items (the only critical item a hindsight decision worded as its own key) → 12: three critical
  acts scored in their time windows (`whenIndicated`), one avoided-harm item with `scoredWhen`, first-try decision scoring
  and a SPIKES communication item written for the case (critic gap 9).
- **Teaching layer.** 6 learning outcomes (1.0.0's four rewritten with standards, plus the transfer and the communication), 6
  objectives, 5 named staff, 5 key reasoning steps and 5 dated teaching points (the 1.0.0 key reasoning repeated its teaching
  points), 8 unknowns, 8 Vancouver references.
- **Spoiler hygiene.** Intervention names are neutral (the list is visible from the start), staff briefs contain no
  result, the D4 prompt states the admission findings in the past tense, and no text calls the murmurs "new" or the valve
  "destroyed" (1.0.0 records neither; the report considers valve destruction only as a possible mechanism of death).
- **Card.** Title kept, "female" → "woman"; new spoiler-free summary; lay chief complaint; triage note as a handover; four
  presenting-feature tags; topic tags `breathlessness`, `orthopnoea`, `back-pain`; estimated time 30 → 40 min; posture
  `lying` → `sitting` (she cannot lie flat).
- **Governance.** Review status and notes in the STANDARD §6.6 wording (editorial; facts not yet checked against the full
  article; not reviewed by a licensed clinician — the English last sentence reads "The case is not yet reviewed by a licensed
  clinician." because the collection contract matches that phrase case-sensitively); six named guidelines;
  `sourceTextChecked: false`; `authorChecks` and `sourceTextSha256` removed until the source pass; `sourceDoi` +
  `doiVerifiedAt` added; the citation without double spaces or the zero-padded issue.
- **Independent review applied (2026-11-14).** *Regimen:* ESC 2023 §7.5 adds an aminoglycoside for Granulicatella only
  "in case of PVE", so the key, learning outcome 3, teaching point 3, the conclusion, the pharmacist's brief and the
  `vancomycin-four-weeks` distractor no longer teach 2 weeks of gentamicin for a valve with no recorded surgery; the key
  names vancomycin alone while the reaction is clarified, and its feedback adds ESC 2023's preference for a beta-lactam
  once it is safe. *Allergy:* the pharmacist's brief no longer attributes to AAAAI/ACAAI 2022 the avoidance of every
  beta-lactam after anaphylaxis. *TOE:* ESC 2023 recommends it even when the TTE is positive — the key, its feedback,
  teaching point 1 and the surgeon's brief now say so with its preconditions, and the reference path no longer orders a
  TOE whose preconditions the case cannot show. *Oral step-down:* the oral clindamycin harm and feedback give ESC 2023's
  criteria instead of "IV bactericidal therapy only". *Facts:* the recorded echo is no longer called transthoracic (the
  test is named "Echocardiogram" and its result says the modality is not recorded); "without benefit"/"无效" → "with
  little effect"/"效果不佳"; "a few" kept with the crackles and "about" with the 25 mm; the earlier echo's regurgitation is
  no longer assigned to the aortic valve; "near the tailbone" → "the very bottom of my back". *Safety outcome:*
  `critical` set on `vancomycin-gentamicin` (before the cultures), `benzylpenicillin` and `stop-antibiotics` — strict
  validation had warned twice and the collection contract failed on it — and the Safety outcome paragraph added.
  *Matcher:* keywords and seven test utterances for plain questions that reached nothing (Matcher notes). *Records:* the
  withheld-figure remark moved out of the in-world echo record.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, 4 examination records,
  5 record reviews, 3 decisions, 10 rubric items and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-33729/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33729 --lang en                                                 # 71 steps · objectives 6/6 · decisions 5/5 · utterances 47/47 · rubric 30/30 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-33729                                       # depth floor, do-nothing 0, wrong-first 47 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33729:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33729:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-11-14, after the independent review's fixes: all five pass (before them, strict validation reported two
warnings — `critical` unset on two high-risk interventions — and the collection contract failed on the same lint).

## 中文摘要

**病例概要。** 57岁女性，几个月前起乏力、纳差，后来腰骶部剧痛、腿活动不便，曾按脊柱关节炎和缺铁性贫血治疗，效果不佳；近来
气短加重，不能平卧；起初没有发热、咳嗽、咳痰。既往多年前因贫血输过血，患过脑膜炎（已治愈）；此前因牙髓炎看过牙；对青霉素
过敏（反应类型不明）。查体：皮肤黏膜苍白，颈静脉充盈，双肺底少许湿啰音，心尖部收缩期 3/6 级杂音和舒张期叹气样杂音，双下肢
无水肿，无瘀点瘀斑。入院前的超声心动图已提示主动脉瓣可能有赘生物、中度反流，此后病情加重。抗菌药前 3 套血培养均生长苛养颗
粒链球菌（VITEK 2 鉴定，可见卫星现象），对万古霉素等敏感，对红霉素、克林霉素耐药，未给 MIC；超声心动图：主动脉瓣赘生物最大
约 25 mm，伴瓣膜脱垂及重度反流，LVEF 48%，左心增大。诊断：确定的主动脉瓣感染性心内膜炎（两项主要标准），合并重度反流和心
衰。以万古霉素为主的治疗后血培养转阴、症状短期改善；转院后抗菌治疗中断，随后突发进行性气短并死亡，报告考虑瓣膜破坏、栓塞或
急性左心衰竭，均未证实。是否做过手术评估、转院原因、生命体征和化验都没有记录。本版依据 1.0.0 版提取的事实改写，尚未对照原
文全文核对。

**学习目标。**

1. 在没有发热的患者中识别亚急性感染性心内膜炎，在任何抗菌药之前分别穿刺采集 3 套血培养，并尽快完成经胸超声心动图（ESC 2023）。
2. 按 2023 年 Duke-ISCVID 标准归类：3 套血培养生长同一种细菌加赘生物，两项主要标准即可确诊，不需要发热。
3. 为青霉素过敏类型不明的患者制订颗粒链菌心内膜炎方案：万古霉素 30 mg/kg/d、分 2 次，从首次转阴算起 6 周，不加 ESC 2023
   只用于人工瓣膜感染的氨基糖苷类；同时问清过敏反应，确认安全后改用 β-内酰胺类（ESC 2023；AAAAI/ACAAI 2022）。
4. 判断重度主动脉瓣反流合并心衰时的手术指征与时机：心内膜炎团队安排 3–5 天内限期手术，难治性肺水肿或休克时 24 小时内急诊
   手术；≥ 10 mm 赘生物支持早期手术（ESC 2023）。
5. 区分血培养转阴、症状好转、瓣膜结构恢复与治愈，转院时保证静脉治疗不中断并做结构化交接（WHO 2019）。
6. 用 SPIKES 框架向患者说明病情的严重性、早期手术的建议以及为什么不能自行停药。

**关键决策。**

- 决策 1（治疗之前）：先分别穿刺采集 3 套血培养、之后才用抗菌药，尽快做经胸超声，条件允许时再做经食管超声（ESC 2023 即使
  经胸超声阳性也推荐；先问吞咽困难和食管疾病、查凝血）；干扰项为先用抗菌药、
  等发热再抽血培养、只抽 1 套加炎症指标、先做腰骶椎磁共振。决策 1 答对并采集血培养、申请超声之后，检查结果才回报。
- 决策 2（诊断）：两项主要标准确定感染性心内膜炎；干扰项为“无发热只能算可能”、污染、脊柱关节炎累及主动脉根部、非细菌性血栓性
  心内膜炎。
- 决策 3（抗菌方案）：单用万古霉素 6 周（从首次转阴算起；ESC 2023 只对人工瓣膜感染加用氨基糖苷类，过敏反应查清、确认安全后
  改用 β-内酰胺类）；干扰项为青霉素加庆大霉素 4 周、头孢曲松 2 周短疗程、万古霉素加庆大霉素 4 周从第一剂算起、口服克林霉素回家治疗。
- 决策 4（手术）：心内膜炎团队安排 3–5 天内的限期手术，病情恶化时 24 小时内急诊；干扰项为疗程结束后择期换瓣、休克时才手术、
  等血培养转阴再手术、仅凭赘生物大小今晚急诊。必须在检查回报阶段实际转诊，才算关键项达成。
- 决策 5（转院）：静脉治疗一剂不漏的结构化交接；干扰项为血培养转阴即停药、转院途中改口服、只写诊断的出院小结。

**复盘要点（PEARLS）。** 先谈面对“关节炎和贫血”数月、如今躺不平的患者时的感受；用两句话说清诊断依据和第一剂药之前做了什么；
分析发热在诊断标准中的位置、入院前那份超声报告应当触发什么（当时的处理没有记录，不要假定被忽视）、为什么要 3 套血培养且在抗
菌药之前、卫星现象的意义、过敏类型不明时怎样选药、为什么是 6 周及从哪天算起、抗菌药能否让漏的瓣膜关紧、什么情况下手术从限期
变为急诊、血培养转阴和好转说明什么不说明什么、转院时必须交接什么；总结下次遇到“关节炎加贫血”又出现舒张期杂音和心衰的患者怎么做。
评分：确定性总分 30 分，三项关键项（入院时先采血培养再用万古霉素联合庆大霉素；首次作答即选限期手术并在检查回报阶段请心内膜炎团
队、转诊心外科；首次作答即选治疗不中断的转院方案并完成交接、没有停药），沟通项由考官评判。记录中的处置（以万古霉素为主的治疗、
转院后抗菌治疗中断）只作为历史对照，不代表现行推荐；不要把死亡单纯归因于治疗中断。本病例经人工智能辅助编辑审核，尚未经执业医
师审核；待核实事项见上文 “To verify”。

**安全结果。** 三项处置标记为关键（critical）：血培养之前给万古霉素联合庆大霉素、青霉素过敏反应未查清时给青霉素 G、转院时停用静脉抗菌药——任何一项在禁忌时实施，无论得分多少，本次运行的安全结果都判为未通过；口服克林霉素和推迟到疗程结束后再手术属于可以纠正的错误，只在评分中扣分。
