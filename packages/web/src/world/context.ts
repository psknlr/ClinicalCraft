/**
 * Shared state while building and running a world.
 */
import type { Box3, Group, Mesh, MeshStandardMaterial, Object3D, PointLight, Scene, Texture } from "three";
import type { EquipmentType, FacilityDefinition } from "@clinicalcraft/core";
import type { CollisionModel, DoorSpec } from "@clinicalcraft/world";
import type { InteractionTarget } from "../contracts.js";
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
  /** Level rendered (the facility's default level; other levels are headless-only for now). */
  level: string;
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
  warnings: string[];
}
