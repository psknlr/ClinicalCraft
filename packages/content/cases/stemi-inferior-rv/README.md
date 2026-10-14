# `stemi-inferior-rv`: chest pain, 58-year-old man

> **Spoilers for case authors.** This file names the diagnosis. Learners should
> open the case from the case library, where the title, summary and tags give
> nothing away.

**Synthetic case.** This is a fictional teaching case written for ClinicalCraft.
It is not based on any real patient. Every name is a pseudonym (刘振华（化名）/
Liu Zhenhua; his wife 王丽（化名）/ Wang Li), and every number was written for
teaching. It is not medical advice: 虚构教学病例，不构成医疗建议 / Fictional
teaching case — not medical advice.

A 58-year-old smoker with hypertension and untreated dyslipidaemia walks into the
ED at 09:10. He has had crushing retrosternal pain for about 70 minutes, radiating
to the jaw and left arm, with sweating and nausea. The diagnosis is an **acute
inferior STEMI with right-ventricular (RV) involvement** from a proximal RCA
occlusion. He is in sinus bradycardia at 54/min with a BP of 98/62 mmHg, a raised
JVP with Kussmaul's sign, and clear lungs.

| | |
|---|---|
| id / version | `stemi-inferior-rv` / `1.0.0` |
| setting / facility | `emergency` / `general-hospital` (resus bay) |
| locales | `zh-CN` (source), `en` |
| phases | `ed` 急诊抢救室 → `cath` 导管室 (automatic on transfer; not learner-switchable) |
| clock | simulated, starts 09:10, `realtimeScale` 1, limit 120 min; costs: ask 0.5, examine 1, order 0.5, read 0.5, intervene 1.5 min |
| difficulty | 3 / 5 |
| content | 39 history items (3 `unknown`), 14 exam findings, 17 investigations, 26 interventions, 5 objectives, 4 decisions, 15 rubric items, 5 NPC briefs, 40 matcher test utterances |

## Learning objectives

1. Acquire and read a 12-lead ECG **within 10 minutes** of arrival.
2. Recognise inferior STEMI and localise the culprit. III > II with reciprocal
   depression in I/aVL points to the RCA. Then record **right-sided leads**:
   V4R ST elevation ≥ 1 mm means RV involvement.
3. Spot the RV-infarct haemodynamic triad: hypotension, raised JVP and clear lungs.
   Act on it: **no nitrates**, no diuretics, no IV beta-blocker. Give cautious fluid
   boluses with reassessment. Give atropine only for symptomatic bradycardia.
   Put pads on.
4. Activate the cath lab with a single call for **primary PCI**, without waiting
   for troponin. Load aspirin and one P2Y12 inhibitor, and give UFH.
5. Know the time targets and when fibrinolysis would be right instead.
6. Avoid routine oxygen when SpO₂ ≥ 90%, and use opioids with caution.
7. Hand over safely (SBAR) and confirm reperfusion: TIMI 3 flow and > 70% ST resolution.

## Scenario logic (physiology)

Baseline: HR 54 sinus bradycardia, BP 98/62 (MAP 74), RR 18, SpO₂ 96% on room air,
T 36.6 °C, GCS 15, capillary glucose 8.6 mmol/L, pain 8/10. The monitor overlay
shows ST elevation. Alarms use the adult limits, set explicitly.

