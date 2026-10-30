# cmcr-857041 — Sudden breathlessness after spinal surgery · 60-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 赵云霞, 殷洪山, 陈刚, 邓卓军. 致死性肺栓塞致心脏骤停救治成功一例.
中华结核和呼吸杂志. 2011;34(2):152-153. Version 1.1.0 re-authors the case to the clinical content standard **from the
facts that version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has
yet been checked against the full source article** (STANDARD §6). The patient (何予宁 / He Yuning) is a pseudonym; her
relative, the ward nurse (阚护士 / Nurse Kan), the ICU attending (管医生 / Dr Guan), the radiologist (冼医生 / Dr Xian)
and the spinal surgeon (瞿医生 / Dr Qu) are invented teaching roles. Hospitals and calendar dates are removed. What
1.0.0 does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-857041` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (ward bed; the ICU phase moves her to an ICU bed) |
| specialty | critical care, respiratory medicine, orthopaedics (spinal surgery) |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: three record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have an intensivist or respiratory physician (and a spinal surgeon for the bleeding questions) review it before teaching use |
| phases | `onset` 病房：第一次下床之后 / On the ward: after she first got up → `icu` 重症监护病房：约 20 分钟之后 / ICU: about 20 minutes later → `followup` 记录的病程与结局 / Recorded course and outcome — all one-way, none learner-switchable |
| content | 17 history items (7 recorded facts incl. one phase twin, 1 labelled teaching device, 9 unknown; 6 required) · 7 exam findings · 16 investigations (5 record reviews; 9 with no recorded result in any phase) · 16 interventions (5 harmful or contraindicated, 1 neutral alternative) · 6 objectives · 5 decisions (24 options) · 12 rubric items (11 deterministic, weight 27; 1 examiner-judged; 2 critical) · 4 staff + 1 relative · 6 learning outcomes · 6 teaching points · 39 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise suspected high-risk pulmonary embolism at the bedside — sudden breathlessness on first mobilising after
   major surgery with a systolic pressure < 90 mmHg, hypoxaemia, distended neck veins, one swollen leg and right-heart
   strain on the ECG — and assess the right ventricle with bedside echocardiography rather than moving an unstable
   patient to CT (ESC 2019).
2. Start high-risk PE treatment at once: IV unfractionated heparin 80 U/kg then 18 U/kg/h, noradrenaline for
   hypotension, no fluid bolus when the neck veins are distended, and intubation avoided where possible (ESC 2019;
   AHA/ACC 2026 for the vasopressor).
3. Choose a reperfusion route when major surgery within 3 weeks contraindicates systemic thrombolysis: surgical
   embolectomy or catheter-directed treatment through a multidisciplinary team first, systemic thrombolysis as the
   rescue in cardiac arrest or collapse when nothing else can start in time, weighing and watching for a spinal
   epidural haematoma (ESC 2019; AHA/ACC 2026; ERC 2025).
4. Explain why a negative preoperative leg ultrasound does not exclude a post-operative deep-vein thrombosis, and what
   a calf (distal) DVT does and does not establish in suspected PE (ESC 2019); state the essentials of
   thromboprophylaxis after spinal surgery (ACCP 2012).
5. Plan anticoagulation after reperfusion: UFH resumed without a bolus once the APTT is below twice the upper limit
   after lysis, LMWH or a direct oral anticoagulant once stable, 3 months for a surgery-provoked PE, hourly
   leg-neurology and wound checks, and review at 3–6 months for persistent breathlessness (ESC 2019; CHEST 2021).
6. Manage a cardiac arrest presumed due to PE and its aftermath by ERC 2025 and ERC–ESICM 2025: consider thrombolysis
   and continue CPR for 60–90 minutes after it, then hold oxygenation, ventilation, blood-pressure and temperature
   targets after the return of circulation and delay neuroprognostication.

These are the case's `learningOutcomes`. They name the diagnosis, so front-ends show them before play only behind the
closed **Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief (GLOSSARY §4).
The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

**On the ward (phase `onset`).** A 60-year-old woman with hypertension for 6 years, never regularly treated, had a
posterior decompression for thoracic spinal canal stenosis lasting about 3 hours. On post-operative day 8 she got out
of bed for the first time and became suddenly and severely breathless, with chest tightness and palpitations and no
chest pain or haemoptysis; the breathlessness worsened quickly. Pulse 132/min, BP 89/51 mmHg, respiratory rate 38/min,
SpO₂ 91 % on oxygen; extreme respiratory distress with cyanosed lips; distended neck veins; coarse breath sounds
without wheeze or crackles; moderate pitting oedema of the right leg. ECG: sinus tachycardia, SⅠQⅢTⅢ, complete right
bundle branch block and precordial ST depression. Bedside chest film: no clear abnormality. A preoperative leg
ultrasound had shown no thrombus.

**The arrest and the ICU (phase `icu`).** Despite oxygen her SpO₂ fell rapidly from 91 % to 50 % and, about 20 minutes
after the breathlessness began, her breathing and heartbeat stopped. Circulation returned after 4 minutes of CPR; she
was intubated and needed vasopressors to hold her blood pressure at about 90/40 mmHg. After the resuscitation a leg
ultrasound showed thrombosis in the right peroneal vein and in calf muscle (intramuscular) veins.

**Reported course and outcome (phase `followup`).** The team gave urokinase followed by anticoagulation; her
consciousness and circulation gradually recovered, and she came off the ventilator on post-operative day 13. A contrast
CT about three weeks later showed a filling defect in a branch of the right lower pulmonary artery and multiple rib
fractures related to chest compressions. Anticoagulation continued after discharge, and follow-up reported no
recurrence and no bleeding. Doses, timings, the anticoagulant and the length of follow-up are not recorded.

**Diagnosis.** High-risk (massive) pulmonary embolism with obstructive shock and cardiac arrest on post-operative day 8
after thoracic spinal decompression, from a new post-operative calf deep-vein thrombosis; rescued with systemic
thrombolysis (urokinase) despite the recent spinal surgery.

**Today's answer.** UFH with a bolus, noradrenaline, oxygen, no fluid load and an immediate multidisciplinary call while
she still has a pulse; reperfusion by the fastest feasible route once she has arrested and stays vasopressor-dependent —
catheter-directed or surgical if it can start within minutes, otherwise systemic thrombolysis despite the operation —
with the spinal team involved and hourly leg-neurology checks; then 3 months of anticoagulation for a surgery-provoked
PE and a 3–6-month review.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the record's.
- **Three one-way phases** (none learner-switchable):

| phase | time | entered when | what is there |
|---|---|---|---|
| `onset` (ward) | post-operative day 8, minutes after she first got up | start | she answers herself (breathless, a few words at a time); exam on the ward (general look, vital signs, neck veins, lungs, legs); bedside ECG and chest film; the preoperative leg-ultrasound report; the drug chart, echo, blood gas and bloods (no recorded result); decisions 1–2 |
| `icu` | about 20 minutes later and after the resuscitation | objectives 1–2 complete **and** decisions 1 and 2 right | location ICU (`location: {setting: "icu"}`); she is intubated and cannot speak — her relative relays what she said; the observation record of the arrest; the post-resuscitation leg ultrasound; decisions 3–5 |
| `followup` | the days and weeks after | all five decisions right **and** objective 4 (a reperfusion act given) | the recorded treatment course and outcome; the contrast CT report at about three weeks |

- No prompt, hint or result states the later course before its record opens. The `icu` phase description narrates the
  arrest because the phase begins after it; the urokinase, the extubation and the CT appear only in `followup` (and in
  the feedback of the decision-3 key, once committed).
- A learner who gives no reperfusion act stays in `icu`: the outcome record waits for objective 4, as in cmcr-70044.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-onset-story` Find out what happened when she got up | onset, other symptoms, chest pain/blood, operation, past illnesses and post-operative prevention asked |
| 2 | `obj-bedside-exam` Examine her and read the bedside ECG and film | vital signs, neck veins, lungs, legs examined; ECG and chest film read in `onset` |
| 3 | `obj-first-minutes` Decide on the first few minutes | decisions 1–2 right; UFH and noradrenaline given |
| 4 | `obj-next-treatment` Decide on the next key treatment | observation record read in `icu`; decision 3 right; systemic thrombolysis **or** catheter/surgical reperfusion given |
| 5 | `obj-scan-and-plan` Interpret the leg scan and plan the weeks ahead | leg ultrasound read in `icu`; preoperative report read; decisions 4–5 right |
| 6 | `obj-recorded-course` Compare your plan with what happened next | outcome record and three-week CT read in `followup` |

