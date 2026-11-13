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
import { COUNT_EFFECT_STEPS, evaluate, isDevicePredicate, isOutcomePredicate, LINK_RANGE, lookOf, monitorAttached, NEARBY_STATE_RANGE, t, type BehaviorOperation, type CaseDefinition, type ClinicalEffect, type Condition, type DeviceBehavior, type LocalizedText, type RunMark } from "@clinicalcraft/core";
import { permits, rolesFor, operationClass } from "./authority.js";
import { MAX_HELD, RANGES, type ActionHint, type ActorRole, type ActorState, type ClinicalView, type CollisionModel, type EntityId, type InteractionKind, type NavGoal, type RunRecord, type SemanticEntity, type WorldErrorCode, type WorldPredicate } from "./contracts.js";
import { listText, metres, operationName, positionName, roleName, stateName, worldMessage } from "./i18n.js";
import { escortProblem } from "./escort.js";
import type { Placed, WorldLocator } from "./locate.js";
import { markRun } from "./marks.js";
import { MIN_RANGE } from "./nav/backend.js";
import type { Area } from "./raster.js";
import type { WorldStateStore } from "./state.js";

/** Built-in effects of operations (beyond a declarative state transition). */
export type BuiltinEffect = "door-open" | "door-close" | "door-lock" | "door-unlock" | "wash-hands" | "monitor-read" | "move-to" | "pick-up" | "put-down" | "equip" | "hand-over" | "transport" | "escort" | "release" | "reposition";

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
  /** The item in the actor's hands it works with (catalog `uses`): that instrument's own state moves. */
  uses?: NonNullable<BehaviorOperation["uses"]>;
  /** Other devices nearby it also sets (catalog `sets`: a station's presets put back). */
  sets?: NonNullable<BehaviorOperation["sets"]>;
  /** Connect this device, by instance, to the nearest device of a type (catalog `link`). */
  link?: NonNullable<BehaviorOperation["link"]>;
  /** Disconnect this device from the devices of a type (catalog `unlink`; `true`: all). */
  unlink?: string | true;
  /** Close the device's run record and start the next (catalog `newRun`). */
  newRun?: boolean;
  /** Whom the step is assessed for — roles or staff positions (catalog `assessed`): anyone else's step is a labelled substitution. */
  assessed?: readonly string[];
  /** What it leads to when something holds (catalog `outcomes`): the first whose `when` holds decides. */
  outcomes?: NonNullable<BehaviorOperation["outcomes"]>;
  /** Arranges a run's scenario on the nearest device of a type (catalog `arms`; parameter `scenario`). */
  arms?: NonNullable<BehaviorOperation["arms"]>;
}

/** One outcome of an operation (catalog `outcomes[]`). */
export type OperationOutcome = NonNullable<BehaviorOperation["outcomes"]>[number];

/** The behaviour of one entity. */
export interface BehaviorSpec {
  /** Where the state comes from: stored in the world, the door record, derived from the engine, or none. */
  stateSource: "stored" | "door" | "derived" | "none";
  initial: string | null;
  states: Record<string, { name?: LocalizedText; available?: boolean; when?: Condition }>;
  /** `monitor-attachment`: the patient's monitor; `case-record`: a board that shows the case record (WHO checklist). */
  derived?: "monitor-attachment" | "case-record";
  operations: OperationSpec[];
  /** Keeps a record of each run (catalog `runs`: a training station), with the operations on nearby devices of `with`; `marks`: what a run is marked on. */
  runs?: { with: readonly string[]; within: number; marks: readonly RunMark[] };
  /** The scenarios an instructor may arrange for a run (catalog `scenarios`), hidden from whoever acts. */
  scenarios?: NonNullable<DeviceBehavior["scenarios"]>;
}

/** The case items a `case-record` behaviour's operations name (`select: "item"`), by kind. */
function recordItems(spec: BehaviorSpec): { tool: string; item: string }[] {
  return spec.operations.flatMap((o) => (o.clinical?.select === "item" && o.clinical.item ? [{ tool: o.clinical.tool, item: o.clinical.item }] : []));
}

/** Does the case record what this board shows (every item its operations name)? */
export function recordBacked(spec: BehaviorSpec, c: CaseDefinition): boolean {
  if (spec.derived !== "case-record") return false;
  const items = recordItems(spec);
  const has = (tool: string, id: string) =>
    tool === "surgical_count"
      ? !!c.team?.count && (COUNT_EFFECT_STEPS as readonly string[]).includes(id)
      : tool === "intervene"
        ? c.interventions.some((i) => i.id === id)
        : tool === "examine"
          ? c.exam.some((f) => f.id === id)
          : c.investigations.some((i) => i.id === id);
  return items.length > 0 && items.every((x) => has(x.tool, x.item));
}