| Element | Behaviour |
|---|---|
| Trend `rv-sbp-fall` / `rv-dbp-fall` | SBP −0.3/min (floor −15) and DBP −0.15/min (floor −8) until the first fluid bolus or reperfusion, then recovery. Untreated SBP is about 88 mmHg at 35 min. |
| Trend `brady-hr-fall` | HR −0.1/min from minute 10 (floor −8) until atropine or reperfusion. |
| `nitroglycerin` | Always contraindicated in this patient. SBP −28 / DBP −16 mmHg (offset staged at 12/18/25 min), HR −4, GCS −1. The `nitrate-crash` event fires a nurse alarm. Fluid and atropine rescue him. |
| `fluid-bolus` (500 mL) | SBP +12 / DBP +6 over 10 min, persistent. Indicated while SBP < 100. A 3rd or later bolus with SBP ≥ 110 is flagged as unsafe (RV over-distension). |
| `atropine` 0.5 mg | HR +14 (offset staged at 25/35 min). Indicated if HR < 50, or HR < 60 with SBP < 90. The monitor rhythm label changes to sinus. |
| `vf-arrest` event | At ≥ 35 min, **if the cath lab has not been activated** (or the patient transferred), he goes into VF: HR/BP/RR 0, SpO₂ 45, GCS 3. |
| `defibrillation` (high risk, defibrillator) | During VF it triggers the `rosc` event: sinus 92, BP 88/56 (then falls with the untreated trend), GCS 12, ST elevation persists. A shock given *before* VF (contraindicated, `early-shock` flag) does not count, so a second shock is needed during VF. |
| `transfer-cath-lab` | Sets `transferred-cath-lab` and moves the case to the `cath` phase. Contraindicated while in VF without ROSC. |
| `reperfusion` event | Fires when the angiography result is ready in `cath`. HR 68 sinus, BP 106/66, GCS 15, pain 2, overlay normal; the trends recover. |
| Bookkeeping events | `ecg-delay` (no ECG read by 10 min → `ecg-late` and a nurse prompt), `troponin-wait` (troponin ready before activation), `routine-oxygen` (oxygen given with SpO₂ ≥ 90% before any arrest → `r-no-routine-o2` unmet; oxygen after ROSC is indicated and not flagged), `late-transfer` (still in ED at 60 min). |

Tempting wrong choices you can make: sublingual or IV nitrate, morphine while
hypotensive, furosemide, IV metoprolol, routine oxygen, fondaparinux, tenecteplase
when PCI is available, clopidogrel on top of a ticagrelor load (the reverse,
ticagrelor after clopidogrel, is guideline-endorsed escalation and is not
penalised), UFH plus enoxaparin, CCU admission for
medical therapy, CT aortogram, ABG (radial puncture before radial PCI), D-dimer and
CK-MB.

## Decisions

- `dx-diagnosis`: inferior STEMI with RV involvement. Distractors are inferior
  STEMI without RV involvement, inferoposterior (LCx), pericarditis, dissection
  and NSTEMI.
- `nitrate-safety`: withhold nitrates, support preload and reperfuse.
- `reperfusion-strategy`: primary PCI now. Fibrinolysis is right only if the
  expected time from diagnosis to wire crossing is more than 120 min.
- `antithrombotic-bundle` (select all): aspirin + one P2Y12 inhibitor + UFH.

## Reference path (`solution`)

ECG ordered at minute 0.5 and read at 6.5. Right-sided leads ordered, cath lab
activated at 8.5, bloods sent, then aspirin. Focused exam (general, JVP, lungs),
right-sided ECG read, and the diagnosis decision. Dissection and bleeding screen,
allergies, medications, both-arm BP and heart sounds. Nitrate decision, then a
500 mL bolus, ticagrelor 180 mg and UFH. Reperfusion and antithrombotic
decisions. Risk factors and ICE, then pads. Transfer at 28.5 min. Angiography
(20 min), post-PCI ECG, and blood results read; finish at about 60 min. Without
VF and in the lab within 60 min, `verifyCase` scores the deterministic rubric at
19/19.

## Clinical numbers (consistency check)

