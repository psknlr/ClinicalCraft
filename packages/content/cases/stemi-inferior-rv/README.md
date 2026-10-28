# stemi-inferior-rv — Chest pain · 58-year-old man

> **Spoilers for facilitators and case authors.** This guide names the diagnosis. Learners open the case from
> the case library, where the title, summary and tags give nothing away.

**Synthetic case.** A fictional teaching case written for ClinicalCraft, based on no real patient. Every name is a
pseudonym (刘振华（化名）/ Liu Zhenhua; his wife 王丽（化名）/ Wang Li) and every number was written for teaching.
虚构教学病例，不构成医疗建议 / Fictional teaching case — not medical advice.

## 1. Case card

| | |
|---|---|
| id / version | `stemi-inferior-rv` / `1.1.0` |
| setting / facility | `emergency` / `general-hospital` (resus bay 1) |
| specialty | emergency medicine, cardiology |
| difficulty / estimated time | 3 / 5 · 35 min (simulated clock, 120-min limit) |
| languages | `zh-CN` (source), `en` |
| review status | `editorial` (2026-10-28): AI-assisted authoring and editorial review against the guidance listed in §13; **not yet reviewed by a licensed clinician** — have an emergency physician or cardiologist review it before teaching use |
| phases | `ed` 急诊抢救室 → `cath` 导管室 (automatic once he has been transferred **and** the lab activated) → `post-pci` 导管室 · PCI术后 (automatic once the angiography/PCI result is ready); none learner-switchable |
| clock | simulated, starts 09:10, `realtimeScale` 1, limit 120 min; costs: ask 0.5, examine 1, order 0.5, read 0.5, intervene 1.5 min |
| content | 41 history items (3 `unknown`), 14 exam findings, 17 investigations, 27 interventions, 6 learning outcomes, 5 objectives, 4 decisions, 16 rubric items (14 deterministic, 2 examiner-judged), 5 NPC briefs, 92 matcher test utterances |

## 2. Learning outcomes

After the case the learner can:

1. Acquire and interpret a 12-lead ECG within 10 minutes of arrival, localising an inferior STEMI to the right
   coronary artery from ST elevation in II, III and aVF (III > II) with reciprocal depression in I and aVL.
2. Record right-sided (V4R) and posterior leads in inferior STEMI, and recognise right-ventricular involvement from
   them and from the bedside triad of hypotension, raised JVP and clear lungs.
3. Withhold nitrates, diuretics and IV beta-blockers in right-ventricular infarction; support preload with cautious
   fluid boluses, reassessing after each; reserve atropine for symptomatic bradycardia.
4. Activate the cath lab for primary PCI on the ECG alone, without waiting for troponin; state the ESC 2023 target
   (STEMI diagnosis to wire crossing ≤ 60 min) and when fibrinolysis is chosen instead (expected delay > 120 min).
5. After screening for bleeding and aortic dissection, give the pre-PCI antithrombotic bundle (aspirin + one P2Y12
   inhibitor + UFH), avoiding fondaparinux and dual P2Y12 loading.
6. Anticipate VF in the first hours (continuous monitoring, pads on), withhold routine oxygen while SpO₂ ≥ 90%, and
   hand over to the cath-lab team with SBAR.

These are the case's `learningOutcomes`; the HUD `objectives` (§5) are the in-game task list.

## 3. Clinical summary

A 58-year-old smoker (38 pack-years) with hypertension and untreated dyslipidaemia (he stopped atorvastatin after
three months) walks into the ED with his wife at 09:10. Crushing retrosternal pain began at about 08:00 while he
carried files upstairs; it radiates to the jaw and left arm, with a drenching sweat, nausea and light-headedness on
standing. Two weeks of exertional chest tightness preceded it. Father died suddenly at 62; younger brother stented
at 52.

- **Diagnosis:** acute inferior STEMI with right-ventricular involvement from a proximal RCA occlusion (proximal to
  the RV branch).
- **Key findings:** sinus bradycardia 54/min, BP 98/62 mmHg (MAP 74), SpO₂ 96 % on air; grey, clammy, capillary refill
  ≈ 3 s; JVP 5 cm above the sternal angle with Kussmaul's sign; clear lungs; equal arm pressures. ECG: convex ST
  elevation III 3.0 > aVF 2.5 > II 1.5 mm, reciprocal depression aVL 2.0 / I 1.0 mm, V1 +0.5 mm; V4R +1.5 mm,
  V3R +1.0 mm; no posterior (V7–V9) elevation. POCUS: dilated, hypokinetic RV (TAPSE 13 mm), inferior LV
  hypokinesis, no effusion.
- **Outcome:** primary PCI via the right radial artery — one drug-eluting stent to the proximal RCA, final TIMI 3
  flow, patent RV branch, pain 2/10; post-PCI ST resolution > 70 %.

