# cmcr-44848 — Poor feeding and recurrent convulsions · 38-hour-old boy

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name neither the cause nor the mother's medicines. The baby
> (施清和 / Shi Qinghe) is a pseudonym; the case is a teaching adaptation of a published case report, not medical
> advice.
> 导师指南，含剧透。患儿为化名；本病例改编自已发表的病例报告，不构成医疗建议。

**Status of this version.** 1.1.0 is re-authored from the facts that version 1.0.0 recorded (STANDARD §6); the full
source article was not available, so **no patient fact has yet been checked against it**. Every patient fact below
traces to a statement of 1.0.0 (see the extraction table in *Clinical numbers check*); the teaching design follows
current guidance. An independent review of 1.1.0 (2026-10-30) has been applied (see *Source and adaptation*).

## Case card

| | |
|---|---|
| Case | `cmcr-44848` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 朱明哲. 氯氮平及氟哌啶醇致新生儿撤药综合征一例. 中华儿科杂志. 2011;49(10):796-797 (DOI verified in the source map, 2026-10-29) |
| Setting / facility | Neonatal care in the ICU (`icu`) / `general-hospital`, ICU bed 1 |
| Difficulty / time | 4 / 5; about 40 min (static clock; four phases, five decisions, 15 interventions) |
| Specialty | Neonatology, neurology (1.0.0's `pharmacology` dropped: it pointed at the answer) |
| Languages | zh-CN (source language), en |
| Learner level | Paediatric and neonatal trainees, final-year students, neonatal nurses (the communication item) |
| Review status | Editorial review 2026-10-30 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; facts not yet checked against the full article. Have a neonatologist review it before teaching use |
| Content | 24 history items (8 unknown, 7 required; the relative answers) · 6 examination findings · 17 investigations (9 record reviews; 7 without a recorded result) · 15 interventions (4 always harmful, 3 conditionally contraindicated, 2 with a scored time window) · 6 objectives · 5 decisions (21 options) · 12 rubric items (11 deterministic, weight 29; 1 examiner-judged; 2 critical) · 3 staff · 6 learning outcomes · 6 key reasoning steps · 6 teaching points · 40 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Distinguish neonatal seizures from jitteriness at the bedside and confirm suspected seizures with EEG
   (conventional or amplitude-integrated), as the ILAE 2021 neonatal classification requires.
2. Complete the first-hour evaluation of a newborn with seizures — an immediate glucose, electrolytes with calcium
   and magnesium, blood count, clotting, CRP and blood culture — start IV antibiotics covering meningitis straight
   after the culture, and do the lumbar puncture once it is safe, with the platelet count and clotting known (NICE
   NG195, 2021; lumbar-puncture recommendations added 2024).
3. Use IV phenobarbital (20 mg/kg loading dose) as the first-line antiseizure medication per ILAE 2023, name the
   second-line options, and stop it before discharge once acute provoked seizures have ceased without evidence of
   neonatal-onset epilepsy.
4. Take a complete maternal medication history (drug, indication, dose, last dose, monitoring), relate
   late-pregnancy antipsychotic exposure to the neonatal extrapyramidal and withdrawal signs in the FDA 2011
   warning, and attribute seizures to the exposure only after treatable causes are excluded.
5. Interpret an early total bilirubin of 199.6 µmol/L by the age in hours at sampling, gestation and neurotoxicity
   risk factors (AAP 2022), and name what is still missing (the sampling hour, the conjugated fraction, blood group
   and direct antiglobulin test).
6. Counsel the family without blame: the mother's antipsychotics are not stopped abruptly but reviewed in a planned
   way with psychiatry and a pharmacist (BAP 2017), breastfeeding is generally not advised on clozapine (LactMed),
   and neurodevelopmental follow-up is arranged.

These are `learningOutcomes` in `case.json`; they name the exposure, so front-ends show them before play only behind
the closed **Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief.

## Clinical summary (spoilers)

A boy born at 39 weeks by vaginal delivery (no prelabour rupture of membranes, clear liquor, Apgar 10 at 1 and
5 minutes; recorded weight 3.5 kg) has fed poorly since birth, with weak sucking and swallowing; he is formula-fed.
At about 30 and 35 hours of age he has two episodes of **staring, jerking of all four limbs and lip cyanosis**, each
1–2 minutes and self-limiting, and he vomits once; there is no fever. At the examination (he is 38 hours old) he is
**irritable, with slightly increased tone and weak suck and Moro reflexes**; the anterior fontanelle is flat and his
breathing steady; he has **jaundice of the face and trunk, scattered pinpoint petechiae on the chest and limbs and
mild pitting oedema of the lower legs**.

His mother has a psychiatric illness (diagnosis not recorded) and took **clozapine and haloperidol throughout
pregnancy, the last dose about 5 hours before delivery**, without regular drug-level monitoring (doses not recorded).

Glucose 3.2 mmol/L; sodium 139, potassium 4.2, calcium 2.21, magnesium 1.01 mmol/L; CRP < 1 mg/L; platelets
306×10^9/L; total bilirubin 199.6 µmol/L. CSF clear, white cells 2×10^6/L, glucose 2.2 mmol/L; TORCH IgM negative;
cranial and major-organ ultrasound without obvious abnormality. No EEG, neonatal drug levels, blood culture, clotting
or MRI result is recorded.

**The report's course.** Phenobarbital controlled the convulsions, with nutritional support and jaundice treatment
(doses and forms not recorded); no further convulsions; the drug was withdrawn gradually; 10 days in hospital;
telephone follow-up to two months reported no abnormality.

**Diagnosis (the report's).** Neonatal withdrawal syndrome attributed to late-pregnancy clozapine and haloperidol
exposure — in 1.0.0's words, considered, with the mechanism not established. The case teaches it as a **diagnosis of
exclusion**: the reversible causes are largely excluded, but without EEG, culture, drug levels or MRI the attribution
(and the distinction between residual drug effect and withdrawal) remains unproven.

**The safety point the first hour turns on.** He has petechiae of unknown cause and, at admission, an unknown
platelet count, clotting and vitamin K status, a few hours after two seizures. The culture and the antibiotics (with
meningitic cover) cannot wait; the lumbar puncture can, and should, until the platelet count is back and clotting has
been checked (NICE NG195's lumbar-puncture recommendations, added 2024).

## Scenario timeline and physiology

Static clock and no physiology model (the CMCR contract). Every phase is forward-only (`learnerSwitchable: false`);
the phase descriptions tell the learner which decisions move time on.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | 38 hours old | start | the relative's history; the admission examination; bedside glucose (3.2 mmol/L); blood culture, clotting screen and EEG (no result recorded); decisions 1 (`first-hour`) and 2 (`antiseizure`); the first-hour interventions — the **only window** in which the antibiotics count as given in time (after a culture ordered in this phase) |
| `first-results` | first bloods back (hour not recorded) | decisions 1 and 2 answered | electrolytes, CRP, blood count, bilirubin (record reviews of the bloods taken at cannulation); the **lumbar puncture's window**: indicated only here, once the blood count (platelets) has been read; decision 3 (`skin-findings`), which waits for all four reports |
| `csf-imaging` | CSF and imaging reports back (dates not recorded) | decisions 1–3 answered | CSF, TORCH IgM, cranial and major-organ ultrasound; decisions 4 (`cause`) and 5 (`family-plan`) |
| `followup` | to 2 months after discharge | all five decisions answered | the report's treatment, course, discharge and telephone follow-up; the relative's follow-up account |

Staged results: each later report has an `available: false` entry in the earlier phases ("no result yet at this
stage"), so a learner who asks early learns that it is pending rather than "nothing will come back". Because such a
placeholder would satisfy a phase-free `read`, every gate on a staged record names its phase (decision 4 reads the
first-results electrolytes and CRP, the calcium trap fires only on the first-results calcium, the objectives read
their own phase's reports). Decision 3 waits for all four first-results reports, so that phase cannot be left with
the electrolytes or CRP unread (the web shows no phase selector for these one-way phases). The admission examination
is offered in the first three phases, labelled "Admission examination", so a learner can revisit it; it was taken
after both episodes (38 hours), and no later examination is recorded.

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-history` — Take the history from his relative (presentation, feeding, episodes and their timing, birth, the
   mother's medicines and last dose).
2. `obj-examine` — Examine him at the cot side (tone and reflexes, fontanelle, skin colour, petechiae, oedema).
3. `obj-first-hour` — The first hour (decisions 1–2; glucose, blood culture, antibiotics, phenobarbital, EEG).
4. `obj-first-results` — Interpret the first results (the four reports read in that phase; the lumbar puncture;
   decision 3).
5. `obj-cause-plan` — Weigh the cause and agree the plan with the family (CSF and cranial ultrasound read in their
   phase; decisions 4–5; review of the mother's medicines).
6. `obj-outcome` — Review the reported course (the follow-up record).

Titles and hints name no cause, no test result and no keyed act; hints are open questions ("What could these
episodes be, and which causes must you not miss in the first hour?") and contain no option text (`cases validate`
checks it). No objective holds a time window: a learner who gives the antibiotics or does the LP late loses the
critical item but can still finish.

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `first-hour` | the episodes, their timing, birth, feeding, the mother's medicines and last dose asked; tone, reflexes and petechiae examined | probable seizures: glucose now, monitoring, electrolytes with Ca/Mg, blood count, clotting, CRP and culture; IV antibiotics covering meningitis straight after the culture; the LP once platelets and clotting allow; EEG | antipsychotic withdrawal explains it — observe on a withdrawal score, defer LP and antibiotics (**anchoring on the report's own conclusion**); jitteriness; load phenobarbital first and investigate later; **LP first, antibiotics once the CSF is taken** (the near-miss: right for a baby without a bleeding sign, unsafe here) |
| 2 | `antiseizure` | decision 1 and the glucose (admission) | IV phenobarbital 20 mg/kg first-line, cardiorespiratory monitoring and airway support, EEG monitoring, a further dose or a second-line drug | repeated IV diazepam pushes; levetiracetam first-line (a near-miss: second-line in ILAE 2023, inferior in NEOLEV2); oral morphine to a withdrawal score (the opioid-withdrawal pathway) |
| 3 | `skin-findings` | the four first-results reports read; skin and legs examined | plot the bilirubin by the age in hours at sampling, gestation and risk factors, repeat it, treat only at the line; vitamin K and clotting for the petechiae; albumin, fluid balance, heart and kidneys for the oedema | exchange now; physiological jaundice judged by eye, with "pressure-mark" petechiae and "common" oedema; platelets and IVIG |
| 4 | `cause` | the admission glucose, the first-results electrolytes and CRP, and the CSF, TORCH and both ultrasound reports read | late-pregnancy clozapine/haloperidol maladaptation or withdrawal leads, as a diagnosis of exclusion; culture, EEG and MRI still matter; drug effect cannot be told from withdrawal without levels | "clozapine withdrawal proven — stop antibiotics, no EEG or MRI" (the report's attribution made certain); a KCNQ2-type channelopathy — switch to a sodium-channel blocker now (a near-miss: ILAE 2023 does favour one when a channelopathy is suspected, but nothing points to it yet); bacterial meningitis because of a "low" CSF glucose |
| 5 | `family-plan` | decision 4 and the feeding history | no abrupt change to the mother's treatment (psychiatrist and pharmacist plan any change); breastfeeding generally not advised on clozapine, formula with support for closeness; explain the uncertainty without blame; developmental follow-up | stop the clozapine now, keep the haloperidol and let psychiatry review later (an abrupt stop dressed as a compromise); keep both drugs and breastfeed with sedation and white-cell monitoring (LactMed describes the monitoring but prefers not to breastfeed on clozapine); a "routine" safeguarding referral for any mother with a severe mental illness |

Single best answer each, 4–5 options (21 in all), every option with its own 2–4-sentence feedback naming its
guidance. Option ids name content (`seizure-workup`, `lp-before-antibiotics`, `channelopathy-switch`…), never
correctness. No length cue: no key is the longest option of its decision in either language (key ÷ mean distractor
length 0.99–1.14), and every decision has at least one near-miss distractor in the key's register.

### Rubric (11 deterministic items, weight 29, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 3 | presentation, feeding, episodes, timing, fever, birth, Apgar, the mother's medicines, last dose and other substances asked |
| `rb-examination` | examination | 2 | tone/reflexes, fontanelle, jaundice, petechiae, oedema examined |
| `rb-approach` | diagnosis | 3 | decision 1 right first time |
| `rb-workup-in-time` | **safety · critical** | 4 | glucose and blood culture ordered **in the admission phase**; antibiotics given **in the admission phase after that culture**; the lumbar puncture done **in the first-results phase after the blood count was read** (both `{"intervened": …, "whenIndicated": true}`) |
| `rb-antiseizure` | management | 3 | decision 2 right first time |
| `rb-care-acts` | management | 2 | phenobarbital load, EEG, cardiorespiratory monitoring, clotting screen, nutrition, vitamin K check, review of the mother's medicines |
| `rb-results` | investigations | 2 | electrolytes, CRP, blood count, bilirubin read (first results); CSF and cranial ultrasound read (CSF and imaging) |
| `rb-skin` | management | 2 | decision 3 right first time |
| `rb-cause` | diagnosis | 3 | decision 4 right first time |
| `rb-family` | management | 2 | decision 5 right first time |
| `rb-no-harm` | **safety · critical** | 3 | none of: diazepam push, oral morphine, advising the mother to stop her medicines, encouraging breastfeeding on clozapine (`scoredWhen`: decision 2 or 5 attempted, phenobarbital given, or any of the four harms) |
| `rb-communication` | communication (examiner) | 1 | Calgary–Cambridge: what the family knows and fears, plain explanation of the work-up, the exposure as an inference that is nobody's fault, no abrupt stop of her medicines, no false reassurance, teach-back |

Both critical items are **acts**. `rb-workup-in-time` counts an intervention only if it was given while its
`indicatedWhen` (its time window) held and its `contraindicatedWhen` did not, judged at the moment it was given: the
antibiotics' window is the admission phase after a culture ordered there; the lumbar puncture's is the first-results
phase after the blood count was read. Antibiotics or an LP given after the CSF, imaging or outcome records therefore
earn nothing; an LP before the platelet count is a contraindicated act with a harm text and cannot be repeated
(`maxDoses: 1`). The glucose and the culture are phase-gated orders. `rb-no-harm` counts only once a harm was
possible, so doing nothing earns 0.

### How wrong choices score (measured 2026-10-30, engine replay)

| Path | Score | Critical items missed | Notes |
|---|---:|---|---|
| Reference `solution` | 29/29 (100 %) | — | no contraindicated action |
| Do nothing (start, finish refused) | 0/26 | `rb-workup-in-time` | `rb-no-harm` not scored: no harm became possible |
| Wrong first answer at every decision, then right | 16/29 (55 %) | — | loses the five first-try items |
| Anchored on the drug history: decision 1 "withdrawal" first, no culture, LP or antibiotics | 22/29 (76 %) | `rb-workup-in-time` | cannot finish until the antibiotics and the LP are done (objectives 3 and 4) |
| Blood culture only after the first results | 25/29 (86 %) | `rb-workup-in-time` | the culture is phase-gated, and the antibiotics given without it are outside their window |
| Antibiotics only once the first results are back | 25/29 (86 %) | `rb-workup-in-time` | given outside their window (neutral) |
| Antibiotics only after the normal CSF | 25/29 (86 %) | `rb-workup-in-time` | the hindsight path the review replayed at 29/29 |
| LP in the first hour, before the platelet count | 25/29 (86 %) | `rb-workup-in-time` | safety event with harm text; a second LP after the count is refused (`maxDoses: 1`) |
| LP only after the CSF report | 25/29 (86 %) | `rb-workup-in-time` | outside its window (neutral) — the other hindsight path of the review |
| Diazepam push + advising the mother to stop her medicines | 26/29 (90 %) | `rb-no-harm` | two safety events with harm text |
| The report's recorded steps only (LP, phenobarbital, nutrition, phototherapy; correct decisions) | 23/29 (79 %) | `rb-workup-in-time` | no culture, antibiotics, EEG, clotting screen or vitamin K recorded; cannot finish until they are done |
| No clotting screen | 27/29 (93 %) | — | loses `rb-care-acts` |
| Phenobarbital before the glucose | 29/29 | — | safety event only (`contraindicatedWhen: not read glucose (admission)`): the rubric cannot express that order |
| IV calcium after reading the calcium (2.21 mmol/L) | 29/29 | — | safety event only (contraindicated once the first-results electrolytes are read; neutral in the first hour, when the calcium is not yet known) |

Contraindicated actions are named in the debrief but, as everywhere in the library, do not lower the score by
themselves; the harms that matter most are scored through `rb-no-harm` and, for the lumbar puncture, through the
time window of `rb-workup-in-time`.

## Reference path (`solution`)

72 steps: start → 22 admission-phase history items (7 of them unknown) → vital signs, tone and reflexes, fontanelle,
jaundice, petechiae, oedema → decision 1 → monitoring → glucose (3.2 mmol/L) → IV access with bloods → blood culture →
clotting screen → antibiotics (meningitic cover) → vitamin K → EEG → phenobarbital → decision 2 → (first results)
electrolytes, CRP, blood count (platelets 306×10^9/L) → lumbar puncture → bilirubin → nutrition → decision 3 → (CSF
and imaging) CSF, TORCH, both ultrasound reports → decision 4 → the breastfeeding question → review of the mother's
medicines → discharge plan → decision 5 → (follow-up) the outcome record → the relative's follow-up account → finish.
`cases verify`: objectives 6/6, decisions 5/5, utterances 40/40, rubric 29/29. The demonstration asks only questions
a clinician would put to the relative of a 38-hour-old baby (1.0.0 asked about his operations, vaccinations,
activities and earlier admissions), and it does the lumbar puncture only once the platelet count is known.

## Clinical numbers check

**Extraction table (STANDARD §6.2).** Every patient fact, its field in 1.0.0 and its field now. The source check is
pending: none of these has been compared with the full article.

| Fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| male, 38 hours old (1.5833 days = 38/24) | `patient.age`, `nonVerbalReason` | `patient.age` (unchanged value, rendered "38小时 / 38 hours" by the core formatter), title, triage note |
| weight 3.5 kg (time point not given) | `patient.weightKg`, `history.weight` | `patient.weightKg`, `history.weight` (the relative says the time point is unknown) |
| poor feeding since birth, weak suck and swallow, formula feeding | `history.feeding`, chief complaint | `history.presentation`, `history.feeding`, chief complaint, triage note |
| episodes at about 30 and 35 h: staring, limb jerking, lip cyanosis, 1–2 min each, self-resolving; one vomit | `history.seizures` | `history.episodes`, `history.episode-timing`, `history.vomiting`, triage note |
| temperature normal, no fever recorded | `history.fever` | `history.fever`, `exam.vitals` |
| 39 weeks, vaginal birth, no PROM, clear liquor, Apgar 10 and 10 | `history.birth` | `history.birth`, `history.apgar`, `history.membranes-liquor` |
| mother: psychiatric illness; clozapine and haloperidol throughout pregnancy; last dose about 5 h before delivery; no regular drug levels | `history.exposure` | `history.maternal-meds`, `history.maternal-illness`, `history.last-dose`, `history.drug-monitoring` |
| irritable, tone slightly increased, weak suck and Moro, flat fontanelle, steady breathing | `exam.neuro` | `exam.tone-reflexes`, `exam.fontanelle`, `exam.vitals` |
| facial/truncal jaundice, scattered pinpoint petechiae chest/limbs, mild pitting leg oedema | `exam.skin` | `exam.jaundice`, `exam.petechiae`, `exam.oedema` |
| glucose 3.2 mmol/L | `investigations.metabolic` | `investigations.glucose` (admission) |
| Na 139, K 4.2, Ca 2.21, Mg 1.01 mmol/L | `investigations.metabolic` | `investigations.electrolytes` (first results) |
| CRP < 1 mg/L | `investigations.metabolic` | `investigations.crp` |
| platelets 306×10^9/L | `investigations.metabolic` | `investigations.blood-count` |
| total bilirubin 199.6 µmol/L | `investigations.metabolic` | `investigations.bilirubin` |
| CSF clear, WBC 2×10^6/L, glucose 2.2 mmol/L | `investigations.neurology` | `investigations.csf` (CSF and imaging) |
| TORCH IgM negative; cranial and major-organ ultrasound without obvious abnormality | `investigations.neurology` | `investigations.torch`, `investigations.cranial-us`, `investigations.organ-us` |
| no neonatal drug levels or EEG | `investigations.neurology` ("not provided") | `investigations.drug-levels` (named "Toxicology and drug screen"), `investigations.eeg` ("No result is recorded for this test") |
| phenobarbital; nutritional and jaundice support; no further convulsions; gradual withdrawal; 10 days in hospital; telephone follow-up two months, no abnormality reported | `investigations.followup` | `investigations.followup`, `history.status-followup`, intervention responses |
| the report's attribution: antipsychotic-exposure-related neonatal withdrawal, mechanism not established | `debrief.conclusion`, citation title | outcome record, debrief |

**Values with units and derived values.**

* Glucose 3.2 mmol/L (≈ 58 mg/dL); time of sampling and method not recorded. Teaching threshold (not a patient
  fact): the BAPM framework (2017) acts on a value below 2.5 mmol/L in a baby with abnormal clinical signs, so 3.2 is
  above it (decision 2 and 4 feedback, teaching point 2).
* Sodium 139, potassium 4.2, calcium 2.21, magnesium 1.01 mmol/L — no reference ranges recorded, none added; whether
  the calcium is total or ionised is not recorded (2.21 mmol/L is implausible as an ionised value, so most likely
  total — an inference, kept out of the case text except "not low").
* CRP < 1 mg/L (a text value).
* Platelets 306×10^9/L; no white cell, neutrophil or haemoglobin value recorded. No clotting result is recorded.
* Total bilirubin 199.6 µmol/L ÷ 17.1 = **≈ 11.7 mg/dL** (the conversion is labelled in the result). The age in hours
  at sampling is not recorded; at 38 hours he was jaundiced on examination. AAP 2022 counts an albumin below
  3.0 g/dL (30 g/L) among the neurotoxicity risk factors; no albumin is recorded (decision 3 asks for one because of
  the oedema).
* CSF white cells 2×10^6/L, glucose 2.2 mmol/L. **CSF:blood glucose ratio ≈ 0.69** (2.2 ÷ 3.2) — derived, and valid
  only if the samples were paired, which is not recorded (said in the `cause` feedback; NG195 asks for a blood
  glucose immediately before the LP for this reason).
* Timeline: episodes at about 30 and 35 h; examination at 38 h; last maternal dose about 5 h before delivery, so the
  episodes began about 35 h after the last maternal dose (derived; not used as a fact in the case text).
* Teaching doses (formulas, never patient values): phenobarbital 20 mg/kg IV, no faster than 1 mg/kg/min; while
  meningitis is not excluded, IV amoxicillin with cefotaxime at the neonatal formulary's meningitis doses (no mg/kg
  printed: the case defers to the formulary — see *To verify*); once meningitis is excluded, benzylpenicillin
  25 mg/kg 12-hourly and gentamicin 5 mg/kg (NICE NG195); 10% calcium gluconate 2 mL/kg (a trap item); vitamin K 1 mg
  IM; diazepam 0.3 mg/kg (a trap item). For a 3.5 kg baby phenobarbital 20 mg/kg would be 70 mg — this figure is
  deliberately not printed in the case.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did it feel to hear 'his mother is on psychiatric medicines' in the middle of a seizure
   history?"
2. **Description** — "In two sentences: what did the baby show, and what did you do in the first hour?"
3. **Analysis**
   * "What made these episodes seizures rather than jitteriness — and what would have changed your mind?"
   * "Which causes could kill or disable him if missed in the first hour? How quickly could you exclude each?"
   * "Why did the antibiotics not wait for the lumbar puncture — and why did the lumbar puncture wait for the platelet
     count?"
   * "His CRP was below 1 mg/L. Why did that not settle the antibiotics question?"
   * "Why phenobarbital first, and why does an EEG matter even more once it is given?"
   * "The bilirubin was 199.6 µmol/L — at what hour? What would you need to know to plot it, and what does the leg
     oedema add?"
   * "Petechiae with 306×10^9/L platelets: what are you looking for?"
   * "Toxicity or withdrawal — can you tell them apart here, with no drug levels measured?"
   * "His mother wants to know whether to stop her medicines and whether she can breastfeed. What do you say, and
     how do you say it without blame?"
4. **Summary** — "What will you do first the next time a newborn has a seizure and the mother's drug history seems
   to explain it?"

### Common learner errors and how the case surfaces them

| Error | What the case does | Where it scores |
|---|---|---|
| Anchoring on the drug history (the report's own conclusion) and skipping the infection work-up | decision 1 distractor; the critical work-up item | `rb-approach`, `rb-workup-in-time` |
| A lumbar puncture before the platelet count in a baby with petechiae | decision 1 near-miss; the LP is contraindicated (harm text) until the first-results blood count is read, and cannot be repeated | `rb-approach`, `rb-workup-in-time` |
| Antibiotics held until the results (CRP, CSF) are back | only antibiotics given in the admission phase after the culture count | `rb-workup-in-time` |
| Antiseizure drug before the glucose | phenobarbital is contraindicated until the glucose is read (safety event with harm text) | debrief safety events |
| Treating "withdrawal" like opioid withdrawal | oral morphine contraindicated; decision 2 distractor | `rb-antiseizure`, `rb-no-harm` |
| Diazepam pushes | contraindicated; decision 2 distractor | `rb-antiseizure`, `rb-no-harm` |
| No EEG ("they stopped by themselves") | EEG is in the decision 2 key and the care item; its result is honestly "not recorded" | `rb-care-acts` |
| Reading a bilirubin without its hour; dismissing petechiae or oedema | decision 3 | `rb-skin` |
| Calling the cause proven; jumping to a genetic epilepsy | decision 4 distractors | `rb-cause` |
| Stopping clozapine "to breastfeed"; breastfeeding on clozapine with monitoring; a routine safeguarding referral | decision 5 distractors; two contraindicated interventions | `rb-family`, `rb-no-harm`, communication |

### Teaching points (debrief)

1. Recognition and EEG confirmation (ILAE 2021; ILAE 2023 expert agreement on seizure burden).
2. The first hour: glucose (BAPM 2017: below 2.5 mmol/L with abnormal signs), electrolytes, clotting, culture,
   imaging; seizures are a NICE NG195 red flag — antibiotics straight after the culture, amoxicillin with cefotaxime
   while meningitis is not excluded; the LP only when safe (NG195, 2024), here after the platelet count and clotting,
   and the CSF read with the earlier antibiotics in mind.
3. Phenobarbital first-line (ILAE 2023), NEOLEV2 (2020) 80 % vs 28 %; stop before discharge after acute provoked
   seizures — the report's gradual withdrawal is the point to compare.
4. The FDA 2011 antipsychotic class warning — the listed signs, which do not include seizures, and the course (some
   newborns settled within hours or days, others needed a longer stay); without neonatal drug levels, residual drug
   effect cannot be told from withdrawal (the case's own reasoning).
5. Hour-specific bilirubin interpretation (AAP 2022); petechiae with normal platelets; TORCH IgM limits.
6. The mother's treatment (no abrupt stop; BAP 2017), clozapine and breastfeeding (LactMed), communication without
   stigma, structured follow-up.

## Embodied mode

* **Where things are (`general-hospital`).** The baby lies in ICU bed 1 (`setting: icu`) and is never moved in the
  reference path. History and examination are at the cot side; the relative answers (`patient.nonVerbalWhen:
  {always: true}`, reason "a 38-hour-old newborn; his relative answers the history"), and the opening line is the
  relative's. Record reviews (the first-results reports, CSF, TORCH, both ultrasound reports, the outcome record) are
  read at the ICU nurses' station (`records`). The glucose, blood culture and clotting screen are sampled at the
  patient. The EEG is a bedside test (`requires: ["eeg"]`, the ICU's EEG cart) done by the clinician — not a nursing
  test. IV access is a procedure needing the cannulation kit (the ICU crash trolley); every IV drug follows it. The
  lumbar puncture is a cot-side procedure, done in the first-results phase once the platelet count has been read.
  Monitoring uses the bed's monitor; phototherapy (not in the reference path) needs the ICU phototherapy unit; a brain
  MRI would need the baby taken to the scanner, which is why it is not in the reference path.
* **Capability check.** Everything the case needs exists in `general-hospital` (`caseCapabilityGaps` is empty):
  `lab-chemistry`, `lab-hematology`, `lab-microbiology`, `eeg`, `iv-access`, `medications`, `cardiac-monitor`,
  `phototherapy`, `mri`, `records`.
* **Demonstration (2026-10-30).** `embodied-autopilot.test.ts -t "cmcr-44848:"` passes in en and zh-CN with the
  clinical-mode score (29/29, objectives 6/6, no contraindicated action).
* **Scope of practice.** Stopping or giving drugs follows their kinds; the lumbar puncture and IV access are
  procedures; the review of the mother's medicines is a consult; advice to the mother is kind `other`.

## Source and adaptation (fidelity limits)

**From 1.0.0 (kept as fact, not yet checked against the article).** Everything in the extraction table above.

**Adapted for teaching.** The relative (which relative is not recorded; role `carer`, named "施清和的家属（化名）" /
"Shi Qinghe's relative (pseudonym)") and all dialogue in lay first person; the relative's worries (an ICE item that
restates the recorded maternal medicines and adds no fact); the staff (Dr Zhong, Nurse Lin, Pharmacist Gu); the four
phases and their staging (the first bloods are taken at cannulation and read in the next phase; the timing of every
test is unrecorded); the order of the reference path (clotting and vitamin K in the first hour, the lumbar puncture
after the platelet count — 1.0.0 records a CSF result but not when the LP was done); "admission to the neonatal
unit" at 38 hours and the ICU bed (the in-world placement); the decisions, interventions, doses, rubric and feedback
(current guidance); the "Admission examination" label on the recorded findings.

**Inconsistencies and ambiguities kept, not resolved.**

* The article's title says the withdrawal syndrome was *caused by* clozapine and haloperidol; 1.0.0's conclusion says
  the report *considered* exposure-related withdrawal with the mechanism *not established*. The case states both
  (outcome record: "attributes … without establishing the mechanism").
* "电话随访两个月未报告异常" can mean a call at two months or follow-up over two months; the case says "telephone
  follow-up to two months" and the relative "by two months".
* "逐步停药" (gradual withdrawal of the drug) does not name the drug; the case says "the drug was withdrawn
  gradually".
* "伴一次呕吐": whether the vomit was during an episode is not stated; the case says only "he vomited once".
* The 3.5 kg weight has no time point (birth or admission); the relative says so when asked about his birth weight.
* 1.0.0 placed the bloods in a "workup" phase and the CSF/ultrasound in a "confirmation" phase — template staging, not
  a recorded chronology; the new phases are staging too, and the results carry "time not recorded".

**What 1.0.0 claimed about the article and this version does not.** 1.0.0 said drug levels and EEG were "not provided"
and its unknown answers said "the source case does not provide this"; the case now says "No result is recorded for
this test" / "This case does not record …", and the relative says "I'm not sure, doctor."

**Unknowns kept honest** (`unknowns`, 8 unknown history items, 7 tests without a recorded result,
`examNotRecorded`): vital-sign values; the mother's diagnosis, doses, other substances and infection risks; sampling
hours; calcium type; conjugated bilirubin, blood group, DAT; white cells and neutrophils; EEG, culture, CSF protein and
culture, drug levels, clotting, MRI; vitamin K; antibiotics; the form of nutrition and jaundice treatment; the
phenobarbital dose and course; the outcome beyond two months.

**Privacy.** Pseudonym unique across the CMCR cases (unchanged from 1.0.0); no hospital, date, place or occupation;
times relative to birth. Authors' names only in the citation. No media are approved for this case (the media review
lists none), so it has no assets.

**Survey findings addressed** (critic, spot-check of cmcr-44848):

* *"Recurrent neonatal seizures are monitored, not confirmed by EEG and treated; phenobarbital appears only in the
  outcome record"* → decision 2 (phenobarbital + EEG), the phenobarbital and EEG acts in the rubric, ILAE 2023/2021.
* *"The decision opens only after the CSF/TORCH/ultrasound records"* → decisions 1–2 open in the admission phase,
  before any blood result except the glucose.
* *"No breastfeeding advice for maternal clozapine; no neutrophil count"* → decision 5, two interventions, a teaching
  point; the blood count states that no white cell or neutrophil count is recorded (and see *To verify*).
* *"No decision addresses the petechiae and oedema or the bilirubin of 199.6 µmol/L at under 48 h"* → decision 3.
* *"Both exam items are scoped to 'initial'"* → six findings offered in three phases, labelled as the admission
  examination (taken after both episodes).
* *"Companion role 'parent' named 'Companion (educational role)'"* → role `carer`, named by relation, no authoring
  language anywhere in the persona.
* *"The demonstration asks a 38-hour-old about operations, vaccinations, activities and admissions"* → removed.
* *"specialty 'pharmacology' names the answer"* and the summary that sent learners to the mother's medicines →
  specialty `neonatology` + `neurology`; spoiler-free summary and triage note.
* *Capability gaps (EEG, antiseizure treatment)* → EEG via the framework's `eeg` capability; all treatments available.
* The critical item was a hindsight decision (`decidedFirstTry: management`) → two act-based critical items, the
  work-up item with time windows (below).

**Independent review findings (2026-10-30) and what was done.**

* *Major — the first-hour critical item could be met in hindsight* (LP and antibiotics counted in any phase; replayed
  at 29/29 with both moved after the CSF report or the outcome record; the README claimed a gate that did not exist).
  **Applied** with the framework's answer to the requested phase qualifier on `intervened`: `{"intervened": …,
  "whenIndicated": true}` counts only doses given inside the intervention's `indicatedWhen`. `rb-first-hour-acts` →
  `rb-workup-in-time`: antibiotics count only in the admission phase after a culture ordered there; the LP only in the
  first-results phase after the blood count was read, i.e. before the CSF report. Both hindsight paths and the
  late-antibiotics path are now in the measured table, and the README describes the gate the engine applies.
* *Major — the key, LO2, TP2 and the demonstration did a first-hour LP in a baby with petechiae and an unknown
  platelet count, clotting and vitamin K status.* **Applied**: the key, LO2, TP2, a new key reasoning step and the
  attending's brief now say culture → antibiotics covering meningitis without waiting → LP once the platelet count and
  clotting allow (NICE NG195's lumbar-puncture recommendations, added 2024, confirmed by search: LP only if safe;
  stabilise bleeding risk and uncontrolled seizures first; blood glucose just before; read the CSF with earlier
  antibiotics in mind). Decision 1 now requires the petechiae to have been examined and names them in its prompt; the
  LP is contraindicated (harm text) until the first-results blood count is read and is given once at most; the
  reference path orders clotting and gives vitamin K in the first hour and does the LP after reading the platelets; a
  fifth decision-1 option ("LP first, antibiotics after") is the near-miss. The antibiotics now name NG195's regimen
  for suspected meningitis with an unknown pathogen — IV amoxicillin with cefotaxime (confirmed by search) — with
  benzylpenicillin + gentamicin once meningitis is excluded. *Not applied as suggested:* the critical item is gated on
  the platelet count only, not also on a clotting result — 1.0.0 records no clotting result, so a gate on it would
  rest on a result the case can never show; the clotting screen is in the key, the reference path and `rb-care-acts`.
* *Major — phase-free reads of staged records* (decision 4 unlocked on "no result yet" placeholders and printed values
  never read; the calcium trap quoted 2.21 mmol/L in the first hour). **Applied**: phases on every read of a staged
  record (decision 4, the calcium trap, `obj-first-results`, `obj-cause-plan`; the admission glucose in decision 4 and
  the phenobarbital windows). Decision 3 now also waits for the first-results electrolytes and CRP, so the phase
  cannot be left with them unread (otherwise decision 4 could lock for good in the web). Empirical calcium in the first
  hour is now neutral (no harm text quoting a result that does not exist yet).
* *Minor — FDA attribution and NG195 version.* **Applied**: the toxicity-versus-withdrawal point is the case's own
  reasoning (no neonatal drug levels were measured here) in decision 4, teaching point 4 and the pharmacist's brief —
  secondary summaries found by search (HSA Singapore, US Pharmacist) do report it from the FDA's data summary, but
  fda.gov could not be read, so it is listed under *To verify*; "often self-limiting" → "in some newborns the symptoms
  settled within hours or days, while others needed a longer hospital stay"; the morphine harm and feedback now cite
  ILAE 2023 instead; NG195 is cited with its 2024 lumbar-puncture recommendations and its 2026 update.
* *Minor — decision 5 distractors were absolutes; the HIE option was refuted by facts the learner holds.* **Applied**:
  three near-misses (stop the clozapine now and keep the haloperidol; breastfeed with sedation and white-cell
  monitoring; a "routine" safeguarding referral) with feedback from BAP 2017, LactMed and NICE CG192; HIE with cooling
  → a KCNQ2-type channelopathy option that still needs EEG (and, if seizures recur, genetic testing) before
  attribution.
* *Minor — spoilers in objectives and a test name.* **Applied**: `obj-first-hour` is "The first hour"; neutral hints
  for `obj-first-hour`, `obj-first-results` and `obj-cause-plan` (and `obj-examine`, which named jitteriness); the
  drug-level test is "Toxicology and drug screen / 毒物与药物筛查".
* *Minor — four feedbacks named no guidance.* **Applied**: platelets and IVIG (BSH 2016, AAP 2022), the channelopathy
  option (ILAE 2023), CSF glucose (NICE NG195, 2024), the referral (NICE CG192).
* *Minor — the oedema was never taught; the glucose was "not low" without a threshold.* **Applied**: decision 3 key
  and feedback (albumin — an AAP 2022 risk factor below 3.0 g/dL — and a fluid, cardiac and renal review), the
  "physiological" feedback corrected; the BAPM 2017 threshold (2.5 mmol/L with abnormal signs) in decisions 2 and 4
  and teaching point 2.
* *Minor — matcher overlaps* (the finding's text was cut off after the birth-weight probe; the rest was reproduced by
  probing). **Applied**: see *Matcher notes*.

## Matcher notes

* 40 `extensions.testUtterances` (20 zh-CN, 20 en; 4 look-alike negatives), none equal to a canonical question or a
  keyword; every required item has 2–5 paraphrases; `cases verify` 40/40 with no extra selections. Every canonical
  question of every phase selects its own item alone (probed 2026-10-30).
* **Birth weight.** "What was his birth weight?" reaches `weight`, whose answer now says that the 3.5 kg weighing has
  no recorded time point ("I'm not sure whether that was at birth or after he came in"), instead of implying a birth
  weight. `maternal-doses` lost its bare "how much", which made "How much did he weigh at birth?" also answer "I
  couldn't tell you how much she takes"; it now needs dose words (`dose`, `mg`, `howmanytablets`,
  `howmuchdoesshetake`; 剂量, 药量, 吃几片…) and excludes weight and milk words (体重, 奶).
* **Breast or bottle.** "Is he breastfed or bottle-fed?" / "他是吃母乳还是奶粉？" used to match nothing (each item
  excluded the other's words). `feeding` now carries "breastfed", "breast or bottle", 吃母乳, 母乳还是奶粉 (he is
  formula-fed — recorded), and `breastfeeding-wish` only the mother's wish or plan (want/plan/hope/intend to
  breastfeed; 想/打算/希望 喂母乳). When both match ("Did his mother want to breastfeed him?"), the matcher keeps the
  more specific item (`distinctHistoryHits`); "Is she planning to breastfeed or use formula?" answers both.
* **The maternal cluster.** `maternal-meds` excludes last/dose/levels/smoking/alcohol/breastfeeding/illness and now
  antibiotic and infection words, so "Was mum on antibiotics in labour?", "Did mum have any infections in pregnancy?"
  and "妈妈怀孕时有没有感染？" reach `maternal-infection` (which gained infection-in-pregnancy and antibiotics-in-labour
  phrases) instead of answering "clozapine and haloperidol". `episode-timing` excludes 最后一次/吃药/dose so
  "最后一次吃药是生前多久" is not read as seizure timing; `fever` excludes the mother and labour
  (妈妈/生之前/产时/labour/strep) and now carries "signs of infection"/感染, so "Any signs of infection?" / "他有没有感染？"
  get his recorded temperature rather than his mother's unknown risks; `birth` has 顺利 so "出生的时候顺利吗？" is not
  taken for a question about fever in labour.
* `status-followup` (follow-up phase) supersedes `presentation`.
* Run-together English keywords where a phrase would reduce to stop words or must match only verbatim
  (`whatsbeengoingon`, `howmanytimes`, `howmanytablets`, `howmuchdoesshetake`, `howmuchshetakes`, `howishenow`; the
  alias `doanlp`); `cases validate --strict` reports none.
* Keywords carry no answer content (no drug names, no "blue", "staring", "vaginal").

## References

1. 朱明哲. 氯氮平及氟哌啶醇致新生儿撤药综合征一例. 中华儿科杂志. 2011;49(10):796-797.
   doi:10.3760/cma.j.issn.0578-1310.2011.10.019. Available from: https://rs.yiigle.com/cmaid/44848
2. Pressler RM, Abend NS, Auvin S, Boylan G, et al. Treatment of seizures in the neonate: guidelines and
   consensus-based recommendations — special report from the ILAE Task Force on Neonatal Seizures. Epilepsia.
   2023;64(10):2550-2570. doi:10.1111/epi.17745
3. Pressler RM, Cilio MR, Mizrahi EM, Moshé SL, et al. The ILAE classification of seizures and the epilepsies:
   modification for seizures in the neonate. Position paper by the ILAE Task Force on Neonatal Seizures. Epilepsia.
   2021;62(3):615-628. doi:10.1111/epi.16815
4. Sharpe C, Reiner GE, Davis SL, Nespeca M, Gold JJ, Rasmussen M, et al. Levetiracetam versus phenobarbital for
   neonatal seizures: a randomized controlled trial. Pediatrics. 2020;145(6):e20193182. doi:10.1542/peds.2019-3182
5. National Institute for Health and Care Excellence. Neonatal infection: antibiotics for prevention and treatment.
   NICE guideline NG195. London: NICE; 2021 [updated 2024 Mar (lumbar-puncture recommendations); last updated 2026].
6. Kemper AR, Newman TB, Slaughter JL, et al. Clinical practice guideline revision: management of hyperbilirubinemia
   in the newborn infant 35 or more weeks of gestation. Pediatrics. 2022;150(3):e2022058859.
   doi:10.1542/peds.2022-058859
7. US Food and Drug Administration. FDA Drug Safety Communication: antipsychotic drug labels updated on use during
   pregnancy and risk of abnormal muscle movements and withdrawal symptoms in newborns. Silver Spring (MD): FDA; 2011
   Feb 22.
8. McAllister-Williams RH, Baldwin DS, Cantwell R, et al. British Association for Psychopharmacology consensus
   guidance on the use of psychotropic medication preconception, in pregnancy and postpartum 2017.
   J Psychopharmacol. 2017;31(5):519-552. doi:10.1177/0269881117699361
9. Clozapine. In: Drugs and Lactation Database (LactMed) [Internet]. Bethesda (MD): National Institute of Child
   Health and Human Development; 2006-. Available from: https://www.ncbi.nlm.nih.gov/books/NBK501650/

The same strings are `debrief.references` (the article and eight guidelines and key papers). Named in feedback and in
`provenance.review.guidelines` but not in the list, to keep it to eight: the British Association of Perinatal
Medicine's framework for neonatal hypoglycaemia in the full-term infant (2017), the British Society for Haematology's
guidelines on transfusion for fetuses, neonates and older children (2016) and NICE CG192, antenatal and postnatal mental
health (2014).

Checked on 2026-10-30 by web search (Crossref, doi.org, ilae.org, nice.org.uk, fda.gov and drugs.com are not
reachable from this environment): ref. 1 — DOI from the source map (`verifiedDoi`, publisher check 2026-10-29); ref. 2
— volume, issue, pages and DOI on the ILAE, UCL and university repository records, with its recommendations
(phenobarbital first-line regardless of aetiology, sodium-channel blockers for suspected channelopathy; phenytoin,
levetiracetam, midazolam or lidocaine second-line; stop before discharge after acute provoked seizures; treating
seizures including electrographic-only ones to reduce burden — expert agreement); ref. 3 — citation and DOI on
indexing records (EEG central to diagnosis; electrographic-only seizures included; clinical events without an EEG
correlate excluded); ref. 4 — PMC and catalogue records (80 % vs 28 % seizure-free for 24 hours; 20 mg/kg
phenobarbital load); ref. 5 — NICE chapter pages as indexed by search (seizures a red-flag clinical indicator;
benzylpenicillin 25 mg/kg 12-hourly, gentamicin 5 mg/kg starting dose; the lumbar-puncture recommendations moved into
NG195 in March 2024: LP if it is safe when infection is strongly suspected or meningitis signs are present, treat and
stabilise an unprotected airway, respiratory compromise, shock, uncontrolled seizures or bleeding risk first, blood
glucose immediately before, CSF read with any earlier antibiotics in mind; suspected or confirmed meningitis with an
unknown pathogen in a neonatal unit: IV amoxicillin and cefotaxime [2012, amended 2021]; update notes from March 2024
to 2026); ref. 6 — AAP and repository records (neurotoxicity risk factors including albumin < 3.0 g/dL, sepsis and
significant clinical instability in the previous 24 hours; IVIG for isoimmune haemolytic disease at the
escalation-of-care threshold); ref. 7 — contemporaneous summaries of the FDA page (the class labelling, the listed
signs, "in some newborns, symptoms subsided within a few hours or days… other newborns required longer hospital
stays", do not stop on one's own); ref. 8 — BAP and repository records; ref. 9 — the NCBI Bookshelf record as indexed
by search (little published experience; sedation and haematological effects reported in breastfed infants; other
agents preferred; several authoritative sources recommend not breastfeeding on clozapine; if breastfeeding, monitor
for sedation and periodic white-cell counts). BAPM 2017 — the 2.5 mmol/L operational threshold for a baby with
abnormal clinical signs, from summaries and NHS guidelines citing it.

## To verify

**In the source article** (the source pass):

* Vital signs on admission (heart rate, breathing rate, SpO₂, blood pressure, the temperature reading) and whether
  3.5 kg is the birth or the admission weight; where the baby was born and admitted (the ICU placement is in-world
  staging).
* The mother's diagnosis, the clozapine and haloperidol doses, how long she took them, any other drugs or substances,
  GBS status and intrapartum fever.
* The hour of each sample (glucose, bilirubin, CSF), whether the calcium is total or ionised, the CRP unit, the full
  blood count (white cells, neutrophils, haemoglobin), CSF protein and culture, which TORCH agents, which organs were
  scanned, and any conjugated bilirubin, blood group or DAT.
* Whether an EEG, blood culture, antibiotics, neonatal drug levels, vitamin K, a clotting screen or MRI are reported,
  and when the lumbar puncture was done relative to the blood results (the case's order is teaching design).
* The phenobarbital dose, route, number of doses and the timing of its withdrawal (and that "逐步停药" refers to it);
  the form of the jaundice treatment and the bilirubin values that guided it; the method of nutritional support.
* The follow-up wording (a call at two months, or follow-up over two months) and any developmental assessment.
* The authors' discussion of withdrawal versus residual drug effect, the timing argument and the references they cite;
  whether the title's causal wording and the text's "considered" wording both appear as 1.0.0 recorded them.

**Guidance details:**

* ILAE 2023: the exact recommendation wording and grading; whether it specifies a phenobarbital dose (the case uses
  20 mg/kg, the NEOLEV2 load); the further-dose advice; the channelopathy wording (family history as the usual
  trigger, carbamazepine or phenytoin).
* Phenobarbital administration rate (≤ 1 mg/kg/min) and further dosing in the neonatal formulary (BNFC or local).
* NICE NG195: the current version and its last-updated date (search showed update notes for March 2024, December
  2024, November 2025 and May 2026); the exact wording of the 2024 lumbar-puncture recommendations (the "treat and
  stabilise first" list, and whether the CG149 advice "if the LP would delay antibiotics, give antibiotics first" is
  carried over); whether a baby with seizures and a deferred LP counts as "suspected meningitis" for the amoxicillin
  + cefotaxime regimen; the BNFC neonatal meningitis doses of amoxicillin and cefotaxime (the case prints none) and
  the gentamicin second-dose wording (the case says "guided by levels").
* BAPM: the operational thresholds of the 2017 framework (2.5 mmol/L with abnormal clinical signs) and whether the
  newer BAPM framework (birth to 72 hours) changed them.
* BSH 2016: the neonatal platelet-transfusion thresholds (the case says only that they lie far below 306×10^9/L).
* AAP 2022: the neurotoxicity risk-factor list (albumin < 3.0 g/dL, sepsis, significant clinical instability in the
  previous 24 hours — from summaries, confirm), the IVIG wording (isoimmune haemolytic disease at the
  escalation-of-care threshold) and the phototherapy and exchange thresholds at 36–48 hours for 39 weeks (the case
  says only that the exchange thresholds lie "far above" 199.6 µmol/L).
* FDA 2011 DSC: the exact list of signs; the "some newborns … longer hospital stays" wording; whether its data
  summary says that, without blood levels, toxicity could not be told from withdrawal (secondary summaries say so;
  the case does not attribute it to the FDA until confirmed).
* BAP 2017: its wording on abrupt discontinuation, switching in the perinatal period, clozapine in pregnancy and
  clozapine and breastfeeding.
* NICE CG192: the integrated care plan and referral recommendations, and whether its current text still mentions
  clozapine and breastfeeding (a summary attributes "not routinely prescribed … breastfeeding" to it; not used).
* LactMed (clozapine): the infant adverse effects it reports and the "several authoritative sources" wording; the UK
  clozapine SmPC section 4.6 wording on breastfeeding.
* Diazepam injection excipients (benzyl alcohol, sodium benzoate) and the benzoate–bilirubin displacement concern.
* 10% calcium gluconate 2 mL/kg and vitamin K 1 mg IM for a term newborn (standard doses; confirm against the local
  formulary).
* The neonatal CSF:blood glucose reference ratio (the case says only that 0.69 is not in the low range of bacterial
  meningitis).
* Whether any guidance recommends a neonatal neutrophil count after in-utero clozapine exposure (the critic's point;
  the case records the count as missing without recommending it).
* Whether a Chinese neonatal seizure, infection or hyperbilirubinaemia guideline should be added for zh-CN learners
  (none is cited because none could be verified here).

**Framework:**

* STANDARD §6.6 prescribes the en review note "… full source article. Not yet reviewed by a licensed clinician."
  while `cmcr-105.test.ts` matches `/not yet reviewed by a licensed clinician/` case-sensitively; this case joins the
  last sentence with a semicolon ("…; not yet reviewed by a licensed clinician.") so both hold — reconcile centrally.
* The time windows of `rb-workup-in-time` use `{"intervened": …, "whenIndicated": true}`, new in core in this PR
  (KIT §2; uncommitted in the shared worktree when this case was revised). If the qualifier were dropped, the case
  would fail validation rather than silently score hindsight acts — keep the two in step.

**Clinician input:** a neonatologist should review decisions 1–3 (especially the LP deferral and the antibiotic
choice where local policy differs) and a perinatal psychiatrist decision 5.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Case card.** Title "吃奶差、反复抽搐 · 生后38小时男婴" / "Poor feeding and recurrent convulsions · 38-hour-old
  boy"; a spoiler-free summary (1.0.0's sent the learner to the mother's medicines); specialty `neonatology` +
  `neurology` (`clinical-pharmacology` dropped); topic tags; difficulty 4, 40 minutes; six learning outcomes.
* **Provenance.** Vancouver citation with the verified DOI and the yiigle URL; `review.status: editorial`, ten named
  guidelines, the §6.6 notes (see *To verify* for the punctuation); the published-case disclaimer;
  `extensions.sourceDoi` + `doiVerifiedAt` (from 1.0.0's `sourceDoiVerification`, same DOI and date) and
  `sourceTextChecked: false`.
* **Patient and voice.** A carer named by relation answers for the non-verbal baby; a lay chief complaint and opening
  line; a clinical triage handover (1.0.0's was an instruction); infant appearance; age kept as 38/24 days so the
  core formatter shows "38 hours".
* **History.** 15 template slots (8 saying "the source case does not provide this", four asking a newborn about
  operations, vaccinations, activities and admissions) → 24 neonatal items: 16 recorded facts in lay words and 8
  honest unknowns; seven required; `excludeKeywords` for the overlaps; a follow-up-phase twin.
* **Examination.** 2 compound findings → 6 manoeuvres in clinical words, in three phases, labelled as the admission
  examination.
* **Investigations.** 3 compound records → 17 single tests: the recorded values structured (glucose, electrolytes,
  CRP, blood count, bilirubin, CSF, TORCH, two ultrasound reports), staged across phases, with honest "no result is
  recorded" entries for EEG, blood culture, toxicology and drug screen, clotting, ammonia/lactate, urine CMV and MRI.
* **Interventions.** None → 15: the report's steps (phenobarbital, nutrition, phototherapy, LP), today's steps (IV
  access, monitoring, antibiotics, vitamin K, review of the mother's medicines, discharge plan) and the traps (diazepam
  push, oral morphine, IV calcium, advising the mother to stop her medicines, breastfeeding on clozapine); the LP and
  the antibiotics with time windows.
* **Decisions.** 3 template decisions (option ids `include`, `limits`, `monitor`; a hindsight critical item) → 5
  decisions at the real decision points with content ids, 4–5 options each, feedback naming the guidance, no length
  cue.
* **Rubric.** 11 template items → 12: first-try decision items, a keyed-care item, two act-based critical items
  (the work-up in time: glucose, culture and antibiotics in the admission phase, the LP after the platelet count and
  before the CSF report; avoided harms with `scoredWhen`), a case-specific Calgary–Cambridge communication item.
* **Staff, debrief, matcher.** Attending, nurse and pharmacist briefs written for the case; a 965-character
  conclusion, six key reasoning steps, six dated teaching points contrasting the report with current practice, six
  unknowns, nine references; 40 hand-written test utterances with four negatives.
* **Independent review (2026-10-30), applied.** The work-up critical item scores time windows
  (`whenIndicated`) instead of acts done in any phase (`rb-first-hour-acts` → `rb-workup-in-time`); the LP waits for
  the platelet count and clotting (contraindicated before it, given once at most), the antibiotics cover meningitis
  without waiting for it, and the reference path, key, LO2, TP2 and staff briefs follow; a fifth decision-1 option
  (LP first); phases on every read of a staged record, and decision 3 waits for all four first-results reports; the
  FDA toxicity-versus-withdrawal point recast as the case's reasoning, "often self-limiting" corrected, NG195 cited
  with its 2024 and 2026 updates; near-miss distractors in decision 5 and a channelopathy option instead of HIE in
  decision 4; neutral objective titles and hints and a neutral name for the drug screen; guidance named in every
  feedback, the oedema and a glucose threshold taught; matcher fixes for birth weight, breast or bottle, and maternal
  infection questions. Ids changed (none referenced outside this case): rubric `rb-first-hour-acts` →
  `rb-workup-in-time`; options `hie-cooling` → `channelopathy-switch`, `stop-to-breastfeed` → `stop-clozapine-now`,
  `breastfeed-reassure` → `breastfeed-monitored`, `child-protection` → `routine-referral`; new option
  `lp-before-antibiotics`.

### 1.0.0 — 2026-10-28

* Initial template-generated version (PR #5).

## Validation

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-44848/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-44848 --lang en        # 72 steps · objectives 6/6 · decisions 5/5 · utterances 40/40 · rubric 29/29
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-44848          # PASS: depth floor, do-nothing 0, wrong-first 55 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-44848:"                      # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-44848:"       # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 39周顺产男婴（无胎膜早破，羊水清，Apgar评分1分钟、5分钟均为10分，体重3.5 kg），生后一直吃奶差、吸吮
吞咽无力，人工喂养；生后约30和35小时各有一次凝视、四肢抽动伴口唇发绀，每次1–2分钟自行缓解，伴呕吐一次，无发热。38小时时
易激惹、肌张力略高、吸吮和拥抱反射减弱，前囟平坦，呼吸平稳；面部和躯干黄染，胸前和四肢散在针尖样出血点，下肢轻度凹陷性
水肿。母亲因精神疾病孕期一直服用氯氮平和氟哌啶醇，分娩前约5小时末次服药，未定期监测血药浓度。血糖3.2 mmol/L，钠139、
钾4.2、钙2.21、镁1.01 mmol/L，CRP<1 mg/L，血小板306×10^9/L，总胆红素199.6 µmol/L；脑脊液外观清，白细胞2×10^6/L，
葡萄糖2.2 mmol/L；TORCH-IgM阴性；头颅和主要脏器超声未见明显异常。报告考虑两药所致新生儿撤药综合征（机制未确证），用苯
巴比妥及营养、退黄治疗后未再抽搐，逐步停药，住院10天；电话随访两个月未报告异常。本版事实沿用1.0.0版，尚未对照原文核对。

**学习目标。**
1. 床旁区分惊厥与抖动，并按ILAE 2021用脑电图确认。
2. 一小时内完成血糖、电解质（含钙镁）、血常规、凝血、CRP和血培养，取血培养后立即用覆盖脑膜炎的抗生素，血小板和凝血明确、
   确认安全后再腰穿（NICE NG195，2021；腰穿建议2024年并入）。
3. 按ILAE 2023以苯巴比妥（20 mg/kg）为一线，说出二线药物，并在出院前停药。
4. 采集完整的母亲孕期用药史，联系FDA 2011抗精神病药新生儿警示，只在排除可治疗病因后归因。
5. 按采样小时龄、胎龄和高危因素解读胆红素199.6 µmol/L（AAP 2022），说出缺失的信息。
6. 不带指责地与家属沟通：母亲用药不骤停（BAP 2017），服用氯氮平时一般不建议母乳喂养（LactMed），安排发育随访。

**关键决策。** ① 第一个小时：按可能的惊厥处理，测血糖，完善感染与代谢评估（含凝血），取血培养后立即用覆盖脑膜炎的抗生素，
血小板和凝血允许后再腰穿，做脑电图（“药物撤药可以解释一切”是锚定陷阱，“先腰穿、后抗生素”是本例有出血点时的近似错误）；
② 苯巴比妥20 mg/kg一线加脑电图监测（地西泮反复静推、左乙拉西坦一线、口服吗啡为干扰项）；③ 胆红素按小时龄标图复查，
血小板正常的出血点查维生素K和凝血，水肿查白蛋白并评估液体、心脏和肾脏；④ 药物暴露是排除性诊断，不能视为已证实，也不应
在没有脑电图和家族史时转向离子通道病；⑤ 母亲用药不骤停，服氯氮平期间一般不母乳喂养，不带污名地沟通并安排随访（“先停
氯氮平”“边监测边哺乳”“常规儿童保护转介”为近似错误）。关键项：入院阶段完成血糖、血培养和取血培养后的抗生素，血小板回报
后、脑脊液报告前完成腰穿（按时间窗计分）；未给地西泮推注、吗啡，未建议母亲停药或服药期间哺乳。

**复盘要点（PEARLS）。** 先谈感受；复述第一个小时做了什么；分析：为什么按惊厥处理、哪些病因必须一小时内排除、为什么抗生素
不等腰穿而腰穿要等血小板、CRP正常为何不能停抗生素、苯巴比妥后为何更需要脑电图、胆红素的采样小时龄和水肿、没有血药浓度时
毒性与撤药能否区分、怎样与母亲谈用药和喂养；总结下次遇到“母亲用药似乎能解释一切”的新生儿惊厥时首先做什么。本病例为人工
智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核，患者事实尚未对照原文全文核对。
