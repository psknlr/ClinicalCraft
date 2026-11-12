/**
 * The people of the world — patients, the people with them and staff — as figures of real proportions built in
 * code (`figure/`): an appearance (skin, hair and its style, clothes, build, stature, a hospital gown, an
 * accessory), a posture (standing, sitting, lying in bed — or on their side on an operating table, draped for an
 * operation on the chest) and what is worn (`figure/wear.ts`: the uniform of a role as a position wears it). A
 * rig is three meshes of one material — limbs, the trunk (it breathes) and the head (it turns to the learner,
 * its jaw moves when its owner speaks, its eyes blink) — plus an unseen box that takes the aim. Distress flushes
 * the skin.
 */
import { BoxGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3, type BufferAttribute } from "three";
import { HEIGHT, LATERAL, STATURE_SCALE as SCALES, type Frame, type Posture as FigurePosture, type Skeleton } from "./figure/anatomy.js";
import type { SideBend } from "./figure/bend.js";
import { trunkAt } from "./figure/body.js";
import { buildFigure } from "./figure/figure.js";
import { blinkRound, MOVES } from "./figure/head.js";
import { figureMaterial } from "./figure/material.js";
import { feminineOf, presentationOf, type Presentation } from "./figure/looks.js";
import { rgb, type Ranges } from "./figure/sculpt.js";
import { PLAIN, type Wear } from "./figure/wear.js";
import { hashString } from "./textures.js";

export { heightOf, looksOf, presentationOf, presentationOfSex, type Presentation } from "./figure/looks.js";
export { ROLE_UNIFORMS, PATIENT_WEAR, PLAIN as PLAIN_WEAR, uniformOf, type Uniform, type Wear } from "./figure/wear.js";

export interface AppearanceLike {
  skin?: string;
  hair?: string;
  hairStyle?: "short" | "long" | "bald" | "bun" | "ponytail" | "curly" | "bob" | "wavy";
  shirt?: string;
  pants?: string;
  build?: "slim" | "average" | "heavy";
  stature?: "infant" | "child" | "teen" | "adult";
  gown?: boolean;
  accessory?: "none" | "glasses" | "mask" | "nasal-cannula" | "oxygen-mask" | "sling" | "cap";
  /** Drawn with a woman's features and frame, a man's, or neither's (default: by the hair style, as staff are — `presentationOf`). */
  presentation?: Presentation;
}

export type Posture = FigurePosture;

export interface PersonOptions {
  posture: Posture;
  /** Seat height (sitting) or mattress top (lying). */
  surfaceY?: number;
  /** What they wear and carry (default: plain clothes). */
  wear?: Wear;
  /** Who this is (an id): when they blink differs from person to person, the same for the same id. */
  seed?: string;
  /** Height against the stature's own (default 1). */
  height?: number;
  /** On their side (`lateral`): the side that is up (default the left). */
  up?: "left" | "right";
  /** On their side, what covers them: their own `clothes` (default), a `blanket` to the waist, or the `drapes` of an operation on the chest. */
  cover?: "clothes" | "blanket" | "drapes";
  /** On their side: how far each half of a flexed table goes down from the break under the chest (degrees; default 0). */
  flex?: number;
  /** Eyes shut (anaesthetised; a simulator at rest). */
  asleep?: boolean;
}

export interface PersonRig {
  root: Group;
  /** Everything of the figure, scaled for stature (laid down when lying; a walker bobs it). */
  body: Group;
  /** The head about the top of the neck (turns and nods). */
  head: Group;
  /** The trunk: breathing changes its depth (`setBreath`). */
  torso: Mesh;
  /** The head's surface: the jaw and the lids move (`setMouth`, `setBlink`). */
  face: Mesh;
  /** Name-tag anchor height (world-local y in root). */
  tagY: number;
  headBaseY: number;
  scale: number;
  posture: Posture;
  /** Skin vertices per mesh with their own colours and gloss (distress flushes them). */
  skin: { mesh: Mesh; ranges: Ranges; colour: Float32Array; finish: Float32Array }[];
  distressed: boolean;
  /** 0 … 1, this person's own (when they blink). */
  phase: number;
  /** Triangles drawn. */
  triangles: number;
  /** What the figure was built from — its measurements, its joints (upright frame) and its bend over a flexed table: a model fitted to the body reads them (`manikin.ts`). */
  frame: Frame;
  skeleton: Skeleton;
  bend: SideBend | null;
}

