# cmcr-1423436 — Upper abdominal pain and vomiting · 43-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis and the suspected drug. Learners open the case from
> the case library, where the title, summary, chief complaint, tags, triage note and objective titles give neither away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the CMCR
additional collection: 江承平, 李胜前. 塞来昔布致急性胰腺炎. 药物不良反应杂志. 2014;16(1):43-44. Version 1.1.0 re-authors the
case to the clinical content standard **from the facts that version 1.0.0 extracted from the report**; the full article
was not available, so **none of these facts has yet been checked against the full source article** (STANDARD §6). The
patient is 许佩琳 / Xu Peilin (pseudonym) — 1.0.0's pseudonym was the name of a well-known public figure, so it was
replaced. The ward nurse (沈护士 / Nurse Shen), the gastroenterology attending (顾医生 / Dr Gu) and the clinical
pharmacist (钟药师 / Pharmacist Zhong) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0
does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-1423436` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (a ward bed throughout) |
| specialty | gastroenterology, clinical pharmacology |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: three record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-11-14); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a gastroenterologist and a clinical pharmacist review it before teaching use |
| the patient | a 43-year-old woman, half a day of constant dull upper abdominal pain through to the left back with vomiting, after two weeks of self-taken celecoxib for shoulder pain |
| what the learner can do | take her history, examine her abdomen, order the tests the general hospital provides (bloods, ECG, portable chest film, pregnancy test, ultrasound/MRCP, CT, EUS), give or withhold 16 interventions (10 of today's care, 6 tempting wrong or historical steps), answer five decisions on the case board, read the course record |
| phases | `admission` 收入病房 / Arrival on the ward → `results` 检查结果回报 / The results are back → `outcome` 此后的病程与结局 / Her course and outcome — all one-way, none learner-switchable |
| content | 25 history items (11 with recorded facts, 1 labelled teaching device, 13 unknown; 8 required) · 2 exam findings · 14 investigations (1 record review; 6 with no recorded result) · 16 interventions (6 contraindicated, 1 of them critical) · 6 objectives · 5 decisions (22 options) · 15 rubric items (14 deterministic, weight 38; 1 examiner-judged; 3 critical) · 3 staff · 6 learning outcomes · 5 teaching points · 66 test utterances |

## Learning outcomes

After the case the learner can:

1. Diagnose acute pancreatitis in a patient with constant upper abdominal pain radiating to the back by the
   two-of-three criteria (IAP 2025), and explain why pain plus imaging suffice when the reference ranges are missing.
2. Exclude the emergencies that mimic it in an NSAID user — a perforated ulcer (erect chest film), inferior myocardial
   infarction (ECG), pregnancy — while starting fluids, analgesia and observations without waiting for results.
3. Explain why severity is graded by organ failure over 48 hours (Revised Atlanta 2012; modified Marshall score) rather
   than by enzyme levels or a single CRP, and list what must be monitored to grade her.
4. Work through the causes in order — gallstones (ultrasound/MRCP, ALT), alcohol, triglycerides (causal from about
   11.3 mmol/L), calcium, drugs — rate celecoxib's causality as probable by WHO-UMC or Naranjo, and name what remains
   unchecked.
5. Prescribe today's supportive care — Ringer's lactate at 1.5 mL/kg/h with boluses only for hypovolaemia (IAP 2025;
   ACG 2024; WATERFALL 2022), opioid analgesia, an early low-fat diet, no prophylactic antibiotics — and contrast it
   with the fasting, carbapenems and pethidine of earlier practice.
6. Act on a suspected adverse drug reaction: stop and record the drug, report it (Drug Administration Law 2019,
   Article 81), never rechallenge, and explain it to the patient with teach-back.

## Clinical summary (spoilers)

**Diagnosis: acute pancreatitis, probably celecoxib-induced; its severity cannot be graded from the record.**

- **Presentation.** A 43-year-old woman took celecoxib on her own for two weeks for shoulder pain, with no other medicine
  in that time. About two hours after the last dose — half a day before admission — constant dull upper abdominal pain
  began, spreading to the left back (zh 左腰背), with nausea and vomiting of stomach contents; eating made it worse,
  vomiting did not relieve it, and her abdomen felt bloated. No liver or gallbladder disease or stones, no drug or food
  allergy, no heavy drinking or binge eating before the onset.
- **Examination.** Abdominal distension; upper central tenderness and rebound tenderness; bowel sounds about once a
  minute. No vital signs are recorded.
- **Results.** Amylase 1822 U/L, pancreatic amylase 1529 U/L, lipase 1410 U/L (no reference ranges or specimen
  recorded for the amylase values); CRP 125 mg/L. Ultrasound and MRCP (recorded together): diffuse pancreatic
  enlargement with fluid around it, no gallbladder stones, no apparent pancreatic or bile duct abnormality. ALT 13 U/L,
  AST 22 U/L, triglycerides 2.34 mmol/L; kidney function and electrolytes reported normal (no calcium value).
- **Course as recorded.** Celecoxib was stopped and several supportive treatments (not listed) were given; over 13 days
  the pain and distension resolved, the enzymes fell to the normal range, CT showed improvement, and she was discharged.
- **Reading it today.** Two of three diagnostic criteria are met by pain and imaging alone. Gallstones, alcohol and
  triglycerides do not explain it; celecoxib is the *probable* cause by exclusion (WHO-UMC; Naranjo about 5–7), with the
  calcium value and microlithiasis still unchecked. Today's care: moderate goal-directed Ringer's lactate, opioid
  analgesia, an early low-fat diet, no prophylactic antibiotics (IAP 2025; ACG 2024), organ-failure monitoring; stop,
  record and report the drug, and never rechallenge.

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`, no `physiology`): the report establishes no physiological response model, no
vital signs are recorded, and no intervention has `effects`. Every intervention answers with a response that says what
is done and what the case records. Phases advance by themselves the moment the next phase's `enterWhen` holds.

