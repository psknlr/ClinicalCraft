/**
 * MCP tool catalog (docs/PROTOCOL.md §11): `list_cases`, `start_case`, every
 * clinical tool of §3 with a required `session_id` (schemas and behaviour
 * come from the agent package's tool definitions) and `get_debrief`.
 *
 * Errors: malformed arguments are JSON-RPC `-32602` (thrown as `RpcError`);
 * failures while running a tool — unknown session, unknown case, engine
 * rejections, approval refusals — are results with `isError: true` so the
 * calling model can read and recover. A refusal that needs confirmation
 * (`refused.confirm: "required"`) runs when the client calls again with
 * `confirm: true` (every state-changing tool accepts it).
 */
import { inScope, isHiddenByDeny, libraryOrder, rt, validateArgs, type PracticeScope, type ToolDefinition } from "@clinicalcraft/agent";
import type { LoadedContent } from "@clinicalcraft/agent/node";
import { normalizeLocale, progress, t, type AssessmentReport, type CaseDefinition } from "@clinicalcraft/core";
import { bridgedTools } from "./bridge.js";
import { assessmentText, caseHandle, caseListing, casesText, resolveCaseRef } from "./format.js";
import { mm } from "./i18n.js";
import { RPC_ERRORS, RpcError } from "./jsonrpc.js";
import type { McpSession, SessionManager } from "./sessions.js";

/**
 * MCP `ToolAnnotations` (spec 2025-06-18): hints for clients deciding how to
 * present or confirm a call — never a security boundary (the approval gate
 * and `confirm: true` are).
 */
export interface McpToolAnnotations {
  /** Human-readable title (also the tool's top-level `title`). */
  title: string;
  /** The tool does not modify its environment (the encounter, the session or the server's sessions). */
  readOnlyHint: boolean;
  /** It may act irreversibly at high risk on the simulated patient (calls the approval gate can rate `high`). */
  destructiveHint: boolean;
  /** Repeating a call with the same arguments has no further effect. */
  idempotentHint: boolean;
  /** It reaches outside a closed world: always false (a closed simulation over local case data). */
  openWorldHint: boolean;
}

/** A tool as listed by `tools/list`. */
export interface McpToolSpec {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: McpToolAnnotations;
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
  /** Diagnostics (stderr). */
  log?: (message: string) => void;
  /** Server-wide locale (settings), used before a session exists. */
  readonly locale: string;
  readonly practiceScope: PracticeScope;
  readonly deny: readonly string[];
  content(): Promise<LoadedContent>;
}

const LOCALE_SCHEMA = { type: "string", enum: ["zh-CN", "en"], description: "Session language (default: the server settings' locale)." };
const SESSION_ID_SCHEMA = { type: "string", minLength: 1, maxLength: 200, description: "Id returned by start_case." };

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const RECORDS = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

/**
 * Annotations of every tool (docs/PROTOCOL.md §11, MCP).
 * Read-only: they only read the encounter. Everything else changes it — even
 * a repeated `ask_patient`, `examine` or `read_result` records the act and
 * spends simulated minutes on a simulated clock; `consult` records a scored
 * hint when the attending gives one. Destructive: `intervene` (drugs and
 * procedures act on the patient; contraindicated ones harm, high-risk ones
 * need confirmation) and `order_test` (invasive investigations such as
 * angiography are rated `high`). Idempotent: read-only tools, `set_phase`
 * (the same phase again changes nothing), `update_workup` (it replaces the
 * plan) and `finish_case` (a finished case refuses a repeat).
 */
export const TOOL_ANNOTATIONS: Readonly<Record<string, McpToolAnnotations>> = {
  list_cases: { title: "List cases", ...READ_ONLY },
  start_case: { title: "Start a case", ...RECORDS },
  get_debrief: { title: "Assessment & debrief", ...READ_ONLY },
  ask_patient: { title: "Ask the patient", ...RECORDS },
  list_options: { title: "List options", ...READ_ONLY },
  examine: { title: "Examine", ...RECORDS },
  order_test: { title: "Order a test", ...RECORDS, destructiveHint: true },
  read_result: { title: "Read a result", ...RECORDS },
  check_vitals: { title: "Check vitals", ...READ_ONLY },
  intervene: { title: "Intervene", ...RECORDS, destructiveHint: true },
  consult: { title: "Consult a colleague", ...RECORDS },
  answer_decision: { title: "Answer a decision", ...RECORDS },
  set_phase: { title: "Switch phase", ...RECORDS, idempotentHint: true },
  wait: { title: "Wait", ...RECORDS },
  update_workup: { title: "Update the workup plan", ...RECORDS, idempotentHint: true },
  case_status: { title: "Case status", ...READ_ONLY },
  finish_case: { title: "Finish the case", ...RECORDS, idempotentHint: true },
};

/** A tool's annotations; one missing from the table gets the spec's cautious defaults (still a closed world). */
export function toolAnnotations(name: string): McpToolAnnotations {
  return { ...(TOOL_ANNOTATIONS[name] ?? { title: name, readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }) };
}

