/**
 * A hand as a hand is built: the palm between wrist and knuckles — fuller at the ball of the thumb and along
 * the little finger's side, hollow in the middle, the four knuckles standing on its back; fingers of three
 * joints each, a little wider at the joints, flat on the back and padded underneath, each curled by its own
 * amount (a resting hand curls more towards the little finger); nails; the thumb out of its own mound of muscle,
 * turned to face the fingers, and the web of skin between it and the index. The palm is paler than the back,
 * the knuckles and fingertips a touch pinker.
 *
 * The frame is a left hand's: the wrist at the origin, fingers along +Y, the palm facing −Z, the thumb on +X
 * (`endFrame` puts it on an arm; a right hand is its mirror).
 */
import { Vector3 } from "three";
import { mix, rgb, shade, type Paint, type Rgb, type Sculpt, type Station, type V3 } from "./sculpt.js";

/** How a hand is held. */
export interface HandPose {
  /** Each finger, index to little: degrees bent at the knuckle, the middle joint and the end joint. */
  fingers: readonly (readonly [number, number, number])[];
  /** Degrees between neighbouring fingers at the knuckles. */
  spread: number;
  /** The thumb: degrees out from the index in the palm's plane, degrees forward of the palm, degrees bent at its two joints. */
  thumb: { out: number; forward: number; bend: readonly [number, number] };
}

/** At rest: every finger a little bent, more towards the little finger; the thumb beside the index, curving towards it. */
export const HAND_RELAXED: HandPose = { fingers: [[14, 24, 12], [18, 30, 15], [23, 36, 18], [28, 42, 21]], spread: 3, thumb: { out: 34, forward: 10, bend: [16, 12] } };
/** Laid flat on something. */
export const HAND_FLAT: HandPose = { fingers: [[4, 8, 4], [5, 9, 5], [6, 10, 5], [7, 12, 6]], spread: 5, thumb: { out: 44, forward: 4, bend: [8, 6] } };
/** Closed over the other hand. */
export const HAND_CLASPED: HandPose = { fingers: [[36, 46, 24], [38, 50, 26], [40, 52, 28], [42, 54, 30]], spread: 2, thumb: { out: 30, forward: 22, bend: [24, 22] } };
/** A pinch: the pads of the index and the middle finger meet the thumb's, a centimetre apart, over something small; the other two fingers are tucked. */
export const HAND_HOLD: HandPose = { fingers: [[65, 30, 12], [67, 34, 14], [77, 64, 30], [81, 70, 34]], spread: 2, thumb: { out: 8, forward: 28, bend: [2, 6] } };

/** Where the fingers leave the palm (x across, y along), their lengths and half-widths at the base. */
const FINGERS: readonly { x: number; y: number; len: number; r: number }[] = [
  { x: 0.0284, y: 0.0915, len: 0.073, r: 0.0091 },
  { x: 0.0092, y: 0.0965, len: 0.081, r: 0.0093 },
  { x: -0.0099, y: 0.0925, len: 0.075, r: 0.0087 },
  { x: -0.028, y: 0.0835, len: 0.059, r: 0.0077 },
];
/** A finger's bones as fractions of its length. */
const BONES = [0.46, 0.29, 0.25];

const RAD = Math.PI / 180;
/** How much slimmer a bone's skin is half-way between its joints. */
const WAIST = 0.045;
/** The thumb's bones: the one in the palm's mound, then the two of the thumb itself. */
const THUMB = [0.0445, 0.032, 0.027];
const PINK = rgb("#e58c86");
const NAIL = rgb("#f3cfc6");
const EDGE = rgb("#f6efe6");
const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);

export interface HandOptions {
  /** The hand seen close (the player's): rounder fingers, a finer palm. */
  detail?: boolean;
  /** Girth against the average hand. */
  girth?: number;
  /** A glove: one colour, no nails. */
  gloved?: boolean;
}

/** Where the pads of the thumb and of the four fingers are (the hand's frame), for putting something between them. */
export interface HandPoints {
  thumb: Vector3;
  fingers: Vector3[];
  /** The way each fingertip points. */
  pointing: Vector3[];
}

/** One digit: its joints and, at each, the way it points and the way its back faces. */
interface Digit {
  joints: Vector3[];
  dirs: Vector3[];
  ups: Vector3[];
}

