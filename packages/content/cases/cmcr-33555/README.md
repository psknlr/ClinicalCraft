# cmcr-33555 — Fever and a seizure, then hard to rouse · 8-day-old boy

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title, summary,
> chief complaint, tags, triage note and specialty line name neither the cause nor the drug. The baby (谢知远 / Xie
> Zhiyuan) is a pseudonym; the case is a teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患儿为化名；本病例改编自已发表的病例报告，不构成医疗建议。

**Status of this version.** 1.1.0 is re-authored from the facts that version 1.0.0 recorded (STANDARD §6); the full
source article was not available, so **no patient fact has yet been checked against it**. Every patient fact below
traces to a statement of 1.0.0 (see the extraction table in *Clinical numbers check*); the teaching design follows
current guidance, checked by web search on 2026-11-12 where a threshold, dose or wording is quoted (see *To verify*
for what could not be confirmed).

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
| Review status | Editorial review 2026-10-30 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; facts not yet checked against the full article. Have a neonatologist and a paediatric safeguarding lead review it before teaching use |
| Content | 29 history items (12 unknown, 9 required; the relative answers) · 7 examination findings · 18 investigations (3 record reviews; 7 without a recorded result) · 18 interventions (4 always harmful, 3 conditionally contraindicated, 4 scored inside a time window) · 6 objectives · 5 decisions (20 options) · 12 rubric items (11 deterministic, weight 32; 1 examiner-judged; 3 critical) · 3 staff · 6 learning outcomes · 5 key reasoning steps · 6 teaching points · 40 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Run the first hour for a febrile, encephalopathic 8-day-old: airway and monitoring, glucose, a blood culture
   followed at once by IV antibiotics at meningitic doses (cefotaxime, not ceftriaxone, in a jaundiced newborn), and a
   lumbar puncture deferred while consciousness is markedly reduced (NICE NG143, 2019; NG240, 2024).
2. Recognise signs of intermediate or advanced acute bilirubin encephalopathy (a high-pitched cry, hypertonia) and
   escalate to intensive phototherapy and an urgent exchange transfusion even below the exchange threshold (AAP 2022;
   NICE CG98), while judging whether the level matches the severity of the signs.
3. Take a targeted, repeated exposure history in unexplained neonatal encephalopathy — every medicine in the
   household, the mother's own treatment, anything given to the baby — and keep a drug or toxin on the differential
   until it is excluded.
4. Interpret a rise in clozapine levels after an exchange as redistribution from a highly protein-bound,
   tissue-distributed drug, use levels to confirm exposure rather than to direct acute care (Austin Health 2024), and
   avoid gastric lavage and activated charcoal in an obtunded infant (AACT/EAPCCT 2005, 2013).
