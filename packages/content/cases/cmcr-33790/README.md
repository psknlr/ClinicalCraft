# cmcr-33790 — Persistent chest pain and sweating · 80-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 刘俊松, 陈晓敏, 杜为平, 林少沂, 王健, 崔翰斌. 心房颤动患者左心房血栓脱落致
急性心肌梗死一例. 中华心血管病杂志. 2014;42(6):527-528. Version 1.1.0 re-authors the case to the clinical content standard
**from the facts that version 1.0.0 extracted from the report**; the full article was not available, so **none of these
facts has yet been checked against the full source article** (STANDARD §6). The patient (郑清和 / Zheng Qinghe) is a
pseudonym; the ED nurse (钱护士 / Nurse Qian), the cardiology attending (常医生 / Dr Chang), the interventional
cardiologist (邵医生 / Dr Shao) and the clinical pharmacist (甘药师 / Pharmacist Gan) are invented teaching roles.
Hospitals and calendar dates are removed. What 1.0.0 does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-33790` / `1.1.0` |
| setting / facility | `emergency` / `general-hospital` (ED resus bay → catheter laboratory → ward) |
| specialty | cardiology, emergency medicine, clinical pharmacology |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: five record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a cardiologist review it before teaching use |
| phases | `ed` 急诊抢救区 / Emergency department resus bay → `cath-lab` 心导管室：急诊冠状动脉造影 / Catheter laboratory → `post-aspiration` 抽吸之后 / After aspiration → `day3` 术后第 3 天 / Day 3 after the procedure (ward) → `followup` 记录的病程与结局 / Recorded course and outcome — all one-way, none learner-switchable |
| content | 27 history items (10 recorded facts, 2 labelled teaching devices, 15 unknown; 10 required) · 3 exam findings (all that 1.0.0 records) · 15 investigations (1 record review; 5 with no recorded result) · 19 interventions (7 harmful in the acute or any phase, plus a transfer that is unsafe before activation) · 6 objectives · 5 decisions (23 options) · 12 rubric items (11 deterministic, weight 26; 1 examiner-judged; 3 critical) · 4 staff · 6 learning outcomes · 6 teaching points · 39 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise inferior STEMI with right-ventricular involvement from ST elevation in II, III and aVF with ≥ 0.05 mV in
   V3R/V4R (Fourth Universal Definition of MI, 2018), and start immediate primary PCI without letting her age delay it
   (ESC 2023 ACS).
2. In right-ventricular involvement with a systolic pressure below 90 mmHg and clear lungs, withhold nitrates (ESC 2023
   ACS), diuretics and other vasodilators (Chinese STEMI guideline 2019) and IV beta-blockers, hold antihypertensives,
   and keep the right-ventricular preload up with small fluid boluses, reassessing after each.
3. Explain why routine thrombus aspiration is no longer recommended (ESC 2023 ACS class III, after TASTE and TOTAL) and
   when selective aspiration, and intravascular imaging before any stent decision, are reasonable.
4. Diagnose coronary embolism with the Shibata criteria (2015) from a smooth post-aspiration vessel, intravascular
   ultrasound without plaque rupture, untreated atrial fibrillation and a left atrial echo considered thrombus; state
   the limits of IVUS and transthoracic echocardiography; and decide against a stent.
5. Prescribe anticoagulation after an AF-related embolic infarct: score CHA₂DS₂-VA, choose a DOAC over warfarin unless
   there is a mechanical valve or moderate–severe mitral stenosis, dose it to the label criteria for age, weight and
   renal function, and limit any antiplatelet to one agent for a defined period (ESC 2024 AF).
6. Explain to an older patient in plain words, checked by teach-back, why she now needs long-term anticoagulation, how
   it differs from the tablets she took before, and which bleeding signs to report at once.

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list.

## Clinical summary (spoilers)

**Presentation.** An 80-year-old woman with **ten years of hypertension** and **five years of atrial fibrillation**,
taking **perindopril and amlodipine** and **no antithrombotic**, arrives after **six hours of chest pain that has not
eased**, **pale and sweating heavily**. On arrival **BP 88/62 mmHg, heart rate 62/min**; her **lungs are clear** (no
wheezes or crackles). Her usual blood-pressure control was acceptable.

**ECG.** ST elevation of **0.15–0.2 mV in II, III and aVF** and **0.1 mV in V3R–V5R** — an inferior STEMI with
right-ventricular involvement, with hypotension and clear lungs: a preload-dependent right ventricle. The rhythm on the
tracing is **not recorded** (she has known AF; do not let the group assume it). Admission **INR 1.1** (consistent with
her taking no warfarin) and **creatinine 57.3 μmol/L**.

**Catheter laboratory.** Emergency angiography: **heavy thrombus in the distal right coronary artery, TIMI 1 flow**.
After **thrombus aspiration** the vessel wall was **smooth with no significant stenosis**; **IVUS** showed an **intact
intima without plaque rupture**; **no stent was placed**.

**Day 3 after the procedure.** Transthoracic echo: **enlarged left atrium** with an **echo on the left atrial free
wall considered to be thrombus**, **reduced inferior and posterior wall motion**, **LVEF 55 %**. **Troponin I
94.12 μg/L** (reference 0–0.04) and **BNP 3981.2 ng/L** (sampling times not recorded; staged here).

**Recorded course.** **Warfarin** with **heparin during the transition**, plus **aspirin**; heparin stopped on
**day 6** once the **INR reached 2.3**. **Heart-failure symptoms during the first 10 days**, then improvement, with the
corresponding medicines added (not named). Long-term embolic and bleeding outcomes are not recorded; the embolus's
dislodgement and migration were not directly observed.

**Diagnosis.** Acute inferior myocardial infarction with right-ventricular involvement from **probable coronary
embolism** of left atrial thrombus in untreated AF (the report's title: 心房颤动患者左心房血栓脱落致急性心肌梗死).

**Today's answer.** Immediate primary PCI (ESC 2023 ACS); no nitrate (ESC 2023 ACS), no diuretic or other vasodilator
(Chinese STEMI guideline 2019) and no IV beta-blocker; antihypertensives held, cautious fluid; selective aspiration and
intravascular imaging before any stent decision, then no stent; a DOAC at its label dose (ESC 2024 AF), no dual
antiplatelet therapy. The report's warfarin-plus-aspirin regimen is the historical contrast.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract). Results are immediate; interventions are scored for
  appropriateness but change nothing — the course is the recorded one. The monitoring step's response says the readings
  are not recorded.
- **Five one-way phases** (none learner-switchable; a record read in an earlier phase stays readable by its phase):
  - `ed` — the history in her own words; the bedside examination (vital signs, appearance, lungs: the three findings
    1.0.0 records); the **12-lead ECG** and the **right-sided leads** (bedside orders); the admission **clotting screen
    (INR)** and **renal function**; troponin and BNP orders answer honestly that the one recorded value of each has no
    sampling time and is shown with the in-hospital results. Decisions 1 and 2, the ED acts, the **activation call** and
    the **transfer**.
  - `cath-lab` — opens once `obj-ed-history`, `obj-ed-assessment` and `obj-ed-plan` are done (the last needs decision 2
    right, the activation and the transfer); `location: {capability: "fluoroscopy"}` (the transfer's `destination` is
    the same table). The **coronary angiogram** shows the pre-intervention finding only. Decision 3 and the aspiration.
  - `post-aspiration` — opens once `obj-cath-lab` (the angiogram read, decision 3 right, the aspiration done) is
    complete; she stays on the table. The **repeat angiogram** and **IVUS**. Decision 4.
  - `day3` — opens once `obj-after-aspiration` (both reads, decision 4 right) is complete; `location: {setting:
    "ward"}` — a staging convention: 1.0.0 does not record where she was. Her status (phase twin `status-day3`), the
    **echo**, the **troponin I** and **BNP** values, the TEE request (no result recorded), her second worry, decision 5
    and the antithrombotic act.
  - `followup` — opens once objectives 1–5, decision 5 and **an antithrombotic act** (a DOAC, warfarin with heparin, or
    one of the two harmful regimens) are done: the **reported course and outcome** record.
- No prompt, hint, order response or harm text states a later phase's result before its record opens: the stent and
  DAPT harm texts name no post-aspiration finding; the troponin and BNP placeholders give no value; a wrong option's
  feedback may name what the recorded team did only after the learner has committed (decision 5).

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-ed-history` Hear the story: the pain, her illnesses and her medicines | presentation, onset, pain now, sweating, past history, medicines, blood thinners asked |
| 2 | `obj-ed-assessment` Examine her, record the ECGs and send the bloods | vital signs, appearance, lungs examined; 12-lead ECG, right-sided leads, INR and creatinine read (phase `ed`); `reperfusion` right |
| 3 | `obj-ed-plan` Decide her care in the ED and act on it | `rv-haemodynamics` right; catheter laboratory activated; transfer made |
| 4 | `obj-cath-lab` Decide how to deal with the artery in the catheter laboratory | angiogram read (phase `cath-lab`); `thrombus-strategy` right; aspiration done |
| 5 | `obj-after-aspiration` See the artery beneath the thrombus and decide on a stent | repeat angiogram and IVUS read (phase `post-aspiration`); `mechanism` right |
| 6 | `obj-day3` Day 3: set the long-term plan and review the outcome | status asked; echo, troponin and BNP read (phase `day3`); `anticoagulation` right; a DOAC or warfarin started; outcome record read |

