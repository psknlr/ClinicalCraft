# @clinicalcraft/agent

The ClinicalCraft agent runtime. A `ClinicalSession` owns one case and its
engine state, runs the LLM-driven (or offline) patient, companion, nurse,
consultants, attending, examiner and clinician agents, and speaks a
Codex-style submission/event protocol: front-ends `submit(Op)` and consume
`AgentEvent`s. The runtime never touches a UI, so the web world, the REPL,
headless `exec`, the HTTP server and the MCP server are all protocol clients.

Two entry points:

| import | for |
|---|---|
| `@clinicalcraft/agent` | isomorphic (browser-safe, no `node:*`): protocol, providers, tools, approval gate, hooks runner, slash commands, agents, `createSession` |
| `@clinicalcraft/agent/node` | Node only: settings files, `CLINICALCRAFT.md` memory, custom agents/commands, shell-command hooks, JSONL transcripts, `loadContent`, `createNodeSession` |

```ts
import { createNodeSession } from "@clinicalcraft/agent/node";

const session = await createNodeSession({ caseId: "stemi-inferior-rv", flags: { provider: "offline", locale: "en" }, transcript: false });
session.subscribe(({ msg }) => {
  if (msg.type === "agent_message") console.log(`${msg.speaker}: ${msg.text}`);
  if (msg.type === "clinical_event") console.log(`· ${msg.event.type}`);
});
await session.run({ type: "user_message", text: "Where is the pain?" });
await session.run({ type: "clinical_action", action: { type: "order", investigationId: "ecg-12lead" } });
await session.close();
```

What is inside (contracts in [docs/PROTOCOL.md](../../docs/PROTOCOL.md)):

- **Protocol** (`src/protocol.ts`): `Op` (`user_message`, `clinical_action`,
  `slash_command`, `approval_response`, `autopilot`, `configure`, `assess`,
  `interrupt`, …) and `AgentEvent` (`agent_message(_delta)`, `tool_call_*`,
  `approval_request`, `clinical_event`, `state_snapshot`, `assessment`, …).
- **Providers** (`src/providers/`): a data-driven catalogue
  (`PROVIDER_TEMPLATES`, `MODEL_RULES`) over two wires — the official
  `@anthropic-ai/sdk` (Messages API streaming) and OpenAI-compatible Chat
  Completions over `fetch` — plus `offline` (deterministic, no network) and
  `proxy` (browser → `clinicalcraft serve`). Retries via `withRetry`.
- **Approval gate** (`src/permissions.ts`): `approvalMode`
  (`default/strict/auto/plan/bypass`) × `practiceScope`
  (`history-only/workup/full`) × `tool(specifier)` allow/ask/deny rules, with a
  stable rule id on every decision.
- **Grounding** (`src/session/patient-pipeline.ts`, `grounding.ts`): the
  patient never sees unrevealed answers, results or the diagnosis; facts are
  selected by id, voiced, then verified against the case (template fallback).
- **Hooks, commands, agents, memory, compaction, transcripts**: Claude
  Code-style hooks (`SessionStart` … `SessionEnd`), Markdown slash commands
  and agent profiles, `CLINICALCRAFT.md` with `@imports`, JSONL rollouts and
  resume.

Every feature works with `provider: "offline"`, which is also what the tests
use (`npx vitest run packages/agent`).
