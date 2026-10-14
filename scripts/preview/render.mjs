#!/usr/bin/env node
/**
 * Visual QA for content authors.
 *
 *   node scripts/preview/render.mjs equipment --catalogs packages/content/catalogs/materials.json,packages/content/catalogs/core-clinical.json [--only id1,id2] [--view iso|top|front] --out /tmp/eq.png
 *   node scripts/preview/render.mjs facility --facility packages/content/facilities/clinic-v4.json [--catalogs a.json,b.json] --out /tmp/plan.png
 *
 * Equipment mode renders each equipment type's voxel parts (red outline = declared footprint).
 * Facility mode renders a labelled 2D floor plan (buildings, rooms, walls/openings, placements, slots, staff, spawn).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [mode, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, "")] = rest[i + 1];
if (!mode || !args.out) { console.error("usage: render.mjs equipment|facility --out file.png [...]"); process.exit(2); }

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
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
try {
  if (mode === "equipment") {
    const q = new URLSearchParams({ catalogs: args.catalogs || "", only: args.only || "", view: args.view || "iso" });
    await page.goto(`http://127.0.0.1:${port}/scripts/preview/equipment.html?${q}`);
    await page.waitForFunction(() => window.__done, null, { timeout: 60000 });
    const info = await page.evaluate(() => window.__done);
    await page.setViewportSize({ width: info.width, height: info.height });
    await page.waitForTimeout(150);
    await page.screenshot({ path: args.out });
    console.log(JSON.stringify({ ok: true, ...info, errors }));
  } else if (mode === "facility") {
    await page.goto(`http://127.0.0.1:${port}/scripts/preview/facility.html?facility=${encodeURIComponent(args.facility)}&catalogs=${encodeURIComponent(args.catalogs || "packages/content/catalogs/materials.json")}`);
    await page.waitForFunction(() => window.__done, null, { timeout: 60000 });
    const info = await page.evaluate(() => window.__done);
    await page.setViewportSize({ width: info.width, height: info.height });
    await page.screenshot({ path: args.out });
    console.log(JSON.stringify({ ok: true, ...info, errors }));
  } else throw new Error("unknown mode " + mode);
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e), errors }));
  process.exitCode = 1;
} finally { await browser.close(); server.close(); }
