/**
 * `createWorldRuntime` — one world per encounter (EMBODIED §2): the static
 * layer (collision model with the bound patient's body, semantic registry,
 * occlusion, navigation) built once from the facility, the catalogs and the
 * binding; the physical layer (`WorldStateStore`, restored from
 * `options.snapshot` when resuming); and the services on top — the device
 * rules, the spatial policy and checker, perception, and the action bus.
 *
 * Every state-changing call goes through the action bus or a scenario
 * control; `updatePose` is a sensor update (the actor's own version only) — what the body sees from its new pose is
 * remembered, as a walk's arrival is (audit P1-8: memory only, the same for the same poses).
 * Read-only calls never change a version (perception records memory; see
 * `perception.ts`). `entity()` / `entities()` are the static registry
 * (positions at build time): use `observe` / `inspect` for where things are now.
 */
import { NEARBY_STATE_RANGE } from "@clinicalcraft/core";
import { ActionBus, goalProblem, instantMover } from "./actions.js";
import { DeviceRules } from "./behaviors.js";
import { buildCollisionModel } from "./collision.js";
import { DEFAULT_PERCEPTION, type ActorId, type ActorState, type BodyPosture, type ClinicalIntent, type EntityId, type NavGoal, type NavPlan, type Pose, type SpatialCheck, type WorldDynamics, type WorldJourney, type WorldRuntime, type WorldRuntimeOptions } from "./contracts.js";
import { navMessage, worldMessage } from "./i18n.js";
import { levelInfos } from "./levels.js";
import { WorldLocator } from "./locate.js";
import { receiptsOf, receiptsToConfirm } from "./hand.js";
import { GridAStarBackend } from "./nav/backend.js";
import { PatientBody } from "./patient.js";
import { Perception } from "./perception.js";
import { DefaultSpatialPolicy, SpatialChecker } from "./policy.js";
import { Reachability } from "./reach.js";
import { bindingPosture, buildRegistry } from "./registry.js";
import { screenPatient } from "./screen-source.js";
import { WorldStateStore, type WhereaboutsChange } from "./state.js";
import { VisibilityModel } from "./visibility.js";

const copyActor = (a: ActorState): ActorState => {
  const out: ActorState = { ...a, pose: { ...a.pose }, task: a.task ? { ...a.task } : null, holding: [...a.holding], seen: [...a.seen] };
  if (a.lastSeen) out.lastSeen = Object.fromEntries(Object.entries(a.lastSeen).map(([id, p]) => [id, { ...p }]));
  if (a.missed) out.missed = Object.fromEntries(Object.entries(a.missed).map(([id, p]) => [id, { ...p }]));
  return out;
};

/** A body steered by hand looks around again once it has moved this far (m) since it last did, or entered a room. */
const NOTICE_STEP = 1;
/** …or turned this far (radians, about 30°). */
const NOTICE_TURN = Math.PI / 6;

