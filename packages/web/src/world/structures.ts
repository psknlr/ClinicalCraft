/**
 * Buildings, walls with openings (doors / windows), roofs with skylights
 * and beams, rooms (floors, partitions, ceiling lamps, signs) and free
 * standing facility signs — V4 clinic construction generalised to data.
 */
import { Group, Mesh, type Material, type Object3D } from "three";
import type { BuildContext, DoorLeaf, DoorRecord } from "./context.js";
import {
  greedyRects,
  mergeWallPieces,
  rectContains,
  resolveOpenings,
  rotateXZ,
  rotatedFootprint,
  segmentWall,
  signWidth,
  splitInterval,
  wallLine,
  wallPoint,
  type OpeningSpec,
  type Rect,
  type ResolvedOpening,
  type Side,
  type WallLine,
} from "./geometry.js";
import { boxCollider, type Aabb } from "./physics.js";
import { strings, tx } from "./strings.js";
import { UNIT_BOX } from "./voxels.js";

/** Rotation (rad about +Y) that turns local +Z to face outward on `side`; local +X then runs along the wall. */
export function sideRotation(side: Side): number {
  switch (side) {
    case "n":
      return Math.PI;
    case "e":
      return Math.PI / 2;
    case "w":
      return -Math.PI / 2;
    default:
      return 0;
  }
}

export interface WallMaterials {
  base: string;
  body: string;
  top: string;
}

export interface WallRecord {
  wall: WallLine;
  thickness: number;
  height: number;
  openings: ResolvedOpening[];
  partition: boolean;
}