## 4. Scenario timeline and physiology

Baseline: HR 54 sinus bradycardia, BP 98/62 (MAP 74), RR 18, SpO₂ 96 % on room air, T 36.6 °C, GCS 15, capillary
glucose 8.6 mmol/L, pain 8/10. The monitor overlay shows ST elevation. Alarms use the adult limits, set explicitly.

**Bedside monitor (`physiology.monitor`).** He walks into resus off the monitor: until it is attached the bedside
shows only the triage set taken by hand (HR 54, BP 98/62, RR 18, SpO₂ 96 %, T 36.6 °C — `spotChecks`, static, no
alarm, no rhythm) plus GCS and pain. It is attached by `cardiac-monitoring`, by the escorted transfer to the cath lab
(`transfer-cath-lab`: "with monitor, defibrillator…") or, in a VF arrest before either, by the team putting the
defibrillator on (`flag: vf-arrest`) — the arrest line reads "Cardiac arrest! … The nurse checks the rhythm on the
defibrillator: ventricular fibrillation" in both cases. The atropine response is the nurse feeling the pulse pick up
(the monitor shows the new rhythm when it is on). The defib pads alone do not attach the monitor (no NIBP or SpO₂
through them).

| Minute / trigger | What happens |
|---|---|
| 0 | Arrival in resus; triage set by hand; no IV access. |
| 10, no ECG read | `ecg-delay`: nurse prompt; `ecg-late` (fails `r-ecg-10min`). |
| from 10 | Trend `brady-hr-fall`: HR −0.1/min (floor −8) until atropine or reperfusion. |
| from 0 | Trends `rv-sbp-fall` / `rv-dbp-fall`: SBP −0.3/min (floor −15), DBP −0.15/min (floor −8) until the first fluid bolus or reperfusion, then recovery. Untreated SBP is about 88 mmHg at 35 min. |
| 20, not activated | `late-activation`: nurse prompt ("what's the plan?"); fails `r-no-troponin-wait`. |
| troponin ready before activation | `troponin-wait` (fails `r-no-troponin-wait`). |
| ≥ 35, neither activated nor transferred | `vf-arrest`: VF, RR 0, GCS 3. The engine's arrest rule shows HR, BP and SpO₂ as unmeasurable ("---", critical alarms) whatever the trends and earlier drugs add, so the event sets none of them. |
| defibrillation during VF | `rosc` (`absolute`): exactly sinus 92, BP 88/56 (warning alarm: post-ROSC hypotension), RR 20, SpO₂ 93, GCS 12, pain 5, ST elevation persists. Pre-arrest fluid, atropine, nitrate or morphine effects and the RV trends no longer add to these; treatment after ROSC does (a 500 mL bolus brings SBP to about 100). A shock *before* VF (contraindicated, `early-shock`) does not count, so a second shock is needed during VF. |
| transfer with the lab activated | Phase `cath` (the cath-lab table). |
| angiography result ready in `cath` | `reperfusion` (`absolute`): exactly HR 68 sinus, BP 106/66, GCS 15, pain 2, overlay normal; phase `post-pci`. |
| 60, not transferred | `late-transfer` (fails `r-door-to-lab`). |

| Intervention | Behaviour |
|---|---|
| `nitroglycerin` | Always contraindicated in this patient. SBP −28 / DBP −16 mmHg (offset staged at 12/18/25 min), HR −4, GCS −1. The `nitrate-crash` nurse alarm fires once the SBP has actually fallen below 85 after a dose. Fluid and atropine rescue him. |
| `hypotensive-collapse` / `collapse-recovered` | Stacked vasodilators or negative chronotropes (a second nitrate, morphine, IV metoprolol, furosemide) that take the SBP to ≤ 60 mmHg make him barely rousable (GCS 10, nurse alarm). When the SBP is back to ≥ 85 he wakes up again (GCS 14). |
| `fluid-bolus` (500 mL) | SBP +12 / DBP +6 over 10 min, persistent. Indicated while SBP < 100 (not during VF). A 3rd or later bolus with SBP ≥ 110 is flagged as unsafe (RV over-distension). |
| `dobutamine` / `noradrenaline` | Inotrope or vasopressor for hypotension that persists after fluid (dobutamine after 2 boluses, noradrenaline after 1, SBP < 90, not in VF). Typing 去甲肾上腺素 / noradrenaline never selects the adrenaline arrest bolus, and 多巴胺 / dopamine never selects dobutamine. |
| `atropine` 0.5 mg | HR +14 (offset staged at 25/35 min). Indicated if HR < 50, or HR < 60 with SBP < 90, outside cardiac arrest (never in VF). The monitor rhythm label changes to sinus. |
| `defibrillation` (high risk, defibrillator) | Triggers `rosc` during VF (above). |
| `transfer-cath-lab` | Sets `transferred-cath-lab`; with the lab activated this moves the case to `cath`. Contraindicated while in VF without ROSC, and before the cath lab has been activated. A transfer before activation fires `transfer-before-activation` (cath-lab nurse: no activation call, no team, he waits at the door), which fails `r-door-to-lab`; the case stays in `ed` (no angiography result) until the lab is activated. The single `harm` text leads with the missing activation and gives the VF rule as a conditional. |
| Bookkeeping events | `activation-before-ecg` (lab activated before any ECG was read → `r-no-troponin-wait` unmet), `routine-oxygen` (oxygen with SpO₂ ≥ 90 % before any arrest → `r-no-routine-o2` unmet; oxygen after ROSC is indicated and not flagged). |

