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
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30; independent AI-assisted reviews and fixes 2026-11-13 and, rounds 2, 3 and 4, 2026-11-14); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a cardiologist review it before teaching use |
| phases | `ed` 急诊抢救区 / Emergency department resus bay → `cath-lab` 心导管室：急诊冠状动脉造影 / Catheter laboratory → `post-aspiration` 抽吸之后 / After aspiration → `day3` 术后第 3 天 / Day 3 after the procedure (ward) → `followup` 记录的病程与结局 / Recorded course and outcome — all one-way, none learner-switchable |
| content | 27 history items (10 recorded facts, 2 labelled teaching devices, 15 unknown; 10 required) · 3 exam findings (all that 1.0.0 records) · 17 investigations (1 record review; 7 with no recorded result) · 19 interventions (7 harmful in the acute or any phase — 3 of them `critical` — plus a transfer that is unsafe before activation and two oral-anticoagulant starts that are wrong before or during the procedure) · 6 objectives · 5 decisions (23 options) · 12 rubric items (11 deterministic, weight 26; 1 examiner-judged; 3 critical) · 4 staff · 6 learning outcomes · 6 teaching points · 77 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise inferior STEMI with right-ventricular involvement from ST elevation in II, III and aVF and in the
   right-sided leads V3R–V5R (Fifth Universal Definition of MI, 2026; Chinese STEMI guideline 2019: ≥ 0.1 mV, above all
   in V4R), and start immediate primary PCI (ESC 2023 ACS) without letting her age delay it (no age limit on
   reperfusion: Chinese STEMI guideline 2019).
2. In right-ventricular involvement with a systolic pressure below 90 mmHg and clear lungs, withhold nitrates (ESC 2023
   ACS), diuretics and other vasodilators (Chinese STEMI guideline 2019) and IV beta-blockers, hold antihypertensives,
   and keep the right-ventricular preload up with small fluid boluses, reassessing after each.
3. Explain why routine thrombus aspiration is no longer recommended (ESC 2023 ACS class III, after TASTE and TOTAL) and
   when selective aspiration, and intravascular imaging before any stent decision, are reasonable.
4. Diagnose coronary embolism with the Shibata criteria (2015) from a smooth post-aspiration vessel, intravascular
   ultrasound without plaque rupture, atrial fibrillation without anticoagulation and a left atrial echo considered thrombus; state
   the limits of IVUS and of echocardiography (transthoracic versus transoesophageal); and decide against a stent.
5. Prescribe anticoagulation after an AF-related embolic infarct: score CHA₂DS₂-VA, choose a DOAC over warfarin unless
   there is a mechanical valve or moderate–severe mitral stenosis, dose it to the label criteria for age, weight and
   renal function, and limit any antiplatelet to one agent for a defined period (ESC 2024 AF; ESC 2023 ACS).
6. Explain to an older patient in plain words, checked by teach-back, why she now needs long-term anticoagulation, how
   it differs from the tablets she took before, and which bleeding signs to report at once.

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list.

## Clinical summary (spoilers)

**Presentation.** An 80-year-old woman with **ten years of hypertension** and **five years of atrial fibrillation**,
taking **perindopril and amlodipine** and **no antithrombotic**, arrives after **six hours of chest pain that has not
eased**, **pale and sweating heavily**. On admission **BP 88/62 mmHg, heart rate 62/min**; her **lungs are clear** (no
wheezes or crackles). Her usual blood-pressure control was acceptable.

**ECG.** ST elevation of **0.15–0.2 mV in II, III and aVF** and **0.1 mV in V3R–V5R** — an inferior STEMI with
right-ventricular involvement, with hypotension and clear lungs: a preload-dependent right ventricle. The rhythm on the
tracing is **not recorded** (she has known AF; do not let the group assume it). Admission **INR 1.1** (consistent with
her taking no warfarin) and **creatinine 57.3 μmol/L**.

**Catheter laboratory.** Emergency angiography: **heavy thrombus in the distal right coronary artery, TIMI 1 flow**.
After **thrombus aspiration** the vessel wall was **smooth with no significant stenosis**; **IVUS** showed an **intact
intima without plaque rupture**; **no stent was placed**.

**Day 3 after the procedure.** Echocardiogram (whether transthoracic or transoesophageal is not recorded): **enlarged
left atrium** with an **echo on the left atrial free wall considered to be thrombus**, **reduced inferior and posterior
wall motion**, **LVEF 55 %**. **Troponin I 94.12 μg/L** (reference 0–0.04) and **BNP 3981.2 ng/L** (sampling times not
recorded; staged here).

**Recorded course.** **Warfarin** with **heparin during the transition**, plus **aspirin**; heparin stopped on
**day 6** once the **INR reached 2.3**. **Heart-failure symptoms during the first 10 days**, then improvement; the
corresponding medicines were added (not named). Long-term embolic and bleeding outcomes are not recorded; the embolus's
migration was not directly observed.

