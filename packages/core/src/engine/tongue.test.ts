/**
 * A tongue picture drawn from data (docs/STUDIES.md §8): a valid PNG, the same bytes for the same data and seed, what
 * the data says visible in the pixels (the body colour, a coating, a colour card, a light's cast), and the capture's
 * quality check.
 */
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { TongueAppearanceSchema, TongueCaptureSchema, type TongueAppearance, type TongueCapture } from "../schema/tongue.js";
import { crc32, encodePng } from "./png.js";
import { captureQuality, drawPicture, drawTongue, PICTURE_SIZE } from "./tongue.js";

const appearance = (a: Partial<TongueAppearance> & { coating?: Partial<TongueAppearance["coating"]> } = {}): TongueAppearance =>
  TongueAppearanceSchema.parse({ body: "pale-red", shape: [], ...a, coating: { color: "white", thickness: "thin", ...(a.coating ?? {}) } });
const capture = (c: Partial<TongueCapture> = {}): TongueCapture => TongueCaptureSchema.parse(c);

/** The PNG's chunks, checked: signature, CRCs, and the decompressed, unfiltered pixels. */
function decode(png: Uint8Array): { width: number; height: number; rgb: Uint8Array } {
  expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  let width = 0;
  let height = 0;
  const idat: Uint8Array[] = [];
  for (;;) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...png.slice(at + 4, at + 8));
    expect(view.getUint32(at + 8 + length), `${type} CRC`).toBe(crc32(png, at + 4, at + 8 + length));
    if (type === "IHDR") {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      expect([...png.slice(at + 16, at + 21)]).toEqual([8, 2, 0, 0, 0]);
    } else if (type === "IDAT") idat.push(png.slice(at + 8, at + 8 + length));
    at += 12 + length;
    if (type === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(idat.map((x) => Buffer.from(x))));
  const stride = width * 3;
  const rgb = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]!;
      const a = x >= 3 ? rgb[y * stride + x - 3]! : 0;
      const b = y > 0 ? rgb[(y - 1) * stride + x]! : 0;
      const c = x >= 3 && y > 0 ? rgb[(y - 1) * stride + x - 3]! : 0;
      const p = a + b - c;
      const pr = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      rgb[y * stride + x] = (v + (filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : pr)) & 0xff;
    }
  }
  return { width, height, rgb };
}

/** The mean colour of a box of the picture (fractions of its side). */
function mean(rgb: Uint8Array, x0: number, y0: number, x1: number, y1: number): [number, number, number] {
  const s = PICTURE_SIZE;
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = Math.floor(y0 * s); y < Math.floor(y1 * s); y++)
    for (let x = Math.floor(x0 * s); x < Math.floor(x1 * s); x++) {
      for (let c = 0; c < 3; c++) sum[c]! += rgb[(y * s + x) * 3 + c]!;
      n++;
    }
  return sum.map((v) => v / n) as [number, number, number];
}

describe("the PNG encoder", () => {
  it("writes a valid PNG that decodes to the same pixels", () => {
    const w = 37;
    const h = 11;
    const rgb = new Uint8Array(w * h * 3).map((_, i) => (i * 37 + Math.floor(i / 7)) & 0xff);
    const decoded = decode(encodePng(w, h, rgb));
    expect([decoded.width, decoded.height]).toEqual([w, h]);
    expect(Buffer.from(decoded.rgb).equals(Buffer.from(rgb))).toBe(true);
  });

  it("refuses pixels that do not fill the picture", () => {
    expect(() => encodePng(2, 2, new Uint8Array(11))).toThrow();
  });
});

describe("a tongue drawn from data", () => {
  it("is a PNG of the picture's size, the same bytes for the same data and seed", () => {
    const a = drawPicture({ kind: "tongue", appearance: appearance(), capture: capture() }, "acc-1");
    const b = drawPicture({ kind: "tongue", appearance: appearance(), capture: capture() }, "acc-1");
    expect(a.mediaType).toBe("image/png");
    expect(Buffer.from(a.png).equals(Buffer.from(b.png))).toBe(true);
    expect(a.base64).toBe(Buffer.from(a.png).toString("base64"));
    const decoded = decode(a.png);
    expect([decoded.width, decoded.height]).toEqual([PICTURE_SIZE, PICTURE_SIZE]);
    expect(Buffer.from(decoded.rgb).equals(Buffer.from(drawTongue(appearance(), capture(), "acc-1").rgb))).toBe(true);
    // small enough to travel with a tool result
    expect(a.png.length).toBeLessThan(120_000);
  });

  it("shows the body colour, and a thick yellow coating where the data puts it", () => {
    const body = (a: TongueAppearance) => mean(drawTongue(a, capture()).rgb, 0.28, 0.72, 0.38, 0.8);
    const pale = body(appearance({ body: "pale", coating: { thickness: "none" } }));
    const red = body(appearance({ body: "red", coating: { thickness: "none" } }));
    // a red tongue is redder against its green than a pale one
    expect(red[0] - red[1]).toBeGreaterThan(pale[0] - pale[1] + 30);
    const centre = (a: TongueAppearance) => mean(drawTongue(a, capture()).rgb, 0.46, 0.45, 0.54, 0.55);
    const bare = centre(appearance({ coating: { thickness: "none" } }));
    const yellow = centre(appearance({ coating: { color: "yellow", thickness: "thick" } }));
    // a yellow coating lifts the green and lowers the blue against the body's red
    expect(yellow[1] - bare[1]).toBeGreaterThan(30);
    expect(yellow[1] - yellow[2]).toBeGreaterThan(bare[1] - bare[2] + 20);
  });

  it("a colour card is in the frame only when the capture says so, and warm light casts over everything", () => {
    // the card's top-left patch (white): x 0.036–0.094, y 0.826–0.885 of the frame
    const card = (c: TongueCapture) => mean(drawTongue(appearance(), c).rgb, 0.045, 0.835, 0.088, 0.878);
    const withCard = card(capture({ colorCard: true }));
    const without = card(capture({ colorCard: false }));
    // the card's white patch is near white; without a card, skin
    expect(Math.min(...withCard)).toBeGreaterThan(225);
    expect(Math.min(...without)).toBeLessThan(200);
    // under warm light the card's white is no longer white: blue drops most
    const warm = card(capture({ light: "warm" }));
    expect(warm[0] - warm[2]).toBeGreaterThan(40);
    const dim = card(capture({ light: "dim" }));
    expect(Math.max(...dim)).toBeLessThan(160);
  });

  it("the seed moves only where the light glints, not what the tongue looks like", () => {
    const a = drawTongue(appearance(), capture(), "acc-1").rgb;
    const b = drawTongue(appearance(), capture(), "acc-2").rgb;
    let differ = 0;
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i]! - b[i]!) > 8) differ++;
    expect(differ).toBeGreaterThan(0);
    expect(differ / a.length).toBeLessThan(0.05);
  });
});

describe("the capture's quality check", () => {
  it("passes a station's capture and names each reason a capture fails", () => {
    expect(captureQuality(capture())).toEqual({ passed: true, reasons: [] });
    expect(captureQuality(capture({ light: "daylight" })).passed).toBe(true);
    const kiosk = captureQuality(capture({ light: "warm", colorCard: false }));
    expect(kiosk.passed).toBe(false);
    expect(kiosk.reasons.map((r) => r.id)).toEqual(["light", "color-card"]);
    expect(kiosk.reasons[0]!.text.en).toContain("warm room light");
    expect(captureQuality(capture({ focus: "soft" })).reasons.map((r) => r.id)).toEqual(["focus"]);
  });
});
