/**
 * Static files: the web build (`staticDir`, with an `index.html` fallback for
 * client-side routes) and local-only assets (`/local-assets/*`, docs/ASSETS.md).
 *
 * Files are streamed whole (no Range support) with their exact byte length;
 * `.gz` files are served as opaque `application/gzip` bodies WITHOUT
 * `Content-Encoding`, so browsers never transparently inflate them (the web
 * client decompresses `anatomy.glb.gz` itself). Paths are decoded, checked for
 * NUL/backslashes/`..` segments, resolved under the root and re-checked after
 * resolving symlinks, so nothing outside the root is ever served.
 */
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";

/** MIME types by extension (lower-case, with the dot). */
export const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".gz": "application/gzip",
  ".zip": "application/zip",
};

/** Content type for a file name (unknown → `application/octet-stream`). */
export function mimeType(file: string): string {
  return MIME_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
}

function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Map a URL path (still percent-encoded, starting after the mount prefix) to
 * an absolute path under `root`, or null for anything suspicious.
 */
export function safeJoin(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0") || decoded.includes("\\")) return null;
  const segments = decoded.split("/").filter((s) => s !== "" && s !== ".");
  if (segments.some((s) => s === ".." || /^[a-zA-Z]:$/.test(s))) return null;
  const abs = resolve(root, ...segments);
  return inside(resolve(root), abs) ? abs : null;
}

/** A regular file at `abs` whose real path stays under `root` (symlinks resolved), or null. */
async function regularFileUnder(root: string, abs: string): Promise<{ path: string; size: number; mtime: Date } | null> {
  try {
    const [realRoot, realFile] = await Promise.all([realpath(root), realpath(abs)]);
    if (!inside(realRoot, realFile)) return null;
    const info = await stat(realFile);
    return info.isFile() ? { path: realFile, size: info.size, mtime: info.mtime } : null;
  } catch {
    return null;
  }
}

/** Stream a file (GET) or just its headers (HEAD). */
export function sendFile(req: IncomingMessage, res: ServerResponse, file: { path: string; size: number; mtime: Date }, cacheControl: string): void {
  res.writeHead(200, {
    "content-type": mimeType(file.path),
    "content-length": String(file.size),
    "last-modified": file.mtime.toUTCString(),
    "cache-control": cacheControl,
    "accept-ranges": "none",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const stream = createReadStream(file.path);
  stream.on("error", () => res.destroy());
  res.on("close", () => stream.destroy());
  stream.pipe(res);
}

export interface StaticResult {
  /** The response was sent. */
  served: boolean;
}

/**
 * Serve `pathname` from the web build. `/` and extension-less paths that are
 * not files fall back to `index.html` (client-side routes). Returns
 * `{served:false}` when nothing matched (the caller sends 404).
 */
export async function serveStatic(req: IncomingMessage, res: ServerResponse, root: string, pathname: string): Promise<StaticResult> {
  const abs = safeJoin(root, pathname);
  if (!abs) return { served: false };
  let file = await regularFileUnder(root, abs);
  if (!file) {
    // Directory → its index.html; extension-less route → the app shell.
    const dirIndex = await regularFileUnder(root, resolve(abs, "index.html"));
    if (dirIndex) file = dirIndex;
    else if (!extname(pathname)) file = await regularFileUnder(root, resolve(root, "index.html"));
  }
  if (!file) return { served: false };
  const hashed = /(^|\/)assets\//.test(pathname) && /[-.][A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(pathname);
  const isHtml = mimeType(file.path).startsWith("text/html");
  sendFile(req, res, file, hashed && !isHtml ? "public, max-age=31536000, immutable" : "no-cache");
  return { served: true };
}

/** Serve `/local-assets/<rel>` from the first asset directory that has it. */
export async function serveLocalAsset(req: IncomingMessage, res: ServerResponse, roots: readonly string[], rel: string): Promise<StaticResult> {
  for (const root of roots) {
    const abs = safeJoin(root, rel);
    if (!abs || abs === resolve(root)) continue;
    const file = await regularFileUnder(root, abs);
    if (file) {
      sendFile(req, res, file, "no-cache");
      return { served: true };
    }
  }
  return { served: false };
}
