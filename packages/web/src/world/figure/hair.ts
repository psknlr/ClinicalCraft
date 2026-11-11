/**
 * Hair on a head (`head.ts`). Hair is strands lying together in locks (`locks.ts`), over hair: an under-layer
 * close to the scalp, in shade, and over it the locks the eye reads — from a parting or the crown over the head,
 * each standing a little off it at the root, and where the hair is long enough on down past the head: beside the
 * face, onto the shoulders, before them over the collarbones or behind them down the back, thinning to points at
 * layered lengths, in waves if the style has them. Over the brow, a fringe of separate wisps the skin shows
 * between, or a curtain swept from the parting to either cheekbone; beside the face, the locks that frame it.
 * A band of light round the head where it turns from the top to the sides is the sheen of healthy hair.
 *
 * The styles: `long` (layered, from a parting, a curtain fringe), `wavy` (long loose waves under a wispy fringe,
 * a lock cut at the cheek beside each eye), `bob` (to the chin, a wispy fringe), `short` (cropped at the sides,
 * the top combed forward into a fringe — lower over the brow on a woman, a strand before each ear), `bun` and `ponytail` (drawn back to where it is tied, a light fringe and
 * a strand before each ear), `curly` (a soft perm). Under a cap only a close layer shows.
 */
import { Vector3 } from "three";
import { curve } from "./body.js";
import { EYE_Y, HEAD_CENTRE, hairlineAt, phiOfHeight, skullPoint, type FaceSpec } from "./head.js";
import { along, Locks, type LockLook, type LockPoint } from "./locks.js";
import { Sculpt, shade, type Cast, type Paint, type Painter, type Rgb, type V3 } from "./sculpt.js";
import { leaning, remembered } from "./skull.js";

export type HairStyle = "short" | "long" | "bald" | "bun" | "ponytail" | "curly" | "bob" | "wavy";

/** Whether a style's hair comes down over the ears. */
export function coversEars(style: HairStyle): boolean {
  return style === "long" || style === "wavy" || style === "bob" || style === "curly";
}

const NU = 40, NV = 9;

const gauss = (x: number, c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** A point of the scalp pushed `lift` out from the middle of the head. */
export function scalpPoint(theta: number, phi: number, face: FaceSpec, lift: number): V3 {
  const p = skullPoint(theta, phi, face);
  const dx = p.x - HEAD_CENTRE[0], dy = p.y - HEAD_CENTRE[1] + 0.01, dz = p.z - HEAD_CENTRE[2];
  const l = Math.hypot(dx, dy, dz) || 1;
  return [p.x + (dx / l) * lift, p.y + (dy / l) * lift, p.z + (dz / l) * lift];
}

/**
 * The paint of hair in a mass (a layer under locks, a cap's worth): its colour streaked a little round the head, a
 * soft band of light round the crown. `tone`: how light against the hair's own colour — one number, or by the
 * height above the head's centre (under locks hair is in their shade; on top of the head it is in the light).
 * `part`: a parting at that angle round the head, a fine darker line from the brow back over the top.
 */
export function hairPaint(hair: Rgb, tone: number | ((y: number) => number) = 1, part?: number): (x: number, y: number, z: number) => Paint {
  return (x, y, z) => {
    const a = Math.atan2(x - HEAD_CENTRE[0], z - HEAD_CENTRE[2]);
    const n = Math.sin(a * 23 + y * 55) * 0.5 + Math.sin(a * 41 + 1.3) * 0.5;
    const ring = Math.exp(-(((y - HEAD_CENTRE[1] - 0.09) / 0.016) ** 2));
    const k = typeof tone === "number" ? tone : tone(y - HEAD_CENTRE[1]);
    const line = part === undefined ? 0 : Math.exp(-(((a - part) / 0.028) ** 2)) * smoothstep(-0.03, 0.01, z - HEAD_CENTRE[2]);
    return { rgb: shade(hair, k * (0.93 + 0.08 * n + 0.34 * ring) * (1 - 0.3 * line)), gloss: 0.45 * k };
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

/** A number from 0 to 1 that is the same for the same `n` every time and has nothing to do with its neighbours'. */
const chance = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/* ------------------------------------------------------------------ */
/* Where hair can lie                                                  */
/* ------------------------------------------------------------------ */

/** What `scalpPoint` lifts from: the middle of the head. */
const MID = new Vector3(HEAD_CENTRE[0], HEAD_CENTRE[1] - 0.01, HEAD_CENTRE[2]);
const DOWN = new Vector3(0, -1, 0);

/**
 * The neck and the trunk under an adult's head, clothed, in the head's own frame: by height above the head's
 * joint, the half-width and the depth to the front and to the back (what long hair comes to lie on).
 */
const UNDER = curve([
  [-0.34, 0.176, 0.133, 0.119],
  [-0.26, 0.185, 0.134, 0.125],
  [-0.2, 0.193, 0.124, 0.124],
  [-0.16, 0.193, 0.109, 0.117],
  [-0.14, 0.178, 0.099, 0.11],
  [-0.12, 0.136, 0.085, 0.1],
  [-0.1, 0.094, 0.075, 0.088],
  [-0.085, 0.06, 0.058, 0.07],
  [-0.06, 0.047, 0.05, 0.057],
  [0, 0.045, 0.048, 0.055],
]);

/** The trunk under a face's head at `y` above the head's joint (a child's shoulders are nearer its larger head; a heavy build's are wider). */
function under(y: number, face: FaceSpec): [number, number, number] {
  const k = 0.965 / (0.965 + 0.535 * Math.pow(face.young, 1.6));
  const [w, f, b] = UNDER(y / k) as [number, number, number];
  const more = face.wide - 1;
  return [w * k * (1 + 0.45 * more), f * k * (1 + 1.1 * more), b * k * (1 + 0.65 * more)];
}

/** Which side of the shoulders hair that reaches them lies on (`any`: whichever it is nearer). */
type Drape = "front" | "back" | "any";

/**
 * Move a point of hanging hair out of the head, the neck and the trunk, to `off` over what it lies on; returns
 * the way the hair's outer face looks there.
 */
function settle(p: Vector3, face: FaceSpec, drape: Drape, off: number): Vector3 {
  const out = new Vector3(p.x - MID.x, 0, p.z - MID.z);
  const rel = p.y - HEAD_CENTRE[1];
  if (rel > -0.094) {
    // beside the head: no nearer its surface than `off`
    const theta = Math.atan2(p.x - HEAD_CENTRE[0], p.z - HEAD_CENTRE[2]);
    const s = skullPoint(theta, phiOfHeight(theta, Math.max(rel, -0.09), face), face);
    const have = Math.hypot(p.x - HEAD_CENTRE[0], p.z - HEAD_CENTRE[2]), need = Math.hypot(s.x - HEAD_CENTRE[0], s.z - HEAD_CENTRE[2]) + off;
    if (have < need && have > 1e-6) {
      p.x = HEAD_CENTRE[0] + ((p.x - HEAD_CENTRE[0]) * need) / have;
      p.z = HEAD_CENTRE[2] + ((p.z - HEAD_CENTRE[2]) * need) / have;
    }
  }
  if (p.y < 0) {
    // past the jaw: outside the neck, and on the shoulders before or behind the trunk
    const front = drape === "front" || (drape === "any" && p.z > -0.012);
    const [w, f, b] = under(p.y, face);
    const depth = front ? f : b;
    const ax = Math.abs(p.x);
    if (ax < w + off) {
      const reach = depth * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, ax / (w + off)), 2.35)), 1 / 2.35) + off;
      if (front) p.z = Math.max(p.z, reach);
      else p.z = Math.min(p.z, -reach);
      const flat = smoothstep(0, 0.05, -p.y);
      out.set(lerp(out.x, (p.x / w) * 0.5, flat), 0, lerp(out.z, front ? 1 : -1, flat));
    }
  }
  return out.lengthSq() > 1e-10 ? out.normalize() : out.set(0, 0, 1);
}

