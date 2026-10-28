# cmcr-1653404 — High fever and a swollen foot · boy aged 4 years 1 month

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners
> should open the case from the case library, where the title, summary, chief
> complaint and tags give nothing away.

**Published-case adaptation.** The case follows a case report in 鏡湖醫學
(李靜, 黃潔馨, 苗研, 2025). The patient (小乐 / Xiaole) and his parent are
pseudonymous; hospital names and calendar dates are removed and times are
relative. The report's historical treatment is recorded as fact; current
guidance is taught in the decisions, feedback and debrief. The source is in
traditional characters; the case uses simplified Chinese.

## Case card

| | |
|---|---|
| id / version | `cmcr-1653404` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (paediatric ward bed `ward-1`) |
| specialty | paediatrics, immunology, infectious disease |
| difficulty | 4 / 5 |
| estimated time | about 30 min (static clock: four staged phases, no simulated time) |
| languages | `zh-CN` (source language; the source is traditional, the case simplified), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have a paediatric immunologist review it before teaching use |
| phases | `initial` (入院第1天 / Hospital day 1) → `workup` (住院第1–9天 / Days 1–9) → `immunology` (出院后1–2个月，外院免疫评估 / outside work-up) → `followup` (治疗与随访 / treatment and follow-up); one-way, none learner-switchable |
| content | 19 history items (6 required, 10 `unknown`, 1 `volunteer`, 1 phase twin) · 3 exam findings (2 required; `foot` carries the figure) · 10 investigations (9 essential, 1 not recorded, 4 record reviews) · 11 interventions (1 contraindicated, 2 neutral) · 6 objectives · 4 decisions · 12 rubric items (11 deterministic, weight 21, + 1 examiner-judged) · 3 NPCs · 5 learning outcomes · 38 test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise warning features of an inborn error of immunity (two pneumonias
   in a year, staphylococcal skin infections needing admission) and, while
   treating the acute infection, order first-line tests: immunoglobulins read
   against age-specific ranges and a blood count with platelet count and size.
2. Interpret low IgG with undetectable IgA and normal IgM, explain why
   selective IgA deficiency is excluded, and arrange B-cell enumeration
   accordingly.
3. Apply the clinical criteria for X-linked agammaglobulinaemia in the
   report's Table 2 (ESID) to the outside flow-cytometry results, and explain
   the role of BTK testing in confirming the diagnosis and counselling the
   family.
4. Plan long-term care: lifelong immunoglobulin replacement, no live vaccines,
   early treatment of infections with lung monitoring, and carrier testing and
   genetic counselling for the mother.
5. Keep contradictory source data explicit — IgE "unremarkable" in the text
   versus 306 µg/L in Table 1 — with both values and where each comes from,
   without resolving them by assumption.

These are the case's `learningOutcomes` (case card and debrief); the six HUD
`objectives` below are the in-game task list.

## Clinical summary

**Presentation (hospital day 1).** A boy of 4 years 1 month has had 3 days of
high fever; for just over a day an eczema patch on the dorsum of the right foot
has become red, swollen and painful, spreading to the ankle and lower leg,
despite oral amoxicillin–clavulanate. Examination: a 0.5 × 0.5 cm dusky-black
(eschar-like) lesion over the right fifth-toe joint; the foot and lower leg are
swollen and tender without fluctuance; several ulcers over the pubic symphysis
and buttocks (Figure 1). Eczema has recurred since birth.

**Past history.** Two pneumonia admissions in one earlier year; the next year,
an admission for pneumonia and one for high fever with pustules on both thighs
that grew MSSA.

**Course (the report).** IV vancomycin on admission; on day 2 the fever peak
fell, a cough began with fine crackles, and the chest radiograph showed
bilateral bronchopneumonia; the foot ultrasound showed extensive subcutaneous
oedema without an abscess; on day 3 the lesion grew MSSA (coagulase positive),
blood culture negative, and treatment changed to clindamycin plus ceftriaxone;
by day 5 he was afebrile with the eschar separating, and by day 9 the skin had
healed with slight peeling.

**Immunology (1–2 months later, another hospital).**

