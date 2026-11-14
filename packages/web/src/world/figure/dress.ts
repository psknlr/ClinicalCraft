/**
 * Clothes on the trunk (`body.ts` shells) and what makes them read as clothes: necklines and their trims,
 * collars, the tailored white coat (lapels, buttons, pockets, a half-belt behind), the sterile gown, a belt, a
 * name tag and an identity card, pens, a nurse's fob watch, a dosimeter, reflective bands, the stethoscope
 * round the neck — and cloth that falls: a gown over a sitting patient's lap, the covers over one in bed, the
 * towels and the sheet of an operation on the chest, a blanket over someone on their side. What lies on the trunk
 * breathes with it.
 */
import { Matrix4, Vector3 } from "three";
import { ANKLE, HIP, LATERAL, NECK, type Frame, type Skeleton } from "./anatomy.js";
import { addShell, limbPoint, trunkAt, trunkPoint, type Fit } from "./body.js";
import { mix, paint as hex, rgb, shade, type Paint, type Painter, type Sculpt, type Station, type V3 } from "./sculpt.js";
import { addChestPiece, addEarTube, addTubing, STEM_END, STEEL } from "./stethoscope.js";
import type { Top, Wear } from "./wear.js";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A point on a layer of clothing: height (standing adult), angle from the front, how far it stands proud. */
type On = (y: number, a: number, proud?: number) => V3;

/** A neckline: the height of a garment's top edge round the body (`a` from the front, −π … π). */
interface Neckline {
  (a: number): number;
  /** The angle at which the neckline is at height `y` on its way up from the point of the V (inverse of the front part). */
  angleAt: (y: number) => number;
  point: number;
  sideAt: number;
  side: number;
}

function vee(point: number, sideAt: number, side: number, back: number, power = 1.15): Neckline {
  const fn = ((a: number) => {
    const t = Math.abs(a);
    if (t < sideAt) return point + (side - point) * Math.pow(t / sideAt, power);
    return side + (back - side) * smooth(sideAt, Math.PI, t);
  }) as Neckline;
  fn.angleAt = (y) => sideAt * Math.pow(Math.min(1, Math.max(0, (y - point) / (side - point))), 1 / power);
  fn.point = point;
  fn.sideAt = sideAt;
  fn.side = side;
  return fn;
}

const NECKLINES: Record<Top | "coat" | "sterile", Neckline> = {
  scrub: vee(NECK - 0.112, 0.7, NECK - 0.004, NECK + 0.012),
  coat: vee(1.215, 0.8, NECK - 0.002, NECK + 0.012, 1.02),
  sterile: vee(NECK + 0.014, 0.8, NECK + 0.02, NECK + 0.02, 2),
  gown: vee(NECK - 0.036, 0.85, NECK - 0.008, NECK + 0.006, 2),
  tee: vee(NECK - 0.032, 0.8, NECK - 0.002, NECK + 0.01, 2),
  polo: vee(NECK - 0.06, 0.36, NECK + 0.004, NECK + 0.014, 1.1),
  shirt: vee(NECK - 0.04, 0.34, NECK + 0.006, NECK + 0.016, 1.1),
};

/** The neckline of a cut. */
export function neckline(top: Top | "coat" | "sterile"): Neckline {
  return NECKLINES[top];
}

/** A tailored white coat: a little waist, to just above the knee. */
export const COAT_FIT: Fit = { ease: 0.024, straight: 0.72, flare: 0.035 };
export const COAT_HEM = 0.56;
export const STERILE_FIT: Fit = { ease: 0.03, straight: 1, flare: 0.05 };

/* ------------------------------------------------------------------ */
/* Pieces that lie on a layer                                          */
/* ------------------------------------------------------------------ */

/** A piece of cloth on a layer: an `nu` × `nv` grid of [height, angle] points (`u`, `v` 0 … 1), a little proud, with a thickness. */
function panel(sc: Sculpt, on: On, nu: number, nv: number, at: (u: number, v: number) => readonly [number, number], painter: Painter, proud = 0.002, thickness = 0.0022): void {
  const p = (i: number, j: number): V3 => {
    const [y, a] = at(i / (nu - 1), j / (nv - 1));
    return on(y, a, proud);
  };
  // faces must look away from the body whichever way the grid runs
  const a = p(0, 0), b = p(nu - 1, 0), c = p(0, nv - 1);
  const n = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).cross(new Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
  const mid = p(Math.floor(nu / 2), Math.floor(nv / 2));
  const flip = n.x * mid[0] + n.z * mid[2] + n.y * 0.02 < 0;
  sc.sheet(nu, nv, p, painter, { thickness, flip });
}

/** A band along a line on a layer (`path(t)` = [height, angle]), `width` down the cloth from it. */
function band(sc: Sculpt, on: On, n: number, path: (t: number) => readonly [number, number], width: number | ((t: number) => number), painter: Painter, proud = 0.002, thickness = 0.0022): void {
  const lower = (t: number): readonly [number, number] => {
    const [y, a] = path(t);
    const w = typeof width === "number" ? width : width(t);
    // `w` down the cloth, not down in height: on a slope (a shoulder) the same drop is a longer way
    const p0 = on(y, a, proud);
    const far = (d: number) => {
      const p = on(y - d, a, proud);
      return Math.hypot(p[0] - p0[0], p[1] - p0[1], p[2] - p0[2]);
    };
    if (far(w) <= w) return [y - w, a];
    let lo = 0, hi = w;
    for (let k = 0; k < 9; k++) {
      const mid = (lo + hi) / 2;
      if (far(mid) < w) lo = mid;
      else hi = mid;
    }
    return [y - (lo + hi) / 2, a];
  };
  panel(sc, on, n, 2, (u, v) => (v < 0.5 ? lower(u) : path(u)), painter, proud, thickness);
}

