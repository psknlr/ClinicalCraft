/**
 * The measurements of a figure and where its joints are in a posture. Lengths are metres of an adult of average
 * build standing 1.74 m (about 7½ heads); a figure's `body` group is scaled for stature. The frame is the
 * figure's own: feet at the origin, +Y up, +Z the way they face, +X their left. A woman's frame is narrower in
 * the shoulders and the waist, a little fuller in the hips, slimmer in the neck and the limbs; a man's the other
 * way (`frameOf`).
 *
 * Standing, the arms hang a little bent with the palms towards the thighs, or (hands `clasped`) are held
 * one hand over the other in front of the chest, as someone scrubbed keeps them. Sitting, the feet are planted when the seat is
 * low enough and hang when it is not, and the hands rest on the thighs. Lying, the figure is built upright and
 * laid down by its rig: legs straight, the arms a little away from the trunk.
 */
import { Vector3 } from "three";
import type { V3 } from "./sculpt.js";

export type Build = "slim" | "average" | "heavy";
export type Stature = "infant" | "child" | "teen" | "adult";
export type Posture = "standing" | "sitting" | "lying";

/** Height of the top of the head of a standing adult. */
export const HEIGHT = 1.74;
/** Joint heights of a standing adult. */
export const HIP = 0.905;
export const KNEE = 0.485;
export const ANKLE = 0.082;
export const SHOULDER = 1.386;
/** Where the neck leaves the trunk, and the joint the head turns and nods about. */
export const NECK = 1.462;
export const PIVOT = 1.565;
export const THIGH = HIP - KNEE;
export const SHIN = KNEE - ANKLE;
export const UPPER_ARM = 0.295;
export const FOREARM = 0.25;
/** Half the distance between the hip joints and between the shoulder joints. */
export const HIP_X = 0.084;
export const SHOULDER_X = 0.172;

/** How a build and a stature change the average adult. */
export interface Frame {
  /** Body scale of the stature (a figure's `body` group). */
  scale: number;
  /** Trunk and face width, trunk depth, extra depth of the abdomen (m), limb girth. */
  wide: number;
  deep: number;
  belly: number;
  limb: number;
  /** Head size against the scaled body (a child's head is large for the body). */
  head: number;
  /** 0 an adult's face … 1 an infant's (a large cranium, small features low on the face). */
  young: number;
  /** Leg length against the adult's (an infant's legs are short for the trunk). */
  legs: number;
  /**
   * A woman's or a man's frame against the average of the two (1): the width of the shoulders, of the waist and
   * of the hips, the girth of the neck — and the fullness of the chest (m).
   */
  shoulders: number;
  waist: number;
  hips: number;
  neck: number;
  bust: number;
}

/** Body scale by stature (the top of the head: adult 1.74 m, teen 1.57, child 1.25, infant 0.78). */
export const STATURE_SCALE: Record<Stature, number> = { adult: 1, teen: 0.9, child: 0.72, infant: 0.45 };

/** The frame of a build and a stature; `feminine`: 0 a man's … 1 a woman's (0.5 neither's in particular; a child's is neither's yet). */
export function frameOf(build: Build, stature: Stature, feminine = 0.5): Frame {
  const b = build === "slim" ? { wide: 0.93, deep: 0.9, belly: 0, limb: 0.9 } : build === "heavy" ? { wide: 1.13, deep: 1.2, belly: 0.045, limb: 1.16 } : { wide: 1, deep: 1, belly: 0, limb: 1 };
  const s = stature === "infant" ? { head: 1.5, young: 1, legs: 0.8, chub: 1.28 } : stature === "child" ? { head: 1.2, young: 0.6, legs: 0.95, chub: 1.05 } : stature === "teen" ? { head: 1.02, young: 0.22, legs: 1, chub: 0.96 } : { head: 0.965, young: 0, legs: 1, chub: 1 };
  // a woman's shoulders and waist are narrower, her hips a little fuller, her neck and limbs slimmer; a man's the other way
  const lean = (2 * feminine - 1) * Math.max(0, 1 - 2 * s.young);
  const woman = Math.max(0, lean), man = Math.max(0, -lean);
  return {
    scale: STATURE_SCALE[stature] ?? 1,
    wide: b.wide * (s.chub > 1 ? 1 + (s.chub - 1) * 0.6 : 1),
    deep: b.deep * (s.chub > 1 ? 1 + (s.chub - 1) * 0.8 : 1),
    belly: b.belly,
    limb: b.limb * s.chub * (1 - 0.06 * woman + 0.03 * man),
    head: s.head,
    young: s.young,
    legs: s.legs,
    shoulders: 1 - 0.07 * woman + 0.035 * man,
    waist: 1 - 0.075 * woman + 0.02 * man,
    hips: 1 + 0.03 * woman - 0.02 * man,
    neck: 1 - 0.08 * woman + 0.06 * man,
    bust: 0.013 * woman,
  };
}

