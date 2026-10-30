/**
 * The CLI gives the patient's age as clinicians write it (core `patientAgeText`) in `cases show` and the `play`
 * banner: a child stored as 100 months is "8 years 4 months" / "8岁4个月", never "100 months".
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { MINI_CASE_INPUT } from "../../agent/src/__fixtures__/mini-case.js";
import type { CliIO } from "./context.js";
import { main } from "./main.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-age-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 60_000;
const ID = "age-child-months";

/** A content directory with the mini case's patient as a child aged 100 months. */
function sandbox(): { env: Record<string, string>; cwd: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const content = join(dir, "content");
  mkdirSync(join(content, "cases", ID), { recursive: true });
  const c = structuredClone(MINI_CASE_INPUT) as Record<string, any>;
  c.id = ID;
  c.patient.age = 100;
  c.patient.ageUnit = "months";
  writeFileSync(join(content, "cases", ID, "case.json"), JSON.stringify(c, null, 2));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify({ contentDirs: [content] }));
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, cwd };
}

async function run(argv: string[], box: { env: Record<string, string>; cwd: string }, input = ""): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  let out = "";
  let err = "";
  stdout.on("data", (d: Buffer) => (out += d.toString("utf8")));
  stderr.on("data", (d: Buffer) => (err += d.toString("utf8")));
  stdin.end(input);
  const code = await main(argv, { io: { stdout, stderr, stdin } as unknown as CliIO, env: box.env, cwd: box.cwd });
  return { code, stdout: out, stderr: err };
}

describe("the patient's age in the CLI", () => {
  it("cases show: a child stored in months reads in years and months", { timeout: T }, async () => {
    const box = sandbox();
    const en = await run(["cases", "show", ID, "--lang", "en"], box);
    expect(en.code, en.stderr).toBe(0);
    expect(en.stdout).toContain("Patient: Li Ming · 8 years 4 months · male");
    expect(en.stdout).not.toContain("100 months");
    const zh = await run(["cases", "show", ID, "--lang", "zh-CN"], box);
    expect(zh.stdout).toContain("李明 · 8岁4个月 · 男");
    expect(zh.stdout).not.toContain("100个月");
  });

  it("the play banner gives the same age", { timeout: T }, async () => {
    const box = sandbox();
    const en = await run(["play", ID, "--provider", "offline", "--ephemeral", "--lang", "en"], box, "/quit\n");
    expect(en.code, en.stderr).toBe(0);
    expect(en.stdout).toContain("Li Ming · 8 years 4 months · male · Chest pain for 2 hours");
    const zh = await run(["play", ID, "--provider", "offline", "--ephemeral", "--lang", "zh-CN"], box, "/quit\n");
    expect(zh.stdout).toContain("李明 · 8岁4个月 · 男 · 胸痛2小时");
  });
});
