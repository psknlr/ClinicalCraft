# cmcr-1551889 — Abnormal fetal heart scan at 32 weeks · 26-year-old woman

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title, summary,
> chief complaint, tags and triage note name no diagnosis. The patient (曹知远 / Cao Zhiyuan) is pseudonymous; the case
> is a teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患者为化名；本病例改编自已发表的病例报告，不构成医疗建议。
>
> **Status of the facts.** Version 1.1.0 was re-authored from the facts that version 1.0.0 extracted from the report.
> The full article was not available; no patient fact has been added or changed, and none has yet been checked against
> the full text (`extensions.sourceTextChecked: false`). The "To verify" list names what to look for in the source.

## Case card

| | |
|---|---|
| Case | `cmcr-1551889` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 葉柳虹. 產前診斷胎兒雙主動脈弓：病例個案及文獻回顧. 鏡湖醫學. 2025;25(1):60-61 (DOI pending verification) |
| Setting / facility | Antenatal clinic (`outpatient`) → postnatal ward → records of the outcome · `general-hospital` |
| Difficulty / time | 4 / 5 · about 35 minutes (static clock; four phases, five decisions, 11 interventions) |
| Specialty | Obstetrics (fetal medicine), neonatology, cardiology, genetics |
| Languages | zh-CN (source language), en |
| Learner level | Final-year students; obstetric, paediatric and neonatal residents; sonographers and midwives in fetal medicine |
| Review status | Editorial review 2026-10-30 and an independent editorial review 2026-11-14 (both AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; patient facts not yet checked against the full article. Have a fetal medicine specialist, a paediatric cardiologist and a clinical geneticist review it before teaching use |
| Content | 29 history items (8 not recorded, 6 partly recorded, 10 required) · 0 examination findings (none recorded) · 16 investigations (all record reviews; 8 without any recorded result) · 11 interventions (3 contraindicated) · 6 objectives · 5 decisions (20 options) · 12 rubric items (11 deterministic, weight 29; 1 examiner-judged; 2 critical) · 4 staff characters · 6 learning outcomes · 6 teaching points · 39 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Recognise a fetal aortic arch anomaly on the three-vessel-and-trachea view when the four-chamber and outflow-tract
   views are normal, as the ISUOG 2023 screening guideline expects.
2. Distinguish a double aortic arch from a right arch with an aberrant left subclavian artery, a mirror-image right arch
   and a left arch with an aberrant right subclavian artery, using the arch–trachea relationship and the origin of each
   subclavian artery.
3. After an abnormal arch view, arrange a specialist fetal echocardiogram, genetic counselling with an offer of
   chromosomal microarray, which detects 22q11.2 deletion, and a written perinatal plan (ASE 2023; AHA 2014).
4. Explain that a declined prenatal test leaves the 22q11.2 status unknown, and plan the baby's genetic test, calcium
   and T-cell counts after birth, with irradiated cellular blood components for surgery until the T-cell counts show
   they are not needed (22q11.2 Society 2023; BSH 2020).
5. Plan a term birth with the mode set by obstetric indications and an informed neonatal team, and treat cough after
   crying or feeds, wheeze or a need for respiratory support in the newborn as tracheal compression that calls for CT
   angiography and surgical division of the non-dominant arch.
6. Counsel a pregnant woman about an unexpected fetal finding with the Calgary–Cambridge approach: explore her worries,
   explain what is certain and what is not in small steps, and respect the couple's decision about invasive testing.

These are `learningOutcomes`. They name the diagnosis, so front-ends show them before play only behind the closed
**Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief (CASE_AUTHORING §9.4,
GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A 26-year-old woman in her first pregnancy attends for her antenatal ultrasound at 32+2 weeks. She has beta
thalassaemia; in this pregnancy she has had anaemia, blood-sugar problems and threatened preterm labour, for which she
received nifedipine and dydrogesterone (for contractions) and betamethasone (for fetal lung maturation; doses and timing
not recorded); she tested positive for COVID early in the pregnancy. There is no relevant personal or family
cardiovascular history. The first- and second-trimester screening scans had not identified this heart finding.

Today fetal growth, amniotic fluid and placental position are reported normal, and cardiac situs, the four-chamber view
and the outflow tracts are normal. The **three-vessel-and-trachea view** shows a right aortic arch and a left-sided
ductus arteriosus with a second, symmetrical arch-like structure to the left of the trachea, together forming a
complete vascular ring with a "9"-shaped configuration; each subclavian artery arises from its own arch. The trachea
passes through the ring with an **indentation**; neither arch is obstructed on colour Doppler, and the dominant arch
cannot be identified before birth (fetal movement, small structures). Amniocentesis was offered because of possible
associated chromosomal abnormalities, including **22q11.2 deletion**; the couple declined. She had consulted an
antenatal specialist.

At 39 weeks a 3120 g boy was born by caesarean (indication not recorded), Apgar 10 at 5 minutes. He needed **high-flow
respiratory support**, coughed after crying or feeds with occasional wheeze (喘鸣), and CT angiography confirmed
**right-arch dominance with tracheal compression**. The **left arch was divided at 18 days of age**. At six months he
had no dyspnoea, cyanosis or stridor, and his growth and development were reported as normal.

**Diagnosis (as taught):** a fetal double aortic arch — a complete vascular ring — found at 32+2 weeks with normal
four-chamber and outflow views, indenting the trachea, symptomatic after birth (respiratory support, cough, wheeze) and
treated by division of the non-dominant left arch. Whether the baby has a 22q11.2 deletion is not known: the prenatal
test was declined and no postnatal genetic, calcium or T-cell result is recorded.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires: the case shows the
report's recorded states and never simulates the learner's actions. Every phase is one-way (`learnerSwitchable: false`).

| Phase | When | Entered when | What is there |
|---|---|---|---|
| `scan` (initial) | antenatal ultrasound clinic, 32+2 weeks | start | her own history; today's scan records (growth and four-chamber/outflow report, three-vessel-and-trachea view and, once decision 1 has been attempted, the arch colour Doppler and airway assessment); maternal records with no result (blood count and ferritin, glucose tests, partner's thalassaemia screen, a specialist fetal echo report, the prenatal microarray); decisions 1–2; referrals and the reassurance trap |
| `counselling` | back in clinic after genetic counselling (third trimester; gestation not recorded) | objectives 1–3 done and decisions 1–2 right (decision 2 needs the referrals) | the couple's decision; the genetic counselling note; decisions 3–4; the perinatal plan, the newborn tests, warning signs, the early-caesarean trap |
| `newborn` | the baby's first weeks; she is on the postnatal ward (`location: { setting: "ward" }`) | objective 4 done and decisions 3–4 right | her account of the birth and the baby's breathing; the delivery record, newborn notes and, once decision 5 has been attempted, CT angiography (with the approved figure 2); records with no result (newborn echo, genetic test, calcium and lymphocyte subsets); decision 5; the surgical referral, irradiated components, the wait-and-see trap |
| `followup` | to six months of age | all five decisions right, objective 5 done **and** the surgical referral made in the newborn phase | her account at six months; the reported course and outcome record (both approved figures) |

Gating choices. Decision 1 opens on today's scan report and the three-vessel-and-trachea view. The colour Doppler and
airway record, whose wording ("neither arch") gives the anatomy away, exists only once decision 1 has been attempted
(`availability.when`; an earlier order finds nothing), and decision 2 needs it and the history. The CT angiogram, which
settles dominance and confirms the compression, likewise exists only once decision 5 has been attempted, so decision 5
is answered on the symptoms and the prenatal findings. The counselling phase needs the referrals that decision 2 calls
for, so the fetal cardiology referral cannot come after the birth. The follow-up phase needs
`{ "intervened": "cardiothoracic-referral", "whenIndicated": true }`: the referral counts only when it is made in the
newborn phase, so the outcome record — which reveals the operation — cannot be read first. No prompt, hint, `need`,
phase description, feedback or order response states the report's management before the record that holds it
(decision 5's prompt restates the birth record it requires). Intervention names, dose and harm texts can be met from
the start, so they name no diagnosis and no later finding (the traps' harm texts say "the finding", not "the ring");
the journal lists later objectives by title only, and no title names a finding.

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-pregnancy-history` — Take the history of this pregnancy and her health (reason, gestation, earlier scans,
   pregnancy problems, medicines, her conditions, family history).
2. `obj-scan-views` — Make sense of today's scan views (three scan records read in the `scan` phase; decision 1).
3. `obj-after-finding` — Decide what follows the finding (decision 2; fetal cardiology referral; genetic counselling).
4. `obj-birth-planning` — After counselling: plan the birth and the baby's care (counselling note; the couple's
   decision; decisions 3–4; the perinatal plan).
5. `obj-newborn` — After the birth: assess the baby and plan his care (delivery record, newborn notes, her account of
   the cough; decision 5; surgical referral; CT angiography).
6. `obj-outcome` — Compare the report's course with your plan (the outcome record).

Hints are Socratic questions; none contains a key's text (`cases validate` checks it). No objective contains a phase
leaf, `whenIndicated`, `decidedFirstTry` or `not`, so no objective can become impossible (the contract replays every
order and intervention of the reference path late and the case still finishes).

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `arch-anatomy` | reason for the visit, earlier scans, today's scan report and the three-vessel-and-trachea view | double aortic arch: two arches encircle the trachea, each with its own subclavian artery | right arch with an aberrant left subclavian artery (the commonest look-alike ring); mirror-image right arch (no ring); left arch with an aberrant right subclavian artery (common variant, no ring) |
| 2 | `next-steps` | decision 1, the Doppler and airway record, her own and her family's history | refer now for a specialist fetal echocardiogram, genetic counselling with amniocentesis for microarray, and a postnatal plan | reassure — normal four-chamber view and free flow; rescan in four weeks; fetal echo with a standard karyotype only (misses 22q11.2) |
| 3 | `declined-test` | the counselling note and the couple's decision | respect the decision; status unknown — test the baby after birth, check calcium and T cells, irradiated blood until the T-cell counts are known | deletion unlikely, no testing; test the parents instead (most deletions arise new); keep pressing for amniocentesis |
| 4 | `birth-plan` | decision 3 and the pregnancy problems | planned term birth, mode by obstetric indication, in a unit whose neonatal team knows the diagnosis | elective caesarean at 37 weeks; steroids and delivery at 34 weeks; local routine birth and an echo at six weeks |
| 5 | `newborn-plan` | the delivery record, the newborn notes and her account of the cough | CT angiography of the arches and airway, and paediatric cardiothoracic referral to divide the non-dominant arch | treat as reflux or viral wheeze; delay surgery to 6–12 months; divide the right arch without imaging |

All decisions are single best answer with option-specific feedback naming the guidance (ISUOG 2023, ASE 2023, AHA
2014, the 22q11.2 Society 2023, BSH 2020; Bartsota and colleagues 2023 for the antenatal–postnatal anatomy). Options
were balanced for length: the key is never the uniquely longest option in either language (`cases validate` checks
it). The report's own course is consistent with current practice at each decision except that the caesarean's
indication is not recorded; teaching point 4 says so.

### Rubric (11 deterministic items, weight 29, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-history` | History | reason, gestation and parity, earlier scans, pregnancy problems, anaemia, blood sugar, medicines, her conditions, family history | 2 |
| `rb-scan-views` | Investigations | the three scan records read in the `scan` phase | 2 |
| `rb-arch-anatomy` | Diagnosis | decision 1 first time | 3 |
| `rb-fetal-cardiology` | Management · **critical** | fetal cardiology referral before birth (`whenIndicated`: the `scan` or `counselling` phase) | 4 |
| `rb-counselling-offer` | Management | decision 2 first time and genetic counselling arranged | 2 |
| `rb-declined-test` | Management | decision 3 first time and the baby's genetic, calcium and T-cell tests arranged | 2 |
| `rb-birth-plan` | Management | decision 4 first time, the perinatal plan, warning signs and the maternal review | 2 |
| `rb-newborn-plan` | Management | decision 5 first time and the CT angiogram read in the newborn phase | 3 |
| `rb-surgical-referral` | Management · **critical** | paediatric cardiothoracic referral in the newborn phase (`whenIndicated`) | 4 |
| `rb-transfusion-safety` | Safety | irradiated components requested for the baby while 22q11.2 is unexcluded and his T cells are not yet counted | 2 |
| `rb-avoided-harm` | Safety | no routine reassurance, no 37-week caesarean for the finding, no wait-and-see for the newborn; `scoredWhen` decision 2 attempted or any of the three given | 3 |
| `rb-communication` | Communication (examiner) | Calgary–Cambridge conversation about the finding, the uncertainty and the testing choice | 1 |

The two critical items are acts — the referral that turns the scan finding into a plan, and the surgical referral of
the symptomatic newborn — scored only when done in their window, and the phase that reveals the next result waits for
each of them. No critical item is a decision or reads a final-phase record.

### How wrong choices score (measured 2026-10-30 with the core engine; re-measured 2026-11-14, unchanged)

| Path | Score | Critical items missed | Flagged in the debrief |
|---|---|---|---|
| Reference `solution` | 29/29 (100 %) | none | none |
| Start and do nothing | 0/26 (0 %); `rb-avoided-harm` not scored | `rb-fetal-cardiology`, `rb-surgical-referral` | — |
| Wrong first answer at every decision, then the key | 17/29 (59 %) | none | none |
| Wrong first at decision 1 or 5 only | 26/29 (90 %) | none | none |
| Wrong first at decision 2, 3 or 4 only | 27/29 (93 %) | none | none |
| Reference plus routine reassurance at the scan | 26/29 (90 %) | none | `routine-reassurance` (contraindicated) |
| Reference plus a 37-week caesarean booked | 26/29 (90 %) | none | `early-caesarean` (contraindicated) |
| Reference plus wait-and-see for the newborn | 26/29 (90 %) | none | `wait-and-see` (contraindicated) |
| No fetal cardiology referral | 14/29 (48 %), stuck in the `scan` phase | `rb-fetal-cardiology`, `rb-surgical-referral` | — |
| No surgical referral in the newborn phase (also when it was made only before birth) | 25/29 (86 %), stuck in the `newborn` phase | `rb-surgical-referral` | — |
| No irradiated components | 27/29 (93 %) | none | — |
| The Doppler record or the CT angiogram asked for before the decision it answers | the order is refused (the record does not exist yet); the reference path then scores 29/29 | none | — |

**Safety outcome.** No intervention in this case is marked `critical: true`, and every path above passes the safety
outcome. The one high-risk intervention, `early-caesarean` (an elective caesarean at 37 weeks booked for the fetal
finding), is explicitly `critical: false`: it is a booking the next obstetrician can cancel — a recoverable
misjudgement, not this case's dangerous error — and it shows its harm text (the finding is no indication for an early
or operative birth; early-term breathing problems and surgical risk without benefit; AHA 2014, ASE 2023) and loses
`rb-avoided-harm`. The two low-risk traps, routine reassurance
at the scan and wait-and-see for the symptomatic newborn, lose `rb-avoided-harm` too; the omissions behind them are the
critical acts, without which the case cannot move on (no fetal cardiology referral, no leaving the scan phase; no
cardiothoracic referral, no outcome).

## Reference path (`solution`)

67 steps: start → 18 history items at the scan (the seven required items, anaemia, blood sugar, preterm labour, COVID,
consanguinity, the partner's screen, contractions now, fetal movements, allergies, operations and her worries; 6 of them
unrecorded, answered "I'm not sure") →
today's scan report and the three-vessel-and-trachea view → decision 1 → the Doppler and airway record → the maternal
blood count, glucose and partner records ordered (no result) → decision 2 → maternal review, fetal cardiology
referral, genetic counselling (→ `counselling`) → who she has seen, the couple's decision → counselling note read,
prenatal microarray ordered (no result) → decision 3 → the baby's tests arranged → decision 4 → warning signs, her
worries, the perinatal plan (→ `newborn`) → the birth, why a caesarean (unknown), the baby's breathing and cough, blue
spells (unknown), her worries → delivery record and newborn notes read → decision 5 → surgical referral, irradiated
components, newborn echo, genetic test and calcium/lymphocyte records ordered (no result) → CT angiography read
(→ `followup`) → her account at six months and of the operation → outcome record → finish. It scores **29/29** with no
contraindicated act; `cases verify` passes, and the offline demonstration finishes with every objective at the
clinical score in clinical and in-world mode, in both languages.

## Clinical numbers check

Every value is version 1.0.0's, unchanged; no reference range, vital sign, measurement or dose has been added.
Extraction map (1.0.0 field → 1.1.0 field):

| Fact (as recorded) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 26-year-old woman | `patient.age`, `sex` | `patient` |
| First pregnancy | `history.prior`, `patient.triageNote` | `history.gestation`, triage note |
| 32+2 weeks at this assessment | `patient.chiefComplaint`, `history.onset` | chief complaint, triage note, `history.reason-for-visit`, `history.gestation`, scan record dates |
| A fetal great-vessel finding on the late-pregnancy scan needing clarification | `patient.triageNote` | triage note, opening line, `history.reason-for-visit` |
| Earlier first- and second-trimester screening had not identified the heart finding | `history.progression` | `history.earlier-scans` |
| Anaemia, blood-sugar problems and threatened preterm labour in pregnancy | `history.associated` | `history.pregnancy-problems`, `anaemia`, `blood-sugar`, `preterm-labour` |
| Beta thalassaemia; COVID positive early in pregnancy | `history.pmh` | `history.pmh`, `history.covid-illness` |
| Nifedipine and dydrogesterone for contractions; betamethasone for fetal lung maturation (no doses or timing) | `history.medications` | `history.medications`, `history.preterm-labour` |
| No relevant personal or family cardiovascular history | `history.family` | `history.family-history`, `history.pmh` ("nothing wrong with my heart") |
| Consulted an antenatal specialist | `history.prior` | `history.who-seen`, `fetal-cardiology-referral` response |
| Growth, fluid and placental position normal; situs, four-chamber view and outflow tracts normal | `investigations.routine-scan` | `growth-heart-scan` (scan, counselling) |
| Right arch, left ductus, a further symmetrical / arch-like structure left of the trachea forming a complete ring in a "9" configuration; each subclavian from its own arch | `investigations.arch-view` | `three-vessel-trachea`; decision 1 prompt |
| Trachea crosses the ring with an indentation; no flow obstruction in either arch; dominant arch not identifiable before birth (fetal movement, small structures) | `investigations.airway-view` | `arch-doppler`; decision 2 prompt |
| Amniocentesis offered for possible associated chromosomal abnormalities incl. 22q11.2 deletion; the couple declined; no confirmation | `investigations.genetics` | `counselling-note`, `prenatal-microarray` (counselling), `history.amnio-decision`, decision 3 prompt |
| Caesarean at 39 weeks; boy 3120 g; 5-minute Apgar 10 | `investigations.outcome` | `birth-record`, `history.birth`, decision 5 prompt, `outcome` |
| High-flow respiratory support after birth | `investigations.outcome` | `newborn-notes`, `history.baby-breathing` |
| CTA: right-arch dominance and tracheal compression | `investigations.outcome` | `newborn-cta` (figure 2) |
| Cough after crying or feeding; occasional wheeze (喘鸣) | `investigations.outcome` | `newborn-notes`, `history.baby-symptoms` |
| Left-arch division at 18 days | `investigations.outcome` | `outcome`, `history.operation` |
| At six months: no dyspnoea, cyanosis or stridor; growth and development reported normal | `investigations.outcome` | `outcome`, `history.six-months` |
| Double aortic arch diagnosed late in pregnancy | `debrief.conclusion` | decision 1 key, `outcome` |
| Approved figures: fig01 prenatal ultrasound, fig02 postnatal CT reconstruction | `assets`, `scripts/cmcr-105-media-review.json` | `newborn-cta` (fig02), `outcome` (fig01, fig02) |

Derived values (editorial): birth at 39 weeks is term; the operation at 18 days falls in the neonatal period (< 28
days); 3120 g is stated without a centile because no growth chart is recorded. No dose of the report is recorded, and
the case's interventions carry plans rather than drug doses, so nothing is computed from a weight. Guidance numbers
(not patient data): BSH 2020's threshold for non-irradiated components (T lymphocytes > 400 cells/µL with ≥ 30 % naive
T cells), Bartsota 2023's series (79 fetuses; 48.6 % with an atretic left arch after birth; 5.1 % first called a right
arch) and AHA 2014's 39 completed weeks; NICE NG25 is cited without its gestational window.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did it feel to tell a first-time mother at 32 weeks that the vessels around her baby's windpipe
   were not normal?"
