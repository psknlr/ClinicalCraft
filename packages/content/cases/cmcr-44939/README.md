# cmcr-44939 — Prolonged fever, limp and severe anaemia · girl aged 3 years 9 months

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (孔清和 / Kong Qinghe) is a
> pseudonym; her parent, the attending (曹医生 / Dr Cao), the nurse (林护士 / Nurse Lin) and the paediatric
> oncology consultant (唐医生 / Dr Tang) are teaching roles. The case adapts one published case report; it is not
> medical advice.
> 导师指南，含剧透。患者为化名，家长与医护人物为教学角色；本病例改编自已发表的单例报告，不构成医疗建议。

**Status of the facts.** Version 1.1.0 was re-authored from the facts recorded in version 1.0.0 (commit
`88ed0d2`), the only fact base available in the authoring environment. Those facts have **not yet been checked
against the full source article** (`extensions.sourceTextChecked: false`); the source pass follows when the
article text is available. Everything listed under "To verify" is part of that pass.

## Case card

| Field | Value |
|---|---|
| Setting / facility | Inpatient, children's ward of the general hospital (`general-hospital`) |
| Learner level | Senior medical student, paediatric or orthopaedic trainee; difficulty 4/5 |
| Time | About 40 minutes, plus a 15–20-minute debrief |
| Specialties | Pediatrics, oncology, orthopedics, rheumatology |
| The patient | A girl of 3 years 9 months (15.9 kg) with more than 70 days of fever, a mild limp that came on gradually and pallor; she arrives with a systemic juvenile idiopathic arthritis (JIA) label, and her fever came back while she was still taking the steroids given for it. Her parent gives the history. |
| What the learner can do | Take the history from the parent; examine her (colour, nodes, skin, ankles and feet, figure-four test, power and tone); order and read records and tests; refer, plan and perform a biopsy, transfuse, transfer, meet the family; answer five decisions; talk to the attending, the nurse and the oncology consultant |
| Languages | Simplified Chinese and English (every learner-facing text in both) |
| Review status | Editorial (AI-assisted), not yet reviewed by a licensed clinician; facts not yet checked against the full article |

## Learning outcomes

1. Name the features that make the systemic JIA label unsafe here (no rash at onset, no enlarged lymph nodes,
   platelets as low as 65 × 10⁹/L, an LDH of 1312 U/L, fever returning on steroids) and hold further
   immunosuppression until malignancy, infection and macrophage activation are excluded (EULAR/PReS 2024).
2. Explain why pelvic radiographs without obvious destruction and one negative marrow do not exclude a bone
   tumour, and use the MRI and contrast-enhanced CT findings to decide that tissue is needed (ESMO 2021).
3. Plan the biopsy of a suspected bone sarcoma with a paediatric bone sarcoma team — platelets and clotting first,
   a tract the later resection can remove, samples for histology, molecular testing and culture — and explain the
   harm of an unplanned excision.
4. Judge what a biopsy reported as Ewing tumour without a fusion result, and a PET-CT whose lesions were not each
   sampled, establish; name the molecular confirmation (WHO 2020, ESMO 2021) and staging still needed today.
5. Outline today's treatment pathway — protocol chemotherapy, local control timed by the multidisciplinary team,
   fertility preservation discussed first — and contrast it with the report's course.
6. Explain the diagnosis and its uncertainties to her parent with SPIKES and check understanding by teach-back.

## Clinical summary (spoilers)

A girl aged 3 years 9 months (15.9 kg) had fever for more than 70 days: about 38 °C at first, later up to 39.5 °C,
several times a day. A limp came on gradually (the Chinese record says mild) and she did not want to walk; at first
her joints were not obviously swollen or painful. At the start there was no rash or bleeding spots, no mouth ulcers
and no hair loss. She had been diagnosed with systemic JIA; at another hospital she was given steroids for it, the
fever settled, and it came back while she was still taking them by mouth. About a month of intermittent
anti-infective treatment did not stop the fever getting worse. She had been healthy, had no known contact with TB or
hepatitis, and was vaccinated on schedule. The triage note records marked anaemia.

On examination she looked anaemic with pale lips, had no enlarged superficial lymph nodes and no rash; both ankles
and the backs of both feet were swollen, the figure-four test was positive on both sides, and power and tone were
normal.

The records show haemoglobin 55–80 g/L and platelets 65–199 × 10⁹/L across the recorded results, LDH 1312 U/L,
ESR 140 mm/h and CRP 71 mg/L; multiple autoantibody and viral tests were negative; the marrow showed erythroid
hyperplasia without reported confirmed tumour infiltration. Radiographs showed no obvious bone destruction, but MRI
showed a mass in and around the right ilium with restricted diffusion, and contrast-enhanced CT a mass encasing the
ilium with periosteal reaction and a sacral abnormality.

A right iliac biopsy was reported as **Ewing tumour**, without a fusion gene or other molecular classification.
PET-CT showed multiple bone lesions, reported as metastatic or multicentric; the lesions were not each sampled.
After the diagnosis she was transferred to the haematology department for chemotherapy; the regimen, her response,
survival and function are not reported.

The teaching arc: a fever that settles on steroids proves nothing about its cause; the label lacks the features
that would support it, and the counts, LDH and imaging point to a tumour. Today's practice holds immunosuppression,
gets tissue through a bone sarcoma team with a properly planned biopsy, confirms Ewing sarcoma with a FET–ETS
fusion (a report published in 2012 gave none), completes staging and treats on a current protocol.

