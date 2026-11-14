# cmcr-77850 — Repeated blackouts · 28-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 朱玉峰, 白元, 王飞宇, 吴弘, 秦永文, 赵仙先. 长QT综合征行左心交感神经切除术后七年再发晕厥一例.
中华心律失常学杂志. 2014;18(2):157-158. Version 1.1.0 re-authors the case to the clinical content standard **from the
facts that version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has
yet been checked against the full source article** (STANDARD §6). The patient (秦予宁 / Qin Yuning) is a pseudonym; the
nurse (裴护士 / Nurse Pei), the attending (邵医生 / Dr Shao), the electrophysiologist (雷医生 / Dr Lei) and the pharmacist
(鲍药师 / Pharmacist Bao) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not
record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-77850` / `1.1.0` |
| setting / facility | `emergency` / `general-hospital` (emergency department; then a monitored bed in critical care, then the ward) |
| specialty | cardiology, emergency medicine |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30; independent AI-assisted review and fixes 2026-11-14); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a cardiologist (ideally an electrophysiologist) review it before teaching use |
| phases | `ed` 急诊就诊 / In the emergency department → `monitored` 收入监护病床后 / On the monitored bed (critical care) → `recovery` 病情稳定以后 / Once she has stabilised (ward) → `followup` 记录的结局 / Recorded outcome — all one-way, none learner-switchable |
| content | 23 history items (10 recorded facts, 12 unknown, 1 labelled teaching device; 9 required) · 4 examination findings (the admission examination, phase `ed`) · 11 investigations (3 record reviews; 6 without a recorded result) · 17 interventions (5 harmful when given while contraindicated: 3 critical, 2 non-critical) · 6 objectives · 5 decisions (21 options) · 12 rubric items (11 deterministic, weight 28; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 5 teaching points · 44 test utterances |

## Learning outcomes

After the case the learner can:

1. Distinguish arrhythmic syncope from epileptic seizure and reflex syncope when blackouts come with urinary
   incontinence, an emotional trigger and vomiting, by setting the history beside a 12-lead ECG, and treat blackouts in
   known long-QT syndrome as high-risk syncope (ESC 2018 syncope).
2. Recognise a QTc of 0.58 s with ventricular bigeminy and a potassium of 3.3 mmol/L in known long-QT syndrome as an
   imminent risk of torsade de pointes, and start continuous ECG monitoring with a defibrillator ready at once (ESC 2018
   syncope; ESC 2022 VA/SCD).
3. Treat torsade de pointes in congenital long-QT syndrome: defibrillate sustained or pulseless runs at once, give
   magnesium sulfate 2 g (8 mmol) IV, keep potassium at 4.5–5.0 mmol/L and restart a non-selective beta-blocker; avoid
   amiodarone and QT-prolonging drugs such as ondansetron, and if runs persist raise the rate by pacing rather than
   isoprenaline (RCUK 2026 tachyarrhythmia algorithm; ESC 2022 VA/SCD; AHA/ACCF 2010; US FDA 2011).
4. Interpret a QTc that stays at 0.61 s after recovery, and a recurrence seven years after left cardiac sympathetic
   denervation while off the beta-blocker, as persisting high risk, and explain why an emotional trigger suggests but
   cannot establish a genotype (ESC 2022 VA/SCD).
5. Plan secondary prevention before discharge: a full-dose non-selective beta-blocker with an adherence plan, an ICD
   assessment by an inherited-arrhythmia team, genetic counselling and testing, ECG screening of first-degree relatives
   and a list of QT-prolonging drugs to avoid (ESC 2022 VA/SCD; EHRA/HRS/APHRS/LAHRS 2022 genetic testing consensus).
6. Explain what this single report can and cannot show: more than a year without syncope after discharge does not prove
   that the risk has gone while the QTc remains 0.61 s.

They name the diagnosis, so front-ends show them before play only on request (GLOSSARY §4).

## Clinical summary (spoilers)

A 28-year-old woman was seen seven years earlier for long QT and a dangerous arrhythmia and had a **left cardiac
sympathetic denervation** (LCSD; "seven years after" comes from the report's title). She took **propranolol for about a
year** after the operation and then **stopped it herself** (dose not recorded). From **the day before admission** she
blacked out repeatedly: the first time she came round after a few minutes, then the attacks recurred; she was
**incontinent of urine** when she blacked out and afterwards **dizzy, weak, nauseated and vomiting**; **this episode
followed emotional upset**. Nobody in her family had similar blackouts. On examination she was **alert but looked
unwell**, normally developed, with **normal hearing**, clear lungs and a **regular rhythm without murmur**.

- **ECG:** QTc **0.58 s** with **ventricular bigeminy**.
- **Potassium on admission:** **3.3 mmol/L** (no reference range or other electrolytes recorded).
- **Echocardiography:** cardiac structure and function reported normal.
- **Monitor recordings during the attacks:** **recurrent torsade de pointes**; some runs stopped by themselves after
  seconds, others needed **emergency electrical cardioversion**.
- **Recorded treatment and outcome:** potassium and magnesium supplementation, cardioversion and **propranolol
  restarted**; **QTc 0.61 s once stable**; discharged after **11 days**; **no syncope over more than a year** of
  follow-up.

**Diagnosis:** long-QT syndrome (genotype not recorded) with recurrent torsade de pointes seven years after LCSD, off
beta-blockade and with hypokalaemia. **Today's answer** (ESC 2018 syncope; ESC 2022 VA/SCD; RCUK 2026 tachyarrhythmia
algorithm; AHA/ACCF 2010 for the potassium target): monitoring with a defibrillator from the first minute in the
emergency department; magnesium sulfate 2 g (8 mmol) IV; potassium to 4.5–5.0 mmol/L; no QT-prolonging drugs (the
vomiting invites ondansetron, which is the trap); shocks for sustained or pulseless runs, never amiodarone, and — if the
rate must be raised — pacing, not isoprenaline, in emotion-triggered congenital long QT (ESC 2022 recommends isoprenaline
or pacing for acquired long QT; RCUK lists both without that distinction); a full-dose
non-selective beta-blocker with an adherence plan; and, before discharge, an ICD assessment, genetic counselling and
testing and ECG screening of first-degree relatives — none of which the record mentions.

## Scenario timeline and physiology

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the recorded one. There is
  no monitor baseline: the monitoring step's response says the readings are not recorded.
- **Four one-way phases** (none learner-switchable; a record read in an earlier phase stays readable by phase):
  - `ed` — the history in her own words (the recorded presentation, trigger, past history, operation, propranolol and
    family history; the rest unknown), the **admission examination** (four findings, this phase only), the **12-lead
    ECG** (bedside order; QTc 0.58 s, bigeminy; its time is not recorded), **electrolytes** (potassium 3.3 mmol/L), the
    magnesium level, capillary glucose, pregnancy test, EEG and earlier records (each: "No result is recorded for this
    test"), the echocardiogram (staged from here: "during this admission, exact time not recorded"), decisions 1 and 2,
    the immediate acts and **the admission to a monitored bed**.
  - `monitored` — opens once the history objective, the first look (examination, ECG and electrolytes read in `ed`,
    decision 1) and the first hour (decision 2 and the admission) are done (`enterWhen`: objectives `obj-blackouts`,
    `obj-first-look`, `obj-first-hour`), and moves her to a critical-care bed (`location: {setting: "icu"}`): the
    **monitor recordings of her attacks** (recurrent torsade de pointes; critical result), the echocardiogram, decision
    3 and the treatment of the attacks — the learner's **shock on the monitored bed** stands for the recorded emergency
    cardioversion (staging), and the phase does not end until one is given.
  - `recovery` — opens once `obj-attacks` (the monitor recordings read in `monitored`, the echocardiogram, decision 3
    and a shock given on the monitored bed) is done, on the ward (`location: {setting: "ward"}`): the **ECG once
    stable** (QTc 0.61 s), the genetic test (no result recorded), decisions 4 and 5 and the discharge acts.
  - `followup` — opens once all five earlier objectives (and so all five decisions) are done: the **reported course and
    outcome** record.
- No prompt, hint, order response or harm text states a later phase's result before its record opens. The documented
  steps' responses (magnesium, potassium, propranolol, shocks) say what the record shows was done, without doses.

## Decisions and assessment

### Objectives (HUD task list)

| id | title | complete when |
|---|---|---|
| `obj-blackouts` | 问清这几次晕倒的来龙去脉 / Take the story of the blackouts | presentation, onset, course, incontinence, after-waking, trigger, past heart history, operation, propranolol asked |
| `obj-first-look` | 查体，并阅读第一份心电图和血液检查 / Examine her and read the first ECG and bloods | general state, hearing and heart examined; ECG and electrolytes read in `ed`; decision 1 answered |
| `obj-first-hour` | 决定她现在需要什么，并马上去做 / Decide what she needs now, and do it | decision 2 answered and `admit-monitored` given |
| `obj-attacks` | 处理监护病床上的反复发作 / Treat the attacks on the monitored bed | monitor recordings read in `monitored`; echocardiogram read (`ed` or `monitored`); decision 3 answered; a shock given while not contraindicated (`{intervened: "defibrillation", valid: true}` — only possible on the monitored bed) |
| `obj-before-discharge` | 出院前评估风险，制订计划 / Assess her risk and plan before discharge | ECG read in `recovery`; decisions 4 and 5 answered |
| `obj-outcome` | 查阅记录的结局 / Review the recorded outcome | outcome record read in `followup` |

No objective holds a condition that can become permanently false (no phase leaf, no `whenIndicated`, no
`decidedFirstTry`); the reads in `ed` sit in objectives the next phase waits for, so they cannot be missed. The shock in
`obj-attacks` works the same way as the admission in `obj-first-hour`: `recovery` waits for it, so she stays on the
monitored bed until it is given, and answering decision 3 no longer moves her to the ward before the learner has acted
(in the first draft it did, so the reference path shocked her on the ward after she had stabilised).

### Decisions

| # | id | unlocks when | key | what the distractors test |
|---|---|---|---|---|
| 1 | `mechanism` (single) | presentation, onset, course, incontinence, after-waking, trigger, past heart history, operation asked; ECG and electrolytes read in `ed` | `torsade-in-lqts` — arrhythmic syncope from torsade in long QT, low potassium and the stopped beta-blocker as precipitants | epilepsy from the incontinence (`epileptic-seizures`); a vasovagal faint from the trigger and vomiting (`vasovagal-emotion`); an acquired long QT from hypokalaemia alone (`hypokalaemia-alone`) |
| 2 | `first-hour-plan` (single) | decision 1; propranolol history asked | `monitor-magnesium-admit` — monitor and pads now, magnesium sulfate 2 g IV, potassium to 4.5–5.0 mmol/L, no QT-prolonging drugs, propranolol, a monitored bed | home with a Holter (`holter-and-clinic`); amiodarone, ondansetron and magnesium held back (`amiodarone-and-antiemetic`); neurology, EEG and levetiracetam off the monitor (`neurology-and-eeg`) |
| 3 | `torsade-treatment` (single) | decision 2; monitor recordings read in `monitored`; trigger asked | `shock-magnesium-betablocker` — shock sustained or pulseless runs, repeat magnesium, potassium 4.5–5.0 mmol/L, propranolol, no QT-prolonging drugs, pacing if runs persist | the VF algorithm's amiodarone (`amiodarone-per-algorithm`); isoprenaline to shorten the QT (`isoprenaline-to-shorten-qt`); synchronised shocks for every run and the beta-blocker held (`synchronised-hold-betablocker`) |
| 4 | `future-risk` (single) | decision 3; ECG read in `recovery`; family history asked | `risk-high-subtype-open` — still high risk; the trigger hints at a subtype, genetic testing types it; a negative family history excludes nothing | the trigger proves LQT2 (`trigger-proves-lqt2`); the risk has reset (`risk-back-to-baseline`); repeat denervation, then no beta-blocker or ICD (`repeat-denervation`) |
| 5 | `discharge-plan` (select all) | decision 4 | `full-dose-beta-blocker` + `icd-assessment` + `genetics-and-relatives` | an ICD replacing the beta-blocker (`icd-instead-of-drug`); denervation and potassium tablets instead of a beta-blocker (`denervation-and-potassium`) |

Every decision opens before the record that would confirm its answer (decision 1 before the monitor recordings,
decision 4 before the outcome record). No decision is gated on an unknown history item. Option ids name the content;
in the single-best decisions no key is the longest option in either language (measured: each has a distractor at least
as long), and in the select-all decision 5 the three keys are not the three longest options in either language (a
distractor is longer than two of the keys in en and zh-CN).

### Rubric (11 deterministic items, total weight 28, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-blackout-story` | history | 2 | presentation, onset, course, incontinence, after-waking and trigger asked |
| `rb-heart-background` | history | 2 | past heart history, operation, propranolol, other medicines, family blackouts and family sudden death asked (the last two unknown — asking is the competency) |
| `rb-examination` | examination | 1 | general state, hearing, heart and lungs examined |
| `rb-first-tests` | investigations | 2 | ECG and electrolytes read in `ed`; magnesium ordered in `ed` |
| `rb-mechanism` | diagnosis | 3 | `mechanism` right first time |
| `rb-monitor-now` | management | 4 | **critical** — `monitor-defib` given **while in `ed`** (`whenIndicated`; its `indicatedWhen` is `{phase: "ed"}`) |
| `rb-first-hour` | management | 3 | `first-hour-plan` right first time; magnesium and potassium given in `ed` or `monitored` (`whenIndicated`); propranolol given; admitted to a monitored bed |
| `rb-torsade` | management | 3 | `torsade-treatment` right first time; a shock on the monitored bed after the monitor recordings were read (`whenIndicated`; its `indicatedWhen` is phase `monitored` and the recordings read there); arrhythmia team called |
| `rb-no-harm` | safety | 3 | **critical** — no ondansetron, amiodarone or isoprenaline, no discharge from `ed`/`monitored` and no shock outside the monitored bed (both counted only while contraindicated: `valid: false`); scored once decision 2 or 3 is attempted or any of these harms is done |
| `rb-future-risk` | diagnosis | 2 | `future-risk` right first time |
| `rb-secondary-prevention` | management | 3 | `discharge-plan` right first time; ICD referral, genetic counselling, relatives' screening and discharge teaching given |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: plain explanation of the long QT and the low potassium, the monitor and the drugs; non-judgemental exploration of why she stopped propranolol; her worry answered honestly; ICD, genetic testing and family screening as shared decisions; a list of drugs to avoid |

