/**
 * A small PNG encoder (8-bit RGB): pure, deterministic and dependency-free, so a picture the engine draws — a tongue
 * image (`tongue.ts`) — has the same bytes in a browser, in the CLI, over MCP and in a test. The pixel data is
 * filtered per row (the smallest of None / Sub / Up / Paeth) and compressed with DEFLATE's fixed Huffman codes over
 * an LZ77 match search: a drawn picture with flat areas and soft gradients shrinks to a few tens of kilobytes.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (PNG chunks). */
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]!) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** Bits packed least-significant first, as DEFLATE wants them; Huffman codes go in most-significant bit first. */
class BitWriter {
  private bytes = new Uint8Array(1 << 14);
  private length = 0;
  private buffer = 0;
  private count = 0;

  private push(byte: number): void {
    if (this.length === this.bytes.length) {
      const next = new Uint8Array(this.bytes.length * 2);
      next.set(this.bytes);
      this.bytes = next;
    }
    this.bytes[this.length++] = byte;
  }

  bits(value: number, n: number): void {
    this.buffer |= value << this.count;
    this.count += n;
    while (this.count >= 8) {
      this.push(this.buffer & 0xff);
      this.buffer >>>= 8;
      this.count -= 8;
    }
  }

  code(code: number, n: number): void {
    let reversed = 0;
    for (let i = 0; i < n; i++) reversed |= ((code >>> i) & 1) << (n - 1 - i);
    this.bits(reversed, n);
  }

  finish(): Uint8Array {
    if (this.count > 0) this.push(this.buffer & 0xff);
    return this.bytes.slice(0, this.length);
  }
}

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

/** A literal or length symbol in the fixed Huffman code (RFC 1951 §3.2.6). */
function symbol(w: BitWriter, s: number): void {
  if (s < 144) w.code(0x30 + s, 8);
  else if (s < 256) w.code(0x190 + (s - 144), 9);
  else if (s < 280) w.code(s - 256, 7);
  else w.code(0xc0 + (s - 280), 8);
}

function indexOfBase(base: readonly number[], value: number): number {
  let i = base.length - 1;
  while (base[i]! > value) i--;
  return i;
}

const WINDOW = 32768;
const MAX_MATCH = 258;
const MAX_CHAIN = 48;
const HASH_BITS = 15;

/** A zlib stream (RFC 1950) of `data`: one DEFLATE block with the fixed codes. */
export function deflate(data: Uint8Array): Uint8Array {
  const w = new BitWriter();
  w.bits(0x78, 8);
  w.bits(0x01, 8);
  w.bits(1, 1); // the last block
  w.bits(1, 2); // fixed Huffman codes
  const n = data.length;
  const head = new Int32Array(1 << HASH_BITS).fill(-1);
  const prev = new Int32Array(n);
  const mask = (1 << HASH_BITS) - 1;
  const hash = (i: number) => ((data[i]! << 10) ^ (data[i + 1]! << 5) ^ data[i + 2]!) & mask;
  const insert = (i: number) => {
    if (i + 2 >= n) return;
    const h = hash(i);
    prev[i] = head[h]!;
    head[h] = i;
  };
  let i = 0;
  while (i < n) {
    let bestLength = 0;
    let bestDistance = 0;
    if (i + 2 < n) {
      const limit = Math.min(MAX_MATCH, n - i);
      let candidate = head[hash(i)]!;
      for (let chain = 0; candidate >= 0 && i - candidate <= WINDOW && chain < MAX_CHAIN; chain++) {
        if (data[candidate + bestLength] === data[i + bestLength]) {
          let length = 0;
          while (length < limit && data[candidate + length] === data[i + length]) length++;
          if (length > bestLength) {
            bestLength = length;
            bestDistance = i - candidate;
            if (length === limit) break;
          }
        }
        candidate = prev[candidate]!;
      }
    }
    if (bestLength >= 3) {
      const l = indexOfBase(LENGTH_BASE, bestLength);
      symbol(w, 257 + l);
      if (LENGTH_EXTRA[l]) w.bits(bestLength - LENGTH_BASE[l]!, LENGTH_EXTRA[l]!);
      const d = indexOfBase(DIST_BASE, bestDistance);
      w.code(d, 5);
      if (DIST_EXTRA[d]) w.bits(bestDistance - DIST_BASE[d]!, DIST_EXTRA[d]!);
      for (let k = 0; k < bestLength; k++) insert(i + k);
      i += bestLength;
    } else {
      symbol(w, data[i]!);
      insert(i);
      i++;
    }
  }
  symbol(w, 256);
  const body = w.finish();
  const out = new Uint8Array(body.length + 4);
  out.set(body);
  const sum = adler32(data);
  out[body.length] = sum >>> 24;
  out[body.length + 1] = (sum >>> 16) & 0xff;
  out[body.length + 2] = (sum >>> 8) & 0xff;
  out[body.length + 3] = sum & 0xff;
  return out;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** The scanlines with the filter of each row chosen by the smallest sum of absolute differences. */
function filterRows(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const stride = width * 3;
  const out = new Uint8Array((stride + 1) * height);
  const candidates = [new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride)];
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const value = rgb[row + x]!;
      const left = x >= 3 ? rgb[row + x - 3]! : 0;
      const up = y > 0 ? rgb[row - stride + x]! : 0;
      const upLeft = y > 0 && x >= 3 ? rgb[row - stride + x - 3]! : 0;
      candidates[0]![x] = value;
      candidates[1]![x] = (value - left) & 0xff;
      candidates[2]![x] = (value - up) & 0xff;
      candidates[3]![x] = (value - paeth(left, up, upLeft)) & 0xff;
    }
    let best = 0;
    let bestCost = Infinity;
    for (let f = 0; f < 4; f++) {
      let cost = 0;
      const c = candidates[f]!;
      for (let x = 0; x < stride; x++) cost += c[x]! < 128 ? c[x]! : 256 - c[x]!;
      if (cost < bestCost) {
        bestCost = cost;
        best = f;
      }
    }
    const at = y * (stride + 1);
    // PNG filter types: 0 None, 1 Sub, 2 Up, 4 Paeth
    out[at] = best === 3 ? 4 : best;
    out.set(candidates[best]!, at + 1);
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

/** A PNG file of an 8-bit RGB picture (`rgb`: width × height × 3 bytes, rows top to bottom). */
export function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  if (rgb.length !== width * height * 3) throw new Error(`encodePng: ${rgb.length} bytes for ${width}×${height} RGB`);
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8; // bits per channel
  header[9] = 2; // RGB
  const parts = [Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), chunk("IHDR", header), chunk("IDAT", deflate(filterRows(width, height, rgb))), chunk("IEND", new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 of bytes (no line breaks) — the form tools and data URLs carry a picture in. */
export function base64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    out += B64[a >> 2]! + B64[((a & 3) << 4) | (b >> 4)]! + (i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)]! : "=") + (i + 2 < bytes.length ? B64[c & 63]! : "=");
  }
  return out;
}