| test | this hospital (two samples, 3 days apart) | other hospital |
|---|---|---|
| IgG | 3.15 then 3.14 g/L (ref 7.0–16.0) | 2.73 g/L (ref 5.90–14.30) |
| IgA | < 0.1 g/L (ref 0.7–4.0) | < 0.10 g/L (ref 0.38–2.22) |
| IgM | 1.29 g/L (ref 0.4–2.3) | 0.75 g/L (ref 0.45–2.08) |
| IgE | **306 µg/L (ref < 144)** in Table 1 — the text says "unremarkable" | — |
| lymphocyte subsets | — | T, CD4, CD8, NK normal; **B cells 6.0 cells/µL (ref 90–660)** |
| BTK gene | — | hemizygous NM_000061.3:c.1632-2A>G |

**Diagnosis.** X-linked agammaglobulinaemia (XLA) with moderate-to-severe
atopic dermatitis. Treatment: IV immunoglobulin here, then monthly replacement
at another hospital; no admission for a severe infection by the time of the
report.

**Reference plan (current guidance).** While treating the cellulitis
empirically (MRSA cover, then culture-directed), start an immunodeficiency
screen (immunoglobulins against age ranges, a blood count with platelets,
lymphocyte subsets); interpret the low IgG with absent IgA as an antibody
deficiency that excludes selective IgA deficiency; confirm XLA with the B-cell
count and BTK test; and plan lifelong trough-guided immunoglobulin
replacement, live-vaccine avoidance, early infection treatment with lung
monitoring, and maternal carrier testing with family genetic counselling.

## Scenario timeline and physiology

- **Static clock, four one-way phases.** No physiology model: every result is
  the report's.
  - `initial` — hospital day 1. History from the parent; examine the foot, the
    other skin lesions. Entering `workup` needs the history and examination
    objectives.
  - `workup` — hospital days 1–9. The cough (day 2) and the lung crackles are
    here; the inflammatory markers, cultures, foot ultrasound, chest film and
    the two in-hospital immunoglobulin panels open here. Entered after the
    history and examination objectives.
  - `immunology` — the outside work-up 1–2 months later (the audit's fix for
    the single-phase conflation): the repeat immunoglobulins, lymphocyte flow
    cytometry **and** the BTK report, all from that one outside evaluation.
    Entered when the acute infection is treated (`obj-acute`) and the immune
    screen is under way (`obj-immune-screen`).
  - `followup` — the report's treatment course and follow-up record. Entered
    when the diagnosis is confirmed (`obj-immune-dx`).
- **History in time.** The cough is `workup`-only; `status-followup` (monthly
  infusions, no further admissions) is the follow-up phase twin of
  `presentation`.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-history` Take the history | `presentation`, `spread`, `medications`, `recurrent-infections`, `eczema` asked |
| 2 | `obj-exam` Examine him | `foot`, `other-lesions` examined |
| 3 | `obj-acute` Treat the acute infection | `vancomycin`, cultures read, `directed-abx` |
| 4 | `obj-immune-screen` Start the immune screen | `immune-screen` decided, immunoglobulins read, `interpret-ig` decided |
| 5 | `obj-immune-dx` Confirm the diagnosis | lymphocytes read (immunology), `confirm` decided, genetics read (immunology) |
| 6 | `obj-long-term` Plan long-term care and review | `long-term` decided, follow-up record read |

Hints ask the question that leads to the answer and never name a result the
learner has not obtained.

### Decisions

- `immune-screen` (single; needs the recurrent-infection and eczema history
  and the foot examination). ✔ start the immunodeficiency screen (including a
  blood count with platelets) alongside antibiotics. ✘ "eczema explains it";
  ✘ HIV only; ✘ MRI the foot first.
- `interpret-ig` (single; gated on the **in-hospital immunoglobulins only**,
  not the B-cell or BTK result). ✔ antibody deficiency, count B cells next.
  ✘ selective IgA deficiency (feedback: IgG is low); ✘ transient from the
  infection (feedback: two samples agree); ✘ normal for age (feedback: read
  against the laboratory's age ranges).
- `confirm` (single; gated on the B-cell flow result, **not** the BTK report).
  ✔ agammaglobulinaemia, test BTK to confirm (Table 2). ✘ manage as SCID
  (feedback: normal T, NK); ✘ no gene needed (feedback: confirmation and
  counselling need BTK).
- `long-term` (single; gated on the BTK report). ✔ lifelong replacement, no
  live vaccines, early infection treatment, genetic counselling. ✘ transplant
  now; ✘ prophylactic antibiotics alone; ✘ discharge with no follow-up.

Each option has its own feedback. The decisions open before the result that
would hand over the answer: `interpret-ig` needs only the immunoglobulins (not
the B-cell count), `confirm` needs only the B-cell count (not the BTK report),
and the BTK report (the diagnosis) gates only the long-term plan.

### Rubric (deterministic items, total weight 21)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-hx` | history | 2 | this illness, medicine, recurrent infections, eczema asked |
| `rb-hx-organism` | history | 1 | the earlier organism (S. aureus) asked |
| `rb-exam` | examination | 1 | foot, other skin, chest examined |
| `rb-acute` | management | 2 | empirical then culture-directed antibiotics |
| `rb-inv` | investigations | 2 | cultures, ultrasound, chest film, immunoglobulins read |
| `rb-screen` | investigations | 2 | `immune-screen` right first time |
| `rb-interpret` | diagnosis | 2 | `interpret-ig` right first time |
| `rb-confirm` | diagnosis | 3 | `confirm` right first time |
| `rb-safety-longterm` | safety | 3 | `long-term` right first time |
| `rb-safety-vaccine` | safety | 2 | no live attenuated vaccine given |
| `rb-outcome` | management | 1 | follow-up record read |

