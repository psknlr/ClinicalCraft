/**
 * Contract between the three.js world (src/world, src/atlas, src/shared) and
 * the application/UI layer (src/app, src/ui). The world knows nothing about
 * cases, agents or panels; the UI knows nothing about three.js.
 */
import type { Appearance, EquipmentCatalog, FacilityDefinition, VitalsSnapshot } from "@clinicalcraft/core";

export interface WorldSettings {
  sound: boolean;
  /** View bob / hand sway (V4 "行走动态"). Off = reduced motion. */
  bob: boolean;
  /** Pointer lock on click (off = drag to look). */
  pointer: boolean;
  sensitivity: number;
  /** Render quality: shadows + pixel ratio. */
  quality: "low" | "medium" | "high";
  locale: string;
}

export interface WorldSave {
  facilityId: string;
  position: [number, number, number];
  yaw: number;
  pitch?: number;
  blocks: { cell: [number, number, number]; type: string }[];
}

/** An NPC patient placed in a facility slot. */
export interface WorldPatient {
  slotId: string;
  caseId: string;
  name: string;
  appearance: Appearance;
  posture: "standing" | "sitting" | "lying";
  /** Floating name tag text, e.g. "患者 · 74岁男性". */
  tag: string;
}

export type InteractionTarget =
  | { kind: "patient"; slotId: string; caseId: string; name: string; hint: string }
  | { kind: "staff"; staffId: string; role: string; name: string; hint: string }
  | {
      kind: "equipment";
      placementId: string;
      type: string;
      interaction: "workstation" | "monitor" | "bed" | "device" | "atlas" | "board" | "craft" | "sink" | "storage" | "none";
      capabilities: string[];
      name: string;
      hint: string;
      room: string | null;
    }
  | { kind: "door"; id: string; name: string; hint: string }
  /**
   * An elevator panel (EMBODIED R10): outside the car (`inside: false`) it
   * calls the car (handled by the world: the car door opens); inside, the
   * UI offers the levels to ride to (`WorldApi.rideElevator`). `stops`: the
   * levels the car serves, lowest first; `level`: the panel's level.
   */
  | { kind: "elevator"; connectorId: string; level: string; inside: boolean; name: string; hint: string; stops: string[] };

/** A point in the world: x/z and, in a multi-level facility, its level (default: the facility's default level). */
export interface WorldPoint {
  x: number;
  z: number;
  level?: string;
}

/** A level of the facility as the UI shows it. */
export interface WorldLevel {
  id: string;
  /** Localised name. */
  name: string;
  /** Floor elevation (m). */
  elevation: number;
}

export interface BlockInfo {
  cell: [number, number, number];
  type: string;
}

/**
 * A point of a route planned by the world model (`@clinicalcraft/world`
 * `PathPoint`): `via` names the connector (`connector:<id>`) used to reach it
 * — stairs and ramps are walked, an elevator is ridden.
 */
export interface RoutePoint {
  x: number;
  z: number;
  level: string;
  via?: string;
}

/** A body pose in the world model's convention (yaw 0 looks towards −Z; `level` is a facility level id). */
export interface BodyPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  level: string;
}

/** Where a moved body stopped: `arrived` false when it was aborted, blocked or interrupted by the player. */
export interface BodyMove {
  arrived: boolean;
  pose: BodyPose;
  /** Local detours around obstructions (an NPC in the way, a closed door). */
  replans: number;
}

/** Where a portable placement (a cart) stands now: world coordinates on `level`, `y` = that level's floor. */
export interface EquipmentSpot {
  x: number;
  y: number;
  z: number;
  level: string;
  /** Degrees (default: the placement's own rotation). */
  rot?: number;
}

/** A capture of the 3D viewport (no HUD) as a JPEG. */
export interface FrameCapture {
  mimeType: "image/jpeg";
  /** Base64, without a `data:` prefix. */
  data: string;
  width: number;
  height: number;
  /** The avatar's camera: eye position (`y` = eye height) and orientation. */
  pose: BodyPose;
}

export interface MoveInfo {
  x: number;
  z: number;
  yaw: number;
  region: string;
  roomId: string | null;
  moving: boolean;
  /** Level the avatar stands on and its localised name (multi-level facilities only). */
  level?: string;
  levelName?: string;
}

