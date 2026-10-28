# pediatric-asthma — Worsening wheeze overnight · 6-year-old boy

> **Synthetic case / 虚构病例.** This is a fictional teaching case written for ClinicalCraft V5. It is
> not based on any real patient, and every name in it (林小宇 / Lin Xiaoyu, 陈女士 / Ms Chen, 周敏 /
> Zhou Min, 何医生 / Dr He) is a pseudonym. It is not medical advice.
> 本病例为 ClinicalCraft V5 编写的虚构教学病例，不基于任何真实患者，所有人名均为化名，不构成医疗建议。

## Case card

| | |
|---|---|
| Case | `pediatric-asthma` · v1.1.0 |
| Setting | Paediatric emergency department, resus cubicle (`emergency`) — on the monitor from arrival |
| Facility | `general-hospital` (also playable in `teaching-hospital`) |
| Difficulty | 3 / 5 |
| Estimated time | ~35 min of play (simulated clock from 06:10, limit 360 min; the reference path ends at 265.5) |
| Specialty | Paediatrics, emergency medicine, respiratory medicine |
| Languages | zh-CN (source), en |
| Learner level | Final-year medical students, foundation/intern doctors, paediatric and ED nurses |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have a paediatric emergency clinician review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Grade the severity of an acute asthma attack in a school-age child at the bedside within minutes —
   speech, work of breathing, SpO₂, heart and respiratory rate, PEF and the PRAM score — and look
   actively for life-threatening features.
2. Start the first-hour treatment for the severity found — inhaled bronchodilators at the right
   interval, controlled oxygen and an early systemic corticosteroid — without waiting for any test.
3. Take a focused, risk-oriented history from the parent while treatment runs: reliever use, previous
   admissions and intensive care, oral steroid courses, controller adherence and inhaler technique,
   smoke exposure, and a foreign-body screen.
4. Reassess at 1 hour with the same structured tool, tell expected β₂-agonist effects from
   deterioration, and escalate (senior review, IV magnesium, PICU/HDU) only for a poor response or
   life-threatening features.
5. Apply the discharge criteria and use the visit to improve long-term control: a written asthma
   action plan, inhaler-technique teach-back, a daily controller with adherence support, a smoke-free
   home and early follow-up.
6. Communicate with an anxious parent and a frightened child without blame and at the child's level:
   explain severity and the plan, address the parent's concerns and confirm by teach-back when to come
   straight back.

These are `learningOutcomes` in `case.json`. Because the case card shows them before play, they state
the standard without this child's severity, findings or the decisions' answers.

## Clinical summary (spoilers)

Lin Xiaoyu is 6 years old and weighs 20 kg. He has known asthma and is prescribed inhaled
fluticasone, but his mother gives it only when he is wheezy, and it ran out two months ago. After a
two-day cold, his cough and wheeze got worse overnight. His mother has given 2 puffs of salbutamol at
1, 3 and 5 a.m. straight from the inhaler (without the spacer), and each time it helped for only
about 30 minutes.

At triage (06:05) he speaks in phrases. RR 38, HR 140, SpO₂ 90 % in room air, T 37.6 °C, with
suprasternal, intercostal and subcostal recession and widespread inspiratory and expiratory wheeze.
PEF is 75 L/min, about 42 % of the predicted ~180 L/min. His PRAM score is 8/12.

His mother answers most history questions (`companion.answersHistory: true`). She is anxious and
feels guilty about stopping the preventer. She also worries about steroids and growth, and she
expects antibiotics and "a drip". Risk factors to find: two ED visits and two oral steroid courses in
the past year, an admission at 4, controller stopped (one 60-day inhaler dispensed in 7 months), no
spacer use, no written plan, a father who smokes, no flu vaccine this year.

**Diagnosis:** acute severe asthma exacerbation (BTS/SIGN; PRAM severe band; Chinese guideline 重度)
without life-threatening features, triggered by rhinovirus, on a background of poor controller
adherence. With timely treatment he responds well (PRAM 8 → 3 at 1 hour, 0 at 4 hours) and goes home.

## Scenario timeline and physiology

**Reference path** (noise-free monitor, approximate):

| Sim minute | Event | Monitor |
|---|---|---|
| 0 (06:10) | Arrival. HR, RR and SpO₂ warning alarms | HR 140 · RR 38 · SpO₂ 90 · EtCO₂ 31 · BP 104/64 |
| ~5–13 | O₂, salbutamol neb #1, ipratropium #1, sit upright | SpO₂ → 94–95 on O₂ |
| ~15 | Oral prednisolone 40 mg (2 mg/kg) | Steroid effect starts ~120 min later and is complete by ~4 h |
| 26 / 46 | Salbutamol + ipratropium #2 and #3 → `burst-complete` flag | HR rises to ~150–155 from transient β₂ effects |
| ≥ 60 | Automatic phase → **reassess** | On O₂: HR ~153 · RR ~27 · SpO₂ ~98; room-air trial 93 % |
| ~127 | O₂ effect ends (weaned) | SpO₂ ~94–95 in room air |
| ≥ 240 | Automatic phase → **discharge** (also requires a systemic steroid given and noise-free SpO₂ ≥ 95; 95.8 on the reference path) | HR ~120 · RR ~22–24 · SpO₂ ~95–96 (room air) · EtCO₂ ~35 |

