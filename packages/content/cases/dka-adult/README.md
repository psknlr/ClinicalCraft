# dka-adult — Vomiting, abdominal pain and fast breathing · 24-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners
> should open the case from the case library, where the title, summary, tags,
> triage note and objective titles give nothing away.

**Synthetic case.** This is a fictional teaching case written for ClinicalCraft.
It is not based on any real patient. Every name is a pseudonym (林晓雯（化名）/
Lin Xiaowen; her roommate 周婷（化名）/ Zhou Ting; all staff names), and every
number was written for teaching and checked for internal consistency. It is not
medical advice: 虚构教学病例，不构成医疗建议 / Fictional teaching case — not
medical advice.

## Case card

| | |
|---|---|
| id / version | `dka-adult` / `1.1.1` |
| setting / facility | `emergency` (resus bay 1, managed to HDU/ICU level 2) / `general-hospital` |
| specialty | emergency medicine, endocrinology, critical care |
| difficulty | 3 / 5 |
| estimated time | 45 min of learner time; about 11 simulated hours on the case clock (the reference path finishes at minute 656) |
| languages | `zh-CN` (source), `en` |
| review status | `editorial` — AI-assisted editorial review against the guidance below (2026-10-28); **not yet reviewed by a licensed clinician**: have a diabetologist or acute physician review it before teaching use |
| phases | `resus` → `k-replete` → `glucose-lt14` → `resolution` (all automatic, not learner-switchable) |
| clock | simulated, starts 02:40, `realtimeScale` 2, limit 1080 min (18 h). Costs: ask 0.5, examine 1, order 0.5, read 0.5, intervene 1 min. Learners use **wait** (`advance-time`, ≤ 240 min per call) to let hours pass. |
| content | 42 history items (3 `unknown`, 9 required; 7 arrival-state items limited to `resus`/`k-replete`, 2 later-phase status items), 18 exam findings (2 phase-restricted reassessments), 16 investigations, 27 interventions, 6 objectives, 5 decisions, 15 rubric items (14 deterministic + 1 examiner-judged), 6 NPC briefs, 6 learning outcomes, 89 matcher test utterances |

## Learning outcomes

After the case the learner can:

1. Confirm DKA within 15 minutes of arrival from capillary glucose, blood
   β-hydroxybutyrate and a venous gas, and grade its severity and the level of
   care against the 2024 consensus bands and the JBDS level-2 markers.
2. Start isotonic crystalloid within 30 minutes and, with an admission K⁺ below
   3.5 mmol/L, hold insulin and replace potassium by volumetric pump on
   continuous ECG monitoring until K⁺ is at least 3.5 mmol/L.
3. Once potassium allows, prescribe a weight-based fixed-rate IV insulin
   infusion (0.1 U/kg/h, no bolus), remove the failed pump and set up hourly
   monitoring with its targets (ketones falling ≥ 0.5 mmol/L/h).
4. When glucose falls below 14 mmol/L, add 10% glucose and keep the IV insulin
   running — reduced to 0.05 U/kg/h under the 2024 consensus — until the
   ketoacidosis has resolved, without hypoglycaemia.
5. Judge resolution by ketones < 0.6 mmol/L and venous pH > 7.3 (or HCO₃⁻
   ≥ 18 mmol/L), not by glucose, and give subcutaneous basal–bolus insulin with
   a 1–2 h overlap before stopping the IV infusion.
6. Identify the precipitants (occluded pump set, insulin omitted during
   illness, gastroenteritis), avoid harmful or low-value treatment (bicarbonate
   at pH ≥ 7.0, a KCl push, an insulin bolus, routine phosphate or
   antibiotics), and teach sick-day and pump-failure rules.

These are the case's `learningOutcomes` (shown on the case card and in the
debrief); the six HUD `objectives` below are the in-game task list.

## Clinical summary

A 24-year-old graduate student with type 1 diabetes since age 11 uses an insulin
pump (aspart). During a bout of probable viral gastroenteritis (her roommate had
the same illness) her infusion set kinked and occluded. She cleared the repeated
"occlusion" alarms and never changed the 4-day-old set. Believing "no food, no
insulin", she also stopped her meal and correction boluses. About 27 hours
after the first occlusion alarm her roommate brings her to the ED at 02:40 with
thirst, polyuria, vomiting, abdominal pain, Kussmaul breathing and ketotic
breath.

**Diagnosis: severe diabetic ketoacidosis with admission hypokalaemia.**

- Capillary glucose 28.0 mmol/L; β-hydroxybutyrate 5.8 mmol/L; venous pH 7.08,
  pCO₂ 3.26 kPa, HCO₃⁻ 7.0 mmol/L, anion gap 26; Na⁺ 131 (corrected about
  137.5–140.8), K⁺ 3.2 mmol/L; lactate 2.1.
- ECG: sinus tachycardia 118/min, flat T waves, minor ST depression and U waves
  (hypokalaemia).
- WBC 16.8 and amylase 148 U/L are non-specific; lipase 42 U/L is normal, urine
  hCG negative, urine clean, chest film clear.
- Severity: pH and ketones are in the 2024 consensus' moderate band, the
  bicarbonate (< 10 mmol/L) in its severe band; JBDS level-2 markers (admission
  K⁺ < 3.5, HR > 100, anion gap > 16) → HDU care.
- Key safety point: **insulin waits until K⁺ is ≥ 3.5 mmol/L**; potassium is
  replaced first.

## Scenario timeline and physiology

Baseline: HR 118 sinus tachycardia, BP 100/60 (MAP 73), RR 28 (Kussmaul), SpO₂ 99%
on air, T 37.4 °C, GCS 15, capillary glucose 28.0 mmol/L, pain 6/10. The ECG
overlay shows ST depression (hypokalaemia). Default adult alarm limits apply.