/* ------------------------------------------------------------------ */
/* Locks: over the head, and falling                                   */
/* ------------------------------------------------------------------ */

/** A point of a lock that lies over the scalp. */
function onScalp(theta: number, phi: number, face: FaceSpec, lift: number, width: number, round = 1, deep = 0): LockPoint {
  const p = new Vector3(...scalpPoint(theta, phi, face, lift));
  // (a lock is never deeper than to the scalp under it)
  return { p, out: p.clone().sub(MID).normalize(), width, round, deep: Math.min(deep, Math.max(0, lift) + 0.001) };
}

/** A point of a lock that lies over the head at a height above its centre (the brow, the temples, the cheeks). */
function onHead(theta: number, y: number, face: FaceSpec, lift: number, width: number, round = 1): LockPoint {
  return onScalp(theta, phiOfHeight(theta, y, face), face, lift, width, round);
}

/** How a lock falls once it has left the head. */
interface Fall {
  /** How long it hangs free (m), in how many steps. */
  length: number;
  steps: number;
  drape: Drape;
  /** How far over what it lies on (m). */
  off: number;
  /** Its width along the fall against its width where it left the head (`s` 0 … 1). */
  width: (s: number) => number;
  /** Waves: how far to either side (m), how many along the fall, and where the first begins (radians). */
  wave?: number;
  waves?: number;
  phase?: number;
  /** Its end turns out (+) or in (−) by this much (m). */
  curl?: number;
  /** How soon it hangs straight (0 keeps the way it left the head … 1 at once; default 0.45). */
  limp?: number;
}

/** Let the lock `path` fall from its last point (see `Fall`): the points are added to it. */
function fall(path: LockPoint[], face: FaceSpec, f: Fall): void {
  const last = path[path.length - 1]!, before = path[path.length - 2]!;
  const dir = last.p.clone().sub(before.p).normalize();
  const p = last.p.clone(), prev = new Vector3(), side = new Vector3();
  const ds = f.length / f.steps;
  for (let k = 1; k <= f.steps; k++) {
    const s = k / f.steps;
    // however it left the head, hair soon hangs straight — and makes for the side of the shoulders it will lie on
    dir.lerp(DOWN, f.limp ?? 0.45);
    if (f.drape !== "any" && p.y < 0.03 && p.y > -0.16) dir.z += (f.drape === "front" ? 0.42 : -0.3) * smoothstep(0.03, -0.05, p.y);
    dir.normalize();
    prev.copy(p);
    p.addScaledVector(dir, ds);
    const out = settle(p, face, f.drape, f.off);
    dir.copy(p).sub(prev).normalize();
    const drawn = p.clone();
    if (f.wave) {
      // waves grow down the hair: little at the head, full at the ends
      const grow = smoothstep(0, 0.45, s), a = (f.phase ?? 0) + s * (f.waves ?? 2) * Math.PI * 2;
      side.crossVectors(dir, out).normalize();
      drawn.addScaledVector(side, f.wave * grow * Math.sin(a)).addScaledVector(out, f.wave * 0.55 * grow * (1 + Math.cos(a)));
    }
    if (f.curl) drawn.addScaledVector(out, f.curl * Math.pow(Math.max(0, (s - 0.62) / 0.38), 2));
    path.push({ p: drawn, out, width: last.width * f.width(s) });
  }
}

