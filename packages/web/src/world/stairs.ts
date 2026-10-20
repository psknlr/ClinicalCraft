/**
 * Upper floors and flights (EMBODIED R10): the collision model's slabs drawn
 * as floors (the ceiling of the storey below), and every stairs / ramp
 * flight as voxel steps (a ramp as one sloped run of slices) with stepped
 * glass balustrades and a guard rail around its stairwell upstairs. Visual
 * only: the slabs, the walkable ramp surface and the balustrades collide as
 * the model's `slab`, `ramp` and `rail` colliders (registered by the world).
 */
import { BoxGeometry, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RAIL_HEIGHT, SLAB_THICKNESS, type Flight } from "@clinicalcraft/world";
import type { BuildContext } from "./context.js";

/** Height of one stair riser (m); ramps use thin slices of the same height. */
const RISER = 0.18;
const GLASS_T = 0.05;

/** Floors of the upper levels: one box per slab rect (top 1 cm above the level), in the batch of the storey below. */
export function buildSlabs(ctx: BuildContext): void {
  const f = ctx.facility;
  for (const c of ctx.collision.colliders) {
    if (c.kind !== "slab") continue;
    // `slab:<building>@<level>:<k>`
    const buildingId = c.id.slice("slab:".length, c.id.lastIndexOf("@"));
    const building = f.buildings.find((b) => b.id === buildingId);
    const below = ctx.levels.list.filter((l) => l.elevation < c.maxY - 1e-6).pop()?.id ?? ctx.level;
    ctx.onLevel(below);
    const top = c.maxY + 0.01;
    const bottom = top - (SLAB_THICKNESS + 0.01);
    ctx.batch.add(building?.floor ?? "floor", (c.minX + c.maxX) / 2, (top + bottom) / 2, (c.minZ + c.maxZ) / 2, c.maxX - c.minX, top - bottom, c.maxZ - c.minZ);
  }
  ctx.onLevel(ctx.level);
}

/** Point along a flight's axis (u) and across it (v) in world x/z. */
function at(fl: Flight, u: number, v: number): { x: number; z: number } {
  return fl.surface.axis === "z" ? { x: v, z: u } : { x: u, z: v };
}

/** Add a box spanning [u0, u1] along the flight, [v0, v1] across it and [y0, y1] up. */
function box(ctx: BuildContext, fl: Flight, mat: string, u0: number, u1: number, v0: number, v1: number, y0: number, y1: number): void {
  const c = at(fl, (u0 + u1) / 2, (v0 + v1) / 2);
  const along = Math.abs(u1 - u0), across = Math.abs(v1 - v0);
  const [sx, sz] = fl.surface.axis === "z" ? [across, along] : [along, across];
  ctx.batch.add(mat, c.x, (y0 + y1) / 2, c.z, sx, y1 - y0, sz);
}

/**
 * A flight: `n` slices (stairs: one per riser; the visible tread of slice
 * k runs from its leading edge to the next riser), stepped glass
 * balustrades with a handrail on both long sides, and upstairs a guard rail
 * along the stairwell and across its foot end.
 */
