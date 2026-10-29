/**
 * Agent turns (docs/PROTOCOL.md §4): one turn of an agent — started, run as the kind of agent it is, finished
 * (`turn_complete` or `turn_aborted`, then idle) — whether the learner addressed it or another agent's tool
 * asked it. The patient and the companion answer through the select → voice pipeline; the examiner runs an
 * assessment (or answers a custom command's prompt); the clinician without a model replays the offline
 * walkthrough (with its body in embodied mode); every other agent runs the generic tool loop with its model,
 * else — and when a model call fails or refuses with nothing said — its deterministic offline responder.
 * Also the autopilot's host: the clinician driving the case through the same tool path.
 */
import { assess, patientNonVerbal } from "@clinicalcraft/core";
import { attendingOffline, consultantOffline, examinerOffline, nurseOffline } from "../agents/offline.js";
import { agentKind, buildSystemSections, npcDisplayName, patientLocation } from "../agents/prompts.js";
import type { AgentProfile } from "../agents/types.js";
import { executeToolCall, runAgentTurn } from "../loop.js";
import type { AgentRole } from "../protocol.js";
import type { ChatMessage, ChatPart } from "../providers/types.js";
import { retryOption } from "./agent-models.js";
import { offlineClinicianTurn, runAutopilot, type AgentOutcome, type AutopilotHost } from "./autopilot.js";
import { embodiedOfflineTurn } from "./embodied-autopilot.js";
import { runExaminer, runExaminerPrompt, type ExaminerVerdict } from "./examiner.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { runPatientTurn, selectFacts } from "./patient-pipeline.js";
import { conversationKey, type StaffVoice } from "./staff-voice.js";

/** How learner text reaches an agent: a message, or a custom slash command's prompt (PROTOCOL §9). */
export type AgentTurnMode = "message" | "prompt";

const TOP_AGENT_ROLES = new Set(["patient", "companion"]);

/** The agent turns of one session. */
export class AgentTurns {
  constructor(private readonly k: SessionKernel) {}

  /**
   * Run one agent turn (also used for nested asks from tools). `mode`
   * "prompt" (custom slash commands): the examiner answers the text instead
   * of running an assessment; every other agent takes it as a message.
   * `voice`: the staff member the learner addressed (`user_message.staff`) —
   * they answer under their own name, with their own conversation.
   */
  async runAgent(
    id: string,
    name: string,
    utterance: string,
    signal?: AbortSignal,
    extraContext: readonly string[] = [],
    mode: AgentTurnMode = "message",
    voice: StaffVoice | null = null,
  ): Promise<{ text: string; grounded: string[] }> {
    const k = this.k;
    const turnId = k.newId();
    const started = k.now();
    // Staff speak under their case/facility name — the addressed colleague's own: say it now, before the first streamed text.
    const speaker = TOP_AGENT_ROLES.has(name) ? null : (voice?.name ?? npcDisplayName(k.caseDef, k.facility, name, k.locale));
    k.emit(id, { type: "turn_started", turnId, agent: name, ...(speaker && speaker !== name ? { speaker } : {}), ...(voice ? { staffId: voice.staffId } : {}) });
    let outcome: AgentOutcome;
    try {
      const profile = k.profiles.get(name);
      if (!profile) {
        outcome = { status: "error", text: "", grounded: [], error: { message: rt(k.locale, "warning.unknownAgent", { agent: name }) } };
      } else {
        const kind = agentKind(profile);
        if (kind === "patient" || kind === "companion") outcome = await this.runPatientAgent(id, turnId, kind, utterance, signal);
        else if (kind === "examiner") outcome = mode === "prompt" ? await this.examinerPromptTurn(id, turnId, profile, utterance, signal) : await this.examinerTurn(id, turnId, signal);
        else if (kind === "clinician" && !k.models.model("clinician").provider) outcome = await this.offlineClinicianBlock(id, turnId, k.models.model("clinician").maxToolRounds, signal);
        else outcome = await this.runModelAgent(id, turnId, profile, utterance, signal, extraContext, voice);
      }
    } catch (err) {
      outcome = { status: "error", text: "", grounded: [], error: { message: err instanceof Error ? err.message : String(err) } };
    }
    this.finishTurn(id, turnId, name, outcome, started);
    return { text: outcome.text, grounded: outcome.grounded };
  }

