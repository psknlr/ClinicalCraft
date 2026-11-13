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
| consultation vs teaching hint | a consultation (consult a colleague: their specialty, from the record); a teaching hint (asked for explicitly: /hint, request_hint — counts against the score) | 会诊（向同事咨询：按其专科、依据病历）；教学提示（须明确申请：/hint、request_hint——计入评分） | `consult` never records a hint; `request_hint`, `/hint` | never inferred from the words of a consultation |
| position (a staff member's job) | the job a member of staff holds, finer than their facility role: scrub, circulating, ward or recovery nurse; operating surgeon, first assistant, second assistant, anaesthetist, physician… — "assistant surgeon" is the first assistant's old name | 岗位（洗手护士、巡回护士、病房护士、复苏室护士；主刀医生、第一助手（一助）、第二助手（二助）、麻醉医生…；助手医生是第一助手的旧称） | `StaffPositionSchema`, `POSITION_TITLES`, `staff.position`, a team member's `position`, `staffPosition` / `positionOf`; `assistant-surgeon` counts as `first-assistant` (`canonicalPosition`) | never "role" for this: `role` is what a body may do in the world. Titles are written in full; 一助 / 二助 are what the team says |
| role card | a position's job description: mission, responsibilities, what it may and never does, how it communicates, whom it escalates to, what it knows | 岗位职责卡 | `ROLE_CARDS`, `roleSection` (`<role>`), docs/CHARACTERS.md | a card never grants an act the world or the scope of practice refuses |
| your place in the team | Your place in the team: Operating surgeon (you may also do the team's parts) / First assistant / Second assistant / Scrub nurse | 你担任的岗位：主刀医生（团队各岗位的事也可由你做）/ 第一助手 / 第二助手 / 洗手护士 | `start {seat}` (`SeatSchema`; the places in the team: `TEAM_PLACES`), `SessionState.seat` (absent for the operating surgeon), `seatsOf` | never "role" or "seat" in learner text. In another place than the operating surgeon's you join at the team's phase: what came before is "done by the team before you joined" |
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
| walk with the patient | walk with the patient; said: "Please follow me." / "Please wait here." | 带患者走动；说：“请跟我来。” / “请在这里等一下。” | `escort_patient` / `release_patient`, `PatientPlace.escort` (the technical name *escort* stays out of learner text) |
| come with me to … | said: "Please come with me to the CT scanner." | 说：“请跟我去CT扫描仪。” | a movement request → `transport_patient` (typed or a chip; understood in both languages) |
| change position | said: "Please lie down." / "Please sit up." / "Please stand up." | 说：“请躺下。” / “请坐起来。” / “请站起来。” | the case's positioning intervention for that posture, else `reposition_patient` |
| ask a colleague | said to them: "Please put the patient on the monitor.", "Please come to the bedside.", "You can go back now." | 对同事说：“请给患者上监护。”“请到床旁来。”“您可以回岗位了。” | a request in words → `delegate_task` / a walk by that colleague; outside their role they say so (`checkTaskScope`) |
| pass me … | said to a colleague: "Pass me the scalpel.", "Gauze, please." | 对同事说：“把手术刀递给我。”“纱布，谢谢。” | a request in words → the colleague's `pick_up` + `hand_over {to}` (`staff-requests.ts`); a bare noun only when a handheld item is called that |
| carried items | In your hands; Pick up / Put down / Equip / Take off / Hand to … | 手中物品；拿起 / 放下 / 佩戴 / 脱下 / 递给…… | handheld items `pick_up` / `put_down` / `equip` / `hand_over`; worn = `equipped` (does not fill a hand, `MAX_HELD` = 2) |
| equipment operation | operate the equipment (device operations) | 设备操作 | world action / 世界动作: `world_action`, `interact_object` |
| refusal | "Not here: …" with the reason and the way | “此处无法进行：……”及原因与去路 | spatial refusal: `SPATIAL_REQUIREMENT_UNMET`, `hint.goal` |
| Go there | Go there | 前往 | a `navigate` to `hint.goal` |
| care team | care team (Team button, the team panel) | 手术团队（“团队”按钮、团队面板） | `case.team`, `TeamScheduler`, docs/TEAM.md | the staff of a room working on their own; learner text never says "agent" or "scheduler" for them |
| circulating nurse / scrub nurse | circulating nurse; scrub nurse | 巡回护士；洗手护士 | duties `circulate`, `instruments`, `count` | named by the facility ("Nurse Aisyah (circulating)" / 阿伊莎护士（巡回）) |
| surgeon | surgeon — whoever operates, in the team's words: the learner, or the stand-in surgeon while the learner holds another place | 术者 | member `surgeon`, `PRIMARY_ACTOR` (`LEARNER_BODY`); in a place, the surgeon member's `standIn` (`operatorOf`) | 术者, not 主刀 or 外科医生, in team speech; the job is the operating surgeon / 主刀医生 (position `surgeon`) |
| read-back (check-back) | read back; "A needle holder to the surgeon — confirm?" | 复述确认；“持针器递给术者——确认吗？” | message kinds `request` → `readback` → `confirm` (TeamSTEPPS check-back) | |
| escalate | tell the surgeon why ("… hasn't arrived — …") | 上报（向术者说明原因） | message kind `escalate` | always with the reason |
| relief colleague | relief colleague (called by phone) | 顶班同事（电话联系） | scenario `relief` | |
| assistant (at the operating table); hold the traction; let go | assistant — the first or the second ("assistant surgeon" is the first's old name); "Please hold the grasper in port B."; the traction has gone: the window has closed | 助手（第一助手、第二助手）；“请拉住 B 孔的抓钳。”；牵引已松开：术野窗口已闭合 | duty `assist`; `delegate_task hold_traction` / `release_traction`, `operate {op: "hand-over"}` with `actor`, `PortState.holder`, signal `exposure-lost` | the assistant holds with their own hands: when they leave the table, the traction falls |
| assist port (a port's role) | camera port, working port, assist port | 观察孔、操作孔、辅助孔 | port role `camera` / `working` / `assist` | never "assistant" for a port: the assistant (助手) is a person |
| camera holder | camera holder; said: "Camera on the hepatocystic triangle." / "Closer." / "Wider." / "May I clean the lens?" | 扶镜手；说：“镜头对准胆囊三角。”/“推近。”/“拉远。”/“我擦一下镜头可以吗？” | whoever holds the `camera` control and the camera port | never a position: the only assistant in a two-surgeon team, the second assistant in a three-surgeon one, the surgeon where the team says so |
| the camera's view | aim the camera (at a region, or the whole field); closer / wider; the work off the picture (the camera aimed elsewhere); out of frame (working where the close picture is not) | 镜头对准（某个区域，或全视野）；推近 / 拉远；操作不在画面中央（镜头对准别处）；画面外操作（镜头推近时在画面之外操作） | `aim {port, at?}`, `zoom {port, level}`, `ProcedureState.camera`, signal `off-view`, unsafe act `out-of-frame` | the camera holder's steps, or the operator's while nobody holds the camera port |
| pass (an instrument) | said: "Maryland, please." — "Passed." | 递器械；说：“请递分离钳。”——“递好了。” | the `instruments` control | the scrub nurse puts it into the hand of the one who will insert it |
| stand-in surgeon | the colleague who operates while you hold another place: "Dr Ito operates" | 主刀同事：你担任其他岗位时由其主刀（“由伊藤医生主刀”） | the team's surgeon member's `standIn` (`operatorOf`) | 术者 / "the surgeon" still names whoever operates |
| line-up | Team: two surgeons (as reported) / three surgeons (authored) | 团队配置：两名医生（如原报告）/ 三名医生（编写） | `team.lineups`, `start {lineup}` | assistants added to the base team for one encounter; the base team stays as the source reports it |
| call-out (before a critical step) | "Clipping the cystic duct." — answered "No objection" / "Stop" | 关键步骤前告知：“现在夹闭胆囊管。”——答“无异议”/“停” | the surgeon card's protocol: say aloud before a critical step (clip, divide) and wait for objections | said by whoever operates; anyone in the team may answer it |
| standing by | "Dr Mori stands by: you hold his place" | 在旁待命：“森医生在旁待命：由你担任他的岗位” | `standingBy` | the colleague whose place you hold stays in the room and can still be spoken to |
| hand over the anaesthetic (relief) | "I'll hand over first."; "I've taken over the anaesthetic from …"; Anaesthesia handed over at 08:43: … | 麻醉交接；“我先交接。”；“我已从……手里接过麻醉管理。” | `team.cover`, duty `anaesthesia`, a `note` recording it (TEAM.md §5) | an anaesthetised patient is never left without an anaesthetist |
| count; hold on closure | count (closing count); "please hold closure and check the wound"; recount | 清点（关闭前清点）；“请暂停关闭，检查术野”；复点 | `team.count`, `about.hold`, `about.recount`, `CountLedger`; the count record `SessionState.count` (`count` action) | an unresolved count ends with an X-ray before the patient leaves; the count is kept item by item (逐件), never as a bare number |
| count discrepancy; not in the count; set aside | "Count incorrect — 4 of 5 swabs"; "1 not in the count"; "set aside off the field" | 清点不符；“不在清点内”；“移出手术野另放” | count statuses `discrepancy` / `unresolved` / `excluded` / `reconciled`; `missing`, `unexpected`; `transfer` | a swab from another room is not in this count: six of five is a discrepancy, not "correct" |
| unsafe progression | "Closed while the count was not settled: recorded as an unsafe progression for the debrief" | 不安全推进（“在清点未相符时关闭：已记为不安全推进，供复盘”） | `CountRecord.unsafe`, `{ "count": { "unsafe": true } }` | recorded, never erased; not 违规 (a rule broken) — a step taken on an unsafe basis |
| search | Search within reach; Check the wound | 在身边仔细查找；检查术野 | world operation `search` (`targetId`: the patient), concealed items (EMBODIED §8.6) | |
| learner mode / observer mode (team) | I am the surgeon; Observe | 我来当术者；观察 | `team surgeon learner \| simulated` (observer mode = the simulated surgeon) | |
| team pace | Team pace: Auto / Step / Next step | 团队节奏：自动 / 单步 / 下一步 | autonomy `auto` / `step` (`team resume` / `pause` / `step`) | |
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
