# @clinicalcraft/mcp

A Model Context Protocol server (JSON-RPC 2.0, newline-delimited over stdio)
that lets an external agent — Claude Code, Codex CLI, Grok CLI or any MCP
client — play the clinician in a grounded ClinicalCraft encounter. Started by
`clinicalcraft mcp`; diagnostics go to stderr, never stdout.

```bash
npm run build:lib
claude mcp add clinicalcraft -- node "$PWD/packages/cli/dist/bin.js" mcp --cwd "$PWD"
```

(More clients — Codex `config.toml`, Grok CLI — in the root
[README](../../README.md#mcp-let-claude-code-codex-or-grok-cli-play-the-clinician).)

| | |
|---|---|
| methods | `initialize` (protocol versions `2025-06-18`, `2025-03-26`, `2024-11-05`), `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list`, `resources/read`, `notifications/cancelled` |
| tools (33) | `list_cases {locale?}`, `start_case {case_id, locale?, facility_id?, embodied?}` → `session_id`; then, each with a required `session_id`: `ask_patient`, `list_options`, `examine`, `order_test`, `read_result`, `check_vitals`, `intervene`, `consult`, `answer_decision`, `set_phase`, `wait`, `update_workup`, `case_status`, `finish_case`, `get_debrief`; embodied sessions only: `observe_world`, `get_agent_state`, `find_entities`, `find_objects`, `inspect_object`, `get_nearby_objects`, `get_visible_objects`, `get_room_info`, `get_action_feedback`, `navigate_to`, `approach_object`, `look_at`, `interact_object`, `cancel_action`, `delegate_task`, `execute_skill` |
| resources | `clinicalcraft://cases`, `clinicalcraft://session/{session_id}/state`, `clinicalcraft://session/{session_id}/transcript` |
| annotations | every tool: `title`, `readOnlyHint` (`list_cases`, `list_options`, `check_vitals`, `case_status`, `get_debrief` and the nine perception tools), `destructiveHint` (`intervene`, `order_test`, `interact_object`, `delegate_task`, `execute_skill`), `idempotentHint` (the read-only tools, `set_phase`, `update_workup`, `finish_case`, `cancel_action`), `openWorldHint: false` (a closed simulation) |

Tool failures (unknown ids, engine rejections, approval refusals) come back as
results with `isError: true` and a localised explanation, so the calling
agent can adapt.

**Approvals: a two-step confirmation.** Sessions default to
`approvalMode: "auto"` unless a settings layer (user, project, local, env or
a flag such as `--approval`) sets `approvalMode` explicitly. Low- and
moderate-risk actions run. A call the approval gate would ask about —
high-risk / always-ask interventions such as thrombolysis, ask rules, every
state-changing call in `strict` mode — is **not** carried out: it returns an
`isError` result that explains the action and its risk, with
`structuredContent.refused = {reason: "ask", ruleId, risk, confirm: "required"}`,
and asks the client to call again with the same arguments plus
`"confirm": true` once its user agreed. Every state-changing tool accepts the
optional boolean `confirm`; it counts only when it repeats a call refused as
needing confirmation (same tool, arguments and rule, within 10 minutes, once)
— `confirm: true` on a first attempt is refused like an unconfirmed call.
Deny rules, plan mode and the practice scope are never overridden by
`confirm`. Session warnings (e.g. an agent answering with the deterministic
offline responder because a key is missing) come back with each result as
`structuredContent.warnings` and "Notice:" lines, and go to stderr;
`clinicalcraft mcp --provider <id>` without that provider's key is an error. `--approval bypass` (or
`CLINICALCRAFT_APPROVAL=bypass`) removes the confirmation step entirely — the
gate then runs always-ask actions without asking; use it only for unattended
benchmarks.

**Embodied mode.** `start_case {"embodied": true}` (default: the settings'
`embodiment`) gives the client a body in the case's hospital — a headless
world per MCP session. Clinical tools then need the right place: a call out
of reach returns `isError` with `structuredContent.data.code =
"SPATIAL_REQUIREMENT_UNMET"` and `data.hint.goal`, which `navigate_to
{"goal": …}` follows. `interact_object` operates equipment; an operation
with a clinical effect (an ECG cart's `record`, a monitor's `attach`, a
device's `use`) runs the clinical tool through the same approval gate — an
approval it needs is the same two-step confirmation (`refused.tool` names the
clinical tool), and deny rules hold. On a clinical session the world tools
return `isError` with `structuredContent.error = "not_embodied"`. The case
list comes from the case index; only the started case is validated.

Contract: [docs/PROTOCOL.md §11–§12](../../docs/PROTOCOL.md). Tests:
`npx vitest run packages/mcp`.
