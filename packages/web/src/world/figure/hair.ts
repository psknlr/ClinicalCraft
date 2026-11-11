/**
 * Hair on a head (`head.ts`), kept the way well-kept hair is: a close shell over the scalp, and over it locks
 * that flow the way the style is combed — out from the crown into a side-swept fringe over short sides; from a
 * parting down past the face to the shoulders; back from the hairline into a low ponytail or a bun, a few fine
 * strands left to frame the face; soft waves for curls. Under a cap only the hair below its edge shows. A band
 * of light round the crown is the sheen of healthy hair.
 */
import { Vector3 } from "three";
import { EYE_Y, HEAD_CENTRE, hairlineAt, phiOfHeight, skullPoint, type FaceSpec } from "./head.js";
import { shade, type Paint, type Painter, type Rgb, type Sculpt, type Station, type V3 } from "./sculpt.js";

export type HairStyle = "short" | "long" | "bald" | "bun" | "ponytail" | "curly";

const NU = 40, NV = 9;

/** A point of the scalp pushed `lift` out from the middle of the head. */
export function scalpPoint(theta: number, phi: number, face: FaceSpec, lift: number): V3 {
  const p = skullPoint(theta, phi, face);
  const dx = p.x - HEAD_CENTRE[0], dy = p.y - HEAD_CENTRE[1] + 0.01, dz = p.z - HEAD_CENTRE[2];
  const l = Math.hypot(dx, dy, dz) || 1;
  return [p.x + (dx / l) * lift, p.y + (dy / l) * lift, p.z + (dz / l) * lift];
}

/** The direction from the middle of the head at `theta` round it and `phi` down from the crown. */
function dir(theta: number, phi: number): Vector3 {
  return new Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta));
}

/** The scalp point along a direction from the middle of the head. */
function scalpAlong(d: Vector3, face: FaceSpec, lift: number): V3 {
  const n = d.clone().normalize();
  return scalpPoint(Math.atan2(n.x, n.z), Math.acos(Math.max(-1, Math.min(1, n.y))), face, lift);
}

/** The direction to the hairline at `theta`, `drop` (m) below it. */
function hairlineDir(theta: number, face: FaceSpec, drop = 0): Vector3 {
  return dir(theta, phiOfHeight(theta, hairlineAt(theta, face) - drop, face));
}

/** The paint of hair: its colour streaked a little round the head, a soft band of light round the crown. */
export function hairPaint(hair: Rgb): (x: number, y: number, z: number) => Paint {
  return (x, y, z) => {
    const a = Math.atan2(x - HEAD_CENTRE[0], z - HEAD_CENTRE[2]);
    const n = Math.sin(a * 23 + y * 55) * 0.5 + Math.sin(a * 41 + 1.3) * 0.5;
    const ring = Math.exp(-(((y - HEAD_CENTRE[1] - 0.09) / 0.016) ** 2));
    return { rgb: shade(hair, 0.93 + 0.08 * n + 0.34 * ring), gloss: 0.45 };
  };
}

/**
 * A shell over the scalp: `lift(theta, s)` thick, `s` 0 at the crown … 1 at the hairline, which `drop(theta)`
 * lowers (m); its edge turns in onto the skin. Returns the height of its top above the head's joint.
 */
export function addScalpShell(sc: Sculpt, face: FaceSpec, painter: Painter, lift: (theta: number, s: number) => number, drop: (theta: number) => number = () => 0): number {
  const rings: number[][] = [];
  const thetas: number[] = [], edges: number[] = [];
  for (let i = 0; i < NU; i++) {
    const theta = -Math.PI + (i / NU) * Math.PI * 2;
    thetas.push(theta);
    edges.push(phiOfHeight(theta, hairlineAt(theta, face) - drop(theta), face));
  }
  for (let j = 1; j <= NV + 1; j++) {
    const s = Math.min(1, j / NV);
    const ring: number[] = [];
    for (let i = 0; i < NU; i++) {
      const out = j > NV ? 0.0006 : lift(thetas[i]!, s);
      const p = scalpPoint(thetas[i]!, edges[i]! * (j > NV ? 1.012 : s), face, out);
      ring.push(p[0], p[1], p[2]);
    }
    rings.push(ring);
  }
  const top = scalpPoint(0, 0, face, lift(0, 0));
  sc.rings(rings, NU, painter, { startPole: top });
  return top[1];
}

