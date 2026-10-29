# septic-shock-cap — Fever, cough and confusion · 72-year-old woman

> **Spoilers for facilitators and case authors.** This guide names the diagnosis. Learners open the case from the
> case library, where the title, summary and tags give nothing away.

**Synthetic case — 虚构教学病例.** This is a fictional teaching case written for ClinicalCraft. The patient (林秀珍 /
Lin Xiuzhen), her daughter (周敏 / Zhou Min) and every staff member are pseudonyms; no real patient record was used.
All values are invented and were cross-checked for internal consistency (see "Clinical numbers check"). It is not
medical advice and does not replace local protocols or current guidelines. 虚构教学病例，不构成医疗建议。

## Case card

| | |
|---|---|
| id / version | `septic-shock-cap` / `1.1.1` |
| setting / facility | `emergency` (ED resus bay 1, night shift) / `general-hospital` |
| specialty | emergency medicine, critical care, infectious diseases, respiratory medicine |
| difficulty / estimated time | 4 / 5 · ~45 min (simulated clock from 21:30, 180-min limit) |
| languages | `zh-CN`, `en` |
| review status | `editorial` (2026-10-28): AI-assisted authoring and editorial review against the guidance listed under References; **not yet reviewed by a licensed clinician** — have an emergency or intensive care physician review it before teaching use |
| phases | `resus` → `reassess` (automatic once antibiotics are in **and** ≥ 3 × 500 mL boluses given) — or `reassess-late` instead when the antibiotics went in after the 60-minute mark (`abx-late`); none is learner-switchable |
| clock | simulated, `realtimeScale` 1; costs: ask 0.5, examine 1, order 0.5, read 0.5, intervene 1, answer 0 min |
| content | 42 history items, 21 exam findings, 20 investigations, 23 interventions, 6 learning outcomes, 6 objectives, 5 decisions, 17 rubric items (15 deterministic, 2 examiner-judged), 6 NPC briefs, 86 matcher test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise septic shock in an older adult by the Sepsis-3 criteria (infection with an acute SOFA rise ≥ 2; a
   vasopressor needed to keep MAP ≥ 65 mmHg after adequate fluids, with lactate > 2 mmol/L), treating qSOFA and NEWS2
   as alarms, not diagnostic criteria.
2. Take two sets of blood cultures without delaying treatment and give IV empirical antibiotics within 1 hour of
   recognising shock — for severe CAP without MRSA or Pseudomonas risk factors, a β-lactam plus a macrolide (or a
   respiratory fluoroquinolone).
3. Resuscitate with balanced crystalloid in 500 mL boluses towards about 30 mL/kg, reassessing perfusion and the chest
   after each, and start norepinephrine (peripherally if needed) when MAP stays below 65 mmHg, titrating to an initial
   target of 65 mmHg (60–65 mmHg for adults aged 65 or over, SSC 2026).
4. Measure lactate on arrival and repeat it after initial resuscitation, and interpret a near-normal venous pH using
   the anion gap, Winter's formula and the delta ratio.
5. Score CURB-65 from presentation data, apply the ATS/IDSA severe-CAP criteria and refer to ICU with an SBAR handover.
6. Keep medicines safe in shock with AKI: elicit over-the-counter NSAID use, hold metformin, antihypertensives and
   NSAIDs, check the QTc before a macrolide or fluoroquinolone, and give full first antibiotic doses.

These are distinct from the six HUD objectives (the in-game task list, below).

## Clinical summary

**Diagnosis (hidden from the learner).** Right lower lobe community-acquired pneumonia, *Streptococcus pneumoniae*
likely (numerous Gram-positive lancet-shaped diplococci on a good-quality sputum sample; urinary pneumococcal antigen
positive; blood cultures pending), with **septic shock** by Sepsis-3 — norepinephrine needed to keep MAP ≥ 65 mmHg
after initial fluids, lactate 4.6 mmol/L on arrival and 3.6 mmol/L after initial fluids. Complications: acute kidney
injury KDIGO stage 2 (creatinine 156 µmol/L, 2.0 × the baseline of 78 µmol/L from 8 months ago, with oliguria),
sepsis-associated delirium (4AT 7) and hypoxaemia.

**Presentation.** A 72-year-old retired teacher, normally fully independent, with 2 days of fever and rigors, a cough
productive of rust-coloured sputum and, since yesterday, right-sided pleuritic pain; confused since mid-afternoon;
her daughter gave her another ibuprofen at about 17:00 because she put the confusion down to the fever. Triage on room
air: T 39.1 °C, HR 118, BP 84/48 (MAP 60), RR 28, SpO₂ 89 %, GCS 14; NEWS2 16, qSOFA 3. Bronchial breathing and crackles at the right
base, a pleural rub, mottled knees, capillary refill 4 s. Hypertension (amlodipine) and type 2 diabetes (metformin);
no allergies; no admission or antibiotics in the last 3 months; no MRSA or *Pseudomonas* history.

**Key findings.** VBG pH 7.35 with HCO₃⁻ 15.8 mmol/L, BE −8.7 and an anion gap of 19 (≈ 21 albumin-corrected) — a
high-anion-gap metabolic acidosis with a concurrent respiratory alkalosis; lactate 4.6 mmol/L (critical). WBC 18.4
×10⁹/L, platelets 132 ×10⁹/L, urea 11.8 mmol/L, creatinine 156 µmol/L, bilirubin 24 µmol/L, PCT 18.6 µg/L, QTc 452
ms. Portable film: right lower lobe consolidation with air bronchograms and a small effusion. CURB-65 4 (the RR of 28
does not score); ATS/IDSA severe CAP (1 major criterion — vasopressor; 3 minor — confusion, uraemia, hypotension
needing aggressive fluids).

## Scenario timeline and physiology

