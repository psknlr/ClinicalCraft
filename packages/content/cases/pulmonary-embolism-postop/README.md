# pulmonary-embolism-postop — Chest pain and breathlessness · 52-year-old woman (post-op day 3)

> **Spoilers for facilitators and case authors.** This guide names the diagnosis. Learners open the case from the
> case library, where the title, summary and tags give nothing away.

**Synthetic case — 虚构教学病例.** Every person, date, value and event in this case is invented for teaching. It is
not based on any identifiable patient. The patient's name ("Lin Yaqin / 林雅琴") is a pseudonym. It is not medical
advice and does not replace local protocols or current guidelines.

## Case card

| | |
|---|---|
| id / version | `pulmonary-embolism-postop` / `1.1.2` |
| setting / facility | `inpatient` (surgical ward bed) / `general-hospital` (ward bed 1) |
| specialty | acute medicine, respiratory medicine, general surgery |
| difficulty / estimated time | 4 / 5 · ~40 min (simulated clock from 16:20, 180-min limit) |
| languages | `zh-CN` (source), `en` |
| review status | `editorial` (2026-10-28): AI-assisted authoring and editorial review against the guidance listed under References; **not yet reviewed by a licensed clinician** — have an acute physician or respiratory physician review it before teaching use |
| phases | one phase, `ward` (术后第3天 · 外科病房) |
| clock | simulated, `realtimeScale` 1; costs: ask 1, examine 2, order 1, read 1, intervene 2 min |
| content | 42 history items (3 `unknown`), 14 exam findings, 18 investigations, 25 interventions, 6 learning outcomes, 5 objectives, 4 decisions, 16 rubric items (14 deterministic, 2 examiner-judged), 6 NPC briefs, 72 matcher test utterances |

## Learning outcomes

After the case the learner can:

1. Recognise post-operative PE at the bedside — sudden pleuritic pain, breathlessness, tachycardia and hypoxaemia with
   a swollen calf — and start oxygen to SpO2 94–98% with continuous monitoring.
2. Calculate the Wells (10) and revised Geneva (16) scores and, with PE likely, go straight to CTPA without a D-dimer.
3. Start parenteral anticoagulation before imaging when clinical probability is high, after a rapid bleeding-risk
   check (wound, bleeding history, baseline blood count and clotting, surgeons informed), and justify the choice of
   UFH or LMWH early after surgery.
4. Stratify early mortality risk in the ESC 2019 order (haemodynamics → PESI/sPESI → RV imaging and troponin) and
   classify her as intermediate-high.
5. Plan monitored care and escalation: HDU/ICU for 48–72 hours, the PERT alerted, no systemic thrombolysis (major
   surgery within 3 weeks), and catheter-directed or surgical rescue reperfusion if she deteriorates.
6. Avoid harmful reflexes in acute RV pressure overload: large fluid boluses, diuretics, nitrates, NSAIDs or aspirin,
   an early oral DOAC, IPC on the thrombosed leg and an unindicated IVC filter.

These are the case's `learningOutcomes`; the HUD `objectives` (chapters, below) are the in-game task list.

## Clinical summary

A 52-year-old woman is on day 3 after an open right hemicolectomy for colon cancer. While walking back from the
toilet she gets sudden right-sided pleuritic chest pain and breathlessness. On arrival: HR 118, BP 112/70 (MAP 84),
RR 26, SpO2 89 % on room air, T 37.4 °C. Her right calf is swollen. Her prophylactic enoxaparin dose was held the
evening before because of minor wound ooze; nobody reviewed it afterwards and the order is still on hold. The patient
discloses this only to a targeted question; it is also in the nurse's handover and the medication administration
record (`mar`).

- **Diagnosis (hidden from learners):** acute bilateral PE with right popliteal–calf DVT, ESC 2019
  **intermediate-high** risk (haemodynamically stable; PESI 122, class IV; sPESI 3; RV/LV 1.3 on CTPA; hs-cTnT 68 ng/L).
- **Key findings:** sinus tachycardia with new S1Q3T3, incomplete RBBB and V1–V3 T inversion; ABG on air pH 7.47,
  PaCO2 4.1 kPa, PaO2 7.5 kPa (A–a 7.3 kPa); JVP +4 cm, loud P2, parasternal heave, right pleural rub; right calf
  3 cm larger with deep-vein tenderness; dry wound. Echo (if ordered): McConnell sign, TAPSE 14 mm, PASP ≈ 46 mmHg.
- **Management:** oxygen; CTPA without a D-dimer; anticoagulation before the CTPA result after a bleeding check — IV
  UFH preferred this early after surgery (LMWH acceptable); HDU/ICU for 48–72 h; PERT aware; no systemic lysis; rescue
  catheter-directed therapy or surgical embolectomy if she deteriorates.

## Scenario timeline and physiology

