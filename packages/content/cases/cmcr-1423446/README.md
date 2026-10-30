# cmcr-1423446 — Nausea, vomiting and diarrhoea · 78-year-old woman

> **Spoilers for facilitators and case authors.** This guide names the diagnosis. Learners open the case from the
> case library, where the title, summary and tags give nothing away.

**Published case — 已发表病例改编.** Adapted from a case report in the CMCR collection (宋智慧, 赵环宇. 药物不良反应杂志
2014;16(1):54-55; see References). The patient (高女士 / Ms Gao) and every staff member are pseudonyms; the hospital and
calendar dates are removed and times are relative to the day she came in. The reported course is a fact of the record;
the decisions teach current guidance and say where the report's team acted differently. It is not medical advice.

## Case card

| | |
|---|---|
| id / version | `cmcr-1423446` / `1.1.1` |
| setting / facility | `emergency` (an ED cubicle) / `general-hospital` |
| specialty | emergency medicine, clinical pharmacology, endocrinology |
| difficulty / estimated time | 3 / 5 · ~30 min (static clock) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` (2026-10-28): AI-assisted authoring and editorial review against the guidance listed under References; **not yet reviewed by a licensed clinician** — have an emergency physician or clinical pharmacologist review it before teaching use |
| phases | `initial` → `reaction` → `recovered` → `followup`, each entered automatically (none is learner-switchable; see the timeline) |
| content | 26 history items (17 recorded as unknown, 6 required), 4 exam findings, 8 investigations, 15 interventions, 5 learning outcomes, 6 objectives, 4 decisions (4/5/4/5 options), 12 rubric items (11 deterministic, total 22; 1 examiner-judged), 3 NPC briefs, 40 matcher test utterances |
| source | <https://rs.yiigle.com/cmaid/1423446> (local PDF `source-pdf`, opened after completion) |

## Learning outcomes

After the case the learner can:

1. Check a fingerprick glucose at once when a patient with diabetes develops sweating, palpitations or slowed
   responses during an infusion, before treating for anaphylaxis or a vasovagal episode.
2. Treat hypoglycaemia with impaired consciousness per ADA 2026 Section 6: nothing by mouth, IV glucose (IM glucagon
   without IV access), recheck at about 15 minutes and repeat until recovered, then food and continued monitoring.
3. Decide against a routine empirical antibiotic for acute diarrhoea without fever or dysentery (IDSA 2017),
   recognising the risk factors for fluoroquinolone-associated hypoglycaemia (FDA 2018).
4. Assess a suspected adverse drug reaction systematically (timing, known warnings, dechallenge, alternative causes;
   Naranjo), and explain why the drug that finished last is not presumed the cause and why re-exposure is never used
   as a test.
5. Write the after-care plan: recheck and monitor glucose for recurrence, hold the secretagogue while she is not
   eating, record and report the reaction, and explain it to the patient.

These are distinct from the six HUD objectives (below).

## Clinical summary

**Diagnosis (hidden from the learner).** Severe (level 3) hypoglycaemia associated with IV levofloxacin in a
78-year-old woman with type 2 diabetes on repaglinide who had not eaten that day: 3.0 mmol/L with apathy about
10 minutes into the infusion, recurring at 1.9 mmol/L when the infusion was restarted, resolving with IV glucose
(9.6 mmol/L after the infusion). Causality: probable on the Naranjo scale (about 6–7 points, editors' calculation),
with fasting and the secretagogue as concurrent risk factors; the authors judged the berberine she had taken an
unlikely cause.

**Presentation (from the report).** Three days of nausea, vomiting, acid reflux and diarrhoea; type 2 diabetes for two
years on repaglinide 1 mg three times daily and acarbose taken irregularly; berberine 0.2 g twice daily for two days,
self-medicated; nothing eaten and her diabetes tablets and berberine stopped on the day she came in; past gastric
ulcer and reflux oesophagitis, which she says have healed. T 36.5 °C, P 70/min, RR 20/min, BP 130/80 mmHg. Blood
count unremarkable; fasting potassium 3.2 mmol/L, sodium 134 mmol/L, creatinine 65 μmol/L, glucose 6.0 mmol/L, CRP
5.4 mg/L, the rest unremarkable; chest X-ray and ECG normal. No reference ranges, stool tests, HbA1c or weight are
reported.

**The reported course.** Omeprazole sodium 20 mg in 100 mL 0.9 % NaCl IV (for the nausea, vomiting and reflux), then
levofloxacin lactate–NaCl 0.3 g IV ("the diarrhoea may be bacterial"). About 10 minutes into the levofloxacin:
sweating, palpitations, pallor and apathy; glucose 3.0 mmol/L. The infusion was paused; glucose–saline 500 mL IV and
sweets and bread by mouth; about 5 minutes later her colour returned and she spoke clearly, **but the glucose was not
rechecked**. The ED physician, reasoning that the omeprazole had only just been followed by the levofloxacin, **judged
the omeprazole the likelier cause and restarted the levofloxacin** — a misattribution, not a deliberate rechallenge.
About 5 minutes later the symptoms recurred at 1.9 mmol/L; levofloxacin stopped, 50 % glucose 20 mL IV, then 5 %
glucose 500 mL; symptoms gone and consciousness recovered in about 10 minutes; glucose 9.6 mmol/L after the infusion.
Observation, disposition, a change of antibiotic, ADR reporting and follow-up are not recorded.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`, no `physiology`): the collection reviews a historical course and does not model
a physiological response. Results are immediate; nothing worsens over time. Phases are slices of the day she came in:

