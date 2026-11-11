/**
 * The head of a figure in its own frame — the origin is the joint it turns about (the top of the neck), +Y up,
 * +Z the face. One smooth surface carries the skull, the jaw line, the brow, the eye sockets, the nose, the
 * mouth and the chin (finer where the face is); eyes, lids, brows, lips and ears are parts on it. Vertices that
 * follow the jaw when it opens are tagged `jaw`, the upper lids `lid` (`faceMorphs`).
 */
import { BufferAttribute, Vector3, type BufferGeometry } from "three";
import { curve } from "./body.js";
import { mix, rgb, shade, type Paint, type Ranges, type Rgb, type Sculpt, type Station, type V3 } from "./sculpt.js";

/** The centre of the head above the joint, and its half-sizes. */
export const HEAD_CENTRE: V3 = [0, 0.061, 0.012];
const HALF = { x: 0.0745, y: 0.114, down: 0.107, front: 0.092, back: 0.1035 };
/** Heights on the face, from the centre of the head: the eyes, the brows, the mouth. */
export const EYE_Y = 0.004;
export const EYE_X = 0.0315;
export const MOUTH_Y = -0.06;
const BROW_Y = EYE_Y + 0.0168;
/** The eye: half its width, how far the upper lid opens above the corner line, the height of the fold over the lid. */
const EYE_HALF = 0.0158;
/** The soft light skin keeps in shade (`Paint.glow`). */
export const SKIN_GLOW = 0.12;
const LID_FOLD = 0.0036;
const eyeOpen = (face: FaceSpec) => 0.0061 - 0.0002 * face.young;
/** How far the jaw swings open at its fullest (radians about the joint in front of the ear). */
const JAW_SWING = 0.075;

export interface FaceSpec {
  /** 0 an adult … 1 an infant. */
  young: number;
  /** Width of the face (a heavy build's is fuller). */
  wide: number;
}

const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A point of the head's surface: `theta` round the head from the face towards the figure's left, `phi` from the
 * crown down (radians). In the head's frame.
 */
