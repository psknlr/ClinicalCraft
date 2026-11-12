/**
 * The eyes of a face, and what frames them. An eye is an almond a little longer than the eyeball is wide, its
 * outer corner a touch higher than its inner, the upper lid's highest point towards the nose and the lower lid's
 * lowest towards the temple. The lids are the face's own skin (`addEyeSkin`: rings from the opening cut in the
 * head's grid in to the fold over the upper lid, the lid itself, its edge and the rim behind it), so they shade
 * as skin and a blink is the lid coming down over the eye. Behind them is the eye's own surface (`addEye`): the
 * white, shaded under the upper lid and pink at the inner corner; the iris with a dark rim, lighter towards the
 * pupil and in its lower half, where light comes through; two catchlights, on the same side in both eyes. On the
 * upper lid's edge a line of lashes, heavier towards the outer corner and running a little beyond it; under the
 * outer half of the lower lid a faint one. Over each eye a soft straight brow whose edges fade into the skin.
 *
 * A woman's eyes are larger and more open — the upper lid over the top of a large iris, a little fullness under
 * the lower lid — under finer, lighter brows, with fuller lashes that run on beyond the outer corner; a man's are
 * a little narrower under fuller, lower brows, his lashes a fine line (`leaning`, `skull.ts`).
 *
 * Everything is given for the eye on +X (the figure's left) and mirrored for the other; `u` runs along an eye from
 * −1 at its inner corner to 1 at its outer one.
 */
import { leaves, type Outline, type Patchwork } from "./face-mesh.js";
import { mix, rgb, shade, type Paint, type Rgb, type Sculpt, type V3 } from "./sculpt.js";
import { EYE_X, HEAD_CENTRE, SKIN_GLOW, SOCKET, faceDepth, faceNormal, featureHeights, leaning, remembered, type FaceSpec } from "./skull.js";

