# cmcr-1069544 — Upper abdominal pain, nausea and vomiting · 58-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 谢钧韬, 叶建宇, 尹耀新, 欧希, 易辛, 刘吉奎. 以急性胰腺炎为首发表现的甲状旁腺腺瘤一例.
中华普通外科学文献（电子版）. 2010;4(1):66-67. Version 1.1.0 re-authors the case to the clinical content standard **from the
facts that version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has
yet been checked against the full source article** (STANDARD §6). The patient (陈知远 / Chen Zhiyuan) is a pseudonym; the
ward nurse (梁护士 / Nurse Liang), the attending (杜医生 / Dr Du) and the endocrinologist (孔医生 / Dr Kong) are invented
teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-1069544` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (a ward bed throughout) |
| specialty | gastroenterology, general surgery |
| difficulty | 4 / 5 |
| estimated time | about 35 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30) and two independent AI-assisted reviews (2026-11-14: a first review and review round 2); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a gastroenterologist, endocrinologist or endocrine surgeon review it before teaching use |
| phases | `first-attack` 第一次住院 / First admission → `recurrence` 约 20 个月后再次入院 / Readmission about 20 months later → `post-op` 手术之后 / After the operation → `followup` 记录的结局 / Recorded outcome — all one-way, none learner-switchable |
| content | 32 history items (13 recorded facts, 1 labelled teaching device, 18 unknown; 10 required; 6 phase twins) · 4 examination findings (all first admission) · 16 investigations (4 record reviews; 9 without a recorded result) · 17 interventions (7 always harmful, 1 of them `critical`; oral calcium harmful while the calcium is raised; 1 wrong disposition) · 6 objectives · 5 decisions (24 options) · 13 rubric items (12 deterministic, weight 29; 1 examiner-judged; 3 critical) · 3 staff · 6 learning outcomes · 5 teaching points · 46 test utterances |

The card no longer names the cause: 1.0.0's title ("Recurrent upper abdominal pain with elevated calcium on two
occasions") and summary named the key clue (governance survey: spoiler finding for this case), and `endocrinology`
pointed to the answer discipline, so the card keeps the presenting disciplines only (STANDARD §6.7).

## Learning outcomes

After the case the learner can:

1. Manage the first days of acute pancreatitis to the current standard — lactated Ringer's at a moderate, goal-directed
   rate, early low-fat oral feeding, no prophylactic antibiotics, ERCP only for cholangitis — and contrast it with
   fasting and antibiotics (ACG 2024; IAP 2025).
2. Screen every attack of pancreatitis for its cause, and treat a raised calcium during an attack as a red flag that needs
   a repeat albumin-adjusted calcium with a paired PTH (IAP 2025; NICE NG132, 2019).
3. Establish primary hyperparathyroidism biochemically before any localisation scan, and explain why imaging can neither
   make nor exclude the diagnosis (Fifth International Workshop on primary hyperparathyroidism, 2022).
4. Resolve a result whose analyte label is in doubt (here 31 pmol/L labelled "thyroxine") with the laboratory, or repeat
   it, before it carries a decision such as an operation.
5. Refer primary hyperparathyroidism with kidney stones and recurrent pancreatitis to an experienced parathyroid surgeon,
   and explain why cinacalcet or a needle biopsy is not the next step (AAES 2016; NICE NG132, 2019).
6. Assess numbness after parathyroid surgery with an adjusted or ionised calcium and an examination, give IV calcium
   gluconate only by the emergency thresholds, and confirm cure with a calcium 3–6 months later (Society for
   Endocrinology 2016; NICE NG132, 2019).

## Clinical summary (spoilers)

A 58-year-old woman is admitted after a day of constant, distending upper abdominal pain with nausea and vomiting. She
is tender in the left upper quadrant and around the umbilicus with mild local guarding; rebound is equivocal, Murphy's
sign negative, and no neck mass is felt. Amylase is 1139 U/L (specimen and reference interval not recorded), calcium
2.76 mmol/L, and the CT shows pancreatitis and a stone in the left kidney. After discharge she eats normally with normal bowels and has no abdominal pain or bloating, no bone
or back ache and no polyuria or polydipsia, and her blood pressure is normal without antihypertensive medicine. About 20
months later the pain returns suddenly with nausea and vomiting, and she presents after 8 hours: amylase 1055.9 U/L,
calcium 2.87 mmol/L, CT pancreatitis with renal stone(s) still seen. Neck ultrasound/CT shows a lesion behind the lower
pole of the left thyroid lobe. A lesion of about 2 × 1.5 × 1 cm is removed; histology: **parathyroid adenoma**. The only
recorded pre-operative hormone value, 31 pmol/L, is labelled "thyroxine" (甲状腺素) in the report — possibly a mislabelled PTH,
kept as recorded. After surgery the PTH (explicitly labelled) falls to 3.8 pmol/L and the calcium to 2.18 mmol/L, both
described as staying normal; she has transient numbness of the limbs without tetany or convulsions (无抽搐) that settles on its own, and has no
complaints at follow-up (its length is not recorded). The report's care of the pancreatitis included fasting and
antibiotics (agents, doses and the attack they were given for are not recorded in 1.0.0).

**Diagnosis:** primary hyperparathyroidism from a parathyroid adenoma (the other glands are not recorded), presenting as
recurrent acute pancreatitis with nephrolithiasis. **Teaching core:** a raised calcium during an attack of pancreatitis is a red flag (an attack
tends to lower calcium); the diagnosis is biochemical and must be secured — including an unambiguous PTH — before
imaging and surgery; post-operative symptoms are judged against the adjusted calcium and the emergency thresholds.

## Scenario timeline (staged evidence by phase)

| phase | what the learner can do | records available |
|---|---|---|
| `first-attack` (initial) | history of the attack (onset, character, site, vomiting; unknowns: radiation, meal trigger, earlier episodes, fever/jaundice, bone/thirst symptoms, kidney stones, blood pressure, alcohol, gallstones, medicines, allergies, smoking, other illness, family history; her worry); examination (abdomen, rebound, Murphy's sign, neck); IV access, fluids, analgesia, diet; decisions 1–2; a discharge act | amylase 1139 U/L, calcium 2.76 mmol/L (raised), abdominal CT report (pancreatitis; left renal stone); hormone assay — no result at this admission; lipase, triglycerides, liver tests, albumin/ionised calcium, renal function, blood count, abdominal ultrasound — no result recorded |
| `recurrence` (opens when objectives 1–3 are done) | readmission history (sudden return, 8 hours; the earlier attack about 20 months ago; how she has been since; blood pressure off tablets; unknowns: whether the calcium was followed up, the earlier treatment); fluids and supportive care again; decisions 3–4; the laboratory query; one definitive-plan act | amylase 1055.9 U/L, calcium 2.87 mmol/L (raised), CT (pancreatitis; renal stone(s) still seen); the hormone result 31 pmol/L labelled "thyroxine"; neck ultrasound/CT report (lesion behind the lower pole of the left thyroid lobe); renal function, vitamin D, 24-hour urine calcium, albumin/ionised calcium — no result recorded |
| `post-op` (opens when objectives 1–5 are done) | how she feels (numb arms and legs; no spasms; unknowns: perioral tingling, voice); oral calcium, follow-up plan; decision 5 | histology report (≈ 2 × 1.5 × 1 cm; parathyroid adenoma); calcium 2.18 mmol/L and PTH 3.8 pmol/L after surgery (both "staying normal"); albumin/ionised calcium — no result recorded |
| `followup` (opens when objectives 1–5 and decision 5 are done) | how she has been since; the outcome record | reported course and outcome |

No physiology is modelled (static clock). Phase descriptions say what has happened by then without that phase's
results; the readmission's interval ("about 20 months after the first attack") and the operation's existence are given
as staging, its type and date are not recorded.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-attack-history` Take the history of this attack | presenting complaint, onset, vomiting, alcohol and medicines asked |
| 2 | `obj-attack-care` Examine her, read the results and set her care | abdomen examined; amylase, calcium and CT read (phase `first-attack`); decision 1 right |
| 3 | `obj-attack-cause` Think through the cause before she goes home | decision 2 right **and** one discharge-time act: the hormone assay ordered in `first-attack`, the follow-up recheck arranged, or the routine discharge (a wrong act) |
| 4 | `obj-return` When she is readmitted | the earlier attack and the interval asked; amylase, calcium and CT read (phase `recurrence`); decision 3 right |
| 5 | `obj-definitive` Plan the definitive treatment | hormone result and neck imaging read (phase `recurrence`); decision 4 right **and** one definitive-plan act: the surgical referral, cinacalcet or a needle biopsy |
| 6 | `obj-recovery` Follow her recovery and outcome | post-operative symptoms and spasms asked; histology, calcium and hormone read (phase `post-op`); decision 5 right; outcome read |