### How wrong choices score (re-measured with the reducer on 2026-11-14, after the review fixes)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 28/28 (100 %) | none | passed |
| start and do nothing | 0/25 (`rb-no-harm` not scored) | `rb-monitor-now` | — (the case cannot be finished) |
| wrong first answer at all five decisions, then right | 14/28 (50 %) | none | passed |
| wrong first answer at decision 1 only | 25/28 (89 %) | none | passed |
| wrong first answer at decision 2 only | 25/28 (89 %) | none | passed |
| wrong first answer at decision 3 only | 25/28 (89 %) | none | passed |
| wrong first answer at decision 4 only | 26/28 (93 %) | none | passed |
| wrong first answer at decision 5 only | 25/28 (89 %) | none | passed |
| reference path without the monitor and pads | 24/28 (86 %) | `rb-monitor-now` | passed |
| monitor and pads first applied on the monitored bed | 24/28 (86 %) | `rb-monitor-now` | passed |
| reference path + ondansetron in the ED | 25/28 (89 %) | `rb-no-harm` | passed (non-critical harm) |
| reference path + amiodarone on the monitored bed | 25/28 (89 %) | `rb-no-harm` | **failed** |
| reference path + isoprenaline on the monitored bed | 25/28 (89 %) | `rb-no-harm` | **failed** |
| reference path + discharge with a Holter from the ED | 25/28 (89 %) | `rb-no-harm` | **failed** |
| reference path + a shock in the ED (alert, no run in progress) | 25/28 (89 %) | `rb-no-harm` | passed (non-critical harm) |
| reference path + a shock on the ward (attacks controlled) | 25/28 (89 %) | `rb-no-harm` | passed (non-critical harm) |
| reference path + discharge with a Holter from the ward (not contraindicated) | 28/28 (100 %) | none | passed |
| reference path without magnesium and potassium | 25/28 (89 %) | none | passed |
| magnesium and potassium given only after the outcome record | 25/28 (89 %) | none | passed |
| reference path without the arrhythmia team | 25/28 (89 %) | none | passed |
| a shock on the monitored bed before the recordings are read | 25/28 (89 %) | none | passed |
| reference path without any shock | — (she stays on the monitored bed: `recovery` waits for the shock) | — | — |
| reference path without the ICD referral, counselling, screening and teaching | 25/28 (89 %) | none | passed |
| reference path without asking about other medicines and sudden death in the family | 26/28 (93 %) | none | passed |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. **Timing of the critical
act.** `rb-monitor-now` counts only a monitor applied while the case is still in `ed` (`whenIndicated`), before the
monitor recordings that confirm torsade exist; a learner who puts her on the monitor only on the monitored bed, or never,
misses it. Magnesium and potassium count in `ed` or `monitored` (their `indicatedWhen`), so a late dose after the outcome
record earns nothing. The admission is required to leave `ed` (`obj-first-hour`), so the recorded course opens only after
a disposition the record supports; a learner who first sends her home with a Holter has already failed the safety
outcome. The shock counts only on the monitored bed once the recordings are read (its `indicatedWhen`); given in the
emergency department or on the ward it is contraindicated and loses `rb-no-harm`. **Known limit:** propranolol, the
arrhythmia team and the discharge acts are not time-gated (a late act still meets its item); debrief the order from the
transcript.