/** How light a lock is along and across it: darker at the root and the edges, the sheen where it passes the turn of the head; `tone` its own. */
function lightOf(path: readonly LockPoint[], tone: number): NonNullable<LockLook["light"]> {
  const n = path.length;
  const sheen = path.map((q) => Math.exp(-(((q.p.y - HEAD_CENTRE[1] - 0.076) / 0.024) ** 2)));
  return (t, a) => tone * (0.78 + 0.22 * smoothstep(0, 0.16, t)) * (1 + 0.5 * sheen[Math.round(t * (n - 1))]!) * (1 - 0.2 * a * a);
}

/** The usual thinning of a free lock: full for the first third, a third of that near its end, then its point. */
const toPoint = (s: number) => (s < 0.88 ? 1 - 0.66 * smoothstep(0.34, 0.88, s) : 0.34 * (1 - 0.85 * ((s - 0.88) / 0.12)));
/** The thinning of a long lock: full most of its length, then to its point. */
const toLongPoint = (s: number) => (s < 0.93 ? 1 - 0.62 * smoothstep(0.58, 0.93, s) : 0.38 * (1 - 0.85 * ((s - 0.93) / 0.07)));
/** A lock cut straight: hardly thinner to its end, which is rounded off. */
const cutBlunt = (s: number) => (s < 0.9 ? 1 - 0.3 * smoothstep(0.5, 0.9, s) : 0.7 * (1 - 0.8 * ((s - 0.9) / 0.1)));

/** A head of hair as a cut gives it (see `mane`). */
interface Cut {
  /** Where the parting is (round the head from the face), or `null`: the hair radiates from the crown. */
  part: number | null;
  /** The hair beside the face begins this far round the head (the fringe and what frames the face are before it). */
  from: number;
  /** Locks a side in a layer, and layers (the upper ones shorter). */
  per: number;
  layers: number;
  /** How thick the hair lies over the scalp (m): `s` 0 at the crown … 1 at the hairline. The layer under the locks is this, less a little; the locks lie on it. */
  body: (theta: number, s: number) => number;
  /** How far below the hairline the hair on the head ends (m), by how far round the head. */
  drop?: (theta: number) => number;
  /** Where the hair leaves the head: height above its centre by how far round the head. */
  leave: (a: number) => number;
  /** How long it hangs from there (m) by how far round the head, in a layer; 0: it ends on the head. */
  length: (a: number, layer: number) => number;
  /** Which side of the shoulders it lies on. */
  drape: (a: number) => Drape;
  wave?: number;
  waves?: number;
  curl?: number;
  /** How far over what it lies on it hangs (m; default 0.006). */
  off?: number;
  /** How far forward of the crown hair that radiates from it is rooted (the polar angle; default 0.12). */
  crown?: number;
  /** How broad a lock is against the room it has (they overlap: default 2.1), and whether its end is cut straight. */
  broad?: number;
  blunt?: boolean;
}

/** The polar angle at which a cut's hair on the head ends, round at `theta`. */
function edgeOf(face: FaceSpec, cut: Cut, theta: number): number {
  return phiOfHeight(theta, hairlineAt(theta, face) - (cut.drop?.(theta) ?? 0), face);
}

/** The layer under a cut's locks: close under them, in their shade. Returns the height of its top above the head's joint. */
function underLayer(sc: Sculpt, face: FaceSpec, painter: Painter, cut: Cut): number {
  return addScalpShell(sc, face, painter, (theta, s) => Math.max(0.002, cut.body(theta, s) - 0.001), cut.drop);
}

/**
 * The locks of a cut, from the parting (or the crown) over the head to where the hair leaves it and on down: for
 * each a root, its way over the scalp — fullest a third of the way — and its fall.
 */