Titles name no finding, result or treatment (the journal lists later titles before they are reached); hints are
Socratic questions. Objectives 3 and 5 require a **committed act** — right or wrong — so the next part of the recorded
course opens only after the learner has acted, and which act is the learner's choice: the critical acts are not forced
and can still be missed. Every objective condition latches (asked, read with its phase, decided, intervened), so a late
learner can always finish (the contract's late-learner check passes).

### Decisions

- **1 `attack-care`** (single; needs the presenting complaint, onset, abdominal examination, and the amylase and CT of
  `first-attack`). Key: `ringer-moderate-early-diet` — lactated Ringer's at a moderate, goal-directed rate, analgesia,
  a low-fat diet once tolerated, no prophylactic antibiotic. Distractors: `fast-with-carbapenem` (the old approach: nil
  by mouth until the amylase normalises and a prophylactic carbapenem — the report records only that its care included
  fasting and antibiotics, with no agent or duration), `aggressive-resuscitation` (WATERFALL's aggressive arm, here
  without reassessment), `urgent-ercp-then-fasting` (no cholangitis).
- **2 `calcium-meaning`** (single; needs the calcium and CT of `first-attack`). Key: `repeat-with-paired-pth` — unusual in
  an attack, which tends to lower calcium; with a kidney stone, repeat an albumin-adjusted calcium with a paired PTH, now
  or soon after discharge (IAP 2025 statement 62; NICE NG132 1.1.4–1.1.6); its feedback adds that the attack's standard
  care, lactated Ringer's included, is unchanged at this level (IAP 2025 statement 63 switches to isotonic saline only
  above about 3.5 mmol/L or with altered consciousness). Distractors: `haemoconcentration`, `pancreatitis-releases-calcium` (wrong physiology),
  `stone-explains-calcium` (cause and effect reversed), `zoledronate-now` (treats the number, blurs the repeat).
- **3 `recurrence-cause`** (single; needs decision 2, the readmission onset, the earlier attack, the interval history and
  the amylase, calcium and CT of `recurrence`). Key: `biochemistry-before-scans` — PTH with a paired adjusted calcium,
  plus creatinine, vitamin D and urine calcium; localising scans after that. Distractors: `scan-first` (a scan "makes or
  excludes" the diagnosis), `ercp-sphincterotomy` (idiopathic label too early), `presumed-gallstones` (cholecystectomy
  without gallstones), `recheck-above-three` (an invented 3.0 mmol/L bar).
- **4 `pre-op-plan`** (single; needs decision 3, the hormone result and the neck imaging of `recurrence`). Key:
  `confirm-then-refer` — ask the laboratory what the 31 pmol/L measured and repeat an intact PTH with a paired calcium;
  if that confirms the diagnosis (a raised or inappropriately normal PTH with the raised calcium), refer to an
  experienced parathyroid surgeon. Distractors: `operate-on-imaging` (take the label on
  trust because the imaging is concordant — the tempting near-miss), `thyroxine-explains`, `needle-biopsy-first`,
  `cinacalcet-and-watch`.
- **5 `post-op-plan`** (select all; needs decision 4, the post-operative symptoms and spasm question, and the histology,
  calcium and hormone of `post-op`). Keys: `recheck-adjusted-calcium`, `treat-by-severity` (IV calcium gluconate for
  an adjusted calcium < 1.9 mmol/L or for symptoms — paraesthesiae included — with a calcium below the reference range,
  as the Society for Endocrinology guidance defines severe hypocalcaemia; otherwise oral calcium), `cure-check-and-stones`.
  Distractors: `continuous-iv-calcium` (before any repeat calcium), `lifelong-calcitriol`.

Every option has its own feedback naming ACG 2024, IAP 2025, WATERFALL (NEJM 2022), NICE NG132 (2019), the Fifth
International Workshop (2022), AAES 2016 or the Society for Endocrinology emergency guidance (2016). Option ids name
their content. **No length cue:** in no single-best decision is the key the uniquely longest option, in either language,
and in the select-all decision 5 the three keys are not the three longest options (measured on 2026-11-14, characters:
decision 1 key 41 of 40–57 in zh-CN, 133 of 117–138 in en; decision 2 key 43 of 34–44 and 149 of 122–153; decision 3
key 46 of 27–50 and 146 of 109–147; decision 4 key 57 of 38–59 and 163 of 139–168; decision 5 keys 56, 54 and 31
against distractors of 39 and 40 in zh-CN, 108, 156 and 121 against 154 and 136 in en). Prompts state only what each
decision's `requires` guarantees; locked decisions show only a neutral `need`.

### Rubric (12 deterministic items, total weight 29, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-attack-history` | history | 2 | presenting complaint, onset, vomiting, alcohol, gallstones, medicines asked (the last three are unknown — asking is the competency) |
| `rb-return-history` | history | 1 | the earlier attack, the interval, blood pressure off tablets, whether the calcium was followed up |
| `rb-examination` | examination | 1 | abdomen, rebound, Murphy's sign, neck examined |
| `rb-first-results` | investigations | 2 | amylase, calcium and CT read in `first-attack`; gallbladder ultrasound, triglycerides and liver tests ordered in `first-attack` |
| `rb-attack-care` | management | 3 | decision 1 right first time, Ringer's and early feeding given during an attack (`whenIndicated`) |
| `rb-calcium-reading` | diagnosis | 3 | decision 2 right first time |
| `rb-calcium-pursued` | investigations | 4 | **critical** — hormone assay ordered in `first-attack` **or** the follow-up recheck arranged in `first-attack` (`whenIndicated`) |
| `rb-biochemistry-first` | diagnosis | 3 | decision 3 right first time |
| `rb-verified-referral` | safety | 4 | **critical** — decision 4 right first time **and** the surgical referral made in `recurrence` after the laboratory query (`whenIndicated`) |
| `rb-avoided-harm` | safety | 2 | none of prophylactic antibiotics, nil by mouth, aggressive fluids, needle biopsy, cinacalcet, IV calcium infusion, oral calcium given while the calcium is raised (`valid: false`), nor the routine discharge from the first admission with nothing planned; scored once decision 1, 4 or 5 is attempted or any of these is done |
| `rb-no-ercp` | safety | 2 | **critical** — no urgent ERCP (no cholangitis, no biliary finding recorded); scored once decision 1 or 3 is attempted or the ERCP is given |
| `rb-recovery` | management | 2 | decision 5 right first time and the follow-up plan made |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: explains pancreatitis and why the calcium must be followed; answers her fear of recurrence honestly; explains the blood-test-first diagnosis, the unclear label and the operation, with consent; after surgery explains the numbness, what to report and the cure check; teach-back; invents nothing |