/** The frame of a spot on a layer: X round the body towards the figure's left, Y up the cloth, Z out of it. */
function frameOn(on: On, y: number, a: number, proud = 0): Matrix4 {
  const p = on(y, a, proud);
  const t = new Vector3(...on(y, a + 0.03, proud)).sub(new Vector3(...on(y, a - 0.03, proud))).normalize();
  const u = new Vector3(...on(y + 0.012, a, proud)).sub(new Vector3(...on(y - 0.012, a, proud))).normalize();
  const n = new Vector3().crossVectors(t, u).normalize();
  const up = new Vector3().crossVectors(n, t).normalize();
  return new Matrix4().makeBasis(t, up, n).setPosition(p[0], p[1], p[2]);
}

const TURN = new Matrix4().makeRotationX(Math.PI / 2);

/** A button (or a watch face, a stud): a low puck on a layer. */
function button(sc: Sculpt, on: On, y: number, a: number, r: number, painter: Paint, proud = 0.002, height = 0.0022): void {
  sc.within(frameOn(on, y, a, proud).multiply(TURN), () => sc.lathe([0, 0, 0], [[r, 0], [r, height * 0.6], [r * 0.82, height], [0, height]], painter, { seg: 8, hard: [1] }));
}

/** A patch pocket: a panel with a darker line where it opens. */
function pocket(sc: Sculpt, on: On, y0: number, y1: number, a0: number, a1: number, painter: Paint, proud = 0.0024): void {
  panel(sc, on, 5, 4, (u, v) => [y0 + (y1 - y0) * v, a0 + (a1 - a0) * u], painter, proud, 0.002);
  band(sc, on, 5, (t) => [y1 + 0.001, a0 + (a1 - a0) * t], 0.006, { rgb: shade(painter.rgb, 0.8), gloss: 0 }, proud + 0.0012, 0.0012);
}

/* ------------------------------------------------------------------ */
/* Tops                                                                */
/* ------------------------------------------------------------------ */

/** The folded collar of a shirt or a polo: it stands up the neck and turns down into two leaves, each to its point. */
function collar(sc: Sculpt, f: Frame, lift: number, painter: Paint, gap: number): void {
  const k = 0.96 + 0.04 * f.wide + (f.wide > 1 ? (f.wide - 1) * 0.5 : 0);
  for (const s of [-1, 1]) {
    sc.sheet(
      11,
      4,
      (i, j) => {
        const u = i / 10;
        const a = s * (gap + (Math.PI - gap) * u); // from the point at the throat round to the nape
        const fold = j / 3;
        // the fold line stands close round the neck, lower at the throat; the leaf lies down from it, longest at its point
        const front = 1 - smooth(0, 0.4, u);
        const up = NECK + 0.034 - 0.02 * front + lift;
        const reach = 0.004 + 0.02 * fold - 0.006 * front * fold;
        const drop = (0.03 + 0.032 * front) * fold;
        const c = Math.cos(a);
        return [Math.sin(a) * (0.0575 * k + reach) + s * 0.012 * front * fold, up - drop, c * ((c >= 0 ? 0.0555 : 0.0605) * k + reach) - 0.012 + 0.006 * front * fold];
      },
      painter,
      { thickness: 0.0026, flip: s < 0 },
    );
  }
}

/** A tie: the knot at the throat and the blade down the placket. */
function tie(sc: Sculpt, on: On, lift: number, painter: Paint, to: number): void {
  const top = NECK + 0.012 + lift;
  sc.sweep([{ p: [0, top, 0.047], rx: 0.013, rz: 0.008 }, { p: [0, top - 0.02, 0.052], rx: 0.0095, rz: 0.007 }], painter, { seg: 8, front: [0, 0, 1], start: "round", end: "flat", dome: 0.5 });
  const pts: Station[] = [];
  for (let i = 0; i <= 6; i++) {
    const y = NECK - 0.012 - ((NECK - 0.012 - to) * i) / 6;
    pts.push({ p: on(y, 0, 0.0046), rx: 0.011 + 0.012 * (i / 6), rz: 0.0016 });
  }
  sc.sweep(pts, painter, { seg: 6, front: [0, 0, 1], start: "open", end: "flat" });
}

