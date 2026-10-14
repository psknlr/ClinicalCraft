/**
 * `clinicalcraft import-v4 <files…> [--dest dir]` — install the local-only
 * assets of the Virtual Patient V4 package (docs/ASSETS.md).
 *
 * Accepts the merged V4 html, its `.part01`/`.part02` halves (concatenated in
 * order) or the two zip archives that carry them. When the full html is
 * reconstructed its SHA-256 is checked (a mismatch is a warning). The
 * `window.CASE_DATA = {…}` object of the first script yields:
 *
 *   <dest>/anatomy/anatomy.glb.gz                  (model, base64-decoded, still gzip)
 *   <dest>/anatomy/catalog.json                    (organ catalog)
 *   <dest>/cases/smzl-lung-adeno/fig<n>.png        (case figures)
 *   <dest>/cases/smzl-lung-adeno/source_case_report.pdf
 *   <dest>/manifest.json                           (sha256 + size of every file)
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { clinicalcraftHome } from "@clinicalcraft/agent/node";
import { flagString, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, type CliContext } from "./context.js";
import { cliVersion } from "./paths.js";
import { listZip, readZipEntry, ZipError } from "./zip.js";

/** SHA-256 of the original `Virtual_Patient_V4(1).html` (43,519,453 bytes). */
export const V4_SHA256 = "ed01e8309970ace3d3764c9a39df14b38efe2ba97e336ed475664375e34ad9b9";
/** The V4 case the figures and PDF belong to. */
export const V4_CASE_ID = "smzl-lung-adeno";

type Kind = { kind: "html" } | { kind: "part"; base: string; index: number } | { kind: "zip" } | { kind: "other" };

/** Classify an input or archive entry by its file name. */
export function classifyName(name: string): Kind {
  const file = basename(name);
  const part = /^(.*)\.part(\d+)$/i.exec(file);
  if (part) return { kind: "part", base: part[1]!, index: Number(part[2]) };
  if (/\.html?$/i.test(file)) return { kind: "html" };
  if (/\.zip$/i.test(file)) return { kind: "zip" };
  return { kind: "other" };
}

interface Piece {
  name: string;
  origin: string;
  data: Buffer;
}

export interface CollectedInputs {
  html: Piece | null;
  parts: Map<string, Map<number, Piece>>;
  ignored: string[];
}

/** Read inputs (unpacking zips) into html / part pieces. */
export async function collectInputs(files: readonly string[]): Promise<CollectedInputs> {
  const out: CollectedInputs = { html: null, parts: new Map(), ignored: [] };
  const add = (name: string, origin: string, data: Buffer) => {
    const k = classifyName(name);
    if (k.kind === "html") {
      if (!out.html || data.length > out.html.data.length) out.html = { name: basename(name), origin, data };
    } else if (k.kind === "part") {
      const group = out.parts.get(k.base) ?? new Map<number, Piece>();
      group.set(k.index, { name: basename(name), origin, data });
      out.parts.set(k.base, group);
    } else out.ignored.push(origin);
  };
  for (const file of files) {
    const data = await readFile(file);
    if (classifyName(file).kind === "zip" || data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
      for (const entry of listZip(data)) {
        if (entry.isDirectory) continue;
        const k = classifyName(entry.name);
        if (k.kind === "html" || k.kind === "part") add(entry.name, `${basename(file)}:${entry.name}`, readZipEntry(data, entry));
        else out.ignored.push(`${basename(file)}:${entry.name}`);
      }
    } else add(file, file, data);
  }
  return out;
}

/** Concatenate parts in numeric order; throws when a part is missing. */
export function joinParts(group: Map<number, Piece>): { data: Buffer; names: string[] } {
  const indices = [...group.keys()].sort((a, b) => a - b);
  const first = indices[0] ?? 1;
  const missing: number[] = [];
  for (let i = Math.min(first, 1); i <= indices[indices.length - 1]!; i++) if (!group.has(i)) missing.push(i);
  if (missing.length > 0) throw new Error(`missing part ${missing.map((i) => String(i).padStart(2, "0")).join(", ")}`);
  return { data: Buffer.concat(indices.map((i) => group.get(i)!.data)), names: indices.map((i) => group.get(i)!.name) };
}

/** Text of `window.CASE_DATA = {…}` up to the closing `</script>` (null when absent). */
export function extractCaseDataJson(html: Buffer | string): string | null {
  const text = typeof html === "string" ? html : html.toString("utf8");
  const marker = /window\.CASE_DATA\s*=\s*/.exec(text);
  if (!marker) return null;
  const start = marker.index + marker[0].length;
  const end = text.indexOf("</script>", start);
  if (end < 0) return null;
  return text.slice(start, end).trim().replace(/;\s*$/, "");
}

