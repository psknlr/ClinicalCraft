/** A standing person's two legs share one mesh. Four GPU morph poses carry them from heel contact to
 * passing and back again with the other foot leading. The stance foot travels backwards by the distance
 * the body travels forwards, and the swing foot clears the floor. All lengths below are figure-local. */
import { BufferAttribute, BufferGeometry, type Group, type Mesh } from "three";
import { SHIN, THIGH, type Limb } from "./anatomy.js";
import type { Figure } from "./figure.js";

const CONTACT = 0.29; // ankle ahead of / behind the pelvis at contact, scaled by leg length
const CLEARANCE = 0.085;
const CONTACT_DROP = 0.065; // the pelvis lowers as the stride opens
const PASSING_DROP = 0.01;

type Joint = { y: number; z: number };

function offsetAt(y: number, start: Joint, end: Joint, startY: number, endY: number): Joint {
  const u = Math.max(0, Math.min(1, (startY - y) / (startY - endY)));
  return { y: start.y + (end.y - start.y) * u, z: start.z + (end.z - start.z) * u };
}

const HIP = { y: 0, z: 0 };

/** Solve a sagittal hip/knee chain for the ankle's target. Shoes translate as one piece. */
function legOffsets(leg: Limb, forward: number, clearance: number, drop: number) {
  const [, hy, hz] = leg.root, [, ky, kz] = leg.mid, [, ay, az] = leg.end;
  const thigh = Math.hypot(ky - hy, kz - hz), shin = Math.hypot(ay - ky, az - kz);
  const fy = ay + clearance + drop - hy, fz = az + forward - hz;
  const reach = Math.hypot(fy, fz);
  const along = (thigh * thigh - shin * shin + reach * reach) / (2 * reach);
  const bend = Math.sqrt(Math.max(0, thigh * thigh - along * along));
  const knee = { y: hy + (along * fy + bend * fz) / reach - ky, z: hz + (along * fz - bend * fy) / reach - kz };
  const foot = { y: clearance + drop, z: forward };
  return (y: number): Joint => y >= ky ? offsetAt(y, HIP, knee, hy, ky) : offsetAt(y, knee, foot, ky, ay);
}

type Pose = { first: number; end?: number; offset: (y: number, x: number, vertex: number, z: number) => Joint };

/** Construct relative position and normal targets, retaining the sculpted normals on unaffected vertices. */
function prepare(mesh: Mesh, poses: Pose[]): void {
  const g = mesh.geometry, rest = g.getAttribute("position"), normals = g.getAttribute("normal");
  const targets: BufferAttribute[] = [], normalTargets: BufferAttribute[] = [];
  const sample = new BufferGeometry();
  sample.setIndex(g.index);
  for (const { first, end = rest.count, offset } of poses) {
    const xyz = new BufferAttribute(new Float32Array(rest.array), 3);
    const delta = new BufferAttribute(new Float32Array(rest.count * 3), 3);
    for (let i = first; i < end; i++) {
      const d = offset(rest.getY(i), rest.getX(i), i, rest.getZ(i));
      xyz.setXYZ(i, xyz.getX(i), xyz.getY(i) + d.y, xyz.getZ(i) + d.z);
      delta.setXYZ(i, 0, d.y, d.z);
    }
    sample.setAttribute("position", xyz);
    sample.computeVertexNormals();
    const poseNormals = sample.getAttribute("normal");
    const diff = new BufferAttribute(new Float32Array(rest.count * 3), 3);
    for (let i = first; i < end; i++) {
      diff.setXYZ(i, poseNormals.getX(i) - normals.getX(i), poseNormals.getY(i) - normals.getY(i), poseNormals.getZ(i) - normals.getZ(i));
    }
    targets.push(delta);
    normalTargets.push(diff);
  }
  g.morphTargetsRelative = true;
  g.morphAttributes.position = targets;
  g.morphAttributes.normal = normalTargets;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  mesh.updateMorphTargets();
}

/** Distance-driven walking for staff and followers. A non-standing rig never constructs one. */
export class WalkingGait {
  private phase = 0;
  private weight = 0;
  private readonly strideScale: number;
  private readonly leg: Limb;

  constructor(
    private readonly limbs: Mesh,
    private readonly clothes: Mesh,
    private readonly body: Group,
    private readonly shape: Pick<Figure, "skeleton" | "legsStart" | "armsStart" | "armsFree">,
    private readonly scale: number,
  ) {
    this.leg = shape.skeleton.legs[0];
    this.strideScale = (this.leg.root[1] - this.leg.end[1]) / (SHIN + THIGH);
  }

