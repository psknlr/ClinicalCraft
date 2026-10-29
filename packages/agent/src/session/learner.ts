/**
 * The learner's input and tool path: text to an agent (UserPromptSubmit hooks, then the agent's turn), slash
 * commands (run against a `CommandHost` over the session), and the learner's own clinical actions and tools —
 * the same sequence as an agent's tool call: PreToolUse hooks (an `updatedInput` is re-validated and mapped
 * back), the tool's precheck, the approval gate, in embodied mode a spatial re-check right before the engine
 * commit, the engine, PostToolUse hooks. Only learner tools may run on this path (never an NPC's or a
 * front-end's), and simulation-owned flags can never be set directly.
 */
import { ClinicalActionSchema, historyVoice, t, type ClinicalAction, type ReduceResult, type SessionState } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { agentKind } from "../agents/prompts.js";
import { executeCommand, type CommandHost } from "../commands.js";
import { actionToolName } from "../permissions.js";
import { rejectionText } from "../tools/clinical.js";
import { isLearnerTool } from "../tools/learner.js";
import { actionIntent, spatialCodeOf, spatialRefusal } from "../tools/spatial.js";
import type { ToolContext, ToolDefinition, ToolOutput } from "../tools/types.js";
import { validateArgs } from "../tools/validate.js";
import { actionFromToolInput, actionToolArgs } from "./action-input.js";
import type { AgentTurnMode } from "./agent-turns.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { spokenAnswer } from "./nonverbal.js";
import { sessionSnapshot } from "./resume.js";
import { parseLearnerInput, resolveAgentAlias } from "./router.js";
import type { ToolPathExtra } from "./tool-path.js";

/** The learner's side of one session. */
export class LearnerPath {
  constructor(private readonly k: SessionKernel) {}

  /* ---------------------------------------------------------------- */
  /* Messages and slash commands                                       */
  /* ---------------------------------------------------------------- */

  /** A `user_message` op: a slash command, or text to an agent (`@nurse …`, `to`, else the interlocutor). */
  async handleUserMessage(id: string, text: string, to: string | null): Promise<void> {
    const k = this.k;
    if (typeof text !== "string") {
      k.emit(id, { type: "error", message: rt(k.locale, "error.internal", { message: "user_message.text must be a string" }), code: "invalid_op" });
      return;
    }
    let target: string;
    let body = text;
    if (to === null) {
      const parsed = parseLearnerInput(text, k.availableAgents());
      if (parsed.kind === "command") return this.handleCommand(id, parsed.name, parsed.args);
      target = parsed.to ?? k.interlocutor;
      body = parsed.text;
    } else {
      target = resolveAgentAlias(String(to));
    }
    await k.ops.withTurn(id, (signal) => this.sendMessage(id, target, body, signal));
  }

  /**
   * Learner text to an agent — typed (`user_message`) or produced by a slash
   * command (`/ask …`, `/consult …`, custom templates): UserPromptSubmit hooks
   * (may block or add context) → start → transcript → the agent's turn.
   */
  async sendMessage(id: string, target: string, body: string, signal: AbortSignal, mode: AgentTurnMode = "message"): Promise<void> {
    const k = this.k;
    if (!k.availableAgents().includes(target)) {
      k.emit(id, { type: "error", message: rt(k.locale, "warning.unknownAgent", { agent: target }), code: "unknown_agent" });
      return;
    }
    const hook = await k.runHook({ hook_event_name: "UserPromptSubmit", prompt: body, to: target }, signal);
    for (const w of hook.warnings) k.emit(id, { type: "warning", message: w });
    if (hook.blocked) {
      k.emit(id, { type: "warning", message: rt(k.locale, "warning.promptBlocked", { reason: hook.reason ?? "" }) });
      return;
    }
    if (signal.aborted) {
      k.emit(id, { type: "warning", message: rt(k.locale, "submission.cancelled", { reason: rt(k.locale, "submission.reason.interrupt") }) });
      return;
    }
    if (body.trim()) {
      k.ensureStarted(id);
      k.conversations.addDialogue({ who: "learner", speaker: "learner", text: target === "patient" ? body : `@${target} ${body}` });
    }
    await k.agents.runAgent(id, target, body, signal, hook.additionalContext, mode);
  }