**Bedside monitor (`physiology.monitor`).** She is not on the monitor at triage:
until `cardiac-monitoring` is given the bedside shows only the triage set taken
by hand (HR 118, BP 100/60, RR 28, SpO₂ 99 %, T 37.4 °C — `spotChecks`, static,
no alarm, no rhythm) plus GCS and pain; the nurse handover says the triage set
was measured by hand before any monitor. RR 28 alarms (warning) as soon as the
monitor is attached; glucose 28 is shown with the bedside observations once the
capillary glucose has been read (`revealedBy`) — called through by the nurse as a
critical result — and alarms (critical) only on the monitor. The
insulin-before-potassium crash is a "Monitor alarm" (ectopics, a 6-beat run of
VT) only on the monitor (`ev-k-crash`); without one it is what she and the nurse
feel — racing, skipping heart, weak legs, a fast irregular pulse — with the same
K⁺ 2.6 gas (`ev-k-crash-unmonitored`). Both set `k-crash` and HR 130 and guard on
it, so attaching the monitor later never fires the other. The bicarbonate and
"potassium settles it" lines talk about the pulse and ectopics, not the screen.

| Element | Behaviour |
|---|---|
| Untreated trends | HR +0.05/min (to +8), SBP −0.08/min (to −8), DBP −0.04/min (to −4) until fluids start. RR +0.02/min (to +4) and GCS −0.01/min from minute 60 (to −2) until insulin runs. Glucose +0.01/min (to +2) until fluids or insulin. With no fluids by minute 45, `ev-no-fluids-45` warns and resets the baseline to HR 122, BP 96/57. Untreated for 4 h: HR 128, BP 86/53, RR 32, GCS 13. |
| First litre (`nacl-1l-1h` or `balanced-1l-1h`) | HR −8, SBP +8, DBP +4, RR −1, glucose −2 over about 1 h. Giving both counts as unsafe (excess fluid, age 18–25). |
| `kcl-replacement` | 0.9% NaCl + KCl 40 mmol/L at 500 mL/h (KCl 20 mmol/h). It is indicated once K⁺ is known and unsafe if no K⁺ result has been read. It sets `k-replacing`, which starts the `k-replete` phase clock. |
| `k-replete` phase | Entered at minute 75 if potassium started within 30 min. If it started later, the `k-late-*` events (every 30 min to minute 180, then every 60 min to minute 600) place entry 45 min after the end of the window in which potassium started, so it runs for 45–105 min before the K⁺ 3.7 snapshot. If insulin was given before potassium, entry waits until minute ≥ 180. |
| `friii` 0.1 U/kg/h | Glucose −24 over about 410 min (≈ 3.5 mmol/L/h). RR −11 and HR −20 over 600 min, BP +4/+2, pain −4. It is **contraindicated in `resus`** (K⁺ 3.2) and indicated after the `k-replete` potassium is read. |
| `ev-insulin-before-k` → `ev-k-crash` | Insulin in `resus` sets `insulin-before-k`. When glucose reaches ≤ 23 (about 1 h later), there are multifocal ectopics, a 6-beat run of VT, leg weakness and an urgent gas with K⁺ 2.6 mmol/L. HR is reset to 130; `ev-k-crash-settles` resets it to 118 once `k-replete` is reached. |
| `ev-glucose-14` → `glucose-lt14` phase | Fires once on insulin when glucose is < 14 (about minute 290). It latches the `glucose-below-14` flag. The phase is entered only from `k-replete` (so insulin given without any potassium never shows the replaced-K⁺ snapshots); if glucose fell below 14 earlier, the phase follows immediately once `k-replete` is reached. Rhythm/ECG are then set to sinus/normal. |
| `dextrose-10` | Glucose +11 over 180 min. With insulin running, this holds glucose at about 11–13 mmol/L. It is unsafe while glucose is still ≥ 14 before `glucose-below-14`. Its response states the insulin step that goes with it (2024 consensus: reduce to 0.05 U/kg/h = 2.75 mL/h; JBDS: consider); the model does not change the insulin effect (see Fidelity limits). Without it, glucose falls below 4 mmol/L at about minute 470 (≈ 6.5 h after insulin starts) and keeps falling: `ev-hypoglycaemia` fires with a critical alarm, `ev-severe-hypo` (glucose ≤ 2.5) drops GCS to 12, and `ev-hypo-recovered` restores GCS 15 once glucose is back ≥ 5. |
| `ev-dka-resolved` → `resolution` phase | Fires on insulin, after glucose < 14, once the noise-free RR is ≤ 18 (about minute 580, ≈ 9.6 h). This is the case's surrogate for the acidosis clearing. The phase is entered only from `glucose-lt14`. |
| `stop-friii` | Indicated only in `resolution` after `sc-insulin-transition`. Otherwise it is contraindicated, and (if the infusion was actually running) `ev-friii-stopped-no-overlap` warns that she has no insulin on board. |
| Staff prompts | Nurse: `ev-insulin-ready` at minute 12 (the insulin is made up; a tempting trap), `ev-k-late-30`, `ev-no-fluids-45`, `ev-k-recheck-due`, `ev-bicarbonate`. Attending: `ev-no-insulin-3h` (narrated, `speaker: "narrator"`, because the runtime has no attending voice for scenario lines). |
| Rubric flags | `early-workup` (glucose, ketones and VBG read by minute 15) and `fluids-by-30`. |

## Decisions and assessment

### Objectives (HUD task list)

| id | completes when |
|---|---|
| `obj1-initial` | monitor attached; onset/course and thirst/polyuria asked; general inspection and breathing pattern examined; capillary glucose read in `resus` |
| `obj2-diagnosis` | VBG and ketones read in `resus`; `dx-severity` answered; HDU referral |
| `obj3-resus` | first litre given; ECG read in `resus`; `k-sequencing` answered; potassium running |
| `obj4-definitive` | repeat VBG or chemistry read in `k-replete`; FRIII; monitoring plan; `precipitant` answered |
| `obj5-adjust` | glucose < 14 mmol/L; 10% glucose; `glucose-falling` answered |
| `obj6-transition` | VBG and ketones read in `resolution`; `resolution-transition` answered; SC insulin; FRIII stopped; diabetes-team referral |