5. Act on the same day when a carer admits giving a newborn a prescription drug: a child-protection referral with the
   statutory report (China's 2020 revision of the Law on the Protection of Minors; NICE CG89, 2009), supervised care,
   and the mother's psychiatric team involved without blame.
6. Plan follow-up after exchange-level hyperbilirubinaemia — diagnostic audiology including auditory brainstem
   response by 9 months (JCIH 2019) and structured neurodevelopmental follow-up — and explain that breastfeeding is
   generally not advised while the mother takes clozapine (LactMed, revised 2022; BAP 2017).

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
measurement. Serum clozapine was **1777.1 µg/L after the exchange and 1997.5 µg/L on repeat**, later **539.0 and
197 µg/L**; the report discussed redistribution and continuing absorption, with no evidence of a further dose. After
several supportive measures (not itemised) his **pre-discharge neurobehavioural score was 37**, and follow-up of unstated
length described his growth and development as no different from his peers'. The record is unclear about whether, and
when, a second exchange was done. The article's title credits exchange transfusion with the rescue.

**Teaching answer today.** A febrile, encephalopathic 8-day-old gets a blood culture and IV antibiotics at meningitic
doses at once (cefotaxime with ampicillin or amoxicillin — not ceftriaxone in a jaundiced newborn), with the lumbar
puncture deferred while consciousness is this depressed (NICE NG143, 2019; NG240, 2024). A high-pitched cry and
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
| 1 | `first-hour` | presentation, onset, the fit, fever, the other hospital's treatment, birth, resuscitation and medicines at home asked; vital signs, consciousness, cry, tone, mouth and skin examined | protect the airway and monitor; glucose; blood culture and IV ampicillin with cefotaxime at meningitic doses at once, the LP deferred while he is this obtunded; bilirubin with albumin and intensive phototherapy now; ask again, specifically, about medicines at home | treat as kernicterus alone, holding culture and antibiotics unless the CRP rises (**anchoring on the jaundice**); **LP first, then antibiotics, phototherapy after the result** (the near-miss: right for a stable baby, unsafe here); sedate the screaming and observe until morning |
| 2 | `bilirubin-escalation` | decision 1; bilirubin with albumin read (admission) | keep intensive phototherapy going and do an urgent double-volume exchange for the signs of intermediate/advanced encephalopathy — and keep looking for a second cause, because 334.7 µmol/L is modest for signs this severe | **phototherapy and a repeat level: below the exchange line** (the near-miss: right without the signs); exchange and stop the infection work-up because bilirubin explains everything; IVIG and albumin instead of an exchange |
| 3 | `level-rebound` | decision 2; the second account (medicines, what was given, how much) asked; post-exchange levels read | redistribution (and possibly continuing absorption): treat the baby, not the number — airway, ECG, BP, temperature and seizure watch with toxicology advice — and no further exchange to clear the drug | **repeat the exchange after each rebound until below the adult alert level of 1000 µg/L** (the historical-looking choice; whether a second exchange was done is unclear in the record); the rise proves re-dosing — exclude the family and call the police; keep him sedated and ventilated until the level is in the adult therapeutic range, with charcoal |
| 4 | `safeguarding` | the second account (medicines and what was given) asked | same-day referral to the hospital safeguarding team and social work with the statutory report (China: the mandatory report to the police); supervised care with nothing unprescribed at the cot side; the mother's psychiatric team involved; her words recorded; no blame | **treat it as a well-meant mistake: advice, lock medicines away, discharge with an early review** (the near-miss); accuse the mother, bar her and leave it to the police, leaving out her psychiatric team; ask her to stop clozapine today so she can breastfeed, and refer only after a second exposure |
| 5 | `discharge-plan` | decision 2; later levels read; neurobehavioural assessment examined | discharge once the safeguarding plan is agreed; diagnostic audiology with ABR by 9 months, structured neurodevelopmental follow-up, MRI if signs persist; feeding agreed with the mother's team, breastfeeding generally not advised on clozapine | **an otoacoustic-emission screen and routine checks because the score of 37 is reassuring** (the near-miss); keep him in until the level is undetectable; home now with weekly blood counts for clozapine neutropenia and no follow-up |

Single best answer each, four options (20 in all), every option with its own 2–4-sentence feedback naming its guidance
(AAP 2022, NICE CG98, NG143, NG240, Austin Health 2024, AGNP 2017, AACT/EAPCCT 2005, NICE CG89, China's 2020 Law on
the Protection of Minors, LactMed 2022, BAP 2017, Blackman and Oloyede 2021, JCIH 2019). Option ids name content
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
| `rb-no-harm` | safety | 3 | none of: ceftriaxone, a sedative, gastric lavage, activated charcoal, a repeat exchange (`scoredWhen`: decision 1 or 3 attempted, or any of the five harms) |
| `rb-communication` | communication (examiner) | 1 | Calgary–Cambridge: what the relative knows and fears; plain explanation of antibiotics, the deferred LP and phototherapy; informed consent for the exchange; open, non-judgemental medicine questions asked again; an honest account of the safeguarding duty without blame or secrecy; no false reassurance; teach-back |

The three critical items are **acts** (a decision accompanies two of them, as in the pilot `cmcr-1653411`), one per
life-threatening domain of this case: infection in a febrile encephalopathic neonate, bilirubin encephalopathy, and a
deliberate drug exposure. Each act counts only inside its window (`indicatedWhen`), judged when it is given, so none can
be met in hindsight (after the post-exchange levels or the outcome record). `rb-no-harm` counts only once a harm was
possible, so doing nothing earns 0.

### How wrong choices score (measured 2026-11-12, engine replay)

| Path | Score | Critical items missed | Notes |
|---|---:|---|---|
| Reference `solution` | 32/32 (100 %) | — | no contraindicated action |
| Do nothing (start, finish refused) | 0/29 | all three | `rb-no-harm` not scored: no harm became possible |
| Wrong first answer at every decision, then right | 16/32 (50 %) | `rb-bilirubin-escalation`, `rb-safeguarding` | the five first-try items and two critical items lost |
| Antibiotics only after the exchange | 28/32 (88 %) | `rb-sepsis-cover-in-time` | outside the window (neutral) |
| Antibiotics before the blood culture, not repeated | 28/32 (88 %) | `rb-sepsis-cover-in-time` | the window needs the culture first |
| No blood culture at all | 28/32 (88 %) | `rb-sepsis-cover-in-time` | cannot finish until a culture is ordered (objective 3) |
| Phototherapy only after the exchange | 28/32 (88 %) | `rb-bilirubin-escalation` | outside the window |
| Exchange before the bilirubin result | 28/32 (88 %) | `rb-bilirubin-escalation` | safety event with harm text; `maxDoses: 1`, so it cannot be redone in the window |
| Decision 2 "phototherapy and repeat the level" first | 28/32 (88 %) | `rb-bilirubin-escalation` | the first-try part of the item |
| Safeguarding referral only after the outcome opens | 28/32 (88 %) | `rb-safeguarding` | outside the window (neutral) |
| Decision 4 "advice and discharge" first | 28/32 (88 %) | `rb-safeguarding` | the first-try part of the item |
| Ceftriaxone given as well | 29/32 (91 %) | — | safety event with harm text; `rb-no-harm` lost |
| Gastric lavage and charcoal after the disclosure | 29/32 (91 %) | — | two safety events; `rb-no-harm` lost |
| Repeat exchange for the level | 29/32 (91 %) | — | safety event (contraindicated once the post-exchange levels are read) |
| Sedative in the first hour | 29/32 (91 %) | — | safety event; `rb-no-harm` lost |
| Lumbar puncture in the first hour | 32/32 (100 %) | — | safety event with harm text only (`contraindicatedWhen: {phase: admission}`): the rubric cannot express "not before stabilisation"; named in the debrief |
| The report's recorded steps only (exchange; correct decisions) | 14/32 (44 %) | all three | no culture, antibiotics, phototherapy, referral or follow-up recorded; cannot finish until they are done |

Contraindicated actions are named in the debrief but, as everywhere in the library, do not lower the score by
themselves; the harms that matter most are scored through `rb-no-harm` and the windows of the critical items.

## Reference path (`solution`)

90 steps: start → 23 admission-phase history items (10 of them unknown) → vital signs, consciousness, cry, tone,
mouth, skin → decision 1 → airway care → monitoring → IV access → glucose (5.7 mmol/L) → blood culture → antibiotics →
aciclovir → intensive phototherapy → fluids and nutrition → EEG → bilirubin with albumin (334.7 µmol/L) → blood gas,
electrolytes, renal function, clotting, CRP → blood count, blood groups with DAT, G6PD (no result recorded) → cranial
ultrasound and chest film reports → decision 2 → exchange transfusion (phase 2 opens) → the relative's second account
(medicines, what was given, the amount, why — unknown, the mother's illness — unknown) → post-exchange drug levels →
ECG → decision 3 → safeguarding referral → conversation with the mother and her doctors → decision 4 (phase 3) → later
drug levels → neurobehavioural assessment → follow-up plan → decision 5 (phase 4) → the outcome record → the relative's
follow-up account → finish. `cases verify`: objectives 6/6, decisions 5/5, utterances 40/40, rubric 32/32. The
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
* Clozapine (µg/L = ng/mL): 1777.1 → 1997.5 µg/L after the exchange, a rise of 220.4 µg/L (+12.4 %), both ≈ 1.8–2.0 ×
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
   * "The article's title credits the exchange with the rescue. What can one case, exchanged for bilirubin and given
     several other treatments, show?"
4. **Summary** — "Name the three acts you would not delay in a febrile, jaundiced, encephalopathic 8-day-old, and the
   two follow-up appointments he needs."

### Common learner errors and how the case surfaces them

* **Anchoring on the jaundice** — decision 1 `bilirubin-only` and decision 2 `bilirubin-explains-all`; the attending
  asks whether the level matches the signs; the mismatch is the case's hinge.
* **LP before antibiotics in an obtunded baby** — decision 1 `lp-first`; the LP is contraindicated in the admission
  phase with NICE NG240 harm text.
* **Waiting for a number before phototherapy, or exchanging without one** — the phototherapy window is the admission
  phase; the exchange is contraindicated until the bilirubin is read (`maxDoses: 1`).
* **Ceftriaxone in a jaundiced newborn** — a trap intervention with its SmPC contraindication; the antibiotics item's
  dose text says why.
* **Accepting "I can't say" as "no"** — the second account is only reachable by asking again in phase 2; decision 3
  and objective 5 need it.
* **Chasing the level** — decision 3 `repeat-exchange-level` and `levels-guide-care`; the repeat exchange is
  contraindicated once the levels are read.
* **Decontamination reflexes** — gastric lavage and charcoal are always harmful here (AACT/EAPCCT 2013, 2005).
* **Treating the admission as a teaching moment only** — decision 4 `advice-discharge`; the critical item needs the
  referral inside phases 2–3.
* **Punishing or medicating the mother** — decision 4 `exclude-mother-police` and `stop-clozapine-breastfeed`.
* **A reassuring score ends follow-up** — decision 5 `oae-routine` (emissions can be normal in bilirubin auditory
  neuropathy; JCIH 2019).

### Teaching points (debrief)

1. The first hour: cultures and antibiotics now, LP when safe, cefotaxime not ceftriaxone (NICE NG143 2019, NG240
   2024; EU ceftriaxone SmPC).
2. Bilirubin encephalopathy: urgent exchange for the signs (AAP 2022; NICE CG98) — and the modest level as a clue.
3. The medicine history asked specifically and more than once; poisoning as an alerting feature of maltreatment (NICE
   CG89, 2009).
4. Clozapine and its removal: protein binding, redistribution, levels that do not direct care (Austin Health 2024),
   adult references (AGNP 2017), no decontamination (AACT/EAPCCT 2005, 2013); what the article's title can and cannot
   claim.
5. Safeguarding the same day: China's 2020 Law on the Protection of Minors and the 2020 mandatory-reporting opinion;
   supervised care; the mother's team; no abrupt stop of clozapine (Blackman and Oloyede, 2021).
6. Follow-up: diagnostic audiology by 9 months (JCIH 2019), structured neurodevelopment, feeding on clozapine (LactMed
   2022; BAP 2017).

## Embodied mode

* **Where things are (`general-hospital`).** The baby lies in an ICU bed (`setting: icu`) and is never moved in the
  reference path. History and examination happen at the cot side; the relative answers (`patient.nonVerbalWhen:
  {always: true}`, reason "an 8-day-old newborn, barely responsive; his relative answers for him"), and the opening
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
* "并承认发病前曾给婴儿服药" names no subject for the admission in 1.0.0's English ("an admission that the infant had
  been given the drug"); the case says "his mother has admitted that he was given clozapine" and leaves open who gave it.
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

* 40 `extensions.testUtterances` (20 zh-CN, 20 en; 2 look-alike negatives; 2 with `alsoOk: ["fever"]` because the
  question names the fever: "Which came first, the screaming or the temperature?"). None equals a canonical question or
  a keyword; every required item has a paraphrase; `cases verify` 40/40 with no extra selections. Every canonical
  question selects its own item alone in every phase where it is offered (probed 2026-11-12).
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
   guideline NG143. London: NICE; 2019.
5. National Institute for Health and Care Excellence. Meningitis (bacterial) and meningococcal disease: recognition,
   diagnosis and management. NICE guideline NG240. London: NICE; 2024.
6. Austin Health Clinical Toxicology Service. Clozapine guideline. Version 3. Melbourne: Austin Health; 2024 Aug.
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
  2005;43(2):61-87. (DOI not given: two variants seen, see *To verify*.)
* Hiemke C, Bergemann N, Clement HW, et al. Consensus guidelines for therapeutic drug monitoring in
  neuropsychopharmacology: update 2017. Pharmacopsychiatry. 2018;51(1-02):9-62.
* National Institute for Health and Care Excellence. Child maltreatment: when to suspect maltreatment in under 18s.
  Clinical guideline CG89. London: NICE; 2009.
* 最高人民检察院, 国家监察委员会, 教育部, 公安部, 民政部, 司法部, 国家卫生健康委员会, 共青团中央, 全国妇联.
  关于建立侵害未成年人案件强制报告制度的意见（试行）. 2020年5月7日.
* Clozapine. In: Drugs and Lactation Database (LactMed) [Internet]. Bethesda (MD): National Institute of Child Health
  and Human Development; 2006-. Revised 2022 May. Available from: https://www.ncbi.nlm.nih.gov/books/NBK501650/
* McAllister-Williams RH, Baldwin DS, Cantwell R, et al. British Association for Psychopharmacology consensus guidance
  on the use of psychotropic medication preconception, in pregnancy and postpartum 2017. J Psychopharmacol.
  2017;31(5):519-552.
* Blackman G, Oloyede E. Clozapine discontinuation withdrawal symptoms in schizophrenia. Ther Adv Psychopharmacol.
  2021;11:20451253211032053. doi:10.1177/20451253211032053
* Ceftriaxone summary of product characteristics (EU), section 4.3: contraindicated in hyperbilirubinaemic newborns;
  not to be given with calcium-containing IV solutions in newborns.
* US prescribing information for clozapine (Clozaril): about 97 % bound to serum proteins.
* American Academy of Pediatrics. Red Book (HSV chapter, as summarised in secondary sources): aciclovir 60 mg/kg/day IV
  in three doses for neonatal HSV disease; HSV to be considered in neonates with fever, behaviour change or seizures.

## To verify

**In the source article (the source pass).**

* The full admission blood panel behind "no obvious abnormality": blood gas, electrolytes (calcium, sodium), clotting
  and renal values with their reference ranges; whether a blood count, reticulocytes, blood groups, DAT or G6PD were
  done — the cause of the hyperbilirubinaemia.
* Oxygen saturation and any oxygen or ventilatory support after admission; the sedative given at the referring
  hospital, its dose and timing.
* The timeline: onset to referral; the time of the admission bilirubin; how soon the exchange was done; when the
  repeated questioning revealed the exposure; the sampling times of the four clozapine levels; any pre-exchange level.
* Whether a second exchange transfusion was done (1.0.0: "the narrative is unclear about the timing"), and the
  post-exchange bilirubin values.
* The family's estimated clozapine dose, the formulation and route, when and why it was given, and by whom; whether he
  was breastfed; the mother's diagnosis, dose and care.
* Which neurobehavioural scale gave the score of 37 (presumably the NBNA, scored out of 40) and the length and content of
  the follow-up.
* Whether antibiotics, aciclovir, phototherapy, a blood culture, a lumbar puncture, an EEG, an ECG or an MRI were done,
  and their results.
* Whether gastric lavage, enemas or other decontamination were used (1.0.0's feedback mentioned "historical measures"
  of induced vomiting or enemas without recording them).
* Which GCS scale was used in a newborn.
* The authors' discussion of the rebound and of the exchange's role, and whether any child-protection or social-work
  action is reported.

**In the guidance (could not be confirmed verbatim in this session).**

* AAP 2022 phototherapy, escalation-of-care and exchange threshold values for ≥ 40 weeks with neurotoxicity risk
  factors at ≥ 96 h (not quoted in the case).
* The Chinese guideline 中华医学会儿科学分会新生儿学组, 中华儿科杂志编辑委员会. 新生儿高胆红素血症诊治指南（2025）.
  中华儿科杂志. 2025;63(4):338-350 — its exchange criteria for signs of acute bilirubin encephalopathy and its DOI
  (10.3760/cma.j.cn112140-20241231-00944 seen only in reference lists); it replaced the 2014 consensus. Not cited in
  the case text until checked.
* NICE NG240 (2024): the wording "GCS 9 or less" for deferring lumbar puncture was confirmed only in a secondary
  reproduction of the guideline.
* NICE CG89: the exact wording of the poisoning recommendation (the case says only that it lists poisoning among the
  alerting features).
* Austin Health clozapine guideline (2024): "Measurement of clozapine concentrations has no role in acute poisoning" and
  "Patients with significant CNS depression and an unprotected airway should be intubated" were confirmed in search
  extracts; the PDF could not be opened (network policy), and its enhanced-elimination section was not read.
* The current US clozapine label's protein-binding figure (≈ 97 % in the labels found).
* The DOI of the 2005 single-dose activated charcoal position paper (10.1081/CLT-200051867 or 10.1081/CLT-51867).
* AGNP 2017 values (350–600 ng/mL; alert 1000 ng/mL) were confirmed in secondary summaries only.
* JCIH 2019's risk indicator "hyperbilirubinemia with exchange transfusion regardless of length of stay", with
  diagnostic assessment by 9 months, was confirmed in state programmes' reproductions of the table.
* NICE NG143's current antibiotic wording (a third-generation cephalosporin plus listeria cover under 3 months).

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

### 1.0.0 — 2026-10-28

* Template version (three decisions, no interventions, a critical item met by a first-try decision).

## Validation

Run from the worktree root (2026-11-12):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-33555/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-33555 --lang en                                                 # 90 steps · objectives 6/6 · decisions 5/5 · utterances 40/40 · rubric 32/32 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-33555                       # depth floor, do-nothing 0, wrong-first < reference, patient voice
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-33555:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-33555:"  # in-world demonstration, en + zh-CN
```

Results on 2026-11-12: all five pass (validate 0/0; verify 100 %; case-check PASS with do-nothing 0 and wrong-first
50 %; the contract test for `cmcr-33555:`; the demonstration in en and zh-CN at the clinical-mode score). The
collection-wide "is not a template" test still fails on the template cases not yet re-authored; none of its shared texts
comes from this case.

## 中文摘要

**病例概要。** 41+3周剖宫产、出生时无需复苏、体重3.06 kg的8日龄男婴，入院前一天先烦躁、偶尔尖叫，随后发热（外院38.7℃）并抽搐1次（四肢发硬），外院镇静、吸氧后抽搐停止，但一直反应差、吃奶差。入院时体温37.5℃、心率150次/分、呼吸40次/分、血压68/45 mmHg；神志不清（记录GCS 8分），刺激后哭声尖，时有呻吟，有少量口沫，四肢肌张力增高，全身中重度黄染。总胆红素334.7 µmol/L（直接12.5、间接322.2），白蛋白35.9 g/L，血糖5.7 mmol/L，CRP<5 mg/L，超敏CRP<0.5 mg/L；血气、电解质、凝血、肾功能概述无明显异常；头颅超声未见明显异常，胸片报告新生儿肺炎。报告在明确暴露之前因高胆红素血症等行换血；经反复问诊得知母亲服用氯氮平，并承认发病前曾给患儿服药（量为家属推算）。换血后血清氯氮平1777.1 µg/L，复查回升至1997.5 µg/L，此后降至539.0和197 µg/L；报告讨论了再分布和持续吸收。出院前神经行为评分37分，随访（时长未说明）生长发育与同龄儿无明显差异。是否再次换血记录不清。本版患者事实沿用1.0.0版，尚未对照原文全文核对；尚未经执业医师审核。

**学习目标。** ①发热、意识障碍新生儿第一个小时的处理：取血培养后立即用覆盖脑膜炎剂量的抗生素（黄疸新生儿用头孢噻肟，不用头孢曲松），意识明显下降时推迟腰穿（NICE NG143 2019、NG240 2024）；②识别中晚期急性胆红素脑病体征，无论数值都强光疗加紧急换血（AAP 2022、NICE CG98），并判断数值与体征是否相称；③针对性、反复地追问家中用药和给孩子吃过的东西；④理解换血后氯氮平浓度回升（再分布），浓度不指导急性期处理（Austin Health 2024），不洗胃、不用活性炭（AACT/EAPCCT 2005、2013）；⑤照护者承认给药时当天转介儿童保护并依法强制报告（2020年修订《未成年人保护法》；NICE CG89）；⑥9月龄前完成含ABR的诊断性听力评估（JCIH 2019）和系统的神经发育随访，服用氯氮平期间一般不建议母乳喂养（LactMed 2022；BAP 2017）。

**关键决策。** 决策 1 第一个小时（同时覆盖感染、胆红素脑病和未问清的用药史，推迟腰穿）；决策 2 胆红素（有脑病体征即紧急换血，同时继续找第二个原因）；决策 3 浓度回升（再分布，处理孩子而不是数字，不为清除药物再次换血）；决策 4 儿童保护（当天转介并依法报告，监督照护，联系母亲的精神科团队，不带指责）；决策 5 出院与随访（儿童保护计划落实后出院，ABR诊断性听力评估，神经发育随访）。三个关键项均为限时的处置：入院阶段取血培养后用抗生素；入院阶段强光疗并在读到胆红素后换血；住院期间完成儿童保护转介。

**复盘要点。** 胆红素数值不高、体征却很重，是寻找第二个病因的线索；第一次“说不上来”不等于“没有”；换血对蛋白结合率高、分布广的药物清除有限，浓度回升是预料之中的；报告标题把救治成功归功于换血，但一个同时接受多种治疗的病例证明不了这一点；照护者给新生儿服用处方药，不论动机都要当天启动儿童保护程序；出院后的听力和发育随访不能省。待核实：完整入院化验、各次浓度的采样时间、是否再次换血、给药剂量与原因、喂养方式、神经行为量表、随访时长（见 *To verify*）。
