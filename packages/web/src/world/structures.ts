/**
 * Buildings, walls with openings (doors / windows), roofs with skylights
 * and beams, rooms (floors, partitions, ceiling lamps, signs) and free
 * standing facility signs — V4 clinic construction generalised to data.
 *
 * Walls come from the collision model's wall layout (`ctx.collision.walls`,
 * @clinicalcraft/world `facilityWalls`) and so do their colliders: this
 * module builds visuals only; door leaves keep a reference to their model
 * colliders so opening/closing a door toggles them.
 *
 * Levels (EMBODIED R10): every level a building spans gets its walls at
 * that level's elevation (with the building's wall style); the ground slab
 * is drawn on the default level and the roof on the building's top level
 * only (upper floors are the model's slabs, see stairs.ts); rooms, their
 * partitions, lamps and signs stand on their own level.
 */
import { Group, Mesh, type Material, type Object3D } from "three";
import { buildingLevels, roomLevel } from "@clinicalcraft/core";
import { subtractAreas, type WallMaterials, type WallSpec } from "@clinicalcraft/world";
import type { BuildContext, DoorLeaf, DoorRecord } from "./context.js";
import {
  greedyRects,
  mergeWallPieces,
  rectContains,
  segmentWall,
  sideRotation,
  signWidth,
  splitInterval,
  wallLine,
  wallPoint,
  type Rect,
  type ResolvedOpening,
  type Side,
  type WallLine,
} from "./geometry.js";
import { mergeGroup } from "./merge.js";
import type { Aabb } from "./physics.js";
import { strings, tx } from "./strings.js";
import { UNIT_BOX } from "./voxels.js";

export { sideRotation };
export type { WallMaterials };

export interface WallRecord {
  wall: WallLine;
  thickness: number;
  height: number;
  openings: ResolvedOpening[];
  partition: boolean;
  /** Level of the wall. */
  level: string;
}

function addBox(ctx: BuildContext, mat: string, wall: WallLine, a: number, b: number, y0: number, y1: number, thickness: number, offset = 0, tiled = false) {
  const c = (a + b) / 2;
  const p = wallPoint(wall, c);
  const len = b - a;
  const h = y1 - y0;
  const add = tiled ? ctx.batch.addTiled.bind(ctx.batch) : ctx.batch.add.bind(ctx.batch);
  if (wall.axis === "x") add(mat, p.x, (y0 + y1) / 2, p.z + offset, len, h, thickness);
  else add(mat, p.x + offset, (y0 + y1) / 2, p.z, thickness, h, len);
}

/**
 * Build one wall's visuals: voxel pieces by course, windows and door leaves.
 * Its colliders (merged wall spans, window panes, closed leaves) are the
 * collision model's, already registered in `ctx.colliders`.
 */
export function buildWall(ctx: BuildContext, spec: WallSpec): WallRecord {
  const { wall, height, thickness, materials: mats, openings: resolved } = spec;
  const e = spec.elevation;
  const pieces = segmentWall(wall, height, resolved);
  // visual pieces: V4 1×1 blocks merged per course into tiled boxes (same pixels, far fewer instances)
  const matOf = (p: { course: string }) => (p.course === "base" ? mats.base : p.course === "top" ? mats.top : mats.body);
  for (const p of mergeWallPieces(pieces, matOf)) addBox(ctx, p.key, wall, p.a, p.b, p.y0 + e, p.y1 + e, thickness, 0, true);
  // openings
  const ownerName = tx(spec.ownerName, ctx.locale);
  resolved.forEach((o, i) => {
    const id = spec.openingIds[i];
    if (o.kind === "window") buildWindow(ctx, wall, o, thickness, mats, e);
    else if (o.kind !== "opening" && id) buildDoor(ctx, wall, o, thickness, mats, id.slice("door:".length), ownerName, spec.partition, e, spec.level);
  });
  return { wall, thickness, height, openings: resolved, partition: spec.partition, level: spec.level };
}

