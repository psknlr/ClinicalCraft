# cmcr-1067457 — Fever, abdominal pain and flank bruising after a caesarean birth · 29-year-old woman

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (赵知远 / Zhao Zhiyuan) and her
> relative are pseudonymous; the case is a teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患者及家属均为化名；本病例改编自已发表的病例报告，不构成医疗建议。
>
> **Status of the facts.** Version 1.1.0 was re-authored from the facts that version 1.0.0 extracted from the
> report. The full article was not available; no patient fact has been added or changed, and none has yet been
> checked against the full text (`extensions.sourceTextChecked: false`). The "To verify" list names what to look
> for in the source.

## Case card

| | |
|---|---|
| Case | `cmcr-1067457` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 何艳红, 王志坚. 剖宫产术后急性坏死性筋膜炎一例. 中华产科急救电子杂志. 2013;2(1):50-53 |
| Setting / facility | Emergency department (`emergency`) → intensive care (learner's transfer) → operating theatre · `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 minutes (static clock; four stages, four decisions, 19 interventions) |
| Specialty | Obstetrics, general surgery, critical care, infectious disease |
| Languages | zh-CN (source language), en |
| Learner level | Final-year students; obstetric, emergency, surgical and ICU residents; obstetric and emergency nurses and midwives |
| Review status | Editorial review 2026-10-30 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; patient facts not yet checked against the full article. Have an obstetrician, a general or plastic surgeon and an intensivist review it before teaching use |
| Content | 24 history items (10 not recorded, 7 required) · 10 exam findings · 13 investigations (3 record reviews, 2 without any recorded result) · 19 interventions (6 contraindicated) · 6 objectives · 4 decisions (16 options) · 12 rubric items (11 deterministic, weight 28; 1 examiner-judged; 2 critical) · 4 staff characters and 1 relative · 6 learning outcomes · 6 teaching points · 39 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Recognise a necrotising soft-tissue infection two days after a caesarean birth from rapidly worsening pain,
   extensive bruising of the abdomen, flank and thigh, abdominal signs and systemic toxicity despite two antibiotic
   regimens — before CT or operative confirmation (IDSA 2014; WSES/SIS-E 2018).
2. Interpret a white count of 1.39×10⁹/L, lactate 5.52 mmol/L, creatinine 205 μmol/L, PT 19.2 s and platelets
   108×10⁹/L as sepsis with organ dysfunction, and explain why leucopenia, a qSOFA of 1 and an incomplete LRINEC
   score must not reassure (Sepsis-3 2016; LRINEC, Wong 2004).
3. Deliver first-hour care for maternal sepsis: blood cultures without delaying antibiotics, an IDSA 2014 broad
   empirical regimen adjusted to renal function, balanced crystalloid with reassessment and no starch (SSC 2026;
   SMFM 2023), monitoring and intensive care.
4. Call for emergency surgical exploration as soon as the infection is suspected — not after antibiotic changes,
   CT, correction of clotting or a bedside incision — aiming for debridement within hours (EAST 2018: within
   12 hours of suspicion; SSC 2026: source control ideally within 6 hours).
5. Keep resuscitating into theatre when septic shock develops (noradrenaline to a mean arterial pressure of
   65 mmHg; corticosteroids if vasopressors are still needed — SSC 2026), plan repeated debridement, and continue
   antibiotics until no further debridement is needed and she has been afebrile for 48–72 hours (IDSA 2014).
6. Explain the illness and the urgent operation to a frightened new mother while she can still consent, and later
   to her family, using the Calgary–Cambridge approach, and review the documented delay without outcome bias.

These are `learningOutcomes`. They name the diagnosis, so front-ends show them before play only behind the closed
**Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief (CASE_AUTHORING §9.4,
GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A 29-year-old woman with no regular antenatal care, previously healthy, had an emergency caesarean section for fetal
distress after an episiotomy and a failed vacuum extraction. Fever began 2 hours after the operation (maximum
39.5 °C). Right flank pain grew steadily worse, she had abdominal pain, and from the day after the operation
extensive bruising appeared over the abdomen and flank; pain and skin changes progressed fast. She also had
breathlessness and abdominal distension. Cefazolin after the operation, then metronidazole, ceftriaxone and others,
brought no improvement, and she was transferred because the fever, the bruising and her general condition were
worsening — two days after the caesarean.

On arrival she was conscious and lying in a passive position: T 39.6 °C, HR 170/min, RR 44/min, BP 108/70 mmHg. The
abdomen was distended, tender with rebound tenderness more marked on the right, with weak bowel sounds; there were
extensive purple-red ecchymoses over the abdomen and flank and the upper left thigh. Bloods: WBC 1.39×10⁹/L, Hb
94 g/L, platelets 108×10⁹/L, creatinine 205 μmol/L, albumin 11.2 g/L, lactate 5.52 mmol/L, PT 19.2 s; a calcium of
62 mmol/L is recorded and is physiologically impossible.

Within hours she developed bullae, mottled legs and septic shock, then lost consciousness and was intubated. Blood
and blister fluid grew *Escherichia coli*. CT showed soft-tissue swelling of the abdominal wall, the pelvic wall and
the thigh, with subcutaneous gas in the abdominal wall. At exploration the fascia was black and necrotic with
foul-smelling exudate; histology reported acute necrotising fasciitis. The authors judged that the diagnosis and
debridement, about 5 days after the illness began, came late. Extensive necrosis of skin and muscle still developed
after the debridement; she needed repeated debridement, skin grafting and flap reconstruction, spent 403 days in
hospital and was discharged healed.

**Diagnosis (as taught):** a necrotising soft-tissue infection of the abdominal wall, flank and thigh after an
emergency caesarean — monomicrobial *E. coli* with bacteraemia, reported as acute necrotising fasciitis — with
sepsis, organ dysfunction and septic shock. The portal of entry (caesarean wound, episiotomy, uterus) is not
recorded.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires: the case shows the
report's recorded states and never simulates the learner's treatment. Every stage is one-way (`learnerSwitchable:
false`). **Whatever the learner does, the recorded course follows**: a learner who calls the surgeons on arrival still
sees her deteriorate within hours, because that is what the record shows; earlier surgery is scored, not simulated.

| Stage | When | Entered when | What is there |
|---|---|---|---|
| `arrival` (initial) | arrival after transfer, day 2 after the caesarean | start | her own history (she is conscious and answers), exam (conscious level and posture, vital signs, abdomen, skin), the transfer notes, the arrival bloods (count, biochemistry, lactate, clotting), cultures sent (no result yet), CRP/PCT and ultrasound (no result recorded), CT (no result at this stage); decisions 1–2; the treatments and the delaying traps |
| `deterioration` | a few hours after arrival | history and exam chapters done, decisions 1–2 right **and** a source-control strategy chosen (the surgical call, or one of the four delaying steps) | the relative answers (she is intubated): what happened; re-examination (unconscious and intubated, septic shock, bullae, mottled legs); CT (swelling and abdominal-wall gas); skin-fluid culture sent; decision 3 |
| `theatre` | at exploration (`location: operating-room`) | decision 3 right, the deterioration chapter done **and** the surgical call made | operation note (black necrotic fascia, foul exudate), blood and skin-fluid cultures (*E. coli*, no susceptibility recorded), histology; decision 4; the planned second look |
| `followup` | to discharge | all four decisions right and the second look booked | the report's course and outcome record, with the five approved figures |

Gating choices. The arrival stage advances once the learner commits to a source-control strategy — the right one or a
wrong one — so the recorded deterioration follows the learner's choice (the pattern of the reviewed pilot
cmcr-1653411). Nothing that confirms the diagnosis (CT gas, bullae, cultures, operative findings, histology) can be
read before that choice: the CT has no result at the arrival stage, the cultures show "no result yet" until the
exploration stage, and the operation note exists only in theatre. The theatre stage needs the surgical call, so the
operative findings never precede it. Because the engine applies stage changes before objectives latch and `finish`
needs every objective, no chapter is bound to a stage: the timing of the call is scored by the critical
`rb-source-control` item (the call with no delaying step before it), which can only be met in the arrival stage.
No prompt, hint, stage description or order response states the report's management before the follow-up record,
except the documented intubation, which the deterioration stage shows as her state.

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-history` — Take the story of this illness (presenting problem, fever, pain, bruising, the birth, antibiotics so far).
2. `obj-assess` — Examine her and read the arrival bloods (conscious level and posture, vital signs, abdomen, skin; count, biochemistry, lactate, clotting).
3. `obj-first-hour` — The first hour: decide and act (decisions 1–2 and a source-control strategy, right or wrong).
4. `obj-deterioration` — Reassess her as she deteriorates (the relative's account, four exam findings, decision 3).
5. `obj-theatre` — Read the findings and plan the next days (operation note, both cultures, decision 4).
6. `obj-outcome` — Read what happened to her afterwards (the reported course and outcome).

Hints are Socratic questions; none contains a key's text (`cases validate` checks it).

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `working-diagnosis` | the six core history items, vital signs, abdominal palpation, skin and the four arrival results | a necrotising soft-tissue infection of the abdominal wall and flank with sepsis and organ dysfunction, confirmed only at exploration | wound or flank haematoma from the clotting abnormality (bruising + PT 19.2 s); endometritis with cellulitis — broaden antibiotics and review in 24 h (**close to her course before transfer**); viral illness or drug reaction because the WBC is 1.39×10⁹/L |
| 2 | `first-hour` | decision 1 | blood cultures, then within the hour IV piperacillin–tazobactam or a carbapenem plus vancomycin (renal doses), balanced crystalloid, and the surgeons called now to explore | switch to meropenem + vancomycin and observe 24 h (**the report-like path**); CT first, surgeons only if gas; plasma and platelets to normalise the clotting first |
| 3 | `shock-plan` | the four deterioration exam findings | theatre now for exploration and radical debridement, resuscitating as she goes (noradrenaline to MAP 65 mmHg, hydrocortisone if vasopressors persist) | stabilise in ICU and operate once off vasopressors; hyperbaric oxygen first and debride after demarcation; IVIG and wait for susceptibilities |
| 4 | `after-debridement` | operation note and both cultures read in theatre | second look within 24–48 h and repeated debridement; antibiotics adjusted to susceptibilities and continued until debridement stops and she is afebrile for 48–72 h | one debridement then the ward, fixed 14 days; narrow to ceftriaxone and close at 48 h; flap at the next operation and stop antibiotics after 24 h afebrile |

All decisions are single best answer with option-specific feedback naming the guidance. Options were balanced for
length: the key is the uniquely longest option in no decision in either language.

### Rubric (11 deterministic items, weight 28, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-history` | History | presenting problem, fever, pain, bruising, the birth, antibiotics so far, allergies, antenatal care | 3 |
| `rb-examination` | Examination | conscious level and posture, vital signs, abdominal palpation, skin | 2 |
| `rb-first-results` | Investigations | arrival count, biochemistry, lactate and clotting read; blood cultures **ordered in the arrival stage** | 2 |
| `rb-working-diagnosis` | Diagnosis | decision 1 first time | 3 |
| `rb-first-hour-plan` | Management | decision 2 first time | 3 |
| `rb-source-control` | Management · **critical** | the surgical call made with no delaying step (observe on antibiotics, CT first, clotting first, bedside wound opening) before it — only possible in the arrival stage | 4 |
| `rb-sepsis-care` | Management | IV access, broad antibiotics, balanced crystalloid, monitor, urinary catheter, ICU | 2 |
| `rb-shock-plan` | Management | decision 3 first time and noradrenaline started | 3 |
| `rb-no-harm` | Safety · **critical** | no hydroxyethyl starch and no delaying surgery until off vasopressors; `scoredWhen` decision 2 or 3 attempted or either harm done | 3 |
| `rb-after-debridement` | Management | decision 4 first time and the second look booked | 2 |
| `rb-baby-team` | Management | the baby's doctors told about the mother's severe infection | 1 |
| `rb-communication` | Communication (examiner) | plain-language explanation and consent while she is conscious; the relative after intubation (Calgary–Cambridge) | 1 |

Critical items are acts (`intervened`), never a multiple-choice answer, and none can be earned in hindsight: the
surgical call is credited only when no delaying step came first, which places it in the arrival stage, before the CT,
the bullae, the cultures and the operative findings.

### How wrong choices score (measured 2026-10-30 with the core engine)

| Path | Score | Critical items missed |
|---|---|---|
| Reference `solution` | 28/28 (100 %) | none |
| Start and do nothing | 0/25 (0 %) | `rb-source-control` (`rb-no-harm` not scored) |
| Wrong first answer at every decision, then the key | 17/28 (61 %) | none |
| Wrong first at decision 1, 2 or 3 only | 25/28 (89 %) | none |
| Wrong first at decision 4 only | 26/28 (93 %) | none |
| Report-like: change antibiotics and observe, surgeons called only after she deteriorates | 24/28 (86 %) | `rb-source-control`; the observation step flagged as contraindicated |
| CT first, or clotting corrected first, surgeons called after she deteriorates | 24/28 (86 %) | `rb-source-control`; the step flagged |
| Reference plus hydroxyethyl starch | 25/28 (89 %) | `rb-no-harm`; starch flagged |
| Reference plus "stabilise and operate once off vasopressors" | 25/28 (89 %) | `rb-no-harm`; the delay flagged |
| Reference without noradrenaline and hydrocortisone | 25/28 (89 %) | none |
| Reference without telling the baby's doctors | 27/28 (96 %) | none |
| Never calls the surgeons and takes no other strategy | 19/28, stuck in the arrival stage | `rb-source-control` |

Ordering cannot be scored by the condition language (CMCR_CASES "Known limits"): "antibiotics before the surgical
call" or "cultures before antibiotics" are taught in the feedback, and blood cultures are scored by the stage they
were ordered in. Contraindicated acts appear in the debrief as safety events.

## Reference path (`solution`)

75 steps: start → 22 arrival history items (including the 10 unrecorded ones she cannot answer) → six exam findings
→ IV access, monitor, oxygen → transfer notes, count, biochemistry, lactate and clotting ordered and read → blood
cultures and CRP/PCT sent (no result yet) → decisions 1 and 2 → broad antibiotics, balanced crystalloid, urinary
catheter → the surgical call (→ `deterioration`) → the relative's account and the family's worries → four exam
findings → ICU transfer, noradrenaline, hydrocortisone → skin-fluid culture sent → decision 3 (→ `theatre`) →
operation note, blood and skin-fluid cultures and histology read → the baby's doctors told → decision 4 → planned
second look (→ `followup`) → outcome record → finish. It scores **28/28** with no contraindicated act; `cases verify`
passes, and the offline demonstration finishes with every objective at the clinical score in clinical and in-world
mode, in both languages. The reference path does not order the CT: with the surgeons already called, transporting
an intubated patient in septic shock to CT would only delay theatre (the CT remains orderable and is reported in the
deterioration stage).

## Clinical numbers check

Every value is version 1.0.0's, unchanged; no reference range, vital sign, weight or dose of the report has been
added. Extraction map (1.0.0 field → 1.1.0 field):

| Fact (as recorded) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 29-year-old woman | `patient.age`, `sex` | `patient` |
| Fever from 2 h after the caesarean; 2 days at this visit | `history.onset` | `history.fever`, triage note, `transfer-notes` |
| Right flank pain worsening; extensive abdominal/flank bruising from the next day | `history.progression` | `history.flank-pain`, `history.bruising`, triage note |
| Abdominal pain ("肚子疼") | `history.presentation`, `openingLine` | `history.presenting`, `history.flank-pain` |
| Breathlessness, distension; temperature up to 39.5 °C | `history.associated` | `history.breathing`, `history.distension`, `history.fever` |
| Previously healthy; no regular antenatal care | `history.pmh` | `history.past-health`, `history.antenatal`, `transfer-notes` |
| Fetal distress; episiotomy and failed vacuum extraction; emergency caesarean | `history.operations` | `history.delivery`, `transfer-notes`, decision 1 prompt |
| Cefazolin after the operation, then metronidazole, ceftriaxone and others; no improvement | `history.medications` | `history.antibiotics-so-far`, `transfer-notes`, triage note |
| Pain and skin changes progressed rapidly | `history.redflags` | `history.flank-pain`, `history.bruising` |
| Transferred because fever, bruising and general condition worsened | `history.prior` | `history.transfer-reason`, `transfer-notes` |
| Conscious, passive position; T 39.6 °C, HR 170/min, RR 44/min, BP 108/70 mmHg | `exam.exam-1` | `exam.general`, `exam.vitals`, triage note |
| Distended abdomen; tenderness and rebound worse on the right; purple-red ecchymoses of abdomen/flank and upper left thigh; weak bowel sounds | `exam.exam-2` | `exam.abdomen-inspection`, `exam.abdomen-palpation`, `exam.skin`, `exam.bowel-sounds` |
| WBC 1.39×10⁹/L, Hb 94 g/L, PLT 108×10⁹/L | `investigations.labs` | `fbc` (arrival) |
| Creatinine 205 μmol/L, albumin 11.2 g/L; calcium "62 mmol/L" implausible | `investigations.labs` | `biochemistry` (arrival) |
| Lactate 5.52 mmol/L | `investigations.labs` | `lactate` (arrival) |
| PT 19.2 s | `investigations.labs` | `coagulation` (arrival) |
| Within hours: bullae, mottled legs, septic shock; then loss of consciousness and intubation | `investigations.progress` | stage `deterioration`, `exam.*-deterioration`, `exam.legs-perfusion`, `history.events-hours`, `nonVerbalWhen` |
| Blood and blister fluid grew *E. coli* | `investigations.micro-ct` | `blood-cultures`, `skin-fluid-culture` (theatre) |
| CT: abdominal-wall, pelvic-wall and thigh soft-tissue swelling; abdominal-wall subcutaneous gas | `investigations.micro-ct` | `ct` (deterioration) |
| Black necrotic fascia, foul exudate; histology acute necrotising fasciitis | `investigations.surgical` | `operative-findings`, `histology` (theatre) |
| Extensive skin and muscle necrosis after debridement; repeated debridement, grafting, flaps; 403 days; discharged healed; diagnosis and debridement about day 5 judged late | `investigations.outcome` | `outcome` (followup) |
| Gestational diabetes status unknown; calcium and "some source units" questionable | `unknowns` | `history.pregnancy-sugar` (unknown), `biochemistry` note, unknowns, To verify |
| "Historical resuscitation combinations" (unspecified) | `debrief.keyReasoning` | not used as a fact; To verify |
| "Bruising preceded later anticoagulation" (English feedback only) | `decisions.interpretation` option feedback | not used as a fact; To verify |

Derived values (editorial, for teaching; none is shown as a recorded result):

* Shock index 170 ÷ 108 ≈ 1.57; mean arterial pressure (108 + 2 × 70) ÷ 3 ≈ 83 mmHg at arrival.
* SIRS 4/4 (T > 38 °C, HR > 90/min, RR > 20/min, WBC < 4×10⁹/L); qSOFA 1 (RR ≥ 22/min only; systolic 108 mmHg;
  conscious).
* Partial SOFA from the recorded items ≥ 3: platelets 108×10⁹/L → 1; creatinine 205 μmol/L (171–299) → 2;
  cardiovascular 0 at arrival (MAP ≈ 83 mmHg); respiratory, liver and GCS not recorded.
* Creatinine 205 μmol/L ≈ 2.32 mg/dL (÷ 88.4); baseline unknown, so acute kidney injury cannot be staged.
* Hb 94 g/L = 9.4 g/dL; albumin 11.2 g/L = 1.12 g/dL; WBC 1.39×10⁹/L = 1,390/μL.
* LRINEC cannot be completed: Hb < 11 g/dL → 2, creatinine > 141 μmol/L → 2, WBC < 15×10⁹/L → 0, so 4 points from
  the recorded items; CRP (4 points if ≥ 150 mg/L), sodium (2 if < 135 mmol/L) and glucose (1 if > 10 mmol/L) are not
  recorded, so the true score could lie anywhere from 4 to 11 — do not estimate it.
* Day count: the fever began on the day of the caesarean (day 0), the bruising on day 1, the transfer on day 2; if
  "about day 5" counts from the onset, the diagnosis and debridement came about 3 days after the transfer. The
  starting point of the report's count is to verify.
* The recorded calcium of 62 mmol/L is not physiologically possible; no corrected value is offered.
* No weight is recorded, so 30 mL/kg and vancomycin doses are left as formulas.

Doses in the case are guideline and labelling formulas, not the report's: piperacillin–tazobactam 4.5 g IV every
6–8 h or meropenem 1 g every 8 h, renally adjusted; vancomycin by weight and levels; clindamycin considered while
streptococcal infection is possible; balanced crystalloid boluses of about 500 mL up to 30 mL/kg in 3 hours;
noradrenaline to MAP 65 mmHg; hydrocortisone 50 mg IV every 6 hours (200 mg/day).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "She was 29, two days after her baby was born, with a heart rate of 170. How did that feel?"
2. **Description** — "Walk me through the first hour: what did you think it was, what did you send, what did you
   give — and when did you call the surgeons?"
3. **Analysis**
   * "Her white count was 1.39. Did that make you more or less worried, and why?"
   * "qSOFA was 1 and every SIRS criterion was met. Which told you more about her?"
   * "How much of a LRINEC score could you calculate — and what would a low score have meant?"
   * "Could this be a haematoma? What made infection the better explanation, and did it change what you did?"
   * "She had already had three antibiotics. Was the problem the drugs?"
   * "Why not CT first? When does imaging help, and when does it hurt?"
   * "When she went into shock, was she too sick for theatre?"
   * "After the first debridement, how did you decide when she goes back?"
   * "She recovered after 403 days. What does that tell you about the timing — and what does it not?"
   * "What did you say to her while she could still talk, and to her family afterwards?"
4. **Summary** — "What will you do the next time a woman has fever, severe pain and spreading bruising days after a
   caesarean?"

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it | Where it scores |
|---|---|---|
| Reassured by a low white count or a qSOFA of 1 | decision 1 distractor; attending prompts; teaching point 2 | `rb-working-diagnosis` |
| Bruising read as a haematoma from the coagulopathy | decision 1 distractor; "correct the clotting first" trap | `rb-working-diagnosis`, `rb-source-control` |
| Escalating antibiotics and observing (her course before transfer) | decision 2 distractor; `observe-on-antibiotics` contraindicated | `rb-first-hour-plan`, `rb-source-control` (critical) |
| CT before the surgical call | decision 2 distractor; `imaging-before-surgery` contraindicated; CT has no result on arrival | `rb-first-hour-plan`, `rb-source-control` |
| Normalising the clotting before deciding on surgery | decision 2 distractor; `correct-clotting-first` contraindicated | `rb-first-hour-plan`, `rb-source-control` |
| Bedside opening of the wound as "source control" | `bedside-wound-opening` contraindicated | `rb-source-control` |
| A colloid because the albumin is 11.2 g/L | `starch-colloid` contraindicated | `rb-no-harm` (critical) |
| "Too unstable for theatre" once in shock | decision 3 distractor; `delay-until-off-pressors` contraindicated | `rb-shock-plan`, `rb-no-harm` |
| Hyperbaric oxygen or IVIG instead of debridement | decision 3 distractors | `rb-shock-plan` |
| One debridement, early closure or narrowing on "usual" susceptibility | decision 4 distractors | `rb-after-debridement` |
| Forgetting the baby | `inform-baby-team` | `rb-baby-team` |
| Giving a penicillin without asking about allergies | allergy item (not recorded), antibiotic dose text and decision 2 feedback | `rb-history` |
| Inventing the unrecorded (SpO₂, urine output, weight, the baby, susceptibilities) | unknown items, no-result records, `examNotRecorded` | — |

## Embodied mode

* **Where she is.** An emergency patient slot (`setting: emergency`) at the start. The ICU transfer
  (`destination: { setting: "icu" }`) moves her when the learner orders it; the reference path does so after she
  deteriorates. The theatre stage moves her to the operating theatre (`location: { setting: "operating-room" }`). The
  CT is done at the scanner (`performedAt: provider`), the ultrasound at the bedside; no other investigation moves her.
* **Kit.** IV access is a procedure (`iv-access`, treatment or crash cart); the antibiotics and hydrocortisone need IV
  access and medications; noradrenaline needs an infusion pump; oxygen and the monitor are at the bed space; the
  plasma-and-platelets trap needs the blood bank. The surgical call, the ICU transfer and telling the baby's doctors
  are clinician acts that need no equipment (consult/disposition).
* **Record reviews.** The transfer notes, the operation note and the outcome record are `performedAt: "records"`,
  `requires: ["records"]`, `risk: "none"`, read at a records terminal (the theatre has one) or at the bedside.
* **Who speaks.** She is conscious on arrival and answers for herself. From the deterioration stage she is intubated
  (`nonVerbalWhen: { "any": [ { "phase": "deterioration" }, { "phase": "theatre" } ] }`, reason "intubated after
  losing consciousness"), and her relative answers in the relative's own voice. The relative does not answer while
  she can (`companion.answersHistory: false`): the engine hands questions to a companion only while the patient is
  non-verbal.
* **Scope of practice.** The surgical call, the bedside wound opening and the second look are medical; drugs, fluids,
  oxygen and monitoring follow their kinds (nursing administration); the urinary catheter is nursing.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-1067457:"` passes in en and zh-CN (every objective done,
  in-world score equal to the clinical score).

## Source and adaptation (fidelity limits)

**From the report, via version 1.0.0 (kept as fact).** Every fact in the extraction map above: her age; the emergency
caesarean for fetal distress after an episiotomy and a failed vacuum extraction; no regular antenatal care; previously
healthy; fever from 2 hours after the operation to a maximum of 39.5 °C; abdominal pain and worsening right flank
pain; extensive abdominal and flank bruising from the next day, with pain and skin changes progressing fast;
breathlessness and distension; cefazolin, then metronidazole, ceftriaxone and others without improvement; transfer on
day 2; the arrival examination and bloods; bullae, mottled legs, septic shock, loss of consciousness and intubation
within hours; *E. coli* in blood and blister fluid; the CT; the operative findings and histology; the later necrosis,
repeated debridement, grafts and flaps, 403 days and discharge healed; the authors' judgement that diagnosis and
debridement around day 5 were late.

**Adapted for teaching.** Her lay words and her worries (labelled as part of the role; they add no fact); the relative
(1.0.0 records no relative: "relationship not recorded", added so that someone can speak for her after intubation)
and the relative's words, which retell only the recorded deterioration; the transfer notes as a record (they gather
the recorded history; the note form is a presentation); the placement of the CT in the deterioration stage and of the
culture and histology results in the theatre stage (their timing is not recorded); "no result yet" for the cultures
before the theatre stage; the ED → ICU → theatre staging; the staff characters (Nurse Ye, Dr Shao, Dr Che, Dr Wen);
the decisions, interventions, rubric, feedback, teaching points and doses (current guidance).

