/**
 * Terrain (V4 ground grid, paths, sand checker, pond, trees, flowers,
 * horizon ring and drifting clouds), generalised to facility data.
 */
import { Group, InstancedMesh, Matrix4 } from "three";
import type { BuildContext } from "./context.js";
import { checkerMaterial, zoneCells } from "./buildzone.js";
import { greedyRects, rectContains, type Rect } from "./geometry.js";
import { boxCollider } from "./physics.js";
import { createLcg } from "./textures.js";
import { UNIT_BOX } from "./voxels.js";

/**
 * V4 drew horizon, flowers and clouds from the same LCG stream as its 24
 * textures (24 × 256 draws), the horizon (100) and three workstation screens
 * (12). Starting from those stream offsets reproduces V4's exact layout when
 * the facility uses the default seed 7103.
 */
export const V4_STREAM_OFFSETS = { horizon: 6144, flowers: 6256, clouds: 6426 } as const;

export function v4Stream(seed: number, skip: number): () => number {
  const rnd = createLcg(seed);
  if (seed === 7103) for (let i = 0; i < skip; i++) rnd();
  return rnd;
}

/** Ground grid cell range: bounds + 3.5 (V4: bounds ±35.5 → cells −39…39). */
export function groundRange(b: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  return {
    x0: Math.floor(b.minX - 3.5),
    x1: Math.ceil(b.maxX + 3.5),
    z0: Math.floor(b.minZ - 3.5),
    z1: Math.ceil(b.maxZ + 3.5),
  };
}

/** Material of ground cell (cx, cz): build-zone checker > paths > ground. Pure. */
export function groundMaterial(
  cx: number,
  cz: number,
  ground: string,
  paths: (Rect & { material?: string })[],
  zone: Rect | null,
): string {
  const px = cx + 0.5, pz = cz + 0.5;
  if (zone) {
    const zc = zoneCells(zone);
    if (cx >= zc.minX && cx <= zc.maxX && cz >= zc.minZ && cz <= zc.maxZ) return checkerMaterial(cx, cz);
  }
  for (let i = paths.length - 1; i >= 0; i--) {
    const p = paths[i];
    if (rectContains(p, px, pz)) return p.material ?? "path";
  }
  return ground;
}