The hints coach without stating results ("which treatment would drive the
potassium down further?", "which number recovers first?").

### Decisions

- `dx-severity`: severe DKA (HCO₃⁻ < 10 mmol/L) needing level-2 care. The
  distractors are moderate DKA by pH, HHS, mixed DKA–HHS,
  starvation/alcoholic ketoacidosis, euglycaemic DKA and lactic acidosis.
- `k-sequencing`: hold insulin, give KCl 10–20 mmol/h on the monitor, recheck
  hourly, and start FRIII at K⁺ ≥ 3.5. The distractors are insulin now,
  bolus + infusion, bicarbonate first, KCl push, and waiting for the formal lab K⁺.
- `precipitant` (select all): occluded pump set, omitted insulin during illness,
  gastroenteritis. The distractors are pancreatitis, pregnancy, UTI and an SGLT2
  inhibitor.
- `glucose-falling`: add 10% glucose 125 mL/h and keep the IV insulin running,
  reduced to 0.05 U/kg/h, until resolution (2024 consensus; JBDS advises
  considering the reduction, and keeping 0.1 U/kg/h with the glucose is also
  within JBDS — the feedback says so). The distractors are stopping insulin,
  switching to SC, cutting to 0.02 U/kg/h without glucose, or carrying on
  unchanged.
- `resolution-transition` (select all): the resolution criteria are met; she is
  eating; SC basal + meal-time insulin with a 1–2 h overlap; diabetes-team
  review. The distractors are glucose < 11 as the criterion, stopping first,
  and waiting for HCO₃⁻ > 22.

### Rubric (deterministic items, total weight 16)

| id | domain | weight | met when |
|---|---|---:|---|
| `r-hx-precipitant` | history | 1 | pump failure and omitted insulin asked |
| `r-hx-safety` | history | 1 | allergies, medicines, LMP/pregnancy asked |
| `r-ex-core` | examination | 1 | breathing pattern, hydration, abdomen, pump site |
| `r-inv-early` | investigations | 1 | glucose, ketones and VBG read by minute 15 |
| `r-inv-ecg-hcg` | investigations | 1 | ECG read in `resus` and urine hCG read |
| `r-dx` | diagnosis | 1 | `dx-severity` right first time and `precipitant` answered |
| `r-mx-fluids` | management | 1 | fluids started by minute 30 |
| `r-safety-k-first` | safety | **2** | potassium before insulin, insulin only after the repeat K⁺; **critical** |
| `r-mx-friii` | management | 1 | FRIII without a bolus |
| `r-mx-dextrose` | management | 1 | 10% glucose given, no hypoglycaemia |
| `r-mx-level-monitoring` | management | 1 | HDU referral and hourly monitoring plan |
| `r-safety-avoid` | safety | **2** | no bicarbonate, no KCl push (a never event), no insulin through the old pump set — scored once treatment has started (fluids, potassium or insulin) or one of these is given |
| `r-transition` | management | 1 | SC insulin before stopping FRIII, no gap, diabetes team |
| `r-efficiency` | efficiency | 1 | no ABG, CT abdomen or empirical antibiotics — scored once the severity decision is reached or one of them is ordered or given |
| `r-comm` | communication | — | examiner-judged: blame-free explanation, ICE, sick-day rules, SBAR handover |

### How wrong choices score

The percentage comes from the weighted deterministic rubric. A contraindicated
step is also recorded as a **safety event** and listed in the debrief, and the
patient's critical episodes are counted, separately from the percentage.
Decisions are scored on the first attempt (`decidedFirstTry` for `dx-severity`
in `r-dx`); every option has feedback.

Tempting wrong choices the case lets the learner make:

- insulin before potassium, or an IV insulin bolus
- a correction bolus through her own (occluded) pump
- sodium bicarbonate or a KCl IV push
- "blind" potassium before any K⁺ result
- phosphate, ceftriaxone, oxygen, a urinary catheter or a 500 mL bolus while normotensive
- general-ward admission
- stopping FRIII without SC insulin
- a 20% glucose bolus when glucose is not low, or 10% glucose before glucose has fallen below 14
- ABG or CT abdomen

## Reference path (`solution`)

Minute-checked by replaying the solution through the engine (85 steps).

- **0–9 min:** monitor and two IV lines; capillary glucose, ketones and a VBG
  ordered; the first litre of 0.9% saline starts at minute 3.5; onset and thirst
  history, general inspection and breathing pattern. Results read: glucose at 6,
  ketones at 6.5, VBG at 9.
- **Minutes 9–12:** ECG, chemistry, FBC, hCG, urinalysis and lipase ordered.
- **Minute 12:** `dx-severity` and `k-sequencing` decisions.
- **Minutes 12–15:** KCl 20 mmol/h, HDU referral, pump removed.
- **Then:** ECG read; hydration, abdomen and pump site examined; hCG and
  urinalysis read; ondansetron; monitoring plan; the remaining focused history
  (pain, pump, omitted insulin, set, PMH, meds, allergies, LMP, contacts, ICE).
- **Wait to minute 57:** FBC and chemistry read, lipase read, `precipitant`
  decision, enoxaparin, diabetes-team referral.
- **Minute 75:** `k-replete` (K⁺ 3.7). Insulin infusion at minute 83.
- **Minutes 134 and 255:** ongoing K-containing fluids (2 h, then 4 h bags).
- **About minute 290:** glucose < 14 (`glucose-lt14`). Ketones and VBG read at
  minutes 302–303, `glucose-falling` decision, 10% glucose at minute 303,
  midway reassessment.
- **Minute 495:** next fluid bag.
- **About minute 580:** resolution. Ketones and VBG read at minutes 592–593,
  final reassessment, `resolution-transition` decision.
- **Minute 594 (about 12:34 on the case clock):** glargine + aspart with her
  first meal.
- **Minute 655:** FRIII stopped after a 60-min overlap.
- **Minute 656:** finish.

`cases verify` passes with no issues, and the deterministic rubric scores 16/16
(the potassium-first and the avoid-harm safety items carry weight 2).

## Clinical numbers check

- Weight 55 kg, height 163 cm → BMI 20.7 kg/m².
- MAP = (100 + 2 × 60) / 3 = 73 mmHg.
- **Admission VBG:** pH 7.08, pCO₂ 3.26 kPa (24.5 mmHg), HCO₃⁻ 7.0 mmol/L.
  - Henderson–Hasselbalch: 6.1 + log₁₀(7.0 / (0.03 × 24.5)) = 7.08.
  - BE (Van Slyke) −20.6.
  - Lactate 2.1.
- **Anion gap** = Na − (Cl + HCO₃):
  - admission 131 − (98 + 7) = **26**
  - `k-replete` 133 − (103 + 8) = 22
  - `glucose-lt14` 135 − (106 + 12) = 17
  - `resolution` 138 − (108 + 19) = 11

  pH and pCO₂ in each repeat gas were checked the same way (7.11 / 3.47 kPa,
  7.21 / 4.14 kPa, 7.35 / 4.75 kPa), and so were the base excesses
  (−19.2, −14.1, −5.7).
- **Corrected sodium** (glucose 28.0 mmol/L ≈ 504 mg/dL):
  - Katz: 131 + 1.6 × (28.0 − 5.5)/5.5 = **137.5 mmol/L**
  - Hillier: 131 + 2.4 × (28.0 − 5.5)/5.5 = **140.8 mmol/L**

  Both are normal. Measured Na rises 131 → 133 → 135 → 138 as glucose falls.
- **Osmolality:**
  - calculated 2 × 131 + 28.0 + 9.2 = 299 mOsm/kg
  - effective 2 × 131 + 28 = 290 mOsm/kg (below the 2024 consensus HHS
    thresholds — effective > 300 or total > 320 — and the JBDS/Chinese ≥ 320;
    glucose is also below the 33.3 mmol/L of HHS: not HHS)
- **Severity bands (2024 consensus):** moderate pH 7.00–7.25, HCO₃⁻ 10 to
  < 15, β-hydroxybutyrate 3.0–6.0; severe pH < 7.00, HCO₃⁻ < 10,
  β-hydroxybutyrate > 6.0. Hers: pH 7.08 (moderate), β-hydroxybutyrate 5.8
  (moderate), HCO₃⁻ 7.0 (severe).
- **ABG (low-value option):** pH 7.12, PaCO₂ 2.45 kPa (18.4 mmHg), HCO₃⁻ 5.8 mmol/L.
  - Winter's expected PaCO₂ 1.5 × 5.8 + 8 = 16.7 ± 2 mmHg, so compensation is appropriate.
  - PaO₂ 14.6 kPa on air, against a PAO₂ of ≈ 16.9 kPa (A–a ≈ 2.3 kPa, normal).
  - Venous pH is 0.04 lower than arterial.
- **Creatinine** 98 µmol/L = 1.11 mg/dL. eGFR (CKD-EPI 2021, female, 24 y) ≈ 71
  mL/min/1.73 m². This is only a guide in a non-steady state, and Jaffe creatinine can be
  falsely raised by acetoacetate. Recovery: 88 → 76 → 64 µmol/L.
- **Potassium:** 3.2 → 3.7 after about an hour of KCl 20 mmol/h without insulin,
  then 4.1 → 4.2 on 40 mmol/L fluids with insulin. The 2024 consensus starts
  potassium at 10 mmol/h below 3.5 mmol/L; the case runs the JBDS second bag
  (1 L with 40 mmol over 2 h = 20 mmol/h) on continuous ECG monitoring.
- **Phosphate:** 0.62 → 0.58 → 0.45 → 0.52 mmol/L. It stays below 1.0 mmol/L,
  but with no muscle weakness (power 5/5) and no respiratory or cardiac
  compromise it is monitored, not replaced (2024 consensus); it also stays
  above the ADA 2009 threshold of 0.32 mmol/L.
- **Ketones** (β-hydroxybutyrate): 5.8 → 5.4 (no insulin yet) → 2.6 (≈ 3.5 h of
  insulin, ≈ 0.8 mmol/L/h) → 0.2 mmol/L (≈ 0.5 mmol/L/h over the next 4.8 h;
  below both the < 0.6 of JBDS/2024 and the < 0.3 of the Chinese 2013
  guideline). HCO₃⁻ rises more slowly (7 → 12 in the same 3.5 h) because of
  hyperchloraemia from saline (Cl⁻ 98 → 106 → 108). This is why JBDS prefers
  ketone fall (≥ 0.5 mmol/L/h) over bicarbonate as the treatment target when a
  ketone meter is available.
- **Fluid on the reference path:** the first litre from minute 3.5 plus the
  potassium bag (500 mL/h) from minute 12 give ≈ 1.4 L in the first hour
  (≈ 26 mL/kg) and ≈ 2 L by minute 133; by minute 656 about 4.7 L of saline
  plus ≈ 0.7 L of 10% glucose.
- **Doses for 55 kg:**
  - FRIII 0.1 U/kg/h = 5.5 U/h = 5.5 mL/h of 50 U/50 mL; 0.05 U/kg/h (2024
    consensus, glucose < 13.9 mmol/L) = 2.75 U/h = 2.75 mL/h
  - KCl 40 mmol/L at 500 mL/h = 20 mmol/h
  - 10% glucose 125 mL/h = 12.5 g/h
  - urine-output target 0.5 mL/kg/h ≈ 28 mL/h
  - insulin bolus (not needed) 0.1 U/kg = 5.5 U
  - enoxaparin 40 mg daily
  - 20% glucose 75 mL = 15 g
  - 8.4% bicarbonate 100 mL = 100 mmol
- **Pump:**
  - basal 0.60–0.90 U/h, total 18.0 U/day; 14-day mean TDD 35.6 U (0.65 U/kg/day); ratio 1 U:10 g
  - ISF 2.5 mmol/L per U, target 6.0, so the suggested correction for 24.6 mmol/L is (24.6 − 6.0)/2.5 = 7.4 U
  - glargine transition dose 18 U ≈ the pump's total daily basal
  - first occlusion alarm 23:06 two nights before arrival → about 27.5 h without
    confirmed delivery at 02:40
- **HbA1c** 8.0% = (8.0 − 2.15) × 10.929 ≈ 64 mmol/mol.
- **Physiology:** insulin lowers glucose by 24/410 min ≈ 3.5 mmol/L/h. Glucose
  falls from about 26 at insulin start (minute 83) to < 14 at about minute 290,
  and stays at 11–13 on 10% glucose.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did that feel? What was going through your mind when the
   nurse offered to connect the insulin at minute 12?"
2. **Description.** "Summarise her in two sentences: the diagnosis, how severe,
   and the order of your first three treatments."
3. **Analysis.**
   - "Which single value made this severe, and which values on their own would
     have looked moderate? What did the JBDS level-2 markers change?"
   - "Why did you hold the insulin? What would a K⁺ of 3.2 have become an hour
     after an insulin infusion?" (the `ev-k-crash` course: ectopics, a run of VT,
     K⁺ 2.6)
   - "Why was the measured sodium low, and why did it rise as she improved?"
   - "When glucose fell below 14, what did you do with the insulin rate and why
     add glucose rather than stop the insulin?" (2024 consensus 0.05 U/kg/h;
     JBDS: consider)
   - "How did you decide she had resolved — and why was HCO₃⁻ still 19 with a
     normal anion gap?" (hyperchloraemia from saline)
   - "What happened to her pump, and what will she do differently the next time
     she is ill?" (sick-day rules, ketone strips, pens as backup)
   - "How did you explain the cause to her without blame?" (`r-comm`)