export function buildFlight(ctx: BuildContext, fl: Flight): void {
  const { from, to, y0, y1 } = fl.surface;
  const rise = y1 - y0;
  const run = Math.abs(to - from);
  const dir = Math.sign(to - from) || 1;
  const stairs = fl.kind === "stairs";
  const n = Math.max(1, Math.round(rise / RISER));
  const riser = rise / n;
  const tread = run / n;
  const across = fl.surface.axis === "z" ? (fl.area.minX + fl.area.maxX) / 2 : (fl.area.minZ + fl.area.maxZ) / 2;
  const half = fl.width / 2;
  const body = ctx.lib.has("stone") ? "stone" : "cream";
  const nosing = ctx.lib.has("teal") ? "teal" : body;
  const glass = ctx.lib.has("glass") ? "glass" : body;
  const metal = ctx.lib.has("chrome") ? "chrome" : "steel";
  // handrail height above the flight's surface at u (the rail follows the slope)
  const railAt = (u: number) => y0 + ((u - from) / (to - from || 1)) * rise + RAIL_HEIGHT - 0.04;
  // the flight belongs to its lower storey (seen from both: the lower one is never culled)
  ctx.onLevel(fl.foot.level);
  for (let k = 0; k < n; k++) {
    const uk = from + dir * k * tread;
    const ya = y0 + k * riser, yb = ya + riser;
    // slice k: from its leading edge to the head, one riser high — a solid stepped wedge without coplanar faces
    box(ctx, fl, stairs ? body : nosing, uk, to, across - half, across + half, ya, yb);
    if (stairs) box(ctx, fl, nosing, uk, uk + dir * Math.min(0.06, tread / 3), across - half, across + half, yb - 0.035, yb + 0.004);
    // balustrade: stepped glass panes under the sloped handrail on both long sides, a post every 4 treads
    for (const side of [-1, 1]) {
      const v = across + side * (half + GLASS_T / 2);
      box(ctx, fl, glass, uk, uk + dir * tread, v - GLASS_T / 2, v + GLASS_T / 2, yb, railAt(uk) - 0.05);
      if (k % 4 === 0) box(ctx, fl, metal, uk, uk + dir * 0.05, v - 0.03, v + 0.03, yb, railAt(uk));
    }
  }
  slopedRails(ctx, fl, across, half, metal, railAt);
  // upstairs: the guard rail along the stairwell's long sides and across its foot end
  ctx.onLevel(fl.head.level);
  for (const side of [-1, 1]) {
    const v = across + side * (half + GLASS_T / 2);
    box(ctx, fl, glass, from, to, v - GLASS_T / 2, v + GLASS_T / 2, y1 + 0.01, y1 + RAIL_HEIGHT - 0.1);
    box(ctx, fl, metal, from, to, v - 0.035, v + 0.035, y1 + RAIL_HEIGHT - 0.1, y1 + RAIL_HEIGHT - 0.03);
  }
  const end = from - dir * GLASS_T / 2;
  box(ctx, fl, glass, end - GLASS_T / 2, end + GLASS_T / 2, across - half - GLASS_T, across + half + GLASS_T, y1 + 0.01, y1 + RAIL_HEIGHT - 0.1);
  box(ctx, fl, metal, end - 0.035, end + 0.035, across - half - GLASS_T, across + half + GLASS_T, y1 + RAIL_HEIGHT - 0.1, y1 + RAIL_HEIGHT - 0.03);
  ctx.onLevel(ctx.level);
}

/** The two handrails of a flight: one sloped bar per side (one merged mesh; boxes in the batch only turn about Y). */
function slopedRails(ctx: BuildContext, fl: Flight, across: number, half: number, metal: string, railAt: (u: number) => number): void {
  const { from, to } = fl.surface;
  const geoms: BoxGeometry[] = [];
  for (const side of [-1, 1]) {
    const v = across + side * (half + GLASS_T / 2);
    const a = at(fl, from, v), b = at(fl, to, v);
    const p0 = new Vector3(a.x, railAt(from), a.z), p1 = new Vector3(b.x, railAt(to), b.z);
    const along = p1.clone().sub(p0);
    const g = new BoxGeometry(0.07, 0.07, along.length());
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), along.clone().normalize());
    g.applyMatrix4(new Matrix4().compose(p0.clone().add(p1).multiplyScalar(0.5), q, new Vector3(1, 1, 1)));
    geoms.push(g);
  }
  const merged = mergeGeometries(geoms, false);
  for (const g of geoms) g.dispose();
  if (!merged) return;
  const mesh = new Mesh(merged, ctx.lib.get(metal));
  mesh.name = `handrails:${fl.connectorId}:${fl.index}`;
  mesh.castShadow = ctx.shadows && ctx.lib.castShadow(metal);
  mesh.receiveShadow = true;
  ctx.root.add(mesh);
}

/** Slabs and every flight of the facility (multi-level facilities only; nothing for a single level). */
export function buildLevels(ctx: BuildContext): void {
  if (!ctx.levels.multi) return;
  buildSlabs(ctx);
  for (const fl of ctx.levels.flights) buildFlight(ctx, fl);
}