interface WallBuildOptions {
  ownerId: string;
  ownerName: string;
  partition: boolean;
  /** Openings outside this interval were built by another wall (dedupe). */
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

function wallAabb(wall: WallLine, a: number, b: number, y0: number, y1: number, thickness: number): Aabb {
  const pa = wallPoint(wall, a), pb = wallPoint(wall, b);
  if (wall.axis === "x")
    return { minX: Math.min(pa.x, pb.x), maxX: Math.max(pa.x, pb.x), minY: y0, maxY: y1, minZ: wall.line - thickness / 2, maxZ: wall.line + thickness / 2 };
  return { minX: wall.line - thickness / 2, maxX: wall.line + thickness / 2, minY: y0, maxY: y1, minZ: Math.min(pa.z, pb.z), maxZ: Math.max(pa.z, pb.z) };
}

/** Build one wall: voxel pieces by course, merged colliders, windows and doors. */
export function buildWall(
  ctx: BuildContext,
  wall: WallLine,
  height: number,
  thickness: number,
  openings: Partial<OpeningSpec>[],
  mats: WallMaterials,
  opts: WallBuildOptions,
): WallRecord {
  const resolved = resolveOpenings(wall, height, openings);
  const pieces = segmentWall(wall, height, resolved);
  // visual pieces: V4 1×1 blocks merged per course into tiled boxes (same pixels, far fewer instances)
  const matOf = (p: { course: string }) => (p.course === "base" ? mats.base : p.course === "top" ? mats.top : mats.body);
  for (const p of mergeWallPieces(pieces, matOf)) addBox(ctx, p.key, wall, p.a, p.b, p.y0, p.y1, thickness, 0, true);
  // colliders: merge each column's contiguous solid spans, then merge equal neighbouring columns
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
  for (const m of merged) for (const [y0, y1] of m.spans) ctx.colliders.add(wallAabb(wall, m.a, m.b, y0, y1, thickness));

  // openings
  let doorIndex = 0;
  for (const o of resolved) {
    if (o.kind === "window") buildWindow(ctx, wall, o, thickness, mats);
    else if (o.kind !== "opening") buildDoor(ctx, wall, o, thickness, mats, `${opts.ownerId}:${wall.side}:${doorIndex++}`, opts.ownerName);
  }
  return { wall, thickness, height, openings: resolved, partition: opts.partition };
}

function buildWindow(ctx: BuildContext, wall: WallLine, o: ResolvedOpening, thickness: number, mats: WallMaterials) {
  const glass = ctx.lib.has("glass") ? "glass" : mats.body;
  addBox(ctx, glass, wall, o.a, o.b, o.y0, o.y1, Math.min(0.1, thickness));
  ctx.colliders.add(wallAabb(wall, o.a, o.b, o.y0, o.y1, thickness));
  const frame = mats.base;
  const ft = 0.1;
  const fd = Math.min(thickness + 0.04, 0.4);
  addBox(ctx, frame, wall, o.a, o.b, o.y0, o.y0 + ft, fd);
  addBox(ctx, frame, wall, o.a, o.b, o.y1 - ft, o.y1, fd);
  addBox(ctx, frame, wall, o.a, o.a + ft, o.y0, o.y1, fd);
  addBox(ctx, frame, wall, o.b - ft, o.b, o.y0, o.y1, fd);
  const width = o.b - o.a;
  if (width >= 2.5) {
    const n = Math.floor(width / 1.5);
    const mid = (o.a + o.b) / 2;
    const mullion = ctx.lib.has("wood") ? "wood" : frame;
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

function buildDoor(ctx: BuildContext, wall: WallLine, o: ResolvedOpening, thickness: number, mats: WallMaterials, id: string, ownerName: string) {
  const S = strings(ctx.locale);
  const width = o.b - o.a;
  const h = o.y1 - o.y0;
  const centreU = (o.a + o.b) / 2;
  const c = wallPoint(wall, centreU);
  const frame = new Group();
  frame.position.set(c.x, 0, c.z);
  frame.rotation.y = sideRotation(wall.side);
  ctx.root.add(frame);
  const leafMat = ctx.lib.get(ctx.lib.has(mats.base) ? mats.base : "teal");
  const glassMat = ctx.lib.get(ctx.lib.has("glass") ? "glass" : mats.body);
  const handleMat = ctx.lib.get(ctx.lib.has("wood") ? "wood" : mats.top);
  const leaves: DoorLeaf[] = [];
  const objects: Object3D[] = [];
  const name = `${ownerName}${ctx.locale.startsWith("zh") ? "" : " "}${S.door}`;
  const target = { kind: "door" as const, id, name, hint: S.doorOpen };
  const rotDeg = (sideRotation(wall.side) * 180) / Math.PI;
  /** Closed-leaf collider: frame-local centre (lx, h/2, 0), size (lw, h, .2) → world AABB. */
  const worldBox = (lx: number, lw: number): Aabb => {
    const [dx, dz] = rotateXZ(lx, 0, rotDeg);
    const fp = rotatedFootprint(lw, 0.2, rotDeg);
    return boxCollider(c.x + dx, h / 2, c.z + dz, fp.w, h, fp.d, { door: true });
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
      ctx.pickables.push(leaf);
      objects.push(leaf);
      const collider = ctx.colliders.add(worldBox(side * (width / 2) - side * (lw / 2), lw));
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
      ctx.pickables.push(pivot);
      objects.push(pivot);
      const collider = ctx.colliders.add(worldBox(side * (lw / 2), lw));
      leaves.push({ pivot, openValue: side * (lw - 0.1), mode: "slide", slideAxis: "x", baseX: pivot.position.x, collider });
    }
    // header rail
    leafMesh(steel, 0, h + 0.08, thickness / 2 + 0.08, width * 2, 0.16, 0.14, frame);
  }
  const pa = wallPoint(wall, o.a), pb = wallPoint(wall, o.b);
  const depth = thickness / 2 + 0.9;
  const area =
    wall.axis === "x"
      ? { minX: Math.min(pa.x, pb.x), maxX: Math.max(pa.x, pb.x), minZ: wall.line - depth, maxZ: wall.line + depth }
      : { minX: wall.line - depth, maxX: wall.line + depth, minZ: Math.min(pa.z, pb.z), maxZ: Math.max(pa.z, pb.z) };
  const rec: DoorRecord = { id, name, open: false, leaves, area, centre: { x: c.x, z: c.z }, target, objects };
  ctx.doors.push(rec);
}

/** Open/close a door (colliders follow; animation is applied in the frame loop). */
export function setDoorOpen(door: DoorRecord, open: boolean, locale: string): void {
  door.open = open;
  for (const l of door.leaves) l.collider.enabled = !open;
  const S = strings(locale);
  door.target.hint = open ? S.doorClose : S.doorOpen;
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

export function buildStructures(ctx: BuildContext): WallRecord[] {
  const f = ctx.facility;
  const walls: WallRecord[] = [];
  const S = strings(ctx.locale);
  void S;
  for (const b of f.buildings) {
    const ws = Object.assign({ height: 5, base: "teal", body: "cream", top: "wood", thickness: 1 }, b.walls ?? {});
    const H = ws.height;
    const t = ws.thickness;
    const name = tx(b.name, ctx.locale);
    // floor slab (top at y = .01; avoids V4's grass z-fighting)
    ctx.batch.add(b.floor ?? "floor", b.rect.x, -0.09, b.rect.z, b.rect.w + t, 0.2, b.rect.d + t);
    for (const side of ["n", "s", "e", "w"] as Side[]) {
      const wl = wallLine(b.rect, side, t, "building");
      const openings = (b.openings ?? []).filter((o) => o.side === side);
      walls.push(buildWall(ctx, wl, H, t, openings, { base: ws.base, body: ws.body, top: ws.top }, { ownerId: b.id, ownerName: name, partition: false }));
    }
    // roof (rect + 1.5 overhang, 1-unit tiles, skylight holes) at H + .15
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
    // building sign (V4: front wall, y H − .95, .11 proud of the wall face, width 7)
    if (b.sign) {
      const text = tx(b.sign.text, ctx.locale);
      const wl = wallLine(b.rect, b.sign.side, t, "building");
      const len = wl.to - wl.from;
      const sign = ctx.signs.make(text, Math.min(7, len * 0.5), b.sign.color ?? undefined);
      const p = wallPoint(wl, wl.centre);
      const out = t / 2 + 0.11;
      sign.position.set(p.x + (wl.axis === "z" ? wl.outward * out : 0), H - 0.95, p.z + (wl.axis === "x" ? wl.outward * out : 0));
      sign.rotation.y = sideRotation(b.sign.side);
      ctx.root.add(sign);
    }
  }

  // rooms: floors, partitions (deduplicated per line), lamps, signs
  const built = new Map<string, [number, number][]>();
  for (const r of f.rooms) {
    const name = tx(r.name, ctx.locale);
    if (r.floor) ctx.batch.add(r.floor, r.rect.x, -0.08, r.rect.z, r.rect.w, 0.2, r.rect.d);
    const building = (r.building && f.buildings.find((b) => b.id === r.building)) || buildingAt(ctx, r.rect.x, r.rect.z);
    const bH = building?.walls?.height ?? 5;
    for (const p of r.partitions ?? []) {
      const th = p.thickness ?? 0.35;
      const height = p.height ?? 4;
      const wl = wallLine(r.rect, p.side, th, "exact");
      const key = `${wl.axis}:${wl.line.toFixed(2)}`;
      const done = built.get(key) ?? [];
      // build only the parts of [from, to] not already covered on this line
      let segs: [number, number][] = [[wl.from, wl.to]];
      for (const [a, b] of done) {
        const next: [number, number][] = [];
        for (const [s0, s1] of segs) {
          if (b <= s0 || a >= s1) next.push([s0, s1]);
          else {
            if (a > s0) next.push([s0, a]);
            if (b < s1) next.push([b, s1]);
          }
        }
        segs = next;
      }
      for (const [s0, s1] of segs) {
        if (s1 - s0 < 0.05) continue;
        const sub: WallLine = { ...wl, from: s0, to: s1 };
        walls.push(
          buildWall(ctx, sub, height, th, (p.openings ?? []).map((o) => ({ ...o })), { base: p.base ?? "teal", body: p.material ?? "white", top: p.material ?? "white" }, {
            ownerId: r.id,
            ownerName: name,
            partition: true,
          }),
        );
      }
      done.push([wl.from, wl.to]);
      built.set(key, done);
    }
    const rodMat = ctx.lib.has("steel") ? "steel" : "coal";
    for (const l of r.lights ?? []) {
      ctx.batch.add("lamp", l.x, bH - 0.27, l.z, 2.4, 0.08, 1.2);
      ctx.lights.push({ x: l.x, y: bH - 1.3, z: l.z, color: "#fff2d3", intensity: 13, distance: 11, decay: 2 });
      if (building) {
        // pendant rods up to the ceiling (or the skylight glazing) so fixtures do not float
        const underSky = (building.roof?.skylights ?? []).some((s) => Math.abs(l.x - s.x) < s.w / 2 + 1.2 && Math.abs(l.z - s.z) < s.d / 2 + 0.6);
        const top = underSky ? bH + 0.16 : bH;
        const y0 = bH - 0.23;
        if (top - y0 > 0.02) for (const dx of [-0.95, 0.95]) ctx.batch.add(rodMat, l.x + dx, (y0 + top) / 2, l.z, 0.04, top - y0, 0.04);
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
      const y = Math.min(wallH - 0.65, 3.7);
      const sign = ctx.signs.make(text, Math.min(signWidth(text, 2.4, 3.8), (wlRoom.to - wlRoom.from) * 0.8), r.sign.color ?? undefined);
      const p = wallPoint(wlRoom, wlRoom.centre);
      const inset = -wlRoom.outward * (thick / 2 + 0.07);
      sign.position.set(p.x + (wlRoom.axis === "z" ? inset : 0), y, p.z + (wlRoom.axis === "x" ? inset : 0));
      sign.rotation.y = sideRotation(side) + Math.PI; // face into the room
      ctx.root.add(sign);
    }
  }

  // free-standing signs
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
      ctx.colliders.add(boxCollider(s.x, hgt / 2, s.z, 0.2, hgt, 0.2));
    }
  }
  return walls;
}
