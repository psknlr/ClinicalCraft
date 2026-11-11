/**
 * The cage of a hand: the few hundred points its skin is drawn through, joined as a modelled hand is — a tube
 * from the wrist to the knuckles (fourteen points round: a column along each finger's back, one between each
 * pair of fingers on the back and in the palm), which divides at the webs into the four fingers (five points
 * round: the back, its two shoulders, the two sides of the pad), and an opening in its thumb-side edge out of
 * which the thumb grows (eight points round) — over the mound of muscle at its root and the web to the index.
 * Each joint has a ring before it, on it and after it, so a bent finger keeps its knuckle and folds on a crease
 * in front instead of kinking like a hose. `subdivide.ts` turns the cage into smooth skin.
 *
 * What is drawn here is where the skin IS (`fitCage` makes the smooth surface pass through these points):
 * - the wrist in the section the forearm ends in; the heel of the hand; the palm hollow between the mound of the
 *   thumb and the pad along the little finger's side; the pads under the roots of the fingers;
 * - the back of the hand arched across, the tendons to the knuckles a little proud of the skin between them;
 * - the knuckles on an arc round their joints (higher as the finger bends), a valley between each pair;
 * - webs that start low between the knuckles on the back and reach further out in the palm;
 * - fingers flat on the back, full in the pad, widest at the middle joint, tapering to a round tip;
 * - the thumb's first bone inside the palm's edge: its skin runs from the opening to the thumb's knuckle, swollen
 *   in front (the mound) and slack between thumb and index (the web).
 */
import { Vector3 } from "three";
import { FINGERS, fingerBones, thumbBones, type Bone, type Digit, type HandPose } from "./hand-bones.js";
import type { PolyMesh } from "./subdivide.js";

/** A digit's section: half-width, depth to the back, depth to the front. */
export type Dims = readonly [number, number, number];
/** The points round a section, as fractions of its half-width (to the thumb's side) and of its depths (to the back). */
type Shape = readonly (readonly [number, number])[];

/** Round a finger: the shoulder on the thumb's side, the back, the other shoulder, the pad's two sides. */
const PENT: Shape = [[0.93, 0.44], [0, 1], [-0.93, 0.44], [-0.62, -0.8], [0.62, -0.8]];
const PENT_BACK = [0.5, 1, 0.5, -1, -1];
/** Round the thumb: eight, from beside the nail. */
const OCT: Shape = [[0.383, 0.924], [-0.383, 0.924], [-0.924, 0.383], [-0.924, -0.383], [-0.383, -0.924], [0.383, -0.924], [0.924, -0.383], [0.924, 0.383]];
const OCT_BACK = [0.8, 0.8, 0.35, -0.35, -1, -1, -0.35, 0.35];

/** Rows of the palm from the wrist to the knuckles, as fractions of the way. */
const ROW_V = [0, 0.07, 0.19, 0.46, 0.72];
/** The wrist's section: half-width and half-depth (an arm ends in it: `body.ts`). */
export const WRIST: readonly [number, number] = [0.0262, 0.0186];
/** Height of the back of the hand over the wrist's axis along its middle, row by row: it falls from the wrist to the necks of the knuckles. */
const BACK = [0.0186, 0.0186, 0.0168, 0.0138, 0.0115];
/** Depth of the palm under the wrist's axis, row by row, at the five columns from the thumb's side to the little finger's. */
const FRONT: readonly (readonly number[])[] = [
  [0.0076, 0.0174, 0.0186, 0.0174, 0.0076],
  [0.0078, 0.0178, 0.0188, 0.018, 0.0077],
  [0.02, 0.0192, 0.0196, 0.0222, 0.01],
  [0.0205, 0.0176, 0.0154, 0.0204, 0.0105],
  [0.0115, 0.0152, 0.0144, 0.0164, 0.0086],
];
/** Where the palm's edge on the thumb's side runs in front (the crease round the mound of the thumb): x, y per row. */
const CREASE: readonly (readonly [number, number] | null)[] = [null, null, [0.021, 0.015], [0.0205, 0.04], [0.03, 0.062]];
/** How far the tendons stand out of the back of the hand, row by row. */
const TENDON = [0, 0, 0.3, 0.8, 1.1];
/** The palm's front under a knuckle. */
const PALM_UNDER = 0.0172;

