/**
 * The patient's body (EMBODIED §8, reviews G8 / G12): where the patient is — a bed space (a patient slot)
 * or a spot at a provider (on the CT table, on the cath-lab table beside the C-arm, in front of the
 * peak-flow station) or where a transport stopped — in which posture, on which support, with which trolley
 * (the wheeled bed that travels with them), and where a transport back goes (`home`); the body box the
 * planner must walk round; and how a destination resolves in this facility.
 *
 * Stored as the patient's `EntityRuntimeState.patient` once the patient first moves (absent: the case's
 * slot, its bed, the clinical posture) — physical state, in snapshots. The posture is the place's when it
 * forces one (lying on a table or a trolley, standing at a station), else the clinical one
 * (`ClinicalView.cues().posture`: an intervention's authored posture, else the case's) — derived, never
 * stored (EMBODIED R6).
 *
 * Positions follow the collision model's rules (`patientPose`): lying on a bed space's bed, the body spans
 * the bed and has no collider of its own; otherwise a body box at the slot point. At a spot: on a support
 * (sitting or lying) the support collides; standing, a body box.
 *
 * A patient who walks with someone (`escort`, EMBODIED §8.4) is where that actor is — half a step behind,
 * on the actor's side of any wall — standing, with no body box of their own (like a patient in transit): the
 * place is derived from the actor's pose, so a human avatar driven by its sensor takes the patient along
 * without a single stored step. Whether a patient can walk at all is `walkProblem`.
 */
import { capabilityLabels, t, type FacilityDefinition, type PatientSlot } from "@clinicalcraft/core";
import { PATIENT_PERFORMED_CAPABILITIES, TABLE_CAPABILITIES, TROLLEY_TYPES } from "./capabilities.js";
import { npcBodyBox } from "./collision.js";
import type { ActorId, BodyPosture, EntityId, EntityRuntimeState, NavGoal, PatientDestination, PatientPlace, PatientPlaceState, Pose, SemanticEntity } from "./contracts.js";
import { rotatedFootprint } from "./geometry.js";
import { listText, worldMessage } from "./i18n.js";
import { entityLevel, levelElevation } from "./levels.js";
import type { NavGrids } from "./nav/grid.js";
import { cellPoint, distanceToArea, footprintArea, type Area } from "./raster.js";
import { BODY_FOOTPRINT, type SemanticRegistry } from "./registry.js";
import type { SightTarget, VisibilityModel } from "./visibility.js";

/** Interaction kinds of the equipment a patient is brought to (a station or a scanner is a device; a terminal stands in only where no device provides the study). */
export const PATIENT_PROVIDER_KINDS = ["device"] as const;

/** A bed beside a provider counts as its patient support within the provider's reach plus this margin (m). */
const SUPPORT_MARGIN = 0.5;

/** Rings (m beyond a support or spot) searched for a free place to leave a trolley. */
const TROLLEY_RINGS = [1.25, 2, 3, 4];

export interface PatientBodyDeps {
  facility: FacilityDefinition;
  registry: SemanticRegistry;
  state: { entity(id: EntityId): Readonly<EntityRuntimeState> | undefined; available(id: EntityId): boolean };
  /** The case's slot (the binding), null without a patient. */
  slot: PatientSlot | null;
  /** The posture clinical state gives (`ClinicalView.cues(slot).posture`), when known. */
  clinicalPosture: () => BodyPosture | undefined;
  /** The posture the encounter started with (the registry's). */
  initialPosture: BodyPosture;
  /** The collision model's own body of the patient (floor area), null when it has none (on a bed or chair). */
  staticBody: Area | null;
  locale: string;
  /** The pose of an actor (whom a patient walks with), null when unknown. */
  actorPose?: (id: ActorId) => Pose | null;
  /** Clear sight between two points of a level (walls, partitions): a patient walking with someone stays on their side of a wall. */
  clear?: (level: string, a: { x: number; z: number }, b: { x: number; z: number }) => boolean;
  /** What clinical state shows of the patient now (distress, cannot speak) — whether they can walk with someone. */
  cues?: () => { distressed?: boolean; cannotSpeak?: string };
}

