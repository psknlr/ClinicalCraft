/** `clinicalcraft cases index [--json]` prints the shared library index (C1). */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { CASE_INDEX_ENTRY_KEYS, type CaseIndexEntry } from "@clinicalcraft/agent";
import { buildCaseIndex, builtinContentDir, loadContent } from "@clinicalcraft/agent/node";
import type { CliIO } from "./context.js";
import { main } from "./main.js";
import { sortedCases } from "./picker.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-index-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 60_000;

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

describe("cases index", () => {
  it("--json prints the index entries in library order (the same builder as serve and the web)", { timeout: T }, async () => {
    const r = await run(["cases", "index", "--json"], sandbox());
    expect(r.code).toBe(0);
    const entries = JSON.parse(r.stdout) as CaseIndexEntry[];
    const content = await loadContent();
    expect(entries.map((e) => e.id)).toEqual(sortedCases(content).map((c) => c.id));
    for (const e of entries) expect(Object.keys(e).sort()).toEqual([...CASE_INDEX_ENTRY_KEYS].sort());
    const builtin = builtinContentDir();
    if (builtin) expect(entries).toEqual((await buildCaseIndex({ dirs: [builtin] })).entries);
    expect(r.stdout).not.toContain("solution");
  });

  it("prints a table in the UI language and reports index problems on stderr", { timeout: T }, async () => {
    const extra = join(root, "extra-content");
    for (const [folder, body] of [
      ["a-case", JSON.stringify({ id: "a-case", title: { en: "Extra case", "zh-CN": "额外病例" }, difficulty: 2 })],
      ["b-dup", JSON.stringify({ id: "a-case", title: "Duplicate" })],
      ["broken", "{ not json"],
    ] as const) {
      mkdirSync(join(extra, "cases", folder), { recursive: true });
      writeFileSync(join(extra, "cases", folder, "case.json"), body);
    }
    const box = sandbox({ contentDirs: [extra] });
    const zh = await run(["cases", "index"], box);
    expect(zh.code).toBe(0);
    expect(zh.stdout).toContain("额外病例");
    expect(zh.stdout).toContain("内容哈希");
    expect(zh.stdout).toMatch(/索引共 \d+ 个病例，来自 2 个内容目录/);
    expect(zh.stderr).toContain("JSON 无效");
    expect(zh.stderr).toContain("病例 id“a-case”重复");
    const en = await run(["cases", "index", "--lang", "en", "--json"], box);
    const entries = JSON.parse(en.stdout) as CaseIndexEntry[];
    expect(entries.find((e) => e.id === "a-case")?.title).toEqual({ en: "Extra case", "zh-CN": "额外病例" });
    expect(en.stderr).toContain('duplicate case id "a-case"');
    expect(en.stderr).toContain("invalid JSON");
  });
});
