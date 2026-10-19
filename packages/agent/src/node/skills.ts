/**
 * Project skills (docs/EMBODIED.md §9): `~/.clinicalcraft/skills/*.json`
 * (user) and `<project root>/.clinicalcraft/skills/*.json` (project; a
 * project skill overrides a user skill with the same id). Each file holds
 * one skill (`clinicalcraft/skill@1`) or an array of them, validated with
 * the same schema as built-in and inline skills (`parseSkill`) — skills are
 * data, never code. An invalid skill is reported (with its file) and not
 * loaded.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseSkill, type SkillDefinition } from "../skills/schema.js";
import { clinicalcraftHome, findProjectRoot, type Env } from "./home.js";

export interface LoadedSkills {
  skills: SkillDefinition[];
  /** "<file>: <problem>" for every file or skill that was not loaded. */
  issues: string[];
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

/** Load project (and user) skills; invalid ones are reported, not loaded. */
export async function loadProjectSkills(cwd: string = process.cwd(), env: Env = process.env): Promise<LoadedSkills> {
  const root = findProjectRoot(cwd, env) ?? resolve(cwd);
  const user = join(clinicalcraftHome(env), "skills");
  const project = join(root, ".clinicalcraft", "skills");
  const dirs = project === user ? [user] : [user, project];
  const byId = new Map<string, SkillDefinition>();
  const issues: string[] = [];
  for (const dir of dirs) {
    for (const file of await jsonFiles(dir)) {
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
  return { skills: [...byId.values()], issues };
}