**Diagnosis.** Acute inferior myocardial infarction with right-ventricular involvement from **coronary embolism** of
left atrial thrombus in AF without anticoagulation — probable on the catheter-laboratory findings (Shibata: one major, one minor
criterion), definite once the day-3 atrial echo is taken as its source (a second minor criterion); the migration itself
was not observed (the report's title: 心房颤动患者左心房血栓脱落致急性心肌梗死).

**Today's answer.** Immediate primary PCI (ESC 2023 ACS); no nitrate (ESC 2023 ACS), no diuretic or other vasodilator
(Chinese STEMI guideline 2019) and no IV beta-blocker; antihypertensives held, cautious fluid; selective aspiration and
intravascular imaging before any stent decision, then no stent; a DOAC at its label dose (ESC 2024 AF), no dual
antiplatelet therapy. The report's warfarin-plus-aspirin regimen is the historical contrast.

## Scenario timeline and physiology (staged evidence by phase)

- **Static clock, no physiology** (the collection contract). Results are immediate; interventions are scored for
  appropriateness but change nothing — the course is the recorded one. The monitoring step's response says the readings
  are not recorded.
- **Five one-way phases** (none learner-switchable; a record read in an earlier phase stays readable by its phase):
  - `ed` — the history in her own words; the bedside examination (vital signs, appearance, lungs: the three findings
    1.0.0 records); the **12-lead ECG** and the **right-sided leads** (bedside orders; posterior leads V7–V9 can be
    ordered too and answer that no result is recorded); the admission **clotting screen
    (INR)** and **renal function**; troponin and BNP orders answer honestly that the one recorded value of each has no
    sampling time and is shown with the in-hospital results. Decisions 1 and 2, the ED acts, the **activation call** and
    the **transfer**.
  - `cath-lab` — opens once `obj-ed-history`, `obj-ed-assessment` and `obj-ed-plan` are done (the last needs decision 2
    right, the activation and the transfer); `location: {capability: "fluoroscopy"}` (the transfer's `destination` is
    the same table). The **coronary angiogram** shows the pre-intervention finding only. Decision 3 and the aspiration.
  - `post-aspiration` — opens once `obj-cath-lab` (the angiogram read, decision 3 right, the aspiration done) is
    complete; she stays on the table. The **repeat angiogram** and **IVUS** (an OCT order answers that no OCT is
    recorded and that the imaging recorded is IVUS). Decision 4.
  - `day3` — opens once `obj-after-aspiration` (both reads, decision 4 right) is complete; `location: {setting:
    "ward"}` — a staging convention: 1.0.0 does not record where she was. Her status (phase twin `status-day3`), the
    **echo**, the **troponin I** and **BNP** values, a TEE order (no separate result recorded; out of the reference path since review round 4), her second worry, decision 5
    and the antithrombotic act.
  - `followup` — opens once objectives 1–5, decision 5 and **an antithrombotic act** are done — a DOAC or warfarin with heparin prescribed on day 3 (`whenIndicated`; before or during the procedure it is contraindicated), or one of the two harmful regimens: the **reported course
    and outcome** record.
- No prompt, hint, order response or harm text states a later phase's result before its record opens: the stent and
  DAPT harm texts name no post-aspiration finding; the troponin and BNP placeholders give no value; no option's feedback
  names the recorded regimen (it is read in the outcome record — review round 2 removed it from decision 5's
  `warfarin-plus-aspirin` feedback); an echo ordered in the ED answers only that no result is recorded at this point.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-ed-history` Hear the story: the pain, her illnesses and her medicines | presentation, onset, pain now, sweating, past history, medicines, blood thinners asked |
| 2 | `obj-ed-assessment` Examine her, record the ECGs and send the bloods | vital signs, appearance, lungs examined; 12-lead ECG, right-sided leads, INR and creatinine read (phase `ed`); `reperfusion` right |
| 3 | `obj-ed-plan` Decide her care in the ED and act on it | `rv-haemodynamics` right; catheter laboratory activated; transfer made |
| 4 | `obj-cath-lab` Read the new result and decide the next step | angiogram read (phase `cath-lab`); `thrombus-strategy` right; aspiration done |
| 5 | `obj-after-aspiration` Look again: explain what you see and decide what it needs | repeat angiogram and IVUS read (phase `post-aspiration`); `mechanism` right |
| 6 | `obj-day3` Day 3: set the long-term plan and review the outcome | status asked; echo, troponin and BNP read (phase `day3`); `anticoagulation` right; a DOAC or warfarin started; outcome record read |

Titles name no finding, result or treatment — the journal lists later objectives by title from the start, so titles 4–6
name neither the catheter laboratory, the thrombus nor a stent; hints are Socratic questions with no answer in them
("Which of the usual chest-pain drugs could harm her now?"; "Before you do anything irreversible to this artery, what
else would you want to know?").

### Decisions

- **1 `reperfusion`** (single; needs presentation, onset, pain now, vital signs and the 12-lead ECG). Key:
  `primary-pci-now` — inferior STEMI within 12 hours: activate for immediate primary PCI, age no reason to delay, no
  troponin wait. Distractors: `troponin-first`, `lysis-now`, `ct-aorta-first` (dissection needs clinical clues, none
  recorded), `admit-ccu-24h`.
- **2 `rv-haemodynamics`** (single; needs decision 1 attempted, the right-sided leads, lungs, vital signs and her
  medicines). Prompt: the nurse asks whether to give sublingual GTN and her usual tablets (her brief has her question GTN at a systolic under 90 mmHg); the prompt gives the admission pressure as such. Key: `protect-preload` — no
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
  antiplatelet. The prompt and the key's feedback say that her weight and her valves are not recorded: weigh her, and
  confirm on the echo that there is no moderate–severe mitral stenosis before a DOAC. Distractors: `dapt-not-oac`, `aspirin-until-tee`, `warfarin-plus-aspirin` (close to the recorded
  regimen), `triple-12-months`.

Every option has its own feedback naming ESC 2023 ACS, the Fifth Universal Definition of MI (2026), the Chinese STEMI
guideline (2019), ESC 2024 AF, the Shibata criteria (2015), TASTE/TOTAL or ACTIVE W. Option ids name their content.
**Length cue (measured 2026-10-30; re-measured 2026-11-14, unchanged):** the key is the uniquely longest option only in decision 5 (zh-CN 78 of 50–78
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
| `rb-no-preload-drop` | safety | 3 | **critical** — no GTN, no IV metoprolol, and no IV furosemide while it is contraindicated (`valid: false`: ED, laboratory, after aspiration); scored once decision 2 is attempted or any of them is given |
| `rb-ed-support` | management | 2 | `rv-haemodynamics` right first time; monitoring, antihypertensives held, fluid and aspirin each given in its window before the artery is opened (`whenIndicated`: monitoring in the ED; holding, fluid and aspirin in the ED or the laboratory before aspiration — since review round 3); no transfer before the activation call and no DOAC or warfarin started before or during the procedure (each `valid: false`; for the anticoagulants the ED, the laboratory and after aspiration — since review round 4) |
| `rb-cath-strategy` | management | 2 | `thrombus-strategy` right first time; aspiration; IVUS ordered after aspiration; the UFH bolus at the start of the procedure (`whenIndicated`: in the ED after the activation call or in the laboratory before aspiration — since review round 3) |
| `rb-mechanism` | diagnosis | 3 | `mechanism` right first time |
| `rb-no-stent` | safety | 2 | no stent; scored once decision 3 is attempted or a stent is placed |
| `rb-anticoagulation` | management | 4 | **critical** — `anticoagulation` right first time, a DOAC or warfarin started after the procedure (`whenIndicated`: on day 3 — since review round 4; a laboratory prescription after aspiration had counted), and neither DAPT-instead-of-OAC nor triple therapy |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: the blocked artery and the urgent angiogram in the ED; on day 3 the clot from the heart, why long-term anticoagulation, how it differs from her tablets and aspirin, bleeding warning signs, missed doses, why weight and kidney function set the dose; teach-back; no blame, no unrecorded promises |

### How wrong choices score (re-measured with the reducer on 2026-11-14, after review round 4)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 26/26 (100 %) | none | passed |
| start and do nothing | 0/21 | `rb-reperfusion`, `rb-anticoagulation` | passed |
| wrong first answer at all five decisions, then right | 11/26 (42 %) | `rb-reperfusion`, `rb-anticoagulation` | passed |
| wrong first answer at decision 1 only | 22/26 (85 %) | `rb-reperfusion` | passed |
| wrong first answer at decision 2 only | 24/26 (92 %) | none | passed |
| wrong first answer at decision 3 only | 24/26 (92 %) | none | passed |
| wrong first answer at decision 4 only | 23/26 (88 %) | none | passed |
| wrong first answer at decision 5 only | 22/26 (85 %) | `rb-anticoagulation` | passed |
| reference path plus sublingual GTN in the ED | 23/26 (88 %) | `rb-no-preload-drop` | **failed** (`gtn-sublingual`) |
| reference path plus IV metoprolol in the ED | 23/26 (88 %) | `rb-no-preload-drop` | **failed** (`metoprolol-iv`) |
| reference path plus IV furosemide in the ED | 23/26 (88 %) | `rb-no-preload-drop` | **failed** (`furosemide-iv`) |
| reference path plus IV furosemide on day 3 only (not contraindicated there) | 26/26 (100 %) | none | passed |
| reference path plus tenecteplase | 22/26 (85 %) | `rb-reperfusion` | passed (`critical: false`) |
| reference path plus a stent before aspiration | 24/26 (92 %) | none (`rb-no-stent` lost) | passed (`critical: false`) |
| reference path plus aspirin and clopidogrel instead of anticoagulation | 22/26 (85 %) | `rb-anticoagulation` | passed (`critical: false`) |
| reference path plus 12 months of triple therapy | 22/26 (85 %) | `rb-anticoagulation` | passed (`critical: false`) |
| the report's plan: warfarin-plus-aspirin answered first, warfarin with heparin given | 22/26 (85 %) | `rb-anticoagulation` | passed |
| reference path with warfarin and heparin instead of the DOAC | 26/26 (100 %) | none (warfarin is a valid anticoagulant act; decision 5 tests the choice) | passed |
| a DOAC prescribed in the ED as well as on day 3 | 24/26 (92 %) | none (`rb-ed-support` lost: a prescription before the procedure is contraindicated) | passed (`doac-start` listed as contraindicated; moderate risk, no `critical` flag) |
| warfarin with heparin started in the ED as well as the day-3 DOAC | 24/26 (92 %) | none (`rb-ed-support` lost) | passed |
| a transfer before the activation call (then the activation and the transfer again) | 24/26 (92 %) | none (`rb-ed-support` lost) | passed |
| a DOAC prescribed only in the ED: the outcome phase waits for a prescription after the procedure | 20/26 (77 %) | `rb-anticoagulation` (and `rb-ed-support` lost) | passed |
| a DOAC (or warfarin with heparin) started in the laboratory after IVUS, before decision 4, as well as on day 3 | 24/26 (92 %) | none (`rb-ed-support` lost: contraindicated during the procedure since review round 4; 26/26 before) | passed |
| a DOAC prescribed only in the laboratory after IVUS: the outcome phase waits for a day-3 prescription | 20/26 (77 %) | `rb-anticoagulation` (and `rb-ed-support` lost; 26/26 before review round 4) | passed |
| reference path without monitoring, holding, fluid and aspirin | 24/26 (92 %) | none | passed |
| reference path with the aspirin load given only on day 3 (late) | 24/26 (92 %) | none (`rb-ed-support` lost) | passed |
| reference path with the UFH bolus given only on day 3 (late) | 24/26 (92 %) | none (`rb-cath-strategy` lost) | passed |
| reference path without the stroke, bleeding, allergy and weight questions | 24/26 (92 %) | none | passed |
| reference path without any day-3 antithrombotic act: the outcome phase never opens, the case cannot be finished | 22/26 (85 %) | `rb-anticoagulation` | passed |
| reference path without the activation call: the catheter laboratory never opens | 9/24 (38 %) | `rb-reperfusion`, `rb-anticoagulation` (and `rb-ed-support`: the transfer was never activated) | passed |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The avoided-harm items
count only once the harm was possible (`scoredWhen`), so doing nothing earns 0. **Timing of the critical acts.** The
catheter laboratory opens only after the activation call and the transfer, so the call that meets `rb-reperfusion` is
always made in the ED, before any confirming record. The anticoagulant that meets `rb-anticoagulation` counts only when it is prescribed after the procedure (`whenIndicated`: on day 3), and the outcome record opens only
after such a prescription or a harmful regimen, so it cannot be prescribed after reading the recorded regimen — and a
harmful regimen given first (DAPT instead of anticoagulation, triple therapy) loses the item for good. Both
anticoagulant acts allow a second prescription (`maxDoses: 2`), so a learner who prescribed one too early can still
prescribe it in its window; a prescription before or during the procedure is contraindicated (its harm text: heparin
carries the procedure, ESC 2023 ACS) and costs `rb-ed-support`. IV furosemide is scored only when it is given while contraindicated
(`{"intervened": "furosemide-iv", "valid": false}`: the ED, the laboratory and after aspiration), so a diuretic for the
recorded heart-failure symptoms on the ward costs nothing. Monitoring, holding the antihypertensives, fluid and
aspirin count for `rb-ed-support`, and the UFH bolus for `rb-cath-strategy`, only when given in their windows
(`whenIndicated`; review round 3 closed the earlier known limit that let them be given late, even on day 3, for full
credit). Review round 4 closed the last known limit: a DOAC or warfarin prescribed in the laboratory after aspiration (before decision 4, the day-3 echo and her weight) had counted for `rb-anticoagulation`; it is now contraindicated there, as its harm text always said, and costs `rb-ed-support`.

### Critical items

`rb-reperfusion` (the missed life-saving act: primary PCI chosen and the call made in the ED, with no lytic),
`rb-no-preload-drop` (the dangerous error: a nitrate, a diuretic or an IV beta-blocker in hypotensive RV involvement) and
`rb-anticoagulation` (the missed life-saving act of this case: anticoagulating an AF-related embolic infarct, with no
antiplatelet substitute or triple therapy). All three are acts; none reads a final-phase record.

**Safety outcome.** Sublingual GTN (`gtn-sublingual`, contraindicated throughout), IV furosemide in the ED, the
laboratory or after aspiration (`furosemide-iv`) and IV metoprolol (`metoprolol-iv`) are `critical: true`: dropping
the preload or the rate of a hypotensive, preload-dependent right ventricle is this case's dangerous error
(CASE_AUTHORING §6 names the nitrate in right-ventricular infarction), so giving any of them fails the run's safety
outcome whatever the score, and `rb-no-preload-drop` loses its weight. The other harmful options are `critical:
false` — recoverable misjudgements that a critical rubric item already costs: tenecteplase where primary PCI is
available (no absolute contraindication is recorded; `rb-reperfusion`), a stent before imaging (`rb-no-stent`), 12
months of triple therapy and aspirin plus clopidogrel instead of anticoagulation (the next clinician can correct
them; `rb-anticoagulation`). The transfer before the activation call and a DOAC or warfarin started before or during
the procedure are `risk: moderate` timing errors (no `critical` flag) that cost `rb-ed-support`.

## Reference path (`solution`)

70 steps, static clock: start → presentation, onset, pain now → **vital signs**, **appearance** → **12-lead ECG** →
**monitoring with pads** → sweating, past history, medicines, blood thinners → `reperfusion` → **activate the catheter
laboratory** → allergies, bleeding, stroke/TIA (before any antithrombotic) → **aspirin** → **right-sided leads** →
**lungs** → **IV cannula and bloods** → INR, creatinine → weight → `rv-haemodynamics` → **hold perindopril and amlodipine**, **fluid bolus**, **clopidogrel**
→ her worry, the rest of the chest-pain and risk history (character, site and radiation, severity, trigger,
dizziness, breathlessness, nausea, blood-pressure control, advice about blood thinners, diabetes, smoking and alcohol,
home, care before arrival) → **transfer** → (phase `cath-lab`) angiogram → **UFH** → `thrombus-strategy` → **aspiration**
→ (phase `post-aspiration`) repeat angiogram, IVUS → `mechanism` → (phase `day3`) her status → echo, troponin I, BNP →
her worry about blood thinners → `anticoagulation` → **DOAC** → (phase `followup`)
outcome record → finish. `cases verify` passes: objectives 6/6, decisions 5/5, rubric 26/26, utterances 77/77. Review round 4 took the TEE request out of the path: nothing needs it, decision 5's key says imaging must not hold up anticoagulation, and a TOE needs safety questions of its own (swallowing, oesophageal disease) that this record cannot answer.

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
| echo day 3 after the procedure: LA enlarged, free-wall echo considered thrombus, inferior/posterior hypokinesis, LVEF 55 % | `investigations.echo` | `investigations.echo` (phase `day3`; named "echocardiogram" — 1.0.0 does not say transthoracic or transoesophageal) |
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
vascular disease not recorded); after it ≥ 4 (+ vascular disease 1 for the infarct), or ≥ 6 if the coronary embolism
also counts as arterial thromboembolism (+ 2); the recorded heart-failure symptoms could add 1. CHA₂DS₂-VASc would be ≥ 4 before the event (female sex 1). **HAS-BLED**
≥ 1 (age > 65), + 1 with aspirin; its other components are not recorded. **Apixaban dose criteria:** age ≥ 80 met;
creatinine ≥ 133 μmol/L not met; weight ≤ 60 kg unknown — so 5 mg twice daily unless she weighs 60 kg or less.

**Guidance numbers used in teaching text** (doses as formulas; no patient value is needed): primary PCI within 12 h of
onset and within 120 min of diagnosis in preference to fibrinolysis; aspirin 150–300 mg (75–250 mg IV); clopidogrel
300–600 mg loading, 75 mg daily; UFH 70–100 U/kg at PCI (ESC 2023 ACS Table 6; 2025 ACC/AHA Table 10, to an ACT of
250–300 s), 50–70 U/kg when a GP IIb/IIIa inhibitor is used (Chinese STEMI guideline 2019, Ⅰ B, to an ACT of
200–250 s — neither current ESC nor ACC/AHA table lists it); GTN 0.4–0.5 mg only with SBP ≥ 90 mmHg and no RV infarction;
right-sided ST elevation ≥ 0.1 mV, above all in V4R (Chinese STEMI 2019; the Fifth UDMI 2026 sets no separate cut-point;
the Fourth UDMI 2018 took ≥ 0.05 mV, ≥ 0.1 mV in men under 30); crystalloid boluses of
250–500 mL with reassessment (a common protocol volume, not a guideline number); metoprolol 5 mg IV up to 3 doses (a
harmful option here; ESC 2023 ACS considers IV beta-blockers at presentation only with no signs of acute heart failure
and SBP > 120 mmHg); tenecteplase weight-banded, halved over 75 years (ESC 2023 ACS §5.3.1.1: "> 75"; a harmful option here); CHA₂DS₂-VA ≥ 2 → anticoagulation; apixaban 5 mg twice daily, 2.5 mg only with two of age ≥ 80,
weight ≤ 60 kg, creatinine ≥ 133 μmol/L; warfarin INR 2.0–3.0 for AF (a mechanical valve has its own target), with heparin until in range after her recent embolic event; triple therapy ≤ 1 week
after PCI for AF with ACS, then OAC + clopidogrel up to 12 months, then OAC alone.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel when the nurse asked whether to give GTN to a woman with a pressure of 88/62?"
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
   - "What was her stroke-risk score before this happened? What was missing from her medicines?" (whether she had
     ever been anticoagulated, and why she took no antithrombotic, is not recorded — no blame)
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
| GTN for the pain; morphine with her usual tablets | `gtn-then-morphine` feedback; `gtn-sublingual` contraindicated (`critical: true`) | `rb-no-preload-drop` (critical); safety outcome fails |
| Diuretic "before heart failure sets in" | `furosemide-now` feedback; `furosemide-iv` contraindicated in the acute phases (`critical: true`) | `rb-ed-support` (decision); `rb-no-preload-drop` (critical); safety outcome fails |
| IV beta-blocker | `iv-metoprolol` feedback; `metoprolol-iv` contraindicated (`critical: true`) | `rb-no-preload-drop` (critical); safety outcome fails |
| Pressor and no fluid | `pressor-no-fluid` feedback | `rb-ed-support` |
| Stenting through the thrombus, or aspirating "because it is routine" and stenting | `direct-stent`, `routine-aspiration` feedback; `stent-implant` contraindicated | `rb-cath-strategy`, `rb-no-stent` |
| Calling it erosion, spasm or dissection | `erosion-stent`, `vasospasm`, `dissection-conservative` feedback | `rb-mechanism` |
| DAPT or aspirin instead of anticoagulation "at 80"; waiting for a TEE | `dapt-not-oac`, `aspirin-until-tee` feedback; `dapt-instead-of-oac` contraindicated | `rb-anticoagulation` (critical) |
| The report's warfarin plus open-ended aspirin; triple therapy | `warfarin-plus-aspirin`, `triple-12-months` feedback; `triple-therapy` contraindicated | `rb-anticoagulation` (critical) |
| Starting the anticoagulant in the ED or the laboratory, before or during primary PCI | `doac-start` and `warfarin-heparin` contraindicated in the ED, the laboratory and after aspiration (harm text: heparin carries the procedure); only a prescription on day 3 counts and opens the outcome phase | `rb-ed-support`; `rb-anticoagulation` (critical) if no later prescription |
| Loading aspirin and clopidogrel in one order ("aspirin 300 mg and clopidogrel 600 mg", 双抗负荷) | offered back as the two loading doses, to be given one at a time — never read as "aspirin plus clopidogrel instead of an anticoagulant" (review round 4; see Matcher notes) | — |
| Transferring her before the laboratory is activated | `transfer-cath-lab` contraindicated before the activation call | `rb-ed-support` |
| Dosing a DOAC without a weight, or choosing it without checking the valves | decision 5 prompt and key feedback, `doac-start` response, the pharmacist | — |
| Inventing a rhythm, a weight, a valve finding or the other vessels | unknown history items, `examNotRecorded`, record notes, the staff briefs | — |

### Teaching points for the debrief

The six `debrief.teachingPoints`: (1) right-ventricular involvement — right-sided leads in every inferior STEMI
(ESC 2023 ACS; Chinese STEMI 2019), right precordial ST elevation indicating RV infarction (Fifth UDMI 2026, no separate
cut-point; ≥ 0.1 mV, above all in V4R, in the Chinese guideline; the Fourth UDMI's ≥ 0.05 mV as history), no nitrate
(ESC 2023 ACS), preload kept up and no diuretics or vasodilators (Chinese STEMI 2019), then and now; (2) primary PCI at 80 — 12 h, 120 min, aspirin, UFH,
clopidogrel when anticoagulation is foreseeable (ESC 2023 ACS); (3) aspiration then and now — ESC 2012 IIa, TASTE 2013,
TOTAL 2015, ESC 2023 class III, selective use and OCT for ambiguous culprits; (4) coronary embolism — the
Shibata criteria (2015), the appendage and the limits of TTE (this echo's modality is not recorded), myxoma, other
emboli; (5) anticoagulation — CHA₂DS₂-VA (ESC 2024 AF), DOAC first once the valves are checked, label dosing (never for
age alone), ACTIVE W, bleeding scores; (6) the antithrombotic plan then and now — the
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
- **Measured (offline demonstration, 2026-10-30; re-run 2026-11-14 after review rounds 2, 3 and 4).** `embodied-autopilot.test.ts -t "cmcr-33790:"` passes in en and
  zh-CN: every objective done, in-world score equal to the clinical score, no "cannot do this".

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; ten years of
hypertension and five of AF; perindopril and amlodipine, no antithrombotic; acceptable usual blood-pressure control; six
hours of unrelieved chest pain with pallor and heavy sweating; BP 88/62 mmHg and heart rate 62/min on admission; no
wheezes or crackles; the ECG with right-sided leads; admission INR and creatinine; the angiographic, aspiration and IVUS findings and
no stent; troponin I and BNP; the day-3 echo; warfarin with transitional heparin and aspirin, heparin stopped at INR 2.3
on day 6; heart-failure symptoms in the first 10 days, then improvement; the report's title as the authors'
attribution.

**Adapted for teaching.** The ED resus-bay setting (1.0.0's `setting: "emergency"`); the five phases (the ward bed on
day 3 is staging); the patient's dialogue (lay rewording of recorded facts); the staff; the five decisions, their
options and feedback; the 19 interventions (their responses say the case does not record whether they were done, or
name the recorded step); the rubric; the tests a learner would order that 1.0.0 lacks (blood count, lactate, chest film,
CT aortogram, TEE, posterior leads V7–V9, OCT) as honest records with no result; showing troponin I and BNP on day 3; the `post-aspiration` phase, which shows the IVUS after the aspiration
(1.0.0 gives the post-aspiration appearance and the IVUS finding without stating their order — an inference, To
verify); the day-3 status answer, which voices the recorded heart-failure symptoms as what "the doctors tell me" and
names no symptom; her portrayal (frightened, short phrases broken by the pain, awake and answering in the catheter
laboratory — 1.0.0 records none of it). **Labelled teaching
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
  the ECG or the pulse rate; the case shows it with the admission vital signs and states no rhythm (1.0.0 calls them
  admission observations, 入院观测 — review round 3 replaced "on arrival" / 到院 throughout).
- **Troponin reference.** "0–0.04" without its own unit; the case reads it in the value's unit (μg/L).
- The 1.0.0 template flagged clear lungs as abnormal and filed them under "general"; corrected (respiratory, not
  abnormal).

**Unknowns kept honest.** The ECG rhythm (central in an AF case — never implied), other vital signs, weight, examination
beyond the three findings, risk factors and bleeding history, whether she had ever been anticoagulated and why she
took no antithrombotic, drug doses, ED
treatment, angiographic and echo detail (including whether the echo was transthoracic or transoesophageal — 1.0.0 says
only 超声 / echocardiography), the analyte and timing of BNP and troponin, reference ranges, the warfarin and
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
- **Order entry.** `orderMatching.rules`: right-sided-lead and posterior-lead queries drop the generic ECG; TEE queries drop the echocardiogram; CT and aorta queries drop coronary angiography; IVUS queries drop the angiogram; OCT queries drop the angiogram and IVUS (an OCT order gets the OCT record's honest "no result", not the IVUS finding).
- **Prefix matches (review round 2).** A run-together keyword still matches any utterance word that is a long prefix
  of it (`bloodin` took every "blood", `pressurebeen` every "pressure"): both were removed, and plain questions that had
  reached the wrong item or none ("What do you take for your blood pressure?", "Do you react badly to any medicines?",
  "weakness down one side or trouble speaking", "black stools or vomited blood", 以前大便有没有发黑, 来医院前吃过止痛药吗)
  now reach the right one; on day 3 `status-day3` also supersedes `breathless`, so "Are you short of breath now?" gets
  the recorded heart-failure course instead of an unknown. Known misses: "U&E" orders nothing; "NT-proBNP" orders the
  BNP record (its result says BNP).
- **Review round 3 probes** (159 + 54 phrasings through the patient pipeline: history in every phase, lay examination
  requests, orders, interventions). Fixed: "When did the pain start?" reached the `trigger` unknown (its question holds
  "when the pain started"; `onset` now has the plain question as a keyword and `trigger` excludes "when did");
  "What seems to be the problem?", "Why have you come to hospital?", "Has the pain let up?", "Who do you live with?",
  "Does the pain move anywhere?", "bled from your stomach", "how heavy are you" (reached `character`), "Any other
  illnesses?" and 出了很多汗吗 reached nothing or the wrong item; occupation questions (您是做什么工作的, "What do you do
  for a living?") reached `trigger` or `home`, and "Does anything make it better or worse?" reached `pain-now` or
  `status-day3` — all now reach the right item or none. Left as is: "Have you ever had a heart attack?" reaches no
  item in English (the fallback "I'm not sure, doctor." — a prior infarct is not recorded) and `pmh` in Chinese.
- **Review round 4 probes** (91 new phrasings, history and lay examination requests in every phase, plus 50 act orders through the agent's resolver). Acts: the standard ED loading order ("Give aspirin and clopidogrel", "aspirin 300 mg and clopidogrel 600 mg", "DAPT load", 双抗负荷, 阿司匹林加氯吡格雷负荷量) resolved to `dapt-instead-of-oac` — always contraindicated, losing the critical `rb-anticoagulation` for good; its bare aliases ("aspirin and clopidogrel", "dapt", 双抗, 阿司匹林加氯吡格雷) and the loading items' cross-exclusions are replaced: a combined loading order is now offered back as the two loading doses (ambiguous, one at a time), the harmful regimen needs its own words ("instead of anticoagulation", "antiplatelets only", 只用双抗, 代替抗凝; loading words exclude it), a bare "DAPT" or 给双抗 offers all three, and "DOAC plus aspirin and clopidogrel" or 华法林加阿司匹林和氯吡格雷 reaches triple therapy; "balloon" no longer places a stent. History: "When did you first notice the chest pain?" reached `sweating`; "Is your blood pressure normally okay?" credited `pmh` and `medications`; "Has anyone ever put you on a blood thinner?" got the current-drug answer instead of the unknown; "Did you take anything before coming in?", 您这是怎么啦, 现在好点没有 and, on day 3, "How are you today?" reached nothing; day-3 questions about the new tablets or blood-thinner worries also pulled in the medicines or presenting-complaint answers; "Have you travelled anywhere recently?" reached `site-radiation`; "Look at her neck veins" returned the general appearance — all fixed with run-together keywords and exclusions (single words left after stop-words would act as wildcards), seven of them added to the corpus.
- **Corpus.** 77 test utterances (34 zh-CN, 43 en), written as learners speak, including eight look-alike negatives;
  every required item and the phase twin are covered; `cases verify` reports 77/77 with no extra selections.

## References

1. 刘俊松, 陈晓敏, 杜为平, 林少沂, 王健, 崔翰斌. 心房颤动患者左心房血栓脱落致急性心肌梗死一例. 中华心血管病杂志.
   2014;42(6):527-528. doi:10.3760/cma.j.issn.0253-3758.2014.06.020. Available from: https://rs.yiigle.com/cmaid/33790
2. Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur
   Heart J. 2023;44(38):3720-3826. doi:10.1093/eurheartj/ehad191
3. Rao SV, O'Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI guideline for the management of patients with
   acute coronary syndromes: a report of the American College of Cardiology/American Heart Association Joint Committee
   on Clinical Practice Guidelines. Circulation. 2025;151(13):e771-e862. doi:10.1161/CIR.0000000000001309
4. Mills NL, Newby LK, Zaman S, et al. Fifth universal definition of myocardial infarction (2026). Eur Heart J.
   2026;47(40):5911-5958. doi:10.1093/eurheartj/ehag101
5. Thygesen K, Alpert JS, Jaffe AS, et al. Fourth universal definition of myocardial infarction (2018). Eur Heart J.
   2019;40(3):237-269. doi:10.1093/eurheartj/ehy462
6. 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 急性ST段抬高型心肌梗死诊断和治疗指南(2019). 中华心血管病杂志.
   2019;47(10):766-783.
7. Van Gelder IC, Rienstra M, Bunting KV, et al. 2024 ESC Guidelines for the management of atrial fibrillation developed
   in collaboration with the European Association for Cardio-Thoracic Surgery (EACTS). Eur Heart J.
   2024;45(36):3314-3414. doi:10.1093/eurheartj/ehae176
8. 中华医学会心血管病学分会, 中国生物医学工程学会心律分会. 心房颤动诊断和治疗中国指南. 中华心血管病杂志.
   2023;51(6):572-618.
9. Shibata T, Kawakami S, Noguchi T, et al. Prevalence, clinical features, and prognosis of acute myocardial infarction
   attributable to coronary artery embolism. Circulation. 2015;132(4):241-250. doi:10.1161/CIRCULATIONAHA.114.015134
10. Jolly SS, Cairns JA, Yusuf S, et al. Randomized trial of primary PCI with or without routine manual thrombectomy. N
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
ref 3 is the string the library's editorial reviews verified on 2026-10-28; refs 6, 8 and 10 carry no DOI because none was verified.

**Review checks (2026-11-13, web searches; secondary sources where the primary text was not retrieved).** ESC 2023
ACS: IV beta-blockers at presentation are considered (IIa) only with no signs of acute heart failure and SBP > 120 mmHg
(a secondary summary — the case had "without hypotension or acute heart failure"; corrected); routine aspiration
not recommended and OCT preferred (IIb) for ambiguous culprit lesions; AF with ACS: triple therapy up to 1 week, then
a NOAC with clopidogrel, antiplatelets stopped at 12 months (ESC Essential Messages). 2025 ACC/AHA ACS: routine
aspiration class 3 (no benefit); nitrates avoided in hypotension or RV infarction (secondary summaries). The Fourth
UDMI's V3R/V4R ≥ 0.05 mV (≥ 0.1 mV in men under 30) — confirmed from an excerpt; the **Fifth Universal Definition of
MI** (ESC/ACC/AHA/WHF) was published in August 2026 and replaces the Fourth — its ECG wording was not retrieved (To
verify). ESC 2024 AF Essential Messages: bleeding-risk scores not to decide on starting or withdrawing anticoagulation;
antiplatelets not added to anticoagulation for stroke prevention (except after an acute vascular event); CHA₂DS₂-VA
≥ 2 → anticoagulation, prior stroke/TIA/arterial thromboembolism 2 points, vascular disease 1 point. Shibata 2015:
definite (≥ 2 major, 1 major + ≥ 2 minor, 3 minor) and probable (1 major + 1 minor, 2 minor), major criterion 1 is
"embolism and thrombosis without atherosclerotic components" (corrected from "or"). Half-dose tenecteplase from 75
years (STREAM; the ESC dosing table — the 2023 table itself not retrieved). Not confirmed in review: the verbatim
ESC 2023 ACS §4.2.2.2 text on nitrates and the Chinese STEMI guideline's (2019) right-ventricular paragraph (both kept
on the strength of the earlier checks above; To verify).

**Review round 2 checks (2026-11-14, in the sources' own text).** Fifth UDMI (OUP full text, §13): "A right
ventricular myocardial infarction is indicated by ST-segment elevation in the right precordial leads (V3R–V6R)", with
no separate cut-point; citation Eur Heart J 2026;47(40):5911-5958, doi:10.1093/eurheartj/ehag101. Chinese STEMI
guideline 2019 (the publisher's HTML): V4R ≥ 0.1 mV and the 18-lead ECG in every inferior STEMI; 维持有效的右心室前负荷，
避免使用利尿剂和血管扩张剂; early reperfusion in RV infarction; no nitrates with SBP < 90 mmHg or suspected RV infarction
(Ⅲ, C); 再灌注治疗不存在年龄限制，尤其是直接PCI. ESC 2023 ACS (OUP full text to §7.2): V3R/V4R in inferior STEMI (§3.2.1);
nitrates not with hypotension or RV infarction (§4.2.2.2); morphine slows oral antiplatelet absorption (§4.2.2.3); IV
beta-blocker only with SBP > 120 mmHg and no acute heart failure (§4.2.2.4); primary PCI preferred within 120 min of the
ECG diagnosis (§5.2.1); fibrinolysis not delayed for biomarkers (§5.3.1.1); Table 6 (aspirin 150–300 mg, clopidogrel
300–600 mg, UFH 70–100 U/kg at PCI); GP IIb/IIIa inhibitors for bail-out (§6.1.3); < 24 h invasive strategy for NSTE-ACS
(§6.2.2); AF with ACS — up to 1 week of triple therapy, then a NOAC with clopidogrel, antiplatelets stopped at 12 months,
dual therapy in medically managed ACS, no prasugrel or ticagrelor in triple therapy (§6.5.1). Its §9 recommendation
tables, beyond the HTML text, were read in the Polish Cardiac Society's official translation: routine thrombus
aspiration not recommended (III, A), aspiration considered for a large thrombus burden after the wire or balloon;
intravascular imaging to guide PCI (IIa, A) and, preferably OCT, for ambiguous culprit lesions (IIb, C); additional
leads V3R, V4R and V7–V9 in inferior STEMI (I, B); half-dose tenecteplase over 75 (IIa, B). ESC 2024 AF (OUP full text
to §6.5): anticoagulation recommended from CHA₂DS₂-VA 2; DOACs first-line, avoided with mechanical valves or
moderate–severe mitral stenosis; antiplatelets no alternative; combinations only in selected acute vascular disease; no
inappropriate dose reduction; the apixaban table; S (stroke, TIA or arterial thromboembolism) 2 points, V (prior MI) 1
point. Not reachable: ESC 2024 AF §6.7 (bleeding scores) and §9.2 (AF with ACS) — the case now teaches the bleeding-score
point without the guideline's name and attributes the AF-with-ACS durations to ESC 2023 ACS.

**Review round 3 checks (2026-11-14, in the sources' own text).** Fifth UDMI (OUP full text): §13 and Table 5 re-read
— right precordial ST elevation (V3R–V6R) indicates RV infarction, Table 5 takes ≥ 1 mm in every lead other than
V2–V3, no separate right-sided cut-point. Chinese STEMI guideline 2019 (publisher's HTML): 右胸前导联（尤其是V4R导联）ST段
抬高≥0.1 mV高度提示右心室梗死; 18 leads in every inferior STEMI; 维持有效的右心室前负荷，避免使用利尿剂和血管扩张剂; 再灌注治疗不存在
年龄限制，尤其是直接PCI; no nitrates with SBP < 90 mmHg or suspected RV infarction (Ⅲ, C); reperfusion not delayed for
markers; UFH 70–100 U/kg to an ACT of 250–300 s, **50–70 U/kg with a GP IIb/IIIa inhibitor to 200–250 s (Ⅰ, B)** —
the source of the dose text's GPI dose, now cited in it. ESC 2023 ACS (OUP HTML): §3.2.1 V3R/V4R in suspected
inferior STEMI; Figure 4 footnote (hs-cTn not required for the initial emergency management of a working diagnosis of
STEMI); §4.2.2.2–4; §5.1/5.2.1 (120 min); §5.3.1.1 "halving the dose of tenecteplase in patients > 75 years of age"
(the case had "from 75", now "over 75"); Table 6 UFH "70–100 U/kg i.v. bolus or according to ACT" with no GPI row;
§6.1.3; §6.5.1, including DAT with one antiplatelet (usually clopidogrel) for at least 6 months in medically managed
patients. Its older-adults section (§12.3.4.1) is beyond the HTML: learning outcome 1's "without letting her age delay
it" had carried "(ESC 2023 ACS)" — it now names the Chinese guideline that says it. 2025 ACC/AHA ACS (the publisher's
PDF): Table 10 UFH to support PCI 70–100 U/kg to an ACT of 250–300 s (no GPI dose); §7.2 routine manual aspiration
before PCI "3: No benefit" (LOE A); nitrates avoided in suspected RV infarction or SBP < 90 mmHg. ESC 2024 AF (OUP HTML,
§6.3): antiplatelets "are not an alternative to OAC"; combinations only in selected acute vascular disease. Its §6.7
("Bleeding risk factors are rarely a reason to withdraw or withhold OAC in eligible patients") was read only as
reproduced verbatim on a secondary site — still taught without the guideline's name.

**Review round 4 checks (2026-11-14, in the sources' own text where reachable).** Fifth UDMI (OUP full text, Eur Heart J 2026;47(40):5911-5958, online 28 August 2026): §13 "A right ventricular myocardial infarction is indicated by ST-segment elevation in the right precordial leads (V3R–V6R)", with no numeric right-sided cut-point (the general table: ≥ 1 mm in two contiguous leads other than V2–V3). ESC 2024 AF (OUP HTML, §6.1–6.3): anticoagulation recommended from CHA₂DS₂-VA 2 and considered at 1; antiplatelets "not an alternative to OAC"; combining them with anticoagulants "should only occur in selected patients with acute vascular disease"; DOACs avoided with mechanical valves or moderate–severe mitral stenosis; inappropriate DOAC dose reductions "need to be avoided". The Chinese STEMI guideline (2019) could not be reached again this round (the DOI link returns 404 and searches return secondary pages): its statements stand on round 3's reading of the publisher's text and are re-listed below. The case attributes no new statement to any guideline in this round.

### To verify

**In the source article (the details 1.0.0 does not give):**

- The presenting ECG: its time, rhythm (AF or another rhythm) and ventricular rate, AV conduction, reciprocal changes,
  posterior leads, Q waves; whether the heart rate of 62/min is the ECG or the pulse rate; whether the BP and heart rate
  were taken on arrival or later on admission (1.0.0: "admission observations"); when the right-sided leads were taken;
  any post-procedure ECG.
- The RCA segment (proximal, mid or distal) given the V3R–V5R elevation; dominance; right-ventricular branch
  involvement; the LAD and LCx (the Shibata minor criterion); TIMI flow after aspiration; the aspirate and any
  histology; antiplatelet loading, heparin and any GP IIb/IIIa inhibitor; the access route.
- IVUS detail (plaque burden, minimal lumen area, dissection or haematoma); whether OCT was considered; whether the IVUS
  was done after the aspiration (the `post-aspiration` phase assumes so).
- The day-3 echo: whether it was transthoracic or transoesophageal (1.0.0 says only 超声 / echocardiography); left
  atrial size; the echo's size, mobility and exact site (free wall or appendage); mitral and other valves (DOAC
  eligibility); right-ventricular size and function; any LV thrombus; any TEE, CT or follow-up imaging;
  the authors' differential (myxoma).
- Troponin I and BNP: sampling times (admission, peak or later), the analyte (BNP or NT-proBNP) and reference ranges;
  the unit of the troponin reference; reference ranges for INR and creatinine; blood count, liver tests, electrolytes.
- Treatment: warfarin dose and INR target; heparin type and dose and the anchor of "day 6"; aspirin dose and duration;
  the "corresponding medicines" for heart failure and whether and when perindopril and amlodipine were resumed; the discharge
  regimen; length of stay; complications; follow-up.
- History: chest-pain character, radiation and severity; dizziness, breathlessness, nausea; stroke/TIA, diabetes,
  bleeding history, kidney or liver disease, alcohol, falls, weight; whether she was ever anticoagulated during five
  years of AF, and why she took no antithrombotic;
  how she reached hospital and any treatment before arrival; any relative.
- The authors' discussion: the criteria they used for coronary embolism, why they aspirated and did not stent, what
  "embolus migration not directly observed" refers to, their antithrombotic recommendation.
- The content and caption of `fig01`, so that its title can name its panels.

**In the guidance (still to check in the primary text):**

- ESC 2024 AF §6.7 (bleeding-risk scores not used to start or withdraw anticoagulation — taught without the guideline's
  name since round 2) and §9.2 / its AF-with-ACS recommendations (aspirin stopped within a week, OAC with clopidogrel up
  to 12 months, then OAC alone — attributed to ESC 2023 ACS §6.5.1, which holds them).
- ESC 2023 ACS: the English wording of the §9 recommendations read here in the Polish Cardiac Society's official
  translation (routine aspiration III A; OCT for ambiguous culprits IIb C; additional leads I B; half-dose tenecteplase
  — its §5.3.1.1 text says "> 75 years"); whether it says anything specific about right-ventricular infarction beyond
  nitrates; its older-adults recommendations (§12.3.4.1, not in the HTML), before "age is no reason to delay primary
  PCI" is credited to it again.
- The UFH dose text's 50–70 U/kg with a GP IIb/IIIa inhibitor: resolved in review round 3 — the Chinese STEMI guideline
  (2019) states it (Ⅰ, B) and the dose text now cites it; ESC 2023 Table 6 and 2025 ACC/AHA Table 10 do not list it. Round 4 could not reach the publisher's text again: re-read the Chinese guideline's anticoagulation and right-ventricular paragraphs at the source pass.
- ESC 2012 STEMI's class IIa for routine aspiration (historical; checked in round 1 by web search only).
- Shibata 2015: the criteria's exact wording in the Circulation article (its page was not reachable; the structure is
  confirmed by copies and reviews).
- Chinese AF guideline (2023): its stroke-risk score (CHA₂DS₂-VASc-60?) and DOAC wording — cited here without a specific
  claim; and whether a newer Chinese AF management guideline (2025) supersedes it.
- ACC/AHA/ACCP/HRS 2023 AF (listed in `provenance.review.guidelines`): page range of the Circulation version
  (149(1):e1-e156).
- Whether any guideline cited here has a newer edition as of 2026-11 (the Fifth UDMI appeared in August 2026).

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the presenting complaint is
  split into presentation, onset, pain now and sweating; the "ECG and admission observations" record becomes the
  admission vital signs (exam), the 12-lead ECG and the right-sided leads; the angiography record becomes the
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
  complaint, triage handover with the admission vital signs, four presenting-feature tags, topic tags; specialties
  cardiology, emergency medicine and clinical pharmacology; estimated time 30 → 40 min.
- **Governance.** Review status and notes in the STANDARD §6.6 wording (the English last sentence reads "The case is
  not yet reviewed by a licensed clinician." because the collection contract matches that phrase case-sensitively);
  `sourceTextChecked: false`; `authorChecks` and `sourceTextSha256` removed until the source pass; `sourceDoi` +
  `doiVerifiedAt` added; the media statements reconciled with the approved `fig01`.

- **Independent review (2026-11-13), fixes within 1.1.0.** (1) *Invented fact removed:* the day-3 echo had been
  called transthoracic (经胸) in its name, result, decision 5, the day-3 phase and objective, and learning outcome 4;
  1.0.0 records only 超声 / echocardiography — now "echocardiogram", with the modality listed as not recorded (record
  note, TEE record, unknowns, To verify). (2) *Safety outcome:* GTN, IV furosemide (acute phases) and IV metoprolol
  `critical: true`; tenecteplase, stent, triple therapy and DAPT-instead-of-OAC `critical: false` (the three strict
  warnings are gone); IV furosemide given while contraindicated is now scored in `rb-no-preload-drop`
  (`valid: false`). (3) *Spoilers:* objective titles 4–6, listed in the journal from the start, no longer name the
  catheter laboratory, the thrombus, the stent or the procedure; objective 3's guidance no longer lists fluid before
  decision 2; objective 4's hint no longer names the thrombus or the answer; the ED echo placeholder no longer
  mentions a procedure. (4) *Guidance accuracy:* the IV beta-blocker criterion (ESC 2023 ACS: no signs of acute
  heart failure, SBP > 120 mmHg); the 24-hour early invasive strategy (high-risk NSTE-ACS, not STEMI); Shibata major
  criterion 1 ("and", not "or"); half-dose tenecteplase from 75 years; apixaban never reduced for age alone; the
  Fifth UDMI (2026) acknowledged. (5) *Decision 5:* her valves are not recorded — the prompt, the key's feedback, the
  DOAC response and the pharmacist now ask for mitral stenosis to be excluded before a DOAC. (6) *Timing:* the
  anticoagulant counts, and opens the outcome phase, only when prescribed after the procedure (`whenIndicated`;
  `maxDoses: 2` so an early prescription can be repeated in its window). (7) *Fidelity and language:* 大汗淋漓 → 大汗
  (1.0.0); the English conclusion now states the heart-failure course, the absent plaque rupture and the unobserved
  migration like the Chinese one; "the real problem" and "has already caused an arterial embolism" softened to
  the probable mechanism; the score table re-measured.

- **Review round 2 (2026-11-14), fixes within 1.1.0.** (1) *Facts back to 1.0.0's level:* "serum" creatinine →
  creatinine and "left-ventricular" walls → inferior and posterior walls (specimen and chamber not recorded); troponin I
  and BNP taken out of the day-3 echo sentence (sampling times not recorded); the ECG no longer called the "arrival"
  tracing (its time is not recorded); "I keep sweating" → heavy sweating without constancy; the English debrief's
  "sweating" → heavy sweating and "lungs without crackles" → without wheeze or crackles; decision 2 gives the arrival
  pressure as such; the echo's recorded free-wall site no longer listed as unknown; the outcome record no longer adds
  "dislodgement" to what was not observed or a simultaneity to the heart-failure medicines; the conclusion's diagnosis
  agrees with the key reasoning (definite by the Shibata criteria once the atrial echo is its source); the presenting
  complaint says since when; the nurse no longer calls the recorded past history unrecorded; the aspirin and
  fibrinolysis responses say what is not recorded instead of "records no". (2) *Guidance:* the Fifth Universal
  Definition of MI (2026) and the Chinese STEMI guideline's ≥ 0.1 mV (V4R) replace the Fourth UDMI's ≥ 0.05 mV as
  current; "no age limit on reperfusion" attributed to the Chinese guideline, which says it; the 120-minute ESC framing
  in the CT and transfer texts; the IVUS/OCT wording; Shibata major criterion 3 completed; CHA₂DS₂-VA after the event
  ≥ 4 (6 if the embolism counts); the dissection feedback's attribution; ESC 2024 AF co-citations without primary-text
  support softened (bleeding scores; AF-with-ACS durations now ESC 2023 ACS); ACC/AHA 2025 dropped from the aspiration
  teaching point; the UFH dose text left as the case's own. (3) *Assessment:* a transfer before the activation call and a
  DOAC or warfarin started before or during the procedure are contraindicated with harm texts and cost `rb-ed-support`
  (both cost nothing before); decision 5's `warfarin-plus-aspirin` feedback no longer quotes the outcome record; aliases
  naming CK-MB panels or NT-proBNP removed from the troponin and BNP orders. (4) *Matcher:* prefix-wildcard keywords
  removed, plain questions that reached the wrong item or none fixed, `status-day3` supersedes `breathless`; 39 → 57
  test utterances. (5) *README:* synced (learning outcome 1, decision 2, rubric, measured scores, numbers check,
  references, checks, To verify, validation path `scripts/case-check.ts`).

- **Review round 3 (2026-11-14), fixes within 1.1.0.** (1) *Facts back to 1.0.0's level:* the BP and heart rate are
  1.0.0's "admission observations" (入院观测), no longer "on arrival" / 到院 (triage note, vital-signs finding, ECG note,
  decision prompts, GTN and metoprolol harms, decision 3's `defer-48h` feedback, outcome record, conclusion, nurse,
  provenance, teaching point 1, this guide); the unknowns no longer presuppose "five years of AF without anticoagulation" (1.0.0 records only that she took
  no antithrombotic) nor an "arrival" ECG; the hold response no longer presupposes a restart; the persona's unrecorded
  "weak voice" (有气无力) became speech broken by the pain; teaching point 5's CHA₂DS₂-VA "6" became "at least 6", and
  teaching point 6 ties heparin cover for warfarin to her recent embolism instead of stating it as a general rule.
  (2) *Guidance:* learning outcome 1 credited "without letting her age delay it" to ESC 2023 ACS, whose older-adults
  text was not reachable — now to the Chinese STEMI guideline (2019), which says it; the tenecteplase dose text follows
  ESC 2023 §5.3.1.1 ("over 75"); the UFH GPI dose (50–70 U/kg) now cites the Chinese guideline that holds it (To verify
  item closed); decision 4's key feedback no longer gives OCT's resolution as ESC's words. (3) *Assessment:* the ED
  acts scored in `rb-ed-support` (monitoring, holding, fluid, aspirin) and the UFH bolus in `rb-cath-strategy` count only
  in their windows (`whenIndicated`), so giving them on day 3 no longer earns them; replays re-measured (table above).
  (4) *Orders and matcher:* honest no-result records for posterior leads (V7–V9: the Chinese guideline's 18-lead ECG)
  and OCT (the key names it), with order rules; plain questions that reached the wrong item or none fixed (Matcher
  notes); 57 → 70 test utterances. (5) *README:* synced (case card, learning outcome 1, timeline, rubric, scores,
  numbers check, PEARLS, fidelity, matcher notes, checks, To verify, validation, 中文摘要).

- **Review round 4 (2026-11-14), fixes within 1.1.0.** (1) *Assessment:* a DOAC or warfarin started in the laboratory after aspiration (before decision 4, the echo, her weight and valves) earned the critical `rb-anticoagulation` (26/26) although both harm texts and this guide said no oral anticoagulant before or during the procedure — the window is now day 3 only and such a start costs `rb-ed-support` (24/26); the reference path no longer orders a TEE (oesophageal history unknown, nothing needs it). (2) *In-world:* the standard ED loading order ("aspirin and clopidogrel", "aspirin 300 mg and clopidogrel 600 mg", "DAPT load", 双抗负荷) resolved to the always-contraindicated "aspirin plus clopidogrel instead of an anticoagulant" and lost the critical item for good — it now offers the two loading doses; the harmful regimen and triple therapy need their own words; "balloon" no longer places a stent; 12 plain history or examination questions that reached the wrong item or none fixed; 70 → 77 test utterances. (3) *Facts and language:* English "untreated AF" (learning outcome 4, decision 4's feedback, the conclusion, key reasoning 4, teaching point 2, this guide) said more than 1.0.0's "no antithrombotic" and than the Chinese 未抗凝 — now "AF without anticoagulation"; the day-3 phase's "blood results" → laboratory results (specimen not recorded); the outcome record's date no longer anchors "the first 10 days" to admission. (4) *Teaching:* warfarin's INR 2.0–3.0 is the AF target (a mechanical valve has its own), heparin cover tied to her recent embolism in the pharmacist's brief too; teaching point 5 no longer calls the embolism "probable" where the debrief has made it definite; the CT distractor's feedback no longer reads unrecorded dissection clues as absent (look for them); the UFH response notes that her weight is not recorded. (5) *Guidance:* the Fifth UDMI's §13 and ESC 2024 AF §6.1–6.3 re-read in their own text; the Chinese STEMI guideline was not reachable this round (To verify). (6) *README:* synced (card, learning outcome 4, diagnosis, timeline, rubric, scores, timing, learner errors, reference path, numbers, embodied, matcher notes, checks, To verify, validation, 中文摘要).

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, 2 examination
  findings, 5 record reviews, 3 decisions, 11 rubric items (10 deterministic) and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-33790/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33790 --lang en                                                 # 70 steps · objectives 6/6 · decisions 5/5 · utterances 77/77 · rubric 26/26 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-33790                                       # depth floor, do-nothing 0, wrong-first 42 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33790:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33790:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-10-30, again on 2026-11-13 after the first review's fixes, and on 2026-11-14 after review rounds 2, 3 and 4: all five pass (strict validation 0 errors, 0 warnings; before the first review it reported the three unset `critical`
flags; before round 2 `case-check` failed on plain openers that reached nothing).

## 中文摘要

**病例概要。** 80岁女性，高血压 10 年、心房颤动 5 年，平时服培哚普利和氨氯地平，未用任何抗栓药。胸痛 6 小时不缓解伴面色
苍白、大汗来急诊，入院血压 88/62 mmHg、心率 62 次/分，双肺未闻及干湿啰音。心电图Ⅱ、Ⅲ、aVF 导联 ST 段抬高 0.15–0.2 mV，
右胸导联 V3R–V5R 抬高 0.1 mV——下壁 ST 段抬高型心肌梗死合并右心室受累和低血压。急诊冠状动脉造影示右冠状动脉远段大量血栓、
TIMI 1 级；血栓抽吸后管壁光滑、无明显狭窄，血管内超声内膜完整、无斑块破裂，未放支架。术后第 3 天超声心动图：左心房增大，
游离壁回声考虑血栓，下壁、后壁运动减弱，LVEF 55%；肌钙蛋白 I 94.12 μg/L，BNP 3981.2 ng/L（采血时间未记录）。记录中用
华法林加过渡期肝素（第 6 天 INR 2.3 后停肝素）并加阿司匹林；前 10 天有心衰症状，随后好转。诊断：未抗凝房颤患者左心房血栓
栓塞冠状动脉所致急性心肌梗死（以左心房回声为栓子来源时按 Shibata 标准可确诊；栓子迁移未被直接观察到）。心电图节律、体重、瓣膜、超声心动图的检查方式（经胸还是
经食管）、其他冠状动脉、药物剂量和远期结局均无记录。本版依据 1.0.0 版提取的事实改写，尚未对照原文全文核对。

**学习目标。**

1. 根据下壁导联和右胸导联 ST 段抬高识别下壁心肌梗死合并右心室受累（第五版心肌梗死通用定义，2026；中国 STEMI 指南 2019：≥ 0.1 mV，尤其 V4R），立即
   直接 PCI（ESC 2023 ACS），不因高龄推迟（中国 STEMI 指南 2019：再灌注治疗不存在年龄限制）。
2. 右心室受累合并低血压、双肺清晰时不用硝酸酯、利尿剂、其他扩血管药和静脉 β 受体阻滞剂，暂停降压药，分次补液维持前负荷。
3. 说明常规血栓抽吸为何不再推荐（ESC 2023 ACS Ⅲ类；TASTE、TOTAL），以及何时选择性抽吸并在定支架前做腔内影像。
4. 依据 Shibata 标准（2015）诊断冠状动脉栓塞，说明 IVUS 与超声心动图（经胸与经食管）的局限，并决定不放支架。
5. 为房颤相关栓塞性心肌梗死制订抗凝方案：CHA₂DS₂-VA 评分、DOAC 优先、按说明书定剂量、抗血小板最多一种且限期（ESC 2024 AF；ESC 2023 ACS）。
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
- 决策 5（长期抗栓）：按说明书剂量开始 DOAC（先称体重、核对肾功能，并在超声上确认没有机械瓣或中重度二尖瓣狭窄——体重和瓣膜
  都没有记录），不用双联抗血小板；干扰项包括抗血小板代替抗凝、暂用阿司匹林等经食管超声、记录中的华法林加长期阿司匹林、
  12 个月三联治疗。

**复盘要点（PEARLS）。** 先谈护士问要不要给 88/62 mmHg 的患者含服硝酸甘油时的感受；用四句话复述急诊和导管室的经过；分析右胸
导联对每一种药物选择的意义、为何不溶栓也不等肌钙蛋白、抽吸是常规还是针对这处血栓的选择、抽吸后血管正常意味着什么以及
IVUS 不能告诉我们什么、远段血栓与右胸导联抬高的矛盾、她这次之前的卒中风险评分、“考虑血栓”有多可靠、今天会怎样选药定量，
以及怎样回应她对出血的担心；总结下次遇到高龄房颤患者要查什么。评分：确定性总分 26 分，三项关键项（首次作答即选直接 PCI
并实际启动导管室、不溶栓；不给硝酸甘油、利尿剂或静脉美托洛尔；首次作答即以口服抗凝为核心并在术后实际开始抗凝、不以抗血小板替代或三联
治疗），沟通项由考官评判。记录中的处置（华法林加肝素过渡并加阿司匹林）只作为历史对照，不代表现行推荐。本病例经人工智能
辅助编辑审核（第二、三、四轮审核 2026-11-14；第三轮把血压心率改回“入院时”、改正学习目标 1 的指南归属、把急诊处置和肝素的计分限定在应做的时段，并补充后壁导联与 OCT 的无结果记录；第四轮把口服抗凝的计分时段限定在术后第 3 天、导管室内开始同样扣分，使“阿司匹林和氯吡格雷”这类负荷医嘱不再被识别为“以双抗代替抗凝”，把经食管超声移出参考路径，英文“untreated AF”改为与中文一致的“未抗凝”，并补充了 12 种病史和查体问法），尚未经执业医师审核；待核实事项见上文 “To verify”。

**安全结果。** 舌下含服硝酸甘油、急性期静脉推注呋塞米和静脉注射美托洛尔标为 `critical: true`——低血压、依赖前负荷的右心室
梗死中给药即判定安全结果不合格；溶栓、未经影像评估的支架、以双联抗血小板代替抗凝和 12 个月三联治疗标为 `critical: false`
（可由后续医生纠正的错误，由关键评分项扣分）。转运前未启动导管室、术前或术中开始 DOAC 或华法林属中度风险的时机错误，由
`rb-ed-support` 扣分，不判定安全结果不合格。