const physicalCache = new WeakMap<BehaviorSpec, BehaviorSpec>();

/** A `case-record` board in a case that does not record its items: its own state machine, physical operations. */
function physical(spec: BehaviorSpec): BehaviorSpec {
  const hit = physicalCache.get(spec);
  if (hit) return hit;
  const out: BehaviorSpec = {
    stateSource: "stored",
    initial: spec.initial,
    states: spec.states,
    operations: spec.operations.map((o) => {
      if (o.clinical?.select !== "item") return o;
      const { clinical: _clinical, ...rest } = o;
      return rest;
    }),
  };
  physicalCache.set(spec, out);
  return out;
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
 * `TRANSPORT_ROLES`). `escort_patient` — the patient gets up and walks with the actor wherever they go —,
 * `release_patient` — they wait where they are — and `reposition_patient {posture}` — they lie down, sit up or
 * stand up — are asked from conversation range (`escort.ts`, `posture.ts`).
 */
export const PATIENT_BEHAVIOR: BehaviorSpec = {
  stateSource: "none",
  initial: null,
  states: {},
  operations: [
    op("transport_patient", { effect: "transport", requires: [{ patientWithin: RANGES.contact }], roles: TRANSPORT_ROLES }),
    op("escort_patient", { effect: "escort", requires: [{ patientWithin: RANGES.talk }], roles: TRANSPORT_ROLES }),
    op("release_patient", { effect: "release", requires: [{ patientWithin: RANGES.talk }], roles: TRANSPORT_ROLES }),
    op("reposition_patient", { effect: "reposition", requires: [{ patientWithin: RANGES.talk }], roles: TRANSPORT_ROLES }),
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
        if (o.uses) out.uses = o.uses;
        if (o.sets) out.sets = o.sets;
        if (o.link) out.link = o.link;
        if (o.unlink !== undefined) out.unlink = o.unlink;
        if (o.newRun) out.newRun = true;
        if (o.assessed) out.assessed = o.assessed;
        if (o.outcomes) out.outcomes = o.outcomes;
        if (o.arms) out.arms = o.arms;
        if (!o.clinical && named[id]) out.effect = named[id];
        return out;
      }),
    };
    if (b.derived) spec.derived = b.derived;
    if (b.runs) spec.runs = b.runs === true ? { with: [], within: NEARBY_STATE_RANGE, marks: [] } : { with: b.runs.with, within: b.runs.within ?? NEARBY_STATE_RANGE, marks: b.runs.marks ?? [] };
    if (b.scenarios) spec.scenarios = b.scenarios;
  } else spec = BUILTIN_BEHAVIORS[e.interaction] ?? NO_BEHAVIOR;
  if (type.portable === "cart") spec = { ...spec, operations: [...spec.operations, op("move_to", { effect: "move-to" })] };
  if (type.portable === "handheld") spec = { ...spec, operations: [...spec.operations, op("pick_up", { effect: "pick-up" }), op("put_down", { effect: "put-down" }), op("equip", { effect: "equip" }), op("hand_over", { effect: "hand-over" })] };
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
  /** The acting actor's staff position (`position`; null: none — the learner's own body, or nobody acting). */
  position?: string | null;
  /** The scenario this device's run is under (`scenario`; null or absent: none) — read by an operation's outcomes only. */
  scenario?: string | null;
  handsClean: boolean;
  /** The actor holds an item of `ref` (an entity id or a type) — with `states`, one in one of those states. */
  holding(ref: string, states?: readonly string[]): boolean;
  actorWithin(m: number): boolean;
  patientWithin(m: number): boolean;
  deviceAtBedside(): boolean;
  /**
   * Another in-service device of `type` within `within` m of this one is in one of `states` (`nearbyState`; absent:
   * false) — with `linked`, one connected by instance to a device of `linked.type` (in `linked.states`).
   */
  nearby?(type: string, states: readonly string[], within: number, linked?: { type: string; states: readonly string[] | null }): boolean;
  /** This device is connected by instance to a device of `type` (in `states`), directly or through one of type `via` (`linked`). */
  linked?(type: string, states: readonly string[] | null, via?: string): boolean;
  /** Every state the entity is in (`state` predicates match any): a carried item is "held" and in its own lifecycle state (absent: `state`). */
  states?: readonly string[];
}

