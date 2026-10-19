/**
 * The collision model (EMBODIED R2): a pure derivation of every collider the
 * world has — building walls and room partitions (merged per wall column and
 * span, exactly as the renderer builds them), windows, closed door leaves,
 * solid equipment footprints, patient and staff bodies, trees, sign posts
 * and build-zone blocks — with stable ids. The three.js renderer, physics,
 * navigation and visibility all consume this one model.
 *
 * Collider ids: `wall:<ownerKey>:<side>:<k>`, `partition:<ownerKey>:<side>:<n>:<k>`,
 * `window:<ownerKey>:<side>:<n>`, `door:<ownerKey>:<side>:<n>:<leaf>`,
 * `eq:<placementId>`, `patient:<slotId>`, `staff:<staffId>`, `tree:<i>`,
 * `sign:<i>`, `block:<x>,<y>,<z>`.
 *
 * `opaque` (line of sight at eye height): walls, partitions, closed door
 * leaves, trees, blocks and solid equipment spanning eye height (1.62 m above
 * its floor); windows, bodies and sign posts are not. Visibility tests a
 * collider only where it spans the eye height (the lintel over a door does
 * not hide the room behind it). `passable`: door leaves (opened on the way
 * unless locked); everything else blocks.
 */
import { mergeCatalogs, type EquipmentCatalog, type EquipmentType, type FacilityDefinition, type Placement } from "@clinicalcraft/core";
import { buildRules, validBlocks, type Cell } from "./buildzone.js";
import type { Aabb, Collider, ColliderKind, CollisionModel, DoorSpec } from "./contracts.js";
import { placementBox, rotateXZ, rotatedFootprint, segmentWall, sideRotation, wallPoint, type ResolvedOpening, type WallLine } from "./geometry.js";
import { doorName } from "./i18n.js";
import { defaultLevelId, entityLevel, levelElevation } from "./levels.js";
import { boxCollider, PHYSICS } from "./physics.js";
import { facilityWalls, type WallSpec } from "./walls.js";

export type Posture = "standing" | "sitting" | "lying";

/** Eye height above the floor (V4 PHYSICS.eye): the height line of sight is tested at. */
export const EYE_HEIGHT = PHYSICS.eye;

/** Options of `buildCollisionModel`. */
export interface CollisionOptions {
  /** Patients in slots (posture default: the slot's). A patient sitting or lying on the slot's bed adds no body (the bed collides). */
  patients?: readonly { slotId: string; posture?: Posture }[];
  /** Build-zone blocks (a restored save) instead of the zone's `seedBlocks`; both are validated with the zone rules. */
  blocks?: readonly { cell: readonly number[]; type: string }[] | null;
  /** Include staff bodies (default true). Navigation treats them as dynamic obstacles. */
  staff?: boolean;
}

/* ------------------------------------------------------------------ */
/* Box helpers (also used by the renderer for runtime changes)          */
/* ------------------------------------------------------------------ */

const plain = (b: Aabb): Aabb => ({ minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY, minZ: b.minZ, maxZ: b.maxZ });

const lift = (b: Aabb, dy: number): Aabb => (dy === 0 ? plain(b) : { ...plain(b), minY: b.minY + dy, maxY: b.maxY + dy });

/** World box of a stretch [a, b] × [y0, y1] of a wall (full thickness). */
export function wallBox(wall: WallLine, a: number, b: number, y0: number, y1: number, thickness: number): Aabb {
  const pa = wallPoint(wall, a), pb = wallPoint(wall, b);
  if (wall.axis === "x") return { minX: Math.min(pa.x, pb.x), maxX: Math.max(pa.x, pb.x), minY: y0, maxY: y1, minZ: wall.line - thickness / 2, maxZ: wall.line + thickness / 2 };
  return { minX: wall.line - thickness / 2, maxX: wall.line + thickness / 2, minY: y0, maxY: y1, minZ: Math.min(pa.z, pb.z), maxZ: Math.max(pa.z, pb.z) };
}

/**
 * Solid boxes of a wall: the pieces of `segmentWall` merged per column into
 * contiguous vertical spans, then equal neighbouring columns merged (floor
 * level; add the wall's elevation for its level).
 */