/** What a top carries of its own: trims, a collar, buttons, a hem, a belt. */
function addTopDetails(sc: Sculpt, f: Frame, lift: number, on: On, spec: { top: Top; shirt: Paint; pants: Paint; tucked: boolean; hem: number; covered: boolean; onHips: On; tie: Paint | null }): void {
  const cut = NECKLINES[spec.top];
  const trim: Paint = { rgb: shade(spec.shirt.rgb, 0.86), gloss: 0 };
  const round = (t: number) => -Math.PI + t * Math.PI * 2;
  if (spec.top === "scrub" || spec.top === "tee" || spec.top === "gown") {
    const w = spec.top === "scrub" ? 0.017 : 0.011;
    const p: Paint = spec.top === "gown" ? hex("#f2f4f1") : trim;
    band(sc, on, 41, (t) => [cut(round(t)) + 0.001, round(t)], (t) => w * (0.6 + 0.4 * smooth(cut.sideAt * 1.15, cut.sideAt * 0.7, Math.abs(round(t)))), p, 0.0018, 0.0024);
  } else {
    collar(sc, f, lift, { rgb: shade(spec.shirt.rgb, 1.05), gloss: 0 }, spec.tie ? 0.1 : 0.3);
    if (spec.tie) tie(sc, on, lift, spec.tie, spec.covered ? 1.19 : 1.09);
    // the placket and its buttons, down to the hem (or as far as a coat's V shows)
    const bottom = spec.top === "polo" ? cut.point - 0.085 : spec.hem + 0.012;
    panel(sc, on, 2, 6, (u, v) => [bottom + (cut.point - 0.004 - bottom) * v, -0.085 + 0.17 * u * (0.115 / 0.17)], { rgb: shade(spec.shirt.rgb, 0.95), gloss: 0 }, 0.0012, 0.0014);
    const n = spec.top === "polo" ? 2 : 5;
    for (let i = 0; i < n; i++) {
      const y = cut.point - 0.022 - (i * (cut.point - 0.03 - bottom)) / Math.max(1, n - 1 + 0.4);
      button(sc, on, y, 0, 0.0052, { rgb: mix(spec.shirt.rgb, [1, 1, 1], 0.72), gloss: 0.5 }, 0.0026, 0.0016);
    }
  }
  if (!spec.tucked && spec.top !== "gown" && !spec.covered) band(sc, on, 25, (t) => [spec.hem + 0.013, round(t)], 0.013, trim, 0.0014, 0.003);
  if (spec.tucked) {
    // a belt over the top of the trousers, its buckle in front
    band(sc, spec.onHips, 25, (t) => [1.046, round(t)], 0.03, { rgb: rgb("#2b2623"), gloss: 0.45 }, 0.002, 0.003);
    sc.within(frameOn(spec.onHips, 1.031, 0, 0.0052), () => sc.box([0, 0, 0], 0.034, 0.026, 0.004, STEEL));
  }
}

/* ------------------------------------------------------------------ */
/* The white coat and the sterile gown                                 */
/* ------------------------------------------------------------------ */

/** A white coat over the top: buttoned below a V with notched lapels, pockets, a half-belt behind. */
export function addCoat(sc: Sculpt, f: Frame, lift: number, coat: Paint): void {
  const cut = NECKLINES.coat;
  addShell(sc, f, lift, { hem: COAT_HEM, neck: cut, fit: COAT_FIT, paint: coat, nv: 20, nu: 30 });
  const on: On = (y, a, proud = 0) => trunkPoint(y, a, f, lift, COAT_FIT, proud);
  const lapel: Paint = { rgb: shade(coat.rgb, 0.94), gloss: 0 };
  const top = cut.side - 0.008;
  for (const s of [-1, 1]) {
    // the lapel: widest half-way up the V, a notch, then the collar up to the shoulder
    panel(
      sc,
      on,
      3,
      13,
      (u, v) => {
        const y = cut.point + 0.004 + (top - cut.point - 0.004) * v;
        const notch = 1 - 0.42 * Math.exp(-(((v - 0.7) / 0.035) ** 2));
        const w = (0.008 + 0.047 * Math.pow(Math.sin(Math.min(1, v / 0.66) * Math.PI * 0.5), 0.9)) * notch * (v > 0.7 ? 0.82 : 1);
        const r = trunkAt(y, f, COAT_FIT)[0];
        return [y, s * (cut.angleAt(y) + 0.012 + (w / r) * u)];
      },
      lapel,
      0.0042,
      0.0042,
    );
  }
  // the collar round the back of the neck, from one shoulder to the other
  const back = (t: number) => {
    const a = cut.sideAt + (Math.PI * 2 - 2 * cut.sideAt) * t;
    return a > Math.PI ? a - Math.PI * 2 : a;
  };
  band(sc, on, 17, (t) => [cut(back(t)) + 0.002, cut.sideAt + (Math.PI * 2 - 2 * cut.sideAt) * t], 0.036, lapel, 0.0028, 0.003);
  // the front edge below the V, and three buttons
  const edge: Paint = { rgb: shade(coat.rgb, 0.93), gloss: 0 };
  panel(sc, on, 2, 8, (u, v) => [COAT_HEM + 0.004 + (cut.point - COAT_HEM) * v, 0.085 + 0.012 * u], edge, 0.0012, 0.0016);
  for (let i = 0; i < 3; i++) button(sc, on, cut.point - 0.03 - i * 0.115, 0.03, 0.0082, { rgb: rgb("#dfe1dc"), gloss: 0.55 }, 0.0026, 0.0026);
  // pockets: one on the chest (the figure's left), two below
  pocket(sc, on, 1.238, 1.318, 0.44, 0.96, coat);
  for (const s of [-1, 1]) pocket(sc, on, 0.84, 0.975, s * 0.42, s * 1.18, coat);
  // the half-belt across the back, a button at each end
  panel(sc, on, 9, 2, (u, v) => [1.07 + 0.034 * v, Math.PI - 0.62 + 1.24 * u], lapel, 0.0026, 0.003);
  for (const s of [-1, 1]) button(sc, on, 1.087, Math.PI + s * 0.52, 0.0075, { rgb: rgb("#dfe1dc"), gloss: 0.55 }, 0.0056, 0.0024);
}