## Scenario timeline and physiology

The clock is static (`clock.mode: "static"`, no `physiology`): a historical report establishes no physiological
response model, and no vital sign is recorded. Results are records of the report, placed in the phase in which
they belong; which hospital did each test, and when, is not recorded.

| Phase | Opens when | What it holds |
|---|---|---|
| `admission` — Admission: fever back and a limp | Start | History from the parent (20 items, 6 required) and the examination (6 findings). Today's tests can be ordered (blood film, blood culture, ferritin with triglycerides and liver enzymes, urine catecholamine metabolites, clotting); none has a recorded result. Decision 1 opens once the fever, limp and steroid history are taken and pallor and the ankles and feet examined. |
| `workup` — The results | Decision 1 answered correctly | The report's blood count, ESR and CRP, LDH, autoantibody and viral tests, marrow, radiographs, MRI and contrast-enhanced CT. Decision 2 opens once the count, marrow and the three imaging records are read; decision 3 follows it. Referral, transfusion and the biopsy are done here. |
| `diagnosis` — After the biopsy | Decisions 2 and 3 answered and a biopsy done (the planned biopsy, or the unplanned excision) | The biopsy report and PET-CT; fusion testing and chest CT can be ordered (no recorded result). Decisions 4 and 5; family meeting, fertility discussion and transfer. |
| `outcome` — The reported course (`learnerSwitchable: false`) | All five decisions answered | The transfer and follow-up record. |

## Decisions and assessment

### Objectives (HUD chapters)

| Objective | Completes when |
|---|---|
| Take the history from her parent | Presenting complaint, fever course, limp, steroid response and skin and mouth at onset asked |
| Examine her | Pallor, lymph nodes, ankles and feet, figure-four test examined |
| Decide the next step | Decision 1 answered |
| Make sense of the results | Blood count, marrow, radiographs, MRI and CT read (workup) and decision 2 answered |
| Plan the route to a diagnosis | Decision 3 answered and a biopsy (or the excision) done |
| Interpret the findings and agree a plan | Decisions 4 and 5 answered and the outcome record read |

No objective holds a condition that can become false for good (no phase leaf, no `whenIndicated`, no
`decidedFirstTry`); the contract replays each reference step done late and the case still finishes.

### Decisions

1. **`first-step` — next step on admission** (admission). Key: `investigate-before-escalating` — treat the systemic
   JIA label as unproven, no higher steroid dose or new immunosuppressant, and look first for malignancy, infection
   and macrophage activation (count and film, cultures, ferritin, marrow, hip and pelvic imaging). Why: ILAR needs at
   least one of rash, generalised lymphadenopathy, hepatosplenomegaly or serositis besides arthritis and fever — she
   had no rash and no nodes, the others are not recorded; NICE NG12 asks for a very urgent count in a child with
   pallor or unexplained fever; EULAR/PReS 2024 asks for mimics to be considered because glucocorticoids or
   immunomodulators can harm when the diagnosis is wrong. Distractors: steroid pulses then methotrexate; an IL-1/IL-6
   inhibitor now (the preferred drug once the diagnosis is established — EULAR/PReS 2024 recommendation 7); ciclosporin
   and high-dose steroids for presumed MAS before the tests that would show it.
2. **`imaging-meaning` — the results together** (workup). Key: `tissue-needed` — an iliac mass with periosteal
   reaction is a bone tumour until shown otherwise; at her age metastatic neuroblastoma, Ewing sarcoma, lymphoma or
   Langerhans cell histiocytosis; normal films and one marrow exclude none of them; osteomyelitis remains possible.
   Why: ESMO 2021 (MRI whenever radiographs cannot exclude malignancy; under 5 years a destructive lesion is most often
   metastatic neuroblastoma or LCH); ESPID 2017 (subacute osteomyelitis can mimic malignancy and usually needs a
   biopsy). Distractors: reactive change of JIA, a pelvic abscess to drain without bone tissue, anaemia of
   inflammation with malignancy "excluded".
3. **`tissue-route` — how tissue is obtained** (workup). Key: `sarcoma-team-core-biopsy` — refer to the paediatric
   oncology and bone sarcoma team first; an image-guided core biopsy along a tract the resection can remove, after
   platelets and clotting, with samples for histology, molecular tests and culture. Why: ESMO 2021 biopsy principles.
   Distractors: open excision or curettage by the local team, a second marrow only, a fine-needle aspirate by the
   shortest route without the surgeon.
4. **`what-is-proven` — what the biopsy and PET-CT establish** (diagnosis). Key: `confirm-fusion-complete-staging`
   — Ewing sarcoma with multiple bone lesions is likely, but an EWSR1 (FET)–ETS fusion is still needed and staging
   needs a chest CT and a biopsy of any lesion that would change the plan. Why: ESMO 2021 (molecular confirmation
   mandatory; staging), WHO 2020 (CIC- and BCOR-sarcomas set apart). Distractors: every avid bone a proven metastasis
   so palliation only; histology enough and PET settles the stage; the other lesions multifocal osteomyelitis.
5. **`treatment-plan` — what happens next** (diagnosis). Key: `protocol-chemo-mdt` — a paediatric oncology team on a
   current Ewing protocol, chemotherapy first, local control of the pelvis decided by the sarcoma team, fertility
   preservation discussed before treatment. Why: ESMO 2021 (induction, local therapy timed by the MDT, consolidation,
   10–12 months; fertility consultation for girls); NHC 2019 (80–90 % relapse with local treatment alone).
   Distractors: resection first, radiotherapy alone, comfort care only.

