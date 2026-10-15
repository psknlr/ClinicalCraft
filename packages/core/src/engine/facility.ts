/**
 * Facility helpers: catalog merging, capabilities, spatial lookups,
 * navigation targets and facility validation (docs/FACILITIES.md).
 *
 * Coordinates: 1 unit = 1 m, rect `x`/`z` are centres, equipment origin is
 * the footprint centre on the floor, `rot` in degrees about +Y.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { Condition } from "../schema/common.js";
import { CAPABILITIES, PERSONAL_KIT } from "../schema/common.js";
import type { EquipmentCatalog, EquipmentType, FacilityDefinition, MaterialDef, Placement, Rect, VoxelPart } from "../schema/facility.js";
import { DEFAULT_LOCALE, t } from "../i18n.js";
import type { Issue, PatientSlot, WaypointLocation } from "./types.js";

/** Tolerance (m) for overlap and containment checks. */
export const SPATIAL_TOLERANCE = 0.05;

/** Axis-aligned bounding box on the ground plane (plus height range). */
export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

/* ------------------------------------------------------------------ */
/* Catalogs & capabilities                                             */
/* ------------------------------------------------------------------ */

/** Index every material and equipment type of the given catalogs (later catalogs override earlier ids). */
export function mergeCatalogs(catalogs: EquipmentCatalog[]): { materials: Map<string, MaterialDef>; equipment: Map<string, EquipmentType> } {
  const materials = new Map<string, MaterialDef>();
  const equipment = new Map<string, EquipmentType>();
  for (const catalog of catalogs) {
    for (const m of catalog.materials) materials.set(m.id, m);
    for (const e of catalog.equipment) equipment.set(e.id, e);
  }
  return { materials, equipment };
}

function equipmentOf(catalogs: EquipmentCatalog[], typeId: string): EquipmentType | undefined {
  for (let i = catalogs.length - 1; i >= 0; i--) {
    const found = catalogs[i].equipment.find((e) => e.id === typeId);
    if (found) return found;
  }
  return undefined;
}

/** Capabilities of one placement: its equipment type's capabilities ∪ `placement.capabilities`. Unknown placement → []. */
export function placementCapabilities(f: FacilityDefinition, catalogs: EquipmentCatalog[], placementId: string): string[] {
  const placement = f.placements.find((p) => p.id === placementId);
  if (!placement) return [];
  const type = equipmentOf(catalogs, placement.type);
  return [...new Set([...(type?.capabilities ?? []), ...(placement.capabilities ?? [])])];
}

/**
 * Every capability available anywhere in the facility, including the
 * learner's `PERSONAL_KIT` (CLI/MCP capability checks have no spatial rules).
 */
export function facilityCapabilities(f: FacilityDefinition, catalogs: EquipmentCatalog[]): Set<string> {
  const { equipment } = mergeCatalogs(catalogs);
  const caps = new Set<string>(PERSONAL_KIT);
  for (const placement of f.placements) {
    for (const cap of equipment.get(placement.type)?.capabilities ?? []) caps.add(cap);
    for (const cap of placement.capabilities ?? []) caps.add(cap);
  }
  return caps;
}

/** A case item a facility cannot provide (its `requires` capabilities are missing there). */
export interface CapabilityGap {
  kind: "exam" | "investigation" | "intervention";
  id: string;
  /** The item's `requires` capabilities the facility lacks. */
  missing: string[];
  /** Objectives / decisions (ids) and "solution" that use the item. */
  neededBy: string[];
  /** True when an objective or a decision cannot be completed without it (no alternative in the condition). */
  blocking: boolean;
}

type ItemKey = `${CapabilityGap["kind"]}:${string}`;

