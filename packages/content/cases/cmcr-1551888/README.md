# cmcr-1551888 — Leg swelling and exertional chest discomfort · 48-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis and the operation. Learners open the case from the
> case library, where the title, summary, chief complaint, tags, triage note and objective titles give neither away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the CMCR
additional collection (docs/CMCR_105_CASES.md): 李嘉亮, 林俊華. 低溫室顫性停搏胸腔鏡輔助下再次三尖瓣置換術1例. 鏡湖醫學.
2025;25(1):59. Version 1.1.0 re-authors the case to the clinical content standard **from the facts that version 1.0.0
extracted from the report**; the full article was not available, so **none of these facts has yet been checked against
the full source article** (STANDARD §6). The patient (孔知远 / Kong Zhiyuan) keeps his 1.0.0 pseudonym; the ward nurse
(甘护士 / Nurse Gan), the cardiology attending (骆医生 / Dr Luo) and the cardiac surgeon (冯医生 / Dr Feng) are invented
teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-1551888` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (a ward bed throughout) |
| specialty | cardiology, cardiac surgery |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: five record phases, no simulated time) |
| languages | `zh-CN` (source language; the report is in traditional Chinese), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a cardiologist and a cardiac surgeon review it before teaching use |
| phases | `admission` 入院评估 / Admission to the ward → `assessment` 检查与治疗策略 / Work-up and strategy → `planning` 团队计划 / The team's plan → `postop` 此后的住院经过 / The rest of the admission → `followup` 出院与随访记录 / Discharge and follow-up record — all one-way, none learner-switchable |
| content | 26 history items (10 with recorded facts, 1 labelled teaching device, 15 unknown; 9 required) · 0 exam findings (none recorded) · 16 investigations (5 record reviews; 10 with no recorded result) · 13 interventions (4 always harmful, 1 harmful before the operation) · 6 objectives · 5 decisions (25 options) · 12 rubric items (11 deterministic, weight 30; 1 examiner-judged; 2 critical) · 3 staff · 6 learning outcomes · 5 teaching points · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. For recurrent systemic venous congestion after valve replacement, put prosthetic valve dysfunction first and request
   transthoracic echocardiography with a full prosthetic Doppler study before anything else (ESC/EACTS 2025; ASE 2024).
2. Explain why an LVEF of 54 % — within the ASE/EACVI 2015 normal range for men, 52–72 % — does not exclude right-heart
   failure from an obstructed tricuspid prosthesis.
3. Establish the mechanism of prosthetic obstruction before any reintervention: three sets of blood cultures before any
   antibiotic, transoesophageal echocardiography or CT for vegetation, thrombus or pannus, and anticoagulation first if
   thrombus is found (ESC 2023 endocarditis; ESC/EACTS 2025).
4. Refer without delay to the Heart Team and compare redo surgical replacement with transcatheter valve-in-valve, using
   the old prosthesis's model and size, right-ventricular function, liver and kidney reserve and the patient's wishes
   (ESC/EACTS 2025).
5. State the pre-operative checks for redo tricuspid replacement under hypothermic ventricular fibrillatory arrest —
   aortic regurgitation, an interatrial shunt, de-airing before the heart ejects, the vessels for peripheral
   cannulation, coronary assessment — and appraise one case as evidence of feasibility only.
6. Plan and explain, without stigma, the care after valve replacement — anticoagulation by valve type, a baseline
   echocardiogram, endocarditis prevention, hepatitis B and C treatment and addiction support (ESC/EACTS 2025; ESC 2023
   endocarditis).

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list.

## Clinical summary (spoilers)

**Presentation.** A 48-year-old man is admitted with six months of leg swelling and chest tightness on exertion that
recurred despite treatment to improve cardiac function (drugs, doses and timing not recorded). He has hepatitis B and C
and has used drugs in the past. His tricuspid valve was replaced with a bioprosthesis 22 years earlier for severe
tricuspid valve disease; the cause of that disease, the approach and the prosthesis model are not recorded. No vital
signs, examination findings or laboratory values are recorded.

**Echocardiography** (date not recorded): severe obstruction of the tricuspid bioprosthesis; LVEF 54 %. No gradients,
orifice area, regurgitation or right-heart measurements are recorded.

**The recorded course.** The team judged redo replacement indicated and performed a **thoracoscope-assisted redo
tricuspid valve replacement under hypothermic ventricular fibrillatory arrest** (cardiopulmonary bypass 182 minutes). He
was extubated on postoperative day 2, moved to the general ward on day 3 and discharged on day 13. The report's
discussion, as 1.0.0 summarises it, stresses de-airing and the risk of air embolism and acknowledges that one case and
no long-term data limit what can be concluded. No follow-up after discharge is recorded.

**Diagnosis.** Symptomatic dysfunction (severe obstruction) of a 22-year-old tricuspid bioprosthesis with systemic
venous congestion. Its mechanism — structural deterioration, thrombus, endocarditis or pannus — is not recorded, nor are
the findings on the explanted valve.

**Today's answer (ESC/EACTS 2025; ESC 2023 endocarditis; ASE 2024).** Echocardiography with a full prosthetic Doppler
study first. Before reintervention, the mechanism: three sets of blood cultures before any antibiotic, TOE or CT, and
anticoagulation first if there is thrombus. Then a prompt Heart Team decision between redo surgical replacement and
transcatheter valve-in-valve. For the fibrillatory-arrest approach the team chose: TOE for aortic regurgitation and an
interatrial shunt, CT of the chest and iliofemoral vessels, coronary assessment, and de-airing before the heart ejects.
After surgery: anticoagulation by valve type, a baseline echo, watching for AV block, endocarditis prevention, hepatitis
treatment and addiction support. The recorded course — a team decision for redo surgery and a quick short-term recovery
— fits this; what the record cannot show is whether the mechanism was established first, which options were weighed,
and how he did after discharge.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the recorded one. No vital
  signs are recorded, so there is no monitor baseline.
- **Five one-way phases** (none learner-switchable; records read in an earlier phase stay readable by phase):
  - `admission` — the history in his own words (recorded: six months of leg swelling and exertional chest tightness,
    recurring after heart-failure treatment; the valve replaced 22 years ago for severe disease; hepatitis B and C; past
    drug use — the rest unknown), the **previous valve operation record** and the **previous heart-failure treatment
    record** (record reviews), decision 1. Orders of the echo, ECG, chest film, bloods, viral tests, abdominal
    ultrasound, cultures and TOE answer honestly: the echo with a staging note ("requested; the report this case
    records is shown in the next part"), the rest with "No result is recorded for this test."
  - `assessment` — opens once the history objective and the background objective (which includes decision 1) are done
    (`enterWhen`: `obj-swelling-story`, `obj-background`). The **echocardiogram** (severe obstruction, LVEF 54 %), the
    mechanism work-up (cultures, TOE, CT — no results recorded), decisions 2 and 3, and one **disposition act**.
  - `planning` — opens once `obj-strategy` is done: the echo read in this phase, decisions 2 and 3 right, and one
    disposition act — the Heart Team referral or one of the two diversions (discharge on more diuretic, balloon
    dilation). The **treatment planning record** (redo replacement indicated; planned approach), decision 4 and consent.
  - `postop` — opens once `obj-team-plan` is done (planning record read, decision 4 right, consent discussed): postoperative
    day 3 on the general ward. The **subsequent course record** (the operation, bypass 182 minutes, extubation on day 2,
    general ward on day 3), the postoperative echo, ECG and bloods (no results recorded) and decision 5.
  - `followup` — opens once all five earlier objectives (and so all five decisions) are done: the **discharge record and
    outcome**.
- **Staging conventions** (none of these times is recorded): the echo report is shown in `assessment`; the approach that
  was performed is shown in the planning record as the "planned approach"; the postoperative phase is set on day 3, after
  the recorded transfer to the general ward, so he can speak. The operation and the intensive-care days are records, not
  places he is taken to.
- No prompt, hint, order response or harm text states a later phase's result before its record opens. Investigation
  and intervention names are neutral ("Treatment planning record", "Subsequent course record", "Viral hepatitis and HIV
  tests"); the TOE order warning that names his hepatitis is shown only once hepatitis has been asked about.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-swelling-story` Take the history of the swelling and the chest tightness | presenting complaint, onset, course and earlier treatment asked |
