/**
 * Settings layering (see the header of `settings/schema.ts`):
 *
 *   defaults < user < project < local < env < flags, then an optional profile.
 *
 * Merge rules: plain objects deep-merge; `permissions.allow|ask|deny`, hook
 * matcher lists (`hooks.<Event>`) and `contentDirs` concatenate
 * (deduplicated); everything else (scalars, other arrays): last wins.
 *
 * Every layer is validated key-by-key with the zod schemas; invalid keys are
 * skipped and reported as issues instead of crashing. API keys found in
 * project settings are dropped (they must come from env or user/local files).
 */
import type { z } from "zod";
import type { ApprovalMode, PracticeScope } from "../protocol.js";
import {
  AgentModelSettingsSchema,
  ApprovalModeSchema,
  EffortSchema,
  PracticeScopeSchema,
  ProviderOverrideSchema,
  SettingsSchema,
  type HooksConfig,
  type ProviderOverride,
  type ResolvedSettings,
} from "./schema.js";

/** Where a layer comes from. */
export type SettingsSource = ResolvedSettings["sources"][string];

/**
 * Structural type of one settings layer (mirrors `SettingsSchema`; declared
 * locally because the recursive `profiles` field makes `z.infer` collapse).
 */
export interface SettingsLayerData {
  $schema?: string;
  provider?: string;
  model?: string;
  effort?: z.infer<typeof EffortSchema>;
  agents?: Record<string, z.infer<typeof AgentModelSettingsSchema>>;
  providers?: Record<string, ProviderOverride>;
  profiles?: Record<string, SettingsLayerData>;
  locale?: string;
  approvalMode?: ApprovalMode;
  practiceScope?: PracticeScope;
  permissions?: { allow?: string[]; ask?: string[]; deny?: string[] };
  hooks?: HooksConfig;
  maxToolRounds?: number;
  autoCompact?: { enabled?: boolean; thresholdTokens?: number };
  contentDirs?: string[];
  defaultCase?: string;
  defaultFacility?: string;
  transcripts?: { enabled?: boolean; dir?: string };
  patient?: { strictGrounding?: boolean; offlineFallback?: boolean; [k: string]: unknown };
  server?: { host?: string; port?: number; token?: string };
  [key: string]: unknown;
}

export interface SettingsLayer {
  source: SettingsSource;
  /** Raw (unvalidated) settings object, e.g. parsed JSON. */
  settings: unknown;
  /** File the layer was read from (for issue reporting). */
  file?: string;
}

export interface SettingsIssue {
  source: SettingsSource;
  file?: string;
  path: string;
  message: string;
  severity: "error" | "warning";
}

/** Built-in defaults (deep-frozen; `mergeSettings` returns fresh copies). */
export const DEFAULT_SETTINGS: Readonly<ResolvedSettings> = deepFreeze({
  provider: "offline",
  model: null,
  effort: null,
  agents: {},
  providers: {},
  locale: "zh-CN",
  approvalMode: "default",
  practiceScope: "full",
  permissions: { allow: [], ask: [], deny: [] },
  hooks: {},
  maxToolRounds: 12,
  autoCompact: { enabled: true, thresholdTokens: 120_000 },
  contentDirs: [],
  defaultCase: null,
  defaultFacility: null,
  transcripts: { enabled: true, dir: null },
  patient: { strictGrounding: true, offlineFallback: true },
  server: { host: "127.0.0.1", port: 5178, token: null },
  sources: {},
} as ResolvedSettings);

const TOP_LEVEL_KEYS: readonly string[] = Object.keys(DEFAULT_SETTINGS).filter((k) => k !== "sources");

/** Paths (dot-joined) whose arrays concatenate instead of replacing. */
function isConcatPath(path: string[]): boolean {
  if (path.length === 2 && path[0] === "permissions") return true;
  if (path.length === 2 && path[0] === "hooks") return true;
  if (path.length === 1 && path[0] === "contentDirs") return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}

function clone<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clone) as unknown as T;
  if (isPlainObject(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = clone(val);
    return out as T;
  }
  return v;
}

function deepFreeze<T>(v: T): T {
  if (Array.isArray(v) || isPlainObject(v)) {
    for (const val of Object.values(v as object)) deepFreeze(val);
    Object.freeze(v);
  }
  return v;
}

function stableKey(v: unknown): string {
  return typeof v === "string" ? `s:${v}` : `j:${JSON.stringify(v)}`;
}

function concatDedupe(a: unknown[], b: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of [...a, ...b]) {
    const key = stableKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clone(item));
  }
  return out;
}