/** Can `cond` become true when the items in `unavailable` can never be examined/ordered/read/given? (`not` is assumed satisfiable.) */
function satisfiableWithout(cond: Condition, unavailable: ReadonlySet<ItemKey>): boolean {
  if ("all" in cond) return cond.all.every((x) => satisfiableWithout(x, unavailable));
  if ("any" in cond) return cond.any.some((x) => satisfiableWithout(x, unavailable));
  if ("not" in cond) return true;
  if ("examined" in cond) return !unavailable.has(`exam:${cond.examined}`);
  if ("ordered" in cond) return !unavailable.has(`investigation:${cond.ordered}`);
  if ("read" in cond) return !unavailable.has(`investigation:${cond.read}`);
  if ("resultReady" in cond) return !unavailable.has(`investigation:${cond.resultReady}`);
  if ("intervened" in cond) return !unavailable.has(`intervention:${cond.intervened}`);
  return true;
}

/** Item keys a condition refers to positively (outside `not`). */
function positiveItems(cond: Condition, out = new Set<ItemKey>()): Set<ItemKey> {
  if ("all" in cond) for (const x of cond.all) positiveItems(x, out);
  else if ("any" in cond) for (const x of cond.any) positiveItems(x, out);
  else if ("examined" in cond) out.add(`exam:${cond.examined}`);
  else if ("ordered" in cond) out.add(`investigation:${cond.ordered}`);
  else if ("read" in cond) out.add(`investigation:${cond.read}`);
  else if ("resultReady" in cond) out.add(`investigation:${cond.resultReady}`);
  else if ("intervened" in cond) out.add(`intervention:${cond.intervened}`);
  return out;
}

/**
 * What a facility cannot provide for a case: every exam finding,
 * investigation or intervention whose `requires` capabilities are missing
 * from `facilityCapabilities(f, catalogs)` and that an objective, a decision
 * or the reference `solution` uses. `blocking` gaps make an objective or a
 * decision impossible there (the case cannot be completed in that facility).
 */
export function caseCapabilityGaps(c: CaseDefinition, f: FacilityDefinition, catalogs: EquipmentCatalog[]): CapabilityGap[] {
  const caps = facilityCapabilities(f, catalogs);
  const missingOf = new Map<ItemKey, string[]>();
  const consider = (kind: CapabilityGap["kind"], items: readonly { id: string; requires: readonly string[] }[]) => {
    for (const item of items) {
      const missing = item.requires.filter((r) => !caps.has(r));
      if (missing.length > 0) missingOf.set(`${kind}:${item.id}`, missing);
    }
  };
  consider("exam", c.exam);
  consider("investigation", c.investigations);
  consider("intervention", c.interventions);
  if (missingOf.size === 0) return [];
  const unavailable = new Set(missingOf.keys());
  const neededBy = new Map<ItemKey, Set<string>>();
  const blocking = new Set<ItemKey>();
  const use = (key: ItemKey, by: string) => {
    if (!missingOf.has(key)) return;
    if (!neededBy.has(key)) neededBy.set(key, new Set());
    neededBy.get(key)!.add(by);
  };
  const check = (by: string, cond: Condition) => {
    const items = positiveItems(cond);
    for (const key of items) use(key, by);
    if (!satisfiableWithout(cond, unavailable)) for (const key of items) if (missingOf.has(key)) blocking.add(key);
  };
  for (const o of c.objectives) check(o.id, o.completeWhen);
  for (const d of c.decisions) check(d.id, d.requires);
  for (const step of c.solution) {
    if (step.type === "examine") use(`exam:${step.findingId}`, "solution");
    else if (step.type === "order" || step.type === "read") use(`investigation:${step.investigationId}`, "solution");
    else if (step.type === "intervene") use(`intervention:${step.interventionId}`, "solution");
  }
  return [...neededBy.entries()].map(([key, by]) => {
    const [kind, ...rest] = key.split(":");
    return { kind: kind as CapabilityGap["kind"], id: rest.join(":"), missing: missingOf.get(key)!, neededBy: [...by], blocking: blocking.has(key) };
  });
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** True when (x, z) lies inside the rect (edges inclusive). */
export function rectContains(rect: Rect, x: number, z: number, tolerance = 0): boolean {
  return Math.abs(x - rect.x) <= rect.w / 2 + tolerance && Math.abs(z - rect.z) <= rect.d / 2 + tolerance;
}

function rectInside(inner: Rect, outer: Rect, tolerance = SPATIAL_TOLERANCE): boolean {
  return (
    inner.x - inner.w / 2 >= outer.x - outer.w / 2 - tolerance &&
    inner.x + inner.w / 2 <= outer.x + outer.w / 2 + tolerance &&
    inner.z - inner.d / 2 >= outer.z - outer.d / 2 - tolerance &&
    inner.z + inner.d / 2 <= outer.z + outer.d / 2 + tolerance
  );
}

function inBounds(f: FacilityDefinition, x: number, z: number): boolean {
  const b = f.bounds;
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
}

/** World-space bounding box of a placed equipment footprint (rotation-aware). */
export function placementBox(placement: Placement, type: EquipmentType): Box {
  const rad = (placement.rot * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const { w, d, h } = type.footprint;
  const halfW = (w * cos + d * sin) / 2;
  const halfD = (w * sin + d * cos) / 2;
  return {
    minX: placement.x - halfW,
    maxX: placement.x + halfW,
    minZ: placement.z - halfD,
    maxZ: placement.z + halfD,
    minY: placement.y,
    maxY: placement.y + h,
  };
}

function overlapDepth(a: Box, b: Box): { x: number; y: number; z: number } {
  return {
    x: Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX),
    y: Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY),
    z: Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ),
  };
}

