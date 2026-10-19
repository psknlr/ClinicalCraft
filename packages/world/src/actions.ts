/**
 * The action bus (EMBODIED §2, §5) — the only writer of the physical layer.
 * Commit order of `execute(request, signal)`:
 *
 * 1. idempotency — a recorded action id returns its recorded result; an id
 *    still running returns the same promise;
 * 2. validate — request shape, goal shape (`INVALID_REQUEST`), actor
 *    (`UNKNOWN_ACTOR`);
 * 3. per-actor queue — actions of one actor run one at a time, in order
 *    (different actors run concurrently); `cancel(actorId)` or the signal
 *    aborts the running and the queued ones;
 * 4. versions — `expectedWorldVersion` (strict) and `expectedTargetVersion`
 *    (per entity, EMBODIED R4) → `STALE_STATE`;
 * 5. resolve target (`resolveId`) → `TARGET_NOT_FOUND`;
 * 6. operation — offered by the target's behaviour (`OPERATION_NOT_SUPPORTED`);
 * 7. authority (`NOT_AUTHORIZED`, see `authority.ts`), availability
 *    (`DEVICE_UNAVAILABLE`), reservation (`DEVICE_BUSY`), state and
 *    preconditions (`PRECONDITION_FAILED`, `HANDS_FULL`, `NOT_HOLDING`);
 * 8. spatial — range from the footprint, line of sight, same level
 *    (`NOT_IN_RANGE` / `NOT_VISIBLE` with a verified `hint` goal);
 * 9. clinical effect — the item is selected, the spatial policy is checked
 *    (`SPATIAL_REQUIREMENT_UNMET`, hint), the device is locked and the tool
 *    runs through `ClinicalPort.invoke` (hooks, precheck, approval, engine;
 *    `APPROVAL_DENIED` / `CLINICAL_REJECTED` / `CANCELLED` commit nothing);
 * 10. commit — device transition, reservation, physical effects; events;
 *    time (`elapse`); the result (recorded under the action id; an
 *    `action.completed` event closes it).
 *
 * Navigation operations (`navigate` {goal}, `approach` {target: its best
 * interaction point}, `look_at` {target: a vantage point facing it}) plan
 * with the backend, move the body with the `Mover` (default: instant),
 * commit the pose the mover reports, record what is visible on arrival,
 * charge the travel time once (`elapse(seconds, "travel")`; an interrupted
 * walk charges the part walked) and return a `NavigationRecord`.
 * Interrupted movement (cancel, abort, a mover that stops short) is
 * `cancelled` with `MOVEMENT_INTERRUPTED`; the partial pose is kept.
 *
 * Failed actions change no version. Results are recorded whatever their
 * status: retry with a new action id after a transient failure.
 */
import type { CaseDefinition, FacilityDefinition } from "@clinicalcraft/core";
import { permits } from "./authority.js";
import type { DeviceRules } from "./behaviors.js";
import type {
  ActorId,
  ActorState,
  ClinicalPort,
  ClinicalView,
  CollisionModel,
  DynamicObstacle,
  EntityId,
  Mover,
  NavGoal,
  NavPlan,
  NavigationBackend,
  Pose,
  TraceSink,
  WorldActionRequest,
  WorldActionResult,
  WorldEvent,
} from "./contracts.js";
import { failed, runOperation, type EffectsHost, type Outcome, type Walk } from "./effects.js";
import { metres, navMessage, operationName, roleName, worldMessage } from "./i18n.js";
import { levelInfos } from "./levels.js";
import type { WorldLocator } from "./locate.js";
import { GridAStarBackend } from "./nav/backend.js";
import type { NavGrids } from "./nav/grid.js";
import type { Perception } from "./perception.js";
import type { SpatialChecker } from "./policy.js";
import type { Area } from "./raster.js";
import type { SemanticRegistry } from "./registry.js";
import type { WorldEventInput, WorldStateStore } from "./state.js";
import { recordActionSpans } from "./trace.js";
import type { VisibilityModel } from "./visibility.js";