**Inconsistencies and loose ends in 1.0.0 kept, not resolved.**
* The delivery: the Chinese history says an episiotomy was done and vacuum extraction failed ("侧切和胎头吸引失败后");
  the English says "attempted episiotomy/vacuum delivery". The case follows the Chinese reading (she was cut and the
  suction cup failed) and lists the point to verify.
* Temperature 39.5 °C (the maximum before transfer, history) and 39.6 °C (on arrival, examination) are different time
  points; both are kept and labelled.
* The English feedback of a 1.0.0 decision says "bruising preceded later anticoagulation"; the Chinese says only that
  bruising was present before admission, and no anticoagulant appears anywhere else. No anticoagulant is mentioned in
  this version; to verify.
* The calcium is recorded as 62 mmol/L (impossible); 1.0.0 also says "some source units are questionable" without
  naming them. The value is shown as recorded and flagged; no correction is offered.
* 1.0.0 mentions "historical resuscitation combinations" without naming any drug, and lists gestational diabetes
  status as unknown without saying why it matters; neither is used as a fact.
* "Within hours" (of arrival, as the case reads it) and "about day 5" (from the onset, as the case reads it) have no
  recorded reference point; the case states its reading.
* 1.0.0's English examination said "initially conscious"; the Chinese "神志尚清" (still conscious) has no
  "initially". The case says "conscious".