One examiner-judged communication item (`rb-comm`): explaining the diagnosis,
replacement, vaccine safety and genetic counselling to the parent, with
teach-back.

### How wrong choices score

- Decisions are scored with `decidedFirstTry`: guessing costs the item.
- `live-vaccine` (catch up the missed live attenuated vaccines) is
  `contraindicated` once the low immunoglobulins have been read: a safety
  event. `rb-safety-vaccine` credits not giving it — the framework annotation
  `scoredWhen: {attempted: "long-term"}` makes the item count only once the
  learner has engaged the management decision, so it is not earned by inaction.
- `hsct-now` (transplant instead of replacement) and `stop-at-discharge` are
  `neutral`; their responses explain why (transplant is investigational; the
  antibody defect does not go away when the skin heals).
- `iv-access`, `vancomycin`, `directed-abx`, `immunology-referral`,
  `ivig-replacement`, `vaccine-plan`, `genetic-counselling` and
  `steroid-eczema` are `indicated` once their evidence exists.

### Framework annotations (pending)

`S/pr3/fxc-annotations/cmcr-1653404.json` (not in `case.json`): the outside
reports and the follow-up record are record reviews (`performedAt: "records"`);
`rb-confirm` and `rb-safety-longterm` are `critical`; `rb-safety-vaccine` is
`critical` and counts only once `long-term` has been attempted
(`scoredWhen: {attempted: "long-term"}`), so doing nothing does not earn it.

## Reference path (`solution`)

53 steps, static clock:

1. **History** (17 questions): the illness, spread, medicine, recurrent
   infections, eczema, the earlier organism, ears, bowels, bleeding/bruising,
   vaccines, family (maternal side), siblings, growth, weight, allergies, past
   surgery, worries.
2. **Examination** (2): the right foot/leg (with Figure 1), the other skin
   lesions → `workup`.
3. **Acute care:** IV access, empirical vancomycin; cough asked and chest
   examined; inflammatory markers, cultures, foot ultrasound, chest film and
   immunoglobulins ordered and read; culture-directed antibiotics; immunology
   referral; eczema skin care; `immune-screen`; `interpret-ig` → `immunology`.
4. **Confirmation:** outside repeat immunoglobulins and lymphocyte flow read;
   immunoglobulin replacement and vaccine plan started; `confirm`; BTK report
   ordered and read → `followup`.
5. **Long term:** genetic counselling; `long-term`; the follow-up record read;
   finish.

`cases verify` passes: 6/6 objectives, 4/4 decisions, 21/21 rubric points,
38/38 utterances, no contraindicated intervention.

## Clinical numbers check

- **IgG.** This hospital 3.15 and 3.14 g/L against 7.0–16.0 (about 45 % and
  20 % of the lower limit); outside 2.73 g/L against 5.90–14.30. All well
  below the age-specific lower limit.
