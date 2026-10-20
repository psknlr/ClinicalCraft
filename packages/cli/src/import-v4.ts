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
import type { MsgKey } from "./i18n.js";
import { cliVersion } from "./paths.js";
import { sanitizeTerminal } from "./render.js";
import { listZip, readZipEntry, ZipError } from "./zip.js";

/** SHA-256 of the original `Virtual_Patient_V4(1).html` (43,519,453 bytes). */
export const V4_SHA256 = "ed01e8309970ace3d3764c9a39df14b38efe2ba97e336ed475664375e34ad9b9";
/** The V4 case the figures and PDF belong to. */
export const V4_CASE_ID = "smzl-lung-adeno";

/** Why an import failed (`message` keeps technical English detail; front-ends localise by `code`). */
export type ImportErrorCode = "no-input" | "mixed-parts" | "missing-part" | "no-case-data" | "bad-case-data" | "no-assets";

/** An import failure with a stable code and the values its message needs. */
export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    message: string,
    readonly params: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ImportError";
  }
}

/** Non-fatal import findings (the manifest and `warnings` keep the English `message`). */
export type ImportWarningCode = "sha-mismatch" | "model-not-gzip" | "model-missing" | "catalog-missing" | "images-missing" | "figure-not-png" | "pdf-not-pdf" | "pdf-missing";

export interface ImportWarning {
  code: ImportWarningCode;
  params: Record<string, string>;
  message: string;
}

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

/** Total bytes `collectInputs` inflates from all zip archives together (the V4 html is ~43.5 MB). */
export const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
/** Most html/partNN entries `collectInputs` inflates from zip archives (V4 ships two). */
export const MAX_ZIP_PIECES = 16;

export interface CollectOptions {
  /** Cumulative inflated-byte budget across every zip entry (default `MAX_ARCHIVE_BYTES`). */
  maxTotalBytes?: number;
  /** Most html/part entries taken from zips (default `MAX_ZIP_PIECES`). */
  maxPieces?: number;
}

/**
 * Read inputs (unpacking zips) into html / part pieces. Zip entries are
 * inflated against one cumulative budget and at most `maxPieces` of them are
 * taken (`ZipError` otherwise), so a small crafted archive cannot exhaust memory.
 */
export async function collectInputs(files: readonly string[], options: CollectOptions = {}): Promise<CollectedInputs> {
  const out: CollectedInputs = { html: null, parts: new Map(), ignored: [] };
  const budget = options.maxTotalBytes ?? MAX_ARCHIVE_BYTES;
  const maxPieces = options.maxPieces ?? MAX_ZIP_PIECES;
  let inflated = 0;
  let pieces = 0;
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
      for (const entry of zipEntries(file, data)) {
        if (entry.isDirectory) continue;
        const k = classifyName(entry.name);
        if (k.kind === "html" || k.kind === "part") {
          if (++pieces > maxPieces) throw withFile(new ZipError(`too many html/part entries in the archives (more than ${maxPieces})`, "limit"), file);
          const remaining = budget - inflated;
          if (entry.size > remaining) throw withFile(new ZipError(`the archives inflate to more than the ${human(budget)} budget (at ${entry.name})`, "limit"), file);
          let piece: Buffer;
          try {
            piece = readZipEntry(data, entry, remaining);
          } catch (err) {
            throw err instanceof ZipError ? withFile(err, file) : err;
          }
          inflated += piece.length;
          add(entry.name, `${basename(file)}:${entry.name}`, piece);
        } else out.ignored.push(`${basename(file)}:${entry.name}`);
      }
    } else add(file, file, data);
  }
  return out;
}

function withFile(err: ZipError, file: string): ZipError {
  err.file ??= file;
  return err;
}

function zipEntries(file: string, data: Buffer) {
  try {
    return listZip(data);
  } catch (err) {
    throw err instanceof ZipError ? withFile(err, file) : err;
  }
}

