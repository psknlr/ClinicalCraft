/**
 * Install the user's downloaded CMCR papers and figures locally; never fetch or publish them.
 *
 *   node scripts/install-cmcr-assets.mjs "<source directory>" [cmcr-20|cmcr-105] [--dry-run]
 *
 * The source directory is the user's download: `<articleId>.pdf` and `media/<articleId>/figNN_*.png`.
 * Only the local-only assets the collection's cases list are copied, into the git-ignored
 * `assets/local/cases/<caseId>/`, and only when every one of them passes (nothing is copied otherwise):
 * - never a withdrawn file (scripts/cmcr-withdrawn-assets.json), matched by name or by checksum;
 * - cmcr-105: only a file the media review (scripts/cmcr-105-media-review.json) approves, the case giving
 *   the approved sha256 and the source bytes having it;
 * - cmcr-20: the case's sha256 when it gives one;
 * - a PNG or PDF signature; an existing local copy that differs is never overwritten.
 * First of all, a copy of a withdrawn file that an earlier version installed is removed — only when its
 * bytes are the withdrawn file's — so privacy clean-up never depends on the install succeeding.
 * `--dry-run` checks everything and reports what would happen, writing and removing nothing.
 * Exit codes: 0 done, 1 refused or incomplete (the message says why), 2 usage.
 * Docs: docs/CMCR_CASES.md (Local media), docs/CMCR_105_CASES.md (Local media), docs/ASSETS.md.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = 'Usage: node scripts/install-cmcr-assets.mjs "<source directory>" [cmcr-20|cmcr-105] [--dry-run]';
const COLLECTIONS = ["cmcr-20", "cmcr-105"];
const CASE_ID = /^cmcr-\d+$/;
const SHA256 = /^[a-f0-9]{64}$/;
/** The file an asset of each kind installs as. */
const FILE_OF_KIND = { pdf: /^source\.pdf$/, image: /^fig\d{2}\.png$/ };
const installable = (kind) => Object.hasOwn(FILE_OF_KIND, kind);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** A refusal, raised before anything is copied: the run stops with this message. */
class Refused extends Error {}

const sha256Of = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const readIfPresent = (file) => readFile(file).catch((e) => { if (e.code === "ENOENT") return null; throw e; });
const isDirectory = (dir) => stat(dir).then((s) => s.isDirectory(), () => false);

/** The withdrawn list, checked: a malformed entry would weaken the privacy refusal, so it stops the run. */
async function loadWithdrawn(root) {
  const { withdrawn } = await readJson(path.join(root, "scripts/cmcr-withdrawn-assets.json"));
  if (!Array.isArray(withdrawn)) throw new Refused("scripts/cmcr-withdrawn-assets.json has no withdrawn list");
  for (const w of withdrawn) {
    if (!CASE_ID.test(w.case) || !Object.values(FILE_OF_KIND).some((re) => re.test(w.file)) || !SHA256.test(w.sha256)) {
      throw new Refused(`Malformed entry in scripts/cmcr-withdrawn-assets.json: ${JSON.stringify(w)}`);
    }
  }
  return withdrawn;
}

/** The cmcr-105 media review, the allow-list: without its file list nothing can be approved, so the run stops. */
async function loadReview(root) {
  const { files } = await readJson(path.join(root, "scripts/cmcr-105-media-review.json"));
  if (!Array.isArray(files)) throw new Refused("scripts/cmcr-105-media-review.json has no file list");
  return files;
}

/**
 * Removes copies of withdrawn files an earlier version installed, only when the bytes are the withdrawn file's.
 * Each file is handled on its own: one that cannot be checked or removed is reported and the others still are.
 * Returns how many could not be checked or removed.
 */