export interface ActionBusDeps {
  facility: FacilityDefinition;
  caseDef: CaseDefinition;
  store: WorldStateStore;
  registry: SemanticRegistry;
  locator: WorldLocator;
  rules: DeviceRules;
  checker: SpatialChecker;
  perception: Perception;
  backend: NavigationBackend;
  /** The grid backend's grids (cart parking); null with a custom backend. */
  grids: NavGrids | null;
  visibility: VisibilityModel;
  collision: CollisionModel;
  clinical: ClinicalView;
  port?: ClinicalPort;
  mover: Mover;
  locale: string;
  now: () => number;
  trace?: TraceSink;
}

/** The default `Mover`: arrives instantly at the planned pose (unless aborted before it starts). */
export function instantMover(poseOf: (actorId: ActorId) => Pose | null): Mover {
  return {
    async move(actorId, plan, signal) {
      if (signal?.aborted) return { arrived: false, pose: { ...(poseOf(actorId) ?? plan.target) }, replans: 0 };
      return { arrived: true, pose: { ...plan.target }, replans: 0 };
    },
  };
}

const MOVE_OPS = ["navigate", "approach", "look_at"];
const MAX_ACTION_ID = 200;

/** Why a goal is malformed (null when well-formed). */
export function goalProblem(g: unknown, depth = 0): string | null {
  if (!g || typeof g !== "object" || Array.isArray(g)) return "goal must be an object";
  const goal = g as Record<string, unknown>;
  const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const range = goal.range === undefined || (finite(goal.range) && (goal.range as number) >= 0);
  switch (goal.kind) {
    case "point":
      if (!finite(goal.x) || !finite(goal.z)) return "point goals need finite x and z";
      if (goal.level !== undefined && typeof goal.level !== "string") return "level must be a string";
      return range ? null : "range must be a non-negative number";
    case "entity":
    case "interact":
    case "follow":
    case "look":
    case "room":
      if (typeof goal.id !== "string" || !goal.id.trim()) return `${goal.kind} goals need an id`;
      return range ? null : "range must be a non-negative number";
    case "any":
      if (depth >= 3) return "goals nest too deep";
      if (!Array.isArray(goal.goals) || goal.goals.length === 0 || goal.goals.length > 16) return "any goals need 1–16 goals";
      for (const sub of goal.goals) {
        const p = goalProblem(sub, depth + 1);
        if (p) return p;
      }
      return null;
    default:
      return `unknown goal kind "${String(goal.kind)}"`;
  }
}

/** Why a request is malformed (null when well-formed). */
export function requestProblem(r: unknown): string | null {
  if (!r || typeof r !== "object" || Array.isArray(r)) return "the request must be an object";
  const q = r as Record<string, unknown>;
  if (typeof q.actionId !== "string" || !q.actionId.trim() || q.actionId.length > MAX_ACTION_ID) return "actionId must be a non-empty string (≤ 200 characters)";
  if (typeof q.actorId !== "string" || !q.actorId.trim()) return "actorId must be a non-empty string";
  if (typeof q.operation !== "string" || !q.operation.trim()) return "operation must be a non-empty string";
  if (q.targetId !== undefined && (typeof q.targetId !== "string" || !q.targetId.trim())) return "targetId must be a non-empty string";
  if (q.parameters !== undefined && (!q.parameters || typeof q.parameters !== "object" || Array.isArray(q.parameters))) return "parameters must be an object";
  for (const k of ["expectedWorldVersion", "expectedTargetVersion"]) {
    const v = q[k];
    if (v !== undefined && !(Number.isInteger(v) && (v as number) >= 0)) return `${k} must be a non-negative integer`;
  }
  if (q.goal !== undefined) return goalProblem(q.goal);
  return null;
}

