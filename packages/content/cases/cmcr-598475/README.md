# cmcr-598475 — Transient memory disturbance, then heavy rectal bleeding · 38-year-old woman

> **Facilitator guide — contains spoilers.** Learners open the case from the case library, where the title,
> summary, chief complaint, tags and triage note name no diagnosis. The patient (白清和 / Bai Qinghe) is
> pseudonymous; the case is a teaching adaptation of a published case report, not medical advice.
> 导师指南，含剧透。患者为化名；本病例改编自已发表的病例报告，不构成医疗建议。
>
> **Status of the facts.** Version 1.1.0 was re-authored from the facts that version 1.0.0 extracted from the
> report. The full article was not available; no patient fact has been added or changed, and none has yet been
> checked against the full text (`extensions.sourceTextChecked: false`). The "To verify" list names what to look
> for in the source.

## Case card

| | |
|---|---|
| Case | `cmcr-598475` · v1.1.0 · CMCR additional collection (`cmcr-105`) |
| Source | 朱祖懿, 杨红, 姚尧, 李晓青, 钱家鸣. 记忆力下降–消化道出血. 中华全科医师杂志. 2014;13(2):91-93 |
| Setting / facility | Ward (`inpatient`) throughout · `general-hospital` |
| Difficulty / time | 4 / 5 · about 40 minutes (static clock; three phases, five decisions, 20 interventions) |
| Specialty | Gastroenterology, neurology |
| Languages | zh-CN (source language), en |
| Learner level | Final-year students; gastroenterology, neurology, acute medicine and general practice trainees |
| Review status | Editorial review 2026-10-30 (AI-assisted, against the guidance below) — **not yet reviewed by a licensed clinician**; patient facts not yet checked against the full article. Have a gastroenterologist (IBD) and a neurologist review it before teaching use |
| Content | 24 history items (13 not recorded, 8 required) · 3 exam findings · 18 investigations (9 record reviews, 8 without any recorded result) · 20 interventions (8 contraindicated in some or all circumstances) · 6 objectives · 5 decisions (23 options) · 12 rubric items (11 deterministic, weight 30; 1 examiner-judged; 2 critical) · 4 staff characters · 6 learning outcomes · 6 teaching points · 40 test utterances |

## Learning outcomes

By the end of the case the learner can:

1. Grade a flare of bloody diarrhoea as acute severe colitis with the Truelove and Witts criteria (≥ 6 bloody
   stools a day plus a systemic sign such as Hb < 105 g/L), without downgrading it for missing observations, and
   admit for intravenous treatment (BSG 2025; AGA 2026).
2. Start IV methylprednisolone 60 mg/24 h (or hydrocortisone 100 mg 6-hourly) once stool samples are sent, give
   LMWH thromboprophylaxis despite non-severe bleeding (CAG 2014), and withhold antidiarrhoeals, opioids and NSAIDs.
3. Plan the day-3 review by stool frequency and CRP (Travis 1996) and the rescue options — infliximab, ciclosporin
   or colectomy — with the colorectal surgeon, weighing anti-TNF risk while white-matter lesions are unexplained.
4. Combine negative stool tests with the CT, endoscopy and biopsy findings to diagnose inflammatory bowel disease of
   unclassified type, and exclude infection, lymphoma and carcinoma at a circumferential lesion by tissue diagnosis
   and follow-up.
5. Investigate a transient disturbance of memory and awareness during an IBD flare with MRI, venous imaging for
   cerebral venous thrombosis (AHA 2024), CSF and EEG as indicated, and explain a possible but unproven bowel–brain
   association honestly.
6. Prepare azathioprine maintenance safely: TPMT and NUDT15 genotyping before the first dose (CPIC 2018 update),
   hepatitis B screening (ECCO 2021) and blood-count monitoring.

These are `learningOutcomes`. They name the diagnosis, so front-ends show them before play only behind the closed
**Learning outcomes (6) · may reveal the diagnosis** disclosure and list them in every debrief (CASE_AUTHORING §9.4,
GLOSSARY §4). The six HUD `objectives` below are the in-game task list.

## Clinical summary (spoilers)

A 38-year-old woman has had, for two years, recurrent loose ("mushy") bloody stools with urgency, in bouts lasting
weeks that settle and relapse; she put them down to stress and takes no regular medicines. One morning she had a
memory disturbance that came on suddenly within a day — she cannot recall that morning — and she was alert again by
the afternoon. That night heavy rectal bleeding began, with right lower abdominal pain and fever but no rigors,
nausea or vomiting; later she passed blood more than ten times a day (the Chinese text adds that the amount clearly
increased). After recovery of awareness the neurological examination showed no definite focal abnormality; the
abdomen showed right lower abdominal pain with a possibly palpable mass. Haemoglobin fell from 129 to 93 g/L and CRP
was 95.8 mg/L. CT showed wall thickening of the ascending colon and the rectum. Colonoscopy found an irregular
circumferential raised lesion at about 30 cm with diffuse shallow ulcers, erosions and erythema (充血) distal to it;
mucosal biopsies showed severe acute and chronic inflammation without definite crypt abscesses or tumour cells, and
immunohistochemistry did not support lymphoma. Repeated stool pathogen tests and C. difficile toxin were negative,
as were several other infection tests. Brain MRI showed multifocal punctate white-matter abnormalities; the CSF
pressure was 85 mmH₂O, with routine, biochemical and the listed pathogen tests unremarkable. She was treated
with prednisone and azathioprine; later the MRI abnormalities partly resolved and colonoscopy showed mucosal
improvement.

**Diagnosis (as taught):** acute severe colitis (Truelove and Witts, on frequency and haemoglobin) in a chronic
inflammatory bowel disease of the colon whose type — ulcerative colitis or Crohn's colitis — is not settled (IBD
unclassified), with a transient neurological episode and multifocal white-matter lesions of unproven mechanism
(possibly an extraintestinal manifestation; vasculitis and demyelination unconfirmed; venous thrombosis, seizure and
other causes not excluded by any recorded test).

## Scenario timeline and physiology

Static clock (`clock.mode: "static"`) and no physiology model, as the collection contract requires: the case shows
the report's recorded states and never simulates the learner's treatment. No vital signs are recorded at any stage,
so the bedside shows none and the examination answers "This case does not record this examination." Every phase is
one-way (`learnerSwitchable: false`).

