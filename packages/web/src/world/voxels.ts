/**
 * Static voxel batching (V4 `P()`): every static box is collected per
 * material and emitted as one InstancedMesh per material. Each instance can
 * carry an owner id (placement id) so ray hits resolve to interaction
 * targets without per-object meshes.
 */
import { BoxGeometry, InstancedMesh, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import type { MaterialLibrary } from "./materials.js";

export const UNIT_BOX = new BoxGeometry(1, 1, 1);
const TILED = "#tiled";

interface Inst {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  owner: string | undefined;
}

export class BoxBatch {
  private readonly byMat = new Map<string, Inst[]>();
  count = 0;

  add(mat: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, owner?: string): void {
    this.push(mat, { x, y, z, sx, sy, sz, ry, owner });
  }

  /** A merged box whose texture repeats per world unit (see MaterialLibrary.tiled). */
  addTiled(mat: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, owner?: string): void {
    this.push(`${mat}${TILED}`, { x, y, z, sx, sy, sz, ry, owner });
  }

  private push(key: string, inst: Inst): void {
    let list = this.byMat.get(key);
    if (!list) this.byMat.set(key, (list = []));
    list.push(inst);
    this.count++;
  }

  /** Emit InstancedMeshes (one per material) into `parent`; returns them. */
  build(parent: Object3D, mats: MaterialLibrary, shadows: boolean): InstancedMesh[] {
    const out: InstancedMesh[] = [];
    const m = new Matrix4();
    const q = new Quaternion();
    const pos = new Vector3();
    const scl = new Vector3();
    const up = new Vector3(0, 1, 0);
    for (const [key, list] of this.byMat) {
      if (!list.length) continue;
      const tiled = key.endsWith(TILED);
      const id = tiled ? key.slice(0, -TILED.length) : key;
      const mesh = new InstancedMesh(UNIT_BOX, tiled ? mats.tiled(id) : mats.get(id), list.length);
      const owners: (string | undefined)[] = new Array(list.length);
      let anyOwner = false;
      list.forEach((b, i) => {
        pos.set(b.x, b.y, b.z);
        scl.set(b.sx, b.sy, b.sz);
        q.setFromAxisAngle(up, b.ry);
        m.compose(pos, q, scl);
        mesh.setMatrixAt(i, m);
        owners[i] = b.owner;
        if (b.owner) anyOwner = true;
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
      mesh.castShadow = shadows && mats.castShadow(id);
      mesh.receiveShadow = true;
      mesh.name = `voxels:${key}`;
      mesh.userData.material = id;
      if (anyOwner) mesh.userData.owners = owners;
      parent.add(mesh);
      out.push(mesh);
    }
    return out;
  }

  clear(): void {
    this.byMat.clear();
    this.count = 0;
  }
}
