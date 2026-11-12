/**
 * A hand as a hand is: ONE skin over its bones (`hand-bones.ts`), drawn through a cage of points joined the way a
 * modelled hand is (`hand-cage.ts`) and refined into a smooth surface (`subdivide.ts`) — so the fingers grow out
 * of the palm through webs, the thumb out of its mound of muscle, the knuckles round their joints, and nothing is
 * a part pushed into another. On that skin:
 * - tone: the palm and the pads paler and pinker than the back; knuckles, fingertips and the heel a touch
 *   flushed; a darker line in the creases of the joints (and, seen close, of the palm);
 * - soft shade where the hand shades itself — between the fingers, in a bend, in the cupped palm — worked out from
 *   the bones (the world's light has no such shade of its own);
 * - nails that lie ON the fingertips (found by casting onto the skin), curved with them, their sides and root
 *   tucked into the skin, a pale edge and a lighter moon, short as a clinician's are.
 * A glove is the same hand a little fuller, in one colour, without nails.
 *
 * Seen close (`detail`: the player's own hand) the skin is refined twice; on a figure once. The frame is a left
 * hand's: the wrist at the origin, fingers along +Y, the palm facing −Z, the thumb on +X (`endFrame` puts it on an
 * arm; a right hand is its mirror).
 */
import { Vector3 } from "three";
import { HAND_RELAXED, type Bone, type Digit, type HandPose } from "./hand-bones.js";
import { handCage, onRing, type Dims, type HandCage } from "./hand-cage.js";
import { mix, rgb, shade, type Paint, type Rgb, type Sculpt } from "./sculpt.js";
import { fitCage, smoothSurface } from "./subdivide.js";

export { HAND_CLASPED, HAND_FLAT, HAND_HOLD, HAND_RELAXED, type HandPose } from "./hand-bones.js";

export interface HandOptions {
  /** The hand seen close (the player's): the skin refined twice, the palm's creases, finer nails. */
  detail?: boolean;
  /** Girth against the average hand. */
  girth?: number;
  /** A glove: one colour, no nails. */
  gloved?: boolean;
  /** The ring the arm ends in (`sweepEnd`, flat xyz in the hand's frame): the hand's edge is laid on it, point for point, so wrist and arm are one surface. */
  wrist?: readonly number[];
}

/** Where the pads of the thumb and of the four fingers are (the hand's frame), for putting something between them. */
export interface HandPoints {
  thumb: Vector3;
  fingers: Vector3[];
  /** The way each fingertip points. */
  pointing: Vector3[];
  /** The tops of the four knuckles, index to little finger. */
  knuckles: Vector3[];
}

const PINK = rgb("#e58c86");
/** What the palm of a dark hand is paler towards. */
const PALE = rgb("#e2b9a0");
/** A flush on the back of the hand: the same skin, redder and a shade deeper (whatever its colour). */
const FLUSH: Rgb = [1.02, 0.8, 0.8];
const NAIL = rgb("#f3cfc6");
const EDGE = rgb("#f6efe6");
/** What skin in its own shade turns towards: darker, and warmer (light comes back out of skin red). */
const SHADE: Rgb = [0.6, 0.43, 0.39];
/** The creases of the palm (x, y): round the mound of the thumb, and the two across. */
const PALM_LINES: readonly (readonly (readonly [number, number])[])[] = [
  [[0.009, -0.002], [0.019, 0.014], [0.0215, 0.038], [0.029, 0.06], [0.034, 0.07]],
  [[0.034, 0.068], [0.016, 0.062], [-0.004, 0.052], [-0.022, 0.044]],
  [[-0.037, 0.063], [-0.018, 0.068], [0.0, 0.074], [0.012, 0.083], [0.016, 0.09]],
];

/** One nail: its points on the skin, how they are joined, and where each lies on it (along 0 root … 1 edge, across 0 middle … 1 side). */
interface NailShape {
  points: number[];
  triangles: number[];
  place: [number, number][];
}

/** A hand's skin before it has a colour: the surface, and for each point what the paint needs. */
interface Shaped {
  cage: HandCage;
  points: Float32Array;
  triangles: number[];
  /** Per point: how far it is the palm's skin (0 the back … 1 the palm), flush, crease, shade. */
  palm: Float32Array;
  flush: Float32Array;
  crease: Float32Array;
  shadow: Float32Array;
  nails: NailShape[];
}

const shapes = new WeakMap<HandPose, Map<string, Shaped>>();

