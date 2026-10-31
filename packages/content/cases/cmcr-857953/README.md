# cmcr-857953 — Recurrent cough, haemoptysis and a right hilar lesion · woman aged 55

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | inpatient / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | Respiratory medicine, Infectious disease |
| Languages | Simplified Chinese and English |
| Review status | unreviewed; AI-assisted, not licensed-clinician review |

## Learning outcomes

1. Use repeated transient improvement and relapse in the infection differential.
2. Explain the value of organism morphology and combined stains.
3. Incorporate allergy and toxicity into individualised planning.
4. Verify antimicrobial allergy and adverse effects without copying historical alternatives

## Source and adaptation

**Source facts:** The published single-patient history, examination, tests and outcome were individually read and paraphrased. Source values and limitations are preserved in the records below. Publisher metadata verified the source DOI.

**Teaching additions:** Pseudonym, bilingual dialogue, staged disclosure, decisions, distractor feedback and assessment are educational design. No new treatment response or physiological time series was invented.

**Unrecorded boundaries:** Species culture/susceptibility, allergy reaction details and long-term follow-up. Unknown history is explicitly marked; an unavailable examination is identified as unavailable rather than normal.

## Clinical summary

Recurrent mass-like pulmonary disease was identified as actinomycosis through tissue morphology and specialist review. Use repeated transient improvement and relapse in the infection differential. Explain the value of organism morphology and combined stains. Incorporate allergy and toxicity into individualised planning.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** How should shrinking but recurrent mass-like disease be interpreted? Options: Seek evidence for chronic infection without excluding tumour from one negative sample (supported: Integrate response, colonies and recurrence.) A hilar mass alone confirms lung cancer (distractor: Microbial and tissue evidence must be compared.) Radiological shrinkage proves eradication (distractor: Recurrence demonstrates that this inference is too strong.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: Tissue morphology and stain pattern support pulmonary actinomycosis (supported: Modified acid-fast negativity and morphology help distinguish alternatives such as Nocardia.) Previous TB makes every new lesion tuberculosis (distractor: A previous diagnosis cannot replace current evidence.) Any positive silver stain proves a fungus (distractor: Morphology, other stains and microbiological review are required.)
- **management:** How should the allergy history inform planning? Options: Infectious-disease review should clarify allergy, organism and tolerability and plan duration and imaging (supported: One reported azithromycin success does not establish a universal first choice.) Ignore allergy and directly prescribe penicillin (distractor: Reaction type and options require specialist assessment.) Stop treatment and follow-up permanently when symptoms improve (distractor: Previous relapse supports continued assessment.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Verify antimicrobial allergy and adverse effects without copying historical alternatives — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured deterministic scoring: reference 20/20 (100%); each of the three decisions wrong once then corrected 10/20 (50%), with rb-safety critically missed; start then finish 0/20. The wrong-then-correct path still completes all objectives. The communication rubric requires examiner judgement and is excluded from these deterministic totals.

## Reference path

Start → ask all 15 history items → examine 2 findings → read 3 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Serial chest CT: An initial roughly 4.5 cm hilar mass shrank with antibiotics but recurred with infiltrates after treatment stopped.
- Initial microbiology: Repeated sputum acid-fast smears, cultures and listed infection tests were negative, without proving absence of infection.
- First bronchoscopy and biopsy: Inflamed oedematous narrowed bronchi; inflammatory granulation, necrosis and bacterial colonies without tumour cells.
- Recurrent granules and stain review: Yellow granules obstructed the bronchus; sulphur granules with radiating filaments were Gram/silver positive and acid-fast/modified acid-fast negative. Specialist review identified Actinomyces in both specimens.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Use repeated transient improvement and relapse in the infection differential. Explain the value of organism morphology and combined stains. Incorporate allergy and toxicity into individualised planning.
- Summary: Verify antimicrobial allergy and adverse effects without copying historical alternatives

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

Species culture/susceptibility, allergy reaction details and long-term follow-up. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Approved source media are available locally for completed-case review; unapproved originals remain outside the app.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 牟向东, 章巍, 曹菊, 陈建, 聂立功, 熊焰, 高莉, 王广发. 肺放线菌病一例. 中华结核和呼吸杂志. 2013;36(08):617-619. doi:10.3760/cma.j.issn.1001-0939.2013.08.018.
- https://rs.yiigle.com/cmaid/857953

**Guidance check scope:** Historical source review only; no condition-specific contemporary guideline verified for this rare presentation. Specialist review remains pending.

**Source verification:** Publisher metadata verified the DOI 10.3760/cma.j.issn.1001-0939.2013.08.018 on 2026-10-29. Source and guideline checks are AI-assisted editorial work, not clinician review. Current specialty review remains required; no unverified guideline version is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Verified 2026-10-28 with validateCaseFile(strict=true) and verifyCaseDefinition: zero errors/warnings, 4/4 objectives, 3/3 decisions, 36/36 bilingual paraphrases passing. All decisions and follow-up are locked before required evidence; early examination advances to work-up and later allergy/background questions still succeed. First-attempt and do-nothing paths were replayed as reported above. In-world/UI and whole-library checks are performed by the integrating task; this page does not claim those checks were performed here.

## 中文摘要

**病例概要：** 反复肺占位经组织形态及专科复核诊断肺放线菌病。

**学习目标：** 将反复短程改善与复发纳入感染鉴别；解释菌体形态和染色组合的价值；将药物过敏及毒性纳入个体化计划；核实抗菌药过敏和不良反应，不照搬历史替代药方案

**关键决策：** 影像缩小但反复复发应如何判断？ 后续资料能支持哪一项结论？ 有抗菌药过敏史时怎样制定计划？

**复盘要点：** 将反复短程改善与复发纳入感染鉴别；解释菌体形态和染色组合的价值；将药物过敏及毒性纳入个体化计划。尚待核对：明确菌种培养与药敏、过敏反应类型、长期随访。本稿尚未经执业医师审核。

### Local source media review

1 individually approved local asset(s) are linked for the completed-case review. They are not attached to early-stage reports because a composite can contain later findings. Original image bytes are unchanged; the findings remain available as authored text. The privacy decision and checksum are recorded in `scripts/cmcr-105-media-review.json`. Full source PDFs without explicit approval are not displayed.
