# cmcr-857953 — Recurrent blood-streaked sputum and fever · 55-year-old woman

> Facilitator guide — spoilers: the diagnosis, the decisive results and the recorded outcome follow.
> Version 1.1.0 was re-authored from the facts recorded in version 1.0.0; the patient facts have not yet been
> checked against the full source article, and no licensed clinician has reviewed the case.

## Case card

| Field | Value |
|---|---|
| Case | `cmcr-857953`, version 1.1.0 |
| Title | 反复痰中带血、发热 · 55岁女性 / Recurrent blood-streaked sputum and fever · 55-year-old woman |
| Patient | 齐予宁 / Qi Yuning (pseudonym), a 55-year-old woman |
| Setting / facility | inpatient (`general-hospital`): the ward bed, the endoscopy suite for bronchoscopy, the records terminal |
| Difficulty / time | 4 of 5 · about 40 minutes |
| Specialties | respiratory medicine, infectious disease, allergy and immunology |
| Languages | Simplified Chinese and English |
| Structure | 5 phases · 23 history items (9 required, 9 not recorded) · 3 examination findings · 16 investigations · 14 interventions · 5 decisions · 6 objectives · 12 rubric items (2 critical) · 5 staff |
| Review status | editorial (2026-10-30; independent review 2026-11-14): AI-assisted teaching design reviewed against the cited guidance; patient facts as extracted for 1.0.0, not yet checked against the full article; not reviewed by a licensed clinician |
| Source | 牟向东, 章巍, 曹菊, 陈建, 聂立功, 熊焰, 高莉, 王广发. 肺放线菌病一例. 中华结核和呼吸杂志. 2013;36(8):617-619. doi:10.3760/cma.j.issn.1001-0939.2013.08.018 (DOI verified 2026-10-29) |

## Learning outcomes

1. Build a differential for a central hilar mass that has recurred in the same place for six years and improved with
   every antibiotic course — a tumour with obstructive infection, tuberculosis, a chronic bacterial infection — and
   explain why shrinkage on antibiotics excludes none of them.
2. Sample before treating again: sputum acid-fast smear, mycobacterial culture and a rapid molecular test
   (ATS/IDSA/CDC 2017; WHO 2025), no fluoroquinolone trial while TB is possible (ISTC 2014), and bronchoscopic biopsy
   and lavage for a central lesion (ACCP 2013).
3. Explain why one biopsy without tumour cells does not exclude a tumour, and use Gram, silver, acid-fast and modified
   acid-fast stains to tell Actinomyces from Nocardia, fungi and mycobacteria, stating what sulphur granules mean.
4. For a patient with penicillin and cephalosporin labels of unknown type, take a structured allergy history and refer
   for assessment (AAAAI/ACAAI 2022), giving no β-lactam meanwhile and choosing an active alternative such as a
   tetracycline.
5. Plan a months-long course for actinomycosis (traditionally 6–12 months; Valour 2014), stopping on clinical and CT
   resolution, and switch to another active class — rather than stop early — when adverse effects such as minocycline
   pigmentation appear.
6. Explain to the patient in plain words why the illness kept coming back, why treatment lasts months and why her
   allergy labels need assessing, and check her understanding by teach-back.

## Clinical summary (spoilers)

**Diagnosis: pulmonary actinomycosis.** A 55-year-old non-smoker with type 2 diabetes (4 years) and penicillin and
cephalosporin allergy labels (reactions not recorded) has had a cough with blood-streaked sputum once or twice a year
for six years, each bout settling on about two weeks of antibiotics. Eight years ago a right middle lobectomy was
reported as tuberculosis and followed by three months of TB treatment. Twenty days before admission the cough and
fever returned (up to 39 °C), with sputum and mild breathlessness; on admission her temperature is 38 °C and BP
115/70 mmHg, with localised rhonchi over the right lung and clear breath sounds on the left. The chest CT shows a right
hilar mass of about 4.5 cm that became smaller after antibiotics (moxifloxacin this time).

**Decisive findings.** Repeated sputum acid-fast smears, cultures and the other infection tests sent are negative. The
first bronchoscopy shows hyperaemic, oedematous bronchial mucosa with luminal narrowing; the biopsy shows inflammatory
granulation tissue, necrosis and bacterial colonies, without tumour cells. After the antibiotics are stopped the mass
returns with infiltrates; the repeat bronchoscopy finds yellow granules blocking the bronchus, and the specimens show
sulphur granules with radiating filaments, Gram- and silver-positive and negative on both the acid-fast and the
modified acid-fast stain. Specialist review identifies Actinomyces in the specimens from two occasions.

**Recorded course.** Minocycline was stopped because of pigmentation and gastrointestinal effects; azithromycin
followed for six months. The lesions largely resolved, leaving mild bronchiectasis, and no relapse was reported after
treatment stopped (the length of follow-up is not recorded).

**Today's answer.** Do not read the shrinkage on antibiotics as cure: test for TB (three sputum specimens for smear and
culture, a rapid molecular test) before any further fluoroquinolone, keep her under airborne precautions until TB is
excluded, and get tissue by bronchoscopy; characterise the colonies with special stains; once Actinomyces is found,
assess the allergy labels (penicillin is the drug of choice), start an active non-β-lactam meanwhile (a tetracycline),
treat for months, and switch class rather than stop when adverse effects appear.

## Scenario timeline and physiology

All phases use a static clock: nothing deteriorates, and no physiology is modelled. Every phase after the first opens
on its own once its gate holds, and the learner cannot go back to the admission phase.

