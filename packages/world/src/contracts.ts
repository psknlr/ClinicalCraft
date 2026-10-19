/**
 * @clinicalcraft/world — contracts (docs/EMBODIED.md).
 *
 * The world model is pure and deterministic: no DOM, no three.js, no
 * `node:*`, no `Date.now()` / `Math.random()` (clocks and id generators are
 * injected). The same code runs in the browser (behind the three.js view) and
 * headless (CLI, HTTP server, MCP, benchmark).
 *
 * Layers (EMBODIED §2): static (facility, catalogs, collision, navigation,
 * registry) · physical (`WorldStateStore`, versioned) · clinical (the core
 * engine — authoritative for every clinical outcome; reached only through a
 * `ClinicalPort`, i.e. the session's normal tool path).
 */
import type {
  ActorRole as CoreActorRole,
  BehaviorOperation as CoreBehaviorOperation,
  CaseDefinition,
  ClinicalEffect as CoreClinicalEffect,
  Condition,
  DeviceBehavior as CoreDeviceBehavior,
  EquipmentCatalog,
  EquipmentType,
  FacilityDefinition,
  LocalizedText,
  SessionState,
  VitalsSnapshot,
  WorldPredicate as CoreWorldPredicate,
} from "@clinicalcraft/core";
import type { WallSpec } from "./walls.js";

/* ------------------------------------------------------------------ */
/* Identifiers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Agent-facing entity id, prefixed by kind (EMBODIED §3):
 * `eq:<placementId>` · `patient:<slotId>` · `staff:<staffId>` · `actor:<name>` ·
 * `room:<roomId>` · `door:<ownerId>:<side>:<n>` · `level:<levelId>` ·
 * `connector:<id>` · `item:<id>`. three.js objects/mesh indices are never ids.
 */
export type EntityId = string;

/** An entity that can act: the learner's avatar (`actor:clinician`), other `actor:*` bodies, or staff (`staff:*`). */
export type ActorId = string;

/** The learner's avatar (controlled by the human in the browser, or by the clinician agent / autopilot / MCP client). */
export const PRIMARY_ACTOR: ActorId = "actor:clinician";

export type EntityKind = "patient" | "staff" | "actor" | "equipment" | "door" | "room" | "level" | "connector" | "item";

/** `interaction.kind` of equipment types (core schema), plus the built-in kinds of non-equipment entities. */
export type InteractionKind =
  | "workstation"
  | "monitor"
  | "bed"
  | "device"
  | "atlas"
  | "board"
  | "craft"
  | "door"
  | "sink"
  | "storage"
  | "talk"
  | "none";

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export interface Vec2 {
  x: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A body pose. `yaw` in radians with the renderer's convention (0 looks towards −Z); `level` is a facility level id. */
export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  level: string;
}

