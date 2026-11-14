#!/usr/bin/env node
/**
 * Visual QA for content authors.
 *
 *   node scripts/preview/render.mjs equipment --catalogs packages/content/catalogs/materials.json,packages/content/catalogs/core-clinical.json [--only id1,id2] [--view iso|top|front] --out /tmp/eq.png
 *   node scripts/preview/render.mjs facility --facility packages/content/facilities/clinic-v4.json [--catalogs a.json,b.json] [--level L1] [--scale 14] --out /tmp/plan.png
 *   node scripts/preview/render.mjs models --catalogs packages/content/catalogs/materials.json,packages/content/catalogs/core-clinical.json [--assets packages/content/assets,../pack/content/assets] [--only id1,id2] [--view iso|front|back|side|top] [--compare 1] [--states all|id1,id2] [--cell 320] [--cols 5] [--focus x,y,z,radius] --out /tmp/models.png
 *
 *   node scripts/preview/render.mjs people [--facility facility.json | --case case.json | --sheet roles,positions,looks,patients] [--only id1,id2] [--view front|iso|back|side|top|face|face-iso|face-side|chest|hands|held|hand] [--posture standing|sitting|lying|prone|lateral] [--cell 420] [--cols 6] [--distress 1] [--speak 0..1] [--blink 0..1] --out /tmp/people.png
 *
 * Equipment mode renders each equipment type's voxel parts (red outline = declared footprint).
 * Models mode renders each type's GLB model as the web world draws it (docs/BLENDER.md): placed by its catalog
 * reference, lit like the world, a glowing quad where each `screen` part's live display goes, and the body a
 * type is drawn with (its `manikin`, by the world's own figure code); `--compare 1`
 * puts the voxel parts beside it, `--focus` frames a close-up (a point of the type's frame and a radius, m).
 * A type whose look follows its state (a state's `look`: docs/FACILITIES.md) is drawn as it starts; `--states`
 * draws it once per state named — or `all`: the storyboard of its states — with the layers of its model, the
 * picture on its screens and its manikin as that state has them.
 * `--assets` lists the asset directories searched for a model's `uri` (default: the built-in
 * packages/content/assets).
 * People mode renders the people as the web world draws them (its own code, bundled for the page:
 * packages/web/src/world/npc.ts): a facility's staff in the uniform of their role as their position wears
 * it, a case's patient (standing, sitting, in bed) and companion, or a reference sheet — every role, every
 * theatre position, the looks an appearance can ask for; `--posture prone` or `lying` with `--cover towels` lays them
 * on a treatment couch, face down or on their back, under towels; `--posture lateral` (with `--up right`, `--cover blanket|drapes`,
 * `--flex <degrees>`, `--asleep 1`) lays them on their side on an operating table; `--view held` is the first-person hand and its
 * stethoscope as the camera sees them, `--view hand` the hand by itself in each of its poses (`--detail 0`: as
 * it is on a figure). Each label gives the figure's triangle count.
 * Facility mode renders a labelled 2D floor plan of one level (default: the default level) —
 * buildings, rooms, walls/openings, placements, slots, staff, spawn, stairs/ramp flights,
 * elevators and access zones. A facility that places room templates (`instances`) is
 * compiled first (`clinicalcraft facilities compile`, templates from packages/content and
 * the contentDirs setting).
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [mode, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, "")] = rest[i + 1];
if (!mode || !args.out) { console.error("usage: render.mjs equipment|facility|models|people --out file.png [...]"); process.exit(2); }

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary" };
/**
 * Catalog/facility files named on the command line, served to the page: a file inside the repo by its
 * repo path; one elsewhere (a contentDirs folder outside the checkout) under an alias `__file/<n>/<name>`
 * mapped to exactly that file — nothing else outside the repo is served.
 */