2. **Description** — "Walk me through the scan: which views were normal, which one was not, and what did you arrange
   before she left the clinic?"
3. **Analysis**
   * "What does a normal four-chamber view rule out, and why was this anomaly invisible in it?"
   * "How did the subclavian arteries help you choose between a double arch and a right arch with an aberrant artery?"
   * "Flow through both arches was free. Why did you still plan for airway trouble after birth?"
   * "Which test would have found a 22q11.2 deletion, and which would have missed it?"
   * "The couple said no to amniocentesis. What did that leave open, and how did you carry it forward?"
   * "Why would a baby with an unexcluded 22q11.2 deletion need irradiated blood for the operation — and which result
     lets the team stop?"
   * "Did this finding change when or how she should give birth? What did the report's team do, and what don't we know
     about it?"
   * "The baby needed high-flow support and coughed after feeds. What else might a busy team have called it — and what
     would that have cost?"
   * "Why does the surgeon need to know which arch is dominant before operating?"
4. **Summary** — "What will you do the next time a three-vessel-and-trachea view shows vessels on both sides of the
   trachea?"

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it | Where it scores |
|---|---|---|
| Reassuring on the strength of a normal four-chamber view | decision 2 distractor; `routine-reassurance` contraindicated | `rb-counselling-offer`, `rb-avoided-harm` |
| Reading a double arch as a right arch with an aberrant left subclavian artery | decision 1 distractor; feedback cites Bartsota 2023 | `rb-arch-anatomy` |
| Offering a karyotype only | decision 2 distractor (misses 22q11.2) | `rb-counselling-offer` |
| Treating the declined test as reassurance, or testing the parents instead | decision 3 distractors | `rb-declined-test` |
| Pressing the couple to accept amniocentesis | decision 3 distractor; communication item | `rb-declined-test`, `rb-communication` |
| Early or operative delivery "because of the heart" | decision 4 distractors; `early-caesarean` contraindicated | `rb-birth-plan`, `rb-avoided-harm` |
| Calling the newborn's cough and wheeze reflux or a viral wheeze | decision 5 distractor; `wait-and-see` contraindicated | `rb-newborn-plan`, `rb-avoided-harm` |
| Operating without imaging, or on the wrong arch | decision 5 distractor | `rb-newborn-plan` |
| Forgetting the transfusion consequence of an unexcluded 22q11.2 deletion | decision 3 key; `irradiated-components` | `rb-transfusion-safety` |
| Tying irradiation to the genetic result (stopping it once the deletion is excluded, or keeping it although the T cells are normal) | decision 3 key feedback; teaching point 3 (BSH 2020: the T-cell counts decide) | `rb-declined-test` |
| Inventing the unrecorded (her blood results, the baby's tests, the surgical details) | unknown items, no-result records, `examNotRecorded` | — |

## Embodied mode

* **Where she is.** An outpatient consult room (`outpatient`), sitting, for the `scan` and `counselling` phases. The
  `newborn` phase moves her to a ward bed (`location: { setting: "ward" }`, the postnatal ward); the `followup` phase does
  not move her. No investigation moves her: every investigation is a record review (`performedAt: "records"`,
  `requires: ["records"]`, `risk: "none"`), read at a records terminal or at her side. There is no IV access, no
  sampling and no device in the case. Two records exist only once the decision they answer has been attempted (the
  Doppler and airway record, the CT angiogram); asked for earlier, the order finds nothing.
* **Who speaks.** She is alert throughout and answers every question herself, including what she knows about her baby
  after the birth; there is no companion and no `nonVerbalWhen`. The newborn is represented by records (CMCR_CASES,
  "Known limits": one patient per case).
* **Kit and scope.** The interventions are referrals, plans and dispositions that need only the clinician at the
  patient (kinds `consult`, `other`, `disposition`; the early-caesarean trap is a medical `procedure`). No intervention
  has a `destination`.
* **Examination.** Version 1.0.0 records no maternal examination or vital signs, so `exam` is empty and every manoeuvre
  returns `examNotRecorded`: "This case does not record this examination." / "本病例没有记录这项检查。"
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-1551889:"` passes in en and zh-CN (every objective done,
  in-world score equal to the clinical score).

