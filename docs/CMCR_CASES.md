# 中华病例说：20 例真实病例 / CMCR collection

本病例集从用户 Drive 的 `医学数据研究 / cmcr-data / cmcr_all_cases_dedup.jsonl` 及对应 `media` 文件夹选取 20 篇有完整正文的已发表病例报告，覆盖多专科的常见就诊问题与疑难诊断。每例保留原报告的年龄、症状、检查、诊断依据、处置和结局，以化名及中英双语改写为可交互的教学病例：问诊、查体、检查、处置和会诊板决策都可操作，复盘时把报告当年的做法与现行指南对照讲解。

The collection adapts 20 distinct published case reports with complete source text. Each keeps the report's age, symptoms, findings, diagnosis, management and outcome, and turns them into a playable bilingual case: history, examination, investigations, interventions and case-board decisions, with a debrief that sets the report's historical practice against current guidance. The original articles remain the authority for the historical facts.

**审核状态 / Review status.** 每例均为人工智能辅助编写，并对照所引指南进行了编辑审核（`provenance.review.status: "editorial"`, 2026-10-28）；尚未经执业医师审核，用于教学前请由该专科的临床医生审核。Every case is AI-assisted authoring with an editorial review against the cited guidance; none has been reviewed by a licensed clinician yet — have a clinician of the specialty review a case before teaching with it. Each case README lists what is still "to verify".

The original reports, figures and PDFs remain © their publishers and authors. The cases are teaching adaptations that paraphrase the reports; confirm the permission basis for your use before distributing them beyond your own teaching.

## 使用 / Playing

- 在首页“全部病例集”选择“中华病例说 · 20 例”，再按专科或场景筛选。病例标题、简介和分诊信息不提示诊断。
- 病例按阶段推进（如门诊 → 住院检查 → 手术/ICU → 随访），阶段只能向前，不能回到已结束的阶段。每个决策在所需证据齐备时开放，并且开放在给出答案的检查结果之前——考的是推理，不是读报告。随访记录在本例的各项决策完成后开放（具体条件见各病例 README）。
- 缺失信息如实回答“病历里没有记录”，不补写正常查体、检查数值或结局；原报告内部的矛盾保留并注明。
- 完整论文题目、DOI 和原文 PDF 在病例完成或进入复盘后开放。

In the case library, select **CMCR · 20 cases**. The cases work through the CLI, the server and MCP as well; no separate registration is needed:

```sh
npm run cc -- play cmcr-1551890 --provider offline
npm run cc -- exec --case cmcr-1423446 --autopilot --approval bypass --provider offline --output-format json
```

These are **static, staged historical reviews** (`clock.mode: "static"`, no physiology model): the reported course is a record, not a prediction of how a patient would respond to the learner's action. A historical medication or operation is a fact of the record, never scored as current best practice; the decisions and their feedback follow current guidance and say where the report's team did something else.

## 教学设计 / Teaching design

Every case meets the library's clinical content standard ([CASE_AUTHORING §9](CASE_AUTHORING.md#9-clinical-content-standard)), and `packages/content/src/cmcr-20.test.ts` enforces the structural part of it:

| | every case has |
|---|---|
| Decisions | 3–5 decisions, each with 3–5 options and feedback of its own; plausible distractors, including the report's own choice where today's guidance differs; each opens before the result that would give its answer away |
| Interventions | the management steps the report describes, plus the tempting wrong ones (contraindicated, with a harm explanation) |
| Rubric | 10–12 items weighted by clinical importance; first-try decision scoring; at least one safety item; one examiner-judged communication item |
| Debrief | 4–6 teaching points, each naming the guidance and version it rests on; key reasoning; honest boundaries and unknowns |
| Learning outcomes | 5–6 measurable outcomes, shown before play only on request because they name the diagnosis |
| Voice | first-person lay speech for patients and carers; a carer answers for a child; adult social history is never asked of a child |
| Matcher corpus | 35–40 paraphrased learner questions in both languages, none equal to a canonical question, one for every required history item |
| References | Vancouver style; the source article first (with DOI and its yiigle URL); DOIs only when verified |
| README | a facilitator guide in the library's template: case card, learning outcomes, summary, timeline, decisions and scoring, reference path, numbers check, PEARLS debrief questions, in-world notes, **source and adaptation**, matcher notes, references, changelog, validation, 中文摘要 |

Case-by-case content (spoiler-free titles; the diagnoses are in the source map below and in each README):

