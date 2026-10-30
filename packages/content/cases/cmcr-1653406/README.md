# cmcr-1653406 — Term pregnancy awaiting delivery · 34-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners
> open the case from the case library, where the title, summary, chief
> complaint and tags give nothing away.

**Published-case adaptation.** The case retells a report published in a
Chinese Medical Association journal (CMCR collection; citation below). The
patient (上官女士 / Ms Shangguan) is a pseudonym; hospitals, calendar dates and
the authors' institution are left out of the case text. The historical course
is a fact of the record; current guidance is taught in the decisions, the
feedback and the debrief.

## Case card

| | |
|---|---|
| id / version | `cmcr-1653406` / `1.1.1` |
| setting / facility | `operating-room` / `general-hospital` (operating theatre → ICU → ward) |
| specialty | obstetrics, anaesthesiology, critical care |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: a staged historical review, no simulated physiology) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have an obstetric anaesthetist or obstetrician review it before teaching use |
| phases | `theatre` → `positioning` → `collapse` → `icu` → `followup`, all one-way (none learner-switchable), each entered automatically when the previous chapter's objective is done |
| content | 25 history items (10 required, 16 `unknown`) · 9 exam findings · 7 investigations (2 with no record in the source) · 28 interventions (5 wrong or historical-only choices) · 6 objectives · 4 decisions (4–5 options each) · 12 rubric items (11 deterministic, weight 24; 1 examiner-judged) · 4 NPCs · 6 learning outcomes · 6 teaching points · 37 test utterances |
| source | 陳明輝. 圍手術期孕婦羊水栓塞1例. 2025;25(2):55,79 (see References) |

## Learning outcomes

After the case the learner can:

1. Recognise sudden hypoxaemia, hypotension and coagulopathy during a
   caesarean — here preceded by chest and abdominal discomfort, vomiting and
   a fetal bradycardia — as possible amniotic fluid embolism (AFE), and call
   the multidisciplinary team at once (SMFM 2016; Chinese 2018 consensus).
2. Prioritise oxygenation and ventilation, vasopressor and inotropic support
   and prompt delivery, giving fluid only in limited boluses (no more than
   500 mL each) so as not to overload a failing right ventricle (SMFM 2016;
   SMFM checklist 2021/2026).
3. Interpret the clotting results against late-pregnancy physiology (a
   fibrinogen of 1.38 g/L at term is markedly low) and replace fibrinogen
   early within a massive transfusion protocol, without heparin (SMFM 2016;
   Chinese 2018 consensus).
4. Work through the differential of peripartum collapse from the recorded
   findings: obstetric haemorrhage, drug anaphylaxis, a high neuraxial block,
   aspiration and pulmonary embolism.
5. Compare the Clark 2016 research case definition with the Chinese 2018
   clinical criteria and explain why AFE remains a clinical diagnosis of
   exclusion.
6. Distinguish the report's historical measures (corticosteroids, dopamine,
   bicarbonate, rapid fluids) from current evidence-based recommendations.

These are the case's `learningOutcomes` (shown in every debrief); the six HUD
`objectives` below are the in-game task list.

## Clinical summary

**Before theatre.** A 34-year-old in her first pregnancy (G1P0) was admitted
at 40+6 weeks to await delivery. On the afternoon of hospital day 2 her
membranes ruptured with yellow-green, grade I meconium-stained liquor; her
obstetrician judged that she would not deliver vaginally soon and booked a
caesarean. Fasting status, allergies, past history, medicines, previous
anaesthetics, pregnancy complications, family history and her temperature in
labour are **not recorded**.

**In theatre (awake).** On arrival BP 138/87 mmHg, HR 78/min, SpO₂ 98 % on
air; fetal heart monitoring normal (no number given). A spinal was planned
(no contraindication). As she was helped onto her right side for the spinal
she complained of precordial and abdominal discomfort and vomited about
300 mL of gastric contents. She was laid supine with face-mask oxygen; her
vital signs showed no clear change but the discomfort persisted. The fetal
heart was then about **60/min**. Whether the spinal was ever given is not
stated — the next recorded step is general anaesthesia.

**After induction and delivery.** Rapid-sequence induction with cricoid
pressure; uncomplicated intubation; mechanical ventilation. A live boy was
delivered within 5 minutes of the start of surgery (Apgar 5-7-8-9, times not
given). Her SpO₂ fell abruptly to 85 % and then could not be measured; she was
cyanosed all over and her BP fell to a lowest of **41/29 mmHg**. Blood gas:
pH 7.15, combined respiratory and metabolic acidosis, "Hb not low", "PaO₂
normal" (no other values). Clotting (values from the discussion): PT 12.5 s,
APTT 40.2 s, **fibrinogen 1.38 g/L**, D-dimer 9.22 mcg/mL; no platelet count.
Intra-operative echo: normal LV ejection fraction, RV not enlarged. Pupils
2–3 mm, equal, reactive.

