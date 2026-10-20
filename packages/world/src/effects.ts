/**
 * What an accepted operation does (the commit half of the action bus,
 * EMBODIED §2): physical effects (doors, hand hygiene, storage, state
 * machines, reservations, carts and handheld items) and the clinical effect
 * run through the session's tool path — `ClinicalPort.invoke` — with the
 * device locked while the tool runs. A denied (`APPROVAL_DENIED`), rejected
 * or failed (`CLINICAL_REJECTED`) or cancelled tool commits no device
 * transition. A derived state (monitor attachment) is re-read from the
 * engine after the tool: the event reports what the engine says.
 *
 * Time: physical operations charge their `durationSeconds`
 * (`elapse(…, "procedure")`); an operation with a clinical effect charges
 * nothing itself — the engine's action cost (`clock.actionCosts`) is the
 * time of the clinical act. Walking (`move_to`) charges travel once.
 */
import { levelElevation } from "./levels.js";
import { HAND_HYGIENE_MINUTES, type OperationSpec } from "./behaviors.js";
import { selectClinical } from "./clinical.js";
import type { ActionHint, ActorId, ActorState, ClinicalInvokeResult, EntityId, NavGoal, NavPlan, NavigationRecord, Pose, Vec3, WorldActionRequest, WorldErrorCode, WorldEvent } from "./contracts.js";
import { metres, worldMessage } from "./i18n.js";
import type { ActionBusDeps } from "./actions.js";
import { cellPoint, distanceToArea, type Area } from "./raster.js";
import { formatScreen } from "./screen.js";
import type { SightTarget } from "./visibility.js";
import type { WorldEventInput } from "./state.js";

/** The outcome of an action before the bus stamps versions and records it. */
export interface Outcome {
  status: "completed" | "failed" | "cancelled";
  errorCode?: WorldErrorCode;
  message: string;
  events: WorldEvent[];
  hint?: ActionHint | null;
  navigation?: NavigationRecord;
  elapsedSeconds?: number;
  clinical?: { tool: string; ok: boolean; output: string };
  clinicalEventIds?: string[];
}

/** A finished walk (committed pose, events, telemetry). */
export interface Walk {
  events: WorldEvent[];
  record: NavigationRecord;
  travelSeconds: number;
  interrupted: boolean;
  walked: number;
}

/** What the effects need from the bus. */
export interface EffectsHost {
  readonly d: ActionBusDeps;
  /** In-flight device locks. */
  readonly busy: Map<EntityId, ActorId>;
  emit(input: WorldEventInput): WorldEvent;
  walk(actor: ActorState, plan: Extract<NavPlan, { ok: true }>, signal: AbortSignal, request: WorldActionRequest): Promise<Walk>;
  invalidate(area: Area & { level: string }): void;
  /** Hint for a refusal, verified by planning (null when no route leads there). */
  verifyHint(actor: ActorState, goal: NavGoal | undefined, label: string | undefined, then?: ActionHint["then"]): ActionHint | null | undefined;
  /** Is this a well-formed navigation goal? */
  isGoal(goal: unknown): goal is NavGoal;
}

export const failed = (code: WorldErrorCode, message: string, extra: Partial<Outcome> = {}): Outcome => ({ status: "failed", errorCode: code, message, events: [], ...extra });

/** Run an operation that passed authority, preconditions and the spatial check. */
export async function runOperation(host: EffectsHost, request: WorldActionRequest, actor: ActorState, targetId: EntityId, o: OperationSpec, signal: AbortSignal): Promise<Outcome> {
  if (o.effect === "move-to") return moveCart(host, request, actor, targetId, signal);
  if (o.clinical || o.toolByParam) return clinicalOperation(host, request, actor, targetId, o, signal);
  return physicalOperation(host, actor, targetId, o);
}

/* ------------------------------------------------------------------ */
/* Physical operations                                                 */
/* ------------------------------------------------------------------ */

