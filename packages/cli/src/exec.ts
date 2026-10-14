/**
 * `clinicalcraft exec <prompt>` / `clinicalcraft -p <prompt>` — headless runs
 * (Claude Code `-p`, Codex `exec`).
 *
 * Output formats:
 *   text         progress on stderr (unless --quiet), the final message on stdout
 *   json         one final `{"type":"result", …}` object
 *   stream-json  every AgentEvent as one JSON line, then the result line
 *
 * Approvals: nobody can answer a prompt in a headless run. With
 * `--approval default|strict|plan` every `approval_request` is denied with the
 * reason "headless: approval required" (the agent is told and adapts); with
 * `--approval auto|bypass` the requests that still arise are approved.
 *
 * Exit codes: 0 success · 1 error during execution · 2 usage error · 3 max turns.
 */
import { createInterface } from "node:readline";
import { assess as coreAssess, progress as caseProgress, type AssessmentReport } from "@clinicalcraft/core";
import { DEFAULT_AUTOPILOT_TURNS, type AgentEvent, type ClinicalSession, type Op, type TokenUsage } from "@clinicalcraft/agent";
import { flagBool, flagPositiveInt, flagString, UsageError, type ParsedArgs } from "./argv.js";
import { EXIT, resumeRef, sessionFlagsLayer, type CliContext } from "./context.js";
import { EventRenderer } from "./render.js";
import { openSession } from "./session.js";

/** Reason given to the agent when a headless run cannot ask the learner. */
export const HEADLESS_DENY_REASON = "headless: approval required";

export type ResultSubtype = "success" | "error_max_turns" | "error_during_execution";

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
}

/** Everything a headless run observed (shared with `eval`). */
export class RunTracker {
  readonly events: AgentEvent[] = [];
  lastMessage: string | null = null;
  usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  readonly usageByAgent: Record<string, TokenUsage> = {};
  assessment: ExecResult["assessment"] | null = null;
  readonly errors: string[] = [];
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
        this.errors.push(msg.code ? `${msg.message} [${msg.code}]` : msg.message);
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
export function autoAnswerApprovals(session: ClinicalSession, onDecision?: (summary: string, approved: boolean) => void): () => void {
  return session.subscribe((e) => {
    if (e.msg.type !== "approval_request") return;
    const { requestId, summary } = e.msg;
    const mode = session.settings.approvalMode;
    const approve = mode === "bypass" || mode === "auto";
    queueMicrotask(() => {
      onDecision?.(summary, approve);
      session.submit(approve ? { type: "approval_response", requestId, decision: "approved" } : { type: "approval_response", requestId, decision: "denied", reason: HEADLESS_DENY_REASON });
    });
  });
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
  const maxTurns = args.flags["max-turns"] !== undefined ? flagPositiveInt(args, "max-turns", 500, ctx.locale) : undefined;
  const to = flagString(args, "to");

  let prompt = flagString(args, "print") ?? args.positionals.join(" ");
  if (prompt === "-" || (!prompt && inputFormat === "text" && !autopilot && !ctx.io.stdin.isTTY)) prompt = (await readAllStdin(ctx.io.stdin)).trim();
  if (!prompt && !autopilot && inputFormat !== "stream-json") throw new UsageError(ctx.t("exec.noPrompt"));

  const extra: Record<string, unknown> = {};
  if (maxTurns !== undefined && !autopilot) extra.maxToolRounds = Math.min(maxTurns, 100);
  const flags = await sessionFlagsLayer(ctx, args, extra);
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
  autoAnswerApprovals(session, (summary, approved) => {
    if (approved && format === "text" && !quiet) ctx.printErr(ctx.err.yellow(ctx.t("exec.autoApproved", { summary })));
  });

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
  const subtype: ResultSubtype = tracker.errors.length > 0 ? "error_during_execution" : maxTurnsHit ? "error_max_turns" : "success";
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
  };

  await session.close();
  await pump;

  if (format === "json" || format === "stream-json") {
    write(JSON.stringify(result));
  } else {
    if (result.result) ctx.print(result.result);
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
    for (const e of tracker.errors) ctx.printErr(ctx.err.red(`✗ ${e}`));
  }
  if (subtype === "error_during_execution") return EXIT.error;
  if (subtype === "error_max_turns") return EXIT.maxTurns;
  return EXIT.ok;
}
