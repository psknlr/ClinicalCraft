/**
 * The head of a figure in its own frame (`skull.ts`: the origin is the joint it turns about, +Y up, +Z the
 * face). Its skin is ONE surface: the head's grid, with an opening for each eye and one for the mouth, and round
 * each opening rings of finer points in to the lids (`eyes.ts`) and the lips (`mouth.ts`) — so lids and lips are
 * the face's own skin, shaded as one with it, and a blink or an opening jaw moves them. Behind the lids are the
 * eyes; on the skin lie the lashes, the brows and the shadows of the nostrils; ears stand at the sides (`ears.ts`).
 *
 * The skin's colour is the face's make-up, as light as good skin wears it: a peach flush on the apples of the
 * cheeks, the tip of the nose and the chin; light along the bridge of the nose and on the cheekbones, a soft
 * shade down its sides, under its tip, in the corners of the eyes and of the mouth and along the jaw.
 *
 * The skin's points that follow the jaw when it opens are tagged `jaw`, the upper lids `lid`, their lashes `lash`
 * and the teeth behind the upper lip `teeth` (`faceMoves`).
 *
 * A head is the same for every figure with a face of the same age and width, but for its colours: it is sculpted
 * once (`sculptHead`) and kept as a cast, and a figure takes the cast in its own skin, hair and eye colour
 * (`addHead`) — dozens of people cost little more than one.
 */
import { BufferAttribute, Vector3, type BufferGeometry } from "three";
import { addEars } from "./ears.js";
import { addEye, addEyeSkin, blinkOf, eyeForm } from "./eyes.js";
import { Patchwork } from "./face-mesh.js";
import { addMouthSkin, addNostrils, addTeeth, cornerPull, jawShare, mouthForm, teethShow } from "./mouth.js";
import { Sculpt, mix, rgb, shade, type Cast, type Paint, type Ranges, type Rgb } from "./sculpt.js";
import { EYE_X, HEAD_CENTRE, NU, NV, SKIN_GLOW, faceDepth, featureHeights, hairlineAt, jawLineAt, phiAt, remembered, skullPoint, thetaAt, type FaceSpec } from "./skull.js";

export { EYE_X, EYE_Y, HEAD_CENTRE, MOUTH_Y, SKIN_GLOW, hairlineAt, phiOfHeight, skullPoint, type FaceSpec } from "./skull.js";

/** How far the jaw swings open at its fullest (radians about the joint in front of the ear). */
const JAW_SWING = 0.075;

const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface HeadPaint {
  skin: Rgb;
  hair: Rgb;
  /** Whether the scalp above the hairline is painted as hair (anything but a bald head). */
  scalp: boolean;
  /** Eye colour. */
  iris: Rgb;
}

const PEACH = rgb("#ee8679");

/** The grid of points of a face of an age and a width (worked out once: every figure with such a face shares it). */
const grids = new Map<string, Vector3[][]>();

/** An opening in the grid: the columns and rows that bound it. */
interface Opening {
  i0: number;
  i1: number;
  j0: number;
  j1: number;
}

/**
 * A head as every figure with such a face has it: its form (a cast), how much of the figure's own skin, hair and
 * eye colour each of its points takes over a colour of the head's own, and how the face moves.
 */
interface HeadCast {
  cast: Cast;
  /** A number a vertex: its share of the skin's colour, of the hair's, of the eyes'. */
  skin: Float32Array;
  hair: Float32Array;
  iris: Float32Array;
  /** The face's moves (see `MOVES`), xyz a vertex of the cast. */
  moves: Float32Array[];
}

/** The casts taken so far: with or without hair on the scalp, with or without ears, by face. */
const casts: Map<string, HeadCast>[] = [new Map(), new Map(), new Map(), new Map()];
const BLACK: Rgb = [0, 0, 0], WHITE: Rgb = [1, 1, 1];

/**
 * Take the cast of a head. Every colour on a head is so much of the figure's skin, so much of its hair and so
 * much of its eyes, over a colour of the head's own (the white of an eye, the rose of a lip): sculpted with each
 * of the three white in turn and the others black, the shares can be read off.
 */
function castHead(face: FaceSpec, scalp: boolean, ears: boolean): HeadCast {
  const sculpt = (skin: Rgb, hair: Rgb, iris: Rgb): Sculpt => {
    const sc = new Sculpt();
    sculptHead(sc, face, { skin, hair, scalp, iris }, { ears });
    return sc;
  };
  const own = sculpt(BLACK, BLACK, BLACK);
  const cast = own.cast();
  const share = (sc: Sculpt): Float32Array => {
    const c = sc.cast().colour;
    const out = new Float32Array(c.length / 3);
    for (let i = 0; i < out.length; i++) out[i] = c[3 * i]! - cast.colour[3 * i]!;
    return out;
  };
  const moves = faceMoves(cast.position, { jaw: own.ranges("jaw"), lids: own.ranges("lid"), lashes: own.ranges("lash"), teeth: own.ranges("teeth") }, face);
  return { cast, skin: share(sculpt(WHITE, BLACK, BLACK)), hair: share(sculpt(BLACK, WHITE, BLACK)), iris: share(sculpt(BLACK, BLACK, WHITE)), moves };
}

