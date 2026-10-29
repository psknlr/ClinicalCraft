# ClinicalCraft V5 · 临床方块世界

**An agent framework for LLM-driven virtual patients in a voxel clinical world.**

> **简介** ClinicalCraft V5 是面向医学教育的虚拟病人智能体框架，由单文件体素诊所
> *Virtual Patient V4* 升级而来。病人、家属、护士、影像科与病理科医生、带教上级医师都由
> 智能体扮演，但每一句事实都必须来自病例数据（“先选事实、再组织语言、最后核验”），病例
> 未记录的信息一律回答“没有记录”，绝不补出“正常”。你可以在 3D 体素医院里走动、问诊、查体、
> 开检查、读报告、给药处置，床旁监护仪的生命体征由纯函数生理引擎实时计算；高风险操作需要
> 确认，结束后有可追溯证据的评估与复盘，每个病例写明可测量的学习目标与审核状态。**实景模式**
> （技术名称为具身模式，网页世界默认开启）下，医院是一个无界面、确定性的世界模型：临床操作必须在正确的位置完成——走到床旁、把设备推过来、把病人
> 送去 CT，生命体征只能看屏幕、手测或查病历，化验在病人身边下单，每个职员角色只做本职业
> 范围内的事；智能体可以观察、导航、操作设备、委派护士与护工，并留下可审计的轨迹；
> 临床医生智能体还能做示范接诊。内置 135 个中英双语教学病例（中华病例说原 20 例及新增 105 例）、3 个场馆（含两层的教学医院）、
> 97 种体素设备，以及 41 个具身智能体基准场景；支持 Anthropic Claude、OpenAI、xAI Grok、智谱 GLM / Z.ai、DeepSeek、Kimi、通义千问、
> OpenRouter、Ollama、LM Studio 等模型，**无需任何密钥也能以离线确定性模式完整运行**。同一套
> 运行时还提供终端 REPL、无界面批处理、HTTP 服务和 MCP 服务，可让 Claude Code / Codex /
> Grok CLI 扮演医生，甚至经 `mcp --attach` 进入你正在浏览器里进行的接诊。本项目仅用于教学
> 模拟，不构成医疗建议。具身层的设计与状态见 [docs/EMBODIED.md](docs/EMBODIED.md)
> （中文版：[docs/zh-CN/EMBODIED.md](docs/zh-CN/EMBODIED.md)），中英术语见
> [docs/GLOSSARY.md](docs/GLOSSARY.md)。

ClinicalCraft V5 turns *Virtual Patient V4* (a single-file voxel clinic with
one published case) into a framework: a deterministic clinical simulation
core, grounded LLM-driven patients and staff, an embodied world model in
which agents must walk, look and operate equipment to act, and an agent
runtime whose design borrows from agentic coding CLIs (Claude Code, Codex
CLI, Grok CLI, ZCode) — served through a 3D web world, a terminal REPL,
headless runs, an HTTP server and an MCP server that all speak one protocol.