### Critical items

`rb-monitor-now` (the missed life-saving act: continuous ECG monitoring with defibrillator pads in the emergency
department, before the recorded torsade) and `rb-no-harm` (the dangerous errors: a QT-prolonging drug, isoprenaline,
sending her home from the department or the monitored bed, or a shock with no run to shock). Both are acts; neither reads
a final-phase record.

**Safety outcome.** `amiodarone` and `isoprenaline` (always contraindicated) and `discharge-holter` (contraindicated in
`ed` and `monitored`) are `critical: true`: amiodarone lengthens the QT in torsade, isoprenaline adds adrenergic drive in
emotion-triggered congenital long QT, and sending a patient with recurrent arrhythmic syncope home removes the
defibrillator — each fails the assessment's safety outcome whatever the score. `defibrillation` is `risk: "high"`,
indicated on the monitored bed once the recordings are read and contraindicated in `ed`, `recovery` and `followup`
(an alert patient with a perfusing rhythm, then a patient whose attacks are controlled), with `critical: false`: a shock
with no run in progress hurts and can itself start VF, but with the pads on it is recoverable, so it loses `rb-no-harm`
without failing the safety outcome. `ondansetron` is `risk: "moderate"` without a `critical` flag: a QT-prolonging
antiemetic is a real error (it loses `rb-no-harm`) but a recoverable one. For `isoprenaline`, note that the RCUK
algorithm lists "isoprenaline or temporary pacing to increase HR" for polymorphic VT with QT prolongation without
separating congenital from acquired long QT; ESC 2022 recommends either only in acquired long QT, and the case treats it
as critical because her attacks are emotion-triggered congenital long QT — a clinician should confirm this judgement
(To verify).

## Reference path (`solution`)

70 steps, static clock: start → presentation, onset, course → **monitor and pads** → incontinence, after-waking, trigger,
palpitations, chest pain/breathlessness, injury, witness → past heart history, operation, blackouts since the operation,
propranolol, why she stopped, other medicines, allergies, family blackouts, family sudden death, other triggers,
pregnancy, alcohol/drugs, her worry → examination (general state, hearing, heart, lungs) → **12-lead ECG** → **IV
cannula** → **electrolytes** → magnesium, glucose, pregnancy test, earlier records (no results) → `mechanism` →
`first-hour-plan` → **magnesium sulfate**, **potassium**, QT-drug review, **propranolol**, arrhythmia team → **admit to a
monitored bed** → (phase `monitored`) **monitor recordings** → echocardiogram → **defibrillation**, repeat magnesium →
`torsade-treatment` → (phase `recovery`) **ECG once stable** → genetic test (no result) → `future-risk` → ICD referral,
genetic counselling, relatives' screening, discharge teaching → `discharge-plan` → (phase `followup`) outcome record →
finish. The shock and the repeat magnesium are given on the monitored bed (checked step by step with the reducer: the
phase is `monitored` for both). `cases verify` passes: objectives 6/6, decisions 5/5, rubric 28/28, utterances 44/44.
Every unknown asked returns
the lay unknown ("这个我说不上来，医生。" / "I'm not sure, doctor.").

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 28-year-old woman | `patient.age`, `sex` | `patient.age`, `sex`; title |
| seen seven years earlier for long QT and a dangerous arrhythmia | `history.pmh` | `history.past-heart` |
| left cardiac sympathetic denervation; "seven years after" the operation | `history.operations`; `provenance.citation` (title) | `history.operation` |
| propranolol for about a year after the operation, then stopped by herself; dose not recorded | `history.medications` | `history.propranolol` (dose as a lay unknown) |
| this recurrence began the day before admission | `history.onset` | `history.onset` ("yesterday — the day before I came into hospital") |
| came round after a few minutes at first; then recurrent attacks | `history.progression` | `history.course` |
| urinary incontinence during the syncope; dizziness, weakness, nausea and vomiting after waking | `history.associated` | `history.incontinence`, `history.after-waking` |
| this attack followed emotional upset | `history.exposure` | `history.trigger` (this episode only) |
| no similar syncope in the family | `history.family` | `history.family-fainting` |
| alert but unwell; hearing and development normal | `exam.exam-1` | `exam.general` (alert, looks unwell, normally developed), `exam.hearing` |
| lungs clear; regular rhythm, no murmur | `exam.exam-2` | `exam.lungs`, `exam.heart` |
| QTc 0.58 s with ventricular bigeminy | `investigations.ecg` | `investigations.ecg` result `ed` (critical) |
| recurrent torsade de pointes; some runs ended after seconds, others needed emergency cardioversion | `investigations.rhythm` | `investigations.rhythm` (record review) result `monitored` (critical) |
| potassium on admission 3.3 mmol/L | `investigations.electrolytes` | `investigations.electrolytes` result `ed` (`values`: 3.3 mmol/L, flag L, "No reference range recorded in this case") |
| cardiac structure and function reported normal | `investigations.echo` | `investigations.echo` results `ed`, `monitored`, `recovery` (same text; "during this admission, exact time not recorded") |
| potassium and magnesium supplementation, cardioversion, propranolol resumed; QTc 0.61 s once stable; discharged after 11 days; no syncope over more than a year | `investigations.outcome` | `investigations.outcome` result `followup`; `investigations.ecg` result `recovery` (QTc 0.61 s); the responses of `magnesium-iv`, `potassium`, `propranolol`, `defibrillation` |
| genotype, complete ICD assessment and longer follow-up absent | `debrief.unknowns`, `unknowns` | 12 unknown history items; `genetic-test`, `magnesium`, `glucose`, `pregnancy-test`, `old-records`, `eeg` (`available: false`); `examNotRecorded`; 7 `unknowns` |

