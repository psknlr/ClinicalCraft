# cmcr-1423433 — Buttock swelling and a spreading bruise after an injection · 51-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 王建民, 杨声坪, 胡龙. 长期口服华法林后肌内注射安乃近致臀部血肿.
药物不良反应杂志. 2014;16(1):39-40. Version 1.1.0 re-authors the case to the clinical content standard **from the facts
that version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet
been checked against the full source article** (STANDARD §6). The patient (秦知远 / Qin Zhiyuan) is a pseudonym; the
ward nurse (葛护士 / Nurse Ge), the cardiology attending (廖医生 / Dr Liao), the clinical pharmacist (臧药师 / Pharmacist
Zang) and the general surgeon (滕医生 / Dr Teng) are invented teaching roles. Hospitals and calendar dates are removed.
What 1.0.0 does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-1423433` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (a ward bed throughout; the operation happens between phases) |
| specialty | clinical pharmacology, haematology, cardiology, general surgery |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a physician who manages anticoagulation (cardiology or haematology) and a transfusion specialist review it before teaching use |
| phases | `admission` 入院：左臀部肿痛 / Admission: a swollen, painful left buttock → `post-drainage` 引流术后 / After the drainage → `transfusion` 输血之后 / After the transfusion → `followup` 记录的病程与结局 / Recorded course and outcome — all one-way, none learner-switchable |
| content | 24 history items (11 recorded facts, one of them partly recorded; 1 labelled teaching device; 12 unknown; 8 required) · 4 exam findings (3 on admission, 1 at the one-month review) · 16 investigations (4 record reviews; results recorded for 5, the other 11 with no recorded result in any phase) · 19 interventions (5 always harmful; drainage contraindicated before any clotting-factor replacement; restarting anticoagulation contraindicated on admission) · 6 objectives · 5 decisions (21 options) · 12 rubric items (11 deterministic, weight 26; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 6 teaching points · 38 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise a haematoma from bleeding at an intramuscular injection site on excessive warfarin (INR 6.2) — onset the
   day after the injection, a bruise spreading daily, an Hb of 86 g/L and a hypoechoic area with flocculent echoes —
   keeping an abscess in the differential but putting no needle into the collection while the INR is uncorrected.
2. Classify an anticoagulant-related bleed by the ACC 2020 criteria and reverse warfarin to match: stop it, give
   vitamin K₁ 5–10 mg by slow IV infusion with 4-factor PCC dosed by INR and weight (plasma only when there is no PCC),
   never IM vitamin K, and recheck the INR before drainage (ACC 2020; CHEST 2012).
3. Transfuse red cells for a patient with valve disease by the AABB 2023 restrictive thresholds and the NICE NG24
   (2015) one-unit-then-review approach, guarding against transfusion-associated circulatory overload.
4. Recognise possible circulatory overload in new breathlessness after a transfusion by the ISBT 2018 definition —
   stop further transfusion, assess, give oxygen and a diuretic, report — while excluding lung injury, allergy and
   prosthetic-valve problems.
5. Plan the restart of anticoagulation after a bleed in a patient with prosthetic valves — confirm the valve type and
   target INR, restart as soon as haemostasis is secure, bridge a mechanical mitral valve with heparin and never use a
   DOAC with a mechanical valve (ACC 2020; ACC/AHA 2020) — and prevent a repeat with INR checks no further apart than
   CHEST 2012 allows and no IM injection above range (NHS SPS 2023).
6. Explain the bleed, the pause in warfarin and the plan to restart it to a patient who fears for his valves, using
   the Calgary–Cambridge explanation-and-planning steps and teach-back.

## Clinical summary (spoilers)

**Diagnosis:** a haematoma of the left buttock from bleeding at an intramuscular injection site in a man
over-anticoagulated on warfarin (INR 6.2), with blood-loss anaemia; later, breathlessness after a transfusion that the
team considered heart failure (today: possible transfusion-associated circulatory overload).

- **Background.** 51-year-old man; aortic and mitral valve replacements 5 years earlier, long-term warfarin since;
  clotting checked about every six months, earlier results not available; no inherited family disease. Valve type,
  target INR and warfarin dose are not recorded.
- **Presentation.** Intramuscular metamizole (安乃近) for a cold 8 days before admission; trouble from the next day,
  pain for 6 days, a bruise growing daily, pain worse lying or sitting.
- **Examination.** Dark-red bruising over the left buttock, part of the right buttock and the left waist; a tender
  mass of about 150×50 mm in the left buttock with mild local warmth. No vital signs are recorded.
- **First results.** INR 6.2, APTT 42.5 s; Hb 86 g/L, RBC 2.7×10¹²/L, WBC 24.7×10⁹/L (no platelet count recorded);
  buttock ultrasound: an irregular hypoechoic area about 36 mm beneath the skin, about 139×55 mm, with flocculent
  internal echoes.
- **Recorded course.** After the warfarin effect was reversed (1.0.0 describes high-dose vitamin K; dose not
  recorded), the collection was drained at an operation: blood clot, not pus. Post-operative Hb 58 g/L; after a
  transfusion, chest tightness and breathlessness, considered heart failure and improved with treatment (the
  treatment is not recorded). Warfarin was resumed; at one month the bruising had resolved and the INR was 2.1.
- **Today's answer.** Stop warfarin; vitamin K₁ 5–10 mg by slow IV infusion with 4-factor PCC dosed by INR and
  weight; drain only after a repeat INR shows correction (ACC 2020; CHEST 2012). Transfuse one unit at a time below
  70 g/L (80 g/L may be used with cardiovascular disease), watching for overload (AABB 2023; NICE NG24). Stop and
  assess new breathlessness after a transfusion as possible TACO while excluding prosthetic-valve problems (ISBT
  2018). Confirm the valve type and target, restart as soon as haemostasis is secure, bridge a mechanical mitral
  valve, no DOAC for a mechanical valve (ACC 2020; ACC/AHA 2020). No IM injection while the INR is above range (NHS
  SPS 2023); INR at least every 4 weeks, never six-monthly (CHEST 2012). Metamizole injection is no longer registered
  in China (NMPA 2020).

## Scenario timeline (staged evidence by phase)

| phase | what has happened | what the learner can obtain | opens when |
|---|---|---|---|
| `admission` | admitted with the swelling and spreading bruise | history (incl. the injection, the valves, warfarin, six-monthly checks); exam (bruising, mass, warmth); clotting screen, blood count, buttock ultrasound; observation chart, previous records, group and crossmatch, renal/liver, CRP, CT, ECG, echo, repeat INR (no recorded result) | start |
| `post-drainage` | in the recorded course, reversal and drainage at an operation | operation record (clot, not pus), post-operative blood count (Hb 58 g/L); placeholders for clotting, repeat INR, group and crossmatch, observations | history, examination and first results done, decisions 1–2 answered, warfarin stopped with some reversal given, **and the learner asks the surgeons to drain** (`surgical-drainage`) |
| `transfusion` | a transfusion after the operation | the patient's report of chest tightness and breathlessness; placeholders for observations, ECG, chest film, BNP, echo, blood count, chemistry | decision 3 answered and a transfusion given |
| `followup` | — | recorded course and outcome; the one-month inspection (bruising resolved) | all five decisions answered and the reassessment objective done |

The drainage is gated on the learner's own request, so the reversal can be scored as given **before** it; the
phase text says what the record shows ("in the recorded course, the warfarin effect was reversed…"), whatever the
learner did.

## Decisions and assessment

### Objectives (HUD task list)

Titles stay spoiler-free because the journal shows later objectives by title.

1. `obj-story` 问清肿痛的来龙去脉和长期用药 / Find out how the swelling began and what he takes — asks presenting,
   injection, onset, spread, valves, warfarin, inr-checks.
2. `obj-exam-tests` 检查臀部，拿到第一批结果 / Examine the buttock and get the first results — bruising, mass; reads
   the admission clotting screen, blood count and ultrasound.
3. `obj-first-steps` 判断原因，决定先做什么 / Work out the cause and decide what comes first — decisions 1–2, warfarin
   withheld and any reversal agent given (IV or IM vitamin K, PCC or plasma).
4. `obj-next-days` 此后几天：复查并决定下一步 / The next days: review the results and decide the next step — reads the
   operation record and the post-operative count, decision 3, a transfusion.
5. `obj-reassess` 再到床旁：重新评估他 / Back at the bedside: reassess him — asks how he feels, decision 4, stops
   further transfusion.
6. `obj-plan-review` 规划以后的用药，对照记录的结局 / Plan his medicines from here and compare with the recorded
   outcome — decision 5, reads the outcome.

No objective holds a condition that can become permanently false (no phase leaf, `whenIndicated` or
`decidedFirstTry`).

### Decisions

| # | id | opens after | key (content id) | what it tests |
|---|---|---|---|---|
| 1 | `cause` | the injection story, valves, warfarin; bruising, mass, warmth; the three admission results | `haematoma-overanticoag` | haematoma on excessive warfarin vs abscess, retroperitoneal bleed, necrotising infection |
| 2 | `first-steps` | decision 1 and the six-monthly checks | `pcc-ivk-recheck` | stop warfarin, IV vitamin K₁ 5–10 mg + 4-factor PCC, repeat INR before drainage vs the report's high-dose vitamin K alone, IM vitamin K with drainage today, oral vitamin K and observation, continuing warfarin |
| 3 | `transfuse` | the operation record and the post-operative count | `rbc-one-unit-review` | one unit at a time with review vs deferring for IV iron, four rapid units to Hb > 100 g/L, plasma with every unit |
| 4 | `breathless` | his report after the transfusion and decision 3 | `stop-assess-overload` | stop, assess, oxygen, diuretic if overloaded, CXR/ECG/BNP/echo, report vs slowing and finishing the unit, assuming allergy, assuming TRALI with steroids and fluids |
| 5 | `restart-plan` | decision 4; valves, warfarin, monitoring asked | `confirm-valve-restart-early` | confirm valve type and target, early restart with a heparin bridge if mechanical, INR at least 4-weekly, no IM injections vs aspirin alone, a DOAC, a month's wait with target 1.5 |

Every decision opens before the record that would answer it (the operation record answers decision 1; the outcome
record answers 2–5). No decision is gated on an unknown history item. Each option has its own feedback naming the
guidance (ACC 2020, CHEST 2012, NHS SPS 2023, AABB 2023, NICE NG24, ISBT 2018, ACC/AHA 2020). The key is the
uniquely longest option only in decision 4 (both locales).

### Rubric (11 deterministic items, total weight 26, + 1 examiner-judged)

| id | domain | weight | met by |
|---|---|---:|---|
| `rb-bleed-story` | history | 2 | injection, onset, spread, aggravating asked |
| `rb-anticoag-history` | history | 2 | valves, valve type, warfarin, dose, INR checks, other medicines, bleeding elsewhere asked |
| `rb-exam` | examination | 1 | bruising, mass, warmth examined |
| `rb-first-tests` | investigations | 2 | admission clotting screen, blood count and ultrasound read; group and crossmatch ordered on admission |
| `rb-diagnosis` | diagnosis | 3 | decision 1 right first time |
| `rb-reversal-in-time` | management | 4 | **critical** — warfarin withheld, IV vitamin K₁ and PCC or plasma each given while `indicatedWhen` held: **before the drainage was requested** |
| `rb-reversal-plan` | management | 3 | decision 2 right first time, PCC given, repeat INR ordered on admission |
| `rb-transfusion` | management | 2 | decision 3 right first time, single-unit transfusion given after the operation |
| `rb-breathless` | management | 2 | decision 4 right first time, transfusion stopped, chest film and echo ordered after the transfusion |
| `rb-restart` | management | 2 | decision 5 right first time, restart plan and anticoagulation teaching given |
| `rb-no-harm` | safety | 3 | **critical** — none of: bedside aspiration/incision, drainage requested before factor replacement, IM vitamin K, IM diclofenac, rapid four units, DOAC switch; `scoredWhen` lists each of them and decisions 2, 3 and 5 |
| `rb-communication` | communication | 1 | examiner-judged (Calgary–Cambridge explanation and planning; his worry about the valves; teach-back) |

### How wrong choices score (measured with the core reducer)

| path | score | critical items missed |
|---|---:|---|
| reference path (`solution`) | 26/26 (100 %) | — |
| wrong first answer at every decision, then the key | 14/26 (54 %) | — |
| start and do nothing | 0/23 (`rb-no-harm` not scored; the case cannot be finished) | `rb-reversal-in-time` |
| the report's reversal: vitamin K alone (wrong first at decision 2), drainage requested before any factor replacement | 16/26 (62 %) | `rb-reversal-in-time`, `rb-no-harm` |
| IM instead of IV vitamin K, no PCC (wrong first at decision 2) | 16/26 (62 %) | `rb-reversal-in-time`, `rb-no-harm` |
| plasma instead of PCC | 23/26 (88 %) | — (`rb-reversal-plan` lost) |
| four rapid units (wrong first at decision 3) | 21/26 (81 %) | `rb-no-harm` |
| a DOAC at discharge (wrong first at decision 5) | 21/26 (81 %) | `rb-no-harm` |
| bedside aspiration on arrival | 23/26 (88 %) | `rb-no-harm` |

The communication item is judged from the transcript and is not in the deterministic total.

### Critical items

- `rb-reversal-in-time` — the missed life-saving act: stopping warfarin and reversing it with IV vitamin K and
  clotting factors **before** the drainage. It is scored with `{"intervened": …, "whenIndicated": true}`; the window
  of `hold-warfarin`, `vitk-iv`, `pcc` and `ffp` is `{"not": {"intervened": "surgical-drainage"}}`, so a reversal
  given after asking for the drainage does not count. Plasma counts here (it reverses); PCC is scored separately in
  `rb-reversal-plan`. The clock is static, so a learner who chooses vitamin K alone cannot wait the hours it needs:
  asking for the drainage before any PCC or plasma is flagged as contraindicated (`surgical-drainage` harm text), which
  is how the case represents an operation on an uncorrected INR.
- `rb-no-harm` — the dangerous errors this case invites: a needle or blade into the collection at an INR of 6.2, a
  drainage before any factor replacement, another IM injection (vitamin K or an NSAID), a rapid multi-unit
  transfusion in valve disease and a DOAC for a probable mechanical valve. It counts only once a harm was possible
  (`scoredWhen`), so doing nothing earns nothing.

## Reference path (`solution`)

73 steps, replayed as the demonstration (示范接诊): start → asks the presenting complaint, the injection, onset, spread,
aggravating position, valves, valve type, warfarin and its dose, INR checks, other medicines, bleeding elsewhere,
fever, symptoms of anaemia and allergies → examines the bruising, the mass and its warmth → reads the observation chart
(nothing recorded) → IV access → orders the clotting screen, blood count, group and crossmatch, renal and liver
function and the bedside buttock ultrasound, reads them → reads the previous records (nothing recorded) → **decision 1**
→ withholds warfarin, gives IV vitamin K₁ and PCC, oral paracetamol, asks the pharmacist to review → orders and reads
the repeat INR (not recorded) → **decision 2** → asks his worry → asks the surgeons to drain (phase `post-drainage`) →
reads the operation record and the post-operative count → **decision 3** → single-unit transfusion (phase
`transfusion`) → asks how he feels and about chills, itch or rash → stops further transfusion, oxygen, reads the
observation chart, orders and reads ECG, chest film, BNP and echo (none recorded) → IV furosemide → **decision 4** →
restart plan and anticoagulation teaching → **decision 5** (phase `followup`) → reads the recorded course → inspects
the buttocks at one month → finish. It asks no age-inappropriate question and meets every deterministic item.

## Clinical numbers check

Every patient value with its unit, its 1.0.0 field and its 1.1.0 field. The source check is **pending**: each value is
as 1.0.0 extracted it and none has yet been compared with the full article.

| value | 1.0.0 field | 1.1.0 field |
|---|---|---|
| 51 years, male | `patient` | `patient` |
| aortic and mitral valve replacement 5 years before | `history.operations` | `history.valves` |
| warfarin since the valve replacement (≈ 5 years, derived) | `history.medications` | `history.warfarin` |
| clotting checked about every 6 months; earlier results not brought | `history.prior` | `history.inr-checks` |
| IM metamizole (安乃近) for a cold | `history.medications` | `history.injection`, `history.other-meds` |
| injection 8 days before presentation | `history.onset` | `history.injection`, triage note |
| symptoms from the next day; pain for 6 days | `history.onset` | `history.onset` |
| bruise enlarging day by day | `history.progression` | `history.spread` |
| pain worse lying or sitting | `history.associated` | `history.aggravating` |
| no inherited family disease | `history.family` | `history.family` |
| dark-red bruising: left buttock, part of the right buttock, left waist | `exam-1` | `exam.bruising` |
| tender left-buttock mass about 150×50 mm | `exam-2` | `exam.mass` |
| mild local warmth | `exam-2` | `exam.warmth` |
| INR 6.2 | `investigations.coagulation` (workup) | `coag` (admission) |
| APTT 42.5 s | `investigations.coagulation` | `coag` (admission) |
| Hb 86 g/L; RBC 2.7×10¹²/L; WBC 24.7×10⁹/L | `investigations.blood` | `fbc` (admission) |
| irregular hypoechoic area about 36 mm deep, about 139×55 mm, flocculent internal echoes | `investigations.ultrasound` | `buttock-us` (admission) |
| reversal described as high-dose vitamin K (no dose) | decision `management` option text; README analysis and fidelity notes | `outcome`, `vitk-iv` response, decision 2 feedback |
| drainage after reversal: clot, not pus | `investigations.outcome` | `op-note` (post-drainage), `outcome` |
| post-operative Hb 58 g/L | `investigations.outcome` | `fbc` (post-drainage), `outcome` |
| chest tightness and breathlessness after the transfusion, considered heart failure, improved with treatment | `investigations.outcome` | `history.breathless-now`, `outcome` |
| warfarin resumed; at one month bruising resolved, INR 2.1 | `investigations.outcome` | `outcome`, `exam.bruising-review` |

Derived values, for the facilitator: the haemoglobin fell from 86 to 58 g/L (28 g/L) between the admission count and
the post-operative count — with an operation in between, so it is not the ACC 2020 "fall from baseline", whose
baseline (his Hb before the illness) is not recorded; the size of the mass is about 150×50 mm by palpation and about
139×55 mm by ultrasound (two methods, not a contradiction). No reference range, vital sign, platelet count or dose is
added. No value was changed from 1.0.0.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions.** "When the INR of 6.2 came back, what did you want to do first — and what did you want to avoid?"
- **Description.** "Walk me through the first hour: what made this bleeding rather than an abscess, and what did you
  need before anyone touched the swelling?"
- **Analysis.**
  - "By the ACC 2020 criteria, could you call this a major bleed on admission? Which criterion could you not judge,
    and why (no earlier Hb)?"
  - "Why IV and not IM vitamin K here, and what does a large dose cost a man who needs his warfarin back for his
    valves?"
  - "PCC or plasma — what is the difference in speed and volume, and why does volume matter in this man?"
  - "What does a WBC of 24.7×10⁹/L with mild warmth tell you, and what would make you think the collection is
    infected or necrotising?"
  - "Hb 58 g/L after the operation: what threshold, how many units, how fast — and what did you watch for?"
  - "He became breathless after the transfusion. What is your differential, and why did the prosthetic valves belong
    in it after the reversal?"
  - "The valve type is unknown. How did that change your restart plan, and why is a DOAC not an option?"
- **Summary.** "Name the two system failures that set this up, and one change you would make in your own practice
  (INR monitoring, injections in anticoagulated patients)."

### Common learner errors and how the case surfaces them

| error | where it shows |
|---|---|
| calling it an abscess on the WBC and warmth, and wanting to drain it now | decision 1 option `injection-abscess`; intervention `bedside-aspiration` (always harmful); `rb-no-harm` |
| IM vitamin K — repeating the very route that caused the bleed | decision 2 option `im-vitk-drain-today`; intervention `vitk-im` (harm text cites NHS SPS 2023); `rb-no-harm` |
| the report's approach, high-dose vitamin K alone and wait | decision 2 option `ivk-alone-repeat`; `surgical-drainage` before PCC/plasma is contraindicated; `rb-reversal-in-time` |
| treating it as a high INR without bleeding (oral vitamin K, observe) | decision 2 option `oral-vitk-observe` |
| continuing warfarin "because of the valves" | decision 2 option `continue-reduced`; `restart-anticoag` contraindicated on admission |
| an NSAID or IM analgesic for the pain | intervention `im-nsaid` (always harmful); paracetamol is the alternative |
| liberal or rapid transfusion in valve disease | decision 3 option `four-units-fast`; intervention `rapid-transfusion`; `rb-no-harm` |
| carrying on with blood when he becomes breathless | decision 4 options `slow-and-finish`, `allergy-continue`; `rb-breathless` needs the transfusion stopped |
| forgetting prosthetic-valve thrombosis after reversal | decision 4 key and feedback; echo ordered in `rb-breathless` |
| stopping anticoagulation for good, a DOAC, or a long gap with a low target | decision 5 distractors; intervention `doac-switch` (always harmful) |

### Teaching points for the debrief

The six teaching points in the case (severity and reversal; routes in anticoagulated patients and the NMPA 2020
decision on metamizole injection; transfusing a patient with valve disease; breathlessness after a transfusion;
restarting anticoagulation; INR monitoring) each name their guidance and set the reported course against today's
practice.

## Embodied mode

In-world mode (实景模式) uses the general hospital. The patient lies in a ward bed in every phase (no phase moves him;
the operation happens off-screen between `admission` and `post-drainage`).

- **Records terminal / bedside notes:** the observation chart, the previous anticoagulation and valve records, the
  operation record and the recorded course are record reviews (`performedAt: "records"`, `requires: ["records"]`,
  risk none).
- **Bedside:** the buttock ultrasound, the echocardiogram and the chest film are portable (`performedAt: "bedside"`);
  the ECG uses the ward ECG machine. CT of the pelvis would need transport to the CT scanner; the reference path does
  not order it.
- **Laboratory:** the clotting screen, blood count, group and crossmatch, renal and liver function, CRP, BNP and the
  repeat INR are sampled at the patient (or at a terminal once the IV-access procedure has drawn the bloods).
- **Kit and scope:** `iv-access` (a nursing procedure, the cannulation kit on the treatment cart) comes before every IV
  item (vitamin K₁, PCC, plasma, red cells, furosemide); drugs and blood products are delivered to the bedside;
  oxygen uses nasal cannulae; stopping a transfusion is within nursing scope; the surgical drainage and the
  pharmacist are consults. `extensions.embodied.ivAccessInSitu` is false.
- **Voice:** he is a conscious adult and answers for himself in every phase; there is no companion.
- The in-world demonstration finishes the case in the general hospital at the clinical-mode score in both languages
  (`embodied-autopilot.test.ts`).

## Source and adaptation (fidelity limits)

**Fact base.** Version 1.0.0 (commit `88ed0d2`) is the only fact base (STANDARD §6.1); the full article was not
available. Every patient fact above traces to a 1.0.0 statement (table in *Clinical numbers check*); reorganising
(splitting the onset and medicines answers, moving the post-operative Hb into a later phase, structuring the blood
count into values) and lay rewording are the only changes. `extensions.sourceTextChecked` is `false`; no
`sourceTextSha256` is carried until the source pass.

**Readings kept from 1.0.0.** The injection was "8 days ago", symptoms began "the next day", and the pain "has lasted
6 days" — one day apart if both are counted from presentation; both are kept (history `injection` and `onset`) and
listed under *To verify*. The injection site (the buttock) is taken from 1.0.0's title and its injection-associated
haematoma; the side is not recorded. The reversal agent comes only from 1.0.0's teaching text ("the source's large
vitamin K dose"), so the case says "described as high-dose vitamin K; the dose is not recorded".

**What stays unknown** (`unknowns`, `debrief.unknowns`, 12 unknown history items, 11 investigations without a recorded
result, `examNotRecorded`): the valve type and target INR; the warfarin dose and why the INR reached 6.2; the
metamizole dose, injection side and number; vital signs, temperature, platelets, renal and liver function; the reversal
details and the INR before the drainage; the operative details and cultures; the blood product, units and rate; the
investigations and treatment of the breathlessness; when and how warfarin restarted; follow-up after one month.
Record-facing text says "No result is recorded for this test." / "此项检查没有结果记录。" and the patient says "I'm not
sure, doctor." / "这个我说不上来，医生。" — nothing claims that the article lacks a detail.

**Teaching design (not facts).** The phases, decisions and options, the 19 interventions, the rubric, the objectives,
the four staff, the triage wording ("admitted to the ward today") and the patient's worry about his valves (history
`worry`, `persona.concerns`; labelled teaching devices that add no clinical fact).

**What changed from 1.0.0, and the survey's findings applied** (survey.json has no case-specific audit of this case;
the critic's collection-wide findings apply):

- the hindsight critical item (decision "safety", answered after reading the outcome) is replaced by two critical
  **acts**: timely reversal before the drainage, and avoided harms;
- the management key no longer hands the act to an "assessment" and a "valve team": it names stop warfarin, IV vitamin
  K₁ 5–10 mg, 4-factor PCC by INR and weight and a repeat INR before drainage, and the tempting wrong acts now exist as
  interventions with harm texts (IM vitamin K, bedside aspiration, IM diclofenac, drainage before factor replacement,
  rapid transfusion, DOAC);
- option ids `supported` / `alternative-N` are now content ids, and the key is the longest option only once per
  language;
- the straw-man distractors ("Leukocytosis proves an abscess", "The lowest INR is always best") are replaced by
  plausible near-misses, including the report's own reversal;
- the transfusion teaching ("distinguish temporal association from proven transfusion complications") becomes a
  decision on single-unit transfusion and one on TACO, with prosthetic-valve thrombosis after reversal in the
  differential;
- new current-practice content: IM injections in anticoagulated patients (NHS SPS 2023), the NMPA 2020 cancellation of
  metamizole injection, INR monitoring intervals (CHEST 2012), valve-specific INR targets and DOAC contraindication
  (ACC/AHA 2020);
- the patient no longer says "the source notes do not provide that information"; generic history slots become 24
  specific questions; the single compound unknown becomes 8 specific unknowns;
- the title, summary and tags are spoiler-free; the specialty `surgery` was already migrated to `general-surgery` and
  `hematology` is added for the anticoagulation and transfusion content.

**Privacy.** Pseudonym unique in the collection; no hospital, city, date, ID, initials or occupation. Authors are named
only in the citation. No figure of the report is approved for display (`scripts/cmcr-105-media-review.json` has no
entry for this case), so `assets` is empty.

**Capabilities.** Everything the case needs exists in `general-hospital` (`caseCapabilityGaps` is empty): no transfer
destination or consult had to stand in for a missing device.

## Matcher notes

- 38 test utterances (24 zh-CN, 14 en; 3 look-alike negatives), at least one for each of the 8 required items,
  written as colloquial or clinical paraphrases; none is a canonical question or a keyword.
- English multi-word keywords that reduce to one token are written run together (`whatstheproblem`,
  `howmuchwarfarin`, `howmanytablets`, `overthecounter`, `whendidthisstart`).
- Exclusions keep look-alikes apart: the onset item ignores clotting, transfusion and breathing words; the warfarin
  item ignores dose, injection (`针`) and clotting words; fever and allergies ignore transfusion words; the
  breathlessness item ignores chills, itch and rash, which belong to `reaction-features`.
- Order matching: "复查 INR" / "repeat INR" selects only the repeat INR; a request for previous records drops the
  clotting screen; a cardiac ultrasound request drops the buttock ultrasound. No order alias is a bare "ct" or "pt"
  (they hide inside "reactive" and other words).

## References

1. 王建民, 杨声坪, 胡龙. 长期口服华法林后肌内注射安乃近致臀部血肿. 药物不良反应杂志. 2014;16(1):39-40.
   doi:10.3760/cma.j.issn.1008-5734.2014.01.010. Available from: https://rs.yiigle.com/cmaid/1423433
2. Tomaselli GF, Mahaffey KW, Cuker A, et al. 2020 ACC expert consensus decision pathway on management of bleeding in
   patients on oral anticoagulants: a report of the American College of Cardiology Solution Set Oversight Committee.
   J Am Coll Cardiol. 2020;76(5):594-622. doi:10.1016/j.jacc.2020.04.053
3. Holbrook A, Schulman S, Witt DM, et al. Evidence-based management of anticoagulant therapy: Antithrombotic Therapy
   and Prevention of Thrombosis, 9th ed: American College of Chest Physicians evidence-based clinical practice
   guidelines. Chest. 2012;141(2 Suppl):e152S-e184S. doi:10.1378/chest.11-2295
4. Otto CM, Nishimura RA, Bonow RO, et al. 2020 ACC/AHA guideline for the management of patients with valvular heart
   disease: a report of the American College of Cardiology/American Heart Association Joint Committee on Clinical
   Practice Guidelines. Circulation. 2021;143(5):e72-e227. doi:10.1161/CIR.0000000000000923
5. Carson JL, Stanworth SJ, Guyatt G, et al. Red blood cell transfusion: 2023 AABB International Guidelines. JAMA.
   2023;330(19):1892-1902. doi:10.1001/jama.2023.12914
6. National Institute for Health and Care Excellence. Blood transfusion. NICE guideline NG24. London: NICE; 2015.
   Available from: https://www.nice.org.uk/guidance/ng24
7. Wiersum-Osselton JC, Whitaker B, Grey S, et al. Revised international surveillance case definition of
   transfusion-associated circulatory overload: a classification agreement validation study. Lancet Haematol.
   2019;6(7):e350-e358. doi:10.1016/S2352-3026(19)30080-8
8. NHS Specialist Pharmacy Service. Using intramuscular injections in people on oral anticoagulants. 2023. Available
   from: https://www.sps.nhs.uk/articles/using-intramuscular-injections-in-people-on-oral-anticoagulants/
9. 国家药品监督管理局. 国家药监局关于注销安乃近注射液等品种药品注册证书的公告（2020年第29号）. 2020.

The DOI of the article is the verified one in `scripts/cmcr-105-sources.json` (publisher check 2026-10-29). The
guideline citations and DOIs were checked by web search for this version; the details still open are listed below.

### To verify

In the source article (the source pass):

- the type (mechanical or tissue), model and position of each prosthesis, the target INR range his valve clinic set,
  and any atrial fibrillation or other indication;
- the warfarin dose, the last INR before this illness and anything that explains an INR of 6.2 (other drugs, including
  any for the cold; intake; alcohol);
- the metamizole dose, the injection site and side (the buttock is inferred from the title) and the number of
  injections;
- the timing: "8 days ago" and "the next day" against "pain for 6 days";
- vital signs and temperature on admission, platelet count, prothrombin time in seconds, fibrinogen, renal and liver
  function;
- the reversal: vitamin K dose, route and number of doses ("high-dose" in 1.0.0), any plasma or PCC, the INR before
  the drainage;
- the operation: timing, anaesthesia, volume, culture result;
- the transfusion: product, units, rate; the breathlessness: vital signs, examination, chest film, BNP, echo,
  treatment, and whether it was reported as a transfusion reaction;
- when and at what dose warfarin was restarted, any heparin bridge, the target set, follow-up after one month.

In the guidance:

- the exact CHEST 2012 wording on VKA-associated major bleeding (4-factor PCC rather than plasma; vitamin K 5–10 mg by
  slow IV injection) and on patient self-management;
- the ACC 2020 pathway's vitamin K dose and its 4F-PCC dosing table (25/35/50 IU/kg by INR band; fixed-dose option);
- the ISBT 2018 TACO surveillance definition (12-hour window; required and supporting criteria);
- the date of the NHS SPS article (2023 in secondary citations) and its current wording;
- the NMPA announcement number (2020年第29号) and date (17 March 2020) on the official site;
- the INR target ranges used in Chinese practice for mechanical valves (e.g. the 2013 Chinese expert consensus on
  warfarin), quoted in the case only as "may be lower".

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- Four staged phases (admission → after the drainage → after the transfusion → recorded outcome) with gates on the
  learner's objectives, decisions and own request for the drainage.
- 24 history items in the patient's voice (8 required, 12 honest unknowns, one labelled worry); 4 exam findings; 16
  investigations with structured values and honest placeholders; 19 interventions including six tempting wrong acts.
- Five decisions with content ids, 21 options and guideline-named feedback; two critical acts; scoring that gives 0 for
  doing nothing and less for a wrong first answer.
- Four staff (cardiology attending, ward nurse, clinical pharmacist, general surgeon); six learning outcomes; six
  dated teaching points; eight unknowns; nine Vancouver references.
- Provenance and review status per STANDARD §6.6; `sourceTextChecked: false`; unverifiable `authorChecks` removed.

### 1.0.0 — 2026-10-28

Template version (three generic decisions, no interventions, a hindsight critical item).

## Validation

From the worktree root:

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-1423433/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1423433 --lang en                                                 # 73 steps, 6/6 objectives, 5/5 decisions, 38/38 utterances, 26/26
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-1423433                       # depth floor, do-nothing 0, wrong-first 54 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1423433:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1423433:"  # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要（含剧透）：** 51岁男性，5 年前行主动脉瓣和二尖瓣置换，此后长期服用华法林，约半年才查一次凝血。感冒时肌注
安乃近，次日起左臀部肿痛，瘀斑逐日扩大并累及部分右臀和左腰，左臀约 150×50 mm 压痛肿块、局部稍热。INR 6.2，APTT 42.5 s，
Hb 86 g/L，WBC 24.7×10⁹/L；超声见约 139×55 mm 不规则低回声区，内有絮状回声——华法林抗凝过度时肌注部位出血形成的血肿，
伴失血性贫血。原团队逆转华法林（1.0.0 版描述为大剂量维生素K，剂量未记录）后手术引流，见血凝块而非脓液；术后 Hb 58 g/L，
输血后胸闷气短，被考虑为心力衰竭，治疗后缓解；此后恢复华法林，1 个月时瘀斑消退，INR 2.1。患者事实全部沿用 1.0.0 版，
尚未对照原文全文核对。

**学习目标：** ① 识别抗凝过度时的注射部位血肿，INR 纠正前不对积液动针动刀；② 按 ACC 2020 判断出血严重程度，停药、静脉
维生素K₁ 5–10 mg 加4因子PCC，绝不肌注维生素K，引流前复查 INR；③ 按 AABB 2023 与 NICE NG24 为瓣膜病患者逐单位输血；④ 按
ISBT 2018 识别并处理输血相关循环超负荷，排除人工瓣膜问题；⑤ 核实瓣膜类型后尽早恢复抗凝，机械瓣以肝素过渡、不用直接口服
抗凝药，INR 至少每 4 周一次，INR 高于范围时不肌注；⑥ 用 Calgary–Cambridge 方法向担心瓣膜的患者解释病情和计划。

**关键决策：** 决策 1 抗凝过度时的注射部位血肿（对比脓肿、腹膜后出血、坏死性感染）；决策 2 停华法林、静脉维生素K₁ 加
4因子PCC、复查 INR 后再引流（对比原报告的单用大剂量维生素K、肌注维生素K并当天切开、口服小剂量观察、减量继续）；决策 3
每次 1 单位输血并复评；决策 4 停止继续输血、评估、吸氧、利尿、查胸片/心电图/BNP/超声心动图并上报；决策 5 核实瓣膜类型和
目标 INR，止血后尽早恢复，机械瓣肝素过渡，INR 至少每 4 周一次，不再肌注。关键项：引流前及时逆转；不做危险操作。

**复盘要点：** 出血严重程度与逆转（ACC 2020；CHEST 2012）；抗凝患者不肌注，安乃近注射液已于 2020 年被国家药品监督管理局
注销注册证书（NHS SPS 2023；NMPA 2020）；瓣膜病患者的限制性、逐单位输血（AABB 2023；NICE NG24）；输血后气短按可能的
TACO 评估并上报（ISBT 2018）；恢复抗凝与瓣膜相关的目标 INR、机械瓣禁用直接口服抗凝药（ACC 2020；ACC/AHA 2020）；INR 监测
间隔不超过 CHEST 2012 的上限，半年一次远远不够。待核实事项见上文 “To verify”。
