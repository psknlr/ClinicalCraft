import { describe, expect, it } from "vitest";
import type { BufferGeometry } from "three";
import { addEars } from "./ears.js";
import { blinkOf, eyeForm } from "./eyes.js";
import { addHead, blinkRound, irisFor, MOVES, sculptHead, type HeadPaint } from "./head.js";
import { cornerPull, jawShare, mouthForm, teethShow } from "./mouth.js";
import { rgb, Sculpt, type Ranges } from "./sculpt.js";
import { HEAD_CENTRE, faceDepth, featureHeights, phiOfHeight, skullPoint, type FaceSpec } from "./skull.js";

const ADULT: FaceSpec = { young: 0, wide: 1 };
const CHILD: FaceSpec = { young: 0.6, wide: 1 };
const WOMAN: FaceSpec = { young: 0, wide: 1, feminine: 1 };
const MAN: FaceSpec = { young: 0, wide: 1, feminine: 0 };
const HAIR = rgb("#2b2420");
const PAINT: HeadPaint = { skin: rgb("#d8b494"), hair: HAIR, scalp: true, iris: irisFor(HAIR) };
const [CX, CY, CZ] = HEAD_CENTRE;

function head(face: FaceSpec, paint: HeadPaint = PAINT, ears = true) {
  const sc = new Sculpt();
  const made = addHead(sc, face, paint, { ears });
  const geometry = sc.geometry();
  made.move(geometry);
  const moves = geometry.morphAttributes.position!.map((a) => a.array as Float32Array);
  return { sc, geometry, position: geometry.getAttribute("position").array as Float32Array, moves, faceZ: made.faceZ };
}

/** How many edges of the triangles among vertices [lo, hi) belong to one triangle only, and to more than two. */
function edgesOf(g: BufferGeometry, lo: number, hi: number): { open: number; crowded: number; triangles: number } {
  const index = g.getIndex()!.array;
  const count = new Map<number, number>();
  let triangles = 0;
  for (let i = 0; i < index.length; i += 3) {
    const t = [index[i]!, index[i + 1]!, index[i + 2]!];
    if (t.some((v) => v < lo || v >= hi)) continue;
    triangles++;
    for (let k = 0; k < 3; k++) {
      const a = t[k]!, b = t[(k + 1) % 3]!;
      const key = a < b ? a * 65536 + b : b * 65536 + a;
      count.set(key, (count.get(key) ?? 0) + 1);
    }
  }
  let open = 0, crowded = 0;
  for (const n of count.values()) {
    if (n === 1) open++;
    else if (n > 2) crowded++;
  }
  return { open, crowded, triangles };
}

const each = (ranges: Ranges, fn: (i: number) => void) => {
  for (const [start, count] of ranges) for (let i = start; i < start + count; i++) fn(i);
};

