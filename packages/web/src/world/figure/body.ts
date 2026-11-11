/**
 * The body of a figure, part by part (`Sculpt`): the trunk and what hangs round it (a garment is a shell over
 * the trunk's own surface, from its hem to its neckline), arms and legs as sections swept along their bones
 * through a rounded elbow or knee, hands with fingers, and shoes. Measurements: `anatomy.ts`.
 */
import { Matrix4, Vector3 } from "three";
import { ANKLE, HIP, NECK, PIVOT, type Frame, type Limb } from "./anatomy.js";
import { shade, type Paint, type Painter, type Sculpt, type Station, type V3 } from "./sculpt.js";

/** Values along a line, read between the keys with a smooth curve (keys: [at, ...values], ascending). */
export function curve(keys: readonly (readonly number[])[]): (at: number) => number[] {
  const n = keys.length;
  return (at) => {
    if (at <= keys[0]![0]!) return keys[0]!.slice(1);
    if (at >= keys[n - 1]![0]!) return keys[n - 1]!.slice(1);
    let i = 0;
    while (i + 2 < n && at > keys[i + 1]![0]!) i++;
    const k0 = keys[Math.max(0, i - 1)]!, k1 = keys[i]!, k2 = keys[i + 1]!, k3 = keys[Math.min(n - 1, i + 2)]!;
    const h = k2[0]! - k1[0]!;
    const t = (at - k1[0]!) / h;
    const out: number[] = [];
    for (let c = 1; c < k1.length; c++) {
      // Hermite with finite-difference slopes (no overshoot worth the name with these keys)
      const m1 = ((k2[c]! - k0[c]!) / Math.max(1e-6, k2[0]! - k0[0]!)) * h;
      const m2 = ((k3[c]! - k1[c]!) / Math.max(1e-6, k3[0]! - k1[0]!)) * h;
      const t2 = t * t, t3 = t2 * t;
      out.push((2 * t3 - 3 * t2 + 1) * k1[c]! + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * k2[c]! + (t3 - t2) * m2);
    }
    return out;
  };
}

/* ------------------------------------------------------------------ */
/* The trunk                                                           */
/* ------------------------------------------------------------------ */

/** The bare trunk of a standing adult by height: half-width, half-depth to the front and to the back. */
const TRUNK = curve([
  [0.775, 0.09, 0.045, 0.075],
  [0.82, 0.138, 0.08, 0.105],
  [0.905, 0.168, 0.108, 0.12],
  [0.985, 0.16, 0.11, 0.106],
  [1.075, 0.143, 0.104, 0.094],
  [1.18, 0.15, 0.11, 0.099],
  [1.275, 0.162, 0.119, 0.106],
  [1.345, 0.17, 0.114, 0.109],
  [1.395, 0.176, 0.1, 0.104],
  [1.425, 0.166, 0.086, 0.096],
  [1.447, 0.124, 0.072, 0.086],
  [NECK, 0.088, 0.062, 0.076],
  [1.482, 0.064, 0.058, 0.068],
]);
const CHEST = 1.275;

/** How a garment sits on the trunk. */
export interface Fit {
  /** Room between body and cloth (m). */
  ease: number;
  /** 0 follows the body … 1 hangs straight down from the chest. */
  straight: number;
  /** Extra half-width and half-depth at the hem of a garment that reaches below the hips (per metre below them). */
  flare?: number;
}

const BARE: Fit = { ease: 0, straight: 0 };