The journal lists later objective titles before they are reached, so the titles name no diagnosis, arrest or drug.
Hints coach with questions and contain no option text (`cases validate` checks it).

### Decisions

| id | opens after | key | distractors (why they tempt) |
|---|---|---|---|
| `first-call` | onset and operation asked; vital signs, neck veins, lungs and legs examined; ECG and film read | suspected high-risk PE: bedside echo for RV dysfunction on the ward, CT only once stable | CT angiography now with a nurse and monitor "because imaging should precede anticoagulation after surgery"; ACS from the ST depression → troponins and angiography; Wells + D-dimer to spare her contrast; post-operative septic shock → 30 mL/kg |
| `first-hour` | decision 1 right | UFH 80 U/kg + 18 U/kg/h, noradrenaline without a fluid bolus, the team called for catheter or surgical reperfusion, systemic lysis kept for rescue | alteplase now "whatever the operation" (lysis is first-line for high-risk PE); no heparin + IVC filter + a litre of fluid (fresh wound); LMWH + a litre + stay on the ward; RSI first, then heparin and CT |
| `reperfusion` | decision 2 right; observation record read in `icu` | reperfuse now by the fastest route: catheter/surgical if within minutes, else systemic lysis despite the operation, spinal team told, legs checked hourly — **the report's urokinase falls within it** | hold reperfusion now that circulation is back; CT angiography first on the ventilator; IVC filter and stop heparin; full-dose lysis "with no further thought for the operation" (no spinal team, no neuro checks) |
| `leg-scan` | leg ultrasound read in `icu`; preoperative report read | a new post-operative calf DVT: the old negative covers only that day; distal DVT supports VTE but does not alone prove PE | "proves the PE, no chest imaging ever needed"; artefact or old clot; calf clots do not embolise; "prophylaxis must have been missed" |
| `anticoag-plan` | decisions 3 and 4 right | UFH without bolus once APTT < 2 × upper limit after lysis; hourly leg and wound checks; LMWH or oral anticoagulant when stable; 3 months (surgery-provoked) | lifelong anticoagulation after an arrest; stop everything and rely on an IVC filter; full-dose DOAC at once with deep sedation and routine observations |

Every option has its own feedback naming the guidance, its body and year, and the reason. Option ids name content
(`high-risk-pe-echo`, `fastest-reperfusion`…), never correctness. No key is the uniquely longest option in English;
in Chinese one (`anticoag-plan`, 65 vs 63 characters) is, within the lint's limit of one per locale.

