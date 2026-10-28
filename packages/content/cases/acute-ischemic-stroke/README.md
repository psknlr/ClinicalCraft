# acute-ischemic-stroke — Right-sided weakness and difficulty speaking · 67-year-old man

> **Synthetic case — 虚构教学病例.** Every person, time, value and event in this case is invented
> for teaching. It is not based on any identifiable patient. The patient ("Zhao Deming / 赵德明"),
> his wife ("Sun Xiulan / 孙秀兰") and all staff are pseudonyms. It is not medical advice and does
> not replace local stroke protocols or current guidelines.

## Case card

| | |
|---|---|
| Case | `acute-ischemic-stroke` · v1.1.0 |
| Setting | Emergency department, resus bay 1 (`emergency`); later the neuro-angiography suite |
| Facility | `general-hospital` (also playable in `teaching-hospital`) |
| Difficulty | 4 / 5 |
| Estimated time | ~40 min (simulated clock from 10:05, limit 150 min) |
| Specialty | Neurology, emergency medicine |
| Languages | zh-CN (source), en |
| Review status | Editorial review 2026-10-28 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; have a stroke clinician review it before teaching use |

## Learning outcomes

By the end of the case the learner can:

1. Establish last known well from a witness — 08:55 here, not the 09:10 discovery — and use it to
   set the thrombolysis (4.5 h) and thrombectomy (6 h) windows.
2. Score the NIHSS in an aphasic patient and localise a left MCA syndrome from its cortical signs
   (aphasia, gaze preference, field defect), identifying atrial fibrillation as the likely embolic
   source.
3. Choose non-contrast CT with same-session CTA as the first imaging — without waiting for
   creatinine when there is no known renal disease — and read it for haemorrhage, ASPECTS and a
   large-vessel occlusion.
4. Complete the pre-thrombolysis safety check — CT excluding haemorrhage, a glucose result, an
   explicit anticoagulant history and BP < 185/110 mmHg with a titratable IV agent — and give
   alteplase 0.9 mg/kg (max 90 mg) or tenecteplase 0.25 mg/kg (max 25 mg) within a door-to-needle
   time of 60 minutes, without waiting for coagulation or platelet results when no anticoagulant is
   taken.
5. Apply the thrombectomy criteria (anterior-circulation LVO, NIHSS ≥ 6, ASPECTS ≥ 6, groin puncture
   within 6 h of last known well, pre-stroke mRS 0–1) and bridge from IV thrombolysis to
   thrombectomy without waiting for a response.
6. Write the post-thrombolysis orders: scheduled neurological and BP observations with BP kept
   < 180/105 mmHg, no antiplatelets or anticoagulants for 24 h, and nil by mouth — tablets included
   — until a swallow screen is passed.

These are `learningOutcomes` in `case.json`; the HUD `objectives` below are the in-game task list.
Written for the debrief, the outcomes name this patient's findings and the decisions' answers, so
front-ends show them before play only behind a closed **Learning outcomes (6) · may reveal the
diagnosis** disclosure and list them in every debrief (CASE_AUTHORING §9.4, GLOSSARY §4).

## Clinical summary (spoilers)

A 67-year-old retired electrician is brought to the emergency department by 120 ambulance at
10:05. His wife last saw him normal at **08:55**, reading the paper after breakfast. At about
**09:10** she heard his tea cup smash and found him slumped on the sofa: his right arm and leg
were weak and he could not get his words out. The paramedics measured no glucose because the
glucometer failed, and they could not get IV access.

On arrival his BP is 192/104 mmHg (MAP 133), HR is 96/min and irregular (atrial fibrillation, which
the learner earns from the monitor, the pulse or the ECG), SpO₂ is 96 % on room air and his GCS is 13
(E4 V3 M6; the verbal score is limited by aphasia).

He has an **expressive (Broca-type) aphasia**. He understands simple questions and answers yes or
no by nodding, but he cannot give a history. His wife is the companion with `answersHistory: true`.

Background:

* Hypertension on amlodipine.
* **Paroxysmal AF diagnosed two years ago and never anticoagulated.** He declined the blood thinner
  he was offered.
* A probable TIA three weeks ago, which he never had assessed. His wife mentions it only if asked
  directly (`specific` disclosure).

The case hinges on a few things the learner must actively find out:

* **Last known well.** It is 08:55, not the 09:10 discovery time.
* **Anticoagulant status.** A patient with AF must be asked explicitly; the answer is a
  `specific`-disclosure item. His wife is certain he takes no anticoagulant, and the electronic
  health record confirms it.
* **Weight.** It is 80 kg, needed for the thrombolytic dose.

History coverage: 36 items. Besides the stroke-specific questions they answer handedness (right),
recent fever or infection (none), recreational drugs (none) and swallowing since onset (nothing by
mouth, drooling). Four `unknown` items keep missing data missing: home BP that morning, his
cholesterol, the type of his father's stroke, and symptoms he cannot report because of the aphasia
(blurred vision, dizziness, numbness).

**Diagnosis** (hidden from learners): acute ischaemic stroke from a **proximal left MCA M1
occlusion**, cardioembolic (AF). NIHSS 14, ASPECTS 9, moderate-to-good collaterals (Tan 2/3).
Bridging tenecteplase or alteplase and thrombectomy: eTICI 2c after one pass, on-table NIHSS 6.