**Not recorded and kept unknown** (`unknowns`, unknown history items, no-result records, `examNotRecorded`): the baby,
gestational age and labour (membrane rupture, intrapartum fever); allergies, previous operations, family history,
gestational diabetes; the caesarean wound, perineum, uterus and lochia, urine output, skin sensation; SpO₂, GCS,
weight; antibiotic doses, routes and timing before transfer and the regimen after it; any anticoagulant; CRP,
procalcitonin, sodium, glucose, blood gas, INR, APTT, fibrinogen, D-dimer and a usable calcium; the blood pressure,
lactate, fluids, vasopressors and blood products during the shock; the *E. coli* susceptibilities; the timing of
the CT and cultures; the dates, number and extent of the operations, the grafts and flaps; the ICU course and
extubation; function and follow-up after discharge.

**Wording of unknowns (STANDARD §6.3).** Because the article has not been checked, no text claims that the *report*
lacks something: no-result records say "No result is recorded for this test (at this stage)" /
"此项检查（在这一阶段）没有结果记录", steps the case does not record say "This case does not record whether this was
done; it does not simulate its effect" or the equivalent, `examNotRecorded` says "This case does not record this
examination." / "本病例没有记录这项检查。", and the patient answers unknowns in lay words ("I'm not sure, doctor." /
"这个我说不上来，医生。").

