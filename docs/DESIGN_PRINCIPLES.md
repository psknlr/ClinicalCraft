# Design principles & lineage

ClinicalCraft V5 is an agent framework for clinical simulation. Its runtime
design deliberately borrows proven patterns from four agentic coding tools.
**All ClinicalCraft code is original**: patterns were re-implemented, no source
was copied. Licences of the inspirations: Grok CLI (MIT), Codex CLI
(Apache-2.0), ZCode by Z.ai/Zhipu (first-party code Apache-2.0), Claude Code
(proprietary — only its documented behaviour informed this design).

## 1. What each tool contributed

| Dimension | Grok CLI | Codex CLI | ZCode | Claude Code | **ClinicalCraft** |
|---|---|---|---|---|---|
| Agent loop | `--max-tool-rounds`, one async-generator turn engine | sample → tools → `needs_follow_up`; cancellation token | explicit `TurnPhase` state machine | gather → act → verify; read-only tools in parallel | `runAgentTurn` with per-agent round caps, `turn_phase` events driving UI affordances (thinking bubble, confirm dialog) |
| Front-end decoupling | shared stream type | **`Op` / `EventMsg` SQ/EQ protocol**, core never prints | contracts + RPC + local web server | SDK `query()` stream | `Op` → `ClinicalSession` → `AgentEvent`; web world, REPL, exec, HTTP server and MCP are all protocol clients |
| Providers | OpenAI-compatible client, `GROK_BASE_URL`, model catalogue | `[model_providers]` with `wire_api` | **data-driven provider catalogue**, regex model rules, 3 wire types, retry taxonomy | model + fallback chain, per-agent model/effort | `PROVIDER_TEMPLATES` (zh-CN/en names) + `MODEL_RULES`; wires `anthropic-messages` (official SDK) and `openai-chat-completions` (fetch); `offline` and `proxy` |
| Permissions | 4-option confirm incl. "don't ask again this session" | `approved / approved_for_session / denied / abort`; sandbox modes | **ordered ladder with stable rule ids**, risk levels, `alwaysAsk` | permission modes; `Tool(specifier)` allow/ask/deny rules | `approvalMode` (default/strict/auto/plan/bypass) × `practiceScope` (history-only/workup/full); rule ids in every `approval_request`; high-risk interventions always ask |
| Instructions | `GROK.md` | `AGENTS.md` discovery under a byte budget | `AGENTS.md` merge | `CLAUDE.md` layers with `@imports` | `CLINICALCRAFT.md` layers (user → project → nested) with `@imports`, AGENTS.md fallback |
| Hooks | exit 2 blocks; user-settings only | notify + hook events | trust by digest | ~30 events, JSON in/out, `additionalContext` | `SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, ClinicalEvent, Notification, PreCompact, Stop, SessionEnd`; never loaded from case packs |
| Commands / agents | slash commands | prompt files with `$ARGUMENTS` | Markdown agent profiles | `.claude/{commands,agents}` | `.clinicalcraft/{commands,agents}/*.md`; built-in patient, companion, nurse, radiologist, pathologist, attending, examiner, clinician |
| Plans | todo list tool | no-op `update_plan` | goal verifier | TodoWrite / plan mode | `update_workup` (visible differential/plan), independent examiner verifier |
| Headless | `-p` | `exec --json` | `--prompt` | `-p --output-format stream-json` | `clinicalcraft exec / -p --output-format text|json|stream-json`; headless never silently approves |
| Sessions | SQLite | JSONL rollouts, resume/fork | services | JSONL, `--resume/--continue` | JSONL rollouts under `~/.clinicalcraft/sessions`, deterministic replay of clinical actions |
| MCP | client | `mcp-server` | client | client | `clinicalcraft mcp` server: external agents play the clinician |

## 2. Virtual-patient principles (from the simulation literature)

1. **Need-to-know context** — the patient model never sees unrevealed answers,
   results, the diagnosis or the rubric.
2. **Select, then voice** — facts are chosen by id (deterministic matcher,
   optional LLM re-rank restricted to candidate ids), then phrased.
3. **Verify, then fall back** — numbers, units, drugs and dates in a reply must
   come from the selected facts; otherwise the authored answer is used.
4. **No implicit normals** — missing data is "not recorded", never "normal".
5. **Measurement is data, never generation** — exam findings, labs and imaging
   come from the case via the engine.
6. **Deterministic scoring first** — rubric items are conditions over state;
   only communication items are judged by a separate examiner agent that must
   quote evidence. Scores are formative, never a validated competency measure.
7. **Physiology is pure** — vitals are a function of (case, actions, minute),
   so every session can be replayed exactly.

## 3. Risks we designed against

* diagnosis leakage through prompts → type-level `PatientContext`, grounding tests
* hallucinated specifics → verifier + template fallback
* silent auto-approval → approval gate on every state change, including learner
  button presses; headless denies by default unless `--approval auto|bypass`
* untrusted content executing code → hooks only from settings; case/hook text
  treated as data and capped
* credential hazards → keys only in env / user settings (0600) / server-side
  proxy; server binds loopback unless a token is configured
* wire pitfalls → no `temperature`/forced `tool_choice` to models that reject
  them; tool-call deltas merged by `index`; Anthropic blocks echoed verbatim
* god files → small modules per concern; UI derives from the event log
