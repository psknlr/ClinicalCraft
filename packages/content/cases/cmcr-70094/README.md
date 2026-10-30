# cmcr-70094 — Worsening breathing in a preterm baby · 7-day-old girl

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title, summary,
> chief complaint, tags and triage note name neither the cause nor the diagnosis; the triage note lists the PICC among
> her lines without linking it to the deterioration. The baby (杨予宁 / Yang Yuning) is a pseudonym; the case is a
> teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患儿为化名；本病例改编自已发表的病例报告，不构成医疗建议。

**Status of this version.** 1.1.0 is re-authored from the facts that version 1.0.0 recorded (STANDARD §6); the full
source article was not available, so **no patient fact has yet been checked against it**. Every patient fact below
traces to a statement of 1.0.0 (see the extraction table in *Clinical numbers check*); the teaching design follows
current guidance.

## Case card

| | |
|---|---|
| Case | `cmcr-70094` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 黄上明, 杨英梅, 肖万祥, 邹彩艳. 外周穿刺中心静脉置管致极低出生体重儿双侧乳糜胸并腹水一例. 中国小儿急救医学. 2014;21(1):64 (DOI verified in the source map, 2026-10-29) |
| Setting / facility | Neonatal intensive care in the ICU (`icu`) / `general-hospital`, an ICU bed standing in for a NICU cot |
| Difficulty / time | 4 / 5; about 35 min (static clock; four phases, four decisions, 14 interventions) |
| Specialty | Neonatology, critical care (no specialty names the cause) |
| Languages | zh-CN (source language), en |
| Learner level | Neonatal and paediatric trainees, final-year students, neonatal nurses (line care, the communication item) |
| Review status | Editorial review 2026-10-30 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; facts not yet checked against the full article. Have a neonatologist review it before teaching use |
| Content | 18 history items (8 unknown, 6 required; the relative answers) · 3 examination findings · 18 investigations (4 record reviews; 10 tests and the infusion chart without a recorded result) · 14 interventions (3 harmful, 2 timing-dependent, 2 low-value) · 6 objectives · 4 decisions (16 options) · 12 rubric items (11 deterministic, weight 29; 1 examiner-judged; 2 critical) · 3 staff · 6 learning outcomes · 5 teaching points · 39 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Recognise that any deterioration of a newborn with a central venous catheter raises catheter complications —
   infection, extravasation into the chest and tamponade — and act at the cot side: support breathing, stop infusing
   through the line without flushing it, and get an urgent chest film and echocardiogram (BAPM framework, 2015,
   revised 2018).
2. Judge a neonatal PICC tip against the target of a central tip outside the heart (BAPM 2018;
   ESPGHAN/ESPEN/ESPR/CSPEN 2018), treating vertebral levels as proxies that differ between guidelines, recording the
   limb position on every film and never pushing catheter that has come out back into the vein.
3. Manage a line-related pleural effusion: take the line out of use and remove it, tap an effusion that compromises
   breathing under ultrasound with the volume judged in mL/kg, send the fluid for cell count and differential,
   triglyceride, protein, glucose and culture, and continue nutrition peripherally for a short time when a central
   line has to come out (NICE NG154, 2020).
4. Apply the paediatric chyle criteria — triglyceride > 1.1 mmol/L with oral fat intake, ≥ 1000 cells/µL with
   > 80 % lymphocytes (Büttiker 1999) — and explain why a clear appearance, an ether test or a Rivalta test cannot
   separate chyle from leaked infusate.
5. Reserve chylothorax treatment for a confirmed, persistent leak — fat-free feeding first, parenteral nutrition with
   enteric rest if it continues, and octreotide only as an unproven option (Cochrane review 2010: no randomised
   trials) — and appraise the report's chylothorax label and causal claim against the anatomy and the tests recorded.
6. Explain a probable line complication to the family honestly — what happened, what is still uncertain and what will
   be done — report it as a patient-safety event, and arrange follow-up of breathing, growth and development.

These are `learningOutcomes` in `case.json`; they name the line complication, so front-ends show them before play only
behind the closed **Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief.

## Clinical summary (spoilers)

A girl delivered by caesarean at **33+3 weeks** because of **severe maternal pre-eclampsia**, **birth weight 1.1 kg**
(very low birth weight), was breathless from birth. Early in her stay the chest moved symmetrically, with mild
recession and coarse breath sounds; she had respiratory support, surfactant and parenteral nutrition (modes, doses and
composition not recorded). On **day 2** a **PICC** went in through the **right basilic vein**; the position film put
its tip at the **lower border of T3**.

On **catheter day 5 (7 days old)** her breathing became markedly worse: **cyanosis, marked recession, very poor
responsiveness**, and her respiratory support was escalated. Imaging showed **bilateral pleural effusions with
atelectasis**, on ultrasound **more on the right**, with a **small amount of ascites**; later films described the tip
position as unchanged. The pleural fluid was **pale yellow and clear, ether test positive, Rivalta test negative,
culture negative**; no cell count, triglyceride, protein or glucose is recorded.

**The report's course.** Pleural taps of **20–30 mL each** and **removal of the PICC**, after which the effusions and
ascites resolved and support **returned to CPAP**; discharge after **54 days** in hospital at **2.4 kg**; growth and
development reported normal at **2 and 4 months**.

**Diagnosis.** The report's title calls it **bilateral chylothorax with ascites caused by the PICC** in a
very-low-birth-weight infant. The case teaches it as a **PICC-associated bilateral effusion with ascites whose chylous
nature is not established**: on the recorded tests chyle cannot be told from leaked infusate (whatever ran through the
line is not recorded), and a right basilic line never passes the thoracic duct's left-sided opening, so a direct duct
injury is anatomically implausible; leaked infusate, or obstructed central venous and lymphatic drainage, fit the
bilateral picture better.

## Scenario timeline and physiology

Static clock and no physiology model (the CMCR contract). Every phase is forward-only (`learnerSwitchable: false`);
the phase descriptions tell the learner what moves time on, without naming the acts.