export function skullPoint(theta: number, phi: number, face: FaceSpec): Vector3 {
  const sp = Math.sin(phi);
  const dx = sp * Math.sin(theta), dy = Math.cos(phi), dz = sp * Math.cos(theta);
  const n = 2.25;
  const c = dz >= 0 ? HALF.front : HALF.back;
  const r = 1 / Math.pow(Math.pow(Math.abs(dx) / HALF.x, n) + Math.pow(Math.abs(dy) / (dy >= 0 ? HALF.y : HALF.down), n) + Math.pow(Math.abs(dz) / c, n), 1 / n);
  let x = dx * r, y = dy * r, z = dz * r;
  const young = face.young;
  // the cranium of the young is large over a small face
  if (y > 0) {
    x *= 1 + 0.05 * young;
    z *= 1 + 0.04 * young;
  }
  // the jaw narrows to the chin
  // the jaw: in from the cheekbones in a soft line to a small, rounded chin
  const taper = (0.27 - 0.1 * young) / (0.75 + 0.25 * face.wide * face.wide);
  x *= (1 - taper * Math.min(1, Math.max(0, (-0.01 - y) / 0.093)) - 0.1 * smooth(-0.086, -0.106, y)) * (1 + (face.wide - 1) * 0.45 * smooth(0.05, -0.05, y));
  // under the jaw: flat from behind the chin back and up to the nape, where the neck comes in
  const floor = -0.058 - (0.052 - 0.008 * young) * smooth(-0.028, 0.036, z);
  if (y < floor + 0.012) {
    // eased into the flat, so the line of the jaw is soft
    const over = floor + 0.012 - y;
    y = floor + 0.012 - 0.012 * (1 - Math.exp(-over / 0.012)) - Math.max(0, over - 0.012) * 0.06;
  }
  // the face: brow, sockets, nose, mouth, chin (out of the surface towards +Z)
  const w = smooth(0.015, 0.055, z);
  if (w > 0) {
    const e = EYE_Y - 0.012 * young, m = MOUTH_Y + 0.006 * young;
    const nose = 1 - 0.45 * young;
    let d = 0;
    for (const s of [-1, 1]) {
      d += -0.0062 * gauss(x, y, s * EYE_X, e + 0.002, 0.0135, 0.0085);
      d += 0.0034 * (1 - 0.6 * young) * gauss(x, y, s * 0.03, e + 0.0205, 0.02, 0.007);
      d += 0.005 * nose * gauss(x, y, s * 0.0115, e - 0.0372, 0.0058, 0.0052);
      // the soft fullness just under the eye
      d += 0.0011 * gauss(x, y, s * EYE_X, e - 0.0098, 0.011, 0.0032);
      d += (0.0052 + 0.004 * young + 0.003 * (face.wide - 1)) * gauss(x, y, s * 0.041, e - 0.036, 0.022, 0.026);
      d += -0.0025 * gauss(x, y, s * 0.068, e + 0.03, 0.012, 0.02);
    }
    d += 0.0075 * nose * gauss(x, y, 0, e + 0.004, 0.007, 0.018);
    d += 0.0175 * nose * gauss(x, y, 0, e - 0.023, 0.0078, 0.013);
    d += 0.0098 * nose * gauss(x, y, 0, e - 0.0335, 0.0074, 0.0063);
    d += -0.002 * gauss(x, y, 0, m + 0.017, 0.006, 0.005);
    d += 0.0045 * gauss(x, y, 0, m, 0.022, 0.013);
    d += -0.003 * gauss(x, y, 0, m - 0.016, 0.014, 0.006);
    d += (0.0065 - 0.003 * young) * gauss(x, y, 0, m - 0.031, 0.019, 0.012);
    z += d * w;
  }
  return new Vector3(x + HEAD_CENTRE[0], y + HEAD_CENTRE[1], z + HEAD_CENTRE[2]);
}

/** Columns crowd towards the face, rows towards the features. */
const NU = 50, NV = 34;
function thetaAt(i: number): number {
  const u = (i / NU) * Math.PI * 2 - Math.PI;
  return u - 0.5 * Math.sin(u);
}
const PHI = curve([
  [0, 0],
  [0.2, 0.9],
  [0.36, 1.32],
  [0.86, 2.42],
  [1, Math.PI],
]);
function phiAt(j: number): number {
  return PHI(j / NV)[0]!;
}

