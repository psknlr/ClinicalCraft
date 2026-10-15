/**
 * MCP tool catalog (docs/PROTOCOL.md §11): `list_cases`, `start_case`, every
 * clinical tool of §3 with a required `session_id` (schemas and behaviour
 * come from the agent package's tool definitions) and `get_debrief`.
 *
 * Errors: malformed arguments are JSON-RPC `-32602` (thrown as `RpcError`);
 * failures while running a tool — unknown session, unknown case, engine
 * rejections, approval refusals — are results with `isError: true` so the
 * calling model can read and recover.
 */
import { inScope, isHiddenByDeny, rt, validateArgs, type PracticeScope, type ToolDefinition } from "@clinicalcraft/agent";
import { BootstrapError, type LoadedContent } from "@clinicalcraft/agent/node";
import { normalizeLocale, progress, t, type CaseDefinition } from "@clinicalcraft/core";
import { bridgedTools } from "./bridge.js";
import { assessmentText, caseListing, casesText } from "./format.js";
import { mm } from "./i18n.js";
import { RPC_ERRORS, RpcError } from "./jsonrpc.js";
import type { McpSession, SessionManager } from "./sessions.js";

/** A tool as listed by `tools/list`. */
export interface McpToolSpec {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean };
}

/** A `tools/call` result. */
export interface McpToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  [key: string]: unknown;
}

export interface ToolHost {
  readonly sessions: SessionManager;
  /** Server-wide locale (settings), used before a session exists. */
  readonly locale: string;
  readonly practiceScope: PracticeScope;
  readonly deny: readonly string[];
  content(): Promise<LoadedContent>;
}

const LOCALE_SCHEMA = { type: "string", enum: ["zh-CN", "en"], description: "Session language (default: the server settings' locale)." };
const SESSION_ID_SCHEMA = { type: "string", minLength: 1, maxLength: 200, description: "Id returned by start_case." };

const TITLES: Record<string, string> = {
  list_cases: "List cases",
  start_case: "Start a case",
  get_debrief: "Assessment & debrief",
  ask_patient: "Ask the patient",
  list_options: "List options",
  examine: "Examine",
  order_test: "Order a test",
  read_result: "Read a result",
  check_vitals: "Check vitals",
  intervene: "Intervene",
  consult: "Consult a colleague",
  answer_decision: "Answer a decision",
  set_phase: "Switch phase",
  wait: "Wait",
  update_workup: "Update the workup plan",
  case_status: "Case status",
  finish_case: "Finish the case",
};

function withSessionId(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = (schema.properties ?? {}) as Record<string, unknown>;
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  return { ...schema, type: "object", properties: { session_id: SESSION_ID_SCHEMA, ...properties }, required: ["session_id", ...required.filter((r) => r !== "session_id")], additionalProperties: false };
}

function clinicalSpec(tool: ToolDefinition<Record<string, unknown>>): McpToolSpec {
  return {
    name: tool.name,
    title: TITLES[tool.name] ?? tool.name,
    description: `${tool.description} Requires session_id from start_case.`,
    inputSchema: withSessionId(tool.inputSchema),
    annotations: { readOnlyHint: tool.readOnly, destructiveHint: tool.name === "intervene", idempotentHint: tool.readOnly, openWorldHint: false },
  };
}