async function removeWithdrawn(withdrawn, local, dryRun) {
  let problems = 0;
  for (const w of withdrawn) {
    const dest = path.join(local, "cases", w.case, w.file);
    try {
      const bytes = await readIfPresent(dest);
      if (!bytes) continue;
      if (sha256Of(bytes) !== w.sha256) {
        console.warn(`Not removed (unexpected content); inspect and delete it yourself: ${dest} — ${w.reason}`);
        continue;
      }
      if (!dryRun) await rm(dest);
      console.log(`${dryRun ? "Would remove" : "Removed"} a withdrawn asset installed earlier: ${w.case}/${w.file} (${w.reason})`);
    } catch (e) {
      problems++;
      console.error(`Could not check or remove ${dest}: ${e.message} — if it is the withdrawn file, delete it yourself (${w.reason})`);
    }
  }
  return problems;
}

/** Where an asset's file is in the download: `<articleId>.pdf`, or the one `media/<articleId>/figNN_*.png`. */
function sourceFileOf(source, articleId, kind, file, media) {
  if (kind === "pdf") return path.join(source, `${articleId}.pdf`);
  const matches = media.filter((f) => f.startsWith(file.slice(0, 5) + "_") && f.endsWith(".png"));
  if (matches.length !== 1) throw new Refused(`Expected one source image for cmcr-${articleId}/${file} in ${path.join(source, "media", articleId)}, found ${matches.length}`);
  return path.join(source, "media", articleId, matches[0]);
}

/**
 * Checks every local-only asset of the collection's cases and returns what to copy (nothing is written).
 * For cmcr-105 the media review is the allow-list; any failed check refuses the whole run.
 */
async function planInstall({ root, source, collection, withdrawn, review, local }) {
  const casesDir = path.join(root, "packages/content/cases");
  const plan = [];
  for (const folder of (await readdir(casesDir)).filter((f) => CASE_ID.test(f)).sort()) {
    const c = await readJson(path.join(casesDir, folder, "case.json"));
    if (c.id !== folder || !c.tags?.includes(collection)) continue;
    const articleId = folder.slice("cmcr-".length);
    const media = await readdir(path.join(source, "media", articleId)).catch(() => []);
    for (const a of c.assets ?? []) {
      if (!a.localOnly || !installable(a.kind)) continue;
      const prefix = `/local-assets/cases/${folder}/`;
      if (!a.path?.startsWith(prefix)) throw new Refused(`Unexpected asset path in ${folder}: ${a.id}`);
      const file = a.path.slice(prefix.length);
      const name = `${folder}/${file}`;
      if (!FILE_OF_KIND[a.kind].test(file)) throw new Refused(`Unexpected ${a.kind} asset file: ${name}`);
      const byName = withdrawn.find((w) => w.case === folder && w.file === file);
      if (byName) throw new Refused(`Withdrawn for privacy, never installed: ${name} (${byName.reason})`);
      if (a.sha256 !== undefined && !SHA256.test(a.sha256)) throw new Refused(`Malformed sha256 in ${folder} for ${file}`);
      if (review) {
        if (!a.sha256) throw new Refused(`No sha256 in ${folder} for ${file}: every ${collection} asset needs the approved file's checksum`);
        const entries = review.filter((m) => m.case === folder && m.file === file);
        if (entries.length !== 1 || entries[0].status !== "approved") {
          throw new Refused(`Not approved in scripts/cmcr-105-media-review.json, never installed: ${name}${entries.length === 1 ? ` (${entries[0].status}: ${entries[0].reason})` : ""}`);
        }
        if (entries[0].sha256 !== a.sha256) throw new Refused(`The sha256 in ${folder} for ${file} is not the approved file's (scripts/cmcr-105-media-review.json)`);
      }
      const sourceFile = sourceFileOf(source, articleId, a.kind, file, media);
      const bytes = await readIfPresent(sourceFile);
      if (!bytes) throw new Refused(`Source file not found for ${name}: ${sourceFile}`);
      const signed = a.kind === "pdf" ? bytes.subarray(0, 5).toString("latin1") === "%PDF-" : bytes.subarray(0, 8).equals(PNG_SIGNATURE);
      if (!signed) throw new Refused(`Invalid ${a.kind} signature: ${sourceFile}`);
      const sha256 = sha256Of(bytes);
      const byChecksum = withdrawn.find((w) => w.sha256 === sha256);
      if (byChecksum) throw new Refused(`Withdrawn for privacy, never installed: ${sourceFile} is ${byChecksum.case}/${byChecksum.file} (${byChecksum.reason})`);
      if (a.sha256 && a.sha256 !== sha256) throw new Refused(`Checksum mismatch for ${name}: ${sourceFile}`);
      const dest = path.join(local, "cases", folder, file);
      const existing = await readIfPresent(dest);
      if (existing && !existing.equals(bytes)) throw new Refused(`Existing asset differs; preserve and inspect: ${dest}`);
      plan.push({ caseId: folder, file, bytes: bytes.length, sha256, sourceFile, dest, present: !!existing });
    }
  }
  return plan;
}

