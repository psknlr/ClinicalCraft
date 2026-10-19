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
  kind: "patient" | "staff";
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
  npcs: Map<string, NpcRecord>;
  /** Meshes carry castShadow flags (the renderer's shadow map decides whether they are used). */
  shadows: boolean;
  /** Textures created while building that no material library owns (disposed with the world). */
  ownedTextures: Texture[];
  /** Placements to draw with their GLB model (null: models disabled) — their voxel parts go to `fallback` groups. */
  models: ModelRequest[] | null;
  warnings: string[];
}