**Times.** Recorded: about seven years since the diagnosis and the operation; about a year on propranolol; onset the day
before admission; the first blackout lasting a few minutes; torsade runs ending after seconds; 11 days in hospital; more
than a year of follow-up. Not recorded: the times of the 0.58 s ECG, the potassium (only "on admission"), the
echocardiogram, the torsade episodes and shocks, and the 0.61 s ECG ("once stable"). The case shows the first ECG and the
potassium in the emergency department and the torsade on the monitored bed: **staging**, labelled in each result's date.

**Derived values (from recorded numbers only):** QTc 0.58 s = 580 ms and 0.61 s = 610 ms, both above the ESC 2022
diagnostic threshold of 480 ms and above 500 ms; the QTc recorded once stable is 0.03 s (30 ms) **longer** than the first
(times, heart rates, potassium and drugs at each are not recorded — see To verify). Time off propranolol before this
recurrence: about six years (seven years since the operation less about a year on the drug; approximate, since 1.0.0
gives "about a year" and "later stopped"). LQTS diagnostic (Schwartz) score, 2011 version, from recorded items only:
QTc ≥ 480 ms 3 points + torsade de pointes 2 points (syncope is not scored when torsade is) + no congenital deafness
(hearing normal) 0 = **at least 5 points** (≥ 3.5: high probability); family-history points cannot be assigned (no
relative with known LQTS or sudden death is recorded). The score asks for a QTc without a secondary cause; her admission
potassium was 3.3 mmol/L, which is why the 0.61 s tracing once stable matters (its potassium is unrecorded). No weight is
recorded, so no weight-based dose is computed.

**Guidance numbers used in teaching text:** magnesium 8 mmol IV over 10 minutes (RCUK tachyarrhythmia algorithm, 2025
guidelines, "Updated March 2026" — read from the PDF on 2026-11-14), which is magnesium sulfate about 2 g (the AHA/ACCF
2010 statement's "magnesium sulfate 2 g", Class IIa); potassium target 4.5–5.0 mmol/L (AHA/ACCF 2010: repletion to
4.5–5 mmol/L "may also be considered", Class IIb, level C — read on 2026-11-14; ESC 2022 recommends IV magnesium with
potassium supplementation in torsade, Class I, without a target); LQTS diagnosis at QTc ≥ 480 ms or a diagnostic score
> 3 (ESC 2022 VA/SCD); ESC 2018 syncope's major high-risk ECG feature "QTc > 460 ms in repeated 12-lead ECGs indicating
LQTS". Numbers that appear only in wrong options or harmful acts, as
the tempting choice, not as advice: amiodarone 300 mg IV after the third shock; isoprenaline to a heart rate of about
100/min; ondansetron 4 mg IV.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions.** "When she said she wet herself, what was your first thought? When did it change?" — "How did it feel to
  read 0.58 s while she was still on a trolley without a monitor?"
- **Description.** "Walk me through the first ten minutes: what did you ask, what did you put on her, what did you
  order, in what order?" — "What did the monitor recordings show, and what had you already done by then?"
- **Analysis.**
  - "Which features of her story fit a seizure, which a faint, and which an arrhythmia — and which single test
    separated them?" (incontinence and vomiting fit all three; known long QT and the ECG decide it.)
  - "What was lengthening her QT that day, and what could you correct within the hour?" (low potassium; magnesium; no
    QT-prolonging drugs; the stopped beta-blocker.)
  - "She was vomiting. Which antiemetic did you reach for, and why is that the trap?" (ondansetron: FDA 2011.)
  - "Why is amiodarone right in VF and wrong here? Why is isoprenaline right in some torsade and wrong here?"
  - "Her QTc was 0.61 s once stable — longer than on arrival. What does that tell you about her risk, and what can it
    not tell you?" (the timing, potassium and drugs at each tracing are not recorded.)
  - "The record shows no syncope for a year. Does that settle the ICD question?"
- **Summary.** "Name the one act that must happen in the emergency department, and the three things that must happen
  before she goes home."

### Common learner errors and how the case surfaces them

| error | where it shows |
|---|---|
| Calling the blackouts epileptic because of the incontinence | decision 1 (`epileptic-seizures`); decision 2 (`neurology-and-eeg`); EEG ordered (low-value, no result) |
| Reading the emotional trigger and vomiting as a vasovagal faint | decision 1 (`vasovagal-emotion`) |
| Treating the hypokalaemia as the whole story | decision 1 (`hypokalaemia-alone`); decision 4 (`risk-back-to-baseline`) |
| No monitor and defibrillator in the emergency department | `rb-monitor-now` (critical) |
| Ondansetron for the vomiting | `ondansetron` (contraindicated, harm text); `rb-no-harm` (critical) |
| Amiodarone "as in the arrest algorithm" | decision 3 (`amiodarone-per-algorithm`); `amiodarone` (critical intervention) |
| Isoprenaline to shorten the QT | decision 3 (`isoprenaline-to-shorten-qt`); `isoprenaline` (critical intervention) |
| Sending her home with a Holter | decision 2 (`holter-and-clinic`); `discharge-holter` (critical intervention) |
| Shocking her with no run in progress (alert in the ED; settled on the ward) | `defibrillation` contraindicated outside the monitored bed (harm text); `rb-no-harm` (critical) |
| Answering decision 3 and forgetting to treat the runs | `obj-attacks` stays open and `recovery` waits until the runs are shocked on the monitored bed |
| Assigning LQT2 from the trigger; skipping genetic testing | decision 4 (`trigger-proves-lqt2`) |
| Trusting the denervation, or an ICD, instead of the beta-blocker | decision 4 (`repeat-denervation`); decision 5 (`icd-instead-of-drug`, `denervation-and-potassium`) |
| Not asking why she stopped her tablets | `rb-communication` (judged); the unknown `why-stopped` answer prompts the conversation |

### Teaching points for the debrief

1. Incontinence does not make a blackout epileptic; ESC 2018 syncope counts an ECG pointing to long QT among the
   high-risk features and asks for in-hospital ECG monitoring. Then and now: the record caught her torsade on the
   monitor; today the monitor goes on in the emergency department.