| Case | Title | Specialty | ★ | min | phases | decisions | interventions | rubric | outcomes |
|---|---|---|---|---|---|---|---|---|---|
| cmcr-1074569 | 体检发现肝多发占位 · 55岁女性 | oncology, colorectal and hepatobiliary surgery | 4 | 35 | 4 | 5 | 10 | 12 | 6 |
| cmcr-138796 | 水肿、少尿与反复腹痛 · 36岁女性 | nephrology, rheumatology, general surgery | 4 | 40 | 4 | 4 | 11 | 12 | 5 |
| cmcr-138898 | 乏力、纳差与皮肤瘀斑 · 57岁男性 | haematology, oncology | 4 | 35 | 4 | 4 | 12 | 12 | 6 |
| cmcr-1423434 | 反复心悸胸闷 · 42岁女性 | cardiology, clinical pharmacology | 3 | 35 | 4 | 4 | 14 | 11 | 5 |
| cmcr-1423442 | 胸背痛与渐进性无力 · 46岁男性 | endocrinology, nephrology, clinical pharmacology, hepatology | 4 | 40 | 3 | 4 | 17 | 12 | 5 |
| cmcr-1423446 | 恶心呕吐与腹泻 · 78岁女性 | emergency medicine, clinical pharmacology, endocrinology | 3 | 30 | 4 | 4 | 15 | 12 | 5 |
| cmcr-1551887 | 睡眠障碍与注意力下降 · 31岁女性 | neurology, sleep medicine, genetics | 4 | 35 | 4 | 4 | 8 | 12 | 5 |
| cmcr-1551890 | 胸痛后心功能恶化 · 65岁女性 | cardiology, critical care | 4 | 35 | 4 | 4 | 11 | 10 | 6 |
| cmcr-1551893 | 逐渐增大的左侧阴囊肿物 · 40岁男性 | urology, pathology | 3 | 25 | 3 | 4 | 8 | 12 | 5 |
| cmcr-1551894 | 反复下肢水肿与腹胀 · 35岁女性 | hepatology, vascular medicine, integrative medicine | 4 | 35 | 4 | 4 | 9 | 12 | 5 |
| cmcr-1653403 | 孕晚期胎动减少 · 29岁女性 | obstetrics, neonatology | 3 | 30 | 4 | 4 | 8 | 12 | 5 |
| cmcr-1653404 | 高热与足背红肿 · 4岁1个月男孩 | paediatrics, immunology, infectious disease | 4 | 30 | 4 | 4 | 11 | 12 | 5 |
| cmcr-1653406 | 足月妊娠待产 · 34岁女性 | obstetrics, anaesthesiology, critical care | 4 | 35 | 5 | 4 | 28 | 12 | 6 |
| cmcr-1653409 | 逐渐增大的耻骨上皮下肿物 · 15岁女孩 | dermatology, pathology | 3 | 20 | 3 | 4 | 9 | 12 | 6 |
| cmcr-1653413 | 长期咳喘突然加重 · 74岁男性 | respiratory medicine, critical care, traditional Chinese medicine | 4 | 35 | 3 | 4 | 9 | 10 | 5 |
| cmcr-33716 | 反复发热与咯血 · 29岁男性 | cardiology, infectious disease, cardiac surgery | 3 | 35 | 3 | 4 | 7 | 12 | 5 |
| cmcr-51617 | 持续发热与嗜睡 · 34日龄女婴 | paediatrics, paediatric cardiology | 4 | 35 | 4 | 4 | 13 | 11 | 5 |
| cmcr-70005 | 发热、腹股沟红肿 · 8岁男孩 | paediatrics, infectious disease, critical care | 4 | 40 | 5 | 4 | 17 | 12 | 5 |
| cmcr-70044 | 咳嗽、发热 · 10岁男孩 | paediatrics, emergency medicine, clinical pharmacology | 4 | 30 | 4 | 4 | 15 | 12 | 5 |
| cmcr-859819 | 孕中期发热咳嗽 · 25岁女性 | respiratory medicine, critical care, obstetrics, infectious disease | 4 | 35 | 3 | 4 | 13 | 10 | 6 |

## 忠于原文 / Source fidelity

