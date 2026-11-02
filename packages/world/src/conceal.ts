/**
 * Things out of sight until someone looks (docs/EMBODIED.md §8.6): a handheld item can be concealed by a scenario's
 * initial conditions (`placeItem … { concealed: true }` — a swab dropped under the Mayo stand; `{ inside: true }` — a
 * swab in the wound, concealed in the patient). A concealed item is in the world (it has a place; physics and
 * snapshots keep it) but no one perceives it: it is left out of observations, `find`, `canSee` and events, and acting
 * on it by id is refused as if it were not there.
 *
 * `search` is how it is found: the searching body's hands go through what is within reach of where it stands —
 * every item concealed there is revealed — or through one thing within reach (`targetId`: the patient's wound, a
 * drape), which also brings out what is concealed inside it — into the searcher's hand (at their feet when both
 * hands are full). A revealed item is an ordinary item again (`entity.concealed` with `concealed: false`), seen by
 * whoever can see it. Searching takes time (`SEARCH_SECONDS`,
 * charged as a procedure).
 */
import { MAX_HELD, RANGES, type ActorState, type EntityId, type NavGoal, type WorldActionRequest, type WorldEvent } from "./contracts.js";
import { failed, type EffectsHost, type Outcome } from "./effects.js";
import { worldMessage } from "./i18n.js";

/** Simulated seconds one search takes. */
export const SEARCH_SECONDS = 20;

/** Is this item concealed now (and not in someone's hands)? */
export function isConcealed(host: Pick<EffectsHost, "d">, id: EntityId): boolean {
  const s = host.d.store.entity(id);
  return !!s?.concealed && !s.heldBy;
}

/** `search`: reveal what is concealed within reach of where the actor stands, and inside `targetId` (within reach). */
export function search(host: EffectsHost, _request: WorldActionRequest, actor: ActorState, targetId?: EntityId): Outcome {
  const { store, locator, locale: L, port } = host.d;
  const within = (id: EntityId) => {
    const p = locator.place(id);
    return !!p && p.level === actor.pose.level && locator.distance(actor.pose, p) <= RANGES.interact + 1e-6;
  };
  if (targetId && !within(targetId)) {
    const target = locator.name(targetId);
    const goal: NavGoal = { kind: "interact", id: targetId };
    return failed("NOT_IN_RANGE", worldMessage("NOT_IN_RANGE", L, { target, distance: "—", range: `${RANGES.interact} m` }), { hint: host.verifyHint(actor, goal, worldMessage("hint.approach", L, { target })) ?? null });
  }
  const found: EntityId[] = [];
  const events: WorldEvent[] = [];
  for (const id of store.concealedIds()) {
    const where = store.entity(id)?.concealed;
    // loose: within reach; inside something: only when that is what is searched
    if (where === true ? !within(id) : where !== targetId) continue;
    const p = locator.place(id);
    if (!p) continue;
    store.patchEntity(id, { concealed: undefined });
    events.push(host.emit({ type: "entity.concealed", entityId: id, concealed: false, actorId: actor.id }));
    found.push(id);
    const me = store.actor(actor.id) ?? actor;
    if (where !== true && me.holding.length < MAX_HELD) {
      // searched out of what it was in (a swab out of the wound): in the searcher's hand
      store.setHolding(me.id, [...me.holding, id]);
      store.patchEntity(id, { heldBy: me.id });
      events.push(host.emit({ type: "item.held", entityId: id, actorId: me.id, held: true }));
      host.d.mover?.placeEntity?.(id, null);
    } else if (where !== true) {
      // hands full: laid down at the searcher's feet
      const at = { x: me.pose.x, y: me.pose.y, z: me.pose.z, level: me.pose.level };
      store.patchEntity(id, { position: at });
      host.d.mover?.placeEntity?.(id, at);
    } else {
      // drawn again where it lay
      host.d.mover?.placeEntity?.(id, { x: p.position.x, y: p.position.y, z: p.position.z, level: p.level });
    }
  }
  port?.elapse(SEARCH_SECONDS, "procedure");
  const message = found.length ? worldMessage("ok.searchFound", L, { found: found.map((id) => `"${locator.name(id)}"`).join(", ") }) : worldMessage("ok.searchNothing", L);
  return { status: "completed", message, events, elapsedSeconds: SEARCH_SECONDS };
}