function physicalOperation(host: EffectsHost, actor: ActorState, id: EntityId, o: OperationSpec): Outcome {
  const { store, rules, locator, locale: L, clinical, port, mover } = host.d;
  const target = locator.name(id);
  const operation = rules.operationLabel(o);
  const events: WorldEvent[] = [];
  let message: string | null = null;
  let elapsed = 0;
  const charge = (seconds: number) => {
    if (seconds > 0) {
      port?.elapse(seconds, "procedure");
      elapsed += seconds;
    }
  };
  switch (o.effect) {
    case "door-open":
    case "door-close":
    case "door-lock":
    case "door-unlock": {
      const door = { open: o.effect === "door-open", locked: o.effect === "door-lock" };
      store.patchEntity(id, { door });
      events.push(host.emit({ type: "door.changed", entityId: id, open: door.open, locked: door.locked, actorId: actor.id }));
      if (o.effect === "door-lock" || o.effect === "door-unlock") invalidateDoor(host, id);
      mover.setDoor?.(id, door.open);
      break;
    }
    case "wash-hands": {
      charge(o.durationSeconds);
      const until = clinical.clock() + HAND_HYGIENE_MINUTES;
      store.setHands(actor.id, until);
      events.push(host.emit({ type: "hygiene", actorId: actor.id, until }));
      message = worldMessage("ok.washed", L, { until });
      break;
    }
    case "monitor-read": {
      const snapshot = clinical.bedside();
      const screen = snapshot ? formatScreen(snapshot, L) : { screen: worldMessage("screen.notRecorded", L) };
      message = worldMessage("ok.screen", L, { target, screen: screen.alarms ? `${screen.screen}\n${screen.alarms}` : screen.screen });
      break;
    }
    case "pick-up": {
      const p = locator.place(id)!;
      store.patchEntity(id, { heldBy: actor.id, position: undefined });
      store.setHolding(actor.id, [...actor.holding, id]);
      events.push(host.emit({ type: "item.held", entityId: id, actorId: actor.id, held: true }));
      host.invalidate({ level: p.level, ...grow(p.area, 0.5) });
      mover.placeEntity?.(id, null);
      break;
    }
    case "put-down": {
      const ahead = { x: actor.pose.x - Math.sin(actor.pose.yaw) * 0.8, z: actor.pose.z - Math.cos(actor.pose.yaw) * 0.8 };
      const spot = parkingSpot(host, actor.pose, id, { minX: ahead.x, maxX: ahead.x, minZ: ahead.z, maxZ: ahead.z });
      if (!spot) return failed("PRECONDITION_FAILED", worldMessage("pre.noSpot", L, { target }));
      const data = { ...(store.entity(id)?.data ?? {}) };
      delete data.equipped;
      store.patchEntity(id, { heldBy: undefined, position: spot, data: Object.keys(data).length ? data : undefined });
      store.setHolding(actor.id, actor.holding.filter((h) => h !== id));
      events.push(host.emit({ type: "item.held", entityId: id, actorId: actor.id, held: false }));
      events.push(host.emit({ type: "entity.moved", entityId: id, to: { x: spot.x, y: spot.y, z: spot.z, level: spot.level }, actorId: actor.id }));
      host.invalidate({ level: spot.level, minX: spot.x - 1, maxX: spot.x + 1, minZ: spot.z - 1, maxZ: spot.z + 1 });
      mover.placeEntity?.(id, spot);
      break;
    }
    case "equip": {
      store.patchEntity(id, { data: { ...(store.entity(id)?.data ?? {}), equipped: true } });
      events.push(host.emit({ type: "entity.state", entityId: id, from: "held", to: "equipped", operation: o.id, actorId: actor.id }));
      break;
    }
    default:
      events.push(...commitTransition(host, actor, id, o, rules.state(id)));
  }
  if (o.effect !== "wash-hands") charge(o.durationSeconds);
  const state = rules.stateLabel(id);
  const out: Outcome = { status: "completed", message: message ?? (o.to !== undefined && state ? worldMessage("ok.state", L, { operation, target, state }) : worldMessage("ok.done", L, { operation, target })), events };
  if (elapsed > 0) out.elapsedSeconds = elapsed;
  return out;
}