function mane(locks: Locks, face: FaceSpec, hair: Rgb, cut: Cut): void {
  const span = Math.PI - cut.from;
  for (let layer = 0; layer < cut.layers; layer++) {
    for (const s of [-1, 1]) {
      for (let k = 0; k < cut.per; k++) {
        const id = layer * 97 + k * 2 + (s > 0 ? 1 : 0);
        // the layers' locks lie between one another's
        const a = cut.from + (span * (k + (layer % 2 ? 0.5 : 0) + 0.12 * (chance(id) - 0.5))) / (cut.per - 0.5);
        if (a > Math.PI - 0.02 && s < 0) continue;
        const exit = s * Math.min(a, Math.PI);
        // rooted on the parting for the hair of the top and the sides, at the crown for the hair of the back
        const back = cut.part === null ? 1 : smoothstep(1.85, 2.45, a);
        // (at a parting the hair of either side begins on its line; from a crown it comes out of the hair there)
        const parted = cut.part !== null ? 1 - back : 0;
        const rootTheta = lerp((cut.part ?? 0) + s * 0.02, exit, back);
        const rootPhi = cut.part === null ? (cut.crown ?? 0.12) + 0.08 * chance(id + 23) : lerp(lerp(0.58, 0.16, clamp((a - cut.from) / (2.0 - cut.from), 0, 1)), 0.09 + 0.1 * chance(id + 23), back);
        const leavePhi = phiOfHeight(exit, cut.leave(a), face);
        const wide = ((0.088 * span) / cut.per) * (cut.broad ?? 1.7) * (1 - 0.1 * layer) * (0.85 + 0.3 * chance(id + 5));
        // how far down from the crown towards the hairline its root and its leaving are
        const sRoot = rootPhi / edgeOf(face, cut, rootTheta), sLeave = Math.min(1, leavePhi / edgeOf(face, cut, exit));
        const path: LockPoint[] = [];
        const lifts: number[] = [];
        const n = 6;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const theta = lerp(rootTheta, exit, Math.pow(t, 0.8));
          // at a parting it begins on the hair as a point on the line and fans out from it; from a crown it comes out
          // of the hair, fine at first — then it lies on it, the upper layers a little over the lower
          const rise = smoothstep(0, 0.2, t);
          const lift = cut.body(theta, lerp(sRoot, sLeave, t)) - (0.004 * (1 - parted) + 0.0011 * parted) * (1 - rise) + 0.0006 + (0.0006 + 0.0018 * smoothstep(0.5, 1, t)) * layer * (parted ? rise : 1);
          const broad = lerp(0.26 + 0.74 * smoothstep(0, 0.42, t), 0.1 + 0.9 * smoothstep(0, 0.36, t), parted);
          lifts.push(lift);
          // (combed flat on the head — the layers nearly level there — rounder as it comes to leave it)
          path.push(onScalp(theta, lerp(rootPhi, leavePhi, t), face, lift, wide * broad, 0.18 + 0.82 * smoothstep(0.55, 1, t), lerp(0.0035 + 0.001 * layer, 0.0004 + (0.0031 + 0.001 * layer) * rise, parted)));
        }
        const length = cut.length(a, layer) * (0.9 + 0.2 * chance(id + 11));
        if (length <= 0.004) {
          // cropped: it ends on the head, thinning into the hair under it
          for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            path[i]!.width *= 1 - 0.5 * smoothstep(0.62, 1, t);
            // (into the hair under it, not into the head)
            const dip = Math.min(0.004 * smoothstep(0.6, 1, t), Math.max(0, lifts[i]! - 0.0004));
            path[i]!.p.addScaledVector(path[i]!.out, -dip);
            path[i]!.deep = Math.min(path[i]!.deep ?? 0, lifts[i]! - dip + 0.001);
          }
        }
        if (length > 0.004) {
          fall(path, face, {
            length,
            steps: Math.max(3, Math.min(7, Math.round(length / 0.03))),
            drape: cut.drape(a),
            off: (cut.off ?? 0.006) + 0.0026 * layer,
            width: cut.blunt ? cutBlunt : length > 0.12 ? toLongPoint : toPoint,
            // (waves run round the head together, as a brush leaves them: neighbours nearly in step)
            ...(cut.wave ? { wave: cut.wave * (0.85 + 0.3 * chance(id + 3)), waves: cut.waves ?? 2, phase: chance(id + 7) * 0.5 + 0.35 * layer + (s > 0 ? 0 : Math.PI) } : {}),
            ...(cut.curl ? { curl: cut.curl * (0.6 + 0.8 * chance(id + 13)) } : {}),
          });
        }
        // (as broad as it is, it is round with the head: its edges lie as far under its middle as the head falls away)
        locks.add(path, hair, { light: lightOf(path, 0.86 + 0.24 * chance(id + 17) + 0.05 * layer), arch: 0.12, sink: 0.04, closed: 0.07 });
      }
    }
  }
}

/**
 * The mass of hair under the locks of long hair: from above the ears round the back, down to `bottom(a)` above
 * the head's joint (the locks lie on it, so what shows between them is hair in shade, not air).
 */
function mass(sc: Sculpt, face: FaceSpec, painter: Painter, cut: Cut, from: number, bottom: (a: number) => number): void {
  const nu = 19, steps = 6;
  const grid: V3[][] = [];
  for (let i = 0; i < nu; i++) {
    const theta = from + (i / (nu - 1)) * (Math.PI * 2 - 2 * from);
    const a = theta > Math.PI ? Math.PI * 2 - theta : theta;
    const leave = cut.leave(a);
    const path: LockPoint[] = [onHead(theta, leave + 0.035, face, 0.002, 1), onHead(theta, leave, face, Math.max(0.003, cut.body(theta, 1) - 0.004), 1)];
    fall(path, face, { length: Math.max(0.02, leave + HEAD_CENTRE[1] - bottom(a)), steps, drape: cut.drape(a) === "front" ? "back" : cut.drape(a), off: 0.0015, width: () => 1 });
    grid.push(path.map((q) => [q.p.x, q.p.y, q.p.z]));
  }
  // (a mass has its body where it hangs; on the head it is a thin layer)
  sc.sheet(nu, steps + 2, (i, j) => grid[i]![j]!, painter, { thickness: (_i, j) => (j === 0 ? 0.0012 : j === 1 ? 0.004 : 0.011), flip: true });
}

/* ------------------------------------------------------------------ */
/* Over the brow and beside the face                                   */
/* ------------------------------------------------------------------ */

/**
 * A fringe of wisps: locks that begin in the hair of the top, come forward over the hairline — fullest there —
 * and down the brow. Broad ones lie side by side, cut near straight at uneven lengths, with here and there a gap
 * the skin shows through; fine ones lie over them, a little longer. `from` … `to`: where they end across the brow
 * (angles); `tip(u)`: how high over the head's centre they end; `sweep`: how far round the head they are combed on
 * the way; `over`: how thick the hair they come out of is.
 */