/**
 * The head's skin and the face on it, into `sc` (in the head's own frame): the cast of such a face, in this
 * figure's colours. Returns where a point of the face is (`faceZ`), and `move`: once the geometry of `sc` is made,
 * it gives it the face's moves as morph targets (`MOVES`).
 */
export function addHead(sc: Sculpt, face: FaceSpec, paint: HeadPaint, opts: { ears?: boolean } = {}): { faceZ: (x: number, y: number) => number; move: (g: BufferGeometry) => void } {
  const ears = opts.ears !== false;
  const head = remembered(casts[(paint.scalp ? 1 : 0) + (ears ? 2 : 0)]!, face, () => castHead(face, paint.scalp, ears));
  const own = head.cast.colour, n = head.skin.length;
  const colour = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = head.skin[i]!, b = head.hair[i]!, c = head.iris[i]!;
    colour[3 * i] = own[3 * i]! + a * paint.skin[0] + b * paint.hair[0] + c * paint.iris[0];
    colour[3 * i + 1] = own[3 * i + 1]! + a * paint.skin[1] + b * paint.hair[1] + c * paint.iris[1];
    colour[3 * i + 2] = own[3 * i + 2]! + a * paint.skin[2] + b * paint.hair[2] + c * paint.iris[2];
  }
  const v0 = sc.put(head.cast, colour);
  return {
    faceZ: (x, y) => faceDepth(x, y, face),
    move: (g) => {
      const count = g.getAttribute("position").count;
      g.morphAttributes.position = head.moves.map((move) => {
        const all = new Float32Array(count * 3);
        all.set(move, v0 * 3);
        return new BufferAttribute(all, 3);
      });
      g.morphTargetsRelative = true;
    },
  };
}

