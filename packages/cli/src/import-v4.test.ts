import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildV4Html, splitParts, writeZip } from "./__fixtures__/v4.js";
import { classifyName, collectInputs, decodeBase64, extractCaseDataJson, importV4, joinParts, MAX_ARCHIVE_BYTES, MAX_ZIP_PIECES, V4_CASE_ID, V4_SHA256 } from "./import-v4.js";
import { crc32, listZip, MAX_ENTRY_BYTES, readZipEntry, ZipError } from "./zip.js";

const tmp = mkdtempSync(join(tmpdir(), "cc-import-unit-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

describe("zip reader", () => {
  it("lists and extracts stored and deflated entries", () => {
    const a = Buffer.from("hello hello hello hello");
    const b = Buffer.from("名字 utf-8 ✓");
    const zip = writeZip([
      { name: "dir/a.txt", data: a, method: 8 },
      { name: "b 说明.txt", data: b, method: 0 },
    ]);
    const entries = listZip(zip);
    expect(entries.map((e) => [e.name, e.method, e.size])).toEqual([
      ["dir/a.txt", 8, a.length],
      ["b 说明.txt", 0, b.length],
    ]);
    expect(readZipEntry(zip, entries[0]!).equals(a)).toBe(true);
    expect(readZipEntry(zip, entries[1]!).equals(b)).toBe(true);
  });

  it("computes the IEEE CRC-32", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });

  it("rejects non-zips and corrupted data", () => {
    expect(() => listZip(Buffer.from("not a zip at all, definitely not"))).toThrow(ZipError);
    const zip = writeZip([{ name: "x.bin", data: Buffer.alloc(100, 1), method: 0 }]);
    const entry = listZip(zip)[0]!;
    const corrupt = Buffer.from(zip);
    corrupt[30 + "x.bin".length + 10] = 2; // flip a data byte → CRC mismatch
    expect(() => readZipEntry(corrupt, entry)).toThrow(/CRC/);
  });

  it("never inflates beyond the declared size (decompression bombs)", () => {
    const zip = writeZip([{ name: "bomb.html", data: Buffer.alloc(8 * 1024 * 1024, 0), method: 8 }]);
    const entry = listZip(zip)[0]!;
    expect(zip.length).toBeLessThan(64 * 1024); // 8 MiB of zeros deflate to a few KiB
    // A lying header: claims 16 bytes — inflation stops there instead of allocating 8 MiB.
    expect(() => readZipEntry(zip, { ...entry, size: 16 })).toThrow(/cannot inflate/);
    expect(() => readZipEntry(zip, { ...entry, size: 4 * 1024 * 1024 * 1024 })).toThrow(/too large/);
    expect(readZipEntry(zip, entry).length).toBe(8 * 1024 * 1024);
    // Per-entry cap: 128 MiB (the real V4 html is ~43.5 MB) and any smaller budget the caller passes.
    expect(MAX_ENTRY_BYTES).toBe(128 * 1024 * 1024);
    expect(() => readZipEntry(zip, { ...entry, size: MAX_ENTRY_BYTES + 1 })).toThrow(/too large/);
    expect(() => readZipEntry(zip, entry, 1024 * 1024)).toThrow(/too large/);
  });

  it("rejects central-directory entries that share or overlap local data (one deflated bomb listed many times)", () => {
    const one = writeZip([{ name: "V4.html.part01", data: Buffer.alloc(1024 * 1024, 0x41), method: 8 }]);
    const forged = duplicateEntries(one, ["V4.html.part01", "V4.html.part02", "V4.html.part03", "V4.html.part04"]);
    expect(() => listZip(forged)).toThrow(ZipError);
    expect(() => listZip(forged)).toThrow(/overlap/);
    const stored = writeZip([
      { name: "a.html.part01", data: Buffer.alloc(64, 1), method: 0 },
      { name: "a.html.part02", data: Buffer.alloc(64, 2), method: 0 },
    ]);
    expect(listZip(stored)).toHaveLength(2); // ordinary archives are fine
  });

  it("collectInputs keeps a cumulative inflated-byte budget and limits html/part entries", async () => {
    const part = Buffer.alloc(512 * 1024, 0x42);
    const three = join(tmp, "three-parts.zip");
    writeFileSync(three, writeZip([1, 2, 3].map((i) => ({ name: `big.html.part0${i}`, data: part }))));
    // Each part fits the per-entry cap; together they exceed a 1 MiB archive budget.
    await expect(collectInputs([three], { maxTotalBytes: 1024 * 1024 })).rejects.toThrow(/budget/);
    expect((await collectInputs([three], { maxTotalBytes: 2 * 1024 * 1024 })).parts.get("big.html")!.size).toBe(3);
    expect(MAX_ARCHIVE_BYTES).toBe(256 * 1024 * 1024);
    // The budget spans every input archive.
    const again = join(tmp, "three-parts-copy.zip");
    writeFileSync(again, readFileSync(three));
    await expect(collectInputs([three, again], { maxTotalBytes: 2 * 1024 * 1024 })).rejects.toThrow(/budget/);
    // At most MAX_ZIP_PIECES html/part entries are inflated.
    const many = join(tmp, "many-parts.zip");
    writeFileSync(many, writeZip(Array.from({ length: MAX_ZIP_PIECES + 1 }, (_, i) => ({ name: `m.html.part${String(i + 1).padStart(2, "0")}`, data: Buffer.from("x") }))));
    await expect(collectInputs([many])).rejects.toThrow(/too many/);
  });
});

/** Re-point a one-entry archive's central-directory record under several names at the same local header. */
function duplicateEntries(zip: Buffer, names: readonly string[]): Buffer {
  const cdSize = zip.readUInt32LE(zip.length - 22 + 12);
  const cdOffset = zip.readUInt32LE(zip.length - 22 + 16);
  const record = zip.subarray(cdOffset, cdOffset + cdSize);
  const fixed = record.subarray(0, 46);
  const centrals = names.map((name) => {
    const n = Buffer.from(name, "utf8");
    const head = Buffer.from(fixed);
    head.writeUInt16LE(n.length, 28);
    return Buffer.concat([head, n]);
  });
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.from(zip.subarray(zip.length - 22));
  eocd.writeUInt16LE(names.length, 8);
  eocd.writeUInt16LE(names.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  return Buffer.concat([zip.subarray(0, cdOffset), cd, eocd]);
}

describe("import-v4 helpers", () => {
  it("classifies inputs by name", () => {
    expect(classifyName("Virtual_Patient_V4(1).html")).toEqual({ kind: "html" });
    expect(classifyName("/x/Virtual_Patient_V4(1).html.part02")).toEqual({ kind: "part", base: "Virtual_Patient_V4(1).html", index: 2 });
    expect(classifyName("Virtual_Patient_V4_Part1.zip")).toEqual({ kind: "zip" });
    expect(classifyName("restore_html.sh")).toEqual({ kind: "other" });
  });

  it("extracts window.CASE_DATA up to the closing script tag", () => {
    expect(extractCaseDataJson('<script>window.CASE_DATA = {"a":1};</script><script>x</script>')).toBe('{"a":1}');
    expect(extractCaseDataJson("<script>var x = 1;</script>")).toBeNull();
    expect(extractCaseDataJson('<script>window.CASE_DATA={"a":')).toBeNull();
    expect(decodeBase64("data:image/png;base64,aGk=").toString()).toBe("hi");
  });

  it("joins parts in numeric order and reports missing ones", () => {
    const piece = (name: string, s: string) => ({ name, origin: name, data: Buffer.from(s) });
    const group = new Map([
      [2, piece("f.part02", "world")],
      [1, piece("f.part01", "hello ")],
    ]);
    expect(joinParts(group).data.toString()).toBe("hello world");
    expect(() => joinParts(new Map([[2, piece("f.part02", "x")]]))).toThrow(/missing part 01/);
  });
});

describe("importV4", () => {
  const fx = buildV4Html(3);

  async function check(dest: string, files: string[]) {
    const inputs = await collectInputs(files);
    const result = await importV4(inputs, dest, files);
    expect(result.sha256).toBe(sha(fx.html));
    expect(result.verified).toBe(false);
    expect(result.warnings.some((w) => w.includes(V4_SHA256))).toBe(true);
    expect(readFileSync(join(dest, "anatomy/anatomy.glb.gz")).equals(fx.glbGz)).toBe(true);
    expect(JSON.parse(readFileSync(join(dest, "anatomy/catalog.json"), "utf8"))).toEqual(fx.catalog);
    fx.figures.forEach((fig, i) => expect(readFileSync(join(dest, `cases/${V4_CASE_ID}/fig${i + 1}.png`)).equals(fig)).toBe(true));
    expect(readFileSync(join(dest, `cases/${V4_CASE_ID}/source_case_report.pdf`)).equals(fx.pdf)).toBe(true);
    const manifest = JSON.parse(readFileSync(join(dest, "manifest.json"), "utf8"));
    expect(manifest.source.sha256).toBe(sha(fx.html));
    expect(manifest.files).toHaveLength(2 + fx.figures.length + 1);
    for (const f of manifest.files) expect(f.sha256).toBe(sha(readFileSync(join(dest, f.path))));
    return result;
  }

  it("installs from the merged html", async () => {
    const file = join(tmp, "Virtual_Patient_V4(1).html");
    writeFileSync(file, fx.html);
    await check(join(tmp, "dest-html"), [file]);
  });

  it("installs from .part01/.part02 given in any order", async () => {
    const [p1, p2] = splitParts(fx.html, 2);
    const f1 = join(tmp, "Virtual_Patient_V4(1).html.part01");
    const f2 = join(tmp, "Virtual_Patient_V4(1).html.part02");
    writeFileSync(f1, p1!);
    writeFileSync(f2, p2!);
    await check(join(tmp, "dest-parts"), [f2, f1]);
  });

  it("installs from the two zip archives", async () => {
    const [p1, p2] = splitParts(fx.html, 2);
    const z1 = join(tmp, "Virtual_Patient_V4_Part1.zip");
    const z2 = join(tmp, "Virtual_Patient_V4_Part2.zip");
    writeFileSync(z1, writeZip([{ name: "Virtual_Patient_V4(1).html.part01", data: p1! }, { name: "restore_html.sh", data: Buffer.from("cat a b > c\n"), method: 0 }]));
    writeFileSync(z2, writeZip([{ name: "Virtual_Patient_V4(1).html.part02", data: p2!, method: 0 }]));
    const inputs = await collectInputs([z1, z2]);
    expect(inputs.ignored).toEqual(["Virtual_Patient_V4_Part1.zip:restore_html.sh"]);
    await check(join(tmp, "dest-zips"), [z1, z2]);
  });

  it("fails clearly when a part is missing or CASE_DATA is absent", async () => {
    const [p1] = splitParts(fx.html, 2);
    const f1 = join(tmp, "only.html.part01");
    writeFileSync(f1, p1!);
    await expect(importV4(await collectInputs([f1]), join(tmp, "dest-bad"), [f1])).rejects.toThrow(/CASE_DATA/);
    const empty = join(tmp, "empty.html");
    writeFileSync(empty, "<html><script>1</script></html>");
    await expect(importV4(await collectInputs([empty]), join(tmp, "dest-bad2"), [empty])).rejects.toThrow(/CASE_DATA not found/);
  });
});