4. **Summary.** "Name two things you will do the next time you see DKA with a
   low potassium."

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Insulin before potassium | the nurse offers the made-up infusion at minute 12 (`ev-insulin-ready`); FRIII is contraindicated in `resus`; about an hour later ectopics, a 6-beat run of VT and K⁺ 2.6 (`ev-k-crash` / `-unmonitored`); `k-replete` waits until minute ≥ 180 | `r-safety-k-first` (weight 2), safety event |
| "Blind" potassium | `kcl-replacement` is contraindicated until a K⁺ result has been read | safety event |
| KCl push | the nurse refuses and escalates (never event) | `r-safety-avoid` (weight 2), safety event |
| Bicarbonate at pH 7.08 | her pulse becomes irregular (`ev-bicarbonate`) | `r-safety-avoid`, safety event |
| Insulin bolus | pharmacist note; contraindicated in `resus` | `r-mx-friii` |
| Fluids delayed | the nurse warns at minute 45 and the BP drifts (`ev-no-fluids-45`) | `r-mx-fluids` |
| Treating severity by pH alone | `dx-moderate-dka` feedback | `r-dx` (first try) |
| No glucose when it falls below 14 / stopping insulin | `glucose-falling` feedback; hypoglycaemia events (`ev-hypoglycaemia`, `ev-severe-hypo`) | `r-mx-dextrose` |
| Glucose as the resolution criterion | `resolution-transition` option `r-glucose-only` | the decision |
| Stopping FRIII before SC insulin | critical nurse message (`ev-friii-stopped-no-overlap`) | `r-transition`, safety event |
| Ward admission while acidotic | contraindicated before `resolution` | safety event |
| ABG, CT abdomen, antibiotics for the white count | result notes and responses explain why | `r-efficiency` |
| Pregnancy test forgotten | the `precipitant` decision needs the hCG read | `r-inv-ecg-hcg` |