**Privacy.** Pseudonym 赵知远 / Zhao Zhiyuan (unchanged from 1.0.0); no hospital, date, place or occupation; relative
time only. **Figures.** The five figures approved in `scripts/cmcr-105-media-review.json` (`fig01`–`fig05`, checksums
unchanged) open only with the outcome record in the follow-up stage, with neutral titles ("Report figure N, shown with
the reported outcome"), because what each shows and when it was taken are not recorded in 1.0.0; no decision depends
on reading them. The survey's critic asked for these grouped approvals to be re-reviewed (faces, intimate areas,
per-figure captions); that review belongs to the media-review file, not to this case, and is listed below.

### To verify

Details to look for in the full article (the source check is pending):
* The timeline counted from the caesarean: when the fever, the flank pain and the bruising began; the transfer time
  on day 2; what "within hours" counts from; when the bullae, mottling, shock, loss of consciousness and intubation
  occurred; when the CT and the cultures were taken; the date of the first exploration (what "about day 5" counts
  from) and of every later operation; when she was extubated.
* The delivery: gestational age and parity; labour onset and duration; membrane rupture and any intrapartum fever;
  the evidence of fetal distress; whether the episiotomy was performed (Chinese 1.0.0) or only attempted (English
  1.0.0), its type and side; the vacuum attempts; the caesarean incision, anaesthetic and blood loss; the baby's
  condition and whereabouts.
