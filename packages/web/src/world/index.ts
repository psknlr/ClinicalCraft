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
import { buildingLevels, entityLevel, roomLevel } from "@clinicalcraft/core";
import { blockBox, buildCollisionModel, patientBodyBox, staffBodyBox, type DoorSpec } from "@clinicalcraft/world";
import type { BlockInfo, BodyMove, BodyPose, CreateWorld, InteractionTarget, RoutePoint, WorldApi, WorldOptions, WorldPatient, WorldPoint, WorldSave, WorldSettings } from "../contracts.js";
import { monitorRenderer } from "../shared/monitor-render.js";
import { buildRules, canPlace, cellKey, validBlocks, type BuildRules, type Cell } from "./buildzone.js";
import type { BuildContext, DoorRecord, LightCandidate, NpcRecord } from "./context.js";
import { captureJpeg } from "./capture.js";
import { buildElevators, inCar, type Elevator, type ElevatorStop, type ElevatorTarget } from "./elevator.js";
import { ROUTE_ARRIVE, worldRouteLegs, yawOfRig } from "./embodiment.js";
import { buildPlacements, surfaceTop } from "./equipment.js";
import { ModelCache, modelUrl, placeModel, shortUrl } from "./models.js";
import { WorldLevels } from "./levels.js";
import { drawMap as paintMap, type MapConnector, type MapData, type MapWall } from "./map.js";
import { MaterialLibrary, mergeCatalogs } from "./materials.js";
import { buildPerson, disposeRig, ROLE_UNIFORMS, setDistressed, type AppearanceLike, type Posture } from "./npc.js";
import { buildNavGrid, findPath, type NavGrid } from "./pathfind.js";
import { clampPitch, ColliderGrid, overlapsXZ, PHYSICS, stepPlayer, targetFov, type Aabb, type PlayerState } from "./physics.js";
import { dragPortable, placePortable, pushPortable, type PortableHost } from "./portable.js";
import { regionAt } from "./region.js";
import { SignFactory } from "./signs.js";
import { animateDoors, buildStructures, setDoorOpen, type WallRecord } from "./structures.js";
import { routeLegs, type Leg } from "./route.js";
import { buildLevels } from "./stairs.js";
import { roleName, strings, tx } from "./strings.js";
import { buildTerrain } from "./terrain.js";
import { createLcg } from "./textures.js";
import { BoxBatch, isSharedGeometry, releaseSharedGeometry, UNIT_BOX } from "./voxels.js";
import { StaffWalkers } from "./walkers.js";

export { monitorRenderer } from "../shared/monitor-render.js";

const AIM_FAR = 5.5;
const TARGET_RANGE = 3.5;
const BUILD_RANGE = 5.3;
/**
 * While paused (intro, a window or the approval dialog covers the view behind a blurred
 * backdrop) the scene is redrawn at ~8 fps instead of every frame: idle NPCs, clouds and
 * monitor screens still move, but the GPU/CPU (and the compositor re-blurring the
 * backdrop) are not busy at 60 fps behind a static panel. Autopilot walks run at full rate.
 */
const PAUSED_FRAME_MS = 125;
/** Keys the world turns into actions (their default — typing a character — is suppressed). */
const SHORTCUT_CODES = new Set(["KeyE", "KeyB", "Tab", "KeyM", "KeyJ", "KeyT", "Enter", "KeyQ", "KeyF", "Escape"]);

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

/** Elevator ride in progress: doors close, the car moves (view dimmed, the avatar moved half-way), doors open. */
interface Ride {
  elevator: Elevator;
  from: ElevatorStop;
  to: ElevatorStop;
  phase: "closing" | "moving" | "opening";
  /** Seconds in the current phase. */
  t: number;
  /** Seconds the car moves. */
  duration: number;
  moved: boolean;
  resolve: () => void;
  reject: (e: Error) => void;
}

/** Ride timing (s): doors closing, doors opening, and the move (base + per metre of rise). */
const RIDE = { close: 0.7, open: 0.45, base: 1.1, perMetre: 0.12 } as const;
/** Renderer exposure (V4); dimmed while an elevator car moves. */
const EXPOSURE = 1.15;

interface AutoWalk {
  path: { x: number; z: number }[];
  index: number;
  goal: { x: number; z: number };
  /** Arrival radius: 1 m, or the reachable distance to a goal inside furniture (+ .35). */
  arrive: number;
  /** Consecutive re-plans that did not lead to progress (give up after 3). */
  replans: number;
  resolve: () => void;
  reject: (e: Error) => void;
  /** Simulated seconds without progress along the path (frame-rate independent watchdog). */
  stall: number;
  /** Best remaining path length so far (progress = this shrinking, even on detours away from the goal). */
  bestRemaining: number;
  /** Remaining length right after the last re-plan (re-plan budget refills after 1 m of real progress). */
  replanBase: number;
  signal?: AbortSignal;
  onAbort?: () => void;
  /** Level of the current leg: walking legs plan on its nav grid and arrive only on it. */
  level: string;
  /** A straight leg (a flight): re-planning keeps this path. */
  fixed?: { x: number; z: number }[];
  /** Legs after the current one (a route to another level). */
  legs: Leg[];
  /** Waiting for an elevator ride (the walk resumes on arrival). */
  riding?: boolean;
  /**
   * Embodiment (`followRoute`): the current leg follows the world model's points (a stall detours locally
   * to the next point instead of re-planning the whole leg), and doors this walk opened close behind it.
   */
  route?: { opened: Set<DoorRecord>; detours: number };
  /** Current leg is a `path` leg of a world-model route. */
  pathLeg?: boolean;
}

