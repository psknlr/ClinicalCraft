# ClinicalCraft V5 · 临床方块世界

**An agent framework for LLM-driven virtual patients in a voxel clinical world.**
**面向大模型虚拟病人的临床教学智能体框架 —— 体素诊所 · 真实病例 · 可交互操作。**

ClinicalCraft V5 upgrades *Virtual Patient V4* (a single-file voxel clinic with
one published case) into a professional framework:

- 🧠 **Agent runtime** borrowing the best ideas of Claude Code, Codex CLI, Grok CLI
  and ZCode — an `Op → Event` protocol, approval modes and permission rules,
  hooks, slash commands, Markdown sub-agents, `CLINICALCRAFT.md` memory, JSONL
  session transcripts, headless/JSON mode and an MCP server
  ([design lineage](docs/DESIGN_PRINCIPLES.md)).
- 🗣️ **Grounded virtual patients** — free-text conversation with patients,
  companions, nurses, radiologists, pathologists and a Socratic attending. A
  need-to-know *select → voice* pipeline plus a grounding verifier keeps every
  stated fact inside the case file; missing information stays "not recorded".
- 🔌 **Multi-provider LLM control** — Anthropic Claude (official SDK), OpenAI,
  xAI Grok, Zhipu GLM / Z.ai, DeepSeek, Moonshot Kimi, Qwen, OpenRouter, Ollama,
  LM Studio — per-agent model selection, server-side key proxy, and a fully
  **offline** deterministic mode that needs no API key.
- 🩺 **Interactive clinical actions** — history, examination, order entry,
  results, interventions with a pure physiology engine (live bedside monitor,
  alarms, deterioration and recovery), decisions on an evidence board, and an
  assessment/debrief. Risky interventions require confirmation.
- 📚 **Case library** — the original SMZL + lung adenocarcinoma case (faithful
  port) plus new bilingual teaching cases across emergency medicine,
  cardiology, infectious disease, endocrinology, surgery, paediatrics,
  neurology, allergy and pulmonology. Cases are data (`case.json`), validated
  by schema and verified by replaying a reference solution.
- 🏥 **Data-driven environments** — facilities, rooms and ~100 types of
  realistic voxel equipment (CT, MRI, X-ray, ultrasound, analysers, monitors,
  defibrillators, ventilators, operating theatre…). Ships the V4 clinic and a
  multi-department general hospital.

## Quick start

```bash
npm install
npm run dev                         # 3D world → http://localhost:5173 (offline mode)
npm run cc -- play smzl-lung-adeno  # terminal REPL
npm run cc -- --help
```

Optional: install the V4 figures/PDF and the 3D anatomy model from your own
copy of Virtual Patient V4 (they are never committed — see [docs/ASSETS.md](docs/ASSETS.md)):

```bash
npm run cc -- import-v4 Virtual_Patient_V4_Part1.zip Virtual_Patient_V4_Part2.zip --dest assets/local
```

### Use an LLM

```bash
export ANTHROPIC_API_KEY=...        # or OPENAI_API_KEY / XAI_API_KEY / ZHIPU_API_KEY / DEEPSEEK_API_KEY …
npm run cc -- play stemi-inferior-rv --provider anthropic            # default model claude-opus-5-5
npm run cc -- play smzl-lung-adeno --provider zhipu --model glm-4.6 --lang zh-CN
npm run cc -- serve                  # web world + LLM proxy (keys stay on the server)
```

Per-agent models in `.clinicalcraft/settings.json`:

```json
{ "provider": "anthropic", "agents": { "patient": { "provider": "zhipu", "model": "glm-4.6", "effort": "low" } } }
```

### Headless, automation & other agents

```bash
# Let the clinician agent work a case and emit JSON events (Claude Code -p / codex exec style)
npm run cc -- exec "Work up this patient" --case septic-shock-cap --autopilot --output-format stream-json

# Benchmark: run the autopilot over every case
npm run cc -- eval --cases all --provider offline --out eval-report.md

# Expose the clinic to Claude Code / Codex / Grok CLI as an MCP server
claude mcp add clinicalcraft -- npx tsx packages/cli/src/bin.ts mcp
```

## In the REPL

| input | meaning |
|---|---|
| `哪里疼？` / `Where is the pain?` | talk to the current interlocutor (patient by default) |
| `@nurse what are the latest vitals?` | address another agent |
| `/exam abdomen` `/order 血常规` `/read cbc` `/give aspirin` | clinical actions |
| `/vitals` `/status` `/board` `/answer diagnosis dual` `/hint` | state, decisions, hints |
| `/autopilot` `/assess` `/debrief` | clinician agent, assessment |
| `/model` `/provider` `/approval auto` `/scope workup` `/lang en` | runtime control |
| `/sbar`, `/differential` | project commands from `.clinicalcraft/commands/*.md` |

## Configuration (layered like Claude Code / Codex)

`~/.clinicalcraft/settings.json` < `.clinicalcraft/settings.json` <
`.clinicalcraft/settings.local.json` < env (`CLINICALCRAFT_PROVIDER`, `_MODEL`,
`_LOCALE`, `_APPROVAL`, `_SCOPE`) < CLI flags < `--profile`.
Approval modes: `default` (ask for moderate/high-risk actions), `strict`,
`auto`, `plan` (read-only, propose instead), `bypass` (benchmarks).
Hooks (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`,
`ClinicalEvent`, `Notification`, `PreCompact`, `Stop`, `SessionEnd`) run
in-process or as shell commands (JSON on stdin, exit 2 blocks).
See [.clinicalcraft/settings.example.json](.clinicalcraft/settings.example.json).

## Documentation

- [Architecture & contracts](docs/ARCHITECTURE.md) · [Agent protocol](docs/PROTOCOL.md)
- [Design principles & lineage](docs/DESIGN_PRINCIPLES.md)
- [Case authoring](docs/CASE_AUTHORING.md) · [Facilities & equipment](docs/FACILITIES.md) · [Local assets](docs/ASSETS.md)

## Safety & scope

ClinicalCraft is an educational simulation. Synthetic cases are fictional;
the SMZL case is adapted from a published, de-identified case report
(丁凤丽, 秦彩霞, 汪家吉, 2026, DOI 10.3760/cma.cmcr20260128-00421). Scores are
formative teaching measures, not validated competency assessments. Nothing
here is medical advice.

## Licence & credits

Code: MIT. Anatomy model: Z-Anatomy / BodyParts3D (CC BY-SA 4.0), installed
locally. Original case figures and paper: © their rights holders, local
teaching use only. three.js (MIT), Anthropic TypeScript SDK (MIT), zod (MIT).
Design inspiration: Claude Code (Anthropic), Codex CLI (OpenAI, Apache-2.0),
Grok CLI (MIT), ZCode (Z.ai, Apache-2.0) — no source code copied.
