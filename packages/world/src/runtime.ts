/**
 * `createWorldRuntime` — one world per encounter (EMBODIED §2): the static
 * layer (collision model with the bound patient's body, semantic registry,
 * occlusion, navigation) built once from the facility, the catalogs and the
 * binding; the physical layer (`WorldStateStore`, restored from
 * `options.snapshot` when resuming); and the services on top — the device
 * rules, the spatial policy and checker, perception, and the action bus.
 *
 * Every state-changing call goes through the action bus or a scenario
 * control; `updatePose` is a sensor update (the actor's own version only).
 * Read-only calls never change a version (perception records memory; see
 * `perception.ts`). `entity()` / `entities()` are the static registry
 * (positions at build time): use `observe` / `inspect` for where things are now.
 */
import { ActionBus, goalProblem, instantMover } from "./actions.js";
import { DeviceRules } from "./behaviors.js";
import { buildCollisionModel } from "./collision.js";
import { DEFAULT_PERCEPTION, type ActorId, type ActorState, type ClinicalIntent, type EntityId, type NavGoal, type NavPlan, type Pose, type WorldRuntime, type WorldRuntimeOptions } from "./contracts.js";
import { worldMessage } from "./i18n.js";
import { levelInfos } from "./levels.js";
import { WorldLocator } from "./locate.js";
import { GridAStarBackend } from "./nav/backend.js";
import { Perception } from "./perception.js";
import { DefaultSpatialPolicy, SpatialChecker } from "./policy.js";
import { Reachability } from "./reach.js";
import { bindingPosture, buildRegistry } from "./registry.js";
import { WorldStateStore } from "./state.js";
import { VisibilityModel } from "./visibility.js";

const copyActor = (a: ActorState): ActorState => ({ ...a, pose: { ...a.pose }, task: a.task ? { ...a.task } : null, holding: [...a.holding], seen: [...a.seen] });