  /** End a turn: `turn_complete` or `turn_aborted` (an `error` first when it failed), then the idle phase. */
  finishTurn(id: string, turnId: string, agent: AgentRole, outcome: AgentOutcome, started: number): void {
    const k = this.k;
    const durationMs = Math.max(0, k.now() - started);
    switch (outcome.status) {
      case "end_turn":
      case "refusal":
      case "max_tokens":
        k.emit(id, { type: "turn_complete", turnId, agent, lastMessage: outcome.text || null, durationMs });
        break;
      case "max_tool_rounds":
      case "interrupted":
      case "denied":
        k.emit(id, { type: "turn_aborted", turnId, agent, reason: outcome.status });
        break;
      case "error": {
        const e = outcome.error;
        const info = e && "kind" in e ? e : null;
        k.emit(id, {
          type: "error",
          message: e?.message ?? "error",
          ...(info?.code !== undefined ? { code: String(info.code) } : {}),
          ...(info ? { retryable: info.retryable, auth: info.kind === "auth" } : {}),
        });
        k.emit(id, { type: "turn_aborted", turnId, agent, reason: "error" });
        break;
      }
      default: {
        const never: never = outcome.status;
        void never;
      }
    }
    k.emit(id, { type: "turn_phase", turnId, agent, phase: "idle" });
  }

  private emitAgentMessage(id: string, turnId: string, agent: AgentRole, text: string, grounded: string[], voice: StaffVoice | null = null): void {
    const k = this.k;
    const speaker = TOP_AGENT_ROLES.has(agent) ? agent : (voice?.name ?? npcDisplayName(k.caseDef, k.facility, agent, k.locale));
    k.emit(id, { type: "agent_message", turnId, agent, speaker, text, grounded, ...(voice ? { staffId: voice.staffId } : {}) });
    k.conversations.addDialogue({ who: agent, speaker, text });
  }

  private async runPatientAgent(id: string, turnId: string, target: "patient" | "companion", utterance: string, signal?: AbortSignal): Promise<AgentOutcome> {
    const k = this.k;
    const c = k.caseDef;
    const companion = c.patient.persona.companion;
    if (target === "companion" && !companion) {
      k.emit(id, { type: "warning", message: rt(k.locale, "warning.noCompanion") });
      return { status: "end_turn", text: "", grounded: [] };
    }
    let speaker: "patient" | "companion" = target;
    if (speaker === "patient" && utterance.trim() && companion && patientNonVerbal(c, k.state)) {
      // The patient cannot speak (`patient.nonVerbalWhen`): the companion answers, whatever `answersHistory` says.
      speaker = "companion";
    } else if (speaker === "patient" && utterance.trim() && companion?.answersHistory) {
      // The companion answers history — except items authored as the patient's own words (`speaker: "patient"`).
      const selected = selectFacts(c, k.state, utterance, k.locale).selected;
      const own = selected.length > 0 && selected.every((id) => c.history.find((h) => h.id === id)?.speaker === "patient");
      if (!own) speaker = "companion";
    }
    const profile = k.profiles.get(speaker)!;
    const m = k.models.model(profile.name);
    const settings = k.settings.patient;
    const llm = m.provider
      ? {
          provider: m.provider,
          ...(m.model ? { model: m.model } : {}),
          ...(m.temperature !== undefined ? { temperature: m.temperature } : {}),
          ...(m.effort ? { effort: m.effort } : {}),
          ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
          ...retryOption(k.models.retryFor(m)),
        }
      : null;
    k.currentUtterance = utterance;
    try {
      const res = await runPatientTurn({
        caseDef: c,
        locale: k.locale,
        utterance,
        speaker,
        profile,
        state: () => k.state,
        dispatch: (action) => k.dispatch(action, id),
        memory: k.patientMemory[speaker],
        history: k.conversations.of(speaker),
        llm,
        pipeline: settings.pipeline,
        strictGrounding: settings.strictGrounding,
        offlineFallback: settings.offlineFallback,
        scene: patientLocation(c, k.facility, k.locale),
        ...(signal ? { signal } : {}),
        emit: (msg) => k.emit(id, msg),
        onUsage: (u) => k.models.trackUsage(id, profile.name, u),
        ...(m.provider
          ? {
              runToolTurn: (system, parts) =>
                runAgentTurn({
                  host: k.tools.loopHost(id),
                  agent: profile,
                  provider: m.provider!,
                  system,
                  history: k.conversations.of(speaker),
                  userParts: parts,
                  tools: k.toolsFor(profile.name),
                  maxToolRounds: m.maxToolRounds,
                  turnId,
                  emit: (msg) => k.emit(id, msg),
                  ...(signal ? { signal } : {}),
                  streamText: false,
                  request: k.models.requestOptions(m),
                  ...retryOption(k.models.retryFor(m)),
                  onUsage: (u) => k.models.trackUsage(id, profile.name, u),
                  now: k.now,
                }),
            }
          : {}),
      });
      for (const w of res.warnings) k.emit(id, { type: "warning", message: w });
      if (res.diagnostics?.length) k.recorder?.record("diagnostic", { agent: speaker, source: "grounding", detail: res.diagnostics });
      if (res.aborted) return { status: "interrupted", text: "", grounded: [] };
      if (res.error) return { status: "error", text: "", grounded: [], error: res.error };
      if (res.narrated) {
        // A narration (the patient cannot speak, or an aside): the narrator's line — never streamed as the
        // patient's words and never kept in their voice history; the examiner's dialogue has it as narration.
        k.emit(id, { type: "agent_message", turnId, agent: speaker, speaker: res.speakerName, text: res.text, grounded: [], grounding: "narrated", nonverbal: null });
        k.conversations.addDialogue({ who: speaker, speaker: res.speakerName, text: res.text });
        return { status: "end_turn", text: res.text, grounded: [] };
      }
      k.conversations.append(speaker, res.messages);
      if (res.text) {
        k.emit(id, { type: "agent_message_delta", turnId, agent: speaker, delta: res.text });
        k.emit(id, { type: "agent_message", turnId, agent: speaker, speaker: res.speakerName, text: res.text, grounded: res.grounded, grounding: res.grounding, nonverbal: res.nonverbal });
        k.conversations.addDialogue({ who: speaker, speaker: res.speakerName, text: res.text });
      }
      return { status: "end_turn", text: res.text, grounded: res.grounded };
    } finally {
      k.currentUtterance = null;
    }
  }