| phase | what the learner meets | entered when |
|---|---|---|
| `initial` 急诊接诊 · Emergency assessment | history, vital signs, blood count, chemistry, ECG, CXR, stool tests (not recorded); the antibiotic decision | start |
| `reaction` 输液中的床旁呼叫 · Called to the bedside | the phase text records the report's infusions (omeprazole, then levofloxacin) and the nurse's call; exam `reaction-signs`; bedside glucose 3.0 mmol/L (critical, phoned through); the infusion record | the antibiotic decision has been attempted and the history and baseline objectives are done — whatever the learner chose, the report's team gave the levofloxacin |
| `recovered` 首次处理后 · After the first treatment | the phase text records the report's first treatment and the physician's doubt about the omeprazole; exam `recovered-signs`; a recheck has **no value** (the report did not recheck); the after-recovery decision | in `reaction`, the levofloxacin stopped, the treatment decision attempted, and a glucose treatment given (IV glucose, a glucose infusion, glucagon or oral sugar) |
| `followup` 原报告的后续经过 · The reported course | the reported restart, the 1.9 mmol/L recurrence, the second treatment, 9.6 mmol/L and the authors' discussion (record review) | all four decisions decided and the after-care objective done (which needs the glucose recheck ordered) |

The patient's state is carried by phase-restricted history and exam items: `status-reaction` (only a few words),
`status-recovered` (much better), `status-followup` (well, head clear); `reaction-signs`, `recovered-signs`,
`followup-signs`. Vital signs are recorded only at presentation (`vitals`); asking for a blood pressure during an
episode returns `examNotRecorded`.

## Decisions and assessment

