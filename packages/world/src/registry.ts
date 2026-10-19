/**
 * Semantic registry (EMBODIED §3): the static, mesh-independent description
 * of every entity of an encounter's world — levels, rooms, doors,
 * connectors, equipment placements, the bound patient and the staff — with
 * stable prefixed ids, localized names, levels, rooms, positions (level
 * elevation applied), rotated footprints, capabilities, interaction kind,
 * portability, reach and public (bystander) descriptors.
 *
 * Grounding: the patient's public descriptor is the display name, the
 * age/sex tag and the posture — nothing else from the case.
 *
 * Reach defaults (m from the footprint, when the equipment type has no
 * `reach`): core `DEFAULT_REACH` by interaction kind — workstation 1.2,
 * monitor 2 (reached from the bedside), bed 1.5, device 1.2, atlas 1.5, board 2.5, craft 1.2,
 * door 1.2, sink 1, storage 1, talk (staff) 2, none 1; the patient uses
 * the contact range `RANGES.contact` (1.5); rooms and levels 0.
 */
import {
  DEFAULT_REACH,
  mergeCatalogs,
  placementCapabilities,
  t,
  type EquipmentCatalog,
  type EquipmentType,
  type FacilityDefinition,
} from "@clinicalcraft/core";
import { patientPose, type Posture } from "./collision.js";
import { RANGES, type CollisionModel, type EncounterBinding, type EntityId, type EntityKind, type InteractionKind, type SemanticEntity, type Vec2 } from "./contracts.js";
import { rotateXZ, rotatedFootprint } from "./geometry.js";
import { ageSexTag, roleName } from "./i18n.js";
import { connectorInfos, defaultLevelId, entityLevel, levelElevation, levelInfos, roomLevel } from "./levels.js";

/** The registry of one encounter's world. */
export interface SemanticRegistry {
  /** Every entity: levels, rooms, doors, connectors, equipment, the bound patient, staff (in that order). */
  readonly entities: readonly SemanticEntity[];
  /** Entity by prefixed id. */
  entity(id: EntityId): SemanticEntity | null;
  /**
   * Resolve an id or alias: a prefixed id; an unprefixed placement / staff /
   * slot / room / level / connector / door id when exactly one entity has it
   * ("ecg-cart-01" → "eq:ecg-cart-01"); "patient" → the bound patient.
   * Ambiguous or unknown → null.
   */
  resolveId(idOrAlias: string): EntityId | null;
  /** Entities of a kind (registry order). */
  ofKind(kind: EntityKind): SemanticEntity[];
  /** Entities whose room is `roomId` (unprefixed). */
  inRoom(roomId: string): SemanticEntity[];
  /** Smallest room containing (x, z) on a level, or null. */
  roomAt(level: string, x: number, z: number): string | null;
}

/** Body footprint (w × d × h) of a person by posture (the collision model's body boxes). */
export const BODY_FOOTPRINT: Record<Posture, { w: number; d: number; h: number }> = {
  standing: { w: 0.85, d: 0.6, h: 1.88 },
  sitting: { w: 0.8, d: 0.8, h: 1.2 },
  lying: { w: 0.8, d: 2.1, h: 0.5 },
};

/** Patient posture in an encounter (as the web world places it): the case's, else the slot's, else standing. */
export function bindingPosture(binding: EncounterBinding, f: Pick<FacilityDefinition, "patientSlots">): Posture {
  const slot = binding.slotId ? f.patientSlots.find((s) => s.id === binding.slotId) : undefined;
  return (binding.caseDef.patient.posture ?? slot?.posture ?? "standing") as Posture;
}

const unprefixed = (id: string) => id.slice(id.indexOf(":") + 1);

/**
 * Build the registry. `binding` places the case's patient in its slot (no
 * patient entity without one); `collision` supplies the door records.
 * Equipment of unknown types is left out (as the renderer leaves it out).
 */
