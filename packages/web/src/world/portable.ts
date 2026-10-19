/**
 * Portable equipment (carts, handheld items — EMBODIED §5/§8): built as one
 * standalone, movable group per placement instead of joining the static
 * instanced batches, so the renderer can draw a cart where the world model
 * says it stands after a `move_to` (and hide an item while it is carried).
 * Draw-call budget: the boxes of one placement merge into one atlas mesh
 * (plus one mesh per non-atlas material), as people and door leaves do.
 */
import { Box3, Group, Mesh, Vector3, type InstancedMesh, type Object3D } from "three";
import type { BuildContext, PortableRecord } from "./context.js";
import { DEG, placementBox } from "./geometry.js";
import type { MaterialLibrary } from "./materials.js";
import { mergeGroup } from "./merge.js";
import { BoxBatch, UNIT_BOX } from "./voxels.js";

interface Part {
  mat: string;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  owner: string | undefined;
}

/**
 * A `BoxBatch` for one movable placement: `build` merges its boxes into
 * atlas meshes (owner kept in `userData.owner` for the aim ray) instead of
 * one instanced mesh per material.
 */
export class MergedBoxes extends BoxBatch {
  private readonly parts: Part[] = [];

  override add(mat: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, owner?: string): void {
    this.parts.push({ mat, x, y, z, sx, sy, sz, ry, owner });
    this.count++;
  }

  override addTiled(mat: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, owner?: string): void {
    this.add(mat, x, y, z, sx, sy, sz, ry, owner);
  }

  /** Merged meshes into `parent` (returned; they carry the placement as `userData.owner`). */
  override build(parent: Object3D, mats: MaterialLibrary, shadows: boolean): InstancedMesh[] {
    return this.buildMerged(parent, mats, shadows) as unknown as InstancedMesh[];
  }

  buildMerged(parent: Object3D, mats: MaterialLibrary, shadows: boolean): Mesh[] {
    if (!this.parts.length) return [];
    const tmp = new Group();
    for (const p of this.parts) {
      const m = new Mesh(UNIT_BOX, mats.get(p.mat));
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = p.ry;
      m.scale.set(p.sx, p.sy, p.sz);
      m.castShadow = shadows && mats.castShadow(p.mat);
      tmp.add(m);
    }
    const owner = this.parts.find((p) => p.owner)?.owner;
    mergeGroup(tmp, new Set(), mats, { castShadow: shadows && this.parts.some((p) => mats.castShadow(p.mat)) });
    const out: Mesh[] = [];
    for (const child of [...tmp.children]) {
      const mesh = child as Mesh;
      if (!mesh.isMesh) continue;
      if (owner) mesh.userData.owner = owner;
      parent.add(mesh);
      out.push(mesh);
    }
    return out;
  }
}

/**
 * Start building a portable placement: its group goes into the level's
 * group, and what builders emit next (`ctx.root`, `ctx.batch`) goes into
 * it; `finish()` merges the boxes, restores the context and registers the
 * record in `ctx.portables`.
 */
export function beginPortable(
  ctx: BuildContext,
  p: { id: string; x: number; z: number; rot: number },
  y: number,
  level: string,
): { record: PortableRecord; finish(): Mesh[] } {
  const group = new Group();
  group.name = `portable:${p.id}`;
  group.position.set(p.x, y, p.z);
  const inner = new Group();
  inner.position.set(-p.x, -y, -p.z);
  group.add(inner);
  ctx.root.add(group);
  const record: PortableRecord = { id: p.id, group, inner, origin: { x: p.x, y, z: p.z, rot: p.rot, level }, x: p.x, z: p.z, level, hidden: false, meshes: [] };
  const batch = new MergedBoxes();
  const prevRoot = ctx.root, prevBatch = ctx.batch;
  ctx.root = inner;
  ctx.batch = batch;
  return {
    record,
    finish() {
      ctx.root = prevRoot;
      ctx.batch = prevBatch;
      const meshes = batch.buildMerged(inner, ctx.lib, ctx.shadows);
      // screens, spinning parts… added to `inner` while the parts were emitted are aimable too
      for (const o of inner.children) if (o.userData.owner && !meshes.includes(o as Mesh)) record.meshes.push(o);
      record.meshes.push(...meshes);
      ctx.portables.set(p.id, record);
      return meshes;
    },
  };
}

/** What moving a portable placement touches outside its group (index.ts owns these). */
export interface PortableHost {
  ctx: BuildContext;
  /** The group of a level (re-parenting when a cart changes level). */
  levelRoot(level: string): Object3D;
  elevation(level: string): number;
  /** Register / unregister a physics collider of a level. */
  addCollider(box: import("./physics.js").Aabb, level: string): import("./physics.js").Aabb;
  removeCollider(box: import("./physics.js").Aabb): void;
  markShadows(): void;
}

/** Remember where the aim box, live screens and lights of `rec` were built (moves are applied from there). */
function homeOf(ctx: BuildContext, rec: PortableRecord): NonNullable<PortableRecord["home"]> {
  if (!rec.home) {
    const target = ctx.targets.get(rec.id);
    rec.home = {
      box: target ? target.box.clone() : null,
      screens: new Map(ctx.screens.filter((sc) => sc.placementId === rec.id).map((sc) => [sc, { x: sc.x, z: sc.z }])),
      lights: new Map(ctx.lights.filter((l) => l.source === rec.id).map((l) => [l, { x: l.x, z: l.z }])),
    };
  }
  return rec.home;
}