| phase | what is available | opens when |
|---|---|---|
| `admission` 收入病房 / Arrival on the ward | history (24 items; the outcome question is held back), the two recorded examination findings, all orders and interventions; ordered tests return a staged placeholder ("sent — the result is shown in the next part") or "No result is recorded for this test." | start |
| `results` 检查结果回报 / The results are back | the admission results — enzymes, CRP, liver tests, triglycerides, kidney function and electrolytes, ultrasound/MRCP — are read by ordering them again in this phase (orders are keyed by phase); decisions 2–5 | `obj-story` (presenting complaint, onset, pain pattern, associated symptoms) and `obj-first-steps` (both examination findings, decision 1 answered, enzymes sent) |
| `outcome` 此后的病程与结局 / Her course and outcome | the course and outcome record; the enzymes' and the CT's recorded course; "How are you feeling now?" | every decision answered, plus `obj-background`, `obj-results` and `obj-plan` complete |

The examination findings are available only in `admission` (they were recorded at presentation; a later examination is
not recorded and returns `examNotRecorded`). The `results` phase cannot be reached without examining her, so the
findings can never be missed for good.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-story` Hear the story of the pain | presenting complaint, onset, pain pattern and associated symptoms asked |
| 2 | `obj-background` Go through her medicines and risk factors | medicines, liver/gallbladder history, alcohol and meals, allergies asked |
| 3 | `obj-first-steps` Examine her and decide the first steps | both abdominal findings examined; `first-plan` answered; enzymes ordered |
| 4 | `obj-results` Read the results: diagnosis, severity and cause | enzymes, CRP, liver tests, triglycerides, kidney function/electrolytes and ultrasound/MRCP read in `results`; `diagnosis-severity` and `cause` answered |
| 5 | `obj-plan` Set her care for the coming days | `supportive-care` and `drug-safety` answered |
| 6 | `obj-course` See how her admission ended | course and outcome record read in `outcome` |

No objective holds a condition that can become permanently false (no phase leaf, no `whenIndicated`, no
`decidedFirstTry`); the contract's late-learner replay confirms the case can always be finished.

### Decisions

1. **`first-plan` (admission) — What do you do first?** Opens after the four story items, the medicine history and both
   examination findings. **Key:** `lipase-mimics-support` — lipase/amylase, liver tests, triglycerides and calcium; ECG,
   erect chest film, pregnancy test and ultrasound; fluids, analgesia, observations, and celecoxib stopped. Why:
   pancreatitis is confirmed or excluded by two of three criteria (IAP 2025; Chinese guideline 2021) while its mimics
   are excluded at once — a perforated ulcer in an NSAID user with rebound tenderness, inferior MI, pregnancy before
   imaging — and the aetiological tests of IAP 2025 (liver tests, calcium, triglycerides, ultrasound) go with it.
   Distractors: NSAID gastritis with the celecoxib continued; withholding analgesia until a surgeon has seen her
   (Cochrane 2011: analgesia does not mask the diagnosis); early CT with NBM and prophylactic carbapenem (IAP 2025: CT
   for doubt or non-response, 72–96 h; no prophylaxis); laparotomy for a presumed perforation without a diagnosis.
2. **`diagnosis-severity` (results) — What do the results establish?** Opens after decision 1 and the enzymes, CRP and
   ultrasound/MRCP read in `results`. **Key:** `ap-grade-by-organ-failure` — acute pancreatitis by two of three criteria;
   severity by organ failure over 48 hours and complications (Revised Atlanta 2012), not by enzyme levels. Distractors:
   "severe" from a lipase over 1000 and a CRP of 125 (IAP 2025: CRP > 150 mg/L at admission is only 53 % sensitive);
   a perforation with amylase leak; "not established without a CT showing necrosis".
3. **`cause` (results) — Which statement about the cause is most accurate?** Opens after decision 2, the liver tests,
   triglycerides and kidney function/electrolytes read in `results`, and the alcohol and liver/gallbladder history.
   **Key:** `celecoxib-probable-by-exclusion` — probable by exclusion; calcium value and microlithiasis unchecked. Why:
   no stones or duct change and ALT 13 U/L (IAP 2025: ALT > 150 U/L in 48 h favours gallstones), no alcohol or binge
   eating, triglycerides 2.34 mmol/L ≪ 11.3 mmol/L (ACG 2024); "electrolytes normal" holds no calcium value; one
   ultrasound/MRCP does not exclude microlithiasis (repeat ultrasound, then EUS: IAP 2025). Distractors: occult stones
   needing ERCP; hypertriglyceridaemia from 2.34 mmol/L; "proven" by timing; idiopathic with celecoxib continued.
4. **`supportive-care` (results) — Which plan for the next few days?** Opens after decision 2 and the allergy history.
   **Key:** `moderate-lr-opioid-early-diet` — Ringer's lactate 1.5 mL/kg/h, boluses only for hypovolaemia, opioid
   analgesia, a low-fat diet once vomiting stops, no prophylactic antibiotics, organ monitoring (IAP 2025; ACG 2024;
   WATERFALL 2022). Distractors: the older NBM–nasogastric suction–carbapenem–pethidine regimen (Cochrane 2013: opioids an
   appropriate choice, no excess complications); aggressive fluids with an IV NSAID and early parenteral nutrition; discharge today with an
   outpatient amylase.
5. **`drug-safety` (results) — What do you do about the celecoxib?** Opens after decision 3 and her own worries asked.
   **Key:** `no-rechallenge-record-report` — probable cause told honestly with its uncertainty; recorded as a suspected
   reaction; reported (Drug Administration Law 2019, Art. 81; 15 days for new or serious reactions under the 2011
   Measures; serious by ICH E2A because it led to admission); never rechallenged (WHO-UMC "probable" needs none);
   shoulder pain relief planned without it. Distractors: a monitored test dose after recovery; recording nothing as
   coincidence; reporting only once proven.

Every decision opens before the record that answers it — the course record, in `outcome` — and every option has
feedback of its own that names its guidance. Each decision is scored with `decidedFirstTry`; a later correct answer
unlocks progress but never earns the marks back.

### Rubric (14 deterministic items, total weight 38, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-story` | history | 2 | presenting complaint, onset, pain pattern, associated symptoms asked |
| `rb-background` | history | 2 | medicines, celecoxib dose, alcohol and meals, liver/gallbladder history, earlier attacks, diabetes/lipids/calcium, allergies asked (the dose, earlier attacks and metabolic history are unknown — asking is the competency) |
| `rb-mimics` | investigations | 2 | blood in the vomit and pregnancy asked; ECG, erect chest film and pregnancy test ordered in `admission` |
| `rb-exam` | examination | 1 | both abdominal findings examined |
| `rb-first-tests` | investigations | 2 | enzymes, liver tests, triglycerides, calcium and ultrasound/MRCP ordered in `admission` |
| `rb-first-plan` | diagnosis | 3 | `first-plan` right first time |
| `rb-diagnosis` | diagnosis | 3 | `diagnosis-severity` right first time |
| `rb-cause` | diagnosis | 3 | `cause` right first time |
| `rb-supportive` | management | 3 | `supportive-care` right first time; observations, an analgesic (opioid or paracetamol) and the early-feeding plan given |
| `rb-drug-safety` | management | 3 | `drug-safety` right first time; the reaction reported and the patient counselled |
| `rb-stop-drug` | management | 4 | **critical** — celecoxib stopped and recorded while `indicatedWhen` holds (`admission` or `results`), i.e. before her course is known |
| `rb-fluids` | management | 3 | **critical** — goal-directed IV fluids started in `admission` or `results` |
| `rb-no-reexposure` | safety | 4 | **critical** — celecoxib never given again; scored once decision 1 or 5 is attempted or celecoxib is given |
| `rb-no-harm` | safety | 3 | none of prophylactic antibiotics, NBM until the enzymes normalise, aggressive fluids, urgent ERCP, an IV NSAID; scored once decision 1 or 4 is attempted or any of the five is given |
| `rb-communication` | communication | (judged) | Calgary–Cambridge and teach-back: plain explanation of the inflamed pancreas and the plan; the probable — not certain — drug cause without blame; her two worries answered (avoid celecoxib, never "test" it, name in writing, check new painkillers); reporting explained |