/** Concatenate parts in numeric order; throws when a part is missing. */
export function joinParts(group: Map<number, Piece>): { data: Buffer; names: string[] } {
  const indices = [...group.keys()].sort((a, b) => a - b);
  const first = indices[0] ?? 1;
  const missing: number[] = [];
  for (let i = Math.min(first, 1); i <= indices[indices.length - 1]!; i++) if (!group.has(i)) missing.push(i);
  if (missing.length > 0) {
    const parts = missing.map((i) => String(i).padStart(2, "0")).join(", ");
    throw new ImportError("missing-part", `missing part ${parts}`, { parts });
  }
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
  /** English warning texts (same order as `notices`). */
  warnings: string[];
  /** The warnings with stable codes, for localised output. */
  notices: ImportWarning[];
}

async function writeAtomic(file: string, data: Buffer | string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

/** Import from already-collected inputs (used by the command and tests). */
export async function importV4(inputs: CollectedInputs, dest: string, origins: readonly string[]): Promise<ImportResult> {
  const notices: ImportWarning[] = [];
  const warn = (code: ImportWarningCode, message: string, params: Record<string, string> = {}) => void notices.push({ code, params, message });
  let html: Buffer;
  let reconstructed: string[];
  if (inputs.html) {
    html = inputs.html.data;
    reconstructed = [inputs.html.origin];
  } else {
    if (inputs.parts.size === 0) throw new ImportError("no-input", "no V4 html, .partNN file or zip containing one was given");
    if (inputs.parts.size > 1) {
      const list = [...inputs.parts.keys()].join(", ");
      throw new ImportError("mixed-parts", `parts of different files were given: ${list}`, { list });
    }
    const joined = joinParts([...inputs.parts.values()][0]!);
    html = joined.data;
    reconstructed = joined.names;
  }
  const digest = sha256(html);
  const verified = digest === V4_SHA256;
  if (!verified) warn("sha-mismatch", `SHA-256 ${digest} does not match the V4 release (${V4_SHA256})`, { sha: digest });

  const json = extractCaseDataJson(html);
  if (json === null) throw new ImportError("no-case-data", "window.CASE_DATA not found (incomplete file? pass every .partNN part)");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(json) as Record<string, unknown>;
  } catch (err) {
    throw new ImportError("bad-case-data", `window.CASE_DATA is not valid JSON (${(err as Error).message}); pass every .partNN part`);
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
      warn("model-not-gzip", "anatomy model was not gzip-compressed; compressed it");
      model = gzipSync(model);
    }
    await put("anatomy/anatomy.glb.gz", model);
  } else warn("model-missing", "CASE_DATA.model is missing — anatomy model not installed");

  if (Array.isArray(data.catalog)) await put("anatomy/catalog.json", `${JSON.stringify(data.catalog, null, 2)}\n`);
  else warn("catalog-missing", "CASE_DATA.catalog is missing — organ catalog not installed");

  const images = data.images && typeof data.images === "object" ? (data.images as Record<string, unknown>) : null;
  if (images) {
    const keys = Object.keys(images)
      .filter((k) => typeof images[k] === "string")
      .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
    for (const key of keys) {
      const n = /^\d+$/.test(key) ? key : key.replace(/[^A-Za-z0-9_-]/g, "_");
      const img = decodeBase64(images[key] as string);
      if (!img.subarray(0, 4).equals(PNG)) warn("figure-not-png", `figure ${key} is not a PNG image`, { key });
      await put(`cases/${V4_CASE_ID}/fig${n}.png`, img);
    }
  } else warn("images-missing", "CASE_DATA.images is missing — case figures not installed");

  if (typeof data.pdf === "string" && data.pdf) {
    const pdf = decodeBase64(data.pdf);
    if (!pdf.subarray(0, 4).equals(Buffer.from("%PDF"))) warn("pdf-not-pdf", "source report is not a PDF");
    await put(`cases/${V4_CASE_ID}/source_case_report.pdf`, pdf);
  } else warn("pdf-missing", "CASE_DATA.pdf is missing — source case report not installed");

  if (files.length === 0) throw new ImportError("no-assets", "CASE_DATA contained no installable assets");

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
  return { dest, files, sha256: digest, verified, warnings: notices.map((n) => n.message), notices };
}