describe("the forms of an eye and of a mouth", () => {
  it("an eye is an almond: lids apart between its corners and together at them, the outer corner a touch higher", () => {
    for (const face of [ADULT, CHILD]) {
      const f = eyeForm(face);
      expect(eyeForm(face)).toBe(f);
      expect(eyeForm({ ...face })).toBe(f);
      for (let u = -0.95; u <= 0.95; u += 0.05) {
        expect(f.upper(u)).toBeGreaterThan(f.lower(u));
        expect(f.fold(u)).toBeGreaterThan(f.upper(u));
        expect(f.thick(u)).toBeGreaterThan(0.0003);
      }
      for (const u of [-1, 1]) {
        expect(f.upper(u)).toBeCloseTo(f.line(u), 8);
        expect(f.lower(u)).toBeCloseTo(f.line(u), 8);
      }
      expect(f.line(1)).toBeGreaterThan(f.line(-1));
      // open about three eighths of its length; the iris a little under the upper lid, over the lower
      const open = f.upper(0) - f.lower(0);
      expect(open / (2 * f.half)).toBeGreaterThan(0.33);
      expect(open / (2 * f.half)).toBeLessThan(0.45);
      const [, iy, r] = f.iris;
      expect(iy + r).toBeGreaterThan(f.upper(0));
      expect(iy - r).toBeLessThan(f.lower(0) + 0.0015);
      expect(iy + r - f.upper(0)).toBeLessThan(0.001);
      expect(2 * r).toBeLessThan(2 * f.half * 0.5);
      // the eye's surface is highest at its middle and falls away to the corners
      expect(f.ball(f.x, f.e)).toBeGreaterThan(f.ball(f.x + f.half, f.e));
      expect(f.ball(f.x, f.e)).toBeGreaterThan(f.ball(f.x, f.e + 0.008));
    }
    // a child's eyes are rounder
    const a = eyeForm(ADULT), c = eyeForm(CHILD);
    expect((c.upper(0) - c.lower(0)) / c.half).toBeGreaterThan((a.upper(0) - a.lower(0)) / a.half);
  });

  it("a mouth has a bow over a fuller lower lip, its corners a touch up, and parts as an oval", () => {
    for (const face of [ADULT, CHILD]) {
      const m = mouthForm(face);
      expect(mouthForm(face)).toBe(m);
      for (let t = -0.9; t <= 0.9; t += 0.1) {
        expect(m.top(t)).toBeGreaterThan(m.line(t * m.half));
        expect(m.bottom(t)).toBeLessThan(m.line(t * m.half));
      }
      // the bow: two peaks either side of a dip; the lower lip fuller than the upper
      expect(m.top(0.22)).toBeGreaterThan(m.top(0));
      expect(m.top(0)).toBeGreaterThan(m.top(0.6));
      expect(m.line(0) - m.bottom(0)).toBeGreaterThan(m.top(0) - m.line(0));
      expect(m.line(m.half)).toBeGreaterThan(m.line(0) + 0.0008);
      expect(m.parts).toBeLessThan(m.half);
      // below the line at the middle all of the jaw's swing, above it none; the corners half
      expect(jawShare(CX, CY + m.line(0) - 0.004, face)).toBe(1);
      expect(jawShare(CX, CY + m.line(0) + 0.004, face)).toBe(0);
      expect(jawShare(CX + m.half, CY + m.line(m.half), face)).toBeCloseTo(0.5, 1);
      // the lips part less and less towards the corners
      const apart = (t: number) => jawShare(CX + t * m.parts, CY + m.line(t * m.parts) - 0.0003, face) - jawShare(CX + t * m.parts, CY + m.line(t * m.parts) + 0.0003, face);
      expect(apart(0)).toBeCloseTo(1, 1);
      expect(apart(0.5)).toBeLessThan(apart(0));
      expect(apart(0.9)).toBeLessThan(apart(0.5));
      expect(apart(0.9)).toBeGreaterThan(0.1);
      // the corners come in as it opens, each towards the middle
      expect(cornerPull(CX + m.half, CY + m.line(m.half), face)).toBeLessThan(-0.001);
      expect(cornerPull(CX - m.half, CY + m.line(m.half), face)).toBeGreaterThan(0.001);
      expect(Math.abs(cornerPull(CX, CY + m.line(0), face))).toBeLessThan(1e-4);
    }
    expect(mouthForm(CHILD).half).toBeLessThan(mouthForm(ADULT).half);
  });
});