function area(rect: Rect): number {
  return rect.w * rect.d;
}

function distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

/**
 * Name of the region at (x, z): the smallest room containing the point,
 * else the building containing it, else the facility's `outdoorRegion`.
 */
export function regionAt(f: FacilityDefinition, x: number, z: number, locale: string = DEFAULT_LOCALE): string {
  const room = f.rooms.filter((r) => rectContains(r.rect, x, z)).sort((a, b) => area(a.rect) - area(b.rect))[0];
  if (room) return t(room.name, locale);
  const building = f.buildings.filter((b) => rectContains(b.rect, x, z)).sort((a, b) => area(a.rect) - area(b.rect))[0];
  if (building) return t(building.name, locale);
  return t(f.outdoorRegion, locale);
}

/** The first patient slot accepting the case's setting, or null. */
export function assignPatientSlot(f: FacilityDefinition, c: Pick<CaseDefinition, "setting">): PatientSlot | null {
  return f.patientSlots.find((slot) => slot.accepts.includes(c.setting)) ?? null;
}

/** Options for `resolveWaypoint`. */
export interface ResolveWaypointOptions {
  /** Reference point for "nearest" (default: the facility spawn). */
  from?: { x: number; z: number };
  /** Label language (default zh-CN). */
  locale?: string;
  /** Patient slot used for the "patient" target (default: the first slot). */
  slotId?: string;
  /**
   * Capability targets prefer the patient's own equipment: the slot's linked
   * monitor, then the nearest provider in the slot's room (measured from the
   * slot); only when the room has none, the nearest provider from `from`.
   * Without it, "nearest" is always measured from `from` (the player).
   */
  preferPatientSlot?: boolean;
}

function placementLabel(placement: Placement, type: EquipmentType | undefined, locale: string): string {
  return t(placement.label ?? type?.name ?? placement.id, locale);
}

function nearestPlacement(
  f: FacilityDefinition,
  catalogs: EquipmentCatalog[],
  from: { x: number; z: number },
  accept: (placement: Placement, type: EquipmentType | undefined) => boolean,
): { placement: Placement; type: EquipmentType | undefined } | null {
  let best: { placement: Placement; type: EquipmentType | undefined; dist: number } | null = null;
  for (const placement of f.placements) {
    const type = equipmentOf(catalogs, placement.type);
    if (!accept(placement, type)) continue;
    const dist = distance(placement, from);
    if (!best || dist < best.dist) best = { placement, type, dist };
  }
  return best;
}

function resolvePatient(f: FacilityDefinition, slotId: string | undefined, locale: string): WaypointLocation | null {
  const slot = slotId ? f.patientSlots.find((s) => s.id === slotId) : f.patientSlots[0];
  if (!slot) return null;
  const room = f.rooms.find((r) => r.id === slot.room);
  return { x: slot.x, z: slot.z, label: room ? t(room.name, locale) : slot.id };
}