export function buildRegistry(
  f: FacilityDefinition,
  catalogs: readonly EquipmentCatalog[],
  binding: EncounterBinding | null,
  collision: Pick<CollisionModel, "doors">,
): SemanticRegistry {
  const { equipment } = mergeCatalogs([...catalogs]);
  const locale = binding?.locale ?? "zh-CN";
  const levels = levelInfos(f);
  const ground = defaultLevelId(f);
  const elevation = (level: string) => levelElevation(f, level);
  const rooms = f.rooms.map((r) => ({ room: r, level: roomLevel(f, r) }));
  const roomAt = (level: string, x: number, z: number): string | null => {
    let best: string | null = null;
    let area = Infinity;
    for (const { room, level: l } of rooms) {
      if (l !== level || Math.abs(x - room.rect.x) > room.rect.w / 2 || Math.abs(z - room.rect.z) > room.rect.d / 2) continue;
      const a = room.rect.w * room.rect.d;
      if (a < area) {
        area = a;
        best = room.id;
      }
    }
    return best;
  };
  const buildingHeight = (roomId: string, level: string) => {
    const room = f.rooms.find((r) => r.id === roomId);
    const building = room?.building ? f.buildings.find((b) => b.id === room.building) : undefined;
    return building?.walls?.height ?? levels.find((l) => l.id === level)?.height ?? 5;
  };

  const entities: SemanticEntity[] = [];
  const b = f.bounds;

  for (const l of levels) {
    entities.push({
      id: `level:${l.id}`,
      kind: "level",
      type: "level",
      name: l.name,
      level: l.id,
      room: null,
      position: { x: (b.minX + b.maxX) / 2, y: l.elevation, z: (b.minZ + b.maxZ) / 2 },
      rot: 0,
      capabilities: [],
      interaction: "none",
      reach: 0,
      tags: l.id === ground ? ["level", "default"] : ["level"],
    });
  }

  for (const { room: r, level } of rooms) {
    entities.push({
      id: `room:${r.id}`,
      kind: "room",
      type: r.kind,
      name: r.name,
      level,
      room: r.id,
      position: { x: r.rect.x, y: elevation(level), z: r.rect.z },
      rot: 0,
      footprint: { w: r.rect.w, d: r.rect.d, h: buildingHeight(r.id, level) },
      capabilities: [],
      interaction: "none",
      reach: 0,
      tags: ["room", r.kind],
    });
  }

  for (const d of collision.doors) {
    const fp = d.axis === "x" ? { w: d.width, d: 0.2 } : { w: 0.2, d: d.width };
    entities.push({
      id: d.id,
      kind: "door",
      type: d.kind,
      name: d.name,
      level: d.level,
      room: d.rooms[0] ?? d.rooms[1],
      position: { x: d.centre.x, y: elevation(d.level), z: d.centre.z },
      rot: d.axis === "x" ? 0 : 90,
      footprint: { ...fp, h: d.height },
      capabilities: [],
      interaction: "door",
      reach: DEFAULT_REACH.door,
      tags: ["door", d.interior ? "interior" : "entrance"],
    });
  }

  for (const c of connectorInfos(f)) {
    const stop = c.stops[0];
    entities.push({
      id: c.id,
      kind: "connector",
      type: c.kind,
      name: c.name,
      level: stop.level,
      room: roomAt(stop.level, stop.x, stop.z),
      position: { x: stop.x, y: elevation(stop.level), z: stop.z },
      rot: 0,
      capabilities: [],
      interaction: "none",
      reach: RANGES.interact,
      tags: ["connector", c.kind, ...(c.accessible ? ["accessible"] : []), ...c.stops.map((s) => `level:${s.level}`)],
    });
  }

  for (const p of f.placements) {
    const type: EquipmentType | undefined = equipment.get(p.type);
    if (!type) continue;
    const level = entityLevel(f, p);
    const rot = p.rot ?? 0;
    const kind = (type.interaction?.kind ?? "none") as InteractionKind;
    const fp = rotatedFootprint(type.footprint.w, type.footprint.d, rot);
    const points: Vec2[] | undefined = type.interactionPoints?.map((pt) => {
      const [dx, dz] = rotateXZ(pt.x, pt.z, rot);
      return { x: p.x + dx, z: p.z + dz };
    });
    const entity: SemanticEntity = {
      id: `eq:${p.id}`,
      kind: "equipment",
      type: type.id,
      name: p.label ?? type.name,
      level,
      room: p.room ?? roomAt(level, p.x, p.z),
      position: { x: p.x, y: elevation(level) + (p.y ?? 0), z: p.z },
      rot,
      footprint: { w: fp.w, d: fp.d, h: type.footprint.h },
      capabilities: placementCapabilities(f, [...catalogs], p.id),
      interaction: kind,
      reach: type.reach ?? DEFAULT_REACH[kind as keyof typeof DEFAULT_REACH] ?? DEFAULT_REACH.none,
      tags: [...(type.tags ?? [])],
      equipmentType: type,
    };
    if (type.portable) entity.portable = type.portable;
    if (points) entity.interactionPoints = points;
    entities.push(entity);
  }

  const slot = binding?.slotId ? f.patientSlots.find((s) => s.id === binding.slotId) : undefined;
  if (binding && slot) {
    const posture = bindingPosture(binding, f);
    const pose = patientPose(f, equipment, slot.id, posture)!;
    const level = entityLevel(f, slot);
    const bedType = pose.bed ? equipment.get(pose.bed.type) : undefined;
    // lying on the bed: the patient spans the bed; otherwise the body (axis-aligned like its collider)
    const footprint =
      pose.onBed && posture === "lying" && pose.bed && bedType
        ? { ...rotatedFootprint(bedType.footprint.w, bedType.footprint.d, pose.bed.rot ?? 0), h: bedType.footprint.h }
        : { ...BODY_FOOTPRINT[posture] };
    const patient = binding.caseDef.patient;
    entities.push({
      id: `patient:${slot.id}`,
      kind: "patient",
      type: "patient",
      name: patient.displayName,
      level,
      room: slot.room,
      position: { x: pose.x, y: elevation(level), z: pose.z },
      rot: pose.rot,
      footprint,
      capabilities: [],
      interaction: "talk",
      reach: RANGES.contact,
      tags: ["patient", posture],
      // bystander view only: never history, findings, results, diagnosis or vitals
      public: { name: t(patient.displayName, locale), tag: ageSexTag(patient, locale), posture },
    });
  }

  for (const st of f.staff ?? []) {
    const level = entityLevel(f, st);
    entities.push({
      id: `staff:${st.id}`,
      kind: "staff",
      type: st.role,
      name: st.name,
      level,
      room: st.room,
      position: { x: st.x, y: elevation(level), z: st.z },
      rot: st.rot ?? 0,
      footprint: { ...BODY_FOOTPRINT.standing },
      capabilities: [],
      interaction: "talk",
      reach: DEFAULT_REACH.talk,
      tags: ["staff", st.role],
      public: { role: roleName(st.role, locale), name: t(st.name, locale) },
    });
  }

  const byId = new Map(entities.map((e) => [e.id, e]));
  const aliases = new Map<string, EntityId[]>();
  for (const e of entities) {
    const alias = unprefixed(e.id);
    aliases.set(alias, [...(aliases.get(alias) ?? []), e.id]);
  }
  const patientId = entities.find((e) => e.kind === "patient")?.id ?? null;

  return {
    entities,
    entity: (id) => byId.get(id) ?? null,
    resolveId(idOrAlias) {
      const key = idOrAlias.trim();
      if (byId.has(key)) return key;
      const hits = aliases.get(key);
      if (hits?.length === 1) return hits[0];
      if (!hits && key === "patient") return patientId;
      return null;
    },
    ofKind: (kind) => entities.filter((e) => e.kind === kind),
    inRoom: (roomId) => entities.filter((e) => e.room === roomId && e.kind !== "room"),
    roomAt,
  };
}
