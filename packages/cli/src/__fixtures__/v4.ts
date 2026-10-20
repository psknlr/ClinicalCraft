/**
 * Test fixtures for `import-v4`: a synthetic V4-style html (tiny fake
 * CASE_DATA payloads) and a tiny ZIP writer (stored + deflate). Not part of
 * the build (excluded in tsconfig.json).
 */
import { deflateRawSync, gzipSync } from "node:zlib";
import { crc32 } from "../zip.js";

/** Fake payloads, so tests can compare installed bytes. */
export interface V4Fixture {
  html: Buffer;
  glbGz: Buffer;
  catalog: unknown[];
  figures: Buffer[];
  pdf: Buffer;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A small html shaped like the V4 release: `<script>window.CASE_DATA={…};</script>` first, then the app script. */
export function buildV4Html(figureCount = 3): V4Fixture {
  const glbGz = gzipSync(Buffer.concat([Buffer.from("glTF"), Buffer.alloc(64, 7)]));
  const catalog = [{ id: "view_0", kind: "heart", label: "heart", thorax: false, region: "", center: [0, 1.29, 0.02] }];
  const figures = Array.from({ length: figureCount }, (_, i) => Buffer.concat([PNG_SIGNATURE, Buffer.from(`figure-${i + 1}`)]));
  const pdf = Buffer.from("%PDF-1.4\n% synthetic test report\n%%EOF\n");
  const data = {
    model: glbGz.toString("base64"),
    catalog,
    images: Object.fromEntries(figures.map((f, i) => [String(i + 1), f.toString("base64")])),
    pdf: pdf.toString("base64"),
    preview: PNG_SIGNATURE.toString("base64"),
  };
  const html = Buffer.from(
    `<!doctype html><html><head><meta charset="utf-8"><title>V4 fixture</title></head><body><div id="app">示例</div>\n` +
      `<script>window.CASE_DATA=${JSON.stringify(data)};</script>\n` +
      `<script>console.log("app </script-free> logic");</script></body></html>\n`,
    "utf8",
  );
  return { html, glbGz, catalog, figures, pdf };
}

export interface ZipInput {
  name: string;
  data: Buffer;
  /** Deflate (8) or store (0). Default deflate. */
  method?: 0 | 8;
}

/** Write a minimal ZIP archive (no zip64, no data descriptors). */
export function writeZip(entries: readonly ZipInput[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const method = entry.method ?? 8;
    const name = Buffer.from(entry.name, "utf8");
    const body = method === 8 ? deflateRawSync(entry.data) : entry.data;
    const crc = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, eocd]);
}

/** Split a buffer into `n` consecutive parts (like the V4 `.part01`/`.part02` files). */
export function splitParts(data: Buffer, n = 2): Buffer[] {
  const size = Math.ceil(data.length / n);
  return Array.from({ length: n }, (_, i) => data.subarray(i * size, Math.min(data.length, (i + 1) * size)));
}
