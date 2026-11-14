# cmcr-860885 — Cold hands and feet and stiff fingers · girl aged 16 years 7 months

> Facilitator guide — spoilers follow. Version 1.1.0, re-authored from the facts version 1.0.0 recorded; the facts
> have not yet been checked against the full source article, and the case has not yet been reviewed by a licensed
> clinician.

## Case card

| Field | Value |
|---|---|
| Setting | Paediatric ward of the general hospital (`general-hospital`), inpatient; static clock |
| Level / time | Difficulty 4/5 — final-year students, paediatric and rheumatology trainees; about 60 minutes |
| Patient | Yu Yuning (pseudonym), a girl aged 16 years 7 months, who answers her own history |
| Presenting problem | Cold hands and feet for six years, stiff fingers for two years, a right-hand ulcer for a month; a necrotic area on the right thumb |
| Specialties | Pediatrics, rheumatology, respiratory medicine |
| Languages | Simplified Chinese and English |
| What the learner can do | Take the history, examine the hands, feet and joints, order 13 tests (antibodies, muscle enzymes, blood count, B cells, chest CT, echocardiogram, NT-proBNP, kidney function, antiphospholipid antibodies, infection screen, immunoglobulins, pregnancy test, chest X-ray) and read 4 records (lung function, pathology, treatment record, follow-up), give or withhold 18 interventions, answer 5 decisions |
| Review status | Editorial (AI-assisted); not yet reviewed by a licensed clinician; facts not yet checked against the full article (`extensions.sourceTextChecked: false`) |

## Learning outcomes

1. Recognise new digital necrosis with Raynaud's as critical digital ischaemia and start same-day rescue — warmth,
   wound protection, analgesia and IV iloprost — with urgent assessment within 48 hours (BSR 2024; EULAR 2023), without
   amputating on admission or sending her home to clinic.
2. Distinguish secondary from primary Raynaud's, interpret a high-titre speckled ANA with anti-U1-RNP and negative
   anti-Sm, dsDNA, Scl-70 and Jo-1 as an MCTD (overlap) pattern, and explain why conflicting CK values must be repeated
   with a reference range.
3. Screen an anti-U1-RNP overlap with scleroderma features for its life-threatening organ complications — lung
   function with DLCO and HRCT for ILD, echocardiography for pulmonary hypertension, blood pressure and kidney
   function — rather than a chest X-ray or inflammatory markers (SHARE 2021; ESC/ERS 2022).
4. Choose escalation for disease refractory to glucocorticoids, immunoglobulin, cyclophosphamide and methotrexate
   (rituximab or mycophenolate; SHARE 2021, EULAR 2023) and explain why months of high-dose glucocorticoid or stopping
   treatment are wrong.
5. Complete the safety checklist before B-cell depletion — HBsAg and anti-HBc (rituximab label), hepatitis C, HIV and
   an IGRA (EULAR 2022), non-live vaccines at least 2 weeks before and no live vaccine (EULAR/PReS 2021; ACR 2022) —
   with baseline immunoglobulins, a pregnancy test and contraception.
6. Communicate with an adolescent: see her alone and in confidence about periods, sex and contraception, explain a
   chronic illness and a treatment of uncertain long-term benefit in plain words, and check understanding by
   teach-back.

## Clinical summary (spoilers)

A girl aged 16 years 7 months has had cold hands and feet for six years, stiff fingers that do not straighten fully
for two years, skin on both hands and forearms that has been getting tighter, and a right-hand ulcer for one month.
On examination the skin of both hands is tight and firm, Raynaud's phenomenon is positive, the nail beds are pale,
there is a dry 1 × 2 cm necrotic area on the right thumb and the skin of the left fourth toe is cyanosed; extension of
the fingers and elbows is limited without swelling, and there is calcinosis with areas of pigment loss at the finger
joints, elbows and knees.

ANA is 1:10000 (speckled/granular) with anti-nRNP ++ and anti-SSA +; anti-Sm, anti-dsDNA, anti-Scl-70 and anti-Jo-1
are among the negatives; complement and CRP are normal (CRP 0.5 mg/L in the results table). RF is positive in the case
notes and normal in the results table; the CK is 56 U/L in the case notes and 556 (flagged raised) in the results
table; HBDH is 285 in the notes and 258 U/L in the table; AST is 68.6 U/L and LDH 322 U/L; platelets are
164 × 10⁹/L and the B-lymphocyte count 0.50 (no unit). Lung function shows a restrictive ventilatory impairment; CT
shows small bubble-like (vesicular) emphysematous change beneath the pleura of both upper lobes with interstitial
disease considered, and a dilated oesophagus; echocardiography shows no pulmonary hypertension. The skin biopsy is
consistent with scleroderma-like change; the muscle shows marked degeneration with vascular dilatation.

The report's diagnosis is **refractory childhood mixed connective tissue disease (MCTD)**. Glucocorticoids,
immunoglobulin, cyclophosphamide and methotrexate (doses, routes, order and timing not recorded) were followed by no
clear improvement in her Raynaud's or stiffness. Rituximab was added (two administrations; doses and interval not
recorded); afterwards her Raynaud's improved and the thumb necrosis progressed no further; the case notes record ANA and
anti-nRNP as negative and the results table ENA and nRNP negative, a B-lymphocyte count of 0.00, CRP 9.5 mg/L,
platelets 123 × 10⁹/L and a chest film still showing interstitial changes. No allergy or infection is recorded over
one year of follow-up; long-term efficacy and safety remain uncertain.