- **The record matches the report.** Reported facts and management are never "corrected" to fit today's guidance; omitted facts were restored from the full text (doses, values with the report's reference ranges, earlier results, pertinent negatives, the authors' differential, the outcome as reported — for example a withdrawal of care and its stated reason).
- **Contradictions stay, labelled.** Where a report disagrees with itself (abstract vs main text, a value vs its unit, a date vs an interval) the case keeps both readings, says which section says which, and resolves nothing by invention. Each README lists them.
- **Unknowns stay unknown.** Unrecorded data are `unknowns`, answered honestly ("这个我病历里没写，我说不上来"); no normal finding is invented. De-identification removed calendar dates, so results carry relative times ("hospital day 3", "5 months earlier").
- **Teaching adaptations are named.** Phases, decisions, interventions, rubric, staff characters and any companion added as a teaching device are listed under "Source and adaptation" in each README.
- **The reports are paraphrased**, with short quotations only where the wording matters.

## 实景模式 / In-world mode

The cases run in the general hospital in in-world (embodied) mode, and the offline demonstration finishes each one at the clinical score (`exec --embodied --autopilot`). Content conventions:

- **Record reviews read the chart.** A report that already exists when the learner arrives (another hospital's tests, an earlier admission, the course record) is `requires: ["records"]`: it is read at a records terminal, never by moving the patient, sampling or wheeling a device, and it carries no procedure risk. The framework's `performedAt: "records"` marks these explicitly.
- **Tests the learner orders keep their devices** (CT, MRI, endoscopy move the patient; ICU films are bedside films); ICU, theatre and ward phases carry the patient's location.
- **Patients who cannot speak** (ventilated, sedated, encephalopathic, an infant) are answered by their carer or companion; the framework's `patient.nonVerbalWhen` makes the patient's silence explicit.
- **Harm-avoidance rubric items** are not earned by doing nothing: each one's condition includes the step at which the harm became possible (the framework's `rubric[].scoredWhen` states it explicitly).

## 本地原图与 PDF / Local media

The downloaded `selected-20` directory holds `<articleId>.json`, `<articleId>.txt`, `<articleId>.pdf`, and `media/<articleId>/<original filename>`. Its `manifest.json`, `drive-files.json` and `download-audit.json` preserve local source and integrity records. The source corpus has 57,571 parseable records; malformed JSONL lines 19,624 and 27,321 were excluded. Corpus SHA-256: `0c4ca86979fd5edb4f95fc1dd983087dde479255492b4edacf698050dce0a53c`.

The download contains 20 PDFs, 24 figures and 4 table CSVs. The cases reference 22 figures and 17 PDFs: the other two figures and three PDFs are withdrawn because they identify a patient (see Privacy below). The withdrawn images' findings remain in the cases as text.

```sh
node scripts/install-cmcr-assets.mjs "E:/clinicalcraft-source/中华病例说/selected-20"
npm run dev
```

The installer verifies PNG/PDF signatures and the authored checksums, refuses withdrawn files (and removes a copy an earlier version installed, only when the bytes match), preserves differing existing assets, and writes only to the ignored `assets/local/cases/cmcr-<articleId>/`. It leaves a SHA-256 manifest in `assets/local/cmcr-20-manifest.json`. Original PDFs, figures, downloaded tables and full source text are **not distributed in Git**. Without local media the cases remain fully playable; the image viewer shows a missing-asset placeholder.

## 隐私 / Privacy

- 病例文本使用化名，已去除医院、日历日期、证件号及可识别的职业细节；时间以相对时间表示（如“入院第3天”）。化名在 20 例中互不重复。
- 每张原图和 PDF 页面都按原始分辨率检查过烧录的身份信息（姓名、证件号或病历号、出生日期、医院、影像采集日期时间）。含此类信息的文件一律撤下：列入 `scripts/cmcr-withdrawn-assets.json`（附原因和校验和），安装脚本拒绝安装，并删除旧版本已安装的同一文件；病例集测试保证病例不再引用它。所见仍以文字保留，复盘时的参考文献（DOI、链接）指向出版方原文。
- 论文正文中的作者单位、通讯邮箱和日期属于出版信息，不是病例文本；原文 PDF 只在病例完成后开放。

Case text uses pseudonyms (distinct across the 20) and omits hospitals, calendar dates, ID numbers and identifying occupational details. Every figure and PDF page was checked at full resolution for burned-in direct identifiers (a name, an ID or record number, a date of birth, a hospital, an acquisition date and time in a scanner overlay). A file that shows one is withdrawn: it is listed in `scripts/cmcr-withdrawn-assets.json` with its reason and checksum, the installer refuses it, and the collection test keeps it out of the cases. Publication metadata printed in the article text (author affiliations, a correspondence e-mail, dates in the report) is part of the publication, not of the case text; the source PDF opens only after the case is complete.