/**
 * Commit a behaviour transition and its reservation change (one version
 * step on the device): stored states are written; a derived state is
 * re-read (the engine is authoritative) and reported only when it changed.
 */
export function commitTransition(host: EffectsHost, actor: ActorState, id: EntityId, o: OperationSpec, fromState: string | null): WorldEvent[] {
  const { store, rules } = host.d;
  const spec = rules.spec(id);
  const before = store.entity(id)?.reservedBy ?? null;
  const patch: { state?: string; reservedBy?: string | undefined } = {};
  if (o.to !== undefined && spec.stateSource === "stored") patch.state = o.to;
  if (o.reserve) patch.reservedBy = actor.id;
  else if (o.release) patch.reservedBy = undefined;
  const toState = spec.stateSource === "stored" ? (o.to ?? fromState) : rules.state(id);
  const stateChanged = toState !== fromState;
  const reservationChanged = (o.reserve && before !== actor.id) || (o.release && before !== null);
  if (!stateChanged && !reservationChanged && !("state" in patch)) return [];
  store.patchEntity(id, patch);
  const events: WorldEvent[] = [];
  if (stateChanged) events.push(host.emit({ type: "entity.state", entityId: id, from: fromState, to: toState, operation: o.id, actorId: actor.id }));
  if (reservationChanged) events.push(host.emit({ type: "reservation.changed", entityId: id, reservedBy: o.reserve ? actor.id : null }));
  return events;
}

function invalidateDoor(host: EffectsHost, id: EntityId): void {
  const door = host.d.collision.doors.find((d) => d.id === id);
  if (door) host.invalidate({ level: door.level, ...door.area });
}

/* ------------------------------------------------------------------ */
/* Clinical operations                                                 */
/* ------------------------------------------------------------------ */

async function clinicalOperation(host: EffectsHost, request: WorldActionRequest, actor: ActorState, id: EntityId, o: OperationSpec, signal: AbortSignal): Promise<Outcome> {
  const { store, rules, locator, checker, caseDef, locale: L, port } = host.d;
  const target = locator.name(id);
  const operation = rules.operationLabel(o);
  const sel = selectClinical({ effect: o.clinical ?? { tool: "order_test", select: "param" }, toolByParam: o.toolByParam, caps: locator.capabilities(id), match: o.toolByParam ? "intersect" : "subset", parameters: request.parameters, caseDef, locale: L, target });
  if (!sel.ok) {
    // where the item can be done instead (e.g. the station that provides it)
    const elsewhere = sel.intent ? checker.check(actor.id, sel.intent) : null;
    return failed(sel.code, sel.message, elsewhere && !elsewhere.ok ? { hint: elsewhere.hint } : {});
  }
  const { tool, args, intent } = sel.value;
  const check = checker.check(actor.id, intent);
  if (!check.ok) return failed(check.code, check.message, { hint: check.hint });
  if (!port) return failed("CLINICAL_REJECTED", worldMessage("NO_PORT", L));
  const fromState = rules.state(id);
  host.busy.set(id, actor.id);
  const task = { id: request.actionId, kind: request.operation, label: `${operation} · ${target}`, startedAt: host.d.now() };
  store.setTask(actor.id, task);
  host.emit({ type: "task.changed", actorId: actor.id, task });
  let r: ClinicalInvokeResult;
  try {
    r = await port.invoke(actor.id, tool, args, signal, { actionId: request.actionId });
  } catch (e) {
    r = { ok: false, output: e instanceof Error ? e.message : String(e), outcome: signal.aborted ? "cancelled" : "error", clinicalEventIds: [] };
  } finally {
    host.busy.delete(id);
    store.setTask(actor.id, null);
    host.emit({ type: "task.changed", actorId: actor.id, task: null });
  }
  const clinical = { tool, ok: r.outcome === "ok", output: r.output };
  if (r.outcome === "cancelled" || (r.outcome !== "ok" && signal.aborted)) return { status: "cancelled", errorCode: "CANCELLED", message: worldMessage("CANCELLED", L), events: [], clinical };
  if (r.outcome === "denied") return failed("APPROVAL_DENIED", worldMessage("APPROVAL_DENIED", L, { output: r.output }), { clinical });
  // the session's own refusals keep their code (and hint): a spatial re-check is fixed by walking, a role never (C13)
  if (r.outcome === "spatial") return failed(r.code ?? "SPATIAL_PRECONDITION_CHANGED", r.message ?? r.output, { clinical, hint: r.hint ?? null });
  if (r.outcome === "unauthorized") return failed("NOT_AUTHORIZED", r.message ?? r.output, { clinical, hint: null });
  if (r.outcome !== "ok") return failed("CLINICAL_REJECTED", worldMessage("CLINICAL_REJECTED", L, { output: r.output }), { clinical, clinicalEventIds: [...r.clinicalEventIds] });
  const events = commitTransition(host, actor, id, o, fromState);
  return { status: "completed", message: worldMessage("ok.clinical", L, { operation, target, output: r.output }), events, clinical, clinicalEventIds: [...r.clinicalEventIds] };
}

