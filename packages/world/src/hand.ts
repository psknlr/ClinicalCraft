/**
 * Passing a carried item to someone (EMBODIED §5, §8.1): `hand_over {to}` — the scrub nurse hands the scalpel to
 * the surgeon, a colleague passes the learner what they asked for, the learner hands a swab back. From arm's reach
 * (contact range, the same level, line of sight) to a person — an actor or a member of staff — with a free hand;
 * a worn item is taken off first (`put_down`, behaviours `hand-over` precheck). The item stays carried: its state is
 * still "held", now in the recipient's hands.
 */
import { itemsInHand } from "./behaviors.js";
import { MAX_HELD, RANGES, type ActorState, type EntityId, type NavGoal, type WorldActionRequest, type WorldEvent } from "./contracts.js";
import { failed, type EffectsHost, type Outcome } from "./effects.js";
import { metres, worldMessage } from "./i18n.js";

/** `hand_over {to}` (the bus checked authority and that the actor holds the item, not worn). */
export function handOver(host: EffectsHost, request: WorldActionRequest, actor: ActorState, itemId: EntityId, resolve: (idOrAlias: string) => EntityId | null): Outcome {
  const { store, locator, locale: L } = host.d;
  const raw = request.parameters?.to;
  if (typeof raw !== "string" || !raw.trim()) return failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.missingParam", L, { param: "to" }) }));
  const toId = resolve(raw.trim());
  const recipient = toId ? store.actor(toId) : null;
  const item = locator.name(itemId);
  if (!toId || !recipient) return failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.handOverTo", L, { target: raw }) }));
  if (recipient.id === actor.id) return failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.handOverSelf", L, { target: item }) }));
  const who = locator.name(recipient.id);
  const place = locator.place(recipient.id);
  const distance = place ? locator.distance(actor.pose, place) : Infinity;
  if (!place || distance > RANGES.contact + 1e-6 || !locator.lineOfSight(actor.pose, place)) {
    const goal: NavGoal = { kind: "entity", id: recipient.id, range: 1 };
    const hint = host.verifyHint(actor, goal, worldMessage("hint.approach", L, { target: who }));
    return failed("NOT_IN_RANGE", worldMessage("NOT_IN_RANGE", L, { target: who, distance: Number.isFinite(distance) ? metres(distance) : "—", range: metres(RANGES.contact) }), { hint: hint ?? null });
  }
  if (itemsInHand(recipient, store).length >= MAX_HELD) return failed("HANDS_FULL", worldMessage("pre.recipientHandsFull", L, { holder: who, max: MAX_HELD }));
  store.setHolding(actor.id, actor.holding.filter((h) => h !== itemId));
  store.setHolding(recipient.id, [...recipient.holding, itemId]);
  store.patchEntity(itemId, { heldBy: recipient.id });
  const events: WorldEvent[] = [
    host.emit({ type: "item.held", entityId: itemId, actorId: actor.id, held: false }),
    host.emit({ type: "item.held", entityId: itemId, actorId: recipient.id, held: true }),
  ];
  return { status: "completed", message: worldMessage("ok.handedOver", L, { target: item, recipient: who }), events };
}