Titles name no finding, result or treatment; hints are Socratic questions with no answer in them ("Which of the usual
chest-pain drugs could harm her now?"; "If the wall itself is sound, where else could the thrombus have come from?").

### Decisions

- **1 `reperfusion`** (single; needs presentation, onset, pain now, vital signs and the 12-lead ECG). Key:
  `primary-pci-now` — inferior STEMI within 12 hours: activate for immediate primary PCI, age no reason to delay, no
  troponin wait. Distractors: `troponin-first`, `lysis-now`, `ct-aorta-first` (dissection needs clinical clues, none
  recorded), `admit-ccu-24h`.
- **2 `rv-haemodynamics`** (single; needs decision 1 attempted, the right-sided leads, lungs, vital signs and her
  medicines). Prompt: the nurse is about to give GTN and asks about her usual tablets. Key: `protect-preload` — no
  nitrate, hold perindopril and amlodipine, small fluid boluses with reassessment, pads on with atropine and pacing
  ready. Distractors: `gtn-then-morphine`, `furosemide-now`, `iv-metoprolol`, `pressor-no-fluid`.
- **3 `thrombus-strategy`** (single; needs the angiogram in phase `cath-lab`). Key: `aspirate-then-image` — selective
  aspiration of this heavy thrombus, then IVUS or OCT before any stent decision. Distractors: `direct-stent`,
  `routine-aspiration` (the ESC 2012 rationale; aspirating is right here, the reason and the reflex stent are not),
  `defer-48h`.
- **4 `mechanism`** (single; needs the repeat angiogram and IVUS in phase `post-aspiration`, her AF history and blood
  thinners). Key: `embolism-no-stent` — probable AF-related coronary embolism (Shibata: one major + one minor), no
  stent, anticoagulate, look for the source and other emboli. Distractors: `erosion-stent`, `vasospasm`,
  `dissection-conservative`.
- **5 `anticoagulation`** (single; needs decision 4, the day-3 echo, the admission creatinine, her history and
  medicines). Key: `doac-label-dose` — a DOAC now at its label dose after weighing her and checking renal function;
  warfarin only for a mechanical valve or moderate–severe mitral stenosis; no DAPT; at most one time-limited
  antiplatelet. Distractors: `dapt-not-oac`, `aspirin-until-tee`, `warfarin-plus-aspirin` (close to the recorded
  regimen), `triple-12-months`.

Every option has its own feedback naming ESC 2023 ACS, the Fourth Universal Definition of MI (2018), the Chinese STEMI
guideline (2019), ESC 2024 AF, the Shibata criteria (2015), TASTE/TOTAL or ACTIVE W. Option ids name their content.
**Length cue (measured 2026-10-30):** the key is the uniquely longest option only in decision 5 (zh-CN 78 of 50–78
characters; en 240 of 132–240), the one decision the lint allows; elsewhere a distractor is at least as long — decision
1 zh 61 of 41–61, en 166 of 141–205; decision 2 zh 60 of 42–62, en 204 of 127–213; decision 3 zh 57 of 43–60, en 151 of
138–163; decision 4 zh 57 of 34–59, en 171 of 142–177.

### Rubric (11 deterministic items, total weight 26, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-pain-history` | history | 1 | presentation, onset, pain now, sweating asked |
| `rb-af-drug-history` | history | 2 | past history, medicines, blood thinners, stroke/TIA, bleeding, allergies, weight asked (the last four are unknown — asking is the competency) |
| `rb-bedside-exam` | examination | 1 | vital signs, appearance, lungs examined |
| `rb-ecg-right-leads` | investigations | 2 | 12-lead ECG and right-sided leads read in phase `ed` |
| `rb-reperfusion` | management | 4 | **critical** — `reperfusion` right first time, catheter laboratory activated, no tenecteplase |
| `rb-no-preload-drop` | safety | 3 | **critical** — no GTN and no IV metoprolol; scored once decision 2 is attempted or either drug is given |
| `rb-ed-support` | management | 2 | `rv-haemodynamics` right first time; monitoring, antihypertensives held, fluid, aspirin |
| `rb-cath-strategy` | management | 2 | `thrombus-strategy` right first time; aspiration; IVUS ordered after aspiration; UFH |
| `rb-mechanism` | diagnosis | 3 | `mechanism` right first time |
| `rb-no-stent` | safety | 2 | no stent; scored once decision 3 is attempted or a stent is placed |
| `rb-anticoagulation` | management | 4 | **critical** — `anticoagulation` right first time, a DOAC or warfarin started, and neither DAPT-instead-of-OAC nor triple therapy |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: the blocked artery and the urgent angiogram in the ED; on day 3 the clot from the heart, why long-term anticoagulation, how it differs from her tablets and aspirin, bleeding warning signs, missed doses, why weight and kidney function set the dose; teach-back; no blame, no unrecorded promises |

### How wrong choices score (measured with the reducer on 2026-10-30)

| path | deterministic score | critical items missed |
|---|---:|---|
| reference path (`solution`) | 26/26 (100 %) | none |
| start and do nothing | 0/21 | `rb-reperfusion`, `rb-anticoagulation` |
| wrong first answer at all five decisions, then right | 11/26 (42 %) | `rb-reperfusion`, `rb-anticoagulation` |
| wrong first answer at decision 1 only | 22/26 (85 %) | `rb-reperfusion` |
| wrong first answer at decision 2 only | 24/26 (92 %) | none |
| wrong first answer at decision 3 only | 24/26 (92 %) | none |
| wrong first answer at decision 4 only | 23/26 (88 %) | none |
| wrong first answer at decision 5 only | 22/26 (85 %) | `rb-anticoagulation` |
| reference path plus sublingual GTN in the ED | 23/26 (88 %) | `rb-no-preload-drop` |
| reference path plus IV metoprolol in the ED | 23/26 (88 %) | `rb-no-preload-drop` |
| reference path plus tenecteplase | 22/26 (85 %) | `rb-reperfusion` |
| reference path plus a stent before aspiration | 24/26 (92 %) | none (`rb-no-stent` lost) |
| reference path plus aspirin and clopidogrel instead of anticoagulation | 22/26 (85 %) | `rb-anticoagulation` |
| reference path plus 12 months of triple therapy | 22/26 (85 %) | `rb-anticoagulation` |
| the report's plan: warfarin-plus-aspirin answered first, warfarin with heparin given | 22/26 (85 %) | `rb-anticoagulation` |
| reference path with warfarin and heparin instead of the DOAC | 26/26 (100 %) | none (warfarin is a valid anticoagulant act; decision 5 tests the choice) |
| reference path without monitoring, holding, fluid and aspirin | 24/26 (92 %) | none |
| reference path without the stroke, bleeding, allergy and weight questions | 24/26 (92 %) | none |
| reference path plus IV furosemide in the ED | 26/26 (100 %) | none — flagged as contraindicated in the debrief, not scored (known limit below) |
| reference path without any day-3 antithrombotic act: the outcome phase never opens, the case cannot be finished | 22/26 (85 %) | `rb-anticoagulation` |
| reference path without the activation call: the catheter laboratory never opens | 11/24 (46 %) | `rb-reperfusion`, `rb-anticoagulation` |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The avoided-harm items
count only once the harm was possible (`scoredWhen`), so doing nothing earns 0. **Timing of the critical acts.** The
catheter laboratory opens only after the activation call and the transfer, so the call that meets `rb-reperfusion` is
always made in the ED, before any confirming record. The outcome record opens only after an antithrombotic act, so the
anticoagulant that meets `rb-anticoagulation` cannot be prescribed after reading the recorded regimen — and a harmful
regimen given first (DAPT instead of anticoagulation, triple therapy) loses the item for good. **Known limits:** the
rubric's conditions carry no time, so (1) IV furosemide is contraindicated only in the acute phases (a diuretic may be
right for the recorded heart-failure symptoms on the ward) and is therefore flagged in the debrief but not scored;
(2) monitoring, holding the antihypertensives, fluid and aspirin given late still meet the non-critical `rb-ed-support`.
Debrief the order of the acts from the transcript.