function buildWindow(ctx: BuildContext, wall: WallLine, o0: ResolvedOpening, thickness: number, mats: WallMaterials, elevation = 0) {
  const o = elevation ? { ...o0, y0: o0.y0 + elevation, y1: o0.y1 + elevation } : o0;
  const glass = ctx.lib.has("glass") ? "glass" : mats.body;
  addBox(ctx, glass, wall, o.a, o.b, o.y0, o.y1, Math.min(0.1, thickness));
  const frame = mats.frame ?? mats.base;
  const ft = 0.1;
  const fd = Math.min(thickness + 0.04, 0.4);
  // The frame sits 2 mm inside the hole and the jambs stop at sill / head: faces that coincided with
  // the wall's reveal faces (and with each other in the corners) z-fought in stripes.
  const e = 0.002;
  addBox(ctx, frame, wall, o.a + e, o.b - e, o.y0 + e, o.y0 + ft, fd);
  addBox(ctx, frame, wall, o.a + e, o.b - e, o.y1 - ft, o.y1 - e, fd);
  addBox(ctx, frame, wall, o.a + e, o.a + ft, o.y0 + ft, o.y1 - ft, fd);
  addBox(ctx, frame, wall, o.b - ft, o.b - e, o.y0 + ft, o.y1 - ft, fd);
  const width = o.b - o.a;
  if (width >= 2.5) {
    const n = Math.floor(width / 1.5);
    const mid = (o.a + o.b) / 2;
    const mullion = mats.mullion ?? (ctx.lib.has("wood") ? "wood" : frame);
    for (let i = 0; i < n; i++) {
      const u = mid + (i - (n - 1) / 2) * 1.5;
      addBox(ctx, mullion, wall, u - 0.04, u + 0.04, o.y0 + ft, o.y1 - ft, Math.min(thickness, 0.3) + 0.02);
    }
  }
}