| Phase | When | Entered when | What is there |
|---|---|---|---|
| `admission` (initial) | on the ward after the bleeding has escalated | start | her own history (alert, answers for herself), three examination findings, blood count (Hb 129 → 93 g/L) and CRP 95.8 mg/L ("during the bleeding, timing not recorded"), the CT (shown from admission, timing not recorded); orders with no recorded result (biochemistry, group and save, abdominal film, venous imaging, EEG, viral serology, TPMT/NUDT15); stool samples sent (result in the next phase); decisions 1–3; the treatments and the traps |
| `workup` | after treatment has started; the reports of the admission's tests are back | objectives 1–3 done (history, examination and first results, **IV corticosteroid and thromboprophylaxis given**, surgical review) and decisions 1–3 right | stool tests (negative), other infection tests (negative), endoscopy, biopsy histology, brain MRI, CSF (all dated "timing not recorded"); CMV in the biopsies, venous imaging and EEG with no recorded result; decisions 4–5 |
| `followup` | to follow-up | all five decisions right and objectives 1–5 done (incl. neurology review, venous imaging sought, genotype and viral serology sent) | the report's treatment and follow-up record, with the two approved figures |

Gating choices: the work-up phase waits for the first day's acts (an IV corticosteroid and VTE prophylaxis — LMWH or
compression — and a colorectal review), so the reports of the following days are read only once the life-saving
steps have been taken; the two critical items score those acts in the admission phase (`whenIndicated`). No prompt,
hint, phase description or order response states the report's management before the follow-up record, except the
responses to giving prednisone or azathioprine (they say the case records the drug was used — only after the learner
chose it). Intervention names are listed from the start, so they name no diagnosis and no decision key.

## Decisions and assessment

### Objectives (HUD chapters)

1. `obj-story` — Take the story of the bleeding and the forgotten morning (bleeding onset, frequency, pain, fever,
   memory gap, recovery, the two-year bowel history).
2. `obj-first-assessment` — Examine her and read the blood count, CRP and CT (conscious level, nervous system,
   abdomen; results read in the admission phase).
3. `obj-first-day` — Judge how ill she is and start today's treatment (decisions 1 and 3, stool samples sent, an IV
   corticosteroid, VTE prophylaxis, colorectal review).
4. `obj-neuro` — Work up the episode she cannot recall (decision 2, venous imaging sought, neurology review, MRI and
   CSF read in the work-up phase).
5. `obj-colitis` — Put the results together and plan beyond the flare (work-up reports read, decisions 4 and 5,
   TPMT/NUDT15 and viral serology sent).
6. `obj-outcome` — Set the report's treatment and follow-up against today's plan (outcome record read).

Hints are Socratic questions; none contains a key's text (`cases validate` checks it).

### Decisions

