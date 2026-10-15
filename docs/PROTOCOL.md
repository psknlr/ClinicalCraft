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
src/providers/structured.ts  structured output per provider: structuredOutputMode(providerId, model), withJsonInstruction(system, format)…
src/providers/factory.ts     createProvider(config: ProviderConfig, options?: {fetch?}): LLMProvider; withRetry(provider, policy?)
src/providers/errors.ts      classifyHttpError(status, bodyText, headers?): ProviderErrorInfo (incl. Zhipu business codes 1261/1302/1303/1305/1312/1113…)
src/settings/schema.ts       (contract)
src/settings/merge.ts        mergeSettings(layers: {source, settings}[], {profile?}): ResolvedSettings; mergeSettingsDetailed (+ issues); envLayer(env); DEFAULT_SETTINGS
src/permissions.ts           checkPermission(tool, args, ctx, mode, scope, rules, sessionRules): PermissionCheck; matchRule("intervene(alteplase*)", tool, specifier)
src/hooks/types.ts           (contract)
src/hooks/runner.ts          HookRunner (in-process `on(event, fn)` + CommandHookExecutor), hookRunner.runHooks(event, input, options?): Promise<HookResult>; matchesHookMatcher
src/tools/types.ts           (contract)
src/tools/clinical.ts        clinicalTools(): ToolDefinition[] (see §3)
src/tools/npc.ts             npcTools(options?): npc tools (reveal_facts, get_vitals, get_results, get_progress, give_hint)
src/tools/index.ts           ToolRegistry / createToolRegistry(options) (scope + deny filtering), DYNAMIC_TOOLS = ["walk_to"]; validate.ts validateArgs(schema, value); format.ts labels
src/agents/types.ts          (contract)
src/agents/builtin.ts        BUILTIN_AGENTS: AgentProfile[] (prompts as template strings)
src/agents/markdown.ts       parseAgentMarkdown(text, source, defaultName?): AgentProfile; parseCommandMarkdown(name, text, source): SlashCommand
src/agents/prompts.ts        buildSystemSections(profile, ctx): SystemSection[] (patient fact sheet etc.)
src/agents/offline.ts        offline responders: patientOffline, nurseOffline, consultantOffline, attendingOffline, clinicianOffline (replays case.solution step by step with narration)
src/loop.ts                  runAgentTurn(params): Promise<TurnResult> — the generic tool-use loop (§4)
src/commands.ts              BUILTIN_COMMANDS + executeCommand(host: CommandHost, name, args)
src/compaction.ts            compactConversation({provider | null, messages, keepRecent? = 6, locale?, signal?, model?, maxSummaryTokens?}): Promise<{messages, summary, deterministic, compactedCount}>; estimateTokens()
src/memory.ts                assembleMemory(files: {path, text}[], resolveImport?, maxBytes?): string (strips HTML comments, ≤4 import hops, 32 KiB cap)
src/session/types.ts         (contract)
src/session/session.ts       ClinicalSession implements ClinicalSessionApi; createSession(opts): Promise<ClinicalSession>
src/session/action-input.ts  actionToolArgs(c, action, locale) / actionFromToolInput(c, action, input, locale): learner clinical action ↔ equivalent tool input (§6.1)
src/session/router.ts        parseLearnerInput(text): {kind:"command", name, args} | {kind:"message", to, text}   (`/cmd args`, `@nurse text`, plain)
src/session/patient-pipeline.ts  selectFacts / patient turn (§4.2 of ARCHITECTURE: route → select → voice → verify); grounding.ts verifyGrounding(say, sources)
src/session/examiner.ts      runExaminer(params): ExaminerVerdict; autopilot.ts runAutopilot / offlineClinicianTurn; approvals.ts ApprovalBroker;
                             events.ts EventHub; models.ts resolveAgentModel(profile, settings); notifications.ts reactToDomainEvent; i18n.ts runtime strings
src/transcript.ts            MemoryTranscript (array sink), replayTranscript(items) → {actions, messages}; resumedRuntimeConfig(items) (§10)
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