## Source and adaptation (fidelity limits)

**From the report, via version 1.0.0 (kept as fact).** Every fact in the extraction map above: her age, the first
pregnancy, 32+2 weeks, the earlier screening, beta thalassaemia, anaemia, the blood-sugar problems, threatened preterm
labour and its medicines, COVID early in pregnancy, the negative cardiovascular history, the antenatal specialist, the
scan findings, the counselling and the declined amniocentesis, the birth, the newborn's support and symptoms, the CT
angiogram, the operation and the six-month follow-up.

**Adapted for teaching.** Her lay words and her worries (labelled as part of the role; they add no fact); the second
clinic visit after counselling (version 1.0.0 gives no date for the counselling); placing her consultation with the
antenatal specialist in that visit; the newborn phase on the postnatal ward and the baby's course read from records
while she tells what she knows; placing the CT angiogram in the first weeks (its age is not recorded); holding back the Doppler and airway record
until decision 1, and the CT angiogram until decision 5, has been attempted (`availability.when`), although both
existed before those decisions; the staff
characters (Midwife Ruan, Dr Wen, Dr Lu, Dr Qin); the decisions, interventions, rubric, feedback and teaching points
(current guidance). The approved figures are shown only with the postnatal CT record (figure 2) and with the reported
course (figures 1 and 2): figure 1's content could not be inspected here, so it is not shown before decision 1.