Tempting wrong choices the learner can make: sublingual or IV nitrate, morphine while hypotensive, furosemide, IV
metoprolol, routine oxygen, fondaparinux, tenecteplase when PCI is available, clopidogrel on top of a ticagrelor load
(the reverse, ticagrelor after clopidogrel, is guideline-endorsed escalation and is not penalised), UFH plus
enoxaparin, CCU admission for medical therapy, CT aortogram, ABG (radial puncture before radial PCI), D-dimer and
CK-MB, activating the lab before reading an ECG, and transferring before the lab is activated.

## 5. Decisions and assessment

**Objectives (HUD):** `obj1-initial` (ECG read in `ed`, onset and character asked, general inspection) →
`obj2-ecg` (right-sided leads read, diagnosis decided) → `obj3-bedside` (JVP and lungs examined, nitrate decision,
fluid bolus) → `obj4-definitive` (reperfusion and antithrombotic decisions, lab activated, aspirin + P2Y12 +
anticoagulant) → `obj5-transfer` (angiogram read in `cath`, ECG read in `post-pci`). Hints coach with questions
("How does III compare with II?", "Which routine chest-pain drugs are dangerous in this haemodynamic state?") and
never state a result.

**Decisions:**

- `dx-diagnosis` (after the 12-lead and the extended leads are read): inferior STEMI with RV involvement.
  Distractors: inferior STEMI without RV involvement, inferoposterior (LCx), pericarditis, dissection, NSTEMI.
- `nitrate-safety` (after the 12-lead and evidence of preload dependence — right-sided leads read, or JVP and lung
  bases examined): withhold nitrates, support preload, reperfuse. The distractor reads "If the JVP is raised, that
  means fluid overload…", because the decision can unlock through the right-sided leads before the JVP is examined.
- `reperfusion-strategy` (after the 12-lead): primary PCI now; fibrinolysis only if the expected diagnosis-to-wire
  time exceeds 120 min.
- `antithrombotic-bundle` (select all; after the 12-lead and the bleeding/stroke history): aspirin + one P2Y12
  inhibitor + UFH.

**Rubric** (deterministic total 22; the reference path scores 22/22):

| id | domain | weight | met when |
|---|---|---:|---|
| `r-pain-history` | history | 1 | onset, character, radiation and sweating asked |
| `r-contraindication-screen` | history | 1 | dissection screen and bleeding history asked |
| `r-rv-exam` | examination | 1 | JVP, lungs and both-arm BP examined |
| `r-ecg-10min` | investigations | 2 | ECG read in `ed` and no `ecg-late` |
| `r-right-leads` | investigations | 1 | right-sided leads read |
| `r-diagnosis` | diagnosis | 2 | `dx-diagnosis` right at the first attempt |
| `r-no-troponin-wait` | management | 2 | activated, not after troponin, not late, not before an ECG |
| `r-reperfusion-choice` | management | 1 | `reperfusion-strategy` right at the first attempt |
| `r-antithrombotics` | management | 2 | aspirin + P2Y12 + anticoagulant given |
| `r-fluid` | management | 1 | fluid bolus given |
| `r-no-nitrate` | safety | **3** | no nitroglycerin |
| `r-no-routine-o2` | safety | 1 | no `routine-oxygen` flag |
| `r-no-harmful-drugs` | safety | **2** | no tenecteplase, fondaparinux, furosemide, IV metoprolol or CCU admission |
| `r-door-to-lab` | efficiency | 2 | transferred after activation, before 60 min, no VF |
| `r-explain-consent` | communication | 1 | examiner-judged (plain explanation, consent, his fear) |
| `r-handover` | communication | 1 | examiner-judged (SBAR, read-back) |

**How wrong choices score.** The diagnosis and reperfusion items need the first attempt to be right
(`decidedFirstTry`), so trying every option earns nothing. A nitrate costs 3 points plus the physiological crash; any
of the five harmful options costs 2; routine oxygen, troponin-waiting, a late ECG, a transfer before activation and a
VF arrest each fail their own item. Contraindicated interventions are also logged as safety events with their `harm`
text.

