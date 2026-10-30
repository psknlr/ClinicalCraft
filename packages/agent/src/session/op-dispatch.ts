/**
 * The submission queue of a session (docs/PROTOCOL.md §1): every op is transcribed (credentials scrubbed,
 * `sanitizeOp`) and either handled the moment it arrives — `interrupt`, `approval_response`,
 * `dynamic_tool_response`, `external_tool_cancel`, and sensor poses (`world_pose`, never queued nor
 * transcribed) — or queued and processed one at a time, each turn with its own abort controller; a turn queued
 * before an interrupt or a shutdown is cancelled before it starts. Also the session-level ops: `configure`
 * (only the known `RuntimeConfigPatch` fields: `cleanConfigPatch`) and the shutdown sequence.
 */
import type { ActorId, Pose, WorldActionRequest } from "@clinicalcraft/world";
import type { ApprovalMode, Op, PracticeScope, RuntimeConfigPatch } from "../protocol.js";
import { canonicalLocale, type ResolvedSettings } from "../settings/schema.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";

/** Valid `approval_response` decisions (ops may arrive as untyped JSON). */
const APPROVAL_DECISIONS: ReadonlySet<string> = new Set(["approved", "approved_for_session", "denied", "abort"]);

/** Ops that start work and are cancelled while still queued by an interrupt or shutdown. */
const CANCELLABLE_OPS: ReadonlySet<Op["type"]> = new Set(["user_message", "clinical_action", "slash_command", "autopilot", "compact", "assess", "world_action", "external_tool_call"]);

/** Remove anything that looks like a credential from an op before it is transcribed. */
export function sanitizeOp(op: Op): Op {
  const scrub = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = /api[-_]?key|secret|token|password|authorization/i.test(k) ? "[redacted]" : scrub(v);
      return out;
    }
    return value;
  };
  return scrub(op) as Op;
}

/** Only the known `RuntimeConfigPatch` fields (never echo unknown keys such as credentials). */
export function cleanConfigPatch(patch: RuntimeConfigPatch): RuntimeConfigPatch {
  const out: RuntimeConfigPatch = {};
  if (typeof patch.provider === "string") out.provider = patch.provider;
  if (typeof patch.model === "string") out.model = patch.model;
  if (typeof patch.approvalMode === "string") out.approvalMode = patch.approvalMode;
  if (typeof patch.practiceScope === "string") out.practiceScope = patch.practiceScope;
  if (typeof patch.locale === "string") out.locale = patch.locale;
  if (typeof patch.interlocutor === "string") out.interlocutor = patch.interlocutor;
  if (patch.agents && typeof patch.agents === "object") {
    out.agents = {};
    for (const [name, o] of Object.entries(patch.agents)) {
      if (!o || typeof o !== "object") continue;
      out.agents[name] = {
        ...(typeof o.provider === "string" ? { provider: o.provider } : {}),
        ...(typeof o.model === "string" ? { model: o.model } : {}),
        ...(typeof o.effort === "string" ? { effort: o.effort } : {}),
        ...(typeof o.temperature === "number" ? { temperature: o.temperature } : {}),
      };
    }
  }
  return out;
}

/** The submission queue and the session-level ops of one session. */
export class OpDispatcher {
  /** The tail of the queue: settles once every submission accepted so far has been processed. */
  queue: Promise<void> = Promise.resolve();
  /** Bumped by every interrupt/shutdown: queued turns submitted before it are cancelled before they start. */
  private interruptEpoch = 0;
  private active: { id: string; controller: AbortController } | null = null;
  /** `world_pose` refusals already reported (once per session in clinical mode). */
  private poseRefused = false;

  constructor(private readonly k: SessionKernel) {}

  /** The abort signal of the running turn, if any. */
  get activeSignal(): AbortSignal | undefined {
    return this.active?.controller.signal;
  }

