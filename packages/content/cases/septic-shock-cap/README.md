# septic-shock-cap — Fever, cough and confusion · 72-year-old woman

> **Synthetic case.** This is a fictional teaching case written for ClinicalCraft.
> The patient (林秀珍 / Lin Xiuzhen), her daughter (周敏 / Zhou Min) and every staff
> member are pseudonyms; no real patient record was used. All values are invented
> and were cross-checked for internal consistency (see "Numbers check").
> 虚构教学病例，不构成医疗建议。 / Fictional teaching case — not medical advice.

| | |
|---|---|
| Setting | `emergency`, facility `general-hospital` (ED resus bay) |
| Clock | `simulated`, starts 21:30, `realtimeScale` 1, limit 180 min |
| Phases | `resus` → `reassess` (automatic once antibiotics are in **and** ≥ 3 × 500 mL boluses given) — or `reassess-late` instead when the antibiotics went in after the 60-minute mark (`abx-late`); none is learner-switchable |
| Difficulty | 4 / 5, about 45 min |
| Diagnosis (hidden) | Right lower lobe community-acquired pneumonia (likely *S. pneumoniae*) with septic shock (Sepsis-3), AKI KDIGO 2, sepsis-associated delirium, hypoxaemia |

## Learning objectives

1. Run an ABCDE assessment in a hypotensive, confused older adult while taking a history from a companion.
2. Recognise sepsis and septic shock with the Sepsis-3 definitions (and the limits of qSOFA/NEWS2/SIRS).
3. Deliver the early bundle: lactate, two blood-culture sets **before** antibiotics without delaying them, IV β-lactam + macrolide within 1 h, balanced crystalloid in 500 mL boluses with reassessment, norepinephrine (peripheral start acceptable) when MAP stays < 65 mmHg, repeat lactate.
4. Score severity correctly (CURB-65 = 4 from triage data; ATS/IDSA major criterion = vasopressor) and arrange ICU.
5. Avoid the classic traps: CT before antibiotics, PCT-gated antibiotics, dopamine first line, steroids instead of vasopressors, fluid restriction, open-ended fluids in hypoxaemic pneumonia, unindicated intubation, ward admission.
6. Medication safety in AKI: hold metformin, amlodipine and NSAIDs (she took ibuprofen at home); ceftriaxone and azithromycin need no renal adjustment; check QTc; never combine macrolide + fluoroquinolone.

## Case flow and what the engine does

* **Triage (minute 0):** T 39.1 °C, HR 118, BP 84/48 (MAP 60), RR 28, SpO₂ 89 % on air, GCS 14; NEWS2 16.
* **Untreated course (physiology trends):** SBP −0.15/min (floor −12) and DBP −0.08/min (floor −6) until antibiotics + ≥ 2 boluses; an additional "vasoplegia" trend (SBP −0.06/min, DBP −0.04/min) continues until norepinephrine starts; HR, RR and GCS drift (recovering after the bundle); SpO₂ falls until oxygen is given.
* **Fluids:** each 500 mL bolus gives a small persistent effect (+1.5/+0.5 mmHg, HR −2) and a transient one (+4/+2 mmHg, HR −2, fading in two halves ~11 and ~19 min after the bolus so the monitor does not drop in one 4 mmHg step) — the learner sees a pressure that rises and then falls back, which is the cue to start norepinephrine. In the reference path MAP is ~63–64 mmHg at reassessment and ~70–73 mmHg once norepinephrine (+14/+8 mmHg) is running.
* **Norepinephrine titration:** `maxDoses: 3` — choosing norepinephrine again steps the rate up (+14/+8 mmHg each, as the dose text says "titrate every 5–10 min to MAP ≥ 65"). The reference path needs one step; after late antibiotics (`reassess-late`, baseline BP 78/44) MAP stays ~56 mmHg on one step and needs two to reach ≥ 65, so delay shows up as a higher vasopressor requirement instead of a dead end.
* **Oxygen:** target effects — nasal cannula 95 %, Venturi 0.40 97 %, reservoir mask 100 % (rubric expects 94–98 % at the end, so step down after a reservoir mask).
* **Scenario events:** cultures-before-antibiotics flag (`cultures-first` — only when no antibiotic of any kind, flag `any-abx`, has been given) or a nurse note when cultures follow an antibiotic (`cultures-after-abx`); CT-before-antibiotics warning; nurse prompt at 30 min without antibiotics; at 60 min without antibiotics a critical deterioration (`abx-late`, baseline BP 78/44, GCS 13); peri-arrest at 120 min with neither antibiotics nor norepinephrine; dopamine → atrial fibrillation; hydrocortisone before a vasopressor → pharmacist warning; a 5th bolus → bilateral crackles (RR 32); ICU not called by 90 min → warning; entering `reassess-late` → nurse warning that perfusion is still poor.
* **Phase-dependent results:** `lactate-repeat` gives 5.1 mmol/L (rising) in `resus` and 3.6 mmol/L (≈ 22 % fall, still > 2 mmol/L) in `reassess` — a realistic fall for the ~30–60 simulated minutes the reassess phase represents; every other test also has a `reassess` result reflecting post-fluid dilution (e.g. Hb 118 g/L, albumin 29 g/L) so late orders never show "no record". `vbg-lactate@reassess` no longer quotes the arrival value (a learner whose first gas is taken after resuscitation never saw 4.6).
* **Delayed antibiotics (`reassess-late`):** every test has a result here too — copies of the `reassess` results except the gases (pH 7.29, pCO₂ 3.6 kPa / 27 mmHg, HCO₃⁻ 12.8, BE −12.3, **lactate 5.8 mmol/L, rising**), chemistry (HCO₃⁻ 13, AG 21, urea 12.9, creatinine 174 µmol/L), ECG (sinus tachycardia 126/min) and capillary glucose 11.9. The perfusion re-examination there is `ex-reassess-perfusion-late` (CRT ~5 s, mottling to mid-thigh, rousable only to voice). The objectives, `sepsis3` and the rubric accept either reassessment phase, so a learner who gave antibiotics late can still finish — with the penalties below.