| Phase | Time | Entered when | What is there |
|---|---|---|---|
| `deterioration` (initial) | day 7 of life, catheter day 5 | start | the relative's history; three examination findings at the deterioration; early-course notes and the PICC record (record reviews); the infusion chart (not recorded); bedside film, ultrasound and echocardiogram can be requested (film and ultrasound report in the next phase; no echocardiogram result is recorded); blood culture, blood gas, blood count, clotting (no results recorded); decision 1 (`bedside-priorities`) |
| `imaging` | after the deterioration (timing not recorded) | objectives `obj-cot-side` and `obj-first-steps` complete — i.e. decision 1 answered, the PICC infusion stopped (or the line removed), support escalated, film and echocardiogram requested | bedside film (effusions with atelectasis; tip unchanged on later films); ultrasound (right > left, small ascites); echocardiogram and venous Doppler (no result recorded); decision 2 (`imaging-plan`) |
| `fluid` | after the tap (timing not recorded) | objective `obj-imaging-plan` complete — film and ultrasound read, decision 2 answered, chest tapped, PICC removed, peripheral cannula placed | aspirate routine analysis and culture (recorded); aspirate chemistry and cell count (no result recorded); decisions 3 (`fluid-interpretation`) and 4 (`aftercare-plan`) |
| `followup` | to 4 months | all four decisions answered | the reported course and outcome; the relative's follow-up account |

