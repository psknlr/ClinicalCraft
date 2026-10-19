/**
 * `clinicalcraft exec <prompt>` / `clinicalcraft -p <prompt>` — headless runs
 * (Claude Code `-p`, Codex `exec`).
 *
 * Output formats:
 *   text         progress on stderr (unless --quiet), the final message on stdout
 *   json         one final `{"type":"result", …}` object
 *   stream-json  every AgentEvent as one JSON line, then the result line
 *
 * Approvals: nobody can answer a prompt in a headless run, so requests are
 * answered by `headlessDecision`:
 *   bypass   every request that still arises (ask rules) is approved;
 *   auto     low/moderate-risk requests are approved, but requests from
 *            `tool.always-ask`, ask rules (`rule.ask`) or with high risk are
 *            DENIED with a reason naming `--approve-high-risk` — unless that
 *            flag was passed (then they are approved too);
 *   default|strict|plan  every request is denied ("headless: approval required").
 * The agent is told and adapts. Exception: with `--input-format stream-json
 * --output-format stream-json` the client answers with `approval_response` ops
 * while its stdin is open (requests still open when stdin closes are then
 * answered as above).
 *
 * An `--autopilot` run that ends with objectives still open (steps denied or
 * blocked, a model that stopped) is reported as `error_incomplete`.
 *
 * Exit codes: 0 success · 1 error during execution · 2 usage error · 3 max
 * turns · 4 autopilot ended with the case incomplete.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createInterface } from "node:readline";
import { assess as coreAssess, progress as caseProgress, type AssessmentReport } from "@clinicalcraft/core";
import { DEFAULT_AUTOPILOT_TURNS, PERMISSION_RULE_IDS, traceJsonl, type AgentEvent, type ApprovalMode, type ClinicalSession, type Op, type RiskLevel, type TokenUsage } from "@clinicalcraft/agent";
import { flagBool, flagPositiveInt, flagString, UsageError, type ParsedArgs } from "./argv.js";
import { EXIT, requireProviderKey, resumeRef, sessionFlagsLayer, type CliContext } from "./context.js";
import { m } from "./i18n.js";
import { EventRenderer, sanitizeTerminal } from "./render.js";
import { openSession } from "./session.js";

/** Reason given to the agent when a headless run cannot ask the learner. */
export const HEADLESS_DENY_REASON = "headless: approval required";

/** Exit code of an `--autopilot` run that ended with the case incomplete. */
export const EXIT_INCOMPLETE = 4;

export type ResultSubtype = "success" | "error_max_turns" | "error_during_execution" | "error_incomplete";

/** Rules whose requests an unattended `auto` run never approves on its own: they exist to make a person confirm. */
const PERSON_REQUIRED_RULES: ReadonlySet<string> = new Set([PERMISSION_RULE_IDS.alwaysAsk, PERMISSION_RULE_IDS.ask]);

export interface HeadlessApprovalOptions {
  /** `--approve-high-risk`: in `auto`, also approve always-ask / ask-rule / high-risk requests. */
  approveHighRisk?: boolean;
}

/**
 * How a headless run answers one approval request (see the header): only
 * `bypass` approves everything; `auto` approves low/moderate-risk requests
 * and denies — never silently approves — always-ask, ask-rule and high-risk
 * ones unless `approveHighRisk`; every other mode denies.
 */
export function headlessDecision(
  mode: ApprovalMode,
  request: { risk: RiskLevel; ruleId: string },
  locale: string,
  options: HeadlessApprovalOptions = {},
): { approve: true } | { approve: false; reason: string } {
  if (mode === "bypass") return { approve: true };
  if (mode !== "auto") return { approve: false, reason: HEADLESS_DENY_REASON };
  const needsPerson = request.risk === "high" || PERSON_REQUIRED_RULES.has(request.ruleId);
  if (!needsPerson || options.approveHighRisk) return { approve: true };
  return { approve: false, reason: m(locale, "exec.denyHighRisk") };
}

/** The final `result` object of `--output-format json|stream-json`. */
export interface ExecResult {
  type: "result";
  subtype: ResultSubtype;
  is_error: boolean;
  session_id: string;
  case_id: string;
  /** Last agent message (or command output). */
  result: string | null;
  finished: boolean;
  completed: boolean;
  progress: { done: number; total: number };
  assessment: { report: AssessmentReport; narrative: string | null; judged: { id: string; met: boolean; evidence: string }[] };
  usage: TokenUsage;
  usage_by_agent: Record<string, TokenUsage>;
  num_turns: number;
  duration_ms: number;
  errors: string[];
  /** Runtime warnings (provider fallbacks, refusals…). */
  warnings: string[];
  /** Actions refused by the approval gate (denied approvals, deny rules, hooks). Not execution errors. */
  permission_denials: PermissionDenial[];
}