/** The shape of an eye (the one on +X): heights are above the head's centre, depths in front of it. */
export interface EyeForm {
  /** Its middle across, the height of the eye line, and half its length. */
  x: number;
  e: number;
  half: number;
  /** The line through its corners, the edge of the upper lid, of the lower lid, and the fold over the upper lid. */
  line: (u: number) => number;
  upper: (u: number) => number;
  lower: (u: number) => number;
  fold: (u: number) => number;
  /** The eye's own surface at (x, y), and how thick a lid is over it. */
  ball: (x: number, y: number) => number;
  thick: (u: number) => number;
  /** The iris: its middle and its radius. */
  iris: readonly [number, number, number];
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const eyeForms = new Map<string, EyeForm>();
const eyeFormOf = new WeakMap<FaceSpec, EyeForm>();

/** The eye of a face (the young have rounder ones, a little closer set in their smaller faces). */
export function eyeForm(face: FaceSpec): EyeForm {
  let form = eyeFormOf.get(face);
  if (!form) eyeFormOf.set(face, (form = remembered(eyeForms, face, () => shapeEye(face))));
  return form;
}

function shapeEye(face: FaceSpec): EyeForm {
  const e = featureHeights(face).eye;
  // (a woman's eyes are larger and more open, a man's a little narrower)
  const lean = leaning(face);
  const half = 0.0172 - 0.0014 * face.young + 0.0006 * lean;
  const up = 0.008 + 0.0006 * face.young + (lean > 0 ? 0.0009 : 0.0006) * lean, down = 0.0052 + 0.0003 * face.young + 0.0004 * lean;
  const line = (u: number) => e + 0.00035 + 0.00085 * u;
  const upper = (u: number) => {
    const w = clamp(u + 0.12 * (1 - u * u), -1, 1);
    return line(u) + up * Math.pow(1 - Math.pow(Math.abs(w), 2.2), 0.9);
  };
  const lower = (u: number) => {
    const w = clamp(u - 0.18 * (1 - u * u), -1, 1);
    return line(u) - down * Math.pow(1 - w * w, 0.85);
  };
  // the fold: close over the lid at the inner corner, opening to its full height over the middle and running on level
  const fold = (u: number) => upper(u) + (0.003 - 0.0008 * face.young) * (0.3 + 0.7 * smooth(-1, -0.3, u)) * (1 - 0.08 * smooth(0.6, 1, u));
  // the front of the eye stands a millimetre behind where the face would be without its hollow
  const apex = faceDepth(EYE_X, e, face) + SOCKET * 0.975 - 0.001;
  const ball = (x: number, y: number) => {
    const dx = x - EYE_X, dy = y - (e + 0.0005);
    // an eye's surface falls away faster towards the temple than towards the nose
    return apex - ((dx < 0 ? 0.0052 : 0.0098) / (half * half)) * dx * dx - 41 * dy * dy;
  };
  // (the young have large irises in their rounder eyes; the upper lid always covers the top of one)
  // (a woman's irises are large and sit a little higher: the lid covers their top, the lower lid just cuts them)
  const r = 0.0074 + 0.0003 * face.young + (lean > 0 ? 0.0006 : 0.00035) * lean;
  return { x: EYE_X, e, half, line, upper, lower, fold, ball, thick: (u) => 0.001 * (1 - 0.65 * u * u * u * u), iris: [EYE_X, e + 0.0012 + 0.0004 * face.young + 0.0008 * Math.max(0, lean), r] };
}

/** How many points go round an eye, and where each lies: along the lower lid from the inner corner out, back along the upper. */
const ROUND = 44;
function around(): { u: number; upper: boolean; corner: boolean }[] {
  const half = ROUND / 2;
  return Array.from({ length: ROUND }, (_, k) => (k < half ? { u: -Math.cos((Math.PI * k) / half), upper: false, corner: k === 0 } : { u: Math.cos((Math.PI * (k - half)) / half), upper: true, corner: k === half }));
}

const PINK = rgb("#e7a29c");
const SHADOW = rgb("#b98a80");

/**
 * The skin round one eye, into `mesh`: from `hole` — the loop of the head's grid round the opening cut for it,
 * counter-clockwise seen from in front — in to the lids and the rim behind their edges. The upper lid's points
 * are added `late` (a blink moves them). `side`: 1 the figure's left eye, −1 its right.
 */
export function addEyeSkin(mesh: Patchwork, hole: readonly number[], side: 1 | -1, face: FaceSpec, skinAt: (x: number, y: number, z: number) => Paint): void {
  const f = eyeForm(face);
  const [cx, cy, cz] = HEAD_CENTRE;
  const depth = (x: number, y: number) => faceDepth(x, y, face);
  const where = around();
  const woman = Math.max(0, leaning(face));
  type Ring = (u: number, upper: boolean, corner: boolean) => V3;
  const xAt = (u: number, k = 1) => f.x + f.half * u * k;
  // the lids' edge: the outline of the open eye, on the eye's surface
  const margin: Ring = (u, upper) => {
    const x = xAt(u), y = upper ? f.upper(u) : f.lower(u);
    return [x, y, f.ball(x, y) + f.thick(u)];
  };
  // the rim behind the edge, down to the eye
  const rim: Ring = (u, upper) => {
    const x = xAt(u, 0.955), y = (upper ? f.upper(u) : f.lower(u)) + (upper ? -1 : 1) * 0.00055 * (1 - u * u * u * u);
    return [x, y, f.ball(x, y) + 0.00008];
  };
  // the lid: over the eye half-way up to the fold; under the eye the soft fullness below the lower lid
  const lid: Ring = (u, upper, corner) => {
    if (corner) {
      const x = xAt(u, 1.05), y = f.line(u) + (u < 0 ? -0.0002 : 0.0003);
      return [x, y, 0.5 * (f.ball(x, y) + 0.0003) + 0.5 * depth(x, y)];
    }
    if (upper) {
      const x = xAt(u), y = f.upper(u) + 0.5 * (f.fold(u) - f.upper(u));
      return [x, y, f.ball(x, y) + f.thick(u) * 1.05];
    }
    // (under a woman's eye the lid is a little full: it makes the eye look larger and the face younger)
    const x = xAt(u), y = f.lower(u) - 0.0017 * (1 - 0.5 * u * u * u * u);
    return [x, y, 0.7 * (f.ball(x, y) + f.thick(u)) + 0.3 * depth(x, y) + (0.0003 + 0.0008 * woman) * (1 - u * u)];
  };
  // the fold over the upper lid (a groove), and the line under the eye where its fullness ends
  const fold: Ring = (u, upper, corner) => {
    if (corner) {
      const x = xAt(u, 1.11), y = f.line(u) + (u < 0 ? -0.0003 : 0.0006);
      return [x, y, 0.15 * (f.ball(x, y) + 0.0003) + 0.85 * depth(x, y)];
    }
    if (upper) {
      const x = xAt(u, 1.03), y = f.fold(u);
      return [x, y, f.ball(x, y) + f.thick(u) - 0.00045];
    }
    const x = xAt(u), y = f.lower(u) - 0.0042 * (1 - 0.4 * u * u * u * u);
    return [x, y, depth(x, y) + 0.0002 * (1 - u * u)];
  };
  const tone = (p: V3): Paint => skinAt(side * p[0] + cx, p[1] + cy, p[2] + cz);
  const tint = (p: V3, k: number, towards: Rgb = SHADOW, by = 0): Paint => {
    const base = tone(p);
    return { ...base, rgb: mix(shade(base.rgb, k), towards, by) };
  };
  // between two rings: over the eye the upper lid's own surface (so that, shut, it lies round the eye), elsewhere half-way
  const between = (a: Ring, b: Ring, q: number): Ring => (u, upper, corner) => {
    if (upper && !corner) {
      const x = xAt(u), y = f.fold(u) + (f.upper(u) - f.fold(u)) * q;
      return [x, y, f.ball(x, y) + f.thick(u) * 1.05];
    }
    const p = a(u, upper, corner), r = b(u, upper, corner);
    return [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2, (p[2] + r[2]) / 2];
  };
  // the mirrored eye runs the other way round: its rings are laid in reverse, so every loop stays counter-clockwise
  const order = side > 0 ? where : [...where].reverse();
  const loop = (ring: Ring, paintOf: (p: V3, u: number, upper: boolean, corner: boolean) => Paint, moves: boolean): number[] =>
    order.map(({ u, upper, corner }) => {
      const p = ring(u, upper, corner);
      return mesh.add(side * p[0] + cx, p[1] + cy, p[2] + cz, paintOf(p, u, upper, corner), moves && upper && !corner);
    });
  const lidTone = (p: V3, _u: number, upper: boolean, corner: boolean): Paint => (corner ? tint(p, 0.95) : upper ? tint(p, 0.95, SHADOW, 0.07) : tint(p, 1.045 + 0.035 * woman));
  const folds = loop(fold, (p, u, upper, corner) => (upper && !corner ? tint(p, 0.84, SHADOW, 0.12) : tint(p, 0.985 - (corner ? 0 : 0.035 * woman * (1 - u * u)))), false);
  const high = loop(between(fold, lid, 0.25), (p, _u, upper, corner) => (upper && !corner ? tint(p, 0.92, SHADOW, 0.08) : tint(p, 1.015)), true);
  const lids = loop(lid, lidTone, true);
  const low = loop(between(lid, margin, 0.75), (p, u, upper, corner) => (upper && !corner ? tint(p, 0.93, SHADOW, 0.08) : corner ? tint(p, 0.95) : tint(p, 1.0 - 0.02 * smooth(0, 1, u))), true);
  const edges = loop(margin, (p, u, upper) => (upper ? tint(p, 0.78, SHADOW, 0.1) : tint(p, 0.93 - 0.05 * smooth(0, 1, u), PINK, 0.12)), true);
  const rims = loop(rim, (p, _u, upper) => (upper ? tint(p, 0.55, PINK, 0.2) : tint(p, 0.86, PINK, 0.3)), true);
  // between the grid's opening and the fold: plain skin, half-way
  const ex = side * f.x + cx, ey = f.e + 0.0008 + cy;
  const outer: Outline = hole.map((h) => {
    const p = mesh.at(h);
    return [p[0], p[1]];
  });
  const inner: Outline = folds.map((h) => {
    const p = mesh.at(h);
    return [p[0], p[1]];
  });
  const steps: number[][] = [];
  for (const [part, count] of [[0.34, 36], [0.72, 42]] as const) {
    const ring: number[] = [];
    for (let k = 0; k < count; k++) {
      const theta = -Math.PI + ((k + 0.5) / count) * Math.PI * 2;
      const a = leaves(outer, ex, ey, theta), b = leaves(inner, ex, ey, theta);
      const x = a[0] * (1 - part) + b[0] * part - cx, y = a[1] * (1 - part) + b[1] * part - cy;
      const z = depth(side * x, y);
      ring.push(mesh.add(x + cx, y + cy, z + cz, skinAt(x + cx, y + cy, z + cz)));
    }
    steps.push(ring);
  }
  mesh.zip(hole, steps[0]!, ex, ey);
  mesh.zip(steps[0]!, steps[1]!, ex, ey);
  mesh.zip(steps[1]!, folds, ex, ey);
  mesh.strip(folds, high);
  mesh.strip(high, lids);
  mesh.strip(lids, low);
  mesh.strip(low, edges);
  mesh.strip(edges, rims);
}

/** The eye behind the lids, its lashes and its brow (see the module doc). `hair`: what lashes and brows take their colour from. */
export function addEye(sc: Sculpt, side: 1 | -1, face: FaceSpec, tones: { skin: Rgb; hair: Rgb; iris: Rgb }, skinAt: (x: number, y: number, z: number) => Paint): void {
  const f = eyeForm(face);
  const [cx, cy, cz] = HEAD_CENTRE;
  const put = (x: number, y: number, z: number): V3 => [side * x + cx, y + cy, z + cz];

  /* ---------------- the white ---------------- */
  const white = rgb("#ece8e2");
  const nu = 17, nv = 9;
  sc.sheet(
    nu,
    nv,
    (i, j) => {
      const u = (i / (nu - 1)) * 2.1 - 1.05, v = j / (nv - 1);
      const uu = clamp(u, -1, 1);
      const lo = f.lower(uu) - 0.0012, hi = f.upper(uu) + 0.0012;
      const x = f.x + f.half * u, y = lo + (hi - lo) * v;
      return put(x, y, f.ball(x, y));
    },
    (x, y) => {
      const lx = (side * (x - cx) - f.x) / f.half, ly = y - cy;
      // in the shade of the upper lid and towards the corners; pink flesh in the inner corner
      const under = smooth(f.upper(clamp(lx, -1, 1)) - 0.0042, f.upper(clamp(lx, -1, 1)) + 0.0004, ly);
      let c = shade(white, 1 - 0.3 * under - 0.1 * lx * lx);
      c = mix(c, PINK, 0.75 * smooth(-0.8, -1, lx));
      return { rgb: c, gloss: 0.8, glow: 0.1 };
    },
    { flip: side < 0 },
  );

  /* ---------------- iris, pupil, catchlights ---------------- */
  const [ix, iy, r] = f.iris;
  const seg = 20;
  const rings = [0.33, 0.38, 0.52, 0.7, 0.86, 0.96, 1, 1.07];
  const points: number[] = [], paints: Paint[] = [], tris: number[] = [];
  const black: Rgb = [0.006, 0.006, 0.008];
  const colourAt = (k: number, dy: number): Paint => {
    const base = tones.iris;
    // lighter round the pupil, a dark rim; darker under the lid, lit from below
    const radial = [black, mix(base, [1, 0.7, 0.42], 0.1), shade(base, 1.2), base, shade(base, 0.8), shade(base, 0.42), shade(base, 0.32), mix(shade(base, 0.32), shade(white, 0.86), 0.6)][k]!;
    const lit = k === 0 ? 1 : 0.72 + 0.5 * clamp(0.5 - dy / (2 * r), 0, 1);
    return { rgb: shade(radial, lit), gloss: 0.9, glow: k === 0 ? 0 : 0.16 };
  };
  const dome = (q: number) => 0.00055 * Math.max(0, 1 - q * q) + 0.00013;
  points.push(...put(ix, iy, f.ball(ix, iy) + dome(0)));
  paints.push({ rgb: black, gloss: 0.95 });
  rings.forEach((q, k) => {
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const x = ix + Math.cos(a) * r * q, y = iy + Math.sin(a) * r * q;
      points.push(...put(x, y, f.ball(x, y) + dome(q)));
      paints.push(colourAt(k, Math.sin(a) * r * q));
    }
  });
  const turn = (a: number, b: number, c: number) => (side > 0 ? tris.push(a, b, c) : tris.push(a, c, b));
  for (let j = 0; j < seg; j++) turn(0, 1 + j, 1 + ((j + 1) % seg));
  for (let k = 0; k + 1 < rings.length; k++) {
    for (let j = 0; j < seg; j++) {
      const a = 1 + k * seg + j, b = 1 + k * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
      turn(a, c, b);
      turn(b, c, d);
    }
  }
  sc.mesh(points, tris, paints);
  // the lights in the eye: a larger one up and to one side over the pupil's edge, a small one opposite — on the
  // same side in both eyes, as one light would put them
  const light = (dx: number, dy: number, rx: number, ry: number, glow: number): void => {
    const p: number[] = [], t: number[] = [];
    // (dx is across the face, not along the eye: the same way for both eyes)
    const lx = ix + side * dx, ly = iy + dy;
    const z = f.ball(lx, ly) + dome(Math.hypot(lx - ix, dy) / r) + 0.00016;
    p.push(...put(lx, ly, z));
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2;
      p.push(...put(lx + side * Math.cos(a) * rx, ly + Math.sin(a) * ry, z - 0.00003));
    }
    for (let j = 0; j < 10; j++) t.push(0, 1 + j, 1 + ((j + 1) % 10));
    sc.mesh(p, t, { rgb: [1, 1, 1], gloss: 1, glow });
  };
  light(-0.0023, 0.0028, 0.0017, 0.002, 0.8);
  light(0.0028, -0.003, 0.0008, 0.0008, 0.45);

  /* ---------------- lashes ---------------- */
  const dark: Rgb = mix(rgb("#16100d"), tones.hair, 0.22);
  const lean = leaning(face);
  const lashes = 1 + (lean > 0 ? 0.3 : 0.5) * lean;
  sc.tagged("lash", () => {
    const n = 26;
    sc.sheet(
      3,
      n,
      (i, j) => {
        // along the upper lid's edge, then on beyond the outer corner, rising a little and thinning to a point
        const s = j / (n - 1);
        // (a woman's run on a little further beyond the outer corner; a man's end at it)
        const u = -0.86 + s * (2.08 + (lean > 0 ? 0.08 : 0.18) * lean);
        const uu = Math.min(1, u), over = Math.max(0, u - 1);
        const x = f.x + f.half * (uu + over * 0.95), y0 = f.upper(uu) + over * f.half * 0.42;
        const full = Math.pow(Math.sin(Math.min(1, s * 1.9) * Math.PI * 0.5), 0.8) * (1 - smooth(0.82, 1, s));
        const heavy = 0.68 + 0.32 * smooth(-0.3, 0.9, u);
        const z0 = f.ball(x, y0) + f.thick(uu);
        // a wedge: its back on the lid just over the edge, its front out before the edge (the lashes' tips), its foot on the rim
        if (i === 0) return put(x, y0 + 0.0015 * full * heavy * lashes, z0 + 0.00014);
        if (i === 1) return put(x, y0 - 0.00025 * full, z0 + (0.0008 + 0.0012 * heavy) * full * lashes + 0.0001);
        return put(x, y0 - 0.00055 * full, z0 - 0.0006);
      },
      { rgb: dark, gloss: 0.12 },
      { flip: side < 0 },
    );
  });
  // under the outer half of the lower lid, barely there
  {
    const n = 12;
    sc.sheet(
      2,
      n,
      (i, j) => {
        const u = -0.15 + (j / (n - 1)) * 1.13;
        const x = f.x + f.half * u, y = f.lower(u);
        const z = f.ball(x, y) + f.thick(u) + 0.00008;
        return put(x, y - (i ? 0.00042 : -0.00006), z - (i ? 0.00004 : 0));
      },
      (x, y, z) => {
        const u = (side * (x - cx) - f.x) / f.half;
        const base = skinAt(x, y, z);
        return { rgb: mix(shade(base.rgb, 0.93), dark, 0.42 * clamp(1 + 0.8 * lean, 0.2, 1) * smooth(-0.15, 0.6, u) * (1 - smooth(0.9, 1, u))), gloss: 0.1, glow: base.glow };
      },
      { flip: side < 0 },
    );
  }

  /* ---------------- the brow ---------------- */
  // (a brow is a shade softer than the hair)
  // (a woman's brow is finer, lighter and a touch higher; a man's fuller, darker and lower over the eye)
  const browColour = mix(tones.hair, tones.skin, 0.03 + 0.07 * Math.max(0, lean));
  const soft = (1 - 0.3 * face.young) * (1 - (lean > 0 ? 0.14 : 0.28) * lean);
  const browAt = f.e + 0.0176 + (lean > 0 ? 0.0008 : 0.0016) * lean;
  const bn = 17, bm = 5;
  sc.sheet(
    bn,
    bm,
    (i, j) => {
      const t = i / (bn - 1), v = j / (bm - 1);
      const x = f.x - 0.019 + 0.0405 * t;
      // straight and soft: level from its head, the faintest rise, the tail turning down at the end
      const mid = browAt + 0.0014 * Math.sin(Math.min(1, t / 0.72) * Math.PI * 0.5) - 0.0036 * Math.pow(Math.max(0, t - 0.7) / 0.3, 1.6);
      const thick = (0.0033 * smooth(-0.12, 0.14, t) * (1 - 0.86 * Math.pow(Math.max(0, t - 0.42) / 0.58, 1.5)) + 0.00035) * soft;
      const y = mid + (0.5 - v) * 2 * thick;
      const n = faceNormal(x, y, face);
      const z = faceDepth(x, y, face);
      return put(x + n.x * 0.0006, y + n.y * 0.0006, z + n.z * 0.0006);
    },
    (x, y, z) => {
      const t = (side * (x - cx) - (f.x - 0.019)) / 0.0405;
      const base = skinAt(x, y, z);
      const mid = browAt + 0.0014 * Math.sin(Math.min(1, Math.max(0, t) / 0.72) * Math.PI * 0.5) - 0.0036 * Math.pow(Math.max(0, t - 0.7) / 0.3, 1.6);
      const thick = (0.0033 * smooth(-0.12, 0.14, t) * (1 - 0.86 * Math.pow(Math.max(0, t - 0.42) / 0.58, 1.5)) + 0.00035) * soft;
      // full along its middle, fading out to its edges, lighter at its head
      const across = 1 - Math.pow(Math.min(1, Math.abs(y - cy - mid) / thick), 4);
      const along = (0.7 + 0.3 * smooth(0, 0.22, t)) * (1 - 0.2 * smooth(0.75, 1, t));
      return { rgb: mix(base.rgb, browColour, Math.max(0, across) * along), gloss: 0.05, glow: base.glow };
    },
    { flip: side > 0 },
  );
}

