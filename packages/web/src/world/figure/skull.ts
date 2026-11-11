/**
 * The form of a head, in its own frame — the origin is the joint it turns about (the top of the neck), +Y up, +Z
 * the face. One smooth surface: the skull; seen from in front an oval, the line of the jaw soft in to a small
 * rounded chin; in profile a jaw with depth — the chin stands under the lips, a little behind them, and the
 * jaw's lower border rises from it to its angle under the ear and up behind it to the nape (`jawLineAt`) — the
 * lower third of the face no longer than its middle third; the brow, the hollows the eyes lie in (deepest beside
 * the root of the nose, where the inner corners of the eyes are), the cheeks, a slim nose, the mound of the mouth
 * and the chin. `skullPoint` gives it by angle; `faceDepth` gives it by where a point is seen from in front,
 * exactly — what the face's own parts (lids, lips, brows) are placed with. What is worked out for a face of an age
 * and a width is kept for every figure with such a face (`remembered`).
 */
import { Vector3 } from "three";
import type { V3 } from "./sculpt.js";

/** The centre of the head above the joint, and its half-sizes. */
export const HEAD_CENTRE: V3 = [0, 0.061, 0.012];
const HALF = { x: 0.0745, y: 0.114, down: 0.108, jaw: 0.15, front: 0.092, back: 0.1035 };
/** Heights on the face, from the centre of the head: the eyes and the mouth; and half the distance between the eyes. */
export const EYE_Y = 0.004;
export const EYE_X = 0.0315;
export const MOUTH_Y = -0.0575;
/** The soft light skin keeps in shade (`Paint.glow`). */
export const SKIN_GLOW = 0.26;
/** How deep the hollow of an eye is at its middle (the eye itself fills it again). */
export const SOCKET = 0.0068;

export interface FaceSpec {
  /** 0 an adult … 1 an infant. */
  young: number;
  /** Width of the face (a heavy build's is fuller). */
  wide: number;
}

/** Where a face of this age has its eye line and its mouth, above the head's centre. */
export function featureHeights(face: FaceSpec): { eye: number; mouth: number } {
  return { eye: EYE_Y - 0.012 * face.young, mouth: MOUTH_Y + 0.006 * face.young };
}

/**
 * One value along a line, read between its keys ([at, value], ascending) with a smooth curve — `curve` of `body.ts`
 * for a single value, with nothing made per reading (the head's form is read tens of thousands of times a figure).
 */