/** Evaluate a world predicate (core `WorldPredicate`). */
export function evaluatePredicate(p: WorldPredicate, env: PredicateEnv): boolean {
  if ("all" in p) return p.all.every((x) => evaluatePredicate(x, env));
  if ("any" in p) return p.any.some((x) => evaluatePredicate(x, env));
  if ("not" in p) return !evaluatePredicate(p.not, env);
  if ("actorWithin" in p) return env.actorWithin(p.actorWithin);
  if ("patientWithin" in p) return env.patientWithin(p.patientWithin);
  if ("deviceAtBedside" in p) return env.deviceAtBedside();
  if ("actorHolding" in p) return p.itemState === undefined ? env.holding(p.actorHolding) : env.holding(p.actorHolding, Array.isArray(p.itemState) ? p.itemState : [p.itemState]);
  if ("linked" in p) {
    const l = p.linked;
    return !!env.linked?.(l.type, l.state === undefined ? null : Array.isArray(l.state) ? l.state : [l.state], l.via);
  }
  if ("state" in p) {
    const wanted = Array.isArray(p.state) ? p.state : [p.state];
    return (env.states ?? (env.state === null ? [] : [env.state])).some((s) => wanted.includes(s));
  }
  if ("role" in p) return p.role.includes(env.role);
  if ("position" in p) return !!env.position && (p.position as readonly string[]).includes(env.position);
  if ("scenario" in p) return !!env.scenario && (Array.isArray(p.scenario) ? p.scenario : [p.scenario]).includes(env.scenario);
  if ("handsClean" in p) return env.handsClean;
  if ("nearbyState" in p) {
    const n = p.nearbyState;
    const linked = n.linked ? { type: n.linked.type, states: n.linked.state === undefined ? null : Array.isArray(n.linked.state) ? n.linked.state : [n.linked.state] } : undefined;
    return !!env.nearby?.(n.type, Array.isArray(n.state) ? n.state : [n.state], n.within ?? NEARBY_STATE_RANGE, linked);
  }
  return false;
}

/** A name with its first letter in upper case (a staff position beside a role's name: "Surgeon"). */
const capitalised = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** Metres between two ground footprints (0 when they touch or overlap). */
export function areaDistance(a: Area, b: Area): number {
  return Math.hypot(Math.max(0, b.minX - a.maxX, a.minX - b.maxX), Math.max(0, b.minZ - a.maxZ, a.minZ - b.maxZ));
}