2. Torsade: shock sustained or pulseless runs and stop QT-prolonging drugs (AHA/ACCF 2010); magnesium 8 mmol (about
   2 g) IV over 10 minutes and no amiodarone (RCUK 2026); potassium with the magnesium (ESC 2022), aiming for 4.5–5.0
   mmol/L (AHA/ACCF 2010). ESC 2022 recommends isoprenaline or pacing to raise the rate in acquired long QT; in
   emotion-triggered congenital long QT, pacing, not isoprenaline. The recorded potassium, magnesium and shocks match
   current practice.
3. QT-prolonging drugs: avoid them and correct electrolytes (ESC 2022 VA/SCD); ondansetron is to be avoided in congenital
   long QT (FDA 2011) — check every new drug against a list such as CredibleMeds.
4. Beta-blockade is the foundation (non-selective nadolol or propranolol, ESC 2022 VA/SCD); LCSD is a complement, not a
   replacement. Then and now: she stopped propranolol herself; the team restarted it; today add an adherence plan.
5. Before discharge: an ICD assessment, genetic counselling and testing, ECG screening of first-degree relatives (ESC 2022
   VA/SCD; EHRA/HRS/APHRS/LAHRS 2022). A QTc of 0.61 s once stable means a quiet year does not end the risk. The record
   mentions none of the three.

## Embodied mode

- **Where things are (`general-hospital`).** She starts on an emergency-department trolley (`setting: "emergency"`,
  lying). `admit-monitored` has `destination: {setting: "icu"}`, and phase `monitored` has the same `location`: she is
  moved to a critical-care bed, the case's stand-in for a CCU or monitored bed (1.0.0 does not record the unit). Phase
  `recovery` moves her to a ward bed (`location: {setting: "ward"}`), where `followup` also happens. Both locations are a
  **staging convention**, said so in the README and in the staff's knowledge.
- **Kit.** The monitor and pads need the bedside monitor-defibrillator (`cardiac-monitor`, `defibrillator`), and so does
  the shock, which is given at the critical-care bed in phase `monitored`; the ECG uses
  the department's and the ward's ECG machine (`ecg-12lead`, `performedAt: "bedside"`); the echocardiogram needs the
  ultrasound machine wheeled from imaging (`echocardiography`, bedside); the IV cannula, magnesium, propranolol and the
  harmful drugs come from the crash cart (`iv-access`, `medications`); potassium, amiodarone and isoprenaline also need an
  infusion pump (`infusion-pump`). Bloods (electrolytes, magnesium) are sampled at the patient or, after the cannula, ordered
  at a records terminal; the genetic test uses the molecular laboratory (`molecular`); the EEG needs `eeg` (no result).
  The three record reviews (`old-records`, `rhythm`, `outcome`) need only `records`: a records terminal or the notes at the
  bedside. The case's IV-access procedure (`iv-access`) precedes the first IV drug in the reference path; she arrives
  without a cannula (`ivAccessInSitu` is not set).
- **Scope of practice.** Monitoring and the medicines are nursing-scope by kind (a delegated nurse may apply the monitor
  and give prescribed drugs); defibrillation, the consults, the referrals, the admission and the discharge are medical.
- **Staff.** 裴护士 / Nurse Pei hands over in ISBAR from the triage facts and knows where the kit is; she gives no number
  that is not recorded. 邵医生 / Dr Shao (attending) is Socratic and gives no answers; 雷医生 / Dr Lei (electrophysiologist)
  interprets only the ECGs, monitor recordings and echocardiogram the learner has read; 鲍药师 / Pharmacist Bao explains
  QT-prolonging drug classes and safe potassium and magnesium administration.
- **She can speak throughout** (a conscious adult answers for herself; no companion). The four examination findings
  exist only in `ed` (the admission examination); later examinations answer with `examNotRecorded`.
- **Measured (offline demonstration, 2026-11-13; again 2026-11-14 after the review fixes).**
  `embodied-autopilot.test.ts -t "cmcr-77850:"` passes in en and zh-CN: every objective done, in-world score equal to the
  clinical score (28/28), no "cannot do this"; the demonstration now gives the shock at the monitored bed, not on the
  ward.

## Source and adaptation (fidelity limits)

- **Fact base.** Version 1.0.0 (commit `88ed0d2`), itself extracted from the report; the full article was not available.
  Every patient fact is mapped in the Clinical numbers check; nothing was added from memory of the article or from a
  typical presentation. The 1.0.0 README adds no fact beyond its case.json.
- **Kept and reorganised.** The template's compound history answers were split into items (course; incontinence vs
  after-waking symptoms), the two examination records into four manoeuvres, and the outcome record's QTc once stable into
  the `recovery` ECG result. "入院前 1 天" became "yesterday — the day before I came into hospital" because the case
  places her presentation on the day of admission.
- **Contradictions and oddities kept.** (1) The admission examination records a **regular rhythm** while the ECG records
  **ventricular bigeminy**; the time of neither is recorded, so both stand (intermittent ectopy would explain it — to
  verify). (2) The QTc **once stable (0.61 s)** is longer than the first (0.58 s); 1.0.0 gives no times, potassium or
  drugs for either. (3) 1.0.0's title called the earlier procedure "cardiac surgery"; LCSD is a thoracic sympathetic
  denervation, not an operation on the heart, so the new title names only the presentation.
- **Unknowns.** What 1.0.0 does not record stays unknown: in the patient's voice "这个我说不上来，医生。" / "I'm not sure,
  doctor." (the template's "the source notes do not provide that information" is gone); in records "此项检查没有结果记录。" /
  "No result is recorded for this test." and "This case does not record whether this was done; it does not simulate its
  effect."; no claim is made that the article lacks anything.
- **Labelled teaching devices.** The staging (emergency department → monitored bed → ward), the learner's shock on the
  monitored bed standing for the recorded emergency cardioversion (1.0.0 does not say where or when the shocks were
  given), the staff, the decisions, intervention options and scoring, and the patient's worry ("这个还会再犯吗？" / "is this going to keep happening?",
  `persona.concerns` and the ICE item `worries`, source "Teaching device (ICE)") add no clinical fact.
- **Media.** The report's ECG figure (`fig01.png`) is **withheld** by the media review (acquisition dates and
  record-number headers), so `assets` is empty and every ECG and rhythm finding is given as text; no outcome depends on
  reading an image. The survey's critic proposes a crop policy so ECG-centred cases such as this one could show the
  tracing — a collection-level change, not made here.
- **Privacy.** Pseudonym 秦予宁 / Qin Yuning (unchanged from 1.0.0); no hospital, city, occupation or calendar date;
  relative time only. Authors appear only in the citation.
- **Template defects fixed.** Spoiler-prone title ("…years after cardiac surgery") and generic summary replaced;
  authoring language removed from the patient's voice (fallback, six unknown answers); generic history slots replaced by
  case-specific questions; option ids `supported` / `alternative-N` replaced by content ids; the key is no longer the
  longest option; decisions no longer gated on an unknown item (allergies); the hindsight safety decision (gated on the
  outcome record) replaced by critical acts gated in time; `authorChecks` booleans and the unverifiable
  `sourceTextSha256` claim removed (`sourceTextChecked: false`); interventions added (none before).

## Matcher notes

- **Every canonical question selects its own item** in both languages (checked with the matcher in each item's first
  phase): the offline demonstration asks by canonical question, so a collision would leave an objective incomplete
  (it did once in zh-CN during authoring: `course` excluded "之后", which its own question contains).
