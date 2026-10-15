# Right-sided weakness and difficulty speaking · 67-year-old man

`acute-ischemic-stroke` · v1.0.0 · emergency (resus bay) · facility `general-hospital` ·
simulated clock starting 10:05 · difficulty 4 · ~40 min · zh-CN / en

> **Synthetic case — 虚构教学病例.** Every person, time, value and event in this case is invented
> for teaching. It is not based on any identifiable patient. The patient ("Zhao Deming / 赵德明"),
> his wife ("Sun Xiulan / 孙秀兰") and all staff are pseudonyms. It is not medical advice and does
> not replace local stroke protocols or current guidelines.

## Scenario

A 67-year-old retired electrician is brought to the emergency department by 120 ambulance at
10:05. His wife last saw him normal at **08:55**, reading the paper after breakfast. At about
**09:10** she heard his tea cup smash and found him slumped on the sofa: his right arm and leg
were weak and he could not get his words out. The paramedics measured no glucose because the
glucometer failed, and they could not get IV access.

On arrival his BP is 192/104 mmHg (MAP 133), HR is 96/min in atrial fibrillation, SpO₂ is 96 % on
room air and his GCS is 13 (E4 V3 M6; the verbal score is limited by aphasia).

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

Diagnosis (hidden from learners): acute ischaemic stroke from a **proximal left MCA M1 occlusion**,
cardioembolic (AF). NIHSS 14, ASPECTS 9.

## Learning objectives (chapters)

1. **Initial assessment and fast-track.**
   * Get the last-known-well time.
   * Check a bedside glucose.
   * Attach the monitor, get IV access and draw bloods — all in parallel.
2. **Neurological assessment and emergency imaging.**
   * Score the NIHSS.
   * Decide on the first imaging: NCCT plus CTA in the same sitting, without waiting for
     creatinine.
   * Read the CT.
   * Localise the lesion and name the mechanism: left MCA syndrome with LVO, cardioembolic from AF.
3. **Thrombolysis eligibility.**
   * Ask about anticoagulants, bleeding history and recent surgery or trauma.
   * Decide that he is eligible once BP is < 185/110 mmHg, **without waiting for coagulation or
     platelet results**.
4. **Deliver acute reperfusion treatment** (BP control and thrombolysis; the objective is ticked by any lysis or recanalisation — an unsafe lysis is penalised by the rubric, not here).
   * Use IV labetalol, nicardipine or urapidil.
   * Then give alteplase 0.9 mg/kg or tenecteplase 0.25 mg/kg.
   * Door-to-needle target ≤ 60 min.
   * The chapter also closes if thrombectomy reperfuses him without IV lysis, so a learner who
     skipped lysis can finish without giving a (then contraindicated) lytic; the lysis rubric
     items stay unmet.
5. **Definitive treatment and ongoing care** (thrombectomy and post-thrombolysis care).
   * Read the CTA and confirm thrombectomy eligibility (select-all decision).
   * Call neurointervention and transfer him (bridging).
   * Order the post-lysis monitoring bundle.
   * Do a bedside swallow screen before anything by mouth. He fails it.
   * In the angio suite: DSA and thrombectomy, eTICI 2c after one pass, on-table NIHSS 6.
   * After a suspected sICH thrombectomy is off; the chapter closes once the sICH protocol and a
     swallow screen are done, so the debrief is still reachable.

## Decisions

| id | kind | correct answer |
|---|---|---|
| `d-imaging` | single | Immediate NCCT + same-session CTA (no creatinine wait) |
| `d-diagnosis` | single | Left MCA territory AIS with LVO, cardioembolic (AF) |
| `d-lysis` | single | Eligible: lower BP < 185/110 with IV agent, then lyse without waiting for labs; prepare EVT in parallel |
| `d-evt` | multiple | LVO (M1) · NIHSS ≥ 6 · ASPECTS ≥ 6 · puncture < 6 h from LKW · pre-stroke mRS 0–1 |