Phases are never learner-switchable. Entry rules: **reassess** = arrival + `burst-complete` + ≥ 60 min
+ not life-threatening + (not `tiring` **or** IV magnesium given); **discharge** = reassess objective
done + ≥ 240 min + prednisolone/hydrocortisone given + SpO₂ ≥ 95; **critical** (deterioration) =
arrival + `life-threatening`. The static per-phase results therefore only appear when the monitor
agrees with them.

**Untreated or delayed course** (scenario events and trends):

* **Untreated trends** (they stop when any bronchodilator is given, then recover): SpO₂ −0.1/min,
  RR +0.15/min, HR +0.25/min and EtCO₂ +0.15/min.
* **15 min without a bronchodilator:** the nurse prompts you, and the `bronchodilator-delayed` flag is
  set (rubric).
* **25 min:** `tiring` event (baseline shift: SpO₂ 88, HR 146, RR 40, EtCO₂ 36). He is working harder
  and starting to tire; SpO₂ ~86 %, RR ~44, EtCO₂ ~40. After the three-dose burst he responds only
  partly (RR ~31–32, still needing oxygen); at ≥ 60 min the `ev-poor-response` nurse prompt fires and
  the reassess phase stays locked until IV magnesium is given (Mg is *indicated* once the burst is
  complete). With Mg (+ senior review) he converges on the reference trajectory (room-air SpO₂ 95–96
  by ~4.5 h) and the case can end in discharge.
* **45 min:** `life-threatening` event (SpO₂ 84, HR 150, RR 32, EtCO₂ 46, GCS 14). He is exhausted,
  drowsy and quiet; SpO₂ ~79 %, EtCO₂ > 50. The case moves into the **critical** phase, which has its
  own exam findings (dusky lips, single words, poor effort, near-silent chest, GCS 14), PRAM 12/12, a
  venous gas with acute respiratory acidosis, and no room-air trial or PEF (`available: false`).
  `dec-severity`/`dec-first-line` lock if not already answered (they are about the arrival
  assessment); `obj-assess` and `obj-first-line` have critical-phase branches. The case can only end
  by escalation:
  1. ≥ 3 bronchodilator rounds
  2. senior review
  3. IV magnesium
  4. **Admit to PICU/HDU** (alternative branches of `obj-reassess` and `obj-discharge`); discharge home
     and ward admission are *contraindicated*.
* **60 min without a systemic steroid:** the nurse prompts you, and the `steroid-delayed` flag is set
  (rubric).
* **≥ 250 min, reassessment done but no steroid or room-air SpO₂ < 95:** the `ev-not-settling` nurse
  prompt fires (the discharge phase is gated, above).

**Intervention effects and their appropriateness** (the engine evaluates `contraindicatedWhen` and
`indicatedWhen`):

* **Salbutamol (each dose):**
  * SpO₂ +1.2, RR −2.5 and EtCO₂ +1.5, all persistent
  * HR −5 persistent (the work of breathing falls)
  * HR +10 transient (β₂ chronotropy, lasts 90 min)
  * `maxDoses` 6 per route (neb, pMDI). A dose is *contraindicated* (with a toxicity/escalation
    message) from the 9th dose (both routes combined), and also when three doses have already been
    given within the first 30 min in a child who is neither `tiring` nor `life-threatening`
    (rapid-fire dosing beyond the 20-minutely first-hour schedule). Back-to-back nebs on the tiring or
    life-threatening branches stay acceptable. Six nebs in total (the reference path plus three spaced
    doses) give RR ~19, SpO₂ ~98, HR ~122 at 4 h; rapid-fire dosing still drives the additive effects
    to implausible values (HR ~200, RR ~15), but every dose after the third is flagged.
  * "IV salbutamol" does not resolve to either inhaled route (exclude keywords); the case has no IV
    salbutamol option.
* **Ipratropium:** RR −0.5. Each of its 3 doses (`maxDoses` 3) is *indicated*, whatever the phase.
  (Declared before salbutamol so that "异丙托溴铵雾化" / "ipratropium neb" resolves to ipratropium, not
  to the generic "雾化/neb".)
* **Nebulised budesonide:** *neutral*, no vital effects (`maxDoses` 3). A common choice in Chinese
  practice (the Chinese guideline combines nebulised ICS with the SABA in acute attacks); its response
  text reminds the learner that it does not replace the systemic steroid. Giving it *instead of*
  prednisolone leaves `obj-first-line` open, fires the 60-min steroid prompt and keeps the discharge
  phase locked (`ev-not-settling` at 250 min).
