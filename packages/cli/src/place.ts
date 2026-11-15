/**
 * A place in the care team from the command line (docs/TEAM.md §1, docs/PROTOCOL.md §3.1): `--seat`, `--lineup` and
 * `--team` make the encounter's first action `start {seat, lineup, team}` (play, exec); the session decides whether the
 * place can be taken — in-world mode, a case team whose surgeon has a stand-in, the member present in the team scenario,
 * settings that let the stand-in work — and its refusal is printed as it words it. A resumed encounter keeps the place
 * it was started in, and is asked first whether its settings would stop the stand-in (`standInRefusal`).
 */
import { isCalloutRequest, seatLines, staffName, type AgentEvent, type ClinicalSession, type EventMsg } from "@clinicalcraft/agent";
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
 * Take the start the flags ask for as the encounter's first action (the learner's own `clinical_action`): its events —
 * the start and the team's round after it — and, when the session did not take it, what it said — its error or, for a
 * start the engine refuses, its warning — word for word.
 */
export async function takeStart(session: ClinicalSession, start: Start): Promise<{ events: readonly AgentEvent[]; refusal: string | null }> {
  const events = await session.run({ type: "clinical_action", action: start });
  if (session.state.started) return { events, refusal: null };
  const said = events.flatMap((e) => (e.msg.type === "error" || e.msg.type === "warning" ? [e.msg.message] : []));
  return { events, refusal: said[0] ?? `start ${JSON.stringify(start)}` };
}

/**
 * The start for a new encounter, or the check of a resumed one in a place: a start the session refuses, or a resume
 * whose settings would stop the stand-in surgeon (`ClinicalSession.standInRefusal`, `place.resumeRefused`), closes the
 * session and is a usage error carrying the session's words. Taken, the start's events are returned: a renderer that
 * subscribes after it shows them (the stand-in's first step).
 */
export async function beginEncounter(session: ClinicalSession, start: Start | null, resumed: boolean): Promise<readonly AgentEvent[]> {
  const taken = start ? await takeStart(session, start) : null;
  const refusal = taken ? taken.refusal : resumed ? session.standInRefusal() : null;
  if (refusal === null) return taken?.events ?? [];
  await session.close();
  throw new CliError(refusal, EXIT.usage);
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