/** One lock of hair: over the scalp from one direction to another (bending by `via`), then hanging free. */
interface Lock {
  from: Vector3;
  to: Vector3;
  via?: Vector3;
  /** Width at the root and near the tip (m). */
  width: readonly [number, number];
  /** How far off the scalp along the lock (`t` 0 … 1). */
  lift: (t: number) => number;
  /** Free length hanging from the end (m), how far it swings out then back in (m), and a turn of the tip (+ out, − in). */
  hang?: number;
  swing?: number;
  curl?: number;
  thickness?: number;
}

function addLock(sc: Sculpt, face: FaceSpec, lock: Lock, painter: (x: number, y: number, z: number) => Paint, seg = 5): number {
  const n = 6;
  const pts: Station[] = [];
  const th = (lock.thickness ?? 0.0105) / 2;
  let top = -1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const d = lock.via ? lock.from.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(lock.via, 2 * t * (1 - t)).addScaledVector(lock.to, t * t) : lock.from.clone().lerp(lock.to, t);
    const p = scalpAlong(d, face, lock.lift(t));
    const w = lock.width[0] + (lock.width[1] - lock.width[0]) * t;
    const tip = lock.hang ? 1 : 1 - 0.55 * Math.max(0, t - 0.7) / 0.3;
    pts.push({ p, rx: (w / 2) * tip, rz: th * (0.55 + 0.45 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5)) * tip });
    top = Math.max(top, p[1]);
  }
  if (lock.hang) {
    // free of the head the lock falls straight, swinging a little out from the neck and back, its tip turned
    const end = pts[pts.length - 1]!.p;
    const out = new Vector3(end[0] - HEAD_CENTRE[0], 0, end[2] - HEAD_CENTRE[2]).normalize();
    const m = 5;
    for (let i = 1; i <= m; i++) {
      const t = i / m;
      const sw = (lock.swing ?? 0) * Math.sin(t * Math.PI * 0.9) + (lock.curl ?? 0) * t * t * t;
      const w = lock.width[1] * (1 - 0.35 * t);
      pts.push({ p: [end[0] + out.x * sw, end[1] - lock.hang * t, end[2] + out.z * sw], rx: (w / 2) * (i === m ? 0.5 : 1), rz: th * (i === m ? 0.5 : 0.95) });
    }
  }
  const p0 = pts[0]!.p;
  sc.sweep(pts, painter, { seg, front: [p0[0] - HEAD_CENTRE[0], p0[1] - HEAD_CENTRE[1], p0[2] - HEAD_CENTRE[2]], start: "round", end: "round", dome: 0.5 });
  return top;
}

const gauss = (x: number, c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));
const bump = (t: number) => Math.pow(Math.sin(Math.min(1, Math.max(0, t)) * Math.PI), 0.75);
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 1 at the sides of the head, 0 at the front and the back. */
const flank = (theta: number) => Math.sin(theta) ** 2;

type HairPainter = (x: number, y: number, z: number) => Paint;

/**
 * A fringe: hair from a line on top of the head falling over the hairline onto the brow as one soft sheet, its
 * ends in gentle points. `from` … `to`: where it lands across the brow (angles); `length(u)`: how far below the
 * hairline (m); `sweep`: how far round the head its roots lie from where it lands (it is combed across).
 */
function fringe(sc: Sculpt, face: FaceSpec, painter: HairPainter, opts: { from: number; to: number; root: number; length: (u: number) => number; sweep: number; points: number; lift: number; wave?: number }): void {
  const nu = 15, nv = 7;
  const point = (i: number, j: number): V3 => {
    const u = i / (nu - 1), v = j / (nv - 1);
    const tip = opts.from + (opts.to - opts.from) * u;
    const drop = opts.length(u) * (0.72 + 0.28 * Math.abs(Math.sin(u * Math.PI * opts.points + 0.4)));
    const phiTip = phiOfHeight(tip, hairlineAt(tip, face) - drop, face);
    const theta = tip + opts.sweep * (1 - Math.pow(v, 1.4));
    const phi = opts.root + (phiTip - opts.root) * v;
    const lift = 0.003 + opts.lift * (0.55 + 0.45 * Math.sin(v * Math.PI)) * (1 - 0.6 * v) + (opts.wave ?? 0) * Math.sin(u * 19 + v * 5);
    return scalpPoint(theta, phi, face, lift);
  };
  const a = point(0, 0), b = point(nu - 1, 0), c = point(0, nv - 1);
  const n = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
  sc.sheet(nu, nv, point, painter, { thickness: 0.0055, flip: n.z < 0 });
}

