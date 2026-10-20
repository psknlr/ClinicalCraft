/**
 * Project skills (docs/EMBODIED.md §9): user (`~/.clinicalcraft/skills`) and
 * project (`.clinicalcraft/skills`) JSON files, validated like built-in and
 * inline skills; invalid ones are reported with their file, never loaded.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadProjectSkills } from "./skills.js";

const root = mkdtempSync(join(tmpdir(), "cc-skills-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const skill = (id: string, name = id) => ({ schema: "clinicalcraft/skill@1", id, name: { en: name, "zh-CN": name }, description: "x", safety: "physical", steps: [{ id: "look", tool: "observe_world" }] });

describe("loadProjectSkills", () => {
  it("loads user then project skills (project wins, trusted project), one skill or an array per file; reports invalid ones", async () => {
    const home = join(root, "home");
    const cwd = join(root, "project");
    mkdirSync(join(home, "skills"), { recursive: true });
    mkdirSync(join(cwd, ".clinicalcraft", "skills"), { recursive: true });
    writeFileSync(join(home, "skills", "mine.json"), JSON.stringify([skill("glance", "user glance"), skill("survey")]));
    writeFileSync(join(cwd, ".clinicalcraft", "skills", "glance.json"), JSON.stringify(skill("glance", "project glance")));
    writeFileSync(join(cwd, ".clinicalcraft", "skills", "broken.json"), "{ not json");
    writeFileSync(join(cwd, ".clinicalcraft", "skills", "code.json"), JSON.stringify({ ...skill("evil"), script: "require('child_process')" }));
    writeFileSync(join(cwd, ".clinicalcraft", "skills", "notes.txt"), "ignored");

    // An untrusted project's skills are reported, never loaded (review S8); the user's own always load.
    const untrusted = await loadProjectSkills(cwd, { CLINICALCRAFT_HOME: home, HOME: home });
    expect(untrusted.skills.map((s) => s.id).sort()).toEqual(["glance", "survey"]);
    expect(untrusted.skills.find((s) => s.id === "glance")!.name).toEqual({ en: "user glance", "zh-CN": "user glance" });
    expect(untrusted.untrusted).toMatchObject({ files: 3 });

    const loaded = await loadProjectSkills(cwd, { CLINICALCRAFT_HOME: home, HOME: home }, { trusted: true });
    expect(loaded.skills.map((s) => s.id).sort()).toEqual(["glance", "survey"]);
    expect(loaded.skills.find((s) => s.id === "glance")!.name).toEqual({ en: "project glance", "zh-CN": "project glance" });
    expect(loaded.issues).toHaveLength(2);
    expect(loaded.issues.find((i) => i.includes("broken.json"))).toMatch(/invalid JSON/);
    expect(loaded.issues.find((i) => i.includes("code.json"))).toMatch(/script|Unrecognized/i);
  });

  it("returns nothing (and no issue) without skill directories", async () => {
    const empty = join(root, "empty");
    mkdirSync(empty, { recursive: true });
    expect(await loadProjectSkills(empty, { CLINICALCRAFT_HOME: join(empty, "home"), HOME: join(empty, "home") })).toEqual({ skills: [], issues: [] });
  });
});