/** Handheld items an actor has in hand (carried, not worn): at most `MAX_HELD` (`HANDS_FULL`). */
export function itemsInHand(actor: Pick<ActorState, "holding">, store: Pick<WorldStateStore, "entity">): EntityId[] {
  return actor.holding.filter((h) => !store.entity(h)?.data?.equipped);
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
    if (!e) return NO_BEHAVIOR;
    const spec = behaviorOf(e);
    // a board showing the case record follows the record only in a case that records it
    if (spec.derived === "case-record" && !recordBacked(spec, this.d.clinical.caseDef)) return physical(spec);
    return spec;
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
        return s?.state ?? this.d.locator.registry.entity(id)?.initialState ?? spec.initial;
      case "door":
        return s?.door?.locked ? "locked" : s?.door?.open ? "open" : "closed";
      case "derived": {
        const c = this.d.clinical;
        // the last listed state whose condition holds in the case record, else the initial state — only on a board
        // bound to the encounter (in the patient's room); another room's board shows nothing of this patient
        if (spec.derived === "case-record") return this.recordBound(id) ? this.recordState(spec) : spec.initial;
        return this.d.locator.isPatientMonitor(id) && monitorAttached(c.caseDef, c.state()) ? "attached" : "detached";
      }
      default:
        return null;
    }
  }

  /**
   * Every state an entity is in, for an operation's `from`, a `state` predicate and `nearbyState`: its state, and for
   * a carried item with a stored behaviour also its own lifecycle state ("held" and "sterile": a scalpel in hand that
   * has not been used yet).
   */
  states(id: EntityId): string[] {
    const state = this.state(id);
    const own = this.carriedOwnState(id);
    return [...(state === null ? [] : [state]), ...(own !== null && own !== state ? [own] : [])];
  }

  /**
   * A carried item's own state (null: not carried, or none): its stored lifecycle state, or what it shows of the case
   * record (an RF wand in hand still reads "scan clear" — `derived: "case-record"`).
   */
  private carriedOwnState(id: EntityId): string | null {
    const spec = this.spec(id);
    const s = this.d.store.entity(id);
    if (!s?.heldBy) return null;
    if (spec.stateSource === "stored") return s.state ?? this.d.locator.registry.entity(id)?.initialState ?? spec.initial;
    if (spec.stateSource === "derived" && spec.derived === "case-record") return this.recordBound(id) ? this.recordState(spec) : spec.initial;
    return null;
  }

  /** The room the encounter's record-backed boards are in: the patient's room now (null while between rooms). */
  encounterRoom(): string | null {
    const loc = this.d.locator;
    return (loc.patientId ? loc.place(loc.patientId)?.room : null) ?? null;
  }

  /**
   * Is a record-backed board (or a record-backed handheld, the RF wand) bound to the encounter now — in the patient's
   * room? Only then does it show the case record and write to it: OR 1's WHO board never signs in a patient in OR 7.
   * Read for every display and again right before a commit (the patient may have been moved meanwhile).
   */
  recordBound(id: EntityId): boolean {
    const room = this.encounterRoom();
    const p = this.d.locator.place(id);
    return !!room && !!p && p.room === room;
  }

  /** A record-backed board's operation done away from the encounter: refused, pointing at the same board in the patient's room. */
  private unboundFailure(id: EntityId, o: OperationSpec): RuleFailure {
    const loc = this.d.locator;
    const L = this.d.locale;
    const room = this.encounterRoom();
    const type = loc.registry.entity(id)?.type;
    const there = room ? loc.registry.ofKind("equipment").find((e) => e.type === type && e.id !== id && loc.place(e.id)?.room === room) : undefined;
    const patient = loc.patientId ? loc.name(loc.patientId) : "—";
    const message = worldMessage("pre.otherRoom", L, { target: loc.name(id), operation: this.operationLabel(o), patient, room: room ? loc.name(`room:${room}`) : worldMessage("pre.betweenRooms", L) });
    return { code: "PRECONDITION_FAILED", message, ...(there ? { goal: { kind: "interact", id: there.id }, label: worldMessage("hint.approach", L, { target: loc.name(there.id) }) } : {}) };
  }

  /** The last listed state of a `case-record` behaviour whose condition holds in the case record, else its initial state. */
  private recordState(spec: BehaviorSpec): string | null {
    const c = this.d.clinical;
    const state = c.state();
    let at = spec.initial;
    for (const [name, st] of Object.entries(spec.states)) if (st.when && evaluate(c.caseDef, state, st.when)) at = name;
    return at;
  }

  /** Localised state name (behaviour names first). */
  stateLabel(id: EntityId, state = this.state(id)): string | undefined {
    if (state === null) return undefined;
    return stateName(state, this.d.locale, this.spec(id).states[state]?.name);
  }

  /** An equipment type's name (an entity id or a type id; the id itself when the facility has none of it). */
  typeName(ref: string): string {
    const reg = this.d.locator.registry;
    const e = reg.entity(ref) ?? reg.entity(`eq:${ref}`) ?? reg.ofKind("equipment").find((x) => x.type === ref);
    if (!e) return ref;
    return e.equipmentType?.name ? t(e.equipmentType.name, this.d.locale) : this.d.locator.name(e.id);
  }

  /** A state of an equipment type by name (its behaviour's name for it, else the built-in name). */
  typeStateName(type: string, state: string): string {
    const e = this.d.locator.registry.ofKind("equipment").find((x) => x.type === type);
    return stateName(state, this.d.locale, e ? behaviorOf(e).states[state]?.name : undefined);
  }

  /** Localised operation name. */
  operationLabel(o: OperationSpec): string {
    return operationName(o.id, this.d.locale, o.name);
  }

  private env(actor: ActorState | null, place: Placed | null, state: string | null): PredicateEnv {
    const loc = this.d.locator;
    return {
      state,
      // nobody acting (a screen looked at): no role, nothing in hand, nowhere to stand
      role: actor?.role ?? ("" as ActorRole),
      position: actor ? this.positionOf(actor.id) : null,
      scenario: place ? this.scenario(place.id) : null,
      handsClean: !!actor && actor.handsCleanUntil !== null && this.d.clinical.clock() <= actor.handsCleanUntil,
      holding: (ref, states) => !!actor && this.heldOf(actor, ref).some((h) => !states || this.states(h).some((x) => states.includes(x))),
      actorWithin: (m) => !!actor && !!place && this.within(actor, place, m),
      patientWithin: (m) => {
        const p = loc.patient();
        return !!actor && !!p && this.within(actor, p, m);
      },
      deviceAtBedside: () => !!place && loc.atBedside(place),
      nearby: (type, states, within, linked) =>
        !!place && this.nearbyOfType(place, type, within).some((id) => this.states(id).some((x) => states.includes(x)) && (!linked || this.linkedTo(id, linked.type, linked.states).length > 0)),
      linked: (type, states, via) => !!place && (via ? this.linkedTo(place.id, via, null).some((mid) => this.linkedTo(mid, type, states).length > 0) : this.linkedTo(place.id, type, states).length > 0),
      states: place ? this.states(place.id) : state === null ? [] : [state],
    };
  }

  /** An actor's staff position (the anaesthetist, the assistant surgeon); null: none — the learner's own body. */
  positionOf(actorId: string): string | null {
    return this.d.locator.registry.entity(actorId)?.staffPosition ?? null;
  }

  /**
   * The scenario a device's run is under (its behaviour's `scenarios`; null: none). Hidden: the instructor's — no
   * observation, state or refusal shows it; only an operation's outcomes read it, and the facilitator
   * (`WorldRuntime.scenarioOf`).
   */
  scenario(id: EntityId): string | null {
    const s = this.d.store.entity(id)?.data?.scenario;
    return typeof s === "string" && !!this.spec(id).scenarios?.[s] ? s : null;
  }

  /**
   * A device's run records (catalog `runs`): the run under way and the closed ones, each with how it did on what it
   * is marked on — read from its own entries every time (never stored: the same entries, the same marks).
   */
  runs(id: EntityId): { current: RunRecord | null; closed: RunRecord[] } {
    const data = this.d.store.entity(id)?.data;
    const current = (data?.run as RunRecord | undefined) ?? null;
    const closed = Array.isArray(data?.runs) ? (data!.runs as RunRecord[]) : [];
    const marks = this.spec(id).runs?.marks ?? [];
    const typeOf = (x: EntityId) => this.d.locator.registry.entity(x)?.type ?? null;
    const marked = (run: RunRecord): RunRecord => (marks.length ? { ...structuredClone(run), marks: markRun(marks, run, typeOf) } : structuredClone(run));
    return { current: current ? marked(current) : null, closed: closed.map(marked) };
  }

  /** What an operation leads to now (catalog `outcomes`): the first outcome whose `when` holds, or null — its own `to`. */
  outcomeOf(id: EntityId, o: OperationSpec): OperationOutcome | null {
    if (!o.outcomes?.length) return null;
    const env = this.env(null, this.d.locator.place(id), this.state(id));
    return o.outcomes.find((out) => out.when.every((p) => isOutcomePredicate(p) && evaluatePredicate(p, env))) ?? null;
  }

  /**
   * An operation as it comes out now: with the outcome that holds, its state, the devices it also sets, and whether
   * the instrument in hand moves on. `result`: what is seen, said with the result.
   */
  resolved(id: EntityId, o: OperationSpec): { op: OperationSpec; result: LocalizedText | null } {
    const out = this.outcomeOf(id, o);
    if (!out) return { op: o, result: null };
    const op: OperationSpec = { ...o };
    if (out.to !== undefined) op.to = out.to;
    if (out.sets) op.sets = [...(o.sets ?? []), ...out.sets];
    if (out.uses === false) delete op.uses;
    return { op, result: out.result ?? null };
  }

  /** The items of `ref` (an entity id or an equipment type) an actor has in hand (carried or worn), in hand order. */
  heldOf(actor: Pick<ActorState, "holding">, ref: string): EntityId[] {
    const reg = this.d.locator.registry;
    return actor.holding.filter((h) => h === ref || reg.entity(h)?.type === ref || h === `eq:${ref}`);
  }

  /** The entities this one is connected to by instance (an operation's `link`, a `uses` with `link`): stored on both. */
  links(id: EntityId): EntityId[] {
    const l = this.d.store.entity(id)?.data?.links;
    return Array.isArray(l) ? l.filter((x): x is EntityId => typeof x === "string") : [];
  }

  /** The entities of `type` (in one of `states`; null: any) this one is connected to. */
  linkedTo(id: EntityId, type: string, states: readonly string[] | null): EntityId[] {
    const reg = this.d.locator.registry;
    return this.links(id).filter((x) => reg.entity(x)?.type === type && (!states || this.states(x).some((s) => states.includes(s))));
  }

  /**
   * The item an operation with `uses` works with: of its alternatives in order, the first the actor holds in one of
   * its `from` states (that very instrument), with what it becomes; null when they hold none of them so.
   */
  usedItem(o: OperationSpec, actor: Pick<ActorState, "holding">): { id: EntityId; use: NonNullable<OperationSpec["uses"]>[number] } | null {
    for (const use of o.uses ?? []) {
      const id = this.heldOf(actor, use.item).find((h) => !use.from || this.states(h).some((s) => use.from!.includes(s)));
      if (id) return { id, use };
    }
    return null;
  }

  /** What an operation's `link` connects this device to: the nearest in-service device of its type (in its state), or null. */
  linkTarget(id: EntityId, o: OperationSpec): EntityId | null {
    const l = o.link;
    const place = l ? this.d.locator.place(id) : null;
    if (!l || !place) return null;
    const states = l.state === undefined ? null : Array.isArray(l.state) ? l.state : [l.state];
    return this.nearbyOfType(place, l.type, l.within ?? LINK_RANGE).find((x) => !states || this.states(x).some((s) => states.includes(s))) ?? null;
  }

  /**
   * What a device's screens show now: its state's look (else its type's screen) — dark while what the picture needs
   * (`screenNeeds`) does not hold. THE screen of a device: every display and every front-end reads it here.
   */
  screen(id: EntityId): string {
    const e = this.d.locator.registry.entity(id);
    const type = e?.equipmentType;
    if (!type) return "none";
    const state = this.state(id);
    const kind = lookOf(type, state).screen;
    if (kind === "none" || !type.screenNeeds?.length || !this.d.store.available(id)) return this.d.store.available(id) ? kind : "none";
    const env = this.env(null, this.d.locator.place(id), state);
    return type.screenNeeds.every((p) => isDevicePredicate(p) && evaluatePredicate(p, env)) ? kind : "none";
  }

  /**
   * In-service devices of an equipment type near a placed entity (`nearbyState`): the same level, footprint to
   * footprint within `within` m, itself excluded — nearest first (then id).
   */
  nearbyOfType(place: Placed, type: string, within: number): EntityId[] {
    const loc = this.d.locator;
    const out: { id: EntityId; d: number }[] = [];
    for (const e of loc.registry.ofKind("equipment")) {
      if (e.id === place.id || e.type !== type || !this.d.store.available(e.id)) continue;
      const p = loc.place(e.id);
      if (!p || p.level !== place.level) continue;
      const d = areaDistance(place.area, p.area);
      if (d <= within + 1e-6) out.push({ id: e.id, d });
    }
    return out.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((x) => x.id);
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
    // a carried item is in its holder's hands: nobody else operates it
    if (s?.heldBy && s.heldBy !== actor.id) return { code: "DEVICE_BUSY", message: worldMessage("pre.heldByOther", L, { target, holder: loc.name(s.heldBy) }) };
    // a record-backed board writes the record of the encounter in its own room only
    if (o.clinical?.select === "item" && spec.derived === "case-record" && !this.recordBound(id)) return this.unboundFailure(id, o);
    if (o.from !== "*" && !this.states(id).some((x) => o.from.includes(x))) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.state", L, { target, operation, state: this.stateLabel(id, this.carriedOwnState(id) ?? state) ?? "—" }) };
    const builtin = this.builtinPrecheck(id, o, actor, target);
    if (builtin) return builtin;
    const place = loc.place(id);
    const env = this.env(actor, place, state);
    for (const p of o.requires) {
      if (isPlacementPredicate(p) || evaluatePredicate(p, env)) continue;
      return this.predicateFailure(id, p, o, place, actor);
    }
    // the instrument it works with: in hand, and in a state to do it (a stapler with a reload in)
    if (o.uses?.length && !this.usedItem(o, actor)) return this.usesFailure(o, actor);
    // what it connects to: there
    if (o.link && !this.linkTarget(id, o)) {
      const states = o.link.state === undefined ? [] : (Array.isArray(o.link.state) ? o.link.state : [o.link.state]).map((s) => this.typeStateName(o.link!.type, s));
      return { code: "PRECONDITION_FAILED", message: worldMessage("pre.linkNone", L, { operation, device: this.typeName(o.link.type), states: states.length ? listText(states, L) : "—", distance: metres(o.link.within ?? LINK_RANGE) }) };
    }
    return null;
  }

  /** Why an operation's `uses` fails: the first alternative named, in hand or not, and the state it is in. */
  private usesFailure(o: OperationSpec, actor: ActorState): RuleFailure {
    const L = this.d.locale;
    const operation = this.operationLabel(o);
    const uses = o.uses ?? [];
    const items = listText(uses.map((u) => this.typeName(u.item)), L, "or");
    // holding one of them, in the wrong state: say which state it is in and which it needs
    for (const u of uses) {
      const held = this.heldOf(actor, u.item)[0];
      if (!held || !u.from) continue;
      const own = this.states(held).find((s) => s !== "held" && s !== "equipped") ?? this.state(held);
      const wanted = listText(u.from.map((s) => this.typeStateName(u.item, s)), L, "or");
      return { code: "PRECONDITION_FAILED", message: worldMessage("pre.itemState", L, { operation, item: this.typeName(u.item), states: wanted, state: this.stateLabel(held, own) ?? "—" }) };
    }
    return { code: "PRECONDITION_FAILED", message: worldMessage("pre.holding", L, { item: items }) };
  }

  /**
   * The checklist board operation that records a case step (a record-backed WHO board's `time_out` → the case's
   * `time-out`), nearest the patient (in the patient's room first), or null when the facility has none. Its team
   * prerequisites are the step's own, whichever way the step is taken (`checklistPrerequisite`).
   */
  checklistOperation(interventionId: string): { id: EntityId; op: OperationSpec } | null {
    const loc = this.d.locator;
    const patient = loc.patientId ? loc.place(loc.patientId) : null;
    let best: { id: EntityId; op: OperationSpec; key: [number, number, string] } | null = null;
    for (const e of loc.registry.ofKind("equipment")) {
      const spec = this.spec(e.id);
      if (spec.derived !== "case-record") continue;
      const op = spec.operations.find((o) => o.clinical?.select === "item" && o.clinical.tool === "intervene" && o.clinical.item === interventionId);
      const p = op ? loc.place(e.id) : null;
      if (!op || !p) continue;
      const key: [number, number, string] = patient
        ? [p.room && p.room === patient.room ? 0 : 1, p.level === patient.level ? Math.hypot(p.position.x - patient.position.x, p.position.z - patient.position.z) : 1e6, e.id]
        : [1, 0, e.id];
      if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && (key[1] < best.key[1] || (key[1] === best.key[1] && key[2] < best.key[2])))) best = { id: e.id, op, key };
    }
    return best ? { id: best.id, op: best.op } : null;
  }

  /**
   * The team prerequisites of a checklist step (the board operation's declared predicates that are not about where
   * the actor stands or who they are — a baseline count on the count board before the Time Out), or null when they
   * hold. The board and `intervene` take the same step: one rule (docs/EMBODIED.md §6).
   */
  checklistPrerequisite(interventionId: string, actor: ActorState): RuleFailure | null {
    const found = this.checklistOperation(interventionId);
    if (!found) return null;
    const place = this.d.locator.place(found.id);
    const env = this.env(actor, place, this.state(found.id));
    for (const p of found.op.requires) {
      if (isPlacementPredicate(p) || "role" in p || "handsClean" in p || "actorHolding" in p || evaluatePredicate(p, env)) continue;
      return this.predicateFailure(found.id, p, found.op, place, actor);
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
        if (itemsInHand(actor, this.d.store).length >= MAX_HELD) return { code: "HANDS_FULL", message: worldMessage("HANDS_FULL", L, { max: MAX_HELD }) };
        return null;
      case "hand-over":
        if (s?.heldBy !== actor.id) return { code: "NOT_HOLDING", message: worldMessage("NOT_HOLDING", L, { target }) };
        return s.data?.equipped ? { code: "PRECONDITION_FAILED", message: worldMessage("pre.handOverWorn", L, { target }) } : null;
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
    // a compound one: why its first alternative fails (`any`: the rule, before its exception — the role a step is
    // assessed for, before practice mode), or its first failing part (`all`)
    if ("any" in p && p.any.length) {
      // whose step it is, by role and by staff position together ("Only Clinician or Surgeon may …")
      const who = p.any.flatMap((x) => ("role" in x ? x.role.map((r) => roleName(r, L)) : "position" in x ? x.position.map((s) => capitalised(positionName(s, L))) : []));
      const mixed = p.any.some((x) => "role" in x) && p.any.some((x) => "position" in x);
      if (mixed) return { code: "NOT_AUTHORIZED", message: worldMessage("pre.role", L, { roles: listText(who, L, "or"), operation }) };
      return this.predicateFailure(id, p.any[0]!, o, place, actor);
    }
    if ("all" in p) {
      const env = this.env(actor, place, this.state(id));
      const part = p.all.find((x) => !evaluatePredicate(x, env));
      if (part) return this.predicateFailure(id, part, o, place, actor);
    }
    // a device nearby that must not be in a state (the scope in the chest during a white balance): which one is
    if ("not" in p && "nearbyState" in p.not && place) {
      const n = p.not.nearbyState;
      const wanted = Array.isArray(n.state) ? n.state : [n.state];
      const there = this.nearbyOfType(place, n.type, n.within ?? NEARBY_STATE_RANGE).find((x) => this.states(x).some((s) => wanted.includes(s)));
      if (there) {
        const state = this.states(there).find((s) => wanted.includes(s))!;
        return { code: "PRECONDITION_FAILED", message: worldMessage("pre.nearbyStateNot", L, { operation, device: this.typeName(n.type), state: this.stateLabel(there, state) ?? state }), goal: { kind: "interact", id: there }, label: worldMessage("hint.approach", L, { target: this.d.locator.name(there) }) };
      }
    }
    if ("handsClean" in p) {
      // the learner sentence names no tool; the hint does: the nearest sink, then wash_hands there
      const sink = this.nearestSink(actor);
      return { code: "PRECONDITION_FAILED", message: worldMessage("pre.handsClean", L), ...(sink ? { goal: { kind: "interact", id: sink } as NavGoal, label: worldMessage("hint.wash", L, { target: this.d.locator.name(sink) }), then: { operation: "wash_hands", targetId: sink } } : {}) };
    }
    if ("actorHolding" in p) {
      const held = p.itemState !== undefined ? this.heldOf(actor, p.actorHolding)[0] : undefined;
      if (held && p.itemState !== undefined) {
        const wanted = (Array.isArray(p.itemState) ? p.itemState : [p.itemState]).map((s) => this.typeStateName(p.actorHolding, s));
        const own = this.states(held).find((s) => s !== "held" && s !== "equipped") ?? this.state(held);
        return { code: "PRECONDITION_FAILED", message: worldMessage("pre.itemState", L, { operation, item: this.typeName(p.actorHolding), states: listText(wanted, L, "or"), state: this.stateLabel(held, own) ?? "—" }) };
      }
      return { code: "PRECONDITION_FAILED", message: worldMessage("pre.holding", L, { item: this.typeName(p.actorHolding) }) };
    }
    if ("linked" in p) {
      const l = p.linked;
      const states = l.state === undefined ? [] : (Array.isArray(l.state) ? l.state : [l.state]).map((s) => this.typeStateName(l.type, s));
      return {
        code: "PRECONDITION_FAILED",
        message: worldMessage(l.via ? "pre.linkedVia" : "pre.linked", L, { operation, target, device: this.typeName(l.type), via: l.via ? this.typeName(l.via) : "", states: states.length ? listText(states, L, "or") : "—" }),
      };
    }
    if ("nearbyState" in p && place) {
      const n = p.nearbyState;
      const within = n.within ?? NEARBY_STATE_RANGE;
      const device = this.typeName(n.type);
      const wanted = (Array.isArray(n.state) ? n.state : [n.state]).map((s) => this.typeStateName(n.type, s));
      const near = this.nearbyOfType(place, n.type, within)[0];
      if (!near) return { code: "PRECONDITION_FAILED", message: worldMessage("pre.nearbyStateNone", L, { operation, device, distance: metres(within) }) };
      // the first step on that device's way to a wanted state (the count board's baseline count; closing, then the
      // final count), when this actor may take it: the hint's `then`
      const step = this.firstStepTowards(near, Array.isArray(n.state) ? n.state : [n.state], actor);
      return {
        code: "PRECONDITION_FAILED",
        message: worldMessage("pre.nearbyState", L, { operation, device, states: listText(wanted, L), state: this.stateLabel(near) ?? "—" }),
        goal: { kind: "interact", id: near },
        label: worldMessage("hint.approach", L, { target: this.d.locator.name(near) }),
        ...(step ? { then: { operation: step.id, targetId: near } } : {}),
      };
    }
    if ("role" in p) return { code: "NOT_AUTHORIZED", message: worldMessage("pre.role", L, { roles: listText(p.role.map((r) => roleName(r, L)), L), operation }) };
    if ("position" in p) return { code: "NOT_AUTHORIZED", message: worldMessage("pre.position", L, { positions: listText(p.position.map((x) => positionName(x, L)), L, "or"), operation }) };
    if ("state" in p) {
      const message = worldMessage("pre.state", L, { target, operation, state: this.stateLabel(id) ?? "—" });
      // an item that must be in hand (an RF wand's scan): pick it up first
      const wanted = Array.isArray(p.state) ? p.state : [p.state];
      const pick = wanted.includes("held") && !place?.heldBy ? this.operation(id, "pick_up") : null;
      return pick ? { code: "PRECONDITION_FAILED", message, goal: { kind: "interact", id }, label: worldMessage("hint.approach", L, { target }), then: { operation: pick.id, targetId: id } } : { code: "PRECONDITION_FAILED", message };
    }
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
   * The first operation on a device's shortest way (by its state machine: physical operations, and the count record's
   * own entries — a count, a scan — never a checklist step or a treatment) from its states now to one of `wanted`,
   * that `actor` may do; null when there is none.
   */
  firstStepTowards(id: EntityId, wanted: readonly string[], actor: ActorState): OperationSpec | null {
    const ops = this.spec(id).operations.filter((o) => (!o.clinical || o.clinical.tool === "surgical_count") && !o.toolByParam && o.to !== undefined && permits(actor.role, o.id, o));
    const offered = (st: string, o: OperationSpec) => o.from === "*" || o.from.includes(st);
    const queue: { state: string; first: OperationSpec | null }[] = this.states(id).map((st) => ({ state: st, first: null }));
    const seen = new Set(queue.map((q) => q.state));
    while (queue.length) {
      const { state, first } = queue.shift()!;
      for (const o of ops) {
        if (!offered(state, o) || seen.has(o.to!)) continue;
        const head = first ?? o;
        if (wanted.includes(o.to!)) return head;
        seen.add(o.to!);
        queue.push({ state: o.to!, first: head });
      }
    }
    return null;
  }

  /**
   * Spatial check of an operation (actor placement): within `actorWithin`
   * of the device — or its reach when the operation declares neither
   * `actorWithin` nor `patientWithin` — and within `patientWithin` of the
   * patient, same level, line of sight. Carrying the item counts as in
   * reach; `put_down` / `equip` need nothing. Null when satisfied.
   */
  spatial(id: EntityId, o: OperationSpec, actor: ActorState): RuleFailure | null {
    // the item travels with its holder; a hand-over measures the recipient (`hand.ts`)
    if (o.effect === "put-down" || o.effect === "equip" || o.effect === "hand-over") return null;
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
