/**
 * `clinicalcraft play [case]` — the interactive terminal REPL.
 *
 * Plain text goes to the current interlocutor (prompt `[patient] ›`),
 * `@nurse …` addresses someone else, `/commands` run slash commands (Tab
 * completes them). Agent replies stream live with speaker labels; tool calls,
 * clinical events and approvals render inline; a status line follows each
 * turn. Ctrl-C once interrupts the running turn, twice exits; `/quit` too.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface, type Interface } from "node:readline";
import { createSession as createEngineState, currentWaypoint, progress, t, vitalsAt, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import { agentLabel, availableInPhase, PROVIDER_TEMPLATES, sanitizeTerminal, visiblePhases, type AgentEvent, type ApprovalDecision, type ClinicalSession, type EventMsg } from "@clinicalcraft/agent";
import { CaseLibrary } from "@clinicalcraft/agent/node";
import { flagString, UsageError, type ParsedArgs } from "./argv.js";
import { EXIT, loadCliSettings, requireProviderKey, resumeRef, sessionFlagsLayer, type CliContext } from "./context.js";
import { HistoryFile } from "./history.js";
import { m } from "./i18n.js";
import { pickCase } from "./picker.js";
import { EventRenderer, resolvedModelLabel } from "./render.js";
import { openSession } from "./session.js";

type ApprovalRequest = Extract<EventMsg, { type: "approval_request" }>;

/** Parse an approval answer: y/yes · s/session · n/no [reason] · a/abort (null = not understood). */
export function parseApprovalAnswer(line: string, allowSession: boolean): { decision: ApprovalDecision; reason?: string } | null {
  const text = line.trim();
  const match = /^(\S+)\s*([\s\S]*)$/.exec(text);
  if (!match) return null;
  const word = match[1]!.toLowerCase().replace(/[.,!。，！]+$/, "");
  const rest = match[2]!.trim().replace(/^[(（](.*)[)）]$/, "$1").trim();
  if (["y", "yes", "ok", "approve", "是", "好", "同意", "确认"].includes(word)) return { decision: "approved" };
  if (["s", "session", "always", "本次", "会话"].includes(word)) return allowSession ? { decision: "approved_for_session" } : null;
  if (["n", "no", "deny", "否", "不", "拒绝"].includes(word)) return rest ? { decision: "denied", reason: rest } : { decision: "denied" };
  if (["a", "abort", "cancel", "取消", "中止"].includes(word)) return { decision: "abort" };
  return null;
}

/**
 * Candidate values for the argument of a slash command (Tab completion).
 * Phase and exam ids follow what the learner may know (`state`, default the
 * case's starting state): visible phases only (future automatic phases stay
 * unannounced) and the examinations of the current phase.
 */
export function argumentCandidates(command: string, c: CaseDefinition, agents: readonly string[], state: SessionState = createEngineState(c)): string[] {
  switch (command) {
    case "talk":
    case "consult":
      return [...agents];
    case "lang":
      return ["zh-CN", "en"];
    case "approval":
      return ["default", "strict", "auto", "plan", "bypass"];
    case "scope":
      return ["history-only", "workup", "full"];
    case "order":
    case "read":
      return c.investigations.map((i) => i.id);
    case "give":
      return c.interventions.map((i) => i.id);
    case "exam":
      return c.exam.filter((e) => availableInPhase(e, state)).map((e) => e.id);
    case "answer":
      return c.decisions.map((d) => d.id);
    case "phase": {
      const shown = visiblePhases(c, state);
      return c.phases.filter((p) => shown.has(p.id)).map((p) => p.id);
    }
    case "provider":
      return PROVIDER_TEMPLATES.map((p) => p.id);
    default:
      return [];
  }
}

/** readline completer: `/comm…`, `/talk n…`, `@nu…`. */
export function completeLine(line: string, commands: readonly string[], c: CaseDefinition, agents: readonly string[], state?: SessionState): [string[], string] {
  if (/^[/／][^\s]*$/.test(line)) {
    const all = commands.map((name) => `/${name}`);
    const typed = line.replace(/^／/, "/");
    const hits = all.filter((name) => name.startsWith(typed));
    return [hits.length ? hits : all, line];
  }
  const arg = /^[/／](\S+)\s+(\S*)$/.exec(line);
  if (arg) {
    const values = argumentCandidates(arg[1]!.toLowerCase(), c, agents, state);
    const word = arg[2]!;
    return [values.filter((v) => v.startsWith(word)), word];
  }
  if (/^[@＠]\S*$/.test(line)) {
    const typed = line.replace(/^＠/, "@");
    const all = agents.map((a) => `@${a}`);
    const hits = all.filter((a) => a.startsWith(typed));
    return [hits.length ? hits : all, line];
  }
  return [[], line];
}