/** A sterile surgical gown: closed to a knitted neckband, tied at the waist, to mid-shin. */
export function addSterileGown(sc: Sculpt, f: Frame, lift: number, gown: Paint): void {
  const cut = NECKLINES.sterile;
  addShell(sc, f, lift, { hem: 0.34, neck: cut, fit: STERILE_FIT, paint: gown, nv: 20 });
  const on: On = (y, a, proud = 0) => trunkPoint(y, a, f, lift, STERILE_FIT, proud);
  const round = (t: number) => -Math.PI + t * Math.PI * 2;
  // the knitted band standing round the neck
  const k = 0.96 + 0.04 * f.wide + (f.wide > 1 ? (f.wide - 1) * 0.5 : 0);
  const knit: Paint = { rgb: mix(gown.rgb, [1, 1, 1], 0.6), gloss: 0 };
  const ring: Station[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const c = Math.cos(a);
    ring.push({ p: [Math.sin(a) * 0.0605 * k, NECK + 0.03 - 0.009 * c + lift, c * (c >= 0 ? 0.058 : 0.063) * k - 0.012], rx: 0.0034, rz: 0.011 });
  }
  sc.sweep(ring, knit, { seg: 6, front: [0, 1, 0], start: "open", end: "open" });
  // the tie round the waist, knotted at the figure's left
  const tie: Paint = { rgb: shade(gown.rgb, 0.9), gloss: 0 };
  band(sc, on, 25, (t) => [1.105, round(t)], 0.022, tie, 0.0022, 0.0026);
  sc.within(frameOn(on, 1.094, 0.9, 0.006), () => {
    sc.ball([0, 0, 0], 0.011, 0.009, 0.006, tie, 8, 5);
    for (const s of [-1, 1]) {
      sc.sweep([{ p: [s * 0.006, -0.004, 0], rx: 0.007, rz: 0.0016 }, { p: [s * 0.016, -0.04, 0.002], rx: 0.008, rz: 0.0016 }, { p: [s * 0.02, -0.085, 0.001], rx: 0.0075, rz: 0.0014 }], tie, { seg: 6, front: [0, 0, 1], start: "open", dome: 0.4 });
    }
  });
}

/* ------------------------------------------------------------------ */
/* What is worn on the chest                                           */
/* ------------------------------------------------------------------ */

/** An identity card hanging from a clip: white, a coloured band across the top, a small portrait. */
function idCard(sc: Sculpt, frame: Matrix4, accent: Paint): void {
  sc.within(frame, () => {
    sc.box([0, -0.006, 0.0012], 0.012, 0.014, 0.003, STEEL);
    sc.box([0, -0.058, 0.0008], 0.054, 0.086, 0.0016, { rgb: rgb("#f6f6f2"), gloss: 0.35 });
    sc.box([0, -0.026, 0.0019], 0.054, 0.02, 0.0006, { rgb: accent.rgb, gloss: 0.3 });
    sc.box([-0.011, -0.058, 0.0019], 0.022, 0.028, 0.0006, { rgb: rgb("#c9b7a6"), gloss: 0.2 });
    for (const y of [-0.05, -0.058, -0.066]) sc.box([0.013, y, 0.0019], 0.018, 0.003, 0.0005, { rgb: rgb("#8a9296"), gloss: 0.1 });
    sc.box([0, -0.086, 0.0019], 0.04, 0.004, 0.0005, { rgb: rgb("#8a9296"), gloss: 0.1 });
  });
}

/** The stethoscope round the neck: the chest piece on the figure's left, the headset on the right. */
function wornStethoscope(sc: Sculpt, on: On): void {
  const P = Math.PI;
  const line = (pts: readonly (readonly [number, number, number])[]): V3[] => pts.map(([y, a, proud]) => on(y, a, proud));
  const frame = frameOn(on, 1.176, 0.2, 0.0135);
  const stemTop = new Vector3(0, STEM_END - 0.004, -0.0024).applyMatrix4(frame);
  addTubing(sc, [
    [stemTop.x, stemTop.y, stemTop.z],
    ...line([
      [1.27, 0.27, 0.008],
      [1.34, 0.4, 0.007],
      [1.405, 0.62, 0.007],
      [1.447, 1.15, 0.006],
      [1.466, 1.9, 0.006],
      [1.472, 2.6, 0.006],
      [1.474, P, 0.006],
      [1.472, -2.6, 0.006],
      [1.466, -1.9, 0.006],
      [1.447, -1.15, 0.006],
      [1.405, -0.62, 0.007],
      [1.36, -0.44, 0.008],
      [1.32, -0.36, 0.009],
    ]),
  ]);
  sc.within(frame, () => addChestPiece(sc, 12));
  // the yoke, and the two sprung ear tubes hanging from it
  const yoke = on(1.32, -0.36, 0.009);
  sc.ball(yoke, 0.0062, 0.008, 0.0062, STEEL, 8, 5);
  addEarTube(sc, [yoke, ...line([[1.285, -0.3, 0.011], [1.235, -0.26, 0.012], [1.185, -0.29, 0.012], [1.158, -0.34, 0.013]])]);
  addEarTube(sc, [yoke, ...line([[1.285, -0.41, 0.011], [1.235, -0.46, 0.012], [1.185, -0.45, 0.012], [1.158, -0.4, 0.014]])]);
}

