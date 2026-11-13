# cmcr-859852 — Worsening recurrent cough with blood-streaked sputum · 74-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note, phase labels and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 董绍臣, 姜尧, 张向宁, 赵敏, 乔华. 双肺多发结节空洞影. 中华结核和呼吸杂志.
2014;37(2):152-153. Version 1.1.0 re-authors the case to the clinical content standard **from the facts that version
1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet been checked
against the full source article** (STANDARD §6). The patient (邹予宁 / Zou Yuning) is a pseudonym kept from 1.0.0; the
ward nurse (葛护士 / Nurse Ge), the respiratory attending (龚医生 / Dr Gong), the pathologist (蒲医生 / Dr Pu) and the
rheumatologist (盛医生 / Dr Sheng) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does
not record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-859852` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (a ward bed throughout) |
| specialty | respiratory medicine, rheumatology, infectious disease |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: five record phases spanning several admissions, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a respiratory physician and a rheumatologist review it before teaching use |
| phases | `admission` 入院评估 / Admission assessment → `first-course` 首轮抗感染治疗之后 / After the first anti-infective course → `biopsy` 第二次住院 / Second admission → `recurrence` 数年后复发 / Recurrence years later → `followup` 记录的结局 / Recorded outcome — all one-way, none learner-switchable |
| content | 25 history items (12 recorded facts, 1 labelled teaching device, 12 unknown; 10 required; 4 phase twins) · 2 exam findings (as recorded) · 13 investigations (3 record reviews; 7 with no recorded result) · 10 interventions (2 always contraindicated, 2 conditionally contraindicated, 1 neutral) · 6 objectives · 5 decisions (25 options) · 12 rubric items (11 deterministic, weight 28; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 6 key reasoning steps · 6 teaching points · 8 unknowns · 40 test utterances |

## Learning outcomes

After the case the learner can:

1. In a patient with rheumatoid arthritis, years of cough with blood-streaked sputum and multiple cavitating lung
   nodules, manage the lesions as infectious before any immunosuppression: airborne precautions, and sputum for
   acid-fast smear, mycobacterial culture and a nucleic-acid amplification test (ATS/IDSA/CDC 2017 TB diagnosis; WHO
   2019 TB infection prevention and control).
2. When sputum tests are negative and the illness relapses after a brief response to antibiotics, choose tissue
   diagnosis — a nodule biopsy, after a platelet count and clotting screen, sent for acid-fast and fungal stains and
   cultures — over escalating antibiotics, a diagnostic anti-TB trial or an empirical glucocorticoid.
3. Read a lung nodule with central necrosis ringed by palisading epithelioid cells, in a patient with high-titre
   rheumatoid factor and joint deformity, as a rheumatoid nodule — and name what must still be excluded before calling
   it: mycobacteria, fungi and vasculitis.
4. Plan treatment for rheumatoid lung nodules: a glucocorticoid only as a short bridge, tapered and stopped as fast as
   feasible, with a csDMARD started alongside (EULAR 2022 and its 2025 update); hepatitis B and latent TB screening
   before starting, Pneumocystis prophylaxis at high doses (EULAR 2022 infection screening and prophylaxis) and a
   fracture-risk assessment for long-term use (ACR 2022 glucocorticoid-induced osteoporosis).
5. Treat a recurrence after irregular immunotherapy as a possible new infection in an immunosuppressed host: re-sample
   before restarting the glucocorticoid, then restart a DMARD she can keep taking and address adherence.
6. Explain why a single report in which the antibiotics and a glucocorticoid were changed together at a recurrence
   cannot show which treatment worked.

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list. Outcome 6 carries 1.0.0's own teaching point (the causal limits of a
combined-treatment response) into the debrief, where it no longer depends on a hindsight decision.

## Clinical summary (spoilers)

**Presentation.** A 74-year-old woman is admitted with **ten years** of recurrent cough and **blood-streaked sputum**,
worse for the last **15 days**; it comes and goes and has lately been more noticeable. She has had no skin bleeding and
no blood in her urine. **Rheumatoid arthritis was diagnosed 15 years ago** and never consistently treated; she has never
had tuberculosis or diabetes; her full medication list is not recorded. On examination: **fine crackles over both lungs**
(小水泡音) and **ulnar deviation at both hands' metacarpophalangeal joints**. Nothing else is recorded: no vital signs,
weight, smoking, occupation or dust exposure, TB contact, allergies or family history.

**Admission records.** The first chest CT in her record: **multiple nodules of varying size in both lungs, with cavities
of varying size**. Blood: **haemoglobin 95 g/L, CRP 95 mg/L, ESR 90 mm/h, rheumatoid factor 2010 IU/mL**; the ANA panel
tested and **ANCA were negative**. No white cell count, platelets, clotting, renal or liver function, urinalysis or
anti-CCP is recorded.

**The recorded course.** **Repeated sputum examinations for tuberculosis were negative** (methods not recorded). After the
**first anti-infective treatment she improved briefly and worsened again a week later.** At her **second admission** a
**lung biopsy of a right lower-lobe nodule** showed **central acute inflammatory necrosis with a little fibrinoid
material, ringed by palisading epithelioid cells, with interstitial lymphocytic infiltration** (no special stains or
cultures recorded). **A glucocorticoid was then added and her imaging improved.** **Some years later, after
"immunotherapy" taken irregularly** (the drug is not recorded), **the illness recurred**; **12 days of anti-infective
treatment had little effect** (the English 1.0.0 text: imaging did not improve). **After the antibiotics were changed and
a glucocorticoid added, the blood-streaked sputum resolved and the cavity walls thinned; she was discharged on oral
prednisone.** Longer-term follow-up is not recorded.

**Diagnosis.** Pulmonary rheumatoid (necrobiotic) nodules with cavitation in long-standing, untreated seropositive
rheumatoid arthritis — a diagnosis of exclusion, with tuberculous, fungal and vasculitic mimics to be excluded on the
tissue (the report records no special stains or cultures).

**Today's answer.** Infection first (airborne precautions; sputum AFB smear, culture and a nucleic-acid amplification
test — ATS/IDSA/CDC 2017; WHO 2019); tissue when sputum is negative and the course is equivocal, with stains and cultures
and a clotting screen first; a glucocorticoid only after that, as a short bridge with a csDMARD (EULAR 2022 and its 2025
update; ACR 2021), after hepatitis B and latent-TB screening with Pneumocystis prophylaxis and bone protection where the
thresholds are met (EULAR 2022 infections; ACR 2022 GIOP); and at a recurrence in an immunosuppressed host, re-sampling
before stepping treatment up, with adherence addressed. The recorded course — a biopsy before the glucocorticoid — is
consistent with this on the decisive step; isolation, the screening, prophylaxis, maintenance DMARD and re-sampling at
the recurrence are not recorded.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the recorded one.
- **Five one-way phases** (none learner-switchable, the first included, so phase-bound acts cannot be made up later;
  records read in an earlier phase stay readable by phase):
  - `admission` — the history in her own words (recorded: the cough and blood-streaked sputum, ten years, worse for
    15 days, comes and goes, no other bleeding, RA for 15 years without consistent treatment, no TB or diabetes; the rest
    unknown), the examination (crackles, ulnar deviation), the **chest CT record**, the **blood count with CRP and ESR**,
    the **RF and autoantibodies**, decision 1 and a **committed first act**. A sputum order here returns "sent; results
    in the next part" (staging); the clotting screen, IGRA, hepatitis B serology, sputum culture, anti-CCP and renal
    panel answer that no result is recorded.
  - `first-course` — opens once the history, the admission findings and the first-steps objective are done
    (`enterWhen`: `obj-cough-story`, `obj-admission-findings`, `obj-first-steps`; the last needs decision 1 right and one
    committed act — the admission sputum order, isolation, antibiotics, a glucocorticoid, a pulse or an anti-TB trial).
    Her status (phase twin `status-relapse`: better at first, worse a week later) and the **repeated negative sputum
    results** (staged here; 1.0.0 gives no timing). Decision 2 and a committed act.
  - `biopsy` — opens once `obj-relapse-tissue` is done (her status, the sputum read, decision 2 right and a committed
    act: the biopsy request, an anti-TB trial, a glucocorticoid, a pulse or an antibiotic change): the **pathology
    report from her second admission**. Decisions 3 and 4; the screening, glucocorticoid, prophylaxis and rheumatology
    orders.
  - `recurrence` — opens once `obj-biopsy-plan` (the biopsy read and decisions 3 and 4) is done; its description tells
    that the glucocorticoid after the biopsy was followed by improved imaging. Her account (twins `status-recurrence`
    and `immunotherapy-adherence`), the **chest imaging record** (earlier improvement; no improvement after 12 days of
    anti-infectives), repeat sampling (no results recorded), decision 5.
  - `followup` — opens once decision 5 is right (and the earlier objectives done): the **reported course and outcome**
    record with the approved figure group `fig01`, and her status at discharge (twin `status-outcome`).
- No prompt, hint, order response or harm text states a later phase's result before its record opens. Two wrong
  options' feedback name what the recorded team did once the learner has committed (decision 1: antibiotics at this
  stage; decision 5: antibiotics changed with a glucocorticoid added), never a later result.

## Decisions and assessment

### Objectives (HUD task list)

| # | objective | completes when |
|---|---|---|
| 1 | `obj-cough-story` Take the story of her ten-year cough and blood-streaked sputum | presenting complaint, duration, blood amount, bleeding elsewhere, RA history, TB/diabetes, medicines asked |
| 2 | `obj-admission-findings` Examine her and read the admission records | lungs and hands examined; chest imaging, blood count/CRP/ESR, RF/autoantibodies read (phase `admission`) |
| 3 | `obj-first-steps` Decide what to exclude first, and act on it | `first-priority` right **and** one committed act (admission sputum order, isolation, antibiotics, glucocorticoid, pulse, anti-TB trial) |
| 4 | `obj-relapse-tissue` Reassess the relapse after a brief response | her status asked; sputum read (phase `first-course`); `tissue-next` right; one committed act (biopsy request, anti-TB trial, glucocorticoid, pulse, antibiotic change) |
| 5 | `obj-biopsy-plan` Interpret the pathology and plan treatment | pathology read (phase `biopsy`); `biopsy-reading` and `treatment-plan` right |
| 6 | `obj-recurrence-course` Manage the recurrence years later and review the outcome | recurrence and adherence asked; imaging read (phase `recurrence`); `recurrence-plan` right; outcome read |

Titles name tasks, not findings; hints are Socratic questions ("which treatable and transmissible cause of cavities must
be excluded — and how do you protect others on the ward until you know?") that contain no option text (lint). The
committed-act gates follow cmcr-1653411's reperfusion objective: the next part of the record opens only once the learner
has acted, and which act is the learner's choice, so the critical acts are not forced and can still be missed.

### Decisions

- **1 `first-priority`** (single; needs presentation, duration, RA and TB history, both examinations and the three
  admission records). Key: `exclude-infection-first` — airborne precautions and sputum for AFB smear, mycobacterial
  culture and a molecular test, no steroid before the results. Distractors: `prednisone-now` (RF 2010 and ulnar
  deviation → rheumatoid nodules, prednisone now), `anti-tb-now` (four drugs without samples), `antibiotics-then-review`
  (a bacterial lung abscess, antibiotics and a CT in a week, no TB work-up if better — the historical near-miss: the
  recorded team did give anti-infectives here), `cancer-pathway-first` (PET-CT and oncology before infection tests).
- **2 `tissue-next`** (single; needs decision 1, her status and the first-course sputum results). Key:
  `tissue-before-steroid` — platelets and clotting, then a nodule biopsy for histology, acid-fast and fungal stains and
  cultures; no steroid before the result (what the recorded team did, at her second admission). Distractors:
  `broaden-antibiotics`, `diagnostic-anti-tb` (the historical Chinese 诊断性抗结核治疗), `empirical-prednisone`,
  `discharge-rescan`.
- **3 `biopsy-reading`** (single; needs decision 2 and the pathology report). Key: `rheumatoid-nodule` — rheumatoid
  (necrobiotic) nodules, provided the tissue's acid-fast and fungal stains and cultures are negative and there is no
  vasculitis. Distractors: `tuberculous-granuloma`, `anca-negative-gpa`, `caplan-syndrome` (dust exposure not
  recorded), `necrotic-metastases`.
- **4 `treatment-plan`** (select all; needs decision 3). Keys: `glucocorticoid-bridge`, `csdmard-rheumatology`,
  `screen-and-protect`. Distractors: `resect-nodules`, `long-term-antibiotics`.
- **5 `recurrence-plan`** (single; needs decision 4, the recurrence and adherence answers and the recurrence imaging).
  Key: `resample-then-restart` — re-send sputum for mycobacteria and fungi (bronchoscopy if unhelpful), then restart
  the glucocorticoid with a DMARD she can keep taking. Distractors: `escalate-anti-infectives`, `pulse-no-tests`,
  `stop-immunosuppression`, `change-antibiotics-add-steroid` (the report's own choice — "close, but not best": whether
  the team re-sampled is not recorded).

Every option has its own feedback (2–4 sentences) naming ATS/IDSA/CDC 2017, WHO 2019, EULAR 2022 (RA or infections),
the EULAR 2025 update, ACR 2021 or ACR 2022 where one applies, and the reason; two distractors in decision 3 (Caplan
syndrome, metastases) argue from the case's own findings because no guideline addresses them. Option ids name their
content. **No length cue:** the key is the uniquely longest option only in decision 3, in both languages (measured
2026-11-13: decision 1 key 48 of 39–57 characters in zh-CN and 156 of 133–160 in en; decision 2 key 44 of 38–45 and
154 of 133–155; decision 5 key 46 of 31–46 and 135 of 115–142). The 1.0.0 decisions (ids `supported` /
`alternative-N`, the key the longest, a hindsight "how should the response be interpreted?" decision as the only
critical item) are all replaced.

### Rubric (11 deterministic items, total weight 28, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-bleeding-story` | history | 2 | presenting complaint, duration, blood amount, bleeding elsewhere asked |
| `rb-background` | history | 1 | RA history, TB/diabetes, medicines and TB contact asked (contact unknown — asking is the competency) |
| `rb-examination` | examination | 1 | lungs auscultated, hands examined |
| `rb-admission-records` | investigations | 1 | chest imaging, blood count/CRP/ESR, RF/autoantibodies read in phase `admission` |
| `rb-first-priority` | diagnosis | 3 | `first-priority` right first time |
| `rb-tb-workup` | safety | 4 | **critical** — sputum for mycobacteria **ordered in phase `admission`** and airborne precautions given **while indicated** (before the first-course sputum result is read) |
| `rb-tissue` | management | 3 | `tissue-next` right first time, biopsy requested while indicated (after the sputum result, clotting ordered first) and no diagnostic anti-TB trial |
| `rb-biopsy-reading` | diagnosis | 3 | `biopsy-reading` right first time |
| `rb-treatment-plan` | management | 3 | `treatment-plan` right first time; glucocorticoid given while indicated and not contraindicated; IGRA and HBV serology ordered; companion prophylaxis; rheumatology/DMARD |
| `rb-no-unsafe-steroid` | safety | 4 | **critical** — no glucocorticoid given while contraindicated (`valid: false`: before the first-course sputum results and the biopsy are read, or at the recurrence before fresh sputum is sent) and no pulse; scored once decision 1 is attempted or either is given |
| `rb-recurrence` | management | 3 | `recurrence-plan` right first time, sputum re-sent in phase `recurrence`, discharge plan made |
| `rb-communication` | communication | (judged) | Calgary–Cambridge, written for the case: infection first and why isolation, why no steroid yet, biopsy purpose, risks and consent, the result and what remains uncertain, taper and adherence without blame, the lung-cancer worry answered honestly |

