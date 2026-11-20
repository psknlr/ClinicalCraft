# cmcr-857933 — Recurrent haemoptysis and progressive breathlessness · 42-year-old woman

> **Spoilers — facilitator guide.** This file names the diagnosis. Learners open the case from the case library,
> where the title, summary, chief complaint, tags, triage note and objective titles give nothing away.

**Published-case adaptation, re-authored from the recorded facts.** The case follows one published report from the
CMCR additional collection (docs/CMCR_105_CASES.md): 李楠, 王广发, 章巍, 张红, 张晓明. 腔内介入治疗弥漫性气管支气管淀粉样变性一例.
中华结核和呼吸杂志. 2013;36(7):540-542. Version 1.1.0 re-authors the case to the clinical content standard **from the facts
that version 1.0.0 extracted from the report**; the full article was not available, so **none of these facts has yet
been checked against the full source article** (STANDARD §6). The patient (陶予宁 / Tao Yuning) is a pseudonym; the ward
nurse (乔护士 / Nurse Qiao), the attending (严医生 / Dr Yan), the interventional pulmonologist (石医生 / Dr Shi) and the
haematologist (秦医生 / Dr Qin) are invented teaching roles. Hospitals and calendar dates are removed. What 1.0.0 does not
record stays unknown.

## Case card

| | |
|---|---|
| id / version | `cmcr-857933` / `1.1.0` |
| setting / facility | `inpatient` / `general-hospital` (a ward bed; the follow-up phase is in an outpatient consulting room) |
| specialty | respiratory medicine, haematology |
| difficulty | 4 / 5 |
| estimated time | about 40 min (static clock: four record phases, no simulated time) |
| languages | `zh-CN` (source language), `en` |
| review status | `editorial` — AI-assisted teaching design with an editorial review against the cited guidance (2026-10-30) and an independent review (2026-11-14), with some guideline statements still to be checked against the full texts (see To verify); the patient facts are those extracted for 1.0.0 and **not yet checked against the full source article**; **not yet reviewed by a licensed clinician** — have a respiratory physician (with haematology input) review it before teaching use |
| phases | `admission` 入院评估 / Admission assessment → `procedure` 操作之后 / After the procedure → `treatment` 治疗决策 / Treatment decisions → `followup` 随访与记录的结局 / Follow-up and recorded outcome (outpatient) — all one-way, none learner-switchable |
| content | 24 history items (11 recorded facts, 1 labelled teaching device, 12 unknown; 8 required) · 6 examination findings (all recorded, admission only) · 20 investigations (7 record reviews; 10 without a recorded result) · 12 interventions (5 contraindicated, 1 of them critical; 3 neutral) · 6 objectives · 4 decisions (19 options) · 12 rubric items (11 deterministic, weight 26; 1 examiner-judged; 2 critical) · 4 staff · 6 learning outcomes · 5 teaching points · 53 test utterances |

## Learning outcomes

After the case the learner can:

1. Localise airflow obstruction from the flow–volume loop and gas transfer, recognising a fixed upper-airway pattern
   with a preserved diffusing capacity as central-airway obstruction for imaging and endoscopy to confirm (ERS/ATS 2022).
2. Arrange tissue sampling of a severely narrowed airway that has recently bled, safely — blood count, clotting and pregnancy status
   first, then general anaesthesia with the interventional team, a rigid bronchoscope, bleeding control and ECG
   monitoring (Chinese Thoracic Society consensus on benign central airway stenosis, 2017).
3. Interpret Congo red and light-chain staining of an airway biopsy and state what else is needed before calling AL
   amyloid localised: typing by mass spectrometry, serum and urine immunofixation with free light chains, a marrow
   examination and organ assessment (Chinese AL amyloidosis guideline, 2021).
4. Assess frequent ventricular ectopy and non-sustained ventricular tachycardia in a patient with amyloid for cardiac
   involvement, even with a normal ejection fraction (ESC 2021 position statement on cardiac amyloidosis; ESC 2022
   ventricular arrhythmias).
5. Choose local treatment for localised airway amyloidosis — staged rigid bronchoscopic recanalisation, external-beam
   radiotherapy for recurrence — and keep chemotherapy for proven systemic AL (BSH 2015; EHA-ISA 2023).
6. Contrast the reported course — rigid bronchoscopic treatment, a tracheostomy and systemic drugs together — with
   current practice, and explain why a single report cannot show which treatment worked.

These are the case's `learningOutcomes` (shown before play only on request; listed in every debrief). The six HUD
`objectives` below are the in-game task list.

## Clinical summary (spoilers)

**Presentation.** A 42-year-old woman is admitted with ten years of intermittent haemoptysis — blood-streaked sputum
about once a year — and six months of breathlessness that has worsened over the past month, during which the
haemoptysis has returned. She can lie flat at night, has had no fever this time, and her appetite, energy and weight are
unchanged. An irregular heart rhythm was found at an earlier check-up and not treated. She does not smoke or drink and
has been exposed to chlorine-based cleaning products. On examination: coarse breath sounds without wheezes or crackles,
a resonant percussion note, a central trachea, no clubbing, no leg oedema and no enlarged superficial lymph nodes. No
vital signs or oxygen saturation are recorded.

**Records at admission.** Chest CT: irregular thickening and calcification of the walls of the trachea and multiple
large bronchi with widespread uneven narrowing; segmental atelectasis in the right upper lobe. Lung function: a **fixed
upper-airway obstruction pattern** on the flow–volume loop; FEV₁ 1.45 L (55.7 % of predicted); FEV₁/FVC 50.77 %;
diffusing capacity 89.4 % of predicted. Rhythm: **frequent ventricular premature beats and short runs of ventricular
tachycardia**; LVEF 60 %. Urine protein negative; liver and renal function normal.

**Bronchoscopy and biopsy.** Extensive mucosal proliferation along the airway, at its narrowest **about 10 % of the
normal calibre**, bleeding easily. Histology: amorphous material, **Congo red positive, strongly λ positive**. Serum and
urine immunofixation: **no monoclonal band**. **No bone marrow examination was done.** No free light chains, tissue
typing, cardiac biomarkers or cardiac imaging beyond the LVEF are recorded.

**Diagnosis.** Diffuse tracheobronchial amyloidosis (λ light-chain staining, i.e. probable AL type) with severe
central-airway stenosis; systemic disease was not demonstrated, but the systemic assessment was incomplete.

**Reported course.** Repeated rigid bronchoscopy, electrocautery and cryotherapy (whether the last two were given
through the rigid bronchoscope is not recorded), a tracheostomy, and systemic drugs — named in 1.0.0's teaching text as combination chemotherapy with melphalan and thalidomide; regimen, doses and
duration not recorded. The tracheostomy tube was removed after 7 months and FEV₁ rose to 1.71 L; at 11 months she had
no breathlessness or haemoptysis and could manage light physical activity. What the 7 and 11 months are counted from
is not recorded.

**Today's answer.** Read the loop and the CT together (central-airway wall disease); sample it under general
anaesthesia with the interventional team and a rigid bronchoscope ready, ECG monitoring for her ventricular arrhythmia,
and blood count, clotting and pregnancy status checked first; confirm the amyloid type and complete the systemic screen
(free light chains, marrow, NT-proBNP, troponin and cardiac imaging); treat localised disease locally — staged rigid
recanalisation, radiotherapy for recurrence — and keep chemotherapy for proven systemic AL. The report's addition of
systemic drugs to the bronchoscopic treatment is the historical contrast the debrief draws.

