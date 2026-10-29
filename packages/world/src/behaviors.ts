/**
 * Device behaviours (EMBODIED §5, §8, R6): what an entity offers, in which
 * state, to whom, and under which conditions.
 *
 * Built-in behaviours by interaction kind (used when the equipment type
 * declares no `behavior`; a declarative catalog behaviour replaces them):
 *
 * | kind        | states (source)                         | operations |
 * |-------------|-----------------------------------------|------------|
 * | workstation | —                                       | `order` (clinical `order_test`, item from parameter `investigation`, which the station must provide: requires ⊆ capabilities), `read` (`read_result`, same rule; optional `phase`) |
 * | monitor     | attached / detached (derived from the engine: `monitorAttached`, on the patient's monitor only) | `attach` (detached → attached; device at the bedside, actor within 1.5 m of the patient; clinical `intervene` of the case's monitoring intervention; 60 s), `read` (attached; within the 6 m screen range with line of sight: the screen as `check_vitals` shows it), `cycle_nibp` (attached; within 1.5 m; physical, 45 s) |
 * | device      | —                                       | `use` (parameter `investigation` → `order_test`, or `intervention` → `intervene`; the item's requires must intersect the device's capabilities, as the web device panel) |
 * | door        | open / closed / locked (door state)     | `open` (closed → open), `close` (open → closed; nobody in the doorway), `lock` (closed → locked), `unlock` (locked → closed); lock/unlock are `secure` operations (authority) |
 * | sink        | —                                       | `wash_hands` (hand hygiene valid for 30 simulated minutes; 30 s) |
 * | storage     | closed / open (stored, initial closed)  | `open`, `close` |
 * | bed, board, atlas, craft, none, talk | —              | none (conversation and panels are clinical tools / UI) |
 *
 * Portable equipment adds, whatever its behaviour: carts `move_to` (wheel it
 * to a goal; the actor walks, the cart is parked next to them), handheld
 * items `pick_up` / `put_down` / `equip` (at most `MAX_HELD` in hand).
 *
 * Built-in effects attach by operation name to catalog behaviours too: a
 * monitor's `read` shows the screen. Predicates: `actorWithin` /
 * `patientWithin` are actor-placement predicates (checked in the spatial
 * phase: NOT_IN_RANGE / NOT_VISIBLE with a navigation hint); `state`,
 * `role`, `handsClean`, `actorHolding` and `deviceAtBedside` are
 * preconditions (PRECONDITION_FAILED). Ranges are measured from the
 * footprint and never below `MIN_RANGE`; an operation without
 * `actorWithin` / `patientWithin` must be done within the entity's reach.
 */
import { monitorAttached, type ClinicalEffect, type LocalizedText } from "@clinicalcraft/core";
import { permits, rolesFor, operationClass } from "./authority.js";
import { MAX_HELD, RANGES, type ActionHint, type ActorRole, type ActorState, type ClinicalView, type CollisionModel, type EntityId, type InteractionKind, type NavGoal, type SemanticEntity, type WorldErrorCode, type WorldPredicate } from "./contracts.js";
import { listText, metres, operationName, roleName, stateName, worldMessage } from "./i18n.js";
import { escortProblem } from "./escort.js";
import type { Placed, WorldLocator } from "./locate.js";
import { MIN_RANGE } from "./nav/backend.js";
import type { WorldStateStore } from "./state.js";

/** Built-in effects of operations (beyond a declarative state transition). */
export type BuiltinEffect = "door-open" | "door-close" | "door-lock" | "door-unlock" | "wash-hands" | "monitor-read" | "move-to" | "pick-up" | "put-down" | "equip" | "transport" | "escort" | "release";