/** What is pinned, pocketed, hung or printed on the chest, and the edges of the top. */
export function addChestDetails(sc: Sculpt, f: Frame, lift: number, spec: { wear: Wear; top: Top; topFit: Fit; shirt: Paint; pants: Paint; tucked: boolean; hem: number; accent: Paint }): void {
  const { wear, top } = spec;
  const onTop: On = (y, a, proud = 0) => trunkPoint(y, a, f, lift, spec.topFit, proud);
  const onHips: On = (y, a, proud = 0) => trunkPoint(y, a, f, lift, { ease: 0.012, straight: 0 }, proud);
  addTopDetails(sc, f, lift, onTop, { top, shirt: spec.shirt, pants: spec.pants, tucked: spec.tucked, hem: spec.hem, covered: wear.over !== "none", onHips, tie: wear.tie && top === "shirt" ? hex(wear.tie, 0.25) : null });
  const outer: On = wear.over === "coat" ? (y, a, proud = 0) => trunkPoint(y, a, f, lift, COAT_FIT, proud) : wear.over === "sterile" ? (y, a, proud = 0) => trunkPoint(y, a, f, lift, STERILE_FIT, proud) : onTop;
  const coat = wear.over === "coat";
  // a scrub top's own chest pocket
  if (top === "scrub" && wear.over === "none") pocket(sc, onTop, 1.232, 1.312, 0.44, 0.96, spec.shirt);
  const pocketed = coat || (top === "scrub" && wear.over === "none");
  if (wear.pens && pocketed) {
    const caps = ["#2f5f9a", "#1f2326", "#b23a34"];
    caps.forEach((c, i) => {
      sc.within(frameOn(outer, 1.318, 0.86 - i * 0.075, 0.0052), () => {
        sc.sweep([{ p: [0, -0.014, 0], rx: 0.0036, rz: 0.0036 }, { p: [0, 0.02, 0], rx: 0.0036, rz: 0.0036 }], hex(c, 0.5), { seg: 6, front: [0, 0, 1], start: "open", dome: 0.7 });
        sc.box([0, 0.004, 0.0042], 0.0022, 0.026, 0.0012, STEEL);
      });
    });
  }
  if (wear.badge) {
    // a name tag pinned above the pocket and the identity card clipped below it
    if (pocketed) {
      sc.within(frameOn(outer, 1.342, 0.62, 0.0036), () => {
        sc.box([0, 0, 0], 0.062, 0.017, 0.0026, { rgb: rgb("#f7f7f3"), gloss: 0.45 });
        sc.box([-0.006, 0.0008, 0.0015], 0.034, 0.0042, 0.0004, { rgb: rgb("#2c3338"), gloss: 0.1 });
        sc.box([-0.024, 0, 0.0015], 0.006, 0.011, 0.0004, spec.accent);
      });
      idCard(sc, frameOn(outer, 1.238, 0.7, 0.0052), spec.accent);
    } else {
      // no pocket: the card on a lanyard
      const strap: Paint = { rgb: spec.accent.rgb, gloss: 0.1 };
      for (const s of [-1, 1]) {
        const pts: Station[] = [];
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const y = NECK + 0.008 + (1.255 - NECK - 0.008) * t;
          pts.push({ p: outer(y, s * (0.86 * Math.pow(1 - t, 1.25) + 0.012), 0.003), rx: 0.0052, rz: 0.0012 });
        }
        sc.sweep(pts, strap, { seg: 6, front: [s * 0.5, 0.4, 0.8], start: "open", end: "open" });
      }
      idCard(sc, frameOn(outer, 1.262, 0, 0.0046), spec.accent);
    }
  }
  if (wear.watch) {
    // a nurse's fob watch: pinned on the right, the face hanging upside down to be read from above
    sc.within(frameOn(outer, 1.34, -0.52, 0.0034), () => {
      sc.box([0, 0, 0], 0.012, 0.008, 0.003, STEEL);
      sc.box([0, -0.016, 0], 0.011, 0.026, 0.002, { rgb: rgb("#3d4a57"), gloss: 0.2 });
    });
    button(sc, outer, 1.297, -0.52, 0.0145, STEEL, 0.003, 0.0045);
    button(sc, outer, 1.297, -0.52, 0.0118, { rgb: rgb("#f8f8f4"), gloss: 0.6 }, 0.0072, 0.0008);
  }
  if (wear.dosimeter) {
    sc.within(frameOn(outer, coat ? 1.2 : 1.3, coat ? -0.62 : -0.5, 0.0042), () => {
      sc.box([0, 0, 0], 0.03, 0.044, 0.006, { rgb: rgb("#2f4f7d"), gloss: 0.4 });
      sc.box([0, 0.004, 0.0033], 0.02, 0.016, 0.0006, { rgb: rgb("#e9ebe6"), gloss: 0.3 });
    });
  }
  if (wear.stripe) {
    const round = (t: number) => -Math.PI + t * Math.PI * 2;
    const bright: Paint = { rgb: rgb(wear.stripe), gloss: 0.25 };
    band(sc, outer, 25, (t) => [1.245, round(t)], 0.05, bright, 0.0016, 0.002);
    band(sc, outer, 25, (t) => [1.229, round(t)], 0.018, { rgb: rgb("#d5d9da"), gloss: 0.7 }, 0.0024, 0.0016);
    // epaulettes
    for (const s of [-1, 1]) panel(sc, outer, 2, 4, (u, v) => [1.418 - 0.004 * v, s * (0.95 + 0.5 * v) + (u - 0.5) * 0.22], { rgb: shade(spec.shirt.rgb, 0.72), gloss: 0.1 }, 0.003, 0.003);
  }
  if (wear.stethoscope) wornStethoscope(sc, outer);
}

/* ------------------------------------------------------------------ */
/* Cloth that falls over the body                                      */
/* ------------------------------------------------------------------ */

/**
 * A height above a plane from capsules lying on it: [x0, y0, x1, y1, height of the axis, radius], and for one
 * that slopes or tapers the height and the radius at its far end.
 */
