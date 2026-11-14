# 中华病例说：新增病例 / CMCR additional cases

> **状态：** 从中华病例说选出的 105 篇报告中，57 例已收入病例库：每例依据其 1.0.0 版记录的事实重写为 1.1.0 版，再经独立审核与修订。其余 48 例仍是 1.0.0 版模板草稿，未达到内容标准，暂不收入病例库，待逐例重写；草稿保存在本仓库历史的提交 `6cd9b9c6148f` 中。所有病例都是 AI 辅助的教学改编，没有执业医师审核；原始报告全文尚未逐例核对（`sourceTextChecked: false`），用于教学前仍需专科审核。
>
> **Status:** Of the 105 reports selected from the Chinese Medical Case Repository (CMCR), 57 cases are in the library. Each was re-authored to version 1.1.0 from the facts its 1.0.0 version recorded, then independently reviewed and fixed. The other 48 are still 1.0.0 template drafts that do not meet the content standard. They stay out of the library until they are re-authored; the drafts are kept in the repository's history at commit `6cd9b9c6148f`. All are AI-assisted teaching adaptations without a licensed clinician's review. None has yet been checked against its full source article (`sourceTextChecked: false`), so specialty review is still needed before teaching use.

病例库现有 87 个中英双语教学病例：原有 10 例、中华病例说原选 20 例和新增 57 例。在病例库中选择“中华病例说 · 新增病例（57 例）”，再按专科、场景或关键词筛选。完整文献引用、DOI 及获准展示的原始资料在完成病例后开放。

The library has 87 bilingual cases: the 10 earlier cases, the original 20 CMCR cases and these 57. In the case library choose **CMCR · additional cases (57)**, then filter by specialty, setting or keyword. Search covers the Chinese and English public summaries. The source citation, DOI and authors stay out of the opening catalogue until the case is complete.

## Source and adaptation

The source is the user's own copy of the deduplicated CMCR corpus, with its full-text records and article media; it stays outside Git. The original 20 IDs are excluded. The corpus has 57,571 parseable records; malformed lines 19,624 and 27,321 are excluded. Its SHA-256 is `0c4ca86979fd5edb4f95fc1dd983087dde479255492b4edacf698050dce0a53c`.

The [source map](../scripts/cmcr-105-sources.json) records all 105 selected reports: publisher links, article metadata, source-text hashes and the DOI state of each. Its `awaitingReauthoring` list names the 48 reports whose case is not in the library yet; the collection test checks that each of them has no case folder and that every other report has exactly one case.

Each case was re-authored from the facts its 1.0.0 version recorded, because the full source articles were not available while the cases were rewritten. Every patient fact of 1.1.0 is traced to 1.0.0 (an added or changed fact is a critical review finding); what 1.0.0 left unrecorded stays unknown, and the patient says so in their own words. Conversations, decisions, interventions, scoring and teaching points are teaching adaptations; each case's README states its sources, adaptations and what remains to verify. Patient names are pseudonyms; clinical dates become relative intervals.

原报告、配图和 PDF 的版权仍归出版方和作者所有，均不纳入 Git。这些病例是转述原报告的教学改编；超出本人教学范围分发之前，请先确认使用许可的依据。本仓库的 MIT 许可只声明适用于代码，这些改编文本尚未声明许可，转发许可待定。

The original reports, figures and PDFs remain © their publishers and authors and stay outside Git. The cases are teaching adaptations that paraphrase the reports; confirm the permission basis for your use before distributing them beyond your own teaching. The repository's MIT licence is stated for its code; no licence has been stated for these adaptations, so permission to redistribute them is pending.

### DOIs

Of the 57 cases, 55 cite a DOI verified against publisher metadata (checked on 2026-10-29). 2 are pending verification and cite the publisher article URL without a DOI:

| Case | DOI as supplied | Why it is pending |
|---|---|---|
| cmcr-1322371 | `10.3969/j.issn.1671-7163.2009.06.012.1` | Its issue year and number (…2009.06…) disagree with the citation (2010;15(06):426-429), and it ends with an unusual ".1" suffix; doi.org and Crossref could not be reached to resolve it, so the case cites the publisher URL and asserts no DOI. |
| cmcr-1551889 | `10.12408/j.issn2223-4462.2025.01.16` | A two-digit article number, out of sequence with the other reports of the issue (…2025.01.014, …2025.01.015, …2025.01.017); the registered DOI may be …2025.01.016. doi.org and Crossref could not be reached to resolve it, so the case cites the publisher URL and asserts no DOI. |

