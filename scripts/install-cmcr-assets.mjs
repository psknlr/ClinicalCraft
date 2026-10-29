/** Install the user's downloaded CMCR papers/figures locally; never fetch or publish them. */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
const collection = process.argv[3] ?? "cmcr-20";
if (!source || !["cmcr-20", "cmcr-105"].includes(collection) || process.argv.length > 4) {
  throw new Error('Usage: node scripts/install-cmcr-assets.mjs "<source directory>" [cmcr-20|cmcr-105]');
}
const content = path.join(root, "packages/content/cases");
/** Media that identify a patient: never installed (docs/CMCR_CASES.md, Privacy). */
const { withdrawn } = JSON.parse(await readFile(path.join(root, "scripts/cmcr-withdrawn-assets.json"), "utf8"));
const withdrawal = (caseId, file) => withdrawn.find((w) => w.case === caseId && w.file === file);
const installed = [];
for (const folder of (await readdir(content)).filter((f) => /^cmcr-\d+$/.test(f)).sort()) {
  const c = JSON.parse(await readFile(path.join(content, folder, "case.json"), "utf8"));
  if (c.id !== folder || !c.tags.includes(collection)) continue;
  const articleId = folder.slice(5);
  const mediaDir = path.resolve(source, "media", articleId);
  const media = await readdir(mediaDir).catch(() => []);
  for (const a of c.assets) {
    if (!a.localOnly || !["pdf", "image"].includes(a.kind)) continue;
    const prefix = `/local-assets/cases/${folder}/`;
    if (!a.path.startsWith(prefix)) throw new Error(`Unexpected asset path: ${a.id}`);
    const file = a.path.slice(prefix.length);
    if (!/^(source\.pdf|fig\d{2}\.png)$/.test(file)) throw new Error(`Unexpected asset file: ${file}`);
    const w = withdrawal(folder, file);
    if (w) throw new Error(`Withdrawn for privacy, never installed: ${folder}/${file} (${w.reason})`);
    const sourceFile = a.kind === "pdf" ? path.resolve(source, `${articleId}.pdf`) : (() => {
      const matches = media.filter((f) => f.startsWith(file.slice(0, 5) + "_") && f.endsWith(".png"));
      if (matches.length !== 1) throw new Error(`Expected one source image for ${folder}/${file}`);
      return path.join(mediaDir, matches[0]);
    })();
    const bytes = await readFile(sourceFile);
    const valid = a.kind === "pdf" ? bytes.subarray(0, 5).toString() === "%PDF-" : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!valid) throw new Error(`Invalid ${a.kind} signature: ${sourceFile}`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (a.sha256 && a.sha256 !== sha256) throw new Error(`Checksum mismatch: ${sourceFile}`);
    const dest = path.join(root, "assets/local/cases", folder, file);
    const existing = await readFile(dest).catch((e) => { if (e.code === "ENOENT") return null; throw e; });
    if (existing && !existing.equals(bytes)) throw new Error(`Existing asset differs; preserve and inspect: ${dest}`);
    await mkdir(path.dirname(dest), { recursive: true });
    if (!existing) await writeFile(dest, bytes, { flag: "wx" });
    installed.push({ caseId: folder, file, bytes: bytes.length, sha256 });
  }
}
if (!installed.length) throw new Error("No CMCR assets found in the content library");
// A copy an earlier version installed is removed — only when its bytes are the withdrawn file's.
for (const w of withdrawn) {
  const dest = path.join(root, "assets/local/cases", w.case, w.file);
  const bytes = await readFile(dest).catch((e) => { if (e.code === "ENOENT") return null; throw e; });
  if (!bytes) continue;
  if (createHash("sha256").update(bytes).digest("hex") === w.sha256) {
    await rm(dest);
    console.log(`Removed a withdrawn asset installed earlier: ${w.case}/${w.file} (${w.reason})`);
  } else console.warn(`Not removed (unexpected content); inspect and delete it yourself: ${dest} — ${w.reason}`);
}
await writeFile(path.join(root, `assets/local/${collection}-manifest.json`), JSON.stringify(installed, null, 2) + "\n");
console.log(`Installed/verified ${installed.length} local assets for ${new Set(installed.map((x) => x.caseId)).size} cases. Original files stay outside Git.`);
