# cmcr-1653405 — Recurrent abdominal distension and nausea · 69-year-old woman

> Facilitator guide (CASE_AUTHORING §9.6). Version 1.1.0 — re-authored on 2026-11-14 from the facts that version 1.0.0
> extracted from the published report; those facts have **not yet been checked against the full source article**, and the
> case is **not yet reviewed by a licensed clinician** (`provenance.review.status: "editorial"`,
> `extensions.sourceTextChecked: false`).

## Case card

| | |
|---|---|
| Setting | Inpatient ward of the general hospital (`facility: "general-hospital"`, `setting: "inpatient"`); static clock |
| Level | Difficulty 4/5 — senior medical student, foundation or resident doctor in internal medicine, hepatology, oncology or radiology |
| Time | About 40 minutes, plus a 20-minute debrief |
| Specialties | Hepatology, oncology, radiology (interventional) |
| Languages | zh-CN and en (same facts, same teaching) |
| Review | Editorial review against the cited guidance (AI-assisted); not yet reviewed by a licensed clinician; facts not yet checked against the full article |
| The patient | Yan Shufang / 严淑芳 (pseudonym), 69, admitted with a month of recurrent abdominal distension and nausea. She talks in plain words and is a little anxious; she says only what her history holds and “I really couldn't tell you, doctor” to everything else |
| What the learner can do | Take her history and examine her; order the tests a clinician would order today (ultrasound, tumour markers, blood count, clotting, liver and renal tests, hepatitis serology, group and screen, multiphase CT or MRI, PET/CT, immunohistochemistry); read the recorded reports at the nurses' station; answer five decisions on the case board; arrange or perform twelve interventions (the biopsy, the multidisciplinary meeting, an interventional-radiology bleeding plan, post-biopsy observation, VTE prophylaxis, referrals, a goals-of-care conversation — and some tempting wrong ones); talk with the ward nurse, the hepatology attending, the radiologist, the pathologist and the interventional radiologist |

## Learning outcomes

By the end of the case the learner can:

1. Order and justify the work-up of a hard, irregular hepatomegaly with multiple liver masses: abdominal ultrasound, blood count, clotting, liver tests and hepatitis serology, and multiphase contrast CT or MRI before any biopsy.
2. Interpret tumour markers and FDG-PET/CT within their limits: a normal AFP does not exclude malignancy, raised CA125 and CA19-9 do not locate a primary, and FDG uptake does not establish the histology.
3. Plan a liver-lesion biopsy as a high-bleeding-risk procedure: platelets, clotting and antithrombotics known first, image guidance through normal liver into viable tumour, blood available, observation afterwards and interventional radiology ready.
4. Outline the management of multifocal hepatic angiosarcoma: immunohistochemistry on the existing core, referral to a sarcoma team, systemic therapy or best supportive care, and why resection and transplantation are not options.
5. Anticipate tumour haemorrhage: choose mechanical rather than drug VTE prophylaxis, and agree with the patient an embolisation-based bleeding plan and the limits of treatment.
6. Discuss a death that follows a biopsy without asserting an unproven cause, keeping the temporal sequence apart from the evidence.

## Clinical summary (spoilers)