## 6. Reference path (`solution`)

ECG ordered at minute 0.5 and read at 6.5; monitor and IV access with bloods before the history. Right-sided leads
ordered, cath lab activated at 8.5, bloods sent, then aspirin. Focused exam (general, JVP, lungs), right-sided ECG
read, and the diagnosis decision. Dissection and bleeding screen, allergies, medications, both-arm BP and heart
sounds. Nitrate decision, then a 500 mL bolus, ticagrelor 180 mg and UFH. Reperfusion and antithrombotic decisions.
Risk factors and ICE, then pads. Transfer at 28.5 min. Angiography (20 min), post-PCI ECG, and blood results read;
finish at 60.5 min. Without VF and in the lab within 60 min, the deterministic rubric scores 22/22 (100 %).

## 7. Clinical numbers check

- MAP = (98 + 2 × 62) / 3 = 74 mmHg.
- Anion gap = Na − (Cl + HCO₃) = 139 − (103 + 24) = 12 mmol/L.
- Creatinine 92 µmol/L ≈ 1.04 mg/dL → eGFR (CKD-EPI 2021, male, 58 y) ≈ 83 mL/min/1.73 m².
- VBG pH 7.35 with pCO₂ 5.9 kPa (44 mmHg) and HCO₃ 24 mmol/L (Henderson–Hasselbalch 7.36); BE −1.1. ABG pH 7.41,
  PaCO₂ 5.1 kPa (38 mmHg), PaO₂ 10.8 kPa (81 mmHg) ↔ SaO₂ 96 %; A–a gradient on air ≈ 21 mmHg.
- LDL-C (Friedewald) = 6.2 − 0.9 − 2.4/2.2 ≈ 4.2 mmol/L; mg/dL conversions ×38.67 (cholesterol), ×88.57 (TG).
  HbA1c 5.8 % = 40 mmol/mol. Glucose 8.6 mmol/L ≈ 155 mg/dL (capillary), 8.8 ≈ 159 (plasma).
- Weight-based doses for 78 kg (his weight is history to elicit, so the dose texts give only the per-kg formula or,
  for tenecteplase, the whole weight-band table; these numbers appear in the interventions' `response`s, and the
  antithrombotic option reads "Tenecteplase (weight-banded bolus)"):
  - UFH 70–100 U/kg = 5,500–7,800 U (6,000 U given ≈ 77 U/kg)
  - enoxaparin 0.5 mg/kg ≈ 40 mg
  - tenecteplase 40 mg (70–<80 kg band; 10 mg = 2,000 U)
  - dobutamine 2.5–5 µg/kg/min ≈ 0.2–0.4 mg/min
  - noradrenaline 0.05–0.1 µg/kg/min ≈ 4–8 µg/min
- Smoking: 20/day × 38 years = 38 pack-years. BMI 78 / 1.72² ≈ 26.4 kg/m².
- ECG ST elevation in III fell from 3.0 to 0.5 mm after PCI (> 70 % resolution); post-PCI rate 68/min, as the
  `reperfusion` event sets.

## 8. Facilitator notes

**Debrief questions (PEARLS order).**

1. *Reactions* — "How did that feel? What was going through your mind when the nurse offered a GTN tablet?"
2. *Description* — "Summarise the case in two sentences: what did the ECG show, and what made you look at the right
   ventricle?"
3. *Analysis* —
   - "What did III > II with depression in aVL tell you about the culprit, and what did V4R add?"
   - "Hypotension, a raised JVP and clear lungs: how does that change which drugs you give — and why not furosemide?"
   - "What did you base the cath-lab activation on, and what would waiting for the troponin have cost?"
   - "Which antithrombotics before the lab, which contraindications did you screen first, and why one P2Y12
     inhibitor only?"
   - "His SpO₂ was 96 %. What did you decide about oxygen, and why?"
   - "If he had arrested in resus, what would you have needed at the bedside already?"
   - "Walk me through your handover to the cath-lab team."
4. *Summary* — "What three things will you do in the next inferior STEMI?" (expected: right-sided leads; no nitrates
   until RV involvement is excluded; activate on the ECG).

**Common learner errors and how the case surfaces them.**