/* ------------------------------------------------------------------ */
/* Carts                                                               */
/* ------------------------------------------------------------------ */

async function moveCart(host: EffectsHost, request: WorldActionRequest, actor: ActorState, id: EntityId, signal: AbortSignal): Promise<Outcome> {
  const { store, locator, backend, locale: L, mover } = host.d;
  const target = locator.name(id);
  const goal = request.goal ?? request.parameters?.goal;
  if (!host.isGoal(goal)) return failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.missingParam", L, { param: "goal" }) }));
  const cart = locator.place(id)!;
  const plan = backend.plan({ actorId: actor.id, from: actor.pose, goal, role: actor.role, accessibleOnly: true });
  if (!plan.ok) return failed(plan.code, plan.message, { hint: null });
  host.busy.set(id, actor.id);
  let walk: Walk;
  try {
    walk = await host.walk(actor, plan, signal, request);
  } finally {
    host.busy.delete(id);
  }
  const now = store.actor(actor.id)!;
  // a cart is left beside the body that wheeled it — not between them and what it was brought to
  const spot = parkingSpot(host, now.pose, id, goalTargetArea(host, goal), goalSight(host, goal));
  const base = { navigation: walk.record, elapsedSeconds: walk.travelSeconds };
  if (!spot) return { status: "failed", errorCode: "PRECONDITION_FAILED", message: worldMessage("pre.noSpot", L, { target }), events: walk.events, ...base };
  store.patchEntity(id, { position: { ...spot, rot: cart.rot } });
  const events = [...walk.events, host.emit({ type: "entity.moved", entityId: id, to: { x: spot.x, y: spot.y, z: spot.z, level: spot.level }, actorId: actor.id })];
  host.invalidate({ level: cart.level, ...grow(cart.area, 0.5) });
  host.invalidate({ level: spot.level, minX: spot.x - 1, maxX: spot.x + 1, minZ: spot.z - 1, maxZ: spot.z + 1 });
  mover.placeEntity?.(id, { ...spot, rot: cart.rot });
  // where it now stands: its room, else the building's corridor or the facility's outdoor region (lead note 2)
  const placeName = locator.regionName({ level: spot.level, x: spot.x, z: spot.z });
  if (walk.interrupted) return { status: "cancelled", errorCode: "MOVEMENT_INTERRUPTED", message: worldMessage("ok.interrupted", L, { distance: metres(walk.walked) }), events, ...base };
  return { status: "completed", message: worldMessage("ok.moved", L, { target, place: placeName, distance: metres(walk.walked) }), events, ...base };
}

/** The area a goal leads to (the target entity's footprint, a point), or null (rooms, composite goals). */
function goalTargetArea(host: EffectsHost, goal: NavGoal): Area | null {
  if (goal.kind === "point") return { minX: goal.x, maxX: goal.x, minZ: goal.z, maxZ: goal.z };
  if (goal.kind === "any" || goal.kind === "room") return null;
  const id = host.d.registry.resolveId(goal.id) ?? goal.id;
  return host.d.locator.place(id)?.area ?? null;
}