The first-hour fluid volume on the reference path (≈ 1.4 L, two lines) is worth
discussing with senior learners: JBDS asks for caution in 18–25-year-olds; an
alternative is to start the potassium bag as the first litre ends, or to replace
potassium at the consensus' starting rate of 10 mmol/h.

## Embodied mode

**Grounding the kit (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8).** A
clinical act needs the kit it names at the bedside and IV access is patient
state: the IV items `kcl-replacement`, `friii`, `insulin-bolus`, `phosphate`,
`ondansetron`, `antibiotics` and `dextrose-10` require `iv-access` (the case's
`iv-access` procedure first; the reference solution places it first).
`monitoring-plan` ("Set up the hourly monitoring plan") is kind `other`: it is a
plan of hourly checks, not a monitor to attach — with the kind default
(monitoring → `cardiac-monitor`) it would have demanded a bedside monitor it
does not use.

**Facility.** In `general-hospital` the case takes slot `resus-1` (the triage
note says resus bay 1). Bedside interventions need `infusion-pump`, `iv-access`,
`cardiac-monitor`, `medications` and `oxygen`, all within 3 m of the slot.
Orders need `point-of-care` (11 m), `lab-blood-gas`/`lab-chemistry` (laboratory
order workstation, 23 m) and `records` (pump download). The bed weight
(`ex-weight`) needs no ward scale: the resus trolley weighs her. The benchmark
scenario `workflow-dka-point-of-care` fetches the glucometer to this bed.

**Scope of practice (EMBODIED §8).** `suspend-pump` (removing the insulin pump
and infusion set) and `urinary-catheter` are authored `scope: "nursing"`: a
delegated nurse may do them.

**Where the patient goes, how she looks (reviews G8 / G12).** `oxygen` names
`device: "non-rebreather-mask"` (the dose: non-rebreather mask at 15 L/min); the
AP chest film (`cxr`) is `performedAt: "bedside"` — an AP film is the portable
view taken in resus — so nobody is moved for it. The CT abdomen (`ct-abdomen`,
not in the reference path) needs the patient taken to CT in embodied mode. No
step of the reference path moves her: she stays in resus bay 1 while the HDU
bed is prepared.

## Fidelity limits

- **Results are per-phase snapshots.** A test ordered in a phase returns that
  phase's result whenever it is read. Glucose in later phases is read from the
  bedside observations (`poc-glucose` later-phase results point there, and the
  repeat gases omit glucose), so lab and bedside values cannot drift apart.
  Texts the learner can meet before the monitor is attached do not claim one:
  the KCl order says it *needs* continuous ECG monitoring (attach the monitor),
  and the HDU referral that she needs HDU-level monitoring in resus.