/** Axis-aligned box in world coordinates (metres; +Y up; north = −Z). */
export interface Aabb {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** What a collider is made of (navigation and visibility treat them differently). `sign`: the post of a free-standing sign. */
export type ColliderKind = "wall" | "partition" | "window" | "door" | "equipment" | "npc" | "tree" | "block" | "sign" | "obstacle" | "slab" | "ramp" | "rail";

/**
 * The walkable top of a ramp collider (a stairs or ramp flight, EMBODIED
 * R10): the surface rises linearly along `axis` from `y0` at coordinate
 * `from` (the foot) to `y1` at `to` (the head) and is level beyond them; the
 * flight is solid from its box's `minY` up to the surface.
 */
export interface RampSurface {
  axis: "x" | "z";
  from: number;
  to: number;
  y0: number;
  y1: number;
}

/** One collider of the collision model. Ids are stable so the renderer can toggle doors / move carts. */
export interface Collider extends Aabb {
  id: string;
  kind: ColliderKind;
  level: string;
  /** Owning entity (door, placement, slot, staff…), if any. */
  entity?: EntityId;
  /** Blocks line of sight (walls, partitions, closed doors, solid equipment taller than eye height). Windows: false. */
  opaque: boolean;
  /** Passable for path planning (doors open automatically unless locked). */
  passable: boolean;
  /** `ramp` colliders: the walkable surface (physics follows it; navigation treats the flight as a connector portal). */
  ramp?: RampSurface;
}

/**
 * Pure derivation of every collider of a facility (EMBODIED R2) — the single
 * source of truth for physics, navigation and visibility in every runtime.
 */
export interface CollisionModel {
  /** Walkable bounds (facility `bounds`). */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  colliders: Collider[];
  /** Door records (ids match renderer door records and `door:` entity ids). */
  doors: DoorSpec[];
  /** The wall layout the wall/partition/window/door colliders were derived from (the renderer draws the same walls). */
  walls: WallSpec[];
}

export interface DoorSpec {
  /** `door:<ownerKey>:<side>:<n>`; without the prefix it is the renderer's door record id. */
  id: EntityId;
  name: LocalizedText;
  level: string;
  kind: "door" | "double-door" | "sliding-door";
  centre: Vec2;
  /** Wall axis the door sits in. */
  axis: "x" | "z";
  width: number;
  /** Leaf height (m). */
  height: number;
  /** Interior (partition) door vs building entrance. */
  interior: boolean;
  /** Building or room whose wall the door is in, and the side of it. */
  owner: string;
  side: "n" | "s" | "e" | "w";
  /** Collider ids of the closed leaves. */
  colliders: string[];
  /** Rooms on either side (if any): [inside the owner's rect, outside]. */
  rooms: [string | null, string | null];
  /** Doorway area (opening × wall thickness / 2 + 0.9 m each side): a closing door would hit whoever stands here. */
  area: { minX: number; maxX: number; minZ: number; maxZ: number };
}

/* ------------------------------------------------------------------ */
/* Levels, connectors, access (core facility schema additions)         */
/* ------------------------------------------------------------------ */

export interface LevelInfo {
  id: string;
  name: LocalizedText;
  /** Floor elevation in metres (level L0 = 0). */
  elevation: number;
  /** Storey height (walls) in metres. */
  height: number;
}

export interface ConnectorInfo {
  id: EntityId;
  kind: "stairs" | "elevator" | "ramp";
  name: LocalizedText;
  /** Endpoints (one per level served; elevators may serve more than two). */
  stops: { level: string; x: number; z: number }[];
  /** Seconds to traverse between adjacent stops (stairs: per level). */
  travelSeconds: number;
  /** Usable by wheelchairs/beds (ramps, elevators). */
  accessible: boolean;
  /** Roles allowed (empty = everyone). */
  roles: string[];
}

export interface AccessZone {
  id: string;
  name: LocalizedText;
  level: string;
  rect: { x: number; z: number; w: number; d: number };
  /** Roles allowed to enter; others cannot plan through it (`ACCESS_DENIED`). */
  roles: string[];
}

/* ------------------------------------------------------------------ */
/* Semantic registry                                                   */
/* ------------------------------------------------------------------ */

/** Static, semantic description of one entity (independent of meshes). */
export interface SemanticEntity {
  id: EntityId;
  kind: EntityKind;
  /** Equipment type id, room kind, staff role, "patient", door kind, connector kind… */
  type: string;
  name: LocalizedText;
  level: string;
  /** Room id (without the `room:` prefix) or null outdoors / corridors without a room. */
  room: string | null;
  /** Footprint centre on the floor (level elevation applied to y). */
  position: Vec3;
  /** Degrees about +Y. */
  rot: number;
  /** Rotated footprint (w along X, d along Z, h up) — equipment, beds, patients, staff. */
  footprint?: { w: number; d: number; h: number };
  capabilities: string[];
  interaction: InteractionKind;
  /** Equipment that can be moved (`cart`: wheeled to a new spot; `handheld`: carried by an actor). */
  portable?: "cart" | "handheld";
  /** Interaction reach in metres from the footprint (defaults per interaction kind). */
  reach: number;
  /** Declared interaction points (equipment `interactionPoints`) in world coordinates. */
  interactionPoints?: Vec2[];
  tags: string[];
  /** Public descriptor (what a bystander sees): patient name tag / age-sex tag / posture; staff role and name. */
  public?: Record<string, string>;
  /** Equipment type (for equipment entities). */
  equipmentType?: EquipmentType;
}

/** Binding of the encounter to the world: the case's patient in its slot. */
export interface EncounterBinding {
  caseDef: CaseDefinition;
  /** Patient slot id the case is placed in (core `assignPatientSlot`, or chosen by the front-end). */
  slotId: string | null;
  locale: string;
}

/* ------------------------------------------------------------------ */
/* Physical state                                                      */
/* ------------------------------------------------------------------ */

/** Actor roles (core `ACTOR_ROLES`). */
export type ActorRole = CoreActorRole;

export interface ActorState {
  id: ActorId;
  role: ActorRole;
  /** Who drives this body right now. */
  controller: "human" | "agent" | "npc" | "script";
  pose: Pose;
  room: string | null;
  /** Current task (navigation / delegated task / skill), if any. */
  task: { id: string; kind: string; label: string; startedAt: number } | null;
  /** Handheld items carried (entity ids), at most `MAX_HELD`. */
  holding: EntityId[];
  /** Entity ids this actor has seen (EMBODIED R7 "remembered"). */
  seen: EntityId[];
  /** Simulated minute until which hand hygiene is valid (WHO moment 1), or null. */
  handsCleanUntil: number | null;
  /**
   * Where this actor last saw each movable thing it has perceived (portable
   * equipment, staff, other actors): what it believes while not perceiving
   * it (lead note 1). Absent until the first sighting.
   */
  lastSeen?: Record<EntityId, SeenPlace>;
}

/** A place where an actor saw something (its position, level and facing). */
export interface SeenPlace {
  level: string;
  x: number;
  y: number;
  z: number;
  rot?: number;
}

export const MAX_HELD = 2;

/** Stored (physical) state of one entity. Derived states (mirroring clinical facts) are never stored (EMBODIED R6). */
export interface EntityRuntimeState {
  /** Monotonic per-entity version (optimistic concurrency, EMBODIED R4). */
  version: number;
  /** Behaviour state (device state machine), if the entity has one. */
  state?: string;
  /** Behaviour data (e.g. ECG leads placed on which patient). */
  data?: Record<string, unknown>;
  /** Actor holding a reservation (multi-step operation), if any. */
  reservedBy?: ActorId | null;
  /** Moved cart / dropped item position (overrides the registry position). */
  position?: Vec3 & { level: string; rot?: number };
  /** Actor carrying a handheld item. */
  heldBy?: ActorId | null;
  /** Door state. */
  door?: { open: boolean; locked: boolean };
  /** Scenario-controlled availability (`out-of-service` devices). */
  available?: boolean;
}

/** Temporary obstacle (wet floor, blocked corridor) injected by a scenario or an instructor. */
export interface DynamicObstacle {
  id: string;
  level: string;
  rect: { x: number; z: number; w: number; d: number };
  label: LocalizedText;
}

/**
 * Read access to the physical state the static grids depend on (EMBODIED
 * §2): implemented by the world state store, read by the navigation grids
 * (`NavGrids`, `GridAStarBackend`) and the occlusion grids
 * (`VisibilityModel`). Door state is read at query/compose time; after a
 * change of locks, obstacles, displaced or removed entities call the
 * backend's / visibility model's `invalidate(area)`. Every member is optional.
 */
export interface WorldDynamics {
  /** Door state; absent = closed and unlocked (passable for planning, opaque for visibility). */
  doorState?(doorId: EntityId): { open: boolean; locked: boolean } | null | undefined;
  /** Temporary obstacles (wet floor, blocked corridor). */
  obstacles?(): readonly DynamicObstacle[];
  /** Portable entities away from their registry position (moved carts, dropped items). */
  displaced?(): readonly { id: EntityId; position: Vec3 & { level: string; rot?: number } }[];
  /** Entities without a body in the world right now (a carried handheld item). */
  removed?(): readonly EntityId[];
  /** Pose of an actor (`actor:*`) or of a staff member away from their post (follow goals). */
  actorPose?(id: ActorId): Pose | null | undefined;
}

export interface WorldStateSnapshot {
  format: "clinicalcraft-world@1";
  facilityId: string;
  version: number;
  actors: ActorState[];
  entities: Record<EntityId, EntityRuntimeState>;
  obstacles: DynamicObstacle[];
  /** Last results by action id (idempotency window). */
  results: WorldActionResult[];
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export type WorldEvent = (
  | { id: string; type: "actor.moved"; actorId: ActorId; from: Pose; to: Pose; distance: number; travelSeconds: number }
  | { id: string; type: "actor.entered-room"; actorId: ActorId; room: string | null; level: string }
  | { id: string; type: "actor.discovered"; actorId: ActorId; entities: EntityId[] }
  | { id: string; type: "entity.state"; entityId: EntityId; from: string | null; to: string | null; operation: string; actorId: ActorId }
  | { id: string; type: "entity.moved"; entityId: EntityId; to: Vec3 & { level: string }; actorId: ActorId }
  | { id: string; type: "item.held"; entityId: EntityId; actorId: ActorId; held: boolean }
  | { id: string; type: "door.changed"; entityId: EntityId; open: boolean; locked: boolean; actorId: ActorId | null }
  | { id: string; type: "reservation.changed"; entityId: EntityId; reservedBy: ActorId | null }
  | { id: string; type: "obstacle.changed"; obstacle: DynamicObstacle; present: boolean }
  /** Scenario control: a device taken out of service (`available: false`) or back in service. */
  | { id: string; type: "entity.availability"; entityId: EntityId; available: boolean }
  | { id: string; type: "hygiene"; actorId: ActorId; until: number }
  | { id: string; type: "task.changed"; actorId: ActorId; task: ActorState["task"] }
  | { id: string; type: "action.completed"; actionId: string; actorId: ActorId; operation: string; status: WorldActionResult["status"]; errorCode?: WorldErrorCode }
) & {
  /**
   * The actor an action was done for (`WorldActionRequest.onBehalfOf`, a
   * delegated task): its observations report the event as its delegate's.
   */
  onBehalfOf?: ActorId;
};

export interface WorldEventSummary {
  id: string;
  type: WorldEvent["type"];
  /** Localised one-line summary. */
  summary: string;
}

/* ------------------------------------------------------------------ */
/* Perception                                                          */
/* ------------------------------------------------------------------ */

/** Epistemic level of an observed entity (EMBODIED R7). */
export type Awareness = "visible" | "nearby" | "remembered" | "mapped";

export interface PerceptionOptions {
  /** Max distance for `visible` (m). Default 15. */
  visibilityRange: number;
  /** Horizontal field of view (degrees). Default 120. */
  fovDeg: number;
  /** Radius for `nearby` (m, same level). Default 8. */
  nearbyRange: number;
  /** Max entities per observation (nearest first). Default 40. */
  maxEntities: number;
  /** Include reachability (path planning per entity) — costlier. Default true for ≤ maxEntities. */
  reachability: boolean;
}

export const DEFAULT_PERCEPTION: PerceptionOptions = { visibilityRange: 15, fovDeg: 120, nearbyRange: 8, maxEntities: 40, reachability: true };

export interface ObservedEntity {
  id: EntityId;
  kind: EntityKind;
  type: string;
  /** Localised name (patients: their display name + public tag). */
  name: string;
  level: string;
  room: string | null;
  /** Metres from the actor to the entity footprint. */
  distance: number;
  /** Degrees relative to the actor's facing (−180…180, + = right). */
  bearing: number;
  awareness: Awareness;
  visible: boolean;
  /** A path exists for this actor (null = not computed). */
  reachable: boolean | null;
  pathDistance?: number;
  /** Within interaction reach with line of sight right now. */
  inReach: boolean;
  capabilities?: string[];
  /** Behaviour state (stored or derived), e.g. "idle", "attached", "open". */
  state?: string;
  stateVersion: number;
  /** Operations offered now (depend on the behaviour, its state and the actor's role). */
  availableActions: string[];
  /** Bystander-visible cues (patients: posture, distressed, accessory; monitors: screen summary when visible). */
  cues?: Record<string, string>;
  /**
   * A movable thing not perceived now is reported where the actor believes
   * it is (lead note 1), and this says which belief: `usual` — where the
   * department keeps it (portable equipment not seen yet); `last-seen` —
   * where the actor last saw it (it may have moved since). `level`, `room`,
   * distances, bearing and reachability then measure to that place. Absent
   * for perceived things and things that never move.
   */
  lastKnown?: { kind: "usual" | "last-seen"; label: string };
}

export interface WorldObservation {
  observationId: string;
  worldVersion: number;
  /** Simulated clinical minute. */
  clock: number;
  actor: { id: ActorId; role: ActorRole; pose: Pose; room: string | null; roomName: string | null; level: string; task: ActorState["task"]; holding: EntityId[] };
  entities: ObservedEntity[];
  truncated: boolean;
  recentEvents: WorldEventSummary[];
}

export interface EntityQuery {
  kind?: EntityKind | EntityKind[];
  /** Equipment type id / staff role / room kind. */
  type?: string;
  /** Every capability required. */
  capabilities?: string[];
  /** Case-insensitive substring of the localised name (either locale). */
  name?: string;
  room?: string;
  level?: string;
  /** Only entities this actor is aware of at these levels (default: visible, nearby, remembered, mapped). */
  awareness?: Awareness[];
  maxDistance?: number;
  visibleOnly?: boolean;
  reachableOnly?: boolean;
  /** Sort by straight-line or path distance (default "path" when reachability is computed). */
  sort?: "distance" | "path";
  limit?: number;
}

/** Facts about the patient the world may show (supplied by the session; never case answers). */
export interface PatientCues {
  posture?: "standing" | "sitting" | "lying";
  distressed?: boolean;
  accessory?: string | null;
  speaking?: boolean;
}

/** Read-only view of the clinical side the world needs (supplied by the session). */
export interface ClinicalView {
  caseDef: CaseDefinition;
  state(): SessionState;
  /** Bedside snapshot as `check_vitals` shows it (monitor screens show this when visible and attached). */
  bedside(): VitalsSnapshot | null;
  cues(slotId: string): PatientCues;
  /** Simulated minute (state().clock). */
  clock(): number;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

/** Goals (mineflayer-pathfinder semantics, EMBODIED §7). Ranges in metres from the target footprint. */
export type NavGoal =
  | { kind: "point"; x: number; z: number; level?: string; range?: number }
  | { kind: "entity"; id: EntityId; range?: number }
  | { kind: "interact"; id: EntityId; operation?: string }
  | { kind: "room"; id: string }
  | { kind: "follow"; id: EntityId; range?: number }
  | { kind: "look"; id: EntityId; range?: number }
  | { kind: "any"; goals: NavGoal[] };

export type NavErrorCode =
  | "TARGET_NOT_FOUND"
  | "TARGET_NOT_REACHABLE"
  | "PATH_BLOCKED"
  | "STALE_DESTINATION"
  | "MOVEMENT_INTERRUPTED"
  | "NAVIGATION_TIMEOUT"
  | "ACCESS_DENIED"
  | "NO_INTERACTION_POINT";

export interface PathPoint {
  x: number;
  z: number;
  level: string;
  /** Connector used to reach this point from the previous one, if any. */
  via?: EntityId;
}

export interface NavRequest {
  actorId: ActorId;
  from: Pose;
  goal: NavGoal;
  role: ActorRole;
  /** Max A* expansions per level segment. */
  maxExpanded?: number;
  /** Only connectors usable with a wheelchair, bed or cart (no stairs) — e.g. while pushing a cart. */
  accessibleOnly?: boolean;
}

export type NavPlan =
  | {
      ok: true;
      goal: NavGoal;
      path: PathPoint[];
      /** Metres along the path (connectors count their walking length). */
      length: number;
      /** Walking time at the avatar's speed plus connector times. */
      travelSeconds: number;
      /** Final pose (facing the target for interact/look goals). */
      target: Pose;
      /** The entity whose interaction point was chosen (interact/any goals). */
      targetEntity?: EntityId;
    }
  | { ok: false; goal: NavGoal; code: NavErrorCode; message: string; details?: Record<string, unknown> };

/** Pluggable planner (EMBODIED R12). The default is the grid A* with a level portal graph. */
export interface NavigationBackend {
  readonly id: string;
  plan(request: NavRequest): NavPlan;
  /** Recompute blocked cells in an area (moved cart, door locked, obstacle). */
  invalidate(area?: { level: string; minX: number; maxX: number; minZ: number; maxZ: number }): void;
}

/** Walking speed used for travel time (the avatar's walk speed, V4 PHYSICS.speed). */
export const WALK_SPEED = 3.9;

/** Navigation telemetry (EMBODIED §7, proposal §8.5). */
export interface NavigationRecord {
  actionId: string;
  actorId: ActorId;
  goal: NavGoal;
  ok: boolean;
  code?: NavErrorCode;
  length: number;
  replans: number;
  travelSeconds: number;
  arrivalError: number;
  path: PathPoint[];
}

/* ------------------------------------------------------------------ */
/* Spatial policy                                                      */
/* ------------------------------------------------------------------ */

/**
 * What a clinical tool call needs (EMBODIED §6). `at-provider` with
 * `fixedOnly`: only non-portable providers count (a station or request
 * terminal — the alternative to bringing a bedside device to the patient);
 * `providerKinds` narrows the interaction kinds that count (default
 * workstation, device, monitor). `bedside-provider` `delivered`:
 * capabilities whose goods are delivered to the bedside
 * (`DELIVERED_CAPABILITIES`: pharmacy-dispensed drugs, blood products) — they
 * need an in-service provider somewhere in the facility, never one at the
 * bedside. `at-patient` `why`: what is done there (`sample`: the specimen is
 * taken at the patient; `observations`: vitals by hand), for the message.
 * `monitor-screen`: the patient's attached monitor read from its screen —
 * within `range` with line of sight from the monitor's own room.
 * `clinical`: a fact of the patient's clinical state the engine must hold
 * (`condition`, core Condition DSL) — e.g. IV access before an IV drug, a
 * sample before a lab order; `need` names it, `interventionId` the
 * intervention that establishes it. `all-of`: every option must hold.
 */
export type SpatialRequirement =
  | { kind: "anywhere" }
  | { kind: "near-patient"; range: number; lineOfSight: boolean }
  | { kind: "at-patient"; range: number; why?: "sample" | "observations" }
  | { kind: "at-provider"; capabilities: string[]; range?: number; fixedOnly?: boolean; providerKinds?: InteractionKind[] }
  | { kind: "bedside-provider"; capabilities: string[]; patientRange: number; delivered?: string[] }
  | { kind: "monitor-screen"; range: number }
  | { kind: "clinical"; condition: Condition; need: "iv-access" | "sample" | (string & {}); interventionId?: string }
  | { kind: "any-of"; options: SpatialRequirement[] }
  | { kind: "all-of"; options: SpatialRequirement[] };

/** The clinical tool call being checked, in engine terms (no dependency on the agent package). */
export interface ClinicalIntent {
  tool: string;
  kind: "ask" | "examine" | "vitals" | "order" | "read" | "intervene" | "consult" | "delegate" | "cognitive";
  itemId?: string;
  findingId?: string;
  investigationId?: string;
  interventionId?: string;
  /** Staff role/agent for consult/delegate. */
  agent?: string;
}

export type SpatialErrorCode = "SPATIAL_REQUIREMENT_UNMET" | "SPATIAL_PRECONDITION_CHANGED";

export type SpatialCheck =
  | { ok: true; requirement: SpatialRequirement; satisfiedBy: EntityId[] }
  | {
      ok: false;
      code: SpatialErrorCode;
      requirement: SpatialRequirement;
      /**
       * Which part failed: "not-near-patient", "not-at-patient", "patient-not-visible", "no-provider-in-reach",
       * "provider-not-at-bedside" (hint: fetch the cart and `move_to` it to the patient; null when none can be brought),
       * "provider-busy" (every provider at the bedside is reserved by someone else; hint: an alternative to fetch),
       * "no-monitor-attached", "monitor-not-in-view", "clinical-prerequisite" (no hint: `details.prerequisite` names
       * the tool call that establishes it), "no-provider-in-facility", "no-patient" (no patient bound to the world).
       */
      reason: string;
      /** Localised explanation. */
      message: string;
      /** Where to go: pass `hint.goal` to `navigate_to` (null when nothing in the facility satisfies it). */
      hint: { goal: NavGoal; label: string } | null;
      /** Measurements behind the reason: `distance`, `range`, `missing` capabilities, `providers`… */
      details?: Record<string, unknown>;
    };

export interface SpatialPolicy {
  requirementFor(intent: ClinicalIntent, binding: EncounterBinding): SpatialRequirement;
}

/** Bedside radius around the patient slot (same as the web world's `BEDSIDE_RADIUS`). */
export const BEDSIDE_RADIUS = 6;

/** Default ranges (m, from the target footprint). */
export const RANGES = { talk: 3, contact: 1.5, screen: 6, interact: 1.5 } as const;

/* ------------------------------------------------------------------ */
/* Device behaviours (catalog `behavior`, EMBODIED §8)                 */
/* ------------------------------------------------------------------ */

/**
 * World predicates (preconditions of operations, skill pre/postconditions) —
 * the core catalog schema's `WorldPredicate` (zod-validated in catalogs).
 */
export type WorldPredicate = CoreWorldPredicate;

/**
 * The clinical side of an operation: a clinical tool run through the
 * session's tool path. `select`: "param" (operation parameter
 * `investigation` / `intervention` / `finding`), the first case item whose
 * `requires` is provided by this device (`capability`), or the case's
 * monitoring intervention (`monitoring`).
 */
export type ClinicalEffect = CoreClinicalEffect;

/** One operation of a device behaviour (core `BehaviorOperation`): `from` states ("*" = any), `to`, `requires`, `clinical`, `durationSeconds`, `reserve`/`release`, `roles`. */
export type BehaviorOperation = CoreBehaviorOperation;

/** Declarative device state machine (core `DeviceBehavior`); `derived` states mirror the engine and are never stored (EMBODIED R6). */
export type DeviceBehavior = CoreDeviceBehavior;

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** Generic operations; device-specific operations come from behaviours. */
export type WorldOperation =
  | "navigate"
  | "approach"
  | "look_at"
  | "interact"
  | "open"
  | "close"
  | "lock"
  | "unlock"
  | "pick_up"
  | "put_down"
  | "equip"
  | "move_to"
  | "wash_hands"
  | "cancel"
  | (string & {});

export interface WorldActionRequest {
  /** Caller-chosen id; a retried request with the same id returns the recorded result. */
  actionId: string;
  actorId: ActorId;
  operation: WorldOperation;
  targetId?: EntityId;
  goal?: NavGoal;
  parameters?: Record<string, unknown>;
  /** Strict global check (rarely needed). */
  expectedWorldVersion?: number;
  /** Optimistic concurrency on the target entity (recommended). */
  expectedTargetVersion?: number;
  /**
   * The actor this action is done for (a delegated task, EMBODIED §8): the
   * events it causes are that actor's to observe, wherever it is (G13).
   */
  onBehalfOf?: ActorId;
}

export type WorldErrorCode =
  | NavErrorCode
  | SpatialErrorCode
  | "INVALID_REQUEST"
  | "UNKNOWN_ACTOR"
  | "OPERATION_NOT_SUPPORTED"
  | "PRECONDITION_FAILED"
  | "NOT_IN_RANGE"
  | "NOT_VISIBLE"
  | "NOT_AUTHORIZED"
  | "DEVICE_BUSY"
  | "DEVICE_UNAVAILABLE"
  | "STALE_STATE"
  | "HANDS_FULL"
  | "NOT_HOLDING"
  | "CANCELLED"
  | "CLINICAL_REJECTED"
  | "APPROVAL_DENIED";

export interface WorldActionResult {
  actionId: string;
  status: "completed" | "failed" | "cancelled";
  errorCode?: WorldErrorCode;
  /** Localised, model- and learner-facing. */
  message: string;
  worldVersion: number;
  targetVersion?: number;
  /** Navigation details (navigate/approach/move_to). */
  navigation?: NavigationRecord;
  /** Simulated seconds this action took (travel + operation duration). */
  elapsedSeconds?: number;
  /** Outcome of the clinical effect (tool name, ok, output) — present when a clinical tool ran. */
  clinical?: { tool: string; ok: boolean; output: string };
  /** Ids of engine domain events caused by the clinical effect. */
  clinicalEventIds?: string[];
  events: WorldEvent[];
  /** Where to go / what to do next when the failure is recoverable. */
  hint?: { goal: NavGoal; label: string } | null;
}

/** Result of running a clinical tool through the session's tool path (hooks → precheck → approval → engine). */
export interface ClinicalInvokeResult {
  ok: boolean;
  output: string;
  /** "denied" when the approval gate or a hook refused; "rejected" when the engine refused. */
  outcome: "ok" | "denied" | "rejected" | "error" | "cancelled";
  clinicalEventIds: string[];
}

/** The session side the action bus calls for clinical effects (EMBODIED R3: one path to a clinical effect). */
export interface ClinicalPort {
  invoke(actorId: ActorId, tool: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ClinicalInvokeResult>;
  /** Charge simulated time (travel, operation duration): `advance-time { reason }` on simulated clocks; no-op on static clocks. */
  elapse(seconds: number, reason: "travel" | "procedure"): void;
}

/**
 * Moves bodies along planned paths. Headless: instant. Browser: animates the
 * avatar/NPC rig and resolves on arrival (EMBODIED §2). The world commits the
 * pose the mover reports.
 */
export interface Mover {
  move(actorId: ActorId, plan: Extract<NavPlan, { ok: true }>, signal?: AbortSignal): Promise<{ arrived: boolean; pose: Pose; replans: number }>;
  /** Show a moved cart / held item (browser); headless no-op. */
  placeEntity?(entityId: EntityId, position: (Vec3 & { level: string; rot?: number }) | null): void;
  /** Door animation (browser); headless no-op. */
  setDoor?(entityId: EntityId, open: boolean): void;
}

/** Camera frames (browser runtime only; EMBODIED §4). */
export interface CameraSensor {
  frame(actorId: ActorId, opts: { maxWidth: number; quality: number }): Promise<CameraObservation | null>;
}

export interface CameraObservation {
  mimeType: "image/png" | "image/jpeg";
  /** Base64 (no data: prefix). */
  imageData: string;
  width: number;
  height: number;
  /** Simulated minute and wall time (ms since epoch, injected clock). */
  clock: number;
  timestamp: number;
  cameraPose: Pose;
}

/* ------------------------------------------------------------------ */
/* The runtime                                                          */
/* ------------------------------------------------------------------ */

export interface WorldRuntimeOptions {
  facility: FacilityDefinition;
  catalogs: EquipmentCatalog[];
  binding: EncounterBinding;
  clinical: ClinicalView;
  /**
   * The session's tool path (EMBODIED R3): operations with a clinical effect
   * run their tool through it, and travel / procedure time is charged with
   * `elapse`. Without a port, clinical operations fail (`CLINICAL_REJECTED`)
   * and no time is charged.
   */
  port?: ClinicalPort;
  /** Injected clock (ms) and id generator (determinism). */
  now: () => number;
  newId: () => string;
  perception?: Partial<PerceptionOptions>;
  policy?: SpatialPolicy;
  backend?: NavigationBackend;
  mover?: Mover;
  camera?: CameraSensor;
  /** Restore physical state (resume). */
  snapshot?: WorldStateSnapshot;
  /** Initial pose of the primary actor (default: facility spawn). */
  spawn?: Pose;
  /** Receives one span per world action and observation (EMBODIED §10; `TraceRecorder` implements it). */
  trace?: TraceSink;
}

/**
 * One world per encounter. Every state-changing method goes through the
 * action bus (validation, authority, preconditions, spatial checks, clinical
 * effect via `ClinicalPort`, TOCTOU re-check, commit, events).
 */
export interface WorldRuntime {
  readonly facility: FacilityDefinition;
  readonly levels: LevelInfo[];
  readonly collision: CollisionModel;
  readonly version: number;

