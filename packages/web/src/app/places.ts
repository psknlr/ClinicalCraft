/**
 * A place in the care team at the start of an encounter (docs/EMBODIED.md §2.1, docs/TEAM.md §1) — pure: what the
 * intro's picker offers for a case (its index entry's `seats` and `lineups`; with a team scenario chosen, less the places
 * whose member it makes absent), the choices a page address makes (`?team=`, `?seat=`, `?lineup=`), the `start` the web
 * sends, and a saved encounter's own place. The operating surgeon's place is the learner as always — no place recorded
 * (`start {seat: "surgeon"}` is normalised away) —, so it is the picker's default and never sent. Whether a place can be
 * taken is the session's to say: a place asked for is sent, never dropped, and the web shows the session's words.
 */
import type { TeamOp } from "@clinicalcraft/agent";
import { canonicalPosition, effectiveTeam, isSterilePosition, placeMember, TEAM_PLACES, type CaseDefinition, type ClinicalAction, type Place, type SessionState } from "@clinicalcraft/core";
import type { CaseCard } from "./content.js";

/** The start's own choices besides the case and the facility (null: none). */
export interface StartChoice {
  /** A team scenario (`?team=`, a facilitator's). */
  team: string | null;
  /** A place in the team (never the operating surgeon's: that is no place). */
  seat: Place | null;
  /** A line-up of the case's team. */
  lineup: string | null;
}

/** The `start` the web sends: its place, when it has one, is a place in the team (never the operating surgeon's). */
export type StartAction = Omit<Extract<ClinicalAction, { type: "start" }>, "seat"> & { seat?: Place };

/** The place a value names, or null: not a place in the team (the operating surgeon's included — that is no place). */
export function placeOf(value: unknown): Place | null {
  return (TEAM_PLACES as readonly unknown[]).includes(value) ? (value as Place) : null;
}

/** The choices a page address makes for the next new encounter (`?team=`, `?seat=`, `?lineup=`). */
export function startChoiceFromSearch(search: string): StartChoice {
  const q = new URLSearchParams(search);
  const text = (name: string) => q.get(name)?.trim() || null;
  return { team: text("team"), seat: placeOf(text("seat")), lineup: text("lineup") };
}

/**
 * `__QA__.start(case, facility, resume, team, seat, lineup)`'s choices: the place and the line-up are the call's own —
 * not given (the four-argument form a pack's demonstrations call), no place and the case's own team, whatever the
 * page's address or the picker chose —; the team scenario not given keeps the page's (`?team=`), `""` clears it.
 */
export function withStartArgs(choice: StartChoice, team?: string, seat?: string, lineup?: string): StartChoice {
  return {
    team: team === undefined ? choice.team : team || null,
    seat: placeOf(seat),
    lineup: lineup || null,
  };
}

/** A team scenario chosen, with the case it is read from (the full case: the index entry carries no scenario). */
export interface ScenarioOf {
  def: Pick<CaseDefinition, "team"> | null;
  scenario: string | null;
}

/**
 * The places a case's card offers with a line-up (null: its own team) — the index entry's, as core's `seatsOf` gives
 * them — and, given the full case and a team scenario, less the places whose member that scenario makes absent (core
 * `placeMember`, `effectiveTeam`: the team as it is in that encounter).
 */
export function placesOffered(card: Pick<CaseCard, "seats" | "lineups">, lineup: string | null, scenario?: ScenarioOf): Place[] {
  const places = lineup ? (card.lineups.find((l) => l.id === lineup)?.seats ?? []) : card.seats;
  const def = scenario?.def as CaseDefinition | null | undefined;
  if (!def?.team || !scenario?.scenario) return [...places];
  const present = new Set(effectiveTeam(def, { ...(lineup ? { lineup } : {}), teamScenario: scenario.scenario }).map((m) => m.staff));
  return places.filter((p) => {
    const m = placeMember(def, p, lineup ?? undefined);
    return !m || present.has(m.staff);
  });
}

/** Whether a case's card offers any place in the team, with its own team or with a line-up. */
export function offersPlaces(card: Pick<CaseCard, "seats" | "lineups">): boolean {
  return card.seats.length > 0 || card.lineups.some((l) => l.seats.length > 0);
}

/** What the intro's picker shows for a case: the line-ups (and the one chosen), the places they offer (and the one chosen). */
export interface PlacePicker {
  /** The case's line-ups (empty: no line-up row). */
  lineups: CaseCard["lineups"];
  lineup: string | null;
  /** The places offered with the line-up and the team scenario chosen (the operating surgeon's, the default, comes first and is not listed). */
  places: Place[];
  seat: Place | null;
  /**
   * A place asked for (the page's address, `__QA__.start`) that is not offered with that line-up or team scenario: shown
   * as chosen, saying so — it is sent as asked, and the session's refusal says why (null: none).
   */
  unavailable: Place | null;
}

