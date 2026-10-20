/**
 * Local saves (localStorage "clinicalcraft-v5"): one session snapshot per
 * case, one world save per facility, the build inventory and a copy of the UI
 * settings. Export/import uses the V4-style single-file format adapted to V5:
 * `{format: "clinicalcraft-v5", session, world, inventory, settings}` with
 * V4-like validation (size cap, format, known ids, sane inventory).
 */
import type { SessionSnapshot } from "@clinicalcraft/agent";
import type { WorldSave } from "../contracts.js";
import { cleanActions, restoredPlan } from "./session.js";
import { sanitizeSettings, type UiPrefs } from "./settings.js";
import { validWorldSnapshot } from "./spatial.js";

export const SAVE_KEY = "clinicalcraft-v5";
export const EXPORT_FORMAT = "clinicalcraft-v5";
export const MAX_IMPORT_BYTES = 2_000_000;

export type BlockType = "wood" | "stone" | "glass" | "lamp";
export type Inventory = Record<BlockType, number>;
export const BLOCK_TYPES: BlockType[] = ["wood", "stone", "glass", "lamp"];
export const DEFAULT_INVENTORY: Inventory = { wood: 32, stone: 32, glass: 16, lamp: 8 };

export interface CaseSave {
  snapshot: SessionSnapshot;
  facilityId: string;
  savedAt: string;
  done: number;
  total: number;
  finished: boolean;
}

export interface SaveData {
  format: typeof EXPORT_FORMAT;
  version: 1;
  lastCase: string | null;
  sessions: Record<string, CaseSave>;
  worlds: Record<string, WorldSave>;
  inventory: Inventory;
  settings?: UiPrefs;
}

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: 1;
  exportedAt: string;
  session: SessionSnapshot;
  facilityId: string;
  world: WorldSave | null;
  inventory: Inventory;
  settings: UiPrefs;
}

export function emptySave(): SaveData {
  return { format: EXPORT_FORMAT, version: 1, lastCase: null, sessions: {}, worlds: {}, inventory: { ...DEFAULT_INVENTORY } };
}

function validInventory(v: unknown): Inventory | null {
  if (!v || typeof v !== "object") return null;
  const out = { ...DEFAULT_INVENTORY };
  for (const k of BLOCK_TYPES) {
    const n = (v as Record<string, unknown>)[k];
    if (!Number.isInteger(n) || (n as number) < 0 || (n as number) > 1e5) return null;
    out[k] = n as number;
  }
  return out;
}

function validWorld(v: unknown): WorldSave | null {
  if (!v || typeof v !== "object") return null;
  const w = v as Partial<WorldSave>;
  if (typeof w.facilityId !== "string" || !Array.isArray(w.position) || w.position.length !== 3 || !w.position.every((n) => Number.isFinite(n))) return null;
  if (!Number.isFinite(w.yaw)) return null;
  const blocks = Array.isArray(w.blocks)
    ? w.blocks
        .filter((b) => b && Array.isArray(b.cell) && b.cell.length === 3 && b.cell.every((n) => Number.isInteger(n)) && typeof b.type === "string")
        .slice(0, 5000)
        .map((b) => ({ cell: [b.cell[0], b.cell[1], b.cell[2]] as [number, number, number], type: b.type }))
    : [];
  return { facilityId: w.facilityId, position: [w.position[0], w.position[1], w.position[2]], yaw: w.yaw as number, ...(Number.isFinite(w.pitch) ? { pitch: w.pitch } : {}), blocks };
}

function validSnapshot(v: unknown): SessionSnapshot | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Partial<SessionSnapshot>;
  if (s.format !== "clinicalcraft-session@1" || typeof s.caseId !== "string" || typeof s.sessionId !== "string" || !Array.isArray(s.actions)) return null;
  const messages: Record<string, unknown[]> = {};
  if (s.messages && typeof s.messages === "object") {
    for (const [agent, list] of Object.entries(s.messages)) if (Array.isArray(list) && /^[\w-]{1,40}$/.test(agent)) messages[agent] = list.slice(0, 2000);
  }
  return {
    format: "clinicalcraft-session@1",
    sessionId: s.sessionId.slice(0, 80),
    caseId: s.caseId,
    caseVersion: typeof s.caseVersion === "string" ? s.caseVersion : "0.0.0",
    facilityId: typeof s.facilityId === "string" ? s.facilityId : null,
    locale: typeof s.locale === "string" ? s.locale : "zh-CN",
    actions: cleanActions(s.actions),
    messages,
    // Workup plan items: string text and a known status (pending | in_progress | completed).
    plan: restoredPlan(s.plan).slice(0, 200),
    createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
    // A resume continues the transcript's ordinals from here (agent SessionSnapshot.nextOrdinal).
    ...(typeof s.nextOrdinal === "number" && Number.isSafeInteger(s.nextOrdinal) && s.nextOrdinal >= 0 ? { nextOrdinal: s.nextOrdinal } : {}),
    // The examiner's evidence lines (notes, rationales, ACTION narrations, conversation).
    ...(Array.isArray(s.dialogue)
      ? {
          dialogue: s.dialogue
            .slice(-5000)
            // `who` is a role or actor name (the session also drops unknown ones and ACTION lines no replayed action produced).
            .filter((d) => d && typeof d.who === "string" && /^[\w-]{1,40}$/.test(d.who) && typeof d.speaker === "string" && typeof d.text === "string")
            .map((d) => ({ who: d.who, speaker: d.speaker.slice(0, 80), text: d.text.slice(0, 8000) })),
        }
      : {}),
    // Embodied mode (docs/EMBODIED.md R3): the encounter's mode and its physical world (validated shape;
    // the world model refuses a snapshot of another facility itself).
    ...(s.embodiment === "embodied" ? { embodiment: "embodied" as const } : {}),
    ...(s.embodiment === "embodied" && validWorldSnapshot(s.world, typeof s.facilityId === "string" ? s.facilityId : null) ? { world: s.world } : {}),
  };
}