### How wrong choices score (measured with the reducer on 2026-11-14, after review round 2)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 29/29 (100 %) | none | pass |
| start and do nothing | 0/25 | `rb-calcium-pursued`, `rb-verified-referral` | pass |
| wrong first answer at all five decisions, then right | 14/29 (48 %) | `rb-verified-referral` | pass |
| wrong first answer at decision 1, 2 or 3 only | 26/29 (90 %) | none | pass |
| wrong first answer at decision 4 only | 25/29 (86 %) | `rb-verified-referral` | pass |
| wrong first answer at decision 5 only | 27/29 (93 %) | none | pass |
| routine discharge instead of pursuing the calcium (no PTH, no follow-up) | 23/29 (79 %) | `rb-calcium-pursued` | pass |
| PTH sent at the first attack, then the routine discharge with nothing planned | 27/29 (93 %) | none | pass |
| reference path plus the routine discharge (in any phase) | 27/29 (93 %) | none | pass |
| PTH sent at the first attack, no follow-up arranged (or the reverse) | 29/29 (100 %) | none | pass |
| surgical referral without the laboratory query | 25/29 (86 %) | `rb-verified-referral` | pass |
| referral first, laboratory query after | 25/29 (86 %) | `rb-verified-referral` | pass |
| reference path plus urgent ERCP | 27/29 (93 %) | `rb-no-ercp` | **fail** |
| reference path plus prophylactic antibiotics, nil by mouth, aggressive fluids or IV calcium infusion (each) | 27/29 (93 %) | none | pass |
| reference path plus oral calcium during the first attack (calcium raised) | 27/29 (93 %) | none | pass |
| needle biopsy or cinacalcet before decision 4, then the rest of the reference path | 23/29 (79 %) | `rb-verified-referral` | pass |
| cinacalcet instead of the surgical referral | 23/29 (79 %) | `rb-verified-referral` | pass |
| no cause screen (gallbladder ultrasound, triglycerides, liver tests) | 27/29 (93 %) | none | pass |
| no fluids or early feeding | 26/29 (90 %) | none | pass |
| no follow-up plan after the operation | 27/29 (93 %) | none | pass |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The harmful interventions
are contraindicated (named in the debrief's safety list, each with its own harm text); the two avoided-harm items count
only once a harm was possible (`scoredWhen`), so doing nothing earns 0. Oral calcium may be given twice (`maxDoses` 2),
so a dose given wrongly during an attack does not block the indicated one after the operation. Every contraindicated act
with a harm text costs points or the safety outcome when added to the reference path (replayed in review round 2; the
routine discharge cost nothing before that round and now counts against `rb-avoided-harm`). **Known limits:** (1) a needle biopsy or cinacalcet
given before decision 4 completes objective 5 as soon as decision 4 is right, so the operation phase opens and a later
referral no longer counts as made in time — the diversion is what costs the critical item, and the debrief shows both;
(2) the rubric's conditions carry no time within a phase, so the order of fluids, feeding and decision 1 inside the first
admission is not scored — debrief it from the transcript.

### Critical items

`rb-calcium-pursued` (the missed act that matters most in this report: acting on a raised calcium during the first attack
— it can only be met in `first-attack`, before any confirming record), `rb-verified-referral` (the dangerous shortcut:
sending her to surgery on imaging and an unverified "thyroxine" label — met only by a referral made in `recurrence` after
the laboratory query) and `rb-no-ercp` (the avoided dangerous act: an urgent ERCP with no indication). All three are acts
or avoided acts; none reads a final-phase record. As in the reviewed exemplars, `rb-verified-referral` also asks for
decision 4 right at the first attempt.

**Safety outcome.** `urgent-ercp` is `critical: true` (risk high): an ERCP without cholangitis or any recorded biliary
finding — Murphy's sign negative, no jaundice or duct finding recorded — exposes her to post-ERCP pancreatitis, bleeding
and perforation while the documented cause (the calcium) goes unexplained; giving it fails the assessment's safety
outcome (`safety.passed: false`) whatever the score, and misses the critical avoided-harm item `rb-no-ercp`. No other
intervention is high-risk: prophylactic antibiotics, aggressive fluids, a needle biopsy, cinacalcet and an IV calcium
infusion are moderate-risk, recoverable misjudgements, and nil by mouth, the routine discharge and oral calcium while the
calcium is raised are low-risk ones (contraindicated, scored by `rb-avoided-harm`); the premature surgical referral is a low-risk act whose
cost is the critical rubric item `rb-verified-referral`.

## Reference path (`solution`)

106 steps, static clock: start → the first attack's history (presenting complaint, onset, character, site, vomiting,
radiation, meal trigger, earlier episodes, fever/jaundice, alcohol, gallstones, medicines, allergies, kidney stones,
bone/thirst symptoms, blood pressure, other illness, smoking, family, her worry) → abdomen, rebound, Murphy's sign, neck →
**IV cannula** → amylase, calcium, CT report, then the cause screen and the tests with no recorded result (lipase, liver
tests, triglycerides, albumin/ionised calcium, renal function, blood count, gallbladder ultrasound) → **Ringer's,
analgesia** → decision 1 → **early feeding** → **hormone assay** (no result at this admission) → decision 2 → **discharge
with the calcium recheck arranged** → (phase `recurrence`) presenting complaint, onset, the earlier attack, the interval,
blood pressure, calcium follow-up, earlier treatment → cannula, Ringer's, analgesia, feeding → amylase, calcium, CT,
albumin/ionised calcium → decision 3 → hormone result, renal function, vitamin D, urine calcium, neck imaging → **query
the laboratory and repeat the PTH** → decision 4 → **surgical referral** → (phase `post-op`) numbness, spasms, perioral
tingling, voice → histology, calcium, PTH, albumin/ionised calcium → oral calcium → follow-up plan → decision 5 → (phase
`followup`) how she has been → outcome record → finish. `cases verify` passes: objectives 6/6, decisions 5/5,
utterances 46/46, rubric 29/29.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 58-year-old woman | `patient.age`, `sex` | `patient`; title |
| first attack: persistent upper abdominal distending pain with nausea and vomiting, admitted after one day | `chiefComplaint`, `history.pain`, `persona.openingLine` | `chiefComplaint` (lay); `triageNote`; history `presenting`, `onset`, `character`, `site`, `nausea-vomiting` (phase `first-attack`); decision 1 prompt |
| left upper and periumbilical tenderness, mild local guarding, equivocal rebound, Murphy's sign negative; no palpable neck mass ("first" examination) | `exam.abdomen` (phase `initial`) | exam `abdomen-palpation`, `rebound`, `murphy`, `neck` (phase `first-attack`) |
| amylase 1139 U/L (specimen not stated); calcium 2.76 mmol/L; CT pancreatitis and left renal stone | `investigations.episodes` | `amylase` (named "Amylase", its note recording that the specimen is not recorded), `calcium` (named "Calcium" / 血钙 — 1.0.0's word — not "serum calcium"; flag H), `abdominal-ct` — results `first-attack` |
| after the first discharge: normal eating and bowels, no abdominal pain or distension, no bone pain or back ache, no polyuria or polydipsia | `history.interval` | `history.interval-well` (phase `recurrence`) |
| blood pressure normal without antihypertensive medicine after the first discharge | `history.blood-pressure` | `history.bp-interval` (phase `recurrence`) |
| about 20 months later: sudden upper abdominal distending pain, nausea and vomiting; presented after 8 hours | `history.recurrence` | phase `recurrence` description; history `presenting-again`, `onset-again`, `last-attack` |
| amylase 1055.9 U/L; calcium 2.87 mmol/L; CT pancreatitis and stones again | `investigations.episodes` | `amylase`, `calcium` (flag H), `abdominal-ct` — results `recurrence` |
| calcium raised and renal stones on both occasions | `title`, `summary` | calcium flags; "renal stone(s)" on the second CT |
| ultrasound/CT: lesion behind the lower pole of the left thyroid lobe | `investigations.localisation` | `neck-imaging` (record, phase `recurrence`) |
| resection about 2 × 1.5 × 1 cm; histology parathyroid adenoma | `investigations.localisation` | `histology` (record, phase `post-op`) |
| a pre-operative "31 pmol/L" whose analyte is labelled "thyroxine" (甲状腺素), possibly mislabelled; not to be read as a verified PTH | `investigations.localisation`; decision `evidence` option `rename` | `hormone-assay` result `recurrence` (value with label and note); decision 4 |
| post-operative PTH (explicitly labelled) fell to 3.8 pmol/L; calcium 2.18 mmol/L | `investigations.localisation` | `hormone-assay` and `calcium` results `post-op` |
| PTH and calcium stayed normal after the resection; transient limb numbness without convulsions (无抽搐), settled on its own; no complaints at follow-up, duration not stated | `investigations.followup` | post-op result texts; history `post-op-feeling`, `spasms` (phase `post-op`), `followup-status` (phase `followup`); `outcome` |
| the report's care of the pancreatitis included fasting and antibiotics; its drug doses were not carried into 1.0.0 | decision `management` option `routine-antibiotic` and feedback; 1.0.0 README ("historical drug doses are omitted") | `nil-by-mouth` and `prophylactic-antibiotics` responses; decision 1 feedback; `outcome` |
| family history, allergies, operations, medicines and other background not supplied; original pre-operative PTH, albumin/ionised calcium and long-term outcome absent | history (unknown items), `debrief.unknowns` | 18 unknown history items; `albumin-ionised` and 8 other records `available: false`; `examNotRecorded`; 7 `unknowns` |

**Times.** Recorded: one day of pain before the first admission; "about 20 months later" for the second attack (1.0.0
gives no anchor beyond the first episode — the case says "about 20 months after the first attack"); 8 hours before the
second presentation. Not recorded: the day of each CT, when the hormone value was measured (dated "before the operation",
shown in the readmission phase), the operation date relative to the second admission, when the post-operative PTH and calcium were taken
(before or after the numbness), and the length of follow-up. **Derived values:** none — no albumin is recorded, so no
albumin-adjusted calcium can be calculated, and no reference interval is recorded, so no fold-of-normal is stated for
any value (the case reads 2.76 and 2.87 mmol/L as raised because 1.0.0 calls them so; it flags neither amylase value).
Neither is the amylase's specimen recorded (1.0.0 says "amylase", not "serum amylase"), so the case does not claim that
it exceeds three times the upper limit: pain with the CT establishes the pancreatitis.

**Guidance numbers used in teaching text** (formulas; no patient value is needed, and no weight is recorded): lactated
Ringer's 1.5 mL/kg/h with 10 mL/kg boluses only for hypovolaemia; WATERFALL's aggressive arm 20 mL/kg then 3 mL/kg/h;
low-fat oral diet within 24–48 hours in mild disease (ACG 2024; IAP 2025 recommendations 10, 11 and 22); isotonic saline
instead of lactated Ringer's in hyperparathyroid pancreatitis only with a calcium > 14 mg/dL or altered sensorium (IAP
2025 statement 63; 14 mg/dL ÷ 4.008 = 3.49 mmol/L, quoted as "about 3.5 mmol/L" — her recorded 2.76 and 2.87 mmol/L
are 11.1 and 11.5 mg/dL); calcium repeated at least once when ≥ 2.6 mmol/L, PTH measured once the albumin-adjusted
calcium is ≥ 2.6 mmol/L on two occasions, with a concurrent adjusted calcium (NICE NG132 1.1.4–1.1.6, 2019); IV calcium
gluconate for an adjusted calcium < 1.9 mmol/L or symptoms at any level below the reference range — 10–20 mL of 10 % in
50–100 mL of 5 % glucose over 10 minutes with ECG monitoring, followed by 100 mL of 10 % in 1 L at 50–100 mL/h (Society
for Endocrinology 2016); calcium 3–6 months after surgery to confirm success (NICE NG132 1.4.11) and cure defined as
normal calcium homeostasis lasting at least 6 months (AAES 2016, recommendation 15-1a).

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to plan a discharge with one result you could not explain?"
2. **Description.** "In two sentences: what established the pancreatitis, and what made it unusual?"
3. **Analysis.**
   - "Which findings made the diagnosis of the first attack — and what else did the CT give you?" (pain with the CT
     establishes it; the amylase's specimen and reference interval are not recorded, so do not let the group claim it was
     three times the upper limit)
   - "Which way would you expect an attack to move the calcium? What did 2.76 mmol/L with a kidney stone tell you?"
   - "Her pancreatitis came with a raised calcium. Would you still give lactated Ringer's, and when would you not?"
     (IAP 2025: standard care, isotonic saline instead only above about 3.5 mmol/L or with altered consciousness)
   - "The report's care was fasting and antibiotics. What would you do differently today, and why?"
   - "At the second attack, what did you want in the blood before any scan? What can a scan never tell you?"
   - "The only recorded pre-operative hormone value said 'thyroxine'. What could that mean, and what would you have done
     before the operation?"
     (do not let the group relabel it silently — the post-operative PTH 'fell to' 3.8 pmol/L, which fits a raised PTH
     before surgery, but that is hindsight)
   - "Why not cinacalcet, a needle biopsy or an ERCP?"
   - "After the operation her arms and legs were numb, and a post-operative calcium was 2.18 mmol/L (which came first is
     not recorded). What did you check, and what would have sent the calcium into a vein?"
   - "How will you know she is cured, and what else needs following?"
   - "How did you explain the need to chase the calcium to a woman who felt better?"