- **Shared words separated with `excludeKeywords`:** `presentation` vs past history, family, operation and "after waking"
  (以前, 家里, 手术, 醒 / before, family, operation, afterwards); `onset` vs medicine and operation timing; `course` vs the
  after-waking question (不舒服, 身上, 感觉 / afterwards, feel); `trigger` vs the specific triggers (运动, 游泳, 声音, 睡觉 /
  exercise, swim, noise, sleep) and palpitations; `past-heart` vs family and operation; `operation` vs the interval
  question (这些年, 还晕过 / years since, blacked out); `propranolol` vs allergies, other medicines and why she stopped
  (为什么, 为啥, 不吃了 / why, comeoff, madeyoustop); `family-fainting` vs sudden death and "does your family know you're
  here" (知道你来, familyknow).
- **English keywords** avoid one-token wildcards: run-together forms (`howmanydays`, `howmanytimes`, `howlongwereyouout`,
  `goingonbefore`, `setitoff`, `whydidyoustop`, `comeoff`, `overthecounter`, `inyoursleep`, `weighingonyou`,
  `broughtiton`); "startled" was dropped from `other-triggers` because it stems to "start" and captured onset questions.
  Answer words were kept out of keywords where a learner would not say them (激动 / upset left `trigger`).
- **Order entry.** `orderMatching.rules` send ECG queries with 既往/以前/旧/old/previous/prior/earlier to the earlier
  records, and ECG queries with 监护/发作时/遥测/monitor/telemetry/strip to the monitor recordings.
- **The defibrillator and the shock (review, 2026-11-14).** "Get the defibrillator ready", "Put the defibrillator pads on
  her", "准备好除颤仪" and "贴上除颤电极片" used to tie between `monitor-defib` and `defibrillation` (both 1.00), and
  "Defibrillate her" tied the other way. `excludeKeywords` now separate them: `defibrillation` excludes pads, ready,
  attach, standby, monitor, bring, 电极, 准备, 备好, 推, 监护, 贴, 备用; `monitor-defib` excludes defibrillate, shock,
  cardiovert, 电除颤, 电击, 电复律. Probed with the matcher: each of those phrasings now reaches one item.
- **Probes added in review.** "What brings you in?" reached no item (the gap KIT §3.10 names): `presentation` gained
  "brings you" / "bringsyouin"; "How many times has it happened?" reached `presentation` before `course`: `presentation`
  now excludes how many / 几次 / 几回; "Have you blacked out before?" and "以前晕倒过吗？" reached `incontinence`,
  `trigger` or `palpitations`: `interval-episodes` gained "blacked out before", "fainted before", 以前晕倒过, 以前晕过…
- **Corpus.** 44 test utterances (27 zh-CN, 17 en), written as learners speak; every required item has at least one.
  Three **look-alike negatives** (`expect: []`): "你家里人知道你来医院了吗？" and "Does your family know you're in hospital?"
  (the family-history wording) and "今天早饭吃了吗？" (eating words near the medication item). `cases verify`: 44/44.

## References

1. 朱玉峰, 白元, 王飞宇, 吴弘, 秦永文, 赵仙先. 长QT综合征行左心交感神经切除术后七年再发晕厥一例. 中华心律失常学杂志.
   2014;18(2):157-158. doi:10.3760/cma.j.issn.1007-6638.2014.02.020. Available from: https://rs.yiigle.com/cmaid/77850
2. Zeppenfeld K, Tfelt-Hansen J, de Riva M, et al. 2022 ESC Guidelines for the management of patients with ventricular
   arrhythmias and the prevention of sudden cardiac death. Eur Heart J. 2022;43(40):3997-4126. doi:10.1093/eurheartj/ehac262
3. Brignole M, Moya A, de Lange FJ, et al. 2018 ESC Guidelines for the diagnosis and management of syncope. Eur Heart J.
   2018;39(21):1883-1948. doi:10.1093/eurheartj/ehy037
4. Soar J, Böttiger BW, Carli P, et al. European Resuscitation Council Guidelines 2025: adult advanced life support.
   Resuscitation. 2025;215 Suppl 1:110769. doi:10.1016/j.resuscitation.2025.110769
5. Resuscitation Council UK. Adult tachyarrhythmia algorithm (2025 guidelines; version 3, March 2026). London:
   Resuscitation Council UK; 2026. Available from:
   https://www.resus.org.uk/sites/default/files/2026-03/Adult%20tachyarrhythmia%20algorithm%20V3%20March%202026.pdf
6. Drew BJ, Ackerman MJ, Funk M, et al. Prevention of torsade de pointes in hospital settings: a scientific statement
   from the American Heart Association and the American College of Cardiology Foundation. Circulation.
   2010;121(8):1047-1060. doi:10.1161/CIRCULATIONAHA.109.192704
7. Wilde AAM, Semsarian C, Márquez MF, et al. EHRA/HRS/APHRS/LAHRS expert consensus statement on the state of genetic
   testing for cardiac diseases. Europace. 2022;24(8):1307-1367. doi:10.1093/europace/euac030
8. U.S. Food and Drug Administration. FDA Drug Safety Communication: abnormal heart rhythms may be associated with use of
   Zofran (ondansetron). 2011 Sep 15.
9. 中华医学会心电生理和起搏分会. 2020室性心律失常中国专家共识(2016共识升级版). 中国心脏起搏与心电生理杂志. 2020;34(3):189-253.
   doi:10.13333/j.cnki.cjcpe.2020.03.001

Used for the derived score in the Clinical numbers check (README only): Schwartz PJ, Crotti L. QTc behavior during
exercise and genetic testing for the long-QT syndrome. Circulation. 2011;124(20):2181-2184.
doi:10.1161/CIRCULATIONAHA.111.062182. The references' existence, years and DOIs were confirmed by web search on
2026-11-13. The independent review (2026-11-14) re-checked them: PubMed records for references 2, 3, 4, 6 and 7 and the
Schwartz paper (authors, volume, pages, DOI); the RCUK algorithm PDF (V3, "Updated March 2026") read in full; the
AHA/ACCF 2010 statement read in its PMC version (PMC3057430); the 2020 Chinese consensus on CNKI (volume, pages, DOI); the
FDA communication's page. The ESC 2022 recommendation tables are images on the publisher's page, so their wording was
taken from reproductions (JACC 2023 electrical-storm review, Table 2; Rev Cardiovasc Med 2023 LQTS review, Table 1) and
the guideline's own prose; the ESC 2018 high-risk table likewise from a reproduction, with the guideline's in-hospital
monitoring text read on the publisher's page.

### To verify

**In the source article (details 1.0.0 does not give):**

- The ECGs: whether the 0.58 s tracing was the admission ECG; the times of both tracings; heart rate, uncorrected QT,
  correction formula and T-wave morphology (e.g. notched T waves); whether the 0.61 s tracing was taken on propranolol and
  after potassium and magnesium; why the QTc was longer once stable.
- The monitor recordings: the number and duration of torsade episodes, how they began (short–long–short sequences, pauses
  or bradycardia), the number and energy of shocks, and whether any episode was pulseless or needed CPR (an aborted
  cardiac arrest bears on the ICD decision).