## Scenario timeline and physiology

**Timeline.** LKW 08:55 · found 09:10 · 120 call 09:12 · on scene 09:28 · pre-alert 09:50 · door
10:05 (minute 0). IVT window to 13:25, EVT window to 14:55, door-to-needle target ≤ 60 min (needle by
11:05).

* **Baseline.** BP 192/104, HR 96 (AF), RR 18, SpO₂ 96 %, T 36.8 °C, GCS 13, pain 0.
  * The baseline deliberately has **no glucose**, so the monitor does not reveal it; the learner
    must order the point-of-care test.
  * **Bedside monitor (`physiology.monitor`).** The triage note puts him in resus bay 1 "not yet on
    the monitor", so until `cardiac-monitoring` is given (or the post-thrombolysis monitoring
    orders, `post-lysis-monitoring` — BP every 15 min on the cardiac monitor —, or he reaches the
    angio suite, phase `angio`, which is monitored) the bedside shows only the triage set taken by
    hand — BP 192/104, HR 96, RR 18, SpO₂ 96 %, T 36.8 °C (`spotChecks`, static, no alarm) — plus GCS
    and pain. **No rhythm**: atrial fibrillation is earned from the monitor, the irregular pulse on
    examination or the 12-lead ECG, never given away on arrival. The response of the step that
    attaches the monitor names no rhythm either (the screen shows it).
  * The SBP warning alarm (> 180) sounds as soon as the monitor is attached.
* **BP agents** (effects persist; they are not titrated off in this case):

  | Agent | Dose text (as the learner sees it) | SBP | DBP | HR | Onset / ramp |
  |---|---|---|---|---|---|
  | Labetalol | 10 mg IV over 1–2 min, may repeat once after 10 min (10–20 mg) | −20 | −10 | −8 | 2 min / 5 min |
  | Urapidil | 12.5 mg slow IV, repeat after 5 min if needed; maintenance ≈ 9 mg/h | −20 | −10 | — | 2 min / 5 min |
  | Nicardipine | 5 mg/h, +2.5 mg/h every 5–15 min, max 15 mg/h | −22 | −10 | +5 | 5 min / 10 min |

  * Each agent is *indicated* while BP is > 180/105.
  * Each is *contraindicated* (over-treatment) once SBP is < 160; labetalol also when HR is < 55
    (beta-blockade; bradycardia is not a contraindication to nicardipine or urapidil).
* **Sublingual nifedipine** is always contraindicated.
  * Effect: SBP −48 over about 10 min.
  * Once SBP falls below 160, event `nifedipine-drop` fires: GCS 11 and flag `precipitous-bp-drop`
    (penumbral hypoperfusion).
* **Over-lowering with IV agents.** If SBP falls below 130 mmHg before reperfusion (e.g. labetalol
  twice + nicardipine + urapidil), event `bp-overshoot` fires: GCS 11 and flag `bp-overshoot`, which
  fails the BP rubric item. It does not fire again after `nifedipine-drop`.
* **Thrombolysis safety logic** applies to both alteplase and tenecteplase.
  * *Contraindicated* if any of these holds:
    * the CT has not been read;
    * no glucose has been read (capillary `poc-glucose` or the laboratory plasma glucose in `chem`);
    * anticoagulant status is unknown (not asked **and** coagulation not read);
    * SBP > 185 or DBP > 110;
    * the other lytic has already been given;
    * flag `sich` is set;
    * flag `recanalised` is set (thrombectomy has already reperfused him — no IV lysis afterwards).
  * If a prerequisite was missing, event `lysis-checklist-incomplete` sets `lysis-unsafe`; if
    no glucose at all had been read, silent event `lysis-no-glucose` also fails the glucose
    rubric item.
  * If BP was still > 185/110 at the moment of lysis, event `sich` fires: **suspected symptomatic
    ICH**.
    * GCS 9, BP 212/116, headache, vomiting.
    * Flags `sich` and `lysis-bp-uncontrolled`.
    * The `sich-protocol` intervention is indicated only then: stop any running lytic, then
      cryoprecipitate and/or TXA, haematology and neurosurgical review (AHA/ASA 2019 management of
      symptomatic bleeding after IV thrombolysis).
    * Transfer for thrombectomy becomes contraindicated and the `angio` phase is never entered,
      so the DSA result (which describes a successful thrombectomy) cannot be read.
    * This branch is a deterministic teaching device with a compressed timeline.
* **Time pressure.**

  | When | What happens |
  |---|---|
  | 8 min, no glucose ordered | nurse prompt |
  | 20 min, no CT ordered | `ct-delayed` (fails the imaging rubric item) |
  | 60 min, no lysis | `dtn-over-60` |
  | From minute 45 without reperfusion | a GCS trend drifts down (−0.015/min, max −2) |
  | 90 min, no lysis or transfer | event `penumbra-loss`: baseline GCS 12, shown as 11 with the running trend (10 by 150 min); forced gaze, plegic right side |

  The GCS trend stops when lysis is given or he is transferred.
