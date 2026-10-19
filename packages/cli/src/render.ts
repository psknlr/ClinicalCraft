/**
 * Terminal rendering of the `AgentEvent` stream (REPL and exec progress):
 * live speaker-labelled streaming, compact tool lines (`⏺ order_test(cbc) … ✓`),
 * clinical events (✓ objectives, ⚠ alarms, 🔔 critical results), a spinner
 * while the model is thinking, approvals, assessments and a status line.
 */
import { progress as caseProgress, t, type AssessmentReport, type CaseDefinition, type DomainEvent, type ObjectiveProgress, type SessionState, type VitalsSnapshot } from "@clinicalcraft/core";
import {
  findProviderTemplate,
  investigationName,
  noReading,
  objectiveTitle,
  phaseLabel,
  rt,
  sanitizeTerminal,
  vitalLabel,
  vitalWithUnit,
  type AgentEvent,
  type EventMsg,
  type PlanItem,
  type ResolvedSettings,
  type RuntimeKey,
  type TokenUsage,
} from "@clinicalcraft/agent";
import { resolveNodeProviderConfig } from "@clinicalcraft/agent/node";
import { CLEAR_LINE, type Env, type Palette } from "./ansi.js";
import type { OutStream } from "./context.js";
import { m } from "./i18n.js";

export interface RendererOptions {
  out: OutStream;
  palette: Palette;
  caseDef: CaseDefinition;
  locale: () => string;
  /** Spinner & live streaming (TTY REPL). */
  interactive: boolean;
  verbose?: boolean;
  /** Show successful tool output previews (default true). */
  toolPreview?: boolean;
  /**
   * The model a provider/model choice resolves to (provider overrides from
   * settings included), for the banner and status line; default `modelLabel`
   * (built-in templates only).
   */
  resolveModel?: (provider: string, model: string | null) => string;
  /** Embodied mode: where the learner's body is (the status line shows it). */
  place?: () => string | null;
}

interface Configured {
  sessionId: string;
  provider: string;
  model: string;
  approvalMode: string;
  practiceScope: string;
  interlocutor: string;
  offline: boolean;
}

/**
 * Model shown for a provider when no model is set: the session uses the
 * provider's default model (offline → its deterministic responders).
 */
export function modelLabel(provider: string, model: string | null | undefined): string {
  if (model) return model;
  return provider === "offline" ? "deterministic" : (findProviderTemplate(provider)?.defaultModel ?? "");
}

/**
 * The model a session with these settings actually calls: settings provider
 * overrides (`providers.<id>.defaultModel`, custom providers) included —
 * `modelLabel` only knows the built-in templates.
 */
export function resolvedModelLabel(settings: Pick<ResolvedSettings, "provider" | "model" | "providers">, env: Env, provider: string = settings.provider, model: string | null = provider === settings.provider ? (settings.model ?? null) : null): string {
  if (model) return model;
  if (provider === "offline") return "deterministic";
  try {
    return resolveNodeProviderConfig(settings, provider, null, env).model || modelLabel(provider, null);
  } catch {
    return modelLabel(provider, null);
  }
}

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const TOOL_ARG_KEYS = ["investigation_id", "finding_id", "intervention_id", "decision_id", "query", "phase", "minutes", "role", "kind", "target", "question", "fact_ids", "option_ids"];

/** Compact rendering of tool arguments: `cbc`, `"Where is the pain?"`, `diagnosis: dual`. */
export function summarizeArgs(args: unknown, max = 48): string {
  if (!args || typeof args !== "object") return "";
  const obj = args as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of TOOL_ARG_KEYS) {
    const v = obj[key];
    if (v === undefined || v === null || v === "") continue;
    if (key === "option_ids" && Array.isArray(v)) {
      parts.push(v.join("+"));
      continue;
    }
    if (Array.isArray(v)) parts.push(v.join(","));
    else if (key === "question" || key === "query") parts.push(JSON.stringify(truncate(String(v), max)));
    else parts.push(String(v));
  }
  if (parts.length === 0) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return "";
    return truncate(JSON.stringify(obj), max);
  }
  if (obj.decision_id !== undefined && obj.option_ids !== undefined && parts.length >= 2) return `${parts[0]}: ${parts.slice(1).join(" ")}`;
  return parts.join(", ");
}