function wisps(locks: Locks, face: FaceSpec, hair: Rgb, opts: { from: number; to: number; count: number; tip: (u: number) => number; over: number; sweep?: number; width?: number; lift?: number; gaps?: number }): void {
  const sweep = opts.sweep ?? 0;
  const span = Math.abs(opts.to - opts.from) * 0.075;
  const one = (u: number, fine: boolean, id: number): void => {
    const end = lerp(opts.from, opts.to, u) + 0.05 * (chance(id * 19 + 6) - 0.5);
    const line = hairlineAt(end * 0.9 - sweep * 0.4, face);
    const tip = opts.tip(u) + 0.008 * (chance(id * 7 + 2) - 0.5) - (fine ? 0.003 : 0);
    const wide = fine ? 0.0045 * (0.7 + 0.6 * chance(id * 5 + 3)) : (opts.width ?? (span / opts.count) * 1.25) * (0.85 + 0.3 * chance(id * 5 + 3));
    const lift = (opts.lift ?? 0.0095) + (fine ? 0.0016 : 0);
    // how much of its breadth a broad lock keeps to its end (the rest is the skin showing between the ends)
    const ends = 0.42 + 0.3 * chance(id * 11 + 4);
    // (as a line through: round the head, height over its centre, how far off it)
    const through = [
      new Vector3(end * 0.5 - sweep, 0.098, opts.over - 0.003),
      new Vector3(end * 0.72 - sweep * 0.8, line + 0.026, opts.over + 0.001 + (fine ? 0.0012 : 0)),
      new Vector3(end * 0.9 - sweep * 0.4, line, lift),
      new Vector3(end * 0.97 - sweep * 0.1, lerp(line, tip, 0.56), lift * 0.62),
      new Vector3(end, tip, 0.0026 + (fine ? 0.001 : 0)),
    ];
    const n = 9;
    const path = along(through, n).map((c, k) => {
      const t = k / (n - 1);
      // broad over the head (it is the hair there), then a lock, then its end: a fine one to a point, a broad one cut near straight
      const width = fine ? wide * (t < 0.3 ? 1 : toPoint((t - 0.3) / 0.7)) : wide * (t < 0.45 ? 1.4 - 0.4 * smoothstep(0.2, 0.45, t) : 1 - (1 - ends) * smoothstep(0, 0.75, (t - 0.45) / 0.55)) * (t > 0.94 ? 0.4 : 1);
      return onHead(c.x, c.y, face, c.z, width, t < 0.4 ? 0.3 : 1);
    });
    locks.add(path, hair, { light: lightOf(path, 0.9 + 0.2 * chance(id + 31)), closed: fine ? 0.4 : 0.14, arch: fine ? 0.3 : 0.11, sink: fine ? 0 : 0.05 });
  };
  for (let i = 0; i < opts.count; i++) {
    // (a gap here and there)
    if ((opts.gaps ?? 0) > 0 && chance(i * 13 + 5) < (opts.gaps ?? 0) && i > 0 && i < opts.count - 1) continue;
    one((i + 0.5 + 0.3 * (chance(i * 3 + 1) - 0.5)) / opts.count, false, i);
  }
  const fine = Math.max(3, Math.round(opts.count * 0.7));
  for (let i = 0; i < fine; i++) one((i + 0.5 + 0.7 * (chance(i * 17 + 9) - 0.5)) / fine, true, 40 + i);
}

/**
 * A curtain fringe: from the parting, behind the hairline, broad locks swept out over it and down either side of
 * the brow — standing off the forehead on the way and in again at their ends, the shortest ending over the brow
 * near the middle, the longest at the cheekbone (`drop` below the eyes, `reach` round the head).
 */
function curtain(locks: Locks, face: FaceSpec, hair: Rgb, opts: { part: number; reach: number; drop: number; count?: number; lift?: number; width?: number }): void {
  const count = opts.count ?? 3;
  const edge = (theta: number) => hairlineAt(theta, face);
  for (const s of [-1, 1]) {
    for (let j = 0; j < count; j++) {
      const v = count > 1 ? j / (count - 1) : 1;
      const id = j * 2 + (s > 0 ? 1 : 0);
      const lift = (opts.lift ?? 0.0115) * (0.8 + 0.2 * v);
      // (as a line through: round the head, height over its centre, how far off it)
      const cross = opts.part + s * lerp(0.1, 0.42, v), end = s * (lerp(0.42, opts.reach, v) + 0.05 * (chance(id + 41) - 0.5));
      const yEnd = EYE_Y + lerp(0.028, -opts.drop, v) + 0.005 * (chance(id + 43) - 0.5);
      const through = [
        new Vector3(opts.part + s * 0.02, edge(opts.part) + lerp(0.022, 0.05, v), 0.001),
        new Vector3(lerp(opts.part, cross, 0.55), edge(cross) + lerp(0.014, 0.022, v), lift * 0.8),
        new Vector3(cross, edge(cross) - 0.004, lift),
        new Vector3(lerp(cross, end, 0.62), lerp(edge(cross), yEnd, 0.5), lift * 0.82),
        new Vector3(end, yEnd, 0.0045),
        new Vector3(end + s * 0.07, yEnd - 0.014, 0.0035),
      ];
      const wide = (opts.width ?? 0.024) * (0.85 + 0.3 * chance(id + 47)) * (0.8 + 0.2 * v);
      const n = 10;
      const path = along(through, n).map((c, k) => {
        const t = k / (n - 1);
        return onHead(c.x, c.y, face, c.z, wide * (t < 0.22 ? 0.6 + (0.4 * t) / 0.22 : toPoint((t - 0.22) / 0.78)));
      });
      locks.add(path, hair, { light: lightOf(path, 0.92 + 0.18 * chance(id + 53)), closed: 0.18, arch: 0.15 });
    }
  }
}