/**
 * The intro's place picker for a case (null: no rows) — shown only in in-world mode for a case that offers places in
 * its team (docs/EMBODIED.md §2.1). A line-up the case does not have reads as its own team; a place asked for that the
 * case does not offer with the line-up or the team scenario chosen (`scenario`: read from the full case once loaded) is
 * shown as chosen but not offered (`unavailable`), so the picker never says a start other than the one sent.
 */
export function placePicker(card: Pick<CaseCard, "seats" | "lineups">, embodied: boolean, choice: Pick<StartChoice, "seat" | "lineup">, scenario?: ScenarioOf): PlacePicker | null {
  if (!embodied || !offersPlaces(card)) return null;
  const lineup = choice.lineup && card.lineups.some((l) => l.id === choice.lineup) ? choice.lineup : null;
  const places = placesOffered(card, lineup, scenario);
  const seat = choice.seat && places.includes(choice.seat) ? choice.seat : null;
  return { lineups: card.lineups, lineup, places, seat, unavailable: choice.seat && !seat ? choice.seat : null };
}

/**
 * The `start` of a new encounter: the team scenario and the line-up when the case has them (others are dropped, as
 * `?team=` always was); a place asked for whenever the case has a care team — given its library card, one that offers
 * places at all (a page's `?seat=` leaves a case with none as it is) —, never dropped: the session says whether it can
 * be taken now (in-world mode, the settings, the line-up, the team scenario), and its words are shown.
 */
export function startAction(c: Pick<CaseDefinition, "team">, choice: StartChoice, card?: Pick<CaseCard, "seats" | "lineups">): StartAction {
  const team = choice.team && c.team?.scenarios.some((x) => x.id === choice.team) ? choice.team : null;
  const lineup = choice.lineup && (c.team?.lineups ?? []).some((l) => l.id === choice.lineup) ? choice.lineup : null;
  const seat = choice.seat && c.team && (!card || offersPlaces(card)) ? choice.seat : null;
  return { type: "start", ...(team ? { team } : {}), ...(seat ? { seat } : {}), ...(lineup ? { lineup } : {}) };
}

/**
 * The `start` an encounter sends now — the one worked out when the start began (`start`) — or null: none, it has
 * started already (a resumed save among them) or finished. A place's start runs once, and so does the first-person
 * view's move to the team's table that follows it.
 */
export function pendingStart(s: Pick<SessionState, "started" | "finished">, start: StartAction): StartAction | null {
  return !s.started && !s.finished ? start : null;
}

/**
 * The pace the care team begins at for a new encounter's start (`startAppSession`'s `embodied.teamPace`; agent
 * `SessionOptions.embodied.teamPace`): `step` for a start in a place — the start takes no team round, so nothing the
 * stand-in surgeon does (its call-out before a critical step: an approval waiting on the learner) is asked before the
 * encounter is entered and the call-out card can answer it —; undefined otherwise: the session's own pace (a resumed
 * encounter's team keeps the pace it was saved at). The terminal opens a place's session the same way (cli `place.ts`).
 */
export function startPace(start: StartAction | null): "step" | undefined {
  return start?.seat ? "step" : undefined;
}

/**
 * The op that lets the care team go on at its own pace (`team resume`: autonomy `auto`, then its rounds), sent once the
 * encounter is entered and the call-out card can answer the stand-in — after a place was taken at this start
 * (`startPace`); null otherwise (no place, a start refused, a resumed encounter).
 */
export function teamGoesOn(s: Pick<SessionState, "seat">, start: StartAction | null): TeamOp | null {
  return startPace(start) && s.seat ? { type: "team", action: "resume" } : null;
}

/** The place and line-up a saved encounter was started with (its recorded `start`; none: the operating surgeon's). */
export function savedPlace(actions: readonly unknown[] | null | undefined): { seat: Place | null; lineup: string | null } {
  const start = (actions ?? []).find((a): a is { type: "start"; seat?: unknown; lineup?: unknown } => !!a && typeof a === "object" && (a as { type?: unknown }).type === "start");
  return { seat: placeOf(start?.seat), lineup: typeof start?.lineup === "string" ? start.lineup : null };
}

/**
 * What the player's first-person hand is dressed in for the place they hold (`WorldApi.setPlayerWear`): scrubbed at the
 * sterile field in a place core counts sterile (`isSterilePosition`: first and second assistant, scrub nurse) — gloved,
 * a gown's sleeve, no stethoscope —; otherwise as always (operating, no place recorded: the white coat and the
 * stethoscope).
 */
export function heldWear(seat: Place | null | undefined): "bedside" | "sterile" {
  return seat && isSterilePosition(canonicalPosition(seat)) ? "sterile" : "bedside";
}
