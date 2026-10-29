# cmcr-635101 — Nausea, vomiting and acidosis after a short history of thirst and polyuria

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | emergency / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | Endocrinology, Haematology, Emergency medicine |
| Languages | Simplified Chinese and English |
| Review status | Unreviewed AI-assisted draft; no clinician review claimed |

## Learning outcomes

1. Recognise ketoacidosis without relying on breath odour.
2. Explain persistent low C-peptide.
3. Identify limits of HbA1c inference in haemoglobin disease.
4. Plan reliable glucose and electrolyte monitoring.

## Clinical summary

The source diagnosed fulminant type 1 diabetes with β-thalassaemia; this adaptation retains evidence of severe insulin deficiency while limiting certainty about onset classification based on HbA1c. Glucose, ketones and acid-base evidence establish the emergency. Persistently low C-peptide supports ongoing insulin need. A haemoglobin disorder requires reassessment of HbA1c interpretation.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** How should the emergency findings be interpreted without fruity breath? Options: The findings still establish ketoacidosis, requiring monitored potassium, fluid and insulin management (supported: Hyperglycaemia, marked ketosis and metabolic acidosis outweigh breath odour.) Absence of characteristic odour excludes ketoacidosis (distractor: Odour is not a required diagnostic condition.) Vomiting is sufficient to attribute acidosis to ordinary gastroenteritis (distractor: This does not account for the combination of glucose, ketones and severe acidosis.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: Persistently very low C-peptide supports severe insulin deficiency, while thalassaemia limits inference about onset speed from HbA1c (supported: The source labels fulminant type 1; relatively low HbA1c alone does not prove it, nor establish bias direction or magnitude.) A modest HbA1c means there is no severe diabetes (distractor: Acute glucose, ketosis and C-peptide show otherwise.) A three-month stimulated C-peptide of 170 means permanently zero secretion (distractor: Very low is not zero, and permanent irreversibility is not established.)
- **management:** What is a safe subsequent monitoring strategy? Options: Manage using measured glucose and persistent insulin deficiency; check HbA1c assay/red-cell effects and consider non-haemoglobin markers when needed (supported: A haemoglobin disorder affects interpretation but does not justify stopping insulin on an unverified bias assumption.) Stop insulin because HbA1c is close to 7% (distractor: Very low secretion and prior ketoacidosis make this dangerous.) Blindly add potassium immediately despite hyperkalaemia (distractor: Replacement depends on repeated measurements, ECG and treatment-related changes.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Use measured glucose and electrolytes, avoiding HbA1c-driven insulin withdrawal or blind potassium replacement — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured reference and wrong-path scores appear in Validation below.

## Reference path

Start → ask all 15 history items → examine 1 findings → read 1 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Emergency metabolic record: Glucose 23.8 mmol/L, urine glucose ++++ and ketones +++; pH 7.173, bicarbonate 7.1 mmol/L and base excess −21.6 mmol/L, potassium 6.23 and sodium 117.05 mmol/L, creatinine 179 μmol/L.
- Subsequent glycaemic and haemoglobin records: Next-day HbA1c was 6.8%; fasting/two-hour C-peptide after acidosis correction was 50/70 pmol/L, 80/100 at two weeks and 60/170 at three months. GAD, ICA and IAA were negative. Haemoglobin 110.7–126 g/L with persistent microcytosis, HbA2 4.6% and heterozygous β-globin codon-17 M/N were recorded. The source MCV unit exponent is inconsistent and is not silently converted into a verified value.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Glucose, ketones and acid-base evidence establish the emergency. Persistently low C-peptide supports ongoing insulin need. A haemoglobin disorder requires reassessment of HbA1c interpretation.
- Summary: Use measured glucose and electrolytes, avoiding HbA1c-driven insulin withdrawal or blind potassium replacement

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

HbA1c method, red-cell lifespan measurement, a full modern antibody panel and long-term follow-up are absent; MCV units need verification. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Source media are managed separately and the initial package contains no assets.

## Source and adaptation

The original publication supplies the clinical events and measurements. AI-assisted educational adaptation supplies bilingual dialogue, staging, distractors, feedback and assessment. These are not additional patient encounters. Companion roles are teaching conventions and do not establish that any particular person attended the original encounter. Historical prescriptions are not present-day treatment recommendations. DOI verification establishes source identity, not clinical peer review of this adaptation.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 叶艺艺, 陆泽元, 邵豪, 赖丽萍, 庄雄杰. 暴发性1型糖尿病并β地中海贫血一例报道. 中华糖尿病杂志. 2010;02(04):307-307. doi: 10.3760/cma.j.issn.1674-5809.2010.04.017.
- https://rs.yiigle.com/cmaid/635101
- https://doi.org/10.3760/cma.j.issn.1674-5809.2010.04.017
- Hyperglycemic Crises in Adults With Diabetes: A Consensus Report. 2024. https://doi.org/10.2337/dci24-0032
- NIDDK. Interpreting A1C: Diabetes and Hemoglobin Variants. 2020. https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/interpreting-a1c-diabetes-and-hemoglobin-variants
- Guidelines and Recommendations for Laboratory Analysis in the Diagnosis and Management of Diabetes Mellitus. Clinical Chemistry. 2023;69:808–868. https://academic.oup.com/clinchem/article/69/8/808/7226244

**Source verification:** Publisher identity and DOI 10.3760/cma.j.issn.1674-5809.2010.04.017 verified on 2026-10-29: https://rs.yiigle.com/cmaid/635101. Current guidance was checked only to the scope explicitly listed in provenance.review.guidelines; independent clinical review remains required. No clinician review is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Passed strict validation with zero errors and zero warnings on 2026-10-28. Reference replay: 4/4 objectives, 3/3 decisions, score 20/20 (100%). Bilingual matcher: 40/40 passed, zero unexpected matches. Wrong-first-then-correct replay: 10/20 (50%), critical safety item remains missed; no rejected actions. Late-background regression: required history then all examination, followed by all optional history in workup, passes with zero rejections. Communication remains examiner-judged and is excluded from the deterministic score. Root integration separately checks media and full in-world presentation.

## 中文摘要

**病例概要：** 原报告诊断暴发型1型糖尿病合并β地中海贫血；本改写保留严重胰岛素缺乏证据并限制HbA1c用于定时分型的确定性。

**学习目标：** 不依赖呼气气味识别酮症酸中毒。；解释持续低C肽的意义。；识别血红蛋白病对HbA1c推理的限制。；制定可靠的血糖和电解质监测计划。

**关键决策：** 无烂苹果气味时如何解释急诊资料？ 后续资料能支持哪一项结论？ 后续安全监测应采用什么策略？

**复盘要点：** 临床急症由血糖、酮症和酸碱证据建立；持续C肽低值支持后续胰岛素需求；血红蛋白病要求复核HbA1c解释。尚待核对：缺少HbA1c具体方法、红细胞寿命测量、完整现代抗体面板及长期随访，MCV单位需核验。本稿尚未经执业医师审核。