What the case teaches: (1) a necrotic digit is a same-day emergency, treated with warmth, protection, analgesia and an
IV prostanoid before the cause is known; (2) necrosis, sclerodactyly and calcinosis make Raynaud's secondary, and the
high-titre anti-nRNP with negative anti-Sm/dsDNA/Scl-70/Jo-1 is the MCTD pattern with scleroderma features; (3) the
organ screen (lung function with DLCO, HRCT, echocardiography, blood pressure, kidneys) does not wait for the CRP;
(4) refractory disease is escalated to a different agent (rituximab or mycophenolate), and (5) B-cell depletion
follows hepatitis B and other infection screening and the right vaccines. One case cannot show that rituximab caused
the improvement.

## Scenario timeline and physiology

Static clock: no physiology is simulated and no vital sign is recorded. Results belong to the phase in which they
exist; orders are kept per phase, so a test sent in one phase is ordered again in the next to read its result (the
work-up description says so).

| Phase | Label | Opens when | What it holds |
|---|---|---|---|
| `admission` | Admission | start | History, examination (hands, feet, joints), decision 1, the digit rescue; tests sent show "sample sent / requested" |
| `work-up` | First results | `obj-first-priority`: decision 1 answered, the digit protected (`keep-warm-protect`), antibodies, muscle enzymes and blood count ordered | Antibodies, muscle enzymes, blood count/CRP, B cells; decisions 2 and 3; first treatment; organ tests ordered |
| `course` | The course on treatment | `obj-make-sense`: antibodies and enzymes read, decisions 2 and 3 answered, chest CT and echocardiogram ordered | CT, echocardiogram, lung function, skin/muscle pathology, the treatment-so-far record; decisions 4 and 5; screening, vaccines, escalation |
| `outcome` | Follow-up and outcome | all five decisions answered and rituximab (or mycophenolate) given | The follow-up record (with the approved figure), the post-rituximab antibodies, blood count, B cells and chest film |

The staging (which phase each record opens in, a ward admission "today", re-ordering per phase) is teaching design:
1.0.0 records the results but not when each was done.

## Decisions and assessment

### Objectives (HUD chapters)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-story` Hear her story | presenting complaint, cold hands, colour change, stiff fingers, tight skin and the sore asked |
| 2 | `obj-examine` Examine her hands, feet and joints | hand skin, Raynaud's, thumb, toe, joints and calcinosis examined |
| 3 | `obj-first-priority` Decide what cannot wait | decision 1 answered; warmth/protection/analgesia given; antibodies, muscle enzymes and blood count ordered |
| 4 | `obj-make-sense` Make sense of the first results | antibodies and enzymes read (work-up or course); decisions 2 and 3; chest CT and echocardiogram ordered |
| 5 | `obj-course` Review her course and plan the next step safely | treatment record read; decisions 4 and 5; infection screen ordered; rituximab or mycophenolate given |
| 6 | `obj-outcome` See how she did | follow-up record read |

No objective holds a condition that can become permanently false (no phase leaf, no `whenIndicated`, no
`decidedFirstTry`); the contract's late-learner replay confirms the case can always be finished.

### Decisions

Options are shown as letters in shuffled order; option ids name the content. Only decision 5 has a key that is the
uniquely longest option (one per language is allowed).

