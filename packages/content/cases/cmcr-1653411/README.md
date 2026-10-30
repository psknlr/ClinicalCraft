# cmcr-1653411 — Persistent chest pain · 68-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 劉書雷, 柯于梵, 劉紅. 右束支傳導阻滯影響急性心肌梗死心電圖判讀.
鏡湖醫學. 2025;25(2):58-59. Version 1.1.0 re-authors the case to the clinical content standard **from the facts that
version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet been
checked against the full source article** (STANDARD §6). The patient (华知远 / Hua Zhiyuan) is a pseudonym; the ED nurse
(芮护士 / Nurse Rui), the attending (邝医生 / Dr Kuang) and the interventional cardiologist (靳医生 / Dr Jin) are invented
teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-1653411` / `1.1.0` |
| setting / facility | `emergency` / `general-hospital` (ED resus bay) |
| specialty | cardiology, emergency medicine |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language; the report is in traditional Chinese), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a cardiologist or emergency physician review it before teaching use |
| phases | `arrival` 急诊到院 / Arrival in the emergency department → `course` 到院后的记录病程 / The recorded hours after arrival → `cath-week` 急诊造影与此后 1 周 / Emergency angiography and the following week (on the ward) → `followup` 记录的结局 / Recorded outcome — all one-way, none learner-switchable |
| content | 22 history items (6 recorded facts, 1 labelled teaching device, 15 unknown; 8 required) · 0 exam findings (none recorded) · 10 investigations (4 record reviews; 5 without a recorded result) · 13 interventions (4 harmful, 2 neutral) · 6 objectives · 4 decisions (20 options) · 12 rubric items (11 deterministic, weight 24; 1 examiner-judged; 2 critical) · 3 staff · 6 learning outcomes · 5 teaching points · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. From a reported ECG, distinguish primary from secondary ST–T change in right bundle branch block, recognising ST
   elevation with upright T waves in V1–V3 as acute injury rather than the block's own repolarisation (Fourth
   Universal Definition of MI, 2018).
2. Start a primary PCI strategy at once for ongoing ischaemic pain with ST elevation in RBBB, without waiting for
   troponin, an old ECG or a coronary CT (ESC 2023 ACS).
3. Give the immediate care for suspected acute coronary occlusion — continuous ECG monitoring with a defibrillator,
   aspirin 150–300 mg, unfractionated heparin 70–100 U/kg at PCI, oxygen only if SpO₂ is below 90 % — and explain why
   fibrinolysis is not chosen when primary PCI is possible within 120 minutes (ESC 2023 ACS).
4. Interpret serial ECG evolution (spreading ST elevation, T-wave inversion, new QS complexes) and recurrent pain as
   very-high-risk features, and explain why neither a CT stenosis grade nor Q waves justify delaying invasive
   angiography (ESC 2023 ACS).
5. Plan discharge after a large anterior infarct — in-hospital echocardiography, 12 months of dual antiplatelet
   therapy, an LDL-C target below 1.4 mmol/L — and explain why isolated persisting RBBB needs no pacemaker (ESC 2023
   ACS; ESC 2021 pacing).
6. Explain why, without a baseline ECG, the RBBB cannot be called new, and why a single case cannot measure the
   myocardium lost to delay.

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list. Outcome 1 is worded for the **written ECG report**: every figure of the
report is withheld (see Source and adaptation), so the case teaches interpretation of reported findings, not reading of a
tracing.

## Clinical summary (spoilers)

**Presentation.** A 68-year-old man arrives with chest pain that began five hours earlier and has not eased, with chest
tightness. Nothing else about him is recorded: no vital signs, examination, past history, medicines or allergies.

**First ECG** (shown at arrival; its time is not recorded). Right bundle branch block (RBBB); ST elevation in V2–V3 with
a non-convex contour and **upright T waves**; Rs complexes in V4–V6. In RBBB the block's own (secondary) repolarisation in V1–V3 is ST depression with T-wave
inversion, opposite to the terminal R′; ST elevation with upright T waves there is a **primary** change — acute
anterior injury that the block does not explain. No earlier ECG is recorded.

**The recorded course.** The ECG was repeated: **two hours later** ST elevation in **V1–V3** with **T-wave inversion in
V2** (1.0.0 does not say two hours after what); later **QS in V4** and falling R waves in V2–V3 and V5–V6, evolving
further as his symptoms worsened. **Troponin T and CK-MB were markedly raised** (no values recorded). A **coronary CT**
in his record (when it was done, and whether during this admission, is not recorded) reported **moderate-to-severe
proximal LAD** and mild-to-moderate mid-circumflex stenosis. His chest tightness worsened and the pain kept coming back; **after the
symptoms recurred**, emergency coronary angiography showed a **subtotal occlusion of the proximal LAD**, which was
**stented**. **One week after the procedure** the ECG still showed RBBB with **QS in V2–V4 and rS in V5**, described as an
extensive infarction pattern. Nothing later is recorded.

**Diagnosis.** Acute anterior myocardial infarction from a proximal LAD culprit (subtotal occlusion), presenting as ST
elevation in the presence of RBBB.

**Today's answer (ESC 2023 ACS).** Ongoing ischaemic pain with ST elevation that the RBBB cannot explain calls for a
primary PCI strategy on the first tracing: catheter-laboratory activation, monitoring with a defibrillator, aspirin and
heparin, and no wait for troponin, an old ECG or a CT. Even read as NSTE-ACS, recurrent pain with dynamic ST changes is a
very-high-risk indication for immediate (< 2 h) angiography. The recorded course — hours of repeat ECGs, a coronary CT,
angiography only after the pain recurred — is the historical contrast the debrief draws.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the recorded one. There is
  no monitor baseline: the monitoring step's response says the readings are not recorded.
- **Four one-way phases** (none learner-switchable; records read in an earlier phase stay readable by phase):
  - `arrival` — the history in his own words (recorded: chest pain, five hours, still present, chest tightness; the rest
    unknown), the **first ECG** (bedside order; shown at arrival, its time is not recorded), the search for an **earlier
    ECG** (record: none recorded), decisions 1 and 2, the immediate care and a **committed reperfusion act**. Orders of
    the markers, CT record, catheter-laboratory record, echo, chest film and bloods answer honestly that nothing is
    recorded at this point.
  - `course` — opens once the history objective, decision 1 (with the ECG reads), decision 2 and a reperfusion act are
    done (`enterWhen`: objectives `obj-pain-story`, `obj-first-ecg`, `obj-reperfusion`; the last needs decision 2 right
    and one of the catheter-laboratory call, CT first, admission for later angiography or tenecteplase). From here the
    case follows the recorded course: the **repeat ECGs** (two hours later, and after), the **markers** (markedly raised),
    the **coronary CT report** (when the CT was done is not recorded: showing it here is staging) and his status (phase
    twin `status-course`: tighter, pain returning). Decision 3.
  - `cath-week` — opens once `obj-course` (the reads, his status and decision 3) is done, and moves him to a **ward bed**
    (`location: {setting: "ward"}`, a staging convention — see Embodied mode): the **catheter laboratory record**
    (subtotal proximal LAD occlusion, stent), the **ECG one week after the procedure**, the echo request (no result
    recorded) and decision 4.
  - `followup` — opens once all five earlier objectives (and so all four decisions) are done: the **reported course and
    outcome** record.
- No prompt, hint, order response or harm text states a later phase's result before its record opens. A wrong option's
  feedback may name what the recorded team did once the learner has committed (decision 2: his record includes a
  coronary CT); the feedback on decision 3's key names the angiographic finding, shown as its phase opens.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-pain-story` Take the chest-pain history | presentation, onset, pain now, other symptoms asked |