  /* registry */
  entity(id: EntityId): SemanticEntity | null;
  entities(): SemanticEntity[];
  /** Resolve a possibly unprefixed id ("ecg-cart-01" → "eq:ecg-cart-01") when unambiguous. */
  resolveId(idOrAlias: string): EntityId | null;

  /* actors */
  actor(id: ActorId): ActorState | null;
  actors(): ActorState[];
  /** Sensor update from a human-controlled body (browser, ~10 Hz). Not an action; bumps only the actor's own version. */
  updatePose(actorId: ActorId, pose: Pose): void;

  /* perception (read-only) */
  observe(actorId: ActorId, opts?: Partial<PerceptionOptions>): WorldObservation;
  find(actorId: ActorId, query: EntityQuery): ObservedEntity[];
  inspect(actorId: ActorId, id: EntityId): (ObservedEntity & { description: string; usage?: string; operations: { op: string; name: string; available: boolean; reason?: string }[] }) | null;
  roomInfo(actorId: ActorId, roomId?: string): { id: string; name: string; kind: string; level: string; exits: { door: EntityId; to: string | null; toName: string }[]; entities: ObservedEntity[] } | null;
  canSee(actorId: ActorId, id: EntityId): boolean;
  /**
   * Localised name of where a point is (lead note 2): its room; in no room
   * inside a building, that building's corridor; outdoors, the facility's
   * outdoor region (`outdoorRegion`, e.g. "Healing Garden").
   */
  regionName(at: { level: string; x: number; z: number }): string;

