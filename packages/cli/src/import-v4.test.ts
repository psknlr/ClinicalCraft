import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildV4Html, splitParts, writeZip } from "./__fixtures__/v4.js";
import { classifyName, collectInputs, decodeBase64, extractCaseDataJson, importV4, joinParts, V4_CASE_ID, V4_SHA256 } from "./import-v4.js";
import { crc32, listZip, readZipEntry, ZipError } from "./zip.js";

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
});

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