| 2 | `obj-first-ecg` Record and read the arrival ECG | arrival ECG read; earlier ECG looked for; `ecg-reading` right |
| 3 | `obj-reperfusion` Decide what to do now | `reperfusion` right **and** one reperfusion act made: the catheter-laboratory call, CT first, admission for later angiography or tenecteplase |
| 4 | `obj-course` Review the recorded hours after arrival | his status asked; repeat ECG, markers and CT report read (phase `course`); `course-review` right |
| 5 | `obj-week` Plan the weeks ahead | catheter laboratory record and one-week ECG read; `discharge-plan` right |
| 6 | `obj-outcome` Review the recorded outcome | outcome record read |

The journal lists later objective titles before they are reached, so titles name no finding, test result or treatment.
Hints are Socratic questions that state no result the learner has not obtained and name no diagnosis ("Which changes
can the QRS pattern itself explain, and which can it not?"; "Before he goes home, which assessment of the heart muscle
does he need?"). The objectives require decisions and reads, and `obj-reperfusion` also one **committed reperfusion
act** — the catheter-laboratory call or one of the three diversions (CT first, admission for later angiography,
tenecteplase), as cmcr-70044 gates its recovery phase on an adrenaline act. The recorded course therefore opens only
once the learner has acted on the arrival ECG, and which act is the learner's choice: the critical act is not forced
and can still be missed (by a diversion). Monitoring and the medicines are required by no objective.

### Decisions

- **1 `ecg-reading`** (single; needs the presentation, onset, pain-now, the arrival ECG and the old-ECG search). Key:
  `primary-st-change` — the ST elevation and upright T waves in V2–V3 point the same way as the terminal R′ (a primary
  change), so with the pain still going on treat it as acute anterior injury; why the block's own pattern runs the other
  way is explained in the distractors' feedback, not in the key. Distractors: `secondary-repolarisation` ("the block
  distorts V1–V3"), `early-repolarisation` ("not convex, R waves preserved"), `needs-old-ecg` ("cannot be read until an
  old ECG proves the RBBB new; let troponin decide"), `rbbb-alone-diagnostic` ("a new RBBB equals LAD occlusion").
- **2 `reperfusion`** (single; needs decision 1 and pain-now). Key: `cath-lab-now` — activate the catheter laboratory now
  for angiography and primary PCI, aspirin 150–300 mg chewed, UFH 70–100 U/kg at PCI, monitoring with a defibrillator, no
  wait for troponin. Distractors: `ct-angiogram-first` (CT anatomy before the catheter laboratory; his record does
  include a coronary CT, but when it was done and what he was given meanwhile are not recorded), `serial-troponin`
  (0 h/1 h algorithm first), `fibrinolysis-now` (tenecteplase "faster"), `admit-early-invasive` (CCU, angiography within
  24 h).
- **3 `course-review`** (single; needs decision 2, his status in phase `course`, and that phase's ECG, markers and CT
  report). Key: `angiography-now` — recurrent pain with ST elevation now spreading to V1–V3 shows an anterior infarct
  still in progress: immediate invasive angiography and PCI of the culprit artery. The rebuttals (a CT grade cannot show
  whether thrombus is forming; Q waves do not end salvage) sit in the feedback of `stenosis-not-occlusion` and
  `completed-infarct`, and no option names the angiographic finding before its record. Distractors:
  `stenosis-not-occlusion` (settle him medically and wait; the recorded course resembles it only in that angiography came
  after the pain recurred — no drug treatment is recorded), `spontaneous-reperfusion` (T inversion = reopened, 24 h),
  `completed-infarct` (QS in V4 and falling R waves = too late), `refer-cabg` (two-vessel disease on CT).
- **4 `discharge-plan`** (select all; needs decision 3, the catheter laboratory record and the one-week ECG). Keys:
  `echo-lv`, `dapt-12m`, `statin-ldl`. Distractors: `pacemaker-rbbb` (persisting RBBB), `icd-before-discharge`.

Every option has its own feedback, naming ESC 2023 ACS, the Fourth Universal Definition of MI (2018), the Chinese STEMI
guideline (2019), the Chinese lipid guideline (2023), ESC 2021 pacing or ESC 2022 ventricular arrhythmias. Option ids
name their content. No length cue: the key is the uniquely longest option only in decision 2 (zh-CN), and the uniquely
shortest in none (measured on 2026-10-30: decision 1 key 62 of 59–87 characters in zh-CN, 172 of 168–219 in en;
decision 3 key 55 of 53–78 and 170 of 158–234). Each key gives a reading or plan with one reason, in the same form as
its distractors; no key argues against the other options.

### Rubric (11 deterministic items, total weight 24, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-pain-history` | history | 2 | presentation, onset, pain now, tightness asked |
| `rb-risk-screen` | history | 1 | previous heart disease/ECG, bleeding/surgery/stroke, allergies, medicines asked (all unknown — asking is the competency) |
| `rb-arrival-ecg` | investigations | 2 | arrival ECG read (phase `arrival`) and old ECG looked for |
| `rb-ecg-reading` | diagnosis | 3 | `ecg-reading` right first time |
| `rb-reperfusion` | management | 4 | **critical** — `reperfusion` right first time **and** `activate-cath-lab` given (in phase `arrival`, since the recorded course opens only after a reperfusion act — unless a diversion came first: see the known limits) |
| `rb-immediate-care` | management | 2 | monitoring with defibrillator, aspirin, UFH given (not time-gated: see the known limits) |
| `rb-no-delay` | safety | 3 | **critical** — no `ct-first`, `defer-angiography` or `fibrinolysis`; scored once decision 2 is attempted or the catheter laboratory or any of the three is given |
| `rb-course-records` | investigations | 1 | repeat ECG, markers and CT report read in phase `course` |
| `rb-course-decision` | diagnosis | 3 | `course-review` right first time |
| `rb-discharge` | management | 2 | `discharge-plan` right first time, echo ordered in `cath-week`, secondary-prevention plan given |
| `rb-no-pacing` | safety | 1 | no `pacing-referral`; scored once decision 4 is attempted or the referral made |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: explains the blocked artery despite the "bundle branch block", the urgent angiogram, the drugs' bleeding risk, consent; answers his worry honestly; later explains why no pacemaker |

### How wrong choices score (measured with the reducer on 2026-10-30)

| path | deterministic score | critical items missed |
|---|---:|---|
| reference path (`solution`) | 24/24 (100 %) | none |
| start and do nothing | 0/20 | `rb-reperfusion` |
| wrong first answer at all four decisions, then right | 12/24 (50 %) | `rb-reperfusion` |
| wrong first answer at decision 1 only | 21/24 (88 %) | none |
| wrong first answer at decision 2 only | 20/24 (83 %) | `rb-reperfusion` |
| wrong first answer at decision 3 only | 21/24 (88 %) | none |
| wrong first answer at decision 4 only | 22/24 (92 %) | none |
| reference path without any reperfusion act: the recorded course never opens and the case cannot be finished | 13/23 (57 %) | `rb-reperfusion` |
| "CT coronary angiogram first" instead of the catheter-laboratory call, then the rest of the reference path | 17/24 (71 %) | `rb-reperfusion`, `rb-no-delay` |
| … and the catheter-laboratory call made only after the outcome record | 21/24 (88 %) | `rb-no-delay` |
| reference path plus "CT coronary angiogram first" | 21/24 (88 %) | `rb-no-delay` |
| reference path plus tenecteplase | 21/24 (88 %) | `rb-no-delay` |
| reference path plus admission for angiography within 24 h | 21/24 (88 %) | `rb-no-delay` |
| reference path plus a pacemaker referral | 23/24 (96 %) | none (`rb-no-pacing` lost) |
| reference path without monitoring, aspirin and heparin | 22/24 (92 %) | none (`rb-immediate-care` lost) |
| monitoring, aspirin and heparin given only after the outcome record | 24/24 (100 %) | none (known limit) |
| reference path without the four risk-screen questions | 23/24 (96 %) | none |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The four harmful
interventions are always `contraindicated` (named in the debrief's safety list, each with its own harm text); the
avoided-harm items count only once the harm was possible (`scoredWhen`), so doing nothing earns 0. **Timing of the
critical act (independent review, 2026-10-30).** `obj-reperfusion` needs decision 2 right **and** one reperfusion act
(the catheter-laboratory call, CT first, admission for later angiography or tenecteplase), and the recorded course opens
only on that objective. So, unless the learner has first chosen a diversion, the call that meets `rb-reperfusion` has to
be made in phase `arrival`, on the arrival ECG, before any confirming record; before this fix, a learner could make it
after reading the catheter-laboratory and outcome records and still score 24/24. **Known limits:** the rubric's
conditions carry no time, so (1) a learner who first diverts him (CT first, admission or tenecteplase) and makes the
call only later still meets `rb-reperfusion`, but has already missed the other critical item, `rb-no-delay`; and (2)
monitoring, aspirin and heparin given late (even after the outcome record) still meet `rb-immediate-care`, a
non-critical item. Debrief the order of the acts from the transcript.

### Critical items

`rb-reperfusion` (the missed life-saving act: deciding on immediate angiography on the arrival ECG **and** making the
call, which has to come before the recorded course opens) and `rb-no-delay` (the dangerous error: diverting him to a CT,
an admission or fibrinolysis). Both are acts; neither reads a final-phase record.

## Reference path (`solution`)

52 steps, static clock: start → presentation, onset, pain now → **12-lead ECG** (arrival) → **monitoring with a
defibrillator** → tightness, previous heart disease → **old-ECG search** → `ecg-reading` → allergies, bleeding, medicines →
**aspirin** → **activate the catheter laboratory** → IV cannula and bloods → **UFH** → the rest of the chest-pain and
risk-factor history (character, radiation, severity, trigger, sweating/nausea, breathlessness, palpitations/blackouts,
previous episodes, blood pressure/diabetes/cholesterol, smoking, family history, his worry) → `reperfusion` → (phase
`course`) his status, the repeat ECGs he noticed → repeat ECG, markers, coronary CT report → `course-review` → (phase
`cath-week`) catheter laboratory record → one-week ECG → echo request (no result recorded) → secondary-prevention plan →
`discharge-plan` → (phase `followup`) outcome record → finish. `cases verify` passes: objectives 6/6, decisions 4/4,
rubric 24/24, utterances 40/40. The acts come before decision 2; the recorded course opens once decision 2 is right and a
reperfusion act (here the catheter-laboratory call) has been made.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 68-year-old man | `patient.age`, `sex` | `patient.age`, `sex`; title |
| chest pain for five hours at presentation | `chiefComplaint`; `history.onset` ("lasted five hours when I presented") | `chiefComplaint` (lay words); `history.onset`; `triageNote`; decision 1 prompt |
| pain persisting on arrival | title "持续胸痛 / Persistent chest pain"; `triageNote` "胸痛持续 / Ongoing chest pain" | `history.pain-now` (phase `arrival`); `triageNote` |
| chest tightness | `history.associated` | `history.tightness` (phase `arrival`) |
| later the tightness worsened and the pain recurred | `history.progression` | `history.status-course` (phase `course`, twin of `pain-now` and `tightness`) |
| ECGs were repeated | `history.prior` | `history.ecg-repeated` (phases `course`, `cath-week`) |
| first ECG: RBBB; non-convex ST elevation and upright T waves in V2–V3; Rs in V4–V6 | `investigations.ecg-first` | `investigations.ecg` result `arrival` (labelled "First ECG", its time not recorded) |
| after 2 h: ST elevation V1–V3, T inversion V2; later QS in V4, R waves fell in V2–V3 and V5–V6; further evolution as symptoms worsened | `investigations.ecg-serial` | `investigations.ecg` result `course` |
| cTnT and CK-MB markedly raised; no values | `investigations.markers` | `investigations.markers` result `course` (`values` as text "markedly raised", flag H, "no reference range recorded") |
| coronary CT: moderate-to-severe proximal LAD, mild-to-moderate mid LCx stenosis (no time given) | `investigations.coronary-ct` | `investigations.coronary-ct` (record review) result `course` — staging: dated "time not recorded; shown with the recorded course" |
| emergency angiography after recurrent symptoms: subtotal proximal LAD occlusion, stent | `investigations.outcome` | `investigations.angiography` (record review) result `cath-week`; `investigations.outcome` |
| ECG one week after the procedure: RBBB, QS V2–V4, rS V5, "extensive infarction" | `investigations.outcome` | `investigations.ecg` result `cath-week`; `investigations.outcome` |
| vital signs, baseline ECG, numerical biomarkers, long-term outcome absent | `debrief.unknowns`, `unknowns` | 15 unknown history items; `old-ecg`, `echo`, `renal-electrolytes`, `cbc`, `cxr` (`available: false`); `examNotRecorded`; 7 `unknowns` |

**Times.** Recorded: five hours of pain at presentation; a repeat ECG "after two hours" (1.0.0 does not say after what:
the case writes "two hours later" in both languages and anchors it neither to arrival nor to the first tracing); the ECG
one week after the procedure. Not recorded: the time of the first ECG (shown at arrival, as staging), the times of the
later tracings, the markers and the CT (including whether the CT was done during this admission), and the time from
arrival to angiography. **Derived values:** none — 1.0.0 records no number from which to derive one (no ST amplitudes, intervals,
marker values or vital signs).

**Guidance numbers used in teaching text** (doses as formulas; no patient value is needed): ECG within 10 min of first
medical contact; primary PCI preferred to fibrinolysis when it can be done within 120 min of diagnosis; immediate
invasive strategy < 2 h for very-high-risk NSTE-ACS; primary PCI strategy beyond 12 h with ongoing symptoms; aspirin
150–300 mg orally (75–250 mg IV); ticagrelor 180 mg or prasugrel 60 mg loading; UFH 70–100 U/kg IV (50–70 U/kg with a
GP IIb/IIIa inhibitor); GTN 0.4–0.5 mg sublingually every 5 min up to 3 doses, only with systolic BP ≥ 90 mmHg; oxygen
only if SpO₂ < 90 %; tenecteplase 30–50 mg weight-banded; DAPT 12 months (aspirin 75–100 mg daily with ticagrelor 90 mg
twice daily or prasugrel 10 mg daily); LDL-C < 1.4 mmol/L and ≥ 50 % reduction (ESC 2023 ACS, every ACS patient); the
Chinese lipid guideline (2023) by risk tier — < 1.8 mmol/L for 极高危 (very high risk), < 1.4 mmol/L for 超高危
(ultra-high risk), each with a > 50 % fall — where his tier cannot be set because his risk factors are not recorded;
LVEF re-assessment 6–12 weeks after the infarct. No weight is recorded, so no weight-based dose is computed.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to hold a tracing with a bundle branch block and decide whether to call the catheter
   laboratory?"
2. **Description.** "In two sentences: what did the first ECG show, and what did you do about it?"
3. **Analysis.**
   - "Which way should the ST segment and T wave point in V1–V3 in RBBB? What did you see instead?"
   - "Did the non-convex shape of the ST elevation make you hesitate? How does early anterior infarction often look?"
   - "There was no old ECG and no troponin yet. What would either have changed in your decision?"
   - "Why not tenecteplase here?"
   - "His record includes a coronary CT that called the proximal LAD 'moderate-to-severe'. What does a CT stenosis grade
     tell you, and what can it not tell you? The angiogram later found a subtotal occlusion of the same segment." (when
     the CT was done is not recorded — do not let the group assume the team chose CT first)
   - "At two hours the T wave in V2 inverted. When does T-wave inversion mean reperfusion, and when does it mean
     evolution?" (here the ST elevation persisted and spread — do not let the group call it reperfusion)
   - "QS waves appeared in V4. Does that end the case for reperfusion?"
   - "A week later the RBBB persists with QS in V2–V4. What does he need before discharge — and what does he not need?"
   - "How did you explain the urgent angiogram and its risks, and how did you answer his worry about his heart?"
4. **Summary.** "What will you do the next time ongoing chest pain arrives with an ECG that shows a bundle branch
   block?"

The record gives no times beyond the two-hour tracing; do not let the group quantify the delay or attribute the extent
of the infarct to it (outcome 6).

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Calling the ST–T change "secondary to the RBBB" | `secondary-repolarisation` feedback | `rb-ecg-reading` |
| Dismissing non-convex ST elevation | `early-repolarisation` feedback | `rb-ecg-reading` |
| Waiting for an old ECG or troponin | `needs-old-ecg`, `serial-troponin` feedback | `rb-ecg-reading`, `rb-reperfusion` |
| Over-reading the RBBB itself as diagnostic | `rbbb-alone-diagnostic` feedback | `rb-ecg-reading` |
| CT first (his record includes a coronary CT) | `ct-angiogram-first` feedback; `ct-first` contraindicated | `rb-reperfusion`, `rb-no-delay` |
| Fibrinolysis in a hospital with a catheter laboratory | `fibrinolysis-now` feedback; `fibrinolysis` contraindicated | `rb-reperfusion`, `rb-no-delay` |
| A 24-hour "early invasive" plan for ongoing pain | `admit-early-invasive`, `spontaneous-reperfusion` feedback; `defer-angiography` contraindicated | `rb-reperfusion`, `rb-course-decision`, `rb-no-delay` |
| Choosing the plan but never making the call | no `activate-cath-lab` | `rb-reperfusion` (critical) |
| Reading a CT stenosis as reassurance | `stenosis-not-occlusion` feedback | `rb-course-decision` |
| "Q waves — too late" | `completed-infarct` feedback | `rb-course-decision` |
| Bypass surgery for "two-vessel disease" in an acute infarct | `refer-cabg` feedback | `rb-course-decision` |
| Pacemaker for isolated RBBB; an ICD before discharge | `pacemaker-rbbb`, `icd-before-discharge` feedback; `pacing-referral` contraindicated | `rb-discharge`, `rb-no-pacing` |
| Inventing vital signs, examination findings or results | unknown history items, `examNotRecorded`, `available: false` results, the nurse's brief | — |

### Teaching points for the debrief

The five `debrief.teachingPoints`: (1) read the ST segment in RBBB — primary versus secondary change, morphology does not
exclude occlusion (Fourth UDMI 2018), then and now; (2) act on the first ECG — 10-minute ECG, monitoring, primary PCI
within 120 min over fibrinolysis, aspirin and heparin, nothing gating the decision (ESC 2023 ACS; Chinese STEMI 2019);
(3) recurrent pain with dynamic ST changes is very high risk (< 2 h), and CCTA belongs to low-risk patients — the
coronary CT in his record (its time not recorded) and angiography only after the pain recurred (ESC 2023 ACS); (4)
evolution is not resolution; Q waves do not end salvage; > 12 h with ongoing symptoms (ESC 2023 ACS); (5) after the
infarct — echo, DAPT 12 months, LDL-C < 1.4 mmol/L (ESC 2023; the Chinese 2023 lipid guideline's tiers, < 1.8 or
< 1.4 mmol/L, cannot be applied without his risk factors), rehabilitation; no pacing for isolated RBBB (ESC 2021); ICD
timing after LVEF re-assessment (ESC 2022).

## Embodied mode

- **Where things are (`general-hospital`).** The patient lies in an ED resus bay (`setting: "emergency"`) for `arrival`
  and `course`. Entering `cath-week` moves him to a ward bed (`location: {setting: "ward"}`), where `followup` also
  happens. The ward is a **staging convention**: 1.0.0 does not record where he was after the angiography (a CCU or a
  ward), but a patient a week after his PCI does not lie in the ED resus bay, and CMCR_CASES asks ward phases to carry
  the patient's location (independent review, 2026-10-30). No intervention has a `destination`: the catheter-laboratory
  call is a call, and the angiography itself is a record. The first and repeat ECGs use the resus bay's ECG machine and
  the one-week ECG the ward's (`ecg-12lead`, `performedAt: "bedside"`); the markers are sampled at the patient (or,
  after the cannula, ordered at a records terminal); the echo request needs the ultrasound machine wheeled from
  radiology to the ward (`echocardiography`, `performedAt: "bedside"`) and returns "no result recorded". The four record
  reviews (`old-ecg`, `coronary-ct`, `angiography`, `outcome`) need only `records`: the ED station or the ward nurses'
  station terminal, or the notes at the bedside.
