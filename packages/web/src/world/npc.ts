/**
 * Voxel people (V4 `oe()` generalised): appearance (skin, hair & style,
 * clothes, build, stature, gown, accessory), posture (standing / sitting /
 * lying on a bed), head tracking, speaking (jaw + head bob) and distress.
 */
import { Group, Mesh, MeshStandardMaterial, Object3D, type BufferGeometry, type Material } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MaterialLibrary } from "./materials.js";
import { UNIT_BOX } from "./voxels.js";

/**
 * Merge the static boxes directly under `group` into one mesh per material
 * (≈ 30 draw calls per person → ≈ 10). Meshes in `keep` stay separate
 * (animated parts). Returns the merged mesh for each material.
 */
export function mergeStatic(group: Object3D, keep: Set<Object3D>): Map<Material, Mesh> {
  const buckets = new Map<Material, Mesh[]>();
  for (const child of [...group.children]) {
    const m = child as Mesh;
    if (!m.isMesh || keep.has(m) || Array.isArray(m.material) || m.geometry !== UNIT_BOX) continue;
    const mat = m.material as Material;
    let list = buckets.get(mat);
    if (!list) buckets.set(mat, (list = []));
    list.push(m);
  }
  const out = new Map<Material, Mesh>();
  for (const [mat, list] of buckets) {
    if (list.length < 2) {
      out.set(mat, list[0]);
      continue;
    }
    const geoms: BufferGeometry[] = list.map((m) => {
      m.updateMatrix();
      return UNIT_BOX.clone().applyMatrix4(m.matrix);
    });
    const merged = mergeGeometries(geoms, false);
    for (const g of geoms) g.dispose();
    if (!merged) continue;
    for (const m of list) group.remove(m);
    const mesh = new Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.merged = true;
    group.add(mesh);
    out.set(mat, mesh);
  }
  return out;
}

export interface AppearanceLike {
  skin?: string;
  hair?: string;
  hairStyle?: "short" | "long" | "bald" | "bun" | "ponytail" | "curly";
  shirt?: string;
  pants?: string;
  build?: "slim" | "average" | "heavy";
  stature?: "infant" | "child" | "teen" | "adult";
  gown?: boolean;
  accessory?: "none" | "glasses" | "mask" | "nasal-cannula" | "oxygen-mask" | "sling" | "cap";
}

export type Posture = "standing" | "sitting" | "lying";

export interface PersonOptions {
  posture: Posture;
  /** Seat height (sitting) or mattress top (lying). */
  surfaceY?: number;
  /** White coat skirt (attending / pharmacist…). */
  coat?: boolean;
  badge?: boolean;
  /** Extra uniform stripe colour (paramedic). */
  stripe?: string;
}

export interface PersonRig {
  root: Group;
  body: Group;
  head: Group;
  mouth: Mesh;
  torso: Mesh;
  /** Name-tag anchor height (world-local y in root). */
  tagY: number;
  headBaseY: number;
  scale: number;
  posture: Posture;
  skinMeshes: Mesh[];
  skinMaterial: Material;
  flushMaterial: Material;
}

