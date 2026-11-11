/**
 * A stethoscope, part by part: the two-sided chest piece (the diaphragm in its dark non-chill rim, the body
 * narrowing to the stem, the smaller bell behind), the tubing, and the headset — two sprung metal ear tubes
 * from the yoke of the tubing to soft ear tips. Worn round a clinician's neck (`dress.ts`) and held in the
 * player's hand (`overlay.ts`).
 */
import { Matrix4 } from "three";
import { rgb, type Paint, type Sculpt, type V3 } from "./sculpt.js";

export const STEEL: Paint = { rgb: rgb("#cdd2d5"), gloss: 0.92 };
export const TUBING: Paint = { rgb: rgb("#1c252d"), gloss: 0.42 };
const RIM: Paint = { rgb: rgb("#26292c"), gloss: 0.35 };
const DIAPHRAGM: Paint = { rgb: rgb("#e3e6e1"), gloss: 0.62 };
const CUP: Paint = { rgb: rgb("#4b5054"), gloss: 0.5 };
const TIP: Paint = { rgb: rgb("#d9dbd6"), gloss: 0.3 };

/** Radius of the diaphragm side, and where the tubing meets the stem above the chest piece's middle. */
export const CHEST_PIECE_RADIUS = 0.0222;
export const STEM_END = 0.047;
/** Radius of the tubing and of an ear tube. */
export const TUBE_RADIUS = 0.0046;
export const EAR_TUBE_RADIUS = 0.0027;

const AXIS_Z = new Matrix4().makeRotationX(Math.PI / 2);

/**
 * A chest piece in its own frame: the diaphragm faces +Z, the bell −Z, the stem runs up +Y to `STEM_END`,
 * where the tubing goes on. `seg`: points round it (more for the one in the player's hand).
 */
export function addChestPiece(sc: Sculpt, seg = 16): void {
  sc.within(AXIS_Z, () => {
    // the inside of the bell, the bell and the body up to the diaphragm's housing, the rim, the diaphragm
    sc.lathe([0, 0, 0], [[0, -0.0078], [0.008, -0.0105], [0.0145, -0.0148]], CUP, { seg });
    sc.lathe([0, 0, 0], [[0.0145, -0.0148], [0.0162, -0.0159], [0.0177, -0.0148], [0.0165, -0.0128], [0.0115, -0.009], [0.0082, -0.0056], [0.0076, -0.003], [0.0105, -0.0008], [0.019, 0.0032], [0.0218, 0.006]], STEEL, { seg, hard: [2] });
    sc.lathe([0, 0, 0], [[0.0218, 0.006], [0.0222, 0.0064], [0.0222, 0.0098], [0.0213, 0.0113], [0.0197, 0.0117]], RIM, { seg, hard: [1] });
    sc.lathe([0, 0, 0], [[0.0197, 0.0117], [0.0192, 0.0109], [0, 0.0109]], DIAPHRAGM, { seg });
  });
  // the stem: out of the body between the two sides, and the ribbed end the tubing pushes onto
  sc.sweep(
    [
      { p: [0, 0.005, -0.0028], rx: 0.0046, rz: 0.0046 },
      { p: [0, 0.02, -0.0028], rx: 0.0044, rz: 0.0044 },
      { p: [0, 0.03, -0.0026], rx: 0.0036, rz: 0.0036 },
      { p: [0, STEM_END - 0.006, -0.0024], rx: 0.0034, rz: 0.0034 },
    ],
    STEEL,
    { seg: 8, start: "open", end: "flat" },
  );
}

/** Tubing through `points` (smoothed). */
export function addTubing(sc: Sculpt, points: readonly V3[], paint: Paint = TUBING, seg = 6, steps = 3): void {
  sc.tube(points, TUBE_RADIUS, paint, { seg, steps, start: "round", end: "round" });
}

/** One ear tube through `points` (smoothed), with its ear tip at the last. */
export function addEarTube(sc: Sculpt, points: readonly V3[], seg = 5): void {
  sc.tube(points, EAR_TUBE_RADIUS, STEEL, { seg, steps: 3, start: "round", end: "round" });
  const e = points[points.length - 1]!;
  sc.ball(e, 0.0058, 0.0058, 0.0058, TIP, 8, 5);
}