### Rubric (11 deterministic items, total weight 27, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-onset-story` | history | 2 | onset, other symptoms, chest pain/blood, course asked (the ICU twin credits them) |
| `rb-risk-history` | history | 1 | operation, past illnesses, post-operative prevention, allergies, bleeding history, weight asked (the last four are unknown — asking is the competency) |
| `rb-bedside-exam` | examination | 2 | vital signs, neck veins, lungs, legs examined |
| `rb-bedside-tests` | investigations | 2 | ECG, chest film and preoperative scan read; bedside echo ordered |
| `rb-recognition` | diagnosis | 3 | `first-call` right first time |
| `rb-first-minutes` | management | 3 | `first-hour` right first time; UFH, noradrenaline, high-flow oxygen and the team call given |
| `rb-reperfusion-given` | management | 4 | **critical** — systemic thrombolysis **or** catheter/surgical reperfusion given |
| `rb-reperfusion-choice` | management | 3 | `reperfusion` right first time; spinal team informed |
| `rb-no-harm` | safety | 3 | **critical** — no CT ordered in `onset` or `icu`, no 1,000 mL fluid bolus, no IVC filter, no dual antiplatelet loading; scored once decision 2 or 3 is attempted or any of these is done |
| `rb-leg-scan` | diagnosis | 2 | leg scan read in `icu`; `leg-scan` right first time |
| `rb-after-reperfusion` | management | 2 | post-arrest care and hourly neuro/wound checks given; `anticoag-plan` right first time |
| `rb-communication` | communication | (judged) | Calgary–Cambridge explanation and planning with SPIKES: calm words to her at the onset; after the arrest, the relative told what happened, the clot, the reperfusion trade-off (spinal haematoma, paralysis, death), consent, no false reassurance |

### How wrong choices score (measured with the reducer on 2026-10-30)

| path | deterministic score | critical items missed |
|---|---:|---|
| reference path (`solution`) | 27/27 (100 %) | none |
| start and do nothing | 0/24 | `rb-reperfusion-given` (`rb-no-harm` not scored) |
| wrong first answer at all five decisions, then right | 14/27 (52 %) | none |
| wrong first answer at `first-call` / `first-hour` / `reperfusion` only | 24/27 (89 %) each | none |
| wrong first answer at `leg-scan` / `anticoag-plan` only | 25/27 (93 %) each | none |
| reference path plus a 1,000 mL fluid bolus and a CT order on the ward | 24/27 (89 %) | `rb-no-harm` |
| reference path plus a CT order in the ICU, an IVC filter, or dual antiplatelet loading (each alone) | 24/27 (89 %) | `rb-no-harm` |
| reference path without any reperfusion act: the outcome record never opens and the case cannot be finished | 23/27 (85 %) | `rb-reperfusion-given` |
| catheter/surgical reperfusion instead of systemic lysis | 27/27 (100 %) | none |
| no heparin, noradrenaline or team calls before the arrest (decisions right) | 21/27 (78 %), objective 3 open | none |
| reference path without informing the spinal team | 24/27 (89 %) | none |
| reference path without post-arrest care and neuro checks | 25/27 (93 %) | none |
| only the six required history questions | 24/27 (89 %) | none |
| **known limit:** systemic thrombolysis, or intubation, given on the ward (`onset`) | 27/27 (100 %) | none — each is `contraindicated` (a safety event with its harm text in the debrief), but conditions cannot read the phase of an intervention, and the ward-phase dose then counts as the act |

### Critical items

- `rb-reperfusion-given` — the missed life-saving act: a patient who has arrested from a presumed PE and stays
  vasopressor-dependent gets reperfusion. It is an act (`intervened`), not the decision.
- `rb-no-harm` — the dangerous errors of the first hour: the trip to CT while unstable, a litre of fluid into a failing
  right ventricle, a filter instead of anticoagulation, antiplatelet loading for a presumed ACS. Its `scoredWhen` lists
  every harm and the decisions that expose them, so doing nothing does not earn it.

## Reference path (`solution`)

64 steps: start → 15 history questions (the onset, other symptoms, chest pain and blood, the course, the operation,
past illnesses, post-operative prevention, usual medicines, allergies, earlier clots, bleeding history, legs and wound,
leg swelling, weight, her worry) → high-flow oxygen, monitoring, IV access → general look, vital signs, neck veins,
lungs, legs → ECG, chest film, preoperative scan, drug chart, bedside echo, blood count, coagulation, renal function
(the last five without recorded results) → `first-call` → UFH, noradrenaline, the multidisciplinary call, the spinal
team → `first-hour` → (phase `icu`) general look, vital signs, ventilation, observation record → `reperfusion` →
systemic thrombolysis, neuro checks, post-arrest care → leg ultrasound → `leg-scan` → `anticoag-plan` → (phase
`followup`) outcome record, three-week CT → finish. `cases verify` passes; the deterministic rubric scores 27/27. The
path never asks the family-history question (an unknown with no bearing on the emergency) and never moves her to CT.

## Clinical numbers check

All numbers are those 1.0.0 extracted from the report; none is invented. 1.0.0 field → 1.1.0 field.

| value | 1.0.0 field | 1.1.0 field |
|---|---|---|
| age 60, female | `patient` | `patient` |
| hypertension 6 years, not regularly treated | `history[prior-health]` | `history[pmh]` |
| posterior decompression for thoracic canal stenosis, about 3 h | `history[surgery]` | `history[surgery]` |
| onset on post-operative day 8, first time out of bed | `history[onset]`, chief complaint | `history[onset]`, `[onset-recalled]`, triage note, D1 prompt |
| chest tightness, palpitations; no chest pain or haemoptysis; rapid worsening | `history[onset]`, `[associated]` | `history[tightness]`, `[pain-blood]`, `[course]` |
| pulse 132/min, BP 89/51 mmHg, distended neck veins, moderate right-leg pitting oedema | `exam[circulation]` | `exam[vitals-onset]`, `[neck-veins]`, `[legs]` |
| RR 38/min, extreme dyspnoea, cyanosed lips, coarse breath sounds, no wheeze or crackles | `exam[respiration]` | `exam[vitals-onset]`, `[general-look]`, `[chest]` |
| SpO₂ 91 % → 50 % on oxygen, then arrest | `investigations[oxygenation]` | `exam[vitals-onset]` (the 91 % on oxygen), `investigations[obs-record]` |
| arrest about 20 min after onset; ROSC after 4 min of CPR | `history[collapse]` | `investigations[obs-record]`, phase `icu` description, D3 prompt |
| intubated; vasopressors for about 90/40 mmHg after ROSC | triage note, `nonVerbalReason`, `investigations[oxygenation]` | `exam[general-icu]`, `[vitals-icu]`, `investigations[obs-record]` |
| sinus tachycardia, SⅠQⅢTⅢ, complete RBBB, precordial ST depression; chest film without clear abnormality | `investigations[early-records]` | `investigations[ecg]`, `[cxr]` |
| right peroneal and calf intramuscular vein thrombosis after resuscitation; none before surgery | `investigations[venous]` | `investigations[leg-us]`, `[preop-us]` |
| urokinase, then anticoagulation; consciousness and circulation recovered; off the ventilator on post-operative day 13 | `investigations[followup]` | `investigations[course-outcome]` |
| contrast CT about three weeks later: right lower pulmonary artery branch filling defect, multiple CPR rib fractures | `investigations[followup]` | `investigations[ct-week3]` |
| anticoagulation after discharge; no recurrence or bleeding reported | `investigations[followup]` | `investigations[course-outcome]` |