- MAP = (98 + 2 × 62) / 3 = 74 mmHg.
- Anion gap = Na − (Cl + HCO₃) = 139 − (103 + 24) = 12 mmol/L.
- Creatinine 92 µmol/L ≈ 1.04 mg/dL → eGFR (CKD-EPI 2021, male, 58 y) ≈ 83 mL/min/1.73 m².
- VBG pH 7.35 with pCO₂ 5.9 kPa (44 mmHg) and HCO₃ 24 mmol/L (Henderson–Hasselbalch);
  BE −1.1. ABG pH 7.41, PaCO₂ 5.1 kPa (38 mmHg), PaO₂ 10.8 kPa (81 mmHg) ↔ SaO₂ 96%.
- LDL-C (Friedewald) = 6.2 − 0.9 − 2.4/2.2 ≈ 4.2 mmol/L. HbA1c 5.8% = 40 mmol/mol.
- Weight-based doses for 78 kg:
  - UFH 70–100 U/kg = 5,500–7,800 U
  - enoxaparin 0.5 mg/kg ≈ 40 mg
  - tenecteplase 40 mg (70–<80 kg band)
  - dobutamine 2.5–5 µg/kg/min ≈ 0.2–0.4 mg/min
- Smoking: 20/day × 38 years = 38 pack-years.
- ECG ST elevation in III fell from 3.0 to 0.5 mm after PCI (> 70% resolution).

## Guideline references

- Byrne RA, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur Heart J. 2023;44(38):3720-3826.
- Rao SV, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for the Management of Patients With Acute Coronary Syndromes. Circulation. 2025.
- O'Gara PT, et al. 2013 ACCF/AHA Guideline for the Management of ST-Elevation Myocardial Infarction. Circulation. 2013;127(4):e362-e425. This guideline covers RV infarction management in detail.
- 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 急性ST段抬高型心肌梗死诊断和治疗指南(2019). 中华心血管病杂志. 2019;47(10):766-783.
- Thygesen K, et al. Fourth Universal Definition of Myocardial Infarction (2018). Circulation. 2018;138(20):e618-e651.
- Soar J, et al. European Resuscitation Council Guidelines 2021: Adult advanced life support. Resuscitation. 2021;161:115-151.
- Panchal AR, et al. Part 3: Adult Basic and Advanced Life Support: 2020 AHA Guidelines for CPR and ECC. Circulation. 2020;142(16 Suppl 2):S366-S468.
- Trials:
  - AVOID (Stub D, et al. Circulation 2015) and DETO2X-AMI (Hofmann R, et al. N Engl J Med 2017): oxygen.
  - IMPRESSION (Kubica J, et al. Eur Heart J 2016): morphine and ticagrelor.
  - ASSENT-4 PCI (Lancet 2006): facilitated PCI.
  - OASIS-6 (Yusuf S, et al. JAMA 2006): fondaparinux in STEMI.

Resuscitation content follows ERC 2021 and AHA 2020. Check it against the 2025
ERC/AHA resuscitation updates before high-stakes use.

## Modelling notes and limitations

- Results are static per phase. The `ed` 12-lead ECG reads "First ED ECG" (sinus
  bradycardia, 54/min) whenever it is ordered, including after a VF/ROSC branch.
  The post-PCI ECG is the `cath`-phase result of the same investigation.
- The engine adds intervention effects and trends on top of scenario `setVitals`.
  So during VF the monitor can show a small residual HR or BP from earlier atropine
  or fluid. The rhythm label (VF) and the critical alarms are what matter there.
- Effects end instantly when their duration lapses. Nitrate and atropine offsets
  are split into stages so that BP and HR come back in steps rather than one jump.
- Fluid effects are additive with no dose-response plateau: four 500 mL boluses
  take SBP to about 145 mmHg, which overstates the response of an infarcted RV.
  The 3rd and later boluses at SBP ≥ 110 are scored unsafe and carry the harm text.
- In the web world, the cath-lab phase needs `fluoroscopy` (C-arm or cath-lab
  equipment) in the `general-hospital` facility.

## Validation

```bash
npm run cc -- cases validate packages/content/cases/stemi-inferior-rv/case.json
npm run cc -- cases verify stemi-inferior-rv
```
