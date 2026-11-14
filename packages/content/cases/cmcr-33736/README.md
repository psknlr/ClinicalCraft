# cmcr-33736 — Right leg pain and numbness for six hours · 29-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 温萌, 舒礼良, 苏刚, 徐敬. Stanford A型主动脉夹层合并骨筋膜间隔综合征一例.
中华心血管病杂志. 2014;42(2):169-170. Version 1.1.0 re-authors the case to the clinical content standard **from the facts
that version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet
been checked against the full source article** (STANDARD §6). The patient (周清和 / Zhou Qinghe) is a pseudonym; the ED
nurse (葛护士 / Nurse Ge), the attending (裴医生 / Dr Pei), the vascular surgeon (柯医生 / Dr Ke) and the cardiac surgeon
(龙医生 / Dr Long) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not record stays
unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-33736` / `1.1.0` |
| setting / facility | `emergency` / `general-hospital` (ED resus bay; a ward bed from phase `course`) |
| specialty | emergency medicine, vascular surgery (cardiac surgery, the discipline of the answer, is left off the card so that it gives nothing away) |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30) and an independent AI-assisted review with fixes (2026-11-14); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a vascular or cardiac surgeon or an emergency physician review it before teaching use |
| phases | `arrival` 急诊到院 / Arrival in the emergency department → `workup` 急诊检查结果 / Results in the emergency department → `course` 记录的手术经过 / The recorded operations (ward) → `followup` 记录的结局 / Recorded outcome — all one-way, none learner-switchable |
| content | 23 history items (4 recorded facts, 1 labelled teaching device, 18 unknown; 7 required) · 6 examination findings (all recorded) · 15 investigations (2 record reviews; 9 without a recorded result) · 17 interventions (6 harmful: thrombolysis and blind embolectomy always contraindicated; heparin, the 48-hour deferral, the stent graft and ICU observation contraindicated once the CT has been read; 4 of them `critical`) · 6 objectives · 5 decisions (24 options) · 12 rubric items (11 deterministic, weight 25; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 5 teaching points · 48 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise acute arterial ischaemia in a pale, cold leg with absent distal pulses, numbness and weakness, grade it as
   immediately threatened (ESVS 2020 acute limb ischaemia guideline, modified Rutherford categories) and tell it apart
   from deep-vein thrombosis and isolated compartment syndrome.
2. Read a weak femoral pulse and aorto-iliac involvement on duplex as an inflow problem that may begin in the aorta, and
   image the whole aorta by CT angiography before any thrombolysis or embolectomy (ESC 2024 aortic guideline: contrast CT
   from the neck to the pelvis first in a suspected acute aortic syndrome).
3. Integrate a type A dissection on CT, a malperfused leg and a compartment pressure of 35 mmHg into one process, and
   explain why a "safe" gradient worked out from systemic diastolic pressure cannot exclude compartment syndrome in a leg
   without inflow.
4. Commit to immediate repair of the ascending aorta for acute type A dissection with leg malperfusion, with the leg's
   flow rechecked and its compartments decompressed in the same operation, and IV beta-blockade before theatre to a
   heart rate of 60–80/min and a systolic pressure below 120 mmHg or the lowest that keeps organs perfused (ACC/AHA 2022).
5. Anticipate hyperkalaemia, myoglobinuria and acute kidney injury when a leg ischaemic for more than six hours is
   reperfused, plan the monitoring, and treat an admission creatinine and potassium that are not raised as a baseline rather than
   reassurance.
6. Plan life after dissection repair at 29 — lifelong aortic imaging, blood-pressure control, genetic evaluation and
   screening of first-degree relatives (ACC/AHA 2022) — and explain how the report's sequence (decompression 8 hours
   after admission, aortic repair 48 hours later) differs from current practice.

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list.

## Clinical summary (spoilers)

**Presentation.** A 29-year-old man arrives with six hours of pain and numbness in his right leg, which is difficult
to move; the calf has swollen and movement is restricted; the right leg is colder and paler than the left. Examination: the
right calf is swollen, painful, pale and colder than the left; the **right femoral pulse is weak**, the right popliteal
and dorsalis pedis pulses cannot be felt and the corresponding left pulses can; the groin is tender (side not
recorded); movement of the right leg is impaired. **Blood pressure on admission 128/76 mmHg**; no other vital sign is
recorded, and nothing about chest, back or abdominal pain, past history, medicines or allergies.

**Investigations.** **Duplex:** hypoechoic filling of the lower abdominal aorta and the right common iliac, external
iliac and femoral arteries; no flow in the right popliteal, anterior tibial and posterior tibial arteries. **CT
angiography:** **Stanford type A aortic dissection** with iliac involvement and moderate-to-severe narrowing of the lumen.
**Right leg compartment pressure 35 mmHg** (compartment, method and time not recorded). **On admission:** creatinine
55.8 μmol/L, potassium 3.8 mmol/L, urea 4.9 mmol/L (no reference ranges recorded; 1.0.0 calls the creatinine normal).

**Diagnosis.** Acute Stanford type A aortic dissection presenting as malperfusion of the right leg (iliac involvement),
complicated by compartment syndrome of the leg (the report's title: Stanford A 型主动脉夹层合并骨筋膜间隔综合征).

**Recorded course.** Decompressive incision (fasciotomy) **8 hours after admission**; **48 hours later** (the anchor is not
stated) replacement of the ascending aorta and arch with an **elephant-trunk** procedure; secondary closure of the incision
**one week after the decompression**; discharge **35 days after surgery**. Limb function, renal function, discharge
medicines, follow-up and the long-term outcome are not recorded.

**Today's answer (ACC/AHA 2022).** Suspected or confirmed acute type A dissection calls for emergency surgical evaluation
and immediate surgery, and lower-extremity malperfusion for immediate repair of the ascending aorta; the leg is
reassessed after central repair (a femoro-femoral bypass if flow does not return) and decompressed in the same operation.
Before theatre: with his heart rate and blood pressure on the monitor, IV beta-blockade to a heart rate of 60–80/min and a systolic pressure below 120 mmHg or the lowest that
keeps organs perfused; no thrombolysis; no full heparin once the dissection is known (and, with the aorta involved at 29,
none before the CT: the aorta is imaged first — contrast CT from the neck to the pelvis, ESC 2024). The recorded 8-hour/48-hour
sequence is the historical contrast the debrief draws — its reasons are not recorded.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness and timing but change nothing — the course is the recorded
  one. There is no monitor baseline: the monitoring step's response says only the admission blood pressure is recorded.
- **Four one-way phases** (none learner-switchable; records read in an earlier phase stay readable by phase):
  - `arrival` — the history in his own words (recorded: pain, numbness, difficulty moving, six hours, calf swelling and
    restricted movement, the right leg colder and paler; the rest unknown), the six recorded examination findings
    (blood pressure on admission; inspection; temperature and calf; pulses; groin; movement), decision 1, the **bedside
    arterial duplex** and decision 2. A CT angiogram, compartment pressure or admission bloods ordered here return the
    same recorded result as in `workup` (their times are not recorded); every unrecorded test answers "No result is
    recorded for this test".
  - `workup` — opens once `obj-leg` (history, examination, decision 1) and `obj-next-test` (duplex read, blood pressure,
    decision 2) are done. The **CT angiogram** (the patient goes to the CT room), the **compartment pressure**, the
    **admission renal function and electrolytes**, the unrecorded pre-operative tests, decision 3, decision 4 and a
    **committed treatment act** — the emergency-surgery call or one of the three diversions (decompress now and operate
    after 48 hours, a stent graft instead of open surgery, ICU observation).
  - `course` — opens once `obj-integrate` and `obj-plan` are also done, and moves him to a **ward bed** (`location:
    {setting: "ward"}`, a staging convention: where he was after the operations is not recorded). The **operation
    notes** (decompression at 8 hours, aortic repair 48 hours later, closure at one week), the follow-up plan, the
    genetics referral and decision 5.
  - `followup` — opens once all five earlier objectives (and so all five decisions) are done: the **reported course and
    outcome** record.
- No prompt, hint, order response or harm text states a later phase's result before its record opens. One wrong-option
  feedback names what the recorded team did once the learner has committed: decision 4's `decompress-then-48h` ("it
  resembles the recorded sequence"), which a learner can read before the operation notes. Harm texts of the diversions
  name the dissection only once the CT has been read (they are contraindicated from then on).

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-leg` Assess the leg | presenting complaint, onset, swelling, cold and pale asked; inspection, temperature/calf, pulses and movement examined; `limb-threat` right |
| 2 | `obj-next-test` Choose the next test | duplex read (phase `arrival`); blood pressure taken; `next-step` right |
| 3 | `obj-integrate` Put the new results together | CT angiogram, compartment pressure and renal panel read (either ED phase); `diagnosis` right |
| 4 | `obj-plan` Decide on treatment and start it | `treatment-plan` right **and** one committed act: emergency surgery, or a diversion (`delay-48h`, `stent-graft-instead`, `icu-observation`) |
| 5 | `obj-after` Review the recorded course and plan ahead | operation notes read (phase `course`); `after-repair` right |
| 6 | `obj-outcome` Read the recorded outcome | outcome record read |