/** One arm or leg: its three joints, and the frame of the hand or foot at its end. */
export interface Limb {
  root: V3;
  mid: V3;
  end: V3;
  /** Hand: the way the fingers point; foot: the way the toes point. */
  along: V3;
  /** Hand: the way the palm faces; foot: up out of the instep. */
  face: V3;
}

/** Where everything is, for one posture (left limbs: +X; the right side mirrors unless a pose says otherwise). */
export interface Skeleton {
  posture: Posture;
  /** Height of the hip joints (the trunk hangs from here: `lift` = this − HIP). */
  hip: number;
  lift: number;
  legs: [Limb, Limb];
  arms: [Limb, Limb];
}

const v = (x: number, y: number, z: number): V3 => [x, y, z];

/** The elbow or knee between `root` and `end` with bones `a` and `b`, bent towards `pole`. */
export function bend(root: V3, end: V3, a: number, b: number, pole: V3): V3 {
  const r = new Vector3(...root), e = new Vector3(...end);
  const dir = e.clone().sub(r);
  const d = Math.min(Math.max(dir.length(), 1e-4), a + b - 1e-4);
  dir.normalize();
  const along = (a * a - b * b + d * d) / (2 * d);
  const out = Math.sqrt(Math.max(0, a * a - along * along));
  const p = new Vector3(...pole);
  p.addScaledVector(dir, -p.dot(dir));
  if (p.lengthSq() < 1e-8) p.set(0, 0, 1).addScaledVector(dir, -dir.z);
  p.normalize();
  const m = r.addScaledVector(dir, along).addScaledVector(p, out);
  return [m.x, m.y, m.z];
}

/** How far the hand on top lies out from the one under it when two are held together: a hand's thickness. */
const CLASP_OVER = 0.03;

/** How the arms are held. */
export type ArmPose = "relaxed" | "clasped" | "lap" | "rest" | "sling";

/**
 * One arm of a pose (left: `side` = 1). The right arm is this mirrored, so poses are given for the left. `over`:
 * of two hands held together, the one that lies on the other.
 */