/** How a blink moves a point: to where it is with the eye shut, and what the straight way there misses half-way. */
export interface Blink {
  shut: V3;
  round: V3;
}

/**
 * How a blink moves a point of an upper lid at (x, y, z) in the head's frame: the lid's edge comes down round the
 * eye to the lower lid's and a hair over it; the fold over the lid stays where it is, and what lies between goes
 * its share of the way — every point keeping its own height over the eye. A `lash` goes with the edge it stands
 * on. A point's way is a curve (round the eye): `shut` is the whole move, `round` how far the middle of the way
 * lies from the middle of the straight line (a move of its own, at its fullest half-way: `head.ts`).
 */
export function blinkOf(x: number, y: number, z: number, face: FaceSpec, lash = false): Blink {
  const f = eyeForm(face);
  const side = x < HEAD_CENTRE[0] ? -1 : 1;
  const lx = side * (x - HEAD_CENTRE[0]), ly = y - HEAD_CENTRE[1], lz = z - HEAD_CENTRE[2];
  const u = clamp((lx - f.x) / f.half, -1, 1);
  const edge = f.upper(u), top = f.fold(u), meet = f.lower(u);
  const w = lash ? 1 : clamp(1 - (ly - edge) / Math.max(1e-5, top - edge), 0, 1);
  const travel = (edge - meet + 0.0002) * w;
  // (a lash keeps its place on the edge: it is the edge's way it goes)
  const from = lash ? edge : ly;
  // the lid's outer face clears the dome of the iris as it passes; the rim under its edge stays on the eye
  const outer = lash ? 1 : clamp((lz - f.ball(lx, ly)) / f.thick(u), 0, 1);
  const depth = (b: number) => lz + f.ball(lx, from - travel * b) - f.ball(lx, from) + 0.0006 * outer * (1 - u * u) * Math.sin(b * w * Math.PI * 0.5);
  const end = depth(1);
  return { shut: [0, -travel, end - lz], round: [0, 0, depth(0.5) - (lz + end) / 2] };
}