export function wallSolidBoxes(spec: Pick<WallSpec, "wall" | "height" | "thickness" | "openings">): Aabb[] {
  const pieces = segmentWall(spec.wall, spec.height, spec.openings);
  const cols = new Map<string, { a: number; b: number; spans: [number, number][] }>();
  for (const p of pieces) {
    const k = `${p.a.toFixed(4)}|${p.b.toFixed(4)}`;
    let c = cols.get(k);
    if (!c) cols.set(k, (c = { a: p.a, b: p.b, spans: [] }));
    c.spans.push([p.y0, p.y1]);
  }
  const merged: { a: number; b: number; spans: [number, number][] }[] = [];
  for (const c of [...cols.values()].sort((p, q) => p.a - q.a)) {
    c.spans.sort((p, q) => p[0] - q[0]);
    const spans: [number, number][] = [];
    for (const s of c.spans) {
      const last = spans[spans.length - 1];
      if (last && s[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], s[1]);
      else spans.push([s[0], s[1]]);
    }
    const prev = merged[merged.length - 1];
    const same = prev && Math.abs(prev.b - c.a) < 1e-6 && prev.spans.length === spans.length && prev.spans.every((s, i) => Math.abs(s[0] - spans[i][0]) < 1e-6 && Math.abs(s[1] - spans[i][1]) < 1e-6);
    if (same) prev.b = c.b;
    else merged.push({ a: c.a, b: c.b, spans });
  }
  const out: Aabb[] = [];
  for (const m of merged) for (const [y0, y1] of m.spans) out.push(wallBox(spec.wall, m.a, m.b, y0, y1, spec.thickness));
  return out;
}

/**
 * Closed-leaf boxes of a door opening (floor level): one leaf for `door`,
 * two for `double-door` and `sliding-door`; 0.2 m deep on the wall line.
 */
export function doorLeafBoxes(wall: WallLine, o: Pick<ResolvedOpening, "a" | "b" | "y0" | "y1" | "kind">): Aabb[] {
  const width = o.b - o.a;
  const h = o.y1 - o.y0;
  const c = wallPoint(wall, (o.a + o.b) / 2);
  const rotDeg = (sideRotation(wall.side) * 180) / Math.PI;
  const leaf = (lx: number, lw: number): Aabb => {
    const [dx, dz] = rotateXZ(lx, 0, rotDeg);
    const fp = rotatedFootprint(lw, 0.2, rotDeg);
    return plain(boxCollider(c.x + dx, h / 2, c.z + dz, fp.w, h, fp.d));
  };
  if (o.kind === "door" || o.kind === "double-door") {
    const sides = o.kind === "double-door" ? [-1, 1] : [-1];
    const lw = o.kind === "double-door" ? width / 2 : width;
    return sides.map((side) => leaf(side * (width / 2) - side * (lw / 2), lw));
  }
  if (o.kind === "sliding-door") {
    const lw = width / 2;
    return [-1, 1].map((side) => leaf(side * (lw / 2), lw));
  }
  return [];
}

/** Doorway area: the opening's extent along the wall × (wall thickness / 2 + 0.9 m) on both sides. */
export function doorwayArea(wall: WallLine, o: Pick<ResolvedOpening, "a" | "b">, thickness: number): DoorSpec["area"] {
  const pa = wallPoint(wall, o.a), pb = wallPoint(wall, o.b);
  const depth = thickness / 2 + 0.9;
  return wall.axis === "x"
    ? { minX: Math.min(pa.x, pb.x), maxX: Math.max(pa.x, pb.x), minZ: wall.line - depth, maxZ: wall.line + depth }
    : { minX: wall.line - depth, maxX: wall.line + depth, minZ: Math.min(pa.z, pb.z), maxZ: Math.max(pa.z, pb.z) };
}

/** Body box of a person by posture at (x, z), floor level (V4 rig sizes); null when a bed or chair takes the body. */
export function npcBodyBox(posture: Posture, onBed: boolean, x: number, z: number): Aabb | null {
  if (onBed) return null;
  if (posture === "standing") return plain(boxCollider(x, 0.94, z, 0.85, 1.88, 0.6));
  if (posture === "sitting") return plain(boxCollider(x, 0.6, z, 0.8, 1.2, 0.8));
  return plain(boxCollider(x, 0.25, z, 0.8, 0.5, 2.1));
}

/** Body box of a standing staff member at (x, z), floor level. */
export function staffBodyBox(x: number, z: number): Aabb {
  return plain(boxCollider(x, 0.94, z, 0.85, 1.88, 0.6));
}