| Phase | Opens when | What the learner meets | Records with a result in this phase |
|---|---|---|---|
| `admission` — Admission: fever and another bout of blood-streaked sputum | start | the patient on the ward: history (the six years, this flare, the antibiotics, the lobectomy, diabetes, the allergy labels), temperature, BP, chest auscultation | chest CT reports (first CT and the repeat after antibiotics); placeholders for the tests sent now (sputum, molecular test, bronchoscopy arranged); "no result recorded" for blood count/CRP, glucose/HbA1c, blood cultures, HIV, PET-CT, CT-guided biopsy and the old lobectomy report |
| `workup` — First test results | objectives 1–2 complete (history, examination, CT read; decision 1 right; sputum smear/culture, the molecular test and bronchoscopy ordered in `admission`) | the sputum results, the first bronchoscopy and its biopsy | sputum smear and culture (negative), first bronchoscopy, biopsy pathology; "no result recorded" for the molecular test, lavage cultures and PET-CT |
| `relapse` — Relapse after the antibiotics stopped | objective 3 complete (first results read; decision 2 right) | the mass back with infiltrates; the repeat bronchoscopy | relapse CT, repeat bronchoscopy, specimen pathology, specialist review (only once decision 3 is right) |
| `treatment` — On treatment | objective 4 complete (decisions 3–4 right; doxycycline or minocycline started) | the recorded course: minocycline stopped for pigmentation and gastrointestinal effects | ECG ("no result recorded") |
| `followup` — Recorded course and outcome | all five decisions right and objective 5 complete (a macrolide started) | the recorded treatment and outcome | recorded course and outcome, with the approved figure group |

