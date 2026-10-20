#!/usr/bin/env node
/**
 * Visual QA for content authors.
 *
 *   node scripts/preview/render.mjs equipment --catalogs packages/content/catalogs/materials.json,packages/content/catalogs/core-clinical.json [--only id1,id2] [--view iso|top|front] --out /tmp/eq.png
 *   node scripts/preview/render.mjs facility --facility packages/content/facilities/clinic-v4.json [--catalogs a.json,b.json] [--level L1] [--scale 14] --out /tmp/plan.png
 *
 * Equipment mode renders each equipment type's voxel parts (red outline = declared footprint).
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
if (!mode || !args.out) { console.error("usage: render.mjs equipment|facility --out file.png [...]"); process.exit(2); }

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json" };
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
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  const p = aliases.get(rel) ?? path.join(root, rel);
  if ((!aliases.has(rel) && !p.startsWith(root)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
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
