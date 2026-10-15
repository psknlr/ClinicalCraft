/**
 * Vite config for the ClinicalCraft web client.
 *
 * - Workspace packages are consumed from source (aliases below mirror the
 *   root vitest.config.ts).
 * - `/local-assets/*` is served from `assets/local/` (repo checkout) then
 *   `${CLINICALCRAFT_HOME:-~/.clinicalcraft}/assets/` (docs/ASSETS.md). Files
 *   are streamed verbatim (no Content-Encoding) so `*.glb.gz` reaches the
 *   browser still gzip-compressed for DecompressionStream.
 * - `--mode standalone` defines `__STANDALONE__ = true`; the single-file
 *   inlining step lives in scripts/inline-standalone.mjs (UI agent).
 */
import { defineConfig, type BuildOptions, type Connect, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const pkg = (name: string, entry = "src/index.ts") => path.resolve(here, "..", name, entry);

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
  ".gz": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
};

export function localAssetRoots(): string[] {
  const home = process.env.CLINICALCRAFT_HOME || path.join(os.homedir(), ".clinicalcraft");
  return [path.join(repoRoot, "assets", "local"), path.join(home, "assets")];
}

/** Resolve `/local-assets/<rel>` to an existing file under one of the roots (no traversal). */
export function resolveLocalAsset(urlPath: string, roots = localAssetRoots()): string | null {
  const prefix = "/local-assets/";
  if (!urlPath.startsWith(prefix)) return null;
  let rel: string;
  try {
    rel = decodeURIComponent(urlPath.slice(prefix.length));
  } catch {
    return null;
  }
  if (!rel || rel.includes("\0")) return null;
  for (const root of roots) {
    const abs = path.resolve(root, rel);
    if (abs !== root && !abs.startsWith(root + path.sep)) continue;
    try {
      if (fs.statSync(abs).isFile()) return abs;
    } catch {
      /* try next root */
    }
  }
  return null;
}

function localAssets(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url || "").split("?")[0];
    if (!url.startsWith("/local-assets/")) return next();
    const file = resolveLocalAsset(url);
    if (!file) {
      res.statusCode = 404;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("local asset not installed — run `clinicalcraft import-v4` (see docs/ASSETS.md)");
      return;
    }
    const stat = fs.statSync(file);
    res.statusCode = 200;
    res.setHeader("content-type", MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
    res.setHeader("content-length", String(stat.size));
    res.setHeader("cache-control", "no-cache");
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: "clinicalcraft-local-assets",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

/** Normal build: the app and the world QA harness. */
const appBuild: BuildOptions = {
  target: "es2022",
  chunkSizeWarningLimit: 4096,
  rollupOptions: {
    input: {
      main: path.resolve(here, "index.html"),
      harness: path.resolve(here, "world-harness.html"),
    },
  },
};

/** `--mode standalone`: one bundle, no code splitting, every asset inlined. */
const standaloneBuild: BuildOptions = {
  target: "es2022",
  outDir: path.resolve(here, "dist-standalone", "build"),
  emptyOutDir: true,
  assetsInlineLimit: 100_000_000,
  cssCodeSplit: false,
  modulePreload: false,
  chunkSizeWarningLimit: 16384,
  rollupOptions: {
    input: { main: path.resolve(here, "index.html") },
    output: { inlineDynamicImports: true },
  },
};

export default defineConfig(({ mode }) => ({
  // `--mode standalone`: one self-contained bundle (no code splitting, assets inlined) that
  // scripts/inline-standalone.mjs folds into dist-standalone/ClinicalCraft.html (offline only).
  root: here,
  base: "./",
  define: {
    __STANDALONE__: JSON.stringify(mode === "standalone"),
  },
  resolve: {
    alias: [
      { find: /^@clinicalcraft\/core$/, replacement: pkg("core") },
      { find: /^@clinicalcraft\/agent$/, replacement: pkg("agent") },
      { find: /^@clinicalcraft\/content$/, replacement: pkg("content") },
      { find: /^@clinicalcraft\/content\//, replacement: path.resolve(here, "../content") + "/" },
    ],
  },
  plugins: [localAssets()],
  server: {
    fs: { allow: [repoRoot] },
    // CLINICALCRAFT_QA=1: no HMR/reloads (content files may change while QA scripts run)
    ...(process.env.CLINICALCRAFT_QA ? { hmr: false, watch: { ignored: ["**/*"] } } : {}),
  },
  build: mode === "standalone" ? standaloneBuild : appBuild,
}));
