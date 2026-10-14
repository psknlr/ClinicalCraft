# Chest pain and breathlessness · 52-year-old woman (post-op day 3)

`pulmonary-embolism-postop` · v1.0.0 · inpatient (surgical ward bed) · facility `general-hospital` ·
simulated clock starting 16:20 · difficulty 4 · ~40 min · zh-CN / en

> **Synthetic case — 虚构教学病例.** Every person, date, value and event in this case is invented
> for teaching. It is not based on any identifiable patient. The patient's name ("Lin Yaqin /
> 林雅琴") is a pseudonym. It is not medical advice and does not replace local protocols or
> current guidelines.

## Scenario

A 52-year-old woman is on day 3 after an open right hemicolectomy for colon cancer. While she is
walking back from the toilet she gets sudden right-sided pleuritic chest pain and breathlessness.
On arrival: HR 118, BP 112/70 (MAP 84), RR 26, SpO2 89 % on room air, T 37.4 °C. Her right calf
is swollen. Her prophylactic enoxaparin dose was held the evening before because of minor wound
ooze and was never re-prescribed. The patient discloses this only to a targeted question; it is
also in the nurse's handover and the medication administration record (`mar`).

Diagnosis (hidden from learners): acute bilateral PE with right popliteal–calf DVT, ESC 2019
**intermediate-high** risk.

## Learning objectives (chapters)

1. **Assess and stabilise at the bedside.** Oxygen to 94–98 %, continuous monitoring, onset
   history, chest auscultation, leg examination.
2. **Estimate pre-test probability and choose a diagnostic strategy.** Wells 10 / revised Geneva 16,
   so go straight to CTPA. A D-dimer has no role.
3. **Weigh bleeding risk and start treatment.** Send baseline FBC/coagulation, check the bleeding
   history and the wound, and start anticoagulation *before* the CTPA result. IV UFH is preferred.
4. **Confirm the diagnosis and stratify risk.** CTPA (RV/LV 1.3) and troponin give ESC
   intermediate-high.
5. **Plan monitoring and escalation.** HDU/ICU for 48–72 h, PERT aware, no systemic lysis, and
   rescue reperfusion (catheter-directed/surgical) if she deteriorates.

## Key numbers (all internally consistent)

| Item | Value | Working |
|---|---|---|
| Wells (PE) | **10**, PE likely / high | DVT signs 3 + PE most likely 3 + HR > 100 1.5 + surgery ≤ 4 wk 1.5 + active cancer 1 |
| Revised Geneva | **16**, high | surgery ≤ 1 mo 2 + cancer 2 + unilateral leg pain 3 + HR ≥ 95 5 + deep-vein tenderness & oedema 4 |
| PESI | **122**, class IV | age 52 + cancer 30 + HR ≥ 110 20 + SaO2 < 90 % 20 |
| sPESI | **3** | cancer, HR ≥ 110, SaO2 < 90 % |
| MAP / shock index | 84 mmHg / 1.05 | (112 + 2×70)/3; 118/112 |
| ABG (room air) | pH 7.47, PaCO2 4.1 kPa (31 mmHg), PaO2 7.5 kPa (56 mmHg), HCO3⁻ 22 | acute respiratory alkalosis with appropriate HCO3⁻ |
| A–a gradient | 7.3 kPa (55 mmHg); age-expected ≤ 2.3 kPa (17 mmHg) | 0.21 × (101.3 − 6.3) − 4.1/0.8 − 7.5 |
| Anion gap | 11 mmol/L | 138 − (104 + 23) |
| Creatinine / eGFR | 68 µmol/L / 93 mL/min/1.73 m² (CKD-EPI 2021) | CrCl (Cockcroft–Gault, 70 kg) ≈ 95 mL/min |
| Echo | RV/LV 1.1, TAPSE 14 mm, TR Vmax 3.1 m/s, IVC 2.0 cm < 50 % collapse | PASP ≈ 4 × 3.1² + RAP 8 ≈ 46 mmHg |
| UFH (70 kg) | 5,600 U bolus, then 1,260 U/h | 80 U/kg; 18 U/kg/h; APTT 1.5–2.5 × control at 6 h |
| Enoxaparin (treatment) | 70 mg SC q12h | 1 mg/kg; no renal adjustment |