The shrinkage on moxifloxacin is known at admission, as in 1.0.0 (the patient's answer and the first CT record); the
relapse after the antibiotics were stopped is staged after the first bronchoscopy because 1.0.0 places the second
bronchoscopy "after the recurrence". 1.0.0 does not date any of these events against the admission; see "To verify".

## Decisions and assessment

### Objectives (HUD task list)

| # | Objective | Completes when |
|---|---|---|
| 1 | `obj-bedside` Take the six-year story, examine her and read the CT | the six-year course, this flare, earlier antibiotics, moxifloxacin, lobectomy, long-term illnesses and allergies asked; temperature, BP and chest examined; chest CT read in `admission` |
| 2 | `obj-first-plan` Choose the first tests and send them | decision 1 right; sputum smear/culture, the rapid molecular test and bronchoscopy ordered in `admission` (in any order) |
| 3 | `obj-first-results` Interpret the first results | sputum, bronchoscopy and biopsy read in `workup`; decision 2 right |
| 4 | `obj-relapse-cause` Identify the cause and start a treatment she can take | relapse CT, repeat bronchoscopy, specimen pathology and specialist review read; decisions 3–4 right; doxycycline or minocycline given |
| 5 | `obj-intolerance` Review her treatment | the minocycline question asked; decision 5 right; a macrolide given |
| 6 | `obj-recorded-course` Compare your plan with the recorded course | the outcome record read in `followup` |

Objectives 1–2 contain first-phase conditions (`{"read": …, "phase": "admission"}`, `{"ordered": …, "phase": "admission"}`),
which the next phase waits for, so a learner cannot leave the admission phase without them and no objective can become
impossible to complete (the collection's late-learner check passes). Titles name no diagnosis, drug or later event
(the journal lists later objectives by title from the start, so no title announces the relapse or the intolerance);
hints are questions and contain no option text.

### Decisions

| id | Opens after | Key | Distractors (why they tempt) |
|---|---|---|---|
| `initial-workup` | six-year course, earlier antibiotics, this flare, moxifloxacin and lobectomy asked; temperature and chest examined; CT read | three sputum specimens for acid-fast smear, mycobacterial culture and a rapid molecular test, then bronchoscopy with biopsy and lavage, under airborne precautions | finish moxifloxacin and repeat CT in six weeks (the historical cycle); restart four-drug TB treatment on the old label; CT-guided percutaneous biopsy first; PET-CT to decide cancer against infection |
| `first-results` | sputum, bronchoscopy and biopsy read in `workup` | no diagnosis yet: one biopsy does not exclude a tumour; ask pathology for Gram, silver and modified acid-fast stains on the colonies; CT follow-up, with an early repeat bronchoscopy if the mass persists or returns | resolving pneumonia, discharge; smear-negative TB, treat despite negative cultures; resect as a missed tumour; colonies are mouth contaminants |
| `granule-diagnosis` | relapse CT, repeat bronchoscopy and specimen pathology read | pulmonary actinomycosis | nocardiosis (the closest: also Gram- and silver-positive, but weakly acid-fast); airway aspergillosis; relapsed TB; botryomycosis |
| `antibiotic-plan` | decision 3 right; allergies asked | record the labels and refer for allergy assessment (penicillin is the drug of choice); meanwhile doxycycline 100 mg twice daily (or minocycline) for months, guided by CT | IV benzylpenicillin 18–24 million units a day now; ceftriaxone "because cross-reactivity is low" (she has a cephalosporin label too); metronidazole "because Actinomyces is an anaerobe"; two more weeks of moxifloxacin |
| `after-intolerance` | decision 4 right; the minocycline question asked | switch to a macrolide (azithromycin, as in the report, or clarithromycin) after a QTc and interaction check, months more, keep the allergy assessment going | restart minocycline ("pigmentation is cosmetic"); stop and watch; surgery instead |

Every option has its own feedback naming the guidance, its body and year, and the reason. Option ids name the
content (`sputum-tb-tests-and-bronchoscopy`, `assess-labels-start-tetracycline`…), never correctness. No key is the
longest option of its decision in either language (`cases validate --strict` shows no length-cue warning). No decision
is open at the start; none is gated on a history item the case does not record.

### Rubric (11 deterministic items, total weight 28, + 1 examiner-judged)

| id | Domain | Weight | Met when |
|---|---|---:|---|
| `rb-history-course` | history | 2 | six-year course, earlier antibiotics, this flare, moxifloxacin course and breathlessness asked (the follow-up twin credits the first and third) |
| `rb-history-background` | history | 2 | lobectomy, diabetes, TB contacts, allergies and the allergy reactions asked (TB contacts and the reactions are not recorded — asking is the competency) |
| `rb-examination` | examination | 1 | temperature, BP and chest auscultation examined |
| `rb-diagnostic-sampling` | investigations | 3 | **critical** — sputum smear/culture, the rapid molecular test and bronchoscopy ordered in `admission` (the phase waits for all three) |
| `rb-first-workup` | diagnosis | 3 | `initial-workup` right first time and airborne precautions given while indicated (before the negative sputum results are read) |
| `rb-first-results` | diagnosis | 3 | `first-results` right first time and the pathology discussion (special stains) requested while indicated — after the first biopsy is read and before the relapse pathology is |
| `rb-diagnosis` | diagnosis | 3 | relapse CT, repeat bronchoscopy and specimen pathology read; `granule-diagnosis` right first time |
| `rb-antibiotic-plan` | management | 3 | `antibiotic-plan` right first time; allergy assessment requested; doxycycline (or minocycline, validly) given |
| `rb-intolerance` | management | 2 | `after-intolerance` right first time; a macrolide given; CT reviews planned while indicated (after decision 4, before the outcome phase) |
| `rb-no-unassessed-beta-lactam` | safety | 4 | **critical** — no benzylpenicillin and no ceftriaxone; scored once decision 4 is attempted or either drug is given |
| `rb-no-masking-or-futile-steps` | safety | 2 | no moxifloxacin, no empirical TB treatment, no metronidazole, no minocycline after it was stopped, no surgical referral; scored once decision 1 or 4 is attempted or any of these is done |
| `rb-communication` | communication | (judged) | Calgary–Cambridge: her fear explored; why tests, isolation and bronchoscopy (consent) rather than another short course; after the diagnosis, a plain explanation (a chronic bacterial infection, not cancer or TB), why months of treatment, the allergy labels, adverse effects to report, teach-back, no blame for earlier courses |

### How wrong choices score (measured with the reducer)

| Path | Deterministic score | Critical items missed | Safety outcome |
|---|---:|---|---|
| reference path (`solution`) | 28/28 (100 %) | none | passed |
| start and do nothing | 0/22 | `rb-diagnostic-sampling` (avoided-harm items not scored) | passed |
| wrong first answer at all five decisions, then right | 14/28 (50 %) | none | passed |
| wrong first answer at one of decisions 1–4 only | 25/28 (89 %) each | none | passed |
| wrong first answer at decision 5 only | 26/28 (93 %) | none | passed |
| reference path + IV benzylpenicillin (on admission or after decision 4) | 24/28 (86 %) | `rb-no-unassessed-beta-lactam` | **not passed** (critical intervention) |
| reference path + IV ceftriaxone after decision 4 | 24/28 (86 %) | `rb-no-unassessed-beta-lactam` | **not passed** (critical intervention) |
| reference path + moxifloxacin, empirical TB treatment, metronidazole, restarted minocycline or a surgical referral (each alone) | 26/28 (93 %) | none | passed |
| reference path with the rapid molecular test ordered last (after the smear/culture and the bronchoscopy) | 28/28 (100 %) | none | passed |
| reference path without the rapid molecular test | stays in `admission` (10/24 there) | `rb-diagnostic-sampling` | passed |
| reference path without airborne precautions, or with them only after the sputum results were read | 25/28 (89 %) | none | passed |
| reference path without the pathology discussion, or with it only after the relapse pathology was read | 25/28 (89 %) | none | passed |
| reference path without the allergy assessment | 25/28 (89 %) | none | passed |
| reference path with the CT reviews planned only in the outcome phase | 26/28 (93 %) | none | passed |
| minocycline instead of doxycycline after decision 4 (the report's drug) | 28/28 (100 %) | none | passed |

A learner who never orders the sputum smear/culture, the molecular test and the bronchoscopy in the admission phase
cannot leave it (the order in which they are placed does not matter), and a learner who never starts a tetracycline
after decision 4, or a macrolide after decision 5, cannot reach the next phase; these are the acts the case is built
on.

### Critical items

- `rb-diagnostic-sampling` (an act): mycobacterial testing and tissue before any further antibiotic — sputum smear and
  culture, the rapid molecular test and the bronchoscopy, all ordered in the admission phase. A gated act: the
  admission phase is not left until all three are ordered, so their order does not matter and none can be credited
  later.
- `rb-no-unassessed-beta-lactam` (an avoided act): no penicillin or cephalosporin while both allergy labels are of
  unknown type. It counts once decision 4 is attempted or either drug is given, so doing nothing does not earn it.

**Safety outcome.** IV benzylpenicillin and IV ceftriaxone are `critical: true`: giving either while the allergy labels
are unassessed (always, in this case: no allergy assessment result is recorded) fails the run's safety outcome
whatever the score, because a reaction of unknown type may be anaphylaxis or a severe skin reaction and a safe
alternative exists. Empirical four-drug TB treatment (high risk) is `critical: false`: wrong here, but a recoverable
misjudgement. Moxifloxacin, restarted minocycline and the surgical referral (moderate risk) and metronidazole (low risk)
are also explicitly `critical: false`.

## Reference path (`solution`)

Start → ask the six-year course, this flare, sputum, breathlessness, the amount of blood, other symptoms, the earlier
antibiotics, the moxifloxacin course, earlier investigations, the lobectomy, TB contacts, diabetes and its treatment,
allergies and the reactions, smoking, alcohol, teeth, family and her worries → temperature, BP, chest → read the chest
CT and the (unrecorded) lobectomy report → airborne precautions, allergy assessment, glucose review → order and read
blood count/CRP, glucose/HbA1c and HIV (no results recorded) → decision 1 → order the molecular test, sputum smear and
culture and bronchoscopy (the phase opens) → read the sputum results, the molecular test (none recorded), the
bronchoscopy, the biopsy and the lavage cultures (none recorded) → pathology discussion → decision 2 → ask about the
relapse → read the relapse CT, repeat bronchoscopy, specimen pathology and lavage cultures → decision 3 → read the
specialist review → decision 4 → plan CT reviews → doxycycline → ask about the minocycline → ECG (none recorded) →
decision 5 → macrolide → ask how it ended → read the recorded course and outcome → finish. 77 steps; `cases verify`
scores it 28/28 and it gives nothing while contraindicated.

## Clinical numbers check

Every number is one 1.0.0 extracted from the report; none is invented. 1.0.0 field → 1.1.0 field. The source check
against the full article is pending.

| Value | 1.0.0 field | 1.1.0 field |
|---|---|---|
| age 55, female | `patient` | `patient` |
| cough with blood-streaked sputum for 6 years, once or twice a year | chief complaint, `history[onset]`, opening line | chief complaint, opening line, `history[blood-streaked-sputum]` |
| earlier bouts improved after about 2 weeks of antibiotics | `history[response]` | `history[earlier-antibiotics]` |
| this time the lesion shrank after moxifloxacin | `history[response]` | `history[moxifloxacin-course]`, `investigations[chest-ct]` (admission) |
| fever and cough again 20 days earlier, up to 39 °C, mild dyspnoea; productive cough | `history[recent]`, triage note | `history[current-fever]`, `[breathlessness]`, `[sputum-now]`, triage note |
| penicillin and cephalosporin allergy, reactions unspecified | `history[allergies]` (wrongly "unknown") | `history[allergies]` (on-ask) and `[allergy-reaction]` (unknown) |
| right middle lobectomy 8 years earlier, pathology "tuberculosis", 3 months of TB treatment | `history[surgery]` | `history[lobectomy]`, `investigations[lobectomy-pathology]` (report not held) |
| type 2 diabetes for 4 years; no smoking history | `history[diabetes]`, `[smoking]` | `history[diabetes]`, `[smoking]` |
| temperature 38 °C and BP 115/70 mmHg on admission | `exam[temp]` | `exam[temperature]`, `[blood-pressure]` |
| localised right-sided rhonchi; clear left breath sounds | `exam[lungs]` | `exam[chest-auscultation]` |
| initial right hilar mass about 4.5 cm; smaller after antibiotics; recurred with infiltrates after they stopped | `investigations[ct]` | `investigations[chest-ct]` (admission; relapse) |
| repeated sputum acid-fast smears, cultures and other listed infection tests negative | `investigations[micro]` | `investigations[sputum-afb-culture]` (workup) |
| mucosal hyperaemia, oedema, luminal narrowing; biopsy inflammatory granulation, necrosis, bacterial colonies, no tumour cells | `investigations[first-biopsy]` | `investigations[bronchoscopy]`, `[biopsy-histology]` (workup) |
| yellow granules blocking the bronchus; sulphur granules with radiating filaments; Gram- and silver-positive; acid-fast and modified acid-fast negative | `investigations[repeat-biopsy]` | `investigations[bronchoscopy]`, `[biopsy-histology]` (relapse) |
| Actinomyces identified on specialist review of the specimens from two occasions | `investigations[repeat-biopsy]` | `investigations[specialist-review]` |
| minocycline stopped for pigmentation and gastrointestinal effects; azithromycin for 6 months | `investigations[followup]` | phase `treatment` description, `history[minocycline-effects]`, `[followup-status]`, `investigations[course-outcome]` |
| lesions largely resolved with mild bronchiectasis; no relapse after stopping; follow-up length not given | `investigations[followup]` | `investigations[course-outcome]`, `history[followup-status]` |

**Derived values (editorial, not in the record):** the symptoms began about two years after the lobectomy (8 − 6
years) and about two years before the diabetes was diagnosed (6 − 4 years); six years at one or two bouts a year is
roughly 6–12 earlier bouts, each treated with about two weeks of antibiotics. No weight is recorded, so no dose is
computed; doses are printed as the usual adult doses or as protocol references.

## Facilitator notes

### Debrief questions (PEARLS)

- **Reactions.** "How did it feel to be handed a mass that was already getting smaller?" "What did you make of her fear
  that something bad was growing in her lung?"
- **Description.** "Walk us through the six years: what happened each time, and what did each course of antibiotics
  show — and not show?" "What did you send before deciding anything, and why in that order?"
- **Analysis.** "Which conditions can shrink on moxifloxacin?" "What would three negative smears and a negative
  culture mean after a fluoroquinolone?" "Why was one biopsy without tumour cells not the end of the work-up?" "What do
  the Gram, silver and the two acid-fast stains each tell you, and which result separates Actinomyces from Nocardia?"
  "Penicillin is the drug of choice — what stopped you, and what would let you use it?" "Why was ceftriaxone no way
  round the label?" "When minocycline had to stop, why not stop treatment altogether?"
- **Summary.** "One thing you will do before the next course of antibiotics for a recurrent lung shadow, and one thing
  you will do with the next penicillin allergy label."

### Common learner errors and how the case surfaces them

- **Closing the case on improvement** — the `initial-workup` and `first-results` distractors (finish moxifloxacin and
  repeat CT; resolving pneumonia; contaminants) and the relapse phase itself.
- **Treating the old label instead of the patient** — empirical TB treatment (contraindicated intervention, decision
  options) when nothing in this illness shows mycobacteria; the pathologist can be asked about the old slides, which
  the case does not hold.
- **A fluoroquinolone before TB testing** — the moxifloxacin intervention is contraindicated (ISTC 2014) and costs
  `rb-no-masking-or-futile-steps`.
- **Skipping the molecular test** — the admission phase waits for it, with the smear/culture and the bronchoscopy
  (`rb-diagnostic-sampling` is critical); a learner who forgets it stays on the ward until it is ordered.
- **Ignoring the colonies** — `rb-first-results` needs the pathology discussion, in time, as well as decision 2.
- **Nocardia or fungus** — the near-miss options of decision 3 turn on the negative modified acid-fast stain and the
  sulphur granules.
- **Blind β-lactam** — benzylpenicillin or ceftriaxone is a critical safety failure; the nurse questions such orders.
- **Metronidazole for an "anaerobe"** — contraindicated once the diagnosis is made; costs the safety item.
- **Stopping at intolerance** — decision 5 and the restarted-minocycline trap.

## Embodied mode

In the in-world mode the patient sits up on a ward bed of the general hospital and answers for herself in every phase
(no companion; she can speak throughout). The chest CT reports, the specialist review, the old lobectomy report
and the outcome record are record reviews (`performedAt: "records"`, `requires: ["records"]`, `risk: "none"`), read at a
records terminal or in the notes at the bedside. Sputum, lavage, blood and HIV tests are sampled at the patient
(`lab-microbiology`, `lab-hematology`, `lab-chemistry`, `lab-serology`); the biopsy pathology needs `histopathology`; the
bronchoscopy (`endoscopy`, `performedAt: "provider"`, moderate risk) takes her to the endoscopy suite — once in the
admission phase (the procedure) and again when its result is retrieved in later phases; the ECG is a bedside test.
Medicines need `medications`; the IV distractors (benzylpenicillin, ceftriaxone) need `iv-access`, and the case has no
IV-access procedure (`extensions.embodied.ivAccessInSitu: false`), so in-world they need no cannula first. Airborne
precautions and the glucose review are nursing or medical acts at the bedside; the consults (allergy, pathology,
surgery) are calls. The in-world demonstration replays the reference path in both languages
(`embodied-autopilot.test.ts -t "cmcr-857953:"`). Every capability the case uses exists in `general-hospital`
(`caseCapabilityGaps` is empty).

## Source and adaptation (fidelity limits)

**From the report (as extracted for 1.0.0; check against the full article pending).** Age and sex; the six-year
history and its frequency; the response of earlier bouts to about two weeks of antibiotics; this flare (20 days, up to
39 °C, sputum, mild dyspnoea); the shrinkage after moxifloxacin; the penicillin and cephalosporin allergies without
reaction details; the lobectomy, its "tuberculosis" pathology and three months of treatment; type 2 diabetes; no
smoking history; the admission temperature and BP; the chest findings; the CT course; the negative sputum studies; the
two bronchoscopies and their pathology; the specialist identification; minocycline stopped for pigmentation and
gastrointestinal effects, six months of azithromycin; the outcome. The extraction table is the numbers check above.

**Adapted for teaching.** The five-phase staging; the patient's lay wording and her voiced worry (a teaching device that
adds no clinical fact); the five decisions, their options and feedback; the 14 interventions — the report's own steps
(minocycline; a macrolide), today's steps the report does not record (airborne precautions, allergy assessment, glucose
review, pathology discussion, doxycycline, CT reviews) and the tempting wrong ones (moxifloxacin, empirical TB
treatment, benzylpenicillin, ceftriaxone, metronidazole, restarted minocycline, surgical referral); the rubric; the
staff (attending, nurse, radiologist, pathologist, pharmacist); the "no result recorded" results for tests a clinician
would ask for (blood count and CRP, glucose and HbA1c, blood cultures, HIV, the molecular TB test, lavage cultures,
PET-CT, CT-guided biopsy, ECG) and the old lobectomy report the case does not hold. The bronchoscopy and the sputum
tests are orders placed in the admission phase whose recorded results appear in the next phase (a staging device; the
placeholders say so).

**Points where 1.0.0 differs with itself, or is ambiguous (kept, not resolved).**
- The English CT text reads "an initial roughly 4.5 cm hilar mass", the Chinese 右肺门 (right hilar); the title also says
  right. The case keeps "right".
- The specialist identification reads 两次标本 (the specimens from two occasions) in Chinese and "both specimens" in
  English; which specimens is not said. The case writes "the specimens from two occasions".
- 1.0.0 does not date the moxifloxacin course, the CTs, the sputum studies or the first bronchoscopy against the
  admission, nor the start of minocycline against the diagnosis; the staging above is the case's, and the result dates
  say "not recorded".
- 1.0.0 marked the allergy item "unknown" while its answer stated recorded allergies (survey finding SI-05); 1.1.0 makes
  the labels an on-ask fact and the reactions an unknown.

**Examination.** 1.0.0 records only the admission temperature and BP and the chest auscultation, so the case has three
examination findings (fewer than the standard's usual six, by design: none is invented); every other manoeuvre —
pulse, respiratory rate, oxygen saturation, clubbing, lymph nodes, the mouth and teeth — returns `examNotRecorded`
(“This case does not record this examination.”).

**Unknowns kept honest** (`unknowns`, the nine unknown history items, "no result recorded" results, `examNotRecorded`):
the allergic reactions; pulse, respiratory rate, oxygen saturation and every blood test; diabetes treatment; the CT
details and dates; the number and kind of sputum specimens and whether they preceded the moxifloxacin; the stains on the
first biopsy; culture, species and susceptibility; the doses and durations of every drug; the site of the pigmentation;
the length of follow-up; the amount of blood; chest pain, night sweats, weight loss; dental health, alcohol, TB contacts
and family history.

**Survey findings applied** (survey.json, template section; this case has no individual audit or critic note):
the work-up phase is no longer gated on an unrecorded history item, the allergy item no longer states recorded facts
under an "unknown" disclosure, and `rb-unknown` is gone (SI-05); authoring language removed from the patient's mouth
and the exam fallback, a persona written for her (SI-04); history split into 23 phase-scoped items with a follow-up twin
(SI-02, SI-06); a corpus written as paraphrases with negatives (SI-07); the bundled records split into single tests with
neutral names, a realistic panel and "no result recorded" items (SI-09); interventions added — 0 → 14 (SI-11); the 3 × 3
decision template with `yes` ids replaced by five decisions of near-misses with full feedback (SI-12); phases with
descriptions and flat gates (SI-13); case-specific objectives (SI-14); a rubric with descriptive ids, act-based critical
items and case-specific judge guidance (SI-15); five staff (SI-16); a debrief with dated teaching points (SI-17);
references and review status (SI-18, SI-19); this guide (SI-20); canonical specialties (SI-21); title, summary and
triage note rewritten (SI-22); difficulty, time, tags and affect calibrated (SI-23).

**Privacy.** Pseudonym (齐予宁 / Qi Yuning, unique in the collection); relative time only; no hospital, department, place
or occupation. Authors' names appear only in the citation. The approved figure group (`fig01`, checksum in
`scripts/cmcr-105-media-review.json`) is attached only to the outcome record, because the composite may show later
findings.

## Matcher notes

The corpus (40 utterances, 20 per language) was written as learner phrasings — colloquial, clinical, multi-clause —
and covers every required item, the follow-up twin and three look-alike negatives (an exam request, a nurse-style
remark, a farewell). Deliberate overlaps resolved with `excludeKeywords`: the presenting complaint against generic
"any other symptoms" questions; the allergy labels against the reactions; diabetes against its treatment; the
patient's own TB history (the lobectomy) against TB contacts; this flare against this time's antibiotic. English
multi-word keywords that reduce to one token are written run together (`howlonghaveyouhad`, `inthepast`,
`whatmedicinesdoyoutake`). "Has it come back since you finished the treatment?" scores the relapse item and the
follow-up twin equally, but the relapse item exists only in the relapse phase and the twin only in follow-up, so each
phase selects one.

## References

1. 牟向东, 章巍, 曹菊, 陈建, 聂立功, 熊焰, 高莉, 王广发. 肺放线菌病一例. 中华结核和呼吸杂志. 2013;36(8):617-619.
   doi:10.3760/cma.j.issn.1001-0939.2013.08.018. Available from: https://rs.yiigle.com/cmaid/857953
2. Lewinsohn DM, Leonard MK, LoBue PA, et al. Official American Thoracic Society/Infectious Diseases Society of
   America/Centers for Disease Control and Prevention clinical practice guidelines: diagnosis of tuberculosis in adults
   and children. Clin Infect Dis. 2017;64(2):e1-e33. doi:10.1093/cid/ciw694
3. World Health Organization. WHO consolidated guidelines on tuberculosis. Module 3: diagnosis. 4th ed. Geneva: World
   Health Organization; 2025.
4. TB CARE I. International Standards for Tuberculosis Care. 3rd ed. The Hague: TB CARE I; 2014.
5. Rivera MP, Mehta AC, Wahidi MM. Establishing the diagnosis of lung cancer: diagnosis and management of lung cancer,
   3rd ed: American College of Chest Physicians evidence-based clinical practice guidelines. Chest. 2013;143(5
   Suppl):e142S-e165S. doi:10.1378/chest.12-2353
6. Khan DA, Banerji A, Blumenthal KG, et al. Drug allergy: a 2022 practice parameter update. J Allergy Clin Immunol.
   2022;150(6):1333-1393. doi:10.1016/j.jaci.2022.08.028
7. Valour F, Sénéchal A, Dupieux C, et al. Actinomycosis: etiology, clinical features, diagnosis, treatment, and
   management. Infect Drug Resist. 2014;7:183-197. doi:10.2147/IDR.S39601
8. Boot M, Archer J, Ali I. The diagnosis and management of pulmonary actinomycosis. J Infect Public Health.
   2023;16(4):490-500. doi:10.1016/j.jiph.2023.02.004
9. Könönen E, Wade WG. Actinomyces and related organisms in human infections. Clin Microbiol Rev. 2015;28(2):419-442.
   doi:10.1128/CMR.00100-14
10. Fabre V. Actinomyces [Internet]. Johns Hopkins ABX Guide. Baltimore (MD): Johns Hopkins University; [updated 2023
    Feb 8; cited 2026 Nov 14]. Available from:
    https://www.hopkinsguides.com/hopkins/view/Johns_Hopkins_ABX_Guide/540005/all/Actinomyces
11. Trubiano JA, Vogrin S, Chua KYL, et al. Development and validation of a penicillin allergy clinical decision rule.
    JAMA Intern Med. 2020;180(5):745-752. doi:10.1001/jamainternmed.2020.0403 (PEN-FAST)

These eleven are `debrief.references`. Further guidance the case was checked against (`provenance.review.guidelines`)
and used outside the debrief — the airborne-precaution dose text (CDC 2005 is also named in the first teaching point):

- Jensen PA, Lambert LA, Iademarco MF, Ridzon R; CDC. Guidelines for preventing the transmission of Mycobacterium
  tuberculosis in health-care settings, 2005. MMWR Recomm Rep. 2005;54(RR-17):1-141.
- 国家卫生健康委员会办公厅. β内酰胺类抗菌药物皮肤试验指导原则（2021年版）. 2021.
- 中华人民共和国国家卫生和计划生育委员会. WS 288—2017 肺结核诊断. 2017. (Its 2017 revision added molecular tests to
  the bacteriological criteria for confirming pulmonary TB.)

The DOIs above were confirmed by web search on 2026-11-13 (publisher, PubMed or index pages) and again against
Crossref (title, volume, issue, pages) in the independent review of 2026-11-14; the WHO, ISTC, CDC, Johns Hopkins and
Chinese documents carry no DOI.

### To verify

Details to look for in the source article:
- The dates of the CT scans, the moxifloxacin course, the sputum studies and the first bronchoscopy relative to the
  admission; the interval from stopping the antibiotics to the relapse; when minocycline was started.
- The full admission findings: pulse, respiratory rate, oxygen saturation, and the blood panel (white count, CRP,
  glucose/HbA1c, any HIV test); how her diabetes was treated.
- The CT descriptions: lobe or segment, density, cavitation, calcification, the bronchi, lymph nodes, size after
  treatment; the extent of the infiltrates at relapse; the last CT and the extent of the bronchiectasis.
- The sputum studies: number of specimens, which cultures, which "other infection tests" (for example TB antibody,
  skin test or IGRA), and whether any molecular TB test or lavage culture was done.
- The first bronchoscopy: which bronchus; whether granules were seen; whether special stains were done then.
- Which two specimens the specialist review covered (the two bronchoscopies, or the lobectomy specimen of eight years
  earlier), and who reviewed them; the Actinomyces species, culture and susceptibility.
- The allergic reactions to penicillin and cephalosporins, and whether any allergy assessment was done.
- Minocycline and azithromycin doses, schedules and duration; the site of the pigmentation; the gastrointestinal
  effects; the length of follow-up.
- The amount of blood in the sputum; chest pain, night sweats, weight loss; dental health, alcohol, TB contacts,
  family history.

Guidance details checked in the independent review (2026-11-14), and what remains:
- ACCP 2013: the pooled 88 % sensitivity of bronchoscopy for central endobronchial cancer and the higher pneumothorax
  rate of transthoracic needle biopsy are in the guideline's abstract (PubMed 23649436). Remaining: the wording and
  grade of the recommendation on further sampling after a non-diagnostic bronchoscopy; whether a newer CHEST guideline
  supersedes it.
- ISTC 2014 (3rd edition, full text read): Standard 3 (two smears or one Xpert MTB/RIF; Xpert first in the seriously
  ill) and Standard 5 (smear- and Xpert-negative: culture, and empirical treatment for strong clinical evidence after
  specimens for culture are taken). The fluoroquinolone point is in the Standard 5 rationale — fluoroquinolones are
  bactericidal for M. tuberculosis, and empiric fluoroquinolone monotherapy has delayed TB treatment and bred
  resistance; the explicit "they should be avoided" of an antibiotic trial is the wording of the earlier editions, so
  the case now quotes the 2014 caution.
- WHO 2025 Module 3 (4th edition, April 2025, confirmed): the exact recommendation on rapid molecular tests as the
  initial test.
- ATS/IDSA/CDC 2017: AFB smear microscopy and the NAAT on the initial specimen are conditional ("we suggest")
  recommendations; three specimens is described as US normative practice — the case says "advises" and "suggests".
- CDC 2005 (through a state reproduction of MMWR RR-17): airborne precautions until three negative sputum smears, at
  least one early-morning, or another diagnosis; confirm against the MMWR text.
- Valour 2014 (full text read): penicillin G 18–24 million units a day IV for 2–6 weeks, then oral penicillin V or
  amoxicillin for 6–12 months; about 3 months after optimal resection; metronidazole inactive; fluoroquinolones
  "usually considered to be inactive" (limited data); doxycycline "considered to have a poor activity" on Actinomyces,
  with clinical successes reported; macrolides and clindamycin used successfully; no doses for the alternatives. The
  tetracycline dose (doxycycline 100 mg twice daily for 6–12 months) is the Johns Hopkins ABX Guide's alternative
  regimen, which also lists azithromycin and clarithromycin under limited data and metronidazole and fluoroquinolones
  as not active. Könönen and Wade 2015: intrinsic resistance to metronidazole; Actinomyces regarded as insignificant
  commensals; prolonged incubation.
- Boot 2023: the full text was not accessible to the review; its abstract supports the diagnostic features
  (acid-fast-negative ray-like organisms, sulphur granules) and "prolonged antibiotics, with surgery in severe cases".
- Doses that no cited actinomycosis source states and a clinician should confirm: minocycline 100 mg twice daily (the
  US label's maintenance dose, after 200 mg initially, where it lists actinomycosis when penicillin is
  contraindicated), clarithromycin 500 mg twice daily, and the distractor doses (ceftriaxone 2 g daily, metronidazole
  500 mg three times daily, moxifloxacin 400 mg daily) — usual adult doses. For a clinician of the specialty: whether
  a tetracycline (rather than clindamycin or a macrolide) is the interim drug of choice in view of Valour's caution.
- 2021 NHC skin-test guidance: what it says about patients with a penicillin or cephalosporin history of unknown type.

## Changelog

### 1.1.0 — 2026-10-30 — re-authored to the clinical content standard from the facts recorded in 1.0.0; not yet checked against the full source article.

- Case card: title "Recurrent blood-streaked sputum and fever · 55-year-old woman" (no diagnosis), a new spoiler-free
  summary and a triage handover; specialties respiratory medicine, infectious disease and allergy and immunology;
  difficulty 4, 40 minutes; topic tags.
- Five phases (admission, first results, relapse, treatment, recorded outcome) with descriptions and flat gates; the
  work-up phase is no longer gated on the allergy item.
- History rewritten from 15 template slots to 23 items in her own voice, phase-scoped, with a follow-up twin; the
  allergy labels are on-ask, the reactions unknown; the template "the source case does not provide" answers removed.
- Examination split into temperature, BP and chest auscultation; `examNotRecorded` reworded.
- Investigations: the four bundled records split into 16 single tests with neutral names, including orderable sputum
  tests, a molecular TB test, bronchoscopy and pathology, a specialist review released after the diagnosis, and "no
  result recorded" items; the figure group attached to the outcome record only.
- 14 interventions added (none before), including two critical β-lactam errors.
- Five decisions replace the 3 × 3 template; option ids name content; feedback names guidance and year.
- Rubric rebuilt (12 items, two act-based critical items, avoided-harm items with `scoredWhen`, case-specific judge
  guidance); `rb-unknown` and the hindsight critical item removed.
- Staff: attending, nurse, radiologist, pathologist, pharmacist with case-specific knowledge.
- Debrief: conclusion, key reasoning, six teaching points (five dated), boundaries, eight unknowns, eleven references
  (two of them added in the independent review below).
- Provenance: review status editorial with nine named guidelines (the Johns Hopkins ABX Guide added in the review);
  `extensions.sourceTextChecked: false`.
- This facilitator guide rewritten to the library template.
- **Independent review (2026-11-14).** Two details 1.0.0 does not record removed: "which she tolerated" (moxifloxacin,
  a decision-4 distractor) and "sent with them" for the other negative infection tests (1.0.0: the other listed
  tests). The admission phase now waits for the rapid molecular test as well, so the critical sampling item no longer
  depends on the order in which the three tests are placed. The pathology discussion and the CT plan are credited only
  while they still matter (`whenIndicated`). ISTC 2014 is quoted for what its 3rd edition says (a caution that
  empiric fluoroquinolones delay TB treatment and breed resistance), and ISTC and WHO are attributed separately; the
  doxycycline alternative and its dose are now sourced (Johns Hopkins ABX Guide 2023, added with PEN-FAST to the
  references), with Valour's caution on doxycycline. Objective titles no longer announce the relapse and the
  intolerance; the attending discusses the recorded azithromycin only after decision 5. zh and en aligned in two
  distractors and the conclusion; the old lobectomy report's text is in-world.

### 1.0.0 — 2026-10-28

Initial template-generated adaptation (thin history slots, three generic decisions, no interventions).

## Validation

From the worktree root:

```sh
npm run -s cc -- cases validate packages/content/cases/cmcr-857953/case.json --strict --lang en
npm run -s cc -- cases verify cmcr-857953 --lang en
npx tsx --conditions=source scripts/case-check.ts cmcr-857953
npx vitest run --maxWorkers=1 packages/content/src/cmcr-105.test.ts -t "cmcr-857953:"
npx vitest run --maxWorkers=1 packages/agent/src/session/embodied-autopilot.test.ts -t "cmcr-857953:"
```

## 中文摘要

**病例概要：** 55岁女性，不吸烟，2型糖尿病4年，有青霉素和头孢类过敏标签（反应不详），8年前右肺中叶切除，病理称肺结核，术后抗结核3个月。六年来每年一两次咳嗽、痰中带血，每次约两周抗生素后好转；这次20天前加重，发热最高39℃，咳痰、轻度气促；入院体温38℃、血压115/70 mmHg，右肺局限性干啰音。胸部CT示右肺门约4.5 cm肿块，莫西沙星治疗后缩小，停药后再发伴渗出。多次痰抗酸涂片和培养阴性；首次支气管镜见黏膜充血水肿、管腔狭窄，活检为炎性肉芽、坏死和细菌菌团，未见肿瘤细胞；复发后支气管镜见黄色颗粒堵塞支气管，标本为硫磺颗粒伴放射状菌丝，革兰和银染阳性、抗酸和弱抗酸染色阴性，两次标本经专科复核鉴定为放线菌——诊断肺放线菌病。米诺环素因色素沉着和胃肠反应停用，改阿奇霉素6个月，病灶基本吸收，遗留轻度支气管扩张，停药后未再复发（随访时长不详）。

**学习目标：** 对反复发作、抗菌后好转的中央型肺门肿块建立鉴别诊断；再次抗菌前先送痰抗酸涂片、培养和快速分子检测，排除结核前不用氟喹诺酮类做试验性治疗，中央型病灶首选支气管镜取材（ATS/IDSA/CDC 2017、WHO 2025、ISTC 2014、ACCP 2013）；理解一次活检阴性不能排除肿瘤，用革兰、银染、抗酸和弱抗酸染色区分放线菌、诺卡菌、真菌和分枝杆菌；对反应不明的青霉素和头孢类过敏标签做结构化评估并转诊（AAAAI/ACAAI 2022），评估前用非β-内酰胺类替代药；制定以月计的疗程，不良反应时换药而不是停药；向患者解释并用回授法确认理解。

**关键决策：** ① 入院时：送3份痰查抗酸涂片、培养和快速分子检测，做支气管镜活检加灌洗，排除结核前空气传播隔离；三项检查都开出后才进入下一阶段，先后顺序不影响评分（干扰项：用完莫西沙星后复查CT、按旧标签重启抗结核、先做CT引导穿刺、先做PET-CT）。② 首轮结果：一次活检阴性不能排除肿瘤，请病理科对菌团加做特殊染色，CT随访、复发早复查支气管镜。③ 复发后：硫磺颗粒、革兰和银染阳性、两种抗酸染色阴性——肺放线菌病（近似项：诺卡菌病）。④ 起始治疗：记录过敏标签并转诊评估（青霉素是首选），在此之前口服多西环素100 mg每日2次（或米诺环素），疗程以月计。⑤ 米诺环素不耐受：换用大环内酯类（原报告为阿奇霉素），先查QTc，继续数月并推进过敏评估。

**复盘要点：** 抗菌后缩小不等于治愈，莫西沙星可掩盖结核；中央型病灶靠支气管镜取材，首次未确诊要再取；坏死组织中的菌团要鉴定；弱抗酸染色阴性和硫磺颗粒把放线菌与诺卡菌分开；反应不明的过敏标签既不能忽视也不能永久接受，评估之后才可能回到青霉素；放线菌病的疗程以月计，按症状和CT停药。

**安全结果。** 在过敏标签评估之前给静脉青霉素或头孢曲松，属于本例的严重安全错误（`critical: true`），无论得分多少，安全结果都判为未通过；经验性抗结核、莫西沙星、甲硝唑、再用米诺环素和贸然转外科是可纠正的错误（`critical: false`），只扣相应分数。

**待核实（中文提示）：** 各次检查与入院、与莫西沙星疗程的先后；入院其他生命体征和血液检查；CT细节；痰检份数与种类；首次标本是否做特殊染色；“两次标本”具体所指；过敏反应类型；药物剂量和疗程；随访时长。另请临床医师确认：所引放线菌文献未给出的剂量（米诺环素100 mg每日2次、克拉霉素500 mg每日2次及干扰项剂量），以及在Valour 2014认为多西环素活性较差的情况下，是否仍以四环素类作为过渡用药。详见上文英文“To verify”清单。