/** The trunk's section at a standing adult's height `y` under a fit: [half-width, front, back]. */
export function trunkAt(y: number, f: Frame, fit: Fit = BARE): [number, number, number] {
  const below = Math.max(0, HIP - y);
  let [x, a, b] = TRUNK(fit.flare !== undefined ? Math.max(y, HIP) : y) as [number, number, number];
  // build: a heavy trunk is wider at the waist than at the shoulders, and carries a belly
  const waist = Math.exp(-(((y - 1.03) / 0.2) ** 2));
  x *= 1 + (f.wide - 1) * (0.55 + 0.75 * waist);
  a = a * f.deep + f.belly * Math.exp(-(((y - 1.05) / 0.15) ** 2));
  b = b * (1 + (f.deep - 1) * 0.6);
  if (fit.straight > 0 && y < CHEST) {
    // cloth falls from the chest: no narrower than (most of) the chest above
    const [cx, ca, cb] = TRUNK(CHEST) as [number, number, number];
    const hang = fit.straight;
    x = Math.max(x, cx * (1 + (f.wide - 1) * 0.55) * (0.94 + 0.06 * hang) * hang + x * (1 - hang));
    a = Math.max(a, (ca * f.deep * 0.9 + f.belly * 0.5) * hang + a * (1 - hang));
    b = Math.max(b, cb * (1 + (f.deep - 1) * 0.6) * 0.93 * hang + b * (1 - hang));
  }
  if (fit.flare !== undefined && below > 0) {
    // below the hips a long garment hangs round both legs
    x = Math.max(x, 0.186 * (1 + (f.wide - 1) * 0.8)) + fit.flare * below;
    a = Math.max(a, 0.112 * f.deep) + fit.flare * below * 0.6;
    b = Math.max(b, 0.122) + fit.flare * below * 0.6;
  }
  return [x + fit.ease, a + fit.ease, b + fit.ease];
}

/** A point of the trunk's surface under a fit: height `y` (standing adult), `a` round it from the front towards the figure's left; `lift` raises it (a seat). */
export function trunkPoint(y: number, a: number, f: Frame, lift: number, fit: Fit = BARE, proud = 0): V3 {
  const [rx, fr, bk] = trunkAt(y, f, fit);
  const c = Math.cos(a), s = Math.sin(a);
  const e = 2 / 2.35;
  const x = Math.sign(s) * Math.pow(Math.abs(s), e) * (rx + proud);
  const z = Math.sign(c) * Math.pow(Math.abs(c), e) * ((c >= 0 ? fr : bk) + proud);
  return [x, y + lift, z];
}

/** The bare trunk between two heights (skin, or the base of a garment that fits like skin). */
export function addTrunk(sc: Sculpt, f: Frame, lift: number, from: number, to: number, painter: Painter, fit: Fit = BARE, opts: { seg?: number; start?: "round" | "flat" | "open"; end?: "round" | "flat" | "open"; rows?: number } = {}): void {
  const rows = opts.rows ?? Math.max(3, Math.round((to - from) / 0.045));
  const stations: Station[] = [];
  for (let i = 0; i <= rows; i++) {
    const y = from + ((to - from) * i) / rows;
    const [rx, fr, bk] = trunkAt(y, f, fit);
    stations.push({ p: [0, y + lift, 0], rx, rz: fr, back: bk, power: 2.35 });
  }
  sc.sweep(stations, painter, { seg: opts.seg ?? 20, start: opts.start ?? "round", end: opts.end ?? "open", dome: 0.45 });
}

/** A garment's shell over the trunk. */
export interface Shell {
  /** Bottom edge (standing adult height). */
  hem: number;
  /** Top edge round the body: the neckline (`a` from the front, −π … π). */
  neck: (a: number) => number;
  fit: Fit;
  paint: Painter;
  /** Columns round the body (default 28) and rows from hem to neckline (default 16). */
  nu?: number;
  nv?: number;
  /** Leave the front open between ±`open(y)` radians (a coat's front edges); default closed. */
  open?: (y: number) => number;
}

/** Rows of a shell crowd towards the neckline, where the shoulders turn over. */
function rowAt(v: number): number {
  return v < 0.62 ? (v / 0.62) * 0.86 : 0.86 + ((v - 0.62) / 0.38) * 0.14;
}

/** The shell of a garment (see `Shell`). */
export function addShell(sc: Sculpt, f: Frame, lift: number, shell: Shell): void {
  const nu = shell.nu ?? 28, nv = shell.nv ?? 16;
  const wrapped = (a: number) => (a > Math.PI ? a - Math.PI * 2 : a);
  const height = (a: number, v: number) => shell.hem + (shell.neck(wrapped(a)) - shell.hem) * rowAt(v);
  const open = shell.open;
  // an open front: each row runs from one front edge round the back to the other
  const edges: number[] = [];
  if (open) {
    for (let j = 0; j < nv; j++) {
      const v = j / (nv - 1);
      let a0 = open(height(0, v));
      for (let k = 0; k < 3; k++) a0 = open(height(a0, v));
      edges.push(a0);
    }
  }
  sc.sheet(
    nu,
    nv,
    (i, j) => {
      const v = j / (nv - 1);
      const a = open ? edges[j]! + ((Math.PI * 2 - 2 * edges[j]!) * i) / (nu - 1) : (i / nu) * Math.PI * 2;
      return trunkPoint(height(a, v), a, f, lift, shell.fit);
    },
    shell.paint,
    { wrap: !open },
  );
}