- **Staff.** One nurse, 芮护士 / Nurse Rui — no unit in her name, since the case moves from the ED to the ward. Her
  brief is the arrival handover (ISBAR, from the triage facts) and where the kit is in resus and on the ward; she gives
  no number and no result that is not back.
- **Kit.** Monitoring needs the bay's monitor-defibrillator (`cardiac-monitor`, `defibrillator`); the IV cannula, aspirin,
  heparin and P2Y12 inhibitor come from the crash cart (`iv-access`, `medications`); oxygen uses the wall outlet with
  nasal cannulae (`device`). The case's IV-access procedure (`iv-access`) precedes the heparin in the reference path; the
  patient arrives without a cannula (`ivAccessInSitu` is not set).
- **Scope of practice.** Monitoring, oxygen, the medicines and the cannula are nursing-scope by kind; the catheter
  laboratory call, the CT-first pathway, the admission and the referrals are medical.
- **He can speak throughout** (a conscious adult answers for himself; no companion). There are no examination findings:
  every manoeuvre answers with `examNotRecorded` ("No finding is recorded for this examination in this case").
- **Measured (offline demonstration, 2026-10-30).** `embodied-autopilot.test.ts -t "cmcr-1653411:"` passes in en and
  zh-CN: every objective done, in-world score equal to the clinical score (24/24), no "cannot do this". Entering
  `cath-week` moves him from the resus bay to `ward-1` (`patient.moved` by the team), in both languages.

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; five hours of chest
pain with chest tightness, persisting on arrival; later worsening tightness with recurring pain; repeated ECGs; the
first ECG, the two-hour and later tracings, and the ECG one week after the procedure, in the wording 1.0.0 gives; cTnT
and CK-MB markedly raised without values; the coronary CT; emergency angiography after the symptoms recurred with a
subtotal proximal LAD occlusion and a stent; no long-term outcome.

