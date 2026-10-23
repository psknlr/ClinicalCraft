/**
 * `clinicalcraft bench` (in-process `main()` with in-memory streams): list,
 * run (reports written, 100 % required for reference / scripted-llm, the
 * live agent's guards), demo (both languages), seed parsing, and the bench's
 * headless approval rules matching `exec`'s.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { headlessApproval } from "@clinicalcraft/bench";
import type { ApprovalMode, RiskLevel } from "@clinicalcraft/agent";
import { parseSeeds } from "./bench.js";
import type { CliIO } from "./context.js";
import { headlessDecision } from "./exec.js";
import { main } from "./main.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-bench-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 120_000;

function sandbox(extraEnv: Record<string, string> = {}): { env: Record<string, string>; cwd: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1", ...extraEnv }, cwd };
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

describe("parseSeeds", () => {
  it("ranges, lists and single seeds; malformed input is null", () => {
    expect(parseSeeds("1-5")).toEqual([1, 2, 3, 4, 5]);
    expect(parseSeeds("1,2,7")).toEqual([1, 2, 7]);
    expect(parseSeeds("3")).toEqual([3]);
    expect(parseSeeds("1-3,2,9")).toEqual([1, 2, 3, 9]);
    for (const bad of ["", "a", "5-1", "1-", "1.5", "0-5000"]) expect(parseSeeds(bad), bad).toBeNull();
  });
});

describe("bench list", () => {
  it("lists the suite by category (text and JSON)", { timeout: T }, async () => {
    const box = sandbox();
    const text = await run(["bench", "list", "--lang", "en"], box);
    expect(text.code, text.stderr).toBe(0);
    expect(text.stdout).toMatch(/\d+ scenario\(s\) in embodied-v1/);
    expect(text.stdout).toContain("workflow-stemi-full-encounter");
    const json = await run(["bench", "list", "--json"], box);
    const list = JSON.parse(json.stdout) as { id: string; category: string }[];
    expect(list.length).toBeGreaterThanOrEqual(24);
    expect(new Set(list.map((s) => s.category)).size).toBe(8);
    const unknown = await run(["bench", "list", "--suite", "embodied-v9", "--lang", "en"], box);
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain('Unknown suite "embodied-v9"');
  });
});

describe("bench run", () => {
  it("reference and scripted-llm: reports written, 100 %, exit 0", { timeout: T }, async () => {
    const box = sandbox();
    for (const agent of ["reference", "scripted-llm"]) {
      const r = await run(["bench", "run", "--agent", agent, "--scenario", "perception-ecg-at-stemi-bedside,recovery-ecg-device-busy", "--category", "perception,recovery", "--seeds", "1-2", "--out", `out/${agent}`, "--traces", "--lang", "en"], box);
      expect(r.code, r.stderr).toBe(0);
      expect(r.stdout).toContain(`${agent}: 4/4 runs succeeded (100.0 %)`);
      const report = JSON.parse(readFileSync(join(box.cwd, "out", agent, "bench-report.json"), "utf8")) as { agent: { kind: string }; seeds: number[]; runs: unknown[]; environment: { node: string; cpus: number } };
      expect(report).toMatchObject({ agent: { kind: agent }, seeds: [1, 2] });
      expect(report.runs).toHaveLength(4);
      expect(report.environment.node).toBe(process.version);
      expect(readFileSync(join(box.cwd, "out", agent, "bench-report.md"), "utf8")).toContain("Wilson 95 %");
      expect(existsSync(join(box.cwd, "out", agent, "traces", "recovery-ecg-device-busy.s2.jsonl"))).toBe(true);
    }
  });

  it("usage errors: seeds, scenario, category, agent", { timeout: T }, async () => {
    const box = sandbox();
    const bad = await run(["bench", "run", "--agent", "reference", "--seeds", "x", "--lang", "en"], box);
    expect(bad.code).toBe(2);
    expect(bad.stderr).toContain('Invalid --seeds "x"');
    const unknown = await run(["bench", "run", "--scenario", "nope", "--lang", "en"], box);
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain('Unknown scenario "nope"');
    const category = await run(["bench", "run", "--category", "telepathy", "--lang", "en"], box);
    expect(category.code).toBe(2);
    const agent = await run(["bench", "run", "--agent", "oracle", "--lang", "en"], box);
    expect(agent.code).toBe(2);
  });

  it("llm: needs --live and a cap, a key, no CI; --max-usd needs a catalogue price", { timeout: T }, async () => {
    const box = sandbox();
    const args = ["bench", "run", "--agent", "llm", "--provider", "anthropic", "--model", "claude-test", "--seeds", "1", "--lang", "en"];
    const noLive = await run(args, box);
    expect(noLive.code).toBe(2);
    expect(noLive.stderr).toContain("pass --live");
    const noCap = await run([...args, "--live"], box);
    expect(noCap.code).toBe(2);
    expect(noCap.stderr).toContain("needs a spending cap");
    const noKey = await run([...args, "--live", "--max-tokens", "1000"], box);
    expect(noKey.code).toBe(1);
    expect(noKey.stderr).toContain("No API key configured for provider anthropic");
    const ci = await run([...args, "--live", "--max-tokens", "1000"], sandbox({ CI: "true", ANTHROPIC_API_KEY: "k" }));
    expect(ci.code).toBe(1);
    expect(ci.stderr).toContain("disabled in CI");
    const usd = await run([...args, "--live", "--max-usd", "1"], sandbox({ ANTHROPIC_API_KEY: "k" }));
    expect(usd.code).toBe(2);
    expect(usd.stderr).toContain("no price for anthropic/claude-test");
    const offline = await run(["bench", "run", "--agent", "llm", "--provider", "offline", "--live", "--max-tokens", "10", "--lang", "en"], box);
    expect(offline.code).toBe(2);
    expect(offline.stderr).toContain("needs a networked provider");
  });
});

describe("bench demo", () => {
  it.each([
    ["zh-CN", "通过"],
    ["en", "PASSED"],
  ])("%s: passes and writes demo.md + trace.jsonl", { timeout: T }, async (lang, verdict) => {
    const box = sandbox();
    const r = await run(["bench", "demo", "--case", "stemi-inferior-rv", "--lang", lang, "--out", "demo"], box);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain(verdict);
    expect(readFileSync(join(box.cwd, "demo", "demo.md"), "utf8")).toContain("stemi-inferior-rv");
    const header = JSON.parse(readFileSync(join(box.cwd, "demo", "trace.jsonl"), "utf8").split("\n")[0]!) as Record<string, unknown>;
    expect(header).toMatchObject({ format: "clinicalcraft-trace@1", caseId: "stemi-inferior-rv", embodiment: "embodied" });
  });

  it("rejects an unknown case", { timeout: T }, async () => {
    const r = await run(["bench", "demo", "--case", "stemi-inferior", "--lang", "en"], sandbox());
    expect(r.code).toBe(2);
  });
});

describe("bench grounding", () => {
  it("writes reports for a filtered run with the tag slice, compares two runs, rejects bad flags", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["bench", "grounding", "--split", "dev", "--track", "routing", "--out", "g1", "--lang", "en"], box);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/grounding-v1 dev: \d+\/\d+ items correct/);
    expect(r.stdout).toContain("tag negation:");
    const report = JSON.parse(readFileSync(join(box.cwd, "g1", "grounding-report.json"), "utf8")) as { format: string; suite: string; splits: string[]; items: { track: string }[] };
    expect(report).toMatchObject({ format: "clinicalcraft-grounding-report@1", suite: "grounding-v1", splits: ["dev"] });
    expect(new Set(report.items.map((i) => i.track))).toEqual(new Set(["routing"]));
    expect(readFileSync(join(box.cwd, "g1", "grounding-report.md"), "utf8")).toContain("# ClinicalCraft grounding benchmark");
    const cmp = await run(["bench", "grounding", "--split", "dev", "--track", "routing", "--out", "g2", "--compare", "g1/grounding-report.json", "--lang", "en"], box);
    expect(cmp.code, cmp.stderr).toBe(0);
    expect(cmp.stdout).toContain("Change against");
    expect(readFileSync(join(box.cwd, "g2", "grounding-report.md"), "utf8")).toContain("Items fixed (0)");
    for (const [argv, message] of [
      [["--split", "train"], 'Invalid value "train" for --split'],
      [["--track", "vibes"], 'Unknown track "vibes"'],
      [["--suite", "grounding-v9"], 'Unknown grounding suite "grounding-v9"'],
      [["--case", "no-such-case"], "No grounding item matches the filters"],
      [["--compare", "missing.json"], "Cannot read the report to compare with"],
    ] as const) {
      const bad = await run(["bench", "grounding", ...argv, "--out", "g3", "--lang", "en"], box);
      expect(bad.code, argv.join(" ")).toBe(2);
      expect(bad.stderr).toContain(message);
    }
    expect(existsSync(join(box.cwd, "g3"))).toBe(false);
  });
});

describe("bench approvals = exec's headless rules", () => {
  it("decides every mode × risk × rule like exec", () => {
    const modes: ApprovalMode[] = ["default", "strict", "auto", "plan", "bypass"];
    const risks: RiskLevel[] = ["none", "low", "moderate", "high"];
    const rules = ["tool.always-ask", "rule.ask", "mode.auto", "mode.default", "rule.allow"];
    for (const mode of modes)
      for (const risk of risks)
        for (const ruleId of rules) {
          const cli = headlessDecision(mode, { risk, ruleId }, "en");
          expect(headlessApproval(mode, { risk, ruleId }).approve, `${mode} ${risk} ${ruleId}`).toBe(cli.approve);
        }
  });
});