| Case | Withdrawn | Why |
|---|---|---|
| cmcr-70005 | groin CT (fig01), source PDF | the CT shows the patient's name, an ID number, the hospital and the scan time; the PDF reprints it |
| cmcr-1074569 | liver MRI composite (fig01), source PDF | identifying overlays (date of birth, acquisition time, an ID number); the PDF reprints it |
| cmcr-1653409 | source PDF | its back cover reprints another article's PET/CT with the hospital, that patient's date of birth and the scan date |

Published figures may keep chart annotations — the 1074569 CEA curve's axis shows treatment dates — and the case's provenance note says so. Journal PDFs share pages with other articles; the PDF asset titles say what else is on the pages:

- part of another article: 1423434 p1, 33716 p2, 1653406 p2 (journal p79), 1551887 p2, 1551894 p2, 1653403 p2, 1423446 p2 (a notice to authors), 51617 p1, 1551893 p2;
- the journal's back-cover figure page, with other articles' clinical images and no direct identifier: 1551890 p3, 1551894 p3, 1653403 p3, 1653404 p3. Two of them show a software screenshot with a computer user name (1551890, 1551894) — not a patient identifier.

## 已知局限 / Known limits

- **One patient per case.** In the perinatal cases the newborn is represented by records the team reads (1653403); a second, examinable patient would need framework support.
- **No CTG device**: the trace is a record the midwife has already run (1653403).
- **Ordering is not scorable.** The rubric's condition language cannot say "A before B" (antibiotics after cultures, food only once alert); such errors are flagged as contraindicated actions in the debrief, and contraindicated actions do not lower the score by themselves.
- **Interventions are listed from the start** (no phase-scoped availability), so their names are kept neutral.
- **No ventilator, tube, ECMO or balloon-pump cues** on the patient model in the 3D world.
- **References still to verify** are listed per case: this session's network policy blocked DOI resolution (doi.org, Crossref) and the publisher's site, so DOIs were checked against the source PDF, the export record and publisher/PubMed pages found by search.

## 来源对应 / Source map

The report titles below contain diagnoses; this table is for authors and reviewers, not the learner's opening screen. Each case file includes its citation, DOI, source notes and article URL.

| Case ID | Original report | Year |
|---|---|---|
| cmcr-1551890 | [急性心肌梗死併發室間隔破裂ECMO支持1例](https://rs.yiigle.com/cmaid/1551890) | 2025 |
| cmcr-33716 | [屎肠球菌致感染性心内膜炎一例](https://rs.yiigle.com/cmaid/33716) | 2014 |
| cmcr-859819 | [妊娠合并H7N9禽流感一例](https://rs.yiigle.com/cmaid/859819) | 2014 |
| cmcr-1653413 | [中西醫結合治療特發性肺纖維化合併肺炎1例](https://rs.yiigle.com/cmaid/1653413) | 2025 |
| cmcr-1551894 | [中西醫結合治療巴德-吉亞利綜合征1例](https://rs.yiigle.com/cmaid/1551894) | 2025 |
| cmcr-138796 | [第309例 急性腹痛—肠套叠—急性肾损伤](https://rs.yiigle.com/cmaid/138796) | 2014 |
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
| cmcr-138898 | [第311例 全血细胞减少—胰酶升高—低钠血症—骨髓中大量原始细胞](https://rs.yiigle.com/cmaid/138898) | 2014 |
| cmcr-1074569 | [多学科协作治疗T4N1cM1期结肠癌一例](https://rs.yiigle.com/cmaid/1074569) | 2014 |
| cmcr-1551893 | [成人睾丸纖維性假瘤1例](https://rs.yiigle.com/cmaid/1551893) | 2025 |
| cmcr-1653409 | [淺表性血管黏液瘤1例](https://rs.yiigle.com/cmaid/1653409) | 2025 |

## 验证 / Validation

```sh
npm run cc -- cases validate --all
npm run cc -- cases verify --all
npx vitest run packages/content/src/cmcr-20.test.ts
npm test
npm run typecheck
npm run build
```

`packages/content/src/cmcr-20.test.ts` checks the 20 distinct reports, source attribution, unknowns, the local-media and withdrawn-media policy, initially locked decisions, the capability coverage of the general hospital and the executable reference walkthroughs — and the teaching depth and governance above (decisions, rubric, debrief, learning outcomes, review status, DOIs, the matcher corpus, record reviews, README sections, distinct pseudonyms). The web smoke test `e2e/cmcr.spec.ts` checks collection filtering, case loading and source/PDF gating.
