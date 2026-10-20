/**
 * Project skills (docs/EMBODIED.md §9): `~/.clinicalcraft/skills/*.json`
 * (user) and `<project root>/.clinicalcraft/skills/*.json` (project; a
 * project skill overrides a user skill with the same id). Each file holds
 * one skill (`clinicalcraft/skill@1`) or an array of them, validated with
 * the same schema as built-in and inline skills (`parseSkill`) — skills are
 * data, never code. An invalid skill is reported (with its file) and not
 * loaded.
 *
 * Review S8/C10: the project's skills load only when the user trusted the
 * project (`clinicalcraft trust`, like its hooks) — otherwise they are
 * reported (`untrusted`) and left out; the user's own skills always load.
 * Skills that run themselves or each other (`execute_skill {skill_id}` in a
 * cycle) are reported and not loaded. The session registers them as
 * `project:<id>`, so none ever shadows a built-in skill (`mergeSkills`).
 */
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BUILTIN_SKILL_IDS } from "../skills/builtin.js";
import { parseSkill, skillCycles, type SkillDefinition } from "../skills/schema.js";
import { clinicalcraftHome, findProjectRoot, type Env } from "./home.js";
import { isProjectTrusted } from "./trust.js";

export interface LoadedSkills {
  skills: SkillDefinition[];
  /** "<file>: <problem>" for every file or skill that was not loaded. */
  issues: string[];
  /** The project's skill files left out because the project is not trusted (absent when none were). */
  untrusted?: { dir: string; files: number };
}

export interface LoadProjectSkillsOptions {
  /** Whether the project is trusted (default: `isProjectTrusted` of its root). */
  trusted?: boolean;
}

async function jsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
      .map((e) => join(dir, e.name))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** Load project (and user) skills; invalid, cyclic and untrusted ones are reported, not loaded. */
export async function loadProjectSkills(cwd: string = process.cwd(), env: Env = process.env, options: LoadProjectSkillsOptions = {}): Promise<LoadedSkills> {
  const root = findProjectRoot(cwd, env) ?? resolve(cwd);
  const user = join(clinicalcraftHome(env), "skills");
  const project = join(root, ".clinicalcraft", "skills");
  const dirs = project === user ? [user] : [user, project];
  const byId = new Map<string, SkillDefinition>();
  const issues: string[] = [];
  let untrusted: LoadedSkills["untrusted"];
  for (const dir of dirs) {
    const files = await jsonFiles(dir);
    if (dir === project && project !== user && files.length > 0 && !(options.trusted ?? (await isProjectTrusted(root, env)))) {
      untrusted = { dir, files: files.length };
      continue;
    }
    for (const file of files) {
      let raw: unknown;
      try {
        raw = JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, ""));
      } catch (err) {
        issues.push(`${file}: ${err instanceof SyntaxError ? `invalid JSON: ${err.message}` : (err as Error).message}`);
        continue;
      }
      for (const [i, item] of (Array.isArray(raw) ? raw : [raw]).entries()) {
        const parsed = parseSkill(item);
        if (parsed.ok) byId.set(parsed.skill.id, parsed.skill);
        else issues.push(`${file}${Array.isArray(raw) ? `[${i}]` : ""}: ${parsed.issues.join("; ")}`);
      }
    }
  }
  // Skills that run themselves or each other would recurse: reported, not loaded.
  const cyclic = new Set<string>();
  for (const cycle of skillCycles([...byId.values()], BUILTIN_SKILL_IDS)) {
    issues.push(`skills ${cycle.join(" → ")}: run each other through execute_skill (a cycle) — not loaded`);
    for (const id of cycle) cyclic.add(id);
  }
  return { skills: [...byId.values()].filter((s) => !cyclic.has(s.id)), issues, ...(untrusted ? { untrusted } : {}) };
}