/** Why a patient cannot walk with someone (`walkProblem`): lying by clinical state, unable to respond, too unwell. */
export type WalkProblem = "lying" | "unresponsive" | "unwell";

/** Offsets (m: behind, right) of the spot beside an actor a patient walking with them takes, in order of preference. */
const ESCORT_OFFSETS: readonly [number, number][] = [
  [0.7, 0.45],
  [0.7, -0.45],
  [0.75, 0],
  [0, 0.8],
  [0, -0.8],
];

/** Where a destination takes the patient (before the trolley and home are settled). */
export interface PatientTarget {
  slot: string | null;
  provider: EntityId | null;
  spot: PatientPlaceState["spot"];
  /** Forced posture (null in a bed space: the clinical one). */
  posture: BodyPosture | null;
  /** What the patient lies or sits on there; `"trolley"`: on the trolley they travel with. */
  support: EntityId | "trolley" | null;
  /** Where a body that brought the patient stands at the end. */
  stand: NavGoal;
  /** Localised name of the place. */
  name: string;
}

const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const sameArea = (a: Area | null, b: Area | null) => (!a || !b ? a === b : same(a.minX, b.minX) && same(a.maxX, b.maxX) && same(a.minZ, b.minZ) && same(a.maxZ, b.maxZ));

/** Gap (m) between two floor areas (0 when they touch or overlap). */
export function areaGap(a: Area, b: Area): number {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const dz = Math.max(0, a.minZ - b.maxZ, b.minZ - a.maxZ);
  return Math.hypot(dx, dz);
}

/** The patient's body in one encounter (see the module docs). */
export class PatientBody {
  readonly id: EntityId | null;

  constructor(private readonly d: PatientBodyDeps) {
    this.id = d.slot && d.registry.entity(`patient:${d.slot.id}`) ? `patient:${d.slot.id}` : null;
  }

  /** The facility. */
  get facility(): FacilityDefinition {
    return this.d.facility;
  }

  private bedOf(slot: PatientSlot): EntityId | null {
    return slot.bed && this.d.registry.entity(`eq:${slot.bed}`) ? `eq:${slot.bed}` : null;
  }

  /** Is this equipment a trolley a patient is wheeled on (`TROLLEY_TYPES`)? */
  isTrolley(id: EntityId | null): boolean {
    const e = id ? this.d.registry.entity(id) : null;
    return !!e?.equipmentType && TROLLEY_TYPES.includes(e.equipmentType.id);
  }

  /** The place the encounter starts with: the case's slot, its bed (the trolley when it is one). */
  initial(): PatientPlaceState | null {
    const slot = this.d.slot;
    if (!slot || !this.id) return null;
    const bed = this.bedOf(slot);
    return { slot: slot.id, provider: null, home: { slot: slot.id, provider: null }, spot: null, posture: null, trolley: this.isTrolley(bed) ? bed : null, support: bed };
  }

  /** The stored place, else the initial one (null without a patient). */
  state(): PatientPlaceState | null {
    if (!this.id) return null;
    return this.d.state.entity(this.id)?.patient ?? this.initial();
  }

  /** Has the patient's place ever been stored (moved)? */
  moved(): boolean {
    return !!this.id && !!this.d.state.entity(this.id)?.patient;
  }

  /**
   * The posture now: standing beside the actor they walk with, else the place's, else the one they took when asked
   * (while clinical state still gives the posture it was asked over), else the clinical one, else the encounter's.
   */
  posture(st: PatientPlaceState | null = this.state()): BodyPosture {
    if (this.escort(st)) return "standing";
    if (st?.posture) return st.posture;
    const clinical = this.d.clinicalPosture() ?? this.d.initialPosture;
    return st?.asked && st.asked.over === clinical ? st.asked.posture : clinical;
  }

