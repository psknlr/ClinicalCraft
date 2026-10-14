/**
 * Custom agents and slash commands from Markdown files:
 *   agents:   ~/.clinicalcraft/agents/*.md (user) + <root>/.clinicalcraft/agents/*.md (project)
 *   commands: ~/.clinicalcraft/commands/**.md + <root>/.clinicalcraft/commands/**.md
 *             (name = file name; nested dirs → "dir:name")
 * Project definitions override user ones with the same name. Invalid files are
 * skipped and reported through `onIssue`.
 */
import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { parseAgentMarkdown, parseCommandMarkdown } from "../agents/markdown.js";
import type { AgentProfile, SlashCommand } from "../agents/types.js";
import { clinicalcraftHome, findProjectRoot, type Env } from "./home.js";

export interface DefinitionIssue {
  file: string;
  message: string;
}

export interface LoadDefinitionsOptions {
  onIssue?: (issue: DefinitionIssue) => void;
}

async function listMarkdown(dir: string, recursive: boolean): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && recursive && !entry.name.startsWith(".")) out.push(...(await listMarkdown(path, true)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) out.push(path);
  }
  return out;
}

function definitionDirs(cwd: string, env: Env, kind: "agents" | "commands"): { dir: string; source: "user" | "project" }[] {
  const root = findProjectRoot(cwd, env) ?? resolve(cwd);
  const user = join(clinicalcraftHome(env), kind);
  const project = join(root, ".clinicalcraft", kind);
  return project === user ? [{ dir: user, source: "user" }] : [{ dir: user, source: "user" }, { dir: project, source: "project" }];
}

/** Load custom agent profiles (project overrides user by name). */
export async function loadProjectAgents(cwd: string = process.cwd(), env: Env = process.env, options: LoadDefinitionsOptions = {}): Promise<AgentProfile[]> {
  const byName = new Map<string, AgentProfile>();
  for (const { dir, source } of definitionDirs(cwd, env, "agents")) {
    for (const file of await listMarkdown(dir, false)) {
      try {
        const text = await readFile(file, "utf8");
        const profile = parseAgentMarkdown(text, source, basename(file, ".md"));
        byName.set(profile.name, profile);
      } catch (err) {
        options.onIssue?.({ file, message: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  return [...byName.values()];
}

/** Command name for a file below a commands dir: `review.md` → `review`, `osce/start.md` → `osce:start`. */
export function commandNameFor(dir: string, file: string): string {
  return relative(dir, file)
    .replace(/\.md$/i, "")
    .split(sep)
    .filter(Boolean)
    .join(":");
}

/** Load custom slash commands (project overrides user by name). */
export async function loadProjectCommands(cwd: string = process.cwd(), env: Env = process.env, options: LoadDefinitionsOptions = {}): Promise<SlashCommand[]> {
  const byName = new Map<string, SlashCommand>();
  for (const { dir, source } of definitionDirs(cwd, env, "commands")) {
    for (const file of await listMarkdown(dir, true)) {
      try {
        const text = await readFile(file, "utf8");
        const command = parseCommandMarkdown(commandNameFor(dir, file), text, source);
        byName.set(command.name, command);
      } catch (err) {
        options.onIssue?.({ file, message: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  return [...byName.values()];
}
