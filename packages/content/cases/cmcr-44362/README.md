# cmcr-44362 — Progressive painless joint swelling

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | inpatient / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | Paediatrics, Rheumatology, Cardiology |
| Languages | Simplified Chinese and English |
| Review status | Unreviewed AI-assisted draft; no clinician review claimed |

## Learning outcomes

1. Compare inflammatory and non-inflammatory swelling.
2. Integrate digit morphology and pericardial findings.
3. Identify gaps in genetic diagnosis.
4. Discuss safety in avoiding excessive immunotherapy.

## Clinical summary

The report made a clinical CACP diagnosis without molecular or complete hip confirmation. Swelling is not synonymous with inflammatory arthritis. Camptodactyly and effusion provide multisystem clues. Genetic labels require explicit evidence levels.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** How should the early evidence reshape the differential? Options: Compare non-inflammatory arthropathy with inflammatory arthritis (supported: Persistent painless swelling and repeatedly normal inflammatory markers support considering a non-inflammatory mechanism.) Any polyarticular swelling proves juvenile idiopathic arthritis (distractor: Morphology, inflammatory evidence and other organ findings require integration.) Normal tests mean there is no joint disease (distractor: Contractures and imaging abnormalities remain evidence of disease.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: Camptodactyly, non-inflammatory arthropathy and pericardial effusion suggest CACP without molecular confirmation (supported: The combined phenotype supports the report without inventing hip measurements or PRG4 variants.) Negative family history proves a de novo PRG4 mutation (distractor: No family molecular data establish that mechanism.) Moderate effusion means tamponade is established (distractor: Complete clinical or echocardiographic evidence of tamponade is absent.)
- **management:** What should a safe subsequent plan include? Options: Genetic/rheumatology reassessment, functional rehabilitation and effusion monitoring while avoiding unsupported immunosuppression (supported: Aetiological classification affects long-term medication and pericardial risk requires actual clinical assessment.) Use long-term high-dose steroids as inflammatory arthritis (distractor: Inflammatory evidence is lacking and treatment may cause avoidable harm.) Ignore contractures and effusion because there is no pain (distractor: Absence of pain does not remove functional or cardiac risks.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Clarify the non-inflammatory phenotype and monitor pericardial risk before unsupported immunosuppression — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured reference and wrong-path scores appear in Validation below.

## Reference path

Start → ask all 15 history items → examine 2 findings → read 2 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Repeated inflammatory and immune tests: ESR, CRP, RF and multiple autoantibodies were repeatedly negative; liver/renal function and ferritin were normal.
- Joint imaging records: Hand/foot osteopenia, knee/elbow soft-tissue swelling and knee/suprapatellar effusion were recorded; no explicit coxa-vara measurement was provided.
- Echocardiogram and diagnostic record: Moderate pericardial effusion with normal left ventricular systolic function; CACP syndrome was diagnosed clinically without a PRG4 result.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Swelling is not synonymous with inflammatory arthritis. Camptodactyly and effusion provide multisystem clues. Genetic labels require explicit evidence levels.
- Summary: Clarify the non-inflammatory phenotype and monitor pericardial risk before unsupported immunosuppression

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

PRG4 testing, explicit hip measurements and long-term functional/cardiac outcomes are lacking. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Approved source media are available locally for completed-case review; unapproved originals remain outside the app.

## Source and adaptation

The original publication supplies the clinical events and measurements. AI-assisted educational adaptation supplies bilingual dialogue, staging, distractors, feedback and assessment. These are not additional patient encounters. Companion roles are teaching conventions and do not establish that any particular person attended the original encounter. Historical prescriptions are not present-day treatment recommendations. DOI verification establishes source identity, not clinical peer review of this adaptation.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 李小琳, 刘玉玲, 付四毛. 屈曲指－关节炎－髋内翻－心包炎综合征一例. 中华儿科杂志. 2011;49(06):471-473. doi: 10.3760/cma.j.issn.0578-1310.2011.06.018.
- https://rs.yiigle.com/cmaid/44362
- https://doi.org/10.3760/cma.j.issn.0578-1310.2011.06.018

**Source verification:** Publisher identity and DOI 10.3760/cma.j.issn.0578-1310.2011.06.018 verified on 2026-10-29: https://rs.yiigle.com/cmaid/44362. Current guidance was checked only to the scope explicitly listed in provenance.review.guidelines; independent clinical review remains required. No clinician review is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Passed strict validation with zero errors and zero warnings on 2026-10-28. Reference replay: 4/4 objectives, 3/3 decisions, score 20/20 (100%). Bilingual matcher: 40/40 passed, zero unexpected matches. Wrong-first-then-correct replay: 10/20 (50%), critical safety item remains missed; no rejected actions. Late-background regression: required history then all examination, followed by all optional history in workup, passes with zero rejections. Communication remains examiner-judged and is excluded from the deterministic score. Root integration separately checks media and full in-world presentation.

## 中文摘要

**病例概要：** 报告临床诊断CACP综合征，分子及完整髋关节确认仍缺失。

**学习目标：** 比较炎症性与非炎症性肿胀。；整合手足形态与心包表现。；辨认遗传诊断证据缺口。；讨论避免过度免疫治疗的安全性。

**关键决策：** 这些早期资料首先要求怎样调整鉴别？ 后续资料能支持哪一项结论？ 安全的后续计划应包括什么？

**复盘要点：** 关节肿胀不等于炎症性关节炎；屈曲指与心包积液提供跨系统线索；遗传标签需要明确证据层级。尚待核对：缺乏PRG4检测、明确髋测量和长期功能心脏结局。本稿尚未经执业医师审核。

### Local source media review

1 individually approved local asset(s) are linked for the completed-case review. They are not attached to early-stage reports because a composite can contain later findings. Original image bytes are unchanged; the findings remain available as authored text. The privacy decision and checksum are recorded in `scripts/cmcr-105-media-review.json`. Full source PDFs without explicit approval are not displayed.