* The referring hospital's care: cefazolin dose, timing and purpose (prophylaxis or treatment); the doses, routes and
  start of metronidazole and ceftriaxone; the drugs behind "等" ("and others"); any anticoagulant (the English 1.0.0
  feedback mentions "later anticoagulation"); analgesia; the stated reason for transfer.
* The arrival examination beyond what 1.0.0 gives: SpO₂ and oxygen, GCS, urine output, the caesarean wound, the
  perineum and episiotomy, the uterus and lochia, crepitus, skin sensation, the side(s) of the flank bruising, whether
  any bullae were present on arrival.
* The admission bloods as printed, with units, reference ranges and sampling time; the WBC differential; INR, APTT,
  fibrinogen, D-dimer; CRP, procalcitonin, sodium, glucose, blood gas; the calcium printed as "62 mmol/L" (unit or
  decimal error; total or ionised?); which other units 1.0.0 called questionable; why gestational diabetes status was
  singled out.
* The deterioration and ICU course: blood pressure and lactate at the time of shock; fluids; vasopressor agent and
  dose; corticosteroids, IVIG or other adjuncts (the unnamed "historical resuscitation combinations"); transfusions;
  ventilation and renal replacement therapy; complications.
* Microbiology: the specimens and their timing; *E. coli* susceptibilities (ESBL?); any other organism; the
  antibiotics after transfer and any change made on the results.