/** Box of a build-zone block (1 m voxel at integer cell). */
export function blockBox(cell: readonly number[]): Aabb {
  return plain(boxCollider(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5, 1, 1, 1));
}

/** Trunk box of a terrain tree (V4: 1 × h × 1). */
export function treeBox(t: { x: number; z: number; h: number }): Aabb {
  return plain(boxCollider(t.x, t.h / 2, t.z, 1, t.h, 1));
}

/** Post box of a free-standing sign with `post: true`. */
export function signPostBox(s: { x: number; y: number; z: number }): Aabb {
  const h = s.y + 0.25;
  return plain(boxCollider(s.x, h / 2, s.z, 0.2, h, 0.2));
}

/**
 * Where a patient in a slot is: lying on the slot's bed → the bed's centre
 * and rotation, otherwise the slot. `onBed` (sitting or lying with a bed)
 * means the bed/chair is the collider. Unknown slot → null.
 */
export function patientPose(
  f: Pick<FacilityDefinition, "patientSlots" | "placements">,
  equipment: ReadonlyMap<string, EquipmentType>,
  slotId: string,
  posture?: Posture,
): { x: number; z: number; rot: number; posture: Posture; bed: Placement | null; onBed: boolean } | null {
  const slot = f.patientSlots.find((s) => s.id === slotId);
  if (!slot) return null;
  const p: Posture = posture ?? slot.posture ?? "standing";
  const placement = slot.bed ? f.placements.find((x) => x.id === slot.bed) : undefined;
  const bed = placement && equipment.has(placement.type) ? placement : null;
  if (p === "lying" && bed) return { x: bed.x, z: bed.z, rot: bed.rot ?? 0, posture: p, bed, onBed: true };
  return { x: slot.x, z: slot.z, rot: slot.rot ?? 0, posture: p, bed, onBed: p !== "standing" && !!bed };
}

/** Body box of the patient in a slot (floor level; null on a bed/chair or for an unknown slot). */
export function patientBodyBox(f: Pick<FacilityDefinition, "patientSlots" | "placements">, equipment: ReadonlyMap<string, EquipmentType>, slotId: string, posture?: Posture): Aabb | null {
  const pose = patientPose(f, equipment, slotId, posture);
  return pose ? npcBodyBox(pose.posture, pose.onBed, pose.x, pose.z) : null;
}

/** Does a box span the eye height above `floor`? */
export function spansEye(b: Aabb, floor = 0): boolean {
  return b.minY - floor <= EYE_HEIGHT && b.maxY - floor >= EYE_HEIGHT;
}

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

/**
 * Derive the collision model of a facility: every collider, in the
 * renderer's build order (trees, walls with their windows and door leaves,
 * partitions, sign posts, equipment, patients, staff, blocks), and the door
 * records. Unknown equipment types add no collider (as in the renderer).
 */