Every option carries educational feedback, including the distractors:

* `d-imaging`: wait for creatinine, MRI first, CT perfusion first, carotid duplex, lyse before CT.
* `d-diagnosis`: ICH, lacune, right MCA, posterior circulation, Todd's paresis, hypoglycaemia.
* `d-lysis`: "AF → wait for INR", "BP is a contraindication", "skip IVT and go straight to EVT",
  "unwitnessed onset → no lysis".
* `d-evt`: "needs a CTP mismatch", "wait 1 h after lysis", "age ≥ 65 is a contraindication".

`d-evt` quotes NIHSS 14 and ASPECTS 9 in its options, so it unlocks only once the NIHSS has been
scored and the CT head and the CTA have been read (plus the pre-stroke function question).

## Key numbers (all internally consistent)

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
| CHA₂DS₂-VASc | 2 before (age 65–74, HTN) → **4** after the stroke | +2 stroke/TIA |
| CT perfusion (low-value) | core 12 mL, Tmax > 6 s 128 mL | mismatch 116 mL, ratio 10.7 |
| Alteplase (80 kg) | **72 mg** = 7.2 mg bolus over 1 min + 64.8 mg over 60 min | 0.9 mg/kg, max 90 mg |
| Tenecteplase (80 kg) | **20 mg** single bolus | 0.25 mg/kg, max 25 mg |
| BMI / smoking | 27.0 kg/m² / 30 pack-years (ex, quit 10 y) | 80/1.72²; 1 pack/day × 30 y |

The same numbers are machine-readable in `extensions.clinicalScores`.

## Scenario engine behaviour

* **Baseline.** BP 192/104, HR 96 (AF), RR 18, SpO₂ 96 %, T 36.8 °C, GCS 13, pain 0.
  * The baseline deliberately has **no glucose**, so the monitor does not reveal it; the learner
    must order the point-of-care test.
  * The SBP warning alarm (> 180) is active on arrival.
* **BP agents** (effects persist; they are not titrated off in this case):

  | Agent | SBP | DBP | HR | Onset / ramp |
  |---|---|---|---|---|
  | Labetalol | −20 | −10 | −8 | 2 min / 5 min |
  | Urapidil | −20 | −10 | — | 2 min / 5 min |
  | Nicardipine | −22 | −10 | +5 | 5 min / 10 min |

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
      cryoprecipitate and/or TXA, haematology and neurosurgical review.
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
* **Tempting wrong choices** are scored as safety events:
  * aspirin at any point in this case — before CT, in place of or just before reperfusion, or
    within 24 h of lysis (ARTIS);
  * IV heparin for the AF;
  * mannitol;
  * oral water or tablets before the swallow screen;
  * sublingual nifedipine;
  * transfer for EVT before CT/CTA.
* **Low-value tests** carry teaching notes:
  * CT perfusion (not needed < 6 h);
  * MRI (no record — not in the hyperacute pathway);
  * echo (no record — done on the stroke unit);
  * chest X-ray;
  * lipids/HbA1c.

## Rubric (deterministic 13 items + 2 examiner-judged)

**History**

* Last known well and witness.
* Contraindication screen (weight 2): anticoagulants, bleeding, recent surgery, head injury.
* Pre-stroke function and weight.

**Examination**

* NIHSS.

**Investigations**

* Glucose read before any thrombolytic.
* NCCT + CTA read, with the CT ordered within 20 min.

**Diagnosis**

* Left MCA / cardioembolic, correct at the **first attempt** (`decidedFirstTry`).

**Safety**

* BP < 185/110 with an IV agent before lysis, no nifedipine and no over-lowering (weight 2).
* No aspirin or heparin.
* Swallow screen and no oral intake.

**Management**

* DTN ≤ 60 min with a safe checklist (weight 2). The lysis items (BP, DTN, no lab wait) are unmet
  when thrombectomy reperfused him before any lytic.
* Bridging EVT (weight 2).

