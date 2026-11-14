/**
 * Passing a carried item to someone (EMBODIED §5, §8.1): `hand_over {to}` — the scrub nurse hands the scalpel to
 * the surgeon, a colleague passes the learner what they asked for, the learner hands a swab back. From arm's reach
 * (contact range, the same level, line of sight) to a person — an actor or a member of staff — with a free hand;
 * a worn item is taken off first (`put_down`, behaviours `hand-over` precheck). The item stays carried: its state is
 * still "held", now in the recipient's hands.
 *
 * An item kept in custody (`EquipmentType.custody`: a labelled specimen, a medication box — audit 2026-11-12 P2-12)
 * changes hands against a receipt: the hand-over records who handed what to whom, where and at which simulated
 * minute (`HandoffReceipt`, kept on the item), and the receiver confirms it with their own act (`confirm_receipt`),
 * never the one who handed it over. Each writes the receipt in an `item.handoff` event and in the action's result.
 */
import { awaitingConfirmation, itemsInHand } from "./behaviors.js";
import { MAX_HELD, MAX_RECEIPTS, RANGES, type ActorId, type ActorState, type EntityId, type HandoffReceipt, type NavGoal, type WorldActionRequest, type WorldEvent } from "./contracts.js";
import { failed, type EffectsHost, type Outcome } from "./effects.js";
import { metres, worldMessage } from "./i18n.js";
import type { WorldStateStore } from "./state.js";

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
  // what the item is as it changes hands (its own lifecycle state: a specimen tube "collected"), read before it moves
  const own = host.d.rules.states(itemId).find((s) => s !== "held" && s !== "equipped") ?? null;
  store.setHolding(actor.id, actor.holding.filter((h) => h !== itemId));
  store.setHolding(recipient.id, [...recipient.holding, itemId]);
  store.patchEntity(itemId, { heldBy: recipient.id });
  const events: WorldEvent[] = [
    host.emit({ type: "item.held", entityId: itemId, actorId: actor.id, held: false }),
    host.emit({ type: "item.held", entityId: itemId, actorId: recipient.id, held: true }),
  ];
  if (!inCustody(host, itemId)) return { status: "completed", message: worldMessage("ok.handedOver", L, { target: item, recipient: who }), events };
  // against a receipt: who handed what to whom, where and when — the receiver to confirm it
  const previous = receiptsOf(store, itemId);
  const receipt: HandoffReceipt = {
    id: `${itemId}#${(previous.length ? receiptNumber(previous.at(-1)!) : 0) + 1}`,
    item: itemId,
    type: locator.registry.entity(itemId)?.type ?? "",
    state: own,
    from: actor.id,
    fromRole: actor.role,
    to: recipient.id,
    toRole: recipient.role,
    room: actor.room,
    at: host.d.clinical.clock(),
    actionId: request.actionId,
    confirmedAt: null,
  };
  store.patchEntity(itemId, { receipts: [...previous, receipt].slice(-MAX_RECEIPTS) });
  events.push(host.emit({ type: "item.handoff", entityId: itemId, actorId: actor.id, receipt }));
  return { status: "completed", message: worldMessage("ok.handedOverReceipt", L, { target: item, recipient: who }), events, receipt };
}

/**
 * `confirm_receipt` (the bus checked THE custody rule, `awaitingConfirmation` — behaviours `confirm-receipt`
 * precheck): the receiver confirms the hand-over at this minute.
 */
export function confirmReceipt(host: EffectsHost, request: WorldActionRequest, actor: ActorState, itemId: EntityId): Outcome {
  const { store, locator, locale: L } = host.d;
  const last = awaitingConfirmation(store.entity(itemId), actor.id);
  if (!last) return failed("PRECONDITION_FAILED", worldMessage("pre.noReceipt", L, { target: locator.name(itemId) }));
  const all = receiptsOf(store, itemId);
  const receipt: HandoffReceipt = { ...last, confirmedAt: host.d.clinical.clock(), confirmActionId: request.actionId };
  store.patchEntity(itemId, { receipts: [...all.slice(0, -1), receipt] });
  const event = host.emit({ type: "item.handoff", entityId: itemId, actorId: actor.id, receipt });
  return { status: "completed", message: worldMessage("ok.receiptConfirmed", L, { target: locator.name(itemId), giver: locator.name(last.from), at: last.at }), events: [event], receipt };
}

/** Is the item kept in custody (its type's `custody`)? */
export function inCustody(host: Pick<EffectsHost, "d">, itemId: EntityId): boolean {
  const e = host.d.locator.registry.entity(itemId);
  return e?.portable === "handheld" && !!e.equipmentType?.custody;
}

/** The receipts of an item kept in custody, oldest first (copies). */
export function receiptsOf(store: Pick<WorldStateStore, "entity">, itemId: EntityId): HandoffReceipt[] {
  return (store.entity(itemId)?.receipts ?? []).map((r) => ({ ...r }));
}

/** The receipts an actor is to confirm now (THE custody rule, `awaitingConfirmation`): of the items in its hands, in hand order (copies). */
export function receiptsToConfirm(store: Pick<WorldStateStore, "entity" | "actor">, actorId: ActorId): HandoffReceipt[] {
  return (store.actor(actorId)?.holding ?? []).flatMap((id) => {
    const open = awaitingConfirmation(store.entity(id), actorId);
    return open ? [{ ...open }] : [];
  });
}

/** The n of a receipt id `<item>#<n>`. */
function receiptNumber(r: HandoffReceipt): number {
  const n = Number(r.id.slice(r.id.lastIndexOf("#") + 1));
  return Number.isFinite(n) ? n : 0;
}