- **The potassium recheck is time-gated** by elapsed-minute tiers, because the
  engine has no "minutes since intervention X" condition. Potassium started
  before minute 600 always runs 45–105 min before the `k-replete` result;
  only a start after minute 600 can get a shorter interval.
- **The insulin rate is not titrated.** The engine cannot change a running
  infusion's effect, so the `glucose-falling` step (10% glucose with the
  insulin continued, reduced to 0.05 U/kg/h under the 2024 consensus) is one
  intervention; glucose (11–13 mmol/L) and the RR-based resolution timeline are
  the same whether the rate stays at 0.1 or is reduced.
- **Stopping IV insulin has no physiological rebound.** The engine cannot
  cancel an intervention's effect or start a trend relative to an action, so an
  early `stop-friii` is caught by its contraindication, the critical nurse
  message and the rubric, not by the monitor.
- **RR stands in for the acidosis.** Resolution is triggered by the respiratory
  rate falling (insulin effect), not by a modelled bicarbonate or ketone level.
  Ketone and gas values per phase are written to match that timeline.
- **Overlap timing is not enforced.** The engine cannot check the SC→IV overlap
  duration; the reference path waits 60 min. Stopping FRIII without SC insulin
  is caught, and so is stopping it before resolution.
- **Effects end instantly** when their duration lapses: insulin bolus and 20%
  glucose last 60 min, bicarbonate tachycardia 60 min. Persistent effects
  (fluids, insulin, dextrose) are not reversed by `stop-friii`. After the switch,
  the SC insulin is assumed to take over.
- **Fluid volume is not modelled** beyond its HR/BP/glucose effects: a second
  rapid litre is caught as a contraindication, not as fluid overload.
- **Not modelled:** cerebral oedema, hypophosphataemia complications, and the
  individual pump-versus-injections decision.

## Matcher notes

- **Matcher tuning:** keywords and `excludeKeywords` separate look-alike
  questions (pump vs omitted insulin vs pump settings vs sick-day rules,
  medications vs allergies vs recreational drugs, polyuria vs dysuria vs
  smoking/alcohol, PMH vs family history vs complications, roommate's illness
  vs her own diarrhoea, first litre vs ongoing/potassium/balanced fluids,
  dextrose vs hypo treatment, KCl infusion vs push, monitor vs monitoring plan).
  Short CJK keywords that share a generic 3-character run with many questions
  (有没有…, 胰岛素…, 家里有…) were removed, because the patient pipeline also
  selects any secondary hit within 0.25 of the best. "你平时怎么用胰岛素？" /
  "平时胰岛素怎么打" reach only `hx-insulin-pump` (`hx-meds`, `hx-insulin-omitted`
  and `hx-sick-day-rules` exclude usual-insulin phrasing), and "一天总共用多少胰岛素"
  reaches `hx-pump-settings`. All 89 `extensions.testUtterances` (incl.
  colloquial Chinese, typos and abbreviations such as LMP, TDD, SOB, DKA) match
  their expected item as top hit with score ≥ 0.55. `VRIII` is deliberately not
  an alias of the fixed-rate infusion.
- **What she says follows the phase.** The arrival answers in the present tense
  (`hx-main-complaint`, `hx-oral-intake`, `hx-abd-pain`, `hx-pain-modifiers`,
  `hx-polyuria-thirst`, `hx-breathing`, `hx-drowsy`) are limited to `resus` and
  `k-replete`, while she is still acidotic. "现在感觉怎么样？" / "How are you feeling
  now?" then reaches `hx-status-midway` (`glucose-lt14`: breathing easier, mouth
  less dry, mild upper abdominal pain, less nauseated, not eating yet — as in
  `ex-reassess-midway` and the premature-transition feedback) or
  `hx-status-resolution` (`resolution`: settled breathing, brighter, hardly any
  pain, no nausea, hungry — as the nurse reports and `r-eating` states). Before
  this, at hour 10 she still said she could only sip water and vomited it back.
- **Dose text is a formula.** The FRIII dose reads 0.1 U/kg/h with no bolus and
  the monitoring plan reads urine ≥ 0.5 mL/kg/h. Her weight is earned by asking
  (`hx-weight`) or weighing her (`ex-weight`); 5.5 mL/h = 5.5 U/h and 2.75 mL/h
  for 55 kg appear only in the infusion and 10% glucose `response`s and the
  pharmacist's dose check. Likewise the first-litre doses do not say "about
  18 mL/kg" and the (wrong) insulin bolus reads 0.1 U/kg; 18 mL/kg and 5.5 U for
  55 kg are in their responses.