/** One operation an entity offers (built-in or from the catalog). */
export interface OperationSpec {
  id: string;
  /** Own name (catalog); built-ins use `OPERATION_NAMES`. */
  name?: LocalizedText;
  from: readonly string[] | "*";
  to?: string;
  requires: readonly WorldPredicate[];
  clinical?: ClinicalEffect;
  /** `use`: the tool follows the parameter (`investigation` → order_test, `intervention` → intervene). */
  toolByParam?: boolean;
  durationSeconds: number;
  reserve: boolean;
  release: boolean;
  roles?: readonly ActorRole[];
  effect?: BuiltinEffect;
  source: "builtin" | "catalog";
}

/** The behaviour of one entity. */
export interface BehaviorSpec {
  /** Where the state comes from: stored in the world, the door record, derived from the engine, or none. */
  stateSource: "stored" | "door" | "derived" | "none";
  initial: string | null;
  states: Record<string, { name?: LocalizedText; available?: boolean }>;
  derived?: "monitor-attachment";
  operations: OperationSpec[];
}

/** Hand hygiene validity (simulated minutes) after `wash_hands`. */
export const HAND_HYGIENE_MINUTES = 30;

const op = (id: string, o: Partial<OperationSpec> = {}): OperationSpec => ({ id, from: "*", requires: [], durationSeconds: 0, reserve: false, release: false, source: "builtin", ...o });

/** Built-in behaviours by interaction kind (see the module table). */
export const BUILTIN_BEHAVIORS: Readonly<Partial<Record<InteractionKind, BehaviorSpec>>> = {
  workstation: {
    stateSource: "none",
    initial: null,
    states: {},
    operations: [op("order", { clinical: { tool: "order_test", select: "param" } }), op("read", { clinical: { tool: "read_result", select: "param" } })],
  },
  monitor: {
    stateSource: "derived",
    derived: "monitor-attachment",
    initial: "detached",
    states: { detached: {}, attached: {} },
    operations: [
      op("attach", { from: ["detached"], to: "attached", requires: [{ deviceAtBedside: true }, { patientWithin: RANGES.contact }], clinical: { tool: "intervene", select: "monitoring" }, durationSeconds: 60 }),
      op("read", { from: ["attached"], requires: [{ actorWithin: RANGES.screen }], effect: "monitor-read" }),
      op("cycle_nibp", { from: ["attached"], requires: [{ actorWithin: RANGES.contact }], durationSeconds: 45 }),
    ],
  },
  device: {
    stateSource: "none",
    initial: null,
    states: {},
    operations: [op("use", { clinical: { tool: "order_test", select: "param" }, toolByParam: true })],
  },
  door: {
    stateSource: "door",
    initial: "closed",
    states: { open: {}, closed: {}, locked: {} },
    operations: [
      op("open", { from: ["closed"], to: "open", effect: "door-open" }),
      op("close", { from: ["open"], to: "closed", effect: "door-close" }),
      op("lock", { from: ["closed"], to: "locked", effect: "door-lock" }),
      op("unlock", { from: ["locked"], to: "closed", effect: "door-unlock" }),
    ],
  },
  sink: { stateSource: "none", initial: null, states: {}, operations: [op("wash_hands", { effect: "wash-hands", durationSeconds: 30 })] },
  storage: {
    stateSource: "stored",
    initial: "closed",
    states: { closed: {}, open: {} },
    operations: [op("open", { from: ["closed"], to: "open" }), op("close", { from: ["open"], to: "closed" })],
  },
};

const NO_BEHAVIOR: BehaviorSpec = { stateSource: "none", initial: null, states: {}, operations: [] };

/** Roles that wheel a patient (`transport_patient`): the clinical team and porters — never the front desk or a lab. */
export const TRANSPORT_ROLES: readonly ActorRole[] = ["clinician", "attending", "nurse", "paramedic", "porter"];

/**
 * The patient (EMBODIED §8, patient transport): `transport_patient {destination}` — wheel the bed (or walk
 * the patient) to a provider, a bed space or back home; from the patient's side (physical class, narrowed to
 * `TRANSPORT_ROLES`). `escort_patient` — the patient gets up and walks with the actor wherever they go — and
 * `release_patient` — they wait where they are — are asked from conversation range (`escort.ts`).
 */