/* ------------------------------------------------------------------ */
/* Limbs                                                               */
/* ------------------------------------------------------------------ */

/** A point along a limb: `t` 0 … 1 down the first bone, 1 … 2 down the second, round a joint that is bent. */
export function limbPoint(l: Limb, t: number, round = 0.06): Vector3 {
  const a = new Vector3(...l.root), b = new Vector3(...l.mid), c = new Vector3(...l.end);
  const la = a.distanceTo(b), lb = b.distanceTo(c);
  const w = Math.min(0.45, round / Math.max(la, 1e-4)), w2 = Math.min(0.45, round / Math.max(lb, 1e-4));
  if (t <= 1 - w) return a.lerp(b, t);
  if (t >= 1 + w2) return b.lerp(c, t - 1);
  // inside the joint: a curve from the first bone to the second
  const p1 = a.clone().lerp(b, 1 - w), p2 = b.clone().lerp(c, w2);
  const s = t < 1 ? ((t - (1 - w)) / w) * 0.5 : 0.5 + ((t - 1) / w2) * 0.5;
  return p1.multiplyScalar((1 - s) * (1 - s)).addScaledVector(b, 2 * s * (1 - s)).addScaledVector(p2, s * s);
}

/** Where sections are cut along a limb (closer together through the joint). */
const CUTS = [0, 0.14, 0.3, 0.48, 0.66, 0.8, 0.9, 0.96, 1, 1.04, 1.1, 1.2, 1.36, 1.52, 1.68, 1.84, 1.93, 2];

/** Sections of a limb from `t0` to `t1`, each sized by `radii(t)` = [half-width, front, back]. */
export function limbStations(l: Limb, t0: number, t1: number, radii: (t: number) => number[], round = 0.06): Station[] {
  const ts = [t0, ...CUTS.filter((t) => t > t0 + 0.02 && t < t1 - 0.02), t1];
  return ts.map((t) => {
    const p = limbPoint(l, t, round);
    const [rx, rz, back] = radii(t) as [number, number, number | undefined];
    return { p: [p.x, p.y, p.z] as V3, rx, rz, back: back ?? rz };
  });
}

const ARM = curve([
  [0, 0.047, 0.052],
  [0.35, 0.045, 0.049],
  [0.8, 0.04, 0.042],
  [1, 0.0365, 0.039],
  [1.18, 0.0395, 0.041],
  [1.5, 0.034, 0.0345],
  [1.85, 0.0272, 0.0235],
  [2, 0.0262, 0.0205],
]);
const LEG = curve([
  [0, 0.066, 0.086, 0.09],
  [0.25, 0.08, 0.088, 0.09],
  [0.5, 0.077, 0.083, 0.082],
  [0.85, 0.06, 0.062, 0.06],
  [1, 0.054, 0.056, 0.054],
  [1.25, 0.053, 0.05, 0.062],
  [1.6, 0.043, 0.042, 0.046],
  [1.9, 0.034, 0.036, 0.036],
  [2, 0.033, 0.037, 0.035],
]);

/** A bare arm's section at `t` (see `limbPoint`). */
export function armRadii(f: Frame, ease = 0): (t: number) => number[] {
  return (t) => {
    const [rx, rz] = ARM(t) as [number, number];
    const k = t < 1.7 ? f.limb : 1 + (f.limb - 1) * 0.5;
    return [rx * k + ease, rz * k + ease];
  };
}

/** A bare leg's section at `t`. */
export function legRadii(f: Frame, ease = 0): (t: number) => number[] {
  return (t) => {
    const [rx, rz, back] = LEG(t) as [number, number, number];
    return [rx * f.limb + ease, rz * f.limb + ease, back * f.limb + ease];
  };
}

/** A trouser leg's section at `t`: off the thigh, then straight to a hem a little wider than the ankle. */
export function trouserRadii(f: Frame, ease = 0.012): (t: number) => number[] {
  const bare = legRadii(f, ease);
  return (t) => {
    const [rx, rz, back] = bare(t) as [number, number, number];
    const fall = t < 1 ? 0.088 - 0.016 * t : 0.072 - 0.008 * (t - 1);
    const s = fall * (0.9 + 0.1 * f.limb);
    return [Math.max(rx, s), Math.max(rz, s * 1.02), Math.max(back, s * 1.02)];
  };
}

