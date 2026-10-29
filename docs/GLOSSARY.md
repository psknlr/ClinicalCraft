# Glossary and register · 术语表与语体规范

The words ClinicalCraft uses for its own concepts, in both languages, and how
its text should sound. Every user-facing string (web world, CLI help and
output, agent speaker labels and notices, benchmark reports, world refusals,
MCP descriptions) and every document follows it. When a string and this page
disagree, fix one of them in the same change.

Two registers, kept apart:

* **Learner-facing** — what a learner or facilitator reads while preparing,
  playing or debriefing a case: the web world, the REPL (`play`), the case
  library and card, staff and patient speech, refusals, the debrief. It reads
  as clinical teaching: clinical words, no software or AI jargon.
* **Technical** — what a contributor, an integrator or a model reads: code,
  ids, flags, JSON fields, protocol messages, model-facing tool text,
  developer documents (ARCHITECTURE, PROTOCOL, EMBODIED, GROUNDING),
  developer commands (`exec`, `eval`, `bench`, `mcp`) and their reports.
  Technical names may appear there, defined on first use.

Ids, CLI flags, JSON fields, API names and protocol messages never change
because of this page: `--autopilot`, `/autopilot`, `embodiment: "embodied"`,
`--embodied`, `embodied: true`, `practiceScope`, `update_workup` keep their
names. Only the words around them follow the glossary.

## 1. Decisions (old → new, and why)

| concept | was | now | why |
|---|---|---|---|
| the clinician agent working the case while the learner watches (`/autopilot`, `--autopilot`) | 自动驾驶 (CLI, agent, bench, docs); 自动诊疗 (web); "Autopilot" / "Agent" (web en) | **示范接诊** everywhere; en learner-facing **demonstration** ("Demonstration · watch the clinician agent work the case", HUD button "Demo"); speaker label **示范医生** / **Clinician (demonstration)**; en technical name stays **autopilot** (the flag and command) | 自动驾驶 is a self-driving car; 自动诊疗 sounds like real automated care. 示范接诊 follows 示范查房 / 示范教学: an expert demonstrates an encounter for teaching. In English "on autopilot" means acting without thinking — the wrong message in clinical teaching — so learners read "demonstration" and only commands keep the name `autopilot` |
| a body in the world: clinical acts need the right place (`embodiment: "embodied"`) | 具身 · {place}, 具身模式, 具身智能体 (web, REPL); "Embodied · {place}", "Embodied agents" (web en) | learner-facing **实景模式** / **in-world mode** (badge 实景 · {place} / In-world · {place}); technical **具身模式** / **embodied mode**, defined in [EMBODIED.md](EMBODIED.md) | 具身 is AI jargon (具身智能); a learner needs to know what changes for them — the encounter happens on location: walk to the bedside, wheel the cart over, take the patient to CT. 实景 (on location, as in 实景模拟) says that. "Embodied" stays the technical term (ids, flags, the embodied agent benchmark) |
| an AI agent | 代理 (agent warnings, `/autopilot` help, external agent) | **智能体** | 代理 is "proxy" — the LLM proxy mode (代理 · {model}) uses it; one word, one meaning |
| external agent (`mcp --attach`) | 外部代理 | **外部智能体** | as above; the badge, approvals, CLI and MCP texts name it alike |
| model provider | 提供商 (agent), 供应商 (web), 服务商 (CLI, bench) | **服务商** | the CLI and benchmark already used it |
| a case-board decision (`decisions[]`) | 判断 / "judgement" (web), 决策 / "decision" (CLI, agent, MCP) | **决策** / **decision** (临床决策 / clinical decisions) | the schema, tools and reports say decision; "can answer" reads 可以作答 |
| the board where decisions are made | 会诊板 / "case board" (web), 决策板 / "evidence board" (CLI, agent), 证据板 / "the evidence board" (capability label, `answer_decision`) | **会诊板** (panel title 会诊证据板) / **case board** | the object in the world; the web already used it. In-world signs and labels (facility data) name each board, e.g. "ED Case Board", "Case Conference · Evidence Board" |
| case phase (`phases[]`) | 时期 (web), 阶段 (agent, CLI) | **阶段** | acute cases have stages, not periods; matches the runtime |
| facility (`facility`) | 场景 (web), 场馆 (CLI, agent) | **场馆** | 场景 is the case setting (门诊, 急诊…); one word per concept |
| practice scope (`practiceScope`: history only / work-up / full) | 执业范围 | **操作范围** | 执业范围 is the scope of practice of a profession (a porter may do nothing clinical); the session setting is a different thing |
| HUD objectives (`objectives[]`) | "Learning objectives" / 学习目标 (debrief, `cases show`) | **objectives** / **任务目标** (HUD: chapters / 章节; short 目标) | the case now has `learningOutcomes`; 学习目标 names those |
| learning outcomes (`learningOutcomes[]`) | — | **learning outcomes** / **学习目标** | the content standard's term; measurable outcomes, distinct from the task list |
| radiologist | 影像科医生 (agent), 放射科医生 (web, world) | **放射科医生** | the REPL prompt showed 影像科医生, which `@放射科医生` did not match |
| companion | 陪同家属 (agent), 陪同者 (web) | **陪同者** | companions include roommates; the case names the relation (妻子, 室友, 母亲) |
| learner | 学习者 (agent, MCP), 学员 (CLI, bridge) | **学员** | Chinese medical-education usage |
| approval mode `bypass` | 跳过 (agent), 绕过 (web) | **绕过** | one word |
| grounding benchmark (`bench grounding`) | 语义落地基准 | **事实依据基准** | 语义落地 is NLP jargon; the benchmark checks that answers and acts rest on the case record (依据病例) |
| debrief `boundaries` | 复评边界 / "Boundaries" (web), 证据边界 / "Evidence boundaries" (CLI) | **证据边界** / **evidence boundaries** | what the evidence does and does not show |
| work-up plan | "workup plan" (agent, CLI) | **work-up plan** | British spelling of the noun; the tool keeps its id `update_workup` |
| operating room (case setting, room kind) | "Operating room" (web, CLI) | **operating theatre** | British usage, as the world and facilities already say; the id stays `operating-room` |