export const PATIENT_BEHAVIOR: BehaviorSpec = {
  stateSource: "none",
  initial: null,
  states: {},
  operations: [
    op("transport_patient", { effect: "transport", requires: [{ patientWithin: RANGES.contact }], roles: TRANSPORT_ROLES }),
    op("escort_patient", { effect: "escort", requires: [{ patientWithin: RANGES.talk }], roles: TRANSPORT_ROLES }),
    op("release_patient", { effect: "release", requires: [{ patientWithin: RANGES.talk }], roles: TRANSPORT_ROLES }),
  ],
};

/** Built-in effects that attach by operation name, per interaction kind (catalog behaviours included). */
const NAMED_EFFECTS: Partial<Record<InteractionKind, Record<string, BuiltinEffect>>> = {
  monitor: { read: "monitor-read" },
  sink: { wash_hands: "wash-hands" },
};

const cache = new WeakMap<object, BehaviorSpec>();

/** The behaviour of an entity: its catalog behaviour, else the built-in one of its kind, plus portability operations. */
export function behaviorOf(e: SemanticEntity): BehaviorSpec {
  if (e.kind === "door") return BUILTIN_BEHAVIORS.door!;
  if (e.kind === "patient") return PATIENT_BEHAVIOR;
  if (e.kind !== "equipment" || !e.equipmentType) return NO_BEHAVIOR;
  const type = e.equipmentType;
  const hit = cache.get(type);
  if (hit) return hit;
  let spec: BehaviorSpec;
  const b = type.behavior;
  if (b) {
    const named = NAMED_EFFECTS[e.interaction] ?? {};
    spec = {
      stateSource: b.derived ? "derived" : "stored",
      initial: b.initial,
      states: b.states,
      operations: Object.entries(b.operations).map(([id, o]) => {
        const out = op(id, { name: o.name, from: o.from, requires: o.requires ?? [], durationSeconds: o.durationSeconds ?? 0, reserve: !!o.reserve, release: !!o.release, source: "catalog" });
        if (o.to !== undefined) out.to = o.to;
        if (o.clinical) out.clinical = o.clinical;
        if (o.roles) out.roles = o.roles;
        if (!o.clinical && named[id]) out.effect = named[id];
        return out;
      }),
    };
    if (b.derived) spec.derived = b.derived;
  } else spec = BUILTIN_BEHAVIORS[e.interaction] ?? NO_BEHAVIOR;
  if (type.portable === "cart") spec = { ...spec, operations: [...spec.operations, op("move_to", { effect: "move-to" })] };
  if (type.portable === "handheld") spec = { ...spec, operations: [...spec.operations, op("pick_up", { effect: "pick-up" }), op("put_down", { effect: "put-down" }), op("equip", { effect: "equip" })] };
  cache.set(type, spec);
  return spec;
}

/* ------------------------------------------------------------------ */
/* Predicates                                                          */
/* ------------------------------------------------------------------ */

/** What a predicate is evaluated against. */
export interface PredicateEnv {
  state: string | null;
  role: ActorRole;
  handsClean: boolean;
  holding(ref: string): boolean;
  actorWithin(m: number): boolean;
  patientWithin(m: number): boolean;
  deviceAtBedside(): boolean;
}

/** Evaluate a world predicate (core `WorldPredicate`). */
export function evaluatePredicate(p: WorldPredicate, env: PredicateEnv): boolean {
  if ("all" in p) return p.all.every((x) => evaluatePredicate(x, env));
  if ("any" in p) return p.any.some((x) => evaluatePredicate(x, env));
  if ("not" in p) return !evaluatePredicate(p.not, env);
  if ("actorWithin" in p) return env.actorWithin(p.actorWithin);
  if ("patientWithin" in p) return env.patientWithin(p.patientWithin);
  if ("deviceAtBedside" in p) return env.deviceAtBedside();
  if ("actorHolding" in p) return env.holding(p.actorHolding);
  if ("state" in p) return env.state !== null && (Array.isArray(p.state) ? p.state : [p.state]).includes(env.state);
  if ("role" in p) return p.role.includes(env.role);
  if ("handsClean" in p) return env.handsClean;
  return false;
}