function sexLabel(sex: string, L: string): string {
  const key = `sex.${sex}` as "sex.male";
  return m(L, key);
}

function ageLabel(c: CaseDefinition, L: string): string {
  return m(L, `age.${c.patient.ageUnit}` as "age.years", { n: c.patient.age });
}

export class Repl {
  private readonly renderer: EventRenderer;
  private readonly history: HistoryFile;
  private rl: Interface | null = null;
  private busy = false;
  private readonly queue: string[] = [];
  private readonly approvals: ApprovalRequest[] = [];
  private lastSigint = 0;
  private inputClosed = false;
  private quitting = false;
  private interlocutor = "patient";
  private finish: (code: number) => void = () => undefined;
  private readonly done: Promise<number>;
  private readonly offSigint: (() => void)[] = [];

  constructor(
    private readonly ctx: CliContext,
    private readonly session: ClinicalSession,
    private readonly options: { resumed: boolean; transcripts: boolean },
  ) {
    this.history = new HistoryFile(ctx.env);
    this.done = new Promise<number>((resolve) => (this.finish = resolve));
    const c = session.caseDef;
    const s = session.state;
    this.renderer = new EventRenderer({
      out: ctx.io.stdout,
      palette: ctx.out,
      caseDef: c,
      locale: () => session.settings.locale,
      interactive: Boolean(ctx.io.stdout.isTTY),
      verbose: ctx.verbose,
      // The model the session calls (custom providers and provider overrides included), not just the templates'.
      resolveModel: (provider, model) => resolvedModelLabel(session.settings, ctx.env, provider, model),
      place: () => session.placeLabel(),
    });
    const settings = session.settings;
    const offline = settings.provider === "offline";
    this.renderer.configured = {
      sessionId: session.id,
      provider: settings.provider,
      model: resolvedModelLabel(settings, ctx.env),
      approvalMode: settings.approvalMode,
      practiceScope: settings.practiceScope,
      interlocutor: "patient",
      offline,
    };
    this.renderer.snapshot = { state: s, progress: progress(c, s), vitals: vitalsAt(c, s), waypoint: currentWaypoint(c, s) };
  }

  private get L(): string {
    return this.session.settings.locale;
  }

  private get tty(): boolean {
    return Boolean(this.ctx.io.stdin.isTTY && this.ctx.io.stdout.isTTY);
  }

  /** Run until the learner quits; resolves with the exit code. */
  async run(): Promise<number> {
    this.session.subscribe((e) => this.onEvent(e));
    this.banner();
    this.openReadline();
    if (!this.options.resumed) {
      await this.send({ type: "user_message", text: "", to: "patient" });
    }
    this.afterTurn();
    return this.done;
  }

  private banner(): void {
    const c = this.session.caseDef;
    const L = this.L;
    const p = this.ctx.out;
    const r = this.renderer;
    // Case text is third-party content: strip every escape sequence (colours too) before the palette adds its own —
    // the renderer's final pass keeps colour codes, so it cannot tell a case's from the palette's.
    const ct = (text: Parameters<typeof t>[0]) => sanitizeTerminal(t(text, L));
    r.line(`${p.bold(`ClinicalCraft`)} ${p.dim("·")} ${p.bold(ct(c.title))}`);
    r.line(`${ct(c.patient.displayName)} · ${ageLabel(c, L)} · ${sexLabel(c.patient.sex, L)} · ${ct(c.patient.chiefComplaint)}`);
    if (c.patient.triageNote) r.line(p.dim(ct(c.patient.triageNote)));
    if (c.disclaimer) r.line(p.dim(ct(c.disclaimer)));
    const cfg = r.configured!;
    r.line(p.dim(m(L, "repl.config", { provider: cfg.provider, model: cfg.model || "-", approval: cfg.approvalMode, scope: cfg.practiceScope, locale: L })));
    if (this.options.resumed) r.line(p.cyan(m(L, "repl.resumed", { id: this.session.id, actions: this.session.snapshot().actions.length })));
    r.line(p.dim(m(L, "repl.hint")));
  }

  private promptText(): string {
    const p = this.ctx.out;
    // Chinese shows the role ("[患者] ›"); `@`/`/talk` still take the id.
    return `${p.cyan(`[${agentLabel(this.L, this.interlocutor)}]`)} ${p.bold("›")} `;
  }

