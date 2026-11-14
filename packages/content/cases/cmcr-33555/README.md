# cmcr-33555 — Fever and a seizure, then hard to rouse · 8-day-old boy

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title, summary,
> chief complaint, tags, triage note and specialty line name neither the cause nor the drug. The baby (谢知远 / Xie
> Zhiyuan) is a pseudonym; the case is a teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患儿为化名；本病例改编自已发表的病例报告，不构成医疗建议。

**Status of this version.** 1.1.0 is re-authored from the facts that version 1.0.0 recorded (STANDARD §6); the full
source article was not available, so **no patient fact has yet been checked against it**. Every patient fact below
traces to a statement of 1.0.0 (see the extraction table in *Clinical numbers check*); the teaching design follows
current guidance, checked by web search on 2026-11-12 where a threshold, dose or wording is quoted (see *To verify*
for what could not be confirmed). An independent AI-assisted review on 2026-11-13 replaced the guidance cited for the
lumbar puncture (NICE NG195; the meningitis guideline NG240 excludes babies up to 28 days), stated which high-risk
interventions are `critical`, and fixed the points listed in the *Changelog*. A second independent AI-assisted review on
2026-11-14 traced every patient fact again in both languages, re-read the cited guidance in its own text where it
could be reached, replayed the assessment and the order entry, and fixed what it found (see the *Changelog*); it was
not a clinician review.

## Case card

