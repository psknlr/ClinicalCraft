# pediatric-asthma — 夜间喘息加重 · 6岁男孩 / Worsening wheeze overnight · 6-year-old boy

> **Synthetic case / 虚构病例.** This is a fictional teaching case written for
> ClinicalCraft V5. It is not based on any real patient, and every name in it
> (林小宇 / Lin Xiaoyu, 陈女士 / Ms Chen, 周敏 / Zhou Min, 何医生 / Dr He) is a
> pseudonym. It is not medical advice.
> 本病例为 ClinicalCraft V5 编写的虚构教学病例，不基于任何真实患者，所有人名均为化名，不构成医疗建议。

| | |
|---|---|
| Setting | Paediatric emergency department (`emergency`, facility `general-hospital`, resus cubicle) |
| Clock | `simulated`, starts 06:10, `realtimeScale` 1, limit 360 min |
| Difficulty | 3 / 5 · about 35 min of play |
| Locales | zh-CN (source), en |
| Learner level | Final-year medical students, foundation/intern doctors, paediatric and ED nurses |

## Scenario

Lin Xiaoyu is 6 years old and weighs 20 kg. He has known asthma and is prescribed
inhaled fluticasone, but his mother gives it only when he is wheezy, and it ran
out two months ago. After a two-day cold, his cough and wheeze got worse
overnight. His mother has given 2 puffs of salbutamol at 1, 3 and 5 a.m. straight
from the inhaler (without the spacer), and each time it helped for only about
30 minutes.

At triage (06:05) he speaks in phrases. RR 38, HR 140, SpO₂ 90 % in room air,
T 37.6 °C, with suprasternal, intercostal and subcostal recession and widespread
inspiratory and expiratory wheeze. PEF is 75 L/min, about 42 % of the predicted
~180 L/min. His PRAM score is 8/12.

His mother answers most history questions (`companion.answersHistory: true`).
She is anxious and feels guilty about stopping the preventer. She also worries
about steroids and growth, and she expects antibiotics and "a drip".

## Learning objectives

1. Grade the severity of an acute paediatric asthma exacerbation at the bedside
   within minutes, using speech, work of breathing, SpO₂, HR, RR, PEF and PRAM.
   Actively exclude life-threatening features.
2. Deliver the first-hour bundle without delay:
   * inhaled salbutamol every 20 min ×3 (pMDI + spacer or an O₂-driven nebuliser)
   * ipratropium add-on
   * oxygen to SpO₂ 94–98 %
   * oral prednisolone within 1 h
3. Take a focused, risk-oriented history from the parent while treatment runs.
   This covers reliever use, previous admissions, ICU or intubation, oral steroid
   courses, controller adherence and technique, smoke exposure, and foreign-body
   and anaphylaxis screens.
4. Reassess at 1 hour with the same tool. Recognise a good response (PRAM 8 → 3)
   and the expected β₂-agonist effects (tachycardia, tremor, hypokalaemia,
   hyperglycaemia, lactate). Reserve IV magnesium for poor response or
   life-threatening features.
5. Apply the discharge criteria and use the visit to improve long-term control:
   * written action plan
   * inhaler-technique teach-back
   * restart the controller
   * smoke-free home advice
   * follow-up within 2 working days
6. Communicate with an anxious, guilty parent and with a frightened 6-year-old.

## Timeline and physiology (reference path)

| Sim minute | Event | Monitor (noise-free, approx.) |
|---|---|---|
| 0 (06:10) | Arrival. HR, RR and SpO₂ warning alarms | HR 140 · RR 38 · SpO₂ 90 · EtCO₂ 31 · BP 104/64 |
| ~5–13 | O₂, salbutamol neb #1, ipratropium #1, sit upright | SpO₂ → 94–95 on O₂ |
| ~15 | Oral prednisolone 40 mg (2 mg/kg) | Steroid effect starts ~120 min later and is complete by ~4 h |
| 26 / 46 | Salbutamol + ipratropium #2 and #3 → `burst-complete` flag | HR rises to ~150–155 from transient β₂ effects |
| ≥ 60 | Automatic phase → **reassess** | On O₂: HR ~153 · RR ~27 · SpO₂ ~98; room-air trial 93 % |
| ~127 | O₂ effect ends (weaned) | SpO₂ ~94–95 in room air |
| ≥ 240 | Automatic phase → **discharge** | HR ~120 · RR ~22–24 · SpO₂ ~95–96 (room air) · EtCO₂ ~35 |

Untreated or delayed course (scenario events and trends):

* **Untreated trends** (they stop when any bronchodilator is given, then recover):
  SpO₂ −0.1/min, RR +0.15/min, HR +0.25/min and EtCO₂ +0.15/min.
* **15 min without a bronchodilator:** the nurse prompts you, and the
  `bronchodilator-delayed` flag is set (rubric).
* **25 min:** `tiring` event. He is down to single words; SpO₂ ~86 %, RR ~44,
  EtCO₂ ~40. IV magnesium becomes *indicated*.