export const createWorld: CreateWorld = (opts: WorldOptions): WorldApi => {
  const buildStart = performance.now();
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
  renderer.toneMappingExposure = EXPOSURE;
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
  // Shadow box: the whole facility when it is V4-sized (half ≤ 40, V4 ±37), else a ±SHADOW_HALF box
  // that follows the player in SHADOW_STEP jumps (sharper texels, fewer shadow-pass draw calls).
  const SHADOW_HALF = 40;
  const SHADOW_STEP = 8;
  const followShadow = half > SHADOW_HALF;
  const boxHalf = followShadow ? SHADOW_HALF : half + 1.5;
  const sunScale = Math.max(1, (followShadow ? SHADOW_HALF : half) / 35.5);
  const sun = new DirectionalLight("#fff4d4", env.sunIntensity ?? 3.4);
  const aimSun = (x: number, z: number) => {
    sun.position.set(x - 23 * sunScale, 36 * sunScale, z + 19 * sunScale);
    sun.target.position.set(x, 0, z);
    sun.target.updateMatrixWorld();
  };
  aimSun(cX, cZ);
  sun.castShadow = q0.shadow > 0;
  sun.shadow.mapSize.set(q0.shadow || 1024, q0.shadow || 1024);
  Object.assign(sun.shadow.camera, { left: -boxHalf, right: boxHalf, top: boxHalf, bottom: -boxHalf, near: 1, far: 90 * sunScale });
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -3e-4;
  scene.add(sun);
  scene.add(sun.target);
  // The scene is static apart from doors, blocks and NPC rebuilds: render the shadow map on demand
  // (halves the per-frame draw calls; NPC breathing / head turns do not need new shadows).
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const markShadows = () => {
    renderer.shadowMap.needsUpdate = true;
  };
  let shadowCentre = "";
  /** Re-centre a following shadow box on the player (in SHADOW_STEP jumps). */
  function followSun(px: number, pz: number): void {
    if (!followShadow) return;
    const sx = Math.round(px / SHADOW_STEP) * SHADOW_STEP;
    const sz = Math.round(pz / SHADOW_STEP) * SHADOW_STEP;
    const key = `${sx},${sz}`;
    if (key === shadowCentre) return;
    shadowCentre = key;
    aimSun(sx, sz);
    markShadows();
  }

  const root = new Group();
  root.name = "facility";
  scene.add(root);

  /* ---------------- build ---------------- */
  const merged = mergeCatalogs(opts.catalogs ?? [], facility.materials ?? []);
  const lib = new MaterialLibrary(merged);
  const signs = new SignFactory();
  // Every collider comes from the facility's collision model (@clinicalcraft/world, EMBODIED R2): the
  // static ones are registered here; patients (posture changes) and build-zone blocks (mined/placed)
  // are added at runtime with the model's own box functions (patientBodyBox, blockBox).
  const collision = buildCollisionModel(facility, opts.catalogs ?? [], { blocks: [] });
  // Levels (EMBODIED R10): every level is built at its elevation. The default level (terrain, outdoors,
  // ground floor, the slabs above it) goes to the scene's root and scenery batch; every other level to
  // its own group and batch, hidden as a whole indoors when the camera is on another floor.
  const levels = new WorldLevels(facility);
  const level = levels.ground;
  const colliderGrid = new ColliderGrid(2);
  const physics = new Map<string, Aabb>();
  /** Level of every registered collider (model colliders, patients, blocks); missing = the default level. */
  const colliderLevels = new WeakMap<Aabb, string>();
  for (const c of collision.colliders) {
    const box: Aabb = { minX: c.minX, maxX: c.maxX, minY: c.minY, maxY: c.maxY, minZ: c.minZ, maxZ: c.maxZ };
    if (c.kind === "door") box.door = true;
    if (c.ramp) box.ramp = { ...c.ramp }; // stairs / ramp flights: walkable wedges (physics follows the surface)
    physics.set(c.id, colliderGrid.add(box));
    colliderLevels.set(box, c.level);
  }
  /** Walkable floor of each upper level (its slabs, stairwells excluded) for the autopilot's nav grids. */
  const levelFloors = new Map<string, { minX: number; maxX: number; minZ: number; maxZ: number }[]>();
  for (const c of collision.colliders) {
    if (c.kind !== "slab") continue;
    const list = levelFloors.get(c.level) ?? [];
    list.push({ minX: c.minX, maxX: c.maxX, minZ: c.minZ, maxZ: c.maxZ });
    levelFloors.set(c.level, list);
  }
  const doorSpecs = new Map<string, DoorSpec>(collision.doors.map((d) => [d.id.slice("door:".length), d]));
  const sceneryBatch = new BoxBatch();
  const levelRoots = new Map<string, Group>([[level, root]]);
  const levelBatches = new Map<string, BoxBatch>([[level, sceneryBatch]]);
  for (const l of levels.list) {
    if (levelRoots.has(l.id)) continue;
    const g = new Group();
    g.name = `level:${l.id}`;
    root.add(g);
    levelRoots.set(l.id, g);
    levelBatches.set(l.id, new BoxBatch());
  }
  const ctx: BuildContext = {
    facility,
    catalogs: merged,
    locale,
    scene,
    root,
    lib,
    signs,
    batch: sceneryBatch,
    colliders: colliderGrid,
    collision,
    level,
    levels,
    onLevel: (id: string) => {
      ctx.root = levelRoots.get(id) ?? root;
      ctx.batch = levelBatches.get(id) ?? sceneryBatch;
    },
    physics,
    doorSpecs,
    pickables: [],
    targets: new Map(),
    doors: [],
    lights: [],
    realLights: [],
    screens: [],
    animated: [],
    placements: new Map(),
    portables: new Map(),
    npcs: new Map(),
    // meshes always carry castShadow flags; the renderer's shadow map (quality) decides whether they are used
    shadows: true,
    ownedTextures: [],
    models: opts.models === false ? null : [],
    warnings: [],
  };
  // ground uses its own batch (not ray-picked: an analytic plane is used instead)
  const groundBatch = new BoxBatch();
  ctx.batch = groundBatch;
  const { clouds } = buildTerrain(ctx);
  // trees/pond/horizon/flowers also went to groundBatch: they are scenery and not targets, which is fine.
  ctx.batch = sceneryBatch;
  const walls: WallRecord[] = buildStructures(ctx);
  buildLevels(ctx); // upper floors (slabs) and stairs flights: multi-level facilities only
  buildPlacements(ctx);
  const elevators: Elevator[] = buildElevators(ctx, (r) => roomLevel(facility, r));
  const groundMeshes = groundBatch.build(root, lib, ctx.shadows);
  const staticMeshes = sceneryBatch.build(root, lib, ctx.shadows);
  for (const [id, batch] of levelBatches) if (id !== level) staticMeshes.push(...batch.build(levelRoots.get(id) ?? root, lib, ctx.shadows));
  for (const m of staticMeshes) ctx.pickables.push(m);

  /* ---------------- equipment models (GLB/glTF, EMBODIED §11) ---------------- */
  // Loaded after the build; until one is in (and whenever it fails) the placement's voxel parts stay.
  const modelOpts = opts.models === false ? null : (opts.models ?? {});
  const modelCache = modelOpts && ctx.models?.length ? new ModelCache({ ...(modelOpts.baseUrl ? { baseUrl: modelOpts.baseUrl } : {}), ...(modelOpts.dracoPath ? { dracoPath: modelOpts.dracoPath } : {}) }) : null;
  const modelState = { requested: ctx.models?.length ?? 0, loaded: [] as string[], failed: [] as string[] };
  for (const req of ctx.models ?? []) {
    modelCache!
      .load(req.model.uri, req.model.sha256)
      .then((scene) => {
        if (disposed) return;
        const placed = placeModel(scene, req.model, req.footprint, { ...req.at, id: req.placementId }, ctx.shadows);
        if (!placed) throw new Error("empty model");
        (req.parent ?? levelRoots.get(req.level) ?? root).add(placed.group);
        req.fallback.visible = false;
        const hidden = new Set<Object3D>();
        req.fallback.traverse((o) => hidden.add(o));
        for (let i = ctx.pickables.length - 1; i >= 0; i--) if (hidden.has(ctx.pickables[i])) ctx.pickables.splice(i, 1);
        ctx.pickables.push(placed.proxy);
        modelState.loaded.push(req.placementId);
        markShadows();
      })
      .catch((err: unknown) => {
        if (disposed) return;
        modelState.failed.push(req.placementId);
        ctx.warnings.push(`model of ${req.placementId} (${shortUrl(modelUrl(req.model.uri, modelCache!.baseUrl))}): ${err instanceof Error ? err.message : String(err)} — voxel parts kept`);
      });
  }

  // point lights: a fixed pool (quality budget) of real PointLights is moved to the candidates nearest
  // the player (re-assigned as the player walks); the other fixtures stay emissive-only. A static
  // "nearest to spawn" choice left every room far from the entrance without its ceiling light.
  const spawn = facility.spawn ?? { x: 0, z: 0, yaw: 0 };
  let lightsAt: { x: number; z: number; level: string } | null = null;
  /** Lights of another level only fill the pool when nothing on the avatar's level is left (multi-level). */
  const OTHER_LEVEL_LIGHT = 60;
  function assignLights(px: number, pz: number, force = false, py = 0): void {
    const here = levels.at(py);
    if (!force && lightsAt && lightsAt.level === here && Math.hypot(px - lightsAt.x, pz - lightsAt.z) < 1.5) return;
    lightsAt = { x: px, z: pz, level: here };
    const budget = Math.min(ctx.lights.length, (QUALITY[quality] ?? QUALITY.high).lights);
    // pool size only changes with the quality setting (a different light count recompiles shaders)
    while (ctx.realLights.length < budget) {
      const pl = new PointLight();
      root.add(pl);
      ctx.realLights.push(pl);
    }
    while (ctx.realLights.length > budget) ctx.realLights.pop()!.removeFromParent();
    const nearest = ctx.lights
      .map((l) => ({ l, d: Math.hypot(l.x - px, l.z - pz) + (levels.multi && (l.level ?? level) !== here ? OTHER_LEVEL_LIGHT : 0) }))
      .sort((p, q) => p.d - q.d)
      .slice(0, budget)
      .map((e) => e.l);
    // keep lights that stay selected where they are (no flicker), move the freed ones to the new candidates
    const free: PointLight[] = [];
    const taken = new Set<LightCandidate>();
    for (const pl of ctx.realLights) {
      const cur = pl.userData.candidate as LightCandidate | undefined;
      if (cur && nearest.includes(cur) && !taken.has(cur)) taken.add(cur);
      else free.push(pl);
    }
    for (const l of nearest) {
      if (taken.has(l)) continue;
      const pl = free.pop();
      if (!pl) break;
      pl.userData.candidate = l;
      pl.color.set(l.color);
      pl.intensity = l.intensity;
      pl.distance = l.distance;
      pl.decay = l.decay;
      pl.position.set(l.x, l.y, l.z);
    }
  }
  assignLights(spawn.x, spawn.z, true);

  /* ---------------- NPCs ---------------- */
  const patients = new Map<string, WorldPatient>();
  /** Camera position of the last interior-culling pass (null = re-evaluate; see cullDetails). */
  let detailAt: { x: number; z: number; level: string } | null = null;
  const tagSigns: Object3D[] = [];

  /** Name tags / labels never take the aim ray. */
  function noRaycast(o: Object3D): void {
    o.traverse((c) => (c.raycast = () => {}));
  }

  function placePatient(p: WorldPatient): void {
    const slot = facility.patientSlots.find((s) => s.id === p.slotId);
    if (!slot) {
      ctx.warnings.push(`unknown patient slot "${p.slotId}"`);
      return;
    }
    const slotLevel = entityLevel(facility, slot);
    const elevation = levels.elevation(slotLevel);
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
    rig.root.position.set(x, elevation, z);
    rig.root.rotation.y = MathUtils.degToRad(rot);
    (levelRoots.get(slotLevel) ?? root).add(rig.root);
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
    // the collision model's body for this slot and posture (none on a bed or chair)
    const body = patientBodyBox(facility, merged.equipment, p.slotId, posture);
    const collider = body ? ctx.colliders.add({ ...body, minY: body.minY + elevation, maxY: body.maxY + elevation }) : null;
    if (collider) colliderLevels.set(collider, slotLevel);
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
      level: slotLevel,
    });
    patients.set(p.slotId, p);
    markShadows();
    detailAt = null; // re-evaluate interior culling for the new rig
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
    markShadows();
  }

  for (const p of opts.patients ?? []) placePatient(p);

  for (const st of facility.staff ?? []) {
    const staffLevel = entityLevel(facility, st);
    const uni = ROLE_UNIFORMS[st.role] ?? { shirt: "#f1ead5", pants: "#354442" };
    const ap: AppearanceLike = { shirt: uni.shirt, pants: uni.pants, hairStyle: uni.hairStyle, ...(st.appearance ?? {}) };
    const rig = buildPerson(lib, ap, { posture: "standing", coat: !!uni.coat, stripe: uni.stripe, badge: true });
    rig.root.position.set(st.x, levels.elevation(staffLevel), st.z);
    rig.root.rotation.y = MathUtils.degToRad(st.rot ?? 0);
    (levelRoots.get(staffLevel) ?? root).add(rig.root);
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
    const collider = physics.get(`staff:${st.id}`) ?? null; // the collision model's staff body
    ctx.npcs.set(`staff:${st.id}`, { kind: "staff", id: st.id, rig, x: st.x, z: st.z, rot: MathUtils.degToRad(st.rot ?? 0), speaking: false, distressed: false, collider, target, label: `${role} · ${name}`, level: staffLevel });
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
    const collider = ctx.colliders.add({ ...blockBox(cell) }); // the collision model's block box
    placed.set(k, { mesh, collider, type, cell: [...cell] as Cell });
    markShadows();
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
    markShadows();
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
    const top = levels.list.length ? levels.list[levels.list.length - 1].elevation : 0;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && y >= 0 && y < top + 8) Object.assign(player, { x, y, z });
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
  let waypoint: (WorldPoint & { label: string }) | null = null;
  let qualityCheck = 0;
  let ride: Ride | null = null;

  camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
  camera.rotation.set(pitch, yaw, 0);

  /* ---------------- helpers ---------------- */
  const blockMaterials = rules?.materials ?? ["wood", "stone", "glass", "lamp"];

  /** Level the avatar stands on (half-way up a flight is still the lower one). */
  function currentLevel(): string {
    return levels.at(player.y);
  }

  function region() {
    return regionAt(facility, player.x, player.z, locale, levels.multi ? currentLevel() : undefined);
  }

  function nearbyColliders(): Aabb[] {
    return ctx.colliders.query(player.x, player.z, 1.6);
  }

  function toast(pair: readonly [string, string] | readonly string[]) {
    callbacks.onToast(pair[0], pair[1]);
  }

  function toggleDoor(door: DoorRecord, force?: boolean, sound = true): void {
    const open = force ?? !door.open;
    if (open === door.open) return;
    setDoorOpen(door, open, locale);
    if (sound) callbacks.onSound("door");
  }

  function playerInDoorway(door: DoorRecord): boolean {
    const a = door.area;
    if (levels.multi && door.level !== currentLevel()) return false;
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
        if (!door.open && door.locked) {
          // locked by the world model (embodiment): it stays shut
          toast(S.doorLocked);
          return;
        }
        toggleDoor(door); // both leaves of a double door share one record (V4 toggles them together)
        callbacks.onDoor?.(door.id, door.open);
        return;
      }
      if (t.kind === "elevator") {
        elevatorPanel(t);
        return;
      }
      callbacks.onInteract(t);
      return;
    }
    if (slot === 0) toast(S.approach);
    else if (slot === 1) callbacks.onShortcut("journal");
    else if (slot === 2) callbacks.onShortcut("map");
  }

  /* ---------------- elevators (EMBODIED R10) ---------------- */
  const elevatorById = (id: string) => elevators.find((e) => e.id === id) ?? null;
  const stopOn = (el: Elevator, lv: string) => el.stops.find((s) => s.level === lv) ?? null;

  /** Would the (sliding) car door, closing, hit the avatar? (its leaves' closed boxes overlap the avatar's disc) */
  function inDoorLeaves(door: DoorRecord): boolean {
    return door.leaves.some((l) => overlapsXZ(player, l.collider, PHYSICS.radius + 0.05));
  }

  /** E on an elevator panel: outside, call the car (its door opens); inside, the UI offers the levels. */
  function elevatorPanel(t: ElevatorTarget): void {
    if (ride) {
      callbacks.onToast(S.elevatorBusy);
      return;
    }
    const el = elevatorById(t.connectorId);
    const stop = el ? stopOn(el, t.level) : null;
    if (!el || !stop) return;
    if (!t.inside) {
      if (stop.door && !stop.door.open) toggleDoor(stop.door, true);
      callbacks.onSound("beep");
      toast(S.elevatorArrived);
      return;
    }
    if (!inCar(stop, player.x, player.z)) {
      callbacks.onToast(S.elevatorOutside);
      return;
    }
    callbacks.onInteract(t);
  }

  function rideElevator(connectorId: string, to: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (disposed) return reject(new Error("disposed"));
      if (ride) return reject(new Error(S.elevatorBusy));
      const el = elevatorById(connectorId);
      const dest = el ? stopOn(el, to) : null;
      if (!el || !dest) return reject(new Error(`unknown elevator stop "${connectorId}" → "${to}"`));
      const from = stopOn(el, currentLevel());
      if (!from || !inCar(from, player.x, player.z)) return reject(new Error(S.elevatorOutside));
      if (from.door && inDoorLeaves(from.door)) return reject(new Error(S.leaveDoor[0]));
      if (from === dest) {
        if (dest.door && !dest.door.open) toggleDoor(dest.door, true);
        return resolve();
      }
      keys = {};
      if (from.door?.open) toggleDoor(from.door, false);
      ride = { elevator: el, from, to: dest, phase: "closing", t: 0, duration: RIDE.base + Math.abs(dest.elevation - from.elevation) * RIDE.perMetre, moved: false, resolve, reject };
    });
  }

  /** Advance a ride: doors close → the car moves (view dimmed; the avatar is moved half-way) → doors open → done. */
  function updateRide(dt: number): void {
    const r = ride;
    if (!r) return;
    r.t += dt;
    if (r.phase === "closing") {
      if (r.t < RIDE.close) return;
      r.phase = "moving";
      r.t = 0;
    }
    if (r.phase === "moving") {
      const k = Math.min(1, r.t / r.duration);
      renderer.toneMappingExposure = EXPOSURE * (1 - 0.6 * Math.sin(Math.PI * k));
      if (!r.moved && k >= 0.5) {
        r.moved = true;
        // the same spot of the car on the destination level
        teleportTo(player.x + (r.to.x - r.from.x), player.z + (r.to.z - r.from.z), player.y + (r.to.elevation - r.from.elevation));
        cullDetails(true);
        assignLights(player.x, player.z, true, player.y);
      }
      if (k < 1) return;
      renderer.toneMappingExposure = EXPOSURE;
      r.phase = "opening";
      r.t = 0;
      if (r.to.door && !r.to.door.open) toggleDoor(r.to.door, true);
      callbacks.onSound("beep");
      return;
    }
    if (r.t < RIDE.open) return;
    ride = null;
    callbacks.onToast(r.elevator.name, levels.name(r.to.level, locale));
    r.resolve();
  }

  function cancelRide(err: Error): void {
    const r = ride;
    if (!r) return;
    ride = null;
    renderer.toneMappingExposure = EXPOSURE;
    r.reject(err);
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
    const quads = hit.object.userData.quadOwners as string[] | undefined;
    if (quads && hit.faceIndex != null) {
      const rec = ctx.targets.get(quads[Math.floor(hit.faceIndex / 2)] ?? "");
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

  /** Pickables the aim ray may hit: in a multi-level facility, not those of a hidden level (or culled rig). */
  function aimables(): Object3D[] {
    if (!levels.multi) return ctx.pickables;
    return ctx.pickables.filter((o) => {
      for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
      return true;
    });
  }

  /** Identity of an aim target (re-announced to the UI only when it changes). */
  function targetId(t: InteractionTarget): string {
    switch (t.kind) {
      case "equipment":
        return t.placementId;
      case "patient":
        return t.slotId;
      case "staff":
        return t.staffId;
      case "elevator":
        return `${t.connectorId}@${t.level}:${t.inside ? "car" : "call"}`;
      default:
        return t.id;
    }
  }

  function updateAim(): void {
    camera.updateMatrixWorld();
    raycaster.setFromCamera(centre, camera);
    raycaster.far = AIM_FAR;
    const hits = raycaster.intersectObjects(aimables(), true);
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
    const key = aimTarget ? `${aimTarget.kind}:${targetId(aimTarget)}:${aimTarget.hint}` : aimBlock ? `b:${aimBlock.cell.join(",")}` : "";
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
    // Enter/Space on a focused HUD button activate that button, not the world's chat/jump.
    const control = e.target instanceof Element && e.target !== canvas ? e.target.closest("button, a[href], summary, [role='button']") : null;
    if (control && (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space")) return;
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
    if (autoWalk && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) cancelWalk(new Error("interrupted by player"));
    // Shortcut keys may open a window that focuses a text field synchronously (T/Enter → chat input,
    // E on a staff member): without preventDefault the key's own character would be typed into it.
    if (SHORTCUT_CODES.has(e.code) || e.code.startsWith("Digit")) e.preventDefault();
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

  /** Remaining length of the autopilot path from the player (current waypoint onwards). */
  function remainingPath(w: AutoWalk): number {
    let len = 0;
    let fx = player.x, fz = player.z;
    for (let i = w.index; i < w.path.length; i++) {
      len += Math.hypot(w.path[i].x - fx, w.path[i].z - fz);
      fx = w.path[i].x;
      fz = w.path[i].z;
    }
    return len;
  }

  function autoWalkInput(dt: number): { forward: number; side: number; sprint: boolean } | null {
    const w = autoWalk;
    if (!w || w.riding) return null;
    const dGoal = Math.hypot(w.goal.x - player.x, w.goal.z - player.z);
    if (dGoal <= w.arrive && (!levels.multi || currentLevel() === w.level)) {
      if (!w.legs.length) cancelWalk(null);
      else if (!nextLeg(w)) cancelWalk(new Error(S.unreachable));
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
    // open closed doors ahead (on the avatar's level); a locked one stays shut (the world model's lock)
    const here = levels.multi ? currentLevel() : level;
    for (const d of ctx.doors) {
      if (d.open || d.locked || d.level !== here) continue;
      const near = Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 2.6;
      if (near) {
        toggleDoor(d, true);
        w.route?.opened.add(d);
      }
    }
    // a world-model route closes the doors it opened once they are behind it (the world's doors stay as they were)
    if (w.route) closeDoorsBehind(w.route.opened);
    // progress watchdog: path length still to walk must shrink within 3 s of simulated walking
    // (wall-clock time and straight-line goal distance both misfire: slow frames, detours)
    const remaining = remainingPath(w);
    if (remaining < w.bestRemaining - 0.05) {
      w.bestRemaining = remaining;
      w.stall = 0;
      if (w.replanBase - remaining > 1) w.replans = 0;
    } else if ((w.stall += dt) > 3) {
      // blocked (an NPC stepped in, a door swung): re-plan from here, give up after 3 fruitless tries
      if (!replan(w)) {
        cancelWalk(new Error("stuck"));
        return null;
      }
    }
    const want = Math.atan2(-(wp.x - player.x), -(wp.z - player.z));
    let dy = want - yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    yaw += dy * Math.min(1, 0.18);
    pitch += (0 - pitch) * 0.1;
    return { forward: Math.abs(dy) < 1.2 ? 1 : 0.15, side: 0, sprint: Math.hypot(wp.x - player.x, wp.z - player.z) > 6 };
  }

  const NAV_RADIUS = PHYSICS.radius + 0.08;

  /**
   * Nav grid of one level of a multi-level facility: what stands in that level's walking space (its walls,
   * equipment and people, the flights and balustrades crossing it), heights relative to its floor; an
   * upper level is walkable only on its slabs (stairwells and the outside are void).
   */
  function levelNavGrid(lv: string): NavGrid {
    const e = levels.elevation(lv);
    const list: Aabb[] = [];
    for (const c of ctx.colliders.values()) {
      if (c.maxY <= e + 0.01 || c.minY >= e + PHYSICS.height) continue;
      const box: Aabb = { minX: c.minX, maxX: c.maxX, minY: c.minY - e, maxY: c.maxY - e, minZ: c.minZ, maxZ: c.maxZ };
      if (c.door) box.door = true;
      if (c.enabled === false) box.enabled = false;
      list.push(box);
    }
    const floors = lv === level ? undefined : (levelFloors.get(lv) ?? []);
    return buildNavGrid(walkBounds, list, { cell: 0.5, radius: NAV_RADIUS, ...(floors ? { floors } : {}) });
  }

  function planPath(goal: { x: number; z: number }, lv: string = level): { path: { x: number; z: number }[]; arrive: number } | null {
    navGrid = levels.multi ? levelNavGrid(lv) : buildNavGrid(walkBounds, ctx.colliders.values(), { cell: 0.5, radius: NAV_RADIUS });
    const path = findPath(navGrid, { x: player.x, z: player.z }, goal);
    if (!path || !path.length) return null;
    const end = path[path.length - 1];
    return { path, arrive: Math.max(1, Math.hypot(end.x - goal.x, end.z - goal.z) + 0.35) };
  }

  function replan(w: AutoWalk): boolean {
    if (w.replans >= 3) return false;
    w.replans++;
    let path: { x: number; z: number }[];
    if (w.fixed) path = w.fixed.filter((p, i) => i === w.fixed!.length - 1 || Math.hypot(p.x - player.x, p.z - player.z) > 0.35);
    else if (w.pathLeg) {
      // a world-model route: a local detour to its next point, then on along its points
      const rest = w.path.slice(Math.min(w.index, Math.max(0, w.path.length - 1)));
      if (!rest.length) return false;
      const p = planPath(rest[0], w.level);
      if (!p) return false;
      path = [...p.path, ...rest.slice(1)];
      if (w.route) w.route.detours++;
    } else {
      const p = planPath(w.goal, w.level);
      if (!p) return false;
      path = p.path;
      w.arrive = Math.max(w.arrive, p.arrive);
    }
    w.path = path;
    w.index = 0;
    w.stall = 0;
    w.bestRemaining = w.replanBase = remainingPath(w);
    return true;
  }

  /** Arrival radius of an intermediate leg (a flight's approach point, an elevator car): above the 0.35 waypoint radius. */
  const LEG_ARRIVE = 0.4;

  /** Start the next leg of a route; false when it cannot be planned. */
  function nextLeg(w: AutoWalk): boolean {
    const leg = w.legs.shift();
    if (!leg) return false;
    w.index = 0;
    w.replans = 0;
    w.stall = 0;
    w.bestRemaining = w.replanBase = Infinity;
    w.fixed = undefined;
    w.pathLeg = false;
    if (leg.kind === "path") {
      // the world model's points on this level (embodiment)
      w.level = leg.level;
      w.pathLeg = true;
      w.path = leg.points.map((p) => ({ ...p }));
      const end = w.path[w.path.length - 1];
      w.goal = { x: end.x, z: end.z };
      w.arrive = leg.final ? ROUTE_ARRIVE : LEG_ARRIVE;
      return true;
    }
    if (leg.kind === "ride") {
      w.riding = true;
      w.path = [];
      rideElevator(leg.connectorId, leg.level).then(
        () => {
          w.riding = false;
          if (autoWalk !== w) return;
          if (!w.legs.length) cancelWalk(null);
          else if (!nextLeg(w)) cancelWalk(new Error(S.unreachable));
        },
        (err: unknown) => {
          w.riding = false;
          if (autoWalk === w) cancelWalk(err instanceof Error ? err : new Error(String(err)));
        },
      );
      return true;
    }
    w.level = leg.level;
    if (leg.kind === "flight") {
      // a flight that starts where the avatar stands (a world route beginning at the stairs): from here
      if (leg.path.length < 2) leg.path = [{ x: player.x, z: player.z }, ...leg.path];
      w.fixed = leg.path;
      w.path = [...leg.path];
      w.goal = leg.path[leg.path.length - 1];
      w.arrive = LEG_ARRIVE;
      return true;
    }
    const plan = planPath(leg.goal, leg.level);
    if (!plan) return false;
    w.path = plan.path;
    w.goal = { x: leg.goal.x, z: leg.goal.z };
    w.arrive = leg.final ? plan.arrive : LEG_ARRIVE;
    return true;
  }

  function walkTo(target: WorldPoint, signal?: AbortSignal): Promise<void> {
    cancelWalk(new Error("superseded"));
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      if (disposed) {
        reject(new Error("disposed"));
        return;
      }
      const here = levels.multi ? currentLevel() : level;
      const to = levels.multi && target.level && levels.list.some((l) => l.id === target.level) ? target.level : levels.multi ? level : here;
      if (to === here && Math.hypot(target.x - player.x, target.z - player.z) <= 1) {
        resolve();
        return;
      }
      const goal = { x: target.x, z: target.z };
      const legs = routeLegs(levels.flights, elevators, here, to, { x: player.x, z: player.z }, goal);
      const w: AutoWalk = { path: [], index: 0, goal, arrive: 1, replans: 0, resolve, reject, stall: 0, bestRemaining: Infinity, replanBase: Infinity, signal, level: here, legs: legs ?? [] };
      if (!legs || !nextLeg(w)) {
        reject(new Error(S.unreachable));
        return;
      }
      if (signal) {
        w.onAbort = () => {
          if (autoWalk === w) cancelWalk(new DOMException("Aborted", "AbortError") as unknown as Error);
        };
        signal.addEventListener("abort", w.onAbort, { once: true });
      }
      autoWalk = w;
    });
  }

  /* ---------------- embodiment: the world model's routes, walking staff, carts, doors, camera ---------------- */
  // docs/EMBODIED.md §2: the renderer animates what the world model planned and committed (the browser
  // `Mover`), it never plans or decides itself. See embodiment.ts, walkers.ts, portable.ts, capture.ts.

  /** Kind of a facility connector (route legs: stairs and ramps are walked, elevators ridden). */
  const connectorKind = (id: string) => (facility.connectors ?? []).find((c) => c.id === id)?.kind ?? null;

  /** Is (x, z) in a door's doorway area (± a body radius)? */
  function inDoorway(d: DoorRecord, x: number, z: number, r: number = PHYSICS.radius): boolean {
    const a = d.area;
    return x + r > a.minX && x - r < a.maxX && z + r > a.minZ && z - r < a.maxZ;
  }

  /** Is anybody (the player, a walking or standing NPC) in a doorway — `except` left out? */
  function doorwayOccupied(d: DoorRecord, except: NpcRecord | null): boolean {
    if ((!levels.multi || d.level === currentLevel()) && inDoorway(d, player.x, player.z)) return true;
    for (const n of ctx.npcs.values()) if (n !== except && n.level === d.level && inDoorway(d, n.x, n.z, 0.35)) return true;
    return false;
  }

  /** Close the doors a world-model walk opened once the avatar is past them and nobody stands in them. */
  function closeDoorsBehind(opened: Set<DoorRecord>): void {
    for (const d of [...opened]) {
      if ((!levels.multi || d.level === currentLevel()) && Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 3) continue;
      if (doorwayOccupied(d, null)) continue;
      if (d.open) toggleDoor(d, false);
      opened.delete(d);
    }
  }

  /** The avatar's pose in the world model's convention (feet height, yaw 0 → −Z). */
  function avatarPose(): BodyPose {
    return { x: player.x, y: player.y, z: player.z, yaw, pitch, level: levels.multi ? currentLevel() : level };
  }

  /**
   * Walk the avatar along a world-model route (`WorldApi.followRoute`): the existing auto-walk machinery
   * (doors, stalls, flights, elevator rides) on legs built from the route's own points.
   */
  function followRoute(route: RoutePoint[], opts: { yaw?: number; signal?: AbortSignal } = {}): Promise<BodyMove> {
    cancelWalk(new Error("superseded"));
    return new Promise<BodyMove>((resolve) => {
      const here = levels.multi ? currentLevel() : level;
      const tracker = { opened: new Set<DoorRecord>(), detours: 0 };
      let done = false;
      const finish = (arrived: boolean) => {
        if (done) return;
        done = true;
        if (arrived) {
          // settle exactly on the planned spot (a free cell centre) and face the target
          const end = route[route.length - 1];
          if (end && end.level === (levels.multi ? currentLevel() : level) && Math.hypot(end.x - player.x, end.z - player.z) <= ROUTE_ARRIVE + 0.1) {
            player.x = end.x;
            player.z = end.z;
          }
          if (opts.yaw !== undefined && Number.isFinite(opts.yaw)) {
            yaw = opts.yaw;
            pitch = 0;
          }
          camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
          camera.rotation.set(pitch, yaw, 0);
        }
        resolve({ arrived, pose: avatarPose(), replans: tracker.detours });
      };
      if (opts.signal?.aborted || disposed) {
        finish(false);
        return;
      }
      const legs = worldRouteLegs(route, here, connectorKind);
      if (!legs.length) {
        finish(true);
        return;
      }
      const w: AutoWalk = {
        path: [],
        index: 0,
        goal: { x: player.x, z: player.z },
        arrive: ROUTE_ARRIVE,
        replans: 0,
        resolve: () => finish(true),
        reject: () => finish(false),
        stall: 0,
        bestRemaining: Infinity,
        replanBase: Infinity,
        signal: opts.signal,
        level: here,
        legs,
        route: tracker,
      };
      if (!nextLeg(w)) {
        finish(false);
        return;
      }
      if (opts.signal) {
        w.onAbort = () => {
          if (autoWalk === w) cancelWalk(new DOMException("Aborted", "AbortError") as unknown as Error);
        };
        opts.signal.addEventListener("abort", w.onAbort, { once: true });
      }
      autoWalk = w;
    });
  }

  /** Staff NPCs walking world-model routes (delegated tasks). */
  const walkers = new StaffWalkers({
    elevation: (lv) => levels.elevation(lv),
    levelRoot: (lv) => levelRoots.get(lv) ?? root,
    connectorKind,
    doors: () => ctx.doors,
    // a door far from the player opens without a sound
    setDoorOpen: (d, open) => toggleDoor(d, open, Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 8),
    doorwayOccupied,
    addBody: (x, z, elevation, lv) => {
      const b = staffBodyBox(x, z);
      const box = ctx.colliders.add({ ...b, minY: b.minY + elevation, maxY: b.maxY + elevation });
      colliderLevels.set(box, lv);
      return box;
    },
    removeCollider: (box) => ctx.colliders.remove(box),
    post: (n) => {
      const st = (facility.staff ?? []).find((s) => s.id === n.id);
      return st ? { x: st.x, z: st.z, rot: MathUtils.degToRad(st.rot ?? 0), level: entityLevel(facility, st) } : null;
    },
    markShadows,
  });

  /** Moving portable placements (carts) to where the world model has them. */
  const portableHost: PortableHost = {
    ctx,
    levelRoot: (lv) => levelRoots.get(lv) ?? root,
    elevation: (lv) => levels.elevation(lv),
    addCollider: (box, lv) => {
      const b = ctx.colliders.add(box);
      colliderLevels.set(b, lv);
      return b;
    },
    removeCollider: (box) => ctx.colliders.remove(box),
    markShadows,
  };

  /** Draw the carts being pushed in front of their walkers (each frame while any is pushed). */
  function dragPushed(): void {
    for (const rec of ctx.portables.values()) {
      if (!rec.pushedBy) continue;
      if (rec.pushedBy === "avatar") dragPortable(portableHost, rec, player.x, player.z, yaw, levels.multi ? currentLevel() : level);
      else {
        const n = ctx.npcs.get(`staff:${rec.pushedBy}`);
        if (n) dragPortable(portableHost, rec, n.x, n.z, yawOfRig(n.rig.root.rotation.y), n.level);
      }
    }
  }

  /** A door record by renderer id (`door:` prefix accepted). */
  const doorById = (id: string) => ctx.doors.find((d) => d.id === (id.startsWith("door:") ? id.slice("door:".length) : id)) ?? null;

  /* ---------------- interior detail culling ---------------- */
  // Signs, live screens, interior door leaves and NPCs inside a building are only drawn while the
  // camera is inside that building or within DETAIL_RANGE of them: from outside, walls and the roof
  // hide them anyway (frustum culling cannot know that), and they were most of the draw calls of
  // outdoor views of a large hospital.
  const DETAIL_RANGE = 25;
  const buildingRects = facility.buildings.map((bb) => bb.rect);
  const buildingAt = (x: number, z: number) => buildingRects.findIndex((r) => Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2);
  // Levels (multi-level facilities): indoors, only the camera's level is drawn (and the levels a nearby
  // stairwell joins it to); outdoors every level is (the building's upper storeys are its facade). The
  // default level's static batch is never hidden, its details and NPCs are.
  interface Detail {
    obj: Object3D;
    x: number;
    z: number;
    building: number;
    level: string;
  }
  const details: Detail[] = [];
  const addDetail = (obj: Object3D, x: number, z: number, lv: string) => {
    const bi = buildingAt(x, z);
    if (bi >= 0) details.push({ obj, x, z, building: bi, level: lv });
  };
  for (const [lv, g] of levelRoots) for (const o of g.children) if (o.name === "sign") addDetail(o, o.position.x, o.position.z, lv);
  for (const sc of ctx.screens) addDetail(sc.mesh, sc.x, sc.z, sc.level);
  for (const d of ctx.doors) if (d.interior) for (const l of d.leaves) addDetail(l.pivot, d.centre.x, d.centre.z, d.level);
  function cullDetails(force = false): void {
    if (!details.length && !ctx.npcs.size && !levels.multi) return;
    const cx = camera.position.x, cz = camera.position.z;
    const camLevel = levels.at(player.y);
    if (!force && detailAt && detailAt.level === camLevel && Math.hypot(cx - detailAt.x, cz - detailAt.z) < 0.75) return;
    detailAt = { x: cx, z: cz, level: camLevel };
    const inside = buildingAt(cx, cz);
    const levelShown = (lv: string) => levels.visibleFrom(lv, camLevel, cx, cz, inside >= 0);
    const show = (bi: number, x: number, z: number, lv: string) => levelShown(lv) && (bi < 0 || bi === inside || Math.hypot(x - cx, z - cz) < DETAIL_RANGE);
    let changed = false;
    const set = (o: Object3D, v: boolean) => {
      if (o.visible === v) return;
      o.visible = v;
      changed = true;
    };
    for (const [lv, g] of levelRoots) if (g !== root) set(g, levelShown(lv));
    for (const d of details) set(d.obj, show(d.building, d.x, d.z, d.level));
    for (const n of ctx.npcs.values()) set(n.rig.root, !walkers.riding(n.id) && show(buildingAt(n.x, n.z), n.x, n.z, n.level));
    // portable placements are drawn where they stand now (and not while carried)
    for (const pr of ctx.portables.values()) set(pr.group, !pr.hidden && show(buildingAt(pr.x, pr.z), pr.x, pr.z, pr.level));
    // hidden casters were left out of the cached shadow map
    if (changed) markShadows();
  }

  /** Culling of the NPCs walking now (they move without the camera moving). */
  function cullWalkers(): void {
    const cx = camera.position.x, cz = camera.position.z;
    const camLevel = levels.at(player.y);
    const inside = buildingAt(cx, cz);
    for (const n of walkers.walking()) {
      const bi = buildingAt(n.x, n.z);
      const shown = !walkers.riding(n.id) && levels.visibleFrom(n.level, camLevel, cx, cz, inside >= 0) && (bi < 0 || bi === inside || Math.hypot(n.x - cx, n.z - cz) < DETAIL_RANGE);
      if (n.rig.root.visible !== shown) n.rig.root.visible = shown;
    }
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
    markShadows();
    assignLights(player.x, player.z, true, player.y);
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
    if (typeof document !== "undefined" && document.hidden) {
      lastFrame = now;
      return;
    }
    if (!playing() && !autoWalk && !ride && !walkers.active && now - lastFrame < PAUSED_FRAME_MS) return;
    const realDt = Math.max(0, (now - lastFrame) / 1000);
    const dt = Math.min(PHYSICS.maxDt, realDt);
    lastFrame = now;
    const s = settings();
    if (now - qualityCheck > 1000) {
      qualityCheck = now;
      applyQuality();
    }
    // autopilot (walk_to) runs even while paused / before start(): a panel may be open
    // while the agent walks the learner somewhere; user input stays blocked (playing()).
    const walking = autoWalk ? autoWalkInput(frozen ? 0 : dt) : null;
    updateRide(Math.min(realDt, 1)); // an animation, not physics: real time (slow frames do not stretch the ride)
    if (playing() || walking) {
      const px = player.x, pz = player.z;
      const sprint = walking ? walking.sprint : !!keys.ShiftLeft || !!keys.ShiftRight;
      const input = walking
        ? { forward: walking.forward, side: 0, yaw, sprint, jump: false }
        : { forward: (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), side: (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), yaw, sprint, jump: !!keys.Space };
      if (!frozen && !ride) stepPlayer(player, input, dt, nearbyColliders(), walkBounds);
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
          const lv = levels.multi ? currentLevel() : null;
          // the level's name is shown indoors (outdoors is the ground anyway)
          const levelInfo = lv ? (buildingAt(player.x, player.z) >= 0 ? { level: lv, levelName: levels.name(lv, locale) } : { level: lv }) : {};
          callbacks.onMove({ x: player.x, z: player.z, yaw, region: r.name, roomId: r.roomId, moving: moved > 0.001, ...levelInfo });
        }
      }
    } else {
      camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
      camera.rotation.set(pitch, yaw, 0);
    }
    // staff walking world-model routes (delegated tasks): an animation, real time
    if (walkers.update(Math.min(realDt, 0.25))) cullWalkers();
    dragPushed();
    if (animateDoors(ctx.doors, dt)) markShadows();
    followSun(player.x, player.z);
    assignLights(player.x, player.z, false, player.y);
    cullDetails();
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
  const toMapWall = (w: WallRecord): MapWall => {
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
  };
  const matColor = (id: string, fb: string) => merged.materials.get(id)?.color ?? fb;
  /** Stairs/ramp flights and elevator cars on a level (map symbols of a multi-level facility). */
  function mapConnectors(lv: string, loc: string): MapConnector[] {
    const SL = strings(loc);
    const out: MapConnector[] = [];
    for (const fl of levels.flights) {
      if (fl.foot.level !== lv && fl.head.level !== lv) continue;
      const a = fl.area;
      out.push({ kind: fl.kind === "ramp" ? "ramp" : "stairs", x: (a.minX + a.maxX) / 2, z: (a.minZ + a.maxZ) / 2, w: a.maxX - a.minX, d: a.maxZ - a.minZ, axis: fl.surface.axis, label: SL.stairs });
    }
    for (const el of elevators) {
      const s = stopOn(el, lv);
      if (!s) continue;
      const r = s.room?.rect ?? { x: s.x, z: s.z, w: 2, d: 2 };
      out.push({ kind: "elevator", x: r.x, z: r.z, w: r.w, d: r.d, label: el.name });
    }
    return out;
  }
  /** Static map layers per locale and level (drawMap may run every frame for the minimap). */
  const mapCache = new Map<string, Omit<MapData, "slots">>();
  function mapData(loc: string, lv: string): MapData {
    const key = `${loc}|${lv}`;
    let data = mapCache.get(key);
    if (!data) {
      const SL = strings(loc);
      data = {
        bounds: facility.bounds,
        ground: facility.terrain?.ground ?? "grass",
        paths: (facility.terrain?.paths ?? []).map((p) => ({ ...p, color: p.material && p.material !== "path" ? matColor(p.material, "#ded0a4") : "#ded0a4" })),
        ponds: facility.terrain?.ponds ?? [],
        trees: facility.terrain?.trees ?? [],
        buildZone: facility.buildZone?.rect ?? null,
        buildZoneLabel: SL.buildZone,
        buildings: facility.buildings.filter((bb) => buildingLevels(facility, bb).includes(lv)).map((bb) => ({ ...bb.rect, name: tx(bb.name, loc) })),
        rooms: facility.rooms.filter((r) => roomLevel(facility, r) === lv).map((r) => ({ ...r.rect, name: tx(r.name, loc), kind: r.kind })),
        walls: walls.filter((w) => w.level === lv).map(toMapWall),
        placements: [...ctx.placements.values()].filter((p) => p.level === lv).map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d, kind: p.kind, solid: p.solid, label: p.label })),
        staff: [],
        northLabel: SL.north,
        ...(levels.multi ? { connectors: mapConnectors(lv, loc), levelLabel: levels.name(lv, loc) } : {}),
      };
      mapCache.set(key, data);
    }
    return {
      ...data,
      // actors where they are now (staff walk when delegated; a walking one is highlighted)
      staff: [...ctx.npcs.values()]
        .filter((n) => n.kind === "staff" && n.level === lv)
        .map((n) => ({ x: n.x, z: n.z, label: n.label, ...(walkers.busy(n.id) ? { moving: true } : {}) })),
      slots: facility.patientSlots
        .filter((sl) => entityLevel(facility, sl) === lv)
        .map((sl) => {
          const npc = ctx.npcs.get(`patient:${sl.id}`);
          return { x: npc?.x ?? sl.x, z: npc?.z ?? sl.z, occupied: patients.has(sl.id), label: patients.get(sl.id)?.name ?? sl.id };
        }),
    };
  }

  /* ---------------- API ---------------- */
  function locate(id: string): (WorldPoint & { label: string }) | null {
    // the level is reported in a multi-level facility only (single-level results are unchanged)
    const at = (x: number, z: number, label: string, lv: string) => (levels.multi ? { x, z, label, level: lv } : { x, z, label });
    const p = ctx.placements.get(id);
    if (p) return at(p.x, p.z, p.label, p.level);
    const sl = facility.patientSlots.find((s) => s.id === id);
    if (sl) {
      const npc = ctx.npcs.get(`patient:${id}`);
      return at(npc?.x ?? sl.x, npc?.z ?? sl.z, patients.get(id)?.name ?? S.patient, entityLevel(facility, sl));
    }
    const st = (facility.staff ?? []).find((s) => s.id === id);
    if (st) return at(st.x, st.z, `${roleName(st.role, locale)} · ${tx(st.name, locale)}`, entityLevel(facility, st));
    const room = facility.rooms.find((r) => r.id === id);
    if (room) return at(room.rect.x, room.rect.z, tx(room.name, locale), roomLevel(facility, room));
    const bl = facility.buildings.find((r) => r.id === id);
    if (bl) return at(bl.rect.x, bl.rect.z, tx(bl.name, locale), level);
    if (id === "spawn") return at(spawn.x, spawn.z, "spawn", level);
    return null;
  }

  function teleportTo(x: number, z: number, y = 0, newYaw?: number, newPitch?: number): void {
    // standing on a floor (the ground or a level's slab) counts as grounded
    const onFloor = y <= 0 || (levels.multi && Math.abs(y - levels.elevation(levels.at(y))) < 0.01);
    Object.assign(player, { x, z, y, vy: 0, grounded: onFloor });
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
      cancelRide(new Error("reset"));
      teleportTo(spawn.x, spawn.z, 0, spawn.yaw ?? 0, 0);
      for (const d of ctx.doors) {
        setDoorOpen(d, false, locale);
        for (const l of d.leaves) {
          if (l.mode === "swing") l.pivot.rotation.y = 0;
          else l.pivot.position.x = l.baseX ?? 0;
        }
      }
      markShadows();
    },
    teleport(x: number, z: number, newYaw?: number, lv?: string) {
      cancelWalk(new Error("teleported"));
      cancelRide(new Error("teleported"));
      teleportTo(x, z, levels.elevation(lv ?? level), newYaw);
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
      if (state.distressed != null) cur.distressed = state.distressed;
      // (re)apply the skin tint: a rebuilt rig (posture/accessory change) starts with plain skin
      setDistressed(cur.rig, cur.distressed);
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
      beacon.position.set(target.x, levels.elevation(target.level ?? level), target.z);
      if (target.label) {
        beaconLabel = signs.make(target.label, Math.min(3.2, Math.max(1.8, target.label.length * 0.32)), "#c68836");
        beacon.add(beaconLabel);
      }
    },
    walkTo,
    drawMap(target, o) {
      const c2d = target.getContext("2d");
      if (!c2d) return;
      const here = levels.multi ? currentLevel() : level;
      const lv = o.level && levels.list.some((l) => l.id === o.level) ? o.level : here;
      const wp = o.waypoint ?? (waypoint ? { x: waypoint.x, z: waypoint.z, level: waypoint.level } : null);
      paintMap(c2d, target.width, target.height, mapData(o.locale || locale, lv), {
        big: o.big,
        waypoint: wp ? { x: wp.x, z: wp.z } : null,
        player: { x: player.x, z: player.z, yaw },
        timeMs: performance.now(),
        // the avatar / destination on another floor than the one shown: drawn faded
        ...(lv !== here ? { playerGhost: true } : {}),
        ...(wp && levels.multi && (wp.level ?? level) !== lv ? { waypointGhost: true } : {}),
      });
    },
    locate,
    levels(loc?: string) {
      return levels.list.map((l) => ({ id: l.id, name: levels.name(l.id, loc || locale), elevation: l.elevation }));
    },
    rideElevator,
    followRoute,
    walkStaff(staffId, route, o = {}) {
      const n = ctx.npcs.get(`staff:${staffId.replace(/^staff:/, "")}`);
      if (!n) return Promise.resolve({ arrived: route.length === 0, pose: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, level }, replans: 0 });
      return walkers.start(n, route, o);
    },
    placeStaff(staffId, pose) {
      const n = ctx.npcs.get(`staff:${staffId.replace(/^staff:/, "")}`);
      if (!n) return;
      walkers.place(n, pose);
      detailAt = null;
    },
    staffPose(staffId) {
      const n = ctx.npcs.get(`staff:${staffId.replace(/^staff:/, "")}`);
      return n ? walkers.pose(n) : null;
    },
    placeEquipment(placementId, at) {
      const rec = ctx.portables.get(placementId.replace(/^eq:/, ""));
      if (!rec) return;
      placePortable(portableHost, rec, at);
      mapCache.clear(); // map dots of moved carts
      detailAt = null;
    },
    pushEquipment(placementId, by) {
      const rec = ctx.portables.get(placementId.replace(/^eq:/, ""));
      if (!rec) return;
      pushPortable(portableHost, rec, by);
      if (by) dragPushed();
      markShadows();
    },
    setDoor(doorId, open) {
      const d = doorById(doorId);
      if (!d || d.open === open) return;
      if (open && d.locked) return;
      // never shut a leaf on the player
      if (!open && doorwayOccupied(d, null)) return;
      toggleDoor(d, open, Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 8);
    },
    setDoorLocked(doorId, locked) {
      const d = doorById(doorId);
      if (!d) return;
      d.locked = locked || undefined;
      if (locked && d.open && !doorwayOccupied(d, null)) toggleDoor(d, false, Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 8);
    },
    captureFrame(o) {
      camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
      camera.rotation.set(pitch, yaw, 0);
      camera.updateMatrixWorld();
      const shot = captureJpeg(renderer, scene, camera, o.maxWidth, o.quality);
      if (!shot) return null;
      return { mimeType: "image/jpeg", ...shot, pose: { x: player.x, y: player.y + PHYSICS.eye, z: player.z, yaw, pitch, level: levels.multi ? currentLevel() : level } };
    },
    screenshot() {
      renderer.render(scene, camera);
      return canvas.toDataURL("image/png");
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      cancelWalk(new Error("disposed"));
      cancelRide(new Error("disposed"));
      walkers.stopAll();
      for (const [t, type, fn, o] of listeners) t.removeEventListener(type, fn, o);
      ro?.disconnect();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      scene.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.geometry && !isSharedGeometry(mesh.geometry)) mesh.geometry.dispose();
        const m = mesh.material as Material | Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m && !lib.has(m.name)) m.dispose();
        if ((o as InstancedMesh).isInstancedMesh) (o as InstancedMesh).dispose();
      });
      for (const sc of ctx.screens) sc.texture.dispose();
      for (const t of ctx.ownedTextures) t.dispose();
      modelCache?.dispose();
      // animated parts use per-part clones that keep the library name (skipped above)
      for (const a of ctx.animated) a.material.dispose();
      for (const p of particles) p.m.removeFromParent();
      particles.length = 0;
      sun.shadow.dispose(); // shadow-map render target (not released by renderer.dispose)
      lib.dispose();
      signs.dispose();
      // UNIT_BOX / UNIT_PLANE are module-shared: dispatching "dispose" frees this renderer's buffers and
      // drops its listeners (otherwise every disposed world stays reachable); the next world re-uploads them.
      releaseSharedGeometry();
      renderer.dispose();
      // The next world reuses this canvas' WebGL context, which keeps its pixel-store state: a
      // leftover UNPACK_FLIP_Y (from the last canvas-texture upload) made the new renderer's empty
      // 3D/array textures log "texImage3D: FLIP_Y or PREMULTIPLY_ALPHA isn't allowed" warnings.
      const gl = renderer.getContext();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    },
    get position() {
      return { x: player.x, y: player.y, z: player.z, yaw, pitch, level: levels.multi ? currentLevel() : level };
    },
    debug: {
      get player() {
        return player;
      },
      camera,
      scene,
      renderer,
      colliders: ctx.colliders,
      /** The facility's collision model (@clinicalcraft/world): the source of every collider above. */
      collision,
      /** Levels (elevations, flights, culling rules) and the group each non-default level is built into. */
      levels,
      levelRoots,
      /** Level the avatar stands on. */
      get level() {
        return levels.multi ? currentLevel() : level;
      },
      /** Elevators: cars (rooms), doors and stops per level. */
      elevators,
      /** Equipment models: placements requested, loaded and failed (voxel parts kept). */
      models: modelState,
      rideElevator,
      /** Current elevator ride (QA): phase and destination level. */
      get ride() {
        return ride ? { phase: ride.phase, from: ride.from.level, to: ride.to.level } : null;
      },
      placed,
      doors: ctx.doors,
      targets: ctx.targets,
      npcs: ctx.npcs,
      /** Portable placements (carts, items): their groups, where they are drawn, hidden while carried. */
      portables: ctx.portables,
      /** Staff ids walking world-model routes now. */
      get walkingStaff() {
        return walkers.walking().map((n) => n.id);
      },
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
      /** Current autopilot state (QA): path, waypoint index, goal, re-plans. */
      get walk() {
        return autoWalk
          ? { path: autoWalk.path, index: autoWalk.index, goal: autoWalk.goal, arrive: autoWalk.arrive, replans: autoWalk.replans, level: autoWalk.level, legs: autoWalk.legs.length, riding: !!autoWalk.riding }
          : null;
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
      /**
       * Draw calls of one frame from the current camera. renderer.info resets after the shadow pass,
       * so `steady` (= renderer.info.render.calls) never includes it; `shadowPass` is measured
       * separately (it only runs when the shadow map is refreshed: doors, blocks, NPC rebuilds,
       * shadow-box moves).
       */
      drawCalls() {
        followSun(player.x, player.z);
        assignLights(player.x, player.z, true, player.y);
        camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
        cullDetails(true);
        const info = renderer.info;
        info.autoReset = false;
        info.reset();
        renderer.shadowMap.needsUpdate = true;
        renderer.render(scene, camera);
        const withShadows = info.render.calls;
        info.reset();
        renderer.render(scene, camera);
        const steady = info.render.calls;
        const triangles = info.render.triangles;
        info.autoReset = true;
        return { steady, shadowPass: withShadows - steady, withShadows, triangles };
      },
      stats() {
        return {
          draws: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          colliders: ctx.colliders.size,
          pickables: ctx.pickables.length,
          instanced: staticMeshes.reduce((a, m) => a + m.count, 0) + groundMeshes.reduce((a, m) => a + m.count, 0),
          pointLights: ctx.realLights.length,
          lightCandidates: ctx.lights.length,
          /** Milliseconds createWorld took (scene, colliders, NPCs; excludes the first render). */
          buildMs: Math.round(buildMs),
          levels: levels.list.length,
        };
      },
    },
  };
  const buildMs = performance.now() - buildStart;
  return api;
};

export default createWorld;
