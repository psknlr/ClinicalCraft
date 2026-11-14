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
 * walk charges the flat distance walked at `WALK_SPEED` plus the connector
 * rides completed, `progressAlong`) and return a `NavigationRecord`.
 * Interrupted movement (cancel, abort, a mover that stops short) is
 * `cancelled` with `MOVEMENT_INTERRUPTED`; the partial pose is kept.
 *
 * A goal on a movable thing (portable equipment, staff, another actor) the
 * actor does not perceive leads where the actor believes it is (EMBODIED §4
 * "Whereabouts", audit 2026-11-12 P1-8: `Perception.belief`, planned with
 * `NavRequest.believed`) — never where it really is. On arrival the actor
 * looks: in view from there, it walks on to it; else it now knows the thing
 * is missing (`WorldStateStore.miss`) and the walk fails `STALE_DESTINATION`
 * (the walk is kept, like an interrupted one) — it has to look around or ask
 * a colleague (`WorldRuntime.askWhereabouts`). A goal on a thing it knows to
 * be missing leads nowhere (`STALE_DESTINATION`, no walk). A walker going to
 * the actor it works for (`onBehalfOf`: they called) goes where they are.
 * Who moves a thing knows where they left it, and so does the actor they did
 * it for; whoever sees a walker arrive, or a thing put down, knows where it is
 * now (they perceive it there).
 *
 * Failed actions change no version, except a walk that ended where its
 * target was believed to be and found it gone (`STALE_DESTINATION`, the pose
 * kept). Results are recorded whatever their status: retry with a new action
 * id after a transient failure.
 */
import { search, isConcealed } from "./conceal.js";
import type { CaseDefinition, FacilityDefinition } from "@clinicalcraft/core";
import { permits } from "./authority.js";
import type { DeviceRules } from "./behaviors.js";
import { escortPatient, stopFollowing } from "./escort.js";
import { followSensor, followWalkEnd, followWalkStart } from "./journey.js";
import type { PatientBody } from "./patient.js";
import { repositionPatient } from "./posture.js";
import { confirmReceipt, handOver } from "./hand.js";
import { refreshPatient, relocatePatient, transportPatient, type TransportHost } from "./transport.js";
import type {
  ActionHint,
  ActorId,
  ActorState,
  ClinicalPort,
  BodyPosture,
  ClinicalView,
  CollisionModel,
  ConnectorInfo,
  DynamicObstacle,
  EntityId,
  Mover,
  NavGoal,
  NavPlan,
  NavigationBackend,
  NavigationRecord,
  PatientDestination,
  PatientRelocation,
  Pose,
  SeenPlace,
  TraceSink,
  WorldActionRequest,
  WorldActionResult,
  WorldEvent,
} from "./contracts.js";
import { WALK_SPEED } from "./contracts.js";
import { failed, runOperation, type EffectsHost, type Outcome, type Walk } from "./effects.js";
import { listText, metres, navMessage, operationName, roleName, worldMessage } from "./i18n.js";
import { connectorInfos, levelElevation, levelInfos } from "./levels.js";
import type { WorldLocator } from "./locate.js";
import { GridAStarBackend } from "./nav/backend.js";
import type { NavGrids } from "./nav/grid.js";
import type { Perception, StaleBelief } from "./perception.js";
import { operationPlacement, placesByBoth } from "./placement.js";
import type { SpatialChecker } from "./policy.js";
import type { Reachability } from "./reach.js";
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
  /** The patient's body: where the patient is, transports and relocations (EMBODIED §8). */
  patient: PatientBody;
  rules: DeviceRules;
  checker: SpatialChecker;
  perception: Perception;
  /** Walking distances (hint ranking, joint placement of clinical operations). */
  reach: Reachability;
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

/** Most leaves a navigation goal may have in all (nested `any` goals included). */
export const MAX_GOAL_LEAVES = 16;
/** Largest range (m) of a goal leaf (`point`, `entity`, `follow`; `look` has its own). */
export const MAX_GOAL_RANGE = 30;
/** Largest range (m) of a `look` goal: the perception's visibility range (a look goal ray-casts per candidate cell). */
export const MAX_LOOK_RANGE = 15;

