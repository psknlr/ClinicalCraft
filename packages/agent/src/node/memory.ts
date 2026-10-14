/**
 * Project memory (`CLINICALCRAFT.md`, like CLAUDE.md / AGENTS.md / GROK.md):
 * `~/.clinicalcraft/CLINICALCRAFT.md`, then for every directory from the
 * project root down to cwd its `CLINICALCRAFT.md` (or `AGENTS.md` when absent),
 * plus `<root>/.clinicalcraft/CLINICALCRAFT.md`. Root-first order; `@path`
 * imports are resolved relative to the importing file and must stay inside
 * the project root or the ClinicalCraft home (memory is sent to model
 * providers, so a repository must not be able to pull in e.g. `~/.ssh` files).
 */
import { closeSync, openSync, readSync, realpathSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { assembleMemory, type MemoryFile } from "../memory.js";
import { clinicalcraftHome, expandHome, findProjectRoot, type Env } from "./home.js";

/** Max bytes read from one memory/import file. */
const MAX_FILE_BYTES = 256 * 1024;

export const MEMORY_FILE_NAME = "CLINICALCRAFT.md";
export const MEMORY_FALLBACK_NAME = "AGENTS.md";

function readSyncCapped(path: string): string | null {
  try {
    if (!statSync(path).isFile()) return null;
    const fd = openSync(path, "r");
    try {
      const buf = Buffer.alloc(MAX_FILE_BYTES);
      const n = readSync(fd, buf, 0, MAX_FILE_BYTES, 0);
      return buf.subarray(0, n).toString("utf8");
    } finally {
      closeSync(fd);
    }
  } catch {
    return null;
  }
}

async function readOptional(path: string): Promise<string | null> {
  try {
    const text = await readFile(path, "utf8");
    return text.length > MAX_FILE_BYTES ? text.slice(0, MAX_FILE_BYTES) : text;
  } catch {
    return null;
  }
}

function canonical(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function isInside(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/** Directories from `root` down to `cwd` (inclusive); just `[cwd]` when cwd is outside root. */
function chain(root: string, cwd: string): string[] {
  const rel = relative(root, cwd);
  if (rel.startsWith("..") || isAbsolute(rel)) return [cwd];
  const dirs = [root];
  let current = root;
  for (const segment of rel.split(sep).filter(Boolean)) {
    current = join(current, segment);
    dirs.push(current);
  }
  return dirs;
}

/** Candidate memory files in load order (existence not checked). */
export function memoryCandidates(cwd: string, env: Env = process.env): string[][] {
  const absCwd = resolve(cwd);
  const root = findProjectRoot(absCwd, env) ?? absCwd;
  const groups: string[][] = [[join(clinicalcraftHome(env), MEMORY_FILE_NAME)], [join(root, ".clinicalcraft", MEMORY_FILE_NAME)]];
  for (const dir of chain(root, absCwd)) groups.push([join(dir, MEMORY_FILE_NAME), join(dir, MEMORY_FALLBACK_NAME)]);
  return groups;
}

/** Load and assemble memory for `cwd`. Missing files are skipped. */
export async function loadMemory(cwd: string = process.cwd(), env: Env = process.env): Promise<{ text: string; files: string[] }> {
  const files: MemoryFile[] = [];
  for (const group of memoryCandidates(cwd, env)) {
    for (const path of group) {
      const text = await readOptional(path);
      if (text !== null) {
        files.push({ path, text });
        break; // first existing file of the group (CLINICALCRAFT.md before AGENTS.md)
      }
    }
  }
  const imported: string[] = [];
  const absCwd = resolve(cwd);
  const allowedRoots = [findProjectRoot(absCwd, env) ?? absCwd, clinicalcraftHome(env)].map(canonical);
  const text = assembleMemory(files, (importPath, fromPath) => {
    const expanded = expandHome(importPath, env);
    const path = isAbsolute(expanded) ? expanded : resolve(dirname(fromPath), expanded);
    const real = canonical(path);
    if (!allowedRoots.some((root) => isInside(real, root))) return null;
    const content = readSyncCapped(path);
    if (content === null) return null;
    imported.push(path);
    return { path, text: content };
  });
  return { text, files: [...files.map((f) => f.path), ...imported] };
}