/** Build the world of one encounter (see module docs). */
export function createWorldRuntime(options: WorldRuntimeOptions): WorldRuntime {
  const { facility, catalogs, binding, clinical } = options;
  const locale = binding.locale;
  const slot = binding.slotId ? facility.patientSlots.find((s) => s.id === binding.slotId) : undefined;
  const collision = buildCollisionModel(facility, catalogs, { patients: slot ? [{ slotId: slot.id, posture: bindingPosture(binding, facility) }] : [] });
  const registry = buildRegistry(facility, catalogs, binding, collision);
  const store = new WorldStateStore({ facility, registry, newId: options.newId, spawn: options.spawn, snapshot: options.snapshot });
  const rotOf = (id: string) => registry.entity(id)?.rot ?? 0;
  // the grids and the occlusion read the store (doors, obstacles, moved carts, carried items) as they are built
  const visibility = new VisibilityModel(facility, collision, { dynamics: store, rotOf });
  const backend = options.backend ?? new GridAStarBackend({ facility, collision, registry, visibility, dynamics: store, locale, clock: options.now });
  const grids = backend instanceof GridAStarBackend ? backend.grids : null;
  const locator = new WorldLocator(facility, registry, store, visibility, locale, slot?.id ?? null, grids);
  const perceptionOptions = { ...DEFAULT_PERCEPTION, ...(options.perception ?? {}) };
  let bus: ActionBus | null = null;
  const rules = new DeviceRules({ store, locator, clinical, collision, locale, busy: (id) => bus?.busy.get(id) ?? null });
  const reach = new Reachability(grids, locator);
  const policy = options.policy ?? new DefaultSpatialPolicy();
  const checker = new SpatialChecker({ locator, state: store, reach, policy, binding, locale, clinical, busy: (id) => bus?.busy.get(id) ?? null });
  const perception = new Perception({ store, locator, rules, reach, clinical, collision, locale, options: perceptionOptions, newId: options.newId });
  const mover = options.mover ?? instantMover((id) => store.actor(id)?.pose ?? null);
  bus = new ActionBus({ facility, caseDef: binding.caseDef, store, registry, locator, rules, checker, perception, reach, backend, grids, visibility, collision, clinical, port: options.port, mover, locale, now: options.now, trace: options.trace });
  const actions = bus;
  const levels = levelInfos(facility);
  const traceRead = (name: string, actorId: ActorId, entities: string[], fn: () => void) => {
    const startedAt = options.now();
    const clockStart = clinical.clock();
    fn();
    options.trace?.add({ parentId: null, kind: "observation", name, actorId, startedAt, endedAt: options.now(), clockStart, clockEnd: clinical.clock(), worldVersion: store.version, ok: true, refs: entities.length ? { entities } : {} });
  };

  return {
    facility,
    levels,
    collision,
    get version() {
      return store.version;
    },

    entity: (id) => registry.entity(id),
    entities: () => [...registry.entities],
    resolveId: (alias) => actions.resolve(alias),

    actor(id) {
      const a = store.actor(id);
      return a ? copyActor(a) : null;
    },
    actors: () => store.actors().map(copyActor),
    updatePose(actorId: ActorId, pose: Pose) {
      const a = store.actor(actorId);
      if (!a || ![pose?.x, pose?.y, pose?.z, pose?.yaw, pose?.pitch].every(Number.isFinite) || !levels.some((l) => l.id === pose.level)) return;
      const { roomChanged, room } = store.sensorPose(actorId, pose);
      if (roomChanged) store.emit({ type: "actor.entered-room", actorId, room, level: pose.level });
    },

    observe(actorId, opts) {
      let out!: ReturnType<WorldRuntime["observe"]>;
      traceRead("observe", actorId, [], () => (out = perception.observe(actorId, opts)));
      return out;
    },
    find(actorId, query) {
      let out!: ReturnType<WorldRuntime["find"]>;
      traceRead("find", actorId, [], () => (out = perception.find(actorId, query)));
      return out;
    },
    inspect(actorId, id) {
      const resolved = actions.resolve(id);
      let out: ReturnType<WorldRuntime["inspect"]> = null;
      traceRead("inspect", actorId, resolved ? [resolved] : [], () => (out = resolved ? perception.inspect(actorId, resolved) : null));
      return out;
    },
    roomInfo: (actorId, roomId) => perception.roomInfo(actorId, roomId),
    canSee(actorId, id) {
      const resolved = actions.resolve(id);
      return !!resolved && perception.canSee(actorId, resolved);
    },

    plan(actorId: ActorId, goal: NavGoal): NavPlan {
      const a = store.actor(actorId);
      if (!a) return { ok: false, goal, code: "TARGET_NOT_FOUND", message: `unknown actor "${actorId}"` };
      // the cost bound of every planning request (EMBODIED §7): a malformed or oversized goal is refused unplanned
      const problem = goalProblem(goal);
      if (problem) return { ok: false, goal, code: "TARGET_NOT_FOUND", message: worldMessage("INVALID_REQUEST", locale, { reason: problem }), details: { reason: "invalid-goal", problem } };
      return backend.plan({ actorId, from: a.pose, goal, role: a.role });
    },

    checkSpatial: (actorId: ActorId, intent: ClinicalIntent, opts?: { recheck?: boolean }) => checker.check(actorId, intent, opts),
    atBedside(id: EntityId) {
      const resolved = actions.resolve(id);
      const p = resolved ? locator.place(resolved) : null;
      return !!p && locator.atBedside(p);
    },
    bedsideProviders: (capability: string) =>
      registry
        .ofKind("equipment")
        .filter((e) => locator.capabilities(e.id).includes(capability) && locator.atBedside(locator.place(e.id)!))
        .map((e) => e.id),

    execute: (request, signal) => actions.execute(request, signal),
    feedback: (actionId) => actions.feedback(actionId),
    cancel: (actorId) => actions.cancel(actorId),

    setObstacle: (o, present) => actions.setObstacle(o, present),
    setAvailability: (id, available) => actions.setAvailability(id, available),
    setDoor: (id, state) => actions.setDoor(id, state),

    subscribe: (listener) => store.subscribe(listener),
    snapshot: () => store.snapshot(),
  };
}