/** Build the world of one encounter (see module docs). */
export function createWorldRuntime(options: WorldRuntimeOptions): WorldRuntime {
  const { facility, catalogs, binding, clinical } = options;
  const locale = binding.locale;
  const slot = binding.slotId ? facility.patientSlots.find((s) => s.id === binding.slotId) : undefined;
  const collision = buildCollisionModel(facility, catalogs, { patients: slot ? [{ slotId: slot.id, posture: bindingPosture(binding, facility) }] : [] });
  const registry = buildRegistry(facility, catalogs, binding, collision);
  // what an actor knows of where things are changed in a way a search turns on (EMBODIED §4, audit P1-8): the trace
  // records it — the absence learned on arrival, a missing thing seen again, being told where it is
  const onWhereabouts = (c: WhereaboutsChange) => {
    const at = options.now();
    const clock = clinical.clock();
    const room = registry.roomAt(c.place.level, c.place.x, c.place.z);
    options.trace?.add({ parentId: null, kind: "observation", name: "whereabouts", actorId: c.actorId, startedAt: at, endedAt: at, clockStart: clock, clockEnd: clock, worldVersion: store.version, ok: true, refs: { entities: [c.entityId, ...(c.by ? [c.by] : [])] }, data: { change: c.change, room, ...(c.by ? { by: c.by } : {}) } });
  };
  const store = new WorldStateStore({ facility, registry, newId: options.newId, spawn: options.spawn, snapshot: options.snapshot, onWhereabouts });
  /** The transport the snapshot was taken in the middle of, until the session takes it (`restoredJourney`). */
  let restored: WorldJourney | null = options.snapshot?.journey ? structuredClone(options.snapshot.journey) : null;
  const rotOf = (id: string) => registry.entity(id)?.rot ?? 0;
  // the patient's body (EMBODIED §8): where it is now, its posture (the place's, else clinical state's), its collider
  const staticBody = slot ? collision.colliders.find((c) => c.id === `patient:${slot.id}`) : undefined;
  const patient = new PatientBody({
    facility,
    registry,
    state: store,
    slot: slot ?? null,
    clinicalPosture: () => (slot ? (clinical.cues(slot.id).posture as BodyPosture | undefined) : undefined),
    initialPosture: bindingPosture(binding, facility),
    staticBody: staticBody ? { minX: staticBody.minX, maxX: staticBody.maxX, minZ: staticBody.minZ, maxZ: staticBody.maxZ } : null,
    locale,
    // walking with someone (`escort_patient`): at that actor's side, on their side of any wall
    actorPose: (id) => store.actor(id)?.pose ?? null,
    clear: (level, a, b) => visibility.lineOfSight(level, a, b),
    cues: () => (slot ? clinical.cues(slot.id) : {}),
  });
  // the grids and the occlusion read the physical state (doors, obstacles, moved carts and beds, carried items, the patient's body) as they are built
  const dynamics: WorldDynamics = {
    doorState: (id) => store.doorState(id),
    obstacles: () => store.obstacles(),
    displaced: () => store.displaced(),
    removed: () => [...store.removed(), ...patient.removed()],
    actorPose: (id) => store.actorPose(id),
    bodies: () => patient.bodies(),
    placeOf: (id) => {
      if (id !== patient.id) return null;
      const p = patient.place();
      return p ? { level: p.level, x: p.x, z: p.z, footprint: { w: p.footprint.w, d: p.footprint.d } } : null;
    },
  };
  const visibility = new VisibilityModel(facility, collision, { dynamics, rotOf });
  const backend = options.backend ?? new GridAStarBackend({ facility, collision, registry, visibility, dynamics, locale, clock: options.now });
  const grids = backend instanceof GridAStarBackend ? backend.grids : null;
  const locator = new WorldLocator(facility, registry, store, visibility, locale, slot?.id ?? null, grids, patient);
  const perceptionOptions = { ...DEFAULT_PERCEPTION, ...(options.perception ?? {}) };
  let bus: ActionBus | null = null;
  const rules = new DeviceRules({ store, locator, clinical, collision, locale, busy: (id) => bus?.busy.get(id) ?? null });
  const reach = new Reachability(grids, locator);
  const policy = options.policy ?? new DefaultSpatialPolicy();
  // hints are ranked where the actor would walk: to where it believes a movable thing is (audit P1-8)
  const believed = (actor: ActorState, id: EntityId) => {
    const b = perception.belief(actor, id);
    if (!b) return undefined;
    return b.place ? locator.placedAt(id, b.place) : null;
  };
  const checker = new SpatialChecker({ locator, state: store, reach, policy, binding, locale, clinical, busy: (id) => bus?.busy.get(id) ?? null, believed });
  const perception = new Perception({ store, locator, rules, reach, clinical, collision, locale, options: perceptionOptions, newId: options.newId });
  const mover = options.mover ?? instantMover((id) => store.actor(id)?.pose ?? null);
  bus = new ActionBus({ facility, caseDef: binding.caseDef, store, registry, locator, patient, rules, checker, perception, reach, backend, grids, visibility, collision, clinical, port: options.port, mover, locale, now: options.now, trace: options.trace });
  const actions = bus;
  const levels = levelInfos(facility);
  // where each hand-steered body last looked around (`updatePose`)
  const lookedFrom = new Map<ActorId, Pose>();
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
    nearby(aroundId, type, within = NEARBY_STATE_RANGE) {
      const place = locator.place(aroundId);
      return place ? rules.nearbyOfType(place, type, within).map((id) => ({ id, state: rules.state(id), states: rules.states(id) })) : [];
    },
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
      // what a body steered by hand sees is remembered (audit P1-8), as a walk's arrival is: on entering a room, after a
      // metre or a turn since it last looked — memory only (no version), the same for the same poses
      const last = lookedFrom.get(actorId);
      const turned = last ? Math.abs(Math.atan2(Math.sin(pose.yaw - last.yaw), Math.cos(pose.yaw - last.yaw))) : Infinity;
      if (roomChanged || !last || last.level !== pose.level || Math.hypot(pose.x - last.x, pose.z - last.z) >= NOTICE_STEP || turned >= NOTICE_TURN) {
        lookedFrom.set(actorId, { ...pose });
        const now = store.actor(actorId);
        if (now) perception.notice(now);
      }
      // a patient walking with this actor follows on their own path (EMBODIED §8.4, audit P2-11)
      actions.followSensor(actorId);
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
    regionName: (at, locale) => locator.regionName(at, locale),
    whereabouts(actorId, id) {
      const resolved = actions.resolve(id);
      return resolved && store.actor(actorId) ? perception.whereabouts(actorId, resolved) : null;
    },
    askWhereabouts(askerId, id, colleagueId) {
      const resolved = actions.resolve(id);
      const colleague = colleagueId ? actions.resolve(colleagueId) : null;
      if (!resolved || !store.actor(askerId) || (colleagueId && (!colleague || !store.actor(colleague)))) return { answeredBy: null, whereabouts: null, asked: [], updated: false, message: navMessage("TARGET_NOT_FOUND", locale, { target: !resolved ? id : (colleagueId ?? askerId) }) };
      const startedAt = options.now();
      const clock = clinical.clock();
      const { tell, ...answer } = perception.ask(askerId, resolved, colleague ?? undefined);
      // the inquiry in the trace (audit P1-8): whom it asked, who knew — then the update of what the asker believes
      const w = answer.whereabouts;
      options.trace?.add({ parentId: null, kind: "observation", name: "ask_whereabouts", actorId: askerId, startedAt, endedAt: options.now(), clockStart: clock, clockEnd: clinical.clock(), worldVersion: store.version, ok: answer.answeredBy !== null, refs: { entities: [resolved, ...answer.asked] }, data: { answeredBy: answer.answeredBy, kind: w?.kind ?? null, room: w?.room ?? null, updated: answer.updated } });
      if (tell) store.tell(askerId, resolved, tell);
      return answer;
    },
    canSee(actorId, id) {
      const resolved = actions.resolve(id);
      return !!resolved && perception.canSee(actorId, resolved);
    },
    receipts(id) {
      if (id !== undefined) {
        const resolved = actions.resolve(id);
        return resolved ? receiptsOf(store, resolved) : [];
      }
      // by minute, then item; one item's receipts keep their order (oldest first; the sort is stable)
      const all = registry.ofKind("equipment").flatMap((e) => receiptsOf(store, e.id));
      return all.sort((x, y) => x.at - y.at || (x.item < y.item ? -1 : x.item > y.item ? 1 : 0));
    },
    receiptsToConfirm: (actorId) => receiptsToConfirm(store, actorId),

    plan(actorId: ActorId, goal: NavGoal): NavPlan {
      const a = store.actor(actorId);
      if (!a) return { ok: false, goal, code: "TARGET_NOT_FOUND", message: `unknown actor "${actorId}"` };
      // the cost bound of every planning request (EMBODIED §7): a malformed or oversized goal is refused unplanned
      const problem = goalProblem(goal);
      if (problem) return { ok: false, goal, code: "TARGET_NOT_FOUND", message: worldMessage("INVALID_REQUEST", locale, { reason: problem }), details: { reason: "invalid-goal", problem } };
      // as the actor's navigation would plan it: to where it believes things are (audit P1-8)
      const { plan, beliefs } = actions.planAs(a, goal);
      if (plan) return plan;
      const missing = [...beliefs].find(([, b]) => b.kind === "missing")?.[0] ?? "—";
      return { ok: false, goal, code: "STALE_DESTINATION", message: worldMessage("nav.unknown", locale, { target: locator.name(missing), where: (() => { const m = store.missed(actorId, missing); return m ? locator.regionName(m) : "—"; })() }), details: { reason: "missing", entity: missing } };
    },

    recordBound: (id: EntityId) => rules.recordBound(id),
    roomOf: (id: EntityId) => locator.place(id)?.room ?? null,
    checkSpatial(actorId: ActorId, intent: ClinicalIntent, opts?: { recheck?: boolean }): SpatialCheck {
      const base = checker.check(actorId, intent, opts);
      // a checklist step's team prerequisites (the WHO board's count before a Time Out) hold on every path to it
      const actor = store.actor(actorId);
      if (!base.ok || intent.kind !== "intervene" || !intent.interventionId || !actor) return base;
      const fail = rules.checklistPrerequisite(intent.interventionId, actor);
      if (!fail) return base;
      return {
        ok: false,
        code: opts?.recheck ? "SPATIAL_PRECONDITION_CHANGED" : "SPATIAL_REQUIREMENT_UNMET",
        requirement: base.requirement,
        reason: "checklist-prerequisite",
        message: fail.message,
        hint: fail.goal ? { goal: fail.goal, label: fail.label ?? "", ...(fail.then ? { then: fail.then } : {}) } : null,
        details: { board: rules.checklistOperation(intent.interventionId)?.id ?? null, code: fail.code },
      };
    },
    atBedside(id: EntityId) {
      const resolved = actions.resolve(id);
      const p = resolved ? locator.place(resolved) : null;
      return !!p && locator.atBedside(p);
    },
    provides: (id: EntityId) => {
      const resolved = actions.resolve(id);
      return resolved ? locator.capabilities(resolved) : [];
    },
    stateOf: (id: EntityId) => {
      const resolved = actions.resolve(id);
      return resolved ? rules.state(resolved) : null;
    },
    bedsideProviders: (capability: string) =>
      registry
        .ofKind("equipment")
        .filter((e) => locator.capabilities(e.id).includes(capability) && locator.atBedside(locator.place(e.id)!))
        .map((e) => e.id),

    patientPlace: () => {
      const p = patient.place();
      return p && actions.transit ? { ...p, transit: { ...actions.transit } } : p;
    },
    patientMonitor: () => locator.patientMonitor(),
    screenInView(actorId: ActorId) {
      const a = store.actor(actorId);
      const id = locator.patientMonitor();
      const m = id && store.available(id) ? locator.place(id) : null;
      return a && m && locator.screenInView(a, m) ? m.id : null;
    },
    screenPatient(id: EntityId) {
      const resolved = actions.resolve(id);
      return resolved ? screenPatient({ locator, rules }, resolved) : null;
    },
    relocatePatient: (destination, cause) => actions.relocatePatient(destination, cause),
    refreshPatient: () => actions.refreshPatient(),

    execute: (request, signal) => actions.execute(request, signal),
    feedback: (actionId) => actions.feedback(actionId),
    cancel: (actorId) => actions.cancel(actorId),

    setObstacle: (o, present) => actions.setObstacle(o, present),
    setAvailability: (id, available) => actions.setAvailability(id, available),
    placeItem: (id, beside, opts) => actions.placeItem(id, beside, opts),
    setDoor: (id, state) => actions.setDoor(id, state),

    subscribe: (listener) => store.subscribe(listener),
    // a transport walking now goes into the snapshot with its destination (a resumed session carries it out)
    snapshot: () => (actions.journey ? { ...store.snapshot(), journey: structuredClone(actions.journey) } : store.snapshot()),
    roomAt: (at) => registry.roomAt(at.level, at.x, at.z),
    restoredJourney: () => {
      const j = restored;
      restored = null;
      return j;
    },
  };
}
