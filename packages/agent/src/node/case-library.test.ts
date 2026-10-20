/**
 * The case library of one-case front-ends (CLI play/exec, MCP): cases are
 * indexed, not validated; only the case being started is parsed and
 * validated — a broken case elsewhere in the library costs nothing and
 * blocks nothing.
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { BootstrapError, createNodeSession } from "./bootstrap.js";
import { CaseLibrary, loadCaseFile } from "./case-library.js";
import { builtinContentDir, loadContent } from "./content.js";

const root = mkdtempSync(join(tmpdir(), "cc-case-library-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const builtin = builtinContentDir()!;
const stemi = JSON.parse(readFileSync(join(builtin, "cases", "stemi-inferior-rv", "case.json"), "utf8")) as Record<string, unknown>;

/** A content dir with a valid copy of STEMI under another id and a broken case. */
function contentDir(): string {
  const dir = mkdtempSync(join(root, "content-"));
  mkdirSync(join(dir, "cases", "stemi-copy"), { recursive: true });
  writeFileSync(join(dir, "cases", "stemi-copy", "case.json"), JSON.stringify({ ...stemi, id: "stemi-copy" }));
  mkdirSync(join(dir, "cases", "broken-case"), { recursive: true });
  writeFileSync(join(dir, "cases", "broken-case", "case.json"), JSON.stringify({ ...stemi, id: "broken-case", objectives: "not an array" }));
  return dir;
}

describe("CaseLibrary", () => {
  it("lists the index (library order, no validation) and validates only the case that is loaded", async () => {
    const dir = contentDir();
    const library = await CaseLibrary.open({ dirs: [dir] });
    const ids = await library.ids();
    expect(ids).toContain("stemi-copy");
    expect(ids).toContain("broken-case");
    expect(ids).toContain("stemi-inferior-rv");
    expect((await library.entries()).map((e) => e.id)).toEqual(expect.arrayContaining(["stemi-copy", "broken-case"]));
    // Nothing validated yet: no case in the content.
    expect(library.content.cases.size).toBe(0);
    expect(library.content.facilities.size).toBeGreaterThan(0);

    const ok = await library.load("stemi-copy");
    expect(ok.status).toBe("ok");
    expect(library.content.cases.has("stemi-copy")).toBe(true);
    expect(library.content.cases.size).toBe(1);
    const broken = await library.load("broken-case");
    expect(broken).toMatchObject({ status: "invalid" });
    expect(library.content.cases.has("broken-case")).toBe(false);
    expect(await library.load("nope")).toEqual({ status: "not-found" });
  });

  it("over pre-loaded content: no scanning, the loaded cases as they are", async () => {
    const content = await loadContent();
    const library = CaseLibrary.fromContent(content);
    expect(await library.ids()).toEqual([...content.cases.keys()].sort());
    expect((await library.load("stemi-inferior-rv")).status).toBe("ok");
    expect((await library.entries()).length).toBe(content.cases.size);
  });

  it("loadCaseFile reports invalid JSON and folder/id mismatches", async () => {
    const dir = mkdtempSync(join(root, "files-"));
    mkdirSync(join(dir, "cases", "folder"), { recursive: true });
    writeFileSync(join(dir, "cases", "folder", "case.json"), "{");
    const bad = await loadCaseFile(join(dir, "cases", "folder", "case.json"));
    expect(bad.ok).toBe(false);
    writeFileSync(join(dir, "cases", "folder", "case.json"), JSON.stringify(stemi));
    const mismatch = await loadCaseFile(join(dir, "cases", "folder", "case.json"));
    expect(mismatch.ok && mismatch.warnings.some((w) => /differs from its directory/.test(w.message))).toBe(true);
  });
});

describe("createNodeSession from the case library", () => {
  it("starts a case although another case of the library is broken; a broken case is refused with its problems", async () => {
    const dir = contentDir();
    const home = join(root, "home");
    const cwd = join(root, "project");
    mkdirSync(home, { recursive: true });
    mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
    const env = { CLINICALCRAFT_HOME: home, HOME: home };
    const flags = { provider: "offline", locale: "en", contentDirs: [dir] };
    const library = await CaseLibrary.open({ dirs: [dir] });
    const session = await createNodeSession({ caseId: "stemi-copy", cwd, env, flags, transcript: false, library });
    expect(session.caseDef.id).toBe("stemi-copy");
    await session.close();
    // Only the started case was validated.
    expect([...library.content.cases.keys()]).toEqual(["stemi-copy"]);

    const refused = await createNodeSession({ caseId: "broken-case", cwd, env, flags, transcript: false }).catch((e: unknown) => e);
    expect(refused).toBeInstanceOf(BootstrapError);
    expect((refused as Error).message).toMatch(/broken-case.*invalid.*objectives/s);
    const unknown = await createNodeSession({ caseId: "no-such-case", cwd, env, flags, transcript: false }).catch((e: unknown) => e);
    expect((unknown as Error).message).toMatch(/Unknown case "no-such-case"/);
  });

  it("a content directory overrides a built-in case of the same id (as loadContent)", async () => {
    const dir = mkdtempSync(join(root, "override-"));
    cpSync(join(builtin, "cases", "smzl-lung-adeno"), join(dir, "cases", "smzl-lung-adeno"), { recursive: true });
    const file = join(dir, "cases", "smzl-lung-adeno", "case.json");
    const raw = JSON.parse(readFileSync(file, "utf8")) as { title: Record<string, string> };
    writeFileSync(file, JSON.stringify({ ...raw, title: { ...raw.title, en: "Overridden" } }));
    const library = await CaseLibrary.open({ dirs: [dir] });
    const loaded = await library.load("smzl-lung-adeno");
    expect(loaded.status === "ok" && loaded.entry.file).toBe(file);
  });
});