- Where she was when the torsade was captured (emergency department, ward or CCU) and whether she presented first to the
  emergency department (the case's staging).
- Vital signs; magnesium, calcium, renal function and later potassium values; glucose; pregnancy status.
- Doses, routes and timing of potassium, magnesium and propranolol; any other drug given or stopped (an antiemetic for the
  vomiting?); the propranolol dose before she stopped it and why she stopped.
- The history seven years earlier: what the "dangerous arrhythmia" was, the QTc then, the side and extent of the
  denervation, and whether she had any syncope between the operation and this admission (the title's "术后七年再发" suggests
  none).
- Whether hearing was examined formally (Jervell and Lange-Nielsen syndrome) and what "development normal" refers to.
- The examination's regular rhythm against the ECG's bigeminy (timing).
- The echocardiogram's date and measurements.
- Genetic testing, any ICD discussion or implantation, family screening, and any sudden death in the family.
- Follow-up beyond "more than a year", and the QTc at follow-up.

**In the guidance (what the 2026-11-14 review confirmed, and what is still open):**

- Confirmed: RCUK tachyarrhythmia algorithm V3 (read in full) — for polymorphic VT with QT prolongation "Give Mg2+ 8 mmol
  IV over 10 min", "Consider isoprenaline or temporary pacing to increase HR", "Avoid amiodarone". AHA/ACCF 2010 (read) —
  magnesium sulfate 2 g IV first-line (IIa), repeated if torsade persists; potassium to 4.5–5 mmol/L "may also be
  considered" (IIb); immediate DC cardioversion for torsade that does not stop or degenerates into VF; "isoproterenol
  infusion or overdrive pacing can suppress TdP" in pause-dependent torsade. **It says nothing about isoproterenol in
  congenital long QT, and nothing against amiodarone**, so the first draft's citations of it for those two points were
  removed. ESC 2022 (from reproductions and its prose) — IV magnesium with potassium supplementation in torsade (I, C);
  isoproterenol or transvenous pacing in *acquired* long QT with recurrent torsade despite magnesium (I, C); LQTS
  diagnosis at QTc ≥ 480 ms or score > 3 (I, C); non-selective beta-blockers (I, B); ICD if symptomatic on beta-blockers
  (I, C); LCSD when an ICD is contraindicated or declined or shocks recur (I, C); genetic testing and counselling (I, C);
  mexiletine in LQT3 (I, C); the general measures (avoid QT-prolonging drugs, correct hypokalaemia, hypomagnesaemia and
  hypocalcaemia, avoid genotype-specific triggers). ESC 2018 syncope — major high-risk ECG feature "QTc > 460 ms in
  repeated 12-lead ECGs indicating LQTS"; in-hospital monitoring "(in bed or by telemetry) is warranted in patients with
  high-risk clinical features … suggesting arrhythmic syncope".
- Still open: the ESC 2022 Recommendation Table 41 itself (read only through reproductions) — in particular the wording
  and class of the ICD-after-cardiac-arrest recommendation and the "symptomatic" footnote (arrhythmic syncope or
  haemodynamically non-tolerated VT); the ESC 2018 high-risk table itself; whether ERC 2025 ALS says anything specific on
  torsade (only its citation was confirmed); the 2020 Chinese VA consensus's LQTS recommendations (only its citation was
  confirmed). A Chinese syncope consensus (2018) could not be confirmed and is not cited.

**For a clinician (an electrophysiologist) to confirm:**

- `isoprenaline` as `critical: true`. The case's own algorithm (RCUK V3) lists isoprenaline or pacing for polymorphic VT
  with QT prolongation without separating congenital from acquired long QT; ESC 2022 recommends them for acquired long QT,
  and reviews describe isoprenaline as contraindicated in congenital long QT (LQT1/LQT2). The case fails the safety
  outcome for it because her attacks are emotion-triggered congenital long QT.
- Magnesium sulfate 2 g IV in the emergency department, before any torsade is documented (keyed in decision 2 for
  presumed arrhythmic syncope with QTc 0.58 s, bigeminy and hypokalaemia).
- The shock gate: the learner must give one shock on the monitored bed to move on (standing for the recorded emergency
  cardioversion), and a shock in the department or on the ward is contraindicated (`critical: false`).
- Oral propranolol restarted in the first hour, during recurrent torsade.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, reorganised.** Every patient fact of 1.0.0 is kept and none is added (Clinical numbers check); the
  compound history and examination records are split; the outcome record's "QTc 0.61 s once stable" also becomes the
  `recovery` ECG result; the torsade record moves to the monitored-bed phase (staging, labelled).
- **Card.** Title "心脏手术多年后再次晕厥 / Recurrent syncope years after cardiac surgery" → "反复晕倒 · 28岁女性 / Repeated
  blackouts · 28-year-old woman" (LCSD is not heart surgery, and the old title pointed at the cause); a new spoiler-free
  summary; setting `inpatient` → `emergency` (the first phase); specialty adds emergency medicine; difficulty 4, 40 min;
  6 learning outcomes with named guidance.
- **History.** 15 template slots (6 with the meta answer "The source notes do not provide that information") → 23 items
  in her lay voice: 10 recorded facts, 12 honest unknowns (why she stopped, other medicines, allergies, sudden death in
  the family, specific triggers, palpitations, chest pain/breathlessness, injury and tongue biting, witnessed jerking,
  blackouts since the operation, pregnancy, alcohol/drugs) and one labelled ICE device; 9 required.
- **Examination.** Two "review examination record" items → four manoeuvres (general state, hearing, heart, lungs) in the
  admission phase; `examNotRecorded` in record-facing wording.
- **Investigations.** 5 record reviews → 11 tests: the ECG as a bedside test with two phase results, electrolytes with
  structured values, the monitor recordings and earlier records as record reviews, the echocardiogram, and six tests a
  learner would order whose results are not recorded (magnesium, glucose, pregnancy test, earlier records, genetic test,
  EEG).
- **Interventions.** None → 17: the documented steps (magnesium, potassium, propranolol, shocks), today's steps
  (monitor and pads, IV access, QT-drug review, monitored admission, arrhythmia team, ICD referral, genetic counselling,
  relatives' screening, discharge teaching) and the tempting wrong ones (ondansetron; amiodarone, isoprenaline and an
  early discharge, all `critical: true`); `doseSpec` for magnesium sulfate 2 g IV.
- **Phases and gates.** 3 template phases (the outcome phase gated on generic slots) → 4 one-way phases gated on the
  preceding objectives; the outcome phase opens only after all five decisions.
- **Decisions.** 3 decisions with `supported` / `alternative-N` ids, the key the longest and a hindsight "safety" decision
  read from the outcome record → 5 decisions (mechanism, first hour, torsade treatment, future risk, discharge plan) with
  content ids, 21 options and guideline-named feedback on each; no length cue.
- **Rubric.** 11 items with a critical decision → 12 items (11 deterministic, weight 28) with two critical acts: the
  monitor in time and no QT-prolonging drug, isoprenaline or early discharge; do nothing scores 0; wrong first answers
  score 50 %.
- **Staff.** One generic attending → a nurse, the attending, an electrophysiologist and a pharmacist, each written for the
  case.
- **Debrief and references.** A one-line conclusion and three generic teaching points → a 994-character conclusion, five
  key reasoning steps, five dated teaching points contrasting the record with current practice, seven unknowns and nine
  Vancouver references (the article first, its DOI verified); ESC 2022 kept, ESC 2018 syncope, ERC 2025 ALS, the RCUK
  algorithm, the AHA/ACCF 2010 statement, the 2022 genetic-testing consensus, the FDA 2011 communication and the 2020
  Chinese VA consensus added.
- **Governance.** `provenance.review`: editorial, 2026-10-30, eight named guidance documents, notes in the standard's
  wording ("The case is not yet reviewed by a licensed clinician" — lower case, as the collection contract requires);
  `extensions`: `sourceDoi` and `doiVerifiedAt` (2026-10-29, from the source map), `sourceTextChecked: false`;
  `authorChecks` and `sourceTextSha256` removed until the source pass.