/**
 * The locks that frame a face: from the temple down beside the cheek, `length` long (to the cheek, the jaw, the
 * collarbone); `blunt`: cut straight across instead of thinning to a point.
 */
function tresses(locks: Locks, face: FaceSpec, hair: Rgb, opts: { at: number; length: (j: number) => number; count: number; width?: number; wave?: number; waves?: number; curl?: number; blunt?: boolean; drape?: Drape }): void {
  for (const s of [-1, 1]) {
    for (let j = 0; j < opts.count; j++) {
      const id = j * 2 + (s > 0 ? 1 : 0);
      const at = s * (opts.at + 0.09 * j);
      const top = hairlineAt(at, face);
      const wide = (opts.width ?? 0.021) * (0.85 + 0.3 * chance(id + 61));
      const path: LockPoint[] = [onHead(at - s * 0.05, top + 0.022, face, 0.003, wide * 0.6), onHead(at, top + 0.004, face, 0.0085, wide * 0.85), onHead(at + s * 0.03, top - 0.022, face, 0.0075, wide)];
      const length = opts.length(j) * (0.94 + 0.12 * chance(id + 67));
      fall(path, face, {
        length,
        steps: Math.max(4, Math.min(10, Math.round(length / 0.02))),
        drape: opts.drape ?? "front",
        off: 0.0055,
        limp: 0.6,
        width: opts.blunt ? cutBlunt : length > 0.12 ? toLongPoint : toPoint,
        ...(opts.wave ? { wave: opts.wave, waves: opts.waves ?? 1.5, phase: s > 0 ? 0.4 : 0.4 + Math.PI } : {}),
        ...(opts.curl ? { curl: opts.curl } : {}),
      });
      locks.add(path, hair, { light: lightOf(path, 0.9 + 0.2 * chance(id + 71)), closed: 0.17, arch: 0.15 });
    }
  }
}

/** The direction from the middle of the head that `skullPoint` takes for two angles, and the angles of a direction. */
const dirOf = (theta: number, phi: number) => new Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta));
const anglesOf = (d: Vector3): [number, number] => [Math.atan2(d.x, d.z), Math.acos(clamp(d.y / d.length(), -1, 1))];

/**
 * Hair drawn back over the head to where it is tied (`tie`: round the head and down from the crown): locks from
 * all round the hairline, each the short way over the head to the tie — over the top from the brow, round above
 * the ears from the temples, up from the nape — broad enough to lie against one another: the comb's lines.
 */
function drawnBack(locks: Locks, face: FaceSpec, hair: Rgb, tie: readonly [number, number], body: number): void {
  const count = 30;
  const to = dirOf(tie[0], tie[1]);
  for (let k = 0; k < count; k++) {
    const theta = -Math.PI + ((k + 0.5 + 0.3 * (chance(k + 81) - 0.5)) / count) * Math.PI * 2;
    const from = dirOf(theta, phiOfHeight(theta, hairlineAt(theta, face) + 0.003, face));
    const angle = from.angleTo(to);
    if (angle < 0.25) continue;
    const wide = clamp(0.03 * Math.sin(Math.min(angle, 2.2) / 2), 0.012, 0.03) * (0.85 + 0.3 * chance(k + 83));
    const path: LockPoint[] = [];
    const n = Math.max(4, Math.min(9, Math.round(angle / 0.3)));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      // (the short way round between two directions)
      const sin = Math.sin(angle);
      const d = from.clone().multiplyScalar(Math.sin((1 - t) * angle) / sin).addScaledVector(to, Math.sin(t * angle) / sin);
      const [th, ph] = anglesOf(d);
      // fine at the hairline, broadest over the head, gathered at the tie
      path.push(onScalp(th, ph, face, body * (0.5 + 0.5 * Math.sin(Math.min(1, t * 2.2) * Math.PI * 0.5)) + 0.0008, wide * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.5)) * (1 - 0.6 * smoothstep(0.7, 1, t)), 0.35, 0.0035));
    }
    locks.add(path, hair, { light: lightOf(path, 0.86 + 0.24 * chance(k + 89)), arch: 0.1, sink: 0.07, closed: 0.07 });
  }
}