export interface PermissionDenial {
  tool: string | null;
  reason: string;
}

/** Everything a headless run observed (shared with `eval`). */
export class RunTracker {
  readonly events: AgentEvent[] = [];
  lastMessage: string | null = null;
  usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  readonly usageByAgent: Record<string, TokenUsage> = {};
  assessment: ExecResult["assessment"] | null = null;
  readonly errors: string[] = [];
  readonly warnings: string[] = [];
  readonly denials: PermissionDenial[] = [];
  private readonly requested = new Map<string, string>();
  private lastApprovalDenial: PermissionDenial | null = null;
  turnsByAgent: Record<string, number> = {};
  totalTurns = 0;
  maxToolRoundsHit = false;

  observe(e: AgentEvent): void {
    const msg = e.msg;
    switch (msg.type) {
      case "agent_message":
        if (msg.text.trim()) this.lastMessage = msg.text;
        break;
      case "command_output":
        if (msg.text.trim()) this.lastMessage = msg.text;
        break;
      case "turn_started":
        this.totalTurns++;
        this.turnsByAgent[String(msg.agent)] = (this.turnsByAgent[String(msg.agent)] ?? 0) + 1;
        break;
      case "token_usage": {
        this.usage = { ...msg.total };
        const mine = this.usageByAgent[String(msg.agent)] ?? { inputTokens: 0, outputTokens: 0 };
        mine.inputTokens += msg.usage.inputTokens;
        mine.outputTokens += msg.usage.outputTokens;
        if (msg.usage.cacheReadTokens) mine.cacheReadTokens = (mine.cacheReadTokens ?? 0) + msg.usage.cacheReadTokens;
        if (msg.usage.cacheWriteTokens) mine.cacheWriteTokens = (mine.cacheWriteTokens ?? 0) + msg.usage.cacheWriteTokens;
        this.usageByAgent[String(msg.agent)] = mine;
        break;
      }
      case "assessment":
        this.assessment = { report: msg.report, narrative: msg.narrative, judged: msg.judged };
        break;
      case "error":
        // A learner action refused by the spatial policy (embodied mode) is not an execution error.
        if (msg.code === "SPATIAL_REQUIREMENT_UNMET" || msg.code === "SPATIAL_PRECONDITION_CHANGED") {
          this.denials.push({ tool: null, reason: msg.message });
          this.lastApprovalDenial = null;
          break;
        }
        if (msg.code === "permission_denied") {
          // A denied approval for a learner action is reported again as an error: keep one entry.
          const prior = this.lastApprovalDenial;
          if (!(prior && msg.message.includes(prior.reason))) this.denials.push({ tool: null, reason: msg.message });
        } else this.errors.push(msg.code ? `${msg.message} [${msg.code}]` : msg.message);
        this.lastApprovalDenial = null;
        break;
      case "approval_request":
        this.requested.set(msg.requestId, msg.tool);
        break;
      case "approval_resolved":
        this.lastApprovalDenial = null;
        if (msg.decision === "denied" || msg.decision === "abort") {
          const denial = { tool: this.requested.get(msg.requestId) ?? null, reason: msg.reason ?? msg.decision };
          this.denials.push(denial);
          this.lastApprovalDenial = denial;
        }
        break;
      case "warning":
        this.warnings.push(msg.message);
        break;
      case "turn_aborted":
        if (msg.reason === "max_tool_rounds") this.maxToolRoundsHit = true;
        if (msg.reason === "error" && this.errors.length === 0) this.errors.push(`turn aborted (${String(msg.agent)})`);
        break;
      default:
        break;
    }
  }
}

/**
 * Answer approval requests in a headless run (deferred so the request event
 * is delivered to every listener before it is resolved).
 */
export function autoAnswerApprovals(
  session: ClinicalSession,
  onDecision?: (summary: string, approved: boolean) => void,
  /** When it returns false the request is left to someone else (a stream-json client). */
  enabled: () => boolean = () => true,
  options: HeadlessApprovalOptions = {},
): () => void {
  return session.subscribe((e) => {
    if (e.msg.type !== "approval_request") return;
    const { requestId, summary } = e.msg;
    const request = { risk: e.msg.risk, ruleId: e.msg.ruleId };
    queueMicrotask(() => {
      if (!enabled()) return;
      answerHeadless(session, requestId, request, options, (approved) => onDecision?.(summary, approved));
    });
  });
}