/** The distance from `p` to the piece of line a–b, and the nearest point on it. */
function toSegment(p: Vector3, a: Vector3, b: Vector3, out: Vector3): number {
  out.copy(b).sub(a);
  const len2 = out.lengthSq();
  const t = len2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * out.x + (p.y - a.y) * out.y + (p.z - a.z) * out.z) / len2)) : 0;
  out.multiplyScalar(t).add(a);
  return out.distanceTo(p);
}

/** Where the ray from `o` along `d` first meets one of `tris` (three points each, flat), as a distance; −1 if nowhere. */
function cast(o: Vector3, d: Vector3, tris: Float64Array): number {
  let best = -1;
  for (let i = 0; i < tris.length; i += 9) {
    const ax = tris[i]!, ay = tris[i + 1]!, az = tris[i + 2]!;
    const e1x = tris[i + 3]! - ax, e1y = tris[i + 4]! - ay, e1z = tris[i + 5]! - az;
    const e2x = tris[i + 6]! - ax, e2y = tris[i + 7]! - ay, e2z = tris[i + 8]! - az;
    const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-14) continue;
    const tx = o.x - ax, ty = o.y - ay, tz = o.z - az;
    const u = (tx * px + ty * py + tz * pz) / det;
    if (u < -1e-6 || u > 1 + 1e-6) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (d.x * qx + d.y * qy + d.z * qz) / det;
    if (v < -1e-6 || u + v > 1 + 1e-6) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) / det;
    if (t > 1e-6 && (best < 0 || t < best)) best = t;
  }
  return best;
}

/** A nail on the last bone of a digit: a grid of points cast onto the skin, its border tucked just under it. */
function nailShape(bone: Bone, side: Vector3, [w, hd]: Dims, points: Float32Array, triangles: readonly number[], fine: boolean): NailShape {
  // the skin near this bone
  const mid = bone.a.clone().addScaledVector(bone.d, bone.len * 0.6);
  const reach = (bone.len * 0.75 + 0.012) ** 2;
  const near: number[] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i]! * 3;
    if ((points[a]! - mid.x) ** 2 + (points[a + 1]! - mid.y) ** 2 + (points[a + 2]! - mid.z) ** 2 > reach) continue;
    for (let k = 0; k < 3; k++) near.push(points[triangles[i + k]! * 3]!, points[triangles[i + k]! * 3 + 1]!, points[triangles[i + k]! * 3 + 2]!);
  }
  const tris = Float64Array.from(near);
  const cols = fine ? 7 : 5, rows = fine ? 7 : 4;
  const out: NailShape = { points: [], triangles: [], place: [] };
  const o = new Vector3(), d = new Vector3();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const s = (i / (cols - 1)) * 2 - 1, t = j / (rows - 1);
      // an oval: narrower towards the edge and, a little, towards the root; the root's line bows towards the knuckle
      const wide = t > 0.62 ? Math.sqrt(Math.max(0, 1 - ((t - 0.62) / 0.38) ** 2 * 0.62)) : 0.9 + 0.1 * Math.min(1, t / 0.3);
      const along = 0.37 + 0.53 * t + 0.035 * (1 - t) * s * s;
      const turn = s * wide * 0.78;
      // rays fan out from under the bone's line, and lean forward over the tip
      const lean = t > 0.8 ? (t - 0.8) * 2.2 : 0;
      o.copy(bone.a).addScaledVector(bone.d, bone.len * along).addScaledVector(bone.up, -0.35 * hd);
      d.copy(bone.up).multiplyScalar(Math.cos(turn)).addScaledVector(side, Math.sin(turn) * (w / (hd * 1.25))).addScaledVector(bone.d, lean).normalize();
      const hit = cast(o, d, tris);
      const border = i === 0 || i === cols - 1 || j === 0 || j === rows - 1;
      const lift = border ? -0.00022 : 0.00032;
      const far = hit > 0 ? hit : hd * 1.3;
      out.points.push(o.x + d.x * (far + lift), o.y + d.y * (far + lift), o.z + d.z * (far + lift));
      out.place.push([t, Math.abs(s)]);
    }
  }
  const flip = new Vector3().crossVectors(side, bone.d).dot(bone.up) < 0;
  for (let j = 0; j + 1 < rows; j++) {
    for (let i = 0; i + 1 < cols; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols + 1, e = a + cols;
      if (flip) out.triangles.push(a, e, b, b, e, c);
      else out.triangles.push(a, b, e, b, c, e);
    }
  }
  return out;
}