## Scenario timeline (staged evidence by phase)

- **Static clock, no physiology** (the collection contract: `clock.mode: "static"`, no `physiology`). Results are
  immediate; interventions are scored for appropriateness but change nothing — the course is the recorded one. There is
  no monitor baseline; no vital sign is recorded.
- **Four one-way phases** (none learner-switchable; a later phase can be selected again once reached):
  - `admission` — her history in her own words (11 recorded facts, 12 honest unknowns, 1 labelled worry), the six
    examination findings, and the records the case stages at admission: the **chest CT** and **lung function** (record
    reviews, decision 1), the **rhythm record** and **LVEF record** (record reviews, decision 2), and the urine protein
    and liver and renal function (labs with recorded results). Blood count and clotting, electrolytes, a pregnancy test,
    sputum for tuberculosis, cardiac biomarkers, cardiac MRI and PET-CT can be ordered and answer honestly that no
    result is recorded. Decisions 1 and 2, then a **committed bronchoscopy act**: the interventional referral (or the
    harmful sedated flexible bronchoscopy).
  - `procedure` — opens once the bedside, localisation and safe-sampling objectives are done (`enterWhen`:
    `obj-bedside`, `obj-localise`, `obj-safe-sampling`; the last needs decision 2 **and** one of the two bronchoscopy
    acts). The **bronchoscopy record** and the **airway biopsy** become readable (record reviews); immunofixation and a
    bone marrow request return "no result yet at this point". Decision 3 (select all).
  - `treatment` — opens once `obj-tissue` (both reads and decision 3) is done: **serum and urine immunofixation** (no
    monoclonal band), the **bone marrow** record ("no result is recorded: no marrow examination was done"), the urine,
    liver–renal, rhythm and LVEF records again, and honest "no result recorded" answers for free light chains, tissue
    typing, cardiac biomarkers, cardiac MRI and PET-CT. Decision 4, then a **committed treatment act** (recanalisation,
    tracheostomy, radiotherapy referral, chemotherapy or stents).
  - `followup` — opens once all five earlier objectives and all four decisions are done, and moves her to an
    outpatient consulting room (`location: {setting: "outpatient"}`, a staging convention): her status at follow-up
    (phase twin `status-followup`) and the **reported course and outcome** record, with the report's figure 1.
