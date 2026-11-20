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
| a case-board decision (`decisions[]`) | 判断 / "judgement" (web), 决策 / "decision" (CLI, agent, MCP) | **决策** / **decision** (临床决策 / clinical decisions) | the schema, tools and reports say decision; "can answer" reads 可以作答 (also the status in decision lists, not 可作答) |
| how a decision and its options are named while the case runs | by authored id (`/answer diagnosis dual`, `[dual]` in lists); a locked one 判断 N (agent, CLI) | **决策 2** / **Decision 2** (its number in case order) and **选项 B** / **option B** (letters in presentation order); `/answer 1 B` | authored ids can name the diagnosis or the answer (`phosphate-wasting`, `carney`, `supported`); numbers and letters say nothing, and every surface — board, `/board`, tools, MCP — uses the same ones |
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
| the operative field of a case's `procedure` | — | **术野** / **operative field** | the surgeon's word for what the laparoscope shows and the instruments act on |
| `views[]` "cvs" | — | **关键安全视野** / **critical view of safety** (CVS) | the established term (Strasberg; SAGES); never "安全视图" |
| `safety-pause` | — | **安全暂停** / **safety pause** | a pause before an irreversible step to state the critical view; it records the operator's judgement and is never shown as a verification |
| `bailout` strategies | — | **补救策略** / **bail-out** (求助、胆囊次全切除、中转开腹) | the safe alternatives when the critical view cannot be reached; not "失败方案" |
| `procedure.variants` | — | **解剖变异** / **anatomical variant** (假设性 / counterfactual when the source does not report it) | the patient's real anatomy in a session, hidden from the operator; never "版本" or "变体" |
| region `fibrosis` | — | **致密纤维化** / **dense fibrosis**; a frozen triangle: **“冰冻”三角** | what severe chronic inflammation does to the planes; the `dense-fibrosis` signal reads "组织致密，层次已无法分开" |
| a duct or vessel handle `T1…` | — | **结构 T1…** / **structure T1…** | what the operator sees before identifying it; the anatomy's name appears only after imaging |
| the web window that runs the operation (`surgery`) | — | **腹腔镜手术** / **Laparoscopic surgery** (HUD button 手术 / Surgery) | names what the learner does, not the engine part |
| the laparoscopic picture kept beside the theatre (`scope-dock`) | — | **腹腔镜画面** / **Laparoscope**; its states 实时 / Live, 腹腔镜在体外 / Scope outside the patient, 已中转开腹 / Converted to open | the picture, not a window: it stays in view whatever window is open |
| the camera an endoscope's picture comes from (capability `endoscopic-camera`) | 腹腔镜摄像系统 / "a laparoscopic camera" | **内镜摄像系统** / **an endoscopic camera** | a laparoscopy tower and a thoracoscopy tower both supply it, so the label names neither scope; the messages of a laparoscopic operation itself still say 腹腔镜 / laparoscopic |
| what a screen of kind `thoracoscopy` shows | — | **胸腔镜画面** / **the thoracoscope's picture** | a representative picture of what the equipment is for, as a `pacs` screen's slice is; never called a finding or a live image |
| a body drawn with equipment (an equipment type's `manikin`): the patient simulator of a training station | — | **模拟人** / **a manikin** (of a station: **a patient simulator**) | it is drawn as the people of the world are, and it is nobody — never 患者 / "the patient" in the text of a station, which rehearses a sequence on a simulator |
| what is drawn of equipment in a state (a behaviour state's `look`) | — | technical **状态外观** / **a state's look** | content authors' word: it follows the state and decides nothing; learners never read it — they see the station change |
| a part of an equipment model drawn only in some states (a node `layer:<id>`) | — | **图层** / **layer** (`assets inspect` prints 图层 / Layers) | the word modelling tools use for parts shown and hidden together; never 层 alone, which is a storey (楼层) here |
| `portPlans[]` | — | **布孔方案** / **port plan** | the surgical term for where the trocars go |
| work-up plan | "workup plan" (agent, CLI) | **work-up plan** | British spelling of the noun; the tool keeps its id `update_workup` |
| operating room (case setting, room kind) | "Operating room" (web, CLI) | **operating theatre** | British usage, as the world and facilities already say; the id stays `operating-room` |
| the CMCR collections (library filter, card label) | 中华病例说 · 多专科疑难（{n} 例）, 多专科疑难病例集 / "CMCR · multispecialty cases ({n})", "Multispecialty collection" (web); 中华病例说 · 20 例 / "CMCR · 20 cases" (docs) | **中华病例说 · 原选病例（{n} 例）**, label **原选病例集** / **CMCR · original selection ({n})**, label **Original selection**; **中华病例说 · 新增病例（{n} 例）**, label **新增病例集** / **CMCR · additional cases ({n})**, label **Additional collection** | a collection is named for how it joined the library, the same way in both languages: 疑难 ("difficult") judged the cases and had no counterpart in "multispecialty", and both collections are multispecialty |

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
| case collection | collection; the filter's "All collections" | 病例集；筛选项“全部病例集” | collection tag in `tags` (`cmcr-20`, `cmcr-105`) | a case carries at most one collection tag; one wording per collection below |
| the original CMCR selection | CMCR · original selection ({n}); card label "Original selection" | 中华病例说 · 原选病例（{n} 例）；卡片标签“原选病例集” | tag `cmcr-20` | the 20 published cases of [CMCR_CASES.md](CMCR_CASES.md) |
| the additional CMCR cases | CMCR · additional cases ({n}); card label "Additional collection" | 中华病例说 · 新增病例（{n} 例）；卡片标签“新增病例集” | tag `cmcr-105` | the 105 of [CMCR_105_CASES.md](CMCR_105_CASES.md); never 疑难 / "difficult" or "multispecialty" (§1) |
| setting | setting (outpatient, emergency, inpatient, ICU, ward, operating theatre, community) | 场景（门诊、急诊、住院、重症监护、病房、手术室、院外现场） | `setting` | |
| facility | facility | 场馆 | `facility`, `clinicalcraft/facility@1` | |
| phase | phase | 阶段 | `phases[]` | |
| objective | objective; a "chapter" in the HUD | 任务目标（HUD 中为“章节”）；简称“目标” | `objectives[]` | the in-game task list; "目标" alone always means an objective |
| learning outcome | learning outcome | 学习目标 | `learningOutcomes[]` | an action verb and its standard; see §4 |
| decision | decision (clinical decisions) | 决策（临床决策） | `decisions[]`, `answer_decision` | answered on the case board |
| decision number | Decision 2 | 决策 2 | `decisionNumber`, `resolveDecisionRef`; `answer_decision` `decision_id: "2"`, `/answer 2 B` | how every learner-facing surface names a decision while the case runs: its number in case order, never its authored id (§1); a half-width space before the number (§3); a locked one shows only its number and what it needs |
| option letter | option B; "Answer by letter" | 选项 B；“请按字母作答” | `labelledOptions`; `option_ids: ["B"]` | A, B, C… in presentation order (`presentedOptions`), never the authored id or order; half-width capitals (full-width ones are read too); several options "A, C" (the CLI shows "A+C") |
| decision status | open; decided; a locked one "Decision 2 (not yet available)" in lists, "Decision 2 — locked" on the board | 可以作答；已作答；未开放的在列表中为“决策 2（尚未开放）”，在会诊板上为“决策 2 · 尚未解锁” | `label.unlocked`, `label.decided`, `label.decisionN` (lists: `/board`, `list_options`, `case_status`); web `board.ready`, `board.lockedTitle` | "can answer" is 可以作答 (§1), also the board's "Ready to decide" |
| single best answer | single best answer ("Decision 2 takes a single best answer: answer with one letter.") | 单选题（“决策 2 为单选题：请只用一个字母作答。”） | `decisions[].kind: "single"` | the default kind |
| select all that apply | select all that apply (a prompt ends "(Select all that apply.)"; the board: "Select all that apply, then submit") | 多选（题干注明“（多选）”；会诊板：“可多选 · 选出全部正确项后提交”） | `decisions[].kind: "multiple"` | not 多选题: the words say what to do |
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
| demonstration | demonstration; HUD button "Demo"; in a place in the team: "The demonstration works the case as the operating surgeon: it does not run while you hold the first assistant's place." | 示范接诊；在团队中担任岗位时：“示范接诊是以主刀医生的身份完成病例：你担任第一助手岗位时不能使用。” | autopilot: `/autopilot`, `--autopilot`, `eval`; agent `demonstrationRefused`, web `demonstrationLock` | the clinician agent works the case through the same approvals; offline it replays the case's reference path (参考路径); in a place its buttons are greyed out with that sentence, and the session refuses it all the same |
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
| consultation vs teaching hint | a consultation (consult a colleague: their specialty, from the record); a teaching hint (asked for explicitly: /hint, request_hint — counts against the score) | 会诊（向同事咨询：按其专科、依据病历）；教学提示（须明确申请：/hint、request_hint——计入评分） | `consult` never records a hint; `request_hint`, `/hint` | never inferred from the words of a consultation |
| position (a staff member's job) | the job a member of staff holds, finer than their facility role: scrub, circulating, ward or recovery nurse; operating surgeon, first assistant, second assistant, anaesthetist, physician… — "assistant surgeon" is the first assistant's old name | 岗位（洗手护士、巡回护士、病房护士、复苏室护士；主刀医生、第一助手（一助）、第二助手（二助）、麻醉医生…；助手医生是第一助手的旧称） | `StaffPositionSchema`, `POSITION_TITLES`, `staff.position`, a team member's `position`, `staffPosition` / `positionOf`; `assistant-surgeon` counts as `first-assistant` (`canonicalPosition`) | never "role" for this: `role` is what a body may do in the world. Titles are written in full; 一助 / 二助 are what the team says |
| role card | a position's job description: mission, responsibilities, what it may and never does, how it communicates, whom it escalates to, what it knows | 岗位职责卡 | `ROLE_CARDS`, `roleSection` (`<role>`), docs/CHARACTERS.md | a card never grants an act the world or the scope of practice refuses |
| your place in the team | Your place in the team: Operating surgeon (you may also do the team's parts) / First assistant / Second assistant / Scrub nurse; the team calls you by your place: "the first assistant (you)" | 你担任的岗位：主刀医生（团队各岗位的事也可由你做）/ 第一助手 / 第二助手 / 洗手护士；团队按岗位称呼你：“第一助手（你）” | `start {seat}` (`SeatSchema`; the places in the team: `TEAM_PLACES`), `SessionState.seat` (absent for the operating surgeon), `seatsOf` | never "role" or "seat" in learner text. In another place than the operating surgeon's you join at the team's phase: what came before is "done by the team before you joined" |
| controls (who may work which part of an operation) | Operate, Camera, Traction, Suction, Closure, Instrument table, Count, Equipment, Anaesthesia | 分工权限：主刀操作、扶镜、牵引显露、吸引、关闭切口、器械台、清点、设备、麻醉 | `SurgicalControlSchema`, `CONTROL_TITLES`, `DEFAULT_CONTROLS`; a team member's `controls`; an operation's `control` | a control says who may; holding — the port, the item — says who does. Not 操作范围 (practice scope) or 执业范围 (scope of practice) |
| character engine | how the characters are driven: by the rules, or by each character's model within its role card | 角色驱动方式：规则驱动 / 大模型驱动 | `characters.engine: "rules" \| "llm"`, `--characters` | learner-facing "model-driven characters" / 大模型驱动的角色; the rules always stand in when a model is missing, slow or off-script |
| safety datum status | not asked; remains unknown (asked; not recorded); verified — none / present; managed by a documented precaution | 未询问；仍不明（已询问，记录中没有）；已核实——无 / 有；已按记录的预防措施处理 | `history[].safety`, `datumStatus`, intervention `reports` / `mitigates` | asking is not confirming |
| record review | record review (an existing report read from the notes or the EHR) | 病历查阅（在病历或电子病历中调阅已有报告） | `investigations[].performedAt: "records"` |
| retrieve an existing report | Retrieve an existing report | 调阅已有报告 | `retrieve_report` (the published case only; never orders) |
| order a new investigation | Order a new investigation | 开具新检查 | `order_study`, `case.studies[]` test profiles ([STUDIES.md](STUDIES.md)) |
| simulated investigation | Simulated investigation (a study done in this encounter, from the case's teaching profile) | 模拟检查（本次接诊中完成，依据病例的教学配置生成） | `SessionState.studies`, `read_study`; never shown as the patient's record |
| published source record | Published source record | 原始病例记录 | `investigations[]` results |
| historical material unavailable | Historical material unavailable (the published case has no such record) | 原始病例中无此资料 | a record result `available: false`, or none |
| record not yet created | Record not yet created (written later in the encounter) | 该记录尚未产生 | `recordAvailability` `not-yet`, `investigations[].availability` |
| accession | accession (one acquisition of an ordered study: a tracing, a sample) | 检查号（一次采集：一份描记或一份标本） | `StudyAccession.id`, e.g. `ecg-12lead-1` |
| cannot speak, cannot answer | "<name> cannot speak: <reason>" (approach), "<name> cannot answer: <reason>" (a question) — narrated | “<姓名>无法说话：<原因>”（走近时）、“<姓名>无法回答：<原因>”（提问时）——以旁白呈现 | `patient.nonVerbalWhen`, `nonVerbalReason`, rejection `cannot-answer` |
| work-up plan | work-up plan | 诊疗计划 | `update_workup` |
| bedside | bedside | 床旁 | the bedside rule (EMBODIED §6) |
| bedside monitor; attach the monitor | bedside monitor; attach the monitor | 床旁监护仪；连接监护 | `patient-monitor`, operation `attach` |
| triage readings | triage readings (taken by hand) | 分诊手测数值 | `physiology.monitor.spotChecks` |
| IV access | IV access | 静脉通路 | `iv-access` |
| delegate a task | delegate a task | 委派任务 | `delegate_task` |
| take the patient (on their trolley) | take the patient to …; patient transport | 转运患者；用推床把患者送过去 | `transport_patient` (a patient who can walk walks there, EMBODIED §8.4) |
| take a monitor along | take the patient with the portable monitor; "… went with them, monitoring."; with no free spot on arrival: "… went with them, monitoring; with no free spot beside them on arrival, it stays right with them." | 带着便携监护转运；“……随行监护。”；到达后没有空位时：“……随行监护；到达后旁边没有空位，它仍留在患者身边。” | `transport_patient {monitor: true}`, `PatientLeg.monitor`, `PatientPlace.transit.monitor` (EMBODIED §8.7) |
| how the patient travelled; who took over | "You set off with … (on their bed / on a trolley / on foot)"; "… took over … there." | “你带……出发（推病床 / 推平车 / 步行）”；“由……在那里接手……。” | `patient.departed`, `PatientLeg.mode` (`TravelMode`), `PatientLeg.receivedBy` — the handover on arrival (EMBODIED §8.4) |
| not where you expected it; whereabouts unknown | "… is not in …, where you last saw it. Look around, or ask a colleague."; "not in … when you looked — whereabouts unknown" | “……不在……（你上次在那里见到）。请在周围找找，或问问同事。”；“你去……找过，不在那里——下落不明” | `STALE_DESTINATION`, `ActorState.missed`, `lastKnown.kind: "missing"` (EMBODIED §4) |
| ask where something is | ask a colleague where …; "Lin Xiao: … is in …"; "… said it is in …" | 问问同事……在哪里；“林晓：……在……。”；“……说在……” | `ask_whereabouts`, `askWhereabouts`, `lastKnown.kind: "told"` (EMBODIED §4) |
| as last seen (a thing out of sight) | "· connected when last seen (last seen in …)" | “· 上次所见：connected（上次见于……）” | `ObservedEntity.state` of a thing believed elsewhere, `SeenPlace.state` (EMBODIED §4) |
| build zone | the facility's own name for it — its room of kind `build-zone` ("Building Garden" in the built-in facilities) —, else "Build zone" (where blocks are built; a place name) | 建造园地 | `buildZone`, `buildZoneName`, `region.buildZone` (EMBODIED §4 "Location text") |
| ordered, not done yet (a study done on the patient at a device) | ordered — the patient must go to a CT scanner | 已开单——患者需要去CT扫描 | `resultStatus` `not-acquired`, `awaitingAcquisition` (EMBODIED §8.7): in-world only — ordered anywhere, done when the patient is on the device, the result its turnaround later; never "pending" (no result is on its way yet) |
| study done (the acquisition) | Study done; "the study has been done" | 检查已完成 | `acquire`, `order.acquired`, `OrderRecord.acquired`, by the radiographer / endoscopist (放射技师 / 内镜医师): recorded by the hospital when the patient is on the device, never entered by the learner |
| walk with the patient | walk with the patient; said: "Please follow me." / "Please wait here." | 带患者走动；说：“请跟我来。” / “请在这里等一下。” | `escort_patient` / `release_patient`, `PatientPlace.escort` (the technical name *escort* stays out of learner text) |
| come with me to … | said: "Please come with me to the CT scanner." | 说：“请跟我去CT扫描仪。” | a movement request → `transport_patient` (typed or a chip; understood in both languages) |
| change position | said: "Please lie down." / "Please sit up." / "Please stand up." | 说：“请躺下。” / “请坐起来。” / “请站起来。” | the case's positioning intervention for that posture, else `reposition_patient` |
| ask a colleague | said to them: "Please put the patient on the monitor.", "Please come to the bedside.", "You can go back now." | 对同事说：“请给患者上监护。”“请到床旁来。”“您可以回岗位了。” | a request in words → `delegate_task` / a walk by that colleague; outside their role they say so (`checkTaskScope`) |
| pass me … | said to a colleague: "Pass me the scalpel.", "Gauze, please." | 对同事说：“把手术刀递给我。”“纱布，谢谢。” | a request in words → the colleague's `pick_up` + `hand_over {to}` (`staff-requests.ts`); a bare noun only when a handheld item is called that |
| carried items | In your hands; Pick up / Put down / Equip / Take off / Hand to … | 手中物品；拿起 / 放下 / 佩戴 / 脱下 / 递给…… | handheld items `pick_up` / `put_down` / `equip` / `hand_over`; worn = `equipped` (does not fill a hand, `MAX_HELD` = 2) |
| an item kept in custody; hand-over receipt; sign for it | "Handed … : the hand-over is recorded, for … to confirm."; "Receipt confirmed: … from …"; Sign for it | 交接需签收的物品；交接记录；确认签收（“……交接已记录，待……签收。”“已签收……”） | `EquipmentType.custody`, `HandoffReceipt`, `confirm_receipt`, `item.handoff` (EMBODIED §8.1) — the receiver signs, never the one who handed it over; a receipt records the hand-over only |
| blood specimen tube; take the sample and label it at the bedside; medication box | Blood specimen tube; Take the sample and label it at the bedside; Medication box | 血标本管；床旁采血并贴标签；药盒 | `specimen-tube` `collect` (`empty` → `collected`, "Filled and labelled" / 已采血、已贴标签), `medication-box` — labelled in front of the patient |
| take an item to someone | take an item to someone and hand it over | 把物品送交给某人 | `delegate_task deliver_item` (`params.to`) |
| equipment operation | operate the equipment (device operations) | 设备操作 | world action / 世界动作: `world_action`, `interact_object` |
| refusal | "Not here: …" with the reason and the way | “此处无法进行：……”及原因与去路 | spatial refusal: `SPATIAL_REQUIREMENT_UNMET`, `hint.goal` |
| Go there | Go there | 前往 | a `navigate` to `hint.goal` |
| care team | care team (Team button, the team panel) | 手术团队（“团队”按钮、团队面板） | `case.team`, `TeamScheduler`, docs/TEAM.md | the staff of a room working on their own; learner text never says "agent" or "scheduler" for them |
| circulating nurse / scrub nurse | circulating nurse; scrub nurse | 巡回护士；洗手护士 | duties `circulate`, `instruments`, `count` | named by the facility ("Nurse Aisyah (circulating)" / 阿伊莎护士（巡回）) |
| surgeon | surgeon — whoever operates, in the team's words: the learner, or the stand-in surgeon while the learner holds another place; named in a mention as "@surgeon" (or "@术者", "@主刀") | 术者 | member `surgeon`, `PRIMARY_ACTOR` (`LEARNER_BODY`); in a place, the surgeon member's `standIn` (`operatorOf`); the position words "surgeon", 术者, 主刀 (agent `tools/position-words.ts`) | 术者, not 主刀 or 外科医生, in team speech; the job is the operating surgeon / 主刀医生 (position `surgeon`); naming the place you hold yourself names nobody else: "First assistant is your own place in the team: name a colleague." / “第一助手是你自己在团队中的岗位：请指明一位同事。” |
| read-back (check-back) | read back; "A needle holder to the surgeon — confirm?" — "Yes — go ahead." / "No — not now."; the team window's buttons: Read back / Can't (to a request), Confirm / Not now (to a read-back of your own ask) | 复述确认；“持针器递给术者——确认吗？”——“对，开始吧。”/“先不用。”；团队面板的按钮：复述确认 / 做不到（回应请求）、确认 / 先不用（回应同事对你请求的复述） | message kinds `request` → `readback` → `confirm` (TeamSTEPPS check-back); the learner's `team reply` confirm / decline without words of their own | the confirmation is the asker's own words, never the read-back said back |
| escalate | tell the surgeon why ("… hasn't arrived — …") | 上报（向术者说明原因） | message kind `escalate` | always with the reason |
| relief colleague | relief colleague (called by phone) | 顶班同事（电话联系） | scenario `relief` | |
| information a colleague holds; pass it on | "… has it; I'm getting it."; "… waits until it's confirmed."; read back | 信息交接；“……在某某那里，我去问。”“……等确认后再进行。”；复述确认 | scenario `inform`, duty `inform`, message `about.info`; recorded as `ask` with `via: "team"` (TEAM.md §4.7) | only a fact the case records, word for word; one named colleague holds it |
| the doctor (an emergency team's words for the learner) | the doctor | 医生 | team member `name` on `surgeon` | in an operating room the team says the surgeon (术者); an emergency team is a 医护团队, never a 手术团队 |
| assistant (at the operating table); hold the traction; let go | assistant — the first or the second ("assistant surgeon" is the first's old name); "Please hold the grasper in port B, pulling the infundibulum caudally." — "Holding."; "Letting go now."; the traction has gone: the window has closed | 助手（第一助手、第二助手）；“请拉住 B 孔的抓钳，把胆囊颈向尾侧牵拉。”——“拉住了。”；“我松手了。”；牵引已松开：术野窗口已闭合 | duty `assist`; `delegate_task hold_traction` / `release_traction`, `team ask` (`traction`, `release`), `operate {op: "hand-over"}` with `actor`, `PortState.holder`, signal `exposure-lost` | the assistant holds with their own hands: when they leave the table, the traction falls; "Letting go now." is said before letting go |
| assist port (a port's role) | camera port, working port, assist port | 观察孔、操作孔、辅助孔 | port role `camera` / `working` / `assist` | never "assistant" for a port: the assistant (助手) is a person |
| camera holder | camera holder; said: "Take the camera, please." — "I have the camera."; "Camera on the hepatocystic triangle." / "Closer." / "Wider."; follows the work (aims where the operator works, unasked, saying nothing); declines "A close view needs something to look at: tell me where to aim the camera first." | 扶镜手；说：“请扶镜。”——“镜头我扶好了。”；“镜头对准胆囊三角。”/“推近。”/“拉远。”；镜头跟随术者操作（无需吩咐，不必说出）；不能推近时：“推近需要先对准一个部位：请先告诉我镜头对准哪里。” | whoever holds the camera port with the scope in it; else the member present, other than the surgeon, who holds the `camera` control (the position words `扶镜手` / "camera holder": agent `tools/position-words.ts`); following the work: `followStep`, task need `field:follow` | never a position: the only assistant in a two-surgeon team, the second assistant in a three-surgeon one; never the surgeon member, who may still aim a camera port nobody holds; an aim someone asked for stands until the work moves on |
| the camera's view | aim the camera (at a region, or the whole field); closer / wider; the work off the picture (the camera aimed elsewhere); out of frame (working where the close picture is not) | 镜头对准（某个区域，或全视野）；推近 / 拉远；操作不在画面中央（镜头对准别处）；画面外操作（镜头推近时在画面之外操作） | `aim {port, at?}`, `zoom {port, level}`, `ProcedureState.camera`, signal `off-view`, unsafe act `out-of-frame` | the camera holder's steps, or the operator's while nobody holds the camera port |
| pass (an instrument) | said: "Maryland, please." — "Passed." | 递器械；说：“请递分离钳。”——“递好了。” | the `instruments` control; `team ask` (`pass`), `operate {op: "pass"}` | the scrub nurse puts it into the hand of the one who will insert it, only when asked |
| ask a colleague at the table | a request about the operative field — traction, letting go, the camera, an aim, closer / wider, a pass — read back, confirmed, done, reported; declined with why: "I don't hold the Traction control: ask Dr Abe." — or, to one who holds it: "…: you do."; "Dr Abe is not in the theatre now: ask a colleague at the table." | 向手术台旁的同事提出请求——牵引、松手、扶镜、镜头对准、推近 / 拉远、递器械——复述、确认、完成、报告；不能做时说明原因：“我没有牵引显露的分工权限：请找阿部医生。”——对本人有此权限者：“……：你有。”；“阿部医生现在不在手术间：请向手术台旁的同事提出。” | `team ask {to, field}`, `TeamMessage.about.field`, task `assist` | the closed loop of every team request (read-back, then confirm); nobody withdraws an instrument or lets go unasked; a decline never sends the asker to themselves |
| stand-in surgeon | the colleague who operates while you hold another place: "Dr Ito operates"; says "I'll take port B." (a port taken back), "I'm waiting for the Maryland dissector to be passed.", "No CO₂ — I'm waiting for the insufflator." / "No picture — I'm waiting for the camera.", "I'll close once the count is settled.", "I can't go on: … Tell me when to try again." | 主刀同事：你担任其他岗位时由其主刀（“由伊藤医生主刀”）；说“B 孔我来。”（收回某孔）、“我在等递Maryland 分离钳。”、“没有二氧化碳——等气腹机恢复。”/“没有图像——等摄像系统恢复。”、“清点核对无误后我再关闭。”、“无法继续：……可以再试时告诉我。” | the team's surgeon member's `standIn` (`operatorOf`); its policy `team/operator.ts` (docs/TEAM.md §4.5) | 术者 / "the surgeon" still names whoever operates |
| the surgery window by place (its buttons) | a port "held by you" / "held by Dr Ito (operating surgeon)"; Take (from the operator) / Hand back / Hand to … / Take back (operating: from a colleague) / Ask for the … (in the scrub nurse's place, before it is passed); the camera block: Aim at … / Whole field / Follow the work: … / Closer / Wider; the instrument table: Pass … To …; "The operating surgeon's steps: shown here, taken by the operator." | 孔“由你握持”/“由伊藤医生（主刀医生）握持”；接过（从术者手中）/ 交还 / 交给… / 收回（作为术者：从同事手中）/ 请递……（洗手护士岗位上，递来之前）；镜头区：对准区域 / 全视野 / 跟随操作：…… / 推近 / 拉远；器械台：器械……递给……；“术者的步骤：你能看到，由术者完成。” | `portsForPlace`, `controlsForPlace`, `cameraOffer`, `tableOffer` (web `ui/panels/surgery-controls.ts`), docs/PROCEDURE.md §7 | each button is core's verdict for your place; a port is "taken", never "grabbed"; "Take back" is the operator's |
| line-up | Team: two surgeons (as reported) / three surgeons (authored) | 团队配置：两名医生（如原报告）/ 三名医生（编写） | `team.lineups`, `start {lineup}` | assistants added to the base team for one encounter; the base team stays as the source reports it |
| call-out (before a critical step) | "Clipping the cystic duct." / "Dividing the cystic duct." / "Coagulating the cystic artery." / "Bail-out: converting to open." — answered "No objection" / "Stop" (its card in the browser: "Dr Ito: Clipping the cystic duct."); stopped ("You stopped Dr Ito"), the stand-in asks "Stopped — tell me what you see." — answered "Go on" | 关键步骤前告知：“正在夹闭胆囊管。”/“正在离断胆囊管。”/“正在电凝胆囊动脉。”/“补救策略：中转开腹。”——答“无异议”/“停”（浏览器中显示为卡片：“伊藤医生：正在夹闭胆囊管。”）；被喊停后（“你叫停了伊藤医生”）主刀同事问：“停下了——告诉我你看到了什么。”——答“继续” | the surgeon card's protocol: say aloud before a critical step (clip, divide, coagulate, a bail-out) and wait for objections; while you hold a place the stand-in's critical step is asked of you as its call-out (`approval_request.callout`, rule `team.callout`) | said by whoever operates; anyone in the team may answer it; the structure is named as the operator identified it, else by its handle ("Clipping T2.") |
| standing by | "Dr Mori stands by: you hold his place" | 在旁待命：“森医生在旁待命：由你担任他的岗位” | `standingBy` | the colleague whose place you hold stays in the room and can still be spoken to |
| hand over the anaesthetic (relief) | "I'll hand over first."; "I've taken over the anaesthetic from …"; Anaesthesia handed over at 08:43: … | 麻醉交接；“我先交接。”；“我已从……手里接过麻醉管理。” | `team.cover`, duty `anaesthesia`, a `note` recording it (TEAM.md §5) | an anaesthetised patient is never left without an anaesthetist |
| count; hold on closure | count (closing count); "please hold closure and check the wound"; recount; "You have said the count: there is nothing more to count until a recount is asked for." | 清点（关闭前清点）；“请暂停关闭，检查术野”；复点；“清点你已经报过了：要求复点时再清点。” | `team.count`, `about.hold`, `about.recount`, `CountLedger`; the count record `SessionState.count` (`count` action); `team count` (said by the learner whose place holds the count) | an unresolved count ends with an X-ray before the patient leaves; the count is kept item by item (逐件), never as a bare number |
| count discrepancy; not in the count; set aside | "Count incorrect — 4 of 5 swabs"; "1 not in the count"; "set aside off the field" | 清点不符；“不在清点内”；“移出手术野另放” | count statuses `discrepancy` / `unresolved` / `excluded` / `reconciled`; `missing`, `unexpected`; `transfer` | a swab from another room is not in this count: six of five is a discrepancy, not "correct" |
| unsafe progression | "Closed while the count was not settled: recorded as an unsafe progression for the debrief" | 不安全推进（“在清点未相符时关闭：已记为不安全推进，供复盘”） | `CountRecord.unsafe`, `{ "count": { "unsafe": true } }` | recorded, never erased; not 违规 (a rule broken) — a step taken on an unsafe basis |
| search | Search within reach; Check the wound | 在身边仔细查找；检查术野 | world operation `search` (`targetId`: the patient), concealed items (EMBODIED §8.6) | |
| learner mode / observer mode (team) | I am the surgeon (in a place: I play my place); Observe | 我来当术者（担任岗位时：我来担任这个岗位）；观察 | `team surgeon learner \| simulated` (observer mode = the simulated surgeon; in a place, the place's own policy) | |
| what the surgeon waits for (team window) | "The surgeon waits for you"; Go on; Do it in the surgery window; answered: "You answered — the surgeon goes on"; the HUD's Team button: "Team · waits for you"; stopped: "You stopped Dr Ito — the surgeon will ask what you see: answer in the Team window ("Go on")." | “术者在等你”；继续；在手术窗口中完成；回答后：“你已回答——术者接着进行”；HUD 的团队按钮：“团队 · 在等你”；喊停后：“你叫停了伊藤医生——术者会问你看到了什么：请在团队面板中回答（“继续”）。” | the agent's `learnerAwaited` (a `team run` stops there), `haltOf` (the stop, "I can't go on") | shown first in the team window while you hold a place |
| the team as it works (team window) | The team: "Operating surgeon: Dr Ito", "First assistant: you · Dr Abe stands by", "relief colleague (called by phone)", "not here in this encounter" | 团队成员：“主刀医生：伊藤医生”“第一助手：你 · 阿部医生在旁待命”“顶班同事（电话联系）”“本次不在场” | the team's members (`TeamCheckpoint`), core `staffPosition`, `standingBy` (web `team-view.ts` `teamRows`) | each member by their position; "you" for your own |
| Need (team window) | Need: Item, For (the surgeon / me), Say it — what the team can find and bring | 需要：物品、给谁（术者 / 我）、说出来——团队能找到并送来的东西 | `team need {item, for?}`; the hospital's hand-held equipment, a team scenario's needs first (web `needItems`) | never "order" or "request" for this: you say what is needed, the team fetches it |
| what was done (team window) | What was done: "Dr Ito: insert an instrument", "looked at the field", "… (through the device)", "Walk", "could not: …" | 做了什么：“伊藤医生：置入器械”“查看了术野”“……（通过设备）”“步行前往”“未能：……” | the team's receipts (`ActionReceipt`: `operate` steps, `observe_field`, a device's step of the operation, world acts) | the latest few; a member's own following of the work with the camera is not listed |
| the scrub nurse's bar | "The surgeon asks for: Maryland"; Pass the Maryland; "Passed, waiting to be taken: …"; Hand the needle holder to the surgeon; In my hands; Say the count; Instrument table; Hide | “术者要：分离钳”；递分离钳；“已递出、待取用：……”；把持针器交给术者；我手里的；报清点；器械台；收起 | web `ui/scrub-bar.ts` | stacked on the scope dock in the scrub nurse's place, hidden while a window is open; no window: the encounter's time runs on; observing, nothing offered |
| team pace | Team pace: Auto / Step / Next step | 团队节奏：自动 / 单步 / 下一步 | autonomy `auto` / `step` (`team resume` / `pause` / `step`) | |
| the team as text (terminal, MCP) | "Your place in the team: first assistant (id doc-1) — fixed for this encounter."; "Your controls: …"; "Dr Ito, the stand-in surgeon, operates; Dr Abe stands by — you hold their place."; "Team: round 5 · pace auto · you play your place (first assistant)"; "The surgeon waits for you — Dr Ito: “…” [msg-8]"; "answer: /team reply msg-8 readback"; "do it, then report: …"; "Said to you, not answered yet:"; "Nothing waits for you."; a line to you: "Dr Ito → you: …"; the call-out in the terminal: "? Dr Ito: Clipping the cystic duct." — "[y] No objection / [n] Stop"; over MCP: "Call-out — Dr Ito: “Clipping the cystic duct.” Answer it: …"; observing: "Type /team play to answer, ask or count yourself." / 'Call the team tool with action "play" …' | “你在团队中的岗位：第一助手（id doc-1）——本次接诊中不变。”；“你的分工权限：……”；“由主刀同事伊藤医生主刀；阿部医生在旁待命——由你担任其岗位。”；“团队：第 5 轮 · 节奏：自动 · 由你担任岗位（第一助手）”；“术者在等你——伊藤医生：“……” [msg-8]”；“回答：/team reply msg-8 readback”；“做完后报告：……”；“对你说过、尚未回答的话：”；“没有在等你的事。”；对你说的话：“伊藤医生 → 你：……”；终端中的关键步骤前告知：“? 伊藤医生：正在夹闭胆囊管。”——“[y] 无异议 / [n] 停”；MCP 中：“关键步骤前告知——伊藤医生：“……” 请回答：……”；观察时：“输入 /team play 后才能自己回答、请求或清点。” | `/seat`, `/team` (agent `commands-world.ts`, `team-text.ts`), the CLI renderer's "→ you", MCP's `team` tool (`team-tool.ts`) | reply kinds (`readback`, `confirm`, `decline`, `report`) and command words stay as typed; "the surgeon" (术者) is whoever operates; each front-end names its own control to play the part |
| checklist step; invalid (out of order) | WHO Sign In / Time Out / Sign Out; "Recorded as INVALID — out of order" | WHO 麻醉前核查 / 切皮前暂停核查 / 离室前核查；“已记为无效——顺序不对” | `checklist: true`, `InterventionRecord.invalid` | never "given" or "done" when invalid |
| hold (withheld clearance); release after reassessment | "Induction is on hold — placed by the attending: …"; "released after reassessment: …" | 暂缓（不同意继续）；“诱导已被上级医师暂缓：……”；重新评估后解除 | `hold` / `release-hold` actions, `place_hold` / `release_hold`, `held`, code `on-hold` | 暂缓, not 禁止 or 冻结: a decision that waits on a reassessment |
| what is still needed; next | "· WHO Time Out … → next: intervene …" | 仍需；下一步 | `case_status` requirements (`explainCondition`) | met ✓ / open · |
| teaching correction | "Correction: …" | 纠正：…… | `npcs[].corrections` | authored teaching, said by the colleague who catches the error |

### Assessment and debrief

| concept | en | zh-CN | technical | notes |
|---|---|---|---|---|
| assessment | assessment | 评估 | `assess`, `AssessmentReport` | formative |
| formative feedback | formative feedback | 形成性反馈 | | |
| the score notice | "a teaching-script measure, not a validated competency score" | “教学脚本评估，并非经过验证的能力评分” | `cmd.debrief.notice` | on every score |
| rubric | rubric | 评分细则 | `rubric[]` | |
| critical item | critical item; in the debrief "Critical items missed" | 关键项；复盘中“未达成的关键项” | `rubric[].critical`, `AssessmentReport.criticalMissed` | the case's dangerous error or missed life-saving act, named first in every debrief; never caps the score |
| not scored | not scored ("the situation this item scores did not arise") | 未计分（“本次接诊中没有出现该项评分的情形”） | `rubric[].scoredWhen`, rubric result `scored: false` | an avoided-harm item counts only once the harm was possible |
| an item of another place | not scored in your place ("this item is another place's") | 不计入你担任的岗位（“该项属于其他岗位”） | `rubric[].seats`, rubric result `scored: false` | an item without `seats` is the operating surgeon's |
| done by the team before you joined | Done by the team before you joined | 你加入前由团队完成 | `AssessmentReport.joined` (`SessionState.joined`) | in a place: shown, never credited to you |
| safety outcome; passed / not passed | safety: passed / not passed | 安全性：通过 / 未通过 | `AssessmentReport.safety.passed` | shown beside the score on every debrief and export, never folded into it; a run that did not pass is never called passed, whatever its percentage |
| critical safety failure | critical safety failure | 严重安全失误 | `interventions[].critical`, `safety.criticalFailures` | the case's dangerous error, made: a critical intervention given while contraindicated. Not "critical item" (关键项), which is a rubric item missed |
| dose error; critical dose error | dose error; critical dose error ("not given: the dose ordered differs from the preset") | 剂量错误；严重剂量错误（“未给药：医嘱剂量与预设剂量不符”） | `dose.error`, `safety.doseErrors`, `severity` | the order is not carried out; critical when tenfold (×10 or ÷10 of any dose the preset allows), and on a critical, high-risk or high-alert drug (高警示药品, ISMP) also at twice the preset or more or by another route; any other is a dose error to review (待复盘) that never fails the safety outcome |
| dose not clear | the dose in the order is not clear ("I need the dose clearly", "as a number with its unit") | 剂量不明确（“我需要把剂量确认清楚”，“用数字加单位”） | rejection `dose-unclear`, `checkOrder` `query`, `data.doseQuery` | a dose that cannot be read (a fraction, "0。5 mg", "50 000", mEq, a range across the preset's ends, two doses that disagree, no unit) or compared (no strength, no weight, a rate for a single dose), or a part of a dose given in parts ("is that the whole dose?" / “这是全部剂量吗？”): the nurse asks, nothing is given, no dose error |
| the order as written; the dose read from it; the preset dose | as ordered; read as; preset dose | 医嘱原文；识别剂量；预设剂量 | `ordered.text`, `ordered.dose`, `doseSpec` | the debrief shows all three apart |
| a bolus, then an infusion; given in parts | "70–80 units/kg IV, then 18 units/kg/h"; "(… as a bolus, the rest at …)" | 随后……；先推注……，其余以……输注 | `doseSpec.maintenance`, `doseSpec.bolus` | a preset's two parts, each checked against what an order states for it |
| error recognition and recovery | error recognition and recovery (teaching) | 错误识别与补救（教学） | `errorRecovery` | a reference path that makes an error on purpose, declared; facilitator-facing |
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
| equipment model | 3D model (of an equipment type) | 设备模型 | `model` (GLB/glTF), `clinicalcraft assets inspect` | visual only: the voxel parts stay the fallback and the footprint the collider ([ASSETS.md](ASSETS.md)) |
| model use status | cleared; research only; licence check pending | 可发布；仅限研究；许可待核实 | `model.use`: `cleared` / `research-only` / `pending`; `model.source` (provenance) | never "approval" (审批 is the action gate) |
| grounding | grounded in the case record: facts only from the case | 依据病例：事实只来自病例记录 | grounding rules (ARCHITECTURE §2.1) | "grounding" is technical; learners read what it means |
| grounding check | grounding check | 事实核验 | `verifyGrounding` | |
| benchmark | benchmark | 基准测试 | `bench` | |
| grounding benchmark | grounding benchmark | 事实依据基准 | `bench grounding`, suite `grounding-v1` | developer-facing |
| operative benchmark | operative benchmark | 手术基准测试 | `bench operative`, suites in `<content dir>/operative/` | developer-facing; agents operate with the anatomy hidden |
| embodied agent benchmark | embodied agent benchmark | 具身智能体基准测试 | `bench run`, suite `embodied-v1` | developer-facing technical name |
| benchmark scenario | scenario | 场景 | `clinicalcraft/bench-scenario@1` | |
| held-out split | held-out (test) | 留出（test） | scenario `split: "test"`, `bench run --split` | never used to tune an agent; no scripted plan; reported apart from `dev` |
| control (benchmark agent) | control run — not a model result | 对照运行——不是模型结果 | `reference`, `scripted-llm`; report `agent.role: "control"` | a live model's run (`llm`) is reported apart, never beside a control's 100 % |
| safety-review worksheet | safety-review worksheet; specialty clinician / nurse verdict; disagreement | 安全审核表；专科医师意见 / 护士意见；分歧 | `cases safety-review` | it records no verdict: "No independent review has been recorded yet." |
| skill; hook | skill; hook | 技能；钩子 | `execute_skill`; settings `hooks` | |
| equipment catalog | equipment catalog | 设备目录 | `clinicalcraft/equipment-catalog@1` | "catalog" is the schema's name; ordinary prose says "catalogue" (the provider catalogue) |

## 3. Register rules

### Both languages

* **Clinical words, not software words, for learners.** Learner-facing text
  never shows a tool id (`navigate_to`), an error code
  (`SPATIAL_REQUIREMENT_UNMET`), a JSON field, an id that names a diagnosis
  (`stemi-inferior-rv`) or an answer (a decision's or option's authored id:
  `phosphate-wasting`, `supported` — decisions by number, options by letter,
  §2) or AI jargon (agent loop, prompt, token, embodied / 具身, grounding /
  落地, autopilot / 自动驾驶). Those belong to the technical register.
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
| web journal's sources panel, learning record | until then: "Shown in the debrief once the case is complete (a case report’s title may name the diagnosis)." / “病例完成后在复盘中显示（病例报告的标题可能提示诊断）。” The sources panel also leaves out the list of the report's figures and PDF, whose titles follow the report's captions, and says so: "The report's title, authors and citation, with its figures and the source PDF, unlock once the case is complete. …" / “原报告的标题、作者与出处，以及原文配图和 PDF，将在完成病例后开放。……” |
| CLI `cases show`, `cases list --details` | "The citation, DOI and source references are hidden: they may name the diagnosis (--spoilers shows them)." / “出处、DOI 与来源文献已隐藏：可能提示诊断（加 --spoilers 显示）。”; shown with `--spoilers` (`cases show --json`: left out unless `--spoilers` or `--full`) |
| MCP `list_cases`, `clinicalcraft://cases`, session resources, a mid-case `get_debrief` | never |
| server `GET /api/content/cases/:id` | left out unless `?spoilers=1` (the web asks, and gates it as above) |
| the debrief of a completed case (web, `/debrief`, MCP `get_debrief`) | the references |

## 5. Adding a term

Add the row here first (both languages, the technical name, the reason when it
replaces another word), then change the strings, the tests that assert them and
the documents in the same change; keep [zh-CN/EMBODIED.md](zh-CN/EMBODIED.md) in
step with [EMBODIED.md](EMBODIED.md).
