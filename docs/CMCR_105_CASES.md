# 中华病例说：新增 105 例 / Additional 105 CMCR cases

> **尚不可用于教学。** 这 105 例正在依据各自的原始报告逐例重新编写；重写并完成审核之前，请勿用于教学。
>
> **Not yet ready for teaching.** The 105 cases are being re-authored from their source reports, case by case. Do not teach with them until that is done and reviewed.

新增 105 篇完整正文的单例报告，与原 20 例不重复；全库共 135 个中英双语教学病例：原有 10 例和中华病例说 125 例。首页可分别选择“中华病例说 · 新增病例（105 例）”与“中华病例说 · 原选病例（20 例）”，再按专科、场景或关键词筛选。完整文献引用、DOI 及获准展示的原始资料在完成病例后开放。重写完成之前，部分病例卡片上的简介和专科标签可能提示诊断。

The expansion adds 105 distinct published reports, bringing the library to 135 cases: the 10 earlier cases and 125 CMCR cases. In the case library choose **CMCR · additional cases (105)** or **CMCR · original selection (20)**, then filter by specialty, setting or keyword. Search works across the Chinese and English public summaries, with keyboard navigation and a bounded list on small screens. The source citation, DOI and authors stay out of the opening catalogue until the case is complete; until the re-authoring, however, some of the current summaries and specialty labels on the case cards can name or hint at the diagnosis.

## Source and adaptation

The source is the user's own copy of the deduplicated CMCR corpus, with its full-text records and article media; it stays outside Git. The original 20 IDs are excluded. The corpus has 57,571 parseable records; malformed lines 19,624 and 27,321 are excluded. Its SHA-256 is `0c4ca86979fd5edb4f95fc1dd983087dde479255492b4edacf698050dce0a53c`.

The [source map](../scripts/cmcr-105-sources.json) records the 105 publisher links, article metadata, source-text hashes and the DOI state of each report. Each case has a source citation, history, examination (where the report records one) and report findings taken from the source, explicit unknowns and a facilitator guide. Patient names are pseudonyms; clinical dates become relative intervals. Conversations, questions, decisions and scoring are teaching adaptations.

原报告、配图和 PDF 的版权仍归出版方和作者所有，均不纳入 Git。这些病例是转述原报告的教学改编；超出本人教学范围分发之前，请先确认使用许可的依据。本仓库的 MIT 许可只声明适用于代码，这些改编文本尚未声明许可，转发许可待定。

The original reports, figures and PDFs remain © their publishers and authors and stay outside Git. The cases are teaching adaptations that paraphrase the reports; confirm the permission basis for your use before distributing them beyond your own teaching. The repository's MIT licence is stated for its code; no licence has been stated for these adaptations, so permission to redistribute them is pending.

### DOIs

The source map marks 101 DOIs as verified against publisher metadata (checked on 2026-10-29; the check records stay in the local source directory, outside Git). Four are pending verification, and their cases cite the publisher article URL without a DOI:

| Case | DOI as supplied | Why it is pending |
|---|---|---|
| cmcr-1068618 | `10.3877/cma.j.issn.2095-3224.2013.05.14.` | the supplied and publisher strings end with an ambiguous period |
| cmcr-1068587 | `10.3877/cma.j.issn.2095-3224.2013.04.11.` | the same ambiguous period; the journal's other 2013 DOIs end without one |
| cmcr-1551889 | `10.12408/j.issn2223-4462.2025.01.16` | a two-digit article number, out of sequence between …2025.01.015 and …2025.01.017 of the same issue; perhaps …2025.01.016 |
| cmcr-1322371 | `10.3969/j.issn.1671-7163.2009.06.012.1` | its issue year and number (2009, issue 6) disagree with the citation (2010;15(06):426-429), and it ends with an unusual ".1" |

doi.org and Crossref could not be reached from the authoring environment, so none of the four has been resolved. Once one resolves, record it as `verifiedDoi` in the source map and give the case its `provenance.doi`; the collection test keeps the two in step.

## Clinical teaching and review status

每例包括中英双语问诊、查体、分阶段病历证据、至少三个各含三个选项的临床决策，以及安全和沟通评分。首答错误后可以纠正并继续接诊，但不会恢复首答得分。原文缺失的生命体征、数值、病程和结局保持未知。来源内部矛盾和旧诊疗观点在导师指南与复盘中明确标注。这些病例由同一模板生成，因此正在依据原文逐例重写。

Each case has learning outcomes, three or more evidence-gated decisions with distinct feedback, a safety-weighted rubric and examiner-judged communication. Bilingual paraphrases exercise the history matcher. A historical treatment is not automatically a correct contemporary recommendation: the debrief distinguishes the published course, current guidance and remaining uncertainty. The cases were built from one template (three decisions of three options each, no interventions), which is why they are being re-authored from their sources.

