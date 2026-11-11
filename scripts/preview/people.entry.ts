/**
 * The people of the world as the web world draws them (`packages/web/src/world/npc.ts`, bundled by render.mjs):
 * one cell per person, lit like the world (hemisphere + sun, ACES, no environment map), the camera fitted to
 * the figure (or to its face, its hands, its chest). The people come from a facility's staff, a case's patient
 * and companion, or a built-in sheet (every role and theatre position, the looks an appearance can ask for).
 */
import * as THREE from "three";
import { addHand, HAND_CLASPED, HAND_FLAT, HAND_HOLD, HAND_RELAXED, type HandPose } from "../../packages/web/src/world/figure/hand.js";
import { buildHeld } from "../../packages/web/src/world/figure/held.js";
import { figureMaterial } from "../../packages/web/src/world/figure/material.js";
import { WRIST } from "../../packages/web/src/world/figure/hand-cage.js";
import { rgb, Sculpt, sweepEnd, type Station } from "../../packages/web/src/world/figure/sculpt.js";
import { buildPerson, PATIENT_WEAR, heightOf, looksOf, setBlink, setBreath, setDistressed, setMouth, uniformOf, type AppearanceLike, type PersonOptions, type Posture } from "../../packages/web/src/world/npc.js";

interface Entry {
  label: string;
  appearance?: AppearanceLike;
  options: PersonOptions;
  /** Seat or bed to draw under a sitting or lying figure. */
  surface?: number;
}

const ROLES = ["nurse", "attending", "radiologist", "pathologist", "lab-tech", "pharmacist", "receptionist", "paramedic", "porter"];
const POSITIONS: [string, string][] = [
  ["attending", "surgeon"],
  ["attending", "assistant-surgeon"],
  ["nurse", "scrub-nurse"],
  ["attending", "anaesthetist"],
  ["nurse", "circulating-nurse"],
  ["nurse", "theatre-coordinator"],
  ["nurse", "recovery-nurse"],
  ["radiologist", "radiographer"],
];

function staffEntry(id: string, role: string, position: string | undefined, appearance: AppearanceLike | undefined, label: string): Entry {
  const uni = uniformOf(role, position);
  return { label, appearance: { ...looksOf(id), shirt: uni.shirt, pants: uni.pants, ...(uni.hairStyle ? { hairStyle: uni.hairStyle } : {}), ...(appearance ?? {}) }, options: { posture: "standing", wear: uni.wear, seed: `staff:${id}`, height: heightOf(id) } };
}

function patientEntries(label: string, appearance: AppearanceLike | undefined, postures: Posture[]): Entry[] {
  return postures.map((posture) => ({ label: `${label} · ${posture}`, appearance, options: { posture, surfaceY: posture === "lying" ? 0.62 : posture === "sitting" ? 0.5 : undefined, wear: PATIENT_WEAR, seed: label }, surface: posture === "lying" ? 0.62 : posture === "sitting" ? 0.5 : undefined }));
}

function sheet(name: string): Entry[] {
  if (name === "positions") return POSITIONS.map(([role, position]) => staffEntry(`sheet-${position}`, role, position, undefined, position));
  if (name === "looks") {
    const out: Entry[] = [];
    for (const hairStyle of ["short", "long", "bald", "bun", "ponytail", "curly", "bob", "wavy"] as const) out.push({ label: `hair ${hairStyle}`, appearance: { hairStyle, hair: hairStyle === "curly" ? "#4a3b30" : "#2b2420" }, options: { posture: "standing" } });
    for (const [who, hairStyle] of [["woman", "long"], ["woman", "bob"], ["man", "short"], ["man", "bald"]] as const) out.push({ label: `${who} ${hairStyle}`, appearance: { hairStyle, presentation: who === "woman" ? "feminine" : "masculine" }, options: { posture: "standing" } });
    for (const build of ["slim", "average", "heavy"] as const) out.push({ label: `build ${build}`, appearance: { build }, options: { posture: "standing" } });
    for (const stature of ["infant", "child", "teen", "adult"] as const) out.push({ label: `stature ${stature}`, appearance: { stature, shirt: "#c98f5a" }, options: { posture: "standing" } });
    for (const accessory of ["glasses", "mask", "nasal-cannula", "oxygen-mask", "sling", "cap"] as const) out.push({ label: accessory, appearance: { accessory, gown: accessory === "nasal-cannula" || accessory === "oxygen-mask" }, options: { posture: "standing", wear: PATIENT_WEAR } });
    return out;
  }
  if (name === "patients") {
    return [...patientEntries("gown", { gown: true }, ["standing", "sitting", "lying"]), ...patientEntries("clothes", { shirt: "#b86f5a", pants: "#3d4a5a", hairStyle: "long" }, ["standing", "sitting", "lying"]), ...patientEntries("child", { stature: "child", gown: true, hairStyle: "ponytail" }, ["sitting", "lying"]), ...patientEntries("infant", { stature: "infant", gown: true }, ["lying"])];
  }
  return ROLES.map((role) => staffEntry(`sheet-${role}`, role, undefined, undefined, role));
}

