/**
 * Content loader: scans content directories for
 *   <dir>/cases/<id>/case.json, <dir>/facilities/*.json, <dir>/catalogs/*.json,
 *   <dir>/templates/*.json (room templates)
 * and validates them with core's `parseCase` / `parseFacility` /
 * `parseCatalog` / `parseRoomTemplate` (falling back to the zod schemas when
 * the engine helpers are unavailable). The built-in content directory
 * (`@clinicalcraft/content`) is searched first; later directories override
 * earlier ones by id. Within one directory the first case folder (in name
 * order) declaring an id wins and the others are reported — the same
 * winners as the case index (`CaseIndexer`, ./case-index.ts). Facilities
 * that place room templates (`instances`) are compiled with every loaded
 * template once all directories are read (`compileFacility`): front-ends see
 * flat facilities only; one that does not compile is reported and left out.
 */
import { existsSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as core from "@clinicalcraft/core";
import { CaseSchema, EquipmentCatalogSchema, FacilitySchema, RoomTemplateSchema, type CaseDefinition, type EquipmentCatalog, type FacilityDefinition, type RoomTemplate } from "@clinicalcraft/core";

/** Validation issue (same shape as core's `Issue`). */
export interface ContentIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface LoadedContent {
  cases: Map<string, { def: CaseDefinition; dir: string; file: string }>;
  facilities: Map<string, { def: FacilityDefinition; file: string }>;
  catalogs: Map<string, { def: EquipmentCatalog; file: string }>;
  /** Room templates (`clinicalcraft/room-template@1`) by id; facilities above are already compiled with them. */
  templates: Map<string, { def: RoomTemplate; file: string }>;
  issues: { file: string; issues: ContentIssue[] }[];
  /** Directories that were scanned (existing ones only). */
  dirs: string[];
}

export interface LoadContentOptions {
  /** Extra content directories (searched after the built-in one; later wins). */
  dirs?: readonly string[];
  /** Include the built-in `@clinicalcraft/content` directory (default true). */
  builtin?: boolean;
  /**
   * Load and validate the cases (default true). `false`: facilities and
   * catalogs only — e.g. `clinicalcraft serve`, which indexes cases with
   * `CaseIndexer` and validates each one when it is first requested.
   */
  cases?: boolean;
}

type ParseResult<T> = { ok: true; value: T; warnings: ContentIssue[] } | { ok: false; issues: ContentIssue[] };
type ZodLike = {
  safeParse(v: unknown): { success: true; data: unknown } | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } };
};

function parserFor<T>(name: "parseCase" | "parseFacility" | "parseCatalog" | "parseRoomTemplate", schema: ZodLike): (json: unknown) => ParseResult<T> {
  const fn = (core as unknown as Record<string, unknown>)[name];
  if (typeof fn === "function") {
    return (json) => {
      try {
        return (fn as (j: unknown) => ParseResult<T>)(json);
      } catch (err) {
        return { ok: false, issues: [{ path: "", message: `validator crashed: ${err instanceof Error ? err.message : String(err)}`, severity: "error" }] };
      }
    };
  }
  return (json) => {
    const r = schema.safeParse(json);
    if (r.success) return { ok: true, value: r.data as T, warnings: [] };
    return { ok: false, issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message, severity: "error" as const })) };
  };
}

let builtinDirCache: string | null | undefined;

/**
 * Root of the `@clinicalcraft/content` package (contains cases/, facilities/,
 * catalogs/), or null when it cannot be found.
 */
export function builtinContentDir(): string | null {
  if (builtinDirCache !== undefined) return builtinDirCache;
  const candidates: string[] = [];
  try {
    const resolveFn = (import.meta as unknown as { resolve?: (s: string) => string }).resolve;
    if (typeof resolveFn === "function") {
      const url = resolveFn("@clinicalcraft/content/catalogs/materials.json");
      candidates.push(dirname(dirname(fileURLToPath(url))));
    }
  } catch {
    /* not resolvable (exports, bundlers, vitest) */
  }
  try {
    // src/node/content.ts and dist/node/content.js are both three levels below packages/.
    candidates.push(fileURLToPath(new URL("../../../content/", import.meta.url)));
  } catch {
    /* non-file URL */
  }
  for (const dir of candidates) {
    if (isContentRoot(dir)) {
      builtinDirCache = resolve(dir);
      return builtinDirCache;
    }
  }
  builtinDirCache = null;
  return null;
}