**Turn bracketing.** Every `agent_message` (and `agent_message_delta`) belongs to a started turn of the speaking agent — a companion who answers history speaks in the patient's turn. Lines spoken outside any agent turn — the nurse's critical-result call, monitor alarms, scenario announcements, the authored answer to a button-style `ask` — get a synthetic turn with a fresh `turnId`: `turn_started` (`synthetic: true` — not the addressed agent's reply; e.g. the MCP bridge leaves such lines out of `ask_patient`/`consult` replies, their `notification` reaches the client as a notice) → `agent_message` → `turn_complete` (`lastMessage` = the line) → `turn_phase idle`. The idle phase is omitted while another turn of the same agent is still running (that turn's own end idles it). A synthetic turn carries the id of the submission that caused it (`""` for real-time clock ticks) and may nest inside the turn whose action triggered it (e.g. a clinician's `wait`).

## 5. Providers

* **AnthropicProvider** uses `@anthropic-ai/sdk` (`client.beta.messages.stream(...)` + `finalMessage()`): `system` = text blocks with `cache_control: {type: "ephemeral"}` on the last stable section; tools with `eager_input_streaming: true` (validate parsed input before running); `output_config: {effort}` when set; **no** `thinking` param, **no** temperature for Claude 4.7+ models (capabilities `rejectsSampling`), **never** forced `tool_choice`; `betas: ["server-side-fallback-2026-07-01"]` + `fallbacks: "default"` for `claude-opus-5-5` / `claude-fable-5-1` / `claude-opus-5` / `claude-sonnet-5-5` on the first-party base URL (omit for Anthropic-compatible third-party endpoints); handle `stop_reason` `refusal`/`max_tokens`/`pause_turn`; echo `message.content` back verbatim via `provider_raw` (after a `fallback` block drop pre-boundary thinking/tool_use blocks); typed SDK errors → `ProviderErrorInfo`. Browser: `dangerouslyAllowBrowser: true` only when the user supplied their own key. Default model `claude-opus-5-5`.
* **OpenAICompatibleProvider**: `POST {baseUrl}/chat/completions` with `stream: true`, `stream_options: {include_usage: true}`; system sections merged into **one** leading system message; tools as `{type:"function", function:{name, description, parameters}}`; assemble `delta.tool_calls[i]` by `index`; GLM: `tool_stream: true` when model starts with `glm-4.6`/`glm-5`, `thinking: {type:"disabled"|"enabled"}` by effort; reasoning deltas (`reasoning_content`) → `reasoning_delta` (never spoken); OpenAI o-/gpt-5 models: `max_completion_tokens` + `reasoning_effort`; others `max_tokens`. (Kimi's temperature ×0.6 applies only on its Anthropic endpoint, `moonshot-anthropic`.)
* **Catalogue** (`PROVIDER_TEMPLATES`, names in zh-CN/en): `anthropic` (https://api.anthropic.com, ANTHROPIC_API_KEY, claude-opus-5-5), `openai` (https://api.openai.com/v1, OPENAI_API_KEY, gpt-5), `xai` (https://api.x.ai/v1, XAI_API_KEY/GROK_API_KEY, grok-4.6), `zhipu` (https://open.bigmodel.cn/api/paas/v4, ZHIPU_API_KEY/ZHIPUAI_API_KEY, glm-4.6), `zai` (https://api.z.ai/api/paas/v4, ZAI_API_KEY, glm-4.6), `zhipu-anthropic` (https://open.bigmodel.cn/api/anthropic, anthropic-messages, ZHIPU_API_KEY/ZHIPUAI_API_KEY, glm-4.6), `deepseek` (https://api.deepseek.com, DEEPSEEK_API_KEY, deepseek-v4-pro), `moonshot` (https://api.moonshot.cn/v1, MOONSHOT_API_KEY, kimi-k2.6), `moonshot-anthropic` (https://api.moonshot.cn/anthropic, anthropic-messages, MOONSHOT_API_KEY, kimi-k2.6, temperature ×0.6), `qwen` (https://dashscope.aliyuncs.com/compatible-mode/v1, DASHSCOPE_API_KEY, qwen-plus), `openrouter` (https://openrouter.ai/api/v1, OPENROUTER_API_KEY, z-ai/glm-5.3), `ollama` (http://localhost:11434/v1, noKey, qwen3), `lmstudio` (http://localhost:1234/v1, noKey, local-model), `offline` (deterministic), `proxy` (/api/llm/stream; `proxy:<provider>` picks the upstream). `browserDirect` marks templates the web client may call directly with a user key (anthropic, openai, openrouter, ollama, lmstudio). Model ids change; users may type any id and `clinicalcraft providers models <id>` lists `GET /models` when available.
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

### 6.1 Hook outputs — where they apply

* **PreToolUse `updatedInput`** applies on every tool path: model tool calls, learner `clinical_action` ops and slash-command tools (`/order`, `/give`, `/exam`, `/read`, …). The new input is re-validated against the tool's `inputSchema` (invalid → refused; for learners an `error` with code `invalid_action`), and then the approval gate (rules and specifiers), the engine and `PostToolUse` all see the rewritten input — a hook cannot launder a denied action into an allowed one, or the reverse. For a `clinical_action` the input is mapped back to the action (`actionFromToolInput`: ids and free-text queries resolve exactly as the tool resolves them; `ask_patient {question}` resolves to one history item); input that names no single case item is refused with `invalid_action` before any approval is asked.
* **PreToolUse `decision`**: `block` refuses the call; `approve` skips the approval prompt (deny rules, plan mode and the practice scope still apply).
* **UserPromptSubmit `additionalContext`** is appended to the learner's message for model-backed nurse, consultant, attending, clinician and custom-agent turns. It is **withheld from patient/companion turns by design** (need-to-know, ARCHITECTURE §4.2): the patient model sees only its `PatientContext` (persona, affect, revealed and selected facts), so a hook cannot inject course notes, diagnoses or results into the patient's voice. `SessionStart` context follows the same rule: it reaches the system prompt of those agents, never the patient's or companion's (nor the examiner's, which judges from the transcript alone).
* **PostToolUse `additionalContext`** is appended to the tool result the model sees (model tool calls only).

## 7. Node layer (`@clinicalcraft/agent/node`)

```
clinicalcraftHome(env): string                                   // CLINICALCRAFT_HOME ?? ~/.clinicalcraft
loadSettings({cwd?, env?, flags?, profile?}): Promise<ResolvedSettings & {files: string[]; issues; projectRoot: string; projectTrusted: boolean}>   // profile defaults to CLINICALCRAFT_PROFILE
                                                                  // untrusted project: project/local `hooks`, provider `headers` and the local file's secret-bearing keys are dropped (issues with code "untrusted-project")
trustProject(cwd, env) / revokeProjectTrust(cwd, env) / isProjectTrusted(root, env) / listTrustedProjects(env)   // <home>/trusted-projects.json (0600): realpath of the root → digest of settings.json + settings.local.json
saveUserSettings(patch, env?): Promise<string>                   // mode 0600
loadMemory(cwd, env): Promise<{text: string; files: string[]}>  // ~/.clinicalcraft/CLINICALCRAFT.md, <root>/.clinicalcraft/CLINICALCRAFT.md, then every CLINICALCRAFT.md (or AGENTS.md fallback) from the project root down to cwd
loadProjectAgents(cwd, env): Promise<AgentProfile[]>              // ~/.clinicalcraft/agents/*.md + .clinicalcraft/agents/*.md
loadProjectCommands(cwd, env): Promise<SlashCommand[]>            // …/commands/*.md (name = filename; nested dirs → "dir:name")
createCommandHookExecutor(cwd): CommandHookExecutor               // child_process spawn("sh", ["-c", cmd]) with stdin JSON, timeout, env CLINICALCRAFT_PROJECT_DIR
JsonlTranscript.create({dir?, sessionId, env?, now?, onError?, redact?}): TranscriptSink   // <home>/sessions/YYYY/MM/DD/<YYYY-MM-DDTHH-MM-SSZ>-<id>.jsonl; credentials masked
listSessions(env, {dir?, limit?, web?: boolean | "only"}?): Promise<{id, path, caseId, startedAt, origin: "local" | "web"}[]>; readTranscript(path): Promise<TranscriptItem[]>
                                                                  // web uploads (<sessions>/web/) only with `web`; their id is the file name and startedAt is clamped to the file's mtime
loadContent({dirs?, builtin? = true}): Promise<{cases: Map<string, {def: CaseDefinition; dir; file}>; facilities: Map<string, {def; file}>; catalogs: Map<…>; issues: {file, issues}[]; dirs: string[]}>
                                                                  // each dir holds catalogs/*.json, facilities/*.json, cases/<id>/case.json; later dirs override ids
resolveNodeProviderConfig(settings, providerId?, model?, env?): ProviderConfig   // reads env keys
createNodeSession(opts?: {caseId?, cwd?, env?, flags?, profile?, facilityId?, transcript?, resume?, sessionId?, dynamicTools?, tools?, retry?, providerFactory?, content?}): Promise<ClinicalSession>
                                                                  // one-call bootstrap used by CLI, MCP and tests; resume = id, unique id prefix, transcript path or "latest"
                                                                  // ("latest" and prefixes only find this machine's recordings; a web upload resumes by exact id or path, without its provider/model or approval mode)
```

## 8. Built-in agents (Markdown profiles, prompts in `agents/builtin.ts`)

| name | role | tools | notes |
|---|---|---|---|
| `patient` | npc | reveal_facts | persona + fact sheet; layperson language; answers in session locale; never diagnoses, never states exam findings/results; volunteer facts may appear in opening; unknowns → fallback |
| `companion` | npc | reveal_facts | parent/spouse when `persona.companion` exists (`answersHistory` routes history questions here) |
| `nurse` | npc | get_vitals, get_results | triage note, vitals, logistics, critical-result call-through; no diagnosis |
| `radiologist`, `pathologist` | npc | get_results | interpret only results the learner has, within case `npcs[].knowledge`; state evidence boundaries |
| `attending` | assistant | get_progress, give_hint | Socratic preceptor; never reveals the answer unless `revealsDiagnosis` |
| `examiner` | examiner | (none) | independent verifier (ZCode goal verifier): judges `rubric` items without `met` from the transcript, must quote evidence, outputs JSON `{items:[{id, met, evidence}], narrative}` in the session locale. Need-to-know: before `finish` (an assessment mid-case) it sees only the rubric item texts — never `judgeGuidance` — and no debrief, and is told the encounter is in progress; after `finish` it also gets `judgeGuidance` and the full authored debrief |
| `clinician` | assistant | all clinical tools | autopilot "doctor": systematic history → exam → targeted workup → decisions; uses `update_workup`; respects approvals |

Offline responders implement the same contract deterministically (matchers + case data), so every feature works with `provider: "offline"`.

## 9. Slash commands (built-in)

`/help`, `/case` (summary & objectives), `/ask [n|text]` (list or ask canonical history questions), `/exam [query]`, `/order <query>`, `/results`, `/read <id> [phase]`, `/give <query>` (intervene), `/vitals`, `/board` (decisions), `/answer <decision> <option…>`, `/phase <id>`, `/wait <min>`, `/hint`, `/status`, `/plan`, `/note <text>`, `/talk <role>` (switch interlocutor), `/consult <role> <question>`, `/autopilot [goal]`, `/assess`, `/debrief`, `/model [id]`, `/provider [id]`, `/approval [mode]`, `/scope [scope]`, `/permissions`, `/compact [agent]`, `/export [path]`, `/lang [zh-CN|en]`, `/clear`, `/quit`. Custom: `.clinicalcraft/commands/*.md` (frontmatter `description`, `argument-hint`, `agent`; body with `$ARGUMENTS`, `$1…$9`).

Router: input starting with `/` → command; `@role text` → message to role (Chinese role names such as `@护士 …`, `@上级 …` — also without a space — resolve through `ADDRESS_ALIASES`, as do `/talk 护士` and `/consult 上级 …`); otherwise → current interlocutor (default `patient`). `/board` lists a locked decision only by number and what it needs (never its prompt or options) and options in `presentedOptions` order, which `/answer <decision> <letter|number>` follows; `/phase` lists only phases the learner can reach or has worked in. A front-end may declare `disabledCommands` (e.g. the web's `quit`, `export`, `lang`, `approval`… — it handles them in its own UI): they are left out of `/help` and refused.

## 10. Transcripts & resume

JSONL lines per `TranscriptItem`. Resume: read items → `actions` (accepted only) replayed through `reduce`, per-agent `message` items restore conversations, `dialogue` items restore the examiner's evidence lines (ACTION narrations, notes, rationales; older transcripts rebuild them from messages and accepted actions), `session_meta` restores case/locale/provider. Items replay by ordinal within a recording segment; a later `session_meta` whose ordinal does not continue the sequence starts a new segment, so a resume that restarted its ordinals never interleaves with the first run. `SessionSnapshot` carries `nextOrdinal` and `dialogue`, so a front-end resuming from a snapshot into the same transcript (the web) continues the ordinals and keeps the evidence. `clinicalcraft --resume <id|prefix|path>` / `--continue` (the most recently started session recorded by this machine, whatever its cwd or front-end). Web uploads (`<sessions>/web/`, written by `POST /api/transcripts/:id`) are untrusted: `sessions list --web` lists them, only an exact id (their file name) or path resumes one, and never with its recorded provider/model or approval mode.
`resumedRuntimeConfig(items)` adds the runtime state a resume continues with (passed as `restore` to `createSession`): `config_changed` patches (locale, approval mode, scope, interlocutor…), the last `plan_updated`, and the patient's/companion's emotional state — their `message` items carry `affectIntensity` (0–3, the speaker's affect when the message was recorded) and the last one per speaker is restored (`restore.affect`).

## 11. Front-end contracts

* **CLI** (`@clinicalcraft/cli`, bin `clinicalcraft`): `play [case]` (default), `exec <prompt>` / `-p <prompt>` with `--case`, `--autopilot`, `--output-format text|json|stream-json` (stream-json = one AgentEvent per line + final `{"type":"result","subtype":"success"|"error_max_turns"|"error_during_execution", "assessment":…, "usage":…}`), `--max-turns`, `--input-format text|stream-json` (Op JSON lines on stdin, incl. `approval_response`), `--to <agent>`, `--assess`, `-q`, `-o <file>`, `--approval`, `--scope`, `--provider`, `--model`, `--base-url`, `--facility`, `--max-tool-rounds`, `--allowed-tools`/`--disallowed-tools`, `--ephemeral`, `--profile`, `--lang`, `--resume`, `--continue` (headless `default|strict|plan` deny every approval request; `auto|bypass` approve the rest; exit 0/1/2/3 = ok/error/usage/max turns); `cases list|show|validate|verify|new|schema`; `facilities list|validate`; `providers list|test|models`; `config get|set|path`; `trust [--revoke|--list]` (trust the project's `.clinicalcraft` settings: hooks and provider/server keys; pinned to their contents); `sessions list [--web]|show`; `serve`; `mcp`; `import-v4 <html|.part01|.zip…>`; `eval --cases … --provider … --model …` (autopilot benchmark → markdown/JSON report).
* **Server** (`@clinicalcraft/server`): `startServer({port?, host?, token?, staticDir?, settings, contentDirs?, env?, cwd?, assetDirs?, maxBodyBytes?}) → Promise<{url, port, host, close}>` (`createRequestHandler` for embedding). Routes: `GET /api/health`, `GET /api/content/index`, `GET /api/content/cases/:id` (solution stripped), `GET /api/content/facilities/:id`, `GET /api/content/catalogs/:id`, `GET /local-assets/*` (local-only assets, see docs/ASSETS.md; passive types only — png, jpg/jpeg, webp, gif, pdf, json, gz, glb, mp3, mp4, webm — each non-PDF sandboxed by its own CSP; anything else, SVG/HTML/XML/scripts included, is 404 JSON like an asset that is not installed), `GET /api/providers` (templates + `configured: boolean`, never keys), `POST /api/llm/stream` (body `{provider, model, request: ChatRequest}` → `text/event-stream` of `data: StreamEvent` lines, `event: done` at end), `POST /api/transcripts/:sessionId` (append JSONL items to `<sessions>/web/<id>.jsonl`; at most 16 MiB per file and 500 files — `transcriptQuota` — else 413 `transcript_quota`). Loopback only unless `token` is set (required for any non-loopback host; accepted as `Authorization: Bearer`, `?token=` — which also sets an `HttpOnly` cookie — or that cookie); a loopback-only server rejects non-loopback `Host` headers (DNS rebinding); cross-origin API calls are refused except from the Vite dev server (`localhost`/`127.0.0.1` ports 5173–5199). Default port 5178.
* **MCP** (`@clinicalcraft/mcp`): `runMcpServer({stdin?, stdout?, settings, env?, cwd?, content?, maxSessions? = 32, log?})` JSON-RPC 2.0 over newline-delimited stdio (protocol versions 2025-06-18, 2025-03-26, 2024-11-05); `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list`, `resources/read`, `notifications/cancelled`. Tools (17): `list_cases {locale?}` (spoiler-free titles in title order with opaque handles — `caseHandle(id)` — never the diagnosis-bearing case ids), `start_case {case_id, locale?, facility_id?}` (a handle, or an exact id; no enum in the schema) → session id; resources and mid-case `get_debrief` reports carry the handle, not the id; then every clinical tool from §3 except the dynamic `walk_to`, each with a required `session_id`, plus `get_debrief`. Tool failures are results with `isError: true`. Resources: `clinicalcraft://cases`, `clinicalcraft://session/{id}/state`, `clinicalcraft://session/{id}/transcript`. Approval mode is `bypass` (the MCP client owns approvals) unless a settings layer — user/project/local file, env or a flag such as `clinicalcraft mcp --approval` — sets `approvalMode` (`mcpApprovalMode`).
* **Web**: runs `ClinicalSession` in the browser with `resolveProvider` from the settings panel: offline (default), proxy (when served by `clinicalcraft serve`), or direct (user key; Anthropic with `dangerouslyAllowBrowser`, OpenAI-compatible fetch). Declares the `walk_to` dynamic tool.
