# Agent runtime & front-end protocol

Contract files (authoritative types):
`packages/agent/src/protocol.ts` (Op / AgentEvent),
`packages/agent/src/providers/types.ts` (LLMProvider, ChatRequest, StreamEvent),
`packages/agent/src/tools/types.ts` (ToolDefinition, ToolContext, PermissionCheck),
`packages/agent/src/settings/schema.ts` (Settings, ResolvedSettings, hooks config),
`packages/agent/src/hooks/types.ts` (HookInput/Output),
`packages/agent/src/agents/types.ts` (AgentProfile, SlashCommand),
`packages/agent/src/session/types.ts` (SessionOptions, ClinicalSessionApi, TranscriptItem).

## 1. Design lineage

| Borrowed from | Principle | ClinicalCraft feature |
|---|---|---|
| Codex CLI | SQ/EQ protocol; core never touches UI | `Op` → `ClinicalSession` → `AgentEvent` stream for every front-end |
| Codex CLI | approval policy × sandbox | `approvalMode` × `practiceScope` (tools outside scope are not registered) |
| Codex CLI | `update_plan` tool, JSONL rollouts, `exec --json`, `mcp-server`, profiles | `update_workup`, `~/.clinicalcraft/sessions/**.jsonl`, `clinicalcraft exec --output-format stream-json`, `clinicalcraft mcp`, `profiles.*` |
| Claude Code | permission modes, `Tool(specifier)` allow/ask/deny rules, hooks, subagents in Markdown, slash commands, CLAUDE.md memory with `@imports`, headless `-p` | `default/strict/auto/plan/bypass`, `intervene(alteplase*)`, `.clinicalcraft/{agents,commands}`, `CLINICALCRAFT.md`, `clinicalcraft -p` |
| Grok CLI | OpenAI-compatible client with configurable base URL, user/project settings, confirmation with "don't ask again this session", `--max-tool-rounds`, model switching | provider catalogue + `--base-url`, `approved_for_session`, `maxToolRounds`, `/model` |
| ZCode (Z.ai, Apache-2.0) | data-driven provider catalogue with zh-CN/en names, model capability rules, normalised stream events, permission ladder with stable rule ids, risk levels, goal verifier, zh-CN/en i18n, loopback-only server unless token | `providers/catalog.ts`, `ModelRule[]`, `StreamEvent`, `PermissionCheck.ruleId`, examiner verifier, `server.token` |

All code is original; only designs were borrowed.

## 2. Package `@clinicalcraft/agent` layout and exports

```
src/index.ts                 isomorphic exports (browser-safe; no node: imports)
src/protocol.ts              (contract)
src/providers/types.ts       (contract)
src/providers/catalog.ts     PROVIDER_TEMPLATES: ProviderTemplate[]; MODEL_RULES: ModelRule[]; capabilitiesFor(providerId, model)
src/providers/sse.ts         parseSSE(stream: ReadableStream<Uint8Array>): AsyncIterable<{event?: string; data: string}>
src/providers/anthropic.ts   AnthropicProvider (official @anthropic-ai/sdk; see §5)
src/providers/openai.ts      OpenAICompatibleProvider (fetch + SSE; tool_calls assembled by index)
src/providers/proxy.ts       ProxyProvider (POST {provider, request} to /api/llm/stream; SSE of StreamEvent)
src/providers/offline.ts     OfflineProvider (never called by NPCs; exists so "offline" resolves) 
src/providers/scripted.ts    ScriptedProvider (tests: replays canned StreamEvent[] per call)
src/providers/factory.ts     createProvider(config: ProviderConfig): LLMProvider; withRetry(provider, policy)
src/providers/errors.ts      classifyHttpError(status, body): ProviderErrorInfo (incl. Zhipu business codes 1261/1302/1303/1305/1312/1113…)
src/settings/schema.ts       (contract)
src/settings/merge.ts        mergeSettings(layers: {source, settings}[]): ResolvedSettings; DEFAULT_SETTINGS
src/permissions.ts           checkPermission(tool, args, ctx, mode, scope, rules, sessionRules): PermissionCheck; matchRule("intervene(alteplase*)", tool, specifier)
src/hooks/types.ts           (contract)
src/hooks/runner.ts          HookRunner (in-process + CommandHookExecutor), runHooks(event, input): HookResult
src/tools/types.ts           (contract)
src/tools/clinical.ts        clinicalTools(): ToolDefinition[] (see §3)
src/tools/npc.ts             npc tools (reveal_facts, get_vitals, get_results, get_progress, give_hint)
src/agents/types.ts          (contract)
src/agents/builtin.ts        BUILTIN_AGENTS: AgentProfile[] (prompts as template strings)
src/agents/markdown.ts       parseAgentMarkdown(text, source): AgentProfile; parseCommandMarkdown(name, text, source): SlashCommand
src/agents/prompts.ts        buildSystemSections(profile, ctx): SystemSection[] (patient fact sheet etc.)
src/agents/offline.ts        offline responders: patientOffline, nurseOffline, consultantOffline, attendingOffline, clinicianOffline (replays case.solution step by step with narration)
src/loop.ts                  runAgentTurn(params): Promise<TurnResult> — the generic tool-use loop (§4)
src/commands.ts              BUILTIN_COMMANDS + executeCommand(host: CommandHost, name, args)
src/compaction.ts            compactConversation(provider, messages, keep): Promise<{messages, summary}>; estimateTokens()
src/memory.ts                assembleMemory(files: {path, text}[], resolveImport): string (strips HTML comments, ≤4 import hops, 32 KiB cap)
src/session/types.ts         (contract)
src/session/session.ts       ClinicalSession implements ClinicalSessionApi; createSession(opts): Promise<ClinicalSession>
src/session/router.ts        parseLearnerInput(text): {kind:"command", name, args} | {kind:"message", to, text}   (`/cmd args`, `@nurse text`, plain)
src/transcript.ts            MemoryTranscript (array sink), replayTranscript(items) → {actions, messages}
src/node/index.ts            node-only exports (§7)
```