**Efficiency**

* No waiting for labs.

**Communication (judged by the examiner)**

* Consent conversation with the wife and the aphasic patient.
* SBAR handover to neurointervention.

The reference `solution` gives tenecteplase at minute 25 (DTN 25 min), scores 17/17 on the
deterministic items, has no contraindicated actions and no critical alarms, and reads every result
it orders.

## Teaching notes

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
  * Do not skip IVT in an eligible patient.
  * Within 6 h, perfusion imaging is unnecessary.
  * The AHA/ASA 2026 guideline recommends either agent; ESO (2023) suggests tenecteplase over
    alteplase when thrombectomy is planned.
* **Missed prevention.** Long-standing AF went un-anticoagulated (CHA₂DS₂-VASc 2), and a probable
  TIA three weeks ago went unassessed. After the stroke his CHA₂DS₂-VASc is 4. The timing of oral
  anticoagulation is decided after 24-h imaging and is outside this case's scope.

## Guideline references

* Prabhakaran S, et al. 2026 Guideline for the Early Management of Patients With Acute Ischemic
  Stroke (AHA/ASA). *Stroke.* 2026;57.
* Powers WJ, et al. 2019 Update to the 2018 Guidelines for the Early Management of Acute Ischemic
  Stroke (AHA/ASA). *Stroke.* 2019;50(12):e344–e418.
* Berge E, et al. ESO guidelines on intravenous thrombolysis for acute ischaemic stroke.
  *Eur Stroke J.* 2021;6(1):I–LXII.
* Alamowitch S, et al. ESO expedited recommendation on tenecteplase for acute ischaemic stroke.
  *Eur Stroke J.* 2023;8(1):8–54.
* Turc G, et al. ESO–ESMINT guidelines on mechanical thrombectomy in acute ischaemic stroke.
  *Eur Stroke J.* 2019;4(1):6–12.
* Turc G, et al. ESO–ESMINT expedited recommendation on IVT before mechanical thrombectomy for
  anterior-circulation LVO. *Eur Stroke J.* 2022;7(1):I–XXVI.
* 中华医学会神经病学分会, 中华医学会神经病学分会脑血管病学组. 中国急性缺血性卒中诊治指南2023. 中华神经科杂志. 2024;57(6).
* 中华医学会神经病学分会 等. 中国急性缺血性卒中早期血管内介入诊疗指南2022. 中华神经科杂志. 2022;55(6).
* Brott T, et al. Measurements of acute cerebral infarction: a clinical examination scale (NIHSS).
  *Stroke.* 1989;20(7):864–870.
* Barber PA, et al. ASPECTS. *Lancet.* 2000;355(9216):1670–1674.
* Goyal M, et al. HERMES individual-patient meta-analysis. *Lancet.* 2016;387(10029):1723–1731.
* Campbell BCV, et al. EXTEND-IA TNK. *N Engl J Med.* 2018;378(17):1573–1582.
* Li S, et al. TRACE-2. *Lancet.* 2023;401(10377):645–654.
* Zinkstok SM, Roos YB. ARTIS. *Lancet.* 2012;380(9843):731–737.
* Yang P, et al. ENCHANTED2/MT. *Lancet.* 2022;400(10363):1585–1596.
* Van Gelder IC, et al. 2024 ESC Guidelines for the management of atrial fibrillation.
  *Eur Heart J.* 2024;45(36):3314–3414.

## Matcher regression corpus

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
second pass that also used it).

## Validation

```bash
npx tsx -e "…CaseSchema.safeParse…" packages/content/cases/acute-ischemic-stroke/case.json   # VALID
# parseCase: ok, 0 warnings · checkCaseIntegrity: [] · verifyCase: ok, 0 issues, rubric 17/17
npm run cc -- cases validate packages/content/cases/acute-ischemic-stroke/case.json
npm run cc -- cases verify acute-ischemic-stroke   # objectives 5/5, decisions 4/4, utterances 78/78
```