### How wrong choices score (measured with core `assess` on 2026-11-14)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 38/38 (100 %) | none | passed |
| start and do nothing | 0/31 (0 %) | `rb-stop-drug`, `rb-fluids` | passed (nothing given) |
| wrong first answer at all five decisions, then right | 23/38 (61 %) | none | passed |
| wrong first answer at any one decision only | 35/38 (92 %) | none | passed |
| reference path without stopping celecoxib | 34/38 (89 %) | `rb-stop-drug` | passed |
| celecoxib stopped only after the course record (in `outcome`) | 34/38 (89 %) | `rb-stop-drug` | passed |
| reference path without IV fluids | 35/38 (92 %) | `rb-fluids` | passed |
| IV fluids started only in `outcome` | 35/38 (92 %) | `rb-fluids` | passed |
| celecoxib given in `admission`, then the reference path | 34/38 (89 %) | `rb-no-reexposure` | **failed** (critical intervention) |
| reference path plus celecoxib after the course record | 34/38 (89 %) | `rb-no-reexposure` | **failed** |
| reference path plus an IV NSAID | 35/38 (92 %) | none (`rb-no-harm` lost) | passed (contraindicated, recorded) |
| reference path plus prophylactic antibiotics | 35/38 (92 %) | none (`rb-no-harm` lost) | passed (contraindicated, recorded) |
| reference path plus NBM until the enzymes normalise | 35/38 (92 %) | none (`rb-no-harm` lost) | passed (contraindicated, recorded) |
| reference path plus aggressive fluids | 35/38 (92 %) | none (`rb-no-harm` lost) | passed (contraindicated, recorded) |
| reference path plus urgent ERCP | 35/38 (92 %) | none (`rb-no-harm` lost) | passed (contraindicated, recorded) |
| reference path without ECG, erect chest film and pregnancy test | 36/38 (95 %) | none | passed |
| reference path without reporting and counselling | 35/38 (92 %) | none | passed |

Doing nothing scores 0 at once and at the time limit: the two avoided-harm items count only once their harm was
possible (`scoredWhen`), and every other item needs an act or a first-try answer.

### Critical items

`rb-stop-drug` (the missed act: the suspected drug is stopped and flagged before anyone knows how she fares),
`rb-fluids` (the missed act: IV fluids for a vomiting patient with pancreatitis, before her course is known) and
`rb-no-reexposure` (the dangerous error: celecoxib given again, for pain or as a "confirming" rechallenge). The first
two are acts scored with `{"intervened": …, "whenIndicated": true}` and an `indicatedWhen` of `admission` or `results`,
so an act done after the course record — in hindsight — does not count; the third is an avoided harm gated by
`scoredWhen`. None is a decision alone.

