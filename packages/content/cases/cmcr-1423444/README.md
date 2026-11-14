# cmcr-1423444 — Back pain and progressive difficulty walking · 63-year-old man

A published single-patient report re-authored as a ward case (version 1.1.0): a 63-year-old man with hepatitis B
cirrhosis whose back pain and failing walking had been treated as a disc problem. The learner localises the lesion
from the examination, sends the first tests, reads the work-up and then decides what to do about the one medicine he
has taken for five and a half years — without leaving his hepatitis B untreated. The patient facts are those that
version 1.0.0 extracted from the report; they have not yet been checked against the full article (see "Source and
adaptation" and "To verify").

## Case card

| | |
|---|---|
| Setting | Inpatient ward of the general hospital (`general-hospital`); static clock, no physiology model |
| Level | Senior medical student, foundation doctor or resident in internal medicine, neurology, nephrology or hepatology; difficulty 4/5 |
| Time | About 45 minutes (22 history items, 6 examination manoeuvres, 16 investigations, 15 interventions, 5 decisions) |
| The patient | Mr Shi Zhiyuan (施知远, pseudonym), 63, lying in a ward bed, alert and able to answer for himself throughout |
| Specialties | Neurology, nephrology, hepatology, clinical pharmacology |
| What the learner can do | Take the history from him; examine tone, reflexes, plantar and Hoffmann responses, power and gait; order blood, urine, MRI and further tests; read the reports at the records terminal; prescribe, switch or stop medicines; ask hepatology, nephrology and the clinical pharmacist; put falls precautions in place; explain the plan to him; report the reaction; answer five decisions on the case board; read the reported course at the end |
| Review status | Editorial (AI-assisted); not yet reviewed by a licensed clinician; facts not yet checked against the full article |

## Learning outcomes

By the end the learner can:

1. Localise a myelopathy from upper motor neurone signs (tone, reflexes, Babinski and Hoffmann signs) with sphincter
   and sensory symptoms, tell it apart from a lumbar disc problem, and order MRI of the cervical and thoracic cord
   (NICE NG59, 2016).
2. Recognise a generalised proximal tubulopathy from renal glycosuria, low-molecular-weight proteinuria (alpha-1
   microglobulin), a raised NAG, hypophosphataemia and hypouricaemia, and explain why creatinine underestimates it
   (EASL 2025).
3. Identify adefovir as a cause of delayed Fanconi syndrome and osteomalacia from its label (2018), and state the
   monitoring the Chinese 2022 hepatitis B guideline asks for in people taking adefovir or TDF.
4. Switch a patient with hepatitis B cirrhosis from adefovir to entecavir or tenofovir alafenamide on the same day,
   choosing drug and dose by previous lamivudine use and liver function, and explain why stopping antivirals is
   dangerous (EASL 2025; Chinese guideline 2022).
5. Treat the phosphate and bones with oral phosphate and active vitamin D after checking albumin-adjusted calcium,
   magnesium, PTH and vitamin D, and explain why bisphosphonates and NSAIDs are avoided here.
6. Assess causality with the WHO-UMC system, separating a probable tubular reaction from an unproven neurological
   mechanism; report the reaction and explain the plan to the patient with teach-back.

## Clinical summary (spoilers)

A 63-year-old man with hepatitis B cirrhosis, oesophageal varices (banded) and an enlarged spleen had taken adefovir
dipivoxil continuously for five and a half years. For a year and a half he had low back pain and progressively harder
walking ("like treading on cotton wool"); numbness in his legs began earlier — first the left foot, then the right
leg. He had occasional urinary incontinence and a tight, band-like feeling in his chest. Massage and physiotherapy for
a presumed lumbar disc problem had not helped.

- **Examination:** increased tone in both legs, brisk knee reflexes, Babinski and Hoffmann signs positive on both
  sides, power grade V, a slightly wide-based gait needing support.
- **Blood:** phosphate 0.37 mmol/L, urate 122 μmol/L, calcium 1.97 mmol/L, creatinine 119 μmol/L, fasting glucose
  4.5 mmol/L (no reference intervals recorded).
- **Urine:** glucose positive, protein positive, alpha-1 microglobulin 257.8 mg/L (reference 0–12.8), NAG 90 U/L
  (reference 2–20).
- **MRI:** no extramedullary space-occupying lesion at the thoracic level; mild degenerative change.
- **Neurophysiology:** impaired (blocked) conduction in the deep-sensation pathways of both lower limbs.
- **Course in the report:** adefovir switched to entecavir, with nutritional and bone-metabolism treatment; phosphate
  improved within weeks; walking normal at five months; urine tubular markers fell markedly, some still abnormal. The
  report's title names adefovir dipivoxil–associated Fanconi syndrome with myelopathy and peripheral neuropathy.

The teaching: the signs are those of the spinal cord, not a disc; the blood and urine show a proximal tubulopathy
that a creatinine of 119 μmol/L hides; the cause is the nucleotide antiviral he has taken for years; the remedy is a
same-day switch to an antiviral without that toxicity — never a pause in a cirrhotic liver — plus phosphate and active
vitamin D; and recovery after withdrawal supports the drug's role in the tubulopathy while the neurological mechanism
stays unproven, because the switch and the metabolic treatment came together.

## Scenario timeline and physiology

The clock is static (`clock.mode: "static"`, no `physiology`): a historical report establishes no physiological
response model, and no vital sign, monitor or treatment effect is simulated. Three phases stage the evidence:

| Phase | Opens when | What is there |
|---|---|---|
| `admission` — Admission: back pain and failing walking | At the start | History from Mr Shi; the neurological examination; orders for MRI, blood and urine (their results are "sent"/"requested" here); decision 1 (`lesion-site`); falls precautions |
| `workup` — The work-up results | Objectives `obj-story`, `obj-exam` and `obj-localise` complete: the required history asked, all six manoeuvres done, decision 1 answered, and the spine MRI, blood chemistry and urine tests ordered | Blood chemistry and urine results; the spine MRI report and the neurophysiology report (records); the further tests (all without recorded results); decisions 2–5; the treatment, consults, explanation and report |
| `followup` — The course the report records | All five decisions answered (flat `all` of `decided`) | The outcome record (`outcome`); not learner-switchable |

The `workup` phase waits for the MRI order, so the cord is always imaged before the results are seen; the switch of
antiviral is scored only if done in `workup` after reading the blood and urine results and before reading the outcome
(`indicatedWhen`), so it cannot be earned in hindsight. No figure is attached (the media review approves none for this
case).

## Decisions and assessment

### Objectives (HUD chapters)

| Objective | Complete when |
|---|---|
| `obj-story` — Hear how his walking failed | asked `presenting`, `duration`, `numbness-spread`, `bladder`, `chest-band`, `prior-care`, `liver`, `adefovir` |
| `obj-exam` — Examine his nervous system | examined `leg-tone`, `knee-reflexes`, `plantars`, `hoffmann`, `power`, `gait` |
| `obj-localise` — Decide where the problem lies and send the first tests | decided `lesion-site`; ordered `spine-mri`, `chemistry`, `urine-tubular` (any phase) |
| `obj-results` — Make sense of the results | read `chemistry`, `urine-tubular`, `mri-report`, `neurophysiology` (phase `workup`); decided `tubular-pattern` |
| `obj-treat` — Plan his treatment | decided `antiviral-plan` and `bone-plan`; entecavir or TAF given; ordered `hbv-dna`, `liver-blood`, `bone-profile`; phosphate with active vitamin D given; hepatology and nephrology asked |
| `obj-followup` — Plan the follow-up and review the reported course | decided `causality-followup`; reaction reported; outcome read (phase `followup`) |

No `completeWhen` holds a condition that can become permanently false (no phase leaf, `whenIndicated`,
`decidedFirstTry` or `not`); reads are named by phase because the records are staged.

### Decisions

1. **`lesion-site` (admission).** Opens after the presenting story, the spread of the numbness and the bladder are
   asked and tone, plantars and Hoffmann are examined. Key `cord-mri-and-bloods`: a cord lesion at neck level or above
   with motor and sensory tracts involved — urgent MRI of the cervical and thoracic cord with blood and urine tests
   for metabolic and drug causes. Distractors: lumbar disc → lumbar MRI and an epidural injection (lower motor neurone
   signs expected; NICE NG59 2016 does not recommend spinal injections for back pain); peripheral neuropathy → outpatient
   nerve conduction (cannot give UMN signs or incontinence); hepatic myelopathy labelled without tests (a diagnosis of
   exclusion, usually with little sensory or sphincter involvement). The MRI report in the next phase answers it.
2. **`tubular-pattern` (workup).** Opens once the blood chemistry and urine results of this phase are read and the
   medicine history asked. Key `proximal-tubulopathy-drug`: proximal tubule failure (Fanconi syndrome), most likely
   from adefovir — renal glycosuria at a fasting glucose of 4.5 mmol/L, tubular proteinuria, a raised NAG, low
   phosphate and urate; the label (2018) lists the reaction and its delayed onset; EASL 2025 notes creatinine alone
   may not show tubular damage. Distractors: diabetic kidney disease; hepatorenal syndrome (excluded by the EASL 2018
   HRS-AKI criteria: no nephrotoxic drug, no structural injury); malnutrition with incidental urine changes; myeloma
   light chains first with the antiviral unchanged.
3. **`antiviral-plan` (workup).** Key `switch-etv-or-taf`: stop adefovir and start entecavir the same day (TAF if he
   has had lamivudine), checking HBV DNA, liver function and his earlier drugs — EASL 2025 (TAF preferred in
   hypophosphataemia and renal insufficiency, entecavir the alternative and, after adefovir, only without previous
   lamivudine) and the Chinese 2022 guideline (adefovir or TDF changed to entecavir or TAF when kidney or bone disease
   develops); entecavir 0.5 mg compensated / 1 mg decompensated on an empty stomach, adjusted below a creatinine
   clearance of 50 mL/min; TAF not recommended in Child-Pugh B or C. Distractors: pause all antivirals until the
   kidneys recover (flare risk: up to 25 % exacerbations after stopping, higher decompensation risk in cirrhosis,
   deaths — label 2018; EASL 2025); keep adefovir at a renally adjusted interval; switch to TDF.
4. **`bone-plan` (workup).** Key `oral-phosphate-active-d`: oral phosphate in divided doses with active vitamin D,
   after albumin-adjusted calcium, magnesium, ALP, PTH and vitamin D, and X-rays of painful bones. Distractors:
   zoledronic acid for presumed osteoporosis (osteomalacia is a mineralisation defect; the Reclast label contraindicates
   it in hypocalcaemia and below a creatinine clearance of 35 mL/min, and his calcium cannot be read without the
   albumin); calcium and plain vitamin D only; no supplements because the switch will correct it in days.
5. **`causality-followup` (workup).** Opens after decisions 3 and 4 and the MRI and neurophysiology reports. Key
   `dechallenge-and-search`: follow phosphate, tubular markers, creatinine, HBV DNA and walking for months; recovery
   makes the tubulopathy probably drug-related (WHO-UMC), but other causes of the cord disease still need testing.
   Distractors: deliberate rechallenge; stop tubular follow-up once the phosphate is normal; recovery proves direct
   neurotoxicity; decompression for mild degeneration (no compressive lesion; cervical imaging not recorded).

Every option has feedback of its own; option ids name the content; no key is the uniquely longest option in either
language (measured at authoring: the longest distractor equals or exceeds the key in every decision).

### Rubric (14 deterministic items, weight 34, + 1 examiner-judged)

| Item | Domain | Weight | Met when |
|---|---|---|---|
| `rb-symptom-story` | history | 2 | asked the presenting story, duration, spread of numbness, back pain, bladder, bowels, chest, hands, prior care |
| `rb-drug-history` | history | 2 | asked liver disease, banding, adefovir, earlier hepatitis B drugs, kidney monitoring, other medicines, allergies |
| `rb-neuro-exam` | examination | 2 | all six manoeuvres |
| `rb-localise` | diagnosis | 3 | `decidedFirstTry: lesion-site` |
| `rb-cord-imaging` **critical** | investigations | 3 | spine MRI, blood chemistry and urine tests ordered in `admission` |
| `rb-read-results` | investigations | 2 | the four results/reports read in `workup` |
| `rb-tubular` | diagnosis | 3 | `decidedFirstTry: tubular-pattern` |
| `rb-cause-tests` | investigations | 2 | urine phosphate excretion, blood gas, B12/copper, HIV/syphilis/HTLV-1 ordered |
| `rb-antiviral-plan` | management | 3 | `decidedFirstTry: antiviral-plan` + HBV DNA + liver function/clotting/platelets ordered |
| `rb-switch-in-time` **critical** | management | 4 | entecavir or TAF given `whenIndicated` (in `workup`, after the blood and urine results, before the outcome) |
| `rb-bone` | management | 2 | `decidedFirstTry: bone-plan` + phosphate with active vitamin D + bone profile ordered |
| `rb-causality` | management | 2 | `decidedFirstTry: causality-followup` + reaction reported |
| `rb-team-and-safety` | management | 1 | hepatology, nephrology, pharmacist, falls precautions, explanation with teach-back |
| `rb-no-harm` **critical** | safety | 3 | none of the six harmful interventions given; `scoredWhen` = decision 1 or 3 attempted, or any of the six given |
| `rb-communication` | communication | 1 (judged) | Calgary–Cambridge explanation with teach-back (examiner-judged, no `met`) |

### How wrong choices score (measured 2026-11-14 with the core engine)

| Path | Score | Critical items missed | Safety outcome |
|---|---|---|---|
| Reference `solution` | 34/34 (100 %) | none | passes |
| Start and do nothing | 0/31 (0 %); cannot finish (objectives incomplete) | `rb-cord-imaging`, `rb-switch-in-time` | passes (`rb-no-harm` not scored) |
| Wrong first answer at every decision, then the key | 21/34 (62 %) | none | passes |
| Wrong first at decision 1, 2 or 3 only | 31/34 (91 %) | none | passes |
| Wrong first at decision 4 or 5 only | 32/34 (94 %) | none | passes |
| Reference plus "stop adefovir and hold all hepatitis B treatment" | 31/34 (91 %) | `rb-no-harm` | **fails** (critical safety failure) |
| Reference plus a lumbar epidural steroid injection | 31/34 (91 %) | `rb-no-harm` | **fails** (critical safety failure) |
| Reference plus a switch to TDF | 31/34 (91 %) | `rb-no-harm` | passes (flagged as contraindicated) |
| Reference plus continuing adefovir at an adjusted interval | 31/34 (91 %) | `rb-no-harm` | passes (flagged) |
| Reference plus diclofenac | 31/34 (91 %) | `rb-no-harm` | passes (flagged) |
| Reference plus more massage and spinal manipulation | 31/34 (91 %) | `rb-no-harm` | passes (flagged) |
| Switch made only after reading the outcome record | 30/34 (88 %) | `rb-switch-in-time` | passes |
| Tenofovir alafenamide instead of entecavir | 34/34 (100 %) | none | passes |

**Safety outcome.** Two interventions are `critical: true` (risk high): stopping adefovir with no replacement
(`stop-all-antivirals`) — in cirrhosis a withdrawal flare can cause decompensation and death (Hepsera label 2018;
EASL 2025) — and a lumbar epidural steroid injection (`epidural-injection`) — the wrong level for a cord lesion, and
with cirrhosis, an enlarged spleen and no platelet count or clotting recorded, a puncture risks an epidural haematoma
and permanent paraplegia. Giving either fails the run's safety outcome whatever the score. Four contraindicated steps
are explicitly `critical: false` (risk moderate): switching to TDF, continuing adefovir at an adjusted interval,
diclofenac, and more massage and spinal manipulation — each a recoverable misjudgement the next clinician corrects;
each is flagged in the debrief and costs the critical avoided-harm item `rb-no-harm`.

## Reference path (`solution`)

Start; ask all 22 history items (the eight required ones first among them); examine tone, knee reflexes, plantars,
Hoffmann, power and gait; put falls precautions in place; answer decision 1 (`cord-mri-and-bloods`); order the spine
MRI, blood chemistry and urine tests — the `workup` phase opens; retrieve and read the chemistry, urine, MRI report and
neurophysiology report; answer decision 2; order urine phosphate excretion, blood gas, B12/copper, HIV/syphilis/HTLV-1
serology, protein electrophoresis with free light chains and a bladder scan; ask nephrology, hepatology and the
pharmacist; order HBV DNA and liver function/clotting/platelets; answer decision 3; switch adefovir to entecavir; order
the bone profile and X-rays of the pelvis and painful bones; answer decision 4; start oral phosphate with active vitamin D; explain the plan with teach-back;
report the reaction; answer decision 5 — the `followup` phase opens; read the outcome record; finish. 66 steps; it
gives nothing while contraindicated and has no dose error.

## Clinical numbers check

| Number | Where | Source | Derived values and notes |
|---|---|---|---|
| 63 years, male | patient | 1.0.0 | — |
| 5½ years of continuous adefovir | history `adefovir` | 1.0.0 | Back pain and walking difficulty began about 4 years into treatment (5.5 − 1.5); the numbness began earlier, at a time not recorded |
| 1½ years of back pain and walking difficulty | history `duration` | 1.0.0 ("一年半" / "eighteen months") | — |
| Power grade V | exam `power` | 1.0.0 | MRC grade 5 |
| Phosphate 0.37 mmol/L | `chemistry` (workup) | 1.0.0 | ≈ 1.15 mg/dL; no reference interval recorded — the hypophosphataemia is the report's reading (1.0.0) |
| Urate 122 μmol/L | `chemistry` | 1.0.0 | ≈ 2.05 mg/dL |
| Calcium 1.97 mmol/L | `chemistry` | 1.0.0 | ≈ 7.9 mg/dL; total calcium — albumin not recorded, so no adjusted or ionised value can be derived |
| Creatinine 119 μmol/L | `chemistry` | 1.0.0 | ≈ 1.35 mg/dL; eGFR ≈ 59 mL/min/1.73 m² (CKD-EPI 2021, male, 63) — one value, chronicity unknown, likely an overestimate in cirrhosis; creatinine clearance cannot be calculated (no weight) |
| Fasting glucose 4.5 mmol/L | `chemistry` | 1.0.0 | ≈ 81 mg/dL |
| Urine alpha-1 microglobulin 257.8 mg/L (ref 0–12.8) | `urine-tubular` | 1.0.0 | ≈ 20 × the upper reference limit |
| Urine NAG 90 U/L (ref 2–20) | `urine-tubular` | 1.0.0 | 4.5 × the upper reference limit |
| Walking normal at 5 months; phosphate improved within weeks | `outcome` (followup) | 1.0.0 | — |
| Entecavir 0.5 mg / 1 mg once daily; adjust below CrCl 50 mL/min | intervention `switch-to-entecavir`, decision 3 | Baraclude label (2019) | Not the patient's dose — the report's entecavir dose is not recorded |
| TAF 25 mg once daily with food | intervention `switch-to-taf` (`doseSpec` 25 mg PO) | Vemlidy label (2024) | Not recommended in Child-Pugh B or C |
| Up to 25 % hepatitis exacerbations after stopping adefovir | harm text, decision 3 feedback | Hepsera label (2018), §5.1 | Trial data (ALT ≥ 10 × ULN) |
| HBV DNA every 3–6 months until response | decision 5 feedback | EASL 2025 | — |
| Proteinuria > 500 mg/day; CrCl < 35 mL/min | decision 2 and 4 feedback | EASL 2018 HRS-AKI criteria; Reclast label | Criteria quoted, not patient values |
| Diclofenac 50 mg three times a day | intervention `nsaid` (the tempting wrong step) | A usual adult dose, written so the order reads like a real one | Contraindicated whatever the dose; not given in the reference path |

No vital sign, weight, potassium, bicarbonate, albumin, liver function, HBV DNA or post-switch value is recorded, and
none is supplied.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions:** "How did it feel to be handed 'a disc problem that physiotherapy didn't fix'?"
- **Description:** "Walk us through the signs that told you where the lesion was, and the results that told you why."
- **Analysis:**
  - "Which of his signs can a lumbar disc produce, and which can it not? What does a positive Hoffmann sign add?"
  - "Why is there glucose in his urine with a fasting glucose of 4.5 mmol/L? What do alpha-1 microglobulin and NAG
    measure, and what does a creatinine of 119 μmol/L miss?"
  - "Why did the toxicity show itself after years, not weeks?"
  - "What would have happened to his liver if the antiviral had simply been stopped? How do you choose between entecavir
    and TAF, and what must you find out first (lamivudine, compensation, kidney function)?"
  - "Why oral phosphate with active vitamin D rather than a bisphosphonate or calcium with plain vitamin D?"
  - "What does his recovery prove about the tubule, and what does it not prove about the cord and nerves?"
- **Summary:** "What will you check in the next patient on adefovir or TDF, and what will you say to him about his
  tablets?"

### Common learner errors and how the case surfaces them

| Error | Where it shows |
|---|---|
| Accepting "disc disease" and ordering lumbar imaging, an epidural or more manipulation | Decision 1 distractor; `epidural-injection` (critical) and `spinal-manipulation` interventions; `rb-no-harm` |
| Skipping the Hoffmann sign or the bladder question | Decision 1 gate; `rb-symptom-story`, `rb-neuro-exam` |
| Reading creatinine 119 μmol/L as "kidneys fine" | Decision 2 feedback; nephrology consultant |
| Diagnosing diabetes from glycosuria | Decision 2 distractor (fasting glucose 4.5 mmol/L) |
| Stopping the antiviral "to rest the kidneys" | Decision 3 distractor; `stop-all-antivirals` (critical) |
| Switching to TDF because it is "more potent" | Decision 3 distractor; `switch-to-tdf` |
| Choosing entecavir or its dose without asking about lamivudine and decompensation | Hepatology consultant; `hbv-history` (unknown) and `liver-blood` (no result) |
| NSAIDs for the back pain | `nsaid` intervention; harm names the adefovir label and NICE NG59 |
| Bisphosphonate for "osteoporosis" | Decision 4 distractor |
| Claiming the recovery proves direct neurotoxicity, or proposing rechallenge | Decision 5 distractors |

## Embodied mode

In in-world mode (实景模式) the patient lies in a general-hospital ward bed and answers for himself in every phase (no
`nonVerbalWhen`, no companion). History and examination happen at the bedside. Blood and urine are sent from the ward;
the spine MRI is done in radiology (`mri`, the patient is taken there for the admission order); the bladder scan is at
the bedside; the MRI report, the neurophysiology report and the outcome are records read at the records terminal
(`requires: ["records"]`, `performedAt: "records"`, risk none). The general hospital has no neurophysiology
capability, so the neurophysiology study exists only as its report. Medicines need `medications`; the consults, falls
precautions, explanation and report need no equipment. `caseCapabilityGaps` is empty, and the in-world demonstration
(示范接诊) replays the reference path in en and zh-CN.

## Source and adaptation (fidelity limits)

**Source.** 李璐, 宋红松, 蔡晧东. 阿德福韦酯相关范科尼综合征合并脊髓病及周围神经病. 药物不良反应杂志. 2014;16(1):52-53,
doi:10.3760/cma.j.issn.1008-5734.2014.01.018 (verified in the source map), https://rs.yiigle.com/cmaid/1423444.

**What the facts are.** Version 1.1.0 is re-authored from the facts version 1.0.0 extracted from the report (commit
`88ed0d2`); the full article was not available in the authoring environment, and the check against it is pending
(`extensions.sourceTextChecked: false`). Every patient fact traces to 1.0.0; nothing was added. The extraction:

| 1.0.0 fact | Where it is in 1.1.0 |
|---|---|
| 63-year-old man; back pain and progressive walking difficulty | `patient`, title, `presenting` |
| Back pain, numb legs, walking like stepping on cotton | `presenting` (volunteered), opening line |
| Walking difficulty and back pain for 1½ years; numbness earlier | `duration` |
| Numbness first in the left foot, then the right leg, walking worse | `numbness-spread` |
| Occasional urinary incontinence; tight (band-like) chest sensation | `bladder`, `chest-band` |
| Hepatitis B cirrhosis, varices, splenomegaly | `liver` |
| Oesophageal variceal ligation | `banding` |
| Adefovir dipivoxil continuously for 5½ years | `adefovir` |
| Massage and physiotherapy for presumed disc disease, no improvement | `prior-care` |
| Increased tone in both legs; brisk knee reflexes; bilateral Babinski and Hoffmann signs | exam `leg-tone`, `knee-reflexes`, `plantars`, `hoffmann` |
| Strength grade V; gait slightly broad-based, needing support | exam `power`, `gait`; triage note |
| Phosphate, urate, calcium, creatinine, fasting glucose | `chemistry` (workup) |
| Glycosuria, proteinuria, alpha-1 microglobulin, NAG with references | `urine-tubular` (workup) |
| No thoracic extramedullary mass; mild degenerative change | `mri-report` (workup) |
| Impaired lower-limb deep sensory conduction (双下肢深感觉传导径路阻滞) | `neurophysiology` (workup) |
| Switch to entecavir with nutritional/bone-metabolism support; phosphate improved over weeks; walking normal at 5 months; tubular markers fell markedly, some still abnormal | `outcome` (followup) |
| Article title (the report's diagnosis) | `provenance.citation`, `outcome`, debrief |
| Unknowns in 1.0.0 (allergies, family, exposures, function, red flags, concerns, baseline; fractional phosphate excretion; neurological differential; longer follow-up) | unknown history items, results without values, `unknowns` |

**Inferences (derived, not new):** the 1.0.0 record "MRI and neurophysiology" is split into two reports, with "mild
degenerative change" placed with the MRI; the eGFR, unit conversions and the four-year interval are computed from
recorded values.

**Contradictions and translation differences kept, not resolved:** the neurophysiology record reads 双下肢…阻滞 (both
lower limbs, "blocked") in Chinese and "impaired lower-limb deep sensory conduction" in English — kept as "impaired
(blocked) … of both lower limbs"; the chest sensation is 紧束感 in Chinese and "tight band-like" in English — kept as
"tight, as if bound" in the patient's words and "band-like" in clinical text.

**What 1.0.0 got wrong and 1.1.0 replaces:** a template of three decisions with three options each, no interventions,
fifteen generic history slots with "the source notes do not provide that information" in the patient's mouth, a
critical rubric item that was a decision answered after reading the outcome (creditable in hindsight), a management
key that did not say to switch the antiviral the same day or warn against stopping it, and a single citation (a
generic adefovir label).

**Privacy.** Pseudonym 施知远 / Shi Zhiyuan; no hospital, city, date or identifier; times are relative.

**Labelled teaching devices.** The ward and its staff (Dr Fang, Nurse Tang, Dr Qiu, Dr Yan, Pharmacist Wen — all
pseudonyms) and their dialogue; the three phases and which tests are ordered and reported in each; the "pending"
results in the admission phase; the falls, consult, explanation and reporting steps; Mr Shi's stated worries (they add
no clinical fact); every decision, distractor, intervention and score.

### To verify

What the source pass must check against the full article:

- Every value and its unit (phosphate 0.37 mmol/L, urate 122 μmol/L, calcium 1.97 mmol/L, creatinine 119 μmol/L,
  fasting glucose 4.5 mmol/L, alpha-1 microglobulin 257.8 mg/L with 0–12.8, NAG 90 U/L with 2–20), and any reference
  intervals the article gives for the blood values.
- The timeline: 1½ years of back pain and walking difficulty; how much earlier the numbness began; 5½ years of adefovir
  and its dose; any earlier hepatitis B drugs (lamivudine) or resistance.
- The neurophysiology: which study (evoked potentials, nerve conduction, EMG), whether 阻滞 means block or delay, and
  the nerve-conduction findings behind "peripheral neuropathy" in the title.
- The MRI: which levels were imaged (cervical cord?), whether "mild degeneration" belongs to the MRI, any cord signal
  change, contrast.
- The chest sensation (band-like? at what level?) and whether a sensory level, joint-position or vibration loss, or
  upper-limb signs were recorded.
- Liver status (Child-Pugh, ascites, encephalopathy, bleeding history), HBV DNA, albumin, potassium, bicarbonate, ALP,
  PTH, vitamin D, B12, copper, HIV/syphilis serology, urine phosphate.
- The treatment: entecavir dose, what the "nutritional/bone-metabolism" therapy was (phosphate, calcitriol, calcium,
  vitamins?), the values after the switch, which tubular markers stayed abnormal, and follow-up beyond five months.

What a clinician of the specialties should confirm:

- Hepatology: the keyed switch (entecavir if lamivudine-naive, TAF otherwise; doses by compensation and renal
  function) and the critical status of stopping all antivirals.
- Nephrology: the reading of the tubular markers and creatinine, the phosphate/active vitamin D plan, and the
  zoledronic acid and NSAID cautions.
- Neurology: the localisation teaching (Hoffmann signs, cervical imaging), the myelopathy differential (hepatic,
  nutritional, infective) and the causality framing; the critical status of the epidural injection.

## Matcher notes

47 bilingual test utterances (`extensions.testUtterances`), at least one paraphrase for each of the eight required
items, all 22 history items covered, and three look-alike negatives (a home address, a football team, a taxi). None
repeats a canonical question or a keyword. Exclusions keep apart the timing (`duration`) and the site of the numbness,
the prior treatment and the antiviral history, the bladder and the bowels, current and previous medicines, and daily
life and the daily tablets. English multi-word keywords that reduce to one token are written run together
(`whatbringsyou`, `wheredoesithurt`). Measured: `cases verify` 47/47.

## References

1. 李璐, 宋红松, 蔡晧东. 阿德福韦酯相关范科尼综合征合并脊髓病及周围神经病. 药物不良反应杂志. 2014;16(1):52-53.
   doi:10.3760/cma.j.issn.1008-5734.2014.01.018. Available from: https://rs.yiigle.com/cmaid/1423444
2. European Association for the Study of the Liver. EASL Clinical Practice Guidelines on the management of hepatitis B
   virus infection. J Hepatol. 2025;83(2):502-583. doi:10.1016/j.jhep.2025.03.018
3. 中华医学会肝病学分会, 中华医学会感染病学分会. 慢性乙型肝炎防治指南（2022年版）. 中华肝脏病杂志. 2022;30(12):1309-1331.
4. European Association for the Study of the Liver. EASL Clinical Practice Guidelines for the management of patients
   with decompensated cirrhosis. J Hepatol. 2018;69(2):406-460.
5. Gilead Sciences. HEPSERA (adefovir dipivoxil) tablets, for oral use: prescribing information. Foster City (CA):
   Gilead Sciences; revised 2018 Dec.
6. Bristol-Myers Squibb. BARACLUDE (entecavir) tablets and oral solution: prescribing information. Princeton (NJ):
   Bristol-Myers Squibb; 2019.
7. Gilead Sciences. VEMLIDY (tenofovir alafenamide) tablets, for oral use: prescribing information. Foster City (CA):
   Gilead Sciences; revised 2024 Mar.
8. National Institute for Health and Care Excellence. Low back pain and sciatica in over 16s: assessment and
   management (NICE guideline NG59). London: NICE; 2016.
9. National Institute for Health and Care Excellence. Falls: assessment and prevention in older people and in people 50
   and over at higher risk (NICE guideline NG249). London: NICE; 2025.
10. Uppsala Monitoring Centre. The use of the WHO-UMC system for standardised case causality assessment. Uppsala: WHO
    Collaborating Centre for International Drug Monitoring. Available from: https://who-umc.org/
11. 中华人民共和国卫生部. 药品不良反应报告和监测管理办法（卫生部令第81号）. 2011.

Checked online on 2026-11-14: the EASL 2025 statements (TAF preferred over TDF in hypophosphataemia and renal
insufficiency with ETV as alternative; ETV after adefovir only without previous lamivudine; creatinine alone may not
reflect tubular damage; no NA discontinuation in advanced liver disease before HBsAg loss; HBV DNA every 3–6 months)
and its citation; the Chinese 2022 guideline's recommendation 28 and its advice to change adefovir/TDF to ETV/TAF and to
monitor creatinine and phosphate; the Hepsera label (12/2018) sections 5.1, 5.2 and 6.4; the Baraclude and Vemlidy
dosing; NICE NG59 recommendation 1.3.1 and the manual-therapy recommendation (amended in 2026; check its current
wording); NICE NG249 (April 2025); the EASL 2018 HRS-AKI criteria; the WHO-UMC "probable" category; the Reclast
contraindications; the 2011 ADR provisions (Ministry of Health Order No. 81).

## Changelog

### 1.1.0 — 2026-11-14 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article

- Template removed: 22 case-specific history items in the patient's own words (8 required, 14 unknown or teaching
  items said in character), six examination findings split from 1.0.0's two records, 16 investigations (four with the
  report's results, staged by phase; ten further tests a learner would order now, without recorded results; the
  outcome), 15 interventions (the report's switch and supportive treatment, today's steps, six tempting wrong or
  historical steps with guideline-naming harms), five decisions of four or five options, a 15-item rubric.