| 2 | `obj-background` Piece together his past and name the leading explanation | valve operation, hepatitis and drug use asked; old operation and treatment records read (phase `admission`); `leading-cause` right |
| 3 | `obj-strategy` Complete the assessment and set the strategy | echo read (phase `assessment`); `before-reintervention` and `strategy` right; **one disposition act**: Heart Team referral, discharge on more diuretic or balloon dilation |
| 4 | `obj-team-plan` Review the team's plan and prepare him | planning record read (phase `planning`); `technique-prep` right; consent discussed |
| 5 | `obj-before-home` Plan his care before he goes home | subsequent course record read (phase `postop`); `discharge-plan` right |
| 6 | `obj-how-it-ended` See how the admission ended | outcome record read (phase `followup`) |

Titles name no finding, test result or treatment (the journal lists later titles before they are reached); hints are
Socratic questions. `obj-strategy` needs a committed disposition act, so the planning record (which says reintervention
was indicated) opens only after the learner has acted on the echo; which act is the learner's choice, so the critical
referral is not forced and can be missed by a diversion. The cultures and the TOE are required by no objective.

### Decisions

- **1 `leading-cause`** (single; needs presenting complaint, onset, course, earlier treatment, valve operation, hepatitis
  and both admission records). Key: `failing-prosthesis-echo` — failure of the 22-year-old tricuspid bioprosthesis with
  systemic congestion; TTE with a full prosthetic Doppler study first, liver and kidney tests alongside. Distractors:
  `cirrhosis-first` (anchoring on the liver; congestive hepatopathy mimics cirrhosis), `coronary-first` (exertional
  tightness in a 48-year-old man), `constriction-first` (a real post-cardiotomy differential, screened by the same echo),
  `diuretic-adherence` (more diuretic, clinic review).