**Safety outcome.** One intervention is `critical: true`: `celecoxib-again` (risk high, contraindicated always) —
re-exposing her to the probable cause of her pancreatitis, whether for pain or as a deliberate rechallenge, risks a
recurrence that may be more severe, and it fails the run's safety outcome whatever the score. `urgent-ercp` is high-risk
and explicitly `critical: false`: ERCP without cholangitis or a duct stone adds the risks of post-ERCP pancreatitis,
bleeding and perforation without benefit, but the endoscopist's own indication check would usually stop it and the
harm, when it happens, is usually recoverable — so it is shown as a contraindicated act and costs `rb-no-harm`, not the
safety outcome. The other contraindicated acts — an IV NSAID, prophylactic antibiotics, nil by mouth until the enzymes
normalise, aggressive fluids — are moderate-risk, recoverable misjudgements: each shows its harm text, is listed among
the contraindicated acts and loses `rb-no-harm`.

## Reference path (`solution`)

78 steps, static clock: start → the story (presenting complaint, onset, pain pattern, associated symptoms) → medicines,
celecoxib dose, the shoulder, alcohol and meals, liver/gallbladder history, earlier attacks, diabetes/lipids/calcium,
operations, smoking, allergies, fever and jaundice, breathing, urine, bowels, blood in the vomit, stomach history,
pregnancy, weight, family, her worries → examine the abdomen and listen for bowel sounds → IV cannula and bloods,
observations with organ-failure scoring, **goal-directed Ringer's lactate**, IV opioid, paracetamol, **stop and record
celecoxib**, pharmacist review → order enzymes, CRP, liver tests, triglycerides, kidney function/electrolytes, calcium,
blood count, ECG, erect chest film, pregnancy test and ultrasound/MRCP; read the five with no recorded result →
`first-plan` → (phase `results`) order and read enzymes, CRP, liver tests, triglycerides, kidney function/electrolytes,
ultrasound/MRCP and calcium → `diagnosis-severity` → `cause` → early-feeding plan, ADR report, counselling →
`supportive-care` → `drug-safety` → (phase `outcome`) course and outcome record, "How are you feeling now?", enzymes'
course → finish. `cases verify` passes: objectives 6/6, decisions 5/5, rubric 38/38, utterances 66/66; the reference
path gives nothing while it is contraindicated.

## Clinical numbers check

| number | where | source | check / derived value |
|---|---|---|---|
| 43 years, female | patient | 1.0.0 patient | — |
| 2 weeks of celecoxib | history `medications` | 1.0.0 history | dose and frequency not recorded |
| onset ~2 h after the last dose; ~half a day before admission | history `onset`, triage | 1.0.0 history | — |
| bowel sounds about once a minute | exam `bowel-sounds` | 1.0.0 exam | reduced; no ileus is claimed |
| amylase 1822 U/L; pancreatic amylase 1529 U/L; lipase 1410 U/L | `enzymes` (`results`) | 1.0.0 enzymes record | no reference ranges or amylase specimen recorded; against typical adult lipase upper limits (often around 60 U/L, higher for some assays) 1410 U/L is far above three times — stated only as "very likely" in feedback |
| CRP 125 mg/L | `crp` (`results`) | 1.0.0 enzymes record | sampling time not recorded; IAP 2025 quotes 53 % sensitivity for CRP > 150 mg/L at admission |
| triglycerides 2.34 mmol/L | `triglycerides` (`results`) | 1.0.0 metabolic record | × 88.57 = **207 mg/dL**; causal threshold > 1000 mg/dL ≈ 11.3 mmol/L (ACG 2024) |
| ALT 13 U/L, AST 22 U/L | `lfts` (`results`) | 1.0.0 metabolic record | ALT > 150 U/L within 48 h favours gallstones (IAP 2025) — not met |
| kidney function and electrolytes "normal" | `renal-electrolytes` | 1.0.0 metabolic record | no values; calcium not separately recorded |
| 13 days | `outcome` record, history `outcome-feel` | 1.0.0 outcome | pain and distension resolved over 13 days; the day of discharge is not recorded |
| 1.5 mL/kg/h; 10 mL/kg bolus if hypovolaemic | `iv-fluids`, decision 4 | IAP 2025 Rec 11; ACG 2024 | no weight recorded, so no volume is computed |
| urine output ≥ 0.5 mL/kg/h | `iv-fluids` | IAP 2025 GPS 12 | target only |
| 20 mL/kg then 3 mL/kg/h; overload 20.5 % vs 6.3 %; moderately severe/severe 22.1 % vs 17.3 % | `aggressive-fluids`, TP 3 | WATERFALL 2022 | — |
| 5–10 mL/kg/h | `aggressive-fluids`, TP 3 | Chinese guideline 2021 Rec 8 | quoted as the pre-WATERFALL position |
| 48 h; modified Marshall ≥ 2 | decision 2, `obs-monitoring` | Revised Atlanta 2012; IAP 2025 | — |
| CT at least 72–96 h after onset | decisions 1–2, TP 2 | IAP 2025 Rec 7 | — |
| oral diet within 24–48 h (mild); tube feeding, preferably within 72 h of onset, if she cannot take food by mouth | `early-feeding`, decision 4 | ACG 2024; IAP 2025 Recs 22–23 | — |
| Naranjo about 5–7 (probable) | TP 4 | Naranjo 1981 | previous reports +1 (case reports since 2000), after the drug +2, improved on withdrawal +1, rechallenge 0, alternative causes 0 (microlithiasis and calcium open) or +2, objective evidence +1 → 5–7; 4–6 if the case reports are not counted |
| 15 days | `adr-report`, decision 5 | 2011 ADR reporting Measures | new or serious reactions |

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions:** "How did it feel to tell her that the painkiller she chose to take was the probable cause?"
- **Description:** "Walk us through the first hour: what did you send, what did you start, and what did you stop?"
- **Analysis:**
  - "With no reference ranges, how did you know the criteria were met?" (pain + imaging = two of three)
  - "Her CRP was 125 mg/L — how severe was she?" (unknown: severity needs organ failure over 48 h, and no vital signs
    or urine output are recorded)
  - "Which causes did the results exclude, and which did they not?" (calcium value, microlithiasis)
  - "Why moderate fluids and early food, when the old teaching was 'drip and suck'?" (WATERFALL 2022; IAP 2025; ACG 2024)
  - "She asks whether she could take the painkiller again 'just to see'. What do you say?" (never rechallenge; WHO-UMC probable)