- Safety fixes: the antiviral key now switches the same day and the wrong path of stopping all antivirals is a
  critical intervention; an epidural injection for presumed disc disease is a critical intervention; TDF, continued
  adefovir, NSAIDs and manipulation are flagged with their guidance; the hindsight-creditable critical item (a decision
  answered after reading the outcome) is replaced by acts done in time (cord MRI on admission; the switch before the
  outcome) and an avoided-harm item.
- Staging: three phases (admission → work-up results → reported course); the outcome opens only after all decisions.
- Guidance updated to EASL 2025 and the Chinese 2022 hepatitis B guidelines, the current drug labels, NICE NG59/NG249
  and WHO-UMC; the 1.0.0 citation of a generic 2013 adefovir label replaced by the Hepsera label (2018).
- Staff added: internal medicine attending (Socratic, PEARLS), ward nurse (ISBAR), hepatology, nephrology, clinical
  pharmacist.

### 1.0.0 — 2026-10-28

Template version: 15 generic history slots ("the source notes do not provide that information"), two combined
examination records, four chart reviews, no interventions, three decisions of three options with role-named option ids
(`supported`, `alternative-1`), a critical rubric item scored on a decision answered after the outcome, and one
reference guideline.

## Validation

Run from the worktree root (all pass on 2026-11-14):

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-1423444/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-1423444 --lang en                                               # 66 steps, objectives 6/6, decisions 5/5, utterances 47/47, rubric 34/34 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-1423444                                     # reference 100 %, do nothing 0/31, wrong first 62 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-1423444:"            # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-1423444:"  # in-world demonstration, en + zh-CN
```

## 中文摘要

**病例概要：** 63岁男性，乙肝肝硬化（食管静脉曲张已套扎、脾大），连续服用阿德福韦酯五年半。腰痛、行走进行性困难一年半，
双腿发麻更早出现（先左脚、后右腿），偶有小便失禁，胸部有紧束感；按腰椎间盘问题按摩理疗无效。查体：双下肢肌张力增高、
膝反射亢进、双侧Babinski征和Hoffmann征阳性、肌力V级、步基稍宽需搀扶。血磷0.37 mmol/L、尿酸122 μmol/L、钙1.97 mmol/L、
肌酐119 μmol/L、空腹血糖4.5 mmol/L；尿糖、尿蛋白阳性，α1微球蛋白257.8 mg/L、NAG 90 U/L。MRI未见胸段髓外占位、轻度退变；
神经电生理示双下肢深感觉传导径路阻滞。原报告换用恩替卡韦并补充营养和骨代谢治疗，血磷数周内改善，5个月后行走恢复正常，
尿小管指标明显下降但部分仍异常。本版本（1.1.0）的患者事实沿用1.0.0版的提取，尚未对照原文全文核对。

**学习目标：** 根据上运动神经元体征和括约肌、感觉症状定位脊髓病并开出颈、胸段脊髓MRI；识别近端肾小管广泛功能障碍并理解
肌酐的局限；依据说明书认定阿德福韦酯的迟发性肾小管毒性；当天换用恩替卡韦或丙酚替诺福韦而绝不停药；口服补磷加活性维生素D；
用WHO-UMC评价因果、上报不良反应并用复述法与患者沟通。

**关键决策：** ①病变在脊髓（颈髓或更高）而非腰椎间盘，尽快做颈、胸段脊髓MRI并查血尿；②近端肾小管功能障碍（范科尼综合征），
最可能由阿德福韦酯引起；③当天换用恩替卡韦（用过拉米夫定则换TAF），同时查HBV DNA和肝功能，不留空档；④口服补磷加活性维生素D，
先查白蛋白校正钙、镁、甲状旁腺激素和维生素D；⑤追踪数月，小管病可评为“很可能”药物所致，脊髓病的其他原因仍需排查。

**复盘要点：** 腰痛加腿部症状不一定是椎间盘（NICE NG59，2016）；肌酐看不出小管损伤（EASL 2025）；阿德福韦酯说明书（2018）
列有范科尼综合征、低磷和骨软化；换药而不是停药（EASL 2025；我国2022年指南）；撤药后好转支持关联，但证明不了神经受累的机制。

**安全结果。** “停用阿德福韦酯并暂停一切乙肝抗病毒治疗”和“腰椎硬膜外类固醇注射”设为危急操作（`critical: true`）：前者可致
肝硬化患者肝炎加重、失代偿甚至死亡，后者部位错误且血小板和凝血未知、可致硬膜外血肿和永久截瘫，一旦实施，本次运行的安全结果
即为不合格；换用TDF、继续阿德福韦酯、双氯芬酸和继续推拿按摩作为禁忌操作标记，但不单独导致安全结果不合格。