function arm(pose: ArmPose, lift: number, f: Frame, seatTop: number, over = false): Limb {
  const sx = SHOULDER_X * f.wide * f.shoulders, sy = SHOULDER + lift;
  const root = v(sx, sy, 0);
  const upper = UPPER_ARM, fore = FOREARM;
  if (pose === "clasped") {
    // scrubbed: one hand over the other in front of the lower chest, palms to the body, elbows out a little — the
    // hand on top a hand's thickness further out, its palm on the back of the other
    const face = new Vector3(-0.1, -0.42, -0.9).normalize();
    const out = over ? CLASP_OVER : 0;
    const end = v(0.045 - face.x * out, sy - 0.235 - face.y * out, 0.2 + f.belly * 0.6 - face.z * out);
    const mid = bend(root, end, upper, fore, [0.75, -0.6, -0.25]);
    return { root, mid, end, along: v(-0.86, 0.14, 0.3), face: [face.x, face.y, face.z] };
  }
  if (pose === "sling") {
    // the forearm across the body in a sling, the hand a little higher than the elbow
    const end = v(-0.045, sy - 0.255, 0.165 + f.belly * 0.7);
    const mid = bend(root, end, upper, fore, [0.5, -0.8, -0.2]);
    return { root, mid, end, along: v(-0.94, 0.2, 0.28), face: v(-0.2, -0.3, -0.93) };
  }
  if (pose === "lap") {
    // sitting: the hand on the thigh, a little short of the knee
    const end = v(HIP_X * f.wide + 0.02, seatTop + 0.035, 0.255);
    const mid = bend(root, end, upper, fore, [0.55, -0.2, -0.8]);
    return { root, mid, end, along: v(-0.08, -0.12, 0.99), face: v(0, -1, -0.1) };
  }
  if (pose === "rest") {
    // lying (the rig lays the figure on its back): the arm along the trunk, on top of the covers
    const out = 0.045 + (f.wide - 1) * 0.12 + f.belly * 0.4;
    const end = v(sx + out, sy - upper - fore + 0.02, 0.085 + f.belly * 0.5);
    const mid = bend(root, end, upper, fore, [0.5, 0, 0.6]);
    return { root, mid, end, along: v(-0.06, -1, 0.02), face: v(0, 0.05, -1) };
  }
  const out = 0.045 + (f.wide - 1) * 0.16 + f.belly * 0.5;
  const end = v(sx + out, sy - upper - fore + 0.012, 0.055);
  const mid = bend(root, end, upper, fore, [0.35, 0, -1]);
  return { root, mid, end, along: v(0.04, -0.985, 0.165), face: v(-0.985, -0.05, 0.16) };
}

/** The joints of a posture (`seat`: the seat's or the mattress's top in the figure's own units). */
export function skeletonOf(posture: Posture, f: Frame, seat: number, arms: ArmPose | [ArmPose, ArmPose] = "relaxed"): Skeleton {
  const thigh = THIGH * f.legs, shin = SHIN * f.legs;
  const standHip = ANKLE + shin + thigh;
  const hx = HIP_X * f.wide * f.hips;
  let hip = standHip;
  let leg: Limb;
  let pose: ArmPose | [ArmPose, ArmPose] = arms;
  if (posture === "sitting") {
    // the thigh rests on the seat: the hip joint a thigh's half-thickness above it
    hip = seat + 0.078 * f.limb;
    const kneeUp = ANKLE + shin;
    const planted = hip - kneeUp <= 0.2 && hip - kneeUp >= -thigh * 0.8;
    if (planted) {
      const reach = Math.sqrt(Math.max(0, thigh * thigh - (hip - kneeUp) * (hip - kneeUp)));
      leg = { root: v(hx, hip, 0.02), mid: v(hx + 0.012, kneeUp, 0.02 + reach), end: v(hx + 0.014, ANKLE, 0.03 + reach), along: v(0.1, 0, 1), face: v(0, 1, 0) };
    } else {
      const kneeY = hip - 0.035;
      const reach = Math.sqrt(Math.max(0, thigh * thigh - 0.035 * 0.035));
      leg = { root: v(hx, hip, 0.02), mid: v(hx + 0.012, kneeY, 0.02 + reach), end: v(hx + 0.014, kneeY - shin, 0.045 + reach), along: v(0.08, -0.34, 0.94), face: v(0, 0.94, 0.34) };
    }
    if (arms === "relaxed") pose = "lap";
  } else if (posture === "lying") {
    leg = { root: v(hx, hip, 0), mid: v(hx + 0.012, hip - thigh, 0.012), end: v(hx + 0.022, ANKLE, 0), along: v(0.22, -0.2, 0.95), face: v(0, 0.98, 0.2) };
    if (arms === "relaxed") pose = "rest";
  } else {
    leg = { root: v(hx, hip, 0), mid: v(hx + 0.006, ANKLE + shin, 0.008), end: v(hx + 0.012, ANKLE, -0.012), along: v(0.14, 0, 0.99), face: v(0, 1, 0) };
  }
  const lift = hip - HIP;
  const seatTop = hip + 0.078 * f.limb;
  const [l, r] = Array.isArray(pose) ? pose : [pose, pose];
  return { posture, hip, lift, legs: [leg, leg], arms: [arm(l, lift, f, seatTop, true), arm(r, lift, f, seatTop)] };
}
