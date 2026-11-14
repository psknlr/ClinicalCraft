/**
 * Whom the scope of practice sees in a body (docs/EMBODIED.md §8.3): its role and name, and for the theatre's work its
 * controls in the operative field (core `bodyControls`), its position in this encounter and whether it stands by. One
 * function for the spatial gate, delegation, the staff's role states and the benchmark's authorisation audit, so a
 * body is scoped the same wherever it is asked:
 * - the learner's body with no place in the team is unscoped (null): the learner as always, every act;
 * - the learner's body in a place is scoped as that place — the scrub nurse's as a nurse, an assistant's as an
 *   attending —, with the place's controls;
 * - a member of staff by their own role, with their own controls; the colleague standing by while the learner holds
 *   their place, with none;
 * - a body the world does not know: no clinical authority.
 */
import { bodyControls, standingBy, t, type CaseDefinition, type FacilityDefinition, type Place, type SessionState } from "@clinicalcraft/core";
import { bodyPosition, PRIMARY_ACTOR, type ActorId, type ActorRole, type WorldRuntime } from "@clinicalcraft/world";
import { rt } from "../session/i18n.js";
import type { ScopeActor } from "./scope.js";

/** The role a place in the team is scoped as: the scrub nurse's a nurse's, an assistant's an attending's. */
export const PLACE_ROLE: Readonly<Record<Place, ActorRole>> = {
  "first-assistant": "attending",
  "second-assistant": "attending",
  "scrub-nurse": "nurse",
};

/** The scope-of-practice actor of a body (see the module docs); null for the learner's body with no place in the team. */
export function scopeActorOf(c: CaseDefinition, s: SessionState, facility: FacilityDefinition | null | undefined, world: Pick<WorldRuntime, "actor" | "entity">, actorId: ActorId, locale: string): ScopeActor | null {
  if (actorId === PRIMARY_ACTOR) {
    if (!s.seat) return null;
    return { role: PLACE_ROLE[s.seat], name: rt(locale, "place.You"), controls: bodyControls(c, s, facility, actorId, "field"), position: s.seat, standingBy: false };
  }
  const actor = world.actor(actorId);
  if (!actor) return { role: "porter", name: actorId }; // an unknown body: no clinical authority
  const entity = world.entity(actorId);
  return {
    role: actor.role,
    name: entity ? t(entity.name, locale) : actorId,
    controls: bodyControls(c, s, facility, actorId, "field"),
    position: bodyPosition(c, s, facility, actorId),
    standingBy: standingBy(c, s) === actorId,
  };
}