**Derived values (editorial, not in the record):** shock index at the onset 132/89 ≈ 1.5; mean arterial pressure at
the onset (89 + 2 × 51)/3 ≈ 64 mmHg, after the return of circulation (90 + 2 × 40)/3 ≈ 57 mmHg; onset to return of
circulation ≈ 24 min (about 20 + 4); the arrest on post-operative day 8 to extubation on day 13 = 5 days. Her weight is
not recorded, so every dose is printed as a formula (80 U/kg, 18 U/kg/h, 1 mg/kg, 0.6 mg/kg, µg/kg/min) and none is
computed. The urokinase dose is not recorded (1.0.0 omitted the historical doses), so the case prints none.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel when the woman who had just told you she couldn't breathe stopped breathing?"
2. **Description.** "In two sentences: what happened to her, and what did you put in place before and after the
   arrest?"
3. **Analysis.**
   - "Which three bedside findings made you think of an obstructed right ventricle rather than the heart's left side
     or the lungs?"
   - "Her BP was 89/51 on the ward. Why does that number change the whole pathway — tests, D-dimer, heparin?"
   - "Why UFH rather than LMWH here, and why no fluid?"
   - "What did the operation 8 days earlier do to your reperfusion options? What would you have needed to know about
     catheter or surgical treatment that night?"
   - "After the return of circulation she still needed a vasopressor. What does that tell you, and what were you
     prepared to accept to treat it?"
   - "The scan before surgery was negative. What did it tell you, and what didn't it?"
   - "How long will she be anticoagulated, and why not lifelong after something this severe?"
   - "How did you talk to her relative about a treatment that might cause paralysis?"
4. **Summary.** "What will you do in the first ten minutes the next time a patient collapses on first getting up after
   an operation?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Sending the shocked patient to CT | `pe-ctpa-now` / `ct-first` feedback; the CT result text explains the transport risk | `rb-recognition`, `rb-reperfusion-choice`, `rb-no-harm` |
| D-dimer or Wells first | `ddimer-first` feedback; D-dimer is a low-value order with no result | `rb-recognition` |
| Treating the ST depression as ACS | `acs-angiography` feedback; antiplatelet loading contraindicated | `rb-recognition`, `rb-no-harm` |
| Fluids for "low blood pressure" | `septic-shock` / `filter-and-fluids` / `lmwh-ward` feedback; fluid bolus contraindicated with harm text | `rb-first-minutes`, `rb-no-harm` |
| No heparin "because of the wound", or a filter instead | `filter-and-fluids`, `filter-stop-heparin`, `filter-no-anticoag` feedback; IVC filter contraindicated | `rb-first-minutes`, `rb-no-harm` |
| Lysis on the ward, before the alternatives were sought | `lysis-now` feedback; systemic lysis contraindicated in `onset` (safety event, see the known limit) | `rb-first-minutes` |
| No reperfusion after the return of circulation | `hold-after-rosc` feedback; the outcome record waits for a reperfusion act | `rb-reperfusion-choice`, `rb-reperfusion-given` |
| Lysis without bleeding surveillance | `lysis-no-precautions` / `doac-now-sedated` feedback; neuro checks and the spinal team are scored | `rb-reperfusion-choice`, `rb-after-reperfusion` |
| Letting the negative preoperative scan overrule the new one | `artefact-or-old` feedback | `rb-leg-scan` |
| Lifelong anticoagulation after a provoked PE | `lifelong` feedback | `rb-after-reperfusion` |
| Inventing what the record lacks (echo, gases, doses, prophylaxis) | unknown items, "no result recorded" results, `examNotRecorded` | — |

### Teaching points for the debrief

The six `debrief.teachingPoints`: (1) recognition and the diagnostic route — high-risk PE until proven otherwise,
bedside echo before CT in a deteriorating patient, no D-dimer (ESC 2019), then and now; (2) the first minutes — UFH with
a bolus, noradrenaline, no fluid, avoid intubation (ESC 2019; AHA/ACC 2026); (3) reperfusion with a contraindication —
surgical embolectomy or catheter-directed treatment first, systemic lysis as the rescue after an arrest, spinal
haematoma watch (ESC 2019; AHA/ACC 2026; Chinese guidance), then and now; (4) arrest from PE and the aftermath —
thrombolysis and 60–90 min of CPR, post-arrest targets, CPR rib fractures (ERC 2025; ERC–ESICM 2025); (5) the two leg
scans and post-operative prophylaxis (ESC 2019; ACCP 2012); (6) after reperfusion — UFH restart, DOAC, 3 months, no
routine filter, the 3–6-month review (ESC 2019; CHEST 2021).

## Embodied mode

- **Where things are (`general-hospital`).** She starts in a ward bed (`setting: "inpatient"`). Entering `icu` moves her
  to an ICU bed (`location: {setting: "icu"}`); `followup` happens there. The ward is a **staging convention**: 1.0.0
  records that she first got out of bed on post-operative day 8 but not which room she was in; an ICU follows from her
  intubation, vasopressors and ventilation until day 13. No intervention has a `destination`.