interface Local {
  [locale: string]: string;
}
const text = (t: Local | string | undefined): string => (typeof t === "string" ? t : (t?.en ?? t?.["zh-CN"] ?? ""));

async function entries(params: URLSearchParams): Promise<Entry[]> {
  const facility = params.get("facility"), kase = params.get("case");
  const only = (params.get("only") || "").split(",").filter(Boolean);
  let list: Entry[] = [];
  if (facility) {
    const f = (await (await fetch("/" + facility)).json()) as { staff?: { id: string; role: string; position?: string; name?: Local; appearance?: AppearanceLike }[] };
    list = (f.staff ?? []).filter((s) => !only.length || only.includes(s.id)).map((s) => staffEntry(s.id, s.role, s.position, s.appearance, `${s.id} · ${s.position ?? s.role}`));
  } else if (kase) {
    const c = (await (await fetch("/" + kase)).json()) as { patient?: { name?: Local | string; appearance?: AppearanceLike; posture?: Posture; persona?: { companion?: { name?: Local; appearance?: AppearanceLike } } } };
    const p = c.patient ?? {};
    list = patientEntries(text(p.name) || "patient", p.appearance, [...new Set<Posture>([p.posture ?? "standing", "standing", "sitting", "lying"])]);
    const comp = p.persona?.companion;
    if (comp) list.push({ label: `companion · ${text(comp.name)}`, appearance: comp.appearance, options: { posture: "standing", seed: "companion" } });
  } else list = (params.get("sheet") || "roles").split(",").flatMap(sheet).filter((e) => !only.length || only.some((o) => e.label.includes(o)));
  const posture = params.get("posture") as Posture | null;
  if (posture) for (const e of list) Object.assign(e, { options: { ...e.options, posture, surfaceY: posture === "lying" ? 0.62 : 0.5 }, surface: posture === "standing" ? undefined : posture === "lying" ? 0.62 : 0.5 });
  return list;
}

/** The first-person view of what the player holds, as the world's camera sees it (a hand group at the overlay's place). */
function renderHeld(params: URLSearchParams): { count: number; width: number; height: number; triangles: number[] } {
  const W = Number(params.get("cell")) || 1280, H = Math.round(W / 1.6);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setSize(W, H);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(params.get("bg") || "#cfe0dc");
  scene.add(new THREE.HemisphereLight("#d5f4ff", "#83936c", 2.6));
  const sun = new THREE.DirectionalLight("#fff4d4", 3.4);
  sun.position.set(-2.3, 3.6, 1.9);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(73, W / H, 0.05, 100);
  scene.add(camera);
  const hand = new THREE.Group();
  hand.position.set(0.4, -0.39, -0.58);
  hand.rotation.set(-0.12, -0.17, -0.2);
  camera.add(hand);
  const held = buildHeld();
  hand.add(held);
  let triangles = 0;
  held.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) triangles += (m.geometry.index?.count ?? 0) / 3;
  });
  renderer.render(scene, camera);
  return { count: 1, width: W, height: H, triangles: [triangles] };
}