- **Staging conventions.** 1.0.0 gives no dates. The case shows the CT, lung function, rhythm, LVEF, urine and
  liver–renal results at admission (1.0.0's "workup" records), the bronchoscopy and biopsy after the procedure, and the
  immunofixation and the marrow record with the treatment decision (1.0.0 bundled them with the biopsy); the urine,
  liver–renal, rhythm and LVEF results are repeated unchanged in `treatment` so that they can be re-read there (one
  set of results is recorded). No prompt, hint, order response or harm text states a later phase's result before its
  record opens; the responses of the report's own treatments (recanalisation, tracheostomy, chemotherapy) say that the
  report records them, as STANDARD §1.7 asks, once the learner has chosen them — without the outcome's timings or
  values, which stay in the outcome record.

## Decisions and assessment

### Objectives (HUD task list)

| id | title | complete when |
|---|---|---|
| `obj-bedside` | 问清咳血与憋气的经过并查体 / Take the bleeding and breathlessness history and examine her | presentation, bleeding pattern, recent bleeding, breathlessness course, lying flat and fever asked; lungs auscultated and trachea checked |
| `obj-localise` | 读懂胸部 CT 和肺功能 / Make sense of the chest CT and lung function | CT and lung function read (phase `admission`), decision 1 answered |
| `obj-safe-sampling` | 安排下一步检查并保证安全 / Plan the next test and keep her safe | rhythm and LVEF records read (`admission`), decision 2 answered, and a bronchoscopy act (interventional referral or sedated flexible bronchoscopy) |
| `obj-tissue` | 解读气道所见 / Interpret the airway findings | bronchoscopy and biopsy read (`procedure`), decision 3 answered |
| `obj-treatment` | 补齐评估并制订治疗计划 / Complete the assessment and plan her treatment | immunofixation and marrow records read (`treatment`), decision 4 answered, and a treatment act |
| `obj-outcome` | 回顾记录的病程与结局 / Review her recorded course and outcome | her follow-up status asked and the outcome record read (`followup`) |

No `completeWhen` holds a phase leaf, `whenIndicated`, `decidedFirstTry` or `not`; the contract's late-learner check
(every order and intervention of the reference path skipped and done late) finds no trap.

### Decisions

| # | id | kind | unlocks after | key (content id) | distractors (content ids) |
|---|---|---|---|---|---|
| 1 | `localisation` | single | bleeding pattern and breathlessness course asked, lungs auscultated, CT and lung function read (`admission`) | `airway-wall-bronchoscopy` — fixed central-airway obstruction from tracheobronchial wall disease; bronchoscopy with biopsy | `irritant-asthma` (chlorine-induced asthma, ICS–formoterol), `tb-stenosis` (empirical anti-TB treatment), `irritant-copd` (bronchodilators) |
| 2 | `sampling-plan` | single | decision 1; rhythm and LVEF records read (`admission`) | `ga-rigid-backup` — blood count, clotting and pregnancy status first; general anaesthesia with the interventional team and an anaesthetist, rigid bronchoscope, bleeding control, ECG monitoring with a defibrillator | `flexible-sedated` (the dangerous error), `tracheostomy-first`, `arrhythmia-first` (weeks of amiodarone loading), `skip-bronchoscopy` (CT/PET-CT diagnosis) |
| 3 | `tissue-next-steps` | select all | decision 2; bronchoscopy and biopsy read (`procedure`) | `tissue-typing`, `clone-screen` (IFE + free light chains + marrow), `organ-screen` (NT-proBNP, troponin, strain echo or CMR, urine protein, liver tests) | `pet-staging`, `ttr-gene-first` |
| 4 | `treatment-plan` | single | decision 3; immunofixation and marrow records read (`treatment`); urine and liver–renal results read (either phase) | `local-airway-treatment` — staged rigid recanalisation, radiotherapy if it recurs, complete the screen, no chemotherapy unless systemic AL is proven | `melphalan-thalidomide` (the report's own historical choice), `metal-stents`, `watch-and-wait`, `tracheal-resection` |

Every option has its own feedback of two to four sentences naming the guidance (body and year) and the reason. Each
decision opens before the record that would give its answer away: decision 1 before any tissue, decision 2 before the
bronchoscopy record (which opens only after a committed act), decision 3 before the immunofixation and marrow records,
decision 4 before the outcome. **Length cue:** measured with the generator — in no single-best decision is the key the
uniquely longest option in either language (decision 1 key 39 of 35–42 zh characters and 133 of 111–142 en; decision 2
58 of 44–60 and 219 of 189–220; decision 4 52 of 35–53 and 186 of 159–187).

### Rubric (11 deterministic items, total weight 26, + 1 examiner-judged)

| id | domain | weight | met when |
|---|---|---:|---|
| `rb-symptom-history` | history | 2 | presentation, bleeding pattern, recent bleeding, amount (unknown), breathlessness course, lying flat, fever, noisy breathing (unknown), appetite and weight asked |
| `rb-background-history` | history | 1 | earlier rhythm problem, smoking and alcohol, irritant exposure, tuberculosis, medicines, allergies, pregnancy asked (the last four unknown — asking is the competency) |
| `rb-examination` | examination | 1 | auscultation, percussion, trachea, clubbing, leg oedema, lymph nodes |
| `rb-workup-before-procedure` | investigations | 2 | CT, lung function, rhythm and LVEF records read in `admission`; blood count/clotting and pregnancy test **ordered in `admission`** (before the procedure) |
| `rb-localisation` | diagnosis | 3 | decision 1 right first time |
| `rb-safe-bronchoscopy` | management | 4 | **critical** — decision 2 right first time **and** `ip-bronchoscopy` given while indicated (`indicatedWhen: {phase: "admission"}`, scored `whenIndicated`) |
| `rb-no-sedated-flexible` | safety | 3 | **critical** — no `flexible-sedation-biopsy`; scored once decision 2 is attempted or the procedure is given |
| `rb-tissue-and-screen` | investigations | 2 | bronchoscopy and biopsy read (`procedure`), immunofixation and marrow read (`treatment`), free light chains and cardiac biomarkers ordered |
| `rb-localised-or-systemic` | diagnosis | 3 | decision 3 right first time |
| `rb-treatment-plan` | management | 3 | decision 4 right first time; `rigid-recanalisation`, `haematology-referral` and `cardiology-referral` each given while indicated (after the relevant record, **before the outcome record is read**) |
| `rb-no-unfounded-treatment` | safety | 2 | no empirical anti-TB treatment, asthma inhaler, chemotherapy or metallic stents; scored once decision 1 or 4 is attempted or any of the four is given |
| `rb-communication` | communication | (judged) | Calgary–Cambridge, written for her: the plan and consent for a general-anaesthetic bronchoscopy, a tactful pregnancy question, "amyloid" in plain words, why the judgement is provisional, why no chemotherapy, safety-netting, teach-back |

### How wrong choices score (measured with the reducer, 2026-11-13)

| path | deterministic score | critical items missed | safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 26/26 (100 %) | none | passed |
| start and finish at once (finish refused: objectives incomplete) | 0/21 | `rb-safe-bronchoscopy` | passed |
| wrong first answer at all four decisions, then right | 13/26 (50 %) | `rb-safe-bronchoscopy` | passed |
| wrong first answer at decision 1 only | 23/26 (88 %) | none | passed |
| wrong first answer at decision 2 only | 22/26 (85 %) | `rb-safe-bronchoscopy` | passed |
| wrong first answer at decision 3 only | 23/26 (88 %) | none | passed |
| wrong first answer at decision 4 only | 23/26 (88 %) | none | passed |
| sedated flexible bronchoscopy instead of the interventional referral | 19/26 (73 %) | `rb-safe-bronchoscopy`, `rb-no-sedated-flexible` | **failed** |
| … and the interventional referral made afterwards (phase `procedure`) | 19/26 (73 %) | both | **failed** |
| reference path plus sedated flexible bronchoscopy before the referral (it opens the next phase first) | 19/26 (73 %) | both | **failed** |
| reference path plus chemotherapy, metallic stents, empirical anti-TB treatment or ICS–formoterol (each alone) | 24/26 (92 %) | none | passed |
| radiotherapy referral as the treatment act, recanalisation booked only after the outcome record | 23/26 (88 %) | none | passed |
| reference path without the haematology and cardiology referrals | 23/26 (88 %) | none | passed |
| reference path without the blood count/clotting and pregnancy orders | 24/26 (92 %) | none | passed |
| reference path without any bronchoscopy act: the procedure phase never opens and the case cannot be finished | 14/26 (54 %) | `rb-safe-bronchoscopy` | passed |

Decisions are scored with `decidedFirstTry`, so guessing through the options costs the item; doing nothing earns 0
(both avoided-harm items have `scoredWhen` listing every harmful act and the decision that exposes it). **Timing of the
critical act.** The bronchoscopy record opens only after a committed bronchoscopy act, and `ip-bronchoscopy` counts only
while the case is still in `admission` (`whenIndicated`), so the referral cannot be credited after the bronchoscopy
findings — a learner who first sends her for sedated flexible bronchoscopy opens the next phase with the dangerous act
and can no longer meet the critical item. The treatment act is timed the same way: `rigid-recanalisation`, and both
referrals, count only before the outcome record is read. **Known limit:** the history, examination and pre-procedure
orders are not time-gated beyond the phase leaves named above; debrief the order of acts from the transcript.

### Critical items

`rb-safe-bronchoscopy` (the missed life-saving act: committing to a sampling plan with airway rescue **and** making the
referral before the bronchoscopy findings exist) and `rb-no-sedated-flexible` (the dangerous error). Both are acts;
neither reads a final-phase record.

**Safety outcome.** `flexible-sedation-biopsy` is `critical: true`: sedated flexible bronchoscopy with forceps biopsies
in a widely narrowed, bleeding central airway, away from a rigid bronchoscope and jet ventilation, risks asphyxia, so
giving it fails the assessment's safety outcome (`safety.passed: false`) whatever the score. `systemic-chemotherapy` and
`metal-stents` are `risk: "high"` with `critical: false`: serious misjudgements that a multidisciplinary team would stop
before harm, scored through `rb-no-unfounded-treatment`. The other two harmful steps (empirical anti-TB treatment, an
asthma inhaler) are low or moderate risk.

## Reference path (`solution`)

78 steps, static clock: start → presentation, bleeding pattern, recent bleeding and its amount, breathlessness course,
lying flat, fever, noisy breathing, voice, cough and sputum, exertion, appetite and weight, earlier rhythm problem,
palpitations or blackouts, other illnesses, tuberculosis, smoking and alcohol, irritant exposure, medicines, allergies,
pregnancy, family, her worry → the six examination manoeuvres → **chest CT** and **lung function** records, sputum for
tuberculosis (no result recorded) → `localisation` → **rhythm** and **LVEF** records, urine protein, liver and renal
function, **blood count and clotting**, electrolytes, **pregnancy test**, cardiac biomarkers (no results recorded) →
**cardiology referral** → `sampling-plan` → **interventional referral for general-anaesthetic bronchoscopy** → (phase
`procedure`) bronchoscopy record, biopsy → **haematology referral** → `tissue-next-steps` (three options) → (phase
`treatment`) immunofixation, bone marrow record, free light chains, tissue typing, cardiac biomarkers (no results
recorded) → `treatment-plan` → **rigid bronchoscopic recanalisation** → (phase `followup`) her status → outcome record →
finish. `cases verify` passes: objectives 6/6, decisions 4/4, utterances 53/53, rubric 26/26. It asks only what a
clinician would ask a 42-year-old woman before a general anaesthetic and possible teratogenic drugs, and gives nothing
while contraindicated.

## Clinical numbers check

Every patient fact of 1.1.0 is taken from version 1.0.0 (commit `88ed0d2`); **the check against the full source article
is pending**. Extraction table (1.0.0 field → 1.1.0 field):

| fact (as recorded in 1.0.0) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 42-year-old woman | `patient.age`, `sex` | `patient.age`, `sex`; title |
| intermittent haemoptysis 10 years, breathlessness 6 months, worse for 1 month | `patient.chiefComplaint` | `chiefComplaint` (lay words); `history.presenting`; `triageNote`; decision 1 prompt |
| haemoptysis again with breathlessness in the last month; able to lie flat; no fever this time | `patient.triageNote` | `triageNote`; `history.bleeding-recent`, `orthopnoea`, `fever` |
| blood-streaked sputum recurring for 10 years, about once a year | `history.onset` | `history.bleeding-pattern`; opening line (gist) |
| breathlessness began 6 months ago, worse over the last month | `history.breathing` | `history.breathlessness-course` |
| can lie flat at night, no worse at night | `history.positional` | `history.orthopnoea` |
| no fever this time | `history.fever` | `history.fever` |
| appetite and energy good, no clear weight change | `history.weight` | `history.weight-appetite` |
| irregular rhythm found at an earlier check-up, not treated | `history.prior-health` | `history.rhythm-history` |
| no smoking or alcohol; exposure to chlorine-containing cleaning products | `history.exposure` | `history.smoking-alcohol`, `history.irritant-exposure` |
| allergies, family history, operations, regular medicines, vaccinations, baseline function, concerns, other admissions: not recorded | 8 `unknown` items | `allergies`, `family`, `pmh-other`, `medications`, `exertion` (unknown); `concerns` (labelled teaching device); vaccinations dropped (not relevant) |
| coarse breath sounds, no wheezes or crackles, resonant percussion, central trachea | `exam.lungs` | `exam.chest-auscultation`, `chest-percussion`, `trachea` |
| no clubbing, leg oedema or enlarged superficial nodes | `exam.systemic` | `exam.clubbing`, `leg-oedema`, `lymph-nodes` |
| CT: irregular thickening, calcification and widespread uneven narrowing of the trachea and multiple large bronchi; right-upper-lobe segmental atelectasis | `investigations.ct` | `investigations.chest-ct` (record review, `admission`) |
| fixed upper-airway obstruction pattern; FEV₁ 1.45 L (55.7 % predicted); FEV₁/FVC 50.77 %; diffusing capacity 89.4 % predicted | `investigations.flow` | `investigations.lung-function` (record review; `values` in L and %) |
| frequent ventricular premature beats, short runs of VT; LVEF 60 %; urine protein negative; liver and renal function normal | `investigations.rhythm` | `rhythm-record`, `lvef-record` (record reviews), `urinalysis`, `liver-renal` (labs) — `admission`, repeated in `treatment` |
| extensive friable mucosal proliferation, narrowest about 10 % of normal | `investigations.biopsy` | `investigations.bronchoscopy` (record review, `procedure`, `treatment`) |
| amorphous material, Congo red positive, strongly λ positive | `investigations.biopsy` | `investigations.airway-biopsy` (record review, `procedure`, `treatment`) |
| serum/urine immunofixation: no monoclonal band; no bone marrow examination | `investigations.biopsy` | `immunofixation` (`treatment`); `bone-marrow` (`treatment`, `available: false`, "no marrow examination was done") |
| repeated rigid bronchoscopy, electrocautery and cryotherapy, tracheostomy, systemic medicines; decannulation after 7 months, FEV₁ rose to 1.71 L; at 11 months no breathlessness or haemoptysis, light activity | `investigations.followup` | `investigations.outcome` (`followup`); `history.status-followup`; responses of `rigid-recanalisation`, `tracheostomy`, `systemic-chemotherapy` |
| the systemic drugs: "melphalan or thalidomide"; "historical combination chemotherapy" | `decisions.management` option `copy` and the key's feedback | outcome record and `systemic-chemotherapy` response ("melphalan and thalidomide named", regimen not recorded); decision 4 option `melphalan-thalidomide` |
| diagnosis: diffuse tracheobronchial amyloidosis with severe central-airway stenosis, limited systemic assessment | `debrief.conclusion`; citation title | `debrief.conclusion`, README |

**Units and values.** Kept exactly: 10 years, about once a year, 6 months, 1 month, FEV₁ 1.45 L, 55.7 %, 50.77 %,
89.4 %, LVEF 60 %, about 10 % of normal calibre, 7 months, FEV₁ 1.71 L, 11 months. No reference range is recorded for any
value, so none is shown and no value is flagged. **Times.** Only intervals are recorded; none of the tests has a date,
and the 7 and 11 months have no recorded anchor (the case writes "after 7 months" and "at 11 months" in both languages).
**Derived values** (for facilitators only; not shown in the case): FVC ≈ 1.45 / 0.5077 ≈ 2.86 L; predicted FEV₁ ≈ 1.45 /
0.557 ≈ 2.60 L; the later FEV₁ of 1.71 L is 0.26 L (≈ 18 %) above 1.45 L and, against the same predicted value, ≈ 66 % of
predicted — an approximation, since the predicted value changes with age and the report's equation is not recorded.
The Empey index cannot be derived (no PEF).

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions.** "When you read 'fixed upper-airway obstruction' next to 'coughing blood', what did you want to do
  first?" "How did it feel to plan a procedure that could itself block her airway?"
- **Description.** "In two sentences: where was her obstruction, what was in her airway wall, and how did you get the
  tissue?"
- **Analysis.**
  - "What does a fixed upper-airway pattern look like on the loop, and what did the normal diffusing capacity add?"
  - "Which diseases thicken and calcify the trachea? Which would you have tested for before a biopsy (tuberculosis)?"
  - "If a flexible scope and a forceps biopsy meet an airway narrowed this far that has recently bled, what happens — and who
    rescues her, with what, in the endoscopy suite?"
  - "Why did her rhythm record belong in the procedure plan, and why does an LVEF of 60 % not settle the heart
    question in amyloid?"
  - "Congo red proves amyloid: what does it not prove? Why is immunofixation alone not enough?"
  - "What would have had to be true for chemotherapy to be justified? Why does thalidomide in a 42-year-old woman need
    more than a prescription?"
  - "The report combined rigid bronchoscopy, a tracheostomy and systemic drugs. Which one improved her FEV₁ from
    1.45 L to 1.71 L?"
- **Summary.** "Three things you will do the next time a fixed central obstruction meets recent haemoptysis."

### Common learner errors and how the case surfaces them

| error | where it surfaces |
|---|---|
| Reading FEV₁/FVC 50.77 % as asthma or COPD, perhaps blaming the chlorine products | decision 1 (`irritant-asthma`, `irritant-copd`); `ics-formoterol` harm; `rb-no-unfounded-treatment` |
| Treating "calcified stenosis" as tuberculosis without evidence | decision 1 (`tb-stenosis`); `empirical-anti-tb` harm; the sputum TB test answers "no result recorded" |
| Booking a routine sedated flexible bronchoscopy | decision 2 (`flexible-sedated`); `flexible-sedation-biopsy` (critical) — safety outcome fails |
| Forgetting the rhythm record, or letting it stall the airway work-up for weeks | decision 2 (`arrhythmia-first`); `cardiology-referral`; decision 3 (`organ-screen`) |
| Skipping blood count, clotting and pregnancy status before a general anaesthetic and biopsy | `rb-workup-before-procedure`; decision 2 key; the pregnancy item is unknown and the test has no result — asking is not confirming |
| Equating Congo red with typing, or negative immunofixation with "not systemic" | decision 3 (`tissue-typing`, `clone-screen`, `pet-staging`); the haematologist's interpretation |
| Copying the historical chemotherapy | decision 4 (`melphalan-thalidomide`); `systemic-chemotherapy` harm |
| Long metallic stents or resection for diffuse benign narrowing; watching a 10 % lumen | decision 4 (`metal-stents`, `tracheal-resection`, `watch-and-wait`) |

### Teaching points for the debrief

The five `debrief.teachingPoints`: (1) read the loop, not just the ratio (ERS/ATS 2022); (2) secure the airway before
sampling a severe central stenosis (Chinese Thoracic Society consensus 2017; ESC 2022 for the arrhythmia); (3) Congo red
proves amyloid, typing and the clonal screen (IFE + free light chains + marrow) decide its type and extent (Chinese AL
guideline 2021); (4) in amyloid, ventricular ectopy needs cardiac assessment whatever the LVEF (ESC 2021 position
statement; ESC 2022); (5) localised AL is treated locally, chemotherapy only for proven systemic AL, with Dara-VCD as
today's first line (BSH 2015; EHA-ISA 2023) — each with "then and now".

## Embodied mode

- **Where things are (`general-hospital`).** She lies in a ward bed (`setting: "inpatient"`) for `admission`,
  `procedure` and `treatment`; entering `followup` moves her to an outpatient consulting room (`location: {setting:
  "outpatient"}`), a staging convention — 1.0.0 records her status at 11 months, not where she was seen. The
  bronchoscopy itself happens off-screen: the interventional referral is a call made at her bedside, and the
  bronchoscopy, biopsy and outcome are records.
- **Records terminal vs bedside.** The seven record reviews (`chest-ct`, `lung-function`, `rhythm-record`, `lvef-record`,
  `bronchoscopy`, `airway-biopsy`, `outcome`) need only `records`: the ward nurses' station terminal, the clinic's, or
  the notes at the bedside. The labs are sampled at the bedside and sent; the bone marrow request needs the cytology
  service (`risk: "moderate"`, an approval prompt); cardiac MRI and PET-CT would take her to imaging (not on the
  reference path).
- **Interventions.** Referrals and bookings (`ip-bronchoscopy`, `cardiology-referral`, `haematology-referral`,
  `rigid-recanalisation`, `tracheostomy`, `ebrt-referral`, `flexible-sedation-biopsy`, `metal-stents`) have no device
  requirement and are made at her side; oxygen needs the bedside oxygen supply; medicines are delivered by the pharmacy.
  No IV access is modelled (no step needs it).
- **Voice.** She is a conscious adult and answers for herself throughout; there is no companion and no non-verbal phase
  (the tracheostomy's timing is not recorded, so no phase is staged around it).
- `embodied-autopilot.test.ts` finishes the case in en and zh-CN with the clinical-mode score.

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; the ten-year bleeding
pattern, the six-month breathlessness and its recent worsening with recurrent haemoptysis; lying flat; no fever; appetite,
energy and weight; the untreated irregular rhythm; no smoking or alcohol; chlorine-based cleaning products; the two
examination findings (split into six manoeuvres); the CT, lung function, rhythm, LVEF, urine protein and liver–renal
results; the bronchoscopy, histology and immunofixation; no bone marrow examination; the treatments and the 7- and
11-month outcome; the diagnosis.

**Adapted for teaching.** The four phases and their staging (see the timeline); the decisions, options, feedback,
interventions and scoring; the staff; the follow-up clinic location; 12 history questions the case answers as unknown
(bleeding amount, noisy breathing, voice, exertion, cough and sputum, palpitations or blackouts, tuberculosis, other
illnesses, medicines, allergies, pregnancy, family); 10 orderable tests that return "no result recorded".

**Labelled teaching device.** Her worry ("I just want to know what this is, and whether I'll ever breathe properly
again", `persona.concerns` and the `concerns` item) voices an ICE concern and adds no clinical fact; 1.0.0 records none.

**Contradictions and open points kept.** (1) 1.0.0 names the systemic drugs only in its teaching text, once as "melphalan
**or** thalidomide" and once as "historical **combination** chemotherapy"; the case says "combination chemotherapy, with
melphalan and thalidomide named; regimen, doses and duration not recorded". (2) The 7- and 11-month intervals have no
recorded anchor, and when FEV₁ 1.71 L was measured is not clear. (3) 1.0.0's English said "without worse wheezing" where
its Chinese says "没有夜里喘得更重" (breathing no worse at night); the case follows the Chinese. (4) 1.0.0 lists rigid
bronchoscopy, electrocautery and cryotherapy side by side ("多次硬镜、电烧与冷冻"); whether the last two were given through
the rigid bronchoscope is not recorded, so the case keeps them as a list. No other internal contradiction was found.

**Unknowns kept honest.** Vital signs and oxygen saturation; stridor, voice, exertion; the amount of bleeding; blood
count, clotting, blood group, electrolytes; allergies, medicines, past history, tuberculosis, pregnancy, family history;
free light chains, typing, cardiac biomarkers and imaging; the first bronchoscopy's technique and the disease
distribution; every treatment's timing and detail; anything after 11 months (`unknowns`, `debrief.unknowns`).

**Privacy.** Pseudonym unique in the collection; no hospital, department name beyond generic roles, city, date,
identifier or occupation. Authors appear only in the citation.

**Figures.** `fig01` (approved in `scripts/cmcr-105-media-review.json`, checksum kept) is attached only to the outcome
record in the follow-up phase, with a title that does not say what it shows (1.0.0 does not describe it).

**Survey findings applied.** No case audit and no critic note names this case; the collection-wide template defects
did apply and are fixed: option ids `yes` (→ content ids); the key the longest option in every decision (→ no length
cue); the only critical item a first-try decision (`decidedFirstTry: management`) answered after the biopsy record (→ two
critical acts gated before the bronchoscopy findings); a management key that handed the act to "interventional
pulmonology and anaesthesia should plan…" (→ a key naming general anaesthesia, the rigid bronchoscope, bleeding control,
ECG monitoring and the pre-procedure checks, and a referral the learner must make); no interventions (→ 12); the patient
saying "The source case does not provide that information; it cannot be assumed absent or normal" and questions such as
"Is medicine allergies documented?" (→ lay unknowns and clinical questions); a triage note that was an instruction
("airway safety needs review"); the recorded ventricular arrhythmia left without teaching (→ decisions 2–3, the
cardiology referral and teaching point 4).

**Extensions.** `collection`, `sourceArticleId`, `sourceUrl`, `sourceDoi`, `doiVerifiedAt` and `historicalReview` kept;
`sourceTextChecked: false` added; no `sourceTextSha256` until the source pass.

## Matcher notes

- **Phase twin.** `status-followup` (phase `followup`) supersedes `bleeding-recent`, `breathlessness-course` and
  `bleeding-pattern`: at follow-up "are you still coughing blood?", "有咳血吗？" or "how's the breathing?" gets "I'm not
  short of breath now and I haven't coughed up any blood…", never an admission answer, and asking it credits all three
  (each is required earlier anyway, to leave the admission phase).
- **Shared words separated with `excludeKeywords`:** `bleeding-pattern` vs recent and amount questions (最近, 近来, 这个月,
  多少 / recent, this month, how much); `bleeding-recent` vs amount; `breathlessness-course` vs lying flat, night and
  "now"; `rhythm-history` vs family, palpitations and dizziness; `palpitations-syncope` vs "told at a check-up";
  `smoking-alcohol` vs "water" (so "would you like a drink of water?" selects nothing); `weight-appetite` vs hospital food;
  `irritant-exposure` vs tuberculosis and smoking; `pmh-other` vs heart, tuberculosis and family; `medications` vs
  allergies; `family` vs "does your family know you're here / coming to visit" and exposure (家里 in "工作或者家里接触过…"
  selected `family` at 0.67 until 接触 was excluded).
- **English keywords** avoid one-token wildcards: `broughtyouin`, `howmuchblood`, `howmuchcomesup`, `outofbreath`,
  `howareyounow` are written run together (the lint flagged the spaced forms).
- **Natural questions probed in the independent review (2026-11-14)**, among them: "What brings you in today?" and
  "您怎么了？" reached nothing; "Are you coughing up blood?" scored 0.50 (below the 0.55 select band); "有没有咳血？" selected
  `bleeding-amount` ("I couldn't say how much"); "喘得厉害吗？" reached nothing; "Have you had night sweats?" selected
  `orthopnoea` (by "at night"); "喘气的时候有声音吗？" selected `voice`. Fixed with keywords (`bringsyouin`,
  `whatstheproblem`, `whatsthematter`, 怎么了, 哪儿不舒服 for the presentation; "coughing up blood", 咳血, 咯血 for the
  bleeding pattern, which now excludes 量, 又, 还咳, 现在, "still" and "lately"; "still coughing" for the recent
  bleeding; 喘得厉害 for the breathlessness; "medical problems", 平时身体 for the earlier rhythm finding; 现在呼吸,
  "walk further" for the follow-up status), exclusions (`orthopnoea`: sweat, 汗; `voice`: breath, 喘, 呼吸), the
  `bleeding-amount` keyword 咳血量 → 咳血的量 (it matched any 咳血 at 0.67), and the third phase twin above. Night sweats
  are not recorded and now reach no item (she says "I'm not sure, doctor.").
- **Corpus.** 53 test utterances (31 zh-CN, 22 en), written as learners speak; every required item and the phase twin are
  covered. Six look-alike negatives (`expect: []`): "你家里人知道你住院了吗？" (family words; `concerns` scores 0.50, below
  the 0.55 selection band), "医院的饭吃得惯吗？" (selected `weight-appetite` at 0.67 until its exclusions), "Is your family
  coming to visit later?", "Would you like a drink of water?", "Any night sweats?" and "晚上睡觉出汗吗？" (both reached
  `orthopnoea` before its exclusions). `cases verify` reports 53/53 with no extra selection ("有咳血吗？" lists its
  follow-up twin in `alsoOk`).

## References

1. 李楠, 王广发, 章巍, 张红, 张晓明. 腔内介入治疗弥漫性气管支气管淀粉样变性一例. 中华结核和呼吸杂志. 2013;36(7):540-542.
   doi:10.3760/cma.j.issn.1001-0939.2013.07.020. Available from: https://rs.yiigle.com/cmaid/857933
2. Stanojevic S, Kaminsky DA, Miller MR, et al. ERS/ATS technical standard on interpretive strategies for routine lung
   function tests. Eur Respir J. 2022;60(1):2101499. doi:10.1183/13993003.01499-2021
3. 中华医学会呼吸病学分会介入呼吸病学学组. 良性中心气道狭窄经支气管镜介入诊治专家共识. 中华结核和呼吸杂志. 2017;40(6):408-418.
4. Lewinsohn DM, Leonard MK, LoBue PA, et al. Official American Thoracic Society/Infectious Diseases Society of
   America/Centers for Disease Control and Prevention clinical practice guidelines: diagnosis of tuberculosis in adults
   and children. Clin Infect Dis. 2017;64(2):e1-e33. doi:10.1093/cid/ciw694
5. Wechalekar AD, Gillmore JD, Bird J, et al. Guidelines on the management of AL amyloidosis. Br J Haematol.
   2015;168(2):186-206. doi:10.1111/bjh.13155
6. 中国系统性轻链型淀粉样变性协作组, 国家肾脏疾病临床医学研究中心, 国家血液系统疾病临床医学研究中心. 系统性轻链型淀粉样变性诊断和治疗指南
   （2021年修订）. 中华医学杂志. 2021;101(22):1646-1656.
7. Wechalekar AD, Cibeira MT, Gibbs SD, et al. Guidelines for non-transplant chemotherapy for treatment of systemic AL
   amyloidosis: EHA-ISA working group. Amyloid. 2023;30(1):3-17. doi:10.1080/13506129.2022.2093635
8. Garcia-Pavia P, Rapezzi C, Adler Y, et al. Diagnosis and treatment of cardiac amyloidosis: a position statement of
   the ESC Working Group on Myocardial and Pericardial Diseases. Eur Heart J. 2021;42(16):1554-1568.
   doi:10.1093/eurheartj/ehab072
9. Zeppenfeld K, Tfelt-Hansen J, de Riva M, et al. 2022 ESC Guidelines for the management of patients with ventricular
   arrhythmias and the prevention of sudden cardiac death. Eur Heart J. 2022;43(40):3997-4126.
   doi:10.1093/eurheartj/ehac262
10. Mahmood S, Bridoux F, Venner CP, et al. Natural history and outcomes in localised immunoglobulin light-chain
    amyloidosis: a long-term observational study. Lancet Haematol. 2015;2(6):e241-e250. doi:10.1016/S2352-3026(15)00068-X
11. US Food and Drug Administration. FDA public health notification: complications from metallic tracheal stents in
    patients with benign airway disorders. 2005.

The list has ten items after the article because the case spans respiratory medicine, haematology and cardiology and
every guideline its feedback names is listed. **DOIs.** The source DOI is the one the source map
(`scripts/cmcr-105-sources.json`) records as verified (`publisherCheckedAt` 2026-10-29). The independent review confirmed
refs 2, 4, 5, 9 and 10 (title, journal, volume, issue, pages and DOI) on Crossref on 2026-11-14; refs 7 and 8 carry the
DOIs the review of cmcr-639115 confirmed on Crossref. Refs 3 and 6 (Chinese journals whose DOIs are not in Crossref) and
ref 11 (a regulatory notice) could not be confirmed and carry no DOI or URL.

### To verify

**In the source article (the details 1.0.0 does not give or leaves open):**

- Vital signs and oxygen saturation on admission; stridor or voice change; exercise tolerance; how much blood she
  coughed in the last month.
- Allergies, regular medicines, other illnesses, operations and admissions, family history, tuberculosis history or
  contact, menstrual and pregnancy status; the duration and setting of the chlorine-product exposure (only as far as
  privacy allows).
- When the CT and lung function were done relative to admission; the CT's narrowest diameter, the bronchi involved,
  posterior membranous wall involvement, contrast or reconstruction; whether "fixed upper-airway obstruction pattern" is
  the report's wording; FVC, PEF, prediction equations, a bronchodilator test.
- The rhythm finding: resting ECG or Holter, ectopic burden, length and rate of the VT runs, QRS voltages and QT; how the
  LVEF was measured and any wall thickness, strain or diastolic data; whether the arrhythmia was evaluated or treated;
  whether the "irregular rhythm at an earlier check-up" is the same finding.
- Blood count, clotting, blood group, electrolytes, NT-proBNP or BNP, troponin.
- The first bronchoscopy: flexible or rigid, sedation or general anaesthesia, the distribution of disease (larynx,
  posterior wall, which bronchi), biopsy sites, bleeding.
- Histology: apple-green birefringence; how λ was detected (immunohistochemistry or immunofluorescence); κ staining;
  any typing (mass spectrometry, immunoelectron microscopy); when the immunofixation was done; serum protein
  electrophoresis, free light chains, fat-pad aspiration; why no marrow examination was done.
- Treatment: number and timing of the rigid bronchoscopies; the electrocautery and cryotherapy details (whether they
  were given through the rigid bronchoscope); when and why
  the tracheostomy was done; **which systemic drugs were given** (1.0.0 names melphalan and thalidomide only in teaching
  text, as "or" and as "combination chemotherapy"), their doses, duration, any corticosteroid, adverse effects — 1.0.0's
  README says "historical drug doses are omitted from actionable options", implying the article gives them.
- What the 7 and 11 months are counted from; when FEV₁ 1.71 L was measured; recurrence or follow-up after 11 months.
- What the report's figure 1 shows (its title here is deliberately generic).

**In the guidance (web search was unavailable to the author and to the independent review of 2026-11-14 — a shared
budget was exhausted; the review confirmed the bibliographic records of refs 2, 4, 5, 9 and 10 on Crossref and reused
cmcr-639115's confirmation of refs 7 and 8, but could not open the guideline texts; the statements below are from
knowledge and must be checked):**

- ERS/ATS 2022 (ref 2): its wording on upper/central airway obstruction and flow–volume loop patterns, and whether it
  asks for confirmation by imaging or endoscopy; volume, issue and article number.
- Chinese Thoracic Society consensus on benign central airway stenosis (ref 3): the issuing group's exact name, the
  year, issue and pages, and the statements this case attributes to it — general anaesthesia with a rigid bronchoscope
  for severe stenosis, metallic stents avoided in benign disease where alternatives exist, resection only for short
  localised stenosis, bronchoscopic intervention for symptomatic severe stenosis. Whether a newer Chinese consensus
  (benign or malignant central airway obstruction) supersedes it. Because none of these statements could be checked, the
  review softened the Chinese texts' "要求" (requires) to "主张" (recommends), matching the English "manages".
- ATS/IDSA/CDC 2017 (ref 4): its wording on smear microscopy, nucleic-acid amplification and culture, and on
  bronchoscopic sampling when sputum is not diagnostic (the review rewrote the harm text, which had said treatment
  "rests on" microbiological evidence: empirical treatment is reserved for a high clinical suspicion); whether a newer
  WHO or Chinese tuberculosis diagnosis guideline should be cited instead.
- BSH 2015 AL management (ref 5): that it has a localised AL section recommending local treatment and no systemic
  chemotherapy; whether a newer British guideline supersedes the 2015 pair (the 2015 diagnosis guideline by Gillmore et
  al. is not cited here).
- Chinese AL guideline 2021 revision (ref 6): the issuing groups, citation, and its statements on mass-spectrometry
  typing, the screen (immunofixation, free light chains, marrow) and localised amyloidosis.
- EHA-ISA 2023 (ref 7): the wording of daratumumab–bortezomib–cyclophosphamide–dexamethasone as first-line treatment
  of systemic AL; citation details.
- ESC 2021 position statement (ref 8) and ESC 2022 ventricular arrhythmias (ref 9): the diagnostic steps used here
  (biomarkers, strain echocardiography or CMR, TTR testing after ATTR typing; structural heart disease work-up in
  frequent ectopy or non-sustained VT). ESC 2022 is cited only for that work-up; continuous ECG monitoring with a
  defibrillator during the anaesthetic is the case's own reasoning (the review removed its attribution to ESC 2022).
- Mahmood et al. 2015 (ref 10): citation details; the case says only that localised AL "rarely" progresses (no figure is
  quoted).
- Radiotherapy for tracheobronchial amyloidosis is taught as an option without a citation; candidate case series
  (Mayo Clinic: Kalra et al., Mayo Clin Proc 2001; Neben-Wittich et al., Chest 2007) must be verified before citing.
- ASH 2026 guidelines on diagnosis of light chain amyloidosis (Kukreti V, et al. Blood Adv. 2026;10(14):5113-5152;
  doi:10.1182/bloodadvances.2025017073 — confirmed on Crossref on 2026-11-14; cited by the revised cmcr-639115) are the
  newest international guidance on AL diagnosis. They are not cited here because their text could not be read: a
  haematologist should check that decision 3 (typing, the clonal screen, marrow, organ assessment) agrees with them and
  whether they should be cited beside the Chinese 2021 guideline.
- US FDA 2005 public health notification (ref 11, added by the review from knowledge): its exact title, date and URL,
  and its wording that metallic tracheal stents be used in benign airway disorders only after other options have been
  explored.
- Principles used without a citation: asthma requires variable airflow limitation (GINA), asking about pregnancy
  before anaesthesia (NICE NG45, 2016) and thalidomide's pregnancy-prevention programme; and whether any cited
  guideline has a newer edition as of 2026-11.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- **Facts unchanged, re-organised.** Every patient fact of 1.0.0 is kept and none is added: the chief complaint and
  triage facts split into presentation, bleeding pattern, recent bleeding, breathlessness course, lying flat and fever;
  the two compound examination findings into six manoeuvres; the "rhythm and systemic tests" record into rhythm, LVEF,
  urine protein and liver–renal results; the "bronchoscopy and histology" record into the bronchoscopy, the biopsy, the
  immunofixation and the marrow record; the outcome into the outcome record, a follow-up status item and the responses
  of the report's own treatments. The systemic drugs keep 1.0.0's naming with its "or"/"combination" ambiguity.
- **History.** 15 template slots (8 with the meta answer "The source case does not provide that information…" and meta
  questions such as "Is medicine allergies documented?") → 24 items in the patient's lay voice: 11 recorded facts, 12
  unknowns, 1 labelled ICE device; 8 required; vaccinations dropped.
- **Phases and gates.** 4 template phases gated on early questions → 4 one-way phases gated on objectives, a committed
  bronchoscopy act before the bronchoscopy record and a committed treatment act before the outcome; the outcome phase
  waits for all four decisions and moves her to the follow-up clinic.
- **Investigations.** 5 bundled record reviews → 20: 7 record reviews, the recorded labs, and honest "no result recorded"
  answers for the tests a clinician would order (blood count and clotting, electrolytes, pregnancy test, sputum for
  tuberculosis, free light chains, cardiac biomarkers, cardiac MRI, tissue typing, PET-CT) and the marrow ("not done").
- **Interventions (critic gap "management keys hand the act to a team").** 0 → 12: the interventional referral for
  general-anaesthetic bronchoscopy, cardiology and haematology referrals, rigid recanalisation, a tracheostomy (neutral,
  the report's), a radiotherapy referral, oxygen (neutral); harmful: sedated flexible bronchoscopy (critical), empirical
  anti-TB treatment, ICS–formoterol, systemic chemotherapy (the report's, `critical: false`) and metallic stents
  (`critical: false`) — each with a harm text naming its guidance.
- **Decisions.** 3 template decisions (ids `yes`/`asthma`/`copy`…, the key the longest, straw-man distractors such as
  "Copy melphalan or thalidomide for every localised case") → 4 decisions with 19 options and content ids: localisation,
  the sampling plan (act, setting, preconditions), what the tissue leaves open (select all), and the treatment plan with
  the report's own choice as a near-miss.
- **Rubric.** 11 template items (the one critical item a first-try decision read after the biopsy) → 12: two critical
  acts, two avoided-harm items with `scoredWhen`, time-windowed acts (`whenIndicated`), first-try decision scoring and a
  Calgary–Cambridge communication item written for her.
- **Teaching layer.** 6 learning outcomes, 6 objectives, 4 named staff, 5 key reasoning steps, 5 dated teaching points,
  7 unknowns, 10 Vancouver references; the source citation without a zero-padded issue and with its URL.
- **Card.** Title in the collection form ("· 42-year-old woman"); a spoiler-free summary (1.0.0's named "central-airway
  disease", the answer to decision 1); a lay chief complaint; the triage note as a handover; three presenting-feature
  tags; topic tags `haemoptysis`, `lung-function-interpretation`; estimated time 30 → 40 min.
- **Governance.** Review status and notes in the STANDARD §6.6 wording (editorial; facts not yet checked against the full
  article; the English last sentence reads "The case is not yet reviewed by a licensed clinician." because the collection
  contract matches that phrase case-sensitively); `sourceTextChecked: false`; the high-risk contraindicated
  interventions state `critical` (KIT §6); `license` in the collection's wording for a case with local media.
- **Independent review (2026-11-14).** (1) Fact: the outcome record, the recanalisation response, the provenance notes
  and the summaries bound electrocautery and cryotherapy to the rigid bronchoscope ("rigid bronchoscopies with
  electrocautery and cryotherapy", "硬质支气管镜下电烧灼和冷冻"), where 1.0.0 lists them side by side ("多次硬镜、电烧与冷冻");
  they are a list again, and the unknowns and the record's note name the technique as unrecorded. (2) Matcher: about
  fifteen natural questions reached nothing or the wrong item (Matcher notes); keywords, exclusions and a third phase twin fix
  them, with 16 more test utterances (53). (3) Guidance: ESC 2022 is no longer cited for peri-procedural ECG
  monitoring; the tuberculosis harm no longer says treatment "rests on" microbiological evidence; the Chinese texts'
  "要求" became "主张"; the US FDA 2005 notification supports the metallic-stent harm and feedback (ref 11); DOIs
  confirmed on Crossref were added to refs 2, 4, 5 and 7–10. (4) Spoilers and wording: the tracheostomy response no
  longer gives the 7-month decannulation before the outcome; the tuberculosis distractor no longer calls the disease
  "healed" while treating it; "alongside" (a timing not recorded) became "as well as"; "正在出血" became "近期咯血"; the
  metallic-stent feedback says her narrowing "can regrow"; the English conclusion names the systemic assessment and
  "without chemotherapy", as the Chinese does. (5) Governance: the review notes say some guideline statements still need
  checking; `reviewedAt` 2026-11-14; the validation path and the To-verify list corrected.

### 1.0.0 — 2026-10-28

- First release in the CMCR additional collection (PR #5): template version with 15 history items, 2 examination
  findings, 5 record reviews, 3 decisions, 11 rubric items and no interventions.

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-857933/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-857933 --lang en                                                 # 78 steps · objectives 6/6 · decisions 4/4 · utterances 53/53 · rubric 26/26 (100 %)
npx tsx --conditions=source scripts/case-check.ts cmcr-857933                                       # depth floor, do-nothing 0, wrong-first 50 % < 100 %
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-857933:"              # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-857933:"  # in-world demonstration, en + zh-CN
```

Run on 2026-11-14, after the independent review: all five pass.

## 中文摘要

**病例概要。** 42岁女性，间断咯血 10 年（痰中带血，约每年 1 次），憋气半年、近 1 个月加重并再次咯血；能平卧，此次无发热，
食欲、精神和体重无明显变化；既往体检发现心律不齐未治疗；不吸烟饮酒，接触过含氯清洁剂。查体双肺呼吸音粗、无干湿啰音、叩诊
清音、气管居中，无杵状指、下肢水肿或浅表淋巴结肿大。胸部 CT 示气管及多处大支气管管壁不规则增厚、钙化，管腔广泛不均匀狭窄，
右肺上叶节段性肺不张；肺功能为固定性上气道阻塞图形，FEV₁ 1.45 L（占预计值 55.7%），FEV₁/FVC 50.77%，弥散量占预计值
89.4%；频发室早、短阵室速，LVEF 60%；尿蛋白阴性，肝肾功能正常。支气管镜见黏膜广泛增生、易出血，最窄处约为正常管径的
10%；活检无定形物质刚果红阳性、λ 强阳性；血、尿免疫固定电泳无单克隆条带；未做骨髓检查。诊断：弥漫性气管支气管淀粉样变性
伴严重中心气道狭窄。报告联合使用多次硬质支气管镜、电烧灼和冷冻治疗，以及气管切开和全身药物（1.0.0 版教学文本提及美法仑和沙利度胺，
方案未记录）；7 个月后拔除气切套管，FEV₁ 升至 1.71 L，11 个月时无憋气和咯血。本版依据 1.0.0 版提取的事实改写，尚未对照原文
全文核对。

**学习目标。**

1. 从流量–容积环和弥散量定位阻塞：弥散正常的固定性上气道阻塞图形提示中心气道阻塞，需影像和内镜证实（ERS/ATS 2022）。
2. 安全安排严重狭窄、近期咯血气道的取材：先查血常规、凝血和妊娠状态，再全身麻醉、备硬质支气管镜、止血手段和心电监护（中华医学会
   呼吸病学分会良性中心气道狭窄专家共识，2017）。
3. 解读刚果红和轻链染色，说出判定局限性 AL 之前还需要的证据：质谱分型、免疫固定电泳加游离轻链、骨髓和器官评估（中国 AL
   指南，2021）。
4. 对淀粉样变患者的室性心律失常评估心脏受累，即使射血分数正常（ESC 2021；ESC 2022）。
5. 局限性气道淀粉样变选择局部治疗，化疗只用于确诊的系统性 AL（BSH 2015；EHA-ISA 2023）。
6. 对照报告当年的联合治疗与现行做法，说明单个病例无法判断哪一项治疗起效。

**关键决策。**

- 决策 1：结合流量–容积环、弥散量和 CT，把阻塞定位在气管支气管壁的病变，下一步经支气管镜取材（而不是按哮喘、慢阻肺或经验性
  抗结核处理）。
- 决策 2：先查血常规、凝血和妊娠状态，由介入呼吸团队和麻醉医生在全身麻醉下操作，备硬质支气管镜、止血手段、心电监护和除颤仪；
  内镜室清醒镇静下的可弯曲镜活检是本例的危险错误。
- 决策 3（多选）：组织质谱分型；血、尿免疫固定电泳加游离轻链和骨髓检查；NT-proBNP、肌钙蛋白和心脏影像，加尿蛋白和肝功能。
- 决策 4：按局限于气道的病变处理——分次硬质支气管镜再通，复发时考虑放疗，补齐全身评估，未证实系统性 AL 前不用化疗；报告当年的
  美法仑联合沙利度胺是对照。

**安全结果。** `flexible-sedation-biopsy`（内镜室清醒镇静下可弯曲支气管镜活检）标为 `critical: true`：给出即判安全结果不通过；
全身化疗和金属支架为高风险、`critical: false`，计入 `rb-no-unfounded-treatment`。

**复盘要点（PEARLS）。** 先谈面对“固定性上气道阻塞 + 咯血”时的第一反应；用两句话说清阻塞在哪里、管壁里是什么、组织是怎样取到
的；分析流量–容积环和弥散量、取材前的气道安全、心律记录为何属于操作计划、刚果红证明了什么和没有证明什么、什么证据才支持化疗、
沙利度胺用于育龄女性的要求，以及报告中多种治疗叠加为何无法归功于任何一项；最后总结下次遇到类似患者要做的三件事。仍待核对的
事项见上文 “To verify”。
