/**
 * Locations: ClinicalCraft home (`CLINICALCRAFT_HOME` ?? `~/.clinicalcraft`),
 * project root discovery and local-only asset directories.
 */
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type Env = Record<string, string | undefined>;

/** `CLINICALCRAFT_HOME` or `~/.clinicalcraft`. */
export function clinicalcraftHome(env: Env = process.env): string {
  const override = env.CLINICALCRAFT_HOME?.trim();
  if (override) return resolve(expandHome(override, env));
  return join(userHome(env), ".clinicalcraft");
}

/** The user's home directory (`HOME`/`USERPROFILE` from env, else os.homedir()). */
export function userHome(env: Env = process.env): string {
  return env.HOME?.trim() || env.USERPROFILE?.trim() || homedir();
}

/** Expand a leading `~` / `~/`. */
export function expandHome(path: string, env: Env = process.env): string {
  if (path === "~") return userHome(env);
  if (path.startsWith("~/") || path.startsWith("~\\")) return join(userHome(env), path.slice(2));
  return path;
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Nearest ancestor of `cwd` (inclusive) containing a `.clinicalcraft/`
 * directory or a `.git` entry. The ClinicalCraft home directory itself is not
 * a project marker (so `~` is never mistaken for a project). Null when none.
 */
export function findProjectRoot(cwd: string = process.cwd(), env: Env = process.env): string | null {
  const home = resolve(clinicalcraftHome(env));
  let dir = resolve(cwd);
  while (true) {
    const marker = join(dir, ".clinicalcraft");
    if (isDir(marker) && resolve(marker) !== home) return dir;
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Candidate local-only asset dirs: `<repo>/assets/local`, then `<home>/assets` (see docs/ASSETS.md). */
export function localAssetDirs(cwd: string = process.cwd(), env: Env = process.env): string[] {
  const root = findProjectRoot(cwd, env) ?? resolve(cwd);
  return [join(root, "assets", "local"), join(clinicalcraftHome(env), "assets")];
}
