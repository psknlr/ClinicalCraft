/**
 * The care team as a text front-end shows it (docs/TEAM.md §5): the learner's place and who works where (`/seat`), the
 * team now and what waits on the learner (`/team`, the `team` tool of an external agent), and what the team said in a
 * run. Read from the case, the encounter's state and the team's own record (`TeamCheckpoint`) with core's resolvers
 * (`effectiveTeam`, `staffPosition`, `standingBy`, `bodyControls`, `seatsOf`) and the agent's rule for what the stand-in
 * waits on the learner for (`awaitedLine`, `repliesTo`): nothing is decided here, only worded — how to answer is the
 * front-end's own (`AnswerWords`: a command, a tool call).
 */
import {
  bodyControls,
  canonicalPosition,
  CONTROL_TITLES,
  effectiveTeam,
  LEARNER_BODY,
  POSITION_TITLES,
  refOfBody,
  seatsOf,
  staffPosition,
  standingBy,
  standInOf,
  t,
  type CaseDefinition,
  type FacilityDefinition,
  type SessionState,
  type StaffPosition,
} from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import type { AgentEvent } from "./protocol.js";
import { isZh, joinList, rt } from "./session/i18n.js";
import { awaitedLine, repliesTo, type ReplyKind } from "./session/team/awaits.js";
import type { TeamCheckpoint, TeamMessage } from "./session/team/types.js";

/** What the words are read from: the case, the facility (names), the encounter's state and the session's language. */
export interface TeamTextContext {
  caseDef: CaseDefinition;
  facility: FacilityDefinition | null;
  state: SessionState;
  locale: string;
}

/** How a front-end tells the learner to answer (`/team reply msg-3 readback`, a `team` tool call), and to say the count. */
export interface AnswerWords {
  reply(message: string, kind: ReplyKind): string;
  count(): string;
}

/** A line said to the learner that waits for their answer, as the data of a command's or a tool's output. */
export interface OpenLine {
  id: string;
  from: string;
  kind: TeamMessage["kind"];
  text: string;
  replies: ReplyKind[];
}

/** The team as a text front-end reports it (the data beside the words). */
export interface TeamStatusReport {
  round: number;
  autonomy: TeamCheckpoint["autonomy"];
  /** Who plays the learner's part: the learner (`learner`), or the team (`simulated`: observing). */
  surgeon: TeamCheckpoint["surgeon"];
  seat: string | null;
  lineup: string | null;
  /** What the stand-in waits on the learner for (`awaitedLine`): a line — answered or not —, the count, or nothing. */
  awaited: { kind: "line"; line: OpenLine; answered: boolean } | { kind: "count" } | null;
  /** Everything else said to the learner that waits for their answer. */
  open: OpenLine[];
}

/** A staff member's name as the facility gives it (the id when it gives none). */
export function staffName(ctx: Pick<TeamTextContext, "facility" | "locale">, id: string): string {
  const ref = id.replace(/^staff:/u, "");
  const s = ctx.facility?.staff.find((x) => x.id === ref);
  return s ? t(s.name, ctx.locale) : ref;
}

/** A member's body in the learner's words: their own — "you" —, a member of staff's by name. */
export function bodyName(ctx: Pick<TeamTextContext, "facility" | "locale">, body: string): string {
  return body === PRIMARY_ACTOR || body === LEARNER_BODY ? rt(ctx.locale, "teamText.you") : staffName(ctx, body);
}