export class SaveStore {
  data: SaveData;
  lastError: string | null = null;

  constructor() {
    this.data = this.read();
  }

  private read(): SaveData {
    let raw: unknown = null;
    try {
      raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null");
    } catch {
      raw = null;
    }
    const d = emptySave();
    if (!raw || typeof raw !== "object" || (raw as SaveData).format !== EXPORT_FORMAT) return d;
    const r = raw as Partial<SaveData>;
    for (const [id, cs] of Object.entries(r.sessions ?? {})) {
      const snap = validSnapshot(cs?.snapshot);
      if (snap && typeof cs.facilityId === "string") {
        d.sessions[id] = { snapshot: snap, facilityId: cs.facilityId, savedAt: String(cs.savedAt ?? ""), done: Number(cs.done) || 0, total: Number(cs.total) || 0, finished: cs.finished === true };
      }
    }
    for (const [id, w] of Object.entries(r.worlds ?? {})) {
      const ws = validWorld(w);
      if (ws) d.worlds[id] = ws;
    }
    d.inventory = validInventory(r.inventory) ?? { ...DEFAULT_INVENTORY };
    d.lastCase = typeof r.lastCase === "string" ? r.lastCase : null;
    return d;
  }

  /** Persist; returns false when storage is unavailable or full. */
  write(): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      this.lastError = null;
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      return false;
    }
  }

  caseSave(caseId: string): CaseSave | null {
    return this.data.sessions[caseId] ?? null;
  }

  clearCase(caseId: string, facilityId?: string): void {
    delete this.data.sessions[caseId];
    if (facilityId) delete this.data.worlds[facilityId];
    if (this.data.lastCase === caseId) this.data.lastCase = null;
    this.write();
  }

  /** Build an export file for one case. */
  exportFile(caseId: string, settings: UiPrefs): ExportFile | null {
    const cs = this.data.sessions[caseId];
    if (!cs) return null;
    return {
      format: EXPORT_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      session: cs.snapshot,
      facilityId: cs.facilityId,
      world: this.data.worlds[cs.facilityId] ?? null,
      inventory: { ...this.data.inventory },
      settings,
    };
  }

  /**
   * Validate an imported file (V4 rules adapted): size, format, session
   * snapshot, known case/facility, inventory counts. Returns an error key or the
   * parsed file.
   */
  static parseImport(text: string, known: { cases: Set<string>; facilities: Set<string> }): { ok: true; file: ExportFile } | { ok: false; error: "save.tooLarge" | "save.invalid" | "save.unknownCase" | "save.unknownFacility" | "save.badInventory"; id?: string } {
    if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: "save.tooLarge" };
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return { ok: false, error: "save.invalid" };
    }
    if (!raw || typeof raw !== "object") return { ok: false, error: "save.invalid" };
    const r = raw as Partial<ExportFile>;
    if (r.format !== EXPORT_FORMAT) return { ok: false, error: "save.invalid" };
    const session = validSnapshot(r.session);
    if (!session) return { ok: false, error: "save.invalid" };
    if (!known.cases.has(session.caseId)) return { ok: false, error: "save.unknownCase", id: session.caseId };
    const facilityId = typeof r.facilityId === "string" ? r.facilityId : session.facilityId;
    if (!facilityId || !known.facilities.has(facilityId)) return { ok: false, error: "save.unknownFacility", id: String(facilityId) };
    const inventory = validInventory(r.inventory);
    if (!inventory) return { ok: false, error: "save.badInventory" };
    const world = r.world == null ? null : validWorld(r.world);
    if (r.world != null && (!world || world.facilityId !== facilityId)) return { ok: false, error: "save.invalid" };
    const settings = sanitizeSettings({ ui: r.settings }).ui;
    return { ok: true, file: { format: EXPORT_FORMAT, version: 1, exportedAt: String(r.exportedAt ?? ""), session, facilityId, world, inventory, settings } };
  }

  /** Apply a validated import (replaces that case's progress and the facility's world). */
  applyImport(file: ExportFile): void {
    this.data.sessions[file.session.caseId] = { snapshot: file.session, facilityId: file.facilityId, savedAt: new Date().toISOString(), done: 0, total: 0, finished: false };
    if (file.world) this.data.worlds[file.facilityId] = file.world;
    else delete this.data.worlds[file.facilityId];
    this.data.inventory = { ...file.inventory };
    this.data.lastCase = file.session.caseId;
    this.write();
  }
}

/** Trigger a browser download of text content. */
export function download(content: string | Uint8Array, filename: string, type: string): void {
  const blob = new Blob([content as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