## Wrong choices and how they score

| Choice | Engine response |
|---|---|
| Fluid restriction | `contraindicated` (always) |
| "Hold antibiotics until CT" | `contraindicated` while no antibiotic given; CT ordered first sets `ct-before-abx` |
| Dopamine | `contraindicated` (always); AF event |
| Hydrocortisone before norepinephrine | `neutral` (not a contraindication — SCCM 2024 recommends corticosteroids in severe bacterial CAP); sets `steroid-before-pressor` and the pharmacist asks whether a vasopressor is starting. The trap "steroids *instead of* a vasopressor" is tested by the `vasopressor` decision |
| 5th bolus (> 2 L) | `contraindicated`; overload event on the 5th |
| Intubation (GCS ≥ 9 or no vasopressor) | `contraindicated`, BP drops on induction |
| Azithromycin + moxifloxacin together | the second one is `contraindicated` (QT stacking) |
| Ward admission | `contraindicated` |
| Antibiotics after 60 min | `abx-late` (critical event, BP/GCS step down), `r-abx-1h` lost, case continues in `reassess-late` with a rising lactate |
| Antibiotic before blood cultures | `cultures-first` never set (`r-cultures` lost); nurse notes the lower yield |
| Moxifloxacin alone | treats physiologically (`abx-given`) but `obj-hour1` also needs a β-lactam (`beta-lactam-given`); `r-abx-regimen` lost |
| Azithromycin alone | not an effective regimen (sets only `atypical-cover`/`any-abx`): the hypotension trends continue and `abx-late` still fires at 60 min |
| Piperacillin–tazobactam, vancomycin | `neutral` with stewardship feedback (vancomycin alone does not count as an effective CAP antibiotic) |

## Decisions

`abx-timing` (single; unlocks once the chest is auscultated **and** the lactate result is read, because its stem cites the raised lactate), `abx-regimen` (select-all: ceftriaxone + azithromycin **and** ceftriaxone + moxifloxacin), `vasopressor` (single; unlocks after ≥ 3 boluses **and** the post-fluid perfusion re-examination, `ex-reassess-perfusion` or `-late`, because its stem is "reassessing after the initial fluid boluses"), `sepsis3` (single; unlocks after lactate, blood count, chemistry, norepinephrine **and** a post-resuscitation lactate, because its feedback cites the platelets and the repeat lactate), `curb65` (single). Every option has bilingual feedback. Answering is free and unlimited, so first-attempt accuracy is scored (`r-dx` uses `decidedFirstTry: sepsis3`; `r-reasoning` needs `abx-timing`, `vasopressor` and `curb65` right first time).

## Numbers check (also in `extensions.authorChecks`)