### Critical items

`rb-reperfusion` (the missed life-saving act: primary PCI chosen and the call made in the ED, with no lytic),
`rb-no-preload-drop` (the dangerous error: a nitrate or IV beta-blocker in hypotensive RV involvement) and
`rb-anticoagulation` (the missed life-saving act of this case: anticoagulating an AF-related embolic infarct, with no
antiplatelet substitute or triple therapy). All three are acts; none reads a final-phase record.

## Reference path (`solution`)

71 steps, static clock: start → presentation, onset, pain now → **vital signs**, **appearance** → **12-lead ECG** →
**monitoring with pads** → sweating, past history, medicines, blood thinners → `reperfusion` → **activate the catheter
laboratory** → allergies, bleeding, stroke/TIA (before any antithrombotic) → **aspirin** → **right-sided leads** →
**lungs** → **IV cannula and bloods** → INR, creatinine → weight → `rv-haemodynamics` → **hold perindopril and amlodipine**, **fluid bolus**, **clopidogrel**
→ her worry, the rest of the chest-pain and risk history (character, site and radiation, severity, trigger,
dizziness, breathlessness, nausea, blood-pressure control, advice about blood thinners, diabetes, smoking and alcohol,
home, care before arrival) → **transfer** → (phase `cath-lab`) angiogram → **UFH** → `thrombus-strategy` → **aspiration**
→ (phase `post-aspiration`) repeat angiogram, IVUS → `mechanism` → (phase `day3`) her status → echo, troponin I, BNP →
TEE request (no result recorded) → her worry about blood thinners → `anticoagulation` → **DOAC** → (phase `followup`)
outcome record → finish. `cases verify` passes: objectives 6/6, decisions 5/5, rubric 26/26, utterances 39/39.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 80-year-old woman | `patient.age`, `sex` | `patient.age`, `sex`; title |
| chest pain for six hours, not relieved | `chiefComplaint`; `history.onset`, `progression` | `chiefComplaint` (lay words); `history.onset`; `history.pain-now` (phase `ed`); `triageNote` |
| pallor and heavy sweating | `history.presentation`, `associated`; `exam-1`; `triageNote` | `history.presentation`, `sweating` (phase `ed`); `exam.general`; `triageNote` |
| hypertension 10 years, AF 5 years | `history.pmh` | `history.pmh` |
| perindopril and amlodipine, no antithrombotic | `history.medications` | `history.medications` (doses unknown, said in lay words); `history.antithrombotic` |
| usual blood-pressure control acceptable | `history.baseline` | `history.bp-control` |
| no wheezes or crackles | `exam-2` (filed under "general", flagged abnormal) | `exam.lungs` (system respiratory, `abnormal: false`) |
| BP 88/62 mmHg, heart rate 62/min (admission observations) | `investigations.ecg` | `exam.vitals` (phase `ed`); `triageNote` |
| ST elevation 0.15–0.2 mV in II, III, aVF; 0.1 mV in V3R–V5R | `investigations.ecg` | `investigations.ecg` and `right-chest-leads` (phase `ed`) |
| heavy distal RCA thrombus, TIMI 1 | `investigations.angio` | `investigations.angiography` (phase `cath-lab`) |
| after aspiration smooth wall, no significant stenosis | `investigations.angio` | `investigations.angiography` (phase `post-aspiration`) |
| IVUS: intact intima, no plaque rupture | `investigations.angio` | `investigations.ivus` (phase `post-aspiration`) |
| no stent | `investigations.angio` | outcome record; decision 5 prompt (after decision 4); decision 4 key feedback |
| echo day 3 after the procedure: LA enlarged, free-wall echo considered thrombus, inferior/posterior hypokinesis, LVEF 55 % | `investigations.echo` | `investigations.echo` (phase `day3`) |
| troponin I 94.12 μg/L (reference 0–0.04), BNP 3981.2 ng/L (times not recorded) | `investigations.labs` | `investigations.troponin`, `natriuretic-peptide` (phase `day3`, labelled "sampling time not recorded") |
| admission INR 1.1, creatinine 57.3 μmol/L | `investigations.labs` | `investigations.coagulation`, `renal-function` (phase `ed`) |
| warfarin with transitional heparin and aspirin; heparin stopped at INR 2.3 on day 6 | `investigations.outcome` | `investigations.outcome` (phase `followup`) |
| heart-failure symptoms in the first 10 days, then improvement, corresponding medicines added | `investigations.outcome` (zh) | `history.status-day3`; `investigations.outcome` |
| long-term embolic and bleeding outcomes absent; embolus migration not directly observed | `investigations.outcome`; `unknowns` | `unknowns`, `debrief.unknowns`, `boundaries` |
| diagnosis: AF-related left atrial thrombus embolising to the coronary artery | citation (title); 1.0.0 conclusion | `debrief.conclusion` |