/** The frame of a hand or foot at a limb's end: X across (thumb side / outer side), Y `along`, Z opposite `face`. */
export function endFrame(l: Limb, origin: V3 = l.end): Matrix4 {
  const y = new Vector3(...l.along).normalize();
  const z = new Vector3(...l.face).multiplyScalar(-1);
  z.addScaledVector(y, -z.dot(y)).normalize();
  const x = new Vector3().crossVectors(y, z);
  return new Matrix4().makeBasis(x, y, z).setPosition(origin[0], origin[1], origin[2]);
}

/* ------------------------------------------------------------------ */
/* Hands                                                               */
/* ------------------------------------------------------------------ */

/** How a hand is held: finger curl (degrees at the knuckle, middle and end joints) and how far the thumb stands off. */
export interface HandPose {
  curl: readonly [number, number, number];
  /** Extra curl per finger from index to little finger (degrees at each joint). */
  spread?: number;
  /** The thumb: out from the palm's edge (degrees), towards the palm (degrees), bend of its joints (degrees). */
  thumb?: readonly [number, number, number];
}

export const HAND_RELAXED: HandPose = { curl: [16, 30, 18], spread: 4, thumb: [26, 24, 16] };
export const HAND_FLAT: HandPose = { curl: [6, 8, 5], spread: 1, thumb: [34, 8, 8] };
export const HAND_CLASPED: HandPose = { curl: [34, 52, 30], spread: 3, thumb: [18, 32, 24] };
/** Fingers hooked over something held at their tips, the thumb closing on it from the side. */
export const HAND_HOLD: HandPose = { curl: [26, 42, 22], spread: 2, thumb: [16, 46, 22] };

const FINGERS: readonly { x: number; y: number; len: number; r: number }[] = [
  { x: 0.0285, y: 0.092, len: 0.07, r: 0.0086 },
  { x: 0.0095, y: 0.097, len: 0.078, r: 0.0089 },
  { x: -0.0095, y: 0.093, len: 0.072, r: 0.0083 },
  { x: -0.0275, y: 0.084, len: 0.057, r: 0.0073 },
];

/**
 * A left hand in its own frame: the wrist at the origin, fingers along +Y, the palm facing −Z, the thumb on
 * +X (`endFrame` puts it on an arm; the right hand is its mirror). `detail` adds nails and rounder fingers
 * (the hand the player sees close).
 */