type Capsule = readonly [number, number, number, number, number, number] | readonly [number, number, number, number, number, number, number, number];

/** Cloth over capsules: a grid of heights, eased so the cloth spans the hollows between them. */
function drape(nx: number, ny: number, x0: number, x1: number, y0: number, y1: number, floor: number, capsules: readonly Capsule[], slack = 0.008): number[][] {
  const h: number[][] = [];
  for (let j = 0; j < ny; j++) {
    const row: number[] = [];
    const y = y0 + ((y1 - y0) * j) / (ny - 1);
    for (let i = 0; i < nx; i++) {
      const x = x0 + ((x1 - x0) * i) / (nx - 1);
      let top = floor;
      for (const [ax, ay, bx, by, z0, r0, z1 = z0, r1 = r0] of capsules) {
        const dx = bx - ax, dy = by - ay;
        const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / Math.max(1e-9, dx * dx + dy * dy)));
        const d2 = (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2;
        const z = z0 + (z1 - z0) * t, r = r0 + (r1 - r0) * t;
        if (d2 < r * r) top = Math.max(top, z + Math.sqrt(r * r - d2) + slack);
      }
      row.push(top);
    }
    h.push(row);
  }
  // the cloth cannot follow a hollow narrower than itself: lift every point to the mean of its neighbours
  for (let pass = 0; pass < 5; pass++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        let sum = 0, n = 0;
        for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const v = h[j + dj]?.[i + di];
          if (v !== undefined) {
            sum += v;
            n++;
          }
        }
        if (n) h[j]![i] = Math.max(h[j]![i]!, sum / n);
      }
    }
  }
  return h;
}

/** The covers over a patient in bed (the figure is built upright: +Z is up out of the bed), chest to past the feet. */
export function addBlanket(sc: Sculpt, sk: Skeleton, f: Frame, lift: number): void {
  const back = trunkAt(1.3, f, { ease: 0.012, straight: 0 })[2];
  const bed = -back + 0.012;
  const wide = trunkAt(HIP, f)[0];
  const half = wide + 0.2;
  const y0 = -0.14, y1 = 1.315 + lift;
  const caps: Capsule[] = [];
  for (const s of [-1, 1]) {
    const leg = sk.legs[0];
    const a = limbPoint(leg, 0), k = limbPoint(leg, 1), e = limbPoint(leg, 2);
    caps.push([s * a.x, a.y, s * k.x, k.y, 0.006, Math.max(0.1, 0.098 * f.limb)], [s * k.x, k.y, s * e.x, e.y, 0.004, Math.max(0.078, 0.074 * f.limb)]);
    // the feet stand up under the covers
    caps.push([s * e.x, ANKLE + 0.02, s * (e.x + 0.03), ANKLE - 0.02, 0.1, 0.05]);
  }
  for (let y = 0.84; y < y1 + 0.02; y += 0.05) {
    const [rx, fr] = trunkAt(Math.min(y - lift, 1.34), f, { ease: 0.03, straight: 0.9 });
    caps.push([-rx * 0.55, y, rx * 0.55, y, fr - rx * 0.5, rx * 0.5]);
  }
  const nx = 19, ny = 34;
  const h = drape(nx, ny, -half, half, y0, y1, bed, caps);
  const blanket = rgb("#a9c4cf"), sheet = rgb("#f1f2ee");
  sc.sheet(
    nx,
    ny,
    (i, j) => {
      const x = -half + (2 * half * i) / (nx - 1);
      const y = y0 + ((y1 - y0) * j) / (ny - 1);
      // past the mattress's edge the covers hang down
      const over = Math.max(0, Math.abs(x) - (half - 0.07)) / 0.07;
      return [x * (1 - 0.06 * over * over), y, h[j]![i]! - 0.09 * over * over];
    },
    (_x, y, z) => {
      const fold = y > y1 - 0.085;
      const base = fold ? sheet : blanket;
      // a waffle weave: the faintest banding along the bed
      return { rgb: shade(base, fold ? 1 : 0.97 + 0.03 * Math.sin(y * 150) + 0.4 * Math.min(0.05, Math.max(0, z - bed) * 0.3)), gloss: 0 };
    },
    { thickness: 0.006 },
  );
}

/** The towels of a treatment couch. */
export const TREATMENT_TOWEL = "#f3f1ea";

/**
 * A towel across someone lying flat on a couch, from `from` up to `to` (heights of a standing adult): over the
 * hips, or over the chest. The figure is built upright and laid down by its rig — `face` 1: on its back, +Z up
 * out of the couch; −1: on its front, −Z up. It falls over the body and its ends lie on the couch either side.
 */