- **Kit.** The ward bed has a patient monitor, an oxygen outlet, the crash cart (IV access and drugs), infusion pumps, an
  ECG machine and a defibrillator; vital signs need the monitor (`cardiac-monitor`). The bedside chest film
  (`performedAt: "bedside"`), the bedside echo and the leg ultrasound come to her; the CT (`ct`, `performedAt:
  "provider"`) would take her to the scanner — the reference path never orders it. The ICU bed has the ventilator.
  Record reviews (`preop-us`, `drug-chart`, `obs-record`, `ct-week3`, `course-outcome`) are read at a records terminal
  or the nurses' station, never a device or a transport. The case's IV-access procedure (`iv-access`) precedes the
  heparin and noradrenaline; she has no cannula in situ (`extensions.embodied.ivAccessInSitu: false`).
- **Scope of practice.** Oxygen, monitoring, the medicines and the fluid are nursing-scope by kind; the cannula is
  `scope: "nursing"`; intubation is an airway act; the calls, the filter, the catheter or surgical reperfusion, the
  post-arrest bundle and the neuro-check plan are medical.
- **Voice.** On the ward she is a conscious adult and answers for herself, a few breathless words at a time (no
  companion answers for her). In `icu` she is intubated (`patient.nonVerbalWhen: {phase: "icu"}`, reason "intubated and
  on a ventilator after resuscitation"): her relative relays what she said ("她跟我们说过：“…”" / "She told us: “…”"),
  and the twin item `onset-recalled` answers the story there. The unknown items are listed only for the phases where
  she can speak, so the relative never relays an "I can't say" as her words; unmatched questions get the plain fallback.
- **Truthful cues — limitation.** `appearance.accessory` has no tube or ventilator value, so the figure lies in bed
  without visible devices; the exam findings say what she is on.
- **Measured (offline demonstration, 2026-10-30).** `embodied-autopilot.test.ts -t "cmcr-857041:"` passes in en and
  zh-CN: every objective done, in-world score equal to the clinical score (27/27), no "cannot do this".

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; the thoracic
decompression and its length; hypertension and its treatment; the onset on post-operative day 8 at the first time out
of bed, with chest tightness and palpitations, without chest pain or haemoptysis, rapidly worse; every vital sign and
sign at the onset; the ECG and the bedside film; SpO₂ 91 % → 50 % on oxygen; the arrest about 20 minutes after the
onset and the return of circulation after 4 minutes; intubation and vasopressors for about 90/40 mmHg; the preoperative
and post-resuscitation leg ultrasounds; urokinase then anticoagulation; recovery and extubation on post-operative day
13; the CT at about three weeks; follow-up on anticoagulation without recurrence or bleeding. The extraction table is in
the numbers check above.

**Adapted for teaching.** The staging: she is assessed on the ward at the onset and in the ICU after the arrest (1.0.0
put the learner in the ICU after the arrest, with the onset findings as records and a "companion" telling the story);
her own breathless words on the ward and her relative relaying them in the ICU (the relative, their worries and their
presence at her bedside are a teaching device — 1.0.0 does not say who was with her); her two voiced worries (teaching
devices that add no clinical fact); the five decisions, their options and feedback; the 16 interventions (the record's
step — systemic thrombolysis — and today's steps, plus the tempting wrong ones) with formula doses; the rubric; the
staff; the "no result recorded" results for the tests a clinician would ask for (echo, blood gas, blood count,
coagulation, renal function, cardiac markers, D-dimer, the drug chart, the repeat ECG and film, the CT during the
emergency); the onset vital signs combine the examination at the onset with the oxygen saturation of the oxygenation
record (the 91 % before it fell).

**Points where 1.0.0 differs with itself (kept, not resolved).**
- Recovery: the Chinese reads 意识和循环逐渐恢复 (consciousness and circulation), the English "neurological and
  circulatory recovery"; the case uses consciousness (the Chinese wording) and lists the point.
- Intubation and the return of circulation: the English triage note reads "Spontaneous circulation has returned after
  intubation", the Chinese 已恢复自主循环并接受气管插管 gives no order; the case states both events without an order.
- "Three weeks later" (三周后) does not say from which day; the CT is described as contrast-enhanced (增强CT), not as a
  CT pulmonary angiogram.
- The operation: the Chinese gives a posterior approach (后路减压), the English omits it; the case keeps "posterior".
- SpO₂: the Chinese says it fell rapidly (迅速); the English omits "rapidly"; the case keeps it.

**Unknowns kept honest** (`unknowns`, the nine unknown history items, "no result recorded" results, `examNotRecorded`):
echocardiography, blood gases and all laboratory tests; post-operative thromboprophylaxis, her usual medicines,
weight, allergies, earlier clots or bleeding, family history; leg symptoms and the wound; the arrest rhythm, CPR drugs,
the order of intubation and ROSC, the vasopressor and its dose; the urokinase dose and timing, the anticoagulant, its
dose and duration, any in-hospital bleeding; her neurology after the arrest and after lysis; the CT protocol and the
starting point of "three weeks"; the length of follow-up; the left leg, heart sounds, temperature, urine output and
lactate.

**Survey findings applied** (survey.json, template and critic sections; no case audit exists for this case):
authoring rules in the patient's mouth and the "Companion (educational role)" removed, affect `breathless` instead of
`calm` (SI-04); the bundled "ECG and bedside chest-film record" split into single tests with neutral names, a realistic
panel with "no result recorded" items and a low-value D-dimer (SI-09); interventions added — 0 → 16 (SI-11); the
3 × 3 decision template with `supported` ids and the straw man "Wait for CT weeks later before emergency assessment"
replaced by five decisions of plausible near-misses with full feedback (SI-12); the management key no longer hands the
act to a team — it names UFH with its dose, noradrenaline, the reperfusion route and the safety watch, and the critical
item is the reperfusion act itself, not `decidedFirstTry` (critic gap 3); references in one Vancouver string each, the
article first with its DOI and URL, no bare doi.org line (SI-18); this guide rewritten to the §9.6 template (SI-20).
The critic named this case as the pilot for the "ICU arrest" class.

**Privacy.** Pseudonym unique in the 125 CMCR cases; relative time only; no hospital, place, occupation or initials.
Authors' names appear only in the citation. No figure of the report is approved for display (scripts/cmcr-105-media-
review.json has no entry for this case), so the case has no assets.

## Matcher notes

- **Phase twin.** `onset-recalled` (phases `icu`, `followup`) supersedes `onset`, `tightness`, `pain-blood` and `course`
  (all `onset` only): in the ICU "what happened?" reaches the relayed story, and asking it credits the four items.
- **Shared words separated with `excludeKeywords`:** `onset` excludes other-symptom, chest, pain, worse/better and
  worry words, so those questions reach `tightness`, `pain-blood`, `course` and `worry`; `pain-blood` excludes 憋/慌/
  tight/racing so "胸口憋不憋" reaches `tightness`; `surgery` excludes after-surgery words (prevention, wound, legs);
  `pmh` excludes medicine, bleeding, stroke and family words; `regular-meds` excludes allergy and clot-prevention words;
  `legs-wound` and `leg-swelling` exclude each other's words.
- English phrases that would reduce to one stop-word token are written run together (`gotoutofbed`, `howdiditstart`,
  `doesithurt`, `whenwasthesurgery`, `whatdoyoutake`, `whenitstarted`, `howdiditbegin`, `lookather`); `cases validate
  --strict` reports 0 warnings.
- **Order entry.** A query naming 术前/pre-op/earlier/previous with a leg-scan word goes to `preop-us`; a CT query
  naming 三周/复查/later/follow-up/report goes to `ct-week3`; a bare "超声"/"ultrasound" offers the echo and the leg scan;
  a bare "CT" offers the CT in the CT room. No alias is a bare "ct" (it would match "lactate").
- The corpus (`extensions.testUtterances`, 39 paraphrases: 21 zh-CN, 18 en; every required item and the twin covered;
  four look-alike negatives about work and alcohol with `expect: []`) passes `cases verify` with no extra selections.

## References

1. 赵云霞, 殷洪山, 陈刚, 邓卓军. 致死性肺栓塞致心脏骤停救治成功一例. 中华结核和呼吸杂志. 2011;34(2):152-153.
   doi:10.3760/cma.j.issn.1001-0939.2011.02.026. Available from: https://rs.yiigle.com/cmaid/857041
2. Konstantinides SV, Meyer G, Becattini C, et al. 2019 ESC Guidelines for the diagnosis and management of acute
   pulmonary embolism developed in collaboration with the European Respiratory Society (ERS). Eur Heart J.
   2020;41(4):543-603. doi:10.1093/eurheartj/ehz405
3. Creager MA, Barnes GD, Giri J, et al. 2026 AHA/ACC/ACCP/ACEP/CHEST/SCAI/SHM/SIR/SVM/SVN guideline for the
   evaluation and management of acute pulmonary embolism in adults. Circulation. 2026;153(12):e977-e1051.
   doi:10.1161/CIR.0000000000001415
4. Stevens SM, Woller SC, Baumann Kreuziger L, et al. Antithrombotic therapy for VTE disease: second update of the
   CHEST guideline and expert panel report. Chest. 2021;160(6):e545-e608. doi:10.1016/j.chest.2021.07.055
5. 中华医学会呼吸病学分会肺栓塞与肺血管病学组, 等. 中国肺血栓栓塞症诊治、预防和管理指南（2025版）. 中华医学杂志.
   2025;105(26):2162-2194. doi:10.3760/cma.j.cn112137-20250509-01141
6. 中华医学会呼吸病学分会肺栓塞与肺血管病学组, 中国医师协会呼吸医师分会肺栓塞与肺血管病工作委员会, 全国肺栓塞与肺血管病防治协作组.
   肺血栓栓塞症诊治与预防指南. 中华医学杂志. 2018;98(14):1060-1087.
7. Lott C, Karageorgos V, Abelairas-Gomez C, et al. European Resuscitation Council Guidelines 2025 special
   circumstances in resuscitation. Resuscitation. 2025;215(Suppl 1):110753. doi:10.1016/j.resuscitation.2025.110753
8. Nolan JP, Sandroni C, et al. European Resuscitation Council and European Society of Intensive Care Medicine
   guidelines 2025: post-resuscitation care. Intensive Care Med. 2025;51(12):2213-2288. doi:10.1007/s00134-025-08117-3
9. Gould MK, Garcia DA, Wren SM, et al. Prevention of VTE in nonorthopedic surgical patients: Antithrombotic Therapy and
   Prevention of Thrombosis, 9th ed: American College of Chest Physicians evidence-based clinical practice guidelines.
   Chest. 2012;141(2 Suppl):e227S-e277S. doi:10.1378/chest.11-2297

The same strings are `debrief.references`. How the DOIs were checked: ref. 1 — the source map
(scripts/cmcr-105-sources.json `verifiedDoi`, publisher record checked 2026-10-29); refs 2–5 and 9 — as verified on
2026-10-28 by web search for the library's PE case (packages/content/cases/pulmonary-embolism-postop/README.md), each
returning a publisher, PubMed or bibliographic record with matching title, journal, volume and pages; refs 7 and 8 —
found by web search on 2026-10-30 (repository and PubMed records giving title, volume, article number or pages and
DOI; doi.org, Crossref and PubMed hosts were not reachable from this session). Ref. 6 carries no DOI (none verified).

### To verify

**In the source article (the details 1.0.0 did not carry):**
- Where she was when she got up (ward or elsewhere) and where the arrest and resuscitation took place.
- Any further vital signs (temperature) and examination (heart sounds, the left leg, the wound, leg neurology), and
  whether the right-leg oedema was new.
- The arrest rhythm, the drugs given during CPR, whether intubation came before or after the return of circulation,
  and the vasopressor used and its dose.
- Any echocardiogram (right-ventricular size and function, pulmonary pressure), blood gases and laboratory results
  (blood count, coagulation, renal function, troponin, BNP, D-dimer).
- The urokinase regimen (dose, duration) and when it was started relative to the arrest and the return of
  circulation; whether heparin was given before, during or after it; the anticoagulant afterwards, its dose and
  duration.
- Post-operative thromboprophylaxis (mechanical or drug) before the event.
- Any bleeding (wound, epidural haematoma) or neurological deficit after the thrombolysis; her neurological state after
  the arrest beyond "consciousness gradually recovered".
- The CT: its protocol (CT pulmonary angiography or a contrast chest CT), from when "three weeks" is counted, the extent
  of the filling defect and of the rib fractures.
- How long follow-up lasted, and whether persistent breathlessness or CTEPH was assessed.
- The 1.0.0 inconsistencies listed under "Source and adaptation".

**In the guidance (stated from secondary sources or from memory):**
- **ESC 2019 classes as quoted** (I for UFH with a bolus, systemic lysis in high-risk PE, surgical embolectomy when
  lysis is contraindicated, anticoagulation during the work-up when suspicion is high, DOAC over VKA and stopping after
  3 months for a first PE with a major transient risk factor; IIa for noradrenaline and catheter-directed treatment;
  IIb for ECMO; III for routine IVC filters); the "major surgery within the previous 3 weeks" absolute contraindication
  (seen in a 2019 table reproduced in a secondary article); whether the 2019 table keeps the 2014 footnote that absolute
  contraindications may become relative in immediately life-threatening PE; the distal-DVT recommendation (further
  testing to confirm PE, IIa per memory); the ≤ 500 mL fluid wording; "traumatic resuscitation" as a relative
  contraindication to thrombolysis (ESC 2019 table, from memory; also in the Chinese 2018 table per memory).
- **AHA/ACC 2026** (secondary summaries only): category E (cardiopulmonary failure; E1 persistent hypotension or shock,
  E2 refractory shock or arrest), class 2a for systemic lysis, catheter-directed lysis and thrombectomy in category E,
  norepinephrine as the first vasopressor, PERT assessment for categories C–E (class 1), LMWH preferred over UFH for
  most hospitalised patients; how it handles a recent-surgery contraindication.
- **ERC 2025 special circumstances** (secondary): consider thrombolysis when PE is the suspected cause, CPR for 60–90 min
  after it, extracorporeal CPR for selected patients; the adult alteplase dosing it gives was not printed in the case.
- **ERC–ESICM 2025 post-resuscitation care**: the MAP target (> 60–65 mmHg in a secondary summary; the case prints
  ≥ 65 mmHg), SpO₂ 94–98 %, the duration of fever prevention and the 72-hour prognostication rule; the full author list
  (cited as "Nolan JP, Sandroni C, et al.").
- **ACCP 2012**: the exact spinal-surgery wording and grades (mechanical prophylaxis preferably IPC, 2C; drug
  prophylaxis added for high-risk patients when bleeding risk allows, 2C).
- **Chinese guidance**: the 2018 guideline's last page (1086 or 1087), its contraindication table (whether recent brain
  or spinal-cord surgery is absolute and recent surgery relative), the alteplase 50 mg over 2 h regimen, the urokinase
  regimens, and its wording on re-weighing contraindications in life-threatening PE; the 2025 guideline was identified
  but its full text was not read.