**Quick links:** [Quick start](#quick-start) ·
[Embodied agents](#embodied-agents) ·
[Architecture & contracts](docs/ARCHITECTURE.md) ·
[Agent protocol](docs/PROTOCOL.md) ·
[Embodied design & status](docs/EMBODIED.md) ([中文](docs/zh-CN/EMBODIED.md)) ·
[Benchmark samples](docs/bench/) ·
[Grounding benchmark](docs/GROUNDING.md) ·
[Case authoring](docs/CASE_AUTHORING.md) ·
[中华病例说 20 例 / CMCR collection](docs/CMCR_CASES.md) ·
[新增 105 例 / Additional CMCR cases](docs/CMCR_105_CASES.md) ·
[Facilities & equipment](docs/FACILITIES.md) ·
[Local assets](docs/ASSETS.md) ·
[Design lineage](docs/DESIGN_PRINCIPLES.md) ·
[Glossary](docs/GLOSSARY.md) ·
[CLI reference](packages/cli/README.md)

## Features

- **Grounded virtual patients.** Free-text conversation (zh-CN or en) with
  the patient, a companion (parent, spouse…), the nurse, radiologist,
  pathologist and a Socratic attending, plus your own Markdown-defined agents.
  The patient pipeline *selects* facts by id (offline matcher, optional LLM
  re-rank over a fact index), *voices* only those facts, then *verifies*
  numbers, drugs and dates against the case and falls back to the authored
  answer. The patient model never sees unrevealed answers, results or the
  diagnosis; unrecorded data stays "not recorded".
- **Interactive clinical work.** History, examination, order entry with
  turnaround times, results and images, interventions, a case board of
  decisions, phases, and a simulated clock. Vitals come from a pure
  physiology engine (baseline, deterioration trends, intervention effects,
  scripted events, alarms, cardiac-arrest rhythms), so every session replays
  exactly. A patient who arrives off the monitor shows only the triage
  readings taken by hand — no live numbers, alarms or rhythm — until the
  learner attaches it.
- **Embodied agents** ([below](#embodied-agents)). In embodied mode — *in-world
  mode* (实景模式) in the learner's interface; the web world's default,
  `--embodied` in the CLI, `start_case {embodied: true}` in MCP — a headless
  world model of the hospital holds every body to where it stands: the same approval gate and engine, plus a spatial gate before and
  after it. Agents observe, navigate, operate equipment through validated
  object actions and verify against authoritative state, with an auditable
  episode trace.
  - **Bedside realism:** one bedside rule for everything; bedside tests need
    the device at the patient (wheel the ECG cart over); laboratory tests are
    ordered at the patient's side, where the sample is taken (or at a records
    terminal once the bloods were drawn); results are read at the patient or
    in the EHR, never off the device; IV drugs need a cannula first.
  - **Vitals channels:** vitals are visible only from the attached monitor's
    screen in its room, by hand at the patient, or in the chart — the same
    check for the monitor panel, the HUD, the REPL status line, the model's
    prompt and MCP; audible alarms are still announced.
  - **Patient transport:** studies done on the patient (CT, MRI, X-ray,
    fluoroscopy, the peak-flow station) need the patient brought there on
    their bed — by the learner, a model or a porter — and back; transfers and
    phases with a location relocate the patient.
  - **Scope of practice:** a nurse, paramedic, porter, receptionist,
    technician or pharmacist may do only what their profession does at the
    bedside; approvals name the staff member who would act.
- **Approvals and scope.** Approval modes (`default`, `strict`, `auto`,
  `plan`, `bypass`), practice scopes (`history-only`, `workup`, `full`) and
  Claude Code-style `tool(specifier)` allow/ask/deny rules gate every
  state-changing action — including the learner's own button presses and
  every device operation with a clinical effect. High-risk interventions
  always ask.
- **Assessment and debrief.** A deterministic rubric over engine state, an
  independent examiner agent for communication items (judged against the
  Calgary–Cambridge guide; it must quote evidence), and an authored debrief
  with the case's learning outcomes; the attending debriefs with PEARLS.
  Scores are formative teaching measures.
- **Demonstration (autopilot).** The clinician agent demonstrates the case
  while the learner watches, with the same tools and approvals (`/autopilot`,
  `exec --autopilot`, `eval`); in embodied mode it walks, fetches equipment
  and transports the patient.
- **Embodied benchmark.** `clinicalcraft bench`: 41 reproducible scenarios
  judged only from the final engine and world state, with spatial and
  authorisation audits and Wilson 95 % intervals; a reference demonstration
  of the full STEMI encounter.
- **Any model, or none.** 13 networked provider templates over two wires (the
  official Anthropic SDK and OpenAI-compatible Chat Completions), per-agent
  model/effort, a server-side key proxy for the browser, and a fully
  **offline** deterministic mode that needs no key.
- **Data-driven content.** 10 bilingual cases, 3 facilities (one with two
  storeys, built from 15 room templates) and 97 voxel equipment types, all
  JSON validated by zod schemas; every case is verified by replaying a
  reference solution and a matcher regression corpus.
- **Agent-CLI ergonomics.** Layered settings and profiles, hooks
  (`SessionStart` … `SessionEnd`, shell commands with JSON on stdin),
  Markdown slash commands and agents, `CLINICALCRAFT.md` project memory with
  `@imports`, JSONL transcripts with `--resume`/`--continue`, headless JSON /
  stream-JSON output and an MCP server ([design lineage](docs/DESIGN_PRINCIPLES.md)).

## Architecture

```
  content (JSON)        cases/<id>/case.json · facilities/*.json · templates/*.json ·   @clinicalcraft/content
                        catalogs/*.json · bench/<suite>/*.json
        │  zod schemas
        ▼
  simulation            parse · reduce() · conditions · physiology · matcher ·          @clinicalcraft/core
  (pure, isomorphic)    assessment · facility helpers — no I/O, no wall clock, seeded PRNG
        │
        ├──────────────▶ embodied world model: collision · navigation · visibility ·    @clinicalcraft/world
        │                spatial policy · perception · action bus · traces (pure, headless)
        ▼
  agent runtime         ClinicalSession ─ approval gate ─ spatial gate ─ hooks ─ tools  @clinicalcraft/agent
                        providers: anthropic SDK │ openai-compatible │ offline │ proxy   (+ /node: settings,
                        Op ──► submit()            events() ──► AgentEvent               memory, transcripts)
        │                          (one protocol for every front-end)
        ├──────────────────┬───────────────────┬──────────────────────┬──────────────────────┐
        ▼                  ▼                   ▼                      ▼                      ▼
  3D web world        terminal REPL      headless exec / -p     HTTP server             MCP server (stdio)
  Vite + three.js     play, cases,       text│json│stream-json, web host, content API,  external agents play
                      providers, config  eval, bench            LLM proxy, world bridge the clinician (or
                                                                                         --attach a live world)
  @clinicalcraft/web  @clinicalcraft/cli @clinicalcraft/cli     @clinicalcraft/server   @clinicalcraft/mcp
                                         (+ @clinicalcraft/bench)
```

| package | what it is |
|---|---|
| [`@clinicalcraft/core`](packages/core/README.md) | zod schemas + the pure, deterministic clinical engine (reducer, conditions, physiology, matcher, assessment, facility helpers, room templates, GLB inspection) |
| [`@clinicalcraft/world`](packages/world/README.md) | the embodied world model: collision, navigation, visibility, semantic registry, spatial policy, perception, device behaviours, action bus, traces — pure and headless |
| [`@clinicalcraft/content`](packages/content/README.md) | built-in cases, facilities, room templates, equipment catalogs, benchmark scenarios and JSON Schemas (data only) |
| [`@clinicalcraft/agent`](packages/agent/README.md) | the runtime: `ClinicalSession`, Op/Event protocol, providers, tools, approval gate, hooks, embodied mode, skills, the world bridge client; `./node` for settings, memory, transcripts and content loading |
| [`@clinicalcraft/bench`](packages/bench/README.md) | the embodied agent benchmark: scenario schema, runner, audits, metrics, reports, reference demonstration |
| [`@clinicalcraft/cli`](packages/cli/README.md) | the `clinicalcraft` binary (alias `cc5`): REPL, `exec`, case and facility tooling, `serve`, `mcp`, `eval`, `bench`, `assets` |
| [`@clinicalcraft/server`](packages/server/README.md) | the HTTP server behind `clinicalcraft serve`: web host, content API, LLM proxy, world bridge routes |
| [`@clinicalcraft/mcp`](packages/mcp/README.md) | the MCP stdio server, headless or attached to a live browser session |
| [`@clinicalcraft/web`](packages/web/README.md) | the 3D voxel world (Vite + three.js) and its UI |

Contracts: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (content model,
engine API, runtime), [docs/PROTOCOL.md](docs/PROTOCOL.md) (`Op` /
`AgentEvent`, tools, agent loop, providers, approval ladder, front-ends,
embodied mode, world bridge) and [docs/EMBODIED.md](docs/EMBODIED.md) (the
embodied layer, its benchmark and an honest status table).

## Quick start

Requires Node.js ≥ 22. No API key is needed.

```bash
npm install

npm run cc -- cases list --lang en              # the case library
npm run cc -- play stemi-inferior-rv --lang en  # terminal REPL (offline)
npm run cc -- play stemi-inferior-rv --embodied --lang en   # the same, embodied (walk to the bedside)
npm run cc                                      # pick a case interactively (zh-CN by default)
npm run dev                                     # 3D world → http://localhost:5173
npm run build                                   # libraries (packages/*/dist) + web world (packages/web/dist)
npm run cc -- serve                             # built web world + API + LLM proxy → http://127.0.0.1:5178
```

`npm run cc -- …` and `npm run dev` run every workspace package from its
TypeScript source (the `source` export condition / Vite aliases), so a fresh
clone needs no build; only `serve` (the built web world) and the built binary
`node packages/cli/dist/bin.js` (bin names `clinicalcraft` and `cc5` when the
package is installed) need `npm run build`. Every command has `--help`; the CLI and sessions
follow `--lang zh-CN|en` (default `zh-CN`).

## Use a language model

```bash
export ANTHROPIC_API_KEY=…                       # or any variable from the table below
npm run cc -- providers list                     # which providers have a key (keys are never printed)
npm run cc -- providers test anthropic           # tiny "Reply with OK" request with latency
npm run cc -- play stemi-inferior-rv --provider anthropic                      # default model claude-opus-5-5
npm run cc -- play smzl-lung-adeno --provider zhipu --model glm-4.6 --lang zh-CN
```

A `--provider` whose key is missing is an error, never a silent fallback to
offline. Model ids change often: any id is accepted, and
`providers models <id>` lists `GET /models` when the vendor supports it.
Capabilities (context window, sampling, reasoning/effort parameters, vision)
come from regex rules on the model id (`MODEL_RULES`).

| id | name | wire | base URL | API key env | default model | browser direct |
|---|---|---|---|---|---|---|
| `anthropic` | Anthropic Claude | `anthropic-messages` | `https://api.anthropic.com` | `ANTHROPIC_API_KEY` | `claude-opus-5-5` | yes |
| `openai` | OpenAI | `openai-chat-completions` | `https://api.openai.com/v1` | `OPENAI_API_KEY` | `gpt-5` | yes |
| `xai` | xAI Grok | `openai-chat-completions` | `https://api.x.ai/v1` | `XAI_API_KEY` / `GROK_API_KEY` | `grok-4.6` | no |
| `zhipu` | 智谱 GLM（开放平台）· Zhipu GLM (BigModel) | `openai-chat-completions` | `https://open.bigmodel.cn/api/paas/v4` | `ZHIPU_API_KEY` / `ZHIPUAI_API_KEY` | `glm-4.6` | no |
| `zai` | Z.ai（智谱国际站）· Z.ai (GLM international) | `openai-chat-completions` | `https://api.z.ai/api/paas/v4` | `ZAI_API_KEY` | `glm-4.6` | no |
| `zhipu-anthropic` | 智谱 GLM（Anthropic 兼容端点） | `anthropic-messages` | `https://open.bigmodel.cn/api/anthropic` | `ZHIPU_API_KEY` / `ZHIPUAI_API_KEY` | `glm-4.6` | no |
| `deepseek` | 深度求索 DeepSeek | `openai-chat-completions` | `https://api.deepseek.com` | `DEEPSEEK_API_KEY` | `deepseek-v4-pro` | no |
| `moonshot` | 月之暗面 Kimi · Moonshot Kimi | `openai-chat-completions` | `https://api.moonshot.cn/v1` | `MOONSHOT_API_KEY` | `kimi-k2.6` | no |
| `moonshot-anthropic` | 月之暗面 Kimi（Anthropic 兼容端点） | `anthropic-messages` | `https://api.moonshot.cn/anthropic` | `MOONSHOT_API_KEY` | `kimi-k2.6` | no |
| `qwen` | 通义千问（百炼 DashScope）· Alibaba Qwen | `openai-chat-completions` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` | `qwen-plus` | no |
| `openrouter` | OpenRouter | `openai-chat-completions` | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | `z-ai/glm-5.3` | yes |
| `ollama` | Ollama（本地 · local） | `openai-chat-completions` | `http://localhost:11434/v1` | none | `qwen3` | yes |
| `lmstudio` | LM Studio（本地 · local） | `openai-chat-completions` | `http://localhost:1234/v1` | none | `local-model` | yes |
| `offline` | 离线 · Offline (deterministic) | `offline` | — | none | `deterministic` | yes |
| `proxy` | 本地服务器代理 · Local server proxy | `proxy` | `/api/llm/stream` | none | — | yes |

Catalogue source: [`packages/agent/src/providers/catalog.ts`](packages/agent/src/providers/catalog.ts).
"Browser direct" means the web world may call the vendor straight from the
page with a key the user types in; otherwise use `proxy` (`clinicalcraft serve`,
`proxy:<provider>` picks the upstream). Add your own OpenAI- or
Anthropic-compatible gateway under `providers` in settings (see below).

## Case library

The original ten scenarios below are joined by the [20-case CMCR collection](docs/CMCR_CASES.md):
published multispecialty reports reconstructed as bilingual, staged historical encounters.
Use the collection filter in the web library to find them. Original PDFs and figures are installed locally.

| id | 标题 | title | specialty | setting | difficulty | clock | facility |
|---|---|---|---|---|---|---|---|
| [`acute-appendicitis`](packages/content/cases/acute-appendicitis/README.md) | 腹痛 · 19岁男性 | Abdominal pain · 19-year-old man | emergency-medicine, general-surgery | emergency | ★★☆☆☆ | simulated | general-hospital |
| [`acute-ischemic-stroke`](packages/content/cases/acute-ischemic-stroke/README.md) | 右侧无力伴言语困难 · 67岁男性 | Right-sided weakness and difficulty speaking · 67-year-old man | neurology, emergency-medicine | emergency | ★★★★☆ | simulated | general-hospital |
| [`anaphylaxis-garden`](packages/content/cases/anaphylaxis-garden/README.md) | 花园蜇伤后呼吸困难 · 30岁女性 | Breathless after a sting in the garden · 30-year-old woman | emergency-medicine, allergy-immunology | community | ★★★☆☆ | simulated | general-hospital |
| [`dka-adult`](packages/content/cases/dka-adult/README.md) | 呕吐、腹痛伴呼吸急促 · 24岁女性 | Vomiting, abdominal pain and fast breathing · 24-year-old woman | emergency-medicine, endocrinology, critical-care | emergency | ★★★☆☆ | simulated | general-hospital |
| [`new-onset-t2dm`](packages/content/cases/new-onset-t2dm/README.md) | 乏力、口干 · 48岁男性 | Tiredness and thirst · 48-year-old man | endocrinology, general-practice, internal-medicine | outpatient | ★★★☆☆ | static | general-hospital |
| [`pediatric-asthma`](packages/content/cases/pediatric-asthma/README.md) | 夜间喘息加重 · 6岁男孩 | Worsening wheeze overnight · 6-year-old boy | pediatrics, emergency-medicine, respiratory | emergency | ★★★☆☆ | simulated | general-hospital |
| [`pulmonary-embolism-postop`](packages/content/cases/pulmonary-embolism-postop/README.md) | 胸痛伴气促 · 52岁女性（术后第3天） | Chest pain and breathlessness · 52-year-old woman (post-op day 3) | acute-medicine, respiratory, general-surgery | inpatient | ★★★★☆ | simulated | general-hospital |
| [`septic-shock-cap`](packages/content/cases/septic-shock-cap/README.md) | 发热、咳嗽伴意识模糊 · 72岁女性 | Fever, cough and confusion · 72-year-old woman | emergency-medicine, critical-care, infectious-disease, respiratory-medicine | emergency | ★★★★☆ | simulated | general-hospital |
| [`smzl-lung-adeno`](packages/content/cases/smzl-lung-adeno/README.md) | 左上腹痛与脾大 · 74岁男性 | Left upper abdominal pain and an enlarged spleen · 74-year-old man | hematology, oncology, pulmonology | outpatient | ★★★★☆ | static | clinic-v4 |
| [`stemi-inferior-rv`](packages/content/cases/stemi-inferior-rv/README.md) | 胸痛 · 58岁男性 | Chest pain · 58-year-old man | emergency-medicine, cardiology | emergency | ★★★☆☆ | simulated | general-hospital |

Titles are deliberately spoiler-free; each case README names the diagnosis
and is written for facilitators. Every case states its learning outcomes —
listed in the debrief, and before play only on request, since they usually
name the diagnosis — and how far its content has been checked
(`provenance.review`): wherever a case is offered it says, for example,
"Editorial review 2026-10-28 · not yet reviewed by a licensed clinician"
([docs/GLOSSARY.md §4](docs/GLOSSARY.md#4-learning-outcomes-and-review-status-where-they-show);
content standard: [CASE_AUTHORING §9](docs/CASE_AUTHORING.md#9-clinical-content-standard)). `smzl-lung-adeno` is the faithful
port of the V4 case, adapted from a published case report; the other nine in the table
are synthetic. The additional 20 CMCR cases are published cases ([docs/CMCR_CASES.md](docs/CMCR_CASES.md)). Write your own with `npm run cc -- cases new <id>` and
[docs/CASE_AUTHORING.md](docs/CASE_AUTHORING.md).

## Facilities and equipment

| facility | contents |
|---|---|
| `clinic-v4` · 临床探索中心 Clinical Discovery Centre | data port of the V4 world: healing garden, one clinic building (consult room, lab, imaging, pathology, corridor, conference area), 7 rooms, 21 placements, 1 patient slot, case board, atlas kiosk, build zone and crafting bench |
| `general-hospital` · 临床方块综合医院 ClinicalCraft General Hospital | ED with triage, resus and cubicles, ambulance bay, outpatient clinic, radiology (X-ray, CT, MRI, PET-CT, cath lab, ultrasound), laboratory, pathology, endoscopy, pharmacy, ward, ICU, operating theatre, conference room, gardens — 37 rooms, 260 placements, 14 patient slots for every case setting, 10 staff |
| `teaching-hospital` · Teaching Hospital (教学医院) | two storeys built from room templates (22 instances + 10 authored rooms): **L0** entrance, lobby with reception, triage, ED (2 resus bays, 2 cubicles, nursing station, store), radiology (CT, X-ray), laboratory, pharmacy (restricted dispensary), outpatient and orthopaedic rooms, ambulance bay; **L1** two 4-bed wards, ICU, teaching room, rehabilitation gym, operating theatre (restricted sterile zone), staff room — main stairs and an elevator, 32 rooms, 283 placements, 17 patient slots, 11 staff (a porter among them). Offered as an alternative for compatible cases |

Three equipment catalogs define **97 equipment types** — `core-furniture` (39),
`core-clinical` (32: monitors, ECG, defibrillator, crash cart, treatment cart, ventilator, a mobile non-invasive ventilator,
infusion pumps, anaesthesia machine, rehabilitation equipment…),
`core-diagnostics` (26: CT, MRI, X-ray, C-arm, PET-CT, ultrasound, analysers,
microscope, flow cytometer, endoscopy tower…) — and `materials` holds the
procedural pixel textures. Each equipment type declares voxel parts,
footprint, capabilities and an interaction (workstation, device, monitor,
board, atlas…), and optionally `portable` (eight carts can be wheeled),
`reach`, `interactionPoints`, a declarative `behavior` (the ECG machine and
the patient monitor) and a GLB `model` (none ships); 15 room templates
compose facilities. Examinations, investigations and interventions require
capabilities present in the facility — the CLI, MCP and agent tools refuse
an item the whole facility lacks, embodied mode also requires the provider
where the body acts (EMBODIED §6), and a facility is offered for a case only
if every objective can be completed there (`facilities validate --all` warns
about the pairs that cannot). See [docs/FACILITIES.md](docs/FACILITIES.md);
`npm run cc -- facilities list`.

## In the REPL

| input | meaning |
|---|---|
| `哪里疼？` / `Where is the pain?` | talk to the current interlocutor (patient by default) |
| `@nurse what are the latest vitals?` | address someone else for one message; `/talk nurse` switches |
| `/ask` · `/ask 3` | list the canonical history questions, or ask one |
| `/exam abdomen` `/order 血常规` `/results` `/read cbc` `/give aspirin` | examine, order, list orders, read a result, give a treatment |
| `/vitals` `/status` `/case` `/plan` `/note …` | monitor, session status, case summary, work-up plan, notes |
| `/board` · `/answer <decision> <option…>` · `/phase` · `/wait 10` | the case board's decisions (e.g. `/answer diagnosis dual` in SMZL), phases, simulated time |
| `/hint` `/consult attending …` | Socratic help (hints count against the score) |
| `/autopilot [goal]` `/finish` `/assess` `/debrief` | demonstration (the clinician agent works the case), finish the case once every objective is complete, assessment (examiner), debrief (with the learning outcomes) |
| `/look` `/where` `/find ecg` `/go patient` `/inspect eq:resus1-ecg` `/use eq:resus1-ecg prepare` `/map` | in-world mode: perceive, walk and operate equipment |
| `/delegate nurse attach_monitor` `/transport eq:ct-scanner` `/skill perform_ecg` | in-world mode: delegate to staff, take the patient to a device (`/transport home` brings them back), run a skill |
| `/model` `/provider` `/approval auto` `/scope workup` `/permissions` `/lang en` | runtime control |
| `/compact` `/export [path]` `/clear` `/quit` | conversation housekeeping |
| `/sbar` `/differential …` `/osce-checklist` | project commands from `.clinicalcraft/commands/*.md` |

Approvals are asked inline (`[y]es / [s]ession / [n]o (reason) / [a]bort`);
with piped stdin the next lines answer them (a next line that is a `/command`
or `@message` denies the request and runs as the next step). Tab completes commands,
arguments and `@roles`; Ctrl-C interrupts a turn, twice exits. Sessions are
recorded and resumable: `npm run cc -- --continue` or `--resume <id>`.

## Headless runs, benchmarks and automation

```bash
# one prompt (Claude Code -p style); the final message goes to stdout
npm run cc -- -p "Where does it hurt?" --case smzl-lung-adeno --lang en

# let the clinician agent work the case and stream every AgentEvent as JSON lines
# (-s keeps npm's "> clinicalcraft cc" banner out of stdout)
npm run -s cc -- exec "Work up this patient" --case septic-shock-cap --autopilot --approval bypass --output-format stream-json

# the same encounter embodied, with its episode trace (JSON Lines spans)
npm run -s cc -- exec "Work up this patient" --case stemi-inferior-rv --embodied --autopilot --approval bypass --output-format json --trace stemi-trace.jsonl

# drive a session yourself: Op JSON lines on stdin
echo '{"type":"slash_command","name":"vitals","args":""}' | npm run -s cc -- exec --case dka-adult --input-format stream-json --output-format stream-json

# autopilot benchmark over every case → Markdown + JSON report (add --embodied for embodied mode)
npm run cc -- eval --cases all --provider offline --out eval-report.md
```

Headless runs never approve silently: in `default`, `strict` and `plan`
modes every approval request is denied (`headless: approval required`), the
agent is told and adapts, and the denial is listed in `permission_denials`.
`--approval auto` approves low- and moderate-risk requests but still denies
always-ask, high-risk and ask-rule ones (thrombolysis…) unless you also pass
`--approve-high-risk`. That is why the autopilot example passes `--approval
bypass` (unsafe outside benchmarks) — otherwise the clinician cannot give
every treatment, and an autopilot that ends with the case incomplete exits
with subtype `error_incomplete`. `eval` runs with `bypass` by default. Exit
codes: 0 success, 1 error, 2 usage error, 3 `--max-turns` reached, 4
autopilot ended with the case incomplete. Full flag reference:
[packages/cli/README.md](packages/cli/README.md).

## Embodied agents

In **embodied mode** the encounter happens in a headless, deterministic world
model of the facility (`@clinicalcraft/world`): bodies have poses, rooms and
doors; equipment has places, reach, states and reservations; staff walk.
The clinical tools stay the same, but each is held to where the acting body
stands — before the approval gate and again right before the engine
commits — and a refusal says where to go (`hint.goal`) and what to do there
(`hint.then`: wheel the cart over, take the patient to the scanner, wash
your hands). World tools let an agent observe, find, walk, operate equipment
(the ECG cart's prepare → connect → record → reset, the monitor's attach),
transport the patient, delegate to staff and run declarative skills; every
device operation with a clinical effect runs the clinical tool through the
same gate, so a deny rule also stops a device that would give the drug.
Walking costs simulated time. Clinical mode is unchanged and remains
available. Design, rules, measurements and an honest status table
(implemented / tested / validated / production-ready — nothing is
production-ready, and no live model has been run through these tools yet):
[docs/EMBODIED.md](docs/EMBODIED.md) · [中文](docs/zh-CN/EMBODIED.md).

**Where to run it**

- **Web world** — embodied by default. "In-world mode" (实景模式) on the
  case-start card (or under *Agents & permissions* in the pause menu) picks
  the mode of the next encounter; the HUD badge reads "In-world · ‹place›".
  Walk with `WASD`; a refusal shows the reason and "Go there"; the monitor
  panel shows the live screen only where you can read it; staff walk when you
  delegate; in a demonstration the clinician agent walks, wheels carts and
  transports the patient.
- **CLI** — `--embodied` on `play`, `exec` and `eval`; the REPL adds `/look`,
  `/where`, `/find`, `/go`, `/inspect`, `/use`, `/map`, `/skill`,
  `/delegate` and `/transport`, and the status line names your room:

  ```bash
  npm run cc -- play stemi-inferior-rv --embodied --lang en     # then: /go patient · /look · /delegate nurse attach_monitor
  npm run -s cc -- exec "Work up this patient" --case stemi-inferior-rv --embodied --autopilot --approval bypass --trace stemi-trace.jsonl
  ```

- **MCP** — `start_case {"case_id": …, "embodied": true}` (or start the
  server with `clinicalcraft mcp --embodied`) gives your MCP client a body in
  a headless world of its own: 17 world tools next to the clinical ones, and
  a refusal's `data.hint.goal` to pass to `navigate_to` (see
  [MCP](#mcp-let-claude-code-codex-or-grok-cli-play-the-clinician)).

**The embodied benchmark** — `clinicalcraft bench` measures embodied agents
headless and reproducibly: 41 scenarios in
`packages/content/bench/embodied-v1` (perception, spatial reasoning,
navigation, device interaction, clinical workflows — one per built-in case
plus the full STEMI encounter —, recovery, multi-agent delegation and
safety), fixed seeds, a fresh session per run, success judged only from the
final engine and world state (never from what the agent says), with
independent spatial-rule and authorisation audits and Wilson 95 % intervals.

```bash
npm run -s cc -- bench list
npm run -s cc -- bench run --suite embodied-v1 --agent reference      # must be 100 % (infrastructure)
npm run -s cc -- bench run --suite embodied-v1 --agent scripted-llm   # must be 100 % (model tool path)
npm run -s cc -- bench run --agent llm --provider anthropic --model <model> --live --max-tokens 2000000 --scenario workflow-pe-ctpa --seeds 1
```

`reference` and `scripted-llm` validate the infrastructure, not clinical
reasoning, and run in CI (123 / 123 runs each, no accepted spatial or
authorisation violation). A live model (`--agent llm`) runs only with
`--live` and a spending cap (`--max-tokens`; `--max-usd` only for a model
with a catalogue price), needs a configured API key and refuses to run in
CI; no live run has been recorded yet. Reports: `bench-report.json` +
`bench-report.md`; samples in [docs/bench/](docs/bench/); scenario catalogue,
metric definitions and the live-run checklist in
[docs/EMBODIED.md §13](docs/EMBODIED.md#13-benchmark).

**The grounding benchmark** — `bench grounding` measures the deterministic
layer under every agent, offline: what the patient reveals for a question,
which item `examine` / `order_test` / `intervene` act on for a free-text or
guessed-id argument, how the patient router classifies an utterance, and
whether the voice grounding check blocks a fabricated reply. Suite
`grounding-v1` (`packages/content/grounding/`): 1,519 items over the ten
cases in both languages, including a `negation` slice ("hold the heparin"
must never give heparin), with a `dev` split for tuning and a held-out `test`
split pinned by digest. Held-out test: 79.0 % at baseline, 88.1 % after
the changes tuned on dev (the router generalised least: 100 % on dev, 54 %
on test). Method, honesty protocol and results:
[docs/GROUNDING.md](docs/GROUNDING.md).

```bash
npm run -s cc -- bench grounding --split dev --lang en
npm run -s cc -- bench grounding --split test --failures 0 --compare grounding-results/before/grounding-report.json
```

**The reference demonstration** — `bench demo` works the full embodied STEMI
encounter headless with the reference clinician and writes `trace.jsonl` and
`demo.md`: for every step, Observation → Plan → Navigation → Object
interaction → Approval → Clinical action → State change → Verification, with
span ids, world and target versions, action ids and clinical event ids. It
passes only if the authoritative state confirms every step (samples:
[English](docs/bench/demo.en.md), [中文](docs/bench/demo.zh-CN.md)).

```bash
npm run -s cc -- bench demo --case stemi-inferior-rv --lang zh-CN --out bench-demo
```

### Connect Claude Code / Codex / Grok CLI to a live world (`mcp --attach`)

`clinicalcraft mcp --attach <server>` gives your agent the same clinical and
world tools, but in an encounter **you** are playing in the browser — you
watch the avatar walk and act, and you answer every approval. It is paired
with one encounter by the live-session id and the attach key that encounter
shows you; it never picks a session by itself.

1. Build and serve the world (once):

   ```bash
   npm run build
   npm run cc -- serve        # http://127.0.0.1:5178 (loopback; see "Web world and server" for tokens)
   ```

2. Open http://127.0.0.1:5178, start an encounter, press `Esc` and switch on
   **Allow an external agent to control this session** (off by default, for
   this encounter only, never saved). The **External agent** badge in the
   HUD shows the live-session id (`ls_…`) and the attach key (`ak_…`), each
   with a Copy button, the calls running and **Disconnect**.

3. Save the key where only you can read it, then register the MCP server for
   this session — run from the repository root (replace `ls_…` with the id
   from the badge):

   ```bash
   mkdir -p ~/.clinicalcraft && (umask 077; printf '%s\n' 'ak_…paste the key…' > ~/.clinicalcraft/attach-key)

   # Claude Code
   claude mcp add clinicalcraft-live -- node "$PWD/packages/cli/dist/bin.js" mcp --attach http://127.0.0.1:5178 --world-session ls_… --attach-key-file ~/.clinicalcraft/attach-key --cwd "$PWD"
   # Codex CLI
   codex mcp add clinicalcraft-live -- node "$PWD/packages/cli/dist/bin.js" mcp --attach http://127.0.0.1:5178 --world-session ls_… --attach-key-file ~/.clinicalcraft/attach-key --cwd "$PWD"
   # Grok CLI
   grok mcp add clinicalcraft-live --transport stdio --command node --args "$PWD/packages/cli/dist/bin.js" mcp --attach http://127.0.0.1:5178 --world-session ls_… --attach-key-file ~/.clinicalcraft/attach-key --cwd "$PWD"
   ```

   Instead of the flags, the MCP server's environment may carry
   `CLINICALCRAFT_WORLD_SESSION` and `CLINICALCRAFT_ATTACH_KEY` (e.g.
   `claude mcp add clinicalcraft-live -e CLINICALCRAFT_ATTACH_KEY=ak_… -e CLINICALCRAFT_WORLD_SESSION=ls_… -- node …/bin.js mcp --attach http://127.0.0.1:5178`).
   Never put the key on the command line of a shared machine (the process
   list). A new opt-in makes a new id and key: `claude mcp remove
   clinicalcraft-live` and add it again. Without a session id or a key the
   command exits with a usage error.

The agent calls `navigate_to`, `interact_object`, `examine`, `intervene`… as
the clinician, through the session's own approval gate: an action that needs
approval appears in your approval dialog, labelled **External agent** — the
agent cannot approve its own requests (attach mode has no `confirm`) and a
denial comes back as `status: "denied"`. Everything the live session returns
reaches the agent marked as simulation data, not instructions. Calls time out
after 120 s (`--timeout`) and are cancelled in the browser when the client
cancels them. The autopilot is unavailable while external control is on.
Disconnecting (the badge), turning the switch off, leaving or finishing the
encounter, another case or closing the tab ends it — the agent's next call
reports `session_closed`. A server with an access token needs it here too:
`--token-file <path>` or `CLINICALCRAFT_SERVER_TOKEN` in the MCP server's
environment — never in the URL. Routes, message shapes and the security
model: [docs/PROTOCOL.md §13](docs/PROTOCOL.md).

## MCP: let Claude Code, Codex or Grok CLI play the clinician

`clinicalcraft mcp` is a stdio MCP server with 34 tools: 17 for the clinical
encounter (`list_cases`, `start_case`, `ask_patient`, `examine`,
`order_test`, `read_result`, `intervene`, `answer_decision`, `finish_case`,
`get_debrief`, …) and 17 world tools for embodied sessions (`observe_world`,
`navigate_to`, `interact_object`, `transport_patient`, `delegate_task`,
`execute_skill`, …), each with MCP annotations, plus resources for the case
library and each session's state and transcript. Build once
(`npm run build:lib`), then register it with an absolute path — run these
from the repository root:

```bash
# Claude Code
claude mcp add clinicalcraft -- node "$PWD/packages/cli/dist/bin.js" mcp --cwd "$PWD"

# Codex CLI
codex mcp add clinicalcraft -- node "$PWD/packages/cli/dist/bin.js" mcp --cwd "$PWD"

# Grok CLI (stdio transport; see `grok mcp add --help` for your version's flags)
grok mcp add clinicalcraft --transport stdio --command node --args "$PWD/packages/cli/dist/bin.js" mcp --cwd "$PWD"
```

Or in Codex's `~/.codex/config.toml` (any MCP client that launches a stdio
server takes the same command and arguments):

```toml
[mcp_servers.clinicalcraft]
command = "node"
args = ["/path/to/ClinicalCraft/packages/cli/dist/bin.js", "mcp", "--cwd", "/path/to/ClinicalCraft"]
```

MCP sessions default to approval mode `auto` (any settings layer that sets
`approvalMode` wins): low- and moderate-risk actions run, while high-risk and
always-ask ones (thrombolysis…) and ask rules need a two-step confirmation —
the first call returns an error explaining the risk, and the client calls
again with `"confirm": true` once its user agreed (inside a world operation
the confirmation is bound to the act it named). `--approval bypass` drops
that step (unsafe; for unattended benchmarks only). `--provider`/`--model`
choose the models behind the patient and staff (offline by default). To act
in a live browser encounter instead, see
[`mcp --attach`](#connect-claude-code--codex--grok-cli-to-a-live-world-mcp---attach).

## Configuration

Settings are layered like Claude Code / Codex (later wins):

`~/.clinicalcraft/settings.json` (user) < `.clinicalcraft/settings.json`
(project, shared) < `.clinicalcraft/settings.local.json` (personal,
git-ignored) < environment < CLI flags < `--profile <name>` (`profiles.<name>`).
`npm run cc -- config path` shows the files, `config get [key]` the resolved
values and `config set <key> <value> [--user|--project|--local]` writes one
(user settings are written with mode 0600). JSON Schema:
[`packages/content/schemas/settings.schema.json`](packages/content/schemas/settings.schema.json).

```json
{
  "provider": "anthropic",
  "model": "claude-opus-5-5",
  "locale": "en",
  "approvalMode": "default",
  "practiceScope": "full",
  "embodiment": "embodied",
  "agents": {
    "patient":  { "provider": "zhipu", "model": "glm-4.6", "effort": "low" },
    "examiner": { "effort": "high" }
  },
  "providers": {
    "my-gateway": { "wire": "openai-chat-completions", "baseUrl": "https://llm.example.edu/v1", "apiKeyEnv": ["SCHOOL_LLM_KEY"], "defaultModel": "glm-4.6" }
  },
  "permissions": { "ask": ["intervene(alteplase*)"], "deny": [] },
  "profiles": { "osce": { "approvalMode": "strict" }, "benchmark": { "approvalMode": "bypass" } }
}
```

| key | default | |
|---|---|---|
| `provider`, `model`, `effort` | `offline`, template default, — | active provider/model; `effort` low…max where the model supports it |
| `agents.<name>` | — | per-agent `provider`, `model`, `effort`, `temperature`, `maxTokens`, `maxToolRounds` |
| `providers.<id>` | — | override a template or add one (`wire`, `baseUrl`, `apiKeyEnv`, `headers`, `defaultModel`, `timeoutMs`, `maxRetries` — retries of every model call of a session); a literal `apiKey` is honoured only from user settings, or from the local settings of a trusted project (`clinicalcraft trust`) — never from a project file |
| `locale` | `zh-CN` | `zh-CN` or `en` |
| `approvalMode`, `practiceScope` | `default`, `full` | see below |
| `embodiment`, `perception` | `clinical`, world defaults | `embodied` runs encounters in the world model — in-world mode to learners (CLI `--embodied`; the web world's own default is embodied); `perception` tunes `visibilityRange`, `fovDeg`, `nearbyRange`, `maxEntities`, `reachability` |
| `permissions.allow/ask/deny` | `[]` | rules such as `order_test(*)`, `examine`, `intervene(alteplase*)` (arrays concatenate across layers) |
| `hooks` | `{}` | see [Hooks](#hooks) |
| `maxToolRounds`, `autoCompact` | `12`, on at 120 000 tokens | agent loop limits |
| `contentDirs` | `[]` | extra directories holding `cases/<id>/case.json`, `facilities/`, `templates/`, `catalogs/`; a relative entry resolves against the directory of the settings file that lists it (from `.clinicalcraft/settings.json`, write `"../content"` for `<project>/content`); `clinicalcraft serve` also offers them to the web library |
| `defaultCase`, `defaultFacility` | — | |
| `transcripts` | `{enabled: true}` | JSONL rollouts in `~/.clinicalcraft/sessions/YYYY/MM/DD/` |
| `patient.pipeline`, `.strictGrounding`, `.offlineFallback` | `select-voice`, `true`, `true` | `tool` lets the patient model call `reveal_facts` itself |
| `server.host`, `.port`, `.token` | `127.0.0.1`, `5178`, — | for `clinicalcraft serve` |

Environment: `CLINICALCRAFT_PROVIDER`, `CLINICALCRAFT_MODEL`,
`CLINICALCRAFT_LOCALE`, `CLINICALCRAFT_APPROVAL`, `CLINICALCRAFT_SCOPE`,
`CLINICALCRAFT_PROFILE`; `CLINICALCRAFT_HOME` moves `~/.clinicalcraft`
(settings, sessions, REPL history, local assets, trusted projects); provider
keys as in the table above; `NO_COLOR` / `FORCE_COLOR`.

| approval mode | none/low risk | moderate | high | inspired by |
|---|---|---|---|---|
| `default` | allow | ask | ask | Claude Code default · Codex on-request |
| `strict` | ask | ask | ask | Codex untrusted (OSCE) |
| `auto` | allow | allow | ask | Claude Code acceptEdits |
| `plan` | state-changing tools denied; the agent proposes instead | | | Claude Code plan mode |
| `bypass` | allow | allow | allow | headless benchmarks |

The ladder, first match wins: practice scope → deny rules → plan mode →
read-only tools (allowed) → high-risk interventions (always ask unless
`bypass`) → ask rules → "approved for this session" → allow rules → the mode
table above. Practice scope removes tools outright: `history-only` (talk,
examine, vitals, decisions), `workup` (+ orders, results, consults,
waiting), `full` (+ interventions). In embodied mode the spatial gate and the
acting body's scope of practice come first, so an act that cannot be done
there — or by that body — asks nobody.

**Memory, commands and agents.** `CLINICALCRAFT.md` files (user
`~/.clinicalcraft/`, project root or `.clinicalcraft/`, and every directory
down to the cwd; `AGENTS.md` as a fallback) are injected into the attending,
examiner, clinician and custom non-NPC agents — never into the patient or
companion — with `@path` imports. Markdown slash commands live in
`.clinicalcraft/commands/*.md` (frontmatter `description`, `argument-hint`,
`agent`; `$ARGUMENTS`, `$1…$9`) and agent profiles in
`.clinicalcraft/agents/*.md` (see the example `pharmacist.md`); both also
load from `~/.clinicalcraft/`. Project skills (`.clinicalcraft/skills/*.json`,
embodied mode) load only from a trusted project.

## Hooks

Hooks run on `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`,
`ClinicalEvent`, `Notification`, `PreCompact`, `Stop` and `SessionEnd` — as
in-process functions (`session.hooks.on(…)`, browser and Node) or as shell
commands from settings (Node). They are loaded only from settings, never from
case content. Command hooks in a project's `.clinicalcraft/settings.json` or
`settings.local.json` (like those below) run only after you trust the project
with `clinicalcraft trust`; trust is pinned to the files' contents, so any
change to either file needs a fresh `clinicalcraft trust` (until then the
hooks are dropped and stderr says so).

```json
{
  "hooks": {
    "PreToolUse":    [{ "matcher": "intervene", "hooks": [{ "type": "command", "command": "node .clinicalcraft/hooks/double-check-high-risk.mjs", "timeout": 10 }] }],
    "ClinicalEvent": [{ "matcher": "objective\\.completed|case\\.finished", "hooks": [{ "type": "command", "command": "node .clinicalcraft/hooks/log-progress.mjs" }] }]
  }
}
```

A command hook receives one JSON object on stdin (`hook_event_name`,
`session_id`, `case_id`, `locale`, `approval_mode`, … plus `tool_name` /
`tool_input`, `event`, `prompt` depending on the event) and runs with the
project as cwd and `CLINICALCRAFT_PROJECT_DIR` set. Exit 0 → success (stdout
may be JSON `{decision: "block"|"approve", reason, additionalContext,
updatedInput}`); exit 2 → block, stderr is the reason; anything else is a
non-blocking warning. The matcher is a tool name for tool events, the domain
event type for `ClinicalEvent` (`a|b` lists match exactly, anything else is a
regex). What each output may change, and why hook context never reaches the
patient: [docs/PROTOCOL.md §6.1](docs/PROTOCOL.md). Examples:
[`.clinicalcraft/settings.example.json`](.clinicalcraft/settings.example.json),
[`.clinicalcraft/hooks/`](.clinicalcraft/hooks/).

## Web world and server

`npm run dev` serves the 3D world from source at http://localhost:5173
(offline by default; switch to a direct key in Settings → LLM).
`npm run cc -- serve` hosts the **built** world (`npm run build` first) with
the content API, the LLM proxy and the world bridge at http://127.0.0.1:5178,
so the browser can use your server-side keys (`proxy` mode) and an external
agent can join a live encounter (`mcp --attach`). It binds to loopback;
binding another host requires an access token of at least 16 characters
(`CLINICALCRAFT_SERVER_TOKEN`, `--token-file` or `--token`; open `/?token=…`
once in the browser — it sets a cookie and drops the token from the URL). It
speaks plain HTTP: put it behind a TLS proxy for anything but loopback.
Controls: `WASD` move, mouse look, `E` interact, `T` talk, `V` monitor,
`J` journal, `M` map, `Esc` pause. Details: [packages/web/README.md](packages/web/README.md),
[packages/server/README.md](packages/server/README.md).

### Standalone single file

```bash
npm run build:standalone                          # → packages/web/dist-standalone/ClinicalCraft.html
npm run build:standalone -- --no-local-assets     # redistributable: without local-only assets
```

One offline HTML file (no server, no network, offline responders only). If
`assets/local/` exists at build time the copyrighted V4 figures, PDF and
anatomy model are embedded and the file is for **your own local teaching use
only**; the build directory is git-ignored.

## Local assets (`import-v4`)

The SMZL case's seven figures and source PDF (© their rights holders) and
the 25 MB anatomy model are never committed. Install them from your own copy
of *Virtual Patient V4* — the merged HTML, its `.part01`/`.part02` files, or
the two zip archives:

```bash
npm run cc -- import-v4 "Virtual_Patient_V4(1).html"
npm run cc -- import-v4 Virtual_Patient_V4_Part1.zip Virtual_Patient_V4_Part2.zip --dest assets/local
```

The default destination is `~/.clinicalcraft/assets`; `assets/local/` (in a
checkout, git-ignored) is searched first. Every front-end serves them at
`/local-assets/…`; without them the case stays fully playable and the UI
shows placeholders. Equipment GLB models use the same local-only scheme and
`npm run cc -- assets inspect <file.glb> [--type <equipment type>]` checks
one before use. See [docs/ASSETS.md](docs/ASSETS.md).

## Development

```bash
npm run typecheck        # tsc -b for the libraries (also emits dist/) + web tsc --noEmit
npm test                 # vitest, every package (workspace packages from source)
npm run cc -- cases validate --all --strict && npm run cc -- cases verify --all   # --strict: a content-lint warning fails too
npm run cc -- facilities validate --all
npm run -s cc -- bench run --agent reference && npm run -s cc -- bench run --agent scripted-llm
npm run test:e2e         # Playwright, web world (Chromium with SwiftShader WebGL)
npm run schemas          # regenerate packages/content/schemas/*.schema.json (--check: npx tsx scripts/gen-json-schemas.ts --check)
npm run clean            # remove dist/ and build info
```

Contributor conventions (ESM `NodeNext` with `.js` imports, no I/O in core or world,
bilingual strings, grounding rules) are in [AGENTS.md](AGENTS.md) /
[CLAUDE.md](CLAUDE.md); the words of both languages are in
[docs/GLOSSARY.md](docs/GLOSSARY.md). Further reading: [Architecture & contracts](docs/ARCHITECTURE.md) ·
[Agent protocol](docs/PROTOCOL.md) · [Embodied agents](docs/EMBODIED.md) ·
[Design principles & lineage](docs/DESIGN_PRINCIPLES.md) ·
[Case authoring](docs/CASE_AUTHORING.md) · [Facilities & equipment](docs/FACILITIES.md) ·
[Local assets](docs/ASSETS.md).

## Safety and scope

ClinicalCraft is an educational simulation, not a medical device, and nothing
in it is medical advice. The nine synthetic cases are fictional, with
pseudonymous patients. The SMZL case is adapted from a published,
de-identified case report: 丁凤丽, 秦彩霞, 汪家吉. 伴t(4;12)(q23;q13)易位合并肺腺癌的脾边缘区淋巴瘤1例.
中国临床案例成果数据库, 2026. DOI [10.3760/cma.cmcr20260128-00421](https://doi.org/10.3760/cma.cmcr20260128-00421).
The 20 CMCR cases are teaching adaptations of published case reports, with pseudonyms, relative times and no
figure or PDF that identifies a patient; the reports remain © their publishers and are not distributed here
([docs/CMCR_CASES.md](docs/CMCR_CASES.md), Privacy).
Agents may state only facts present in the case data. Scores and debriefs
are formative teaching measures, not validated competency assessments. A
case's `provenance.review` says how far its content has been checked; an
editorial review — the most any built-in case records — is not a review by a
licensed clinician: have a clinician of the specialty review a case before
teaching with it. The
embodied rules (bedside, scope of practice) are teaching simplifications,
not any jurisdiction's regulations, and no part of the system is
production-ready ([docs/EMBODIED.md §14](docs/EMBODIED.md#14-status-limitations-and-what-production-needs)).

## Credits and licences

- **Code:** MIT (see `package.json`). All code is original; designs were
  inspired by Claude Code (Anthropic; documented behaviour only), Codex CLI
  (OpenAI, Apache-2.0), Grok CLI (MIT) and ZCode (Z.ai, Apache-2.0) — no
  source was copied. Embodied-agent designs referenced Mineflayer,
  mineflayer-pathfinder, Voyager, AI2-THOR and VirtualHome (concepts only;
  no code or dependency).
- **Predecessor:** *Virtual Patient V4* (临床方块世界), whose world, look and
  first case are ported here.
- **Runtime dependencies:** three.js (MIT), Anthropic TypeScript SDK (MIT),
  zod (MIT). **Development:** TypeScript and Playwright (Apache-2.0), Vite,
  Vitest and tsx (MIT), zod-to-json-schema (ISC).
- **Local-only assets (not in this repository):** anatomy model from
  Z-Anatomy / BodyParts3D (CC BY-SA 4.0, attribution kept); the SMZL case
  figures and paper © their rights holders, local teaching use only.