**Times.** Recorded: six hours of pain at presentation; the echo on day 3 after the procedure; heparin stopped on day 6
(1.0.0 does not say day 6 of what); heart-failure symptoms during the first 10 days. Not recorded: the times of the ECG,
the right-sided leads, the troponin and BNP samples, the arrival-to-laboratory interval, the start of warfarin and the
length of stay. Showing troponin I and BNP on day 3 is staging, labelled as such in the records.

**Derived values (computed here, not in the record).** ST elevation 0.15–0.2 mV = 1.5–2 mm and 0.1 mV = 1 mm at
10 mm/mV. Troponin I 94.12 ÷ 0.04 ≈ 2,350 × the upper reference limit. Creatinine 57.3 μmol/L ÷ 88.4 ≈ 0.65 mg/dL;
creatinine clearance cannot be calculated — no weight is recorded. Mean arterial pressure (88 + 2 × 62) ÷ 3 ≈ 71 mmHg;
shock index 62/88 ≈ 0.70. BNP 3981.2 ng/L = 3981.2 pg/mL (no reference range recorded; whether BNP or NT-proBNP is to be
verified). **CHA₂DS₂-VA** before the event ≥ 3 (hypertension 1, age ≥ 75 2; heart failure, diabetes, stroke and
vascular disease not recorded); after it ≥ 6 (+ vascular disease 1 for the infarct, + arterial thromboembolism 2; the
recorded heart-failure symptoms could add 1). CHA₂DS₂-VASc would be ≥ 4 before the event (female sex 1). **HAS-BLED**
≥ 1 (age > 65), + 1 with aspirin; its other components are not recorded. **Apixaban dose criteria:** age ≥ 80 met;
creatinine ≥ 133 μmol/L not met; weight ≤ 60 kg unknown — so 5 mg twice daily unless she weighs 60 kg or less.

**Guidance numbers used in teaching text** (doses as formulas; no patient value is needed): primary PCI within 12 h of
onset and within 120 min of diagnosis in preference to fibrinolysis; aspirin 150–300 mg (75–250 mg IV); clopidogrel
300–600 mg loading, 75 mg daily; UFH 70–100 U/kg (50–70 U/kg with a GP IIb/IIIa inhibitor); GTN 0.4–0.5 mg only with
SBP ≥ 90 mmHg and no RV infarction; V3R/V4R ST elevation ≥ 0.05 mV (≥ 0.1 mV in men under 30); crystalloid boluses of
250–500 mL with reassessment (a common protocol volume, not a guideline number); metoprolol 5 mg IV up to 3 doses (a
harmful option here); CHA₂DS₂-VA ≥ 2 → anticoagulation; apixaban 5 mg twice daily, 2.5 mg only with two of age ≥ 80,
weight ≤ 60 kg, creatinine ≥ 133 μmol/L; warfarin INR 2.0–3.0 with heparin until in range; triple therapy ≤ 1 week
after PCI for AF with ACS, then OAC + clopidogrel up to 12 months, then OAC alone.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel when the nurse was about to give GTN to a woman with a pressure of 88/62?"
2. **Description.** "Take me through the first minutes in the ED and what you found in the catheter laboratory, in four
   sentences."
3. **Analysis.**
   - "What did the right-sided leads add to II, III and aVF — and what did that mean for every drug you considered?"
   - "Why not fibrinolysis, and why not wait for troponin, in an 80-year-old?"
   - "You aspirated. Was that routine practice, or a choice for this thrombus? How did the evidence change between 2012
     and 2023?"
   - "After aspiration the vessel looked normal. What could have caused the occlusion, and what can IVUS not tell you?"
   - "The thrombus was distal, yet V3R–V5R were raised. What would you want to know from the angiogram?" (the record
     does not resolve it — do not let the group invent a segment)
   - "What was her stroke-risk score before this happened? What had been missing for five years?" (why she was not
     anticoagulated is not recorded — no blame)
   - "The echo says 'considered thrombus' on the free wall. How sure are you, and what would make you surer?"
   - "The record gave warfarin with heparin and aspirin. What would you choose today, at what dose, and with what
     information you still lack?"
   - "How did you answer her worry about bleeding?"
4. **Summary.** "What will you check in the next older patient with AF you meet — whatever they came in with?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Waiting for troponin, or a CT aortogram first | `troponin-first`, `ct-aorta-first` feedback; `ct-aorta` is a low-value record | `rb-reperfusion` |
| Fibrinolysis "because it is quicker" or "at her age" | `lysis-now` feedback; `fibrinolysis` contraindicated | `rb-reperfusion` (critical) |
| Missing the right-sided leads | decision 2 needs them; `rb-ecg-right-leads` | `rb-ecg-right-leads` |
| GTN for the pain; morphine with her usual tablets | `gtn-then-morphine` feedback; `gtn-sublingual` contraindicated | `rb-no-preload-drop` (critical) |
| Diuretic "before heart failure sets in" | `furosemide-now` feedback; `furosemide-iv` contraindicated in the acute phases | `rb-ed-support` (decision); flagged, not scored |
| IV beta-blocker | `iv-metoprolol` feedback; `metoprolol-iv` contraindicated | `rb-no-preload-drop` (critical) |
| Pressor and no fluid | `pressor-no-fluid` feedback | `rb-ed-support` |
| Stenting through the thrombus, or aspirating "because it is routine" and stenting | `direct-stent`, `routine-aspiration` feedback; `stent-implant` contraindicated | `rb-cath-strategy`, `rb-no-stent` |
| Calling it erosion, spasm or dissection | `erosion-stent`, `vasospasm`, `dissection-conservative` feedback | `rb-mechanism` |
| DAPT or aspirin instead of anticoagulation "at 80"; waiting for a TEE | `dapt-not-oac`, `aspirin-until-tee` feedback; `dapt-instead-of-oac` contraindicated | `rb-anticoagulation` (critical) |
| The report's warfarin plus open-ended aspirin; triple therapy | `warfarin-plus-aspirin`, `triple-12-months` feedback; `triple-therapy` contraindicated | `rb-anticoagulation` (critical) |
| Dosing a DOAC without a weight | key feedback, `doac-start` response, the pharmacist | — |
| Inventing a rhythm, a weight, a valve finding or the other vessels | unknown history items, `examNotRecorded`, record notes, the staff briefs | — |