Each option has its own feedback; option ids name the content; no key is the uniquely longest option in either
language (measured).

### Rubric (13 deterministic items, weight 36, + 1 examiner-judged)

| Item | Domain | Weight | Met when |
|---|---|---|---|
| `rb-history` | history | 3 | Presenting complaint, fever course, limp, steroid response, anti-infective treatment, skin and mouth at onset, night pain, weight and sweats, steroid details asked |
| `rb-exam` | examination | 2 | All six findings examined |
| `rb-first-step` | diagnosis | 3 | Decision 1 right at the first attempt |
| `rb-first-tests` | investigations | 2 | Blood film, blood culture, urine catecholamine metabolites, ferritin/triglycerides/liver enzymes ordered |
| `rb-records` | investigations | 2 | All nine workup records read |
| `rb-imaging` | diagnosis | 3 | Decision 2 right at the first attempt |
| `rb-tissue-route` | management | 3 | Decision 3 right at the first attempt |
| `rb-referral-first` | management | 2 | Referral given before any biopsy or excision (`whenIndicated`) |
| `rb-biopsy-in-time` | management | 4 | **Critical.** The planned biopsy given while indicated: after the referral, after the blood count was read and with clotting sent (`whenIndicated`) |
| `rb-no-critical-harm` | safety | 4 | **Critical.** No methylprednisolone pulse and no unplanned excision; counts once decision 1 is attempted or either act is given |
| `rb-no-blind-treatment` | safety | 2 | No IL-1/IL-6 inhibitor, no antibiotics while contraindicated (before cultures and the biopsy), no transfusion while contraindicated (before the count is read); counts once decision 1 is attempted or any of these is given |
| `rb-evidence` | diagnosis | 3 | Decision 4 right at the first attempt, fusion testing and chest CT ordered |
| `rb-plan` | management | 3 | Decision 5 right at the first attempt, transfer given while indicated (after the biopsy report is read), fertility discussion and family meeting |
| `rb-communication` | communication | 1 | Examiner-judged (Calgary–Cambridge; SPIKES for the diagnosis; teach-back), excluded from the deterministic total |

### How wrong choices score (measured 2026-11-14 with core `assess`)

| Path | Score | Critical items missed | Safety outcome |
|---|---|---|---|
| Reference path (`solution`) | 36/36 (100 %) | none | passed |
| Do nothing (start, then try to finish) | 0/30 (finish refused: objectives incomplete) | `rb-biopsy-in-time` | passed |
| A wrong first answer at every decision, then the right one | 21/36 (58 %) | none | passed |
| A wrong first answer at one decision only (any of the five) | 33/36 (92 %) | none | passed |
| Reference + methylprednisolone pulse on admission | 32/36 (89 %) | `rb-no-critical-harm` | **failed** |
| Reference + methylprednisolone pulse after the biopsy report is read | 32/36 (89 %) | `rb-no-critical-harm` | passed (no longer contraindicated) |
| Reference + IL-1/IL-6 inhibitor on admission | 34/36 (94 %) | none | passed |
| Reference + open excision before the planned biopsy | 32/36 (89 %) | `rb-no-critical-harm` | **failed** |
| Open excision instead of the planned biopsy | 28/36 (78 %) | `rb-biopsy-in-time`, `rb-no-critical-harm` | **failed** |
| Reference + empirical antibiotics before cultures and biopsy | 34/36 (94 %) | none | passed |
| Reference + transfusion before the blood count is read | 34/36 (94 %) | none | passed |
| Reference + transfer for chemotherapy before the biopsy (the later transfer is refused: one only) | 33/36 (92 %) | none | passed |
| Biopsy on admission, before the blood count is read (the later one is refused) | 30/36 (83 %) | `rb-biopsy-in-time` | passed |
| No referral to the sarcoma team, or the referral only after the biopsy | 30/36 (83 %) | `rb-biopsy-in-time` | passed |

Contraindicated acts are listed as safety events in every debrief.

**Safety outcome.** Two interventions are `critical: true`. `methylpred-pulse` (IV methylprednisolone pulse for
"refractory systemic JIA") is contraindicated until the biopsy report is read: pulsed steroids before a tissue
diagnosis can mask the fever and partly treat a leukaemia or lymphoma, delaying and blurring the diagnosis
(EULAR/PReS 2024 warns that glucocorticoids can be deleterious when Still's disease is misdiagnosed, particularly in
malignancy). `open-excision` (open excision or curettage of the iliac mass by the local team) is always
contraindicated: an unplanned intralesional procedure contaminates the surrounding tissue and can rule out a later
resection with clear margins (ESMO 2021). Giving either while contraindicated fails the assessment's safety outcome
(`safety.passed: false`) whatever the score. `il-blockade` is high risk and explicitly `critical: false`: starting an
IL-1/IL-6 inhibitor before the diagnosis delays it and blunts fever and CRP, a serious but recoverable misjudgement.
`planned-biopsy` (before the count is read), `rbc-transfusion` (before the count is read), `transfer-oncology`
(before the biopsy report) and `empirical-antibiotics` (before cultures and the biopsy) are moderate risk and
`critical: false`; each costs marks.

## Reference path (`solution`)

