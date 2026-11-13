# cmcr-1067477 — Recurrent heavy bleeding after an induced birth · 31-year-old woman

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (孙知远 / Sun Zhiyuan) is
> pseudonymous; the case is a teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患者为化名；本病例改编自已发表的病例报告，不构成医疗建议。
>
> **Status of the facts.** Version 1.1.0 was re-authored from the facts that version 1.0.0 extracted from the
> report. The full article was not available; no patient fact has been added or changed, and none has yet been
> checked against the full text (`extensions.sourceTextChecked: false`). The "To verify" list names what to look
> for in the source.

## Case card

| | |
|---|---|
| Case | `cmcr-1067477` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 刘培艳, 肖小敏. 产后坏死性子宫肌炎一例. 中华产科急救电子杂志. 2013;2(2):141-143 |
| Setting / facility | Obstetric ward (`inpatient`) → theatre → ward → theatre → ICU · `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 minutes (static clock; four phases, five decisions, 18 interventions) |
| Specialty | Obstetrics, critical care |
| Languages | zh-CN (source language), en |
| Learner level | Final-year students, obstetric and gynaecology residents, ICU residents, midwives |
| Review status | Editorial review 2026-10-30 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; patient facts not yet checked against the full article. Have an obstetrician, an intensivist and an infectious diseases physician review it before teaching use |
| Content | 20 history items (8 not recorded, 7 required) · 6 exam findings · 18 investigations (4 record reviews, 9 without any recorded result) · 18 interventions (6 contraindicated in some or all phases) · 6 objectives · 5 decisions (20 options) · 12 rubric items (11 deterministic, weight 33; 1 examiner-judged; 3 critical) · 5 staff characters · 6 learning outcomes · 6 teaching points · 39 test utterances |

`infectious-disease` was removed from the 1.0.0 specialty list: on the library card it would point at the answer
(STANDARD §6.7). The infection guidance (WHO 2015, SMFM 2023, SSC 2021, IDSA 2014) is still cited and taught.

## Learning outcomes

By the end of the case the learner can:

1. Work up secondary postpartum haemorrhage for retained tissue, endometritis, subinvolution and a placenta accreta
   spectrum: take swabs and blood cultures, start IV antibiotics when endometritis is suspected (WHO 2015:
   clindamycin with gentamicin), and have a senior obstetrician evacuate retained tissue under ultrasound guidance
   (RCOG 2016).
2. Read an empty cavity with a still enlarged, heterogeneous uterus and a rising white count and CRP as infection or
   necrosis of the uterine wall even without a marked fever, image it, and stop blind curettage.
3. Run the obstetric major haemorrhage response for secondary PPH with shock (BP 53/34 mmHg): red cells and plasma
   early and fibrinogen kept above 2 g/L during ongoing bleeding (RCOG 2016); and explain why tranexamic acid is
   not started more than 3 hours after the birth (WHO 2017; WHO/FIGO/ICM 2025).
4. When septic shock is possible, give broad-spectrum antibiotics including clindamycin within the hour (SSC 2021;
   SMFM 2023) and achieve source control as soon as it is practical.
5. When tissue from the cervix is extensive necrotic myometrium, choose laparotomy and hysterectomy to remove the
   source (IDSA 2014) rather than hysteroscopic separation, uterus-sparing excision or uterine artery embolisation,
   explaining the risks and alternatives to her and obtaining her explicit consent (Civil Code of China, Article
   1219).
6. Plan care after the hysterectomy: antibiotics continued according to cultures and progress, prophylactic LMWH for
   at least 10 days once bleeding is controlled (RCOG 2015), correction of anaemia, psychological support and
   postnatal follow-up.

These are `learningOutcomes`. They name the diagnosis, so front-ends show them before play only behind the closed
**Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief (CASE_AUTHORING §9.4,
GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A 31-year-old woman's membranes ruptured at just over 28 weeks and the birth was induced about 10 hours later.
About 2 hours after the birth she began to bleed heavily, with dizziness, sweating, cold limbs, chest tightness,
palpitations and breathlessness, and shock (BP 40/20 mmHg, a thready, rapid pulse); she had no fever or chills when
the bleeding began. The unit that treated her evacuated the uterus, repaired a perineal tear, transfused her and gave
uterotonics; the bleeding lessened but kept recurring, and after 3 days she was transferred. She had one previous
caesarean section and, after it, four induced abortions; she denies underlying illness and pregnancy complications
such as gestational diabetes. On transfer her temperature was 37.4 °C; the fundus was at the umbilicus and poorly
contracted (recorded at the "readmission"); ultrasound initially showed a heterogeneous mass of about
28 × 18 × 36 mm in the cavity; the white count was 13.04×10⁹/L and coagulation was normal at one assessment.

After a repeat evacuation the cavity was empty, but the uterus remained enlarged and heterogeneous; the white count
rose to 16.12×10⁹/L with neutrophilia, CRP was about 14.52–15.82 mg/L, and fever was never prominent. At a third
admission she bled heavily again: BP 53/34 mmHg, pulse 110/min, pallor and cold limbs, with a 70 × 62 × 51 mm mass
within the cervix and vagina. Tissue from the cervix was extensive necrotic myometrium with inflammatory exudate.
The report's team then attempted hysteroscopic separation, during which a perforation occurred, and resected a wedge
of the fundus (no villi); she bled heavily again, infection was found, and the uterus was removed (myometrial
necrosis again, with suppurative subcutaneous inflammation; drainage cultures negative). She recovered and was
discharged. The report's diagnosis: necrotising myometritis, endometritis and recurrent haemorrhagic shock.

Today's answer: treat secondary PPH as possibly infected from the start (cultures, then IV antibiotics; a senior,
ultrasound-guided evacuation with blood ready), look past the cavity once it is empty (imaging, broad-spectrum
antibiotics, no more curettage), resuscitate the third-admission shock with blood and give broad-spectrum
antibiotics within the hour, and remove the necrotic uterus by hysterectomy — with her consent — rather than
instrumenting it again or embolising it.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires: the case shows
the report's recorded states and never simulates the learner's treatment. Every phase is one-way
(`learnerSwitchable: false`).

| Phase | When | Entered when | What is there |
|---|---|---|---|
| `transfer` (initial) | arrival after 3 days of recurrent bleeding | start | her own history; temperature and fundus; the transferring unit's notes (BP 40/20 mmHg in the earlier shock); the first scan (cavity mass) and white count; coagulation "normal at one assessment"; unrecorded tests (crossmatch, cultures, swabs, renal function, hCG, CA-125); decision 1; antibiotics, oxytocin and the evacuation |
| `after-evacuation` | after the repeat evacuation | objectives 1–3 done (decision 1 right **and** the evacuation done) | the post-evacuation scan, the later white count with neutrophilia, the CRP range, "no marked fever"; CT (no result); decision 2 |
| `third-admission` | a later, third admission (interval not recorded) | objective 4 done (decision 2 right **and** IV antibiotics given) | heavy bleeding again, BP 53/34 mmHg, pulse 110/min, pallor, cold limbs, the cervical and vaginal mass; resuscitation; the tissue histology; decisions 3–5; consent, hysterectomy, post-operative care |
| `followup` | to discharge | all five decisions right | the outcome record (with the two approved figures), the operative histology, the drain cultures |

Gating choices. The post-evacuation phase needs the evacuation, the report's own step and the guideline step for
retained tissue. The third-admission phase needs IV antibiotics: the record does not say whether she had them, and
the case does not let a learner reach the next catastrophic bleed without having started them (the "in time" score
is therefore about the first answer and the cultures). From the third admission on the case follows the recorded
course whatever the learner did before. The acute third-admission acts (haemorrhage call, transfusion, escalation
of antibiotics, removal of the tissue) count "in time" until the post-operative decision is attempted; consent
counts only before the hysterectomy. A learner who skips them, reaches the outcome and re-selects the third-admission
phase to do them earns no in-time credit (measured below). No prompt, hint, phase description or order response
states the report's management before the follow-up record; the hysteroscopy, wedge-resection and hysterectomy
responses point to the outcome record without describing it. Intervention names and dose texts are visible from the
start, so they name no diagnosis and no later finding ("Ease out tissue under a speculum", "Laparotomy with local
excision, keeping the uterus").

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-bleeding-story` — Take the history of the bleeding and the birth (onset, birth, shock symptoms, earlier treatment, uterine surgery, fever).
2. `obj-transfer-findings` — Examine her uterus and read the transfer results (temperature, fundus; first scan and white count).
3. `obj-transfer-plan` — Decide and act on the transfer findings (decision 1; the evacuation).
4. `obj-after-evacuation` — Reassess her after the evacuation and start treatment (scan, white count, CRP, temperature; decision 2; IV antibiotics).
5. `obj-third-admission` — Third admission: resuscitate first, then get a tissue diagnosis (her account, vital signs, colour and limbs, speculum; decision 3; haemorrhage call, transfusion, removal of the tissue; histology read).
6. `obj-definitive-and-outcome` — Definitive treatment, the plan after it, and the reported outcome (decision 4, consent, hysterectomy, decision 5, outcome record).

