# 中华病例说：20 例真实病例 / CMCR collection

本病例集从用户 Drive 的 `医学数据研究 / cmcr-data / cmcr_all_cases_dedup.jsonl` 及对应 `media` 文件夹选取 20 篇有完整正文的病例报告。覆盖多专科常见就诊问题与疑难诊断。每例保留原报告的年龄、症状、关键检查、诊断证据和报告内结局，以化名及中英双语问答改写为可交互教学场景。

The collection contains 20 distinct, published reports with complete source text. Each case uses source-grounded history, examination, phased investigations, evidence-gated decisions, a reference walkthrough, and an explicit account of missing information. The original articles remain the authority for historical facts.

## 使用 / Playing

- 在首页“全部病例集”选择“中华病例说 · 20 例”，再按专科或场景筛选。
- 通过问诊、查体、检查和会诊板决策逐步完成病例。检查对应检验、影像、病理或病历工作站；随访在完成必要病史、体检及两项决策后自动开放。
- 原始报告与配图按检查和阶段关联；含治疗前后对照的合图在后续阶段开放。完整论文标题、来源说明和 PDF 在病例完成/复盘后开放。
- 缺失信息明确显示“未记录”，不补写正常查体、检查数值或随访结局。

In the case library, select **CMCR · 20 cases**. The same cases work through CLI, server and MCP content discovery; no separate registration is needed. Example:

```sh
npm run cc -- play cmcr-1551890 --provider offline
```

These are **static, staged historical reviews**, not validated continuous physiological twins. Dialogue/persona and decision choices are teaching adaptations; the reported disease course is not a prediction of how a real patient responds to an action. A historical medication or operation is recorded as an event, not automatically scored as current best practice. Safety feedback distinguishes adverse-drug rechallenge, emergency escalation and limits of single-case treatment attribution.

## 本地原图与 PDF / Local media

The downloaded `selected-20` directory holds `<articleId>.json`, `<articleId>.txt`, `<articleId>.pdf`, and `media/<articleId>/<original filename>`. Its `manifest.json`, `drive-files.json` and `download-audit.json` preserve local source and integrity records. The source corpus has 57,571 parseable records; malformed JSONL lines 19,624 and 27,321 were excluded. Corpus SHA-256: `0c4ca86979fd5edb4f95fc1dd983087dde479255492b4edacf698050dce0a53c`.

The download contains 20 PDFs, 24 figures and 4 table CSVs. The teaching app references 23 figures: the combined liver MRI in report 1074569 is omitted because it contains identifying fields and mixes pretreatment and post-treatment scans. The original download is preserved locally; its documented imaging findings remain in the case.

```sh
node scripts/install-cmcr-assets.mjs "E:/clinicalcraft-source/中华病例说/selected-20"
npm run dev
```

The installer verifies PNG/PDF signatures and any authored checksums, preserves differing existing assets, and writes only to ignored `assets/local/cases/cmcr-<articleId>/`. It leaves a SHA-256 manifest in `assets/local/cmcr-20-manifest.json`. Original PDFs, figures, downloaded tables and full source text are **not distributed in Git**. Without local media, the authored report text remains playable; the image viewer shows a missing-asset placeholder.

## 来源对应 / Source map

The report titles below contain diagnoses; this table is for authors and reviewers, not the learner's opening screen. Each case file includes its citation, DOI, source notes and article URL.

| Case ID | Original report | Year |
|---|---|---|
| cmcr-1551890 | [急性心肌梗死併發室間隔破裂ECMO支持1例](https://rs.yiigle.com/cmaid/1551890) | 2025 |
| cmcr-33716 | [屎肠球菌致感染性心内膜炎一例](https://rs.yiigle.com/cmaid/33716) | 2014 |
| cmcr-859819 | [妊娠合并H7N9禽流感一例](https://rs.yiigle.com/cmaid/859819) | 2014 |
| cmcr-1653413 | [中西醫結合治療特發性肺纖維化合併肺炎1例](https://rs.yiigle.com/cmaid/1653413) | 2025 |
| cmcr-1551894 | [中西醫結合治療巴德-吉亞利綜合征1例](https://rs.yiigle.com/cmaid/1551894) | 2025 |
| cmcr-138796 | [第309例：急性腹痛—肠套叠—急性肾损伤](https://rs.yiigle.com/cmaid/138796) | 2014 |
| cmcr-1423446 | [乳酸左氧氟沙星氯化钠注射液致严重低血糖](https://rs.yiigle.com/cmaid/1423446) | 2014 |
| cmcr-1423442 | [阿德福韦酯致范科尼综合征合并骨软化](https://rs.yiigle.com/cmaid/1423442) | 2014 |
| cmcr-1423434 | [联合应用华法林与胺碘酮致国际标准化比值升高和血尿](https://rs.yiigle.com/cmaid/1423434) | 2014 |
| cmcr-70044 | [头孢噻肟钠/舒巴坦钠致过敏性休克一例](https://rs.yiigle.com/cmaid/70044) | 2014 |
| cmcr-1653406 | [圍手術期孕婦羊水栓塞1例](https://rs.yiigle.com/cmaid/1653406) | 2025 |
| cmcr-1653403 | [胎母輸血綜合症1例](https://rs.yiigle.com/cmaid/1653403) | 2025 |
| cmcr-1653404 | [以反復感染及濕疹為表現的X連鎖無丙種球蛋白血症1例基因診斷](https://rs.yiigle.com/cmaid/1653404) | 2025 |
| cmcr-1551887 | [家族性致死性失眠症患者1例](https://rs.yiigle.com/cmaid/1551887) | 2025 |
| cmcr-51617 | [新生儿不完全性川崎病并发无菌性脑膜炎一例](https://rs.yiigle.com/cmaid/51617) | 2014 |
| cmcr-70005 | [紫色色杆菌脓毒症一例并文献复习](https://rs.yiigle.com/cmaid/70005) | 2014 |
| cmcr-138898 | [第311例：全血细胞减少—胰酶升高—低钠血症—骨髓中大量原始细胞](https://rs.yiigle.com/cmaid/138898) | 2014 |
| cmcr-1074569 | [多学科协作治疗T4N1cM1期结肠癌一例](https://rs.yiigle.com/cmaid/1074569) | 2014 |
| cmcr-1551893 | [成人睾丸纖維性假瘤1例](https://rs.yiigle.com/cmaid/1551893) | 2025 |
| cmcr-1653409 | [淺表性血管黏液瘤1例](https://rs.yiigle.com/cmaid/1653409) | 2025 |

## 验证 / Validation

```sh
npm run cc -- cases validate --all
npm run cc -- cases verify --all
npm test
npm run typecheck
npm run build
```

`packages/content/src/cmcr-20.test.ts` checks the 20 distinct reports, source attribution, unknowns, local media policy, initially locked decisions and executable reference walkthroughs. The web smoke test `e2e/cmcr.spec.ts` checks collection filtering, case loading and source/PDF gating.