/** Deep-merge `source` into `target` (mutates target) using the layering rules. */
function mergeInto(target: Record<string, unknown>, source: Record<string, unknown>, path: string[] = []): void {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    const here = [...path, key];
    const current = target[key];
    if (isPlainObject(value) && isPlainObject(current)) {
      mergeInto(current, value, here);
    } else if (Array.isArray(value) && Array.isArray(current) && isConcatPath(here)) {
      target[key] = concatDedupe(current, value);
    } else {
      target[key] = clone(value);
    }
  }
}

function zodIssues(error: z.ZodError, prefix: string): { path: string; message: string }[] {
  return error.issues.map((i) => ({ path: [prefix, ...i.path.map(String)].filter(Boolean).join("."), message: i.message }));
}

type ZodLike = { safeParse(v: unknown): { success: true; data: unknown } | { success: false; error: z.ZodError } };

function schemaShape(): Record<string, ZodLike> | null {
  const shape = (SettingsSchema as unknown as { shape?: Record<string, ZodLike> }).shape;
  return shape && typeof shape === "object" ? shape : null;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validate one raw layer key-by-key. Returns only the valid keys (raw values,
 * so schema defaults never leak into the merge) plus issues.
 */
export function validateSettingsLayer(
  raw: unknown,
  source: SettingsSource,
  file?: string,
  allowProfiles = true,
): { data: SettingsLayerData; issues: SettingsIssue[] } {
  const issues: SettingsIssue[] = [];
  const push = (path: string, message: string, severity: SettingsIssue["severity"] = "error") =>
    issues.push({ source, ...(file ? { file } : {}), path, message, severity });
  const data: SettingsLayerData = {};
  if (raw == null) return { data, issues };
  if (!isPlainObject(raw)) {
    push("", "settings must be a JSON object");
    return { data, issues };
  }
  const shape = schemaShape();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (key === "$schema") continue;
    if (key === "profiles") {
      if (!allowProfiles) {
        push("profiles", "profiles cannot be nested inside a profile; ignored", "warning");
        continue;
      }
      if (!isPlainObject(value)) {
        push("profiles", "expected an object of named profiles");
        continue;
      }
      const profiles: Record<string, SettingsLayerData> = {};
      for (const [name, profile] of Object.entries(value)) {
        const nested = validateSettingsLayer(profile, source, file, false);
        for (const issue of nested.issues) issues.push({ ...issue, path: `profiles.${name}${issue.path ? `.${issue.path}` : ""}` });
        profiles[name] = nested.data;
      }
      data.profiles = profiles;
      continue;
    }
    if (key === "agents" || key === "providers") {
      if (!isPlainObject(value)) {
        push(key, "expected an object");
        continue;
      }
      const schema: ZodLike = key === "agents" ? AgentModelSettingsSchema : ProviderOverrideSchema;
      const entries: Record<string, unknown> = {};
      for (const [name, entry] of Object.entries(value)) {
        const result = schema.safeParse(entry);
        if (!result.success) {
          for (const i of zodIssues(result.error, `${key}.${name}`)) push(i.path, i.message);
          continue;
        }
        let ok = clone(entry) as Record<string, unknown>;
        if (key === "providers" && source === "project" && "apiKey" in ok) {
          const { apiKey: _drop, ...rest } = ok;
          ok = rest;
          push(`providers.${name}.apiKey`, "API keys are never read from project settings; use an environment variable (apiKeyEnv) or user/local settings", "warning");
        }
        entries[name] = ok;
      }
      data[key] = entries as never;
      continue;
    }
    const fieldSchema = shape?.[key];
    if (!fieldSchema) {
      push(key, `unknown setting "${key}"`, "warning");
      continue;
    }
    const result = fieldSchema.safeParse(value);
    if (!result.success) {
      for (const i of zodIssues(result.error, key)) push(i.path, i.message);
      continue;
    }
    data[key] = clone(value);
  }
  return { data, issues };
}

/* ------------------------------------------------------------------ */
/* Merge                                                               */
/* ------------------------------------------------------------------ */

function applyLayerData(target: ResolvedSettings, data: SettingsLayerData, source: SettingsSource): void {
  const { profiles: _profiles, $schema: _schema, ...rest } = data;
  mergeInto(target as unknown as Record<string, unknown>, rest);
  for (const key of Object.keys(rest)) if (rest[key] !== undefined) target.sources[key] = source;
}

function freshDefaults(): ResolvedSettings {
  const settings = clone(DEFAULT_SETTINGS) as ResolvedSettings;
  settings.sources = Object.fromEntries(TOP_LEVEL_KEYS.map((k) => [k, "default" as const]));
  return settings;
}