/** Flushed, sweaty skin: the colour skin goes towards and how far, and the sheen it gains. */
const FLUSH = rgb("#d77f68");
const FLUSH_MIX = 0.5;
const FLUSH_SHEEN = 0.3;

/** Flushed / sweaty skin (distress) on or off — a vertex-colour update, no extra draw calls. */
export function setDistressed(rig: PersonRig, on: boolean): void {
  if (rig.distressed === on) return;
  rig.distressed = on;
  for (const s of rig.skin) {
    const col = s.mesh.geometry.getAttribute("color") as BufferAttribute;
    const fin = s.mesh.geometry.getAttribute("finish") as BufferAttribute;
    for (const [start, count] of s.ranges) {
      for (let i = start; i < start + count; i++) {
        const r = s.colour[3 * i]!, g = s.colour[3 * i + 1]!, b = s.colour[3 * i + 2]!;
        if (on) col.setXYZ(i, r + (FLUSH[0] - r) * FLUSH_MIX, g + (FLUSH[1] - g) * FLUSH_MIX, b + (FLUSH[2] - b) * FLUSH_MIX);
        else col.setXYZ(i, r, g, b);
        fin.setX(i, s.finish[2 * i]! + (on ? FLUSH_SHEEN : 0));
      }
    }
    col.needsUpdate = true;
    fin.needsUpdate = true;
  }
}

/**
 * Breathing: the trunk's depth, `breath` a small fraction either way — and, for someone on their side whose
 * chest wall is seen rising, its width (`rise`: the side that is up lifts, the one underneath is on the mattress).
 */
export function setBreath(rig: PersonRig, breath: number, rise = 0): void {
  rig.torso.scale.z = 1 + breath;
  rig.torso.scale.x = 1 + rise;
}

/** The mouth: 0 closed … 1 as open as speech opens it. */
export function setMouth(rig: PersonRig, open: number): void {
  const m = rig.face.morphTargetInfluences;
  if (m) m[MOVES.jaw] = open;
}

/** The eyes: 0 open … 1 shut (the lids go round the eyes on their way: a move of its own, fullest half-way). */
export function setBlink(rig: PersonRig, shut: number): void {
  const m = rig.face.morphTargetInfluences;
  if (!m) return;
  m[MOVES.blink] = shut;
  m[MOVES.round] = blinkRound(shut);
}

export const DEFAULT_APPEARANCE: Required<Omit<AppearanceLike, "presentation">> = {
  skin: "#cba88a",
  hair: "#3b3027",
  hairStyle: "short",
  shirt: "#6d9fba",
  pants: "#354442",
  build: "average",
  stature: "adult",
  gown: false,
  accessory: "none",
};

export const STATURE_SCALE: Record<string, number> = SCALES;

/** Height of the top of the head (adult standing). */
export const PERSON_HEIGHT = HEIGHT;

/** Lying on a bed: the feet this far (per unit of stature) from the middle of the bed, so the head is on the pillow. */
const LIE_FEET = 0.95;
/** Lying: how far the pillow raises the head. */
const PILLOW = 0.04;

const AIM_BOX = new BoxGeometry(1, 1, 1);
const AIM_MATERIAL = new MeshBasicMaterial({ visible: false });
const CLEAR_MATERIAL = new MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.42, roughness: 0.12, depthWrite: false });
CLEAR_MATERIAL.name = "__figure-clear";

