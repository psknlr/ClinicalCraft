/**
 * The safety outcome beside the score in the CLI's debriefs and exports (audit 2026-11-12 P0-1..P0-3,
 * docs/PROTOCOL.md §3.2): the assessment (`/assess`, the final assessment), `exec`'s text summary and its JSON
 * `result`, and the `eval` report. A run with a critical safety failure or a critical dose error is never shown as
 * passed, whatever its percentage.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import { assess, replay, type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
import { createPalette } from "./ansi.js";
import { verifyCaseDefinition } from "./cases.js";
import type { CliIO } from "./context.js";
import { evalMarkdown, type EvalReport, type EvalRun } from "./eval.js";
import { main } from "./main.js";
import { EventRenderer } from "./render.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-safety-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const strokeDef = content.cases.get("acute-ischemic-stroke")?.def;
const T = 120_000;

/** The built-in stroke case: alteplase is critical (its authors' decision: a second thrombolytic is the dangerous error). */
function stroke(): CaseDefinition {
  expect(strokeDef!.interventions.find((i) => i.id === "alteplase")?.critical).toBe(true);
  return strokeDef!;
}

/** The audit's replay (P0-1): the reference path with alteplase given right after tenecteplase. */
function secondThrombolytic(c: CaseDefinition) {
  const actions = c.solution.flatMap((a): ClinicalAction[] => (a.type === "intervene" && a.interventionId === "tenecteplase" ? [a, { type: "intervene", interventionId: "alteplase" }] : [a]));
  return replay(c, actions).state;
}

function rendered(c: CaseDefinition, locale: "en" | "zh-CN", report: ReturnType<typeof assess>): string {
  let out = "";
  const renderer = new EventRenderer({ out: { write: (s: string) => ((out += s), true) }, palette: createPalette(false), caseDef: c, locale: () => locale, interactive: false, verbose: false });
  renderer.renderAssessment(report, null, []);
  return out;
}

describe("the assessment shows the safety outcome beside the score", () => {
  it("a second thrombolytic: not passed, the critical safety failure named with its harm — whatever the score", () => {
    const c = stroke();
    const report = assess(c, secondThrombolytic(c));
    expect(report.completed).toBe(true);
    expect(report.safety.passed).toBe(false);
    const en = rendered(c, "en", report);
    const lines = en.split("\n");
    const score = lines.findIndex((l) => /^Score \d+%/.test(l));
    expect(lines[score + 1]).toBe("Safety: not passed — critical safety failures: 1");
    expect(en).toMatch(/⚠ Critical safety failure: .*[Aa]lteplase.* given while contraindicated \(minute \d+\) — /);
    expect(en).not.toMatch(/Safety: passed/);
    const zh = rendered(c, "zh-CN", report);
    expect(zh).toContain("安全性：未通过——严重安全失误 1 次");
    expect(zh).toMatch(/⚠ 严重安全失误：在禁忌情况下给予.*阿替普酶/);
  });

  it("the reference path passes", () => {
    const c = stroke();
    const report = assess(c, replay(c, c.solution).state);
    expect(rendered(c, "en", report)).toContain("Safety: passed");
  });
});

describe("cases verify: the reference path's safety outcome beside its score", () => {
  it("passed for the case as authored; a path with a second thrombolytic is not, and fails verification", () => {
    const c = stroke();
    expect(verifyCaseDefinition(c)).toMatchObject({ ok: true, safety: { passed: true, criticalFailures: [], doseErrors: 0 } });
    const unsafe = { ...c, solution: c.solution.flatMap((a): ClinicalAction[] => (a.type === "intervene" && a.interventionId === "tenecteplase" ? [a, { type: "intervene", interventionId: "alteplase" }] : [a])) };
    const v = verifyCaseDefinition(unsafe);
    expect(v.safety).toEqual({ passed: false, criticalFailures: ["alteplase"], doseErrors: 0 });
    expect(v.ok).toBe(false);
  });
});