**The report's management.** Adrenaline, noradrenaline and dopamine for the
blood pressure; hydrocortisone and adrenaline as "anti-allergy" treatment;
rapid fluids, bicarbonate and ventilator adjustment; hospital MET called;
left brachial arterial and right internal jugular lines. The discussion adds
100 % oxygen, treatment to lower pulmonary artery pressure and diuresis (drugs
not named), plasma, pooled cryoprecipitate and platelets, and the ECMO team on
standby. End of surgery: BP 102/62 mmHg, HR 120–130/min, SpO₂ still
unreadable; to ICU intubated. In ICU: vasoactive infusions, steroids,
transfusion (post-operative totals: group-specific red cells 4 U, FFP 4 U,
cryoprecipitate 10 U, platelets 4 U), antibiotics, gastric protection.
Extubated on postoperative day 2, to the ward on day 3, home on day 6
(afebrile, well, clean wound). ECMO was not used.

**Diagnosis.** The authors diagnosed AFE after excluding obstetric
haemorrhage, anaphylaxis and a high neuraxial block. The case meets all five
criteria of the Chinese 2018 consensus but not the Clark 2016 research
definition, which needs overt DIC (no platelet count; the authors state there
was no clear DIC). The report's introduction quotes an incidence of about
1.2–6.6 per 100 000 pregnancies and death or permanent neurological injury in
30–40 % (its references 1–3).

## Scenario timeline and physiology