* **Triage (minute 0):** T 39.1 °C, HR 118, BP 84/48 (MAP 60), RR 28, SpO₂ 89 % on air, GCS 14; NEWS2 16.
* **Bedside monitor (`physiology.monitor`):** she reaches resus off the monitor; until `monitor` (or an arterial line,
  which is transduced on the bedside monitor) the bedside shows only that triage set, taken by hand (`spotChecks`:
  static, no alarm, no rhythm), plus GCS and pain. The SpO₂/BP alarms sound when the monitor goes on. Dopamine-induced
  AF is reported by the nurse as a sudden fast, completely irregular pulse (the monitor names the rhythm when it is on
  — the `monitor` response itself names none, since dopamine may already have changed it); the reassessment prompts,
  the perfusion re-examinations and the `vasopressor` decision ask for perfusion and a current blood pressure,
  pointing to the monitor only "once it is attached"; the oxygen responses give the device and the 94–98 % target,
  never a saturation reading; the nurse who holds the antibiotics "glances at the patient".
* **Untreated course (physiology trends):** SBP −0.15/min (floor −12) and DBP −0.08/min (floor −6) until antibiotics
  + ≥ 2 boluses; an additional "vasoplegia" trend (SBP −0.06/min, DBP −0.04/min) continues until norepinephrine
  starts; HR, RR and GCS drift (recovering after the bundle); SpO₂ falls until oxygen is given.
* **Fluids:** each 500 mL bolus gives a small persistent effect (+1.5/+0.5 mmHg, HR −2) and a transient one (+4/+2
  mmHg, HR −2, fading in two halves ~11 and ~19 min after the bolus so the monitor does not drop in one 4 mmHg step) —
  the learner sees a pressure that rises and then falls back, which is the cue to start norepinephrine. In the
  reference path MAP is ~61–65 mmHg at reassessment and ~68–74 mmHg once norepinephrine (+14/+8 mmHg) is running.
* **Norepinephrine titration:** `maxDoses: 3` — choosing norepinephrine again steps the rate up (+14/+8 mmHg each; the
  dose text says "titrate every 5–10 min to an initial MAP target of 65 mmHg", with the SSC 2026 range of 60–65 mmHg
  for adults aged 65 or over). The reference path needs one step; after late antibiotics (`reassess-late`, baseline
  BP 78/44) MAP stays ~56 mmHg on one step and needs two to reach target, so delay shows up as a higher vasopressor
  requirement instead of a dead end.
* **Oxygen:** target effects — nasal cannula 95 %, Venturi 0.40 97 %, reservoir mask 100 % (the rubric expects
  94–98 % at the end, so step down after a reservoir mask).
* **Scenario events:** cultures-before-antibiotics flag (`cultures-first` — only when no antibiotic of any kind, flag
  `any-abx`, has been given) or a nurse note when cultures follow an antibiotic (`cultures-after-abx`);
  CT-before-antibiotics warning; nurse prompt at 30 min without antibiotics; at 60 min without antibiotics a critical
  deterioration (`abx-late`, baseline BP 78/44, GCS 13); peri-arrest at 120 min with neither antibiotics nor
  norepinephrine; dopamine → atrial fibrillation; hydrocortisone before a vasopressor → pharmacist warning (narrated:
  the event sets `speaker: "narrator"`, as the runtime has no pharmacist voice for scenario lines); a 5th bolus →
  bilateral crackles (RR 32); ICU not called by 90 min → warning; entering `reassess-late` → nurse warning that
  perfusion is still poor.
* **Phase-dependent results:** `lactate-repeat` gives 5.1 mmol/L (rising) in `resus` and 3.6 mmol/L (≈ 22 % fall,
  still > 2 mmol/L) in `reassess` — a realistic fall for the ~30–60 simulated minutes the reassess phase represents;
  every other test also has a `reassess` result reflecting post-fluid dilution (e.g. Hb 118 g/L, albumin 29 g/L) so
  late orders never show "no record". `vbg-lactate@reassess` does not quote the arrival value (a learner whose first
  gas is taken after resuscitation never saw 4.6).
* **Delayed antibiotics (`reassess-late`):** every test has a result here too — copies of the `reassess` results
  except the gases (pH 7.29, pCO₂ 3.6 kPa / 27 mmHg, HCO₃⁻ 12.8, BE −12.3, **lactate 5.8 mmol/L, rising**), chemistry
  (HCO₃⁻ 13, AG 21, urea 12.9, creatinine 174 µmol/L), ECG (sinus tachycardia 126/min) and capillary glucose 11.9. The
  perfusion re-examination there is `ex-reassess-perfusion-late` (CRT ~5 s, mottling to mid-thigh, rousable only to
  voice). The objectives, `sepsis3` and the rubric accept either reassessment phase, so a learner who gave antibiotics
  late can still finish — with the penalties below.

## Decisions and assessment

**Objectives (chapters).** `obj-primary` (oxygen, monitor, IV access, general look, chest auscultation, perfusion) →
`obj-history` (fever, cough, chest pain, confusion, past history, medicines, allergies) → `obj-workup` (lactate read;
cultures, blood count, chemistry and chest film ordered) → `obj-hour1` (antibiotic timing and regimen decided; a
β-lactam plus atypical cover given; ≥ 3 boluses) → `obj-perfusion` (post-fluid perfusion reassessed, vasopressor
decided and norepinephrine started, lactate repeated in a reassessment phase, Sepsis-3 decided) → `obj-dispo` (chest
film read, CURB-65 decided, ICU referral). Hints coach (what to do and why) without stating an unobtained result.