### How wrong choices score (measured with the reducer on 2026-11-13)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 28/28 (100 %) | none | passed |
| start and do nothing | 0/24 | `rb-tb-workup` | passed (nothing given) |
| wrong first answer at all five decisions, then right | 13/28 (46 %) | none | passed |
| wrong first answer at any one decision only | 25/28 (89 %) | none | passed |
| reference path without airborne precautions | 24/28 (86 %) | `rb-tb-workup` | passed |
| sputum not sent on admission (antibiotics as the first act), sent in the next phase | 24/28 (86 %) | `rb-tb-workup` | passed |
| prednisone on admission, before the sputum results | 24/28 (86 %) | `rb-no-unsafe-steroid` | **failed** (`glucocorticoid`) |
| prednisone after the negative sputum, before the biopsy | 24/28 (86 %) | `rb-no-unsafe-steroid` | **failed** (`glucocorticoid`) |
| glucocorticoid at the recurrence before fresh sputum is sent | 24/28 (86 %) | `rb-no-unsafe-steroid` | **failed** (`glucocorticoid`) |
| no re-sampling at the recurrence (glucocorticoid still given) | 21/28 (75 %) | `rb-no-unsafe-steroid` | **failed** (`glucocorticoid`) |
| pulse methylprednisolone added at the recurrence | 24/28 (86 %) | `rb-no-unsafe-steroid` | **failed** (`pulse-methylprednisolone`) |
| diagnostic anti-TB trial added after the relapse | 25/28 (89 %) | none (`rb-tissue` lost) | passed (contraindicated step shown in the debrief) |
| biopsy requested before the clotting screen | 25/28 (89 %) | none (`rb-tissue` lost) | passed (contraindicated step shown) |
| no IGRA / hepatitis B screening and no companion prophylaxis | 25/28 (89 %) | none (`rb-treatment-plan` lost) | passed |
| no glucocorticoid at all | 25/28 (89 %) | none (`rb-treatment-plan` lost) | passed |
| no discharge plan | 25/28 (89 %) | none (`rb-recurrence` lost) | passed |
| TB-contact question not asked | 27/28 (96 %) | none (`rb-background` lost) | passed |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item. The avoided-harm item counts
only once the harm was possible (`scoredWhen`), so doing nothing earns 0 (the per-case tool and the collection contract
check both, at once and with every reference act done late). **Timing.** `rb-tb-workup` reads an order placed in phase
`admission` (which cannot be selected again once left) and isolation given inside its window (`indicatedWhen`: before
the first-course sputum result is read), so neither half can be earned in hindsight; the biopsy request and the
glucocorticoid are credited only inside their own windows (`whenIndicated`). **Known limits:** `rb-recurrence`'s
re-sampling and discharge plan could be added after the outcome record by switching back to phase `recurrence` (that
phase stays selectable); the item is not critical, and the glucocorticoid's contraindication still judges the order of
the acts at the moment of giving. Debrief the sequence from the transcript.

