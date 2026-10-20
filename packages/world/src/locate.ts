/**
 * Where things are right now: the registry's static positions overlaid with
 * the physical state (moved carts, carried items, walking actors and staff),
 * and the spatial measures every dynamic module shares — distance from a
 * pose to an entity's current footprint, line of sight at eye height,
 * effective interaction reach, and THE bedside rule (`bedside.ts`: in the
 * slot's room, or within `BEDSIDE_RADIUS` of the slot point and visible from
 * it or a short walk away — across a room boundary only for an open slot or
 * a cart just outside; never through a wall).
 */
import { buildingLevels, rectContains, t, type FacilityDefinition, type PatientSlot } from "@clinicalcraft/core";
import { BedsideRule } from "./bedside.js";
import { RANGES, type ActorId, type ActorState, type EntityId, type EntityKind, type EntityRuntimeState, type Pose, type SeenPlace, type SemanticEntity, type Vec2, type Vec3 } from "./contracts.js";
import { rotateXZ, rotatedFootprint } from "./geometry.js";
import { roleName, worldMessage } from "./i18n.js";
import { entityLevel } from "./levels.js";
import { MIN_RANGE } from "./nav/backend.js";
import type { NavGrids } from "./nav/grid.js";
import { distanceToArea, footprintArea, type Area } from "./raster.js";
import type { PatientBody } from "./patient.js";
import { BODY_FOOTPRINT, type SemanticRegistry } from "./registry.js";
import type { SightTarget, VisibilityModel } from "./visibility.js";

/** The parts of the state store the locator reads. */
export interface StateView {
  actor(id: ActorId): ActorState | null;
  actors(): ActorState[];
  entity(id: EntityId): Readonly<EntityRuntimeState> | undefined;
  available(id: EntityId): boolean;
}

/** An entity where it is now. */
export interface Placed {
  id: EntityId;
  kind: EntityKind;
  /** Static description (null for `actor:*` bodies). */
  entity: SemanticEntity | null;
  level: string;
  position: Vec3;
  rot: number;
  footprint?: { w: number; d: number; h: number };
  /** Ground footprint (a 0.2 m square around point-like entities). */
  area: Area;
  room: string | null;
  /** Carried by this actor (a handheld item travels with its holder). */
  heldBy?: ActorId;
  /** Declared interaction points where the entity stands now (world coordinates). */
  interactionPoints?: Vec2[];
}

/** Shared spatial queries over the static registry and the physical state. */
export class WorldLocator {
  /** The case's patient slot (the binding: the patient's identity `patient:<slot>`; where they are now is `patientBody`). */
  readonly slot: PatientSlot | null;
  readonly patientId: EntityId | null;
  /** The bedside rule of this encounter (`bedside.ts`), measured from where the patient is now. */
  readonly bedside: BedsideRule;
  private readonly monitorIds: EntityId[];

  constructor(
    readonly facility: FacilityDefinition,
    readonly registry: SemanticRegistry,
    readonly state: StateView,
    readonly visibility: VisibilityModel,
    readonly locale: string,
    slotId: string | null,
    /** The navigation grids (walking distances of the bedside rule); null with a custom backend. */
    grids: NavGrids | null = null,
    /** The patient's body: where the patient is now (EMBODIED §8); null: always in the case's slot. */
    readonly patientBody: PatientBody | null = null,
  ) {
    this.monitorIds = registry.ofKind("equipment").filter((e) => e.interaction === "monitor").map((e) => e.id);
    this.slot = (slotId ? facility.patientSlots.find((s) => s.id === slotId) : undefined) ?? null;
    this.patientId = this.slot && registry.entity(`patient:${this.slot.id}`) ? `patient:${this.slot.id}` : null;
    const slot = this.slot;
    const anchor = () => {
      if (this.patientBody) return this.patientBody.anchor();
      return slot ? { level: entityLevel(facility, slot), x: slot.x, z: slot.z, room: slot.room } : null;
    };
    this.bedside = new BedsideRule({ facility, visibility, grids, anchor, sight: (p) => this.sight(p) });
  }

  /** Localised display name of an entity or actor (patients: their display name). */
  name(id: EntityId): string {
    const e = this.registry.entity(id);
    if (e) return t(e.name, this.locale);
    const a = this.state.actor(id);
    return a ? roleName(a.role, this.locale) : id;
  }