  /** The posture clinical state gives (an intervention's authored posture, else the case's), whatever the place forces or the patient was asked. */
  clinicalPostureOf(st: PatientPlaceState | null = this.state()): BodyPosture {
    return this.posture(st ? { ...st, posture: null, escort: null, asked: null } : null);
  }

  /** Does clinical state have the patient on their feet (an ambulatory patient: walks where a transport takes them)? */
  walks(st: PatientPlaceState | null = this.state()): boolean {
    return this.clinicalPostureOf(st) === "standing";
  }

  /**
   * Why the patient cannot walk with someone now (null: they can): clinical state has them lying, they cannot
   * respond (`cannotSpeak`: intubated, sedated, unconscious), or they look too unwell (`distressed`). A patient
   * sitting up — in a chair, on a couch — gets up and walks.
   */
  walkProblem(st: PatientPlaceState | null = this.state()): WalkProblem | null {
    if (this.clinicalPostureOf(st) === "lying") return "lying";
    if (!this.responsive()) return "unresponsive";
    if (this.d.cues?.().distressed) return "unwell";
    return null;
  }

  /** Can the patient respond to being asked (not `cannotSpeak`: intubated, sedated, unconscious)? */
  responsive(): boolean {
    return this.d.cues?.().cannotSpeak === undefined;
  }

  /** The actor the patient walks with now (`escort`; null: nobody, or an actor the world no longer knows). */
  escort(st: PatientPlaceState | null = this.state()): ActorId | null {
    const id = st?.escort ?? null;
    return id && this.d.actorPose?.(id) ? id : null;
  }

  /**
   * Where a patient walking with an actor is: half a step behind them, to one side, on the actor's side of any wall
   * (else at the actor's own spot), facing the actor's way (`rot`, degrees).
   */
  escortSpot(pose: Pose): { level: string; x: number; z: number; rot: number } {
    const back = { x: Math.sin(pose.yaw), z: Math.cos(pose.yaw) };
    const right = { x: Math.cos(pose.yaw), z: -Math.sin(pose.yaw) };
    // a body's rotation faces the way its walker looks (a rig turned by yaw + 180°, as the renderer draws people)
    const rot = Math.round((((((pose.yaw * 180) / Math.PI + 180) % 360) + 360) % 360) * 1000) / 1000;
    for (const [b, r] of ESCORT_OFFSETS) {
      const at = { x: pose.x + back.x * b + right.x * r, z: pose.z + back.z * b + right.z * r };
      if (!this.d.clear || this.d.clear(pose.level, pose, at)) return { level: pose.level, x: at.x, z: at.z, rot };
    }
    return { level: pose.level, x: pose.x, z: pose.z, rot };
  }

  /** A slot by id. */
  slot(id: string | null): PatientSlot | null {
    return id ? (this.d.facility.patientSlots.find((s) => s.id === id) ?? null) : null;
  }

  /** Where an equipment entity stands now (a moved bed where it was parked) and its current footprint. */
  equipmentAt(id: EntityId): { level: string; x: number; z: number; rot: number; footprint: { w: number; d: number; h: number } } | null {
    const e = this.d.registry.entity(id);
    if (!e) return null;
    const moved = this.d.state.entity(id)?.position;
    const rot = moved?.rot ?? e.rot;
    const type = e.equipmentType;
    const footprint = type ? { ...rotatedFootprint(type.footprint.w, type.footprint.d, rot), h: type.footprint.h } : (e.footprint ?? { w: 0.2, d: 0.2, h: 0 });
    return moved ? { level: moved.level, x: moved.x, z: moved.z, rot, footprint } : { level: e.level, x: e.position.x, z: e.position.z, rot, footprint };
  }

  /** The level of a slot. */
  slotLevel(slot: PatientSlot): string {
    return entityLevel(this.d.facility, slot);
  }