  private prepare(): void {
    const legScale = this.strideScale;
    const offsets = [0, 1, 2, 3].map((pose) => {
      const passing = pose % 2 === 1;
      const drop = (passing ? PASSING_DROP : CONTACT_DROP) * legScale;
      const reach = passing ? 0 : (pose === 0 ? CONTACT : -CONTACT) * legScale;
      const left = legOffsets(this.leg, reach, pose === 3 ? CLEARANCE * legScale : 0, drop);
      const right = legOffsets(this.leg, -reach, pose === 1 ? CLEARANCE * legScale : 0, drop);
      return { left, right };
    });
    const { legsStart, armsStart, armsFree, skeleton } = this.shape;
    const limbs: Pose[] = offsets.map(({ left, right }) => ({
      first: legsStart[0], offset: (y, _x, i) => (i < legsStart[1] ? left : right)(y),
    }));
    if (armsFree.some(Boolean)) {
      // Separate arm weights allow a porter to push a trolley and to swing their arms on the return walk.
      const angle = 0.23, cosDelta = Math.cos(angle) - 1, sin = Math.sin(angle);
      const shoulder = skeleton.arms[0].root[1];
      for (const direction of [1, -1]) limbs.push({
        first: armsStart[0], end: legsStart[0],
        offset: (y, _x, i, z) => {
          const side = i < armsStart[1] ? 0 : 1;
          if (!armsFree[side]) return HIP;
          const turn = (side === 0 ? 1 : -1) * direction * sin;
          return { y: (y - shoulder) * cosDelta - z * turn, z: (y - shoulder) * turn + z * cosDelta };
        },
      });
    }
    prepare(this.limbs, limbs);
    // Coat and gown hems move with the knees under them. Across the middle the cloth spans both legs.
    const hems: Pose[] = offsets.map(({ left, right }) => ({
      first: 0,
      offset: (y, x, _i, z) => {
        if (y >= this.leg.root[1]) return HIP;
        const l = left(y), r = right(y);
        const w = Math.max(0, Math.min(1, 0.5 + x / (2 * this.leg.root[0])));
        // Over the gap, the front panel rests against the forward knee and the back against the trailing one.
        const depth = Math.max(-1, Math.min(1, z / 0.1));
        const front = Math.max(0, Math.min(1, w + 2 * w * (1 - w) * depth * Math.sign(l.z - r.z)));
        return { y: r.y + (l.y - r.y) * w, z: r.z + (l.z - r.z) * front };
      },
    }));
    prepare(this.clothes, hems);
  }

  /** Metres actually walked in this update. A stationary follower settles within a fraction of a second. */
  advance(distance: number, dt: number, remaining = Infinity, swingArms = true): void {
    if (distance === 0 && this.weight === 0) return;
    if (!this.limbs.morphTargetInfluences) this.prepare();
    const length = this.strideScale * this.scale;
    this.phase = (this.phase + distance / (CONTACT * length)) % 4;
    const blendDistance = 0.22 * length;
    this.weight = distance > 0
      ? Math.min(1, this.weight + distance / blendDistance, remaining / blendDistance)
      : Math.max(0, this.weight - dt * 7);
    const i = Math.floor(this.phase), t = this.phase - i;
    const limbs = this.limbs.morphTargetInfluences!;
    limbs.fill(0);
    limbs[i] = (1 - t) * this.weight;
    limbs[(i + 1) % 4] = t * this.weight;
    const clothes = this.clothes.morphTargetInfluences!;
    for (let j = 0; j < 4; j++) clothes[j] = limbs[j]!;
    if (swingArms && limbs.length > 4) {
      limbs[4] = limbs[0]!;
      limbs[5] = limbs[2]!;
    }
    const passing = i % 2 === 0 ? t : 1 - t;
    this.body.position.y = -(CONTACT_DROP + passing * (PASSING_DROP - CONTACT_DROP)) * length * this.weight;
  }

  /** Clear the stride immediately when placed, interrupted or hidden in a lift. */
  rest(): void {
    this.phase = 0;
    this.weight = 0;
    this.body.position.y = 0;
    this.limbs.morphTargetInfluences?.fill(0);
    this.clothes.morphTargetInfluences?.fill(0);
  }
}
