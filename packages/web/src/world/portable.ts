/**
 * Portable equipment (carts, handheld items — EMBODIED §5/§8): drawn where
 * the world model says it stands after a `move_to` (hidden while carried).
 * Draw-call budget: a portable placement is built into the static instanced
 * batches like any other — no extra draw call — while its boxes are also
 * recorded; the first time the world moves it, it is *promoted*: its
 * instances in the static batch are hidden, its boxes merged into its own
 * movable group (one atlas mesh plus one per non-atlas material, as people
 * and door leaves), and its LEDs and static screens taken out of the
 * level-wide merged meshes into that group (equipment.ts `detachShared`).
 */
import { Group, Mesh, Vector3, type Object3D } from "three";
import type { BuildContext, PortableRecord } from "./context.js";
import { DEG, placementBox } from "./geometry.js";
import type { MaterialLibrary } from "./materials.js";
import { mergeGroup } from "./merge.js";
import { BoxBatch, UNIT_BOX, type InstanceRef } from "./voxels.js";

/** One box of a portable placement (world coordinates), as the builders emitted it. */
export interface BoxPart {
  mat: string;
  tiled: boolean;
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
 * A batch that forwards every box to the level's static batch (where it is drawn until the placement
 * moves) and records it with its instance ref (to hide it there and rebuild it on its own later).
 */
export class RecordingBatch extends BoxBatch {
  readonly parts: BoxPart[] = [];
  readonly refs: InstanceRef[] = [];

  constructor(readonly target: BoxBatch) {
    super();
  }

  override add(mat: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, owner?: string): InstanceRef {
    const ref = this.target.add(mat, x, y, z, sx, sy, sz, ry, owner);
    this.record({ mat, tiled: false, x, y, z, sx, sy, sz, ry, owner }, ref);
    return ref;
  }

  override addTiled(mat: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, owner?: string): InstanceRef {
    const ref = this.target.addTiled(mat, x, y, z, sx, sy, sz, ry, owner);
    this.record({ mat, tiled: true, x, y, z, sx, sy, sz, ry, owner }, ref);
    return ref;
  }

  private record(part: BoxPart, ref: InstanceRef): void {
    this.parts.push(part);
    this.refs.push(ref);
    this.count++;
  }
}

/** Merge recorded boxes into atlas meshes in `parent` (they carry the placement as `userData.owner`). */
export function buildMergedParts(parts: readonly BoxPart[], parent: Object3D, mats: MaterialLibrary, shadows: boolean): Mesh[] {
  if (!parts.length) return [];
  const tmp = new Group();
  for (const p of parts) {
    const m = new Mesh(UNIT_BOX, p.tiled ? mats.tiled(p.mat) : mats.get(p.mat));
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = p.ry;
    m.scale.set(p.sx, p.sy, p.sz);
    m.castShadow = shadows && mats.castShadow(p.mat);
    tmp.add(m);
  }
  const owner = parts.find((p) => p.owner)?.owner;
  mergeGroup(tmp, new Set(), mats, { castShadow: shadows && parts.some((p) => mats.castShadow(p.mat)) });
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

/**
 * Start building a portable placement: its (still empty) group goes into the level's group, what builders
 * emit next goes to the static batch through a `RecordingBatch`, and direct meshes (live screens, signs)
 * into the group; `finish()` restores the context and registers the record in `ctx.portables`.
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
  const prevRoot = ctx.root, prevBatch = ctx.batch;
  const batch = new RecordingBatch(prevBatch);
  const record: PortableRecord = { id: p.id, group, inner, origin: { x: p.x, y, z: p.z, rot: p.rot, level }, x: p.x, z: p.z, level, hidden: false, meshes: [], promoted: false, batch: prevBatch, refs: batch.refs, parts: batch.parts };
  ctx.root = inner;
  ctx.batch = batch;
  return {
    record,
    finish() {
      ctx.root = prevRoot;
      ctx.batch = prevBatch;
      // screens, spinning parts… added to `inner` while the parts were emitted are aimable (and hidden with it)
      for (const o of inner.children) if (o.userData.owner) record.meshes.push(o);
      ctx.portables.set(p.id, record);
      return [];
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
  /** Take the placement's LEDs and static screens out of the shared level meshes into `parent` (equipment.ts). */
  detachShared(id: string, parent: Object3D): Object3D[];
}

/**
 * Give a portable placement its own drawing the first time the world moves it: its static instances are
 * hidden, its boxes merged into its group, its LEDs and static screens moved there too. Once.
 */
export function promotePortable(host: PortableHost, rec: PortableRecord): void {
  if (rec.promoted) return;
  rec.promoted = true;
  const { ctx } = host;
  rec.batch.hide(rec.refs);
  const meshes: Object3D[] = [...buildMergedParts(rec.parts, rec.inner, ctx.lib, ctx.shadows), ...host.detachShared(rec.id, rec.inner)];
  for (const m of meshes) {
    rec.meshes.push(m);
    if (!rec.hidden) ctx.pickables.push(m);
  }
  host.markShadows();
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
  // never moved: it is drawn at home in the static batches already
  if (!rec.promoted && at === "home") return;
  promotePortable(host, rec);
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
    promotePortable(host, rec);
    rec.pushedBy = by;
    dropCollider(host, rec);
    return;
  }
  rec.pushedBy = null;
}

/** How far in front of the walker (m) a pushed trolley's centre is drawn: half its length beyond the walker's hands. */
export function trolleyAhead(rec: Pick<PortableRecord, "trolley">): number {
  return rec.trolley ? 0.35 + rec.trolley.length / 2 : PUSH_AHEAD;
}

/**
 * Draw a pushed cart in front of its walker (each frame): (x, z) feet, `yaw`
 * the walker's facing (world convention: 0 looks −Z), on `level`. A trolley
 * (a bed) is turned to lie along the walking direction.
 */
export function dragPortable(host: PortableHost, rec: PortableRecord, x: number, z: number, yaw: number, level: string): void {
  const ahead = trolleyAhead(rec);
  const ax = x - Math.sin(yaw) * ahead, az = z - Math.cos(yaw) * ahead;
  const lift = rec.origin.y - host.elevation(rec.origin.level);
  if (level !== rec.level) {
    host.levelRoot(level).add(rec.group);
    rec.level = level;
  }
  rec.group.position.set(ax, host.elevation(level) + lift, az);
  if (rec.trolley) rec.group.rotation.y = yaw - rec.origin.rot * DEG;
  rec.x = ax;
  rec.z = az;
}