/**
 * Lay the skin's open edge on the arm's last ring: a point on each corner of the ring, the others on its sides.
 * The skin just beyond gives way with it, less and less over the first centimetre, so the arm's many-sided end
 * runs out into the hand's round one without a step.
 */
function layOnRing(points: Float32Array, border: readonly number[], ring: readonly number[]): void {
  const angle = (x: number, z: number) => Math.atan2(z, x);
  const taken = new Map<number, number>();
  for (let j = 0; j < ring.length / 3; j++) {
    const a = angle(ring[3 * j]!, ring[3 * j + 2]!);
    let best = -1, gap = Infinity;
    for (const v of border) {
      if (taken.has(v)) continue;
      let d = Math.abs(angle(points[3 * v]!, points[3 * v + 2]!) - a);
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d < gap) {
        gap = d;
        best = v;
      }
    }
    if (best >= 0) taken.set(best, j);
  }
  // how far each point of the edge moves, by its angle round the wrist
  const moved = border
    .map((v) => {
      const a = angle(points[3 * v]!, points[3 * v + 2]!);
      const j = taken.get(v);
      const q = j === undefined ? onRing(ring, a) : new Vector3(ring[3 * j]!, ring[3 * j + 1]!, ring[3 * j + 2]!);
      return { v, a, d: q.sub(new Vector3(points[3 * v]!, points[3 * v + 1]!, points[3 * v + 2]!)) };
    })
    .sort((m, n) => m.a - n.a);
  const edge = new Set(border);
  const REACH = 0.012;
  for (let i = 0; i < points.length / 3; i++) {
    // (only the skin of the wrist: a fingertip curled back this far is not part of it)
    if (edge.has(i) || points[3 * i + 1]! >= REACH || points[3 * i]! ** 2 + points[3 * i + 2]! ** 2 > 0.045 ** 2) continue;
    const a = angle(points[3 * i]!, points[3 * i + 2]!);
    // between the two points of the edge on either side of it
    let hi = moved.findIndex((m) => m.a > a);
    if (hi < 0) hi = 0;
    const after = moved[hi]!, before = moved[(hi + moved.length - 1) % moved.length]!;
    let span = after.a - before.a, part = a - before.a;
    if (span <= 0) span += 2 * Math.PI;
    if (part < 0) part += 2 * Math.PI;
    const t = Math.min(1, Math.max(0, part / span));
    const k = (1 - Math.max(0, points[3 * i + 1]!) / REACH) ** 2;
    for (let c = 0; c < 3; c++) points[3 * i + c] = points[3 * i + c]! + k * (before.d.getComponent(c) * (1 - t) + after.d.getComponent(c) * t);
  }
  for (const m of moved) for (let c = 0; c < 3; c++) points[3 * m.v + c] = points[3 * m.v + c]! + m.d.getComponent(c);
}