  /** Where the patient is now (null without a patient). */
  place(): PatientPlace | null {
    const st = this.state();
    if (!st) return null;
    const posture = this.posture(st);
    const f = this.d.facility;
    const by = this.escort(st);
    if (by) {
      const s = this.escortSpot(this.d.actorPose!(by)!);
      return { slot: null, provider: null, home: { ...st.home }, level: s.level, x: s.x, y: levelElevation(f, s.level), z: s.z, rot: s.rot, room: this.d.registry.roomAt(s.level, s.x, s.z), posture, support: null, trolley: st.trolley, footprint: { ...BODY_FOOTPRINT[posture] }, escort: by };
    }
    if (st.slot) {
      const slot = this.slot(st.slot)!;
      const level = this.slotLevel(slot);
      const bed = this.bedOf(slot);
      const at = bed ? this.equipmentAt(bed) : null;
      const lyingOnBed = posture === "lying" && !!at;
      const x = lyingOnBed ? at!.x : slot.x;
      const z = lyingOnBed ? at!.z : slot.z;
      const rot = lyingOnBed ? at!.rot : (slot.rot ?? 0);
      const footprint = lyingOnBed ? { ...at!.footprint } : { ...BODY_FOOTPRINT[posture] };
      return { slot: st.slot, provider: st.provider, home: { ...st.home }, level, x, y: levelElevation(f, level), z, rot, room: slot.room, posture, support: st.support, trolley: st.trolley, footprint };
    }
    const spot = st.spot!;
    const support = st.support && posture !== "standing" ? this.equipmentAt(st.support) : null;
    const footprint = support ? { ...support.footprint } : { ...BODY_FOOTPRINT[posture] };
    return { slot: null, provider: st.provider, home: { ...st.home }, level: spot.level, x: spot.x, y: levelElevation(f, spot.level), z: spot.z, rot: spot.rot, room: this.d.registry.roomAt(spot.level, spot.x, spot.z), posture, support: st.support, trolley: st.trolley, footprint };
  }

  /** The point the bedside is measured from: the slot point in a bed space, the spot elsewhere (null without a patient). */
  anchor(): { level: string; x: number; z: number; room: string | null } | null {
    const st = this.state();
    if (!st) return null;
    const by = this.escort(st);
    if (by) {
      const s = this.escortSpot(this.d.actorPose!(by)!);
      return { level: s.level, x: s.x, z: s.z, room: this.d.registry.roomAt(s.level, s.x, s.z) };
    }
    if (st.slot) {
      const slot = this.slot(st.slot)!;
      return { level: this.slotLevel(slot), x: slot.x, z: slot.z, room: slot.room };
    }
    const s = st.spot!;
    return { level: s.level, x: s.x, z: s.z, room: this.d.registry.roomAt(s.level, s.x, s.z) };
  }

  /** The bed space the patient is in now (null at a spot). */
  slotNow(): PatientSlot | null {
    return this.slot(this.state()?.slot ?? null);
  }

  /** The body box walkers must avoid now (floor area), null when a bed, table or chair carries the body — or while they walk with someone. */
  body(): { level: string; area: Area } | null {
    // walking with someone: no box (and no `place()` — the grids ask while they are composed)
    if (this.escort()) return null;
    const p = this.place();
    if (!p) return null;
    const onSupport = p.posture !== "standing" && !!p.support;
    if (onSupport) return null;
    const box = npcBodyBox(p.posture, false, p.x, p.z);
    return box ? { level: p.level, area: { minX: box.minX, maxX: box.maxX, minZ: box.minZ, maxZ: box.maxZ } } : null;
  }

  /** A key of the body now (changes when its box, place or posture changes). */
  bodyKey(): string {
    const p = this.place();
    const b = this.body();
    return p ? `${p.level}|${p.x.toFixed(3)},${p.z.toFixed(3)}|${p.posture}|${b ? [b.area.minX, b.area.maxX, b.area.minZ, b.area.maxZ].map((v) => v.toFixed(3)).join(",") : "-"}` : "";
  }