* **Oxygen:** SpO₂ +4 for 120 min (auto-weaned); `maxDoses` 3 so it can be restarted if room-air SpO₂
  falls (overlapping doses add); *indicated* below SpO₂ 94 % (BTS/SIGN).
* **Prednisolone or IV hydrocortisone:** SpO₂ +2.5, RR −5 and HR −5, with onset at 120 min and a
  120-min ramp (full effect ~4 h after the dose). Giving both is *contraindicated* (duplicate systemic
  steroid).
* **Sedation:** always *contraindicated*. SpO₂ −5, RR −10, EtCO₂ +8, GCS −3.
* **Aminophylline:** *contraindicated* unless life-threatening; *indicated* once life-threatening and
  IV magnesium has been given. HR +15.
* **Discharge home:** *contraindicated* before the discharge phase. It also sets the
  `premature-discharge` flag through a scenario event.
* **Admit to the ward:** an acceptable alternative disposition (it completes `obj-discharge` in the
  discharge phase with the same education bundle); *indicated* on the tiring branch, *contraindicated*
  when life-threatening. The generic aliases "admit"/"住院" map here, not to PICU.
* **Neutral but scored down by the rubric:** antibiotics; routine CXR, VBG, FBC, CRP and blood culture
  (`low-value`); IV magnesium given to a child who is responding.

**Paediatric alarm limits (6 years):**

| Vital | Warning | Critical |
|---|---|---|
| HR | 70–130 | 60 / 170 |
| SBP | 85–125 | 75 / 140 |
| RR | 16–30 | 10 / 45 |
| SpO₂ | < 94 | ≤ 89 |
| EtCO₂ | 25–45 | ≥ 55 |
| GCS | < 14 | ≤ 11 |

## Decisions and assessment

### Objectives (HUD chapters)

1. **Rapid assessment: how sick is he?** — speech, work of breathing, auscultation, conscious level,
   the arrival PRAM and the severity decision (critical-phase branch if he deteriorated).
2. **Start first-line treatment** — inhaled salbutamol, ipratropium, oxygen, a systemic steroid and
   the first-line decision.
3. **Focused history from his mother while treatment runs** — course and trigger, overnight reliever
   use, foreign body, previous admissions and PICU/intubation, controller and actual adherence,
   allergies.
4. **Reassess at 1 hour: responding, or escalate?** — re-auscultation, the reassessment PRAM and the
   response decision (or, if life-threatening: burst, senior review, IV magnesium).
5. **Safe disposition and discharge planning** — the discharge-phase room-air SpO₂, inhaler teaching,
   action plan, daily controller, the discharge decision and a disposition (home or ward; PICU on the
   life-threatening branch).

### Decisions

| id | kind | unlocked by | correct answer |
|---|---|---|---|
| `dec-severity` | single | arrival speech, work of breathing, auscultation, conscious level + arrival PRAM | Acute severe exacerbation without life-threatening features |
| `dec-first-line` | multiple | the severity decision | inhaled salbutamol ×3 · ipratropium ×3 · oxygen to 94–98 % · prednisolone 40 mg within the hour (not magnesium now, CXR, amoxicillin or sedation) |
| `dec-response` | single | reassessment PRAM + re-auscultation | Good response: titrate and wean oxygen, space salbutamol, stop ipratropium, continue the steroid, observe |
| `dec-discharge` | multiple | discharge-phase room-air SpO₂ or PRAM | SpO₂ > 94 % · stable on 3–4-hourly salbutamol · PEF > 75 % · education bundle · review within 2 working days (not a normal CXR, no wheeze, HR < 100 or 24 h for every severe attack) |

Decision feedback states no result the decision does not require (e.g. `dec-severity` does not quote
the PEF, which it does not require).

### Rubric (14 deterministic items, 20 points, + 2 examiner-judged)

| Domain | Item | Weight |
|---|---|---|
| Diagnosis | Graded acute severe without life-threatening features, **at the first attempt** | 2 |
| Management | Inhaled bronchodilator within 15 min + controlled oxygen | 2 |
| Management | Systemic corticosteroid within the first hour | 2 |
| Safety | No sedatives, no discharge before the criteria are met | 2 |
| Safety | Poor response or deterioration recognised and escalated (senior review, IV magnesium, PICU if life-threatening) | 2 |
| Management | Discharge bundle: action plan, inhaler teach-back, controller, smoke-free advice, explicit criteria and follow-up | 2 |
| History | Course of this attack, viral trigger, overnight reliever use | 1 |
| History | Fatal-asthma risk factors: admissions, ICU/intubation, oral steroid courses | 1 |
| History | Long-term control: controller, adherence, technique, second-hand smoke | 1 |
| Examination | Speech, work of breathing, auscultation, conscious level | 1 |
| Management | Three salbutamol rounds with three ipratropium doses in the first hour | 1 |
| Management | Reassessed at 1 hour with the same tool (PRAM + auscultation) | 1 |
| Investigations | No routine CXR, blood gas, FBC, CRP or blood culture (exempt on the tiring branch) | 1 |
| Management | No antibiotics; IV escalation only for poor response or life-threatening features | 1 |
| Communication (examiner) | Anxious, guilty parent: severity and plan, adherence without blame, steroid fears, teach-back | 2 |
| Communication (examiner) | Age-appropriate communication with the 6-year-old | 1 |