/** Remove the placement's physics collider (pushed, carried) — it comes back where it is parked. */
function dropCollider(host: PortableHost, rec: PortableRecord): void {
  const id = `eq:${rec.id}`;
  const box = host.ctx.physics.get(id);
  if (!box) return;
  host.removeCollider(box);
  host.ctx.physics.delete(id);
}

/**
 * Draw a portable placement at a spot of the world model (`null`: hidden —
 * carried by someone; `"home"`: back where it was authored). Its collider,
 * aim target, map/locate position and live screens follow.
 */
export function placePortable(host: PortableHost, rec: PortableRecord, at: { x: number; y: number; z: number; level: string; rot?: number } | "home" | null): void {
  const { ctx } = host;
  const info = ctx.placements.get(rec.id);
  const home = homeOf(ctx, rec);
  const hide = at === null;
  const spot = at === "home" || at === null ? { x: rec.origin.x, y: host.elevation(rec.origin.level), z: rec.origin.z, level: rec.origin.level, rot: rec.origin.rot } : at;
  rec.pushedBy = null;
  // the placement's own height above its floor is kept (carts stand on the floor: 0)
  const lift = rec.origin.y - host.elevation(rec.origin.level);
  const y = host.elevation(spot.level) + lift;
  const rot = spot.rot ?? rec.origin.rot;
  if (spot.level !== rec.level || rec.group.parent !== host.levelRoot(spot.level)) host.levelRoot(spot.level).add(rec.group);
  rec.group.position.set(spot.x, y, spot.z);
  rec.group.rotation.y = (rot - rec.origin.rot) * DEG;
  rec.group.updateMatrixWorld(true);
  rec.x = spot.x;
  rec.z = spot.z;
  rec.level = spot.level;
  // aim: hidden meshes leave the pickables
  const pickIndex = (o: Object3D) => ctx.pickables.indexOf(o);
  if (hide && !rec.hidden) for (const m of rec.meshes) if (pickIndex(m) >= 0) ctx.pickables.splice(pickIndex(m), 1);
  if (!hide && rec.hidden) for (const m of rec.meshes) if (pickIndex(m) < 0) ctx.pickables.push(m);
  rec.hidden = hide;
  rec.group.visible = !hide;
  // collider (solid equipment): the model's footprint box at the new spot
  dropCollider(host, rec);
  if (!hide && info?.solid) {
    const box = placementBox({ x: spot.x, z: spot.z, y, rot }, info.type.footprint);
    ctx.physics.set(`eq:${rec.id}`, host.addCollider({ ...box }, spot.level));
  }
  const dx = spot.x - rec.origin.x, dz = spot.z - rec.origin.z;
  const dy = host.elevation(spot.level) - host.elevation(rec.origin.level);
  if (info) {
    info.x = spot.x;
    info.z = spot.z;
    info.level = spot.level;
    info.elevation = host.elevation(spot.level);
    info.rot = rot;
  }
  const target = ctx.targets.get(rec.id);
  if (target) {
    if (home.box) target.box.copy(home.box).translate(new Vector3(dx, dy, dz));
    target.x = spot.x;
    target.z = spot.z;
    target.level = spot.level;
  }
  for (const [sc, h] of home.screens) {
    sc.x = h.x + dx;
    sc.z = h.z + dz;
    sc.level = spot.level;
  }
  for (const [l, h] of home.lights) {
    l.x = h.x + dx;
    l.z = h.z + dz;
    l.level = spot.level;
  }
  host.markShadows();
}

/** How far in front of the walker (m) a pushed cart is drawn. */
export const PUSH_AHEAD = 0.95;

/** Start / stop pushing: the collider is lifted while the cart travels with its walker. */
export function pushPortable(host: PortableHost, rec: PortableRecord, by: string | null): void {
  homeOf(host.ctx, rec);
  if (by) {
    rec.pushedBy = by;
    dropCollider(host, rec);
    return;
  }
  rec.pushedBy = null;
}

/**
 * Draw a pushed cart in front of its walker (each frame): (x, z) feet, `yaw`
 * the walker's facing (world convention: 0 looks −Z), on `level`.
 */
export function dragPortable(host: PortableHost, rec: PortableRecord, x: number, z: number, yaw: number, level: string): void {
  const ax = x - Math.sin(yaw) * PUSH_AHEAD, az = z - Math.cos(yaw) * PUSH_AHEAD;
  const lift = rec.origin.y - host.elevation(rec.origin.level);
  if (level !== rec.level) {
    host.levelRoot(level).add(rec.group);
    rec.level = level;
  }
  rec.group.position.set(ax, host.elevation(level) + lift, az);
  rec.x = ax;
  rec.z = az;
}

/** The world box of a portable placement as drawn (QA). */
export function portableBox(rec: PortableRecord): Box3 {
  return new Box3().setFromObject(rec.group);
}
