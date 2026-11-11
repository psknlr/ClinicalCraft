/**
 * The mouth of a face. The lips are the face's own skin (`addMouthSkin`: rings from the opening cut in the head's
 * grid in to the lips' outer edge, over their fullness, down to the line they meet on and into the dark behind
 * it), so they shade as one with the face and the jaw can open them: an upper lip with its bow — two soft peaks
 * either side of a dip — and a fuller lower one, the corners turned a touch up. Their colour is deepest along
 * the line and at the middle and fades out to the edge, which has no outline; the lower lip catches the light.
 * Opening, the lips part widest at the middle and not at the corners, which go half the jaw's way and come in a
 * little (`jawShare`, `cornerPull`): a long oval. In it, over the dark of the mouth and the red of the tongue low
 * in it, the edge of the upper teeth shows under the upper lip (`addTeeth`, `teethShow`). Under the nose, the
 * nostrils are two soft shadows (`addNostrils`).
 *
 * `t` runs across the mouth from −1 at the corner on the figure's right to 1 at the one on its left.
 */
import { leaves, type Outline, type Patchwork } from "./face-mesh.js";
import { mix, rgb, shade, type Paint, type Rgb, type Sculpt, type V3 } from "./sculpt.js";
import { HEAD_CENTRE, faceDepth, faceNormal, featureHeights, remembered, type FaceSpec } from "./skull.js";

/** The shape of a mouth: heights are above the head's centre. */
export interface MouthForm {
  /** The height of the mouth, and half its width (to a corner). */
  m: number;
  half: number;
  /** The line the lips meet on, by x; and how far out along it the lips part. */
  line: (x: number) => number;
  parts: number;
  /** The outer edge of the upper lip, and of the lower. */
  top: (t: number) => number;
  bottom: (t: number) => number;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const mouthForms = new Map<string, MouthForm>();
const mouthFormOf = new WeakMap<FaceSpec, MouthForm>();

/** The mouth of a face (a child's is smaller and softer). */
export function mouthForm(face: FaceSpec): MouthForm {
  let form = mouthFormOf.get(face);
  if (!form) mouthFormOf.set(face, (form = remembered(mouthForms, face, () => shapeMouth(face))));
  return form;
}

function shapeMouth(face: FaceSpec): MouthForm {
  const m = featureHeights(face).mouth;
  const half = 0.0218 - 0.0036 * face.young;
  const k = 1 - 0.15 * face.young;
  const turn = (t: number) => 0.0014 * t * t;
  const line = (x: number) => {
    const t = x / half;
    // the corners a touch up; the middle of the upper lip dips into the lower
    return m + turn(t) - 0.00045 * Math.exp(-((t / 0.2) ** 2)) + 0.00025 * Math.exp(-(((Math.abs(t) - 0.42) / 0.2) ** 2));
  };
  const top = (t: number) => {
    const a = Math.abs(t);
    const arch = Math.pow(Math.max(0, 1 - Math.pow(a, 1.7)), 0.8);
    const dip = 1 - 0.2 * Math.exp(-((t / 0.13) ** 2));
    const peak = 1 + 0.06 * Math.exp(-(((a - 0.22) / 0.12) ** 2));
    return m + turn(t) + 0.0072 * k * arch * dip * peak;
  };
  const bottom = (t: number) => m + turn(t) - 0.0092 * k * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.2)), 0.7);
  return { m, half, line, parts: half - 0.003, top, bottom };
}

const ROSE = rgb("#dd7f86");
const DEEP = rgb("#b5364f");
const DARK: Rgb = rgb("#1c090b");
const TONGUE = rgb("#a3454c");
const TOOTH = rgb("#f1ede4");
/** How far in from a lip's outer edge (0) to the line (1) its rings lie. */
const IN = [0, 0.13, 0.36, 0.62, 0.86, 1];
const ROUND = 52;

/**
 * The skin round the mouth and the lips, into `mesh`: from `hole` — the loop of the head's grid round the opening
 * cut for the mouth, counter-clockwise seen from in front — in to the line the lips meet on and the dark behind.
 */