function withSessionId(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = (schema.properties ?? {}) as Record<string, unknown>;
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  return { ...schema, type: "object", properties: { session_id: SESSION_ID_SCHEMA, ...properties }, required: ["session_id", ...required.filter((r) => r !== "session_id")], additionalProperties: false };
}

/**
 * Optional on every state-changing tool: the second step of a confirmation.
 * Read-only tools never need approval.
 */
const CONFIRM_SCHEMA = {
  type: "boolean",
  description:
    "Only after a previous identical call was refused as needing confirmation (high-risk or always-ask actions such as thrombolysis, ask rules): " +
    "set true once the person you act for has agreed to this action. Never set it on a first attempt.",
};

function withConfirm(schema: Record<string, unknown>): Record<string, unknown> {
  return { ...schema, properties: { ...((schema.properties ?? {}) as Record<string, unknown>), confirm: CONFIRM_SCHEMA } };
}

function clinicalSpec(tool: ToolDefinition<Record<string, unknown>>): McpToolSpec {
  const schema = withSessionId(tool.inputSchema);
  const annotations = toolAnnotations(tool.name);
  return {
    name: tool.name,
    title: annotations.title,
    // `confirm` follows the approval gate (tools it never asks about are read-only there), not the hints.
    description: `${tool.description} Requires session_id from start_case.${tool.readOnly ? "" : " High-risk or always-ask actions need a second call with confirm: true after the user agreed."}`,
    inputSchema: tool.readOnly ? schema : withConfirm(schema),
    annotations,
  };
}

/** The tools this server lists, honouring the practice scope and bare `deny` rules. */
export function mcpTools(host: Pick<ToolHost, "practiceScope" | "deny">): McpToolSpec[] {
  const clinical = [...bridgedTools().values()].filter((tool) => inScope(tool.scope, host.practiceScope) && !isHiddenByDeny(tool.name, host.deny)).map(clinicalSpec);
  return [
    {
      name: "list_cases",
      title: toolAnnotations("list_cases").title,
      description: "List the available clinical cases (opaque id handle, spoiler-free title and summary, specialty, difficulty).",
      inputSchema: { type: "object", properties: { locale: LOCALE_SCHEMA }, additionalProperties: false },
      annotations: toolAnnotations("list_cases"),
    },
    {
      name: "start_case",
      title: toolAnnotations("start_case").title,
      description:
        "Start an encounter with a case and become the clinician. Returns session_id (pass it to every clinical tool) and the opening: " +
        "who the patient is, the chief complaint and what they say first.",
      inputSchema: {
        type: "object",
        properties: {
          // No enum: the ids name the diagnoses. list_cases gives opaque handles.
          case_id: { type: "string", minLength: 1, description: "Case handle (`id`) from list_cases." },
          locale: LOCALE_SCHEMA,
          facility_id: { type: "string", minLength: 1, description: "Facility override (default: the case's facility)." },
        },
        required: ["case_id"],
        additionalProperties: false,
      },
      annotations: toolAnnotations("start_case"),
    },
    ...clinical,
    {
      name: "get_debrief",
      title: toolAnnotations("get_debrief").title,
      description:
        "Assess the encounter so far (objectives, required history/exam, essential investigations, decisions, safety, examiner judgements) " +
        "and, once the case is complete, the case debrief. A teaching-script measure, not a validated competency score.",
      inputSchema: { type: "object", properties: { session_id: SESSION_ID_SCHEMA }, required: ["session_id"], additionalProperties: false },
      annotations: toolAnnotations("get_debrief"),
    },
  ];
}

/** "Notice: …" lines for session warnings (offline responder, grounding fallbacks), or "". */
function noticeLines(locale: string, warnings: readonly string[]): string {
  return warnings.map((w) => mm(locale, "notice.line", { text: w })).join("\n");
}

/** A text result (optionally an error, optionally with structured content). */
export function textResult(text: string, structured?: Record<string, unknown>, isError = false): McpToolResult {
  return { content: [{ type: "text", text }], ...(structured ? { structuredContent: structured } : {}), ...(isError ? { isError: true } : {}) };
}

