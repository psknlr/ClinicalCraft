/**
 * The clinical content standard in the CLI (docs/CASE_AUTHORING.md §9): `cases validate` reports the content
 * lints as warnings and `--strict` fails on them; `cases verify` reports the reference path's rubric score; a
 * published or adapted case keeps its citation, DOI and source references out of `cases show` and `cases list
 * --details` unless `--spoilers` is given; specialties are shown by their labels.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { MINI_CASE_INPUT } from "../../agent/src/__fixtures__/mini-case.js";
import type { CliIO } from "./context.js";
import { main } from "./main.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-standard-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 60_000;

const CITATION = "Doe J, Roe R. Inferior STEMI with right-ventricular infarction: a case report. Case Rep Cardiol. 2025;3:1-4.";
const DOI = "10.1000/crc.2025.0042";

function writeCase(dir: string, id: string, patch: (c: Record<string, any>) => void): string {
  mkdirSync(join(dir, "cases", id), { recursive: true });
  const c = structuredClone(MINI_CASE_INPUT) as Record<string, any>;
  c.id = id;
  patch(c);
  const file = join(dir, "cases", id, "case.json");
  writeFileSync(file, JSON.stringify(c, null, 2));
  return file;
}

function sandbox(): { env: Record<string, string>; cwd: string; published: string; plain: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const content = join(dir, "content");
  const published = writeCase(content, "pub-chest-pain", (c) => {
    c.specialty = ["cardiology", "colorectal-surgery"];
    c.provenance = { kind: "published-case", citation: CITATION, doi: DOI, authors: ["Doe J", "Roe R"], notes: { "zh-CN": `病例：Doe 等，2025。DOI：${DOI}`, en: `Case: Doe et al., 2025. DOI: ${DOI}` } };
    c.debrief.references = [`${CITATION} doi:${DOI}`];
  });
  const plain = writeCase(content, "plain-chest-pain", () => undefined);
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify({ contentDirs: [content] }));
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, cwd, published, plain };
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

describe("cases validate: content lints", () => {
  it("are warnings by default and failures with --strict", { timeout: T }, async () => {
    const box = sandbox();
    const lax = await run(["cases", "validate", box.plain, "--lang", "en"], box);
    expect(lax.code, lax.stdout).toBe(0);
    expect(lax.stdout).toContain("warning learningOutcomes");
    expect(lax.stdout).toContain("warning provenance.review");
    const strict = await run(["cases", "validate", box.plain, "--strict", "--lang", "en"], box);
    expect(strict.code).toBe(1);
    expect(strict.stdout).toMatch(/✗ .*plain-chest-pain/);
    expect(strict.stdout).toContain("--strict");
    const json = await run(["cases", "validate", box.plain, "--strict", "--json"], box);
    expect(json.code).toBe(1);
    const [result] = JSON.parse(json.stdout) as { ok: boolean; warnings: { path: string }[] }[];
    expect(result!.ok).toBe(false);
    expect(result!.warnings.map((w) => w.path)).toContain("learningOutcomes");
    const zh = await run(["cases", "validate", box.plain, "--strict", "--lang", "zh-CN"], box);
    expect(zh.stdout).toContain("--strict");
  });
});

describe("cases verify: the reference path's rubric score", () => {
  it("in text and JSON", { timeout: T }, async () => {
    const box = sandbox();
    const text = await run(["cases", "verify", "plain-chest-pain", "--lang", "en"], box);
    expect(text.code, text.stdout).toBe(0);
    expect(text.stdout).toMatch(/rubric \d+\/\d+ \(\d+ %\)/);
    const json = await run(["cases", "verify", "plain-chest-pain", "--json"], box);
    const [v] = JSON.parse(json.stdout) as { score: { earned: number; possible: number; percent: number } }[];
    expect(v!.score.possible).toBeGreaterThan(0);
    expect(v!.score.earned).toBeLessThanOrEqual(v!.score.possible);
    expect(text.stdout).toContain(`rubric ${v!.score.earned}/${v!.score.possible} (${v!.score.percent} %)`);
    const zh = await run(["cases", "verify", "plain-chest-pain", "--lang", "zh-CN"], box);
    expect(zh.stdout).toContain(`评分 ${v!.score.earned}/${v!.score.possible}（${v!.score.percent}%）`);
  });
});

describe("spoiler gating of a published case's source", () => {
  it("cases show hides the citation, DOI and source notes; --spoilers shows them", { timeout: T }, async () => {
    const box = sandbox();
    const shown = await run(["cases", "show", "pub-chest-pain", "--lang", "en"], box);
    expect(shown.code, shown.stderr).toBe(0);
    expect(shown.stdout).toContain("published case report");
    expect(shown.stdout).not.toContain("right-ventricular infarction");
    expect(shown.stdout).not.toContain(DOI);
    expect(shown.stdout).toContain("--spoilers");
    const spoilers = await run(["cases", "show", "pub-chest-pain", "--spoilers", "--lang", "en"], box);
    expect(spoilers.stdout).toContain(CITATION);
    expect(spoilers.stdout).toContain(`doi:${DOI}`);
    const zh = await run(["cases", "show", "pub-chest-pain", "--lang", "zh-CN"], box);
    expect(zh.stdout).not.toContain(DOI);
    expect(zh.stdout).toContain("--spoilers");
  });

  it("cases show --json leaves them out unless --spoilers (or --full, the whole case)", { timeout: T }, async () => {
    const box = sandbox();
    const json = JSON.parse((await run(["cases", "show", "pub-chest-pain", "--json"], box)).stdout) as Record<string, any>;
    expect(json.provenance).toEqual({ kind: "published-case", authors: [] });
    expect(json.debrief.references).toEqual([]);
    expect(JSON.stringify(json)).not.toContain(DOI);
    const spoilers = JSON.parse((await run(["cases", "show", "pub-chest-pain", "--json", "--spoilers"], box)).stdout) as Record<string, any>;
    expect(spoilers.provenance).toMatchObject({ citation: CITATION, doi: DOI });
    expect(spoilers).not.toHaveProperty("solution");
    const full = JSON.parse((await run(["cases", "show", "pub-chest-pain", "--json", "--full"], box)).stdout) as Record<string, any>;
    expect(full.provenance.doi).toBe(DOI);
    expect(full).toHaveProperty("solution");
  });

  it("cases list --details names specialties by label and the source only with --spoilers", { timeout: T }, async () => {
    const box = sandbox();
    const en = await run(["cases", "list", "--details", "--lang", "en"], box);
    expect(en.code, en.stderr).toBe(0);
    expect(en.stdout).toContain("Cardiology, Colorectal surgery");
    expect(en.stdout).toContain("published case report");
    expect(en.stdout).not.toContain(DOI);
    const zh = await run(["cases", "list", "--details", "--lang", "zh-CN"], box);
    expect(zh.stdout).toContain("心内科、结直肠外科");
    const spoilers = await run(["cases", "list", "--details", "--spoilers", "--lang", "en"], box);
    expect(spoilers.stdout).toContain(DOI);
    // the JSON listing never carried the source; with --spoilers it does
    const json = JSON.parse((await run(["cases", "list", "--json"], box)).stdout) as Record<string, any>[];
    expect(JSON.stringify(json)).not.toContain(DOI);
    const jsonSpoilers = JSON.parse((await run(["cases", "list", "--json", "--spoilers"], box)).stdout) as Record<string, any>[];
    expect(jsonSpoilers.find((c) => c.id === "pub-chest-pain")!.source).toMatchObject({ citation: CITATION, doi: DOI });
  });

  it("a synthetic case is unaffected (its guideline references are no spoiler of a source)", { timeout: T }, async () => {
    const box = sandbox();
    const json = JSON.parse((await run(["cases", "show", "plain-chest-pain", "--json"], box)).stdout) as Record<string, any>;
    expect(json.provenance).toMatchObject({ kind: "synthetic" });
    expect(json.debrief.references).toEqual(MINI_CASE_INPUT.debrief.references ?? []);
  });
});