  private openReadline(): void {
    const io = this.ctx.io;
    const rl = createInterface({
      input: io.stdin,
      output: io.stdout,
      terminal: this.tty,
      ...(this.tty
        ? {
            completer: (line: string) => completeLine(line, this.session.commands().map((cmd) => cmd.name), this.session.caseDef, this.session.availableAgents(), this.session.state),
            history: this.history.load(),
            historySize: 1000,
            removeHistoryDuplicates: true,
          }
        : {}),
      prompt: this.promptText(),
      crlfDelay: Infinity,
    });
    this.rl = rl;
    rl.on("line", (line) => this.onLine(line));
    rl.on("close", () => this.onClose());
    rl.on("SIGINT", () => this.onSigint());
    if (!this.tty) {
      const handler = () => this.onSigint();
      process.on("SIGINT", handler);
      this.offSigint.push(() => process.off("SIGINT", handler));
    }
  }

  private prompt(): void {
    // Piped input: no prompt (each consumed line is echoed with its prompt instead).
    if (this.quitting || !this.rl || this.inputClosed || !this.tty) return;
    this.rl.setPrompt(this.promptText());
    this.rl.prompt();
  }

  /* ---------------------------------------------------------------- */
  /* Input                                                             */
  /* ---------------------------------------------------------------- */

  private onLine(line: string): void {
    if (this.quitting) return;
    if (this.approvals.length > 0) {
      this.answerApproval(line);
      return;
    }
    if (this.busy) {
      if (line.trim()) this.queue.push(line);
      return;
    }
    void this.processLine(line);
  }

  private async processLine(line: string): Promise<void> {
    const text = line.trim();
    if (!text) {
      this.afterTurn(false);
      return;
    }
    if (this.tty) this.history.add(text);
    if (/^[/／](quit|exit)$/i.test(text)) {
      await this.quit();
      return;
    }
    if (!this.tty) this.renderer.line(this.ctx.out.dim(`${this.promptText()}${text}`));
    await this.send({ type: "user_message", text });
    this.afterTurn();
  }

  private async send(op: Parameters<ClinicalSession["run"]>[0]): Promise<void> {
    this.busy = true;
    try {
      await this.session.run(op);
    } catch (err) {
      this.renderer.line(this.ctx.out.red(`✗ ${(err as Error).message}`));
    } finally {
      this.busy = false;
    }
  }

  /** After a turn: status line, then the next queued line or the prompt. */
  private afterTurn(showStatus = true): void {
    if (this.quitting) return;
    this.renderer.ensureLineStart();
    if (this.session.isClosed) {
      void this.quit();
      return;
    }
    if (showStatus) this.renderer.line(this.renderer.statusLine(this.session.state));
    const next = this.queue.shift();
    if (next !== undefined) {
      void this.processLine(next);
      return;
    }
    if (this.inputClosed) {
      void this.quit();
      return;
    }
    this.prompt();
  }

  private onClose(): void {
    this.inputClosed = true;
    for (const req of this.approvals.splice(0)) {
      this.session.submit({ type: "approval_response", requestId: req.requestId, decision: "denied", reason: m(this.L, "repl.noInput") });
    }
    if (!this.busy && this.queue.length === 0) void this.quit();
  }

  private onSigint(): void {
    const now = Date.now();
    const p = this.ctx.out;
    if (now - this.lastSigint < 2000) {
      void this.quit();
      return;
    }
    this.lastSigint = now;
    if (this.busy || this.approvals.length > 0) {
      this.queue.length = 0;
      this.session.submit({ type: "interrupt" });
      this.renderer.line(p.dim(`^C ${m(this.L, "repl.interrupting")}`));
      return;
    }
    if (this.rl && this.rl.line) {
      this.rl.write(null, { ctrl: true, name: "e" });
      this.rl.write(null, { ctrl: true, name: "u" });
    }
    this.renderer.line(p.dim(`^C ${m(this.L, "repl.ctrlcAgain")}`));
    this.prompt();
  }

  /* ---------------------------------------------------------------- */
  /* Events                                                            */
  /* ---------------------------------------------------------------- */

  private onEvent(event: AgentEvent): void {
    const msg = event.msg;
    this.renderer.handle(event);
    switch (msg.type) {
      case "approval_request":
        this.approvals.push(msg);
        if (this.approvals.length === 1) this.askApproval(msg);
        break;
      case "approval_resolved": {
        const i = this.approvals.findIndex((a) => a.requestId === msg.requestId);
        if (i >= 0) {
          this.approvals.splice(i, 1);
          if (i === 0 && this.approvals[0]) this.askApproval(this.approvals[0]);
        }
        break;
      }
      case "config_changed":
        if (msg.patch.interlocutor) this.interlocutor = msg.patch.interlocutor;
        break;
      case "session_configured":
        this.interlocutor = msg.interlocutor;
        break;
      case "command_output":
        this.onCommandOutput(msg.name, msg.data);
        break;
      default:
        break;
    }
  }