How wrong choices score: delays set `bronchodilator-delayed` / `steroid-delayed` (each fails a
weight-2 item) and drive the tiring and life-threatening branches; sedation, aminophylline without
life-threatening features, a duplicate systemic steroid, excess salbutamol and premature discharge are
contraindicated (safety events); antibiotics, routine tests and IV magnesium for a responder are
neutral but cost rubric points.

## Reference path (`solution`)

86 steps: bedside assessment and PRAM; oxygen, salbutamol + ipratropium neb #1 and upright position
by minute 11; the severity and first-line decisions; prednisolone at minute 14.5; the focused history
from his mother; nebs #2 and #3 at 26 and 46; the EHR read; reassessment at 1 hour (PRAM 3, room-air
SpO₂ 93 %, PEF 69 %) and the response decision; inhaler teaching and smoke-free advice; the
pre-discharge review after 4 hours (room-air SpO₂ 96 %, PRAM 0, PEF 81 %), action plan and daily
controller; the discharge decision and discharge home at minute 263. It scores **20/20** on the
deterministic rubric with no contraindicated action and ends at simulated minute 265.5 (embodied
autopilot: 265.6).

## Clinical numbers check

* **PRAM.** The score is suprasternal (0/2) + scalene (0/2) + air entry (0–3) + wheeze (0–3) + SpO₂
  (0–2); bands 0–3 mild, 4–7 moderate, 8–12 severe (Ducharme 2008).

  | Phase | Suprasternal | Scalene | Air entry | Wheeze | SpO₂ | Total |
  |---|---|---|---|---|---|---|
  | Arrival | 2 | 0 | 2 | 2 | 2 | **8** (severe) |
  | 1 h | 0 | 0 | 1 | 1 | 1 | **3** (mild) |
  | Discharge | 0 | 0 | 0 | 0 | 0 | **0** |
  | Critical (deterioration branch) | 2 | 2 | 3 | 3 | 2 | **12** |

  Each score matches the exam findings of its phase.
* **Severity.** By BTS/SIGN 158, a child over 5 years with any of SpO₂ < 92 %, HR > 125, RR > 30,
  inability to complete sentences or PEF 33–50 % has acute severe asthma. None of the life-threatening
  features is present: PEF < 33 %, silent chest, cyanosis, poor effort, agitation, hypotension,
  exhaustion or altered consciousness (the exam states he is frightened but not agitated). The Chinese
  2016 guideline (≥ 6 years) also grades him 重度 (severe): any one severe feature is enough, and he has
  SpO₂ 0.90 in room air, PEF ≈ 42 % of predicted (重度 threshold ≤ 50 % before / ≤ 60 % after SABA) and
  a tripod (前弓位) posture. (The 2025 Chinese guideline keeps four grades — 轻、中、重、危重 — for
  children ≥ 6 years.)
* **PEF.** Predicted ≈ 180 L/min (height-based estimate for 116 cm; reference charts vary).

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

  The pH values satisfy Henderson–Hasselbalch (0.0307 mmol/L/mmHg) and the BE values satisfy the Van
  Slyke approximation. The critical-phase gas is an acute respiratory acidosis (venous pCO₂ 60 mmHg
  against a monitor EtCO₂ of ~52–55, which under-reads in asthma; HCO₃⁻ 25.4 ≈ the +1 per 10 mmHg
  expected acutely). The laboratory U&E anion gaps are 11, 13, 11 and 11 (critical: 138 − (101 + 26)).
  The 1 h values show mild hypokalaemia (K⁺ 3.4), hyperglycaemia (8.9 mmol/L ≈ 160 mg/dL) and lactate
  2.6 mmol/L, which are expected salbutamol effects.
* **FBC.** The differentials sum to the WBC (10.9, 11.6 and 14.6 ×10⁹/L). The discharge picture of
  neutrophilia with eosinopenia is a steroid effect.
* **Doses for 20 kg:**

  | Drug | Dose |
  |---|---|
  | Salbutamol pMDI | 10 × 100 µg = 1 mg |
  | Salbutamol nebulised | 2.5–5 mg (BTS > 5 y: 2.5–5 mg; Chinese guideline ≤ 20 kg: 2.5 mg, so 2.5 mg satisfies both) |
  | Ipratropium | 250 µg |
  | Prednisolone | 40 mg (2 mg/kg, max 40 mg), 3 days (BTS: 30–40 mg for > 5 y; GINA: 1–2 mg/kg, max 40 mg, 3–5 days) |
  | Hydrocortisone | 80 mg (4 mg/kg), 4–6-hourly; Chinese guideline alternative methylprednisolone 1–2 mg/kg (20–40 mg) |
  | MgSO₄ | 800 mg (40 mg/kg, max 2 g) over ≥ 20 min |
  | Aminophylline | load 100 mg (5 mg/kg) over ≥ 20 min with ECG monitoring, then 1 mg/kg/h |
  | Midazolam (contraindicated choice) | 2 mg (0.1 mg/kg) |
  | Amoxicillin (not indicated) | 500 mg q12h (50 mg/kg/day) |
