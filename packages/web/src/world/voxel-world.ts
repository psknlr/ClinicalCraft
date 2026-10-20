/**
 * VoxelWorld — what one `createWorld` call (index.ts) shares between the parts of the voxel world: the options,
 * the stage, the facility as built, the avatar and the flags the parts read and write, and the parts
 * themselves, which reach each other through it. The constructor builds the parts in the order of the V4
 * builder — three.js orders draws by object and material ids, which follow creation order:
 *
 * stage.ts (renderer, scene, camera, sun, the point-light pool) → facility-build.ts (the facility, its
 * equipment models) → people.ts (patients and staff) → blocks.ts (the build zone, hotbar blocks) →
 * overlay.ts (hand, highlight, waypoint beacon) → the avatar → interaction.ts (aim, `E`) → input.ts →
 * doors.ts, rides.ts (elevator rides), autowalk.ts (`walkTo`, `followRoute`) → walking staff (walkers.ts),
 * carts.ts → culling.ts (interior detail culling) → frame-loop.ts → map-data.ts (the map, `locate`);
 * qa.ts is the `debug` object.
 */
import { MathUtils, type Group, type InstancedMesh, type Material, type Mesh } from "three";
import { entityLevel, type FacilityDefinition } from "@clinicalcraft/core";
import { staffBodyBox, type CollisionModel } from "@clinicalcraft/world";
import type { WorldCallbacks, WorldOptions, WorldSettings } from "../contracts.js";
import { AutoWalker } from "./autowalk.js";
import { BuildZone } from "./blocks.js";
import { Carts } from "./carts.js";
import type { BuildContext } from "./context.js";
import { DetailCulling } from "./culling.js";
import { Doors } from "./doors.js";
import type { Elevator } from "./elevator.js";
import { buildFacility, EquipmentModels } from "./facility-build.js";
import { FrameLoop } from "./frame-loop.js";
import { InputControls } from "./input.js";
import { Interaction } from "./interaction.js";
import type { WorldLevels } from "./levels.js";
import { MapLayers } from "./map-data.js";
import type { MaterialLibrary, MergedCatalogs } from "./materials.js";
import { Overlay } from "./overlay.js";
import { People } from "./people.js";
import { clampPitch, PHYSICS, type Aabb, type PlayerState } from "./physics.js";
import { ElevatorRides } from "./rides.js";
import type { SignFactory } from "./signs.js";
import { LightPool, Stage } from "./stage.js";
import { strings } from "./strings.js";
import type { WallRecord } from "./structures.js";
import { isSharedGeometry, releaseSharedGeometry } from "./voxels.js";
import { StaffWalkers } from "./walkers.js";

/** The app's settings, or defaults when its getter fails or returns nothing. */
function safeSettings(get: () => WorldSettings): WorldSettings {
  try {
    const s = get();
    if (s) return s;
  } catch {
    /* fall through */
  }
  return { sound: true, bob: true, pointer: true, sensitivity: 1, quality: "high", locale: "zh-CN" };
}

/** The voxel world of one `createWorld` call (see the module docs). */
export class VoxelWorld {
  readonly opts: WorldOptions;
  readonly canvas: HTMLCanvasElement;
  readonly facility: FacilityDefinition;
  readonly callbacks: WorldCallbacks;
  /** The app's settings, read on every frame. */
  readonly settings: () => WorldSettings;
  readonly locale: string;
  /** World-level strings (toasts, hints) in the world's language. */
  readonly S: ReturnType<typeof strings>;
  readonly stage: Stage;

  /* the facility as built (facility-build.ts) */
  readonly merged: MergedCatalogs;
  readonly lib: MaterialLibrary;
  readonly signs: SignFactory;
  readonly collision: CollisionModel;
  readonly levels: WorldLevels;
  /** The default level (terrain, outdoors, ground floor). */
  readonly level: string;
  readonly colliderLevels: WeakMap<Aabb, string>;
  readonly levelFloors: Map<string, { minX: number; maxX: number; minZ: number; maxZ: number }[]>;
  readonly levelRoots: Map<string, Group>;
  readonly ctx: BuildContext;
  readonly clouds: Group;
  readonly walls: WallRecord[];
  readonly elevators: Elevator[];
  readonly groundMeshes: InstancedMesh[];
  readonly staticMeshes: InstancedMesh[];
  readonly models: EquipmentModels;
  readonly spawn: NonNullable<FacilityDefinition["spawn"]>;
  readonly lights: LightPool;