const IMPORT_ERROR_KEYS: Record<ImportErrorCode, MsgKey> = {
  "no-input": "import.noV4Input",
  "mixed-parts": "import.mixedParts",
  "missing-part": "import.missingPart",
  "no-case-data": "import.noCaseData",
  "bad-case-data": "import.badCaseData",
  "no-assets": "import.noAssets",
};

/**
 * Localised text for a failure while reading the inputs: a missing or
 * unreadable file, or an archive this reader cannot handle. Unknown errors
 * keep their (sanitised) message.
 */
export function inputErrorText(ctx: Pick<CliContext, "t" | "show">, err: unknown): string {
  if (err instanceof ZipError) {
    const file = err.file ? sanitizeTerminal(ctx.show(err.file)) : "zip";
    if (err.kind === "unsupported") return ctx.t("import.zipUnsupported", { file });
    if (err.kind === "limit") return ctx.t("import.zipLimit", { limit: human(MAX_ARCHIVE_BYTES), pieces: MAX_ZIP_PIECES });
    return ctx.t("import.zipInvalid", { file });
  }
  const e = err as NodeJS.ErrnoException;
  const file = typeof e?.path === "string" ? sanitizeTerminal(ctx.show(e.path)) : "";
  if (e?.code === "ENOENT") return ctx.t("import.notFound", { file });
  if (e?.code === "EACCES" || e?.code === "EPERM") return ctx.t("import.noAccess", { file });
  if (e?.code === "EISDIR") return ctx.t("import.isDirectory", { file });
  return ctx.t("import.readError", { message: sanitizeTerminal(e?.message ?? String(err)) });
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
    // The raw (English, errno) detail only with --verbose; archive entry names are untrusted: sanitised.
    ctx.debug(sanitizeTerminal((err as Error)?.message ?? String(err)));
    throw new CliError(inputErrorText(ctx, err), EXIT.error);
  }
  for (const ignored of inputs.ignored) ctx.debug(`ignored ${sanitizeTerminal(ignored)}`);
  let result: ImportResult;
  try {
    result = await importV4(inputs, dest, files);
  } catch (err) {
    ctx.debug(sanitizeTerminal((err as Error)?.message ?? String(err)));
    const reason = err instanceof ImportError ? ctx.t(IMPORT_ERROR_KEYS[err.code], err.params) : sanitizeTerminal((err as Error).message);
    throw new CliError(ctx.t("import.failed", { message: reason }), EXIT.error);
  }
  ctx.print(result.verified ? p.green(`✓ ${ctx.t("import.verified", { sha: result.sha256.slice(0, 16) })}`) : p.yellow(`⚠ ${ctx.t("import.unverified", { sha: result.sha256 })}`));
  for (const n of result.notices.filter((n) => n.code !== "sha-mismatch")) {
    // Figure keys come from the (untrusted) input file: no terminal control sequences.
    const params = Object.fromEntries(Object.entries(n.params).map(([k, v]) => [k, sanitizeTerminal(v)]));
    ctx.print(p.yellow(`⚠ ${ctx.t(`import.warn.${n.code}` as MsgKey, params)}`));
  }
  ctx.print(p.bold(ctx.t("import.installed", { dest: result.dest })));
  for (const f of result.files) ctx.print(`  ${f.path} ${p.dim(`(${human(f.bytes)}, sha256 ${f.sha256.slice(0, 12)}…)`)}`);
  ctx.print(`  manifest.json`);
  ctx.print();
  ctx.print(p.dim(ctx.t("import.copyright")));
  const rel = relative(ctx.cwd, dest);
  if (!rel.startsWith("..") && rel !== "" && !dest.includes(".clinicalcraft")) ctx.print(p.yellow(ctx.t("import.noCommit", { dest: rel })));
  return EXIT.ok;
}
