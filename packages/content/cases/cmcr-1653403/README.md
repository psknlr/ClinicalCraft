# cmcr-1653403 — Reduced fetal movements late in pregnancy · 29-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners
> open the case from the case library, where the title, summary, chief
> complaint and tags give nothing away.

**Published-case adaptation.** The case retells a report published in a
Chinese Medical Association journal (CMCR collection; citation below). The
patient (邝女士 / Ms Kuang) is a pseudonym; hospitals, calendar dates and the
authors' institution are left out of the case text. The historical course is
a fact of the record; current guidance is taught in the decisions, the
feedback and the debrief.

## Case card

| | |
|---|---|
| id / version | `cmcr-1653403` / `1.1.0` |
| setting / facility | `outpatient` / `general-hospital` (antenatal clinic → operating theatre → ward) |
| specialty | obstetrics, neonatology |
| difficulty | 3 / 5 |
| estimated time | about 30 min (static clock: a staged historical review, no simulated physiology) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have an obstetrician and a neonatologist review it before teaching use |
| phases | `antenatal` → `delivery` → `postnatal` → `followup`, all one-way, each entered automatically when the previous chapter's objectives are done |
| content | 19 history items (7 required, 9 `unknown`) · 1 exam finding · 12 investigations (6 record reviews, 2 with no record in the source) · 8 interventions (4 wrong choices) · 6 objectives · 4 decisions (4–5 options each) · 12 rubric items (11 deterministic, weight 23; 1 examiner-judged) · 5 NPCs · 5 learning outcomes · 4 teaching points · 35 test utterances |
| source | 梁建明, 黃芳芳, 吳思敏, 余善恩. 胎母輸血綜合症1例. 2025;25(2):50-51 (see References) |

## Learning outcomes

After the case the learner can:

1. Recognise reduced fetal movements at term with a suspected sinusoidal CTG
   as a sign of possible fetal anaemia or hypoxia that needs prompt delivery,
   with the neonatal team and emergency blood arranged in advance (RCOG GTG 57).
2. Plan respiratory support and an emergency red-cell transfusion for a pale,
   shocked newborn with an Hb of 38 g/L, without waiting for a crossmatch or
   haemolysis tests (BSH 2016).
3. Use the maternal Kleihauer–Betke (KB) test and maternal AFP to confirm
   fetomaternal haemorrhage (FMH), and estimate its size while stating the
   formula's assumptions.
4. Exclude the other causes of neonatal anaemia from the record: ABO or Rh
   haemolysis, thalassaemia, twin-to-twin transfusion and acute blood loss at
   delivery.
5. State when anti-D immunoglobulin is needed after FMH, and why it is not
   needed here.

These are the case's `learningOutcomes` (shown in every debrief); the six HUD
`objectives` below are the in-game task list.

## Clinical summary

**Presentation (day 0).** A 29-year-old, gravida 3 para 2, at 37+2 weeks, had
regular antenatal care at the same hospital. At a routine visit she reported
that for about a week the baby had moved less than before (not counted). She
is usually well; hypertension, diabetes, coronary disease, chronic liver or
kidney disease and gastrointestinal bleeding are denied, as is any family
history. Antenatal record: 13-week scan NT 0.17 cm, FHR 154/min, Down's
screening low risk; 14-week ECG sinus arrhythmia; 22-week Doppler scan FHR
152/min, no obvious abnormality; 26-week OGTT normal; blood group B,
Rh-positive; hepatitis B, hepatitis C, syphilis and HIV negative; thalassaemia
gene test normal. Scan 7 days earlier: BPD 9.0 cm, AC 31.39 cm, FL 7.01 cm, AFI
12.25 cm, placenta grade II, FHR 141/min with movements seen, umbilical artery
S/D 2.03, EFW 2754 g; singleton, breech. The emergency CTG showed a
**suspected sinusoidal pattern**; fetal compromise could not be excluded, and
she was delivered by emergency caesarean. Not recorded: her vital signs and
obstetric examination, the CTG trace, any MCA Doppler, bleeding, pain, trauma,
procedures (version, amniocentesis), medicines and allergies.