/** Decode base64 (optionally a `data:` URL). */
export function decodeBase64(value: string): Buffer {
  return Buffer.from(value.replace(/^data:[^,]*,/, "").replace(/\s+/g, ""), "base64");
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function human(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const GZIP = Buffer.from([0x1f, 0x8b]);

export interface ManifestFile {
  path: string;
  bytes: number;
  sha256: string;
}

export interface ImportResult {
  dest: string;
  files: ManifestFile[];
  sha256: string;
  verified: boolean;
  warnings: string[];
}

async function writeAtomic(file: string, data: Buffer | string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

/** Import from already-collected inputs (used by the command and tests). */
export async function importV4(inputs: CollectedInputs, dest: string, origins: readonly string[]): Promise<ImportResult> {
  const warnings: string[] = [];
  let html: Buffer;
  let reconstructed: string[];
  if (inputs.html) {
    html = inputs.html.data;
    reconstructed = [inputs.html.origin];
  } else {
    if (inputs.parts.size === 0) throw new Error("no V4 html, .partNN file or zip containing one was given");
    if (inputs.parts.size > 1) throw new Error(`parts of different files were given: ${[...inputs.parts.keys()].join(", ")}`);
    const joined = joinParts([...inputs.parts.values()][0]!);
    html = joined.data;
    reconstructed = joined.names;
  }
  const digest = sha256(html);
  const verified = digest === V4_SHA256;
  if (!verified) warnings.push(`SHA-256 ${digest} does not match the V4 release (${V4_SHA256})`);

  const json = extractCaseDataJson(html);
  if (json === null) throw new Error("window.CASE_DATA not found (incomplete file? pass every .partNN part)");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`window.CASE_DATA is not valid JSON (${(err as Error).message}); pass every .partNN part`);
  }

  const files: ManifestFile[] = [];
  const put = async (rel: string, bytes: Buffer | string) => {
    const buf = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : bytes;
    await writeAtomic(join(dest, rel), buf);
    files.push({ path: rel, bytes: buf.length, sha256: sha256(buf) });
  };

  if (typeof data.model === "string" && data.model) {
    let model = decodeBase64(data.model);
    if (!model.subarray(0, 2).equals(GZIP)) {
      warnings.push("anatomy model was not gzip-compressed; compressed it");
      model = gzipSync(model);
    }
    await put("anatomy/anatomy.glb.gz", model);
  } else warnings.push("CASE_DATA.model is missing — anatomy model not installed");

  if (Array.isArray(data.catalog)) await put("anatomy/catalog.json", `${JSON.stringify(data.catalog, null, 2)}\n`);
  else warnings.push("CASE_DATA.catalog is missing — organ catalog not installed");

  const images = data.images && typeof data.images === "object" ? (data.images as Record<string, unknown>) : null;
  if (images) {
    const keys = Object.keys(images)
      .filter((k) => typeof images[k] === "string")
      .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
    for (const key of keys) {
      const n = /^\d+$/.test(key) ? key : key.replace(/[^A-Za-z0-9_-]/g, "_");
      const img = decodeBase64(images[key] as string);
      if (!img.subarray(0, 4).equals(PNG)) warnings.push(`figure ${key} is not a PNG image`);
      await put(`cases/${V4_CASE_ID}/fig${n}.png`, img);
    }
  } else warnings.push("CASE_DATA.images is missing — case figures not installed");

  if (typeof data.pdf === "string" && data.pdf) {
    const pdf = decodeBase64(data.pdf);
    if (!pdf.subarray(0, 4).equals(Buffer.from("%PDF"))) warnings.push("source report is not a PDF");
    await put(`cases/${V4_CASE_ID}/source_case_report.pdf`, pdf);
  } else warnings.push("CASE_DATA.pdf is missing — source case report not installed");

  if (files.length === 0) throw new Error("CASE_DATA contained no installable assets");

  const manifest = {
    format: "clinicalcraft-local-assets@1",
    importer: `clinicalcraft import-v4 ${cliVersion()}`,
    importedAt: new Date().toISOString(),
    source: { inputs: origins.map((o) => basename(o)), reconstructedFrom: reconstructed.map((o) => basename(o)), sha256: digest, expectedSha256: V4_SHA256, verified },
    notices: [
      "SMZL case figures and source PDF: © original rights holders (Chinese Medical Association journal) — local teaching use only; do not redistribute.",
      "Anatomy model and organ catalog: Z-Anatomy / BodyParts3D, CC BY-SA 4.0 (attribution required).",
    ],
    files: [...files],
  };
  await writeAtomic(join(dest, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { dest, files, sha256: digest, verified, warnings };
}

export async function runImportV4(ctx: CliContext, args: ParsedArgs): Promise<number> {
  if (args.positionals.length === 0) throw new UsageError(ctx.t("import.needFiles"));
  const destFlag = flagString(args, "dest");
  const dest = destFlag ? ctx.path(destFlag) : join(clinicalcraftHome(ctx.env), "assets");
  const files = args.positionals.map((f) => ctx.path(f));
  const p = ctx.out;
  let inputs: CollectedInputs;
  try {
    inputs = await collectInputs(files);
  } catch (err) {
    if (err instanceof ZipError) throw new CliError(ctx.t("import.zipError", { message: err.message }), EXIT.error);
    throw new CliError(ctx.t("import.readError", { message: (err as Error).message }), EXIT.error);
  }
  for (const ignored of inputs.ignored) ctx.debug(`ignored ${ignored}`);
  let result: ImportResult;
  try {
    result = await importV4(inputs, dest, files);
  } catch (err) {
    throw new CliError(ctx.t("import.failed", { message: (err as Error).message }), EXIT.error);
  }
  ctx.print(result.verified ? p.green(`✓ ${ctx.t("import.verified", { sha: result.sha256.slice(0, 16) })}`) : p.yellow(`⚠ ${ctx.t("import.unverified", { sha: result.sha256 })}`));
  for (const w of result.warnings.filter((w) => !w.startsWith("SHA-256"))) ctx.print(p.yellow(`⚠ ${w}`));
  ctx.print(p.bold(ctx.t("import.installed", { dest: result.dest })));
  for (const f of result.files) ctx.print(`  ${f.path} ${p.dim(`(${human(f.bytes)}, sha256 ${f.sha256.slice(0, 12)}…)`)}`);
  ctx.print(`  manifest.json`);
  ctx.print();
  ctx.print(p.dim(ctx.t("import.copyright")));
  const rel = relative(ctx.cwd, dest);
  if (!rel.startsWith("..") && rel !== "" && !dest.includes(".clinicalcraft")) ctx.print(p.yellow(ctx.t("import.noCommit", { dest: rel })));
  return EXIT.ok;
}
