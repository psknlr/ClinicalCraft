# cmcr-33789 — Loss of consciousness after chest tightness · 66-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 沈剑耀, 王翔, 任品芳, 张志诚. 镜像右位心急性前壁心肌梗死行急诊介入治疗一例.
中华心血管病杂志. 2014;42(4):343-344. Version 1.1.0 re-authors the case to the clinical content standard **from the facts
that version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet
been checked against the full source article** (STANDARD §6). The patient (吴清和 / Wu Qinghe) is a pseudonym; her
relative, the nurse (滕护士 / Nurse Teng), the attending (裴医生 / Dr Pei), the interventional cardiologist (卢医生 / Dr Lu)
and the intensivist (葛医生 / Dr Ge) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0
does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-33789` / `1.1.0` |
| setting / facility | `emergency` / `general-hospital` (ED resus bay → catheter laboratory → ICU; see Embodied mode) |
| specialty | cardiology, emergency medicine, critical care |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30) and an independent editorial review with its fixes (2026-11-14; guideline statements re-checked online); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a cardiologist and an intensivist or emergency physician review it before teaching use |
| phases | `post-rosc` 抢救之后 / After the resuscitation → `cath-lab` 急诊冠状动脉造影 / Emergency coronary angiography → `post-pci` 术后数小时 / The hours after the procedure → `outcome` 记录的结局 / Recorded outcome — all one-way, none learner-switchable |
| content | 22 history items (6 recorded facts incl. one phase twin, 2 labelled teaching devices, 14 unknown with `disclosure: "unknown"`; 8 required) · 8 exam findings (all recorded; 8 required) · 13 investigations (2 record reviews; 7 with no recorded result, 2 of them recorded as "not completed") · 16 interventions (4 harmful, 2 neutral) · 6 objectives · 5 decisions (25 options) · 12 rubric items (11 deterministic, weight 28; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 5 teaching points · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise mirror-image dextrocardia at the bedside (a right-sided apex beat, faint heart sounds) and confirm it on
   the chest film; add a mirror-image ECG (arm electrodes swapped, chest electrodes mirrored onto the right chest)
   without letting it delay reperfusion.
2. Start a primary PCI strategy at once for a patient resuscitated from an in-hospital cardiac arrest whose ECG still
   shows ST elevation — weighing her coma, but not mistaking an early coma for futility — choosing PCI over
   fibrinolysis whenever it can be done within 120 minutes of diagnosis and explaining the harm of full-dose lysis
   before PCI (ESC 2023 ACS; ASSENT-4 PCI).
3. Deliver the first post-resuscitation priorities — a secured airway with controlled ventilation (SpO₂ 94–98 %, a
   normal PaCO₂), a mean arterial pressure above 60–65 mmHg, defibrillator pads in place, continuous core-temperature
   monitoring and active prevention of fever, targeting 37.5 °C or less for 36–72 hours while she remains comatose
   (ERC–ESICM 2025 post-resuscitation care).
4. Identify the culprit artery on the angiogram — the occluded vessel with thrombus, not the one the lead names
   suggest — treat only the culprit in the emergency procedure of a patient who is not haemodynamically stable, leave
   the left main and LAD disease to a Heart Team, and explain why an IABP is not routine (ESC 2023 ACS).
5. Explain why dilated pupils without a light reaction shortly after a cardiac arrest must not drive treatment, and
   schedule multimodal neurological prognostication no earlier than 72 hours after ROSC, once sedation and other
   confounders are excluded (ERC–ESICM 2025).
6. When anuria, worsening acidosis and DIC follow a technically successful PCI, talk with the family using SPIKES:
   separate what can be judged now (the organ failure and the support on offer) from what cannot yet (the brain's
   recovery), and explain why a fall in the ST elevation is not recovery.

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list. The angiography figure of the report is withheld (identifiers), so no
outcome depends on reading an image: every finding is given as written text.

## Clinical summary (spoilers)

**Presentation.** A 66-year-old woman, already in hospital, developed sudden chest tightness about an hour before the
encounter, quickly stopped responding and had a cardiac and respiratory arrest. She was resuscitated with four shocks
but remained unconscious. At the onset she was pale, cyanosed and sweating heavily. Nothing else about her is recorded:
no vital signs, past history, medicines, allergies, arrest rhythm or duration of resuscitation.

**Examination after the resuscitation.** Unconscious; weak spontaneous breathing; reduced breath sounds with wheeze
and crackles in both lungs; both pupils dilated with no light reaction; cold, cyanosed limbs; **the apex beat on the
right**; faint heart sounds.

**Emergency ECG** (its time relative to the arrest is not recorded). Paroxysmal atrial fibrillation, ventricular
tachycardia and **ST elevation in the anterior leads**. Whether the chest electrodes were in the standard or right-sided
positions is not recorded.

**Chest film.** **Mirror-image dextrocardia** with an enlarged cardiac silhouette. Echocardiography and CT were not
completed, so the detailed anatomy remained uncertain.

**Angiography.** Left main stenosis 70 %; diffuse LAD disease, worst 85 %, with **TIMI 3 flow**; **complete occlusion of
the proximal RCA with local thrombus**.

**The recorded course.** Thrombolysis first, then stenting of the RCA and an intra-aortic balloon pump (IABP) (whether
the angiogram came before or after the lysis is not recorded). After the procedure the ST elevation fell, but she
became anuric, with worsening acidosis and disseminated intravascular coagulation (DIC). Further resuscitation was
stopped and she left hospital about 10 hours after PCI; what happened afterwards is not recorded.

**Diagnosis.** Acute ST-elevation myocardial infarction with an in-hospital cardiac arrest (VT on the emergency ECG),
in mirror-image dextrocardia; the culprit is the complete proximal RCA occlusion with thrombus.

**Today's answer.** Secure the airway and ventilate to normal targets; record the ECG at once, recognise the
right-sided heart and add a mirror-image ECG without delay; a primary PCI strategy (ESC 2023 ACS weighs her coma
against futility, which an early coma cannot establish), with no lysis where timely PCI is available; PCI of the
culprit only, because she is not haemodynamically stable; fever prevention (≤ 37.5 °C for 36–72 hours); no prognosis
from the early pupils — multimodal assessment no earlier than 72 hours after ROSC (ERC–ESICM 2025); an honest family
conversation when multi-organ failure follows. The recorded thrombolysis before PCI and the IABP are the historical
contrast the debrief draws.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the recorded one. No
  vital signs are recorded, so there is no monitor baseline; the monitoring step's response says so.
- **Four one-way phases** (none learner-switchable; records read in an earlier phase stay readable by phase):
  - `post-rosc` — the relative's account (chest tightness, onset about an hour ago, the arrest, resuscitation in
    hospital with four shocks, how she looked), the examination (7 recorded findings), the **emergency ECG** (bedside
    order; shown here, its time not recorded), the **mirror-image ECG** request (no result recorded), the **portable
    chest film** (shown here; its time is not recorded), decisions 1–3 and a **committed reperfusion act**. The echo
    and the chest CT answer that they were not completed; the other tests have no recorded result.
  - `cath-lab` — opens once the history objective, the bedside objective (with decision 1) and the ECG-and-reperfusion
    objective are complete; that last objective needs decisions 2 and 3 right **and** one reperfusion act: the
    catheter-laboratory call, fibrinolysis, or admission to wait for her to wake. Moves her to the C-arm table
    (`location: {capability: "fluoroscopy"}`). The **angiogram report** (record), decision 4 and a procedure act
    (culprit PCI or multivessel PCI).
  - `post-pci` — opens once the angiogram objective is complete; moves her to an ICU bed (`location: {setting:
    "icu"}`, a staging convention). The post-PCI ECG (ST elevation fallen), blood gas (worsening acidosis, no values),
    clotting (DIC, no values), urine output (anuria), the relative's later worry, decision 5 and the family meeting.
  - `outcome` — opens once all five earlier objectives (and so all five decisions) are done: the **reported course and
    outcome** record.
- No prompt, hint, order response or harm text states a later phase's result before its record opens: the
  intervention names, doses and responses visible from the start name neither the dextrocardia nor the angiographic
  findings; the culprit-PCI and IABP responses point to the outcome record instead of saying what the recorded team did.
  A wrong option's feedback may name the recorded team's choice once the learner has committed (decision 3: the team did
  give thrombolysis first; decision 4: the team stented the RCA).

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-collapse-story` Find out what happened before and after she stopped responding | presentation, onset, arrest, resuscitation, appearance asked |
| 2 | `obj-bedside` Assess her after the resuscitation and set the first priorities | consciousness, breathing, lungs, pupils, limbs, apex, heart sounds examined; `d-priorities` right |
| 3 | `obj-ecg-reperfusion` Read the ECG, decide what comes next and act on it | emergency ECG read (`post-rosc`); `d-diagnosis` and `d-reperfusion` right; **one reperfusion act**: the catheter-laboratory call, fibrinolysis or admission to wait |
| 4 | `obj-angiogram` Read the angiogram and decide what this procedure should treat | angiogram read (`cath-lab`); `d-culprit` right; culprit PCI or multivessel PCI given |
| 5 | `obj-after-pci` Reassess her after the procedure and talk with her family | post-PCI ECG, blood gas and clotting read; urine output checked; `d-goals` right; family meeting held |
| 6 | `obj-outcome` Compare your plan with the recorded outcome | outcome record read |