* **45 min:** `life-threatening` event. He is exhausted with shallow breathing;
  SpO₂ ~79 %, EtCO₂ > 50. The reassess phase is now locked. The case can only
  end by escalation:
  1. ≥ 3 bronchodilator rounds
  2. senior review
  3. IV magnesium
  4. **Admit to PICU/HDU** (alternative branches of `obj-reassess` and
     `obj-discharge`)
* **60 min without a systemic steroid:** the nurse prompts you, and the
  `steroid-delayed` flag is set (rubric).

Intervention effects and their appropriateness (the engine evaluates
`contraindicatedWhen` and `indicatedWhen`):

* **Salbutamol (each dose):**
  * SpO₂ +1.2, RR −2.5 and EtCO₂ +1.5, all persistent
  * HR −5 persistent (the work of breathing falls)
  * HR +10 transient (β₂ chronotropy, lasts 90 min)
* **Ipratropium:** RR −0.5. It is *indicated* only in the first-hour phase, and
  `maxDoses` is 3.
* **Prednisolone or IV hydrocortisone:** SpO₂ +2.5, RR −5 and HR −5, with onset at
  120 min and a 120-min ramp (full effect ~4 h after the dose). Giving both is *contraindicated* (duplicate systemic
  steroid).
* **Sedation:** always *contraindicated*. SpO₂ −5, RR −10, EtCO₂ +8, GCS −3.
* **Aminophylline:** *contraindicated* unless life-threatening. HR +15.
* **Discharge home:** *contraindicated* before the discharge phase. It also sets
  the `premature-discharge` flag through a scenario event.
* **Neutral but scored down by the rubric:** antibiotics; routine CXR, VBG, FBC,
  CRP and blood culture (`low-value`); IV magnesium given to a child who is
  responding.

Paediatric alarm limits (6 years):

| Vital | Warning | Critical |
|---|---|---|
| HR | 70–130 | 60 / 170 |
| SBP | 85–125 | 75 / 140 |
| RR | 16–30 | 10 / 45 |
| SpO₂ | < 94 | ≤ 89 |
| EtCO₂ | 25–45 | ≥ 55 |
| GCS | < 14 | ≤ 11 |

## Internal consistency (checked)

* **PRAM.** The score is suprasternal (0/2) + scalene (0/2) + air entry (0–3) +
  wheeze (0–3) + SpO₂ (0–2).

  | Phase | Suprasternal | Scalene | Air entry | Wheeze | SpO₂ | Total |
  |---|---|---|---|---|---|---|
  | Arrival | 2 | 0 | 2 | 2 | 2 | **8** (severe) |
  | 1 h | 0 | 0 | 1 | 1 | 1 | **3** (mild) |
  | Discharge | 0 | 0 | 0 | 0 | 0 | **0** |

  Each score matches the exam findings of its phase.
* **Severity.** By BTS/SIGN, a child over 5 years with any of SpO₂ < 92 %,
  HR > 125, RR > 30, inability to complete sentences or PEF 33–50 % has acute
  severe asthma. None of the life-threatening features is present: PEF < 33 %,
  silent chest, cyanosis, poor effort, agitation, hypotension, exhaustion or
  altered consciousness (the exam states he is frightened but not agitated).
  The Chinese 2016 guideline (≥ 6 years) also grades him 重度 (severe): any one
  severe feature is enough, and he has SpO₂ 0.90 in room air, PEF ≈ 42 % of
  predicted (重度 threshold ≤ 50 % before / ≤ 60 % after SABA) and a tripod
  (前弓位) posture.
* **PEF.** Predicted ≈ 180 L/min (height-based estimate; reference charts vary).

  | Phase | PEF (L/min) | % predicted |
  |---|---|---|
  | Arrival | 75 | 42 % |
  | 1 h | 125 | 69 % |
  | Discharge | 145 | 81 % (> 75 %) |
* **Venous gases.** The anion gap is Na − (Cl + HCO₃).

  | Phase | pH | pCO₂ | HCO₃ | Anion gap | BE |
  |---|---|---|---|---|---|
  | Arrival | 7.40 | 4.9 kPa (37 mmHg) | 22.7 | 138 − (104 + 22.7) = 11.3 | −1.6 |
  | 1 h | 7.38 | 4.8 kPa (36 mmHg) | 21.1 | 139 − (105 + 21.1) = 12.9 | −3.3 |
  | Discharge | 7.39 | 5.1 kPa (38 mmHg) | 22.7 | 138 − (104 + 22.7) = 11.3 | −1.7 |

  The pH values satisfy Henderson–Hasselbalch (0.0307 mmol/L/mmHg) and the BE
  values satisfy the Van Slyke approximation. The laboratory U&E anion gaps are
  11, 13 and 11. The 1 h values show mild hypokalaemia (K⁺ 3.4), hyperglycaemia
  (8.9 mmol/L) and lactate 2.6 mmol/L, which are expected salbutamol effects.
* **FBC.** The differentials sum to the WBC (10.9, 11.6 and 14.6 ×10⁹/L). The
  discharge picture of neutrophilia with eosinopenia is a steroid effect.
