/**
 * Browser settings (localStorage "clinicalcraft-v5-settings"):
 *
 *   ui     world/HUD preferences (V4 sound/bob/pointer/sensitivity + quality, language)
 *   agent  a settings layer in the agent schema (approval mode, scope, patient pipeline,
 *          provider overrides such as baseUrl) — merged with the agent's merge helpers
 *   llm    how the browser reaches a model: offline | proxy | direct (+ provider/model)
 *
 * API keys are NEVER part of these settings: `KeyStore` keeps them in
 * sessionStorage (default) or, only after an explicit opt-in, localStorage.
 */
import { mergeSettingsDetailed, type ResolvedSettings, type SettingsIssue, type SettingsLayerData } from "@clinicalcraft/agent";
import type { WorldSettings } from "../contracts.js";
import { detectLocale, type UiLocale } from "../i18n/index.js";

export const SETTINGS_KEY = "clinicalcraft-v5-settings";
export const KEY_PREFIX = "clinicalcraft-v5-key:";

export type LlmMode = "offline" | "proxy" | "direct";

export interface UiPrefs {
  sound: boolean;
  bob: boolean;
  pointer: boolean;
  sensitivity: number;
  quality: WorldSettings["quality"];
  /** null = follow the browser language. */
  locale: UiLocale | null;
}

export interface LlmPrefs {
  mode: LlmMode;
  /** Upstream provider for the proxy ("" = server default). */
  proxyProvider: string;
  proxyModel: string;
  directProvider: string;
  directModel: string;
  /** Persist the direct-mode key in localStorage (explicit opt-in). */
  rememberKey: boolean;
}

export interface StoredSettings {
  version: 1;
  ui: UiPrefs;
  agent: SettingsLayerData;
  llm: LlmPrefs;
}