/**
 * Why a goal is malformed (null when well-formed): the shape of each leaf,
 * `any` nesting (≤ 3 deep, 1–16 goals each), at most `MAX_GOAL_LEAVES`
 * leaves in all, no duplicate leaf, ranges of at most `MAX_GOAL_RANGE`
 * (`look`: `MAX_LOOK_RANGE`) — the cost bound of every planning request
 * (EMBODIED §7).
 */
export function goalProblem(g: unknown): string | null {
  const leaves: string[] = [];
  const problem = goalShape(g, 0, leaves);
  if (problem) return problem;
  if (leaves.length > MAX_GOAL_LEAVES) return `goals may have at most ${MAX_GOAL_LEAVES} leaves in all (this one has ${leaves.length})`;
  if (new Set(leaves).size !== leaves.length) return "a goal lists the same leaf twice (duplicate)";
  return null;
}

function goalShape(g: unknown, depth: number, leaves: string[]): string | null {
  if (!g || typeof g !== "object" || Array.isArray(g)) return "goal must be an object";
  const goal = g as Record<string, unknown>;
  const finite = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const range = goal.range === undefined || (finite(goal.range) && (goal.range as number) >= 0);
  const cap = goal.kind === "look" ? MAX_LOOK_RANGE : MAX_GOAL_RANGE;
  const capped = goal.range === undefined || (goal.range as number) <= cap;
  const leaf = (): string | null => {
    if (!range) return "range must be a non-negative number";
    if (!capped) return `range must be at most ${cap} m`;
    leaves.push(JSON.stringify(goal, Object.keys(goal).sort()));
    return null;
  };
  switch (goal.kind) {
    case "point":
      if (!finite(goal.x) || !finite(goal.z)) return "point goals need finite x and z";
      if (goal.level !== undefined && typeof goal.level !== "string") return "level must be a string";
      return leaf();
    case "entity":
    case "interact":
    case "follow":
    case "look":
    case "room":
      if (typeof goal.id !== "string" || !goal.id.trim()) return `${goal.kind} goals need an id`;
      if (goal.sameRoom !== undefined && (goal.kind !== "look" || typeof goal.sameRoom !== "boolean")) return "sameRoom is a boolean of look goals";
      return leaf();
    case "any":
      if (depth >= 3) return "goals nest too deep";
      if (!Array.isArray(goal.goals) || goal.goals.length === 0 || goal.goals.length > 16) return "any goals need 1–16 goals";
      for (const sub of goal.goals) {
        const p = goalShape(sub, depth + 1, leaves);
        if (p) return p;
        if (leaves.length > MAX_GOAL_LEAVES) return `goals may have at most ${MAX_GOAL_LEAVES} leaves in all`;
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
  if (q.onBehalfOf !== undefined && (typeof q.onBehalfOf !== "string" || !q.onBehalfOf.trim())) return "onBehalfOf must be a non-empty string";
  if (q.goal !== undefined) return goalProblem(q.goal);
  return null;
}

/**
 * How far a body got along a plan's path (from `from`) when it stopped at
 * `pose`: the flat metres walked on the levels up to the point of the path
 * closest to the pose (on the pose's level), and the connector rides
 * completed on the way — their seconds (`travelSeconds` × stops) and, for
 * stairs and ramps, their climb (the 3D distance between the stops, as the
 * planner's `length` counts it). A ride is complete once the body is past
 * its arrival point (`via`).
 */
export function progressAlong(from: Pose, plan: Extract<NavPlan, { ok: true }>, pose: Pose, connectors: readonly ConnectorInfo[], elevation: (level: string) => number): { flat: number; climb: number; rideSeconds: number } {
  type Mark = { flat: number; climb: number; rideSeconds: number };
  let best: { d: number; mark: Mark } = { d: Infinity, mark: { flat: 0, climb: 0, rideSeconds: 0 } };
  let flat = 0, climb = 0, rideSeconds = 0;
  let prev: { x: number; z: number; level: string } = from;
  if (from.level === pose.level) best = { d: Math.hypot(from.x - pose.x, from.z - pose.z), mark: { flat, climb, rideSeconds } };
  for (const p of plan.path) {
    if (p.via || p.level !== prev.level) {
      const c = p.via ? connectors.find((x) => x.id === p.via) : undefined;
      if (c) {
        const a = c.stops.findIndex((st) => st.level === prev.level), b = c.stops.findIndex((st) => st.level === p.level);
        rideSeconds += c.travelSeconds * (a >= 0 && b >= 0 ? Math.abs(b - a) : 1);
        if (c.kind !== "elevator") climb += Math.hypot(p.x - prev.x, p.z - prev.z, elevation(p.level) - elevation(prev.level));
      }
      prev = p;
      if (p.level === pose.level) {
        const d = Math.hypot(p.x - pose.x, p.z - pose.z);
        if (d < best.d) best = { d, mark: { flat, climb, rideSeconds } };
      }
      continue;
    }
    const dx = p.x - prev.x, dz = p.z - prev.z;
    const len = Math.hypot(dx, dz);
    if (p.level === pose.level) {
      const u = len > 1e-9 ? Math.max(0, Math.min(1, ((pose.x - prev.x) * dx + (pose.z - prev.z) * dz) / (len * len))) : 0;
      const d = Math.hypot(prev.x + u * dx - pose.x, prev.z + u * dz - pose.z);
      if (d < best.d) best = { d, mark: { flat: flat + u * len, climb, rideSeconds } };
    }
    flat += len;
    prev = p;
  }
  return best.mark;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const samePose = (a: Pose, b: Pose) => a.x === b.x && a.y === b.y && a.z === b.z && a.yaw === b.yaw && a.pitch === b.pitch && a.level === b.level;

export class ActionBus implements EffectsHost, TransportHost {
  readonly busy = new Map<EntityId, ActorId>();
  /** The patient's body as the grids hold it (`refreshPatient`). */
  patientStamp: { key: string; posture: BodyPosture | null; body: { level: string; area: Area } | null };
  /** The transport walking now (`PatientPlace.transit`). */
  transit: TransportHost["transit"] = null;
  /** The same transport as a snapshot keeps it. */
  journey: TransportHost["journey"] = null;
  /** Stops the walking transport now (the patient can no longer walk); null when none walks. */
  transitStop: TransportHost["transitStop"] = null;
  /** The stretch of the walk the patient makes with someone now (their own path, `journey.ts`); null: none. */
  follow: TransportHost["follow"] = null;
  private readonly connectors: ConnectorInfo[];
  private readonly pending = new Map<string, Promise<WorldActionResult>>();
  private readonly tails = new Map<ActorId, Promise<void>>();
  private readonly controllers = new Map<ActorId, Set<AbortController>>();
  /** The actor each acting body works for right now (`onBehalfOf`; one action per body at a time). */
  private readonly principals = new Map<ActorId, ActorId>();

  constructor(readonly d: ActionBusDeps) {
    this.connectors = connectorInfos(d.facility);
    this.patientStamp = { key: d.patient.bodyKey(), posture: d.patient.state() ? d.patient.posture() : null, body: d.patient.body() };
  }

  /* ---------------- helpers for effects ---------------- */

  emit(input: WorldEventInput): WorldEvent {
    // the events of a delegated action name whom it was done for (G13)
    const by = "actorId" in input && typeof input.actorId === "string" ? input.actorId : input.type === "reservation.changed" ? input.reservedBy : null;
    const principal = by ? this.principals.get(by) : undefined;
    return this.d.store.emit(principal ? ({ ...input, onBehalfOf: principal } as WorldEventInput) : input);
  }

  invalidate(area: Area & { level: string }): void {
    this.d.backend.invalidate(area);
    if (!(this.d.backend instanceof GridAStarBackend) || this.d.backend.visibility !== this.d.visibility) this.d.visibility.invalidate(area);
  }

  isGoal(goal: unknown): goal is NavGoal {
    return goalProblem(goal) === null;
  }

  verifyHint(actor: ActorState, goal: NavGoal | undefined, label: string | undefined, then?: ActionHint["then"]): ActionHint | null | undefined {
    if (!goal) return undefined;
    // as the actor would walk it: to where it believes things are (a thing it knows to be missing: no way there)
    const { plan } = this.planAs(actor, goal);
    return plan?.ok ? { goal, label: label ?? "", ...(then ? { then } : {}) } : null;
  }

  /* ---------------- whereabouts (EMBODIED §4, audit P1-8) ---------------- */

  /**
   * What the actor believes of each movable thing a goal leads to, where that is not where it is: every leaf on an
   * entity, by resolved id — except the actor the walker works for (`onBehalfOf`: they called, from where they are).
   */
  private beliefsFor(actor: ActorState, goal: NavGoal): Map<EntityId, StaleBelief> {
    const out = new Map<EntityId, StaleBelief>();
    const principal = this.principals.get(actor.id);
    const visit = (g: NavGoal): void => {
      if (g.kind === "any") return g.goals.forEach(visit);
      if (g.kind === "point" || g.kind === "room") return;
      const id = this.resolve(g.id);
      if (!id || id === actor.id || id === principal || out.has(id)) return;
      const b = this.d.perception.belief(actor, id);
      if (b) out.set(id, b);
    };
    visit(goal);
    return out;
  }

  /** The goal without its leaves on things the actor knows to be missing (null: nothing left to go to). */
  private withoutMissing(goal: NavGoal, beliefs: ReadonlyMap<EntityId, StaleBelief>): NavGoal | null {
    if (goal.kind === "any") {
      const goals = goal.goals.map((g) => this.withoutMissing(g, beliefs)).filter((g): g is NavGoal => g !== null);
      return !goals.length ? null : goals.length === goal.goals.length ? goal : { kind: "any", goals };
    }
    if (goal.kind === "point" || goal.kind === "room") return goal;
    const id = this.resolve(goal.id);
    return id && beliefs.get(id)?.kind === "missing" ? null : goal;
  }

  /**
   * Plan a walk as this actor's navigation does (audit P1-8): a goal on a movable thing it believes elsewhere leads
   * to that belief (`NavRequest.believed`). `plan` null: every leaf names a thing it knows to be missing.
   */
  planAs(actor: ActorState, goal: NavGoal, opts: { accessibleOnly?: boolean } = {}): { plan: NavPlan | null; goal: NavGoal | null; beliefs: Map<EntityId, StaleBelief> } {
    const beliefs = this.beliefsFor(actor, goal);
    const usable = this.withoutMissing(goal, beliefs);
    if (!usable) return { plan: null, goal: null, beliefs };
    const believed: Record<EntityId, SeenPlace> = {};
    for (const [id, b] of beliefs) if (b.place) believed[id] = b.place;
    const request = { actorId: actor.id, from: actor.pose, goal: usable, role: actor.role, ...(opts.accessibleOnly ? { accessibleOnly: true } : {}), ...(Object.keys(believed).length ? { believed } : {}) };
    return { plan: this.d.backend.plan(request), goal: usable, beliefs };
  }

  /**
   * Whoever perceives these things where they are now — a walker who arrived, a cart left beside someone — knows that
   * they are there (memory only): every actor but `except` (it learns by its own walk).
   */
  private witness(ids: readonly EntityId[], except: ActorId | null): void {
    const { store, locator, perception } = this.d;
    const placeOf = (id: EntityId): SeenPlace | null => {
      const p = locator.place(id);
      return p ? { level: p.level, x: p.position.x, y: p.position.y, z: p.position.z, rot: p.rot } : null;
    };
    for (const a of store.actors()) {
      if (a.id === except) continue;
      const seen = ids.filter((id) => id !== a.id && perception.perceives(a, id));
      if (seen.length) store.remember(a.id, seen, placeOf);
    }
  }

  /** Why the actor cannot go to a thing it knows to be missing ("You do not know where … is now: …"). */
  private unknownMessage(actor: ActorState, id: EntityId): string {
    const missed = this.d.store.missed(actor.id, id);
    return worldMessage("nav.unknown", this.d.locale, { target: this.d.locator.name(id), where: missed ? this.d.locator.regionName(missed) : "—" });
  }

  /**
   * Whoever moves a thing knows where they left it — and so does the actor they did it for, told by them (a delegated
   * fetch): their memory follows the thing (audit P1-8).
   */
  learnWhere(actorId: ActorId | null, ids: readonly EntityId[]): void {
    if (!ids.length) return;
    const placeOf = (id: EntityId): SeenPlace | null => {
      const p = this.d.locator.place(id);
      return p ? { level: p.level, x: p.position.x, y: p.position.y, z: p.position.z, rot: p.rot } : null;
    };
    this.witness(ids, actorId);
    if (!actorId) return;
    this.d.store.remember(actorId, ids, placeOf);
    const principal = this.principals.get(actorId);
    if (!principal) return;
    for (const id of ids) {
      const at = placeOf(id);
      if (at && !this.d.perception.perceives(this.d.store.actor(principal)!, id)) this.d.store.tell(principal, id, { ...at, toldBy: actorId });
      else if (at) this.d.store.remember(principal, [id], placeOf);
    }
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

  /**
   * Put a handheld item beside another placement at once (a scenario's initial conditions: the needle holder left
   * on the anaesthesia trolley, a swab outside the room). Nobody carries it; whoever held it no longer does.
   */
  placeItem(idOrAlias: EntityId, besideIdOrAlias: EntityId, opts: { concealed?: boolean; inside?: boolean } = {}): void {
    const id = this.resolve(idOrAlias);
    const beside = this.resolve(besideIdOrAlias);
    const e = id ? this.d.registry.entity(id) : null;
    if (!id || !e || e.kind !== "equipment" || e.portable !== "handheld") throw new Error(`placeItem: no handheld item "${idOrAlias}"`);
    const at = beside ? this.d.locator.place(beside) : null;
    if (!beside || !at) throw new Error(`placeItem: unknown placement "${besideIdOrAlias}"`);
    const holder = this.d.store.entity(id)?.heldBy;
    if (holder) {
      const a = this.d.store.actor(holder);
      if (a) this.d.store.setHolding(holder, a.holding.filter((h) => h !== id));
    }
    const spot = { x: at.position.x + 0.25, y: at.position.y, z: at.position.z + 0.25, level: at.level };
    const concealed = opts.inside ? beside : opts.concealed ? true : undefined;
    this.d.store.patchEntity(id, { heldBy: undefined, position: spot, concealed });
    // concealed first: nobody perceives where a hidden item went (`conceal.ts`)
    if (concealed) this.emit({ type: "entity.concealed", entityId: id, concealed: true, actorId: "scenario" });
    this.emit({ type: "entity.moved", entityId: id, to: { x: spot.x, y: spot.y, z: spot.z, level: spot.level }, actorId: "scenario" });
    this.invalidate({ level: spot.level, minX: spot.x - 1, maxX: spot.x + 1, minZ: spot.z - 1, maxZ: spot.z + 1 });
    this.d.mover?.placeEntity?.(id, concealed ? null : spot);
  }

  setAvailability(idOrAlias: EntityId, available: boolean): void {
    const id = this.resolve(idOrAlias);
    if (!id || this.d.registry.entity(id)?.kind !== "equipment") throw new Error(`setAvailability: unknown equipment "${idOrAlias}"`);
    if (this.d.store.available(id) === available) return;
    this.d.store.patchEntity(id, { available: available ? undefined : false });
    this.emit({ type: "entity.availability", entityId: id, available });
  }

  /** Move the patient at once (a transfer, a phase with a location; `cause` on the leg): see `transport.ts`. */
  relocatePatient(destination: PatientDestination, cause?: { phase: string } | { intervention: string }): PatientRelocation {
    return relocatePatient(this, destination, cause);
  }

  /**
   * A sensor pose moved this actor: a patient walking with them follows on their own path (`journey.ts`) — or, where
   * no one could have walked the move, stops where they last were and the walk together ends (`stopFollowing`).
   */
  followSensor(actorId: ActorId): void {
    const a = this.d.store.actor(actorId);
    const stopped = a ? followSensor(this, a) : null;
    if (stopped) stopFollowing(this, stopped);
  }

  /** The clinical posture may have changed the patient's body: re-stamp the grids (see `transport.ts`). */
  refreshPatient(): boolean {
    return refreshPatient(this);
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
    const principal = typeof request.onBehalfOf === "string" && request.onBehalfOf !== request.actorId && this.d.store.actor(request.onBehalfOf) ? request.onBehalfOf : null;
    if (principal) this.principals.set(request.actorId, principal);
    try {
      if (signal.aborted) return this.finish(request, { status: "cancelled", errorCode: "CANCELLED", message: worldMessage("CANCELLED", this.d.locale), events: [] }, t0);
      let outcome: Outcome;
      try {
        outcome = await this.dispatch(request, this.d.store.actor(request.actorId)!, signal);
      } catch (e) {
        outcome = failed("INVALID_REQUEST", worldMessage("INVALID_REQUEST", this.d.locale, { reason: `internal error: ${e instanceof Error ? e.message : String(e)}` }));
      }
      return this.finish(request, outcome, t0);
    } finally {
      if (principal) this.principals.delete(request.actorId);
    }
  }

  private async dispatch(request: WorldActionRequest, actor: ActorState, signal: AbortSignal): Promise<Outcome> {
    const { store, locale: L } = this.d;
    if (request.expectedWorldVersion !== undefined && request.expectedWorldVersion !== store.version) {
      return failed("STALE_STATE", worldMessage("STALE_WORLD", L, { expected: request.expectedWorldVersion, actual: store.version }));
    }
    let targetId: EntityId | undefined;
    if (request.targetId !== undefined) {
      const id = this.resolve(request.targetId);
      // a concealed item is not there for anyone until it is found (`conceal.ts`)
      if (!id || isConcealed(this, id)) return failed("TARGET_NOT_FOUND", navMessage("TARGET_NOT_FOUND", L, { target: request.targetId }));
      targetId = id;
      const v = store.entityVersion(id);
      if (request.expectedTargetVersion !== undefined && request.expectedTargetVersion !== v) {
        return failed("STALE_STATE", worldMessage("STALE_STATE", L, { target: this.d.locator.name(id), expected: request.expectedTargetVersion, actual: v }));
      }
    }
    if (request.operation === "search") {
      if (!permits(actor.role, "search")) return failed("NOT_AUTHORIZED", worldMessage("NOT_AUTHORIZED", L, { role: roleName(actor.role, L), target: targetId ? this.d.locator.name(targetId) : "—", operation: operationName("search", L) }));
      return search(this, request, actor, targetId);
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
      // operations by their names in the reader's language, never their ids (extra review item 3)
      const ops = rules.spec(targetId).operations.map((x) => rules.operationLabel(x));
      return failed("OPERATION_NOT_SUPPORTED", worldMessage("OPERATION_NOT_SUPPORTED", L, { target: locator.name(targetId), operation: operationName(request.operation, L), available: listText(ops, L) || "—" }));
    }
    // a movable thing the actor does not perceive: refused where it believes the thing is — before any check that reads
    // the thing's true place or state — with the way there (planned to the belief), or none when it is missing (P1-8)
    const unseen = this.d.perception.unperceived(actor, targetId, o);
    if (unseen) {
      const goal: NavGoal = { kind: "interact", id: targetId };
      const { plan } = unseen.belief.place ? this.planAs(actor, goal) : { plan: null };
      return failed("NOT_IN_RANGE", unseen.message, { hint: plan?.ok ? { goal, label: worldMessage("hint.approach", L, { target: locator.name(targetId) }) } : null });
    }
    const pre = rules.precheck(targetId, o, actor);
    if (pre) return failed(pre.code, pre.message, pre.goal ? { hint: this.verifyHint(actor, pre.goal, pre.label, pre.then) ?? null } : {});
    // an operation involving the device and the patient (a clinical effect, or placed by both): hint where every
    // placement rule holds — its own and the policy's — or fetch the cart; never alternating hints
    if (o.clinical || o.toolByParam || placesByBoth(o)) {
      const placement = operationPlacement(this, request, actor, targetId, o);
      if (placement) return placement;
    }
    const spatial = rules.spatial(targetId, o, actor);
    if (spatial) {
      // the goal that fixes it, when a route leads there; otherwise say why not
      if (!spatial.goal) return failed(spatial.code, spatial.message, { hint: null });
      const { plan } = this.planAs(actor, spatial.goal);
      if (!plan) return failed(spatial.code, spatial.message, { hint: null });
      if (plan.ok) return failed(spatial.code, spatial.message, { hint: { goal: spatial.goal, label: spatial.label ?? "" } });
      return failed(spatial.code, `${spatial.message} ${worldMessage("NO_ROUTE_HINT", L, { target: locator.name(targetId), reason: plan.code })}`, { hint: null });
    }
    if (o.effect === "transport") return transportPatient(this, request, actor, targetId, signal);
    if (o.effect === "escort" || o.effect === "release") return escortPatient(this, request, actor, targetId, o.effect === "escort");
    if (o.effect === "reposition") return repositionPatient(this, request, actor, targetId);
    if (o.effect === "hand-over") return handOver(this, request, actor, targetId, (x) => this.resolve(x));
    if (o.effect === "confirm-receipt") return confirmReceipt(this, request, actor, targetId);
    return runOperation(this, request, actor, targetId, o, signal);
  }

  private async navigate(request: WorldActionRequest, actor: ActorState, goal: NavGoal, signal: AbortSignal): Promise<Outcome> {
    const L = this.d.locale;
    // a goal at a concealed item leads nowhere (it is not there for anyone until it is found)
    const goalIds = (g: NavGoal): string[] => (g.kind === "any" ? g.goals.flatMap(goalIds) : "id" in g ? [g.id] : []);
    const hidden = goalIds(goal).find((id) => { const r = this.resolve(id); return !!r && isConcealed(this, r); });
    if (hidden) return failed("TARGET_NOT_FOUND", navMessage("TARGET_NOT_FOUND", L, { target: hidden }));
    const unplanned = (code: NavigationRecord["code"]) => ({ actionId: request.actionId, actorId: actor.id, goal, ok: false, ...(code ? { code } : {}), length: 0, replans: 0, travelSeconds: 0, arrivalError: 0, path: [] });
    // where the actor believes things are (EMBODIED §4, audit P1-8): a thing it knows to be missing leads nowhere
    const { plan, goal: usable, beliefs } = this.planAs(actor, goal);
    if (!plan || !usable) {
      const [id, b] = [...beliefs].find(([, x]) => x.kind === "missing")!;
      return failed("STALE_DESTINATION", this.unknownMessage(actor, id), { navigation: unplanned("STALE_DESTINATION"), hint: null, belief: { entityId: id, kind: "missing", room: b.room, found: "unknown" } });
    }
    if (!plan.ok) return failed(plan.code, plan.message, { navigation: unplanned(plan.code), hint: null });
    const walk = await this.walk(actor, plan, signal, request);
    const target = plan.targetEntity ? this.d.locator.name(plan.targetEntity) : "id" in goal ? goal.id : goal.kind === "point" ? `(${goal.x.toFixed(1)}, ${goal.z.toFixed(1)})` : goal.kind;
    const base = { events: walk.events, navigation: walk.record, elapsedSeconds: walk.travelSeconds };
    if (walk.interrupted) return { status: "cancelled", errorCode: "MOVEMENT_INTERRUPTED", message: worldMessage("ok.interrupted", L, { distance: metres(walk.walked) }), ...base };
    const stale = plan.targetEntity ? beliefs.get(plan.targetEntity) : undefined;
    if (stale?.place) return this.arrivedAtBelief(request, actor, usable, plan.targetEntity!, stale, walk, signal);
    const message = plan.path.length ? worldMessage("ok.arrived", L, { target, distance: metres(plan.length), seconds: Math.round(plan.travelSeconds) }) : worldMessage("ok.there", L, { target });
    return { status: "completed", message, ...base };
  }

  /**
   * The walk ended where the actor believed its target was, and it is not there (audit P1-8). In view from here (seen,
   * or noticed nearby): it is now known where it is, and the actor walks on to it. Otherwise the actor now knows it is
   * missing: `STALE_DESTINATION`, the walk kept — it has to look around or ask a colleague.
   */
  private async arrivedAtBelief(request: WorldActionRequest, actor: ActorState, goal: NavGoal, id: EntityId, b: StaleBelief, first: Walk, signal: AbortSignal): Promise<Outcome> {
    const { store, locator, perception, locale: L } = this.d;
    const now = store.actor(actor.id)!;
    const where = locator.regionName(b.place!);
    const target = locator.name(id);
    const belief = (found: "in-view" | "absent"): NonNullable<Outcome["belief"]> => ({ entityId: id, kind: b.kind, room: b.room, found });
    if (!perception.perceives(now, id)) {
      store.miss(actor.id, id, { level: b.place!.level, x: b.place!.x, z: b.place!.z, room: b.room, at: this.d.clinical.clock() });
      const told = b.kind === "told" ? store.lastSeen(actor.id, id)?.toldBy : undefined;
      const message = worldMessage(`nav.absent.${b.kind}`, L, { target, where, who: told ? locator.name(told) : "—" });
      return { status: "failed", errorCode: "STALE_DESTINATION", message, events: first.events, navigation: { ...first.record, ok: false, code: "STALE_DESTINATION" }, elapsedSeconds: first.travelSeconds, hint: null, belief: belief("absent") };
    }
    // seen from here: now known where it is — the walk goes on to it
    this.learnWhere(actor.id, [id]);
    const again = this.planAs(now, goal).plan;
    if (!again?.ok) {
      const code = again && !again.ok ? again.code : "STALE_DESTINATION";
      return { status: "failed", errorCode: code, message: `${worldMessage("nav.inView", L, { target, where })} ${again && !again.ok ? again.message : ""}`.trim(), events: first.events, navigation: { ...first.record, ok: false, code }, elapsedSeconds: first.travelSeconds, hint: null, belief: belief("in-view") };
    }
    const second = await this.walk(now, again, signal, request);
    const events = [...first.events, ...second.events];
    const navigation = { ...second.record, length: r2(first.record.length + second.record.length), replans: first.record.replans + second.record.replans, travelSeconds: r2(first.travelSeconds + second.travelSeconds), path: [...first.record.path, ...second.record.path] };
    const base = { events, navigation, elapsedSeconds: first.travelSeconds + second.travelSeconds, belief: belief("in-view") };
    if (second.interrupted) return { status: "cancelled", errorCode: "MOVEMENT_INTERRUPTED", message: worldMessage("ok.interrupted", L, { distance: metres(first.walked + second.walked) }), ...base };
    const arrived = worldMessage("ok.arrived", L, { target, distance: metres(first.walked + second.walked), seconds: Math.round(first.travelSeconds + second.travelSeconds) });
    return { status: "completed", message: `${worldMessage("nav.inView", L, { target, where })} ${arrived}`, ...base };
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
    // a patient walking with this actor walks too, on their own path (P2-11) — unless this walk is their transport
    const follower = this.transit?.by !== actor.id ? followWalkStart(this, actor) : null;
    if (follower) events.push(...follower);
    let moved: { arrived: boolean; pose: Pose; replans: number };
    try {
      moved = await mover.move(actor.id, plan, signal);
    } catch {
      moved = { arrived: false, pose: { ...store.actor(actor.id)!.pose }, replans: 0 };
    }
    const interrupted = signal.aborted || !moved.arrived;
    const pose = this.validPose(moved.pose) ? { ...moved.pose } : from;
    // an interrupted walk: the flat distance walked plus the rides completed (never a share of a ride not taken)
    const got = interrupted ? progressAlong(from, plan, pose, this.connectors, (level) => levelElevation(this.d.facility, level)) : null;
    const walked = got ? Math.min(got.flat + got.climb, plan.length) : plan.length;
    const travelSeconds = plan.length > 0 ? (got ? Math.min(got.flat / WALK_SPEED + got.rideSeconds, plan.travelSeconds) : plan.travelSeconds) : 0;
    if (!samePose(from, pose)) {
      const { roomChanged, room } = store.setActorPose(actor.id, pose);
      events.push(this.emit({ type: "actor.moved", actorId: actor.id, from, to: { ...pose }, distance: r2(walked), travelSeconds: r2(travelSeconds) }));
      if (roomChanged) events.push(this.emit({ type: "actor.entered-room", actorId: actor.id, room, level: pose.level }));
    }
    const discovered = perception.notice(store.actor(actor.id)!);
    if (discovered.length) events.push(this.emit({ type: "actor.discovered", actorId: actor.id, entities: discovered }));
    // whoever sees the walker where it arrived knows it is there (and what it carries)
    if (!samePose(from, pose)) this.witness([actor.id, ...store.actor(actor.id)!.holding], actor.id);
    if (follower) events.push(...followWalkEnd(this, from, plan.path, interrupted));
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
    if (o.moved) result.moved = o.moved;
    if (o.belief) result.belief = o.belief;
    if (o.receipt) result.receipt = o.receipt;
    if (actionId && record) {
      const done = this.emit({ type: "action.completed", actionId, actorId: typeof request.actorId === "string" ? request.actorId : "", operation: typeof request.operation === "string" ? request.operation : "", status: o.status, ...(o.errorCode ? { errorCode: o.errorCode } : {}) });
      result.events.push(done);
      store.recordResult(result);
    }
    if (this.d.trace && actionId && record) recordActionSpans(this.d.trace, targetId ? { ...request, targetId } : request, result, { startedAt: t0.startedAt, endedAt: this.d.now(), clockStart: t0.clockStart, clockEnd: this.d.clinical.clock() });
    return result;
  }
}
