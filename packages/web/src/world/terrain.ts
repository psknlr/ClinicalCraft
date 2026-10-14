/**
 * Terrain (V4 ground grid, paths, sand checker, pond, trees, flowers,
 * horizon ring and drifting clouds), generalised to facility data.
 */
import { Group, Mesh } from "three";
import type { BuildContext } from "./context.js";
import { checkerMaterial, zoneCells } from "./buildzone.js";
import { rectContains, type Rect } from "./geometry.js";
import { boxCollider } from "./physics.js";
import { createLcg } from "./textures.js";
import { UNIT_BOX } from "./voxels.js";

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
  for (let cx = r.x0; cx <= r.x1; cx++)
    for (let cz = r.z0; cz <= r.z1; cz++) {
      const m = groundMaterial(cx, cz, ground, paths, zone);
      ctx.batch.add(m, cx + 0.5, -0.5, cz + 0.5);
      if (cx === r.x0 || cx === r.x1 || cz === r.z0 || cz === r.z1) ctx.batch.add(ctx.lib.has("dirt") ? "dirt" : ground, cx + 0.5, -1.5, cz + 0.5);
    }

  // horizon ring (V4: 50 boulders, r 43 + rnd·9, h 3 + ⌊rnd·7⌋, 7×7)
  const cxw = (f.bounds.minX + f.bounds.maxX) / 2;
  const czw = (f.bounds.minZ + f.bounds.maxZ) / 2;
  if (terrain.horizon && terrain.horizon.count > 0) {
    const rnd = createLcg(7103 ^ 0x5bd1e995);
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
    const rnd = createLcg(fl.seed ?? 7103);
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
  const span = Math.max(f.bounds.maxX - f.bounds.minX, f.bounds.maxZ - f.bounds.minZ) * 0.85 + 30;
  const rnd = createLcg(7103 ^ 0x27d4eb2d);
  const cloudMat = ctx.lib.get("white");
  for (let i = 0; i < (terrain.clouds ?? 14); i++) {
    const x = cxw - span + rnd() * span * 2;
    const z = czw - span + rnd() * span * 2;
    const m = new Mesh(UNIT_BOX, cloudMat);
    m.position.set(x, 20 + rnd() * 6, z);
    m.scale.set(5 + rnd() * 8, 1.4, 3 + rnd() * 5);
    clouds.add(m);
  }
  ctx.root.add(clouds);
  return { clouds };
}