/** A position's title as a list starts it ("Operating surgeon", "第一助手"). */
function positionTitle(locale: string, p: StaffPosition | null): string {
  if (!p) return "—";
  const words = t(POSITION_TITLES[canonicalPosition(p)], locale);
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The learner's place and who works where (`/seat`): the place — the operating surgeon's, or a place in the team with
 * its member's id (what a hand-over's `to` takes) — fixed for the encounter; the line-up; the place's controls; who
 * operates and who stands by; operating, the places the case offers at the start; and the team as it works in this
 * encounter, each member with their position, the learner as "you", a relief colleague, one away (the team scenario's
 * name itself is the facilitator's: never shown).
 */
export function seatLines(ctx: TeamTextContext): string[] {
  const { caseDef: c, state: s, locale: L } = ctx;
  const lines: string[] = [];
  const seat = s.seat;
  const own = seat ? refOfBody(c, s) : undefined;
  if (seat) lines.push(rt(L, "seat.place", { place: t(POSITION_TITLES[seat], L), id: typeof own === "string" ? own : "-" }));
  else lines.push(rt(L, "seat.surgeon"));
  const lineup = s.lineup ? (c.team?.lineups ?? []).find((l) => l.id === s.lineup) : undefined;
  if (lineup) lines.push(rt(L, "seat.lineup", { name: t(lineup.name, L) }));
  if (seat) {
    const controls = bodyControls(c, s, ctx.facility, LEARNER_BODY, "field");
    const names = controls === "all" ? [] : controls.map((x) => t(CONTROL_TITLES[x], L));
    lines.push(names.length ? rt(L, "seat.controls", { controls: joinList(L, names) }) : rt(L, "seat.controlsNone"));
    const standIn = standInOf(c);
    const by = standingBy(c, s);
    if (standIn && by) lines.push(rt(L, "seat.operates", { name: staffName(ctx, standIn), by: staffName(ctx, by) }));
  }
  const team = c.team;
  if (!team) {
    lines.push(rt(L, "seat.noTeam"));
    return lines;
  }
  if (!seat) {
    const offered = (lineupId?: string) => seatsOf(c, lineupId ? { lineup: lineupId } : {}).filter((x) => x !== "surgeon");
    const base = offered();
    const more = (team.lineups ?? []).map((l) => ({ id: l.id, places: offered(l.id) })).filter((x) => x.places.length > 0 && x.places.join() !== base.join());
    const parts = [...(base.length ? [joinList(L, base)] : []), ...more.map((x) => rt(L, "seat.offeredLineup", { places: joinList(L, x.places), lineup: x.id }))];
    lines.push(parts.length ? rt(L, "seat.offered", { places: parts.join(isZh(L) ? "；" : "; ") }) : rt(L, "seat.offeredNone"));
  }
  lines.push(rt(L, "seat.team"));
  const scenario = s.teamScenario ? (team.scenarios ?? []).find((x) => x.id === s.teamScenario) : undefined;
  const relief = new Set((scenario?.relief ?? []).map((m) => m.staff));
  // whoever operates first, then the team as the case lists it
  const members = effectiveTeam(c, s);
  for (const m of [...members.filter((x) => x.staff === "surgeon"), ...members.filter((x) => x.staff !== "surgeon")]) {
    const operator = m.staff === "surgeon";
    const position = operator ? "surgeon" : staffPosition(c, ctx.facility, m.staff);
    const standIn = operator && seat ? standInOf(c) : undefined;
    const name = operator
      ? standIn
        ? staffName(ctx, standIn)
        : rt(L, "seat.you")
      : seat && m.staff === own
        ? rt(L, "seat.youStandingBy", { name: staffName(ctx, m.staff) })
        : relief.has(m.staff)
          ? rt(L, "seat.relief", { name: staffName(ctx, m.staff) })
          : staffName(ctx, m.staff);
    lines.push(rt(L, "seat.member", { position: positionTitle(L, position), name }));
  }
  for (const id of scenario?.absent ?? []) lines.push(rt(L, "seat.member", { position: positionTitle(L, staffPosition(c, ctx.facility, id)), name: rt(L, "seat.away", { name: staffName(ctx, id) }) }));
  return lines;
}

/** A line said to the learner, with the replies that fit it now. */
function openLine(ctx: TeamTextContext, cp: TeamCheckpoint, m: TeamMessage): OpenLine {
  return { id: m.id, from: bodyName(ctx, m.from), kind: m.kind, text: t(m.text, ctx.locale), replies: repliesTo(cp.state, cp.surgeon, m) };
}

/** How to give the replies that fit, first the likeliest ("/team reply msg-3 readback (or decline)"). */
function answerText(locale: string, words: AnswerWords, line: OpenLine): string {
  const [first, ...rest] = line.replies.map((k) => words.reply(line.id, k));
  if (!first) return "";
  const how = rest.length ? rt(locale, "teamText.or", { first, rest: rest.join(", ") }) : first;
  return rt(locale, line.replies.length === 1 && line.replies[0] === "report" ? "teamText.answerReport" : "teamText.answer", { how });
}

/**
 * The team now, for the learner (`/team status`, the `team` tool): the round, the pace and who plays the learner's part;
 * first what the stand-in waits on them for (its line — and whether they answered it —, or the count), with how to
 * answer; then anything else said to them that waits for an answer. Null checkpoint: the team has not begun.
 */
export function teamLines(ctx: TeamTextContext, cp: TeamCheckpoint | null, words: AnswerWords): { lines: string[]; report: TeamStatusReport | null } {
  const L = ctx.locale;
  const c = ctx.caseDef;
  if (!cp) {
    const phases = (c.team?.phases ?? []).map((p) => t(c.phases.find((x) => x.id === p)?.label ?? p, L)).join(", ");
    return { lines: [rt(L, "teamText.notStarted", { phases })], report: null };
  }
  const seat = ctx.state.seat ?? null;
  const place = seat ? t(POSITION_TITLES[seat], L) : "";
  const who = cp.surgeon === "learner" ? (seat ? rt(L, "teamText.who.learnerPlace", { place }) : rt(L, "teamText.who.learner")) : seat ? rt(L, "teamText.who.simulatedPlace", { place }) : rt(L, "teamText.who.simulated");
  const lines = [rt(L, "teamText.status", { round: cp.state.round, pace: rt(L, `teamText.pace.${cp.autonomy}`), who })];
  const waiting = awaitedLine(cp.state, cp.surgeon);
  let awaited: TeamStatusReport["awaited"] = null;
  if (waiting?.kind === "line") {
    const line = openLine(ctx, cp, waiting.message);
    awaited = { kind: "line", line, answered: waiting.answered };
    if (waiting.answered) lines.push(rt(L, "teamText.waitsAnswered", { from: line.from, id: line.id }));
    else {
      lines.push(rt(L, "teamText.waits", { from: line.from, text: line.text, id: line.id }));
      const how = answerText(L, words, line);
      if (how) lines.push(how);
    }
  } else if (waiting?.kind === "count") {
    awaited = { kind: "count" };
    lines.push(rt(L, "teamText.waitsCount", { how: words.count() }));
  }
  const skip = awaited?.kind === "line" ? awaited.line.id : null;
  const open = cp.state.messages
    .filter((m) => m.to === PRIMARY_ACTOR && m.from !== PRIMARY_ACTOR && m.id !== skip)
    .map((m) => openLine(ctx, cp, m))
    .filter((x) => x.replies.length > 0);
  if (open.length) {
    lines.push(rt(L, "teamText.open"));
    for (const x of open) {
      lines.push(rt(L, "teamText.line", { id: x.id, from: x.from, text: x.text }));
      lines.push(`  ${answerText(L, words, x)}`);
    }
  }
  if (!awaited && !open.length) lines.push(rt(L, "teamText.nothing"));
  return { lines, report: { round: cp.state.round, autonomy: cp.autonomy, surgeon: cp.surgeon, seat, lineup: ctx.state.lineup ?? null, awaited, open } };
}

/**
 * The message a reply without one answers: the line the stand-in waits on the learner for (not answered yet), else the
 * one line said to them that waits for an answer; null when there is none, or several.
 */
export function defaultReplyTarget(cp: TeamCheckpoint): string | null {
  const waiting = awaitedLine(cp.state, cp.surgeon);
  if (waiting?.kind === "line" && !waiting.answered) return waiting.message.id;
  const open = cp.state.messages.filter((m) => m.to === PRIMARY_ACTOR && m.from !== PRIMARY_ACTOR && repliesTo(cp.state, cp.surgeon, m).length > 0);
  return open.length === 1 ? open[0]!.id : null;
}

/** What the team said in these events, one line each — a line said to the learner with its id, the one a reply names. */
export function saidLines(ctx: Pick<TeamTextContext, "facility" | "locale">, events: readonly AgentEvent[]): string[] {
  const out: string[] = [];
  for (const e of events) {
    if (e.msg.type !== "team_event" || e.msg.event.kind !== "message") continue;
    const m = e.msg.event.message;
    const toYou = m.to === PRIMARY_ACTOR && m.from !== PRIMARY_ACTOR;
    out.push(rt(ctx.locale, toYou ? "teamText.saidId" : "teamText.said", { from: bodyName(ctx, m.from), to: bodyName(ctx, m.to), text: t(m.text, ctx.locale), id: m.id }));
  }
  return out;
}