describe("a woman's features and a man's", () => {
  it("her eyes are larger and more open under their lids, her mouth narrower with fuller lips; his the other way", () => {
    const hers = eyeForm(WOMAN), his = eyeForm(MAN), neither = eyeForm(ADULT);
    expect(hers).not.toBe(neither);
    expect(his).not.toBe(hers);
    const open = (f: typeof hers) => f.upper(0) - f.lower(0);
    expect(hers.half).toBeGreaterThan(neither.half);
    expect(his.half).toBeLessThan(neither.half);
    expect(open(hers)).toBeGreaterThan(open(neither) + 0.001);
    expect(open(his)).toBeLessThan(open(neither) - 0.0005);
    expect(open(hers) / (2 * hers.half)).toBeGreaterThan(open(his) / (2 * his.half));
    for (const f of [hers, his]) {
      const [, iy, r] = f.iris;
      // the upper lid covers the top of the iris — a face does not stare — and the lower lid no more than its edge
      expect(iy + r - f.upper(0)).toBeGreaterThan(0.0003);
      expect(iy + r - f.upper(0)).toBeLessThan(0.0015);
      expect(f.lower(0) - (iy - r)).toBeLessThan(0.0016);
      for (let u = -0.95; u <= 0.95; u += 0.05) {
        expect(f.upper(u)).toBeGreaterThan(f.lower(u));
        expect(f.fold(u)).toBeGreaterThan(f.upper(u));
      }
    }
    expect(hers.iris[2]).toBeGreaterThan(his.iris[2] + 0.0008);
    const her = mouthForm(WOMAN), him = mouthForm(MAN), plain = mouthForm(ADULT);
    expect(her.half).toBeLessThan(plain.half - 0.001);
    expect(him.half).toBeGreaterThan(plain.half + 0.001);
    const upper = (m: typeof her) => m.top(0.22) - m.line(0.22 * m.half), lower = (m: typeof her) => m.line(0) - m.bottom(0);
    expect(upper(her)).toBeGreaterThan(upper(plain) * 1.2);
    expect(lower(her)).toBeGreaterThan(lower(plain) * 1.1);
    expect(upper(him)).toBeLessThan(upper(plain) * 0.9);
    expect(lower(him)).toBeLessThan(lower(plain) * 0.9);
    // each still a mouth: a bow over a fuller lower lip
    for (const m of [her, him]) {
      expect(m.top(0.22)).toBeGreaterThan(m.top(0));
      expect(lower(m)).toBeGreaterThan(m.top(0) - m.line(0));
    }
  });

  it("each is a head of its own — one closed skin, a cast of its own — that blinks and speaks as any does", () => {
    // (the openings for her larger eyes and narrower mouth are cut out of other squares of the head's grid than his)
    const hers = head(WOMAN), his = head(MAN);
    expect(Array.from(hers.position)).not.toEqual(Array.from(his.position));
    for (const [face, made] of [[WOMAN, hers], [MAN, his]] as const) {
      const [start, count] = made.sc.ranges("jaw")[0]!;
      const skin = edgesOf(made.geometry, start, start + count);
      expect(skin.crowded).toBe(0);
      expect(skin.open).toBeGreaterThan(60);
      // a cast in the figure's colours is the head sculpted in them
      const direct = new Sculpt();
      sculptHead(direct, face, PAINT);
      expect(Array.from(direct.geometry().getAttribute("position").array as Float32Array)).toEqual(Array.from(made.position));
      // the lids keep clear of the eye all the way down
      const f = eyeForm(face), shut = made.moves[MOVES.blink]!, round = made.moves[MOVES.round]!;
      for (const b of [0.25, 0.5, 0.75, 1]) {
        let clear = Infinity;
        each(made.sc.ranges("lid"), (i) => {
          const x = Math.abs(made.position[3 * i]! - CX), y = made.position[3 * i + 1]! - CY + b * shut[3 * i + 1]!;
          clear = Math.min(clear, made.position[3 * i + 2]! - CZ + b * shut[3 * i + 2]! + blinkRound(b) * round[3 * i + 2]! - f.ball(x, y));
        });
        expect(clear, `shut ${b}`).toBeGreaterThan(0.00005);
      }
      // the jaw opens the mouth: the lower lip goes down, nothing over the upper lip moves
      const m = mouthForm(face), open = made.moves[MOVES.jaw]!;
      let lip = 0, above = 0;
      each(made.sc.ranges("jaw"), (i) => {
        const x = made.position[3 * i]! - CX, y = made.position[3 * i + 1]! - CY;
        if (Math.abs(x) < 0.003 && y < m.line(0) - 0.001 && y > m.bottom(0)) lip = Math.min(lip, open[3 * i + 1]!);
        if (y > m.top(0.22) + 0.018) above = Math.max(above, Math.abs(open[3 * i + 1]!));
      });
      expect(lip).toBeLessThan(-0.006);
      expect(above).toBe(0);
    }
    // her lashes are fuller than his: they stand further off the lid
    const lashes = (made: typeof hers, face: FaceSpec) => {
      const f = eyeForm(face);
      let most = 0;
      each(made.sc.ranges("lash"), (i) => {
        const x = Math.abs(made.position[3 * i]! - CX), y = made.position[3 * i + 1]! - CY;
        most = Math.max(most, made.position[3 * i + 2]! - CZ - f.ball(x, y));
      });
      return most;
    };
    expect(lashes(hers, WOMAN)).toBeGreaterThan(lashes(his, MAN) * 1.3);
    // and her cheeks and lips have more colour than his: more of her face is redder than the skin's own colour
    const rosy = (made: typeof hers) => {
      const colour = made.geometry.getAttribute("color").array as Float32Array;
      const [start, count] = made.sc.ranges("jaw")[0]!;
      const own = PAINT.skin[0] / PAINT.skin[1];
      let red = 0;
      for (let i = start; i < start + count; i++) red += Math.max(0, colour[3 * i]! / colour[3 * i + 1]! - own * 1.04);
      return red;
    };
    expect(rosy(hers)).toBeGreaterThan(rosy(his) * 1.5);
  });
});