## 2. Terms

Learner-facing words first; the technical name is what code, ids and
developer documents use.

### People and roles

| concept | en (learner-facing) | zh-CN (learner-facing) | technical | notes |
|---|---|---|---|---|
| learner | learner; "you" in the UI | 学员；界面中称“你” | `learner` | never 学习者, 学生 or 用户 in learner-facing text |
| facilitator | facilitator | 导师 | — | runs the session and the debrief; case READMEs are facilitator guides (导师指南) |
| patient | patient | 患者 | `patient` agent | 病人 in lay speech and as an alias (`@病人`); "virtual patient" = 虚拟病人 |
| companion | companion | 陪同者 | `companion`, `persona.companion` | the case names the relation (her husband, 室友…) |
| nurse | nurse | 护士 | `nurse` | |
| attending (Socratic preceptor) | attending | 上级医师 | `attending` | aliases 上级, 带教老师; its scored hint is a "preceptor hint" / 带教提示 |
| examiner | examiner | 考官 | `examiner` | |
| radiologist / pathologist | radiologist / pathologist | 放射科医生 / 病理科医生 | `radiologist`, `pathologist` | their results: imaging 影像, pathology 病理 |
| clinician agent | clinician agent | 临床医生智能体 | `clinician` | works the case in a demonstration |
| clinician speaking in a demonstration | Clinician (demonstration) | 示范医生 | `speaker.clinician` | |
| staff | porter, receptionist, paramedic, lab technician, pharmacist, consultant | 护工、导诊、急救员、检验技师、药师、会诊医生 | roles in `ROLE_NAMES` | |

### Case and encounter

| concept | en | zh-CN | technical | notes |
|---|---|---|---|---|
| case | case | 病例 | `case.json`, `CaseDefinition` | |
| encounter | encounter | 接诊（本次接诊） | one session of a case | |
| session | session | 会话 | `session_id`, `ClinicalSession` | technical; learners read "this encounter" / 本次接诊 |
| case library | case library | 病例库 | case index (`CaseIndexEntry`) | |
| case card | case card | 病例卡片 | library entry and selected-case panel | |
| setting | setting (outpatient, emergency, inpatient, ICU, ward, operating theatre, community) | 场景（门诊、急诊、住院、重症监护、病房、手术室、院外现场） | `setting` | |
| facility | facility | 场馆 | `facility`, `clinicalcraft/facility@1` | |
| phase | phase | 阶段 | `phases[]` | |
| objective | objective; a "chapter" in the HUD | 任务目标（HUD 中为“章节”）；简称“目标” | `objectives[]` | the in-game task list; "目标" alone always means an objective |
| learning outcome | learning outcome | 学习目标 | `learningOutcomes[]` | an action verb and its standard; see §4 |
| decision | decision (clinical decisions) | 决策（临床决策） | `decisions[]`, `answer_decision` | answered on the case board |
| case board | case board | 会诊板（面板标题：会诊证据板） | interaction kind `board`, `/board`, object type `evidence-board` | a facility's own sign may name its board (急诊病例讨论板, 会诊 · 证据拼图) |
| hint | hint (counts against the score) | 提示（计入评分） | `hint`, `give_hint` | |
| journal | journal | 随身档案 | journal panel | |
| learning record | learning record | 学习记录 | export file | |
| teaching-case notice | teaching-case notice | 教学病例声明 | `disclaimer` | |
| review status | clinical review | 审核状态 | `provenance.review` | see §4 |
| scenario event | scenario event | 情景事件 | `physiology.events` | |