/** Does the predicate depend on where the acting actor stands (`actorWithin` / `patientWithin`, at any depth)? */
export function isPlacementPredicate(p: WorldPredicate): boolean {
  if ("all" in p) return p.all.some(isPlacementPredicate);
  if ("any" in p) return p.any.some(isPlacementPredicate);
  if ("not" in p) return isPlacementPredicate(p.not);
  return "actorWithin" in p || "patientWithin" in p;
}

/* ------------------------------------------------------------------ */
/* Device rules                                                        */
/* ------------------------------------------------------------------ */

/** A refusal with its stable code, a localised message and (spatial failures) a goal that fixes it. */
export interface RuleFailure {
  code: WorldErrorCode;
  message: string;
  /** Where to go (verified by the action bus before it is returned). */
  goal?: NavGoal;
  label?: string;
  /** What to do there before retrying (a fetch: `move_to` the cart to the patient). */
  then?: ActionHint["then"];
}

export interface DeviceRulesDeps {
  store: WorldStateStore;
  locator: WorldLocator;
  clinical: ClinicalView;
  collision: Pick<CollisionModel, "doors">;
  locale: string;
  /** In-flight device locks of the action bus (an operation running its clinical effect, a cart being pushed). */
  busy?: (id: EntityId) => string | null;
}

/** Device states, operations, preconditions and reach, evaluated against the physical and clinical state. */
export class DeviceRules {
  constructor(private readonly d: DeviceRulesDeps) {}

  /** Behaviour of an entity id (none for unknown ids, people, rooms). */
  spec(id: EntityId): BehaviorSpec {
    const e = this.d.locator.registry.entity(id);
    return e ? behaviorOf(e) : NO_BEHAVIOR;
  }

  /** Operation by name, or null when the entity does not offer it. */
  operation(id: EntityId, name: string): OperationSpec | null {
    return this.spec(id).operations.find((o) => o.id === name) ?? null;
  }

  /**
   * Behaviour state now: stored (or the initial state), the door record
   * (open / closed / locked), derived from the engine (a monitor is
   * "attached" when it is the patient's monitor and `monitorAttached` holds),
   * or null. Handheld items report "held" / "equipped" while carried.
   */
  state(id: EntityId): string | null {
    const spec = this.spec(id);
    const s = this.d.store.entity(id);
    if (s?.heldBy) return s.data?.equipped ? "equipped" : "held";
    switch (spec.stateSource) {
      case "stored":
        return s?.state ?? spec.initial;
      case "door":
        return s?.door?.locked ? "locked" : s?.door?.open ? "open" : "closed";
      case "derived": {
        const c = this.d.clinical;
        return this.d.locator.isPatientMonitor(id) && monitorAttached(c.caseDef, c.state()) ? "attached" : "detached";
      }
      default:
        return null;
    }
  }

  /** Localised state name (behaviour names first). */
  stateLabel(id: EntityId, state = this.state(id)): string | undefined {
    if (state === null) return undefined;
    return stateName(state, this.d.locale, this.spec(id).states[state]?.name);
  }

  /** Localised operation name. */
  operationLabel(o: OperationSpec): string {
    return operationName(o.id, this.d.locale, o.name);
  }