* **Adherence.** EHR: one 120-dose fluticasone inhaler (≈ 60 days as prescribed) was dispensed 7
  months ago, and the mother says it ran out 2 months ago. That is about 40 % of prescribed use, which
  fits "only when wheezy".
* **Units.** SI throughout both locales. The English text adds conventional units in parentheses
  (mmHg, mg/dL).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did that feel — a breathless child and a frightened mother at six in the
   morning?"
2. **Description** — "Summarise what you found on arrival, what you gave in the first hour, and how
   he looked at one hour and at four."
3. **Analysis** — advocacy–inquiry on the run's key moments:
   * "You graded him as … — which features did you weigh most? Which would have made it
     life-threatening?"
   * "The first bronchodilator went in at minute N. What, if anything, held it up?"
   * "His heart rate was 150 at one hour. What did you make of it?"
   * "What made you want (or not want) a chest X-ray, a gas or bloods?"
   * "Tell me about the conversation about the orange inhaler. How did his mother respond?"
   * "What has to be true before he goes home — and what will stop this happening again?"
4. **Summary** — "What will you do the same way at the next acute asthma, and what will you do
   differently?"

### Teaching notes

* **Treat while you assess.** Severity is a bedside judgement. Nothing in the first 10 minutes should
  wait for a test. The case punishes delay through trends and events, and it rewards a bronchodilator
  within 15 min.
* **pMDI + spacer works as well as a nebuliser.** An oxygen-driven nebuliser is convenient in a
  hypoxic child. Ask why his home salbutamol "only worked for half an hour": no spacer, poor
  technique, and a severe attack.
* **Steroids early.** Their benefit takes hours, which is why they belong in the first hour. Oral is
  as effective as IV when the child can swallow, so IV hydrocortisone only adds a cannula.
* **Read the tachycardia correctly.** HR 150+ with tremor at 1 hour is the drug, not deterioration.
  The PRAM, speech and air entry tell you about the asthma.
* **Low-value care.** CXR, gases, bloods and antibiotics are not needed here. The 1-hour VBG and FBC
  are deliberately "abnormal" (K⁺ 3.4, lactate 2.6, neutrophilia) to show how unnecessary tests
  generate distractors.
* **Every attack is a sentinel event.** Debrief the risk factors: two ED visits and two oral steroid
  courses in a year, controller stopped, no spacer, no written plan, a father who smokes, and no flu
  vaccine.
* **Communication.** Use a non-judgemental adherence conversation. Address steroid phobia: low-dose
  ICS and short oral courses are far safer than uncontrolled asthma, but oral courses should be
  minimised. Explain why antibiotics are not indicated, and use teach-back for the red-zone return
  advice.
* **Guideline variation** (good discussion points):
  * Neb salbutamol dosing at exactly 20 kg: BTS 2.5–5 mg vs Chinese 2.5 mg for ≤ 20 kg.
  * Aminophylline: BTS — consider for severe or life-threatening asthma unresponsive to maximal
    therapy; GINA — advises against.
  * Nebulised ICS: the Chinese guideline (2016; 2025 update) adds nebulised budesonide to the SABA in
    acute attacks; GINA/BTS do not recommend it routinely once a systemic steroid is given. The case
    keeps it *neutral* and never lets it replace the systemic steroid.
  * Oxygen thresholds: BTS/SIGN 158 (and the case) give oxygen below 94 % and titrate to 94–98 %;
    published summaries of **GINA 2026** report lower thresholds (oxygen only below 92 %, an upper
    target of 95 % for children 6–11 years). At 90 % on arrival he needs oxygen under either.
  * Post-discharge controller: this case restarts the prescribed low-dose ICS with adherence support,
    with review at the post-attack visit (within 2 working days) and in asthma clinic within 1–2
    months, per GINA's "check adherence and technique before stepping up"; GINA 2026 no longer
    recommends SABA-only treatment for children 6–11 years, which the plan already avoids.

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| Scoring or testing before treating | nurse prompt at 15 min (`bronchodilator-delayed`), `tiring` at 25 min, `life-threatening` at 45 min |
| Salbutamol alone for a severe attack | `dec-first-line` feedback; `r-burst` needs three ipratropium doses |
| No systemic steroid (or nebulised budesonide instead) | 60-min nurse prompt (`steroid-delayed`); the discharge phase stays locked |
| Reading the salbutamol tachycardia as deterioration | `dec-response` distractor ("stop salbutamol"); IV magnesium for a responder costs `r-stewardship` |
| Sedating the distressed child | contraindicated: SpO₂ falls, EtCO₂ rises, GCS drops |
| Antibiotics for the low-grade fever, routine CXR/bloods | rubric deductions; the results are distractors |
| Discharge before the criteria | `premature-discharge`; the nurse holds the discharge |
| Discharge without the education bundle | `r-discharge-bundle` unmet |

