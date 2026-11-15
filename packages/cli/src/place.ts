/**
 * A place in the care team from the command line (docs/TEAM.md §1, docs/PROTOCOL.md §3.1): `--seat`, `--lineup` and
 * `--team` make the encounter's first action `start {seat, lineup, team}` (play, exec); the session decides whether the
 * place can be taken — in-world mode, a case team whose surgeon has a stand-in, the member present in the team scenario,
 * settings that let the stand-in work — and its refusal is printed as it words it, with what the case offers when the
 * engine refused what was asked (a line-up, a team scenario, a place). A resumed encounter keeps the place it was started
 * in, and is asked first whether its settings would stop the stand-in (`standInRefusal`).
 *
 * A place's session begins with its team paused (`startPace`): the start takes no team round, so nothing the stand-in
 * does — its call-out before a critical step — is asked before the front-end can answer it; once it can (the REPL's
 * prompt, exec's answers), `teamGoesOn` lets the team go on at its own pace.
 */
import { isCalloutRequest, seatLines, staffName, startOffers, type AgentEvent, type ClinicalSession, type EventMsg, type Op, type TeamAutonomy } from "@clinicalcraft/agent";
import type { ClinicalAction, Seat } from "@clinicalcraft/core";
import { flagString, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, type CliContext } from "./context.js";

type Start = Extract<ClinicalAction, { type: "start" }>;

/** The start the flags ask for (`--seat`, `--lineup`, `--team`), or null when none is given: the implicit start. */
export function placeStart(args: ParsedArgs): Start | null {
  const seat = flagString(args, "seat") as Seat | undefined;
  const lineup = flagString(args, "lineup");
  const team = flagString(args, "team");
  if (seat === undefined && lineup === undefined && team === undefined) return null;
  return { type: "start", ...(seat ? { seat } : {}), ...(lineup ? { lineup } : {}), ...(team ? { team } : {}) };
}

/** `--seat`/`--lineup`/`--team` choose a new encounter's start: a resumed one keeps its own (a usage error). */
export function checkPlaceFlags(ctx: CliContext, start: Start | null, resume: string | undefined): void {
  if (start && resume !== undefined) throw new UsageError(ctx.t("place.resumeFixed"));
}

/**
 * The pace the care team begins at for this start (`openSession`'s `teamPace`): `step` for a place in the team — the
 * start takes no team round —; the session's own otherwise (a resumed encounter's team keeps its own pace).
 */
export function startPace(start: Start | null): TeamAutonomy | undefined {
  return start?.seat !== undefined && start.seat !== "surgeon" ? "step" : undefined;
}

/**
 * The op that lets the team go on at its own pace (`team resume`: autonomy auto, then its rounds) once the front-end can
 * answer the stand-in's call-out — after a place was taken at this start; null otherwise.
 */
export function teamGoesOn(session: ClinicalSession, start: Start | null): Op | null {
  return startPace(start) && session.state.seat ? { type: "team", action: "resume" } : null;
}

/** Why the session did not take the start: what it said, and what the case offers when the engine refused what was asked. */
export interface StartRefusal {
  message: string;
  /** The case's places, line-ups and team scenarios (`startOffers`): empty for a refusal of the session's own (an error). */
  offers: string[];
}

/**
 * Take the start the flags ask for as the encounter's first action (the learner's own `clinical_action`): its events and,
 * when the session did not take it, what it said — its error (not in-world, settings that would stop the stand-in), or
 * the engine's refusal (a warning) followed by what the case offers: its places by line-up, its line-ups and — the
 * terminal is the facilitator's too (`--team`) — its team scenarios.
 */
export async function takeStart(session: ClinicalSession, start: Start): Promise<{ events: readonly AgentEvent[]; refusal: StartRefusal | null }> {
  const events = await session.run({ type: "clinical_action", action: start });
  if (session.state.started) return { events, refusal: null };
  const errors = events.flatMap((e) => (e.msg.type === "error" ? [e.msg.message] : []));
  if (errors[0] !== undefined) return { events, refusal: { message: errors[0], offers: [] } };
  const warnings = events.flatMap((e) => (e.msg.type === "warning" ? [e.msg.message] : []));
  return { events, refusal: { message: warnings[0] ?? `start ${JSON.stringify(start)}`, offers: startOffers({ caseDef: session.caseDef, locale: session.settings.locale }, { scenarios: true }) } };
}

/**
 * The start for a new encounter, or the check of a resumed one in a place: a start the session refuses, or a resume
 * whose settings would stop the stand-in surgeon (`ClinicalSession.standInRefusal`, `place.resumeRefused`), closes the
 * session and is a usage error carrying the session's words (what the case offers as its hint). Taken, the start's
 * events are returned: a renderer that subscribes after it shows them.
 */
export async function beginEncounter(session: ClinicalSession, start: Start | null, resumed: boolean): Promise<readonly AgentEvent[]> {
  const taken = start ? await takeStart(session, start) : null;
  const refusal = taken ? taken.refusal : resumed ? session.standInRefusal() : null;
  if (refusal === null) return taken?.events ?? [];
  await session.close();
  if (typeof refusal === "string") throw new CliError(refusal, EXIT.usage);
  throw new CliError(refusal.message, EXIT.usage, refusal.offers.length ? refusal.offers.join("\n") : undefined);
}

/** The learner's place and who works where (`/seat`'s lines), shown when an encounter starts or resumes in a place; [] without one. */
export function placeLines(session: ClinicalSession): string[] {
  if (!session.state.seat) return [];
  return seatLines({ caseDef: session.caseDef, facility: session.facility, state: session.state, locale: session.settings.locale });
}

/**
 * The stand-in surgeon's call-out an approval request is (docs/TEAM.md §4.5; agent `isCalloutRequest`): who says it and
 * its line — answered as the request (approved: No objection; denied: Stop) — or null for any other request.
 */
export function calloutOf(session: ClinicalSession, req: Extract<EventMsg, { type: "approval_request" }>): { who: string; line: string } | null {
  if (!isCalloutRequest(session.caseDef, session.state, req)) return null;
  return { who: staffName({ facility: session.facility, locale: session.settings.locale }, req.actorId), line: req.callout };
}