  private env(actor: ActorState, place: Placed | null, state: string | null): PredicateEnv {
    const loc = this.d.locator;
    return {
      state,
      role: actor.role,
      handsClean: actor.handsCleanUntil !== null && this.d.clinical.clock() <= actor.handsCleanUntil,
      holding: (ref) => actor.holding.some((h) => h === ref || loc.registry.entity(h)?.type === ref || h === `eq:${ref}`),
      actorWithin: (m) => !!place && this.within(actor, place, m),
      patientWithin: (m) => {
        const p = loc.patient();
        return !!p && this.within(actor, p, m);
      },
      deviceAtBedside: () => !!place && loc.atBedside(place),
    };
  }

  /** Within `m` (≥ MIN_RANGE) of the entity's footprint, same level, line of sight (or carrying it). */
  within(actor: ActorState, p: Placed, m: number): boolean {
    if (p.heldBy === actor.id) return true;
    const loc = this.d.locator;
    return loc.distance(actor.pose, p) <= Math.max(m, MIN_RANGE) + 1e-6 && loc.lineOfSight(actor.pose, p);
  }

  /**
   * First failing non-spatial check of an operation for an actor, in commit
   * order: authority → availability → reservation → state → built-in
   * preconditions → declared preconditions. Null when it may proceed.
   */
  precheck(id: EntityId, o: OperationSpec, actor: ActorState): RuleFailure | null {
    const loc = this.d.locator;
    const L = this.d.locale;
    const target = loc.name(id);
    const operation = this.operationLabel(o);
    if (!permits(actor.role, o.id, o)) {
      const roles = o.roles?.length ? [...o.roles] : rolesFor(operationClass(o.id, !!o.clinical));
      return { code: "NOT_AUTHORIZED", message: `${worldMessage("NOT_AUTHORIZED", L, { role: roleName(actor.role, L), target, operation })} ${worldMessage("pre.role", L, { roles: listText(roles.map((r) => roleName(r, L)), L), operation })}` };
    }
    const spec = this.spec(id);
    const state = this.state(id);
    if (!this.d.store.available(id) || (state !== null && spec.states[state]?.available === false)) return { code: "DEVICE_UNAVAILABLE", message: worldMessage("DEVICE_UNAVAILABLE", L, { target }) };
    const s = this.d.store.entity(id);
    const holder = (s?.reservedBy && s.reservedBy !== actor.id ? s.reservedBy : null) ?? this.otherBusy(id, actor.id);
    // the patient being wheeled by someone else
    if (holder && id === loc.patientId) return { code: "DEVICE_BUSY", message: worldMessage("pre.patientBusy", L, { patient: target, holder: loc.name(holder) }) };
    if (holder) {
      // a reserved device is nobody else's provider: point at the nearest free alternative (EMBODIED §6)
      const alt = this.alternativeTo(id, actor);
      return { code: "DEVICE_BUSY", message: worldMessage("DEVICE_BUSY", L, { target, holder: loc.name(holder) }), ...(alt ? { goal: { kind: "interact", id: alt }, label: worldMessage("hint.alternative", L, { target: loc.name(alt) }) } : {}) };
    }
    if (o.from !== "*" && (state === null || !o.from.includes(state))) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.state", L, { target, operation, state: this.stateLabel(id, state) ?? "—" }) };
    const builtin = this.builtinPrecheck(id, o, actor, target);
    if (builtin) return builtin;
    const place = loc.place(id);
    const env = this.env(actor, place, state);
    for (const p of o.requires) {
      if (isPlacementPredicate(p) || evaluatePredicate(p, env)) continue;
      return this.predicateFailure(id, p, o, place, actor);
    }
    return null;
  }

