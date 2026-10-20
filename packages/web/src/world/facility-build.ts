/**
 * The facility as built for a voxel world: materials, signs and the facility's collision model
 * (@clinicalcraft/world, EMBODIED R2: the source of every collider), the levels (EMBODIED R10: each built at its
 * elevation, every non-default level into its own group and static batch), the shared `BuildContext`, then the
 * terrain, structures, upper floors and stairs flights, equipment placements and elevators, merged into
 * instanced static batches. Equipment GLB/glTF models (EMBODIED §11) load afterwards (`EquipmentModels`):
 * until one is in — and whenever it fails — the placement's voxel parts stay.
 */
import { Group, type InstancedMesh, type Object3D } from "three";
import { roomLevel } from "@clinicalcraft/core";
import { buildCollisionModel, type CollisionModel, type DoorSpec } from "@clinicalcraft/world";
import type { WorldOptions } from "../contracts.js";
import type { BuildContext } from "./context.js";
import { buildElevators, type Elevator } from "./elevator.js";
import { buildPlacements } from "./equipment.js";
import { WorldLevels } from "./levels.js";
import { MaterialLibrary, mergeCatalogs, type MergedCatalogs } from "./materials.js";
import { ModelCache, modelUrl, placeModel, shortUrl } from "./models.js";
import { ColliderGrid, type Aabb } from "./physics.js";
import { SignFactory } from "./signs.js";
import type { Stage } from "./stage.js";
import { buildLevels } from "./stairs.js";
import { buildStructures, type WallRecord } from "./structures.js";
import { buildTerrain } from "./terrain.js";
import { BoxBatch } from "./voxels.js";
import type { VoxelWorld } from "./voxel-world.js";

/** What building the facility produced. */
export interface BuiltFacility {
  merged: MergedCatalogs;
  lib: MaterialLibrary;
  signs: SignFactory;
  /** The facility's collision model (@clinicalcraft/world): the source of every collider. */
  collision: CollisionModel;
  levels: WorldLevels;
  /** The default level (terrain, outdoors, ground floor). */
  level: string;
  /** Level of every registered collider (model colliders, patients, blocks); missing = the default level. */
  colliderLevels: WeakMap<Aabb, string>;
  /** Walkable floor of each upper level (its slabs, stairwells excluded) for the autopilot's nav grids. */
  levelFloors: Map<string, { minX: number; maxX: number; minZ: number; maxZ: number }[]>;
  /** The group each level is built into (the default level's is the stage's root). */
  levelRoots: Map<string, Group>;
  ctx: BuildContext;
  clouds: Group;
  walls: WallRecord[];
  elevators: Elevator[];
  groundMeshes: InstancedMesh[];
  staticMeshes: InstancedMesh[];
}

/** Build the facility of `opts` into the stage. */
export function buildFacility(opts: WorldOptions, stage: Stage, locale: string): BuiltFacility {
  const { facility } = opts;
  const { scene, root } = stage;
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
  const colliderLevels = new WeakMap<Aabb, string>();
  for (const c of collision.colliders) {
    const box: Aabb = { minX: c.minX, maxX: c.maxX, minY: c.minY, maxY: c.maxY, minZ: c.minZ, maxZ: c.maxZ };
    if (c.kind === "door") box.door = true;
    if (c.ramp) box.ramp = { ...c.ramp }; // stairs / ramp flights: walkable wedges (physics follows the surface)
    physics.set(c.id, colliderGrid.add(box));
    colliderLevels.set(box, c.level);
  }
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
  return { merged, lib, signs, collision, levels, level, colliderLevels, levelFloors, levelRoots, ctx, clouds, walls, elevators, groundMeshes, staticMeshes };
}

/** Equipment GLB/glTF models (EMBODIED §11), loaded after the build; a failed one keeps its voxel parts (a warning says why). */
export class EquipmentModels {
  readonly cache: ModelCache | null;
  /** Placements requested, loaded and failed (QA). */
  readonly state: { requested: number; loaded: string[]; failed: string[] };

  constructor(world: VoxelWorld) {
    const { opts, ctx, levelRoots, stage } = world;
    const root = stage.root;
    const modelOpts = opts.models === false ? null : (opts.models ?? {});
    const modelCache = modelOpts && ctx.models?.length ? new ModelCache({ ...(modelOpts.baseUrl ? { baseUrl: modelOpts.baseUrl } : {}), ...(modelOpts.dracoPath ? { dracoPath: modelOpts.dracoPath } : {}) }) : null;
    this.cache = modelCache;
    const modelState = { requested: ctx.models?.length ?? 0, loaded: [] as string[], failed: [] as string[] };
    this.state = modelState;
    for (const req of ctx.models ?? []) {
      modelCache!
        .load(req.model.uri, req.model.sha256)
        .then((scene) => {
          if (world.disposed) return;
          const placed = placeModel(scene, req.model, req.footprint, { ...req.at, id: req.placementId }, ctx.shadows);
          if (!placed) throw new Error("empty model");
          (req.parent ?? levelRoots.get(req.level) ?? root).add(placed.group);
          req.fallback.visible = false;
          const hidden = new Set<Object3D>();
          req.fallback.traverse((o) => hidden.add(o));
          for (let i = ctx.pickables.length - 1; i >= 0; i--) if (hidden.has(ctx.pickables[i])) ctx.pickables.splice(i, 1);
          ctx.pickables.push(placed.proxy);
          modelState.loaded.push(req.placementId);
          stage.markShadows();
        })
        .catch((err: unknown) => {
          if (world.disposed) return;
          modelState.failed.push(req.placementId);
          ctx.warnings.push(`model of ${req.placementId} (${shortUrl(modelUrl(req.model.uri, modelCache!.baseUrl))}): ${err instanceof Error ? err.message : String(err)} — voxel parts kept`);
        });
    }
  }
}
