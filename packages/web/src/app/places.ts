/**
 * A place in the care team at the start of an encounter (docs/EMBODIED.md §2.1, docs/TEAM.md §1) — pure: what the
 * intro's picker offers for a case (its index entry's `seats` and `lineups`), the choices a page address makes
 * (`?team=`, `?seat=`, `?lineup=`), the `start` the web sends, and a saved encounter's own place. The operating
 * surgeon's place is the learner as always — no place recorded (`start {seat: "surgeon"}` is normalised away) —, so it
 * is the picker's default and never sent. Whether a place can be taken is the session's to say: the web shows its words.
 */
import { TEAM_PLACES, type CaseDefinition, type ClinicalAction, type Place, type SessionState } from "@clinicalcraft/core";
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
 * `__QA__.start(case, facility, resume, team, seat, lineup)`'s choices over the page's: a value given replaces (`""` —
 * or, for the place, the operating surgeon's — clears it), one not given keeps the page's (`?team=`, `?seat=`,
 * `?lineup=`). The four-argument form a pack's demonstrations call keeps the page's place: none, unless asked.
 */
export function withStartArgs(choice: StartChoice, team?: string, seat?: string, lineup?: string): StartChoice {
  return {
    team: team === undefined ? choice.team : team || null,
    seat: seat === undefined ? choice.seat : placeOf(seat),
    lineup: lineup === undefined ? choice.lineup : lineup || null,
  };
}

/** The places a case's card offers with a line-up (null: its own team) — the index entry's, as core's `seatsOf` gives them. */
export function placesOffered(card: Pick<CaseCard, "seats" | "lineups">, lineup: string | null): Place[] {
  if (!lineup) return [...card.seats];
  return [...(card.lineups.find((l) => l.id === lineup)?.seats ?? [])];
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
  /** The places offered with the line-up chosen (the operating surgeon's, the default, comes first and is not listed). */
  places: Place[];
  seat: Place | null;
}

/**
 * The intro's place picker for a case (null: no rows) — shown only in in-world mode for a case that offers places in
 * its team (docs/EMBODIED.md §2.1): a choice the case does not offer reads as the default (no line-up, operating).
 */
export function placePicker(card: Pick<CaseCard, "seats" | "lineups">, embodied: boolean, choice: Pick<StartChoice, "seat" | "lineup">): PlacePicker | null {
  if (!embodied || !offersPlaces(card)) return null;
  const lineup = choice.lineup && card.lineups.some((l) => l.id === choice.lineup) ? choice.lineup : null;
  const places = placesOffered(card, lineup);
  return { lineups: card.lineups, lineup, places, seat: choice.seat && places.includes(choice.seat) ? choice.seat : null };
}

/**
 * The `start` of a new encounter: the team scenario and the line-up when the case has them; a place when the case has a
 * care team — and, given its library card, when the card offers it with that line-up, so what the picker shows is what
 * is sent (a place a case does not offer is dropped, as `?team=` always was). The session says whether it can be taken
 * now (in-world mode, the settings, the team scenario): its words are shown.
 */
export function startAction(c: Pick<CaseDefinition, "team">, choice: StartChoice, card?: Pick<CaseCard, "seats" | "lineups">): StartAction {
  const team = choice.team && c.team?.scenarios.some((x) => x.id === choice.team) ? choice.team : null;
  const lineup = choice.lineup && (c.team?.lineups ?? []).some((l) => l.id === choice.lineup) ? choice.lineup : null;
  const seat = choice.seat && c.team && (!card || placesOffered(card, lineup).includes(choice.seat)) ? choice.seat : null;
  return { type: "start", ...(team ? { team } : {}), ...(seat ? { seat } : {}), ...(lineup ? { lineup } : {}) };
}

/**
 * The `start` an encounter sends now (null: none — it has started already, a resumed save among them, or finished): a
 * place's start runs once, and so does the first-person view's move to the team's table that follows it.
 */
export function pendingStart(s: Pick<SessionState, "started" | "finished">, c: Pick<CaseDefinition, "team">, choice: StartChoice, card?: Pick<CaseCard, "seats" | "lineups">): StartAction | null {
  return !s.started && !s.finished ? startAction(c, choice, card) : null;
}

/** The place and line-up a saved encounter was started with (its recorded `start`; none: the operating surgeon's). */
export function savedPlace(actions: readonly unknown[] | null | undefined): { seat: Place | null; lineup: string | null } {
  const start = (actions ?? []).find((a): a is { type: "start"; seat?: unknown; lineup?: unknown } => !!a && typeof a === "object" && (a as { type?: unknown }).type === "start");
  return { seat: placeOf(start?.seat), lineup: typeof start?.lineup === "string" ? start.lineup : null };
}