  /**
   * The nearest in-service equipment providing every capability of `id` that
   * nobody else holds (same type first), or null.
   */
  alternativeTo(id: EntityId, actor: ActorState): EntityId | null {
    const loc = this.d.locator;
    const caps = loc.capabilities(id);
    const self = loc.registry.entity(id);
    if (!caps.length || !self) return null;
    let best: { id: EntityId; key: [number, number] } | null = null;
    for (const e of loc.registry.ofKind("equipment")) {
      if (e.id === id) continue;
      const have = loc.capabilities(e.id);
      if (!caps.every((c) => have.includes(c))) continue;
      const s = this.d.store.entity(e.id);
      if ((s?.reservedBy && s.reservedBy !== actor.id) || this.otherBusy(e.id, actor.id) || (s?.heldBy && s.heldBy !== actor.id)) continue;
      const p = loc.place(e.id);
      if (!p) continue;
      const d = p.level === actor.pose.level ? Math.hypot(p.position.x - actor.pose.x, p.position.z - actor.pose.z) : 1e6;
      const key: [number, number] = [e.type === self.type ? 0 : 1, d];
      if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && key[1] < best.key[1])) best = { id: e.id, key };
    }
    return best?.id ?? null;
  }

  private otherBusy(id: EntityId, actorId: string): string | null {
    const b = this.d.busy?.(id) ?? null;
    return b && b !== actorId ? b : null;
  }

  private builtinPrecheck(id: EntityId, o: OperationSpec, actor: ActorState, target: string): RuleFailure | null {
    const L = this.d.locale;
    const s = this.d.store.entity(id);
    if (this.spec(id).derived === "monitor-attachment" && !this.d.locator.isPatientMonitor(id)) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.notPatientMonitor", L, { target }) };
    switch (o.effect) {
      case "pick-up":
        if (s?.heldBy === actor.id) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.state", L, { target, operation: this.operationLabel(o), state: stateName("held", L) }) };
        if (s?.heldBy) return { code: "DEVICE_BUSY", message: worldMessage("pre.heldByOther", L, { target, holder: this.d.locator.name(s.heldBy) }) };
        if (actor.holding.length >= MAX_HELD) return { code: "HANDS_FULL", message: worldMessage("HANDS_FULL", L, { max: MAX_HELD }) };
        return null;
      case "put-down":
        return s?.heldBy === actor.id ? null : { code: "NOT_HOLDING", message: worldMessage("NOT_HOLDING", L, { target }) };
      case "equip":
        if (s?.heldBy !== actor.id) return { code: "NOT_HOLDING", message: worldMessage("NOT_HOLDING", L, { target }) };
        return s.data?.equipped ? { code: "PRECONDITION_FAILED", message: worldMessage("pre.equipped", L, { target }) } : null;
      case "move-to":
        return s?.heldBy ? { code: "DEVICE_BUSY", message: worldMessage("pre.heldByOther", L, { target, holder: this.d.locator.name(s.heldBy) }) } : null;
      case "escort":
      case "release": {
        const body = this.d.locator.patientBody;
        const problem = body ? escortProblem(body, target, actor, o.effect === "escort", L) : worldMessage("pre.noPatient", L);
        return problem ? { code: "PRECONDITION_FAILED", message: problem } : null;
      }
      case "door-close": {
        const door = this.d.collision.doors.find((d) => d.id === id);
        if (!door) return null;
        const a = door.area;
        const blocked = this.d.store.actors().some((x) => x.pose.level === door.level && x.pose.x >= a.minX && x.pose.x <= a.maxX && x.pose.z >= a.minZ && x.pose.z <= a.maxZ);
        return blocked ? { code: "PRECONDITION_FAILED", message: worldMessage("pre.doorway", L) } : null;
      }
      default:
        return null;
    }
  }

  /** The nearest in-service sink to an actor (same level first, then straight-line distance, then id), or null. */
  private nearestSink(actor: ActorState): EntityId | null {
    const loc = this.d.locator;
    let best: { id: EntityId; key: [number, number] } | null = null;
    for (const e of loc.registry.ofKind("equipment")) {
      if (!this.d.store.available(e.id) || !this.spec(e.id).operations.some((o) => o.effect === "wash-hands")) continue;
      const p = loc.place(e.id);
      if (!p) continue;
      const key: [number, number] = [p.level === actor.pose.level ? 0 : 1, Math.hypot(p.position.x - actor.pose.x, p.position.z - actor.pose.z)];
      if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && (key[1] < best.key[1] - 1e-9 || (Math.abs(key[1] - best.key[1]) <= 1e-9 && e.id < best.id)))) best = { id: e.id, key };
    }
    return best?.id ?? null;
  }

  private predicateFailure(id: EntityId, p: WorldPredicate, o: OperationSpec, place: Placed | null, actor: ActorState): RuleFailure {
    const L = this.d.locale;
    const target = this.d.locator.name(id);
    const operation = this.operationLabel(o);
    if ("handsClean" in p) {
      // the learner sentence names no tool; the hint does: the nearest sink, then wash_hands there
      const sink = this.nearestSink(actor);
      return { code: "PRECONDITION_FAILED", message: worldMessage("pre.handsClean", L), ...(sink ? { goal: { kind: "interact", id: sink } as NavGoal, label: worldMessage("hint.wash", L, { target: this.d.locator.name(sink) }), then: { operation: "wash_hands", targetId: sink } } : {}) };
    }
    if ("actorHolding" in p) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.holding", L, { item: p.actorHolding }) };
    if ("role" in p) return { code: "NOT_AUTHORIZED", message: worldMessage("pre.role", L, { roles: listText(p.role.map((r) => roleName(r, L)), L), operation }) };
    if ("state" in p) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.state", L, { target, operation, state: this.stateLabel(id) ?? "—" }) };
    if ("deviceAtBedside" in p) {
      if (!this.d.locator.patientId) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.noPatient", L) };
      const portable = place?.entity?.portable;
      return portable
        ? { code: "PRECONDITION_FAILED", message: worldMessage("pre.notAtBedside", L, { target }), goal: { kind: "interact", id }, label: worldMessage("hint.fetch", L, { provider: target, patient: this.d.locator.name(this.d.locator.patientId) }), then: { operation: "move_to", targetId: id, goal: { kind: "interact", id: this.d.locator.patientId } } }
        : { code: "PRECONDITION_FAILED", message: worldMessage("pre.notAtBedsideFixed", L, { target }) };
    }
    return { code: "PRECONDITION_FAILED", message: worldMessage("pre.predicate", L, { operation }) };
  }

  /**
   * Spatial check of an operation (actor placement): within `actorWithin`
   * of the device — or its reach when the operation declares neither
   * `actorWithin` nor `patientWithin` — and within `patientWithin` of the
   * patient, same level, line of sight. Carrying the item counts as in
   * reach; `put_down` / `equip` need nothing. Null when satisfied.
   */
  spatial(id: EntityId, o: OperationSpec, actor: ActorState): RuleFailure | null {
    if (o.effect === "put-down" || o.effect === "equip") return null;
    const loc = this.d.locator;
    const place = loc.place(id);
    if (!place) return null;
    if (o.effect === "monitor-read") return this.screenFailure(actor, place, o);
    const actorWithin = o.requires.find((p): p is { actorWithin: number } => "actorWithin" in p)?.actorWithin;
    const patientWithin = o.requires.find((p): p is { patientWithin: number } => "patientWithin" in p)?.patientWithin;
    if (actorWithin !== undefined || patientWithin === undefined) {
      const fail = this.rangeFailure(actor, place, actorWithin);
      if (fail) return fail;
    }
    if (patientWithin !== undefined) {
      const patient = loc.patient();
      if (!patient) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.noPatient", this.d.locale) };
      const fail = this.rangeFailure(actor, patient, patientWithin);
      if (fail) return fail;
    }
    const env = this.env(actor, place, this.state(id));
    for (const p of o.requires) {
      if (!isPlacementPredicate(p) || "actorWithin" in p || "patientWithin" in p) continue;
      if (!evaluatePredicate(p, env)) return { code: "NOT_IN_RANGE", message: worldMessage("pre.predicate", this.d.locale, { operation: this.operationLabel(o) }), goal: { kind: "interact", id }, label: worldMessage("hint.approach", this.d.locale, { target: loc.name(id) }) };
    }
    return null;
  }

  /**
   * A monitor's screen read (`read`): THE screen rule (`WorldLocator.screenInView`, the policy's
   * `monitor-screen` option — from the monitor's own room, within the operation's range, line of sight,
   * never through a window). Refused NOT_IN_RANGE (another room, too far) or NOT_VISIBLE, with the way to a
   * spot in the monitor's room within that range with a line of sight (a `look` goal, `sameRoom`).
   */
  private screenFailure(actor: ActorState, place: Placed, o: OperationSpec): RuleFailure | null {
    const loc = this.d.locator;
    const L = this.d.locale;
    const range = o.requires.find((p): p is { actorWithin: number } => "actorWithin" in p)?.actorWithin ?? RANGES.screen;
    if (loc.screenInView(actor, place, range)) return null;
    const target = loc.name(place.id);
    const needed = Math.max(range, MIN_RANGE);
    const goal: NavGoal = { kind: "look", id: place.id, range: needed, sameRoom: true };
    const label = worldMessage("hint.look", L, { target });
    if (actor.pose.level !== place.level) return { code: "NOT_IN_RANGE", message: worldMessage("NOT_IN_RANGE_LEVEL", L, { target, level: place.level }), goal, label };
    if (actor.room !== place.room) return { code: "NOT_IN_RANGE", message: worldMessage("spatial.monitor-not-in-view", L, { monitor: target, range: metres(needed) }), goal, label };
    const distance = loc.distance(actor.pose, place);
    if (distance > needed + 1e-6) return { code: "NOT_IN_RANGE", message: worldMessage("NOT_IN_RANGE", L, { target, distance: metres(distance), range: metres(needed) }), goal, label };
    return { code: "NOT_VISIBLE", message: worldMessage("NOT_VISIBLE", L, { target }), goal, label };
  }

  /**
   * NOT_IN_RANGE / NOT_VISIBLE for being farther than `range` (default: the
   * entity's reach) from a placed entity, with the goal that fixes it: the
   * entity's interaction point when its reach is enough, else a vantage
   * point within the range (a `look` goal).
   */
  rangeFailure(actor: ActorState, p: Placed, range?: number): RuleFailure | null {
    if (p.heldBy === actor.id) return null;
    const loc = this.d.locator;
    const L = this.d.locale;
    const reach = loc.reach(p);
    const needed = Math.max(range ?? reach, MIN_RANGE);
    const target = loc.name(p.id);
    const goal: NavGoal = needed + 1e-9 >= reach && needed <= reach + 1 ? { kind: "interact", id: p.id } : { kind: "look", id: p.id, range: needed };
    const label = goal.kind === "interact" ? (p.kind === "patient" ? worldMessage("hint.patient", L, { patient: target }) : worldMessage("hint.approach", L, { target })) : worldMessage("hint.look", L, { target });
    if (actor.pose.level !== p.level) return { code: "NOT_IN_RANGE", message: worldMessage("NOT_IN_RANGE_LEVEL", L, { target, level: p.level }), goal, label };
    const distance = loc.distance(actor.pose, p);
    if (distance > needed + 1e-6) return { code: "NOT_IN_RANGE", message: worldMessage("NOT_IN_RANGE", L, { target, distance: metres(distance), range: metres(needed) }), goal, label };
    if (!loc.lineOfSight(actor.pose, p)) return { code: "NOT_VISIBLE", message: worldMessage("NOT_VISIBLE", L, { target }), goal, label };
    return null;
  }

  /** Operations valid now for this actor — state, role, availability, reservation and preconditions; not position (see `ObservedEntity.inReach`). */
  availableActions(id: EntityId, actor: ActorState): string[] {
    return this.spec(id)
      .operations.filter((o) => this.precheck(id, o, actor) === null)
      .map((o) => o.id);
  }
}