**Inconsistencies in 1.0.0 kept, not resolved.**
* 喘鸣 in the Chinese outcome text (a word often used for stridor) against "wheeze" in the English; each language keeps
  its own word, and at six months both say there was no stridor (喉鸣).
* The second structure in the three-vessel-and-trachea view is "symmetrical" (对称结构) in Chinese and "arch-like" in
  English; both descriptors are kept in both languages.
* The routine-scan text: Chinese says the four-chamber view and outflow tracts were normal in appearance, position and
  symmetry; English names cardiac situs; both are kept.
* At six months the Chinese text reports growth and development (生长发育) as normal, the English development only; both
  languages give the fuller Chinese reading (the source is in Chinese), and the source check should confirm it.
* Version 1.0.0's appraisal decision keyed "dominant arch unresolved" while its outcome record says CT confirmed right
  dominance; both statements are true at different times (before and after birth), and the case keeps them in their
  phases instead of asking the question in hindsight.

**Not recorded and kept unknown** (`unknowns`, unknown history items, no-result records, `examNotRecorded`): her
examination and vital signs; the type of thalassaemia, haemoglobin, red cell indices and ferritin; the glucose tests
and treatment; the timing of the threatened preterm labour and the doses and timing of her medicines; the severity of
the COVID infection; fetal biometry and any separate fetal echocardiogram; the partner's carrier status;
consanguinity; the reasons for declining amniocentesis and whether cell-free DNA screening was discussed; the
caesarean's indication and anaesthetic; the duration of high-flow support; the baby's age at the CT, arch sizes and
degree of narrowing; any newborn echocardiogram; the baby's genetic, calcium and T-cell results; the surgical approach,
ligament division, transfusion and post-operative course; anything after six months.