/**
 * Resolve a waypoint target to world coordinates. Resolution order:
 * `"patient"` (patient slot) → `"board"` / `"atlas"` (nearest placement whose
 * equipment interaction kind is board/atlas) → capability (nearest placement
 * providing it; with `preferPatientSlot`, the slot's linked monitor or a
 * provider in the slot's room first) → room id (room centre) → room kind
 * (nearest room of that kind) → placement id. Returns null when nothing
 * matches.
 */
export function resolveWaypoint(
  f: FacilityDefinition,
  catalogs: EquipmentCatalog[],
  target: string,
  options: ResolveWaypointOptions = {},
): WaypointLocation | null {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const from = options.from ?? f.spawn;
  if (target === "patient") return resolvePatient(f, options.slotId, locale);

  const byPlacement = (accept: (p: Placement, type: EquipmentType | undefined) => boolean): WaypointLocation | null => {
    const hit = nearestPlacement(f, catalogs, from, accept);
    return hit ? { x: hit.placement.x, z: hit.placement.z, label: placementLabel(hit.placement, hit.type, locale) } : null;
  };

  if (target === "board" || target === "atlas") return byPlacement((_, type) => type?.interaction.kind === target);

  const provides = (p: Placement, type: EquipmentType | undefined) => (type?.capabilities ?? []).includes(target) || (p.capabilities ?? []).includes(target);
  if (options.preferPatientSlot) {
    // The patient's own bedside kit (e.g. its linked monitor), never the nearest one in another room.
    const slot = options.slotId ? f.patientSlots.find((x) => x.id === options.slotId) : f.patientSlots[0];
    const room = slot ? f.rooms.find((r) => r.id === slot.room) : undefined;
    if (slot) {
      const linked = slot.monitor ? f.placements.find((p) => p.id === slot.monitor) : undefined;
      if (linked && provides(linked, equipmentOf(catalogs, linked.type))) return { x: linked.x, z: linked.z, label: placementLabel(linked, equipmentOf(catalogs, linked.type), locale) };
      const inRoom = room ? nearestPlacement(f, catalogs, slot, (p, type) => provides(p, type) && rectContains(room.rect, p.x, p.z)) : null;
      if (inRoom) return { x: inRoom.placement.x, z: inRoom.placement.z, label: placementLabel(inRoom.placement, inRoom.type, locale) };
    }
  }
  const byCapability = byPlacement(provides);
  if (byCapability) return byCapability;

  const room = f.rooms.find((r) => r.id === target);
  if (room) return { x: room.rect.x, z: room.rect.z, label: t(room.name, locale) };

  const ofKind = f.rooms.filter((r) => r.kind === target).sort((a, b) => distance(a.rect, from) - distance(b.rect, from))[0];
  if (ofKind) return { x: ofKind.rect.x, z: ofKind.rect.z, label: t(ofKind.name, locale) };

  const placement = f.placements.find((p) => p.id === target);
  if (placement) return { x: placement.x, z: placement.z, label: placementLabel(placement, equipmentOf(catalogs, placement.type), locale) };
  return null;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const err = (path: string, message: string): Issue => ({ path, message, severity: "error" });
const warn = (path: string, message: string): Issue => ({ path, message, severity: "warning" });

function duplicateIds(items: { id: string }[], collection: string): Issue[] {
  const seen = new Set<string>();
  const issues: Issue[] = [];
  items.forEach((item, i) => {
    if (seen.has(item.id)) issues.push(err(`${collection}.${i}.id`, `duplicate ${collection} id "${item.id}"`));
    seen.add(item.id);
  });
  return issues;
}

/** Every (path, material id) a facility references. */
function materialRefs(f: FacilityDefinition): [string, string][] {
  const refs: [string, string][] = [["terrain.ground", f.terrain.ground]];
  f.terrain.paths.forEach((p, i) => refs.push([`terrain.paths.${i}.material`, p.material]));
  f.buildings.forEach((b, i) => {
    refs.push([`buildings.${i}.floor`, b.floor], [`buildings.${i}.walls.base`, b.walls.base], [`buildings.${i}.walls.body`, b.walls.body]);
    refs.push([`buildings.${i}.walls.top`, b.walls.top], [`buildings.${i}.roof.material`, b.roof.material]);
    if (b.roof.beams) refs.push([`buildings.${i}.roof.beams`, b.roof.beams]);
  });
  f.rooms.forEach((r, i) => {
    if (r.floor) refs.push([`rooms.${i}.floor`, r.floor]);
    r.partitions.forEach((p, j) => refs.push([`rooms.${i}.partitions.${j}.material`, p.material], [`rooms.${i}.partitions.${j}.base`, p.base]));
  });
  f.buildZone?.materials.forEach((m, i) => refs.push([`buildZone.materials.${i}`, m]));
  f.buildZone?.seedBlocks.forEach((b, i) => refs.push([`buildZone.seedBlocks.${i}.type`, b.type]));
  f.placements.forEach((p, i) => p.extraParts?.forEach((part, j) => refs.push([`placements.${i}.extraParts.${j}.m`, part.m])));
  return refs;
}

/** True when a part's box (local frame, before rotation) leaves the footprint (tolerance `SPATIAL_TOLERANCE`). */
function partOutsideFootprint(part: VoxelPart, footprint: EquipmentType["footprint"]): boolean {
  const { w, d, h } = footprint;
  const tol = SPATIAL_TOLERANCE;
  const [px, py, pz] = part.p;
  const [sx, sy, sz] = part.s;
  return Math.abs(px) + sx / 2 > w / 2 + tol || Math.abs(pz) + sz / 2 > d / 2 + tol || py - sy / 2 < -tol || py + sy / 2 > h + tol;
}

function checkMaterials(f: FacilityDefinition, catalogs: EquipmentCatalog[]): Issue[] {
  const issues: Issue[] = [];
  const catalogMaterials = mergeCatalogs(catalogs).materials;
  f.materials.forEach((m, i) => {
    if (catalogMaterials.has(m.id)) issues.push(warn(`materials.${i}.id`, `facility material "${m.id}" shadows a catalog material`));
  });
  const known = new Set([...catalogMaterials.keys(), ...f.materials.map((m) => m.id)]);
  for (const [path, id] of materialRefs(f)) {
    if (!known.has(id)) issues.push(err(path, `unknown material "${id}"`));
  }
  return issues;
}

function checkRooms(f: FacilityDefinition): Issue[] {
  const issues: Issue[] = [];
  const b = f.bounds;
  const boundsRect: Rect | null =
    b.maxX > b.minX && b.maxZ > b.minZ ? { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2, w: b.maxX - b.minX, d: b.maxZ - b.minZ } : null;
  f.rooms.forEach((room, i) => {
    const building = room.building ? f.buildings.find((x) => x.id === room.building) : undefined;
    if (room.building && !building) issues.push(err(`rooms.${i}.building`, `unknown building "${room.building}"`));
    if (building && !rectInside(room.rect, building.rect)) issues.push(warn(`rooms.${i}.rect`, `room "${room.id}" extends outside building "${building.id}"`));
    if (boundsRect && !rectInside(room.rect, boundsRect)) issues.push(warn(`rooms.${i}.rect`, `room "${room.id}" extends outside the facility bounds`));
  });
  return issues;
}

function checkPlacements(f: FacilityDefinition, catalogs: EquipmentCatalog[]): Issue[] {
  const issues: Issue[] = [];
  f.placements.forEach((p, i) => {
    const type = equipmentOf(catalogs, p.type);
    if (!type) issues.push(err(`placements.${i}.type`, `unknown equipment type "${p.type}"`));
    if (!inBounds(f, p.x, p.z)) issues.push(err(`placements.${i}`, `placement "${p.id}" at (${p.x}, ${p.z}) is outside the facility bounds`));
    if (p.rot % 90 !== 0) issues.push(warn(`placements.${i}.rot`, `rotation ${p.rot}° is not a multiple of 90 (colliders are axis-aligned)`));
    const room = p.room ? f.rooms.find((r) => r.id === p.room) : undefined;
    if (p.room && !room) issues.push(err(`placements.${i}.room`, `unknown room "${p.room}"`));
    if (room && !rectContains(room.rect, p.x, p.z, SPATIAL_TOLERANCE)) issues.push(warn(`placements.${i}`, `placement "${p.id}" is outside its room "${room.id}"`));
    (p.capabilities ?? []).forEach((cap, j) => {
      if (!(cap in CAPABILITIES)) issues.push(warn(`placements.${i}.capabilities.${j}`, `non-canonical capability "${cap}"`));
    });
    if (!type) return;
    (p.hideParts ?? []).forEach((index, j) => {
      if (index >= type.parts.length) issues.push(err(`placements.${i}.hideParts.${j}`, `"${type.id}" has no part ${index} (it has ${type.parts.length})`));
    });
    (p.extraParts ?? []).forEach((part, j) => {
      if (partOutsideFootprint(part, type.footprint)) {
        const { w, d, h } = type.footprint;
        issues.push(warn(`placements.${i}.extraParts.${j}`, `extra part extends outside the ${w}×${d}×${h} footprint of "${type.id}"`));
      }
    });
  });
  return issues;
}

function checkOverlaps(f: FacilityDefinition, catalogs: EquipmentCatalog[]): Issue[] {
  const solids: { index: number; placement: Placement; box: Box }[] = [];
  f.placements.forEach((placement, index) => {
    const type = equipmentOf(catalogs, placement.type);
    if (type?.solid) solids.push({ index, placement, box: placementBox(placement, type) });
  });
  const issues: Issue[] = [];
  for (let a = 0; a < solids.length; a++) {
    for (let b = a + 1; b < solids.length; b++) {
      const o = overlapDepth(solids[a].box, solids[b].box);
      if (o.x > SPATIAL_TOLERANCE && o.z > SPATIAL_TOLERANCE && o.y > SPATIAL_TOLERANCE) {
        issues.push(
          warn(
            `placements.${solids[b].index}`,
            `solid "${solids[b].placement.id}" overlaps solid "${solids[a].placement.id}" by ${o.x.toFixed(2)}×${o.z.toFixed(2)} m`,
          ),
        );
      }
    }
  }
  return issues;
}

function checkSlots(f: FacilityDefinition, catalogs: EquipmentCatalog[]): Issue[] {
  const issues: Issue[] = [];
  const linked = (i: number, field: "bed" | "monitor", id: string | undefined): void => {
    if (!id) return;
    const placement = f.placements.find((p) => p.id === id);
    if (!placement) {
      issues.push(err(`patientSlots.${i}.${field}`, `unknown placement "${id}"`));
      return;
    }
    const type = equipmentOf(catalogs, placement.type);
    if (type && type.interaction.kind !== field) {
      issues.push(warn(`patientSlots.${i}.${field}`, `placement "${id}" (${type.id}) is not a ${field} (interaction kind "${type.interaction.kind}")`));
    }
  };
  f.patientSlots.forEach((slot, i) => {
    const room = f.rooms.find((r) => r.id === slot.room);
    if (!room) issues.push(err(`patientSlots.${i}.room`, `unknown room "${slot.room}"`));
    else if (!rectContains(room.rect, slot.x, slot.z, SPATIAL_TOLERANCE)) issues.push(warn(`patientSlots.${i}`, `slot "${slot.id}" lies outside its room "${room.id}"`));
    if (!inBounds(f, slot.x, slot.z)) issues.push(err(`patientSlots.${i}`, `slot "${slot.id}" is outside the facility bounds`));
    linked(i, "bed", slot.bed);
    linked(i, "monitor", slot.monitor);
  });
  return issues;
}

function checkStaffAndSpawn(f: FacilityDefinition): Issue[] {
  const issues: Issue[] = [];
  const b = f.bounds;
  if (b.minX >= b.maxX || b.minZ >= b.maxZ) issues.push(err("bounds", "bounds must satisfy minX < maxX and minZ < maxZ"));
  if (!inBounds(f, f.spawn.x, f.spawn.z)) issues.push(err("spawn", "spawn point is outside the facility bounds"));
  f.staff.forEach((s, i) => {
    if (!f.rooms.some((r) => r.id === s.room)) issues.push(err(`staff.${i}.room`, `unknown room "${s.room}"`));
    if (!inBounds(f, s.x, s.z)) issues.push(err(`staff.${i}`, `staff "${s.id}" is outside the facility bounds`));
  });
  return issues;
}

/**
 * Validate a facility against the loaded catalogs: unknown catalogs,
 * equipment types and materials (terrain, walls, floors, roofs, partitions,
 * build zone, placement `extraParts`), duplicate ids, positions outside
 * bounds/rooms, patient-slot references, out-of-range `hideParts` indices,
 * non-90° rotations, extra parts outside the type's footprint and
 * overlapping solid footprints (warnings, rotation-aware, tolerance
 * `SPATIAL_TOLERANCE`).
 */
export function checkFacility(f: FacilityDefinition, catalogs: EquipmentCatalog[]): Issue[] {
  const loaded = new Set(catalogs.map((c) => c.id));
  const issues: Issue[] = [];
  f.catalogs.forEach((id, i) => {
    if (!loaded.has(id)) issues.push(warn(`catalogs.${i}`, `catalog "${id}" is not loaded`));
  });
  issues.push(
    ...duplicateIds(f.buildings, "buildings"),
    ...duplicateIds(f.rooms, "rooms"),
    ...duplicateIds(f.placements, "placements"),
    ...duplicateIds(f.patientSlots, "patientSlots"),
    ...duplicateIds(f.staff, "staff"),
    ...duplicateIds(f.materials, "materials"),
    ...checkStaffAndSpawn(f),
    ...checkMaterials(f, catalogs),
    ...checkRooms(f),
    ...checkPlacements(f, catalogs),
    ...checkSlots(f, catalogs),
    ...checkOverlaps(f, catalogs),
  );
  return issues;
}

/**
 * Validate equipment catalogs together: duplicate material/equipment ids
 * across catalogs, parts using unknown materials (error), parts outside the
 * declared footprint, screens without a "screen" part and non-canonical
 * capabilities (warnings). Paths are prefixed with `catalog(<id>)`.
 */
export function checkCatalogs(catalogs: EquipmentCatalog[]): Issue[] {
  const issues: Issue[] = [];
  const materialOwner = new Map<string, string>();
  const equipmentOwner = new Map<string, string>();
  for (const catalog of catalogs) {
    const prefix = `catalog(${catalog.id})`;
    catalog.materials.forEach((m, i) => {
      const owner = materialOwner.get(m.id);
      if (owner) issues.push(warn(`${prefix}.materials.${i}.id`, `material "${m.id}" is also defined by catalog "${owner}"`));
      materialOwner.set(m.id, catalog.id);
    });
    catalog.equipment.forEach((e, i) => {
      const owner = equipmentOwner.get(e.id);
      if (owner) issues.push(warn(`${prefix}.equipment.${i}.id`, `equipment "${e.id}" is also defined by catalog "${owner}"`));
      equipmentOwner.set(e.id, catalog.id);
    });
  }
  for (const catalog of catalogs) {
    const prefix = `catalog(${catalog.id})`;
    catalog.equipment.forEach((e, i) => issues.push(...checkEquipmentType(e, `${prefix}.equipment.${i}`, materialOwner)));
  }
  return issues;
}

function checkEquipmentType(e: EquipmentType, path: string, materials: Map<string, string>): Issue[] {
  const issues: Issue[] = [];
  const { w, d, h } = e.footprint;
  e.parts.forEach((part, j) => {
    if (!materials.has(part.m)) issues.push(err(`${path}.parts.${j}.m`, `unknown material "${part.m}"`));
    if (partOutsideFootprint(part, e.footprint)) issues.push(warn(`${path}.parts.${j}`, `part extends outside the ${w}×${d}×${h} footprint of "${e.id}"`));
  });
  if (e.screen !== "none" && !e.parts.some((p) => p.name === "screen")) {
    issues.push(warn(`${path}.screen`, `"${e.id}" declares screen "${e.screen}" but has no part named "screen"`));
  }
  e.capabilities.forEach((cap, j) => {
    if (!(cap in CAPABILITIES)) issues.push(warn(`${path}.capabilities.${j}`, `non-canonical capability "${cap}"`));
  });
  return issues;
}