- **Summary:** "What will you write in her notes and on the report form, and what will you tell her to show her next
  doctor?"

### Common learner errors and how the case surfaces them

| error | where it surfaces |
|---|---|
| Anchoring on NSAID gastritis and keeping the drug | decision 1 distractor `gastritis-ppi`; `celecoxib-again` harm; `rb-no-reexposure` |
| Withholding analgesia "until the surgeon has seen her" | decision 1 distractor `withhold-analgesia` (Cochrane 2011) |
| Grading severity by the enzyme level or the CRP | decision 2 distractor `severe-by-numbers` |
| Waiting for a CT to "confirm" pancreatitis | decision 1 `ct-antibiotics-first`, decision 2 `not-confirmed-without-ct`; `ct-abdomen` returns no admission result |
| Calling 2.34 mmol/L triglycerides causal | decision 3 `triglyceride-cause` |
| ERCP for "hidden stones" | decision 3 `occult-stones-ercp`; `urgent-ercp` harm |
| "Proving" the drug by timing or rechallenge | decision 3 `proven-by-timing`; decision 5 `rechallenge-later`; `celecoxib-again` (critical) |
| Fasting until the amylase is normal, prophylactic carbapenem, pethidine-only | decision 4 `nbm-carbapenem-pethidine`; `nbm-until-normal`, `prophylactic-antibiotics` harms |
| Aggressive fluids; an NSAID for the pain | decision 4 `aggressive-fluids-nsaid-tpn`; `aggressive-fluids`, `iv-nsaid` harms |
| Not reporting a reaction until it is proven | decision 5 `report-only-if-proven`, `no-record-coincidence`; `rb-drug-safety` |

## Embodied mode

- **Facility:** `general-hospital`; she lies on a ward bed in every phase (`posture: lying`, gown). No transfer is
  recorded, so none is represented.
- **Records vs bedside:** the course and outcome record is read at a records terminal (`requires: ["records"]`,
  `performedAt: "records"`, risk none) and exists only in `outcome` (ordering it earlier is refused: it does not exist
  yet). Laboratory tests are sampled at the bedside and sent; the ECG and a portable erect chest film are bedside
  tests; ultrasound/MRCP, CT and EUS are done by the provider (imaging or endoscopy). Every test, intervention and record
  of the reference path is reachable there (`caseCapabilityGaps` is empty); the in-world demonstration finishes in both
  locales.
- **Voice:** she speaks for herself (no companion); unknown answers are in her own words ("I'm not sure, doctor." /
  "这个我说不上来，医生。"). The nurse reports only results that are back and never gives a number for vital signs,
  saturations, urine output or weight.
- **Capabilities used:** `lab-chemistry`, `lab-hematology`, `lab-urinalysis`, `ecg-12lead`, `xray`, `ultrasound`, `ct`,
  `endoscopy`, `fluoroscopy` (ERCP), `iv-access`, `medications`, `stethoscope`, `records`.

## Source and adaptation (fidelity limits)

**What the facts are.** Every patient fact is one extracted from the report for version 1.0.0 (commit `88ed0d2`); the
full article was not available, and the check against it is pending (`extensions.sourceTextChecked: false`).

**Extraction summary (1.0.0 → 1.1.0).** Age and sex → patient; chief complaint → title (without "after analgesic use",
so the drug history is elicited) and the onset item; pain character and radiation → `presenting`, opening line, triage
note; onset 2 h after the last dose, half a day before admission → `onset`; worse with food, not relieved by vomiting →
`pain-pattern`; bloating, vomiting of stomach contents → `associated` (restated in `gi-bleed`); no hepatobiliary disease
or stones → `pmh`; celecoxib self-taken 2 weeks for shoulder pain, nothing else → `medications`, `shoulder`; no drug or
food allergy → `allergies`; no heavy drinking or binge eating → `alcohol-diet`; distension, upper central tenderness and
rebound → exam `abdomen-palpation`; bowel sounds ~1/min → exam `bowel-sounds`; amylase, pancreatic amylase, lipase →
`enzymes`; CRP → `crp`; ultrasound + MRCP → `abdo-us` (kept as one combined report); TG, ALT, AST → `triglycerides`,
`lfts`; kidney function and electrolytes "normal" → `renal-electrolytes`; withdrawal + several supportive treatments,
resolution over 13 days, enzymes normal, CT improved, discharged → `outcome` record, the enzymes' and CT's `outcome`
results, `outcome-feel`; 1.0.0's unknowns (complete severity assessment, microlithiasis evaluation, long-term
recurrence) → `unknowns`. Nothing was added.