export function buildTerrain(ctx: BuildContext): { clouds: Group } {
  const f = ctx.facility;
  const terrain = f.terrain ?? ({} as BuildContext["facility"]["terrain"]);
  const ground = terrain.ground ?? "grass";
  const paths = terrain.paths ?? [];
  const zone = f.buildZone?.rect ?? null;
  const r = groundRange(f.bounds);
  // V4 placed one 1×1×1 block per ground cell; equal neighbouring cells are
  // merged into tiled boxes (pixel-identical, ~50× fewer instances).
  const cols = r.x1 - r.x0 + 1, rows = r.z1 - r.z0 + 1;
  const mats: string[] = new Array(cols * rows);
  for (let iz = 0; iz < rows; iz++)
    for (let ix = 0; ix < cols; ix++) mats[iz * cols + ix] = groundMaterial(r.x0 + ix, r.z0 + iz, ground, paths, zone);
  for (const g of greedyRects(cols, rows, (ix, iz) => mats[iz * cols + ix])) {
    const w = g.ix1 - g.ix0 + 1, d = g.iz1 - g.iz0 + 1;
    ctx.batch.addTiled(g.value, r.x0 + g.ix0 + w / 2, -0.5, r.z0 + g.iz0 + d / 2, w, 1, d);
  }
  // dirt skirt under the outermost ring (V4)
  const dirt = ctx.lib.has("dirt") ? "dirt" : ground;
  ctx.batch.addTiled(dirt, (r.x0 + r.x1 + 1) / 2, -1.5, r.z0 + 0.5, cols, 1, 1);
  ctx.batch.addTiled(dirt, (r.x0 + r.x1 + 1) / 2, -1.5, r.z1 + 0.5, cols, 1, 1);
  ctx.batch.addTiled(dirt, r.x0 + 0.5, -1.5, (r.z0 + r.z1 + 1) / 2, 1, 1, rows - 2 > 0 ? rows - 2 : 1);
  ctx.batch.addTiled(dirt, r.x1 + 0.5, -1.5, (r.z0 + r.z1 + 1) / 2, 1, 1, rows - 2 > 0 ? rows - 2 : 1);

  // horizon ring (V4: 50 boulders, r 43 + rnd·9, h 3 + ⌊rnd·7⌋, 7×7)
  const cxw = (f.bounds.minX + f.bounds.maxX) / 2;
  const czw = (f.bounds.minZ + f.bounds.maxZ) / 2;
  if (terrain.horizon && terrain.horizon.count > 0) {
    const rnd = v4Stream(7103, V4_STREAM_OFFSETS.horizon);
    const n = terrain.horizon.count;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rad = terrain.horizon.radius + rnd() * 9;
      const h = 3 + Math.floor(rnd() * 7);
      ctx.batch.add(i % 3 ? "leaflight" : "stone", cxw + Math.sin(a) * rad, h / 2 - 1, czw + Math.cos(a) * rad, 7, h, 7);
    }
  }

  // ponds (V4: water slab .1 thick at y .015, stone rims on the north/south edges)
  for (const p of terrain.ponds ?? []) {
    ctx.batch.add("water", p.x, 0.015, p.z, p.w, 0.1, p.d);
    const x0 = Math.round(p.x - p.w / 2 - 1), x1 = Math.round(p.x + p.w / 2 + 1);
    for (let x = x0; x <= x1; x++) {
      ctx.batch.add("stone", x, 0.12, p.z - p.d / 2 - 0.5, 0.85, 0.25, 0.8);
      ctx.batch.add("stone", x, 0.12, p.z + p.d / 2 + 0.5, 0.85, 0.25, 0.8);
    }
  }

  // trees (V4 tt(): trunk blocks + 3 leaf layers 5×5, 5×5, 3×3)
  for (const t of terrain.trees ?? []) {
    for (let y = 0; y < t.h; y++) ctx.batch.add("wood", t.x, y + 0.5, t.z);
    ctx.colliders.add(boxCollider(t.x, t.h / 2, t.z, 1, t.h, 1));
    for (let layer = 0; layer < 3; layer++) {
      const g = layer === 2 ? 1 : 2;
      for (let dx = -g; dx <= g; dx++)
        for (let dz = -g; dz <= g; dz++) {
          if (Math.abs(dx) + Math.abs(dz) >= g * 2 + 1) continue;
          ctx.batch.add((dx + dz + layer) % 3 ? "leaf" : "leaflight", t.x + dx, t.h + layer + 0.3, t.z + dz);
        }
    }
  }

  // flowers (V4: stem + head; lamp/pink heads; deterministic; exclusions)
  const fl = terrain.flowers;
  if (fl && fl.count > 0) {
    const rnd = v4Stream(fl.seed ?? 7103, V4_STREAM_OFFSETS.flowers);
    const ex: { r: Rect; m: number }[] = [
      ...(fl.exclude ?? []).map((r) => ({ r, m: 0 })),
      ...paths.map((r) => ({ r, m: 0.4 })),
      ...(terrain.ponds ?? []).map((r) => ({ r, m: 1.6 })),
      ...f.buildings.map((b) => ({ r: b.rect, m: 1.5 })),
      ...(zone ? [{ r: zone, m: 0.6 }] : []),
      ...(terrain.trees ?? []).map((t) => ({ r: { x: t.x, z: t.z, w: 1, d: 1 }, m: 0.6 })),
      ...f.placements.map((p) => ({ r: { x: p.x, z: p.z, w: 1, d: 1 }, m: 1 })),
    ];
    const spanX = f.bounds.maxX - f.bounds.minX - 9;
    const spanZ = f.bounds.maxZ - f.bounds.minZ - 11;
    for (let i = 0; i < fl.count; i++) {
      const x = f.bounds.minX + 4.5 + rnd() * spanX;
      const z = f.bounds.minZ + 7.5 + rnd() * spanZ;
      if (ex.some((e) => rectContains(e.r, x, z, e.m))) continue;
      ctx.batch.add("leaf", x, 0.18, z, 0.08, 0.36, 0.08);
      ctx.batch.add(i % 3 ? "lamp" : "pink", x, 0.4, z, 0.28, 0.18, 0.28);
    }
  }

  // clouds (V4: 14 slabs at y 20–26 over ±60, drifting)
  const clouds = new Group();
  clouds.name = "clouds";
  const span = Math.max(60, Math.max(f.bounds.maxX - f.bounds.minX, f.bounds.maxZ - f.bounds.minZ) * 0.845);
  const rnd = v4Stream(7103, V4_STREAM_OFFSETS.clouds);
  const n = terrain.clouds ?? 14;
  if (n > 0) {
    // one instanced draw call for all slabs (V4 drew one mesh each)
    const mesh = new InstancedMesh(UNIT_BOX, ctx.lib.get("white"), n);
    const m = new Matrix4();
    for (let i = 0; i < n; i++) {
      const x = cxw - span + rnd() * span * 2;
      const z = czw - span + rnd() * span * 2;
      const y = 20 + rnd() * 6;
      m.makeScale(5 + rnd() * 8, 1.4, 3 + rnd() * 5).setPosition(x, y, z);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.name = "clouds";
    clouds.add(mesh);
  }
  ctx.root.add(clouds);
  return { clouds };
}
