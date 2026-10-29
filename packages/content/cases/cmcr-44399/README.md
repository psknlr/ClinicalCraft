# cmcr-44399 — Abdominal pain, sweating and muscle twitching after a medication error

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | emergency / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | Paediatrics, Toxicology, Emergency medicine |
| Languages | Simplified Chinese and English |
| Review status | Unreviewed AI-assisted draft; no clinician review claimed |

## Learning outcomes

1. Reconstruct the medication-error chain.
2. Recognise an incomplete cholinergic presentation.
3. Explain later bradycardia risk.
4. Use clear dose teach-back.

## Clinical summary

A clearly documented instruction misunderstanding caused neostigmine overdose and cholinergic toxicity. Exposure and symptom timing align clearly. Absent miosis does not exclude the syndrome. Later bradycardia demonstrates the value of monitoring.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** Which toxic pattern is best supported? Options: Cholinergic toxicity after documented neostigmine overdose, not excluded by normal-sized pupils (supported: Secretory, gastrointestinal and muscle findings align with exposure timing.) No miosis excludes poisoning (distractor: The pupil finding cannot override the multisystem evidence.) Fever and cough explain every postdose symptom (distractor: Rapid salivation and twitching require attention to overdose.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: An initially normal heart rate does not exclude later bradycardia; clinical monitoring matters beyond one value (supported: Later slowing was documented and enzyme values alone cannot establish safety.) Initial sinus rhythm permits immediate discharge (distractor: Significant bradycardia subsequently occurred.) Only wait for normal cholinesterase without respiratory assessment (distractor: Toxicity can affect respiratory muscles and secretions, requiring clinical assessment.)
- **management:** What should safe management and communication emphasise? Options: Emergency toxicology teams should monitor airway, ventilation and heart function, individualise antagonism, and use teach-back for tablets per dose (supported: The historical empirical course is not a universal protocol; explicit tablet-count communication addresses this error.) Family can give atropine at home using historical doses (distractor: Serious toxicity requires monitored professional care.) Induce vomiting or lavage at home after every similar error (distractor: Decontamination requires professional assessment; unsupervised methods risk aspiration.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Monitor respiratory/circulatory toxicity and prevent recurrence through dose teach-back — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured reference and wrong-path scores appear in Validation below.

## Reference path

Start → ask all 15 history items → examine 1 findings → read 1 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Initial investigations: Cholinesterase 1790 U/L (reference 5000–12000), sodium 126.7 mmol/L and potassium 3.79 mmol/L; sinus rhythm on ECG.
- Subsequent monitored changes: About two hours after admission heart rate fell to 47/min with ongoing abdominal pain and moist skin; subsequent antagonist treatment and monitoring accompanied improvement and rising cholinesterase.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Exposure and symptom timing align clearly. Absent miosis does not exclude the syndrome. Later bradycardia demonstrates the value of monitoring.
- Summary: Monitor respiratory/circulatory toxicity and prevent recurrence through dose teach-back

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

Complete bottle verification, continuous waveforms and long-term follow-up are unavailable. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Source media are managed separately and the initial package contains no assets.

## Source and adaptation

The original publication supplies the clinical events and measurements. AI-assisted educational adaptation supplies bilingual dialogue, staging, distractors, feedback and assessment. These are not additional patient encounters. Companion roles are teaching conventions and do not establish that any particular person attended the original encounter. Historical prescriptions are not present-day treatment recommendations. DOI verification establishes source identity, not clinical peer review of this adaptation.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 贲英姿, 沈莉, 康云峰. 儿童误服新斯的明中毒一例. 中华儿科杂志. 2011;49(09):707-708. doi: 10.3760/cma.j.issn.0578-1310.2011.09.016.
- https://rs.yiigle.com/cmaid/44399
- https://doi.org/10.3760/cma.j.issn.0578-1310.2011.09.016
- FDA neostigmine methylsulfate label, overdose section (2015): https://www.accessdata.fda.gov/drugsatfda_docs/nda/2015/203629Orig1s000Lbl.pdf

**Source verification:** Publisher identity and DOI 10.3760/cma.j.issn.0578-1310.2011.09.016 verified on 2026-10-29: https://rs.yiigle.com/cmaid/44399. Current guidance was checked only to the scope explicitly listed in provenance.review.guidelines; independent clinical review remains required. No clinician review is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Passed strict validation with zero errors and zero warnings on 2026-10-28. Reference replay: 4/4 objectives, 3/3 decisions, score 20/20 (100%). Bilingual matcher: 40/40 passed, zero unexpected matches. Wrong-first-then-correct replay: 10/20 (50%), critical safety item remains missed; no rejected actions. Late-background regression: required history then all examination, followed by all optional history in workup, passes with zero rejections. Communication remains examiner-judged and is excluded from the deterministic score. Root integration separately checks media and full in-world presentation.

## 中文摘要

**病例概要：** 明确处方理解错误导致新斯的明过量及胆碱能毒性。

**学习目标：** 重建用药错误链。；识别不完全胆碱能表现。；解释迟发心动过缓风险。；使用清楚的剂量复述沟通。

**关键决策：** 最支持什么中毒模式？ 后续资料能支持哪一项结论？ 安全处置与沟通应强调什么？

**复盘要点：** 暴露与症状时间关系明确；缺少缩瞳不能否定综合征；后续心率下降说明动态监测价值。尚待核对：没有完整药瓶复核、连续监测波形或长期随访。本稿尚未经执业医师审核。
