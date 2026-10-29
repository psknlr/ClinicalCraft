# cmcr-44614 — Fever and limb pain after earlier bone-tumour treatment

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | inpatient / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | Paediatrics, Haematology, Oncology, Pathology |
| Languages | Simplified Chinese and English |
| Review status | Unreviewed AI-assisted draft; no clinician review claimed |

## Learning outcomes

1. Recognise anchoring on an old tumour classification.
2. Compare protein and fusion evidence.
3. Integrate marrow flow with tissue review.
4. Handle questionable units and values safely.

## Clinical summary

The earlier bone lesion was reclassified as B-lymphoblastic lymphoma, with extensive leukaemic marrow involvement at recurrence. Small-round-cell morphology and imaging overlap. A lineage panel is stronger than a single marker. Unperformed original tests cannot be invented.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** How should the previous tumour label be handled now? Options: Reassess small-round-cell tumour classification and marrow involvement (supported: New systemic, blood and hepatosplenic findings require cross-specialty review.) Previous remission proves the old classification was correct (distractor: Treatment response does not establish lineage.) CD99 and FLI-1 protein are completely specific for Ewing sarcoma (distractor: Expression overlaps and requires a full panel with appropriate molecular evidence.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: TdT and B-lineage flow support a B-lymphoblastic neoplasm with extensive marrow involvement (supported: Complementary markers overturn anchoring on CD99/FLI-1 alone.) FLI-1 protein positivity equals an EWSR1::FLI1 fusion (distractor: Protein expression and gene fusion are different evidence levels.) Current marrow proves the marrow was initially normal (distractor: Initial marrow data are missing and cannot be reconstructed.)
- **management:** What should a safe current plan include? Options: Paediatric haemato-oncology/pathology teams should confirm lineage and staging, plan current treatment and verify suspect values (supported: Misclassification affects treatment; the source haemoglobin discrepancy must remain flagged.) Continue the historical bone-tumour regimen without review (distractor: Subsequent evidence changes the classification.) Automatically change haemoglobin to 71 g/L for neatness (distractor: That would be an unsupported silent correction.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Review lineage and suspect units before old labels or erroneous values drive treatment — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured reference and wrong-path scores appear in Validation below.

## Reference path

Start → ask all 15 history items → examine 1 findings → read 2 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Earlier bone pathology: Destructive bone lesions and a small-round-cell tumour; old staining was CD99/FLI-1 positive, CD3 positive and CD20 negative, without a reported initial TdT stain.
- Current blood record: White count 42.38×10^9/L with lymphocytes 91%, platelets 20×10^9/L; source haemoglobin is written as 7.1 g/L, with a possible value/unit error. It is not silently changed to 71 or used for dosing.
- Marrow and pathology review: Marrow blasts/immature lymphocytes 84.5%; flow expressed CD10, CD19, CD79a, HLA-DR and CD34. Review of the original biopsy and new marrow showed TdT/CD99 positivity and partial CD79 expression, supporting a B-lymphoblastic neoplasm.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Small-round-cell morphology and imaging overlap. A lineage panel is stronger than a single marker. Unperformed original tests cannot be invented.
- Summary: Review lineage and suspect units before old labels or erroneous values drive treatment

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

Initial marrow, EWSR1 fusion testing, the original haemoglobin report and long-term outcome are incomplete. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Approved source media are available locally for completed-case review; unapproved originals remain outside the app.

## Source and adaptation

The original publication supplies the clinical events and measurements. AI-assisted educational adaptation supplies bilingual dialogue, staging, distractors, feedback and assessment. These are not additional patient encounters. Companion roles are teaching conventions and do not establish that any particular person attended the original encounter. Historical prescriptions are not present-day treatment recommendations. DOI verification establishes source identity, not clinical peer review of this adaptation.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 吴诸丽, 张永红, 金玲, 金眉, 杨菁, 段彦龙, 李伟京, 薛学敏, 黄爽, 张蕊. 淋巴母细胞淋巴瘤误诊为尤文肉瘤一例. 中华儿科杂志. 2011;49(09):708-709. doi: 10.3760/cma.j.issn.0578-1310.2011.09.017.
- https://rs.yiigle.com/cmaid/44614
- https://doi.org/10.3760/cma.j.issn.0578-1310.2011.09.017

**Source verification:** Publisher identity and DOI 10.3760/cma.j.issn.0578-1310.2011.09.017 verified on 2026-10-29: https://rs.yiigle.com/cmaid/44614. Current guidance was checked only to the scope explicitly listed in provenance.review.guidelines; independent clinical review remains required. No clinician review is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Passed strict validation with zero errors and zero warnings on 2026-10-28. Reference replay: 4/4 objectives, 3/3 decisions, score 20/20 (100%). Bilingual matcher: 40/40 passed, zero unexpected matches. Wrong-first-then-correct replay: 10/20 (50%), critical safety item remains missed; no rejected actions. Late-background regression: required history then all examination, followed by all optional history in workup, passes with zero rejections. Communication remains examiner-judged and is excluded from the deterministic score. Root integration separately checks media and full in-world presentation.

## 中文摘要

**病例概要：** 旧骨病灶被复核为B淋巴母细胞淋巴瘤，本次已有白血病样广泛骨髓受累。

**学习目标：** 识别旧肿瘤分类锚定。；比较蛋白与融合证据。；整合骨髓流式和组织复核。；安全处理可疑单位和数值。

**关键决策：** 旧骨肿瘤标签在本次资料下应怎样处理？ 后续资料能支持哪一项结论？ 当前安全计划应包括什么？

**复盘要点：** 小圆细胞形态和影像存在重叠；完整谱系面板优于单个标记；原始未做的检测不能补写。尚待核对：初始骨髓、EWSR1融合检测、Hb原始报告及长期结局不全。本稿尚未经执业医师审核。

### Local source media review

1 individually approved local asset(s) are linked for the completed-case review. They are not attached to early-stage reports because a composite can contain later findings. Original image bytes are unchanged; the findings remain available as authored text. The privacy decision and checksum are recorded in `scripts/cmcr-105-media-review.json`. Full source PDFs without explicit approval are not displayed.