- **UFH after lysis**: the "APTT below twice the upper limit, no bolus" restart rule (alteplase labelling and common
  practice; the guideline sentence was not read).

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Staging.** Three one-way phases: the ward at the onset (she speaks), the ICU after the arrest (intubated; her
  relative relays), the recorded course. 1.0.0 opened in the ICU after the arrest with the onset findings as records.
- **Voice.** Persona fields written for a breathless, frightened 60-year-old (affect `breathless`, not `calm`); the
  "Companion (educational role)" and every authoring rule in the patient's mouth removed; lay unknowns ("这个我说不上来，
  医生。" / "I'm not sure, doctor."); `nonVerbalWhen: {phase: "icu"}`.
- **History.** 15 template items (six about vaccines, environment, height and the like) → 17 case items: the onset
  story split into its recorded parts, the operation, hypertension, a phase twin for the ICU, nine honest unknowns that
  matter here (post-operative prophylaxis, medicines, allergies, earlier clots, bleeding history, legs and wound, leg
  swelling, weight, family), one labelled worry.
- **Examination.** 2 bundled findings → 7 (vital signs, general look, neck veins, lungs, legs on the ward; general look
  and vital signs in the ICU).
- **Investigations.** 4 bundled records → 16 single tests: bedside ECG and film, bedside echo, leg ultrasound, the
  preoperative report, the drug chart, the observation record, the three-week CT, the outcome record, and "no result
  recorded" bloods, gases and markers, a low-value D-dimer and a harmful CT during the emergency.