**Decisions.** `abx-timing` (single; unlocks once the chest is auscultated **and** the lactate result is read,
because its stem cites the raised lactate), `abx-regimen` (select-all: ceftriaxone + azithromycin **and** ceftriaxone
+ moxifloxacin; its stem restates the allergy and recent-healthcare answers it requires, but not the
MRSA/*Pseudomonas* history, which only the unrequired records hold), `vasopressor` (single; unlocks after ≥ 3
boluses **and** the post-fluid perfusion re-examination, `ex-reassess-perfusion` or `-late`, because its stem is
"reassessing after the initial fluid boluses"; the correct option targets an initial MAP of 65 mmHg and its feedback
gives the SSC 2026 range of 60–65 mmHg at her age), `sepsis3` (single; unlocks after lactate, blood count, chemistry,
norepinephrine **and** a post-resuscitation lactate, because its feedback cites the platelets and the repeat
lactate), `curb65` (single). Every option has bilingual feedback. Answering is free and unlimited, so first-attempt
accuracy is scored (`r-dx` uses `decidedFirstTry: sepsis3`; `r-reasoning` needs `abx-timing`, `vasopressor` and
`curb65` right first time).

**Rubric** (deterministic total 21; two communication items judged by the examiner agent from the transcript).
Safety-critical items weigh most: antibiotics within the hour and avoiding harmful choices (3 each), then
norepinephrine first line and the key history (2 each).

| Item | Domain | Weight | Met when |
|---|---|---|---|
| `r-hx-key` | history | 2 | fever, cough, chest pain and confusion asked |
| `r-hx-safety` | history | 1 | allergies, regular medicines and recent admissions/antibiotics asked |
| `r-exam` | examination | 1 | chest auscultation, perfusion and neurological examination |
| `r-dx` | diagnosis | 1 | chest film read, chest auscultated, `sepsis3` right first time |
| `r-reasoning` | diagnosis | 1 | `abx-timing`, `vasopressor` and `curb65` right first time |
| `r-o2` | management | 1 | oxygen given and SpO₂ 94–98 % at the end |
| `r-lactate` | investigations | 1 | lactate read in `resus` and again in a reassessment phase |
| `r-cultures` | investigations | 1 | blood cultures before any antibiotic (`cultures-first`) |
| `r-abx-1h` | management | **3** | an effective antibiotic given and `abx-late` not set (within 60 min of resus); **critical** |
| `r-abx-regimen` | management | 1 | a β-lactam plus atypical cover |
| `r-fluids` | management | 1 | ≥ 3 boluses and a post-fluid perfusion reassessment |
| `r-norepi` | management | 2 | norepinephrine, and no dopamine |
| `r-safety` | safety | **3** | no fluid restriction, no antibiotic hold for CT and no CT before antibiotics, no intubation, no ward admission — scored once resuscitation has started (a bolus or an antibiotic) or one of these has happened |
| `r-med-safety` | safety | 1 | the home ibuprofen elicited and home medicines held |
| `r-icu` | efficiency | 1 | ICU referral within 90 min of resus |
| `r-comm-family` | communication | 1 (judged) | plain-language explanation, the husband at home, goals of care, teach-back |
| `r-comm-team` | communication | 1 (judged) | closed-loop orders and an SBAR handover to ICU |

**Wrong choices and the engine's response.**

| Choice | Engine response |
|---|---|
| Fluid restriction | `contraindicated` (always) |
| "Hold antibiotics until CT" | `contraindicated` while no antibiotic given; CT ordered first sets `ct-before-abx` |
| Dopamine | `contraindicated` (always); AF event |
| Hydrocortisone before norepinephrine | `neutral` (not a contraindication — corticosteroids are an adjunct in septic shock and severe CAP: SCCM 2024, ATS 2025); sets `steroid-before-pressor` and the pharmacist asks whether a vasopressor is starting. The trap "steroids *instead of* a vasopressor" is tested by the `vasopressor` decision |
| 5th bolus (> 2 L) | `contraindicated`; overload event on the 5th |
| Intubation (GCS ≥ 9 or no vasopressor) | `contraindicated`, BP drops on induction; she is then sedated and ventilated and cannot speak (`patient.nonVerbalWhen`), so her daughter answers the history |
| Azithromycin + moxifloxacin together | the second one is `contraindicated` (QT stacking) |
| Ward admission | `contraindicated` |
| Antibiotics after 60 min | `abx-late` (critical event, BP/GCS step down), `r-abx-1h` lost, case continues in `reassess-late` with a rising lactate |
| Antibiotic before blood cultures | `cultures-first` never set (`r-cultures` lost); nurse notes the lower yield |
| Moxifloxacin alone | treats physiologically (`abx-given`) but `obj-hour1` also needs a β-lactam (`beta-lactam-given`); `r-abx-regimen` lost |
| Azithromycin alone | not an effective regimen (sets only `atypical-cover`/`any-abx`): the hypotension trends continue and `abx-late` still fires at 60 min |
| Piperacillin–tazobactam, vancomycin | `neutral` with stewardship feedback (vancomycin alone does not count as an effective CAP antibiotic) |

**How paths score** (replayed with the engine on version 1.1.0; each path is the reference solution with the change
named, unless stated):

| Path | Score | Points lost |
|---|---|---|
| a. Reference path | 21/21 (100 %) | — |
| b. Antibiotics after 60 min (case continues in `reassess-late`; a second norepinephrine step) | 17/21 (81 %) | `r-abx-1h` 3, `r-icu` 1 (the delay also pushes the ICU call past 90 min) |
| c. Blood cultures after the first antibiotic | 20/21 (95 %) | `r-cultures` 1 |
| d. Chest CT ordered before antibiotics | 18/21 (86 %) | `r-safety` 3 |
| e. Dopamine before norepinephrine | 19/21 (90 %) | `r-norepi` 2 |
| f. Ward admission requested (then ICU) | 18/21 (86 %) | `r-safety` 3 |
| g. Fluid restriction ordered first | 18/21 (86 %) | `r-safety` 3 |
| h. Wrong first answer on every decision | 19/21 (90 %) | `r-dx` 1, `r-reasoning` 1 |
| i. Moxifloxacin alone (no β-lactam) | 20/21 (95 %); cannot finish (`obj-hour1` open) | `r-abx-regimen` 1 |
| j. Ibuprofen not asked, home medicines not held | 20/21 (95 %) | `r-med-safety` 1 |
| k. ICU called after 90 min | 20/21 (95 %) | `r-icu` 1 |
| l. Nothing done for 180 min | 0/18 (0 %); 0/6 objectives | everything; `r-safety` is not scored before resuscitation starts (3/21 in 1.1.0) |

## Reference path (`solution`)

69 steps, finishing at 80.5 simulated minutes with 6/6 objectives, 5/5 decisions, no rejections, no contraindicated
intervention, no critical alarm and 21/21. Monitor, nasal oxygen and IV access (minutes 1–3); general look, chest
auscultation and perfusion (4–6); venous gas with lactate, blood cultures, blood count, chemistry, liver tests,
CRP/PCT, clotting, capillary glucose, ECG and portable film ordered (6.5–11); first bolus (12); allergies, recent
healthcare and medicines asked; lactate read (14); `abx-timing` and `abx-regimen` decided; ceftriaxone (15) and
azithromycin (16) — cultures were taken at 7, before any antibiotic; second bolus (17); sputum and urinary antigens;
the rest of the history (fever, cough, chest pain, confusion, intake, past history, the ibuprofen, weight) and the
neurological examination; home medicines held (24); third bolus (25), which with the antibiotics enters `reassess`;
urinary catheter; chest film read (33); perfusion and lungs reassessed (MAP ~63 mmHg); `vasopressor` decided and
norepinephrine started (36); repeat lactate ordered and paracetamol given; fourth bolus (41); repeat lactate read
(3.6 mmol/L, 42.5); chemistry, liver tests and clotting read; `sepsis3` and `curb65` decided (51); ICU referral (52);
the remaining results read after 27 min; finish at 80.5 (MAP ~69 mmHg on one norepinephrine step).

## Clinical numbers check

Also machine-readable in `extensions.authorChecks`.

| Item | Value | Working |
|---|---|---|
| MAP / shock index (triage) | 60 mmHg / 1.4 | (84 + 2×48)/3; 118/84 |
| qSOFA | 3 | RR 28 ≥ 22; altered mentation (GCS 14); SBP 84 ≤ 100 |
| NEWS2 | 16 | RR 28 → 3; SpO₂ 89 % (scale 1) → 3; air → 0; SBP 84 → 3; HR 118 → 2; new confusion → 3; T 39.1 → 2 |
| CURB-65 | **4** | confusion; urea 11.8 mmol/L (> 7); SBP 84 (< 90); age 72; **RR 28 does not score** (< 30) |
| SOFA without the respiratory component | ≥ 5 | GCS 14 → 1; MAP < 70 → 1 (3 on norepinephrine ≤ 0.1 µg/kg/min); creatinine 156 µmol/L → 1; platelets 132 → 1; bilirubin 24 µmol/L → 1. No ABG, so P/F and respiratory SOFA are explicitly unknown |
| Anion gap (arrival) | 19 mmol/L; ≈ 21 albumin-corrected | 133 − (98 + 16); 19 + 0.25 × (40 − 32) |
| Delta ratio | ≈ 1.1 | (21 − 12)/(24 − 16) = 9/8 → pure high-AG metabolic acidosis |
| VBG (arrival) | pH 7.35, pCO₂ 3.9 kPa (29 mmHg), HCO₃⁻ 15.8, BE −8.7 | Henderson–Hasselbalch 0.0307 × 29 × 10^(7.35 − 6.1); Van Slyke |
| Winter's formula | expected arterial pCO₂ 32 ± 2 mmHg | 1.5 × 16 + 8; venous 29 mmHg (arterial lower still) → concurrent respiratory alkalosis |
| Repeat gases | 7.33/3.7 kPa → HCO₃⁻ 14.6, BE −10.1 (`resus`); 7.36/4.0 kPa (30 mmHg) → 16.8, −7.6 (`reassess`) | lactate 4.6 → 3.6 mmol/L, a 22 % fall, still > 2 |
| Post-resuscitation anion gap | 17; ≈ 20 albumin-corrected (29 g/L) | 134 − (100 + 17); the fall of ~1 matches the lactate fall of 1.0 |
| Delayed-antibiotic phase | pH 7.29, pCO₂ 27 mmHg (3.6 kPa) → HCO₃⁻ 12.8, BE −12.3; AG 21 (≈ 24 corrected); creatinine 174 µmol/L (2.2 × baseline, KDIGO 2); urea 12.9 mmol/L ≈ BUN 36 mg/dL; lactate 4.6 → 5.8 (+26 %) | Winter's expected arterial pCO₂ 27 ± 2 |
| Glucose-corrected sodium | ≈ 135 mmol/L | 133 + 0.288 × (10.8 − 5.6) (Katz ≈ 134.5; Hillier ≈ 135.3) |
| Renal | KDIGO stage 2; BUN ≈ 33 mg/dL; creatinine ≈ 1.76 mg/dL; Cockcroft–Gault ≈ 27 mL/min (unreliable in AKI); baseline eGFR (CKD-EPI 2021) ≈ 70 | 156/78 = 2.0; 11.8 × 2.8; 156/88.4; (140 − 72) × 60 × 0.85/(0.815 × 156) |
| Fluids | 30 mL/kg = 1800 mL; 3 boluses ≈ 25 mL/kg, 4 ≈ 33 mL/kg | 60 kg |
| Norepinephrine | 0.05 µg/kg/min = 3 µg/min ≈ 11 mL/h | 4 mg in 250 mL = 16 µg/mL |
| MAP target | initial 65 mmHg; 60–65 mmHg for adults ≥ 65 (SSC 2026) | start criterion stays MAP < 65 mmHg after fluids (Sepsis-3; Hour-1 bundle) |
| Urine output target | 30 mL/h | 0.5 mL/kg/h × 60 kg |
| 4AT | 7 | alertness 0 + AMT4 2 + attention 1 + acute change 4 |
| Blood count | MCHC 328 g/L; neutrophils 88.6 % | 128/0.39; 16.3/18.4 |
| ATS/IDSA severe CAP | 1 major (vasopressor) + 3 minor (confusion, BUN ≥ 20 mg/dL, hypotension needing aggressive fluids) | RR < 30, single lobe, WBC ≥ 4, platelets ≥ 100, T ≥ 36; P/F not available |

Units: SI throughout (kPa for gases with mmHg in parentheses; µmol/L, mmol/L, g/L, µg/L, ng/L); blood pressure in
mmHg. SOFA here is the original score that Sepsis-3 is built on; the SOFA-2 score (JAMA 2025) revises several
thresholds and is not used by the case.

## Facilitator notes

**Debrief questions (PEARLS order).**

1. *Reactions* — "How was that? What went through your mind when the nurse said she had been in resus for half an
   hour without antibiotics?"
2. *Description* — "Summarise her in two sentences: where was the infection, and what made this septic shock rather
   than sepsis?"
3. *Analysis*
   - "Her venous pH was 7.35. Why was that reassuring-looking number misleading?" (anion gap, Winter's formula, delta
     ratio)
   - "What did a pressure that rose after each bolus and then fell back tell you, and when did you decide that fluid
     alone was not enough?"
   - "Which MAP did you aim for? Why does SSC 2026 suggest 60–65 mmHg rather than higher for someone of 72?"
   - "Walk me through her CURB-65. Did the respiratory rate score?"
   - "Why ceftriaxone plus azithromycin — and why never azithromycin alone here?"
   - "Which of her home medicines did you stop, and why? How did you find out about the ibuprofen?"
   - "Where do steroids fit for her — adjunct or substitute?"
   - "What did you tell her daughter, and who is looking after her husband tonight?"
4. *Summary* — "What three things will you do in the first hour for the next patient with suspected septic shock?"

**Common learner errors and how the case surfaces them.**

| Error | How the case surfaces it |
|---|---|
| Waiting for a CT or the procalcitonin before antibiotics | "Hold antibiotics until CT" is contraindicated; a CT ordered first prompts the nurse's question and sets `ct-before-abx` (`r-safety`); `abx-timing` options b and c; the nurse prompts at 30 min; `abx-late` deteriorates her at 60 min |
| Antibiotic before cultures | the nurse's note on lower yield; `r-cultures` lost |
| Dopamine first line | contraindicated; atrial fibrillation; `r-norepi` lost |
| Open-ended boluses in a hypoxaemic pneumonia | the 5th bolus is contraindicated, with crackles and RR 32; `vasopressor` option c |
| Steroids instead of a vasopressor | the pharmacist's question (`ev-steroid-first`); `vasopressor` option d |
| Scoring the R in CURB-65 at RR 28 | `curb65` option b |
| Pre-Sepsis-3 thinking (SIRS, "severe sepsis", qSOFA as a diagnosis, lactate alone) | `sepsis3` options b–e |
| Missing the over-the-counter ibuprofen; continuing metformin | `hx-otc-ibuprofen` is a specific question; `r-med-safety` |
| Intubating unresuscitated shock | contraindicated; her pressure falls on induction |
| Ward admission | contraindicated; the ward calls back |
| Overshooting the MAP target in an older adult | the norepinephrine response and the `vasopressor` feedback give the SSC 2026 range (teaching only; not scored) |

**Teaching notes.**

* The daughter is the main historian (`persona.companion.answersHistory: true`), so button-style asks are spoken by
  the companion. Every answer labels its speakers — "（病人）…（女儿）…" / "(Patient) … (Daughter) …", the same
  convention as `persona.concerns` — so an authored answer reads correctly whichever agent voices it. The patient can
  name her symptoms but is disoriented (4AT 7); `hx-identity` (name, age, who the daughter is) and `hx-orientation`
  (thinks it is morning at the community clinic) keep those common questions out of the "we don't know" fallback.
* Timeline: confusion from ~15:00–16:00, another ibuprofen at ~17:00 because the daughter put it down to the fever,
  taxi in the evening, arrival 21:25 (`hx-course`); she had not seen a doctor for this illness (`hx-course`,
  `hx-recent-healthcare`).
* A repeat gas ordered as another VBG in a reassessment phase counts as the repeat lactate for `obj-perfusion` and
  `r-lactate` (the learner did repeat it); `assess()` still lists `lactate-repeat` under `essentialMissing` in that
  path because alternatives are not phase-aware.
* A near-normal venous pH hides a significant metabolic acidosis — use it to teach Winter's formula and the delta
  ratio.
* The transient bolus response is deliberate: ask "what does a pressure that rises and falls back tell you?" before
  the vasopressor decision.
* MAP target: the start criterion is MAP < 65 mmHg after fluids (Sepsis-3; Hour-1 bundle). SSC 2026 keeps an initial
  target of 65 mmHg (strong) and suggests 60–65 mmHg rather than higher for adults aged 65 or over (conditional, low
  certainty) — she is 72, so discuss avoiding excess vasopressor.
* Steroids: SSC 2021 suggests hydrocortisone 200 mg/day for an ongoing vasopressor requirement; the SCCM 2024 focused
  update suggests corticosteroids in septic shock (conditional) and recommends them in severe bacterial CAP (strong;
  CAPE COD excluded patients in septic shock); the ATS 2025 CAP guideline suggests systemic corticosteroids in severe
  CAP. Giving hydrocortisone early is therefore not scored as unsafe — the trap is steroids *instead of* a vasopressor.
* Macrolide resistance in *S. pneumoniae* is high in China: a macrolide is the partner to a β-lactam, never
  monotherapy.
* Communication items (`r-comm-family`, `r-comm-team`) are judged by the examiner agent from the transcript.

## Embodied mode

**Grounding (world policy).** In embodied mode a clinical act needs the kit it names at the bedside and IV access is
patient state (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8): the vasopressor infusions `norepinephrine` and
`dopamine` also require `iv-access` (the case's `iv-access` procedure first — the reference solution places it
first). Blood cultures and the other blood tests are drawn at the bedside: ordered there, or after the cannula and
bloods at a records terminal or a laboratory station (benchmark `workflow-sepsis-cultures-then-antibiotics`).

**Scope of practice.** `urinary-catheter` is authored `scope: "nursing"` (a delegated nurse may place it); the
arterial line and the intubation stay medical (docs/EMBODIED.md §8 scope of practice).

**Where the patient goes and how she looks.** `cxr` is `performedAt: "bedside"` (portable film in resus: nobody is
moved); the oxygen items name their `device` — `o2-nasal` nasal cannula, `o2-venturi` Venturi mask, `o2-nrb`
non-rebreather mask — so the patient shows the mask or cannulae actually given. The CT chest (`ct-chest`, not in the
reference path) needs the patient taken to CT in embodied mode.

**Facility requirements (capability vocabulary).** `cardiac-monitor`, `oxygen`, `iv-access`, `infusion-pump`,
`medications`, `airway`, `ventilator`, `point-of-care`, `lab-blood-gas`, `lab-hematology`, `lab-chemistry`,
`lab-microbiology`, `lab-urinalysis`, `xray`, `ct`, `ecg-12lead`, `ultrasound`, `records`; otoscopy uses the personal
kit. Waypoints also target `board`, `patient` and the `icu` room kind.

**Measured (offline autopilot, 2026-10-28).** `general-hospital` en and zh-CN: 21/21 (100 %), all six objectives,
81.7 simulated minutes; `teaching-hospital` en: 21/21 (100 %), 80.5 minutes; no contraindicated intervention and no
critical alarm in any run. The embodied score equals the clinical score (`embodied-autopilot.test.ts`).

## Fidelity limits

* The physiology is simplified (linear trends, instant offsets); the blood-pressure and lactate responses are
  illustrative; time is compressed (the reassessment phase stands for the state roughly an hour later).
* Norepinephrine is a fixed step (+14/+8 mmHg each time it is chosen, up to three) with no down-titration: on the
  reference path the MAP settles at ~68–74 mmHg, a little above the 60–65 mmHg that SSC 2026 suggests at her age. Ask how
  they would titrate down; the engine does not score the MAP reached.
* Venous gases only (no arterial sample), so the P/F ratio and respiratory SOFA are unknown.
* No final blood-culture result exists for the ED phase; the ICU course and outcome are not simulated.
* `r-safety` is "no harmful choice". Since 1.1.1 it counts only once resuscitation has started or a harmful choice has
  been made (`scoredWhen`), so a learner who does nothing no longer keeps its 3 points (path l: 0/18, was 3/21).
* `assess()` alternatives are not phase-aware (the `essentialMissing` note above).
* Local antibiograms, drug formulations (e.g. norepinephrine labelled as base or salt) and protocols differ — follow
  local guidance.

## Matcher notes

* Short Chinese questions are scored by longest common substring, so generic frames ("有没有…", "…有没有问题",
  "什么时候…的", "…多少") used to select unrelated items ("有没有心慌？" answered with the haemoptysis fact). Questions and
  keywords were rephrased so no content-free frame selects an item, except where the frame itself carries the topic
  ("哪里…" → the only pain is chest pain; "家里人有没有…" → family history).
* The required `ex-neuro` takes 神志 / 意识 / 清醒 and "conscious level" ("查一下神志" found nothing before); it excludes
  补液后 / 复评 / reassess so the post-fluid reassessment still reaches `ex-reassess-perfusion`.
* `excludeKeywords` separate look-alike items: cough vs haemoptysis/pain, intake vs urinary symptoms ("小便疼") and
  diabetes ("糖尿"), regular vs fever medicines, the patient's own vs family history. `hx-pmh` takes the common
  以前有什么病 / 有什么病 (and excludes 家里有人 / 家里其他人, so a family question stays family history).
* The "hold home medicines" intervention names the drug classes unsafe in shock and AKI (antihypertensives, ACE
  inhibitors/ARBs, diuretics, biguanides; avoid NSAIDs), not her own metformin, amlodipine or ibuprofen: those are
  history to elicit (the ibuprofen is a `specific` item). Its `response` names what is held.
* History also covers focal neurological symptoms (`hx-neuro-sx`), palpitations/dizziness/syncope (`hx-cvs-sx`) and
  flu-like symptoms (`hx-flu-sx`); `hx-pmh` states no stroke, cancer or immunosuppression and her home glucose
  monitoring; `hx-rigors` mentions the sweats.
* Version 1.1.0 changed no history answer, keyword, alias or name, so the grounding benchmark is unchanged for this
  case (see Validation).

## References

The case's `debrief.references` (one Vancouver string each). DOIs were verified on 2026-10-28 by web search, each
returning the publisher's, PubMed's or the journal's record for that DOI with matching title, journal, volume and
pages (the Crossref API, doi.org and PubMed hosts were not reachable from the editing session). No DOI is given where
none could be verified.

1. Singer M, Deutschman CS, Seymour CW, et al. The Third International Consensus Definitions for Sepsis and Septic
   Shock (Sepsis-3). JAMA. 2016;315(8):801-810. doi:10.1001/jama.2016.0287
2. Evans L, Rhodes A, Alhazzani W, et al. Surviving Sepsis Campaign: international guidelines for management of
   sepsis and septic shock 2021. Crit Care Med. 2021;49(11):e1063-e1143. doi:10.1097/CCM.0000000000005337. Also
   published in: Intensive Care Med. 2021;47(11):1181-1247. doi:10.1007/s00134-021-06506-y
3. Prescott HC, Antonelli M, Alhazzani W, et al. Surviving Sepsis Campaign: international guidelines for management of
   sepsis and septic shock 2026. Crit Care Med. 2026. doi:10.1097/CCM.0000000000007075. Also published in: Intensive
   Care Med. 2026. doi:10.1007/s00134-026-08361-1
4. Levy MM, Evans LE, Rhodes A. The Surviving Sepsis Campaign bundle: 2018 update. Crit Care Med.
   2018;46(6):997-1000. doi:10.1097/CCM.0000000000003119
5. Chaudhuri D, Nei AM, Rochwerg B, et al. 2024 focused update: guidelines on use of corticosteroids in sepsis, acute
   respiratory distress syndrome, and community-acquired pneumonia. Crit Care Med. 2024;52(5):e219-e233.
   doi:10.1097/CCM.0000000000006172
6. Metlay JP, Waterer GW, Long AC, et al. Diagnosis and treatment of adults with community-acquired pneumonia. An
   official clinical practice guideline of the American Thoracic Society and Infectious Diseases Society of America.
   Am J Respir Crit Care Med. 2019;200(7):e45-e67. doi:10.1164/rccm.201908-1581ST
7. Jones BE, Ramirez JA, Oren E, et al. Diagnosis and management of community-acquired pneumonia: an official
   American Thoracic Society clinical practice guideline. Am J Respir Crit Care Med. 2025;212(1):24-44.
   doi:10.1164/rccm.202507-1692ST
8. Martin-Loeches I, Torres A, Nagavci B, et al. ERS/ESICM/ESCMID/ALAT guidelines for the management of severe
   community-acquired pneumonia. Intensive Care Med. 2023;49:615-632. doi:10.1007/s00134-023-07033-8
9. 中华医学会呼吸病学分会. 中国成人社区获得性肺炎诊断和治疗指南（2016年版）. 中华结核和呼吸杂志. 2016;39(4):253-279.
10. 中国医师协会急诊医师分会, 中国研究型医院学会休克与脓毒症专业委员会. 中国脓毒症/脓毒性休克急诊治疗指南（2018）. 临床急诊杂志.
    2018;19(9):567-588. doi:10.13201/j.issn.1009-5918.2018.09.001
11. O'Driscoll BR, Howard LS, Earis J, Mak V. BTS guideline for oxygen use in adults in healthcare and emergency
    settings. Thorax. 2017;72(Suppl 1):ii1-ii90. doi:10.1136/thoraxjnl-2016-209729
12. Kidney Disease: Improving Global Outcomes (KDIGO) Acute Kidney Injury Work Group. KDIGO clinical practice guideline
    for acute kidney injury. Kidney Int Suppl. 2012;2(1):1-138. doi:10.1038/kisup.2012.1
13. Dequin PF, Meziani F, Quenot JP, et al. Hydrocortisone in severe community-acquired pneumonia. N Engl J Med.
    2023;388(21):1931-1941. doi:10.1056/NEJMoa2215145
14. Lim WS, van der Eerden MM, Laing R, et al. Defining community acquired pneumonia severity on presentation to
    hospital: an international derivation and validation study. Thorax. 2003;58(5):377-382.
    doi:10.1136/thorax.58.5.377
15. Royal College of Physicians. National Early Warning Score (NEWS) 2: standardising the assessment of acute-illness
    severity in the NHS. London: RCP; 2017.
16. Bellelli G, Morandi A, Davis DH, et al. Validation of the 4AT, a new instrument for rapid delirium screening: a
    study in 234 hospitalised older people. Age Ageing. 2014;43(4):496-502. doi:10.1093/ageing/afu021

Ref. 13 is the CAPE COD trial; ref. 14 derives CURB-65.

### To verify

- **SSC 2026 bibliographic details** (ref. 3): only the two DOIs, the authors and the March 2026 publication were
  verified; volume, issue and pages are not given.
- **SSC 2026 on corticosteroids.** Secondary summaries say SSC 2026 now suggests IV corticosteroids for adults with
  septic shock without the 2021 vasopressor-dose threshold. The case cites SCCM 2024 and ATS 2025 (verified) and gives
  the threshold as SSC 2021's; check the primary SSC 2026 wording, strength and dose before citing it.
- **SSC 2026 on the other points the case still attributes to SSC 2021** — procalcitonin not to decide when to start
  antibiotics, the 3-hour window for possible sepsis without shock, a peripheral vasopressor start (secondary sources
  say it is kept), arterial monitoring (secondary sources say invasive or non-invasive monitoring is now acceptable),
  balanced crystalloids (reported as upgraded) and the vasopressin threshold.
- **ATS 2025 CAP** (ref. 7): one source dates the print issue January 2026; the citation follows volume 212 (2025).
- **ERS/ESICM 2023** (ref. 8): the issue number was not verified, so it is cited without one.
- **Chinese CAP guideline 2016** (ref. 9): DOI not verified, so not given; no newer adult edition was found.
- **Chinese emergency sepsis guideline 2018** (ref. 10): cited from 临床急诊杂志; a parallel printing elsewhere was not
  confirmed.
- **SOFA-2** (JAMA 2025): whether the debrief should show the SOFA-2 count beside the original SOFA.

## Changelog

### 1.1.1 — 2026-10-28 (assessment integrity; no speech after intubation)

- **`r-safety` counts only once the harm was possible** (`scoredWhen`): once resuscitation has started (a fluid bolus
  or an antibiotic) or a harmful choice has been made. Doing nothing kept its 3 points (path l, 3/21) and now scores
  0/18; the reference path keeps 21/21 and every other path in the table scores as before.
- `r-abx-1h` is **critical** (`critical: true`): antibiotics missed or given after 60 min are named first in the
  debrief (no score cap).
- **She cannot speak once intubated.** `patient.nonVerbalWhen: { "intervened": "intubation" }` with the reason
  "intubated, sedated and on mechanical ventilation after rapid-sequence induction": after the (contraindicated)
  intubation her daughter answers the history, and the patient's own words are never voiced.
- Matcher corpus: one `extensions.testUtterances` entry that repeated its item's canonical question is now a
  paraphrase (`cases validate --strict`); no history item, answer or keyword changed.

### 1.1.0 — 2026-10-28 (editorial review)

- **MAP target updated to SSC 2026.** SSC 2026 keeps an initial MAP target of 65 mmHg and suggests 60–65 mmHg for
  adults aged 65 or over (she is 72). The `vasopressor` correct option now reads "targeting an initial MAP of 65 mmHg"
  (was "target MAP ≥ 65 mmHg") and its feedback gives the age range; the norepinephrine dose and response, the ICU
  registrar's handover request, the debrief conclusion, the fluids-and-pressors key reasoning, the bundle teaching
  point and the attending's brief say the same, and the norepinephrine response asks for a step up when the MAP is
  "below target" (was "< 65 mmHg"). The start criterion (MAP < 65 mmHg after fluids) and the Sepsis-3 definition are
  unchanged.
- **Corticosteroids framed as an adjunct, to current guidance.** The `vasopressor` option d feedback, the
  hydrocortisone response, the pharmacist's and ICU registrar's briefs and the teaching point now cite the SCCM 2024
  focused update (suggested in septic shock, recommended in severe bacterial CAP) and the ATS 2025 CAP guideline
  (suggested in severe CAP); the norepinephrine ≥ 0.25 µg/kg/min threshold is given as SSC 2021's. Hydrocortisone
  stays `neutral` in the engine.
- **SSC 2026 cited where it was verified to keep the recommendation:** antibiotics immediately, ideally within 1 hour,
  in possible septic shock (`abx-timing` option a); qSOFA not as a single screening tool, NEWS/NEWS2, MEWS or SIRS
  preferred (`sepsis3` option c, scores teaching point); at least 30 mL/kg within 3 hours (bundle teaching point,
  attending brief). The 3-hour window (`abx-timing` option d) is now attributed to SSC 2021.
- **Provenance.** The notes no longer say the case was written by clinician-educators; `provenance.review`
  (`editorial`) added.
- **Safety items weigh most.** `r-abx-1h` 2 → 3 and `r-safety` 2 → 3 (deterministic total 19 → 21); the reference
  path stays at 100 % and the path table above was replayed with the engine.
- **Teaching points** each name their guidance (SSC 2018/2021/2026, SCCM 2024, ATS 2025, BTS 2017, KDIGO 2012, SSC
  2021 on goals of care).
- **References** normalised to one Vancouver string each, with DOIs verified; added SSC 2026 and ATS 2025; the 2018
  Chinese emergency sepsis guideline now names its journal.
- New `learningOutcomes` (6); `extensions.authorChecks` gains `map_target_ssc2026` and `rubric_weights`; version
  1.0.0 → 1.1.0.
- README restructured to the facilitator-guide template (PEARLS debrief, common errors, rubric and path tables,
  fidelity limits, Chinese summary); embodied scores measured.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/septic-shock-cap/case.json
npm run -s cc -- cases verify septic-shock-cap      # reference solution: 6 objectives, 5 decisions, 21/21
npm run -s cc -- exec --autopilot --embodied --case septic-shock-cap --facility general-hospital --provider offline --approval bypass -q "manage the patient"
npx vitest run packages/agent/src/session/embodied-autopilot.test.ts
npm run -s cc -- bench grounding --split dev && npm run -s cc -- bench grounding --split test --failures 0
```

On 2026-10-28 (version 1.1.0): validate 0 errors, 0 warnings; verify passes — 69 steps, objectives 6/6, decisions 5/5,
86/86 matcher test utterances (zh-CN + en, including colloquial Chinese, typos and abbreviations; each returns the
expected history item as the top `matchHistory` hit and is selected under the patient pipeline's ≥ 0.55 rule); the
reference path scores 21/21 with no rejections, no contraindicated intervention and no critical alarm. Grounding
benchmark for this case unchanged from the baseline: dev 87/91, test 79/86, no item lost or gained.

## 中文摘要

**病例概要。** 72岁女性，退休小学教师，平素生活完全自理；发热、寒战2天，咳嗽、咳铁锈色痰，昨日起右侧胸膜性胸痛，今日下午起意识模糊，女儿
以为是发烧所致，17时左右又给她吃了一次布洛芬，夜间打车送到急诊抢救室。分诊（未吸氧）：T 39.1 ℃，HR 118次/分，BP 84/48 mmHg
（MAP 60），RR 28次/分，SpO₂ 89%，GCS 14；NEWS2 16分，qSOFA 3分。诊断为**右下叶社区获得性肺炎（肺炎链球菌可能性大）合并脓毒性
休克**（Sepsis-3：初始补液后仍需去甲肾上腺素维持MAP ≥ 65 mmHg，乳酸4.6 → 3.6 mmol/L），伴急性肾损伤KDIGO 2期、脓毒症相关谵妄
（4AT 7分）和低氧血症；CURB-65 4分（RR 28不计分），符合ATS/IDSA重症CAP。

**学习目标。**

1. 依据Sepsis-3识别老年患者的脓毒性休克，并把qSOFA和NEWS2当作预警工具而非诊断标准。
2. 不延误治疗地留取两套血培养，识别休克后1小时内静脉给予β-内酰胺联合大环内酯（或呼吸喹诺酮）。
3. 平衡晶体液每次500 mL分次推注、逐步达到约30 mL/kg并反复复评；MAP仍<65 mmHg时外周起始去甲肾上腺素，初始目标MAP 65 mmHg
   （SSC 2026：≥65岁成人60–65 mmHg）。
4. 到院即测乳酸、复苏后复查，并用阴离子间隙、Winter公式和Δ比值解读接近正常的静脉pH。
5. 用就诊时数据计算CURB-65，运用ATS/IDSA重症CAP标准，以SBAR向ICU交班。
6. 休克合并AKI时保障用药安全：问出自行服用的布洛芬，暂停二甲双胍、降压药和NSAIDs，用大环内酯或喹诺酮前查看QTc，首剂抗菌药物足量。

**关键决策。** 抗菌药物时机（先留培养、不延误，1小时内用药；不因CT或PCT而等待）；经验性方案（头孢曲松+阿奇霉素，或头孢曲松+
莫西沙星；我国肺炎链球菌大环内酯耐药率高，不单用大环内酯）；升压策略（补液后MAP仍<65 mmHg时经外周起始去甲肾上腺素，不用多巴胺，
不以激素代替升压药；初始目标65 mmHg，她已72岁，60–65 mmHg即可）；Sepsis-3分类（脓毒性休克）；CURB-65（4分）与收入ICU。抗菌
药物超过60分钟才给时进入“延迟抗菌后再评估”阶段（复查乳酸5.8 mmol/L、不降反升）。评分：确定性总分21分，抗菌药物1小时内和避免
有害选择各3分（安全项权重最高），另有2项由考官智能体评判的沟通项。

**复盘要点（PEARLS）。** 先谈感受，再请学员用两句话概括病情；分析时围绕：看似正常的静脉pH为何具有误导性；推注后血压“升了又
回落”意味着什么、何时开始升压药；她的MAP目标为何可以是60–65 mmHg（SSC 2026）；CURB-65的R项是否计分；为何不单用阿奇霉素；
停用了哪些家庭用药；激素是辅助治疗而非替代升压药（SCCM 2024、ATS 2025）；如何与女儿沟通病情、治疗目标和在家的父亲。最后请学员
总结下一位疑似脓毒性休克患者第一小时要做的三件事。所有数值均为虚构，并已核对阴离子间隙、校正钠、MAP、血气代偿和各项评分的一致性。