  /* navigation (read-only planning) */
  plan(actorId: ActorId, goal: NavGoal): NavPlan;

  /* spatial policy */
  /**
   * Is the actor where `intent` can be carried out (EMBODIED §6)? The session
   * calls it before the approval gate and again (`recheck: true`, failures
   * then carry `SPATIAL_PRECONDITION_CHANGED`) immediately before the engine commit.
   */
  checkSpatial(actorId: ActorId, intent: ClinicalIntent, opts?: { recheck?: boolean }): SpatialCheck;
  /**
   * THE bedside rule (EMBODIED §6), where the entity stands now (a moved cart
   * where it was parked, a carried item with its holder): on the patient
   * slot's level, and in the slot's room — or within `BEDSIDE_RADIUS` of the
   * slot point and visible from it or a short walk away, across a room
   * boundary only for an open slot (outdoors) or a cart just outside the
   * room. Never through a wall. The policy, device preconditions, the
   * patient's monitor, delegation, skills and the benchmark all use it.
   * False for unknown ids and without a patient slot.
   */
  atBedside(id: EntityId): boolean;
  /** In-service equipment providing `capability` that is at the bedside now (`atBedside`), in registry order. */
  bedsideProviders(capability: string): EntityId[];

  /* actions */
  execute(request: WorldActionRequest, signal?: AbortSignal): Promise<WorldActionResult>;
  /** Last result of an action (feedback / idempotency). */
  feedback(actionId: string): WorldActionResult | null;
  cancel(actorId: ActorId): boolean;

