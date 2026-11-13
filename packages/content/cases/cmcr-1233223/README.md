# cmcr-1233223 — Dizziness for over a month · 26-year-old man

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 周福庆, 龚洪翰. 1例复发缓解型多发性硬化MRI连贯分析. 磁共振成像.
2011;2(4):314-316 — a serial MRI analysis in an imaging journal. Version 1.1.0 re-authors the case to the clinical
content standard **from the facts that version 1.0.0 extracted from the report**; the full article was not available,
so **none of these facts has yet been checked against the full source article** (STANDARD §6). The patient
(蒋知远 / Jiang Zhiyuan) is a pseudonym; the nurse (严护士 / Nurse Yan), the attending (冯医生 / Dr Feng) and the
radiologist (邵医生 / Dr Shao) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not
record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-1233223` / `1.1.0` |
| setting / facility | `outpatient` / `general-hospital` (a consulting room; MRI and CT in imaging; records at the nurses' station) |
| specialty | neurology, radiology |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: four record phases spanning about 19 months, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a neurologist review it before teaching use |
| phases | `first-visit` 首诊（门诊） / First visit (clinic) → `second-episode` 约 10 个月后：新的症状 / About ten months later: new symptoms → `third-episode` 再约 9 个月后：再次复诊 / About nine months later: back again → `outcome` 记录的结局 / Recorded outcome — all one-way, none learner-switchable |
| content | 30 history items (6 recorded facts, 2 labelled teaching devices, 22 unknown; 9 required) · 5 examination findings (all recorded) · 9 investigations (4 record reviews; 3 without a recorded result) · 10 interventions (4 always harmful, 2 harmful before their precondition) · 6 objectives · 5 decisions (24 options) · 12 rubric items (11 deterministic, weight 25; 1 examiner-judged; 2 critical) · 3 staff · 6 learning outcomes · 6 teaching points · 38 test utterances |

## Learning outcomes

After the case the learner can:

1. Apply dissemination in space (≥ 1 lesion in at least two characteristic regions) and in time (a new lesion on
   follow-up MRI against a baseline scan) from the 2017 McDonald criteria and their 2024 revision (Lancet Neurol 2025)
   to serial MRI, and identify the earliest episode at which this patient could be diagnosed today.
2. Recognise that non-specific dizziness with a single punctate cord lesion is neither a typical demyelinating attack
   nor dissemination in space, and plan review with repeat MRI and safety-netting rather than a diagnosis or treatment
   (2024 McDonald revision).
3. Before attributing a new ring-enhancing lesion with reduced hearing and blurred vision to MS, order the mimic work-up
   — AQP4-IgG and MOG-IgG by cell-based assay (IPND 2015; International MOGAD Panel 2023), CSF with paired oligoclonal
   bands, eye and hearing assessment — and hold MS immunotherapy until AQP4-IgG has been sent and its result is known.
4. Treat a relapse that affects daily activities with methylprednisolone 500 mg orally once daily for 5 days (IV if
   oral treatment fails, is not tolerated or admission is needed) after looking for infection, and explain that
   steroids speed recovery but do not modify the disease (NICE NG220, 2022).
5. Once active relapsing MS is established, agree early disease-modifying therapy with the patient, matched to disease
   activity, with clinical and MRI monitoring (ECTRIMS/EAN 2018).
6. When a person with MS shows depressive features, screen for depression, ask directly about suicidal thoughts, and
   arrange treatment and follow-up according to risk (NICE CG91, 2009).

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list.

## Clinical summary (spoilers)

**First visit.** A 26-year-old man has had dizziness and felt unwell (头晕不适) for over a month. Examination and
neurophysiology show no clear abnormality; EDSS 0; BP 110/65 mmHg, temperature 36.9 °C. The brain MRI shows no clear
abnormality, only a punctate signal abnormality in the cervical cord without clear enhancement; routine laboratory tests
are unremarkable. Nothing else about him is recorded: not the character of the dizziness, other symptoms, past history,
medicines, allergies, family or social history.

**Second episode (about ten months later).** Weakness (乏力 — limb weakness or fatigue; the record does not say which),
blurred vision and reduced hearing; EDSS 2; a ring-enhancing lesion beside the left lateral ventricle (left
periventricular). After 35 days of treatment — drug, dose and route not recorded — the enhancement had resolved.

**Third episode (about nine months later).** His symptoms worsened, with depressive features; six new lesions appeared,
including the left temporal lobe (recorded once as "左颞叶" and once as "left temporal white matter"). A CSF examination,
date not recorded, was described only as unremarkable, without oligoclonal band or other details.

**Outcome.** After the third episode the report diagnosed **relapsing–remitting multiple sclerosis in an acute phase**.
Long-term treatment, later relapses, disability and follow-up are not recorded.

**Today's answer.** Under the 2017 McDonald criteria (Lancet Neurol 2018) and their 2024 revision (Lancet Neurol 2025),
the second MRI already showed dissemination in space (periventricular + spinal cord) and in time (a lesion the first
scan did not have). With the atypical features — reduced hearing, ring enhancement — the diagnosis needs a mimic work-up
first (AQP4-IgG and MOG-IgG by cell-based assay, CSF with paired oligoclonal bands, eye and hearing assessment); the
relapse is treated with high-dose methylprednisolone after an infection screen (NICE NG220, 2022), and disease-modifying
therapy is planned at that episode, not after a third. The first visit, by contrast, supports neither a diagnosis nor
treatment — only follow-up. At the third episode the depressive features need their own assessment, including a direct
question about suicidal thoughts.

## Scenario timeline (staged evidence by phase)

| phase | opens when | new at the bedside | new in the records / orders | decisions |
|---|---|---|---|---|
| `first-visit` | start | history (dizziness for over a month; 13 unknown items); vital signs; neurological examination (no clear abnormal signs); EDSS 0 | MRI (orderable): brain no clear abnormality, punctate cervical cord signal; routine laboratory tests (no clear abnormality); neurophysiology report (record review); CT head returns "no result recorded" | 1 `first-visit-plan` |
| `second-episode` | objectives 1–2 complete (history; examination, first tests and decision 1) | presenting complaint (weakness, blurred vision, reduced hearing); 7 unknown items incl. fever/infection; EDSS 2 | MRI: ring-enhancing left periventricular lesion; AQP4-IgG/MOG-IgG and infection screen return "no result recorded"; the CSF record is not yet available (its date is not recorded) | 2 `episode-two-criteria`, 3 `mimic-workup`, 4 `relapse-treatment` |
| `third-episode` | objectives 3–4 complete (decisions 2–4 and the fever question) | worse again; the 35-day treatment; low mood (on asking); suicidal thoughts unknown; depressive features on mental-state examination | follow-up MRI after 35 days of treatment (enhancement resolved); MRI: six new lesions incl. left temporal; CSF (unremarkable, no oligoclonal band details, date not recorded) | 5 `long-term-plan` |
| `outcome` | every objective before it and all five decisions | — | recorded diagnosis and outcome (relapsing–remitting MS, acute phase; nothing later); the report's three MRI figure groups | — |

No physiology is modelled (static clock). The interval MRI and the CSF are shown in the third-episode phase because
they predate it; the case does not record when the lumbar puncture was done, and every text that shows the CSF says so.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-first-story` Take the history of his dizziness | presenting complaint, duration, hearing/vision symptoms and limb symptoms asked |
| 2 | `obj-first-workup` Examine him and review the first tests | neurological examination and EDSS; MRI, routine tests and neurophysiology read (phase `first-visit`); decision 1 right |
| 3 | `obj-episode-two` Assess the new episode | new symptoms asked; EDSS examined; this MRI read; decisions 2 and 3 right |
| 4 | `obj-relapse-plan` Decide how to treat this episode | fever/infection asked; decision 4 right |
| 5 | `obj-third-episode` Review the course since the last episode | what has changed and his mood asked; mental state examined; this MRI, the post-treatment MRI and the CSF read; decision 5 right |
| 6 | `obj-outcome` Read the recorded diagnosis and outcome | outcome record read |