**The baby.** A girl, 2.38 kg, Apgar 8 (time not stated); pale, HR 200/min,
frothing at the mouth, BP 49/25 mmHg, laboured breathing; **Hb 38 g/L**;
chest/abdominal film suggesting pneumonia. Diagnoses: severe neonatal anaemia,
neonatal pneumonia, neonatal shock. Non-invasive ventilation, an emergency
transfusion of 45 mL group O packed red cells and "anti-inflammatory drugs":
she became pink with a stable BP; Hb 74 g/L; group O, Rh-positive, Coombs
negative (tested after the first transfusion). The next day 30 mL more group O
packed cells; breathing improved; Hb 121 g/L. Home 7 days after birth.

**The mother.** Good recovery after the operation. KB test 9.2 % HbF-containing
cells (the report's stated normal ≤ 3 %), AFP 11582 µg/L, Hb 149 g/L. Placenta:
degenerative change in part of the amnion, no villous inflammation, focal
infarction < 5 %, occasional neutrophils in the membranes and chorionic plate,
three-vessel cord, no tumour. The authors' diagnosis: **fetomaternal
haemorrhage**.

## Scenario timeline and physiology

| phase | where | enters when | what the learner meets |
|---|---|---|---|
| `antenatal` (initial) | antenatal clinic room | start | the history; the antenatal record, last week's scan and the emergency CTG (record reviews); decision `management` |
| `delivery` | operating theatre (`location: {setting: operating-room}`) | objectives `obj-history` and `obj-deliver` complete (the decision right, the neonatal team called, the caesarean given) | the newborn's record at birth; decision `neonatal-resus` |
| `postnatal` | ward (`location: {setting: ward}`) | objective `obj-newborn` complete | the mother after the operation; the baby's tests after resuscitation; maternal KB, AFP, blood count, placental pathology; decisions `diagnosis`, `anti-d` |
| `followup` | ward | objectives `obj-cause` and `obj-mother` complete | the follow-up record (day 7) |

- **Static clock, one-way phases.** No phase is learner-switchable, so the
  delivery decision is taken before anything about the baby is known, the
  newborn's management before the result of her transfusion, and the cause
  before the maternal KB result is required. Each `enterWhen` names the phase
  it leaves.
- **Days.** Presentation and birth are day 0; the second transfusion is day 1;
  the baby goes home on day 7 (the source's calendar dates are not used).
- **No physiology** (collection contract). The few maternal data are records
  and one exam finding.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-history` Reduced movements and this pregnancy | movements, gestation and parity, antenatal care, screening, blood group, last scan, general health asked |
| 2 | `obj-deliver` Assess the baby and decide on delivery | CTG and last week's scan read; `management` decided; neonatal team called; emergency caesarean given |
| 3 | `obj-newborn` The baby at birth | the newborn's record read; `neonatal-resus` decided |
| 4 | `obj-cause` Find the cause of the anaemia | the baby's post-resuscitation record read; `diagnosis` decided; maternal KB, AFP and placental pathology read |
| 5 | `obj-mother` Care of the mother | post-operative check; her account; `anti-d` decided |
| 6 | `obj-outcome` Review the outcome | the follow-up record read |

Hints ask the questions ("What does the CTG show, and what does it mean
alongside the reduced movements?", "Which maternal blood test can show the
baby's blood?") and contain no correct option.

### Decisions

- `management` (single; after the history of reduced movements and the CTG):
  **prompt caesarean delivery with the senior obstetrician, the neonatal team
  and emergency blood for the baby**. Distractors: reassure and repeat the CTG
  in a week; admit for an MCA Doppler and KB and decide later; induction of
  labour; external cephalic version first.
- `neonatal-resus` (single; after the newborn's record at birth): **respiratory
  support and an immediate emergency-issue group O red-cell transfusion in
  aliquots, without waiting for a crossmatch or haemolysis tests**. Distractors:
  saline first; wait for group, Coombs and crossmatch; a double-volume
  exchange as for haemolytic disease.
- `diagnosis` (single; after the baby's post-resuscitation record and the
  mother's blood group — **before the KB result is needed**): **FMH, confirmed
  by a maternal KB test (or flow cytometry) and a maternal AFP**. Distractors:
  ABO haemolysis (the baby is group O), Rh haemolysis (both Rh-positive),
  acute blood loss at the caesarean (the Hb was already 38 g/L at birth after
  a week of reduced movements), severe α-thalassaemia (the mother's genotype is
  normal).
- `anti-d` (single; after the KB result): **none — she is Rh-positive; in an
  RhD-negative mother the KB quantifies the bleed to set the anti-D dose**.
  Distractors: a standard dose "because the bleed was large"; a calculated
  dose; "anti-D is never relevant to FMH".

Every option has its own feedback. The old version gated a delivery-timing
decision on post-delivery data and asked the cause only after the KB result;
both are now in time order.

### Rubric (deterministic items, total weight 23)

| id | domain | weight | met when |
|---|---|---:|---|
| `r-hx` | history | 2 | the seven history items of objective 1 |
| `r-hx-triggers` | history | 1 | bleeding/pain, trauma and recent procedures asked (all unrecorded — the point is to ask) |
| `r-ctg` | investigations | 2 | CTG, last week's scan and the antenatal record read |
| `r-deliver` | management | 3 | `management` right first time |
| `r-team` | management | 2 | senior obstetrician, neonatal team and emergency blood called |
| `r-newborn` | management | 3 | `neonatal-resus` right first time |
| `r-dx` | diagnosis | 3 | `diagnosis` right first time |
| `r-fmh-tests` | investigations | 2 | maternal KB, AFP and placental pathology read |
| `r-safety-delay` | safety | 3 | the delivery decision attempted (or the caesarean given) and no send-home, version or induction (annotation: `scoredWhen` + `critical`) |
| `r-antid` | management | 1 | `anti-d` right first time |
| `r-safety-antid` | safety | 1 | `anti-d` attempted and no anti-D given (annotation: `scoredWhen`) |

One examiner-judged item, `r-comm` (weight 2): explaining the emergency
caesarean and gaining consent, and later explaining the baby's condition and
its likely cause honestly.

### How wrong choices score

Replays of the reference path with changes (`paths.ts`, 2026-10-28):

| path | score |
|---|---|
| reference solution | 23/23 (100 %) |
| start only (do nothing) | 0/23 — neither safety item is earned by omission (their `met` includes the precondition) |
| sends her home before deciding | 20/23 (87 %); safety event |
| external cephalic version, and anti-D later | 19/23 (83 %); two safety events |
| every decision guessed wrong once | 13/23 (57 %) |

Contraindicated: `reassure-home`, `ecv`, `induction` and `anti-d` (always);
`emergency-cs` before the CTG has been read.

## Reference path (`solution`)

50 steps: 18 history questions → antenatal record, last week's scan and CTG
(read) → senior obstetrician → `management` → neonatal team, emergency blood,
emergency caesarean → (delivery) the newborn's record → `neonatal-resus` →
(postnatal) post-operative check, her account, the baby's post-resuscitation
record → `diagnosis` → maternal KB, AFP, blood count, placental pathology →
`anti-d` → (follow-up) the follow-up record → finish. `cases verify` passes
with every objective and decision done at the first attempt.

## Clinical numbers check

- Transfusions: 45 mL ÷ 2.38 kg ≈ 18.9 mL/kg; 30 mL ÷ 2.38 kg ≈ 12.6 mL/kg
  (derived; the report gives volumes only). Hb 38 → 74 → 121 g/L.
- Newborn MAP ≈ 25 + (49 − 25)/3 ≈ 33 mmHg (derived).
- **KB estimate (derived, approximate):** fetal blood (mL) ≈ KB % × 50, which
  assumes a maternal blood volume of about 5000 mL and applies no correction:
  9.2 % × 50 ≈ 460 mL — more than the whole blood volume of a 2.38 kg newborn,
  consistent with bleeding over days. The sample was taken after delivery. By
  the same rule, the report's stated normal of ≤ 3 % would already be about
  150 mL, so read KB results against your own laboratory's range.
- AFP 11582 µg/L (= ng/mL), about 11.6 times the 1000 ng/mL threshold the
  report quotes (sensitivity 73.91 %, specificity 90.97 %, accuracy 88.76 % in
  the study it cites).
- Birth weight 2380 g against an estimated 2754 g a week earlier (−13.6 %,
  derived; the report does not comment).
- Mother's Hb 149 g/L: a normal maternal Hb does not argue against FMH — the
  blood lost is the baby's.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did you feel when the trace came back — and when you
   saw an Hb of 38 in the baby?"
2. **Description.** "In two sentences: why did she need delivering that day,
   and what was wrong with the baby?"
3. **Analysis.**
   - "Her scan a week earlier was fine. Why didn't that reassure you?"
   - "Why deliver rather than investigate first? What would you have done at
     30 weeks?"
   - "What did you ask the neonatal team and the blood bank to prepare, and
     why before the birth?"
   - "An Hb of 38 at birth — when did the bleeding happen? How do you know?"
   - "Why can't this baby have ABO haemolysis? What else did the record rule
     out?"
   - "How big was the bleed by the KB rule, and what makes that estimate
     shaky?"
   - "If she had been RhD-negative, what would you have done?"
   - "What did you tell her before the operation, and afterwards?"
4. **Summary.** "What will you do the next time a woman at term says the baby
   is moving less?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Reassured by last week's normal scan | `management` feedback; `reassure-home` contraindicated | `r-deliver`, `r-safety-delay` |
| Investigating (MCA Doppler, KB) before delivering a term baby with an abnormal CTG | `management` feedback; the MCA Doppler has no record | `r-deliver` |
| Turning the breech or inducing labour | contraindicated; feedback | `r-safety-delay` |
| Forgetting the neonatal team and blood | objective 2 cannot complete | `r-team` |
| Waiting for group/Coombs/crossmatch before transfusing | `neonatal-resus` feedback | `r-newborn` |
| Calling it ABO haemolysis because the groups differ | `diagnosis` feedback (group O baby) | `r-dx` |
| "Mother's Hb is normal, so no fetal blood loss" | key reasoning and numbers check | debrief |
| Giving anti-D to an Rh-positive mother | contraindicated; `anti-d` feedback | `r-safety-antid`, `r-antid` |

## Embodied mode

- **Grounding.** The antenatal record, last week's scan, the CTG and the
  newborn's two records are record reviews (`requires: ["records"]`, read at a
  records terminal); the maternal KB, blood count and AFP are sampled at the
  patient (`lab-hematology`, `lab-chemistry`); the placenta goes to the
  pathology workstation (`histopathology`); the MCA Doppler needs an
  ultrasound at the bedside but has no record. The emergency caesarean is
  ordered from the clinic and takes her to theatre (`destination: {setting:
  operating-room}`, posture lying); consults need no equipment.
- **What the offline autopilot does (in-world, `general-hospital`).** It walks
  to the clinic room (53 m) for the history, reads the three antenatal records
  at the pharmacy records terminal (about 24 m away; the clinic rooms have no
  terminal), orders the caesarean (she is moved to theatre), reads the
  newborn's record at that terminal, walks to her ward bed (68 m) after the
  `postnatal` phase moves her there, reads the baby's later record at the ward
  nurses' station, samples her bloods at the bedside and orders the placental
  pathology at the pathology workstation (66 m). It scores 23/23 in both
  in-world and clinical mode with every objective done.
- **Scope of practice.** The caesarean, version and induction are
  `scope: "medical"`; consults and the disposition need no equipment.
- **The single-patient model.** The engine and the world model one patient —
  the mother. The newborn cannot be examined, sampled or treated by the
  learner; her examination, tests and transfusions are records the team reads
  (each says so in its note), and neonatal management is taught through the
  `neonatal-resus` decision and two consults (neonatal team, emergency blood).
  **What the framework would need:** a second patient (a newborn entity) that a
  case can create at a phase (here at `delivery`), with its own history-less
  examination, investigations, interventions and bed space (a resuscitaire),
  so that neonatal resuscitation and transfusion become actions rather than a
  decision.

## Source and adaptation

**From the report.** Every history fact, result, the management and the
outcome; unrecorded data stay `unknown` (9 history items and the unknowns
list); `examNotRecorded` answers any unrecorded examination of the mother.

**Adapted for teaching.**
- Dialogue in her own words; personality, speech style and the opening line.
- The learner is the obstetrician at the routine visit; the CTG has already
  been run by the midwife (there is no CTG device in the world).
- The decisions, options, feedback, rubric and objectives; the interventions
  the report does not record (senior review, the neonatal team, emergency
  blood, and the wrong choices: send home, version, induction, anti-D).
- NPCs (midwife, obstetric attending, neonatologist, laboratory,
  pathology) carry only logistics and teaching knowledge.
- Neonatal data as records (above).

**Labelled ambiguities** (kept, not resolved):
1. The baby's group and Coombs test were done **after** the first transfusion of
   group O cells — noted on that record.
2. "Anti-inflammatory drugs" (抗炎药物) are not named.
3. "Routine drug prophylaxis of infection after the operation" names no drug
   and does not say whether it was for the baby or the mother — noted on the
   follow-up record.
4. The KB result is reported as "HbF content 9.2 %" although the KB test counts
   cells; the case reports the cell proportion and quotes the report's wording.
5. The report's normal value for the KB (≤ 3 %) is kept as its stated value.
6. The Apgar score has no time.

**Figures.** Figure 1 (the maternal KB smear, deep-red HbF cells) was viewed: no
identifier; checksum unchanged; it is attached to the maternal KB result in
the `postnatal` phase, where the test was done. The local source PDF has three
pages: p. 50 and p. 51 of the journal (the lower half of p. 51 is the end of
another article and its references) and the journal's inside-back-cover
figure page (images from other articles: immunohistochemistry, OCT, liver
ultrasound, photographs of a child's feet and buttock skin with no face shown).
All three were checked at 300 dpi: no burned-in
patient identifier. The PDF's own text prints the admission and discharge
calendar dates and the authors' institution (the published article); the
asset title now says what else is on the pages, and the PDF opens only after
the case is complete.

**Annotation file** (`fxc-annotations/cmcr-1653403.json`, applied by the
coordinator): `performedAt: "records"` for `antenatal-record`,
`antenatal-imaging`, `ctg`, `neonatal-birth`, `neonate-blood`, `followup`;
`r-safety-delay` `scoredWhen` (delivery decision attempted, or a delivery or
delaying step taken) and `critical`; `r-safety-antid` `scoredWhen` (the anti-D
decision attempted or anti-D given). No `nonVerbalWhen`: the record does not
say which anaesthetic she had, so nothing shows she could not speak.

## Matcher notes

- ≥ 4 keywords per item and locale, lay and clinical, both languages;
  run-together forms where stop words would leave one token (`howmanychildren`,
  `whichwayup`, `howweretheyborn`).
- `excludeKeywords` separate: the reduced movements vs "today"/"last moved"
  (`movement-today`); antenatal attendance vs results ("normal", "result",
  "scan"); earlier screening vs the last scan and the infection/thalassaemia
  screen; gestation vs how the earlier babies were born; past illness vs
  family history and the sugar test; vaginal bleeding vs gastrointestinal
  bleeding; medicines vs allergies.
- The corpus (35 utterances) passes `cases verify`; none repeats a canonical
  question; every required item has one. A wider probe of 33 further
  paraphrases reaches the intended item in all 33.

## References

- 梁建明, 黃芳芳, 吳思敏, 余善恩. 胎母輸血綜合症1例. 鏡湖醫學. 2025;25(2):50-51. Available from: https://rs.yiigle.com/cmaid/1653403. doi:10.12408/j.issn2223-4462.2025.02.014
- Royal College of Obstetricians and Gynaecologists. Reduced fetal movements (Green-top Guideline No. 57). 2nd ed. London: RCOG [cited 2026 Oct 28]. Available from: https://www.rcog.org.uk/guidance/browse-all-guidance/green-top-guidelines/reduced-fetal-movements-green-top-guideline-no-57/
- New HV, Berryman J, Bolton-Maggs PHB, et al. Guidelines on transfusion for fetuses, neonates and older children. Br J Haematol. 2016;175(5):784-828. doi:10.1111/bjh.14233
- Kim YA, Makar RS. Detection of fetomaternal hemorrhage. Am J Hematol. 2012;87(4):417-423. doi:10.1002/ajh.22255
- 劉瑩. 聯合檢測母血HbF、AFP值在預測胎母輸血綜合征中的應用價值. 中國醫學創新. 2017;14(13):44-48. doi:10.3969/j.issn.1674-4985.2017.13.013

How each DOI was checked (2026-10-28): the source DOI is printed on the PDF
(p. 50) and in the export record; Kim and Makar 2012 and Liu 2017 are printed in
the source's reference list; BSH 2016 was verified by the PR #3 audit against
the BSH guideline PDF and the ISBT listing (not re-checked in this session: the
web-search budget ran out). RCOG GTG 57 has no DOI in the reference: its second
edition and URL were confirmed by the audit, its publication year was not.

### To verify

- **RCOG GTG 57 (2nd edition):** publication year and BJOG citation/DOI.
- **BSH 2016:** the wording on emergency red cells for neonates (group,
  RhD type, CMV/irradiation requirements) and volumes — the case says only
  "emergency-issue group O red cells, in aliquots" and defers to BSH 2016 and
  the local procedure; the DOI was confirmed by the audit only.
- **Anti-D:** no anti-D guideline is cited (none could be verified in this
  session); the case states only that anti-D is for RhD-negative mothers and
  that the KB quantifies the bleed to set the dose. Add the BSH anti-D
  guidance and the UK dose rule once checked.
- **The KB approximation** (KB % × 50 mL) and the KB limitation with maternal
  HbF-containing cells are stated from general knowledge (the audit checked
  the formula against secondary sources).
- No CTG classification (FIGO 2015, NICE NG229) or newborn life-support
  guideline (ERC/AHA) is cited; a reviewer may add them.

## Changelog

### 1.1.0 — 2026-10-28 (editorial revision)

- **Timeline.** Three generic phases → four one-way phases in time order
  (`antenatal`, `delivery`, `postnatal`, `followup`) with theatre and ward
  locations; the delivery decision no longer depends on post-delivery data,
  and the cause is asked before the KB result.
- **The newborn honestly.** The newborn's examination and bloods were attached
  to the mother (an exam item and a blood test sampled from her); they are now
  two records of the newborn read by the team, each saying so, and the README
  says what the framework would need (a second patient).
- **Decisions.** Two binary decisions with identical feedback → four decisions
  with 4–5 options and distinct feedback (`management` — delivery,
  `neonatal-resus`, `diagnosis` — cause and confirming test, `anti-d`).
- **Interventions.** 0 → 8 (senior review, neonatal team, emergency blood,
  emergency caesarean; send-home, version, induction and anti-D as
  contraindicated choices).
- **Rubric.** 4 items scoring `decided` → 12 items (`decidedFirstTry`, two
  safety items not earned by omission, one examiner-judged communication item).
- **Source facts restored.** NT and FHR at 13 weeks; the 14-week ECG; the
  22-week FHR; the infection screens; the thalassaemia gene test; the scan
  biometry and placental grade; the newborn's X-ray and diagnoses; the
  transfusion volumes (45 mL, then 30 mL the next day); the timing of the
  group/Coombs test after the first transfusion; the post-operative timing of
  the maternal tests; the Apgar without a time; the source's KB normal value and
  AFP threshold with its sensitivity and specificity.
- **Placeholder exam findings** ("not provided" items counted as an
  examination) removed; `examNotRecorded` covers them. Week-old scans and the
  CTG no longer need an ultrasound at the bedside (record reviews); the CTG
  result no longer states that a caesarean followed.
- **Voice.** First-person lay speech; persona notes for an actor; the library's
  `fallbackUnknown`; new pseudonym (邝女士 / Ms Kuang — "Tang" is an English
  word); a pertinent unknown about recent procedures replaces the template
  "self-care" question.
- **Teaching layer.** 5 learning outcomes; 4 teaching points (RCOG GTG 57,
  BSH 2016, the report's discussion and references); key reasoning on the
  ABO/Rh/thalassaemia exclusions, the KB estimate and anti-D.
- **Matcher.** 16 verbatim utterances → 35 paraphrases; ≥ 4 keywords per item.
- **References** in Vancouver style; the unverified "2026" year of GTG 57
  removed.
- **Governance.** `provenance.review` (editorial, AI-assisted); version 1.0.0 →
  1.1.0; difficulty 4 → 3; this README; the source PDF title now says what else
  is on its pages.
- **Ids.** History `occupation`, `self-care`, `expectations` removed;
  `movement-today`, `infection-thal`, `version`, `postnatal-status` added. Exam
  `maternal-vitals`, `maternal-exam`, `newborn` removed; `maternal-postop`
  added. Investigations `antenatal-record`, `mca-doppler`, `neonatal-birth`,
  `maternal-afp`, `maternal-fbc`, `flow-cytometry` added; `neonate-blood` is now
  the baby's post-resuscitation record. Decisions `neonatal-resus`, `anti-d`
  added (`management`, `diagnosis` kept with new content). Objectives and rubric
  re-keyed (`obj-*`, `r-*`). Phases `initial`/`workup` → `antenatal`/`delivery`/
  `postnatal` (`followup` kept). No test references these ids.

### 1.0.0

- First release in PR #3 (CMCR collection).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1653403/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1653403                                      # 50 steps · 6/6 objectives · 4/4 decisions · 35/35 utterances
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1653403             # passes
npm run -s cc -- exec --case cmcr-1653403 --autopilot --approval bypass --provider offline --output-format json             # 23/23, 6/6
npm run -s cc -- exec --case cmcr-1653403 --autopilot --approval bypass --provider offline --output-format json --embodied  # 23/23, 6/6
```

## 中文摘要

**病例概要。** 29岁，孕3产2，孕37+2周，规律产检。常规产检时诉近1周胎动较前减少（未计数）。既往体健；唐筛低风险，孕22周超声未见明显异常，OGTT正常，血型B型Rh阳性，传染病筛查阴性，地中海贫血基因正常。就诊前7天超声：单胎臀位，估重2754 g，羊水指数12.25 cm，脐动脉S/D 2.03。急诊胎心监护见可疑正弦波形，行急诊剖宫产。女婴2.38 kg，Apgar 8分（时间未注明），苍白、心率200次/分、血压49/25 mmHg、呼吸困难，Hb 38 g/L，X线提示肺炎；诊断新生儿重度贫血、肺炎、休克。无创通气、紧急输注O型浓缩红细胞45 mL及“抗炎药物”后好转（Hb 74 g/L，O型、Rh阳性、Coombs阴性），次日再输30 mL（Hb 121 g/L），出生后第7天出院。母亲术后良好；KB试验胎儿红细胞9.2%（原文正常值≤3%），AFP 11582 µg/L，Hb 149 g/L；胎盘局灶梗死<5%。作者诊断胎母输血综合征。

**学习目标。**

1. 识别足月胎动减少伴可疑正弦波形提示胎儿可能贫血或缺氧，需尽快分娩，并提前安排新生儿团队和紧急用血。
2. 为苍白、休克、Hb 38 g/L的新生儿安排呼吸支持和紧急红细胞输注，不等配血或溶血检查。
3. 运用母血KB试验和AFP确认胎母输血，并说明估算公式的假设。
4. 依据记录排除ABO/Rh溶血、地中海贫血、双胎输血和分娩时急性失血。
5. 说明胎母输血后何时需要抗D免疫球蛋白，以及本例为何不需要。

**关键决策。**

- 足月胎动减少+正弦波形：尽快剖宫产，同时请上级、通知新生儿团队、为新生儿备血；不回家等待，不先做检查再决定，不引产，不做外倒转。
- 休克的重度贫血新生儿：呼吸支持，立即分次输注紧急发放的O型红细胞，不等配血；不只用生理盐水，不行换血。
- 病因：胎母输血——在知道KB结果之前就要想到，并送母血KB（或流式细胞术）和AFP；宝宝O型、Coombs阴性、母婴Rh阳性、母亲地贫基因正常，排除了其他原因。
- 抗D：母亲Rh阳性，不需要；RhD阴性的母亲才需要按KB定量补足剂量。

**复盘要点。**

- 足月胎动减少要及时评估并做胎心监护（RCOG GTG 57）；一周前正常的B超不代表现在安全。
- 出生时Hb已低说明失血发生在分娩前；母亲Hb正常不能排除胎母输血。
- KB估算（KB%×50 mL）只是粗略推算：9.2%约460 mL，提示多日慢性失血；原文“≤3%”的正常值需按本实验室标准解读。
- 新生儿紧急输血按BSH 2016和本院流程；本例两次输血约19和13 mL/kg。
- 本平台每个病例只有一位患者（母亲），新生儿资料以记录形式出现。
- 本病例经人工智能辅助编辑审核，尚未经执业医师审核；用于教学前请由本专科医师审核。