export interface MergeOptions {
  /** Named profile (`profiles.<name>`) applied on top of every layer. */
  profile?: string | null;
}

export interface MergeResult {
  settings: ResolvedSettings;
  issues: SettingsIssue[];
  /** Profiles collected from all layers (later layers deep-merge over earlier ones). */
  profiles: Record<string, SettingsLayerData>;
}

/** Merge layers (in order) over the defaults, reporting issues. Never throws. */
export function mergeSettingsDetailed(layers: readonly SettingsLayer[], options: MergeOptions = {}): MergeResult {
  const settings = freshDefaults();
  const issues: SettingsIssue[] = [];
  const profiles: Record<string, SettingsLayerData> = {};
  for (const layer of layers) {
    const { data, issues: layerIssues } = validateSettingsLayer(layer.settings, layer.source, layer.file);
    issues.push(...layerIssues);
    if (data.profiles) {
      for (const [name, profile] of Object.entries(data.profiles)) {
        const existing = profiles[name] ?? {};
        mergeInto(existing as Record<string, unknown>, profile as Record<string, unknown>);
        profiles[name] = existing;
      }
    }
    applyLayerData(settings, data, layer.source);
  }
  if (options.profile) {
    const profile = profiles[options.profile];
    if (profile) applyLayerData(settings, profile, "profile");
    else issues.push({ source: "profile", path: `profiles.${options.profile}`, message: `unknown profile "${options.profile}"`, severity: "error" });
  }
  return { settings, issues, profiles };
}

/** Merge layers over the defaults → `ResolvedSettings`. Invalid keys are skipped. */
export function mergeSettings(layers: readonly SettingsLayer[], options: MergeOptions = {}): ResolvedSettings {
  return mergeSettingsDetailed(layers, options).settings;
}

/** Environment variables understood by `envLayer` / `applyEnv`. */
export const SETTINGS_ENV_VARS = {
  provider: "CLINICALCRAFT_PROVIDER",
  model: "CLINICALCRAFT_MODEL",
  locale: "CLINICALCRAFT_LOCALE",
  approvalMode: "CLINICALCRAFT_APPROVAL",
  practiceScope: "CLINICALCRAFT_SCOPE",
} as const;

/** Build the `env` settings layer from CLINICALCRAFT_* variables (invalid enum values are skipped). */
export function envLayer(env: Record<string, string | undefined>): SettingsLayer {
  const settings: SettingsLayerData = {};
  const get = (name: string) => env[name]?.trim() || undefined;
  const provider = get(SETTINGS_ENV_VARS.provider);
  if (provider) settings.provider = provider;
  const model = get(SETTINGS_ENV_VARS.model);
  if (model) settings.model = model;
  const locale = get(SETTINGS_ENV_VARS.locale);
  if (locale) settings.locale = locale;
  const approval = get(SETTINGS_ENV_VARS.approvalMode);
  if (approval && ApprovalModeSchema.safeParse(approval).success) settings.approvalMode = approval as ApprovalMode;
  const scope = get(SETTINGS_ENV_VARS.practiceScope);
  if (scope && PracticeScopeSchema.safeParse(scope).success) settings.practiceScope = scope as PracticeScope;
  return { source: "env", settings };
}

/** Apply CLINICALCRAFT_* environment overrides to resolved settings (returns a new object). */
export function applyEnv(settings: ResolvedSettings, env: Record<string, string | undefined>): ResolvedSettings {
  const next = clone(settings);
  const { data } = validateSettingsLayer(envLayer(env).settings, "env");
  applyLayerData(next, data, "env");
  return next;
}

/**
 * Apply a profile (a settings object, e.g. `merge.profiles.osce`) on top of
 * resolved settings (returns a new object; invalid keys are skipped).
 */
export function applyProfile(settings: ResolvedSettings, profile: unknown): ResolvedSettings {
  const next = clone(settings);
  if (profile == null) return next;
  const { data } = validateSettingsLayer(profile, "profile", undefined, false);
  applyLayerData(next, data, "profile");
  return next;
}

/** Apply a validated patch from a given source (e.g. CLI flags, web settings panel). */
export function applySettingsPatch(settings: ResolvedSettings, patch: unknown, source: SettingsSource = "flag"): { settings: ResolvedSettings; issues: SettingsIssue[] } {
  const next = clone(settings);
  const { data, issues } = validateSettingsLayer(patch, source, undefined, false);
  applyLayerData(next, data, source);
  return { settings: next, issues };
}