4. **Summary.** "What will you do the next time an attack of pancreatitis comes with a raised calcium?"

The record does not show whether the first calcium was pursued; do not let the group claim the first team "missed" it —
say that the cause was found after the second attack, and that today's standard would act at the first. Nor let one case
stand for a rule: IAP 2025 (remarks to statement 61) notes that primary hyperparathyroidism underlies fewer than 1 % of
attacks of acute pancreatitis and that a causal link is uncertain — the teaching is to look, not to assume.

### Common learner errors and how the case surfaces them

- **Accepting the calcium as dehydration or "part of the pancreatitis".** Decision 2 offers both readings
  (`haemoconcentration`, `pancreatitis-releases-calcium`); the routine discharge is contraindicated and costs `rb-avoided-harm`,
  and the critical item `rb-calcium-pursued` too unless a PTH was sent at that admission.
- **Fasting and antibiotics by reflex.** Decision 1's `fast-with-carbapenem` and the interventions `nil-by-mouth` and
  `prophylactic-antibiotics` reproduce the historical care; each carries an ACG 2024 harm text.
- **Calling a second attack idiopathic.** Decision 3 offers ERCP and cholecystectomy; `urgent-ercp` fails the safety
  outcome.
- **Scan first, or trusting imaging to make the diagnosis.** Decision 3's `scan-first` and decision 4's
  `operate-on-imaging`; referring before the laboratory query is contraindicated and misses `rb-verified-referral`.
- **Relabelling a doubtful result silently.** The hormone record keeps the "thyroxine" label with a note; the attending
  and the endocrinologist never relabel it.
- **Reflex IV calcium for post-operative numbness.** Decision 5's `continuous-iv-calcium` and the contraindicated
  `iv-calcium-infusion` carry the Society for Endocrinology thresholds.
- **Stopping at "operation done".** Decision 5's `cure-check-and-stones` and the `follow-up-plan` intervention.

## Embodied mode

- **Where things are (`general-hospital`).** She lies in a ward bed (`setting: "inpatient"`) in every phase; no
  phase has a `location` and no intervention a `destination`. The operation happens off-screen between `recurrence` and
  `post-op`: it is a record (`histology`), and the readmission is staged on the same ward bed.
- **Records and tests.** Four record reviews need only `records` (the nurses' station terminal or the notes at the
  bedside): the abdominal CT report (one result per admission), the neck ultrasound/CT report, the histology report and
  the outcome. The blood tests are
  sampled at the bedside and run in the laboratory (`lab-chemistry`, `lab-endocrine`, `lab-hematology`, `lab-blood-gas`);
  the gallbladder ultrasound is a bedside study with the ultrasound machine brought from radiology (`performedAt:
  "bedside"`) and returns "no result recorded".
- **Kit and scope.** She arrives without a cannula (`extensions.embodied.ivAccessInSitu: false`), so the reference path
  places one before the fluids at each admission; fluids, analgesia, oral calcium and the cannula are nursing-scope by kind;
  the discharge plans, the laboratory query, the referral, ERCP and the needle biopsy are medical. The staff are one ward
  nurse (梁护士 / Nurse Liang, handover in ISBAR from the triage facts), the attending and the endocrinologist.
- **She speaks throughout** (a conscious adult answers for herself; no companion). Examination findings exist only in
  `first-attack`; any other manoeuvre, and any examination in a later phase, answers with `examNotRecorded`.
- **Measured (offline demonstration, 2026-11-14, after review round 2).** `embodied-autopilot.test.ts -t
  "cmcr-1069544:"` passes in en and zh-CN: every objective done, in-world score equal to the clinical score (29/29), no
  "cannot do this".

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; the first attack (a
day of constant distending upper abdominal pain with nausea and vomiting), its examination, amylase, calcium and CT; the
interval history (normal eating and bowels; no abdominal pain or bloating, bone or back ache, polyuria or polydipsia) and
normal blood pressure off antihypertensives; the second attack about 20 months later (sudden,
presenting after 8 hours) with its amylase, calcium and CT; neck ultrasound/CT; the resection and histology; the
"thyroxine"-labelled 31 pmol/L value; the post-operative PTH and calcium; transient numbness without tetany or convulsions; follow-up
without complaints; fasting and antibiotics in the report's care.