describe("a head (head.ts)", () => {
  it("has one skin: closed all over but for the two eyes, with lids and lips of its own", () => {
    for (const face of [ADULT, CHILD, { young: 0, wide: 1.3 }, { young: 1, wide: 1 }]) {
      const { sc, geometry, position } = head(face);
      expect(sc.ranges("jaw")).toHaveLength(1);
      const [start, count] = sc.ranges("jaw")[0]!;
      const skin = edgesOf(geometry, start, start + count);
      expect(skin.triangles).toBeGreaterThan(5000);
      expect(skin.crowded).toBe(0);
      // the only open edges are the rims behind the lids' edges, round each eye
      expect(skin.open).toBeGreaterThan(60);
      expect(skin.open % 2).toBe(0);
      const f = eyeForm(face);
      const index = geometry.getIndex()!.array;
      const seen = new Map<number, number>();
      for (let i = 0; i < index.length; i += 3) {
        const t = [index[i]!, index[i + 1]!, index[i + 2]!];
        if (t.some((v) => v < start || v >= start + count)) continue;
        for (let k = 0; k < 3; k++) {
          const a = t[k]!, b = t[(k + 1) % 3]!;
          const key = a < b ? a * 65536 + b : b * 65536 + a;
          seen.set(key, (seen.get(key) ?? 0) + 1);
        }
      }
      for (const [key, n] of seen) {
        if (n !== 1) continue;
        for (const v of [Math.floor(key / 65536), key % 65536]) {
          const x = Math.abs(position[3 * v]! - CX), y = position[3 * v + 1]! - CY;
          expect(Math.abs(x - f.x)).toBeLessThan(f.half + 0.001);
          expect(y).toBeGreaterThan(f.lower(0) - 0.002);
          expect(y).toBeLessThan(f.upper(0) + 0.002);
        }
      }
      for (let i = 0; i < position.length; i++) expect(Number.isFinite(position[i])).toBe(true);
    }
  });

  it("is the same on both sides, and its skin lies on the head's own form", () => {
    const { sc, position } = head(ADULT);
    const [start, count] = sc.ranges("jaw")[0]!;
    // every point of the skin has its mirror (but the middle line's, which are their own)
    const places = new Set<string>();
    const key = (x: number, y: number, z: number) => `${Math.round(x * 2e5)}:${Math.round(y * 2e5)}:${Math.round(z * 2e5)}`;
    for (let i = start; i < start + count; i++) places.add(key(position[3 * i]!, position[3 * i + 1]!, position[3 * i + 2]!));
    let lone = 0;
    for (let i = start; i < start + count; i++) if (!places.has(key(-position[3 * i]!, position[3 * i + 1]!, position[3 * i + 2]!))) lone++;
    expect(lone).toBeLessThan(count * 0.02);
    // away from the eyes and the mouth the skin is the head's form itself
    const f = eyeForm(ADULT), m = mouthForm(ADULT);
    let checked = 0;
    for (let i = start; i < start + count; i++) {
      const x = position[3 * i]! - CX, y = position[3 * i + 1]! - CY, z = position[3 * i + 2]! - CZ;
      // (not under the chin, which is not seen from in front)
      if (z < 0.05 || y < -0.08) continue;
      const nearEye = Math.abs(Math.abs(x) - f.x) < f.half * 1.2 && Math.abs(y - f.e) < 0.014;
      const nearMouth = Math.abs(x) < m.half + 0.003 && y < m.top(0.22) + 0.002 && y > m.bottom(0) - 0.002;
      if (nearEye || nearMouth) continue;
      expect(Math.abs(faceDepth(x, y, ADULT) - z)).toBeLessThan(0.0005);
      checked++;
    }
    expect(checked).toBeGreaterThan(500);
  });

  it("a cast in a figure's colours is the head sculpted in them", () => {
    for (const [face, paint, ears] of [
      [ADULT, PAINT, true],
      [CHILD, { skin: rgb("#8a5a3c"), hair: rgb("#c9b28a"), scalp: true, iris: rgb("#4f6672") }, true],
      [{ young: 0, wide: 1.2 }, { skin: rgb("#f0d2bb"), hair: rgb("#5a5651"), scalp: false, iris: rgb("#4b2f1c") }, false],
    ] as const) {
      const direct = new Sculpt();
      sculptHead(direct, face, paint, { ears });
      const cast = new Sculpt();
      addHead(cast, face, paint, { ears });
      expect(cast.vertexCount).toBe(direct.vertexCount);
      expect(cast.triangleCount).toBe(direct.triangleCount);
      const a = direct.geometry(), b = cast.geometry();
      for (const name of ["position", "normal", "finish"]) expect(Array.from(b.getAttribute(name).array as Float32Array)).toEqual(Array.from(a.getAttribute(name).array as Float32Array));
      const ca = a.getAttribute("color").array as Float32Array, cb = b.getAttribute("color").array as Float32Array;
      let worst = 0;
      for (let i = 0; i < ca.length; i++) worst = Math.max(worst, Math.abs(ca[i]! - cb[i]!));
      expect(worst).toBeLessThan(2e-6);
      for (const tag of ["skin", "jaw", "lid", "lash", "teeth"]) expect(cast.ranges(tag)).toEqual(direct.ranges(tag));
      expect(Array.from(b.getIndex()!.array)).toEqual(Array.from(a.getIndex()!.array));
    }
    // a second figure with such a face takes the same cast, after whatever else its sculpt already holds
    const sc = new Sculpt();
    sc.box([0, 0, 0], 0.01, 0.01, 0.01, { rgb: [1, 0, 0] });
    const before = sc.vertexCount;
    const made = addHead(sc, ADULT, PAINT);
    expect(sc.ranges("jaw")[0]![0]).toBe(before);
    const g = sc.geometry();
    made.move(g);
    const open = g.morphAttributes.position![MOVES.jaw]!.array as Float32Array;
    expect(open).toHaveLength(sc.vertexCount * 3);
    for (let i = 0; i < before * 3; i++) expect(open[i]).toBe(0);
    expect(made.faceZ(0.01, -0.02)).toBe(faceDepth(0.01, -0.02, ADULT));
  });

  it("opens its mouth with the jaw: the lower lip and the chin go down, the corners half the way, the teeth show", () => {
    for (const face of [ADULT, CHILD]) {
      const { sc, position, moves } = head(face);
      const open = moves[MOVES.jaw]!;
      const m = mouthForm(face);
      let lip = 0, corner = 0, chin = 0, above = 0, n = 0;
      each(sc.ranges("jaw"), (i) => {
        const x = position[3 * i]! - CX, y = position[3 * i + 1]! - CY, dy = open[3 * i + 1]!;
        if (dy !== 0 || open[3 * i] !== 0 || open[3 * i + 2] !== 0) n++;
        if (Math.abs(x) < 0.003 && y < m.line(0) - 0.001 && y > m.bottom(0)) lip = Math.min(lip, dy);
        if (Math.abs(Math.abs(x) - m.half) < 0.0015 && Math.abs(y - m.line(m.half)) < 0.001) corner = Math.min(corner, dy);
        if (Math.abs(x) < 0.004 && y < m.bottom(0) - 0.012) chin = Math.min(chin, dy);
        if (y > m.top(0.22) + 0.018) above = Math.max(above, Math.abs(dy) + Math.abs(open[3 * i]!) + Math.abs(open[3 * i + 2]!));
      });
      expect(n).toBeGreaterThan(400);
      expect(above).toBe(0);
      expect(lip).toBeLessThan(-0.006);
      expect(lip).toBeGreaterThan(-0.011);
      expect(chin).toBeLessThan(-0.005);
      expect(corner / lip).toBeGreaterThan(0.35);
      expect(corner / lip).toBeLessThan(0.65);
      // the teeth: out of sight over the line of the lips while the mouth is closed; open, their edge is below it
      expect(sc.ranges("teeth")).toHaveLength(1);
      let rest = Infinity, shown = Infinity;
      each(sc.ranges("teeth"), (i) => {
        const x = position[3 * i]! - CX, y = position[3 * i + 1]! - CY;
        rest = Math.min(rest, y - m.line(x));
        shown = Math.min(shown, y + open[3 * i + 1]! - m.line(x));
        expect(open[3 * i + 1]).toBeCloseTo(teethShow(position[3 * i]!, position[3 * i + 1]!, face), 7);
        // behind the lips
        expect(position[3 * i + 2]! - CZ).toBeLessThan(faceDepth(x, m.line(x), face) - 0.001);
      });
      expect(rest).toBeGreaterThan(0.0006);
      expect(shown).toBeLessThan(-0.002);
      // nothing but the skin and the teeth moves with the jaw
      const moved = new Set<number>();
      for (let i = 0; i < open.length / 3; i++) if (open[3 * i] !== 0 || open[3 * i + 1] !== 0 || open[3 * i + 2] !== 0) moved.add(i);
      each(sc.ranges("jaw"), (i) => moved.delete(i));
      each(sc.ranges("teeth"), (i) => moved.delete(i));
      expect(moved.size).toBe(0);
    }
  });

  it("blinks with the upper lids, which go round the eyes and shut on the lower lids, their lashes with them", () => {
    expect(blinkRound(0)).toBe(0);
    expect(blinkRound(1)).toBe(0);
    expect(blinkRound(0.5)).toBe(1);
    for (const face of [ADULT, CHILD]) {
      const { sc, position, moves } = head(face);
      const shut = moves[MOVES.blink]!, round = moves[MOVES.round]!;
      const f = eyeForm(face);
      expect(sc.ranges("lid")).toHaveLength(1);
      expect(sc.ranges("lash")).toHaveLength(2);
      // the lids keep clear of the eye all the way down — which the straight way there would not
      for (const b of [0, 0.25, 0.5, 0.75, 1]) {
        let clear = Infinity, straight = Infinity;
        each(sc.ranges("lid"), (i) => {
          const x = Math.abs(position[3 * i]! - CX), y = position[3 * i + 1]! - CY + b * shut[3 * i + 1]!;
          const z = position[3 * i + 2]! - CZ + b * shut[3 * i + 2]!;
          straight = Math.min(straight, z - f.ball(x, y));
          clear = Math.min(clear, z + blinkRound(b) * round[3 * i + 2]! - f.ball(x, y));
        });
        expect(clear, `shut ${b}`).toBeGreaterThan(0.00005);
        if (b === 0.5) expect(straight).toBeLessThan(-0.0008);
      }
      // the lid's edge ends on the lower lid's, a hair over it; the fold over the lid stays
      for (let u = -0.8; u <= 0.8; u += 0.2) {
        const x = f.x + f.half * u, y = f.upper(u), z = f.ball(x, y) + f.thick(u);
        const d = blinkOf(x + CX, y + CY, z + CZ, face);
        expect(y + d.shut[1]).toBeCloseTo(f.lower(u) - 0.0002, 6);
        expect(z + d.shut[2]).toBeGreaterThan(f.ball(x, y + d.shut[1]) + f.thick(u) * 0.9);
        const fold = blinkOf(x + CX, f.fold(u) + CY, z + CZ, face);
        expect(fold.shut[1]).toBeCloseTo(0, 8);
        // a lash goes the way of the edge it stands on, wherever on the lash it is
        const lash = blinkOf(x + CX, y + 0.001 + CY, z + 0.001 + CZ, face, true);
        expect(lash.shut[1]).toBeCloseTo(d.shut[1], 8);
        expect(lash.shut[2]).toBeCloseTo(d.shut[2], 4);
        // the figure's right eye mirrors its left
        const right = blinkOf(-x + CX, y + CY, z + CZ, face);
        expect(right.shut).toEqual(d.shut);
      }
      // only lids and lashes blink, and only up and down and in depth
      let n = 0, down = 0;
      for (let i = 0; i < shut.length / 3; i++) {
        expect(shut[3 * i]).toBe(0);
        if (shut[3 * i + 1] !== 0) {
          n++;
          down = Math.min(down, shut[3 * i + 1]!);
        }
      }
      let tagged = 0;
      for (const tag of ["lid", "lash"]) each(sc.ranges(tag), () => tagged++);
      expect(n).toBeGreaterThan(200);
      expect(n).toBeLessThanOrEqual(tagged);
      expect(down).toBeLessThan(-(f.upper(0) - f.lower(0)) * 0.95);
    }
  });

  it("has ears: shells from the brow to the nose's tip that stand a little off the head, and can do without", () => {
    const e = featureHeights(ADULT).eye;
    const sc = new Sculpt();
    addEars(sc, ADULT, PAINT.skin);
    const g = sc.geometry();
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const side = skullPoint(1.64, phiOfHeight(1.64, e - 0.008, ADULT), ADULT).x;
    expect(box.max.x - side).toBeGreaterThan(0.006);
    expect(box.max.x - side).toBeLessThan(0.016);
    expect(box.min.x).toBeCloseTo(-box.max.x, 6);
    expect(box.max.y - CY).toBeGreaterThan(e + 0.012);
    expect(box.max.y - CY).toBeLessThan(e + 0.03);
    expect(box.min.y - CY).toBeLessThan(e - 0.028);
    expect(box.min.y - CY).toBeGreaterThan(e - 0.05);
    // each a closed shell but where it grows out of the head
    const edges = edgesOf(g, 0, sc.vertexCount);
    expect(edges.crowded).toBe(0);
    expect(edges.open).toBeLessThan(edges.triangles * 0.08);
    expect(sc.ranges("skin").reduce((n, [, c]) => n + c, 0)).toBe(sc.vertexCount);
    // one ear, or none
    const one = new Sculpt();
    addEars(one, ADULT, PAINT.skin, [1]);
    expect(one.vertexCount * 2).toBe(sc.vertexCount);
    expect(head(ADULT, PAINT, false).sc.vertexCount).toBe(head(ADULT).sc.vertexCount - sc.vertexCount);
  });

  it("takes its eye colour from the hair's", () => {
    expect(irisFor(rgb("#1c1c1c"))).not.toEqual(irisFor(rgb("#c9b28a")));
    expect(irisFor(rgb("#1c1c1c"))).toEqual(irisFor(rgb("#1f1a17")));
  });
});