`src/index.ts` re-exports everything except `node/`.

## 3. Tools

All tools validate input against `inputSchema` (hand-written validation or zod; never trust model JSON), return `ToolOutput` with localised `output` text for the model and typed `data` for UIs. Clinical tools call `ctx.dispatch(action)`; rejected actions return `ok:false` with the rejection message.

| tool | scope | readOnly | risk | args | effect |
|---|---|---|---|---|---|
| `ask_patient` | history-only | no (records asks) | none | `{question}` | runs patient (or companion) agent; output = patient reply |
| `list_options` | history-only | yes | none | `{kind: "history"\|"exam"\|"investigations"\|"interventions"\|"decisions"\|"phases"}` | names/ids only — never findings or results |
| `examine` | history-only | no | none | `{finding_id?}` or `{query}` | `examine` action (matchExam for query); output = finding (or examNotRecorded) |
| `order_test` | workup | no | investigation.risk | `{investigation_id?, query?}` | `order` action (matchOrders); ambiguous query → returns candidates, no order |
| `read_result` | workup | no | none | `{investigation_id, phase?}` | `read` action; output = date + text + values + notes |
| `check_vitals` | history-only | yes | none | `{}` | `vitalsAt` snapshot + alarms |
| `intervene` | full | no | intervention.risk; `alwaysAsk` if risk high | `{intervention_id?, query?}` | `intervene` action; output = response + harm (if contraindicated) |
| `consult` | workup | yes | none | `{role: "nurse"\|"radiologist"\|"pathologist"\|"attending", question}` | runs that NPC agent |
| `answer_decision` | history-only | no | low | `{decision_id, option_ids}` | `answer` action; output = correctness + feedback |
| `set_phase` | history-only | no | none | `{phase}` | `set-phase` action |
| `wait` | workup | no | none | `{minutes}` (simulated clock only) | `advance-time` |
| `update_workup` | history-only | yes | none | `{explanation?, plan:[{text,status}]}` | emits `plan_updated` only |
| `case_status` | history-only | yes | none | `{}` | objectives, pending orders, unlocked decisions, phase, clock |
| `finish_case` | history-only | no | low | `{}` | `finish` action |
| `walk_to` (dynamic) | history-only | yes | none | `{target}` | `dynamic_tool_call` to the web world (only registered when the front-end declares support) |

NPC-only tools: `reveal_facts {fact_ids: string[]}` (patient/companion; validates ids, dispatches `ask` with `via:"agent"` for each new id, returns canonical answers), `get_vitals {}` (nurse), `get_results {investigation_id}` (radiologist/pathologist/nurse — only results the learner has read or that are ready), `get_progress {}` and `give_hint {}` (attending; `hint` action).

## 4. Agent loop (`runAgentTurn`)