function line(keys: readonly (readonly [number, number])[]): (at: number) => number {
  const n = keys.length;
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  // slopes by finite differences, as `curve` takes them
  const slope = (i: number) => {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    return (ys[b]! - ys[a]!) / Math.max(1e-6, xs[b]! - xs[a]!);
  };
  const ms = keys.map((_, i) => slope(i));
  return (at) => {
    if (at <= xs[0]!) return ys[0]!;
    if (at >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (i + 2 < n && at > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!;
    const t = (at - xs[i]!) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i]! + (t3 - 2 * t2 + t) * ms[i]! * h + (-2 * t3 + 3 * t2) * ys[i + 1]! + (t3 - t2) * ms[i + 1]! * h;
  };
}

const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How far the jaw comes in from the width of the cheekbones (a share of it), by how far below the head's centre. */
const JAW_IN = line([
  [-0.002, 0],
  [0.03, 0.05],
  [0.06, 0.19],
  [0.085, 0.33],
  [0.108, 0.45],
  [0.13, 0.55],
  [0.16, 0.62],
]);
/**
 * The lower border of the jaw seen from the side: its height by how far in front of the head's centre — from the
 * chin back and a little up to the angle of the jaw under the ear, then up behind it to the nape.
 */
const JAW_LINE = line([
  [-0.05, -0.055],
  [-0.03, -0.057],
  [-0.015, -0.064],
  [-0.005, -0.072],
  [0.01, -0.08],
  [0.04, -0.0915],
  [0.065, -0.099],
  [0.09, -0.1015],
]);

/** The height above the head's centre of the lower border of the jaw, `z` in front of the head's centre (a child's is higher). */
export function jawLineAt(z: number, face: FaceSpec): number {
  return -0.055 + (JAW_LINE(z) + 0.055) * (1 - 0.14 * face.young);
}

/**
 * A point of the head's surface: `theta` round the head from the face towards the figure's left, `phi` from the
 * crown down (radians). In the head's frame.
 */
export function skullPoint(theta: number, phi: number, face: FaceSpec): Vector3 {
  const sp = Math.sin(phi);
  const dx = sp * Math.sin(theta), dy = Math.cos(phi), dz = sp * Math.cos(theta);
  const n = 2.25;
  const young = face.young;
  const c = dz >= 0 ? HALF.front : HALF.back;
  // downwards the face keeps its depth to the chin — a jaw is a body, not the small end of an egg — while the back of
  // the head turns in to the nape
  const low = HALF.down + (HALF.jaw - 0.02 * young - HALF.down) * smooth(-0.2, 0.7, Math.cos(theta));
  const r = 1 / Math.pow(Math.pow(Math.abs(dx) / HALF.x, n) + Math.pow(Math.abs(dy) / (dy >= 0 ? HALF.y : low), n) + Math.pow(Math.abs(dz) / c, n), 1 / n);
  let x = dx * r, y = dy * r, z = dz * r;
  // the cranium of the young is large over a small face (growing in from the level of the eyes up, with no step)
  const cranium = young * smooth(-0.03, 0.03, y);
  x *= 1 + 0.05 * cranium;
  z *= 1 + 0.04 * cranium;
  // the jaw: in from the cheekbones in a soft line to a small, rounded chin (the line leaves the cheekbone with no
  // corner: it begins level and steepens)
  const taper = (1 - 0.37 * young) / (0.75 + 0.25 * face.wide * face.wide);
  x *= (1 - taper * JAW_IN(-y)) * (1 + (face.wide - 1) * 0.45 * smooth(0.05, -0.05, y));
  // under the jaw: its lower border from the chin back to its angle under the ear, where the neck comes in
  const floor = jawLineAt(z, face);
  if (y < floor + 0.012) {
    // eased into the flat, so the line of the jaw is soft
    const over = floor + 0.012 - y;
    y = floor + 0.012 - 0.012 * (1 - Math.exp(-over / 0.012)) - Math.max(0, over - 0.012) * 0.06;
  }
  // the face: brow, the hollows of the eyes, nose, cheeks, mouth, chin (out of the surface towards +Z)
  const w = smooth(0.015, 0.055, z);
  if (w > 0) {
    const e = EYE_Y - 0.012 * young, m = MOUTH_Y + 0.006 * young;
    const nose = 1 - 0.45 * young;
    let d = 0;
    for (const s of [-1, 1]) {
      // the hollow an eye lies in, and the valley beside the root of the nose where its inner corner is
      d += -SOCKET * gauss(x, y, s * EYE_X, e + 0.0015, 0.0145, 0.0095);
      d += -0.0054 * (1 - 0.35 * young) * gauss(x, y, s * 0.0165, e - 0.001, 0.0065, 0.0095);
      // the brow, soft
      d += 0.0024 * (1 - 0.6 * young) * gauss(x, y, s * 0.03, e + 0.0205, 0.02, 0.007);
      // the wings of the nose
      d += 0.0044 * nose * gauss(x, y, s * 0.0116, e - 0.0368, 0.0052, 0.0048);
      // cheeks: the cheekbone, and the apple of the cheek in front of it
      d += (0.0052 + 0.004 * young + 0.003 * (face.wide - 1)) * gauss(x, y, s * 0.041, e - 0.036, 0.022, 0.026);
      d += 0.002 * gauss(x, y, s * 0.034, e - 0.027, 0.014, 0.012);
      // the cheek falls in a little under the cheekbone (less on a full face)
      d += -0.0022 * (1 - young) * Math.max(0, 1.6 - face.wide) * gauss(x, y, s * 0.05, e - 0.056, 0.014, 0.016);
      d += -0.0025 * gauss(x, y, s * 0.068, e + 0.03, 0.012, 0.02);
    }
    // the nose: a slim bridge, low between the eyes, to a small rounded tip
    d += 0.0038 * nose * gauss(x, y, 0, e + 0.002, 0.0078, 0.019);
    d += 0.0148 * nose * gauss(x, y, 0, e - 0.0225, 0.0072, 0.0135);
    d += 0.0098 * nose * gauss(x, y, 0, e - 0.0322, 0.0064, 0.0058);
    // the groove under the nose, the mound of the mouth, the fold under the lower lip, the chin
    d += -0.0016 * gauss(x, y, 0, m + 0.0125, 0.0045, 0.006);
    d += 0.0038 * gauss(x, y, 0, m + 0.001, 0.022, 0.0125);
    d += -0.0018 * gauss(x, y, 0, m - 0.0165, 0.014, 0.0058);
    d += (0.006 - 0.003 * young) * gauss(x, y, 0, m - 0.031, 0.0185, 0.011);
    z += d * w;
  }
  return new Vector3(x + HEAD_CENTRE[0], y + HEAD_CENTRE[1], z + HEAD_CENTRE[2]);
}

/** The head's own grid: columns crowd towards the face, rows towards the features. */
export const NU = 56, NV = 44;
/** The angle round the head of column `i` (from the back by the figure's right to the face and on). */
export function thetaAt(i: number): number {
  const u = (i / NU) * Math.PI * 2 - Math.PI;
  return u - 0.62 * Math.sin(u);
}
const PHI = line([
  [0, 0],
  [0.15, 0.9],
  [0.27, 1.3],
  [0.79, 2.34],
  [0.93, 2.78],
  [1, Math.PI],
]);
/** The angle down from the crown of row `j`. */
export function phiAt(j: number): number {
  return PHI(j / NV);
}

/** The polar angle at which the head's surface is `y` above its centre, round at `theta`. */
export function phiOfHeight(theta: number, y: number, face: FaceSpec): number {
  const height = (phi: number) => skullPoint(theta, phi, face).y - HEAD_CENTRE[1] - y;
  let lo = 0.02, hi = Math.PI * 0.8;
  let flo = height(lo), fhi = height(hi);
  if (flo <= 0) return lo;
  if (fhi >= 0) return hi;
  // the surface only goes down from the crown: false position between the two ends, halving the stale one
  for (let k = 0; k < 22 && hi - lo > 2e-5; k++) {
    const mid = lo + ((hi - lo) * flo) / (flo - fhi);
    const f = height(mid);
    if (Math.abs(f) < 2e-6) return mid;
    if (f > 0) {
      lo = mid;
      flo = f;
      fhi *= 0.5;
    } else {
      hi = mid;
      fhi = f;
      flo *= 0.5;
    }
  }
  return (lo + hi) / 2;
}

/** The hairline round the head: height above the head's centre by the angle from the face (degrees, either side). */
const HAIRLINE = line([
  [0, 0.064],
  [28, 0.064],
  [48, 0.057],
  [61, 0.034],
  [73, 0.008],
  [84, 0.014],
  [97, 0.027],
  [111, 0.008],
  [130, -0.03],
  [152, -0.052],
  [180, -0.058],
]);

/** Height of the hairline above the head's centre at `theta` (a child's sits higher on a larger cranium). */
export function hairlineAt(theta: number, face: FaceSpec): number {
  let a = Math.abs(theta) % (Math.PI * 2);
  if (a > Math.PI) a = Math.PI * 2 - a;
  return HAIRLINE((a * 180) / Math.PI) + 0.004 * face.young;
}

const depths = new Map<string, Map<number, number>>();
const depthsOf = new WeakMap<FaceSpec, Map<number, number>>();

/** What has been worked out for a face of this age and width (the same for every figure that has such a face). */
export function remembered<T>(store: Map<string, T>, face: FaceSpec, make: () => T): T {
  const spec = `${face.young.toFixed(3)}|${face.wide.toFixed(3)}`;
  let had = store.get(spec);
  if (had === undefined) store.set(spec, (had = make()));
  return had;
}

/**
 * How far in front of the head's centre the face is where it is seen at (x, y) from in front (both from the
 * head's centre): the surface itself, not an estimate — found by walking the two angles to the point. Kept per
 * face, so the same face is worked out once.
 */
export function faceDepth(x: number, y: number, face: FaceSpec): number {
  let known = depthsOf.get(face);
  if (!known) depthsOf.set(face, (known = remembered(depths, face, () => new Map<number, number>())));
  const key = (Math.round(x * 1e5) + 16384) * 65536 + Math.round(y * 1e5) + 32768;
  const had = known.get(key);
  if (had !== undefined) return had;
  let theta = Math.atan2(x, 0.085), phi = Math.acos(Math.min(0.95, Math.max(-0.95, y / 0.112)));
  let z = 0;
  for (let k = 0; k < 14; k++) {
    const p = skullPoint(theta, phi, face);
    const px = p.x - HEAD_CENTRE[0], py = p.y - HEAD_CENTRE[1];
    z = p.z - HEAD_CENTRE[2];
    const ex = x - px, ey = y - py;
    if (Math.abs(ex) + Math.abs(ey) < 1.5e-6) break;
    const rho = Math.hypot(px, py, z);
    theta += ex / Math.max(0.03, rho * Math.cos(theta) * Math.sin(phi));
    phi -= ey / Math.max(0.03, rho * Math.sin(phi));
    theta = Math.min(1.45, Math.max(-1.45, theta));
    phi = Math.min(2.6, Math.max(0.3, phi));
  }
  known.set(key, z);
  return z;
}

/** The way the face looks out at (x, y): its normal there. */
export function faceNormal(x: number, y: number, face: FaceSpec): Vector3 {
  const h = 0.0006;
  const dzdx = (faceDepth(x + h, y, face) - faceDepth(x - h, y, face)) / (2 * h);
  const dzdy = (faceDepth(x, y + h, face) - faceDepth(x, y - h, face)) / (2 * h);
  return new Vector3(-dzdx, -dzdy, 1).normalize();
}