70 steps: start → ask all 20 history items → examine all six findings → order blood film, blood culture,
ferritin/triglycerides/liver enzymes (`mas-screen`), urine catecholamine metabolites and clotting →
decision 1 (`investigate-before-escalating`) → read the nine workup records → decision 2 (`tissue-needed`) →
refer to the oncology and bone sarcoma team → transfuse against today's haemoglobin → decision 3
(`sarcoma-team-core-biopsy`) → planned biopsy → read the biopsy report and PET-CT → order fusion testing and chest
CT → decision 4 (`confirm-fusion-complete-staging`) → family meeting, fertility discussion, transfer →
decision 5 (`protocol-chemo-mdt`) → read the outcome record → finish. `cases verify` gives no contraindicated act,
no dose error and no safety gate holding.

## Clinical numbers check

| Number | Where | Source (1.0.0) | Derived / note |
|---|---|---|---|
| 45 months (3 years 9 months), female | patient, title | patient.age, sex | — |
| 15.9 kg | patient.weightKg, history `weight`, nurse, triage | patient.weightKg | The 1.0.0 README says weights were not reconstructed: To verify |
| Fever more than 70 days | chief complaint, history, conclusion | chief complaint, history | > 10 weeks, well beyond the 2 weeks of the ILAR and PRINTO criteria |
| About 38 °C at first, later up to 39.5 °C, several times a day | history `fever-course` | history | EULAR/PReS 2024's operational definition describes spiking fever ≥ 39 °C for ≥ 7 days |
| About a month of intermittent anti-infective treatment | history `anti-infection` | history (近一个月) | Its timing against the steroid course is not recorded |
| Haemoglobin 55–80 g/L | `fbc` | blood | Range across the recorded results; dates, order and reference intervals not recorded. 55 g/L is below the BSH 2016 threshold of 70 g/L for a stable child (70–80 g/L reasonable in paediatric oncology) |
| Platelets 65–199 × 10⁹/L | `fbc`, decision 3 prompt | blood | The lowest value is below the usual lower reference limit of 150 × 10⁹/L; today's count is needed before a biopsy |
| LDH 1312 U/L | `ldh` | blood | Reference interval not recorded; ESMO 2021 lists LDH among the baseline tests with prognostic value in Ewing sarcoma |
| ESR 140 mm/h; CRP 71 mg/L | `esr-crp` | blood | Reference intervals not recorded |
| Transfusion volume (illustration only) | README | — | BSH 2016: volume (mL) = (target − actual Hb, g/L) × weight (kg) × 4 / 10, aiming no more than 20 g/L above the threshold. If today's Hb were 55 g/L with a target of 90 g/L: 35 × 15.9 × 0.4 ≈ 223 mL. Today's Hb is not recorded, so the case states no volume |
| "Under 5 years" | decision 2, consultant, teaching point | ESMO 2021 | She is 3 years 9 months |
| 80–90 % relapse with local treatment alone | decision 5 feedback | NHC 2019 guideline | — |
| Under 10 % 5-year survival without systemic treatment (historical series); 10–12 months of treatment | decision 5 feedback, consultant | ESMO 2021 | No survival figure is applied to her: her lesions' nature, the fusion and her treatment are not recorded |

No drug dose is given anywhere in the case: the report's steroid and antibiotic doses are not recorded, and the
wrong-step medicines are named without doses.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions.** "How did it feel to question a diagnosis another hospital had already made?"
- **Description.** "Walk me through what you knew on admission, before any result came back."
- **Analysis.**
  - "Which features does she have of systemic JIA, and which are missing? What does a fever that settles on
    steroids tell you about its cause?"
  - "Platelets as low as 65 × 10⁹/L and an LDH of 1312 U/L: what do they make you think of in a limping 3-year-old?
    What would make you think of macrophage activation instead, and how would you test it?"
  - "The films show no obvious destruction. Why did that not end the search?"
  - "Who should take the biopsy, along what route, and what must be known first? What happens when an excision is
    done first?"
  - "What does a 'Ewing tumour' report without a fusion result establish today? What would a CIC-rearranged sarcoma
    change?"
  - "How would you tell her parent?"
- **Summary.** "Name one thing you will do differently the next time a child arrives with a rheumatological label
  that does not quite fit."

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it |
|---|---|
| Accepting the label and escalating steroids | Decision 1 distractor; `methylpred-pulse` is a critical safety failure before the biopsy report, and the attending asks what the label rests on |
| Starting a biologic because guidelines prefer it to steroids | Decision 1 distractor; `il-blockade` costs `rb-no-blind-treatment`; feedback cites EULAR/PReS 2024 recommendation 7 ("when the diagnosis is established") |
| Reassured by normal-looking films or one negative marrow | Decision 2 distractors |
| Biopsy by whoever is available, or excision for "diagnosis and treatment" | Decision 3 distractors; `open-excision` fails the safety outcome; a biopsy without the referral, before the count is read or without clotting sent misses the critical `rb-biopsy-in-time` |
| Repeating blind antibiotics | `empirical-antibiotics` costs marks before cultures and the biopsy |
| Treating PET avidity as histology, or histology as complete | Decision 4 distractors |
| Surgery first, radiotherapy alone, or comfort care only | Decision 5 distractors |
| Stopping steroids abruptly | The attending and decision 1 feedback: ask the dose and duration first, plan any reduction and tell the anaesthetist |

## Embodied mode