/** A head sculpted directly in a figure's colours: what a cast is taken from (`addHead` is what figures use). */
export function sculptHead(sc: Sculpt, face: FaceSpec, paint: HeadPaint, opts: { ears?: boolean } = {}): void {
  const [cx, cy, cz] = HEAD_CENTRE;
  const { eye: e, mouth: m } = featureHeights(face);
  const scalp = shade(paint.hair, 0.82);
  const skinAt = (x: number, y: number, z: number): Paint => {
    const lx = x - cx, ly = y - cy, lz = z - cz;
    let c: Rgb = paint.skin;
    let gloss = 0.19;
    if (lz > 0) {
      const both = (px: number, py: number, sx: number, sy: number) => gauss(lx, ly, px, py, sx, sy) + gauss(lx, ly, -px, py, sx, sy);
      // a peach flush on the apples of the cheeks, a touch of it on the tip of the nose and on the chin
      const flush = 0.3 * both(0.037, e - 0.0275, 0.018, 0.013) + 0.07 * gauss(lx, ly, 0, e - 0.0335, 0.008, 0.007) + 0.05 * gauss(lx, ly, 0, m - 0.031, 0.012, 0.008);
      c = mix(c, PEACH, Math.min(0.36, flush));
      // light where good skin catches it: the forehead, the bridge of the nose, the cheekbones, under the eyes, the chin
      const light = 0.03 * gauss(lx, ly, 0, e + 0.04, 0.03, 0.02) + 0.045 * gauss(lx, ly, 0, e - 0.014, 0.003, 0.018) + 0.035 * both(0.043, e - 0.016, 0.014, 0.007) + 0.04 * both(EYE_X, e - 0.0085, 0.011, 0.003) + 0.025 * gauss(lx, ly, 0, m - 0.03, 0.01, 0.007);
      // shade where it falls: down the sides of the nose and under its tip, in the corners of the eyes, in the
      // groove over the lip, at the corners of the mouth, under the lower lip
      const dark =
        0.05 * both(0.009, e - 0.016, 0.0034, 0.016) +
        0.1 * gauss(lx, ly, 0, e - 0.0408, 0.009, 0.0026) +
        0.045 * both(0.0155, e - 0.035, 0.0025, 0.006) +
        0.03 * both(0.0185, e + 0.003, 0.006, 0.008) +
        0.035 * gauss(lx, ly, 0, m + 0.012, 0.004, 0.005) +
        0.06 * both(0.0245, m + 0.001, 0.003, 0.003) +
        0.07 * gauss(lx, ly, 0, m - 0.0125, 0.012, 0.0035);
      c = shade(c, 1 + light - Math.min(0.2, dark));
      gloss += 1.6 * light;
    }
    // the line of the jaw, and under it, where the light does not reach
    c = shade(c, 1 - 0.05 * smooth(0.05, 0.02, lz) * smooth(e - 0.03, e - 0.07, ly));
    const under = jawLineAt(lz, face);
    c = shade(c, 1 - 0.1 * smooth(under + 0.007, under + 0.0015, ly));
    if (paint.scalp) {
      const line = hairlineAt(Math.atan2(lx, lz), face);
      const t = smooth(line - 0.004, line + 0.005, ly);
      if (t > 0) c = mix(c, scalp, t);
    }
    return { rgb: c, gloss, glow: SKIN_GLOW };
  };

  /* ---------------- the grid, with its openings ---------------- */
  const pts = remembered(grids, face, () => {
    const rows: Vector3[][] = [];
    for (let j = 0; j <= NV; j++) {
      const row: Vector3[] = [];
      for (let i = 0; i < NU; i++) row.push(skullPoint(thetaAt(i), phiAt(j), face));
      rows.push(row);
    }
    return rows;
  });
  const mid = NU / 2;
  /** The block of the grid round the part of the face from x0 to x1 and y0 to y1 (from the head's centre). */
  const openingFor = (x0: number, x1: number, y0: number, y1: number): Opening => {
    const xc = (x0 + x1) / 2 + cx, yc = (y0 + y1) / 2 + cy;
    let jm = 1;
    for (let j = 1; j < NV; j++) if (Math.abs(pts[j]![mid]!.y - yc) < Math.abs(pts[jm]![mid]!.y - yc)) jm = j;
    let im = mid;
    for (let i = mid - NU / 4; i <= mid + NU / 4; i++) if (Math.abs(pts[jm]![i]!.x - xc) < Math.abs(pts[jm]![im]!.x - xc)) im = i;
    let i0 = im, i1 = im, j0 = jm, j1 = jm;
    while (pts[jm]![i0]!.x > x0 + cx) i0--;
    while (pts[jm]![i1]!.x < x1 + cx) i1++;
    while (pts[j0]![im]!.y < y1 + cy) j0--;
    while (pts[j1]![im]!.y > y0 + cy) j1++;
    return { i0, i1, j0, j1 };
  };
  const eyeShape = eyeForm(face), lips = mouthForm(face);
  const eyeBox = (side: number): Opening => {
    const a = side * (eyeShape.x - eyeShape.half * 1.11 - 0.0022), b = side * (eyeShape.x + eyeShape.half * 1.11 + 0.0022);
    return openingFor(Math.min(a, b), Math.max(a, b), eyeShape.lower(0.18) - 0.0052, eyeShape.fold(0) + 0.0014);
  };
  const openings: Opening[] = [eyeBox(-1), eyeBox(1), openingFor(-lips.half - 0.004, lips.half + 0.004, lips.bottom(0) - 0.0032, lips.top(0.22) + 0.0034)];
  const within = (o: Opening, i: number, j: number) => i > o.i0 && i < o.i1 && j > o.j0 && j < o.j1;
  const cut = (o: Opening, i: number, j: number) => i >= o.i0 && i < o.i1 && j >= o.j0 && j < o.j1;
  const mesh = new Patchwork();
  const grid: number[][] = [];
  for (let j = 1; j < NV; j++) {
    const row: number[] = [];
    for (let i = 0; i < NU; i++) {
      const p = pts[j]![i]!;
      row.push(openings.some((o) => within(o, i, j)) ? -1 : mesh.add(p.x, p.y, p.z, skinAt(p.x, p.y, p.z)));
    }
    grid.push(row);
  }
  const at = (i: number, j: number) => grid[j - 1]![((i % NU) + NU) % NU]!;
  // rings run crown to chin, round from the back by the figure's right to the face: faces look outward
  for (let j = 1; j + 1 < NV; j++) {
    for (let i = 0; i < NU; i++) {
      if (openings.some((o) => cut(o, i, j))) continue;
      const a = at(i, j), b = at(i, j + 1), c = at(i + 1, j + 1), d = at(i + 1, j);
      mesh.tri(a, b, d);
      mesh.tri(b, c, d);
    }
  }
  const crown = pts[0]![0]!, under = pts[NV]![0]!;
  const top = mesh.add(crown.x, crown.y, crown.z, skinAt(crown.x, crown.y, crown.z)), bottom = mesh.add(under.x, under.y, under.z, skinAt(under.x, under.y, under.z));
  for (let i = 0; i < NU; i++) {
    mesh.tri(at(i, 1), at(i + 1, 1), top);
    mesh.tri(at(i, NV - 1), bottom, at(i + 1, NV - 1));
  }
  /** The loop of the grid round an opening, counter-clockwise seen from in front. */
  const loopOf = (o: Opening): number[] => {
    const loop: number[] = [];
    for (let i = o.i0; i < o.i1; i++) loop.push(at(i, o.j1));
    for (let j = o.j1; j > o.j0; j--) loop.push(at(o.i1, j));
    for (let i = o.i1; i > o.i0; i--) loop.push(at(i, o.j0));
    for (let j = o.j0; j < o.j1; j++) loop.push(at(o.i0, j));
    return loop;
  };
  addEyeSkin(mesh, loopOf(openings[0]!), -1, face, skinAt);
  addEyeSkin(mesh, loopOf(openings[1]!), 1, face, skinAt);
  addMouthSkin(mesh, loopOf(openings[2]!), face, paint.skin, skinAt);
  const skin = mesh.finish();
  sc.tagged("jaw", () => sc.tagged("skin", () => sc.mesh(skin.points, skin.triangles, skin.paints, { lid: [skin.late] })));

  /* ---------------- what lies on the skin ---------------- */
  const tones = { skin: paint.skin, hair: paint.hair, iris: paint.iris };
  addEye(sc, -1, face, tones, skinAt);
  addEye(sc, 1, face, tones, skinAt);
  addNostrils(sc, face, skinAt);
  addTeeth(sc, face);

  if (opts.ears !== false) addEars(sc, face, paint.skin);
}