/** What a goal's target looks like where it is (its sight target), or null (rooms, points, composite goals). */
function goalSight(host: EffectsHost, goal: NavGoal): SightTarget | null {
  if (goal.kind === "point" || goal.kind === "any" || goal.kind === "room") return null;
  const id = host.d.registry.resolveId(goal.id) ?? goal.id;
  const p = host.d.locator.place(id);
  return p ? host.d.locator.sight(p) : null;
}

const grow = (a: Area, m: number): Area => ({ minX: a.minX - m, maxX: a.maxX + m, minZ: a.minZ - m, maxZ: a.maxZ + m });

/**
 * A free spot to leave a cart or an item near a pose: a statically and
 * dynamically free navigation cell (no doorway, not the item's own old
 * stamp counted), at least 0.6 m from every actor, within 1.25 m (else 2 m,
 * else 3 m) of the pose — the one nearest to `towards` (the goal's target),
 * then nearest to the pose. `keepInView`: what the cart was brought to (the
 * patient on a scanner table) — when it is in view from the pose, the first
 * spot in that order where the parked cart would not hide it (else the
 * nearest all the same).
 */
export function parkingSpot(host: EffectsHost, pose: Pose, id: EntityId, towards: Area | null, keepInView?: SightTarget | null): (Vec3 & { level: string }) | null {
  const grids = host.d.grids;
  const g = grids?.grid(pose.level);
  const y = levelElevation(host.d.facility, pose.level);
  if (!grids || !g) return { x: pose.x - Math.sin(pose.yaw) * 0.9, y, z: pose.z - Math.cos(pose.yaw) * 0.9, level: pose.level };
  const own = grids.dynamicIds.indexOf(id) + 1;
  const others = host.d.store.actors().filter((a) => a.pose.level === pose.level);
  const vis = host.d.visibility;
  const watch = keepInView && keepInView.level === pose.level && vis.visibleFrom(pose.level, pose, keepInView) ? keepInView : null;
  const rot = host.d.locator.place(id)?.rot;
  for (const radius of [1.25, 2, 3]) {
    const found: { i: number; score: number }[] = [];
    const x0 = Math.max(0, Math.floor((pose.x - radius - g.minX) / g.cell)), x1 = Math.min(g.cols - 1, Math.floor((pose.x + radius - g.minX) / g.cell));
    const z0 = Math.max(0, Math.floor((pose.z - radius - g.minZ) / g.cell)), z1 = Math.min(g.rows - 1, Math.floor((pose.z + radius - g.minZ) / g.cell));
    for (let iz = z0; iz <= z1; iz++)
      for (let ix = x0; ix <= x1; ix++) {
        const i = iz * g.cols + ix;
        if (g.base[i] || g.door[i] || (g.dynamic[i] && g.dynamic[i] !== own)) continue;
        const c = cellPoint(g, i);
        const dPose = Math.hypot(c.x - pose.x, c.z - pose.z);
        if (dPose > radius || others.some((a) => Math.hypot(c.x - a.pose.x, c.z - a.pose.z) < 0.6)) continue;
        found.push({ i, score: (towards ? distanceToArea(c.x, c.z, towards) : 0) + 0.25 * dPose });
      }
    if (!found.length) continue;
    // nearest first (ties: the lower cell index, as the scan order)
    found.sort((a, b) => (Math.abs(a.score - b.score) > 1e-9 ? a.score - b.score : a.i - b.i));
    let best = found[0]!;
    if (watch) {
      const clear = found.slice(0, PARKING_SIGHT_TRIES).find((f) => {
        const c = cellPoint(g, f.i);
        return vis.visibleWith(pose.level, pose, watch, { id, x: c.x, z: c.z, ...(rot !== undefined ? { rot } : {}) });
      });
      if (clear) best = clear;
    }
    const c = cellPoint(g, best.i);
    return { x: c.x, y, z: c.z, level: pose.level };
  }
  return null;
}

/** Spots tried (nearest first) for one that keeps the patient in view before parking at the nearest anyway. */
const PARKING_SIGHT_TRIES = 48;
