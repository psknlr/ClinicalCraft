# cmcr-655520 — A febrile boy with previously unexplained intestinal lesions

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | inpatient / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | Paediatrics, Gastroenterology, Rheumatology |
| Languages | Simplified Chinese and English |
| Review status | Unreviewed AI-assisted draft; no clinician review claimed |

## Learning outcomes

1. Reconstruct evolving mucosal manifestations.
2. Compare evidence for inflammatory bowel disease and vasculitis.
3. Explain limits of negative pathergy.
4. Discuss follow-up of recurrent paediatric organ disease.

## Clinical summary

The report diagnosed paediatric intestinal Behçet disease from intestinal ulcers, oral findings and tissue vasculitis. Absence of presenting pain does not exclude important bowel disease. Evolving manifestations change the differential. Tissue vasculitis requires clinical integration.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** How should early fever and the previous bowel history be approached? Options: Treat documented pulmonary infection while reassessing unexplained intestinal disease (supported: Pneumonia can explain part of the fever but does not erase previous multifocal ulcers.) No abdominal pain excludes intestinal disease (distractor: Symptoms may be subtle and previous evidence still requires assessment.) An earlier suspicion establishes Crohn disease (distractor: The old record lacks definitive classification and requires review.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: Later mucosal findings and vasculitis support the report’s intestinal Behçet interpretation while requiring differential review (supported: Combined evidence is stronger than an isolated ulcer; negative pathergy alone does not exclude it.) Negative pathergy excludes Behçet syndrome (distractor: This is not an absolute exclusion test.) All intestinal ulcers are Behçet disease (distractor: Infection, drugs and other inflammatory bowel disorders remain relevant.)
- **management:** How should current treatment and follow-up be discussed? Options: Use paediatric gastroenterology/rheumatology review based on endoscopic severity, differential diagnosis and relapse risk (supported: The current EULAR update emphasises endoscopy and severity-based management; paediatric regimens require specialist judgement.) Stop treatment independently once symptoms disappear (distractor: Symptoms and mucosal remission are not identical; relapse risk needs review.) Keep escalating long-term steroids whenever they work (distractor: Relapse and steroid burden require reassessment of strategy.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Assess organ involvement and relapse risk, avoiding unsupervised withdrawal or unplanned steroid escalation — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured reference and wrong-path scores appear in Validation below.

## Reference path

Start → ask all 15 history items → examine 1 findings → read 1 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Early inflammation and chest records: White count 34.3×10^9/L, neutrophils 90%, CRP 160 mg/L and ESR 53 mm/h; radiograph and CT suggested left lower pneumonia.
- New inpatient findings and endoscopic pathology: Multiple oral ulcers appeared on day 5 and transient facial erythema on day 7; pathergy was negative. Endoscopy showed multiple small-bowel and colonic ulcers; ileocaecal biopsy showed small-vessel inflammation with fibrinoid vascular wall necrosis.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Absence of presenting pain does not exclude important bowel disease. Evolving manifestations change the differential. Tissue vasculitis requires clinical integration.
- Summary: Assess organ involvement and relapse risk, avoiding unsupervised withdrawal or unplanned steroid escalation

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

Earlier operative details, full modern classification assessment and long-term outcomes are incomplete. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Source media are managed separately and the initial package contains no assets.

## Source and adaptation

The original publication supplies the clinical events and measurements. AI-assisted educational adaptation supplies bilingual dialogue, staging, distractors, feedback and assessment. These are not additional patient encounters. Companion roles are teaching conventions and do not establish that any particular person attended the original encounter. Historical prescriptions are not present-day treatment recommendations. DOI verification establishes source identity, not clinical peer review of this adaptation.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 杨昕, 马鸣. 儿童肠型白塞病一例. 中华儿科杂志. 2011;49(05):392-393. doi: 10.3760/cma.j.issn.0578-1310.2011.05.019.
- https://rs.yiigle.com/cmaid/655520
- https://doi.org/10.3760/cma.j.issn.0578-1310.2011.05.019
- EULAR recommendations for Behçet syndrome: 2025 update, published 2026. https://doi.org/10.1016/j.ard.2026.02.009

**Source verification:** Publisher identity and DOI 10.3760/cma.j.issn.0578-1310.2011.05.019 verified on 2026-10-29: https://rs.yiigle.com/cmaid/655520. Current guidance was checked only to the scope explicitly listed in provenance.review.guidelines; independent clinical review remains required. No clinician review is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Passed strict validation with zero errors and zero warnings on 2026-10-28. Reference replay: 4/4 objectives, 3/3 decisions, score 20/20 (100%). Bilingual matcher: 40/40 passed, zero unexpected matches. Wrong-first-then-correct replay: 10/20 (50%), critical safety item remains missed; no rejected actions. Late-background regression: required history then all examination, followed by all optional history in workup, passes with zero rejections. Communication remains examiner-judged and is excluded from the deterministic score. Root integration separately checks media and full in-world presentation.

## 中文摘要

**病例概要：** 原报告根据多发肠溃疡、口腔表现和组织血管炎诊断儿童肠型白塞病。

**学习目标：** 重建分期出现的黏膜表现。；比较炎症性肠病与血管炎证据。；解释阴性针刺的局限。；讨论儿童复发性器官病变随访。

**关键决策：** 早期发热和旧肠道病史应怎样处理？ 后续资料能支持哪一项结论？ 怎样讨论当代治疗与随访？

**复盘要点：** 初诊无腹痛不排除重要肠病；随时间出现的表现改变鉴别；组织血管炎需结合临床而非单独定病。尚待核对：原手术细节、完整现代分类评估及长期结局不全。本稿尚未经执业医师审核。