Hints are Socratic questions; none contains a key's text (`cases validate` checks it) and none states a result the
learner has not yet obtained.

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `transfer-plan` | the five core history items, temperature, fundus, transfer scan and white count | secondary PPH from retained tissue that may be infected, accreta in mind: crossmatch, cultures then IV antibiotics, a uterotonic, senior ultrasound-guided evacuation with blood ready | evacuation on a routine list and no antibiotics because 37.4 °C and 13.04×10⁹/L "are normal after a birth"; atony only — uterotonics, no instrumentation, embolisation if worse; accreta assumed — hysterectomy now |
| 2 | `post-evacuation` | post-evacuation scan, white count, CRP, temperature | infection or necrosis of the uterine wall: cultures, broad-spectrum IV antibiotics with anaerobic cover, contrast CT or MRI, senior review in hospital, no more curettage | a third evacuation for "hidden placenta" (**close to the report's pattern of instrumentation**); "no fever" — oral antibiotics and discharge; prophylactic embolisation for a presumed vascular lesion or accreta |
| 3 | `third-bleed` | her account, BP and pulse, colour and limbs, speculum | haemorrhage protocol with early red cells and plasma, fibrinogen > 2 g/L; ease out the tissue for histology; broad-spectrum antibiotics within the hour; alert theatre | 30 mL/kg crystalloid as for septic shock and blood only once the haemoglobin is back; straight to embolisation; bedside curettage of cervix and cavity |
| 4 | `definitive-plan` | decision 3 and the tissue histology | hysterectomy at laparotomy once resuscitation allows, broad-spectrum antibiotics including clindamycin, after explaining to her and taking her consent | hysteroscopic separation to keep the uterus (**the report's step**); local excision keeping the uterus (**close to the report's wedge resection**); 48–72 h of antibiotics with embolisation, operating only for high fever or rebleeding |
| 5 | `after-surgery` | decision 4 and the hysterectomy | ICU or HDU; antibiotics guided by cultures; prophylactic LMWH once bleeding is controlled, ≥ 10 days; correct anaemia; psychological support | stop antibiotics and no anticoagulant for 6 weeks; treatment-dose LMWH at once, oral antibiotics, home on day 3; general ward, 24 h of antibiotics, support only if she asks |

All decisions are single best answer with option-specific feedback naming the guidance. Length cue: the key is the
uniquely longest option only in decision 3 (both languages); in every other decision at least one distractor is as
long or longer (measured by the authoring script and checked by `cases validate`).

### Rubric (11 deterministic items, weight 33, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-history` | History | onset and course of the bleeding, the birth, shock symptoms, earlier treatment, past uterine surgery; and fever, pain, offensive discharge, the placenta, medicines, allergies and the baby (the last six unrecorded: asking is the competency) | 3 |
| `rb-examination` | Examination | temperature and fundus at transfer; temperature after the evacuation; BP and pulse, colour and limbs, speculum at the third admission | 2 |
| `rb-investigations` | Investigations | scans and white counts at transfer and after the evacuation, the CRP, the tissue histology; crossmatch **ordered at transfer** | 2 |
| `rb-transfer-plan` | Diagnosis | decision 1 first time, and the evacuation done after the scan was read (`whenIndicated`) | 3 |
| `rb-infection-recognised` | Diagnosis | decision 2 first time, IV antibiotics in the transfer or post-evacuation phase, blood cultures ordered before the third admission | 4 |
| `rb-haemorrhage-resuscitation` | Management · **critical** | haemorrhage protocol and transfusion during the acute third admission (`whenIndicated`) | 4 |
| `rb-third-bleed` | Management | decision 3 first time, broad-spectrum antibiotics and removal of the tissue during the acute third admission | 3 |
| `rb-source-control` | Management · **critical** | hysterectomy during the third admission (`whenIndicated`; contraindicated earlier) | 4 |
| `rb-definitive-plan` | Management | decision 4 first time, and the consent talk before the hysterectomy | 3 |
| `rb-avoided-harm` | Safety · **critical** | no repeat curettage, no hysteroscopic separation, no uterus-sparing excision, no embolisation; `scoredWhen` decision 2 or 4 attempted or any of the four done | 3 |
| `rb-after-surgery` | Management | decision 5 first time, ICU admission, LMWH once indicated, psychological support | 2 |
| `rb-communication` | Communication (examiner) | the pre-operative conversation about the hysterectomy (SPIKES and informed consent; her fertility; her own decision) | 1 |

### How wrong choices score (measured 2026-10-30 with the core engine)

| Path | Score | Critical items missed | Flagged in the debrief |
|---|---|---|---|
| Reference `solution` | 33/33 (100 %) | none | none |
| Start and do nothing | 0/30 (0 %) | `rb-haemorrhage-resuscitation`, `rb-source-control` | — (`rb-avoided-harm` not scored) |
| Wrong first answer at every decision, then the key | 18/33 (55 %) | none | none |
| Wrong first at decision 1, 3 or 4 only | 30/33 (91 %) | none | none |
| Wrong first at decision 2 only | 29/33 (88 %) | none | none |
| Wrong first at decision 5 only | 31/33 (94 %) | none | none |
| Reference plus a repeat evacuation after the empty-cavity scan | 30/33 (91 %) | `rb-avoided-harm` | evacuation (contraindicated) |
| Reference plus hysteroscopic separation, local excision or embolisation at the third admission | 30/33 (91 %) each | `rb-avoided-harm` | the act (contraindicated) |
| Reference plus a hysterectomy at transfer | 26/33 (79 %) | `rb-source-control` | hysterectomy (contraindicated); the later one is refused (one dose) |
| Acute third-admission acts done only after the outcome opened (phase re-selected) | 26/33 (79 %) | `rb-haemorrhage-resuscitation` | none |
| Consent talk only after the hysterectomy | 30/33 (91 %) | none | none |
| No blood cultures before the third admission | 29/33 (88 %) | none | none |
| Unrecorded history questions not asked | 30/33 (91 %) | none | none |
| Reference plus LMWH before the hysterectomy | 33/33 (100 %) | none | LMWH (contraindicated) |
| Reference plus tranexamic acid at the third admission | 33/33 (100 %) | none | none (neutral; the response gives WHO's 3-hour limit) |

Ordering cannot be scored by the condition language (CMCR_CASES "Known limits"): LMWH during active bleeding is
flagged as a contraindicated act in the debrief but costs no marks. Tranexamic acid is neutral rather than
contraindicated: WHO does not support starting it more than 3 hours after the birth, but no guidance seen calls it
harmful days later; its response says so.

## Reference path (`solution`)

77 steps: start → 16 transfer history items (including the 7 unrecorded ones she cannot answer) → temperature and
fundus → IV access → transferring unit's notes, scan, blood count and coagulation ordered and read → crossmatch,
blood cultures, swabs, renal function and hCG ordered (no recorded result) → decision 1 → IV clindamycin with
gentamicin (allergies asked first), oxytocin → evacuation (→ `after-evacuation`) → her account → temperature → scan,
blood count and CRP read → CT ordered (no result) → decision 2 (→ `third-admission`) → her account → BP and pulse,
colour and limbs, speculum → decision 3 → haemorrhage protocol, transfusion, blood cultures, broad-spectrum
antibiotics, lactate and coagulation ordered, tissue removed → histology read → decision 4 → her fertility wishes and
her thoughts → consent talk → hysterectomy → ICU, LMWH, psychological support → decision 5 (→ `followup`) → outcome
record, operative histology and drain cultures read → finish. It scores **33/33** with no contraindicated act;
`cases verify` passes, and the offline demonstration finishes with every objective at the clinical score in clinical
and in-world mode, in both languages.

## Clinical numbers check

Every value is version 1.0.0's, unchanged; no reference range, vital sign or dose of the report has been added.
Extraction map (1.0.0 field → 1.1.0 field):

| Fact (as recorded) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 31-year-old woman | `patient.age`, `sex` | `patient` |
| 3 days of recurrent heavy vaginal bleeding after an induced delivery | `patient.chiefComplaint` | chief complaint, `history.bleeding-onset`, triage note |
| Heavy bleeding from about 2 h after delivery, recurring | `history.onset`, opening line | `history.bleeding-onset`, `referral-notes` |
| Membranes ruptured at 28+ weeks (孕28周多), induced delivery about 10 h later | `history.delivery` | `history.delivery`, triage note, `referral-notes` |
| Dizziness, sweating, cold limbs, chest tightness, palpitations, breathlessness while bleeding | `history.shock` | `history.shock-symptoms` |
| Evacuation, perineal tear repair, transfusion, uterotonics; bleeding lessened; referred | `history.treatment`, `patient.triageNote` | `history.earlier-treatment`, `history.bleeding-course`, `referral-notes`, triage note |
| One previous caesarean, then four induced abortions | `history.surgery` | `history.prior-uterine-surgery` |
| No fever or chills when the bleeding first began | `history.fever` | `history.fever` |
| Denies underlying illness and complications such as gestational diabetes | `history.prior-health` | `history.pmh` |
| Temperature 37.4 °C at the first transfer | `exam.first-exam` | `exam.obs-transfer`, triage note |
| Earlier shock: BP 40/20 mmHg, thready rapid pulse | `exam.first-exam` | `referral-notes`, triage note (BP) |
| "Readmission": fundus at the umbilicus, poor contraction | `exam.uterus` | `exam.fundus` (transfer phase, as in 1.0.0) |
| Initially a heterogeneous cavity mass of about 28 × 18 × 36 mm | `investigations.ultrasound` | `pelvic-ultrasound` (transfer; dated "early in the course") |
| After repeat evacuation no cavity mass; uterus enlarged, heterogeneous | `investigations.ultrasound` | `pelvic-ultrasound` (after-evacuation), phase `after-evacuation` |
| White cells first 13.04, then 16.12 ×10⁹/L; neutrophils raised | `investigations.inflammation` | `fbc` (transfer; after-evacuation, with the neutrophilia) |
| CRP about 14.52–15.82 mg/L | `investigations.inflammation` | `crp` (after-evacuation) |
| Coagulation normal at one assessment | `investigations.inflammation` | `coagulation` (transfer) |
| Fever not prominent | `investigations.inflammation` | `exam.obs-after-evac` |
| Third admission: heavy bleeding, BP 53/34 mmHg, pulse 110/min, pallor, cold limbs | `investigations.recurrence` | phase `third-admission`, `history.status-third`, `exam.obs-third`, `exam.general-third` |
| A 70 × 62 × 51 mm mass within the cervix and vagina | `investigations.recurrence` | `exam.speculum-third` ("its recorded size") |
| Cervical tissue: extensive necrotic myometrium and inflammatory exudate | `investigations.pathology` | `tissue-histology` (third-admission) |
| Hysteroscopic separation with perforation; fundal wedge resection | `investigations.followup` | `outcome-record` |
| Fundal resection: no villi | `investigations.pathology` | `operative-pathology` |
| Further haemorrhage, infection found; hysterectomy; recovery and discharge | `investigations.followup` | `outcome-record` |
| Hysterectomy specimen: myometrial necrosis, suppurative subcutaneous inflammation | `investigations.pathology` | `operative-pathology` |
| Drainage cultures negative | `investigations.pathology` | `drain-culture` |
| Diagnosis: necrotising myometritis, endometritis, recurrent haemorrhagic shock | `debrief.conclusion` | `outcome-record`, debrief |
| Not recorded: pathogen, transfusion totals, myometrial thickness (inconsistent), long-term recovery | `unknowns`, judge guidance | `unknowns`, result notes |

Derived values (editorial, for teaching): mean arterial pressure ≈ 26.7 mmHg at 40/20 mmHg and ≈ 40.3 mmHg at
53/34 mmHg; shock index at the third admission 110 ÷ 53 ≈ 2.1; white count rise 16.12 − 13.04 = 3.08×10⁹/L
(≈ 24 %); ellipsoid volumes (π/6 × a × b × c) ≈ 9.5 mL for the 28 × 18 × 36 mm cavity mass and ≈ 116 mL for the
70 × 62 × 51 mm cervical and vaginal mass (two different findings at two times — not a measured growth); a birth at
just over 28 weeks is preterm (< 37 weeks), a postnatal thrombosis risk factor; the transfer after "3 days" of
bleeding that began 2 hours after the birth falls around postnatal day 3 (approximate). No haemoglobin, platelet
count, fibrinogen or lactate is recorded, so no transfusion trigger, PLASMIC-type or sepsis score is computed.

Doses in the case are guideline or standard-practice formulas, not the report's: clindamycin 900 mg IV every 8 h
with gentamicin 5 mg/kg IV once daily (WHO 2015 regimen; doses from standard practice); piperacillin–tazobactam
4.5 g IV every 6 h with clindamycin 900 mg every 8 h, vancomycin if MRSA is a risk (IDSA 2014 principles); oxytocin
5 units slow IV, then 40 units in 500 mL at 125 mL/h (RCOG 2016); fibrinogen kept above 2 g/L with cryoprecipitate
(RCOG 2016); tranexamic acid 1 g IV over 10 minutes (neutral here); enoxaparin 40 mg SC daily for 50–90 kg
(RCOG 2015). No weight is recorded, so no dose is computed.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did it feel when she came back a third time with a blood pressure of 53/34?"
2. **Description** — "Take me through her three admissions: what did you think each time, and what did you do?"
3. **Analysis**
   * "Bleeding three days after a birth: which causes did you list, and what in her history moved accreta up the list?"
   * "Her temperature was 37.4 °C and her white count 13.04 — why give antibiotics anyway, and after what?"
   * "After the evacuation the cavity was empty. What did the uterus itself tell you, and what imaging did you want?"
   * "No marked fever, yet a rising white count and CRP: how do you weigh a single temperature against a trend?"
   * "At 53/34, what did you give first — and why not 30 mL/kg of crystalloid?"
   * "How did you handle the mass in the cervix, and why not a curette?"
   * "Why not embolise? What does embolisation do to an infected uterus?"
   * "Once the histology showed necrotic myometrium, what were the options, and why did keeping the uterus lose?"
   * "The report's team tried hysteroscopic separation and a wedge resection first. What would you say to them today?"
   * "How did you open the conversation about a hysterectomy with a 31-year-old? What did you ask her before you explained?"
   * "After the operation, what new risks did she carry — and when did her LMWH start?"
4. **Summary** — "What will you do the next time secondary PPH keeps coming back after the cavity is clear?"

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it | Where it scores |
|---|---|---|
| Treating 37.4 °C and a white count of 13.04 as "normal after a birth" and withholding antibiotics | decision 1 distractor; the third admission waits for IV antibiotics | `rb-transfer-plan`, `rb-infection-recognised` |
| Evacuating without senior input or blood despite one caesarean and four terminations | decision 1 key and feedback (accreta risk) | `rb-transfer-plan` |
| Anchoring on retained tissue — a third curettage | decision 2 distractor; evacuation contraindicated after the transfer | `rb-infection-recognised`, `rb-avoided-harm` (critical) |
| "No fever, no infection" — discharge on oral antibiotics | decision 2 and 4 distractors (feedback: trend over a single temperature) | `rb-infection-recognised`, `rb-definitive-plan` |
| Crystalloid first and waiting for a haemoglobin in haemorrhagic shock | decision 3 distractor | `rb-third-bleed` |
| Embolising an infected, necrosing uterus | decisions 1–4 distractors; `uae` contraindicated in every phase | `rb-avoided-harm` (critical) |
| Curetting or hysteroscopically separating a necrotic wall (the report's course) | decision 3 and 4 distractors; acts contraindicated | `rb-avoided-harm` (critical) |
| Keeping the uterus at all costs | decision 4 distractor (local excision); `wedge-resection` contraindicated | `rb-definitive-plan`, `rb-avoided-harm` |
| Hysterectomy too early (at transfer or after the evacuation) | `hysterectomy` contraindicated in those phases | `rb-source-control` (critical) |
| Consent from relatives, or consent after the operation | `consent-talk` counts only before the hysterectomy; examiner item | `rb-definitive-plan`, `rb-communication` |
| Stopping antibiotics at once, or anticoagulating while she bleeds | decision 5 distractors; LMWH contraindicated before haemostasis | `rb-after-surgery` |
| Inventing the unrecorded (haemoglobin, cultures, the baby) | unknown items, no-result records, `examNotRecorded` | — |

## Embodied mode

* **Where she is.** Obstetric ward bed (`inpatient`) at the start. The evacuation takes her to theatre
  (`destination: { setting: "operating-room" }`); the `after-evacuation` and `third-admission` phases bring her back
  to a ward bed (`location: { setting: "inpatient" }`). The CT is done in the CT room (`performedAt: "provider"`:
  she is taken there; no result is recorded). The hysterectomy takes her to theatre and the ICU admission to an ICU
  bed. The harmful embolisation, if chosen, takes her to the angiography table (`{ capability: "fluoroscopy" }`).
* **Kit.** IV access is a procedure (`iv-access`, crash or treatment cart); oxytocin needs the bedside infusion
  pump; blood products come from the blood bank to the bedside; the pelvic ultrasound is a bedside scan with the
  portable ultrasound cart (`performedAt: "bedside"`); bloods and cultures are sampled at the patient; the tissue
  goes to histopathology. The evacuation, hysterectomy, removal of the tissue, consultations and the consent talk
  need only the clinician (and theatre where the destination says so).
* **Record reviews.** The transferring unit's notes, the outcome record, the operative histology and the drain
  cultures are `performedAt: "records"`, `requires: ["records"]`, `risk: "none"`.
* **Who speaks.** She is conscious in every phase and answers for herself; there is no companion. Her conscious
  level at the third admission is not recorded — the case lets her answer briefly (a teaching adaptation).
* **Scope of practice.** The evacuation, hysteroscopy, embolisation, hysterectomy, local excision and removal of
  the tissue are medical acts; drugs, fluids and blood follow their kinds (nursing administration); the haemorrhage
  call, consultations and the consent talk are clinician acts.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-1067477:"` passes in en and zh-CN (every objective done,
  in-world score equal to the clinical score).

## Source and adaptation (fidelity limits)

**From the report, via version 1.0.0 (kept as fact).** Every fact in the extraction map above: her age; the birth
induced about 10 hours after membranes ruptured at just over 28 weeks; heavy bleeding from about 2 hours after the
birth with shock (BP 40/20 mmHg) and its symptoms; the evacuation, perineal repair, transfusion and uterotonics; the
3 days of recurrent bleeding; one caesarean and four induced abortions; no fever at the first bleed; no underlying
illness; temperature 37.4 °C; the fundus at the umbilicus with poor contraction; the two scans; the white counts, CRP
and coagulation; fever not prominent; the third admission (BP 53/34 mmHg, pulse 110/min, pallor, cold limbs, the
70 × 62 × 51 mm mass); the cervical tissue histology; the hysteroscopic separation and perforation, the fundal wedge
resection (no villi), further bleeding and infection, the hysterectomy and its histology, negative drain cultures,
recovery and discharge; the report's diagnosis.

**Adapted for teaching.** Her lay words, her worries and her wishes about the treatment (labelled as part of the
role; they add no fact); the staging into four phases; the transferring unit's notes as a record review; the first
scan dated "early in the course" and placed with the transfer; the first white count and the coagulation in the
transfer phase and the later white count, the CRP and "no marked fever" after the evacuation (1.0.0 gives no times);
the "readmission" uterine findings in the transfer phase (as 1.0.0 placed them); the mass in the cervix and vagina
shown at the speculum examination with "its recorded size"; letting her speak at the third admission; the staff
characters (Midwife Bai, Dr Zhong, Dr Qiu, Dr Shen, Dr Fang); the decisions, interventions, rubric, feedback,
teaching points and doses (current guidance).

**Inconsistencies and unclear points in 1.0.0, kept, not resolved.**
* "首次转入" (first transfer: temperature 37.4 °C) and "再次入院" (readmission: fundus at the umbilicus, poor
  contraction) may be the same hospital stay or two; 1.0.0 placed both at the start, and so does the case.
* The chief complaint gives 3 days of bleeding, while the course spans three admissions whose intervals are not
  given.
* The CRP is only a range (about 14.52–15.82 mg/L): how many measurements, and when, is not recorded.
* The pathology record is titled "排出组织" (expelled tissue) but its text says "宫颈组织" (cervical tissue):
  whether the tissue was passed or removed is not recorded, nor whether the hysteroscopic separation came before or
  after its histology.
* The mass in the cervix and vagina has three dimensions, which suggests imaging; how it was found is not recorded.
* The hysterectomy specimen shows "皮下化脓性炎症" (suppurative subcutaneous inflammation): the site is unclear
  (the abdominal wound?).
* The myometrial thickness is listed in 1.0.0 as "inconsistent" with no values; the case shows none.
* 1.0.0's English said "after 28 weeks" where its Chinese says "孕28周多" (just over 28 weeks); the case follows the
  Chinese.

**Not recorded and kept unknown** (`unknowns`, unknown history items, no-result records, `examNotRecorded`):
haemoglobin, platelets, fibrinogen, lactate; transfusion totals and products; the uterotonics; any antibiotic; blood,
swab and tissue cultures and the organism; renal function; hCG; CT or MRI; the vital signs at transfer other than
the temperature; the Doppler of the mass; the baby, the placenta and breastfeeding; her allergies, medicines and
family history; her wishes about fertility; the intervals between admissions; the operations' details; long-term
recovery.

**Wording of unknowns (STANDARD §6.3).** Because the article has not been checked, no text claims that the *report*
lacks something: no-result records say "No result is recorded for this test" / “此项检查没有结果记录”, steps the case
does not record say "This case does not record whether this was done; it does not simulate its effect", and
`examNotRecorded` says "This case does not record this examination." / “本病例没有记录这项检查。”. She answers
unknowns in lay words ("I'm not sure, doctor." / “这个我说不上来，医生。”).

**Survey findings applied.** The survey (`survey/survey.json`) has no case-specific audit of cmcr-1067477; its
template findings all applied here and are fixed: generic history slots and record-style questions ("Is medicine
allergies documented?") replaced by case questions; answers that said "the source case does not provide that
information" replaced by lay unknowns; persona fields written for her; three generic decisions with `yes` keys
replaced by five decisions with content ids; no interventions → 18; the critical item was a multiple-choice answer
("avoid unsupported repeat evacuation") → three critical acts; `rb-unknown` (asking about an unrecorded allergy as a
"safety" item) removed; a companion-free adult voice; examination and investigations restructured with values and
phases; the guideline list (one WHO 2025 entry with an unverified URL) rebuilt.

**Privacy.** Pseudonym 孙知远 / Sun Zhiyuan (unchanged from 1.0.0); no hospital, date, place or occupation; relative
time only. **Figures.** The two figures approved in `scripts/cmcr-105-media-review.json` (`fig01.png`, `fig02.png`)
are attached to the outcome record only, so they appear once the case is complete; their content was not viewable in
the authoring environment, so their titles are neutral and no decision depends on them.

### To verify

Details to look for in the full article (the source check is pending):
* The admissions: whether the "readmission" (fundus at the umbilicus, poor contraction) is the first transfer; the
  postnatal day of each admission; the intervals between them; whether she went home in between.
* The vital signs at transfer other than the temperature, and at the readmission; her conscious level at the third
  admission.
* The full blood panels with their timing: haemoglobin, platelets, fibrinogen and coagulation values; the two (?) CRP
  values; which white count carried the neutrophilia.
* The ultrasound: Doppler of the cavity mass; the inconsistent myometrial thickness values; how the 70 × 62 × 51 mm
  mass was seen and measured.
* Microbiology and antibiotics: blood, swab and tissue cultures and any organism; which antibiotics were given and
  when; whether the drain samples were taken before or after antibiotics; the drain site.
* Transfusion volumes and products; the uterotonics (names and doses); any tranexamic acid.
* The birth: the mode (a vaginal birth is implied by the perineal tear); the placenta; the baby's outcome;
  breastfeeding.
* The tissue: "expelled tissue" versus "cervical tissue"; whether the hysteroscopic separation came before or after
  its histology; what was separated; the site of the perforation; the wedge resection; total or subtotal
  hysterectomy; the site of the "suppurative subcutaneous inflammation".
* Whether CT, MRI or hCG were done; long-term physical and psychological recovery; what the two figures show.

Guidance details to confirm in the full texts (taken from abstracts and secondary summaries):
* RCOG Green-top Guideline 52 (2016), secondary PPH: the exact wording on swabs and cultures, on ultrasound ("may
  help to exclude retained products" — confirmed in an excerpt; "unreliable" from memory), antibiotics when
  endometritis is suspected, evacuation by an experienced clinician, and interventional radiology; the oxytocin
  infusion regimen (5 units slow IV; 40 units in 500 mL at 125 mL/h). Fibrinogen > 2 g/L with cryoprecipitate was
  confirmed by search. RCOG reports a third edition in development; none was found published.
* WHO 2015 (maternal peripartum infections): clindamycin with gentamicin for postpartum endometritis is confirmed
  (conditional, very low certainty); the doses (clindamycin 900 mg every 8 h; gentamicin 5 mg/kg daily) are
  standard practice, not taken from the WHO text.
* WHO 2017 tranexamic acid: "should not be initiated more than 3 hours after birth" (except for bleeding restarting
  within 24 h of a first dose) and its carry-over into the 2025 consolidated guideline — confirmed in summaries.
* WHO/FIGO/ICM 2025: 1.0.0 cited `who.int/publications/i/item/9789240115637`; that ISBN and URL could not be
  confirmed, so the guideline is cited through its NCBI Bookshelf record (NBK619233).
* SSC 2021: antimicrobials ideally within 1 hour for possible septic shock or a high likelihood of sepsis
  (confirmed); the source-control wording "as soon as medically and logistically practical" (partly confirmed).
* SMFM Consult Series #67 (2023): the recommendation numbers and wording (antibiotics within 1 h; cultures first
  without substantial delay; lactate) — from the SMFM PDF summary and secondary sources.
* IDSA 2014: prompt surgical debridement of necrotising infection; empirical vancomycin or linezolid with
  piperacillin–tazobactam or a carbapenem; penicillin with clindamycin for group A streptococcal necrotising
  infection — from secondary summaries; piperacillin–tazobactam 4.5 g every 6 h is standard dosing.
* Uterine artery embolisation and infection: "absolute" for elective embolisation and "relative" in
  life-threatening PPH comes from interventional radiology reviews, not from an obstetric guideline.
* RCOG Green-top Guideline 37a (2015): the postnatal "intermediate risk" box (surgery in the puerperium,
  readmission) with at least 10 days of LMWH and extension to 6 weeks when risk factors persist or are more than
  three; enoxaparin weight bands; active postpartum bleeding as a contraindication — confirmed only through a trust
  adaptation and memory.
* The Chinese PPH guideline (2023): its DOI could not be confirmed (cited without one), and its secondary PPH
  content was not checked.
* Civil Code of China (2020), Article 1219: wording confirmed from legal summaries; check the official text.
* Clinical organisms: group A or B streptococci and E. coli in necrotising postpartum uterine infection, and
  afebrile, often fatal clostridial infection — from case reports and reviews (PMC6500617, PMC6083381).
* Clinician input: an obstetrician should review decisions 1, 4 and 5 (in particular the hysterectomy key and its
  window), an intensivist decision 3, and an infectious diseases physician the antibiotic regimens and the neutral
  scoring of tranexamic acid.

## Matcher notes

* 39 `extensions.testUtterances` (21 zh-CN, 18 en; 3 look-alike negatives), none equal to a canonical question or a
  keyword; every required item and both status items are covered. `cases verify`: 39/39, no extra selections.
* **Phase twins.** `status-after-evac` supersedes `bleeding-course` after the evacuation; `status-third` supersedes
  `status-after-evac` at the third admission. Present-tense items (`bleeding-onset`, `bleeding-course`, `fever`) are
  limited to the phases where they hold.
* **Overlaps separated with `excludeKeywords`:** `bleeding-onset` (the presenting-complaint item, which owns the
  generic "bleeding" / “出血”) yields to the items for the course of the bleeding, the shock symptoms, the earlier
  treatment, the family, the time since the evacuation and the third admission; `delivery` yields to bleeding and
  placenta questions; `earlier-treatment` vs past uterine surgery and "since the evacuation"; `baby` vs the
  fertility question; `worries` vs the operation; `medications` vs allergies and uterotonics; `pmh` vs family.
* English stop words collapse phrases ("this time" → "time", "bleeding again" → "bleeding"), and run-together
  keywords are prefix-matched by a long first word ("broughtyouin" by "brought"): such keywords were rewritten
  (`thistime`, `happenedagain`, `whendiditstart`) or dropped.
* **Orders.** Short aliases that are substrings of other words ("ct", "pt", "ir") were avoided ("ct scan", "aptt",
  "interventional radiology"). "Tissue histology" is the neutral name of the histology record; the outcome-phase
  records are record reviews.

## References

1. 刘培艳, 肖小敏. 产后坏死性子宫肌炎一例. 中华产科急救电子杂志. 2013;2(2):141-143.
   doi:10.3877/cma.j.issn.2095-3259.2013.02.013. Available from: https://rs.yiigle.com/cmaid/1067477
2. World Health Organization, International Federation of Gynecology and Obstetrics, International Confederation of
   Midwives. Consolidated guidelines for the prevention, diagnosis and treatment of postpartum haemorrhage. Geneva:
   World Health Organization; 2025. Available from: https://www.ncbi.nlm.nih.gov/books/NBK619233/
3. Mavrides E, Allard S, Chandraharan E, Collins P, Green L, Hunt BJ, Riris S, Thomson AJ, on behalf of the Royal
   College of Obstetricians and Gynaecologists. Prevention and management of postpartum haemorrhage: Green-top
   Guideline No. 52. BJOG. 2017;124(5):e106-e149. doi:10.1111/1471-0528.14178
4. 中华医学会妇产科学分会产科学组, 中华医学会围产医学分会. 产后出血预防与处理指南(2023). 中华妇产科杂志.
   2023;58(6):401-409.
5. World Health Organization. WHO recommendations for prevention and treatment of maternal peripartum infections.
   Geneva: World Health Organization; 2015. Available from: https://www.ncbi.nlm.nih.gov/books/NBK327079/
6. World Health Organization. WHO recommendation on tranexamic acid for the treatment of postpartum haemorrhage.
   Geneva: World Health Organization; 2017. Available from: https://www.who.int/publications/i/item/9789241550154
7. Evans L, Rhodes A, Alhazzani W, et al. Surviving Sepsis Campaign: international guidelines for management of
   sepsis and septic shock 2021. Crit Care Med. 2021;49(11):e1063-e1143. doi:10.1097/CCM.0000000000005337
8. Shields AD, Plante LA, Pacheco LD, Louis JM; Society for Maternal-Fetal Medicine. Society for Maternal-Fetal
   Medicine Consult Series #67: Maternal sepsis. Am J Obstet Gynecol. 2023;229(3):B2-B19.
   doi:10.1016/j.ajog.2023.05.019
9. Stevens DL, Bisno AL, Chambers HF, et al. Practice guidelines for the diagnosis and management of skin and soft
   tissue infections: 2014 update by the Infectious Diseases Society of America. Clin Infect Dis.
   2014;59(2):e10-e52. doi:10.1093/cid/ciu296

These nine strings are `debrief.references`. Also named in the case's feedback and teaching points: Royal College of
Obstetricians and Gynaecologists. Reducing the risk of venous thromboembolism during pregnancy and the puerperium.
Green-top Guideline No. 37a. London: RCOG; 2015 · 中华人民共和国民法典（2020）第一千二百一十九条.

**How they were checked (2026-11-12).** doi.org, Crossref and publisher sites were not used directly; each item was
confirmed by web search against indexing or publisher records: ref. 2 (WHO news release of 5 October 2025, NCBI
Bookshelf NBK619233), ref. 3 (RCOG citation; PubMed listing BJOG 2017;124(5):e106-e149, PMID 27981719 as cited by a
clinical reference), ref. 4 (Chinese reference listings; DOI not confirmed, so none given), ref. 5 (NCBI Bookshelf
NBK327079, ISBN 978 92 4 154936 3), ref. 6 (WHO publication page, ISBN 978 92 4 155015 4), ref. 7 (SCCM guideline
page and journal listings giving the volume, pages and DOI), ref. 8 (UTMB and OUCI records, PMID 37236495), ref. 9
(PubMed 24973422). The source article's DOI
is the one verified in `scripts/cmcr-105-sources.json` (publisher check 2026-10-29). The 1.0.0 guideline URL for the
WHO 2025 guideline could not be confirmed and was replaced by the Bookshelf record.

## Changelog

### 1.1.0 — 2026-10-30

1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked
against the full source article.

* **Safety and validity.** The case now teaches the acts, not only the principles: IV antibiotics after cultures for
  secondary PPH with retained tissue; a senior, ultrasound-guided evacuation with blood ready given the accreta risk;
  imaging instead of more curettage once the cavity is empty; blood, not crystalloid, for the third-admission shock;
  broad-spectrum antibiotics within the hour; hysterectomy as source control with her consent; LMWH once bleeding is
  controlled. The 1.0.0 critical item (a multiple-choice "management principle" answered after the pathology) is
  replaced by three critical acts (resuscitation, source control, avoided instrumentation and embolisation). The
  report's own steps (repeat curettage pattern, hysteroscopic separation, uterus-sparing wedge resection) are
  distractors with feedback that names current guidance.
* **Voice.** Every history answer is her lay first person; no answer says "the source case does not provide that
  information"; record-style questions ("Is medicine allergies documented?") are gone; the persona is written for
  her.
* **Spoilers.** The title follows `<presentation> · <patient>`; the summary and tags name no diagnosis;
  `infectious-disease` left the specialty list; no intervention name or hint states a later finding.
* **Structure.** Phases `initial`/`workup`/`confirmation`/`followup` → `transfer`/`after-evacuation`/
  `third-admission`/`followup`; history 15 template items → 20 (phase-limited, two status twins); exam 2 → 6
  (re-examination after the evacuation and at the third admission); investigations 5 bundles → 18 single tests with
  structured values and per-phase results; interventions 0 → 18; decisions 3 → 5 (content option ids; 1.0.0 used
  `yes`); rubric 11 → 12 (descriptive ids; `rb-unknown` removed); objectives 4 → 6; staff 1 → 5; references rebuilt
  in Vancouver form (the unverifiable WHO URL replaced).
* **Ids changed** (none referenced outside this case): history `onset` → `bleeding-onset`, `shock` →
  `shock-symptoms`, `treatment` → `earlier-treatment`, `surgery` → `prior-uterine-surgery`, `prior-health` → `pmh`,
  `regular-medication` → `medications`, `family` → `bleeding-family`; `vaccines`, `exposure`, `function`,
  `expectations`, `other-history` removed (template slots); exam `first-exam` → `obs-transfer` (the earlier shock BP
  moved to `referral-notes`), `uterus` → `fundus`; investigations `ultrasound` → `pelvic-ultrasound`, `inflammation`
  → `fbc` + `crp` + `coagulation`, `recurrence` → the third-admission phase and its exam findings, `pathology` →
  `tissue-histology` + `operative-pathology` + `drain-culture`, `followup` → `outcome-record`; decisions
  `diagnosis`/`evidence`/`management` → `transfer-plan`, `post-evacuation`, `third-bleed`, `definitive-plan`,
  `after-surgery`.
* **Figures.** The two approved figures move from unattached assets to the outcome record, with neutral titles.
* **Contract wording.** The English review note ends "The case is not yet reviewed by a licensed clinician." (the
  collection test matches the lower-case phrase); otherwise it is the standard's §6 text.

### 1.0.0

* Initial template version (PR #5).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1067477/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1067477 --lang en        # 77 steps · objectives 6/6 · decisions 5/5 · utterances 39/39 · rubric 33/33
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-1067477                   # PASS (depth floor, do nothing 0, wrong-first < reference)
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1067477:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1067477:"  # demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 31岁女性，孕28周多胎膜早破，约10小时后引产分娩；产后约2小时起阴道大量流血，伴头晕、大汗、手脚凉、
胸闷、心慌气短，休克时血压40/20 mmHg、脉搏细数，最初出血时无发热、畏寒。外院行清宫、会阴裂伤缝合、输血和促宫缩治疗后
出血减少，但此后反复阴道多量流血3天转入。既往剖宫产1次，之后人工流产4次；否认基础病和妊娠糖尿病等并发症。转入时体温
37.4 ℃，宫底平脐、子宫收缩差（记录为“再次入院”时），超声见宫腔内约28×18×36 mm不均质团块，白细胞13.04×10⁹/L，凝血一度
正常。再次清宫后宫腔无占位，但子宫仍增大、实质回声不均，白细胞升至16.12×10⁹/L、中性粒细胞升高，CRP约14.52–15.82 mg/L，
发热不突出。第三次入院再次大量出血，血压53/34 mmHg、脉搏110次/分，面色苍白、四肢冷，宫颈阴道内团块70×62×51 mm；宫颈处
组织为大片子宫肌层坏死伴炎性渗出。原报告随后行宫腔镜下分离（发生穿孔）、宫底楔形切除（未见绒毛），再次大出血并发现感染
后切除子宫（肌层坏死，皮下化脓性炎症，引流液培养阴性），治愈出院；诊断为坏死性子宫肌炎、子宫内膜炎及反复失血性休克。
本版患者事实全部沿用1.0.0版的提取，尚未对照原文全文核对。

**学习目标。**
1. 系统排查继发性产后出血的原因（宫腔残留、子宫内膜炎、复旧不良、胎盘植入），留培养后静脉用抗菌药物（WHO 2015），由高年资医生在超声引导下清宫（RCOG 2016）。
2. 宫腔已空而子宫仍大、回声不均，白细胞和CRP上升时，即使不发热也判断为子宫壁感染或坏死，做影像，停止盲目刮宫。
3. 对伴休克的继发性产后出血启动大出血预案，早期输红细胞和血浆，纤维蛋白原>2 g/L（RCOG 2016）；说明分娩3小时后不再开始用氨甲环酸（WHO 2017；2025）。
4. 可能脓毒性休克时1小时内给予含克林霉素的广谱抗菌药物（SSC 2021；SMFM 2023），尽快控制感染源。
5. 宫颈处组织为大片坏死肌层时，选择开腹子宫切除（IDSA 2014），而不是宫腔镜分离、局部切除或栓塞，并按《民法典》第一千二百一十九条取得她本人的同意。
6. 制定子宫切除后的计划：按培养继续抗感染，出血控制后低分子肝素至少10天（RCOG 2015），纠正贫血，心理支持和随访。

**关键决策。** ① 转入时：可能合并感染的宫腔残留并警惕植入——配血、留培养后静脉抗菌药物、促宫缩、高年资医生超声引导下清宫
并备血（干扰项：常规手术日清宫且不用抗菌药物、只按宫缩乏力处理、按植入直接切子宫）；② 清宫后：子宫壁感染或坏死——
广谱抗菌药物、增强CT或MRI、上级复评、不再刮宫（干扰项：第三次清宫、按“不发热”出院、预防性栓塞）；③ 第三次入院：大出血
预案、早期输血和血浆、轻柔取出宫颈组织送病理、1小时内广谱抗菌药物（干扰项：先输30 mL/kg晶体液等血红蛋白、直接栓塞、床旁
刮宫）；④ 确定性治疗：开腹子宫切除并取得同意（干扰项：原报告的宫腔镜分离、保留子宫的局部切除、抗菌药物加栓塞等待）；
⑤ 术后：ICU、按培养抗感染、出血控制后低分子肝素、纠正贫血、心理支持（干扰项：立即停抗菌药物且不抗凝、立即治疗剂量抗凝并
早出院、普通病房24小时抗菌药物）。

**复盘要点（PEARLS）。** 先谈感受；复述三次入院时的判断和处理；分析：继发性产后出血的原因清单、为什么体温37.4 ℃也要用抗菌
药物、宫腔排空后子宫壁告诉了什么、单次体温与趋势怎么取舍、休克时先给什么、宫颈团块怎样处理、为什么不栓塞、为什么不能保留
子宫、原报告的宫腔镜分离和楔形切除放到今天怎么看、怎样与31岁的她谈子宫切除、术后何时开始低分子肝素；总结下次遇到清宫后
仍反复出血时怎么做。待核实：几次入院的关系和间隔、完整血象和凝血、培养与抗菌药物、输血量、团块的发现与测量方式、组织“排出”
还是“取出”、各次手术细节、宝宝情况，以及RCOG 52号和37a号指南、WHO 2015剂量、民法典原文等（见上文 To verify）。本病例为
人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