/** A light, see-through fringe and the fine strands left out at the temples of hair that is drawn back or worn long. */
function softFringe(sc: Sculpt, face: FaceSpec, painter: HairPainter, part: number): void {
  for (let k = 0; k < 5; k++) {
    const u = k / 4;
    const a = -0.6 + 1.2 * u;
    const from = dir(part + a * 0.35, 0.68);
    const to = hairlineDir(a + (a < part ? -0.08 : 0.08), face, 0.019 + 0.004 * Math.sin(k * 2.6));
    addLock(sc, face, { from, to, width: [0.02, 0.011], lift: (t) => 0.0065 + 0.004 * bump(t) - 0.002 * t, thickness: 0.0034 }, painter, 5);
  }
  for (const s of [-1, 1]) {
    const from = hairlineDir(s * 0.84, face, -0.004);
    const to = dir(s * 1.0, phiOfHeight(s * 1.0, EYE_Y - 0.026, face));
    addLock(sc, face, { from, to, width: [0.008, 0.005], lift: (t) => 0.004 + 0.003 * t, hang: 0.04, swing: 0.003, curl: -0.007, thickness: 0.0036 }, painter, 4);
  }
}

/** The hair of a style; returns the height of its top above the head's joint. */
export function addHair(sc: Sculpt, face: FaceSpec, style: HairStyle, hair: Rgb, opts: { capped?: boolean; infant?: boolean } = {}): number {
  const top = HEAD_CENTRE[1] + 0.114;
  if (style === "bald") return top + 0.001;
  const painter = hairPaint(hair);
  if (opts.capped) return addScalpShell(sc, face, painter, () => 0.0035);
  if (opts.infant) return addScalpShell(sc, face, painter, (_t, s) => 0.004 * (1 - 0.3 * s));
  let crown = top;
  switch (style) {
    case "curly":
      // a soft perm: full, the surface in loose waves
      crown = addScalpShell(sc, face, painter, (t, s) => 0.021 * (1 - 0.3 * s * s) - 0.007 * flank(t) * Math.min(1, s * 3) + 0.0045 * Math.sin(t * 6 + s * 7) * Math.sin(s * 9 + t * 2.5) * Math.min(1, s * 3), (t) => 0.003 + 0.004 * gauss(Math.abs(t), Math.PI, 1.2) - 0.006 * gauss(t, 0, 0.8));
      fringe(sc, face, painter, { from: 0.6, to: -0.95, root: 0.5, length: () => 0.018, sweep: 0.3, points: 4.5, lift: 0.014, wave: 0.0016 });
      break;
    case "long": {
      // sleek from an off-centre parting; it falls either side of the face and down the back, the ends turned in
      const part = 0.2;
      crown = addScalpShell(sc, face, painter, (t, s) => 0.0135 * (1 - 0.3 * s * s) - 0.0032 * gauss(t, part, 0.13) * Math.min(1, s * 2.5) * (1 - 0.4 * s) * smoothstep(2.6, 1.6, Math.abs(t)), (t) => 0.014 * gauss(Math.abs(t), 1.45, 0.42) - 0.004 * gauss(t, 0, 0.7));
      const n = 23, rows = 9;
      sc.sheet(
        n,
        rows,
        (i, j) => {
          const u = i / (n - 1);
          const theta = 0.98 + u * (Math.PI * 2 - 1.96); // from in front of the left ear round the back to the right
          const back = gauss(Math.abs(theta - Math.PI), 0, 1.05);
          const yTop = 0.05, yBottom = -0.172 - 0.075 * back;
          const v = j / (rows - 1);
          const y = yTop + (yBottom - yTop) * v;
          // it comes out from under the hair on top, then stands as full as it
          const p = scalpPoint(theta, phiOfHeight(theta, Math.max(y, -0.028), face), face, 0.004 + 0.0115 * smoothstep(0, 0.3, v) - 0.003 * v);
          // free of the skull the hair hangs: in a little towards the neck, out over the shoulders, the ends turned in
          const hang = Math.max(0, -0.028 - y);
          const k = 1 - 0.75 * hang * (1 - hang / 0.2) + 0.3 * back * hang - 0.14 * smoothstep(0.78, 1, v);
          return [HEAD_CENTRE[0] + (p[0] - HEAD_CENTRE[0]) * k, y + HEAD_CENTRE[1], HEAD_CENTRE[2] + (p[2] - HEAD_CENTRE[2]) * k];
        },
        painter,
        { thickness: 0.014, flip: true },
      );
      // the front lengths: from the parting out and down past the temples, a curtain either side of the brow
      for (const side of [-1, 1]) {
        fringe(sc, face, painter, { from: part + side * 0.04, to: side * 0.98, root: 0.62, length: (u) => 0.006 + 0.07 * Math.pow(u, 1.5), sweep: -side * 0.1, points: 1.2, lift: 0.011 });
      }
      break;
    }
    case "ponytail":
    case "bun": {
      // drawn back sleek, the comb's lines running to where it is tied
      const low = style === "bun";
      crown = addScalpShell(sc, face, painter, (t, s) => 0.0088 * (1 - 0.3 * s) + 0.0008 * Math.sin(t * 16) * (0.4 + 0.6 * s), (t) => 0.002 * gauss(Math.abs(t), 1.5, 0.3));
      const tiePhi = phiOfHeight(Math.PI, low ? -0.03 : 0.014, face);
      const root = scalpPoint(Math.PI, tiePhi, face, 0.01);
      const band: Paint = { rgb: [0.03, 0.03, 0.04], gloss: 0.15 };
      if (low) {
        // a low chignon, a band round its base
        sc.ball([root[0], root[1] - 0.004, root[2] - 0.024], 0.035, 0.031, 0.03, painter, 14, 8);
        sc.ball([root[0], root[1] - 0.004, root[2] - 0.004], 0.022, 0.02, 0.012, band, 10, 5);
      } else {
        const tail: Station[] = [
          { p: [root[0], root[1], root[2]], rx: 0.019, rz: 0.017 },
          { p: [root[0], root[1] - 0.006, root[2] - 0.026], rx: 0.024, rz: 0.02 },
          { p: [root[0], root[1] - 0.048, root[2] - 0.046], rx: 0.025, rz: 0.019 },
          { p: [root[0], root[1] - 0.11, root[2] - 0.044], rx: 0.022, rz: 0.017 },
          { p: [root[0], root[1] - 0.17, root[2] - 0.034], rx: 0.016, rz: 0.013 },
          { p: [root[0], root[1] - 0.212, root[2] - 0.04], rx: 0.008, rz: 0.007 },
        ];
        sc.sweep(tail, painter, { seg: 10, front: [0, 0, -1], dome: 0.9 });
        sc.sweep([{ p: [root[0], root[1] - 0.001, root[2] - 0.01], rx: 0.0215, rz: 0.02 }, { p: [root[0], root[1] - 0.005, root[2] - 0.02], rx: 0.0225, rz: 0.021 }], band, { seg: 10, front: [0, 0, -1], start: "flat", end: "flat" });
      }
      softFringe(sc, face, painter, 0.15);
      break;
    }
    default:
      // short: full on top, close at the sides and the nape, the fringe combed across from a parting on the left
      crown = addScalpShell(
        sc,
        face,
        painter,
        (t, s) => 0.0185 * (1 - 0.5 * Math.pow(s, 1.5)) + (-0.0095 * flank(t) + 0.003 * gauss(t, 0.5, 0.8) + 0.0007 * Math.sin((t + s * 0.9) * 15) * s) * smoothstep(0.15, 0.6, s) * (1 - 0.3 * s),
        (t) => -0.007 * gauss(t, -0.1, 0.9) + 0.002 * Math.sin(t * 9),
      );
      fringe(sc, face, painter, { from: 0.55, to: -0.95, root: 0.52, length: (u) => 0.016 + 0.008 * Math.sin(u * Math.PI), sweep: 0.34, points: 3.5, lift: 0.013 });
      fringe(sc, face, painter, { from: 1.0, to: 0.6, root: 0.6, length: () => 0.006, sweep: -0.1, points: 1.5, lift: 0.008 });
      break;
  }
  return crown;
}