/** The tools this server lists, honouring the practice scope and bare `deny` rules. */
export function mcpTools(host: Pick<ToolHost, "practiceScope" | "deny">, caseIds: readonly string[]): McpToolSpec[] {
  const clinical = [...bridgedTools().values()].filter((tool) => inScope(tool.scope, host.practiceScope) && !isHiddenByDeny(tool.name, host.deny)).map(clinicalSpec);
  return [
    {
      name: "list_cases",
      title: TITLES.list_cases!,
      description: "List the available clinical cases (id, title, specialty, difficulty, spoiler-free summary).",
      inputSchema: { type: "object", properties: { locale: LOCALE_SCHEMA }, additionalProperties: false },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: "start_case",
      title: TITLES.start_case!,
      description:
        "Start an encounter with a case and become the clinician. Returns session_id (pass it to every clinical tool) and the opening: " +
        "who the patient is, the chief complaint and what they say first.",
      inputSchema: {
        type: "object",
        properties: {
          case_id: { type: "string", minLength: 1, ...(caseIds.length > 0 ? { enum: [...caseIds] } : {}), description: "Case id from list_cases." },
          locale: LOCALE_SCHEMA,
          facility_id: { type: "string", minLength: 1, description: "Facility override (default: the case's facility)." },
        },
        required: ["case_id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    ...clinical,
    {
      name: "get_debrief",
      title: TITLES.get_debrief!,
      description:
        "Assess the encounter so far (objectives, required history/exam, essential investigations, decisions, safety, examiner judgements) " +
        "and, once the case is complete, the case debrief. A teaching-script measure, not a validated competency score.",
      inputSchema: { type: "object", properties: { session_id: SESSION_ID_SCHEMA }, required: ["session_id"], additionalProperties: false },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
  ];
}

/** A text result (optionally an error, optionally with structured content). */
export function textResult(text: string, structured?: Record<string, unknown>, isError = false): McpToolResult {
  return { content: [{ type: "text", text }], ...(structured ? { structuredContent: structured } : {}), ...(isError ? { isError: true } : {}) };
}

function sessionOrError(host: ToolHost, id: string): McpSession | McpToolResult {
  const entry = host.sessions.get(id);
  if (entry) return entry;
  const open = host.sessions.list().map((s) => s.id);
  return textResult(mm(host.locale, "session.unknown", { id, open: open.length ? open.join(", ") : mm(host.locale, "session.none") }), { error: "unknown_session", session_id: id }, true);
}

/** Validate `args` against a listed tool's schema; throws `RpcError(-32602)`. */
export function checkArguments(spec: McpToolSpec, args: unknown): Record<string, unknown> {
  if (args !== undefined && args !== null && (typeof args !== "object" || Array.isArray(args))) {
    throw new RpcError(RPC_ERRORS.invalidParams, `Invalid arguments for ${spec.name}: arguments must be an object`);
  }
  const result = validateArgs(spec.inputSchema, args ?? {});
  if (!result.ok) throw new RpcError(RPC_ERRORS.invalidParams, `Invalid arguments for ${spec.name}: ${result.errors.join("; ")}`, { errors: result.errors });
  return result.value as Record<string, unknown>;
}

function sortedCases(content: LoadedContent): CaseDefinition[] {
  return [...content.cases.values()].map((e) => e.def).sort((a, b) => a.id.localeCompare(b.id));
}

/** Execute a validated tool call. */
export async function callTool(host: ToolHost, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<McpToolResult> {
  switch (name) {
    case "list_cases": {
      const L = normalizeLocale(typeof args.locale === "string" ? args.locale : host.locale);
      const cases = sortedCases(await host.content());
      return textResult(casesText(cases, L), { cases: cases.map((c) => caseListing(c, L)) });
    }
    case "start_case":
      return startCase(host, args);
    case "get_debrief": {
      const entry = sessionOrError(host, String(args.session_id));
      if (!("session" in entry)) return entry;
      return host.sessions.exclusive(entry, () => debrief(entry));
    }
    default: {
      const entry = sessionOrError(host, String(args.session_id));
      if (!("session" in entry)) return entry;
      const { session_id: _sid, ...toolArgs } = args;
      return host.sessions.exclusive(entry, async () => {
        const outcome = await entry.runner.run(name, toolArgs, signal);
        if (outcome.status === "refused") {
          return textResult(outcome.message, { session_id: entry.id, tool: name, ok: false, refused: { reason: outcome.reason, ruleId: outcome.ruleId } }, true);
        }
        const { output, notices } = outcome;
        const text = notices.length > 0 ? `${output.output}\n\n${notices.map((n) => `! ${n}`).join("\n")}` : output.output;
        return textResult(text, { session_id: entry.id, tool: name, ok: output.ok, data: output.data ?? null, ...(notices.length ? { notices } : {}) }, !output.ok);
      });
    }
  }
}

async function startCase(host: ToolHost, args: Record<string, unknown>): Promise<McpToolResult> {
  const caseId = String(args.case_id);
  const locale = typeof args.locale === "string" ? normalizeLocale(args.locale) : null;
  const L = locale ?? host.locale;
  let entry: McpSession;
  try {
    entry = await host.sessions.start({ caseId, locale, facilityId: typeof args.facility_id === "string" ? args.facility_id : null });
  } catch (err) {
    if (err instanceof BootstrapError || err instanceof Error) return textResult(mm(L, "start.failed", { message: err.message }), { error: "start_failed", case_id: caseId }, true);
    throw err;
  }
  return host.sessions.exclusive(entry, async () => {
    const session = entry.session;
    const SL = session.locale;
    // The learner-facing case card (same as `/case` in the REPL) …
    const card = (await session.run({ type: "slash_command", name: "case", args: "" })).flatMap((e) => (e.msg.type === "command_output" ? [e.msg] : []))[0];
    // … and the patient's first words when approached (an empty message = approach).
    const approach = await session.run({ type: "user_message", text: "", to: "patient" });
    const replies = approach.flatMap((e) => (e.msg.type === "agent_message" ? [e.msg] : []));
    const c = session.caseDef;
    const opening = replies.map((r) => r.text).join("\n") || t(c.patient.persona.openingLine, SL);
    const speaker = replies[0]?.speaker ?? t(c.patient.displayName, SL);
    const text = [
      mm(SL, "start.header", { session: session.id }),
      card?.text ?? "",
      mm(SL, "start.says", { speaker, text: opening }),
      mm(SL, "start.next", { session: session.id }),
    ]
      .filter(Boolean)
      .join("\n\n");
    return textResult(text, {
      session_id: session.id,
      case_id: c.id,
      locale: SL,
      opening,
      speaker,
      case: card?.data ?? null,
      approvalMode: session.settings.approvalMode,
      practiceScope: session.settings.practiceScope,
    });
  });
}

async function debrief(entry: McpSession): Promise<McpToolResult> {
  const session = entry.session;
  const L = session.locale;
  const events = await session.run({ type: "assess" });
  const assessment = events.flatMap((e) => (e.msg.type === "assessment" ? [e.msg] : []))[0];
  if (!assessment) {
    const problems = events.flatMap((e) => (e.msg.type === "error" ? [e.msg.message] : []));
    return textResult(mm(L, "debrief.failed", { message: problems.join("; ") || "-" }), { session_id: entry.id, error: "assessment_failed" }, true);
  }
  const c = session.caseDef;
  const complete = session.state.finished || progress(c, session.state).complete;
  let caseDebrief: { text: string; data: unknown } | null = null;
  if (complete) {
    const out = (await session.run({ type: "slash_command", name: "debrief", args: "" })).flatMap((e) => (e.msg.type === "command_output" ? [e.msg] : []))[0];
    if (out) caseDebrief = { text: out.text, data: out.data ?? null };
  }
  const summary = assessmentText(c, assessment.report, assessment.narrative, assessment.judged, L, { notice: caseDebrief === null });
  const text = caseDebrief ? `${summary}\n\n${caseDebrief.text}` : summary;
  return textResult(text, {
    session_id: entry.id,
    complete,
    report: assessment.report,
    narrative: assessment.narrative,
    judged: assessment.judged,
    debrief: caseDebrief?.data ?? null,
    notice: rt(L, "cmd.debrief.notice"),
  });
}