## Embodied mode

**Where the patient goes and how they look** (reviews G8/G12). `oxygen` names `device: "simple-mask"`
(face mask, as its name says); `position-upright` sets `posture: "sitting"` (upright on his mother's
lap); `admit-picu` has `destination: {"setting": "icu"}` (the team moves him to the first ICU/HDU bed
space when it is given). The peak flow (`pef`, `spirometry`) is a patient-performed test at a fixed
station: in embodied mode he walks with the clinician to the triage peak-flow station, blows, and is
taken back to his bed space sitting up (twice in the reference path: 29 m / 28 m, ≈ 0.1 min each
way; in `teaching-hospital` the porter takes him to ED cubicle 1's station). The `cxr` is a
departmental film (not authored as portable; not in the reference path), so ordering it takes him to
X-ray — its report no longer calls it portable. Scores are unchanged.

**Web world** (`general-hospital`, resus bay 1): orders need a workstation or device whose
capabilities cover the investigation's `requires`; bedside monitors open the monitor panel only. PRAM
therefore `requires: ["records"]` (nurse-scored and charted; ordered at the ED records terminal /
nurse station, ~12 m), the off-oxygen trial `requires: ["oxygen"]` (bedside O₂ outlet, 2 m), PEF and
the spirometry "not in the ED" note use the triage peak-flow station, and the weight/height exam needs
no scale at the bedside (weighed at triage). Results can be read anywhere from the journal.

**Scope of practice.** `inhaler-teaching` (inhaler and spacer technique with teach-back) is authored
`scope: "nursing"`: a delegated nurse may teach it; the action plan and the disposition stay medical
(docs/EMBODIED.md §8 scope of practice).

## Fidelity limits

* Results and exam findings are static per phase. Phase entry is gated so that the reassess and
  discharge results only appear when the monitor agrees with them (tiring branch → IV magnesium
  first; discharge → steroid given and room-air SpO₂ ≥ 95), and the life-threatening branch has its own
  critical phase. Within a phase the findings do not change: e.g. the arrival PRAM stays 8 while a
  tiring child's monitor drifts, and the critical-phase exam still says "near-silent chest" after IV
  magnesium has improved his SpO₂ shortly before PICU transfer.
* `investigations[].value` is static, so a blood gas or chest X-ray ordered on the deterioration
  branch (where it is reasonable) is still listed as low-value by `assess()`. The rubric item
  `r-no-routine-tests` does exempt those branches (`tiring` flag).
* Vital effects are additive per dose (the engine has no saturation), so the salbutamol limits above
  bound the effect; deliberate rapid-fire dosing still produces implausible monitor values (each
  excess dose is flagged as unsafe). Overlapping oxygen doses also add, and the discharge-phase gate
  reads the monitor SpO₂ without knowing whether oxygen is running: re-applying oxygen late on the
  tiring + magnesium branch lets the discharge phase open while the monitor still shows
  supplemental-oxygen saturations (the discharge room-air result then describes the off-oxygen trial).
* The reference path gives no salbutamol after the first hour: his stability over the following three
  hours stands in for "stable on 3–4-hourly salbutamol".
* The 46 history items exceed the authoring guide's 15–40 because six are phase variants of the same
  question ("how is he feeling / how alert is he" for arrival, reassessment, discharge and
  deterioration). Two pertinent negatives were added after matcher probing because learners
  (especially Chinese learners) routinely ask them and the fallback "I'm not sure" would be out of
  character for the mother: care elsewhere before arrival (`hx-prior-care`: none — came straight from
  home) and a home nebuliser (`hx-home-nebuliser`: none).

## Matcher notes

* Exam items and child-voice history items that are restricted to a phase share keywords across
  phases on purpose. Consumers of `matchExam`/`matchHistory` should pass the current phase
  (`MatchOptions.phase`); the agent's patient pipeline already filters history by phase. The four
  child-voice items (`hx-child-*`) set `speaker: "patient"`, so the boy answers them himself while his
  mother answers the rest.
* The later-phase variants are phase twins (`supersedes`) of the arrival items:
  `hx-child-feeling-later` and `hx-child-feeling-critical` → `hx-child-feeling`; `hx-child-discharge`
  → `hx-child-feeling-later`, `hx-child-feeling`; `hx-alertness-critical` → `hx-alertness`. In
  reassessment and at discharge a learner who asks the boy the arrival question ("How do you feel,
  buddy?", "Are you OK?", 小朋友你感觉怎么样) gets that phase's answer; before, those phrasings matched
  only the arrival and deterioration items, so the mother's fallback ("I'm not sure about that,
  doctor") answered a question put to the boy. None of these items is required or named in a
  condition, so the twins' credit changes no score. The utterance corpus has no entry for them:
  `cases verify` ranks hits of every phase, and the arrival and deterioration items share keywords on
  purpose, so a phrasing judged in `reassess` is led by `hx-child-feeling-critical` there (the review
  tests pin the phase-aware selection instead).
* All 80 `extensions.testUtterances` (40 zh-CN, 40 en, including colloquial Chinese, typos such as
  储物罐 / vomitting / wat, and clinical abbreviations such as NKDA, URTI, ICS, PICU, pred, GP, hx)
  resolve to an expected history item as the top `matchHistory` hit. CJK keywords avoid generic
  two-character fragments (家里, 孩子, 多少, 多久, 东西, 了吗, 过吗, 一下…) that would otherwise score
  ≥ 0.55 on unrelated questions, and English keywords avoid phrases that collapse to a single generic
  token after stop-word removal ("family doctor", "what do you think …", "in date").
* Exam and treatment phrasing is checked too (`packages/content/src/review-fixes.test.ts`):
  让他说句话看看 reaches the speech assessment, 听听两边肺 / 听一下肺 the auscultation of the current
  phase, 看看他清不清醒 the conscious-level check, and 先给他吸上氧 / 吸点氧 oxygen — CJK phrases must
  be contiguous, so 说句话 does not match 说话 and 听一下肺 does not match 听肺. Comforting him ("keep him
  calm", "calm him down", 让他安静下来, 安抚一下) reaches `position-upright`; only a request for a drug
  ("something to calm him down", 镇静药, 镇定剂, midazolam) reaches the contraindicated `sedation`, which
  excludes comfort phrasing.
* Dose, label and option texts do not pre-empt the learner: the pMDI dose reads "10 puffs in a severe
  attack" (not "here … for a severe attack", which graded the attack before `dec-severity`), the
  smoke-free advice is for "smokers in the household" (the father's smoking is history to elicit), and
  the controller label and the discharge option say "daily controller" rather than "restart" (the
  lapsed adherence is a `specific` item). PRAM, PEF and viral-PCR values and reference texts are
  per-locale `LocalizedText`.
* The grounding benchmark (`grounding-v1`) holds this case's held-out items; the 1.1.0 edits changed
  no history question, answer or keyword.

## References

1. British Thoracic Society, Scottish Intercollegiate Guidelines Network. SIGN 158: British guideline
   on the management of asthma. Edinburgh: SIGN; 2019 (acute asthma in children; the acute-asthma
   recommendations are retained after NICE NG245).
2. Global Initiative for Asthma. Global Strategy for Asthma Management and Prevention, 2024 update.
   GINA; 2024.
3. Global Initiative for Asthma. Global Strategy for Asthma Management and Prevention, 2026 update.
   GINA; 2026.
4. National Institute for Health and Care Excellence, British Thoracic Society, Scottish
   Intercollegiate Guidelines Network. Asthma: diagnosis, monitoring and chronic asthma management
   (BTS, NICE, SIGN). NICE guideline NG245. London: NICE; 2024.
5. 中华医学会儿科学分会呼吸学组, 等. 儿童支气管哮喘诊断与防治指南（2025）. 中华儿科杂志.
   2025;63(4):324-337.
6. 中华医学会儿科学分会呼吸学组, 《中华儿科杂志》编辑委员会. 儿童支气管哮喘诊断与防治指南（2016年版）.
   中华儿科杂志. 2016;54(3):167-181. doi:10.3760/cma.j.issn.0578-1310.2016.03.003
7. 中华儿科杂志编辑委员会, 中华医学会儿科学分会呼吸学组, 中国医师协会儿科医师分会儿童呼吸专业委员会.
   儿童支气管哮喘规范化诊治建议（2020年版）. 中华儿科杂志. 2020;58(9):708-717.
8. Ducharme FM, Chalut D, Plotnick L, et al. The Pediatric Respiratory Assessment Measure: a valid
   clinical score for assessing acute asthma severity from toddlers to teenagers. J Pediatr.
   2008;152(4):476-480. doi:10.1016/j.jpeds.2007.08.034

The same strings are `debrief.references` in `case.json`. DOIs were checked by web lookup on
2026-10-28: ref. 8 on PubMed (PMID 18346499); ref. 6 in the reference lists of several citing journal
articles (Crossref could not be reached from this environment). Refs. 5 and 7 are given without a DOI
because none could be confirmed; guideline documents 1–4 have none.

### To verify

* GINA 2026 (ref. 3): the oxygen thresholds (start below 92 %, upper target 95 % for 6–11 years) and
  the "no SABA-only treatment for 6–11 years" change were taken from published summaries; check them
  against the full GINA 2026 report.
* 儿童支气管哮喘诊断与防治指南（2025）(ref. 5): the case's severity table and doses follow the 2016
  guideline; the 2025 text (four grades for ≥ 6 years, SABA combined with nebulised ICS as first-line
  for mild–moderate attacks, nebulised salbutamol 2.5 mg ≤ 20 kg / 5 mg > 20 kg) was checked only from
  summaries, and its DOI was not found.
* The 2020 recommendations (ref. 7): DOI not confirmed.

## Changelog

### 1.1.0 — 2026-10-28 (editorial review)

* Added six `learningOutcomes` and `provenance.review` (status `editorial`, the guidance checked).
* **Chest X-ray report:** it read "Portable AP chest X-ray" although the film is departmental (no
  `performedAt: "bedside"`, so in embodied mode he is taken to X-ray) — now "Chest X-ray (AP)" in both
  languages.
* **Rubric:** the severity item now scores the first attempt (`decidedFirstTry`, as CASE_AUTHORING §7
  requires; `decided` gave full marks to guess-and-retry). The reference path is unchanged (20/20).
* References in one Vancouver style; BTS/SIGN 158 named as the current UK acute-asthma guidance
  (retained after NICE NG245); the 2025 Chinese paediatric guideline and GINA 2026 added; the 2020
  Chinese recommendations carry their full authorship (the editorial board, the respiratory group and
  the Chinese Medical Doctor Association paediatric respiratory committee); DOIs added where verified
  (Ducharme 2008, the 2016 Chinese guideline).
* Debrief teaching points name the guidance they rest on (BTS/SIGN 158, GINA).
* README restructured to the facilitator-guide template; guideline variation extended (GINA 2026
  oxygen thresholds, the Chinese 2025 nebulised-ICS recommendation).

### 1.0.0

* Initial release.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/pediatric-asthma/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify pediatric-asthma      # solution 86 steps · objectives 5/5 · decisions 4/4 · utterances 80/80
npx vitest run packages/agent/src/session/embodied-autopilot.test.ts               # embodied score = clinical score
npm run -s cc -- bench run --agent reference && npm run -s cc -- bench run --agent scripted-llm   # 100 %
npm run -s cc -- bench grounding --split dev && npm run -s cc -- bench grounding --split test     # this case: dev 54/57, test 78/82 (= baseline)
npm run cc -- play pediatric-asthma --provider offline
```

## 中文摘要

**病例概要。** 6岁男孩，20 kg，已知哮喘，处方吸入氟替卡松但只在喘时使用、两个月前已停药。感冒2天后夜间
咳喘加重，妈妈在家直接对嘴喷沙丁胺醇（未用储雾罐）效果短暂。到院时只能说短语，RR 38、HR 140、吸空气SpO₂ 90%、
三凹征、双相哮鸣，PEF约为预计值的42%，PRAM 8/12——急性重度发作，无危及生命征象。正确路径：吸氧（94–98%）、
第1小时沙丁胺醇+异丙托溴铵每20分钟×3、1小时内口服泼尼松龙40 mg；1小时PRAM 3；约4小时吸空气SpO₂ 96%、
PEF 81%，完成行动计划、吸入技术回示、每日控制药、无烟建议和2个工作日内复诊后出院。延误支气管舒张剂会依次进入
“疲劳”（需静脉硫酸镁和上级评估）和“危及生命”（需收入PICU/HDU）分支。

**学习目标。**
1. 数分钟内于床旁评估学龄儿童急性哮喘发作的严重程度（说话能力、呼吸做功、SpO₂、心率、呼吸频率、PEF及PRAM），并主动排查危及生命征象。
2. 按所判断的严重程度立即给予第1小时治疗（按正确间隔吸入支气管舒张剂、控制性氧疗、早期全身激素），不等待任何检查。
3. 治疗同时向家长采集有针对性的风险病史，包括依从性、吸入技术、烟草暴露并排除异物吸入。
4. 1小时用同一工具再评估，区分β₂激动剂的预期作用与病情恶化，仅在反应差或危及生命时升级治疗。
5. 应用出院标准，并借此次就诊改善长期控制（书面行动计划、吸入技术回示、每日控制药、无烟家庭、早期随访）。
6. 与焦虑的家长和害怕的孩子进行适龄、不带指责的沟通，并用回授法确认何时需要立即返回。

**关键决策。** ① 严重度：急性重度发作，无危及生命征象；② 第1小时一线治疗（多选）：吸入沙丁胺醇×3、
异丙托溴铵×3、吸氧至94–98%、1小时内口服泼尼松龙；③ 1小时反应良好：滴定并停氧、延长沙丁胺醇间隔、完成激素疗程；
④ 出院标准（多选）：吸空气SpO₂>94%、稳定于3–4小时一次的沙丁胺醇、PEF>75%、完成宣教、2个工作日内复诊。

**复盘要点（PEARLS）。** 先谈感受，再复述到院、第1小时和4小时的变化；分析环节聚焦：严重度依据与危及生命征象；
支气管舒张剂和激素为何要早；1小时心率150是药物作用而非恶化；为何不需要胸片、血气和抗生素；如何不带指责地讨论
停药与激素顾虑；出院前必须满足什么、如何防止再次发作。指南差异可作讨论点：GINA 2026据公开摘要下调了氧疗阈值，
中国2025指南急性发作时将雾化ICS与SABA联用。本病例为AI辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