| | |
|---|---|
| Case | `cmcr-33555` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 黄雪美, 陈继昌, 韦拔, 蒋永江, 符婵, 谢玉泉. 换血疗法成功救治新生儿氯氮平中毒一例. 中华儿科杂志. 2013;51(5):392-393 (DOI verified in the source map, 2026-10-29) |
| Setting / facility | Neonatal intensive care (`icu`, 1.0.0 had `inpatient`) / `general-hospital`, an ICU bed |
| Difficulty / time | 4 / 5; about 40 min (static clock; four phases, five decisions, 18 interventions) |
| Specialty | Neonatology, neurology (1.0.0's `clinical-toxicology` dropped: it named the answer on the library card) |
| Languages | zh-CN (source language), en |
| Learner level | Neonatal and paediatric trainees, final-year students; neonatal nurses for the communication and safeguarding items |
| Review status | Editorial review 2026-10-30 and independent reviews 2026-11-13 and 2026-11-14 (all AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; facts not yet checked against the full article. Have a neonatologist and a paediatric safeguarding lead review it before teaching use |
| Content | 29 history items (12 unknown, 9 required; the relative answers) · 7 examination findings · 18 investigations (3 record reviews; 7 without a recorded result) · 18 interventions (4 always harmful, 3 conditionally contraindicated, 4 scored inside a time window; 3 `critical`) · 6 objectives · 5 decisions (20 options) · 12 rubric items (11 deterministic, weight 32; 1 examiner-judged; 3 critical) · 3 staff · 6 learning outcomes · 5 key reasoning steps · 6 teaching points · 54 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Run the first hour for a febrile, encephalopathic 8-day-old: airway and monitoring, glucose, a blood culture
   followed at once by IV antibiotics at meningitic doses (cefotaxime, not ceftriaxone, in a jaundiced newborn) with
   aciclovir, and a lumbar puncture deferred until his airway, seizures and bleeding risk are stabilised (NICE NG143,
   2019; NG195, updated 2026).
2. Recognise signs of intermediate or advanced acute bilirubin encephalopathy (a high-pitched cry, hypertonia) and
   escalate to intensive phototherapy and an urgent exchange transfusion even below the exchange threshold (AAP 2022;
   NICE CG98), while judging whether the level matches the severity of the signs.
3. Take a targeted, repeated exposure history in unexplained neonatal encephalopathy — every medicine in the
   household, the mother's own treatment, anything given to the baby — and keep a drug or toxin on the differential
   until it is excluded.
4. Interpret a rise in clozapine levels after an exchange as redistribution from a highly protein-bound,
   tissue-distributed drug (with continuing absorption the other possibility the report discussed), use levels to confirm exposure rather than to direct acute care (Austin Health 2024), and
   avoid gastric lavage and activated charcoal in an obtunded infant (AACT/EAPCCT 2005, 2013).
5. Act on the same day when a carer admits giving a newborn a prescription drug: a child-protection referral with the
   statutory report (China's 2020 revision of the Law on the Protection of Minors; NICE CG89, 2009), supervised care,
   and the doctors who prescribe the mother's clozapine involved without blame.
6. Plan follow-up after exchange-level hyperbilirubinaemia — diagnostic audiology including auditory brainstem
   response by 9 months (JCIH 2019) and structured neurodevelopmental follow-up — and explain that breastfeeding is
   generally not advised while the mother takes clozapine (BAP 2017; LactMed, revised 2025).

These are `learningOutcomes` in `case.json`; they name the drug, so front-ends show them before play only behind the
closed **Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief.

## Clinical summary (spoilers)

A boy born by caesarean at 41+3 weeks without needing resuscitation (recorded weight 3.06 kg) is 8 days old. Yesterday
he became **irritable with occasional screaming**, then had a **fever (38.7 °C at the referring hospital) and one
seizure with stiff limbs**; sedation and oxygen there stopped the seizure, but he stayed **poorly responsive and fed
poorly**. On arrival his temperature is 37.5 °C, heart rate 150/min, respiratory rate 40/min and BP 68/45 mmHg; his
**consciousness is impaired (GCS recorded as 8)**, he has a **high-pitched cry when stimulated**, groans at times, has
**a little froth at the mouth** and **increased tone in all four limbs**, and he is **jaundiced over the whole body
(moderate to severe)**. The total bilirubin is **334.7 µmol/L** (direct 12.5, indirect 322.2 µmol/L) with albumin
35.9 g/L; glucose 5.7 mmol/L; CRP < 5 mg/L and high-sensitivity CRP < 0.5 mg/L; blood gas, electrolytes, clotting
and renal function are summarised as unremarkable; the cranial ultrasound shows no obvious abnormality and the chest
film is reported as neonatal pneumonia. His relative cannot say at first what medicines are kept at home.

The report's team performed an **exchange transfusion before the exposure was established**, with the
hyperbilirubinaemia among the reasons. **Repeated questioning** then established that **his mother takes clozapine**
and an **admission that he had been given the drug before he fell ill**; the amount was a family estimate, not a
measurement. The clozapine level was **1777.1 µg/L after the exchange and 1997.5 µg/L on repeat**, later **539.0
and 197 µg/L**; the report discussed redistribution and continuing absorption and did not establish a further dose. After
several supportive measures (not itemised) his **pre-discharge neurobehavioural score was 37**, and follow-up of unstated
length described his growth and development as not noticeably different from his peers'. The record is unclear about whether, and
when, a second exchange was done. The article's title credits exchange transfusion with the rescue.

**Teaching answer today.** A febrile, encephalopathic 8-day-old gets a blood culture and IV antibiotics at meningitic
doses at once (cefotaxime with ampicillin or amoxicillin — not ceftriaxone in a jaundiced newborn) and aciclovir, with
the lumbar puncture deferred until his airway, seizures and bleeding risk are stabilised (NICE NG143, 2019; NG195,
updated 2026). A high-pitched cry and
hypertonia in a jaundiced baby are AAP 2022 signs of intermediate or advanced acute bilirubin encephalopathy: intensive
phototherapy and an urgent double-volume exchange follow whatever the level — and the mismatch between a modest level
(below NICE's 450 µmol/L exchange line at this age) and severe signs is the clue to look for a second cause, here a
drug the family had not yet described. Clozapine is extensively protein-bound and tissue-distributed, so an exchange
removes little and levels rebound; levels confirm exposure but do not direct care (Austin Health 2024), which is
supportive. A carer's admitted administration of a prescription drug to a newborn calls for a same-day child-protection
referral and the statutory report, and an exchange-level illness calls for diagnostic audiology by 9 months (JCIH
2019) and structured neurodevelopmental follow-up.

## Scenario timeline and physiology

Static clock and no physiology model (the CMCR contract). Every phase is forward-only (`learnerSwitchable: false`);
the phase descriptions tell the learner what moves time on, without naming an answer.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | arrival from the referring hospital, day 8 | start | the relative's history (medicines at home: "I can't say just now"); the admission examination; glucose, bilirubin with albumin, blood gas, electrolytes, renal function, clotting, CRP, cranial ultrasound and chest film reports; blood culture, blood count, blood groups with DAT, G6PD, EEG and drug screen (no result recorded); decisions 1 (`first-hour`) and 2 (`bilirubin-escalation`); the **windows** in which antibiotics (after a culture ordered here), intensive phototherapy and the exchange (after the bilirubin is read) count as given in time |
| `after-exchange` | after the exchange transfusion (timing not recorded) | decision 1 answered and objective 4 complete (admission results read, decision 2 answered, **exchange done**) | the relative's second account (mother's clozapine, the admission, the family's estimate of the amount); post-exchange clozapine 1777.1 → 1997.5 µg/L; ECG (no result recorded); decisions 3 (`level-rebound`) and 4 (`safeguarding`); the safeguarding referral's window opens |
| `before-discharge` | later in the admission (dates not recorded) | as above, and decisions 3 and 4 answered | later clozapine 539.0 and 197 µg/L; the pre-discharge neurobehavioural score (37); decision 5 (`discharge-plan`); the referral's window closes when this phase ends |
| `outcome` | the admission, discharge and follow-up | all five decisions answered | the report's course and outcome; the relative's follow-up account (`status-followup`, which supersedes `presentation`) |

Staged records: a test without a result in a phase says "No result is recorded for this test." in that phase, and
every gate on a staged record names its phase (decisions 3 and 5 read the drug levels of their own phase; objective 4
reads the admission reports with `phase: "admission"`). Because the first phase cannot be selected again once left,
phase 2 waits for objective 4 — every admission report read, decision 2 answered and the exchange done — so no
objective can be stranded on a report that is no longer readable. The admission examination is offered in the first
three phases, labelled "Admission examination"; no later examination is recorded except the pre-discharge
neurobehavioural score.

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-history` — Take the history from his relative (presentation, onset, the fit, the other hospital's treatment,
   fever, feeding, birth, medicines at home, anything given to him).
2. `obj-examine` — Examine him at the cot side (vital signs, consciousness, cry, tone, mouth, skin).
3. `obj-first-hour` — The first hour (decision 1; monitoring, IV access, blood culture, antibiotics, intensive
   phototherapy).
4. `obj-admission-results` — Read the admission results and decide on the bilirubin (eight admission reports read in
   the admission phase; decision 2; the exchange). Phase 2 waits for it.
5. `obj-reassess` — Ask again and reassess (the relative's second account and the amount; post-exchange drug levels;
   decisions 3 and 4; the safeguarding referral and the conversation with the mother and her doctors).
6. `obj-discharge` — Plan discharge and follow-up, then review the recorded course (later levels, the
   neurobehavioural score, decision 5, the follow-up plan, the outcome record).

Titles and hints name no cause, drug or result; hints are open questions ("Does the bilirubin level match his
neurological signs?") and contain no option text (`cases validate` checks it). No objective holds a time window: a
learner who gives the antibiotics late, starts phototherapy late or refers late loses the critical item but can still
finish (the contract's late-learner replay checks every order and intervention of the reference path).

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `first-hour` | presentation, onset, the fit, fever, the other hospital's treatment, birth, resuscitation and medicines at home asked; vital signs, consciousness, cry, tone, mouth and skin examined | protect the airway and monitor; glucose; blood culture and IV ampicillin with cefotaxime at meningitic doses, with aciclovir, at once, the LP deferred while he is this obtunded; bilirubin with albumin and intensive phototherapy now; ask again, specifically, about medicines at home | treat as kernicterus alone, holding culture and antibiotics unless the CRP rises (**anchoring on the jaundice**); **LP first, then antibiotics, phototherapy after the result** (the near-miss: right for a stable baby, unsafe here); sedate the screaming and observe until morning |
| 2 | `bilirubin-escalation` | decision 1; bilirubin with albumin read (admission) | keep intensive phototherapy going and do an urgent double-volume exchange for the signs of intermediate/advanced encephalopathy — and keep looking for a second cause, because 334.7 µmol/L is modest for signs this severe | **phototherapy and a repeat level: below the exchange line** (the near-miss: right without the signs); exchange and stop the infection work-up because bilirubin explains everything; IVIG and albumin instead of an exchange |
| 3 | `level-rebound` | decision 2; the second account (medicines, what was given, how much) asked; post-exchange levels read | redistribution (and possibly continuing absorption): treat the baby, not the number — airway, ECG, BP, temperature and seizure watch with toxicology advice — and no further exchange to clear the drug | **repeat the exchange after each rebound until below the adult alert level of 1000 µg/L** (the historical-looking choice; whether a second exchange was done is unclear in the record); the rise proves re-dosing — exclude the family and call the police; sedate and ventilate him until the level is in the adult therapeutic range, with charcoal |
| 4 | `safeguarding` | the second account (medicines and what was given) asked | same-day referral to the hospital safeguarding team and social work with the statutory report (China: the mandatory report to the police); supervised care with nothing unprescribed at the cot side; the doctors who prescribe her clozapine involved; her words recorded; no blame | **treat it as a well-meant mistake: advice, lock medicines away, discharge with an early review** (the near-miss); accuse the mother, bar her and leave it to the police, leaving out her own doctors; ask her to stop clozapine today so she can breastfeed, and refer only after a second exposure |
| 5 | `discharge-plan` | decision 2; later levels read; neurobehavioural assessment examined | discharge once the safeguarding plan is agreed; diagnostic audiology with ABR by 9 months, structured neurodevelopmental follow-up, MRI if signs persist; feeding agreed with the mother's team, breastfeeding generally not advised on clozapine | **an otoacoustic-emission screen and routine checks because the score of 37 is reassuring** (the near-miss); keep him in until the level is undetectable; home now with weekly blood counts for clozapine neutropenia and no follow-up |

Single best answer each, four options (20 in all), every option with its own 2–4-sentence feedback naming its guidance
(AAP 2022, NICE CG98, NG143, NG195, Austin Health 2024, AGNP 2017, AACT/EAPCCT 2005, NICE CG89, China's 2020 Law on
the Protection of Minors, BAP 2017, LactMed 2025, Blackman and Oloyede 2021, JCIH 2019). Option ids name content
(`cover-all-causes`, `lp-first`, `exchange-and-search`, `repeat-exchange-level`…), never correctness. **Length cue:** the
key is the uniquely longest option only in decision 1 (both languages), as the lint allows once per language; in
decisions 2–5 a near-miss distractor is at least as long as the key.

### Rubric (11 deterministic items, weight 32, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 3 | presentation, onset, the fit, the other hospital's treatment, responsiveness, fever, feeding, birth, resuscitation, medicines at home and anything given (admission), and the second account with the amount (after the exchange) asked |
| `rb-examination` | examination | 2 | vital signs, consciousness, cry, tone, mouth, skin examined |
| `rb-investigations` | investigations | 2 | bilirubin, glucose, CRP, cranial ultrasound and chest film read (admission); blood count and blood groups with DAT ordered (admission); drug levels read after the exchange and before discharge |
| `rb-first-hour` | diagnosis | 3 | decision 1 right first time |
| `rb-sepsis-cover-in-time` | **safety · critical** | 4 | blood culture ordered **in the admission phase** and antibiotics given **after it, within that phase** (`{"intervened": "antibiotics", "whenIndicated": true}`) |
| `rb-bilirubin-escalation` | **management · critical** | 4 | decision 2 right first time, intensive phototherapy given **in the admission phase**, and the exchange done **in the admission phase after the bilirubin was read** (both `whenIndicated`) |
| `rb-supportive-care` | management | 2 | airway care, monitoring, IV access, aciclovir, fluids and nutrition, EEG and ECG ordered |
| `rb-levels` | diagnosis | 3 | decision 3 right first time |
| `rb-safeguarding` | **safety · critical** | 4 | decision 4 right first time, the referral made **after the second account and before the outcome phase** (`whenIndicated`: phases 2–3), and the conversation with the mother and her doctors |
| `rb-discharge` | management | 2 | decision 5 right first time and the follow-up plan made |
| `rb-no-harm` | safety | 3 | none of: ceftriaxone, a sedative, gastric lavage, activated charcoal, a repeat exchange, a lumbar puncture while it is contraindicated (`{"intervened": "lumbar-puncture", "valid": false}`, i.e. in the admission phase) (`scoredWhen`: decision 1 or 3 attempted, or any of the six harms) |
| `rb-communication` | communication (examiner) | 1 | Calgary–Cambridge: what the relative knows and fears; plain explanation of antibiotics, the deferred LP and phototherapy; informed consent for the exchange; open, non-judgemental medicine questions asked again; an honest account of the safeguarding duty without blame or secrecy; no false reassurance; teach-back |

The three critical items are **acts** (a decision accompanies two of them, as in the pilot `cmcr-1653411`), one per
life-threatening domain of this case: infection in a febrile encephalopathic neonate, bilirubin encephalopathy, and a
deliberate drug exposure. Each act counts only inside its window (`indicatedWhen`), judged when it is given, so none can
be met in hindsight (after the post-exchange levels or the outcome record). `rb-no-harm` counts only once a harm was
possible, so doing nothing earns 0.

### How wrong choices score (measured 2026-11-14 after the second review's fixes, engine replay)

| Path | Score | Critical items missed | Safety outcome | Notes |
|---|---:|---|---|---|
| Reference `solution` | 32/32 (100 %) | — | passed | no contraindicated action |
| Do nothing (start, finish refused) | 0/29 | all three | passed | `rb-no-harm` not scored: no harm became possible |
| Wrong first answer at every decision, then right | 16/32 (50 %) | `rb-bilirubin-escalation`, `rb-safeguarding` | passed | the five first-try items and two critical items lost |
| Antibiotics only after the exchange | 28/32 (88 %) | `rb-sepsis-cover-in-time` | passed | outside the window (neutral) |
| Antibiotics before the blood culture, not repeated | 28/32 (88 %) | `rb-sepsis-cover-in-time` | passed | the window needs the culture first |
| No blood culture at all | 28/32 (88 %) | `rb-sepsis-cover-in-time` | passed | cannot finish until a culture is ordered (objective 3) |
| Phototherapy only after the exchange | 28/32 (88 %) | `rb-bilirubin-escalation` | passed | outside the window |
| Exchange before the bilirubin result | 28/32 (88 %) | `rb-bilirubin-escalation` | passed | harm text; `critical: false`; `maxDoses: 1`, so it cannot be redone in the window |
| Decision 2 "phototherapy and repeat the level" first | 28/32 (88 %) | `rb-bilirubin-escalation` | passed | the first-try part of the item |
| Safeguarding referral only after the outcome opens | 28/32 (88 %) | `rb-safeguarding` | passed | outside the window (neutral) |
| Decision 4 "advice and discharge" first | 28/32 (88 %) | `rb-safeguarding` | passed | the first-try part of the item |
| Ceftriaxone given as well | 29/32 (91 %) | — | passed | harm text (moderate risk); `rb-no-harm` lost |
| Lumbar puncture in the first hour | 29/32 (91 %) | — | passed | harm text (NICE NG195); `rb-no-harm` lost through `valid: false`; an LP once phase 2 has opened is not contraindicated and costs nothing |
| Repeat exchange for the level | 29/32 (91 %) | — | passed | harm text (contraindicated once the post-exchange levels are read); `critical: false`; `rb-no-harm` lost |
| Phenobarbital loading dose with no recurrence | 32/32 (100 %) | — | passed | a conditional plan ("if a seizure recurs"); the case records no recurrence and scores none (neutral) |
| Sedative in the first hour | 29/32 (91 %) | — | **failed** (`sedation`) | `critical: true`; `rb-no-harm` lost |
| Gastric lavage and charcoal after the disclosure | 29/32 (91 %) | — | **failed** (`gastric-lavage`, `activated-charcoal`) | `critical: true`; `rb-no-harm` lost once |
| The report's recorded steps only (exchange; correct decisions) | 14/32 (44 %) | all three | passed | no culture, antibiotics, phototherapy, referral or follow-up recorded; cannot finish until they are done |

Contraindicated actions are named in the debrief but, as everywhere in the library, do not lower the score by
themselves; the harms that matter most are scored through `rb-no-harm` and the windows of the critical items, and the
critical ones fail the safety outcome whatever the score.

**Safety outcome.** `sedation`, `gastric-lavage` and `activated-charcoal` are `critical: true`: a sedative to quieten
an obtunded newborn (GCS recorded as 8, froth at the mouth, an unprotected airway), or gastric lavage or charcoal by
gastric tube with that airway unprotected, more than a day after any ingestion, risks respiratory arrest or aspiration
for no benefit, so any of
them fails the assessment's safety outcome (`safety.passed: false`) whatever the score. `exchange-transfusion` (done
before the bilirubin is read) and `repeat-exchange` (a second exchange to chase the drug level) are `critical: false`:
high-risk misjudgements a neonatal unit can usually recover from, which show their harm text and cost the critical
item's window or `rb-no-harm` without failing the safety outcome. `ceftriaxone` and the first-hour `lumbar-puncture`
are moderate-risk errors (harm text; `rb-no-harm` lost). The case already has the contract's maximum of three critical
rubric items, so the three critical interventions sit in the non-critical `rb-no-harm` and fail the safety outcome on
their own.

## Reference path (`solution`)

90 steps: start → 23 admission-phase history items (10 of them unknown) → vital signs, consciousness, cry, tone,
mouth, skin → decision 1 → airway care → monitoring → IV access → glucose (5.7 mmol/L) → blood culture → antibiotics →
aciclovir → intensive phototherapy → fluids and nutrition → EEG → bilirubin with albumin (334.7 µmol/L) → blood gas,
electrolytes, renal function, clotting, CRP → blood count, blood groups with DAT, G6PD (no result recorded) → cranial
ultrasound and chest film reports → decision 2 → exchange transfusion (phase 2 opens) → the relative's second account
(medicines, what was given, the amount, why — unknown, the mother's illness — unknown) → post-exchange drug levels →
ECG → decision 3 → safeguarding referral → conversation with the mother and her doctors → decision 4 (phase 3) → later
drug levels → neurobehavioural assessment → follow-up plan → decision 5 (phase 4) → the outcome record → the relative's
follow-up account → finish. `cases verify`: objectives 6/6, decisions 5/5, utterances 54/54, rubric 32/32. The
demonstration asks only questions a clinician would put to the relative of an 8-day-old (1.0.0 asked about his
operations, vaccinations, activities and previous health), and it defers the lumbar puncture.

## Clinical numbers check

**Extraction table (STANDARD §6.2).** Every patient fact, its field in 1.0.0 and its field now. The source check is
pending: none of these has been compared with the full article.

| Fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| boy, 8 days old, weight 3.06 kg (time point not given) | `patient` | `patient.age`/`weightKg`, `history.weight` (the relative cannot say when he was weighed), title |
| chief complaint: one day of fever and a seizure | `patient.chiefComplaint` | chief complaint (relative's words), `history.presentation`, triage note |
| referred; poorly responsive and feeding poorly after sedation and oxygen | `patient.triageNote` | triage note, `history.prior-treatment`, `responsiveness`, `feeding` |
| yesterday irritability and occasional screaming, then fever and a seizure | `history.onset`, opening line | `history.presentation` (volunteer), `history.onset`, opening line |
| one episode of stiff limbs; stopped after treatment; responsiveness still poor | `history.seizure` | `history.seizure`, `history.responsiveness` |
| poor feeding during this illness | `history.feeding` | `history.feeding` |
| caesarean at 41+3 weeks; no asphyxia resuscitation | `history.birth` | `history.birth`, `history.resuscitation` |
| 38.7 °C measured locally | `history.fever` | `history.fever`, triage note |
| sedation and oxygen locally stopped the seizure | `history.prior-treatment` | `history.prior-treatment` (the drug is not recorded) |
| detailed household medication history obtained later; not provided promptly at referral | `history.parental-history` | `history.home-medicines`, `history.given-anything` (admission: "I can't say just now") and their phase twins |
| impaired consciousness, high-pitched cry after stimulation, occasional groaning, slight oral froth, increased tone in all four limbs, recorded GCS 8 | `exam.consciousness` | `exam.consciousness`, `exam.cry`, `exam.mouth`, `exam.tone` |
| moderate-to-severe generalised jaundice (zh 全身中重度黄染; en "moderate-to-marked"); T 37.5 °C, HR 150/min, RR 40/min, BP 68/45 mmHg | `exam.jaundice` | `exam.jaundice`, `exam.vitals`, triage note |
| total bilirubin 334.7, direct 12.5, indirect 322.2 µmol/L; albumin 35.9 g/L | `investigations.bilirubin` | `investigations.bilirubin` (values structured) |
| glucose 5.7 mmol/L; blood gas, electrolytes, coagulation and renal function summarised as unremarkable; CRP < 5 mg/L, hs-CRP < 0.5 mg/L | `investigations.early-tests` | `glucose`, `blood-gas`, `electrolytes`, `coagulation`, `renal`, `crp` (one test each; the summaries carry no values) |
| cranial ultrasound without clear abnormality; chest film reported as neonatal pneumonia | `investigations.imaging` | `cranial-us`, `chest-xray` (record reviews) |
| repeated questioning: mother uses clozapine and admitted the infant had been given the drug before onset; amount estimated by relatives, not measured | `investigations.exposure-record` | `history.home-medicines-disclosed`, `given-anything-disclosed`, `amount-given` (phases 2–3), outcome record |
| post-exchange levels 1777.1 then 1997.5 µg/L | `investigations.exposure-record` | `investigations.drug-levels` (after the exchange) |
| exchange transfusion before the exposure was clarified, partly for hyperbilirubinaemia; multiple supportive measures | `investigations.followup` | outcome record, `exchange-transfusion` and `nutrition` responses, phase 2 description |
| levels rebounded, then fell to 539.0 and 197 µg/L | `investigations.followup` | `investigations.drug-levels` (before discharge), outcome record |
| pre-discharge neurobehavioural score 37 | `investigations.followup` | `exam.neurobehaviour` (before discharge), outcome record |
| follow-up of unspecified length: development comparable with peers | `investigations.followup` | outcome record, `history.status-followup` |
| the narrative is unclear about the timing of any later exchange | `investigations.followup` | outcome record, `repeat-exchange` response, decision 3 feedback, unknowns |
| the report discusses redistribution and ongoing absorption; no proof of repeat ingestion | decision `evidence` feedback | outcome record, decision 3 key feedback, teaching point 4 |
| the article's title: exchange transfusion successfully treated neonatal clozapine poisoning | citation | provenance, teaching point 4, attending's brief |
| unknown: exact ingestion, complete pharmacokinetic timing, any repeat exchange, standardised long-term follow-up | `unknowns` | `unknowns` (7 entries) |

**Values with units and derived values.**

* Total bilirubin 334.7 µmol/L ÷ 17.1 = **≈ 19.6 mg/dL**; direct 12.5 µmol/L (≈ 0.7 mg/dL, 3.7 % of the total);
  indirect 322.2 µmol/L = total − direct (334.7 − 12.5), so the record is internally consistent. Albumin 35.9 g/L =
  3.59 g/dL, above the AAP 2022 neurotoxicity risk-factor cut-off of 3.0 g/dL. Bilirubin/albumin ratio ≈ 5.5 (mg/dL
  per g/dL) or ≈ 0.62 mol/mol — derived, not used in any decision (the Chinese thresholds for it are not verified here).
* Age at sampling: day 8, i.e. **≥ 96 hours** (8 × 24 = 192 h if sampled on day 8 — the sampling time is not recorded);
  gestation 41+3 weeks (≥ 38 weeks). NICE CG98 for ≥ 38 weeks at ≥ 96 h: phototherapy > 350 µmol/L, exchange
  > 450 µmol/L — 334.7 is below both lines; AAP 2022 thresholds are not quoted because the curve values could not be
  verified (see *To verify*). With signs of intermediate/advanced encephalopathy both guidelines call for an urgent
  exchange whatever the level.
* Glucose 5.7 mmol/L (≈ 103 mg/dL). CRP < 5 mg/L, hs-CRP < 0.5 mg/L (text values).
* Vital signs: T 37.5 °C, HR 150/min, RR 40/min, BP 68/45 mmHg (mean ≈ 53 mmHg, derived). No SpO₂ recorded. Referring
  hospital: 38.7 °C.
* Clozapine (µg/L = ng/mL; 1.0.0's 血药浓度 names no sample type, so the case says "clozapine level"): 1777.1 →
  1997.5 µg/L after the exchange, a rise of 220.4 µg/L (+12.4 %), both ≈ 1.8–2.0 ×
  the adult laboratory alert level of 1000 ng/mL (AGNP 2017); later 539.0 (inside the adult therapeutic range
  350–600 ng/mL) and 197 µg/L (below it). Adult references are not validated in newborns, and the sampling times are
  not recorded, so no half-life is derived.
* Neurobehavioural score 37 — the scale and its maximum are not recorded (the NBNA, if that is the scale, is scored out
  of 40; see *To verify*), so no interpretation of the number is given in the case beyond "one score at discharge".
* Teaching doses (formulas, never patient values): aciclovir 20 mg/kg IV 8-hourly (60 mg/kg/day); phenobarbital
  20 mg/kg slow IV only for a further seizure; activated charcoal 1 g/kg (a trap item); antibiotics at the neonatal
  formulary's meningitic doses (no mg/kg printed); intensive phototherapy ≥ 30 µW/cm²/nm at 460–490 nm; double-volume
  exchange (twice the estimated blood volume). For a 3.06 kg baby aciclovir would be ≈ 61 mg per dose — deliberately
  not printed in the case.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "When did this baby stop being a 'jaundiced baby' for you and become an unexplained encephalopathy?"
2. **Description** — "In two sentences: what did you find in the first hour, and what did you do before any result came
   back?"
3. **Analysis**
   * "What made you give antibiotics before the lumbar puncture, and what would have made the LP safe?"
   * "Which signs made the exchange urgent, and did 334.7 µmol/L at 8 days explain signs this severe?"
   * "The family said 'I can't say' about medicines at home. What did you do with that answer — and how did you ask
     the second time?"
   * "The level rose after the exchange. What does that tell you about the drug, and what does it not tell you?"
   * "What exactly is the hospital's duty once a carer admits giving a newborn a prescription drug, and how do you tell
     the family without blame?"
   * "The article's title credits the exchange with the rescue. What can one case, exchanged partly for its bilirubin and given
     several other treatments, show?"
4. **Summary** — "Name the three acts you would not delay in a febrile, jaundiced, encephalopathic 8-day-old, and the
   two follow-up appointments he needs."

### Common learner errors and how the case surfaces them

* **Anchoring on the jaundice** — decision 1 `bilirubin-only` and decision 2 `bilirubin-explains-all`; the attending
  asks whether the level matches the signs; the mismatch is the case's hinge.
* **LP before antibiotics in an obtunded baby** — decision 1 `lp-first`; the LP is contraindicated in the admission
  phase with NICE NG195 harm text and costs `rb-no-harm` there.
* **Sedating the signs** — decision 1 `sedate-observe`; the `sedation` intervention is `critical` (a sedative in an
  obtunded newborn with an unprotected airway fails the safety outcome).
* **Waiting for a number before phototherapy, or exchanging without one** — the phototherapy window is the admission
  phase; the exchange is contraindicated until the bilirubin is read (`maxDoses: 1`).
* **Ceftriaxone in a jaundiced newborn** — a trap intervention with its SmPC contraindication; the antibiotics item's
  dose text says why.
* **Accepting "I can't say" as "no"** — the second account is only reachable by asking again in phase 2; decision 3
  and objective 5 need it.
* **Chasing the level** — decision 3 `repeat-exchange-level` and `levels-guide-care`; the repeat exchange is
  contraindicated once the levels are read.
* **Decontamination reflexes** — gastric lavage and charcoal are always harmful here (AACT/EAPCCT 2013, 2005); both
  are `critical`, so either fails the safety outcome.
* **Treating the admission as a teaching moment only** — decision 4 `advice-discharge`; the critical item needs the
  referral inside phases 2–3.
* **Punishing or medicating the mother** — decision 4 `exclude-mother-police` and `stop-clozapine-breastfeed`.
* **A reassuring score ends follow-up** — decision 5 `oae-routine` (emissions can be normal in bilirubin auditory
  neuropathy; JCIH 2019).

### Teaching points (debrief)

1. The first hour: cultures, antibiotics and aciclovir now, LP when safe, cefotaxime not ceftriaxone (NICE NG143 2019,
   NG195 updated 2026; EU ceftriaxone SmPC).
2. Bilirubin encephalopathy: urgent exchange for the signs (AAP 2022; NICE CG98) — and the modest level as a clue.
3. The medicine history asked specifically and more than once; poisoning as an alerting feature of maltreatment (NICE
   CG89, 2009).
4. Clozapine and its removal: protein binding, redistribution, levels that do not direct care (Austin Health 2024),
   adult references (AGNP 2017), no decontamination (AACT/EAPCCT 2005, 2013); what the article's title can and cannot
   claim.
5. Safeguarding the same day: China's 2020 Law on the Protection of Minors and the 2020 mandatory-reporting opinion;
   supervised care; the doctors who prescribe her clozapine; no abrupt stop of clozapine (Blackman and Oloyede, 2021).
6. Follow-up: diagnostic audiology by 9 months (JCIH 2019), structured neurodevelopment, feeding on clozapine (BAP
   2017; LactMed 2025).

## Embodied mode

* **Where things are (`general-hospital`).** The baby lies in an ICU bed (`setting: icu`) and is never moved in the
  reference path. History and examination happen at the cot side; the relative answers (`patient.nonVerbalWhen:
  {always: true}`, reason "an 8-day-old newborn, poorly responsive; his relative answers for him"), and the opening
  line is the relative's ("(Relative) Doctor, …"). The companion is "Xie Zhiyuan's relative (pseudonym)", role
  `carer`, without `appearance.presentation`, since the record does not say who they are.
* **Kit.** Airway care uses the bed's oxygen outlet (oxygen, suction); monitoring the bed's monitor; IV access the
  ICU crash trolley's cannulation kit, before every IV drug; intensive phototherapy the ICU phototherapy unit; the
  exchange transfusion the neonatal incubator (`neonatal-care`), blood from the blood bank and the IV access; the EEG
  the ICU EEG machine (a bedside test done by the clinician, not a nursing test) and the ECG the ICU ECG machine.
  Laboratory tests are sampled at the patient or, once the cannula has drawn the bloods, ordered at a records
  terminal. The cranial ultrasound and chest film reports and the outcome record are record reviews read at the ICU
  nurses' station. A brain MRI would need the baby taken to the scanner, which is why it is not in the reference
  path.
* **Capability check.** Everything the case needs exists in `general-hospital` (`caseCapabilityGaps` is empty):
  `records`, `lab-chemistry`, `lab-blood-gas`, `lab-hematology`, `lab-microbiology`, `eeg`, `ecg-12lead`,
  `cardiac-monitor`, `oxygen`, `suction`, `iv-access`, `medications`, `phototherapy`, `neonatal-care`, `blood-bank`,
  `mri`.
* **Scope of practice.** Drugs, monitoring and positioning follow their kinds (nursing); the exchange, the lumbar
  puncture and gastric lavage are procedures (medical); the safeguarding referral and the conversation with the
  mother's doctors are consults; the follow-up plan and nutrition are kind `other`.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-33555:"` replays the reference path in en and zh-CN in the
  general hospital (see *Validation*).

## Source and adaptation (fidelity limits)

**From 1.0.0 (kept as fact, not yet checked against the article).** Everything in the extraction table above.

**Adapted for teaching.** The relative (which relative is not recorded; role `carer`, named "谢知远的家属（化名）" /
"Xie Zhiyuan's relative (pseudonym)") and all dialogue in lay first person; the admission-phase non-answers about
medicines (the record says the history was not provided promptly) and the phase-2 account; the relative's worries (an
ICE item that touches only the recorded fever and jaundice); the staff (Dr Song, Nurse Zhou, Pharmacist Liang); the four
phases (the exchange's timing, the repeat questioning and every sampling time are unrecorded; the phases are staging);
the neonatal intensive care unit as the place of admission (1.0.0: "inpatient"); the decisions, interventions, dose
formulas, rubric and feedback (current guidance); the "Admission examination" label on the recorded findings; the
order of the reference path.

**Inconsistencies and ambiguities kept, not resolved.**

* The article's title says exchange transfusion *successfully treated* the clozapine poisoning; 1.0.0 records that the
  exchange was done *before the exposure was established*, with the hyperbilirubinaemia among the reasons. The case
  states both (outcome record; teaching point 4) and teaches that one case cannot credit the exchange.
* Whether a second exchange was done, and when, is unclear in the record; the case adds none (the `repeat-exchange`
  response says so).
* 1.0.0's zh, "得知母亲使用氯氮平，并承认发病前曾给婴儿服药", reads most naturally with the mother as the one who
  admitted, the giver unstated; its en is passive ("an admission that the infant had been given the drug"). The
  relative's answer and decisions 3 and 4 follow the zh ("his mother has admitted that he was given clozapine"), the
  outcome record keeps each language's 1.0.0 wording, and who gave the drug is left open (see *To verify*).
* 1.0.0's follow-up reads "生长发育与同龄儿无明显差异" in zh and "development comparable to peers" in en; the case
  says growth and development "not noticeably different" from his peers in both languages (the zh meaning).
* 1.0.0's jaundice reads "全身中重度黄染" in zh and "moderate-to-marked" in en; the case uses "moderate-to-severe" in
  both languages (the zh meaning).
* A GCS of 8 is recorded for a newborn; which scale was used is not recorded (the adult GCS is not validated in
  neonates). The case keeps "GCS recorded as 8".
* The levels "fell to 539.0 and 197 µg/L" — the case keeps the order given and no sampling times.
* 1.0.0 placed the bloods in a "workup" phase and the exposure in a "confirmation" phase — template staging, not a
  recorded chronology.

**What 1.0.0 claimed about the article and this version does not.** 1.0.0's unknown answers said "the source case does
not provide that information"; the relative now says "I'm not sure, doctor" or "I can't say", tests without a result
say "No result is recorded for this test", and `examNotRecorded` says "This case does not record this examination."
1.0.0's management-decision feedback alluded to "historical measures" of induced vomiting or enemas without recording
them; the case does not state that any decontamination was done (see *To verify*).

**Unknowns kept honest** (`unknowns`, 12 unknown history items, 7 tests without a recorded result, `examNotRecorded`):
oxygen saturation and later vital signs; the blood count, blood groups, DAT, G6PD and reticulocytes (so the cause of
the hyperbilirubinaemia); culture, CSF, EEG, ECG, MRI; antibiotics, aciclovir, phototherapy; the sedative at the
referring hospital; the dose, route, time and reason for the clozapine; feeding method; the mother's diagnosis and dose;
who cares for him at home; sampling times; any second exchange; post-exchange bilirubin; the neurobehavioural scale;
the length and content of follow-up; any child-protection action.

**Privacy.** Pseudonym unique across the CMCR cases (unchanged from 1.0.0); no hospital, date, place or occupation;
times relative (day 8, after the exchange, before discharge). Authors' names only in the citation. No media are
approved for this case (the media review lists none), so it has no assets.

**Labelled teaching devices.** The relative's two worries (fever and the brain; how yellow he is) restate recorded
facts and add none; the admission-phase non-answers portray the recorded late disclosure without inventing a denial.

**Inferences (derived, not new).** The clozapine is the mother's own treatment, so someone prescribes it; who, and for
what, is not recorded, so the case asks for "the doctors who prescribe her clozapine" rather than a psychiatric team
(the first draft named one). 1.0.0 gives the clozapine values as 血药浓度 (a blood drug level) without a sample type,
so the first draft's "serum" is gone. Placing 539.0 and 197 µg/L in the before-discharge phase is staging (1.0.0:
"rebounded, then fell to"); their record is dated only "after the rise". The neurobehavioural score is not
interpreted: its scale is not recorded.

**Survey findings addressed** (the template findings that cite cmcr-33555 — canonical questions and keywords,
authoring language in answers and the companion, bundled vital signs, bundled records, `rb-unknown`, phases, objectives,
the matcher corpus — and the spoiler/specialty findings; no case-specific audit covered it, and the critic flagged
"neonatal toxicology and safeguarding" as an unaudited class).

* *Canonical questions about the record ("原资料有药物过敏吗？" / "Is medicine allergies documented?"), two questions
  joined, padded keywords* → one natural question per item, 4–12 keywords per locale, run-together forms where a phrase
  would reduce to a stop-word wildcard.
* *Unknown answers in authoring language ("the source case does not provide that information…"); the companion named
  "Companion (educational role)"* → lay unknowns; a relative named by relation; no authoring language anywhere in the
  persona (the contract's `META` check).
* *Vital signs bundled into the jaundice finding; findings without keywords* → seven findings, one manoeuvre each, with
  keywords; vital signs their own finding.
* *Bundled records ("Glucose and initial investigations", "Cranial ultrasound and chest film"), aliases equal to the
  name, no structured values* → one test per record, abbreviations in both languages, structured bilirubin, glucose,
  CRP and clozapine values, seven honest "no result recorded" tests.
* *No interventions* → 18, from the report's exchange to today's steps and five tempting harms.
* *Option ids `supported`/`correct`; a critical item that was a first-try decision (`rb-safeguarding:
  decidedFirstTry management`); `rb-unknown` rewarding an unrecorded allergy question* → content ids; three act-based
  critical items with time windows; `rb-unknown` removed.
* *Specialty `clinical-toxicology` and a summary citing "exposure information" (spoilers)* → `neonatology` + `neurology`
  and a presentation-only summary.
* *`nonVerbalWhen` spelled out phase by phase; an unbracketed opening line* → `{always: true}`; the opening line is the
  relative's.
* *Capability gaps (phototherapy, exchange transfusion)* → the framework's `phototherapy` and `neonatal-care`
  capabilities; the exchange requires `["neonatal-care", "blood-bank", "iv-access"]`.
* *Safety content:* 1.0.0's safety plan omitted infection cover, the deferred LP, the ABE escalation, decontamination
  harms, ceftriaxone, the statutory report and hearing follow-up; all are now taught and scored.

## Matcher notes

* 54 `extensions.testUtterances` (27 zh-CN, 27 en; 2 look-alike negatives; 2 with `alsoOk: ["fever"]` because the
  question names the fever: "Which came first, the screaming or the temperature?"). None equals a canonical question or
  a keyword; every required item has a paraphrase; `cases verify` 54/54 with no extra selections. Every canonical
  question selects its own item alone in every phase where it is offered (re-probed 2026-11-13 and 2026-11-14 with the patient
  pipeline's rule — hits ≥ 0.55 within 0.25 of the best; the review found 23 phase/question pairs that also selected
  another item and fixed them with the exclusions below).
* **Review fixes (2026-11-13).** "What brings him in today?", "Why is he here?" and "Why has he been sent to us?"
  selected nothing (`bringshimin`, `bringshim`, `bringsyou`, `whyishehere`, `senttous`, `senthere` and zh 怎么来医院
  added to `presentation`); "什么时候开始黄的？" reached `onset` (开始黄, 黄起来 added to `jaundice-onset`);
  `reason-given`'s question "Why was he given it?" reduced to the single word "given" and answered every "was he
  given…" question, so it now reads "What was the reason for giving it to him?" (`whydidtheygive`, `whydidyougive`
  added); "Did anyone give him something before he became unwell?" now reaches the second account (`anyone give`,
  `before he became unwell`). Exclusions keep the family-history question off `seizure` and `jaundice-onset`, the
  sick-contacts, allergy and maternal-illness questions off the two medicines items (a superseded item's hits go to
  its twin, so both carry them), the pregnancy question off `fever`, the Apgar question off `resuscitation`,
  "…给他吃过东西…" off `feeding`, "why" questions off `home-medicines-disclosed` and "家里到底谁在吃药？" off
  `given-anything-disclosed`. Six regression utterances lock the new paths in.
* **Review round 2 (2026-11-14).** `scripts/case-check.ts` now probes plain openers: "When did it start?" and
  "有什么不舒服？" reached nothing, nor did "How long has he been unwell?", "Can you tell me about his illness?", 多久了？,
  孩子怎么不好了？ or 病了几天了？; `presentation` gained run-together openers (`whendiditstart`, `whendidthisstart`,
  `hebeenunwell`, `beenlikethis`, `hisillness`…) and 有什么不舒服, 多久了, 什么时候开始的, 病了几天, 怎么不好, guarded
  by zh exclusions (抽, 黄, 烧, 热, 奶, 家里, 妈妈, 药) so "抽了多久了" or "黄了多久了" stay with their own items.
  Also fixed: "When did you first notice the jaundice?" (onset now excludes jaundice/黄), "Did he cry straight away at
  birth?", "Could he have swallowed any tablets?", 尿得多吗？, and the extra selections of "What medicine does his mother
  take?" and 有没有给他吃过妈妈的药？ (`mother-illness`), "When was it given?" and 什么时候给他吃的？ (both "given" items,
  since a superseded item's hits go to its twin), 家里有什么遗传病吗？ (`home-medicines`); examination requests in lay
  words ("How responsive is he?", "Does he open his eyes?", "Feel his arms and legs", 他叫得醒吗？, 摸摸他胳膊腿紧不紧,
  看看黄不黄) now reach their findings. Eight regression utterances added (54). Probed with the pipeline's selection
  (`distinctHistoryHits`, ≥ 0.55 within 0.25 of the best): 70 history and 22 examination phrasings beyond the corpus.
* **Order entry (round 2).** Order aliases are substrings of the query, so generic ones routed other tests to scored
  records: "CSF culture", "urine culture", 脑脊液培养 and 尿培养 ordered the *blood* culture that the critical item
  `rb-sepsis-cover-in-time` needs (aliases `culture`, `cultures`, 培养, 细菌培养 removed); "urine drug screen" reached the
  clozapine blood levels (alias removed, and an `orderMatching` rule drops `drug-levels` for urine/尿 queries);
  "crossmatch", "group and save" and 交叉配血 reached the DAT record; "magnesium"/血镁 reached the electrolyte summary
  (magnesium is not recorded as part of it); "abdominal x-ray" reached the chest film (`x-ray`, x光, 拍片 removed);
  "septic screen" reached the clotting screen (`pt`), "gastric aspirate" the blood gas (`gas`) and "update bloods" the
  DAT (`dat`) — those three short forms are now `orderMatching.exact` entries, so they work only when typed alone.
* **The medicine lemma.** The matcher folds medicine/medicines/meds/medication into one lemma, so a two-word keyword
  such as "any medicine" is a wildcard on any medicine question. Keywords pair the lemma with a second content word
  ("medicines at home", "family medication", "given any medicine") and the household item excludes words about the
  baby ("given him") while the item about the baby excludes the household's and the mother's ("anyone at home", "mum
  take", 妈妈吃).
* **Run-together forms.** Phrases made of stop-words are written run together (`whatshappened`, `goingon`,
  `howmanyfits`, `whotakes`, `mumonany`, `isheonany`, `washegiven`, `howishedoing`…). Two were removed after probing
  because a run-together token can match the word it starts with: `afterall` matched every "after" (a shared prefix of
  five letters with three left over) and the alias `exchangeagain` every "exchange" (a prefix of six letters or more).
* **Phase twins.** `home-medicines` → `home-medicines-disclosed` and `given-anything` → `given-anything-disclosed` in
  phases 2–3; `presentation` → `status-followup` in the outcome phase. Dose and "why" words are excluded from both
  "given" items so "What dose was he given?" reaches `amount-given` and "Why was he given it?" reaches `reason-given`.
* **Overlaps fixed by exclusion.** Weight words out of `amount-given`; "how much" no longer excluded from `weight`;
  medicines out of `sick-contacts` and `family-history`; family words out of `jaundice-onset`; "make him sleepy" out of
  `responsiveness`; seizure-duration questions out of `seizure`.
* Keywords carry no answer content (no "clozapine" in any history keyword; the drug-level test has the alias
  "clozapine level" for ordering in phase 2).

## References

1. 黄雪美, 陈继昌, 韦拔, 蒋永江, 符婵, 谢玉泉. 换血疗法成功救治新生儿氯氮平中毒一例. 中华儿科杂志. 2013;51(5):392-393.
   doi:10.3760/cma.j.issn.0578-1310.2013.05.016. Available from: https://rs.yiigle.com/cmaid/33555
2. Kemper AR, Newman TB, Slaughter JL, et al. Clinical practice guideline revision: management of hyperbilirubinemia in
   the newborn infant 35 or more weeks of gestation. Pediatrics. 2022;150(3):e2022058859. doi:10.1542/peds.2022-058859
3. National Institute for Health and Care Excellence. Jaundice in newborn babies under 28 days. Clinical guideline
   CG98. London: NICE; 2010 [updated 2023 Oct 31].
4. National Institute for Health and Care Excellence. Fever in under 5s: assessment and initial management. NICE
   guideline NG143. London: NICE; 2019 [updated 2021 Nov 26].
5. National Institute for Health and Care Excellence. Neonatal infection: antibiotics for prevention and treatment.
   NICE guideline NG195. London: NICE; 2021 [updated 2026 May 13].
6. Austin Health Clinical Toxicology Service. Clozapine guideline. Melbourne: Austin Health; 2024 Aug. Available from:
   https://www.austin.org.au/Assets/Files/Clozapine%20Guideline_AUG%202024.pdf
7. Benson BE, Hoppu K, Troutman WG, et al. Position paper update: gastric lavage for gastrointestinal decontamination.
   Clin Toxicol (Phila). 2013;51(3):140-146. doi:10.3109/15563650.2013.770154
8. 全国人民代表大会常务委员会. 中华人民共和国未成年人保护法（2020年修订，2021年6月1日起施行）. / Standing Committee of the
   National People's Congress. Law of the People's Republic of China on the Protection of Minors (2020 revision, in
   force 1 June 2021).
9. Joint Committee on Infant Hearing. Year 2019 position statement: principles and guidelines for early hearing
   detection and intervention programs. J Early Hear Detect Interv. 2019;4(2):1-44. doi:10.15142/fptk-b748

These are `debrief.references` (the article and eight guidelines). Further sources cited by name and year in the case
text (in `provenance.review.guidelines` where they are guidance):

* Pressler RM, Abend NS, Auvin S, et al. Treatment of seizures in the neonate: guidelines and consensus-based
  recommendations — special report from the ILAE Task Force on Neonatal Seizures. Epilepsia. 2023;64(10):2550-2570.
  doi:10.1111/epi.17745
* Chyka PA, Seger D, Krenzelok EP, Vale JA; American Academy of Clinical Toxicology; European Association of Poisons
  Centres and Clinical Toxicologists. Position paper: single-dose activated charcoal. Clin Toxicol (Phila).
  2005;43(2):61-87. doi:10.1081/CLT-200051867 (the DOI the article's header prints; the cover page's 10.1081/CLT-51867
  also resolves).
* Hiemke C, Bergemann N, Clement HW, et al. Consensus guidelines for therapeutic drug monitoring in
  neuropsychopharmacology: update 2017. Pharmacopsychiatry. 2018;51(1-02):9-62.
* National Institute for Health and Care Excellence. Child maltreatment: when to suspect maltreatment in under 18s.
  Clinical guideline CG89. London: NICE; 2009.
* 最高人民检察院, 国家监察委员会, 教育部, 公安部, 民政部, 司法部, 国家卫生健康委员会, 共青团中央, 全国妇联.
  关于建立侵害未成年人案件强制报告制度的意见（试行）. 2020年5月7日.
* Clozapine. In: Drugs and Lactation Database (LactMed) [Internet]. Bethesda (MD): National Institute of Child Health
  and Human Development; 2006-. Last revision 2025 Jul 15. Available from: https://www.ncbi.nlm.nih.gov/books/NBK501650/
* McAllister-Williams RH, Baldwin DS, Cantwell R, et al. British Association for Psychopharmacology consensus guidance
  on the use of psychotropic medication preconception, in pregnancy and postpartum 2017. J Psychopharmacol.
  2017;31(5):519-552.
* Blackman G, Oloyede E. Clozapine discontinuation withdrawal symptoms in schizophrenia. Ther Adv Psychopharmacol.
  2021;11:20451253211032053. doi:10.1177/20451253211032053
* Ceftriaxone summary of product characteristics (EU), section 4.3: contraindicated in hyperbilirubinaemic newborns;
  not to be given with calcium-containing IV solutions in newborns.
* US prescribing information for clozapine (Clozaril): about 97 % bound to serum proteins.
* NICE NG240 (2024), the meningitis guideline, is not cited for this baby: it excludes babies up to and including 28
  days' corrected gestational age and refers them to NG195.
* NICE NG254 (2025), suspected sepsis in under 16s, to which NG195 sends babies with late-onset infection admitted from
  home: not cited in the case (see *To verify*).
* American Academy of Pediatrics. Red Book (HSV chapter, as summarised in secondary sources): aciclovir 60 mg/kg/day IV
  in three doses for neonatal HSV disease; HSV to be considered in neonates with fever, behaviour change or seizures.

### To verify

**In the source article (the source pass).**

* The full admission blood panel behind "no obvious abnormality": blood gas, electrolytes (which analytes: sodium,
  potassium, calcium, magnesium?), clotting and renal values with their reference ranges; whether a blood count,
  reticulocytes, blood groups, DAT or G6PD were done — the cause of the hyperbilirubinaemia.
* Oxygen saturation and any oxygen or ventilatory support after admission; the sedative given at the referring
  hospital, its dose and timing.
* The timeline: onset to referral; the time of the admission bilirubin; how soon the exchange was done; when the
  repeated questioning revealed the exposure; the sampling times of the four clozapine levels (whether 539.0 and
  197 µg/L were taken before discharge, as the case stages them); any pre-exchange level.
* Whether a second exchange transfusion was done (1.0.0: "the narrative is unclear about the timing"), and the
  post-exchange bilirubin values.
* Who made the admission and who gave the drug: 1.0.0's zh ("得知母亲使用氯氮平，并承认发病前曾给婴儿服药") reads as
  the mother admitting, its en is passive; the giver is not stated in either.
* The family's estimated clozapine dose, the formulation and route, when and why it was given; whether he was breastfed;
  the mother's diagnosis, dose and care.
* Which neurobehavioural scale gave the score of 37 (presumably the NBNA, scored out of 40) and the length and content of
  the follow-up.
* Whether antibiotics, aciclovir, phototherapy, a blood culture, a lumbar puncture, an EEG, an ECG or an MRI were done,
  and their results.
* Whether gastric lavage, enemas or other decontamination were used (1.0.0's feedback mentioned "historical measures"
  of induced vomiting or enemas without recording them).
* Which GCS scale was used in a newborn.
* The authors' discussion of the rebound and of the exchange's role, and whether any child-protection or social-work
  action is reported.

**In the guidance.** Read in the guidance's own text on 2026-11-14: ILAE 2023 (full text, UCL repository: phenobarbital
first-line "regardless of etiology", loading 20 mg/kg IV); AACT/EAPCCT 2005 (full text: charcoal "may be considered … up
to one hour"; "Unless a patient has an intact or protected airway, the administration of charcoal is contraindicated")
and 2013 (full text: lavage "should not be performed routinely, if at all"; contraindicated with an unprotected airway);
NICE CG89 1.2.6 (NICE's PDF: "Suspect child maltreatment in cases of poisoning in children if: there is a report of
deliberate administration of inappropriate substances, including prescribed and non-prescribed drugs … the child was
unable to access the substance independently …"); BAP 2017 (full text: "Breastfeeding while on clozapine is
contraindicated, owing to the risk of infant agranulocytosis and seizures"); JCIH 2019 Table 1 (journal table:
"Hyperbilirubinemia with exchange transfusion regardless of length of stay — by 9 months", for infants who pass the
screen) and the JCIH FAQ (2024: automated ABR "is the recommended screening technology for all infants receiving care in
an NICU"); the 2020 mandatory-reporting opinion (articles 2–4 as reproduced in the press: report to the police;
hospitals and clinics named). Could not be confirmed verbatim (publisher, NICE and NCBI pages refused automated access):

* AAP 2022: the urgent exchange for signs of intermediate or advanced acute bilirubin encephalopathy and its deferral
  only without those signs once the level is below the exchange threshold were read in Guideline Central's verbatim
  reproduction of the key action statements, not in the article; the intensive-phototherapy irradiance (≥ 30 µW/cm²/nm,
  about 460–490 nm) and the IVIG–necrotising enterocolitis association in secondary sources only; the threshold values
  for ≥ 40 weeks with neurotoxicity risk factors at ≥ 96 h are not quoted. Neither AAP 2022 nor NICE CG98 was found to
  say "start phototherapy before the bilirubin result": the case now teaches that as reasoning, without a guideline name.
* NICE CG98 (last updated 31 October 2023): the exchange recommendations (double-volume for clinical features of acute
  bilirubin encephalopathy; no single-volume exchange, albumin priming or routine IV calcium; phototherapy continued;
  bilirubin within 2 hours) and the 350/450 µmol/L lines at ≥ 96 h were seen in search extracts of NICE's pages.
* NICE NG143 (recommendations last updated 26 November 2021): "Give intravenous aciclovir to children with fever and
  symptoms and signs suggestive of herpes simplex encephalitis" and "Consider herpes simplex encephalitis" with focal
  signs, focal seizures or decreased consciousness, and the under-3-months regimen (a third-generation cephalosporin
  plus listeria cover), seen in search extracts; the case had said NG143 "advises considering" aciclovir and now says it
  gives it.
* NICE NG195 (2021, last updated 13 May 2026, which restructured and renumbered it): the lumbar-puncture advice from
  2024 (treat and stabilise an unprotected airway, respiratory compromise, shock, uncontrolled seizures and bleeding risk
  first; no LP with signs that may indicate raised intracranial pressure) was read in the UK Government Web Archive copy
  on 2026-11-13 and in search extracts on 2026-11-14 — confirm its current wording and numbers. NG195 sends babies with
  late-onset infection admitted from home to NICE NG254 (November 2025), whose recommendation 1.8.6 (seen in search
  extracts) uses ceftriaxone 50 mg/kg once daily for community-acquired sepsis in babies under 28 days and cefotaxime at
  40 weeks' corrected gestational age or less or with an IV calcium infusion; the extract did not name jaundice. The
  case keys cefotaxime because the EU ceftriaxone SmPC contraindicates ceftriaxone in hyperbilirubinaemic newborns: a
  neonatologist should confirm the regimen for a jaundiced 8-day-old transferred from another hospital.
* Austin Health clozapine guideline (2024): "Measurement of clozapine concentrations has no role in acute poisoning" and
  "Patients with significant CNS depression and an unprotected airway should be intubated" were confirmed in search
  extracts; the PDF refused automated access, and its enhanced-elimination section was not read. The case no longer
  credits it with saying that levels do not guide discharge.
* AGNP: the 2011 edition's own table gives clozapine 350–600 ng/mL with a laboratory alert level of 1000 ng/mL; the
  2017 update's values were seen in secondary sources only.
* LactMed's clozapine record (last revision 15 July 2025): other agents preferred, breastfeeding not contraindicated but
  advised against by some sources, and if it continues a watch for sedation and periodic infant white-cell counts —
  search extracts only (NCBI's browser check).
* The current US clozapine label's protein-binding figure (≈ 97 % in the labels found); the EU ceftriaxone SmPC
  section 4.3 wording.
* For a clinician: a neonatologist should confirm the three `critical` interventions (a sedative, gastric lavage,
  charcoal) and the two `critical: false` ones (an exchange before the bilirubin is read; a second exchange for the
  drug level), and whether giving phenobarbital with no recurrence (a conditional plan the case leaves unscored) should
  cost something.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* Four phases from the recorded course (admission → after the exchange → before discharge → outcome), forward-only,
  with gates that cannot strand a learner; 29 history items, 7 findings, 18 records (one test each), 18 interventions,
  6 objectives, 5 decisions, 12 rubric items with 3 act-based critical items scored inside time windows.
* Safety content added: infection cover with the LP deferred; cefotaxime not ceftriaxone; ABE escalation with
  phototherapy and exchange; decontamination harms; clozapine levels and redistribution; the statutory child-protection
  report; hearing and neurodevelopmental follow-up; feeding on clozapine.
* Spoilers removed: specialty `clinical-toxicology` → `neurology`; presentation-only title and summary; neutral record,
  objective and decision-requirement wording.
* Authoring language removed from everything the relative says; the companion named by relation.
* Survey template findings applied (see *Source and adaptation*).
* Guidance re-checked by web search on 2026-11-12 (see *To verify* for what is still open).
* Independent review 2026-11-13 (AI-assisted); fixes:
  * the lumbar puncture's guidance is NICE NG195 (2021, updated 2024), not NG240, which excludes babies up to 28 days
    (its "GCS 9 or less" does not apply to a newborn): learning outcome 1, decision 1, the LP's harm text, teaching
    point 1, the attending's brief and the references;
  * `critical` stated on the five high-risk contraindicable interventions (`sedation`, `gastric-lavage`,
    `activated-charcoal` true; `exchange-transfusion`, `repeat-exchange` false) — the strict lint warned five times
    and the contract failed — with the **Safety outcome** paragraph and the 安全结果 sentence;
  * aciclovir named in decision 1's key and near-miss, learning outcome 1 and teaching point 1 (NICE NG143), as the
    rubric and the reference path already required it;
  * a lumbar puncture while contraindicated now costs `rb-no-harm` (`valid: false`), which this guide had said the
    rubric could not express;
  * facts: "serum" removed from the clozapine levels (1.0.0: 血药浓度), the presenting answer no longer dates the poor
    feeding to after the fit, "a little froth" restored in the conclusion, the outcome record says the report "did
    not establish" a further dose (1.0.0: 没有再次摄入的证明), the later levels dated "after the rise";
  * "the mother's psychiatric team" became "the doctors who prescribe her clozapine" (her diagnosis and care are not
    recorded), and a wrong option no longer presupposes that he is sedated and ventilated;
  * guidance wording: AAP 2022's deferral clause, AACT/EAPCCT 2005 (charcoal mainly within the first hour, never with
    an unprotected airway), LactMed (revised July 2025; other agents preferred), the Austin guideline's unconfirmed
    version number removed, the neurobehavioural score no longer called reassuring, `rb-investigations` worded as
    it is scored (on admission);
  * matcher: the opening questions, the jaundice timing, the "given" wildcard and 23 canonical-question extra
    selections fixed; six regression utterances added (46).
* Review round 2 (2026-11-14, AI-assisted): every patient fact traced again to 1.0.0 in both languages, the cited
  guidance re-read in its own text where it could be reached, the assessment and order entry replayed. Fixes:
  * facts: the English conclusion said less than the Chinese (it dropped "when stimulated", "at times", "in all four
    limbs", "over the whole body", "before he fell ill", the indirect bilirubin and growth, and said the exchange
    "preceded the diagnosis") and is now its parallel; "no different from his peers" (outcome record, the relative's
    follow-up answer, teaching point 6, this guide) is now "not noticeably different" (1.0.0: 无明显差异); the
    boundaries no longer say the report gives no dose (it records a family estimate); "exchanged for bilirubin" is
    "partly for its bilirubin" (1.0.0: 因高胆红素血症等); the record names "Serum bilirubin and albumin" and "Serum
    electrolytes" (zh 血电解质) lost the specimen 1.0.0 does not give; the rise is taught as redistribution or
    continuing absorption (learning outcome 4, `rb-levels`, the repeat-exchange harm); the outcome record lost the
    authoring phrase "nothing is added"; "froth at his mouth after a seizure", "barely responsive", "he hardly
    responded when we called him", phase 2's "blood tests repeated after the exchange" and the broad question "Did he
    need any help to breathe…?" answered "No —" now say only what 1.0.0 records;
  * guidance: NICE NG143 *gives* IV aciclovir with signs suggesting herpes simplex encephalitis (the case said "advises
    considering"); NICE NG195 is cited as last updated in May 2026 (its LP advice dates from 2024); "start
    phototherapy before the result" is no longer credited to AAP 2022 or NICE CG98 (neither says it); AACT/EAPCCT 2005
    allows charcoal with an *intact or* protected airway; Austin Health 2024 is no longer credited with "levels do not
    guide discharge"; the OAE distractor cites JCIH's automated-ABR screen for NICU babies and its 9-month assessment;
  * assessment: order aliases that routed a CSF or urine culture to the blood culture (which the critical item needs), a
    urine drug screen to the clozapine levels, a crossmatch to the DAT, magnesium to the electrolyte summary, an
    abdominal X-ray to the chest film and "septic screen" to the clotting screen were removed or made exact;
  * matcher: the plain openers "When did it start?" and "有什么不舒服？" (the case-check failed on them) and the other
    gaps in *Matcher notes* fixed; eight regression utterances (54);
  * this guide: review status, *To verify* (now under *References*, with what was read in the guidance's own text),
    the measured scores (unchanged), the counts and the validation results.

### 1.0.0 — 2026-10-28

* Template version (three decisions, no interventions, a critical item met by a first-try decision).

## Validation

Run from the worktree root (2026-11-14, after the second review's fixes):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-33555/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33555 --lang en                                                 # 90 steps · objectives 6/6 · decisions 5/5 · utterances 54/54 · rubric 32/32 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-33555                                       # depth floor, plain openers, do-nothing 0, wrong-first < reference, patient voice
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33555:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33555:"  # in-world demonstration, en + zh-CN
```

Results on 2026-11-14: all five pass (validate 0/0; verify 100 % with 54/54 utterances; case-check PASS with do-nothing
0/29 and wrong-first 50 %; the contract test for `cmcr-33555:`; the demonstration in en and zh-CN). Before the second
review's fixes the case-check failed: the plain openers "When did it start?" and "有什么不舒服？" reached no history item.
The collection-wide "is not a template" test still fails on the template cases not yet re-authored; none of its shared
texts comes from this case.

## 中文摘要

**病例概要。** 41+3周剖宫产、出生时无需复苏、体重3.06 kg的8日龄男婴，入院前一天先烦躁、偶尔尖叫，随后发热（外院38.7℃）并抽搐1次（四肢发硬），外院镇静、吸氧后抽搐停止，但一直反应差、吃奶差。入院时体温37.5℃、心率150次/分、呼吸40次/分、血压68/45 mmHg；神志不清（记录GCS 8分），刺激后哭声尖，时有呻吟，有少量口沫，四肢肌张力增高，全身中重度黄染。总胆红素334.7 µmol/L（直接12.5、间接322.2），白蛋白35.9 g/L，血糖5.7 mmol/L，CRP<5 mg/L，超敏CRP<0.5 mg/L；血气、电解质、凝血、肾功能概述无明显异常；头颅超声未见明显异常，胸片报告新生儿肺炎。报告在明确暴露之前因高胆红素血症等行换血；经反复问诊得知母亲服用氯氮平，并承认发病前曾给患儿服药（量为家属推算）。换血后氯氮平血药浓度1777.1 µg/L，复查回升至1997.5 µg/L，此后降至539.0和197 µg/L；报告讨论了再分布和持续吸收。出院前神经行为评分37分，随访（时长未说明）生长发育与同龄儿无明显差异。是否再次换血记录不清。本版患者事实沿用1.0.0版，尚未对照原文全文核对；尚未经执业医师审核。

**学习目标。** ①发热、意识障碍新生儿第一个小时的处理：取血培养后立即用覆盖脑膜炎剂量的抗生素（黄疸新生儿用头孢噻肟，不用头孢曲松）并加用阿昔洛韦，气道、抽搐和出血风险稳定之前推迟腰穿（NICE NG143 2019、NG195 2026年更新）；②识别中晚期急性胆红素脑病体征，无论数值都强光疗加紧急换血（AAP 2022、NICE CG98），并判断数值与体征是否相称；③针对性、反复地追问家中用药和给孩子吃过的东西；④理解换血后氯氮平浓度回升（再分布，也可能有持续吸收），浓度不指导急性期处理（Austin Health 2024），不洗胃、不用活性炭（AACT/EAPCCT 2005、2013）；⑤照护者承认给药时当天转介儿童保护并依法强制报告（2020年修订《未成年人保护法》；NICE CG89）；⑥9月龄前完成含ABR的诊断性听力评估（JCIH 2019）和系统的神经发育随访，服用氯氮平期间一般不建议母乳喂养（BAP 2017；LactMed 2025）。

**关键决策。** 决策 1 第一个小时（同时覆盖感染（抗生素加阿昔洛韦）、胆红素脑病和未问清的用药史，推迟腰穿）；决策 2 胆红素（有脑病体征即紧急换血，同时继续找第二个原因）；决策 3 浓度回升（再分布，处理孩子而不是数字，不为清除药物再次换血）；决策 4 儿童保护（当天转介并依法报告，监督照护，联系给母亲开氯氮平的医生，不带指责）；决策 5 出院与随访（儿童保护计划落实后出院，ABR诊断性听力评估，神经发育随访）。三个关键项均为限时的处置：入院阶段取血培养后用抗生素；入院阶段强光疗并在读到胆红素后换血；住院期间完成儿童保护转介。

**复盘要点。** 胆红素数值不高、体征却很重，是寻找第二个病因的线索；第一次“说不上来”不等于“没有”；换血对蛋白结合率高、分布广的药物清除有限，浓度回升是预料之中的；报告标题把救治成功归功于换血，但一个同时接受多种治疗的病例证明不了这一点；照护者给新生儿服用处方药，不论动机都要当天启动儿童保护程序；出院后的听力和发育随访不能省。待核实：完整入院化验、各次浓度的采样时间、是否再次换血、给药剂量与原因、喂养方式、神经行为量表、随访时长（见 *To verify*）。

**安全结果。** `sedation`、`gastric-lavage` 和 `activated-charcoal` 标为 `critical: true`：给意识差、气道无保护的新生儿用镇静药，或在这样的气道下经胃管洗胃、给活性炭，任何一项都使安全结果判为不通过；`exchange-transfusion`（未看胆红素就换血）和 `repeat-exchange`（为追血药浓度再次换血）标为 `critical: false`：有害但通常可以挽回，显示伤害说明并失分，单独不会使安全结果不通过。
