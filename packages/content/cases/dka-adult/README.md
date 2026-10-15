# `dka-adult`: vomiting, abdominal pain and fast breathing, 24-year-old woman

> **Spoilers for case authors.** This file names the diagnosis. Learners should
> open the case from the case library, where the title, summary, tags, triage
> note and objective titles give nothing away.

**Synthetic case.** This is a fictional teaching case written for ClinicalCraft.
It is not based on any real patient. Every name is a pseudonym (林晓雯（化名）/
Lin Xiaowen; her roommate 周婷（化名）/ Zhou Ting; all staff names), and every
number was written for teaching and checked for internal consistency. It is not
medical advice: 虚构教学病例，不构成医疗建议 / Fictional teaching case — not
medical advice.

A 24-year-old graduate student with type 1 diabetes since age 11 uses an insulin
pump (aspart). During a bout of probable viral gastroenteritis (her roommate had
the same illness) her infusion set kinked and occluded. She cleared the repeated
"occlusion" alarms and never changed the 4-day-old set. Believing "no food, no
insulin", she also stopped her meal and correction boluses. Two days later her
roommate brings her to the ED at 02:40 with thirst, polyuria, vomiting, abdominal
pain, Kussmaul breathing and ketotic breath. The diagnosis is **severe diabetic
ketoacidosis with admission hypokalaemia**. Insulin must wait until potassium is
≥ 3.5 mmol/L.

| | |
|---|---|
| id / version | `dka-adult` / `1.0.0` |
| setting / facility | `emergency` (resus bay, managed to HDU/ICU level 2) / `general-hospital` |
| locales | `zh-CN` (source), `en` |
| phases | `resus` → `k-replete` → `glucose-lt14` → `resolution` (all automatic, not learner-switchable) |
| clock | simulated, starts 02:40, `realtimeScale` 2, limit 1080 min (18 h). Costs: ask 0.5, examine 1, order 0.5, read 0.5, intervene 1 min. Learners use **wait** (`advance-time`, ≤ 240 min per call) to let hours pass. |
| difficulty | 3 / 5 |
| content | 42 history items (3 `unknown`, 9 required; 7 arrival-state items limited to `resus`/`k-replete`, 2 later-phase status items), 18 exam findings (2 phase-restricted reassessments), 16 investigations, 27 interventions, 6 objectives, 5 decisions, 15 rubric items (14 deterministic + 1 examiner-judged), 6 NPC briefs, 89 matcher test utterances |

## Learning objectives

1. Recognise the presentation at the bedside: Kussmaul breathing, ketotic breath,
   dehydration, a known type 1 diabetic with an insulin pump. Get capillary
   glucose, blood ketones and a **venous gas with potassium within 15 minutes**.
2. Confirm DKA by the consensus triad. **D**: glucose ≥ 11.1 mmol/L or known
   diabetes. **K**: β-hydroxybutyrate ≥ 3.0 mmol/L. **A**: pH < 7.3 and/or
   HCO₃⁻ < 18 mmol/L. Grade severity by the *worst* parameter (here HCO₃⁻
   < 10 mmol/L) and arrange level-2 (HDU) care.
3. **Fluids first.** Then, because K⁺ is 3.2 mmol/L, **hold insulin**. Replace
   potassium at 10–20 mmol/h on continuous ECG monitoring and recheck hourly.
4. Start a **fixed-rate IV insulin infusion at 0.1 U/kg/h** (5.5 U/h for 55 kg,
   no bolus) once K⁺ ≥ 3.5 mmol/L. Remove the failed pump. Find the
   precipitants and set up hourly monitoring.
5. When glucose falls below 14 mmol/L, **add 10% glucose and keep the insulin
   running**. Ketones and acidosis clear more slowly than glucose.
6. Judge resolution by **ketones < 0.6 mmol/L and venous pH > 7.3 (or HCO₃⁻ ≥ 18)**,
   not by glucose. Give SC insulin before stopping the IV insulin (overlap).
   Involve the diabetes team for pump troubleshooting and sick-day rules.
7. Avoid the traps: bicarbonate at pH ≥ 7.0, insulin bolus, KCl push, "blind"
   potassium, insulin through the occluded pump, routine phosphate, empirical
   antibiotics for the leucocytosis, CT for DKA abdominal pain, ABG instead of
   VBG, and general-ward admission.

