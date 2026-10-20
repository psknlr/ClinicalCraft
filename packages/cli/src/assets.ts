/**
 * `clinicalcraft assets inspect <file.glb>` (docs/ASSETS.md): describe a
 * GLB/glTF model without a renderer — container, counts, bounding box,
 * extensions, SHA-256 — and with `--type <equipment type>` check it against
 * that type's catalog `model` reference and semantic footprint (scale,
 * licence, attribution, pinned hash, loadable extensions). Exit 1 when the
 * file is unreadable or the check finds an error.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { checkModelReference, GlbError, parseGlb, t, type AssetIssue, type EquipmentType } from "@clinicalcraft/core";
import { loadContent } from "@clinicalcraft/agent/node";
import { sanitizeTerminal, table } from "@clinicalcraft/agent";
import { flagBool, flagString, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";

const num3 = (x: number) => (Math.abs(x) < 5e-7 ? 0 : x).toFixed(3);
/** A size: "w × h × d". */
const fmt3 = (v: readonly number[]) => v.map(num3).join(" × ");
/** A point: "(x, y, z)". */
const pt3 = (v: readonly number[]) => `(${v.map(num3).join(", ")})`;

export async function assetsInspect(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const target = args.positionals[0];
  if (!target) throw new UsageError(ctx.t("assets.usage"));
  const file = ctx.path(target);
  if (!existsSync(file)) throw new CliError(ctx.t("assets.missing", { file: target }), EXIT.usage);
  const bytes = new Uint8Array(await readFile(file));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  let info;
  try {
    info = parseGlb(bytes);
  } catch (e) {
    if (e instanceof GlbError) throw new CliError(ctx.t("assets.unreadable", { file: target, reason: e.message }), EXIT.error);
    throw e;
  }
  // the catalog reference to check against (--type <equipment type id>)
  const typeId = flagString(args, "type");
  let type: EquipmentType | undefined;
  let catalog: string | undefined;
  if (typeId) {
    const settings = await loadCliSettings(ctx);
    const content = await loadContent({ dirs: settings.contentDirs, cases: false });
    for (const { def } of content.catalogs.values()) {
      const hit = def.equipment.find((e) => e.id === typeId);
      if (hit) {
        type = hit;
        catalog = def.id;
      }
    }
    if (!type) throw new CliError(ctx.t("assets.unknownType", { id: typeId }), EXIT.usage);
    if (!type.model) throw new CliError(ctx.t("assets.noModel", { id: typeId, catalog: catalog ?? "" }), EXIT.usage);
  }
  const issues: AssetIssue[] = type?.model ? checkModelReference(info, type.model, type.footprint, { sha256, draco: flagBool(args, "draco") }) : info.issues;
  const errors = issues.filter((i) => i.severity === "error").length;

  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify({ file: target, bytes: bytes.byteLength, sha256, ...info, issues, ...(type ? { type: type.id, catalog, model: type.model, footprint: type.footprint } : {}) }, null, 2));
    return errors ? EXIT.error : EXIT.ok;
  }
  const c = info.counts;
  const rows: string[][] = [
    [ctx.t("assets.file"), sanitizeTerminal(target)],
    [ctx.t("assets.container"), `${info.container.toUpperCase()} v${info.version} · ${bytes.byteLength} B${info.chunks.length ? ` · ${info.chunks.map((ch) => `${ch.type} ${ch.length} B`).join(", ")}` : ""}`],
    ["sha256", sha256],
    [ctx.t("assets.asset"), [`glTF ${info.asset.version}`, info.asset.generator ? sanitizeTerminal(info.asset.generator) : "", info.asset.copyright ? `© ${sanitizeTerminal(info.asset.copyright)}` : ""].filter(Boolean).join(" · ")],
    [ctx.t("assets.counts"), `${c.scenes} scene(s), ${c.nodes} node(s), ${c.meshes} mesh(es), ${c.primitives} primitive(s), ${c.triangles} triangle(s), ${c.vertices} vertices, ${c.materials} material(s), ${c.textures} texture(s), ${c.images} image(s), ${c.animations} animation(s), ${c.skins} skin(s)`],
    [ctx.t("assets.bounds"), info.bounds ? `${fmt3(info.bounds.size)} m · min ${pt3(info.bounds.min)} · max ${pt3(info.bounds.max)}` : "—"],
    [ctx.t("assets.extensions"), [...info.extensionsUsed.map((e) => (info.extensionsRequired.includes(e) ? `${e} (required)` : e)), ...info.extensionsRequired.filter((e) => !info.extensionsUsed.includes(e)).map((e) => `${e} (required)`)].join(", ") || "—"],
  ];
  if (type?.model) {
    const fp = type.footprint;
    rows.push([ctx.t("assets.reference"), `${type.id} (${catalog}) · ${t(type.name, ctx.locale)} · footprint ${fmt3([fp.w, fp.h, fp.d])} m (w × h × d) · ${type.model.license}`]);
  }
  ctx.print(table(rows, { maxCell: 160 }));
  const p = ctx.out;
  for (const i of issues) {
    const tag = i.severity === "error" ? p.red("error  ") : i.severity === "warning" ? p.yellow("warning") : p.dim("info   ");
    ctx.print(`    ${tag} ${p.dim(i.code)} ${sanitizeTerminal(i.message)}`);
  }
  if (!errors) ctx.print(p.green(ctx.t(type ? "assets.okReference" : "assets.ok")));
  else ctx.print(p.red(ctx.t("assets.failed", { errors })));
  return errors ? EXIT.error : EXIT.ok;
}