  /** Is the body now the collision model's own (same box on the slot's level)? */
  private isStatic(b: { level: string; area: Area } | null): boolean {
    if (!this.d.staticBody || !b || !this.d.slot) return false;
    return b.level === this.slotLevel(this.d.slot) && sameArea(this.d.staticBody, b.area);
  }

  /** `WorldDynamics.removed`: the patient's static collider no longer applies (moved, posture changed). */
  removed(): EntityId[] {
    if (!this.id || !this.d.staticBody) return [];
    return this.isStatic(this.body()) ? [] : [this.id];
  }

  /** `WorldDynamics.bodies`: the patient's body when it is not the collision model's. */
  bodies(): { id: EntityId; level: string; area: Area }[] {
    const b = this.body();
    if (!this.id || !b || this.isStatic(b)) return [];
    return [{ id: this.id, level: b.level, area: b.area }];
  }

  /* ---------------- destinations ---------------- */

  /** Localised name of a bed space: its room. */
  slotName(slot: PatientSlot): string {
    const room = this.d.registry.entity(`room:${slot.room}`);
    return room ? t(room.name, this.d.locale) : slot.room;
  }

  /** Localised name of the place now. */
  placeName(p: Pick<PatientPlace, "slot" | "provider" | "level" | "x" | "z" | "room"> | null = this.place()): string {
    if (!p) return "—";
    const slot = this.slot(p.slot);
    if (slot) return this.slotName(slot);
    if (p.provider) {
      const e = this.d.registry.entity(p.provider);
      if (e) return t(e.name, this.d.locale);
    }
    const room = p.room ? this.d.registry.entity(`room:${p.room}`) : null;
    return room ? t(room.name, this.d.locale) : "—";
  }

  /** What a destination asks for, in words ("an ICU/HDU bed", "fluoroscopy (cath lab)"). */
  describe(dest: PatientDestination): string {
    const L = this.d.locale;
    if ("setting" in dest && dest.setting) return worldMessage(`setting.${dest.setting}`, L);
    if ("roomKind" in dest && dest.roomKind) return worldMessage("dest.roomKind", L, { kind: worldMessage(`roomKind.${dest.roomKind}`, L) });
    if ("capability" in dest && dest.capability) return listText(capabilityLabels([dest.capability], L), L);
    if ("slot" in dest) return dest.slot;
    if ("provider" in dest) return dest.provider;
    return worldMessage("dest.home", L);
  }
}

/** What resolving a destination needs beyond the body. */
export interface TargetDeps {
  body: PatientBody;
  registry: SemanticRegistry;
  /** In-service equipment capabilities (an out-of-service device provides nothing). */
  capabilities(id: EntityId): string[];
  /** Effective reach of an equipment entity where it stands. */
  reach(id: EntityId): number;
  /** Walking grids (spots); null with a custom backend. */
  grids: NavGrids | null;
  visibility: VisibilityModel;
  /** The sight target of an equipment entity where it stands. */
  sight(id: EntityId): SightTarget | null;
  locale: string;
}

/**
 * The non-portable equipment a patient is brought to for every capability: devices (a scanner, a C-arm, a
 * station) — or, where no device provides them, a terminal standing for its department (the V4 clinic's
 * imaging workstation). In service, registry order.
 */
export function patientProviders(d: Pick<TargetDeps, "registry" | "capabilities">, caps: readonly string[]): EntityId[] {
  const fixed = d.registry.ofKind("equipment").filter((e) => !e.portable && caps.every((c) => d.capabilities(e.id).includes(c)));
  const devices = fixed.filter((e) => (PATIENT_PROVIDER_KINDS as readonly string[]).includes(e.interaction));
  return (devices.length ? devices : fixed.filter((e) => e.interaction === "workstation")).map((e) => e.id);
}