* MAP = (84 + 2×48)/3 = 60 mmHg; shock index 1.4; qSOFA 3; NEWS2 16.
* CURB-65 = 4: confusion, urea 11.8 mmol/L (> 7), SBP 84 (< 90), age 72; **RR 28 does not score**.
* SOFA without respiratory ≥ 5 (GCS 14, MAP < 70, creatinine 156 µmol/L, platelets 132 ×10⁹/L, bilirubin 24 µmol/L); CV becomes 3 on norepinephrine ≤ 0.1 µg/kg/min. No ABG, so P/F and respiratory SOFA are explicitly unknown.
* Anion gap = 133 − (98 + 16) = 19 mmol/L; albumin-corrected (32 g/L) ≈ 21; Δ/Δ = 9/8 ≈ 1.1. Post-resuscitation 134 − (100 + 17) = 17 (≈ 20 corrected for albumin 29 g/L; the fall of ~1 matches the lactate fall of 1.0).
* VBG pH 7.35 / pCO₂ 3.9 kPa (29 mmHg) → HCO₃⁻ 15.8, BE −8.7 (Henderson–Hasselbalch, Van Slyke); Winter's expected arterial pCO₂ 32 ± 2 mmHg → concurrent respiratory alkalosis. Repeat gases 7.33/3.7 kPa → 14.6/−10.1 and 7.36/4.0 kPa (30 mmHg) → 16.8/−7.6 (lactate 4.6 → 3.6 mmol/L, 22 %).
* Delayed-antibiotic phase: pH 7.29 / pCO₂ 27 mmHg (3.6 kPa) → HCO₃⁻ 12.8, BE −12.3 (Winter's expected arterial pCO₂ 27 ± 2); AG 134 − (100 + 13) = 21 (≈ 24 corrected for albumin 29); creatinine 174/78 = 2.2 × baseline (KDIGO 2); urea 12.9 mmol/L ≈ BUN 36 mg/dL; lactate 4.6 → 5.8 (+26 %).
* Glucose-corrected Na ≈ 135 mmol/L; urea 11.8 mmol/L ≈ BUN 33 mg/dL; creatinine 156 µmol/L ≈ 1.76 mg/dL; KDIGO 156/78 = 2.0 → stage 2; Cockcroft–Gault ≈ 27 mL/min (unreliable in AKI); baseline eGFR (CKD-EPI 2021) ≈ 70.
* 30 mL/kg × 60 kg = 1800 mL; norepinephrine 0.05 µg/kg/min = 3 µg/min ≈ 11 mL/h at 16 µg/mL; urine target 0.5 mL/kg/h = 30 mL/h; 4AT = 0 + 2 + 1 + 4 = 7.
* Units: SI throughout (kPa for gases with mmHg in parentheses; µmol/L, mmol/L, g/L, µg/L, ng/L); blood pressure in mmHg.

## Facility requirements (capability vocabulary)

`cardiac-monitor`, `oxygen`, `iv-access`, `infusion-pump`, `medications`, `airway`, `ventilator`, `point-of-care`, `lab-blood-gas`, `lab-hematology`, `lab-chemistry`, `lab-microbiology`, `lab-urinalysis`, `xray`, `ct`, `ecg-12lead`, `ultrasound`, `records`; otoscopy uses the personal kit. Waypoints also target `board`, `patient` and the `icu` room kind.

## Teaching notes for facilitators

* The daughter is the main historian (`persona.companion.answersHistory: true`), so button-style asks are spoken by the companion. Every answer labels its speakers — "（病人）…（女儿）…" / "(Patient) … (Daughter) …", the same convention as `persona.concerns` — so an authored answer reads correctly whichever agent voices it. The patient can name her symptoms but is disoriented (4AT 7); `hx-identity` (name, age, who the daughter is) and `hx-orientation` (thinks it is morning at the community clinic) keep those common questions out of the "we don't know" fallback.
* Timeline: confusion from ~15:00–16:00, another ibuprofen at ~17:00 because the daughter put it down to the fever, taxi in the evening, arrival 21:25 (`hx-course`); she had not seen a doctor for this illness (`hx-course`, `hx-recent-healthcare`).
* A repeat gas ordered as another VBG in a reassessment phase counts as the repeat lactate for `obj-perfusion` and `r-lactate` (the learner did repeat it); `assess()` still lists `lactate-repeat` under `essentialMissing` in that path because alternatives are not phase-aware.
* A near-normal venous pH hides a significant metabolic acidosis — use it to teach Winter's formula and the delta ratio.
* The transient bolus response is deliberate: ask "what does a pressure that rises and falls back tell you?" before the vasopressor decision.
* Steroids: SSC 2021 suggests hydrocortisone 200 mg/day for an ongoing vasopressor requirement; the SCCM 2024 focused update recommends corticosteroids in severe bacterial CAP (CAPE COD excluded patients in septic shock). Giving hydrocortisone early is therefore not scored as unsafe — the trap is steroids *instead of* a vasopressor.
* Macrolide resistance in *S. pneumoniae* is high in China: a macrolide is the partner to a β-lactam, never monotherapy.
* Communication items (`r-comm-family`, `r-comm-team`) are judged by the examiner agent from the transcript.

## References

* Evans L, et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021. Crit Care Med 2021; Intensive Care Med 2021.
* Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA 2016.
* Levy MM, Evans LE, Rhodes A. The Surviving Sepsis Campaign Bundle: 2018 Update. Crit Care Med 2018.
* Metlay JP, et al. Diagnosis and Treatment of Adults with Community-acquired Pneumonia (ATS/IDSA). Am J Respir Crit Care Med 2019.
* Martin-Loeches I, et al. ERS/ESICM/ESCMID/ALAT guidelines for the management of severe community-acquired pneumonia. Intensive Care Med 2023.
* 中华医学会呼吸病学分会. 中国成人社区获得性肺炎诊断和治疗指南（2016年版）. 中华结核和呼吸杂志 2016.
* 中国医师协会急诊医师分会, 中国研究型医院学会休克与脓毒症专业委员会. 中国脓毒症/脓毒性休克急诊治疗指南（2018）.
* Lim WS, et al. Defining community acquired pneumonia severity on presentation to hospital (CURB-65). Thorax 2003.
* O'Driscoll BR, et al. BTS guideline for oxygen use in adults in healthcare and emergency settings. Thorax 2017.
* KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl 2012.
* Dequin PF, et al. Hydrocortisone in Severe Community-Acquired Pneumonia. N Engl J Med 2023.
* Chaudhuri D, et al. 2024 Focused Update: Guidelines on Use of Corticosteroids in Sepsis, Acute Respiratory Distress Syndrome, and Community-Acquired Pneumonia. Crit Care Med 2024.
* Royal College of Physicians. National Early Warning Score (NEWS) 2. 2017.
* Bellelli G, et al. Validation of the 4AT, a new instrument for rapid delirium screening. Age Ageing 2014.

## Validation

```bash
clinicalcraft cases validate packages/content/cases/septic-shock-cap/case.json
clinicalcraft cases verify septic-shock-cap
```

The reference `solution` completes all 6 objectives and all 5 decisions with no rejections, no contraindicated interventions and no critical alarms (deterministic rubric 19/19). `extensions.testUtterances` (82 utterances, zh-CN + en, including colloquial Chinese, typos and abbreviations) all return the expected history item as the top `matchHistory` hit and are selected under the patient pipeline's ≥ 0.55 rule.

## Matcher notes

* Short Chinese questions are scored by longest common substring, so generic frames ("有没有…", "…有没有问题", "什么时候…的", "…多少") used to select unrelated items ("有没有心慌？" answered with the haemoptysis fact). Questions and keywords were rephrased so no content-free frame selects an item, except where the frame itself carries the topic ("哪里…" → the only pain is chest pain; "家里人有没有…" → family history).
* `excludeKeywords` separate look-alike items: cough vs haemoptysis/pain, intake vs urinary symptoms ("小便疼") and diabetes ("糖尿"), regular vs fever medicines, the patient's own vs family history.
* History now also covers focal neurological symptoms (`hx-neuro-sx`), palpitations/dizziness/syncope (`hx-cvs-sx`) and flu-like symptoms (`hx-flu-sx`); `hx-pmh` states no stroke, cancer or immunosuppression and her home glucose monitoring; `hx-rigors` mentions the sweats.

## 中文摘要

72岁女性，发热、咳嗽2天，今日下午出现意识模糊，夜间急诊抢救室就诊。考核要点：ABCDE评估、依赖家属采集病史、Sepsis-3定义、抗菌药物前留取血培养且不延误、1小时内β-内酰胺+大环内酯、平衡晶体液分次推注并复评、外周起始去甲肾上腺素、复查乳酸、CURB-65（4分，RR 28不计分）、收入ICU；常见错误（先做CT、多巴胺一线、以激素代替升压药、限制补液、无指征插管、收普通病房）均可被选择并有后果。抗菌药物超过60分钟才给时进入“延迟抗菌后再评估”阶段（复查乳酸5.8 mmol/L、不降反升）。所有数值均为虚构，并已核对阴离子间隙、校正钠、MAP、血气代偿和各项评分的一致性。
