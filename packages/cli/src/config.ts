/**
 * `clinicalcraft config get [key] | set <key> <value> [--user|--project|--local] | path`.
 * Secrets (provider `apiKey`, `server.token`) are never printed.
 */
import { existsSync } from "node:fs";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { saveBlockingIssues, SettingsLayerSchema, validateSettingsLayer } from "@clinicalcraft/agent";
import { findProjectRoot, isProjectTrusted, projectSettingsPaths, readProjectSettingsTexts, saveUserSettings, trustProject, userSettingsPath } from "@clinicalcraft/agent/node";
import { flagBool, suggest, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";
import { normalizeLang, SUPPORTED_LANGS } from "./i18n.js";

const SECRET_KEY = /^(apiKey|token|password|secret)$/i;

/** Settings layers by precedence (docs/ARCHITECTURE.md §4: later layers win). */
const LAYER_RANK: Readonly<Record<string, number>> = { default: 0, user: 1, project: 2, local: 3, env: 4, flag: 5, profile: 6 };

/** Deep copy with secret-looking keys masked. */
export function redactSettings(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSettings);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEY.test(k) && v !== null && v !== undefined ? "[redacted]" : redactSettings(v);
    return out;
  }
  return value;
}

/** Parse a CLI value: JSON when it parses (numbers, booleans, null, arrays, objects), else the raw string. */
export function parseConfigValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (/^(true|false|null|-?\d+(\.\d+)?|\[.*\]|\{.*\}|".*")$/s.test(trimmed)) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

/** `a.b.c` + value → `{a: {b: {c: value}}}` (rejects prototype keys). */
export function patchFor(key: string, value: unknown): Record<string, unknown> {
  const parts = key.split(".").filter(Boolean);
  if (parts.length === 0 || parts.some((p) => ["__proto__", "constructor", "prototype"].includes(p))) throw new Error(`invalid key "${key}"`);
  let patch: unknown = value;
  for (let i = parts.length - 1; i >= 0; i--) patch = { [parts[i]!]: patch };
  return patch as Record<string, unknown>;
}