/** The hand by itself, close: each pose from the back, the palm and the thumb's side (`--view hand`; `--detail 0` for the hand as it is on a figure). */
function renderHand(params: URLSearchParams): { count: number; width: number; height: number; triangles: number[] } {
  const cell = Number(params.get("cell")) || 420;
  const poses: [string, HandPose][] = [["relaxed", HAND_RELAXED], ["flat", HAND_FLAT], ["hold", HAND_HOLD], ["clasped", HAND_CLASPED]];
  const views: [string, THREE.Vector3, THREE.Vector3][] = [["back", new THREE.Vector3(0.15, -0.35, 1), new THREE.Vector3(0, 1, 0)], ["palm", new THREE.Vector3(-0.15, -0.35, -1), new THREE.Vector3(0, 1, 0)], ["thumb side", new THREE.Vector3(1, 0.1, 0.25), new THREE.Vector3(0, 1, 0)]];
  const W = poses.length * cell, H = views.length * cell;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setSize(W, H);
  renderer.setScissorTest(true);
  document.body.appendChild(renderer.domElement);
  const labels = document.getElementById("labels")!;
  const triangles: number[] = [];
  const detail = params.get("detail") !== "0";
  poses.forEach(([name, pose], i) => {
    const sc = new Sculpt();
    const skin = { rgb: rgb(params.get("skin") || "#dcb696"), gloss: 0.16, glow: 0.12 };
    // a forearm's end, as an arm has it (sixteen sides)
    const forearm: Station[] = [{ p: [0, -0.1, 0.002], rx: 0.03, rz: 0.0225 }, { p: [0, -0.05, 0.001], rx: 0.0275, rz: 0.02 }, { p: [0, -0.02, 0], rx: WRIST[0] * 1.01, rz: WRIST[1] * 1.01 }, { p: [0, 0, 0], rx: WRIST[0], rz: WRIST[1] }];
    const seg = 16;
    addHand(sc, skin, pose, { detail, wrist: sweepEnd(forearm, { seg }) });
    sc.sweep(forearm, skin, { seg, start: "round", end: "open" });
    const mesh = new THREE.Mesh(sc.geometry(), figureMaterial());
    triangles.push(sc.triangleCount);
    views.forEach(([view, dir, up], j) => {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#cfe0dc");
      scene.add(new THREE.HemisphereLight("#d5f4ff", "#83936c", 2.6));
      const sun = new THREE.DirectionalLight("#fff4d4", 3.4);
      sun.position.set(-2.3, 3.6, 2.6);
      scene.add(sun);
      scene.add(mesh);
      const centre = new THREE.Vector3(0.005, 0.07, -0.01);
      const cam = new THREE.PerspectiveCamera(24, 1, 0.01, 10);
      cam.up.copy(up);
      cam.position.copy(centre).addScaledVector(dir.clone().normalize(), 0.62);
      cam.lookAt(centre);
      const x = i * cell, y = j * cell;
      renderer.setViewport(x, H - y - cell, cell, cell);
      renderer.setScissor(x, H - y - cell, cell, cell);
      renderer.render(scene, cam);
      scene.remove(mesh);
      const d = document.createElement("div");
      d.textContent = `${name} · ${view} · ${sc.triangleCount} tris`;
      d.style.left = `${x + 4}px`;
      d.style.top = `${y + 4}px`;
      labels.appendChild(d);
    });
  });
  return { count: poses.length, width: W, height: H, triangles };
}

