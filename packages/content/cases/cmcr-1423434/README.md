# cmcr-1423434 — Recurrent palpitations and chest tightness · 42-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners should open the case from the
> case library, where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation.** The case follows one published report from the CMCR collection
(docs/CMCR_CASES.md): 刘俊. 联合应用华法林与胺碘酮致国际标准化比值升高和血尿. 药物不良反应杂志. 2014;16(1):40-41.
The patient (秦女士 / Ms Qin) is a pseudonym, and the ward nurse (熊护士 / Nurse Xiong), clinical pharmacist (廖药师 /
Pharmacist Liao) and attending (魏医生 / Dr Wei) are invented teaching roles; hospitals, calendar dates and
identifying details are removed. The course and every dose are the report's; what the report does not record stays
unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-1423434` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (ward bed 1) |
| specialty | cardiology, clinical pharmacology |
| difficulty | 3 / 5 |
| estimated time | about 35 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have a cardiologist or clinical pharmacologist review it before teaching use |
| phases | `admission` 入院评估 / Admission assessment → `postop` 术后第1–8天 / Postoperative days 1–8 → `haematuria` 术后第14–16天 / Postoperative days 14–16 → `followup` 原报告处理与出院 / Reported management and discharge — all one-way, none learner-switchable |
| content | 18 history items (9 not recorded in the report, 6 required) · 7 exam findings · 13 investigations (3 record reviews; 4 orderable tests with no reported result) · 14 interventions (3 harmful, 3 timing-dependent) · 5 objectives · 4 decisions (17 options) · 11 rubric items (10 deterministic, weight 24; 1 examiner-judged) · 3 NPCs · 5 learning outcomes · 6 teaching points · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. Anticipate the amiodarone–warfarin interaction: reduce warfarin by about one-third to one-half when the two are
   started together and check the INR every few days for the following weeks.
2. Explain a delayed, non-linear INR rise after amiodarone starts, using amiodarone's pharmacokinetics.
3. Grade bleeding on a vitamin K antagonist by the ACC 2020 major-bleeding criteria before choosing reversal, and
   explain why non-major bleeds generally need no reversal agent.
4. Restart anticoagulation early at a lower dose once bleeding stops and set an INR plan after discharge, weighing
   the thrombotic risk of a new bioprosthesis and AF.
5. Identify co-existing interactions on the drug chart (amiodarone–digoxin) and grade causality honestly in a
   single-case adverse drug reaction.

These are the case's `learningOutcomes` (case card on request, every debrief); the five HUD `objectives` below are
the in-game task list.

## Clinical summary

**Admission.** A 42-year-old woman with 14 years of exertional palpitations and chest tightness (with paroxysmal
nocturnal dyspnoea at onset), worse for a week with swollen legs. A murmur was found 20 years ago; 14 years ago she
had an Ebstein-anomaly repair locally without much relief. No allergies; no hypertension, diabetes or
genitourinary disease. T 36.4 °C, radial pulse 84/min, RR 19/min, BP 128/86 mmHg; JVP moderately raised,
hepatojugular reflux positive; coarse breath sounds; apical rate **89/min**, irregular, varying heart sounds;
grade III/6 tricuspid-area and II/6 apical systolic murmurs, loud P2; mild leg oedema. WBC 4.5 ×10⁹/L, neutrophils
0.86, platelets 128 ×10⁹/L, **PT 11.7 s, INR 1.0**, BNP 822 ng/L, **normal urinalysis**. Echo: severe TR, thickened
mitral valve with moderate MR, mild AR, moderate pulmonary hypertension. ECG: AF, complete RBBB, T inversion, ST
depression. Abdominal and **urinary-tract ultrasound normal**. Furosemide 20 mg, spironolactone 20 mg and metoprolol
succinate 47.5 mg daily.

**Surgery and anticoagulation.** Hospital day 9: bioprosthetic tricuspid valve replacement, mitral repair and
radiofrequency AF ablation. From postoperative day (POD) 1: **warfarin 3.00 mg/day**, digoxin 0.125 mg and
irbesartan 0.15 g daily. POD3: PT 15.5 s, INR 1.3 → **warfarin 3.75 mg/day**. POD8: AF recurred (HR 81/min), PT
21.3 s, INR 1.9 → **amiodarone 0.2 g daily added, warfarin kept at 3.75 mg/day**. POD14: PT 26.0 s, INR 2.2 → 3.00
mg/day. POD15: PT 27.9 s, INR 2.4 → 2.25 mg/day.

**The bleed.** POD16: **visible haematuria**, urine RBC 300/µL, **PT 60.0 s, INR 5.1**. Warfarin stopped, other
treatment unchanged (amiodarone continued); **vitamin K1 10 mg IM**; 4 h later PT 48.2 s, INR 4.1 → a second 10 mg
IM; 4 h later PT 18.7 s, INR 1.6, urine clearing. Next day (POD17): urine RBC negative, PT 16.6 s, **INR 1.4**;
**warfarin restarted 1.50 mg/day**; discharged the same day without further haematuria. No haemoglobin,
haemodynamics, transfusion, catheter, target INR or post-discharge result is reported.

**Diagnosis.** Over-anticoagulation with haematuria from the warfarin–amiodarone interaction (warfarin not reduced
when amiodarone started) — a probable adverse drug interaction; the authors call it certain.

## Scenario timeline and physiology

- **Static clock, no physiology** (the collection contract). Interventions are scored for appropriateness but change
  nothing — the course is the report's.
- **Four one-way phases**, each a period of the record, gated so that no decision can be answered by reading the
  result that answers it:
  - `admission` → `postop` once the admission history and the admission examination and baseline tests are done
    (objectives 1–2). The post-operative drug chart ends at the POD8 plan to add amiodarone; **what the team then
    did with the warfarin is not shown**.
  - `postop` → `haematuria` once decision 1 is right and amiodarone, a warfarin reduction and a digoxin adjustment
    have been charted (objective 3). Only now does the drug chart show that the report's team kept 3.75 mg/day.
  - `haematuria` → `followup` once the bleed has been assessed, decisions 2 and 3 are right and warfarin is withheld
    (objective 4). The report's INR trajectory after the reversal, its restart and the discharge appear only here.
- Decision feedback names the report's own choice (warfarin kept at 3.75 mg/day; IM vitamin K 10 mg twice) only
  after a learner picks that option; no prompt, hint, order response or harm text states a later phase's facts.
- Results read in one phase stay readable later (orders keep their phase). The PT/INR test returns that day's value
  (admission, POD8, POD16, POD17) and the urine test the admission, POD16 and POD17 results. The INRs in between
  are where the team recorded them: POD3 on the post-operative drug chart, POD14 and POD15 on the drug chart of the
  `haematuria` phase, and the two values after vitamin K in the outcome record (`followup`). Each PT/INR result says
  where the earlier values are.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-admission-history` Admission history | presentation, associated symptoms, previous heart surgery, allergies and other illness (incl. genitourinary) asked |
