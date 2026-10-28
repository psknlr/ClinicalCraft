# cmcr-70005 — Fever and a swollen groin · 8-year-old boy

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary and triage note name neither the organism nor the shock. The patient (小禾 / Xiaohe) and his parent
> are pseudonymous; the case is a teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患者及家长均为化名；本病例改编自已发表的病例报告，不构成医疗建议。

## Case card

| | |
|---|---|
| Case | `cmcr-70005` · v1.1.0 · CMCR collection (`cmcr-20`) |
| Source | 孙静敏, 金丹群, 许愿愿, 郑丽云. 紫色色杆菌脓毒症一例并文献复习. 中国小儿急救医学. 2014;21(1):57-58 |
| Setting | Children's ward (`inpatient`), then the PICU (phase `picu`, `location: {"setting": "icu"}`) |
| Facility | `general-hospital` |
| Difficulty | 4 / 5 |
| Estimated time | ~40 min (static clock; five phases, four decisions, 17 interventions) |
| Specialty | Paediatrics, infectious diseases, paediatric critical care |
| Languages | zh-CN (source), en |
| Learner level | Final-year medical students, paediatric and emergency residents, PICU nurses |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have a paediatric infectious-disease or PICU clinician review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Recognise failure of anti-Gram-positive therapy in a child with progressive soft-tissue abscesses and
   systemic infection, and broaden empirical cover to Gram-negative and environmental organisms (a carbapenem)
   after freshwater or soil exposure, before the cultures return.
2. Identify septic shock with the Phoenix 2024 criteria from perfusion, lactate (converted to mmol/L),
   coagulation and neurological findings, and state the SSC 2026 first-hour priorities.
3. Combine source control with susceptibility-guided definitive therapy, and justify a long course for
   multiple small abscesses.
4. Explain why invasive *Chromobacterium violaceum* infection calls for phagocyte-function (DHR/NBT) and G6PD
   testing, and name what this record lacks.
5. Distinguish death after withdrawal of care from death despite treatment when appraising a reported outcome.

These are `learningOutcomes` in `case.json`. They name the organism and the shock, so front-ends show them
before play only behind the closed **Learning outcomes (5) · may reveal the diagnosis** disclosure and list
them in every debrief (CASE_AUTHORING §9.4, GLOSSARY §4).

## Clinical summary (spoilers)

An 8-year-old boy has had fever for 5 days (38.5 °C at onset, up to 40 °C, marked chills) with a red, tender,
soybean-sized lump in the right groin that grew until he could not walk. Cefoperazone and a drug the report
calls “氧哌嗪” at a local hospital did not help; the outside white count was 44.75×10⁹/L. He swam about a week
before falling ill. On admission: conscious, in pain, a 10 cm × 2 cm hot, red, tender groin mass,
hepatosplenomegaly (liver 2.5 cm, spleen 3 cm), WBC 29.26×10⁹/L, CRP 151.96 mg/L, PCT > 25 ng/mL; CT shows
subcutaneous soft-tissue infection with small abscesses. He is given vancomycin for presumed *Staphylococcus
aureus*. By day 3 he is worse (40.5 °C, poor responsiveness, enlarging mass); incision and drainage yields
10 mL of pus with necrotic tissue and microabscesses, and he does not improve on vancomycin. On day 4 he
develops **septic shock** (agitation, dyspnoea, cold limbs, impalpable foot pulses, HR 220/min) with a
seizure and loss of consciousness, DIC (platelets 9×10⁹/L, INR 1.77), lactate 887 mg/L (≈ 9.8 mmol/L) and
liver and muscle injury; he is moved to the PICU and ventilated. Blood and both groin aspirates grow
***Chromobacterium violaceum*** (resistant to ceftriaxone, ceftazidime and piperacillin). On meropenem (chosen
on the susceptibilities and his CNS signs, on illness day 9) and organ support — with severe bleeding,
pulmonary haemorrhage and oliguria on the way — the shock resolves by day 7 (platelets 35×10⁹/L). On day 8 his
parents withdraw treatment for financial reasons; follow-up records his death.