/** Draw the sheet; resolves to what render.mjs reports. */
export async function render(): Promise<{ count: number; width: number; height: number; triangles: number[] }> {
  const params = new URLSearchParams(location.search);
  const view = params.get("view") || "front";
  if (view === "held") return renderHeld(params);
  if (view === "hand") return renderHand(params);
  const cell = Math.max(160, Number(params.get("cell")) || 420);
  const list = await entries(params);
  const cols = Math.max(1, Math.min(Number(params.get("cols")) || 6, list.length || 1));
  const rows = Math.max(1, Math.ceil(list.length / cols));
  const tall = view === "face" || view === "hands" || view === "chest" ? 1 : 1.6;
  const W = cols * cell, H = Math.round(rows * cell * tall);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(W, H);
  renderer.setScissorTest(true);
  document.body.appendChild(renderer.domElement);
  const labels = document.getElementById("labels")!;
  const floorMat = new THREE.MeshStandardMaterial({ color: "#c9d6d2", roughness: 0.95 });
  const propMat = new THREE.MeshStandardMaterial({ color: "#e9ebe6", roughness: 0.9 });
  const triangles: number[] = [];
  list.forEach((e, i) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(params.get("bg") || "#a8d5e0");
    scene.add(new THREE.HemisphereLight("#d5f4ff", "#83936c", 2.6));
    const sun = new THREE.DirectionalLight("#fff4d4", 3.4);
    sun.position.set(-2.3, 3.6, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2.4, bottom: -1, near: 0.5, far: 12 });
    sun.shadow.normalBias = 0.012;
    sun.shadow.bias = -3e-4;
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 3.2), floorMat);
    floor.position.y = -0.02;
    floor.receiveShadow = true;
    scene.add(floor);
    const rig = buildPerson(e.appearance, e.options);
    triangles.push(rig.triangles);
    if (params.get("distress") === "1") setDistressed(rig, true);
    setMouth(rig, Number(params.get("speak")) || 0);
    setBlink(rig, Number(params.get("blink")) || 0);
    setBreath(rig, Number(params.get("breath")) || 0);
    rig.head.rotation.y = Number(params.get("turn")) || 0;
    scene.add(rig.root);
    const posture = e.options.posture;
    if (e.surface !== undefined) {
      const prop = posture === "lying" ? new THREE.Mesh(new THREE.BoxGeometry(0.95, e.surface, 2.1), propMat) : new THREE.Mesh(new THREE.BoxGeometry(0.5, e.surface, 0.46), propMat);
      prop.position.set(0, e.surface / 2, posture === "lying" ? 0 : -0.02);
      prop.castShadow = prop.receiveShadow = true;
      scene.add(prop);
    }
    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig.body);
    const headAt = rig.head.getWorldPosition(new THREE.Vector3());
    let centre = box.getCenter(new THREE.Vector3());
    let radius = Math.max(box.max.y - box.min.y, box.max.z - box.min.z) * 0.56;
    let dir = new THREE.Vector3(0, 0.06, 1);
    if (view === "iso") dir = new THREE.Vector3(0.62, 0.22, 1);
    else if (view === "side") dir = new THREE.Vector3(1, 0.06, 0.02);
    else if (view === "back") dir = new THREE.Vector3(-0.35, 0.12, -1);
    else if (view === "top") dir = new THREE.Vector3(0.001, 1, 0.25);
    if (view === "face" || view === "face-iso" || view === "face-side") {
      const up = new THREE.Vector3(0, 0.07 * rig.scale, 0).applyQuaternion(rig.body.quaternion);
      centre = headAt.clone().add(up);
      radius = 0.2 * rig.scale * (rig.head.scale.x || 1);
      const local = view === "face-iso" ? new THREE.Vector3(0.7, 0.1, 1) : view === "face-side" ? new THREE.Vector3(1, 0.04, 0.05) : new THREE.Vector3(0, 0.02, 1);
      dir = local.applyQuaternion(rig.body.quaternion);
      if (posture === "lying") dir.add(new THREE.Vector3(0.25, 0.4, 0.35));
    } else if (view === "chest") {
      centre = headAt.clone().add(new THREE.Vector3(0, -0.28 * rig.scale, 0));
      radius = 0.36 * rig.scale;
      dir = new THREE.Vector3(0.25, 0.08, 1);
    } else if (view === "hands") {
      centre = new THREE.Vector3(0.24 * rig.scale, 0.76 * rig.scale, 0.05);
      radius = 0.2 * rig.scale;
      dir = new THREE.Vector3(1, 0.1, 0.6);
    } else if (posture === "lying" && view === "front") dir = new THREE.Vector3(0.9, 0.75, 0.55);
    const cam = new THREE.PerspectiveCamera(26, 1 / tall, radius * 0.05, radius * 60);
    cam.position.copy(centre).addScaledVector(dir.normalize(), (radius / Math.sin((13 * Math.PI) / 180)) * 1.04);
    cam.lookAt(centre);
    sun.target.position.copy(centre);
    scene.add(sun.target);
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell * tall;
    renderer.setViewport(x, H - y - cell * tall, cell, cell * tall);
    renderer.setScissor(x, H - y - cell * tall, cell, cell * tall);
    renderer.render(scene, cam);
    const d = document.createElement("div");
    d.textContent = `${e.label} · ${rig.triangles} tris`;
    d.style.left = `${x + 4}px`;
    d.style.top = `${y + 4}px`;
    labels.appendChild(d);
  });
  return { count: list.length, width: W, height: H, triangles };
}