export function buildCollisionModel(f: FacilityDefinition, catalogs: readonly EquipmentCatalog[], opts: CollisionOptions = {}): CollisionModel {
  const { equipment } = mergeCatalogs([...catalogs]);
  const ground = defaultLevelId(f);
  const groundElevation = levelElevation(f, ground);
  const colliders: Collider[] = [];
  const doors: DoorSpec[] = [];
  const add = (id: string, kind: ColliderKind, level: string, box: Aabb, extra: { entity?: string; opaque: boolean; passable?: boolean }) => {
    const c: Collider = { id, kind, level, ...plain(box), opaque: extra.opaque, passable: extra.passable ?? false };
    if (extra.entity) c.entity = extra.entity;
    colliders.push(c);
    return c;
  };

  // terrain trees (ground level)
  (f.terrain?.trees ?? []).forEach((t, i) => add(`tree:${i}`, "tree", ground, lift(treeBox(t), groundElevation), { opaque: true }));

  // walls, windows and closed door leaves
  const walls = facilityWalls(f);
  const roomsByLevel = new Map<string, FacilityDefinition["rooms"]>();
  for (const r of f.rooms) {
    const level = r.level ?? ground;
    roomsByLevel.set(level, [...(roomsByLevel.get(level) ?? []), r]);
  }
  for (const spec of walls) {
    const kind: ColliderKind = spec.partition ? "partition" : "wall";
    wallSolidBoxes(spec).forEach((box, k) => add(`${spec.key}:${k}`, kind, spec.level, lift(box, spec.elevation), { opaque: true }));
    spec.openings.forEach((o, i) => {
      const id = spec.openingIds[i];
      if (!id) return;
      if (o.kind === "window") {
        add(id, "window", spec.level, lift(wallBox(spec.wall, o.a, o.b, o.y0, o.y1, spec.thickness), spec.elevation), { opaque: false });
        return;
      }
      const leaves = doorLeafBoxes(spec.wall, o).map((box, leaf) => add(`${id}:${leaf}`, "door", spec.level, lift(box, spec.elevation), { entity: id, opaque: true, passable: true }).id);
      const centre = wallPoint(spec.wall, (o.a + o.b) / 2);
      doors.push({
        id,
        name: doorName(spec.ownerName, spec.partition),
        level: spec.level,
        kind: o.kind as DoorSpec["kind"],
        centre,
        axis: spec.wall.axis,
        width: o.b - o.a,
        height: o.y1 - o.y0,
        interior: spec.partition,
        owner: spec.owner,
        side: spec.side,
        colliders: leaves,
        rooms: doorRooms(roomsByLevel.get(spec.level) ?? [], spec, centre),
        area: doorwayArea(spec.wall, o, spec.thickness),
      });
    });
  }

  // free-standing sign posts
  (f.signs ?? []).forEach((s, i) => {
    if (s.post) add(`sign:${i}`, "sign", ground, lift(signPostBox(s), groundElevation), { opaque: false });
  });

  // solid equipment footprints
  for (const p of f.placements) {
    const type = equipment.get(p.type);
    if (!type || type.solid === false) continue;
    const level = entityLevel(f, p);
    const floor = levelElevation(f, level);
    const box = lift(placementBox({ x: p.x, z: p.z, y: p.y ?? 0, rot: p.rot ?? 0 }, type.footprint), floor);
    add(`eq:${p.id}`, "equipment", level, box, { entity: `eq:${p.id}`, opaque: spansEye(box, floor) });
  }

  // patient bodies (a patient on the slot's bed/chair adds none)
  for (const patient of opts.patients ?? []) {
    const slot = f.patientSlots.find((s) => s.id === patient.slotId);
    const box = slot ? patientBodyBox(f, equipment, slot.id, patient.posture) : null;
    if (!slot || !box) continue;
    const level = entityLevel(f, slot);
    add(`patient:${slot.id}`, "npc", level, lift(box, levelElevation(f, level)), { entity: `patient:${slot.id}`, opaque: false });
  }

  // staff bodies
  if (opts.staff !== false) {
    for (const st of f.staff ?? []) {
      const level = entityLevel(f, st);
      add(`staff:${st.id}`, "npc", level, lift(staffBodyBox(st.x, st.z), levelElevation(f, level)), { entity: `staff:${st.id}`, opaque: false });
    }
  }

  // build-zone blocks (restored save or seed blocks), validated with the zone rules
  if (f.buildZone) {
    const rules = buildRules(f.buildZone);
    const source = opts.blocks ?? f.buildZone.seedBlocks ?? [];
    for (const b of validBlocks(rules, source as { cell: unknown; type: unknown }[])) {
      add(`block:${b.cell.join(",")}`, "block", ground, lift(blockBox(b.cell as Cell), groundElevation), { opaque: true });
    }
  }

  return { bounds: { ...f.bounds }, colliders, doors, walls };
}

/** Rooms on either side of a door: [inside (against the wall's outward normal), outside]. */
function doorRooms(rooms: FacilityDefinition["rooms"], spec: WallSpec, centre: { x: number; z: number }): [string | null, string | null] {
  const offset = spec.thickness / 2 + 0.3;
  const probe = (sign: number) => {
    const x = centre.x + (spec.wall.axis === "z" ? sign * spec.wall.outward * offset : 0);
    const z = centre.z + (spec.wall.axis === "x" ? sign * spec.wall.outward * offset : 0);
    let best: string | null = null;
    let area = Infinity;
    for (const r of rooms) {
      if (Math.abs(x - r.rect.x) > r.rect.w / 2 || Math.abs(z - r.rect.z) > r.rect.d / 2) continue;
      const a = r.rect.w * r.rect.d;
      if (a < area) {
        area = a;
        best = r.id;
      }
    }
    return best;
  };
  return [probe(-1), probe(1)];
}

/** Colliders of a model indexed by id. */
export function colliderIndex(model: Pick<CollisionModel, "colliders">): Map<string, Collider> {
  return new Map(model.colliders.map((c) => [c.id, c]));
}