  /** A slash command (`slash_command` op or typed `/…`); refused when the front-end disabled it. */
  async handleCommand(id: string, name: string, args: string): Promise<void> {
    const k = this.k;
    const lower = name.toLowerCase();
    if ((k.opts.disabledCommands ?? []).some((n) => n.toLowerCase() === lower)) {
      k.emit(id, { type: "command_output", name: lower, text: rt(k.locale, "cmd.disabled", { name: lower }) });
      return;
    }
    await k.ops.withTurn(id, (signal) => executeCommand(this.commandHost(id, name, signal), lower, args));
  }

  /** What a slash command may do in this session (its output goes to `command_output`). */
  private commandHost(id: string, name: string, signal: AbortSignal): CommandHost {
    const k = this.k;
    return {
      caseDef: k.caseDef,
      get settings() {
        return k.settings;
      },
      get locale() {
        return k.locale;
      },
      state: () => k.state,
      plan: () => k.workupPlan(),
      interlocutor: () => k.interlocutor,
      sessionRules: () => k.gate.permissionState.sessionRules,
      agentNames: () => k.availableAgents(),
      commands: () => [...k.slash],
      output: (text, data) => k.emit(id, { type: "command_output", name, text, ...(data !== undefined ? { data } : {}) }),
      warn: (message) => k.emit(id, { type: "warning", message }),
      resolvedModel: () => {
        if (k.settings.provider === "offline") return "deterministic";
        const m = k.models.model("patient", false);
        return m.model ?? m.config?.model ?? k.settings.model ?? null;
      },
      runTool: (toolName, args) => this.runTool(id, toolName, args, signal),
      learnerAction: (action) => this.action(id, { ...action, by: action.by ?? "learner" } as ClinicalAction, signal),
      sendMessage: (to, text) => this.sendMessage(id, (to ?? k.interlocutor).replace(/^@/, "").toLowerCase(), text, signal),
      promptAgent: (to, text) => this.sendMessage(id, resolveAgentAlias((to ?? k.interlocutor).replace(/^@/, "").toLowerCase()), text, signal, "prompt"),
      ignoresPromptsOffline: (agent) => {
        const profile = k.profiles.get(resolveAgentAlias(agent));
        if (!profile || k.models.model(profile.name).provider) return false;
        const kind = agentKind(profile);
        return kind === "examiner" || kind === "attending";
      },
      autopilot: (goal) => k.agents.runAutopilot(id, goal, undefined, signal),
      assess: async () => void (await k.agents.runAssessment(id, signal)),
      compact: (agent) => k.conversations.compact(id, agent ?? null, "manual", signal),
      configure: async (patch) => k.ops.configure(id, patch),
      clearConversations: () => {
        // Persisted as an empty compaction per agent, so a resume does not resurrect them.
        k.conversations.clear();
        k.patientMemory.patient.approached = false;
        k.patientMemory.companion.approached = false;
      },
      snapshot: () => sessionSnapshot(k),
      embodied: () => k.embodied !== null,
      skills: () => k.skillList.map((sk) => ({ id: sk.id, name: t(sk.name, k.locale) })),
      shutdown: async () => {
        k.closing = true;
        k.ops.enqueue(id, { type: "shutdown" }).catch(() => undefined);
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /* Clinical actions                                                  */
  /* ---------------------------------------------------------------- */

  /** A `clinical_action` op: validated, attributed to the learner (its rationale kept for the examiner), then `action`. */
  async handleClinicalAction(id: string, raw: ClinicalAction, rationale?: string): Promise<ReduceResult | null> {
    const k = this.k;
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (!parsed.success) {
      k.emit(id, { type: "error", message: rt(k.locale, "error.invalidAction", { errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }), code: "invalid_action" });
      return null;
    }
    const action = { ...parsed.data, by: parsed.data.by ?? "learner" } as ClinicalAction;
    if (rationale?.trim()) k.conversations.addDialogue({ who: "learner", speaker: "learner", text: `[${action.type}] ${rationale.trim()}` });
    return k.ops.withTurn(id, (signal) => this.action(id, action, signal));
  }

  /**
   * A learner action through PreToolUse hooks and the approval gate (as its
   * equivalent tool), then the engine. A hook's `updatedInput` is re-validated
   * and mapped back to the action, so the gate, the engine and PostToolUse all
   * see the rewritten input.
   */
  async action(id: string, requested: ClinicalAction, signal?: AbortSignal): Promise<ReduceResult | null> {
    const k = this.k;
    const L = k.locale;
    // Flags owned by the simulation (set by interventions / scenario events) drive objectives,
    // rubric items and trend stops: setting or clearing them directly would bypass the
    // approval gate and the practice scope of the action that owns them.
    if (requested.type === "flag" && k.ownedFlags.has(requested.flag)) {
      k.emit(id, { type: "error", message: rt(L, "action.denied", { reason: rt(L, "action.flagOwned", { flag: requested.flag }) }), code: "permission_denied" });
      return null;
    }
    let action = requested;
    const toolName = actionToolName(action);
    const tool = toolName ? k.registry.get(toolName) : undefined;
    let args = tool ? actionToolArgs(k.caseDef, action, L) : null;
    if (tool && args) {
      const pre = await this.preToolUse(id, tool, args, signal);
      if (!pre.ok) return null;
      if (pre.updated) {
        const mapped = actionFromToolInput(k.caseDef, action, pre.input, L, k.state.phase);
        if (!mapped.ok) {
          k.emit(id, { type: "error", message: rt(L, "action.hookInputUnresolved", { tool: tool.name, detail: mapped.detail }), code: "invalid_action" });
          return null;
        }
        action = mapped.action;
        args = pre.input;
      }
      const early = tool.precheck?.(args, k.tools.context("learner", id, signal));
      if (early) {
        const code = spatialCodeOf(early);
        k.emit(id, code ? { type: "error", message: early.output, code } : { type: "warning", message: early.output });
        return null;
      }
      if (await this.authorizeTool(id, tool, args, pre.approved, signal)) return null;
    }
    if (!["start", "set-phase", "note", "flag"].includes(action.type)) k.ensureStarted(id);
    // Embodied: the body may have moved while the approval was pending — re-check right before the engine commit.
    const embodied = k.embodied;
    const intent = embodied && tool ? actionIntent(action) : null;
    if (intent && embodied) {
      const check = embodied.check(PRIMARY_ACTOR, intent, true);
      if (!check.ok) {
        k.emit(id, { type: "error", message: spatialRefusal(check, L).output, code: check.code });
        return null;
      }
    }
    let result!: ReduceResult;
    // Who answers a button question is decided on the state it is asked in (the engine judges it there too).
    const voice = action.type === "ask" ? historyVoice(k.caseDef, k.state, action.itemId) : null;
    const asked = k.state;
    const commit = () => (result = k.dispatch(action, id));
    if (intent && embodied && tool) {
      await embodied.gate().traced!(PRIMARY_ACTOR, tool.name, args ?? {}, async () => (commit(), { ok: !result.rejected, output: "" }));
    } else commit();
    // The action type picks the specific wording (a `set-phase` to an automatic phase is "not switchable", not "locked").
    const rejection = result.rejected ? rt(L, "action.rejected", { code: result.rejected.code, message: rejectionText(L, result.rejected.code, action.type) }) : null;
    if (rejection) {
      k.emit(id, { type: "warning", message: rejection });
    } else if (action.type === "ask") {
      this.speakAuthoredAnswer(id, action.itemId, voice === "companion" ? "companion" : "patient", asked);
    }
    if (tool && args) {
      // Same hook sequence as an agent's tool call: PreToolUse → gate → run → PostToolUse.
      let output = rejection ?? "";
      if (!rejection) {
        try {
          output = tool.summarize(args, k.tools.context("learner", id, signal));
        } catch {
          output = tool.name;
        }
      }
      const post = await k.runHook({ hook_event_name: "PostToolUse", agent: "learner", tool_name: tool.name, tool_input: args, tool_response: { ok: !rejection, output } }, signal);
      for (const w of post.warnings) k.emit(id, { type: "warning", message: w });
    }
    return result;
  }

  /**
   * Button-style ask: the patient — or the companion (`historyVoice`: one who answers history, or any companion
   * while the patient cannot speak, relaying the patient's own words) — speaks the authored answer.
   */
  private speakAuthoredAnswer(id: string, itemId: string, agent: "patient" | "companion", askedIn: SessionState): void {
    const k = this.k;
    const c = k.caseDef;
    const item = c.history.find((h) => h.id === itemId);
    if (!item) return;
    const companion = c.patient.persona.companion;
    const speaker = agent === "companion" && companion ? t(companion.name, k.locale) : t(c.patient.displayName, k.locale);
    const question = t(item.question, k.locale);
    const text = spokenAnswer(c, askedIn, itemId, k.locale, agent);
    k.patientMemory[agent].approached = true;
    k.conversations.append(agent, [
      { role: "user", content: [{ type: "text", text: question }] },
      { role: "assistant", content: [{ type: "text", text }] },
    ]);
    k.conversations.addDialogue({ who: "learner", speaker: "learner", text: question }, { who: agent, speaker, text });
    k.speakLine(id, { agent, speaker, text, grounded: [itemId] });
  }

  /* ---------------------------------------------------------------- */
  /* Tools                                                             */
  /* ---------------------------------------------------------------- */

  /**
   * PreToolUse hooks for a learner tool use (direct action or slash command):
   * a block refuses; an `updatedInput` replaces the input after validation
   * against the tool's schema (as for model tool calls in `executeToolCall`).
   */
  private async preToolUse(
    id: string,
    tool: ToolDefinition<any>,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ ok: true; input: Record<string, unknown>; updated: boolean; approved: boolean } | { ok: false; refusal: ToolOutput }> {
    const k = this.k;
    const L = k.locale;
    const pre = await k.runHook({ hook_event_name: "PreToolUse", agent: "learner", tool_name: tool.name, tool_input: args }, signal);
    for (const w of pre.warnings) k.emit(id, { type: "warning", message: w });
    if (pre.blocked) {
      const message = rt(L, "action.denied", { reason: pre.reason ?? "" });
      k.emit(id, { type: "error", message, code: "permission_denied" });
      return { ok: false, refusal: { ok: false, output: message } };
    }
    if (pre.updatedInput === undefined) return { ok: true, input: args, updated: false, approved: pre.approved };
    const validated = validateArgs(tool.inputSchema, pre.updatedInput);
    if (!validated.ok) {
      const message = rt(L, "action.hookInputInvalid", { tool: tool.name, errors: validated.errors.join("; ") });
      k.emit(id, { type: "error", message, code: "invalid_action" });
      return { ok: false, refusal: { ok: false, output: message } };
    }
    return { ok: true, input: validated.value as Record<string, unknown>, updated: true, approved: pre.approved };
  }

  /** The approval gate for a learner tool use; returns a refusal output or null when allowed. */
  private async authorizeTool(id: string, tool: ToolDefinition<any>, args: Record<string, unknown>, hookApproved: boolean, signal?: AbortSignal): Promise<ToolOutput | null> {
    return (await this.authorizeToolDetailed(id, tool, args, hookApproved, signal))?.refusal ?? null;
  }

  /** `authorizeTool` with the kind of refusal (a denial, or an abort that cancels the call). */
  private async authorizeToolDetailed(
    id: string,
    tool: ToolDefinition<any>,
    args: Record<string, unknown>,
    hookApproved: boolean,
    signal?: AbortSignal,
    ctx: ToolContext = this.k.tools.context("learner", id, signal),
  ): Promise<{ refusal: ToolOutput; status: "denied" | "cancelled" } | null> {
    const k = this.k;
    const L = k.locale;
    const gate = await k.gate.authorize(id, { agent: "learner", tool, args, ctx, hookApproved, ...(signal ? { signal } : {}) });
    if (gate.kind === "deny") {
      const message = rt(L, "action.denied", { reason: gate.reason || gate.ruleId });
      k.emit(id, { type: "error", message, code: "permission_denied" });
      return { refusal: { ok: false, output: message }, status: "denied" };
    }
    if (gate.kind === "abort") {
      const message = rt(L, "action.cancelled");
      k.emit(id, { type: "warning", message });
      return { refusal: { ok: false, output: message }, status: "cancelled" };
    }
    return null;
  }

  /** Run a tool as the learner (slash commands): validation, PreToolUse hooks (`updatedInput` re-validated), the approval gate, the tool, PostToolUse. */
  async runTool(id: string, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolOutput> {
    return (await this.runToolDetailed(id, name, args, signal)).output;
  }

  /**
   * `runTool` with the tool path's status (ok, error, invalid, blocked, denied, cancelled) — and, in
   * embodied mode, the acting body and the world action carrying the call out (`extra`).
   */
  async runToolDetailed(id: string, name: string, args: Record<string, unknown>, signal?: AbortSignal, extra: ToolPathExtra = {}): Promise<{ output: ToolOutput; status: string }> {
    const k = this.k;
    const L = k.locale;
    // Only the learner's tools — never an NPC's (reveal_facts, get_progress…) or a front-end's (review S2).
    if (!isLearnerTool(name)) return { output: { ok: false, output: rt(L, "tool.notLearnerTool", { tool: name }), data: { code: "NOT_A_LEARNER_TOOL" } }, status: "invalid" };
    const tool = k.registry.get(name);
    if (!tool) return { output: { ok: false, output: rt(L, "tool.unknownTool", { tool: name, tools: "-" }) }, status: "invalid" };
    const validated = validateArgs(tool.inputSchema, args);
    if (!validated.ok) return { output: { ok: false, output: rt(L, "tool.invalidArgs", { tool: name, errors: validated.errors.join("; ") }) }, status: "invalid" };
    const pre = await this.preToolUse(id, tool, validated.value as Record<string, unknown>, signal);
    if (!pre.ok) return { output: pre.refusal, status: "blocked" };
    const input = pre.input;
    const ctx = () => k.tools.context("learner", id, signal, extra);
    // Refused before the gate (no approval prompt for a call that cannot run, e.g. a locked decision).
    const early = tool.precheck?.(input, ctx());
    if (early) return { output: early, status: "error" };
    const refused = await this.authorizeToolDetailed(id, tool, input, pre.approved, signal, ctx());
    if (refused) return { output: refused.refusal, status: refused.status };
    if (!tool.readOnly) k.ensureStarted(id);
    let out: ToolOutput;
    try {
      out = await tool.run(input, ctx());
    } catch (err) {
      out = { ok: false, output: rt(L, "tool.failed", { message: err instanceof Error ? err.message : String(err) }) };
    }
    const post = await k.runHook({ hook_event_name: "PostToolUse", agent: "learner", tool_name: name, tool_input: input, tool_response: { ok: out.ok, output: out.output } }, signal);
    for (const w of post.warnings) k.emit(id, { type: "warning", message: w });
    return { output: out, status: out.ok ? "ok" : "error" };
  }
}