The same numbers are machine-readable in `extensions.clinicalScores`.

## Scenario engine behaviour

* **Untreated drift.** Until she is anticoagulated (or reperfused), HR rises (+0.2/min, max +10),
  SBP falls (−0.2/min, max −10), RR rises and SpO2 falls. These trends freeze and slowly recover
  once anticoagulation starts.
* **Prompts.**
  * At 10 min without oxygen the nurse prompts (`o2-delayed`).
  * At 35 min without anticoagulation the nurse prompts and mentions the held dose (`anticoag-prompted`).
* **Decompensation.** At 60 min without anticoagulation she becomes **high-risk PE**: SBP ≈ 84,
  HR ≈ 139, GCS 14, SpO2 ≈ 88 % on nasal O2 (flag `high-risk-pe`). At 75 min, if neither PERT nor
  reperfusion has happened, the attending arrives and models the rescue plan (SBP ≈ 78). In that
  branch the following become *indicated*:
  * noradrenaline
  * UFH (with bolus)
  * PERT
  * rescue reperfusion

  After reperfusion she recovers over about 60 minutes.
* **Systemic alteplase** is always contraindicated here (major surgery 3 days ago; while she is
  normotensive there is no indication either, and if she shocks, surgical or catheter-directed
  reperfusion is preferred because of that contraindication). If it is given, wound haemorrhage follows. The `haemorrhage` flag then makes UFH contraindicated and
  an IVC filter *indicated*. This is the only path where a filter is appropriate.
* **Tempting wrong choices** are scored as safety events (contraindicated):
  * a 1 L rapid fluid bolus
  * IV furosemide
  * ketorolac
  * rivaroxaban now
  * IPC on the DVT limb
  * an IVC filter while anticoagulation is possible
  * stacking anticoagulants (LMWH + UFH, or either after a DOAC)
  * a vasopressor while normotensive
  * reperfusion while stable

  A prophylactic-dose enoxaparin is allowed but marked *neutral*: it does not treat VTE.

## Teaching notes

* **Pre-test probability first.** With PE "likely", a negative D-dimer cannot exclude PE. After
  surgery the D-dimer is almost always raised. Ordering it is scored as low value.
* **Anticoagulate while waiting** (ESC 2019 class I, level C), but only after a quick bleeding check:
  * wound
  * Hb and platelets
  * coagulation baseline sent
  * no intracranial pathology
  * surgeons informed
* **UFH versus LMWH after surgery.** LMWH is the guideline default for stable PE (ESC I-A) and is
  *acceptable*. UFH is preferred here for four reasons:
  * a short half-life
  * full protamine reversal
  * titratability
  * compatibility with rescue reperfusion or re-operation

  The decision feedback says this explicitly. She has had LMWH since POD0, so monitor platelets
  for HIT.
* **Why no lysis.** In PEITHO, systemic lysis in intermediate-risk PE prevented decompensation but
  increased major bleeding and haemorrhagic stroke, and did not reduce mortality. Major surgery
  within 3 weeks is a contraindication. ESC 2019 lists it as *absolute*; some other guidance
  (e.g. older AHA statements) calls it *relative*. Contraindications may be re-weighed in an
  immediately life-threatening situation, but catheter-directed therapy or surgical embolectomy
  is the preferred rescue for this patient.
* **Disposition.** Intermediate-high risk means a monitored bed for 48–72 h, PERT aware, and a
  pre-agreed rescue plan. Early discharge or an early oral DOAC is wrong.