/** Build a person whose feet are at the root origin facing +Z. */
export function buildPerson(appearance: AppearanceLike | undefined, opts: PersonOptions): PersonRig {
  const ap: Required<Omit<AppearanceLike, "presentation">> & Pick<AppearanceLike, "presentation"> = { ...DEFAULT_APPEARANCE };
  for (const [k, v] of Object.entries(appearance ?? {})) if (v !== undefined && v !== null) (ap as Record<string, unknown>)[k] = v;
  const feminine = feminineOf(ap.presentation ?? presentationOf(ap.hairStyle));
  const lying = opts.posture === "lying", lateral = opts.posture === "lateral";
  const seat = opts.surfaceY ?? (lying || lateral ? 0.9 : 0.5);
  const fig = buildFigure({ ...ap, posture: opts.posture, seat, wear: opts.wear ?? PLAIN, pillow: lying ? PILLOW : 0, feminine, up: opts.up, cover: opts.cover, flex: ((opts.flex ?? 0) * Math.PI) / 180 });
  const scale = fig.frame.scale * (opts.height ?? 1);
  const material = figureMaterial();

  const root = new Group();
  root.name = "person";
  const body = new Group();
  root.add(body);
  body.scale.setScalar(scale);

  const part = (geometry: typeof fig.body, parent: Group): Mesh => {
    const m = new Mesh(geometry, material);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.figure = true;
    // the aim is taken by the box below: aiming at a person never slips between an arm and the trunk
    m.raycast = () => {};
    parent.add(m);
    return m;
  };
  const limbs = part(fig.body, body);
  const torso = part(fig.chest, body);
  const head = new Group();
  head.position.set(fig.pivot[0], fig.pivot[1], fig.pivot[2]);
  head.rotation.z = fig.pivotTurn;
  head.scale.setScalar(fig.frame.head);
  body.add(head);
  const face = part(fig.head, head);
  face.morphTargetInfluences = opts.asleep ? [0, 1, blinkRound(1)] : [0, 0, 0];
  if (fig.clear) {
    const clear = new Mesh(fig.clear, CLEAR_MATERIAL);
    clear.userData.figure = true;
    clear.raycast = () => {};
    clear.renderOrder = 2;
    head.add(clear);
  }

  // the aim box hugs the figure: the trunk and legs as they are, up to the top of the head
  const top = fig.pivot[1] + fig.crown * fig.frame.head;
  const aim = new Mesh(AIM_BOX, AIM_MATERIAL);
  const knee = fig.skeleton.legs[0].mid[2];
  // (someone in bed: as high over the mattress as the bed's rails, so the aim from above finds the patient before the bed)
  const z0 = -0.14, z1 = opts.posture === "sitting" ? knee + 0.1 : lying ? 0.46 : lateral ? 0.4 : 0.17;
  const halfW = (lying || lateral ? 0.3 : 0.25) * (0.5 + 0.5 * fig.frame.wide);
  aim.scale.set(halfW * 2, top, z1 - z0);
  aim.position.set(0, top / 2, (z0 + z1) / 2);
  body.add(aim);

  const skin: PersonRig["skin"] = [];
  for (const [mesh, ranges] of [[limbs, fig.skin.body], [torso, fig.skin.chest], [face, fig.skin.head]] as const) {
    if (!ranges.length) continue;
    skin.push({ mesh, ranges, colour: (mesh.geometry.getAttribute("color").array as Float32Array).slice(), finish: (mesh.geometry.getAttribute("finish").array as Float32Array).slice() });
  }

  // posture: someone lying is built upright and laid on their back, the head towards −Z
  let tagY = top * scale + 0.3;
  if (lying) {
    const back = trunkAt(1.3, fig.frame, { ease: 0.012, straight: 0 })[2];
    body.rotation.x = -Math.PI / 2;
    body.position.set(0, seat + (back - 0.012) * scale, LIE_FEET * scale);
    tagY = seat + 0.95;
  } else if (lateral) {
    // on their side: built upright and laid down with the head towards −Z — the side that is up to +Y, the face
    // to −X (the left side up) or +X (the right) — the surface under the chest, where a flexed table breaks, at
    // the root's origin and the middle of the table under it (`LATERAL`)
    const up = opts.up === "right" ? -1 : 1;
    const lay = new Matrix4().makeBasis(new Vector3(0, up, 0), new Vector3(0, 0, -1), new Vector3(-up, 0, 0));
    body.quaternion.setFromRotationMatrix(lay);
    const under = new Vector3(-up * LATERAL.rest, LATERAL.break, LATERAL.shift).multiplyScalar(scale).applyMatrix4(lay);
    body.position.set(-under.x, seat - under.y, -under.z);
    tagY = seat + 0.95;
  }

  const phase = (hashString(opts.seed ?? "someone") % 1000) / 1000;
  return { root, body, head, torso, face, tagY, headBaseY: fig.pivot[1], scale, posture: opts.posture, skin, distressed: false, phase, triangles: fig.triangles, frame: fig.frame, skeleton: fig.skeleton, bend: fig.bend };
}

/** Disposes what a rig owns: its geometries (the materials are shared by every figure). */
export function disposeRig(rig: PersonRig): void {
  rig.root.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.userData?.figure) mesh.geometry.dispose();
  });
  rig.root.removeFromParent();
}