export function addHand(sc: Sculpt, painter: Paint, pose: HandPose = HAND_RELAXED, opts: { detail?: boolean; girth?: number; nail?: Paint } = {}): void {
  const g = opts.girth ?? 1;
  const seg = opts.detail ? 10 : 5;
  const rad = Math.PI / 180;
  // palm: wrist to knuckles
  sc.sweep(
    [
      { p: [0, -0.012, 0], rx: 0.0262 * g, rz: 0.011 * g, power: 2.3 },
      { p: [0.001, 0.02, 0], rx: 0.034 * g, rz: 0.0135 * g, power: 2.5 },
      { p: [0.001, 0.055, -0.001], rx: 0.0405 * g, rz: 0.0142 * g, power: 2.7 },
      { p: [0.0005, 0.085, -0.002], rx: 0.0405 * g, rz: 0.0118 * g, power: 2.7 },
      { p: [0, 0.098, -0.003], rx: 0.037 * g, rz: 0.0098 * g, power: 2.6 },
    ],
    painter,
    { seg: opts.detail ? 16 : 10, start: "open", end: "round", dome: 0.5 },
  );
  // the ball of the thumb
  sc.ball([0.026, 0.034, -0.0075], 0.017 * g, 0.03, 0.013 * g, painter, opts.detail ? 10 : 6, opts.detail ? 6 : 4);
  const spread = pose.spread ?? 0;
  FINGERS.forEach((fg, i) => {
    const bones = [fg.len * 0.44, fg.len * 0.3, fg.len * 0.26];
    let p = new Vector3(fg.x * g, fg.y, -0.003);
    let ang = 0;
    const fan = (fg.x / 0.03) * 0.06; // fingers splay a little
    const pts: Station[] = [{ p: [p.x, p.y - 0.012, p.z + 0.001], rx: fg.r * g, rz: fg.r * g * 0.92 }];
    bones.forEach((len, k) => {
      ang += (pose.curl[k]! + spread * i) * rad;
      const d = new Vector3(Math.sin(fan) * Math.cos(ang), Math.cos(ang) * Math.cos(fan), -Math.sin(ang));
      const mid = p.clone().addScaledVector(d, len * 0.5);
      p = p.clone().addScaledVector(d, len);
      const taper = 1 - 0.07 * (k + 1);
      pts.push({ p: [mid.x, mid.y, mid.z], rx: fg.r * g * (taper + 0.035), rz: fg.r * g * (taper + 0.035) * 0.92 });
      if (k < 2) pts.push({ p: [p.x, p.y, p.z], rx: fg.r * g * taper, rz: fg.r * g * taper * 0.95 });
      else pts.push({ p: [p.x - d.x * 0.004, p.y - d.y * 0.004, p.z - d.z * 0.004], rx: fg.r * g * taper * 0.96, rz: fg.r * g * taper * 0.86 });
      if (k === 2 && opts.nail) {
        // the nail: a small plate on the back of the last joint
        const up = new Vector3(0, Math.sin(ang), Math.cos(ang));
        const c = mid.clone().addScaledVector(d, len * 0.18).addScaledVector(up, fg.r * g * taper * 0.8);
        const side = new Vector3(1, 0, 0);
        const hw = fg.r * g * 0.62, hl = len * 0.3;
        sc.sheet(3, 3, (a, b) => {
          const q = c.clone().addScaledVector(side, (a - 1) * hw).addScaledVector(d, (b - 1) * hl).addScaledVector(up, a === 1 ? 0.0009 : -0.0006);
          return [q.x, q.y, q.z];
        }, opts.nail, { thickness: 0.0006 });
      }
    });
    sc.sweep(pts, painter, { seg, front: [0, 0, 1], start: "open", end: "round", dome: 0.9 });
  });
  // thumb: out of the ball of the thumb, two visible joints
  const [out, inward, flex] = pose.thumb ?? [26, 24, 16];
  let p = new Vector3(0.031 * g, 0.03, -0.006);
  let d = new Vector3(Math.sin(out * rad) * Math.cos(inward * rad), Math.cos(out * rad) * Math.cos(inward * rad), -Math.sin(inward * rad)).normalize();
  const pts: Station[] = [{ p: [p.x - d.x * 0.012, p.y - d.y * 0.012, p.z - d.z * 0.012], rx: 0.0125 * g, rz: 0.0112 * g }];
  const lens = [0.022, 0.03, 0.025];
  const axis = new Vector3(-Math.cos(out * rad), Math.sin(out * rad), 0.25).normalize(); // the thumb bends across the palm
  lens.forEach((len, k) => {
    if (k > 0) d = d.clone().applyAxisAngle(axis, -flex * rad).normalize();
    p = p.clone().addScaledVector(d, len);
    const r = (0.0118 - 0.0012 * (k + 1)) * g;
    pts.push({ p: [p.x, p.y, p.z], rx: r, rz: r * 0.9 });
  });
  sc.sweep(pts, painter, { seg, front: [0, 0, 1], start: "open", end: "round", dome: 0.9 });
  if (opts.nail) {
    const up = new Vector3().crossVectors(axis, d).normalize();
    if (up.z < 0) up.multiplyScalar(-1);
    const c = p.clone().addScaledVector(d, -0.009).addScaledVector(up, 0.0079 * g);
    const side = new Vector3().crossVectors(d, up).normalize();
    sc.sheet(3, 3, (a, b) => {
      const q = c.clone().addScaledVector(side, (a - 1) * 0.0062 * g).addScaledVector(d, (b - 1) * 0.0075).addScaledVector(up, a === 1 ? 0.0009 : -0.0006);
      return [q.x, q.y, q.z];
    }, opts.nail, { thickness: 0.0006 });
  }
}

/* ------------------------------------------------------------------ */
/* Shoes                                                               */
/* ------------------------------------------------------------------ */

export type ShoeKind = "leather" | "trainer" | "clog" | "boot" | "slipper" | "bare";

