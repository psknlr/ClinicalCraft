/**
 * Project trust store (user-only): a cloned repository's
 * `.clinicalcraft/settings.json` / `settings.local.json` may declare command
 * hooks (shell commands) and provider/server overrides. Until the user trusts
 * the project, those layers lose their hooks and secret-bearing keys
 * (`validateSettingsLayer` with `trusted: false`).
 *
 * Trust lives in `<CLINICALCRAFT_HOME>/trusted-projects.json` (mode 0600),
 * keyed by the project root's realpath and pinned to a digest of both project
 * settings files: editing either file (or adding one) revokes trust until the
 * user trusts the project again (`clinicalcraft trust`).
 */
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { clinicalcraftHome, findProjectRoot, type Env } from "./home.js";

/** Contents of a project's two settings files (null = file absent). */
export interface ProjectSettingsTexts {
  project: string | null;
  local: string | null;
}

/** One trusted project in the store. */
export interface TrustedProject {
  root: string;
  digest: string;
  trustedAt: string;
}

interface TrustStore {
  version: 1;
  projects: Record<string, { digest: string; trustedAt: string }>;
}

/** `<CLINICALCRAFT_HOME>/trusted-projects.json`. */
export function trustStorePath(env: Env = process.env): string {
  return join(clinicalcraftHome(env), "trusted-projects.json");
}

/** Digest pinning a trust decision to the exact bytes of both project settings files. */
export function projectTrustDigest(texts: ProjectSettingsTexts): string {
  return `sha256:${createHash("sha256").update(JSON.stringify([texts.project, texts.local])).digest("hex")}`;
}

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return null;
  }
}

/** Read `<root>/.clinicalcraft/settings.json` and `settings.local.json` (null when absent). */
export async function readProjectSettingsTexts(root: string): Promise<ProjectSettingsTexts> {
  const dir = join(root, ".clinicalcraft");
  const [project, local] = await Promise.all([readText(join(dir, "settings.json")), readText(join(dir, "settings.local.json"))]);
  return { project, local };
}

/** Canonical store key of a project root (its realpath when it exists). */
export async function trustKey(root: string): Promise<string> {
  try {
    return await realpath(root);
  } catch {
    return resolve(root);
  }
}

async function readStore(env: Env): Promise<TrustStore> {
  const text = await readText(trustStorePath(env));
  const empty: TrustStore = { version: 1, projects: {} };
  if (!text) return empty;
  try {
    const parsed = JSON.parse(text) as Partial<TrustStore>;
    if (!parsed || typeof parsed !== "object" || !parsed.projects || typeof parsed.projects !== "object" || Array.isArray(parsed.projects)) return empty;
    const projects: TrustStore["projects"] = {};
    for (const [key, value] of Object.entries(parsed.projects)) {
      if (value && typeof value === "object" && typeof value.digest === "string") projects[key] = { digest: value.digest, trustedAt: String(value.trustedAt ?? "") };
    }
    return { version: 1, projects };
  } catch {
    return empty;
  }
}

async function writeStore(env: Env, store: TrustStore): Promise<string> {
  const file = trustStorePath(env);
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(tmp, 0o600).catch(() => undefined);
  await rename(tmp, file);
  return file;
}

/**
 * Whether the user trusted this project root with its current settings files.
 * `texts` (the bytes the caller is about to use) avoids a second read.
 */
export async function isProjectTrusted(root: string, env: Env = process.env, texts?: ProjectSettingsTexts): Promise<boolean> {
  const store = await readStore(env);
  const key = await trustKey(root);
  const entry = Object.hasOwn(store.projects, key) ? store.projects[key] : undefined;
  if (!entry) return false;
  return entry.digest === projectTrustDigest(texts ?? (await readProjectSettingsTexts(root)));
}

/** Project root for `cwd` (nearest `.clinicalcraft/` or `.git` ancestor, else `cwd`). */
export function trustRootFor(cwd: string, env: Env = process.env): string {
  return findProjectRoot(cwd, env) ?? resolve(cwd);
}

/** Trust the project containing `cwd` with its current settings files. */
export async function trustProject(cwd: string, env: Env = process.env, now: () => Date = () => new Date()): Promise<TrustedProject & { file: string }> {
  const root = await trustKey(trustRootFor(cwd, env));
  const digest = projectTrustDigest(await readProjectSettingsTexts(root));
  const store = await readStore(env);
  const trustedAt = now().toISOString();
  store.projects[root] = { digest, trustedAt };
  const file = await writeStore(env, store);
  return { root, digest, trustedAt, file };
}

/** Forget the trust decision for the project containing `cwd`; false when it was not trusted. */
export async function revokeProjectTrust(cwd: string, env: Env = process.env): Promise<{ root: string; removed: boolean }> {
  const root = await trustKey(trustRootFor(cwd, env));
  const store = await readStore(env);
  if (!Object.hasOwn(store.projects, root)) return { root, removed: false };
  delete store.projects[root];
  await writeStore(env, store);
  return { root, removed: true };
}

/** Every trusted project (sorted by root). */
export async function listTrustedProjects(env: Env = process.env): Promise<TrustedProject[]> {
  const store = await readStore(env);
  return Object.entries(store.projects)
    .map(([root, v]) => ({ root, digest: v.digest, trustedAt: v.trustedAt }))
    .sort((a, b) => a.root.localeCompare(b.root));
}