Titles name no finding or diagnosis; hints are Socratic questions that give no result the learner has not obtained
("what does it take — in symptoms and in the number of affected regions — to call something demyelinating disease?").
No objective requires an act that can become impossible (no phase leaf, no `whenIndicated`): the in-time acts are
scored by the rubric only. The interventions are required by no objective, so the critical acts are not forced.

### Decisions

- **1 `first-visit-plan`** (single; needs the presenting complaint and duration, the examination, EDSS and vital signs,
  and the MRI, routine tests and neurophysiology of phase `first-visit`). Key: `review-no-label` — no diagnosis or
  treatment yet; review with repeat brain and spinal MRI and safety-netting. Distractors: `ms-start-dmt` (an MRI-based
  diagnosis and early DMT), `ris-start-dmt` (radiologically isolated syndrome, treat to delay the first attack),
  `reassure-discharge` (no follow-up), `steroid-pulse-now` (treat as a first demyelinating event).
- **2 `episode-two-criteria`** (single; needs the new symptoms, EDSS 2 and both the first and this MRI). Key:
  `dis-dit-now` — probably MS now: periventricular + cord gives dissemination in space and a lesion new since the first
  scan gives it in time, unless the mimic work-up finds a better explanation. Distractors: `await-third-attack` (the
  report's own path: wait for another attack or more lesions, as the earlier criteria did), `wait-for-ocb` (CSF bands
  required), `biopsy-first-tumour` (ring enhancement = tumour or abscess, biopsy first), `nmosd-label`.
- **3 `mimic-workup`** (select all; needs the new symptoms and this MRI). Keys: `aqp4-mog-cba`, `csf-paired-ocb`,
  `eye-ear-assessment`. Distractors: `biopsy-before-tests`, `repeat-mri-only`.