- **Interventions.** 0 → 16, with formula doses and a response on each.
- **Decisions.** 3 template decisions with `supported` ids → 5 (first call, first minutes, reperfusion, leg scan,
  anticoagulation plan), 4–5 plausible options each with their own feedback; the report's urokinase is part of the
  decision-3 key (rescue lysis after the arrest), the reflex ward-phase lysis a distractor of decision 2.
- **Rubric.** 11 items with a `decidedFirstTry`-only critical item → 12 items with two critical acts
  (`rb-reperfusion-given`, `rb-no-harm` with `scoredWhen`) and a Calgary–Cambridge/SPIKES communication item.
- **Teaching layer.** 4 → 6 learning outcomes; 3 → 5 key reasoning points; 3 → 6 dated teaching points (then and now);
  4 → 9 references in Vancouver form; 1 → 4 staff; 1 → 7 specific unknowns; the conclusion rewritten with the numbers.
- **Card.** Title without "collapse" ("Sudden breathlessness after spinal surgery · 60-year-old woman"); a new summary
  and triage note; specialty `general-surgery` → `orthopedics` (spinal surgery), `critical-care`,
  `respiratory-medicine`; topic tags; difficulty 4, 35 min.
- **Governance.** `provenance.review` editorial (2026-10-30) with eight named guidelines and the §6 notes;
  `extensions` in the collection schema (`sourceDoi`, `doiVerifiedAt`, `sourceTextChecked: false`) instead of
  `sourceDoiVerification`.