/**
 * Installs (or checks, with `dryRun`) one collection. Returns how many withdrawn copies could not be checked or
 * removed (the run is then incomplete); throws `Refused` when an asset fails a check.
 */
async function install({ root, source, collection, dryRun }) {
  const local = path.join(root, "assets/local");
  const withdrawn = await loadWithdrawn(root);
  const problems = await removeWithdrawn(withdrawn, local, dryRun);
  if (!(await isDirectory(source))) throw new Refused(`Source directory not found: ${source}`);
  if (!(await isDirectory(path.join(source, "media")))) {
    throw new Refused(`No media folder in ${source}: a CMCR download has <articleId>.pdf files and media/<articleId>/ folders beside them`);
  }
  const review = collection === "cmcr-105" ? await loadReview(root) : null;
  const plan = await planInstall({ root, source, collection, withdrawn, review, local });
  if (!plan.length) throw new Refused(`No ${collection} assets found in the content library`);
  const toCopy = plan.filter((p) => !p.present);
  const cases = new Set(plan.map((p) => p.caseId)).size;
  if (dryRun) {
    for (const p of toCopy) console.log(`Would install ${p.caseId}/${p.file} from ${p.sourceFile}`);
    console.log(`Dry run: ${toCopy.length} assets to install and ${plan.length - toCopy.length} already present, for ${cases} ${collection} cases; nothing was written or removed.`);
    return problems;
  }
  let copied = 0;
  try {
    for (const p of toCopy) {
      const bytes = await readFile(p.sourceFile);
      if (sha256Of(bytes) !== p.sha256) throw new Error(`source file changed since it was checked: ${p.sourceFile}`);
      await mkdir(path.dirname(p.dest), { recursive: true });
      await writeFile(p.dest, bytes, { flag: "wx" });
      copied++;
    }
  } catch (e) {
    throw new Error(`stopped after installing ${copied} of ${toCopy.length} assets: ${e.message}`);
  }
  const manifest = plan.map(({ caseId, file, bytes, sha256 }) => ({ caseId, file, bytes, sha256 }));
  await mkdir(local, { recursive: true });
  await writeFile(path.join(local, `${collection}-manifest.json`), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Installed ${toCopy.length} and verified ${plan.length - toCopy.length} local assets for ${cases} ${collection} cases. Original files stay outside Git.`);
  return problems;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [source, collection = "cmcr-20", ...extra] = args.filter((a) => a !== "--dry-run");
if (!source || source.startsWith("-") || collection.startsWith("-") || extra.length || !COLLECTIONS.includes(collection)) {
  console.error(USAGE);
  process.exitCode = 2;
} else {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const problems = await install({ root, source: path.resolve(source), collection, dryRun });
    if (problems) {
      console.error(`Incomplete: ${problems} withdrawn ${problems === 1 ? "copy" : "copies"} could not be checked or removed (see above).`);
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(e instanceof Refused ? `Refused, nothing ${dryRun ? "would be" : "was"} installed: ${e.message}` : `Failed: ${e.message}`);
    process.exitCode = 1;
  }
}