  /** Accept an op: handle it now (out-of-band ops) or queue it. */
  accept(id: string, op: Op): Promise<void> {
    const k = this.k;
    if (op?.type === "world_pose") {
      // Sensor data (~10 Hz): applied at once, never queued behind a turn, never transcribed.
      if (!k.closed && !k.closing) this.applyPose(id, op.actorId, op.pose);
      return Promise.resolve();
    }
    if (k.closed || (k.closing && op.type !== "shutdown")) {
      k.emit(id, { type: "error", message: rt(k.locale, "error.closed"), code: "closed" });
      return Promise.resolve();
    }
    k.recorder?.record("op", { id, op: sanitizeOp(op) });
    switch (op.type) {
      case "interrupt":
        this.interrupt(id);
        return Promise.resolve();
      case "approval_response":
        if (!APPROVAL_DECISIONS.has(op.decision)) {
          // Wire input: an unknown decision must never settle (and so never run) the pending call.
          k.emit(id, { type: "warning", message: rt(k.locale, "warning.invalidApprovalDecision", { decision: String(op.decision), id: String(op.requestId) }) });
        } else if (!k.gate.respond(id, op.requestId, op.decision, typeof op.reason === "string" ? op.reason : undefined)) {
          k.emit(id, { type: "warning", message: rt(k.locale, "warning.unknownApproval", { id: op.requestId }) });
        }
        return Promise.resolve();
      case "dynamic_tool_response": {
        const resolve = k.tools.takeDynamic(op.callId);
        if (resolve) resolve({ ok: op.ok, output: op.output });
        else k.emit(id, { type: "warning", message: rt(k.locale, "warning.unknownDynamicCall", { id: op.callId }) });
        return Promise.resolve();
      }
      case "external_tool_cancel":
        // Out-of-band, like an interrupt — but only this call: queued, it never runs; running, it is aborted.
        k.external.cancel(op.callId);
        return Promise.resolve();
      case "external_tool_call":
        return k.external.accept(id, op);
      case "shutdown":
        k.closing = true;
        this.interrupt(id);
        return this.enqueue(id, op);
      default:
        return this.enqueue(id, op);
    }
  }

  /** Queue an op behind the running turn; one queued before an interrupt or shutdown is cancelled when it comes up. */
  enqueue(id: string, op: Op): Promise<void> {
    const k = this.k;
    const epoch = this.interruptEpoch;
    const task = this.queue
      .then(() => {
        // A turn queued before an interrupt (or a shutdown) is cancelled before it starts: an
        // interrupt that arrives while its submission is still queued must not be lost.
        if (CANCELLABLE_OPS.has(op.type) && (epoch !== this.interruptEpoch || k.closing)) {
          const reason = rt(k.locale, k.closing ? "submission.reason.shutdown" : "submission.reason.interrupt");
          k.emit(id, { type: "warning", message: rt(k.locale, "submission.cancelled", { reason }) });
          return;
        }
        return this.process(id, op);
      })
      .catch((err: unknown) => k.emit(id, { type: "error", message: rt(k.locale, "error.internal", { message: err instanceof Error ? err.message : String(err) }), code: "internal" }));
    this.queue = task;
    return task;
  }

  private async process(id: string, op: Op): Promise<void> {
    const k = this.k;
    const previous = k.currentSubmission;
    k.currentSubmission = id;
    try {
      switch (op.type) {
        case "user_message":
          return await k.learner.handleUserMessage(id, op.text, op.to ?? null, op.staff ?? null);
        case "clinical_action":
          await k.learner.handleClinicalAction(id, op.action, op.rationale);
          return;
        case "slash_command":
          return await k.learner.handleCommand(id, op.name, op.args);
        case "autopilot":
          return await this.withTurn(id, (signal) => k.agents.runAutopilot(id, op.goal, op.maxTurns, signal));
        case "world_action":
          return void (await this.withTurn(id, (signal) => this.worldAction(id, op.request, signal)));
        case "external_tool_call":
          return await this.withTurn(id, (signal) => k.external.run(id, op, signal));
        case "configure":
          return this.configure(id, op.patch);
        case "compact":
          return await this.withTurn(id, (signal) => k.conversations.compact(id, op.agent ?? null, "manual", signal));
        case "assess":
          return void (await this.withTurn(id, (signal) => k.agents.runAssessment(id, signal)));
        case "shutdown":
          return await this.shutdownSequence(id);
        case "interrupt":
        case "approval_response":
        case "dynamic_tool_response":
        case "world_pose":
        case "external_tool_cancel":
          return;
        default: {
          const never: never = op;
          return never;
        }
      }
    } finally {
      k.currentSubmission = previous;
    }
  }

  /** Run a turn with its own abort controller (an interrupt aborts the running turn). */
  async withTurn<T>(id: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    this.active = { id, controller };
    try {
      return await fn(controller.signal);
    } finally {
      if (this.active?.controller === controller) this.active = null;
    }
  }

  private interrupt(id: string): void {
    this.interruptEpoch++;
    this.active?.controller.abort();
    this.k.gate.cancelAll(id);
    this.k.tools.abortDynamic();
  }

  /* ---------------------------------------------------------------- */
  /* Embodied ops                                                      */
  /* ---------------------------------------------------------------- */