doi.org and Crossref could not be reached from the authoring environment. Once a DOI resolves, record it as `verifiedDoi` in the source map and give the case its `provenance.doi`; the collection test keeps the two in step.

## How each case was re-authored and reviewed

The 1.0.0 versions were generated from one template: three decisions of three options, no interventions, fifteen generic history items with authoring language in the patient's answers, and a hindsight critical item. Each 1.1.0 version was written to the library's clinical content standard (docs/CASE_AUTHORING.md §9):

- **Teaching design.** Phases that stage the evidence; four or five decisions at the real decision points of the course, each opening before the result that answers it; the report's management, today's care and tempting wrong or historical steps as interventions, with harm texts naming their guidance; a rubric whose critical items are acts done in time; an attending and a nurse; dated, guideline-attributed teaching points; the history in the patient's or carer's own words, with explicit unknowns.
- **Safety outcome.** High-risk acts carry `critical` flags and dose presets, so a dangerous act fails the run's safety outcome whatever the score (CASE_AUTHORING §6–§7).
- **Independent review.** A different agent reviewed each case after it was written: every patient fact traced to 1.0.0 in both languages; guideline statements looked up in the source's own text; clinical accuracy of keys, feedback, doses and harms; assessment replays (harmful acts, option lengths, aliases, leaks of later results, plain questions in both languages); voice, privacy and spoilers. Fixes followed, and every check had to pass again. Later rounds, each by a fresh reviewer, followed while a round still found a critical or major problem: 49 cases had 1 round; 8 cases had 4 rounds.
- **Commit gate.** A case was committed only when it passed strict validation, verification of its reference path (100 %), `scripts/case-check.ts` (depth, doing nothing scores 0, a wrong first answer scores below the reference, plain opening questions reach the presenting complaint in both languages), the collection contract, the in-world demonstration in both languages and the spatial policy test.

| Review round | Cases | Critical findings | Major findings | Minor findings |
|---|---|---|---|---|
| 1 | 48 (+9 pilot reviews, below) | 56 | 265 | 511 |
| 2 | 8 | 7 | 55 | 94 |
| 3 | 8 | 4 | 29 | 85 |
| 4 | 8 | 3 | 26 | 66 |

The first reviews of 9 cases (cmcr-1067495, cmcr-1551888, cmcr-1653411, cmcr-33790, cmcr-44848, cmcr-561144, cmcr-655458, cmcr-70094, cmcr-857041) were the pilot reviews of 2026-10-30, before these records were kept; each case's README states what they found and what was changed, so the table does not count them. All 70 critical and 375 major findings in the table were fixed (apart from 1, answered with a reason in its case's README instead). Most cases have had one independent review; a second review of each remains the next step, as do the full source articles and a specialty clinician's review.

每例 1.1.0 版均依据内容标准重写：分阶段呈现证据，在病程的真实决策点设置 4–5 个先于答案开放的决策，纳入报告中的处理、当前推荐与常见错误或过时做法（其危害说明注明所依据的指南），关键评分项为及时完成的操作，高风险操作设置安全结局。写完后由另一智能体独立审核：逐条核对患者事实与 1.0.0 版是否一致（中英文均核对），在指南原文中核对引用的推荐，回放评分与匹配，检查语气、隐私与剧透；发现的问题全部修复后重新通过全部检查。49 例经 1 轮；8 例经 4 轮。

## Clinical teaching content

The 57 cases contain 234 phases, 1346 history items, 287 examination findings, 900 investigations, 853 interventions (111 marked critical for the safety outcome), 279 decisions with 1224 options, 729 rubric items (132 critical), 342 learning outcomes, 326 teaching points and 2808 bilingual matcher utterances. Settings: 42 inpatient, 10 emergency, 3 intensive-care, 2 outpatient.

A historical treatment is not automatically a correct contemporary recommendation: the debrief distinguishes the published course, current guidance and remaining uncertainty. First-answer scoring stays: a learner can correct a wrong answer and continue, but does not regain the first-answer mark. Vital signs, values, timings and outcomes the record does not give stay unknown.

**These are AI-assisted educational adaptations.** Case-level review status is authoritative: `editorial` describes the AI-assisted editorial review recorded in the case's README, not a licensed clinician's review. Outstanding clinical questions are listed in each README's To verify list.

## In-world fidelity