### Critical items

`rb-tb-workup` (the missed protective and diagnostic act: sputum for mycobacteria on admission with isolation while TB
is possible) and `rb-no-unsafe-steroid` (the dangerous error: a glucocorticoid before infection is excluded and tissue
obtained, or before re-sampling at the recurrence, or a pulse). Both are acts; neither reads a final-phase record.

**Safety outcome.** `glucocorticoid` (risk high) and `pulse-methylprednisolone` (risk high) are `critical: true`: a
glucocorticoid given while contraindicated — before the sputum results and the histology, or at the recurrence before
fresh sputum — and a pulse at any point can let undetected tuberculosis or a fungal infection disseminate in a
74-year-old with cavitating lungs, so either fails the assessment's safety outcome (`safety.passed: false`) whatever the
score. No high-risk intervention is `critical: false`. The diagnostic anti-TB trial (always contraindicated) and a biopsy
request before the clotting screen are moderate-risk misjudgements: shown in the debrief, scored through `rb-tissue`,
not safety failures.

## Reference path (`solution`)

76 steps, static clock: start → the presenting history (presenting complaint, duration, pattern, blood amount, bleeding
elsewhere), the screening questions (fevers and sweats, weight, breathlessness, chest pain, joints), RA history, TB and
diabetes, TB contact, medicines, allergies, smoking, dust exposure, operations, family, daily life, her worry →
**auscultate the lungs**, **examine the hands** → chest imaging, blood count/CRP/ESR, RF/autoantibodies (`admission`) →
**airborne precautions** → **sputum for mycobacteria** (result in the next phase), sputum culture, renal panel and
urinalysis, anti-CCP (no results recorded) → empirical antibacterial treatment → `first-priority` → (phase
`first-course`) her status → **sputum results** (negative) → **clotting screen** (no result recorded) → **biopsy
request** → `tissue-next` → (phase `biopsy`) **pathology report** → `biopsy-reading` → **IGRA and hepatitis B
serology** (no results recorded) → **glucocorticoid** → **companion prophylaxis** → **rheumatology / csDMARD** →
`treatment-plan` → (phase `recurrence`) her account and adherence → **chest imaging** → **sputum re-sent**, sputum
culture, bronchoscopy request (no results recorded) → **glucocorticoid** (after re-sampling) → **discharge plan** →
`recurrence-plan` → (phase `followup`) her status → outcome record → finish. `cases verify` passes: objectives 6/6,
decisions 5/5, rubric 28/28, utterances 40/40. The acts come before each decision because answering the decision that
completes an objective opens the next phase at once.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 74-year-old woman | `patient.age`, `sex` | `patient.age`, `sex`; title |
| cough and blood-streaked sputum (反复咳嗽、痰中带血) | `chiefComplaint`; `history.presentation` | `chiefComplaint` (lay words); `history.presenting` (phase `admission`); `blood-amount` (streaks; amount not recorded) |
| ten years, worse over 15 days | `history.onset` | `history.duration`; `triageNote`; phase description; decision 1 prompt |
| comes and goes, recently more noticeable (时好时坏，最近比以前明显) | `history.progression` | `history.pattern` |
| no skin bleeding, no haematuria | `history.associated` | `history.bleeding-elsewhere` |
| blood-streaked sputum recurring | `history.redflags` | folded into `presenting` and `pattern` |
| RA diagnosed 15 years ago, not consistently treated; no TB, no diabetes | `history.pmh` | `history.rheumatoid`, `history.tb-diabetes` |
| no systematic antirheumatic treatment; full medication list not recorded | `history.medications` | `history.medications` (the gap in lay words) |
| fine crackles over both lungs (小水泡音) | `exam.exam-1` | `exam.chest-auscultation` (phase `admission`) |
| ulnar deviation at both hands' MCP joints | `exam.exam-2` | `exam.hands` (phases `admission`–`biopsy`) |
| first chest CT: multiple nodules of varying size in both lungs, with cavities of varying size | `investigations.ct` | `investigations.chest-imaging` result `admission` (record review) |
| Hb 95 g/L; CRP 95 mg/L; ESR 90 mm/1 h | `investigations.labs` | `investigations.fbc-inflammation` (`values`; the ESR unit written mm/h in both languages — the same unit as 1.0.0's “mm/1 h”) |
| RF 2010 IU/ml; listed ANA panel and ANCA negative | `investigations.labs` | `investigations.rheum-serology` (`values`; IU/mL) |
| repeated sputum tests for TB negative | `investigations.infection` | `investigations.sputum-tb` result `first-course` (staged after the first treatment; timing not recorded) |
| right lower-lobe nodule biopsy, second admission: central acute inflammatory necrosis, a little fibrinoid material, palisading epithelioid cells, interstitial lymphocytic infiltration | `investigations.biopsy` | `investigations.lung-biopsy` result `biopsy` (record review); decision 3 prompt |
| first anti-infective treatment: brief improvement, worse a week later | `investigations.outcome` | `history.status-relapse` (phase twin); phase `first-course` description; outcome record |
| glucocorticoid after the biopsy; imaging improved | `investigations.outcome` | phase `recurrence` description; `chest-imaging` result `recurrence` ("earlier"); outcome record |
| years later, irregular immunotherapy, recurrence | `investigations.outcome` | `history.status-recurrence`, `history.immunotherapy-adherence` (phase `recurrence`); decision 5 prompt |
| 12 days of anti-infectives: effect poor (zh) / failed to improve imaging (en) | `investigations.outcome` | `chest-imaging` result `recurrence` (both readings, noted); `status-recurrence`; decision 5 prompt |
| antibiotics changed and a glucocorticoid added: bloody sputum resolved, cavity walls thinner; discharged on oral prednisone; long-term follow-up absent | `investigations.outcome` | `chest-imaging` result `followup`; `history.status-outcome`; outcome record |
| smoking, complete medication exposure, fungal studies, long-term follow-up incompletely documented | `debrief.unknowns`, `unknowns` | 12 unknown history items; 7 investigations without results; `examNotRecorded`; 8 `unknowns` |

**One reading, kept visible.** That she had blood-streaked sputum at the recurrence is not stated in 1.0.0 in so many
words; it follows from "血痰消失" (the bloody sputum resolved) after the treatment of the recurrence, and
`status-recurrence` says it in her words — its `source` names the inference.

**Times.** Recorded: RA 15 years before the presentation; symptoms for ten years, worse for 15 days; worsening a week
after the first anti-infective treatment; the biopsy at the second admission; "years later" for the recurrence; 12 days
of anti-infectives at the recurrence. Not recorded: the dates (or relative timing) of the CT, blood tests, serology and
sputum tests; the interval between the first and second admissions; the number of years before the recurrence; her age
at the later admissions. **Derived values:** none — 1.0.0 records no weight, height, renal function or other number
from which to derive one.

**Guidance numbers used in teaching text** (no patient value is needed): sputum AFB smears (usually three), mycobacterial
culture and a NAAT on the first specimen (ATS/IDSA/CDC 2017); Pneumocystis prophylaxis considered above 15–30 mg
prednisolone equivalent a day for more than 2–4 weeks (EULAR 2022 infections, wording from secondary summaries — see To
verify); fracture-risk assessment for ≥ 2.5 mg a day beyond 3 months, treatment at medium or higher risk (ACR 2022);
methylprednisolone pulses 500–1000 mg IV daily for 3 days (named as the tempting wrong step, not a recommendation).
No glucocorticoid dose is given for her: no guideline sets one for rheumatoid lung nodules, and the report's doses are
not recorded.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions.** "How did it feel to hold a long-standing rheumatoid arthritis and a CT full of cavities, and be asked
   what to do first?"
2. **Description.** "In two sentences: what did you know on admission, and what did you do before anything else?"
3. **Analysis.**
   - "Which causes of cavitating nodules are treatable and transmissible? What did you do about the second word?"
   - "RF was 2010 IU/mL and her hands were deformed. What does that tell you — and what can it not tell you about the
     cavities?"
   - "The ANCA was negative. How far does that take you away from vasculitis?"
   - "She improved for a few days on antibiotics, then got worse. What does that prove?" (nothing about bacteria —
     do not let the group read the brief response as a diagnosis)
   - "Sputum was repeatedly negative for TB. What does that exclude, and what not?"
   - "What had to be checked before the biopsy, and why in her case?" (no platelet count or clotting is recorded)
   - "The biopsy shows necrosis ringed by palisading epithelioid cells. Which three or four conditions can do that,
     and what would you ask the pathologist to add?"
   - "What did you screen for and prevent before long-term prednisone?"
   - "Years later she relapsed after taking her treatment on and off. Flare or new infection — how do you tell?"
   - "The team changed the antibiotics and added a glucocorticoid at the same time, and she got better. Which worked?"
   - "How did you explain the isolation, the biopsy and the steroid plan to her — and her fear of lung cancer?"
4. **Summary.** "What will you do the next time cavitating nodules turn up in a patient with a rheumatic disease?"

Do not let the group infer her age at the later admissions, the years between them, or which drug the "immunotherapy"
was — none is recorded.

### Common learner errors and how the case surfaces them

| error | how the case surfaces it | where it scores |
|---|---|---|
| Steroids for "obvious" rheumatoid nodules on admission | `prednisone-now` feedback; `glucocorticoid` contraindicated (critical) | `rb-first-priority`, `rb-no-unsafe-steroid`, safety outcome |
| Treating as a bacterial abscess and skipping TB tests | `antibiotics-then-review` feedback | `rb-first-priority`, `rb-tb-workup` |
| Forgetting isolation while TB is possible | — (no decision gives it away) | `rb-tb-workup` (critical) |
| Anti-TB treatment without samples, or as a diagnostic trial | `anti-tb-now`, `diagnostic-anti-tb` feedback; `anti-tb-trial` contraindicated | `rb-first-priority`, `rb-tissue` |
| Reading the brief response as proof of bacterial infection | `broaden-antibiotics` feedback | `rb-tissue` |
| "Antibiotics failed, so it is inflammation" | `empirical-prednisone` feedback; `glucocorticoid` contraindicated | `rb-tissue`, `rb-no-unsafe-steroid` |
| Biopsy without a clotting screen | `biopsy-referral` contraindicated until clotting is ordered; key text names it | `rb-tissue` |
| Calling palisading necrosis TB, GPA or metastases; Caplan without an exposure history | decision 3 feedback | `rb-biopsy-reading` |
| Accepting rheumatoid nodules without stains and cultures | decision 3 key text and feedback; pathologist's brief | `rb-biopsy-reading` |
| Steroids without a DMARD, screening or prophylaxis | decision 4 keys and feedback | `rb-treatment-plan` |
| Pulse steroids for a "flare", or steroids at the recurrence before re-sampling | `pulse-no-tests`, `change-antibiotics-add-steroid` feedback; both interventions critical when contraindicated | `rb-recurrence`, `rb-no-unsafe-steroid`, safety outcome |
| Crediting one drug for the improvement | key reasoning 6, teaching point 6, outcome 6 | debrief |
| Inventing vital signs, platelets, doses or the "immunotherapy" drug | unknown history items, `examNotRecorded`, `available: false` results, the staff briefs | — |

### Teaching points for the debrief

The six `debrief.teachingPoints`: (1) exclude TB before treating inflammation — sputum tests and isolation from day one
(ATS/IDSA/CDC 2017; WHO 2019; WS 288—2017), then and now; (2) tissue when sputum is negative and the course equivocal,
with stains, cultures and a clotting screen (ATS/IDSA/CDC 2017) — the recorded team's decisive step; (3) a rheumatoid
nodule is a diagnosis of exclusion — this report records no special stains or cultures; (4) glucocorticoid as a bridge,
a DMARD as the road (EULAR 2022 and its 2025 update; ACR 2021 on methotrexate in lung disease and with subcutaneous
nodules), then and now;
(5) screen and protect before immunosuppression (EULAR 2022 infections; ACR 2022 GIOP); (6) at a recurrence sample
first and tackle adherence — and two treatments changed at once credit neither.

## Embodied mode

- **Where things are (`general-hospital`).** The patient lies in a ward bed (`setting: "inpatient"`) in every phase; the
  phases are admissions and stages of her course, not places, so no phase carries a `location` and no intervention a
  `destination`. The three record reviews (`chest-imaging`, `lung-biopsy`, `outcome`) need only `records`: the nurses'
  station terminal or the notes at the bedside. The blood tests and sputum samples are taken at the patient and read at
  a records terminal (`lab-hematology`, `lab-chemistry`, `lab-serology`, `lab-microbiology`, `lab-urinalysis`); the
  bronchoscopy request needs the endoscopy suite (`endoscopy`, `performedAt: "provider"`, risk moderate) and returns
  "no result recorded". The biopsy itself is not performed in the world: the request is a consult (`biopsy-referral`),
  and its pathology is the record of the next phase.
- **Staff.** 葛护士 / Nurse Ge gives the admission handover (ISBAR, from the triage facts), knows where the isolation
  room, sputum pots, masks and respirators are, and never gives a number; 龚医生 / Dr Gong precepts; 蒲医生 / Dr Pu
  interprets only the pathology report; 盛医生 / Dr Sheng interprets the serology and pathology and discusses DMARDs,
  screening and adherence.
- **Kit.** Medicines are delivered capabilities (`medications`); isolation, the biopsy request, the rheumatology
  referral and the discharge plan need no device (at the patient). The pulse is the only IV step and is never part of
  the reference path; the case has no IV-access procedure, so `extensions.embodied` is not needed.
- **Scope of practice.** Medicines are nursing-scope by kind; isolation (`other`), the biopsy request and rheumatology
  referral (`consult`) and the discharge plan (`disposition`) are medical acts.
- **She can speak throughout** (a conscious adult answers for herself; no companion). Two examination findings are
  recorded (lungs on admission; hands in the first three phases); every other manoeuvre answers with `examNotRecorded`
  ("No finding is recorded for this examination in this case; do not take it as normal").
- **Measured (offline demonstration, 2026-11-13).** `embodied-autopilot.test.ts -t "cmcr-859852:"` passes (en and
  zh-CN): every objective done, in-world score equal to the clinical score, no "cannot do this".

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; ten years of
recurrent cough with blood-streaked sputum, worse for 15 days, coming and going; no skin bleeding or haematuria; RA for
15 years without consistent treatment; no TB or diabetes; no systematic antirheumatic treatment, the full medication list
not recorded; bilateral fine crackles; ulnar deviation at both MCP joints; the first chest CT; Hb, RF, CRP, ESR, the ANA
panel and ANCA; repeated negative sputum tests for TB; the right lower-lobe biopsy at the second admission; the brief
response to the first anti-infective treatment and the relapse a week later; the glucocorticoid after the biopsy and the
improved imaging; the recurrence years later after irregular immunotherapy; 12 days of anti-infectives with little
effect; the antibiotic change with an added glucocorticoid, the resolved bloody sputum, thinner cavity walls and
discharge on oral prednisone; no long-term follow-up.

**Adapted for teaching.** The five phases and their staging — the sputum results shown after the first treatment, the
pathology at the second admission, the recurrence imaging with its "earlier" line (none of these times is recorded
beyond 1.0.0's sequence); the patient's dialogue (lay rewording of the recorded facts); the staff; the five decisions,
their options and feedback; the ten interventions (their responses say the case does not record whether they were done,
except the anti-infective course and the biopsy, which the record holds); the rubric; the unrecorded tests a learner
would order (clotting, IGRA, hepatitis B serology, sputum culture, bronchoscopy, anti-CCP, renal panel) as honest
`available: false` records. **Labelled teaching device:** her voiced worry ("Is it lung cancer?",
`persona.concerns` and the `concerns` item) adds no clinical fact; 1.0.0 records no concerns. Unknown history items
answer with the lay unknown ("这个我说不上来，医生。" / "I'm not sure, doctor."); for a conscious adult asked whether she
smokes this is an artefact of the record, not a persona trait — say so if learners remark on it.

**Contradictions and open readings kept.** (1) The 12-day anti-infective course at the recurrence: the Chinese 1.0.0 text
says "效果不佳" (little effect), the English says imaging did not improve; the case gives both, labelled, in the recurrence
imaging record and the outcome note. (2) **The admission sequence.** 1.0.0 frames the encounter at 74 (ten years of
symptoms, worse for 15 days, with the "initial" CT) as the start of the course, followed by the first anti-infective
course, the biopsy at the "second admission" and a recurrence "years later"; a case report of this kind may instead give
the age and the chief complaint of the latest admission, with the earlier admissions in the history. The case follows
1.0.0's framing, never states her age at the later admissions or the intervals, and lists the point under To verify.
(3) "免疫治疗 / immunotherapy" is kept as recorded (no drug is named); the case never calls it a DMARD or a biologic.
The 1.0.0 README's statements that "Images and PDFs await privacy review and are not embedded", that "safety weighs 4
and is critical" (a hindsight appraisal decision) and that "each source case was read and checked" are not carried over.

**Unknowns kept honest.** Vital signs, weight; white cells, platelets, clotting, liver and renal function, urinalysis,
anti-CCP, complement; sputum methods, NTM and fungal studies, bronchoscopy; biopsy technique, stains and cultures; drug
names, doses and durations, the "immunotherapy" drug, the discharge prednisone dose; the intervals and her age at each
admission; smoking, occupation and dust exposure, TB contacts, allergies, family history; long-term outcome.
Record-facing texts say "No result is recorded for this test" or "This case does not record whether this was done; it
does not simulate its effect" — never that the article lacks something.

**Figures and privacy.** `fig01` is **approved** in `scripts/cmcr-105-media-review.json` ("Original clinical imaging,
specimen or histology inspected; no identifying overlay visible", sha256 `cdf7f16e…`) and is attached only to the
outcome record in phase `followup`, titled "Report figure group 1 (includes the later course; for the review)" — what it
shows is not described in 1.0.0, so the case teaches from the written reports and no outcome depends on reading the
image. The pseudonym 邹予宁 / Zou Yuning is kept from 1.0.0; no hospital, date, initials, occupation or place appears.

**Survey findings applied.** No case audit or critic note in `survey/survey.json` covers this case. The governance
finding that named it — 1.0.0's review notes and `authorChecks.individuallyRead` claimed every source case "was read and
checked" while its status was `unreviewed`, and `mediaAwaitingPrivacyReview: true` contradicted the approved `fig01` — is
fixed: the review notes now use the STANDARD §6.6 wording, `authorChecks` is removed and the README states the figure's
approval. The code finding on the split specialty filter (`respiratory`, this case among six) was fixed by the framework
migration (`respiratory-medicine`); `infectious-disease` is added because a third of the teaching is the infection
work-up. The template defects (SI-01–SI-25: generic slots, meta answers "The source notes do not provide that
information", `supported` / `alternative-N` ids, the key the longest option, a hindsight decision as the only critical
item, no interventions, record-style examination labels "Review presentation examination 1") are all replaced.

**Extensions.** `collection`, `sourceArticleId`, `sourceUrl` and `historicalReview` kept; `sourceDoi` and
`doiVerifiedAt` (2026-10-29, the source map's `publisherCheckedAt`) added for the verified DOI; `sourceTextChecked:
false`; the unverifiable `authorChecks` booleans and `sourceTextSha256` removed until the source pass (STANDARD §6.6).

## Matcher notes

- **Phase twins.** `status-relapse` (phases `first-course`, `biopsy`) supersedes `presenting` and `pattern`;
  `status-recurrence` (phase `recurrence`) supersedes `status-relapse` (and so, transitively, the admission items);
  `immunotherapy-adherence` (phase `recurrence`) supersedes `medications`, so "what medicines are you on?" at the
  recurrence gets the irregular-immunotherapy answer; `status-outcome` (phase `followup`) supersedes
  `status-recurrence`. Items true only on admission (`duration`, `pattern`, `blood-amount`, `bleeding-elsewhere`,
  `rheumatoid`, `tb-diabetes`, `medications`) are limited to the first three phases or to `admission`: "ten years" and
  "15 years ago" are not true years later.
- **Shared words separated with `excludeKeywords`:** `presenting` vs past illnesses, family and years; `duration` vs
  joints, arthritis, medicines and "long-term condition" (the bare "how long" matched "a long-term condition" at 1.00
  before the exclusion); `blood-amount` vs urine and skin; `bleeding-elsewhere` vs phlegm and cough; `rheumatoid` vs
  family, TB, diabetes, medicines and current joint symptoms; `tb-diabetes` vs contacts (家里, 邻居, "been around",
  "near anyone"); `tb-contact` vs "have you ever had"; `family` vs TB, contacts and "does your family know / is your
  family visiting"; `joints-now` vs diagnosis and medicines; `breathless` vs pain; `medications` vs allergies;
  `glucocorticoid` vs pulse (冲击); `empirical-antibacterial` vs change, switch, escalate and anti-TB.
- **English keywords** avoid one-token wildcards: run-together forms (`broughtyouin`, `comeandgo`, `howmuchblood`,
  `offyourfood`, `didithelp`, `howmanyyears`, `whendiditstart`, `howhaveyoubeen`, `liveswithyou`, `nearanyone`,
  `whohadtb`) after `cases validate --strict` flagged five phrases that reduced to one token.
- **Corpus.** 40 test utterances (27 zh-CN, 13 en), written as learners speak; every required item and every phase twin
  is covered. The first run found 12 genuine gaps — lay words such as 肺痨, 青一块紫一块, 上气不接下气, 一身汗, 煤窑/石场,
  "因为啥住进来" — and the keywords were extended with those paraphrases, not with the utterances. Three look-alike
  negatives (`expect: []`): "您家里人知道您住院了吗？" (family wording; `status-recurrence` scores 0.40), "您是坐车来的还是走来的？"
  and "Is any of your family coming in to visit?" (0.50, under the 0.55 threshold). `cases verify` reports 40/40.
  `cases verify` ranks all items regardless of phase, so "您这回是因为啥住进来的？" also scores `status-recurrence` (0.75)
  behind `presenting` (1.00); in play the recurrence item is not available on admission.

## References

1. 董绍臣, 姜尧, 张向宁, 赵敏, 乔华. 双肺多发结节空洞影. 中华结核和呼吸杂志. 2014;37(2):152-153.
   doi:10.3760/cma.j.issn.1001-0939.2014.02.028. Available from: https://rs.yiigle.com/cmaid/859852
2. Lewinsohn DM, Leonard MK, LoBue PA, et al. Official American Thoracic Society/Infectious Diseases Society of
   America/Centers for Disease Control and Prevention clinical practice guidelines: diagnosis of tuberculosis in adults
   and children. Clin Infect Dis. 2017;64(2):e1-e33.
3. World Health Organization. WHO guidelines on tuberculosis infection prevention and control, 2019 update. Geneva:
   World Health Organization; 2019.
4. 中华人民共和国国家卫生和计划生育委员会. 肺结核诊断（WS 288—2017）. 2017.
5. Smolen JS, Landewé RBM, Bergstra SA, et al. EULAR recommendations for the management of rheumatoid arthritis with
   synthetic and biological disease-modifying antirheumatic drugs: 2022 update. Ann Rheum Dis. 2023;82(1):3-18.
   doi:10.1136/ard-2022-223356
6. Smolen JS, et al. EULAR recommendations for the management of rheumatoid arthritis with synthetic and biologic
   disease-modifying antirheumatic drugs: 2025 update. Ann Rheum Dis. 2026.
7. Fraenkel L, Bathon JM, England BR, et al. 2021 American College of Rheumatology guideline for the treatment of
   rheumatoid arthritis. Arthritis Care Res (Hoboken). 2021;73(7):924-939. doi:10.1002/acr.24596
8. Fragoulis GE, Nikiphorou E, Dey M, et al. 2022 EULAR recommendations for screening and prophylaxis of chronic and
   opportunistic infections in adults with autoimmune inflammatory rheumatic diseases. Ann Rheum Dis.
   2023;82(6):742-753. doi:10.1136/ard-2022-223335
9. Humphrey MB, Russell L, Danila MI, et al. 2022 American College of Rheumatology guideline for the prevention and
   treatment of glucocorticoid-induced osteoporosis. Arthritis Rheumatol. 2023;75(12):2088-2102. doi:10.1002/art.42646

**DOIs and checks (2026-11-13).** The source DOI is the one the source map records as verified (`publisherCheckedAt`
2026-10-29). Web searches in this session confirmed the EULAR 2022 RA update (doi 10.1136/ard-2022-223356, and its
glucocorticoid wording "tapered and discontinued as rapidly as clinically feasible"), the ACR 2022 GIOP guideline (doi
10.1002/art.42646; scope ≥ 2.5 mg a day for > 3 months), the ACR 2021 RA guideline (doi 10.1002/acr.24596; methotrexate
conditionally preferred in mild, stable lung disease and with subcutaneous nodules, a switch if those nodules
progress — no statement on rheumatoid lung nodules as such), the existence of
the EULAR 2025 RA update (published online in 2026; methotrexate the anchor, glucocorticoid as short-term bridging) and
the EULAR 2022 infection recommendations (doi 10.1136/ard-2022-223335; latent TB screening "could be considered" before
glucocorticoids and csDMARDs, IGRA preferred; HBV status before antirheumatic drugs; the Pneumocystis threshold from two
secondary summaries). Refs 2–4 are cited from the editor's knowledge without a DOI; the search budget ran out before they
could be re-checked.

### To verify

**In the source article (the details 1.0.0 does not give):**

- **The admission sequence:** whether the presentation at 74 with ten years of symptoms worse for 15 days was the first
  admission (as 1.0.0 frames it) or the latest (the recurrence), and so in which admission the examination, CT, blood
  tests, serology and sputum tests were done; the intervals between admissions and her age at each.
- Vital signs, temperature, weight; white cell count and differential, platelets, clotting, liver and renal function,
  urinalysis; anti-CCP, complement; which antibodies the ANA panel covered; the ANCA method; the reference ranges for Hb,
  RF, CRP and ESR.
- The CT details (number, size, distribution, wall thickness, other findings) and the modality and findings of the later
  studies ("imaging improved", "no improvement after 12 days", "thinner cavity walls").
- Sputum methods (smear, culture, a molecular test), the number of samples and their timing; NTM and fungal studies;
  whether bronchoscopy was done.
- The biopsy: technique (CT-guided percutaneous, bronchoscopic or surgical), size, special stains (Ziehl–Neelsen,
  Grocott/PAS), cultures, any comment on vasculitis, giant cells or malignancy, and the pathologist's conclusion.
- The anti-infective drugs, doses and durations (the first course, the 12-day course, the changed antibiotics), and
  whether the 12-day failure was clinical, radiological or both (zh "效果不佳" vs en "failed to improve imaging").
- The glucocorticoid drug and dose after the biopsy; what "免疫治疗" was (a csDMARD, another immunosuppressant or a
  biologic), its dose and why it was irregular; the prednisone dose and taper at discharge.
- Smoking, occupation and dust exposure (Caplan syndrome), TB contacts, allergies, family history.
- Whether isolation, IGRA/TST, hepatitis B screening, Pneumocystis prophylaxis or bone protection were used.
- Long-term follow-up and outcome; what `fig01` shows and whether its legend adds findings.
- That blood-streaked sputum was present at the recurrence (inferred from "血痰消失").

**In the guidance (primary texts not reachable from this session; web-search budget exhausted):**

- ATS/IDSA/CDC 2017: the exact recommendations on the number of sputum specimens, NAAT on the initial specimen, culture
  as the reference standard and smear-negative disease; its DOI.
- WHO: whether the 2019 IPC guideline is superseded by the consolidated Module 1 (infection prevention and control) and
  whether the current Module 3 (diagnosis) edition should be cited for rapid molecular tests as the initial test.
- WS 288—2017: the wording of confirmed and clinically diagnosed pulmonary TB; the publisher or journal reprint.
- EULAR 2025 RA update: full citation (authors, volume, pages; a DOI 10.1016/j.ard.2026.01.023 appeared in one search
  summary but could not be confirmed) and the exact glucocorticoid and methotrexate wording.
- EULAR 2022 infections: volume and pages (82(6):742-753 cited from memory) and the exact Pneumocystis, latent-TB and
  hepatitis B wording (the threshold > 15–30 mg/day for > 2–4 weeks comes from secondary summaries).
- ACR 2021 RA: pages (73(7):924-939 cited from memory) and the exact wording of the lung-disease and subcutaneous-nodule
  statements (the case applies neither to her lung nodules directly).
- ACR 2022 GIOP: the calcium and vitamin D wording in the 2022 version.
- The fluoroquinolone caution in the antibacterial dose text is stated as pharmacology, not attributed; check whether the
  Chinese CAP guideline (2016) or a TB guideline states it, and cite it if so.
- Chinese RA guidance (中国类风湿关节炎诊疗指南, 2018, and any later update) and Chinese expert guidance on RA lung
  involvement were not cited because they could not be verified in this session.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the presenting complaint is
  split into presenting complaint, duration, pattern, blood amount and bleeding elsewhere; the past history into RA and
  TB/diabetes; the course from the outcome record into phase twins (`status-relapse`, `status-recurrence`,
  `immunotherapy-adherence`, `status-outcome`) and staged records; the lab text into structured `values`.
- **History.** 15 template slots (10 with the meta answer "The source notes do not provide that information") → 25
  items in her lay voice: 12 recorded facts, 12 honest unknowns, one labelled ICE device; 10 required.
- **Examination.** "Review presentation examination 1/2" → "Auscultate the lungs" and "Examine the hands and finger
  joints", phase-limited, with an `examNotRecorded` that claims nothing about the article.
- **Phases and gates.** 3 template phases (the first two learner-switchable, nested `all` gates) → 5 one-way phases from
  1.0.0's own sequence, gated on the preceding objectives with committed acts; the outcome phase opens only after all
  five decisions.
- **Investigations.** 5 record reviews (the sputum, CT, labs and biopsy all at once) → 13: the CT as a staged imaging
  record, the labs as two orderable panels with values, the sputum staged after the first treatment, the biopsy at the
  second admission, the outcome record with the approved figure, and seven honest `available: false` tests.
- **Interventions.** 0 → 10: airborne precautions, empirical antibacterials, the biopsy request (contraindicated before
  a clotting screen), the glucocorticoid (critical when given before the sputum results and histology, or before
  re-sampling at the recurrence), companion prophylaxis, rheumatology/csDMARD, antibiotic change, discharge plan;
  harmful: a diagnostic anti-TB trial and pulse methylprednisolone (critical).
- **Decisions.** 3 template decisions (ids `supported` / `alternative-N`, the key the longest, a hindsight appraisal as
  the "safety" decision, a management key that handed the act to "the respiratory and rheumatology teams") → 5 decisions
  with content ids and five options each, including the report's own historical choices as near-misses.
- **Rubric.** 10 template items (the one critical item a hindsight decision) → 12: two critical acts (`rb-tb-workup`,
  `rb-no-unsafe-steroid`), time-windowed credit for the biopsy request and the glucocorticoid, first-try decision
  scoring, and a Calgary–Cambridge communication item written for the case.
- **Teaching layer.** 6 learning outcomes, 6 objectives, 4 named staff, 6 key reasoning steps and 6 dated teaching
  points (1.0.0's key reasoning repeated its teaching points), 8 unknowns, 9 Vancouver references; the source citation
  without double spaces or zero-padded issue; debrief title and conclusion written for the case.
- **Card.** Title in the standard form ("· 74-year-old woman"); a spoiler-free summary that is not the triage note; a
  lay chief complaint; a triage note as a handover; three presenting-feature tags; topic tags `haemoptysis` and
  `chronic-cough`; specialty `infectious-disease` added; estimated time 30 → 40 min.
- **Final editorial review (2026-11-13).** "RF and deformity show active RA" → "long-standing seropositive RA" (activity
  is not what they show); the ACR 2021 methotrexate statements are now attributed to mild, stable lung disease and to
  *subcutaneous* nodules, not to rheumatoid lung nodules; learner-facing result notes no longer name "version 1.0.0"
  (they say the record's two language versions differ); decisions 1 and 5 gained the report's own historical choices as
  near-misses in place of two straw-man options; the diagnostic anti-TB trial now costs `rb-tissue`.
- **Governance.** Review status and notes in the STANDARD §6.6 wording (editorial; facts not yet checked against the full
  article; not reviewed by a licensed clinician — the English last sentence reads "The case is not yet reviewed by a
  licensed clinician." because the collection contract matches that phrase case-sensitively); `sourceTextChecked: false`;
  `authorChecks` and `sourceTextSha256` removed until the source pass; `sourceDoi` + `doiVerifiedAt` added; the figure
  title no longer says "source".

## Validation

From the worktree root (measured 2026-11-13):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-859852/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-859852 --lang en                                                 # 76 steps · objectives 6/6 · decisions 5/5 · utterances 40/40 · rubric 28/28 (100 %)
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-859852                       # PASS: depth floor, do nothing 0, wrong-first 46 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-859852:"              # collection contract for this case
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-859852:"  # in-world demonstration, en + zh-CN
```

The collection-wide "is not a template" test was failing on 2026-11-13 because of cases still at version 1.0.0; none of
its shared texts involves this case, and 0 of this case's 25 questions are stock questions.

## 中文摘要

**病例概要：** 74岁女性，反复咳嗽、痰中带血 10 年，近 15 天加重；15 年前诊断类风湿关节炎，一直未系统治疗，无结核和糖尿病史。
查体双肺小水泡音、双手掌指关节尺侧偏斜。首次胸部 CT 示双肺多发大小不等的结节伴大小不等的空洞；血红蛋白 95 g/L，C 反应蛋白
95 mg/L，血沉 90 mm/h，类风湿因子 2010 IU/mL，所查 ANA 谱和 ANCA 阴性；多次痰结核检查阴性。首轮抗感染后短暂好转，一周后加重；
第二次住院肺活检（右下叶结节）见中央急性炎性坏死伴少许纤维素样物质、周围类上皮细胞栅栏状排列、间质淋巴细胞浸润，诊断为类风湿
（坏死性）肺结节伴空洞。加用激素后影像改善；数年后在免疫治疗用药不规律之后复发，抗感染 12 天效果不佳（1.0.0 英文本：影像未改善），
调整抗生素并加用激素后血痰消失、空洞壁变薄，口服泼尼松出院。长期随访未记录。患者事实均沿用 1.0.0 版，尚未对照原文全文核对。

**学习目标：**

- 对类风湿关节炎患者的双肺多发空洞结节伴痰中带血，在任何免疫抑制之前先按感染处理：隔离并送检痰抗酸涂片、分枝杆菌培养和核酸扩增检测（ATS/IDSA/CDC 2017；WHO 2019）。
- 痰检阴性、抗感染后短暂好转又加重时，查过血小板和凝血后取组织，同时送染色和培养，而不是升级抗生素、诊断性抗结核或经验性激素。
- 把“中央坏死、周围类上皮细胞栅栏状排列”判读为类风湿结节，并说出定论前必须排除的分枝杆菌、真菌和血管炎。
- 激素只作短期桥接，联用改善病情抗风湿药（EULAR 2022 及 2025 更新；ACR 2021）；用药前筛查乙肝和潜伏结核，按阈值预防肺孢子菌、评估骨折风险（EULAR 2022 感染建议；ACR 2022）。
- 用药不规律后的复发先重新取样再加强治疗，并解决依从性。
- 说明同时调整抗生素和激素的单例报告为什么无法判断哪一种治疗有效。

**关键决策：** ① 首要处理：先排除感染（隔离 + 痰分枝杆菌检查），结果出来前不用激素；② 痰检阴性、短暂好转后加重：查凝血后活检，送病理、染色和培养；
③ 病理判读：类风湿（坏死性）结节，前提是染色和培养阴性、无血管炎；④ 治疗方案（多选）：激素桥接并减量、改善病情抗风湿药、用药前筛查和伴随预防；
⑤ 数年后复发：先重新送检痰（必要时支气管镜），再恢复激素并换用能坚持的改善病情药。决策 1 和决策 5 各有一个选项是记录中团队当时的做法（先抗感染；同时换抗生素加激素），作为“接近但非最佳”的干扰项。

**复盘要点：** 先排除结核再谈炎症，入院当天隔离并送检；痰检阴性时取组织，染色和培养与组织学同等重要；类风湿结节是排除性诊断；激素是桥、改善病情药是路；
免疫抑制前先筛查并预防；复发时先取样，两种治疗同时改变则无法归功于任何一种。

**安全结果。** 在痰检结果和组织学之前（或复发时重新送检之前）使用激素，以及任何时候使用甲泼尼龙冲击，都属于本例的严重安全错误（`critical: true`），无论得分多少，安全结果均判为不通过。

审核状态：编辑审核（人工智能辅助，2026-10-30），患者事实尚未对照原文全文核对，尚未经执业医师审核。