  /** Where an entity (or actor) is now; null for unknown ids. */
  place(id: EntityId): Placed | null {
    if (id === this.patientId && this.patientBody) return this.patientPlaced();
    const e = this.registry.entity(id);
    const actor = this.state.actor(id);
    if (actor && (!e || e.kind === "staff")) return this.bodyAt(id, e, { level: actor.pose.level, x: actor.pose.x, y: actor.pose.y, z: actor.pose.z, rot: actor.pose.yaw / (Math.PI / 180) }, actor.room);
    if (!e) return null;
    const s = this.state.entity(id);
    if (s?.heldBy) {
      const holder = this.state.actor(s.heldBy);
      if (holder) {
        const position = { x: holder.pose.x, y: holder.pose.y, z: holder.pose.z };
        return { id, kind: e.kind, entity: e, level: holder.pose.level, position, rot: e.rot, area: footprintArea({ position }), room: holder.room, heldBy: holder.id };
      }
    }
    return s?.position ? this.movedTo(e, s.position) : this.home(id);
  }

  /** The patient where the body is now (its place: a bed space or a provider, the posture's footprint). */
  private patientPlaced(): Placed | null {
    const e = this.registry.entity(this.patientId!);
    const p = this.patientBody!.place();
    if (!e || !p) return null;
    const position = { x: p.x, y: p.y, z: p.z };
    return { id: e.id, kind: e.kind, entity: e, level: p.level, position, rot: p.rot, footprint: p.footprint, area: footprintArea({ position, footprint: p.footprint }), room: p.room };
  }

  /** The patient's posture now (the place's, else the clinical one); null without a patient. */
  patientPosture(): string | null {
    if (this.patientBody) return this.patientBody.state() ? this.patientBody.posture() : null;
    return this.patientId ? (this.registry.entity(this.patientId)?.public?.posture ?? null) : null;
  }

  /** Where an entity is kept: its placement in the facility (null for actors' bodies and unknown ids). */
  home(id: EntityId): Placed | null {
    const e = this.registry.entity(id);
    if (!e) return null;
    const placed: Placed = { id, kind: e.kind, entity: e, level: e.level, position: { ...e.position }, rot: e.rot, footprint: e.footprint, area: footprintArea(e), room: e.room };
    if (e.interactionPoints) placed.interactionPoints = e.interactionPoints.map((pt) => ({ ...pt }));
    return placed;
  }

  /**
   * An entity or actor as if it stood at `at` (where an actor last saw it,
   * lead note 1): an entity with its footprint turned to `at.rot`, a body
   * standing there; null for unknown ids.
   */
  placedAt(id: EntityId, at: SeenPlace): Placed | null {
    const e = this.registry.entity(id);
    if (this.state.actor(id) && (!e || e.kind === "staff")) return this.bodyAt(id, e, at, this.registry.roomAt(at.level, at.x, at.z));
    return e ? this.movedTo(e, at) : null;
  }

  private bodyAt(id: EntityId, e: SemanticEntity | null, at: SeenPlace, room: string | null): Placed {
    const fp = { ...BODY_FOOTPRINT.standing };
    const position = { x: at.x, y: at.y, z: at.z };
    return { id, kind: e?.kind ?? "actor", entity: e, level: at.level, position, rot: at.rot ?? 0, footprint: fp, area: footprintArea({ position, footprint: fp }), room };
  }

  private movedTo(e: SemanticEntity, p: SeenPlace): Placed {
    const rot = p.rot ?? e.rot;
    const type = e.equipmentType;
    const footprint = type ? { ...rotatedFootprint(type.footprint.w, type.footprint.d, rot), h: type.footprint.h } : e.footprint;
    const position = { x: p.x, y: p.y, z: p.z };
    const placed: Placed = { id: e.id, kind: e.kind, entity: e, level: p.level, position, rot, footprint, area: footprintArea({ position, footprint }), room: this.registry.roomAt(p.level, p.x, p.z) };
    const points = type?.interactionPoints?.map((pt) => {
      const [dx, dz] = rotateXZ(pt.x, pt.z, rot);
      return { x: p.x + dx, z: p.z + dz };
    });
    if (points) placed.interactionPoints = points;
    return placed;
  }

  /**
   * Localised name of where a point is (lead note 2): the room it is in; in
   * no room but inside a building, that building's corridor; outdoors, the
   * facility's outdoor region (e.g. "Healing Garden") — never "a corridor".
   */
  regionName(at: { level: string; x: number; z: number }, locale: string = this.locale): string {
    const room = this.registry.roomAt(at.level, at.x, at.z);
    const e = room ? this.registry.entity(`room:${room}`) : null;
    if (e) return t(e.name, locale);
    const building = this.facility.buildings
      .filter((b) => rectContains(b.rect, at.x, at.z) && buildingLevels(this.facility, b).includes(at.level))
      .sort((a, b) => a.rect.w * a.rect.d - b.rect.w * b.rect.d)[0];
    if (building) return worldMessage("region.corridor", locale, { building: t(building.name, locale) });
    return t(this.facility.outdoorRegion, locale);
  }