| Error | What the case does |
|---|---|
| Waiting for troponin before activating | `troponin-wait` / `late-activation` (nurse prompt at 20 min); `r-no-troponin-wait` lost; VF at 35 min if still not activated |
| Nitrate for ongoing pain | `nitrate-crash` alarm as SBP falls < 85; possible `hypotensive-collapse`; `r-no-nitrate` (3) lost |
| No right-sided leads | `dx-diagnosis` stays locked; `obj2-ecg` incomplete; `r-right-leads` lost |
| Furosemide for the raised JVP | harm text (clear lungs, RV failure); SBP falls; `r-no-harmful-drugs` lost |
| Routine oxygen at SpO₂ 96 % | `routine-oxygen`; `r-no-routine-o2` lost |
| Thrombolysis although PCI is 15 min away | harm text (bleeding, ASSENT-4 PCI); `r-no-harmful-drugs` lost |
| Clopidogrel after ticagrelor | harm text (duplicate P2Y12 inhibition) |
| Transfer before the activation call | `transfer-before-activation` (he waits at the door); `r-door-to-lab` lost |
| Shock with a pulse | `early-shock` (painful; may itself induce VF) |

## 9. Embodied mode

**Grounding the kit** (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8). A clinical act needs the kit it names at the
bedside, and IV access is patient state: the infusions `dobutamine` and `noradrenaline` require `iv-access` like the
case's other IV drugs (the `iv-access` procedure — "Peripheral IV access and bloods", the crash cart's cannulation
kit — first; the reference solution places it first). Blood tests are sampled at the bedside and may be ordered there
or, after the cannula and bloods, at the ED records terminal (benchmark `workflow-stemi-labs-at-records-terminal`);
the recorded ECG is read at the bedside or a records terminal, never on the cart
(`interaction-read-ecg-without-cart`).

**Scope of practice** (EMBODIED §8.3): `cpr` (chest compressions) and `defibrillation` are authored
`scope: "nursing"`: in the arrest a delegated ED/CCU nurse with ILS/ALS training may give the compressions and the
shock.