**Objectives (chapters).** `obj-history` (presenting illness, intake, diabetes medicines and today's doses, berberine)
→ `obj-assess` (vital signs, chemistry, blood count) → `obj-abx` (the antibiotic decision) → `obj-reaction` (both
bedside decisions, the glucose read, the levofloxacin stopped, a glucose treatment given) → `obj-aftercare` (recheck
ordered, after-recovery decision) → `obj-review` (the reported course read). Hints coach without stating a result or
an option's text.

**Decisions** (each option has its own bilingual feedback; options shuffle):

| decision | opens when | correct | distractors (and why they are there) |
|---|---|---|---|
| `abx-indication` | history, vital signs, blood count and chemistry read | no routine empirical antibiotic; fluids, potassium, glucose monitoring, repaglinide held | IV levofloxacin (the report's choice); oral ciprofloxacin "needs no monitoring" (class effect); no antibiotic but repaglinide as usual (secretagogue while fasting) |
| `first-step` | `reaction-signs` examined — before the glucose result | stop the levofloxacin, ABC, fingerprick glucose now | IM adrenaline for anaphylaxis; vasovagal — slow the drip; sweets and bread without checking; ECG and troponin first |
| `hypo-treatment` | bedside glucose read | nothing by mouth, IV glucose (10/20 % where available), glucose infusion, recheck at ~15 min, food when alert | the report's first treatment (drip + sweets/bread, no recheck); IM glucagon with a cannula in place; IV glucose but no recheck and "carry on with the original infusion" |
| `after-recovery` | recovered state seen and the infusion record read | treat levofloxacin as the likely cause, no restart, recheck, food, monitoring, hold repaglinide, report the ADR | "the omeprazole finished last — restart" (**the report's misattribution**); deliberate rechallenge under glucose cover; switch to oral moxifloxacin; discharge on usual repaglinide |

**Rubric** (deterministic total 22; safety items weigh most):

| item | domain | weight | met when |
|---|---|---|---|
| `r-hx` | history | 2 | presentation, intake, diabetes, today's doses, berberine and allergies asked |
| `r-exam` | examination | 1 | `vitals`, `reaction-signs`, `recovered-signs` |
| `r-baseline` | investigations | 1 | chemistry, blood count and ECG read in `initial` |
| `r-abx` | management | 2 | `abx-indication` right first time, potassium replaced, repaglinide held |
| `r-abx-safety` | safety | 2 | no IV levofloxacin from the learner (harm-avoidance) |
| `r-glucose-first` | safety | **3** | glucose read in `reaction`, levofloxacin stopped, no adrenaline |
| `r-dx` | diagnosis | 2 | `first-step` right first time |
| `r-treat` | management | 2 | `hypo-treatment` right first time and IV glucose given |
| `r-no-oral` | safety | 2 | no sweets and bread by mouth (harm-avoidance) |
| `r-aftercare` | management | 2 | recheck ordered in `recovered`, monitoring plan, ADR report, `after-recovery` right first time |
| `r-no-reexposure` | safety | **3** | levofloxacin not restarted (harm-avoidance) |
| `r-comm` | communication | 1 (judged) | plain explanation, no re-use of the drug, repaglinide sick-day rule, hypo recognition, candour, teach-back |

**Wrong choices and the engine's response.**

| choice | engine response |
|---|---|
| IV levofloxacin (`levofloxacin-iv`) | `contraindicated` in every phase; its harm text leads with "no indication + hypoglycaemia risk" and adds the re-exposure branch |
| Restart the levofloxacin (`restart-levofloxacin`) | `contraindicated`; the response narrates the report's recurrence (1.9 mmol/L) and second treatment |
| Sweets and bread by mouth in `reaction` (`oral-sugar`), or a meal then (`oral-meal`) | `contraindicated` while she is apathetic (aspiration risk); `oral-meal` is indicated in `recovered` |
| IM adrenaline (`adrenaline-im`) | `contraindicated` (no recorded features of anaphylaxis; delays the glucose) |
| Glucagon with a cannula in place (`glucagon-im`) | neutral; the response explains why IV glucose is preferred |
| IV omeprazole (`omeprazole-iv`) | neutral (the report's choice for reflux symptoms) |

**How paths score** (replayed with the engine on 1.1.0, before the coordinator's `scoredWhen` annotations):

| path | score | points lost |
|---|---|---|
| a. reference path | 22/22 (100 %) | — |
| b. levofloxacin given at the first assessment (as the report did) | 20/22 (91 %) | `r-abx-safety` 2 |
| c. sweets and bread by mouth instead of IV glucose | 18/22 (82 %) | `r-treat` 2, `r-no-oral` 2 |
| d. levofloxacin restarted after recovery (as the report did) | 19/22 (86 %) | `r-no-reexposure` 3 |
| e. first answer wrong on every decision | 14/22 (64 %) | `r-abx`, `r-dx`, `r-treat`, `r-aftercare` 2 each |
| f. no glucose recheck after recovery | 20/22 so far; cannot finish (`obj-aftercare` open, `followup` locked) | `r-aftercare` 2 |
| g. IM adrenaline first, then the reference path | 19/22 (86 %) | `r-glucose-first` 3 |
| h. nothing done | 7/22 (32 %) — the three harm-avoidance items; 0/15 once `scoredWhen` applies | everything else |
| i. the report's own course | 7/22 so far; cannot finish (no recheck) | `r-hx`, `r-abx`, `r-abx-safety`, `r-treat`, `r-no-oral`, `r-aftercare`, `r-no-reexposure` |

## Reference path (`solution`)

44 steps: start; history (presentation, diabetes, intake, today's doses, berberine, allergies, previous hypos, last
repaglinide dose, stools, stomach history, other medicines); vital signs; chemistry, blood count and ECG ordered and
read; potassium replaced, repaglinide held, glucose monitoring planned; `abx-indication` (no antibiotic) → `reaction`;
`reaction-signs`; `first-step`; levofloxacin stopped; bedside glucose and infusion record read; `hypo-treatment`; IV
glucose → `recovered`; glucose infusion; `recovered-signs` and the status question; recheck ordered (no value in the
report); meal; ADR reported; `after-recovery` → `followup`; the reported course read; `followup-signs`; finish. No
rejection, no contraindicated intervention; 6/6 objectives, 4/4 decisions, 22/22.

## Clinical numbers check

Also in `extensions.authorChecks`.

| item | value | working |
|---|---|---|
| Glucose in mg/dL | 3.0 → 54; 1.9 → 34; 9.6 → 173; fasting 6.0 → 108 | × 18.0 |
| ADA level | 3.0 mmol/L is the level 1/2 boundary by number (< 3.0 is level 2); with apathy needing help both episodes are **level 3** | ADA 2026 Section 6 grades severe hypoglycaemia by the clinical state |
| IV glucose in the report | 50 % glucose 20 mL = 10 g | 0.5 g/mL × 20 mL |
| eGFR (CKD-EPI 2021) | ≈ 83 mL/min/1.73 m² | creatinine 65 μmol/L = 0.735 mg/dL; 142 × (0.735/0.7)^−1.200 × 0.9938^78 × 1.012 |
| Creatinine clearance | not calculable | weight not recorded |
| Naranjo score | 7 (probable); 6 if fasting plus repaglinide is judged a sufficient alternative cause | previous reports +1, after the drug +2, better on stopping/glucose +1, reappeared on re-administration +2, objective evidence (measured glucose) +1, alternative causes 0 (or −1), placebo, level, dose relation and earlier exposure 0 |
| Potassium | 3.2 mmol/L: hypokalaemia (no reference range printed) | QT risk with a fluoroquinolone |

## Facilitator notes

**Debrief questions (PEARLS order).**

1. *Reactions* — "How did it feel when the nurse called you and she was sweating and barely answering?"
2. *Description* — "Summarise her in two sentences: who was she, and what happened 10 minutes into the second drip?"
3. *Analysis*
   - "What was the first number you wanted, and why that one?"
   - "She was 3.0 mmol/L. How severe was this hypo, and what decides that?"
   - "Why not sweets and bread at that moment? What else made sucrose a weak choice for her?" (acarbose)
   - "The omeprazole had just finished. Why was it tempting to blame it — and why was that wrong?"
   - "What did the restart in the report 'prove', and what did it cost her?"
   - "Did she need an antibiotic at all? What would IDSA 2017 have you do?"
   - "What do you do with her repaglinide while she is not eating?"
   - "What do you record, report and tell her?"
4. *Summary* — "What three things will you do next time symptoms appear during an infusion in a patient with
   diabetes?"

**Common learner errors and how the case surfaces them.**

| error | how the case surfaces it |
|---|---|
| Treating the event as anaphylaxis | `first-step` option b; `adrenaline-im` is contraindicated and costs `r-glucose-first` |
| Feeding a patient with impaired consciousness | `first-step` d, `hypo-treatment` b; `oral-sugar` contraindicated in `reaction`; `r-no-oral` |
| No recheck after treatment | `hypo-treatment` b and d; the recheck in `recovered` returns "not rechecked in the report"; `followup` stays locked until a recheck is ordered |
| Blaming the last drug finished (anchoring) | `after-recovery` b quotes the report's reasoning; `restart-levofloxacin` replays the recurrence |
| "Re-exposure proves causation" | `after-recovery` c |
| Swapping to another fluoroquinolone | `abx-indication` c, `after-recovery` d |
| Empirical antibiotic for afebrile watery diarrhoea | `abx-indication` b; `levofloxacin-iv` contraindicated; `r-abx-safety` |
| Leaving the secretagogue running while she is fasting | `abx-indication` d; `withhold-repaglinide` in `r-abx` |

## Embodied mode

**Grounding.** In in-world mode every IV item requires `iv-access`; the case sets
`extensions.embodied.ivAccessInSitu: true` because the triage note records a cannula already in place (the report's
IV infusions imply one; the note is a workflow adaptation, see below). The fingerprick glucose (`point-of-care`) and the
ECG (`ecg-12lead`) are bedside tests: the meter and the ECG cart come to the bedside. The blood count, chemistry and
stool tests are sampled at the patient. The infusion record and the reported course are record reviews at a records
terminal. The chest X-ray (not in the reference path) needs the patient taken to the X-ray room.

**Scope of practice.** Stopping the infusion and the oral items are authored `scope: "nursing"`; the IV glucose,
glucose infusion, potassium and glucagon are nursing by kind; holding repaglinide, the monitoring plan and the ADR
report are medical (kind `other`).

**Where the patient goes.** Nowhere: she stays lying in her ED bed space in every phase (no destination, no phase
location).

**Measured (offline autopilot, 2026-10-28, `general-hospital`).** Clinical mode zh-CN 22/22 (100 %), 6/6 objectives;
in-world mode zh-CN and en 22/22 (100 %), 6/6 objectives; no contraindicated intervention; static clock (0 minutes).

## Source and adaptation

**From the report** (main text and discussion, checked fact by fact against the full text, the print PDF pp. 54–55
and the export record): age and sex; the presenting complaint and its duration; the diabetes history and doses
(repaglinide 1 mg three times daily, acarbose irregularly); berberine 0.2 g twice daily for two days; no food and the
tablets stopped on the day; the past gastric ulcer and reflux oesophagitis; the vital signs; every laboratory value and
the normal CXR and ECG; the omeprazole and levofloxacin doses and order; the onset at about 10 minutes; the 3.0 and 1.9
mmol/L readings; both treatments with doses; the 5- and 10-minute responses; the missing recheck; the physician's
reasoning for the restart; 9.6 mmol/L after the infusion; the authors' discussion (Whipple's triad, the label warning,
berberine, mechanism, risk groups, timing).

**Adapted for teaching.** The four phases and their automatic transitions (the report's events happen whatever the
learner decides, and the phase texts say so); dialogue wording in first-person lay speech; the persona (temperament,
speech); the nurse's call; decision options and feedback; the interventions and their responses (the report's steps
plus tempting wrong ones); the rubric; the cannula already in place at triage; the recheck in `recovered` returning "no
value" because the report did not recheck.

**Restored in 1.1.0** (audit B1–B5, C2–C4): the restart's stated reason (misattribution to omeprazole); every dose;
the response timings; the fasting laboratory glucose 6.0 mmol/L moved from the bedside result to the chemistry (it was
a pre-infusion laboratory value, not a bedside one); "the rest unremarkable"; the separate blood count, ECG and CXR;
the authors' discussion; the last repaglinide dose as an explicit unknown.

**Labelled points in the source.** The English abstract renders 意识淡漠 as "unconsciousness"; the Chinese abstract
and main text say apathy, and she spoke clearly 5 minutes after the first treatment — the case follows the Chinese
text (apathetic, slow to respond). The authors call the first episode Whipple's triad although no glucose was measured
after treatment (relief was clinical); the case keeps their wording in the reported course and teaches the recheck. No
numerical contradictions were found between the abstract and the main text.

**Figures.** The report has no figures. The source PDF (`source-pdf`, opened only after completion) carries the
article on page 1 and the top of page 2, and a journal notice to authors on the lower half of page 2 (its title says
so); it prints, as the published article does, the authors' affiliation and the calendar date of the ED visit — no
patient name, ID or image overlay. The case text contains neither.

**Fidelity limits.** No vital signs, ECG or airway assessment during either episode; no glucose after the first
treatment; no HbA1c, weight, stool description or tests; no record of observation, disposition, a later antibiotic,
ADR reporting or follow-up. The Naranjo score is the editors' calculation. `r-abx-safety`, `r-no-oral` and
`r-no-reexposure` are harm-avoidance items earned by omission until the framework's pending `scoredWhen` field is
applied to them (they then count only once she has been treated or the decision attempted); the rubric cannot see
*when* an oral item was given, so
`oral-meal` given in `reaction` is recorded as contraindicated but not scored by `r-no-oral`.

## Matcher notes

- Status questions are phase twins in effect but not in schema: `status-reaction`, `status-recovered` and
  `status-followup` share "现在感觉 / feeling now" and are restricted to their phases; `presentation` is unavailable in
  `reaction`, where "哪里不舒服" reaches `status-reaction`.
- `excludeKeywords` separate look-alikes: food vs medicines (`intake` excludes 药/tablet; `meds-today` excludes
  饭/food), the patient's diabetes history vs today's doses vs the berberine, other conditions vs family history, stool
  frequency vs dosing frequency ("times a day" with tablet/repaglinide excluded).
- `levofloxacin-iv` excludes 恢复/继续/restart/resume so "恢复左氧氟沙星" / "restart the levofloxacin" reach
  `restart-levofloxacin`.
- English keywords avoid stop-word phrases that reduce to one token; the corpus has no utterance equal to a canonical
  question. Known miss: "Who do you live with?" is all stop-words but "live", which is too broad as a keyword ("lived
  with diabetes"); the patient then gives the unknown-history fallback, which is also what `living` says.
- 40/40 test utterances pass with no extra selections; 74/75 further realistic probes (history, exam, orders,
  interventions) reach the intended item.

## References

`debrief.references`, one Vancouver string each:

1. 宋智慧, 赵环宇. 乳酸左氧氟沙星氯化钠注射液致严重低血糖. 药物不良反应杂志. 2014;16(1):54-55.
   doi:10.3760/cma.j.issn.1008-5734.2014.01.019. Available from: https://rs.yiigle.com/cmaid/1423446
2. American Diabetes Association Professional Practice Committee. 6. Glycemic goals, hypoglycemia, and hyperglycemic
   crises: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S132-S149. doi:10.2337/dc26-S006
3. Joint British Diabetes Societies for Inpatient Care. The hospital management of hypoglycaemia in adults with
   diabetes mellitus (JBDS 01). Revised January 2023. JBDS-IP; 2023.
4. 中华医学会糖尿病学分会. 中国糖尿病防治指南（2024版）. 中华糖尿病杂志. 2025;17(1):16-139.
5. Shane AL, Mody RK, Crump JA, et al. 2017 Infectious Diseases Society of America clinical practice guidelines for the
   diagnosis and management of infectious diarrhea. Clin Infect Dis. 2017;65(12):e45-e80. doi:10.1093/cid/cix669
6. U.S. Food and Drug Administration. FDA reinforces safety information about serious low blood sugar levels and mental
   health side effects with fluoroquinolone antibiotics; requires label changes. FDA Drug Safety Communication. 2018
   Jul 10. Available from: https://www.fda.gov/drugs/drugsafety/ucm611032.htm
7. Naranjo CA, Busto U, Sellers EM, et al. A method for estimating the probability of adverse drug reactions. Clin
   Pharmacol Ther. 1981;30(2):239-245. doi:10.1038/clpt.1981.154

How they were checked (2026-10-28; doi.org, Crossref and PubMed E-utilities are not reachable from the editing
session): ref. 1 — DOI as printed in the PDF footer and the export record (no online record found by web search);
ref. 2 — title, pages and DOI from web-search results (the PMC record and published summaries); ref. 3 — the January 2023 revision found
on NHS-hosted copies and the ABCD listing; ref. 4 — volume and pages from citing articles (no DOI found, none given);
ref. 5 — citation, authors and DOI from journal and indexing records; ref. 6 — the FDA page; ref. 7 — PubMed
(PMID 7249508).

### To verify

- **ADA 2026 Section 6** was checked through its abstract and published summaries, not line by line: the level
  definitions, the 15–20 g oral dose, the 15-minute recheck and glucagon without IV access are as in recent editions.
- **JBDS 01 (2023):** the preference for 10 % or 20 % over 50 % glucose is confirmed in the 2010 and 2013 archived
  editions and in current NHS summaries; the 2023 text itself was not accessed.
- **中国糖尿病防治指南（2024版）:** cited for Chinese readers; its hypoglycaemia section (e.g. the IV glucose volume and
  concentration in its algorithm) was not accessed, so the case attributes no statement to it and it is not listed in
  `provenance.review.guidelines`.
- **IDSA 2017** wording on empirical antibiotics and stool testing comes from secondary summaries (AAFP and others).
- **Labels:** "acarbose — treat hypoglycaemia with glucose, not sucrose" (pharmacist brief, `hypo-treatment` b
  feedback) and "repaglinide — no meal, no dose" (`withhold-repaglinide`, `abx-indication` d) are written from the
  product information without a checked copy of the current Chinese labels.
- **Chinese ADR reporting rules** are named only as "the national ADR monitoring system"; the governing regulation was
  not checked.

## Changelog

### 1.1.1 — 2026-10-30 (assessment validity)

- **Options rebalanced so the key is not cued by length.** The keyed option was the uniquely longest in all 4
  single-best decisions in both languages; now it is in one (`after-recovery`). Each distractor states why it tempts,
  with the key's register and detail: IV levofloxacin (the report's choice) because a missed bacterial enteritis would
  be dangerous at 78, given with fluids and potassium; oral ciprofloxacin as needing no glucose monitoring; repaglinide
  kept on because illness pushes the glucose up; anaphylaxis minutes into the infusion; a vasovagal reaction after a
  normal blood pressure; sweets without a reading; ECG and troponin first at 78; the report's drip plus sweets as
  raising the glucose by two routes; glucagon to avoid hypertonic glucose through the cannula; IV glucose without a
  recheck; the omeprazole misattribution; a monitored rechallenge; oral moxifloxacin once a day; discharge because she
  is alert. The keys of `abx-indication`, `hypo-treatment` and `after-recovery` are tighter wording of the same plan;
  the `first-step` key is unchanged. Feedback now credits the correct parts a distractor gained (fluids and potassium;
  stopping, rechecking and feeding) and answers its new arguments (extravasation; oral fluids while she vomits).
  Correct flags and scoring are unchanged.
- **Option ids:** all already name their content; none changed.

### 1.1.0 — 2026-10-28 (editorial revision)

- **Fix first — the restart is a misattribution, not a rechallenge.** The reported course, the `after-recovery`
  decision (its option b quotes the physician's reasoning), the `restart-levofloxacin` intervention and the debrief
  now say that the levofloxacin was restarted because the omeprazole was blamed; "rechallenge" is used only for the
  deliberate distractor (`after-recovery` c).
- **Treatment of hypoglycaemia with impaired consciousness taught** (ADA 2026 Section 6; JBDS 01 2023): the report's
  feeding while apathetic and missing recheck are named; new `hypo-treatment` decision.
- **Was an empirical fluoroquinolone indicated?** New `abx-indication` decision before the infusions (IDSA 2017; FDA
  2018).
- Phases `initial`/`workup`/`followup` → `initial`/`reaction`/`recovered`/`followup` with automatic transitions, so
  decisions sit at the moment they were made; `workup` removed.
- Decisions 2 → 4 (4–5 options, option-specific feedback, first-try scoring); interventions 0 → 15; rubric 4 → 12 with
  four safety items and an examiner-judged communication item.
- Source facts restored (doses, timings, the restart reasoning, the fasting laboratory glucose moved to the chemistry,
  the authors' discussion); the abdominal "not recorded" placeholder finding removed (now `examNotRecorded`).
- Patient voice: first-person lay speech, "黄连素" in her mouth, the library's unknown-history fallback; persona,
  acting notes, grey hair; title "· 78-year-old woman"; summary and triage note rewritten without the plot.
- History 15 → 26 items with ≥ 4 real keywords per language; 16 verbatim test utterances → 40 paraphrases.
- New learning outcomes (5), teaching points (4), key reasoning (5), case unknowns (7); references in Vancouver
  style with checked DOIs (the unconfirmed FDA PDF link replaced by the Drug Safety Communication page).
- Ids changed (no test or e2e reference): history `medications` → `berberine` (+ `meds-today`), `infusion-symptoms` →
  `status-reaction`, `occupation`/`self-care`/`expectations` → `living`/`ice`; exam `reaction` → `reaction-signs`,
  `abdomen` removed; investigations `glucose` → `glucose-poc`, the `ecg` record → a 12-lead ECG test plus `cxr`, new
  `blood-count` and `stool-tests`; decisions `diagnosis`/`management` → `first-step`/`hypo-treatment` (+
  `abx-indication`, `after-recovery`); objectives and rubric renamed `obj-*` / `r-*`.
- `provenance.review` (editorial), version 1.0.0 → 1.1.0, difficulty 4 → 3, estimated time 25 → 30 min;
  `extensions.embodied.ivAccessInSitu`; this README.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1423446/case.json --strict
npm run -s cc -- cases verify cmcr-1423446
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1423446
npm run -s cc -- exec --case cmcr-1423446 --autopilot --approval bypass --provider offline --output-format json
npm run -s cc -- exec --case cmcr-1423446 --autopilot --approval bypass --provider offline --output-format json --embodied
```

On 2026-10-28 (1.1.0): validate 0 errors, 0 warnings; verify passes — 44 steps, objectives 6/6, decisions 4/4,
utterances 40/40; the collection test passes; the offline demonstration scores 22/22 (100 %) with every objective done
in clinical mode and in in-world mode (zh-CN and en). On 2026-10-30 (1.1.1): validate `--strict` 0 errors, 0
warnings; verify passes as above (22/22, 100 %).

## 中文摘要

**病例概要。** 78岁女性，2型糖尿病2年（瑞格列奈1 mg每日3次，阿卡波糖不规律），恶心、呕吐、反酸、腹泻3天，自服盐酸小檗碱
（黄连素）0.2 g每日2次共2天，就诊当日未进食并停用降糖药。生命体征正常；血钾3.2 mmol/L，钠134 mmol/L，肌酐65 μmol/L，空腹血糖
6.0 mmol/L，CRP 5.4 mg/L。急诊先静滴奥美拉唑20 mg，再静滴乳酸左氧氟沙星0.3 g；约10分钟后大汗、心慌、面色苍白、意识淡漠，血糖
3.0 mmol/L。暂停输液、静滴糖盐水并进食糖块和面包后好转，但未复测血糖；医师把低血糖归咎于先输的奥美拉唑，恢复左氧氟沙星，约5分钟
后复发（1.9 mmol/L），静推50%葡萄糖20 ml、继以5%葡萄糖500 ml后恢复（9.6 mmol/L）。诊断：左氧氟沙星相关严重（3级）低血糖，
Naranjo评分“很可能”。

**学习目标。** ① 输液中出现出汗、心慌、反应迟钝时先测指尖血糖；② 按ADA 2026第6章处理意识受损的低血糖（禁经口、静脉葡萄糖、约15
分钟复测、恢复后进食并监测）；③ 依据IDSA 2017判断无发热、无痢疾的急性腹泻无需经验性抗菌药，认识氟喹诺酮低血糖风险（FDA 2018）；
④ 结构化评估药物不良反应，不把“最后输完的药”当作原因，绝不以再暴露作为试验；⑤ 制订好转后的安全计划并上报不良反应。

**关键决策。** 是否需要经验性抗菌药（不需要；补液、补钾、暂停瑞格列奈、监测血糖）；床旁呼叫时的第一步（停药、评估ABC、立即测
血糖）；意识淡漠时的处理（禁经口、静脉给糖、约15分钟复测）；好转后的方案（不恢复左氧氟沙星、复测、监测、上报——原报告恰恰在此处
误归因并恢复输注）。评分：确定性总分22分，安全项占10分（立即测血糖与停药3分、未再暴露3分、未无指征用氟喹诺酮2分、未经口喂糖2
分），另有1项由考官智能体评判的沟通项。

**复盘要点（PEARLS）。** 先谈感受，再用两句话概括；分析时围绕：为什么第一个要的是血糖；3.0 mmol/L为何算严重低血糖；为何此时不能
喂糖块和面包（误吸，另有阿卡波糖延缓蔗糖吸收）；奥美拉唑“刚输完”为何不是证据；那次恢复输注“证明”了什么、又让她付出了什么；她本
来需要抗菌药吗；不进食时瑞格列奈怎么办；要记录、上报和告诉她什么。最后请学员总结：下次输液中出现类似症状时要做的三件事。