  private async runModelAgent(id: string, turnId: string, profile: AgentProfile, utterance: string, signal?: AbortSignal, extraContext: readonly string[] = [], voice: StaffVoice | null = null): Promise<AgentOutcome> {
    const k = this.k;
    const m = k.models.model(profile.name);
    if (!m.provider) return this.offlineReply(id, turnId, profile, utterance, false, voice);
    // each colleague keeps their own conversation with the learner (two nurses share a profile, never a memory)
    const key = conversationKey(profile.name, voice);
    await k.conversations.maybeAutoCompact(id, key, signal);
    const parts: ChatPart[] = [{ type: "text", text: utterance.trim() || rt(k.locale, "npc.approach") }];
    for (const extra of extraContext) parts.push({ type: "text", text: extra });
    const turn = await runAgentTurn({
      host: k.tools.loopHost(id),
      agent: profile,
      provider: m.provider,
      system: buildSystemSections(profile, { ...k.promptContext(), ...(voice ? { speakingAs: { name: voice.name, role: voice.role } } : {}) }),
      history: k.conversations.of(key),
      userParts: parts,
      tools: k.toolsFor(profile.name),
      maxToolRounds: m.maxToolRounds,
      turnId,
      emit: (msg) => k.emit(id, msg),
      ...(signal ? { signal } : {}),
      request: k.models.requestOptions(m),
      ...retryOption(k.models.retryFor(m)),
      onAssistantText: (text) => this.emitAgentMessage(id, turnId, profile.name, text, [], voice),
      onUsage: (u) => k.models.trackUsage(id, profile.name, u),
      now: k.now,
    });
    k.conversations.commitTurn(key, turn);
    const fallback = k.settings.patient.offlineFallback && agentKind(profile) !== "clinician" && !signal?.aborted;
    if (turn.stopReason === "error" && fallback) {
      k.emit(id, { type: "warning", message: rt(k.locale, "warning.offlineFallback", { agent: profile.name, error: turn.error?.message ?? "error" }) });
      return this.offlineReply(id, turnId, profile, utterance, true, voice);
    }
    // A refusal with nothing said (the loop already warned): the deterministic responder answers, as for an error.
    if (turn.stopReason === "refusal" && !turn.text.trim() && fallback) {
      k.emit(id, { type: "warning", message: rt(k.locale, "warning.refusalFallback", { agent: profile.name }) });
      return this.offlineReply(id, turnId, profile, utterance, true, voice);
    }
    return { status: turn.stopReason, text: turn.text, grounded: turn.grounded, ...(turn.error ? { error: turn.error } : {}), toolCalls: turn.toolCalls };
  }