/** Eye colour for a hair colour: dark hair, deep brown eyes; fair or grey hair, lighter eyes. */
export function irisFor(hair: Rgb): Rgb {
  const l = 0.2126 * hair[0] + 0.7152 * hair[1] + 0.0722 * hair[2];
  return l > 0.2 ? rgb("#4f6672") : l > 0.07 ? rgb("#4b2f1c") : rgb("#2e1c11");
}

/**
 * The ways a face moves, each a morph target of the head's geometry (`MOVES` names their order): the jaw swings
 * open about its joint (of the points tagged `jaw`, those below the line of the lips: the lower lip and the chin go
 * down and a little back, the corners of the mouth half the way and a little in; the dark of the mouth shows
 * between the lips, and under the upper lip the edge of the teeth — `teeth`); the upper lids (`lid`) come down
 * over the eyes, their lashes (`lash`) with them; and what that alone misses on the way — a lid goes round the
 * eye, not through it — at its fullest half-way through a blink (`blinkRound`).
 */
function faceMoves(position: Float32Array, parts: { jaw: Ranges; lids: Ranges; lashes: Ranges; teeth: Ranges }, face: FaceSpec): Float32Array[] {
  const open = new Float32Array(position.length), blink = new Float32Array(position.length), round = new Float32Array(position.length);
  const hy = HEAD_CENTRE[1] - 0.018, hz = HEAD_CENTRE[2] - 0.022;
  const c = Math.cos(JAW_SWING), s = Math.sin(JAW_SWING);
  // (nothing higher than the upper lip's share reaches takes part)
  const still = HEAD_CENTRE[1] + mouthForm(face).top(0.22) + 0.016;
  for (const [start, count] of parts.jaw) {
    for (let i = start; i < start + count; i++) {
      const x = position[3 * i]!, y = position[3 * i + 1]!, z = position[3 * i + 2]!;
      if (y > still || z <= hz) continue;
      const front = smooth(hz, hz + 0.03, z);
      const w = jawShare(x, y, face) * front;
      if (w <= 0) continue;
      const ry = y - hy, rz = z - hz;
      open[3 * i] = cornerPull(x, y, face) * front;
      open[3 * i + 1] = (ry * c - rz * s - ry) * w;
      open[3 * i + 2] = (ry * s + rz * c - rz) * w;
    }
  }
  for (const [start, count] of parts.teeth) for (let i = start; i < start + count; i++) open[3 * i + 1] = teethShow(position[3 * i]!, position[3 * i + 1]!, face);
  for (const [ranges, lash] of [[parts.lids, false], [parts.lashes, true]] as const) {
    for (const [start, count] of ranges) {
      for (let i = start; i < start + count; i++) {
        const d = blinkOf(position[3 * i]!, position[3 * i + 1]!, position[3 * i + 2]!, face, lash);
        blink[3 * i + 1] = d.shut[1];
        blink[3 * i + 2] = d.shut[2];
        round[3 * i + 2] = d.round[2];
      }
    }
  }
  return [open, blink, round];
}

/** The face's moves in the order of the head's morph targets. */
export const MOVES = { jaw: 0, blink: 1, round: 2 } as const;

/** How much of the third move (`MOVES.round`) a blink that is `shut` (0 … 1) takes: none open or shut, all of it half-way. */
export function blinkRound(shut: number): number {
  return 4 * shut * (1 - shut);
}
