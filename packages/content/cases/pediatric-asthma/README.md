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
   life-threatening features — and recognise those when they happen (the
   delayed-treatment branches below).
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
| ≥ 240 | Automatic phase → **discharge** (also requires a systemic steroid given and noise-free SpO₂ ≥ 95; 95.8 on the reference path) | HR ~120 · RR ~22–24 · SpO₂ ~95–96 (room air) · EtCO₂ ~35 |

Phases are never learner-switchable. Entry rules: **reassess** = arrival +
`burst-complete` + ≥ 60 min + not life-threatening + (not `tiring` **or** IV
magnesium given); **discharge** = reassess objective done + ≥ 240 min +
prednisolone/hydrocortisone given + SpO₂ ≥ 95; **critical** (deterioration) =
arrival + `life-threatening`. The static per-phase results therefore only
appear when the monitor agrees with them.

Untreated or delayed course (scenario events and trends):

* **Untreated trends** (they stop when any bronchodilator is given, then recover):
  SpO₂ −0.1/min, RR +0.15/min, HR +0.25/min and EtCO₂ +0.15/min.
* **15 min without a bronchodilator:** the nurse prompts you, and the
  `bronchodilator-delayed` flag is set (rubric).
* **25 min:** `tiring` event (baseline shift: SpO₂ 88, HR 146, RR 40, EtCO₂ 36).
  He is working harder and starting to tire; SpO₂ ~86 %, RR ~44, EtCO₂ ~40.
  After the three-dose burst he responds only partly (RR ~31–32, still needing
  oxygen); at ≥ 60 min the `ev-poor-response` nurse prompt fires and the
  reassess phase stays locked until IV magnesium is given (Mg is *indicated*
  once the burst is complete). With Mg (+ senior review) he converges on the
  reference trajectory (room-air SpO₂ 95–96 by ~4.5 h) and the case can end
  in discharge.
* **45 min:** `life-threatening` event (SpO₂ 84, HR 150, RR 32, EtCO₂ 46,
  GCS 14). He is exhausted, drowsy and quiet; SpO₂ ~79 %, EtCO₂ > 50. The case
  moves into the **critical** phase, which has its own exam findings (dusky
  lips, single words, poor effort, near-silent chest, GCS 14), PRAM 12/12, a
  venous gas with acute respiratory acidosis, and no room-air trial or PEF
  (`available: false`). `dec-severity`/`dec-first-line` lock if not already
  answered (they are about the arrival assessment); `obj-assess` and
  `obj-first-line` have critical-phase branches. The case can only end by
  escalation:
  1. ≥ 3 bronchodilator rounds
  2. senior review
  3. IV magnesium
  4. **Admit to PICU/HDU** (alternative branches of `obj-reassess` and
     `obj-discharge`); discharge home and ward admission are *contraindicated*.
* **60 min without a systemic steroid:** the nurse prompts you, and the
  `steroid-delayed` flag is set (rubric).
* **≥ 250 min, reassessment done but no steroid or room-air SpO₂ < 95:** the
  `ev-not-settling` nurse prompt fires (the discharge phase is gated, above).

Intervention effects and their appropriateness (the engine evaluates
`contraindicatedWhen` and `indicatedWhen`):

* **Salbutamol (each dose):**
  * SpO₂ +1.2, RR −2.5 and EtCO₂ +1.5, all persistent
  * HR −5 persistent (the work of breathing falls)
  * HR +10 transient (β₂ chronotropy, lasts 90 min)
  * `maxDoses` 6 per route (neb, pMDI). A dose is *contraindicated* (with a
    toxicity/escalation message) from the 9th dose (both routes combined), and
    also when three doses have already been given within the first 30 min in a
    child who is neither `tiring` nor `life-threatening` (rapid-fire dosing
    beyond the 20-minutely first-hour schedule). Back-to-back nebs on the
    tiring or life-threatening branches stay acceptable. Six nebs in total on
    the reference path give RR ~19, SpO₂ ~98, HR ~121 at 4 h; rapid-fire dosing
    still drives the additive effects to implausible values (HR ~200,
    RR ~15), but every dose after the third is now flagged.
  * "IV salbutamol" does not resolve to either inhaled route (exclude
    keywords); the case has no IV salbutamol option.
* **Ipratropium:** RR −0.5. Each of its 3 doses (`maxDoses` 3) is *indicated*,
  whatever the phase. (Declared before salbutamol so that "异丙托溴铵雾化" /
  "ipratropium neb" resolves to ipratropium, not to the generic "雾化/neb".)
* **Nebulised budesonide:** *neutral*, no vital effects (`maxDoses` 3). A
  common choice in Chinese practice (the Chinese guideline allows early
  high-dose nebulised ICS as an adjunct); its response text reminds the learner
  that it does not replace the systemic steroid. Giving it *instead of*
  prednisolone leaves `obj-first-line` open, fires the 60-min steroid prompt
  and keeps the discharge phase locked (`ev-not-settling` at 250 min).
* **Oxygen:** SpO₂ +4 for 120 min (auto-weaned); `maxDoses` 3 so it can be
  restarted if room-air SpO₂ falls (overlapping doses add).
* **Prednisolone or IV hydrocortisone:** SpO₂ +2.5, RR −5 and HR −5, with onset at
  120 min and a 120-min ramp (full effect ~4 h after the dose). Giving both is *contraindicated* (duplicate systemic
  steroid).