* **Waiting for labs.** If, at 45 min or later, the coagulation or blood-count result is ready and no
  lysis has been given, flag `waited-for-labs` is set. A learner who sent bloods early and lysed
  within 45 min (the high-performing DTN target) is therefore not penalised just because a result
  happened to come back first.
* **Transfer.** The `angio` phase is entered only when flag `transferred-angio` is set **and**
  the bedside glucose, NIHSS, plain CT and CTA have been read **and** there is no suspected sICH.
  A premature (contraindicated) transfer therefore waits until those are done instead of
  stranding the learner in `angio`, where the ED exam items and ED tests have no record.
* **Order notice.** The DSA/thrombectomy notice in `orderMatching.warnings` has
  `"unless": {"phase": "angio"}`: in the angio suite the result exists, so the `order_test` tool
  (`/order`, models, MCP) no longer prints it there. The condition is the phase alone because
  `angio` can be entered without the neurointervention call (`transfer-angio` is then not
  indicated, but allowed), and the result exists there either way. The text still states a
  condition ("results exist only once the neurointervention team has been called and the
  patient is there") instead of telling the learner to do something first that may already be
  done, because callers that pass no session — the web order panel today — print it in every
  phase, `angio` included.
* **Reperfusion.** When the DSA result is ready in the `angio` phase (and there was no sICH), event
  `reperfusion` fires: GCS 14, BP 168/94 baseline (shown as about 148/84 with the persisting
  antihypertensive effect), and the patient starts producing short phrases. If no lytic had been
  given by then, silent event `evt-without-ivt` sets a flag that fails the lysis rubric items, so
  a (contraindicated) lytic given after reperfusion cannot earn them back.
* **Turnarounds** (simulated minutes): capillary glucose 1, ECG 5, CT head 12, CTA 15, CT perfusion
  15, FBC 35, coagulation and chemistry 40, troponin 50, lipids/HbA1c 60, DSA/thrombectomy 40.

## Decisions and assessment

### Objectives (HUD chapters)

1. **Initial assessment and fast-track** — last-known-well time, bedside glucose, monitor, IV access
   and bloods, all in parallel.
2. **Neurological assessment and emergency imaging** — NIHSS; decide on NCCT plus CTA in the same
   sitting without waiting for creatinine; read the CT; localise the lesion and name the mechanism
   (left MCA syndrome with LVO, cardioembolic from AF).
3. **Thrombolysis eligibility** — anticoagulants, bleeding history, recent surgery or trauma;
   decide that he is eligible once BP is < 185/110 mmHg, **without waiting for coagulation or
   platelet results**.
4. **Deliver acute reperfusion treatment** — IV labetalol, nicardipine or urapidil, then alteplase
   0.9 mg/kg or tenecteplase 0.25 mg/kg; door-to-needle target ≤ 60 min. The chapter is ticked by
   any lysis or recanalisation (an unsafe lysis is penalised by the rubric, not here), so a learner
   who skipped lysis can finish when thrombectomy reperfuses him, without giving a (then
   contraindicated) lytic; the lysis rubric items stay unmet.
5. **Definitive treatment and ongoing care** — read the CTA and confirm thrombectomy eligibility
   (select-all decision); call neurointervention and transfer (bridging); order the post-lysis
   monitoring bundle; bedside swallow screen before anything by mouth (he fails it); in the angio
   suite, DSA and thrombectomy (eTICI 2c after one pass, on-table NIHSS 6). After a suspected sICH
   thrombectomy is off: the chapter closes once the sICH protocol and a swallow screen are done, so
   the debrief is still reachable.

Hints coach without results ("If the CTA shows an anterior-circulation LVO…"); the guidance copy
names the next place to go.

### Decisions

| id | kind | unlocked by | correct answer |
|---|---|---|---|
| `d-imaging` | single | LKW asked + NIHSS | Immediate NCCT + same-session CTA (no creatinine wait) |
| `d-diagnosis` | single | NIHSS + CT read + AF history or ECG | Left MCA territory AIS with LVO, cardioembolic (AF) |
| `d-lysis` | single | CT read + a glucose + anticoagulants asked | Eligible: lower BP < 185/110 with an IV agent, then lyse without waiting for labs; prepare EVT in parallel |
| `d-evt` | multiple | NIHSS + CT + CTA read + pre-stroke function asked | LVO (M1) · NIHSS ≥ 6 · ASPECTS ≥ 6 · puncture < 6 h from LKW · pre-stroke mRS 0–1 |

Every option carries educational feedback, including the distractors:

* `d-imaging`: wait for creatinine, MRI first, CT perfusion first, carotid duplex, lyse before CT.
* `d-diagnosis`: ICH, lacune, right MCA, posterior circulation, Todd's paresis, hypoglycaemia.
* `d-lysis`: "AF → wait for INR", "BP is a contraindication", "skip IVT and go straight to EVT",
  "unwitnessed onset → no lysis".
* `d-evt`: "needs a CTP mismatch", "wait 1 h after lysis", "age ≥ 65 is a contraindication".

`d-evt` quotes NIHSS 14 and ASPECTS 9 in its options, so it unlocks only once the NIHSS has been
scored and the CT head and the CTA have been read (plus the pre-stroke function question).

### Rubric (13 deterministic items, 18 points, + 2 examiner-judged)

| Domain | Item | Weight |
|---|---|---|
| History | Last known well and witness | 1 |
| History | Contraindication screen: anticoagulants, bleeding, recent surgery, head injury | 2 |
| History | Pre-stroke function and weight | 1 |
| Examination | NIHSS | 1 |
| Investigations | Glucose read before any thrombolytic | 1 |
| Investigations | NCCT + CTA read, with the CT ordered within 20 min | 1 |
| Diagnosis | Left MCA / cardioembolic, correct at the **first attempt** (`decidedFirstTry`) | 1 |
| Safety | BP < 185/110 with an IV agent before lysis, no nifedipine and no over-lowering | 2 |
| Safety | No aspirin or heparin within 24 h of lysis | 2 |
| Safety | Swallow screen and no oral intake | 1 |
| Management | DTN ≤ 60 min with a safe checklist | 2 |
| Management | Bridging EVT (decision, neurointervention call, transfer) | 2 |
| Efficiency | No waiting for labs | 1 |
| Communication (examiner) | Consent conversation with the wife and the aphasic patient | 1 |
| Communication (examiner) | SBAR handover to neurointervention | 1 |

The lysis items (BP, DTN, no lab wait) are unmet when thrombectomy reperfused him before any lytic.

### How wrong choices score

* **Safety events** (contraindicated, scored as such; effects still apply): aspirin at any point in
  this case — before CT, in place of or just before reperfusion, or within 24 h of lysis (ARTIS);
  IV heparin for the AF; mannitol; oral water or tablets before the swallow screen (he coughs, his
  voice turns wet); sublingual nifedipine; transfer for EVT before CT/CTA; a thrombolytic given
  before the checklist is complete or with BP > 185/110 (the sICH branch); a second thrombolytic;
  over-treatment of BP below SBP 160.
* **Low-value tests** carry teaching notes: CT perfusion (not needed < 6 h); MRI (no record — not in
  the hyperacute pathway); echo (no record — done on the stroke unit); chest X-ray; lipids/HbA1c.
* **Delays** set flags that fail rubric items: `ct-delayed` (no CT order by 20 min),
  `dtn-over-60`, `waited-for-labs`.

## Reference path (`solution`)

52 steps: monitor, glucose, stroke code and the timeline first; IV access and bloods (FBC,
coagulation, chemistry) at minute 5.5; general inspection and NIHSS; the imaging decision, then CT
head, CTA and ECG ordered together; labetalol at minute 12 (BP 171/93 by minute 20); the
contraindication questions, weight and function; targeted examination; ECG and CT read; the
diagnosis and lysis decisions; consent; **tenecteplase 20 mg at minute 25 (DTN 25 min)**; CTA read,
`d-evt`, neurointervention call, post-lysis orders, swallow screen and transfer (minute 31.5); DSA
in the angio suite; the late laboratory results are read last. It scores **18/18** on the
deterministic rubric, has no contraindicated actions and no critical alarms, reads every result it
orders and ends at simulated minute 75.5 (embodied autopilot: 80.2 / 79.7 in en / zh-CN).

## Clinical numbers check

| Item | Value | Working |
|---|---|---|
| Timeline | LKW 08:55 · found 09:10 · door 10:05 | LKW-to-door 70 min; IVT window to 13:25 (4.5 h); EVT window to 14:55 (6 h); DTN target → needle by 11:05 |
| NIHSS | **14** | 1b 1 + gaze 1 + visual 1 + face 2 + R arm 3 + R leg 2 + sensory 1 + language 2 + dysarthria 1 (all others 0) |
| NIHSS after EVT | **6** | face 1 + R arm 2 + R leg 1 + language 1 + dysarthria 1 |
| GCS | 13 | E4 V3 M6 (verbal limited by aphasia, he is alert) |
| ASPECTS | **9** | 10 − insula (insular ribbon sign) |
| MAP | 133 → 120 mmHg | (192 + 2 × 104)/3; after labetalol (172 + 2 × 94)/3 |
| Capillary glucose | 7.2 mmol/L (≈ 130 mg/dL) | × 18.02 |
| Anion gap | 12 mmol/L | 139 − (103 + 24) |
| Creatinine / eGFR | 88 µmol/L (1.0 mg/dL) / 83 mL/min/1.73 m² | CKD-EPI 2021, male, 67 y |
| LDL-C | 3.5 mmol/L | Friedewald 5.4 − 1.1 − 1.8/2.2 |
| HbA1c | 6.1 % (43 mmol/mol) | (6.1 − 2.15) × 10.929 |
| CHA₂DS₂-VASc | 2 before (age 65–74, HTN) → **4** after the stroke | +2 stroke/TIA (CHA₂DS₂-VA, ESC 2024: identical for a man) |
| CT perfusion (low-value) | core 12 mL, Tmax > 6 s 128 mL | mismatch 116 mL, ratio 10.7 |
| Alteplase (80 kg) | **72 mg** = 7.2 mg bolus over 1 min + 64.8 mg over 60 min | 0.9 mg/kg, max 90 mg |
| Tenecteplase (80 kg) | **20 mg** single bolus | 0.25 mg/kg, max 25 mg |
| BMI / smoking | 27.0 kg/m² / 30 pack-years (ex, quit 10 y) | 80/1.72²; 1 pack/day × 30 y |
| Thresholds | BP < 185/110 before lysis, < 180/105 for 24 h; glucose to correct < 2.8 or > 22.2 mmol/L; INR > 1.7, PT > 15 s, APTT > 40 s or platelets < 100 × 10⁹/L bar lysis | AHA/ASA 2019 (the BP thresholds are unchanged in AHA/ASA 2026) |

The same numbers are machine-readable in `extensions.clinicalScores`. Dose texts give formulas
only ("0.9 mg/kg, max 90 mg … by his weight"); the 72 mg / 20 mg figures appear only in the
responses, after the learner has the weight.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did that feel? What went through your mind when his wife said she found him
   at ten past nine?"
2. **Description** — "Summarise the case for me: the timeline, the key findings and what you did, in
   order." (Expect LKW 08:55, door 10:05, NIHSS 14, CT without bleed / ASPECTS 9, M1 occlusion.)
3. **Analysis** — use advocacy–inquiry on the points the learner's run raises:
   * "I noticed you timed the onset from 09:10; I was worried that this would have shut a patient
     out of lysis on another day. What was your thinking?"
   * "You waited for the coagulation screen before lysing. What made you want it? What would have
     made it necessary?" (anticoagulant use or a suspected coagulopathy only)
   * "His BP was 192/104. How did you decide between lowering it and calling it a
     contraindication? Why not sublingual nifedipine?"
   * "Once the CTA showed an M1 occlusion, what were you waiting for before calling the
     neurointervention team?" (nothing: bridge, do not wait for a lysis response)
   * "Why does a patient with AF have to be asked about anticoagulants by name?"
   * "When could he have his tablets and a drink?" (after a passed swallow screen)
4. **Summary** — "What are the two or three things you will do the same way in the next stroke call,
   and one thing you will do differently?"

### Teaching notes

* **The clock starts at last known well.** Using the time he was found (09:10) or calling the onset
  "unknown" are both errors; `d-lysis` has distractors for each.
* **Only glucose must precede lysis.** Platelets and coagulation are awaited only with
  anticoagulant use or a suspected coagulopathy. That is why the anticoagulant question in a
  patient with AF is a *specific* disclosure item and is required.
* **BP 192/104 is a barrier, not a contraindication.** Bring it under 185/110 mmHg with a titratable
  IV agent, confirm it, then lyse. Keep it < 180/105 mmHg for 24 h. Avoid precipitous drops.
* **Aphasia and scores.** Aphasia lowers the GCS verbal score without reduced consciousness. On
  NIHSS item 1b, answers he cannot give because of aphasia count as incorrect.
* **Bridging.** For an LVO, lysis and thrombectomy go together:
  * Do not wait for a lysis response.
  * Do not skip IVT in an eligible patient (ESO–ESMINT 2022: IVT plus MT over MT alone).
  * Within 6 h, perfusion imaging is unnecessary.
  * The AHA/ASA 2026 guideline gives either agent a Class 1 recommendation within 4.5 h; ESO 2023
    recommends tenecteplase 0.25 mg/kg over alteplase for a large-vessel occlusion (strong
    recommendation, moderate-quality evidence); the Chinese 2023 guideline also includes
    tenecteplase.
* **Missed prevention.** Long-standing AF went un-anticoagulated (CHA₂DS₂-VASc 2), and a probable
  TIA three weeks ago went unassessed. After the stroke his CHA₂DS₂-VASc is 4. The timing of oral
  anticoagulation is decided after 24-h imaging and is outside this case's scope.

### Common learner errors and how the case surfaces them

| Error | What the case does |
|---|---|
| Onset counted from 09:10, or called "unknown" | `d-lysis` distractors; `r-time-history` needs LKW + witness |
| Lysis without asking about anticoagulants (or CT, glucose) | lysis contraindicated; `lysis-checklist-incomplete` nurse line, `lysis-unsafe` fails DTN |
| Waiting for coagulation / platelets | `waited-for-labs` (≥ 45 min, result ready, no lysis) fails `r-no-lab-wait`; `dtn-60` nurse line |
| Lysis with BP still > 185/110 | `sich` event (headache, vomiting, GCS 9), thrombectomy off, sICH protocol |
| Sublingual nifedipine, or stacking IV agents | `nifedipine-drop` / `bp-overshoot` (GCS 11) |
| Aspirin, heparin, mannitol | safety events with explanatory `harm` texts |
| Water or tablets before the swallow screen | coughs, wet voice, brief desaturation; `r-swallow` unmet |
| CT perfusion or MRI before treatment | low-value notes; time cost |
| Transfer before CT/CTA | contraindicated; the `angio` phase waits for the reads |

## Embodied mode

**Grounding (world policy).** In embodied mode a clinical act needs the kit it names at the bedside
and IV access is patient state (docs/EMBODIED.md §6, docs/CASE_AUTHORING.md §8): the IV infusions
`nicardipine`, `alteplase` and `heparin` also require `iv-access`, so the case's `iv-access`
procedure ("Peripheral IV access and bloods", the crash cart's cannulation kit at the bedside) must
be done before them; the infusion pump stays required at the bedside (infusion hardware — it
provides no IV access itself). The reference solution places the cannula first, so `cases verify`
and the embodied autopilot are unchanged in score; the scripted benchmark safety scenarios start with
the cannula in place so that the approval gate is what stops thrombolysis.

**Scope of practice.** `swallow-screen` is authored `scope: "nursing"`: the bedside water-swallow
screen is nurse-led on stroke units (docs/EMBODIED.md §8 scope of practice); the sICH protocol stays
medical.

**Where the patient goes and how they look** (reviews G8/G12). The `angio` phase has
`location: {"capability": "fluoroscopy"}` — when it starts (after `transfer-angio` and the reads it
requires) the team moves the patient onto the cath-lab table beside the C-arm (no time charged),
where `dsa-evt` is then ordered; `cxr` is `performedAt: "bedside"` (a portable film: nobody is
moved); `oxygen` names `device: "nasal-cannula"`. The non-contrast CT head, CTA and CT perfusion are
done on the patient at the CT scanner: in embodied mode the patient is wheeled there on the resus
trolley and back (the autopilot does both scans in one trip: 36.6 m there, 37.8 m back, 0.16 min each
way; in `teaching-hospital` the porter does it). Scores are unchanged (100 in both modes).

## Fidelity limits

* Antihypertensive effects persist once given (no titration off, no infusion-rate changes); repeat
  boluses add.
* The sICH branch is deterministic and compressed in time; there is no failed-thrombectomy,
  reocclusion or haemorrhagic-transformation branch after successful reperfusion.
* Neurological deterioration is a simple GCS trend plus one scripted `penumbra-loss` event; the
  NIHSS finding text does not change with it.
* The thrombectomy result is fixed (one pass, eTICI 2c) whatever the agent or timing.
* The post-thrombolysis monitoring bundle also serves as the post-procedure monitoring order when
  thrombectomy reperfused him without IV lysis (chapter 5 asks for it in both paths).
* Consent and the neurointervention handover are judged by the examiner from the transcript, not by
  a deterministic criterion.
* The case ends with recanalisation: 24-h imaging, stroke-unit care, the AF work-up and the timing of
  anticoagulation are not modelled.

## Matcher notes

`extensions.testUtterances` holds 78 bilingual paraphrases (43 zh-CN, 35 en), including colloquial
Chinese (有木有, 咋了, 啥药), typos (华法令, warfrin) and abbreviations (LKW, TIA, DOAC, BP, hx, b4).
Each expected id is the **top** `matchHistory` hit with a score ≥ 0.55 (the `cases verify` rule),
ties being broken by declaration order. Two declaration-order choices keep the corpus stable:

* `head-trauma` is placed before `headache-vomiting`, because "head" prefix-matches "headache".
* `unknown-father-stroke-type` is placed before `prior-stroke`.

`excludeKeywords` steer look-alike questions: medications vs anticoagulants / recreational drugs,
last known well vs "were you with him", bleeding history vs "risk of bleeding" or a parent's stroke,
last meal vs swallowing, hypertension vs "did he take his BP pill today", today's home BP reading
(`unknown-bp-today`, which takes 量过血压 but excludes 平时 / "usually") vs his usual BP (`pmh-htn`),
and "don't worry" away from the concerns item. "Was his father's stroke a clot or a bleed?" lists
`family-history` in `alsoOk`: crediting the family history with the unknown stroke type is
intended. Avoid generic Chinese bigrams such as 什么, 有没有, 怎么, 吃了 in keywords:
the character matcher scores them against every question.

Recall@3 on 106 learner-style probes rose from 0.755 to 1.000. A second set of 60, written after
the first keyword pass, scored 0.800 on the original case and 0.917 after that pass (1.000 after a
second pass that also used it). The grounding benchmark (`grounding-v1`) holds this case's held-out
items; the 1.1.0 edits changed no history question, answer or keyword.

## References

1. Prabhakaran S, Gonzalez NR, Zachrison KS, et al. 2026 Guideline for the Early Management of
   Patients With Acute Ischemic Stroke: A Guideline From the American Heart Association/American
   Stroke Association. Stroke. 2026;57(8):e316-e436. doi:10.1161/STR.0000000000000513
2. Powers WJ, Rabinstein AA, Ackerson T, et al. Guidelines for the Early Management of Patients With
   Acute Ischemic Stroke: 2019 Update to the 2018 Guidelines for the Early Management of Acute
   Ischemic Stroke: A Guideline for Healthcare Professionals From the American Heart
   Association/American Stroke Association. Stroke. 2019;50(12):e344-e418.
   doi:10.1161/STR.0000000000000211 (superseded by ref. 1; cited for the post-thrombolysis care and
   symptomatic-bleeding management tables the case uses)
3. Berge E, Whiteley W, Audebert H, et al. European Stroke Organisation (ESO) guidelines on
   intravenous thrombolysis for acute ischaemic stroke. Eur Stroke J. 2021;6(1):I-LXII.
   doi:10.1177/2396987321989865
4. Alamowitch S, Turc G, Palaiodimou L, et al. European Stroke Organisation (ESO) expedited
   recommendation on tenecteplase for acute ischaemic stroke. Eur Stroke J. 2023;8(1):8-54.
   doi:10.1177/23969873221150022
5. Turc G, Bhogal P, Fischer U, et al. European Stroke Organisation (ESO) – European Society for
   Minimally Invasive Neurological Therapy (ESMINT) Guidelines on Mechanical Thrombectomy in Acute
   Ischaemic Stroke. Eur Stroke J. 2019;4(1):6-12. doi:10.1177/2396987319832140
6. Turc G, Tsivgoulis G, Audebert HJ, et al. European Stroke Organisation (ESO)–European Society for
   Minimally Invasive Neurological Therapy (ESMINT) expedited recommendation on indication for
   intravenous thrombolysis before mechanical thrombectomy in patients with acute ischemic stroke and
   anterior circulation large vessel occlusion. Eur Stroke J. 2022;7(1):I-XXVI.
   doi:10.1177/23969873221076968
7. 中华医学会神经病学分会, 中华医学会神经病学分会脑血管病学组. 中国急性缺血性卒中诊治指南2023.
   中华神经科杂志. 2024;57(6):523-559. doi:10.3760/cma.j.cn113694-20240410-00221
8. 中华医学会神经病学分会, 中华医学会神经病学分会脑血管病学组, 中华医学会神经病学分会神经血管介入协作组.
   中国急性缺血性卒中早期血管内介入诊疗指南2022. 中华神经科杂志. 2022;55(6).
9. Brott T, Adams HP Jr, Olinger CP, et al. Measurements of acute cerebral infarction: a clinical
   examination scale. Stroke. 1989;20(7):864-870. doi:10.1161/01.STR.20.7.864
10. Barber PA, Demchuk AM, Zhang J, Buchan AM. Validity and reliability of a quantitative computed
    tomography score in predicting outcome of hyperacute stroke before thrombolytic therapy. Lancet.
    2000;355(9216):1670-1674. doi:10.1016/S0140-6736(00)02237-6
11. Goyal M, Menon BK, van Zwam WH, et al. Endovascular thrombectomy after large-vessel ischaemic
    stroke: a meta-analysis of individual patient data from five randomised trials. Lancet.
    2016;387(10029):1723-1731. doi:10.1016/S0140-6736(16)00163-X
12. Campbell BCV, Mitchell PJ, Churilov L, et al. Tenecteplase versus Alteplase before Thrombectomy
    for Ischemic Stroke. N Engl J Med. 2018;378(17):1573-1582. doi:10.1056/NEJMoa1716405
13. Wang Y, Li S, Pan Y, et al. Tenecteplase versus alteplase in acute ischaemic cerebrovascular
    events (TRACE-2): a phase 3, multicentre, open-label, randomised controlled, non-inferiority
    trial. Lancet. 2023;401(10377):645-654. doi:10.1016/S0140-6736(22)02600-9
14. Zinkstok SM, Roos YB; ARTIS investigators. Early administration of aspirin in patients treated
    with alteplase for acute ischaemic stroke: a randomised controlled trial. Lancet.
    2012;380(9843):731-737. doi:10.1016/S0140-6736(12)60949-0
15. Yang P, Song L, Zhang Y, et al. Intensive blood pressure control after endovascular thrombectomy
    for acute ischaemic stroke (ENCHANTED2/MT): a multicentre, open-label, blinded-endpoint,
    randomised controlled trial. Lancet. 2022;400(10363):1585-1596.
    doi:10.1016/S0140-6736(22)01882-7
16. Van Gelder IC, Rienstra M, Bunting KV, et al. 2024 ESC Guidelines for the management of atrial
    fibrillation developed in collaboration with the European Association for Cardio-Thoracic
    Surgery (EACTS). Eur Heart J. 2024;45(36):3314-3414. doi:10.1093/eurheartj/ehae176

The same strings are `debrief.references` in `case.json`. Every DOI was checked by web lookup on
2026-10-28 (PubMed, the publisher or an institutional repository record giving the same title,
journal, volume and pages); none was added from memory.

### To verify

* Ref. 8 (中国急性缺血性卒中早期血管内介入诊疗指南2022): the volume and issue (55(6)) and the first page
  (565) were found; the last page and the DOI could not be confirmed, so neither is given.
* AHA/ASA 2026: the case's post-thrombolysis observation schedule and the symptomatic-bleeding
  protocol follow the 2019 update (ref. 2); the 2026 full text was not available to compare those
  two tables line by line.
* The teaching point that attributes "swallow screen before any food, drink or oral medication" to
  AHA/ASA cites no class or level of evidence; check the wording against ref. 1.

## Changelog

### 1.1.0 — 2026-10-28 (editorial review)

* Added six `learningOutcomes` — specific and written for the debrief (CASE_AUTHORING §9.4) — and
  `provenance.review` (status `editorial`, the guidance checked).
* References normalised to one Vancouver style with DOIs verified by web lookup. **TRACE-2 corrected**:
  the first author is Wang Y (not "Li S, Pan Y, Wang Z") and the title is "Tenecteplase versus
  alteplase in acute ischaemic cerebrovascular events (TRACE-2) …". The AHA/ASA 2026 guideline now
  carries its issue, pages and DOI (Stroke 2026;57(8):e316-e436).
* Thrombolytic teaching point: ESO 2023 **recommends** (strong recommendation, moderate-quality
  evidence) tenecteplase over alteplase for a large-vessel occlusion — it had said "suggests"; the
  AHA/ASA 2026 Class 1 for either agent and the Chinese 2023 inclusion of tenecteplase are stated.
* The monitor-attach response no longer names the rhythm ("continuous ECG (atrial fibrillation)"):
  the step that attaches the monitor names no rhythm (CASE_AUTHORING §6) — AF is read from the
  screen, the pulse or the ECG.
* The attending's brief no longer contains his weight ("doses … for 80 kg" → "for his weight"): NPC
  knowledge holds no patient value the learner must elicit.
* NIHSS item 4 wording matches the face finding ("partial paralysis — near-total paralysis of the
  right lower face", score 2).
* Rubric: "no aspirin or heparin within 24 h of lysis" is safety-critical (symptomatic ICH) and now
  weighs 2 like the other safety items (deterministic total 17 → 18).
* Debrief teaching points name the guidance they rest on (AHA/ASA, Target: Stroke Phase III, ESO,
  ARTIS, the NIHSS scoring instructions).
* README restructured to the facilitator-guide template (PEARLS debrief questions, common errors,
  fidelity limits, Chinese summary).

### 1.0.0

* Initial release.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/acute-ischemic-stroke/case.json   # 0 errors, 0 warnings
npm run -s cc -- cases verify acute-ischemic-stroke     # solution 52 steps · objectives 5/5 · decisions 4/4 · utterances 78/78
npx vitest run packages/agent/src/session/embodied-autopilot.test.ts                    # embodied score = clinical score
npm run -s cc -- bench run --agent reference && npm run -s cc -- bench run --agent scripted-llm   # 100 %
npm run -s cc -- bench grounding --split dev && npm run -s cc -- bench grounding --split test     # this case: dev 53/55, test 67/78 (= baseline)
```

The reference solution scores 18/18 on the deterministic rubric with no contraindicated action.

## 中文摘要

**病例概要。** 67岁男性，退休电工，高血压、未抗凝的阵发性房颤病史，3周前可疑TIA未就诊。妻子最后一次见他
正常是08:55，09:10发现其右侧肢体无力、说不出话（运动性失语），10:05由120送达抢救室。到院BP 192/104 mmHg，
脉律不齐，NIHSS 14分。CT平扫无出血、左侧MCA高密度征、ASPECTS 9分；CTA示左侧大脑中动脉M1段近端闭塞。
诊断：左侧大脑中动脉供血区急性缺血性卒中，大血管闭塞，心源性栓塞。正确路径：并行完成血糖、监护、静脉通路，
CT/CTA，静脉降压至 < 185/110 mmHg后按体重静脉溶栓（替奈普酶20 mg或阿替普酶72 mg），桥接机械取栓
（1次取栓eTICI 2c，台上NIHSS 6分）。

**学习目标。**
1. 通过目击者病史确定最后正常时间（本例为08:55，而非09:10被发现的时间），并据此计算静脉溶栓（4.5小时）和机械取栓（6小时）的时间窗。
2. 为失语患者完成NIHSS评分，依据皮层征（失语、凝视偏好、视野缺损）定位左侧大脑中动脉综合征，并识别心房颤动为最可能的栓子来源。
3. 首选头颅CT平扫并同次完成头颈CTA（无已知肾病者不等肌酐），判读有无出血、ASPECTS及大血管闭塞。
4. 完成溶栓前安全核查——CT排除出血、血糖、明确询问抗凝药、用可滴定静脉药将血压降至 < 185/110 mmHg——并在入院至溶栓时间60分钟内给予阿替普酶0.9 mg/kg（最大90 mg）或替奈普酶0.25 mg/kg（最大25 mg），未用抗凝药时不等待凝血和血小板结果。
5. 应用机械取栓标准（前循环大血管闭塞、NIHSS ≥ 6、ASPECTS ≥ 6、最后正常后6小时内穿刺、发病前mRS 0–1），并从静脉溶栓直接桥接取栓，不等待溶栓效果。
6. 下达溶栓后医嘱：按时监测神经功能与血压并维持 < 180/105 mmHg，24小时内不用抗血小板药和抗凝药，吞咽筛查通过前禁食禁水（包括口服药）。

**关键决策。** ① 首选影像：立即CT平扫并同次完成CTA，不等肌酐；② 定位与机制：左侧MCA综合征伴大血管闭塞，
房颤心源性栓塞；③ 溶栓：降压达标后立即溶栓，不等凝血/血小板，同时准备取栓；④ 取栓指征（多选）：M1闭塞、
NIHSS ≥ 6、ASPECTS ≥ 6、6小时内、发病前mRS 0–1。

**复盘要点（PEARLS）。** 先请学员谈感受，再复述时间线与关键发现；分析环节聚焦：时间从“最后正常”而非“被发现”
算起；房颤患者必须点名询问抗凝药，确认未用即不必等凝血结果；192/104 mmHg是可纠正的障碍而非禁忌，忌舌下含服
硝苯地平；CTA证实大血管闭塞后立即桥接取栓，不等溶栓效果；溶栓后24小时不用抗栓药、吞咽筛查前禁食禁水。最后请学员
总结下次卒中急救中会保持和改进的做法。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经执业医师审核。