  /** Sight target of a placed entity (its current footprint). */
  sight(p: Placed): SightTarget {
    return p.footprint ? { level: p.level, position: p.position, footprint: p.footprint, id: p.id } : { level: p.level, position: p.position, id: p.id };
  }

  /** Metres from a pose to the entity's current footprint (Infinity on another level). */
  distance(pose: Pick<Pose, "x" | "z" | "level">, p: Placed): number {
    if (pose.level !== p.level) return Infinity;
    return distanceToArea(pose.x, pose.z, p.area);
  }

  /** Line of sight at eye height from a pose to any sample of the entity (no field-of-view test). */
  lineOfSight(pose: Pick<Pose, "x" | "z" | "level">, p: Placed): boolean {
    if (pose.level !== p.level) return false;
    if (p.heldBy) return true;
    return this.visibility.visibleFrom(pose.level, pose, this.sight(p));
  }

  /**
   * Effective interaction reach of an entity (m from its footprint): its
   * `reach` (patients: contact range; actors: talk range), never below
   * `MIN_RANGE` (the planner's smallest goal band), and covering its declared
   * interaction points (+ 0.75 m: the planner snaps a point to a free cell
   * within one ring).
   */
  reach(p: Placed): number {
    const base = p.entity ? p.entity.reach : RANGES.talk;
    let reach = Math.max(base, MIN_RANGE);
    for (const pt of p.interactionPoints ?? []) reach = Math.max(reach, distanceToArea(pt.x, pt.z, p.area) + 0.75);
    return reach;
  }

  /** The bound patient where they are now (null without a patient). */
  patient(): Placed | null {
    return this.patientId ? this.place(this.patientId) : null;
  }

  /** Level of the patient's place now (the case's slot without a body model). */
  slotLevel(): string | null {
    const a = this.patientBody?.anchor();
    if (a) return a.level;
    return this.slot ? entityLevel(this.facility, this.slot) : null;
  }

  /**
   * Is the entity at the patient's bedside now — THE bedside rule
   * (`bedside.ts`), where it stands now (a moved cart where it was parked, a
   * carried item with its holder).
   */
  atBedside(p: Placed): boolean {
    return this.bedside.at(p);
  }

  /**
   * The patient's monitors: the slot's linked monitor when it declares one,
   * otherwise every monitor at the bedside (their derived state mirrors the
   * engine's monitor attachment; other monitors have no patient on them).
   */
  isPatientMonitor(id: EntityId): boolean {
    if (!this.slot || !this.monitorIds.includes(id)) return false;
    // the bed space the patient is in now (none at a provider: a monitor at that bedside, the cath lab's)
    const here = this.patientBody ? this.patientBody.slotNow() : this.slot;
    const linked = here?.monitor && this.registry.entity(`eq:${here.monitor}`) ? `eq:${here.monitor}` : null;
    if (linked) return id === linked;
    const p = this.place(id);
    return !!p && this.atBedside(p);
  }

  /** The patient's monitor now (the bed space's linked one, else the first monitor at the bedside), or null. */
  patientMonitor(): EntityId | null {
    return this.monitorIds.find((id) => this.isPatientMonitor(id) && this.state.available(id)) ?? this.monitorIds.find((id) => this.isPatientMonitor(id)) ?? null;
  }

  /**
   * THE screen rule (EMBODIED §6 `monitor-screen`, extra review item 1): can a body at `pose` in `room` read
   * the screen of a monitor where it stands — the monitor's own room, the same level, within `range` of its
   * footprint (never below `MIN_RANGE`), with a line of sight; never through a window into another room. The
   * policy's `monitor-screen` option, the monitor's `read`, perception's screen cue and the web's screen all
   * use it.
   */
  screenInView(actor: { pose: Pick<Pose, "x" | "z" | "level">; room: string | null }, monitor: Placed, range: number = RANGES.screen): boolean {
    if (actor.pose.level !== monitor.level || actor.room !== monitor.room) return false;
    return this.distance(actor.pose, monitor) <= Math.max(range, MIN_RANGE) + 1e-6 && this.lineOfSight(actor.pose, monitor);
  }

  /** Capabilities an entity provides (equipment only; an out-of-service device provides nothing). */
  capabilities(id: EntityId): string[] {
    const e = this.registry.entity(id);
    if (!e || e.kind !== "equipment" || !this.state.available(id)) return [];
    return e.capabilities;
  }
}