### 1.0.0 — 2026-10-28

- Initial template version (PR #5): 15 history items, 2 exam findings, 4 records, 3 decisions, no interventions.

## Validation

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-857041/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-857041 --lang en          # solution 64 steps · objectives 6/6 · decisions 5/5 · utterances 39/39 · rubric 27/27
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-857041          # depth floor, do-nothing 0, wrong-first 14/27 < 27/27
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-857041:"   # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-857041:"   # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 60岁女性，高血压 6 年未规范治疗，因胸椎管狭窄行后路减压术（约 3 小时）。术后第 8 天第一次下床时突发严重气促、
胸闷、心慌，无胸痛和咯血，并迅速加重：心率 132 次/分，血压 89/51 mmHg，呼吸 38 次/分，吸氧下 SpO₂ 91%，极度呼吸困难、口唇
发绀，颈静脉怒张，双肺呼吸音粗、无干湿啰音，右下肢中度指凹性水肿；心电图示窦性心动过速、SⅠQⅢTⅢ、完全性右束支传导阻滞和胸前
导联 ST 段压低，床旁胸片无明显异常；术前下肢超声未见血栓。约 20 分钟后 SpO₂ 迅速降至 50%，呼吸心跳停止，心肺复苏 4 分钟后
恢复自主循环，气管插管，需升压药维持血压约 90/40 mmHg；复苏后超声见右侧腓静脉及小腿肌间静脉血栓。原报告团队用尿激酶溶栓后
抗凝，意识和循环逐渐恢复，术后第 13 天撤机；约 3 周后增强CT见右下肺动脉分支充盈缺损和胸外按压相关的多发肋骨骨折；出院后抗凝
随访无复发或出血。诊断：脊柱术后高危肺栓塞致心脏骤停。患者事实沿用 1.0.0 版的提取内容，尚未对照原文全文核对。

**学习目标。**

1. 在床旁识别疑似高危肺栓塞，并按 ESC 2019 用床旁超声心动图而不是把不稳定的患者送去CT来评估右心室。
2. 立即开始处理：普通肝素 80 U/kg 推注后 18 U/kg/h、去甲肾上腺素、颈静脉怒张时不补液、尽量避免插管。
3. 3 周内大手术使全身溶栓成为禁忌时，经多学科团队首选外科取栓或导管介入；心脏骤停后来不及时以全身溶栓抢救，并监测椎管内血肿。
4. 解释术前阴性的下肢超声为何不能排除术后血栓，以及小腿血栓对肺栓塞能说明和不能说明什么；说出脊柱术后血栓预防的要点。
5. 制定再灌注后的抗凝计划：恢复普通肝素、改为低分子肝素或口服抗凝药、手术诱发者抗凝 3 个月、观察下肢神经和伤口、3–6 个月复诊。
6. 按 ERC 2025 和 ERC–ESICM 2025 处理肺栓塞所致的心脏骤停及复苏后阶段。

**关键决策。**

- 第 1 项（病房）：疑似高危肺栓塞——床旁超声心动图，不送CT；干扰项为立即送CT、按急性冠脉综合征处理、先查D-二聚体、按感染性休克补液。
- 第 2 项（病房）：普通肝素加负荷量、去甲肾上腺素、不补液、呼叫团队准备导管或外科再灌注，全身溶栓留作抢救；干扰项为立即全身溶栓、
  不用肝素改放滤器并补液、低分子肝素加补液留病房、先插管。
- 第 3 项（重症监护病房）：骤停后仍依赖升压药——以最快可行的方式立即再灌注，来不及时不顾近期手术全身溶栓（原报告的尿激酶即属此类），
  并通知脊柱外科、每小时查下肢；干扰项为循环恢复后暂缓、先送CT、放滤器停肝素、溶栓却不观察出血。
- 第 4 项：术后新形成的小腿深静脉血栓支持静脉血栓栓塞，但单凭它不能确诊肺栓塞；术前阴性只代表当时。
- 第 5 项：溶栓后 APTT 回落即不推注恢复肝素，观察下肢神经和伤口，稳定后改低分子肝素或口服药，手术诱发者抗凝 3 个月。

**复盘要点。**

- 大手术后首次下床时突发气促伴休克，按高危肺栓塞处理：床旁评估右心室，不送CT、不查D-二聚体（ESC 2019）。
- 普通肝素、去甲肾上腺素、不补液、尽量不插管（ESC 2019；AHA/ACC 2026）。
- 有溶栓禁忌时首选外科或导管再灌注；心脏骤停后来不及时全身溶栓是救命手段，同时警惕椎管内血肿（ESC 2019；AHA/ACC 2026；中国指南）。
- 肺栓塞所致骤停考虑溶栓并继续复苏 60–90 分钟；复苏后的氧合、通气、血压和体温目标（ERC 2025；ERC–ESICM 2025）。
- 术前阴性超声不能排除术后血栓；脊柱术后以机械预防为主，高危者在出血风险允许时加用药物（ACCP 2012）。
- 手术诱发的首次肺栓塞抗凝 3 个月，不常规放滤器，3–6 个月复诊评估持续气促（ESC 2019；CHEST 2021）。
- 本病例为人工智能辅助编写、经编辑审核的教学设计；患者事实尚未对照原文全文核对，尚未经执业医师审核（待核实清单见上文“To verify”）。
