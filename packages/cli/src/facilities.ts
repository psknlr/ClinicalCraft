/**
 * `clinicalcraft facilities list|validate`.
 */
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { checkCatalogs, checkFacility, parseCatalog, parseFacility, t, type EquipmentCatalog, type Issue } from "@clinicalcraft/core";
import { loadContent } from "@clinicalcraft/agent/node";
import { table } from "@clinicalcraft/agent";
import { flagBool, type ParsedArgs } from "./argv.js";
import { EXIT, loadCliSettings, type CliContext } from "./context.js";

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
  for (const { def } of facilities) rows.push([def.id, t(def.name, ctx.locale), def.catalogs.join(", "), String(def.rooms.length), String(def.patientSlots.length), String(def.placements.length)]);
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
    for (const { def, file } of content.facilities.values()) {
      const used = catalogs.filter((c) => def.catalogs.includes(c.id));
      const issues = checkFacility(def, used);
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
      const parsed = parseFacility(json.value);
      if (!parsed.ok) {
        checked.push({ file, id: null, errors: parsed.issues.filter((i) => i.severity === "error"), warnings: parsed.issues.filter((i) => i.severity === "warning") });
        continue;
      }
      const issues = [...parsed.warnings, ...checkFacility(parsed.value, catalogs.filter((c) => parsed.value.catalogs.includes(c.id)))];
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
    ctx.print(`${label} ${relative(ctx.cwd, c.file) || c.file}${c.id ? p.dim(` (${c.id})`) : ""} ${p.dim(ctx.t("cases.counts", { errors: c.errors.length, warnings: c.warnings.length }))}`);
    for (const i of [...c.errors, ...(flagBool(args, "quiet") ? [] : c.warnings)].slice(0, 50)) {
      ctx.print(`    ${i.severity === "error" ? p.red("error  ") : p.yellow("warning")} ${p.dim(i.path || "(root)")} ${i.message}`);
    }
  }
  ctx.print(failed > 0 ? p.red(ctx.t("facilities.failed", { failed, total: checked.length })) : p.green(ctx.t("facilities.ok", { total: checked.length })));
  return failed > 0 ? EXIT.error : EXIT.ok;
}
