# cmcr-856798 — Recurrent fever and pulmonary opacities after a change in cancer treatment

> Spoilers: facilitator guide. Source diagnosis and outcome follow.

## Case card

| Field | Value |
|---|---|
| Setting / facility | inpatient / general-hospital |
| Difficulty / time | 4/5; approximately 30 minutes |
| Specialties | respiratory-medicine, oncology, pharmacology |
| Languages | Simplified Chinese and English |
| Review status | Unreviewed AI-assisted draft; no clinician review claimed |

## Learning outcomes

1. Reconstruct withdrawal and re-exposure timing.
2. Assess evidence strength for drug-related lung injury.
3. Retain infection differentials in immunosuppression.
4. Discuss severity-based interruption and re-exposure boundaries.

## Clinical summary

Withdrawal improvement and recurrence on re-exposure support everolimus-associated lung injury, with incomplete infection exclusion and tissue evidence. Drug timing discriminates better than a single fever episode. Negative antibodies do not cover opportunistic infection. Steroid response supports but does not prove aetiology.

## Scenario timeline and physiology

Initial history and examination unlock the early work-up. The differential decision unlocks the subsequent corroborating reports; the management decision unlocks the historical outcome. All four phases use a static clock. No continuous physiology or invented treatment response is modelled.

## Decisions and assessment

- **diagnosis:** Which working interpretation best fits the drug timeline and pulmonary evidence? Options: Strongly suspect everolimus-associated pneumonitis while retaining infection and tumour progression in the differential (supported: Improvement after withdrawal and recurrence after re-exposure strengthen association without removing infection risk.) Three negative antibodies prove there is no lung infection (distractor: These tests do not cover all organisms or Pneumocystis.) A metastatic history means the opacities must be tumour progression (distractor: The medication timeline and prior regression must be considered.)
- **evidence:** Which conclusion is supported by the subsequent records? Options: Rapid improvement again supports an inflammatory drug reaction, but steroid response is not an infection-exclusion test (supported: The clinical association is strong, but absent lavage and pathology limit confirmation.) Three-day steroid response proves infection is impossible (distractor: Short-term anti-inflammatory response does not replace microbiology.) This response establishes a fixed steroid dose for every patient (distractor: Severity, infection risk and individual circumstances differ.)
- **management:** What should be prioritised according to current medicine-safety information? Options: Withhold the suspected drug and arrange oncology/respiratory severity assessment, including opportunistic infection, before deciding steroids and future therapy (supported: Current labelling recognises non-infectious pneumonitis; interruption or discontinuation depends on severity, without unmonitored rechallenge.) Immediately restart independently to prove causality (distractor: Repeated exposure can cause more severe lung injury.) Negative historical antibodies remove the need to consider PJP before steroids (distractor: Those antibodies do not assess this opportunistic infection.)

- rb-history (history, weight 2): Establish presenting symptoms and course.
- rb-context (history, weight 1): Elicit associated symptoms and relevant background.
- rb-unknown (safety, weight 1): Establish the evidence boundary for allergy information.
- rb-examination (examination, weight 1): Review signs relevant to the presentation.
- rb-workup (investigations, weight 2): Review the key early investigations.
- rb-differential (diagnosis, weight 3): Integrate the early evidence correctly on the first attempt.
- rb-confirmation (investigations, weight 2): Review subsequent corroborating evidence.
- rb-evidence (diagnosis, weight 3): State the strength and limits of subsequent evidence correctly on the first attempt.
- rb-safety (safety, weight 4): Avoid unprotected re-exposure and include opportunistic infection in pneumonitis assessment — critical item.
- rb-outcome (management, weight 1): Review reported treatment and outcome.
- rb-communication (communication, weight 1): Explain evidence and uncertainty clearly.

Decisions use first-attempt scoring, so later correction completes the pathway without restoring first-attempt points. The communication item requires examiner judgement. Measured reference and wrong-path scores appear in Validation below.

## Reference path

Start → ask all 15 history items → examine 1 findings → read 1 early records → differential decision → read 1 subsequent records → evidence decision → management decision → read outcome → finish. The executable path is the case's solution array.

## Clinical numbers check

- Admission pulmonary and inflammatory records: White count 10.3×10^9/L, neutrophils 84.1%, CRP 14.8 mg/L and ESR 47 mm/h; pH 7.42, PaCO2 33 mmHg and PaO2 79.9 mmHg. Bilateral patchy CT opacities progressed; negative mycoplasma, chlamydia and tuberculosis antibodies do not exclude opportunistic infection.
- Short inpatient response and diagnostic gaps: Prednisone was used without continuing antibiotics; after three days temperature normalised, cough improved and CT opacities regressed. Bronchoalveolar lavage, lung histology and a full opportunistic-infection work-up were not supplied; timing of a second drug withdrawal was not explicit.