| 2 | `obj-admission-assessment` Admission examination and baseline tests | vital signs, neck veins, heart and legs examined; blood count/BNP, PT/INR, urinalysis, ECG, echo, abdominal/urinary ultrasound and the admission drug chart read |
| 3 | `obj-amiodarone` Day 8 after surgery: review the drug chart | post-operative drug chart and INRs read; `coprescription` right; amiodarone, warfarin reduction and digoxin adjustment charted |
| 4 | `obj-bleed` Day 16 after surgery: assess the new problem | haematuria asked, urine inspected; urine, INR and bleeding-severity records read; `diagnosis` and `management` right; warfarin withheld |
| 5 | `obj-discharge` Plan the discharge | outcome record read; `discharge` right; warfarin restarted; discharge teaching done |

The journal shows later objective titles before they are reached, so the titles are neutral ("assess the new
problem"); hints coach with questions and never contain an option's text.

### Decisions

- `coprescription` (POD8; needs the post-operative drug chart and INRs): start amiodarone with a pre-emptive warfarin
  reduction (about one-third to one-half), INR every 2–3 days for weeks, digoxin review. Distractors: **keep 3.75
  mg/day — the report's choice**; stop warfarin for a month; increase warfarin first.
- `diagnosis` (POD16; needs the urine, the INRs and the drug chart): a **probable** warfarin–amiodarone interaction
  with possible contributors and a urinary cause still to exclude. Distractors: a urinary cause with a coincidental
  INR; amiodarone liver injury; **"certainly the interaction" — the authors' own conclusion**.
- `management` (POD16; needs the bleeding-severity record): withhold warfarin and grade the bleed (ACC 2020); no
  reversal agent for a non-major bleed; IV vitamin K with PCC only for a major one. Distractors: **IM vitamin K 10 mg
  repeated after 4 h — the report's choice**; PCC + IV vitamin K now; carry on at a lower dose; stop warfarin for good
  and switch to aspirin.
- `discharge` (follow-up; needs the outcome record): early and frequent INR checks while the amiodarone effect
  builds, digoxin review and bleeding teaching. Distractors: one INR at the three-month clinic; withhold for a week
  ("the restart was too early"); stop amiodarone and return to 3.75 mg/day.

Every option has its own feedback (why it is right or wrong, with the guidance or source data it rests on).

### Rubric (10 deterministic items, total weight 24, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 2 | presentation, associated, surgery, allergies, PMH asked |
| `rb-exam` | examination | 2 | vitals, neck veins, heart and legs examined |
| `rb-baseline` | investigations | 1 | blood count/BNP, admission PT/INR and urinalysis, ECG, echo, urinary ultrasound read |
| `rb-coprescribe` | management | 3 | `coprescription` right first time; warfarin reduction and INR plan charted |
| `rb-safety-dose` | safety | 3 | warfarin never continued at full dose |
| `rb-digoxin` | management | 2 | digoxin adjusted |
| `rb-dx` | diagnosis | 3 | `diagnosis` right first time |
| `rb-bleed` | management | 3 | `management` right first time; warfarin withheld |
| `rb-safety-reversal` | safety | 3 | neither IM vitamin K nor PCC given |
| `rb-discharge` | management | 2 | `discharge` right first time; warfarin restarted; discharge teaching |
| `rb-communication` | communication | (judged) | explains the interaction honestly (likely, not certain), why warfarin continues, the INR plan and the warning signs; checks understanding |

### How wrong choices score

- All four decisions use `decidedFirstTry`.
- `warfarin-continue` is `contraindicated` in `postop` and `haematuria` (fails `rb-safety-dose`); `vitk-im` and `pcc`
  are always `contraindicated` (fail `rb-safety-reversal`); each carries its own harm text.
- Timing-dependent: `warfarin-reduce` is indicated in `postop` but contraindicated while she bleeds;
  `hold-warfarin` is indicated in `haematuria` but contraindicated on POD8 (a new bioprosthesis with AF);
  `restart-warfarin` is contraindicated while she bleeds and indicated in `followup`.
- `vitk-iv`, `stop-amiodarone` and `iv-access` are `neutral`; their responses explain what they would and would not
  achieve.
- **Pending framework fields** (S/pr3/fxc-annotations/cmcr-1423434.json, applied by the coordinator): both safety
  items get `scoredWhen` (counting once the learner has reached the relevant prescribing step — attempted the
  decision or charted any of its drugs) and `critical: true`. Until then, as in every case, doing nothing earns both
  safety items (6/24).

## Reference path (`solution`)

73 steps, static clock: start → 12 admission history questions → vitals, neck, chest, heart, legs → blood
count/BNP, PT/INR, urinalysis, ECG, echo, admission drug chart, urinary ultrasound → (phase `postop`) eating since
surgery → post-operative drug chart and INRs → pharmacist review → `coprescription` → amiodarone, warfarin
reduction, digoxin reduction, INR plan → (phase `haematuria`) urine, urinary symptoms, other bleeding, catheter →
urine inspection → drug chart, INRs, urine, bleeding severity, repeat blood count → `diagnosis` → `management` →
withhold warfarin → (phase `followup`) urine now, urine inspection → outcome record, INRs, urine → `discharge` →
restart warfarin, discharge teaching → finish. `cases verify` passes; the deterministic rubric scores 24/24.

## Clinical numbers check

All values are the report's; derived values appear only here and in feedback.

- Pulse deficit: apical 89/min vs radial 84/min = 5/min — an AF clue (objective 2 hint).
- Warfarin: 3.00 mg/day (POD1) → 3.75 (POD3) → kept at 3.75 with amiodarone (POD8) → 3.00 (POD14) → 2.25 (POD15)
  → withheld (POD16) → 1.50 (POD17). A one-third to one-half reduction of 3.75 mg/day would have been about
  2.5–1.9 mg/day; Sanoski and Bauman's 30 % for amiodarone 200 mg/day ≈ 2.6 mg/day.
- PT/INR: 11.7 s/1.0 (admission) → 15.5/1.3 (POD3) → 21.3/1.9 (POD8) → 26.0/2.2 (POD14) → 27.9/2.4 (POD15) →
  60.0/5.1 (POD16) → 48.2/4.1 (4 h after the first vitamin K) → 18.7/1.6 (4 h after the second) → 16.6/1.4 (POD17).
  The INR more than doubled (2.4 → 5.1) in one day, eight days into the combination. In the case the PT/INR test
  carries the admission, POD8, POD16 and POD17 values; POD3, POD14 and POD15 are on the drug chart and the two
  post–vitamin K values in the outcome record.
- Vitamin K1: 2 × 10 mg IM, 4 h apart (20 mg).
- Urine RBC 300/µL (POD16) → negative (POD17). BNP 822 ng/L; WBC 4.5 ×10⁹/L, neutrophils 0.86, platelets
  128 ×10⁹/L — the report gives no reference ranges, so the case flags none.
- Source statistics used in teaching: bleeding risk ×2 at INR 3.0–4.4, ×4 at 4.5–6.9, ×5 above 7.0 versus 2.0–2.9
  (its ref. 1); amiodarone raises bleeding risk 3.2-fold in AF (its ref. 3); warfarin reductions of 40/35/30/25 % at
  amiodarone 400/300/200/100 mg/day and a peak interaction around week 7 (Sanoski and Bauman, its ref. 5); onset
  4–5 days, peak 5–7 days, steady state ≈ 1 month, effect 8–10 days after stopping; a 25–50 % warfarin reduction.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel when the urine turned red after you had already cut the warfarin twice?"
2. **Description.** "Walk us through her warfarin doses and INRs from day 1 to day 17."
3. **Analysis.**
   - "On day 8, what did you expect amiodarone to do to her INR, and when?"
   - "Why did the INR jump in one day, despite two dose cuts?"
   - "Was this a major bleed? What would you need to know to say?"
   - "What did 20 mg of intramuscular vitamin K achieve, and what did it cost?"
   - "When is it safe to restart, and why not wait a week?"
   - "The authors say the cause 'can be stated definitely'. Do you agree?"
   - "What else on her chart does amiodarone change?" (digoxin)
4. **Summary.** "What will you do the next time you add amiodarone to someone on warfarin?"

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Keeping the warfarin dose when amiodarone starts | `keep-dose` feedback; `warfarin-continue` contraindicated; the next phase shows the report did this | `rb-coprescribe`, `rb-safety-dose` |
| Stopping warfarin on day 8 "to be safe" | `stop-warfarin` feedback; `hold-warfarin` contraindicated in `postop` | `rb-coprescribe` |
| Forgetting digoxin | objective 3 cannot complete; teaching point 5 | `rb-digoxin` |
| Reversing before grading the bleed | `im-vitk-repeat` / `pcc-now` feedback; `vitk-im`, `pcc` contraindicated | `rb-bleed`, `rb-safety-reversal` |
| Calling the cause certain | `certain` feedback (the authors' wording) | `rb-dx` |
| Delaying the restart, or a loose INR plan after discharge | `wait-a-week` / `clinic-3-months` feedback | `rb-discharge` |
| Inventing what the record lacks (haemoglobin, catheter, INR target) | not-reported results and unknown history items | — |

## Embodied mode

- **Where things are (`general-hospital`).** She lies in ward bed 1 throughout; the reference path moves nobody
  (offline autopilot, en and zh-CN: no `patient.moved`; 24/24 in clinical and in-world mode). The drug chart,
  bleeding-severity and outcome records are read at a `records` terminal (the ward station). The ECG uses the ward's
  ECG cart; the echo and the abdominal/urinary ultrasound need the portable ultrasound cart, which the autopilot
  wheels from imaging; laboratory tests are sampled at the patient. Medicines are delivered (the ward has a
  medicines cabinet).
- **IV access.** A ward patient on post-operative day 16 is not assumed to have a cannula: IV items (`vitk-iv`, `pcc`)
  need the case's IV-access procedure first (`iv-access`, the cannulation kit on the ward crash cart). The reference
  path has no IV item.
- **Scope of practice.** Drug orders are nursing-scope by kind; the pharmacist review is a consultation (anywhere);
  the INR plan and the discharge teaching are kind `other` (no kit). Nothing is authored with a `destination` or a
  `posture`.
- **Record reviews.** The three `records` items require only `records`; the coordinator adds `performedAt:
  "records"` when the framework field lands (annotation file).

## Source and adaptation (fidelity limits)

**From the report.** Every history and examination fact, every laboratory, imaging and ECG result, the clinical
diagnoses, the operation and its day, every drug and dose with each change and its day, the AF recurrence, the
haematuria with its counts, the reversal (both vitamin K doses and the INR at each point), the restart dose, the
discharge day, and the authors' reasoning (CYP2C9/CYP1A2 inhibition, the 25–50 % reduction, Sanoski and Bauman's
dose relationship and week-7 peak, amiodarone's pharmacokinetics, the INR–bleeding relationship, the exclusion of
urinary disease and the "definite" attribution).

**Adapted for teaching.** The patient's speech and personality; the ward nurse, clinical pharmacist and attending;
the four decisions, their options and feedback; the fourteen interventions (the reported steps and the tempting
alternatives) with their dose formulas and responses; the phase gating; the rubric; the not-reported orderable tests
(repeat blood count, digoxin level, renal/liver tests, urine culture) whose results say so; the "current medicines"
answer that points to the drug chart.

**Labelled contradiction.** The English abstract gives day-17 values of PT 18.7 s and INR 1.6, but the Chinese
abstract and the main text give PT 16.6 s and INR 1.4 for day 17 (the next day); 18.7 s/1.6 are the main text's
values 4 h after the second vitamin K dose. The case follows the main text and labels this in `provenance.notes` and
in the notes of the outcome record and the follow-up INR result. Also kept as reported: the authors describe the
INR as unchanged over the first 8 days of the combination although it rose 1.9 → 2.2 → 2.4 while the dose was being
cut (noted here for facilitators; the record is not corrected).

**Privacy.** The report gives the calendar date of admission; the case uses hospital and postoperative days only.
The source PDF prints that date in the article text and names the author's hospital (where she was treated) in the
affiliation — publication metadata, not a burned-in image identifier; the PDF is kept, local-only and locked until
the case is complete, and the point is reported to the coordinator for the privacy table.

**Figures.** The article has no figures. The only asset is the source PDF (checksum unchanged); its title keeps the
clause that page 1 opens with the end of another article (that article's text is not used).

**Unknowns kept honest:** her medicines before admission, smoking, alcohol, supplements, family history, eating after
surgery; whether the pre-operative diuretics and metoprolol continued; post-operative haemoglobin, platelets,
renal/liver function, albumin and digoxin level; haemodynamics, transfusion, catheter, urinary symptoms and culture at
the bleed; heart rate and rhythm after amiodarone; the INR target, the long-term plan, INRs after discharge and any
later bleeding or thrombosis.

## Matcher notes

- **`excludeKeywords`** keep look-alike questions apart: the admission-time `presentation` and `associated` items vs
  urine and bleeding questions; `pmh` (kidney and bladder history) vs family, "today" and catheter questions;
  `medications` (before admission) vs `current-meds` (in hospital) and allergies; `haematuria` vs pain, fever,
  catheter, gums and stool questions; `alcohol` vs eating and water.
- `haematuria-now` (follow-up) `supersedes` `haematuria` (POD16), so "any blood in your urine?" asked in follow-up
  reaches the current answer; its keywords are "now"-phrasings. Both are `volunteer` items, so an open question on
  day 16 ("how are you feeling?", "怎么了") brings out the red urine, and in follow-up its clearing.
- English keywords are real words and phrases, never run-together strings: a phrase of three or more words keeps at
  least two content words ("brought you into hospital", "trouble with your heart", "murmur discovered"), and short
  questions are caught by two-word phrases ("brought in", "in hospital", "the matter", "the ward", "more blood");
  `presentation` excludes medicine words so "what medicines are you on in hospital?" reaches `current-meds`.
  `cases validate` reports 0 warnings.
- **Order entry:** "超声" / "B超" / "ultrasound" offer both the echo and the abdominal/urinary ultrasound; a repeat
  blood count ("复查血常规", "haemoglobin", "repeat") goes to `fbc-postop`, not the admission count.
- The corpus (40 paraphrases, 22 zh-CN / 18 en, every required item covered, none equal to a canonical question)
  passes `cases verify` with no extra selections.

## References

- 刘俊. 联合应用华法林与胺碘酮致国际标准化比值升高和血尿. 药物不良反应杂志. 2014;16(1):40-41. doi:10.3760/cma.j.issn.1008-5734.2014.01.011. Available from: https://rs.yiigle.com/cmaid/1423434
- Tomaselli GF, Mahaffey KW, et al. 2020 ACC expert consensus decision pathway on management of bleeding in patients on oral anticoagulants. J Am Coll Cardiol. 2020;76(5):594-622. doi:10.1016/j.jacc.2020.04.053
- Holbrook A, Schulman S, et al. Evidence-based management of anticoagulant therapy: Antithrombotic Therapy and Prevention of Thrombosis, 9th ed: American College of Chest Physicians Evidence-Based Clinical Practice Guidelines. Chest. 2012;141(2 Suppl):e152S-e184S.
- Van Gelder IC, et al. 2024 ESC Guidelines for the management of atrial fibrillation. Eur Heart J. 2024;45(36):3314-3414. doi:10.1093/eurheartj/ehae176
- Praz F, Borger MA, et al. 2025 ESC/EACTS Guidelines for the management of valvular heart disease. Eur Heart J. 2025;46(44):4635-4736. doi:10.1093/eurheartj/ehaf194
- Sanoski CA, Bauman JL. Clinical observations with the amiodarone/warfarin interaction: dosing relationships with long-term therapy. Chest. 2002;121(1):19-23.
- 中华医学会心血管病学分会, 中国老年学学会心脑血管病专业委员会. 华法林抗凝治疗的中国专家共识. 中华内科杂志. 2013;52(1):76-82.

How each DOI was verified (2026-10-28): the source article — printed in the PDF footer and in the export record. The
ACC 2020, ESC 2024 AF and ESC/EACTS 2025 DOIs rest on the PR #3 audit's web verification (ACC and Einstein/Elsevier
Pure records; the Erasmus University repository; the University of Milan repository — S/pr3/audit/cmcr-1423434.md);
this revision's own web-search budget was exhausted before it could re-check them, and doi.org, Crossref, PubMed and
the publishers' sites are not reachable from this environment. CHEST 2012, Sanoski 2002 and the Chinese consensus are
cited without a DOI because none was verified.

### To verify

- **US amiodarone prescribing information** (warfarin: PT about +100 % after 3–4 days, reduce warfarin by one-third
  to one-half and monitor the PT; digoxin: reduce by about half or stop): wording from label-derived pages in the
  audit; confirm against the current DailyMed label before quoting. It is named in the teaching text but not listed
  as a reference, because no dated label version could be checked.
- **ACC 2020:** the author list beyond the first two; its wording on vitamin K for non-major bleeding (the case says
  only that reversal agents are generally not used for non-major bleeds, which the audit confirmed).
- **CHEST 2012:** its DOI; the vitamin K statement (no routine vitamin K for an INR of 4.5–10 without bleeding) comes
  from a secondary summary.
- **INR target.** The case calls INR 2.0–3.0 the usual VKA target in AF (decision 4 feedback); the target for a
  tricuspid bioprosthesis with AF in ESC 2024 AF and ESC/EACTS 2025 was not re-read, and the report states none.
- **Intramuscular vitamin K.** The case does not say why IM vitamin K is avoided at a high INR (injection-site
  haematoma, unpredictable absorption): no guideline wording was confirmed. It says only that current guidance
  chooses whether to reverse, the dose and the route by bleeding severity; add the reason once the ACC 2020 or
  CHEST 2012 wording is confirmed.
- **ESC 2024 AF / ESC/EACTS 2025:** author lists beyond the first author(s); the early post-operative anticoagulation
  statement comes from the ESC working-group summary cited in the audit.
- **中国专家共识（2013）:** bibliographic data from citing reference lists; content not read; no DOI confirmed.

## Changelog

### 1.1.0 — 2026-10-28 (editorial revision)

- **Drug record restored (audit B1, B2, B5, B6).** Every dose and change is back — the pre-operative furosemide,
  spironolactone and metoprolol; warfarin 3.00 → 3.75 mg/day; digoxin and irbesartan; amiodarone 0.2 g with warfarin
  kept at 3.75 mg/day; the reductions to 3.00 and 2.25; the reversal (2 × 10 mg IM vitamin K1, INR 4.1 → 1.6 → 1.4,
  urine RBC negative) and the restart at 1.50 mg/day. Admission bloods (WBC, neutrophils, platelets, BNP) added; the
  echo and ECG details (mitral thickening, mild AR, T inversion, ST depression) and the four clinical diagnoses
  restored.
- **Labelled contradiction (B3).** The English abstract's day-17 PT/INR (18.7 s/1.6) vs the main text (16.6 s/1.4),
  kept in `provenance.notes` and on the follow-up results.
- **Phases (C2).** `workup` split into `admission` → `postop` → `haematuria` → `followup`, one-way, so the POD14–16
  INRs and the report's own choices are hidden until the decision that depends on them has been made.
- **Decisions (A1, A2, A3, C1, C3).** 2 → 4: the POD8 co-prescription decision (the report's "keep 3.75 mg/day" as a
  distractor); attribution with honest causality grading (the authors' "definite" as a distractor; other
  contributors named); bleed management that separates grading and reversal from restart timing (the report's IM
  vitamin K as a distractor; only its feedback, once chosen, says it was the report's); the discharge INR plan. Every
  option has its own feedback.
- **Interventions (E2).** 0 → 14: amiodarone, warfarin reduction, digoxin reduction, INR plan, pharmacist review,
  withhold warfarin, restart at a reduced dose, discharge teaching; harmful or neutral alternatives: continue the
  full dose, IM vitamin K, IV vitamin K, PCC, stop amiodarone, IV cannula.
- **Rubric (E3, C4).** 4 → 11 items with first-try scoring, two weight-3 safety items (pending `scoredWhen` +
  `critical` annotations) and a judged communication item; objective 1 now asks about genitourinary history and the
  drug-chart objective requires the drug chart.
- **Exam (B4, C6).** Variable heart-sound intensity and loud P2 restored; the radial (84/min) vs apical (89/min) rates
  kept and drawn out in the hint; neck veins, chest and legs as separate findings; urine inspection in POD16 and
  follow-up.
- **Investigations (F2).** `cardiac-tests` (a record that required an echo machine) split into `echo`
  (echocardiography) and `ecg` (12-lead); `abdo-us` added; not-reported orderable tests (repeat blood count, digoxin
  level, renal/liver tests, urine culture).
- **Voice (D1, D3).** First-person lay answers in both languages; the library's fallback line ("这个我的病历里没有记录，
  我说不上来。" / "That isn't recorded in my case notes, so I can't really say."); post-operative history items
  (haematuria, symptoms, other bleeding, catheter, eating); 16 canonical utterances → 40 paraphrases.
- **Teaching layer (A4, A5, E1, E4).** 6 teaching points tied to named guidance (then-versus-now on the dose and the
  reversal), 5 learning outcomes, pharmacist and nurse NPCs; the follow-up record is now a neutral historical account (its
  unexplained "not endorsed" note is gone — the critique lives in decision 3's feedback and the teaching points).
- **Card (D2, F3).** English title "· 42-year-old woman"; summary and triage note rewritten (no theme give-away, and
  different from each other); patient tags no longer repeat the chief complaint; neutral objective titles.
- **References (F1).** One Vancouver string each, with verified DOIs; ACC 2020, CHEST 2012, ESC 2024 AF, ESC/EACTS
  2025, Sanoski and Bauman 2002 and the Chinese consensus 2013; the ACC web page URL removed. `provenance.review`
  added (editorial, AI-assisted, not clinician-reviewed).
- **Names.** Pseudonym 陶女士 / Ms Tao → 秦女士 / Ms Qin (Tao is an English word); the new staff roles are named
  熊护士 / Nurse Xiong, 廖药师 / Pharmacist Liao and 魏医生 / Dr Wei, names no other case uses.
- **INR history in the records.** The PT/INR test returns the day's value in each phase; the POD3, POD14 and POD15
  PT/INRs are read on the drug chart (with their dose changes) and the post–vitamin K values in the outcome record,
  so earlier results are record reviews, as in the other CMCR cases.
- **Calibration.** Difficulty 4 → 3, estimated time 25 → 35 min; version 1.0.0 → 1.1.0.
- **Ids.** `cardiac-tests` → `echo` + `ecg`; history `associated`, `surgery`, `allergies`, `pmh`, `medications`,
  `murmur`, `family`, `smoking`, `alcohol`, `supplements`, `presentation` kept; `bleeding` → `haematuria`;
  `occupation`, `self-care`, `expectations` removed; objectives and rubric re-identified; decision ids `diagnosis`
  and `management` kept, `coprescription` and `discharge` added; phases `initial`/`workup` → `admission`/`postop`/
  `haematuria` (`followup` kept). No test or doc references these ids.

### 1.0.0

- First CMCR release (PR #3): 15 history items, 3 exam findings, 6 investigations, 2 decisions, 4 rubric items, no
  interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1423434/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1423434                                      # 73 steps, objectives 5/5, decisions 4/4, utterances 40/40
npx vitest run packages/content/src/cmcr-20.test.ts -t cmcr-1423434
npm run -s cc -- exec --case cmcr-1423434 --autopilot --approval bypass --provider offline --output-format json             # 24/24
npm run -s cc -- exec --case cmcr-1423434 --autopilot --approval bypass --provider offline --output-format json --embodied  # 24/24
```

## 中文摘要

**病例概要。** 42岁女性，活动后心悸、胸闷14年，加重1周伴双下肢水肿；14年前行三尖瓣下移畸形矫治术，无过敏史，无高血压、糖尿病及泌尿生殖系统疾病史。入院时心房颤动，三尖瓣重度、二尖瓣中度关闭不全，INR 1.0，尿常规和泌尿系超声正常。入院第9天行三尖瓣生物瓣置换＋二尖瓣成形＋房颤射频消融。术后第1天起华法林 3.00 mg/d（同用地高辛 0.125 mg、厄贝沙坦 0.15 g），第3天INR 1.3增至 3.75 mg/d；第8天房颤复发、INR 1.9，加用胺碘酮 0.2 g每日1次而华法林未减量；第14、15天INR 2.2、2.4，两次减量；第16天INR 5.1并出现肉眼血尿（尿红细胞 300/μL）。停用华法林，两次肌注维生素K₁ 10 mg，次日INR 1.4、尿红细胞阴性，以 1.50 mg/d恢复华法林，第17天出院。原文英文摘要第17天的PT/INR（18.7 s/1.6）与正文（16.6 s/1.4）不一致，病例以正文为准并保留标注。

**学习目标。**

1. 预见胺碘酮–华法林相互作用，合用时预先将华法林减量约 1/3–1/2，并在数周内每隔几天复查INR。
2. 用胺碘酮的药代动力学解释INR延迟、非线性的升高。
3. 按ACC 2020共识的大出血标准给出血分级后再决定是否逆转，说明非大出血一般不用逆转剂。
4. 出血停止后以较低剂量尽早恢复抗凝，并制定出院后的INR监测计划。
5. 识别并存的胺碘酮–地高辛相互作用，并如实为单一病例的药物不良反应做因果分级。

**关键决策。**

- 术后第8天加用胺碘酮：华法林预先减量 1/3–1/2、每 2–3 天查INR、复核地高辛；原报告“维持 3.75 mg/d”是干扰项。
- 血尿的原因：很可能的华法林–胺碘酮相互作用，仍需排除尿路局部原因；原文作者“故可以明确”的结论偏强。
- 出血处理：停用华法林，先按ACC 2020分级；非大出血不用逆转剂；原报告两次肌注维生素K₁ 10 mg使INR矫枉过正。
- 出院计划：出院后数日内复查INR、此后至少每周一次直至稳定，复核地高辛并做出血宣教。

**复盘要点。**

- 胺碘酮抑制CYP2C9和CYP1A2；说明书：3–4 天PT约延长一倍，华法林减量 1/3–1/2；地高辛减半或停用。
- 相互作用延迟出现、逐步累积（4–5 天起效、5–7 天高峰、约一个月稳态，Sanoski：约第7周达高峰），INR可一天翻倍。
- 先给出血分级再逆转（ACC 2020）；CHEST 2012：INR 4.5–10且无出血不常规用维生素K。
- 新生物瓣和房颤的血栓风险要求尽早、以较低剂量恢复抗凝，并密切监测INR（ESC 2024房颤、ESC/EACTS 2025瓣膜病）。
- 单一病例只能判为“很可能”的相互作用。
- 本病例经AI辅助编辑审核，尚未经执业医师审核；用于教学前请由心内科或临床药学专业人员审核。