/** Shorten to `max` characters with an ellipsis. */
export function truncate(text: string, max: number): string {
  const single = text.replace(/\s+/g, " ").trim();
  return single.length > max ? `${single.slice(0, Math.max(1, max - 1))}…` : single;
}

/** `sanitizeTerminal` lives in @clinicalcraft/agent (shared with the MCP server's stderr diagnostics). */
export { sanitizeTerminal };

/** `sanitizeTerminal` over every string of a JSON-like value (case definitions). */
function sanitizeDeep<T>(value: T): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return sanitizeTerminal(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

/**
 * The event as the renderer may print it: top-level strings (deltas, texts,
 * summaries, reasons, errors, names) and the nested texts it shows (plan
 * items, judged evidence) sanitised. `data` payloads stay untouched (the REPL
 * exports them verbatim); tool arguments are sanitised once summarised.
 */
function sanitizeMsg(msg: EventMsg): EventMsg {
  if (msg.type === "state_snapshot" || msg.type === "clinical_event" || msg.type === "token_usage") return msg;
  const out: Record<string, unknown> = { ...msg };
  for (const [key, value] of Object.entries(out)) if (typeof value === "string") out[key] = sanitizeTerminal(value);
  if (msg.type === "plan_updated") out.plan = msg.plan.map((item) => ({ ...item, text: sanitizeTerminal(item.text) }));
  if (msg.type === "assessment") out.judged = msg.judged.map((j) => ({ ...j, id: sanitizeTerminal(j.id), evidence: sanitizeTerminal(j.evidence) }));
  if (msg.type === "config_changed") {
    const patch: Record<string, unknown> = { ...msg.patch };
    for (const [key, value] of Object.entries(patch)) if (typeof value === "string") patch[key] = sanitizeTerminal(value);
    out.patch = patch;
  }
  return out as EventMsg;
}

/** `08:30` + minutes → `08:42`. */
export function clockLabel(c: CaseDefinition, minute: number): string {
  const start = c.clock.startTime;
  const whole = Math.floor(minute);
  if (!start) return `T+${whole} min`;
  const [h, mm] = start.split(":").map(Number) as [number, number];
  const total = (h * 60 + mm + whole) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")} (T+${whole})`;
}

export class EventRenderer {
  private readonly o: RendererOptions;
  private readonly p: Palette;
  /** The case with every text field passed through `sanitizeTerminal` (third-party content). */
  private readonly c: CaseDefinition;
  private atLineStart = true;
  private openStream: { turnId: string; agent: string } | null = null;
  /** Text streamed per `turnId:agent` since that agent's last full message (avoids reprinting it). */
  private readonly streamed = new Map<string, number>();
  private pendingTool: string | null = null;
  private spinnerTimer: ReturnType<typeof setInterval> | null = null;
  private spinnerFrame = 0;
  private spinnerShown = false;
  /** Speaker names seen in `agent_message` events, keyed by `locale\u0000agent` (names are localised). */
  private readonly speakers = new Map<string, string>();
  configured: Configured | null = null;
  /** The last world action line shown (embodied commands print the same text). */
  private lastWorldMessage: string | null = null;
  snapshot: { state: SessionState; progress: ObjectiveProgress; vitals: VitalsSnapshot; waypoint: string | null } | null = null;
  usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  /** Text of the last `permission_denied` error (the command's own output repeats it). */
  private lastDenied: string | null = null;
  /** The "■ Case finished." line was printed (the /finish command's own "Case finished." is then not repeated). */
  private finishedShown = false;
  /** Last `command_output` data (REPL reacts to /export, /quit). */
  lastCommand: { name: string; text: string; data?: unknown } | null = null;

  constructor(options: RendererOptions) {
    this.o = options;
    this.p = options.palette;
    this.c = sanitizeDeep(options.caseDef);
  }

  private get L(): string {
    return this.o.locale();
  }

  /* ---------------------------------------------------------------- */
  /* Output primitives                                                 */
  /* ---------------------------------------------------------------- */

  private raw(text: string): void {
    if (!text) return;
    // Event text and case text are sanitised at the source; this also covers lines callers build
    // themselves (REPL banner…): nothing but the palette's colour codes reaches the terminal.
    text = sanitizeTerminal(text, { keepColors: true });
    if (!text) return;
    this.o.out.write(text);
    this.atLineStart = text.endsWith("\n");
  }

  /** Make sure the cursor is at the start of a fresh line (closes streams, tool lines, spinner). */
  ensureLineStart(): void {
    this.stopSpinner();
    if (this.openStream) this.openStream = null;
    if (this.pendingTool) this.pendingTool = null;
    if (!this.atLineStart) this.raw("\n");
  }

  /** Print one or more full lines. */
  line(text = ""): void {
    this.ensureLineStart();
    this.raw(`${text}\n`);
  }

  startSpinner(label: string): void {
    if (!this.o.interactive || !this.o.out.isTTY || this.spinnerTimer) return;
    this.ensureLineStart();
    const draw = () => {
      const frame = SPINNER[this.spinnerFrame++ % SPINNER.length]!;
      this.o.out.write(`${CLEAR_LINE}${this.p.cyan(frame)} ${this.p.dim(label)}`);
      this.spinnerShown = true;
    };
    draw();
    this.spinnerTimer = setInterval(draw, 80);
    this.spinnerTimer.unref?.();
  }

  stopSpinner(): void {
    if (this.spinnerTimer) {
      clearInterval(this.spinnerTimer);
      this.spinnerTimer = null;
    }
    if (this.spinnerShown) {
      this.o.out.write(CLEAR_LINE);
      this.spinnerShown = false;
      this.atLineStart = true;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Speakers                                                          */
  /* ---------------------------------------------------------------- */

  private modelFor(provider: string, model: string | null): string {
    return this.o.resolveModel ? this.o.resolveModel(provider, model) : modelLabel(provider, model);
  }

  /** Display name for an agent (patient name, "Nurse", …). */
  speakerName(agent: string): string {
    const cached = this.speakers.get(`${this.L}\u0000${agent}`);
    if (cached) return cached;
    const c = this.c;
    if (agent === "patient") return t(c.patient.displayName, this.L);
    if (agent === "companion" && c.patient.persona.companion) return t(c.patient.persona.companion.name, this.L);
    const key = `speaker.${agent}` as RuntimeKey;
    const label = rt(this.L, key);
    return label === key ? sanitizeTerminal(agent) : label;
  }

  private colorFor(agent: string): (s: string) => string {
    switch (agent) {
      case "patient":
      case "companion":
        return this.p.cyan;
      case "nurse":
        return this.p.magenta;
      case "radiologist":
      case "pathologist":
        return this.p.blue;
      case "attending":
        return this.p.yellow;
      case "clinician":
        return this.p.green;
      case "examiner":
        return this.p.bold;
      default:
        return this.p.magenta;
    }
  }

  private label(agent: string, speaker?: string): string {
    const name = speaker && speaker !== agent ? speaker : this.speakerName(agent);
    return this.p.bold(this.colorFor(agent)(`${name}:`));
  }

  /* ---------------------------------------------------------------- */
  /* Events                                                            */
  /* ---------------------------------------------------------------- */

  handle(event: AgentEvent): void {
    this.render(sanitizeMsg(event.msg));
  }

  private render(msg: EventMsg): void {
    const L = this.L;
    const p = this.p;
    switch (msg.type) {
      case "session_configured":
        this.configured = {
          sessionId: msg.sessionId,
          provider: msg.provider,
          model: msg.model,
          approvalMode: msg.approvalMode,
          practiceScope: msg.practiceScope,
          interlocutor: msg.interlocutor,
          offline: msg.offline,
        };
        return;
      case "config_changed": {
        const patch = msg.patch;
        if (this.configured) {
          // Switching provider without a model resets the model to that provider's default (as the session does).
          if (patch.provider !== undefined) {
            this.configured.provider = patch.provider;
            this.configured.offline = patch.provider === "offline";
            if (patch.model === undefined) this.configured.model = this.modelFor(patch.provider, null);
          }
          if (patch.model !== undefined) this.configured.model = this.modelFor(this.configured.provider, patch.model);
          if (patch.approvalMode !== undefined) this.configured.approvalMode = patch.approvalMode;
          if (patch.practiceScope !== undefined) this.configured.practiceScope = patch.practiceScope;
          if (patch.interlocutor !== undefined) this.configured.interlocutor = patch.interlocutor;
        }
        return;
      }
      case "turn_started":
        // The staff member's display name, so the first streamed line is already labelled with it.
        if (msg.speaker && msg.speaker !== String(msg.agent)) this.speakers.set(`${this.L}\u0000${String(msg.agent)}`, sanitizeTerminal(msg.speaker));
        return;
      case "turn_phase":
        if (msg.phase === "awaiting_model") this.startSpinner(m(L, "render.thinking", { agent: this.speakerName(String(msg.agent)) }));
        else this.stopSpinner();
        return;
      case "agent_message_delta": {
        this.stopSpinner();
        const agent = String(msg.agent);
        const key = `${msg.turnId}:${agent}`;
        this.streamed.set(key, (this.streamed.get(key) ?? 0) + msg.delta.length);
        if (!this.openStream || this.openStream.turnId !== msg.turnId || this.openStream.agent !== agent) {
          this.ensureLineStart();
          this.raw(`${this.label(agent)} `);
          this.openStream = { turnId: msg.turnId, agent };
        }
        this.raw(msg.delta);
        return;
      }
      case "agent_message": {
        const agent = String(msg.agent);
        if (msg.speaker && msg.speaker !== agent) this.speakers.set(`${this.L}\u0000${agent}`, msg.speaker);
        const key = `${msg.turnId}:${agent}`;
        if (this.streamed.has(key)) {
          this.streamed.delete(key);
          if (this.openStream && this.openStream.turnId === msg.turnId && this.openStream.agent === agent) {
            this.openStream = null;
            if (!this.atLineStart) this.raw("\n");
          }
          return;
        }
        if (!msg.text.trim()) return;
        this.line(`${this.label(agent, msg.speaker)} ${msg.text}`);
        return;
      }
      case "agent_reasoning":
        if (this.o.verbose) this.line(p.dim(p.italic(`… ${truncate(msg.text, 200)}`)));
        return;
      case "tool_call_begin": {
        this.ensureLineStart();
        const args = sanitizeTerminal(summarizeArgs(msg.args));
        this.raw(`${p.dim("⏺")} ${p.bold(msg.tool)}${p.dim(`(${args})`)} ${p.dim("…")}`);
        this.pendingTool = msg.callId;
        return;
      }
      case "tool_call_end": {
        const mark = msg.ok ? p.green("✓") : p.red("✗");
        const preview = this.toolPreview(msg.tool, msg.ok, msg.output);
        if (this.pendingTool === msg.callId && !this.atLineStart) {
          this.pendingTool = null;
          this.raw(` ${mark}${preview ? ` ${p.dim(preview)}` : ""}\n`);
        } else {
          this.line(`  ${p.dim("⎿")} ${mark} ${p.dim(msg.tool)}${preview ? ` ${p.dim(preview)}` : ""}`);
        }
        return;
      }
      case "approval_request":
        this.line(
          `${p.yellow("?")} ${p.bold(msg.summary || msg.tool)} ${p.dim(`(${m(L, "render.risk", { risk: msg.risk })} · ${msg.ruleId}${msg.reason ? ` · ${truncate(msg.reason, 80)}` : ""})`)}`,
        );
        return;
      case "approval_resolved": {
        const text = m(L, `approval.${msg.decision}` as "approval.approved");
        const colored = msg.decision === "approved" || msg.decision === "approved_for_session" ? p.green(text) : p.yellow(text);
        this.line(`  ${p.dim("→")} ${colored}${msg.reason ? p.dim(` (${msg.reason})`) : ""}`);
        return;
      }
      case "dynamic_tool_call":
        return;
      case "clinical_event":
        this.clinicalEvent(msg.event);
        return;
      case "state_snapshot":
        this.snapshot = { state: msg.state, progress: msg.progress, vitals: msg.vitals, waypoint: msg.waypoint };
        return;
      case "plan_updated":
        this.renderPlan(msg.plan, msg.explanation);
        return;
      case "token_usage":
        this.usage = { ...msg.total };
        return;
      case "turn_complete":
        this.stopSpinner();
        for (const key of [...this.streamed.keys()]) if (key.startsWith(`${msg.turnId}:`)) this.streamed.delete(key);
        if (this.openStream && this.openStream.turnId === msg.turnId) {
          this.openStream = null;
          if (!this.atLineStart) this.raw("\n");
        }
        return;
      case "turn_aborted":
        this.ensureLineStart();
        this.line(p.yellow(`⏹ ${m(L, `abort.${msg.reason}` as "abort.error", { agent: this.speakerName(String(msg.agent)) })}`));
        return;
      case "assessment":
        this.renderAssessment(msg.report, msg.narrative, msg.judged);
        return;
      case "notification":
        return; // rendered from the clinical events / staff lines instead
      case "command_output":
        this.lastCommand = { name: msg.name, text: msg.text, ...(msg.data !== undefined ? { data: msg.data } : {}) };
        if (this.lastDenied !== null && msg.text.trim() === this.lastDenied) {
          this.lastDenied = null; // already shown as the ✗ line
          return;
        }
        if (msg.name === "finish" && this.finishedShown && (msg.data as { ok?: unknown } | undefined)?.ok === true) return; // the ■ line said it
        // An embodied command's result already shown as its world action line: print only the rest.
        if (this.lastWorldMessage && msg.text.startsWith(this.lastWorldMessage)) {
          const rest = msg.text.slice(this.lastWorldMessage.length).replace(/^\s*\[[A-Z_]+\]/, "").trim();
          this.lastWorldMessage = null;
          if (rest) this.line(rest);
          return;
        }

        if (msg.text.trim()) this.line(msg.text.replace(/\n+$/, ""));
        return;
      case "compacted":
        this.line(p.dim(m(L, "render.compacted", { agent: String(msg.agent), before: msg.beforeTokens, after: msg.afterTokens })));
        return;
      case "api_retry":
        this.line(p.yellow(`↻ ${m(L, "render.retry", { agent: String(msg.agent), attempt: msg.attempt, seconds: Math.round(msg.delayMs / 100) / 10, error: truncate(msg.error, 120) })}`));
        return;
      case "warning":
        this.line(p.yellow(`⚠ ${msg.message}`));
        return;
      case "error":
        this.lastDenied = msg.code === "permission_denied" ? msg.message.trim() : null;
        this.line(p.red(`✗ ${msg.message}${msg.code ? p.dim(` [${msg.code}]`) : ""}`));
        return;
      case "shutdown_complete":
        this.stopSpinner();
        return;
      case "world_event":
        return; // the world's own changes: the action results say what happened
      case "world_action_result": {
        // Embodied mode: walks and device operations (the autopilot's, delegated staff's, the learner's own).
        const text = sanitizeTerminal(msg.result.message.split("\n")[0] ?? "");
        if (!text) return;
        this.lastWorldMessage = text;
        const mark = msg.result.status === "completed" ? "⤷" : "✗";
        this.line(this.p.dim(`  ${mark} ${truncate(text, 160)}${msg.result.errorCode ? ` [${msg.result.errorCode}]` : ""}`));
        return;
      }
      default: {
        const never: never = msg;
        void never;
      }
    }
  }

  private toolPreview(tool: string, ok: boolean, output: string): string {
    if (!ok) return truncate(output, 140);
    if (this.o.toolPreview === false) return "";
    if (tool === "ask_patient" || tool === "consult" || tool === "update_workup") return "";
    return truncate(output.split("\n")[0] ?? "", 100);
  }

  private clinicalEvent(event: DomainEvent): void {
    const L = this.L;
    const p = this.p;
    const c = this.c;
    switch (event.type) {
      case "objective.completed":
        this.line(p.green(`✓ ${m(L, "render.objective", { title: objectiveTitle(c, event.objectiveId, L) })}`));
        return;
      case "case.completed":
        this.line(p.bold(p.green(`★ ${m(L, "render.caseCompleted")}`)));
        return;
      case "case.finished":
        this.finishedShown = true;
        this.line(p.bold(event.timedOut ? p.yellow(`⏱ ${m(L, "render.timedOut")}`) : `■ ${m(L, "render.finished")}`));
        return;
      case "vitals.alarm": {
        // An arrest's placeholder 0 is no reading (as the nurse says): hr says so, BP/SpO₂ are covered by the hr alarm.
        if (event.unmeasurable && event.vital !== "hr") return;
        const value = event.unmeasurable ? noReading(L) : vitalWithUnit(event.vital, event.value);
        const text = `⚠ ${m(L, "render.alarm", { vital: vitalLabel(event.vital, L), value, level: m(L, event.level === "critical" ? "level.critical" : "level.warning") })}`;
        this.line(event.level === "critical" ? p.bold(p.red(text)) : p.red(text));
        return;
      }
      case "result.ready":
        if (event.critical) this.line(p.bold(p.red(`🔔 ${m(L, "render.critical", { name: investigationName(c, event.investigationId, L) })}`)));
        else if (c.clock.mode === "simulated") this.line(p.dim(`• ${m(L, "render.resultReady", { name: investigationName(c, event.investigationId, L) })}`));
        return;
      case "phase.changed":
        this.line(p.cyan(`↷ ${m(L, "render.phase", { phase: phaseLabel(c, event.to, L) })}`));
        return;
      case "scenario.event":
        if (event.severity === "critical") this.line(p.bold(p.red(`‼ ${m(L, "render.scenario")}`)));
        return;
      case "intervention.applied":
        if (event.appropriateness === "contraindicated") this.line(p.bold(p.red(`☠ ${m(L, "render.contraindicated")}`)));
        return;
      case "action.rejected":
        if (this.o.verbose) this.line(p.dim(`· ${event.action}: ${event.code}`));
        return;
      default:
        return;
    }
  }

  private renderPlan(plan: PlanItem[], explanation?: string): void {
    const p = this.p;
    this.line(p.bold(m(this.L, "render.plan")) + (explanation ? p.dim(` — ${truncate(explanation, 100)}`) : ""));
    for (const item of plan) {
      const box = item.status === "completed" ? p.green("☑") : item.status === "in_progress" ? p.yellow("◐") : "☐";
      const text = item.status === "completed" ? p.dim(item.text) : item.text;
      this.line(`  ${box} ${text}`);
    }
  }

  renderAssessment(report: AssessmentReport, narrative: string | null, judged: { id: string; met: boolean; evidence: string }[]): void {
    const L = this.L;
    const p = this.p;
    const c = this.c;
    const done = report.objectives.filter((o) => o.done).length;
    const firstTry = report.decisions.filter((d) => d.firstTryCorrect).length;
    this.line(p.bold(`── ${m(L, "assess.title")} ──`));
    this.line(
      m(L, "assess.summary", {
        score: report.score.percent,
        earned: report.score.earned,
        possible: report.score.possible,
        done,
        total: report.objectives.length,
        firstTry,
        decisions: report.decisions.length,
      }),
    );
    this.line(
      m(L, "assess.coverage", {
        asked: report.history.requiredAsked,
        required: report.history.required,
        examined: report.exam.requiredPerformed,
        examRequired: report.exam.required,
        hints: report.hints,
      }),
    );
    // Mid-case the names would be an answer key (the web and MCP rule): a count until the case is complete or finished.
    const missing = report.investigations.essentialMissing;
    const final = report.completed || this.snapshot?.state.finished === true;
    if (missing.length) {
      this.line(p.yellow(final ? m(L, "assess.missing", { list: missing.map((id) => investigationName(c, id, L)).join(", ") }) : m(L, "assess.missingCount", { count: missing.length })));
    }
    if (report.investigations.lowValue.length) this.line(p.dim(m(L, "assess.lowValue", { list: report.investigations.lowValue.map((id) => investigationName(c, id, L)).join(", ") })));
    if (report.safety.contraindicated.length) this.line(p.red(m(L, "assess.unsafe", { count: report.safety.contraindicated.length })));
    for (const j of judged) this.line(`  ${j.met ? p.green("✓") : p.yellow("·")} ${j.id}${j.evidence ? p.dim(` — ${truncate(j.evidence, 100)}`) : ""}`);
    if (narrative) this.line(narrative);
    this.line(p.dim(m(L, "assess.notice")));
  }

  /* ---------------------------------------------------------------- */
  /* Status line                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * The status line's vitals: "HR 96 BP 138/84 SpO₂ 96% RR 18 T 36.8" (alarming
   * ones in red; "---" for what a monitor cannot read in an arrest). Before
   * the monitor is attached: "no monitor", then only the spot checks, as
   * "triage HR 96 BP 192/104 …" — never a live number.
   */
  private vitalsStatus(v: VitalsSnapshot): string {
    const L = this.L;
    const alarmed = new Set(v.alarms.map((a) => a.vital));
    const unread = new Set(v.unmeasurable ?? []);
    const fmt = (key: Parameters<typeof vitalLabel>[0], text: string) => (alarmed.has(key) ? this.p.red(text) : text);
    const value = (key: Parameters<typeof vitalLabel>[0], n: number | undefined) => (unread.has(key) ? "---" : String(n));
    const items: string[] = [];
    if (v.vitals.hr != null) items.push(fmt("hr", `HR ${value("hr", v.vitals.hr)}`));
    if (v.vitals.sbp != null && v.vitals.dbp != null) items.push(fmt("sbp", `BP ${unread.has("sbp") ? "---" : `${v.vitals.sbp}/${v.vitals.dbp}`}`));
    if (v.vitals.spo2 != null) items.push(fmt("spo2", `SpO₂ ${unread.has("spo2") ? "---" : `${v.vitals.spo2}%`}`));
    if (v.vitals.rr != null) items.push(fmt("rr", `RR ${v.vitals.rr}`));
    if (v.vitals.temp != null) items.push(fmt("temp", `T ${v.vitals.temp}`));
    if (v.monitorAttached !== false) return items.join(" ");
    const manual = v.spotChecks ?? [];
    return manual.length > 0 ? `${m(L, "status.noMonitor")} · ${m(L, "status.triage", { readings: items.join(" ") })}` : m(L, "status.noMonitor");
  }

  /** "chapter · progress n/total · phase · clock · vitals · provider/model". */
  statusLine(state?: SessionState): string {
    const L = this.L;
    const c = this.c;
    const snap = this.snapshot;
    const parts: string[] = [];
    const s = state ?? snap?.state;
    const prog = snap?.progress ?? (s ? caseProgress(c, s) : null);
    if (prog) {
      const current = prog.objectives[prog.currentIndex];
      if (prog.complete) parts.push(m(L, "status.complete"));
      else if (current) parts.push(m(L, "status.chapter", { n: prog.currentIndex + 1, title: truncate(objectiveTitle(c, current.id, L), 28) }));
      parts.push(m(L, "status.progress", { done: prog.done, total: prog.total }));
    }
    if (s) {
      parts.push(m(L, "status.phase", { phase: phaseLabel(c, s.phase, L) }));
      if (c.clock.mode === "simulated") parts.push(clockLabel(c, s.clock));
    }
    const v = snap?.vitals;
    if (v && !v.baselineOnly) parts.push(this.vitalsStatus(v));
    const place = this.o.place?.();
    if (place) parts.push(m(L, "status.place", { place: sanitizeTerminal(place) }));
    if (this.configured) {
      const model = this.configured.model || (this.configured.offline ? "deterministic" : "-");
      parts.push(`${this.configured.provider}/${model}`);
    }
    return this.p.dim(parts.join(" · "));
  }
}