* **Sedation:** always *contraindicated*. SpO₂ −5, RR −10, EtCO₂ +8, GCS −3.
* **Aminophylline:** *contraindicated* unless life-threatening; *indicated* once
  life-threatening and IV magnesium has been given. HR +15.
* **Discharge home:** *contraindicated* before the discharge phase. It also sets
  the `premature-discharge` flag through a scenario event.
* **Admit to the ward:** an acceptable alternative disposition (it completes
  `obj-discharge` in the discharge phase with the same education bundle);
  *indicated* on the tiring branch, *contraindicated* when life-threatening.
  The generic aliases "admit"/"住院" map here, not to PICU.
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
  | Critical (deterioration branch) | 2 | 2 | 3 | 3 | 2 | **12** |

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
  | Critical | 7.24 | 8.0 kPa (60 mmHg) | 25.4 | 138 − (101 + 25.4) = 11.6 | −1.3 |

  The pH values satisfy Henderson–Hasselbalch (0.0307 mmol/L/mmHg) and the BE
  values satisfy the Van Slyke approximation. The critical-phase gas is an acute
  respiratory acidosis (venous pCO₂ 60 mmHg against a monitor EtCO₂ of ~52–55,
  which under-reads in asthma). The laboratory U&E anion gaps are 11, 13, 11
  and 11 (critical: 138 − (101 + 26)). The 1 h values show mild hypokalaemia (K⁺ 3.4), hyperglycaemia
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
  Nebulised budesonide is offered as a neutral adjunct (Chinese guideline:
  early high-dose nebulised ICS may be added; GINA/BTS: not routine once a
  systemic steroid is given). This case restarts the prescribed low-dose ICS
  with adherence support, with review at the post-attack visit (within 2
  working days) and in asthma clinic within 1–2 months, per GINA's "check
  adherence and technique before stepping up".

## Fidelity limits (known)

* Results and exam findings are static per phase. Phase entry is gated so that
  the reassess and discharge results only appear when the monitor agrees with
  them (tiring branch → IV magnesium first; discharge → steroid given and
  room-air SpO₂ ≥ 95), and the life-threatening branch has its own critical
  phase. Within a phase the findings do not change: e.g. the arrival PRAM stays
  8 while a tiring child's monitor drifts, and the critical-phase exam still
  says "near-silent chest" after IV magnesium has improved his SpO₂ shortly
  before PICU transfer.
* `investigations[].value` is static, so a blood gas or chest X-ray ordered on
  the deterioration branch (where it is reasonable) is still listed as
  low-value by `assess()`. The rubric item `r-no-routine-tests` does exempt
  those branches (`tiring` flag).
* Vital effects are additive per dose (the engine has no saturation), so the
  salbutamol limits above bound the effect; deliberate rapid-fire dosing still
  produces implausible monitor values (each excess dose is flagged as unsafe).
  Overlapping oxygen doses also add, and the discharge-phase gate reads the
  monitor SpO₂ without knowing whether oxygen is running: re-applying oxygen
  late on the tiring + magnesium branch lets the discharge phase open while
  the monitor still shows supplemental-oxygen saturations (the discharge
  room-air result then describes the off-oxygen trial).
* Web world (`general-hospital`, resus bay 1): orders need a workstation or
  device whose capabilities cover the investigation's `requires`; bedside
  monitors open the monitor panel only. PRAM therefore `requires: ["records"]`
  (nurse-scored and charted; ordered at the ED records terminal / nurse
  station, ~12 m), the off-oxygen trial `requires: ["oxygen"]` (bedside O₂
  outlet, 2 m), PEF and the spirometry "not in the ED" note use the triage
  peak-flow station, and the weight/height exam needs no scale at the bedside
  (weighed at triage). Results can be read anywhere from the journal.
* Exam items and child-voice history items that are restricted to a phase share
  keywords across phases on purpose. Consumers of `matchExam`/`matchHistory`
  should pass the current phase (`MatchOptions.phase`); the agent's patient
  pipeline already filters history by phase.
* The 46 history items exceed the authoring guide's 15–40 because six are
  phase variants of the same question ("how is he feeling / how alert is he"
  for arrival, reassessment, discharge and deterioration). Two pertinent
  negatives were added after matcher probing because learners (especially
  Chinese learners) routinely ask them and the fallback "I'm not sure" would be
  out of character for the mother: care elsewhere before arrival
  (`hx-prior-care`: none — came straight from home) and a home nebuliser
  (`hx-home-nebuliser`: none).

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

All 77 `extensions.testUtterances` (39 zh-CN, 38 en, including colloquial
Chinese, typos such as 储物罐 / vomitting / wat, and clinical abbreviations
such as NKDA, URTI, ICS, PICU, pred, GP, hx) resolve to an expected history
item as the top `matchHistory` hit. CJK keywords avoid generic two-character
fragments (家里, 孩子, 多少, 多久, 东西, 了吗, 过吗, 一下…) that would otherwise
score ≥ 0.55 on unrelated questions, and English keywords avoid phrases that
collapse to a single generic token after stop-word removal ("family doctor",
"what do you think …", "in date").

Exam and treatment phrasing is checked too (`packages/content/src/review-fixes.test.ts`):
让他说句话看看 reaches the speech assessment, 听听两边肺 / 听一下肺 the auscultation of the
current phase, 看看他清不清醒 the conscious-level check, and 先给他吸上氧 / 吸点氧 oxygen —
CJK phrases must be contiguous, so 说句话 does not match 说话 and 听一下肺 does not match 听肺.