**Adapted for teaching.** The ED arrival and resus-bay setting (1.0.0's `setting: "emergency"`); the four phases and
their staging — the first ECG shown at arrival, the coronary CT report shown with the recorded course, the ward bed from
`cath-week` on (none of these times or places is recorded); the patient's dialogue (lay rewording of the recorded
facts); the staff; the four decisions, their options and feedback; the 13 interventions (their responses say the case
does not record whether they were done); the rubric; the unrecorded tests a learner would order (old ECG, echo, renal
panel, blood count, chest film) as honest `available: false` records.
**Labelled teaching device:** his voiced worry ("Is it my heart?", `persona.concerns` and the `concerns` item) adds no
clinical fact; 1.0.0 records no concerns. Unknown history items answer with the collection's lay unknown ("这个我说不上
来，医生。" / "I'm not sure, doctor."); for a conscious adult asked whether he smokes this is an artefact of the record, not
a persona trait — say so if learners remark on it.

**Contradictions kept.** None between the recorded patient facts. Two points are not contradictions but are kept open:
the coronary CT reported a moderate-to-severe proximal LAD **stenosis** and the later angiogram a **subtotal occlusion** of
the same segment — different times and modalities, used in teaching, never resolved by invention; and 1.0.0 lists the
CT among the work-up records and the emergency angiography in the outcome, without saying when the CT was done —
relative to the tracings, or whether during this admission at all. The case therefore never says the team "obtained"
the CT or chose "CT first"; it says his record includes a coronary CT, and dates the report "time not recorded; shown
with the recorded course". Likewise 1.0.0 gives the repeat tracing as "after two hours" without an anchor and no time
for the first ECG: the case writes "two hours later" and "First ECG (exact time not recorded)" in both languages. The
1.0.0 README's template line
"review the documented examination" was wrong (1.0.0 has no examination findings) and is not carried over.

