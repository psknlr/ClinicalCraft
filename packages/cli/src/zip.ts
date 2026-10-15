/**
 * Minimal ZIP reader for `import-v4`: end-of-central-directory → central
 * directory → local headers; entries stored (0) or deflated (8, via
 * `zlib.inflateRawSync`); CRC-32 checked; entries whose local data overlap
 * are rejected and inflation is capped per entry. No zip64, no encryption, no
 * multi-disk archives.
 */
import * as zlib from "node:zlib";

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  crc32: number;
  /** Offset of the local file header. */
  offset: number;
  isDirectory: boolean;
}

/** Why an archive could not be read: damaged, a feature this reader lacks, or a size limit. */
export type ZipErrorKind = "invalid" | "unsupported" | "limit";

/**
 * Thrown for archives this reader cannot handle. `message` is technical
 * English detail; front-ends show a localised text chosen by `kind` (and
 * `file`, which `collectInputs` fills in).
 */
export class ZipError extends Error {
  /** The archive the error is about, when known. */
  file?: string;
  constructor(
    message: string,
    readonly kind: ZipErrorKind = "invalid",
  ) {
    super(message);
    this.name = "ZipError";
  }
}

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

let crcTable: Uint32Array | null = null;

/** CRC-32 (IEEE), using `zlib.crc32` when available. */
export function crc32(data: Uint8Array): number {
  const native = (zlib as unknown as { crc32?: (d: Uint8Array) => number }).crc32;
  if (typeof native === "function") return native(data) >>> 0;
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function findEocd(buf: Buffer): number {
  const min = Math.max(0, buf.length - (0xffff + 22));
  for (let i = buf.length - 22; i >= min; i--) if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  return -1;
}

/** List the entries of a ZIP archive. */
export function listZip(buf: Buffer): ZipEntry[] {
  if (buf.length < 22) throw new ZipError("not a ZIP archive (too small)");
  const eocd = findEocd(buf);
  if (eocd < 0) throw new ZipError("not a ZIP archive (no end of central directory)");
  const disk = buf.readUInt16LE(eocd + 4);
  const total = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (disk !== 0) throw new ZipError("multi-disk ZIP archives are not supported", "unsupported");
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) throw new ZipError("zip64 archives are not supported", "unsupported");
  if (cdOffset + cdSize > buf.length) throw new ZipError("truncated ZIP archive");
  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== CEN_SIG) throw new ZipError("corrupt central directory");
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compressedSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    if (compressedSize === 0xffffffff || size === 0xffffffff || offset === 0xffffffff) throw new ZipError("zip64 entries are not supported", "unsupported");
    if (flags & 0x1) throw new ZipError("encrypted ZIP entries are not supported", "unsupported");
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    entries.push({ name, method, compressedSize, size, crc32: crc, offset, isDirectory: name.endsWith("/") });
    p += 46 + nameLen + extraLen + commentLen;
  }
  assertDisjoint(buf, entries, cdOffset);
  return entries;
}

/**
 * Every entry must own its local header and data: several central-directory
 * records pointing at the same (or overlapping) bytes would let one small
 * deflated stream be inflated many times (a decompression bomb), and no entry
 * may run into the central directory.
 */
function assertDisjoint(buf: Buffer, entries: readonly ZipEntry[], cdOffset: number): void {
  const spans = entries.map((e) => {
    const p = e.offset;
    if (p + 30 > buf.length || buf.readUInt32LE(p) !== LOC_SIG) throw new ZipError(`corrupt local header for ${e.name}`);
    return { name: e.name, start: p, end: p + 30 + buf.readUInt16LE(p + 26) + buf.readUInt16LE(p + 28) + e.compressedSize };
  });
  spans.sort((a, b) => a.start - b.start);
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    if (span.end > cdOffset) throw new ZipError(`entry ${span.name} overlaps the central directory`);
    const next = spans[i + 1];
    if (next && next.start < span.end) throw new ZipError(`entries ${span.name} and ${next.name} overlap (the same data listed twice)`);
  }
}

/** Largest entry `readZipEntry` inflates (the V4 html is ~43.5 MB; its zips carry one ~22 MB part each). */
export const MAX_ENTRY_BYTES = 128 * 1024 * 1024;

/**
 * Extract one entry (verifies size and CRC-32). Inflation is capped at the
 * declared size, which may not exceed `maxBytes` (default `MAX_ENTRY_BYTES`;
 * callers pass what is left of an archive-wide budget), so a crafted archive
 * cannot expand without bound.
 */
export function readZipEntry(buf: Buffer, entry: ZipEntry, maxBytes: number = MAX_ENTRY_BYTES): Buffer {
  if (entry.size > Math.min(maxBytes, MAX_ENTRY_BYTES)) throw new ZipError(`${entry.name} is too large (${entry.size} bytes)`, "limit");
  const p = entry.offset;
  if (p + 30 > buf.length || buf.readUInt32LE(p) !== LOC_SIG) throw new ZipError(`corrupt local header for ${entry.name}`);
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;
  const end = start + entry.compressedSize;
  if (end > buf.length) throw new ZipError(`truncated data for ${entry.name}`);
  const raw = buf.subarray(start, end);
  let data: Buffer;
  if (entry.method === 0) data = Buffer.from(raw);
  else if (entry.method === 8) {
    try {
      data = zlib.inflateRawSync(raw, { maxOutputLength: Math.max(1, entry.size) });
    } catch (err) {
      throw new ZipError(`cannot inflate ${entry.name}: ${(err as Error).message}`);
    }
  } else throw new ZipError(`unsupported compression method ${entry.method} for ${entry.name}`, "unsupported");
  if (data.length !== entry.size) throw new ZipError(`size mismatch for ${entry.name}`);
  if (crc32(data) !== entry.crc32) throw new ZipError(`CRC mismatch for ${entry.name}`);
  return data;
}
