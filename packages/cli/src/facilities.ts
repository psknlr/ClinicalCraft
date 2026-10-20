/**
 * `clinicalcraft facilities list|validate`. Facilities that place room
 * templates are validated compiled (`compileFacility`); `--all` also checks
 * every room template (`checkRoomTemplate`).
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import {
  caseCapabilityGaps,
  checkCatalogs,
  checkFacility,
  checkRoomTemplate,
  compileFacility,
  parseCatalog,
  parseFacility,
  parseRoomTemplate,
  ROOM_TEMPLATE_SCHEMA_ID,
  t,
  type EquipmentCatalog,
  type Issue,
} from "@clinicalcraft/core";
import { loadContent } from "@clinicalcraft/agent/node";
import { sanitizeTerminal, table } from "@clinicalcraft/agent";
import { flagBool, flagString, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";

export async function facilitiesList(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const content = await loadContent({ dirs: settings.contentDirs });
  const facilities = [...content.facilities.values()];
  if (flagBool(args, "json")) {
    ctx.print(
      JSON.stringify(
        facilities.map(({ def, file }) => ({
          id: def.id,
          name: t(def.name, ctx.locale),
          catalogs: def.catalogs,
          rooms: def.rooms.length,
          placements: def.placements.length,
          patientSlots: def.patientSlots.length,
          file,
        })),
        null,
        2,
      ),
    );
    return EXIT.ok;
  }
  const rows = [[ctx.t("col.id"), ctx.t("col.name"), ctx.t("col.catalogs"), ctx.t("col.rooms"), ctx.t("col.slots"), ctx.t("col.placements")]];
  for (const { def } of facilities) rows.push([def.id, sanitizeTerminal(t(def.name, ctx.locale)), def.catalogs.join(", "), String(def.rooms.length), String(def.patientSlots.length), String(def.placements.length)]);
  ctx.print(table(rows, { header: true, maxCell: 50 }));
  ctx.print(ctx.out.dim(ctx.t("facilities.catalogs", { list: [...content.catalogs.keys()].join(", ") || "-" })));
  return EXIT.ok;
}

interface Checked {
  file: string;
  id: string | null;
  errors: Issue[];
  warnings: Issue[];
}

async function readJson(file: string): Promise<{ ok: true; value: unknown } | { ok: false; issue: Issue }> {
  try {
    return { ok: true, value: JSON.parse((await readFile(file, "utf8")).replace(/^﻿/, "")) };
  } catch (err) {
    return { ok: false, issue: { path: "", message: err instanceof SyntaxError ? `invalid JSON: ${err.message}` : `cannot read: ${(err as Error).message}`, severity: "error" } };
  }
}

export async function facilitiesValidate(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const content = await loadContent({ dirs: settings.contentDirs });
  const catalogs: EquipmentCatalog[] = [...content.catalogs.values()].map((c) => c.def);
  const checked: Checked[] = [];

  if (args.positionals.length === 0 || flagBool(args, "all")) {
    // Every loaded catalog/facility, plus files that failed to load.
    for (const { def, file } of content.catalogs.values()) checked.push({ file, id: def.id, errors: [], warnings: [] });
    const crossCatalog = checkCatalogs(catalogs);
    if (crossCatalog.length > 0) checked.push({ file: ctx.t("facilities.allCatalogs"), id: null, errors: crossCatalog.filter((i) => i.severity === "error"), warnings: crossCatalog.filter((i) => i.severity === "warning") });
    for (const { def, file } of content.templates.values()) {
      const issues = checkRoomTemplate(def, catalogs);
      checked.push({ file, id: def.id, errors: issues.filter((i) => i.severity === "error"), warnings: issues.filter((i) => i.severity === "warning") });
    }
    for (const { def, file } of content.facilities.values()) {
      const used = catalogs.filter((c) => def.catalogs.includes(c.id));
      const issues = checkFacility(def, used);
      // Cases this facility could host (a slot accepts their setting) but not complete: a warning per pair
      // (the web does not offer the facility for them; the CLI/MCP refuse the missing items there).
      for (const { def: c } of content.cases.values()) {
        if (!def.patientSlots.some((slot) => slot.accepts.includes(c.setting))) continue;
        const blocking = caseCapabilityGaps(c, def, used.length > 0 ? used : catalogs).filter((g) => g.blocking);
        if (blocking.length > 0) {
          issues.push({ path: "patientSlots", message: `cannot complete case "${c.id}": ${blocking.map((g) => `${g.id} needs ${g.missing.join("+")}`).join(", ")}`, severity: "warning" });
        }
      }
      checked.push({ file, id: def.id, errors: issues.filter((i) => i.severity === "error"), warnings: issues.filter((i) => i.severity === "warning") });
    }
    for (const f of content.issues) {
      if (f.file.endsWith("case.json")) continue;
      const existing = checked.find((c) => c.file === f.file);
      const errors = f.issues.filter((i) => i.severity === "error");
      const warnings = f.issues.filter((i) => i.severity === "warning");
      if (existing) {
        existing.errors.push(...errors);
        existing.warnings.push(...warnings);
      } else checked.push({ file: f.file, id: null, errors, warnings });
    }
  } else {
    for (const target of args.positionals) {
      const file = ctx.path(target);
      const json = await readJson(file);
      if (!json.ok) {
        checked.push({ file, id: null, errors: [json.issue], warnings: [] });
        continue;
      }
      const schema = (json.value as { schema?: unknown })?.schema;
      if (schema === "clinicalcraft/equipment-catalog@1") {
        const parsed = parseCatalog(json.value);
        checked.push(parsed.ok ? { file, id: parsed.value.id, errors: [], warnings: parsed.warnings } : { file, id: null, errors: parsed.issues.filter((i) => i.severity === "error"), warnings: [] });
        continue;
      }
      if (schema === ROOM_TEMPLATE_SCHEMA_ID) {
        const parsed = parseRoomTemplate(json.value);
        if (!parsed.ok) {
          checked.push({ file, id: null, errors: parsed.issues.filter((i) => i.severity === "error"), warnings: parsed.issues.filter((i) => i.severity === "warning") });
          continue;
        }
        const issues = [...parsed.warnings, ...checkRoomTemplate(parsed.value, catalogs)];
        checked.push({ file, id: parsed.value.id, errors: issues.filter((i) => i.severity === "error"), warnings: issues.filter((i) => i.severity === "warning") });
        continue;
      }
      const parsed = parseFacility(json.value);
      if (!parsed.ok) {
        checked.push({ file, id: null, errors: parsed.issues.filter((i) => i.severity === "error"), warnings: parsed.issues.filter((i) => i.severity === "warning") });
        continue;
      }
      // room templates placed by the facility: compiled with the loaded ones (content directories)
      const compiled = compileFacility(parsed.value, [...content.templates.values()].map((x) => x.def));
      const issues = [...parsed.warnings, ...compiled.issues, ...checkFacility(compiled.facility, catalogs.filter((c) => compiled.facility.catalogs.includes(c.id)))];
      checked.push({ file, id: parsed.value.id, errors: issues.filter((i) => i.severity === "error"), warnings: issues.filter((i) => i.severity === "warning") });
    }
  }

  const failed = checked.filter((c) => c.errors.length > 0).length;
  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify(checked.map((c) => ({ ...c, ok: c.errors.length === 0 })), null, 2));
    return failed > 0 ? EXIT.error : EXIT.ok;
  }
  const p = ctx.out;
  for (const c of checked) {
    const label = c.errors.length === 0 ? p.green("✓") : p.red("✗");
    ctx.print(`${label} ${sanitizeTerminal(isAbsolute(c.file) ? ctx.show(c.file) : c.file)}${c.id ? p.dim(` (${sanitizeTerminal(c.id)})`) : ""} ${p.dim(ctx.t("cases.counts", { errors: c.errors.length, warnings: c.warnings.length }))}`);
    for (const i of [...c.errors, ...(flagBool(args, "quiet") ? [] : c.warnings)].slice(0, 50)) {
      ctx.print(`    ${i.severity === "error" ? p.red("error  ") : p.yellow("warning")} ${p.dim(sanitizeTerminal(i.path || "(root)"))} ${sanitizeTerminal(i.message)}`);
    }
  }
  ctx.print(failed > 0 ? p.red(ctx.t("facilities.failed", { failed, total: checked.length })) : p.green(ctx.t("facilities.ok", { total: checked.length })));
  return failed > 0 ? EXIT.error : EXIT.ok;
}

/**
 * `clinicalcraft facilities compile <id | file>`: the flat facility a
 * front-end loads — room-template instances expanded (`compileFacility`)
 * with the templates of the content directories. Prints JSON (or writes
 * `--out`); fails when the facility does not compile.
 */