function finger(i: number, pose: HandPose, g: number): Digit {
  const f = FINGERS[i]!;
  const fan = (1.5 - i) * pose.spread * RAD;
  const d0 = new Vector3(Math.sin(fan), Math.cos(fan), 0);
  const joints = [new Vector3(f.x * g, f.y, -0.0015)];
  const dirs: Vector3[] = [], ups: Vector3[] = [];
  let bent = 0;
  BONES.forEach((part, k) => {
    bent += pose.fingers[i]![k]! * RAD;
    const d = d0.clone().multiplyScalar(Math.cos(bent)).add(new Vector3(0, 0, -Math.sin(bent)));
    const up = new Vector3(0, 0, Math.cos(bent)).addScaledVector(d0, Math.sin(bent));
    dirs.push(d);
    ups.push(up);
    joints.push(joints[k]!.clone().addScaledVector(d, f.len * part));
  });
  return { joints, dirs, ups };
}

/** The stations of a digit's skin: three along each bone, one on each joint (standing a little proud as the joint bends). */
function digitStations(dg: Digit, widths: readonly number[], backs: readonly number[], pads: readonly number[], g: number): Station[] {
  const out: Station[] = [];
  const n = dg.dirs.length;
  // inside the palm
  out.push({ p: at(dg.joints[0]!.clone().addScaledVector(dg.dirs[0]!, -0.012)), rx: widths[0]! * g, rz: backs[0]! * g, back: pads[0]! * g, power: 2.25 });
  for (let k = 0; k < n; k++) {
    const a = dg.joints[k]!, b = dg.joints[k + 1]!;
    const w0 = widths[k]!, w1 = widths[k + 1]!;
    const last = k === n - 1;
    for (const t of last ? [0.2, 0.5, 0.74] : [0.2, 0.5, 0.8]) {
      const p = a.clone().lerp(b, t);
      // a bone's skin is slimmer between its joints, its pad fullest in the middle
      const waist = 1 - WAIST * Math.sin(t * Math.PI);
      const w = (w0 + (w1 - w0) * t) * waist;
      const pad = (pads[k]! + (pads[k + 1]! - pads[k]!) * t) * (1 + 0.1 * Math.sin(t * Math.PI));
      const back = (backs[k]! + (backs[k + 1]! - backs[k]!) * t) * (last && t > 0.4 ? 0.9 : 1);
      out.push({ p: at(p), rx: w * g, rz: back * g, back: pad * g, power: 2.25 });
    }
    if (!last) {
      // the joint: on the bisector of the two bones, its knuckle standing out with the bend
      const bend = Math.acos(Math.max(-1, Math.min(1, dg.dirs[k]!.dot(dg.dirs[k + 1]!))));
      const up = dg.ups[k]!.clone().add(dg.ups[k + 1]!).normalize();
      const p = b.clone().addScaledVector(up, 0.0006 + 0.0022 * Math.sin(bend * 0.5));
      out.push({ p: at(p), rx: w1 * 1.02 * g, rz: backs[k + 1]! * 1.05 * g, back: pads[k + 1]! * 0.9 * g, power: 2.25 });
    }
  }
  const tip = dg.joints[n]!, d = dg.dirs[n - 1]!;
  const end = widths[n]!;
  out.push({ p: at(tip.clone().addScaledVector(d, -end * 0.62)), rx: end * g, rz: backs[n]! * g, back: pads[n]! * g, power: 2.15 });
  return out;
}

function at(v: Vector3): V3 {
  return [v.x, v.y, v.z];
}