const RAD = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** The point of a closed ring (flat xyz, round the Y axis) seen from its middle at the angle `phi` from +X towards +Z. */
export function onRing(ring: readonly number[], phi: number): Vector3 {
  const n = ring.length / 3;
  let cx = 0, cz = 0;
  for (let j = 0; j < n; j++) {
    cx += ring[3 * j]! / n;
    cz += ring[3 * j + 2]! / n;
  }
  const dx = Math.cos(phi), dz = Math.sin(phi);
  let best: Vector3 | null = null, bestR = Infinity;
  for (let j = 0; j < n; j++) {
    const k = (j + 1) % n;
    const ax = ring[3 * j]! - cx, az = ring[3 * j + 2]! - cz, ex = ring[3 * k]! - ring[3 * j]!, ez = ring[3 * k + 2]! - ring[3 * j + 2]!;
    const det = ex * dz - ez * dx;
    if (Math.abs(det) < 1e-12) continue;
    // the ray from the middle meets this edge at fraction u, at distance r
    const u = (az * dx - ax * dz) / det, r = (az * ex - ax * ez) / det;
    if (u < -1e-6 || u > 1 + 1e-6 || r <= 0 || r >= bestR) continue;
    bestR = r;
    best = new Vector3(ring[3 * j]! + ex * u, ring[3 * j + 1]! + (ring[3 * k + 1]! - ring[3 * j + 1]!) * u, ring[3 * j + 2]! + ez * u);
  }
  return best ?? new Vector3(cx, ring[1]!, cz);
}

function around(shape: Shape, c: Vector3, up: Vector3, side: Vector3, [w, hd, hp]: Dims): Vector3[] {
  return shape.map(([sf, uf]) => c.clone().addScaledVector(side, sf * w).addScaledVector(up, uf * (uf >= 0 ? hd : hp)));
}

/**
 * The three rings of skin round a joint: before it, on it, after it. On the joint the back follows the round head
 * of the bone (a knuckle, a little prouder the more it bends) and the front folds where the two pads meet; the
 * rings beside it stay clear of that fold in front.
 */
function jointRings(shape: Shape, joint: Vector3, prev: Bone, next: Bone, side: Vector3, pre: Dims, at: Dims, post: Dims, before: number, after: number): [Vector3[], Vector3[], Vector3[]] {
  const beta = Math.acos(clamp(prev.d.dot(next.d), -1, 1));
  const mid = prev.up.clone().add(next.up).normalize();
  const tan = Math.tan(beta / 2), cos = Math.max(0.62, Math.cos(beta / 2));
  const proud = 1 + 0.16 * Math.sin(beta / 2);
  const beside = (bone: Bone, dims: Dims, gap: number, sign: number) =>
    shape.map(([sf, uf]) => {
      // the back turns over a longer arc than the front folds on
      const along = uf >= 0 ? gap * 1.45 : Math.max(gap * 0.85, -uf * dims[2] * tan + 0.0015);
      return joint.clone().addScaledVector(bone.d, sign * along).addScaledVector(side, sf * dims[0]).addScaledVector(bone.up, uf * (uf >= 0 ? dims[1] : dims[2]));
    });
  const on = shape.map(([sf, uf]) => joint.clone().addScaledVector(side, sf * at[0]).addScaledVector(mid, uf >= 0 ? uf * at[1] * proud : (uf * at[2]) / cos));
  return [beside(prev, pre, before, -1), on, beside(next, post, after, 1)];
}

/** A hand's cage and what the skin's finish needs to know of it. */
export interface HandCage {
  /** Four numbers per point: x, y, z and how far round to the back it is (1 the back … −1 the palm, the pads). */
  mesh: PolyMesh;
  fingers: Digit[];
  thumb: Digit;
  /** Each digit's section under its nail (index … little finger, then the thumb). */
  ends: Dims[];
  /** The tops of the four knuckles. */
  knuckles: Vector3[];
}

/**
 * The cage of a left hand of girth `g` held as `pose` says (see the module doc). `wrist` is the ring an arm ends
 * in (flat xyz in the hand's frame): the hand begins on it.
 */