## Scenario logic (physiology)

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
critical result — and alarms (critical) only on the monitor. The insulin-before-potassium crash is a "Monitor alarm"
(ectopics, a 6-beat run of VT) only on the monitor (`ev-k-crash`); without one
it is what she and the nurse feel — racing, skipping heart, weak legs, a fast
irregular pulse — with the same K⁺ 2.6 gas (`ev-k-crash-unmonitored`). Both set
`k-crash` and HR 130 and guard on it, so attaching the monitor later never
fires the other. The bicarbonate and "potassium settles it" lines talk about
the pulse and ectopics, not the screen.

| Element | Behaviour |
|---|---|
| Untreated trends | HR +0.05/min (to +8), SBP −0.08/min (to −8), DBP −0.04/min (to −4) until fluids start. RR +0.02/min (to +4) and GCS −0.01/min from minute 60 (to −2) until insulin runs. Glucose +0.01/min (to +2) until fluids or insulin. With no fluids by minute 45, `ev-no-fluids-45` warns and resets the baseline to HR 122, BP 96/57. Untreated for 4 h: HR 128, BP 86/53, RR 32, GCS 13. |
| First litre (`nacl-1l-1h` or `balanced-1l-1h`) | HR −8, SBP +8, DBP +4, RR −1, glucose −2 over about 1 h. Giving both counts as unsafe (excess fluid, age 18–25). |
| `kcl-replacement` | 0.9% NaCl + KCl 40 mmol/L at 500 mL/h (KCl 20 mmol/h). It is indicated once K⁺ is known and unsafe if no K⁺ result has been read. It sets `k-replacing`, which starts the `k-replete` phase clock. |
| `k-replete` phase | Entered at minute 75 if potassium started within 30 min. If it started later, the `k-late-*` events (every 30 min to minute 180, then every 60 min to minute 600) place entry 45 min after the end of the window in which potassium started, so it runs for 45–105 min before the K⁺ 3.7 snapshot. If insulin was given before potassium, entry waits until minute ≥ 180. |
| `friii` 0.1 U/kg/h | Glucose −24 over about 410 min (≈ 3.5 mmol/L/h). RR −11 and HR −20 over 600 min, BP +4/+2, pain −4. It is **contraindicated in `resus`** (K⁺ 3.2) and indicated after the `k-replete` potassium is read. |
| `ev-insulin-before-k` → `ev-k-crash` | Insulin in `resus` sets `insulin-before-k`. When glucose reaches ≤ 23 (about 1 h later), there are multifocal ectopics, a 6-beat run of VT, leg weakness and an urgent gas with K⁺ 2.6 mmol/L. HR is reset to 130; `ev-k-crash-settles` resets it to 118 once `k-replete` is reached. |
| `ev-glucose-14` → `glucose-lt14` phase | Fires once on insulin when glucose is < 14 (about minute 290). It latches the `glucose-below-14` flag. The phase is entered only from `k-replete` (so insulin given without any potassium never shows the replaced-K⁺ snapshots); if glucose fell below 14 earlier, the phase follows immediately once `k-replete` is reached. Rhythm/ECG are then set to sinus/normal. |
| `dextrose-10` | Glucose +11 over 180 min. With insulin running, this holds glucose at about 11–13 mmol/L. It is unsafe while glucose is still ≥ 14 before `glucose-below-14`. Without it, glucose falls below 4 mmol/L at about minute 470 (≈ 6.5 h after insulin starts) and keeps falling: `ev-hypoglycaemia` fires with a critical alarm, `ev-severe-hypo` (glucose ≤ 2.5) drops GCS to 12, and `ev-hypo-recovered` restores GCS 15 once glucose is back ≥ 5. |
| `ev-dka-resolved` → `resolution` phase | Fires on insulin, after glucose < 14, once the noise-free RR is ≤ 18 (about minute 580, ≈ 9.6 h). This is the case's surrogate for the acidosis clearing. The phase is entered only from `glucose-lt14`. |
| `stop-friii` | Indicated only in `resolution` after `sc-insulin-transition`. Otherwise it is contraindicated, and (if the infusion was actually running) `ev-friii-stopped-no-overlap` warns that she has no insulin on board. |
| Staff prompts | Nurse: `ev-insulin-ready` at minute 12 (the insulin is made up; a tempting trap), `ev-k-late-30`, `ev-no-fluids-45`, `ev-k-recheck-due`, `ev-bicarbonate`. Attending: `ev-no-insulin-3h` (narrated, `speaker: "narrator"`, because the runtime has no attending voice for scenario lines). |
| Rubric flags | `early-workup` (glucose, ketones and VBG read by minute 15) and `fluids-by-30`. |