```
runAgentTurn({ host: LoopHost /* toolContext, authorize (approval gate), runHooks */, agent: AgentProfile, provider, system: SystemSection[], history: ChatMessage[],
               userParts: ChatPart[], tools: ToolDefinition[], maxToolRounds, signal, emit }) → { text, messages, grounded, usage, stopReason }
```
1. Append the user message; `emit(turn_phase awaiting_model)`.
2. Stream `provider.stream()`; forward `text_delta` as `agent_message_delta`; collect tool calls (complete only when `tool_call` arrives).
3. On `finish`: append the assistant message (text + tool calls + `provider_raw` when supplied — append-only history). If `stopReason` is `refusal` → stop (emit warning); `max_tokens` with tool calls → do not run them; `pause_turn` → continue.
4. For each tool call (sequentially; read-only calls may run in parallel): validate; `PreToolUse` hooks; approval gate (§6); run; `PostToolUse` hooks; emit `tool_call_begin/end`. Return **all** tool results in **one** user message.
5. Loop while there were tool calls and rounds < `maxToolRounds` (then emit `turn_aborted max_tool_rounds`). `Stop` hook may force one more step (`stop_hook_active`, max 3).
6. Retries: `withRetry` (exponential backoff 2 s ×2 cap 60 s with jitter, `maxRetries` default 4) on retryable `ProviderErrorInfo`; emit `api_retry`.
7. Abort: check `signal` between chunks and before each tool; on abort emit `turn_aborted interrupted` and keep history consistent (drop the partial assistant turn).

## 5. Providers