### Teaching points for the debrief

The six `debrief.teachingPoints`: (1) right-ventricular involvement — right-sided leads in every inferior STEMI
(Chinese STEMI 2019), ≥ 0.05 mV in V3R/V4R (Fourth UDMI 2018), no nitrate (ESC 2023 ACS), preload kept up and no
diuretics or vasodilators (Chinese STEMI 2019), then and now; (2) primary PCI at 80 — 12 h, 120 min, aspirin, UFH,
clopidogrel when anticoagulation is foreseeable (ESC 2023 ACS); (3) aspiration then and now — ESC 2012 IIa, TASTE 2013,
TOTAL 2015, ESC 2023 class III, ACC/AHA 2025, selective use and OCT for ambiguous culprits; (4) coronary embolism — the
Shibata criteria (2015), the appendage and the limits of TTE, myxoma, other emboli; (5) anticoagulation — CHA₂DS₂-VA
(ESC 2024 AF), DOAC first, label dosing, ACTIVE W, bleeding scores; (6) the antithrombotic plan then and now — the
recorded warfarin + heparin + aspirin versus a DOAC with no DAPT and OAC alone after 12 months (ESC 2023 ACS; ESC 2024
AF).

## Embodied mode

- **Where things are (`general-hospital`).** She lies in an ED resus bay (`setting: "emergency"`). The ECG machine
  records the 12-lead ECG and the right-sided leads (`ecg-12lead`, `performedAt: "bedside"`); the bloods are sampled at
  her side (or, after the cannula, ordered at a records terminal). The **transfer** (`destination: {capability:
  "fluoroscopy"}`) and the `cath-lab` phase's `location` take her to the catheter-laboratory table beside the C-arm,
  where the angiogram, IVUS, aspiration and (harmful) stent need `fluoroscopy`. The `day3` phase moves her to a ward bed
  (`location: {setting: "ward"}`, a staging convention); the echo and TEE need the ultrasound machine
  (`echocardiography`, `performedAt: "bedside"`). The outcome record (`performedAt: "records"`) needs only `records`.
- **Kit.** Monitoring needs the monitor-defibrillator (`cardiac-monitor`, `defibrillator`); the cannula, fluid,
  heparin and IV drugs need `iv-access` (the case's IV-access procedure comes first in the reference path; she arrives
  without a cannula); oral and IV medicines come from the crash cart (`medications`).
- **Scope of practice.** Monitoring, fluid and the medicines are nursing-scope by kind; the activation call, transfer,
  holding the antihypertensives, aspiration and stent are medical.
- **She can speak throughout** (a conscious adult answers for herself; no companion). Examination requests beyond the
  three recorded findings answer with `examNotRecorded` ("This case holds no finding for this examination…").
- **Measured (offline demonstration, 2026-10-30).** `embodied-autopilot.test.ts -t "cmcr-33790:"` passes in en and
  zh-CN: every objective done, in-world score equal to the clinical score, no "cannot do this".

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; ten years of
hypertension and five of AF; perindopril and amlodipine, no antithrombotic; acceptable usual blood-pressure control; six
hours of unrelieved chest pain with pallor and heavy sweating; BP 88/62 mmHg and heart rate 62/min on admission; clear
lungs; the ECG with right-sided leads; admission INR and creatinine; the angiographic, aspiration and IVUS findings and
no stent; troponin I and BNP; the day-3 echo; warfarin with transitional heparin and aspirin, heparin stopped at INR 2.3
on day 6; heart-failure symptoms in the first 10 days, then improvement; the report's title as the authors'
attribution.

**Adapted for teaching.** The ED resus-bay setting (1.0.0's `setting: "emergency"`); the five phases (the ward bed on
day 3 is staging); the patient's dialogue (lay rewording of recorded facts); the staff; the five decisions, their
options and feedback; the 19 interventions (their responses say the case does not record whether they were done, or
name the recorded step); the rubric; the tests a learner would order that 1.0.0 lacks (blood count, lactate, chest film,
CT aortogram, TEE) as honest records with no result; showing troponin I and BNP on day 3. **Labelled teaching
devices:** her two voiced worries ("Is it my heart? Am I going to die?" in the ED; "Is the blood thinner for life? Won't
I bleed?" on day 3, `persona.concerns` and the `concerns-*` items) add no clinical fact — 1.0.0 records no concerns.
Unknown items answer with lay unknowns ("这个我说不上来，医生。" / "I'm not sure, doctor."); for a conscious woman asked
whether she has had a stroke this is an artefact of the record, not a persona trait — say so if learners remark on it.

**Inconsistencies and tensions kept, not resolved.**
- **Distal thrombus, right-sided ST elevation.** The thrombus is recorded in the **distal** RCA, while ST elevation in
  V3R–V5R usually reflects an occlusion proximal to the right-ventricular branches. 1.0.0 also calls the infarct
  "inferior/RV", but its echo text says nothing about the right ventricle. The case keeps both readings (the segment as
  recorded, RV involvement from the ECG) and uses the tension in the debrief; possible explanations — a mistranscribed
  segment, embolus fragmentation or migration, ECG-only RV involvement — are not asserted.
- **Heart-failure course.** 1.0.0's Chinese outcome text says heart-failure symptoms in the first 10 days, then
  improvement **with the corresponding medicines added**; its English text says the symptoms "persisted for about ten
  days" and omits the medicines. The case follows the Chinese text (the source language) and names no drug.
- **"Bridging" heparin.** 1.0.0's English said "bridging heparin"; its Chinese says 过渡期肝素 (heparin for the
  transition). For warfarin initiation this is an overlap; the case writes "heparin during the transition" / "with
  heparin until the INR is in range".
- **Day references.** The echo is "day 3 after the procedure" (术后第 3 天, the Chinese record name; the English said
  "day-three"); "day 6" for the INR of 2.3 is not anchored in 1.0.0.
- **Heart rate.** 1.0.0 gives 62/min in a record titled "ECG and admission observations" without saying whether it is
  the ECG or the pulse rate; the case shows it with the arrival vital signs and states no rhythm.
- **Troponin reference.** "0–0.04" without its own unit; the case reads it in the value's unit (μg/L).
- The 1.0.0 template flagged clear lungs as abnormal and filed them under "general"; corrected (respiratory, not
  abnormal).

**Unknowns kept honest.** The ECG rhythm (central in an AF case — never implied), other vital signs, weight, examination
beyond the three findings, risk factors and bleeding history, why she was never anticoagulated, drug doses, ED
treatment, angiographic and echo detail, the analyte and timing of BNP and troponin, reference ranges, the warfarin and
aspirin details, the heart-failure drugs and the long-term outcome (8 `unknowns`). Record-facing texts say "No result is
recorded for this test" or "This case does not record whether this was done; it does not simulate its effect" — never
that the article lacks something.