* The CT: timing relative to the deterioration and the operation, contrast, extent, which thigh.
* The operations: incisions, extent, whether the peritoneal cavity or uterus was involved, the number and intervals of
  debridements, negative-pressure wound therapy, the grafts and flaps.
* The outcome: function and psychological state at discharge, follow-up; the authors' stated reasons for the delay and
  their recommendations.
* Figures 1–5: what each shows and when; and a per-figure privacy re-review (faces, tattoos, intimate areas), as the
  survey's critic recommended.
* Whether a relative was present (the companion is a teaching device).

Guidance details to confirm in the full texts (taken from abstracts, guideline pages and secondary summaries):
* SSC 2026: volume and pages; the exact wording and grades of antibiotics within 1 hour, blood cultures before
  antimicrobials, 30 mL/kg, source control "ideally within 6 hours", noradrenaline first-line, the initial MAP target
  of 65 mmHg and the corticosteroid suggestion (dose and trigger); any statement on starches and on qSOFA.
* IDSA 2014: the planned return to theatre (recalled as 24–36 hours after the first debridement and daily
  thereafter; the case uses 24–48 hours), the empirical-regimen table and doses, and the hyperbaric-oxygen wording
  (found in a secondary summary of the clostridial myonecrosis section).
* SMFM Consult #67 (2023): its antibiotic-timing and vasopressor recommendations (only the fluid, starch/gelatin and
  "medical emergency" points were confirmed).
* RCOG Green-top Guideline No. 64 (2024): its recommendations on antibiotic timing, lactate and the obstetric early
  warning score, and its BJOG citation and DOI (not confirmed, so it is cited without one and is not listed as a
  guideline the case was checked against).
* WSES/SIS-E 2018: full author list; the NSTI statements and grades (timing, re-look, imaging, hyperbaric oxygen,
  IVIG, LRINEC) — only the abstract was confirmed.
* EAST 2018 (Gelbard et al.): DOI. Wong 2004 (LRINEC): full author list and DOI.
* 成人坏死性筋膜炎诊治专家共识（2025版）: its recommendations (only its citation and DOI were confirmed; it is cited as
  further reading).
* The doses used in the interventions (piperacillin–tazobactam 4.5 g every 6–8 h, meropenem 1 g every 8 h,
  hydrocortisone 50 mg every 6 h, vancomycin loading by weight) against the current Chinese labels and local
  formularies.
* Clinician input: an obstetrician, a general or plastic surgeon and an intensivist should review decisions 2–4,
  in particular the re-look interval and the antibiotic choice when allergy status is unknown.

## Matcher notes

* 39 `extensions.testUtterances` (22 zh-CN, 17 en; 2 look-alike negatives), none equal to a canonical question or a
  keyword; every required item has at least one. `cases verify`: 39/39, no extra selections.
* **Overlaps separated with `excludeKeywords`:** `flank-pain` vs bruising questions; `delivery` vs questions about the
  baby (and the reverse); `antibiotics-so-far` vs allergies; `past-health` vs operations, allergies and family;
  `previous-surgery` vs the caesarean; `family` (history) vs worries (担心/怕/scared); `worries` vs the family's
  worries; `family-worries` vs family history; `wound` vs "scared"/family (the keyword "scar" was replaced by
  "operation scar", and "scared" was removed from `worries`, because "scar" prefix-matched "scared").
* The presenting item no longer carries transfer words (转院/转到这儿), which belong to `transfer-reason`.
* Run-together keywords (`broughtyouin`, `whatsthematter`, `wheredoesithurt`, `howisthebaby`, `whatdidtheygive`,
  `everhadsurgery`, `whatwenton`, `howsheislying`) avoid one-word wildcards (`cases validate` warns on them).
* **Orders.** No bare "CT", "PT" or "HES" alias (substrings of other words); the CT answers to "CT扫描/腹部CT/ct scan/
  ct abdomen", clotting to "凝血/prothrombin time/inr", starch to "羟乙基淀粉/hydroxyethyl starch". The skin-fluid
  culture has a neutral name ("Skin and wound fluid culture") so no bullae are announced before they appear; its
  aliases include 水疱液/blister fluid.

## References

1. 何艳红, 王志坚. 剖宫产术后急性坏死性筋膜炎一例. 中华产科急救电子杂志. 2013;2(1):50-53.
   doi:10.3760/cma.j.issn.2095-3259.2013.01.012. Available from: https://rs.yiigle.com/cmaid/1067457
2. Stevens DL, Bisno AL, Chambers HF, et al. Practice guidelines for the diagnosis and management of skin and soft
   tissue infections: 2014 update by the Infectious Diseases Society of America. Clin Infect Dis.
   2014;59(2):e10-e52. doi:10.1093/cid/ciu296
