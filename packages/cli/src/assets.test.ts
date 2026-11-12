/**
 * `clinicalcraft assets inspect` (docs/ASSETS.md): a GLB generated here (no
 * binary file is committed), inspected alone and against a catalog `model`
 * reference from an extra content directory.
 */
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { encodeGlb, EQUIPMENT_SCHEMA_ID } from "@clinicalcraft/core";
import type { CliIO } from "./context.js";
import { main } from "./main.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-assets-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 60_000;

/** A box mesh (min/max on the POSITION accessor) of w × h × d metres standing on the floor. */
function boxGlb(w: number, h: number, d: number): Uint8Array {
  const pos = new Float32Array(24);
  for (let i = 0; i < 8; i++) pos.set([i & 1 ? w / 2 : -w / 2, i & 2 ? h : 0, i & 4 ? d / 2 : -d / 2], i * 3);
  const idx = new Uint16Array([0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3]);
  const bin = new Uint8Array(pos.byteLength + idx.byteLength);
  bin.set(new Uint8Array(pos.buffer), 0);
  bin.set(new Uint8Array(idx.buffer), pos.byteLength);
  return encodeGlb(
    {
      asset: { version: "2.0", generator: "cli test" },
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      buffers: [{ byteLength: bin.byteLength }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: pos.byteLength },
        { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength },
      ],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 8, type: "VEC3", min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
        { bufferView: 1, componentType: 5123, count: 36, type: "SCALAR" },
      ],
    },
    bin,
  );
}

function sandbox(projectSettings?: Record<string, unknown>): { env: Record<string, string>; cwd: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  if (projectSettings) writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify(projectSettings));
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, cwd };
}

async function run(argv: string[], box: { env: Record<string, string>; cwd: string }): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  let out = "";
  let err = "";
  stdout.on("data", (d: Buffer) => (out += d.toString("utf8")));
  stderr.on("data", (d: Buffer) => (err += d.toString("utf8")));
  stdin.end("");
  const code = await main(argv, { io: { stdout, stderr, stdin } as unknown as CliIO, env: box.env, cwd: box.cwd });
  return { code, stdout: out, stderr: err };
}

const glb = boxGlb(1, 1.2, 2.2);
const file = join(root, "bed.glb");
writeFileSync(file, glb);
const sha256 = createHash("sha256").update(glb).digest("hex");

/** An extra content directory with one catalog whose bed type references the model. */
function catalogDir(model: Record<string, unknown>): string {
  const dir = mkdtempSync(join(root, "content-"));
  mkdirSync(join(dir, "catalogs"), { recursive: true });
  const L = (en: string) => ({ en, "zh-CN": en });
  writeFileSync(
    join(dir, "catalogs", "models.json"),
    JSON.stringify({
      schema: EQUIPMENT_SCHEMA_ID,
      id: "test-models",
      name: L("Test models"),
      equipment: [
        {
          id: "model-bed",
          name: L("Model bed"),
          category: "furniture",
          description: L("A bed with a GLB model"),
          footprint: { w: 1, d: 2.2, h: 1.2 },
          parts: [{ p: [0, 0.3, 0], s: [1, 0.6, 2.2], m: "white" }],
          interaction: { kind: "bed", prompt: L("Bed") },
          model: { uri: "models/bed.glb", license: "CC0-1.0", use: "cleared", source: { name: "Test bench", version: "1.0", retrieved: "2026-10-30" }, ...model },
        },
      ],
    }),
  );
  return dir;
}

describe("assets inspect", () => {
  it("--json describes the file: container, counts, bounds, extensions, sha256", { timeout: T }, async () => {
    const r = await run(["assets", "inspect", file, "--json"], sandbox());
    expect(r.code).toBe(0);
    const info = JSON.parse(r.stdout);
    expect(info).toMatchObject({ container: "glb", version: 2, bytes: glb.byteLength, sha256, extensionsUsed: [], extensionsRequired: [], issues: [] });
    expect(info.chunks.map((c: { type: string }) => c.type)).toEqual(["JSON", "BIN"]);
    expect(info.counts).toMatchObject({ meshes: 1, primitives: 1, triangles: 12, vertices: 8 });
    expect(info.bounds.size).toEqual([1, expect.closeTo(1.2, 6), expect.closeTo(2.2, 6)]);
  });

  it("prints a table in the UI language", { timeout: T }, async () => {
    const zh = await run(["assets", "inspect", file], sandbox());
    expect(zh.code).toBe(0);
    expect(zh.stdout).toContain(sha256);
    expect(zh.stdout).toContain("包围盒");
    expect(zh.stdout).toContain("1.000 × 1.200 × 2.200 m");
    const en = await run(["assets", "inspect", file, "--lang", "en"], sandbox());
    expect(en.stdout).toContain("Bounds");
    expect(en.stdout).toContain("12 triangle(s)");
  });

  it("--type checks the catalog model reference: a match passes, a scale or hash mismatch fails", { timeout: T }, async () => {
    const ok = await run(["assets", "inspect", file, "--type", "model-bed", "--lang", "en"], sandbox({ contentDirs: [catalogDir({ sha256, scale: 1 })] }));
    expect(ok.code).toBe(0);
    expect(ok.stdout).toContain("matches its catalog reference");
    expect(ok.stdout).toContain("Use status");
    expect(ok.stdout).toContain("Test bench · 1.0 · 2026-10-30");
    const pending = await run(["assets", "inspect", file, "--type", "model-bed", "--lang", "zh-CN"], sandbox({ contentDirs: [catalogDir({ sha256, scale: 1, use: "pending" })] }));
    expect(pending.code).toBe(1);
    expect(pending.stdout).toContain("许可待核实（pending）");
    const cm = await run(["assets", "inspect", file, "--type", "model-bed", "--json"], sandbox({ contentDirs: [catalogDir({ sha256, scale: 100 })] }));
    expect(cm.code).toBe(1);
    expect(JSON.parse(cm.stdout).issues).toEqual([expect.objectContaining({ severity: "error", code: "scale" })]);
    const hash = await run(["assets", "inspect", file, "--type", "model-bed", "--json"], sandbox({ contentDirs: [catalogDir({ sha256: "0".repeat(64), scale: 1, license: "CC-BY-4.0" })] }));
    expect(hash.code).toBe(1);
    expect(JSON.parse(hash.stdout).issues.map((i: { code: string }) => i.code).sort()).toEqual(["attribution", "sha256"]);
  });

  it("refuses what is not a model, an unknown type and a missing file", { timeout: T }, async () => {
    const junk = join(root, "junk.glb");
    writeFileSync(junk, "not a model");
    const bad = await run(["assets", "inspect", junk, "--lang", "en"], sandbox());
    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain("not a readable glTF/GLB file");
    const unknown = await run(["assets", "inspect", file, "--type", "no-such-type", "--lang", "en"], sandbox());
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain('Unknown equipment type "no-such-type"');
    const missing = await run(["assets", "inspect", join(root, "nope.glb"), "--lang", "en"], sandbox());
    expect(missing.code).toBe(2);
  });
});