* **Doses for 20 kg:**

  | Drug | Dose |
  |---|---|
  | Salbutamol pMDI | 10 × 100 µg = 1 mg |
  | Salbutamol nebulised | 2.5–5 mg (BTS > 5 y: 2.5–5 mg; Chinese guideline ≤ 20 kg: 2.5 mg, so 2.5 mg satisfies both) |
  | Ipratropium | 250 µg |
  | Prednisolone | 40 mg (2 mg/kg, max 40 mg), 3 days |
  | Hydrocortisone | 80 mg (4 mg/kg), 4–6-hourly; Chinese guideline alternative methylprednisolone 1–2 mg/kg (20–40 mg) |
  | MgSO₄ | 800 mg (40 mg/kg, max 2 g) over ≥ 20 min |
  | Aminophylline | load 100 mg (5 mg/kg) over ≥ 20 min with ECG monitoring, then 1 mg/kg/h |
  | Midazolam | 2 mg (0.1 mg/kg) |
  | Amoxicillin | 500 mg q12h (50 mg/kg/day) |
* **Adherence.** EHR: one 120-dose fluticasone inhaler (≈ 60 days as prescribed)
  was dispensed 7 months ago, and the mother says it ran out 2 months ago. That
  is about 40 % of prescribed use, which fits "only when wheezy".
* **Units.** SI throughout both locales. The English text adds conventional units
  in parentheses (mmHg, mg/dL).

## Teaching notes

* **Treat while you assess.** Severity is a bedside judgement. Nothing in the
  first 10 minutes should wait for a test. The case punishes delay through
  trends and events, and it rewards a bronchodilator within 15 min.
* **pMDI + spacer works as well as a nebuliser.** An oxygen-driven nebuliser is
  convenient in a hypoxic child. Ask why his home salbutamol "only worked for
  half an hour": no spacer, poor technique, and a severe attack.
* **Steroids early.** Their benefit takes hours, which is why they belong in the
  first hour. Oral is as effective as IV when the child can swallow, so IV
  hydrocortisone only adds a cannula.
* **Read the tachycardia correctly.** HR 150+ with tremor at 1 hour is the drug,
  not deterioration. The PRAM, speech and air entry tell you about the asthma.
* **Low-value care.** CXR, gases, bloods and antibiotics are not needed here. The
  1-hour VBG and FBC are deliberately "abnormal" (K⁺ 3.4, lactate 2.6,
  neutrophilia) to show how unnecessary tests generate distractors.
* **Every attack is a sentinel event.** Debrief the risk factors: two ED visits
  and two oral steroid courses in a year, controller stopped, no spacer, no
  written plan, a father who smokes, and no flu vaccine.
* **Communication.** Use a non-judgemental adherence conversation. Address
  steroid phobia: low-dose ICS and short oral courses are far safer than
  uncontrolled asthma, but oral courses should be minimised. Explain why
  antibiotics are not indicated, and use teach-back for the red-zone return
  advice.
* **Guideline variation.** Neb salbutamol dosing at exactly 20 kg (BTS
  2.5–5 mg vs Chinese 2.5 mg for ≤ 20 kg), aminophylline (BTS: consider for
  severe or life-threatening asthma unresponsive to maximal therapy; GINA:
  advises against) and post-discharge ICS step-up are good discussion points.
  This case restarts the prescribed low-dose ICS with adherence support, with
  review at the post-attack visit (within 2 working days) and in asthma clinic
  within 1–2 months, per GINA's "check adherence and technique before stepping
  up".

## Fidelity limits (known)

* Results and exam findings are static per phase. If the learner delays
  treatment but still reaches the reassessment phase (the tiring branch), the
  reassessment results describe the reference good response while the monitor
  shows a sicker child. The life-threatening branch avoids this by locking the
  reassess and discharge phases and ending with PICU/HDU admission.
* Exam items and child-voice history items that are restricted to a phase share
  keywords across phases on purpose. Consumers of `matchExam`/`matchHistory`
  should prefer items available in the current phase.

## References

* Global Initiative for Asthma (GINA). Global Strategy for Asthma Management and Prevention, 2024 update.
* British Thoracic Society / Scottish Intercollegiate Guidelines Network. SIGN 158: British guideline on the management of asthma, 2019 (acute asthma in children).
* BTS/NICE/SIGN. Asthma: diagnosis, monitoring and chronic asthma management (NICE guideline NG245), 2024.
* 中华医学会儿科学分会呼吸学组，《中华儿科杂志》编辑委员会. 儿童支气管哮喘诊断与防治指南（2016年版）. 中华儿科杂志, 2016.
* 中华医学会儿科学分会呼吸学组，《中华儿科杂志》编辑委员会. 儿童支气管哮喘规范化诊治建议（2020年版）. 中华儿科杂志, 2020.
* Ducharme FM, et al. The Pediatric Respiratory Assessment Measure: a valid clinical score for assessing acute asthma severity from toddlers to teenagers. J Pediatr, 2008.

## Validation

```bash
clinicalcraft cases validate packages/content/cases/pediatric-asthma/case.json
clinicalcraft cases verify pediatric-asthma
clinicalcraft play pediatric-asthma --provider offline
```

All 36 `extensions.testUtterances` resolve to their expected history item as
the top `matchHistory` hit.
