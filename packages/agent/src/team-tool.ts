/**
 * The `team` tool of an external agent (docs/PROTOCOL.md §11, §13; docs/TEAM.md §5): the learner's part in the care
 * team over MCP and the world bridge — `status`, `step`, `run`, `reply`, `ask`, `need`, `count`, `play`, `observe` — each
 * mapped to the session's own `team` op, so the session decides and words everything; and `callout`, the stand-in
 * surgeon's call-out answered (an approval response: headless over MCP only — in a live session the learner answers it
 * in the browser). The tool's output is what the team said, the session's refusals and warnings as it said them — an
 * observer refusal naming this tool's own `play` —, and what waits on the learner now (`./team-text.ts`).
 */
import type { AgentEvent, Op } from "./protocol.js";
import { rt } from "./session/i18n.js";
import type { ReplyKind } from "./session/team/awaits.js";
import type { TeamCheckpoint } from "./session/team/types.js";
import { defaultReplyTarget, saidLines, teamLines, type AnswerWords, type TeamStatusReport, type TeamTextContext } from "./team-text.js";
import { validateArgs } from "./tools/validate.js";

/** The tool's actions. */
export const TEAM_TOOL_ACTIONS = ["status", "step", "run", "reply", "ask", "need", "count", "play", "observe", "callout"] as const;
export type TeamToolAction = (typeof TEAM_TOOL_ACTIONS)[number];

const REPLY_KINDS: readonly ReplyKind[] = ["readback", "confirm", "decline", "report"];

/** The `team` tool: its name, what it does and its arguments (validated on every path: `teamToolOp`). */
export const TEAM_TOOL = {
  name: "team",
  description:
    "The care team at the operating table (in-world sessions of a case with a team): status — the team now and what the surgeon waits on you for (a request, " +
    "its stop after you said Stop, the count), with how to answer; step — one round of the team; run — rounds until the surgeon waits on you, the work in " +
    "hand has ended, or `rounds`; reply — answer a line said to you (`message`: its id, default the one the surgeon waits on you for; `kind`: readback, " +
    "confirm, decline or report; `text`: your words — a confirmation or a decline needs none; go on after a stop is a confirm); ask — ask a colleague (`to`: a " +
    "staff id, a name or a position such as first assistant or camera holder) for something in the operative field (`field`: {op: traction, release, " +
    "camera, aim, zoom or pass, port?, structure?, direction?, force?, region?, zoom?, instrument?}); need — say what you need (`item`: an equipment type; " +
    "`for`: whom, default the surgeon); count — say the count when it is yours; play — you play your part yourself; observe — the team plays it for you; " +
    "callout — answer the stand-in surgeon's call-out before a critical step (`decision`: approve = no objection, deny = stop). Holding a place in the team " +
    "(start_case seat), the stand-in surgeon operates as the team works: your own steps are operate calls, as your place.",
  inputSchema: {
    type: "object",
    properties: {
      action: { type: "string", enum: [...TEAM_TOOL_ACTIONS] },
      message: { type: "string", minLength: 1, maxLength: 40, description: "reply: the id of the line you answer (msg-…); default: the one the surgeon waits on you for." },
      kind: { type: "string", enum: [...REPLY_KINDS], description: "reply: readback, confirm, decline or report." },
      text: { type: "string", maxLength: 400, description: "reply: your own words (a confirmation or a decline needs none)." },
      item: { type: "string", minLength: 1, maxLength: 80, description: "need: the equipment type needed; reply: the instrument a read-back names." },
      for: { type: "string", minLength: 1, maxLength: 80, description: "need: whom it is for — a member's staff id (default: the surgeon)." },
      to: { type: "string", minLength: 1, maxLength: 80, description: "ask: whom you ask — a staff id, a name, or a position (first assistant, camera holder…)." },
      field: { type: "object", description: "ask: what is asked of the operative field, {op, port?, structure?, direction?, force?, region?, zoom?, instrument?}." },
      decision: { type: "string", enum: ["approve", "deny"], description: "callout: approve (no objection) or deny (stop)." },
      rounds: { type: "integer", minimum: 1, maximum: 200, description: "run: at most this many rounds (default 40)." },
    },
    required: ["action"],
    additionalProperties: false,
  } as Record<string, unknown>,
} as const;

/** A `team` op of the protocol. */
export type TeamOp = Extract<Op, { type: "team" }>;

/** What a call is: a `team` op of the session, the team's status, a call-out's answer, or why it is not well formed. */
export type TeamToolCall = { action: Exclude<TeamToolAction, "status" | "callout">; op: TeamOp } | { action: "status" } | { action: "callout"; approve: boolean } | { error: string };