/* ------------------------------------------------------------------ */
/* The styles                                                          */
/* ------------------------------------------------------------------ */

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
  if (opts.capped) return addScalpShell(sc, face, hairPaint(hair), () => 0.0035);
  if (opts.infant) return addScalpShell(sc, face, hairPaint(hair), (_t, s) => 0.004 * (1 - 0.3 * s));
  // the layer under the locks: close under them — in their shade below, in the light on top of the head, where it shows between their roots
  const shaded = (y: number) => 0.7 + 0.16 * smoothstep(0.03, 0.075, y);
  const below = hairPaint(hair, shaded);
  const locks = new Locks();
  const e = EYE_Y - 0.012 * face.young;
  let crown = top;
  // (a child's hair is cut a little shorter for its smaller shoulders)
  const grown = 1 - 0.3 * face.young;
  /** Hair that stands `full` off the scalp where it is fullest (round the top of the head), less at the crown and towards the hairline. */
  const bodyOf = (full: number, crownShare = 0.6) => (_theta: number, s: number) => full * (crownShare + (1 - crownShare) * Math.sin(Math.min(1, s * 1.7) * Math.PI * 0.5)) * (1 - 0.14 * s * s);
  switch (style) {
    case "long": {
      // layered, from a parting a little to one side: a curtain fringe to the cheekbones, lengths before the
      // shoulders to the collarbones and behind them down the back
      const part = 0.12;
      const cut: Cut = {
        part,
        from: 1.12,
        per: 10,
        layers: 2,
        body: bodyOf(0.0125),
        drop: (t) => 0.012 * gauss(Math.abs(t), 1.45, 0.45),
        leave: (a) => 0.012 - 0.05 * smoothstep(1.7, 2.9, a),
        length: (a, layer) => (0.2 + 0.07 * smoothstep(1.5, 2.6, a) - 0.045 * layer) * grown,
        drape: (a) => (a < 1.5 ? "front" : "back"),
        wave: 0.0035,
        waves: 1.1,
        curl: -0.006,
      };
      crown = underLayer(sc, face, hairPaint(hair, shaded, cut.part ?? undefined), cut) + 0.004;
      mass(sc, face, below, cut, 1.35, (a) => (-0.13 - 0.09 * smoothstep(1.6, 2.6, a)) * grown);
      mane(locks, face, hair, cut);
      curtain(locks, face, hair, { part, reach: 1.04, drop: 0.034 });
      tresses(locks, face, hair, { at: 1.0, count: 2, length: (j) => (0.19 + 0.06 * j) * grown, width: 0.026, wave: 0.004, waves: 1.2, curl: -0.005 });
      break;
    }
    case "wavy": {
      // long loose waves from a middle parting, under a fringe of wisps over the brows; beside each eye a lock cut at the cheek
      const cut: Cut = {
        part: 0,
        from: 1.12,
        per: 10,
        layers: 2,
        body: bodyOf(0.0135),
        drop: (t) => 0.012 * gauss(Math.abs(t), 1.45, 0.45),
        leave: (a) => 0.012 - 0.05 * smoothstep(1.7, 2.9, a),
        length: (a, layer) => (0.21 + 0.07 * smoothstep(1.5, 2.6, a) - 0.04 * layer) * grown,
        drape: (a) => (a < 1.5 ? "front" : "back"),
        wave: 0.0125,
        waves: 1.6,
        curl: 0.005,
      };
      crown = underLayer(sc, face, cut.part === null ? below : hairPaint(hair, shaded, cut.part), cut) + 0.004;
      mass(sc, face, below, cut, 1.35, (a) => (-0.13 - 0.09 * smoothstep(1.6, 2.6, a)) * grown);
      mane(locks, face, hair, cut);
      wisps(locks, face, hair, { from: -0.66, to: 0.66, count: 7, over: 0.0125, tip: (u) => e + 0.019 - 0.008 * Math.pow(Math.abs(2 * u - 1), 2) });
      tresses(locks, face, hair, { at: 0.84, count: 1, length: () => 0.08, width: 0.022, blunt: true, drape: "any" });
      tresses(locks, face, hair, { at: 1.02, count: 2, length: (j) => (0.2 + 0.05 * j) * grown, width: 0.026, wave: 0.01, waves: 1.6, curl: 0.004 });
      break;
    }
    case "bob": {
      // to the chin all round, cut straight, the ends turned a little in; a fringe of wisps, a strand before each ear
      const cut: Cut = {
        part: 0.1,
        from: 1.05,
        per: 10,
        layers: 2,
        body: bodyOf(0.0135),
        drop: (t) => 0.016 * gauss(Math.abs(t), 1.5, 0.5) + 0.012 * gauss(Math.abs(t), Math.PI, 0.9),
        leave: (a) => 0.014 - 0.035 * smoothstep(1.7, 2.9, a),
        length: (a, layer) => 0.086 + 0.01 * smoothstep(1.6, 2.6, a) - 0.014 * layer - 0.012 * face.young,
        drape: () => "any",
        curl: -0.008,
        off: 0.0075,
        blunt: true,
      };
      crown = underLayer(sc, face, cut.part === null ? below : hairPaint(hair, shaded, cut.part), cut) + 0.004;
      mass(sc, face, below, cut, 1.2, (a) => cut.leave(a) + HEAD_CENTRE[1] - 0.8 * cut.length(a, 0));
      mane(locks, face, hair, cut);
      wisps(locks, face, hair, { from: -0.68, to: 0.68, count: 7, over: 0.0125, tip: (u) => e + 0.019 - 0.009 * Math.pow(Math.abs(2 * u - 1), 2) });
      tresses(locks, face, hair, { at: 0.9, count: 1, length: () => 0.078, width: 0.013, curl: -0.004, drape: "any" });
      break;
    }
    case "curly": {
      // a soft perm to the jaw: full, in close waves
      const cut: Cut = {
        part: -0.14,
        from: 1.0,
        per: 8,
        layers: 2,
        body: bodyOf(0.019, 0.7),
        drop: (t) => 0.014 * gauss(Math.abs(t), 1.5, 0.5) + 0.01 * gauss(Math.abs(t), Math.PI, 0.9),
        leave: (a) => 0.02 - 0.04 * smoothstep(1.7, 2.9, a),
        length: (a, layer) => 0.075 + 0.02 * smoothstep(1.6, 2.6, a) - 0.018 * layer - 0.012 * face.young,
        drape: () => "any",
        wave: 0.0085,
        waves: 2.2,
        curl: 0.005,
        off: 0.011,
        blunt: true,
      };
      crown = underLayer(sc, face, cut.part === null ? below : hairPaint(hair, shaded, cut.part), cut) + 0.004;
      mass(sc, face, below, cut, 1.2, (a) => cut.leave(a) + HEAD_CENTRE[1] - 0.8 * cut.length(a, 0));
      mane(locks, face, hair, cut);
      wisps(locks, face, hair, { from: -0.7, to: 0.6, count: 6, over: 0.018, tip: (u) => e + 0.03 - 0.008 * Math.pow(Math.abs(2 * u - 1), 2), sweep: 0.12, lift: 0.014 });
      break;
    }
    case "ponytail":
    case "bun": {
      // drawn back sleek to where it is tied, the comb's lines running there; a light fringe, a strand before each ear
      const low = style === "bun";
      crown = addScalpShell(sc, face, below, (_t, s) => 0.0065 * (1 - 0.25 * s), (t) => 0.002 * gauss(Math.abs(t), 1.5, 0.3)) + 0.004;
      const tiePhi = phiOfHeight(Math.PI, low ? -0.03 : 0.014, face);
      drawnBack(locks, face, hair, [Math.PI, tiePhi], 0.0075);
      const root = scalpPoint(Math.PI, tiePhi, face, 0.01);
      const band: Paint = { rgb: [0.03, 0.03, 0.04], gloss: 0.15 };
      const tied = hairPaint(hair);
      if (low) {
        // a low chignon, the hair wound round it, a band round its base
        sc.ball([root[0], root[1] - 0.004, root[2] - 0.024], 0.035, 0.031, 0.03, (x, y, z) => {
          const p = tied(x, y, z);
          return { ...p, rgb: shade(p.rgb, 0.9 + 0.16 * Math.sin((y - root[1]) * 420 + Math.atan2(x - root[0], z - root[2] + 0.024) * 3)) };
        }, 18, 10);
        sc.ball([root[0], root[1] - 0.004, root[2] - 0.004], 0.022, 0.02, 0.012, band, 12, 5);
        // a light fringe of wisps combed to one side
        wisps(locks, face, hair, { from: 0.62, to: -0.6, count: 6, gaps: 0.25, over: 0.0075, tip: (u) => e + 0.03 - 0.012 * u, sweep: 0.2 });
      } else {
        // the tail: locks from the band down the back, their ends at uneven lengths
        const from = new Vector3(root[0], root[1] - 0.002, root[2] - 0.012);
        for (let k = 0; k < 9; k++) {
          const a = (k / 8) * Math.PI * 2, r = k === 0 ? 0 : 0.009;
          const start = from.clone().add(new Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.6, 0));
          const back = new Vector3(Math.cos(a) * 0.14, 0.1 + Math.sin(a) * 0.12, -1).normalize();
          const out = k === 0 ? new Vector3(0, 0.3, -1).normalize() : new Vector3(Math.cos(a), Math.sin(a) * 0.5, -0.6).normalize();
          const path: LockPoint[] = [{ p: start, out: out.clone(), width: 0.022 }, { p: start.clone().addScaledVector(back, 0.024).add(new Vector3(0, -0.004, 0)), out: out.clone(), width: 0.03 }];
          fall(path, face, { length: (0.19 + 0.05 * chance(k + 101)) * grown, steps: 7, drape: "any", off: 0.004 + 0.003 * (k % 3), limp: 0.52, width: toLongPoint, wave: 0.0035, waves: 1, phase: k, curl: 0.005 });
          locks.add(path, hair, { light: lightOf(path, 0.86 + 0.24 * chance(k + 103)), closed: 0.2, arch: 0.16 });
        }
        sc.sweep([{ p: [root[0], root[1] - 0.001, root[2] - 0.006], rx: 0.0185, rz: 0.017 }, { p: [root[0], root[1] - 0.004, root[2] - 0.019], rx: 0.019, rz: 0.0175 }], band, { seg: 12, front: [0, 0, -1], start: "flat", end: "flat" });
        // a curtain fringe from an off-centre parting
        curtain(locks, face, hair, { part: -0.14, reach: 0.92, drop: 0.022, lift: 0.009, width: 0.02 });
      }
      // fine strands left out in front of the ears
      tresses(locks, face, hair, { at: 1.06, count: 1, length: () => 0.042, width: 0.0095, curl: -0.003, drape: "any" });
      break;
    }
    default: {
      // short: full on top, close at the sides and the nape — combed from the crown forward into a fringe, and down
      // the sides and the back to the hairline, where it thins away
      const cut: Cut = {
        part: null,
        crown: 0.3,
        from: 0.8,
        per: 9,
        layers: 2,
        body: (t, s) => 0.0125 * (1 - 0.72 * Math.pow(s, 1.5)) * (1 - 0.18 * Math.sin(t) ** 2),
        drop: (t) => 0.002 * Math.sin(t * 9),
        leave: (a) => hairlineAt(a, face) + 0.004,
        length: () => 0,
        drape: () => "any",
        broad: 1.9,
      };
      crown = underLayer(sc, face, hairPaint(hair, 0.86), cut) + 0.004;
      mane(locks, face, hair, cut);
      // (a woman's crop is a pixie: its fringe comes lower over the brow, and a fine strand lies before each ear)
      const pixie = Math.max(0, leaning(face));
      wisps(locks, face, hair, { from: 0.66, to: -0.7, count: 6, over: 0.011, tip: (u) => e + 0.034 - 0.011 * pixie - 0.006 * Math.sin(u * Math.PI), sweep: 0.16, lift: 0.012 });
      if (pixie > 0.5) tresses(locks, face, hair, { at: 1.04, count: 1, length: () => 0.034, width: 0.009, curl: -0.003, drape: "any" });
      break;
    }
  }
  locks.into(sc);
  return crown;
}