**Wording of unknowns (STANDARD §6.3).** Because the article has not been checked, no text claims that the *report*
lacks something: no-result records say "No result is recorded for this test." / "此项检查没有结果记录。", steps the
case does not record say "This case does not record whether this was done; it does not simulate its effect." /
"本病例没有记录是否做过这一步；不模拟其效果。", `examNotRecorded` says "This case does not record this examination."
/ "本病例没有记录这项检查。", and she answers unknowns in lay words ("I'm not sure, doctor." / "这个我说不上来，医生。").

**Privacy.** Pseudonym 曹知远 / Cao Zhiyuan (unchanged from 1.0.0); no hospital, city, date or occupation; gestational
weeks and days of life only. **Figures.** `fig01.png` (prenatal ultrasound) and `fig02.png` (postnatal CT
reconstruction) are approved in `scripts/cmcr-105-media-review.json` with unchanged checksums; the source PDF is withheld
there (another report's image on the back cover carries a calendar date).

### To verify

Details to look for in the full article (the source check is pending):
* Her history: the type of beta thalassaemia (trait?), haemoglobin, MCV and ferritin; what the "blood-sugar problems"
  were (test, values, gestational diabetes or not, treatment); when the threatened preterm labour occurred; the doses,
  routes and timing of nifedipine, dydrogesterone and betamethasone; the course of the early COVID infection.
* Her examination and vital signs at the visit; fetal biometry, amniotic fluid measurement and placental site.
* Whether the three-vessel-and-trachea and Doppler findings come from the 32+2-week scan or a later specialist fetal
  echocardiogram; the exact wording of the second structure (symmetrical or arch-like), of the "9" sign and of the
  branching (carotid arteries, descending aorta, ductus).
* When the genetic counselling took place, whether cell-free DNA screening was done or discussed, and why the couple
  declined.
* The caesarean's indication and place of birth; the 1-minute Apgar score.
* How long the high-flow support lasted; the baby's age at the CT angiogram, the arch sizes, the degree of tracheal
  narrowing; any echocardiogram or bronchoscopy; whether 喘鸣 means stridor or wheeze.
* The operation: approach, ligament division, transfusion and blood products, complications and post-operative course;
  any genetic, calcium or T-cell testing of the baby; follow-up after six months.
* The figures: whether `fig01` carries labels that name the anomaly (if not, it could be shown with the
  three-vessel-and-trachea record), and whether `fig02` is the pre-operative CT angiogram (if it is post-operative, it
  belongs with the outcome record only).
* The source DOI: the recorded `10.12408/j.issn2223-4462.2025.01.16` has a two-digit article number, out of sequence
  with the other reports of the issue (…2025.01.014, …2025.01.015, …2025.01.017), so the registered DOI may be
  …2025.01.016; until it resolves, the case cites the publisher URL and asserts no DOI.

Guidance details (the independent review of 2026-11-14 read ISUOG 2023, AHA 2014 and BSH 2020 in full and the 22q11.2
Society's Table 1; what each confirms, and what remains):
* ISUOG 2023 — confirmed: the LVOT, RVOT, three-vessel and three-vessel-and-trachea views "are now considered an
  integral part of the fetal cardiac screening examination", and the three-vessel-and-trachea view detects right and
  double aortic arches.
* ASE 2023: the indications table (an abnormal screening view as an indication for fetal echocardiography), the
  recommendations on arch sidedness and branching, and on perinatal care planning.
* AHA 2014 — confirmed: genetic testing and counselling for every fetus with a cardiac malformation; elective delivery
  before 39 weeks not recommended without obstetric, logistic or fetal reasons; no inherent advantage of caesarean.
* 22q11.2 Society 2023 — Table 1 confirmed (proband: MLPA or microarray, FISH only if it is the only method; PTH and
  calcium; T- and B-cell phenotyping at diagnosis); still to confirm in the text: the share of deletions that arise de
  novo, and any wording on blood products (Table 1 has none).
* BSH 2020 — confirmed in the full text (recommendation 1/C): neonates and infants with a suspected immunodeficiency
  syndrome have T-lymphocyte counts before cardiac surgery wherever possible; above 400 cells/µL with ≥ 30 % naive T
  cells red cells and platelets need no irradiation; otherwise irradiated cellular components until the tests are done.
  The guideline adds that a 22q11 deletion found or excluded by FISH does not predict the immune defect.
* Bartsota and colleagues 2023: the issue number, the full author list and any 22q11.2 figures (48.6 % atretic left
  arch and 5.1 % first diagnosed as a right arch are from the abstract, which also gives a 22q11 deletion in 3.8 %).
* NICE NG25 (2015, updated 2022): antenatal corticosteroids are offered from 24+0 to 33+6 weeks for suspected or
  established preterm labour, a planned preterm birth or P-PROM — confirmed through NICE quality standard QS135
  (statement 5); the guideline text itself remains to be read.
* Sources considered but not cited because they could not be confirmed in this session (the shared web-search budget
  ran out): the ERS 2019 statement on tracheomalacia and bronchomalacia in children (post-operative airway follow-up);
  the ACOG committee opinions on early-term birth; a Chinese fetal echocardiography guideline and the Chinese expert
  consensus on prenatal chromosomal microarray.
* Clinician input: a fetal cardiologist should review decisions 1–2, a clinical geneticist decision 3, an obstetrician
  decision 4 and a paediatric cardiothoracic surgeon decision 5.

## Matcher notes

* 39 `extensions.testUtterances` (21 zh-CN, 18 en; 2 look-alike negatives), none equal to a canonical question or a
  keyword; every required item is covered. `cases verify`: 39/39, no extra selections.
* **No phase twins.** Each phase has its own items; the newborn and six-month items are the mother's account of her
  baby and are available only in their phases.
* **Overlaps separated with `excludeKeywords`:** `reason-for-visit` vs the earlier scans; `gestation` vs fetal
  movements and contractions; `pregnancy-problems` vs medicines, thalassaemia and the heart; `anaemia` vs thalassaemia
  and the partner; `preterm-labour` vs current symptoms; `medications` vs allergies; `pmh` vs family, partner and COVID
  symptoms; `family-history` vs consanguinity and the partner; `partner-thal` vs consanguinity; `contractions-now` vs
  the earlier episode; `fetal-movements` vs the newborn's breathing; `birth` vs why, breathing and cough;
  `baby-breathing` vs cough, feeds and blue spells.
* English keywords that would reduce to one stop-word-stripped token are written run together (`whatbringsyou`,
  `whyyoucame`, `howmanyweeks`, `inthefamily`, `whohaveyouseen`, `howwasheborn`, `whyasection`, `havingasection`,
  `howishenow`, `whenwastheoperation`, `whattowatchfor`); "today" was dropped from the Chinese reason-for-visit
  keywords so that small talk about today ("今天停车方便吗？") selects nothing.
* **Orders.** All 16 investigations are records. The prenatal microarray answers "karyotype" and "amniocentesis
  result" with its no-result record; the baby's tests are prefixed "宝宝 / baby's" so they do not collide with the
  prenatal test; no bare "ct" alias (it is a substring of "doctor").

## References

1. 葉柳虹. 產前診斷胎兒雙主動脈弓：病例個案及文獻回顧. 鏡湖醫學. 2025;25(1):60-61. Available from:
   https://rs.yiigle.com/cmaid/1551889 (DOI pending verification, see To verify)
2. Carvalho JS, et al. ISUOG Practice Guidelines (updated): fetal cardiac screening. Ultrasound Obstet Gynecol.
   2023;61(6):788-803. doi:10.1002/uog.26224
3. Moon-Grady AJ, Donofrio MT, et al. Guidelines and recommendations for performance of the fetal echocardiogram: an
   update from the American Society of Echocardiography. J Am Soc Echocardiogr. 2023;36(7):679-723.
   doi:10.1016/j.echo.2023.04.014
4. Donofrio MT, Moon-Grady AJ, Hornberger LK, Copel JA, Sklansky MS, et al. Diagnosis and treatment of fetal cardiac
   disease: a scientific statement from the American Heart Association. Circulation. 2014;129(21):2183-2242.
   doi:10.1161/01.cir.0000437597.44550.5d
5. Óskarsdóttir S, Boot E, Crowley TB, et al. Updated clinical practice recommendations for managing children with
   22q11.2 deletion syndrome. Genet Med. 2023;25(3):100338. doi:10.1016/j.gim.2022.11.006
6. Foukaneli T, Kerr P, Bolton-Maggs PHB, et al. Guidelines on the use of irradiated blood components. Br J Haematol.
   2020;191(5):704-724. doi:10.1111/bjh.17015
7. Bartsota M, et al. Double aortic arch: implications of antenatal diagnosis and differential diagnosis with right
   aortic arch. Ultrasound Obstet Gynecol. 2023;62:69-74. doi:10.1002/uog.26186
8. National Institute for Health and Care Excellence. Preterm labour and birth. NICE guideline NG25. London: NICE;
   2015 (updated 2022). Available from: https://www.nice.org.uk/guidance/ng25

In `debrief.references` the source article is split into its citation and the bare publisher URL (the collection
contract requires the URL as its own entry while the DOI is pending), followed by references 2–8.

**How they were checked (2026-10-30).** doi.org, Crossref, PubMed and the publishers' sites could not be fetched from
this environment, so each title, journal, volume, pages and DOI was confirmed by web search against indexing records
that print them: ref. 2 (University of Giessen research portal record and the ISUOG resource page), ref. 3 (the ASE
guideline page and Guideline Central summary, with the endorsing societies), ref. 4 (PubMed 24763516 and eScholarship
records), ref. 5 (university repository records listing Genet Med 2023;25(3):100338), ref. 6 (British Library catalogue
and an RCPath document citing the DOI), ref. 7 (St George's open-access repository and PubMed 36864493). Author lists are
given only as far as they were seen; the 1.0.0 ISUOG PDF URL was replaced by the verified DOI. The source article's DOI
stays pending (`extensions.sourceDoiPendingVerification`, `scripts/cmcr-105-sources.json`). At the independent review
(2026-11-14) the full texts of refs 2, 4 and 6 and Table 1 of ref 5 were read, ref 7's abstract figures were checked
again, and ref 8's recommendation was confirmed through NICE quality standard QS135.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

* **Safety and validity (survey critic, gaps 2, 4 and 15).** The hindsight "safety" decision is gone: it read the
  outcome record and keyed "dominant arch unresolved" although that record confirms right dominance, and its critical
  rubric item ("do not exclude airway risk…") measured a different question. The two critical items are now acts — the
  fetal cardiology referral before birth and the surgical referral of the symptomatic newborn — each scored only in its
  window. The management key names the acts (fetal echocardiography, counselling with microarray, a written perinatal
  plan) and adds the postnatal step for the open genetic question (the baby's genetic test, calcium and T-cell counts,
  irradiated blood while the question is open — its stopping rule corrected at review, below). The maternal history (thalassaemia, anaemia, blood sugar,
  threatened preterm labour and its medicines, COVID) is asked and its gaps are honest; a peripartum decision (timing,
  mode and place of birth) and a postnatal decision were added. The README no longer claims a documented examination
  (none is recorded). The DOI stays pending.
* **Voice.** She answers in lay first person; no answer says "the source notes do not provide that information"; her
  worries (a labelled teaching device) replace the unknown concerns answer.
* **Spoilers.** Title, summary, tags and specialty no longer imply the answer beyond the presenting discipline; the
  "great-vessel" wording of the triage note is kept; the figures are titled descriptively and shown only after the
  decisions they could answer.
* **Structure.** Phases `initial`/`workup`/`followup` → `scan`/`counselling`/`newborn`/`followup`; 15 template history
  items → 29 phase-scoped items; investigations 5 bundles → 16 single records (8 with no recorded result);
  interventions 0 → 11; decisions 3 → 5 (neutral option ids; 1.0.0 used `supported`, `alternative-1/2`); rubric 10 → 12
  (descriptive ids); objectives 4 → 6; staff 1 → 4; references rebuilt in Vancouver form.
* **Ids changed** (none referenced outside this case): history `presentation` → `reason-for-visit`, `onset` →
  `gestation`, `progression` → `earlier-scans`, `associated` → `pregnancy-problems` (+ `anaemia`, `blood-sugar`,
  `preterm-labour`), `family` → `family-history`, `prior` → `who-seen`, `operations` → `psh`, `concerns` → `ice-scan`;
  `exposure`, `function`, `redflags`, `baseline` removed (template slots); investigations `routine-scan` →
  `growth-heart-scan`, `arch-view` → `three-vessel-trachea`, `airway-view` → `arch-doppler`, `genetics` →
  `counselling-note`, `outcome` split into `birth-record`, `newborn-notes`, `newborn-cta` and `outcome`; decisions
  `interpretation`/`management`/`safety` → `arch-anatomy`, `next-steps`, `declined-test`, `birth-plan`, `newborn-plan`.
* **Specialty.** `["obstetrics", "pediatric-cardiology"]` → `["obstetrics", "neonatology", "cardiology",
  "genetics"]`: the child is a newborn in the scheme's terms, and the genetic question runs through the case.
* **Extensions.** `authorChecks` (unverifiable booleans) and `sourceTextSha256` removed until the source pass;
  `sourceTextChecked: false` added; the 1.0.0 `provenance.doi` moved to `sourceDoiPendingVerification` (pending in
  the source map).
* **Contract wording.** The English review note ends "The case is not yet reviewed by a licensed clinician." (the
  collection test matches the lower-case phrase); otherwise it is the standard's §6 text.
* **Independent review (2026-11-14).** The irradiation rule now follows BSH 2020 — the baby's T-lymphocyte counts
  decide, and components are irradiated until they are done, not "until the deletion is excluded" — in learning
  outcome 4, decision 3, the intervention, decision 5's feedback, the rubric, teaching point 3, the conclusion and the
  geneticist's brief. Decision 4's feedback no longer says antenatal steroids are not for a planned preterm birth (NICE
  NG25 offers them). `early-caesarean` states `critical: false` (the strict lint warned and the collection contract
  failed on it). The Doppler and airway record and the CT angiogram exist only once decisions 1 and 5 have been
  attempted, so neither decision can be read off the record that answers it. Objective 5's title (listed from the
  start) and hint, decision 5's `need`, the `wait-and-see` harm text and the attending's and the patient's briefs no
  longer state the newborn's symptoms or an operation before they are found; decision 4's and 5's feedback no longer
  reveal the caesarean, the CT result or the operation. `wait-and-see` names its guidance (AHA 2014; Bartsota 2023).
  Her answers no longer soften the blood-sugar problem ("a bit") or widen the earlier scans' result ("never said
  anything about the heart"); the oesophagus, not in the record, left the feedback; the English conclusion now carries
  her medicines and the six-month growth and development, as the Chinese did; the attending debriefs with PEARLS; NICE
  NG25 joined the guidance and references; this README gained its **Safety outcome** paragraph.

### 1.0.0

* Initial template version (PR #5): three phases, 15 generic history slots (seven answered "the source notes do not
  provide that information"), five bundled records, no interventions, three decisions of three options with role-named
  ids (`supported`, `alternative-1/2`) and a critical rubric item scored on a hindsight decision.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1551889/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1551889 --lang en        # 67 steps · objectives 6/6 · decisions 5/5 · utterances 39/39 · rubric 29/29
npx tsx --conditions=source scripts/case-check.ts cmcr-1551889                                    # PASS (depth floor, do nothing 0, wrong-first < reference)
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1551889:"          # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1551889:"  # demonstration, en + zh-CN
```

Last run 2026-11-14, after the independent review: all five pass (0 errors, 0 warnings; reference 29/29, do nothing
0/26, wrong first at every decision 59 %; collection contract and in-world demonstration green).

## 中文摘要

**病例概要。** 26岁女性，第一次怀孕，孕32+2周来做产前超声。她有β地中海贫血，孕期有贫血、血糖问题和先兆早产，因宫缩用过
硝苯地平、地屈孕酮，并用倍他米松促胎肺成熟（剂量和时间未记录）；孕早期新冠检测阳性；本人和家族无相关心血管病史；早、中孕
筛查未发现这一心脏问题。今天的超声：胎儿生长、羊水、胎盘位置、心脏位置、四腔心和流出道正常；三血管气管切面见右位主动脉弓、左侧
动脉导管和气管左侧对称的弓状结构围成完整血管环，呈“9”字形，两侧锁骨下动脉各自起自同侧弓；气管穿过血管环并有压迹，两弓
血流通畅，产前无法判断优势弓。因可能伴随22q11.2微缺失等染色体异常建议羊水检查，夫妇拒绝。孕39周剖宫产，男婴3120 g，5分钟
Apgar 10分；出生后需高流量呼吸支持，哭闹或吃奶后咳嗽、偶有喘鸣；CT血管成像证实右弓优势、气管受压；出生第18天切断左弓；6月龄
无呼吸困难、发绀或喉鸣，生长发育报告正常。宝宝是否有22q11.2微缺失仍未知。本版患者事实全部沿用1.0.0版的提取，尚未对照原文全文
核对。

**学习目标。**
1. 按ISUOG 2023，在四腔心和流出道正常时，从三血管气管切面识别胎儿主动脉弓异常。
2. 根据主动脉弓与气管的关系和锁骨下动脉的起源，区分双主动脉弓与几种相似的弓部异常。
3. 发现异常后安排胎儿超声心动图专科检查、含染色体微阵列的遗传咨询和书面围产期计划（ASE 2023；AHA 2014）。
4. 说明拒绝产前检测后22q11.2状态仍属未知，安排宝宝出生后的遗传学、血钙和T细胞检查，T细胞计数表明不需要之前手术用辐照血（22q11.2学会2023；BSH 2020）。
5. 计划足月分娩、方式按产科指征；把新生儿咳嗽、喘鸣或需要呼吸支持视为气管受压，及时CT血管成像并切断非优势弓。
6. 按Calgary–Cambridge模式与孕妇沟通，尊重夫妇对有创检测的决定。

**关键决策。** ① 弓部解剖：双主动脉弓（干扰项：右位弓伴迷走左锁骨下动脉、镜像右位弓、左位弓伴迷走右锁骨下动脉）；② 发现后的
安排：转诊胎儿超声心动图、遗传咨询与羊水染色体微阵列、开始出生后计划（干扰项：安慰后常规产检、4周后复查、只做常规核型）；
③ 拒绝羊水穿刺之后：状态未知，出生后检测宝宝、查血钙和T细胞，T细胞结果出来前用辐照血（干扰项：可能性小不必检测、改查父母、反复劝做羊穿）；
④ 分娩计划：足月、方式按产科指征、新生儿团队事先知情（干扰项：37周择期剖宫产、34周提前分娩、当地常规分娩6周再查）；
⑤ 新生儿：CT血管成像加小儿心胸外科切断非优势弓（干扰项：按反流或病毒性喘息观察、推迟到6–12个月、不做影像直接切右弓）。
两个关键项都是行动：出生前转诊胎儿心脏专科，出生后有症状时及时请心胸外科。

**安全结果。** 本病例没有标记`critical: true`的干预，参考路径的安全结果为通过；唯一的高风险干预“因胎儿发现预约37周择期剖宫产”明确标为`critical: false`（只是预约，下一位产科医生可以取消，属可纠正的判断失误），选了会显示危害说明并失去`rb-avoided-harm`的分数。

**复盘要点（PEARLS）。** 先谈感受；复述超声当天哪些切面正常、哪个异常、离开门诊前安排了什么；分析：四腔心正常为什么看不到这个
异常，锁骨下动脉怎样帮助区分血管环，血流通畅为什么仍要准备气道问题，哪种检测能查到22q11.2，拒绝检测后怎样把问题带到出生后，
为什么要辐照血、什么结果出来后可以不再辐照，这项发现是否改变分娩时间和方式，宝宝的咳嗽和喘鸣为什么不能当作反流，手术前为什么要知道优势弓；总结下次遇到
三血管气管切面上气管两侧都有血管时怎么做。待核实：她的血液和血糖结果、先兆早产与用药细节、剖宫产指征、宝宝的遗传学检测、手术
细节、两张原图的内容以及来源DOI（见上文 To verify）。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