  private onCommandOutput(name: string, data: unknown): void {
    if (name !== "export" || !data || typeof data !== "object") return;
    const { snapshot, path } = data as { snapshot?: unknown; path?: string | null };
    const target = this.ctx.path(path || `clinicalcraft-${this.session.id}.json`);
    try {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      this.renderer.line(this.ctx.out.green(m(this.L, "repl.exported", { path: target })));
    } catch (err) {
      this.renderer.line(this.ctx.out.red(`✗ ${(err as Error).message}`));
    }
  }

  private askApproval(req: ApprovalRequest): void {
    const p = this.ctx.out;
    const choices = req.allowSession ? m(this.L, "repl.approvalChoices") : m(this.L, "repl.approvalChoicesNoSession");
    // The renderer already printed "? <summary> (risk · rule · reason)"; add the choices.
    this.renderer.line(`  ${p.bold(choices)}`);
    this.awaitApprovalInput(req);
  }

  /**
   * Take the answer from input already received (piped lines in order; on a
   * TTY only typed-ahead lines that are approval answers), else prompt. With
   * no more input — or, piped, when the next line is a /command or @message —
   * the request is denied.
   */
  private awaitApprovalInput(req: ApprovalRequest): void {
    const queued = this.queue[0];
    // Piped input: a command or an @message is the script's next step, never an answer — deny the
    // request and leave the line queued (it runs next), instead of swallowing the rest of the script.
    if (queued !== undefined && !this.tty && /^[/@]/.test(queued.trim()) && !parseApprovalAnswer(queued, req.allowSession)) {
      this.answerApproval(`n ${m(this.L, "repl.notAnAnswer")}`);
      return;
    }
    if (queued !== undefined && (!this.tty || parseApprovalAnswer(queued, req.allowSession))) {
      this.queue.shift();
      this.answerApproval(queued);
      return;
    }
    if (this.inputClosed || !this.rl) {
      this.answerApproval(`n ${m(this.L, "repl.noInput")}`);
      return;
    }
    if (this.tty) {
      const p = this.ctx.out;
      this.rl.setPrompt(`${p.yellow("?")} ${p.bold("›")} `);
      this.rl.prompt();
    }
  }

  private answerApproval(line: string): void {
    const req = this.approvals[0];
    if (!req) return;
    const parsed = parseApprovalAnswer(line, req.allowSession);
    if (!this.tty) this.renderer.line(this.ctx.out.dim(`? › ${line.trim()}`));
    if (!parsed) {
      this.renderer.line(this.ctx.out.yellow(req.allowSession ? m(this.L, "repl.approvalChoices") : m(this.L, "repl.approvalChoicesNoSession")));
      this.awaitApprovalInput(req);
      return;
    }
    this.approvals.shift();
    this.session.submit({ type: "approval_response", requestId: req.requestId, decision: parsed.decision, ...(parsed.reason ? { reason: parsed.reason } : {}) });
    const next = this.approvals[0];
    if (next) this.askApproval(next);
  }

  /* ---------------------------------------------------------------- */
  /* Exit                                                              */
  /* ---------------------------------------------------------------- */

  async quit(): Promise<void> {
    if (this.quitting) return;
    this.quitting = true;
    this.renderer.ensureLineStart();
    if (this.busy) this.session.submit({ type: "interrupt" });
    await this.session.close();
    this.renderer.stopSpinner();
    const p = this.ctx.out;
    if (this.options.transcripts) this.renderer.line(p.dim(m(this.L, "repl.bye", { id: this.session.id })));
    else this.renderer.line(p.dim(m(this.L, "repl.byeEphemeral")));
    for (const off of this.offSigint) off();
    if (this.rl) {
      const rl = this.rl;
      this.rl = null;
      rl.close();
    }
    this.finish(EXIT.ok);
  }
}

export async function runPlay(ctx: CliContext, args: ParsedArgs): Promise<number> {
  if (args.positionals.length > 1) throw new UsageError(ctx.t("play.tooMany", { extra: args.positionals.slice(1).join(" ") }));
  const resume = resumeRef(args);
  const flags = await sessionFlagsLayer(ctx, args);
  await requireProviderKey(ctx, args, flags);
  let caseId = args.positionals[0];
  const settings = await loadCliSettings(ctx, flags);
  // One case library for the picker and the session: indexed, only the chosen case is validated.
  const library = await CaseLibrary.open({ dirs: settings.contentDirs });
  if (!caseId && !resume) caseId = settings.defaultCase ?? (await pickCase(ctx, library));
  const facility = flagString(args, "facility");
  const session = await openSession(ctx, { ...(caseId ? { caseId } : {}), flags, library, ...(resume ? { resume } : {}), ...(facility ? { facilityId: facility } : {}) });
  ctx.locale = session.settings.locale;
  const repl = new Repl(ctx, session, { resumed: resume !== undefined, transcripts: session.settings.transcripts.enabled });
  return repl.run();
}
