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
| tools (17) | `list_cases {locale?}`, `start_case {case_id, locale?, facility_id?}` → `session_id`; then, each with a required `session_id`: `ask_patient`, `list_options`, `examine`, `order_test`, `read_result`, `check_vitals`, `intervene`, `consult`, `answer_decision`, `set_phase`, `wait`, `update_workup`, `case_status`, `finish_case`, `get_debrief` |
| resources | `clinicalcraft://cases`, `clinicalcraft://session/{session_id}/state`, `clinicalcraft://session/{session_id}/transcript` |

Tool failures (unknown ids, engine rejections, approval refusals) come back as
results with `isError: true` and a localised explanation, so the calling
agent can adapt.

**Approvals.** The MCP client owns approvals, so sessions default to
`approvalMode: "bypass"` — unless a settings layer (user, project, local, env
or a flag such as `--approval`) sets `approvalMode` explicitly. This
repository's own `.clinicalcraft/settings.json` sets `"default"`, so when the
server runs inside this checkout moderate- and high-risk actions are refused
with a hint; pass `--approval bypass` (or `auto`) to let the external agent
give them. Deny rules and the practice scope always apply.

Contract: [docs/PROTOCOL.md §11](../../docs/PROTOCOL.md). Tests:
`npx vitest run packages/mcp`.