- **2 `before-reintervention`** (single; needs decision 1, drug use asked and the echo read in `assessment`). Key:
  `mechanism-first` — three culture sets before any antibiotic, TOE or CT for vegetation, thrombus or pannus,
  anticoagulation first for thrombus; the feedback names the precondition of a TOE in a man with hepatitis B and C
  (varices or bleeding, platelets, clotting; CT as the alternative). Distractors: `degeneration-list-now` ("22 years —
  it must be wear"), `antibiotics-before-cultures`, `lvef-normal-elsewhere` (the LVEF reassurance error),
  `warfarin-trial-home` (anticoagulate and discharge without imaging).
- **3 `strategy`** (single; needs decision 2). The prompt is conditional ("once infection and thrombus have been
  excluded"), because the mechanism results are not recorded. Key: `heart-team-now` — refer now; redo surgery against
  valve-in-valve on the old valve's model and size, right heart, liver, kidneys and his wishes. Distractors:
  `diuretics-and-wait`, `viv-for-all`, `balloon-first`, `abstinence-first` (stigma, not guidance).
- **4 `technique-prep`** (select all; needs decision 3 and the planning record). Keys: `toe-ar-pfo`, `ct-access`,
  `coronary-check`. Distractors: `defib-before-deair` (order reversed), `skip-toe-right-only`.
- **5 `discharge-plan`** (select all; needs decision 4 and the subsequent course record). Keys: `anticoag-by-valve`
  (the new valve's type is not recorded, so the key covers both types and names the baseline INR and platelets),
  `echo-ecg-baseline`, `ie-hepatitis-support`. Distractors: `tissue-no-followup`, `warfarin-aspirin-life`.

Every option has its own feedback naming ESC/EACTS 2025, ESC 2023 endocarditis, Duke-ISCVID 2023, ASE 2024, ASE/EACVI
2015, ESC 2021 heart failure or the Chinese 2022 hepatitis guidelines. Option ids name their content. **No length
cue:** in no single-best decision is the key the longest option in either language (measured on 2026-10-30, key vs
longest distractor: decision 1 — 56 vs 58 characters zh-CN, 197 vs 199 en; decision 2 — 47 vs 53, 165 vs 171; decision
3 — 44 vs 46, 162 vs 177). There is no appraisal decision; the feasibility-versus-superiority point is taught in the
debrief and by the attending.

### Rubric (11 deterministic items, total weight 30, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-symptom-history` | history | 2 | presenting complaint, onset, course, earlier treatment asked |
| `rb-risk-history` | history | 2 | valve operation and its cause, hepatitis, drug use and the fever screen asked (the cause and fever are unknown — asking is the competency) |
| `rb-records-workup` | investigations | 2 | old operation and treatment records read (`admission`), echo read (`assessment`), liver/kidney panel, blood count and clotting, viral tests ordered |
| `rb-leading-cause` | diagnosis | 3 | `leading-cause` right first time |
| `rb-mechanism-decision` | diagnosis | 3 | `before-reintervention` right first time |
| `rb-infection-thrombus-screen` | safety | 4 | **critical** — blood cultures **and** a TOE or cardiac CT ordered in `admission` or `assessment`, i.e. before the planning record |
| `rb-strategy` | management | 3 | `strategy` right first time |
| `rb-heart-team` | management | 4 | **critical** — Heart Team referral made, and neither discharge on more diuretic nor balloon dilation |
| `rb-no-harm` | safety | 3 | none of empirical antibiotics, discharge on more diuretic, balloon dilation, lifelong warfarin plus aspirin; scored once decision 2, 3 or 5 is attempted or any of the four is given |
| `rb-technique` | management | 2 | `technique-prep` right first time |
| `rb-discharge` | management | 2 | `discharge-plan` right first time, postoperative echo and blood count/clotting ordered (phase `postop`), endocarditis prevention given |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: explains the narrowed valve and why the LVEF does not reassure; the cultures and TOE; asks about drug use without judgement and offers support; options and the Heart Team; his two worries; consent; after surgery, anticoagulation, dental cover, fever → cultures first, hepatitis treatment; teach-back |

### How wrong choices score (measured with the reducer on 2026-10-30)

| path | deterministic score | critical items missed |
|---|---:|---|
| reference path (`solution`) | 30/30 (100 %) | none |
| start and do nothing | 0/27 | `rb-infection-thrombus-screen`, `rb-heart-team` |
| wrong first answer at all five decisions, then right | 17/30 (57 %) | none |
| wrong first answer at decision 1, 2 or 3 only | 27/30 (90 %) | none |
| wrong first answer at decision 4 or 5 only | 28/30 (93 %) | none |
| reference path without blood cultures and TOE | 26/30 (87 %) | `rb-infection-thrombus-screen` |
| cultures and TOE ordered only after the planning record | 26/30 (87 %) | `rb-infection-thrombus-screen` |
| discharge on more diuretic in place of the referral | 23/30 (77 %) | `rb-heart-team` (and `rb-no-harm` lost) |
| balloon dilation in place of the referral | 23/30 (77 %) | `rb-heart-team` (and `rb-no-harm` lost) |
| discharge on more diuretic first, the referral only after the planning record | 23/30 (77 %) | `rb-heart-team` |
| reference path plus empirical antibiotics | 27/30 (90 %) | none (`rb-no-harm` lost) |
| reference path plus lifelong warfarin and aspirin | 27/30 (90 %) | none (`rb-no-harm` lost) |
| reference path without endocarditis prevention and warfarin | 28/30 (93 %) | none (`rb-discharge` lost) |
| reference path without the valve-cause and fever questions | 28/30 (93 %) | none (`rb-risk-history` lost) |
| warfarin before the operation, then the reference path | 30/30 (100 %) | none — known limit, see below |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The four harmful
interventions are always `contraindicated`, and warfarin is contraindicated before the operation: each is named in the
debrief's safety list with its own harm text; the avoided-harm item counts only once the harm was possible
(`scoredWhen`), so doing nothing earns 0. **Known limits:** rubric conditions carry no time, so (1) warfarin given
before the operation is flagged as a contraindicated act but does not lower the score (the discharge item is therefore
met by phase-bound orders — the postoperative echo and blood count — not by the warfarin act itself); (2) a learner who
orders the cultures and TOE in `assessment` only after answering decision 3 still meets the critical screen, because
the planning record has not yet opened. Debrief the order of acts from the transcript.

### Critical items

`rb-infection-thrombus-screen` (the dangerous error: planning a redo operation on a prosthesis whose obstruction might be
an unrecognised endocarditis or a thrombus that anticoagulation could resolve) and `rb-heart-team` (the missed
life-saving act: referring for reintervention while congestion keeps returning, instead of more diuretic or an
unestablished balloon dilation). Both are acts; neither reads a final-phase record, and neither can be earned in
hindsight: the screen counts only in `admission` or `assessment`, and the planning record opens only after a
disposition act, so a referral made after a diversion fails the item.

## Reference path (`solution`)

78 steps, static clock: start → presenting complaint, onset, course, earlier treatment, exercise tolerance, orthopnoea,
abdomen and jaundice, fever screen, palpitations → valve operation and its cause, anticoagulation since, hepatitis and
its treatment, GI bleeding, drug use and its details, smoking and alcohol, medicines, allergies, family, his worries →
old operation record, heart-failure treatment record → daily weights, IV cannula, liver/kidney panel, blood count and
clotting, viral tests, ECG → IV furosemide → `leading-cause` → (phase `assessment`) echo → `before-reintervention` →
blood cultures, TOE → dental health, HIV testing → hepatology, addiction support → `strategy` → **Heart Team referral**
→ (phase `planning`) planning record, CT, coronary CT → `technique-prep` → consent → (phase `postop`) how the days went,
subsequent course record, echo, ECG, blood count and clotting, liver/kidney panel → warfarin, endocarditis prevention,
home support → `discharge-plan` → (phase `followup`) outcome record → finish. `cases verify` passes: objectives 6/6,
decisions 5/5, rubric 30/30, utterances 40/40.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 48-year-old man | `patient.age`, `sex`; README "source data" | `patient.age`, `sex`; title; decision 1 prompt |
| leg swelling (下肢浮肿) and chest tightness/discomfort on exertion (活动后胸闷), six months (半年) | `chiefComplaint`, `history.presentation`, `history.onset` | `chiefComplaint` (lay words), `history.presenting`, `history.onset`, `triageNote` |
| treatment to improve cardiac function, after which the symptoms recurred (反复) — once "persisted" in English | `history.progression`, `history.prior`, `investigations.clinical-review` | `history.course`, `history.previous-treatment`, `investigations.hf-treatment-record`, `investigations.team-plan` |
| hepatitis B and hepatitis C | `history.pmh` | `history.hepatitis` |
| past drug use (以前有使用毒品的经历) | `history.exposure` | `history.drug-use` (disclosure `specific`) |
| tricuspid valve replaced with a bioprosthesis 22 years earlier, for severe tricuspid valve disease | `history.operations`, `investigations.old-operation` | `history.valve-op`, `history.valve-reason`, `investigations.old-op-record` |
| echo: severe obstruction of the tricuspid bioprosthesis; LVEF 54 % | `investigations.echo` | `investigations.tte` result `assessment` (text and `values`: the obstruction flagged A, LVEF 54 % with "no reference range or method recorded") |
| gradients and numerical RV function not supplied | `investigations.clinical-review` | `tte` note; `unknowns` |
| the team judged redo replacement indicated | `investigations.clinical-review` | `investigations.team-plan` result `planning` |
| thoracoscope-assisted redo replacement (胸腔镜辅助再次置换) under hypothermic ventricular fibrillatory arrest (低温室颤性停搏) | `investigations.outcome`; `provenance.citation` (title); `decisions.management` option text | `team-plan` (as the planned approach), `op-record` result `postop`, `outcome` |
| cardiopulmonary bypass 182 minutes | `investigations.outcome` | `op-record`, `outcome`, decision 5 prompt |
| extubated postoperative day 2; general ward day 3; discharged day 13 | `investigations.outcome` | `op-record`, `history.postop-course`, `outcome`, decision 5 prompt |
| no long-term follow-up | `investigations.outcome`, `unknowns` | `outcome`; `unknowns` |
| the report stresses de-airing and air-embolism risk and acknowledges limited numbers and long-term data | `decisions.safety` option feedback | `outcome` ("the report's discussion"), decision 4 feedback, teaching point 4 |
| gradients, RV function, liver/renal/coagulation values, long-term outcome absent | `unknowns`, `debrief.unknowns` | 15 unknown history items; 10 investigations with no recorded result; `examNotRecorded`; 7 `unknowns` |

**Times.** Recorded: six months of symptoms; the first operation 22 years earlier; bypass 182 minutes; extubation on
postoperative day 2, the general ward on day 3, discharge on day 13. Not recorded: the date of the echo; whether the
heart-failure treatment was given before or during this admission (1.0.0's "prior care" item places it before, its
pre-operative assessment record after admission — both readings kept, the record dated "timing not recorded"); when the
team decided and chose the approach; the day of the operation; how long he was in intensive care.

**Derived values.** His age at the first operation, about 26 years (48 − 22), is not used in the case text. The LVEF of
54 % lies within the ASE/EACVI 2015 normal range for men (52–72 %). No other number is recorded from which to derive one
(no weight, no laboratory value, no gradient).

**Guidance numbers used in teaching text** (doses as formulas; no patient value is needed): LVEF normal ranges by sex
(ASE/EACVI 2015); three sets of blood cultures before any antibiotic (ESC 2023); IV furosemide at least equal to the
usual daily oral dose, or 20–40 mg if he takes none (ESC 2021 heart failure); warfarin usually for the first 3 months
after a surgical tricuspid bioprosthesis, lifelong for a mechanical valve (ESC/EACTS; the 2025 class is to verify);
aspirin 100 mg (the harmful add-on's dose text); CT coronary angiography for low-to-intermediate and invasive
angiography for high pre-test probability (ESC/EACTS 2025). No Doppler threshold for prosthetic tricuspid stenosis is
quoted (to verify). No weight is recorded, so no weight-based dose is computed.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to look after a man who has already had one heart operation and is frightened of a
   second?"
2. **Description.** "In two sentences: what did you find, and what did you decide to do first?"
3. **Analysis.**
   - "When you heard 'a valve replaced 22 years ago' and 'hepatitis B and C', where did your mind go first? What pulled
     you towards the liver?"
   - "What did the LVEF of 54 % tell you — and what could it never tell you about his legs and his liver?"
   - "'Severe obstruction' — of what kind? What would have made you think thrombus or infection rather than wear, and
     what would you have done first?"
   - "How did his past drug use change the order of your tests, and how did you ask about it?"
   - "He has hepatitis B and C. What did you need to know before passing a TOE probe?"
   - "Who decides between a redo operation and a valve-in-valve? What information did the Heart Team need that this
     record does not hold (the old valve's model and size)?"
   - "Why might a surgeon choose fibrillatory arrest for a re-operation — and what has to be checked before that is
     safe?"
   - "He went home on day 13. What does that tell us about the technique, and what can it not tell us?"
   - "Which valve was put in? How did not knowing change your discharge plan?"
4. **Summary.** "What will you check next time a patient with a prosthetic valve comes in with swollen legs?"

Do not let the group fill gaps: the explanted valve's findings, the new valve's type and any complication are not
recorded, so the mechanism of this obstruction stays unknown.

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Anchoring on hepatitis and cirrhosis | `cirrhosis-first` feedback; abdominal ultrasound "neutral" | `rb-leading-cause` |
| Reading a normal LVEF as reassurance | `lvef-normal-elsewhere` feedback; learning outcome 2 | `rb-mechanism-decision` |
| Coronary angiography or cardiac MRI as the first test | `coronary-first`, `constriction-first` feedback | `rb-leading-cause` |
| More diuretic and home | `diuretic-adherence`, `diuretics-and-wait` feedback; `discharge-diuretics` contraindicated | `rb-leading-cause`, `rb-strategy`, `rb-heart-team`, `rb-no-harm` |
| "22 years — it must be wear" | `degeneration-list-now` feedback | `rb-mechanism-decision` |
| Antibiotics before cultures | `antibiotics-before-cultures` feedback; `empirical-antibiotics` contraindicated | `rb-mechanism-decision`, `rb-no-harm` |
| Never sending cultures or a TOE/CT before the team meets | no objective requires them | `rb-infection-thrombus-screen` (critical) |
| TOE without asking about varices or checking clotting | the TOE order warning and result note; decision 2 feedback | — (debrief) |
| Warfarin trial and discharge without imaging | `warfarin-trial-home` feedback | `rb-mechanism-decision` |
| Valve-in-valve for everyone; balloon dilation | `viv-for-all`, `balloon-first` feedback; `balloon-dilation` contraindicated | `rb-strategy`, `rb-heart-team`, `rb-no-harm` |
| Making treatment conditional on proof of abstinence | `abstinence-first` feedback; communication item | `rb-strategy` |
| No TOE "because only the right heart is opened"; defibrillating before de-airing | `skip-toe-right-only`, `defib-before-deair` feedback | `rb-technique` |
| No antithrombotic or echo after a tissue valve; warfarin plus aspirin | `tissue-no-followup`, `warfarin-aspirin-life` feedback; `warfarin-aspirin` contraindicated | `rb-discharge`, `rb-no-harm` |
| Warfarin before the operation | `warfarin-postop` contraindicated before `postop` | — (safety list) |
| Inventing vital signs, examination findings or results | unknown history items, `examNotRecorded`, results with no record, the nurse's brief | — |

### Teaching points for the debrief

The five `debrief.teachingPoints`: (1) grade prosthetic obstruction by Doppler against the post-implant baseline (ASE
2024) and read the LVEF for what it is (ASE/EACVI 2015) — his echo records neither gradients nor right-heart function;
(2) fix the mechanism before reintervening — thrombus anticoagulated first, endocarditis by cultures before antibiotics
and TOE (ESC/EACTS 2025; ESC 2023; Duke-ISCVID 2023) — whether any of this was done is not recorded; (3) the Heart Team
sets the strategy, redo surgery against valve-in-valve, before right-heart and end-organ damage advance (ESC/EACTS 2025);
(4) the reported technique, its rationale and prerequisites, and what one case can show; (5) whole-patient care after
the replacement — anticoagulation by valve type, baseline echo, AV block, endocarditis prevention, hepatitis treatment
(Chinese 2022 guidelines), addiction support without judgement.

## Embodied mode

- **Where things are (`general-hospital`).** He lies in a ward bed (`setting: "inpatient"`) in every phase; no phase has
  a `location` and no intervention a `destination`. The operation, the intensive-care days and the team meeting are
  records read at the ward's records terminal or in the notes at the bedside. The postoperative phase is set on day 3,
  after the recorded transfer to the general ward.
- **Tests.** The echo and the TOE need the echo machine brought from imaging to the ward (`echocardiography`,
  `performedAt: "bedside"`); the ECG uses the ward machine; the chest film is a portable film; the bloods and cultures
  are sampled at the bedside (`lab-chemistry`, `lab-hematology`, `lab-serology`, `lab-microbiology`); the CT, the coronary
  CT and the abdominal ultrasound move him to imaging (`performedAt: "provider"`). The five record reviews (`records`)
  need only a records terminal or the notes.
- **Kit.** The IV cannula and the medicines come from the ward's treatment cart (`iv-access`, `medications`); the case's
  IV-access procedure precedes the furosemide in the reference path (no cannula is assumed). Daily weights and the fluid
  chart are a nursing order with no device (`scope: "nursing"`; the facility's weighing scale is a fixed device that
  cannot be brought to the bed).
- **Scope of practice.** The cannula, the medicines and the weights are nursing-scope; the referrals, consent and the
  dispositions are medical.
- **He can speak throughout** (a conscious adult answers for himself; no companion). There are no examination findings:
  every manoeuvre answers with `examNotRecorded` ("This case holds no recorded finding for this examination; treat it as
  unknown").
- **Measured (offline demonstration, 2026-10-30).** `embodied-autopilot.test.ts -t "cmcr-1551888:"` passes in en and
  zh-CN: every objective done, in-world score equal to the clinical score, nothing refused.

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; six months of leg
swelling and exertional chest tightness, recurring after treatment to improve cardiac function; hepatitis B and C; past
drug use; a bioprosthetic tricuspid valve replacement 22 years earlier for severe tricuspid valve disease; severe
obstruction of the bioprosthesis with an LVEF of 54 %; the team's judgement that redo replacement was indicated; the
thoracoscope-assisted redo replacement under hypothermic ventricular fibrillatory arrest with 182 minutes of bypass;
extubation on day 2, the general ward on day 3, discharge on day 13; no long-term follow-up; and, from 1.0.0's decision
feedback, a discussion stressing de-airing and air embolism and acknowledging the limits of one case without long-term
data.

**Adapted for teaching.** The five phases and their staging (the echo shown in `assessment`, the performed approach
shown as the "planned approach", the postoperative phase on day 3 — none of these times is recorded); the patient's
dialogue (lay rewording of the recorded facts); the staff; the five decisions, their options and feedback; the 13
interventions (their responses say the case does not record whether they were done); the rubric; the unrecorded tests a
learner would order (ECG, chest film, liver/kidney panel and NT-proBNP, blood count and clotting, viral tests, abdominal
ultrasound, cultures, TOE, CT, coronary CT, postoperative echo) as honest results with no record. **Labelled teaching
devices:** his voiced worries ("another heart operation", "will my liver take it", `persona.concerns` and the `concerns`
item) and his hesitation before speaking about drug use (`persona.actingNotes`) add no clinical fact — 1.0.0 records no
concerns or manner. Unknown history items answer with the collection's lay unknown ("这个我说不上来，医生。" / "I'm not
sure, doctor."); for a conscious adult asked which drugs he used or whether he smokes, this is an artefact of the
record, not a persona trait — say so if learners remark on it.

**Contradictions and loose ends kept.** (1) 1.0.0 describes the symptoms after treatment as recurring (反复) in Chinese
throughout, and once as "persisted" in English (the pre-operative assessment record): the history says "it keeps coming
back — it's never properly cleared up" and the treatment record's note keeps both readings. (2) 1.0.0's English text
says "Thoracoscopic redo replacement"; its Chinese record and the title say 胸腔镜辅助 (thoracoscope-assisted): the case
says "thoracoscope-assisted" in both languages. (3) 1.0.0 places the heart-failure treatment before this encounter (the
prior-care item) and in the pre-operative assessment: its timing is "not recorded". (4) 1.0.0's README promised a
"documented examination" that 1.0.0 does not contain; the case has no examination findings and says so.

**Unknowns kept honest.** Vital signs, weight and examination; laboratory values; echo detail; the first operation's
indication, approach and prosthesis; drug-use detail, smoking, alcohol, medicines and allergies; the team's reasoning;
operative detail including the explanted valve and the new valve's type; the postoperative course, discharge plan and
follow-up. Record-facing texts say "No result is recorded for this test" or "This case does not record whether this was
done; it does not simulate its effect" — never that the article lacks something.

**Figures and privacy.** The report has no figures in the media review; its source PDF (`source.pdf`) is approved in
`scripts/cmcr-105-media-review.json` ("Both pages visually reviewed; text-only source report without patient-identifying
imaging.") and is linked as a local-only asset (checksum unchanged) for review after the case is complete; it is attached
to no mid-case result. The pseudonym 孔知远 / Kong Zhiyuan is kept from 1.0.0; no hospital, date, initials or occupation
appears.

**Survey findings applied** (`survey/survey.json`, audit of cmcr-1551888, written without the source):

- *Drug use filed as "environmental exposure", unreachable by natural questions (critical).* Now `drug-use` (disclosure
  `specific`, required) with the patient's own words, unknown siblings for route, last use and treatment
  (`drug-detail`), smoking and alcohol, HIV testing; carried into decision 2, decision 3 (`abstinence-first`), the
  communication item, the nurse's and attending's briefs and the debrief. Probed: "你吸过毒吗？", "有没有注射过毒品？",
  "Do you inject drugs?" and "Do you use any recreational drugs?" all reach `drug-use`.
- *No mechanism step before reintervention (major).* Decision 2, the critical `rb-infection-thrombus-screen`, the
  cultures/TOE/CT records and teaching point 2. The explanted valve's findings are not in 1.0.0 (to verify).
- *Straw-man distractors (major).* Five decisions with five options each, every distractor a plausible near-miss with its
  own reason; the report's own choice (redo surgery) appears as part of the Heart Team comparison, not as an absolute.
- *Spoilers (major).* Neutral record names; "reintervention indicated" and the approach moved to the planning record,
  which opens only after the strategy decision and a disposition act; no technique words before that record.
- *Feedback asserting article content no record held (major).* The discussion points 1.0.0 attributes to the report are
  now in the outcome record, and the feedback that cites them is read after it or in the planning phase.
- *Hindsight critical item; generic history and communication (major).* Two critical acts, phase-bound; history items
  for the pivotal facts are required; case-specific communication guidance.
- *Meta-language in the patient's mouth (major).* Lay first-person answers and fallback; persona written for him.
- *Examination claimed but absent (major).* No objective or README line claims an examination; `examNotRecorded` is
  record-facing.
- *Thin records, no interventions, generic staff and debrief (major).* 16 investigations, 13 interventions, three named
  staff, five key reasoning steps and five dated teaching points, seven itemised unknowns.
- *Learning outcomes (major); single guideline (major); citation format, bilingual drift, gates, aliases, summary, review
  flags, README contradictions (minor).* All rewritten as described in the changelog. The audit's suggested 2021 classes
  (e.g. IIb for tricuspid valve-in-valve, IIa for early VKA) are not asserted for 2025 (to verify).
- *Not applied, because 1.0.0 does not record the facts they need:* examination findings, laboratory panels, echo values,
  operative details, the first operation's indication and prosthesis, and the authors' reasoning — all listed under
  To verify.

**Extensions.** `sourceArticleId`, `sourceUrl`, `historicalReview` and `collection` kept; `sourceDoi` and `doiVerifiedAt`
(2026-10-29, the source map's `publisherCheckedAt`) added for the verified DOI; `sourceTextChecked: false`; the
unverifiable `authorChecks` booleans and `sourceTextSha256` removed until the source pass (STANDARD §6.6).

## Matcher notes

- **Phase limits.** The present-tense symptom items (`presenting`, `onset`, `course`, `previous-treatment`, `exertion`),
  `valve-op` and `concerns` are limited to the three pre-operative phases; `postop-course` (phases `postop`,
  `followup`) answers "how have the days since the operation gone?". After the operation a question about the swelling
  gets the lay unknown rather than the admission answer.
- **Shared words separated with `excludeKeywords`:** `presenting` vs onset, course, treatment, exertion, family and
  worries (多久 / 什么时候 / how long / when did / walk / tried…); `onset` vs the operation, last drug use, the dentist and
  warfarin; `previous-treatment` vs hepatitis treatment and current medicines; `current-meds` vs allergies, warfarin,
  antivirals and street drugs; `valve-op` vs "why" and warfarin questions; `drug-use` vs prescriptions, allergies and
  last use; `drug-detail` vs "ever / recreational / street" (so "Have you ever injected drugs?" reaches `drug-use` only);
  `hepatitis` vs family, operations and antivirals; `family` vs "does your family know / visit" (知道 / 照顾 / 陪);
  `home-support` vs family disease.
- **English keywords** avoid one-word wildcards: run-together forms (`broughtyouin`, `comingandgoing`, `didithelp`,
  `seenadoctor`, `howmuchdoyoutake`, `drugsareyoutaking`, `whywasitreplaced`, `whydidyouneed`, `whichdrugs`,
  `howdidyoutake`, `lasttimeyouused`, `whoisathome`, `onyourmind`, `howareyoufeeling`); "at night" was dropped from
  `orthopnoea` because it took the fever and night-sweats question.
- **Order entry.** `orderMatching.rules` send any echo query with 经食管/食道/TOE/TEE/transoesophageal to the TOE, any CT
  query with 冠脉/coronary/CCTA to the coronary CT, "this time / redo / post-op" record queries to the subsequent course
  record and "previous / old / 22" ones to the old operation record, and drop the TTE from "heart team" queries (the
  compacted query contains "tte"); a bare "CT" goes to the CT of the heart, chest and iliofemoral vessels. One warning:
  ordering a TOE once hepatitis has been asked about reminds the learner about varices, platelets and clotting.
- **Interventions.** The harmful discharge item carries no bare 出院 / "discharge" alias (a learner arranging discharge
  after the operation must not trigger it: "出院" now matches nothing, "discharge" scores 0.50, below the 0.55
  resolution threshold).
- **Corpus.** 40 test utterances (25 zh-CN, 15 en), written as learners speak; every required item is covered, and
  `postop-course` is tested in its own phase. Three **look-alike negatives** (`expect: []`): "你家里人知道你住院了吗？" and
  "Is your family coming in to visit today?" (the family-history wording) and "今天早饭吃了没有？" (the appetite wording).
  `cases verify` reports 40/40 with no extra selections.

## References

1. 李嘉亮, 林俊華. 低溫室顫性停搏胸腔鏡輔助下再次三尖瓣置換術1例. 鏡湖醫學. 2025;25(1):59.
   doi:10.12408/j.issn2223-4462.2025.01.015. Available from: https://rs.yiigle.com/cmaid/1551888
2. Praz F, Borger MA, Lanz J, et al. 2025 ESC/EACTS Guidelines for the management of valvular heart disease. Eur Heart J.
   2025;46(44):4635-4736. doi:10.1093/eurheartj/ehaf194
3. Delgado V, Ajmone Marsan N, de Waha S, et al. 2023 ESC Guidelines for the management of endocarditis. Eur Heart J.
   2023;44(39):3948-4042. doi:10.1093/eurheartj/ehad193
4. Fowler VG Jr, Durack DT, Selton-Suty C, et al. The 2023 Duke-International Society for Cardiovascular Infectious
   Diseases criteria for infective endocarditis: updating the modified Duke criteria. Clin Infect Dis.
   2023;77(4):518-526. doi:10.1093/cid/ciad271
5. Zoghbi WA, Jone PN, Chamsi-Pasha MA, et al. Guidelines for the evaluation of prosthetic valve function with
   cardiovascular imaging: a report from the American Society of Echocardiography developed in collaboration with the
   Society for Cardiovascular Magnetic Resonance and the Society of Cardiovascular Computed Tomography. J Am Soc
   Echocardiogr. 2024;37(1):2-63. doi:10.1016/j.echo.2023.10.004
6. Lang RM, Badano LP, Mor-Avi V, et al. Recommendations for cardiac chamber quantification by echocardiography in
   adults: an update from the American Society of Echocardiography and the European Association of Cardiovascular
   Imaging. J Am Soc Echocardiogr. 2015;28(1):1-39.e14.
7. McDonagh TA, Metra M, Adamo M, et al. 2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart
   failure. Eur Heart J. 2021;42(36):3599-3726.
8. 中华医学会肝病学分会, 中华医学会感染病学分会. 慢性乙型肝炎防治指南（2022年版）. 中华传染病杂志. 2023;41(1):3-28.
9. 中华医学会肝病学分会, 中华医学会感染病学分会. 丙型肝炎防治指南（2022年版）. 中华肝脏病杂志. 2022;30(12):1332-1348.
   doi:10.3760/cma.j.cn501113-20221220-00605

**DOIs.** The source DOI is the one the source map (`scripts/cmcr-105-sources.json`) records as verified
(`publisherCheckedAt` 2026-10-29). The DOIs of refs 2–5 and 9 and their volume and pages were confirmed by web search
on 2026-10-30 (publisher, PubMed and repository records; the primary pages themselves could not be opened from this
session — the fetch host is outside the allowed network). Refs 6 and 7 carry no DOI because none was confirmed; ref 8
is cited as the library's other cases cite it.

### To verify

**In the source article (the details 1.0.0 does not give):**

- The presentation as written: extent and side of the oedema, NYHA class, breathlessness or orthopnoea, abdominal
  swelling, jaundice, fever; vital signs, weight and any examination findings (neck veins, murmurs, liver, ascites,
  scars, injection marks).
- The heart-failure treatment: drugs, doses, setting and duration, whether it was given before or during this
  admission, and whether the symptoms persisted or settled and recurred (1.0.0: 反复 in Chinese, "persisted" once in
  English).
- The first operation: its indication (in particular whether it was infective endocarditis), approach, prosthesis
  model and size, concomitant procedures and any anticoagulation since.
- Viral hepatitis: how it was diagnosed, serology, viral loads, liver function, cirrhosis or portal hypertension,
  varices, treatment; HIV status.
- Drug use: substance, route, duration, last use, any treatment or substitution therapy; smoking and alcohol.
- Echocardiography: the exact wording (梗阻 or 狭窄 or 衰败), peak and mean gradients, pressure half-time, orifice area or
  VTI ratio, regurgitation, RV size and function, IVC, pulmonary pressure, the other valves, aortic regurgitation, PFO,
  the LVEF method; any TOE, CT, coronary assessment or blood cultures.
- The team's reasoning: why redo surgery rather than valve-in-valve or medical therapy, why this approach rather than a
  conventional re-operation, any risk score, and when the approach was chosen.
- The operation: incisions and ports, cannulation, temperature, how fibrillation was induced and maintained, whether the
  aorta was clamped, de-airing, intra-operative TOE, **the findings on the explanted valve** (the mechanism), the new
  valve's type and size, blood loss and transfusion.
- The postoperative course: why extubation was on day 2, the intensive-care stay, complications (AV block, bleeding,
  kidney injury, neurological events), anticoagulation and INR target, the discharge echo and medicines, follow-up.
- The authors' discussion: the de-airing and air-embolism points and the stated limitations, which 1.0.0 records only in
  its decision feedback.
- Bibliographic details: the page range (1.0.0 gives p. 59 only; the approved PDF has two pages), the full author list.

**In the guidance (the primary texts were not reachable from this session):**

- ESC/EACTS 2025 VHD — the class and wording of: reintervention for symptomatic bioprosthetic failure; TOE or 4D-CT for
  suspected valve thrombosis and anticoagulation before reintervention; transcatheter valve-in-valve in the tricuspid
  position (2021: IIb for high surgical risk); early antithrombotic therapy after a surgical tricuspid bioprosthesis
  (2021: a VKA for 3 months, IIa; a 2025 commentary describes it as individualised); coronary assessment before valve
  surgery by pre-test probability (CCTA vs invasive angiography; whether the "men over 40" criterion remains); adding
  aspirin to a VKA; Heart Team and centre requirements; any statement on balloon dilation of a bioprosthesis. The
  teaching text states these without classes.
- ESC 2023 endocarditis — the blood-culture wording (number of sets, spacing), the class for antibiotic prophylaxis
  before high-risk dental procedures with prosthetic valves, and its recommendations for people who inject drugs.
- ASE/SCMR/SCCT 2024 — the Doppler criteria for tricuspid prosthesis stenosis (mean gradient, pressure half-time, VTI
  ratio); none is quoted in the case.
- ASE/EACVI 2015 — the LVEF normal range by sex (52–72 % for men) was confirmed only from secondary sources; its DOI.
- ESC 2021 heart failure — the initial IV furosemide wording (at least the oral daily dose; 20–40 mg if diuretic-naive)
  and the citation's DOI.
- 慢性乙型肝炎防治指南（2022年版） — the citation (cited as 中华传染病杂志 2023;41(1):3-28, as in the library's other
  cases); 丙型肝炎防治指南（2022年版） — its DAA and screening statements.
- The prerequisites of hypothermic fibrillatory arrest taught here (aortic regurgitation, interatrial shunt, de-airing
  before the heart ejects) against a cardiac-surgical text, and the safety of TOE in liver disease with possible varices.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the presenting complaint is
  split into presenting complaint, onset, course and earlier treatment; the valve history into the operation and its
  cause; drug use gets its own item; the echo becomes an orderable TTE with its 1.0.0 findings as structured values; the
  pre-operative assessment becomes the treatment planning record (with the performed approach as the planned one); the
  outcome record becomes the subsequent course record (the operation, day 2, day 3) and the discharge record.
- **History.** 15 template slots (7 of them answered with "The source notes do not provide that information") → 26
  items in his lay voice: 10 recorded facts, 15 honest unknowns, one labelled ICE device; 9 required.
- **Phases and gates.** 3 template phases (two learner-switchable, `{always: true}` and nested gates) → 5 one-way
  phases gated on the preceding objectives; the outcome phase opens only after all five decisions.
- **Investigations.** 4 record reviews (two named "preoperative") → 16: 5 record reviews with neutral names, the orderable echo,
  and honest no-result records for the ECG, chest film, bloods, viral tests, abdominal ultrasound, cultures, TOE, CT and
  coronary CT; order-matching rules and a TOE warning.
- **Interventions.** 0 → 13: cannula, IV furosemide, daily weights, Heart Team referral, hepatology, addiction support,
  consent, warfarin (contraindicated before the operation), endocarditis prevention; harmful: discharge on more
  diuretic, empirical antibiotics, balloon dilation, lifelong warfarin plus aspirin — each with a harm text.
- **Decisions.** 3 template decisions (ids `supported` / `alternative-N`, absolute distractors, an appraisal question as
  the critical item) → 5 decisions with 5 options each and content ids: the leading cause and first test, the mechanism
  before reintervention, the strategy, the technique's prerequisites (select all), the discharge plan (select all).
- **Rubric.** 10 template items → 12: two critical acts (`rb-infection-thrombus-screen`, `rb-heart-team`), an avoided-harm
  item with `scoredWhen`, first-try decision scoring, phase-bound orders, and a Calgary–Cambridge communication item
  written for the case.
- **Safety review before release (2026-10-30).** The TOE key now names its precondition in a man with hepatitis B and C
  (varices or bleeding, platelets, clotting; CT as the alternative), with an unknown GI-bleeding history item and a TOE
  order warning; the warfarin key and dose name the baseline INR and platelets; the discharge item no longer counts a
  warfarin act that may have been given before the operation; the harmful discharge item lost its bare 出院 alias; the
  2025 wording on early anticoagulation after a surgical bioprosthesis is stated as individualised. The attending's and
  the surgeon's briefs no longer hold any result (the LVEF, the technique, the discharge day), since model-backed staff
  read them in their prompt; dose, harm and response texts that can be read before the echo or before decision 3 no
  longer name the obstruction, a re-operation, the strategy options or a new valve.
- **Teaching layer.** 6 learning outcomes, 6 objectives, 3 named staff, 5 key reasoning steps and 5 dated teaching
  points (each contrasting the recorded course with current practice), 7 unknowns, 9 Vancouver references.
- **Card.** Title kept; new spoiler-free summary (1.0.0's pointed at the prosthesis), lay chief complaint, triage note as
  a handover, three presenting-feature tags, topic tags `leg-swelling` and `previous-heart-surgery`; estimated time 30 →
  40 min.
- **Governance.** Review status and notes in the STANDARD §6.6 wording (the English last sentence reads "The case is not
  yet reviewed by a licensed clinician." because the collection contract matches that phrase case-sensitively);
  `sourceTextChecked: false`; `authorChecks` and `sourceTextSha256` removed until the source pass; `sourceDoi` +
  `doiVerifiedAt` added; the source citation without double space or zero-padded issue; the approved PDF kept.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, no examination
  findings, 4 record reviews, 3 decisions, 10 rubric items (9 deterministic) and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1551888/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1551888 --lang en                                                 # 78 steps · objectives 6/6 · decisions 5/5 · utterances 40/40 · rubric 30/30 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-1551888                       # depth floor, do-nothing 0, wrong-first 57 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1551888:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1551888:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-10-30: all five pass.

## 中文摘要

**病例概要。** 48岁男性，下肢水肿、活动后胸闷半年，经改善心功能治疗后反复，收住病房。有乙肝、丙肝和既往使用毒品史；22 年前
因严重三尖瓣病变行三尖瓣生物瓣置换。超声心动图示三尖瓣生物瓣重度梗阻，左心室射血分数 54%（男性正常范围内，但不反映右心）。诊
断：症状性三尖瓣生物瓣功能障碍（重度梗阻）伴体循环淤血；梗阻机制（结构性衰败、血栓、心内膜炎或血管翳）没有记录。团队认为具
备再次置换指征，在胸腔镜辅助、低温室颤停搏下完成再次三尖瓣置换，体外循环 182 分钟；术后第 2 天拔管，第 3 天转普通病房，第
13 天出院；没有长期随访。生命体征、查体、化验、跨瓣压差、右心功能、首次手术原因、新瓣膜类型均无记录。本版依据 1.0.0 版提取
的事实改写，尚未对照原文全文核对。

**学习目标。**

1. 对瓣膜置换术后反复的体循环淤血，首先考虑人工瓣功能障碍，首选带完整人工瓣多普勒评估的经胸超声心动图（ESC/EACTS 2025；ASE
   2024）。
2. 说明 54% 的射血分数（ASE/EACVI 2015 男性正常范围 52%–72%）为何不能排除人工三尖瓣梗阻引起的右心衰竭。
3. 再次干预前查明梗阻机制：抗生素前三套血培养，经食管超声或 CT，有血栓先抗凝（ESC 2023 心内膜炎指南；ESC/EACTS 2025）。
4. 及时提交心脏团队，比较外科再次置换与经导管瓣中瓣（ESC/EACTS 2025）。
5. 说出低温室颤停搏下再次手术的术前要点，并把单个病例只当作可行性证据。
6. 不带偏见地制订并解释术后计划：按瓣膜类型抗凝、基线超声、心内膜炎预防、肝炎治疗和成瘾支持。

**关键决策。** 决策 1：首要解释与第一项检查——人工瓣功能障碍，首选经胸超声心动图（干扰项：肝硬化、冠心病、缩窄性心包炎、利尿
不足）。决策 2：再次干预前先查明机制——血培养、经食管超声或 CT、有血栓先抗凝（干扰项：认定磨损直接手术、先用抗生素、因射血分
数正常去查肝肾、抗凝后出院）。决策 3：现在提交心脏团队比较两种再干预方式（干扰项：继续利尿等待、瓣中瓣作为默认、球囊扩张、要求
戒毒证明）。决策 4（多选）：经食管超声查主动脉瓣反流和心房水平分流、胸部及髂股血管 CT、冠状动脉评估。决策 5（多选）：按瓣膜类
型抗凝、基线超声与房室传导阻滞监测、心内膜炎预防与肝炎治疗和成瘾支持。两个关键项：团队讨论前完成血培养和经食管超声（或 CT），
以及及时提交心脏团队且不以加量利尿出院或球囊扩张代替。

**复盘要点。** 用多普勒量化人工瓣梗阻并与基线比较，射血分数正常不代表右心正常（ASE 2024；ASE/EACVI 2015）；再次干预前先定机制
（ESC/EACTS 2025；ESC 2023 心内膜炎指南；Duke-ISCVID 2023）；策略由心脏团队决定，转诊不能拖；报告的术式有其前提，一例术后第 13
天出院只证明可行；术后按瓣膜类型抗凝，预防心内膜炎，治疗乙肝丙肝（中华医学会 2022 年指南），不带评判地提供成瘾支持。记录的病程
没有说明是否先查明了梗阻机制、比较过哪些方案，以及出院后的情况。