Tempting wrong choices you can make:

- insulin before potassium, or an IV insulin bolus
- a correction bolus through her own (occluded) pump
- sodium bicarbonate or a KCl IV push
- "blind" potassium before any K⁺ result
- phosphate, ceftriaxone, oxygen, a urinary catheter or a 500 mL bolus while normotensive
- general-ward admission
- stopping FRIII without SC insulin
- a 20% glucose bolus when glucose is not low, or 10% glucose before glucose has fallen below 14
- ABG or CT abdomen

## Decisions

- `dx-severity`: severe DKA (HCO₃⁻ < 10 mmol/L) needing level-2 care. The
  distractors are moderate DKA by pH, HHS, mixed DKA–HHS,
  starvation/alcoholic ketoacidosis, euglycaemic DKA and lactic acidosis.
- `k-sequencing`: hold insulin, give KCl 10–20 mmol/h on the monitor, recheck
  hourly, and start FRIII at K⁺ ≥ 3.5. The distractors are insulin now,
  bolus + infusion, bicarbonate first, KCl push, and waiting for the formal lab K⁺.
- `precipitant` (select all): occluded pump set, omitted insulin during illness,
  gastroenteritis. The distractors are pancreatitis, pregnancy, UTI and an SGLT2
  inhibitor.
- `glucose-falling`: continue insulin at 0.1 U/kg/h and add 10% glucose
  125 mL/h. The distractors are stopping insulin, switching to SC, cutting to
  0.02 U/kg/h, or carrying on unchanged.
- `resolution-transition` (select all): the resolution criteria are met; she is
  eating; SC basal + meal-time insulin with a 1–2 h overlap; diabetes-team
  review. The distractors are glucose < 11 as the criterion, stopping first,
  and waiting for HCO₃⁻ > 22.

## Reference path (`solution`)

- **0–27 min:** Monitor and two IV lines. Capillary glucose, ketones and a VBG;
  the first litre of 0.9% saline starts at minute 3.5. Onset and thirst history,
  general inspection and breathing pattern. Results read: glucose at 6, ketones
  at 6.5, VBG at 9.
- **Minutes 9.5–12:** ECG, chemistry, FBC, hCG, urinalysis and lipase ordered.
- **Minute 12:** `dx-severity` and `k-sequencing` decisions.
- **Minutes 13–15:** KCl 20 mmol/h, HDU referral, pump removed.
- **Then:** ECG read; hydration, abdomen and pump site examined; hCG and
  urinalysis read; ondansetron; monitoring plan; the remaining focused history
  (pain, pump, omitted insulin, set, PMH, meds, allergies, LMP, contacts, ICE).
- **Wait to minute 57:** FBC and chemistry read, lipase read, `precipitant`
  decision, enoxaparin, diabetes-team referral.
- **Minute 75:** `k-replete` (K⁺ 3.7). Insulin infusion at minute 83.
- **Minutes 134 and 255:** ongoing K-containing fluids (2 h, then 4 h bags).
- **Minute 289:** glucose < 14. Ketones and VBG rechecked, `glucose-falling`
  decision, 10% glucose started, midway reassessment.
- **Minute 495:** next fluid bag.
- **Minute 577:** resolution. Ketones and VBG rechecked, final reassessment,
  `resolution-transition` decision.
- **Minute 594 (about 12:30 on the case clock):** glargine + aspart with her first meal.
- **Minute 655:** FRIII stopped after a 60-min overlap.
- **Minute 656:** finish.

`verifyCase` passes with no issues, and the deterministic rubric scores 15/15
(the potassium-first safety item carries weight 2).

## Clinical numbers (consistency check)

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

  pH and pCO₂ in each repeat gas were checked the same way: 7.11 / 3.47 kPa, 7.21 / 4.14 kPa, 7.35 / 4.75 kPa.
- **Corrected sodium** (glucose 28.0 mmol/L ≈ 504 mg/dL):
  - Katz: 131 + 1.6 × (28.0 − 5.5)/5.5 = **137.5 mmol/L**
  - Hillier: 131 + 2.4 × (28.0 − 5.5)/5.5 = **140.8 mmol/L**

  Both are normal. Measured Na rises 131 → 133 → 135 → 138 as glucose falls.
