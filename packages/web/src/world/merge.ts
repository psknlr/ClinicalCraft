/**
 * Draw-call reduction for movable voxel groups (people, door leaves): the
 * unit boxes directly under a group are merged into
 *   – ONE mesh for every atlas-able library material (texels sampled from the
 *     library's texture atlas, vertex colours = 1 so they can tint later), and
 *   – one mesh per remaining material (glass, metal, transparent masks…).
 * Meshes listed in `keep` (animated parts) are left alone.
 */
import { BufferAttribute, Mesh, type BufferGeometry, type Material, type Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MaterialLibrary } from "./materials.js";
import { UNIT_BOX } from "./voxels.js";

export interface MergeResult {
  /** The atlas mesh (null when no atlas-able parts). */
  atlas: Mesh | null;
  /** Vertex ranges [start, count] in the atlas mesh, by library material id. */
  ranges: Map<string, [number, number][]>;
  /** Per-material merged meshes for the non-atlas parts. */
  others: Mesh[];
}

/** Remap a box geometry's UVs into an atlas rectangle. */
function remapUv(g: BufferGeometry, [u0, v0, u1, v1]: [number, number, number, number]): void {
  const uv = g.getAttribute("uv") as BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
}

/** Merge the static unit boxes directly under `group` (see module doc). */
export function mergeGroup(group: Object3D, keep: Set<Object3D>, lib: MaterialLibrary, opts: { castShadow?: boolean } = {}): MergeResult {
  const cast = opts.castShadow ?? true;
  const atlasParts: Mesh[] = [];
  const buckets = new Map<Material, Mesh[]>();
  for (const child of [...group.children]) {
    const m = child as Mesh;
    if (!m.isMesh || keep.has(m) || Array.isArray(m.material) || m.geometry !== UNIT_BOX) continue;
    const mat = m.material as Material;
    if (lib.canAtlas(mat)) atlasParts.push(m);
    else {
      let list = buckets.get(mat);
      if (!list) buckets.set(mat, (list = []));
      list.push(m);
    }
  }
  const result: MergeResult = { atlas: null, ranges: new Map(), others: [] };
  if (atlasParts.length) {
    const geoms: BufferGeometry[] = [];
    let offset = 0;
    for (const m of atlasParts) {
      m.updateMatrix();
      const g = UNIT_BOX.clone().applyMatrix4(m.matrix);
      remapUv(g, lib.atlasUv((m.material as Material).name));
      const count = g.getAttribute("position").count;
      const id = (m.material as Material).name;
      const list = result.ranges.get(id) ?? [];
      list.push([offset, count]);
      result.ranges.set(id, list);
      offset += count;
      geoms.push(g);
    }
    const merged = mergeGeometries(geoms, false);
    for (const g of geoms) g.dispose();
    if (merged) {
      merged.setAttribute("color", new BufferAttribute(new Float32Array(merged.getAttribute("position").count * 3).fill(1), 3));
      for (const m of atlasParts) group.remove(m);
      const mesh = new Mesh(merged, lib.atlasMaterial());
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      mesh.userData.merged = true;
      group.add(mesh);
      result.atlas = mesh;
    }
  }
  for (const [mat, list] of buckets) {
    if (list.length < 2) {
      result.others.push(list[0]);
      continue;
    }
    const geoms = list.map((m) => {
      m.updateMatrix();
      return UNIT_BOX.clone().applyMatrix4(m.matrix);
    });
    const merged = mergeGeometries(geoms, false);
    for (const g of geoms) g.dispose();
    if (!merged) continue;
    for (const m of list) group.remove(m);
    const mesh = new Mesh(merged, mat);
    mesh.castShadow = cast && list.some((m) => m.castShadow);
    mesh.receiveShadow = true;
    mesh.userData.merged = true;
    group.add(mesh);
    result.others.push(mesh);
  }
  return result;
}

/** Multiply the vertex colour of the given ranges of an atlas mesh (1,1,1 = untinted). */
export function tintRanges(mesh: Mesh, ranges: [number, number][] | undefined, rgb: [number, number, number]): void {
  if (!ranges?.length) return;
  const col = mesh.geometry.getAttribute("color") as BufferAttribute | undefined;
  if (!col) return;
  for (const [start, count] of ranges) for (let i = start; i < start + count; i++) col.setXYZ(i, rgb[0], rgb[1], rgb[2]);
  col.needsUpdate = true;
}