function getPath(obj: unknown, key: string): unknown {
  let cur: unknown = obj;
  for (const part of key.split(".").filter(Boolean)) {
    if (!cur || typeof cur !== "object" || !Object.hasOwn(cur, part)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function deepMerge(target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete target[k];
    else if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object" && !Array.isArray(target[k])) deepMerge(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    else target[k] = v;
  }
  return target;
}

export async function configGet(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const { files, issues, projectRoot, projectTrusted, sources, ...resolved } = settings;
  const key = args.positionals[0];
  if (!key) {
    if (flagBool(args, "json")) ctx.print(JSON.stringify(redactSettings({ ...resolved, sources, files, projectRoot, projectTrusted }), null, 2));
    else {
      ctx.print(JSON.stringify(redactSettings(resolved), null, 2));
      ctx.print(ctx.out.dim(ctx.t("config.files", { files: files.join(", ") || "-" })));
      for (const i of issues) ctx.printErr(ctx.err.yellow(`${i.severity}: ${i.file ?? i.source} ${i.path || "(root)"}: ${i.message}`));
    }
    return EXIT.ok;
  }
  const value = getPath(resolved, key);
  if (value === undefined) throw new CliError(ctx.t("config.noKey", { key }), EXIT.error);
  const last = key.split(".").pop() ?? key;
  const out = (redactSettings({ [last]: value }) as Record<string, unknown>)[last];
  ctx.print(typeof out === "string" && !flagBool(args, "json") ? out : JSON.stringify(out, null, 2));
  const top = key.split(".")[0]!;
  if (sources[top] && !flagBool(args, "json")) ctx.printErr(ctx.err.dim(ctx.t("config.source", { source: sources[top]! })));
  return EXIT.ok;
}

/**
 * Merge `patch` into a settings layer file and write it atomically. `base` is
 * the file's text as the caller read it (null = absent; undefined = read it
 * now). Returns the text written.
 */
async function writeLayerFile(file: string, patch: Record<string, unknown>, source: "project" | "local", base?: string | null): Promise<string> {
  let current: Record<string, unknown> = {};
  const text = base !== undefined ? base : existsSync(file) ? await readFile(file, "utf8") : null;
  if (text !== null) {
    try {
      const parsed = JSON.parse(text.replace(/^﻿/, "")) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) current = parsed as Record<string, unknown>;
    } catch (err) {
      throw new CliError(`${file}: ${(err as Error).message}`, EXIT.error);
    }
  }
  const next = deepMerge(structuredClone(current), patch);
  const errors = saveBlockingIssues(validateSettingsLayer(next, source, file).issues, patch);
  if (errors.length > 0) throw new CliError(`Invalid settings: ${errors.map((e) => `${e.path || "(root)"}: ${e.message}`).join("; ")}`, EXIT.error);
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const written = `${JSON.stringify(next, null, 2)}\n`;
  await writeFile(tmp, written, { encoding: "utf8", mode: source === "local" ? 0o600 : 0o644 });
  await rename(tmp, file);
  if (source === "local") await chmod(file, 0o600).catch(() => undefined);
  return written;
}

/** `locale` and `profiles.<name>.locale`: the settings keys that pick the session language. */
function isLocaleKey(key: string): boolean {
  const parts = key.split(".").filter(Boolean);
  return (parts.length === 1 && parts[0] === "locale") || (parts.length === 3 && parts[0] === "profiles" && parts[2] === "locale");
}

export async function configSet(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const [key, ...rest] = args.positionals;
  if (!key || rest.length === 0) throw new UsageError(ctx.t("config.setUsage"));
  let value = parseConfigValue(rest.join(" "));
  // The language must be one the runtime ships (as `--lang` requires); aliases (zh, english…) are stored canonically.
  if (isLocaleKey(key) && value !== null) {
    const lang = typeof value === "string" ? normalizeLang(value) : null;
    if (!lang) throw new UsageError(ctx.t("config.invalidValue", { key, issues: ctx.t("config.localeChoices", { list: SUPPORTED_LANGS.join(" | ") }) }));
    value = lang;
  }
  let patch: Record<string, unknown>;
  try {
    patch = patchFor(key, value);
  } catch {
    throw new UsageError(ctx.t("config.badKey", { key }));
  }
  const top = key.split(".")[0]!;
  const known = [...Object.keys(SettingsLayerSchema.shape), "profiles"];
  if (!known.includes(top)) {
    const hint = suggest(top, known);
    throw new UsageError(ctx.t("config.unknownKey", { key: top }), hint ? ctx.t("argv.didYouMean", { value: hint }) : ctx.t("config.knownKeys", { list: known.join(", ") }));
  }
  const target = flagBool(args, "project") ? "project" : flagBool(args, "local") ? "local" : "user";
  const secret = key.split(".").some((part) => SECRET_KEY.test(part));
  if (target === "project" && secret) throw new CliError(ctx.t("config.noSecretsInProject"), EXIT.usage);
  // A bad value is a usage error (exit 2), reported before any file is touched.
  if (value !== null) {
    const invalid = validateSettingsLayer(patch, target).issues.filter((i) => i.severity === "error");
    if (invalid.length > 0) throw new UsageError(ctx.t("config.invalidValue", { key, issues: invalid.map((i) => `${i.path || "(root)"}: ${i.message}`).join("; ") }));
  }
  let file: string;
  if (target === "user") {
    try {
      file = await saveUserSettings(patch, ctx.env);
    } catch (err) {
      throw new CliError((err as Error).message, EXIT.error);
    }
  } else {
    const root = findProjectRoot(ctx.cwd, ctx.env) ?? ctx.cwd;
    const paths = projectSettingsPaths(root);
    file = target === "project" ? paths.project : paths.local;
    // The user's own edit keeps a trusted project trusted (trust is pinned to the file contents);
    // so does creating the first settings file (it then holds only what the user wrote).
    const before = await readProjectSettingsTexts(root);
    const keepTrust = (before.project === null && before.local === null) || (await isProjectTrusted(root, ctx.env, before));
    // Written from the text just checked (not a second read), and the trust pinned to exactly what this
    // command produced: a change by someone else in between is never trusted on the user's behalf.
    const written = await writeLayerFile(file, patch, target, target === "project" ? before.project : before.local);
    if (keepTrust) await trustProject(root, ctx.env, undefined, target === "project" ? { ...before, project: written } : { ...before, local: written });
  }
  ctx.print(ctx.t("config.saved", { key, value: secret ? "[redacted]" : JSON.stringify(value), file }));
  await warnIfShadowed(ctx, key, value, target, secret);
  return EXIT.ok;
}

/**
 * After `config set`: when a higher-precedence layer (e.g. the project file
 * over the user file) still decides a scalar value, say so — otherwise
 * `config get` would seem to ignore the change.
 */
async function warnIfShadowed(ctx: CliContext, key: string, value: unknown, target: string, secret: boolean): Promise<void> {
  if (value === null || typeof value === "object") return; // deletions, arrays (concatenated) and objects (merged)
  let effective;
  try {
    effective = await loadCliSettings(ctx);
  } catch {
    return;
  }
  const { files: _files, issues: _issues, projectRoot: _root, projectTrusted: _trusted, sources, ...resolved } = effective;
  const source = sources[key.split(".")[0]!];
  if (!source || (LAYER_RANK[source] ?? 0) <= (LAYER_RANK[target] ?? 0)) return;
  const now = getPath(resolved, key);
  if (JSON.stringify(now) === JSON.stringify(value)) return;
  ctx.printErr(ctx.err.yellow(ctx.t("config.shadowed", { key, value: secret ? "[redacted]" : JSON.stringify(now), source, target })));
}

export async function configPath(ctx: CliContext): Promise<number> {
  const root = findProjectRoot(ctx.cwd, ctx.env) ?? ctx.cwd;
  const paths = projectSettingsPaths(root);
  const mark = (f: string) => (existsSync(f) ? ctx.out.green("✓") : ctx.out.dim("·"));
  const user = userSettingsPath(ctx.env);
  ctx.print(`${mark(user)} user     ${user}`);
  ctx.print(`${mark(paths.project)} project  ${paths.project}`);
  ctx.print(`${mark(paths.local)} local    ${paths.local}`);
  return EXIT.ok;
}