/** A bed placement beside a provider (same room and level, within its reach + margin) the patient can lie on, nearest first. */
function supportBeside(d: TargetDeps, provider: SemanticEntity, exclude: EntityId | null): SemanticEntity | null {
  const at = d.body.equipmentAt(provider.id)!;
  const area = footprintArea({ position: { x: at.x, z: at.z }, footprint: at.footprint });
  const reach = d.reach(provider.id) + SUPPORT_MARGIN;
  let best: { e: SemanticEntity; gap: number } | null = null;
  for (const e of d.registry.ofKind("equipment")) {
    if (e.id === exclude || e.id === provider.id || e.interaction !== "bed" || e.portable || e.equipmentType?.solid === false) continue;
    if (e.level !== at.level || e.room !== provider.room) continue;
    const bed = d.body.equipmentAt(e.id)!;
    const gap = areaGap(area, footprintArea({ position: { x: bed.x, z: bed.z }, footprint: bed.footprint }));
    if (gap > reach + 1e-6) continue;
    if (!best || gap < best.gap - 1e-9 || (Math.abs(gap - best.gap) < 1e-9 && e.id < best.e.id)) best = { e, gap };
  }
  return best?.e ?? null;
}

/**
 * A free walking cell within `maxGap` of an area (beyond 0), with a line of sight to `sight` when given:
 * the nearest to the area (ties: the lowest cell index) — deterministic. `fits`: also require the cells a
 * footprint of that size centred there covers to be free (a trolley); null when there is none.
 */
export function freeCellNear(grids: NavGrids | null, visibility: VisibilityModel, level: string, area: Area, maxGap: number, sight: SightTarget | null, fits?: { w: number; d: number }): { x: number; z: number } | null {
  const g = grids?.grid(level);
  if (!g) return null;
  const x0 = Math.max(0, Math.floor((area.minX - maxGap - g.minX) / g.cell)), x1 = Math.min(g.cols - 1, Math.floor((area.maxX + maxGap - g.minX) / g.cell));
  const z0 = Math.max(0, Math.floor((area.minZ - maxGap - g.minZ) / g.cell)), z1 = Math.min(g.rows - 1, Math.floor((area.maxZ + maxGap - g.minZ) / g.cell));
  const free = (i: number) => !g.base[i] && !g.door[i] && !g.dynamic[i];
  const cells: { i: number; gap: number; x: number; z: number }[] = [];
  for (let iz = z0; iz <= z1; iz++)
    for (let ix = x0; ix <= x1; ix++) {
      const i = iz * g.cols + ix;
      if (!free(i)) continue;
      const c = cellPoint(g, i);
      const gap = distanceToArea(c.x, c.z, area);
      if (gap <= 1e-9 || gap > maxGap + 1e-9) continue;
      cells.push({ i, gap, x: c.x, z: c.z });
    }
  cells.sort((a, b) => a.gap - b.gap || a.i - b.i);
  for (const c of cells) {
    if (fits) {
      // the footprint's core (shrunk by the grid's inflation) clear of obstacles and doorways: the whole footprint clears them
      const hw = Math.max(0, fits.w / 2 - 0.4), hd = Math.max(0, fits.d / 2 - 0.4);
      let ok = true;
      for (let iz = Math.floor((c.z - hd - g.minZ) / g.cell); ok && iz <= Math.floor((c.z + hd - g.minZ) / g.cell); iz++)
        for (let ix = Math.floor((c.x - hw - g.minX) / g.cell); ok && ix <= Math.floor((c.x + hw - g.minX) / g.cell); ix++) {
          const j = iz * g.cols + ix;
          if (ix < 0 || iz < 0 || ix >= g.cols || iz >= g.rows || !free(j)) ok = false;
        }
      if (!ok) continue;
    }
    if (sight && !visibility.visibleFrom(level, c, sight)) continue;
    return { x: c.x, z: c.z };
  }
  return null;
}