- **Options do not pre-empt the history.** The `precipitant` options name the
  categories ("an occluded pump set", "acute gastroenteritis, probably viral"),
  not the details only targeted questions reveal (the 4-day-old set, the
  roommate's illness).
- **Per-locale result texts.** Ketone, urinalysis and hCG values and reference
  texts are `LocalizedText` (阴性 / negative, 微量 / trace, the ketone bands), never
  both languages in one string or English-only.

## References

- Umpierrez GE, Davis GM, ElSayed NA, et al. Hyperglycemic crises in adults with diabetes: a consensus report. Diabetes Care. 2024;47(8):1257-1275. doi:10.2337/dci24-0032 — the ADA/EASD/JBDS/AACE/DTS consensus: diagnostic triad (anion gap no longer a criterion), severity bands, potassium (hold insulin below 3.5 mmol/L, start replacement at 10 mmol/h), 0.05 U/kg/h with 5–10% dextrose below 13.9 mmol/L, bicarbonate only below pH 7.0, phosphate only with weakness or cardiorespiratory compromise below 1.0 mmol/L, resolution criteria, the 1–2 h overlap.
- Dhatariya KK; Joint British Diabetes Societies for Inpatient Care. The management of diabetic ketoacidosis in adults—an updated guideline from the Joint British Diabetes Society for Inpatient Care. Diabet Med. 2022;39(6):e14788. doi:10.1111/dme.14788 — level-2 markers, the fluid schedule, KCl 40 mmol/L, FRIII 0.1 U/kg/h without a bolus, 10% glucose at < 14 mmol/L with a reduction to 0.05 U/kg/h to consider, ketone-based targets, caution in young adults aged 18–25.
- Joint British Diabetes Societies for Inpatient Care. The management of diabetic ketoacidosis in adults (JBDS 02). Revised March 2023. JBDS-IP; 2023. — the current full guideline that the 2022 paper summarises.
- Kitabchi AE, Umpierrez GE, Miles JM, Fisher JN. Hyperglycemic crises in adult patients with diabetes. Diabetes Care. 2009;32(7):1335-1343. doi:10.2337/dc09-9032 — the earlier ADA grading, potassium 3.3 mmol/L, insulin 0.02–0.05 U/kg/h at 11.1 mmol/L.
- Joint British Diabetes Societies for Inpatient Care; Diabetes Technology Network UK. Using technology to support diabetes care in hospital (JBDS 20). JBDS-IP; 2024. — stop a pump when the person is acutely unwell, start another insulin source at once when delivery fails, keep the removed pump labelled. (Replaces the 2017 JBDS-IP CSII guideline, now archived.)
- American Diabetes Association Professional Practice Committee. 16. Diabetes care in the hospital: Standards of Care in Diabetes—2026. Diabetes Care. 2026;49(Suppl 1):S339-S355. doi:10.2337/dc26-S016
- 中华医学会糖尿病学分会. 中国高血糖危象诊断与治疗指南. 中华糖尿病杂志. 2013;5(8):449-461.
- 中华医学会糖尿病学分会, 中国医师协会内分泌代谢科医师分会, 中华医学会内分泌学分会, 等. 中国1型糖尿病诊治指南(2021版). 中华糖尿病杂志. 2022;14(11):1143-1250.

DOIs were checked on 2026-10-28 against the publisher or indexer record (title,
journal, year, volume and pages); none is given where that could not be done.

Guidelines differ in detail. The case follows the 2024 consensus where they
conflict, and names the JBDS alternative in feedback:

- potassium thresholds (the consensus holds insulin below 3.5 mmol/L and starts
  potassium at 10 mmol/h; JBDS asks for senior review below 3.5; ADA 2009 and
  the Chinese 2013 guideline use 3.3)
- K⁺ per litre (JBDS 40 mmol/L; the 2024 consensus and ADA 2009 20–30 mmol/L)
- the insulin rate once glucose is below 14 mmol/L (the consensus reduces to
  0.05 U/kg/h; JBDS advises considering it)
- glucose concentration (JBDS 10%; the consensus 5–10%)
- the fluid used (0.9% saline or balanced crystalloid; both are accepted)

### To verify

Items this editorial pass could not settle; a clinician reviewer should check
them:

- The Chinese-guideline statements (2013 hyperglycaemic-crisis guideline: K⁺
  threshold 3.3 mmol/L, insulin 0.02–0.05 U/kg/h with glucose at 11.1 mmol/L,
  resolution criteria with ketones < 0.3 mmol/L) were not checked online, and
  its citation could not be confirmed; the DKA chapter of 中国糖尿病防治指南（2024版）
  (中华糖尿病杂志. 2025;17(1):16-139) may supersede them and was not accessed.
- The potassium rate: 20 mmol/h by peripheral line on ECG monitoring in a
  level-2 setting, against the consensus' starting rate of 10 mmol/h —
  acceptable under local potassium policy?
- The first-hour fluid volume on the reference path (≈ 1.4 L, ≈ 26 mL/kg, two
  lines) for a 24-year-old.
- "Grade by the worst parameter" is the case's teaching rule for discordant
  values; the consensus tables give the bands without saying how to combine
  them.
- JBDS 20 (2024) was checked through its published summaries only, and the
  2026 Standards of Care hospital chapter for its citation only.
- The urine dipstick equivalents (glucose 4+ ≥ 55 mmol/L, ketones 3+
  ≥ 8 mmol/L) depend on the strip brand.

## Changelog

### 1.1.1 — 2026-10-28 (assessment integrity)

- **Avoided-harm items count only once the harm was possible** (`scoredWhen`):
  `r-safety-avoid` once treatment has started (fluids, potassium or insulin)
  or a harmful step is taken; `r-efficiency` once the severity decision is
  reached or a low-value test or antibiotic is ordered or given. Doing nothing
  scored 3/16 (19 %) from these two items and now scores 0/13 (0 %); the
  reference path keeps 16/16, and bicarbonate or a correction bolus through the
  pump still costs `r-safety-avoid` (14/16).
- `r-safety-k-first` is **critical** (`critical: true`): insulin before the
  potassium is replaced is named first in the debrief (no score cap).
- **Matcher corpus:** three `extensions.testUtterances` that repeated their
  item's canonical question are now paraphrases (`cases validate --strict`);
  no history item, answer or keyword changed.

### 1.1.0 — 2026-10-28 (editorial review)

- **Glucose below 14 mmol/L (clinical correction).** The `glucose-falling`
  answer said to keep insulin at 0.1 U/kg/h and called dose reduction an older
  protocol. The 2024 consensus reduces the infusion to 0.05 U/kg/h with 5–10%
  dextrose once glucose is < 13.9 mmol/L, and JBDS (2022 paper, March 2023
  revision) advises considering the same reduction. The correct option,
  its feedback, the `g-cut-insulin` feedback, the `dextrose-10` response and
  harm text, the pharmacist's dose check, the debrief conclusion, key reasoning
  and teaching points now say so; option ids are unchanged.
- **Phosphate threshold updated.** The 2024 consensus replaces phosphate only
  for muscle weakness or respiratory or cardiac compromise with a level below
  1.0 mmol/L; the `phosphate` response, the pharmacist brief and the teaching
  point now give that rule, with the ADA 2009 threshold (< 0.32 mmol/L) as the
  older alternative. Her management (monitor, do not replace) is unchanged.
- **Potassium and severity, current wording.** `k-first` feedback and the
  potassium teaching point state the consensus rule (start potassium at
  10 mmol/h; insulin delayed until K⁺ > 3.5) and why the case runs 20 mmol/h;
  `dx-severe-dka` feedback and key reasoning give the 2024 consensus severity
  bands; the key reasoning notes that the consensus dropped the anion gap as a
  diagnostic criterion.
- **Rubric:** `r-safety-avoid` (no bicarbonate, no KCl push, no insulin through
  the old set) weight 1 → 2, as a never event belongs with the potassium-first
  item; the deterministic total is now 16.
- **Consistency:** the triage note and the nurse's handover said resus bay 3;
  the world places her in resus bay 1 (as the benchmark scenario does) — now
  bay 1. zh-CN conclusion "病假规则" (sick-leave rules) corrected to
  "生病日规则" (sick-day rules), the term used elsewhere in the case.
- **References:** normalised to one Vancouver-style string each; DOIs added
  after verification; ADA Standards of Care 2025 → 2026 (Section 16); the
  archived 2017 JBDS-IP CSII guideline replaced by JBDS 20 (2024); the JBDS 02
  March 2023 revision added; the Chinese type 1 diabetes guideline lists its
  issuing societies.
- **Governance:** `learningOutcomes` (6) and `provenance.review` (editorial,
  AI-assisted, not clinician-reviewed) added; version 1.0.0 → 1.1.0.
- **README** restructured to the facilitator-guide template; the reference-path
  minutes re-checked by replaying the solution; matcher test count corrected
  (89).

### 1.0.0

- First release.

## Validation

```bash
npm run cc -- cases validate packages/content/cases/dka-adult/case.json
npm run cc -- cases verify dka-adult
npm run -s cc -- bench grounding --split dev --case dka-adult
npx vitest run packages/agent/src/session/embodied-autopilot.test.ts
```

## 中文摘要

**病例概要。** 24岁女性研究生，11岁起患1型糖尿病，使用胰岛素泵（门冬胰岛素）。急性胃肠炎期间泵管路打折堵塞（反复“堵塞”报警被清除，管路已用4天），又因“不吃饭就不用胰岛素”的误解停打餐时和校正剂量，约27小时后于凌晨02:40由室友送入急诊抢救室1床。指尖血糖28.0 mmol/L，血β-羟丁酸5.8 mmol/L，静脉血气pH 7.08、HCO₃⁻ 7.0 mmol/L、阴离子间隙26，血钾3.2 mmol/L，心电图见U波。诊断：重度糖尿病酮症酸中毒伴入院低钾血症，需2级（HDU）监护。

**学习目标。**

1. 到院15分钟内依据指尖血糖、血β-羟丁酸和静脉血气确诊DKA，按2024年共识的严重程度分级和JBDS的2级监护指标判断严重程度与监护级别。
2. 到院30分钟内开始等渗晶体液；入院血钾 < 3.5 mmol/L时暂缓胰岛素，在持续心电监护下用输液泵静脉补钾，直至血钾 ≥ 3.5 mmol/L。
3. 血钾允许后按体重开始固定速率静脉胰岛素（0.1 U/kg/h，不用负荷量），取下故障的胰岛素泵，建立每小时监测方案（血酮每小时下降 ≥ 0.5 mmol/L）。
4. 血糖降至14 mmol/L以下时加用10%葡萄糖，并继续静脉胰岛素（2024年共识减至0.05 U/kg/h）直至酮症酸中毒缓解，不发生低血糖。
5. 以血酮 < 0.6 mmol/L且静脉pH > 7.3（或HCO₃⁻ ≥ 18 mmol/L）而非血糖判断缓解，先皮下注射基础—餐时胰岛素、重叠1–2小时后再停静脉胰岛素。
6. 找出诱因，避免有害或低价值处理（pH ≥ 7.0时补碱、静推氯化钾、胰岛素负荷量、常规补磷或抗生素），并进行生病日规则和泵故障处理教育。

**关键决策。**

- 诊断与严重程度：pH和血酮属中度，但HCO₃⁻ < 10 mmol/L属重度；另有JBDS的2级监护指标（入院钾 < 3.5、心率 > 100、阴离子间隙 > 16）。
- 钾与胰岛素的顺序：先补液、补钾（本例20 mmol/h，心电监护，每小时复查），钾 ≥ 3.5 mmol/L后再开始固定速率胰岛素；2024年共识起始补钾10 mmol/h。
- 诱因（多选）：泵管路堵塞、生病时漏打胰岛素、急性胃肠炎。
- 血糖 < 14 mmol/L：加10%葡萄糖125 mL/h，胰岛素继续输注并减至0.05 U/kg/h（2024年共识；JBDS：可考虑），直至缓解。
- 缓解与过渡（多选）：血酮0.2、pH 7.35、HCO₃⁻ 19，能进食；先皮下胰岛素，重叠1–2小时再停静脉胰岛素；请糖尿病专科。

**复盘要点。**

- 入院血钾低说明总体缺钾严重；胰岛素和碳酸氢钠都会把钾驱入细胞内，先给胰岛素可致室性心律失常（本例“过早胰岛素”分支：早搏、短阵室速、钾2.6）。
- 血糖比酮体恢复得快：缓解看血酮和酸碱指标，不看血糖；缓解时残余的低HCO₃⁻是生理盐水造成的高氯性酸中毒。
- 胰岛素泵只输注速效胰岛素，管路堵塞数小时即可发生DKA；教育要点：生病不停基础胰岛素、每2–4小时测血糖和血酮、有酮体时用笔式胰岛素校正并更换管路、家中常备血酮试纸。
- 不责备地解释病因，回应她对论文答辩和胰岛素泵的担忧；向HDU用SBAR交接。
- 讨论：参考路径第1小时输液约1.4 L（两条通路），18–25岁患者补液需谨慎。
- 本病例经AI辅助编辑审校，尚未经执业临床医师审阅；用于教学前请由本专科医师审核。