**Adapted for teaching.** The four phases and their staging (the first attack's results shown at admission; the
hormone result (dated "before the operation") and the neck imaging (dated "after the second attack") shown at the
readmission; the operation off-screen); the patient's dialogue (lay
rewording of the recorded facts — 胀痛 as "a bloated, aching pain", 多尿多饮 as "drinking or passing water more than
usual", 无抽搐 as "no spasms or fits" in her words and "without tetany or convulsions" in clinical text); the staff; the five decisions,
their options and feedback; the 17 interventions (their responses say the case does not record whether they were done,
except the two that reproduce the recorded fasting and antibiotics); the rubric; the tests a learner would order that
1.0.0 does not record, as honest `available: false` records. **Labelled teaching device:** her voiced worry ("I'm
afraid this will keep coming back", `persona.concerns` and the `concerns` item) adds no clinical fact; 1.0.0 records no
concerns. Unknown history items answer with the collection's lay unknown ("这个我说不上来，医生。" / "I'm not sure,
doctor."); for a conscious adult asked whether she drinks alcohol this is an artefact of the record, not a persona trait
— say so if learners remark on it.

**Contradictions and gaps kept.** (1) The analyte of the pre-operative 31 pmol/L value: 1.0.0 says the report labels it
"thyroxine" and that the label is possibly an error for PTH; the case shows the label as recorded with both readings in
a note and resolves nothing — the teaching is to resolve it with the laboratory. (2) The post-operative calcium "fell to"
2.18 mmol/L while the report says calcium and PTH "stayed normal" after the resection; with no reference interval
recorded, the case states both and flags neither value. (3) The second CT: 1.0.0's text says "stones" without side or
number, its summary "renal stones on both occasions"; the case says "renal stone(s) still seen". (4) 1.0.0's English
rendered 麻木 as "tingling" and 无抽搐 as "without convulsions"; the case follows the Chinese (numbness; no tetany or
convulsions). (5) The fasting-and-antibiotic care appears in 1.0.0 only in a decision option, its feedback and the README;
the case uses it without attaching it to either attack. 1.0.0's template texts were not carried over: the triage note
("Begin with the first episode, then reveal recurrence…") was an instruction, the patient's answers said "the source case
does not provide that information", and the "first episode" history items were available in the first phase although
they described the interval and the recurrence.

**Unknowns kept honest.** Vital signs, severity and organ function; the amylase's specimen and reference interval
(the record is named "Amylase", not "serum amylase"); the specimen of the calcium and hormone values (named "Calcium" /
血钙 and "Hormone assay" / 激素测定 since review round 2, not "serum…"); lipase, liver tests, triglycerides, blood count, renal function;
albumin and ionised calcium; gallbladder imaging; alcohol, medicines, smoking, family and past history,
allergies; whether the first calcium was pursued; the hormone value's analyte, timing, pair and reference interval; TSH;
vitamin D, urine calcium, bone density; operative details and timing; the post-operative sampling times; the length of
follow-up. Record-facing texts say "No result is recorded for this test" or "This case does not record whether this was
done; it does not simulate its effect" — never that the article lacks something.

**Figures and privacy.** The report's only figure (`fig01`) is **withheld** in `scripts/cmcr-105-media-review.json`:
"The middle CT panel retains an Image Date calendar-date overlay and acquisition time in its lower-right corner."
`assets` is empty; the case teaches from the written reports and no outcome depends on reading an image. The pseudonym
陈知远 / Chen Zhiyuan is kept from 1.0.0; no hospital, date, initials or occupation appear.

**Survey findings applied.** No case audit or critic note named this case. The governance survey's spoiler finding (title
and summary of cmcr-1069544) is fixed; the code review's specialty split (`surgery` → `general-surgery`) is kept from the
framework migration. The template defects are replaced: generic history slots and authoring language in the patient's
mouth, three generic decisions with option ids that named the answer or its role (`adenoma`, `confirm`, `ignore`…) and
the key the longest option, a critical item that was a decision alone, no interventions, no staff beyond the attending, and
a hindsight "evidence" decision about the pathology record. The 1.0.0 safety theme — verify the analyte before planning
surgery — is kept as an act (`lab-query-repeat` before `surgical-referral`).

**Extensions.** `collection`, `sourceArticleId`, `sourceUrl` and `historicalReview` kept; `sourceDoi` and `doiVerifiedAt`
(2026-10-29, the source map's `publisherCheckedAt`) replace 1.0.0's `sourceDoiVerification` object; `sourceTextChecked:
false`; `embodied.ivAccessInSitu: false`; no `sourceTextSha256` until the source pass (STANDARD §6.6).

## Matcher notes

- **Phase twins.** `presenting-again` supersedes `presenting`, `onset-again` supersedes `onset`, `last-attack` supersedes
  `earlier-episodes`, `interval-well` supersedes `calcium-symptoms`, `bp-interval` supersedes `bp-history` (all in
  `recurrence`), and `followup-status` supersedes `post-op-feeling` (in `followup`): the same question gets the answer of
  the phase it is asked in, and asking the twin credits the earlier item.
- **Shared words separated with `excludeKeywords`.** The presenting items exclude surgery, "since", family, alcohol and
  allergy words; `onset-again` excludes "last time", "months" and "since you went home"; `last-attack` excludes the
  interval question ("since you went home", 出院以后, 身体); `kidney-stones` excludes family words; `post-op-feeling`
  excludes spasm and mouth words; `family` excludes "does your family know you're here / are they visiting" (知道你,
  探视).
- **English keywords** avoid one-token wildcards: run-together forms where a phrase would reduce to one token
  (`howmanydays`, `whatcameup`, `toyourback`, `sincewhen`, `sinceyourlaststay`, `likethisbefore`, `whatdidtheygive`,
  `howareyounow`…). Every canonical question selects its own item first in each of its phases (checked for both
  languages with core `matchHistory` on 2026-11-14, after the spasm and blood-pressure questions were reworded; the
  offline demonstration asks these questions).
- **Plain questions (review round 2).** 40 zh-CN and 42 en natural phrasings were probed by phase, beyond the corpus. The
  KIT §3.10 openers had reached nothing or the wrong item (怎么了, 这次怎么了, 怎么回事, 肚子痛吗, "What happened?" →
  `earlier-episodes`, "Tell me what's been going on"), as had 哪个地方痛, 有没有恶心想吐, "Do you feel nauseous?", "Any
  medical problems?", "Is the pain constant or does it come and go?", "When did it start this time?", "What treatment
  did you have last time?" and 现在还麻吗. Keywords added: `presenting` (怎么了, 这次怎么了, 怎么回事, 肚子痛吗, `whathappened`,
  `goingon`, `whatstheproblem`), `site` (哪个地方痛, 什么地方痛, 哪儿痛), `nausea-vomiting` (恶心, 想吐, nauseous, nausea,
  `feelsick`, `beensick`), `character` (`comeandgo`, `comesandgoes`, `constantpain`, `painconstant`), `pmh`
  (`medicalproblems`, `healthproblems`), `followup-status` (还麻, 现在还麻); excludes added: `presenting-again` (start, when
  did), `last-attack` (treatment). All 82 probes now reach the expected item, and the lay examination requests (按一下肚子,
  摸一下脖子, "Press on her belly", "Feel her neck for lumps"…) reach the right finding.
- **Order entry.** `orderMatching.rules` send CT or ultrasound queries naming the neck or thyroid (颈, 甲状腺) to the neck
  imaging report, urine-calcium queries to `urine-calcium`, and ionised, adjusted or corrected calcium to
  `albumin-ionised`. The hormone assay (named "Hormone assay" / 激素测定) answers to PTH names only (甲状旁腺激素, PTH, iPTH,
  parathyroid hormone…). Review round 2 found that its generic aliases "hormone levels" / 激素水平 caught "thyroid hormone
  levels" / 甲状腺激素水平 — a thyroid order at the first attack earned the critical `rb-calcium-pursued` — removed them,
  and added a rule that drops the hormone assay from any query naming the thyroid (thyro, 甲状腺, 甲功, TSH, T3, T4) unless
  it also names PTH or the parathyroid. The histology record no longer answers a bare "specimen" ("blood specimen" reached
  it); it answers "surgical specimen" and "resected specimen".