The patient lies in a bed on the children's ward of the general hospital (child stature, gown); her parent sits
beside her (adult companion, `answersHistory: true`, no `presentation`: the record does not say which parent). She
is 3 years 9 months, so no `nonVerbalWhen` is needed; every history question goes to the parent. The report's
results are records (`performedAt: "records"`, `requires: ["records"]`, risk none) read at a records terminal or in
the notes at the bedside. Today's tests are ordered in the usual way: blood film, clotting (`lab-hematology`),
ferritin/triglycerides/liver enzymes and urine catecholamine metabolites (`lab-chemistry`), blood culture
(`lab-microbiology`), chest CT (`ct`, a transport to the CT room) and fusion testing (`molecular`); none has a
recorded result. Interventions need `blood-bank` and `iv-access` (transfusion), `medications` (the wrong-step
medicines) and `surgery` (the unplanned excision); the referral, biopsy, family meeting, fertility discussion and
transfer need nothing. `caseCapabilityGaps` is empty, and the in-world demonstration finishes in both locales.

## Source and adaptation (fidelity limits)

**Source.** 王新宁, 苏改秀, 吴凤岐. 小儿右髂骨尤文肉瘤误诊为幼年特发性关节炎一例. 中华儿科杂志. 2012;50(11):866-867.
DOI 10.3760/cma.j.issn.0578-1310.2012.11.017 (verified against publisher metadata on 2026-10-29, source map
`scripts/cmcr-105-sources.json`). No figure of this case is approved in the media review, so the case has none.

**Facts.** Version 1.1.0's facts are version 1.0.0's extraction; the check against the full article is pending.
Every patient fact traces to 1.0.0 and nothing was added:

| 1.0.0 fact | 1.1.0 |
|---|---|
| Girl, 45 months; weight 15.9 kg | patient; history `weight`; triage; nurse |
| Fever over 70 days; about 38 °C at first, later up to 39.5 °C, several times a day | chief complaint; `presenting-complaint`; `fever-course`; opening line |
| Gradual (zh: mild) limp, reluctance to walk; no obvious joint swelling or pain at first | `limp`; chief complaint |
| Previously diagnosed systemic JIA | triage; `jia-label` |
| Steroids for JIA at another hospital; fever settled, recurred during continued oral treatment | `steroid-response`; triage |
| Marked anaemia (triage); severe anaemia (title) | triage; title |
| No rash or bleeding spots, oral ulcers or hair loss at onset | `skin-mouth` |
| About a month of intermittent anti-infective treatment; fever still worsened | `anti-infection` |
| Previously healthy; TB and hepatitis contact denied; vaccinated on schedule | `past-health`; `tb-hepatitis-contact`; `vaccines` |
| Allergies, family history, operations, regular medicines, exposures, function, concerns, other admissions not recorded | unknown items (`allergies`, `steroid-details`, `family-history`, `exposures`, `concerns`) and the fallback answer |
| Anaemic look, pale lips; no superficial lymphadenopathy; no rash now | exam `pallor`, `lymph-nodes`, `skin` |
| Both ankles and dorsa of feet swollen; figure-four positive on both sides; normal power and tone | exam `ankles-feet`, `figure-four`, `power-tone` |
| Hb 55–80 g/L; platelets 65–199 × 10⁹/L; LDH 1312 U/L; ESR 140 mm/h; CRP 71 mg/L | `fbc`, `ldh`, `esr-crp` |
| Multiple autoantibody (en: antibody) and viral tests negative | `autoantibodies`, `viral-studies` |
| Marrow erythroid hyperplasia, no confirmed tumour infiltration reported | `marrow` |
| MRI right iliac and peri-iliac mass, restricted diffusion; radiographs no obvious destruction; (zh: contrast-enhanced) CT mass encasing the ilium, periosteal reaction, sacral abnormality | `mri`, `radiographs`, `ct` |
| Right iliac biopsy: Ewing tumour, no fusion gene or modern classification | `biopsy` |
| PET-CT multiple bone lesions, metastatic or multicentric, not each sampled | `pet-ct` |
| Transferred to haematology (zh) for chemotherapy; response, survival, function not reported | `outcome` |

**Inferences (derived, not new).** That the steroid course preceded the biopsy (she was treated for JIA until the
biopsy gave another diagnosis); that platelets of 65 × 10⁹/L are thrombocytopenia; that 70 days exceed the
two weeks of the classification criteria; the BSH transfusion illustration.

**Contradictions and differences kept** (each listed under To verify): the limp is "mild" (轻度) in Chinese only;
"autoantibodies" (自身抗体) in Chinese, "antibodies" in English; "contrast-enhanced CT" (增强CT) in Chinese only;
the steroids "at another hospital" (外院) and the transfer "to the haematology department" (血液科) in Chinese only;
the weight 15.9 kg in case.json against the 1.0.0 README line that weights were not reconstructed; "近一个月" read as
both "about a month" and "the last month"; severe anaemia (title) and marked anaemia (triage). The Chinese details
are used in both languages; the ambiguous ones are worded neutrally.