function reducedMotion(): boolean {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** True on a touch-first device (`pointer: coarse`): on-screen buttons instead of keys. */
export function coarse(): boolean {
  try {
    return matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

export function defaultSettings(): StoredSettings {
  return {
    version: 1,
    ui: { sound: false, bob: !reducedMotion(), pointer: true, sensitivity: 1, quality: coarse() ? "medium" : "high", locale: null },
    agent: { approvalMode: "default", practiceScope: "full", patient: { pipeline: "select-voice" } },
    llm: { mode: "offline", proxyProvider: "", proxyModel: "", directProvider: "anthropic", directModel: "", rememberKey: false },
  };
}

function safeGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: () => Storage, key: string, value: string | null): boolean {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

const local = () => localStorage;
const session = () => sessionStorage;

const QUALITIES = ["low", "medium", "high"] as const;
const MODES: LlmMode[] = ["offline", "proxy", "direct"];

/** Validate and complete a stored object (unknown/invalid fields fall back to defaults). */
export function sanitizeSettings(raw: unknown): StoredSettings {
  const d = defaultSettings();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<StoredSettings>;
  const ui = (r.ui ?? {}) as Partial<UiPrefs>;
  const llm = (r.llm ?? {}) as Partial<LlmPrefs>;
  const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
  const str = (v: unknown, fb: string) => (typeof v === "string" ? v.slice(0, 200) : fb);
  return {
    version: 1,
    ui: {
      sound: bool(ui.sound, d.ui.sound),
      bob: bool(ui.bob, d.ui.bob),
      pointer: bool(ui.pointer, d.ui.pointer),
      sensitivity: typeof ui.sensitivity === "number" && ui.sensitivity >= 0.2 && ui.sensitivity <= 3 ? ui.sensitivity : d.ui.sensitivity,
      quality: QUALITIES.includes(ui.quality as never) ? (ui.quality as UiPrefs["quality"]) : d.ui.quality,
      locale: ui.locale === "zh-CN" || ui.locale === "en" ? ui.locale : null,
    },
    agent: r.agent && typeof r.agent === "object" ? stripSecrets(r.agent as SettingsLayerData) : d.agent,
    llm: {
      mode: MODES.includes(llm.mode as LlmMode) ? (llm.mode as LlmMode) : d.llm.mode,
      proxyProvider: str(llm.proxyProvider, d.llm.proxyProvider),
      proxyModel: str(llm.proxyModel, d.llm.proxyModel),
      directProvider: str(llm.directProvider, d.llm.directProvider) || d.llm.directProvider,
      directModel: str(llm.directModel, d.llm.directModel),
      rememberKey: bool(llm.rememberKey, false),
    },
  };
}

/** Keys never live in the settings layer (they would reach the session settings). */
function stripSecrets(layer: SettingsLayerData): SettingsLayerData {
  const copy = JSON.parse(JSON.stringify(layer)) as SettingsLayerData;
  for (const p of Object.values(copy.providers ?? {})) {
    delete (p as Record<string, unknown>).apiKey;
    delete (p as Record<string, unknown>).apiKeyEnv;
  }
  delete copy.provider;
  delete copy.model;
  delete copy.hooks;
  delete copy.server;
  delete copy.profiles;
  return copy;
}

export class Prefs {
  value: StoredSettings;
  private listeners = new Set<(s: StoredSettings) => void>();

  constructor() {
    let raw: unknown = null;
    try {
      raw = JSON.parse(safeGet(local, SETTINGS_KEY) ?? "null");
    } catch {
      raw = null;
    }
    this.value = sanitizeSettings(raw);
  }

  get ui(): UiPrefs {
    return this.value.ui;
  }

  get llm(): LlmPrefs {
    return this.value.llm;
  }

  /** Effective UI locale. */
  get locale(): UiLocale {
    return this.value.ui.locale ?? detectLocale();
  }

  update(mutator: (s: StoredSettings) => void): void {
    mutator(this.value);
    this.value = sanitizeSettings(this.value);
    this.persist();
    for (const fn of this.listeners) fn(this.value);
  }

  persist(): boolean {
    return safeSet(local, SETTINGS_KEY, JSON.stringify(this.value));
  }

  onChange(fn: (s: StoredSettings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** WorldSettings for createWorld (read on every frame by the world). */
  world(): WorldSettings {
    const u = this.value.ui;
    return { sound: u.sound, bob: u.bob, pointer: u.pointer, sensitivity: u.sensitivity, quality: u.quality, locale: this.locale };
  }
}

/**
 * Merge the stored agent layer with the runtime choices (provider/model from
 * the LLM mode, locale) using the agent's merge helpers.
 */
export function resolveAgentSettings(
  stored: StoredSettings,
  runtime: { provider: string; model: string | null; locale: string; embodiment?: "clinical" | "embodied" },
): { settings: ResolvedSettings; issues: SettingsIssue[] } {
  const flags: SettingsLayerData = { provider: runtime.provider, locale: runtime.locale };
  if (runtime.model) flags.model = runtime.model;
  // the encounter's mode (fixed for it): the app decides it (preference, a save's recorded mode)
  if (runtime.embodiment) flags.embodiment = runtime.embodiment;
  const { settings, issues } = mergeSettingsDetailed([
    { source: "user", settings: stored.agent, file: SETTINGS_KEY },
    { source: "flag", settings: flags },
  ]);
  // The browser never runs shell hooks and never writes node transcripts.
  settings.hooks = {};
  return { settings, issues };
}

/**
 * "Embodied agents" (docs/EMBODIED.md R3): the mode a NEW encounter starts in — embodied by default in
 * the 3D world (`agent.embodiment` unset), clinical when the learner turned it off. A running or saved
 * encounter keeps its own mode.
 */
export function preferredEmbodiment(stored: StoredSettings): "clinical" | "embodied" {
  return stored.agent.embodiment === "clinical" ? "clinical" : "embodied";
}

/** User-supplied API keys (direct mode). Never written into settings, saves or transcripts. */
export const KeyStore = {
  get(providerId: string): string | null {
    return safeGet(session, KEY_PREFIX + providerId) ?? safeGet(local, KEY_PREFIX + providerId);
  },
  set(providerId: string, key: string, remember: boolean): void {
    const k = KEY_PREFIX + providerId;
    const v = key.trim();
    if (!v) {
      KeyStore.clear(providerId);
      return;
    }
    safeSet(session, k, v);
    if (remember) safeSet(local, k, v);
    else safeSet(local, k, null);
  },
  /** Re-apply the "remember" choice to an existing key. */
  remember(providerId: string, remember: boolean): void {
    const v = KeyStore.get(providerId);
    if (v) KeyStore.set(providerId, v, remember);
  },
  clear(providerId: string): void {
    safeSet(session, KEY_PREFIX + providerId, null);
    safeSet(local, KEY_PREFIX + providerId, null);
  },
  isRemembered(providerId: string): boolean {
    return safeGet(local, KEY_PREFIX + providerId) !== null;
  },
};