**Unknowns kept honest.** Vital signs and examination; ECG measurements and times; whether an earlier ECG exists;
marker values and times; the CT and angiography timing; angiographic and procedural details; past history, risk
factors, medicines, allergies, bleeding history; echo, complications, discharge medicines, follow-up and outcome.
Record-facing texts say "No result is recorded for this test" or "This case does not record whether this was done; it
does not simulate its effect" — never that the article lacks something.

**Figures and privacy.** All eight figures (`fig01`–`fig08`) and the source PDF are **withheld** in
`scripts/cmcr-105-media-review.json`, for these reasons: `fig01`–`fig03`, `fig05`, `fig06` and `fig08` — "ECG header
contains a day-level acquisition date and time."; `fig04` — "Burned-in patient/hospital identifiers, birth date and
acquisition date/time."; `fig07` — "Burned-in patient name, birth date, record number and acquisition date/time.";
`source.pdf` — "Reprints ECG dates and identifying CT/angiography overlays." The review calls six of the figures ECGs and
does not say what `fig04` and `fig07` show (the PDF's CT/angiography overlays suggest imaging), so the case text says
"the report's figures (ECG tracings and imaging)", not "eight ECG figures". `assets` is empty and the case teaches from
the written reports (survey critic gap 13: the image-reading outcome of 1.0.0 is rewritten accordingly). The pseudonym
华知远 / Hua Zhiyuan is kept from 1.0.0; no hospital, date, initials or occupation appear.

**Survey findings applied.** No case audit covered this case; the critic's notes did: gap 3 (the management key handed
the act to a team — decision 2 now names the act, drugs, doses and timing, and the act is scored); gap 10 (no
examination — an explicit source-limited rule: no exam findings, `examNotRecorded`, no examination rubric item); gap 13
(image-dependent outcome — rewritten for written reports); governance finding 10 (the guideline reference lacked journal
and volume — Vancouver strings now). The template defects (generic slots, option ids `supported` / `alternative-N`,
length cue, the hindsight "safety" decision as the only critical item, authoring language in the patient's mouth, no
interventions) are all replaced. The independent review of 1.1.0 (2026-10-30) is applied as listed in the changelog.

