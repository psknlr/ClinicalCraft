import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { caseIndexEntry, libraryOrder } from "../library.js";
import { buildCaseIndex, CaseIndexer, contentHash } from "./case-index.js";
import { builtinContentDir, loadContent } from "./content.js";

const root = mkdtempSync(join(tmpdir(), "cc-case-index-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function write(dir: string, folder: string, value: unknown): string {
  const file = join(dir, "cases", folder, "case.json");
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
  return file;
}

const mini = (id: string, extra: Record<string, unknown> = {}) => ({ id, version: "1.0.0", title: { en: `Case ${id}`, "zh-CN": `病例 ${id}` }, difficulty: 2, provenance: { kind: "synthetic" }, ...extra });

describe("CaseIndexer", () => {
  it("indexes every case folder, reports bad files and resolves duplicate ids deterministically", async () => {
    const a = join(root, "a");
    const b = join(root, "b");
    write(a, "alpha", mini("alpha"));
    write(a, "beta", mini("gamma"));
    write(a, "broken", "{ nope");
    write(a, "noid", { title: "x" });
    const dup1 = write(a, "dup1", mini("dup", { difficulty: 1 }));
    const dup2 = write(a, "dup2", mini("dup", { difficulty: 5 }));
    const alphaB = write(b, "alpha", mini("alpha", { title: "Overridden" }));
    mkdirSync(join(a, "cases", "empty-folder"), { recursive: true });

    for (let run = 0; run < 3; run++) {
      // Same verdict whatever order the reads complete in.
      const snap = await buildCaseIndex({ dirs: [a, b, join(root, "missing")], concurrency: run + 1 });
      expect(snap.entries.map((e) => e.id)).toEqual(["dup", "alpha", "gamma"]); // library order: difficulty 1, then 2 by id
      expect(snap.files.get("alpha")?.file).toBe(alphaB);
      expect(snap.files.get("alpha")?.entry.title).toBe("Overridden");
      expect(snap.files.get("dup")?.file).toBe(dup1);
      expect(snap.files.get("gamma")?.folder).toBe("beta");
      const byCode = (code: string) => snap.issues.filter((i) => i.code === code);
      expect(byCode("invalid-json").map((i) => i.file)).toEqual([join(a, "cases", "broken", "case.json")]);
      expect(byCode("missing-id").map((i) => i.file)).toEqual([join(a, "cases", "noid", "case.json")]);
      const dups = byCode("duplicate-id");
      expect(dups.find((i) => i.file === dup2)).toMatchObject({ severity: "error", id: "dup", usedFile: dup1 });
      expect(dups.find((i) => i.file === join(a, "cases", "alpha", "case.json"))).toMatchObject({ severity: "warning", id: "alpha", usedFile: alphaB });
      expect(snap.stats.files).toBe(7);
    }
  });

  it("re-reads only files whose mtime or size changed", async () => {
    const dir = join(root, "incremental");
    const one = write(dir, "one", mini("one"));
    const two = write(dir, "two", mini("two"));
    const indexer = new CaseIndexer({ dirs: [dir] });
    const first = await indexer.refresh();
    expect(first.stats.read).toBe(2);
    const again = await indexer.refresh();
    expect(again.stats.read).toBe(0);
    expect(again.generation).toBe(first.generation);
    expect(again.entries).toEqual(first.entries);

    writeFileSync(one, JSON.stringify(mini("one", { title: "Changed title, longer file" })));
    const changed = await indexer.refresh();
    expect(changed.stats.read).toBe(1);
    expect(changed.generation).toBe(first.generation + 1);
    expect(changed.files.get("one")?.entry.title).toBe("Changed title, longer file");
    expect(changed.files.get("one")?.entry.contentHash).not.toBe(first.files.get("one")?.entry.contentHash);

    const later = new Date(Date.now() + 5_000);
    utimesSync(two, later, later);
    expect((await indexer.refresh()).stats.read).toBe(1);

    unlinkSync(two);
    const removed = await indexer.refresh();
    expect(removed.entries.map((e) => e.id)).toEqual(["one"]);
    expect(removed.generation).toBeGreaterThan(changed.generation);
    // Concurrent refreshes share one scan.
    const [x, y] = await Promise.all([indexer.refresh(), indexer.refresh()]);
    expect(x).toBe(y);
  });

  it("indexes the built-in content with the shared builder and the file hash", async () => {
    const dir = builtinContentDir();
    if (!dir) return;
    const snap = await buildCaseIndex({ dirs: [dir] });
    const content = await loadContent({ dirs: [] });
    expect(snap.issues).toEqual([]);
    expect(snap.entries.map((e) => e.id)).toEqual(libraryOrder([...content.cases.values()].map((c) => c.def)).map((c) => c.id));
    for (const entry of snap.entries) {
      const bytes = readFileSync(snap.files.get(entry.id)!.file);
      expect(entry.contentHash).toBe(createHash("sha256").update(bytes).digest("hex").slice(0, 16));
      expect(entry.contentHash).toBe(contentHash(bytes));
      expect(entry).toEqual(caseIndexEntry(JSON.parse(bytes.toString("utf8")), entry.contentHash));
    }
  });
});