export const DEFAULT_APPEARANCE: Required<AppearanceLike> = {
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

export const STATURE_SCALE: Record<string, number> = { adult: 1, teen: 0.9, child: 0.72, infant: 0.45 };

/** Height of the top of the head (adult standing, V4 rig). */
export const PERSON_HEIGHT = 2.0;

function box(parent: Object3D, mat: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0): Mesh {
  const m = new Mesh(UNIT_BOX, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  if (rx) m.rotation.x = rx;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Build a person whose feet are at the root origin facing +Z. */
export function buildPerson(lib: MaterialLibrary, appearance: AppearanceLike | undefined, opts: PersonOptions): PersonRig {
  const ap = { ...DEFAULT_APPEARANCE, ...(appearance ?? {}) };
  const scale = STATURE_SCALE[ap.stature] ?? 1;
  const skin = lib.color(ap.skin);
  const hair = lib.color(ap.hair);
  const shirt = ap.gown ? lib.color("#b9d3dc", "dots", 0.06) : lib.color(ap.shirt);
  const pants = lib.color(ap.pants);
  const coal = lib.get("coal");
  const shoe = lib.get("darkwood");
  const white = lib.get("white");
  const pink = lib.get("pink");
  const flush = lib.color("#d9907a");

  const root = new Group();
  root.name = "person";
  const body = new Group();
  root.add(body);
  body.scale.setScalar(scale);

  const torsoW = ap.build === "slim" ? 0.58 : ap.build === "heavy" ? 0.8 : 0.66;
  const torsoD = ap.build === "heavy" ? 0.46 : 0.36;
  const armX = torsoW / 2 + 0.11;
  const skinMeshes: Mesh[] = [];

  let torsoC = 1.12;
  let legsTop = 0.81;
  const seat = opts.surfaceY ?? 0.5;
  if (opts.posture === "sitting") {
    // seat in rig units (body is scaled)
    const s = seat / scale;
    legsTop = s + 0.28;
    torsoC = legsTop + 0.31;
    for (const sx of [-1, 1]) {
      box(body, pants, sx * 0.18, s + 0.14, 0.2, 0.25, 0.28, 0.52);
      const shinTop = s;
      const shinBot = Math.max(0, s - 0.5);
      box(body, pants, sx * 0.18, (shinTop + shinBot) / 2, 0.42, 0.25, Math.max(0.1, shinTop - shinBot), 0.26);
      box(body, shoe, sx * 0.18, shinBot + 0.09, 0.5, 0.29, 0.18, 0.42);
    }
    if (ap.gown) box(body, shirt, 0, s + 0.3, 0.12, torsoW, 0.1, 0.62);
  } else {
    for (const sx of [-1, 1]) {
      box(body, pants, sx * 0.18, 0.53, 0, 0.25, 0.56, 0.3);
      if (opts.posture !== "lying") box(body, shoe, sx * 0.18, 0.21, 0.1, 0.29, 0.18, 0.46);
    }
    // in bed: a blanket over legs and trunk (rig space: y along the body, z = up out of the bed)
    if (opts.posture === "lying") box(body, lib.color("#9fc2cc", "stripe", 0.06), 0, 0.68, 0.035, torsoW + 0.12, 1.26, 0.33);
    if (ap.gown) box(body, shirt, 0, 0.66, 0, torsoW + 0.04, 0.42, torsoD + 0.04);
    if (opts.coat) box(body, white, 0, 0.7, 0, torsoW + 0.06, 0.36, torsoD + 0.06);
  }
  const torso = box(body, opts.coat ? white : shirt, 0, torsoC, 0, torsoW, 0.65, torsoD);
  torso.userData.baseZ = torsoD;
  if (opts.coat) box(body, shirt, 0, torsoC + 0.2, torsoD / 2 + 0.005, 0.2, 0.25, 0.02); // shirt under coat
  if (opts.stripe) box(body, lib.color(opts.stripe, "flat", 0.04), 0, torsoC - 0.12, torsoD / 2 + 0.006, torsoW + 0.01, 0.06, 0.02);
  void legsTop;

  // arms
  const sling = ap.accessory === "sling";
  for (const sx of [-1, 1]) {
    if (sling && sx === 1) {
      const fore = box(body, skin, 0.12, torsoC - 0.12, torsoD / 2 + 0.1, 0.45, 0.16, 0.18);
      skinMeshes.push(fore);
      box(body, lib.color("#6d9fba", "stripe", 0.06), 0.12, torsoC - 0.14, torsoD / 2 + 0.12, 0.52, 0.22, 0.16);
      box(body, lib.color("#6d9fba", "stripe", 0.06), -0.05, torsoC + 0.15, 0, 0.08, 0.5, torsoD + 0.02, 0);
      const upper = box(body, opts.coat ? white : shirt, armX, torsoC + 0.08, 0.02, 0.18, 0.4, 0.2);
      void upper;
      continue;
    }
    const sitting = opts.posture === "sitting";
    const arm = box(body, skin, sx * armX, torsoC - 0.1, sitting ? 0.08 : 0, 0.18, 0.65, 0.2, sitting ? -0.35 : 0);
    skinMeshes.push(arm);
    // sleeves
    box(body, opts.coat ? white : shirt, sx * armX, torsoC + 0.16, sitting ? 0.0 : 0, 0.2, 0.2, 0.22);
  }
  if (opts.badge !== false) box(body, white, 0.17, torsoC + 0.09, torsoD / 2 + 0.01, 0.13, 0.17, 0.02);

  // head (V4 proportions)
  const head = new Group();
  const headBaseY = torsoC + 0.56;
  head.position.y = headBaseY;
  if (opts.posture === "lying") head.position.z = 0.08; // resting on the pillow
  body.add(head);
  skinMeshes.push(box(head, skin, 0, 0, 0, 0.53, 0.52, 0.47));
  skinMeshes.push(box(head, skin, 0, -0.02, 0.25, 0.09, 0.12, 0.09));
  switch (ap.hairStyle) {
    case "bald":
      box(head, hair, -0.27, -0.02, -0.1, 0.03, 0.14, 0.24);
      box(head, hair, 0.27, -0.02, -0.1, 0.03, 0.14, 0.24);
      break;
    case "curly":
      box(head, hair, 0, 0.27, -0.02, 0.62, 0.18, 0.53);
      box(head, hair, -0.29, 0.09, -0.06, 0.1, 0.34, 0.42);
      box(head, hair, 0.29, 0.09, -0.06, 0.1, 0.34, 0.42);
      box(head, hair, 0, 0.1, -0.27, 0.6, 0.36, 0.08);
      break;
    default:
      box(head, hair, 0, 0.245, -0.04, 0.56, 0.12, 0.45);
      box(head, hair, -0.255, 0.08, -0.08, 0.08, 0.3, 0.35);
      box(head, hair, 0.255, 0.08, -0.08, 0.08, 0.3, 0.35);
      if (ap.hairStyle === "long") {
        box(head, hair, -0.26, -0.12, -0.08, 0.07, 0.42, 0.34);
        box(head, hair, 0.26, -0.12, -0.08, 0.07, 0.42, 0.34);
        box(head, hair, 0, -0.08, -0.26, 0.56, 0.62, 0.07);
      } else if (ap.hairStyle === "bun") {
        box(head, hair, 0, 0.22, -0.3, 0.22, 0.2, 0.16);
      } else if (ap.hairStyle === "ponytail") {
        box(head, hair, 0, 0.1, -0.27, 0.16, 0.14, 0.08);
        box(head, hair, 0, -0.14, -0.3, 0.12, 0.38, 0.09);
      }
      break;
  }
  for (const sx of [-1, 1]) {
    box(head, coal, sx * 0.13, 0.015, 0.243, 0.055, 0.065, 0.025);
    box(head, hair, sx * 0.13, 0.1, 0.248, 0.12, 0.035, 0.025);
  }
  const mouth = box(head, pink, 0, -0.14, 0.245, 0.16, 0.025, 0.025);

  // accessories
  switch (ap.accessory) {
    case "glasses": {
      const glass = lib.has("glass") ? lib.get("glass") : coal;
      for (const sx of [-1, 1]) {
        box(head, glass, sx * 0.13, 0.015, 0.262, 0.15, 0.1, 0.012);
        box(head, coal, sx * 0.13, 0.068, 0.265, 0.16, 0.014, 0.014);
        box(head, coal, sx * 0.272, 0.04, 0.1, 0.014, 0.014, 0.3);
      }
      box(head, coal, 0, 0.04, 0.266, 0.07, 0.014, 0.014);
      break;
    }
    case "mask":
      box(head, lib.color("#cfe3ea", "stripe", 0.04), 0, -0.1, 0.255, 0.36, 0.2, 0.04);
      box(head, white, -0.27, -0.05, 0.1, 0.012, 0.012, 0.3);
      box(head, white, 0.27, -0.05, 0.1, 0.012, 0.012, 0.3);
      break;
    case "nasal-cannula": {
      const tube = lib.color("#d6eef2", "flat", 0.02);
      box(head, tube, 0, -0.075, 0.29, 0.18, 0.02, 0.02);
      box(head, tube, -0.04, -0.06, 0.28, 0.02, 0.03, 0.02);
      box(head, tube, 0.04, -0.06, 0.28, 0.02, 0.03, 0.02);
      for (const sx of [-1, 1]) {
        box(head, tube, sx * 0.19, -0.075, 0.2, 0.02, 0.02, 0.18);
        box(head, tube, sx * 0.275, -0.02, 0.05, 0.02, 0.12, 0.14);
        box(head, tube, sx * 0.2, -0.28, 0.05, 0.02, 0.3, 0.02);
      }
      break;
    }
    case "oxygen-mask": {
      const mask = new MeshStandardMaterial({ color: "#bfe6d6", transparent: true, opacity: 0.72, roughness: 0.3 });
      box(head, mask, 0, -0.08, 0.29, 0.26, 0.25, 0.1);
      box(head, mask, 0, -0.08, 0.35, 0.14, 0.14, 0.04);
      box(head, lib.color("#e9ecea", "flat", 0.02), 0, -0.08, -0.0, 0.56, 0.02, 0.5);
      box(head, lib.color("#bfe6d6", "flat", 0.02), 0, -0.36, 0.32, 0.035, 0.36, 0.035);
      break;
    }
    case "cap":
      box(head, lib.color(ap.shirt), 0, 0.3, -0.01, 0.58, 0.12, 0.5);
      box(head, lib.color(ap.shirt), 0, 0.25, 0.27, 0.5, 0.04, 0.16);
      break;
    default:
      break;
  }

  // draw-call budget: merge static boxes per material (torso breathes, mouth talks → kept separate)
  const keep = new Set<Object3D>([torso, mouth, head]);
  const bodyMerged = mergeStatic(body, keep);
  const headMerged = mergeStatic(head, keep);
  const skinParts = [bodyMerged.get(skin), headMerged.get(skin)].filter((m): m is Mesh => !!m);
  skinMeshes.length = 0;
  skinMeshes.push(...skinParts);

  // posture transforms
  let tagY = 2.62;
  if (opts.posture === "lying") {
    const top = (opts.surfaceY ?? 0.9) + 0.24 * scale;
    body.rotation.x = -Math.PI / 2;
    body.position.set(0, top, PERSON_HEIGHT * scale * 0.5);
    tagY = top + 1.05;
  } else if (opts.posture === "sitting") {
    tagY = (headBaseY + 0.94) * scale;
  } else {
    tagY = (headBaseY + 0.94) * scale;
  }

  return {
    root,
    body,
    head,
    mouth,
    torso,
    tagY,
    headBaseY,
    scale,
    posture: opts.posture,
    skinMeshes,
    skinMaterial: skin,
    flushMaterial: flush,
  };
}

/** Disposes per-rig resources: merged geometries and unshared materials (oxygen mask). */
export function disposeRig(rig: PersonRig): void {
  rig.root.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.userData?.merged) mesh.geometry.dispose();
    const m = mesh.material as Material | undefined;
    if (m && !Array.isArray(m) && (m as MeshStandardMaterial).transparent && m.name === "") m.dispose?.();
  });
  rig.root.removeFromParent();
}

export interface Uniform {
  shirt: string;
  pants: string;
  coat?: boolean;
  stripe?: string;
  hairStyle?: AppearanceLike["hairStyle"];
}

/** Role uniforms (staff NPCs). */
export const ROLE_UNIFORMS: Record<string, Uniform> = {
  nurse: { shirt: "#6fa8c7", pants: "#6fa8c7" },
  attending: { shirt: "#6d9fba", pants: "#354442", coat: true },
  radiologist: { shirt: "#34506b", pants: "#34506b", coat: true },
  pathologist: { shirt: "#a397bc", pants: "#354442", coat: true },
  "lab-tech": { shirt: "#5f9e6e", pants: "#5f9e6e" },
  pharmacist: { shirt: "#5f9e6e", pants: "#354442", coat: true },
  receptionist: { shirt: "#aa6854", pants: "#354442" },
  paramedic: { shirt: "#34506b", pants: "#34506b", stripe: "#e3c04f" },
  porter: { shirt: "#8a8f5a", pants: "#4f5440" },
};
