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
| phases | `ed` 急诊抢救室 → `cath` 导管室 (automatic once he has been transferred **and** the lab activated) → `post-pci` 导管室 · PCI术后 (automatic once the angiography/PCI result is ready); none learner-switchable |
| clock | simulated, starts 09:10, `realtimeScale` 1, limit 120 min; costs: ask 0.5, examine 1, order 0.5, read 0.5, intervene 1.5 min |
| difficulty | 3 / 5 |
| content | 41 history items (3 `unknown`), 14 exam findings, 17 investigations, 27 interventions, 5 objectives, 4 decisions, 16 rubric items (14 deterministic, 2 examiner-judged), 5 NPC briefs, 92 matcher test utterances |

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

**Bedside monitor (`physiology.monitor`).** He walks into resus off the monitor:
until it is attached the bedside shows only the triage set taken by hand (HR 54,
BP 98/62, RR 18, SpO₂ 96 %, T 36.6 °C — `spotChecks`, static, no alarm, no
rhythm) plus GCS and pain. It is attached by `cardiac-monitoring`, by the
escorted transfer to the cath lab (`transfer-cath-lab`: "with monitor,
defibrillator…") or, in a VF arrest before either, by the team putting the
defibrillator on (`flag: vf-arrest`) — the arrest line now reads "Cardiac
arrest! … The nurse checks the rhythm on the defibrillator: ventricular
fibrillation" in both cases. The atropine response is the nurse feeling the
pulse pick up (the monitor shows the new rhythm when it is on). The defib pads
alone do not attach the monitor (no NIBP or SpO₂ through them).

| Element | Behaviour |
|---|---|
| Trend `rv-sbp-fall` / `rv-dbp-fall` | SBP −0.3/min (floor −15) and DBP −0.15/min (floor −8) until the first fluid bolus or reperfusion, then recovery. Untreated SBP is about 88 mmHg at 35 min. |
| Trend `brady-hr-fall` | HR −0.1/min from minute 10 (floor −8) until atropine or reperfusion. |
| `nitroglycerin` | Always contraindicated in this patient. SBP −28 / DBP −16 mmHg (offset staged at 12/18/25 min), HR −4, GCS −1. The `nitrate-crash` nurse alarm fires once the SBP has actually fallen below 85 after a dose. Fluid and atropine rescue him. |
| `hypotensive-collapse` / `collapse-recovered` | Stacked vasodilators or negative chronotropes (a second nitrate, morphine, IV metoprolol, furosemide) that take the SBP to ≤ 60 mmHg make him barely rousable (GCS 10, nurse alarm). When the SBP is back to ≥ 85 he wakes up again (GCS 14). |
| `fluid-bolus` (500 mL) | SBP +12 / DBP +6 over 10 min, persistent. Indicated while SBP < 100 (not during VF). A 3rd or later bolus with SBP ≥ 110 is flagged as unsafe (RV over-distension). |
| `dobutamine` / `noradrenaline` | Inotrope or vasopressor for hypotension that persists after fluid (dobutamine after 2 boluses, noradrenaline after 1, SBP < 90, not in VF). Typing 去甲肾上腺素 / noradrenaline never selects the adrenaline arrest bolus, and 多巴胺 / dopamine never selects dobutamine. |
| `atropine` 0.5 mg | HR +14 (offset staged at 25/35 min). Indicated if HR < 50, or HR < 60 with SBP < 90, outside cardiac arrest (never in VF). The monitor rhythm label changes to sinus. |
| `vf-arrest` event | At ≥ 35 min, **if the cath lab has not been activated** (or the patient transferred), he goes into VF (`rhythm: ventricular-fibrillation`), RR 0, GCS 3. The engine's arrest rule makes HR, BP and SpO₂ unmeasurable (shown as "---", critical alarms) whatever the trends and earlier drugs add, so the event sets none of them. |
| `defibrillation` (high risk, defibrillator) | During VF it triggers the `rosc` event (`absolute`): exactly sinus 92, BP 88/56 (a warning alarm: post-ROSC hypotension), RR 20, SpO₂ 93, GCS 12, pain 5, ST elevation persists. Pre-arrest fluid, atropine, nitrate or morphine effects and the RV trends no longer add to these; treatment given after ROSC does (a 500 mL bolus brings SBP to about 100). A shock given *before* VF (contraindicated, `early-shock` flag) does not count, so a second shock is needed during VF. |
| `transfer-cath-lab` | Sets `transferred-cath-lab`; with the lab activated this moves the case to the `cath` phase. Contraindicated while in VF without ROSC, and before the cath lab has been activated. A transfer before activation fires `transfer-before-activation` (cath-lab nurse: no activation call, no team, he waits at the door), which fails `r-door-to-lab`; the case stays in `ed` (no angiography result) until the lab is activated. The single `harm` text leads with the missing activation and gives the VF rule as a conditional. |
| `reperfusion` event | Fires when the angiography result is ready in `cath` (`absolute`). Exactly HR 68 sinus, BP 106/66, GCS 15, pain 2, overlay normal: earlier fluid, atropine and analgesic effects and the RV trends stop contributing to these vitals, so the post-PCI values do not depend on what was given in the ED. |
| Bookkeeping events | `ecg-delay` (no ECG read by 10 min → `ecg-late` and a nurse prompt), `troponin-wait` (troponin ready before activation), `activation-before-ecg` (lab activated before any ECG was read), `late-activation` (not activated by 20 min → nurse prompt), all three → `r-no-troponin-wait` unmet, `routine-oxygen` (oxygen given with SpO₂ ≥ 90% before any arrest → `r-no-routine-o2` unmet; oxygen after ROSC is indicated and not flagged), `late-transfer` (still in ED at 60 min). |

Tempting wrong choices you can make: sublingual or IV nitrate, morphine while
hypotensive, furosemide, IV metoprolol, routine oxygen, fondaparinux, tenecteplase
when PCI is available, clopidogrel on top of a ticagrelor load (the reverse,
ticagrelor after clopidogrel, is guideline-endorsed escalation and is not
penalised), UFH plus enoxaparin, CCU admission for
medical therapy, CT aortogram, ABG (radial puncture before radial PCI), D-dimer and
CK-MB, activating the lab before reading an ECG, and transferring before the lab is activated.

## Decisions

- `dx-diagnosis`: inferior STEMI with RV involvement. Distractors are inferior
  STEMI without RV involvement, inferoposterior (LCx), pericarditis, dissection
  and NSTEMI.
- `nitrate-safety`: withhold nitrates, support preload and reperfuse. Unlocks once the 12-lead
  has been read and there is evidence of preload dependence (right-sided leads read, or JVP and
  lung bases examined).
- `reperfusion-strategy`: primary PCI now. Fibrinolysis is right only if the
  expected time from diagnosis to wire crossing is more than 120 min.
- `antithrombotic-bundle` (select all): aspirin + one P2Y12 inhibitor + UFH. Unlocks once the
  12-lead has been read and the bleeding/stroke history has been asked.

The rubric credits the diagnosis and the reperfusion strategy only when they are right at
the first attempt (`decidedFirstTry`), so trying every option does not earn the marks.

## Reference path (`solution`)

ECG ordered at minute 0.5 and read at 6.5. Right-sided leads ordered, cath lab
activated at 8.5, bloods sent, then aspirin. Focused exam (general, JVP, lungs),
right-sided ECG read, and the diagnosis decision. Dissection and bleeding screen,
allergies, medications, both-arm BP and heart sounds. Nitrate decision, then a
500 mL bolus, ticagrelor 180 mg and UFH. Reperfusion and antithrombotic
decisions. Risk factors and ICE, then pads. Transfer at 28.5 min. Angiography
(20 min), post-PCI ECG, and blood results read; finish at about 60 min. Without
VF and in the lab within 60 min, `verifyCase` scores the deterministic rubric at
20/20.

## Clinical numbers (consistency check)

- MAP = (98 + 2 × 62) / 3 = 74 mmHg.
- Anion gap = Na − (Cl + HCO₃) = 139 − (103 + 24) = 12 mmol/L.
- Creatinine 92 µmol/L ≈ 1.04 mg/dL → eGFR (CKD-EPI 2021, male, 58 y) ≈ 83 mL/min/1.73 m².
- VBG pH 7.35 with pCO₂ 5.9 kPa (44 mmHg) and HCO₃ 24 mmol/L (Henderson–Hasselbalch);
  BE −1.1. ABG pH 7.41, PaCO₂ 5.1 kPa (38 mmHg), PaO₂ 10.8 kPa (81 mmHg) ↔ SaO₂ 96%.
- LDL-C (Friedewald) = 6.2 − 0.9 − 2.4/2.2 ≈ 4.2 mmol/L. HbA1c 5.8% = 40 mmol/mol.
- Weight-based doses for 78 kg (his weight is history to elicit, so the dose texts give
  only the per-kg formula or, for tenecteplase, the whole weight-band table; these numbers
  appear in the interventions' `response`s, and the antithrombotic option reads
  "Tenecteplase (weight-banded bolus)"):
  - UFH 70–100 U/kg = 5,500–7,800 U (6,000 U given ≈ 77 U/kg)
  - enoxaparin 0.5 mg/kg ≈ 40 mg
  - tenecteplase 40 mg (70–<80 kg band)
  - dobutamine 2.5–5 µg/kg/min ≈ 0.2–0.4 mg/min
  - noradrenaline 0.05–0.1 µg/kg/min ≈ 4–8 µg/min
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

- The coronary-angiography notice in `orderMatching.warnings` has `"unless"` = phase `cath` or `post-pci`:
  once he is in the cath lab (a phase entered only when the lab has been activated and he has
  been transferred) the result exists and neither the `order_test` tool (`/order`, models, MCP)
  nor the web order panel prints it. It still states a condition ("a result exists only once the
  lab has been activated and the patient is there") rather than an instruction to do it first, as
  CASE_AUTHORING §5 asks, so it reads right wherever it is shown.
- Results are static per phase. The `ed` 12-lead ECG reads "First ED ECG" (sinus
  bradycardia, 54/min) whenever it is ordered, including after a VF/ROSC branch.
  The post-PCI ECG is the `post-pci`-phase result of the same investigation: that phase starts when
  the angiography/PCI result is ready (with the `reperfusion` event), so an ECG ordered in the cath lab
  before the PCI has no record and can never show the reperfusion while the monitor shows bradycardia.
  `obj5-transfer` needs the angiogram read in `cath` and the ECG read in `post-pci`.
- The engine adds intervention effects and trends on top of scenario `setVitals` unless
  the event is `absolute` (`rosc`, `reperfusion`). During VF the arrest rule shows HR,
  BP and SpO₂ as unmeasurable; RR keeps display jitter on top of zero (0–1/min). The
  rhythm label (VF) and the critical alarms are what matter there.
- After atropine the rhythm label stays "sinus" even when the effect has worn off and
  the rate drifts back towards the low 50s.
- Effects end instantly when their duration lapses. Nitrate and atropine offsets
  are split into stages so that BP and HR come back in steps rather than one jump.
- Fluid effects are additive with no dose-response plateau: four 500 mL boluses
  take SBP to about 145 mmHg, which overstates the response of an infarcted RV.
  The 3rd and later boluses at SBP ≥ 110 are scored unsafe and carry the harm text.
- In the `general-hospital` facility the patient is assigned to resus bay 1 (the
  triage note names no bay number). The angiogram needs `fluoroscopy`. The objective 5
  waypoint points to the nearest placement with that capability: from resus that is the
  radiology order and reading console, and from inside the cath lab it is the C-arm. The
  cath lab has no 12-lead ECG cart, so the post-PCI ECG is ordered from an ECG cart in
  resus. Lab tests are ordered at the laboratory workstation.

## Patient matcher notes

- The matcher breaks score ties by declaration order. Specific items therefore come
  before the generic ones they overlap with: allergies, PDE5 inhibitors, recreational
  drugs, family history and last meal come first.
- `hpi-onset` carries generic onset and duration phrases (多久了, 多长时间了,
  "when did it start"). It excludes smoking, blood pressure, statin, cholesterol,
  diabetes, medication and meal words, so 抽烟多久了？ and "how long have you had high
  blood pressure?" reach their own items.
- Some English phrases reduce to one token after stop-words are removed:
  - "come and go" → `come`
  - "into your back" → `back`
  These items carry excludes for everyday speech ("come with you", "I'll be back"),
  and the matcher-hazard phrases "meth" (found inside "something") and "quit" (which
  stems to match "quite") are not used.
- Plain site questions ("Where is the pain?", "Where does it hurt?") reduce to `pain` or
  `hurt`, which half-match every pain item. `pain-site` therefore carries run-together
  keywords matched by containment (`whereisthepain`, `wheresthepain`, `wheredoesithurt`,
  `whereithurts`, `wheredoyoufeelthepain`; `whereexactly` instead of "where exactly",
  whose single token `exact` also matched "what exactly happened?"). `pain-character`
  excludes `wheredoyoufeel` ("what does the pain feel like" shares both its tokens),
  and `pain-radiation` takes "where does the pain go".
- Statements that give a drug ("这是阿司匹林，请嚼碎", "we're giving you a blood thinner")
  do not select the required `medications` item. Selected items credit the learner
  with asking.
- `identity` answers name and age (pseudonym, 58), so offline mode does not answer
  "how old are you?" with the fallback. Its keyword is run-together `howold`, so "is there
  an old ECG?" reaches `prior-ecg` only.
- Co-selections removed in the fifth review: `pain-site` excludes radiation words (放射,
  别的地方, "spread"), `medications` excludes PDE5-inhibitor words (Viagra, 伟哥), and
  `assoc-dyspnoea` excludes pleuritic phrasing ("hurt to breathe", 吸气时疼), so those
  questions select only `pain-radiation`, `pde5` and `pain-pleuritic`.
- `extensions.testUtterances` ends with a regression set for each collision above.
- Questions about things the case does not record get `persona.fallbackUnknown` or, offline,
  a clarifying question. These are weight change, stress, sleep, urinary, bowel and other
  systems, insurance, and the details listed under `unknowns`. The patient never invents
  a "normal" answer. `pmh-cardiac` excludes urine, bowel, sleep, eye, memory and similar
  words: its "heart problems" keyword would otherwise answer "any X problems?" with the
  cardiac history.

## Intervention matcher notes

- Activation phrasing ("activate the cath lab", "call / page / alert the cath lab", "cath lab
  activation", 启动 / 激活 / 通知 / 联系 / 呼叫导管室) reaches only `activate-cath-lab`:
  `transfer-cath-lab` excludes those verbs, so the transfer is never offered as a candidate.
- `defibrillation` excludes benign defibrillator requests (getting it ready, on standby, nearby,
  at the bedside, checking it, pads, attaching it; 准备除颤仪, 放床边, 电极片) and the word shock
  used for circulation ("cardiogenic", "in shock", "treat the shock", 休克), so they never
  offer a shock; the readiness phrasings reach `defib-pads` instead. "Shock him", "deliver a
  shock", "defibrillate", 除颤 and 电击 still reach `defibrillation`.
- The `nitrate-safety` distractor reads "If the JVP is raised, that means fluid overload…",
  because the decision can unlock through the right-sided leads before the JVP is examined.
- The capillary-glucose reference text is per-locale (随机 3.9–7.8 / random 3.9–7.8).

## Embodied grounding (world policy)

In embodied mode a clinical act needs the kit it names at the bedside and IV access is patient state (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8): the infusions `dobutamine` and `noradrenaline` now also require `iv-access` like the case's other IV drugs (the `iv-access` procedure — "Peripheral IV access and bloods", the crash cart's cannulation kit — first; the reference solution places it first). Blood tests are sampled at the bedside and may be ordered there or, after the cannula and bloods, at the ED records terminal (benchmark `workflow-stemi-labs-at-records-terminal`); the recorded ECG is read at the bedside or a records terminal, never on the cart (`interaction-read-ecg-without-cart`).

Scope of practice: `cpr` (chest compressions) and `defibrillation` are authored `scope: "nursing"`: in the arrest a delegated ED/CCU nurse with ILS/ALS training may give the compressions and the shock (docs/EMBODIED.md §8 scope of practice).

## Validation

```bash
npm run cc -- cases validate packages/content/cases/stemi-inferior-rv/case.json
npm run cc -- cases verify stemi-inferior-rv
```