These cases use the existing general hospital. Earlier reports (CT, pathology, laboratory) are read at a records terminal or from bedside notes (`performedAt: "records"`) without repeating an invasive procedure. A procedure done in a fixed room names where the patient goes (`destination`: the theatre, the angiography suite, the CT room, the endoscopy suite), so every act of a case can be carried out in the 3D world (`packages/world/src/policy.test.ts`). The source does not establish a continuous physiological response model, so none is invented.

History and examination remain bedside actions. Infants use the infant appearance, correct age units and a carer who answers their history; non-verbal patients have an explicit reason. Evidence and outcomes open in stages. There is one examinable patient per case; fetal or family findings are records rather than additional simulated patients.

## Local media

The local `selected-105` directory contains the individual article JSON/text, 105 PDFs, 101 PNG figures and 9 CSV tables, all verified for size and applicable file signatures; it stays outside Git, and no download IDs or signed URLs are published.

```sh
node scripts/install-cmcr-assets.mjs "<selected-105 directory>" cmcr-105 --dry-run   # checks only; writes and removes nothing
node scripts/install-cmcr-assets.mjs "<selected-105 directory>" cmcr-105
npm run dev
```

The installer copies a file only when a case in the library lists it, the [media review](../scripts/cmcr-105-media-review.json) approves it, and the case's sha256 equals both the approved one and the file's own. It also checks PNG/PDF signatures, refuses withdrawn files (by name or by checksum), never overwrites a differing local file, and copies nothing unless every asset passes. The cases work without images because their clinical reports are present as text. `packages/content/src/install-cmcr-assets.test.ts` checks these rules.

### Privacy and display boundaries

Each displayed figure was visually checked for recognisable faces, identifying overlays and patient calendar dates. Unsafe or uncertain figures are withheld and listed in `scripts/cmcr-withdrawn-assets.json`; their clinical findings remain in the case text. Original image bytes are never generatively altered. Most full PDFs are not embedded because a journal page may contain another patient's images: only a separately reviewed PDF may be displayed. For the 57 cases in the library, the media review approves 42 figures and 1 full PDF and withholds 21 figures and 3 PDFs; the cases list 43 assets across 28 cases.

## Validation

The collection contract is `packages/content/src/cmcr-105.test.ts`. It takes the collection from the source map, checks that every CMCR case carries exactly one collection tag (so no case escapes both this contract and `cmcr-20.test.ts`), that each DOI is verified or pending as the source map records it, that no teaching text is shared by more than two cases, and, case by case, the content standard, evidence gates, source attribution, approved local-only assets, infant representation, facility compatibility and executable reference paths. The all-case in-world test runs both languages and compares in-world completion with clinical-mode completion; `packages/world/src/policy.test.ts` checks that every act can be carried out in the case's facility. `e2e/cmcr-105.spec.ts` exercises real cases in the browser.

```sh
npm run cc -- cases validate --all --strict
npm run cc -- cases verify --all
npx tsx --conditions=source scripts/case-check.ts <case-id>
npm test
npm run typecheck
npm run build
```

The [validation record](CMCR_105_VALIDATION.md) lists the checks run at integration and for this revision.

## Awaiting re-authoring

48 reports are not in the library yet. Their 1.0.0 drafts are kept in the repository's history at commit `6cd9b9c6148f`; restore one with `git checkout 6cd9b9c6148f -- packages/content/cases/<id>`, re-author it to 1.1.0 and remove its id from the source map's `awaitingReauthoring` list. The reports: `cmcr-1067475`, `cmcr-1068573`, `cmcr-1068587`, `cmcr-1068618`, `cmcr-1322295`, `cmcr-1423437`, `cmcr-1423441`, `cmcr-1423453`, `cmcr-33497`, `cmcr-33500`, `cmcr-33564`, `cmcr-33797`, `cmcr-44442`, `cmcr-44471`, `cmcr-44475`, `cmcr-44509`, `cmcr-44517`, `cmcr-44564`, `cmcr-44632`, `cmcr-44872`, `cmcr-485237`, `cmcr-561086`, `cmcr-561190`, `cmcr-561253`, `cmcr-597980`, `cmcr-598450`, `cmcr-598463`, `cmcr-635024`, `cmcr-635177`, `cmcr-635201`, `cmcr-638901`, `cmcr-639135`, `cmcr-655460`, `cmcr-655471`, `cmcr-655489`, `cmcr-655520`, `cmcr-70003`, `cmcr-856798`, `cmcr-857112`, `cmcr-857290`, `cmcr-857339`, `cmcr-857471`, `cmcr-857802`, `cmcr-857869`, `cmcr-857887`, `cmcr-861055`, `cmcr-861099`, `cmcr-861109`.