- **Osmolality:**
  - calculated 2 × 131 + 28.0 + 9.2 = 299 mOsm/kg
  - effective 2 × 131 + 28 = 290 mOsm/kg (below the 2024 consensus HHS threshold of > 300, and the JBDS/Chinese ≥ 320; not HHS)
- **ABG (low-value option):** pH 7.12, PaCO₂ 2.45 kPa (18.4 mmHg), HCO₃⁻ 5.8 mmol/L.
  - Winter's expected PaCO₂ 1.5 × 5.8 + 8 = 16.7 ± 2 mmHg, so compensation is appropriate.
  - PaO₂ 14.6 kPa on air, against a PAO₂ of ≈ 16.9 kPa (A–a ≈ 2.3 kPa, normal).
  - Venous pH is 0.04 lower than arterial.
- **Creatinine** 98 µmol/L = 1.11 mg/dL. eGFR (CKD-EPI 2021, female, 24 y) ≈ 71
  mL/min/1.73 m². This is only a guide in a non-steady state, and Jaffe creatinine can be
  falsely raised by acetoacetate. Recovery: 88 → 76 → 64 µmol/L.
- **Potassium:** 3.2 → 3.7 after about an hour of KCl 20 mmol/h without insulin,
  then 4.1 → 4.2 on 40 mmol/L fluids with insulin.
- **Phosphate:** 0.62 → 0.58 → 0.45 → 0.52 mmol/L. It always stays above
  0.32 mmol/L, so it is monitored, not replaced.
- **Ketones** (β-hydroxybutyrate): 5.8 → 5.4 (no insulin yet) → 2.6 (≈ 3.5 h of
  insulin, ≈ 0.8 mmol/L/h) → 0.2 mmol/L (below both the < 0.6 of JBDS/2024 and the < 0.3 of the Chinese 2013 guideline). HCO₃⁻ rises more slowly (7 → 12 in the
  same 3.5 h) because of hyperchloraemia from saline (Cl⁻ 98 → 106 → 108). This
  is why JBDS prefers ketone fall (≥ 0.5 mmol/L/h) over bicarbonate as the
  treatment target when a ketone meter is available.
- **Doses for 55 kg:**
  - FRIII 0.1 U/kg/h = 5.5 U/h = 5.5 mL/h of 50 U/50 mL
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
- **HbA1c** 8.0% = (8.0 − 2.15) × 10.929 ≈ 64 mmol/mol.
- **Physiology:** insulin lowers glucose by 24/410 min ≈ 3.5 mmol/L/h. Glucose
  falls from about 26 at insulin start (minute 83) to < 14 at minute 289, and
  stays at 11–13 on 10% glucose.

## Guideline references

- Umpierrez GE, Davis GM, ElSayed NA, et al. Hyperglycemic crises in adults with diabetes: a consensus report. Diabetes Care. 2024;47(8):1257-1275. Covers the ADA/EASD/JBDS/AACE/DTS diagnostic triad, the potassium threshold of 3.5 mmol/L, bicarbonate below pH 7.0, resolution criteria and the transition overlap.
- Dhatariya KK; Joint British Diabetes Societies for Inpatient Care. The management of diabetic ketoacidosis in adults—an updated guideline from the Joint British Diabetes Society for Inpatient Care. Diabet Med. 2022;39(6):e14788. Covers the level-2 markers, the fluid schedule, KCl 40 mmol/L, FRIII 0.1 U/kg/h without a bolus, 10% glucose at < 14 mmol/L, ketone-based targets, and caution with young adults aged 18–25.
- Kitabchi AE, Umpierrez GE, Miles JM, Fisher JN. Hyperglycemic crises in adult patients with diabetes. Diabetes Care. 2009;32(7):1335-1343. Source of the mild/moderate/severe grading.
- Joint British Diabetes Societies for Inpatient Care. Guidelines for managing continuous subcutaneous insulin infusion (CSII, or 'insulin pump') therapy in hospitalised patients. JBDS-IP; 2017.
- American Diabetes Association Professional Practice Committee. 16. Diabetes Care in the Hospital: Standards of Care in Diabetes—2025. Diabetes Care. 2025;48(Suppl 1).
- 中华医学会糖尿病学分会. 中国高血糖危象诊断与治疗指南. 中华糖尿病杂志. 2013;5(8):449-461.
- 中华医学会糖尿病学分会. 中国1型糖尿病诊治指南(2021版). 中华糖尿病杂志. 2022;14(11):1143-1250.

