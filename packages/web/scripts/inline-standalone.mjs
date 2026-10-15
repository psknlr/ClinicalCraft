#!/usr/bin/env node
/**
 * Fold the `vite build --mode standalone` output into ONE offline HTML file:
 *
 *   dist-standalone/build/index.html + assets/*.js|css|svg  →  dist-standalone/ClinicalCraft.html
 *
 * - every script and stylesheet is inlined (JSON content is already bundled into the JS);
 * - the favicon becomes a data: URI;
 * - local-only assets (docs/ASSETS.md) are embedded ONLY if they are present in the repo's
 *   `assets/local/` at build time, as `<script type="application/json" id="cc-local-assets">`
 *   ({"cases/<id>/fig1.png": {type, data(base64)}}) which src/app/assets.ts turns into blob URLs.
 *   Such a build contains copyrighted figures and must NOT be redistributed (a warning is printed).
 *   `--no-local-assets` skips them; `--max-asset-mb <n>` skips larger files (default 64).
 *
 * The standalone page is offline-only (no proxy, no direct provider calls).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, "..");
const repoRoot = path.resolve(web, "../..");
const buildDir = path.join(web, "dist-standalone", "build");
const outFile = path.join(web, "dist-standalone", "ClinicalCraft.html");
const args = process.argv.slice(2);
const withLocal = !args.includes("--no-local-assets");
const maxMbArg = args.indexOf("--max-asset-mb");
const maxBytes = (maxMbArg >= 0 ? Number(args[maxMbArg + 1]) || 64 : 64) * 1024 * 1024;

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".gz": "application/gzip",
  ".glb": "model/gltf-binary",
  ".txt": "text/plain",
};

function fail(msg) {
  console.error(`inline-standalone: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(buildDir, "index.html"))) fail(`missing ${path.relative(web, buildDir)}/index.html — run \`vite build --mode standalone\` first`);

let html = fs.readFileSync(path.join(buildDir, "index.html"), "utf8");

/** Resolve a built asset reference ("./assets/x.js" or "/assets/x.js") to a file in the build dir. */
function builtFile(ref) {
  const clean = ref.replace(/^\.?\//, "").split(/[?#]/)[0];
  const abs = path.resolve(buildDir, clean);
  if (!abs.startsWith(buildDir + path.sep)) fail(`asset outside build dir: ${ref}`);
  if (!fs.existsSync(abs)) fail(`missing built asset ${ref}`);
  return abs;
}

/** `</script` inside inline JS would end the element early. */
const safeScript = (code) => code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const safeStyle = (css) => css.replace(/<\/style/gi, "<\\/style");

let scripts = 0;
let styles = 0;
html = html.replace(/<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)><\/script>/g, (_m, pre, src, post) => {
  scripts++;
  const attrs = `${pre} ${post}`.replace(/\s*crossorigin(="[^"]*")?/g, "").replace(/\s+/g, " ").trim();
  return `<script ${attrs}>${safeScript(fs.readFileSync(builtFile(src), "utf8"))}</script>`;
});
html = html.replace(/<link\b[^>]*?rel="stylesheet"[^>]*?href="([^"]+)"[^>]*>/g, (_m, href) => {
  styles++;
  return `<style>${safeStyle(fs.readFileSync(builtFile(href), "utf8"))}</style>`;
});
html = html.replace(/<link\b[^>]*?rel="modulepreload"[^>]*>/g, "");
html = html.replace(/(<link\b[^>]*?rel="icon"[^>]*?href=")([^"]+)("[^>]*>)/g, (m, a, href, b) => {
  try {
    const file = builtFile(href);
    const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    return `${a}data:${type};base64,${fs.readFileSync(file).toString("base64")}${b}`;
  } catch {
    return m;
  }
});
if (!scripts) fail("no <script src> found in the built index.html");
if (/\bsrc="\.?\/?assets\//.test(html) || /\bhref="\.?\/?assets\//.test(html)) fail("unresolved ./assets/ reference left in the page");

/* ---------------- local-only assets (optional) ---------------- */
const embedded = {};
let embeddedBytes = 0;
const skipped = [];
const localRoot = path.join(repoRoot, "assets", "local");
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (entry.isFile()) {
      const rel = path.relative(localRoot, abs).split(path.sep).join("/");
      if (rel === "manifest.json") continue;
      const size = fs.statSync(abs).size;
      if (size > maxBytes) {
        skipped.push(`${rel} (${(size / 1048576).toFixed(1)} MB)`);
        continue;
      }
      const type = MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream";
      embedded[rel] = { type, data: fs.readFileSync(abs).toString("base64") };
      embeddedBytes += size;
    }
  }
}
if (withLocal && fs.existsSync(localRoot)) walk(localRoot);
const localCount = Object.keys(embedded).length;
if (localCount) {
  const json = JSON.stringify(embedded).replace(/</g, "\\u003c");
  html = html.replace("</body>", `<script type="application/json" id="cc-local-assets">${json}</script>\n</body>`);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);
fs.rmSync(buildDir, { recursive: true, force: true });

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
console.log(`inline-standalone: wrote ${path.relative(process.cwd(), outFile)} (${mb(Buffer.byteLength(html))}; ${scripts} script(s), ${styles} stylesheet(s) inlined; offline mode only)`);
if (localCount) {
  console.warn("");
  console.warn(`⚠  ${localCount} local-only asset(s) from assets/local were embedded (${mb(embeddedBytes)}): ${Object.keys(embedded).join(", ")}`);
  console.warn("⚠  They include copyrighted case figures / the anatomy model (docs/ASSETS.md).");
  console.warn("⚠  This build is for YOUR local teaching use only — do NOT commit, publish or redistribute it.");
  console.warn("   Rebuild with `--no-local-assets` for a redistributable file.");
}
if (skipped.length) console.warn(`inline-standalone: skipped (larger than --max-asset-mb): ${skipped.join(", ")}`);