export function addTowel(sc: Sculpt, sk: Skeleton, f: Frame, face: 1 | -1, from: number, to: number, colour: string = TREATMENT_TOWEL): void {
  // what the body lies on: under its back, or under its chest
  const [, chestFront, chestBack] = trunkAt(1.3, f);
  const floor = -(face === 1 ? chestBack : chestFront) + 0.012;
  const caps: Capsule[] = [];
  for (let y = Math.max(0.78, from - 0.04); y < to + 0.04; y += 0.035) {
    const [rx, fr, bk] = trunkAt(y, f);
    const top = face === 1 ? fr : bk;
    const r = Math.min(rx * 0.5, (fr + bk) / 2);
    caps.push([-(rx - r), y, rx - r, y, top - r, r]);
  }
  for (const s of [-1, 1]) {
    const leg = sk.legs[0];
    const a = limbPoint(leg, 0), k = limbPoint(leg, 1);
    // (the thigh is thickest a third of the way down)
    const m = limbPoint(leg, 0.4);
    caps.push([s * a.x, a.y, s * m.x, m.y, face * a.z, 0.094 * f.limb, face * m.z, 0.094 * f.limb], [s * m.x, m.y, s * k.x, k.y, face * m.z, 0.094 * f.limb, face * k.z, 0.068 * f.limb]);
  }
  // (as wide as the body and a hand's breadth more either side: the arms beside it stay clear)
  const half = trunkAt(HIP, f)[0] + 0.06;
  const nx = 21, ny = Math.max(6, Math.round((to - from) / 0.022));
  const h = drape(nx, ny, -half, half, from, to, floor, caps, 0.007);
  const base = rgb(colour);
  sc.sheet(
    nx,
    ny,
    (i, j) => [-half + (2 * half * i) / (nx - 1), from + ((to - from) * j) / (ny - 1), face * h[j]![i]!],
    // terry cloth: the faintest ribs along it, a little darker where it lies in a hollow
    (x, y, z) => ({ rgb: shade(base, 0.965 + 0.035 * Math.sin(x * 260) + 0.3 * Math.min(0.05, Math.max(0, face * z - floor) * 0.2)), gloss: 0 }),
    { thickness: 0.007, flip: face === -1 },
  );
}

/** The blue of a theatre drape and the green of the towels round a field. */
export const THEATRE_DRAPE = "#3f84b6";
export const THEATRE_TOWEL = "#4e9a86";

/**
 * The field of an operation on the side of the chest, by height (standing adult) and by how far round the trunk
 * from the middle of the side (radians): bare skin from the costal margin to under the armpit, far enough to the
 * front and to the back for the incisions of a thoracoscopy.
 */
export const CHEST_FIELD = { low: 1.1, high: 1.33, round: 0.86 } as const;

/**
 * The towels round the field of an operation on the side of the chest (`CHEST_FIELD`) — under the armpit, below
 * the costal margin, along the front and along the back. The figure is built upright and laid on its side by its
 * rig, so `up`·X is up off the table. They lie on the chest and breathe with it.
 */
export function addFieldTowels(sc: Sculpt, f: Frame, up: 1 | -1): void {
  const on: On = (y, a, proud = 0) => trunkPoint(y, a, f, 0, undefined, proud);
  const side = (up * Math.PI) / 2;
  const towel = rgb(THEATRE_TOWEL);
  // a huckaback towel: the faintest ribs across it
  const towelPaint: Painter = (_x, y) => ({ rgb: shade(towel, 0.97 + 0.03 * Math.sin(y * 420)), gloss: 0 });
  const wrap = CHEST_FIELD.round + 0.46;
  panel(sc, on, 15, 3, (u, v) => [CHEST_FIELD.low - 0.07 + 0.075 * v, side + (u * 2 - 1) * wrap], towelPaint, 0.003, 0.003);
  panel(sc, on, 15, 3, (u, v) => [CHEST_FIELD.high - 0.005 + 0.07 * v, side + (u * 2 - 1) * wrap], towelPaint, 0.003, 0.003);
  for (const s of [-1, 1]) panel(sc, on, 4, 8, (u, v) => [CHEST_FIELD.low - 0.04 + (CHEST_FIELD.high - CHEST_FIELD.low + 0.075) * v, side + s * (CHEST_FIELD.round + 0.46 * u)], towelPaint, 0.0044, 0.003);
}

/** A cloth over the hips and the legs of someone on their side: where its top edge is, how far it hangs, what it is. */
export interface SideCloth {
  /** Its top edge (standing adult height): a sterile sheet meets the towel below the field, a blanket comes to the waist. */
  top: number;
  /** How far it hangs over the sides and the foot of the table (m). */
  drop: number;
  /** Its colour, and a band of another along its top edge (a blanket's sheet turned back over it). */
  colour: string;
  fold?: string;
}

/** The sterile sheet of an operation on the chest, and the blanket someone lies under before the field is prepared. */
export const THORACIC_SHEET: SideCloth = { top: CHEST_FIELD.low - 0.025, drop: 0.34, colour: THEATRE_DRAPE };
export const SIDE_BLANKET: SideCloth = { top: 1.02, drop: 0.15, colour: "#a9c4cf", fold: "#f1f2ee" };

/**
 * A cloth over the hips and the legs of someone on their side, the pillow between the knees under it, hanging
 * over the sides and the foot of the table (`LATERAL`). The figure is built upright and laid on its side by its
 * rig, so `up`·X is up off the table. It lies on the legs, not on the chest: it does not breathe.
 */
