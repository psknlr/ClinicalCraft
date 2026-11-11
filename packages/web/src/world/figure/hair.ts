/**
 * Hair on a head (`head.ts`), kept the way well-kept hair is: a close shell over the scalp, and over it a fringe —
 * one soft sheet that comes out of the hair near the crown, lies over it and falls past the hairline onto the
 * brow, thinning to its ends and its sides so that it has no cut edge: combed across over short sides; from a
 * parting down past the face to the shoulders; a light fringe to one side or a parted curtain over hair drawn back
 * into a bun or a ponytail, a fine strand left out in front of each ear; soft waves for curls. Under a cap only
 * the hair below its edge shows. A band of light round the crown is the sheen of healthy hair.
 */
import { Vector3 } from "three";
import { EYE_Y, HEAD_CENTRE, hairlineAt, phiOfHeight, skullPoint, type FaceSpec } from "./head.js";
import { Sculpt, shade, type Cast, type Paint, type Painter, type Rgb, type Station, type V3 } from "./sculpt.js";
import { remembered } from "./skull.js";

export type HairStyle = "short" | "long" | "bald" | "bun" | "ponytail" | "curly";

const NU = 52, NV = 12;

/** A point of the scalp pushed `lift` out from the middle of the head. */
export function scalpPoint(theta: number, phi: number, face: FaceSpec, lift: number): V3 {
  const p = skullPoint(theta, phi, face);
  const dx = p.x - HEAD_CENTRE[0], dy = p.y - HEAD_CENTRE[1] + 0.01, dz = p.z - HEAD_CENTRE[2];
  const l = Math.hypot(dx, dy, dz) || 1;
  return [p.x + (dx / l) * lift, p.y + (dy / l) * lift, p.z + (dz / l) * lift];
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

const gauss = (x: number, c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 1 at the sides of the head, 0 at the front and the back. */
const flank = (theta: number) => Math.sin(theta) ** 2;

type HairPainter = (x: number, y: number, z: number) => Paint;

/** The hair over the scalp under a fringe: how thick it lies (`addScalpShell`'s `lift`) and how far below the hairline its edge is (`drop`). */
interface Under {
  lift: (theta: number, s: number) => number;
  drop?: (theta: number) => number;
}

/**
 * A fringe: hair from a line on top of the head, combed over the hair there and falling past the hairline onto
 * the brow as one soft sheet. It comes out of the hair it grows from (`under`), lies over it a little fuller, and
 * past the hairline comes down to rest on the skin; it thins to its ends and to its sides, which go back into the
 * hair, so it has no cut edge. `from` … `to`: where it lands across the brow (angles); `length(u)`: how far below
 * the hairline (m); `sweep`: how far round the head its roots lie from where it lands (it is combed across — or,
 * with a `part`, away from the parting at that angle to either side).
 */
function fringe(sc: Sculpt, face: FaceSpec, painter: HairPainter, under: Under, opts: { from: number; to: number; root: number; length: (u: number) => number; sweep: number; part?: number; points?: number; ragged?: number; full?: number; wave?: number }): void {
  const nu = opts.part === undefined ? 19 : 29, nv = 9;
  const full = opts.full ?? 0.004;
  const edgeAt = (theta: number) => phiOfHeight(theta, hairlineAt(theta, face) - (under.drop?.(theta) ?? 0), face);
  const side = (u: number) => Math.pow(Math.sin(Math.min(1, Math.max(0, u)) * Math.PI), 0.55);
  const ragged = opts.ragged ?? 0.06;
  // where each column of it ends: the ends in gentle points
  const tips = Array.from({ length: nu }, (_, i) => {
    const u = i / (nu - 1);
    const tip = opts.from + (opts.to - opts.from) * u;
    const drop = opts.length(u) * (1 - ragged + ragged * Math.abs(Math.sin(u * Math.PI * (opts.points ?? 3) + 0.4)));
    return phiOfHeight(tip, hairlineAt(tip, face) - drop, face);
  });
  const point = (i: number, j: number): V3 => {
    const u = i / (nu - 1), v = j / (nv - 1);
    const tip = opts.from + (opts.to - opts.from) * u;
    const phiTip = tips[i]!;
    // (parted, it is combed away from the parting to either side, and lies lower along it)
    // (never across it: close to the parting the roots are close to it too)
    const away = opts.part === undefined ? 1 : -Math.tanh((tip - opts.part) / (2.5 * opts.sweep));
    const theta = tip + opts.sweep * away * (1 - Math.pow(v, 1.4));
    const parting = opts.part === undefined ? 0 : Math.exp(-(((theta - opts.part) / 0.035) ** 2));
    const phi = opts.root + (phiTip - opts.root) * v;
    const edge = edgeAt(theta);
    // over the hair it grows from: out of it at the root, then a little fuller than it
    const base = under.lift(theta, Math.min(1, phi / edge));
    // (along a parting it lies down on the hair under it: the line of the parting)
    const rise = full * (0.3 + 0.7 * side(u)) * smoothstep(0.04, 0.5, v);
    const over = base - 0.0016 * (1 - smoothstep(0, 0.12, v)) + rise - Math.max(0, rise - 0.0004) * parting + (opts.wave ?? 0) * Math.sin(u * 19 + v * 5);
    // past the hairline it comes down onto the skin
    // (only past it: before the hairline it stays over the hair it lies on)
    const down = smoothstep(0.985, Math.max(1.02, 1 + 0.75 * (phiTip / edge - 1)), phi / edge);
    return scalpPoint(theta, phi, face, over + (0.0019 - over) * down);
  };
  const a = point(0, 0), b = point(nu - 1, 0), c = point(0, nv - 1);
  const n = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
  // thinner to its ends and to its sides
  const thickness = (i: number, j: number) => (0.0006 + 0.0042 * (1 - 0.9 * smoothstep(0.25, 1, j / (nv - 1)))) * (0.25 + 0.75 * side(i / (nu - 1)));
  sc.sheet(nu, nv, point, painter, { thickness, flip: n.z < 0 });
}

/**
 * A fine strand left out of hair that is drawn back: on the skin in front of an ear, from the hairline at the
 * temple down past the cheekbone, thinning to nothing.
 */
function strand(sc: Sculpt, face: FaceSpec, painter: HairPainter, side: number): void {
  const nu = 4, nv = 10;
  const top = hairlineAt(side * 1.1, face) + 0.006, bottom = EYE_Y - 0.034;
  sc.sheet(
    nu,
    nv,
    (i, j) => {
      const u = i / (nu - 1) - 0.5, v = j / (nv - 1);
      // it comes a little forward on its way down, and narrows
      const theta = side * (1.13 - 0.07 * v * v + u * 0.13 * Math.pow(1 - v, 0.8));
      const y = top + (bottom - top) * v;
      return scalpPoint(theta, phiOfHeight(theta, y, face), face, 0.0009 + 0.0022 * (1 - v) * (1 - 4 * u * u * 0.6));
    },
    painter,
    { thickness: (_i, j) => 0.0003 + 0.0016 * (1 - j / (nv - 1)), flip: side < 0 },
  );
}

/** Hair as every figure with such a face and such a style has it: its form, each point's share of the hair's colour, and its top. */
interface HairCast {
  cast: Cast;
  hair: Float32Array;
  crown: number;
}
const casts = new Map<string, Map<string, HairCast>>();

/**
 * The hair of a style, in the head's own frame: the cast of that style on such a face, in this figure's hair
 * colour. Returns the height of its top above the head's joint.
 */
export function addHair(sc: Sculpt, face: FaceSpec, style: HairStyle, hair: Rgb, opts: { capped?: boolean; infant?: boolean } = {}): number {
  if (style === "bald") return HEAD_CENTRE[1] + 0.115;
  const kind = `${style}|${opts.capped ? 1 : 0}|${opts.infant ? 1 : 0}`;
  let store = casts.get(kind);
  if (!store) casts.set(kind, (store = new Map()));
  const made = remembered(store, face, () => {
    // (a colour of hair is so much of the figure's hair colour over a colour of its own — the band a tail is tied with)
    const dark = new Sculpt(), light = new Sculpt();
    const crown = sculptHair(dark, face, style, [0, 0, 0], opts);
    sculptHair(light, face, style, [1, 1, 1], opts);
    const cast = dark.cast(), lit = light.cast().colour;
    const share = new Float32Array(lit.length / 3);
    for (let i = 0; i < share.length; i++) share[i] = lit[3 * i]! - cast.colour[3 * i]!;
    return { cast, hair: share, crown };
  });
  const own = made.cast.colour, n = made.hair.length;
  const colour = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = made.hair[i]!;
    colour[3 * i] = own[3 * i]! + a * hair[0];
    colour[3 * i + 1] = own[3 * i + 1]! + a * hair[1];
    colour[3 * i + 2] = own[3 * i + 2]! + a * hair[2];
  }
  sc.put(made.cast, colour);
  return made.crown;
}

/** The hair of a style sculpted directly (what a cast is taken from); returns the height of its top above the head's joint. */
export function sculptHair(sc: Sculpt, face: FaceSpec, style: HairStyle, hair: Rgb, opts: { capped?: boolean; infant?: boolean } = {}): number {
  const top = HEAD_CENTRE[1] + 0.114;
  if (style === "bald") return top + 0.001;
  const painter = hairPaint(hair);
  if (opts.capped) return addScalpShell(sc, face, painter, () => 0.0035);
  if (opts.infant) return addScalpShell(sc, face, painter, (_t, s) => 0.004 * (1 - 0.3 * s));
  let crown = top;
  switch (style) {
    case "curly": {
      // a soft perm: full, the surface in loose waves
      const under: Under = {
        lift: (t, s) => 0.021 * (1 - 0.3 * s * s) - 0.007 * flank(t) * Math.min(1, s * 3) + 0.0045 * Math.sin(t * 6 + s * 7) * Math.sin(s * 9 + t * 2.5) * Math.min(1, s * 3),
        drop: (t) => 0.003 + 0.004 * gauss(Math.abs(t), Math.PI, 1.2) - 0.006 * gauss(t, 0, 0.8),
      };
      crown = addScalpShell(sc, face, painter, under.lift, under.drop);
      fringe(sc, face, painter, under, { from: 0.7, to: -0.95, root: 0.3, length: (u) => 0.014 + 0.006 * Math.sin(u * Math.PI), sweep: 0.3, points: 4.5, ragged: 0.12, full: 0.0045, wave: 0.0016 });
      break;
    }
    case "long": {
      // sleek from an off-centre parting; it falls either side of the face and down the back, the ends turned in
      const part = 0.2;
      const under: Under = {
        lift: (_t, s) => 0.0135 * (1 - 0.3 * s * s),
        drop: (t) => 0.014 * gauss(Math.abs(t), 1.45, 0.42) - 0.004 * gauss(t, 0, 0.7),
      };
      crown = addScalpShell(sc, face, painter, under.lift, under.drop);
      const n = 27, rows = 9;
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
      fringe(sc, face, painter, under, { from: 1.02, to: -1.02, root: 0.34, part, length: (u) => 0.004 + 0.07 * Math.pow(Math.abs(1.02 - 2.04 * u - part) / (1.02 + Math.sign(1.02 - 2.04 * u - part) * -part), 1.5), sweep: 0.1, points: 0.6, full: 0.0035 });
      break;
    }
    case "ponytail":
    case "bun": {
      // drawn back sleek, the comb's lines running to where it is tied
      const low = style === "bun";
      const under: Under = { lift: (t, s) => 0.0088 * (1 - 0.3 * s) + 0.0008 * Math.sin(t * 16) * (0.4 + 0.6 * s), drop: (t) => 0.002 * gauss(Math.abs(t), 1.5, 0.3) };
      crown = addScalpShell(sc, face, painter, under.lift, under.drop);
      const tiePhi = phiOfHeight(Math.PI, low ? -0.03 : 0.014, face);
      const root = scalpPoint(Math.PI, tiePhi, face, 0.01);
      const band: Paint = { rgb: [0.03, 0.03, 0.04], gloss: 0.15 };
      if (low) {
        // a low chignon, a band round its base
        sc.ball([root[0], root[1] - 0.004, root[2] - 0.024], 0.035, 0.031, 0.03, painter, 18, 10);
        sc.ball([root[0], root[1] - 0.004, root[2] - 0.004], 0.022, 0.02, 0.012, band, 12, 5);
        // a light fringe combed to one side: just over the brows, longer towards the temple it is combed to
        fringe(sc, face, painter, under, { from: 0.78, to: -0.86, root: 0.3, length: (u) => 0.009 + 0.016 * Math.pow(u, 1.3), sweep: 0.26, points: 2.5, full: 0.0035 });
      } else {
        const tail: Station[] = [
          { p: [root[0], root[1], root[2]], rx: 0.019, rz: 0.017 },
          { p: [root[0], root[1] - 0.006, root[2] - 0.026], rx: 0.024, rz: 0.02 },
          { p: [root[0], root[1] - 0.048, root[2] - 0.046], rx: 0.025, rz: 0.019 },
          { p: [root[0], root[1] - 0.11, root[2] - 0.044], rx: 0.022, rz: 0.017 },
          { p: [root[0], root[1] - 0.17, root[2] - 0.034], rx: 0.016, rz: 0.013 },
          { p: [root[0], root[1] - 0.212, root[2] - 0.04], rx: 0.008, rz: 0.007 },
        ];
        sc.sweep(tail, painter, { seg: 12, front: [0, 0, -1], dome: 0.9 });
        sc.sweep([{ p: [root[0], root[1] - 0.001, root[2] - 0.01], rx: 0.0215, rz: 0.02 }, { p: [root[0], root[1] - 0.005, root[2] - 0.02], rx: 0.0225, rz: 0.021 }], band, { seg: 12, front: [0, 0, -1], start: "flat", end: "flat" });
        // a fringe parted off-centre, a soft curtain to either temple
        const part = -0.16;
        fringe(sc, face, painter, under, { from: 0.98, to: -0.98, root: 0.32, part, length: (u) => 0.004 + 0.03 * Math.sin(Math.pow(Math.abs(0.98 - 1.96 * u - part) / (0.98 + Math.sign(0.98 - 1.96 * u - part) * -part), 0.9) * Math.PI * 0.86), sweep: 0.08, points: 0.6, full: 0.0032 });
      }
      // fine strands left out in front of the ears
      for (const side of [-1, 1]) strand(sc, face, painter, side);
      break;
    }
    default: {
      // short: full on top, close at the sides and the nape, the fringe combed across from a parting on the left
      const under: Under = {
        lift: (t, s) => 0.0185 * (1 - 0.5 * Math.pow(s, 1.5)) + (-0.0095 * flank(t) + 0.003 * gauss(t, 0.5, 0.8) + 0.0007 * Math.sin((t + s * 0.9) * 15) * s) * smoothstep(0.15, 0.6, s) * (1 - 0.3 * s),
        drop: (t) => -0.007 * gauss(t, -0.1, 0.9) + 0.002 * Math.sin(t * 9),
      };
      crown = addScalpShell(sc, face, painter, under.lift, under.drop);
      fringe(sc, face, painter, under, { from: 0.92, to: -0.95, root: 0.3, length: (u) => 0.007 + 0.015 * Math.sin(Math.pow(u, 0.8) * Math.PI * 0.8), sweep: 0.34, points: 3.5, ragged: 0.1, full: 0.0045 });
      break;
    }
  }
  return crown;
}
