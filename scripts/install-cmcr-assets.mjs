/** Install the user's downloaded CMCR papers/figures locally; never fetch or publish them. */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/install-cmcr-assets.mjs "<selected-20 directory>"');
const content = path.join(root, "packages/content/cases");
const installed = [];
for (const folder of (await readdir(content)).filter((f) => /^cmcr-\d+$/.test(f)).sort()) {
  const c = JSON.parse(await readFile(path.join(content, folder, "case.json"), "utf8"));
  if (c.id !== folder || !c.tags.includes("cmcr-20")) continue;
  const articleId = folder.slice(5);
  const mediaDir = path.resolve(source, "media", articleId);
  const media = await readdir(mediaDir).catch(() => []);
  for (const a of c.assets) {
    if (!a.localOnly || !["pdf", "image"].includes(a.kind)) continue;
    const prefix = `/local-assets/cases/${folder}/`;
    if (!a.path.startsWith(prefix)) throw new Error(`Unexpected asset path: ${a.id}`);
    const file = a.path.slice(prefix.length);
    if (!/^(source\.pdf|fig\d{2}\.png)$/.test(file)) throw new Error(`Unexpected asset file: ${file}`);
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
await writeFile(path.join(root, "assets/local/cmcr-20-manifest.json"), JSON.stringify(installed, null, 2) + "\n");
console.log(`Installed/verified ${installed.length} local assets for ${new Set(installed.map((x) => x.caseId)).size} cases. Original files stay outside Git.`);
