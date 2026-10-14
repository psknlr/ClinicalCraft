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
  | { kind: "door"; id: string; name: string; hint: string };

export interface BlockInfo {
  cell: [number, number, number];
  type: string;
}

export interface MoveInfo {
  x: number;
  z: number;
  yaw: number;
  region: string;
  roomId: string | null;
  moving: boolean;
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
  teleport(x: number, z: number, yaw?: number): void;
  /** Animate an NPC: speaking (head bob), posture, accessory (oxygen mask…), affect tint. */
  setPatientState(slotId: string, state: { speaking?: boolean; posture?: WorldPatient["posture"]; accessory?: Appearance["accessory"]; distressed?: boolean }): void;
  setStaffSpeaking(staffId: string, speaking: boolean): void;
  /** Golden beacon over the current objective's destination (null hides it). */
  setWaypoint(target: { x: number; z: number; label: string } | null): void;
  /** Autopilot `walk_to`: smooth path to a point (straight segments via doorways); resolves on arrival or rejects if unreachable. */
  walkTo(target: { x: number; z: number }, signal?: AbortSignal): Promise<void>;
  /** Draw the minimap / big map (V4 style) into a 2D canvas. */
  drawMap(canvas: HTMLCanvasElement, opts: { big: boolean; waypoint: { x: number; z: number } | null; locale: string }): void;
  /** World position of a placement / slot / staff (for waypoints). */
  locate(id: string): { x: number; z: number; label: string } | null;
  screenshot(): string;
  dispose(): void;
  readonly position: { x: number; y: number; z: number; yaw: number; pitch: number };
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