**Extensions.** `sourceArticleId`, `sourceUrl`, `historicalReview` and `collection` kept; `sourceDoi` and
`doiVerifiedAt` (2026-10-29, the source map's `publisherCheckedAt`) added for the verified DOI; `sourceTextChecked:
false`; the unverifiable `authorChecks` booleans and `sourceTextSha256` removed until the source pass (STANDARD §6.6).

## Matcher notes

- **Phase twins.** `status-course` (phase `course`) supersedes `pain-now` and `tightness` (phase `arrival`): in the
  recorded course "is it still hurting?" or "any tightness?" gets "It's getting tighter, and the pain keeps coming back",
  never the arrival answer; asking it credits both arrival items.
- **Shared words separated with `excludeKeywords`:** `presenting` vs heart history, family and "besides the pain";
  `onset` vs trigger and previous-episode questions (干什么 / doing / before); `tightness` vs medicines, allergies and blood
  pressure; `character` vs "now" and radiation; `previous-episodes` vs heart disease, surgery, medicines, stents and ECGs;
  `heart-history` vs family and repeated-ECG questions; `pmh` vs family; `medications` vs allergies; `family` vs "does
  your family know you're here / are they on their way" (知道你来 / 知道您来 / on their way), which scored the family
  history at 1.00 before.
- **English keywords** avoid one-token wildcards: run-together forms where a phrase would reduce to one token
  (`howmanyhours`, `howareyounow`, `outoften`, `howmanyecgs`, `whatwereyoudoing`); "brought on" and "came on" were dropped
  from `trigger` because they matched "what's brought you in?" and "when you came in"; "pressing" became "pressing pain"
  because it matched "blood pressure".
- **Order entry.** `orderMatching.rules` send any ECG query with 既往/以前/旧/对比/基线/old/previous/prior/baseline/earlier to
  the old-ECG record and drop the catheter-laboratory record from CT queries (`(^|[^a-z])ct|cta`).
- **Corpus.** 40 test utterances (25 zh-CN, 15 en), written as learners speak; every required item and the phase twin
  are covered. Three **look-alike negatives** (`expect: []`) share words with real questions but ask for something the
  case does not hold: "你家里人知道你来医院了吗？" and "is your family on their way in?" (the family-history wording; both
  selected `family` at 1.00 until its exclusions were added) and "did someone drive you here today?" (the presenting
  question's wording; it scores 0.50, just under the 0.55 selection threshold). `cases verify` reports 40/40 with no
  extra selections.

## References

1. 劉書雷, 柯于梵, 劉紅. 右束支傳導阻滯影響急性心肌梗死心電圖判讀. 鏡湖醫學. 2025;25(2):58-59.
   doi:10.12408/j.issn2223-4462.2025.02.020. Available from: https://rs.yiigle.com/cmaid/1653411
2. Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur
   Heart J. 2023;44(38):3720-3826. doi:10.1093/eurheartj/ehad191
3. Rao SV, O'Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI guideline for the management of patients with
   acute coronary syndromes: a report of the American College of Cardiology/American Heart Association Joint Committee
   on Clinical Practice Guidelines. Circulation. 2025;151(13):e771-e862. doi:10.1161/CIR.0000000000001309
4. Thygesen K, Alpert JS, Jaffe AS, et al. Fourth universal definition of myocardial infarction (2018). Circulation.
   2018;138(20):e618-e651. doi:10.1161/CIR.0000000000000617
5. Gulati M, Levy PD, Mukherjee D, et al. 2021 AHA/ACC/ASE/CHEST/SAEM/SCCT/SCMR guideline for the evaluation and
   diagnosis of chest pain. Circulation. 2021;144(22):e368-e454.
6. 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 急性ST段抬高型心肌梗死诊断和治疗指南(2019). 中华心血管病杂志.
   2019;47(10):766-783.
7. Glikson M, Nielsen JC, Kronborg MB, et al. 2021 ESC Guidelines on cardiac pacing and cardiac resynchronization
   therapy. Eur Heart J. 2021;42(35):3427-3520.
8. Zeppenfeld K, Tfelt-Hansen J, de Riva M, et al. 2022 ESC Guidelines for the management of patients with ventricular
   arrhythmias and the prevention of sudden cardiac death. Eur Heart J. 2022;43(40):3997-4126.
9. 中国血脂管理指南修订联合专家委员会. 中国血脂管理指南（2023年）. 中华心血管病杂志. 2023;51(3):221-255.

**DOIs.** The source DOI is the one the source map (`scripts/cmcr-105-sources.json`) records as verified
(`publisherCheckedAt` 2026-10-29). The DOIs of refs 2–4 are the strings the library's editorial reviews verified on
2026-10-28 (cmcr-1551890 and stemi-inferior-rv READMEs); they were not re-verified in this session — Crossref and doi.org
were unreachable (proxy refusal). Refs 5, 7 and 8 carry no DOI because none could be verified; refs 6 and 9 are cited as
other library cases cite them.

### To verify

**In the source article (the details 1.0.0 does not give):**

- The first ECG: its time relative to arrival (the case shows it at arrival as staging); ST-elevation amplitude per
  lead, whether V1 was involved, QRS duration (complete or incomplete RBBB), rate, rhythm and axis; whether any earlier
  ECG existed (new or known RBBB).
- The anchor of the "after two hours" tracing (two hours after the first tracing, or after arrival — 1.0.0 does not
  say); the times of the later tracings and the "further evolution" during worsening symptoms; whether the RBBB
  persisted on them; whether the ST elevation ever resolved.
- Troponin T and CK-MB values, units, reference ranges and sampling times.
- When and why the coronary CT was done: whether during this admission at all (it may predate it), relative to the
  two-hour ECG and to the recurrence of pain, and whether he was pain-free; the time from arrival to emergency
  angiography.
- Where he was after the angiography (CCU or ward), and whether he was still in hospital a week after the procedure (the
  case stages that week on the ward, with the discharge plan made before discharge).
- Angiographic and procedural detail: TIMI flow, stent number and type, the circumflex lesion at angiography, the drugs
  and doses given before and during PCI, complications.
- Treatment in the ED (antiplatelets, anticoagulant, nitrates, oxygen, analgesia) — none is recorded in 1.0.0.
- Vital signs, examination, Killip class, arrhythmias or heart failure; past history, risk factors, medicines, allergies.
- Echocardiography or LVEF, discharge medicines, follow-up beyond one week and the long-term outcome.
- That "术后 1 周" means one week after the PCI.
- Which of the eight withheld figures are ECGs (the media review calls six of them ECGs; it does not describe `fig04`
  and `fig07`, and the PDF's CT/angiography overlays suggest imaging), and whether the figure legends add findings to
  the text.

**In the guidance (the primary texts were not reachable from this session):**

- ESC 2023 ACS: the class and wording for bundle branch block (including RBBB) with ongoing ischaemic symptoms and a
  primary PCI strategy, including whether it applies "whether or not the block was known before"; the statement that
  troponin must not delay reperfusion in suspected STEMI; the CCTA recommendation (non-elevated or uncertain troponin, no
  ECG changes, no recurrent pain); routine in-hospital echocardiography; the time targets used (10 min, 120 min, < 2 h,
  > 12 h with ongoing symptoms). Teaching points state these without classes.
- Fourth Universal Definition of MI (2018): the RBBB wording (new ST elevation or Q waves should raise ischaemia or
  infarction).
- Chinese STEMI guideline (2019): the 10-minute ECG, aspirin 150–300 mg loading, not waiting for cardiac markers, and its
  own wording on bundle branch block.
- Chinese lipid guideline (2023): the LDL-C targets by risk tier (极高危 < 1.8 mmol/L, 超高危 < 1.4 mmol/L), the
  wording of the fall from baseline ("> 50 %" or "≥ 50 %"), and the 超高危 definition (≥ 2 severe ASCVD events, or one
  with ≥ 2 high-risk factors) — his tier cannot be set because his risk factors are not recorded. Earlier text
  attributed the < 1.4 mmol/L target for "patients at this very high risk" to this guideline as well as to ESC 2023;
  the independent review corrected it, and the primary text was not reachable from this session (network policy).
- ESC 2021 pacing: the class for bundle branch block without AV block or syncope. ESC 2022 ventricular arrhythmias: LVEF
  re-assessment 6–12 weeks after MI and the timing of primary-prevention ICDs; the DINAMIT and IRIS trial results are
  cited from memory of their published conclusions (no early-ICD mortality benefit).
- Citation details of refs 5, 7 and 8 (volume, issue, pages) and their DOIs; whether any newer edition of a cited
  guideline (for example a newer universal definition of MI or a Chinese ACS guideline) supersedes it as of 2026-10.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the presenting complaint is
  split into presentation, onset, pain now and tightness (phase `arrival`), the later worsening becomes the phase twin
  `status-course` (phase `course`), the serial ECGs become one bedside ECG with three phase results (arrival, the
  recorded course, one week after the procedure), and the outcome record's angiography and one-week ECG become their own
  records in phase `cath-week`.
- **History.** 15 template slots (10 with the meta answer "The source notes do not provide that information") → 22 items
  in the patient's lay voice: 6 recorded facts, 15 honest unknowns (character, radiation, severity, trigger, sweating and
  nausea, breathlessness, palpitations and blackouts, previous episodes, heart history, risk factors, medicines,
  allergies, bleeding/surgery/stroke, smoking, family) and one labelled ICE device; 8 required.
- **Phases and gates.** 3 template phases with `{always: true}` and nested `all` gates → 4 one-way phases gated on the
  preceding objectives; the outcome phase opens only after all four decisions.
- **Investigations.** 5 record reviews → 10 records: the ECG as a bedside order with three phase results, the old-ECG
  search, the markers as a lab with text values, the CT and catheter-laboratory records, the outcome record, and honest
  `available: false` results for the echo, renal panel, blood count and chest film.
- **Interventions (critic gap 3).** 0 → 13: monitoring with a defibrillator, IV access, aspirin, P2Y12 inhibitor, heparin,
  catheter-laboratory activation, GTN and oxygen (both conditional and neutral), discharge prevention; harmful:
  tenecteplase in a PCI-capable hospital, CT first, admission for angiography within 24 h, a pacemaker referral — each
  with a harm text citing its guidance.
- **Decisions.** 3 template decisions (ids `supported` / `alternative-N`, the key the longest, a hindsight appraisal as
  the "safety" decision) → 4 decisions with 5 options each and content ids: the ECG reading, the reperfusion plan naming
  act, drugs, doses and timing, the recorded course (the CT and the delay), and the discharge plan (select all).
- **Rubric.** 10 template items (9 deterministic; the one critical item a hindsight decision) → 12: two critical acts
  (`rb-reperfusion`, `rb-no-delay`), two avoided-harm items with `scoredWhen`, first-try decision scoring, and a
  Calgary–Cambridge communication item written for the case.
- **Teaching layer.** 6 learning outcomes (the image-reading outcome rewritten for written reports, critic gap 13), 6
  objectives, 3 named staff, 5 key reasoning steps and 5 dated teaching points, 7 unknowns, 9 Vancouver references
  (governance finding 10); the source citation without double spaces or zero-padded issue.
- **Card.** Title kept; new spoiler-free summary (1.0.0's named the conduction abnormality), lay chief complaint, triage
  note as a handover, three presenting-feature tags, topic tags `chest-pain` and `ecg-interpretation`; estimated time
  30 → 35 min.
- **Governance.** Review status and notes in the STANDARD §6.6 wording (editorial; facts not yet checked against the full
  article; not reviewed by a licensed clinician — the English last sentence reads "The case is not yet reviewed by a
  licensed clinician." because the collection contract matches that phrase case-sensitively); `sourceTextChecked: false`; `authorChecks` and `sourceTextSha256`
  removed until the source pass; `sourceDoi` + `doiVerifiedAt` added.
- **Independent review applied (2026-10-30).** Facts: the R waves "fell" in V2–V3 and V5–V6 (1.0.0) — key reasoning
  step 4 and the `completed-infarct` option had turned this into "R-wave loss"; no drug treatment is recorded, so the
  `stenosis-not-occlusion` feedback and this guide no longer attribute medical therapy to the recorded course; the
  "after two hours" tracing keeps 1.0.0's missing anchor ("two hours later" in both languages, where the zh-CN prompt
  had said "到院 2 小时" and the en one "two hours after the first tracing") and the first ECG is dated "exact time not
  recorded"; the coronary CT is no longer said to have been obtained after his arrival (its time, and whether it was
  done during this admission, are not recorded); the repeat-ECG note names what is really unrecorded (whether the RBBB
  persisted), and the figures are "ECG tracings and imaging", not "eight ECG figures". Assessment: `obj-reperfusion`
  now needs a committed reperfusion act, so the catheter-laboratory call can no longer be credited after the confirming
  records (it scored 24/24 when made after the outcome record). Teaching: the Chinese lipid guideline's own targets
  (极高危 < 1.8, 超高危 < 1.4 mmol/L; his tier cannot be set) are stated in place of the < 1.4 mmol/L target it had been
  given; the decision 1 and 3 keys give one reason in the form of their distractors and no longer rebut them (the key of
  decision 3 no longer echoes "subtotal occlusion" before the catheter-laboratory record); the `obj-week` hint no longer
  names the infarct; the look-alike negatives now share words with real questions, and `family` excludes "does your
  family know you're here". In-world: `cath-week` carries a ward location, and the nurse's name and brief are no longer
  tied to the ED.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, no examination
  findings, 5 record reviews, 3 decisions, 10 rubric items (9 deterministic) and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1653411/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1653411 --lang en                                                 # 52 steps · objectives 6/6 · decisions 4/4 · utterances 40/40 · rubric 24/24 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-1653411                       # depth floor, do-nothing 0, wrong-first 50 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1653411:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1653411:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-10-30: all five pass.

## 中文摘要

**病例概要。** 68岁男性，胸痛 5 小时仍未缓解，伴胸闷，来急诊。首份心电图（准确时间未记录，病例在到院时展示）为右束支传导阻滞
（RBBB），V2–V3 导联 ST 段非弓背向上抬高、T 波直立，V4–V6 导联呈 Rs 型——RBBB 本身在 V1–V3 导联应表现为 ST 段压低、T 波倒
置，与终末 R′ 同向的 ST 段抬高和直立 T 波是阻滞解释不了的原发性损伤图形。记录病程中多次复查心电图：2 小时后（1.0.0 版没有
说明从何时算起）V1–V3 导联 ST 段抬高、V2 导联 T 波倒置，此后 V4 导联呈 QS 型，V2–V3 与 V5–V6 导联 R 波降低；cTnT 和 CK-MB
明显升高（无数值）；病历中的冠状动脉 CT（做 CT 的时间、是否在本次住院期间均无记录）示前降支近段中重度狭窄、回旋支中段轻中度
狭窄。胸闷加重、胸痛反复后急诊造影，见前降支近段次全闭塞，置入支架；术后 1 周心电图仍为 RBBB，V2–V4 导联 QS 型、
V5 导联 rS 型（广泛梗死图形）。诊断：前降支近段病变所致、以 RBBB 背景下 ST 段抬高表现的急性前壁心肌梗死。1 周以后的情况、
生命体征、查体和各项数值均无记录。本版依据 1.0.0 版提取的事实改写，尚未对照原文全文核对。

**学习目标。**

1. 根据心电图报告区分 RBBB 时的原发性与继发性 ST–T 改变（第四版心肌梗死通用定义，2018）。
2. 对持续缺血性胸痛伴 RBBB 下 ST 段抬高的患者立即启动直接 PCI 策略，不等待肌钙蛋白、旧心电图或冠状动脉 CT（ESC 2023 ACS）。
3. 给予即刻处理：心电监护并备除颤、阿司匹林 150–300 mg、PCI 时普通肝素 70–100 U/kg、仅在 SpO₂ < 90% 时吸氧；说明为何能在
   120 分钟内行直接 PCI 时不选溶栓。
4. 解读连续心电图的演变和反复胸痛等极高危表现，说明 CT 狭窄分级或 Q 波都不是推迟造影的理由。
5. 制订大面积前壁梗死后的出院前计划（超声心动图、12 个月双联抗血小板、LDL-C < 1.4 mmol/L，依据 ESC 2023 ACS），说明单纯
   RBBB 不需要起搏器。中国血脂管理指南（2023 年）按危险分层定目标（极高危 < 1.8 mmol/L，超高危 < 1.4 mmol/L），他的危险因素
   没有记录，无法分层。
6. 说明缺少基线心电图时为何不能断定 RBBB 为新发，以及单个病例为何无法衡量延误造成的心肌损失。

**关键决策。**

- 决策 1（到院心电图）：V2–V3 导联 ST 段抬高、T 波直立，与终末 R′ 波同向，是原发性改变，结合持续胸痛按急性前壁损伤处理；
  干扰项为“阻滞造成的继发改变”、“非弓背向上属良性早复极”、“须先有旧心电图并等肌钙蛋白”、“RBBB 本身即可确诊”，为什么阻滞
  自身的图形方向相反，在干扰项的反馈中讲解。
- 决策 2（即刻处理）：立即启动导管室行造影和直接 PCI，阿司匹林 150–300 mg，PCI 时普通肝素 70–100 U/kg，监护并备除颤，不等
  肌钙蛋白；干扰项包括“先做冠状动脉 CT”（他的病历中确有一份 CT，但做的时间没有记录）、0/1 小时肌钙蛋白方案、溶栓和 24 小时内
  造影。决策 2 答对并做出一项再灌注行动（呼叫导管室，或先做 CT、收住院、溶栓之一）后，病例才进入记录病程，因此导管室必须在
  到院阶段呼叫，不能在看过造影记录和结局之后补做。
- 决策 3（记录病程）：胸痛反复、ST 段抬高扩展到 V1–V3，说明前壁梗死仍在进展，须立即造影并对罪犯血管行 PCI；CT 狭窄分级看
  不出有无血栓形成、QS 波也不等于无心肌可救，这些在干扰项的反馈中讲解；干扰项包括与记录病程相似的“等症状再发才造影”（记录中
  没有任何药物治疗的记载）。
- 决策 4（出院前，多选）：超声心动图、12 个月双联抗血小板、高强度他汀达标；不为单纯 RBBB 植入起搏器，不在出院前植入 ICD。

**复盘要点（PEARLS）。** 先谈面对带束支阻滞的心电图时的犹豫；用两句话说清首份心电图和你的处理；分析 RBBB 下 ST 段的方向、
ST 段形态与旧心电图为何不影响决策、为何不选溶栓、CT 狭窄分级能说明什么不能说明什么、T 波倒置何时代表再灌注何时代表演变、Q 波
出现后是否还要再灌注、出院前需要和不需要什么；总结下次遇到持续胸痛伴束支阻滞时怎么做。评分：确定性总分 24 分，两项关键项
（首次作答即选直接 PCI 并在到院阶段实际启动导管室；没有用 CT、择期造影或溶栓代替立即造影），沟通项由考官评判。记录中的处置
（病历中有一份冠状动脉 CT、症状反复后才造影）只作为历史对照，不代表现行推荐。造影后的一周在病房展示（地点未记录，属场景设定）。本病例经人工智能辅助编辑审核，尚未经执业医师审核；待核实事项见上文 “To
verify”。