3. Prescott HC, Antonelli M, Alhazzani W, et al. Surviving Sepsis Campaign: international guidelines for management of
   sepsis and septic shock 2026. Crit Care Med. 2026. doi:10.1097/CCM.0000000000007075
4. Shields AD, Plante LA, Pacheco LD, Louis JM; Society for Maternal-Fetal Medicine Publications Committee. Society
   for Maternal-Fetal Medicine Consult Series #67: Maternal sepsis. Am J Obstet Gynecol. 2023;229(3):B2-B19.
   doi:10.1016/j.ajog.2023.05.019
5. Royal College of Obstetricians and Gynaecologists. Identification and management of maternal sepsis during and
   following pregnancy. Green-top Guideline No. 64. London: RCOG; 2024.
6. Sartelli M, et al. 2018 WSES/SIS-E consensus conference: recommendations for the management of skin and
   soft-tissue infections. World J Emerg Surg. 2018;13:58. doi:10.1186/s13017-018-0219-9
7. Gelbard RB, Ferrada P, Yeh DD, et al. Optimal timing of initial debridement for necrotizing soft tissue infection:
   a Practice Management Guideline from the Eastern Association for the Surgery of Trauma. J Trauma Acute Care Surg.
   2018;85(1):208-214.
8. Wong CH, et al. The LRINEC (Laboratory Risk Indicator for Necrotizing Fasciitis) score: a tool for distinguishing
   necrotizing fasciitis from other soft tissue infections. Crit Care Med. 2004;32(7):1535-1541.
9. 中华医学会烧伤外科学分会, 《中华烧伤与创面修复杂志》编辑委员会, 中国医疗保健国际交流促进会烧伤医学分会.
   成人坏死性筋膜炎诊治专家共识(2025版). 中华烧伤与创面修复杂志. 2025;41(7):613-627.
   doi:10.3760/cma.j.cn501225-20250329-00150

These nine strings are `debrief.references`. Also named in the case's feedback: Sepsis-3 (Third International
Consensus Definitions for Sepsis and Septic Shock, 2016) for the definition of sepsis as infection with organ
dysfunction.

**How they were checked (2026-10-30).** PMC, BMC and the publishers' sites could not be fetched from this environment,
so each item was confirmed by web search against indexing records, society pages and secondary summaries: ref. 2
(PubMed 24973422; DOI ciu296 for the full guideline — ciu444 is the executive summary), ref. 3 (SCCM guideline page:
published 23 March 2026 in *Crit Care Med* and *Intensive Care Med*; DOI from the SCCM listing; volume and pages not
yet seen), ref. 4 (UTMB and SMFM records: 2023;229(3):B2-B19, doi:10.1016/j.ajog.2023.05.019), ref. 5 (RCOG page:
published December 2024, replaces Green-top 64a and 64b; no DOI confirmed), ref. 6 (indexing records: 2018;13:58,
doi:10.1186/s13017-018-0219-9), ref. 7 (EAST page and indexing records: 2018;85(1):208-214; DOI not found), ref. 8
(secondary summaries: 2004;32(7):1535-1541), ref. 9 (journal page: 2025;41(7):613-627 and its DOI). The source
article's DOI is the one verified in `scripts/cmcr-105-sources.json` (publisher check 2026-10-29). The 1.0.0
guideline string ("IDSA. Skin and Soft Tissue Infection Guideline.2014" with a society URL) was replaced by the
Vancouver citation.

## Changelog

### 1.1.0 — 2026-10-30

1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked
against the full source article.

* **Safety and validity (survey audit and critic).** The diagnostic decision now opens on arrival, before any CT,
  culture, operative finding or histology (1.0.0 opened it after the histology). The management key names the acts —
  cultures, IV piperacillin–tazobactam or a carbapenem plus vancomycin within the hour, balanced crystalloid and an
  immediate surgical call — instead of "surgical consultation and resuscitation". The three-day course is staged
  forward-only (arrival → deterioration → theatre → outcome) instead of one "chart evidence" stage. The critical items
  are now two acts (the surgical call with no delaying step first; no starch and no waiting for stability in shock),
  replacing a hindsight question about outcome bias, which is now taught in the debrief. Realistic errors replace the
  straw-man distractors: haematoma, endometritis with antibiotic change, CT first, clotting first, stabilise first,
  hyperbaric oxygen, IVIG, single debridement, early closure. Interventions 0 → 19, including six contraindicated traps.
* **Grounding.** The English-only "later anticoagulation", the unnamed "historical resuscitation combinations" and
  the calcium remark are no longer used as facts; the calcium is shown as recorded and flagged. Abdominal pain is no
  longer described as worsening (1.0.0 records only the right flank pain as worsening). The delivery follows the
  Chinese 1.0.0 reading (an episiotomy, then a failed vacuum extraction); the English "attempted episiotomy/vacuum
  delivery" is recorded in "Source and adaptation" and listed to verify.
* **Voice.** She answers in lay first person; no answer says "the source notes do not provide this". A relative (a
  labelled teaching device) speaks only after she is intubated (`nonVerbalWhen`). Affect `breathless`, with acting
  notes.
* **Spoilers.** Investigation names are neutral (no "exploration and histology" or "evolving skin findings" in the
  order list); the skin-fluid culture does not announce bullae; the summary and triage note name no diagnosis.
* **Register.** Spaces between numbers and units, *Escherichia coli*, no slash shorthand, "woman" not "female";
  感染源控制 and 白细胞减少 in the Chinese.
* **Structure.** Stages `initial`/`workup`/`followup` → `arrival`/`deterioration`/`theatre`/`followup`; 15 template
  history items → 24 case-specific items; exam 2 → 10 (with re-examination after the deterioration); investigations
  5 bundled record reviews → 13 single tests with structured values; decisions 3 → 4; rubric 11 → 12 with
  descriptive ids; objectives 4 → 6; staff 1 → 4 plus the relative; 4 → 6 learning outcomes; 3 → 6 teaching points;
  references rebuilt in Vancouver form; specialties obstetrics, general surgery, critical care, infectious disease.