**Contradictions and differences kept.** (1) The zh outcome ends with 出院 (discharged); the en outcome omits it — the
discharge is kept, its day stays unknown. (2) zh 左腰背 (left loin/back) vs en "left back" — kept as 左腰背 / "the left
side of my back". (3) zh 无胆囊结石 vs en "without gallstones" — both rendered as no gallbladder stones. (4) The report's
title says celecoxib-*induced*; 1.0.0 called the link a temporal association whose causality is a clinical judgement —
the case teaches it as "probable".

**Adapted (teaching design, not facts of the report).** The three phases and the staging of the admission results into
the second phase; the history wording in her voice; her two worries (`concerns`, a labelled teaching device that adds
no clinical fact); the nurse, the attending and the pharmacist; the decisions, interventions, rubric and objectives;
the combined ultrasound/MRCP report presented as one orderable study; and every "No result is recorded for this test."
placeholder. The pseudonym was changed from 1.0.0's (a public figure's name).

**What 1.0.0 got wrong and 1.1.0 replaced.** The template's three three-option decisions (one of them answered only
after the outcome), no interventions, fifteen generic history slots, "the source notes do not provide that
information" answers in the patient's mouth, and a critical item that was a decision alone; the management key bundled
withdrawal with "tailored support" without stating the fluid, analgesia, feeding and reporting steps; NICE NG104 was
cited for "unnecessary fasting" without the vomiting caveat it states.

**Privacy.** No dates, hospitals, cities or real names; bilingual pseudonym only.

## Matcher notes