Titles name tasks, not findings — objective 3 and the library summary say "what comes next", not "reperfusion",
so they do not cue the working diagnosis of decision 2; hints are Socratic questions that state no result the learner
has not obtained ("Does this tracing fit the apex beat you felt?", "Which lesion explains this arrest, and how do you tell?"). As in cmcr-1653411
and cmcr-70044, objective 3 needs a committed act: the recorded course (the catheter laboratory) opens only once the
learner has acted on the ECG, and the act is the learner's choice — the critical act can still be missed by a diversion.
No objective holds a condition that can become permanently false (no phase leaf, no `whenIndicated`, no
`decidedFirstTry`).

### Decisions

- **1 `d-priorities`** (single; needs the arrest and resuscitation history and the consciousness, breathing, lung, pupil
  and limb findings). Key: `secure-airway-ecg` — secure the airway and ventilate (SpO₂ 94–98 %, normal PaCO₂), MAP > 60–65
  mmHg, pads on, a 12-lead ECG now. Distractors: `limit-for-pupils` (talk about stopping treatment because of the fixed
  pupils), `mask-and-wait` (mask oxygen, ECG once she wakes), `ct-head-first`, `hyperventilate-100` (100 % oxygen and
  PaCO₂ about 30 mmHg).
- **2 `d-diagnosis`** (single; needs the presentation, the ECG read in `post-rosc`, the apex beat and the heart sounds).
  Key: `stemi-dextrocardia` — an acute STEMI causing a ventricular-arrhythmia arrest; the right-sided apex beat suggests
  dextrocardia, so the territory read from standard leads is not yet reliable. Distractors: `post-shock-change`,
  `primary-brain-event` (subarachnoid haemorrhage), `tamponade` (after CPR; faint heart sounds), `anterior-lad` ("the
  anterior leads localise it; the apex finding is an error").
- **3 `d-reperfusion`** (single; needs decision 2). Key: `primary-pci-now` — activate the catheter laboratory now for
  angiography and primary PCI, aspirin and heparin, a mirror-image ECG and a warning to the team, neither delaying her.
  Distractors: `lysis-then-angio` (the **recorded team's own sequence** — thrombolysis first), `icu-await-waking`,
  `anatomy-first` (echo and cardiac CT first — both were in fact never completed), `troponin-repeat-ecg`.
- **4 `d-culprit`** (single; needs decision 3 and the angiogram read in `cath-lab`). Key: `stent-occluded-rca` — the
  thrombotic proximal RCA occlusion is the culprit: open and stent it now, leave the left main and LAD disease for a
  Heart Team once she is stable (the recorded team stented the RCA). Distractors: `lad-culprit` (trusting the lead
  names), `complete-now` (left main and LAD in the same sitting), `urgent-cabg`, `medical-only`.
- **5 `d-goals`** (single; needs decision 4, and the post-PCI ECG, blood gas, clotting and urine output). Key:
  `separate-now-later` — the artery is open but kidneys, clotting and acid balance are failing; offer the support that
  may help; the brain cannot be judged before 72 hours; set goals by her wishes. Distractors: `st-means-recovery`,
  `pupils-predict`, `defer-all-talk`, `family-decides-alone`.

Every option has its own feedback (2–4 sentences) naming ESC 2023 ACS, ERC–ESICM 2025, KDIGO 2012 AKI, ASSENT-4 PCI
(2006) or CULPRIT-SHOCK (2017) and the reason. Option ids name their content. **No length cue:** the key is the uniquely
longest option only in decision 1, and only in zh-CN (70 characters against 58–63); measured on 2026-11-14 — decision 1
en key 184 of 180–198; decision 2 key 57 of 52–58 (zh-CN) and 172 of 170–186 (en; the key had been the uniquely longest
at 201 characters and now says "STEMI"); decision 3 key 54 of 55–57 and 181 of 174–198; decision 4 key 55 of 51–56 and
173 of 149–174; decision 5 key 66 of 57–66 and 215 of 195–215. No key argues against the other options; each gives a plan with
one reason, in the form of its distractors.

### Rubric (11 deterministic items, total weight 28, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-collapse-history` | history | 2 | presentation, onset, arrest, resuscitation, appearance asked |
| `rb-background` | history | 1 | medicines, allergies, bleeding/surgery/stroke and a known abnormal heart position asked (all unknown; the condition cannot check the order, so the text claims none — the reference path asks before the antithrombotics) |
| `rb-exam` | examination | 2 | the seven post-resuscitation findings examined |
| `rb-ecg-imaging` | investigations | 2 | emergency ECG read, mirror-image ECG ordered and chest film read, all in `post-rosc` |
| `rb-airway` | management | 3 | `d-priorities` right first time **and** intubation given while indicated (`post-rosc`) |
| `rb-diagnosis` | diagnosis | 3 | `d-diagnosis` right first time |
| `rb-reperfusion` | management | 4 | **critical** — `d-reperfusion` right first time **and** `activate-cath-lab` given while indicated (`post-rosc`, i.e. before the angiogram exists) |
| `rb-core-care` | management | 2 | monitoring with pads (`post-rosc`), aspirin and heparin (`post-rosc` or `cath-lab`, i.e. before the stent) given while indicated; temperature control given |
| `rb-culprit` | management | 3 | `d-culprit` right first time, culprit PCI given, no multivessel PCI |
| `rb-no-diversion` | safety | 3 | **critical** — no `withhold-on-pupils`, `fibrinolysis` or `defer-angiography`; scored once decision 1 or 3 is attempted or any of the four acts (the call or one of the three diversions) is made |
| `rb-goals` | management | 3 | `d-goals` right first time and the family meeting held |
| `rb-communication` | communication | (judged) | SPIKES, written for this family: what they know, the open artery and the failing organs in plain words, why the brain cannot be judged yet and why the early pupils do not settle it, her own wishes, the team's recommendation, the next conversation |

### How wrong choices score (measured with the core reducer on 2026-11-14)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 28/28 (100 %) | none | passed |
| start and do nothing | 0/25 (`rb-no-diversion` not scored) | `rb-reperfusion` | passed |
| wrong first answer at all five decisions, then right | 12/28 (43 %) | `rb-reperfusion` | passed |
| wrong first answer at decision 1, 2, 4 or 5 only | 25/28 (89 %) each | none | passed |
| wrong first answer at decision 3 only | 24/28 (86 %) | `rb-reperfusion` | passed |
| reference path plus fibrinolysis before the catheter-laboratory call (the recorded sequence) | 21/28 (75 %) | `rb-reperfusion`, `rb-no-diversion` | **failed** (`fibrinolysis`) |
| fibrinolysis instead of the call, culprit PCI plus IABP (the recorded course as far as the case can replay it) | 21/28 (75 %) | `rb-reperfusion`, `rb-no-diversion` | **failed** (`fibrinolysis`) |
| admission "until she wakes" instead of the call (with or without a later call from the catheter laboratory) | 21/28 (75 %) | `rb-reperfusion`, `rb-no-diversion` | passed |
| reference path plus stopping treatment because of the pupils | 25/28 (89 %) | `rb-no-diversion` | **failed** (`withhold-on-pupils`) |
| reference path plus multivessel PCI, or multivessel PCI instead of culprit PCI | 25/28 (89 %) | none (`rb-culprit` lost) | passed (`critical: false`) |
| reference path plus an IABP | 28/28 (100 %) | none (neutral by design — see below) | passed |
| reference path without intubation | 25/28 (89 %) | none (`rb-airway` lost) | passed |
| reference path without the mirror-image ECG and the chest film | 26/28 (93 %) | none | passed |
| reference path without monitoring, aspirin, heparin and temperature control | 26/28 (93 %) | none | passed |
| reference path without the four background questions | 27/28 (96 %) | none | passed |
| no reperfusion act at all: the catheter laboratory never opens and the case cannot be finished | 18/28 (64 %) | `rb-reperfusion` | passed |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The four harmful
interventions are always `contraindicated` (named in the debrief's safety list, each with its own harm text); the
avoided-harm item counts only once the harm was possible (`scoredWhen`), so doing nothing earns 0. **Timing.** The
catheter-laboratory call, intubation and monitoring score only when given in `post-rosc`, aspirin and heparin only in
`post-rosc` or `cath-lab` (`{"intervened": …, "whenIndicated": true}` with a phase window as `indicatedWhen`), so none of
these can be credited after the angiogram or the outcome record. **Design choices.** The IABP is neutral: the recorded
team used one, but its indication is not recorded and echocardiography (which would show a mechanical complication) was
never completed, so the case teaches the ESC 2023 position (no routine IABP in cardiogenic shock without a mechanical
complication) in the IABP response, the teaching points and Dr Lu's brief rather than penalising it. Amiodarone is
neutral too (recurrent VT is recorded; its haemodynamic context is not).

### Critical items

`rb-reperfusion` (the missed life-saving act: committing to emergency angiography on the ECG **and** making the call in
the resuscitation phase, before any angiogram exists) and `rb-no-diversion` (the dangerous errors: limiting treatment on
the early pupils, deferring angiography until she wakes, or lysis where PCI is available). Both are acts; neither reads a
final-phase record. The 1.0.0 critical item — a hindsight appraisal ("Can recovery be claimed from this report?") whose
rubric text was the keyed option — is gone.

**Safety outcome.** `fibrinolysis` and `withhold-on-pupils` are `critical: true`. Full-dose lysis in a hospital that
can do primary PCI within 120 minutes, just after CPR of unknown length and with her bleeding, surgical and stroke
history unknown (the facilitated-PCI harm of ASSENT-4 PCI), and stopping active treatment on the early pupils (a
self-fulfilling prognosis; ERC–ESICM 2025 waits at least 72 hours) are this case's dangerous errors: either fails the
assessment's safety outcome (`safety.passed: false`) whatever the score, and every debrief and export shows it beside
the score. `multivessel-pci` is `critical: false`: her blood pressure is not recorded, so cardiogenic shock — in which
immediate non-culprit PCI raised death or renal replacement at 30 days (CULPRIT-SHOCK) — cannot be established, and
ESC 2023 accepts complete revascularisation at the index procedure in stable STEMI; it is scored as a misjudgement
(`rb-culprit`), not a safety failure. `defer-angiography` (moderate risk) carries no flag and is caught by the critical
avoided-harm item `rb-no-diversion`. The reference path gives none of them.

## Reference path (`solution`)

62 steps, static clock: start → presentation, onset, arrest, resuscitation, appearance (the relative) → consciousness,
breathing, lungs, pupils, limbs → `d-priorities` → **intubation**, **monitoring with pads**, IV access, **temperature
control** → apex beat, heart sounds → **12-lead ECG** (`post-rosc`) → **mirror-image ECG** (no result recorded) →
**portable chest film** → known heart position, chest-discomfort character, other symptoms → `d-diagnosis` → medicines,
allergies, bleeding, heart history, CPR duration, reason for admission, the relative's worry → **aspirin** →
`d-reperfusion` → **activate the catheter laboratory** → (phase `cath-lab`) **heparin** → angiogram report →
`d-culprit` → **culprit PCI** → (phase `post-pci`) ECG, blood gas, clotting, urine output → the relative's later worry,
baseline function, her wishes, risk factors, smoking, family → `d-goals` → **renal replacement discussion** → **family
meeting** → (phase `outcome`) outcome record → finish. `cases verify` passes: objectives 6/6, decisions 5/5, rubric 28/28,
utterances 40/40. Background questions that do not change the next minutes (smoking, family history) wait for the
quieter ICU phase; nothing age-inappropriate is asked.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 66-year-old woman | `patient.age`, `sex` | `patient.age`, `sex`; title |
| loss of consciousness after chest tightness | title; `chiefComplaint`; `history.presentation` ("She became unresponsive soon after chest tightness.") | `chiefComplaint` (lay words); `history.presenting`; `triageNote` |
| sudden onset about an hour earlier | `history.onset` | `history.onset` (phase `post-rosc`, "about an hour ago"); twin `onset-later` (later phases, "about an hour before you first saw her") |
| cardiac and respiratory arrest followed rapidly; unconscious after resuscitation | `history.progression` | `history.arrest`; decision 1 prompt; `nonVerbalReason` |
| pale, cyanosed, sweating heavily | `history.associated` | `history.appearance` |
| already in hospital; resuscitated with four shocks ("反复电击 4 次") | `history.prior` | `history.resus`; triage note; nurse's handover |
| unconscious with weak spontaneous breathing | `patient.nonVerbalReason` | `exam.responsiveness`, `exam.breathing`; `nonVerbalReason` |
| cold, cyanosed limbs; both pupils dilated without light reaction | `exam.exam-1` | `exam.limbs`, `exam.pupils` |
| right-sided apex beat; faint heart sounds | `exam.exam-2` | `exam.apex`, `exam.heart-sounds` |
| weak spontaneous breathing; reduced breath sounds with dry and moist rales (wheeze and crackles) | `exam.exam-3` | `exam.breathing`, `exam.lungs` |
| emergency ECG: paroxysmal AF, VT, ST elevation in anterior leads | `investigations.ecg` (`workup`) | `investigations.ecg` result `post-rosc` |
| chest film: mirror-image dextrocardia, cardiomegaly | `investigations.anatomy` | `investigations.cxr` result `post-rosc` |
| echo and CT not completed; detailed anatomy uncertain | `investigations.anatomy` | `investigations.echo` (`post-rosc`, `post-pci`) and `investigations.ct-chest`, both `available: false` "not completed" |
| LM 70 %; diffuse LAD up to 85 %, TIMI 3; proximal RCA complete occlusion with local thrombus | `investigations.angio` (`workup`) | `investigations.angiography` (record review) result `cath-lab`; decision 4 prompt |
| thrombolysis first, then RCA stent and IABP | `investigations.outcome` | `investigations.outcome`; `fibrinolysis`, `pci-culprit` and `iabp` responses point to it |
| ST elevation fell after PCI | `investigations.outcome` | `investigations.ecg` result `post-pci` |
| anuria | `investigations.outcome` | `exam.urine-output` (phase `post-pci`) |
| worsening acidosis | `investigations.outcome` | `investigations.abg` result `post-pci` (text only, "no blood-gas values recorded") |
| DIC | `investigations.outcome` | `investigations.coag` result `post-pci` (text only, no values) |
| further resuscitation stopped; left hospital about 10 hours after PCI; later survival unknown | `investigations.outcome` | `investigations.outcome` (phase `outcome`); `unknowns` |
| vital signs, detailed anatomy, long-term outcome absent | `debrief.unknowns`, README | 14 unknown history items; `available: false` results; `examNotRecorded`; 8 `unknowns` |

**Times.** Recorded: onset about an hour before the encounter (1.0.0's "about an hour earlier" has no other anchor;
the case anchors it to the first phase and, in later phases, to "before you first saw her"); the stop of resuscitation
and her leaving about 10 hours after PCI. Not recorded: the time of the emergency ECG relative to the arrest, the chest
film, the angiogram (and whether it came before or after the lysis), the post-PCI findings. **Numbers:** 66 years; four
shocks; LM 70 %; LAD 85 %; TIMI 3; about 1 hour; about 10 hours. **Derived values:** none — 1.0.0 records no number from
which to derive one (no vital signs, weight, blood gases, creatinine or platelet count). The blood-gas and clotting
records carry 1.0.0's words ("worsening acidosis", "DIC") as text with a note that no values are recorded; attributing
them to those two tests is a reorganisation (acidosis and DIC are laboratory diagnoses), listed under To verify.

**Guidance numbers used in teaching text** (formulas; no patient value is needed): SpO₂ 94–98 %; PaCO₂ 4.7–6.0 kPa
(35–45 mmHg); MAP > 60–65 mmHg; fever prevention targeting ≤ 37.5 °C for 36–72 hours (ERC–ESICM 2025; ESC 2023 ACS
still defines fever as > 37.7 °C); prognostication no earlier than 72 hours after ROSC; complete revascularisation at
the index PCI or within 45 days in stable STEMI; primary PCI preferred within 120 minutes of diagnosis; aspirin 75–250 mg IV or 150–300 mg orally/by
nasogastric tube; UFH 70–100 U/kg IV (50–70 U/kg with a GP IIb/IIIa inhibitor); tenecteplase 30–50 mg weight-banded;
amiodarone 300 mg IV over 10–20 minutes then 900 mg over 24 hours. No weight is recorded, so no weight-based dose is
computed.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to take over a patient who would not wake, with fixed pupils and a relative asking
   whether she will survive?"
2. **Description.** "In two sentences: what did you find at the bedside, and what did you do in the first minutes?"
3. **Analysis.**
   - "Her pupils were dilated and unreactive. What did that tell you, and what did it not? When does it start to mean
     something?"
   - "Where was the apex beat? What does that do to an ECG read by its lead names — and how would you tell swapped arm
     electrodes from dextrocardia?"
   - "She was comatose. Did that change the case for emergency angiography? Why not thrombolysis — and what did the
     recorded team do?" (the report records lysis first; why is not recorded — do not let the group assume the catheter
     laboratory was unavailable, or available)
   - "The ST elevation was in the 'anterior' leads, yet the occluded artery was the RCA. How can both be true in this
     anatomy?" (the case does not record where the electrodes were — keep it a hypothesis)
   - "Why stent only the RCA tonight, with a 70 % left main and an 85 % LAD?"
   - "The ST elevation came down. Is she better? What do anuria, worsening acidosis and DIC tell you?"
   - "How did you answer 'Will she wake up?' — what can be said now, and what must wait?"
4. **Summary.** "What will you do first the next time a resuscitated patient has an unusual ECG and a right-sided apex
   beat?"

Keep the discussion inside the record: no vital signs, arrest rhythm, CPR duration or laboratory values are recorded,
and nothing is known after she left hospital — do not let the group infer that she died, or that the lysis or the IABP
caused the deterioration (outcome 6, boundaries).

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Prognosticating from the early fixed pupils | `limit-for-pupils`, `pupils-predict` feedback; `withhold-on-pupils` contraindicated | `rb-airway`, `rb-goals`, `rb-no-diversion` |
| Oxygen by mask and waiting; delaying the ECG | `mask-and-wait`, `ct-head-first` feedback | `rb-airway` |
| Hyperoxia and hyperventilation "to protect the brain" | `hyperventilate-100` feedback | `rb-airway` |
| Attributing the ST elevation to the shocks, a brain event or tamponade | `post-shock-change`, `primary-brain-event`, `tamponade` feedback | `rb-diagnosis` |
| Ignoring the right-sided apex beat; trusting "anterior" = LAD | `anterior-lad`, `lad-culprit` feedback | `rb-diagnosis`, `rb-culprit` |
| Lysis first in a PCI-capable hospital (the recorded sequence) | `lysis-then-angio` feedback; `fibrinolysis` contraindicated | `rb-reperfusion`, `rb-no-diversion` |
| Waiting for her to wake, for anatomy imaging or for troponin | `icu-await-waking`, `anatomy-first`, `troponin-repeat-ecg` feedback; `defer-angiography` contraindicated | `rb-reperfusion`, `rb-no-diversion` |
| Choosing PCI but never making the call | no `activate-cath-lab` in `post-rosc` | `rb-reperfusion` (critical) |
| Treating the left main and LAD in the same emergency sitting, or sending her for CABG | `complete-now`, `urgent-cabg`, `medical-only` feedback; `multivessel-pci` contraindicated | `rb-culprit` |
| "ST resolution means she is recovering" | `st-means-recovery` feedback | `rb-goals` |
| Avoiding the family conversation, or handing them the decision alone | `defer-all-talk`, `family-decides-alone` feedback | `rb-goals`, `rb-communication` |
| Inventing vital signs, blood-gas values or the arrest rhythm | unknown history items, `examNotRecorded`, `available: false` results, the nurse's brief | — |

### Teaching points for the debrief

The five `debrief.teachingPoints`: (1) the right-sided apex beat and the ECG of dextrocardia — lead I, aVR, reverse R-wave
progression, versus swapped arm electrodes; the mirror-image ECG; why standard left chest electrodes overlie the
morphological right ventricle; never a reason for delay; (2) primary PCI after resuscitated arrest with ST elevation,
an early coma weighed but not taken for futility; PCI over lysis within 120 minutes; aspirin and heparin doses (ESC 2023 ACS; Chinese STEMI 2019); lysis
before planned PCI harmful (ASSENT-4 PCI, 2006) — the recorded sequence; (3) the post-resuscitation bundle (ERC–ESICM
2025: fever ≤ 37.5 °C for 36–72 hours where ESC 2023 still says > 37.7 °C) — none recorded; (4) the culprit by
occlusion and thrombus, culprit-only PCI because she is not stable (complete revascularisation is for stable patients;
CULPRIT-SHOCK, 2017), left main to the Heart Team, no routine IABP (IABP-SHOCK II, 2012) — the recorded
IABP; (5) prognostication no earlier than 72 hours, multimodal (ERC–ESICM 2025), versus decisions about multi-organ
failure, made with the family (KDIGO 2012 for renal replacement) — the recorded stop of resuscitation, reasons unknown.

## Embodied mode

- **Where things are (`general-hospital`).** She lies in an ED resus bay (`setting: "emergency"`, 1.0.0's setting) in
  `post-rosc`. This is a **staging convention**: 1.0.0 records that she was already in hospital, not where the arrest
  happened or where she was resuscitated; the resus bay holds everything the first phase needs (monitor-defibrillator,
  ECG machine, airway trolley and ventilator, crash cart, oxygen). Entering `cath-lab` moves her to the C-arm table
  (`location: {capability: "fluoroscopy"}`); entering `post-pci` moves her to an ICU bed (`location: {setting: "icu"}`) —
  where she was after PCI is not recorded either. `outcome` happens where she is.
- **Kit.** Intubation needs the bay's airway trolley and ventilator (`airway`, `ventilator`); monitoring the
  monitor-defibrillator (`cardiac-monitor`, `defibrillator`); the ECGs the ECG machine (`ecg-12lead`, `performedAt:
  "bedside"`); the chest film the portable X-ray (`xray`, `performedAt: "bedside"`); the echo request the ultrasound
  machine wheeled from radiology (`echocardiography`; it returns "not completed"); the two CT requests would take her to
  the scanner (`ct`, `performedAt` provider) and return no result. IV access is a procedure the learner does first
  (`extensions.embodied.ivAccessInSitu: false`: 1.0.0 does not record her lines); aspirin, heparin and amiodarone come
  from the crash cart or are delivered (`medications`). Culprit PCI, multivessel PCI and the IABP need the C-arm
  (`fluoroscopy`), so in-world they can only be done in `cath-lab`. The two record reviews (`angiography`, `outcome`)
  need only `records`: a records terminal, or the notes at the bedside (the catheter laboratory has no terminal).
- **She cannot speak at any point** (`nonVerbalWhen: {always: true}`, reason "unconscious after the cardiac arrest"):
  her relative answers every history question in lay words, relaying what the doctors told the family; the opening line
  is narration. The relative is a teaching device (the relationship is not recorded; the companion is named "Wu
  Qinghe's relative").
- **Staff.** 滕护士 / Nurse Teng gives the ISBAR handover from the triage facts and knows where the kit is; she gives no
  number and no result that is not back. Dr Pei (attending) teaches Socratically and never states an answer. Dr Lu
  (interventional cardiologist) interprets the ECG, chest film and angiogram once read; Dr Ge (intensivist) the post-PCI
  ECG, blood gas, clotting and renal results once read; neither reveals the outcome record.
- **Scope of practice.** Monitoring, the drugs and the IV access are nursing-scope by kind; intubation is a doctor's or
  paramedic's act; the catheter-laboratory call, PCI, the IABP, the renal discussion and the family meeting are medical.
- **Measured (offline demonstration, 2026-11-14).** `embodied-autopilot.test.ts -t "cmcr-33789:"` passes: every
  objective done and the in-world score equal to the clinical score.

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; an inpatient with
sudden chest tightness about an hour earlier, quickly unresponsive, cardiac and respiratory arrest; resuscitation with
four shocks; unconscious afterwards; pale, cyanosed and sweating at the onset; the examination (cold cyanosed limbs,
dilated unreactive pupils, right-sided apex beat, faint heart sounds, weak breathing, reduced breath sounds with wheeze
and crackles); the emergency ECG; the chest film; echo and CT not completed; the angiogram; thrombolysis, RCA stent and
IABP; ST resolution; anuria, worsening acidosis, DIC; the stop of resuscitation and her leaving about 10 hours after
PCI; later survival unknown.

**Adapted for teaching.** The four phases and their staging — the ECG and chest film shown in the first phase, the
resus bay, the C-arm table and the ICU bed (none of these times or places is recorded); the relative's dialogue (lay
rewording of the recorded facts, relayed as "the doctors told us"); the staff; the five decisions, their options and
feedback; the 16 interventions (their responses say the case does not record whether they were done, or point to the
outcome record); the rubric; the tests a learner would order that 1.0.0 does not report (mirror-image ECG, CT head,
troponin, renal panel, blood count; blood gas and clotting before PCI) as honest `available: false` records.
**Labelled teaching devices:** the relative at her bedside (`persona.companion`; relationship not recorded), the
relative's two voiced worries (`concerns`, `concerns-later`) and the question decision 5's prompt gives the relative
("Will she wake up? Should all this go on?"), which add no clinical fact. Unknown history items answer
with lay unknowns ("这个我说不上来，医生。" / "I'm not sure, doctor.").

**Contradictions and open points kept.**
- The report's **title** calls the infarct "acute anterior" (急性前壁心肌梗死), and the emergency ECG records ST
  elevation in the anterior leads, while the **angiogram** recorded in 1.0.0 shows a completely occluded proximal RCA
  with thrombus and TIMI 3 flow in the LAD. The case keeps both, names the RCA occlusion as the culprit (the occluded
  vessel with thrombus) and offers a hypothesis it does not assert: with standard chest electrodes in mirror-image
  anatomy, the left-sided "anterior" electrodes overlie the morphological right ventricle, so their ST elevation may
  reflect right-ventricular injury from a proximal RCA occlusion. Whether the electrodes were standard or right-sided,
  and how the authors named the vessels in mirror-image anatomy, is to verify.
- **Lysis then stenting:** 1.0.0 gives the order (thrombolysis first, then the RCA stent and the IABP) but not whether
  the angiogram showing a complete occlusion was taken before or after the lysis (after it would make the PCI a rescue
  procedure). The case says so in the angiogram note and the outcome record.
- **"About an hour earlier"** has no anchor in 1.0.0; the case anchors it to the first encounter in both languages.
- **"Already in hospital"** (1.0.0 `history.prior`) against 1.0.0's `setting: "emergency"`: kept as the resus-bay staging
  above; why she was in hospital is unknown (`reason-admitted`).
- The 1.0.0 README's template lines ("review the documented examination", "Images and PDFs await privacy review and are
  not embedded" next to a linked approved figure) are not carried over.

**Unknowns kept honest.** Vital signs, GCS, glucose; why she was admitted, past history, medicines, allergies, risk
factors, whether dextrocardia was known; the arrest (witnessed?, rhythm, duration, drugs, airway, time to ROSC); ECG
electrode placement and detail; every laboratory value; the lytic, antithrombotic and vasopressor drugs and doses;
stent details; the IABP indication; who decided to stop resuscitation and why; where she went and whether she survived.
Record-facing texts say "No result is recorded for this test" or "This case does not record whether this was done; it
does not simulate its effect" — never that the article lacks something.

**Figures and privacy.** `scripts/cmcr-105-media-review.json` approves `fig01` ("Original imaging or histology
inspected; no identifying overlay visible.") and withholds `fig02` ("Angiography panels carry patient name, hospital,
record number and acquisition date."); no source PDF is displayed. `fig01` is shown with the outcome record only
(`figures` of its `outcome` result; no mid-case result carries it), with a neutral title, because the review does not say what it shows
(survey critic gap 13 asks titles to name the finding: to verify). The angiogram is taught from the written report; its
note says the report's angiography images are withheld. The pseudonym 吴清和 / Wu Qinghe is kept from 1.0.0; no
hospital, date, initials or occupation appear.

**Survey findings applied.** No case audit covered this case. The governance review listed it among the cases whose
README said "Images and PDFs await privacy review and are not embedded" while an approved asset was linked, and whose
`authorChecks.mediaAwaitingPrivacyReview` flag was stale: the sentence is replaced by the media-review outcome above and
`authorChecks` is removed. The critic's collection-wide findings are all replaced here: option ids `supported` /
`alternative-N`; the key the longest option; the only critical item a hindsight appraisal reading the final-phase
outcome, its rubric text the keyed option; the management key handing the act to a team ("urgent cardiac care … with
verification") with no intervention — decision 3 now names the act, drugs, doses and timing and the act is scored;
generic history slots and "The source notes do not provide that information" in the relative's mouth; "Companion
(educational role)"; an end-of-life course with no communication teaching — now a SPIKES item and decision 5.

**Safety and validity fixes.** (1) 1.0.0 never addressed the airway of an unconscious patient breathing weakly — now
decision 1 and a scored intubation in time. (2) Nothing warned against prognosticating from the early fixed pupils —
now decisions 1 and 5, a contraindicated act and a critical safety item. (3) The recorded thrombolysis before PCI was
not contrasted with current practice — now decision 3, a contraindicated act (ESC 2023 ACS; ASSENT-4 PCI) and teaching
point 2. (4) The IABP and the left main disease are set against ESC 2023 (no routine IABP; culprit-only PCI; Heart
Team). (5) No decision is gated on a history item the case does not record (1.0.0's last two decisions required asking
PMH, medications and allergies, all unknown).

**Extensions.** `collection`, `sourceArticleId`, `sourceUrl` and `historicalReview` kept; `sourceDoi` and
`doiVerifiedAt` (2026-10-29, the source map's `publisherCheckedAt`) added for the verified DOI; `sourceTextChecked:
false`; `embodied.ivAccessInSitu: false`; the unverifiable `authorChecks` booleans and `sourceTextSha256` removed until
the source pass (STANDARD §6).

## Matcher notes

- **Phase twins.** `onset-later` (phases `cath-lab`, `post-pci`, `outcome`) supersedes `onset` (phase `post-rosc`): later
  in the case "when did it start?" gets "about an hour before you first saw her", never "about an hour ago".
  `concerns-later` (`post-pci`) supersedes `concerns` (`post-rosc`, `cath-lab`).
- **Shared words separated with `excludeKeywords`:** `presenting` vs "after", "next", "where"/在哪, "how long",
  "before", family, allergies, worries and admission; `onset` vs resuscitation, shocks, CPR, admission, colour and sweating ("was she grey and sweaty
  when it started?" selected `onset` before); `arrest` vs "how long", "how many", shocks and "where was she"; `resus` vs
  "how long", "why was she in" and wishes; `bleeding` vs "the procedure"/做完/术后 and worries ("手术做完了，您现在最担心的是什么？"
  selected `bleeding` before); `heart-history` vs family and heart position; `risk-factors` and `medications` vs
  allergies; `family` vs "on their way", "notified", "contact"; `baseline` vs medicines ("她平时吃什么药？" also
  selected `baseline` through 平时); `risk-factors` vs "take" and `chest-character` vs "blood pressure" ("What does she
  take for her blood pressure?" selected `risk-factors`, then `chest-character`).
- **English keywords** avoid one-token wildcards: run-together forms (`whathappened`, `whatswrongwithher`,
  `howdidthishappen`, `howdidsheendup`, `howdidshelook`, `intoherarm`, `beforeallthis`, `wouldshewant`, `longwerethey`,
  `howareyoucoping`, `howareyouholdingup`, `onyourmind`, `howlongcpr`, `inthefamily`, `doesshetake`).
- **Order entry.** `orderMatching.rules` send any ECG query naming right-sided, mirror, reversed or swapped leads (or
  V1R–V6R; 右胸/右侧导联/镜像/反接/互换) to the mirror-image ECG, and drop the angiogram record from CT queries.
- **Corpus.** 40 test utterances (23 zh-CN, 17 en), written as learners speak; every required item and both phase
  twins are covered. Two **look-alike negatives** (`expect: []`) share words with real questions but ask for something
  the case does not hold: "家里人都通知到了吗？" and "is the family on their way in?" (the family-history wording).
  `cases verify` reports 40/40 with no extra selections. The independent review (2026-11-14) probed 56 natural
  questions; those that reached the wrong item or none ("What happened next?", "那后来呢？", "能说说经过吗？", "Does she
  take anything to thin the blood?", "Any heart disease in the family?", "她以前有什么病？", "How long was the
  resuscitation?", "Where was she when this happened?", "她平时吃什么药？") now reach their item, and six of them
  replace near-duplicate utterances in the corpus.

## References

1. 沈剑耀, 王翔, 任品芳, 张志诚. 镜像右位心急性前壁心肌梗死行急诊介入治疗一例. 中华心血管病杂志. 2014;42(4):343-344.
   doi:10.3760/cma.j.issn.0253-3758.2014.04.016. Available from: https://rs.yiigle.com/cmaid/33789
2. Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur
   Heart J. 2023;44(38):3720-3826. doi:10.1093/eurheartj/ehad191
3. Nolan JP, Sandroni C, et al. European Resuscitation Council and European Society of Intensive Care Medicine
   guidelines 2025: post-resuscitation care. Intensive Care Med. 2025;51(12):2213-2288. doi:10.1007/s00134-025-08117-3
4. Soar J, Böttiger BW, Carli P, et al. European Resuscitation Council Guidelines 2025 adult advanced life support.
   Resuscitation. 2025;215(Suppl 1):110769. doi:10.1016/j.resuscitation.2025.110769
5. 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 急性ST段抬高型心肌梗死诊断和治疗指南(2019). 中华心血管病杂志.
   2019;47(10):766-783.
6. ASSENT-4 PCI investigators. Primary versus tenecteplase-facilitated percutaneous coronary intervention in patients
   with ST-segment elevation acute myocardial infarction (ASSENT-4 PCI): randomised trial. Lancet.
   2006;367(9510):569-578. doi:10.1016/S0140-6736(06)68147-6
7. Thiele H, Akin I, Sandri M, et al. PCI strategies in patients with acute myocardial infarction and cardiogenic shock.
   N Engl J Med. 2017;377(25):2419-2432.
8. Thiele H, Zeymer U, Neumann FJ, et al. Intraaortic balloon support for myocardial infarction with cardiogenic shock.
   N Engl J Med. 2012;367(14):1287-1296.
9. Kidney Disease: Improving Global Outcomes (KDIGO) Acute Kidney Injury Work Group. KDIGO clinical practice guideline
   for acute kidney injury. Kidney Int Suppl. 2012;2(1):1-138. doi:10.1038/kisup.2012.1

The same strings are `debrief.references`. **How they were checked.** Ref. 1 — the source map
(`scripts/cmcr-105-sources.json` `verifiedDoi`, publisher record checked 2026-10-29); its issue is written "4", not
1.0.0's "04", and the double spaces between the authors are removed. Refs 2, 4, 5, 6 and 9 are the strings the library's
editorial reviews already carry and verified (cmcr-1653411, stemi-inferior-rv, septic-shock-cap). The independent review
(2026-11-14) searched the web and confirmed ref. 3 (journal, volume, pages and DOI; first three authors Nolan, Sandroni,
Cariou; the same guideline is published in Resuscitation 2025;215 Suppl 1:110809, doi:10.1016/j.resuscitation.2025.110809),
ref. 4 (citation and DOI), refs 7 and 8 (CULPRIT-SHOCK and IABP-SHOCK II; DOIs added) and ref. 9 (KDIGO 2012 is still the
published AKI guideline; its 2026 AKI/AKD update closed public review in May 2026 and is not yet published).

### To verify

**In the source article (the details 1.0.0 does not give):**

- Why she was in hospital, where the arrest happened (ward, CCU, emergency department) and where she was treated after
  ROSC; whether the arrest was witnessed, its rhythm (the four shocks imply a shockable rhythm, which the case does not
  state), the drugs given, the airway management, the duration of resuscitation and the time to ROSC.
- Vital signs, GCS, glucose and any blood results at any point.
- The emergency ECG: when it was recorded relative to the arrest and ROSC; standard or right-sided chest electrodes;
  which leads showed ST elevation and by how much; the limb-lead pattern (lead I, aVR) and the R-wave progression;
  whether a mirror-image or repeat ECG was taken; how the fall in ST elevation after PCI was documented.
- How the authors reconcile the title's "anterior" infarction with the RCA culprit (electrode positions; how the
  coronary arteries were named in the mirror-image anatomy — morphological or positional "right").
- The chest film (gastric bubble and liver position — situs inversus?), whether the dextrocardia was known before, and
  why echocardiography and CT were not completed.
- The thrombolysis: drug, dose and timing; why lysis was chosen (catheter-laboratory availability, expected delay);
  whether the angiogram was taken after it (rescue PCI) or before it.
- Angiography and PCI detail: access, projections, catheters, stent number and type, TIMI flow after PCI,
  antithrombotic drugs and doses; the IABP indication and timing; vasopressors; any mechanical complication.
- After PCI: urine volumes, blood-gas values (pH, lactate), the platelet count and clotting tests behind the DIC, any
  bleeding; whether renal replacement or temperature control was used.
- Who decided to stop further resuscitation and why; what "离院" means here (discharge against advice, transfer, going
  home to die); whether she survived.
- Her blood pressure and haemodynamic state at the PCI and the indication for the IABP: the case keys culprit-only PCI
  because her stability cannot be established, and treats `multivessel-pci` as `critical: false` for the same reason.
- What `fig01` shows, so that its title can name the finding (the media review says only "original imaging or
  histology").

**In the guidance (re-checked online on 2026-11-14 in the independent review; what is still open):**

- **ERC–ESICM 2025 post-resuscitation care** — confirmed from the Resuscitation Council UK 2025 guideline (based on it)
  and the ILCOR CoSTR on temperature control (2023): SpO₂ 94–98 %; normocapnia, PaCO₂ 4.7–6.0 kPa (35–45 mmHg); a MAP
  above 60–65 mmHg; fever prevention targeting ≤ 37.5 °C for 36–72 hours in patients who remain comatose (the case had
  quoted the earlier > 37.7 °C for at least 72 hours); multimodal prognostication at ≥ 72 hours with the indicators
  listed in teaching point 5; immediate angiography for clear ST elevation; CT first when the features before the arrest
  suggest a non-coronary cause, otherwise a whole-body CT before or after angiography. Still to read in the primary text:
  the exact wording and strength of each.
- **ESC 2023 ACS** — confirmed in the guideline text: a primary PCI strategy "in general" after resuscitated arrest with
  persistent ST elevation, with neurological status (comatose or not) and survival probability weighed against
  futility; active prevention of fever > 37.7 °C (the essential messages place it under out-of-hospital arrest);
  prognostication no earlier than 72 hours; complete revascularisation at the index PCI or within 45 days in STEMI with
  multivessel disease and IRA-only PCI at the index procedure in cardiogenic shock (from secondary summaries); no
  routine IABP in shock without mechanical complications; emergency TTE in shock or haemodynamic instability. Still to
  read in the recommendation tables (images on the publisher's page): the classes and levels, the aspirin (150–300 mg
  orally or 75–250 mg IV) and UFH (70–100 U/kg; 50–70 U/kg with a GP IIb/IIIa inhibitor) doses, fibrinolysis only when
  PCI cannot be done within 120 minutes, and the wording on emergency CABG.
- **ERC 2025 adult ALS** — confirmed from the Resuscitation Council UK 2025 guideline: amiodarone 300 mg IV over
  10–20 minutes after failed synchronised cardioversion (procainamide is the alternative), which "can be followed" by
  900 mg over 24 hours.
- **Chinese STEMI guideline (2019)** — still the current Chinese STEMI guideline (the 2024 guideline covers NSTE-ACS
  only); its own wording on resuscitated cardiac arrest is not re-read.
- **ASSENT-4 PCI, CULPRIT-SHOCK, IABP-SHOCK II** — CULPRIT-SHOCK (30-day death or renal replacement 45.9 % with
  culprit-only PCI against 55.4 % with immediate multivessel PCI) and IABP-SHOCK II (no 30-day mortality benefit)
  confirmed; ASSENT-4 PCI (more death, heart failure or shock and more strokes with facilitated PCI) as remembered.
- **KDIGO 2012 AKI** — still the published guideline; re-check the renal-replacement wording against the 2026 AKI/AKD
  update when it is published.
- **Without a cited source:** the standard-lead ECG of dextrocardia and its distinction from arm-electrode reversal, the
  mirror-image ECG technique, the statement that standard left chest electrodes overlie the morphological right
  ventricle in mirror-image anatomy, and that mirror-image anatomy reverses the angiographic projections and catheter
  turns (Dr Lu's brief) — from physiology and interventional practice.
- No newer ESC ACS guideline as of 2026-11 (the 2026 ESC guidelines cover heart failure, cardiovascular disease in
  chronic kidney disease and cardiac rehabilitation, beside the fifth universal definition of myocardial infarction);
  whether a clinician reviewer wants the AHA 2025 ACS and post-cardiac-arrest guidance cited beside the European
  guidance is open.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the presenting story is split
  into presentation, onset (with a later-phase twin), arrest, resuscitation and appearance; the compound examination
  records become seven findings (one manoeuvre each) plus the post-PCI urine output; the "structural evidence" record
  becomes the chest film plus "not completed" echo and CT; the outcome record's ST resolution, acidosis and DIC become
  the post-PCI ECG, blood-gas and clotting results, and the full course stays in the outcome record.
- **History.** 15 template slots (10 with the meta answer "The source notes do not provide that information") → 22 items
  in the relative's lay voice: 6 recorded facts (one phase twin), 14 honest unknowns, 2 labelled ICE devices; 8
  required. The companion is "Wu Qinghe's relative" (relationship not recorded), not "Companion (educational role)".
- **Phases and gates.** 3 template phases (two switchable, a nested gate) → 4 one-way phases gated on the preceding
  objectives, with locations; the outcome phase opens only after all five decisions.
- **Investigations.** 4 record reviews → 13 records: bedside ECG (two phase results), mirror-image ECG, portable chest
  film, echo and chest CT (not completed), CT head, troponin, blood gas and clotting (post-PCI results), renal panel and
  blood count (no result), the angiogram and outcome records.
- **Interventions (critic gap 3).** 0 → 16: airway, monitoring with pads, IV access, temperature control, aspirin,
  heparin, catheter-laboratory activation, culprit PCI, renal replacement discussion, family meeting; neutral:
  amiodarone, IABP; harmful: fibrinolysis in a PCI-capable hospital, deferring angiography until she wakes, stopping
  treatment on the pupils, multivessel PCI in the emergency sitting — each with a harm text citing its guidance.
- **Decisions.** 3 template decisions (ids `supported` / `alternative-N`, the key the longest, a hindsight appraisal as
  the critical "safety" decision) → 5 decisions with 5 options each and content ids: post-resuscitation priorities,
  working diagnosis, reperfusion plan (act, drugs, doses, timing), culprit and procedure, goals of care.
- **Rubric.** 11 template items (the one critical item a hindsight decision whose text was the keyed option) → 12: two
  critical acts, one avoided-harm item with `scoredWhen`, acts timed with `whenIndicated`, first-try decision scoring and
  a SPIKES communication item written for this family.
- **Teaching layer.** 6 learning outcomes, 6 objectives, 4 named staff, 5 key reasoning steps and 5 dated teaching
  points, 8 unknowns, 9 Vancouver references.
- **Card.** Title kept ("female" → "woman"); a spoiler-free summary; lay chief complaint; the triage note as a handover;
  three presenting-feature tags; topic tags `cardiac-arrest`, `post-resuscitation-care`, `ecg-interpretation`;
  specialty adds `critical-care`; estimated time 30 → 40 min.
- **Governance.** Review status and notes in the STANDARD §1.2 and §6 wording; `sourceTextChecked: false`; `authorChecks` and
  `sourceTextSha256` removed until the source pass; `sourceDoi` + `doiVerifiedAt` added; the figure's title made neutral
  and the stale media sentence replaced.
- **Independent review applied (2026-11-14).** *Safety outcome:* the three high-risk interventions that can be
  contraindicated now state `critical` (`fibrinolysis` and `withhold-on-pupils` true, `multivessel-pci` false) — strict
  validation and the collection contract had failed on the missing flags — and this guide has its **Safety outcome.**
  paragraph and 安全结果 sentence; the English review note now reads "The case is not yet reviewed by a licensed
  clinician." (the contract matches the lower-case phrase); the 14 unrecorded history items are `disclosure: "unknown"`
  (they were `on-ask`: STANDARD 1.4 and the collection contract need unknown items marked as such, and the patient
  pipeline then never treats "I'm not sure" as a disclosed fact). *Facts:* the culprit's thrombus is the recorded "local
  thrombus" — the decision 4 key feedback, learning outcome 4, teaching point 4 and Dr Lu's brief had called it "fresh";
  she "stopped responding" (叫不应) — the summary, a tag, objective 1, the decision 1 prompt, key reasoning 1 and two
  feedbacks had her "collapse"/"倒下"; Dr Pei's brief says she left hospital, not "discharge". *Guidance:* ERC–ESICM 2025
  targets fever prevention at ≤ 37.5 °C for 36–72 hours (the case had given it the earlier > 37.7 °C for at least 72
  hours), a MAP above 60–65 mmHg (not "at least 65") and a PaCO₂ of 4.7–6.0 kPa; ESC 2023 ACS recommends a primary PCI
  strategy "in general" and weighs neurological status against futility — it does not say that "coma is no reason to
  defer" (learning outcome 2, the decision 3 key and `icu-await-waking` feedback, the deferral harm, teaching point 2,
  key reasoning 3, the conclusion); ERC–ESICM 2025 puts CT first only when the pre-arrest features suggest a
  non-coronary cause (two feedbacks had said CT is kept for "no evident cardiac cause"); culprit-only PCI is argued from
  her instability (no blood pressure recorded, so shock cannot be excluded) with ESC 2023's complete revascularisation
  for stable patients stated beside it, instead of applying the cardiogenic-shock recommendation as if shock were
  established. *Assessment:* objective 3 and the library summary no longer say "reperfusion" before decision 2 (they cued
  its key); the en key of decision 2 is no longer the uniquely longest option; `rb-background` no longer claims a timing
  its condition cannot check; Dr Pei's "Why not lyse first?" no longer hints decision 3; the decision 3 key feedback
  names the bleeding and anticoagulant questions that come before aspirin and heparin. *Matcher:* nine natural questions
  that reached the wrong item or none now reach theirs. *References:* three authors for ERC–ESICM 2025 and DOIs for
  CULPRIT-SHOCK and IABP-SHOCK II; the guideline statements re-checked online (To verify). *Figure:* `fig01` is now shown
  with the outcome record (STANDARD 1.16), under a title that claims nothing about its content (the media review does
  not establish "imaging"). No patient fact was added, the
  reference path is unchanged and every score in the table above is re-measured.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, 3 examination
  records, 4 record reviews, 3 decisions, 11 rubric items (10 deterministic) and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-33789/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33789 --lang en                                                 # 62 steps · objectives 6/6 · decisions 5/5 · utterances 40/40 · rubric 28/28 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-33789                                     # depth floor, do-nothing 0, wrong-first 43 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33789:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33789:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-11-14, after the independent review's fixes: all five pass (before them, strict validation and the
collection contract failed on the three missing `critical` flags).

## 中文摘要

**病例概要。** 66岁女性，当时已在住院，约 1 小时前突然出现胸闷，很快呼之不应，随即心跳呼吸骤停；经抢救、电击 4 次后仍不清醒。
发作时面色苍白、发绀、大汗。查体：意识不清，自主呼吸弱，双肺呼吸音低伴干湿啰音，双侧瞳孔散大、对光反射消失，四肢冰冷发绀，
**心尖搏动在右侧**，心音低弱。急诊心电图：阵发性房颤、室速，**前壁导联 ST 段抬高**（导联放置方式未记录）。胸片：**镜像右位心**，
心影增大；超声心动图和 CT 未完成。造影：左主干狭窄 70%，前降支弥漫病变最重 85%、TIMI 3 级血流，**右冠状动脉近段完全闭塞伴局部
血栓**。记录的处理：先溶栓，后行右冠状动脉支架并置入 IABP（造影在溶栓之前还是之后未记录）；术后 ST 段回落，但出现无尿、酸中毒
加重和 DIC，停止进一步抢救，PCI 后约 10 小时离院，此后情况不明。诊断：镜像右位心患者的急性 ST 段抬高型心肌梗死并发院内心脏骤停，
罪犯病变为右冠状动脉近段完全闭塞伴局部血栓。报告标题称“前壁”心肌梗死，与造影所见并存，作为待核实问题保留。本版依据 1.0.0 版提取的事实
改写，尚未对照原文全文核对。

**学习目标。**

1. 在床旁识别镜像右位心并在胸片上确认；加做镜像导联心电图，但不拖延再灌注。
2. 对复苏后心电图仍有 ST 段抬高的患者立即启动直接 PCI 策略，把昏迷纳入权衡、但不把早期昏迷当作治疗徒劳；能在 120 分钟内
   完成 PCI 时不溶栓（ESC 2023 ACS；ASSENT-4 PCI）。
3. 复苏后首要处置：确保气道、控制通气（SpO₂ 94%–98%，PaCO₂ 正常），平均动脉压 > 60–65 mmHg，贴除颤电极，主动预防发热
   （目标 ≤ 37.5 ℃，持续 36–72 小时）（ERC–ESICM 2025）。
4. 以闭塞和血栓认定罪犯血管；对血流动力学不稳定的患者，急诊只处理罪犯病变，左主干交给心脏团队，不常规使用 IABP（ESC 2023 ACS）。
5. 早期瞳孔散大固定不能用来决定治疗；神经预后在复苏后至少 72 小时多模式评估（ERC–ESICM 2025）。
6. PCI 后出现多器官衰竭时，用 SPIKES 与家属沟通，区分现在能判断的与还要等待的，说明 ST 段回落不等于康复。

**关键决策。**

- 决策 1（复苏后首要处置）：确保气道并控制通气、维持血压、贴除颤电极、立即做 12 导联心电图；干扰项为“因瞳孔散大固定先谈停止治疗”
  “面罩吸氧等待”“先做头颅 CT”“纯氧加过度通气”。
- 决策 2（工作诊断）：急性 ST 段抬高型心肌梗死导致室性心律失常和骤停，心尖在右侧提示右位心、按标准导联定位不可靠；干扰项为电击后
  改变、颅内事件、心包填塞、“前壁导联就是前降支”。
- 决策 3（再灌注）：立即启动导管室行直接 PCI，给阿司匹林和肝素，加做镜像导联心电图并告知团队，但都不拖延；干扰项包括记录中团队
  的做法“先溶栓再造影”、等她醒来、先做解剖检查、先等肌钙蛋白。答对并实际呼叫导管室（或选择溶栓、收入 ICU 之一）后才进入导管室
  阶段，因此导管室必须在抢救阶段呼叫，不能事后补做。
- 决策 4（造影）：右冠状动脉近段完全闭塞伴血栓是罪犯病变，现在开通并置入支架；左主干和前降支病变留给心脏团队；干扰项为“前降支是罪犯”
  “同期完全血运重建”“急诊搭桥”“只用药物”。
- 决策 5（治疗目标）：说明血管已通但器官在衰竭，商讨可能有益的支持，脑功能至少 72 小时后才能评估，按她的意愿与家属商定目标；
  干扰项为虚假安慰、以早期瞳孔宣判、回避谈话、把决定完全推给家属。

**复盘要点（PEARLS）。** 先谈面对叫不醒、瞳孔散大的患者和焦急家属时的感受；用两句话说清床旁所见和最初几分钟的处置；分析早期瞳孔
能说明什么、心尖在右侧对心电图判读意味着什么、昏迷是否改变急诊造影、为什么不先溶栓（记录中的团队先溶栓，原因未记录）、“前壁导联”
与右冠状动脉闭塞如何同时成立（只作为假设）、为什么只处理右冠状动脉、ST 段回落是否等于好转、怎样回答“她还能醒吗”；总结下次遇到
复苏后心电图异常、心尖在右侧的患者时先做什么。评分：确定性总分 28 分，两项关键项（首次作答即选直接 PCI 并在抢救阶段实际呼叫导管室；
没有因早期瞳孔限制治疗，也没有用溶栓或“等她醒来再造影”代替急诊 PCI），沟通项（SPIKES）由考官评判。记录中的处置（先溶栓、IABP）
只作为历史对照。抢救单元、导管室和 ICU 的位置均为场景设定。本病例经人工智能辅助编辑审核，尚未经执业医师审核；待核实事项见上文
“To verify”。

**安全结果。** `fibrinolysis`（可及时行直接 PCI 时、刚经历时长不明的心肺复苏后给予全量溶栓）和 `withhold-on-pupils`
（以复苏后早期瞳孔散大为由停止积极治疗）标为 `critical: true`：任一发生，无论得分多少，安全结果都判为不通过，所有复盘和导出都在
分数旁显示；`multivessel-pci` 标为 `critical: false`（血压没有记录，无法确定心源性休克），按处置失误计分。