  /** Deterministic responder for agents without a model. */
  private offlineReply(id: string, turnId: string, profile: AgentProfile, utterance: string, userAlreadyRecorded: boolean, voice: StaffVoice | null = null): AgentOutcome {
    const k = this.k;
    const ctx = { caseDef: k.caseDef, locale: k.locale, state: () => k.state };
    const kind = agentKind(profile);
    let text: string;
    switch (kind) {
      case "nurse":
        text = nurseOffline(ctx, utterance);
        break;
      case "radiologist":
      case "pathologist":
        text = consultantOffline(kind, ctx, utterance);
        break;
      case "attending":
        text = attendingOffline(ctx, (action) => k.dispatch(action, id), utterance).text;
        break;
      case "examiner":
        text = examinerOffline(k.caseDef, assess(k.caseDef, k.state), k.locale).narrative;
        break;
      default:
        text = rt(k.locale, "agent.offline.generic", { agent: profile.name });
    }
    const messages: ChatMessage[] = [];
    if (utterance.trim() && !userAlreadyRecorded) messages.push({ role: "user", content: [{ type: "text", text: utterance }] });
    messages.push({ role: "assistant", content: [{ type: "text", text }] });
    k.conversations.append(conversationKey(profile.name, voice), messages);
    k.emit(id, { type: "agent_message_delta", turnId, agent: profile.name, delta: text });
    this.emitAgentMessage(id, turnId, profile.name, text, [], voice);
    return { status: "end_turn", text, grounded: [] };
  }

  /* ---------------------------------------------------------------- */
  /* Examiner                                                          */
  /* ---------------------------------------------------------------- */

  /** Talking to the examiner runs an assessment; the narrative is its reply. */
  private async examinerTurn(id: string, turnId: string, signal?: AbortSignal): Promise<AgentOutcome> {
    const verdict = await this.runAssessment(id, signal ?? new AbortController().signal);
    if (signal?.aborted) return { status: "interrupted", text: "", grounded: [] };
    const text = verdict.narrative ?? "";
    if (text) this.emitAgentMessage(id, turnId, "examiner", text, []);
    return { status: "end_turn", text, grounded: [] };
  }

  /**
   * A prompt addressed to the examiner (custom slash command): its model
   * answers it from the transcript (`runExaminerPrompt`; the debrief only
   * after `finish`). Without a model it says a language model is needed
   * (front-ends normally refuse earlier: `ignoresPromptsOffline`).
   */
  private async examinerPromptTurn(id: string, turnId: string, profile: AgentProfile, prompt: string, signal?: AbortSignal): Promise<AgentOutcome> {
    const k = this.k;
    const m = k.models.model(profile.name);
    if (!m.provider) {
      const text = rt(k.locale, "agent.examiner.promptNeedsModel", { agent: profile.name });
      this.emitAgentMessage(id, turnId, profile.name, text, []);
      return { status: "end_turn", text, grounded: [] };
    }
    const res = await runExaminerPrompt({
      caseDef: k.caseDef,
      state: k.state,
      locale: k.locale,
      dialogue: k.conversations.dialogue,
      profile,
      provider: m.provider,
      model: m.model,
      prompt,
      ...(m.effort ? { effort: m.effort } : {}),
      ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
      memory: k.opts.memory ?? null,
      ...(signal ? { signal } : {}),
      emit: (msg) => k.emit(id, msg),
      ...retryOption(k.models.retryFor(m)),
      onUsage: (u) => k.models.trackUsage(id, profile.name, u),
    });
    if (res.aborted || signal?.aborted) return { status: "interrupted", text: "", grounded: [] };
    if (res.error) return { status: "error", text: "", grounded: [], error: res.error };
    const text = res.text.trim();
    if (text) this.emitAgentMessage(id, turnId, profile.name, text, []);
    return { status: res.stopReason === "refusal" || res.stopReason === "max_tokens" ? res.stopReason : "end_turn", text, grounded: [] };
  }