/** A nail on the back of a digit's last bone (`width(t)`, `back(t)`: the bone's half-width and half-depth along it): curved across like the fingertip under it, a pale edge at its end. */
function addNail(sc: Sculpt, dg: Digit, width: (t: number) => number, back: (t: number) => number, skin: Rgb): void {
  const n = dg.dirs.length;
  const a = dg.joints[n - 1]!, b = dg.joints[n]!;
  const d = dg.dirs[n - 1]!, up = dg.ups[n - 1]!;
  const side = new Vector3().crossVectors(d, up).normalize();
  const bed: Rgb = mix(mix(skin, NAIL, 0.62), PINK, 0.24);
  const cols = 5, rows = 5;
  sc.sheet(
    cols,
    rows,
    (i, j) => {
      const s = (i / (cols - 1)) * 2 - 1, t = j / (rows - 1);
      const along = 0.36 + 0.56 * t;
      const w = width(Math.min(along, 0.74));
      const x = s * w * 0.8 * (1 - 0.08 * t * t);
      // the same curve as the fingertip's back, a hair proud of it; past the tip's turn it runs on as the free edge
      const z = back(Math.min(along, 0.74)) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / w, 2.25)), 1 / 2.25) + 0.0005 - 0.0016 * Math.max(0, along - 0.74) / 0.18;
      return at(a.clone().lerp(b, along).addScaledVector(side, x).addScaledVector(up, z));
    },
    (x, y, z) => {
      // paler towards the root, a light edge at the tip, the skin's fold darker round it
      const q = new Vector3(x, y, z).sub(a);
      const t = q.dot(d) / Math.max(1e-6, a.distanceTo(b));
      const across = Math.abs(q.dot(side)) / Math.max(1e-6, width(Math.min(t, 0.74)) * 0.8);
      let c = t > 0.84 ? EDGE : t < 0.5 ? mix(bed, EDGE, 0.3) : bed;
      if (t < 0.4 || (across > 0.85 && t < 0.8)) c = mix(c, shade(skin, 0.82), 0.55);
      return { rgb: c, gloss: 0.66, glow: 0.1 };
    },
    { thickness: 0.0005, flip: side.clone().cross(d).dot(up) < 0 },
  );
}

