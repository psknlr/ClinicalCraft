/** The bundled case index module (C1): what `virtual:clinicalcraft/case-index` exports. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { libraryOrder, type CaseIndexEntry } from "@clinicalcraft/agent";
import { buildCaseIndex } from "@clinicalcraft/agent/node";
import { afterAll, describe, expect, it } from "vitest";
import { CASE_FOLDERS, CASE_INDEX, CASE_INDEX_ISSUES } from "virtual:clinicalcraft/case-index";
import { CASE_INDEX_MODULE, caseIndexModule, caseIndexPlugin } from "./case-index-plugin.js";

const contentDir = fileURLToPath(new URL("../../../content/", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "cc-case-index-plugin-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

/** Evaluate the generated module source. */
async function evaluate(code: string): Promise<{ CASE_INDEX: CaseIndexEntry[]; CASE_FOLDERS: Record<string, string>; CASE_INDEX_ISSUES: string[] }> {
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}

describe("virtual:clinicalcraft/case-index", () => {
  it("exports the shared index of packages/content in library order, and each case's folder", async () => {
    const snapshot = await buildCaseIndex({ dirs: [contentDir] });
    expect(CASE_INDEX).toEqual(snapshot.entries);
    expect(CASE_INDEX.map((e) => e.id)).toEqual(libraryOrder(CASE_INDEX).map((e) => e.id));
    expect(Object.keys(CASE_FOLDERS).sort()).toEqual(CASE_INDEX.map((e) => e.id).sort());
    for (const [id, folder] of Object.entries(CASE_FOLDERS)) expect(snapshot.files.get(id)?.folder).toBe(folder);
    expect(CASE_INDEX_ISSUES).toEqual([]);
  });

  it("reports index problems with paths relative to the content directory", async () => {
    const dir = join(root, "content");
    for (const [folder, body] of [
      ["good", JSON.stringify({ id: "good", title: "Good" })],
      ["broken", "{ nope"],
      ["twin", JSON.stringify({ id: "good", title: "Twin" })],
    ] as const) {
      mkdirSync(join(dir, "cases", folder), { recursive: true });
      writeFileSync(join(dir, "cases", folder, "case.json"), body);
    }
    const { code, files } = await caseIndexModule(dir);
    const mod = await evaluate(code);
    expect(mod.CASE_INDEX.map((e) => e.id)).toEqual(["good"]);
    expect(mod.CASE_FOLDERS).toEqual({ good: "good" });
    expect(mod.CASE_INDEX_ISSUES).toHaveLength(2);
    expect(mod.CASE_INDEX_ISSUES.some((i) => i.startsWith("cases/broken/case.json: invalid JSON"))).toBe(true);
    expect(mod.CASE_INDEX_ISSUES.some((i) => i.startsWith("cases/twin/case.json: duplicate case id"))).toBe(true);
    expect(mod.CASE_INDEX_ISSUES.join("\n")).not.toContain(root);
    expect(files).toEqual([join(dir, "cases", "good", "case.json")]);
  });

  it("resolves and loads only its own virtual id", async () => {
    const plugin = caseIndexPlugin({ contentDir });
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    const load = plugin.load as (this: { addWatchFile(file: string): void }, id: string) => Promise<string | undefined>;
    expect(resolveId("other")).toBeUndefined();
    const resolved = resolveId(CASE_INDEX_MODULE)!;
    expect(resolved.startsWith("\0")).toBe(true);
    const watched: string[] = [];
    const ctx = { addWatchFile: (file: string) => watched.push(file) };
    expect(await load.call(ctx, "other")).toBeUndefined();
    const code = (await load.call(ctx, resolved))!;
    expect((await evaluate(code)).CASE_INDEX).toEqual(CASE_INDEX);
    expect(watched.length).toBe(CASE_INDEX.length); // `vite build --watch` rebuilds when a case changes
  });
});