**Where the patient goes, how he looks** (reviews G8/G12): `transfer-cath-lab` has `destination: {"capability":
"fluoroscopy"}` and `posture: "lying"` — when it is given the team moves him onto the cath-lab table beside the C-arm
(no time charged; his resus trolley is parked there), where the angiogram is then ordered and the post-PCI ECG
recorded (the resus bay's ECG cart is wheeled to the cath lab); the `cath` and `post-pci` phases have the same
`location`, so a phase that starts first moves him too; `cxr-portable` is `performedAt: "bedside"`; `oxygen` names
`device: "nasal-cannula"`. The CT aortogram (dissection screen, not in the reference path) would take him to CT. In
the `general-hospital` facility he is assigned to resus bay 1 (the triage note names no bay). The objective-5
waypoint points to the nearest placement with `fluoroscopy`: from resus the radiology order and reading console,
inside the cath lab the C-arm. Lab tests are ordered at the bedside or a records/laboratory station. Embodied and
clinical scores are equal (100 % in both modes and languages).

## 10. Fidelity limits

- The coronary-angiography notice in `orderMatching.warnings` has `"unless"` = phase `cath` or `post-pci`: once he is
  in the cath lab (entered only when the lab has been activated and he has been transferred) the result exists and
  neither the `order_test` tool (`/order`, models, MCP) nor the web order panel prints it. It states a condition ("a
  result exists only once the lab has been activated and the patient is there"), not an instruction, so it reads
  right wherever it is shown (CASE_AUTHORING §5).
- Results are static per phase. The `ed` 12-lead ECG reads "First ED ECG" (sinus bradycardia, 54/min) whenever it is
  ordered, including after a VF/ROSC branch. The post-PCI ECG is the `post-pci` result of the same investigation:
  that phase starts when the angiography/PCI result is ready (with the `reperfusion` event), so an ECG ordered in the
  cath lab before the PCI has no record and never shows reperfusion while the monitor shows bradycardia.
  `obj5-transfer` needs the angiogram read in `cath` and the ECG read in `post-pci`.
- The engine adds intervention effects and trends on top of scenario `setVitals` unless the event is `absolute`
  (`rosc`, `reperfusion`). During VF the arrest rule shows HR, BP and SpO₂ as unmeasurable; RR keeps display jitter
  on top of zero (0–1/min). The rhythm label (VF) and the critical alarms are what matter there.
- After atropine the rhythm label stays "sinus" even when the effect has worn off and the rate drifts back towards
  the low 50s.
- Effects end instantly when their duration lapses; nitrate and atropine offsets are staged so BP and HR come back in
  steps rather than one jump.
- Fluid effects are additive with no dose-response plateau: four 500 mL boluses take SBP to about 145 mmHg, which
  overstates the response of an infarcted RV. The 3rd and later boluses at SBP ≥ 110 are scored unsafe and carry the
  harm text.
- No temporary pacing intervention is modelled; high-grade AV block does not occur in this script (the debrief names
  pacing for it).
- Prasugrel is not stocked in this ED (the nurse's stock list); the P2Y12 choice is ticagrelor or clopidogrel.

## 11. Matcher notes

**Patient matcher.**

- The matcher breaks score ties by declaration order. Specific items therefore come before the generic ones they
  overlap with: allergies, PDE5 inhibitors, recreational drugs, family history and last meal come first.
- `hpi-onset` carries generic onset and duration phrases (多久了, 多长时间了, "when did it start"). It excludes
  smoking, blood pressure, statin, cholesterol, diabetes, medication and meal words, so 抽烟多久了？ and "how long
  have you had high blood pressure?" reach their own items.
- Some English phrases reduce to one token after stop-words are removed ("come and go" → `come`, "into your back" →
  `back`). These items carry excludes for everyday speech ("come with you", "I'll be back"), and the matcher-hazard
  phrases "meth" (found inside "something") and "quit" (which stems to match "quite") are not used.
- Plain site questions ("Where is the pain?", "Where does it hurt?") reduce to `pain` or `hurt`, which half-match
  every pain item. `pain-site` therefore carries run-together keywords matched by containment (`whereisthepain`,
  `wheresthepain`, `wheredoesithurt`, `whereithurts`, `wheredoyoufeelthepain`; `whereexactly` instead of "where
  exactly", whose single token `exact` also matched "what exactly happened?"). `pain-character` excludes
  `wheredoyoufeel` ("what does the pain feel like" shares both its tokens), and `pain-radiation` takes "where does the
  pain go".
- Statements that give a drug ("这是阿司匹林，请嚼碎", "we're giving you a blood thinner") do not select the required
  `medications` item. Selected items credit the learner with asking.
- `identity` answers name and age (pseudonym, 58), so offline mode does not answer "how old are you?" with the
  fallback. Its keyword is run-together `howold`, so "is there an old ECG?" reaches `prior-ecg` only.
- Co-selections removed in the fifth review: `pain-site` excludes radiation words (放射, 别的地方, "spread"),
  `medications` excludes PDE5-inhibitor words (Viagra, 伟哥), and `assoc-dyspnoea` excludes pleuritic phrasing ("hurt
  to breathe", 吸气时疼), so those questions select only `pain-radiation`, `pde5` and `pain-pleuritic`.
- `extensions.testUtterances` ends with a regression set for each collision above.
- Questions about things the case does not record get `persona.fallbackUnknown` or, offline, a clarifying question:
  weight change, stress, sleep, urinary, bowel and other systems, insurance, and the details listed under `unknowns`.
  The patient never invents a "normal" answer. `pmh-cardiac` excludes urine, bowel, sleep, eye, memory and similar
  words: its "heart problems" keyword would otherwise answer "any X problems?" with the cardiac history.

**Intervention matcher.**

- Activation phrasing ("activate the cath lab", "call / page / alert the cath lab", "cath lab activation", 启动 /
  激活 / 通知 / 联系 / 呼叫导管室) reaches only `activate-cath-lab`: `transfer-cath-lab` excludes those verbs, so the
  transfer is never offered as a candidate.
- `defibrillation` excludes benign defibrillator requests (getting it ready, on standby, nearby, at the bedside,
  checking it, pads, attaching it; 准备除颤仪, 放床边, 电极片) and the word shock used for circulation ("cardiogenic",
  "in shock", "treat the shock", 休克), so they never offer a shock; the readiness phrasings reach `defib-pads`
  instead. "Shock him", "deliver a shock", "defibrillate", 除颤 and 电击 still reach `defibrillation`.
- The capillary-glucose reference text is per-locale (随机 3.9–7.8 / random 3.9–7.8).

## 12. References

The case's `debrief.references` (one Vancouver string each). DOIs were verified on 2026-10-28 by web search, each
returning the publisher's or PubMed's record for that DOI with matching title, journal, volume and pages (the
Crossref API, doi.org and PubMed hosts were not reachable from the editing session). No DOI is given where none
could be verified.

1. Byrne RA, Rossello X, Coughlan JJ, et al. 2023 ESC Guidelines for the management of acute coronary syndromes. Eur
   Heart J. 2023;44(38):3720-3826. doi:10.1093/eurheartj/ehad191
2. Rao SV, O'Donoghue ML, Ruel M, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI guideline for the management of patients with
   acute coronary syndromes. Circulation. 2025;151:e771-e862. doi:10.1161/CIR.0000000000001309
3. O'Gara PT, Kushner FG, Ascheim DD, et al. 2013 ACCF/AHA guideline for the management of ST-elevation myocardial
   infarction. Circulation. 2013;127(4):e362-e425. doi:10.1161/CIR.0b013e3182742cf6 — superseded by ref. 2 overall;
   cited for its detailed right-ventricular infarction section.
4. 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 急性ST段抬高型心肌梗死诊断和治疗指南(2019). 中华心血管病杂志.
   2019;47(10):766-783.
5. Thygesen K, Alpert JS, Jaffe AS, et al. Fourth universal definition of myocardial infarction (2018). Circulation.
   2018;138(20):e618-e651. doi:10.1161/CIR.0000000000000617
6. Soar J, Böttiger BW, Carli P, et al. European Resuscitation Council Guidelines 2025 adult advanced life support.
   Resuscitation. 2025;215(Suppl 1):110769. doi:10.1016/j.resuscitation.2025.110769
7. Wigginton JG, Agarwal S, Bartos JA, et al. Part 9: adult advanced life support: 2025 American Heart Association
   Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care. Circulation. 2025;152(16 Suppl
   2):S538-S577. doi:10.1161/CIR.0000000000001376
8. Soar J, Böttiger BW, Carli P, et al. European Resuscitation Council Guidelines 2021: adult advanced life support.
   Resuscitation. 2021;161:115-151. doi:10.1016/j.resuscitation.2021.02.010
9. Panchal AR, Bartos JA, Cabañas JG, et al. Part 3: adult basic and advanced life support: 2020 American Heart
   Association Guidelines for Cardiopulmonary Resuscitation and Emergency Cardiovascular Care. Circulation.
   2020;142(16 Suppl 2):S366-S468. doi:10.1161/CIR.0000000000000916
10. Stub D, Smith K, Bernard S, et al. Air versus oxygen in ST-segment-elevation myocardial infarction (AVOID).
    Circulation. 2015;131(24):2143-2150. doi:10.1161/CIRCULATIONAHA.114.014494
11. Hofmann R, James SK, Jernberg T, et al. Oxygen therapy in suspected acute myocardial infarction (DETO2X-AMI).
    N Engl J Med. 2017;377(13):1240-1249. doi:10.1056/NEJMoa1706222
12. Kubica J, Adamski P, Ostrowska M, et al. Morphine delays and attenuates ticagrelor exposure and action in patients
    with myocardial infarction: the randomized, double-blind, placebo-controlled IMPRESSION trial. Eur Heart J.
    2016;37(3):245-252. doi:10.1093/eurheartj/ehv547
13. ASSENT-4 PCI investigators. Primary versus tenecteplase-facilitated percutaneous coronary intervention in patients
    with ST-segment elevation acute myocardial infarction (ASSENT-4 PCI): randomised trial. Lancet.
    2006;367(9510):569-578. doi:10.1016/S0140-6736(06)68147-6
14. Yusuf S, Mehta SR, Chrolavicius S, et al. Effects of fondaparinux on mortality and reinfarction in patients with
    acute ST-segment elevation myocardial infarction: the OASIS-6 randomized trial. JAMA. 2006;295(13):1519-1530.
    doi:10.1001/jama.295.13.joc60038

(Trial acronyms in brackets after refs. 10–11 are for the reader here; the case strings give the published titles.)

**Resuscitation content** (VF arrest, bradycardia) was written to ERC 2021 / AHA 2020 and checked against the 2025
guidance as far as it could be read: ERC 2025 keeps adrenaline after the third shock in a shockable rhythm and reports
no major ALS changes since 2021; AHA 2025 keeps atropine 1 mg for bradycardia.

### To verify

- **V4R threshold.** The case teaches ST elevation ≥ 1 mm in V4R (the classic criterion; his V4R shows 1.5 mm, so the
  diagnosis holds either way). The Fourth Universal Definition's own threshold for V3R/V4R (possibly ≥ 0.5 mm) could not
  be read from the primary text.
- **ESC 2023 class for additional leads** (V3R, V4R, V7–V9) in inferior STEMI — tagged "ESC 2023" in the teaching
  point without a class.
- **ERC 2025 bradycardia algorithm** — the atropine first dose (the case keeps ERC 2021's 0.5 mg, "AHA uses 1 mg").
- **AHA 2025 adult cardiac-arrest algorithm** — adrenaline after the second shock in VF (the case keeps the AHA 2020
  wording).
- Ref. 2: the issue number (cited without it); ref. 4: a DOI (none could be verified, so none is given).

## 13. Changelog

### 1.1.0 — 2026-10-28 (editorial review)

- **P2Y12 choice brought up to date.** The clopidogrel response and the `at-p2y12` feedback said "ticagrelor is
  preferred"; they now say a potent P2Y12 inhibitor — ticagrelor or prasugrel — is preferred over clopidogrel (ESC 2023
  favours prasugrel for patients proceeding to PCI, class IIa; ACC/AHA 2025: ticagrelor or prasugrel over clopidogrel),
  and that this ED does not stock prasugrel.
- **Safety items weigh most.** `r-no-nitrate` 2 → 3 and `r-no-harmful-drugs` 1 → 2 (deterministic total 20 → 22).
- **Post-PCI ECG rate** 66 → 68/min, the rate the `reperfusion` event sets.
- **Acting notes** no longer read the monitor ("if his blood pressure falls suddenly", not "if the monitor shows…"):
  he may not be on one (CASE_AUTHORING §6).
- **Teaching points** each name the guidance or trial they rest on.
- **References** normalised to one Vancouver string each, DOIs added after verification; ERC 2025 and AHA 2025 adult
  ALS added beside the 2021/2020 versions; the 2025 ACC/AHA citation completed (volume, pages).
- New `learningOutcomes` (6) and `provenance.review` (`editorial`); version 1.0.0 → 1.1.0.
- README restructured to the facilitator-guide template (PEARLS debrief, common errors, rubric table, Chinese summary).

## 14. Validation

```bash
npm run -s cc -- cases validate packages/content/cases/stemi-inferior-rv/case.json
npm run -s cc -- cases verify stemi-inferior-rv
npx vitest run packages/agent/src/session/embodied-autopilot.test.ts
npm run -s cc -- bench run --agent reference && npm run -s cc -- bench run --agent scripted-llm
npm run -s cc -- bench grounding --split dev && npm run -s cc -- bench grounding --split test --failures 0
```

## 15. 中文摘要

**病例概要。** 58岁男性，吸烟（38包年）、高血压、血脂异常且自行停用他汀，09:10由妻子陪同步入急诊抢救室。约08:00搬文件上楼时突发
胸骨后压榨样疼痛，向下颌和左臂放射，伴大汗、恶心及站立时眼前发黑。诊断为**急性下壁ST段抬高型心肌梗死合并右心室梗死**（右冠近段、
右室支开口近端闭塞）。到院时窦性心动过缓54次/分，血压98/62 mmHg，颈静脉怒张伴Kussmaul征而双肺清晰；心电图II、III、aVF导联ST段
抬高（III > II）伴I、aVL对应性压低，V4R ST段抬高1.5 mm。经桡动脉直接PCI植入支架后TIMI 3级血流，ST段回落 > 70%。

**学习目标。**

1. 到院10分钟内完成并判读12导联心电图，依据III > II及I、aVL对应性压低将下壁STEMI定位于右冠。
2. 加做右胸（V4R）及后壁导联，结合低血压、颈静脉压升高而双肺清晰的三联征识别右心室受累。
3. 右室梗死时不用硝酸酯、利尿剂和静脉β受体阻滞剂；谨慎补液并每次复评；阿托品只用于症状性心动过缓。
4. 仅凭心电图、不等肌钙蛋白即一键启动导管室；说出ESC 2023时间目标（诊断至导丝通过 ≤ 60分钟）及改选溶栓的条件（预计 > 120分钟）。
5. 排查出血和主动脉夹层后给予PCI前抗栓组合（阿司匹林 + 一种P2Y12抑制剂 + 普通肝素），避免磺达肝癸钠和双P2Y12负荷。
6. 预判室颤（持续监护、提前贴电极），SpO₂ ≥ 90%时不常规吸氧，并以SBAR交接。

**关键决策。** ① 诊断：下壁STEMI合并右室梗死（需先判读标准及扩展导联）；② 硝酸酯：不给，先补液维持前负荷、尽快再灌注；③ 再灌注：
立即直接PCI（预计诊断至导丝通过 > 120分钟才选溶栓）；④ 抗栓（多选）：阿司匹林 + 一种P2Y12抑制剂（强效P2Y12抑制剂优先；本院急诊
未备普拉格雷）+ 普通肝素。诊断与再灌注两项须首次作答正确才得分。安全项权重最高：未用硝酸酯3分，未用溶栓/磺达肝癸钠/利尿剂/静脉β
受体阻滞剂/保守收治2分。

**复盘要点（PEARLS）。** 先问感受（护士提议含服硝酸甘油时你怎么想？），再请学员用两句话复述病例，然后分析：III > II与aVL压低提示什么、
V4R补充了什么；低血压 + 颈静脉怒张 + 双肺清晰为何不能用硝酸酯和呋塞米；启动导管室依据什么、等肌钙蛋白的代价；抗栓前排查了哪些禁忌、
为何只用一种P2Y12抑制剂；SpO₂ 96%是否需要吸氧；若在抢救室发生室颤床旁需要提前准备什么；如何向导管室交接。最后总结：下一例下壁
STEMI一定要做的三件事——加做右胸导联、排除右室受累前不用硝酸酯、凭心电图立即启动导管室。常见错误（等肌钙蛋白、含服硝酸甘油、
未做右胸导联、对颈静脉怒张用利尿剂、常规吸氧、可及时PCI仍溶栓、未启动就转运）在病例中都会触发相应的护士提示、生理变化或评分扣分。