- **IgA.** Undetectable (< 0.1 g/L) against lower limits of 0.7 and 0.38.
- **IgM.** 1.29 then 0.75 g/L — within both laboratories' ranges (so **not**
  a low IgM; this does not exclude the phenotype, which the source discussion
  notes).
- **IgE.** 306 µg/L against < 144 in Table 1 (≈ 127 kU/L, derived at 1 µg/L ≈
  0.417 kU/L) — the narrative calls IgE "unremarkable". The discrepancy is
  kept.
- **B cells.** 6.0 cells/µL against 90–660 — far below, consistent with the
  Table 2 threshold of < 2 % of peripheral lymphocytes (the percentage is not
  reported).
- **Inflammatory markers.** CRP 328 mg/L, PCT 16.6 ng/mL (no reference ranges
  given).
- **BTK variant.** c.1632-2A>G is a splice-acceptor (−2) intronic variant
  (hemizygous in a male). The report gives no pathogenicity classification.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "What made you look past the foot?"
2. **Description.** "In two sentences: how did a foot infection lead to an
   immune diagnosis?"
3. **Analysis.**
   - "Which features here are warning signs of an inborn error of immunity, and
     which tests did you order first?"
   - "The IgG was low and the IgA undetectable. Why does that rule out
     selective IgA deficiency, and what did you want next?"
   - "In a boy with eczema and recurrent infection, what else should you think
     of — and which test is missing from this record?"
   - "What did the B-cell count add, and why still test BTK?"
   - "The text says the IgE was unremarkable; the table says 306. How did you
     handle that?"
   - "What does X-linked inheritance mean for his mother and the rest of the
     family, and what did you plan long-term?"
4. **Summary.** "What will make you screen a child's immunity next time?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Treating the cellulitis and stopping there | `eczema-explains` option; `stop-at-discharge` (neutral) | `rb-screen`, `rb-safety-longterm` |
| Not counting the recurrent pneumonias | `recurrent-infections` required; `immune-screen` feedback | `rb-hx`, `rb-screen` |
| Missing the platelet count (Wiskott–Aldrich) | `fbc` is "not recorded"; immunology NPC and screen feedback | `rb-screen` |
| Calling it selective IgA deficiency | `selective-iga` option (feedback: IgG is low) | `rb-interpret` |
| "Transient from the infection" | `transient-infection` option (two samples agree) | `rb-interpret` |
| Jumping to BTK without the B-cell count | `confirm` is gated on the B-cell flow, not BTK | `rb-confirm` |
| "Resolving" the IgE discrepancy | kept explicit in the result note and the debrief | `rb-comm` |
| Catching up live vaccines | `live-vaccine` contraindicated once immunoglobulins are read | `rb-safety-vaccine`, safety event |
| Forgetting family counselling | `genetic-counselling`; `long-term` option | `rb-safety-longterm` |

## Embodied mode

- **Where he is.** A ward bed (`ward-1`, setting `inpatient`); no phase moves
  him (the outside work-up is modelled as reports reviewed at the bedside while
  he stays in bed, which also serves for infusions).
- **Grounding the kit (EMBODIED §6).** `iv-access` (cannulation kit on the
  ward crash cart) comes before the IV antibiotics and immunoglobulin
  replacement; replacement also needs the bedside `infusion-pump`; drugs need
  `medications` (delivered). The lesion swab, blood culture and in-hospital
  immunoglobulins are sampled at the patient; the foot ultrasound uses the
  radiology ultrasound machine (a cart wheeled to the bedside); the chest
  radiograph keeps `performedAt: "provider"` (the report does not call it
  portable), so the autopilot takes him on his bed to X-ray and back. The
  outside repeat immunoglobulins, lymphocyte flow and BTK report, and the
  treatment/follow-up record, are chart reviews (`requires: ["records"]`) read
  at a records terminal. Exam items use the personal kit (`stethoscope`).
- **Scope of practice.** No intervention sets `scope`: antibiotics and IV
  access are nursing by kind, referrals and counselling are medical.
- **Demonstration.** `exec --autopilot --provider offline` scores 21/21
  (100 %) in clinical and in-world mode, in both languages, with all six
  objectives complete.