  readonly culling: DetailCulling;
  readonly people: People;
  readonly blocks: BuildZone;
  readonly overlay: Overlay;

  /* the avatar */
  readonly player: PlayerState;
  yaw: number;
  pitch: number;
  /** Where the player may walk (the facility's bounds). */
  readonly walkBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  started = false;
  paused = true;
  /** Physics frozen (QA camera positions in mid-air) while aiming keeps working. */
  frozen = false;
  disposed = false;
  /** Keys held down (`KeyboardEvent.code`). */
  keys: Record<string, boolean> = {};
  /** Hotbar slot (V4: 0 talk, 1 journal, 2 map, 3–6 blocks, 7 inventory, 8 help). */
  slot = 0;
  /** The hand's swing after mining or placing a block (1 → 0). */
  swing = 0;

  readonly loop: FrameLoop;
  readonly interaction: Interaction;
  readonly input: InputControls;
  readonly doors: Doors;
  readonly rides: ElevatorRides;
  readonly walk: AutoWalker;
  /** Staff NPCs walking world-model routes (delegated tasks). */
  readonly walkers: StaffWalkers;
  readonly carts: Carts;
  readonly map: MapLayers;

  constructor(opts: WorldOptions) {
    this.opts = opts;
    const { canvas, facility, callbacks } = opts;
    this.canvas = canvas;
    this.facility = facility;
    this.callbacks = callbacks;
    this.settings = () => safeSettings(opts.settings);
    const initial = this.settings();
    this.locale = initial.locale || "zh-CN";
    this.S = strings(this.locale);

    /* ---------------- renderer / scene (V4 Ld) ---------------- */
    this.stage = new Stage(canvas, facility, initial.quality ?? "high");

    /* ---------------- build ---------------- */
    const built = buildFacility(opts, this.stage, this.locale);
    this.merged = built.merged;
    this.lib = built.lib;
    this.signs = built.signs;
    this.collision = built.collision;
    this.levels = built.levels;
    this.level = built.level;
    this.colliderLevels = built.colliderLevels;
    this.levelFloors = built.levelFloors;
    this.levelRoots = built.levelRoots;
    this.ctx = built.ctx;
    this.clouds = built.clouds;
    this.walls = built.walls;
    this.elevators = built.elevators;
    this.groundMeshes = built.groundMeshes;
    this.staticMeshes = built.staticMeshes;

    /* ---------------- equipment models (GLB/glTF, EMBODIED §11) ---------------- */
    this.models = new EquipmentModels(this);

    /* ---------------- point lights ---------------- */
    this.spawn = facility.spawn ?? { x: 0, z: 0, yaw: 0 };
    this.lights = new LightPool(this);
    this.lights.assign(this.spawn.x, this.spawn.z, true);

    /* ---------------- NPCs (a rebuilt rig invalidates the interior culling) ---------------- */
    this.culling = new DetailCulling(this);
    this.people = new People(this);

    /* ---------------- build zone (V4) ---------------- */
    this.blocks = new BuildZone(this);

    /* ---------------- hand, highlight, beacon ---------------- */
    this.overlay = new Overlay(this);

    /* ---------------- player state ---------------- */
    const spawn = this.spawn;
    const b = facility.bounds;
    const player: PlayerState = { x: spawn.x, y: 0, z: spawn.z, vy: 0, grounded: true };
    this.player = player;
    this.yaw = spawn.yaw ?? 0;
    this.pitch = 0;
    this.walkBounds = { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ };
    const saved = opts.saved;
    if (saved && saved.facilityId === facility.id && Array.isArray(saved.position) && saved.position.every(Number.isFinite)) {
      const [x, y, z] = saved.position;
      const levels = this.levels;
      const top = levels.list.length ? levels.list[levels.list.length - 1].elevation : 0;
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && y >= 0 && y < top + 8) Object.assign(player, { x, y, z });
      if (Number.isFinite(saved.yaw)) this.yaw = saved.yaw;
      if (Number.isFinite(saved.pitch)) this.pitch = clampPitch(saved.pitch ?? 0);
    }
    this.loop = new FrameLoop(this);
    const camera = this.stage.camera;
    camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
    camera.rotation.set(this.pitch, this.yaw, 0);