- **Independent review (2026-11-14), fixes within 1.1.0.** (1) *Shock on a settled patient:* answering decision 3
  moved her to the ward at once (the `recovery` gate held), so the reference path — and the in-world demonstration —
  shocked her and repeated the magnesium after "the attacks are under control", and `rb-torsade` credited it, because
  the shock's `indicatedWhen` was only "the recordings were read". Now the shock is indicated on the monitored bed after
  the recordings are read, contraindicated in the department, on the ward and at follow-up (`critical: false`, harm text
  citing ERC 2025 ALS and the RCUK algorithm), `obj-attacks` waits for a valid shock, `rb-no-harm` counts a misplaced
  shock, and the reference path shocks before answering decision 3. (2) *Citations that did not hold:* the isoprenaline
  harm text and decision-3 feedback attributed "isoprenaline is for acquired, pause-dependent torsade" to the RCUK
  algorithm (which lists isoprenaline or pacing for any QT-prolonged polymorphic VT) and "avoided in congenital long QT"
  to the AHA/ACCF 2010 statement (which does not say it); both now cite ESC 2022 (isoprenaline or pacing in acquired long
  QT; beta-blockers in LQTS) and state what RCUK lists. Learning outcome 3, teaching point 2 and the conclusion no longer
  cite AHA/ACCF 2010 for avoiding amiodarone, or ESC 2022 / RCUK for the 4.5–5.0 mmol/L potassium target (AHA/ACCF 2010,
  "may be considered"); the amiodarone harm and feedback no longer claim, unverified, that the arrest algorithm's
  amiodarone step "does not apply" to torsade, and quote what RCUK says instead. (3) *Matcher:* the defibrillator / shock
  tie and the "What brings you in?" gap fixed (Matcher notes); 4 test utterances added. (4) *Discharge:* `rb-no-harm`
  now counts a Holter discharge only while contraindicated (`valid: false`), as its text says. (5) *Smaller fixes:* "several
  times" (好几回) in the chief complaint and the `course` answer and "during the blackouts" in a tag were counts and a
  generalisation 1.0.0 does not state ("反复发作", "晕倒时尿失禁"); "an unaffected family" in decision 4's key became "a
  family free of blackouts"; the conclusion's English lost "nausea"; the select-all decision's three keys were its three
  longest options in zh-CN (two distractors lengthened); the `obj-attacks` hint pointed at the trap ("which drugs from
  the usual cardiac arrest algorithm would make things worse") and now asks what the runs need; the README's validation
  path, timeline heading, reference-path description and Safety outcome paragraph corrected; DOIs added for the AHA/ACCF
  2010 statement and the 2020 Chinese consensus.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, 2 examination
  records, 5 record reviews, 3 decisions, 11 rubric items and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-77850/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-77850 --lang en                                                 # 70 steps · objectives 6/6 · decisions 5/5 · utterances 44/44 · rubric 28/28 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-77850                                       # depth floor, do-nothing 0, wrong-first 50 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-77850:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-77850:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-11-13, and again on 2026-11-14 after the review fixes: all five pass.

## 中文摘要

**病例概要。** 28岁女性，7 年前因长 QT 和一种危险的心律失常就诊，行左心交感神经切除（“术后七年”见文题），术后服普萘洛尔约
1 年后自行停药（剂量未记录）。入院前 1 天起反复晕厥：首次几分钟后苏醒，此后反复发作；晕厥时尿失禁，醒后头晕、乏力、恶心呕吐；
这次发作在情绪激动之后。家中无人有类似晕厥。查体意识清楚但精神差，发育正常，听力正常，双肺清晰，心律齐、未闻杂音。心电图
QTc 0.58 s 伴室性早搏二联律；入院血钾 3.3 mmol/L；心脏超声结构与功能正常；监护记录到反复的尖端扭转型室速，部分数秒后自行终止，
部分需紧急电复律。记录中的团队给予补钾补镁、电复律并恢复普萘洛尔；稳定时 QTc 0.61 s，住院 11 天出院，随访 1 年余未再晕厥。
诊断：长 QT 综合征（基因型未记录），去神经术后 7 年、停用 β 受体阻滞剂并低钾时反复发生尖端扭转。本版依据 1.0.0 版提取的事实
改写，尚未对照原文全文核对。

**学习目标。** ① 结合病史与心电图区分心律失常性晕厥、癫痫发作和反射性晕厥（ESC 2018 晕厥指南）；② 识别 QTc 0.58 s、
室性早搏二联律合并低钾意味着随时可能发生尖端扭转，立即持续监护并备好除颤；③ 处理尖端扭转：电除颤、硫酸镁 2 g（8 mmol）
静脉注射、血钾 4.5–5.0 mmol/L、恢复非选择性 β 受体阻滞剂，避免胺碘酮和昂丹司琼等延长 QT 的药物，发作仍反复时以起搏而不是
异丙肾上腺素提高心率；④ 判断恢复后
QTc 仍为 0.61 s、去神经术后停药复发属持续高危，情绪诱因不能确定基因分型；⑤ 制订出院前二级预防：足量 β 受体阻滞剂与坚持服药、
ICD 评估、遗传咨询与基因检测、一级亲属筛查、避免延长 QT 的药物；⑥ 说明 1 年余无晕厥并不证明风险已消失。

**关键决策。** 决策 1：晕倒机制——长 QT 背景下尖端扭转所致的心律失常性晕厥（干扰项：尿失禁即癫痫、情绪诱发的血管迷走性
晕厥、单纯低钾）。决策 2：第一小时——立即监护并贴除颤电极、静脉硫酸镁、补钾至 4.5–5.0 mmol/L、不用延长 QT 的药、恢复普萘洛尔、
收入监护病床（干扰项：带动态心电图回家、胺碘酮加昂丹司琼、神经内科与脑电图）。决策 3：反复尖端扭转——持续或无脉者立即电除颤，
重复镁剂、维持血钾、普萘洛尔、停用延长 QT 的药物，仍反复则临时起搏（干扰项：胺碘酮、异丙肾上腺素、同步电复律并停用普萘洛尔）。
决策 4：恢复后的风险——仍属高危，分型靠基因检测，家族史阴性不能排除（干扰项：诱因即可确定 2 型、风险已归零、再次去神经并停药）。
决策 5（多选）：长期足量 β 受体阻滞剂与坚持服药、ICD 评估、遗传咨询与一级亲属筛查。

**复盘要点。** 尿失禁不等于癫痫；已知长 QT 的晕倒是高危晕厥，急诊就要接监护、备除颤。尖端扭转用电除颤、镁剂、补钾和停用延长
QT 的药物来处理，胺碘酮和异丙肾上腺素在这里是陷阱，醒后呕吐时最顺手的昂丹司琼也是陷阱。β 受体阻滞剂是基础治疗，左心交感神经切除
只是补充；出院前评估 ICD、做基因检测并筛查一级亲属——记录中都没有提到。稳定时 QTc 0.61 s，1 年余无晕厥不代表风险消失。

**安全结果。** 胺碘酮、异丙肾上腺素和从急诊或监护病床直接出院为 `critical: true`，给予即判定安全结果不通过；昂丹司琼（中等风险，
未标 critical）和在监护病床以外电击（`critical: false`；急诊时她神志清楚，到病房时发作已控制）为可纠正的错误，不判定安全结果不通过，
但会失去关键评分项 `rb-no-harm`。