export function addMouthSkin(mesh: Patchwork, hole: readonly number[], face: FaceSpec, skin: Rgb, skinAt: (x: number, y: number, z: number) => Paint): void {
  const f = mouthForm(face);
  const [cx, cy, cz] = HEAD_CENTRE;
  const depth = (x: number, y: number) => faceDepth(x, y, face);
  const halfRound = ROUND / 2;
  // round the mouth: along the lower lip from the corner on the figure's right, back along the upper
  const where = Array.from({ length: ROUND }, (_, k) => (k < halfRound ? { t: -Math.cos((Math.PI * k) / halfRound), upper: false, corner: k === 0 } : { t: Math.cos((Math.PI * (k - halfRound)) / halfRound), upper: true, corner: k === halfRound }));
  const full = (t: number) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.5)), 0.7);
  const outer = mix(skin, ROSE, 0.7), deep = mix(skin, DEEP, 0.9);
  const point = (t: number, upper: boolean, corner: boolean, into: number): V3 => {
    const bx = corner ? Math.sign(t) * (f.half + 0.0005) : t * f.half;
    const by = corner ? f.line(Math.sign(t) * f.half) : upper ? f.top(t) : f.bottom(t);
    const lx = t * f.parts;
    const ly = f.line(lx) + (corner ? 0 : (upper ? 1 : -1) * 0.00022 * (1 - t * t * t * t));
    const x = bx + (lx - bx) * into, y = by + (ly - by) * into;
    // a lip stands out fullest part-way in, and turns in again at the line
    const swell = upper ? 0.00175 * Math.sin(Math.PI * Math.pow(into, 0.9)) : 0.0025 * Math.sin(Math.PI * Math.pow(into, 0.85));
    return [x, y, depth(x, y) + (0.00022 + swell - 0.0008 * into ** 4) * full(t) + 0.0001];
  };
  const paintOf = (p: V3, t: number, upper: boolean, into: number): Paint => {
    const base = skinAt(p[0] + cx, p[1] + cy, p[2] + cz);
    if (into === 0) return base;
    // deepest along the line and at the middle, fading to the edge and the corners
    const how = smooth(0.2, 0.9, into) * (1 - 0.6 * Math.pow(Math.abs(t), 1.6));
    let c = mix(outer, deep, how);
    if (into < 0.2) c = mix(base.rgb, c, 0.6);
    const lit = !upper && into > 0.3 && into < 0.7 ? Math.exp(-((t / 0.42) ** 2)) : 0;
    return { rgb: mix(c, [1, 0.95, 0.94], 0.14 * lit), gloss: 0.46 + 0.4 * lit, glow: base.glow };
  };
  const rings = IN.map((into) =>
    where.map(({ t, upper, corner }) => {
      const p = point(t, upper, corner, into);
      return mesh.add(p[0] + cx, p[1] + cy, p[2] + cz, paintOf(p, t, upper, into));
    }),
  );
  // behind the line: the dark of the mouth, and low in it the red of the tongue
  const dark: Paint = { rgb: DARK, gloss: 0 };
  const tongue: Paint = { rgb: mix(DARK, TONGUE, 0.3), gloss: 0.1 };
  const back = where.map(({ t, upper, corner }) => {
    const p = point(t, upper, corner, 1);
    return mesh.add(p[0] + cx, p[1] + (corner ? 0 : (upper ? 0.0012 : -0.0012) * (1 - t * t)) + cy, p[2] - 0.0035 + cz, upper || corner ? dark : { ...tongue, rgb: mix(DARK, tongue.rgb, 1 - t * t) });
  });
  const far = mesh.add(cx, f.line(0) + cy, depth(0, f.m) - 0.0095 + cz, dark);
  // from the grid's opening to the lips' edge: plain skin, half-way
  const mx = cx, my = f.m - 0.0008 + cy;
  const loopOf = (handles: readonly number[]): Outline =>
    handles.map((h) => {
      const p = mesh.at(h);
      return [p[0], p[1]];
    });
  const from = loopOf(hole), to = loopOf(rings[0]!);
  const steps: number[][] = [];
  for (const [part, count] of [[0.36, 40], [0.74, 48]] as const) {
    const ring: number[] = [];
    for (let k = 0; k < count; k++) {
      const theta = -Math.PI + ((k + 0.5) / count) * Math.PI * 2;
      const a = leaves(from, mx, my, theta), b = leaves(to, mx, my, theta);
      const x = a[0] * (1 - part) + b[0] * part - cx, y = a[1] * (1 - part) + b[1] * part - cy;
      const z = depth(x, y);
      ring.push(mesh.add(x + cx, y + cy, z + cz, skinAt(x + cx, y + cy, z + cz)));
    }
    steps.push(ring);
  }
  mesh.zip(hole, steps[0]!, mx, my);
  mesh.zip(steps[0]!, steps[1]!, mx, my);
  mesh.zip(steps[1]!, rings[0]!, mx, my);
  for (let r = 0; r + 1 < rings.length; r++) mesh.strip(rings[r]!, rings[r + 1]!);
  mesh.strip(rings[rings.length - 1]!, back);
  for (let k = 0; k < ROUND; k++) mesh.tri(back[k]!, back[(k + 1) % ROUND]!, far);
}

/** How far the lips part along the mouth as the jaw opens: all the way at the middle, not at all at the corners. */
const parting = (t: number) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 2.2)), 0.75);
/** Below (or above) the line of the lips, how far until the skin goes all the way with the jaw (or stays). */
const REACH = 0.012;

/**
 * How much of the jaw's swing a point of the face at (x, y) in the head's frame takes: below the line of the lips
 * all of it and above it none where the lips part widest, at the middle; towards the corners the two lips keep
 * closer together, and the corners themselves and the cheeks beside them go half the way, the skin under them
 * more and the skin over them less. So an open mouth is a long oval, not a slot.
 */