66 test utterances (zh-CN and en): at least two paraphrases for each of the 8 required items (the presenting complaint
seven times, with the plain openers), two for every other askable item, and 8 negatives that must select nothing — 4
look-alikes (other pains: headaches, knees and hips; "drive", which shares its first letters with "drink") and 4
off-topic remarks. Collisions fixed during authoring: "Apart from the pain…" reached `presenting` (now excluded there by 除了/别的/其他 and "apart
from"); "ease" in `pain-pattern` matched "dis*ease*" (removed); "how much" reached `celecoxib-dose` from urine and alcohol
questions (excluded); "ever had" and 类似 reached `previous-episodes` from ulcer and family questions (excluded).
Fixed in the independent review: the plain opener "What brings you in today?" reached `associated` through "bringing
up" (now `bringsyou` and `whatbrings` in `presenting`, and "brings you" / "brought you" excluded from `associated`);
怎么回事 reached `shoulder` through its canonical question (now a `presenting` keyword); "Tell me what's been going on"
reached nothing (`goingon` in `presenting`; "How long has this been going on?" still reaches `onset`, because
`presenting` excludes "how long"). Multi-word English keywords that reduce to one stem are written run together
(`whatsthetrouble`, `onyourmind`): the matcher also matches a phrase of four letters or more that the utterance
contains once its spaces are removed. The outcome question (`outcome-feel`) is available only in `outcome`.
`cases verify`: utterances 66/66, no extra hits; every plain opener of `scripts/case-check.ts` reaches `presenting` or
`onset` in `admission`.

## References

1. 江承平, 李胜前. 塞来昔布致急性胰腺炎. 药物不良反应杂志. 2014;16(1):43-44. doi:10.3760/cma.j.issn.1008-5734.2014.01.013. Available from: https://rs.yiigle.com/cmaid/1423436
2. IAP/APA/EPC/IPC/JPS Working Group. International Association of Pancreatology revised guidelines on acute pancreatitis 2025. Pancreatology. 2025;25(6):770-814. doi:10.1016/j.pan.2025.04.020
3. Tenner S, Vege SS, Sheth SG, Sauer B, Yang A, Conwell DL, et al. American College of Gastroenterology guidelines: management of acute pancreatitis. Am J Gastroenterol. 2024;119(3):419-437. doi:10.14309/ajg.0000000000002645
4. Crockett SD, Wani S, Gardner TB, Falck-Ytter Y, Barkun AN. American Gastroenterological Association Institute guideline on initial management of acute pancreatitis. Gastroenterology. 2018;154(4):1096-1101. doi:10.1053/j.gastro.2018.01.032
5. National Institute for Health and Care Excellence. Pancreatitis (NICE guideline NG104). London: NICE; 2018.
6. 中华医学会外科学分会胰腺外科学组. 中国急性胰腺炎诊治指南（2021）. 中国实用外科杂志. 2021;41(7):735-742.
7. Banks PA, Bollen TL, Dervenis C, et al. Classification of acute pancreatitis—2012: revision of the Atlanta classification and definitions by international consensus. Gut. 2013;62(1):102-111. doi:10.1136/gutjnl-2012-302779
8. de-Madaria E, Buxbaum JL, Maisonneuve P, et al. Aggressive or moderate fluid resuscitation in acute pancreatitis. N Engl J Med. 2022;387(11):989-1000. doi:10.1056/NEJMoa2202884
9. Basurto Ona X, Rigau Comas D, Urrútia G. Opioids for acute pancreatitis pain. Cochrane Database Syst Rev. 2013;(7):CD009179.
10. Manterola C, Vial M, Moraga J, Astudillo P. Analgesia in patients with acute abdominal pain. Cochrane Database Syst Rev. 2011;(1):CD005660.
11. Badalov N, Baradarian R, Iswara K, et al. Drug-induced acute pancreatitis: an evidence-based review. Clin Gastroenterol Hepatol. 2007;5(6):648-661. doi:10.1016/j.cgh.2006.11.023
12. Carrillo-Jimenez R, Nurnberger M. Celecoxib-induced acute pancreatitis and hepatitis: a case report. Arch Intern Med. 2000;160:553-4.
13. Naranjo CA, Busto U, Sellers EM, et al. A method for estimating the probability of adverse drug reactions. Clin Pharmacol Ther. 1981;30(2):239-245. doi:10.1038/clpt.1981.154
14. World Health Organization; Uppsala Monitoring Centre. The use of the WHO-UMC system for standardised case causality assessment. Geneva: WHO; 2013. Available from: https://www.who.int/publications/m/item/WHO-causality-assessment
15. ICH. Clinical safety data management: definitions and standards for expedited reporting (E2A). 1994.
16. 中华人民共和国药品管理法（2019年修订）第八十一条；中华人民共和国卫生部. 药品不良反应报告和监测管理办法（卫生部令第81号）. 2011.

Checked online on 2026-11-14: the source DOI and every DOI above resolve; IAP 2025 recommendations 1–3, 4–5, 7, 10–14,
17–19, 22–29, 82 and the aetiology and analgesia remarks were read in the full text; ACG 2024 (fluids 1.5 mL/kg/h with
10 mL/kg boluses, Ringer's lactate, ultrasound for all, idiopathic work-up, no prophylactic antibiotics in severe AP,
oral feeding within 24–48 h in mild AP; triglycerides > 1000 mg/dL as the cause) from a guideline summary and
secondary sources; AGA 2018, NICE NG104 (no prophylactic antimicrobials; not nil by mouth without a clear reason such
as vomiting; enteral nutrition within 72 h in severe or moderately severe AP), WATERFALL, the two Cochrane reviews,
Revised Atlanta, Naranjo, WHO-UMC "probable" (no rechallenge required), ICH E2A's definition of serious, Article 81 of
the Drug Administration Law and the 15-day rule of the 2011 Measures from publisher, registry or official-document
pages; the 2021 Chinese guideline's recommendations 1, 8–12 and 15 from a full-text reprint. The independent review
(2026-11-14) re-read in the IAP 2025 full text recommendations 1–3, 7, 10–15, 17–19, 22–29 and 82 and the remarks on
ALT > 150 U/L, CRP > 150 mg/L (sensitivity 53 %) and antibiotic prophylaxis (no reduction of infected necrosis; no
mortality difference in a meta-analysis restricted to RCTs); NICE NG104 1.2.2 (not nil by mouth without a clear reason,
for example vomiting) and 1.2.5; the 2021 Chinese guideline's recommendations 8, 9, 11, 12 and 15 from its reprint;
the 15-day rule in Article 21 of the 2011 Measures; and the WHO page that dates the WHO-UMC document 5 June 2013.

### To verify

**Source pass (against the full article):**

- every fact above, especially: the chief complaint's exact wording; whether the radiation was to the left back or
  left loin; the specimen (blood or urine) of the amylase values and the reference ranges; whether "electrolytes normal"
  included calcium; which findings came from the ultrasound and which from the MRCP, and when; the date and findings of
  the CT and what it was compared with;
- the celecoxib dose, how often she took it, and whether she had taken NSAIDs before;
- the "several supportive treatments" 1.0.0 did not list (it called them a "multi-drug regimen", and its options implied
  but did not record prophylactic antibiotics): fluids, analgesia, antibiotics, protease or secretion inhibitors,
  feeding;
- the day of discharge (the zh text records discharge, the en text omits it), discharge medicines, any follow-up,
  recurrence and whether the reaction was reported;
- the report's discussion: 1.0.0's options implied that it proposed a mechanism (drug crystals obstructing the duct) —
  confirm what the authors actually wrote about mechanism and causality.

**Clinical review (gastroenterologist and clinical pharmacist):**

- the classification of `iv-nsaid` as contraindicated while an NSAID is the suspected cause (IAP 2025 accepts NSAIDs for
  AP pain in general; cross-reactivity between celecoxib and other NSAIDs is not established);
- `urgent-ercp` as high-risk but not safety-critical, and `celecoxib-again` as the case's single critical error;
- the Naranjo range (5–7) and whether the published celecoxib case reports count as "previous conclusive reports";
- whether the 2021 Chinese guideline is rightly cited as 中国实用外科杂志 2021;41(7):735-742 (the range its reprint gives;
  one citing paper gives 739-746), or should be cited in its 中华外科杂志 2021;59(7) version;
- whether the 2011 Measures are still the operative reporting rule alongside the 2019 Drug Administration Law and the
  2021 pharmacovigilance practice standard, and whether the reaction counts as "serious" under the Chinese definition.

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- **Template defects replaced:** three three-option decisions (the third opening only after the outcome) → five
  decisions of four or five options, each opening before the record that answers it; no interventions → 16 (10 of
  today's care, 6 tempting wrong or historical steps with harm texts naming their guidance); 15 generic history slots
  with "the source notes do not provide that information" answers → 25 items in her own voice (13 honestly unknown);
  records only → orderable tests with staged results, a course record and "No result is recorded for this test."
  placeholders; a decision-only critical item → three critical items that are acts done in time or an avoided harm.
- **Safety and teaching fixes:** supportive care spelled out to today's guidance (moderate goal-directed Ringer's
  lactate, opioid analgesia, early low-fat diet, no prophylactic antibiotics — IAP 2025, ACG 2024, AGA 2018, NICE NG104,
  WATERFALL 2022); the mimics of pancreatitis in an NSAID user (perforation, MI, pregnancy) added to the first steps;
  severity tied to organ failure (Revised Atlanta 2012); causality rated as "probable" by WHO-UMC/Naranjo with what is
  still unchecked; re-exposure to celecoxib made the case's critical error; reporting the reaction (Drug Administration
  Law 2019, Art. 81) and counselling the patient added; NICE NG104's fasting advice quoted with its vomiting caveat.