* **Ids changed** (none referenced outside this case): history `presentation` → `presenting`, `onset` → `fever`,
  `progression` → `flank-pain` + `bruising`, `associated` → `breathing` + `distension`, `pmh` → `past-health` +
  `antenatal`, `operations` → `delivery` + `previous-surgery`, `medications` → `antibiotics-so-far`, `prior` →
  `transfer-reason`, `concerns` → `worries`; `exposure`, `function`, `redflags` and `baseline` removed (template slots;
  the red-flag answer is now part of the pain and bruising items); exam `exam-1`/`exam-2` → six arrival findings;
  investigations `labs` → `fbc`, `biochemistry`, `lactate`, `coagulation`; `progress` → deterioration-stage exam
  findings and the relative's account; `micro-ct` → `blood-cultures`, `skin-fluid-culture`, `ct`; `surgical` →
  `operative-findings`, `histology`; decisions `interpretation`/`management`/`safety` → `working-diagnosis`,
  `first-hour`, `shock-plan`, `after-debridement`; option ids are neutral (1.0.0 used `supported`/`alternative-N`).
* **Extensions.** `authorChecks` (unverifiable booleans) and `sourceTextSha256` removed until the source pass, as in the
  pilot cases; `sourceTextChecked: false`, `embodied.ivAccessInSitu: false` (no line is recorded).
* **Contract wording.** The English review note ends "The case is not yet reviewed by a licensed clinician." (the
  collection test matches the lower-case phrase); otherwise it is the standard's §6 text.

### 1.0.0

* Initial template version (PR #5).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1067457/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1067457 --lang en        # 75 steps · objectives 6/6 · decisions 4/4 · utterances 39/39 · rubric 28/28
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-1067457                   # PASS (depth floor, do nothing 0, wrong-first < reference)
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1067457:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1067457:"  # demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 29岁女性，孕期未正规产检，既往体健；因胎儿窘迫行会阴侧切和胎头吸引失败后急诊剖宫产。术后2小时起发热
（最高39.5 ℃），腹痛，右侧腰痛进行性加重，术后次日起腰腹部大片瘀斑，疼痛和皮肤改变进展很快，伴气促、腹胀；外院先后
用头孢唑林及甲硝唑、头孢曲松等无效，术后第2天转院。到达时神志尚清、被动体位，体温39.6 ℃，心率170次/分，呼吸44次/分，
血压108/70 mmHg；腹膨隆，压痛、反跳痛右侧明显，肠鸣音弱，腰腹部和左大腿上部大片紫红色瘀斑。白细胞1.39×10⁹/L，
血红蛋白94 g/L，血小板108×10⁹/L，肌酐205 μmol/L，白蛋白11.2 g/L，乳酸5.52 mmol/L，PT 19.2 s（血钙记录为62 mmol/L，
不可信）。数小时内出现水疱、下肢花斑和感染性休克，随后意识丧失、气管插管。血和水疱液培养均为大肠埃希菌；CT示腹壁、
盆壁及大腿软组织肿胀，腹壁皮下积气；探查见筋膜发黑坏死、恶臭渗液，病理为急性坏死性筋膜炎。作者认为约发病第5天才确诊
并清创，时机偏晚；此后仍有广泛皮肤和肌肉坏死，经多次清创、植皮和皮瓣修复，住院403天治愈出院。本版患者事实全部沿用
1.0.0版的提取，尚未对照原文全文核对。

**学习目标。**
1. 在CT或手术证实之前，根据迅速加重的疼痛、腰腹部和大腿的大片瘀斑、腹部体征、全身中毒表现及两种抗菌方案无效，识别剖宫产后第2天的坏死性软组织感染（IDSA 2014；WSES/SIS-E 2018）。
2. 把白细胞1.39×10⁹/L、乳酸5.52 mmol/L、肌酐205 μmol/L、PT 19.2 s和血小板108×10⁹/L解读为脓毒症伴器官功能障碍，并说明白细胞减少、qSOFA 1分和不完整的LRINEC为何不能让人放心。
3. 完成孕产妇脓毒症第一个小时的处理：血培养、1小时内广谱抗菌药物（按肾功能调整）、平衡晶体液而不用淀粉类液体、监护和ICU（拯救脓毒症运动2026；SMFM 2023；IDSA 2014）。
4. 一旦怀疑就立即请外科急诊探查，不先换药观察、不先做CT、不先纠正凝血、不做床旁切开（EAST 2018：疑诊后12小时内；拯救脓毒症运动2026：最好6小时内）。
5. 休克时把复苏带进手术室，计划多次清创，抗菌药物用到不再需要清创且退热48～72小时（IDSA 2014）。
6. 按Calgary–Cambridge方法向患者和家属说明病情与紧急手术，并在不受结局偏倚影响的前提下复盘延误。

**关键决策。** ① 到达时的工作诊断：坏死性软组织感染伴脓毒症和器官功能障碍（干扰项：凝血异常致血肿、子宫内膜炎合并
蜂窝织炎换药复评——接近她转院前的经过、白细胞低故非细菌感染）；② 第一个小时：留血培养，1小时内哌拉西林他唑巴坦或碳青
霉烯类加万古霉素，平衡晶体液，立即请外科探查（干扰项：换美罗培南观察24小时——原报告式路径、先做CT、先纠正凝血）；③ 休克
时：立即手术、复苏同时进行（干扰项：先稳定再手术、先做高压氧、免疫球蛋白加等药敏）；④ 首次清创后：24～48小时计划性
再次探查，按药敏调整抗菌药物并用到不再清创且退热48～72小时（干扰项：一次清创即可、改头孢曲松并早期缝合、早期皮瓣）。

**复盘要点（PEARLS）。** 先谈感受；复述第一个小时的判断、送检、用药和何时请外科；分析：白细胞1.39让你放心还是担心、qSOFA
与SIRS哪个更能说明问题、LRINEC能算出几分、血肿还是感染、问题出在药上还是感染源、为什么不先做CT、休克时能否上手术台、
首次清创后何时再回手术室、403天的痊愈能否说明时机安全、对患者和家属说了什么；总结下次遇到剖宫产后发热、剧痛和大片
瘀斑时怎么做。关键评分：到达阶段就请外科且之前没有拖延步骤（关键项）、不用羟乙基淀粉且休克时不推迟手术（关键项）。
待核实：时间线和“约第5天”的起算点、分娩细节和新生儿情况、外院用药剂量、到达时的其余查体和化验、血钙数值、休克时的
治疗、药敏、各次手术和5张原图的内容（见上文 To verify）。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业
医师审核。