1. **`digit-first`** (admission; opens after the thumb is examined and the sore asked about) — what to do today for a
   dry 1 × 2 cm necrotic thumb, a cyanosed toe, pale nail beds and positive Raynaud's. **Key `iv-prostanoid-urgent`:**
   treat it as critical digital ischaemia today — warmth, protection, analgesia, IV iloprost with a PDE5 inhibitor,
   urgent rheumatology, first tests sent. Why: BSR 2024 (new necrosis = emergency, assessment preferably within 48 h);
   EULAR 2023 (PDE5i and/or IV iloprost for digital ulcers); SHARE 2021 (iloprost for ischaemic digits). Distractors:
   `amputate-today` (irreversible, premature), `pulse-steroids` (no recorded vasculitis; delays vasodilators),
   `clinic-review` (nifedipine is right for Raynaud's but a necrotic digit is not stable).
2. **`pattern`** (work-up; opens after the antibodies and enzymes of this stage are read) — **key `u1rnp-overlap`:**
   secondary Raynaud's from an anti-U1-RNP overlap — an MCTD pattern with scleroderma features; repeat the CK with a
   reference range and look at lungs, heart, oesophagus and muscle. Distractors: `primary-raynaud`, `lupus` (anti-Sm,
   dsDNA negative; complement normal), `juvenile-dm` (no rash or weakness recorded; uncertain CK).
3. **`organ-screen`** (work-up) — **key `full-screen`:** lung function with DLCO and HRCT, echocardiogram with
   NT-proBNP, blood pressure, kidney function and urine, oesophagus (SHARE 2021; ESC/ERS 2022; EULAR 2023 for blood
   pressure on glucocorticoids). Distractors: `cxr-only` (insensitive; ACR/CHEST 2023, adults, advises against CXR
   screening), `crp-guided`, `muscle-first`.
4. **`refractory-plan`** (course; opens after the treatment record and the CT of this stage are read) — **key
   `add-rituximab`:** escalate under the specialist team with rituximab once infection screening is done, keep the
   vasodilator and wound care going, review at set intervals. Why: SHARE 2021 (biologics, tocilizumab or rituximab, in
   severe/refractory jSSc); EULAR 2023 (rituximab for skin and ILD, alongside MMF and cyclophosphamide — mycophenolate
   is accepted as the act). Distractors: `high-dose-steroid`, `stop-immunosuppression`, `transplant-now` (ASCT is for
   progressive refractory disease or selected early diffuse SSc; a biologic not yet tried).
5. **`before-rituximab`** (course) — **key `screen-vaccinate`:** HBsAg and anti-HBc, hepatitis C, HIV, IGRA, baseline
   immunoglobulins, pregnancy test and contraception, due non-live vaccines ≥ 2 weeks ahead, no live vaccine (rituximab
   label; EULAR 2022; EULAR/PReS 2021; ACR 2022). Distractors: `live-vaccines-first`, `screen-if-abnormal`,
   `cxr-for-tb`.

Every option carries its own feedback with the guidance that decides it; the decision that answers each is revealed
only later (the course phase holds the report's diagnosis and treatment record; the outcome phase what followed
rituximab).

### Rubric (14 deterministic items, weight 37, + 1 examiner-judged)

| Item | Domain | Weight | Met when |
|---|---|---|---|
| `rb-history` | history | 2 | presenting, cold hands, stiff fingers, straightening, joint swelling, tight skin, sore asked |
| `rb-systems` | history | 1 | colour change, breathing, swallowing, weakness, rash, dry eyes/mouth asked |
| `rb-safety-history` | history | 1 | medicines, allergies, vaccines, hepatitis/TB, periods asked |
| `rb-examination` | examination | 2 | all seven findings examined |
| `rb-digit-first` | management | 3 | `decidedFirstTry` digit-first |
| `rb-digit-rescue` | management | 4 | **critical** — IV iloprost and warmth/protection given while `indicatedWhen` (admission or work-up) held |
| `rb-first-tests` | investigations | 2 | antibodies, muscle enzymes, blood count/CRP and kidney function/urinalysis ordered |
| `rb-pattern` | diagnosis | 3 | `decidedFirstTry` pattern |
| `rb-organ-screen` | investigations | 3 | `decidedFirstTry` organ-screen; chest CT and echo ordered; lung function read |
| `rb-refractory` | management | 3 | `decidedFirstTry` refractory-plan; pathology read |
| `rb-before-rtx` | management | 3 | `decidedFirstTry` before-rituximab; immunoglobulins ordered; non-live vaccines given before rituximab |
| `rb-screen-escalation` | management | 4 | **critical** — rituximab or mycophenolate given in the course phase after the infection screen was ordered (`whenIndicated`) |
| `rb-no-harm` | safety | 4 | **critical** — none of amputation now, discharge to clinic, high-dose steroids for months, a live vaccine, or rituximab while contraindicated (`valid: false`); `scoredWhen` lists every one of them and the decisions that expose them |
| `rb-adolescent` | management | 2 | confidential talk about periods, sex and contraception; pregnancy test ordered |
| `rb-communication` | communication | 2 | examiner-judged (Calgary–Cambridge, SPIKES where news is hard, HEADSS, teach-back; guidance specific to her fear of losing the thumb) |

### How wrong choices score (measured 2026-11-14 with core `assess`)

| Path | Score | Critical items missed | Safety outcome |
|---|---|---|---|
| Reference path (`solution`) | 37/37 (100 %) | none | passes |
| Do nothing (start, then try to finish) | 0/33 (finish refused: objectives incomplete) | `rb-digit-rescue`, `rb-screen-escalation` | passes |
| A wrong first answer at every decision, then the right one | 22/37 (59 %) | none | passes |
| A wrong first answer at any one decision | 34/37 (92 %) | none | passes |
| Reference path + amputating the thumb now | 33/37 (89 %) | `rb-no-harm` | **fails** (critical intervention) |
| Reference path + discharge to clinic, + high-dose steroids for months, or + a live vaccine (each alone) | 33/37 (89 %) | `rb-no-harm` | passes (non-critical) |
| Rituximab given before the infection screen is ordered | 26/37 (70 %) | `rb-screen-escalation`, `rb-no-harm` | **fails** (critical intervention) |
| IV iloprost left out, or given only in the course phase | 33/37 (89 %) | `rb-digit-rescue` | passes |
| Mycophenolate instead of rituximab (after screening and a pregnancy test) | 37/37 (100 %) | none | passes |

**Safety outcome.** Two interventions are `critical: true`, so giving them while contraindicated fails the run's
safety outcome whatever the score: **`amputation-now`** (always contraindicated — amputating a dry, uninfected necrotic
thumb on admission loses tissue that vasodilator rescue might save, irreversibly; BSR 2024) and **`rituximab`**
(contraindicated until the infection screen is ordered — B-cell depletion without HBsAg/anti-HBc can reactivate
hepatitis B into fulminant hepatitis; rituximab boxed warning, EULAR 2022). Three contraindicated interventions are
explicitly `critical: false`, recoverable misjudgements that the next clinician corrects and that cost the critical
avoided-harm item but not the safety outcome: **`discharge-gloves`** (moderate risk; delays urgent care), **`steroid-escalation`**
(moderate; harm accrues over months and can be reversed by tapering) and **`live-vaccine`** (moderate; avoided in
immunosuppressed children, EULAR/PReS 2021, ACR 2022). `cyclophosphamide` is high-risk but has no contraindication in
this case (it is the report's treatment; the case records it as given); no intervention has a fixed dose in the case
or its guidance, so none carries a `doseSpec`, and none is a high-alert medicine.

## Reference path (`solution`)

95 steps; all accepted; score 37/37.

1. **Admission:** asks all 25 admission history items (presenting complaint, cold hands, colour change, stiff fingers,
   straightening, swelling, tight skin, the sore, thumb pain, toes, breathing, swallowing, weakness, rash, dry eyes,
   fever/weight, medicines, allergies, vaccines, hepatitis/TB, periods, smoking, family, daily life, concerns);
   examines all seven findings; answers decision 1 (`iv-prostanoid-urgent`); gives warmth/protection/analgesia,
   IV iloprost, sildenafil and a hand-surgery review; orders kidney function/urinalysis, a pregnancy test, the
   antibodies and the muscle enzymes (reading their placeholders), then the blood count — which opens `work-up`.
2. **Work-up:** orders again and reads the antibodies, muscle enzymes and blood count/CRP, and orders and reads the
   B-cell count; answers decision 2
   (`u1rnp-overlap`); has the confidential talk, starts a glucocorticoid with weekly methotrexate (pregnancy test
   already sent) and blood-pressure/kidney monitoring; answers decision 3 (`full-screen`); orders NT-proBNP, the
   echocardiogram and the chest CT — which opens `course`.
3. **Course:** reads the CT, echocardiogram, lung function, pathology and the treatment record; asks how the
   treatment has helped; answers decisions 4 (`add-rituximab`) and 5 (`screen-vaccinate`); orders the infection
   screen and immunoglobulins (no results recorded); gives the non-live vaccines, then rituximab — which opens
   `outcome`.
4. **Outcome:** reads the follow-up record (figure attached), the post-rituximab antibodies, blood count and B cells;
   asks how her hands are now; finishes.

## Clinical numbers check

| Number | Where | Source in 1.0.0 | Derived / note |
|---|---|---|---|
| 16 years 7 months (16.583 y) | patient | `patient.age` | none |
| 6 years cold hands and feet; 2 years stiff fingers; 1 month right-hand ulcer | history, triage, chief complaint | history `onset`, `stiffness`, `ulcer`; chief complaint | none |
| Necrotic area 1 × 2 cm, right thumb | exam `thumb` | exam `hands` | none |
| Left fourth toe | exam `toe` | exam `hands` | none |
| ANA 1:10000, granular (speckled) | `autoantibodies` | `antibodies` record | "speckled" is the English term for 颗粒型 |
| anti-nRNP ++, anti-SSA + | `autoantibodies` | `antibodies` record | none |
| CK 56 U/L (text) and 556 flagged raised (Table 1) | `muscle-enzymes` | `biochemistry` record; 1.0.0's evidence feedback also reads the text as calling a CK of 56 raised | the two kept; unit given only for 56 |
| HBDH 285 (text) and 258 U/L (Table 1) | `muscle-enzymes` | `biochemistry` record | both kept |
| AST 68.6 U/L, LDH 322 U/L | `muscle-enzymes` | `biochemistry` record | no reference ranges: never graded |
| CRP 0.5 mg/L (Table 1, initial; "normal" in the text) → 9.5 mg/L (after rituximab) | `blood-count-crp` | `biochemistry`, `antibodies`, `followup` records | no ranges; the change is not interpreted as infection or activity |
| Platelets 164 → 123 × 10⁹/L | `blood-count-crp` | `biochemistry`, `followup` records | no ranges; not graded |
| B-lymphocyte count 0.50 → 0.00 (no unit) | `b-cells`, `outcome-record` | `biochemistry`, `followup` records | unit and method not recorded |
| Two rituximab administrations; one year of follow-up | `outcome-record` | `followup` record | dose, interval and timing not recorded |
| 48 hours | decision 1, harms, teaching | BSR 2024 DU recommendation i | guideline threshold, not a case fact |
| At least 6 months (monitoring) | decision 3, teaching | SHARE 2021 assessment recommendation 6 | guideline |
| At least 2 weeks (vaccine → rituximab) | decision 5, vaccines | ACR 2022 summary table | guideline |

No dose appears in the case: 1.0.0 recorded none, and the cited guidance states none for this patient (her weight is
not recorded); intervention texts give route, titration principle and monitoring only.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions:** How did it feel to be told a 16-year-old's thumb might be lost? What did she most want to know?
- **Description:** Summarise what was known on admission, and what the first results added.
- **Analysis:**
  - What made the thumb an emergency on the first day, and what did you do before the cause was known? (BSR 2024)
  - Why is this Raynaud's secondary? What does the antibody panel exclude, and what does it point to?
  - The CK is recorded as 56 U/L and as 556 flagged raised. What can you conclude, and what would you do?
  - Why is a normal CRP no reassurance about her lungs and pulmonary circulation? Which tests screen them?
  - After four drugs without clear improvement, how did you choose the next agent, and what had to be in place first?
  - What does this single case — improvement after rituximab, with B cells 0.00, CRP 9.5 mg/L, platelets
    123 × 10⁹/L and persisting interstitial change — let you conclude, and what not?
- **Summary:** One thing you will do differently the next time a patient arrives with a necrotic digit, and one
  check you will never skip before rituximab.

### Common learner errors and how the case surfaces them

| Error | Where it shows |
|---|---|
| Treating the thumb as a wound for the surgeons, or sending her home with gloves | Decision 1 distractors; `amputation-now` (critical) and `discharge-gloves` cost `rb-no-harm`; `rb-digit-rescue` is missed without iloprost in the first two stages |
| Calling it primary Raynaud's or lupus from a high ANA | Decision 2 feedback; the course phase's records show the report's diagnosis |
| Reading the CK as clearly raised (or normal) | The muscle-enzyme record keeps both entries; decision 2's key asks for a repeat with a range |
| Screening the lungs with a chest X-ray, or waiting for the CRP | Decision 3 distractors; the CT and lung function in the course phase show the restrictive impairment and the interstitial changes |
| Escalating steroids for months, or stopping treatment | Decision 4 distractors; `steroid-escalation` costs `rb-no-harm` |
| Rituximab without hepatitis B screening; live vaccines first | `rituximab` is contraindicated (critical) until the infection screen is ordered; decision 5; `live-vaccine` costs `rb-no-harm` |
| Forgetting she is an adolescent girl about to receive teratogenic drugs | `rb-adolescent`; methotrexate and mycophenolate are "indicated" only after a pregnancy test is ordered |

Teach-back: ask the learner to explain to her, in plain words, why the thumb needs a drip today and why she needs a
blood test for hepatitis before the new medicine.

## Embodied mode

- **Facility:** `general-hospital`; every test and intervention is reachable there (`caseCapabilityGaps` is empty).
  Laboratory tests go to the laboratory order workstation (serology, chemistry, haematology, urinalysis, flow
  cytometry); the chest CT and chest X-ray are performed by radiology (`performedAt: provider`); the echocardiogram is
  done at the bedside.
- **Records:** the lung-function report, the skin and muscle pathology report, the treatment-so-far record and the
  follow-up record are existing documents read at a records terminal (`requires: ["records"]`, `performedAt:
  "records"`, `risk: "none"`). They exist from the phase in which they appear; asking for them earlier is refused
  ("does not exist yet").
- **Bedside:** history and examination at her bed; she speaks for herself (no companion; `nonVerbalWhen` not set).
  Examination findings are available in the admission and work-up phases; later, `examNotRecorded` answers.
- **Interventions:** nursing acts (warmth and dressing, monitoring) are within the nurse's scope; medicines need the
  medication capability, infusions IV access.
- **Figure:** `fig01` (approved in `scripts/cmcr-105-media-review.json`, local only) is attached to the follow-up
  record only, because the report's figure may show later findings.
- The in-world demonstration (`embodied-autopilot.test.ts`) replays the reference path in English and Chinese.

## Source and adaptation (fidelity limits)

**Source.** 许瑛杰, 吴凤歧, 赖建铭, 周志轩, 苏改秀, 尚宁秀. 利妥昔单抗治疗难治性儿童混合结缔组织病1例. 中华实用儿科临床杂志
2013;28(9):715-716 (DOI verified 2026-10-29 in `scripts/cmcr-105-sources.json`). The full article was not available:
**the patient facts are version 1.0.0's extraction**, and the check against the full article is pending
(`extensions.sourceTextChecked: false`).

**Extraction (every 1.0.0 fact and where it is in 1.1.0).**

| 1.0.0 fact | 1.1.0 |
|---|---|
| Girl, 16 years 7 months | `patient` |
| Cold extremities / hands and feet for 6 years | `presenting`, `cold-hands`, chief complaint, triage, opening line |
| Stiff fingers for 2 years, not straightening fully | `presenting`, `stiff-fingers` |
| Right-hand ulcer for 1 month | `presenting`, `hand-sore`, chief complaint, triage |
| Skin of both hands and forearms tight (zh 越来越紧, "getting tighter") | `tight-skin` |
| Fingers and elbows bend but do not fully extend | `straightening`; exam `joints` |
| No joint swelling (history); finger and elbow joints not swollen (exam) | `joint-swelling` (limited to fingers and elbows); exam `joints` |
| Finger extension limited; recent necrotic area on the right thumb (triage) | `triageNote` |
| Hand skin tight and firm; Raynaud's positive; pale nail beds; dry 1 × 2 cm necrotic area right thumb; left fourth toe cyanosed | exam `hand-skin`, `raynaud`, `nail-beds`, `thumb`, `toe` |
| Calcinosis and partial depigmentation at finger joints (en "fingers"), elbows, knees | exam `calcinosis` |
| ANA 1:10000 granular; anti-nRNP ++; SSA +; Sm, dsDNA, Scl-70, Jo-1 among the negatives; complement normal | `autoantibodies` (work-up, course) |
| RF positive (text) vs normal (Table 1) | `autoantibodies` values and note |
| CRP normal (text); Table 1 initial CRP 0.5 mg/L, platelets 164 × 10⁹/L, B-cell count 0.50 (no unit) | `blood-count-crp`, `b-cells` |
| CK 56 U/L (text) vs 556 flagged high (Table 1); HBDH 285 vs 258 U/L; AST 68.6, LDH 322 U/L | `muscle-enzymes` |
| Restrictive ventilatory impairment | `lung-function` (course, outcome) |
| CT: subpleural 小泡样 emphysema of both upper lungs, interstitial disease considered, oesophageal dilatation | `chest-ct` (course, outcome) |
| Echo: no pulmonary hypertension | `echo` (course, outcome) |
| Skin biopsy scleroderma-like; muscle marked degeneration with vascular dilatation | `pathology` (course, outcome) |
| Glucocorticoids, immunoglobulin, cyclophosphamide, methotrexate: Raynaud's and stiffness no clear improvement | `treatment-record`; `treatment-response` (her words) |
| Diagnosis: refractory childhood MCTD | `treatment-record` ("childhood MCTD"), debrief |
| Rituximab added twice; Raynaud's improved; thumb necrosis not progressing; ANA and nRNP negative (text) | `outcome-record`, `autoantibodies` (outcome), `since-rituximab` |
| Table 1 after rituximab: B-cell count 0.00, ENA and nRNP negative, CRP 9.5 mg/L, platelets 123 × 10⁹/L, chest film interstitial changes persist | `outcome-record`, `b-cells`, `blood-count-crp`, `cxr` (outcome) |
| One-year follow-up: no allergy or infection reported; long-term efficacy and safety uncertain | `outcome-record`, debrief |
| Unknowns: weight, complete infection screening, CK reference range, long-term lung function, biologic safety | `unknowns`, `infection-screen` (no result), record notes |
| Figure 1 (approved) | `assets.fig01`, follow-up record |

Inferences (derived, not new): "speckled" as the English name of 颗粒型; "chest CT" and "chest X-ray" as the names of
a CT showing the lungs and oesophagus and of the 胸片; a muscle biopsy behind the recorded muscle pathology ("skin and
muscle pathology report"); "case notes" and "results table" as in-world names for the report's text and its Table 1.

**Contradictions kept (neutral wording, both readings):** CK 56 U/L in the text vs 556 flagged raised in Table 1
(and 1.0.0's evidence feedback reads the text as calling a CK of 56 raised); HBDH 285 vs 258 U/L; RF positive vs
normal; after rituximab the text says ANA and anti-nRNP negative while Table 1 says ENA and nRNP negative; 1.0.0's
English "subpleural upper-lobe cystic emphysematous changes" vs its Chinese 双上肺…小泡样气肿 (1.1.0 follows the
Chinese: "small bubble-like (vesicular)… both upper lobes"); zh 越来越紧 ("getting tighter") vs en "has become tight";
calcinosis at 指关节 (finger joints) vs en "fingers"; 1.0.0 named a record "Muscle enzymes and immunoglobulins"
without any immunoglobulin value (1.1.0 records none).

**Unknown, kept unknown:** weight, height, vital signs and blood pressure, kidney function, urinalysis, NT-proBNP,
capillaroscopy, DLCO and lung-function values, CT technique, infection screening, vaccination history, immunoglobulin
levels, allergies, periods and contraception, family and social history, symptom details (colour change, pain,
breathing, swallowing, weakness, rash, dryness, fever, weight loss), the doses, routes, order and timing of every
drug, whether the thumb healed, the stiffness after rituximab, and the course beyond one year. She says "I'm not sure,
doctor" to each of these; records without a result say "No result is recorded for this test."

**Teaching devices (labelled, not facts of the report):** the ward admission "today"; the phase staging and
re-ordering per phase; the dialogue in her own words; her worries (ICE: losing the thumb, using her hands); her
anxious affect; the staff (Dr Shen, Nurse Tang, Dr Gao, Dr Lu) and their briefs; the 18 interventions offered (the
report's glucocorticoids, immunoglobulin, cyclophosphamide, methotrexate and rituximab are recorded as given, the
others are today's options or tempting errors — the case does not record that she received iloprost, sildenafil,
nifedipine, a surgical review, vaccines or screening); decisions, options, feedback and scoring.

**Privacy:** pseudonym 余予宁 / Yu Yuning (pseudonym); no hospital, city, date or identifier.

## Matcher notes

- The presenting-complaint item is reached by the plain openers in both languages (probed with `matchHistory`:
  "What brings you in?", "What happened?", "What's the problem?", "Tell me what's been going on", "How long…", "When
  did it start?"; 怎么了, 这次怎么了, 哪里不舒服, 怎么回事, 有什么不舒服, 多久了, 什么时候开始的 → `presenting`). Its
  `excludeKeywords` (finger, stiff, skin, sore, wound, right hand, thumb, toe, cold, colour…) keep specific questions on
  their own items.
- `medicines` (admission, work-up) is superseded in the course phase by `treatment-response`, so "What medicines have
  you had?" then gives the recorded response; "treatment" reaches both.
- Symptom questions that 1.0.0 does not answer (colour change, pain, toes, breathing, swallowing, weakness, rash, dry
  eyes, fever) reach their own unknown items, so the patient says she is not sure rather than falling back.
- Weakness words (没劲, 无力, weak) are excluded from `straightening`; "胳膊腿有没有没劲" reaches `muscle-weakness`.
- `extensions.testUtterances`: 59 utterances (zh-CN and en), one or more for every required item, three look-alike
  negatives (`expect: []`); `cases verify` passes 59/59 with no extra selections.

## References

1. 许瑛杰, 吴凤歧, 赖建铭, 周志轩, 苏改秀, 尚宁秀. 利妥昔单抗治疗难治性儿童混合结缔组织病1例. 中华实用儿科临床杂志.
   2013;28(9):715-716. doi:10.3760/cma.j.issn.2095-428X.2013.09.022. Available from: https://rs.yiigle.com/cmaid/860885
2. Denton CP, De Lorenzis E, Roblin E, Goldman N, Alcacer-Pitarch B, Blamont E, et al. The 2024 British Society for
   Rheumatology guideline for management of systemic sclerosis. Rheumatology (Oxford). 2024;63(11):2956-2975.
   doi:10.1093/rheumatology/keae394
3. Del Galdo F, Lescoat A, Conaghan PG, et al. EULAR recommendations for the treatment of systemic sclerosis: 2023
   update. Ann Rheum Dis. 2025;84(1):29-40. doi:10.1136/ard-2024-226430
4. Foeldvari I, Culpo R, Sperotto F, Anton J, Avcin T, Baildam E, et al. Consensus-based recommendations for the
   management of juvenile systemic sclerosis. Rheumatology (Oxford). 2021;60(4):1651-1658.
   doi:10.1093/rheumatology/keaa584
5. Humbert M, Kovacs G, Hoeper MM, Badagliacca R, Berger RMF, Brida M, et al. 2022 ESC/ERS Guidelines for the
   diagnosis and treatment of pulmonary hypertension. Eur Heart J. 2022;43(38):3618-3731. doi:10.1093/eurheartj/ehac237
6. Johnson SR, Bernstein EJ, Bolster MB, Chung JH, Danoff SK, George MD, et al. 2023 ACR/CHEST guideline for the
   screening and monitoring of interstitial lung disease in people with systemic autoimmune rheumatic diseases.
   Arthritis Rheumatol. 2024;76(8):1201-1213. doi:10.1002/art.42860
7. Tanaka Y, Kuwana M, Fujii T, Kameda H, Muro Y, Fujio K, et al. 2019 Diagnostic criteria for mixed connective tissue
   disease (MCTD): from the Japan research committee of the ministry of health, labor, and welfare for systemic
   autoimmune diseases. Mod Rheumatol. 2021;31(1):29-33. doi:10.1080/14397595.2019.1709944
8. Fragoulis GE, Nikiphorou E, Dey M, Zhao SS, Courvoisier DS, Arnaud L, et al. 2022 EULAR recommendations for
   screening and prophylaxis of chronic and opportunistic infections in adults with autoimmune inflammatory rheumatic
   diseases. Ann Rheum Dis. 2023;82(6):742-753. doi:10.1136/ard-2022-223335
9. Jansen MHA, Rondaan C, Legger GE, Minden K, Uziel Y, Toplak N, et al. EULAR/PRES recommendations for vaccination of
   paediatric patients with autoimmune inflammatory rheumatic diseases: update 2021. Ann Rheum Dis.
   2023;82(1):35-47. doi:10.1136/annrheumdis-2022-222574
10. Bass AR, Chakravarty E, Akl EA, Bingham CO, Calabrese L, Cappelli LC, et al. 2022 American College of
    Rheumatology guideline for vaccinations in patients with rheumatic and musculoskeletal diseases. Arthritis Care
    Res (Hoboken). 2023;75(3):449-464. doi:10.1002/acr.25045
11. Sammaritano LR, Bermas BL, Chakravarty EE, Chambers C, Clowse MEB, Lockshin MD, et al. 2020 American College of
    Rheumatology guideline for the management of reproductive health in rheumatic and musculoskeletal diseases.
    Arthritis Rheumatol. 2020;72(4):529-556. doi:10.1002/art.41191
12. Genentech. RITUXAN (rituximab) injection, for intravenous use: prescribing information (boxed warning: hepatitis B
    virus reactivation). South San Francisco (CA): Genentech; revised 2021 Dec.

Guidance checked online or in its own text on 2026-11-14: BSR 2024 (digital-ulcer recommendations i–vii, Raynaud's,
paediatric glucocorticoid note), EULAR 2023 (Table 1), SHARE 2021 (Tables 1–2 and text), ESC/ERS 2022 (CTD screening
recommendations), ACR/CHEST 2023 screening (scope, recommendations, MCTD with SSc features), ACR 2022 vaccination
(guideline summary tables), EULAR/PReS 2021 and EULAR 2022 (abstracts), ACR 2020 (abstract and the ACR release on
GnRH-agonist co-therapy), the rituximab and methotrexate US labels, and the Japanese 2019 MCTD criteria (abstract).

### To verify

**Source pass (against the full article):**

- Every value and its unit: ANA titre and pattern; anti-nRNP grading; which antibodies are listed as negative; RF
  in the text and in Table 1; complement; CRP 0.5 and 9.5 mg/L; platelets 164 and 123 × 10⁹/L; the B-cell count unit
  and method; AST, LDH and HBDH (285 vs 258) with units; **CK 56 vs 556**, and whether the text calls the CK raised.
- The CT wording (小泡样 vs "cystic"; both upper lobes; the technique) and the lung-function values (FVC, DLCO).
- Whether the skin tightness is described as progressive (越来越紧) and whether calcinosis is at the finger joints.
- The order and timing of glucocorticoids, immunoglobulin (and its route), cyclophosphamide and methotrexate relative
  to this admission, and their doses; whether any vasodilator, wound care or surgical review is recorded.
- The rituximab doses, interval and premedication; any screening or vaccination before it; what continued alongside.
- After rituximab: ANA (text) vs ENA (Table 1); the timing of the Table 1 values; whether the thumb healed; the course
  of the stiffness; the chest film's comparison.
- The admission setting (ward) and whether vital signs, weight or blood pressure are given; the diagnosis wording
  (难治性儿童混合结缔组织病) and the criteria the authors used.
- Figure 1's content and caption, so its title stays spoiler-free.

**Clinician of the specialty (paediatric rheumatology) to confirm:**

- That same-day IV iloprost is the keyed rescue for a dry necrotic thumb in a 16-year-old (and the acceptability of
  sildenafil alone), and the time window used for the critical item (admission and first-results stages).
- The Japanese 2019 MCTD criteria's item lists and their note for children and adolescents (that one overlap category
  suffices), checked here only against a reproduction of the table; the case's teaching does not depend on that note.
- Applying adult guidance to a 16-year-old where no paediatric guidance exists: EULAR 2022 infection screening,
  ACR/CHEST 2023 ILD screening (excludes paediatric SARDs), ESC/ERS 2022 PAH screening, EULAR 2023 SSc treatment.
- Rituximab as the keyed escalation (with mycophenolate accepted) for refractory MCTD with scleroderma features, ILD
  considered and digital necrosis; whether tocilizumab or IVIG should be named.
- The classification of `steroid-escalation`, `live-vaccine` and `discharge-gloves` as non-critical and of
  `amputation-now` and rituximab-before-screening as critical.
- The ACR 2020 GnRH-agonist recommendation wording (checked against the ACR release, not the full text).

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- **Template defects replaced:** three decisions of three options with role-named ids (`supported`, `correct`) →
  five decisions of four options at the real decision points (the necrotic digit, the antibody pattern, the organ
  screen, refractory disease, the pre-rituximab checklist), ids naming the content, own feedback with guidance;
  15 generic history slots with "the source does not provide" answers → 27 items in her own words (8 required, 17
  unknown in voice: "I'm not sure, doctor."), with the plain openers reaching the presenting complaint; a template
  companion "(educational role)" removed (she answers for herself); no interventions → 18 (the report's treatments,
  today's steps, tempting errors with guideline-named harms); hindsight critical item (`rb-safety` = a first-try
  answer) → three critical acts done in time (`rb-digit-rescue`, `rb-screen-escalation`, `rb-no-harm`).
- **Safety fixes:** the digit is treated as an emergency on day one (IV iloprost, warmth, protection; BSR 2024),
  premature amputation and discharge are harms; rituximab is contraindicated until the infection screen is ordered
  (critical); live vaccines are a harm; pregnancy testing and a confidential adolescent conversation precede
  teratogenic drugs.
- **Records:** split by test and staged by phase (orders per phase, placeholders that say so); the text/Table 1
  discrepancies kept in neutral in-world wording ("case notes" / "results table"); a 1.0.0 record name that implied
  immunoglobulin values removed; absent results written "No result is recorded for this test."; tests a learner
  would order now added without results (kidney function, NT-proBNP, infection screen, immunoglobulins, pregnancy
  test, antiphospholipid antibodies).
- **Teaching:** dated, guideline-attributed teaching points (BSR 2024, EULAR 2023, SHARE 2021, ESC/ERS 2022,
  ACR/CHEST 2023, EULAR 2022, EULAR/PReS 2021, ACR 2022, ACR 2020, Japanese 2019 criteria); attending, nurse, hand
  surgeon and respiratory consultant; 59-utterance matcher corpus; this facilitator guide.
- **Review status:** editorial (AI-assisted); `extensions.sourceTextChecked: false`.

### 1.0.0

Template version generated for the collection (2026-10-28): four phases, 15 history slots (eight unknown answered in
authoring language), two examination findings, five combined records, three single-choice decisions of three options,
no interventions, a critical rubric item met by a first-try answer, and a 36-utterance corpus. Its facts are the fact
base of 1.1.0.

## Validation

Run from the worktree root on 2026-11-14:

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-860885/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-860885 --lang en                                                 # 95 steps · objectives 6/6 · decisions 5/5 · utterances 59/59 · rubric 37/37 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-860885                                       # reference 100 % · do nothing 0/33 · wrong first 59 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-860885:"              # passes
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-860885:"  # passes (en + zh-CN)
```

## 中文摘要

**病例概要：** 16岁7个月女孩，手脚发凉6年，手指僵硬2年、伸不直，双手和前臂皮肤越来越紧，右手溃疡1个月；查体右拇指
1×2 cm干燥坏死区、左足第4趾皮肤发绀、雷诺现象阳性、甲床苍白，指、肘伸展受限而无肿胀，指关节、肘和膝有钙质沉着及
部分色素脱失。ANA 1:10000（颗粒型）、抗nRNP ++、抗SSA +，抗Sm、dsDNA、Scl-70、Jo-1阴性；CK一处56 U/L、一处556并标记
升高；肺功能为限制性通气障碍，CT考虑间质病变并有食管扩张，心超未见肺动脉高压；皮肤活检符合硬皮病样改变，肌肉明显
变性伴血管扩张。报告诊断为难治性儿童混合结缔组织病：激素、免疫球蛋白、环磷酰胺和甲氨蝶呤后无明显改善，加用两次
利妥昔单抗后雷诺改善、拇指坏死未再加重；随访1年没有过敏或感染的记录，远期疗效和安全性仍不确定。事实沿用1.0.0版的
提取，尚未对照原文全文核对；尚未经执业医师审核。

**学习目标：** 把新发指端坏死当作当天抢救的急症（保暖、保护、止痛、静脉伊洛前列素；BSR 2024，EULAR 2023）；把高滴度
颗粒型ANA加抗U1-RNP解读为混合结缔组织病模式，矛盾的CK带参考区间复查；用含DLCO的肺功能、HRCT和超声心动图筛查器官
（SHARE 2021，ESC/ERS 2022）；难治时换用利妥昔单抗或吗替麦考酚酯（SHARE 2021，EULAR 2023）；清除B细胞前完成乙肝等
感染筛查和疫苗安排（利妥昔单抗说明书，EULAR 2022，EULAR/PReS 2021，ACR 2022）；与青少年单独、保密地沟通。

**关键决策：** ① 今天怎么处理坏死的拇指（当天扩血管抢救并紧急评估）；② 首批结果最符合哪种解读（抗U1-RNP重叠病）；
③ 需要哪些器官评估（含DLCO的肺功能、HRCT、超声心动图、血压和肾功能）；④ 难治时下一步（筛查后加用利妥昔单抗，
吗替麦考酚酯亦可）；⑤ 利妥昔单抗前的准备（乙肝、丙肝、HIV、IGRA、免疫球蛋白、妊娠试验、灭活疫苗，不打活疫苗）。

**复盘要点：** 指端坏死是急症，病因未明也要先保手指；继发性雷诺靠坏死、硬指、钙质沉着和特异性抗体识别；CRP正常
不能代替器官筛查；单例报告中利妥昔单抗后的好转不能证明疗效，B淋巴细胞0.00、CRP 9.5 mg/L、血小板123×10⁹/L和胸片
仍有间质改变的原因也没有记录。

**安全结果。** 入院即截除坏死拇指（`amputation-now`）和未送感染筛查就用利妥昔单抗（`rituximab`）为危急安全错误，
会使本次安全结果判为不通过；让她出院等门诊、长期大剂量激素和接种活疫苗为非危急的错误，扣除避免伤害项的分数。