### Modes

| concept | en | zh-CN | technical | notes |
|---|---|---|---|---|
| in-world mode | in-world mode | 实景模式 | embodied mode / 具身模式: `embodiment: "embodied"`, `--embodied`, `embodied: true` | the encounter happens in the 3D hospital: you (and the demonstration clinician, and staff you delegate to) must be where an act is done — at the bedside, with the cart wheeled over, the patient on the CT table. The web world's default |
| clinical mode | clinical mode | 临床模式 | `embodiment: "clinical"` | acts do not depend on where anyone stands |
| demonstration | demonstration; HUD button "Demo" | 示范接诊 | autopilot: `/autopilot`, `--autopilot`, `eval` | the clinician agent works the case through the same approvals; offline it replays the case's reference path (参考路径) |
| offline | offline (deterministic) | 离线（确定性） | provider `offline` | |
| approval mode | approval mode: default, strict, auto, plan, bypass | 审批模式：默认、严格、自动、计划、绕过 | `approvalMode` | |
| practice scope | practice scope: history only, history & work-up, full (incl. treatment) | 操作范围：仅问诊、问诊与检查、完整（含处置） | `practiceScope`: `history-only`, `workup`, `full` | which tools are offered |
| scope of practice | scope of practice | 执业范围 | `tools/scope.ts`, code `NOT_AUTHORIZED` | what a profession may do (a nurse no intubation, a porter nothing clinical) |

### Clinical work

| concept | en | zh-CN | technical |
|---|---|---|---|
| history taking | history; take the history | 问诊；病史采集 | `ask_patient`, `history[]` |
| examination | examination; examine | 查体；体格检查 | `examine`, `exam[]` |
| test | test (formal: investigation) | 检查（正式：辅助检查） | `order_test`, `investigations[]` |
| treatment | treatment; give (formal: intervention) | 处置；给予 | `intervene`, `interventions[]` |
| result, critical result | result, critical result | 结果、危急值 | `read_result`, `critical` |
| record review | record review (an existing report read from the notes or the EHR) | 病历查阅（在病历或电子病历中调阅已有报告） | `investigations[].performedAt: "records"` |
| cannot speak, cannot answer | "<name> cannot speak: <reason>" (approach), "<name> cannot answer: <reason>" (a question) — narrated | “<姓名>无法说话：<原因>”（走近时）、“<姓名>无法回答：<原因>”（提问时）——以旁白呈现 | `patient.nonVerbalWhen`, `nonVerbalReason`, rejection `cannot-answer` |
| work-up plan | work-up plan | 诊疗计划 | `update_workup` |
| bedside | bedside | 床旁 | the bedside rule (EMBODIED §6) |
| bedside monitor; attach the monitor | bedside monitor; attach the monitor | 床旁监护仪；连接监护 | `patient-monitor`, operation `attach` |
| triage readings | triage readings (taken by hand) | 分诊手测数值 | `physiology.monitor.spotChecks` |
| IV access | IV access | 静脉通路 | `iv-access` |
| delegate a task | delegate a task | 委派任务 | `delegate_task` |
| take the patient (on their trolley) | take the patient to …; patient transport | 转运患者；用推床把患者送过去 | `transport_patient` |
| equipment operation | operate the equipment (device operations) | 设备操作 | world action / 世界动作: `world_action`, `interact_object` |
| refusal | "Not here: …" with the reason and the way | “此处无法进行：……”及原因与去路 | spatial refusal: `SPATIAL_REQUIREMENT_UNMET`, `hint.goal` |
| Go there | Go there | 前往 | a `navigate` to `hint.goal` |

### Assessment and debrief

