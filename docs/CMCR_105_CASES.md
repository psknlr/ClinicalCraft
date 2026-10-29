# 中华病例说：新增 105 例 / Additional 105 CMCR cases

新增 105 篇完整正文的单例报告，与原 20 例不重复；全库共 135 个中英双语教学病例。首页可分别选择“中华病例说 · 多专科疑难（105 例）”与原 20 例，再按专科、场景或关键词筛选。病例卡片仅显示就诊问题和背景，完整文献引用及获准展示的原始资料在完成病例后开放。

The expansion adds 105 distinct published reports, bringing the library to 135 cases. Search works across the Chinese and English public summaries, with separate collection and specialty filters, keyboard navigation and a bounded list on small screens. Diagnosis-bearing source metadata is excluded from the opening catalogue.

## Source and adaptation

The source is the user's Drive collection, `医学数据研究 / cmcr-data`, including its full-text corpus and article media. The original 20 IDs are excluded. The source corpus has 57,571 parseable records; malformed lines 19,624 and 27,321 are excluded. Its SHA-256 is `0c4ca86979fd5edb4f95fc1dd983087dde479255492b4edacf698050dce0a53c`.

The [source map](../scripts/cmcr-105-sources.json) records the 105 publisher links, article metadata and source-text hashes. Each case has a source citation, sourced history/examination/report findings, explicit unknowns and a facilitator guide. Patient names are pseudonyms; clinical dates become relative intervals. Conversations, questions, decisions and scoring are teaching adaptations. The underlying articles and images retain their copyright and remain outside Git.

Publisher metadata was retrieved for all 105 reports. It corroborated 104 DOI values. Case `cmcr-1068618` retains its article link without a DOI field because the supplied and publisher strings end with an ambiguous period; the uncertainty is recorded rather than silently normalised.

## Clinical teaching and review status

每例包括中英双语问诊、查体、分阶段病历证据、至少三个各含三个选项的临床决策，以及安全和沟通评分。首答错误后可以纠正并继续接诊，但不会恢复首答得分。原文缺失的生命体征、数值、病程和结局保持未知。来源内部矛盾和旧诊疗观点在导师指南与复盘中明确标注。

Each case has measurable learning outcomes, three or more evidence-gated decisions with distinct feedback, a safety-weighted rubric and examiner-judged communication. Bilingual paraphrases exercise the history matcher. A historical treatment is not automatically a correct contemporary recommendation: the debrief distinguishes the published course, current guidance and remaining uncertainty.

The 105 cases contain 315 decisions and 3,920 bilingual matcher utterances. Settings include 13 emergency, 78 inpatient, 3 outpatient and 11 intensive-care presentations. At integration, 47 cases have AI-assisted editorial source/guideline checks and 58 remain explicitly unreviewed.

**These are AI-assisted educational adaptations.** Case-level review status is authoritative: `unreviewed` remains unreviewed; any `editorial` status describes the recorded source/guideline review only. No case claims a licensed clinician's review. Specialty review is still required before teaching use; outstanding clinical questions are listed in each README.

## In-world fidelity

These cases use the existing general hospital and a static historical timeline. Existing CT, pathology and laboratory reports are read at a records terminal or from bedside notes (`performedAt: "records"`), without ordering a repeat invasive procedure or moving the patient to an imaging device. The source does not establish a continuous physiological response model, so none is invented.

History and examination remain bedside actions. Infants use the infant appearance, correct age units and a carer who answers their history. Non-verbal patients have an explicit reason. Evidence and outcomes open in stages; source figures that combine several stages are reserved for the completed-case review. There is one examinable patient per case; fetal or family findings are source records rather than additional simulated patients.

## Local media

The local `selected-105` directory contains the individual article JSON/text, 105 PDFs, 101 PNG figures and 9 CSV tables: 215 media files, 258,296,311 bytes, all verified for size and applicable file signatures. One PDF (`485237`) was absent from its Drive media folder and was obtained from the publisher URL supplied by the corpus. The local `download-audit.json` records file signatures, byte counts and SHA-256 values; `publisher-verification.json` records article identity checks. Drive IDs and signed download URLs are not published.

```sh
node scripts/install-cmcr-assets.mjs "E:/clinicalcraft-source/中华病例说/selected-105" cmcr-105
npm run dev
```

Only assets listed in the authored case and approved in the media review are installed. The installer verifies signatures and checksums, preserves differing local files, refuses withdrawn media and writes `assets/local/cmcr-105-manifest.json`. All original files remain in the source directory. The cases work without images because their clinical reports are present as text.

### Privacy and display boundaries

Each displayed figure was visually checked for recognisable faces, identifying overlays and patient calendar dates. Unsafe or uncertain figures are withheld and listed in `scripts/cmcr-withdrawn-assets.json`; their clinical findings remain in the case text. Original image bytes are never generatively altered. Most full PDFs are not embedded because a journal page or back cover may contain another patient's images: only a separately reviewed PDF may be displayed. This is a review of the files approved for display, not a claim that every page of all 105 PDFs has been cleared.

All 101 figures were inspected: 69 are approved for local display and 32 withheld. Five full PDFs were inspected: one approved and four withheld; the other 100 PDFs remain outside the application pending full-page inspection. The [media review](../scripts/cmcr-105-media-review.json) records the specific decision and checksum. The installed set contains 70 assets across 49 cases and is available during completed-case review.

## Validation

The collection contract is `packages/content/src/cmcr-105.test.ts`; it checks the exact source set, strict content standards, evidence gates, source attribution, local-only assets, infant representation, facility compatibility and executable reference paths. The existing all-case embodied autopilot suite runs both languages and compares in-world completion with clinical-mode completion. `e2e/cmcr-105.spec.ts` exercises real new cases in the browser; `e2e/library.spec.ts` independently checks catalogue scale, search, keyboard and mobile behaviour.

```sh
npm run cc -- cases validate --all --strict
npm run cc -- cases verify --all
npm test
npm run typecheck
npm run build
```

The integrated library passes strict validation and all 135 reference solutions. Both offline benchmark agents pass 123/123 scenarios; the existing held-out grounding results are unchanged (dev 647/676, test 743/843), so this does not claim perfect language grounding. See the [validation record](CMCR_105_VALIDATION.md) for browser checks, test reruns and remaining limitations.