/** A left shoe (or bare foot) in the foot's frame: the ankle joint at (0, ANKLE, 0), toes along +Z, the sole on y = 0. */
export function addShoe(sc: Sculpt, kind: ShoeKind, upper: Paint, sole: Paint, girth = 1): void {
  const g = 0.94 + 0.06 * girth;
  const tall = kind === "boot" ? 0.03 : 0;
  const soleH = kind === "bare" || kind === "slipper" ? 0.004 : kind === "clog" || kind === "trainer" ? 0.016 : 0.011;
  // the upper: heel to toe, a section across the foot at each station (front axis: up)
  const keys: [number, number, number, number, number][] = [
    // z, centre height, half-width, up, down
    [-0.068, 0.034, 0.028, 0.03, 0.026],
    [-0.045, 0.043, 0.039, 0.05 + tall, 0.036],
    [-0.005, 0.045, 0.044, 0.052 + tall, 0.039],
    [0.04, 0.042, 0.047, 0.04, 0.036],
    [0.085, 0.036, 0.0495, 0.03, 0.031],
    [0.13, 0.031, 0.049, 0.025, 0.027],
    [0.165, 0.028, 0.042, 0.021, 0.024],
    [0.182, 0.026, 0.03, 0.017, 0.021],
  ];
  const blunt = kind === "clog" ? 1.12 : 1;
  sc.sweep(
    keys.map(([z, y, rx, up, down], i) => ({ p: [0, y + soleH, z] as V3, rx: rx * g * (i > 4 ? blunt : 1), rz: up * (i > 3 ? blunt : 1), back: down, power: 2.6 })),
    upper,
    { seg: 12, front: [0, 1, 0], start: "round", end: "round", dome: 0.75 },
  );
  if (kind !== "bare") {
    sc.sweep(
      keys.map(([z, , rx], i) => ({ p: [0, soleH * 0.5, z * 1.02] as V3, rx: (rx + 0.004) * g * (i > 4 ? blunt : 1), rz: soleH * 0.5, power: 4 })),
      sole,
      { seg: 12, front: [0, 1, 0], start: "round", end: "round", dome: 0.6 },
    );
  }
  if (kind === "trainer") {
    // a toe cap and a heel tab of the sole's colour
    sc.ball([0, soleH + 0.02, 0.172], 0.03 * g, 0.014, 0.02, sole, 8, 4);
  }
}

/** The foot's frame for `addShoe`: the sole `ANKLE` below the ankle joint. */
export function footFrame(l: Limb): Matrix4 {
  // endFrame: X across, Y along the toes, Z opposite `face` — turn it so Y is up and Z the toes
  const z = new Vector3(...l.along).normalize();
  const y = new Vector3(...l.face);
  y.addScaledVector(z, -y.dot(z)).normalize();
  const x = new Vector3().crossVectors(y, z);
  const o = new Vector3(...l.end).addScaledVector(y, -ANKLE);
  return new Matrix4().makeBasis(x, y, z).setPosition(o);
}

/** The neck: from inside the trunk's top up into the head (`forward`: how far a pillow pushes the head). */
export function addNeck(sc: Sculpt, f: Frame, lift: number, painter: Painter, forward = 0): void {
  const k = 0.96 + 0.04 * f.wide + (f.wide > 1 ? (f.wide - 1) * 0.5 : 0);
  const top = PIVOT + lift + 0.04 * f.head;
  sc.sweep(
    [
      { p: [0, NECK - 0.03 + lift, -0.014], rx: 0.066 * k, rz: 0.059 * k, back: 0.065 * k },
      { p: [0, NECK + 0.014 + lift, -0.012 + forward * 0.2], rx: 0.0525 * k, rz: 0.052 * k, back: 0.058 * k },
      { p: [0, NECK + 0.055 + lift, -0.006 + forward * 0.6], rx: 0.0485 * k, rz: 0.05 * k, back: 0.055 * k },
      { p: [0, top, 0.002 + forward], rx: 0.0475 * k, rz: 0.049 * k, back: 0.054 * k },
    ],
    painter,
    { seg: 14, start: "open", end: "open" },
  );
}

/** A darker paint for the inside of a sleeve or a trouser leg seen at its hem. */
export function inside(p: Paint): Paint {
  return { rgb: shade(p.rgb, 0.45), gloss: 0 };
}