const aliases = new Map();
function servedPath(file) {
  const abs = path.resolve(process.cwd(), file);
  const inRepo = path.resolve(root, file);
  if (fs.existsSync(inRepo) && (inRepo + path.sep).startsWith(root + path.sep)) return path.relative(root, inRepo).split(path.sep).join("/");
  if (!fs.existsSync(abs)) { console.error(`no such file: ${file}`); process.exit(2); }
  if ((abs + path.sep).startsWith(root + path.sep)) return path.relative(root, abs).split(path.sep).join("/");
  const alias = `__file/${aliases.size}/${path.basename(abs)}`;
  aliases.set(alias, abs);
  return alias;
}
const list = (value) => (value || "").split(",").filter(Boolean).map(servedPath).join(",");
if (args.catalogs) args.catalogs = list(args.catalogs);
/** Asset directories (models mode): one inside the repo by its repo path, one elsewhere under an alias `__dir/<n>` mapped to exactly that directory. */
const dirAliases = new Map();
function servedDir(dir) {
  const abs = [path.resolve(root, dir), path.resolve(process.cwd(), dir)].find((d) => fs.existsSync(d) && fs.statSync(d).isDirectory());
  if (!abs) { console.error(`no such directory: ${dir}`); process.exit(2); }
  if ((abs + path.sep).startsWith(root + path.sep)) return path.relative(root, abs).split(path.sep).join("/");
  const alias = `__dir/${dirAliases.size}`;
  dirAliases.set(alias, abs);
  return alias;
}
/** The file a request path names under an aliased asset directory (never outside it), or null. */
function aliasedFile(rel) {
  for (const [alias, dir] of dirAliases) {
    if (!rel.startsWith(alias + "/")) continue;
    const p = path.resolve(dir, rel.slice(alias.length + 1));
    return p.startsWith(dir + path.sep) ? p : null;
  }
  return null;
}
/** A facility with room-template instances is previewed compiled (the flat facility every front-end loads). */
function compiledIfNeeded(file) {
  const abs = path.resolve(process.cwd(), fs.existsSync(path.resolve(root, file)) ? path.resolve(root, file) : file);
  let json;
  try {
    json = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return file; // reported by the page
  }
  if (!Array.isArray(json.instances) || json.instances.length === 0) return file;
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cc-preview-")), path.basename(abs));
  const r = spawnSync(process.execPath, [path.join(root, "node_modules/tsx/dist/cli.mjs"), "--conditions=source", path.join(root, "packages/cli/src/bin.ts"), "facilities", "compile", abs, "--out", out], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) {
    console.log(JSON.stringify({ ok: false, error: `facility does not compile: ${(r.stderr || r.stdout || "").trim()}` }));
    process.exit(1);
  }
  return out;
}
if (args.facility) args.facility = servedPath(compiledIfNeeded(args.facility));
if (args.case) args.case = servedPath(args.case);
/** People mode draws with the web world's own code: bundle the page's entry (TypeScript, three.js included) for the browser. */
async function bundlePeople() {
  const { build } = await import("esbuild").catch(() => { console.error("people mode needs esbuild (installed with vite: run `npm install`)"); process.exit(2); });
  const outfile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cc-preview-")), "people.js");
  await build({ entryPoints: [path.join(root, "scripts/preview/people.entry.ts")], bundle: true, format: "esm", platform: "browser", target: "es2022", outfile, logLevel: "error", absWorkingDir: root });
  aliases.set("__bundle/people.js", outfile);
}
if (mode === "people") await bundlePeople();
/** Models mode draws a type's manikin, and its look in a state, with the web world's own code too: bundled for the page, three.js left to the page's import map. */
async function bundleManikin() {
  const { build } = await import("esbuild").catch(() => ({ build: null }));
  if (!build) return; // without esbuild the page draws the models and says which manikins it left out
  const outfile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cc-preview-")), "manikin.js");
  await build({ entryPoints: [path.join(root, "scripts/preview/manikin.entry.ts")], bundle: true, format: "esm", platform: "browser", target: "es2022", conditions: ["source"], external: ["three"], outfile, logLevel: "error", absWorkingDir: root });
  aliases.set("__bundle/manikin.js", outfile);
}
if (mode === "models") await bundleManikin();
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  const inDir = aliasedFile(rel);
  const p = aliases.get(rel) ?? inDir ?? path.join(root, rel);
  if ((!aliases.has(rel) && !inDir && !p.startsWith(root)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const exe = process.env.CHROMIUM_PATH || ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
// Fail fast (not after the 60 s render wait) when a content file cannot be loaded or the page throws.
let failLoad;
const loadFailed = new Promise((_, reject) => (failLoad = reject));
loadFailed.catch(() => undefined);
page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) failLoad(new Error(`HTTP ${r.status()} for ${new URL(r.url()).pathname}`)); });
page.on("requestfailed", (r) => failLoad(new Error(`request failed: ${new URL(r.url()).pathname} (${r.failure()?.errorText ?? "error"})`)));
page.on("pageerror", (e) => failLoad(e));
const rendered = () => Promise.race([page.waitForFunction(() => window.__done, null, { timeout: 60000 }), loadFailed]);
try {
  if (mode === "equipment") {
    const q = new URLSearchParams({ catalogs: args.catalogs || "", only: args.only || "", view: args.view || "iso" });
    await page.goto(`http://127.0.0.1:${port}/scripts/preview/equipment.html?${q}`);
    await rendered();
    const info = await page.evaluate(() => window.__done);
    await page.setViewportSize({ width: info.width, height: info.height });
    await page.waitForTimeout(150);
    await page.screenshot({ path: args.out });
    console.log(JSON.stringify({ ok: true, ...info, errors }));
  } else if (mode === "models") {
    const assets = (args.assets || "packages/content/assets").split(",").filter(Boolean).map(servedDir).join(",");
    const q = new URLSearchParams({ catalogs: args.catalogs || "", assets, only: args.only || "", view: args.view || "iso", compare: args.compare || "", cell: args.cell || "", cols: args.cols || "", focus: args.focus || "", states: args.states || args.state || "" });
    // a model missing from every asset directory is a warning of the page, not a failed load
    page.removeAllListeners("response");
    page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/favicon.ico") && !r.url().endsWith(".glb")) failLoad(new Error(`HTTP ${r.status()} for ${new URL(r.url()).pathname}`)); });
    await page.goto(`http://127.0.0.1:${port}/scripts/preview/models.html?${q}`);
    await page.waitForFunction(() => window.__done, null, { timeout: 180000 }).catch((e) => Promise.race([loadFailed, Promise.reject(e)]));
    const info = await page.evaluate(() => window.__done);
    await page.setViewportSize({ width: info.width, height: info.height });
    await page.waitForTimeout(150);
    await page.screenshot({ path: args.out });
    console.log(JSON.stringify({ ok: true, ...info, errors: errors.filter((e) => !/404/.test(e)) }));
  } else if (mode === "people") {
    const q = new URLSearchParams();
    for (const k of ["facility", "case", "sheet", "only", "view", "cell", "cols", "posture", "up", "cover", "draped", "flex", "asleep", "distress", "speak", "blink", "breath", "rise", "turn", "bg", "detail", "skin"]) if (args[k] !== undefined) q.set(k, args[k]);
    await page.goto(`http://127.0.0.1:${port}/scripts/preview/people.html?${q}`);
    await rendered();
    const info = await page.evaluate(() => window.__done);
    await page.setViewportSize({ width: info.width, height: info.height });
    await page.waitForTimeout(150);
    await page.screenshot({ path: args.out });
    console.log(JSON.stringify({ ok: true, ...info, errors }));
  } else if (mode === "facility") {
    await page.goto(`http://127.0.0.1:${port}/scripts/preview/facility.html?facility=${encodeURIComponent(args.facility)}&catalogs=${encodeURIComponent(args.catalogs || "packages/content/catalogs/materials.json")}&level=${encodeURIComponent(args.level || "")}&scale=${encodeURIComponent(args.scale || "")}`);
    await rendered();
    const info = await page.evaluate(() => window.__done);
    await page.setViewportSize({ width: info.width, height: info.height });
    await page.screenshot({ path: args.out });
    console.log(JSON.stringify({ ok: true, ...info, errors }));
  } else throw new Error("unknown mode " + mode);
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e), errors }));
  process.exitCode = 1;
} finally { await browser.close(); server.close(); }