**Figures and privacy.** `fig01` is **approved** in `scripts/cmcr-105-media-review.json` (original imaging, no
identifying overlay) and kept with its checksum, `localOnly`, for the completed-case review only; it is attached to no
mid-case result because a composite can show later findings. Its title now says what is known — a composite whose
panels are not described here — because the image itself was not available in this authoring environment (to verify).
This resolves 1.0.0's contradiction between "Images and PDFs await privacy review and are not embedded" and the
approved asset. The pseudonym 郑清和 / Zheng Qinghe is kept from 1.0.0; no hospital, date, initials or occupation appear.

**Survey findings applied (case audit cmcr-33790, critic, governance).**
- *Critical, grounding:* the patient no longer tells learners "the source notes do not provide that information"; the
  blood-thinner question has its own required item (`antithrombotic`) with keywords for warfarin, aspirin and "thin the
  blood", and test utterances that ask it; the fallback is a lay "I'm not sure, doctor."
- *RV infarction untaught:* decision 2, the GTN, furosemide and IV-metoprolol traps, holding the antihypertensives,
  fluid, a critical avoided-harm item and teaching point 1.
- *Non-committal management key:* decision 5 names the act, drug class, dose basis and the limit on antiplatelets; the
  report's regimen is a labelled distractor with historical-versus-current feedback; "bridging" corrected.
- *Aspiration feedback:* decision 3 sits in the laboratory before the post-aspiration record, with the TASTE/TOTAL and
  ESC 2012 → 2023 history.
- *Mechanism taught without tools or limits:* Shibata criteria, IVUS-versus-OCT and TTE limits, "considered thrombus"
  kept verbatim, myxoma and other emboli in decision 4, the attending's brief and teaching point 4.
- *Hindsight critical item; no scoredWhen; staged decisions; straw-man distractors; no interventions; work-up open at
  minute zero:* rebuilt as above (three critical acts, two avoided-harm items, five staged decisions, 23 plausible
  options, 19 interventions, five gated phases).
- *Rhythm absent; distal RCA vs RV leads; untimed troponin/BNP:* kept unknown or labelled (above), listed to verify.
- *In-world:* vital signs in the triage note and an exam finding; real manoeuvres with keywords; per-locale order
  aliases (心电图, 右胸导联, 冠脉造影, 血管内超声, 超声心动图, 肌钙蛋白, BNP, INR…) with order rules.
- *History, voice, phases:* 27 case-specific items, phase twin `status-day3`, persona written for a frightened
  80-year-old, labelled ICE worries, affect `frightened`.
- *Card, outcomes, staff, README, governance, citation:* neutral summary, triage handover, presenting-feature tags,
  six measurable outcomes, four named staff, this guide, the STANDARD §6.6 review wording, Vancouver references with
  verified DOIs only, the citation without double spaces or a zero-padded issue.
- *Not applied (needs the source):* the audit's requests for the rhythm, the RCA segment and dominance, the other
  vessels (the Shibata minor criterion "< 25 % stenosis elsewhere"), valve status, the warfarin target and doses, the
  heart-failure drugs and the fig01 panel titles wait for the source pass.