/** Ranks providers for a capability destination: one with a table or bed for the patient first, then nearest to the patient (same level first), then id. */
function rankProviders(d: TargetDeps, ids: EntityId[], from: { level: string; x: number; z: number } | null): EntityId[] {
  const key = (id: EntityId): [number, number, string] => {
    const e = d.registry.entity(id)!;
    const table = d.capabilities(id).some((c) => TABLE_CAPABILITIES.includes(c)) || !!supportBeside(d, e, null);
    const at = d.body.equipmentAt(id)!;
    const dist = !from ? 0 : at.level === from.level ? Math.hypot(at.x - from.x, at.z - from.z) : 1e6 + Math.hypot(at.x - from.x, at.z - from.z);
    return [table ? 0 : 1, dist, id];
  };
  return [...ids].sort((a, b) => {
    const ka = key(a), kb = key(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || (ka[2] < kb[2] ? -1 : ka[2] > kb[2] ? 1 : 0);
  });
}

/** Providers of every capability for the patient, the one a transport hint names first. */
export function rankedPatientProviders(d: TargetDeps, caps: readonly string[]): EntityId[] {
  return rankProviders(d, patientProviders(d, caps), d.body.anchor());
}

/**
 * The patient's place in a bed space. Its bed is where the body that brings the patient stands — or, when
 * that bed is away (the trolley the patient travels on, parked beside a scanner), the bed space it comes
 * back to.
 */
function slotTarget(d: TargetDeps, slot: PatientSlot): PatientTarget {
  const bed = slot.bed && d.registry.entity(`eq:${slot.bed}`) ? `eq:${slot.bed}` : null;
  const level = d.body.slotLevel(slot);
  const e = bed ? d.registry.entity(bed)! : null;
  const now = bed ? d.body.equipmentAt(bed) : null;
  const away = !!e && !!now && (now.level !== e.level || !same(now.x, e.position.x) || !same(now.z, e.position.z));
  const stand: NavGoal = bed && !away ? { kind: "interact", id: bed } : { kind: "point", x: e ? e.position.x : slot.x, z: e ? e.position.z : slot.z, level, range: 1.5 };
  return { slot: slot.id, provider: null, spot: null, posture: null, support: bed, stand, name: d.body.slotName(slot) };
}

/**
 * The patient's place at a provider: on a bed beside it (the cath-lab table by the C-arm), on its own table
 * (a CT, MRI, PET-CT scanner, an X-ray table), else on a free spot within its reach — standing for a
 * patient-performed test (peak flow, weight), else lying on the trolley they travel with (or standing
 * without one). `trolley`: the trolley that comes along, if any.
 */
function providerTarget(d: TargetDeps, providerId: EntityId, trolley: EntityId | null): PatientTarget | null {
  const provider = d.registry.entity(providerId);
  const at = provider ? d.body.equipmentAt(providerId) : null;
  if (!provider || !at) return null;
  const name = t(provider.name, d.locale);
  const caps = d.capabilities(providerId);
  const bed = supportBeside(d, provider, trolley);
  if (bed) {
    const b = d.body.equipmentAt(bed.id)!;
    return { slot: null, provider: providerId, spot: { level: b.level, x: b.x, z: b.z, rot: b.rot }, posture: "lying", support: bed.id, stand: { kind: "interact", id: bed.id }, name };
  }
  if (caps.some((c) => TABLE_CAPABILITIES.includes(c))) {
    return { slot: null, provider: providerId, spot: { level: at.level, x: at.x, z: at.z, rot: at.rot }, posture: "lying", support: providerId, stand: { kind: "interact", id: providerId }, name };
  }
  const area = footprintArea({ position: { x: at.x, z: at.z }, footprint: at.footprint });
  const cell = freeCellNear(d.grids, d.visibility, at.level, area, d.reach(providerId), d.sight(providerId));
  const spot = cell ?? { x: at.x, z: at.z };
  const performed = caps.some((c) => PATIENT_PERFORMED_CAPABILITIES.includes(c));
  const onTrolley = !performed && !!trolley;
  return {
    slot: null,
    provider: providerId,
    spot: { level: at.level, x: spot.x, z: spot.z, rot: at.rot },
    posture: performed ? "standing" : onTrolley ? "lying" : "standing",
    support: onTrolley ? "trolley" : null,
    stand: { kind: "point", x: spot.x, z: spot.z, level: at.level, range: 1.5 },
    name,
  };
}

/**
 * Resolve a destination for the patient in this facility (null: there is none). A setting or room kind
 * the patient's bed space already satisfies, or a capability a provider beside them already provides,
 * resolves to where they are. `trolley`: the trolley that would come along.
 */
export function resolveTarget(d: TargetDeps, dest: PatientDestination, trolley: EntityId | null): PatientTarget | null {
  const body = d.body;
  const st = body.state();
  if (!st) return null;
  const f = body.facility;
  const here = body.slotNow();
  const roomKind = (slot: PatientSlot) => f.rooms.find((r) => r.id === slot.room)?.kind;
  if ("home" in dest) {
    if (st.home.slot) return slotTarget(d, body.slot(st.home.slot)!);
    return st.home.provider ? providerTarget(d, st.home.provider, trolley) : null;
  }
  if ("slot" in dest) {
    const slot = body.slot(dest.slot);
    return slot ? slotTarget(d, slot) : null;
  }
  if ("provider" in dest) {
    const id = d.registry.resolveId(dest.provider);
    const e = id ? d.registry.entity(id) : null;
    if (!e || e.kind !== "equipment") return null;
    // a bed space's own bed: that bed space
    const slot = f.patientSlots.find((s) => `eq:${s.bed}` === e.id);
    if (slot) return slotTarget(d, slot);
    return providerTarget(d, e.id, trolley);
  }
  if (dest.setting) {
    if (here?.accepts.includes(dest.setting)) return slotTarget(d, here);
    const slot = f.patientSlots.find((s) => s.accepts.includes(dest.setting!));
    return slot ? slotTarget(d, slot) : null;
  }
  if (dest.roomKind) {
    if (here && roomKind(here) === dest.roomKind) return slotTarget(d, here);
    const slot = f.patientSlots.find((s) => roomKind(s) === dest.roomKind);
    return slot ? slotTarget(d, slot) : null;
  }
  if (dest.capability) {
    if (st.provider && d.capabilities(st.provider).includes(dest.capability)) return providerTarget(d, st.provider, trolley);
    const ranked = rankedPatientProviders(d, [dest.capability]);
    return ranked.length ? providerTarget(d, ranked[0]!, trolley) : null;
  }
  return null;
}

/** A free spot to leave a trolley near an area (rings of `TROLLEY_RINGS`), fitting its footprint when possible. */
export function trolleySpot(d: Pick<TargetDeps, "grids" | "visibility" | "body">, trolley: EntityId, level: string, near: Area): { x: number; z: number } | null {
  const at = d.body.equipmentAt(trolley);
  for (const ring of TROLLEY_RINGS) {
    const spot = freeCellNear(d.grids, d.visibility, level, near, ring, null, at ? { w: at.footprint.w, d: at.footprint.d } : undefined);
    if (spot) return spot;
  }
  return freeCellNear(d.grids, d.visibility, level, near, TROLLEY_RINGS[TROLLEY_RINGS.length - 1]!, null);
}

/** Is a target the place the patient is in now (the same bed space, or at the same provider)? */
export function sameTarget(st: PatientPlaceState, target: PatientTarget): boolean {
  if (target.slot) return st.slot === target.slot;
  return !st.slot && !!target.provider && st.provider === target.provider;
}