  /** Assess the encounter (`assessment` event): the deterministic report and the examiner's verdict. */
  async runAssessment(id: string, signal: AbortSignal): Promise<ExaminerVerdict> {
    const k = this.k;
    const report = assess(k.caseDef, k.state);
    const profile = k.profiles.get("examiner")!;
    const m = k.models.model("examiner");
    const verdict = await runExaminer({
      caseDef: k.caseDef,
      state: k.state,
      locale: k.locale,
      report,
      dialogue: k.conversations.dialogue,
      profile,
      provider: m.provider,
      model: m.model,
      ...(m.effort ? { effort: m.effort } : {}),
      ...(m.maxTokens !== undefined ? { maxTokens: m.maxTokens } : {}),
      memory: k.opts.memory ?? null,
      signal,
      emit: (msg) => k.emit(id, msg),
      ...retryOption(k.models.retryFor(m)),
      onUsage: (u) => k.models.trackUsage(id, "examiner", u),
    });
    k.emit(id, { type: "assessment", report, narrative: verdict.narrative, judged: verdict.judged });
    return verdict;
  }

  /* ---------------------------------------------------------------- */
  /* Autopilot                                                         */
  /* ---------------------------------------------------------------- */

  /** The clinician drives the case (`autopilot` op, `/autopilot`). */
  runAutopilot(id: string, goal: string | undefined, maxTurns: number | undefined, signal: AbortSignal): Promise<void> {
    return runAutopilot(this.autopilotHost(id), { goal, maxTurns, signal });
  }

  private offlineClinicianBlock(id: string, turnId: string, maxSteps: number, signal?: AbortSignal): Promise<AgentOutcome> {
    const host = this.autopilotHost(id);
    return host.offlineTurn ? host.offlineTurn(turnId, maxSteps, signal) : offlineClinicianTurn(host, turnId, maxSteps, signal);
  }

  private autopilotHost(id: string, embodied = true): AutopilotHost {
    const k = this.k;
    return {
      caseDef: k.caseDef,
      get locale() {
        return k.locale;
      },
      state: () => k.state,
      newId: () => k.newId(),
      now: () => k.now(),
      emit: (msg) => k.emit(id, msg),
      ensureStarted: () => k.ensureStarted(id),
      clinicianOnline: () => k.models.model("clinician").provider !== null,
      clinicianMaxSteps: () => k.models.model("clinician").maxToolRounds,
      runModelTurn: (turnId, text, signal) => this.runModelAgent(id, turnId, k.profiles.get("clinician")!, text, signal),
      finishTurn: (turnId, outcome, started) => this.finishTurn(id, turnId, "clinician", outcome, started),
      narrate: (turnId, text) => this.emitAgentMessage(id, turnId, "clinician", text, []),
      dispatch: (action) => void k.dispatch(action, id),
      executeTool: (turnId, name, args, signal) =>
        executeToolCall({
          host: k.tools.loopHost(id),
          agent: "clinician",
          tools: k.toolsFor("clinician"),
          call: { id: k.newId(), name, args },
          ctx: k.tools.context("clinician", id, signal),
          emit: (msg) => k.emit(id, msg),
          turnId,
          ...(signal ? { signal } : {}),
          now: k.now,
        }),
      cursor: k.offlineCursor,
      ...(k.embodied && embodied
        ? {
            offlineTurn: (turnId: string, maxSteps: number, signal?: AbortSignal) => {
              const e = k.embodied!;
              return embodiedOfflineTurn(this.autopilotHost(id, false), {
                world: () => e.world(),
                trace: e.trace,
                act: (request, turn, sig) => e.act({ agent: "clinician", submission: id, turnId: turn, ...(sig ? { signal: sig } : {}) }, request, sig),
                patientId: () => e.patientId(),
                patientMonitorId: () => e.patientMonitorId(),
              }, turnId, maxSteps, signal);
            },
          }
        : {}),
    };
  }
}