The 105 cases contain 315 decisions and 3,920 bilingual matcher utterances. Settings include 13 emergency, 78 inpatient, 3 outpatient and 11 intensive-care presentations. As integrated, 47 cases record an AI-assisted editorial check and 58 are explicitly unreviewed; the split follows the authoring batches rather than one checklist applied to every case, and the re-authoring replaces it.

**These are AI-assisted educational adaptations.** Case-level review status is authoritative: `unreviewed` remains unreviewed; any `editorial` status describes the recorded source/guideline review only. No case claims a licensed clinician's review. Specialty review is still required before teaching use; outstanding clinical questions are listed in each README.

## In-world fidelity

These cases use the existing general hospital and a static historical timeline. Existing CT, pathology and laboratory reports are read at a records terminal or from bedside notes (`performedAt: "records"`), without ordering a repeat invasive procedure or moving the patient to an imaging device. The source does not establish a continuous physiological response model, so none is invented.

History and examination remain bedside actions. Infants use the infant appearance, correct age units and a carer who answers their history. Non-verbal patients have an explicit reason. Evidence and outcomes open in stages; source figures that combine several stages are reserved for the completed-case review. There is one examinable patient per case; fetal or family findings are source records rather than additional simulated patients.

## Local media

The local `selected-105` directory contains the individual article JSON/text, 105 PDFs, 101 PNG figures and 9 CSV tables: 215 media files, 258,296,311 bytes, all verified for size and applicable file signatures. One PDF (`485237`) was missing from the corpus media and was downloaded from the publisher URL the corpus gives. The local `download-audit.json` records file signatures, byte counts and SHA-256 values, and `publisher-verification.json` the article identity checks; both stay in that directory, outside Git, and no download IDs or signed URLs are published.

```sh
node scripts/install-cmcr-assets.mjs "<selected-105 directory>" cmcr-105 --dry-run   # checks only; writes and removes nothing
node scripts/install-cmcr-assets.mjs "<selected-105 directory>" cmcr-105
npm run dev
```

The installer copies a file only when its case lists it, the [media review](../scripts/cmcr-105-media-review.json) approves it, and the case's sha256 equals both the approved one and the file's own; every cmcr-105 asset must carry a sha256. It also checks PNG/PDF signatures, refuses withdrawn files (by name or by checksum), never overwrites a differing local file, and copies nothing unless every asset passes; a directory without a `media` folder is refused. Before anything else it removes a copy of a withdrawn file that an earlier version installed (only when the bytes match); a successful run writes `assets/local/cmcr-105-manifest.json`. All original files remain in the source directory. The cases work without images because their clinical reports are present as text. `packages/content/src/install-cmcr-assets.test.ts` checks these rules.

### Privacy and display boundaries

Each displayed figure was visually checked for recognisable faces, identifying overlays and patient calendar dates. Unsafe or uncertain figures are withheld and listed in `scripts/cmcr-withdrawn-assets.json`; their clinical findings remain in the case text. Original image bytes are never generatively altered. Most full PDFs are not embedded because a journal page or back cover may contain another patient's images: only a separately reviewed PDF may be displayed. This is a review of the files approved for display, not a claim that every page of all 105 PDFs has been cleared. The media review gives one reason per file; for many approvals that reason does not state each of these checks, and it names no reviewer or date, so the record is to be completed with the re-authoring.

All 101 figures were inspected: 69 are approved for local display and 32 withheld. Five full PDFs were inspected: one approved and four withheld; the other 100 PDFs remain outside the application pending full-page inspection. The [media review](../scripts/cmcr-105-media-review.json) records the specific decision and checksum. The installed set contains 70 assets across 49 cases and is available during completed-case review.

## Validation

The collection contract is `packages/content/src/cmcr-105.test.ts`. It takes the collection from the source map and checks that every CMCR case carries exactly one collection tag, so that no case escapes both this contract and `cmcr-20.test.ts`; that each DOI is verified or pending as the source map records it; and, case by case, strict content standards, evidence gates, source attribution, approved local-only assets, infant representation, facility compatibility and executable reference paths. The all-case embodied autopilot test runs both languages and compares in-world completion with clinical-mode completion. `e2e/cmcr-105.spec.ts` exercises real new cases in the browser; `e2e/library.spec.ts` independently checks catalogue scale, search, keyboard and mobile behaviour.

```sh
npm run cc -- cases validate --all --strict
npm run cc -- cases verify --all
npm test
npm run typecheck
npm run build
```

At integration (commit `88ed0d2`, [CI run 40890346283](https://github.com/psknlr/ClinicalCraft/actions/runs/40890346283), 2026-10-29) the library passed strict validation and all 135 reference solutions, and both offline benchmark agents passed 123/123 runs (41 scenarios × 3 seeds). No benchmark scenario uses a CMCR case, so the benchmarks do not exercise the new cases. The held-out grounding results are unchanged (dev 647/676, test 743/843); the grounding suite covers only the 10 earlier cases, and this does not claim perfect language grounding. See the [validation record](CMCR_105_VALIDATION.md) for browser checks, test reruns and remaining limitations.