export function handCage(pose: HandPose, g = 1, wrist?: readonly number[]): HandCage {
  const pts: number[] = [];
  const faces: number[][] = [];
  const add = (p: Vector3, back: number) => {
    pts.push(p.x, p.y, p.z, back);
    return pts.length / 4 - 1;
  };
  const ring = (ps: readonly Vector3[], backs: readonly number[]) => ps.map((p, i) => add(p, backs[i]!));
  const band = (r0: readonly number[], r1: readonly number[], skip?: (i: number) => boolean) => {
    const n = r0.length;
    for (let i = 0; i < n; i++) if (!skip?.(i)) faces.push([r0[i]!, r1[i]!, r1[(i + 1) % n]!, r0[(i + 1) % n]!]);
  };
  const cap = (r: readonly number[], apex: number) => {
    for (let i = 0; i < r.length; i++) faces.push([r[i]!, apex, r[(i + 1) % r.length]!]);
  };
  const gz = 1 + (g - 1) * 0.6;
  const fingers = FINGERS.map((_, i) => fingerBones(i, pose, g));
  const thumb = thumbBones(pose, g);
  const W = FINGERS.map((f) => f.w * g);
  const mcp = fingers.map((dg) => dg.bones[0]!.a);

  /* ---------------- the palm: wrist to knuckles ---------------- */
  // the nine columns of the back at the knuckles: the edge, a knuckle, a valley, …, the other edge
  const kx: number[] = [], ky: number[] = [];
  for (let e = 0; e <= 8; e++) {
    const i = Math.min(3, Math.floor(e / 2));
    if (e === 0 || e === 8) {
      kx.push(mcp[i]!.x + (e ? -1.02 : 1.02) * W[i]!);
      ky.push(mcp[i]!.y - 0.003);
    } else if (e % 2) {
      kx.push(mcp[i]!.x);
      ky.push(mcp[i]!.y);
    } else {
      kx.push((mcp[i - 1]!.x + mcp[i]!.x) / 2);
      ky.push((mcp[i - 1]!.y + mcp[i]!.y) / 2);
    }
  }
  const profile = (u: number) => Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(u)), 2.4)), 1 / 2.4);
  const BACKS = [0.45, 1, 1, 1, 1, 1, 1, 1, 0.45, -0.45, -1, -1, -1, -0.45];
  const rows: number[][] = [];
  let shift: Vector3[] = [];
  for (let j = 0; j <= 4; j++) {
    const v = ROW_V[j]!;
    // the first row beyond the wrist keeps the wrist's section: the hand leaves the arm in the arm's own line, then widens
    const xs = kx.map((x, e) => lerp(WRIST[0] * g * 0.95 * (1 - e / 4), x, j === 1 ? 0 : v));
    const ys = ky.map((y) => lerp(0, y, v));
    const ps: Vector3[] = [];
    for (let e = 0; e <= 8; e++) {
      const a = Math.abs(xs[e > 4 ? 8 : 0]!) / 0.95;
      const tendon = e > 0 && e < 8 ? (e % 2 ? 0.0006 : -0.0004) * TENDON[j]! : 0;
      ps.push(new Vector3(xs[e]!, ys[e]!, BACK[j]! * gz * profile(xs[e]! / a) + tendon));
    }
    for (let c = 4; c >= 0; c--) {
      const crease = c === 0 ? CREASE[j] : null;
      if (crease) ps.push(new Vector3(crease[0] * g, crease[1], -FRONT[j]![0]! * gz));
      else ps.push(new Vector3(xs[2 * c]!, ys[2 * c]!, -FRONT[j]![c]! * gz));
    }
    if (wrist && j === 0) {
      // the hand begins on the arm's last ring; the next row gives way a little towards it
      shift = ps.map((p) => onRing(wrist, Math.atan2(p.z, p.x)).sub(p));
      ps.forEach((p, i) => p.add(shift[i]!));
    } else if (wrist && j <= 2) ps.forEach((p, i) => p.addScaledVector(shift[i]!, j === 1 ? 1 : 0.3));
    rows.push(ring(ps, BACKS));
  }

  /* ---------------- the knuckles and the webs ---------------- */
  const under = PALM_UNDER * gz;
  const root = fingers.map((dg, i) => {
    const b = dg.bones[0]!, w = W[i]!;
    const beta = pose.fingers[i]![0] * RAD;
    const mid = new Vector3(0, 0, 1).add(b.up).normalize();
    const hd = 0.88 * w, hp = 0.94 * w;
    // where the finger's pad leaves the palm: a crease two fifths of the way along its first bone — or, on a
    // finger bent far over, where its pad meets the palm's
    let pad = 0.46 * b.len, fold = b.a.y + 0.003;
    if (beta > 35 * RAD) {
      pad = clamp((under - hp * Math.cos(beta)) / Math.sin(beta), 0.32 * b.len, 0.75 * b.len);
      fold = Math.min(fold, b.a.clone().addScaledVector(b.d, pad).addScaledVector(b.up, -hp).y - 0.005);
    }
    const back = b.a.clone().addScaledVector(b.d, 0.3 * b.len);
    const front = b.a.clone().addScaledVector(b.d, pad).addScaledVector(b.up, -0.8 * hp);
    return { b, w, hd, hp, mid, pad, fold, back, front, top: b.a.clone().addScaledVector(mid, 0.0088 * gz * (1 + 0.12 * Math.sin(beta / 2))), valley: b.a.clone().addScaledVector(mid, 0.0056 * gz) };
  });
  const knuckleRow: Vector3[] = [], webRow: Vector3[] = [];
  for (let e = 0; e <= 8; e++) {
    const i = Math.min(3, Math.floor(e / 2));
    const f = root[i]!, side = fingers[i]!.side;
    if (e === 0 || e === 8) {
      const s = e ? -1 : 1;
      knuckleRow.push(f.b.a.clone().addScaledVector(side, s * 1.02 * f.w).addScaledVector(f.mid, 0.0038 * gz));
      webRow.push(f.back.clone().addScaledVector(side, s * 0.93 * f.w).addScaledVector(f.b.up, 0.44 * f.hd));
    } else if (e % 2) {
      knuckleRow.push(f.top);
      webRow.push(f.back.clone().addScaledVector(f.b.up, f.hd));
    } else {
      const p = root[i - 1]!;
      knuckleRow.push(p.valley.clone().add(f.valley).multiplyScalar(0.5));
      // the web starts low between the two fingers, at the level of their bones
      webRow.push(p.back.clone().add(f.back).multiplyScalar(0.5).addScaledVector(p.b.up.clone().add(f.b.up).normalize(), 0.0012));
    }
  }
  for (let c = 4; c >= 0; c--) {
    const i = Math.min(3, c), f = root[i]!, side = fingers[i]!.side;
    if (c === 0 || c === 4) {
      const s = c ? -1 : 1;
      knuckleRow.push(new Vector3(f.b.a.x + s * 0.97 * f.w, f.fold, f.b.a.z - 0.41 * under));
      webRow.push(f.front.clone().addScaledVector(side, s * 0.62 * f.w));
    } else {
      const p = root[c - 1]!;
      // the pad under the web between two fingers
      knuckleRow.push(new Vector3((p.b.a.x + f.b.a.x) / 2, (p.fold + f.fold) / 2, (p.b.a.z + f.b.a.z) / 2 - under - 0.0008));
      webRow.push(p.front.clone().add(f.front).multiplyScalar(0.5));
    }
  }
  rows.push(ring(knuckleRow, BACKS), ring(webRow, BACKS));
  // the thumb grows out of the edge between the wrist's row and the fourth
  for (let j = 0; j + 1 < rows.length; j++) band(rows[j]!, rows[j + 1]!, (i) => i === 13 && j >= 1 && j <= 3);

  /* ---------------- fingers ---------------- */
  const ends: Dims[] = [];
  fingers.forEach((dg, i) => {
    const w = W[i]!, f = root[i]!;
    const [b0, b1, b2] = dg.bones as [Bone, Bone, Bone];
    const dims = (a: number, b: number, c: number): Dims => [a * w, b * w, c * w];
    const web = rows[6]!;
    const rings: number[][] = [[web[2 * i]!, web[2 * i + 1]!, web[2 * i + 2]!, web[9 + (3 - i)]!, web[9 + (4 - i)]!]];
    const put = (ps: Vector3[]) => rings.push(ring(ps, PENT_BACK));
    // free of the webs
    put(around(PENT, b0.a.clone().addScaledVector(b0.d, Math.max(0.62 * b0.len, f.pad + 0.006)), b0.up, dg.side, dims(0.96, 0.86, 0.9)));
    const k = w / 0.0085;
    // a straight finger is one form: the joints show as a little more width and a shallow fold in front, and stand out of the back only as they bend
    jointRings(PENT, b1.a, b0, b1, dg.side, dims(0.98, 0.86, 0.88), dims(1, 0.86, 0.845), dims(0.97, 0.845, 0.855), 0.0055 * k, 0.005 * k).forEach(put);
    jointRings(PENT, b2.a, b1, b2, dg.side, dims(0.9, 0.76, 0.79), dims(0.905, 0.745, 0.75), dims(0.885, 0.71, 0.765), 0.0042 * k, 0.0038 * k).forEach(put);
    const nail = dims(0.85, 0.6, 0.78);
    ends.push(nail);
    put(around(PENT, b2.a.clone().addScaledVector(b2.d, 0.56 * b2.len), b2.up, dg.side, nail));
    put(around(PENT, b2.a.clone().addScaledVector(b2.d, 0.86 * b2.len).addScaledVector(b2.up, -0.12 * w), b2.up, dg.side, dims(0.64, 0.38, 0.6)));
    for (let r = 0; r + 1 < rings.length; r++) band(rings[r]!, rings[r + 1]!);
    cap(rings[rings.length - 1]!, add(dg.tip.clone().addScaledVector(b2.up, -0.16 * w), -0.3));
  });

  /* ---------------- the thumb ---------------- */
  {
    const [m, p1, p2] = thumb.bones as [Bone, Bone, Bone];
    const side = thumb.side;
    const dims = (a: number, b: number, c: number): Dims => [a * g, b * g, c * g];
    // the opening, round from the wrist's corner in front: up to the back, along it, down in front of the index, back along the crease
    const open = [rows[1]![13]!, rows[1]![0]!, rows[2]![0]!, rows[3]![0]!, rows[4]![0]!, rows[4]![13]!, rows[3]![13]!, rows[2]![13]!];
    const at = (i: number) => new Vector3(pts[4 * i]!, pts[4 * i + 1]!, pts[4 * i + 2]!);
    // its knuckle
    const knuckle = jointRings(OCT, p1.a, m, p1, side, dims(0.0112, 0.0092, 0.0102), dims(0.0112, 0.0092, 0.0102), dims(0.0098, 0.0082, 0.0092), 0.012, 0.008);
    const KNUCKLE_BACK = [0.4, 0.8, 0.5, -0.2, -1, -1, -0.8, -0.5];
    // from the opening to the knuckle: the skin over the thumb's first bone — swollen in front (the mound), slack
    // between thumb and index (the web)
    const SWELL = [0.0035, 0.0015, 0.0005, -0.0005, 0, 0, 0.0025, 0.0065];
    const SLACK = [0, 0, 0, 0.002, 0.005, 0.004, 0, 0];
    const rings: number[][] = [open];
    for (const t of [0.36, 0.72]) {
      const ps: Vector3[] = [], backs: number[] = [];
      open.forEach((o, k) => {
        const p = at(o).lerp(knuckle[1][k]!, t);
        const onBone = m.a.clone().addScaledVector(m.d, clamp(p.clone().sub(m.a).dot(m.d), 0, m.len));
        const outward = p.clone().sub(onBone).normalize();
        const bow = Math.sin(Math.PI * t);
        p.addScaledVector(outward, SWELL[k]! * gz * bow).addScaledVector(m.d, -SLACK[k]! * bow);
        ps.push(p);
        backs.push(lerp(pts[4 * o + 3]!, KNUCKLE_BACK[k]!, t));
      });
      rings.push(ring(ps, backs));
    }
    rings.push(ring(knuckle[1], KNUCKLE_BACK));
    const put = (ps: Vector3[]) => rings.push(ring(ps, OCT_BACK));
    put(around(OCT, p1.a.clone().addScaledVector(p1.d, 0.5 * p1.len), p1.up, side, dims(0.0098, 0.0082, 0.0092)));
    jointRings(OCT, p2.a, p1, p2, side, dims(0.0099, 0.008, 0.0088), dims(0.0105, 0.0079, 0.0085), dims(0.0104, 0.0074, 0.009), 0.0055, 0.0045).forEach(put);
    const nail = dims(0.0102, 0.0062, 0.0092);
    ends.push(nail);
    put(around(OCT, p2.a.clone().addScaledVector(p2.d, 0.56 * p2.len), p2.up, side, nail));
    put(around(OCT, p2.a.clone().addScaledVector(p2.d, 0.86 * p2.len).addScaledVector(p2.up, -0.001 * g), p2.up, side, dims(0.0076, 0.004, 0.0062)));
    for (let r = 0; r + 1 < rings.length; r++) band(rings[r]!, rings[r + 1]!);
    cap(rings[rings.length - 1]!, add(thumb.tip.clone().addScaledVector(p2.up, -0.0016 * g), -0.3));
  }
  return { mesh: { stride: 4, points: Float64Array.from(pts), faces }, fingers, thumb, ends, knuckles: root.map((f) => f.top) };
}