  /* scenario / instructor controls (benchmark, tests) */
  setObstacle(obstacle: DynamicObstacle, present: boolean): void;
  setAvailability(id: EntityId, available: boolean): void;
  setDoor(id: EntityId, state: { open?: boolean; locked?: boolean }): void;

  /* events & persistence */
  subscribe(listener: (event: WorldEvent, version: number) => void): () => void;
  snapshot(): WorldStateSnapshot;
}

/* ------------------------------------------------------------------ */
/* Traces (EMBODIED §10)                                               */
/* ------------------------------------------------------------------ */

export type TraceSpanKind = "observation" | "plan" | "navigation" | "interaction" | "clinical_action" | "state_change" | "verification" | "assessment";

export interface TraceSpan {
  id: string;
  parentId: string | null;
  kind: TraceSpanKind;
  /** Tool or operation name. */
  name: string;
  actorId: ActorId | null;
  /** Wall-clock ms (injected) and simulated minute at start/end. */
  startedAt: number;
  endedAt: number;
  clockStart: number;
  clockEnd: number;
  worldVersion: number;
  ok: boolean;
  /** Action id, clinical event ids, entity ids, error code… */
  refs: { actionId?: string; clinicalEventIds?: string[]; entities?: EntityId[]; errorCode?: string };
  /** Small structured payload (no large blobs, no secrets). */
  data?: Record<string, unknown>;
}

export interface EpisodeTrace {
  format: "clinicalcraft-trace@1";
  episodeId: string;
  caseId: string;
  facilityId: string;
  embodiment: "clinical" | "embodied";
  spans: TraceSpan[];
}

/** Where the runtime writes spans (`TraceRecorder` implements it): `add` assigns the span id. */
export interface TraceSink {
  add(span: Omit<TraceSpan, "id">): TraceSpan;
}

/* ------------------------------------------------------------------ */
/* Re-exports for convenience                                          */
/* ------------------------------------------------------------------ */

export type { Condition };