/**
 * The call a tool's arguments make (validated against `TEAM_TOOL.inputSchema`): `play` and `observe` are who plays the
 * learner's part (`surgeon learner | simulated`); a `reply` without `message` answers the line the surgeon waits on the
 * learner for, else the one line said to them that waits for an answer (`cp`: the team now).
 */
export function teamToolCall(raw: unknown, cp: TeamCheckpoint | null, locale: string): TeamToolCall {
  const checked = validateArgs(TEAM_TOOL.inputSchema, raw ?? {});
  if (!checked.ok) return { error: checked.errors.join("; ") };
  const a = checked.value as { action: TeamToolAction; message?: string; kind?: ReplyKind; text?: string; item?: string; for?: string; to?: string; field?: unknown; decision?: "approve" | "deny"; rounds?: number };
  const op = (patch: Omit<TeamOp, "type">): TeamToolCall => ({ action: a.action as Exclude<TeamToolAction, "status" | "callout">, op: { type: "team", ...patch } });
  switch (a.action) {
    case "status":
      return { action: "status" };
    case "callout":
      return a.decision ? { action: "callout", approve: a.decision === "approve" } : { error: 'callout needs decision: "approve" or "deny"' };
    case "step":
      return op({ action: "step" });
    case "run":
      return op({ action: "run", ...(a.rounds !== undefined ? { rounds: a.rounds } : {}) });
    case "play":
      return op({ action: "surgeon", surgeon: "learner" });
    case "observe":
      return op({ action: "surgeon", surgeon: "simulated" });
    case "count":
      return op({ action: "count" });
    case "need":
      return a.item ? op({ action: "need", item: a.item, ...(a.for ? { for: a.for } : {}) }) : { error: "need needs item (an equipment type)" };
    case "ask":
      return a.to && a.field ? op({ action: "ask", to: a.to, field: a.field as TeamOp["field"] }) : { error: "ask needs to and field" };
    case "reply": {
      if (!a.kind) return { error: "reply needs kind (readback, confirm, decline, report)" };
      const message = a.message ?? (cp ? defaultReplyTarget(cp) : null);
      if (!message) return { error: rt(locale, "teamCmd.noAwaited") };
      return op({ action: "reply", message, kind: a.kind, ...(a.text?.trim() ? { text: a.text.trim() } : {}), ...(a.item ? { item: a.item } : {}) });
    }
    default:
      return { error: `unknown action "${String(a.action)}"` };
  }
}

/** How the tool tells the learner to answer: as a call of this tool. */
export const TEAM_TOOL_WORDS: AnswerWords = {
  reply: (message, kind) => `team {action: "reply", message: "${message}", kind: "${kind}"}`,
  count: () => `team {action: "count"}`,
};

/** The call-out a learner may answer with this tool: who says it, its line, and how. */
export interface CalloutPending {
  requestId: string;
  /** The stand-in's body (`staff:<id>`). */
  actorId: string;
  /** Who says it, by name. */
  who: string;
  /** "Clipping the cystic duct." — in the session's language. */
  line: string;
}

/**
 * The tool's result: what the team said in the call's events, the session's errors and warnings as it said them — an
 * observer refusal named with this tool's `play` —, the team now and what waits on the learner (`teamLines`), and a
 * call-out waiting for the learner's answer (`callout`: how to give it is the front-end's — null where the tool cannot).
 */
export function teamToolResult(
  ctx: TeamTextContext,
  cp: TeamCheckpoint | null,
  events: readonly AgentEvent[],
  callout: { pending: CalloutPending; how: string | null } | null = null,
): { ok: boolean; text: string; data: { said: string[]; errors: string[]; warnings: string[]; team: TeamStatusReport | null; callout: CalloutPending | null } } {
  const L = ctx.locale;
  // the session's observer refusal names the browser's buttons: this tool's own control is its `play` action
  const reworded = new Map([
    [rt(L, "team.observer"), rt(L, "team.observer.tool")],
    [rt(L, "team.observerPlace"), rt(L, "team.observerPlace.tool")],
  ]);
  const errors = events.flatMap((e) => (e.msg.type === "error" ? [reworded.get(e.msg.message) ?? e.msg.message] : []));
  const warnings = events.flatMap((e) => (e.msg.type === "warning" ? [e.msg.message] : []));
  const said = saidLines(ctx, events);
  const team = teamLines(ctx, cp, TEAM_TOOL_WORDS);
  const pending = callout?.pending ?? null;
  const calloutLine = pending ? rt(L, "teamText.callout", { who: pending.who, line: pending.line, how: callout?.how ?? rt(L, "teamText.calloutLive") }) : "";
  const text = [...said, ...errors.map((m) => `✗ ${m}`), ...warnings.map((m) => `! ${m}`), ...(calloutLine ? [calloutLine] : []), ...team.lines].join("\n");
  return { ok: errors.length === 0, text, data: { said, errors, warnings, team: team.report, callout: pending } };
}