- **Spasms.** The `spasms` item asks about cramps or spasms of the hands or feet only, matching what is recorded (无抽搐);
  facial twitching is not recorded and gets her "I'm not sure" (no item matches it).
- **Corpus.** 46 test utterances (26 zh-CN, 20 en), written as learners speak; every required item and every phase twin
  is covered. Four negatives (`expect: []`): the look-alikes "你家里人知道你住院了吗？", "你吃过午饭了吗？" and "Is your
  family coming in to visit today?", and "Any twitching around your face?" (unrecorded). `cases verify` reports 46/46.

## References

1. 谢钧韬, 叶建宇, 尹耀新, 欧希, 易辛, 刘吉奎. 以急性胰腺炎为首发表现的甲状旁腺腺瘤一例. 中华普通外科学文献（电子版）. 2010;4(1):66-67.
   doi:10.3760/cma.j.issn.1674-0793.2010.01.120. Available from: https://rs.yiigle.com/cmaid/1069544
2. Bilezikian JP, Khan AA, Silverberg SJ, et al. Evaluation and management of primary hyperparathyroidism: summary
   statement and guidelines from the Fifth International Workshop. J Bone Miner Res. 2022;37(11):2293-2314.
   doi:10.1002/jbmr.4677
3. Wilhelm SM, Wang TS, Ruan DT, et al. The American Association of Endocrine Surgeons guidelines for definitive
   management of primary hyperparathyroidism. JAMA Surg. 2016;151(10):959-968. doi:10.1001/jamasurg.2016.2310
4. National Institute for Health and Care Excellence. Hyperparathyroidism (primary): diagnosis, assessment and initial
   management. NICE guideline NG132. London: NICE; 2019.
5. Tenner S, Vege SS, Sheth SG, et al. American College of Gastroenterology guidelines: management of acute pancreatitis.
   Am J Gastroenterol. 2024;119(3):419-437. doi:10.14309/ajg.0000000000002645
6. IAP/APA/EPC/IPC/JPS Working Group. International Association of Pancreatology revised guidelines on acute
   pancreatitis 2025: supported and endorsed by the American Pancreatic Association, European Pancreatic Club, Indian
   Pancreas Club, and Japan Pancreas Society. Pancreatology. 2025;25(6):770-814. doi:10.1016/j.pan.2025.04.020
7. de-Madaria E, Buxbaum JL, Maisonneuve P, et al. Aggressive or moderate fluid resuscitation in acute pancreatitis. N Engl
   J Med. 2022;387(11):989-1000. doi:10.1056/NEJMoa2202884
8. Turner J, Gittoes N, Selby P; Society for Endocrinology Clinical Committee. Society for Endocrinology endocrine
   emergency guidance: emergency management of acute hypocalcaemia in adult patients. Endocr Connect. 2016;5(5):G7-G8.
   doi:10.1530/EC-16-0056
9. 中华医学会外科学分会胰腺外科学组. 中国急性胰腺炎诊治指南（2021）. 中国实用外科杂志. 2021;41(7):735-742.

**DOIs and checks (2026-10-30 authoring; independent review 2026-11-14).** The source DOI is the one the source map
records as verified (`publisherCheckedAt` 2026-10-29). The review replaced the 2013 IAP/APA guideline, which the IAP's
2025 revision (ref 6) supersedes and which now has statements of its own on pancreatitis with hyperparathyroidism
(61–63). Checked in the primary texts on 2026-11-14: ACG 2024 (PMC full text: recommendations 3–5, 8, 10 and 11; the
1.5 mL/kg/h rate and 10 mL/kg bolus; idiopathic pancreatitis defined after a work-up that includes calcium); IAP 2025
(publisher's PDF: statements 2, 61–63, recommendations 3, 10, 11, 19, 22 and 28); NICE NG132 (PDF: 1.1.1, 1.1.3–1.1.10,
1.3.1, 1.4.11–1.4.12, 1.5.1); the Fifth International Workshop (open-access PDF: imaging "not recommended for diagnostic
purposes", surgery for all symptomatic patients, an experienced parathyroid surgeon, pancreatitis among the classic
manifestations, cinacalcet for those not having surgery); AAES 2016 (PDF: recommendation 4-4 on parathyroid fine-needle
aspiration, 15-1a on cure; DOI confirmed); the Society for Endocrinology hypocalcaemia guidance (its text as reproduced
by an NHS trust: severe = below 1.9 mmol/L and/or symptomatic at any level below the reference range, paraesthesiae
listed among the symptoms, the bolus and infusion; authors and issue confirmed by search; a 2019 addendum,
doi:10.1530/EC-16-0056a, adds calcium chloride equivalence). Refs 7 and 9 were confirmed by search (journal, volume,
pages, DOI); ref 4 is cited by its guideline number. **Review round 2 (2026-11-14)** re-read every attributed statement in
the primary texts: ACG 2024 (PMC full text: moderately aggressive fluids, ≤ 1.5 mL/kg/h and a 10 mL/kg bolus only for
hypovolaemia, lactated Ringer's, early oral feeding within 24–48 h in mild disease, against prophylactic antibiotics in
severe disease, medical therapy over early ERCP in *biliary* pancreatitis without cholangitis, idiopathic pancreatitis
defined after a work-up that includes calcium); IAP 2025 (publisher's PDF: statements 2, 61–63, recommendations 3, 10,
11, 19, 22, 28); NICE NG132 (1.1.4–1.1.6, 1.1.10, 1.2.1, 1.3.1, 1.4.11, 1.5.1); the Fifth International Workshop
(diagnosis 1.1, surgery 5.2, imaging 6.1, all symptomatic patients offered surgery, pancreatitis among the classic
gastrointestinal manifestations); AAES 2016 (recommendations 3-11, 4-4, 15-1a); the Society for Endocrinology guidance
in its journal version (PMC5314808: mild = asymptomatic with a calcium > 1.9 mmol/L; severe = < 1.9 mmol/L and/or
symptomatic at any level below the reference range, paraesthesiae listed; the bolus and infusion; transient, mild
hypocalcaemia after selective parathyroidectomy); WATERFALL (PubMed abstract). AAES 2016's main text says only that
parathyroid fine-needle aspiration is highly specific but rarely necessary and can have undesirable consequences, so the
case no longer credits AAES with the harms it lists (bleeding, scarring, seeding) or with "inconclusive cytology".

### To verify

**In the source article (the details 1.0.0 does not give):**

- The first attack: vital signs, severity (organ failure, scores), CRP, haematocrit, lipase, liver tests and bilirubin,
  triglycerides, albumin, glucose, renal function; gallbladder imaging; alcohol, drug and gallstone history; whether this
  was her first attack ever.
- Each CT: the day it was done, contrast, necrosis or collections; the size of the left renal stone; the side and number
  of the stones on the second CT.
- Whether the calcium of 2.76 mmol/L was pursued during or after the first admission (any PTH then), and what the first
  discharge plan was.
- The blood-pressure statement: why antihypertensive medicine is mentioned (raised blood pressure during the first
  admission? which drug?).
- The interval ("about twenty months") and its exact anchor.
- The pre-operative 31 pmol/L value: its analyte (PTH or free thyroxine), unit, reference interval, sampling date, the
  paired calcium, and any TSH or thyroid hormones; whether the article itself shows the label error 1.0.0 describes.
- Localisation: what the ultrasound and the CT each showed (1.0.0 reports them together), lesion size, any sestamibi.
- The operation: date relative to the second admission, approach (focused or bilateral), intraoperative PTH, frozen
  section, the other glands, gland weight.
- After surgery: when the PTH of 3.8 pmol/L and the calcium of 2.18 mmol/L were measured, their reference intervals, the
  timing and duration of the numbness, and whether any calcium was given.
- The conservative care of the pancreatitis: fasting, the antibiotics (agents, doses, duration) and any other drugs, and
  for which attack (1.0.0 notes that the historical doses were omitted).