Guidelines differ in detail. The case follows the 2024 consensus where they
conflict, and names the JBDS alternative in feedback. The differences:

- potassium thresholds (ADA/consensus holds insulin below 3.5 mmol/L; JBDS asks for senior review below 3.5)
- K⁺ per litre (JBDS 40 mmol/L; ADA 2009 20–30 mmol/L)
- glucose concentration (JBDS 10%; ADA 5–10%)
- the fluid used (0.9% saline or balanced crystalloid; both are accepted)

## Modelling notes and limitations

- **Results are per-phase snapshots.** A test ordered in a phase returns that phase's
  result whenever it is read. Glucose in later phases is read from the bedside
  observations (`poc-glucose` later-phase results point there, and the repeat
  gases omit glucose), so lab and bedside values cannot drift apart. Texts the
  learner can meet before the monitor is attached do not claim one: the KCl
  order says it *needs* continuous ECG monitoring (attach the monitor), and the
  HDU referral that she needs HDU-level monitoring in resus.
- **The potassium recheck is time-gated** by elapsed-minute tiers, because the
  engine has no "minutes since intervention X" condition. Potassium started
  before minute 600 always runs 45–105 min before the `k-replete` result;
  only a start after minute 600 can get a shorter interval.
- **Stopping IV insulin has no physiological rebound.** The engine cannot cancel
  an intervention's effect or start a trend relative to an action, so an early
  `stop-friii` is caught by its contraindication, the critical nurse message
  and the rubric, not by the monitor.
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
  reaches `hx-pump-settings`. All 88
  `extensions.testUtterances` (incl. colloquial Chinese, typos and
  abbreviations such as LMP, TDD, SOB, DKA) match their expected item as top
  hit with score ≥ 0.55. `VRIII` is deliberately not an alias of the
  fixed-rate infusion.
- **What she says follows the phase.** The arrival answers in the present tense
  (`hx-main-complaint`, `hx-oral-intake`, `hx-abd-pain`, `hx-pain-modifiers`,
  `hx-polyuria-thirst`, `hx-breathing`, `hx-drowsy`) are limited to `resus` and
  `k-replete`, while she is still acidotic. "现在感觉怎么样？" / "How are you feeling
  now?" then reaches `hx-status-midway` (`glucose-lt14`: breathing easier, mouth
  less dry, mild upper abdominal pain, less nauseated, not eating yet — as in
  `ex-reassess-midway` and the premature-transition feedback) or
  `hx-status-resolution` (`resolution`: settled breathing, brighter, hardly any pain,
  no nausea, hungry — as the nurse reports and `r-eating` states). Before this, at
  hour 10 she still said she could only sip water and vomited it back.
- **Dose text is a formula.** The FRIII dose reads 0.1 U/kg/h with no bolus and
  the monitoring plan reads urine ≥ 0.5 mL/kg/h. Her weight is earned by asking
  (`hx-weight`) or weighing her (`ex-weight`); 5.5 mL/h = 5.5 U/h for 55 kg appears
  only in the infusion's `response` and the pharmacist's dose check. Likewise the
  first-litre doses no longer say "about 18 mL/kg" and the (wrong) insulin bolus reads
  0.1 U/kg; 18 mL/kg and 5.5 U for 55 kg are in their responses.
- **Options do not pre-empt the history.** The `precipitant` options name the
  categories ("an occluded pump set", "acute gastroenteritis, probably viral"),
  not the details only targeted questions reveal (the 4-day-old set, the
  roommate's illness).
- **Per-locale result texts.** Ketone, urinalysis and hCG values and reference
  texts are `LocalizedText` (阴性 / negative, 微量 / trace, the ketone bands), never
  both languages in one string or English-only.
- **Not modelled:** cerebral oedema, hypophosphataemia complications, and the
  individual pump-versus-injections decision.
- **Facility:** in `general-hospital` the case takes slot `resus-1`. Bedside
  interventions need `infusion-pump`, `iv-access`, `cardiac-monitor`,
  `medications` and `oxygen`, all within 3 m of the slot. Orders need
  `point-of-care` (11 m), `lab-blood-gas`/`lab-chemistry` (laboratory order
  workstation, 23 m) and `records` (pump download). The bed weight
  (`ex-weight`) needs no ward scale: the resus trolley weighs her.

## Validation

```bash
npm run cc -- cases validate packages/content/cases/dka-adult/case.json
npm run cc -- cases verify dka-adult
```