| concept | en | zh-CN | technical | notes |
|---|---|---|---|---|
| assessment | assessment | 评估 | `assess`, `AssessmentReport` | formative |
| formative feedback | formative feedback | 形成性反馈 | | |
| the score notice | "a teaching-script measure, not a validated competency score" | “教学脚本评估，并非经过验证的能力评分” | `cmd.debrief.notice` | on every score |
| rubric | rubric | 评分细则 | `rubric[]` | |
| critical item | critical item; in the debrief "Critical items missed" | 关键项；复盘中“未达成的关键项” | `rubric[].critical`, `AssessmentReport.criticalMissed` | the case's dangerous error or missed life-saving act, named first in every debrief; never caps the score |
| not scored | not scored ("the situation this item scores did not arise") | 未计分（“本次接诊中没有出现该项评分的情形”） | `rubric[].scoredWhen`, rubric result `scored: false` | an avoided-harm item counts only once the harm was possible |
| debrief | debrief | 复盘 | `/debrief`, `debrief` | the method is debriefing (引导性反馈), here PEARLS |
| key reasoning, teaching points, evidence boundaries, unknowns, references | key reasoning, teaching points, evidence boundaries, unknowns, references | 关键推理、教学要点、证据边界、仍未知的信息、参考文献 | `debrief.*` | |

### Platform

| concept | en | zh-CN | technical | notes |
|---|---|---|---|---|
| agent | agent | 智能体 | agent profile | never 代理 |
| external agent | external agent | 外部智能体 | `mcp --attach`, world bridge | |
| provider; model | provider; model | 服务商；模型 | provider id; model id | |
| language model | language model; offline (deterministic) | 语言模型；离线（确定性应答） | LLM / 大模型, provider `offline` | the web world, the REPL and the debrief say "language model" / 语言模型; "LLM" / 大模型 is the technical word (README, docs, CLI command help) |
| proxy | proxy | 代理 | provider `proxy` | the only use of 代理 |
| the world | the world (the 3D hospital) | 世界 | world model / 世界模型 (`@clinicalcraft/world`) | |
| trace | trace (live trace) | 轨迹（实时轨迹） | episode trace, `--trace` | |
| transcript | transcript (session record) | 会话记录 | JSONL transcript | |
| approval | approve, deny, approval | 批准、拒绝、审批 | approval gate | |
| grounding | grounded in the case record: facts only from the case | 依据病例：事实只来自病例记录 | grounding rules (ARCHITECTURE §2.1) | "grounding" is technical; learners read what it means |
| grounding check | grounding check | 事实核验 | `verifyGrounding` | |
| benchmark | benchmark | 基准测试 | `bench` | |
| grounding benchmark | grounding benchmark | 事实依据基准 | `bench grounding`, suite `grounding-v1` | developer-facing |
| embodied agent benchmark | embodied agent benchmark | 具身智能体基准测试 | `bench run`, suite `embodied-v1` | developer-facing technical name |
| benchmark scenario | scenario | 场景 | `clinicalcraft/bench-scenario@1` | |
| skill; hook | skill; hook | 技能；钩子 | `execute_skill`; settings `hooks` | |
| equipment catalog | equipment catalog | 设备目录 | `clinicalcraft/equipment-catalog@1` | "catalog" is the schema's name; ordinary prose says "catalogue" (the provider catalogue) |

## 3. Register rules

### Both languages

* **Clinical words, not software words, for learners.** Learner-facing text
  never shows a tool id (`navigate_to`), an error code
  (`SPATIAL_REQUIREMENT_UNMET`), a JSON field, an id that names a diagnosis
  (`stemi-inferior-rv`) or AI jargon (agent loop, prompt, token, embodied /
  具身, grounding / 落地, autopilot / 自动驾驶). Those belong to the technical
  register.
* **Facts only from the case record.** Runtime strings never add a clinical
  "normal", a number or a finding; unrecorded data stays "not recorded" /
  “未记录” (ARCHITECTURE §2.1).
* **Same facts in both languages**: the same numbers, sides, times,
  placeholders and order of information.
* **Honest status.** Scores are formative teaching measures; review status
  says exactly who reviewed a case (§4); nothing is called validated or
  production-ready unless EMBODIED §14 says so.
* **Speech registers.** Patients and companions speak lay language in the
  first person (no clinical terms the persona would not know). Staff speak
  the clinical register: concise, structured (ISBAR / SBAR for handovers and
  escalation), standard abbreviations (BP, SpO₂, ECG, IV). System text is
  plain, short and addressed to "you".

### zh-CN

* 标准医学名词：以全国科学技术名词审定委员会公布的名词为准，药品用中国药典 /
  国家药品通用名称；同一病例、同一界面中药名与检查名前后一致。
* 患者与陪同者的话用自然口语，不用术语，不用翻译腔；工作人员的话用简洁的临床
  书面语；系统提示用短句，称学员为“你”，患者称医生为“医生”“您”。
* 标点用全角（，。、：；？！（）“”——……），数字与拉丁字母用半角；沿用现有写法：
  正文中的数字两侧留半角空格（“约 5 分钟”“第 3 分钟”），年龄紧排（“58岁”）。