export function addSideCloth(sc: Sculpt, sk: Skeleton, f: Frame, up: 1 | -1, cloth: SideCloth): void {
  // heights above the middle of the body over the trunk below the cloth's edge, the legs and the pillow
  const floor = -LATERAL.rest;
  const top = cloth.top;
  const caps: Capsule[] = [];
  for (let y = 0.775; y < top + 0.03; y += 0.04) {
    const [rx, fr, bk] = trunkAt(y, f);
    const r = Math.min(rx, (fr + bk) / 2) * 0.86;
    caps.push([fr - r, y, r - bk, y, rx - r, r]);
  }
  let knee = { z: 0, y: 0 };
  for (const index of [0, 1] as const) {
    const leg = sk.legs[index];
    const h = (x: number) => up * (index === 0 ? x : -x);
    const a = limbPoint(leg, 0), k = limbPoint(leg, 1), e = limbPoint(leg, 2);
    // (a thigh is thickest a third of the way down: two pieces, each a little fuller than the leg)
    const m = limbPoint(leg, 0.4);
    caps.push([a.z, a.y, m.z, m.y, h(a.x), 0.1 * f.limb, h(m.x), 0.1 * f.limb], [m.z, m.y, k.z, k.y, h(m.x), 0.1 * f.limb, h(k.x), 0.07 * f.limb], [k.z, k.y, e.z, e.y, h(k.x), 0.072 * f.limb, h(e.x), 0.05 * f.limb]);
    const toe = new Vector3(...leg.along).normalize().multiplyScalar(0.17).add(e);
    caps.push([e.z, e.y, toe.z, toe.y, h(e.x), 0.052, h(toe.x), 0.04]);
    if (h(k.x) > 0) knee = { z: k.z, y: k.y };
  }
  // the pillow under the upper leg, from above the knee to the ankle
  caps.push([knee.z + 0.03, knee.y + 0.12, knee.z - 0.01, knee.y - 0.3, -0.035, 0.105]);

  const w0 = LATERAL.shift - LATERAL.tableHalf, w1 = LATERAL.shift + LATERAL.tableHalf;
  const u0 = LATERAL.foot, u1 = top;
  const nx = 23, ny = 40, fall = 4;
  const h = drape(nx, ny, w0, w1, u0, u1, floor, caps, 0.011);
  const base = rgb(cloth.colour), fold = cloth.fold ? rgb(cloth.fold) : null;
  sc.sheet(
    nx + 2 * fall,
    ny + fall,
    (i, j) => {
      // over the back edge, the front edge and the foot of the table the cloth hangs
      const ti = Math.min(nx - 1, Math.max(0, i - fall)), tj = Math.max(0, j - fall);
      const di = i < fall ? (fall - i) / fall : i >= nx + fall ? (i - nx - fall + 1) / fall : 0;
      const dj = j < fall ? (fall - j) / fall : 0;
      const w = w0 + ((w1 - w0) * ti) / (nx - 1) + (i < fall ? -1 : 1) * 0.014 * Math.sin((di * Math.PI) / 2);
      const u = u0 + ((u1 - u0) * tj) / (ny - 1) - 0.014 * Math.sin((dj * Math.PI) / 2);
      const height = h[tj]![ti]! - cloth.drop * Math.max(di, dj);
      return [up * height, u, w];
    },
    (x, y) => {
      const turned = fold !== null && y > top - 0.085;
      return { rgb: shade(turned ? fold : base, (turned ? 1 : 0.96 + 0.04 * Math.sin(y * 130)) + 0.35 * Math.min(0.06, Math.max(0, up * x - floor) * 0.25)), gloss: 0 };
    },
    { thickness: 0.005, flip: up === 1 },
  );
}

/** The cloth of a gown over a sitting patient's thighs, falling in front of the knees. */
export function addLap(sc: Sculpt, sk: Skeleton, f: Frame, painter: Paint): void {
  const leg = sk.legs[0];
  const a = limbPoint(leg, 0), k = limbPoint(leg, 1);
  const r = 0.08 * f.limb;
  const half = a.x + r + 0.035;
  const z0 = -0.02, z1 = k.z + 0.075;
  const caps: Capsule[] = [];
  for (const s of [-1, 1]) caps.push([s * a.x, a.z, s * k.x, k.z, a.y, r], [s * k.x, k.z, s * k.x, k.z + 0.02, k.y, r * 0.86]);
  const nx = 15, ny = 12, fall = 5;
  const floor = a.y - r * 0.2;
  const h = drape(nx, ny, -half, half, z0, z1, floor, caps, 0.007);
  sc.sheet(
    nx,
    ny + fall,
    (i, j) => {
      const x = -half + (2 * half * i) / (nx - 1);
      const side = Math.max(0, Math.abs(x) - (half - 0.05)) / 0.05;
      if (j < ny) {
        const z = z0 + ((z1 - z0) * j) / (ny - 1);
        return [x, h[j]![i]! - 0.07 * side * side, z];
      }
      // the hem hangs from the knees
      const d = (j - ny + 1) / fall;
      return [x, h[ny - 1]![i]! - 0.07 * side * side - 0.2 * d, z1 + 0.012 * Math.sin(d * Math.PI * 0.5)];
    },
    painter,
    { thickness: 0.004, flip: true },
  );
}

/** The strap of an arm sling: up from the hand over the far shoulder, round the back of the neck and down to the elbow. */
export function addSlingStrap(sc: Sculpt, f: Frame, lift: number, fit: Fit, sk: Skeleton, painter: Paint): void {
  const on: On = (y, a, proud = 0) => trunkPoint(y, a, f, lift, fit, proud);
  const arm = sk.arms[0];
  const hand = limbPoint(arm, 1.9), elbow = limbPoint(arm, 1.02);
  const pts: V3[] = [
    [hand.x, hand.y + 0.03, hand.z - 0.01],
    on(1.3, -0.5, 0.005),
    on(1.4, -0.72, 0.005),
    on(1.452, -1.2, 0.005),
    on(1.47, -2.4, 0.005),
    on(1.47, 2.4, 0.005),
    on(1.452, 1.2, 0.005),
    on(1.4, 0.8, 0.005),
    on(1.28, 0.95, 0.006),
    [elbow.x - 0.01, elbow.y + 0.04, elbow.z + 0.02],
  ];
  sc.sweep(pts.map((p) => ({ p, rx: 0.017, rz: 0.0018 })), painter, { seg: 6, front: [0, 0.3, 1], start: "open", end: "open" });
}
