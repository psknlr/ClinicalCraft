/**
 * Places in the care team in a session (docs/TEAM.md §1). The engine accepts `start {seat}` in the first assistant's,
 * the second assistant's or the scrub nurse's place and joins the team at its phase, but nobody would operate in the
 * meantime: no stand-in surgeon is driven yet, and an `operate` with no actor is still the operator's step, whoever
 * sends it. So a session does not offer a place in the team yet: a learner's `start` in one is refused
 * (`permission_denied`) and the learner operates — `start {seat: "surgeon"}`, or no seat, as always. This goes once a
 * stand-in surgeon operates and the session gives every learner step its place's actor.
 */
import type { ClinicalAction, Place } from "@clinicalcraft/core";

/** The place in the team a learner's `start` asks for, which a session does not offer yet (null: none asked for). */
export function placeNotOffered(action: ClinicalAction): Place | null {
  return action.type === "start" && action.seat !== undefined && action.seat !== "surgeon" ? action.seat : null;
}