export type SoundKind = "tap" | "step" | "mine" | "place" | "success" | "door" | "alarm" | "beep";

export interface WorldCallbacks {
  /** `E`/click on an interactive target (doors are handled internally). */
  onInteract(target: InteractionTarget): void;
  /** Aim changed (for the target tooltip / crosshair). */
  onTarget(target: InteractionTarget | null, block: BlockInfo | null): void;
  /** Throttled (~10 Hz) movement updates. */
  onMove(info: MoveInfo): void;
  /** Build-zone inventory hook (V4 onBlock): "check" must return whether the player has the block. */
  onBlock(kind: "check" | "mine" | "place", type: string): boolean | void;
  onToast(title: string, body?: string): void;
  onSound(kind: SoundKind): void;
  /** Keyboard shortcuts the world captures while playing (J/M/B/Tab/Esc/digits). */
  onShortcut(action: "journal" | "map" | "inventory" | "pause" | "hotbar" | "chat", arg?: number): void;
  /** Pointer lock lost / window blurred while playing. */
  onPauseRequest(): void;
  /** The player opened or closed a door with E (renderer door id) — embodied mode mirrors it into the world model. */
  onDoor?(doorId: string, open: boolean): void;
  /**
   * The player pressed E on a door the world model locked: true when the app takes it (embodied mode asks
   * the world to `unlock` it — its key rules answer), else the world says it is locked.
   */
  onLockedDoor?(doorId: string): boolean;
}

export interface WorldOptions {
  canvas: HTMLCanvasElement;
  facility: FacilityDefinition;
  catalogs: EquipmentCatalog[];
  patients: WorldPatient[];
  settings: () => WorldSettings;
  saved?: WorldSave | null;
  callbacks: WorldCallbacks;
  /** Live vitals for a patient slot (drawn on monitor screens linked to the slot). */
  vitals?: (slotId: string) => VitalsSnapshot | null;
  /**
   * Equipment GLB/glTF models (EMBODIED §11, docs/ASSETS.md): `baseUrl` of relative model URIs
   * (default "/local-assets/"), `dracoPath` to load DRACO-compressed models; `false` draws voxel parts only.
   */
  models?: { baseUrl?: string; dracoPath?: string } | false;
}