| # | id | opens after | key | distractors (why they tempt) |
|---|---|---|---|---|
| 1 | `flare-severity` | bleeding onset, frequency, the bowel history and fever asked; abdomen examined; blood count and CRP read | acute severe colitis by Truelove and Witts (> 6 bloody stools a day with Hb < 105 g/L) — inpatient IV treatment | moderate flare because pulse and temperature are missing (oral prednisolone, clinic review); infective colitis first, steroids after negative cultures (1.0.0's "food poisoning" distractor, updated); a focal bleeding point for CT angiography |
| 2 | `neuro-workup` | memory gap, recovery, bleeding and fever asked; conscious level and nervous system examined | brain MRI with diffusion imaging plus MR venography; CSF if infection or inflammation stays possible; EEG if a seizure is suspected | transient global amnesia — reassure, no tests; plain CT and "stress"; presumed venous thrombosis with full-dose anticoagulation before imaging |
| 3 | `first-line` | decision 1; stool samples sent **in the admission phase**; CT read | IV methylprednisolone 60 mg/day, LMWH prophylaxis unless the bleeding is severe (then compression), no antidiarrhoeals, opioids or NSAIDs, an unprepared sigmoidoscopy with biopsies, a day-3 surgical review | oral prednisone with azathioprine at once, heparin withheld, loperamide (**the drugs this case records**, with today's errors); antibiotics and steroids held for cultures; infliximab first-line; IV steroids **without any heparin** (near-miss) |
| 4 | `colitis-cause` | decision 3; stool tests, other infection tests, endoscopy and biopsy read in the work-up phase | chronic IBD of the colon, type unclassified; no infection, tumour or lymphoma found | missed amoebic or tuberculous infection (stop steroids); primary colonic lymphoma (chemotherapy); carcinoma at 30 cm (resection); ischaemic colitis |
| 5 | `maintenance-safety` | decision 4; MRI and CSF read | azathioprine dosed by TPMT and NUDT15 genotype after hepatitis B, C and HIV screening, with monitoring (AGA 2024 suggests a thiopurine to maintain a corticosteroid-induced remission) | full dose at once with a first count at three months; TPMT alone ("explains toxicity in every population"); infliximab maintenance without a neurology view of the MRI; long-term prednisone |

All decisions are single best answer with option-specific feedback naming the guidance. Options were balanced for
length: the key is the uniquely longest option in no decision in either language (`cases validate` checks it).
Option ids name the content (`iv-steroids-lmwh`, `steroids-no-heparin`), never the role.

### Rubric (11 deterministic items, weight 30, + 1 examiner-judged)

| id | Domain | Item | Weight |
|---|---|---|---|
| `rb-history` | History | bleeding onset, frequency, pain, fever, nausea; memory gap, recovery, any witness, neurological symptoms (both unrecorded: asking is the competency); the two-year bowel history; medicines; travel and contacts; family history | 3 |
| `rb-examination` | Examination | conscious level, nervous system, abdomen | 2 |
| `rb-admission-tests` | Investigations | blood count, CRP and CT read; stool cultures with C. difficile toxin and a plain abdominal film **ordered in the admission phase** | 2 |
| `rb-severity` | Diagnosis | decision 1 first time | 3 |
| `rb-first-line-plan` | Management | decision 3 first time, colorectal surgery review, stool chart | 3 |
| `rb-iv-steroids` | Management · **critical** | IV methylprednisolone or hydrocortisone given **in the admission phase** (`whenIndicated`) — the missed life-saving act | 4 |
| `rb-vte-prophylaxis` | Safety · **critical** | LMWH, or pneumatic compression if heparin is withheld, given **in the admission phase** — the commonest dangerous omission | 3 |
| `rb-avoided-harm` | Safety | no loperamide, opioid, NSAID, anticholinergic antispasmodic, bowel preparation for a full colonoscopy or full-dose anticoagulation; `scoredWhen` decision 3 attempted or any of the six given | 3 |
| `rb-neuro-workup` | Investigations | decision 2 first time, venous imaging sought, neurology review, MRI and CSF read | 2 |
| `rb-colitis-cause` | Diagnosis | decision 4 first time | 3 |
| `rb-thiopurine-safety` | Safety | decision 5 first time, TPMT/NUDT15 test and hepatitis B, C and HIV serology sent | 2 |
| `rb-communication` | Communication (examiner) | Calgary–Cambridge conversation: severity, treatment and its safety measures, the uncertain bowel–brain link, her fears | 1 |

### How wrong choices score (measured with the core engine, 2026-11-12)

| Path | Score | Critical items missed | Flagged in the debrief |
|---|---|---|---|
| Reference `solution` | 30/30 (100 %) | none | none |
| Start and do nothing | 0/27 (0 %) | `rb-iv-steroids`, `rb-vte-prophylaxis` | — (`rb-avoided-harm` not scored) |
| History and examination only | 5/27 (19 %) | both | — |
| Wrong first answer at every decision, then the key | 17/30 (57 %) | none | none |
| Wrong first at decision 1, 3 or 4 only | 27/30 (90 %) | none | none |
| Wrong first at decision 2 or 5 only | 28/30 (93 %) | none | none |
| Reference plus loperamide, or full-dose anticoagulation, or bowel preparation | 27/30 (90 %) | none | the drug or step (contraindicated) |
| Reference plus morphine and ibuprofen | 27/30 (90 %) | none | both (contraindicated) |
| Reference plus azathioprine at once (the report's drug, no genotype) | 30/30 (100 %) | none | azathioprine (contraindicated) |
| Reference plus infliximab before any IV steroid | 30/30 (100 %) | none | infliximab (contraindicated) |
| Pneumatic compression instead of LMWH; hydrocortisone instead of methylprednisolone | 30/30 (100 %) | none | none |
| No VTE prophylaxis | 20/30 (67 %), stuck in the admission phase (objective 3 open) | `rb-vte-prophylaxis` | — |
| Oral prednisone instead of an IV steroid (the report's drug) | 19/30 (63 %), stuck in the admission phase | `rb-iv-steroids` | — |

Ordering cannot be scored by the condition language (CMCR_CASES "Known limits"): starting azathioprine before any
genotype result and infliximab before IV steroids are flagged as contraindicated safety events in the debrief but
cost no marks. The two critical items are acts, timed by `indicatedWhen: { "phase": "admission" }`; because the
work-up phase also waits for them, a learner who omits them cannot reach the work-up results until they act — the
critical item then records that the act was late or missing.

## Reference path (`solution`)

69 steps: start → 24 history items (13 of them unrecorded, answered in lay words such as "I'm not sure, doctor") → conscious
level, nervous system, abdomen → IV access → blood count and CRP ordered and read → biochemistry, group and save and a
plain abdominal film ordered (no recorded result) → stool samples sent (result in the work-up phase) → CT read → decision 1 → decision 2 → venous
imaging sought (no recorded result) → neurology review → decision 3 → IV methylprednisolone, LMWH prophylaxis,
paracetamol, stool chart, colorectal surgery review (→ `workup`) → stool tests, other infection tests, endoscopy and
biopsy read; CMV in the biopsies sought (no result) → decision 4 → MRI and CSF read → decision 5 → viral serology and
TPMT/NUDT15 sent (→ `followup`) → outcome record → finish. It scores **30/30** with no contraindicated act;
`cases verify` passes, and the offline demonstration finishes with every objective at the clinical score in clinical
and in-world mode, in both languages.

## Clinical numbers check

Every value is version 1.0.0's, unchanged; no reference range, vital sign or dose of the report has been added.
Extraction map (1.0.0 field → 1.1.0 field):

| Fact (as recorded) | 1.0.0 field | 1.1.0 field(s) |
|---|---|---|
| 38-year-old woman | `patient.age`, `sex` | `patient` |
| Memory problem, sudden, "within 1 day" (1 天内突然出现); she cannot recall that morning | `history.onset`, `history.presentation`, `openingLine` | `history.memory-gap`, chief complaint, opening line, triage note |
| Alert (意识清楚) by the afternoon | `history.progression` | `history.recovery`, `exam.conscious-level`, triage note |
| Heavy bloody stools (大量便血) from that night | `history.progression` | `history.bleeding-onset`, triage note, summary |
| Right lower abdominal pain and fever with the bleeding; no rigors, nausea or vomiting | `history.associated` | `history.abdominal-pain`, `history.fever`, `history.nausea-vomiting` |
| Later > 10 bloody stools a day (zh: and the amount clearly increased) | `history.redflags` | `history.stool-frequency` |
| Two years of recurrent loose (糊状) bloody stools and urgency (总想排便), bouts of weeks that remit and relapse | `history.pmh` | `history.chronic-bowel` |
| She felt the bouts were related to stress | `history.exposure` | `history.stress-trigger`, persona |
| No unusual medication history | `history.medications` | `history.medications`, nurse handover |
| After recovery of awareness, no definite focal neurological abnormality | `exam.exam-1` | `exam.neuro-exam` (and `exam.conscious-level`: alert) |
| Right lower abdominal pain; a mass possibly palpable on examination | `exam.exam-2` | `exam.abdomen` |
| Hb 129 → 93 g/L; CRP 95.8 mg/L | `investigations.infection` | `fbc`, `crp` (admission; "during the bleeding, timing not recorded") |
| Repeated stool pathogen tests and C. difficile toxin negative; several infection studies negative | `investigations.infection` | `stool-microbiology` (work-up), `other-infection-tests` (work-up) |
| CT: thickened ascending colon and rectum | `investigations.gut` | `ct-abdomen` (admission and work-up; timing not recorded) |
| Colonoscopy: irregular circumferential elevation at ~30 cm; distal diffuse shallow ulcers, erosions, erythema (充血) | `investigations.gut` | `endoscopy` (work-up) |
| Severe acute and chronic inflammation; no definite crypt abscesses or tumour cells; IHC not supporting lymphoma | `investigations.pathology` | `biopsy-pathology` (work-up) |
| MRI: multifocal punctate white-matter abnormalities | `investigations.neuro` | `brain-mri` (work-up) |
| CSF pressure 85 mmH₂O; routine, biochemistry and listed pathogen studies unremarkable | `investigations.neuro` | `csf-analysis` (work-up, structured values) |
| Prednisone and azathioprine; later MRI lesions partly resolved; colonoscopy improved; IBD subtype and CNS mechanism not established | `investigations.outcome`, decision 3 options | `outcome` (follow-up), responses of `oral-prednisone` and `azathioprine` |
| "Vasculitis or demyelination is unconfirmed"; no tissue confirmation of cerebral vasculitis | decision `safety` options and feedback | teaching point 5, key reasoning 5, debrief conclusion |

Derived values (editorial, for teaching): the Hb fall of 129 → 93 g/L is 36 g/L (≈ 28 %); 93 g/L = 9.3 g/dL, below
the Truelove and Witts threshold of 105 g/L (10.5 g/dL), so she meets the criteria on stool frequency (> 10 a day,
≥ 6 needed) and haemoglobin alone; CRP 95.8 mg/L ≈ 9.6 mg/dL, above 30 mg/L. The Travis day-3 rule (> 8 stools, or
3–8 with CRP > 45 mg/L) applies only after three days of IV steroids — her admission values cannot be scored by it,
and no day-3 values are recorded. CSF 85 mmH₂O ≈ 8.5 cmH₂O ≈ 6.3 mmHg. No pulse or temperature value is recorded, so
those two Truelove and Witts items cannot be scored.

Doses in the case are guideline formulas, not the report's (no weight is recorded, so no dose is computed):
methylprednisolone 60 mg/24 h or hydrocortisone 100 mg 6-hourly IV; enoxaparin 40 mg SC daily (prophylaxis) or
1 mg/kg 12-hourly (the treatment-dose trap); azathioprine target 2–2.5 mg/kg/day adjusted to TPMT/NUDT15 genotype;
infliximab 5 mg/kg IV; paracetamol 1 g up to four times a day (maximum 4 g/24 h); the traps' doses (loperamide 4 mg
then 2 mg, maximum 16 mg/day; morphine 2.5–5 mg; ibuprofen 400 mg 8-hourly; hyoscine butylbromide 20 mg;
polyethylene glycol preparation; ceftriaxone 2 g daily with metronidazole 500 mg 8-hourly). The report's prednisone
and azathioprine doses are not recorded.

## Facilitator notes

### Debrief questions (PEARLS)

1. **Reactions** — "How did it feel to meet a frightened woman who has lost a morning and is passing blood ten times
   a day?"
2. **Description** — "Take me through the first day: how ill did you think she was, what did you send, and what did
   you start before any result was back?"
3. **Analysis**
   * "Her pulse and temperature are not recorded. Could you still grade the flare — on what?"
   * "Two years of bloody stools put down to stress: what does that history change about last night?"
   * "She is bleeding heavily. Why did she still need heparin — and when would you hold it?"
   * "Which drugs for pain, cramps and diarrhoea did you avoid, and why do they matter in a severe flare?"
   * "Why an unprepared flexible sigmoidoscopy rather than a full colonoscopy?"
   * "What did the lesion at 30 cm make you think of, and what answered it?"
   * "A morning she cannot recall, during a flare: which cause could you not afford to miss, and which test finds it?"
   * "The MRI shows white-matter spots and the CSF is normal. How would you describe the link to her bowel disease —
     and how does it change your choice of a biologic?"
   * "The report's team used prednisone and azathioprine. What would you add today before the first azathioprine
     tablet?"
4. **Summary** — "What will you do in the first hour the next time a patient with long-standing bloody diarrhoea is
   admitted with a severe flare?"

### Common learner errors and how the case surfaces them

| Error | How the case surfaces it | Where it scores |
|---|---|---|
| Calling it food poisoning or "stress" because of the fever and her own explanation | decision 1 distractor (infective colitis first) | `rb-severity` |
| Downgrading the flare because observations are missing | decision 1 distractor (moderate flare) | `rb-severity` |
| Oral prednisone and azathioprine as the first-day plan (the report's drugs) | decision 3 distractor; `oral-prednisone` neutral, `azathioprine` contraindicated without a genotype; the work-up phase waits for an IV steroid | `rb-first-line-plan`, `rb-iv-steroids` (critical) |
| Withholding heparin because she is bleeding | decision 3 near-miss distractor; the work-up phase waits for prophylaxis (LMWH or compression) | `rb-first-line-plan`, `rb-vte-prophylaxis` (critical) |
| Loperamide, opioids, NSAIDs or antispasmodics for comfort | each contraindicated in every phase | `rb-avoided-harm` |
| Bowel preparation for a full colonoscopy in a severe flare | `bowel-preparation` contraindicated | `rb-avoided-harm` |
| Infliximab first, or without a neurology view of the MRI | decision 3 and 5 distractors; `infliximab` contraindicated before IV steroids or neurology review | flagged |
| Treating the circumferential lesion as lymphoma or cancer | decision 4 distractors | `rb-colitis-cause` |
| Reassuring the neurological episode as transient global amnesia, or a plain CT and "stress" | decision 2 distractors | `rb-neuro-workup` |
| Anticoagulating a presumed venous thrombosis before imaging | decision 2 distractor; `therapeutic-anticoagulation` contraindicated | `rb-neuro-workup`, `rb-avoided-harm` |
| Azathioprine at full dose, or after TPMT alone, in an East Asian patient | decision 5 distractors | `rb-thiopurine-safety` |
| Over-stating the bowel–brain link ("IBD caused the lesions") | examiner item; teaching point 5 | `rb-communication` |
| Inventing the unrecorded (vital signs, the witness account, doses) | unknown items, no-result records, `examNotRecorded` | — |

## Embodied mode

* **Where she is.** Ward bed (`inpatient`) throughout; no phase or intervention moves her. Every imaging,
  endoscopy, pathology and CSF report is a record review (`performedAt: "records"`, `requires: ["records"]`,
  `risk: "none"`), read at a records terminal or at the bedside: the CT, venous imaging, brain MRI, CSF, endoscopy,
  biopsy histology, CMV in the biopsies, the other infection tests and the outcome record. The plain abdominal film
  is a portable film (`performedAt: "bedside"`, ordered in the reference path; no result is recorded), and the EEG a
  bedside test on the ward EEG cart (not in the reference path).
* **Kit.** IV access is a procedure (`iv-access`, the treatment cart); bloods and stool samples are taken at the
  patient; the IV steroid and the infliximab trap need IV access (infliximab also the infusion pump); LMWH and the
  oral drugs need only the medicines; red cells need the blood bank. The TPMT/NUDT15 test needs the molecular
  capability (pathology and genetics workstation); the viral serology is a laboratory test.
* **Who speaks.** She is alert throughout and answers for herself; there is no companion and no `nonVerbalWhen`.
  Thirteen history items are unrecorded and she says "I'm not sure, doctor." / “这个我说不上来，医生。”
* **Scope of practice.** Drugs and blood follow their kinds (nursing administration); pneumatic compression and the
  stool chart are nursing (`scope: "nursing"`); the consultations are clinician acts.
* **Demonstration.** `embodied-autopilot.test.ts -t "cmcr-598475:"` passes in en and zh-CN (every objective done,
  in-world score equal to the clinical score).

## Source and adaptation (fidelity limits)

**From the report, via version 1.0.0 (kept as fact).** Every fact in the extraction map above: her age and sex; the
sudden memory disturbance of one morning and recovery by the afternoon; the heavy bleeding from that night, the
right lower abdominal pain and fever, the absent rigors, nausea and vomiting; more than ten bloody stools a day; the
two-year history and her belief that stress triggered it; no unusual medicines; the two examination findings; the
haemoglobin fall and CRP; the stool and infection tests; the CT, colonoscopy and biopsy findings; the MRI and CSF;
prednisone and azathioprine; partial MRI resolution and mucosal improvement; the unresolved IBD subtype and brain
mechanism.

**Adapted for teaching.** Her lay words and her two worries (labelled as part of the role; they add no fact); the
ward staging into admission, work-up and follow-up; the blood count, CRP and CT shown from admission and the stool,
endoscopy, biopsy, MRI and CSF reports in the work-up phase, all dated "timing not recorded"; the split of "alert
after recovery of awareness" into a conscious-level finding and a neurological examination; the staff characters
(Nurse Lin, Dr Hao, Dr Zhong, Dr Yan); the decisions, interventions, rubric, feedback, teaching points and doses
(current guidance).

**Inconsistencies in 1.0.0 kept, not resolved.**
* The article title says 记忆力下降 ("memory decline"), while 1.0.0's text records a sudden disturbance within one
  day with recovery by the afternoon. The case keeps the transient episode as recorded and lists the point to verify.
* The history speaks of memory ("cannot recall that morning"), the examination of awareness ("after recovery of
  awareness"; 意识). The case keeps both words: a disturbance of memory and awareness.
* The bleeding frequency: the Chinese text says more than ten times a day *and* clearly more blood; the English text
  gives only the frequency. The case uses the Chinese reading (the source language) in both languages.
* Colonoscopy findings stop at about 30 cm (the lesion and the mucosa distal to it), while the CT records thickening
  of the ascending colon; how far the scope passed is not recorded. 1.0.0 translates 充血 as "erythema"; kept.

**Not recorded and kept unknown** (`unknowns`, unknown history items, no-result records, `examNotRecorded`): every
vital sign; the morning's events, any witness, duration, seizure features and earlier episodes; the rest of the blood
work and the timing of the two haemoglobin values; which infection tests were done; the plain film; CT, endoscopy
and pathology details; MRI sequences and sites, venous or arterial imaging, EEG, CSF counts; drug doses, routes and
timing, thromboprophylaxis, the day-3 response and rescue therapy; the follow-up interval and final IBD type; her
allergies, other illnesses, operations, family history, smoking, travel, extraintestinal symptoms and pregnancy
status.

**Wording of unknowns (STANDARD §6.3).** Because the article has not been checked, no text claims that the *report*
lacks something: no-result records say "No result is recorded for this test" / “此项检查没有结果记录”, steps the case
does not record say "This case does not record whether…; it does not simulate the effect", `examNotRecorded` says
"This case does not record this examination." / “本病例没有记录这项检查。”, and the patient answers unknowns in lay
words ("I'm not sure, doctor." / “这个我说不上来，医生。”).

**Privacy and figures.** Pseudonym 白清和 / Bai Qinghe (unchanged from 1.0.0); no hospital, date, place or
occupation; relative time only. The media review (`scripts/cmcr-105-media-review.json`) approves `fig01.png` and
`fig02.png` ("original clinical imaging, specimen or histology; no identifying overlay"): they are attached to the
follow-up outcome record only, with neutral titles, so nothing is shown before the decisions; the brain MRI figure
`fig03.png` is withheld (a partial calendar overlay at the top edge), and its finding is kept as text. No decision
depends on reading an image.

### To verify

Details to look for in the full article (the source check is pending):
* The neurological episode: a single transient spell (1.0.0: sudden "within 1 day", alert by the afternoon) or a
  memory *decline* as the title says; who described the morning, its duration, any seizure features or earlier
  episodes; whether consciousness, not only memory, was impaired.
* Her admission vital signs (pulse, temperature value, blood pressure) and weight; when she was admitted relative to
  the night the bleeding began.
* The full blood panel (white cells, platelets, ESR, albumin, electrolytes and magnesium, renal and liver tests,
  clotting) and when Hb 129 and 93 g/L were measured; any transfusion.
* The stool tests (pathogens, number of samples) and which "several infection studies" were done (CMV, hepatitis B
  and C, HIV, tuberculosis, blood cultures).
* Any plain abdominal film; the CT details (contrast, colonic calibre, abscess, other findings).
* The endoscopy: colonoscopy or sigmoidoscopy, extent, bowel preparation, the colon above 30 cm, whether the 30 cm
  lesion narrowed the lumen; biopsy sites, the immunohistochemistry panel, granulomas, CMV staining.
* The MRI sequences and lesion sites, any venous or arterial imaging, an EEG, CSF cells, protein and glucose and the
  pathogens tested; any vasculitis, antiphospholipid or thrombophilia work-up.
* The treatment: prednisone dose, route and duration (and whether IV steroids were used first), azathioprine dose
  and start, any TPMT test, thromboprophylaxis, antibiotics or 5-ASA; the day-3 response; any rescue therapy.
* The follow-up: interval, extent of MRI resolution, the appearance of the 30 cm lesion, the final diagnosis (UC,
  Crohn's disease or IBD unclassified; whether Behçet's disease or tuberculosis was considered) and her course.
* Extraintestinal symptoms (oral or genital ulcers, eyes, joints, skin), family history, smoking and travel.

Guidance details to confirm in the full texts (taken from abstracts and secondary summaries; the guideline sites were
not reachable for full text from this environment):
* BSG 2025 (Moran et al.): the acute severe UC definition (Truelove and Witts with CRP > 30 mg/L in place of the ESR),
  the steroid regimen, thromboprophylaxis, flexible sigmoidoscopy rather than colonoscopy, drug avoidance, day-3
  assessment and the rescue wording (the case cites BSG 2025 for infliximab as rescue and steroid-free remission).
* BSG 2019 IBD consensus and NICE CG166 (2013): the advice to withhold antidiarrhoeal, anticholinergic, opioid and
  NSAID drugs and to avoid full colonoscopy in acute severe colitis — confirmed only through reviews; whether
  NG130 (2019) or BSG 2025 restate it.
* ACG 2025: the IV steroid statement (methylprednisolone 60 mg/day or hydrocortisone 100 mg three to four times
  daily, from a secondary summary) and its DOI (one secondary source gives 10.14309/ajg.0000000000003463; not
  confirmed, so the case cites it without a DOI).
* AGA 2026 clinical practice update (Cohen-Mekelburg et al.): methylprednisolone 60 mg with no gain from higher
  doses, stool culture with two-step C. difficile testing and cross-sectional imaging for all hospitalised IBD
  patients, early surgical consultation, and prophylactic anticoagulation for all — from secondary summaries; the
  full author list.
* CAG 2014: the recommendation (no active bleeding) and suggestion (non-severe bleeding) wording is confirmed at
  abstract level; mechanical prophylaxis when bleeding is severe rests on general VTE practice (ACCP), not confirmed
  in the CAG text.
* Truelove and Witts 1955 (one record gives doi:10.1136/bmj.2.4947.1041) and Travis 1996 (doi:10.1136/gut.38.6.905
  is likely) — both cited without DOI until confirmed; the Travis day-3 thresholds and the 85 % figure are confirmed
  by secondary sources.
* BSG 2019 lower GI bleeding guideline: the restrictive transfusion thresholds (70 g/L, target 70–90 g/L; 80 g/L
  with cardiovascular disease) — from secondary summaries.
* CPIC: whether the announced 2025 update of the thiopurine guideline has been published and changes the dosing
  tables; ECCO 2021 infections guideline: a 2026 update appears to exist (J Crohns Colitis 20(7),
  doi:10.1093/ecco-jcc/jjag071) — check the hepatitis B screening wording.
* ECCO 2024 EIM guideline: what it says about neurological manifestations (not reached; the case does not cite it
  for any neurological claim).
* Infliximab labelling: the demyelinating-disease warning is confirmed at highlights level (e.g. infliximab-dyyb,
  revised 2025, section 5.9); ciclosporin neurotoxicity with low cholesterol or magnesium (UK protocols, ECCO
  e-guide); the 12-hour interval between a prophylactic LMWH dose and a lumbar puncture (ASRA 2018 neuraxial rule
  applied to a diagnostic puncture).
* Azathioprine target 2–2.5 mg/kg/day and the blood-count monitoring schedule.
* Clinician input: a gastroenterologist should review decision 3 and the gating that makes the work-up phase wait for
  an IV steroid and VTE prophylaxis; a neurologist the decision 2 key and the neurologist's knowledge.

## Matcher notes

* 40 `extensions.testUtterances` (21 zh-CN, 19 en; 3 look-alike negatives), none equal to a canonical question or a
  keyword; every required item is covered. `cases verify`: 40/40, no extra selections.
* **Overlaps separated with `excludeKeywords`:** `bleeding-onset` vs frequency questions (几次/多少回/每天, how
  many, how often) and the two-year history (以前, for a while); `stool-frequency` vs the past; `memory-gap` vs the
  witness and earlier-episode questions (有人, 看到, 旁边, 以前, anybody, saw); `previous-spells` vs bowel words;
  `chronic-bowel` vs that morning, family, operations and trigger questions (原因, 诱因, 有关); `stress-trigger` vs
  worries; `medications` vs allergies; `other-illnesses` vs family; `family-history` vs the witness question.
* **Containment traps fixed:** a single keyword also matches inside a longer word, so `skin` (inside "this kind"),
  `cause` (inside "because") and `fit` (inside "benefit") were replaced (`skin rash`, `causes`, `fits`); English
  phrases that reduce to one token are run together (`howmanytimes`, `tripstotheloo`, `forawhile`, `beforethis`,
  `someonewithyou`, `whyithappens`, `offyourfood`).
* Interventions: "heparin prophylaxis/预防" reaches LMWH, "full anticoagulation/治疗剂量" the treatment-dose trap
  (each excludes the other's words); "prednisone/泼尼松" reaches the oral drug and "methylprednisolone/甲泼尼龙" the IV
  one; "colonoscopy" as an order finds the endoscopy record, as an intervention the bowel-preparation trap.

## References

1. 朱祖懿, 杨红, 姚尧, 李晓青, 钱家鸣. 记忆力下降–消化道出血. 中华全科医师杂志. 2014;13(2):91-93.
   doi:10.3760/cma.j.issn.1671-7368.2014.02.005. Available from: https://rs.yiigle.com/cmaid/598475
2. Moran GW, Gordon M, Sinopolou V, et al. British Society of Gastroenterology guidelines on inflammatory bowel
   disease in adults: 2025. Gut. 2025;74(Suppl 2):s1-s101. doi:10.1136/gutjnl-2024-334395
3. Rubin DT, Ananthakrishnan AN, Siegel CA, Barnes EL, Long MD. ACG Clinical Guideline Update: Ulcerative Colitis in
   Adults. Am J Gastroenterol. 2025;120(6):1187-1224.
4. Cohen-Mekelburg S, et al. AGA Clinical Practice Update on Inpatient Management of Adults with Inflammatory Bowel
   Disease: Expert Review. Gastroenterology. 2026;170:408-417. doi:10.1053/j.gastro.2025.08.039
5. 中华医学会消化病学分会炎症性肠病学组, 中国炎症性肠病诊疗质量控制评估中心. 中国溃疡性结肠炎诊治指南(2023年·西安).
   中华炎性肠病杂志. 2024;8(1):33-58. doi:10.3760/cma.j.cn101480-20240123-00017
6. Nguyen GC, Bernstein CN, Bitton A, Chan AK, Griffiths AM, Leontiadis GI, et al. Consensus statements on the risk,
   prevention, and treatment of venous thromboembolism in inflammatory bowel disease: Canadian Association of
   Gastroenterology. Gastroenterology. 2014;146(3):835-848. doi:10.1053/j.gastro.2014.01.042
7. Relling MV, Schwab M, Whirl-Carrillo M, et al. Clinical Pharmacogenetics Implementation Consortium guideline for
   thiopurine dosing based on TPMT and NUDT15 genotypes: 2018 update. Clin Pharmacol Ther. 2019;105(5):1095-1105.
   doi:10.1002/cpt.1304
8. Saposnik G, Bushnell C, Coutinho JM, et al. Diagnosis and management of cerebral venous thrombosis: a scientific
   statement from the American Heart Association. Stroke. 2024;55(3):e77-e90. doi:10.1161/STR.0000000000000456
9. Travis SP, Farrant JM, Ricketts C, et al. Predicting outcome in severe ulcerative colitis. Gut.
   1996;38(6):905-910.

These nine strings are `debrief.references`. Also named in the case's feedback, checked the same way: Truelove SC,
Witts LJ. Cortisone in ulcerative colitis; final report on a therapeutic trial. Br Med J. 1955;2(4947):1041-1048 ·
Singh S, Loftus EV Jr, Limketkai BN, et al. AGA Living Clinical Practice Guideline on Pharmacological Management of
Moderate-to-Severe Ulcerative Colitis. Gastroenterology. 2024;167(7):1307-1343 · Lamb CA, Kennedy NA, Raine T, et al.
British Society of Gastroenterology consensus guidelines on the management of inflammatory bowel disease in adults. Gut. 2019;68(Suppl 3):s1-s106. doi:10.1136/gutjnl-2019-318484 · Oakland K,
Chadwick G, East JE, et al. Diagnosis and management of acute lower gastrointestinal bleeding: guidelines from the
British Society of Gastroenterology. Gut. 2019;68(5):776-789 · Kucharzik T, Ellul P, Greuter T, et al. ECCO
Guidelines on the Prevention, Diagnosis, and Management of Infections in Inflammatory Bowel Disease. J Crohns
Colitis. 2021;15(6):879-913. doi:10.1093/ecco-jcc/jjab052 · Gordon H, Burisch J, Ellul P, et al. ECCO Guidelines on
Extraintestinal Manifestations in Inflammatory Bowel Disease. J Crohns Colitis. 2024;18(1):1-37.
doi:10.1093/ecco-jcc/jjad108 · NICE CG166 (2013), ulcerative colitis (replaced by NG130, 2019) · infliximab
prescribing information (warnings: demyelinating disease).

**How they were checked (2026-11-12).** doi.org, Crossref and the publishers' sites are not reachable from this
environment, so each DOI was confirmed by web search against indexing or repository records that print it: BSG
2025 (university repository records; online 23 June 2025), AGA 2026 (an AGA patient resource with volume and pages;
a clinician summary with the DOI), the Chinese UC guideline (an indexing record with both journal versions), CAG
2014 (McMaster and QxMD records), CPIC 2018 (PubMed 30447069; a library record carrying the Crossref DOI), AHA 2024
(the AHA professional page and summaries), BSG 2019 IBD (repository records), ECCO 2021 and ECCO 2024 (repository
records), AGA 2024 (summaries and its PMC record; its thiopurine-maintenance suggestion is from secondary summaries).
ACG 2025, AGA 2024, Travis 1996, Truelove and Witts 1955 and BSG 2019 lower GI bleeding are cited without DOI (see
To verify). The source article's DOI is the one verified in `scripts/cmcr-105-sources.json` (publisher check
2026-10-29).

## Changelog

### 1.1.0 — 2026-10-30

1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked
against the full source article.

* **Safety and validity (template defects, survey and critic).** The case now has a management decision that names
  the act — IV methylprednisolone 60 mg/day with LMWH prophylaxis and the drugs to avoid — instead of 1.0.0's
  "gastroenterology and neurology jointly assess" key; 20 interventions (1.0.0 had none), including the report's
  prednisone and azathioprine and the tempting harms (loperamide, opioids, NSAIDs, antispasmodics, bowel
  preparation, full-dose anticoagulation, infliximab first-line, azathioprine without a genotype). The critical
  items are now two acts (an IV steroid and VTE prophylaxis in the admission phase), not the hindsight appraisal
  1.0.0 scored (`decidedFirstTry: safety`, a decision gated on the final-phase outcome record). The bowel–brain
  appraisal is taught in the debrief, the neurologist's knowledge and the communication item, not as a scored
  decision. A neurological work-up decision (venous imaging, CSF, EEG) and a thiopurine-safety decision
  (TPMT/NUDT15, hepatitis B) were added.
* **Voice.** No answer says "the source notes do not provide that information"; the persona describes this patient
  (1.0.0's personality and acting notes were authoring rules); unknowns are "I'm not sure, doctor."
* **Governance (survey).** The review note no longer claims that "each source case was read and checked"; status
  `editorial` with the §6 note; `extensions.authorChecks` (unverifiable booleans, including the stale
  `mediaAwaitingPrivacyReview`) and `sourceTextSha256` removed until the source pass; `sourceTextChecked: false`.
  The README now states the media review outcome (two approved figures shown with the outcome; the MRI figure
  withheld) instead of "images await privacy review".
* **Structure.** Phases `initial`/`workup`/`followup` → `admission`/`workup`/`followup` with gates on objectives,
  decisions and the first day's acts; 15 template history items → 24 case-specific items (8 required); two
  "review presentation examination" items → three examination findings; five bundled record reviews → 18 single
  tests with structured values; decisions 3 → 5 with neutral option ids (1.0.0 used `supported`/`alternative-N`) and
  no length cue; rubric 11 → 12 (descriptive ids); objectives 4 → 6; staff 1 → 4; references rebuilt in Vancouver
  form (the bare URL entry removed; the citation's double spaces fixed).
* **Ids changed** (none referenced outside this case): history `presentation` → `bleeding-onset`, `onset` →
  `memory-gap`, `progression` → `recovery` (and the night-time bleeding in `bleeding-onset`), `associated` →
  `abdominal-pain` + `fever` + `nausea-vomiting`, `pmh` → `chronic-bowel`, `exposure` → `stress-trigger`,
  `redflags` → `stool-frequency`, `operations`, `family`, `function`, `prior`, `concerns`, `baseline` → `operations`,
  `family-history`, `previous-care`, `ice` (and `function`/`baseline` removed as template slots); exam `exam-1`/`exam-2`
  → `conscious-level` + `neuro-exam`, `abdomen`; investigations `gut` → `ct-abdomen` + `endoscopy`, `pathology` →
  `biopsy-pathology`, `infection` → `fbc` + `crp` + `stool-microbiology` + `other-infection-tests`, `neuro` →
  `brain-mri` + `csf-analysis`; decisions `interpretation`/`management`/`safety` → `flare-severity`, `neuro-workup`,
  `first-line`, `colitis-cause`, `maintenance-safety`.
* **Contract wording.** The English review note ends "The case is not yet reviewed by a licensed clinician." (the
  collection test matches the lower-case phrase); otherwise it is the standard's §6 text.

### 1.0.0

* Initial template version (PR #5).

## Validation

```bash
npm run -s cc -- cases validate packages/content/cases/cmcr-598475/case.json --strict --lang en   # 0 errors, 0 warnings
npm run -s cc -- cases verify cmcr-598475 --lang en        # 69 steps · objectives 6/6 · decisions 5/5 · utterances 40/40 · rubric 30/30
npx tsx --conditions=source node_modules/.cc-tools/case-check.ts cmcr-598475                  # PASS (depth floor, do nothing 0, wrong-first < reference)
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-598475:"         # collection contract
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-598475:"  # demonstration, en + zh-CN
```

## 中文摘要

**病例概要。** 38岁女性，两年来反复糊状血便伴便意频繁，每次发作数周后缓解又复发，自认为与精神压力有关，无特殊用药史。
某日上午突然出现记忆异常（1天内），那天上午的事回忆不起来，下午神志清楚；当天夜里开始大量便血，伴右下腹痛和发热，无寒
战、恶心、呕吐，之后每天便血十余次、量明显增多。意识恢复后神经系统查体无明确定位体征；右下腹疼痛，疑似可触及包块。血红
蛋白由129降至93 g/L，CRP 95.8 mg/L。CT示升结肠和直肠壁增厚；肠镜约30 cm处不规则环周隆起，远端弥漫浅溃疡、糜烂、充血；
黏膜活检为严重急慢性炎症，未见明确隐窝脓肿或肿瘤细胞，免疫组化不支持淋巴瘤；粪便病原学反复及艰难梭菌毒素阴性，其他多项
感染检查阴性。头颅MRI示多部位白质点状异常信号；脑脊液压力85 mmH₂O，常规、生化及所列病原学无异常。原报告用泼尼松和硫唑嘌
呤治疗，随访MRI异常部分消退、肠镜黏膜改善；炎症性肠病类型和脑部病变机制均未确定。生命体征、药物剂量和随访间隔均未记录。
本版患者事实全部沿用1.0.0版的提取，尚未对照原文全文核对。

**学习目标。**
1. 用Truelove–Witts标准判定急性重症结肠炎（每天血便≥6次加一项全身表现），缺少部分生命体征也不降级，并收住院静脉治疗（BSG 2025；AGA 2026）。
2. 送检粪便后开始静脉甲泼尼龙60 mg/24 h（或氢化可的松100 mg每6小时），非重度出血时仍用低分子肝素预防血栓（CAG 2014），停用止泻药、阿片类和非甾体抗炎药。
3. 按排便次数和CRP安排第3天评估（Travis 1996），与结直肠外科规划挽救方案，并在白质病变原因未明时权衡抗TNF治疗风险。
4. 综合粪便检查、CT、内镜和活检诊断未定型炎症性肠病，并以病理和随访排除感染、淋巴瘤和癌。
5. 对炎症性肠病活动期的一过性记忆和意识障碍，按指征安排MRI、脑静脉成像（AHA 2024）、脑脊液和脑电图，并如实说明肠–脑关系“可能相关、尚未证实”。
6. 硫唑嘌呤首剂前检测TPMT和NUDT15基因型（CPIC 2018更新版）、筛查乙肝（ECCO 2021）并监测血常规。

**关键决策。** 决策 1：急性重症结肠炎，住院静脉治疗（非“中度发作”“感染性结肠炎”或“局灶出血点”）。决策 2：头颅MRI加MR静脉成
像，必要时脑脊液和脑电图（非“短暂性全面遗忘不需检查”、头颅CT平扫或未经影像即足量抗凝）。决策 3：静脉甲泼尼龙60 mg/d，除非出血严重均加
低分子肝素预防血栓（出血严重时改用间歇充气加压），不用止泻药、阿片类和非甾体抗炎药，不清肠乙状结肠镜活检，第3天与外科评估（干扰项包括原报告的口服泼尼松加硫唑
嘌呤、等培养结果、英夫利西单抗一线、完全不用肝素）。决策 4：未定型的炎症性肠病，感染、淋巴瘤和癌均无支持。决策 5：按TPMT和
NUDT15基因型给药的硫唑嘌呤，先筛查乙肝、丙肝和HIV。关键项为入院阶段的静脉激素和血栓预防两项行为。

**复盘要点。** 长病史改变急性表现的解读；严重程度按已有记录判定，缺少读数不等于病情轻；出血不严重时照样预防血栓，抑制结肠的
药物一律不用；环周病变靠病理而不是印象；炎症发作期的神经系统事件先排除血栓，肠–脑关系只说“可能”；东亚患者用硫嘌呤前查NUDT15，
白质病变未明时慎用抗TNF。原报告的泼尼松加硫唑嘌呤是历史记录，今天的答案是静脉激素、血栓预防和基因型指导下的维持治疗。