**Diagnosis:** invasive *C. violaceum* infection (multiple groin abscesses, bacteraemia) with septic shock,
DIC and multi-organ dysfunction, after freshwater exposure; the host work-up for a phagocyte defect is
incomplete.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model — the CMCR contract (`cmcr-20.test.ts`) forbids
one: a historical report does not establish a continuous physiological response. Vital signs exist only as
the report records them (HR 100/min on admission, HR 220/min on day 4; no blood pressure, respiratory rate,
temperature on admission or SpO₂ anywhere until the PICU course).

Every phase is **not learner-switchable**: time moves forward through the learner's own actions, so each
decision is committed before the result that would answer it. (A learner-switchable earlier phase would trap
a learner who went back: `enterWhen` is edge-triggered.)

| Phase | Hospital day | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | day 1 | start | history (parent; the boy speaks about pain), admission examination, referral notes, FBC, CRP/PCT/endotoxin, immune tests, respiratory panel, chest/abdominal CT, abdominal ultrasound, blood cultures (pending note) |
| `day3` | day 3 | objectives `obj-history` and `obj-admission` done (the latter ends with the admission orders, `admit-ward`) | the report's course on vancomycin; reassessment, enlarging lump, the drainage record and pathology; decision `empirical` |
| `shock` | day 4 | decision `empirical` attempted | shock signs and seizure; day-4 FBC, chemistry (lactate), coagulation (dated “after PICU transfer” as in the report); decision `shock` |
| `picu` | day 4 onwards | decision `shock` attempted **and** `transfer-picu` given (`location: {"setting": "icu"}`) | ventilation record, microbiology report (organism and susceptibilities), admission immune results from the chart; decisions `definitive` and `immune` |
| `followup` | days 4–8, follow-up | all four decisions decided | the report's PICU treatment course and the outcome |

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-history` — Get the story from his parent (presentation, progression, earlier antibiotics, water exposure).
2. `obj-admission` — Assess him on admission and start treatment (groin and abdomen, FBC, CRP/PCT, CT, an
   antibiotic, the admission orders).
3. `obj-day3` — Day 3: he is not getting better (reassess, drainage record, decision `empirical`).
4. `obj-shock` — Day 4: recognise and act (decision `shock`, a fluid bolus, the PICU transfer).
5. `obj-picu` — PICU: targeted treatment and the immune question (decisions `definitive`, `immune`).
6. `obj-outcome` — Review the reported course and outcome (`picu-course`, `followup`).

### Decisions

| id | opens after | correct answer | distractors (why they are tempting) |
|---|---|---|---|
| `empirical` | day-3 reassessment, drainage record, the CT, the exposure and the earlier antibiotics — **before any culture** | broaden now: a carbapenem for Gram-negative and environmental organisms, MRSA cover kept, cultures first if no delay, source control | continue vancomycin alone after drainage (**the report's choice**); ceftriaxone; wait for cultures; add clindamycin |
| `shock` | shock signs, seizure, day-4 chemistry, FBC and coagulation | Phoenix septic shock (lactate ≈ 9.8 mmol/L = 1 CV point; platelets and INR = 2) and the SSC 2026 first hour | “no shock without hypotension”; febrile seizure on the ward; 60 mL/kg saline pushed without reassessment; albumin first |
| `definitive` | microbiology report | meropenem (CNS doses), a long course (authors: 6 weeks), imaging for deep abscesses, step-down by susceptibility | ceftazidime (resistant); piperacillin/tazobactam (intermediate); stop 7 days after shock resolves |
| `immune` | microbiology report and the immune tests (admission, or from the chart in PICU) | DHR/NBT for CGD and G6PD; immunology referral; ask about repeated infections and boys in the family | “work-up complete” (**the report's conclusion**); HIV and diabetes only; re-check immunoglobulins after IVIG |

Every option has its own feedback. Decisions never lock once unlocked, so a learner who answers wrongly first
can answer again later; the rubric scores the first attempt (`decidedFirstTry`).

### Rubric (11 deterministic items, 25 points, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-history` | History | fever and lump course, earlier antibiotics, water exposure | 2 |
| `rb-host` | History | previous repeated or serious infections asked (unknown — the asking is scored) | 1 |
| `rb-exam` | Examination | general state, groin mass, liver and spleen | 2 |
| `rb-workup` | Investigations | admission FBC, CRP/PCT, CT read; blood cultures ordered | 2 |
| `rb-empirical` | Diagnosis | empirical broadening on day 3, first attempt | 3 |
| `rb-source` | Management | surgical incision and drainage requested | 2 |
| `rb-shock` | **Safety** | Phoenix septic shock and the first hour, first attempt (annotation: `critical`) | 4 |
| `rb-first-hour` | Management | meropenem, crystalloid bolus, high-flow oxygen, PICU transfer (annotation: `critical`) | 3 |
| `rb-definitive` | Management | definitive regimen and duration, first attempt | 2 |
| `rb-immune` | Diagnosis | DHR/NBT and G6PD, first attempt | 2 |
| `rb-no-resistant` | **Safety** | no ceftriaxone (met only once the culture has been read; annotation `scoredWhen: read culture`) | 2 |
| `rb-communication` | Communication (examiner) | plain-language explanation to the parent, honesty about uncertainty, teach-back | 1 |