describe("the eval report never shows a run that did not pass safety as passed", () => {
  it("a not-passed column and the reason under the summary", () => {
    const run = (safety: EvalRun["safety"]): EvalRun => ({
      caseId: "acute-ischemic-stroke",
      title: "Stroke",
      run: 1,
      sessionId: "s",
      subtype: "success",
      finished: true,
      completed: true,
      objectives: { done: 5, total: 5 },
      decisions: { firstTry: 4, decided: 4, total: 4 },
      score: { earned: 18, possible: 20, percent: 90 },
      safety,
      contraindicated: safety.criticalFailures.length,
      criticalAlarms: 0,
      essentialMissing: [],
      turns: 10,
      usage: { inputTokens: 0, outputTokens: 0 },
      durationMs: 1000,
      errors: [],
    });
    const report: EvalReport = {
      type: "eval",
      version: 1,
      startedAt: "2026-11-12T00:00:00.000Z",
      provider: "offline",
      model: "deterministic",
      runsPerCase: 1,
      maxTurns: 10,
      runs: [run({ passed: false, headline: "Safety: not passed — critical safety failures: 1", criticalFailures: ["alteplase"], doseErrors: 0 }), { ...run({ passed: true, headline: "Safety: passed", criticalFailures: [], doseErrors: 0 }), run: 2 }],
      summary: { runs: 2, finished: 2, meanScore: 90, safetyPassed: 1, errors: 0, inputTokens: 0, outputTokens: 0 },
      notice: "notice",
    };
    const md = evalMarkdown(report, "en");
    expect(md).toMatch(/\| `acute-ischemic-stroke` \| 1 \| finished \| 5\/5 \| 4\/4 \| 90% \| \*\*not passed\*\* · ☠ 1 \|/);
    expect(md).toMatch(/\| `acute-ischemic-stroke` \| 2 \| finished \| 5\/5 \| 4\/4 \| 90% \| passed \|/);
    expect(md).toContain("safety passed 1/2");
    expect(md).toContain("- `acute-ischemic-stroke` #1: Safety: not passed — critical safety failures: 1 (`alteplase`)");
  });
});

describe("exec: the result and the summary carry the safety outcome", () => {
  function sandbox(): { env: Record<string, string>; cwd: string } {
    const dir = mkdtempSync(join(root, "s-"));
    const home = join(dir, "home");
    const cwd = join(dir, "project");
    mkdirSync(home, { recursive: true });
    mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
    return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, cwd };
  }
  async function run(argv: string[], input: string, box = sandbox()): Promise<{ code: number; stdout: string; stderr: string }> {
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
  const ana = content.cases.get("anaphylaxis-garden")?.def;
  const preset = ana?.interventions.find((i) => i.id === "adrenaline-im")?.doseSpec;

  it("“IM adrenaline 5 mg” with automatic confirmation: not given, a critical dose error — safety not passed; the transcript shows it", { timeout: T }, async () => {
    expect(preset).toEqual({ amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" });
    const box = sandbox();
    const ops = [JSON.stringify({ type: "user_message", text: "/give IM adrenaline 5 mg" })].join("\n");
    const r = await run(["exec", "--case", "anaphylaxis-garden", "--lang", "en", "--approval", "auto", "--input-format", "stream-json", "--output-format", "json", "--assess"], `${ops}\n`, box);
    expect(r.code, r.stderr).toBe(0);
    const result = JSON.parse(r.stdout.trim().split("\n").at(-1)!) as { safety: { passed: boolean; critical_failures: number; dose_errors: number }; assessment: { report: ReturnType<typeof assess> } };
    expect(result.safety).toEqual({ passed: false, critical_failures: 0, dose_errors: 1 });
    expect(result.assessment.report.safety.doseErrors[0]).toMatchObject({ interventionId: "adrenaline-im", text: "IM adrenaline 5 mg", ordered: { amount: 5, unit: "mg", route: "IM" }, ratio: 10, severity: "critical" });
    // the recorded transcript: the assessment line carries the safety outcome beside the score
    const show = await run(["sessions", "show", "latest", "--lang", "en"], "", box);
    expect(show.code, show.stderr).toBe(0);
    expect(show.stdout).toMatch(/^Assessment: \d+% · Safety: not passed — critical dose errors: 1$/m);
  });
});