## Source and adaptation

### What comes from the report

Age, sex; the 3-day fever and the foot swelling spreading to the ankle and
lower leg from an eczema lesion; the amoxicillin–clavulanate failure; the
dusky-black 0.5 × 0.5 cm lesion over the fifth-toe joint, the swelling without
fluctuance, the pubic and buttock ulcers; eczema since birth; the two
pneumonia admissions and the pneumonia/pustule admissions with MSSA; CRP
328 mg/L and PCT 16.6 ng/mL; the day-2 cough and crackles, the bronchopneumonia,
the foot ultrasound, the day-3 MSSA (coagulase positive) with a negative blood
culture; vancomycin then clindamycin plus ceftriaxone; afebrile by day 5 with
eschar separation, healed by day 9 with peeling; every value in Table 1 with
each laboratory's ranges; the IgE text/table discrepancy; the normal T, CD4,
CD8 and NK counts and B cells 6.0 cells/µL; the BTK variant; the diagnosis;
IV immunoglobulin then monthly replacement elsewhere; no severe-infection
admission by publication; the ESID clinical criteria in Table 2.

### What is adapted for teaching

- Dialogue: the parent's lay wording and opening line; the worry item (the
  report records no ICE); the parent's sex is not given, so the companion is
  "the boy's parent".
- Relative times replace the years; the "eschar" of the day-5 course is used to
  describe the lesion; the derived IgE in kU/L is marked derived.
- Phases, decisions, interventions, objectives, rubric and NPC briefs are
  teaching design; results open by phase so decisions precede the record that
  would answer them.
- Unrecorded data (weight, a blood count with platelets for this admission,
  the replacement dose and troughs, immunisation history, family and maternal
  carrier status, ear infections, diarrhoea, bleeding, the B-cell percentage,
  drug doses and durations, the follow-up length) stay unknown: `unknown`
  history items, an `available: false` blood count, and the case `unknowns`.

### Labelled contradiction (kept, as the audit praises)

- **IgE.** The narrative says "IgM and IgE unremarkable"; Table 1 gives IgE
  306 µg/L against its own limit of < 144. Both are the report's; the case
  keeps both in the immunoglobulin result note, in the `interpret-ig` option
  feedback (a non-low IgM does not exclude the phenotype) and in the debrief,
  and resolves neither. A modestly raised IgE is a facilitator discussion
  point, not a fact that changes the diagnosis.

### Figure