function isContentRoot(dir: string): boolean {
  return ["cases", "facilities", "catalogs"].some((sub) => {
    try {
      return statSync(join(dir, sub)).isDirectory();
    } catch {
      return false;
    }
  });
}

async function listDir(dir: string): Promise<{ name: string; isDir: boolean; isFile: boolean }[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, isDir: e.isDirectory(), isFile: e.isFile() })).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

async function readJson(file: string): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> {
  try {
    const text = await readFile(file, "utf8");
    return { ok: true, value: JSON.parse(text.replace(/^﻿/, "")) as unknown };
  } catch (err) {
    return { ok: false, message: err instanceof SyntaxError ? `invalid JSON: ${err.message}` : `cannot read: ${(err as Error).message}` };
  }
}

/** Load and validate all content from the built-in directory and `dirs`. Never throws for bad files. */
export async function loadContent(options: LoadContentOptions = {}): Promise<LoadedContent> {
  const parseCase = parserFor<CaseDefinition>("parseCase", CaseSchema as unknown as ZodLike);
  const parseFacility = parserFor<FacilityDefinition>("parseFacility", FacilitySchema as unknown as ZodLike);
  const parseCatalog = parserFor<EquipmentCatalog>("parseCatalog", EquipmentCatalogSchema as unknown as ZodLike);
  const parseTemplate = parserFor<RoomTemplate>("parseRoomTemplate", RoomTemplateSchema as unknown as ZodLike);

  const result: LoadedContent = { cases: new Map(), facilities: new Map(), catalogs: new Map(), templates: new Map(), issues: [], dirs: [] };
  const report = (file: string, issues: ContentIssue[]) => {
    if (issues.length > 0) result.issues.push({ file, issues });
  };

  const dirs: string[] = [];
  if (options.builtin !== false) {
    const builtin = builtinContentDir();
    if (builtin) dirs.push(builtin);
  }
  for (const d of options.dirs ?? []) {
    const abs = resolve(d);
    if (!dirs.includes(abs)) dirs.push(abs);
  }

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      report(dir, [{ path: "", message: "content directory does not exist", severity: "warning" }]);
      continue;
    }
    result.dirs.push(dir);

    // Catalogs first (facilities reference them).
    for (const entry of await listDir(join(dir, "catalogs"))) {
      if (!entry.isFile || !entry.name.endsWith(".json")) continue;
      const file = join(dir, "catalogs", entry.name);
      const json = await readJson(file);
      if (!json.ok) {
        report(file, [{ path: "", message: json.message, severity: "error" }]);
        continue;
      }
      const parsed = parseCatalog(json.value);
      if (!parsed.ok) {
        report(file, parsed.issues);
        continue;
      }
      const warnings = [...parsed.warnings];
      if (result.catalogs.has(parsed.value.id)) warnings.push({ path: "id", message: `catalog "${parsed.value.id}" overrides ${result.catalogs.get(parsed.value.id)!.file}`, severity: "warning" });
      report(file, warnings);
      result.catalogs.set(parsed.value.id, { def: parsed.value, file });
    }

    // Room templates (facilities place them; compiled once every directory is read).
    for (const entry of await listDir(join(dir, "templates"))) {
      if (!entry.isFile || !entry.name.endsWith(".json")) continue;
      const file = join(dir, "templates", entry.name);
      const json = await readJson(file);
      if (!json.ok) {
        report(file, [{ path: "", message: json.message, severity: "error" }]);
        continue;
      }
      const parsed = parseTemplate(json.value);
      if (!parsed.ok) {
        report(file, parsed.issues);
        continue;
      }
      const warnings = [...parsed.warnings];
      if (result.templates.has(parsed.value.id)) warnings.push({ path: "id", message: `room template "${parsed.value.id}" overrides ${result.templates.get(parsed.value.id)!.file}`, severity: "warning" });
      report(file, warnings);
      result.templates.set(parsed.value.id, { def: parsed.value, file });
    }

    for (const entry of await listDir(join(dir, "facilities"))) {
      if (!entry.isFile || !entry.name.endsWith(".json")) continue;
      const file = join(dir, "facilities", entry.name);
      const json = await readJson(file);
      if (!json.ok) {
        report(file, [{ path: "", message: json.message, severity: "error" }]);
        continue;
      }
      const parsed = parseFacility(json.value);
      if (!parsed.ok) {
        report(file, parsed.issues);
        continue;
      }
      const warnings = [...parsed.warnings];
      if (result.facilities.has(parsed.value.id)) warnings.push({ path: "id", message: `facility "${parsed.value.id}" overrides ${result.facilities.get(parsed.value.id)!.file}`, severity: "warning" });
      report(file, warnings);
      result.facilities.set(parsed.value.id, { def: parsed.value, file });
    }

    if (options.cases === false) continue;
    for (const entry of await listDir(join(dir, "cases"))) {
      if (!entry.isDir) continue;
      const caseDir = join(dir, "cases", entry.name);
      const file = join(caseDir, "case.json");
      if (!existsSync(file)) continue;
      const json = await readJson(file);
      if (!json.ok) {
        report(file, [{ path: "", message: json.message, severity: "error" }]);
        continue;
      }
      const parsed = parseCase(json.value);
      if (!parsed.ok) {
        report(file, parsed.issues);
        continue;
      }
      const warnings = [...parsed.warnings];
      if (parsed.value.id !== entry.name) warnings.push({ path: "id", message: `case id "${parsed.value.id}" differs from its directory name "${entry.name}"`, severity: "warning" });
      const previous = result.cases.get(parsed.value.id);
      // Two folders of one directory with the same id: the first wins (as in the case index, `CaseIndexer`);
      // a later content directory overrides an earlier one.
      if (previous && dirname(dirname(previous.dir)) === dir) {
        report(file, [...warnings, { path: "id", message: `duplicate case id "${parsed.value.id}": ${previous.file} is used (the first folder of this directory)`, severity: "error" }]);
        continue;
      }
      if (previous) warnings.push({ path: "id", message: `case "${parsed.value.id}" overrides ${previous.file}`, severity: "warning" });
      report(file, warnings);
      result.cases.set(parsed.value.id, { def: parsed.value, dir: caseDir, file });
    }
  }
  compileFacilities(result, report);
  return result;
}

/**
 * Expand room-template instances (core `compileFacility`) with every loaded
 * template: the compiled facility replaces the authored one; compile issues
 * are reported against its file and a facility with errors is left out.
 */
function compileFacilities(result: LoadedContent, report: (file: string, issues: ContentIssue[]) => void): void {
  const compile = (core as unknown as { compileFacility?: (f: FacilityDefinition, t: Iterable<RoomTemplate>) => { ok: boolean; facility: FacilityDefinition; issues: ContentIssue[] } }).compileFacility;
  const templates = [...result.templates.values()].map((t) => t.def);
  for (const [id, entry] of [...result.facilities]) {
    if (!(entry.def.instances ?? []).length) continue;
    if (typeof compile !== "function") {
      report(entry.file, [{ path: "instances", message: "room templates cannot be compiled (engine unavailable)", severity: "error" }]);
      result.facilities.delete(id);
      continue;
    }
    const compiled = compile(entry.def, templates);
    report(entry.file, compiled.issues);
    if (compiled.ok) result.facilities.set(id, { def: compiled.facility, file: entry.file });
    else result.facilities.delete(id);
  }
}