| phase | where | enters when | what the learner meets |
|---|---|---|---|
| `theatre` (initial) | operating theatre | start | awake patient on the table; pre-anaesthetic history, arrival vital signs, fetal heart |
| `positioning` | theatre | objective `obj-preop` complete | the change on turning for the spinal: symptoms, vomit, repeat vitals, fetal heart ~60/min; decision `next-step` |
| `collapse` | theatre | objective `obj-change` complete (decision right, RSI and the caesarean given) | collapse after induction and delivery; decisions `management`, `diagnosis`, `coagulopathy`; gas, clotting, echo |
| `icu` | ICU (`location: {setting: icu}`) | objectives `obj-resus` and `obj-cause` complete and `transfer-icu` given | handover vital signs, the anaesthetic record (the report's theatre management) |
| `followup` | ward (`location: {setting: ward}`) | objective `obj-icu` complete | postoperative day 6: her account, discharge examination, the ICU course and follow-up record |

- **Static clock, one-way phases.** Every phase is a fixed part of the record,
  so none is learner-switchable: a learner cannot jump to the collapse before
  committing to the decision about the fetal bradycardia, and cannot go back
  to a phase whose objective is already done (orders keep their phase, so
  earlier results stay readable). Each `enterWhen` also names the phase it
  leaves, so two transitions can never fire together.
- **No physiology.** The collection contract keeps CMCR cases on a static
  clock without a physiology model; the vital signs are exam findings that
  quote the record. Interventions have no effects; their responses say what
  the report did.
- **The patient cannot speak in `collapse` and `icu`** (general anaesthesia,
  then intubated until postoperative day 2). No history item is available in
  those phases. Until the framework's `patient.nonVerbalWhen` lands, an
  unmatched question there is answered with the patient's fallback line; the
  annotation (below) makes the reply an honest narration instead.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-preop` Pre-anaesthetic check | presentation, rupture, liquor, reason for caesarean, anaesthetic plan, fasting, allergies, past illness asked; arrival vitals and fetal heart examined |
| 2 | `obj-change` The change after positioning | symptoms and current state asked; fetal heart re-checked; supine with left uterine displacement and face-mask oxygen given; `next-step` decided; RSI and the caesarean given |
| 3 | `obj-resus` Resuscitation in theatre | collapse assessed; `management` decided; MET called; 100 % oxygen ventilation; a vasopressor (noradrenaline or adrenaline) |
| 4 | `obj-cause` Find the cause; correct the clotting | blood gas, clotting and echo read; `diagnosis` and `coagulopathy` decided; cryoprecipitate given |
| 5 | `obj-icu` Transfer and ICU handover | transfer given; handover vitals examined; anaesthetic record read; ICU ventilation continued |
| 6 | `obj-outcome` Review the outcome | her account asked; follow-up record read |

The hints ask questions ("What is she feeling? How is the baby now?", "What
level of fibrinogen would you expect at term?") and never contain a correct
option.

### Decisions

- `next-step` (single; after the symptoms and the fetal heart of ~60/min):
  **category-1 caesarean under rapid-sequence general anaesthesia, with help
  called and preparation for maternal deterioration**. Distractors: wait and
  give the planned spinal; a 500 mL bolus and a 15-minute recheck; leave
  theatre for continuous CTG.
- `management` (select all; once the collapse is examined, before any result):
  call help (MET, seniors, ICU, blood bank, ECMO); 100 % oxygen with
  vasopressor/inotrope support; clotting tests and blood gas with the massive
  transfusion protocol ready. Wrong: large pressure-bag fluids until the BP is
  normal (SMFM: avoid excessive fluid); wait for a confirmatory test.
- `diagnosis` (single; once the gas and clotting are read): **AFE as a
  clinical diagnosis of exclusion**. Distractors are the authors' own excluded
  causes and the one the record invites: haemorrhage ("Hb not low"),
  anaphylaxis to the induction drugs (the team did give "anti-allergy"
  treatment, but the symptoms began before any drug), aspiration (she vomited,
  but PaO₂ was reported normal and aspiration explains neither the shock nor
  the coagulopathy) and a high block (the spinal may never have been given).
  The correct option's feedback sets out the Chinese 2018 criteria against
  the Clark 2016 research definition.
- `coagulopathy` (single; once the clotting is read): **early fibrinogen
  replacement within the massive transfusion protocol, guided by repeat
  tests**. Distractors: "PT is normal, so wait for bleeding"; wait for an
  overt-DIC score; FFP alone (volume); heparin (Chinese 2018: not routine).

Every option has its own feedback. No decision is unlocked by the result that
names its answer: `management` opens on the examination alone, and
`diagnosis` opens on the gas and clotting, which support but do not name AFE.

### Rubric (deterministic items, total weight 24)

| id | domain | weight | met when |
|---|---|---:|---|
| `r-hx` | history | 1 | the eight pre-anaesthetic questions of objective 1 |
| `r-ex` | examination | 1 | arrival vitals, fetal heart, fetal heart re-check |
| `r-prodrome` | management | 2 | supine with left uterine displacement, face-mask oxygen, current state re-asked |
| `r-next` | management | 3 | `next-step` right first time |
| `r-help` | safety | 3 | MET and senior help called (annotation: `critical`) |
| `r-first` | management | 3 | `management` right first time, 100 % oxygen ventilation and a vasopressor |
| `r-inv` | investigations | 2 | gas, clotting and echo read in the collapse phase |
| `r-dx` | diagnosis | 3 | `diagnosis` right first time |
| `r-coag` | management | 2 | `coagulopathy` right first time, massive transfusion protocol and cryoprecipitate |
| `r-safety` | safety | 3 | resuscitation started (decision attempted or a bolus/vasopressor/inotrope given) and no pressure-bag fluids or heparin (annotation: `scoredWhen` + `critical`) |
| `r-handover` | management | 1 | transfer to ICU and the anaesthetic record read |

One examiner-judged item, `r-comm` (weight 2): closed-loop crisis
communication with clear roles, and an SBAR handover to ICU (`judgeGuidance`
lists what good looks like).

### How wrong choices score

The percentage is the weighted deterministic rubric; contraindicated
interventions also appear as safety events in the debrief. Decision items use
`decidedFirstTry`, so guessing through the options costs marks. Replays of the
reference path with changes (`paths.ts`, 2026-10-28):

| path | score |
|---|---|
| reference solution | 24/24 (100 %) |
| start only (do nothing) | 0/24 — `r-safety` is not earned by omission: its `met` includes the precondition |
| reference + pressure-bag fluids + heparin | 21/24 (88 %); two safety events |
| every decision guessed wrong once | 13/24 (54 %) |
| caesarean ordered before the anaesthetic | 24/24, with a safety event (`category-1-cs` is contraindicated until `ga-rsi`) |

Contraindicated: `rapid-fluids` (positioning, collapse, ICU), `heparin`
(collapse, ICU), `category-1-cs` before `ga-rsi`. Historical-only measures
(`dopamine`, `hydrocortisone`, `bicarbonate`) are neutral; their responses
contrast the report with current guidance.

## Reference path (`solution`)

66 steps, static clock: 17 pre-anaesthetic questions and two examinations →
(positioning) symptoms, vomit, fetal heart re-check, supine with left uterine
displacement, face-mask oxygen, current state, breathing, other symptoms,
repeat vitals, MET call, IV access, `next-step`, RSI, caesarean → (collapse)
assessment, `management`, 100 % oxygen, noradrenaline, ECMO standby, massive
transfusion protocol, pupils, gas, clotting, arterial and central lines, echo,
`diagnosis`, `coagulopathy`, cryoprecipitate, a 500 mL bolus, transfer →
(ICU) handover vitals, anaesthetic record, ICU ventilation → (follow-up) four
questions, discharge examination, follow-up record → finish. `cases verify`
passes with every objective and decision done at the first attempt.

## Clinical numbers check

- MAP on arrival 87 + (138 − 87)/3 ≈ 104 mmHg; at the nadir 29 + (41 − 29)/3 ≈
  33 mmHg; at the end of surgery 62 + (102 − 62)/3 ≈ 75 mmHg (derived; the
  report gives only systolic/diastolic pairs).
- Fibrinogen 1.38 g/L is below the usual adult reference range of most
  laboratories, and fibrinogen normally rises in late pregnancy, so it is
  markedly low for term; the report gives no reference ranges.
- PT 12.5 s (called "prolonged" in the case presentation, given as 12.5 s in
  the discussion — kept as published), APTT 40.2 s, D-dimer 9.22 mcg/mL (FEU
  or DDU not stated).
- Timeline: membrane rupture on the afternoon of hospital day 2; delivery
  within 5 minutes of the start of surgery; extubation on postoperative day 2;
  ward on day 3; discharge on day 6.
- Blood products after the operation (as published, local unit definitions not
  stated): red cells 4 U, FFP 4 U, cryoprecipitate 10 U, platelets 4 U.
- Interventions' doses are formulas, not her values: noradrenaline "started
  low (e.g. 0.05 µg/kg/min) and titrated"; dobutamine 2.5–5.0 µg/kg/min (the
  range in commentary on the Chinese 2018 consensus — see To verify);
  hydrocortisone 500–1000 mg/day as the Chinese 2018 consensus gives it (the
  report records no dose); crystalloid challenges of 500 mL (the SMFM
  checklist's authors).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel when her saturation disappeared from the
   monitor a few minutes after you had delivered the baby?"
2. **Description.** "In two sentences, what happened between turning her for
   the spinal and the transfer to ICU?"
3. **Analysis.**
   - "When she felt unwell on her side and the fetal heart was 60/min, what
     made you choose general anaesthesia — and what were you preparing for?"
   - "Which causes of collapse did you consider? Which findings in the record
     argued against each?"
   - "She had just had induction drugs. How did you weigh anaphylaxis?"
   - "Why does a fibrinogen of 1.38 g/L worry you more at term than it would
     in a non-pregnant woman? Why not wait for a DIC score?"
   - "The report gave 'rapid fluids'. How much fluid would you give a failing
     right ventricle, and why?"
   - "Does she meet the Clark research criteria? Does it matter at the
     bedside?"
   - "What did you say, to whom, when the collapse began? How did you hand
     over to ICU?"
4. **Summary.** "What will you do in the first five minutes the next time a
   woman collapses during a caesarean?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Proceeding with the spinal, or waiting, with a fetal heart of 60/min | `next-step` feedback | `r-next` |
| Starting the caesarean before an anaesthetic | contraindicated (safety event) | debrief |
| Pressure-bag fluids "until the BP is normal" | contraindicated; `management` feedback | `r-safety`, `r-first` |
| Waiting for a test to confirm AFE | `management` feedback | `r-first` |
| Calling it anaphylaxis because it followed RSI | `diagnosis` feedback (onset before any drug; coagulopathy) | `r-dx` |
| Reading the PT alone, or waiting for a DIC score | `coagulopathy` feedback | `r-coag` |
| Heparin for "DIC" | contraindicated; feedback cites the Chinese 2018 consensus | `r-safety` |
| FFP alone for low fibrinogen | `coagulopathy` and `ffp` feedback (volume) | `r-coag` |
| Treating the report's steroids, dopamine and bicarbonate as proven | neutral responses contrast them with guidance | debrief |
| Not calling for help | objective 3 cannot complete | `r-help` |

## Embodied mode

- **Grounding (EMBODIED §6, CASE_AUTHORING §8).** Theatre interventions name
  their kit: RSI → `anesthesia` + `airway` (the anaesthesia machine), 100 %
  oxygen ventilation → `anesthesia`, the caesarean → `surgery` (the operating
  table), face-mask oxygen → `oxygen` (`device: simple-mask`), infusions →
  `infusion-pump` + `iv-access`, the arterial line → `cardiac-monitor`, ICU
  ventilation → `ventilator`. Blood products are `blood-bank` (delivered) +
  `iv-access`. The case has one IV-access procedure (`iv-access`); no cannula
  is recorded, so `ivAccessInSitu` is not set.
- **What the offline autopilot does (in-world, `general-hospital`).** It walks
  from the entrance to the theatre (79 m), fetches a resuscitation trolley from
  ICU for the cannula (the theatre has none; ~23 m each way) and the
  ultrasound/echo cart from the radiology ultrasound room for the echo (~83 m
  each way). The gas and clotting are sampled at the patient. Entering `icu`
  moves her to the ICU bed (the ICU ventilator is then at her bedside); entering
  `followup` moves her to a ward bed. The two record reviews are read at a
  records terminal (ICU station, ward station). It scores 24/24 in both
  in-world and clinical mode with every objective done. (It first tries some
  device operations — oxygen outlet, anaesthesia machine, infusion pump — and
  falls back to the clinical action when a device precondition fails; the
  outcome is the same.)
- **Scope of practice.** RSI, the caesarean, ventilator settings, the arterial
  and central lines and ICU ventilation are `scope: "medical"`; positioning,
  oxygen, drugs, fluids and blood products follow their kind (nursing); the
  IV-access procedure is nursing.
- **The theatre has no records terminal** in `general-hospital` today, so no
  record review is placed in a theatre phase; the framework engineer is adding
  one.

## Source and adaptation

**From the report.** Every history fact, finding, result, the management and
the outcome. Unrecorded data stay `unknown` (16 history items, the unknowns
list), and `examNotRecorded` answers any unrecorded examination.

**Adapted for teaching.**
- Dialogue in her own words; personality and speech style; the opening line.
- The learner is the anaesthetist; the phase split (theatre, positioning,
  collapse, ICU, follow-up) and the one-way transitions.
- The decisions, options, feedback, rubric and objectives. Interventions the
  report does not record (left uterine displacement, a 500 mL bolus, the
  massive transfusion protocol, dobutamine, heparin, pressure-bag fluids) are
  offered so the learner can make current or tempting choices; their
  responses say what the report did instead.
- NPCs (theatre nurse, anaesthesia attending, obstetrician, transfusion
  laboratory) carry only logistics and teaching knowledge.

**Labelled contradictions and ambiguities** (kept, not resolved):
1. **PT**: "prolonged" in the case presentation; 12.5 s in the discussion, which
   is within many laboratories' ranges; no range given. Both are in the
   clotting result's note, and the result's `source` names both sections.
2. **Blood-product timing**: post-operative totals in ICU in the case
   presentation; plasma, pooled cryoprecipitate and platelets during the
   anaesthetist's initial management in the discussion.
3. **Whether the spinal was given**: not stated (positioning, then general
   anaesthesia), yet the discussion lists a high neuraxial block among the
   causes excluded. Kept as an unknown and used in the `diagnosis` feedback.
4. **"SpO₂ unreadable" with "PaO₂ normal"**: not a contradiction in itself (the
   gas timing and FiO₂ are unrecorded; an unreadable SpO₂ usually reflects poor
   perfusion) — taught in key reasoning.
5. Measures named only in the discussion (lowering pulmonary pressure,
   diuresis) are in the anaesthetic record's note, with their drugs marked as
   not named.

**Figures.** The article has no figures. The local source PDF (2 pages) is
p. 55 and p. 79 of the journal; p. 79 is mostly another article (a traditional
Chinese medicine piece) with this report's reference list at the foot; its
asset title says so, and it opens only after the case is complete. No page
carries a patient identifier (the author line names the authors'
institution, as every journal article does).

**What the framework would need.** `patient.nonVerbalWhen` (written as an
annotation), `investigations[].performedAt: "records"` for the two record
reviews, `rubric[].scoredWhen` / `critical`, and a records terminal in the
theatre — all being added by the framework engineer.

**Annotation file** (`fxc-annotations/cmcr-1653406.json`, applied by the
coordinator): `performedAt: "records"` for `circulatory-record` and
`followup`; `nonVerbalWhen: {any: [{phase: collapse}, {phase: icu}]}` with the
reason "intubated and ventilated (under general anaesthesia in theatre)";
`r-safety` `scoredWhen` (resuscitation started or a harmful item given) and
`critical`; `r-help` `critical`. The case is correct without them: `r-safety`'s
`met` already contains its precondition.

## Matcher notes

- Lay and clinical phrasings in both languages; ≥ 4 keywords per item per
  locale. Two-word English phrases that collapse to one token through stop
  words ("pregnant again", "this pregnancy") are written run together
  (`pregnantagain`) or replaced.
- `excludeKeywords` separate look-alikes: the anaesthetic plan vs a previous
  anaesthetic (`before`, `以前`); fasting vs alcohol and medicines; the symptoms
  on turning vs "any better?" (`better`, `好点`) and vs dizziness or breathing;
  the reason for the caesarean vs previous surgery; past illness vs family and
  pregnancy questions; the baby vs future pregnancies; future pregnancy vs
  "how many weeks".
- The corpus (37 utterances, `extensions.testUtterances`) passes `cases
  verify`; none repeats a canonical question; every required item has one. A
  wider probe of 44 more paraphrases reaches the intended item in 43; "Was the
  fluid green?" falls to a clarifying question, because the answer word is
  deliberately not a keyword.

## References

- 陳明輝. 圍手術期孕婦羊水栓塞1例. 鏡湖醫學. 2025;25(2):55,79. Available from: https://rs.yiigle.com/cmaid/1653406. doi:10.12408/j.issn2223-4462.2025.02.017
- Society for Maternal-Fetal Medicine (SMFM). Amniotic fluid embolism: diagnosis and management (SMFM Clinical Guideline #9; reaffirmed 2024). Am J Obstet Gynecol. 2016;215(2):B16-B24. doi:10.1016/j.ajog.2016.03.012
- Combs CA, Montgomery DM, Toner LE, Dildy GA. Society for Maternal-Fetal Medicine Special Statement: checklist for initial management of amniotic fluid embolism. Am J Obstet Gynecol. 2021;224(4):B29-B32. doi:10.1016/j.ajog.2021.01.001
- Martinez-King LC, Combs CA, Montgomery DM, Toner LE, Dildy GA; Society for Maternal-Fetal Medicine Patient Safety and Quality Committee. Society for Maternal-Fetal Medicine Special Statement: checklist for initial management of amniotic fluid embolism — updated 2026. Pregnancy (Hoboken). 2026;2(5):e70364. doi:10.1002/pmf2.70364
- Clark SL, Romero R, Dildy GA, et al. Proposed diagnostic criteria for the case definition of amniotic fluid embolism in research studies. Am J Obstet Gynecol. 2016;215(4):408-412. doi:10.1016/j.ajog.2016.06.037
- 中华医学会妇产科学分会产科学组. 羊水栓塞临床诊断与处理专家共识(2018). 中华妇产科杂志. 2018;53(12):831-835. doi:10.3760/cma.j.issn.0529-567x.2018.12.006
- Viau-Lapointe J, Filewod N. Extracorporeal therapies for amniotic fluid embolism. Obstet Gynecol. 2019;134(5):989-994. doi:10.1097/AOG.0000000000003513

How each DOI was checked (2026-10-28): the source DOI is printed on the PDF
(p. 55) and in the export record; SMFM #9 (PubMed 26987420, reaffirmation
2024), the 2021 checklist and the 2026 update (*Pregnancy*, Wiley) by web
search of the publisher, PubMed/PMC and SMFM listings; Clark 2016 and
Viau-Lapointe 2019 are printed in the source's reference list (Clark's issue
number and PubMed 27372270 by web search); the Chinese consensus by its journal
and Wanfang listings.

### To verify

- **RCOG Green-top Guideline No. 56** (maternal collapse; left uterine
  displacement and perimortem delivery) — not cited: its edition, journal
  pages and DOI could not be checked (the session's web-search budget ran
  out). Left uterine displacement is taught as physiology (aortocaval
  compression), not as a guideline claim.
- The dobutamine range 2.5–5.0 µg/kg/min was found in commentary on the
  Chinese 2018 consensus; confirm it in the consensus text.
- SMFM 2016 makes no corticosteroid recommendation (found in a secondary
  source); confirm in the guideline text. Whether SMFM 2016 addresses
  recombinant factor VIIa was not checked (not used in the case).
- The 2026 checklist has a correction (*Pregnancy* 2026;2(5):e70459); the
  corrected wording was not read. Martinez-King's initials are from the SMFM
  publications listing.
- SMFM #9's author initials (surnames Pacheco, Saade, Hankins, Clark
  confirmed) — the reference cites the issuing body instead.
- The Chinese 2018 consensus full text was not read: its five criteria, the
  steroid statement and the heparin statement were confirmed from its journal
  listing and quotations.

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

- **Options rebalanced so the key is not cued by length.** In all three
  single-best decisions the keyed option was the uniquely longest in both
  languages (1.9–2.8 times the mean option length); now it is in none. The
  `next-step`, `diagnosis` and `coagulopathy` keys say the same in fewer
  words, and the `coagulopathy` key no longer names amniotic fluid embolism
  (that decision can be answered before `diagnosis`). Each distractor now
  gives the reason it tempts: a general anaesthetic straight after vomiting
  carries the greatest airway and aspiration risk (wait for the spinal);
  in-utero resuscitation may bring the fetal heart back (500 mL and a
  15-minute recheck); her symptoms are unexplained (back to the delivery
  suite); profound hypotension with a low fibrinogen and a raised D-dimer
  before the blood loss is measured (haemorrhage); collapse soon after
  induction, the classic timing of anaphylaxis; vomiting before the airway
  was protected (aspiration); symptoms that began while she was positioned
  for the spinal (high block); a PT of 12.5 s and the volume load on the
  right ventricle; products wasted or feeding the consumption before DIC is
  proven; plasma replacing every clotting factor in one product; a D-dimer of
  9.22 mcg/mL as clotting still being activated (heparin). In the select-all
  `management` decision the two wrong options give their reason too
  (restoring preload; each differential treated differently — named without
  the key), and `oxygen-pressors` adds titration to blood pressure and
  perfusion. The feedback of `proceed-spinal`, `back-to-labour`,
  `wait-confirm`, `haemorrhage`, `aspiration`, `pt-normal` and `wait-dic` now
  also answers the reason its text gives. Medical meaning, correct flags,
  scoring and the reference path are unchanged; no new patient fact is
  introduced.
- **Option ids neutral:** every id already names its content; none renamed.

### 1.1.0 — 2026-10-28 (editorial revision)

- **Timeline and phases.** Three generic phases → five one-way phases that
  follow the record (`theatre`, `positioning`, `collapse`, `icu`, `followup`);
  the awake history is no longer asked of an intubated patient; ICU and ward
  locations added.
- **Decisions.** Two binary decisions with identical feedback → four decisions
  with 4–5 options and distinct, guideline-based feedback (`next-step`,
  `management` — first actions, `diagnosis` — differential, `coagulopathy`).
- **Interventions.** 0 → 28: the report's management (RSI, caesarean, MET,
  ECMO standby, vasopressors, steroids, bicarbonate, lines, blood products, ICU
  care) and current or tempting choices (left uterine displacement, limited
  bolus, massive transfusion protocol, dobutamine; pressure-bag fluids and
  heparin as contraindicated).
- **Rubric.** 4 items scoring `decided` → 12 items (`decidedFirstTry`, two
  safety items, one examiner-judged communication item); a harm item that
  cannot be earned by doing nothing.
- **Source facts restored.** Grade I meconium; RSI with cricoid pressure;
  every drug and line the report names; end-of-surgery values; ICU treatment
  and blood-product totals; the male infant and Apgar series; the
  discussion-only measures. Coagulation values attributed to the discussion,
  with the PT contradiction and the blood-product timing labelled; the spinal
  ambiguity kept as an unknown.
- **Echo** no longer carries the "retrieves an existing report" note (it is a
  study done in theatre); the old "fetal-monitor" record became exam findings;
  the placeholder "baseline exam" (a finding saying "not reported") was
  removed — `examNotRecorded` covers it.
- **Voice.** First-person lay speech; persona notes for an actor; the library's
  `fallbackUnknown`; new pseudonym (上官女士 / Ms Shangguan — the old 陆/Lu
  duplicated another CMCR case).
- **Teaching layer.** 6 learning outcomes, 6 teaching points naming SMFM 2016,
  the SMFM checklist 2021/2026, Clark 2016 and the Chinese 2018 consensus;
  key reasoning, unknowns and boundaries rewritten.
- **Matcher.** 12 verbatim utterances → 37 paraphrases; ≥ 4 keywords per item.
- **References** in Vancouver style with verified DOIs; source pages 55,79.
- **Governance.** `provenance.review` (editorial, AI-assisted); version 1.0.0 →
  1.1.0; difficulty 4, 35 minutes; this README.
- **Ids.** History `occupation`, `self-care` removed; `liquor`, `fasting`,
  `pregnancy-course`, `breathing`, `other-prodrome`, `recovery-status`,
  `memory`, `baby`, `future-pregnancy` added. Exam `baseline-exam` removed;
  `fetal-heart-entry`, `vomitus`, `vitals-after-supine`, `fetal-heart-recheck`,
  `handover-vitals`, `discharge-exam` added. Investigation `fetal-monitor`
  removed; `preop-labs`, `fbc` added; `circulatory-record` is now the
  anaesthetic record read in ICU. Decisions `next-step`, `coagulopathy` added
  (`diagnosis`, `management` kept). Objectives and rubric re-keyed
  (`obj-*`, `r-*`). Phases `initial`/`workup` → `theatre`/`positioning`/
  `collapse`/`icu` (`followup` kept). No test references these ids.

### 1.0.0

- First release in PR #3 (CMCR collection).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1653406/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1653406                                      # 66 steps · 6/6 objectives · 4/4 decisions · 37/37 utterances
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1653406             # passes
npm run -s cc -- exec --case cmcr-1653406 --autopilot --approval bypass --provider offline --output-format json             # 24/24, 6/6
npm run -s cc -- exec --case cmcr-1653406 --autopilot --approval bypass --provider offline --output-format json --embodied  # 24/24, 6/6
```

## 中文摘要

**病例概要。** 34岁初产妇，孕40+6周入院待产，住院第2天下午破膜，羊水黄绿色（Ⅰ度），因短时间内不能自然分娩拟行剖宫产，计划腰麻。入室血压138/87 mmHg、心率78次/分、SpO₂ 98%，胎心正常。右侧卧位准备腰麻时出现心前区及腹部不适，呕吐胃内容物约300 mL；平卧、面罩吸氧后仍不适，复测胎心约60次/分，遂在环状软骨按压下快速顺序诱导全麻，手术开始5分钟内娩出男活婴（Apgar 5-7-8-9分）。随后SpO₂降至85%后测不出，全身发绀，血压最低41/29 mmHg；血气pH 7.15（混合性酸中毒，Hb不低，PaO₂正常）；PT 12.5 s、APTT 40.2 s、纤维蛋白原1.38 g/L、D-二聚体9.22 mcg/mL；术中超声左室射血分数正常、右室不大。原报告使用肾上腺素、去甲肾上腺素、多巴胺、氢化可的松、快速补液、补碱，呼叫MET，ECMO团队待命，动脉及中心静脉置管；ICU继续血管活性药、激素、输血（红细胞4 U、血浆4 U、冷沉淀10 U、血小板4 U）、抗感染、护胃。术后第2天拔管，第6天出院。作者排除产科出血、过敏反应和高位椎管内阻滞后诊断为羊水栓塞。

**学习目标。**

1. 识别剖宫产术中突发的低氧、低血压和凝血异常为可能的羊水栓塞，并立即呼叫多学科团队。
2. 按先后处理：氧合与通气、血管活性药和正性肌力药、必要时立即娩出；补液每次不超过500 mL。
3. 结合妊娠生理解读凝血结果，在大量输血方案中尽早补充纤维蛋白原，不用肝素。
4. 依据记录鉴别产科出血、药物过敏、高位阻滞、误吸和肺栓塞。
5. 比较Clark 2016研究定义与中国2018共识的临床诊断标准。
6. 区分原报告的历史处理与现行有证据的推荐。

**关键决策。**

- 胎心约60次/分伴产妇不适：按即刻剖宫产处理，快速顺序诱导全麻并立即娩出，同时呼叫帮手、准备抢救。
- 循环衰竭的首要措施（多选）：呼叫MET/上级/ICU/血库/ECMO；纯氧通气并用血管活性药和正性肌力药；立即送凝血和血气、准备大量输血方案。不做加压大量补液，不等确诊检查。
- 病因：羊水栓塞是排除性的临床诊断；逐一用记录排除出血、过敏、误吸和高位阻滞。
- 凝血：在大量输血方案中尽早补充纤维蛋白原（冷沉淀），复查指导用血；不只看PT，不等DIC评分，不单用大量血浆，不用肝素。

**复盘要点。**

- 羊水栓塞没有确诊性检查（SMFM 2016）；本例满足中国2018共识全部5条标准，但不满足Clark 2016研究定义要求的显性DIC。
- 及早呼叫多学科团队；心脏骤停按标准生命支持处理，孕周≥23周者立即娩出（SMFM 2016）；SMFM检查清单（2021，2026更新）可作认知辅助。
- 避免过量补液（SMFM 2016，GRADE 1C）；早期评估凝血、按大量输血方案处理，担心容量时以冷沉淀代替血浆；不常规用肝素（中国2018共识）。
- 糖皮质激素：SMFM未推荐，中国2018共识认为可作“有益的尝试”；原报告的激素、多巴胺、补碱是记录在案的处理，不是获益证据。
- 一次时点不明的超声显示右室不大，不能证实也不能排除诊断；难治性心肺衰竭可考虑ECMO。
- 本病例经人工智能辅助编辑审核，尚未经执业医师审核；用于教学前请由本专科医师审核。