export interface WorldApi {
  start(): void;
  pause(paused: boolean): void;
  /** Hotbar slot (V4: 0 talk, 1 journal, 2 map, 3-6 blocks wood/stone/glass/lamp, 7 inventory, 8 help). */
  select(slot: number): void;
  interact(): void;
  /** Build-zone mining (false) / placing (true). */
  build(place: boolean): void;
  serialize(): WorldSave;
  setKey(code: string, down: boolean): void;
  look(dx: number, dy: number): void;
  /** Back to spawn (doors closed); progress kept. */
  reset(): void;
  /** Teleport onto the floor of `level` (default: the facility's default level). */
  teleport(x: number, z: number, yaw?: number, level?: string): void;
  /** Animate an NPC: speaking (head bob), posture, accessory (oxygen mask…), affect tint. */
  setPatientState(slotId: string, state: { speaking?: boolean; posture?: WorldPatient["posture"]; accessory?: Appearance["accessory"]; distressed?: boolean }): void;
  setStaffSpeaking(staffId: string, speaking: boolean): void;
  /** Golden beacon over the current objective's destination (null hides it); stands on `level`'s floor. */
  setWaypoint(target: (WorldPoint & { label: string }) | null): void;
  /**
   * Autopilot `walk_to`: smooth path to a point (straight segments via doorways); resolves on arrival or
   * rejects if unreachable. A point on another level is reached via the stairs (or the elevator).
   */
  walkTo(target: WorldPoint, signal?: AbortSignal): Promise<void>;
  /** Draw the minimap / big map (V4 style) into a 2D canvas; `level` (default: the avatar's) picks the floor plan. */
  drawMap(canvas: HTMLCanvasElement, opts: { big: boolean; waypoint: WorldPoint | null; locale: string; level?: string }): void;
  /** World position of a placement / slot / staff / room (for waypoints), with its level in a multi-level facility. */
  locate(id: string): (WorldPoint & { label: string }) | null;
  /** The facility's levels, lowest first (one entry for a single-level facility). */
  levels(locale?: string): WorldLevel[];
  /**
   * Ride an elevator from the avatar's level to `level`: the avatar must be in the car (else it rejects);
   * the doors close, a short ride, the avatar arrives at the same spot of the car on `level` and the doors open.
   */
  rideElevator(connectorId: string, level: string): Promise<void>;
  /* ---- embodiment (docs/EMBODIED.md §2: the renderer animates what the world model plans) ---- */
  /**
   * Walk the avatar along a route planned by the world model (`NavPlan.path`: points walked, stairs climbed,
   * elevators ridden — never a route of the renderer's own), turning to `yaw` on arrival. Doors on the way
   * open and close behind; an obstruction is bypassed with a local detour; WASD, `signal` or a dead end stop
   * it (`arrived: false`, the pose where it stopped).
   */
  followRoute(route: RoutePoint[], opts?: { yaw?: number; signal?: AbortSignal }): Promise<BodyMove>;
  /** Walk a staff NPC (`staffId` without the `staff:` prefix) along a world-model route: the rig walks, doors open as it passes. */
  walkStaff(staffId: string, route: RoutePoint[], opts?: { yaw?: number; signal?: AbortSignal }): Promise<BodyMove>;
  /** Put a staff NPC at a pose at once (a restored world), or back at their post (`null`). */
  placeStaff(staffId: string, pose: BodyPose | null): void;
  /** Where a staff NPC is drawn now (null: unknown). */
  staffPose(staffId: string): BodyPose | null;
  /** Show a portable placement (a cart) where the world model says it stands, back at its own spot (`"home"`), or hide it while carried (`null`). */
  placeEquipment(placementId: string, at: EquipmentSpot | "home" | null): void;
  /**
   * Draw a cart in front of a walker while it is pushed (`by`: "avatar" or a staff id; `null`: stop) — no
   * collider meanwhile; the world model parks it (`placeEquipment`) when the push ends.
   */
  pushEquipment(placementId: string, by: string | null): void;
  /** Open or close a door (renderer door id; a `door:` prefix is accepted). A locked door does not open. */
  setDoor(doorId: string, open: boolean): void;
  /** Lock / unlock a door: a locked door closes and stays shut for the player and for walkers. */
  setDoorLocked(doorId: string, locked: boolean): void;
  /** The avatar's view of the 3D world (the WebGL viewport only) as a JPEG at most `maxWidth` px wide. */
  captureFrame(opts: { maxWidth: number; quality: number }): FrameCapture | null;
  screenshot(): string;
  dispose(): void;
  /** Avatar pose; `level` is the level it stands on. */
  readonly position: { x: number; y: number; z: number; yaw: number; pitch: number; level: string };
  /** Test/QA hooks (window.__QA__ in ?qa mode). */
  readonly debug: Record<string, unknown>;
}

export type CreateWorld = (opts: WorldOptions) => WorldApi;

export interface AtlasApi {
  setMode(mode: "cutaway" | "muscles" | "organs" | "spleen"): void;
  focus(target: "spleen" | "lung" | "bone" | "heart" | "liver" | "overview"): void;
  reset(): void;
  rotate(): boolean;
  dispose(): void;
}

export interface AtlasOptions {
  canvas: HTMLCanvasElement;
  /** URL of the gzip-compressed GLB (installed locally via import-v4) — null shows the "not installed" state. */
  modelUrl: string | null;
  /** Organ catalog (V4 CASE_DATA.catalog) URL or data. */
  catalog: { id: string; kind: string; label: string; region: string; thorax: boolean; center: [number, number, number] }[] | null;
  reducedMotion: () => boolean;
  onStatus(text: string): void;
  onReady(): void;
  onSelect(info: { kind: string; label: string }): void;
}

export type CreateAtlas = (opts: AtlasOptions) => Promise<AtlasApi>;

/** Shared bedside-monitor renderer used by in-world screens and the monitor panel. */
export interface MonitorRenderer {
  draw(ctx: CanvasRenderingContext2D, width: number, height: number, snapshot: VitalsSnapshot | null, timeMs: number, locale: string): void;
}
