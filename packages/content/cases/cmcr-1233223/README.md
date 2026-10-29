# cmcr-1233223 — Recurrent dizziness followed by evolving neurological symptoms

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | outpatient / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | neurology, radiology |
| Languages | Simplified Chinese and English |
| Review status | Unreviewed AI-assisted draft; no clinician review claimed |

## Learning outcomes

1. Compare the value of serial MRI.
2. Explain changes in time and location.
3. Identify unrecorded testing.
4. Distinguish historical diagnosis from current reassessment.

## Clinical summary

The case illustrates how serial clinical and MRI evidence progressively supports a demyelinating interpretation. Initial evidence was limited. New later lesions strengthen the interpretation. Historical criteria and missing tests must be explicit.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** How should the first MRI be interpreted? Options: Nonspecific symptoms and one atypical signal require follow-up and differential assessment rather than immediate certainty (supported: Retain the clue without equating one signal with a complete diagnosis.) An unrevealing brain MRI excludes future neurological disease (distractor: The cord finding and later clinical evolution remain relevant.) One signal definitively establishes multiple sclerosis (distractor: Clinical features, distribution, timing and alternatives require integration.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: New lesions and relapses provide temporal and spatial evolution supporting the report’s relapsing-remitting interpretation (supported: Serial comparison is stronger than a single scan, while modern assessment still has gaps.) Loss of enhancement means permanent cure (distractor: Enhancement reflects only part of activity and later lesions appeared.) An unremarkable CSF statement means all biomarkers were tested (distractor: Unlisted oligoclonal bands or antibodies cannot be invented.)
- **management:** What should current reassessment emphasise? Options: Neuroimmunology review should apply current criteria to imaging, attacks and mimics, then discuss long-term therapy (supported: The 2024 revisions were published in 2025; historical 2005 thresholds are not the sole current rules.) Diagnose mechanically using only the article’s 2005 clauses (distractor: Criteria have changed and the source dataset is incomplete.) Avoid follow-up without obvious examination signs (distractor: Serial imaging and recurrent symptoms warrant reassessment.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Use current specialist criteria and assess mimics without overdiagnosing from a single MRI — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured reference and wrong-path scores appear in Validation below.

## Reference path

Start → ask all 15 history items → examine 1 findings → read 1 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Baseline MRI and laboratory record: Brain MRI was unrevealing, with only a punctate cervical cord signal abnormality and no clear enhancement; routine laboratory tests were unremarkable.
- Two subsequent episodes and MRI: About ten months later weakness, blurred vision and reduced hearing accompanied EDSS 2 and a ring-enhancing left periventricular lesion; enhancement resolved after 35 days of treatment. About nine months later worsening with depressive features accompanied six new lesions including left temporal white matter. CSF was described only as unremarkable without detailed oligoclonal-band results.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Initial evidence was limited. New later lesions strengthen the interpretation. Historical criteria and missing tests must be explicit.
- Summary: Use current specialist criteria and assess mimics without overdiagnosing from a single MRI

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

Complete neurological localisation, oligoclonal bands, AQP4/MOG and long-term therapy data are missing. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Approved source media are available locally for completed-case review; unapproved originals remain outside the app.

## Source and adaptation

The original publication supplies the clinical events and measurements. AI-assisted educational adaptation supplies bilingual dialogue, staging, distractors, feedback and assessment. These are not additional patient encounters. Companion roles are teaching conventions and do not establish that any particular person attended the original encounter. Historical prescriptions are not present-day treatment recommendations. DOI verification establishes source identity, not clinical peer review of this adaptation.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 周福庆, 龚洪翰. 1例复发缓解型多发性硬化MRI连贯分析. 磁共振成像. 2011;02(04):314-316. doi: 10.3969/j.issn.1674-8034.2011.04.015.
- https://rs.yiigle.com/cmaid/1233223
- https://doi.org/10.3969/j.issn.1674-8034.2011.04.015
- ECTRIMS. McDonald Diagnostic Criteria: 2024 revisions published 2025. https://ectrims.eu/mcdonald-diagnostic-criteria

**Source verification:** Publisher identity and DOI 10.3969/j.issn.1674-8034.2011.04.015 verified on 2026-10-29: https://rs.yiigle.com/cmaid/1233223. Current guidance was checked only to the scope explicitly listed in provenance.review.guidelines; independent clinical review remains required. No clinician review is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Passed strict validation with zero errors and zero warnings on 2026-10-28. Reference replay: 4/4 objectives, 3/3 decisions, score 20/20 (100%). Bilingual matcher: 40/40 passed, zero unexpected matches. Wrong-first-then-correct replay: 10/20 (50%), critical safety item remains missed; no rejected actions. Late-background regression: required history then all examination, followed by all optional history in workup, passes with zero rejections. Communication remains examiner-judged and is excluded from the deterministic score. Root integration separately checks media and full in-world presentation.

## 中文摘要

**病例概要：** 病例展示连续临床和MRI证据如何逐步支持脱髓鞘疾病判断。

**学习目标：** 比较串行MRI的诊断价值。；解释时间与部位变化。；辨认未记录检验。；区分历史诊断与现行复核。

**关键决策：** 首诊影像应怎样解释？ 后续资料能支持哪一项结论？ 当前复核应强调什么？

**复盘要点：** 首诊证据有限；后续新增病灶改变判断强度；旧标准和缺失检验必须标明。尚待核对：缺少完整神经定位、寡克隆带、AQP4/MOG及长期治疗资料。本稿尚未经执业医师审核。

### Local source media review

3 individually approved local asset(s) are linked for the completed-case review. They are not attached to early-stage reports because a composite can contain later findings. Original image bytes are unchanged; the findings remain available as authored text. The privacy decision and checksum are recorded in `scripts/cmcr-105-media-review.json`. Full source PDFs without explicit approval are not displayed.