**How wrong choices score.** A wrong first answer forfeits that decision's item (3, 4, 2 or 2 points) but the
case continues. Vancomycin alone and ceftriaxone before the culture are `neutral` (the response says why they
fall short); ceftriaxone after the susceptibility report is `contraindicated` (a safety event with harm
text) and loses `rb-no-resistant`. Albumin, IVIG and blood purification are neutral, with responses that state
current guidance (SSC 2026: crystalloid, not albumin) or the PICU's role. A first hour without a fluid bolus
or without the PICU transfer leaves `obj-shock` open and costs `rb-first-hour`; the PICU phase does not open
until the learner transfers him.

## Reference path (`solution`)

89 steps: the history (all 20 admission-time items, including the unknowns and the boy's own pain item), the
admission examination (10 findings), the referral notes, IV access and monitoring, blood cultures, FBC,
CRP/PCT/endotoxin, immune tests, respiratory panel, CT, abdominal ultrasound; vancomycin **and** meropenem,
surgical referral for drainage, admission orders → day 3: status, reassessment, the drainage record, decision
`empirical` (broaden) → day 4: status, shock signs, seizure, high-flow oxygen, a crystalloid bolus,
anticonvulsant, PICU transfer, day-4 FBC/chemistry/coagulation, a second bolus, vasoactive infusion, blood
products, decision `shock` → PICU: status, intubation, ventilation record, microbiology report, decisions
`definitive` and `immune` → follow-up: the PICU course and the outcome → finish. It scores **25/25** with no
contraindicated action, in clinical and in-world mode, in both languages.

## Clinical numbers check

* **Lactate.** 887 mg/L as reported = 88.7 mg/dL; ÷ 90.08 g/mol = 9.85 mmol/L, shown as “≈ 9.8 mmol/L
  (derived by the editors)” beside the reported unit.
* **Phoenix (day 4).** Cardiovascular: lactate 5–10.9 mmol/L → 1 point (no blood pressure or vasoactive
  record to add more). Coagulation: platelets 9 (< 100×10⁹/L) → 1, INR 1.77 (> 1.3) → 1 (fibrinogen, D-dimer
  not reported; the subscore is capped at 2 anyway). Neurological: a seizure with loss of consciousness, but no
  GCS is recorded, so no point is claimed. Respiratory: not scorable at that moment (no SpO₂ or PaO₂). Total
  ≥ 3 with ≥ 1 cardiovascular point → **septic shock**. Later in the PICU, SpO₂ 70% on FiO₂ 0.8 with invasive
  ventilation gives an SpO₂:FiO₂ ratio of 87.5, well inside the worst respiratory band.
* **Counts.** Outside WBC 44.75, admission 29.26 (N 83.5%), day 4 21.27 (N 96.2%) ×10⁹/L; Hb 119 → 57 g/L;
  platelets 205 → 9 → nadir 7 → 35 ×10⁹/L (day 7). No reference ranges are given in the report, and none are
  added.
* **Fluids.** SSC 2026 (intensive care available): 10–20 mL/kg per bolus, up to 40–60 mL/kg in the first
  hour, reassessing after each. His weight is not recorded, so the case prints volumes per kilogram only and
  tells the learner to weigh or estimate.
* **Drug doses.** None of the report's doses are recorded (vancomycin, meropenem, products, IVIG). The
  intervention dose texts are therefore weight-based instructions to use the local paediatric formulary, with
  no mg/kg figures (the editorial pass could not verify paediatric mg/kg doses; see “To verify”).
* **Timeline.** Fever 5 days before admission; shock on hospital day 4, which the discussion calls 8 days
  after onset; meropenem on illness day 9.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — “How did it feel to watch a boy who was talking about his sore leg on day 1 be ventilated
   on day 4?”
2. **Description** — “Walk me through the four time points: what did you know on day 1, day 3, day 4 and in
   the PICU, and what did you do at each?”
3. **Analysis**
   * “On day 3, what made you keep — or change — the antibiotics? What does a failing anti-Gram-positive
     regimen tell you about what you are not covering?”
   * “What did the swim a week before add to your differential?”
   * “There was no blood pressure on day 4. How did you decide he was in septic shock?” (Phoenix: lactate.)
   * “What had to happen within the first hour, and in what order?”
   * “His immunoglobulins and T cells were normal. Was his immunity normal?”
   * “How do you read the last line of the report — the death after the parents withdrew care?”
4. **Summary** — “What will you do at the next child with spreading abscesses who is not responding?”

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| Keeping vancomycin after drainage (the report's course) | `empirical` distractor with the report's outcome in its feedback; `rb-empirical` lost |
| Waiting for cultures before broadening | `empirical` distractor; the culture result exists only after the decision |
| Waiting for hypotension to call shock | `shock` distractor (Phoenix needs no hypotension; lactate scores) |
| Labelling the day-4 seizure “febrile” | `shock` distractor (age 8, shock, multi-organ involvement) |
| Fluid pushed without reassessment / albumin first | `shock` distractors; `albumin` intervention response (SSC 2026) |
| Not escalating to the PICU | `obj-shock` stays open; the PICU phase does not open until the transfer |
| Ceftriaxone or ceftazidime for the resistant isolate | `definitive` distractor; ceftriaxone after the culture is contraindicated |
| Accepting “normal immunity” | `immune` distractor (the report's own conclusion) |
| Reading the outcome as death despite treatment | the follow-up record and teaching point 6 |

## Embodied mode

* **Where the patient goes.** Admission on ward bed 1 (`inpatient`). The CT (`requires: ["ct"]`) takes him to
  the CT table and back (the embodied autopilot wheels him: 83.4 m there, 84.4 m back, re-measured
  2026-10-28); the abdominal ultrasound brings the ultrasound cart to the ward (101.4 m). `transfer-picu` has `destination: {"setting": "icu"}` and `posture: "lying"`:
  the team moves him to the first ICU bed when it is given, and the `picu` phase repeats the location for a
  learner who reached it some other way. Ventilation (`airway`, `ventilator`) and blood purification
  (`dialysis`) need the ICU's fixed equipment, so they can only be done there.
* **Record reviews.** Referral notes, the drainage record and pathology, the PICU ventilation record, the
  microbiology report, the admission immune results re-read in the PICU, and the two follow-up records are
  existing records: `requires: ["records"]`, read at a records terminal — never a device, a sample or a risk.
  The coordinator's annotation file adds `performedAt: "records"` to them once the framework supports it.
  Tests the learner orders keep their devices (labs are sampled at the patient, or at a terminal once the IV
  cannula has drawn the bloods).
* **Scope of practice.** IV access is authored `scope: "nursing"`; intubation `scope: "medical"`; drugs,
  fluids, oxygen and monitoring follow their kinds (nursing may give them when delegated); the surgical
  referral and the transfer are medical.
* **The boy's voice.** The pain item (`speaker: "patient"`) exists only on days 1 and 3; from the day-4
  seizure on, only his parent speaks (status items for day 4 and the PICU). The annotation file adds
  `patient.nonVerbalWhen` (phases `shock`, `picu`, `followup`) for the framework that is arriving.
* Clinical, in-world, zh-CN and en demonstrations all score 25/25 with every objective done.

## Source and adaptation

**From the report (kept as fact).** Every value, unit, timing and treatment above is from the full text:
history, admission examination, the outside and admission results, immune tests, respiratory panel, CT and
ultrasound wording, the day-3 course and pathology, the day-4 signs and laboratory values, ventilator
settings, the organism and the full susceptibility list, the PICU course, the day-7 recovery and the day-8
withdrawal of care for financial reasons with death on follow-up. The authors' reasoning is used where it
matters: vancomycin chosen for presumed *S. aureus*; meropenem chosen on the susceptibilities and the CNS
signs; “a little late” on illness day 9; carbapenems as the main empirical choice in children; 6 weeks for
multiple small abscesses; links to G6PD deficiency, neutrophil dysfunction and CGD; no link to HIV, diabetes,
chemotherapy or steroids; the 25 Chinese cases (15 died, 4 recovered, 6 not stated).

**Adapted for teaching.** The parent's and the boy's words (lay speech built on the recorded facts); the
parent's worries (role, not reported); the day-4 parent line describing the seizure; the order in which the
learner may act; the decisions, interventions, rubric and feedback (current guidance); the admission-orders
step that moves the case to day 3. Day-4 laboratory values were drawn after the PICU transfer in the report;
the case lets the learner order them during the day-4 phase and dates them accordingly. The month of onset
(given in the discussion) is reduced to “summer”.

**Labelled discrepancies in the source (not resolved).**
* When he swam: the history says “游泳史 1周前” (one week ago, reference point not stated); the discussion
  says “发病1周前” (one week before onset). The parent follows the discussion; both are in the item's source
  note.
* NK cells 27.2% are printed within the admission blood count line; the case lists them with the lymphocyte
  subsets and says where the report put them.
* “氧哌嗪” is kept as written. It may be the old Chinese name for piperacillin (氧哌嗪青霉素) — an editor's
  inference, labelled as such in the item's source note; the isolate was later resistant to piperacillin.

**Figures.** `fig02` (blood agar with dark purple colonies, the Chinese Medical Association watermark, no
patient identifier) is attached to the microbiology report. `fig01` (the groin CT) and the source PDF are
**withdrawn** (listed in `scripts/cmcr-withdrawn-assets.json`: the CT shows the patient's name, an ID
number, the hospital and the scan time; the PDF reprints it); the CT findings are kept as text and the result
note says why the image is missing.

**Unknown and kept unknown** (`unknowns`, unknown history items, `examNotRecorded`): blood pressure,
respiratory rate, temperature and SpO₂ on admission and day 4; weight; every dose; where he swam and whether
others fell ill; previous infections, immunisations, allergies, home; phagocyte function and G6PD;
fibrinogen and D-dimer; culture timing and MICs; fluids, vasoactive drugs and seizure treatment; the day-3
lump size; any conversation before the withdrawal; the time and cause of death.

## Matcher notes

* 40 `extensions.testUtterances` (22 zh-CN, 18 en), none equal to a canonical question; every required
  history item (`presentation`, `progression`, `medications`, `exposure`, `pmh`) has at least two.
* Status questions (“他现在怎么样？”, “How is he now?”) are phase twins: `status-day3` supersedes
  `status-admission`, `status-shock` supersedes `status-day3`, `status-picu` supersedes `status-shock`, so
  each phase answers with its own state. They are not in the corpus (`cases verify` ranks every phase's items).
* `exposure` carries `excludeKeywords` (哪里/where, 一起/anyone, others) so “where did he swim?” reaches
  `water-source` and “did anyone else get ill?” reaches `contacts`. `medications` excludes 过敏/allerg and
  查血/bloods so allergy and outside-blood-test questions do not reach it.
* `pain-child` uses “yourleg” run together: as a separate token “leg” it outranked `trauma` for “any cuts on
  his leg?”.
* Order matching: an `orderMatching` rule drops the CT when “ct” sits inside another word (lactate,
  function, electrolytes), others keep “外院血常规” on the referral notes, “血培养结果/药敏” on the
  microbiology report and “调阅免疫功能” on the chart record; warnings explain that no groin ultrasound and no
  head CT exist.

## References

1. 孙静敏, 金丹群, 许愿愿, 郑丽云. 紫色色杆菌脓毒症一例并文献复习. 中国小儿急救医学. 2014;21(1):57-58.
   doi:10.3760/cma.j.issn.1673-4912.2014.01.023. https://rs.yiigle.com/cmaid/70005
2. Weiss SL, Peters MJ, Oczkowski SJW, et al. Surviving Sepsis Campaign international guidelines for the
   management of sepsis and septic shock in children 2026. Pediatr Crit Care Med. 2026;27(4):379-434.
   doi:10.1097/PCC.0000000000003927. Also published in: Intensive Care Med. 2026.
   doi:10.1007/s00134-026-08360-2
3. Schlapbach LJ, Watson RS, Sorce LR, et al. International consensus criteria for pediatric sepsis and septic
   shock. JAMA. 2024;331(8):665-674. doi:10.1001/jama.2024.0179
4. Sanchez-Pinto LN, Bennett TD, DeWitt PE, et al. Development and validation of the Phoenix criteria for
   pediatric sepsis and septic shock. JAMA. 2024;331(8):675-686. doi:10.1001/jama.2024.0196
5. Yang CH, Li YH. Chromobacterium violaceum infection: a clinical review of an important but neglected
   infection. J Chin Med Assoc. 2011;74(10):435-441. doi:10.1016/j.jcma.2011.08.013
6. Alisjahbana B, Debora J, Susandi E, Darmawan G. Chromobacterium violaceum: a review of an unexpected
   scourge. Int J Gen Med. 2021;14:3259-3270. doi:10.2147/IJGM.S272193
7. Sirinavin S, Techasaensiri C, Benjaponpitak S, Pornkul R, Vorachit M. Invasive Chromobacterium violaceum
   infection in children: case report and review. Pediatr Infect Dis J. 2005;24(6):559-561.
8. Mamlok RJ, Mamlok V, Mills GC, et al. Glucose-6-phosphate dehydrogenase deficiency, neutrophil dysfunction
   and Chromobacterium violaceum sepsis. J Pediatr. 1987;111(6):852-854.
9. Bonilla FA, Khan DA, Ballas ZK, et al. Practice parameter for the diagnosis and management of primary
   immunodeficiency. J Allergy Clin Immunol. 2015;136(5):1186-1205. doi:10.1016/j.jaci.2015.04.049

The same strings are `debrief.references`. Checked on 2026-10-28 by web search (doi.org, Crossref, PubMed
E-utilities and rs.yiigle.com are not reachable from this environment): ref. 1 against the export record
(`artDoi`, volume 21, issue 01, pages 57–58) and the text header; ref. 2 against the publisher's page
(journals.lww.com …/10.1097/pcc.0000000000003927) and the PubMed listing (PMID 41869844: 2026 Apr
1;27(4):379-434), and the Intensive Care Medicine co-publication on link.springer.com; refs 3–6 and 9 on
indexing and repository pages that print the DOI; refs 7 and 8 without a DOI (ref. 8 as printed in the
source's reference list [14]).

### To verify

* SSC 2026 children (ref. 2): the recommendations used here (antimicrobials within 1 h / 3 h, lactate,
  10–20 mL/kg up to 40–60 mL/kg, crystalloid over albumin, balanced over saline, peripheral vasoactives, no
  adrenaline-vs-noradrenaline recommendation, SpO₂ 88–92% after resuscitation, blood cultures first, narrow
  once known, source control) were taken from the guideline's published summaries and search snippets — check
  their wording and grading against the full text; the full author list after Weiss SL is from the audit.
* Paediatric mg/kg doses of vancomycin, meropenem (incl. the CNS dose), the benzodiazepine and IVIG — not
  verified, so not printed.
* Whether SSC 2026 keeps the 2020 advice against routine IVIG (the `ivig` response says only that it is not
  routine treatment for paediatric sepsis).
* Sirinavin 2005 (ref. 7): DOI not found by web search.
* Bonilla 2015 (ref. 9): the exact wording of the DHR recommendation for CGD screening.
* Clinician input: the empirical-regimen options (local resistance and melioidosis endemicity vary) — a
  paediatric infectious-disease clinician should confirm them.

## Changelog

### 1.1.0 — 2026-10-28 (editorial revision)

* **Privacy:** fig01 (the identifying CT) and the source PDF stay withdrawn; the CT result note says why; the
  month of onset is reduced to the season.
* **Outcome corrected:** the follow-up record now says the parents withdrew treatment on day 8 for financial
  reasons after the shock had resolved on day 7, and that the report attributes the death to that withdrawal
  (1.0.0 said “treatment ended” and implied death despite treatment).
* **Timeline:** the single `workup` phase became `admission` → `day3` → `shock` → `picu` (ICU location) →
  `followup`, all forward-only, so decisions are committed before the results that answer them.
* **Decisions:** the two binary decisions with shared feedback (`diagnosis`, `management`) were replaced by
  four single-best-answer decisions with option-specific feedback: `empirical` (before the culture), `shock`
  (Phoenix 2024 + SSC 2026 first hour), `definitive`, `immune` (DHR/NBT, G6PD).
* **Interventions:** 17 added (none before), including the report's choices (vancomycin, drainage, PICU,
  ventilation, products, IVIG, blood purification) and tempting wrong ones (ceftriaxone, albumin first).
* **Source facts restored:** the outside WBC and maximum temperatures; the admission examination (10
  findings); immune tests, endotoxin and the respiratory panel; abdominal ultrasound and the chest CT
  findings; the full day-4 chemistry, FBC and coagulation; the full susceptibility list (incl.
  intermediates); ventilator settings; the PICU course (platelet nadir 7, bleeding, SpO₂ 70%, urine
  120 mL/24 h, products); meropenem's rationale and timing. The derived lactate (≈ 9.8 mmol/L) is labelled.
* **Voice:** adult social-history items (smoking, alcohol, occupation, self-care, supplements) removed; the
  parent answers, the boy speaks about his pain; persona briefs an actor; the library's fallback line; unique
  pseudonym 小禾 / Xiaohe; 23 history items with ≥ 4 natural keywords each; 40 paraphrased utterances.
* **Teaching:** five learning outcomes, six teaching points naming their guidance, a 12-item rubric with
  two safety items, `provenance.review`, Vancouver references with verified DOIs, this facilitator guide.
* Ids changed (none is referenced outside this case): phases `initial`/`workup` → `admission`/`day3`/
  `shock`/`picu` (`followup` kept); objectives `objective-1…4` → `obj-*`; rubric `rubric-1…4` → `rb-*`;
  decisions `diagnosis`/`management` → `empirical`/`shock`/`definitive`/`immune`; exam `shock` →
  `shock-signs`; history items `smoking`, `alcohol`, `occupation`, `self-care`, `supplements` removed;
  investigation ids kept (`ct`, `culture`, `inflammation`, `organ-function`, `drainage`, `followup`) with
  restructured contents, and new ones added.

### 1.0.0

* Initial CMCR version (PR #3).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-70005/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-70005        # solution 89 steps · objectives 6/6 · decisions 4/4 · utterances 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-70005              # 1 passed
npm run -s cc -- exec --case cmcr-70005 --autopilot --approval bypass --provider offline --output-format json             # 25/25, 6/6
npm run -s cc -- exec --case cmcr-70005 --autopilot --approval bypass --provider offline --output-format json --embodied  # 25/25, 6/6
```

## 中文摘要

**病例概要。** 8岁男孩，发热5天（起病38.5 ℃，最高40 ℃，畏寒明显）伴右腹股沟红肿、包块渐大至不能行走，
外院头孢哌酮及“氧哌嗪”无效（外院WBC 44.75×10⁹/L），发病前约一周游泳。入院：腹股沟10 cm×2 cm红肿热痛包块、
肝脾大，WBC 29.26×10⁹/L、CRP 151.96 mg/L、PCT>25 ng/mL，CT示皮下软组织感染伴小脓肿；予万古霉素。第3天仍
高热、精神差、包块增大，切开引流10 mL脓液、组织大部坏死伴小脓肿，术后无好转。第4天脓毒性休克（四肢厥冷、
足背动脉搏动未及、心率220次/分）伴抽搐、意识丧失，PLT 9×10⁹/L、INR 1.77、乳酸887 mg/L（约9.8 mmol/L），
转PICU机械通气；血及两份穿刺液培养出紫色色杆菌（头孢曲松、头孢他啶、哌拉西林耐药）。改用美罗培南及器官支持，
第7天休克纠正；第8天家长因经济原因放弃治疗，随访获悉患儿死亡。

**学习目标。**
1. 识别进行性软组织脓肿伴全身感染患儿的抗革兰阳性菌治疗失败，淡水或泥土接触后在培养回报前扩大覆盖（碳青霉烯类）。
2. 依据Phoenix 2024标准，用灌注、乳酸（换算为mmol/L）、凝血和神经系统表现识别脓毒性休克，说出SSC 2026首小时处置。
3. 将感染源控制与按药敏的目标治疗结合，并说明多发小脓肿需要长疗程。
4. 解释紫色色杆菌侵袭性感染为何要评估吞噬细胞功能（DHR/NBT）和G6PD，并指出本例缺少的检查。
5. 解读结局时区分放弃治疗后的死亡与治疗无效的死亡。

**关键决策。** ① 第3天（培养回报前）：扩大到碳青霉烯类，保留抗MRSA，先留培养，继续控制感染源（原报告继续单用
万古霉素）；② 第4天：按Phoenix为脓毒性休克，不必等低血压，1小时内抗菌药物、每次10–20 mL/kg晶体液并复评、
血管活性药物、止惊、转PICU；③ PICU：按药敏用美罗培南、长疗程（作者建议6周）；④ 查DHR/NBT和G6PD，免疫球蛋白和
T细胞正常不等于免疫正常。

**复盘要点（PEARLS）。** 先谈感受；按第1、3、4天和PICU复述所知与所做；分析环节聚焦：抗革兰阳性菌方案失败说明
什么、水体接触的意义、没有血压时如何判断休克、首小时的先后顺序、免疫评估是否完整、怎样读“家长放弃治疗后死亡”
这一结局。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