**What 1.0.0 got wrong and 1.1.0 replaced.** Three decisions of three options, no interventions, fifteen generic
history slots answered with "the source does not provide", a critical item scored on a decision alone, one
guideline (the NCI PDQ summary), and steroid teaching only in the feedback of the last decision, which opened after
the biopsy result was available. 1.1.0 adds the decision on admission, the reading of the imaging, the biopsy route and what the
results establish, ten interventions (today's steps and the tempting wrong ones), and critical items that are acts.

**Teaching devices (not facts of the report).** The phases and the records staged in them; the records terminal;
the parent as speaker (1.0.0 records only a companion of role "parent"); the attending, nurse and oncology
consultant and their words; today's tests, which have no recorded result; the referral, planned biopsy, transfusion,
family meeting and fertility discussion as acts of today's practice (the report records a right iliac biopsy, a
PET-CT and the transfer for chemotherapy, not who planned the biopsy or how it was taken); the wrong-step
interventions and their narrated consequences.

**Privacy.** No dates, hospitals, cities or names; bilingual pseudonym 孔清和 / Kong Qinghe, unique in the library.

## Matcher notes

- The plain openers ("What brings you in today?", "What happened?", "What's the problem?", "Tell me what's been
  going on.", "How long has this been going on?", "When did it start?"; 这次怎么了？哪里不舒服？怎么回事？有什么不舒服？
  多久了？什么时候开始的？) all reach `presenting-complaint` in the first phase (probed with `matchHistory`).
- Look-alikes separated with `excludeKeywords`: fever pattern against steroid, antibiotic and rash questions
  (`fever-course`); the steroid response against the dose (`steroid-response` / `steroid-details`); the weight against
  weight loss (`weight` / `weight-loss-sweats`); night pain against joint pain (`night-pain` / `limp`); transfusion
  against transfer (`rbc-transfusion` / `transfer-oncology`).
- Multi-word keywords that the normaliser would reduce to one word are written run together ("whatbringsyou").
- Orders: "CT" alone matches nothing (pelvis or chest must be named); "clotting screen" reaches only the coagulation
  screen (a run-together "NGS" alias was removed because it matched inside "clottingscreen"); ANA, bone scan,
  urinalysis are not in the case.