  /** A learner world action (`world_action` op): the learner's tool path runs any clinical effect. */
  private async worldAction(id: string, request: WorldActionRequest, signal: AbortSignal): Promise<void> {
    const k = this.k;
    if (!k.embodied) {
      k.emit(id, { type: "error", message: rt(k.locale, "embodied.notEmbodied"), code: "not_embodied" });
      return;
    }
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      k.emit(id, { type: "error", message: rt(k.locale, "error.internal", { message: "world_action.request must be an object" }), code: "invalid_op" });
      return;
    }
    await k.embodied.act({ agent: "learner", submission: id, signal }, request, signal);
  }

  /** A sensor pose (`world_pose` op). */
  private applyPose(id: string, actorId: ActorId, pose: Pose): void {
    const k = this.k;
    if (!k.embodied) {
      if (!this.poseRefused) k.emit(id, { type: "error", message: rt(k.locale, "embodied.notEmbodied"), code: "not_embodied" });
      this.poseRefused = true;
      return;
    }
    k.embodied.updatePose(actorId, pose);
  }

  /* ---------------------------------------------------------------- */
  /* Configuration, shutdown                                           */
  /* ---------------------------------------------------------------- */

  /** A `configure` op (or `/model`, `/approval`…): apply the known fields, report what was refused, `config_changed`. */
  configure(id: string, rawPatch: RuntimeConfigPatch): void {
    const k = this.k;
    const patch = cleanConfigPatch(rawPatch);
    const next = structuredClone(k.settings);
    const issues: string[] = [];
    // Fixed for an encounter (EMBODIED R3): a patch that would change it is refused.
    if (rawPatch?.embodiment !== undefined && rawPatch.embodiment !== k.embodiment) issues.push(rt(k.locale, "embodied.fixed", { mode: k.embodiment }));
    const modes: ApprovalMode[] = ["default", "strict", "auto", "plan", "bypass"];
    const scopes: PracticeScope[] = ["history-only", "workup", "full"];
    if (patch.provider !== undefined) {
      next.provider = patch.provider;
      if (patch.model === undefined) next.model = null;
    }
    if (patch.model !== undefined) next.model = patch.model || null;
    if (patch.approvalMode !== undefined) {
      if (modes.includes(patch.approvalMode)) next.approvalMode = patch.approvalMode;
      else issues.push(`approvalMode "${String(patch.approvalMode)}"`);
    }
    if (patch.practiceScope !== undefined) {
      if (scopes.includes(patch.practiceScope)) next.practiceScope = patch.practiceScope;
      else issues.push(`practiceScope "${String(patch.practiceScope)}"`);
    }
    if (patch.locale !== undefined && patch.locale.trim()) {
      // Only a supported language ("zh", "en-US"… normalised); anything else is reported and ignored.
      const locale = canonicalLocale(patch.locale);
      if (locale) next.locale = patch.locale = locale;
      else {
        issues.push(`locale "${patch.locale}"`);
        delete patch.locale;
      }
    }
    for (const [agent, override] of Object.entries(patch.agents ?? {})) {
      const merged = { ...(next.agents[agent] ?? {}) } as Record<string, unknown>;
      for (const [key, v] of Object.entries(override)) if (v !== undefined) merged[key] = v;
      next.agents[agent] = merged as ResolvedSettings["agents"][string];
    }
    if (patch.interlocutor !== undefined) {
      const target = patch.interlocutor.replace(/^@/, "").toLowerCase();
      if (k.availableAgents().includes(target)) k.interlocutor = target;
      else issues.push(`interlocutor "${patch.interlocutor}"`);
    }
    k.settings = next;
    k.models.reset();
    k.embodied?.setLocale(k.settings.locale);
    if (issues.length > 0) k.emit(id, { type: "error", message: rt(k.locale, "error.config", { issues: issues.join(", ") }), code: "invalid_config" });
    k.emit(id, { type: "config_changed", patch: cleanConfigPatch(patch) });
  }

  private async shutdownSequence(id: string): Promise<void> {
    const k = this.k;
    if (k.closed) return;
    k.closing = true;
    k.gate.cancelAll(id);
    // SessionEnd is the last hook: let queued ClinicalEvent/Notification hooks finish first.
    await k.hooksSettled();
    const hook = await k.runHook({ hook_event_name: "SessionEnd", reason: k.state.finished ? "finished" : "shutdown" });
    for (const w of hook.warnings) k.emit(id, { type: "warning", message: w });
    await k.hooksSettled();
    k.embodied?.flush();
    k.emit(id, { type: "shutdown_complete" });
    k.closed = true;
    await k.recorder?.flush();
    k.hub.close();
  }
}
