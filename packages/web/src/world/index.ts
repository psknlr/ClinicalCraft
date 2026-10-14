/**
 * ClinicalCraft voxel world (three.js) — implements `CreateWorld` from
 * src/contracts.ts. A data-driven generalisation of the Virtual Patient V4
 * world builder `Ld()`: the scene is built from a FacilityDefinition and the
 * equipment catalogs; player physics, doors, aiming, build zone, hand and
 * look are V4's.
 */
import {
  ACESFilmicToneMapping,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Intersection,
  type Material,
  type Object3D,
} from "three";
import type { BlockInfo, CreateWorld, InteractionTarget, WorldApi, WorldOptions, WorldPatient, WorldSave, WorldSettings } from "../contracts.js";
import { monitorRenderer } from "../shared/monitor-render.js";
import { buildRules, canPlace, cellKey, validBlocks, type BuildRules, type Cell } from "./buildzone.js";
import type { BuildContext, DoorRecord, NpcRecord } from "./context.js";
import { buildPlacements, surfaceTop } from "./equipment.js";
import { drawMap as paintMap, type MapData, type MapWall } from "./map.js";
import { MaterialLibrary, mergeCatalogs } from "./materials.js";
import { buildPerson, disposeRig, ROLE_UNIFORMS, type AppearanceLike, type Posture } from "./npc.js";
import { buildNavGrid, findPath, type NavGrid } from "./pathfind.js";
import { boxCollider, clampPitch, ColliderGrid, PHYSICS, stepPlayer, targetFov, type Aabb, type PlayerState } from "./physics.js";
import { regionAt } from "./region.js";
import { SignFactory } from "./signs.js";
import { animateDoors, buildStructures, setDoorOpen, type WallRecord } from "./structures.js";
import { roleName, strings, tx } from "./strings.js";
import { buildTerrain } from "./terrain.js";
import { createLcg } from "./textures.js";
import { BoxBatch, UNIT_BOX } from "./voxels.js";

export { monitorRenderer } from "../shared/monitor-render.js";

const AIM_FAR = 5.5;
const TARGET_RANGE = 3.5;
const BUILD_RANGE = 5.3;

/** Render quality: pixel-ratio cap, shadow map size (0 = off) and real PointLight budget (rest stay emissive-only). */
const QUALITY = {
  high: { ratio: 1.6, shadow: 2048, lights: 12 },
  medium: { ratio: 1.25, shadow: 1024, lights: 8 },
  low: { ratio: 1, shadow: 0, lights: 4 },
} as const;

function safeSettings(get: () => WorldSettings): WorldSettings {
  try {
    const s = get();
    if (s) return s;
  } catch {
    /* fall through */
  }
  return { sound: true, bob: true, pointer: true, sensitivity: 1, quality: "high", locale: "zh-CN" };
}

interface PlacedBlock {
  mesh: Mesh;
  collider: Aabb;
  type: string;
  cell: Cell;
}

interface Particle {
  m: Mesh;
  v: Vector3;
  t: number;
}

interface AutoWalk {
  path: { x: number; z: number }[];
  index: number;
  goal: { x: number; z: number };
  /** Arrival radius: 1 m, or the reachable distance to a goal inside furniture (+ .35). */
  arrive: number;
  replans: number;
  resolve: () => void;
  reject: (e: Error) => void;
  lastProgress: number;
  bestDist: number;
  signal?: AbortSignal;
  onAbort?: () => void;
}