* 英文缩写只用临床通用者（ECG、CT、SpO₂、IV），首次出现处可附中文（心电图、
  静脉通路）。
* 学员可见文字中不出现：具身、自动驾驶、自动诊疗、指代智能体的“代理”、语义落地、
  工具名与错误码。

### en

* British spelling, the library's convention: haemoglobin, anaesthesia,
  oedema, paediatrics, oesophagus, licence (noun), -ise (recognise,
  organise), work-up (noun), operating theatre.
* Sentence case for labels, buttons, headings and menu items ("Attach the
  monitor", "Case library"); capitals only for proper names and the V4-style
  kickers ("CASE LIBRARY").
* Curly quotes (“ ” ‘ ’), the ellipsis character for progress ("Loading the
  case…"), a spaced em dash for an aside ( — ), an en dash for ranges (1–9).
* SI units (mmol/L), a space between a number and its unit (5 min, 0.5 mg,
  95 %).

## 4. Learning outcomes and review status: where they show

**Learning outcomes** (`learningOutcomes`) are specific by design ("…localising
an inferior STEMI to the right coronary artery…"), so they usually name the
diagnosis. The no-spoiler rule (CASE_AUTHORING §1) therefore decides where they
appear:

| where | what |
|---|---|
| web library / case card (before play) | a closed **Learning outcomes (n) · may reveal the diagnosis** disclosure on the selected case; opening it shows the full case's text |
| CLI `play` banner (before play) | how many there are and that the debrief lists them |
| MCP `list_cases` and `clinicalcraft://cases` (the client is the learner being assessed) | how many there are (`learningOutcomeCount`), never the text |
| the library index (`CaseIndexEntry`: web bundle, `cases index`, the server's case listing) | the count only (`learningOutcomeCount`): the index stays spoiler-free |
| CLI `cases show` (facilitator view) and `cases list --json` | the full list, under a heading that says it may name the diagnosis |
| every debrief: web debrief panel, `/debrief`, MCP `get_debrief` once the case is complete | the full list |

**Review status** (`provenance.review`) is shown wherever a case is offered
(library card, selected case, CLI `cases list` / `cases show` / `play` and its
case picker, MCP `list_cases`, the journal's sources panel, the debrief), only
when the case records it, in exactly these words:

| `status` | en | zh-CN |
|---|---|---|
| `unreviewed` | Not yet reviewed (neither editorial nor clinician review) | 尚未审核（未经编辑审核，也未经执业医师审核） |
| `editorial` | Editorial review {date} · not yet reviewed by a licensed clinician | 编辑审核 {date} · 尚未经执业医师审核 |
| `clinician-reviewed` | Reviewed by a licensed clinician {date} | 已经执业医师审核 {date} |

The reviewers and the review notes appear with it in the full-case views
(`cases show`, the journal's sources panel); the guidance checked names the
condition, so it waits for `cases show` and the unlocked debrief.

Short tag on a library card: "Not yet reviewed" / 尚未审核, "Editorial review" /
编辑审核, "Clinician-reviewed" / 执业医师已审核 (lower-case in the CLI's
`cases list` column and case picker, each followed by a one-line legend: an
editorial review is not a review by a licensed clinician). Never claim
clinician review the case does not record.

**A published or adapted case's source** — its citation, DOI, authors, notes
and source references (`provenance.citation`, `doi`, `authors`, `notes`,
`debrief.references`) — usually names the diagnosis (a case report's title
does), so it is kept back until the case is complete:

| where | what |
|---|---|
| web journal's sources panel, learning record | until then: "Shown in the debrief once the case is complete (a case report’s title may name the diagnosis)." / “病例完成后在复盘中显示（病例报告的标题可能提示诊断）。” |
| CLI `cases show`, `cases list --details` | "The citation, DOI and source references are hidden: they may name the diagnosis (--spoilers shows them)." / “出处、DOI 与来源文献已隐藏：可能提示诊断（加 --spoilers 显示）。”; shown with `--spoilers` (`cases show --json`: left out unless `--spoilers` or `--full`) |
| MCP `list_cases`, `clinicalcraft://cases`, session resources, a mid-case `get_debrief` | never |
| server `GET /api/content/cases/:id` | left out unless `?spoilers=1` (the web asks, and gates it as above) |
| the debrief of a completed case (web, `/debrief`, MCP `get_debrief`) | the references |

## 5. Adding a term

Add the row here first (both languages, the technical name, the reason when it
replaces another word), then change the strings, the tests that assert them and
the documents in the same change; keep [zh-CN/EMBODIED.md](zh-CN/EMBODIED.md) in
step with [EMBODIED.md](EMBODIED.md).
