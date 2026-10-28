/**
 * Learning outcomes and the clinical review status in the CLI (docs/GLOSSARY.md §4): `cases list` / `cases show`
 * state the review honestly, `cases show` lists the outcomes for facilitators, `cases index` carries a count only,
 * the case picker tags each case's review, and the `play` banner gives the review and how many outcomes the debrief
 * will list — never their text.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import type { CaseIndexEntry } from "@clinicalcraft/agent";
import { MINI_CASE_INPUT } from "../../agent/src/__fixtures__/mini-case.js";
import { createPalette } from "./ansi.js";
import type { CliIO } from "./context.js";
import { m, type MsgKey } from "./i18n.js";
import { main } from "./main.js";
import { pickerLine } from "./picker.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-meta-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 60_000;

const OUTCOMES = [
  { "zh-CN": "识别下壁 STEMI 并避免使用硝酸酯", en: "Recognise an inferior STEMI and withhold nitrates" },
  { "zh-CN": "在 10 分钟内完成十二导联心电图", en: "Record a 12-lead ECG within 10 minutes" },
];

function contentDir(): string {
  const dir = join(root, "content");
  mkdirSync(join(dir, "cases", "meta-chest-pain"), { recursive: true });
  const c = structuredClone(MINI_CASE_INPUT) as Record<string, unknown>;
  c.id = "meta-chest-pain";
  c.facility = "general-hospital";
  c.learningOutcomes = OUTCOMES;
  c.provenance = {
    kind: "synthetic",
    review: {
      status: "editorial",
      reviewedAt: "2026-10-28",
      reviewers: ["ClinicalCraft editorial review (AI-assisted)"],
      guidelines: ["ESC 2023 ACS"],
      notes: { "zh-CN": "人工智能辅助编写并经编辑审核，尚未经执业医师审核。", en: "AI-assisted authoring and editorial review; not yet reviewed by a licensed clinician." },
    },
  };
  writeFileSync(join(dir, "cases", "meta-chest-pain", "case.json"), JSON.stringify(c, null, 2));
  return dir;
}

function sandbox(): { env: Record<string, string>; cwd: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify({ contentDirs: [contentDir()] }));
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

describe("case metadata in the CLI", () => {
  it("cases list states the review; --json gives the outcomes and the review for authors and facilitators", { timeout: T }, async () => {
    const box = sandbox();
    const en = await run(["cases", "list", "--lang", "en"], box);
    expect(en.code, en.stderr).toBe(0);
    expect(en.stdout).toMatch(/meta-chest-pain.*editorial review 2026-10-28/);
    expect(en.stdout).toContain("not by a licensed clinician");
    const zh = await run(["cases", "list", "--json", "--lang", "zh-CN"], box);
    const listed = (JSON.parse(zh.stdout) as { id: string; learningOutcomes: string[]; review: { status: string; text: string } | null }[]).find((c) => c.id === "meta-chest-pain")!;
    expect(listed.learningOutcomes).toEqual(OUTCOMES.map((o) => o["zh-CN"]));
    expect(listed.review).toMatchObject({ status: "editorial", text: "编辑审核 2026-10-28 · 尚未经执业医师审核" });
  });

  it("cases show prints the review and, under a facilitator heading, the outcomes and the guidance checked", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["cases", "show", "meta-chest-pain", "--lang", "en"], box);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("Clinical review: Editorial review 2026-10-28 · not yet reviewed by a licensed clinician");
    expect(r.stdout).toContain("Reviewed by: ClinicalCraft editorial review (AI-assisted)");
    expect(r.stdout).toContain("Learning outcomes (for facilitators — they may name the diagnosis):");
    expect(r.stdout).toContain("  1. Recognise an inferior STEMI and withhold nitrates");
    expect(r.stdout).toContain("Guidance checked: ESC 2023 ACS");
    const zh = await run(["cases", "show", "meta-chest-pain", "--lang", "zh-CN"], box);
    expect(zh.stdout).toContain("审核状态： 编辑审核 2026-10-28 · 尚未经执业医师审核");
    expect(zh.stdout).toContain("任务目标：");
    expect(zh.stdout).toContain("学习目标（供导师查看——可能提示诊断）：");
  });

  it("cases index carries the outcome count and the review, never the outcomes' text", { timeout: T }, async () => {
    const r = await run(["cases", "index", "--json"], sandbox());
    const entry = (JSON.parse(r.stdout) as CaseIndexEntry[]).find((e) => e.id === "meta-chest-pain")!;
    expect(entry).toMatchObject({ learningOutcomeCount: 2, review: { status: "editorial", reviewedAt: "2026-10-28" } });
    expect(r.stdout).not.toContain("withhold nitrates");
    expect(r.stdout).not.toContain("ESC 2023 ACS");
  });

  it("the case picker (play without a case) states each case's review, never the id", () => {
    const ctx = (locale: string) => ({ locale, out: createPalette(false), t: (key: MsgKey, params?: Record<string, string | number>) => m(locale, key, params) });
    const c = { id: "meta-chest-pain", difficulty: 3, setting: "emergency", title: { "zh-CN": "胸痛 · 58岁男性", en: "Chest pain · 58-year-old man" }, review: { status: "editorial", reviewedAt: "2026-10-28" } };
    expect(pickerLine(ctx("en"), c, 0)).toBe(" 1. Chest pain · 58-year-old man ★★★☆☆ · emergency · editorial review 2026-10-28");
    expect(pickerLine(ctx("zh-CN"), c, 9)).toBe("10. 胸痛 · 58岁男性 ★★★☆☆ · 急诊 · 编辑审核 2026-10-28");
    expect(pickerLine(ctx("en"), { ...c, review: null }, 0)).toBe(" 1. Chest pain · 58-year-old man ★★★☆☆ · emergency");
    expect(m("en", "picker.reviewLegend")).toContain("not by a licensed clinician");
    expect(m("zh-CN", "picker.reviewLegend")).toContain("并非执业医师审核");
  });

  it("the play banner states the review and how many outcomes the debrief lists, not the outcomes", { timeout: T }, async () => {
    const box = sandbox();
    const zh = await run(["play", "meta-chest-pain", "--provider", "offline", "--ephemeral", "--lang", "zh-CN"], box, "/quit\n");
    expect(zh.code, zh.stderr).toBe(0);
    expect(zh.stdout).toContain("编辑审核 2026-10-28 · 尚未经执业医师审核");
    expect(zh.stdout).toContain("本病例有 2 条学习目标");
    expect(zh.stdout).not.toContain("避免使用硝酸酯");
    const en = await run(["play", "meta-chest-pain", "--provider", "offline", "--ephemeral", "--lang", "en"], box, "/quit\n");
    expect(en.stdout).toContain("Editorial review 2026-10-28 · not yet reviewed by a licensed clinician");
    expect(en.stdout).toContain("This case has 2 learning outcome(s)");
    expect(en.stdout).not.toContain("withhold nitrates");
  });
});