Titles name no finding, test or treatment (the journal lists later titles before they are reached). Hints are Socratic
questions ("Is this leg short of arterial blood, of venous drainage or of room?"; "Of the two dangers, which kills
first?"). `obj-plan` needs a committed act, as cmcr-1653411 does with its reperfusion act: the recorded operations open
only once the learner has acted, and the act is the learner's choice — the critical act can still be missed by a
diversion.

### Decisions

- **1 `limb-threat`** (single; needs the four recorded history items and the four limb examinations). Key:
  `threatened-arterial` — acute arterial ischaemia threatening the limb now; the weak femoral pulse puts the block at the
  groin or above. Distractors: `venous-thrombosis` (phlegmasia alba dolens), `compartment-alone` (the swollen calf as the
  cause), `viable-limb` (Rutherford I, heparin and imaging within 24 h).
- **2 `next-step`** (single; needs decision 1, the duplex read in `arrival` and the blood pressure). Key:
  `aorta-to-feet-cta` — CT angiography from the neck to the feet now, vascular surgeon present, no thrombolysis or
  embolectomy until the aorta has been seen. Distractors: `lysis-now`, `groin-embolectomy`, `heparin-rescan` (full heparin
  and a repeat duplex in 24 h), `runoff-only-cta` (abdomen, pelvis and legs only — the nearest miss).
- **3 `diagnosis`** (single; needs decision 2 and the CT, compartment pressure and renal panel). Key:
  `one-process-malperfusion` — one type A dissection reaching the iliac arteries starves the leg, now with compartment
  syndrome; the ascending aorta is the first threat to life. Distractors: `separate-iliac` (two problems, the ascending
  aorta "electively"), `gradient-reassures` (76 − 35 = 41 mmHg "excludes" compartment syndrome), `normal-bloods-viable`
  (normal potassium and creatinine "prove" viable muscle), `false-lumen-embolus` (anticoagulate, embolectomy, watch the
  aorta).
- **4 `treatment-plan`** (single; needs decision 3). Key: `repair-now-same-sitting` — emergency open repair of the
  ascending aorta now; in the same anaesthetic recheck the leg's flow, bypass if needed, four-compartment fasciotomy; IV
  beta-blocker and analgesia meanwhile, no heparin or lysis. Distractors: `decompress-then-48h` (the report's own
  sequence), `leg-first-bypass` (reperfusion first — a real debate, which ACC/AHA 2022 settles for the leg),
  `stent-graft-entry` (TEVAR), `icu-watch` (medical observation).
- **5 `after-repair`** (select all; needs decision 4 and the operation notes in `course`). Keys:
  `lifelong-aortic-imaging`, `heritable-evaluation`, `rate-pressure-control`. Distractors: `no-further-imaging`,
  `genetics-if-family`.

Every option has its own feedback naming the ESVS 2020 acute limb ischaemia guideline, ACC/AHA 2022 aortic disease
guidance, ESC 2024 aortic guidance (CT from the neck to the pelvis), the 2025 ACC/AHA acute coronary syndrome guideline
(contraindications to fibrinolysis) or McQueen and Court-Brown (1996). Option ids name their content. **No length
cue:** in no decision is the key the uniquely longest option, in either language (measured on 2026-11-14, characters
zh-CN / en: decision 1 key 45 / 149 of 41–50 / 129–184; decision 2 key 50 / 152 of 35–51 / 111–155; decision 3 key
51 / 166 of 44–64 / 152–169; decision 4 key 68 / 220 of 36–69 / 122–228; decision 5 keys 44, 46, 32 / 113, 161, 104
against distractors 32, 23 / 106, 67 — the keys are not exactly the longest options).

### Rubric (11 deterministic items, total weight 25, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-leg-history` | history | 2 | presenting complaint, onset, swelling, cold/pale asked |
| `rb-risk-screen` | history | 1 | chest/back/abdominal pain, blood pressure, heart or vessel disease, family history, medicines, allergies asked (all unknown — asking is the competency) |
| `rb-leg-exam` | examination | 2 | blood pressure, inspection, temperature/calf, pulses, movement examined |
| `rb-limb-threat` | diagnosis | 2 | `limb-threat` right first time |
| `rb-aortic-imaging` | investigations | 3 | `next-step` right first time, duplex read in `arrival`, CT angiogram ordered (either ED phase) |
| `rb-integration` | diagnosis | 3 | `diagnosis` right first time |
| `rb-emergency-repair` | management | 4 | **critical** — `treatment-plan` right first time **and** `emergency-surgery` given while indicated (`indicatedWhen`: phase `arrival` or `workup`, i.e. before the recorded operations open) |
| `rb-limb-care` | management | 2 | fasciotomy and the in-theatre recheck of the leg's flow given while indicated (after the ED arrival phase and before the operation notes are read), reperfusion watch given |
| `rb-bedside-care` | management | 1 | IV access, monitoring, analgesia, beta-blocker, vascular surgeon called |
| `rb-no-harm` | safety | 3 | **critical** — no thrombolysis, blind embolectomy, deferral for 48 h, stent graft or ICU observation, and no full heparin given while contraindicated (`{"intervened": "heparin", "valid": false}`: after the CT has been read); scored once decision 2 or 4 is attempted or any of these harms is done |
| `rb-after-repair` | management | 2 | `after-repair` right first time, follow-up plan and genetics referral given |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: the split main artery explained in plain words, why the operation cannot wait, the risks (bleeding, stroke, kidneys, the leg), his question about losing the leg answered honestly, consent; later why lifelong scans and genetics matter |

### How wrong choices score (measured with the reducer on 2026-11-14)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 25/25 (100 %) | none | passes |
| start and do nothing | 0/22 (0 %), cannot finish | `rb-emergency-repair` | passes |
| wrong first answer at all five decisions, then right | 11/25 (44 %) | `rb-emergency-repair` | passes |
| wrong first answer at decision 1 only | 23/25 (92 %) | none | passes |
| wrong first answer at decision 2 only | 22/25 (88 %) | none | passes |
| wrong first answer at decision 3 only | 22/25 (88 %) | none | passes |
| wrong first answer at decision 4 only | 21/25 (84 %) | `rb-emergency-repair` | passes |
| wrong first answer at decision 5 only | 23/25 (92 %) | none | passes |
| thrombolysis at arrival, then the reference path | 22/25 (88 %) | `rb-no-harm` | **fails** (`thrombolysis`) |
| blind groin embolectomy at arrival, then the reference path | 22/25 (88 %) | `rb-no-harm` | passes (`critical: false`) |
| "decompress now, operate after 48 h" instead of the emergency call | 16/25 (64 %) | `rb-emergency-repair`, `rb-no-harm` | **fails** (`delay-48h`) |
| … with the emergency call made afterwards, in phase `course` | 16/25 (64 %) | `rb-emergency-repair`, `rb-no-harm` | **fails** (`delay-48h`) |
| stent graft instead of the emergency call | 16/25 (64 %) | `rb-emergency-repair`, `rb-no-harm` | **fails** (`stent-graft-instead`) |
| ICU observation instead of the emergency call | 16/25 (64 %) | `rb-emergency-repair`, `rb-no-harm` | **fails** (`icu-observation`) |
| reference path with no treatment act after decision 4 (the operations never open; cannot finish) | 17/25 (68 %) | `rb-emergency-repair` | passes |
| reference path plus full heparin after the CT | 22/25 (88 %) | `rb-no-harm` | passes (`critical: false`) |
| reference path plus full heparin at arrival, before the CT | 25/25 (100 %) | none | passes (not credited, not penalised) |
| full heparin at arrival and nothing else | 0/22 (0 %), cannot finish | `rb-emergency-repair` | passes |
| fasciotomy only after the operation notes, or none | 23/25 (92 %) | none | passes |
| reference path without monitoring, cannula, analgesia, beta-blocker and the vascular call | 24/25 (96 %) | none | passes |
| reference path without the six risk-screen questions | 24/25 (96 %) | none | passes |
| reference path without the follow-up plan and genetics referral | 23/25 (92 %) | none | passes |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The avoided-harm item
counts only once the harm was possible (`scoredWhen`), so doing nothing earns 0 — and heparin before the CT, which is
not a harm here, does not open it either (its trigger is `{"intervened": "heparin", "valid": false}`). **Timing.**
`emergency-surgery` is "indicated" only in the two ED phases, `fasciotomy` from the CT phase until the operation notes
are read, and `limb-flow-check` once surgery is called and before the notes are read; the rubric counts only doses given
in those windows (`whenIndicated`), so none of these acts can be credited in hindsight after reading what the recorded
team did. The web shows "✓ Indicated" for a dose given in its window; the beta-blocker shows it only once the monitor is
on and the CT has been read (its precondition: heart rate and blood pressure seen first). **Heparin** has no "indicated"
window: ESVS 2020 recommends immediate heparin for acute limb ischaemia, but in a 29-year-old whose weak femoral pulse
and duplex point to the aorta a dissection has to be excluded first (the CT takes minutes), so heparin before the CT is
neither credited nor penalised (the `heparin-rescan` feedback and teaching point 1 say why), and once the CT has been
read it is contraindicated and costs `rb-no-harm`. **Known limits:** a calf decompressed before the CT (in `arrival`) is
not credited; monitoring, analgesia and the vascular call are not time-gated (non-critical, weight 1).

### Critical items

`rb-emergency-repair` (the missed life-saving act: deciding on immediate repair of the ascending aorta **and** calling the
operation before the recorded operations open) and `rb-no-harm` (the dangerous errors: thrombolysis or a blind
embolectomy before the aorta is imaged, full heparin after the CT, or putting the aortic operation off for 48 hours,
replacing it with a stent graft or watching him in ICU). Both are acts; neither reads a final-phase record.

**Safety outcome.** `thrombolysis` (always contraindicated: suspected aortic dissection is an absolute contraindication
to fibrinolysis), `stent-graft-instead`, `delay-48h` and `icu-observation` (contraindicated once the CT has shown the
type A dissection: each leaves the ascending aorta untreated for hours to days, with rupture, tamponade or coronary
involvement possible at any time) are `critical: true` — giving one of them then fails the assessment's safety outcome
(`safety.passed: false`) whatever the score, and every debrief and export shows it. `blind-embolectomy` (high risk) and
`heparin` (moderate) are `critical: false`: a groin exploration that meets a dissected artery can stop and image, and
heparin is reversible and is given for bypass anyway — both are recoverable misjudgements that still lose the critical avoided-harm
item `rb-no-harm`.

## Reference path (`solution`)

73 steps, static clock: start → presenting complaint, onset, swelling, cold and pale → blood pressure, inspection,
temperature/calf, pulses, movement, groin → monitoring, IV access and bloods, analgesia, vascular surgeon → chest/back/
abdominal pain, onset speed, activity at onset, injury, faints or neurological symptoms, palpitations or breathlessness,
earlier walking pain → `limb-threat` → **bedside duplex** (read in `arrival`) → blood-pressure history, heart and vessel
history, other illness, operations, medicines, allergies, stimulant drugs, smoking, family history, last meal, urine,
his worry → `next-step` → (phase `workup`) **CT angiogram**, **compartment pressure**, **renal panel**, then blood count,
clotting, crossmatch, CK, lactate, ECG and echo (no results recorded) → `diagnosis` → **esmolol** → **fasciotomy** →
`treatment-plan` → **emergency surgery** → (phase `course`) recheck of the leg's flow in theatre → reperfusion watch →
operation notes → follow-up plan → genetics referral → `after-repair` → (phase `followup`) outcome record → finish.
`cases verify` passes: objectives 6/6, decisions 5/5, rubric 25/25, utterances 48/48.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 29-year-old man | `patient.age`, `sex`; README | `patient.age`, `sex`; title |
| right leg pain and numbness for six hours | `chiefComplaint`; `history.onset` ("有 6 小时了") | `chiefComplaint` (lay words); `history.onset`; `triageNote`; decision 1 prompt |
| leg hurts, numb, difficult to move | `history.presentation`; `openingLine` | `history.presenting` (volunteer); `openingLine` |
| calf swollen, movement restricted | `history.progression` | `history.swelling` |
| right leg colder and paler than the left | `history.associated` | `history.cold-pale` |
| right calf swollen, painful, pale, colder than the other side | `exam.exam-1` | `exam.leg-look` (swollen, pale) and `exam.leg-feel` (painful, colder) |
| right femoral pulse weak; popliteal and dorsalis pedis (zh "腘及足背动脉"; en "popliteal/pedal") not palpable; left pulses palpable | `exam.exam-2` | `exam.pulses` (the zh wording kept: dorsalis pedis) |
| groin tenderness; impaired right-leg movement | `exam.exam-3` | `exam.groin` (no side), `exam.leg-movement` |
| BP on admission 128/76 mmHg | `investigations.pressure` | `exam.vitals` (phases `arrival`, `workup`); triage note; compartment-pressure note |
| duplex: low-echo filling of lower abdominal aorta (zh 腹主动脉下段; en "distal aorta") and right common iliac, external iliac, femoral arteries; no right popliteal, anterior or posterior tibial flow | `investigations.doppler` | `investigations.duplex` result `arrival` (bedside order) |
| Stanford A dissection; iliac involvement; moderate-to-severe luminal narrowing | `investigations.cta` | `investigations.cta` results `arrival` and `workup` (same report) |
| right lower-limb compartment pressure 35 mmHg | `investigations.pressure` | `investigations.compartment-pressure` results `arrival`, `workup` (`values`: 35 mmHg) |
| creatinine 55.8 μmol/L, potassium 3.8 mmol/L, urea 4.9 mmol/L; "正常入院肌酐" (safety option) | `investigations.renal`; `decisions.safety` | `investigations.renal` results `arrival`, `workup`, dated "on admission" (`values`, no reference range, no flag) |
| decompression 8 h after admission; ascending aorta and arch replacement with elephant trunk 48 h later; secondary closure 1 week after the incision; discharge 35 days after surgery | `investigations.outcome` | `investigations.operative-record` result `course`; `investigations.outcome` result `followup` |
| trauma history, pressure method, lactate, CK, long-term function absent | `unknowns` | `history.injury` (unknown); compartment-pressure note; `ck`, `lactate` (`available: false`); 8 `unknowns` |

**Times.** Recorded: six hours of symptoms at presentation; decompression 8 hours after admission; the aortic operation
"48 hours later" (1.0.0 does not say after what: after admission, or after the decompression — the case keeps "48 hours
later" unanchored in both languages); closure one week after the incision; discharge 35 days after surgery (1.0.0 does
not say after which operation). Not recorded: the times (and, for the scans, the places) of the duplex, the CT, the
compartment measurement and the bloods (the bloods are "on admission" from 1.0.0's own wording) — the case dates the
scans "time and place not recorded" and shows the duplex at arrival and the CT, pressure and bloods in `workup` as staging.

**Derived values.** Diastolic-minus-compartment gradient 76 − 35 = 41 mmHg (only if both were measured at the same time,
which is not recorded; used in decision 3 to teach why it does not reassure in a leg without inflow). Creatinine 55.8
μmol/L ≈ 0.63 mg/dL (÷ 88.4). No other derivation is possible (no weight, heart rate or other value).

**Guidance numbers used in teaching text** (doses as formulas; no patient value is needed): heart rate 60–80/min and
systolic pressure < 120 mmHg or the lowest that keeps organs perfused (ACC/AHA 2022); esmolol 500 μg/kg IV over 1 min,
then 50–300 μg/kg/min (product dosing — To verify); CT from the neck to the pelvis for a suspected acute aortic syndrome
(ESC 2024); fasciotomy threshold of a gradient below 30 mmHg (McQueen and Court-Brown 1996); reperfusion bloods every
2–4 h (teaching design); imaging after repair at about 1, 6 and 12 months then yearly, and genetic testing for onset
before 60 (ACC/AHA 2022). The opioid and the heparin carry no numeric dose: no cited guidance states one for this
setting, so the analgesia is titrated by local protocol and the heparin (the tempting step) is described as a full-dose
bolus and infusion; neither has a preset (`doseSpec`) for that reason. No weight is recorded, so no weight-based dose is
computed.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "A young man with a cold leg and no distal pulses — what was your first instinct, and when did it change?"
2. **Description.** "In two sentences: what did the leg tell you, and what did the duplex add?"
3. **Analysis.**
   - "Which findings separate arterial ischaemia from a swollen DVT leg and from compartment syndrome on its own?"
   - "Numbness and weakness — what category does that make the leg, and what does that do to your clock?"
   - "The femoral pulse was weak. Where does that put the block, and why does the duplex finding in the abdominal aorta
     change your next test?"
   - "Why not lysis, or a groin embolectomy, while the CT is arranged? And heparin — before the CT, after it?"
   - "The pressure was 35 mmHg against a diastolic of 76. What does a 41 mmHg gradient mean in a leg with no popliteal or
     tibial flow?"
   - "His potassium and creatinine were not raised on admission. What happens to them when the leg is reperfused?"
   - "Two dangers — the ascending aorta and the leg. Which comes first, and what can share the anaesthetic?"
   - "The recorded team decompressed at 8 hours and repaired the aorta 48 hours later. What might have driven that, and
     what would you do today?" (the reasons are not recorded — do not let the group invent them)
   - "After an elephant trunk, what still needs watching, and who else in his family needs to know?"
   - "How did you explain the split artery, the urgency and the risks to a frightened 29-year-old?"
4. **Summary.** "What will you do next time a young adult arrives with an acutely ischaemic leg?"

The record gives no reason for the 48-hour interval and no outcome for the leg: do not let the group attribute either to
the timing.

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Calling the leg a DVT, or compartment syndrome on its own | `venous-thrombosis`, `compartment-alone` feedback | `rb-limb-threat` |
| Under-grading a weak, numb leg as "viable" | `viable-limb` feedback | `rb-limb-threat` |
| Lysis or a groin embolectomy before imaging the aorta | `lysis-now`, `groin-embolectomy` feedback; `thrombolysis`, `blind-embolectomy` contraindicated | `rb-aortic-imaging`, `rb-no-harm` (critical) |
| A run-off CT that misses the ascending aorta | `runoff-only-cta` feedback; an order warning for leg-only CT | `rb-aortic-imaging` |
| Treating the ascending aorta as an "incidental" second problem | `separate-iliac` feedback | `rb-integration` |
| Being reassured by the 41 mmHg gradient or by normal admission bloods | `gradient-reassures`, `normal-bloods-viable` feedback | `rb-integration`; `rb-limb-care` |
| Copying the recorded 8 h / 48 h sequence | `decompress-then-48h` feedback; `delay-48h` contraindicated | `rb-emergency-repair`, `rb-no-harm` (both critical) |
| Leg first, aorta later; TEVAR; ICU observation | `leg-first-bypass`, `stent-graft-entry`, `icu-watch` feedback; diversions contraindicated | `rb-emergency-repair`, `rb-no-harm` |
| Full heparin after the CT | `heparin` contraindicated once the CT is read (harm text) | `rb-no-harm` |
| Full heparin before the CT, with the aorta already in question | `heparin-rescan` feedback; teaching point 1 (image the aorta first) | not scored (the dissection is not yet shown) |
| Choosing the plan but never calling the operation | no `emergency-surgery` | `rb-emergency-repair` (critical) |
| Forgetting the remaining aorta and the family | `no-further-imaging`, `genetics-if-family` feedback | `rb-after-repair` |
| Inventing vital signs, chest pain, history or results | unknown history items, `examNotRecorded`, `available: false` results, the nurse's brief | — |

### Teaching points for the debrief

The five `debrief.teachingPoints`: (1) grade acute limb ischaemia by function — sensory loss beyond the toes with mild
or moderate weakness is IIb, profound anaesthesia and paralysis III; a IIb leg needs its flow restored without delay;
ESVS 2020 recommends immediate heparin for acute limb ischaemia, but a weak femoral pulse in a young adult means think
of the aorta and image it before anticoagulating, lysing or operating; (2) the leg can be the only clue to a type A
dissection — emergency surgical evaluation and immediate surgery, immediate ascending repair for lower-extremity
malperfusion, reperfusion-first only an option for mesenteric malperfusion (ACC/AHA 2022); then and now — the recorded
8 h / 48 h sequence; (3) before theatre — heart rate and blood pressure on the monitor first, esmolol, the 60–80/min and
< 120 mmHg targets or the lowest that perfuses (ACC/AHA 2022), analgesia, no lysis (absolute contraindication, 2025
ACC/AHA ACS), no full heparin once the dissection is known; (4) compartment syndrome in an ischaemic leg is clinical —
the ΔP < 30 mmHg threshold (McQueen and Court-Brown 1996) does not transfer to a leg without inflow; fasciotomy with
revascularisation after prolonged ischaemia (ESVS 2020); reperfusion monitoring; (5) after repair — lifelong imaging,
pressure control, genetic testing for onset before 60 and family screening (ACC/AHA 2022); an elephant trunk
anticipates a second stage.

## Embodied mode

- **Where things are (`general-hospital`).** The patient lies in an ED resus bay (`setting: "emergency"`) for `arrival` and
  `workup`. The CT angiogram is done at the CT scanner (`ct`, `performedAt: "provider"`): the patient is taken there on his
  trolley. The duplex and venous scan use the portable ultrasound machine and the echo the echocardiography machine,
  wheeled to the bay (`performedAt: "bedside"`); the ECG uses the bay's ECG machine; the compartment pressure is modelled
  as a pressure measurement through the bay's monitor (`cardiac-monitor`, `performedAt: "bedside"` — the method the team
  used is not recorded). Bloods are sampled at the patient (or, after the cannula, ordered at a records terminal).
  Entering `course` moves him to a ward bed (`location: {setting: "ward"}`, a staging convention); `followup` happens there
  too. The two record reviews (`operative-record`, `outcome`) need only `records`.
- **No operation is performed in the world.** The emergency-surgery call, the fasciotomy, the recheck of the leg's flow
  and the diversions are calls and plans (`requires: []`); theatre is never entered — the operations are what the
  operation notes record. `icu-observation` (a diversion) carries `destination: {setting: "icu"}`.
- **Staff.** 葛护士 / Nurse Ge gives the arrival handover (ISBAR, from the triage facts: six hours of right-leg pain and
  numbness, BP 128/76 mmHg), says where the kit is and gives no other number. The attending, the vascular surgeon and the
  cardiac surgeon interpret only records the learner has read; none reads the outcome record.
- **Kit.** Monitoring needs the bay's monitor (`cardiac-monitor`); the cannula and the drugs come from the crash cart
  (`iv-access`, `medications`); esmolol and heparin need an infusion pump. The case's IV-access procedure (`iv-access`)
  precedes the IV drugs in the reference path; the patient arrives without a cannula (`ivAccessInSitu: false`).
- **Scope of practice.** Monitoring, the cannula and the drugs are nursing-scope by kind; the calls, the operations, the
  plans and the referrals are medical.
- **He can speak throughout** (a conscious adult answers for himself; no companion). How he feels after the operations
  is not recorded: asked in `course`, he says he is not sure.
- **Measured (offline demonstration, 2026-11-14).** `embodied-autopilot.test.ts -t "cmcr-33736:"` passes in en and zh-CN:
  every objective done, in-world score equal to the clinical score (25/25).

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; six hours of right-leg
pain and numbness with difficulty moving; calf swelling and restricted movement; the right leg colder and paler; the
three examination records; the admission blood pressure; the duplex, CT, compartment-pressure and renal records in the
wording 1.0.0 gives; the decompression at 8 hours, the ascending and arch replacement with an elephant trunk 48 hours
later, closure one week after the incision and discharge 35 days after surgery.

**Adapted for teaching.** The ED resus-bay setting (1.0.0's `setting: "emergency"`); the four phases and their staging (the
duplex at arrival; the CT, pressure and bloods in `workup`; the ward bed from `course` — none of these times or places is
recorded); the patient's dialogue (lay rewording of the recorded facts); the staff; the five decisions, their options and
feedback; the 17 interventions (their responses say the case does not record whether they were done, or point to the
operation notes); the rubric; the unrecorded tests a learner would order (venous scan, CK, lactate, blood count, clotting,
crossmatch, ECG, echo, D-dimer) as honest `available: false` records. The examination records are split by manoeuvre
(1.0.0 had three compound "review the examination record" items). **Inference (derived, not new):** the
dissection is called *acute* because the leg's malperfusion began six hours before arrival; when the dissection itself
began is not recorded. **Labelled teaching devices:** his voiced worry ("Am
I going to lose this leg?", `persona.concerns` and the `concerns` item) and his frightened, impatient manner add no
clinical fact; 1.0.0 records neither. Unknown history items answer with the collection's lay unknown ("这个我说不上来，医
生。" / "I'm not sure, doctor."); for a conscious adult asked about chest pain this is an artefact of the record, not a
persona trait — say so if learners remark on it.

**Contradictions and open readings kept.** (1) Pulses: 1.0.0's zh names the **dorsalis pedis** ("腘及足背动脉未触及") and
its en says "popliteal/pedal pulses absent"; the case follows the more specific zh wording and does not claim the
posterior tibial pulse. (2) The duplex's aortic segment: zh "腹主动脉下段" (lower abdominal aorta), en "distal aorta"; the
case uses the zh wording. (3) "48 小时后" has no stated anchor and "术后 35 天" no stated operation; both are kept as
recorded. (4) The groin tenderness has no side. (5) "切开减压" is rendered as a decompressive incision (fasciotomy) — the
leg and compartments are not stated; the case says neither. (6) 1.0.0 calls the CT "aortic CT" in its record and "CTA" in
its teaching text; the case calls it a CT angiogram. (7) 1.0.0 calls the admission creatinine normal without a reference
range; the case shows no range and no flag. None is resolved by invention.

**Unknowns kept honest.** Vital signs other than the admission blood pressure; blood pressure in both arms; the sensory
examination; chest, back or abdominal pain, faints, neurological symptoms, onset speed, injury; past history,
medicines, allergies, drug use, smoking, family history; CT detail (entry tear, branches, false lumen, diameter,
pericardium, aortic valve, iliac side); the compartment, method and time of the pressure; CK, lactate, blood count,
clotting, post-operative values; the anchor of "48 hours later", the leg and compartments decompressed, whether flow
returned, any separate revascularisation, complications; limb function, discharge medicines, imaging follow-up, genetic
evaluation and the long-term outcome. Record-facing texts say "No result is recorded for this test" or "This case does
not record whether this was done; it does not simulate its effect" — never that the article lacks something.

**Figures and privacy.** The report's only figure (`fig01.png`, a CT composite) is **withheld** in
`scripts/cmcr-105-media-review.json` ("CT composite carries patient name, birth date, record number, hospital and
acquisition date."); `assets` is empty and the case teaches from the written CT report — no outcome depends on reading the
image. The pseudonym 周清和 / Zhou Qinghe is kept from 1.0.0; no hospital, date, initials or occupation appear.

**Survey findings applied.** No case audit covered this case; the critic named it only as one of 14 cases with a dated
teaching point (1.0.0's "ACC/AHA 2022") and noted that top-level `unknowns` was one compound sentence identical to the
debrief's — now eight specific entries. The template defects are all replaced: generic history slots whose answers said
"The source notes do not provide that information" (authoring language in the patient's mouth) → his own voice; the
management decision gated on asking unrecorded history (`pmh`, `medications`, `allergies`) → gates on recorded evidence;
option ids `supported` / `alternative-N` → content ids; a key that handed the act to "aortic and limb-salvage teams" →
the act named, with drugs, targets and timing, and scored as an act; the only critical item a hindsight decision read
after the outcome record → two critical acts gated before the operation notes; no interventions → 17, with the tempting
wrong steps; three generic examination "records" → six findings; a summary naming the presentation formulaically and a
triage note written as an instruction → a spoiler-free summary and a handover; the answer's discipline (cardiac surgery)
on the card → removed.

**Extensions.** `sourceArticleId`, `sourceUrl`, `historicalReview` and `collection` kept; `sourceDoi` and `doiVerifiedAt`
(2026-10-29, the source map's `publisherCheckedAt`) added for the verified DOI; `sourceTextChecked: false`;
`embodied.ivAccessInSitu: false`; the unverifiable `authorChecks` booleans and `sourceTextSha256` removed until the source
pass (STANDARD §6).

## Matcher notes

- **Phase scoping.** The presenting-state items (`presenting`, `onset`, `swelling`, `cold-pale`, `concerns`) are limited
  to `arrival` and `workup`: they describe the leg before the operations. Nothing about how he is after the operations is
  recorded, so `course` and `followup` have no status item (the patient answers with the lay unknown).
- **Shared words separated with `excludeKeywords`:** `presenting` vs "before", family, "besides", "did anyone drive / come
  with you"; `onset` vs activity at onset, meals and swelling ("since it started" in a swelling question); `swelling` vs
  colour and cold; `cold-pale` vs swelling, chest/back/abdomen and urine; `chest-back-pain` and `faint-neuro` vs the leg;
  `bp-history`, `heart-history`, `pmh-other` vs family; `medications` vs allergies, street drugs and meals; `drugs` vs
  allergies and prescribed medicines; `family` vs "is your family on the way / with you"; `vitals` vs both arms, the leg
  and its pulses; `leg-feel` and `groin` vs pulses; `leg-movement` vs sensation.
- **English keywords** avoid one-token wildcards: run-together forms (`whatbringsyou`, `howmanyhours`, `allatonce`,
  `atonce`, `outofnowhere`, `whatwereyoudoing`, `doingatthetime`, `moveyourleg`, `lookathislegs`); "meth" was replaced by
  "methamphetamine" because it matched "something" (a meal question selected the drug item).
- **Order entry.** `orderMatching.rules` send "超声" queries with 心脏/超声心动/echo to the echo and with 静脉/venous/DVT/加压
  to the venous scan; a warning tells a learner who orders a leg-only CT that the recorded CT angiogram included the aorta.
- **Corpus.** 48 test utterances (30 zh-CN, 18 en), written as learners speak; every required item is covered. Three
  look-alike negatives (`expect: []`): "你是自己开车来的吗？", "did anyone come in with you today?" and "is your family on their
  way in?" (they share words with the presenting and family questions). `cases verify` reports 48/48 with no extra
  selections.
- **Review probe (2026-11-14).** The complaint asked in plain words reached nothing before the review ("Does your leg
  hurt?", "Is the leg numb?", 腿麻吗？, 腿肿吗？, 腿能动吗？), nor did "Do you have any medical problems?", 以前有什么病？ or "Do you
  use drugs?"; 哪里不舒服？ also selected `cold-pale`. Keywords were added to `presenting` (腿疼, 腿麻, 发麻, numb, leg hurt…,
  with excludes for duration, chest/back/abdomen and injury words), `swelling` (肿吗, 腿肿, 能动吗), `pmh-other` (以前有什么病,
  病史, medical problems…) and `drugs` (use drugs, street drugs…), and 哪里不舒服 is excluded from `cold-pale`; eight new
  utterances test them.

## References

1. 温萌, 舒礼良, 苏刚, 徐敬. Stanford A型主动脉夹层合并骨筋膜间隔综合征一例. 中华心血管病杂志. 2014;42(2):169-170.
   doi:10.3760/cma.j.issn.0253-3758.2014.02.014. Available from: https://rs.yiigle.com/cmaid/33736
2. Isselbacher EM, Preventza O, Black JH 3rd, et al. 2022 ACC/AHA guideline for the diagnosis and management of aortic
   disease: a report of the American Heart Association/American College of Cardiology Joint Committee on Clinical
   Practice Guidelines. Circulation. 2022;146(24):e334-e482. doi:10.1161/CIR.0000000000001106
3. Mazzolai L, Teixido-Tura G, Lanzi S, et al. 2024 ESC Guidelines for the management of peripheral arterial and aortic
   diseases. Eur Heart J. 2024;45(36):3538-3700. doi:10.1093/eurheartj/ehae179
4. Czerny M, Grabenwöger M, Berger T, et al. EACTS/STS Guidelines for Diagnosing and Treating Acute and Chronic Syndromes
   of the Aortic Organ. Eur J Cardiothorac Surg. 2024;65(2):ezad426. doi:10.1093/ejcts/ezad426
5. Björck M, Earnshaw JJ, Acosta S, et al. Editor's Choice – European Society for Vascular Surgery (ESVS) 2020 Clinical
   Practice Guidelines on the Management of Acute Limb Ischaemia. Eur J Vasc Endovasc Surg. 2020;59(2):173-218.
   doi:10.1016/j.ejvs.2019.09.006
6. 中国医师协会心血管外科分会大血管外科专业委员会. 主动脉夹层诊断与治疗规范中国专家共识. 中华胸心血管外科杂志.
   2017;33(11):641-654.
7. McQueen MM, Court-Brown CM. Compartment monitoring in tibial fractures. The pressure threshold for decompression. J
   Bone Joint Surg Br. 1996;78(1):99-104. doi:10.1302/0301-620X.78B1.0780099
8. Rao SV, O'Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI guideline for the management of patients with
   acute coronary syndromes: a report of the American College of Cardiology/American Heart Association Joint Committee
   on Clinical Practice Guidelines. Circulation. 2025;151(13):e771-e862. doi:10.1161/CIR.0000000000001309

**DOIs and checks.** The source DOI is the one the source map (`scripts/cmcr-105-sources.json`) records as verified
(`publisherCheckedAt` 2026-10-29). On 2026-10-30 web searches returned bibliographic records (PubMed/PMC listings,
repository records, journal pages) matching refs 2, 3, 4 and 5 with the DOIs given; the publisher and PMC pages
themselves could not be opened from this session (network policy), and the session's search budget ran out before refs 6
and 7 could be checked — they carry no DOI. Ref 8's DOI is the string the library's earlier editorial reviews verified
(cmcr-1653411). The content checks behind each teaching statement are listed below; what could only be seen in
secondary summaries is marked there. **Independent review (2026-11-14):** ref 7 was confirmed with its DOI (10.1302/0301-620X.78B1.0780099) and the
ΔP < 30 mmHg threshold; ref 6 could be found only in secondary listings (its volume and pages remain To verify); ref
8's DOI was confirmed as the guideline's Circulation DOI.

### To verify

**In the source article (the details 1.0.0 does not give or gives ambiguously):**

- The pulse examination: dorsalis pedis (zh) or all pedal pulses (en); whether the posterior tibial pulse was examined;
  the side of the groin tenderness; any sensory examination; whether the leg was mottled, rigid or paralysed.
- Vital signs other than the admission blood pressure; blood pressure in both arms; ECG, troponin, echocardiography.
- Whether he had chest, back or abdominal pain, syncope or neurological symptoms; how suddenly the leg symptoms began;
  any injury or exertion at onset.
- Past history (hypertension, connective-tissue disease, bicuspid valve), medicines, allergies, drug use, smoking,
  family history; any syndromic features.
- The duplex: the veins, the left leg, the upper abdominal aorta; whether "腹主动脉下段" is the lower abdominal aorta.
- The CT: coverage (chest to legs or chest-abdomen-pelvis), the entry tear, extent, arch branches, coronary, visceral
  and renal involvement, false lumen, aortic diameter, pericardial fluid, aortic valve, the iliac side and segment.
- The compartment pressure: which compartment (calf or thigh), the method, the time relative to the admission blood
  pressure and to the decompression; whether more than one compartment was measured.
- Admission laboratory reference ranges; CK, lactate, myoglobin, blood count and clotting; post-operative potassium, CK
  and renal function; any renal replacement.
- The anchor of "48 小时后" (after admission or after the decompression); which operation "术后 35 天" refers to; why the
  aortic operation followed 48 hours later; where the decompression was done; which leg and compartments were opened;
  whether flow to the leg had returned by then; any separate revascularisation of the leg (bypass, stent); operative
  findings and complications; the extent of the arch replacement and whether a frozen elephant trunk was used.
- The function of the leg at discharge, discharge medicines, imaging follow-up, any second-stage repair, genetic
  testing and family screening, and the long-term outcome.
- Whether the withheld CT figure's legend adds findings to the text.

**In the guidance.** Checked in the independent review (2026-11-14) against the ACC's guideline summaries ("2022 ACC/AHA
Aortic Disease Guideline Key Perspectives", parts 1 and 2), a Guideline Central reproduction of the recommendation
tables, a commentary on ESC 2024, NCEPOD's 2025 acute limb ischaemia report and a drug-reference reproduction of the 2025
ACS table — the primary texts themselves could not be opened from this session (paywall or network policy):

- Confirmed (secondary): ACC/AHA 2022 — emergency surgical evaluation and emergency surgery for suspected or confirmed
  acute type A dissection (1, B-NR); immediate operative repair of the ascending aorta for renal, mesenteric or
  lower-extremity malperfusion (1, B-NR), with mesenteric revascularisation first only a reasonable alternative for
  clinically significant mesenteric malperfusion; systolic < 120 mmHg or the lowest pressure that maintains end-organ
  perfusion and heart rate 60–80/min; CT or MRI at 1, 6 and 12 months and then annually if stable; long-term
  beta-blockers after an acute aortic syndrome; genetic testing for syndromic features, a family history of thoracic
  aortic disease or onset before 60, and aortic imaging of first-degree relatives. ESC 2024 — early ECG-gated contrast
  CT from the neck to the pelvis as the first-line test for a suspected acute aortic syndrome (I, C); the 1.1.0 draft had
  attributed whole-aorta CT to ACC/AHA 2022, which could not be confirmed. ESVS 2020 — the table is its modification of
  Rutherford's categories (IIb: sensory loss beyond the toes, mild or moderate motor deficit). 2025 ACC/AHA ACS —
  suspected aortic dissection first among the absolute contraindications to fibrinolysis.
- Still to check in the primary texts: the exact wording and class of each point above; ESVS 2020's immediate-heparin
  recommendation (seen as reproduced in the ESVS 2023 antithrombotic guideline) and whether it addresses limb ischaemia
  caused by aortic dissection; its wording and class for fasciotomy after revascularisation of prolonged ischaemia; its
  statements on imaging before revascularisation and on reperfusion injury.
- ESC 2024 and EACTS/STS 2024: their type A malperfusion recommendations (central repair first versus reperfusion first),
  their heart-rate target (ESC 2024 is summarised elsewhere as ≤ 60/min) and whether either changes the answer of
  decision 4.
- No guideline statement was found on withholding anticoagulation while an aortic dissection is suspected; the case
  teaches it as clinical reasoning (heparin before the CT is neither credited nor penalised). A vascular or cardiac
  surgeon should confirm that stance.
- The Chinese consensus (2017): its volume and pages, its recommendations on surgery for Stanford type A dissection and
  on anti-impulse targets, and whether a newer Chinese guideline on acute aortic syndrome supersedes it.
- Esmolol dosing (500 μg/kg over 1 minute, then 50–300 μg/kg/min) against the product information used locally.
- **For a clinician of the specialty:** the `critical` judgements (blind embolectomy and heparin after the CT
  recoverable; thrombolysis, TEVAR instead of surgery, the 48-hour deferral and ICU observation critical); the keyed
  same-sitting fasciotomy; the reperfusion-monitoring interval (2–4 h, teaching design).

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the presenting complaint is
  split into presentation, onset, swelling and cold/pale (phases `arrival`, `workup`); the three examination records
  become six findings by manoeuvre, with the admission blood pressure moved from the compartment record to a vitals
  finding; the outcome record's operations become their own record in phase `course`.
- **History.** 15 template slots (11 with the meta answer "The source notes do not provide that information") → 23 items
  in his lay voice: 4 recorded facts, 18 honest unknowns (chest/back/abdominal pain, onset speed, activity at onset,
  injury, faints or neurological symptoms, palpitations or breathlessness, earlier walking pain, blood pressure, heart and
  vessels, other illness, operations, medicines, allergies, stimulant drugs, smoking, family, last meal, urine) and one
  labelled ICE device; 7 required.
- **Phases and gates.** 3 template phases with nested `all` gates (and a management decision gated on unrecorded history)
  → 4 one-way phases gated on the preceding objectives; the outcome phase opens only after all five decisions.
- **Investigations.** 5 record reviews → 15 records: the duplex, CT angiogram and compartment pressure as orders (bedside,
  CT room, bedside), the renal panel as a lab, nine honest `available: false` tests, the operation notes and the outcome.
- **Interventions.** 0 → 17: cannula, monitoring, analgesia, the vascular call, esmolol, the emergency-surgery call,
  fasciotomy, the in-theatre recheck of the leg's flow, reperfusion watch, the discharge plan, the genetics referral;
  harmful: thrombolysis, blind embolectomy, heparin after the CT, decompress-and-wait-48-hours, stent graft instead of
  surgery, ICU observation — each with a harm text citing its guidance.
- **Decisions.** 3 template decisions (ids `supported` / `alternative-N`, the "safety" decision a hindsight appraisal
  after the outcome) → 5 decisions with content ids: the limb, the next test, the combined reading, the plan naming act,
  drugs and targets, and the plan after repair (select all).
- **Rubric.** 10 template items (the one critical item a hindsight decision) → 12: two critical acts with time windows,
  an avoided-harm item with `scoredWhen`, first-try decision scoring, and a Calgary–Cambridge communication item written
  for the case.
- **Teaching layer.** 6 learning outcomes, 6 objectives, 4 named staff, 6 key reasoning steps and 5 dated teaching points,
  8 unknowns, 8 Vancouver references; the source citation without double spaces or zero-padded issue.
- **Card.** Title "male" → "man"; a new spoiler-free summary; a lay chief complaint; the triage note as a handover; four
  presenting-feature tags; topic tags `acute-leg-pain`, `limb-examination`; specialty `emergency-medicine`,
  `vascular-surgery` (cardiac surgery, the answer's discipline, removed); estimated time 30 → 35 min.
- **Governance.** Review status and notes in the STANDARD §1.2 wording (editorial; facts not yet checked against the full
  article; not reviewed by a licensed clinician — the English last sentence reads "The case is not yet reviewed by a
  licensed clinician." because the collection contract matches that phrase case-sensitively); `sourceTextChecked: false`;
  `authorChecks` and `sourceTextSha256` removed until the source pass; `sourceDoi` + `doiVerifiedAt` added.
- **Independent review (2026-11-14), fixes.** Facts: the persona, opening line and decision 1 had added severity ("hurts
  badly", "really hurts", "can barely move", 疼得厉害, 几乎动不了) to the recorded "右腿痛、发麻，也不太能动" — restored; the
  English conclusion's "he went home 35 days after surgery" restored to "was discharged" (1.0.0: 术后 35 天出院).
  Safety outcome: `critical` set on the six contraindicated acts (four true, two false) and the **Safety outcome.**
  paragraphs added. Heparin: no longer "indicated" before the CT (the case asks for the aorta to be imaged first); its
  harm is scored by `valid: false`. Doses: the morphine (2.5–5 mg) and heparin (80 U/kg, 18 U/kg/h) numbers, which no
  cited guidance states, removed. Guidance: whole-aorta CT re-attributed to ESC 2024 (neck to pelvis; the key now reads
  "from the neck down to the feet"); the IIb definition made exact; the beta-blocker's precondition (heart rate and
  blood pressure on the monitor; no bradycardia, hypotension, tamponade or severe aortic regurgitation) named in its
  dose, the decision 4 feedback and teaching point 3. Wording: "normal" admission creatinine → "not raised"; "cold,
  pulseless leg" → "cold leg without distal pulses"; the blood-pressure finding no longer flagged abnormal. Matcher:
  plain-word questions added (see Matcher notes). README: re-measured scores with the safety outcome, To verify updated,
  dangling STANDARD references and the Validation path corrected.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, 3 examination records,
  5 record reviews, 3 decisions, 10 rubric items (9 deterministic) and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-33736/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33736 --lang en                                                 # 73 steps · objectives 6/6 · decisions 5/5 · utterances 48/48 · rubric 25/25 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-33736                                       # depth floor, do-nothing 0, wrong-first 44 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33736:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33736:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-11-14, after the independent review's fixes: all five pass. (At the start of that review strict
validation reported four warnings — `critical` unset on three high-risk interventions, no preset on the opioid — and the
collection contract failed on them, although the 2026-10-30 note had recorded all five as passing.)

## 中文摘要

**病例概要。** 29岁男性，右下肢疼痛、麻木 6 小时，活动困难；小腿肿胀、活动受限，右腿比左侧凉、颜色苍白。查体：右小腿
肿胀、疼痛、苍白，较对侧凉；右股动脉搏动弱，右腘动脉和足背动脉未触及，左侧相应搏动可触及；腹股沟压痛（侧别未记录）；右下肢活动
障碍；入院血压 128/76 mmHg。血管超声示腹主动脉下段及右侧髂总、髂外、股动脉低回声填充，右腘动脉、胫前动脉、胫后动脉无血流；CT
示 Stanford A 型主动脉夹层，髂动脉受累并有中重度管腔狭窄；右下肢筋膜室压力 35 mmHg；入院肌酐 55.8 μmol/L，钾 3.8 mmol/L，尿素
4.9 mmol/L。诊断：以右下肢灌注不良起病的急性 A 型主动脉夹层，合并骨筋膜室综合征。记录的经过：入院后 8 小时切开减压；48 小时后
（未说明从何时算起）行升主动脉、弓部置换及象鼻手术；切开 1 周后二期缝合；术后 35 天出院。生命体征（入院血压以外）、胸背痛、既往
史、下肢结局和远期随访均无记录。本版依据 1.0.0 版提取的事实改写，尚未对照原文全文核对。

**学习目标。**

1. 识别苍白、发凉、远端无脉并伴麻木和活动障碍的急性动脉缺血，按 ESVS 2020 判定为“即刻受威胁”，并与深静脉血栓、单纯骨筋膜室综合
   征鉴别。
2. 把股动脉搏动减弱和超声所见的主动脉-髂动脉受累理解为可能起自主动脉的流入道问题，在溶栓或取栓之前对整条主动脉行 CT 血管成像
   （ESC 2024：疑似急性主动脉综合征首选从颈部到盆腔的增强 CT）。
3. 把 A 型夹层、下肢灌注不良和 35 mmHg 的筋膜室压力整合为同一病变，说明用全身舒张压算出的压差为何不能排除无血流肢体的骨筋膜室
   综合征。
4. 对合并下肢灌注不良的急性 A 型夹层立即修复升主动脉，同一次手术复查下肢血流并行筋膜切开；术前静脉 β 受体阻滞剂，心率 60–80
   次/分、收缩压 < 120 mmHg 或能维持灌注的最低水平（ACC/AHA 2022）。
5. 预见缺血超过 6 小时的肢体再灌注后的高钾、肌红蛋白尿和急性肾损伤并安排监测；入院时不高的肌酐和血钾只是基线。
6. 制订修复后的长期计划（终身影像随访、控制血压、遗传学评估和一级亲属筛查），并说明记录的先后顺序与现行做法的差别。

**关键决策。**

- 决策 1（这条腿）：急性动脉缺血、肢体受到即刻威胁，股动脉搏动弱提示阻塞在腹股沟或更近端；干扰项为深静脉血栓（股白肿）、单纯骨筋
  膜室综合征、“仍可存活”的 I 级缺血。
- 决策 2（下一步检查）：立即行从颈部到双足的 CT 血管成像，请血管外科到场，主动脉显示之前不溶栓、不取栓；干扰项为立即溶栓、直接
  腹股沟取栓、肝素加 24 小时后复查超声、只扫腹盆和下肢的 CT（最接近正确）。
- 决策 3（综合判断）：同一个病变——A 型夹层累及髂动脉造成右下肢灌注不良并出现骨筋膜室综合征，最先致命的是升主动脉；干扰项包括
  “两个互不相关的问题”、“压差 41 mmHg 说明没有骨筋膜室综合征”、“血钾肌酐正常说明肌肉存活”、“假腔血栓栓塞，抗凝取栓即可”。
- 决策 4（治疗计划）：立即急诊修复升主动脉，同一次麻醉中复查下肢血流、必要时旁路并切开四个筋膜室；术前先接上监护，再用 β 受体阻滞剂并镇痛，不用
  肝素和溶栓。干扰项包括与记录相似的“先减压、48 小时后再修复”、先救腿后修主动脉、TEVAR 和 ICU 药物观察。决策 4 答对并启动手术（或
  选择其他方案）后，病例才进入记录的手术经过，因此急诊手术必须在急诊阶段启动，看过手术记录后补做不计分。
- 决策 5（修复后，多选）：终身主动脉影像随访、遗传学评估和一级亲属筛查、长期控制血压和心率；不选“不再需要影像随访”和“家族有人
  患病才做基因检测”。

**复盘要点（PEARLS）。** 先谈面对一条发凉、远端无脉的腿时的第一反应；用两句话说清这条腿和超声告诉了你什么；分析动脉缺血与深静脉血栓、
单纯骨筋膜室综合征的区别，麻木加无力意味着什么级别，股动脉搏动弱和腹主动脉受累为何要求先给整条主动脉做 CT，为何不溶栓、不盲目
取栓，肝素在 CT 前后有何不同（CT 前不计分也不扣分，CT 后禁用），41 mmHg 的压差在无血流的腿上意味着什么，入院时不高的血钾在再灌注后会怎样，两处危险孰先，记录中 8 小时
/48 小时的顺序与今天的做法（不要替报告编造理由）；总结下次遇到急性下肢缺血的年轻人时怎么做。评分：确定性总分 25 分，两项关键项（首
次作答即选立即修复升主动脉并在急诊阶段实际启动手术；没有溶栓、盲目取栓、CT 后全量肝素、推迟手术、腔内支架或 ICU 观察），沟通项由考官
评判。本病例经人工智能辅助编辑审核，尚未经执业医师审核；待核实事项见上文 “To verify”。

**安全结果。** `thrombolysis`、`stent-graft-instead`、`delay-48h` 和 `icu-observation` 标为 `critical: true`：疑似主动脉夹层时溶栓、或在 CT 显示 A 型夹层后改用腔内支架、推迟 48 小时手术或只在 ICU 观察，无论得分多少，安全结果都判为不通过（`safety.passed: false`），所有复盘和导出都在分数旁显示；`blind-embolectomy` 和 CT 后的 `heparin` 标为 `critical: false`（可挽回的误判），但仍失去关键的避免伤害项 `rb-no-harm`。