/** The polar angle at which the head's surface is `y` above its centre, round at `theta`. */
export function phiOfHeight(theta: number, y: number, face: FaceSpec): number {
  let lo = 0.02, hi = Math.PI * 0.8;
  for (let k = 0; k < 22; k++) {
    const mid = (lo + hi) / 2;
    if (skullPoint(theta, mid, face).y - HEAD_CENTRE[1] > y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The hairline round the head: height above the head's centre by the angle from the face (degrees, either side). */
const HAIRLINE = curve([
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
  return HAIRLINE((a * 180) / Math.PI)[0]! + 0.004 * face.young;
}

export interface HeadPaint {
  skin: Rgb;
  hair: Rgb;
  /** Whether the scalp above the hairline is painted as hair (anything but a bald head). */
  scalp: boolean;
  /** Eye colour. */
  iris: Rgb;
}

const ROSE = rgb("#c9666a");
const PEACH = rgb("#f29b8c");
const LIP = rgb("#c95a63");

/** The head surface and the face on it; returns where a point of the face is (`faceZ`). */
export function addHead(sc: Sculpt, face: FaceSpec, paint: HeadPaint, opts: { ears?: boolean } = {}): { faceZ: (x: number, y: number) => number } {
  const pts: Vector3[][] = [];
  for (let j = 0; j <= NV; j++) {
    const row: Vector3[] = [];
    for (let i = 0; i < NU; i++) row.push(skullPoint(thetaAt(i), phiAt(j), face));
    pts.push(row);
  }
  const e = EYE_Y - 0.012 * face.young, m = MOUTH_Y + 0.006 * face.young;
  const scalp = shade(paint.hair, 0.82);
  const skinAt = (x: number, y: number, z: number): Paint => {
    const lx = x - HEAD_CENTRE[0], ly = y - HEAD_CENTRE[1], lz = z - HEAD_CENTRE[2];
    let c: Rgb = paint.skin;
    if (lz > 0) {
      // a peach blush high on the cheeks, a touch of it on the tip of the nose
      const blush = 0.2 * (gauss(lx, ly, 0.04, e - 0.028, 0.018, 0.013) + gauss(lx, ly, -0.04, e - 0.028, 0.018, 0.013)) + 0.06 * gauss(lx, ly, 0, e - 0.034, 0.009, 0.008);
      c = mix(c, PEACH, Math.min(0.3, blush));
      c = shade(c, 1 + 0.05 * (gauss(lx, ly, EYE_X, e - 0.0098, 0.011, 0.0035) + gauss(lx, ly, -EYE_X, e - 0.0098, 0.011, 0.0035)));
      // the nose: light along its bridge, a soft shade down either side
      c = shade(c, 1 + 0.045 * gauss(lx, ly, 0, e - 0.016, 0.0032, 0.017) - 0.06 * (gauss(lx, ly, 0.0095, e - 0.014, 0.0035, 0.016) + gauss(lx, ly, -0.0095, e - 0.014, 0.0035, 0.016)));
      const dark = 0.1 * (gauss(lx, ly, EYE_X, e + 0.004, 0.014, 0.008) + gauss(lx, ly, -EYE_X, e + 0.004, 0.014, 0.008)) + 0.1 * gauss(lx, ly, 0, m + 0.019, 0.011, 0.004) + 0.07 * gauss(lx, ly, 0, m - 0.016, 0.014, 0.005);
      c = shade(c, 1 - Math.min(0.2, dark));
    }
    // under the jaw the light does not reach
    if (ly < -0.085 && lz < 0.06) c = shade(c, 0.9);
    if (paint.scalp) {
      const line = hairlineAt(Math.atan2(lx, lz), face);
      const t = smooth(line - 0.004, line + 0.005, ly);
      if (t > 0) c = mix(c, scalp, t);
    }
    return { rgb: c, gloss: 0.18, glow: SKIN_GLOW };
  };
  sc.tagged("jaw", () => {
    sc.tagged("skin", () => {
      // rings run crown to chin, round from the back by the figure's right to the face: faces look outward
      const rings = pts.slice(1, NV).map((row) => row.flatMap((p) => [p.x, p.y, p.z]));
      const top = pts[0]![0]!, bottom = pts[NV]![0]!;
      sc.rings(rings, NU, skinAt, { startPole: [top.x, top.y, top.z], endPole: [bottom.x, bottom.y, bottom.z] });
    });
  });
  // the face surface where a part sits: nearest grid points, weighted
  const front = pts.flat().filter((p) => p.z > HEAD_CENTRE[2] + 0.02);
  const faceZ = (x: number, y: number): number => {
    const ax = x + HEAD_CENTRE[0], ay = y + HEAD_CENTRE[1];
    let sw = 0, sz = 0;
    for (const p of front) {
      const d2 = (p.x - ax) ** 2 + (p.y - ay) ** 2;
      if (d2 > 0.00012) continue;
      const w = 1 / (d2 + 2e-6) ** 2;
      sw += w;
      sz += w * p.z;
    }
    return sw > 0 ? sz / sw - HEAD_CENTRE[2] : HALF.front;
  };
  const at = (x: number, y: number, proud = 0): V3 => [x + HEAD_CENTRE[0], y + HEAD_CENTRE[1], faceZ(x, y) + HEAD_CENTRE[2] + proud];

  /* ---------------- eyes ---------------- */
  const white: Rgb = rgb("#ecebe6");
  const lash: Paint = { rgb: mix(rgb("#17110e"), paint.hair, 0.25), gloss: 0 };
  const lidSkin: Paint = { rgb: shade(paint.skin, 0.92), gloss: 0.14, glow: SKIN_GLOW };
  const open = eyeOpen(face), half = EYE_HALF;
  for (const s of [-1, 1]) {
    const ex = s * EYE_X;
    const zc = faceZ(ex, e) + HEAD_CENTRE[2];
    // the outer corner sits a little higher and further back than the inner
    const edge = (u: number, upper: boolean): V3 => {
      const out = u * s; // + towards the temple
      const h = (upper ? 1 : -0.76) * open * Math.pow(Math.max(0, 1 - u * u), 0.62);
      return [ex + u * half + HEAD_CENTRE[0], e + h + 0.0009 * out + HEAD_CENTRE[1], zc + 0.0042 * (1 - 0.75 * u * u) - 0.0016 * Math.max(0, out)];
    };
    // the white of the eye between the lids
    sc.sheet(
      9,
      5,
      (i, j) => {
        const u = (i / 8) * 2 - 1, v = j / 4;
        const lo = edge(u, false), hi = edge(u, true);
        return [lo[0] + (hi[0] - lo[0]) * v, lo[1] + (hi[1] - lo[1]) * v, lo[2] + (hi[2] - lo[2]) * v + 0.0009 * Math.sin(v * Math.PI) * (1 - u * u)];
      },
      (_x, y) => ({ rgb: shade(white, y - HEAD_CENTRE[1] - e > open * 0.35 ? 0.8 : 0.97), gloss: 0.75, glow: 0.16 }),
    );
    const iz = zc + 0.0042 + 0.0015;
    const iy = e + 0.0004 + HEAD_CENTRE[1];
    sc.disc([ex + HEAD_CENTRE[0], iy, iz], [0, 0, 1], 0.0063, { rgb: paint.iris, gloss: 0.8, glow: 0.1 }, 14);
    sc.disc([ex + HEAD_CENTRE[0], iy, iz + 0.0004], [0, 0, 1], 0.0026, { rgb: [0.004, 0.004, 0.005], gloss: 0.9 }, 8);
    sc.disc([ex + HEAD_CENTRE[0] + 0.0019, iy + 0.0021, iz + 0.0008], [0, 0, 1], 0.0013, { rgb: [1, 1, 1], gloss: 1, glow: 0.6 }, 6);
    // lids: the upper one a soft fold with the lash line under it, the lower one a faint rim
    const lidPts = (upper: boolean, n: number, lift: number, proud: number): V3[] => {
      const out: V3[] = [];
      for (let i = 0; i <= n; i++) {
        const u = (i / n) * 2.08 - 1.04;
        const p = edge(Math.max(-1, Math.min(1, u)), upper);
        out.push([ex + u * half + HEAD_CENTRE[0], p[1] + lift, p[2] + proud]);
      }
      return out;
    };
    sc.tagged("lid", () => {
      // the upper lid: from its edge up to the fold under the brow (it stretches down over the eye in a blink)
      sc.tagged("skin", () =>
        sc.sheet(
          9,
          3,
          (i, j) => {
            const u = (i / 8) * 2.08 - 1.04;
            const p = edge(Math.max(-1, Math.min(1, u)), true);
            const v = j / 2;
            return [ex + u * half + HEAD_CENTRE[0], p[1] - 0.0002 + LID_FOLD * v, p[2] + 0.0013 - 0.0034 * v * v];
          },
          lidSkin,
          { thickness: 0.0011 },
        ),
      );
      // the lash line, a little heavier towards the outer corner
      sc.sweep(lidPts(true, 8, -0.0003, 0.0018).map((p, i) => ({ p, rx: 0.0008 + 0.0005 * (s > 0 ? i / 8 : 1 - i / 8), rz: 0.0008 })), lash, { seg: 4 });
    });
    sc.tagged("skin", () => sc.tube(lidPts(false, 6, -0.0007, 0.0002), 0.001, lidSkin, { seg: 4 }));
    // brow
    const brow: Station[] = [];
    const browPaint: Paint = { rgb: mix(shade(paint.hair, 0.9), paint.skin, 0.06), gloss: 0 };
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const bx = (-0.013 + 0.034 * t) * s + ex;
      // a straight, soft brow: level from its head, the tail dipping only at the end
      const by = e + BROW_Y - EYE_Y + 0.002 * Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.6) - 0.0042 * Math.max(0, t - 0.7);
      const p = at(bx, by, 0.0009);
      brow.push({ p, rx: (0.0027 - 0.0014 * Math.max(0, t - 0.5) / 0.5 - 0.0008 * Math.max(0, 0.15 - t) / 0.15) * (1 - 0.35 * face.young), rz: 0.001 });
    }
    sc.sweep(brow, browPaint, { seg: 6, front: [0, 0, 1], dome: 0.8 });
  }

  /* ---------------- mouth ---------------- */
  // lips: the colour deepest at the middle and fading towards the corners
  const lipAt = (x: number, deep: number): Paint => ({ rgb: mix(paint.skin, LIP, (0.4 + 0.34 * Math.exp(-(((x - HEAD_CENTRE[0]) / 0.011) ** 2))) * deep), gloss: 0.42, glow: 0.1 });
  const mw = 0.0218 - 0.004 * face.young;
  const lipLine = (t: number): V3 => {
    // t: −1 … 1 across the mouth; the corners sit a touch back and turn up a little: a calm, kind face
    const x = t * mw;
    return at(x, m - 0.0003 + 0.0011 * t * t, 0.0004);
  };
  // the dark of the mouth, behind the lips (shows when the jaw drops)
  sc.sheet(7, 3, (i, j) => {
    const t = (i / 6) * 2 - 1;
    const p = lipLine(t * 0.86);
    return [p[0], p[1] + 0.0022 - j * 0.0058 * (1 - t * t * 0.8), p[2] - 0.0016];
  }, { rgb: rgb("#2a0f10"), gloss: 0.2 });
  const upper: Station[] = [], lower: Station[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = (i / 8) * 2 - 1;
    const p = lipLine(t);
    const full = Math.pow(1 - t * t, 0.75);
    const bow = 1 - 0.2 * gauss(t, 0, 0, 0, 0.16, 1);
    upper.push({ p: [p[0], p[1] + 0.0033 * full * bow, p[2] + 0.0006 * full], rx: 0.0031 * full * bow + 0.0003, rz: 0.0022 * full + 0.0004 });
    lower.push({ p: [p[0], p[1] - 0.0041 * full, p[2] + 0.0006 * full], rx: 0.0039 * full + 0.0003, rz: 0.0027 * full + 0.0004 });
  }
  sc.sweep(upper, (x) => lipAt(x, 1), { seg: 6, front: [0, 0, 1], dome: 0.6 });
  sc.tagged("jaw", () => sc.sweep(lower, (x) => lipAt(x, 1.08), { seg: 6, front: [0, 0, 1], dome: 0.6 }));

  /* ---------------- nostrils ---------------- */
  for (const s of [-1, 1]) {
    const p = at(s * 0.0062, e - 0.0408, -0.0012);
    sc.ball(p, 0.0031, 0.0015, 0.0022, { rgb: shade(paint.skin, 0.3), gloss: 0 }, 8, 4);
  }

  /* ---------------- ears ---------------- */
  for (const s of opts.ears === false ? [] : [-1, 1]) {
    const theta = s * 1.64;
    const base = skullPoint(theta, phiOfHeight(theta, e - 0.01, face), face);
    sc.tagged("skin", () => {
      sc.sheet(
        6,
        9,
        (i, j) => {
          const u = (i / 5) * 2 - 1, v = (j / 8) * 2 - 1;
          const rim = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), 2.6)), 1 / 2.6);
          // a shallow dish standing a little off the head, wider at the top, the lobe below
          const depth = (0.0135 - 0.004 * Math.max(0, -v)) * rim;
          const off = 0.0008 + 0.0062 * ((u + 1) / 2) * rim;
          const bowl = -0.0026 * (1 - u * u) * rim;
          return [base.x + s * (off + bowl), base.y + v * 0.027, base.z - 0.003 - (u * 0.5 + 0.5) * depth * 1.6 + depth * 0.45];
        },
        (x) => ({ rgb: mix(paint.skin, ROSE, Math.abs(x - base.x) < 0.004 ? 0.2 : 0.08), gloss: 0.12, glow: SKIN_GLOW }),
        { thickness: 0.0034, flip: s > 0, backPaint: { rgb: shade(paint.skin, 0.86), gloss: 0.1, glow: SKIN_GLOW } },
      );
    });
  }
  return { faceZ };
}