    /* ---------------- aiming (V4 Ne), input (V4) ---------------- */
    this.interaction = new Interaction(this);
    this.input = new InputControls(this);

    /* ---------------- doors, elevator rides, auto-walk (walk_to) ---------------- */
    this.doors = new Doors(this);
    this.rides = new ElevatorRides(this);
    this.walk = new AutoWalker(this);

    /* ---------------- embodiment: walking staff, carts (docs/EMBODIED.md §2) ---------------- */
    // The renderer animates what the world model planned and committed (the browser `Mover`), it never
    // plans or decides itself. See embodiment.ts, walkers.ts, portable.ts, capture.ts.
    const { ctx, levels, levelRoots, colliderLevels, stage } = this;
    this.walkers = new StaffWalkers({
      elevation: (lv) => levels.elevation(lv),
      levelRoot: (lv) => levelRoots.get(lv) ?? stage.root,
      connectorKind: this.walk.connectorKind,
      doors: () => ctx.doors,
      // a door far from the player opens without a sound
      setDoorOpen: (d, open) => this.doors.toggle(d, open, Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 8),
      doorwayOccupied: (d, except) => this.doors.doorwayOccupied(d, except),
      addBody: (x, z, elevation, lv) => {
        const bb = staffBodyBox(x, z);
        const box = ctx.colliders.add({ ...bb, minY: bb.minY + elevation, maxY: bb.maxY + elevation });
        colliderLevels.set(box, lv);
        return box;
      },
      removeCollider: (box) => ctx.colliders.remove(box),
      post: (n) => {
        const st = (facility.staff ?? []).find((s) => s.id === n.id);
        return st ? { x: st.x, z: st.z, rot: MathUtils.degToRad(st.rot ?? 0), level: entityLevel(facility, st) } : null;
      },
      markShadows: stage.markShadows,
    });
    this.carts = new Carts(this);

    /* ---------------- interior detail culling, frame loop ---------------- */
    this.culling.collect();
    this.loop.start();

    /* ---------------- map data (static) ---------------- */
    this.map = new MapLayers(this);
  }

  /** Is the player playing (started, not paused)? Input and the frame's physics only run then. */
  playing(): boolean {
    return this.started && !this.paused;
  }

  /** Level the avatar stands on (half-way up a flight is still the lower one). */
  currentLevel(): string {
    return this.levels.at(this.player.y);
  }

  /** A toast (title and body). */
  toast(pair: readonly [string, string] | readonly string[]): void {
    this.callbacks.onToast(pair[0], pair[1]);
  }

  /** Put the avatar at (x, y, z), optionally facing `newYaw` / `newPitch`, and the camera with it. */
  teleportTo(x: number, z: number, y = 0, newYaw?: number, newPitch?: number): void {
    const { player, levels } = this;
    const camera = this.stage.camera;
    // standing on a floor (the ground or a level's slab) counts as grounded
    const onFloor = y <= 0 || (levels.multi && Math.abs(y - levels.elevation(levels.at(y))) < 0.01);
    Object.assign(player, { x, z, y, vy: 0, grounded: onFloor });
    if (newYaw != null && Number.isFinite(newYaw)) this.yaw = newYaw;
    if (newPitch != null && Number.isFinite(newPitch)) this.pitch = clampPitch(newPitch);
    camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
    camera.rotation.set(this.pitch, this.yaw, 0);
  }

  /** Stop everything, detach from the DOM and free the GPU resources (the canvas' context stays reusable). */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const { canvas, stage, ctx, lib, signs } = this;
    const { scene, renderer, sun } = stage;
    this.loop.stop();
    this.walk.cancel(new Error("disposed"));
    this.rides.cancel(new Error("disposed"));
    this.walkers.stopAll();
    this.input.dispose();
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
    this.models.cache?.dispose();
    // animated parts use per-part clones that keep the library name (skipped above)
    for (const a of ctx.animated) a.material.dispose();
    const particles = this.blocks.particles;
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
  }
}