Source values and units are retained. Missing reference intervals, weights and timing are not reconstructed. Historical drug doses are omitted from actionable options.

## Facilitator notes

- Reactions: Which feature made you most uncertain?
- Description: Reconstruct the presenting complaint and order of the available records.
- Analysis: Drug timing discriminates better than a single fever episode. Negative antibodies do not cover opportunistic infection. Steroid response supports but does not prove aetiology.
- Summary: Avoid unprotected re-exposure and include opportunistic infection in pneumonitis assessment

Common errors are the case-specific distractors above. Ask the learner to identify the evidence that defeats each one, then use teach-back to distinguish a working diagnosis from confirmation.

## Embodied mode

This is record review in in-world mode. Every investigation is an existing report with performedAt records, requires records and risk none. No transport to diagnostic equipment or new invasive procedure is required. History and examination occur at the bedside; results can be read there or at a records terminal. No physical treatment actions are authored.

## Fidelity limits

Lavage, histology, complete opportunistic-infection testing, oxygen conditions and long-term follow-up are absent. Names, hospitals and calendar dates are removed. Dialogue, questions and scoring are educational adaptation. No new negative findings are inferred. Approved source media are available locally for completed-case review; unapproved originals remain outside the app.

## Source and adaptation

The original publication supplies the clinical events and measurements. AI-assisted educational adaptation supplies bilingual dialogue, staging, distractors, feedback and assessment. These are not additional patient encounters. Companion roles are teaching conventions and do not establish that any particular person attended the original encounter. Historical prescriptions are not present-day treatment recommendations. DOI verification establishes source identity, not clinical peer review of this adaptation.

## Matcher notes

The bilingual corpus uses paraphrases of topic labels rather than canonical questions. All required history items have paraphrases. Unexpected matches must be fixed in keywords, not hidden with unrelated accepted answers.

## References

- 刘颖, 张波. 依维莫司相关性肺损伤一例. 中华结核和呼吸杂志. 2010;33(05):390-391. doi: 10.3760/cma.j.issn.1001-0939.2010.05.023.
- https://rs.yiigle.com/cmaid/856798
- https://doi.org/10.3760/cma.j.issn.1001-0939.2010.05.023
- Everolimus prescribing information, DailyMed current label checked 2026-10-28. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=67e62e26-448d-46ec-b5a1-00dc1b5e26c6

**Source verification:** Publisher identity and DOI 10.3760/cma.j.issn.1001-0939.2010.05.023 verified on 2026-10-29: https://rs.yiigle.com/cmaid/856798. Current guidance was checked only to the scope explicitly listed in provenance.review.guidelines; independent clinical review remains required. No clinician review is claimed.

## Changelog

- 2026-10-28 — Initial de-identified educational adaptation; historical results separated from present-day decision teaching, staged records and explicit uncertainty added.

## Validation

Passed strict validation with zero errors and zero warnings on 2026-10-28. Reference replay: 4/4 objectives, 3/3 decisions, score 20/20 (100%). Bilingual matcher: 40/40 passed, zero unexpected matches. Wrong-first-then-correct replay: 10/20 (50%), critical safety item remains missed; no rejected actions. Late-background regression: required history then all examination, followed by all optional history in workup, passes with zero rejections. Communication remains examiner-judged and is excluded from the deterministic score. Root integration separately checks media and full in-world presentation.

## 中文摘要

**病例概要：** 原报告以停药改善及再用复发支持依维莫司相关肺损伤，仍缺少完整感染排除及组织证据。

**学习目标：** 重建停药及再暴露时间关系。；识别药物肺损伤的证据强度。；保留免疫抑制相关感染鉴别。；按严重度讨论安全停药与复用边界。

**关键决策：** 当前药物时序和肺部证据最支持哪项工作判断？ 后续资料能支持哪一项结论？ 按当前药品安全资料，下一步应强调什么？

**复盘要点：** 药物时序比单次发热更有区分力；抗体阴性不能覆盖机会感染；激素反应支持但不能确证病因。尚待核对：缺少灌洗、组织学、完整机会感染检测、吸氧条件和长期随访。本稿尚未经执业医师审核。

### Local source media review

1 individually approved local asset(s) are linked for the completed-case review. They are not attached to early-stage reports because a composite can contain later findings. Original image bytes are unchanged; the findings remain available as authored text. The privacy decision and checksum are recorded in `scripts/cmcr-105-media-review.json`. Full source PDFs without explicit approval are not displayed.