- **4 `relapse-treatment`** (single; needs the new symptoms, EDSS 2 and this MRI). Key: `mp-oral-five-days` — if it
  affects his daily life, look for infection first, then methylprednisolone 500 mg orally once daily for 5 days (IV if
  needed). Distractors: `low-dose-prednisolone` (30 mg for 2 weeks and a taper), `no-steroid` (never treat relapses),
  `standby-steroids` (the right course plus a spare course for self-treatment at home).
- **5 `long-term-plan`** (select all; needs decision 2, his status and mood, the mental-state examination and the third
  phase's MRI, interval MRI and CSF). Keys: `dmt-matched`, `mood-suicide-screen`, `clinical-mri-follow-up`. Distractors:
  `steroids-per-relapse`, `low-mood-part-of-relapse`. The prompt calls MS the *working* diagnosis — no antibody result is
  recorded.

Every option has its own feedback, naming the 2024 McDonald revision (Lancet Neurol 2025), the 2017 criteria (Lancet
Neurol 2018), the 2010 revision (Ann Neurol 2011), IPND 2015, the International MOGAD Panel (2023), NICE NG220 (2022)
and quality standard QS108, ECTRIMS/EAN (Mult Scler 2018) or NICE CG91 (2009). Option ids name their content. **No length
cue:** in no single-best decision is the key the uniquely longest option in either language (characters, measured on
2026-11-12): decision 1 key 57 of 49–64 (zh-CN), 192 of 148–193 (en); decision 2 key 54 of 43–55, 187 of 150–187;
decision 4 key 51 of 38–55, 130 of 130–160.

### Rubric (11 deterministic items, total weight 25, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-history` | history | 2 | dizziness, duration, hearing/vision, limb symptoms and earlier episodes; at the returns the new symptoms, infection and the previous treatment |
| `rb-examination` | examination | 1 | vital signs, neurological examination and EDSS (first visit); EDSS (second); mental state (third) |
| `rb-records` | investigations | 1 | the three MRIs, the interval MRI, the first visit's blood tests and neurophysiology, the CSF (each in its phase) |
| `rb-first-plan` | diagnosis | 3 | decision 1 right first time **and** the follow-up plan given in phase `first-visit` **and** no discharge without follow-up |
| `rb-criteria` | diagnosis | 3 | decision 2 right first time |
| `rb-mimic-workup` | investigations | 2 | decision 3 right first time, AQP4/MOG antibodies ordered in phase `second-episode`, eye and hearing assessment requested, **no** biopsy referral |
| `rb-relapse-treatment` | management | 2 | decision 4 right first time, methylprednisolone given while indicated (after that phase's infection screen), **no** contraindicated dose, low-dose prednisolone or standby supply |
| `rb-dmt-in-time` | management | 3 | disease-modifying therapy planned in phase `second-episode` after the antibodies were ordered (`whenIndicated`) |
| `rb-long-term` | management | 2 | decision 5 right first time and the clinical/MRI monitoring plan given |
| `rb-no-premature-dmt` | safety | 3 | **critical** — no disease-modifying therapy while contraindicated (at the first visit, or before AQP4-IgG was ordered); scored once decision 1 is attempted or the drug is given |
| `rb-suicide-screen` | safety | 3 | **critical** — the suicidal-thoughts question asked (phase `third-episode` only) **and** the depression and suicide-risk assessment given in that phase |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: uncertainty at the first visit, the probable diagnosis and remaining tests at the second, steroid effects and long-term choices, his mood and a direct, sensitive question about suicidal thoughts at the third |

### How wrong choices score (measured with the reducer on 2026-11-12)

| path | deterministic score | critical items missed |
|---|---:|---|
| reference path (`solution`) | 25/25 (100 %) | none |
| start and do nothing | 0/22 | `rb-suicide-screen` |
| wrong first answer at all five decisions, then right | 13/25 (52 %) | none |
| wrong first answer at decision 1 or 2 only | 22/25 (88 %) | none |
| wrong first answer at decision 3, 4 or 5 only | 23/25 (92 %) | none |
| reference path plus disease-modifying therapy at the first visit | 22/25 (88 %) | `rb-no-premature-dmt` |
| disease-modifying therapy in episode 2 *before* the antibodies are sent (instead of after) | 19/25 (76 %) | `rb-no-premature-dmt` |
| disease-modifying therapy planned only at the third episode, or never | 22/25 (88 %) | none (`rb-dmt-in-time` lost) |
| methylprednisolone before the episode-2 infection screen (then the rest of the path) | 23/25 (92 %) | none (`rb-relapse-treatment` lost) |
| reference path plus low-dose prednisolone, a standby steroid supply or a biopsy referral | 23/25 (92 %) | none |
| reference path plus discharge without follow-up at the first visit | 22/25 (88 %) | none (`rb-first-plan` lost) |
| no follow-up plan at the first visit | 22/25 (88 %) | none |
| no eye/hearing referral | 23/25 (92 %) | none |
| no suicide question, no mood assessment, or the assessment only after the outcome record | 22/25 (88 %) | `rb-suicide-screen` |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. Every harmful act is also
listed as contraindicated in the debrief, with its own harm text. The avoided-harm item counts only once its harm was
possible (`scoredWhen`), so doing nothing earns 0.

### Critical items

`rb-no-premature-dmt` (the dangerous error: MS immunotherapy for a man who does not meet the criteria at the first
visit, or before NMOSD has been tested for — some MS immunotherapies appear to aggravate NMOSD, IPND 2015) and
`rb-suicide-screen` (the missed safety act: depressive features with no direct question about suicide and no
assessment). Both are acts; neither reads a final-phase record. The suicide question exists only in the third-episode
phase and the assessment counts only when given there, so neither can be credited in hindsight after the outcome record.

## Reference path (`solution`)

73 steps, static clock: start → (first visit) presenting complaint, duration, the character, pattern and triggers of the
dizziness, hearing/vision and limb symptoms, earlier episodes, a preceding infection, past health, medicines, allergies,
family history, smoking, his worry → vital signs, neurological examination, EDSS → **MRI** → routine tests →
neurophysiology report → **follow-up plan** → decision 1 → (second episode) the new symptoms, onset, which side, which eye,
which ear, **fever/infection**, impact, the dizziness now → EDSS → **MRI** → decision 2 → **AQP4-IgG/MOG-IgG** → CSF record
(not yet available) → **eye and hearing assessment** → decision 3 → **infection screen** → **methylprednisolone** →
**disease-modifying therapy plan** → **monitoring plan** → decision 4 → (third episode) what has changed, the last
treatment, **mood**, **suicidal thoughts**, preventive medicine, function, his worry → mental-state examination →
**mood assessment** → MRI, interval MRI, CSF → infection screen → methylprednisolone → decision 5 → (outcome) outcome
record → finish. `cases verify` passes: objectives 6/6, decisions 5/5, rubric 25/25, utterances 38/38. The demonstration
asks only age-appropriate questions.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 26-year-old man | `patient.age`, `sex` | `patient.age`, `sex`; title; triage note |
| dizziness and discomfort (头晕不适) for over one month | `chiefComplaint`; `history.dizziness` | `chiefComplaint` (lay words); `history.presenting`, `history.duration`; triage note; decision 1 prompt |
| no established neurological diagnosis given at the first visit | `history.prior-care` | treated as not recorded: `history.past-health` (unknown) |
| examination and neurophysiology unrevealing; EDSS 0 | `exam.initial-exam`; `history.initial-function` | `exam.neuro-exam`, `exam.edss-first`; `investigations.neurophysiology` (record) |
| BP 110/65 mmHg, temperature 36.9 °C | `exam.initial-exam` | `exam.vitals-first`; triage note; decision 1 prompt |
| brain MRI unrevealing; punctate cervical cord signal abnormality; no clear enhancement | `investigations.baseline` | `investigations.mri-brain-spine` result `first-visit` |
| routine laboratory tests unremarkable | `investigations.baseline` | `investigations.routine-bloods` result `first-visit` (no values) |
| about ten months later: weakness (乏力), blurred vision, reduced hearing; EDSS 2 | `investigations.serial` | `history.presenting-2`; `exam.neuro-exam-second`; decisions 2 and 4 |
| ring-enhancing left periventricular lesion | `investigations.serial` | `investigations.mri-brain-spine` result `second-episode` |
| enhancement resolved after 35 days of treatment (treatment not named) | `investigations.serial` | `investigations.mri-interval` (record, phase `third-episode`); `history.treatment-last`; `interventions.methylprednisolone` response |
| about nine months later: worsening with depressive features | `investigations.serial` | `history.presenting-3`, `history.mood-3`; `exam.mental-state-third` |
| six new lesions including the left temporal lobe (en: "left temporal white matter") | `investigations.serial` | `investigations.mri-brain-spine` result `third-episode` (both wordings in its note) |
| CSF described only as unremarkable, no oligoclonal band details | `investigations.serial` | `investigations.csf` (record; placeholder in `second-episode`, result in `third-episode`, date not recorded) |
| diagnosis of relapsing–remitting MS, acute phase, after the third episode; long-term treatment and outcome not given | `investigations.followup` | `investigations.outcome` (phase `outcome`) |
| missing: neurological localisation, oligoclonal bands, AQP4/MOG, long-term therapy | README "Fidelity limits"; `unknowns` | 22 unknown history items; `aqp4-mog`, `infection-screen`, `ct-head` (`available: false`); `examNotRecorded`; 8 `unknowns` |
| the article applied the 2005 criteria ("文中2005条款") | decision `management` option `old` | decision 2 feedback ("the report's own path"); To verify |

**Times.** Recorded: dizziness for over a month at the first visit; "about ten months later" (1.0.0 does not say from
what — the case reads it from the first visit and says only "about ten months later"); 35 days of treatment before the
enhancement had resolved; "about nine months later" (1.0.0 does not say whether from the second episode or from the end
of the treatment). Not recorded: when the lumbar puncture was done; any date of the long-term course. **Derived values:**
none — 1.0.0 records no number from which to derive one. EDSS 2 is shown as the recorded score only; its functional-system
sub-scores are not inferred.

**Guidance numbers used in teaching text** (no patient value is needed): dissemination in space ≥ 1 lesion in at least two
characteristic regions (five regions since the 2024 revision, the optic nerve added); dissemination in time by a new T2
or enhancing lesion on follow-up MRI against a baseline scan, or CSF-specific oligoclonal bands (2017), or the kappa free
light chain index (2024); methylprednisolone 0.5 g orally once daily for 5 days (NICE NG220, 2022), IV when oral steroids
fail, are not tolerated or admission is needed, within 14 days of onset, no lower doses and no standby supplies (NICE
QS108); the distractor's prednisolone 30 mg daily for 2 weeks is a teaching foil, not a recommendation.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to hold back a diagnosis at the first visit — and then to make one at the second?"
2. **Description.** "In two sentences per visit: what did you find, and what did you do?"
3. **Analysis.**
   - "What makes an episode a typical demyelinating attack? Was the dizziness one?"
   - "How many characteristic regions did the first MRI show? And the second? What did the new lesion add?"
   - "The report diagnosed MS only after the third episode. Which criteria were they using, and what changed in 2010,
     2017 and 2024?" (the record says only that the article applied the 2005 clauses — keep the group to that)
   - "Which features at the second episode were unusual for MS, and what did each one make you test for?"
   - "Why must AQP4-IgG be sent before an MS drug is started?"
   - "What did you check before the steroids, and why? What would you do differently if a single enhancing lesion made
     you think of lymphoma?"
   - "The enhancement was gone after 35 days. Was that the end of the disease?" (six new lesions came about nine months
     later)
   - "At the third visit he said he felt low. What did you ask next? What did you do with an 'I can't say'?"
4. **Summary.** "What will you do the next time a young adult brings a single small cord lesion — and the next time a
   second lesion appears?"

Do not let the group claim that earlier treatment would have prevented the third episode: a single case cannot show it.

### Common learner errors and how the case surfaces them

| error | where it shows |
|---|---|
| Labelling MS (or "RIS") and starting treatment at the first visit | decision 1 distractors `ms-start-dmt`, `ris-start-dmt`; `start-dmt` contraindicated in `first-visit` → critical `rb-no-premature-dmt` |
| Discharging a young adult with a cord lesion | decision 1 `reassure-discharge`; `discharge-no-follow-up` contraindicated → `rb-first-plan` lost |
| Waiting for a third attack (the report's path) | decision 2 `await-third-attack`; DMT only in the third episode → `rb-dmt-in-time` lost |
| Treating CSF bands as obligatory | decision 2 `wait-for-ocb` |
| Biopsy before the non-invasive work-up | decision 2 `biopsy-first-tumour`, decision 3 `biopsy-before-tests`; `biopsy-referral` contraindicated |
| Starting MS drugs before NMOSD is tested for | `start-dmt` contraindicated until `aqp4-mog` is ordered → critical item |
| Steroids without looking for infection, low-dose courses, standby supplies | decision 4 distractors; `methylprednisolone` contraindicated before that phase's infection screen; `prednisolone-low-dose`, `steroid-standby-supply` contraindicated → `rb-relapse-treatment` lost |
| Reading loss of enhancement as cure | decision 5 prompt and teaching point 4 |
| Overlooking the depressive features | decision 5 `low-mood-part-of-relapse`; no suicide question or assessment → critical `rb-suicide-screen` |

## Embodied mode

- **Where things are (`general-hospital`).** The patient sits in an outpatient consulting room (`setting: "outpatient"`)
  in every phase; the case does not record whether any episode was managed as an inpatient, so no phase moves him. The
  MRI (`mri`, `performedAt: "provider"`) and the CT (`ct`) take him to imaging; the routine tests, the antibodies and the
  infection screen are sampled at his side (`lab-hematology`, `lab-chemistry`, `lab-urinalysis`, `lab-serology`). The four
  record reviews (`neurophysiology`, `csf`, `mri-interval`, `outcome`) need only `records`: a records terminal or the
  notes at the bedside.
- **Interventions.** The medicines need only `medications` (delivered to the bedside; methylprednisolone is written as the
  oral NICE course, so no IV line is needed); the follow-up, eye and hearing, biopsy and mood steps are consults or plans
  that need no kit. The hospital has no audiometry, optical coherence tomography or evoked-potential equipment, so the eye
  and hearing assessment is a referral and the neurophysiology a record review (STANDARD §0.3).
- **Scope of practice.** The medicines are nursing-scope by kind; the mood assessment is marked `scope: "medical"`; the
  consults, plans and the disposition are medical.
- **He speaks throughout** (a conscious adult answers for himself; no companion). Examination manoeuvres the record does
  not cover answer with `examNotRecorded` ("No result is recorded in this case for this examination…").
- **Measured (offline demonstration, 2026-11-12).** `embodied-autopilot.test.ts -t "cmcr-1233223:"` passes in en and
  zh-CN: the case finishes in the general hospital with the clinical-mode score.

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; dizziness and feeling
unwell for over a month; the first examination and neurophysiology without clear abnormality, EDSS 0, BP 110/65 mmHg and
temperature 36.9 °C; the first MRI and the routine laboratory tests; the second episode's weakness, blurred vision,
reduced hearing, EDSS 2 and ring-enhancing left periventricular lesion; resolution of enhancement after 35 days of
unnamed treatment; the third episode's worsening with depressive features and six new lesions including the left temporal
lobe; the CSF statement; the diagnosis of relapsing–remitting MS in an acute phase; no long-term data.

**Adapted for teaching.** The outpatient setting in every phase (1.0.0's `setting`; where he was managed is not
recorded); the four phases and their staging — the MRI as an order the learner places at each visit (its results are the
recorded ones), the interval MRI and the CSF shown with the third episode (the CSF date is not recorded and every text
says so); the patient's dialogue (lay rewording of the recorded facts; "乏力" rendered "没力气 / I feel weak"); the staff;
the decisions, options, feedback and scoring; the ten interventions (each response says the case does not record whether
it was done, and simulates no effect); the unrecorded tests a learner would order (CT head, AQP4/MOG antibodies, infection
screen) as honest `available: false` results. **Labelled teaching devices** that add no clinical fact: his two voiced
worries (`concern-first`, `concern-3`, `persona.concerns`), his affect in the acting notes, and the staff names.

**Inconsistencies kept (1.0.0 is template output).** The left temporal lesion is "左颞叶" (left temporal lobe) in the
Chinese text and "left temporal white matter" in the English text: the case shows "left temporal lobe" and names both
readings in the MRI note. "乏力" can mean limb weakness or fatigue; the English 1.0.0 says "weakness": the case keeps
both open. The anchors of the two intervals are unclear (see Times).

**Privacy.** Pseudonym (unique across the collection, marked 化名 / pseudonym), relative time only, no hospital, place,
occupation or date. The three figure groups are approved in `scripts/cmcr-105-media-review.json` ("cropped intracranial
MRI panels … no identifying overlays, calendar dates or external faces"), are local-only and appear only with the outcome
record; their titles say they may span every episode.

**Survey and template findings applied.** No audit of this case exists in the survey; the template defects the critic
lists for all 105 are fixed here: authoring language in the patient's mouth ("原文没有提供…" / "The source case does not
provide…") replaced by lay unknowns; stock slots (routine vaccinations for a 26-year-old, "anything else about family
illnesses") replaced by questions written for this case; option ids that read as roles replaced by content ids; the key
was the longest option in every decision — now in none; the management key handed the act to a team ("neuroimmunology
review should … discuss long-term therapy") — the acts are now named (methylprednisolone 500 mg × 5 days after an
infection screen; disease-modifying therapy planned at the second episode once AQP4-IgG is back; a suicide-risk
assessment); zero interventions — now ten, four of them tempting wrong steps with harm texts; the only critical item was
a decision about "what current reassessment should emphasise" — now two acts; the triage note was an instruction to the
learner — now a clinical handover; one compound record held both later episodes — now staged per episode; one compound
unknown — now eight specific ones.

## Matcher notes

38 utterances (35 positive, 3 look-alike negatives); none is a canonical question or a keyword; every required item has
one. Phase twins: `presenting` → `presenting-2` → `presenting-3` (each "what's wrong" question answers for the current
visit), and `medicines` → `long-term-medicine` in the third episode. `cases verify` ranks hits across phases (only twins
are mapped), so cross-phase look-alikes are separated with `excludeKeywords`: the first visit's hearing/vision item
excludes "哪只 / which eye / which ear" and past-episode phrasings; the first visit's infection item excludes "最近 /
lately / 小便 / waterworks"; the medicines item excludes "上次 / last episode"; the weakness item excludes numbness.
English multi-word keywords that would collapse to one token are run together (`whatsthematter`, `whendiditstart`,
`howmanyweeks`, `allthetime`, `inthepast`, `betteronitsown`, `whatbringsyou`, `whatstroublingyou`, `whatshappening`,
`whendidthesestart`, `howhavethingsbeen`, `howlongwereyoutreated`, `wereyoutreated`, `madeyoucomein`, `sincewhen`,
`atwork`). No `alsoOk` is needed.

## References

1. 周福庆, 龚洪翰. 1例复发缓解型多发性硬化MRI连贯分析. 磁共振成像. 2011;2(4):314-316.
   doi:10.3969/j.issn.1674-8034.2011.04.015. Available from: https://rs.yiigle.com/cmaid/1233223
2. Montalban X, et al. Diagnosis of multiple sclerosis: 2024 revisions of the McDonald criteria. Lancet Neurol.
   2025;24(10):850-865.
3. Thompson AJ, et al. Diagnosis of multiple sclerosis: 2017 revisions of the McDonald criteria. Lancet Neurol.
   2018;17(2):162-173.
4. Polman CH, et al. Diagnostic criteria for multiple sclerosis: 2010 revisions to the McDonald criteria. Ann Neurol.
   2011;69(2):292-302.
5. National Institute for Health and Care Excellence. Multiple sclerosis in adults: management. NICE guideline NG220.
   London: NICE; 2022.
6. National Institute for Health and Care Excellence. Multiple sclerosis. Quality standard QS108, quality statement 5:
   managing relapses [Internet]. London: NICE [cited 2026 Oct 30]. Available from: https://www.nice.org.uk/guidance/qs108
7. Montalban X, Gold R, Thompson AJ, et al. ECTRIMS/EAN guideline on the pharmacological treatment of people with
   multiple sclerosis. Mult Scler. 2018;24(2):96-120.
8. Wingerchuk DM, et al. International consensus diagnostic criteria for neuromyelitis optica spectrum disorders.
   Neurology. 2015;85(2):177-189.
9. Banwell B, et al. Diagnosis of myelin oligodendrocyte glycoprotein antibody-associated disease: International MOGAD
   Panel proposed criteria. Lancet Neurol. 2023;22(3):268-282.
10. National Institute for Health and Care Excellence. Depression in adults with a chronic physical health problem:
    recognition and management. Clinical guideline CG91. London: NICE; 2009.

The article's DOI is the verified one in `scripts/cmcr-105-sources.json` (publisher check 2026-10-29). No other DOI is
given: none was resolved in this session. Citations 2–4 and 7–9 and the existence of NG220 and QS108 were confirmed by web
search during re-authoring (2026-11-12); CG91 is cited from the editor's knowledge and is listed below.

### To verify

**In the source article** (none of the patient facts has been checked against it yet):

1. The first visit: what kind of dizziness (vertigo or light-headedness), its pattern and triggers, any hearing, visual or
   limb symptoms, the components of the examination behind "no clear positive findings" and EDSS 0, and which
   neurophysiological tests were done (evoked potentials?).
2. The first MRI: sequences, whether contrast was given to the brain and the cord, the cord lesion's level and size, and
   whether the whole spine was imaged; the routine laboratory panel and its values.
3. The two intervals: is "about ten months later" counted from the first visit or from symptom onset, and "about nine
   months later" from the second episode or from the end of the 35-day treatment?
4. The second episode: onset and course; whether 乏力 was limb weakness (which side) or fatigue; which eye and which ear;
   fever or infection; the EDSS functional-system scores; the lesion's size, open or closed ring, mass effect and
   diffusion; whether the cord was re-imaged.
5. The 35-day treatment: drug(s), doses, route and clinical response.
6. The third episode: which symptoms worsened, the EDSS, the nature and severity of the depressive features and any
   suicidal thoughts; where the six new lesions lay ("左颞叶" vs "left temporal white matter") and whether any enhanced.
7. The CSF: when it was taken; cell count, protein, IgG index, oligoclonal bands (with serum), and whether AQP4/MOG
   antibodies, infection or other tests were done.
8. Which diagnostic criteria the report applied (1.0.0 implies the 2005 revision) and why the diagnosis waited for the
   third episode; whether any episode was managed as an inpatient.
9. Long-term treatment, further relapses, disability and follow-up; past, medication, allergy, family and social
   history.
10. What each of the three figure groups shows (episode, sequence), to give them descriptive titles.

**In the guidance** (not confirmed in this session, or confirmed only in outline):

11. The 2024 McDonald revision (Lancet Neurol 2025): its exact DIS/DIT wording, whether DIS in ≥ 4 regions removes the
    need for DIT (secondary summaries disagree), how optic-nerve involvement is shown (MRI, VEP, OCT), and its DOI
    (10.1016/S1474-4422(25)00270-4 appeared in a search summary but was not resolved).
12. ECTRIMS/EAN 2018: the exact wording and numbers of the early-treatment and MRI-monitoring recommendations (the
    reference-scan timing).
13. NICE: NG220's publication year (2022, from the editor's knowledge; the search confirmed the guideline, not its date),
    whether the IV methylprednisolone indications and "within 14 days" sit in NG220 itself or only in QS108, and QS108's
    publication year.
14. NICE CG91 (2009): the wording of its screening (two questions) and suicide-risk recommendations, and whether NG220
    cross-refers to it.
15. 中华医学会神经病学分会神经免疫学组. 多发性硬化诊断与治疗中国指南（2023版）. 中华神经科杂志. 2024 — confirmed to exist
    and its issuing body, but not its volume, pages or recommendations on relapse treatment and disease-modifying therapy;
    add it to the teaching points once checked.
16. Not cited because they could not be verified here: the 2023 updated consensus on the differential diagnosis of
    suspected MS (Lancet Neurol), the Optic Neuritis Treatment Trial (1992) on oral prednisone alone, the AAN 2018
    disease-modifying therapy guideline's exact recommendations, and the interferon-beta labelling on depression and
    suicidal ideation (relevant to decision 5 if confirmed).
17. The radiologist's general teaching that an incomplete (open) ring of enhancement favours demyelination — check against
    a neuroradiology reference.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- Title, summary, tags and triage note rewritten without the diagnosis; the triage note is now a clinical handover.
- Four staged phases from the recorded timeline; the MRI is ordered at each visit; the interval MRI and the CSF are
  shown with the third episode, the CSF's date marked as not recorded.
- History rebuilt for this patient (30 items, his own lay voice, 22 honest unknowns, two labelled worries); examination
  split into the recorded manoeuvres, with EDSS 2 and the depressive features as findings of their own phases.
- Five decisions at the real decision points (first-visit restraint, today's criteria at the second episode, the mimic
  work-up, relapse treatment, the long-term plan with mood), content option ids, no length cue, guideline-named feedback.
- Ten interventions, including the tempting wrong steps (DMT too early, steroids before an infection screen, low-dose
  and standby steroids, biopsy first, discharge without follow-up) with harm texts.
- Rubric of 12 with two critical acts (no premature MS immunotherapy; suicide question and assessment), measured scoring
  table; three staff; debrief with key reasoning, six dated teaching points contrasting the report's course with current
  guidance, eight unknowns and ten references.
- Extensions unified (`sourceDoi`, `doiVerifiedAt`, `sourceTextChecked: false`); the three approved figures kept, retitled
  and attached to the outcome record.

### 1.0.0 — 2026-10-28

Initial de-identified educational adaptation from the CMCR template.

## Validation

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-1233223/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1233223 --lang en                                              # objectives 6/6, decisions 5/5, utterances 38/38, rubric 25/25 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-1233223                    # depth floor, do-nothing 0, wrong-first 52 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1233223:"           # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1233223:"  # in-world demonstration, en + zh-CN
```

All five passed on 2026-11-12.

## 中文摘要

**病例概要。** 26岁男性，头晕不适一个多月。首诊查体和神经电生理未见明显异常（EDSS 0 分；血压 110/65 mmHg，体温 36.9 ℃），
常规化验无明显异常，颅脑 MRI 未见明显异常，仅颈髓点状异常信号、无明显强化。约 10 个月后出现乏力、视物模糊和听力下降
（EDSS 2 分），左侧侧脑室旁环形强化病灶，治疗 35 天后强化消失（药名和剂量未记录）。再约 9 个月后症状加重并有抑郁表现，
新增 6 个病灶（包括左颞叶）；脑脊液仅记为未见明显异常，没有寡克隆带结果。报告在第三次发作后诊断复发缓解型多发性硬化（急性期），
此后情况未记录。本版患者事实全部沿用 1.0.0 版提取的内容，尚未对照原文全文核对。

**学习目标。** 按 2017 年 McDonald 标准及其 2024 年修订读连续 MRI，判断空间和时间多发；认识到首诊既不能诊断也不该治疗，
安排随访；在归为多发性硬化前完成鉴别检查（细胞法 AQP4-IgG、MOG-IgG，配对寡克隆带的脑脊液，眼科和听力评估），AQP4 有结果前
不用多发性硬化的免疫治疗；排查感染后用甲泼尼龙 500 mg 口服 5 天治疗影响生活的复发（NICE NG220，2022）；确诊后尽早共同决定疾病
修正治疗并监测（ECTRIMS/EAN 2018）；出现抑郁表现时直接询问轻生念头并安排评估（NICE CG91，2009）。

**关键决策。** 决策 1：首诊暂不诊断、不治疗，随访复查 MRI；决策 2：第二次发作时已满足空间和时间多发，排除相似疾病后即可诊断
（报告当年等到第三次发作）；决策 3：AQP4/MOG 抗体、脑脊液和眼科听力评估；决策 4：先排查感染，再用足量甲泼尼龙，不用小剂量
疗程、不给备用激素；决策 5：疾病修正治疗、抑郁与自杀风险筛查、临床和 MRI 监测。关键项：不过早使用疾病修正治疗；第三次就诊时
直接询问轻生念头并安排评估。

**复盘要点。** 一个病灶只占一个部位，非特异症状不是典型发作；随访 MRI 上的新病灶就是时间多发，不必等第三次发作；不典型表现
（听力下降、环形强化）要先排除 NMOSD、MOGAD 等疾病，部分多发性硬化免疫治疗可能加重 NMOSD；强化消失只说明该病灶不再活动；
抑郁需要单独评估。单个病例不能证明更早治疗能否避免第三次发作。待核实：见上文 “To verify”（各次发作细节、两段间隔的起算点、
35 天治疗的药物、脑脊液时间与细节、左颞病灶的两种写法、报告所用诊断标准，以及多项指南原文）。本稿尚未经执业医师审核。