/** Arc length along a plan's path (from `from`) up to the point closest to `pose`. */
export function walkedAlong(from: Pose, plan: Extract<NavPlan, { ok: true }>, pose: Pose): number {
  let best = { d: Infinity, s: 0 };
  let s = 0;
  let prev: { x: number; z: number; level: string } = from;
  for (const p of plan.path) {
    if (p.via || p.level !== prev.level) {
      prev = p;
      continue;
    }
    const dx = p.x - prev.x, dz = p.z - prev.z;
    const len = Math.hypot(dx, dz);
    if (p.level === pose.level) {
      const u = len > 1e-9 ? Math.max(0, Math.min(1, ((pose.x - prev.x) * dx + (pose.z - prev.z) * dz) / (len * len))) : 0;
      const d = Math.hypot(prev.x + u * dx - pose.x, prev.z + u * dz - pose.z);
      if (d < best.d) best = { d, s: s + u * len };
    }
    s += len;
    prev = p;
  }
  return Math.min(best.s, plan.length);
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const samePose = (a: Pose, b: Pose) => a.x === b.x && a.y === b.y && a.z === b.z && a.yaw === b.yaw && a.pitch === b.pitch && a.level === b.level;

export class ActionBus implements EffectsHost {
  readonly busy = new Map<EntityId, ActorId>();
  private readonly pending = new Map<string, Promise<WorldActionResult>>();
  private readonly tails = new Map<ActorId, Promise<void>>();
  private readonly controllers = new Map<ActorId, Set<AbortController>>();

  constructor(readonly d: ActionBusDeps) {}

  /* ---------------- helpers for effects ---------------- */

  emit(input: WorldEventInput): WorldEvent {
    return this.d.store.emit(input);
  }

  invalidate(area: Area & { level: string }): void {
    this.d.backend.invalidate(area);
    if (!(this.d.backend instanceof GridAStarBackend) || this.d.backend.visibility !== this.d.visibility) this.d.visibility.invalidate(area);
  }

  isGoal(goal: unknown): goal is NavGoal {
    return goalProblem(goal) === null;
  }

  verifyHint(actor: ActorState, goal: NavGoal | undefined, label: string | undefined): { goal: NavGoal; label: string } | null | undefined {
    if (!goal) return undefined;
    const plan = this.d.backend.plan({ actorId: actor.id, from: actor.pose, goal, role: actor.role });
    return plan.ok ? { goal, label: label ?? "" } : null;
  }

  /* ---------------- public API ---------------- */

  /** Recorded result of an action id (feedback / idempotency). */
  feedback(actionId: string): WorldActionResult | null {
    return this.d.store.result(actionId);
  }

  /** Abort the actor's running and queued actions; true when there was one. */
  cancel(actorId: ActorId): boolean {
    const set = this.controllers.get(actorId);
    if (!set?.size) return false;
    for (const c of [...set]) c.abort();
    return true;
  }

  execute(request: WorldActionRequest, signal?: AbortSignal): Promise<WorldActionResult> {
    const actionId = typeof request?.actionId === "string" ? request.actionId : "";
    const recorded = actionId ? this.d.store.result(actionId) : null;
    if (recorded) return Promise.resolve(recorded);
    const running = actionId ? this.pending.get(actionId) : undefined;
    if (running) return running;
    const t0 = this.timing();
    const problem = requestProblem(request);
    // a malformed request is recorded under its action id when it has a usable one
    if (problem) return Promise.resolve(this.finish(request, failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", this.d.locale, { reason: problem })), t0, !!actionId.trim() && actionId.length <= MAX_ACTION_ID));
    const actorId = request.actorId;
    if (!this.d.store.actor(actorId)) return Promise.resolve(this.finish(request, failed("UNKNOWN_ACTOR", worldMessage("UNKNOWN_ACTOR", this.d.locale, { actor: actorId })), t0));
    if (request.operation === "cancel") {
      const n = this.controllers.get(actorId)?.size ?? 0;
      this.cancel(actorId);
      return Promise.resolve(this.finish(request, { status: "completed", message: worldMessage("ok.cancelled", this.d.locale, { count: n }), events: [] }, t0));
    }
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener("abort", onAbort, { once: true });
    let set = this.controllers.get(actorId);
    if (!set) this.controllers.set(actorId, (set = new Set()));
    set.add(controller);
    const tail = this.tails.get(actorId) ?? Promise.resolve();
    const promise = tail
      .then(() => this.run(request, controller.signal))
      .finally(() => {
        set!.delete(controller);
        signal?.removeEventListener("abort", onAbort);
        this.pending.delete(actionId);
      });
    this.tails.set(
      actorId,
      promise.then(
        () => undefined,
        () => undefined,
      ),
    );
    this.pending.set(actionId, promise);
    return promise;
  }

  /* ---------------- scenario controls ---------------- */

  setObstacle(o: DynamicObstacle, present: boolean): void {
    if (!o || typeof o.id !== "string" || !o.rect || ![o.rect.x, o.rect.z, o.rect.w, o.rect.d].every(Number.isFinite)) throw new Error("setObstacle: invalid obstacle");
    if (!this.d.store.setObstacle(o, present)) return;
    const r = o.rect;
    this.invalidate({ level: o.level, minX: r.x - r.w / 2, maxX: r.x + r.w / 2, minZ: r.z - r.d / 2, maxZ: r.z + r.d / 2 });
    this.emit({ type: "obstacle.changed", obstacle: { ...o, rect: { ...o.rect } }, present });
  }

  setAvailability(idOrAlias: EntityId, available: boolean): void {
    const id = this.resolve(idOrAlias);
    if (!id || this.d.registry.entity(id)?.kind !== "equipment") throw new Error(`setAvailability: unknown equipment "${idOrAlias}"`);
    if (this.d.store.available(id) === available) return;
    this.d.store.patchEntity(id, { available: available ? undefined : false });
    this.emit({ type: "entity.availability", entityId: id, available });
  }

  setDoor(idOrAlias: EntityId, state: { open?: boolean; locked?: boolean }): void {
    const id = this.resolve(idOrAlias);
    const door = id ? this.d.collision.doors.find((x) => x.id === id) : undefined;
    if (!id || !door) throw new Error(`setDoor: unknown door "${idOrAlias}"`);
    const cur = this.d.store.doorState(id) ?? { open: false, locked: false };
    const next = { open: state.open ?? cur.open, locked: state.locked ?? cur.locked };
    if (next.locked) next.open = false;
    if (next.open === cur.open && next.locked === cur.locked) return;
    this.d.store.patchEntity(id, { door: next });
    this.emit({ type: "door.changed", entityId: id, open: next.open, locked: next.locked, actorId: null });
    if (next.locked !== cur.locked) this.invalidate({ level: door.level, ...door.area });
    this.d.mover.setDoor?.(id, next.open);
  }

  /* ---------------- pipeline ---------------- */

  /** Resolve an id or alias: registry entities, then actors (`clinician` → `actor:clinician`). */
  resolve(idOrAlias: string): EntityId | null {
    const id = this.d.registry.resolveId(idOrAlias);
    if (id) return id;
    if (this.d.store.actor(idOrAlias)) return idOrAlias;
    return this.d.store.actor(`actor:${idOrAlias}`) ? `actor:${idOrAlias}` : null;
  }

  private timing() {
    return { startedAt: this.d.now(), clockStart: this.d.clinical.clock() };
  }

  private async run(request: WorldActionRequest, signal: AbortSignal): Promise<WorldActionResult> {
    const t0 = this.timing();
    if (signal.aborted) return this.finish(request, { status: "cancelled", errorCode: "CANCELLED", message: worldMessage("CANCELLED", this.d.locale), events: [] }, t0);
    let outcome: Outcome;
    try {
      outcome = await this.dispatch(request, this.d.store.actor(request.actorId)!, signal);
    } catch (e) {
      outcome = failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", this.d.locale, { reason: `internal error: ${e instanceof Error ? e.message : String(e)}` }));
    }
    return this.finish(request, outcome, t0);
  }

  private async dispatch(request: WorldActionRequest, actor: ActorState, signal: AbortSignal): Promise<Outcome> {
    const { store, locale: L } = this.d;
    if (request.expectedWorldVersion !== undefined && request.expectedWorldVersion !== store.version) {
      return failed("STALE_STATE", worldMessage("STALE_WORLD", L, { expected: request.expectedWorldVersion, actual: store.version }));
    }
    let targetId: EntityId | undefined;
    if (request.targetId !== undefined) {
      const id = this.resolve(request.targetId);
      if (!id) return failed("TARGET_NOT_FOUND", navMessage("TARGET_NOT_FOUND", L, { target: request.targetId }));
      targetId = id;
      const v = store.entityVersion(id);
      if (request.expectedTargetVersion !== undefined && request.expectedTargetVersion !== v) {
        return failed("STALE_STATE", worldMessage("STALE_STATE", L, { target: this.d.locator.name(id), expected: request.expectedTargetVersion, actual: v }));
      }
    }
    if (MOVE_OPS.includes(request.operation)) {
      if (!permits(actor.role, request.operation)) return failed("NOT_AUTHORIZED", worldMessage("NOT_AUTHORIZED", L, { role: roleName(actor.role, L), target: targetId ? this.d.locator.name(targetId) : "—", operation: operationName(request.operation, L) }));
      let goal: NavGoal | undefined;
      if (request.operation === "navigate") goal = request.goal ?? (targetId ? { kind: "interact", id: targetId } : undefined);
      else if (targetId) goal = request.operation === "approach" ? { kind: "interact", id: targetId } : { kind: "look", id: targetId };
      if (!goal) return failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.missingParam", L, { param: request.operation === "navigate" ? "goal" : "targetId" }) }));
      return this.navigate(request, actor, goal, signal);
    }
    if (!targetId) return failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", L, { reason: worldMessage("pre.missingParam", L, { param: "targetId" }) }));
    return this.interact(request, actor, targetId, signal);
  }

  private async interact(request: WorldActionRequest, actor: ActorState, targetId: EntityId, signal: AbortSignal): Promise<Outcome> {
    const { rules, locator, locale: L } = this.d;
    const o = rules.operation(targetId, request.operation);
    if (!o) {
      const ops = rules.spec(targetId).operations.map((x) => x.id);
      return failed("OPERATION_NOT_SUPPORTED", worldMessage("OPERATION_NOT_SUPPORTED", L, { target: locator.name(targetId), operation: request.operation, available: ops.join(", ") || "—" }));
    }
    const pre = rules.precheck(targetId, o, actor);
    if (pre) return failed(pre.code, pre.message, pre.goal ? { hint: this.verifyHint(actor, pre.goal, pre.label) ?? null } : {});
    const spatial = rules.spatial(targetId, o, actor);
    if (spatial) {
      // the goal that fixes it, when a route leads there; otherwise say why not
      if (!spatial.goal) return failed(spatial.code, spatial.message, { hint: null });
      const plan = this.d.backend.plan({ actorId: actor.id, from: actor.pose, goal: spatial.goal, role: actor.role });
      if (plan.ok) return failed(spatial.code, spatial.message, { hint: { goal: spatial.goal, label: spatial.label ?? "" } });
      return failed(spatial.code, `${spatial.message} ${worldMessage("NO_ROUTE_HINT", L, { target: locator.name(targetId), reason: plan.code })}`, { hint: null });
    }
    return runOperation(this, request, actor, targetId, o, signal);
  }

  private async navigate(request: WorldActionRequest, actor: ActorState, goal: NavGoal, signal: AbortSignal): Promise<Outcome> {
    const L = this.d.locale;
    const plan = this.d.backend.plan({ actorId: actor.id, from: actor.pose, goal, role: actor.role });
    if (!plan.ok) {
      const record = { actionId: request.actionId, actorId: actor.id, goal, ok: false, code: plan.code, length: 0, replans: 0, travelSeconds: 0, arrivalError: 0, path: [] };
      return failed(plan.code, plan.message, { navigation: record, hint: null });
    }
    const walk = await this.walk(actor, plan, signal, request);
    const target = plan.targetEntity ? this.d.locator.name(plan.targetEntity) : "id" in goal ? goal.id : goal.kind === "point" ? `(${goal.x.toFixed(1)}, ${goal.z.toFixed(1)})` : goal.kind;
    const base = { events: walk.events, navigation: walk.record, elapsedSeconds: walk.travelSeconds };
    if (walk.interrupted) return { status: "cancelled", errorCode: "MOVEMENT_INTERRUPTED", message: worldMessage("ok.interrupted", L, { distance: metres(walk.walked) }), ...base };
    const message = plan.path.length ? worldMessage("ok.arrived", L, { target, distance: metres(plan.length), seconds: Math.round(plan.travelSeconds) }) : worldMessage("ok.there", L, { target });
    return { status: "completed", message, ...base };
  }

  /**
   * Move a body along a plan with the mover, commit the reported pose,
   * record what is visible there, charge the travel once.
   */
  async walk(actor: ActorState, plan: Extract<NavPlan, { ok: true }>, signal: AbortSignal, request: WorldActionRequest): Promise<Walk> {
    const { store, mover, perception, port } = this.d;
    const events: WorldEvent[] = [];
    const from: Pose = { ...actor.pose };
    const label = `${request.operation}${plan.targetEntity ? ` → ${this.d.locator.name(plan.targetEntity)}` : ""}`;
    const task = { id: request.actionId, kind: request.operation, label, startedAt: this.d.now() };
    store.setTask(actor.id, task);
    this.emit({ type: "task.changed", actorId: actor.id, task });
    let moved: { arrived: boolean; pose: Pose; replans: number };
    try {
      moved = await mover.move(actor.id, plan, signal);
    } catch {
      moved = { arrived: false, pose: { ...store.actor(actor.id)!.pose }, replans: 0 };
    }
    const interrupted = signal.aborted || !moved.arrived;
    const pose = this.validPose(moved.pose) ? { ...moved.pose } : from;
    const walked = interrupted ? walkedAlong(from, plan, pose) : plan.length;
    const travelSeconds = plan.length > 0 ? (interrupted ? plan.travelSeconds * Math.min(1, walked / plan.length) : plan.travelSeconds) : 0;
    if (!samePose(from, pose)) {
      const { roomChanged, room } = store.setActorPose(actor.id, pose);
      events.push(this.emit({ type: "actor.moved", actorId: actor.id, from, to: { ...pose }, distance: r2(walked), travelSeconds: r2(travelSeconds) }));
      if (roomChanged) events.push(this.emit({ type: "actor.entered-room", actorId: actor.id, room, level: pose.level }));
    }
    const discovered = store.remember(actor.id, perception.visibleIds(store.actor(actor.id)!));
    if (discovered.length) events.push(this.emit({ type: "actor.discovered", actorId: actor.id, entities: discovered }));
    store.setTask(actor.id, null);
    this.emit({ type: "task.changed", actorId: actor.id, task: null });
    if (travelSeconds > 0) port?.elapse(travelSeconds, "travel");
    const record = {
      actionId: request.actionId,
      actorId: actor.id,
      goal: plan.goal,
      ok: !interrupted,
      ...(interrupted ? { code: "MOVEMENT_INTERRUPTED" as const } : {}),
      length: r2(walked),
      replans: moved.replans,
      travelSeconds: r2(travelSeconds),
      arrivalError: r2(Math.hypot(pose.x - plan.target.x, pose.z - plan.target.z)),
      path: plan.path.map((p) => ({ ...p })),
    };
    return { events, record, travelSeconds, interrupted, walked };
  }

  /** A pose the world can hold: finite numbers on a level of the facility. */
  private validPose(p: Pose | undefined): p is Pose {
    return !!p && [p.x, p.y, p.z, p.yaw, p.pitch].every(Number.isFinite) && levelInfos(this.d.facility).some((l) => l.id === p.level);
  }

  /** Stamp versions, close the action (`action.completed`), record it, trace it. */
  private finish(request: WorldActionRequest, o: Outcome, t0: { startedAt: number; clockStart: number }, record = true): WorldActionResult {
    const { store } = this.d;
    const actionId = typeof request?.actionId === "string" ? request.actionId : "";
    const targetId = typeof request?.targetId === "string" ? this.resolve(request.targetId) : null;
    const result: WorldActionResult = { actionId, status: o.status, message: o.message, worldVersion: store.version, events: [...o.events] };
    if (o.errorCode) result.errorCode = o.errorCode;
    if (targetId) result.targetVersion = store.entityVersion(targetId);
    if (o.navigation) result.navigation = o.navigation;
    if (o.elapsedSeconds !== undefined) result.elapsedSeconds = r2(o.elapsedSeconds);
    if (o.clinical) result.clinical = o.clinical;
    if (o.clinicalEventIds) result.clinicalEventIds = o.clinicalEventIds;
    if (o.hint !== undefined) result.hint = o.hint;
    if (actionId && record) {
      const done = this.emit({ type: "action.completed", actionId, actorId: typeof request.actorId === "string" ? request.actorId : "", operation: typeof request.operation === "string" ? request.operation : "", status: o.status, ...(o.errorCode ? { errorCode: o.errorCode } : {}) });
      result.events.push(done);
      store.recordResult(result);
    }
    if (this.d.trace && actionId && record) recordActionSpans(this.d.trace, targetId ? { ...request, targetId } : request, result, { startedAt: t0.startedAt, endedAt: this.d.now(), clockStart: t0.clockStart, clockEnd: this.d.clinical.clock() });
    return result;
  }
}
