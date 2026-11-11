/**
 * A whole figure from an appearance, a posture and what is worn: three geometries in the figure's own frame —
 * the limbs (`body`), the trunk with everything that lies on it and so breathes with it (`chest`), and the head
 * about its joint (`head`) — plus the see-through parts on the head (`clear`: lenses, an oxygen mask). Skin
 * vertices are remembered per geometry for the flush of distress.
 */
import { Matrix4, Vector3, type BufferGeometry } from "three";
import { frameOf, PIVOT, skeletonOf, type ArmPose, type Build, type Frame, type Posture, type Skeleton, type Stature } from "./anatomy.js";
import { addNeck, addShell, addShoe, addTrunk, armRadii, endFrame, footFrame, inside, legRadii, limbStations, trouserRadii, type Fit, type ShoeKind } from "./body.js";
import { addHand, HAND_CLASPED, HAND_FLAT, HAND_RELAXED } from "./hand.js";
import { addHair, type HairStyle } from "./hair.js";
import { addHead, irisFor, SKIN_GLOW } from "./head.js";
import { addBlanket, addChestDetails, addCoat, addLap, addSlingStrap, addSterileGown, COAT_FIT, neckline } from "./dress.js";
import { addAccessory, addTheatreCap, addSurgicalMask, type Accessory } from "./extras.js";
import { paint, rgb, Sculpt, sweepEnd, type Paint, type Ranges, type V3 } from "./sculpt.js";
import { STERILE_GOWN, THEATRE_CAP, type Wear } from "./wear.js";

export interface FigureSpec {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  pants: string;
  build: Build;
  stature: Stature;
  gown: boolean;
  accessory: Accessory;
  posture: Posture;
  /** Seat height (sitting) or mattress top (lying), in world units. */
  seat: number;
  wear: Wear;
  /** How far a pillow raises the head of someone lying (figure units; default 0). */
  pillow?: number;
}

export interface Figure {
  body: BufferGeometry;
  chest: BufferGeometry;
  head: BufferGeometry;
  clear: BufferGeometry | null;
  skin: { body: Ranges; chest: Ranges; head: Ranges };
  frame: Frame;
  skeleton: Skeleton;
  /** The head's joint in the figure's frame. */
  pivot: V3;
  /** The top of the head (hair and cap included) above the joint, in the head's own units. */
  crown: number;
  triangles: number;
}

/** Sides of the piece of arm a hand grows out of: enough that its end is round where the hand's skin takes over. */
const WRIST_SIDES = 16;
const MIRROR = new Matrix4().makeScale(-1, 1, 1);
const SLING: Paint = { rgb: rgb("#e9edf0"), gloss: 0 };

const SHOE_COLOURS: Record<ShoeKind, [string, string]> = {
  leather: ["#2a2420", "#1c1917"],
  trainer: ["#e8e8e4", "#b9bcbd"],
  clog: ["#e9ecec", "#c9cfd1"],
  boot: ["#1f2022", "#141414"],
  slipper: ["#8fb0c0", "#6f8f9f"],
  bare: ["#000000", "#000000"],
};

/** Sleeve length and room of what covers the arms. */
function sleeveOf(wear: Wear, gown: boolean): { long: boolean; ease: number } {
  if (wear.over === "coat") return { long: true, ease: COAT_FIT.ease * 0.62 };
  if (wear.over === "sterile") return { long: true, ease: 0.016 };
  if (gown) return { long: false, ease: 0.02 };
  if (wear.top === "shirt") return { long: true, ease: 0.008 };
  return { long: false, ease: wear.top === "scrub" ? 0.013 : 0.009 };
}