* **AnthropicProvider** uses `@anthropic-ai/sdk` (`client.beta.messages.stream(...)` + `finalMessage()`): `system` = text blocks with `cache_control: {type: "ephemeral"}` on the last stable section; tools with `eager_input_streaming: true` (validate parsed input before running); `output_config: {effort}` when set; **no** `thinking` param, **no** temperature for Claude 4.7+ models (capabilities `rejectsSampling`), **never** forced `tool_choice`; `betas: ["server-side-fallback-2026-07-01"]` + `fallbacks: "default"` for `claude-opus-5-5` / `claude-fable-5-1` / `claude-opus-5` / `claude-sonnet-5-5` on the first-party base URL (omit for Anthropic-compatible third-party endpoints); handle `stop_reason` `refusal`/`max_tokens`/`pause_turn`; echo `message.content` back verbatim via `provider_raw` (after a `fallback` block drop pre-boundary thinking/tool_use blocks); typed SDK errors → `ProviderErrorInfo`. Browser: `dangerouslyAllowBrowser: true` only when the user supplied their own key. Default model `claude-opus-5-5`.
* **OpenAICompatibleProvider**: `POST {baseUrl}/chat/completions` with `stream: true`, `stream_options: {include_usage: true}`; system sections merged into **one** leading system message; tools as `{type:"function", function:{name, description, parameters}}`; assemble `delta.tool_calls[i]` by `index`; GLM: `tool_stream: true` when model starts with `glm-4.6`/`glm-5`, `thinking: {type:"disabled"|"enabled"}` by effort; reasoning deltas (`reasoning_content`) → `reasoning_delta` (never spoken); OpenAI o-/gpt-5 models: `max_completion_tokens` + `reasoning_effort`; others `max_tokens`; Kimi temperature ×0.6 only on its Anthropic endpoint.
* **Catalogue** (`PROVIDER_TEMPLATES`, names in zh-CN/en): `anthropic` (https://api.anthropic.com, ANTHROPIC_API_KEY, claude-opus-5-5), `openai` (https://api.openai.com/v1, OPENAI_API_KEY, gpt-5), `xai` (https://api.x.ai/v1, XAI_API_KEY/GROK_API_KEY, grok-4.6), `zhipu` (https://open.bigmodel.cn/api/paas/v4, ZHIPU_API_KEY/ZHIPUAI_API_KEY, glm-4.6), `zai` (https://api.z.ai/api/paas/v4, ZAI_API_KEY, glm-4.6), `zhipu-anthropic` (https://open.bigmodel.cn/api/anthropic, anthropic-messages), `deepseek` (https://api.deepseek.com, DEEPSEEK_API_KEY, deepseek-v4-pro), `moonshot` (https://api.moonshot.cn/v1, MOONSHOT_API_KEY, kimi-k2.6), `qwen` (https://dashscope.aliyuncs.com/compatible-mode/v1, DASHSCOPE_API_KEY, qwen-plus), `openrouter` (https://openrouter.ai/api/v1, OPENROUTER_API_KEY, z-ai/glm-5.3), `ollama` (http://localhost:11434/v1, noKey, qwen3), `lmstudio` (http://localhost:1234/v1, noKey), `offline`, `proxy`. Model ids change; users may type any id and `clinicalcraft providers models <id>` lists `GET /models` when available.
* `resolveProviderConfig(settings, providerId, model, env)` (isomorphic, env passed in) applies overrides from `settings.providers`.

## 6. Approval gate (`checkPermission`) — ordered ladder, first match wins

| step | rule id | outcome |
|---|---|---|
| 1 | `scope.out-of-scope` | deny if tool scope > practiceScope |
| 2 | `rule.deny` | deny if any deny rule matches |
| 3 | `mode.plan.state-changing` | deny non-readOnly tools in plan mode (message: propose instead) |
| 4 | `tool.read-only` | allow read-only tools |
| 5 | `tool.always-ask` | ask (allowSession false) when `alwaysAsk` — unless mode bypass |
| 6 | `rule.ask` | ask if any ask rule matches |
| 7 | `session.allow` | allow if an "approved for session" rule matches |
| 8 | `rule.allow` | allow if any allow rule matches |
| 9 | `mode.bypass` / `mode.auto` / `mode.default` / `mode.strict` | per table in ARCHITECTURE §4.1 using `risk` |

Rule syntax: `tool` or `tool(specifier-glob)`, e.g. `intervene(alteplase*)`, `order_test(*)`, `examine`. Specifier = intervention/investigation/finding id or `role` for consult. Learner direct actions (`clinical_action` op) go through the same gate with agent `"learner"`, mapped to the equivalent tool (`order` → `order_test`, `intervene` → `intervene`, …). `ask` → emit `approval_request`, await `approval_response` (`abort` cancels the turn; `denied` returns the reason to the agent as the tool error; `approved_for_session` adds `tool(specifier)` to session rules).

## 7. Node layer (`@clinicalcraft/agent/node`)

```
clinicalcraftHome(env): string                                   // CLINICALCRAFT_HOME ?? ~/.clinicalcraft
loadSettings({cwd, env, flags, profile}): Promise<ResolvedSettings & {files: string[]}>
saveUserSettings(patch): Promise<string>                         // mode 0600
loadMemory(cwd, env): Promise<{text: string; files: string[]}>  // ~/.clinicalcraft/CLINICALCRAFT.md + every CLINICALCRAFT.md (or AGENTS.md fallback) from git root/cwd ancestors, root-first
loadProjectAgents(cwd, env): Promise<AgentProfile[]>              // ~/.clinicalcraft/agents/*.md + .clinicalcraft/agents/*.md
loadProjectCommands(cwd, env): Promise<SlashCommand[]>            // …/commands/*.md (name = filename; nested dirs → "dir:name")
createCommandHookExecutor(cwd): CommandHookExecutor               // child_process spawn("sh", ["-c", cmd]) with stdin JSON, timeout, env CLINICALCRAFT_PROJECT_DIR
JsonlTranscript.create({dir, sessionId}): TranscriptSink         // ~/.clinicalcraft/sessions/YYYY/MM/DD/<ts>-<id>.jsonl
listSessions(env): Promise<{id, path, caseId, startedAt}[]>; readTranscript(path): Promise<TranscriptItem[]>
loadContent({dirs}): Promise<{cases: Map<string, {def: CaseDefinition; dir: string}>; facilities: Map<…>; catalogs: Map<…>; issues: {file, issues}[]}>
resolveNodeProviderConfig(settings, providerId?, model?): ProviderConfig   // reads env keys
createNodeSession(opts: {caseId, cwd?, flags?, profile?, facilityId?, transcript?: boolean}): Promise<ClinicalSession>  // one-call bootstrap used by CLI, server, MCP
```

## 8. Built-in agents (Markdown profiles, prompts in `agents/builtin.ts`)

| name | role | tools | notes |
|---|---|---|---|
| `patient` | npc | reveal_facts | persona + fact sheet; layperson language; answers in session locale; never diagnoses, never states exam findings/results; volunteer facts may appear in opening; unknowns → fallback |
| `companion` | npc | reveal_facts | parent/spouse when `persona.companion` exists (`answersHistory` routes history questions here) |
| `nurse` | npc | get_vitals, get_results | triage note, vitals, logistics, critical-result call-through; no diagnosis |
| `radiologist`, `pathologist` | npc | get_results | interpret only results the learner has, within case `npcs[].knowledge`; state evidence boundaries |
| `attending` | assistant | get_progress, give_hint | Socratic preceptor; never reveals the answer unless `revealsDiagnosis` |
| `examiner` | examiner | (none) | independent verifier (ZCode goal verifier): judges `rubric` items without `met` from the transcript, must quote evidence, outputs JSON `{items:[{id, met, evidence}], narrative}` in the session locale |
| `clinician` | assistant | all clinical tools | autopilot "doctor": systematic history → exam → targeted workup → decisions; uses `update_workup`; respects approvals |

Offline responders implement the same contract deterministically (matchers + case data), so every feature works with `provider: "offline"`.

## 9. Slash commands (built-in)

`/help`, `/case` (summary & objectives), `/ask [n|text]` (list or ask canonical history questions), `/exam [query]`, `/order <query>`, `/results`, `/read <id> [phase]`, `/give <query>` (intervene), `/vitals`, `/board` (decisions), `/answer <decision> <option…>`, `/phase <id>`, `/wait <min>`, `/hint`, `/status`, `/plan`, `/note <text>`, `/talk <role>` (switch interlocutor), `/consult <role> <question>`, `/autopilot [goal]`, `/assess`, `/debrief`, `/model [id]`, `/provider [id]`, `/approval [mode]`, `/scope [scope]`, `/permissions`, `/compact [agent]`, `/export [path]`, `/lang [zh-CN|en]`, `/clear`, `/quit`. Custom: `.clinicalcraft/commands/*.md` (frontmatter `description`, `argument-hint`, `agent`; body with `$ARGUMENTS`, `$1…$9`).

Router: input starting with `/` → command; `@role text` → message to role; otherwise → current interlocutor (default `patient`).

## 10. Transcripts & resume

JSONL lines per `TranscriptItem`. Resume: read items → `actions` (accepted only) replayed through `reduce`, per-agent `message` items restore conversations, `session_meta` restores case/locale/provider. `clinicalcraft --resume <id>` / `--continue` (latest for this cwd).

## 11. Front-end contracts

* **CLI** (`@clinicalcraft/cli`, bin `clinicalcraft`): `play [case]` (default), `exec <prompt>` / `-p <prompt>` with `--case`, `--autopilot`, `--output-format text|json|stream-json` (stream-json = one AgentEvent per line + final `{"type":"result","subtype":"success"|"error_max_turns"|"error_during_execution", "assessment":…, "usage":…}`), `--max-turns`, `--approval`, `--scope`, `--provider`, `--model`, `--base-url`, `--profile`, `--lang`, `--resume`, `--continue`; `cases list|show|validate|verify|new|schema`; `facilities list|validate`; `providers list|test|models`; `config get|set|path`; `sessions list|show`; `serve`; `mcp`; `import-v4 <html|.part01|.zip…>`; `eval --cases … --provider … --model …` (autopilot benchmark → markdown/JSON report).
* **Server** (`@clinicalcraft/server`): `startServer({port, host, token?, staticDir?, settings, contentDirs?}) → {url, close}`. Routes: `GET /api/health`, `GET /api/content/index`, `GET /api/content/cases/:id` (solution stripped), `GET /api/content/facilities/:id`, `GET /api/content/catalogs/:id`, `GET /local-assets/*` (local-only assets, see docs/ASSETS.md; 404 JSON when not installed), `GET /api/providers` (templates + `configured: boolean`, never keys), `POST /api/llm/stream` (body `{provider, model, request: ChatRequest}` → `text/event-stream` of `data: StreamEvent` lines, `event: done` at end), `POST /api/transcripts/:sessionId` (append JSONL items). Loopback only unless `token` is set (Bearer); CORS limited to same origin.
* **MCP** (`@clinicalcraft/mcp`): `runMcpServer({stdin, stdout, settings})` JSON-RPC 2.0 over newline-delimited stdio; `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `ping`. Tools: `list_cases`, `start_case {case_id, locale?}` → session id, then every clinical tool from §3 with an extra `session_id` arg, plus `get_debrief`. Resources: `clinicalcraft://cases`, `clinicalcraft://session/{id}/state`, `clinicalcraft://session/{id}/transcript`. Approval mode defaults to `bypass` (the MCP client owns approvals) but honours settings.
* **Web**: runs `ClinicalSession` in the browser with `resolveProvider` from the settings panel: offline (default), proxy (when served by `clinicalcraft serve`), or direct (user key; Anthropic with `dangerouslyAllowBrowser`, OpenAI-compatible fetch). Declares the `walk_to` dynamic tool.