/** Eye colour for a hair colour: dark hair, dark brown eyes; fair or grey hair, lighter eyes. */
export function irisFor(hair: Rgb): Rgb {
  const l = 0.2126 * hair[0] + 0.7152 * hair[1] + 0.0722 * hair[2];
  return l > 0.2 ? rgb("#5b6f7c") : l > 0.07 ? rgb("#4a3324") : rgb("#2b1b12");
}

/**
 * The two ways a face moves, as morph targets of the head's geometry: 0 the jaw swings open about its joint
 * (the vertices tagged `jaw` below the line of the lips: the lower lip and the chin go down and a little back,
 * the dark of the mouth shows), 1 the upper lids come down over the eyes (`lid`).
 */
export function addFaceMorphs(g: BufferGeometry, jaw: Ranges, lids: Ranges, face: FaceSpec): void {
  const pos = g.getAttribute("position");
  const open = new Float32Array(pos.count * 3), blink = new Float32Array(pos.count * 3);
  const m = MOUTH_Y + 0.006 * face.young + HEAD_CENTRE[1];
  const hy = HEAD_CENTRE[1] - 0.018, hz = HEAD_CENTRE[2] - 0.022;
  const c = Math.cos(JAW_SWING), s = Math.sin(JAW_SWING);
  for (const [start, count] of jaw) {
    for (let i = start; i < start + count; i++) {
      const y = pos.getY(i), z = pos.getZ(i);
      const w = smooth(m + 0.0035, m - 0.0015, y) * smooth(hz, hz + 0.03, z);
      if (w <= 0) continue;
      const ry = y - hy, rz = z - hz;
      open[3 * i + 1] = (ry * c - rz * s - ry) * w;
      open[3 * i + 2] = (ry * s + rz * c - rz) * w;
    }
  }
  const e = EYE_Y - 0.012 * face.young + HEAD_CENTRE[1];
  const gap = eyeOpen(face);
  for (const [start, count] of lids) {
    for (let i = start; i < start + count; i++) {
      const x = pos.getX(i) - HEAD_CENTRE[0], y = pos.getY(i);
      const side = x < 0 ? -1 : 1;
      const u = Math.max(-1, Math.min(1, (x - side * EYE_X) / EYE_HALF));
      const arch = Math.pow(Math.max(0, 1 - u * u), 0.62);
      const edgeY = e + gap * arch + 0.0009 * u * side;
      const w = Math.max(0, Math.min(1, 1 - (y - edgeY) / LID_FOLD));
      blink[3 * i + 1] = -1.76 * gap * arch * w;
      blink[3 * i + 2] = 0.0015 * Math.sin(w * Math.PI * 0.5) * arch;
    }
  }
  g.morphAttributes.position = [new BufferAttribute(open, 3), new BufferAttribute(blink, 3)];
  g.morphTargetsRelative = true;
}