**What the report records (1.0.0's extraction).** A 69-year-old woman with no history of malignancy had a month of
recurrent abdominal distension and nausea, without fever, jaundice or abdominal pain. On the admission examination the
liver edge was about 5 cm below the xiphoid, and the liver was hard, with an irregular surface, and tender. CA125
(38.10 U/mL) and CA19-9 (68.60 U/mL) were raised; CEA, AFP, CA15-3 and CA72-4 were reported normal. Ultrasound showed
multiple heterogeneous solid liver masses, the largest about 12.0 × 10.5 cm, suspicious for malignancy. An 18F-FDG PET/CT
showed multiple heterogeneous FDG-avid liver lesions (SUVmax 7.1), the largest about 11.2 × 10.6 × 7.9 cm with low central
uptake, read as malignancy with intratumoural haemorrhage and intrahepatic spread (metastasis). A needle biopsy of a
right-lobe mass showed **angiosarcoma** (the report's title: primary multiple hepatic angiosarcoma); individual
immunostains are not given. The PET/CT's reading of haemorrhage came **before** the biopsy. She **died of intrahepatic
haemorrhage a few days later**; no resuscitation details are given, and nothing shows that the biopsy caused the bleeding.

**What today's practice adds (the teaching).**

- Characterise liver masses of uncertain cause with multiphase contrast CT or MRI before sampling (ACG 2024); PET/CT is a
  staging and problem-solving tool, not a diagnosis (ESMO–EURACAN–GENTURIS 2021).
- Markers neither confirm nor exclude: a normal AFP does not rule out a primary liver malignancy; CA125 and CA19-9 are
  non-specific.
- A liver-lesion biopsy is a high-bleeding-risk procedure (SIR 2019; BSG 2020; 2024 Chinese primary liver cancer
  guideline): platelets and clotting first, image guidance, a route through normal liver to viable tumour, blood grouped,
  observation afterwards, interventional radiology ready — all the more with haemorrhage already read in the tumour.
- After the diagnosis: immunostains on the same block, a sarcoma team, systemic therapy (anthracyclines; taxanes an option
  in angiosarcoma) or best supportive care; no transplantation (European Liver Transplant Registry 2013) and no curative
  resection for multifocal disease.
- A bleeding plan (embolisation first, ACG 2024 by analogy with a ruptured adenoma), mechanical rather than drug VTE
  prophylaxis (NICE NG89), and an honest conversation with her about the limits of treatment (SPIKES).
- The death cannot be attributed to the biopsy from the record: haemorrhage was read in the tumour before it, and this
  kind of tumour can bleed on its own.

## Scenario timeline and physiology

The clock is **static** (`clock.mode: "static"`, no `physiology`): a historical report establishes no physiological
response model, and no vital sign, laboratory value or response to treatment is simulated. The case advances by phases
that open on the learner's decisions and acts.

| Phase | Opens when | What exists in it |
|---|---|---|
| `admission` — On admission: history, examination and first tests | at the start (the first phase; it cannot be selected again once left) | Her history (22 items, 8 required); the two recorded liver findings; the ultrasound and tumour-marker results (recorded); blood count, clotting, liver and renal tests, hepatitis serology, group and screen and multiphase CT/MRI (orderable, **no result recorded**); PET/CT orderable but “no result at this point” |
| `imaging` — Further imaging | decision 1 (`next-step`) decided | The 18F-FDG PET/CT result (recorded, dated “before the biopsy”); multiphase CT/MRI still has no recorded result (a note says the case records a PET/CT instead); the biopsy, the MDT and the interventional-radiology plan become indicated |
| `diagnosis` — After the biopsy: the histology and the plan | decision 3 (`tissue-plan`) decided **and** the biopsy (`core-biopsy`) given | The histopathology record (needle biopsy of the right-lobe mass: angiosarcoma; no individual immunostains recorded); immunohistochemistry orderable (no result); the referrals and the goals-of-care conversation become indicated |
| `outcome` — Recorded outcome (`learnerSwitchable: false`) | all five decisions decided | The recorded course (death from intrahepatic haemorrhage a few days later) with the two approved figures; the patient is non-verbal here (`nonVerbalWhen: {phase: "outcome"}`: “this phase reviews the course recorded after the biopsy”) |

Results belong to the phase in which they existed: the ultrasound and markers on admission, the PET/CT from `imaging`
(it preceded the biopsy), the histology from `diagnosis`, the outcome only in `outcome`. Every `read` that gates a
decision, an objective or a rubric item names its phase. Acts scored “in time” (`whenIndicated`) carry an `indicatedWhen`
that is false once the outcome record has been read, so returning to `diagnosis` after reading the outcome earns nothing
(measured below).

## Decisions and assessment

### Objectives (the HUD's six chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | Hear her story | asked: bloating, duration, pattern, fever, jaundice, pain, cancer history |
| 2 | Examine her and get the first tests | both liver findings examined; ultrasound and markers read on admission; decision 1 decided |
| 3 | Interpret the further imaging | PET/CT read in `imaging`; decision 2 decided |
| 4 | Obtain tissue safely | decision 3 decided; blood thinners asked; blood count and clotting ordered; biopsy given |
| 5 | Plan her care after the biopsy | histology read in `diagnosis`; decisions 4 and 5 decided |
| 6 | Compare your plan with what happened | outcome read in `outcome` |

No `completeWhen` holds a condition that can become permanently false (no phase leaf, no `whenIndicated`, no
`decidedFirstTry`); the contract's late-learner test confirms the case can always be finished.

### Decisions (key and why)

1. **`next-step` — after the examination, ultrasound and markers: the best next step.** Key `characterise-and-stage`:
   multiphase contrast CT or MRI and staging, with blood count, clotting and liver tests, before any biopsy is planned
   (ACG 2024 rec. 1; SIR 2019; BSG 2020). Distractors: `biopsy-today` (sampling before imaging and before platelets and
   clotting are known), `markers-locate-primary` (CA125/CA19-9 do not locate a primary; chemotherapy without histology),
   `afp-reassures` (a normal AFP does not exclude malignancy), `abscess-drainage` (no fever; solid masses).
2. **`pet-reading` — what the PET/CT establishes.** Key `malignant-bleeding-untyped`: probably a metabolically active
   malignant tumour with bleeding inside it, but FDG uptake cannot type it; tissue is still needed and the bleeding makes
   sampling riskier (ESMO–EURACAN–GENTURIS 2021: PET/CT as a problem-solving tool). Distractors: `suv-diagnostic`,
   `hcc-excluded`, `abscess-cavity`.
3. **`tissue-plan` — how to obtain tissue.** Key `planned-core-biopsy`: image-guided core biopsy of the viable edge of a
   lesion through normal liver, after platelets, clotting and blood thinners are checked and blood is grouped, with
   observation afterwards (ESMO–EURACAN–GENTURIS 2021; BSG 2020; SIR 2019; 2024 Chinese guideline). Distractors:
   `centre-aspirate` (FNA of the cold, haemorrhagic centre), `blind-bedside` (no image guidance), `skip-bloods`.
4. **`after-histology` — the overall plan after the histology.** Key `sarcoma-team-plan`: immunostains on the existing
   core, sarcoma-team review, systemic therapy if she is fit, otherwise best supportive care (ACG 2024; ESMO–EURACAN–
   GENTURIS 2021). Distractors: `transplant` (absolute contraindication, ELTR 2013), `extended-hepatectomy` (multifocal
   disease, no cure), `rebiopsy-first` (a second pass for tissue the block already holds).
5. **`bleed-plan` — the plan for the coming days.** Key `escalation-plan`: observations and haemoglobin, blood available,
   interventional radiology ready to embolise, mechanical VTE prophylaxis and limits of treatment discussed with her
   (Kang 2016; ACG 2024; NICE NG89; SPIKES). Distractors: `routine-enoxaparin`, `surgery-first`, `family-only`.

Each option has feedback of its own that names its guidance. No decision is open at the start; each opens before the
result that answers it (decision 1 before the PET/CT, 2 and 3 before the histology, 4 and 5 before the outcome). The keyed
option is the uniquely longest option only in decision 5 (in both languages; the lint allows one).

### Rubric (13 deterministic items, total weight 33, + 1 examiner-judged)

| Item | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-story` | history | 2 | asked bloating, duration, pattern, fever, jaundice, pain |
| `rb-background` | history | 1 | asked cancer history, liver history, blood thinners, bleeding tendency, alcohol, work exposures |
| `rb-exam` | examination | 2 | both liver findings examined |
| `rb-first-tests` | investigations | 2 | ultrasound and markers read on admission; blood count, clotting, liver tests, hepatitis serology ordered |
| `rb-next-step` | diagnosis | 3 | decision 1 right at the first attempt **and** multiphase CT/MRI ordered |
| `rb-pet` | diagnosis | 3 | decision 2 right at the first attempt |
| `rb-tissue-plan` | management | 3 | decision 3 right at the first attempt, MDT and group and screen |
| `rb-safe-biopsy` | management | 4 | **critical** — `{intervened: core-biopsy, whenIndicated: true}`: the biopsy in `imaging`, after the blood count and clotting were ordered |
| `rb-after-biopsy` | management | 2 | post-biopsy observation and the interventional-radiology plan, both given in their window (before the outcome is read) |
| `rb-histology-plan` | management | 3 | decision 4 right at the first attempt, immunohistochemistry ordered, referral to the specialist (sarcoma) oncology team (`oncology-referral`) in `diagnosis` |
| `rb-bleed-plan` | management | 3 | decision 5 right at the first attempt and mechanical VTE prophylaxis before the outcome |
| `rb-goals` | management | 2 | goals-of-care conversation and palliative referral in `diagnosis`, before the outcome is read |
| `rb-no-harm` | safety | 3 | **critical** — none of: a biopsy outside its window (on admission, or before the blood count and clotting), a repeat biopsy, drug VTE prophylaxis, blind plasma, a transplant referral. `scoredWhen`: any decision attempted or any of these acts |
| `rb-communication` | communication | 1 (judged) | Calgary–Cambridge; consent for the biopsy with its bleeding risk and teach-back; SPIKES for the diagnosis; limits of treatment agreed with her, without false reassurance or invented numbers |

### How wrong choices score (measured with core `assess` on 2026-11-14)

| Path | Deterministic score | Critical items missed | Safety outcome |
|---|---:|---|---|
| Reference path (`solution`) | 33/33 (100 %) | none | pass |
| Start and do nothing | 0/30 (0 %) | `rb-safe-biopsy` (`rb-no-harm` not scored) | pass |
| Wrong first answer at all five decisions, then right | 18/33 (55 %) | none | pass |
| Wrong first answer at any one decision only | 30/33 (91 %) each | none | pass |
| Biopsy on admission, before the further imaging (bloods sent) | 26/33 (79 %) | `rb-safe-biopsy`, `rb-no-harm` | **fail** (`core-biopsy` is critical) |
| Biopsy before the blood count and clotting are sent (sent afterwards) | 26/33 (79 %) | `rb-safe-biopsy`, `rb-no-harm` | **fail** |
| Biopsy and the bloods never sent | 24/33 (73 %); the case cannot be finished (objective 4) | `rb-safe-biopsy`, `rb-no-harm` | **fail** |
| Reference path plus a repeat biopsy | 30/33 (91 %) | `rb-no-harm` | **fail** (`repeat-biopsy` is critical) |
| Reference path plus prophylactic enoxaparin | 30/33 (91 %) | `rb-no-harm` | pass (non-critical) |
| Reference path plus plasma before the biopsy | 30/33 (91 %) | `rb-no-harm` | pass (non-critical) |
| Reference path plus a transplant referral after the histology | 30/33 (91 %) | `rb-no-harm` | pass |
| Reference path without the interventional-radiology plan | 31/33 (94 %) | none | pass |
| …with the plan made only after reading the outcome (back in `diagnosis`) | 31/33 (94 %) | none | pass — no hindsight credit |
| Reference path without the goals-of-care talk and palliative referral | 31/33 (94 %) | none | pass |
| Reference path without post-biopsy observation | 31/33 (94 %) | none | pass |
| Reference path without the MDT and group and screen | 30/33 (91 %) | none | pass |
| Reference path without mechanical prophylaxis | 30/33 (91 %) | none | pass |
| Reference path without the multiphase CT/MRI order | 30/33 (91 %) | none | pass |
| Only the eight required history questions | 32/33 (97 %) | none | pass |

### Critical items

- `rb-safe-biopsy` — the act done in time: the biopsy is the report's own step and the only way to the diagnosis, so
  every learner who finishes takes it; what is scored is that it was taken **after** the further imaging and **after**
  the blood count and clotting were sent (`indicatedWhen: {phase: "imaging"}` with the `contraindicatedWhen` below). A
  biopsy cannot be repeated (`maxDoses: 1`), so an early or unprepared biopsy cannot be redeemed later.
- `rb-no-harm` — the avoided harms, with `scoredWhen` listing every harmful act and the decisions that expose them, so
  doing nothing does not earn it.

**Safety outcome.** `core-biopsy` and `repeat-biopsy` are `critical: true` (both `risk: "high"`): a biopsy of a large,
heterogeneous, haemorrhagic liver tumour taken on admission before the further imaging, or before the blood count and
clotting are sent, and any second biopsy once the diagnosis is made, can cause a haemorrhage that cannot be controlled —
giving either while contraindicated fails the assessment's safety outcome whatever the score. `lmwh-prophylaxis` and
`blind-ffp` (`risk: "moderate"`) are explicitly `critical: false`: drug prophylaxis while the bleeding risk prevails and
plasma without a measured INR are recoverable misjudgements that the next clinician stops; they cost `rb-no-harm`. The
transplant referral (`risk: "low"`) is contraindicated only once the histology is known (its harm text names the
diagnosis) and is counted in `rb-no-harm` in any phase.

## Reference path (`solution`)

1. Start; ask the history (bloating, duration, pattern, fever, jaundice, pain, vomiting, weight, bowels, cancer history,
   other illnesses, liver history, blood thinners, other medicines, bleeding tendency, allergies, alcohol, smoking, work,
   family, her worry).
2. Examine the liver edge and the liver's consistency, surface and tenderness; fit mechanical VTE prophylaxis.
3. Order and read the abdominal ultrasound and the tumour markers; order and read the blood count and clotting (no result
   recorded); order liver and renal tests and hepatitis serology; order and read multiphase CT/MRI (no result recorded).
4. Decision 1: `characterise-and-stage` → the `imaging` phase opens.
5. Order and read the PET/CT; decision 2: `malignant-bleeding-untyped`; present her at the MDT; order group and screen;
   decision 3: `planned-core-biopsy`; alert interventional radiology; take the core biopsy → the `diagnosis` phase opens.
6. Post-biopsy observation; read the histology; ask what she understands; order immunohistochemistry on the block; refer
   to the specialist oncology team (`oncology-referral`; for this tumour, the sarcoma team); the goals-of-care
   conversation; palliative referral.
7. Decision 4: `sarcoma-team-plan`; decision 5: `escalation-plan` → the `outcome` phase opens.
8. Read the recorded course; finish.

The path is safe: no intervention is given while contraindicated, no dose error, no safety gate (`cases verify`).

## Clinical numbers check

| Number | Where in the case | Source | Derived values |
|---|---|---|---|
| 69 years, female | patient, prompts, conclusion | 1.0.0 patient | — |
| one month (of recurrent distension and nausea) | history `duration`, chief complaint, prompts | 1.0.0 chief complaint / history | — |
| liver edge about 5 cm below the xiphoid | exam `liver-edge`, prompt 1, conclusion | 1.0.0 exam-1 | — |
| CA125 38.10 U/mL; CA19-9 68.60 U/mL (raised) | `markers` result and values, prompt 1 | 1.0.0 markers | no reference ranges are given and none is added (flags H as “reported raised”) |
| CEA, AFP, CA15-3, CA72-4 “normal” | `markers` | 1.0.0 markers | values not recorded |
| largest ultrasound mass about 12.0 × 10.5 cm | `abd-us`, prompt 1, harm texts (“12 cm”) | 1.0.0 ultrasound | “12 cm” is the rounded first dimension |
| SUVmax 7.1; largest lesion about 11.2 × 10.6 × 7.9 cm | `pet-ct`, prompt 2 | 1.0.0 PET/CT | — |
| “a few days later” (death) | `outcome` | 1.0.0 outcome | the starting day is not recorded |
| INR ≤ 1.5–1.8; platelets ≥ 50 × 10⁹/L (transfuse below 50) | harm and feedback texts, teaching point 2 | SIR 2019 Part II (high-risk procedures; chronic liver disease: INR < 2.5, platelets > 30 × 10⁹/L) | — |
| INR < 2.0 for a lesional biopsy; no FFP for INR ≤ 2.0; observation ≥ 3 hours; prophylactic LMWH stopped 12 hours before | feedback, harm texts, `post-biopsy-obs` dose, teaching point 2 | BSG/RCR/RCPath 2020 | — |
| 16–18 G cores | `core-biopsy` dose | 2024 Chinese guideline (18 G or 16 G); ESMO–EURACAN–GENTURIS 2021 (≥ 14–16 G) | — |
| about 7 months mean survival after transplantation, none beyond 23 months | `transplant-referral` harm, decision 4 feedback, teaching point 4 | Orlando 2013 (ELTR: 7.2 ± 2.6 months; 17 of 22 died of recurrence) | “about 7 months” rounds 7.2 |
| severe bleeding after 3 of 33 biopsies; no biopsy-related deaths | decision 5 feedback, teaching point 3 | Kang 2016 (9.1 %) | — |
| under 1 % of primary liver malignancies | teaching point 3 | ACG 2024 | — |

No dose is stated except where the cited guidance states it; the enoxaparin and plasma items name no amount (no
`doseSpec`, and no high-alert preset is needed).

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions.** How did it feel to plan a biopsy you knew could bleed? How did you feel reading the outcome?
- **Description.** Walk through what you knew at each step: the liver on examination, the ultrasound and markers, the
  PET/CT, the histology. What did you order, and why in that order?
- **Analysis.**
  - What can a normal AFP tell you, and what can it not? And raised CA125 and CA19-9?
  - Why does ACG 2024 put multiphase CT or MRI before a biopsy? What would it have added here?
  - What does FDG uptake measure? What did the cold centre of the largest lesion and the reading of haemorrhage change in
    your plan?
  - What must be known and ready before a needle goes into this liver (SIR 2019, BSG 2020, the 2024 Chinese guideline)?
    None of those values is recorded for her — what would you have done with a platelet count of 40 or an INR of 2.2?
  - Why are resection and transplantation not options? What can systemic therapy offer, and who decides?
  - Why mechanical rather than drug VTE prophylaxis? What is the plan if she bleeds, and who is called?
  - She died of intrahepatic haemorrhage a few days later. Did the biopsy cause it? What does the record allow you to say,
    to the family and in a morbidity review?
- **Summary.** One thing you will do before every liver-lesion biopsy, and one sentence you would use with a family after
  a death like this.

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it |
|---|---|
| Reassured by a normal AFP, or treating raised CA125/CA19-9 as locating a primary | Decision 1 distractors `afp-reassures`, `markers-locate-primary`; decision 2 `hcc-excluded` |
| Biopsy first, imaging later | `biopsy-today` (decision 1); `core-biopsy` on admission is contraindicated and critical |
| Treating PET/CT as a histological diagnosis | `suv-diagnostic` (decision 2) |
| Sampling the necrotic, haemorrhagic centre, or sampling blind | `centre-aspirate`, `blind-bedside` (decision 3) |
| Skipping platelets and clotting “to save time” | `skip-bloods` (decision 3); `core-biopsy` before the blood count and clotting is contraindicated and critical; objective 4 cannot finish without them |
| Correcting an unmeasured INR with plasma | `blind-ffp` (harm text; `rb-no-harm`) |
| A second biopsy for immunostains | `rebiopsy-first` (decision 4); `repeat-biopsy` is critical |
| Offering transplantation or resection for multifocal disease | `transplant`, `extended-hepatectomy` (decision 4); `transplant-referral` |
| Routine LMWH prophylaxis in a bleeding tumour | `routine-enoxaparin` (decision 5); `lmwh-prophylaxis` harm text |
| Planning surgery first for a tumour bleed; deciding with the family instead of the patient | `surgery-first`, `family-only` (decision 5); the judged communication item |
| Calling the death a complication of the biopsy | Objective 6's hint, the outcome record's wording, teaching point 5 and the debrief question |

### Teaching points for the debrief

The six teaching points (`debrief.teachingPoints`) are dated and guideline-attributed: characterise before you sample
(ACG 2024; 2024 Chinese guideline; ESMO–EURACAN–GENTURIS 2021); a liver biopsy is a high-bleeding-risk procedure (SIR
2019; BSG 2020; 2024 Chinese guideline); hepatic angiosarcoma bleeds (ACG 2024; Kang 2016); no transplant and rarely
surgery (ELTR 2013; ACG 2024; ESMO–EURACAN–GENTURIS 2021); causation and candour; bleeding risk shapes everything else
(NICE NG89; SPIKES 2000). Where the report's practice differs from today's (no multiphase CT or MRI recorded; the biopsy's
preparation and the post-biopsy course not recorded), the points say so rather than presenting the report as current.

## Embodied mode

- **Facility and capabilities.** General hospital; `caseCapabilityGaps` is empty. The abdominal ultrasound is a bedside
  study (a mobile unit comes to the ward bed); the multiphase CT/MRI and the PET/CT are done in the imaging department
  (`performedAt: "provider"`: the patient is taken there and back); laboratory tests, group and screen and
  immunohistochemistry go to their laboratories; the histology report and the recorded course are **record reviews**
  (`performedAt: "records"`, read at the nurses' station, no device, no risk). The in-world demonstration
  (`embodied-autopilot.test.ts`) finishes in both locales with the clinical-mode score.
- **The biopsy and the consults.** `core-biopsy` is performed by the interventional team with its own ultrasound (no
  equipment requirement on the ward); the MDT, interventional radiology, the oncology (sarcoma) team and palliative care are reached
  by phone or referral. Nursing scope: mechanical prophylaxis and post-biopsy observation can be delegated to the nurse;
  the goals-of-care conversation is a doctor's act.
- **Spoilers.** Everything a learner can see before the histology — the summary, triage note, opening line, objective
  titles and hints, record and figure names, intervention names and the options of decisions 1–3 — avoids the
  diagnosis; the referral is named “specialist oncology team” until the histology says which.
- **Grounding.** The patient, the nurse and the doctors say only what the case holds. Asked for vital signs, the blood
  count, clotting, her medicines or allergies, they say plainly that nothing is recorded; examinations the case does not
  hold return `examNotRecorded` (“do not assume it is normal”).
- **Non-verbal handling.** She talks in `admission`, `imaging` and `diagnosis`; in `outcome` she does not
  (`nonVerbalWhen`), because that phase reviews the recorded course.

## Source and adaptation (fidelity limits)

**Facts.** Every patient fact is the one version 1.0.0 extracted from the report (commit `88ed0d2`); the check against the
full article is pending (`sourceTextChecked: false`). Nothing is added: no vital sign, laboratory value, examination
finding, medicine, exposure, biopsy detail or course of the bleeding that 1.0.0 does not record.

**Extraction summary (1.0.0 → 1.1.0).**

| 1.0.0 fact | Where it is in 1.1.0 |
|---|---|
| 69-year-old woman | `patient` |
| abdominal distension and nausea for one month; recurrent | chief complaint, opening line; history `bloating`, `duration`, `pattern` |
| no fever, jaundice or abdominal pain | history `fever`, `jaundice`, `pain` |
| no history of malignancy | history `cancer-history` |
| liver edge about 5 cm below the xiphoid (hepatomegaly) | exam `liver-edge` |
| liver hard, irregular surface, tender | exam `liver-texture` |
| CA125 38.10 and CA19-9 68.60 U/mL raised; CEA, AFP, CA15-3, CA72-4 normal | `markers` (admission) |
| multiple heterogeneous solid masses, largest about 12.0 × 10.5 cm, suspicious for malignancy | `abd-us` (admission) |
| PET/CT: multiple heterogeneous FDG-avid lesions, SUVmax 7.1, largest about 11.2 × 10.6 × 7.9 cm with low central uptake; malignancy with intratumoural haemorrhage and intrahepatic spread | `pet-ct` (imaging, diagnosis) |
| the imaging suggested haemorrhage before the biopsy | `pet-ct` dated “before the biopsy”; feedback; teaching point 5 |
| right-lobe mass biopsy: angiosarcoma; individual immunostains not given | `histology` (diagnosis, outcome); `ihc` has no result |
| death from intrahepatic haemorrhage a few days later; no resuscitation detail; biopsy not proven as the cause | `outcome` (outcome) |
| the report's title: primary multiple hepatic angiosarcoma (18F-FDG PET/CT) | citation; conclusion |
| immunostains, coagulation data, haemodynamics and resuscitation records absent | `unknowns`; results “No result is recorded for this test.” |
| figures fig01 (ultrasound) and fig03 (histology) approved; fig02 (PET/CT) and the PDF withheld | `assets` (fig01, fig03, outcome record only) |

**Differences within 1.0.0, kept.** (1) The PET/CT conclusion: the Chinese text reads “肿瘤内出血及肝内转移” without the
word malignant, the English “malignancy with intratumoural bleeding and intrahepatic spread”; 1.1.0 states both (malignant
tumour; haemorrhage; intrahepatic spread/metastasis). (2) “A few days later” has no stated starting day. (3) No abdominal
pain in the history, yet a tender liver on examination — both are recorded and both are kept.

**Inferences (derived, not new).** The haemorrhage reading is taught as being “within the tumour”; the case does not
assert which lesion bled (the sentence structure of 1.0.0 attaches it to the largest lesion's cold centre). The biopsy is
called a needle biopsy (穿刺); whether it was a core or an aspirate is not recorded.

**Teaching devices (labelled).** The staging into four phases; ordering the ultrasound, markers and PET/CT as tests (1.0.0
does not record whether the ultrasound and markers preceded the PET/CT or the admission; only the PET/CT's precedence over
the biopsy is recorded); the tests a clinician would order today whose results the report does not give (blood count,
clotting, liver and renal tests, hepatitis serology, group and screen, multiphase CT/MRI, immunohistochemistry); the
learner planning and taking the biopsy (the report records that it was done, not how); the histology being available
before her death (its timing is not recorded); the patient's worry (“I'm afraid it's something serious”) and what she
knows about the biopsy (for the SPIKES conversation); the staff, the decisions, the interventions and the scoring.

**Privacy.** A bilingual pseudonym unique in the library; no dates, hospitals or cities; the journal appears only in the
citation.

**Figures.** Only the two figures approved in `scripts/cmcr-105-media-review.json` (sha256 as recorded, local only), with
spoiler-free titles, attached to the outcome record: their content has not been seen by this author, and a composite may
hold later findings.

## Matcher notes

- 51 test utterances (`extensions.testUtterances`), both languages, every required item covered, none a canonical
  question or one of its item's keywords; four look-alike negatives (“I'm going to order some blood tests now.”, “我们等会儿
  去做个检查。”, thanks in both languages) select nothing. `cases verify`: 51/51.
- Multi-word English keywords that reduce to one token are written run together (`whatbringsyou`, `comeandgo`,
  `whendiditstart`…), as the lint asks.
- Routing worth knowing: “feel sick” goes to the presenting complaint, “been sick/thrown up” to `vomiting`; “blood-thinning
  tablets” and “aspirin” go to `blood-thinners` (excluded from `regular-meds`); “anyone in the family had liver disease or
  cancer” goes to `family` (excluded from `cancer-history` and `liver-history`); “examine the abdomen” goes to the liver
  edge, “consistency/surface/tender” to `liver-texture`.
- Orders: “CT”/“MRI” reach the multiphase study, “PET” the PET/CT (an `orderMatching` rule keeps “PET/CT” off the CT item);
  “ultrasound” reaches the abdominal ultrasound.

## References

1. 楊波. 18F-FDG PET/CT診斷原發性多發性肝血管肉瘤1例. 鏡湖醫學. 2025;25(02):54. doi:10.12408/j.issn2223-4462.2025.02.016. Available from: https://rs.yiigle.com/cmaid/1653405
2. Frenette C, Mendiratta-Lala M, Salgia R, Wong RJ, Sauer BG, Pillai A. ACG Clinical Guideline: focal liver lesions. Am J Gastroenterol. 2024;119(7):1235-1271. doi:10.14309/ajg.0000000000002857
3. Neuberger J, Patel J, Caldwell H, et al. Guidelines on the use of liver biopsy in clinical practice from the British Society of Gastroenterology, the Royal College of Radiologists and the Royal College of Pathology. Gut. 2020;69(8):1382-1403. doi:10.1136/gutjnl-2020-321299
4. Patel IJ, Rahim S, Davidson JC, Hanks SE, et al. Society of Interventional Radiology consensus guidelines for the periprocedural management of thrombotic and bleeding risk in patients undergoing percutaneous image-guided interventions—Part II: recommendations. J Vasc Interv Radiol. 2019;30(8):1168-1184.e1. doi:10.1016/j.jvir.2019.04.017
5. 中华人民共和国国家卫生健康委员会医政司. 原发性肝癌诊疗指南（2024年版）. 协和医学杂志. 2024;15(3):532-558. doi:10.12290/xhyxzz.2024-0304
6. Gronchi A, Miah AB, Dei Tos AP, et al. Soft tissue and visceral sarcomas: ESMO–EURACAN–GENTURIS Clinical Practice Guidelines for diagnosis, treatment and follow-up. Ann Oncol. 2021;32(11):1348-1365. doi:10.1016/j.annonc.2021.07.006
7. Orlando G, Adam R, Mirza D, et al. Hepatic hemangiosarcoma: an absolute contraindication to liver transplantation—the European Liver Transplant Registry experience. Transplantation. 2013;95(6):872-877. doi:10.1097/TP.0b013e318281b902
8. Kang TW, Lee MW, Choi D, et al. Safety of percutaneous biopsy for hepatic angiosarcoma: results of a multicenter Korean survey. J Vasc Interv Radiol. 2016;27(6):846-851. doi:10.1016/j.jvir.2016.01.148
9. National Institute for Health and Care Excellence. Venous thromboembolism in over 16s: reducing the risk of hospital-acquired deep vein thrombosis or pulmonary embolism (NG89). London: NICE; 2018 (updated 2019). Available from: https://www.nice.org.uk/guidance/ng89
10. Baile WF, Buckman R, Lenzi R, Glober G, Beale EA, Kudelka AP. SPIKES—a six-step protocol for delivering bad news: application to the patient with cancer. Oncologist. 2000;5(4):302-311. doi:10.1634/theoncologist.5-4-302

Guidance checked online on 2026-11-14: ACG 2024 (recommendation 1, recommendation 8 on ruptured adenoma, key concept 40
and the angiosarcoma text), BSG 2020 (image guidance, INR < 2.0 for lesional biopsy, no FFP at INR ≤ 2.0, platelets
< 50 × 10⁹/L → transvenous where possible, ≥ 3 h observation, no day case when malignancy is strongly suspected, LMWH
stop times), SIR 2019 Part II (high-risk thresholds, via a published summary and the citation record), the 2024 Chinese
guideline's biopsy section, ESMO–EURACAN–GENTURIS 2021 (biopsy after imaging and MDT; anthracyclines [I, A]; taxanes in
angiosarcoma [III, B]; PET/CT [IV, A]), NICE NG89 (1.1.3, 1.1.8, 1.4.6, 1.7.1), the ELTR 2013 and Kang 2016 abstracts.
The source DOI is the one `scripts/cmcr-105-sources.json` verified.

### To verify

**The source pass (against the full article) must confirm:**

1. The PET/CT conclusion in the original words (malignancy? intratumoural haemorrhage in which lesion? intrahepatic
   metastasis or spread?), and whether extrahepatic disease was found (the title says “primary”).
2. The order and setting of the tests: whether the ultrasound and tumour markers came before the PET/CT and whether they
   were done before or during the admission; whether a multiphase CT or MRI was done.
3. The tumour-marker values for CEA, AFP, CA15-3 and CA72-4 and the laboratory's reference ranges.
4. The biopsy: route and guidance, needle type (core or aspirate), number of passes, any tract plugging, the platelet count
   and clotting before it, and how she was observed after it; the immunohistochemistry panel.
5. The course: what “a few days later” counts from; when and how the haemorrhage presented; whether transfusion,
   embolisation or surgery was attempted; whether an autopsy was done; when the histology was reported relative to the
   bleeding.
6. The history the template dropped: vital signs, medicines and antithrombotics, alcohol, hepatitis status, cirrhosis,
   occupational exposures (vinyl chloride, arsenic, thorium dioxide, radiation), performance status.
7. The examination: the tenderness of the liver with no abdominal pain in the history (both kept); any ascites or spleen.
8. The content of fig01 and fig03 — whether fig01 (ultrasound) could be shown with the admission ultrasound result.

**A clinician of the specialty (hepatology, interventional radiology, sarcoma oncology) should confirm:**

1. The keys of the five decisions, in particular multiphase CT/MRI before biopsy for this presentation and the
   escalation plan of decision 5.
2. The critical flags: a biopsy before the further imaging or before the blood count and clotting, and any repeat biopsy,
   as safety failures; enoxaparin and plasma as non-critical.
3. Contraindicating drug VTE prophylaxis throughout the stay (including on admission, before the PET/CT) rather than
   from the PET/CT onwards.
4. The use of the 2024 Chinese primary liver cancer guideline (an HCC guideline) for the biopsy of a liver lesion of
   unknown type, and of ACG 2024's ruptured-adenoma recommendation by analogy for tumour bleeding.
5. The SIR 2019 thresholds as quoted (taken from a published summary of Part II; the full text was not accessible).

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- **Template defects replaced.** Three decisions of three options with role-named ids (`supported`, `alternative-1`)
  became five decisions at the real decision points (next step after the first tests; reading the PET/CT; how to obtain
  tissue; the plan after the histology; the plan for the coming days), each with four or five content-named options and
  feedback that names its guidance. Fifteen generic history slots with “the source notes do not provide that
  information” answers became 22 items in her own voice (8 required); unknowns are said in character. Four records read
  in one phase became four staged phases. Zero interventions became twelve.
- **Safety fixes.** 1.0.0 presented the biopsy only as an existing record and scored a causality quiz as its critical
  item (a decision alone, answerable in hindsight). The critical items are now acts done in time: the biopsy taken after
  the further imaging and after the blood count and clotting (`rb-safe-biopsy`), and the avoided harms (`rb-no-harm`:
  premature or unprepared biopsy, repeat biopsy, drug VTE prophylaxis, blind plasma, transplant referral). `core-biopsy`
  and `repeat-biopsy` are `critical: true`. The causality lesson moved to the outcome record, objective 6, teaching point
  5 and the debrief.
- **Added teaching.** Today's guidance at each step (ACG 2024, BSG 2020, SIR 2019, the 2024 Chinese guideline,
  ESMO–EURACAN–GENTURIS 2021, NICE NG89, ELTR 2013, Kang 2016, SPIKES), the tests a clinician would order now with
  honest “No result is recorded for this test.” results, the attending, nurse, radiologist, pathologist and
  interventional radiologist, a judged communication item, dated teaching points, six learning outcomes and this guide.
- **Other.** New pseudonym (严淑芳 / Yan Shufang); a spoiler-free summary and triage note; figures retitled and moved to
  the outcome record; `authorChecks` (which claimed individual reading of the source) removed;
  `extensions.sourceTextChecked: false`.

### 1.0.0 — 2026-10-28

Template version generated for the collection: three evidence-gated decisions with role-named options, four record
reviews read in one work-up phase, fifteen generic history items (most answered “the source notes do not provide that
information”), no interventions, a critical safety item scored on a decision's first attempt, and a short README.

## Validation

From the worktree root, measured on 2026-11-14:

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-1653405/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1653405 --lang en                                                 # 61 steps · 6/6 objectives · 5/5 decisions · 51/51 utterances · 33/33 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-1653405                                       # reference 100 % · do nothing 0/30 · wrong first at every decision 55 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1653405:"              # collection contract: pass
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1653405:"  # in-world demonstration, en + zh-CN: pass
```

## 中文摘要

**病例概要：** 69岁女性（化名严淑芳），既往无恶性肿瘤病史，反复腹胀伴恶心 1 个月，无发热、皮肤发黄和腹痛。入院查体肝下缘在
剑突下约 5 cm，质硬、表面不光滑、有压痛。CA125 38.10 U/mL、CA19-9 68.60 U/mL 升高，CEA、AFP、CA15-3、CA72-4 正常；超
声示肝内多发不均匀实性肿块，最大约 12.0×10.5 cm，考虑恶性；18F-FDG PET/CT 示多发不均匀高摄取病灶（SUVmax 7.1，最大约
11.2×10.6×7.9 cm，中心摄取稀疏），考虑恶性肿瘤伴瘤内出血及肝内转移。肝右叶肿物穿刺病理为血管肉瘤（原报告题目称原发性多发性
肝血管肉瘤），数日后因肝内出血死亡，记录不能证明出血由穿刺引起。病例分为入院、进一步影像、穿刺之后、记录的结局四个阶段；
患者事实均沿用 1.0.0 版的提取，尚未对照原文全文核对，也尚未经执业医师审核。

**学习目标：** 对质硬、表面不平的肝大伴多发肿块开出并说明检查路径（穿刺前先做多期增强 CT/MRI）；在局限之内解读肿瘤标志物和
FDG PET/CT；把肝占位穿刺当作高出血风险操作来计划；说明多灶性肝血管肉瘤的处理（免疫组化、肉瘤专科团队、全身治疗或最佳支持
治疗，不做切除和肝移植）；预判肿瘤出血（机械性血栓预防、介入栓塞预案、与患者商定治疗限度）；讨论穿刺后死亡时不断言未经证实
的原因。

**关键决策：** ① 超声和标志物之后：先多期增强 CT/MRI 和分期，同时查血常规、凝血和肝功能，再计划穿刺；② PET/CT：很可能是瘤
内已有出血的恶性肿瘤，但不能分型，仍需组织诊断；③ 取材：影像引导下经正常肝组织穿刺病灶活跃的边缘，术前查血小板、凝血和抗
栓药并备血，术后观察；④ 病理之后：在已有组织上补做免疫组化，交肉瘤团队，与她商定全身治疗或最佳支持治疗；⑤ 接下来几天：监
测、备血、介入科准备栓塞、机械性血栓预防，并与她本人讨论治疗限度。

**复盘要点：** 先定性、再取材（ACG 2024；《原发性肝癌诊疗指南（2024年版）》）；肝穿刺是高出血风险操作（SIR 2019；BSG
2020）；肝血管肉瘤容易出血（ACG 2024；Kang 2016）；不做肝移植（欧洲肝移植登记 2013），多灶病变给予姑息性全身治疗
（ESMO–EURACAN–GENTURIS 2021）；药物预防前先权衡出血风险（NICE NG89）；时间先后不等于因果，对家属和在病例讨论中都要坦诚说
明已知和未知。

**安全结果。** `core-biopsy`（在进一步影像之前、或未送检血常规和凝血就穿刺）和 `repeat-biopsy`（确诊后再次穿刺）标记为
`critical: true`，在禁忌时实施即判定安全结果不通过；依诺肝素预防和未测 INR 输血浆为 `critical: false`（可纠正的判断失误），但
都会使“没有做有害的事”这一关键评分项失分。