- Follow-up: its length, later calcium and PTH, the stones, bone density.
- The withheld figure `fig01` (a CT composite per the media review): what it shows, and whether its legend adds findings.
- The specimen of the calcium and hormone values (serum or plasma; the case says "Calcium" / 血钙 and "Hormone assay"),
  and when the 31 pmol/L value was taken (the case shows it at the readmission, dated "before the operation").
- The amylase: its specimen (blood or urine) and the laboratory's reference interval (1.0.0 says only "amylase"; the case
  therefore never says it exceeded three times the upper limit).

**In the guidance (most primary texts checked on 2026-11-14 — see above; what a clinician should still confirm):**

- AAES 2016's eAppendix (not reached in either review): what it says about the harms of parathyroid fine-needle
  aspiration; the case now names bleeding, scarring and seeding as "harms reported", not as AAES's words.
- IAP 2025 statement 63: whether a clinician of the specialty would apply the saline-not-Ringer's switch only above
  14 mg/dL, as written, and how the case's teaching of it reads to a gastroenterologist.
- The judgement calls of the teaching design: oral calcium for post-operative paraesthesia with a calcium the report
  calls normal (the guidance's "mild" category is asymptomatic, so this is practice, not a quoted threshold), and the
  examiner's view that an unindicated urgent ERCP is this case's critical error.
- Chinese AP guideline (2021): its recommendations on fluids, feeding and prophylactic antibiotics (cited, not quoted);
  whether a current Chinese guideline on primary hyperparathyroidism should be added (none was confirmed in this session).
- The physiology statements used in teaching (an attack of pancreatitis tends to lower serum calcium; a low magnesium
  impairs PTH secretion) against a current textbook or review.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the presenting attack is split
  into presenting complaint, onset, character, site and vomiting (phase `first-attack`); the interval facts and the
  second attack, which 1.0.0 offered in its first phase, move to a `recurrence` phase with phase twins; the combined
  "episodes" record becomes amylase, calcium and CT records with two phase results each; the "localisation" record
  becomes the neck-imaging, hormone and histology records and the post-operative calcium; the outcome record carries the
  whole course.
- **History.** 15 template slots (10 with the meta answer "The source case does not provide that information") → 32
  items in the patient's lay voice: 13 recorded facts, 18 honest unknowns, one labelled ICE device; 10 required.
- **Examination.** 1 compound finding → 4 manoeuvres (abdomen, rebound, Murphy's sign, neck), as recorded.
- **Phases and gates.** 4 template phases (`workup` gated on four history items and the examination, the later ones on
  a single decision each) → 4 one-way
  phases gated on the preceding objectives; the readmission and the operation open only after a committed act; the
  outcome phase opens only after all five decisions.
- **Investigations.** 3 record reviews → 16 records: amylase, calcium and the hormone assay as orderable labs with phase
  results, the CT, neck imaging, histology and outcome as record reviews, and honest `available: false` results for
  lipase, triglycerides, liver tests, albumin/ionised calcium, renal function, blood count, gallbladder ultrasound, urine
  calcium and vitamin D.
- **Interventions.** 0 → 17: the recorded care (fasting, antibiotics) as contraindicated historical steps, today's
  care (cannula, goal-directed Ringer's, analgesia, early feeding), the discharge choice, the laboratory query and the
  surgical referral, the tempting wrong steps (aggressive fluids, urgent ERCP — `critical`, needle biopsy, cinacalcet,
  IV calcium infusion) and the post-operative steps (oral calcium, follow-up plan), each with a harm text where
  contraindicated.
- **Decisions.** 3 template decisions (role-named ids, the key the longest, a hindsight "evidence" appraisal of the
  pathology record, a management key handing the act to "discussion with endocrine surgery") → 5 decisions with content
  ids and no length cue: first-days care, the meaning of the calcium, the next step at the second attack, the pre-operative
  plan (verify, then refer) and the post-operative plan (select all).
- **Rubric.** 11 template items (the only critical item a decision alone) → 12: two critical acts (`rb-calcium-pursued`,
  `rb-verified-referral`), an avoided-harm item with `scoredWhen`, first-try decision scoring, time-window scoring of the
  critical acts (`whenIndicated`), and a Calgary–Cambridge communication item written for the case.
- **Teaching layer.** 6 learning outcomes, 6 objectives, 3 named staff, 5 key reasoning steps and 5 dated teaching
  points, 7 unknowns, 9 Vancouver references (the 1.0.0 workshop reference had no authors, journal or volume; bare URLs
  removed; the source citation without a zero-padded volume and issue).
- **Card.** New spoiler-free title and summary (governance survey), lay chief complaint, triage note as a handover, three
  presenting-feature tags, topic tags `abdominal-pain` and `laboratory-interpretation`; specialty `endocrinology` dropped
  (answer discipline); estimated time 30 → 35 min.
- **Governance.** Review status and notes in the STANDARD §6.6 wording (editorial; facts not yet checked against the full
  article; not reviewed by a licensed clinician — the English last sentence reads "The case is not yet reviewed by a
  licensed clinician." because the collection contract matches that phrase case-sensitively); `sourceTextChecked: false`;
  `sourceDoi` + `doiVerifiedAt` replace `sourceDoiVerification`.
- **Independent review (2026-11-14).** *Facts:* the amylase record no longer says "serum" — 1.0.0 records "amylase"
  without a specimen — and its note says the specimen is not recorded; the staff's and the guide's question "which two
  findings made the diagnosis — did you need the CT?" (which leaned on an amylase threshold the case cannot establish)
  now asks which findings made it and what else the CT gave; this guide no longer attributes "until the amylase
  normalises" or a carbapenem to the report's care (1.0.0 records only fasting and antibiotics); her answers no longer
  say she had the earlier pain "once" (zh-CN), that she took no blood-pressure tablets at all (1.0.0: normal *without*
  them), or deny facial twitching (unrecorded; the spasm question now asks only what 无抽搐 records); the conclusion says
  "no complaints at follow-up", as recorded. *Guidance:* IAP/APA 2013 replaced by the IAP's 2025 revision, which asks
  for a PTH when an attack comes with a raised calcium and switches from lactated Ringer's to isotonic saline only above
  about 3.5 mmol/L (14 mg/dL) or with altered consciousness — both now taught; decision 3's ERCP feedback cites ACG
  2024's definition of idiopathic pancreatitis and IAP 2025's ultrasound–EUS–MRI sequence instead of the early-ERCP
  recommendation; WATERFALL quoted for its aggressive arm without claiming the distractor is "exactly" it; the post-op
  key now follows the Society for Endocrinology definition (IV calcium for an adjusted calcium below 1.9 mmol/L or
  symptoms, paraesthesiae included, with a calcium below the reference range; otherwise oral) and no longer calls
  "mild symptoms" the guidance's oral category; the needle-biopsy texts cite AAES 2016 recommendation 4-4; cinacalcet's
  harm attributes renal stones to NICE NG132 and pancreatitis to the Fifth Workshop; references gain the AAES DOI and the
  Society for Endocrinology authors. *Assessment:* a third critical item, `rb-no-ercp`, holds the critical
  intervention (as in the reviewed exemplars); oral calcium given while the calcium is raised now costs
  `rb-avoided-harm` (`valid: false`) and no longer blocks the indicated post-operative dose (`maxDoses` 2); thyroid
  tests are no longer aliases of the hormone assay, so they cannot earn the critical "PTH at the first attack"; decision
  4's key reads "if that confirms it" (a raised *or inappropriately normal* PTH confirms it); the length cue of the
  select-all decision 5 (its keys were the three longest options in English) and of decision 4 in zh-CN removed;
  `reviewedAt` 2026-11-14; one more test utterance (39).
- **Review round 2 (2026-11-14).** A second independent review (every patient-fact string traced to 1.0.0 in both
  languages; every attributed guideline statement re-read in its primary text; replays of every harmful act, late steps,
  order aliases and 82 plain questions). *Facts (major):* widened interval facts replaced by what 1.0.0 records — "she
  was well" (decision 3 prompt), "no symptoms" (conclusion, provenance, this guide's summaries) become normal eating and
  bowels with no abdominal pain or bloating, bone or back ache, polyuria or polydipsia; the calcium and hormone records
  are no longer called "serum" (1.0.0: 钙 / 血钙; specimen now noted as unrecorded); "a single parathyroid adenoma"
  (this guide) loses "single"; "the only pre-operative hormone value" becomes "the only recorded"; the numbness is no
  longer tied in time to the 2.18 mmol/L calcium (key reasoning, PEARLS); the hormone value is dated "before the
  operation" as 1.0.0 records. *Minor facts:* her opening answer now says since when and that she vomits, the nausea
  answer names the nausea, the second attack no longer implies the first was not sudden, the en conclusion keeps the
  nausea, the zh conclusion says "相隔约 20 个月", 无抽搐 reads "without tetany or convulsions", the actor's follow-up
  note says "no complaints" (not "well"). *Guidance:* AAES 2016 is no longer credited with FNA harms or inconclusive
  cytology its text does not state (major); ACG 2024's ERCP statement is quoted for its subgroup (biliary pancreatitis);
  ACG "suggests" (not "recommends") early feeding; "IAP 2025 recommends the same" spelt out; WATERFALL quoted for its
  volumes. *Assessment (major):* the routine discharge (a harm text) cost nothing and now counts against
  `rb-avoided-harm`; "thyroid hormone levels" / 甲状腺激素水平 reached the hormone assay and earned the critical item
  (aliases removed, thyroid rule added); the KIT §3.10 openers and nine other plain questions reached nothing or the
  wrong item (keywords added; 7 test utterances, now 46). *Minor:* the first-attack hint no longer names the
  pancreatitis; the histology record no longer answers "specimen"; decision 1's prompt keeps "local" guarding;
  decision 2's zh key states the timing the en key gives. The SfE "To verify" item is closed (journal text read).

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, 1 examination finding,
  3 record reviews, 3 decisions, 11 rubric items (10 deterministic) and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-1069544/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1069544 --lang en                                                 # 106 steps · objectives 6/6 · decisions 5/5 · utterances 46/46 · rubric 29/29 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-1069544                                       # depth floor, do-nothing 0/25, wrong-first 48 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1069544:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1069544:"  # in-world demonstration, en + zh-CN
```

Measured on 2026-11-14, after review round 2: all five pass.

## 中文摘要

**病例概要。** 58岁女性，上腹持续胀痛伴恶心、呕吐 1 天入院；左上腹及脐周压痛、局部轻度肌紧张、反跳痛可疑、墨菲征阴性，颈部未触及
包块；淀粉酶 1139 U/L（标本类型和参考区间未记录），血钙 2.76 mmol/L（升高），CT 示胰腺炎及左肾结石。出院后饮食、大便正常，无腹痛腹胀、骨痛及腰背酸痛、多尿多饮，未服降压药时血压正常。约 20 个月后再次
突发上腹胀痛伴恶心、呕吐，8 小时后就诊：淀粉酶 1055.9 U/L，血钙 2.87 mmol/L，CT 仍见胰腺炎及肾结石。颈部超声及 CT 示左甲状腺
下极后方病灶，切除约 2 × 1.5 × 1 cm，病理为甲状旁腺腺瘤。记录中唯一的术前激素结果 31 pmol/L 被标为“甲状腺素”（可能为误标的 PTH，
两种读法并列，不作裁定）；术后 PTH 3.8 pmol/L、血钙 2.18 mmol/L 并维持正常，曾短暂四肢麻木、无抽搐、自行缓解，随访未诉不适
（时长未记录）。报告对胰腺炎采用禁食和抗菌药物。诊断：甲状旁腺腺瘤所致原发性甲状旁腺功能亢进症，以反复急性胰腺炎为表现。本版
依据 1.0.0 版提取的事实改写，尚未对照原文全文核对。

**学习目标。**

1. 按现行标准处理急性胰腺炎最初几天（乳酸钠林格液目标导向适度补液、尽早低脂饮食、不预防性使用抗菌药物、仅胆管炎时 ERCP），并与禁食加抗菌药物对照（ACG 2024；IAP 2025）。
2. 对每次发作做病因筛查，把发作期血钙升高视为危险信号：复查白蛋白校正钙并同步测 PTH（IAP 2025；NICE NG132，2019）。
3. 先用生化确诊原发性甲旁亢，再做定位影像，说明影像为何不能确诊或排除（第五届国际研讨会，2022）。
4. 遇到项目名称存疑的结果，先与检验科核实或复查，再用它做手术等决定。
5. 把伴肾结石和反复胰腺炎的原发性甲旁亢转诊给有经验的甲状旁腺外科医生，说明为何不选西那卡塞或细针穿刺（AAES 2016；NICE NG132，2019）。
6. 评估术后肢体麻木，只按急诊阈值静脉补钙，术后 3–6 个月复查血钙确认治愈（英国内分泌学会 2016；NICE NG132，2019）。

**关键决策。**

- 决策 1（最初几天的处理）：乳酸钠林格液目标导向适度补液、镇痛、能耐受即低脂饮食、不预防性用抗菌药物；干扰项为旧式的禁食到淀粉酶恢复正常加预防性碳青霉烯类（报告只记录了禁食和抗菌药物，未记录药物和时长）、WATERFALL 试验积极补液组式的大量快速补液，以及没有胆管炎的急诊 ERCP。
- 决策 2（血钙的意义）：发作期血钙通常下降，2.76 mmol/L 合并肾结石不寻常，应复查白蛋白校正钙并同步测 PTH（IAP 2025；NICE NG132）；在这个水平发作的常规处理（包括乳酸钠林格液）不变，IAP 2025 只在血钙高于约 3.5 mmol/L 或意识改变时改用等渗盐水；干扰项为血液浓缩、“胰腺炎释放钙”、结石导致高钙、立即用唑来膦酸。
- 决策 3（再次发作后的下一步）：先用血液检查确立病因（PTH 与校正钙同步、肌酐、维生素 D、尿钙），之后再定位；干扰项为先做影像、ERCP 加括约肌切开、按胆结石切胆囊、血钙超过 3.0 mmol/L 才查。
- 决策 4（术前方案）：向检验科核实“甲状腺素 31 pmol/L”测的是什么并复查完整 PTH（同步测血钙），确诊（PTH 升高或与血钙不相称地正常）后转诊有经验的甲状旁腺外科医生；干扰项为凭影像直接手术、按甲亢处理、先细针穿刺（AAES 2016 不建议）、西那卡塞观察。
- 决策 5（术后计划，多选）：复查校正钙或离子钙及血镁并检查 Chvostek 征和 Trousseau 征；按严重程度处理（校正钙低于 1.9 mmol/L，或钙低于参考区间且有症状——包括感觉异常——时静脉补葡萄糖酸钙，否则口服钙剂）；术后 3–6 个月复查确认治愈并随访结石；不选不复查就持续静滴葡萄糖酸钙，也不选终身骨化三醇。

**安全结果。** `urgent-ercp` 标为 `critical: true`：没有胆管炎、也没有任何胆管证据时行急诊 ERCP，可引起胰腺炎、出血和穿孔，而真正的病因（血钙）仍未解释；一旦给予，无论得分多少，安全结果都判为不通过，并同时失去关键评分项 `rb-no-ercp`。

**复盘要点（PEARLS）。** 先谈面对一个解释不了的结果仍要安排出院时的感受；用两句话说清诊断依据和不寻常之处；分析哪些依据可以诊断胰腺炎（腹痛加 CT；淀粉酶的标本类型和参考区间没有记录，不要说它超过正常上限三倍）、发作期血钙为何应当下降、血钙升高时是否仍用乳酸钠林格液、报告中的禁食和抗菌药物与现行做法的差别、为何先查血再做影像、标为“甲状腺素”的结果该怎么办、为何不选西那卡塞、穿刺或 ERCP、术后麻木查什么以及何时静脉补钙、如何确认治愈；总结下次遇到胰腺炎合并高血钙时怎么做。评分：确定性总分 29 分，三项关键项（第一次住院就追查血钙；向检验科核实后才转诊外科；没有无指征的急诊 ERCP），沟通项由考官评判。记录中的处置（禁食、抗菌药物、第二次发作后才发现病灶）只作历史对照；第一次出院后是否追查血钙没有记录，不要说成“漏诊”。本病例经人工智能辅助编辑审核（含 2026-11-14 第二轮独立审核），尚未经执业医师审核；待核实事项见上文 “To verify”。