/** Build a figure (see the module doc). */
export function buildFigure(spec: FigureSpec): Figure {
  const f = frameOf(spec.build, spec.stature);
  const wear = spec.wear;
  const gown = spec.gown;
  const lying = spec.posture === "lying", sitting = spec.posture === "sitting";
  const sling = spec.accessory === "sling";
  const pose: ArmPose = wear.hands === "clasped" && spec.posture === "standing" ? "clasped" : "relaxed";
  const sk = skeletonOf(spec.posture, f, spec.seat / f.scale, sling ? ["sling", pose] : pose);
  const lift = sk.lift;

  const skin: Paint = { rgb: rgb(spec.skin), gloss: 0.14, glow: SKIN_GLOW };
  const shirt = paint(gown ? "#b7d2dc" : spec.shirt);
  const pants = paint(spec.pants);
  const over = wear.over === "coat" ? paint("#f1f2ee") : wear.over === "sterile" ? paint(STERILE_GOWN) : null;
  const glove: Paint = { rgb: rgb("#e6dcc4"), gloss: 0.3 };
  const shoeKind: ShoeKind = spec.stature === "infant" ? "bare" : gown ? "slipper" : wear.shoes;
  const [upperHex, soleHex] = SHOE_COLOURS[shoeKind];
  const shoeUpper: Paint = shoeKind === "bare" ? skin : { rgb: rgb(wear.shoe ?? upperHex), gloss: shoeKind === "leather" || shoeKind === "boot" ? 0.55 : 0.2 };
  const shoeSole = paint(soleHex, 0.1);

  /* ---------------- the trunk and what lies on it ---------------- */
  const chest = new Sculpt();
  chest.tagged("skin", () => addTrunk(chest, f, lift, 1.25, 1.482, skin, { ease: -0.002, straight: 0 }, { seg: 16, start: "open", end: "open" }));
  const top = gown ? "gown" : wear.top;
  const topFit: Fit = top === "gown" ? { ease: 0.026, straight: 1, flare: 0.05 } : top === "scrub" ? { ease: 0.016, straight: 0.95 } : top === "shirt" ? { ease: 0.008, straight: 0.45 } : { ease: 0.013, straight: 0.85 };
  const tucked = top === "shirt";
  const longGown = top === "gown" && spec.posture === "standing";
  const topHem = tucked ? 1.0 : longGown ? 0.5 : top === "gown" ? 0.84 : top === "scrub" ? 0.862 : 0.874;
  addShell(chest, f, lift, { hem: topHem, neck: neckline(top), fit: topFit, paint: shirt, nv: longGown ? 20 : 16 });
  // what covers the hips: trousers (their top under an untucked hem, or belted over a tucked shirt), or the gown
  const hipPaint = top === "gown" ? shirt : pants;
  addTrunk(chest, f, lift, 0.775, 0.95, hipPaint, { ease: 0.005, straight: 0 }, { seg: 20, start: "round", end: "open" });
  if (tucked) addTrunk(chest, f, lift, 0.93, 1.046, hipPaint, { ease: 0.012, straight: 0 }, { seg: 20, start: "open", end: "flat" });
  if (wear.over === "coat") addCoat(chest, f, lift, over!);
  if (wear.over === "sterile") addSterileGown(chest, f, lift, over!);
  addChestDetails(chest, f, lift, { wear, top, topFit, shirt, pants, tucked, hem: topHem, accent: paint("#2f8f88", 0.3) });
  if (sitting && top === "gown") addLap(chest, sk, f, shirt);
  if (sling) addSlingStrap(chest, f, lift, wear.over === "coat" ? COAT_FIT : topFit, sk, SLING);

  /* ---------------- limbs ---------------- */
  const body = new Sculpt();
  const forward = spec.pillow ?? 0;
  body.tagged("skin", () => addNeck(body, f, lift, skin, forward));
  const sleeve = sleeveOf(wear, gown);
  const sleevePaint = over ?? shirt;
  const arms = armRadii(f);
  const side = (index: 0 | 1, fn: () => void) => (index === 0 ? fn() : body.within(MIRROR, fn));
  for (const index of [0, 1] as const) {
    const armL = sk.arms[index];
    const slung = sling && index === 0;
    side(index, () => {
      // the forearm turns with its hand, so every piece of the arm is cut with `turn`
      const arm = (t0: number, t1: number, radii: (t: number) => number[]) => limbStations(armL, t0, t1, radii, 0.05, true);
      const hemT = sleeve.long ? 1.93 : 0.56;
      body.sweep(arm(0, hemT, armRadii(f, sleeve.ease)), sleevePaint, { seg: 10, start: "round", dome: 0.72, end: "flat", capPaint: inside(sleevePaint) });
      // what the hand grows out of: the bare forearm, or a glove's cuff over the sleeve
      const cuffed = sleeve.long && wear.gloves;
      const forearm = cuffed ? arm(1.7, 2, armRadii(f, sleeve.ease + 0.0035)) : arm(sleeve.long ? 1.86 : 0.44, 2, arms);
      if (cuffed) body.sweep(forearm, glove, { seg: WRIST_SIDES, start: "open", end: "open" });
      else body.tagged("skin", () => body.sweep(forearm, skin, { seg: WRIST_SIDES, start: "open", end: "open" }));
      const frame = endFrame(armL), toHand = frame.clone().invert();
      const ring = sweepEnd(forearm, { seg: WRIST_SIDES });
      const wrist: number[] = [];
      for (let i = 0; i < ring.length; i += 3) {
        const v = new Vector3(ring[i]!, ring[i + 1]!, ring[i + 2]!).applyMatrix4(toHand);
        wrist.push(v.x, v.y, v.z);
      }
      const handPaint = wear.gloves ? glove : skin;
      const handPose = pose === "clasped" ? HAND_CLASPED : sitting || lying || slung ? HAND_FLAT : HAND_RELAXED;
      const hand = () => body.within(frame, () => void addHand(body, handPaint, handPose, { girth: 0.96 + 0.04 * f.limb, gloved: wear.gloves, wrist }));
      if (wear.gloves) hand();
      else body.tagged("skin", hand);
      if (slung) {
        // the sling: cloth round the forearm from the elbow to the hand
        body.sweep(arm(0.9, 1.97, armRadii(f, sleeve.ease + 0.014)), SLING, { seg: 10, start: "round", end: "flat", capPaint: inside(SLING) });
      }
      // reflective bands round the upper arms
      if (wear.stripe) body.sweep(arm(0.56, 0.72, armRadii(f, sleeve.ease + 0.002)), { rgb: rgb(wear.stripe), gloss: 0.25 }, { seg: 10, start: "flat", end: "flat" });
      // the identity band on the left wrist (the right when the left arm is in a sling)
      if (wear.wristband && index === (sling ? 1 : 0)) body.sweep(arm(1.86, 1.9, armRadii(f, 0.0022)), paint("#f4f4f0", 0.2), { seg: 10, start: "flat", end: "flat" });
    });
  }
  const bareLegs = top === "gown";
  for (const index of [0, 1] as const) {
    const leg = sk.legs[index];
    side(index, () => {
      if (bareLegs) body.tagged("skin", () => body.sweep(limbStations(leg, 0, 2, legRadii(f), 0.075), skin, { seg: 12, start: "open", end: "open" }));
      else {
        body.sweep(limbStations(leg, 0, 1.92, trouserRadii(f), 0.075), pants, { seg: 12, start: "open", end: "flat", capPaint: inside(pants) });
        // reflective bands round the shins
        if (wear.stripe) {
          body.sweep(limbStations(leg, 1.5, 1.62, (t) => trouserRadii(f, 0.014)(t), 0.075), { rgb: rgb(wear.stripe), gloss: 0.25 }, { seg: 12, start: "flat", end: "flat" });
          body.sweep(limbStations(leg, 1.54, 1.58, (t) => trouserRadii(f, 0.0155)(t), 0.075), { rgb: rgb("#d5d9da"), gloss: 0.7 }, { seg: 12, start: "flat", end: "flat" });
        }
        // the ankle between hem and shoe: a sock
        body.sweep(limbStations(leg, 1.8, 2, legRadii(f, 0.002), 0.075), shoeKind === "bare" ? skin : paint("#3a3f45"), { seg: 10, start: "open", end: "open" });
      }
      // in bed the feet are under the covers
      const shoe = () => body.within(footFrame(leg), () => addShoe(body, shoeKind, shoeUpper, shoeSole, f.limb));
      if (lying) return;
      if (shoeKind === "bare") body.tagged("skin", shoe);
      else shoe();
    });
  }
  if (lying) addBlanket(chest, sk, f, lift);

  /* ---------------- the head ---------------- */
  const head = new Sculpt();
  const clear = new Sculpt();
  const face = { young: f.young, wide: 1 + (f.wide - 1) * 0.8 + f.belly * 1.2 };
  const capped = wear.cap || spec.accessory === "cap";
  const hairRgb = rgb(spec.hair);
  // long hair falls over the ears (unless a cap holds it)
  const { faceZ, move } = addHead(head, face, { skin: skin.rgb, hair: hairRgb, scalp: spec.hairStyle !== "bald", iris: irisFor(hairRgb) }, { ears: spec.hairStyle !== "long" || capped });
  let crown = addHair(head, face, spec.hairStyle, hairRgb, { capped, infant: spec.stature === "infant" });
  if (wear.cap) crown = Math.max(crown, addTheatreCap(head, face, paint(THEATRE_CAP), spec.hairStyle));
  if (wear.mask || spec.accessory === "mask") addSurgicalMask(head, face);
  crown = Math.max(crown, addAccessory(head, clear, spec.accessory, face, faceZ, { shirt: rgb(spec.shirt), skin: skin.rgb }));

  const bodyG = body.geometry(), chestG = chest.geometry(), headG = head.geometry();
  move(headG);
  const clearG = clear.vertexCount ? clear.geometry() : null;
  return {
    body: bodyG,
    chest: chestG,
    head: headG,
    clear: clearG,
    skin: { body: body.ranges("skin"), chest: chest.ranges("skin"), head: head.ranges("skin") },
    frame: f,
    skeleton: sk,
    pivot: [0, PIVOT + lift, forward],
    crown,
    triangles: body.triangleCount + chest.triangleCount + head.triangleCount + clear.triangleCount,
  };
}