- **Other:** the pseudonym changed (1.0.0's was a public figure's name); the title no longer names the analgesic
  exposure; the tags no longer hint at a drug cause; 1.0.0's unverifiable "individually read / values retained"
  author checks removed; references expanded to 17 with DOIs checked; README rewritten as the facilitator guide.
- **Independent review (2026-11-14):** three statements 1.0.0 does not record were removed — that her pain was severe
  (`iv-nsaid` harm), that celecoxib was a new drug for her (decision 5 feedback) and that she was still vomiting when
  the results came back (decision 4 prompt and feedback); "just food" in her answer about the vomit (it implied no
  blood, against the unknown in `gi-bleed`), "tablet" and the CT's "contrast-enhanced" label now match the record; the
  plain openers reach the presenting complaint ("What brings you in today?" had reached `associated`, 怎么回事
  `shoulder`, "Tell me what's been going on" nothing) and four look-alike negatives were added; "1.0.0" no longer
  appears in learner-facing teaching points; the WHO-UMC document is cited as WHO 2013 (not 2018); the wording on
  antibiotic prophylaxis and mortality and the timing of tube feeding follow the IAP 2025 text; two dose texts that the
  treatment list shows from the start no longer name the diagnosis; one decision-3 distractor is hedged like the key.

### 1.0.0 — 2026-10-28

Template version authored from the source with de-identification: three evidence-gated decisions (three options each),
four objectives, ten deterministic rubric items plus a judged communication item, 15 history slots (seven of them
"not provided"), two examination findings, four record reviews and no interventions; NICE NG104 as the single cited
guideline; editorial review status.

## Validation

Run from the worktree root (all pass on 2026-11-14):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-1423436/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1423436 --lang en                                                 # objectives 6/6 · decisions 5/5 · utterances 66/66 · rubric 38/38 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-1423436                                       # reference 100 % · do nothing 0/31 · wrong first at every decision 61 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1423436:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1423436:"  # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要：** 43岁女性因肩痛自行服用塞来昔布 2 周，末次服药后约 2 小时出现上腹持续钝痛，向左腰背放射，伴恶心、呕吐，进食加重、吐后
不缓解；腹部膨隆，中上腹压痛、反跳痛，肠鸣音约 1 次/分。淀粉酶 1822 U/L、胰淀粉酶 1529 U/L、脂肪酶 1410 U/L，CRP 125 mg/L；超声及
MRCP 示胰腺弥漫性增大伴周围渗出，未见胆囊结石及胆胰管异常；ALT 13 U/L、AST 22 U/L、甘油三酯 2.34 mmol/L，肾功能和电解质报告正常。
诊断：急性胰腺炎，塞来昔布很可能为致病药（排除性判断），严重程度无法依据记录分级。停药并经多项支持治疗，13 天腹痛腹胀消失，胰酶恢复
正常，CT 显示改善，出院。患者事实沿用 1.0.0 版的提取内容，尚未对照原文全文核对；尚未经执业医师审核。

**学习目标：** 按“3 项中满足 2 项”诊断急性胰腺炎；在服 NSAID 的患者中同时排除溃疡穿孔、心肌梗死和妊娠；按器官衰竭（修订版亚特兰大分类
2012）而非酶值判断严重程度；按顺序排查病因并把药物关联性评为“很可能”；开出今天的支持治疗（乳酸林格液 1.5 mL/kg/h、阿片类镇痛、尽早
低脂饮食、不预防性用抗生素）；停药、记录、上报并向患者解释，绝不再激发。

**关键决策：** ① 首先：查脂肪酶淀粉酶、肝功能、甘油三酯和血钙，做心电图、立位胸片、妊娠试验和超声，同时补液、镇痛、监测并停用塞来昔布；
② 结果：急性胰腺炎（3 项满足 2 项），严重程度看 48 小时器官衰竭；③ 病因：塞来昔布很可能，但血钙数值和微结石未查清；④ 支持治疗：中等
速度目标导向补液、阿片类镇痛、尽早低脂饮食、不预防性用抗生素；⑤ 用药安全：如实告知、记为可疑不良反应并上报、绝不再激发、另选肩痛止痛
方案。

**复盘要点：** 诊断与病因是两步；CRP 和酶值不能分级；“禁食到淀粉酶正常”、预防性碳青霉烯、只用哌替啶和积极补液都属于过去的做法
（WATERFALL 2022；IAP 2025；ACG 2024）；药物性胰腺炎是排除性诊断，评价关联性不需要也不应该再激发；疑似不良反应不必证实即应上报
（《药品管理法》2019 第八十一条）。

**安全结果。** 唯一标为 `critical: true` 的干预是再次给予塞来昔布（无论用于止痛还是“验证”），一旦给予，无论得分多少本次安全结果都判为
未通过；急诊 ERCP 属高风险，但明确标为不构成严重安全失误（`critical: false`），静脉 NSAID、预防性抗生素、禁食到胰酶正常和积极补液为可纠正的
错误，均显示其危害并扣除 `rb-no-harm`。