* **Bedside monitor (`physiology.monitor`).** The ward call gives the nurse's observations at 16:10; the bedside
  monitor is there but not on her. Until `monitoring` is given (or she moves to the monitored HDU/ICU bed,
  `transfer-hdu`) the bedside shows only those readings, taken by hand — HR 118, BP 112/70, RR 26, SpO2 89 %,
  T 37.4 °C (`spotChecks`: static, no alarm, no rhythm) — plus GCS and pain. The oxygen responses say what is fitted
  and the SpO2 target (no saturation reading the learner may not have), she looks round at the staff (not "at the
  monitor"), and the decompensation at 60 min is narrated (she deteriorates; the nurse reports the falling pressure)
  instead of opening with "Monitor alarm!" — the monitor alarms on its own when it is on.
* **Untreated drift.** Until she is anticoagulated (or reperfused, or lysed), HR rises (+0.2/min, max +10), SBP falls
  (−0.2/min, max −10), RR rises and SpO2 falls. These trends freeze and slowly recover once anticoagulation starts.
* **Prompts.** At 10 min without oxygen the nurse prompts (`o2-delayed`). At 35 min without anticoagulation the nurse
  prompts and mentions the held dose (`anticoag-prompted`).
* **Decompensation.** At 60 min without anticoagulation she becomes **high-risk PE**: SBP ≈ 84, HR ≈ 139, GCS 14,
  SpO2 ≈ 88 % on nasal O2 (flag `high-risk-pe`). At 75 min, if neither PERT nor reperfusion has happened, the attending
  arrives (SBP ≈ 78): once the diagnosis is established (CTPA read or the risk-class decision answered) he models the
  rescue plan (`ev-high-risk-escalation`); before that he only calls the shock and asks for the learner's working
  diagnosis, without naming PE or the treatment (`ev-shock-escalation-undiagnosed`). Both attending lines set
  `speaker: "narrator"` (the runtime voices scenario lines as nurse, monitor, patient, companion or narrator only). In
  that branch noradrenaline, UFH (with bolus), PERT and rescue reperfusion become *indicated*; after reperfusion she
  recovers over about 60 minutes.
* **Systemic alteplase** is always contraindicated here (major surgery 3 days ago; while she is normotensive there is
  no indication either, and if she shocks, surgical or catheter-directed reperfusion is preferred because of that
  contraindication). If it is given, wound haemorrhage follows (SBP ≈ 90, HR ≈ 130). The lytic does lyse clot, so the
  PE drift trends stop (`lysed` is part of every trend's `until`); the harm is the bleeding. The `haemorrhage` flag then
  makes UFH contraindicated, an IVC filter *indicated* (the only path where a filter is appropriate) and the
  major-haemorrhage protocol (`transfusion`: stop the lytic, 2 units of red cells, call the surgeons) *indicated*; SBP
  recovers to ≈ 103 over 30 min. Transfusion without bleeding is a safety event. In this branch the filter (with no
  anticoagulant) also completes the treatment chapter (`obj-treat`), so the case can be finished without a
  contraindicated drug. An anticoagulant on board during the bleed (given into it, or running when the lytic was
  started) fails `r-safety-no-harm`, and `r-mx-anticoag-timely` / `r-mx-ufh` are not met in this branch.
* **Nudges and bookkeeping events.**
  * `ev-anticoag-unchecked`, `ev-anticoag-surgeons-unaware`, `ev-anticoag-wound-unchecked` (info, nurse; mutually
    exclusive, so exactly one fires): anticoagulation started before the bleeding history, wound examination *and*
    surgical call are all done (not in the haemorrhage branch). The nurse asks only about what is missing — the
    surgeons, the bleeding history and wound, or both. Each sets `anticoag-before-bleed-check`, which fails
    `r-safety-bleeding`.
  * `ev-anticoag-no-baseline` (silent): anticoagulation started before FBC and coagulation were ordered. Sets
    `anticoag-before-baseline`, which fails `r-ix-baseline`.
  * `ev-filter-unindicated` (silent): IVC filter placed without haemorrhage. Sets `filter-unindicated`, which fails
    `r-safety-no-harm` (a filter in the bleeding branch is not penalised).
* **Tempting wrong choices** are scored as safety events (contraindicated): the chest-pain reflex — aspirin 300 mg, or
  sublingual GTN (SBP −15, HR +6 for about 20 min; the pain is pleuritic and the RV may be preload-dependent); a 1 L
  rapid fluid bolus; IV furosemide; ketorolac; rivaroxaban now; IPC on the DVT limb; an IVC filter while
  anticoagulation is possible; stacking anticoagulants (LMWH + UFH, or either after a DOAC); a vasopressor while
  normotensive; reperfusion while stable; red-cell transfusion without bleeding. Morphine is contraindicated while
  SBP < 90 mmHg, and treatment-dose LMWH once she is high risk (UFH with a bolus is then recommended). A
  prophylactic-dose enoxaparin is allowed but marked *neutral*: it does not treat VTE, so the deterioration continues.
  IV paracetamol is *neutral* (modest effect; the 18:00 regular dose is omitted). The NSAID option's aliases are class
  words only ("NSAID", "非甾体抗炎药", "toradol"): typing a different NSAID (ibuprofen, flurbiprofen) does not record
  ketorolac.

## Decisions and assessment

**Objectives (chapters).** `obj-assess` (oxygen, monitoring, onset history, chest auscultation, legs) → `obj-pretest`
(operation and prophylaxis history, strategy decision) → `obj-treat` (FBC and coagulation sent, anticoagulant decision,
UFH or LMWH given — or, in the haemorrhage branch, a filter) → `obj-confirm` (CTPA and troponin read, risk decision) →
`obj-disposition` (escalation decision, monitored bed). Hints coach with questions and never state an unobtained result.

**Decisions.**

- `dx-strategy` (after the operation and haemoptysis history and the leg examination): straight to CTPA, with
  anticoagulation started while waiting. Distractors: D-dimer first, V/Q first, echo only, empirical lysis.
- `anticoag-choice` (after the strategy, bleeding history, wound examination and the prophylaxis history): IV UFH is
  the single best answer for her; LMWH is "acceptable, not the best here". Both the UFH and LMWH feedback say that
  ESC 2019 (class I, level A) and AHA/ACC 2026 (class 1) recommend LMWH over UFH for most patients who need parenteral
  anticoagulation, and that UFH is a patient-specific choice for reversibility early after surgery.
- `risk-strat` (after CTPA and troponin): intermediate-high, as at presentation (the prompt says "not any later
  change"; the "high" feedback says a later shock reclassifies her). The "high" option carries its old name, "'massive'
  PE", the classic trap with bilateral emboli; its feedback says that "massive" describes the haemodynamic effect, not
  the clot burden.
- `escalation-plan` (select all): no systemic lysis, monitored bed 48–72 h, rescue reperfusion via the PERT.
- **No length cue.** In the three single-best decisions the key is not the longest option (it was in all three). The
  distractors are as specific as the key and state the reason a learner would choose them — a negative D-dimer would
  spare contrast and radiation; V/Q avoids iodinated contrast; moving a hypoxaemic, tachycardic patient to CT is risky;
  LMWH is the guideline default for stable PE; a DOAC needs no injections or monitoring; a treatment dose looks too
  risky on day 3 — and each one's feedback answers that reason. The wrong escalation statements are as specific as the
  right ones.

**Learner guidance and board gating.**

* **Waypoints point at the ward bedside.** `resolveWaypoint` picks the placement nearest to the learner. From the
  spawn, the lab or the evidence board, "oxygen", "cardiac-monitor" or "infusion-pump" resolve to ED, ICU or theatre
  equipment, where bedside interventions for ward bed 1 cannot be given. So every bedside step targets `patient` (the
  outlet, monitor and pump are within 2 m of bed 1). Off-ward steps keep their capability targets (`lab-hematology`,
  `ct`, `lab-chemistry`, `records` for the MAR, `board`). While the CTPA and troponin are pending, the learner is sent
  back to the patient. Results are read from the journal anywhere.
* **The anticoagulant decision unlocks only when the evidence exists**: strategy decided, bleeding history asked,
  wound examined, *and* the prophylaxis history known (`h-lmwh` asked or the MAR read). Its options and feedback refer
  to the held enoxaparin and LMWH exposure since POD0.
* **The risk-class decision asks about her status at presentation.** In the decompensation branch she is high risk by
  the time she is classified, so the prompt says "at presentation (not any later change)", and the "high" feedback says
  that a later shock reclassifies her and needs reperfusion via the PERT. The "no systemic lysis" statement in the
  escalation plan rests on the surgical contraindication, so it stays true in both branches.
* **Dose, label and option texts do not do the learner's work.** The UFH, treatment-dose enoxaparin and noradrenaline
  doses are per-kg formulas; 5,600 U / 1,260 U/h, 70 mg and ≈ 3.5 µg/min for her 70 kg (which she or the MAR gives)
  are in their `response`s, and the anticoagulant decision's options do not carry them. The paracetamol dose says "at
  least 4 h after the previous dose; max 4 g in 24 h (check the drug chart)" — the 12:00 dose and the cancelled 18:00
  dose are in its response, since they are MAR facts. The prophylactic enoxaparin option is labelled
  "Prophylactic-dose enoxaparin SC", not "the missed … dose", and the strategy decision's CTPA option says "PE likely,
  Wells > 4" rather than quoting the Wells total of 10 the learner should compute. The ABG A–a reference text is
  per-locale.
* **Feedback does not quote unobtained results.** Decision feedback and intervention harm texts do not cite the echo,
  lactate, perfusion, JVP or chest-film findings, nor the risk class, before the learner has obtained them. The
  transfusion intervention's visible name does not announce a lytic scenario.

**Rubric** (deterministic total 22; the reference path scores 22/22):

| id | domain | weight | met when |
|---|---|---:|---|
| `r-hx-risk` | history | 2 | surgery, prophylaxis (asked or MAR read), calf, syncope, haemoptysis, previous VTE |
| `r-ex-key` | examination | 1 | legs, lungs and heart examined |
| `r-o2-early` | management | 1 | oxygen before the 10-min prompt |
| `r-ix-baseline` | investigations | 1 | FBC, coagulation and renal function, with FBC/coag ordered before anticoagulation |
| `r-ix-confirm` | investigations | 2 | ECG, CTPA and troponin read |
| `r-eff-low-value` | efficiency | 1 | `obj-confirm` done without D-dimer, thrombophilia screen or blood cultures |
| `r-dx-risk` | diagnosis | 2 | `risk-strat` right at the first attempt |
| `r-mx-anticoag-timely` | management | 2 | anticoagulated before the 35-min prompt, outside the haemorrhage branch |
| `r-mx-ufh` | management | 1 | UFH, not stacked on LMWH or a DOAC, outside the haemorrhage branch |
| `r-mx-escalation` | management | 1 | monitored bed and PERT |
| `r-mx-analgesia` | management | 1 | titrated morphine |
| `r-safety-bleeding` | safety | **2** | bleeding history, wound and surgeons before anticoagulating |
| `r-safety-no-lysis` | safety | **3** | anticoagulated, no alteplase; **critical** |
| `r-safety-no-harm` | safety | **2** | `obj-treat` done and none of the harmful measures |
| `r-comm-patient` | communication | 1 | examiner-judged |
| `r-comm-team` | communication | 1 | examiner-judged (SBAR, closed loop) |

Negative ("avoided X") items are gated on reaching the relevant stage, so inaction scores nothing:
`r-safety-no-lysis` needs anticoagulation, `r-safety-no-harm` needs `obj-treat`, and `r-eff-low-value` needs
`obj-confirm`. `r-dx-risk` uses `decidedFirstTry`, because the decision must be answered correctly to finish anyway.
`r-mx-ufh` is not met when UFH is stacked on LMWH or a DOAC. Neither `r-mx-ufh` nor `r-mx-anticoag-timely` credits
anticoagulation in the lytic-haemorrhage branch, where it is contraindicated.

**How wrong choices score** (each path replayed with the engine on version 1.1.0; see the changelog):

| Path | Score |
|---|---|
| Reference solution | 22/22 (100 %) |
| Reference, plus aspirin and sublingual GTN at minute 4 (anticoagulation then slips past the 35-min prompt) | 18/22 (82 %) |
| Treatment-dose LMWH instead of UFH, otherwise reference | 21/22 (95 %) |
| UFH started before the bleeding check, surgical call and baseline bloods | 19/22 (86 %) |
| Bare minimum to complete, board answered by trial and error | 10/22 (45 %) |
| Slow work-up (oxygen only after the prompt, D-dimer first, waits for CTPA and troponin), decompensates at 60 min, then UFH, noradrenaline, PERT and rescue reperfusion | 7/22 (32 %) |
| Same slow start, then UFH only after the decompensation (no vasopressor, PERT or reperfusion): SBP ≈ 84, GCS 14 at 132 min | 4/22 (18 %), not completed |
| Lysis right after the board strategy, haemorrhage managed correctly (transfusion + filter, no anticoagulant), otherwise reference | 16/22 (73 %) |
| Same, but transfusion only and UFH given into the bleed | 14/22 (64 %) |
| Empirical thrombolysis, then wound haemorrhage | 1/22 (5 %), not completed |
| Every tempting harmful choice (including aspirin and GTN) | 1/22 (5 %), not completed |
| No action for 180 min (timeout) | 0/22 (0 %) |

A single catastrophic act costs only its own item: the managed-lysis path still scores 73 %, but `r-safety-no-lysis`
is a **critical** item, so the debrief names that miss first (see Fidelity limits).

## Reference path (`solution`)

Oxygen (minute 2) and monitoring (4); the history — presenting complaint, onset, pain, syncope, haemoptysis, calf,
operation, previous VTE, prophylaxis, bleeding, allergies; the examination — general, chest, heart, legs, abdomen
(minute 25). Strategy decision (straight to CTPA), then ECG, FBC, coagulation and renal function ordered; anticoagulant
decision (UFH); the surgeons informed; UFH bolus and infusion at about minute 31–33 — before the CTPA is ordered, as the
`obj-treat` hint and ESC 2019 say for high clinical probability without an absolute contraindication. CTPA and
troponin ordered, titrated morphine, ECG read; FBC and coagulation read after 24 min; CTPA, troponin and renal function
read after a further 15 min; risk class and escalation decisions; PERT; HDU transfer; finish at 86 min, 22/22.

## Clinical numbers check

| Item | Value | Working |
|---|---|---|
| Wells (PE) | **10**, PE likely / high | DVT signs 3 + PE most likely 3 + HR > 100 1.5 + surgery ≤ 4 wk 1.5 + active cancer 1 |
| Revised Geneva | **16**, high | surgery ≤ 1 mo 2 + cancer 2 + unilateral leg pain 3 + HR ≥ 95 5 + deep-vein tenderness & oedema 4 |
| PESI | **122**, class IV | age 52 + cancer 30 + HR ≥ 110 20 + SaO2 < 90 % 20 |
| sPESI | **3** | cancer, HR ≥ 110, SaO2 < 90 % |
| MAP / shock index | 84 mmHg / 1.05 | (112 + 2×70)/3; 118/112 |
| ABG (room air) | pH 7.47, PaCO2 4.1 kPa (31 mmHg), PaO2 7.5 kPa (56 mmHg), HCO3⁻ 22 | acute respiratory alkalosis with appropriate HCO3⁻ (Henderson–Hasselbalch 7.47) |
| A–a gradient | 7.3 kPa (55 mmHg); age-expected ≤ 2.3 kPa (17 mmHg) | 0.21 × (101.3 − 6.3) − 4.1/0.8 − 7.5 |
| Anion gap | 11 mmol/L | 138 − (104 + 23) |
| Creatinine / eGFR | 68 µmol/L / 93 mL/min/1.73 m² (CKD-EPI 2021) | CrCl (Cockcroft–Gault, 70 kg) ≈ 95 mL/min |
| Haemoglobin / haematocrit | 112 g/L / 0.34 L/L | pre-op 126, POD1 114 g/L |
| Echo | RV/LV 1.1, TAPSE 14 mm, TR Vmax 3.1 m/s, IVC 2.0 cm < 50 % collapse | PASP ≈ 4 × 3.1² + RAP 8 ≈ 46 mmHg; TAPSE abnormal by both the ASE 2010 (< 16 mm) and the case's 17 mm reference |
| UFH (70 kg) | 5,600 U bolus, then 1,260 U/h | 80 U/kg; 18 U/kg/h; APTT 1.5–2.5 × control at 6 h |
| Enoxaparin (treatment) | 70 mg SC q12h | 1 mg/kg; no renal adjustment |

The same numbers are machine-readable in `extensions.clinicalScores`.

## Facilitator notes

**Debrief questions (PEARLS order).**

1. *Reactions* — "How was that? What did you feel when the nurse said her sats were still below 90 %?"
2. *Description* — "Summarise the case in two sentences: what made PE your leading diagnosis, and how sick was she?"
3. *Analysis* —
   - "What were her Wells and Geneva scores, and what would a D-dimer have told you on post-op day 3?"
   - "Why start anticoagulation before the CTPA — and what did you check first?"
   - "UFH or LMWH? Both ESC 2019 and AHA/ACC 2026 favour LMWH for most patients: what made her different?"
   - "Walk me through her risk class step by step. What would have made her high risk?"
   - "Why no thrombolysis, and what is her rescue plan if she shocks?"
   - "Her prophylaxis was held the night before. What does that teach about held doses?"
4. *Summary* — "What will you do in the first 30 minutes of the next post-operative breathless patient?" (expected:
   oxygen and monitor; pre-test probability; anticoagulate before imaging after a bleeding check; escalate early).

**Teaching notes.**

* **Pre-test probability first.** With PE "likely", a negative D-dimer cannot exclude PE. After surgery the D-dimer is
  almost always raised. Ordering it is scored as low value.
* **Anticoagulate while waiting** (ESC 2019 class I, level C), but only after a quick bleeding check: wound; Hb and
  platelets; coagulation baseline sent; no intracranial pathology; surgeons informed.
* **UFH versus LMWH after surgery.** LMWH is the guideline default for patients who need parenteral anticoagulation
  (ESC 2019 class I, level A; AHA/ACC 2026 class 1, including hospitalised category C–E1 patients) and is *acceptable*
  here. UFH is preferred for her for four reasons — a short half-life, full protamine reversal, titratability and
  compatibility with rescue reperfusion or re-operation — a patient-specific judgement that the decision feedback
  states explicitly. She has had LMWH since POD0, so monitor platelets for HIT.
* **Why no lysis.** In PEITHO, systemic lysis in intermediate-risk PE prevented decompensation but increased major
  bleeding and haemorrhagic stroke, and did not reduce mortality. Major surgery within 3 weeks is a contraindication.
  ESC 2019 lists it as *absolute*; some other guidance (e.g. the 2018 Chinese guideline) calls it *relative*.
  Contraindications may be re-weighed in an immediately life-threatening situation, but catheter-directed therapy or
  surgical embolectomy is the preferred rescue for this patient.
* **Disposition.** Intermediate-high risk means a monitored bed for 48–72 h, PERT aware, and a pre-agreed rescue plan.
  Early discharge or an early oral DOAC is wrong. The 2026 AHA/ACC guideline replaces the ESC risk classes with
  clinical categories A–E and recommends PERT assessment for categories C–E (class 1); the case's board uses the ESC
  2019 classes.
* **Prevention lesson.** A held prophylactic dose needs an explicit review and re-prescription. Mechanical
  prophylaxis should be re-offered. Extended (≈ 4-week) pharmacological prophylaxis is advised after major
  abdominal/pelvic cancer surgery (ACCP 2012, grade 1B).
* **Long term (not simulated).** Her cancer was diagnosed within the last 6 months and is still being treated, so it
  counts as active and this is cancer-associated VTE: anticoagulate for at least 6 months, and continue while the
  cancer remains active (e.g. adjuvant chemotherapy), with drug and duration agreed with oncology (ESC 2019). Some
  DOACs carry a higher bleeding risk in luminal GI cancer. Thrombophilia testing is not indicated after a
  surgery-provoked first VTE, and its results are distorted during acute thrombosis and on heparin.

**Common learner errors and how the case surfaces them.**

| Error | What the case does |
|---|---|
| Oxygen late | nurse prompt at 10 min; `r-o2-early` lost |
| D-dimer first | strategy feedback (post-op D-dimer is raised; a negative would not exclude PE); `r-eff-low-value` lost |
| Waiting for the CTPA before anticoagulating | nurse prompt at 35 min (mentions the held dose); `r-mx-anticoag-timely` lost; decompensation at 60 min |
| Anticoagulating before the bleeding check / surgical call | the nurse asks exactly what is missing; `r-safety-bleeding` lost |
| No baseline FBC/coagulation | `r-ix-baseline` lost |
| Chest-pain reflex (aspirin, GTN) | contraindicated; GTN drops the BP; `r-safety-no-harm` lost |
| 1 L fluid bolus, furosemide | harm texts (RV pressure overload, preload dependence) |
| Systemic thrombolysis | wound haemorrhage; `r-safety-no-lysis` lost; the major-haemorrhage protocol and a filter become indicated |
| Early rivaroxaban, IPC on the DVT leg, a filter without bleeding | harm texts; `r-safety-no-harm` lost |

## Embodied mode

**Grounding the kit** (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8). A clinical act needs the kit it names at the
bedside and IV access is patient state: the IV items `ufh`, `furosemide`, `ketorolac`, `morphine`, `paracetamol` and
`noradrenaline` require `iv-access`. The patient is on post-operative day 3 with a peripheral cannula in her left
forearm (general inspection says so), so the case sets `extensions.embodied.ivAccessInSitu: true`: IV drugs need no
IV-access procedure first (the `iv-access` intervention places a further line). Her bloods can be ordered at her side;
the ward's ECG cart stands across the ward bay and is used only once wheeled to the bed (prepare, connect and record
need it at her side), so the reference clinician orders the ECG at her side instead.

**Scope of practice** (EMBODIED §8.3): `ipc` (intermittent pneumatic compression sleeves) is authored
`scope: "nursing"`; rescue reperfusion and the IVC filter stay medical.

**Reference order in embodied mode.** The reference `solution` starts the UFH (after the bleeding-risk checks, the
baseline coagulation sample and the surgeon) before the CTPA is ordered — in embodied mode ordering the CTPA wheels
the patient to the scanner, which must not delay anticoagulation. The CTPA is read with the troponin after the second
wait (clinical clock 86 min, 100 %).

**Where the patient goes, how she looks** (reviews G8/G12): the CTPA is done on her at the CT scanner — in embodied
mode she is wheeled there on her ward bed (the bed is parked beside the scanner while she lies on its table) and back
(85 m each way, 0.37 min; the bench scenario `workflow-pe-ctpa-transport` checks it); `transfer-hdu` has
`destination: {"setting": "icu"}` (the team moves her to the first ICU/HDU bed space when it is given; her ward bed
goes back to the ward); `positioning` sets `posture: "sitting"` (head of bed up); `cxr` is `performedAt: "bedside"`
(portable); `o2-nasal` and `o2-nrb` name `device` `nasal-cannula` and `non-rebreather-mask`. Re-measured 2026-10-28
with the offline autopilot (`exec --autopilot --embodied --approval bypass`): 100 % (22/22) in `general-hospital` and in
`teaching-hospital`, en and zh-CN (teaching hospital: `obj-treat` at 34.5 min, finish at 90.8 min).

## Fidelity limits

* Single phase, simplified physiology: vital-sign drift and drug effects are linear teaching models; no heparin
  titration (repeat APTT/anti-Xa), no HIT, no long-term course.
* The rubric has no score cap: the managed-lysis path loses only `r-safety-no-lysis` (3), `r-mx-anticoag-timely` and
  `r-mx-ufh`, and still scores 73 %. `r-safety-no-lysis` is `critical`, so every debrief (web, CLI, MCP) names that miss
  first; the harm text carries the rest of the weight of that error.
* The board classifies risk by ESC 2019; the AHA/ACC 2026 clinical categories (A–E) are named in the debrief only.
* **Explicitly unknown** (history items with `disclosure: "unknown"`, case `unknowns`, debrief unknowns): final tumour
  pathology and stage; thrombophilia status; any prior echocardiogram; intra-operative details; the post-heparin
  APTT/anti-Xa and the later course.
* The arterial blood gas was drawn by the ward nurse at 16:15 on room air, before the learner arrived, and run on the
  analyser straight away (a gas sample left unanalysed would not stay valid). Its values are therefore consistent
  whenever the result is ordered. Ordering a "VBG"/"静脉血气" maps to that arterial sample and shows a notice. The
  assessment score is a formative teaching-script measure, not a validated competency score.
* Questions learners routinely ask that would otherwise have hit the patient's "I'm not sure" line have authored
  answers consistent with the rest of the case: wound/abdominal pain (`h-abdo-pain`); urine since the catheter was
  removed (`h-urine`, matching the nurse's 08:00 handover); other operations (`h-psh-other`); recreational drugs
  (`h-recreational`); whether the chest pain is constant and what eases it (in `h-pain-character`); kidney or liver
  disease (contrast, LMWH dosing; in `h-pmh`); chemotherapy or radiotherapy (in `h-cancer`: none yet); children,
  pregnancies and miscarriages (in `h-hormones`: one daughter, no miscarriages); shoulder-tip radiation (in
  `h-pain-site`); weight loss and night sweats (`h-weight-loss`: neither).
* NPC briefs only use what the learner has obtained: the attending keeps questions generic until the learner raises
  VTE; the radiologist judges contrast risk from the creatinine result once the learner has it; the nurse points to
  the MAR on the records terminal (reading it is what credits the prophylaxis question), and her stock list is neutral
  (analgesics, IV fluids, diuretics, heparins), so it does not single out anticoagulants; the cardiology registrar
  mentions the PERT only once the learner has raised PE; the `consult-surgeon` response is conditional ("if she needs
  therapeutic anticoagulation…"), so calling the surgeons first does not announce the treatment.
* In the current agent runtime `consult` reaches the nurse, radiologist, pathologist and attending only, so the
  `consultant` (cardiology, surgery) and `pharmacist` briefs are kept for front-ends that add those roles. The surgical
  view is also given by the `consult-surgeon` intervention's response.

## Matcher notes

`extensions.testUtterances` has 72 bilingual paraphrases (41 zh-CN, 31 en) and serves as the history-matcher
regression corpus. That is above the 15–40 in CASE_AUTHORING §7 because tricky ones were added over successive
reviews: colloquial Chinese, text-speak, typos and abbreviations such as "有木有咳血", "疼几分钟了", "腿肚子疼不疼",
"did u get ur clexane last nite", "any LOC?", "any SOB at rest?" and "any wt loss?".

* Every utterance passes the patient pipeline's selection rule (score ≥ 0.55, top hit expected), with no ties and no
  extra facts revealed.
* Each history item's own canonical question selects that item.
* recall@3 is 1.00 in both locales for the corpus (72/72). On two held-out learner probe sets it was 0.70 (113
  utterances) and 0.85 (60 utterances) before the pass-3 keyword review, and 1.00 on both after it. Fresh negative
  probes (blood group, vaccines, headache, pacemaker, name) select no fact.
* Known limitation: an English utterance containing "painkillers" cannot reach `h-meds` without hijacking every pain
  question. The matcher treats "pain" as a prefix match of "painkiller", so "any painkillers today?" gets a
  clarifying question instead.

## References

The case's `debrief.references` (one Vancouver string each). DOIs were verified on 2026-10-28 by web search, each
returning the publisher's, PubMed's or a bibliographic database's record for that DOI with matching title, journal,
volume and pages (the Crossref API, doi.org and PubMed hosts were not reachable from the editing session). No DOI is
given where none could be verified.

1. Konstantinides SV, Meyer G, Becattini C, et al. 2019 ESC Guidelines for the diagnosis and management of acute
   pulmonary embolism developed in collaboration with the European Respiratory Society (ERS). Eur Heart J.
   2020;41(4):543-603. doi:10.1093/eurheartj/ehz405
2. Creager MA, Barnes GD, Giri J, et al. 2026 AHA/ACC/ACCP/ACEP/CHEST/SCAI/SHM/SIR/SVM/SVN guideline for the
   evaluation and management of acute pulmonary embolism in adults. Circulation. 2026;153(12):e977-e1051.
   doi:10.1161/CIR.0000000000001415
3. Stevens SM, Woller SC, Baumann Kreuziger L, et al. Antithrombotic therapy for VTE disease: second update of the
   CHEST guideline and expert panel report. Chest. 2021;160(6):e545-e608. doi:10.1016/j.chest.2021.07.055
4. Ortel TL, Neumann I, Ageno W, et al. American Society of Hematology 2020 guidelines for management of venous
   thromboembolism: treatment of deep vein thrombosis and pulmonary embolism. Blood Adv. 2020;4(19):4693-4738.
   doi:10.1182/bloodadvances.2020001830
5. 中华医学会呼吸病学分会肺栓塞与肺血管病学组, 等. 中国肺血栓栓塞症诊治、预防和管理指南（2025版）. 中华医学杂志.
   2025;105(26):2162-2194. doi:10.3760/cma.j.cn112137-20250509-01141
6. 中华医学会呼吸病学分会肺栓塞与肺血管病学组, 中国医师协会呼吸医师分会肺栓塞与肺血管病工作委员会, 全国肺栓塞与肺血管病防治协作组.
   肺血栓栓塞症诊治与预防指南. 中华医学杂志. 2018;98(14):1060-1087.
7. 中华医学会心血管病学分会, 中华心血管病杂志编辑委员会. 急性肺栓塞诊断和治疗指南2025. 中华心血管病杂志.
   2025;53(6):587-619.
8. National Institute for Health and Care Excellence. Venous thromboembolic diseases: diagnosis, management and
   thrombophilia testing (NG158). London: NICE; 2020 (updated 2023).
9. O'Driscoll BR, Howard LS, Earis J, Mak V. BTS guideline for oxygen use in adults in healthcare and emergency
   settings. Thorax. 2017;72(Suppl 1):ii1-ii90. doi:10.1136/thoraxjnl-2016-209729
10. Gould MK, Garcia DA, Wren SM, et al. Prevention of VTE in nonorthopedic surgical patients: Antithrombotic Therapy
    and Prevention of Thrombosis, 9th ed: American College of Chest Physicians evidence-based clinical practice
    guidelines. Chest. 2012;141(2 Suppl):e227S-e277S. doi:10.1378/chest.11-2297
11. Wells PS, Anderson DR, Rodger M, et al. Derivation of a simple clinical model to categorize patients' probability
    of pulmonary embolism: increasing the model's utility with the SimpliRED D-dimer. Thromb Haemost.
    2000;83(3):416-420.
12. Le Gal G, Righini M, Roy PM, et al. Prediction of pulmonary embolism in the emergency department: the revised
    Geneva score. Ann Intern Med. 2006;144(3):165-171. doi:10.7326/0003-4819-144-3-200602070-00004
13. Aujesky D, Obrosky DS, Stone RA, et al. Derivation and validation of a prognostic model for pulmonary embolism.
    Am J Respir Crit Care Med. 2005;172(8):1041-1046. doi:10.1164/rccm.200506-862OC
14. Jiménez D, Aujesky D, Moores L, et al. Simplification of the pulmonary embolism severity index for prognostication
    in patients with acute symptomatic pulmonary embolism. Arch Intern Med. 2010;170(15):1383-1389.
    doi:10.1001/archinternmed.2010.199
15. Rudski LG, Lai WW, Afilalo J, et al. Guidelines for the echocardiographic assessment of the right heart in adults:
    a report from the American Society of Echocardiography. J Am Soc Echocardiogr. 2010;23(7):685-713.
16. Meyer G, Vicaut E, Danays T, et al. Fibrinolysis for patients with intermediate-risk pulmonary embolism. N Engl J
    Med. 2014;370(15):1402-1411. doi:10.1056/NEJMoa1302097
17. Mismetti P, Laporte S, Pellerin O, et al. Effect of a retrievable inferior vena cava filter plus anticoagulation vs
    anticoagulation alone on risk of recurrent pulmonary embolism: a randomized clinical trial. JAMA.
    2015;313(16):1627-1635. doi:10.1001/jama.2015.3780
18. PREPIC Study Group. Eight-year follow-up of patients with permanent vena cava filters in the prevention of
    pulmonary embolism: the PREPIC (Prévention du Risque d'Embolie Pulmonaire par Interruption Cave) randomized study.
    Circulation. 2005;112(3):416-422.

Refs. 16 and 17 are the PEITHO and PREPIC2 trials.

### To verify

- **UFH as the single best answer.** AHA/ACC 2026 gives LMWH over UFH a class 1 recommendation for hospitalised
  category C–E1 patients, and ESC 2019 class I, level A; the case keeps UFH as best for her (post-op day 3, recent
  wound ooze, possible rescue reperfusion or re-operation; the surgeons' preference) and LMWH as acceptable (−1 point,
  `r-mx-ufh`). Have a clinician confirm the patient-specific exception, and check whether the 2026 guideline's
  supporting text names exceptions (planned procedures, high bleeding risk).
- **Her AHA/ACC 2026 clinical category** (C or D and its subcategory) — not stated, since the category definitions
  could not be read from the primary text.
- **The two 2025 Chinese guidelines** (refs. 5 and 7) were identified but their full text was not accessible:
  check the alteplase regimen (the case quotes the 2018 guideline's 50 mg over 2 h) and how they classify recent major
  surgery as a lytic contraindication. Ref. 7's DOI (seen only on a reposted copy) is not given.
- **DOIs not given** because they could not be verified: refs. 6 (and its last page, 1086 or 1087), 11, 15 and 18.
- BTS began a new guideline on target oxygen saturations in 2023; the case keeps the 2017 target (94–98 %).

## Changelog

### 1.1.2 — 2026-10-30 (assessment validity)

- **Options rebalanced so the key is not cued by length; option ids neutral.** The keyed option was the longest
  option in `dx-strategy` (both languages), `anticoag-choice` (Chinese) and `risk-strat` (English), a length cue the
  content lints now flag (CASE_AUTHORING §9.8); it is now the longest in none. The `dx-strategy` key is tightened
  without losing content, and the distractors state, in the key's register and specificity, the reason a learner would
  choose them (see "Decisions"); in `escalation-plan` the `no-lysis` statement is tightened and two wrong statements
  gain their reason (a filter "so soon after surgery", discharge "once her oxygen requirement settles"). Feedback
  gained a sentence where a distractor's new reason needed an answer (`echo-only`, `empirical-lysis`, `prophylactic`,
  `high`). Medical meaning, correct flags and option ids (already content ids) are unchanged; the reference path still
  scores 22/22.
- Matcher corpus: one `extensions.testUtterances` entry that was one of its item's keywords ("NKDA?") is now a
  paraphrase (`cases validate --strict`); no history item, answer or keyword changed.

### 1.1.1 — 2026-10-28 (assessment integrity)

- `r-safety-no-lysis` is **critical** (`critical: true`): systemic thrombolysis in this early post-operative patient
  (or no anticoagulation at all) is named first in every debrief. The score is not capped — the managed-lysis path
  still scores 16/22 (73 %). No item needed `scoredWhen`: the negative items were already gated on reaching their
  stage, and doing nothing scores 0/22.
- Matcher corpus: two `extensions.testUtterances` that repeated their item's canonical question are now paraphrases
  (`cases validate --strict`); no history item, answer or keyword changed.

### 1.1.0 — 2026-10-28 (editorial review)

- **Anticoagulant choice framed against current guidance.** The 2026 AHA/ACC acute PE guideline (new) and ESC 2019
  recommend LMWH over UFH for most patients needing parenteral anticoagulation. The `anticoag-choice` UFH feedback now
  says UFH is a patient-specific choice for her; the LMWH feedback and key reasoning cite ESC 2019 class I and AHA/ACC
  2026 class 1. UFH stays the single best answer (see To verify).
- **AHA/ACC 2026 clinical categories** (A–E; PERT assessment class 1 for C–E) added to the disposition teaching point.
- **Safety items weigh most.** `r-safety-no-lysis` 2 → 3, `r-safety-no-harm` 1 → 2, `r-safety-bleeding` 1 → 2
  (deterministic total 19 → 22). The score table was replayed again with the engine for every path (the 12 rows, in
  order): under the old weights the replay reproduces the version-1.0.0 figures for the reference, aspirin/GTN, LMWH,
  early-UFH, bare-minimum, slow work-up, empirical-lysis, every-harm and timeout rows; for the UFH-only and the two
  managed-lysis rows it differs by one point (3, 14 and 13 of 19 against the old 4, 13 and 12), so those rows now
  describe the paths as replayed.
- **Teaching points** each name the guidance they rest on (ACCP 2012 grade 1B for extended prophylaxis; ESC 2019).
- **References** normalised to one Vancouver string each and DOIs added after verification; added the 2026 AHA/ACC
  guideline, the 2025 Chinese PTE guideline (CTS) and the 2025 CSC acute PE guideline, and the PESI (Aujesky 2005) and
  revised Geneva (Le Gal 2006) derivation papers the case's scores come from; trial names moved out of titles.
- New `learningOutcomes` (6) and `provenance.review` (`editorial`); version 1.0.0 → 1.1.0.
- README restructured to the facilitator-guide template (PEARLS debrief, common errors, rubric table, Chinese summary);
  the embodied scores re-measured (teaching hospital now 100 %).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/pulmonary-embolism-postop/case.json
npm run -s cc -- cases verify pulmonary-embolism-postop      # reference solution: 5 objectives, 4 decisions, 22/22
npm run -s cc -- play pulmonary-embolism-postop --provider offline
npm run -s cc -- exec --autopilot --embodied --case pulmonary-embolism-postop --facility teaching-hospital --provider offline --approval bypass -q "manage the patient"
npm run -s cc -- bench grounding --split dev && npm run -s cc -- bench grounding --split test --failures 0
```

## 中文摘要

**病例概要。** 52岁女性，结肠癌开腹右半结肠切除术后第3天，从厕所走回病床途中突发右侧胸膜性胸痛和气促。心率118次/分，血压
112/70 mmHg，呼吸26次/分，未吸氧SpO2 89%；右小腿肿胀、深静脉走行压痛。前一晚因切口少量渗液停用一次预防性依诺肝素，之后无人
复评。诊断为**急性双侧肺栓塞伴右腘静脉及小腿深静脉血栓，ESC 2019中高危**（血流动力学稳定；PESI 122分IV级，sPESI 3分；
CTPA右心室/左心室1.3；hs-cTnT 68 ng/L）。

**学习目标。**

1. 床旁识别术后急性肺栓塞，立即给氧至SpO2 94–98%并接上持续监护。
2. 计算Wells（10分）与修订Geneva（16分）评分；“很可能”时不查D-二聚体，直接CTPA。
3. 快速评估出血风险（切口、出血史、血常规和凝血基线、通知外科）后，在影像结果出来前开始胃肠外抗凝，并说明术后早期选择普通肝素或
   低分子肝素的理由。
4. 按ESC 2019顺序分层（血流动力学 → PESI/sPESI → 右心室影像与肌钙蛋白），判定为中高危。
5. 转入HDU/ICU监护48–72小时、通知PERT、不行全身溶栓，恶化时经导管介入或外科取栓补救。
6. 避免右心压力负荷过重时的有害反射（大量补液、利尿、硝酸酯、NSAID或阿司匹林、早期口服DOAC、患肢气压治疗、无指征滤器）。

**关键决策。** ① 诊断策略：直接CTPA，等待期间开始抗凝；② 初始抗凝：本例首选普通肝素静脉泵入（术后早期可快速停用、可被鱼精蛋白
完全中和；低分子肝素可接受——ESC 2019与AHA/ACC 2026对多数患者推荐低分子肝素，本例选择普通肝素属个体化判断）；③ 风险分层：
中高危（按就诊时状态）；④ 后续处理（多选）：不溶栓、监护48–72小时、PERT补救预案。安全项权重最高：未溶栓3分，出血风险评估2分，
避免有害措施2分。

**复盘要点（PEARLS）。** 先问感受（护士说血氧一直低于90%时你怎么想？），再请学员复述病例，然后分析：Wells/Geneva评分与术后
D-二聚体的价值；为何在CTPA前开始抗凝、开始前查了什么；普通肝素与低分子肝素之争（两部指南均倾向低分子肝素，她有何不同）；逐步
风险分层、什么情况会变成高危；为何不溶栓、休克时的补救方案；被暂停的预防剂量给我们的教训。最后总结：术后突发气促患者最初30分钟
要做的事——吸氧和监护、估计验前概率、评估出血后在影像前抗凝、及早升级。2026年AHA/ACC指南改用A–E临床分类，并推荐对C–E类患者
进行PERT评估；本病例会诊板仍采用ESC 2019风险分层。