Staged results: the film and ultrasound give "Requested; the report comes back at the next stage" in the
deterioration phase, and the aspirate tests "No sample yet" before the tap, so an early order learns that the result
is pending rather than absent. The three examination findings are offered in the first two phases and labelled
"Examination at the deterioration"; no later examination is recorded.

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-family-history` — Hear her story from her relative (presentation, onset, birth, pregnancy, line, breathing
   support).
2. `obj-cot-side` — Look at her at the cot side and read her early notes (colour, work of breathing, responsiveness;
   early-course notes and PICC record).
3. `obj-first-steps` — First steps in the deterioration (decision 1; stop the PICC infusion or remove the line;
   escalate support; request the film and the echocardiogram).
4. `obj-imaging-plan` — Read the imaging and act on it (film and ultrasound; decision 2; tap, PICC removal, peripheral
   cannula).
5. `obj-fluid-recovery` — Interpret the new results and plan her recovery (aspirate analysis and culture; decisions 3
   and 4; family update).
6. `obj-outcome` — Look back at the reported course and outcome (the outcome record).

Titles and hints name no cause and no confirmatory test; hints are questions ("In a preterm baby with those lines who
is suddenly much worse, which causes are the most dangerous — and which can you check fastest at the cot side?") and
contain no option text (`cases validate` checks it).

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `bedside-priorities` | colour, work of breathing and responsiveness examined; birth and onset asked; early notes and PICC record read | support breathing, call senior help, stop everything through the PICC without flushing or pushing it in, urgent bedside film and echocardiogram, blood culture then antibiotics through new peripheral access | worsening RDS — more pressure and oxygen, another dose of surfactant, infusions running, film in the morning (**anchoring on prematurity**); late-onset sepsis treated through the suspect PICC, PN running, no imaging; bilateral blind needle decompression for a presumed tension pneumothorax |
| 2 | `imaging-plan` | decision 1; film, ultrasound and echocardiogram read (imaging phase) | line-related effusion: stop using and remove the PICC; check platelets and clotting, then an ultrasound-guided tap of the compromising side with cell count and differential, triglyceride, protein, glucose (paired with blood) and culture; peripheral fluids; rescan | congenital chylothorax — keep the PICC, MCT feeds and octreotide, no tap; PDA/fluid-overload heart failure — restrict fluids, furosemide, keep the PICC; "the tip is too high" — advance it 1 cm under the dressing and keep infusing |
| 3 | `fluid-interpretation` | decision 2; the aspirate's routine analysis, culture, chemistry and cell count read | fat probably present in a low-protein, culture-negative fluid; chyle and leaked parenteral nutrition both fit; the chylothorax label still needs the cell differential and triglyceride (with fat intake) and a fluid glucose compared with the blood | "ether-positive proves chylomicrons" — MCT, octreotide, surgeons (**the report's own label made certain**); "clear fluid excludes chyle, Rivalta-negative means overload"; "the PICC perforated the thoracic duct" (anatomically implausible) |
| 4 | `aftercare-plan` | decision 3; PICC removed and chest tapped | rescan for reaccumulation; peripheral nutrition for now and a new central line only if needed, tip confirmed outside the heart with the limb position recorded; chyle diets and octreotide only for a confirmed, persistent leak; incident report, honest disclosure, growth and development follow-up | re-site a PICC through the same vein to the same length on the old film; a two-week chylothorax regimen whatever happens; stop rescans, no report, tell the family it is "a common problem in premature babies" |

Single best answer each, 4 options, every option with its own 2–4-sentence feedback naming its guidance. Option ids
name content (`line-first`, `rds-rescue`…), never correctness. Length cue: the key is the longest option only in
decision 4 (both languages), which the lint allows once; in decisions 1–3 a distractor is at least as long as the key.

### Rubric (11 deterministic items, weight 29, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 2 | presentation, onset, birth, pregnancy, line, breathing support, nutrition, milk feeds and the line arm asked |
| `rb-examination` | examination | 2 | colour, work of breathing, responsiveness examined |
| `rb-records` | investigations | 2 | early notes and PICC record (deterioration), film and ultrasound (imaging), aspirate routine analysis (fluid) read |
| `rb-priorities` | management | 3 | decision 1 right first time |
| `rb-line-first` | **safety · critical** | 4 | the PICC infusion stopped (or the line removed) and the film and echocardiogram ordered **in the deterioration phase** |
| `rb-support-sepsis` | management | 2 | support escalated, monitoring, senior call, blood culture ordered, peripheral cannula, antibiotics |
| `rb-imaging-plan` | diagnosis | 3 | decision 2 right first time |
| `rb-drain-remove` | management | 3 | ultrasound-guided tap and PICC removal |
| `rb-fluid` | diagnosis | 3 | decision 3 right first time |
| `rb-aftercare` | management | 2 | decision 4 right first time |
| `rb-no-line-harm` | **safety · critical** | 3 | none of: keeping the PICC infusions running, a hard flush, advancing the catheter (`scoredWhen`: decision 1 attempted or any of the three harms) |
| `rb-communication` | communication (examiner) | 1 | Calgary–Cambridge with the relative: what they know and fear, plain explanation, the line as the likely cause with the chyle-versus-infusate uncertainty, acknowledgement without blame, reporting, no false reassurance, the plan, teach-back |

Both critical items are **acts**. `rb-line-first` cannot be earned in hindsight: the imaging phase opens only once
the first steps (objective 3) are done, so the stop and the two orders always precede any imaging result — and a
learner who never does them never sees the imaging. `rb-no-line-harm` counts only once a harm was possible, so doing
nothing earns 0.

### How wrong choices score (measured 2026-10-30, engine replay)

| Path | Score | Critical items missed | Notes |
|---|---:|---|---|
| Reference `solution` | 29/29 (100 %) | — | no contraindicated action |
| Do nothing (start, finish refused) | 0/26 | `rb-line-first` | `rb-no-line-harm` not scored: no harm became possible |
| Wrong first answer at every decision, then right | 18/29 (62 %) | — | loses the four first-try items |
| Anchored on RDS: decision 1 "worsening RDS" first, another surfactant dose, infusions kept running, then corrected | 23/29 (79 %) | `rb-no-line-harm` | keeping the infusions running is a safety event with harm text |
| A hard flush and the infusions kept running before the stop | 26/29 (90 %) | `rb-no-line-harm` | two safety events |
| Decision 2 "advance the line" first, the catheter advanced, then corrected | 23/29 (79 %) | `rb-no-line-harm` | safety event |
| No blood culture, antibiotics, monitoring or senior call | 27/29 (93 %) | — | loses `rb-support-sepsis` |
| The report's recorded steps only (support, taps, removal; correct decisions), no stop, echocardiogram or sepsis work-up | 13/29 when abandoned | `rb-line-first` | stuck in the deterioration phase: the imaging never comes back; the tap before imaging is a safety event |
| Antibiotics before the blood culture; a tap before any imaging | 29/29 | — | safety events only (`contraindicatedWhen`): the rubric cannot express order |

Contraindicated actions are named in the debrief but, as everywhere in the library, do not lower the score by
themselves; the three line harms that matter most are scored through `rb-no-line-harm`.

## Reference path (`solution`)

72 steps: start → presentation, onset, associated symptoms → colour, work of breathing, responsiveness → birth, line,
breathing support, nutrition → early notes, PICC record → decision 1 → stop the PICC infusion → senior call →
escalate support → monitoring → peripheral cannula → blood culture → antibiotics → blood count, clotting, blood gas
(no results recorded) → infusion chart (not recorded) → order ultrasound, film and echocardiogram (echocardiogram: no
result recorded) → the remaining history (pregnancy, antenatal steroids, resuscitation, feeds, weight, temperature,
tummy, the arm, antibiotics, worries) → (imaging) film, ultrasound, echocardiogram, venous Doppler → decision 2 →
ultrasound-guided tap → PICC removal → (fluid) aspirate routine analysis, culture, chemistry, cell count → decision 3 →
family update → decision 4 → (follow-up) the outcome record → the relative's follow-up account → finish.
`cases verify`: objectives 6/6, decisions 4/4, utterances 39/39, rubric 29/29. The demonstration asks only questions a
clinician would put to the relative of a 7-day-old preterm baby (1.0.0 asked about her operations, environmental
exposures, daily activities and "baseline living situation").

## Clinical numbers check

**Extraction table (STANDARD §6.2).** Every patient fact, its field in 1.0.0 and its field now. The source check is
pending: none of these has been compared with the full article.

| Fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| female, 7 days old | `patient.age`, `patient.sex`, title | `patient.age` / `ageUnit` (unchanged), title, triage note, decision 1 |
| breathing increasingly laboured; turned blue | `history.presentation` | `history.presentation`, chief complaint, opening line, triage note |
| breathless since birth; markedly worse on catheter day 5 | `history.onset` | `history.onset`, early-course notes, decision 1 |
| respiratory support escalated; bilateral pleural fluid and ascites found later | `history.progression` | `resp-support` response; film and ultrasound results (imaging phase); outcome record — removed from the history, where it gave the imaging away in the first phase |
| poor responsiveness; marked chest recession | `history.associated` | `history.associated` |
| caesarean at 33+3 weeks; birth weight 1.1 kg | `history.pmh` | `history.birth`, early-course notes, triage note, decision 1 |
| PICC through the right basilic vein on day 2 | `history.operations` | `history.line` (lay words), PICC record, decision 1 |
| respiratory support, surfactant, parenteral nutrition | `history.medications` | `history.breathing-support`, `history.nutrition`, early-course notes, triage note |
| delivery because of severe maternal pre-eclampsia | `history.family` | `history.pregnancy`, early-course notes |
| early: symmetrical chest movement, mild recession, coarse breath sounds ("肺音粗") | `exam-1` | early-course notes (a record of an earlier examination, not a current finding; "呼吸音粗" is the standard term) |
| at the deterioration: cyanosis, marked recession, very poor responsiveness | `exam-2` | `exam.colour`, `exam.work-of-breathing`, `exam.responsiveness` |
| tip at the lower border of T3; later films described the position as unchanged | `investigations.line` | PICC record (insertion position), bedside film result (later films) |
| bilateral effusions with atelectasis; on ultrasound more on the right, small ascites | `investigations.imaging` | bedside film result; bedside ultrasound result |
| clear pale-yellow fluid, ether test positive, Rivalta negative; culture negative | `investigations.fluid` | aspirate routine analysis (structured `values`); aspirate culture |
| after drainage and PICC removal the effusions and ascites resolved; back to CPAP; 54 days in hospital; 2.4 kg at discharge; growth and development normal at 2 and 4 months | `investigations.outcome` | outcome record (follow-up phase), `history.status-followup`, `thoracentesis` and `remove-picc` responses |
| 20–30 mL per tap | `decisions.management.options[1]` ("照抄每次 20–30 mL"), its feedback | outcome record, `thoracentesis` response, teaching point 3 |
| the report's label: chylothorax (bilateral, with ascites, PICC-caused, VLBW infant) | citation title; `decisions.interpretation.options[0]` | outcome record, decision 3 prompt ("the team calls it chylothorax"), debrief |

**Values with units and derived values.**

* Birth weight 1.1 kg (1100 g) — **very low birth weight** by definition (< 1500 g), as the article's title says. Its
  centile at 33+3 weeks is not stated in the case (no chart value was verified); facilitators may plot it.
* Taps of 20–30 mL ÷ 1.1 kg birth weight ≈ **18–27 mL/kg** (derived; her weight on day 7 is not recorded, so the true
  mL/kg is unknown). Number of taps, sides and total: not recorded.
* Day counting: PICC on day 2 of life + catheter day 5 = day 7 of life if the insertion day is catheter day 0; the
  report's counting is not stated (to verify).
* Discharge: 2.4 kg after 54 days in hospital — a gain of 1.3 kg on the birth weight, about 24 g/day over the stay
  (derived; whether she was admitted at birth is not recorded). If she was, she went home at about 41+1 weeks'
  postmenstrual age (33+3 weeks + 54 days; derived, not stated).
* Follow-up "at 2 and 4 months": whether chronological or corrected age, or months after discharge, is not stated.
* Teaching thresholds and doses (formulas, never patient values): chyle triglyceride > 1.1 mmol/L with oral fat
  intake, ≥ 1000 cells/µL, > 80 % lymphocytes (Büttiker 1999); antibiotics within 1 hour of the decision, after the
  blood culture, narrow-spectrum combination such as flucloxacillin plus gentamicin for late-onset infection in a
  neonatal unit, review at 48 hours (NICE NG195); short-term peripheral parenteral nutrition when a central line has
  to come out (NICE NG154). No weight-based dose is printed for her: her current weight is unknown.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "When the nurse said 'she's blue and hardly responding', what went through your mind first?"
2. **Description** — "In two sentences: what did you find at the cot side, and what did you do before the films came
   back?"
3. **Analysis**
   * "She has a PICC and parenteral nutrition. Which line complications can kill her in the next hour, and which test
     excludes the worst of them?"
   * "Why stop the infusion rather than flush the line to see if it works?"
   * "The insertion film put the tip at the lower border of T3 and later films said 'unchanged'. Where should it be, and
     what does 'unchanged' not tell you?"
   * "You tapped 20–30 mL. What is that per kilogram for a baby born at 1.1 kg — and why don't we know her real figure?"
   * "Clear, ether-positive, Rivalta-negative fluid in a baby who has had parenteral nutrition: chyle, or what was
     running into her?"
   * "Could a line in the right basilic vein tear the thoracic duct? Then how do both sides and the abdomen fill?"
   * "She recovered after the taps and the line came out. What does that prove?"
   * "Her relative asks: 'Was it that tube in her arm?' What do you say?"
4. **Summary** — "What will you do first the next time a baby with a central line deteriorates?"

### Common learner errors and how the case surfaces them

| Error | What the case does | Where it scores |
|---|---|---|
| Anchoring on prematurity/RDS (more support, more surfactant) | decision 1 distractor; extra surfactant answered with an explanation | `rb-priorities` |
| Keeping the infusions running, flushing hard, pushing the line in | three contraindicated interventions with harm text; decision 2 distractor | `rb-no-line-harm` (critical), `rb-imaging-plan` |
| No echocardiogram — tamponade never excluded | the echocardiogram is in the decision 1 key and in the gate to the imaging phase; its result is honestly "not recorded" | `rb-line-first` (critical) |
| Using the suspect line for antibiotics | decision 1 distractor; antibiotics need the new peripheral cannula | `rb-priorities`, `rb-support-sepsis` |
| Antibiotics before the culture | contraindicated until the blood culture is ordered | debrief safety events |
| A blind tap before any imaging | contraindicated until the film or ultrasound is read | debrief safety events |
| Calling the fluid chyle on an ether test — or excluding chyle because it is clear | decision 3 distractors | `rb-fluid` |
| Thoracic-duct "perforation" by a right-sided line | decision 3 distractor with the anatomy | `rb-fluid` |
| Treating the label (MCT, octreotide for two weeks) | decisions 2–4 distractors (octreotide is not offered as an intervention: listed from the start, its name would point to the diagnosis) | `rb-aftercare` |
| Re-siting through the same vein to the same length on an old film | decision 4 distractor | `rb-aftercare` |
| Not telling the family, or calling it "a problem of prematurity" | decision 4 distractor; examiner-judged communication item | `rb-aftercare`, `rb-communication` |

### Teaching points (debrief)

1. Line first: any deterioration with a central line raises infection, extravasation and tamponade (BAPM 2015, revised
   2018); stop the line, film and echocardiogram, blood culture before antibiotics within 1 hour (NICE NG195).
2. Tip position: outside the cardiac silhouette (BAPM 2018) and the pericardial sac (ESPGHAN/ESPEN/ESPR/CSPEN 2018);
   vertebral levels are proxies; record the limb position; "unchanged" is not "intact".
3. Line-related effusion: no infusion through a suspect line, other access (INS 2024); ultrasound-guided tap in mL/kg;
   removal; short-term peripheral nutrition (NICE NG154).
4. Chyle or infusate: Büttiker 1999 criteria; what an ether test and a Rivalta test can and cannot show; the glucose
   comparison.
5. Treating chylothorax in steps (Büttiker 1999) and the absent trial evidence for octreotide (Cochrane 2010).

Related case for a second session: `cmcr-655471`, another preterm infant with pleural fluid, whose re-authoring is
separate; check its current version before pairing them.

## Embodied mode

* **Where things are (`general-hospital`).** The baby lies in an ICU bed (`setting: icu`) that stands in for a NICU cot
  (the ICU has an incubator, monitors, ventilators with non-invasive modes, infusion pumps and the crash trolley); she
  is never moved in the reference path. History and examination are at the cot side; the relative answers
  (`patient.nonVerbalWhen: {always: true}`, reason "a 7-day-old premature baby; her relative answers the history"),
  and the opening line is the relative's. Record reviews (early notes, PICC record, infusion chart, the outcome
  record) are read at the ICU nurses' station (`records`) or in the notes at the bedside. The film, ultrasound,
  echocardiogram and venous Doppler are bedside studies (`performedAt: "bedside"`; `xray`, `ultrasound`,
  `echocardiography`); bloods and the aspirate tests are sampled at the patient.
* **IV access.** The PICC is in situ but suspect from the first minute, so `extensions.embodied.ivAccessInSitu` is
  `false`: the case's IV-access procedure is the new peripheral cannula (`iv-access`, cannulation kit from the crash
  trolley), and IV antibiotics and furosemide need it first. Stopping the PICC infusion (`scope: nursing`), removing
  the PICC and the tap need only the clinician at the cot side; respiratory escalation needs the bed's ventilator.
* **Capability check.** Everything the case needs exists in `general-hospital` (`caseCapabilityGaps` is empty).
* **Demonstration (2026-10-30).** `embodied-autopilot.test.ts -t "cmcr-70094:"` passes (en and zh-CN) with the
  clinical-mode score.
* **Limits.** No incubator, CPAP prongs or neonatal ventilator cue on the patient model; the film and the scans are
  ordered as bedside studies, so nobody is moved.

## Source and adaptation (fidelity limits)

**From 1.0.0 (kept as fact, not yet checked against the article).** Everything in the extraction table above.

**Adapted for teaching.** The relative (which relative is not recorded; role `carer`, named "杨予宁的家属（化名）" /
"Yang Yuning's relative (pseudonym)") and all dialogue in lay first person; the relative's worries (an ICE item that
adds no clinical fact); the staff (Dr Shen, Nurse Xu, Dr Gao); the four phases and their staging (the film and
ultrasound come back after the first steps, the aspirate results after the tap — the timing of every test is
unrecorded); the nurse calling the learner to the cot side; the ICU bed; the decisions, interventions, rubric and
feedback (current guidance); the "Examination at the deterioration" label on the recorded findings; the early
examination moved from the bedside to the early-course notes (it describes an earlier time, not the deterioration).

**Inconsistencies and ambiguities kept, not resolved.**

* The fluid is recorded as **clear (透明)** while the **ether test was positive** — a positive test classically means a
  turbid fluid that clears with ether. Both are shown; the debrief uses only "fat probably present".
* 1.0.0's imaging summary ("双侧胸腔积液伴肺不张，超声示右侧更多并有少量腹水") does not name the modality of the first
  finding; the case puts the effusions with atelectasis on the film (with a result note saying the modalities are not
  separated in the record) and right > left with ascites on the ultrasound.
* "培养阴性" sits in the pleural fluid result (1.0.0's English pluralised it to "cultures"); the case reads it as the
  pleural fluid culture and records no blood culture.
* Day counting: day 2 of life + catheter day 5 = 7 days only if the insertion day is day 0.
* "转回 CPAP" implies she had been on CPAP before the escalation, but her mode of support before the deterioration is
  not stated; the case says only "respiratory support" before and "returned to CPAP" after.
* "住院 54 天" is read as the length of stay; whether she was admitted at birth is not stated.

**What 1.0.0 claimed about the article and this version does not.** 1.0.0 wrote author inferences into the records
("未提供血管造影证明漏点" / "no venographic leak point was demonstrated"; "未列甘油三酯或乳糜微粒" / "triglycerides and
chylomicrons were not supplied") and its unknown answers said "the source notes do not provide that information". The
records now hold only the recorded findings; missing tests read "No result is recorded for this test" or "This case
does not record…", and the relative says "I'm not sure, doctor."

**Unknowns kept honest** (`unknowns`, 8 unknown history items, 10 tests without a recorded result,
`examNotRecorded`): vital signs, blood gases, support settings and whether she was intubated, her day-7 weight; what
ran through the PICC and whether she was fed; catheter size, inserted length, film timings and arm position, the
length withdrawn; echocardiography and venous Doppler; the aspirate's cells and chemistry, the sides and number of the
taps, ascites sampling; blood culture, blood count, CRP, clotting, albumin, glucose, triglycerides, antibiotics; time to
resolution, nutrition and access after removal, any new central line, how growth and development were assessed.

**Privacy.** Pseudonym unique across the CMCR cases (unchanged from 1.0.0); no hospital, date, place or occupation;
times are days of life and catheter days. Authors' names only in the citation. No media are approved for this case
(the media review lists none), so it has no assets.

**Survey findings addressed** (audit of cmcr-70094):

* *No interventions* → 14: the report's steps (support escalation, tap, PICC removal), today's steps (stop the
  infusion, senior call, monitoring, peripheral cannula, antibiotics after the culture, family update) and the traps
  (infusions kept running, hard flush, advancing the catheter; low-value surfactant and furosemide).
* *Tamponade never taught; no echocardiogram* → decision 1 key, the critical item, an echocardiogram record ("No result
  is recorded"), BAPM 2018 in feedback and teaching point 1.
* *Chyle versus PN infusate not taught* → decision 3, teaching point 4, the infusion chart (not recorded), the aspirate
  chemistry and cells (not recorded).
* *Tip position never taught* → teaching point 2, decision 2 distractor, radiologist brief. The survey's "T4–T6" target
  was **not** adopted: published neonatal landmarks differ (secondary summaries of NANN guidance give T2–T4 for upper-body tips; the Safer
  Care Victoria neonatal guide says above T4 — both to verify), so a tip at the lower border of T3 is not keyed as malpositioned, and no
  insertion-time decision (the survey's optional D0) was added.
* *Thoracic-duct injury treated as plausible* → decision 3 distractor with the anatomy; key reasoning 3.
* *Ether/Rivalta presented without context; inferences in records* → records hold findings only; meaning in feedback
  and teaching points.
* *Decisions staged after the results that answer them; hindsight critical item; strawman options; spoiler in
  feedback* → four decisions at the bedside, imaging, fluid and aftercare points, each opening before the next result;
  two act-based critical items; four realistic options each; no outcome in mid-case feedback.
* *20–30 mL without context* → in the outcome record and the tap response, in mL/kg against the birth weight in
  teaching point 3, with the unknown day-7 weight said.
* *Adult template history, "educational role" companion, clinical register in the carer's mouth, the progression item
  revealing the imaging* → 18 neonatal items in lay words, a relative named by relation, the imaging only in records.
* *Title naming the catheter; "female"; triage note "presenting"* → title "Worsening breathing in a preterm baby ·
  7-day-old girl"; spoiler-free summary; an in-unit handover.
* *No guideline cited; generic outcomes, teaching points and rubric* → eight named guidelines, six outcomes, five
  dated teaching points, a case-specific rubric and communication item.
* *Decisions gated on the unknown allergy item* → gates on examination, history and records only.
* *ICU bed for a 1.1 kg baby not explained* → Embodied mode above.
* *Citation format (double spaces, "(01)")* → "2014;21(1):64".
* *SGA not stated* → VLBW stated; the centile is left to the facilitator because no chart value was verified.

## Matcher notes

* 39 `extensions.testUtterances` (22 zh-CN, 17 en; 4 look-alike negatives), none equal to a canonical question or a
  keyword; every required item has 2–4 paraphrases; `cases verify` 39/39 with no extra selections.
* Overlaps separated with `excludeKeywords`: `birth` excludes current-weight and "why" words so "why did they deliver
  her early?" reaches `pregnancy` and "what does she weigh now?" reaches `current-weight`; `onset` excludes line-timing
  words so "when did the PICC go in?" reaches `line`; `line` excludes "running"/"nutrition"/"swollen" so "what's
  running through her drip?" reaches `nutrition` and "is the arm swollen?" reaches `arm`; `breathing-support`
  excludes listening and breath-sound words so "I'll listen to both sides" selects nothing; `nutrition` and `feeds`
  exclude each other's words (drip vs milk); `pregnancy` excludes steroid/magnesium words for `antenatal-steroids`.
* `status-followup` (follow-up phase) supersedes `presentation`.
* Run-together English keywords where a phrase would reduce to one token (`whatshappened`, `whatsgoingon`,
  `whywasicalled`, `whendidthisstart`, `kickoff`, `differentabouther`, `whatsrunning`, `howisshenow`); `cases validate
  --strict` reports none.
* Keywords carry no answer content: no "blue", "caesarean", "pre-eclampsia", "basilic" or "chest sucking in" (the
  line item keeps "PICC", which the triage note already gives). The work-of-breathing examination excludes listening
  words, so "listen to her chest" returns the honest "This case does not record this examination."

## References

1. 黄上明, 杨英梅, 肖万祥, 邹彩艳. 外周穿刺中心静脉置管致极低出生体重儿双侧乳糜胸并腹水一例. 中国小儿急救医学.
   2014;21(1):64. doi:10.3760/cma.j.issn.1673-4912.2014.01.027. Available from: https://rs.yiigle.com/cmaid/70094
2. British Association of Perinatal Medicine. Use of Central Venous Catheters in Neonates: a BAPM Framework for
   Practice. London: BAPM; 2015 (revised 2018).
3. 中国医师协会新生儿科医师分会循证专业委员会. 新生儿经外周置入中心静脉导管操作及管理指南（2021）. 中国当代儿科杂志.
   2021;23(3):201-212. doi:10.7499/j.issn.1008-8830.2101087
4. Nickel B, Gorski L, Kleidon T, et al. Infusion Therapy Standards of Practice, 9th Edition. J Infus Nurs.
   2024;47(1S Suppl 1):S1-S285. doi:10.1097/NAN.0000000000000532
5. Kolaček S, Puntis JWL, Hojsak I; ESPGHAN/ESPEN/ESPR/CSPEN working group on pediatric parenteral nutrition.
   ESPGHAN/ESPEN/ESPR/CSPEN guidelines on pediatric parenteral nutrition: Venous access. Clin Nutr. 2018;37(6 Pt
   B):2379-2391. doi:10.1016/j.clnu.2018.06.952
6. National Institute for Health and Care Excellence. Neonatal parenteral nutrition. NICE guideline NG154. London:
   NICE; 2020.
7. National Institute for Health and Care Excellence. Neonatal infection: antibiotics for prevention and treatment.
   NICE guideline NG195. London: NICE; 2021.
8. Büttiker V, Fanconi S, Burger R. Chylothorax in children: guidelines for diagnosis and management. Chest.
   1999;116(3):682-687. doi:10.1378/chest.116.3.682
9. Das A, Shah PS. Octreotide for the treatment of chylothorax in neonates. Cochrane Database Syst Rev.
   2010;(9):CD006388. doi:10.1002/14651858.CD006388.pub2

The same strings are `debrief.references`. Checked on 2026-10-30 by web search (the publisher and PMC hosts are not
reachable from this environment, so no full text was read): ref. 1 — DOI from the source map (`verifiedDoi`,
publisher check 2026-10-29); ref. 2 — BAPM resource page and later citations (all central catheter tips outside the
cardiac silhouette; any deterioration with a CVC should raise infection, extravasation and tamponade); ref. 3 — title,
issuing committee, issue, pages and DOI on the journal's record (its tip-position recommendation could not be read:
see *To verify*); ref. 4 — PubMed record (PMID 38211609) with the DOI; the malposition principle (no infusion through a
malpositioned CVAD; other access) from secondary sources citing INS; ref. 5 — citation and DOI on repository records,
and the ESPGHAN advice guide based on it (tip outside the pericardial sac); ref. 6 — NICE pages (central venous
catheter for neonatal PN; peripheral access when short-term or when a central line has to be removed); ref. 7 — NICE
pages (blood culture before the first dose; antibiotics within 1 hour of the decision; flucloxacillin plus gentamicin
as an example narrow-spectrum combination for late-onset infection in a neonatal unit; consider stopping at 48 hours);
ref. 8 — abstract and DOI (the three criteria; fat-free feeding, then PN with enteric rest, then pleurodesis); ref. 9 —
Cochrane records (no randomised trials; 19 case reports of 20 neonates; no practice recommendation).

## To verify

**In the source article** (the source pass):

* The day counting (PICC on day 2 of life; "置管第 5 天"; age 7 days) and whether 1.1 kg is exactly 1100 g.
* Vital signs, blood gases and the respiratory support before and after the deterioration — the mode before (CPAP?),
  what "逐步升级" meant (intubation? settings?) and when she returned to CPAP; her weight on day 7.
* The PICC: catheter size and material, inserted length, how and when the tip was confirmed at "第 3 胸椎下缘", the arm
  position on that film, how many later films said "位置同前" and when; any contrast study (1.0.0's "未提供血管造影证明漏点").
* What ran through the PICC: the parenteral nutrition (glucose concentration, amino acids, lipid emulsion and dose),
  rates, other drugs; whether lipid was running when the effusions appeared; enteral feeding before and after.
* The imaging: which modality showed the bilateral effusions with atelectasis; ultrasound depths; the amount of
  ascites; any echocardiogram (pericardial fluid, ductus) or venous Doppler.
* The taps: timing relative to PICC removal, sides, number, ultrasound guidance, volume per tap (20–30 mL in 1.0.0) and
  total; a chest drain; whether the ascites was sampled.
* The pleural fluid verbatim: the appearance wording (clear vs turbid, given the positive ether test), Sudan stain,
  cell count and differential, protein, glucose, LDH, triglyceride, cholesterol, with units and reference ranges; which
  culture(s) were taken (pleural, blood).
* Other bloods: blood count (lymphocytes, platelets), CRP, blood culture, albumin, glucose, triglycerides, clotting.
* Treatment after the diagnosis: feeding changes (fasting, MCT), octreotide, albumin, antibiotics, diuretics,
  alternative access for nutrition, any new central line.
* The course: time to resolution, any reaccumulation, complications; whether "住院 54 天" is the length of stay or her
  age; the follow-up timing (chronological, corrected or post-discharge) and how growth and development were assessed.
* The authors' discussion: the mechanism they proposed, the chylothorax criteria they used, the tip standard they cited
  and their prevention advice.
* Confirm that the article has no figures or tables (the media review lists none).

**Guidance details:**

* 中国医师协会新生儿科医师分会 2021 neonatal PICC guideline: its exact upper-limb tip recommendation (vertebral levels,
  cavoatrial junction, outside the cardiac silhouette), confirmation methods (X-ray, ultrasound, ECG) and the
  management of pleural/pericardial effusion it recommends — the page could not be opened here.
* BAPM: whether the July 2026 framework ("Use of Central Venous Access Devices in Neonatal Units", reported by a
  secondary source; a consultation draft is listed on bapm.org) supersedes the 2018 framework, and what it says on
  point-of-care ultrasound for tip confirmation and on tamponade.
* INS 2024: the exact wording on malposition (no infusion; alternative access), on flushing (syringe size, no force)
  and on re-advancing an externally migrated catheter (the case states the sterile-field principle without attributing
  it to INS).
* ESPGHAN/ESPEN/ESPR/CSPEN 2018 venous access: the exact infant tip recommendation (distance from the heart) and its
  grading.
* NICE NG195: the current version and the late-onset regimen wording for babies with central lines (a UK survey found
  wide local variation, often vancomycin); NICE NG154: the peripheral-PN wording and any osmolarity limit.
* Büttiker 1999: whether "fat-free" feeding there means MCT-based formula.
* Cochrane CD006388: whether any update after 2010 exists (some pages carry a 2022 issue label with the 2010 DOI).
* The interpretive statements used in feedback: that a positive ether (乳糜) test indicates fat without proving
  chylomicrons; that a negative Rivalta test indicates low protein; that leaked parenteral nutrition gives a fluid
  glucose far above the blood glucose (from neonatal case reports, no validated cut-off); that congenital chylothorax
  usually presents before birth or in the first days.
* The vertebral landmarks quoted for upper-limb neonatal PICC tips (NANN guidance, Safer Care Victoria, the Chinese
  2021 guideline), used here only to show that they differ.
* The European RDS consensus 2025 (Neonatology 2026, doi:10.1159/000551062) was found but could not be read; it is not
  cited, and no saturation target is quoted.

**Clinician input:** a neonatologist should review decisions 1 and 2 (especially whether the stopped PICC should stay in
place until the echocardiogram, and the empirical antibiotic choice with a central line) and the communication item.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Case card.** Title "早产儿呼吸困难加重 · 7日龄女婴" / "Worsening breathing in a preterm baby · 7-day-old girl"
  (1.0.0's named the catheter); a spoiler-free summary; specialty `neonatology` + `critical-care`; topic tags; difficulty
  4, 35 minutes; six learning outcomes.
* **Provenance.** Vancouver citation with the verified DOI and the yiigle URL; `review.status: editorial`, eight named
  guidelines, the §6.6 notes; the published-case disclaimer; `extensions.sourceDoi` + `doiVerifiedAt`,
  `sourceTextChecked: false`, `embodied.ivAccessInSitu: false`; `authorChecks` and `sourceTextSha256` removed until the
  source pass.
* **Patient and voice.** A relative named by relation answers for the non-verbal baby; a lay chief complaint and opening
  line; a clinical handover as triage note (1.0.0's was an instruction about records); infant appearance.
* **History.** 15 template slots (7 saying "the source notes do not provide that information", adult questions about
  operations, exposures and daily activities, a progression item that gave the imaging away) → 18 neonatal items: 9
  recorded facts in lay words, one ICE item and 8 honest unknowns; six required; `excludeKeywords` for the overlaps; a follow-up twin.
* **Examination.** 2 compound "review the record" items → 3 manoeuvres at the deterioration; the early examination moved
  to the early-course notes.
* **Investigations.** 4 compound records → 18 single tests: the recorded findings structured (PICC record, film,
  ultrasound, aspirate analysis and culture, outcome), staged across phases, with honest "no result is recorded" entries
  for the echocardiogram, venous Doppler, blood culture, gas, count, clotting, CRP, chemistry and the aspirate's
  chemistry and cells.
* **Interventions.** None → 14 (the report's steps, today's steps, three line harms, two low-value steps).
* **Decisions.** 3 template decisions (option ids `supported`, `alternative-1/2`; management decided after the fluid
  results; a hindsight critical item) → 4 decisions at the real decision points with content ids, four options each,
  feedback naming the guidance, length cue in one decision only.
* **Rubric.** 11 template items → 12: first-try decision items, care items, two act-based critical items (the line-first
  steps gated before any imaging; line harms with `scoredWhen`), a case-specific Calgary–Cambridge communication item.
* **Staff, debrief, matcher.** Attending, nurse and radiologist briefs written for the case; a conclusion within 1,000
  characters, five key reasoning steps, five dated teaching points contrasting the report with current practice, seven
  unknowns, nine references; 39 hand-written test utterances with four negatives.

### 1.0.0 — 2026-10-28

* Initial template-generated version (PR #5).

## Validation

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-70094/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-70094 --lang en        # 72 steps · objectives 6/6 · decisions 4/4 · utterances 39/39 · rubric 29/29
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-70094          # PASS: depth floor, do-nothing 0, wrong-first 62 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-70094:"                      # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-70094:"       # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 女婴孕 33+3 周因母亲重度子痫前期剖宫产，出生体重 1.1 kg（极低出生体重），生后即气促；早期查体胸廓对称、
轻度三凹征、呼吸音粗；用过呼吸支持、肺表面活性物质和静脉营养。生后第 2 天经右侧贵要静脉置入PICC，定位片示尖端位于第 3
胸椎下缘。置管第 5 天（7日龄）呼吸明显加重：发绀、三凹征明显、反应极差，呼吸支持升级。影像示双侧胸腔积液伴肺不张，超声
示右侧较多，并有少量腹水；之后的胸片描述尖端位置同前。胸水淡黄透明，乙醚试验阳性，李凡他试验阴性，培养阴性；细胞、
甘油三酯、蛋白和葡萄糖没有结果记录。胸腔穿刺（每次 20–30 mL）并拔除PICC后，积液和腹水消退，转回CPAP；住院 54 天，体重
2.4 kg 出院；2 个月和 4 个月随访生长发育报告正常。报告诊断为PICC所致双侧乳糜胸并腹水；按已记录的检查，乳糜与外渗的输注
液无法区分，右侧贵要静脉导管也不经过胸导管开口。本版事实沿用1.0.0版，尚未对照原文核对。

**学习目标。**
1. 带中心静脉导管的新生儿恶化时先想导管：停输注不冲管，急查胸片和超声心动图（BAPM 2018）。
2. 按“中心静脉、心脏之外”判断PICC尖端，椎体平面只是近似，记录肢体位置，脱出段不再送入（BAPM 2018；ESPGHAN 2018）。
3. 导管相关积液：停用并拔管，超声引导穿刺（按mL/kg），胸水完整送检，短期外周营养（NICE NG154，2020）。
4. 运用儿童乳糜标准（Büttiker 1999），说明外观、乙醚试验和李凡他试验为何区分不了乳糜和输注液。
5. 乳糜胸专门治疗只用于确诊且持续的乳糜漏；奥曲肽无随机对照试验（Cochrane 2010）；评价报告的诊断和因果推断。
6. 如实向家属说明可能的导管并发症，上报不良事件，安排随访。

**关键决策。** ① 床旁第一步：支持呼吸、呼叫上级、停止经PICC的全部输注（不冲管、不推送）、急查床旁胸片和超声心动图、取血
培养后经外周静脉给抗生素（“呼吸窘迫综合征加重”是锚定陷阱）；② 影像后：按导管相关积液处理，停用并拔除PICC，查血小板和凝血
后超声引导穿刺，胸水送细胞分类、甘油三酯、蛋白、葡萄糖（对照血糖）和培养；③ 胸水只说明可能含脂肪、蛋白不高，分不清乳糜
和外渗的营养液，“导管穿破胸导管”在解剖上不成立；④ 恢复期：超声复查、短期外周营养、确需再置中心静脉时影像确认尖端，乳糜
饮食和奥曲肽只用于确诊且持续的乳糜漏，上报并如实告知，安排生长发育随访。关键项：影像回报前停用PICC输注并申请胸片和超声心动
图；没有继续经可疑PICC输注、用力冲管或推送导管。

**复盘要点（PEARLS）。** 先谈感受；复述影像回来之前做了什么；分析：带管新生儿恶化时哪些导管并发症最致命、哪项检查最先做，
为什么停输注而不是冲管，第 3 胸椎下缘和“位置同前”说明了什么，20–30 mL 合每千克多少，清亮、乙醚试验阳性的胸水是乳糜还是
输注液，右侧导管能否损伤胸导管，好转能证明什么，怎样回答家属“是不是那根管子的问题”；总结下次遇到带中心静脉导管的新生儿
恶化时首先做什么。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核，患者事实尚未对照原文全文核对。
