/**
 * Shared state while building and running a world.
 */
import type { Box3, Group, Mesh, MeshStandardMaterial, Object3D, PointLight, Scene, Texture } from "three";
import type { EquipmentModel, EquipmentType, FacilityDefinition } from "@clinicalcraft/core";
import type { CollisionModel, DoorSpec } from "@clinicalcraft/world";
import type { InteractionTarget } from "../contracts.js";
import type { WorldLevels } from "./levels.js";
import type { MaterialLibrary, MergedCatalogs } from "./materials.js";
import type { Aabb, ColliderGrid } from "./physics.js";
import type { SignFactory } from "./signs.js";
import type { BoxBatch } from "./voxels.js";
import type { ScreenKind } from "./screens.js";
import type { PersonRig } from "./npc.js";

export interface LightCandidate {
  x: number;
  y: number;
  z: number;
  color: string;
  intensity: number;
  distance: number;
  decay: number;
  /** Emissive lamp mesh (optional) — stays lit when the real light is culled. */
  source?: string;
  /** Level of the fixture (default: the default level); multi-level facilities prefer the avatar's. */
  level?: string;
}

export interface DoorLeaf {
  pivot: Object3D;
  /** Rotation (rad) when open, or slide offset (units) for sliding doors. */
  openValue: number;
  mode: "swing" | "slide";
  collider: Aabb;
  /** Local axis for sliding (pivot moves along it). */
  slideAxis?: "x";
  baseX?: number;
}

export interface DoorRecord {
  id: string;
  name: string;
  open: boolean;
  leaves: DoorLeaf[];
  /** Doorway area (to refuse closing on the player / auto-open on paths). */
  area: { minX: number; maxX: number; minZ: number; maxZ: number };
  centre: { x: number; z: number };
  target: Extract<InteractionTarget, { kind: "door" }>;
  objects: Object3D[];
  /** Interior (room partition) door — "门" rather than the building's "大门". */
  interior?: boolean;
  /** Level the door is on. */
  level: string;
  /** Locked by the world model (embodiment): stays shut for the player and walkers. */
  locked?: boolean;
}

/**
 * A portable placement (`portable: "cart" | "handheld"`, EMBODIED §8): drawn
 * in the static batches until the world model moves it, then *promoted* to
 * its own group (portable.ts) drawn where the world says it stands. `group`
 * pivots about the placement's own origin; its parts are in world
 * coordinates under `inner`.
 */
export interface PortableRecord {
  id: string;
  group: Group;
  inner: Group;
  /** Drawn on its own (moved at least once); before, its boxes are instances of `batch`. */
  promoted: boolean;
  /** The level's static batch holding its boxes until promoted, and where they are in it. */
  batch: import("./voxels.js").BoxBatch;
  refs: import("./voxels.js").InstanceRef[];
  /** Its boxes as built (merged into `inner` when promoted). */
  parts: import("./portable.js").BoxPart[];
  /** Where the placement was authored (origin y = floor + placement y). */
  origin: { x: number; y: number; z: number; rot: number; level: string };
  /** Where it is drawn now (same frame as `origin`). */
  x: number;
  z: number;
  level: string;
  /** Carried (null spot): hidden, no collider, not aimable. */
  hidden: boolean;
  /** Meshes the aim ray tests (removed from the pickables while hidden). */
  meshes: Object3D[];
  /** Being pushed by a walker ("avatar" or a staff id): drawn in front of them, no collider until parked. */
  pushedBy?: string | null;
  /** A trolley a patient travels on (a bed, a stretcher: EMBODIED §8): turned along the way when pushed; its length (m). */
  trolley?: { length: number };
  /** Where its aim box, live screens and lights were when built (moves are applied from these). */
  home?: { box: Box3 | null; screens: Map<ScreenRecord, { x: number; z: number }>; lights: Map<LightCandidate, { x: number; z: number }> };
}

export interface ScreenRecord {
  placementId: string;
  kind: ScreenKind;
  mesh: Mesh;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: Texture;
  x: number;
  z: number;
  /** Patient slot whose vitals feed this screen (vitals/ecg). */
  slotId: string | null;
  lastDraw: number;
  /** Level of the screen's placement. */
  level: string;
}