export const createWorld: CreateWorld = (opts: WorldOptions): WorldApi => {
  const { canvas, facility, callbacks } = opts;
  const settings = () => safeSettings(opts.settings);
  const initial = settings();
  const locale = initial.locale || "zh-CN";
  const S = strings(locale);
  let quality: WorldSettings["quality"] = initial.quality ?? "high";
  const q0 = QUALITY[quality] ?? QUALITY.high;

  /* ---------------- renderer / scene (V4 Ld) ---------------- */
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
  const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
  renderer.setPixelRatio(Math.min(dpr, q0.ratio));
  const viewSize = () => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    return [Math.max(1, w), Math.max(1, h)] as const;
  };
  {
    const [w, h] = viewSize();
    renderer.setSize(w, h, false);
  }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = q0.shadow > 0;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const env = facility.environment ?? ({} as NonNullable<typeof facility.environment>);
  const scene = new Scene();
  scene.background = new Color(env.sky ?? "#a8d5e0");
  const fogDef = env.fog ?? { color: "#b9d8d6", near: 38, far: 82 };
  scene.fog = new Fog(fogDef.color, fogDef.near, fogDef.far);
  const [vw, vh] = viewSize();
  const camera = new PerspectiveCamera(PHYSICS.fov, vw / vh, 0.05, Math.max(110, fogDef.far + 28));
  camera.rotation.order = "YXZ";
  scene.add(camera);
  const hemi = env.hemisphere ?? { sky: "#d5f4ff", ground: "#83936c", intensity: 2.6 };
  scene.add(new HemisphereLight(hemi.sky, hemi.ground, hemi.intensity));

  const b = facility.bounds;
  const cX = (b.minX + b.maxX) / 2;
  const cZ = (b.minZ + b.maxZ) / 2;
  const half = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) / 2;
  const sunScale = Math.max(1, half / 35.5);
  const sun = new DirectionalLight("#fff4d4", env.sunIntensity ?? 3.4);
  sun.position.set(cX - 23 * sunScale, 36 * sunScale, cZ + 19 * sunScale);
  sun.target.position.set(cX, 0, cZ);
  sun.castShadow = q0.shadow > 0;
  sun.shadow.mapSize.set(q0.shadow || 1024, q0.shadow || 1024);
  Object.assign(sun.shadow.camera, { left: -(half + 1.5), right: half + 1.5, top: half + 1.5, bottom: -(half + 1.5), near: 1, far: 90 * sunScale });
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -3e-4;
  scene.add(sun);
  scene.add(sun.target);

  const root = new Group();
  root.name = "facility";
  scene.add(root);

  /* ---------------- build ---------------- */
  const merged = mergeCatalogs(opts.catalogs ?? [], facility.materials ?? []);
  const lib = new MaterialLibrary(merged);
  const signs = new SignFactory();
  const ctx: BuildContext = {
    facility,
    catalogs: merged,
    locale,
    scene,
    root,
    lib,
    signs,
    batch: new BoxBatch(),
    colliders: new ColliderGrid(2),
    pickables: [],
    targets: new Map(),
    doors: [],
    lights: [],
    realLights: [],
    screens: [],
    animated: [],
    placements: new Map(),
    npcs: new Map(),
    rng: createLcg(7103),
    // meshes always carry castShadow flags; the renderer's shadow map (quality) decides whether they are used
    shadows: true,
    warnings: [],
  };

  // ground uses its own batch (not ray-picked: an analytic plane is used instead)
  const groundBatch = new BoxBatch();
  const sceneryBatch = ctx.batch;
  ctx.batch = groundBatch;
  const { clouds } = buildTerrain(ctx);
  // trees/pond/horizon/flowers also went to groundBatch: they are scenery and not targets, which is fine.
  ctx.batch = sceneryBatch;
  const walls: WallRecord[] = buildStructures(ctx);
  buildPlacements(ctx);
  const groundMeshes = groundBatch.build(root, lib, ctx.shadows);
  const staticMeshes = sceneryBatch.build(root, lib, ctx.shadows);
  for (const m of staticMeshes) ctx.pickables.push(m);

  // point lights: the N nearest to spawn are real lights, the rest stay emissive-only
  const spawn = facility.spawn ?? { x: 0, z: 0, yaw: 0 };
  const sortedLights = [...ctx.lights].sort((p, q) => Math.hypot(p.x - spawn.x, p.z - spawn.z) - Math.hypot(q.x - spawn.x, q.z - spawn.z));
  for (const l of sortedLights.slice(0, q0.lights)) {
    const pl = new PointLight(l.color, l.intensity, l.distance, l.decay);
    pl.position.set(l.x, l.y, l.z);
    root.add(pl);
    ctx.realLights.push(pl);
  }

  /* ---------------- NPCs ---------------- */
  const patients = new Map<string, WorldPatient>();
  const tagSigns: Object3D[] = [];

  /** Name tags / labels never take the aim ray. */
  function noRaycast(o: Object3D): void {
    o.traverse((c) => (c.raycast = () => {}));
  }

  function npcCollider(posture: Posture, onBed: boolean, x: number, z: number): Aabb | null {
    if (onBed) return null;
    if (posture === "standing") return boxCollider(x, 0.94, z, 0.85, 1.88, 0.6);
    if (posture === "sitting") return boxCollider(x, 0.6, z, 0.8, 1.2, 0.8);
    return boxCollider(x, 0.25, z, 0.8, 0.5, 2.1);
  }

  function placePatient(p: WorldPatient): void {
    const slot = facility.patientSlots.find((s) => s.id === p.slotId);
    if (!slot) {
      ctx.warnings.push(`unknown patient slot "${p.slotId}"`);
      return;
    }
    const old = ctx.npcs.get(`patient:${p.slotId}`);
    if (old) removeNpc(old);
    const posture: Posture = p.posture ?? slot.posture ?? "standing";
    const bed = slot.bed ? ctx.placements.get(slot.bed) : undefined;
    let x = slot.x, z = slot.z, rot = slot.rot ?? 0;
    let surface: number | undefined;
    if (posture === "lying") {
      if (bed) {
        x = bed.x;
        z = bed.z;
        rot = bed.rot;
        surface = bed.y + surfaceTop(bed.type);
      } else surface = 0.05;
    } else if (posture === "sitting") {
      surface = bed ? bed.y + surfaceTop(bed.type) : 0.5;
    }
    const rig = buildPerson(lib, p.appearance as AppearanceLike, { posture, surfaceY: surface, badge: true });
    rig.root.position.set(x, 0, z);
    rig.root.rotation.y = MathUtils.degToRad(rot);
    root.add(rig.root);
    rig.root.updateMatrixWorld(true);
    const tag = signs.make(p.tag || p.name, 2.2);
    tag.position.set(0, rig.tagY, 0);
    noRaycast(tag);
    rig.root.add(tag);
    tagSigns.push(tag);
    const target: InteractionTarget = { kind: "patient", slotId: p.slotId, caseId: p.caseId, name: p.name, hint: S.talk };
    rig.root.userData.action = target;
    rig.root.userData.highlight = rig.body;
    ctx.pickables.push(rig.root);
    const collider = npcCollider(posture, posture !== "standing" && !!bed, x, z);
    if (collider) ctx.colliders.add(collider);
    ctx.npcs.set(`patient:${p.slotId}`, {
      kind: "patient",
      id: p.slotId,
      rig,
      x,
      z,
      rot: MathUtils.degToRad(rot),
      speaking: false,
      distressed: false,
      collider,
      target,
      label: p.name,
    });
    patients.set(p.slotId, p);
  }

  function removeNpc(n: NpcRecord): void {
    const i = ctx.pickables.indexOf(n.rig.root);
    if (i >= 0) ctx.pickables.splice(i, 1);
    if (n.collider) ctx.colliders.remove(n.collider);
    n.rig.root.traverse((o) => {
      const k = tagSigns.indexOf(o);
      if (k >= 0) tagSigns.splice(k, 1);
    });
    disposeRig(n.rig);
    ctx.npcs.delete(`${n.kind}:${n.id}`);
  }

  for (const p of opts.patients ?? []) placePatient(p);

  for (const st of facility.staff ?? []) {
    const uni = ROLE_UNIFORMS[st.role] ?? { shirt: "#f1ead5", pants: "#354442" };
    const ap: AppearanceLike = { shirt: uni.shirt, pants: uni.pants, hairStyle: uni.hairStyle, ...(st.appearance ?? {}) };
    const rig = buildPerson(lib, ap, { posture: "standing", coat: !!uni.coat, stripe: uni.stripe, badge: true });
    rig.root.position.set(st.x, 0, st.z);
    rig.root.rotation.y = MathUtils.degToRad(st.rot ?? 0);
    root.add(rig.root);
    const name = tx(st.name, locale);
    const role = roleName(st.role, locale);
    const tag = signs.make(`${role} · ${name}`, 2.2, "#417868");
    tag.position.set(0, rig.tagY, 0);
    noRaycast(tag);
    rig.root.add(tag);
    tagSigns.push(tag);
    const greeting = st.greeting ? tx(st.greeting, locale) : "";
    const target: InteractionTarget = { kind: "staff", staffId: st.id, role: st.role, name, hint: greeting ? `${S.talk} · ${greeting}` : S.talk };
    rig.root.userData.action = target;
    rig.root.userData.highlight = rig.body;
    ctx.pickables.push(rig.root);
    const collider = ctx.colliders.add(boxCollider(st.x, 0.94, st.z, 0.85, 1.88, 0.6));
    ctx.npcs.set(`staff:${st.id}`, { kind: "staff", id: st.id, rig, x: st.x, z: st.z, rot: MathUtils.degToRad(st.rot ?? 0), speaking: false, distressed: false, collider, target, label: `${role} · ${name}` });
  }

  /* ---------------- build zone (V4) ---------------- */
  const rules: BuildRules | null = facility.buildZone ? buildRules(facility.buildZone) : null;
  const placed = new Map<string, PlacedBlock>();
  const particles: Particle[] = [];
  const prng = createLcg(7103 ^ 0x1234567);

  function addBlock(cell: Cell, type: string, notify = true): boolean {
    const k = cellKey(cell);
    if (placed.has(k)) return false;
    const mesh = new Mesh(UNIT_BOX, lib.get(type));
    mesh.position.set(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.block = { cell: [...cell], type };
    root.add(mesh);
    mesh.updateMatrixWorld(true); // ray-pickable before the next render
    ctx.pickables.push(mesh);
    const collider = ctx.colliders.add(boxCollider(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5, 1, 1, 1));
    placed.set(k, { mesh, collider, type, cell: [...cell] as Cell });
    if (notify) callbacks.onBlock("place", type);
    return true;
  }

  function removeBlock(k: string): PlacedBlock | null {
    const pb = placed.get(k);
    if (!pb) return null;
    pb.mesh.removeFromParent();
    const i = ctx.pickables.indexOf(pb.mesh);
    if (i >= 0) ctx.pickables.splice(i, 1);
    ctx.colliders.remove(pb.collider);
    placed.delete(k);
    return pb;
  }

  if (rules) {
    const saved = opts.saved;
    const savedValid = saved && saved.facilityId === facility.id && Array.isArray(saved.blocks);
    const list = savedValid ? validBlocks(rules, saved!.blocks) : validBlocks(rules, facility.buildZone?.seedBlocks ?? []);
    for (const bl of list) addBlock(bl.cell, bl.type, false);
  }

  function burst(pos: Vector3, type: string): void {
    for (let i = 0; i < 8; i++) {
      const m = new Mesh(UNIT_BOX, lib.get(type));
      m.scale.setScalar(0.08 + prng() * 0.09);
      m.position.copy(pos);
      scene.add(m);
      particles.push({ m, v: new Vector3((prng() - 0.5) * 3, prng() * 3 + 0.5, (prng() - 0.5) * 3), t: 0.6 });
    }
  }

  /* ---------------- hand, highlight, beacon ---------------- */
  const hand = new Group();
  camera.add(hand);
  hand.position.set(0.4, -0.39, -0.58);
  hand.rotation.set(-0.12, -0.17, -0.2);
  const handMesh = (mat: Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const m = new Mesh(UNIT_BOX, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    hand.add(m);
    return m;
  };
  handMesh(lib.get("skin"), 0, 0, 0, 0.16, 0.27, 0.18);
  handMesh(lib.get("white"), 0, -0.22, 0, 0.19, 0.2, 0.21);
  const held = new Mesh(UNIT_BOX, lib.get("wood"));
  held.scale.setScalar(0.22);
  held.position.set(-0.02, 0.2, -0.01);
  held.visible = false;
  hand.add(held);

  const highlight = new LineSegments(new EdgesGeometry(new BoxGeometry(1.01, 1.01, 1.01)), new LineBasicMaterial({ color: "#faf6cf", transparent: true, opacity: 0.85 }));
  highlight.visible = false;
  scene.add(highlight);

  const beacon = new Group();
  beacon.visible = false;
  const beaconMat = new MeshBasicMaterial({ color: "#ffd25e", transparent: true, opacity: 0.34, depthWrite: false, fog: false });
  const pillar = new Mesh(UNIT_BOX, beaconMat);
  pillar.scale.set(0.55, 40, 0.55);
  pillar.position.y = 20;
  beacon.add(pillar);
  const marker = new Mesh(UNIT_BOX, new MeshStandardMaterial({ color: "#e7c36b", emissive: new Color("#e7c36b"), emissiveIntensity: 0.6, roughness: 0.5 }));
  marker.scale.setScalar(0.42);
  marker.rotation.set(Math.PI / 4, 0, Math.PI / 4);
  beacon.add(marker);
  let beaconLabel: Object3D | null = null;
  scene.add(beacon);

  /* ---------------- player state ---------------- */
  const player: PlayerState = { x: spawn.x, y: 0, z: spawn.z, vy: 0, grounded: true };
  let yaw = spawn.yaw ?? 0;
  let pitch = 0;
  const walkBounds = { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ };
  const saved = opts.saved;
  if (saved && saved.facilityId === facility.id && Array.isArray(saved.position) && saved.position.every(Number.isFinite)) {
    const [x, y, z] = saved.position;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && y >= 0 && y < 8) Object.assign(player, { x, y, z });
    if (Number.isFinite(saved.yaw)) yaw = saved.yaw;
    if (Number.isFinite(saved.pitch)) pitch = clampPitch(saved.pitch ?? 0);
  }

  let started = false;
  let paused = true;
  let frozen = false;
  let keys: Record<string, boolean> = {};
  let dragFrom: [number, number] | null = null;
  let touchFrom: [number, number] | null = null;
  let slot = 0;
  let aimTarget: InteractionTarget | null = null;
  let aimHit: Intersection | null = null;
  let aimBlock: BlockInfo | null = null;
  let lastTargetKey = "";
  let lastFrame = performance.now();
  let aimTimer = 0;
  let walkPhase = 0;
  let swing = 0;
  let pointerLocked = false;
  let lastStep = 0;
  let disposed = false;
  let raf = 0;
  let autoWalk: AutoWalk | null = null;
  let navGrid: NavGrid | null = null;
  let waypoint: { x: number; z: number; label: string } | null = null;
  let qualityCheck = 0;

  camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
  camera.rotation.set(pitch, yaw, 0);

  /* ---------------- helpers ---------------- */
  const blockMaterials = rules?.materials ?? ["wood", "stone", "glass", "lamp"];

  function region() {
    return regionAt(facility, player.x, player.z, locale);
  }

  function nearbyColliders(): Aabb[] {
    return ctx.colliders.query(player.x, player.z, 1.6);
  }

  function toast(pair: readonly [string, string] | readonly string[]) {
    callbacks.onToast(pair[0], pair[1]);
  }

  function toggleDoor(door: DoorRecord, force?: boolean): void {
    const open = force ?? !door.open;
    if (open === door.open) return;
    setDoorOpen(door, open, locale);
    callbacks.onSound("door");
  }

  function playerInDoorway(door: DoorRecord): boolean {
    const a = door.area;
    return player.x + PHYSICS.radius > a.minX && player.x - PHYSICS.radius < a.maxX && player.z + PHYSICS.radius > a.minZ && player.z - PHYSICS.radius < a.maxZ;
  }

  function interact(): void {
    if (!started || paused) return;
    const t = aimTarget;
    if (t) {
      if (t.kind === "door") {
        const door = ctx.doors.find((d) => d.id === t.id);
        if (!door) return;
        if (door.open && playerInDoorway(door)) {
          toast(S.leaveDoor);
          return;
        }
        toggleDoor(door); // both leaves of a double door share one record (V4 toggles them together)
        return;
      }
      callbacks.onInteract(t);
      return;
    }
    if (slot === 0) toast(S.approach);
    else if (slot === 1) callbacks.onShortcut("journal");
    else if (slot === 2) callbacks.onShortcut("map");
  }

  function build(place: boolean): void {
    if (!started || paused) return;
    if (!rules) return;
    const type = blockMaterials[slot - 3];
    if (slot < 3) {
      toast(S.selectBlock);
      return;
    }
    const hit = aimHit;
    if (!hit || hit.distance > BUILD_RANGE) return;
    if (!place) {
      const blk = hit.object.userData.block as { cell: Cell; type: string } | undefined;
      if (!blk) {
        toast(S.protected);
        return;
      }
      const pb = removeBlock(cellKey(blk.cell));
      if (!pb) return;
      burst(pb.mesh.position, pb.type);
      callbacks.onBlock("mine", pb.type);
      swing = 1;
      callbacks.onSound("mine");
      aimHit = null;
      return;
    }
    if (!type) return;
    const normal = worldNormal(hit);
    const p = hit.point.clone().addScaledVector(normal, 0.025);
    const cell: Cell = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)];
    if (!canPlace(rules, cell, player, placed.has(cellKey(cell)))) {
      toast(S.cannotPlace);
      return;
    }
    if (callbacks.onBlock("check", type) === false) {
      toast(S.noMaterial);
      return;
    }
    if (placed.size >= rules.maxBlocks) {
      toast(S.full);
      return;
    }
    addBlock(cell, type);
    swing = 1;
    callbacks.onSound("place");
  }

  const nm = new Matrix3();
  const im = new Matrix4();
  function worldNormal(hit: Intersection): Vector3 {
    const n = hit.face?.normal?.clone() ?? new Vector3(0, 1, 0);
    const obj = hit.object as Mesh;
    if ((obj as InstancedMesh).isInstancedMesh && hit.instanceId != null) {
      (obj as InstancedMesh).getMatrixAt(hit.instanceId, im);
      im.premultiply(obj.matrixWorld);
      n.applyMatrix3(nm.getNormalMatrix(im)).normalize();
    } else if (obj.matrixWorld) {
      n.applyMatrix3(nm.getNormalMatrix(obj.matrixWorld)).normalize();
    }
    return n;
  }

  function look(dx: number, dy: number): void {
    const sens = settings().sensitivity || 1;
    yaw -= dx * PHYSICS.mouse * sens;
    pitch = clampPitch(pitch - dy * PHYSICS.mouse * sens);
  }

  function select(n: number): void {
    slot = n;
    const mat = blockMaterials[n - 3];
    held.visible = n >= 3 && !!mat;
    held.material = mat ? lib.get(mat) : lib.get("wood");
  }

  /* ---------------- aiming (V4 Ne) ---------------- */
  const raycaster = new Raycaster();
  const centre = new Vector2(0, 0);
  const groundProxy = new Group();
  groundProxy.name = "ground";

  function resolveAction(hit: Intersection): { target: InteractionTarget; box: Box3 } | null {
    let o: Object3D | null = hit.object;
    const inst = hit.object as InstancedMesh;
    if (inst.isInstancedMesh && hit.instanceId != null && inst.userData.owners) {
      const owner = (inst.userData.owners as (string | undefined)[])[hit.instanceId];
      const rec = owner ? ctx.targets.get(owner) : undefined;
      return rec ? { target: rec.target, box: rec.box } : null;
    }
    if (hit.object.userData.owner) {
      const rec = ctx.targets.get(hit.object.userData.owner as string);
      return rec ? { target: rec.target, box: rec.box } : null;
    }
    while (o && !o.userData.action) o = o.parent;
    if (!o) return null;
    const box = new Box3().setFromObject((o.userData.highlight as Object3D | undefined) ?? o);
    if (o.userData.action.kind === "door") {
      // highlight the whole doorway (both leaves)
      const door = ctx.doors.find((d) => d.id === o!.userData.action.id);
      if (door) for (const obj of door.objects) box.union(new Box3().setFromObject(obj));
    }
    return { target: o.userData.action as InteractionTarget, box };
  }

  function updateAim(): void {
    camera.updateMatrixWorld();
    raycaster.setFromCamera(centre, camera);
    raycaster.far = AIM_FAR;
    const hits = raycaster.intersectObjects(ctx.pickables, true);
    let hit: Intersection | null = hits.find((h) => h.object.visible !== false) ?? null;
    // analytic ground plane (y = 0) — the ground grid is not ray-tested
    const ray = raycaster.ray;
    if (ray.direction.y < -1e-4) {
      const tGround = (0 - ray.origin.y) / ray.direction.y;
      if (tGround > 0 && tGround <= AIM_FAR && (!hit || tGround < hit.distance)) {
        const point = ray.origin.clone().addScaledVector(ray.direction, tGround);
        hit = { distance: tGround, point, object: groundProxy, face: { a: 0, b: 0, c: 0, normal: new Vector3(0, 1, 0), materialIndex: 0 } } as Intersection;
      }
    }
    aimHit = hit;
    aimTarget = null;
    aimBlock = null;
    highlight.visible = false;
    if (hit) {
      const act = hit.object === groundProxy ? null : resolveAction(hit);
      if (act && hit.distance < TARGET_RANGE) {
        aimTarget = act.target;
        highlight.visible = true;
        const size = new Vector3();
        act.box.getCenter(highlight.position);
        act.box.getSize(size);
        highlight.scale.copy(size).multiplyScalar(1.025);
      } else if (hit.object.userData.block && hit.distance < BUILD_RANGE && slot >= 3) {
        const blk = hit.object.userData.block as { cell: Cell; type: string };
        aimBlock = { cell: [...blk.cell] as [number, number, number], type: blk.type };
        highlight.visible = true;
        highlight.position.copy(hit.object.position);
        highlight.scale.setScalar(1);
      } else if (hit.object.userData.block) {
        const blk = hit.object.userData.block as { cell: Cell; type: string };
        aimBlock = { cell: [...blk.cell] as [number, number, number], type: blk.type };
      }
    }
    const key = aimTarget ? `${aimTarget.kind}:${"placementId" in aimTarget ? aimTarget.placementId : "slotId" in aimTarget ? aimTarget.slotId : "staffId" in aimTarget ? aimTarget.staffId : aimTarget.id}:${aimTarget.hint}` : aimBlock ? `b:${aimBlock.cell.join(",")}` : "";
    if (key !== lastTargetKey) {
      lastTargetKey = key;
      callbacks.onTarget(aimTarget, aimBlock);
    }
  }

  /* ---------------- input (V4) ---------------- */
  const listeners: [EventTarget, string, EventListener, AddEventListenerOptions | boolean | undefined][] = [];
  const on = <K extends string>(target: EventTarget, type: K, fn: (e: never) => void, o?: AddEventListenerOptions | boolean) => {
    target.addEventListener(type, fn as EventListener, o);
    listeners.push([target, type, fn as EventListener, o]);
  };
  const playing = () => started && !paused;
  const typing = () => {
    const el = document.activeElement as HTMLElement | null;
    return !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);
  };

  on(canvas, "mousedown", (e: MouseEvent) => {
    if (!playing()) return;
    if (e.button === 2) {
      build(true);
      return;
    }
    if (document.pointerLockElement === canvas) {
      if (e.button === 0) {
        if (slot >= 3) build(false);
        else interact();
      }
    } else if (e.button === 0) {
      dragFrom = [e.clientX, e.clientY];
      if (settings().pointer !== false) {
        try {
          const r = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
          r?.catch?.(() => toast(S.dragLook));
        } catch {
          /* ignore */
        }
      }
    }
  });
  on(canvas, "contextmenu", (e: Event) => e.preventDefault());
  on(window, "mouseup", () => (dragFrom = null));
  on(window, "mousemove", (e: MouseEvent) => {
    if (!playing()) return;
    if (document.pointerLockElement === canvas) look(e.movementX, e.movementY);
    else if (dragFrom && e.buttons === 1) {
      look(e.clientX - dragFrom[0], e.clientY - dragFrom[1]);
      dragFrom = [e.clientX, e.clientY];
    }
  });
  on(document, "pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
    if (!pointerLocked) {
      keys = {};
      if (playing()) callbacks.onPauseRequest();
    }
  });
  on(window, "keydown", (e: KeyboardEvent) => {
    if (!playing() || typing()) return;
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
    if (autoWalk && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) cancelWalk(new Error("interrupted by player"));
    if (e.repeat) return;
    switch (e.code) {
      case "KeyE":
        interact();
        break;
      case "KeyB":
      case "Tab":
        callbacks.onShortcut("inventory");
        break;
      case "KeyM":
        callbacks.onShortcut("map");
        break;
      case "KeyJ":
        callbacks.onShortcut("journal");
        break;
      case "KeyT":
      case "Enter":
        callbacks.onShortcut("chat");
        break;
      case "KeyQ":
        build(false);
        break;
      case "KeyF":
        build(true);
        break;
      case "Escape":
        if (!pointerLocked) callbacks.onShortcut("pause");
        break;
      default:
        if (e.code.startsWith("Digit")) {
          const n = Number(e.code.slice(5)) - 1;
          if (n >= 0 && n < 9) {
            select(n);
            callbacks.onShortcut("hotbar", n);
          }
        }
    }
  });
  on(window, "keyup", (e: KeyboardEvent) => {
    keys[e.code] = false;
  });
  on(window, "blur", () => {
    keys = {};
    if (playing()) callbacks.onPauseRequest();
  });
  on(document, "visibilitychange", () => {
    keys = {};
    if (document.hidden && playing()) callbacks.onPauseRequest();
  });
  on(
    canvas,
    "touchstart",
    (e: TouchEvent) => {
      if (e.touches.length === 1) touchFrom = [e.touches[0].clientX, e.touches[0].clientY];
    },
    { passive: true },
  );
  on(
    canvas,
    "touchmove",
    (e: TouchEvent) => {
      if (touchFrom && e.touches.length === 1 && playing()) {
        const t = e.touches[0];
        look(t.clientX - touchFrom[0], t.clientY - touchFrom[1]);
        touchFrom = [t.clientX, t.clientY];
        e.preventDefault();
      }
    },
    { passive: false },
  );
  on(canvas, "touchend", () => (touchFrom = null));

  const resize = () => {
    const [w, h] = viewSize();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  on(window, "resize", resize);
  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(resize);
    ro.observe(canvas);
  }

  /* ---------------- auto-walk (walk_to) ---------------- */
  function cancelWalk(err: Error | null): void {
    const w = autoWalk;
    if (!w) return;
    autoWalk = null;
    keys = {};
    if (w.signal && w.onAbort) w.signal.removeEventListener("abort", w.onAbort);
    if (err) w.reject(err);
    else w.resolve();
  }

  function autoWalkInput(now: number): { forward: number; side: number; sprint: boolean } | null {
    const w = autoWalk;
    if (!w) return null;
    const dGoal = Math.hypot(w.goal.x - player.x, w.goal.z - player.z);
    if (dGoal <= w.arrive) {
      cancelWalk(null);
      return null;
    }
    if (w.index >= w.path.length) {
      if (!replan(w)) {
        cancelWalk(new Error(S.unreachable));
        return null;
      }
    }
    let wp = w.path[w.index];
    while (Math.hypot(wp.x - player.x, wp.z - player.z) < 0.35 && w.index < w.path.length - 1) wp = w.path[++w.index];
    if (w.index === w.path.length - 1 && Math.hypot(wp.x - player.x, wp.z - player.z) < 0.35) {
      w.index++;
      return null;
    }
    // open closed doors ahead
    for (const d of ctx.doors) {
      if (d.open) continue;
      const near = Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 2.6;
      if (near) toggleDoor(d, true);
    }
    // progress watchdog
    if (dGoal < w.bestDist - 0.05) {
      w.bestDist = dGoal;
      w.lastProgress = now;
    } else if (now - w.lastProgress > 3000) {
      // blocked (an NPC stepped in, a door swung): re-plan from here, give up after 3 tries
      if (!replan(w)) {
        cancelWalk(new Error("stuck"));
        return null;
      }
      w.lastProgress = now;
    }
    const want = Math.atan2(-(wp.x - player.x), -(wp.z - player.z));
    let dy = want - yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    yaw += dy * Math.min(1, 0.18);
    pitch += (0 - pitch) * 0.1;
    return { forward: Math.abs(dy) < 1.2 ? 1 : 0.15, side: 0, sprint: Math.hypot(wp.x - player.x, wp.z - player.z) > 6 };
  }

  const NAV_RADIUS = PHYSICS.radius + 0.08;

  function planPath(goal: { x: number; z: number }): { path: { x: number; z: number }[]; arrive: number } | null {
    navGrid = buildNavGrid(walkBounds, ctx.colliders.values(), { cell: 0.5, radius: NAV_RADIUS });
    const path = findPath(navGrid, { x: player.x, z: player.z }, goal);
    if (!path || !path.length) return null;
    const end = path[path.length - 1];
    return { path, arrive: Math.max(1, Math.hypot(end.x - goal.x, end.z - goal.z) + 0.35) };
  }

  function replan(w: AutoWalk): boolean {
    if (w.replans >= 3) return false;
    w.replans++;
    const p = planPath(w.goal);
    if (!p) return false;
    w.path = p.path;
    w.index = 0;
    w.arrive = Math.max(w.arrive, p.arrive);
    return true;
  }

  function walkTo(target: { x: number; z: number }, signal?: AbortSignal): Promise<void> {
    cancelWalk(new Error("superseded"));
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      if (Math.hypot(target.x - player.x, target.z - player.z) <= 1) {
        resolve();
        return;
      }
      const plan = planPath(target);
      if (!plan) {
        reject(new Error(S.unreachable));
        return;
      }
      const now = performance.now();
      const w: AutoWalk = { path: plan.path, index: 0, goal: { x: target.x, z: target.z }, arrive: plan.arrive, replans: 0, resolve, reject, lastProgress: now, bestDist: Infinity, signal };
      if (signal) {
        w.onAbort = () => {
          if (autoWalk === w) cancelWalk(new DOMException("Aborted", "AbortError") as unknown as Error);
        };
        signal.addEventListener("abort", w.onAbort, { once: true });
      }
      autoWalk = w;
    });
  }

  /* ---------------- frame loop ---------------- */
  const tmpV = new Vector3();
  const tmpCam = new Vector3();
  let lastMove = 0;

  function updateScreens(now: number): void {
    for (const sc of ctx.screens) {
      if (sc.kind !== "vitals" && sc.kind !== "ecg") continue;
      if (now - sc.lastDraw < 100) continue;
      const d = Math.hypot(sc.x - player.x, sc.z - player.z);
      if (d > 14 && sc.lastDraw > 0) continue;
      sc.lastDraw = now;
      let snap = null;
      if (sc.slotId && patients.has(sc.slotId) && opts.vitals) {
        try {
          snap = opts.vitals(sc.slotId);
        } catch {
          snap = null;
        }
      }
      monitorRenderer.draw(sc.ctx, sc.canvas.width, sc.canvas.height, snap, now, locale);
      sc.texture.needsUpdate = true;
    }
  }

  function applyQuality(): void {
    const s = settings();
    if (s.quality === quality) return;
    const prevShadows = renderer.shadowMap.enabled;
    quality = s.quality;
    const q = QUALITY[quality] ?? QUALITY.high;
    renderer.setPixelRatio(Math.min(dpr, q.ratio));
    resize();
    renderer.shadowMap.enabled = q.shadow > 0;
    sun.castShadow = q.shadow > 0;
    if (q.shadow > 0 && sun.shadow.mapSize.x !== q.shadow) {
      sun.shadow.mapSize.set(q.shadow, q.shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
    if (prevShadows !== renderer.shadowMap.enabled)
      scene.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
        else if (m) m.needsUpdate = true;
      });
  }

  function frame(now: number): void {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(PHYSICS.maxDt, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    if (typeof document !== "undefined" && document.hidden) return;
    const s = settings();
    if (now - qualityCheck > 1000) {
      qualityCheck = now;
      applyQuality();
    }
    const walking = started && autoWalk ? autoWalkInput(now) : null;
    if (playing() || (started && walking)) {
      const px = player.x, pz = player.z;
      const sprint = walking ? walking.sprint : !!keys.ShiftLeft || !!keys.ShiftRight;
      const input = walking
        ? { forward: walking.forward, side: 0, yaw, sprint, jump: false }
        : { forward: (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), side: (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), yaw, sprint, jump: !!keys.Space };
      if (!frozen) stepPlayer(player, input, dt, nearbyColliders(), walkBounds);
      if (!walking) {
        if (keys.ArrowLeft) yaw += dt * PHYSICS.turnSpeed;
        if (keys.ArrowRight) yaw -= dt * PHYSICS.turnSpeed;
        if (keys.ArrowUp) pitch = clampPitch(pitch + dt);
        if (keys.ArrowDown) pitch = clampPitch(pitch - dt);
      }
      const moved = Math.hypot(player.x - px, player.z - pz);
      walkPhase += moved * 2.7;
      if (moved > 0.001 && player.grounded && now - lastStep > (sprint ? PHYSICS.stepMsSprint : PHYSICS.stepMs)) {
        lastStep = now;
        callbacks.onSound("step");
      }
      const bob = s.bob !== false;
      camera.position.set(player.x, player.y + PHYSICS.eye + (bob ? Math.sin(walkPhase * 2) * 0.026 : 0), player.z);
      camera.rotation.set(pitch, yaw, 0);
      camera.fov = MathUtils.lerp(camera.fov, targetFov(sprint, moved > 0.001), dt * 5);
      camera.updateProjectionMatrix();
      swing = Math.max(0, swing - dt * 4);
      hand.rotation.x = -0.12 - swing * 0.7;
      hand.position.y = -0.39 + (bob ? Math.sin(walkPhase) * 0.013 : 0);
      aimTimer += dt;
      if (aimTimer > 0.09) {
        aimTimer = 0;
        updateAim();
        if (now - lastMove > 95) {
          lastMove = now;
          const r = region();
          callbacks.onMove({ x: player.x, z: player.z, yaw, region: r.name, roomId: r.roomId, moving: moved > 0.001 });
        }
      }
    } else {
      camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
      camera.rotation.set(pitch, yaw, 0);
    }
    animateDoors(ctx.doors, dt);
    // NPCs: head tracking (V4: within 5 units, ±.55 rad, lerp dt·3), speaking, distress
    camera.getWorldPosition(tmpCam);
    for (const n of ctx.npcs.values()) {
      const rig = n.rig;
      const dist = Math.hypot(player.x - n.x, player.z - n.z);
      if (dist < 5) {
        tmpV.copy(tmpCam);
        rig.body.worldToLocal(tmpV);
        const local = tmpV.sub(rig.head.position);
        const ang = Math.atan2(local.x, local.z);
        const lim = rig.posture === "lying" ? 0.8 : 0.55;
        rig.head.rotation.y = MathUtils.lerp(rig.head.rotation.y, Math.max(-lim, Math.min(lim, ang)), dt * 3);
      }
      const bob = s.bob !== false;
      let hy = rig.headBaseY + (bob ? Math.sin(now * 0.0018) * 0.005 : 0);
      if (n.speaking) {
        rig.mouth.scale.y = 0.025 * (1 + Math.abs(Math.sin(now * 0.022)) * 2.6);
        rig.head.rotation.x = Math.sin(now * 0.011) * 0.05;
        hy += Math.abs(Math.sin(now * 0.011)) * 0.012;
      } else {
        rig.mouth.scale.y = 0.025;
        rig.head.rotation.x *= 0.9;
      }
      rig.head.position.y = hy;
      const breath = n.distressed ? 0.035 * Math.sin(now * 0.016) : 0.012 * Math.sin(now * 0.004);
      rig.torso.scale.z = (rig.torso.userData.baseZ as number) * (1 + breath);
    }
    for (const tag of tagSigns) {
      tag.getWorldPosition(tmpV);
      const parentYaw = tag.parent ? tag.parent.rotation.y : 0;
      tag.rotation.y = Math.atan2(tmpCam.x - tmpV.x, tmpCam.z - tmpV.z) - parentYaw;
    }
    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t -= dt;
      p.v.y -= 9 * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.t <= 0) {
        scene.remove(p.m);
        particles.splice(i, 1);
      }
    }
    clouds.position.x = Math.sin(now * 12e-6) * 3;
    if (beacon.visible) {
      marker.position.y = 3.1 + Math.sin(now * 0.003) * 0.25;
      marker.rotation.y = now * 0.0015;
      if (beaconLabel) {
        beaconLabel.position.y = 4.1 + Math.sin(now * 0.003) * 0.25;
        beaconLabel.rotation.y = Math.atan2(tmpCam.x - beacon.position.x, tmpCam.z - beacon.position.z);
      }
      beaconMat.opacity = 0.3 + 0.08 * Math.sin(now * 0.004);
    }
    for (const a of ctx.animated) {
      const t = now / 1000 + a.phase;
      if (a.anim === "blink") a.material.emissiveIntensity = Math.floor(t * 1.6) % 2 ? 1.1 : 0.05;
      else if (a.anim === "pulse") a.material.emissiveIntensity = 0.35 + 0.35 * (1 + Math.sin(t * 4));
      else if (a.anim === "spin") a.mesh.rotation.y = a.base.ry + t * 2.4;
    }
    updateScreens(now);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  /* ---------------- map data (static) ---------------- */
  const mapWalls: MapWall[] = walls.map((w) => {
    const seg =
      w.wall.axis === "x"
        ? { x0: w.wall.from, z0: w.wall.line, x1: w.wall.to, z1: w.wall.line }
        : { x0: w.wall.line, z0: w.wall.from, x1: w.wall.line, z1: w.wall.to };
    return {
      ...seg,
      t: w.thickness,
      partition: w.partition,
      gaps: w.openings.filter((o) => o.kind !== "window").map((o) => [o.a, o.b] as [number, number]),
      windows: w.openings.filter((o) => o.kind === "window").map((o) => [o.a, o.b] as [number, number]),
    };
  });
  const matColor = (id: string, fb: string) => merged.materials.get(id)?.color ?? fb;
  function mapData(): MapData {
    return {
      bounds: facility.bounds,
      ground: facility.terrain?.ground ?? "grass",
      paths: (facility.terrain?.paths ?? []).map((p) => ({ ...p, color: p.material && p.material !== "path" ? matColor(p.material, "#ded0a4") : "#ded0a4" })),
      ponds: facility.terrain?.ponds ?? [],
      trees: facility.terrain?.trees ?? [],
      buildZone: facility.buildZone?.rect ?? null,
      buildZoneLabel: S.buildZone,
      buildings: facility.buildings.map((bb) => ({ ...bb.rect, name: tx(bb.name, locale) })),
      rooms: facility.rooms.map((r) => ({ ...r.rect, name: tx(r.name, locale), kind: r.kind })),
      walls: mapWalls,
      placements: [...ctx.placements.values()].map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d, kind: p.kind, solid: p.solid, label: p.label })),
      slots: facility.patientSlots.map((sl) => ({ x: sl.x, z: sl.z, occupied: patients.has(sl.id), label: patients.get(sl.id)?.name ?? sl.id })),
      staff: (facility.staff ?? []).map((st) => ({ x: st.x, z: st.z, label: tx(st.name, locale) })),
      northLabel: S.north,
    };
  }

  /* ---------------- API ---------------- */
  function locate(id: string): { x: number; z: number; label: string } | null {
    const p = ctx.placements.get(id);
    if (p) return { x: p.x, z: p.z, label: p.label };
    const sl = facility.patientSlots.find((s) => s.id === id);
    if (sl) {
      const npc = ctx.npcs.get(`patient:${id}`);
      return { x: npc?.x ?? sl.x, z: npc?.z ?? sl.z, label: patients.get(id)?.name ?? S.patient };
    }
    const st = (facility.staff ?? []).find((s) => s.id === id);
    if (st) return { x: st.x, z: st.z, label: `${roleName(st.role, locale)} · ${tx(st.name, locale)}` };
    const room = facility.rooms.find((r) => r.id === id);
    if (room) return { x: room.rect.x, z: room.rect.z, label: tx(room.name, locale) };
    const bl = facility.buildings.find((r) => r.id === id);
    if (bl) return { x: bl.rect.x, z: bl.rect.z, label: tx(bl.name, locale) };
    if (id === "spawn") return { x: spawn.x, z: spawn.z, label: "spawn" };
    return null;
  }

  function teleportTo(x: number, z: number, y = 0, newYaw?: number, newPitch?: number): void {
    Object.assign(player, { x, z, y, vy: 0, grounded: y <= 0 });
    if (newYaw != null && Number.isFinite(newYaw)) yaw = newYaw;
    if (newPitch != null && Number.isFinite(newPitch)) pitch = clampPitch(newPitch);
    camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
    camera.rotation.set(pitch, yaw, 0);
  }

  const api: WorldApi = {
    start() {
      started = true;
      paused = false;
    },
    pause(p: boolean) {
      paused = p;
      keys = {};
      if (p) {
        dragFrom = null;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      }
    },
    select,
    interact,
    build,
    serialize(): WorldSave {
      return {
        facilityId: facility.id,
        position: [player.x, player.y, player.z],
        yaw,
        pitch,
        blocks: [...placed.values()].map((p) => ({ cell: [...p.cell] as [number, number, number], type: p.type })),
      };
    },
    setKey(code: string, down: boolean) {
      keys[code] = down;
      if (down && autoWalk && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(code)) cancelWalk(new Error("interrupted by player"));
    },
    look,
    reset() {
      cancelWalk(new Error("reset"));
      teleportTo(spawn.x, spawn.z, 0, spawn.yaw ?? 0, 0);
      for (const d of ctx.doors) {
        setDoorOpen(d, false, locale);
        for (const l of d.leaves) {
          if (l.mode === "swing") l.pivot.rotation.y = 0;
          else l.pivot.position.x = l.baseX ?? 0;
        }
      }
    },
    teleport(x: number, z: number, newYaw?: number) {
      teleportTo(x, z, 0, newYaw);
    },
    setPatientState(slotId, state) {
      const n = ctx.npcs.get(`patient:${slotId}`);
      const p = patients.get(slotId);
      if (!n || !p) return;
      if ((state.posture && state.posture !== n.rig.posture) || (state.accessory && state.accessory !== p.appearance.accessory)) {
        const next: WorldPatient = { ...p, posture: state.posture ?? p.posture, appearance: { ...p.appearance, accessory: state.accessory ?? p.appearance.accessory } };
        const speaking = n.speaking, distressed = n.distressed;
        placePatient(next);
        const nn = ctx.npcs.get(`patient:${slotId}`);
        if (nn) {
          nn.speaking = speaking;
          nn.distressed = distressed;
        }
      }
      const cur = ctx.npcs.get(`patient:${slotId}`);
      if (!cur) return;
      if (state.speaking != null) cur.speaking = state.speaking;
      if (state.distressed != null && state.distressed !== cur.distressed) {
        cur.distressed = state.distressed;
        for (const m of cur.rig.skinMeshes) m.material = state.distressed ? cur.rig.flushMaterial : cur.rig.skinMaterial;
      }
    },
    setStaffSpeaking(staffId, speaking) {
      const n = ctx.npcs.get(`staff:${staffId}`);
      if (n) n.speaking = speaking;
    },
    setWaypoint(target) {
      waypoint = target;
      if (beaconLabel) {
        beaconLabel.removeFromParent();
        beaconLabel = null;
      }
      if (!target) {
        beacon.visible = false;
        return;
      }
      beacon.visible = true;
      beacon.position.set(target.x, 0, target.z);
      if (target.label) {
        beaconLabel = signs.make(target.label, Math.min(3.2, Math.max(1.8, target.label.length * 0.32)), "#c68836");
        beacon.add(beaconLabel);
      }
    },
    walkTo,
    drawMap(target, o) {
      const c2d = target.getContext("2d");
      if (!c2d) return;
      paintMap(c2d, target.width, target.height, mapData(), {
        big: o.big,
        waypoint: o.waypoint ?? (waypoint ? { x: waypoint.x, z: waypoint.z } : null),
        player: { x: player.x, z: player.z, yaw },
        timeMs: performance.now(),
      });
    },
    locate,
    screenshot() {
      renderer.render(scene, camera);
      return canvas.toDataURL("image/png");
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelWalk(new Error("disposed"));
      for (const [t, type, fn, o] of listeners) t.removeEventListener(type, fn, o);
      ro?.disconnect();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      scene.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.geometry && mesh.geometry !== UNIT_BOX) mesh.geometry.dispose();
        const m = mesh.material as Material | Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m && !lib.has(m.name)) m.dispose();
        if ((o as InstancedMesh).isInstancedMesh) (o as InstancedMesh).dispose();
      });
      for (const sc of ctx.screens) sc.texture.dispose();
      lib.dispose();
      signs.dispose();
      renderer.dispose();
    },
    get position() {
      return { x: player.x, y: player.y, z: player.z, yaw, pitch };
    },
    debug: {
      get player() {
        return player;
      },
      camera,
      scene,
      renderer,
      colliders: ctx.colliders,
      placed,
      doors: ctx.doors,
      targets: ctx.targets,
      npcs: ctx.npcs,
      screens: ctx.screens,
      warnings: ctx.warnings,
      lib,
      groundMeshes,
      staticMeshes,
      get target() {
        return aimTarget;
      },
      get started() {
        return started;
      },
      get paused() {
        return paused;
      },
      get nav() {
        return navGrid;
      },
      /** V4 signature: teleport(x, z, y = 0, yaw = 0, pitch = 0). */
      teleport(x: number, z: number, y = 0, newYaw = 0, newPitch = 0) {
        teleportTo(x, z, y, newYaw, newPitch);
      },
      /** Freeze physics (QA camera positions in mid-air) while aiming keeps working. */
      freeze(v: boolean) {
        frozen = v;
      },
      updateAim,
      stats() {
        return {
          draws: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          colliders: ctx.colliders.size,
          pickables: ctx.pickables.length,
          instanced: staticMeshes.reduce((a, m) => a + m.count, 0) + groundMeshes.reduce((a, m) => a + m.count, 0),
          pointLights: ctx.realLights.length,
          lightCandidates: ctx.lights.length,
        };
      },
    },
  };
  return api;
};

export default createWorld;
