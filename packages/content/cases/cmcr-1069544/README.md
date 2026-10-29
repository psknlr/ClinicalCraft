# cmcr-1069544 — Recurrent upper abdominal pain with elevated calcium on two occasions

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | inpatient / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | gastroenterology, endocrinology, surgery |
| Languages | Simplified Chinese and English |
| Review status | Unreviewed AI-assisted draft; no clinician review claimed |

## Learning outcomes

1. Recognise hypercalcaemia in pancreatitis.
2. Distinguish biochemistry from localisation.
3. Handle conflicting analyte labels.
4. Discuss renal, bone and perioperative risks.

## Clinical summary

Recurrent pancreatitis led to discovery of a parathyroid adenoma with hypercalcaemia, with uncertainty in one preoperative hormone label. Repeated hypercalcaemia and stones are aetiological clues. Pathology supports lesion type. An analyte-labelling error must not be hidden.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** What do hypercalcaemia and stones imply in recurrent pancreatitis? Options: Investigate an endocrine cause of persistent hypercalcaemia while retaining other pancreatitis causes (supported: Repeated abnormalities and stones make calcium difficult to dismiss as incidental.) Calcium need not be reviewed once pain resolves (distractor: The unresolved cause may persist.) No palpable neck lump excludes parathyroid disease (distractor: Small-gland disease cannot be excluded by palpation.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: Pathology and postoperative calcium/PTH changes support an adenoma, while preoperative labelling and complete biochemical criteria need verification (supported: Imaging localises and does not replace accurate biochemical classification.) Silently relabel “thyroxine 31” as PTH 31 (distractor: This conceals the conflicting analyte label.) This case proves all pancreatitis is caused by adenomas (distractor: A single association is not universal causation.)
- **management:** How should current reassessment and management proceed? Options: Verify repeat calcium, albumin or ionised calcium and PTH, assess renal/bone effects and discuss with endocrine surgery (supported: The 2022 workshop separates biochemical diagnosis from localisation; perioperative hypocalcaemic symptoms need monitoring.) Use localisation CT alone to diagnose every functional abnormality (distractor: Localisation does not replace hormone and calcium verification.) Make historical fasting and antibiotics the default for every pancreatitis (distractor: Historical combined care is not a universal current regimen.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Verify biochemical classification and analyte names before localisation and perioperative planning — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured reference and wrong-path scores appear in Validation below.

## Reference path

Start → ask all 15 history items → examine 1 findings → read 1 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Two abdominal and biochemical episodes: Initial amylase 1139 U/L and calcium 2.76 mmol/L with CT pancreatitis and left renal stone; recurrence showed amylase 1055.9 U/L and calcium 2.87 mmol/L with pancreatitis/stones again.
- Neck localisation and pathology: Ultrasound/CT localised a lesion behind the lower left thyroid; a roughly 2×1.5×1 cm resection was a parathyroid adenoma. A preoperative “31 pmol/L” analyte is questionably labelled in the source and is not silently treated as verified PTH; explicitly labelled postoperative PTH fell to 3.8 pmol/L and calcium to 2.18 mmol/L.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Repeated hypercalcaemia and stones are aetiological clues. Pathology supports lesion type. An analyte-labelling error must not be hidden.
- Summary: Verify biochemical classification and analyte names before localisation and perioperative planning

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

Original preoperative PTH, albumin/ionised calcium and long-term outcomes are absent. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Source media are managed separately and the initial package contains no assets.

## Source and adaptation

The original publication supplies the clinical events and measurements. AI-assisted educational adaptation supplies bilingual dialogue, staging, distractors, feedback and assessment. These are not additional patient encounters. Companion roles are teaching conventions and do not establish that any particular person attended the original encounter. Historical prescriptions are not present-day treatment recommendations. DOI verification establishes source identity, not clinical peer review of this adaptation.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 谢钧韬, 叶建宇, 尹耀新, 欧希, 易辛, 刘吉奎. 以急性胰腺炎为首发表现的甲状旁腺腺瘤一例. 中华普通外科学文献（电子版）. 2010;04(01):66-67. doi: 10.3760/cma.j.issn.1674-0793.2010.01.120.
- https://rs.yiigle.com/cmaid/1069544
- https://doi.org/10.3760/cma.j.issn.1674-0793.2010.01.120
- Fifth International Workshop on primary hyperparathyroidism, 2022. https://doi.org/10.1002/jbmr.4677

**Source verification:** Publisher identity and DOI 10.3760/cma.j.issn.1674-0793.2010.01.120 verified on 2026-10-29: https://rs.yiigle.com/cmaid/1069544. Current guidance was checked only to the scope explicitly listed in provenance.review.guidelines; independent clinical review remains required. No clinician review is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Passed strict validation with zero errors and zero warnings on 2026-10-28. Reference replay: 4/4 objectives, 3/3 decisions, score 20/20 (100%). Bilingual matcher: 40/40 passed, zero unexpected matches. Wrong-first-then-correct replay: 10/20 (50%), critical safety item remains missed; no rejected actions. Late-background regression: required history then all examination, followed by all optional history in workup, passes with zero rejections. Communication remains examiner-judged and is excluded from the deterministic score. Root integration separately checks media and full in-world presentation.

## 中文摘要

**病例概要：** 原报告以反复胰腺炎为线索发现甲状旁腺腺瘤及高钙，术前一项激素名称存在不确定性。

**学习目标：** 识别胰腺炎中的高钙线索。；区分生化定性和影像定位。；处理项目名称冲突。；讨论肾骨和围术期风险。

**关键决策：** 反复胰腺炎的高钙和结石意味着什么？ 后续资料能支持哪一项结论？ 当前复核与管理应怎样做？

**复盘要点：** 重复高钙与结石具有病因提示；病理支持病灶类型；生化项目名错误不能被隐去。尚待核对：完整术前PTH原始报告、白蛋白/离子钙及长期结局缺失。本稿尚未经执业医师审核。