* **Prevention lesson.** A held prophylactic dose needs an explicit review and re-prescription.
  Mechanical prophylaxis should be re-offered. Extended (≈ 4-week) pharmacological prophylaxis is
  advised after major abdominal/pelvic cancer surgery.
* **Long term (not simulated).** Her cancer was diagnosed within the last 6 months and is still
  being treated, so it counts as active and this is cancer-associated VTE: anticoagulate for at
  least 6 months, and continue while the cancer remains active (e.g. adjuvant chemotherapy), with
  drug and duration agreed with oncology. Some DOACs carry a higher bleeding risk in luminal GI cancer.
  Thrombophilia testing is not indicated after a surgery-provoked first VTE, and its results are
  distorted during acute thrombosis and on heparin.

## Guideline and evidence references

* Konstantinides SV, et al. 2019 ESC Guidelines for the diagnosis and management of acute pulmonary embolism (with ERS). Eur Heart J. 2020;41(4):543–603.
* Stevens SM, et al. Antithrombotic Therapy for VTE Disease: Second Update of the CHEST Guideline and Expert Panel Report. Chest. 2021;160(6):e545–e608.
* Ortel TL, et al. American Society of Hematology 2020 guidelines for management of VTE: treatment of DVT and PE. Blood Adv. 2020;4(19):4693–4738.
* 中华医学会呼吸病学分会肺栓塞与肺血管病学组, 等. 肺血栓栓塞症诊治与预防指南. 中华医学杂志, 2018, 98(14): 1060–1087.
* NICE NG158. Venous thromboembolic diseases: diagnosis, management and thrombophilia testing. 2020, updated 2023.
* O'Driscoll BR, et al. BTS guideline for oxygen use in adults in healthcare and emergency settings. Thorax. 2017;72(Suppl 1):ii1–ii90.
* Meyer G, et al. Fibrinolysis for patients with intermediate-risk pulmonary embolism (PEITHO). N Engl J Med. 2014;370(15):1402–1411.
* Mismetti P, et al. Retrievable IVC filter plus anticoagulation vs anticoagulation alone (PREPIC2). JAMA. 2015;313(16):1627–1635.
* PREPIC Study Group. Eight-year follow-up of patients with permanent vena cava filters in the prevention of pulmonary embolism (PREPIC). Circulation. 2005;112(3):416–422.
* Wells PS, et al. Derivation of a simple clinical model to categorize patients' probability of pulmonary embolism. Thromb Haemost. 2000;83(3):416–420.
* Jiménez D, et al. Simplification of the pulmonary embolism severity index. Arch Intern Med. 2010;170(15):1383–1389.
* Gould MK, et al. Prevention of VTE in nonorthopedic surgical patients (ACCP 9th ed). Chest. 2012;141(2 Suppl):e227S–e277S.
* Rudski LG, et al. Guidelines for the echocardiographic assessment of the right heart in adults (ASE). J Am Soc Echocardiogr. 2010;23(7):685–713.

## Grounding notes

The following are explicitly *unknown* (history items with `disclosure: "unknown"`, case
`unknowns`, debrief unknowns):

* final tumour pathology and stage
* thrombophilia status
* any prior echocardiogram
* intra-operative details
* the post-heparin APTT/anti-Xa and the later course

The arterial blood gas was drawn by the ward nurse at 16:15 on room air, before the learner
arrived, so its values are consistent whenever it is ordered. The assessment score is a formative
teaching-script measure, not a validated competency score.

## Validation

```bash
clinicalcraft cases validate packages/content/cases/pulmonary-embolism-postop/case.json
clinicalcraft cases verify pulmonary-embolism-postop      # reference solution: all 5 objectives, 4 decisions, 18/18 rubric points
clinicalcraft play pulmonary-embolism-postop --provider offline
```

`extensions.testUtterances` has 40 bilingual paraphrases and serves as the history-matcher
regression corpus.