/** A hand (see the module doc); returns where its pads are. */
export function addHand(sc: Sculpt, skin: Paint, pose: HandPose = HAND_RELAXED, opts: HandOptions = {}): HandPoints {
  const g = (opts.girth ?? 1) * (opts.gloved ? 1.05 : 1);
  const fine = !!opts.detail;
  const seg = fine ? 12 : 7;
  const bare = !opts.gloved;
  const palmTone: Rgb = bare ? mix(shade(skin.rgb, 1.07), PINK, 0.1) : skin.rgb;
  const glow = skin.glow ?? 0;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  /* ---------------- digits: where they are ---------------- */
  const digits = FINGERS.map((_, i) => finger(i, pose, g));
  // the thumb: its first bone lies in the mound at the palm's edge, its nail turned to the side, and its two joints
  // bend it across towards the index
  const th = pose.thumb;
  const out = th.out * RAD, fwd = th.forward * RAD;
  const d0 = new Vector3(Math.sin(out) * Math.cos(fwd), Math.cos(out) * Math.cos(fwd), -Math.sin(fwd)).normalize();
  const up0 = new Vector3(0.9, 0, 0.44);
  up0.addScaledVector(d0, -up0.dot(d0)).normalize();
  const thumb: Digit = { joints: [new Vector3(0.019 * g, 0.007, -0.0105)], dirs: [], ups: [] };
  let bent = 0;
  THUMB.forEach((len, k) => {
    if (k > 0) bent += th.bend[k - 1]! * RAD;
    const d = d0.clone().multiplyScalar(Math.cos(bent)).addScaledVector(up0, -Math.sin(bent));
    const up = up0.clone().multiplyScalar(Math.cos(bent)).addScaledVector(d0, Math.sin(bent));
    thumb.dirs.push(d);
    thumb.ups.push(up);
    thumb.joints.push(thumb.joints[k]!.clone().addScaledVector(d, len));
  });
  const tw = [0.0165, 0.0122, 0.0106, 0.0094], tb = [0.0112, 0.0098, 0.0086, 0.0064], tf = [0.0165, 0.0112, 0.0095, 0.0085];

  /* ---------------- paints ---------------- */
  // knuckles and the joints of the fingers are a touch pinker on the back; the palm side is paler
  const knuckles: Vector3[] = [];
  for (const dg of digits) knuckles.push(dg.joints[0]!, dg.joints[1]!, dg.joints[2]!);
  knuckles.push(thumb.joints[1]!, thumb.joints[2]!);
  const tips = [...digits.map((dg) => dg.joints[3]!), thumb.joints[3]!];
  // the joints a crease runs across, and the way the digit runs through each
  const creases: Vector3[] = [], creaseDirs: Vector3[] = [];
  for (const dg of [...digits, thumb]) {
    for (const k of [1, 2]) {
      creases.push(dg.joints[k]!);
      creaseDirs.push(dg.dirs[k - 1]!.clone().add(dg.dirs[k]!).normalize());
    }
  }
  const tmp = new Vector3();
  const painter = (dorsal: (p: Vector3) => number) => (x: number, y: number, z: number): Paint => {
    if (!bare) return skin;
    tmp.set(x, y, z);
    const back = dorsal(tmp);
    let c: Rgb = back > 0 ? skin.rgb : mix(skin.rgb, palmTone, Math.min(1, -back * 1.6));
    let flush = 0;
    for (const k of knuckles) flush = Math.max(flush, Math.exp(-tmp.distanceToSquared(k) / (0.0066 * 0.0066)));
    if (back > 0) c = mix(c, PINK, 0.2 * flush);
    let pad = 0;
    for (const t of tips) pad = Math.max(pad, Math.exp(-tmp.distanceToSquared(t) / (0.011 * 0.011)));
    c = mix(c, PINK, 0.14 * pad);
    // the creases across the joints of the fingers
    let crease = 0;
    for (const k of creases) crease = Math.max(crease, Math.exp(-tmp.distanceToSquared(k) / (0.0105 * 0.0105)) * Math.exp(-((tmp.clone().sub(k).dot(creaseDirs[creases.indexOf(k)]!) / 0.0016) ** 2)));
    c = shade(c, 1 - 0.13 * crease);
    return { rgb: c, gloss: skin.gloss, glow };
  };

  /* ---------------- the palm, from the wrist to the knuckles ---------------- */
  // sections: [y, half-width to the little finger's side, to the index's side, back, front (the palm's side)]
  const sections: readonly (readonly [number, number, number, number, number])[] = [
    [-0.032, 0.0266, 0.0266, 0.0192, 0.0196],
    [-0.012, 0.027, 0.0272, 0.019, 0.02],
    [0.004, 0.0296, 0.03, 0.0178, 0.0204],
    [0.02, 0.0336, 0.034, 0.016, 0.019],
    [0.038, 0.0368, 0.0375, 0.0142, 0.0168],
    [0.056, 0.0392, 0.04, 0.0131, 0.0152],
    [0.072, 0.0402, 0.0408, 0.0124, 0.014],
    [0.086, 0.0398, 0.0404, 0.011, 0.0128],
    [0.097, 0.037, 0.0376, 0.0078, 0.0106],
  ];
  const around = fine ? 26 : 14;
  const rows = fine ? sections.length * 2 - 1 : sections.length + 2;
  const section = (v: number): readonly number[] => {
    const f = v * (sections.length - 1);
    const i = Math.min(sections.length - 2, Math.floor(f)), t = f - i;
    return sections[i]!.map((a, k) => a + (sections[i + 1]![k]! - a) * t);
  };
  // the thumb's first bone lies inside the palm's thumb-side edge: the edge swells round it (the mound of the thumb)
  // and falls back in a curve beyond its knuckle (the web between thumb and index)
  const cmc = thumb.joints[0]!, mcp = thumb.joints[1]!;
  const mound = (y: number): { x: number; z: number; w: number } => {
    const t = (y - cmc.y) / Math.max(1e-6, mcp.y - cmc.y);
    if (t < -0.35) return { x: 0, z: 0, w: 0 };
    const axis = cmc.clone().lerp(mcp, Math.min(1, Math.max(0, t)));
    const r = lerp(tw[0]!, tw[1]!, Math.min(1, Math.max(0, t))) * g;
    const w = t < 0 ? smooth(-0.35, 0, t) : t <= 1 ? 1 : 1 - smooth(0, 0.03, y - mcp.y);
    return { x: axis.x + r * 0.78, z: axis.z, w };
  };
  // the tendons on the back of the hand: 1 on one, −1 half-way between two, fading towards wrist and knuckles
  const tendons = (x: number, y: number): number => {
    const fade = smooth(0.008, 0.035, y) * (1 - smooth(0.07, 0.09, y));
    let near = 1;
    for (const f of FINGERS) near = Math.min(near, Math.abs(x - f.x * (0.55 + 0.45 * Math.max(0, y) / f.y)) / 0.0095);
    return fade * Math.cos(Math.min(1, near) * Math.PI);
  };
  // how far each knuckle stands up: more as its finger bends
  const knuckle = FINGERS.map((_, i) => 0.0016 + 0.003 * Math.sin((pose.fingers[i]![0]! * RAD) / 2 + 0.2));
  const rings: number[][] = [];
  for (let j = 0; j < rows; j++) {
    const v = j / (rows - 1);
    const [y, wu, wr, back, front] = section(v) as [number, number, number, number, number];
    const m = mound(y);
    const ring: number[] = [];
    for (let i = 0; i < around; i++) {
      // from the thumb side over the back to the little-finger side and under the palm
      const a = (i / around) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const e = 2 / (s >= 0 ? 2.1 : 2.35);
      const side = Math.sign(c) * Math.pow(Math.abs(c), e);
      const reach = c >= 0 ? Math.max(wr * g, lerp(wr * g, m.x, m.w)) : wu * g;
      const x = side * reach;
      let z = Math.sign(s) * Math.pow(Math.abs(s), e) * (s >= 0 ? back : front) * g;
      // towards the thumb's side the palm follows the thumb's bone forward of the hand
      if (c > 0) z += m.z * m.w * smooth(0.35, 1, side) * (s >= 0 ? 0.55 : 1);
      let along = y;
      if (s >= 0) {
        // the knuckles stand on the back of the hand above the roots of the fingers; from each a tendon runs back
        // towards the wrist, the skin dipping a little between them
        FINGERS.forEach((f, k) => (z += knuckle[k]! * s * gauss(x, y, f.x * g, f.y - 0.006, 0.006, 0.008)));
        z += 0.0011 * s * tendons(x / g, y);
      } else {
        // the pad along the little finger's side, the hollow of the palm, the pads under the knuckles; and the
        // palm runs on further than the back does, to the webs of the fingers
        z += s * (0.0026 * gauss(x, y, -0.026 * g, 0.03, 0.011, 0.03) + 0.0024 * gauss(x, y, 0.02 * g, 0.03, 0.013, 0.024) - 0.0042 * gauss(x, y, -0.002, 0.05, 0.014, 0.022) + 0.0016 * gauss(x, y, 0, 0.09, 0.03, 0.008));
        along += 0.014 * -s * smooth(0.72, 1, v);
      }
      ring.push(x, along, z);
    }
    rings.push(ring);
  }
  // the rings run wrist to knuckles (+Y), round from the thumb side to the back: faces outward
  const skinOf = painter((p) => p.z / 0.012);
  sc.rings(
    rings,
    around,
    (x, y, z) => {
      const p = skinOf(x, y, z);
      return bare && z > 0.004 ? { ...p, rgb: shade(p.rgb, 1 + 0.035 * tendons(x / g, y)) } : p;
    },
    { endPole: [0, 0.106, -0.003] },
  );

  /* ---------------- fingers ---------------- */
  const pads: Vector3[] = [];
  digits.forEach((dg, i) => {
    const r = FINGERS[i]!.r;
    const widths = [r, r * 0.97, r * 0.88, r * 0.75];
    const backs = [r * 0.82, r * 0.8, r * 0.72, r * 0.6];
    const fronts = [r * 0.86, r * 0.84, r * 0.78, r * 0.72];
    const up = dg.ups[2]!;
    const mid = dg.joints[1]!;
    sc.sweep(digitStations(dg, widths, backs, fronts, g), painter((p) => (p.clone().sub(mid).dot(dg.ups[1]!) + p.clone().sub(dg.joints[2]!).dot(up)) / (r * 1.6)), { seg, front: at(dg.ups[0]!), start: "open", end: "round", dome: 0.95 });
    if (bare && fine) addNail(sc, dg, (t) => lerp(widths[2]!, widths[3]!, t) * (1 - WAIST * Math.sin(t * Math.PI)) * g, (t) => lerp(backs[2]!, backs[3]!, t) * (t > 0.4 ? 0.9 : 1) * g, skin.rgb);
    else if (bare) plate(sc, dg, widths[3]! * 0.66 * g, lerp(backs[2]!, backs[3]!, 0.58) * 0.9 * g, 0.0054, { rgb: mix(mix(skin.rgb, NAIL, 0.6), PINK, 0.14), gloss: 0.5, glow });
    pads.push(dg.joints[2]!.clone().lerp(dg.joints[3]!, 0.55).addScaledVector(up, -fronts[3]! * g));
  });
  // the webs: skin between the roots of neighbouring fingers
  for (let i = 0; i + 1 < digits.length; i++) {
    const a = digits[i]!, b = digits[i + 1]!;
    const along = a.dirs[0]!.clone().add(b.dirs[0]!).normalize();
    const up = a.ups[0]!.clone().add(b.ups[0]!).normalize();
    const c = a.joints[0]!.clone().add(b.joints[0]!).multiplyScalar(0.5).addScaledVector(along, 0.006).addScaledVector(up, -0.002);
    const half = a.joints[0]!.distanceTo(b.joints[0]!) / 2;
    sc.sweep(
      [
        { p: at(c.clone().addScaledVector(along, -0.014)), rx: half * 0.95, rz: 0.0052 * g, back: 0.0066 * g },
        { p: at(c), rx: half * 0.85, rz: 0.0042 * g, back: 0.006 * g },
        { p: at(c.clone().addScaledVector(along, 0.0075)), rx: half * 0.6, rz: 0.003 * g, back: 0.0044 * g },
      ],
      painter((p) => p.clone().sub(c).dot(up) / 0.006),
      { seg: fine ? 8 : 6, front: at(up), start: "open", end: "round", dome: 0.7 },
    );
  }

  /* ---------------- the thumb ---------------- */
  // from inside its mound: the knuckle, the two bones, the pad
  const free: Digit = { joints: [cmc.clone().lerp(mcp, 0.45), ...thumb.joints.slice(1)], dirs: thumb.dirs, ups: thumb.ups };
  sc.sweep(digitStations(free, [lerp(tw[0]!, tw[1]!, 0.45), tw[1]!, tw[2]!, tw[3]!], [lerp(tb[0]!, tb[1]!, 0.45), tb[1]!, tb[2]!, tb[3]!], [lerp(tf[0]!, tf[1]!, 0.45), tf[1]!, tf[2]!, tf[3]!], g), painter((p) => p.clone().sub(thumb.joints[2]!).dot(thumb.ups[2]!) / 0.012), { seg: fine ? 14 : 8, front: at(thumb.ups[0]!), start: "open", end: "round", dome: 0.95 });
  if (bare && fine) addNail(sc, thumb, (t) => lerp(tw[2]!, tw[3]!, t) * (1 - WAIST * Math.sin(t * Math.PI)) * g, (t) => lerp(tb[2]!, tb[3]!, t) * (t > 0.4 ? 0.9 : 1) * g, skin.rgb);
  else if (bare) plate(sc, thumb, tw[3]! * 0.66 * g, lerp(tb[2]!, tb[3]!, 0.58) * 0.9 * g, 0.0068, { rgb: mix(mix(skin.rgb, NAIL, 0.6), PINK, 0.14), gloss: 0.5, glow });
  return { thumb: thumb.joints[2]!.clone().lerp(thumb.joints[3]!, 0.55).addScaledVector(thumb.ups[2]!, -tf[3]! * g), fingers: pads, pointing: digits.map((dg) => dg.dirs[2]!.clone()) };
}

/** A nail seen from a distance: a small pale plate on the back of a digit's last bone. */
function plate(sc: Sculpt, dg: Digit, halfWidth: number, back: number, halfLength: number, paint: Paint): void {
  const n = dg.dirs.length;
  const d = dg.dirs[n - 1]!, up = dg.ups[n - 1]!;
  const c = dg.joints[n - 1]!.clone().lerp(dg.joints[n]!, 0.58).addScaledVector(up, back + 0.0004);
  const side = new Vector3().crossVectors(d, up).normalize();
  sc.sheet(2, 2, (a, b) => at(c.clone().addScaledVector(side, (a * 2 - 1) * halfWidth).addScaledVector(d, (b * 2 - 1) * halfLength)), paint, { flip: side.clone().cross(d).dot(up) < 0 });
}