function findSession(host: ToolHost, id: string): { entry: McpSession } | { error: McpToolResult } {
  const entry = host.sessions.get(id);
  if (entry) return { entry };
  const open = host.sessions.list().map((s) => s.id);
  const error = textResult(mm(host.locale, "session.unknown", { id, open: open.length ? open.join(", ") : mm(host.locale, "session.none") }), { error: "unknown_session", session_id: id }, true);
  return { error };
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

/** Library order (`libraryOrder`: published first, difficulty, id) — the CLI's order; listed by opaque handle, never by id. */
function sortedCases(content: LoadedContent): CaseDefinition[] {
  return libraryOrder([...content.cases.values()].map((e) => e.def));
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
      const found = findSession(host, String(args.session_id));
      if ("error" in found) return found.error;
      const entry = found.entry;
      return host.sessions.exclusive(entry, () => debrief(entry));
    }
    default: {
      const found = findSession(host, String(args.session_id));
      if ("error" in found) return found.error;
      const entry = found.entry;
      const { session_id: _sid, confirm, ...toolArgs } = args;
      return host.sessions.exclusive(entry, async () => {
        const outcome = await entry.runner.run(name, toolArgs, signal, { confirmed: confirm === true });
        if (outcome.status === "refused") {
          const refused = { reason: outcome.reason, ruleId: outcome.ruleId, ...(outcome.reason === "ask" ? { risk: outcome.risk ?? null, confirm: "required" } : {}) };
          return textResult(outcome.message, { session_id: entry.id, tool: name, ok: false, refused }, true);
        }
        const { output, notices } = outcome;
        const warnings = outcome.warnings ?? [];
        const text = [output.output, notices.length > 0 ? notices.map((n) => `! ${n}`).join("\n") : "", noticeLines(entry.session.locale, warnings)].filter(Boolean).join("\n\n");
        return textResult(text, { session_id: entry.id, tool: name, ok: output.ok, data: output.data ?? null, ...(notices.length ? { notices } : {}), ...(warnings.length ? { warnings } : {}) }, !output.ok);
      });
    }
  }
}

async function startCase(host: ToolHost, args: Record<string, unknown>): Promise<McpToolResult> {
  const ref = String(args.case_id);
  const locale = typeof args.locale === "string" ? normalizeLocale(args.locale) : null;
  const L = locale ?? host.locale;
  const known = resolveCaseRef([...(await host.content()).cases.values()].map((e) => e.def), ref);
  if (!known) return textResult(mm(L, "start.unknownCase", { ref }), { error: "unknown_case", case_id: ref }, true);
  let entry: McpSession;
  try {
    entry = await host.sessions.start({ caseId: known.id, locale, facilityId: typeof args.facility_id === "string" ? args.facility_id : null });
  } catch (err) {
    // Unknown facility (BootstrapError), unreadable settings…: the model can pick another case.
    return textResult(mm(L, "start.failed", { message: err instanceof Error ? err.message : String(err) }), { error: "start_failed", case_id: ref }, true);
  }
  return host.sessions.exclusive(entry, async () => {
    const session = entry.session;
    const SL = session.locale;
    // The learner-facing case card (same as `/case` in the REPL) …
    const card = (await session.run({ type: "slash_command", name: "case", args: "" })).flatMap((e) => (e.msg.type === "command_output" ? [e.msg] : []))[0];
    // … and the patient's first words when approached (an empty message = approach).
    const approach = await session.run({ type: "user_message", text: "", to: "patient" });
    // E.g. "no API key for provider … — using the deterministic offline responder": the client must know.
    const warnings = [...new Set(approach.flatMap((e) => (e.msg.type === "warning" ? [e.msg.message] : [])))];
    for (const w of warnings) host.log?.(w);
    const replies = approach.flatMap((e) => (e.msg.type === "agent_message" ? [e.msg] : []));
    const c = session.caseDef;
    const opening = replies.map((r) => r.text).join("\n") || t(c.patient.persona.openingLine, SL);
    const speaker = replies[0]?.speaker ?? t(c.patient.displayName, SL);
    const text = [
      mm(SL, "start.header", { session: session.id }),
      card?.text ?? "",
      mm(SL, "start.says", { speaker, text: opening }),
      mm(SL, "start.next", { session: session.id }),
      noticeLines(SL, warnings),
    ]
      .filter(Boolean)
      .join("\n\n");
    const cardData = card?.data && typeof card.data === "object" ? { ...(card.data as Record<string, unknown>), id: caseHandle(c.id) } : null;
    return textResult(text, {
      session_id: session.id,
      case_id: caseHandle(c.id),
      locale: SL,
      opening,
      speaker,
      case: cardData,
      approvalMode: session.settings.approvalMode,
      practiceScope: session.settings.practiceScope,
      provider: session.settings.provider,
      ...(warnings.length ? { warnings } : {}),
    });
  });
}

/** The assessment report as a client may see it before the case is complete. */
function midCaseReport(report: AssessmentReport, handle: string): Record<string, unknown> {
  const { essentialMissing, ...investigations } = report.investigations;
  return { ...report, caseId: handle, investigations: { ...investigations, essentialMissingCount: essentialMissing.length } };
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
  const summary = assessmentText(c, assessment.report, assessment.narrative, assessment.judged, L, { notice: caseDebrief === null, final: complete });
  const text = caseDebrief ? `${summary}\n\n${caseDebrief.text}` : summary;
  return textResult(text, {
    session_id: entry.id,
    complete,
    // Mid-case: the handle, not the diagnosis-bearing caseId, and how many essential tests are missing, not which
    // (an answer key). The debrief names both once the case is complete.
    report: complete ? assessment.report : midCaseReport(assessment.report, caseHandle(c.id)),
    narrative: assessment.narrative,
    judged: assessment.judged,
    debrief: caseDebrief?.data ?? null,
    notice: rt(L, "cmd.debrief.notice"),
  });
}
