/**
 * Build-zone rules (V4 `Ll()` generalised to a facility `buildZone`).
 *
 * V4: sand checker over cells x 16…30, z −6…8 (rect x∈[16,31], z∈[−6,9]);
 * buildable cells keep a one-cell border: x 17…29, z −5…7, y 0…6
 * (maxHeight 7), ≤ 600 blocks, never inside the player.
 */
import { PHYSICS, overlapsXZ } from "./physics.js";

export type Cell = [number, number, number];

export interface BuildZoneLike {
  rect: { x: number; z: number; w: number; d: number };
  maxHeight?: number;
  maxBlocks?: number;
  materials?: string[];
  seedBlocks?: { cell: Cell; type: string }[];
}

export interface BuildRules {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
  maxBlocks: number;
  materials: string[];
}

export const DEFAULT_BUILD_MATERIALS = ["wood", "stone", "glass", "lamp"];

export function cellKey(c: readonly number[]): string {
  return `${c[0]},${c[1]},${c[2]}`;
}

/** Integer cells whose centre lies inside the rect (sand checker extent). */
export function zoneCells(rect: BuildZoneLike["rect"]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return {
    minX: Math.ceil(rect.x - rect.w / 2 - 0.5),
    maxX: Math.floor(rect.x + rect.w / 2 - 0.5),
    minZ: Math.ceil(rect.z - rect.d / 2 - 0.5),
    maxZ: Math.floor(rect.z + rect.d / 2 - 0.5),
  };
}

export function buildRules(bz: BuildZoneLike): BuildRules {
  const z = zoneCells(bz.rect);
  return {
    minX: z.minX + 1,
    maxX: z.maxX - 1,
    minZ: z.minZ + 1,
    maxZ: z.maxZ - 1,
    maxY: (bz.maxHeight ?? 7) - 1,
    maxBlocks: bz.maxBlocks ?? 600,
    materials: bz.materials?.length ? bz.materials : DEFAULT_BUILD_MATERIALS,
  };
}

/** V4 `Ll(cell, player, occupied)`. */
export function canPlace(rules: BuildRules, cell: readonly number[], player: { x: number; y: number; z: number }, occupied: boolean): boolean {
  const [x, y, z] = cell;
  if (!(x >= rules.minX && x <= rules.maxX && z >= rules.minZ && z <= rules.maxZ && y >= 0 && y <= rules.maxY)) return false;
  if (occupied) return false;
  const insidePlayer = overlapsXZ(player, { minX: x, maxX: x + 1, minZ: z, maxZ: z + 1 }) && player.y + PHYSICS.height > y && player.y < y + 1;
  return !insidePlayer;
}

/** Sand/path checker material for a ground cell inside the zone (V4: odd parity → sand). */
export function checkerMaterial(cx: number, cz: number): "sand" | "path" {
  return (cx + cz) & 1 ? "sand" : "path";
}

/** Validate saved blocks (V4 restore rules): known type, integer cell, inside rules, ≤ maxBlocks, no duplicates. */
export function validBlocks(rules: BuildRules, blocks: { cell: unknown; type: unknown }[]): { cell: Cell; type: string }[] {
  const out: { cell: Cell; type: string }[] = [];
  const seen = new Set<string>();
  const far = { x: -1e6, y: 0, z: -1e6 };
  for (const b of blocks.slice(0, rules.maxBlocks)) {
    if (typeof b.type !== "string" || !rules.materials.includes(b.type)) continue;
    if (!Array.isArray(b.cell) || b.cell.length !== 3 || !b.cell.every(Number.isInteger)) continue;
    const cell = b.cell as Cell;
    const k = cellKey(cell);
    if (seen.has(k) || !canPlace(rules, cell, far, false)) continue;
    seen.add(k);
    out.push({ cell: [cell[0], cell[1], cell[2]], type: b.type });
  }
  return out;
}
