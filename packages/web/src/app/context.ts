/**
 * The application context handed to UI modules (types only — the
 * implementation lives in app.ts). Panels never touch three.js or the agent
 * internals directly: they read the store and call these methods.
 */
import type { CaseDefinition, ClinicalAction, EquipmentCatalog, FacilityDefinition } from "@clinicalcraft/core";
import type { Op } from "@clinicalcraft/agent";
import type { SoundKind } from "../contracts.js";
import type { ToastLevel } from "../ui/toast.js";
import type { PanelHost } from "../ui/panel.js";
import type { ContentIndex } from "./content.js";
import type { RuntimeChoice, ServerInfo } from "./llm.js";
import type { Inventory, SaveStore } from "./persistence.js";
import type { EmbodiedLink } from "./embodied-link.js";
import type { ExternalControl } from "./external.js";
import type { AppSession } from "./session.js";
import type { Prefs } from "./settings.js";
import type { Stations } from "./stations.js";
import type { GameWorldLink, Route, WorldHost } from "./world-bridge.js";

export interface Game {
  readonly caseDef: CaseDefinition;
  readonly facility: FacilityDefinition;
  readonly catalogs: EquipmentCatalog[];
  readonly slotId: string | null;
  readonly session: AppSession;
  readonly link: GameWorldLink;
  readonly stations: Stations;
  /** The learner is in the world (HUD shown). */
  entered: boolean;
  /** Staff id currently in conversation (speaking animation). */
  activeStaff: string | null;
  /** Embodied mode (docs/EMBODIED.md): the world model ⇄ 3D world controller; null in clinical mode. */
  embodied: EmbodiedLink | null;
}

export type PanelName =
  | "conversation"
  | "orders"
  | "device"
  | "report"
  | "image"
  | "journal"
  | "source"
  | "board"
  | "compare"
  | "debrief"
  | "monitor"
  | "pause"
  | "settings"
  | "map"
  | "inventory"
  | "craft"
  | "help"
  | "atlas"
  | "autopilot"
  | "elevator"
  | "confirm-reset";

export interface App {
  readonly content: ContentIndex;
  readonly prefs: Prefs;
  readonly saves: SaveStore;
  readonly panels: PanelHost;
  readonly world: WorldHost;
  readonly inventory: Inventory;
  /** `?qa` mode (window.__QA__, deterministic helpers). */
  readonly qa: boolean;
  /** Selected hotbar slot (V4: 0 talk … 8 help). */
  readonly slot: number;
  game: Game | null;
  server: ServerInfo | null;
  /**
   * External control of the running encounter (an MCP client through `clinicalcraft mcp --attach`,
   * docs/PROTOCOL.md §13.6): off by default, never persisted, offered only when served with the world bridge.
   */
  readonly external: ExternalControl;
  /** Whether this page offers external control (served by `clinicalcraft serve` with the world bridge). */
  externalOffered(): boolean;
  /** Turn external control of the running encounter on or off (off: running external calls are cancelled). */
  setExternalControl(on: boolean): Promise<void>;
  /** Provider choice in effect for new/running sessions. */
  choice(): RuntimeChoice;
  /** Show a toast; toasts with the same `key` supersede each other. */
  toast(title: string, body?: string, level?: ToastLevel, key?: string): void;
  sound(kind: SoundKind): void;
  /** Open a panel by name (args depend on the panel). */
  open(name: PanelName, arg?: unknown): void;
  /** Execute a world interaction route. */
  route(route: Route): void;
  close(): void;
  /** Submit an op to the running session (`view`: the conversation it was typed in). */
  submit(op: Op, view?: string): string | null;
  act(action: ClinicalAction, rationale?: string): string | null;
  save(): boolean;
  /** Player position in the world (spawn when there is no world). */
  playerPos(): { x: number; z: number };
  setLocale(locale: "zh-CN" | "en"): void;
  /** Re-apply settings to the world and the running session. */
  applySettings(): void;
  backToLibrary(): Promise<void>;
  resetCase(): Promise<void>;
  exportSave(): void;
  importSave(file: File): Promise<void>;
  exportRecord(): void;
  /** Mark a destination (map / "go to station"). */
  /** Mark (and with `walk`, auto-walk to) a destination; `level` in a multi-level facility. */
  markDestination(dest: { x: number; z: number; label: string; level?: string } | null, walk?: boolean): void;
  inventoryChanged(): void;
  /** Start (or resume) a case in a facility and enter the world. */
  startCase(caseId: string, facilityId: string, resume: boolean): Promise<void>;
  /** Hotbar slot pressed (number key, click or touch). */
  hotbar(slot: number): void;
  /** T / Enter / touch "talk": open the conversation with the aimed NPC or the last interlocutor. */
  chat(): void;
  /** True while the learner is in the world with no panel or dialog open. */
  isPlaying(): boolean;
}