export async function facilitiesCompile(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const target = args.positionals[0];
  if (!target) throw new UsageError(ctx.t("facilities.compileUsage"));
  const settings = await loadCliSettings(ctx);
  const content = await loadContent({ dirs: settings.contentDirs, cases: false });
  let facility = content.facilities.get(target)?.def;
  if (!facility) {
    const file = ctx.path(target);
    if (!existsSync(file)) throw new CliError(ctx.t("facilities.unknown", { id: target }), EXIT.usage, ctx.t("facilities.available", { list: [...content.facilities.keys()].join(", ") }));
    const json = await readJson(file);
    if (!json.ok) throw new CliError(`${file}: ${json.issue.message}`, EXIT.error);
    const parsed = parseFacility(json.value);
    if (!parsed.ok) throw new CliError(`${file}: ${parsed.issues.map((i) => `${i.path || "(root)"} ${i.message}`).slice(0, 5).join("; ")}`, EXIT.error);
    const compiled = compileFacility(parsed.value, [...content.templates.values()].map((x) => x.def));
    const errors = compiled.issues.filter((i) => i.severity === "error");
    if (errors.length) throw new CliError(ctx.t("facilities.compileFailed", { file, errors: errors.length }), EXIT.error, errors.slice(0, 8).map((i) => `${i.path}: ${i.message}`).join("\n"));
    facility = compiled.facility;
  }
  const text = JSON.stringify(facility, null, 2);
  const out = flagString(args, "out");
  if (out) await writeFile(ctx.path(out), `${text}\n`, "utf8");
  else ctx.print(text);
  return EXIT.ok;
}
