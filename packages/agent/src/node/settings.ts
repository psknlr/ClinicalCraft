/**
 * Node settings loader: user < project < local < env < flags, then profile.
 * Relative `contentDirs` / `transcripts.dir` resolve against the directory of
 * the settings file that declared them (flags: against cwd).
 */
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { envLayer, mergeSettingsDetailed, saveBlockingIssues, validateSettingsLayer, type SettingsIssue, type SettingsLayer, type SettingsLayerData } from "../settings/merge.js";
import type { ResolvedSettings } from "../settings/schema.js";
import { clinicalcraftHome, expandHome, findProjectRoot, type Env } from "./home.js";
import { isProjectTrusted, type ProjectSettingsTexts } from "./trust.js";

export interface LoadSettingsOptions {
  cwd?: string;
  env?: Env;
  /** CLI flags / web panel values as a settings object. */
  flags?: SettingsLayerData | Record<string, unknown>;
  /** Profile name (`profiles.<name>`); defaults to `CLINICALCRAFT_PROFILE`. */
  profile?: string | null;
}

export type LoadedSettings = ResolvedSettings & {
  /** Settings files that existed and were read (in layer order). */
  files: string[];
  /** Validation problems (invalid keys are skipped, never fatal). */
  issues: SettingsIssue[];
  /** Project root used for project/local settings. */
  projectRoot: string;
  /**
   * The user trusted this project (`clinicalcraft trust`) with its current
   * settings files. Untrusted project/local layers lose hooks, provider
   * headers and secret-bearing keys (issues with `code: "untrusted-project"`).
   * True when the project has no settings files.
   */
  projectTrusted: boolean;
};

/** Path of the user settings file. */
export function userSettingsPath(env: Env = process.env): string {
  return join(clinicalcraftHome(env), "settings.json");
}

/** Paths of project and local settings for a project root. */
export function projectSettingsPaths(root: string): { project: string; local: string } {
  return { project: join(root, ".clinicalcraft", "settings.json"), local: join(root, ".clinicalcraft", "settings.local.json") };
}

async function readJson(file: string): Promise<{ exists: boolean; value?: unknown; error?: string; text?: string }> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT" || (err as NodeJS.ErrnoException).code === "ENOTDIR") return { exists: false };
    return { exists: true, error: `cannot read: ${(err as Error).message}` };
  }
  try {
    return { exists: true, text, value: JSON.parse(text.replace(/^﻿/, "")) as unknown };
  } catch (err) {
    return { exists: true, text, error: `invalid JSON: ${(err as Error).message}` };
  }
}

function resolvePathsIn(raw: unknown, baseDir: string, env: Env): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  const fix = (p: unknown) => (typeof p === "string" && p.trim() ? (isAbsolute(expandHome(p, env)) ? expandHome(p, env) : resolve(baseDir, p)) : p);
  if (Array.isArray(obj.contentDirs)) obj.contentDirs = obj.contentDirs.map(fix);
  if (obj.transcripts && typeof obj.transcripts === "object" && !Array.isArray(obj.transcripts)) {
    const t = { ...(obj.transcripts as Record<string, unknown>) };
    if (typeof t.dir === "string") t.dir = fix(t.dir);
    obj.transcripts = t;
  }
  if (obj.profiles && typeof obj.profiles === "object" && !Array.isArray(obj.profiles)) {
    obj.profiles = Object.fromEntries(Object.entries(obj.profiles as Record<string, unknown>).map(([k, v]) => [k, resolvePathsIn(v, baseDir, env)]));
  }
  return obj;
}

/**
 * Load and merge all settings layers. Throws only for an unknown `profile`
 * (an explicit user request that cannot be honoured).
 */
export async function loadSettings(options: LoadSettingsOptions = {}): Promise<LoadedSettings> {
  const env = options.env ?? process.env;
  const cwd = resolve(options.cwd ?? process.cwd());
  const root = findProjectRoot(cwd, env) ?? cwd;
  const { project, local } = projectSettingsPaths(root);
  const candidates: { source: SettingsLayer["source"]; file: string }[] = [
    { source: "user", file: userSettingsPath(env) },
    { source: "project", file: project },
    { source: "local", file: local },
  ];

  const layers: SettingsLayer[] = [];
  const files: string[] = [];
  const readIssues: SettingsIssue[] = [];
  const seen = new Set<string>();
  // The bytes the repository layers were parsed from: trust is pinned to them.
  const texts: ProjectSettingsTexts = { project: null, local: null };
  for (const c of candidates) {
    if (seen.has(c.file)) continue; // e.g. cwd = home: project file == user file
    seen.add(c.file);
    const result = await readJson(c.file);
    if (!result.exists) continue;
    if ((c.source === "project" || c.source === "local") && result.text !== undefined) texts[c.source] = result.text;
    files.push(c.file);
    if (result.error) {
      readIssues.push({ source: c.source, file: c.file, path: "", message: result.error, severity: "error" });
      continue;
    }
    layers.push({ source: c.source, file: c.file, settings: resolvePathsIn(result.value, dirname(c.file), env) });
  }
  layers.push(envLayer(env));
  if (options.flags && Object.keys(options.flags).length > 0) layers.push({ source: "flag", settings: resolvePathsIn(options.flags, cwd, env) });

  const hasRepoLayer = layers.some((l) => l.source === "project" || l.source === "local");
  const projectTrusted = hasRepoLayer ? await isProjectTrusted(root, env, texts) : true;
  const profile = options.profile ?? env.CLINICALCRAFT_PROFILE?.trim() ?? null;
  const merged = mergeSettingsDetailed(layers, { profile: profile || null, trustedProject: projectTrusted });
  if (profile && !Object.hasOwn(merged.profiles, profile)) {
    const known = Object.keys(merged.profiles);
    throw new Error(`Unknown settings profile "${profile}"${known.length ? ` (known: ${known.join(", ")})` : " (no profiles defined)"}`);
  }
  return { ...merged.settings, files, issues: [...readIssues, ...merged.issues], projectRoot: root, projectTrusted };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Keys that would reach (or re-prototype) Object.prototype when assigned through. */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function deepAssign(target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || UNSAFE_KEYS.has(key)) continue;
    if (value === null) {
      delete target[key];
    } else if (isPlainObject(value) && Object.hasOwn(target, key) && isPlainObject(target[key])) {
      deepAssign(target[key] as Record<string, unknown>, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

/**
 * Deep-merge `patch` into the user settings file (arrays replace; `null`
 * deletes a key) and write it atomically with mode 0600. Throws when the
 * patch or the existing file is invalid. Returns the file path.
 */
export async function saveUserSettings(patch: SettingsLayerData | Record<string, unknown>, env: Env = process.env): Promise<string> {
  const file = userSettingsPath(env);
  const existing = await readJson(file);
  if (existing.error) throw new Error(`${file}: ${existing.error}`);
  const current = isPlainObject(existing.value) ? existing.value : {};
  const next = deepAssign(structuredClone(current), patch as Record<string, unknown>);
  const { issues } = validateSettingsLayer(next, "user", file);
  const errors = saveBlockingIssues(issues, patch as Record<string, unknown>);
  if (errors.length > 0) throw new Error(`Invalid settings: ${errors.map((e) => `${e.path || "(root)"}: ${e.message}`).join("; ")}`);

  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(tmp, 0o600);
  await rename(tmp, file);
  await chmod(file, 0o600).catch(() => undefined);
  return file;
}