**Extensions.** `sourceArticleId`, `sourceUrl`, `historicalReview` and `collection` kept; `sourceDoi` and
`doiVerifiedAt` (2026-10-29, the source map's `publisherCheckedAt`) added for the verified DOI; `sourceTextChecked:
false`; the unverifiable `authorChecks` booleans and `sourceTextSha256` removed until the source pass (STANDARD §6.6).

## Matcher notes

- **Phase twin.** `status-day3` (phase `day3`) supersedes `pain-now` and `sweating` (phase `ed`): on day 3 "is the pain
  still there?" gets "The doctors tell me my heart's been struggling…", never the ED answer; asking it credits both.
- **Separated look-alikes (`excludeKeywords`):** `presentation` vs history, family and "usually"; `onset` vs years,
  "long-standing", blood pressure and medicines; `pain-now` vs sweating; `sweating` vs medicines, allergies and past
  illness; `pmh` vs family, control and tablets; `medications` vs allergies, blood thinners, warfarin and aspirin;
  `antithrombotic` vs allergies and "did a doctor suggest/tell you to take"; `bleeding` vs "thin the blood"; exam
  `vitals` vs rhythm, saturation, temperature and respiratory rate (those fall to `examNotRecorded`); `lungs` vs heart
  and murmur.
- **English keywords** avoid one-token wildcards: run-together forms (`whendiditstart`, `whereisthepain`,
  `whatwereyoudoing`, `outoften`, `thintheblood`, `liveswith`, `howareyounow`, `howarethings`, `treatmentfromhere`,
  `anythingforthepain`, `lookather`, `gotothelab`).
- **Order entry.** `orderMatching.rules`: right-sided-lead queries drop the generic ECG; TEE queries drop the
  transthoracic echo; CT and aorta queries drop coronary angiography; IVUS queries drop the angiogram.
- **Corpus.** 39 test utterances (23 zh-CN, 16 en), written as learners speak, including three look-alike negatives;
  every required item and the phase twin are covered; `cases verify` reports 39/39 with no extra selections.

## References

1. 刘俊松, 陈晓敏, 杜为平, 林少沂, 王健, 崔翰斌. 心房颤动患者左心房血栓脱落致急性心肌梗死一例. 中华心血管病杂志.
   2014;42(6):527-528. doi:10.3760/cma.j.issn.0253-3758.2014.06.020. Available from: https://rs.yiigle.com/cmaid/33790
2. Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur
   Heart J. 2023;44(38):3720-3826. doi:10.1093/eurheartj/ehad191
3. Rao SV, O'Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI guideline for the management of patients with
   acute coronary syndromes: a report of the American College of Cardiology/American Heart Association Joint Committee
   on Clinical Practice Guidelines. Circulation. 2025;151(13):e771-e862. doi:10.1161/CIR.0000000000001309
4. Thygesen K, Alpert JS, Jaffe AS, et al. Fourth universal definition of myocardial infarction (2018). Eur Heart J.
   2019;40(3):237-269. doi:10.1093/eurheartj/ehy462
5. 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 急性ST段抬高型心肌梗死诊断和治疗指南(2019). 中华心血管病杂志.
   2019;47(10):766-783.
6. Van Gelder IC, Rienstra M, Bunting KV, et al. 2024 ESC Guidelines for the management of atrial fibrillation developed
   in collaboration with the European Association for Cardio-Thoracic Surgery (EACTS). Eur Heart J.
   2024;45(36):3314-3414. doi:10.1093/eurheartj/ehae176
7. 中华医学会心血管病学分会, 中国生物医学工程学会心律分会. 心房颤动诊断和治疗中国指南. 中华心血管病杂志.
   2023;51(6):572-618.
8. Shibata T, Kawakami S, Noguchi T, et al. Prevalence, clinical features, and prognosis of acute myocardial infarction
   attributable to coronary artery embolism. Circulation. 2015;132(4):241-250. doi:10.1161/CIRCULATIONAHA.114.015134
9. Jolly SS, Cairns JA, Yusuf S, et al. Randomized trial of primary PCI with or without routine manual thrombectomy. N
   Engl J Med. 2015;372(15):1389-1398.

**Also named in the teaching text** (not in `debrief.references`): Fröbert O, Lagerqvist B, Olivecrona GK, et al.
Thrombus aspiration during ST-segment elevation myocardial infarction (TASTE). N Engl J Med. 2013;369(17):1587-1597. —
ACTIVE Writing Group of the ACTIVE Investigators (Connolly SJ, Pogue J, Hart R, et al.). Clopidogrel plus aspirin
versus oral anticoagulation for atrial fibrillation in the ACTIVE W trial. Lancet. 2006;367(9526):1903-1912. — Steg PG,
James SK, Atar D, et al. ESC Guidelines for the management of acute myocardial infarction in patients presenting with
ST-segment elevation. Eur Heart J. 2012;33(20):2569-2619 (historical context only).

**DOIs and checks (2026-10-30).** The source DOI is the one the source map (`scripts/cmcr-105-sources.json`) records as
verified (`publisherCheckedAt` 2026-10-29). Web searches this session confirmed: the ESC 2023 ACS citation and its DOI;
class III (level A) for routine aspiration in ESC 2023 ACS and the 2025 ACC/AHA guideline's agreement; ESC 2023 ACS
"nitrates should not be given to patients with hypotension … RV infarction"; the Fourth UDMI's V3R/V4R thresholds and
its Eur Heart J citation and DOI (PubMed 30165617); the Chinese STEMI guideline's (2019) citation, its "record right
precordial leads in every inferior STEMI" and "maintain right-ventricular preload, avoid diuretics and vasodilators" in
right-ventricular infarction; ESC 2024 AF's citation and DOI, CHA₂DS₂-VA with anticoagulation from a score of 2, DOAC
preference except mechanical valves or moderate–severe mitral stenosis, label dosing without off-label reduction,
antiplatelets not an alternative, adding antiplatelets to OAC not recommended for stroke prevention, bleeding scores
not to withhold OAC; the Chinese AF guideline's (2023) citation; the Shibata criteria and citation (AF the most
frequent cause); TASTE, TOTAL (more strokes at 30 days) and ACTIVE W results and citations; ESC 2012's class IIa for
routine aspiration; ESC 2023 ACS's intravascular imaging (preferably OCT) for ambiguous culprit lesions. The DOI of
ref 3 is the string the library's editorial reviews verified on 2026-10-28; refs 5, 7 and 9 carry no DOI because none
was verified.

### To verify

**In the source article (the details 1.0.0 does not give):**

- The presenting ECG: rhythm (AF or another rhythm) and ventricular rate, AV conduction, reciprocal changes, posterior
  leads, Q waves; whether the heart rate of 62/min is the ECG or the pulse rate; when the right-sided leads were taken;
  any post-procedure ECG.
- The RCA segment (proximal, mid or distal) given the V3R–V5R elevation; dominance; right-ventricular branch
  involvement; the LAD and LCx (the Shibata minor criterion); TIMI flow after aspiration; the aspirate and any
  histology; antiplatelet loading, heparin and any GP IIb/IIIa inhibitor; the access route.
- IVUS detail (plaque burden, minimal lumen area, dissection or haematoma); whether OCT was considered.
- The day-3 echo: left atrial size; the mass's size, mobility and exact site (free wall or appendage); mitral and other
  valves (DOAC eligibility); right-ventricular size and function; any LV thrombus; any TEE, CT or follow-up imaging;
  the authors' differential (myxoma).
- Troponin I and BNP: sampling times (admission, peak or later), the analyte (BNP or NT-proBNP) and reference ranges;
  the unit of the troponin reference; reference ranges for INR and creatinine; blood count, liver tests, electrolytes.
- Treatment: warfarin dose and INR target; heparin type and dose and the anchor of "day 6"; aspirin dose and duration;
  the "corresponding medicines" for heart failure and when perindopril and amlodipine were resumed; the discharge
  regimen; length of stay; complications; follow-up.
- History: chest-pain character, radiation and severity; dizziness, breathlessness, nausea; stroke/TIA, diabetes,
  bleeding history, kidney or liver disease, alcohol, falls, weight; why five years of AF went without anticoagulation;
  how she reached hospital and any treatment before arrival; any relative.
- The authors' discussion: the criteria they used for coronary embolism, why they aspirated and did not stent, what
  "embolus migration not directly observed" refers to, their antithrombotic recommendation.
- The content and caption of `fig01`, so that its title can name its panels.

**In the guidance (primary texts not opened in this session):**

- ESC 2023 ACS: the wording and class for IV beta-blockers at presentation (the "SBP > 120 mmHg, no acute heart
  failure" condition carried from ESC 2017 — the case states only "without hypotension or acute heart failure"); the
  aspirin, clopidogrel and UFH dose table; the bail-out role of GP IIb/IIIa inhibitors; the recommendations for AF
  with ACS (≤ 1 week triple therapy, then OAC + clopidogrel up to 12 months) and for a single antiplatelet with OAC in
  medically managed patients; whether it says anything specific about right-ventricular infarction beyond nitrates.
- ESC 2024 AF: OAC monotherapy after 12 months post-ACS (class and wording); the exact apixaban dose-reduction table.
- Chinese STEMI guideline (2019): the full right-ventricular infarction text (fluid volumes, when to add vasoactive
  drugs); the V4R threshold (≥ 0.1 mV) next to the UDMI's ≥ 0.05 mV.
- Chinese AF guideline (2023): its stroke-risk score (CHA₂DS₂-VASc-60?) and DOAC wording — cited here without a
  specific claim; and whether a newer Chinese AF management guideline (2025) supersedes it.
- ACC/AHA/ACCP/HRS 2023 AF (listed in `provenance.review.guidelines`): page range of the Circulation version
  (149(1):e1-e156).
- Whether any guideline cited here has a newer edition as of 2026-10 (for example a newer ESC ACS guideline).

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the presenting complaint is
  split into presentation, onset, pain now and sweating; the "ECG and admission observations" record becomes the
  arrival vital signs (exam), the 12-lead ECG and the right-sided leads; the angiography record becomes the
  pre-intervention angiogram (cath lab), the post-aspiration angiogram and IVUS (after aspiration); the laboratory
  record becomes the admission INR and creatinine (ED) and the untimed troponin I and BNP (day 3, labelled); the
  heart-failure course becomes the day-3 status twin.
- **Safety and validity fixes (survey audit).** The meta "source notes" answers are gone and the blood-thinner question
  is answered from the record; the RV-infarction physiology is taught and scored; the management key names the act;
  the historical regimen is a labelled distractor; aspiration evidence and the limits of IVUS and TTE are taught; clear
  lungs are no longer flagged abnormal; the work-up no longer opens at minute zero.
- **History.** 15 template slots → 27 items in the patient's lay voice: 10 recorded facts, 15 honest unknowns and two
  labelled ICE devices; 10 required.
- **Examination.** 2 unnamed "review examination" items → 3 real manoeuvres (vital signs, appearance, lungs) with
  keywords.
- **Phases and gates.** 3 template phases (work-up open from the start, ED, cath-lab and day-3 evidence together) → 5
  one-way phases gated on the preceding objectives; the outcome phase opens only after all five decisions and an
  antithrombotic act.
- **Investigations.** 5 record reviews → 15: bedside ECG and right-sided leads, labs with structured values, the
  angiogram and IVUS in the laboratory, the echo, honest `available: false` results (blood count, lactate, chest film,
  CT aortogram, TEE), and the outcome record.
- **Interventions.** 0 → 19, including the steps the record shows or implies (activation and transfer for the
  emergency angiogram, aspiration, warfarin with heparin),
  current-guidance steps and seven harmful options with harm texts.
- **Decisions.** 3 retrospective template decisions (ids `supported` / `alternative-N`, the key the longest, an
  appraisal question as the only critical item) → 5 staged decisions with 23 options and content ids.
- **Rubric.** 11 template items (10 deterministic; the only critical item a hindsight appraisal decision) → 12: three critical acts, two avoided-harm items with `scoredWhen`, first-try decision
  scoring, a case-specific Calgary–Cambridge communication item.
- **Teaching layer.** 6 learning outcomes, 6 objectives, 4 named staff, 5 key reasoning steps, 6 dated teaching points,
  8 unknowns, 9 Vancouver references.
- **Card.** Title kept; new spoiler-free summary (1.0.0's pointed at an intracardiac and medication cause), lay chief
  complaint, triage handover with the arrival vital signs, four presenting-feature tags, topic tags; specialties
  cardiology, emergency medicine and clinical pharmacology; estimated time 30 → 40 min.
- **Governance.** Review status and notes in the STANDARD §6.6 wording (the English last sentence reads "The case is
  not yet reviewed by a licensed clinician." because the collection contract matches that phrase case-sensitively);
  `sourceTextChecked: false`; `authorChecks` and `sourceTextSha256` removed until the source pass; `sourceDoi` +
  `doiVerifiedAt` added; the media statements reconciled with the approved `fig01`.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, 2 examination
  findings, 5 record reviews, 3 decisions, 11 rubric items (10 deterministic) and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-33790/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33790 --lang en                                                 # 71 steps · objectives 6/6 · decisions 5/5 · utterances 39/39 · rubric 26/26 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-33790                       # depth floor, do-nothing 0, wrong-first 42 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33790:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33790:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-10-30: all five pass.

## 中文摘要

**病例概要。** 80岁女性，高血压 10 年、心房颤动 5 年，平时服培哚普利和氨氯地平，未用任何抗栓药。胸痛 6 小时不缓解伴面色
苍白、大汗来急诊，到院血压 88/62 mmHg、心率 62 次/分，双肺未闻及干湿啰音。心电图Ⅱ、Ⅲ、aVF 导联 ST 段抬高 0.15–0.2 mV，
右胸导联 V3R–V5R 抬高 0.1 mV——下壁 ST 段抬高型心肌梗死合并右心室受累和低血压。急诊冠状动脉造影示右冠状动脉远段大量血栓、
TIMI 1 级；血栓抽吸后管壁光滑、无明显狭窄，血管内超声内膜完整、无斑块破裂，未放支架。术后第 3 天超声心动图：左心房增大，
游离壁回声考虑血栓，下壁、后壁运动减弱，LVEF 55%；肌钙蛋白 I 94.12 μg/L，BNP 3981.2 ng/L（采血时间未记录）。记录中用
华法林加过渡期肝素（第 6 天 INR 2.3 后停肝素）并加阿司匹林；前 10 天有心衰症状，随后好转。诊断：未抗凝房颤患者左心房血栓
栓塞冠状动脉所致急性心肌梗死（很可能；栓子迁移未被直接观察到）。心电图节律、体重、瓣膜、其他冠状动脉、药物剂量和远期结局
均无记录。本版依据 1.0.0 版提取的事实改写，尚未对照原文全文核对。

**学习目标。**

1. 根据下壁导联和右胸导联 ST 段抬高识别下壁心肌梗死合并右心室受累（第四版心肌梗死通用定义，2018），不因高龄推迟、立即
   直接 PCI（ESC 2023 ACS）。
2. 右心室受累合并低血压、双肺清晰时不用硝酸酯、利尿剂、其他扩血管药和静脉 β 受体阻滞剂，暂停降压药，分次补液维持前负荷。
3. 说明常规血栓抽吸为何不再推荐（ESC 2023 ACS Ⅲ类；TASTE、TOTAL），以及何时选择性抽吸并在定支架前做腔内影像。
4. 依据 Shibata 标准（2015）诊断冠状动脉栓塞，说明 IVUS 与经胸超声的局限，并决定不放支架。
5. 为房颤相关栓塞性心肌梗死制订抗凝方案：CHA₂DS₂-VA 评分、DOAC 优先、按说明书定剂量、抗血小板最多一种且限期（ESC 2024 AF）。
6. 用通俗语言和复述法向高龄患者解释长期抗凝与出血警示信号。

**关键决策。**

- 决策 1（再灌注）：下壁 STEMI 发病 12 小时内，立即启动导管室行直接 PCI，不等肌钙蛋白、不溶栓、不先做主动脉 CT、不收入
  CCU 择期造影。
- 决策 2（右心室与血压）：不用硝酸甘油，暂停培哚普利和氨氯地平，小剂量分次补液并复评，贴好除颤电极、备好阿托品和起搏；
  干扰项为硝酸甘油加吗啡、预防性利尿、静脉美托洛尔、只用升压药不补液。
- 决策 3（导管室策略）：选择性抽吸这处大量血栓，再用 IVUS 或 OCT 看清血管壁后才决定支架；干扰项包括直接放支架、“常规抽吸”
  后放支架（ESC 2012 的做法）和推迟 48 小时。
- 决策 4（机制与支架）：很可能是房颤相关冠状动脉栓塞，不放支架，开始抗凝并寻找栓子来源；干扰项为斑块侵蚀放支架、痉挛、
  自发性夹层。
- 决策 5（长期抗栓）：按说明书剂量开始 DOAC（先称体重、核对肾功能），不用双联抗血小板；干扰项包括抗血小板代替抗凝、暂用
  阿司匹林等经食管超声、记录中的华法林加长期阿司匹林、12 个月三联治疗。

**复盘要点（PEARLS）。** 先谈护士要给 88/62 mmHg 的患者含服硝酸甘油时的感受；用四句话复述急诊和导管室的经过；分析右胸
导联对每一种药物选择的意义、为何不溶栓也不等肌钙蛋白、抽吸是常规还是针对这处血栓的选择、抽吸后血管正常意味着什么以及
IVUS 不能告诉我们什么、远段血栓与右胸导联抬高的矛盾、她这次之前的卒中风险评分、“考虑血栓”有多可靠、今天会怎样选药定量，
以及怎样回应她对出血的担心；总结下次遇到高龄房颤患者要查什么。评分：确定性总分 26 分，三项关键项（首次作答即选直接 PCI
并实际启动导管室、不溶栓；不给硝酸甘油或静脉美托洛尔；首次作答即以口服抗凝为核心并实际开始抗凝、不以抗血小板替代或三联
治疗），沟通项由考官评判。记录中的处置（华法林加肝素过渡并加阿司匹林）只作为历史对照，不代表现行推荐。本病例经人工智能
辅助编辑审核，尚未经执业医师审核；待核实事项见上文 “To verify”。