function shapeOf(pose: HandPose, g: number, fine: boolean, wrist?: readonly number[]): Shaped {
  const key = `${g.toFixed(3)}${fine ? "f" : ""}${wrist ? wrist.map((v) => Math.round(v * 1e4)).join(",") : ""}`;
  let byPose = shapes.get(pose);
  if (!byPose) shapes.set(pose, (byPose = new Map()));
  const known = byPose.get(key);
  if (known) return known;
  const cage = handCage(pose, g, wrist);
  const surface = smoothSurface(fitCage(cage.mesh, 5), fine ? 2 : 1);
  const n = surface.points.length / 4;
  const points = new Float32Array(n * 3);
  const palm = new Float32Array(n), flush = new Float32Array(n), crease = new Float32Array(n), shadow = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) points[3 * i + k] = surface.points[4 * i + k]!;
  if (wrist) layOnRing(points, surface.border, wrist);
  const tri = surface.triangles;
  // the way the skin faces at each point
  const nrm = new Float32Array(n * 3);
  for (let i = 0; i < tri.length; i += 3) {
    const a = tri[i]! * 3, b = tri[i + 1]! * 3, c = tri[i + 2]! * 3;
    const ux = points[b]! - points[a]!, uy = points[b + 1]! - points[a + 1]!, uz = points[b + 2]! - points[a + 2]!;
    const vx = points[c]! - points[a]!, vy = points[c + 1]! - points[a + 1]!, vz = points[c + 2]! - points[a + 2]!;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) {
      nrm[k] = nrm[k]! + nx;
      nrm[k + 1] = nrm[k + 1]! + ny;
      nrm[k + 2] = nrm[k + 2]! + nz;
    }
  }
  const digits: Digit[] = [...cage.fingers, cage.thumb];
  // what shades the skin: every bone as a rod with the flesh round it, the bones of the palm among them
  const rods: { a: Vector3; b: Vector3; r: number }[] = [];
  cage.fingers.forEach((dg, i) => {
    // (a finger's section under its nail is 0.85 of its breadth at the middle joint)
    const w = cage.ends[i]![0] / 0.85;
    dg.bones.forEach((b, k) => rods.push({ a: b.a, b: b.a.clone().addScaledVector(b.d, b.len), r: w * (k === 2 ? 0.8 : 0.95) }));
    rods.push({ a: new Vector3(dg.bones[0]!.a.x * 0.62, 0.012, -0.002), b: dg.bones[0]!.a.clone().add(new Vector3(0, 0, -0.004)), r: 0.0125 * g });
  });
  cage.thumb.bones.forEach((b, k) => rods.push({ a: b.a, b: b.a.clone().addScaledVector(b.d, b.len), r: (k === 0 ? 0.0125 : 0.0095) * g }));
  // flush: over the knuckles and the joints of the fingers (the back), on the pads of the fingertips and the heel (the front)
  const joints: { p: Vector3; r: number; back: boolean }[] = cage.knuckles.map((p) => ({ p, r: 0.0085, back: true }));
  const folds: { p: Vector3; across: Vector3; r: number }[] = [];
  digits.forEach((dg, i) => {
    const [, hd, hp] = cage.ends[i]!;
    for (const k of [1, 2]) {
      const b = dg.bones[k]!, before = dg.bones[k - 1]!;
      if (i < 4 || k === 2) joints.push({ p: b.a.clone().addScaledVector(before.up.clone().add(b.up).normalize(), hd * 1.3), r: k === 1 ? 0.0068 : 0.0052, back: true });
      folds.push({ p: b.a, across: before.d.clone().add(b.d).normalize(), r: i < 4 ? 0.011 : 0.013 });
    }
    const last = dg.bones[2]!;
    joints.push({ p: last.a.clone().addScaledVector(last.d, last.len * 0.62).addScaledVector(last.up, -hp), r: 0.0105, back: false });
  });
  joints.push({ p: new Vector3(0.024 * g, 0.022, -0.03), r: 0.02, back: false }, { p: new Vector3(-0.026 * g, 0.026, -0.022), r: 0.018, back: false });
  const p = new Vector3(), q = new Vector3(), nv = new Vector3(), tmp = new Vector3();
  const lines = PALM_LINES.map((line) => line.map(([x, y]) => new Vector3(x * g, y, 0)));
  const fingerRoot = Math.min(...cage.fingers.map((dg) => dg.bones[0]!.a.y));
  for (let i = 0; i < n; i++) {
    p.set(points[3 * i]!, points[3 * i + 1]!, points[3 * i + 2]!);
    nv.set(nrm[3 * i]!, nrm[3 * i + 1]!, nrm[3 * i + 2]!).normalize();
    const back = Math.min(1, Math.max(-1, surface.points[4 * i + 3]!));
    // the palm's paler skin begins a little beyond the wrist (the arm it grows out of has one colour)
    palm[i] = Math.min(1, Math.max(0, (0.15 - back) / 0.75)) * Math.min(1, Math.max(0, p.y / 0.02));
    let f = 0;
    for (const j of joints) {
      const side = j.back ? Math.max(0, back) : palm[i]!;
      if (side > 0) f = Math.max(f, side * Math.exp(-p.distanceToSquared(j.p) / (j.r * j.r)));
    }
    flush[i] = f;
    // creases: in front, across each joint of a digit
    let c = 0;
    if (palm[i]! > 0) {
      for (const fold of folds) {
        const dist = p.distanceToSquared(fold.p);
        if (dist > fold.r * fold.r * 2.2) continue;
        const along = (p.x - fold.p.x) * fold.across.x + (p.y - fold.p.y) * fold.across.y + (p.z - fold.p.z) * fold.across.z;
        c = Math.max(c, Math.exp(-((along / (fine ? 0.0011 : 0.002)) ** 2)) * Math.exp(-dist / (fold.r * fold.r)));
      }
      // and, seen close, the lines of the palm
      if (fine && p.y < fingerRoot + 0.012 && back < -0.6) {
        q.set(p.x, p.y, 0);
        for (const line of lines) for (let k = 0; k + 1 < line.length; k++) c = Math.max(c, 0.42 * Math.exp(-((toSegment(q, line[k]!, line[k + 1]!, tmp) / 0.0021) ** 2)));
      }
    }
    // a crease is a fold of the front: it fades out round the sides
    crease[i] = c * Math.min(1, Math.max(0, (-0.4 - back) / 0.45));
    // shade: what of the hand stands in front of this piece of skin
    let s = 0;
    for (const rod of rods) {
      const dist = toSegment(p, rod.a, rod.b, q);
      if (dist < 1e-5) continue;
      const facing = ((q.x - p.x) * nv.x + (q.y - p.y) * nv.y + (q.z - p.z) * nv.z) / dist;
      if (facing > 0.08) s += (facing - 0.08) * Math.min(1, (rod.r / dist) ** 2);
    }
    shadow[i] = 1 - Math.exp(-1.25 * s);
  }
  const nails = digits.map((dg, i) => nailShape(dg.bones[2]!, dg.side, cage.ends[i]!, points, tri, fine));
  const shaped: Shaped = { cage, points, triangles: tri, palm, flush, crease, shadow, nails };
  byPose.set(key, shaped);
  return shaped;
}