function leafMesh(mat: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, parent: Object3D): Mesh {
  const m = new Mesh(UNIT_BOX, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function buildDoor(ctx: BuildContext, wall: WallLine, o: ResolvedOpening, thickness: number, mats: WallMaterials, id: string, ownerName: string, interior = false, elevation = 0, level = ctx.level) {
  const S = strings(ctx.locale);
  const width = o.b - o.a;
  const h = o.y1 - o.y0;
  const centreU = (o.a + o.b) / 2;
  const c = wallPoint(wall, centreU);
  const frame = new Group();
  frame.position.set(c.x, elevation, c.z);
  frame.rotation.y = sideRotation(wall.side);
  ctx.root.add(frame);
  const leafMat = ctx.lib.get(ctx.lib.has(mats.base) ? mats.base : "teal");
  const glassMat = ctx.lib.get(ctx.lib.has("glass") ? "glass" : mats.body);
  const handleMat = ctx.lib.get(ctx.lib.has("wood") ? "wood" : mats.top);
  const leaves: DoorLeaf[] = [];
  const objects: Object3D[] = [];
  const name = `${ownerName}${ctx.locale.startsWith("zh") ? "" : " "}${interior ? S.roomDoor : S.door}`;
  const target = { kind: "door" as const, id, name, hint: interior ? S.roomDoorOpen : S.doorOpen };
  // closed-leaf colliders: the collision model's (`door:<id>:<leaf>`), already in ctx.colliders
  const spec = ctx.doorSpecs.get(id);
  const leafCollider = (leaf: number): Aabb => {
    const box = spec ? ctx.physics.get(spec.colliders[leaf] ?? "") : undefined;
    if (box) return box;
    ctx.warnings.push(`door ${id}: no collider for leaf ${leaf} in the collision model`);
    return { minX: c.x, maxX: c.x, minY: 0, maxY: 0, minZ: c.z, maxZ: c.z, door: true, enabled: false };
  };

  if (o.kind === "double-door" || o.kind === "door") {
    const sides = o.kind === "double-door" ? [-1, 1] : [-1];
    const lw = o.kind === "double-door" ? width / 2 : width;
    for (const side of sides) {
      const pivot = new Group();
      pivot.position.set(side * (width / 2), 0, 0);
      frame.add(pivot);
      const leaf = new Group();
      leaf.position.x = -side * (lw / 2);
      pivot.add(leaf);
      const parts = [
        leafMesh(leafMat, 0, h / 2, 0, lw + 0.02, h, 0.15, leaf),
        leafMesh(glassMat, 0, h * 0.617, 0.09, Math.max(0.2, lw - 0.38), h / 2, 0.04, leaf),
        leafMesh(handleMat, -side * Math.max(0.1, lw / 2 - 0.26), h * 0.433, 0.13, 0.1, 0.34, 0.1, leaf),
      ];
      for (const p of parts) p.userData.action = target;
      leaf.userData.action = target;
      mergeGroup(leaf, new Set(), ctx.lib); // leaf + handle → 1 atlas mesh, glass pane → 1 mesh
      ctx.pickables.push(leaf);
      objects.push(leaf);
      const collider = leafCollider(leaves.length);
      leaves.push({ pivot, openValue: -side * Math.PI * 0.49, mode: "swing", collider });
    }
  } else if (o.kind === "sliding-door") {
    const lw = width / 2;
    const steel = ctx.lib.get(ctx.lib.has("steel") ? "steel" : mats.base);
    for (const side of [-1, 1]) {
      const pivot = new Group();
      pivot.position.set(side * (lw / 2), 0, thickness / 2 + 0.08);
      frame.add(pivot);
      const parts = [
        leafMesh(glassMat, 0, h / 2, 0, lw, h - 0.1, 0.06, pivot),
        leafMesh(steel, 0, h - 0.05, 0, lw, 0.1, 0.1, pivot),
        leafMesh(steel, -side * (lw / 2 - 0.05), h / 2, 0, 0.1, h, 0.1, pivot),
        leafMesh(steel, side * (lw / 2 - 0.05), h / 2, 0, 0.1, h, 0.1, pivot),
      ];
      for (const p of parts) p.userData.action = target;
      pivot.userData.action = target;
      mergeGroup(pivot, new Set(), ctx.lib); // glass → 1 mesh, the three steel rails → 1 mesh
      ctx.pickables.push(pivot);
      objects.push(pivot);
      const collider = leafCollider(leaves.length);
      leaves.push({ pivot, openValue: side * (lw - 0.1), mode: "slide", slideAxis: "x", baseX: pivot.position.x, collider });
    }
    // header rail
    leafMesh(steel, 0, h + 0.08, thickness / 2 + 0.08, width * 2, 0.16, 0.14, frame);
  }
  // doorway area: the model's (where a closing door would hit the player)
  const pa = wallPoint(wall, o.a), pb = wallPoint(wall, o.b);
  const depth = thickness / 2 + 0.9;
  const area =
    spec?.area ??
    (wall.axis === "x"
      ? { minX: Math.min(pa.x, pb.x), maxX: Math.max(pa.x, pb.x), minZ: wall.line - depth, maxZ: wall.line + depth }
      : { minX: wall.line - depth, maxX: wall.line + depth, minZ: Math.min(pa.z, pb.z), maxZ: Math.max(pa.z, pb.z) });
  const rec: DoorRecord = { id, name, open: false, leaves, area: { ...area }, centre: { x: c.x, z: c.z }, target, objects, interior, level };
  ctx.doors.push(rec);
}

/** Open/close a door (colliders follow; animation is applied in the frame loop). */
export function setDoorOpen(door: DoorRecord, open: boolean, locale: string): void {
  door.open = open;
  for (const l of door.leaves) l.collider.enabled = !open;
  const S = strings(locale);
  door.target.hint = door.interior ? (open ? S.roomDoorClose : S.roomDoorOpen) : open ? S.doorClose : S.doorOpen;
}

/** Per-frame door animation (V4 lerp, factor dt·9). Returns whether any leaf visibly moved (shadow refresh). */
export function animateDoors(doors: DoorRecord[], dt: number): boolean {
  const k = Math.min(1, dt * 9);
  let moved = false;
  for (const d of doors)
    for (const l of d.leaves) {
      if (l.mode === "swing") {
        const delta = ((d.open ? l.openValue : 0) - l.pivot.rotation.y) * k;
        if (Math.abs(delta) > 1e-4) moved = true;
        l.pivot.rotation.y += delta;
      } else {
        const goal = (l.baseX ?? 0) + (d.open ? l.openValue : 0);
        const delta = (goal - l.pivot.position.x) * k;
        if (Math.abs(delta) > 1e-4) moved = true;
        l.pivot.position.x += delta;
      }
    }
  return moved;
}

/** Building containing a point (for room heights / lamp y). */
function buildingAt(ctx: BuildContext, x: number, z: number) {
  return ctx.facility.buildings.find((b) => rectContains(b.rect, x, z, 0.01)) ?? null;
}

/** Roof of a building at height `H` (top storey): rect + 1.5 overhang, 1-unit tiles, skylight glazing and beams. */
function buildRoof(ctx: BuildContext, b: BuildingDef, H: number): void {
  const roof = b.roof ?? { material: "roof", skylights: [] };
  const roofMat = roof.material ?? "roof";
  const skylights: Rect[] = roof.skylights ?? [];
  const minX = b.rect.x - b.rect.w / 2 - 1.5, maxX = b.rect.x + b.rect.w / 2 + 1.5;
  const minZ = b.rect.z - b.rect.d / 2 - 1.5, maxZ = b.rect.z + b.rect.d / 2 + 1.5;
  const xs = splitInterval(minX, maxX, [], 1);
  const zs = splitInterval(minZ, maxZ, [], 1);
  const roofCell = (ix: number, iz: number) => (skylights.some((s) => rectContains(s, (xs[ix][0] + xs[ix][1]) / 2, (zs[iz][0] + zs[iz][1]) / 2)) ? null : roofMat);
  for (const g of greedyRects(xs.length, zs.length, roofCell)) {
    const x0 = xs[g.ix0][0], x1 = xs[g.ix1][1], z0 = zs[g.iz0][0], z1 = zs[g.iz1][1];
    ctx.batch.addTiled(g.value, (x0 + x1) / 2, H + 0.15, (z0 + z1) / 2, x1 - x0, 0.3, z1 - z0);
  }
  for (const s of skylights) {
    const longZ = s.d >= s.w;
    if (ctx.lib.has("glass")) {
      if (longZ) ctx.batch.add("glass", s.x, H + 0.2, s.z, s.w - 0.2, 0.08, s.d + 1);
      else ctx.batch.add("glass", s.x, H + 0.2, s.z, s.w + 1, 0.08, s.d - 0.2);
    }
    if (roof.beams) {
      const long = longZ ? s.d : s.w;
      const short = longZ ? s.w : s.d;
      for (const sgn of [-1, 1]) {
        if (longZ) ctx.batch.add(roof.beams, s.x + (sgn * s.w) / 2, H + 0.05, s.z, 0.18, 0.35, s.d + 1);
        else ctx.batch.add(roof.beams, s.x, H + 0.05, s.z + (sgn * s.d) / 2, s.w + 1, 0.35, 0.18);
      }
      const start = (longZ ? s.z - s.d / 2 : s.x - s.w / 2) + 0.5;
      for (let u = start; u <= start + long - 0.5; u += 4) {
        if (longZ) ctx.batch.add(roof.beams, s.x, H + 0.08, u, short + 0.2, 0.2, 0.18);
        else ctx.batch.add(roof.beams, u, H + 0.08, s.z, 0.18, 0.2, short + 0.2);
      }
    }
  }
}

type BuildingDef = BuildContext["facility"]["buildings"][number];

export function buildStructures(ctx: BuildContext): WallRecord[] {
  const f = ctx.facility;
  const walls: WallRecord[] = [];
  // the model's wall layout, every level (buildings in order, then partitions, deduplicated)
  const specs = ctx.collision.walls;
  for (const b of f.buildings) {
    const spans = buildingLevels(f, b);
    const top = spans.reduce((hi, l) => (ctx.levels.elevation(l) > ctx.levels.elevation(hi) ? l : hi), spans[0]);
    const ws = Object.assign({ height: 5, base: "teal", body: "cream", top: "wood", thickness: 1 }, b.walls ?? {});
    const H = ws.height;
    const t = ws.thickness;
    for (const level of spans) {
      ctx.onLevel(level);
      const e = ctx.levels.elevation(level);
      // floor slab (top at y = .01; avoids V4's grass z-fighting); upper floors are the model's slabs (stairs.ts)
      if (level === ctx.level) ctx.batch.add(b.floor ?? "floor", b.rect.x, -0.09, b.rect.z, b.rect.w + t, 0.2, b.rect.d + t);
      for (const spec of specs) if (!spec.partition && spec.owner === b.id && spec.level === level) walls.push(buildWall(ctx, spec));
      // roof on the building's top level only (rect + 1.5 overhang, 1-unit tiles, skylight holes) at H + .15
      if (level === top) buildRoof(ctx, b, e + H);
      // building sign (V4: front wall, y H − .95, .11 proud of the wall face, width 7) — on the lowest storey
      if (b.sign && level === spans[0]) {
        const text = tx(b.sign.text, ctx.locale);
        const wl = wallLine(b.rect, b.sign.side, t, "building");
        const len = wl.to - wl.from;
        const sign = ctx.signs.make(text, Math.min(7, len * 0.5), b.sign.color ?? undefined);
        const p = wallPoint(wl, wl.centre);
        const out = t / 2 + 0.11;
        sign.position.set(p.x + (wl.axis === "z" ? wl.outward * out : 0), e + H - 0.95, p.z + (wl.axis === "x" ? wl.outward * out : 0));
        sign.rotation.y = sideRotation(b.sign.side);
        ctx.root.add(sign);
      }
    }
  }

  // rooms: floors, partitions (the model's sub-walls, deduplicated per line), lamps, signs — on their level
  for (const r of f.rooms) {
    const level = roomLevel(f, r);
    ctx.onLevel(level);
    const e = ctx.levels.elevation(level);
    if (r.floor) {
      // an upper level's room floor keeps the stairwells open (flights arriving on this level)
      const holes = level === ctx.level ? [] : ctx.levels.flights.filter((fl) => fl.head.level === level).map((fl) => fl.area);
      const rect = { minX: r.rect.x - r.rect.w / 2, maxX: r.rect.x + r.rect.w / 2, minZ: r.rect.z - r.rect.d / 2, maxZ: r.rect.z + r.rect.d / 2 };
      const cut = holes.some((h) => h.minX < rect.maxX && h.maxX > rect.minX && h.minZ < rect.maxZ && h.maxZ > rect.minZ);
      if (!cut) ctx.batch.add(r.floor, r.rect.x, e - 0.08, r.rect.z, r.rect.w, 0.2, r.rect.d);
      else for (const a of subtractAreas(rect, holes)) ctx.batch.add(r.floor, (a.minX + a.maxX) / 2, e - 0.08, (a.minZ + a.maxZ) / 2, a.maxX - a.minX, 0.2, a.maxZ - a.minZ);
    }
    const building = (r.building && f.buildings.find((b) => b.id === r.building)) || buildingAt(ctx, r.rect.x, r.rect.z);
    const bH = building?.walls?.height ?? 5;
    for (const spec of specs) if (spec.partition && spec.owner === r.id) walls.push(buildWall(ctx, spec));
    const rodMat = ctx.lib.has("steel") ? "steel" : "coal";
    for (const l of r.lights ?? []) {
      ctx.batch.add("lamp", l.x, e + bH - 0.27, l.z, 2.4, 0.08, 1.2);
      ctx.lights.push({ x: l.x, y: e + bH - 1.3, z: l.z, color: "#fff2d3", intensity: 13, distance: 11, decay: 2, level });
      if (building) {
        // pendant rods up to the ceiling (or the skylight glazing) so fixtures do not float
        const underSky = (building.roof?.skylights ?? []).some((s) => Math.abs(l.x - s.x) < s.w / 2 + 1.2 && Math.abs(l.z - s.z) < s.d / 2 + 0.6);
        const top = underSky ? bH + 0.16 : bH;
        const y0 = bH - 0.23;
        if (top - y0 > 0.02) for (const dx of [-0.95, 0.95]) ctx.batch.add(rodMat, l.x + dx, e + (y0 + top) / 2, l.z, 0.04, top - y0, 0.04);
      }
    }
    if (r.sign) {
      const side: Side = r.sign.side ?? "n";
      const text = tx(r.sign.text, ctx.locale);
      const part = (r.partitions ?? []).find((p) => p.side === side);
      const wlRoom = wallLine(r.rect, side, 0.35, "exact");
      let thick = part?.thickness ?? 0.35;
      let wallH = part?.height ?? 4;
      if (!part && building) {
        // room side on a building wall?
        const bw = wallLine(building.rect, side, building.walls?.thickness ?? 1, "building");
        if (Math.abs(bw.line - wlRoom.line) < 0.6) {
          thick = building.walls?.thickness ?? 1;
          wallH = building.walls?.height ?? 5;
        }
      }
      const y = e + Math.min(wallH - 0.65, 3.7);
      const sign = ctx.signs.make(text, Math.min(signWidth(text, 2.4, 3.8), (wlRoom.to - wlRoom.from) * 0.8), r.sign.color ?? undefined);
      const p = wallPoint(wlRoom, wlRoom.centre);
      const inset = -wlRoom.outward * (thick / 2 + 0.07);
      sign.position.set(p.x + (wlRoom.axis === "z" ? inset : 0), y, p.z + (wlRoom.axis === "x" ? inset : 0));
      sign.rotation.y = sideRotation(side) + Math.PI; // face into the room
      ctx.root.add(sign);
    }
  }
  ctx.onLevel(ctx.level);

  // free-standing signs (a post's collider is the model's `sign:<i>`)
  for (const s of f.signs ?? []) {
    const text = tx(s.text, ctx.locale);
    const width = s.width ?? 3;
    const sign = ctx.signs.make(text, width, s.color ?? undefined, true);
    sign.position.set(s.x, s.y, s.z);
    sign.rotation.y = ((s.rot ?? 0) * Math.PI) / 180;
    ctx.root.add(sign);
    if (s.post) {
      const hgt = s.y + 0.25;
      ctx.batch.add("wood", s.x, hgt / 2, s.z, 0.2, hgt, 0.2);
    }
  }
  return walls;
}
