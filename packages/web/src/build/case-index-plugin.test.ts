/** The bundled case index module (C1): what `virtual:clinicalcraft/case-index` exports. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { libraryOrder, type CaseIndexEntry } from "@clinicalcraft/agent";
import { buildCaseIndex } from "@clinicalcraft/agent/node";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, describe, expect, it, vi } from "vitest";
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

  it("invalidates case changes with either path separator and ignores unrelated files", () => {
    const plugin = caseIndexPlugin({ contentDir });
    const callbacks = new Map<string, (file: string) => void>();
    const module = { id: `\0${CASE_INDEX_MODULE}` };
    const watcher = { add: vi.fn(), on: vi.fn((event: string, callback: (file: string) => void) => callbacks.set(event, callback)) };
    const invalidateModule = vi.fn();
    const send = vi.fn();
    const configure = plugin.configureServer as (server: ViteDevServer) => void;
    configure({ watcher, moduleGraph: { getModuleById: () => module, invalidateModule }, ws: { send } } as unknown as ViteDevServer);
    expect(watcher.add).toHaveBeenCalledWith(join(contentDir, "cases"));
    const file = join(contentDir, "cases", "new-case", "case.json");
    callbacks.get("add")!(file.replace(/\\/g, "/"));
    callbacks.get("change")!(file.replace(/\//g, "\\"));
    callbacks.get("unlink")!(file);
    expect(invalidateModule).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledTimes(3);
    callbacks.get("change")!(join(contentDir, "cases", "new-case", "README.md"));
    callbacks.get("change")!(join(contentDir, "cases-other", "new-case", "case.json"));
    callbacks.get("change")!(join(contentDir, "cases", "new-case", "other-case.json"));
    expect(invalidateModule).toHaveBeenCalledTimes(3);
  });

  it("discovers a newly added sibling case directory in the running dev server", async () => {
    const dir = join(root, "live-content");
    const webRoot = join(root, "live-web");
    mkdirSync(join(dir, "cases", "first"), { recursive: true });
    mkdirSync(webRoot, { recursive: true });
    writeFileSync(join(dir, "cases", "first", "case.json"), JSON.stringify({ id: "first", title: "First" }));
    const server = await createServer({ configFile: false, root: webRoot, logLevel: "silent", plugins: [caseIndexPlugin({ contentDir: dir })], server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] } });
    const url = CASE_INDEX_MODULE;
    try {
      await new Promise<void>((resolve) => server.watcher.once("ready", () => resolve()));
      const first = await server.transformRequest(url);
      expect(first!.code).toContain('"id":"first"');
      expect(first!.code).not.toContain('"id":"second"');
      mkdirSync(join(dir, "cases", "second"));
      writeFileSync(join(dir, "cases", "second", "case.json"), JSON.stringify({ id: "second", title: "Second" }));
      await vi.waitFor(async () => {
        expect((await server.transformRequest(url))!.code).toContain('"id":"second"');
      }, { timeout: 20_000 });
    } finally {
      await server.close();
    }
  }, 30_000);
});