- Corpus: 46 utterances (26 en, 20 zh-CN), 4 look-alike negatives ("Does she have a cough?", "Has she been
  vomiting?", 她咳嗽吗？, 有没有呕吐？), at least one paraphrase for every required item; none repeats a canonical
  question or a keyword. `cases verify`: 46/46.

## References

1. 王新宁, 苏改秀, 吴凤岐. 小儿右髂骨尤文肉瘤误诊为幼年特发性关节炎一例. 中华儿科杂志. 2012;50(11):866-867.
   doi:10.3760/cma.j.issn.0578-1310.2012.11.017. Available from: https://rs.yiigle.com/cmaid/44939
2. Fautrel B, Mitrovic S, De Matteis A, et al. EULAR/PReS recommendations for the diagnosis and management of
   Still's disease, comprising systemic juvenile idiopathic arthritis and adult-onset Still's disease. Ann Rheum Dis.
   2024;83(12):1614-1627. doi:10.1136/ard-2024-225851
3. Onel KB, Horton DB, Lovell DJ, et al. 2021 American College of Rheumatology guideline for the treatment of
   juvenile idiopathic arthritis: therapeutic approaches for oligoarthritis, temporomandibular joint arthritis, and
   systemic juvenile idiopathic arthritis. Arthritis Rheumatol. 2022;74(4):553-569. doi:10.1002/art.42037
4. Petty RE, Southwood TR, Manners P, et al. International League of Associations for Rheumatology classification of
   juvenile idiopathic arthritis: second revision, Edmonton, 2001. J Rheumatol. 2004;31(2):390-392.
5. National Institute for Health and Care Excellence. Suspected cancer: recognition and referral. NICE guideline
   NG12. London: NICE; 2015 (last updated 15 April 2026). Available from: https://www.nice.org.uk/guidance/ng12
6. Strauss SJ, Frezza AM, Abecassis N, et al. Bone sarcomas: ESMO–EURACAN–GENTURIS–ERN PaedCan Clinical Practice
   Guideline for diagnosis, treatment and follow-up. Ann Oncol. 2021;32(12):1520-1536.
   doi:10.1016/j.annonc.2021.08.1995
7. WHO Classification of Tumours Editorial Board. Soft tissue and bone tumours. 5th ed. Lyon: International Agency
   for Research on Cancer; 2020. (WHO classification of tumours series; vol. 3).
8. 国家卫生健康委员会. 儿童及青少年尤文肉瘤诊疗规范（2019年版）. 北京: 国家卫生健康委员会; 2019. Available from:
   https://www.gov.cn/zhengce/zhengceku/2019-11/15/5452452/files/e02943aaccad42789c0b359594e65f9d.pdf
9. Saavedra-Lozano J, Falup-Pecurariu O, Faust SN, et al. Bone and joint infections. Pediatr Infect Dis J.
   2017;36(8):788-799. doi:10.1097/INF.0000000000001635
10. New HV, Berryman J, Bolton-Maggs PHB, et al. Guidelines on transfusion for fetuses, neonates and older children.
    Br J Haematol. 2016;175(5):784-828. doi:10.1111/bjh.14233
11. Baile WF, Buckman R, Lenzi R, Glober G, Beale EA, Kudelka AP. SPIKES—a six-step protocol for delivering bad news:
    application to the patient with cancer. Oncologist. 2000;5(4):302-311. doi:10.1634/theoncologist.5-4-302

**Guidance check (2026-11-14, AI-assisted).** Each statement the case attributes was found in the guideline's own
text: ESMO 2021 (author manuscript, sections on diagnosis, staging and Ewing sarcoma: radiographs then MRI of the
whole compartment; under 5 years metastatic neuroblastoma or LCH; reference-centre referral and biopsy by the
resecting team or an interventional radiologist after discussion; tract marked and removed; molecular confirmation
mandatory [V, A]; marrow not mandated with PET-CT [V, C]; intralesional surgery to be avoided; induction, local
therapy timed by the MDT, consolidation, 10–12 months; fertility consultation for female patients; multiple bone
metastases poorer than lung metastases; under 10 % survival without systemic treatment); EULAR/PReS 2024
(recommendations 1, 3, 6, 7 and 10, the text on glucocorticoids in misdiagnosis, Table 2 with the ILAR and PRINTO
criteria, supplementary tables 1–2); ACR 2021 (recommendations for systemic JIA without MAS); NICE NG12 (PDF, last
updated 15 April 2026: recommendations 1.10.2, 1.10.3, 1.11.2, 1.11.3, 1.12.1); ESPID 2017 (blood culture before
antibiotics; subacute osteomyelitis confused with malignancy); BSH 2016 (thresholds and the volume formula); NHC 2019
(clotting function known before treatment; EWSR1 testing where available by FISH with PCR confirmation; 80–90 %
relapse with local treatment alone). DOIs were
checked against Crossref. The WHO 2020 classification statements were checked in secondary sources and in ESMO
2021's text, not in the WHO volume itself.

### To verify

For the source pass (against the full article):

1. Every fact of the extraction table above, and what 1.0.0 dropped (vital signs, white cell count, the steroid and
   antibiotic names and doses, the immunohistochemistry, the PET-CT sites, the treatment).
2. The limp: "mild" (轻度) appears only in the Chinese 1.0.0 text; confirm it, and which side she limped on.
3. "Autoantibodies" (Chinese) or "antibodies" (English); which were tested; which viral tests.
4. Whether the CT was contrast-enhanced (Chinese only) and whether it names the right side.
5. Whether the steroids were given at another hospital (Chinese only), the drug, dose and duration, and whether she
   was still taking them on admission.
6. The weight of 15.9 kg (in case.json; the 1.0.0 README says weights were not reconstructed).
7. "近一个月" — about a month, or the last month — and when the antibiotics were given relative to the steroids.
8. Whether the transfer was to the haematology department (Chinese only), and the chemotherapy regimen.
9. The order and place of the tests (the marrow relative to the steroids; the PET-CT relative to the biopsy; which
   were done at the other hospital).
10. Whether the marrow was an aspirate or a trephine, and how the biopsy was taken.

For a clinician of the specialty (paediatric oncology, with paediatric rheumatology):

11. The key of decision 1 (hold escalation; MAS work-up alongside the malignancy work-up) and the attending's advice
    not to stop steroids abruptly.
12. Whether `methylpred-pulse` should stay critical after the biopsy report (it is not contraindicated then) and
    whether `il-blockade` is rightly non-critical.
13. The biopsy preconditions in `planned-biopsy` (count read, clotting sent, referral first) and the transfusion
    thresholds quoted from BSH 2016 for a child with cancer.
14. The teaching that Ewing sarcoma at 3 years is uncommon and that neuroblastoma and LCH lead the differential under
    5 years (ESMO 2021 wording), and the absence of any survival figure for her.

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- Replaced the template: four phases staged by the learner's acts (decisions 2–3 and an actual biopsy open the
  diagnosis phase; all five decisions open the outcome); 20 history items in the parent's own words (6 required, 9
  honestly unknown) instead of fifteen generic slots answered with "the source does not provide"; six examination
  findings split from two; nineteen investigations (the report's results split into twelve records, plus seven of
  today's tests without recorded results) instead of five grouped records.
- Five decisions of four options at the real decision points (on admission, the imaging, the biopsy route, what the
  results establish, the treatment plan), each with its own feedback and named guidance, opening before the result
  that answers it.
- Ten interventions: the report's management (biopsy, transfer for chemotherapy), today's steps (referral to a bone
  sarcoma team before any tissue, transfusion against a measured haemoglobin, fertility discussion, family meeting)
  and the tempting wrong ones (steroid pulse, IL-1/IL-6 inhibitor, unplanned excision, blind antibiotics), each wrong
  one with a harm text naming its guidance; `methylpred-pulse` and `open-excision` are `critical: true`.
- Safety fixes: in 1.0.0 the only teaching on steroids came after the biopsy result (management decision feedback);
  1.1.0 asks it on admission, keys holding immunosuppression until tissue is obtained, makes a steroid pulse before
  the biopsy result a critical safety failure and teaches against stopping steroids abruptly. The critical
  item is now an act done in time (the planned biopsy after referral, count and clotting) plus the avoided harms,
  not a decision.
- Guidance: EULAR/PReS 2024, ACR 2021, ILAR (Petty 2004), NICE NG12 (2015, updated 2026), ESMO–EURACAN–GENTURIS–ERN
  PaedCan 2021, WHO 2020, NHC 2019, ESPID 2017, BSH 2016 and SPIKES, each checked in its own text.
- Debrief: conclusion, five key reasoning steps, six teaching points (all dated and attributed), seven unknowns;
  attending (Socratic, PEARLS), nurse (ISBAR) and paediatric oncology consultant; 46-utterance matcher corpus.

### 1.0.0

Template version (2026-10-28): three decisions of three options, no interventions, fifteen generic history items
(eight answered "the source case does not provide that information"), two examination findings, five grouped
records, a critical item scored on the management decision alone, one cited authority (NCI PDQ), and 36 corpus
utterances built from topic labels.

## Validation

Run from the worktree root (all passed on 2026-11-14):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-44939/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-44939 --lang en             # 70 steps · objectives 6/6 · decisions 5/5 · utterances 46/46 · rubric 36/36 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-44939   # depth floor, do-nothing 0/30, wrong-first 58 % < 100 %, patient voice
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-44939:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-44939:"  # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 3岁9个月女孩，体重15.9 kg。发热70余天，起初38℃左右，后来最高39.5℃、每天数次；逐渐出现轻度跛行、不愿
走路，起初关节无明显肿痛；起病时无皮疹、出血点、口腔溃疡或脱发。曾被诊断为全身型幼年特发性关节炎，外院用激素后热退，
继续口服期间又发热；近一个月间断抗感染，发热仍加重。既往健康，否认结核、肝炎接触，按计划接种疫苗；分诊记录贫血明显。
查体：贫血貌、口唇苍白，浅表淋巴结不大，当前无皮疹，双踝、足背肿，双侧“4”字征阳性，肌力、肌张力正常。血红蛋白55–80 g/L，
血小板65–199×10⁹/L，乳酸脱氢酶1312 U/L，血沉140 mm/h，C反应蛋白71 mg/L；多项自身抗体和病毒学检查阴性；骨髓红系增生，
未报告确诊的肿瘤浸润。平片未见明显骨质破坏；MRI示右髂骨及周围包块、弥散受限；增强CT示包绕髂骨的肿块、骨膜反应和骶骨异常。
右髂骨活检报告为尤文瘤，未给出融合基因等分子分型；PET-CT示多部位骨病灶，考虑转移或多中心，未逐个取材。确诊后转血液科化疗，
疗效、生存和功能结局没有报告。本版事实沿用1.0.0版的提取内容，尚未对照原文全文核对。

**学习目标。**
1. 说出使全身型JIA诊断站不住脚的表现，并在排除肿瘤、感染和巨噬细胞活化综合征之前不加强免疫抑制（EULAR/PReS 2024）。
2. 解释骨盆平片阴性和一次骨髓阴性为什么排除不了骨肿瘤，并依据MRI和增强CT判断需要组织（ESMO 2021）。
3. 与儿童骨肉瘤团队规划活检：先查血小板和凝血，穿刺道可随日后手术切除，标本送病理、分子检测和培养；说明擅自切除的危害。
4. 判断“尤文瘤、无融合基因”的活检和未逐个取材的PET-CT能确定什么，说出还需要的分子确认（WHO 2020、ESMO 2021）和分期。
5. 概述今天的治疗路径（按方案化疗、多学科团队决定局部治疗时机、治疗前讨论生育力保存），并与原报告对比。
6. 用SPIKES向家长说明诊断和不确定之处，用回授法确认理解。

**关键决策。** ① 入院时：把全身型JIA当作未经证实的诊断，暂不加强激素和免疫抑制，先查肿瘤、感染和巨噬细胞活化综合征（干扰项：
激素冲击加甲氨蝶呤、立即用IL-1/IL-6抑制剂、按巨噬细胞活化综合征直接用环孢素）；② 综合解读：髂骨包块伴骨膜反应在证实前按骨肿瘤
对待，平片正常和一次骨髓阴性都排除不了，需要组织（干扰项：JIA反应性改变、脓肿引流、炎症性贫血）；③ 取材：先转诊儿童肿瘤及
骨肉瘤团队，查血小板和凝血后做规划好的影像引导粗针活检（干扰项：本院切开切除、只复查骨髓、细针穿刺）；④ 结果能确定什么：
尤文肉瘤伴多发骨病灶很可能，但还需EWSR1（FET）–ETS融合确认、胸部CT和对关键病灶活检（干扰项：直接姑息、病理已足够、其余为骨髓炎）；
⑤ 治疗：儿童肿瘤团队按现行方案先化疗，再由骨肉瘤团队决定局部治疗，治疗前讨论生育力保存（干扰项：先手术、单纯放疗、只做舒适照护）。
关键项：经转诊、看过血常规并送检凝血之后按规划完成活检；避免激素冲击和擅自切除。

**复盘要点（PEARLS）。** 先谈感受；复述入院时已知的信息；分析：这个“关节炎”标签有什么依据、缺了什么，激素退热说明不了什么；
血小板低、乳酸脱氢酶高在跛行的幼儿意味着什么，巨噬细胞活化综合征要怎样查；平片阴性为什么不能终止检查；活检该由谁、怎样做，
先切除会怎样；没有融合基因结果的“尤文瘤”今天能确定什么（ESMO 2021、WHO 2020；我国2019年规范也建议有条件时做EWSR1检测）；
怎样告诉家长。最后总结：遇到“不太对劲”的风湿标签时，下次先做什么。本病例为人工智能辅助编写、经编辑审核的教学材料，尚未经
执业医师审核。

**安全结果。** `methylpred-pulse`（在调阅活检报告之前做激素冲击）和 `open-excision`（本院骨科擅自切开切除或刮除髂骨包块）
标为 `critical: true`：给予即判安全结果不通过（`safety.passed: false`），无论得分多少；`il-blockade` 为高风险但 `critical: false`。
