import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { builtinContentDir, loadContent } from "./content.js";

const root = mkdtempSync(join(tmpdir(), "cc-content-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function write(path: string, value: unknown) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value));
}

const miniCase = (id: string, title = "Mini") => ({
  schema: "clinicalcraft/case@1",
  id,
  version: "1.0.0",
  title,
  summary: "Minimal synthetic case",
  specialty: ["general"],
  difficulty: 1,
  setting: "outpatient",
  locales: ["en"],
  provenance: { kind: "synthetic" },
  patient: {
    displayName: "Test Patient",
    age: 40,
    sex: "male",
    chiefComplaint: "cough",
    persona: { personality: "calm", speechStyle: "plain", openingLine: "Hello doctor.", fallbackUnknown: "I'm not sure." },
  },
  phases: [{ id: "visit", label: "Visit" }],
  objectives: [{ id: "talk", title: "Talk", hint: "Ask about the cough", completeWhen: { always: true } }],
  debrief: { title: "Done", conclusion: "Synthetic." },
});

describe("loadContent", () => {
  it("loads and validates cases, facilities and catalogs from content dirs", async () => {
    const a = join(root, "a");
    const b = join(root, "b");
    write(join(a, "cases", "mini-case", "case.json"), miniCase("mini-case"));
    write(join(a, "cases", "wrong-dir", "case.json"), miniCase("named-differently"));
    write(join(a, "cases", "broken", "case.json"), { schema: "clinicalcraft/case@1", id: "broken" });
    write(join(a, "cases", "bad-json", "case.json"), "{ nope");
    write(join(a, "cases", "no-case-file", "README.md"), "x");
    write(join(a, "catalogs", "mini.json"), { schema: "clinicalcraft/equipment-catalog@1", id: "mini-cat", name: "Mini catalog" });
    write(join(a, "facilities", "clinic.json"), {
      schema: "clinicalcraft/facility@1",
      id: "mini-clinic",
      name: { "zh-CN": "小诊所", en: "Mini clinic" },
      description: "Test",
      bounds: { minX: 0, maxX: 20, minZ: 0, maxZ: 20 },
      spawn: { x: 2, z: 2 },
      catalogs: ["mini-cat"],
    });
    write(join(a, "facilities", "notes.txt"), "ignored");
    write(join(b, "cases", "mini-case", "case.json"), miniCase("mini-case", "Overridden"));

    const content = await loadContent({ dirs: [a, b, join(root, "missing")], builtin: false });
    expect(content.dirs).toEqual([a, b]);
    expect([...content.cases.keys()].sort()).toEqual(["mini-case", "named-differently"]);
    expect(content.cases.get("mini-case")).toMatchObject({ dir: join(b, "cases", "mini-case"), def: { title: "Overridden", clock: { mode: "static" } } });
    expect(content.facilities.get("mini-clinic")?.def.catalogs).toEqual(["mini-cat"]);
    expect(content.catalogs.get("mini-cat")?.def.equipment).toEqual([]);

    const byFile = Object.fromEntries(content.issues.map((i) => [i.file, i.issues]));
    expect(byFile[join(a, "cases", "broken", "case.json")]!.some((i) => i.severity === "error")).toBe(true);
    expect(byFile[join(a, "cases", "bad-json", "case.json")]![0]!.message).toMatch(/invalid JSON/);
    expect(byFile[join(a, "cases", "wrong-dir", "case.json")]!.some((i) => /differs from its directory/.test(i.message))).toBe(true);
    expect(byFile[join(b, "cases", "mini-case", "case.json")]!.some((i) => /overrides/.test(i.message))).toBe(true);
    expect(byFile[join(root, "missing")]![0]).toMatchObject({ severity: "warning" });
  });

  it("finds the built-in @clinicalcraft/content directory", async () => {
    const dir = builtinContentDir();
    expect(dir).toMatch(/packages[\\/]content$/);
    const content = await loadContent({ dirs: [] });
    expect(content.dirs[0]).toBe(dir);
    expect(content.catalogs.size).toBeGreaterThan(0);
  });

  it("two folders of one directory with the same id: the first folder wins, with an error (like the case index)", async () => {
    const dir = join(root, "dups");
    write(join(dir, "cases", "dup-a", "case.json"), miniCase("dup", "First"));
    write(join(dir, "cases", "dup-b", "case.json"), miniCase("dup", "Second"));
    const content = await loadContent({ dirs: [dir], builtin: false });
    expect(content.cases.get("dup")?.def.title).toBe("First");
    const issues = content.issues.find((i) => i.file === join(dir, "cases", "dup-b", "case.json"))?.issues ?? [];
    expect(issues.some((i) => i.severity === "error" && /duplicate case id "dup"/.test(i.message))).toBe(true);
  });

  it("`cases: false` loads facilities and catalogs only", async () => {
    const content = await loadContent({ dirs: [], cases: false });
    expect(content.cases.size).toBe(0);
    expect(content.facilities.size).toBeGreaterThan(0);
    expect(content.catalogs.size).toBeGreaterThan(0);
  });
});