/** Submit the headless answer to one request. */
function answerHeadless(session: ClinicalSession, requestId: string, request: { risk: RiskLevel; ruleId: string }, options: HeadlessApprovalOptions, onDecision?: (approved: boolean) => void): void {
  const decision = headlessDecision(session.settings.approvalMode, request, session.settings.locale, options);
  onDecision?.(decision.approve);
  session.submit(decision.approve ? { type: "approval_response", requestId, decision: "approved" } : { type: "approval_response", requestId, decision: "denied", reason: decision.reason });
}

async function readAllStdin(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  return Buffer.concat(chunks).toString("utf8");
}

const OUT_OF_BAND = new Set(["interrupt", "approval_response", "dynamic_tool_response"]);

/** Parse one stream-json input line into an Op (throws with a message). */
export function parseOpLine(line: string): Op {
  const value = JSON.parse(line) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof (value as { type?: unknown }).type !== "string") throw new Error("expected an Op object with a string \"type\"");
  return value as Op;
}

export async function runExec(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const started = Date.now();
  const format = flagString(args, "output-format") ?? "text";
  const inputFormat = flagString(args, "input-format") ?? "text";
  const autopilot = flagBool(args, "autopilot");
  const quiet = flagBool(args, "quiet");
  const approvals: HeadlessApprovalOptions = { approveHighRisk: flagBool(args, "approve-high-risk") };
  const maxTurns = args.flags["max-turns"] !== undefined ? flagPositiveInt(args, "max-turns", 500, ctx.locale) : undefined;
  const to = flagString(args, "to");

  let prompt = [flagString(args, "print") ?? "", ...args.positionals].filter((s) => s.length > 0).join(" ");
  if (prompt === "-" || (!prompt && inputFormat === "text" && !autopilot && !ctx.io.stdin.isTTY)) prompt = (await readAllStdin(ctx.io.stdin)).trim();
  if (!prompt && !autopilot && inputFormat !== "stream-json") throw new UsageError(ctx.t("exec.noPrompt"));

  const extra: Record<string, unknown> = {};
  if (maxTurns !== undefined && !autopilot) extra.maxToolRounds = Math.min(maxTurns, 100);
  const flags = await sessionFlagsLayer(ctx, args, extra);
  await requireProviderKey(ctx, args, flags);
  const caseId = flagString(args, "case");
  const resume = resumeRef(args);
  const facility = flagString(args, "facility");
  const session = await openSession(ctx, { ...(caseId ? { caseId } : {}), flags, ...(resume ? { resume } : {}), ...(facility ? { facilityId: facility } : {}) });

  const tracker = new RunTracker();
  const write = (line: string) => void ctx.io.stdout.write(`${line}\n`);

  // stream-json: every event (incl. the startup backlog) in order, via the async iterator.
  const pump =
    format === "stream-json"
      ? (async () => {
          for await (const event of session.events()) write(JSON.stringify(event));
        })()
      : Promise.resolve();

  session.subscribe((e) => tracker.observe(e));
  const renderer =
    format === "text" && !quiet
      ? new EventRenderer({ out: ctx.io.stderr, palette: ctx.err, caseDef: session.caseDef, locale: () => session.settings.locale, interactive: false, verbose: ctx.verbose })
      : null;
  if (renderer) session.subscribe((e) => renderer.handle(e));
  // A stream-json client (stream-json in and out) answers approvals itself with
  // `approval_response` ops while its stdin is open; afterwards (and in every
  // other mode) they are answered automatically.
  let clientAnswers = inputFormat === "stream-json" && format === "stream-json";
  const unanswered = new Map<string, { risk: RiskLevel; ruleId: string }>();
  session.subscribe((e) => {
    if (e.msg.type === "approval_request") unanswered.set(e.msg.requestId, { risk: e.msg.risk, ruleId: e.msg.ruleId });
    else if (e.msg.type === "approval_resolved") unanswered.delete(e.msg.requestId);
  });
  autoAnswerApprovals(
    session,
    (summary, approved) => {
      if (approved && format === "text" && !quiet) ctx.printErr(ctx.err.yellow(ctx.t("exec.autoApproved", { summary: sanitizeTerminal(summary) })));
    },
    () => !clientAnswers,
    approvals,
  );

  const pending: Promise<unknown>[] = [];
  try {
    if (autopilot) {
      pending.push(session.run({ type: "autopilot", ...(prompt ? { goal: prompt } : {}), ...(maxTurns !== undefined ? { maxTurns } : {}) }));
    } else if (prompt) {
      pending.push(session.run({ type: "user_message", text: prompt, ...(to ? { to } : {}) }));
    }
    if (inputFormat === "stream-json") {
      const rl = createInterface({ input: ctx.io.stdin, crlfDelay: Infinity, terminal: false });
      let lineNo = 0;
      for await (const raw of rl) {
        lineNo++;
        const line = raw.trim();
        if (!line) continue;
        let op: Op;
        try {
          op = parseOpLine(line);
        } catch (err) {
          tracker.errors.push(ctx.t("exec.badOp", { line: lineNo, message: (err as Error).message }));
          ctx.printErr(ctx.err.red(ctx.t("exec.badOp", { line: lineNo, message: (err as Error).message })));
          continue;
        }
        if (OUT_OF_BAND.has(op.type)) session.submit(op);
        else pending.push(session.run(op));
      }
      if (clientAnswers) {
        clientAnswers = false;
        for (const [requestId, request] of [...unanswered]) answerHeadless(session, requestId, request, approvals);
      }
    }
    await Promise.all(pending);

    const wantAssess = args.flags.assess !== undefined ? flagBool(args, "assess") : autopilot;
    if (wantAssess && !session.isClosed) await session.run({ type: "assess" });
  } catch (err) {
    tracker.errors.push((err as Error).message);
  }

  const state = session.state;
  const prog = caseProgress(session.caseDef, state);
  const clinicianTurns = tracker.turnsByAgent.clinician ?? 0;
  const budget = maxTurns ?? DEFAULT_AUTOPILOT_TURNS;
  const maxTurnsHit = (autopilot && clinicianTurns >= budget && !state.finished) || tracker.maxToolRoundsHit;
  // An autopilot is asked to work the case: ending with objectives open (denied/blocked steps, a model that stopped) is not a success.
  const incomplete = autopilot && !prog.complete && !state.finished;
  const subtype: ResultSubtype = tracker.errors.length > 0 ? "error_during_execution" : maxTurnsHit ? "error_max_turns" : incomplete ? "error_incomplete" : "success";
  const result: ExecResult = {
    type: "result",
    subtype,
    is_error: subtype !== "success",
    session_id: session.id,
    case_id: session.caseDef.id,
    result: tracker.lastMessage,
    finished: state.finished,
    completed: prog.complete,
    progress: { done: prog.done, total: prog.total },
    assessment: tracker.assessment ?? { report: coreAssess(session.caseDef, state), narrative: null, judged: [] },
    usage: tracker.usage,
    usage_by_agent: tracker.usageByAgent,
    num_turns: autopilot ? clinicianTurns : tracker.totalTurns,
    duration_ms: Date.now() - started,
    errors: tracker.errors,
    warnings: tracker.warnings,
    permission_denials: tracker.denials,
  };

  await session.close();
  await pump;

  // `--trace <file>`: the episode trace as JSON Lines (a header line, then one span per line).
  const traceFile = flagString(args, "trace");
  if (traceFile) {
    const target = ctx.path(traceFile);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, traceJsonl(session.trace()), "utf8");
  }

  const lastMessageFile = flagString(args, "output-last-message");
  if (lastMessageFile) {
    const target = ctx.path(lastMessageFile);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, result.result ?? "", "utf8");
  }

  if (format === "json" || format === "stream-json") {
    write(JSON.stringify(result));
  } else {
    // stdout carries the final message for pipes/files; on a terminal the progress renderer already showed it.
    const alreadyShown = renderer !== null && Boolean(ctx.io.stdout.isTTY) && Boolean(ctx.io.stderr.isTTY);
    if (result.result && !alreadyShown) ctx.print(sanitizeTerminal(result.result));
    if (autopilot || result.finished) {
      const r = result.assessment.report;
      ctx.print(
        ctx.t("exec.summary", {
          finished: ctx.t(result.finished ? "word.yes" : "word.no"),
          done: result.progress.done,
          total: result.progress.total,
          score: r.score.percent,
        }),
      );
      ctx.print(ctx.t("assess.notice"));
    }
    if (subtype === "error_max_turns") ctx.printErr(ctx.err.yellow(ctx.t("exec.maxTurns", { turns: budget })));
    if (subtype === "error_incomplete") ctx.printErr(ctx.err.yellow(ctx.t("exec.incomplete", { done: result.progress.done, total: result.progress.total, denied: result.permission_denials.length })));
    for (const e of tracker.errors) ctx.printErr(ctx.err.red(`✗ ${sanitizeTerminal(e)}`));
  }
  if (subtype === "error_during_execution") return EXIT.error;
  if (subtype === "error_max_turns") return EXIT.maxTurns;
  if (subtype === "error_incomplete") return EXIT_INCOMPLETE;
  return EXIT.ok;
}