/** A hand (see the module doc); returns where its pads are. */
export function addHand(sc: Sculpt, skin: Paint, pose: HandPose = HAND_RELAXED, opts: HandOptions = {}): HandPoints {
  const g = (opts.girth ?? 1) * (opts.gloved ? 1.05 : 1);
  const fine = !!opts.detail;
  const bare = !opts.gloved;
  const shaped = shapeOf(pose, g, fine, opts.wrist);
  const { cage } = shaped;
  const glow = skin.glow ?? 0, gloss = skin.gloss ?? 0;
  // the palm is paler than the back — a little on fair skin, much more on dark
  const light = 0.2126 * skin.rgb[0] + 0.7152 * skin.rgb[1] + 0.0722 * skin.rgb[2];
  const front: Rgb = mix(mix(shade(skin.rgb, 1.07), PINK, 0.1), PALE, Math.min(0.45, Math.max(0, (0.42 - light) * 0.9)));
  const n = shaped.points.length / 3;
  const paints: Paint[] = [];
  for (let i = 0; i < n; i++) {
    const dim = shaped.shadow[i]!;
    if (!bare) {
      paints.push({ rgb: shade(skin.rgb, 1 - 0.3 * dim), gloss, glow });
      continue;
    }
    const inPalm = shaped.palm[i]!;
    let c = mix(skin.rgb, front, inPalm);
    // flushed: the pads and the heel pinker, the knuckles redder and a shade deeper
    const warm = shaped.flush[i]!;
    c = mix(c, PINK, 0.24 * inPalm * warm);
    c = mix(c, [c[0] * FLUSH[0], c[1] * FLUSH[1], c[2] * FLUSH[2]], 0.75 * (1 - inPalm) * warm);
    c = shade(c, 1 - 0.15 * shaped.crease[i]!);
    c = mix(c, [c[0] * SHADE[0], c[1] * SHADE[1], c[2] * SHADE[2]], 0.8 * dim);
    paints.push({ rgb: c, gloss: gloss * (1 - 0.4 * inPalm), glow });
  }
  sc.mesh(shaped.points, shaped.triangles, paints);
  if (bare) {
    // a nail's bed shows the skin under it: pinker, and paler by less on a dark hand
    const bed: Rgb = mix(mix(skin.rgb, NAIL, 0.3 + 0.2 * Math.min(1, light / 0.5)), PINK, 0.34);
    for (const nail of shaped.nails) {
      sc.mesh(
        nail.points,
        nail.triangles,
        nail.place.map(([along, across]) => {
          // a pale edge at the tip, a lighter moon at the root, the skin's fold darker round it
          let c = along > 0.9 ? mix(bed, EDGE, 0.6) : along < 0.2 && across < 0.5 ? mix(bed, EDGE, 0.22) : bed;
          if (across > 0.9 || along < 0.06) c = mix(c, shade(skin.rgb, 0.78), 0.55);
          return { rgb: c, gloss: 0.68, glow: glow * 0.8 };
        }),
      );
    }
  }
  const pad = (dg: Digit, dims: Dims) => {
    const b = dg.bones[2]!;
    return b.a.clone().addScaledVector(b.d, b.len * 0.55).addScaledVector(b.up, -dims[2]);
  };
  return { thumb: pad(cage.thumb, cage.ends[4]!), fingers: cage.fingers.map((dg, i) => pad(dg, cage.ends[i]!)), pointing: cage.fingers.map((dg) => dg.bones[2]!.d.clone()), knuckles: cage.knuckles.map((k) => k.clone()) };
}
