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
| `@clinicalcraft/agent` | isomorphic (browser-safe, no `node:*`): protocol, providers, tools, approval gate, hooks runner, slash commands, agents, `createSession`, the case library order and index-entry builder (`libraryOrder`, `caseIndexEntry`) |
| `@clinicalcraft/agent/node` | Node only: settings files, `CLINICALCRAFT.md` memory, custom agents/commands, shell-command hooks, JSONL transcripts, `loadContent`, the case index over content directories (`CaseIndexer`), `createNodeSession` |

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
- **Embodied mode** (`embodiment: "embodied"`; `src/session/embodied.ts`,
  `src/tools/spatial.ts`, `src/tools/world.ts`, `src/tools/scope.ts`,
  `src/skills/`; PROTOCOL §12, docs/EMBODIED.md): the session runs a
  headless `@clinicalcraft/world` runtime for the case's facility —
  clinical tools are spatially gated before the approval gate and again
  before the engine commits (refusals carry `hint.goal` and `hint.then`),
  18 world tools look, walk, operate equipment, transport the patient,
  delegate to staff and run skills, every body is held to its role's scope
  of practice, every learner-facing vitals channel follows one check
  (`vitalsView()`), walking charges simulated time, and `session.world()` /
  `session.trace()` expose the world and the episode trace.
- **World bridge client** (`src/bridge/`; PROTOCOL §13):
  `connectWorldBridge` lets a live session (the web world) accept an
  external agent's tool calls through `clinicalcraft serve`, as clinician
  turns whose approvals stay with the learner; `WorldAttachClient` is the
  other end, used by `clinicalcraft mcp --attach`.

```ts
const s = await createNodeSession({ caseId: "stemi-inferior-rv", flags: { provider: "offline", embodiment: "embodied" }, transcript: false });
await s.run({ type: "slash_command", name: "go", args: "patient" }); // navigate_to, travel time charged
await s.run({ type: "slash_command", name: "delegate", args: "nurse attach_monitor" });
console.log(s.placeLabel(), s.trace().spans.length);
```

Every feature works with `provider: "offline"`, which is also what the tests
use (`npx vitest run packages/agent`). The session lives in `src/session/`:
`session.ts` is the `ClinicalSession` facade over a `SessionKernel`
(`kernel.ts`) and its parts — op dispatch (`op-dispatch.ts`), the learner's
input and tool path (`learner.ts`), agent turns (`agent-turns.ts`), the tool
context (`tool-path.ts`), the approval gate, agent models, conversations,
external calls, the embodied wiring and resume.
