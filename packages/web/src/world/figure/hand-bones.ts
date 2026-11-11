/**
 * The bones of a hand, and how it is held. The frame is a left hand's: the wrist joint at the origin, the fingers
 * along +Y, the palm facing −Z, the thumb on +X (metres; a right hand is its mirror).
 *
 * Proportions are an adult's, on the slender side: some 18 cm from the wrist to the tip of the middle finger and
 * 8 cm across the knuckles. The knuckles — where the fingers really hinge — lie half-way along the hand: seen from
 * the back a finger is as long as the back of the hand, seen from the palm a third of it is hidden in the palm,
 * whose skin runs on to the webs. The knuckles stand on an arc (the middle one furthest out), the fingers end on
 * another (index and ring level with the middle finger's nail, the little finger at the ring's last joint).
 */
import { Vector3 } from "three";

/** How a hand is held. */
export interface HandPose {
  /** Each finger, index to little: degrees bent at the knuckle, the middle joint and the end joint. */
  fingers: readonly (readonly [number, number, number])[];
  /** Degrees between neighbouring fingers at the knuckles. */
  spread: number;
  /** The thumb: degrees out from the index in the palm's plane, degrees forward of the palm, degrees bent at its two joints. */
  thumb: { out: number; forward: number; bend: readonly [number, number] };
}

/** At rest: every finger a little bent, more towards the little finger; the thumb lying beside the index. */
export const HAND_RELAXED: HandPose = { fingers: [[13, 30, 11], [17, 36, 13], [21, 42, 15], [25, 48, 18]], spread: 2, thumb: { out: 15, forward: 17, bend: [10, 14] } };
/** Laid flat on something. */
export const HAND_FLAT: HandPose = { fingers: [[5, 8, 4], [6, 10, 5], [8, 12, 6], [10, 15, 7]], spread: 4, thumb: { out: 36, forward: 10, bend: [6, 8] } };
/** Closed over the other hand. */
export const HAND_CLASPED: HandPose = { fingers: [[38, 48, 20], [40, 52, 22], [42, 54, 24], [44, 56, 26]], spread: 1, thumb: { out: 22, forward: 32, bend: [20, 22] } };
/** A pinch: the pads of the index and the middle finger meet the thumb's, a centimetre apart, over something small; the other two fingers are tucked. */
export const HAND_HOLD: HandPose = { fingers: [[60, 45, 8], [63, 49, 10], [72, 64, 24], [76, 68, 26]], spread: 2, thumb: { out: 15, forward: 40, bend: [6, 10] } };

/** One bone of a digit: where it starts, the way it runs, the way its back (the nail's side) faces, its length. */
export interface Bone {
  a: Vector3;
  d: Vector3;
  up: Vector3;
  len: number;
}

/** A digit: its bones from the knuckle out, the axis its joints turn about, and its tip. */
export interface Digit {
  bones: Bone[];
  side: Vector3;
  tip: Vector3;
}

/** A finger: its knuckle (x across, y from the wrist, z towards the back of the hand), its three bones, its half-breadth at the middle joint. */
export interface FingerSpec {
  x: number;
  y: number;
  z: number;
  bones: readonly [number, number, number];
  w: number;
}

/** The four fingers, index to little. */
export const FINGERS: readonly FingerSpec[] = [
  { x: 0.0262, y: 0.0845, z: 0.0022, bones: [0.0405, 0.024, 0.0225], w: 0.0084 },
  { x: 0.0068, y: 0.0872, z: 0.0037, bones: [0.045, 0.0285, 0.023], w: 0.0086 },
  { x: -0.0118, y: 0.0812, z: 0.0027, bones: [0.042, 0.0262, 0.0225], w: 0.008 },
  { x: -0.0286, y: 0.0718, z: 0.0007, bones: [0.033, 0.0185, 0.02], w: 0.0071 },
];

/** The thumb: the joint at its root (deep in the heel of the hand), its bone in the palm's mound and the two of the thumb itself. */
export const THUMB = { root: [0.0215, 0.01, -0.0085] as const, bones: [0.044, 0.031, 0.027] as const };

const RAD = Math.PI / 180;

/** Bones end to end from `origin`: bone k is bent `bends[k]` degrees further towards the front (−up) than the one before. */
function chain(origin: Vector3, d0: Vector3, up0: Vector3, lens: readonly number[], bends: readonly number[]): Digit {
  const bones: Bone[] = [];
  let a = origin.clone(), bent = 0;
  lens.forEach((len, k) => {
    bent += (bends[k] ?? 0) * RAD;
    const d = d0.clone().multiplyScalar(Math.cos(bent)).addScaledVector(up0, -Math.sin(bent));
    const up = up0.clone().multiplyScalar(Math.cos(bent)).addScaledVector(d0, Math.sin(bent));
    bones.push({ a, d, up, len });
    a = a.clone().addScaledVector(d, len);
  });
  return { bones, side: new Vector3().crossVectors(d0, up0).normalize(), tip: a };
}

/** Finger `i` (0 the index … 3 the little finger) of a hand of girth `g`, held as `pose` says. */
export function fingerBones(i: number, pose: HandPose, g = 1): Digit {
  const f = FINGERS[i]!;
  const fan = (1.5 - i) * pose.spread * RAD;
  return chain(new Vector3(f.x * g, f.y, f.z), new Vector3(Math.sin(fan), Math.cos(fan), 0), new Vector3(0, 0, 1), f.bones, pose.fingers[i]!);
}

/** The thumb: its first bone lies in the mound at the palm's edge, its nail turned to the side; its two joints bend it across towards the fingers. */
export function thumbBones(pose: HandPose, g = 1): Digit {
  const th = pose.thumb;
  const out = th.out * RAD, fwd = th.forward * RAD;
  const d0 = new Vector3(Math.sin(out) * Math.cos(fwd), Math.cos(out) * Math.cos(fwd), -Math.sin(fwd)).normalize();
  // as the thumb comes forward of the palm it turns to face the fingers (opposition): at rest its nail looks out
  // to the side and a little back, well forward its pad looks back at the pads of the fingers
  const turn = (26 - th.forward) * RAD;
  const up0 = new Vector3(Math.cos(turn), 0, Math.sin(turn));
  up0.addScaledVector(d0, -up0.dot(d0)).normalize();
  return chain(new Vector3(THUMB.root[0] * g, THUMB.root[1], THUMB.root[2]), d0, up0, THUMB.bones, [0, th.bend[0], th.bend[1]]);
}