export interface AnimatedPart {
  mesh: Mesh;
  anim: "blink" | "spin" | "pulse" | "slide";
  base: { y: number; ry: number; sx: number; sy: number; sz: number };
  material: MeshStandardMaterial;
  phase: number;
}

export interface TargetRecord {
  id: string;
  target: InteractionTarget;
  /** World-space box used for the highlight outline. */
  box: Box3;
  x: number;
  z: number;
  label: string;
  /** For equipment: interaction kind (map dot colour). */
  kind: string;
  /** Level of the target (default: the default level). */
  level?: string;
}

export interface NpcRecord {
  /** A patient, a staff member, or a patient's companion (drawn at their side: no body in the world model). */
  kind: "patient" | "staff" | "companion";
  id: string;
  rig: PersonRig;
  x: number;
  z: number;
  rot: number;
  speaking: boolean;
  distressed: boolean;
  collider: Aabb | null;
  target: InteractionTarget;
  label: string;
  /** Level the NPC stands on. */
  level: string;
}

export interface PlacementInfo {
  id: string;
  type: EquipmentType;
  x: number;
  z: number;
  y: number;
  rot: number;
  w: number;
  d: number;
  h: number;
  solid: boolean;
  kind: string;
  label: string;
  room: string | null;
  /** Level of the placement and its floor elevation (`y` above is relative to it). */
  level: string;
  elevation: number;
}

/** A placement whose equipment type has a GLB/glTF model (EMBODIED §11): loaded after the build. */
export interface ModelRequest {
  placementId: string;
  model: EquipmentModel;
  footprint: { w: number; d: number; h: number };
  /** Placement origin (world, floor of its level + its own y) and rotation (degrees). */
  at: { x: number; y: number; z: number; rot: number };
  level: string;
  /** The placement's voxel parts, in their own group: shown until the model is in, and kept whenever it fails. */
  fallback: Group;
  /** Where the loaded model goes (a portable placement's group, so it moves with it); default: its level's group. */
  parent?: Group;
}

export interface BuildContext {
  facility: FacilityDefinition;
  catalogs: MergedCatalogs;
  locale: string;
  scene: Scene;
  root: Group;
  lib: MaterialLibrary;
  signs: SignFactory;
  batch: BoxBatch;
  colliders: ColliderGrid;
  /**
   * The facility's collision model (@clinicalcraft/world, EMBODIED R2): the single
   * source of every collider. Builders never compute colliders themselves.
   */
  collision: CollisionModel;
  /** The facility's default level (terrain, outdoors, ground floor). */
  level: string;
  /** Levels: elevations, the avatar's level, level-aware culling (EMBODIED R10). */
  levels: WorldLevels;
  /**
   * Route what builders emit next (`batch`, `root`) to a level's static batch
   * and group; the default level's are the scene's. Builders call it before
   * emitting each level's content and switch back to `level` afterwards.
   */
  onLevel(level: string): void;
  /** Physics boxes registered in `colliders`, by model collider id (door leaves toggle theirs). */
  physics: Map<string, Aabb>;
  /** Door records of the model by renderer door id (`<owner>:<side>:<n>`). */
  doorSpecs: Map<string, DoorSpec>;
  /** Objects tested by the aim ray (recursive). */
  pickables: Object3D[];
  targets: Map<string, TargetRecord>;
  doors: DoorRecord[];
  lights: LightCandidate[];
  realLights: PointLight[];
  screens: ScreenRecord[];
  animated: AnimatedPart[];
  placements: Map<string, PlacementInfo>;
  /** Portable placements (carts, handheld items), each in its own movable group (embodiment). */
  portables: Map<string, PortableRecord>;
  npcs: Map<string, NpcRecord>;
  /** Meshes carry castShadow flags (the renderer's shadow map decides whether they are used). */
  shadows: boolean;
  /** Textures created while building that no material library owns (disposed with the world). */
  ownedTextures: Texture[];
  /** Placements to draw with their GLB model (null: models disabled) — their voxel parts go to `fallback` groups. */
  models: ModelRequest[] | null;
  warnings: string[];
}