Figure 1 (`fig01`, local only) holds three clinical photographs: the dorsum
and side of the right foot with the dusky lesion, and the buttocks with
ulcers. It was viewed: no face is shown and there is no burned-in identifier
(no name, ID, hospital or acquisition stamp). It is filed under the right-foot
examination (`exam.foot.media`), not the ultrasound result (the audit's fix),
and is kept `localOnly` and shown only when the learner examines the lesions.
The source PDF (`source-pdf`, local only, opened after completion) was checked
page by page: the lower half of page 2 and all of page 3 carry other articles
of the same issue and their figures (breast histology, an OCT page, a KB-stain
micrograph, an abdominal ultrasound) with no direct identifier; the asset
title says so.

## Matcher notes

- Run-together English keywords where a phrase would reduce to one token:
  `broughthimin`, `howdiditbegin`, `wherediditbegin`, `takenforthis`,
  `howishenow`.
- `excludeKeywords`: `medications` ignores allergy and "in hospital"
  questions; `recurrent-infections` ignores family questions (so
  "boys on the mother's side who get ill a lot" routes to `family`).
- Phase twin (`supersedes`): `status-followup` answers "how is he now?" in the
  follow-up phase.
- 38 utterances (both languages; lay and clinical phrasings; none identical to
  a canonical question); every required item has at least one.

## References

- 李靜, 黃潔馨, 苗研. 以反復感染及濕疹為表現的X連鎖無丙種球蛋白血症1例基因診斷. 鏡湖醫學. 2025;25(2):52-53. doi:10.12408/j.issn2223-4462.2025.02.015. https://rs.yiigle.com/cmaid/1653404
- Smith CIE, Berglöf A. X-linked agammaglobulinemia. In: Adam MP, Feldman J, Mirzaa GM, et al., editors. GeneReviews. Seattle (WA): University of Washington, Seattle; 1993-2024. Available from: https://www.ncbi.nlm.nih.gov/books/NBK1453/
- Seidel MG, Kindle G, Gathmann B, et al. The European Society for Immunodeficiencies (ESID) Registry working definitions for the clinical diagnosis of inborn errors of immunity. J Allergy Clin Immunol Pract. 2019;7(6):1763-1770. doi:10.1016/j.jaip.2019.02.004
- Centers for Disease Control and Prevention. Altered immunocompetence. General Best Practice Guidelines for Immunization. Atlanta: CDC; updated 2023.

How the DOIs were checked (2026-10-28; doi.org, Crossref, PubMed and
rs.yiigle.com are not reachable from this environment): the source DOI is
printed in the PDF and the export record; the ESID DOI on the publisher's page
(J Allergy Clin Immunol Pract, PMID 30776527); GeneReviews is a Bookshelf
entry (NBK1453, no DOI); the CDC chapter carries no DOI.

### To verify

- The ESID clinical criteria for XLA (reproduced in the report's Table 2) and
  the Seidel 2019 working definitions were read through secondary summaries,
  not the primary tables.
- The CDC/ACIP "Altered Immunocompetence" live-vaccine list for severe
  antibody deficiency (OPV, BCG, Ty21a, LAIV, yellow fever) was confirmed only
  through secondary summaries and an older draft; the current (2023) table was
  not read line by line.
- Immunoglobulin replacement dosing (IV every 3–4 weeks or subcutaneous,
  trough-guided; about 3–4 infections a year on replacement) is from the
  source discussion and drug-reference ranges; have an immunologist confirm the
  replacement and vaccine statements before teaching use.
- The GeneReviews last-update date differs between sources; the entry carries
  the series span rather than a single date. Confirm the current update date on
  NCBI before release.
- The source references [2]–[12] (Bruton 1952 through El-Sayed 2019) support the
  discussion but are not carried into the case.

## Changelog

### 1.1.0 — 2026-10-28 (editorial revision)

- **Clinical content.** The diagnosis is no longer handed over by the gene
  report: `interpret-ig` is gated on the immunoglobulins only, `confirm` on the
  B-cell count only, and the BTK report gates only the long-term plan (audit
  E2). The differential reasoning the source models is taught — low IgG
  excludes selective IgA deficiency, and Wiskott–Aldrich is raised with the
  missing platelet count (A1). Management is made explicit: replacement,
  live-vaccine avoidance, genetic counselling (A2). The IgE text/table
  contradiction is kept and labelled, as the audit praises.
- **Source facts restored.** The outside laboratory's reference ranges and the
  local IgM range (B2); the eschar separation and the day-9 peeling (B1); the
  coagulase-positive culture and the undated CRP/PCT (B3); Table 1 as structured
  values per laboratory.
- **Structure.** Four one-way phases, with a new `immunology` phase holding the
  outside repeat immunoglobulins, lymphocyte flow and BTK report (the audit's
  fix for the single `workup` conflation, C1); the followup phase holds the
  treatment and follow-up record. 4 decisions × 3–4 options with
  option-specific feedback; 11 interventions (E3); 12-item rubric with two
  safety items including a harm-avoidance item scored only after the management
  decision; 6 objectives; 5 learning outcomes (E1); 6 teaching points.
- **Voice and register.** Pseudonym 小乐 / Xiaole (小禾 / He was shared with
  cmcr-70005 and reads as a pronoun); the parent speaks lay first person;
  persona fields brief an actor; `fallbackUnknown` and unknown answers in the
  library voice; adult template questions (occupation, self-care, prenatal
  alcohol) replaced by child-relevant unknowns (D2–D3); keywords rewritten and
  38 paraphrased utterances (C2).
- **Library text.** Spoiler-free summary and a separate triage handover (F1).
- **Investigations and figure.** `fig01` moved from the ultrasound result to
  the foot examination (`exam.foot.media`; F2); the outside reports and the
  follow-up record are record reviews (F4); a "not recorded" blood count added
  so the missing platelet count is visible.
- **References and governance.** Vancouver strings with the source URL;
  ESID 2019 and the CDC altered-immunocompetence guidance added, GeneReviews
  reformatted (F3); `provenance.review` (editorial, AI-assisted, not
  clinician-reviewed); version 1.0.0 → 1.1.0; this README (F5).

### 1.0.0

- PR #3 first release: 3 phases, 2 binary decisions gated on the BTK report,
  4 rubric items, no interventions, learning outcomes or teaching points. The
  IgE contradiction was already kept explicit (the collection's most faithful
  case).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1653404/case.json
npm run -s cc -- cases verify cmcr-1653404
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1653404
npm run -s cc -- exec --case cmcr-1653404 --autopilot --approval bypass --provider offline --output-format json
npm run -s cc -- exec --case cmcr-1653404 --autopilot --approval bypass --provider offline --output-format json --embodied
```

## 中文摘要

**病例概要。** 4岁1个月男孩，发热3天，右足背湿疹处红肿疼痛1天余并蔓延至踝部及小腿，口服阿莫西林克拉维酸无效。查体：右足第五趾关节表面约0.5 cm×0.5 cm紫黑色（焦痂样）皮损，足及小腿肿痛、无波动感；耻骨联合及臀部数个溃疡（图1）。既往生后反复湿疹，较早一年2次因肺炎住院，次年因肺炎及“脓疱疮”（金黄色葡萄球菌，MSSA）住院。本次CRP 328 mg/L、PCT 16.6 ng/mL；皮损培养MSSA（凝固酶阳性）、血培养阴性；胸片双肺支气管肺炎；足背超声软组织广泛水肿、无脓腔。免疫球蛋白：IgG约3.1 g/L、IgA测不到、IgM正常；正文称IgE无异常，表1为306 μg/L（矛盾保留）。外院流式B细胞6.0 cells/μL、T/CD4/CD8/NK正常，BTK半合子变异c.1632-2A>G。诊断：X连锁无丙种球蛋白血症，合并中重度特应性皮炎。治疗：针对性抗感染，继以免疫球蛋白替代（每月输注）。

**学习目标。**

1. 识别先天性免疫缺陷的预警特征（一年两次肺炎、需住院的葡萄球菌皮肤感染），在抗感染同时开具一线免疫检查（含血小板的血常规）。
2. 解读IgG降低、IgA缺如而IgM正常，说明为何排除选择性IgA缺乏，并查B细胞计数。
3. 用原文表2（ESID）临床标准解读流式结果，说明BTK基因检测在确诊和家系咨询中的作用。
4. 制定长期计划：终身免疫球蛋白替代、避免活疫苗、尽早治疗感染并监测肺部、母亲携带者检测与遗传咨询。
5. 对原文IgE的正文/表格矛盾保持两种表述并标注出处，不擅自取舍。

**关键决策。**

- 免疫筛查：抗感染的同时启动免疫缺陷筛查（含血小板），而非仅处理蜂窝织炎或只查HIV。
- 解读免疫球蛋白：IgG低加IgA缺如为抗体缺陷，排除选择性IgA缺乏，下一步查B细胞（仅凭免疫球蛋白结果作答，不先看B细胞/基因）。
- 确诊：B细胞显著减少、T细胞正常，查BTK基因确诊XLA（仅凭流式作答，不先看基因）。
- 长期方案：终身替代、避免活疫苗、尽早治疗感染、家系遗传咨询（干扰项：立即移植、只用预防性抗生素、皮损好了就结束）。

**复盘要点。**

- 反复肺炎加需住院的葡萄球菌感染是免疫评估的重要触发点；湿疹能解释部分皮肤问题，但不能解释反复肺炎。
- IgG低即不符合选择性IgA缺乏；B细胞<2%而T细胞正常提示无丙种球蛋白血症；IgM不低不排除本例表型。
- 确诊依据原文表2（ESID临床标准）加BTK变异；严重抗体缺陷者禁用减毒活疫苗（CDC/ACIP）。
- X连锁遗传需对母亲和女性亲属咨询；感染和慢性肺病是主要并发症，需终身随访和替代。
- 正文与表1的IgE矛盾显式保留，作为复盘讨论点，不擅自取舍。
- 本病例经人工智能辅助编辑审核，尚未经执业医师审核；用于教学前请由儿科免疫专科医生审核。