export function jawShare(x: number, y: number, face: FaceSpec): number {
  const f = mouthForm(face);
  const lx = x - HEAD_CENTRE[0], ly = y - HEAD_CENTRE[1];
  const below = f.line(clamp(lx, -f.parts, f.parts)) - ly;
  const apart = parting(lx / f.parts);
  const far = smooth(0, REACH, Math.abs(below));
  return 0.5 + 0.5 * Math.sign(below) * (apart + (1 - apart) * far);
}

/**
 * How an opening jaw draws a point beside a corner of the mouth in towards the middle (metres at the jaw's
 * fullest, along x): the corners come in a little, so an open mouth is rounder than a closed one is long.
 */
export function cornerPull(x: number, y: number, face: FaceSpec): number {
  const f = mouthForm(face);
  const lx = x - HEAD_CENTRE[0], ly = y - HEAD_CENTRE[1];
  const side = Math.sign(lx);
  const dx = Math.abs(lx) - f.half, dy = ly - f.line(side * f.half);
  return -side * 0.0016 * Math.exp(-((dx / 0.0075) ** 2) - (dy / 0.0085) ** 2);
}

/**
 * The upper teeth: a band behind the upper lip, out of sight while the mouth is closed (it lies over the roof of
 * the dark behind the lips); as the jaw opens its lower edge comes down into view (`teethShow`: tagged `teeth`).
 */
export function addTeeth(sc: Sculpt, face: FaceSpec): void {
  const f = mouthForm(face);
  const [cx, cy, cz] = HEAD_CENTRE;
  const n = 13;
  sc.tagged("teeth", () =>
    sc.sheet(
      n,
      2,
      (i, j) => {
        const t = ((i / (n - 1)) * 2 - 1) * TEETH_SPAN;
        const x = t * f.parts, y = f.line(x) + (j === 0 ? TEETH_REST + 0.0004 : TEETH_REST);
        // the arch of the teeth: back towards the sides
        return [x + cx, y + cy, faceDepth(x, f.line(x), face) - 0.002 - 0.002 * t * t + cz];
      },
      (x, y) => {
        const t = (x - cx) / f.parts;
        // in the shade of the upper lip at the top, and towards the sides
        const top = y - cy - f.line(x - cx) > TEETH_REST + 0.0002;
        return { rgb: shade(TOOTH, (top ? 0.62 : 1) * (1 - 0.3 * t * t)), gloss: 0.5, glow: 0.12 };
      },
      { flip: true },
    ),
  );
}

/** Across how much of the mouth's opening the teeth show, and how far over the line of the lips their edge rests. */
const TEETH_SPAN = 0.8;
const TEETH_REST = 0.0009;

/** How far down an open jaw (at its fullest) shows a point of the teeth at (x, y): their lower edge, least at the sides. */
export function teethShow(x: number, y: number, face: FaceSpec): number {
  const f = mouthForm(face);
  const lx = x - HEAD_CENTRE[0], ly = y - HEAD_CENTRE[1];
  if (ly - f.line(lx) > TEETH_REST + 0.0002) return 0;
  const t = lx / f.parts;
  return -0.0036 * (1 - 0.45 * t * t);
}

/** The nostrils: under the tip of the nose, two soft shadows that fade into the skin (no holes, no outline). */
export function addNostrils(sc: Sculpt, face: FaceSpec, skinAt: (x: number, y: number, z: number) => Paint): void {
  const e = featureHeights(face).eye;
  const [cx, cy, cz] = HEAD_CENTRE;
  const size = 1 - 0.4 * face.young;
  for (const side of [-1, 1]) {
    const n = 7, m = 5;
    sc.sheet(
      n,
      m,
      (i, j) => {
        const a = (i / (n - 1)) * 2 - 1, b = (j / (m - 1)) * 2 - 1;
        // a short crescent slanting up to the outside, following the rim of the wing
        const lx = (0.0061 + a * 0.0028) * size, ly = e - 0.0403 * size - 0.0006 * (1 - size) + (a * 0.0007 + b * 0.0012 - 0.0006 * a * a) * size;
        const x = side * lx, y = ly;
        const nrm = faceNormal(x, y, face);
        return [x + nrm.x * 0.0005 + cx, y + nrm.y * 0.0005 + cy, faceDepth(x, y, face) + nrm.z * 0.0005 + cz];
      },
      (x, y, z) => {
        const a = (Math.abs(x - cx) / size - 0.0061) / 0.0028;
        const b = (y - cy - (e - 0.0403 * size - 0.0006 * (1 - size)) - (a * 0.0007 - 0.0006 * a * a) * size) / (0.0012 * size);
        const base = skinAt(x, y, z);
        const inside = Math.max(0, 1 - a * a) * Math.max(0, 1 - b * b);
        return { rgb: shade(base.rgb, 1 - 0.58 * Math.pow(inside, 0.8)), gloss: 0.05, glow: base.glow };
      },
      { flip: side < 0 },
    );
  }
}
