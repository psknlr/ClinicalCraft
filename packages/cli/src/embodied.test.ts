/**
 * Embodied mode in the CLI (in-process `main()` with in-memory streams):
 * `exec --embodied` runs the encounter headless and `--trace <file>` writes
 * the episode trace as JSON Lines; `play --embodied` takes the embodied
 * slash commands and shows the room on the status line; a clinical session
 * answers them with a pointer to embodied mode.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import type { CliIO } from "./context.js";
import { main } from "./main.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-embodied-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 120_000;

function sandbox(): { env: Record<string, string>; cwd: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
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

describe("exec --embodied", () => {
  it("finishes STEMI headless (offline autopilot) and writes the episode trace with --trace", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["exec", "--case", "stemi-inferior-rv", "--autopilot", "--approval", "bypass", "--provider", "offline", "--embodied", "--output-format", "json", "--trace", "out/trace.jsonl", "--ephemeral", "--lang", "en"], box);
    expect(r.code, r.stderr).toBe(0);
    const result = JSON.parse(r.stdout) as { subtype: string; finished: boolean; completed: boolean; progress: { done: number; total: number }; assessment: { report: { score: { percent: number } } } };
    expect(result).toMatchObject({ subtype: "success", finished: true, completed: true, progress: { done: 5, total: 5 } });
    expect(result.assessment.report.score.percent).toBe(100);
    const lines = readFileSync(join(box.cwd, "out", "trace.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines[0]).toMatchObject({ format: "clinicalcraft-trace@1", caseId: "stemi-inferior-rv", embodiment: "embodied" });
    const kinds = new Set(lines.slice(1).map((l) => l.kind));
    for (const kind of ["plan", "observation", "navigation", "interaction", "clinical_action", "state_change", "verification"]) expect(kinds, kind).toContain(kind);
  });

  it("a clinical exec writes an empty trace (header only)", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["exec", "--case", "smzl-lung-adeno", "--autopilot", "--approval", "bypass", "--provider", "offline", "--output-format", "json", "--trace", "trace.jsonl", "--ephemeral", "--lang", "en"], box);
    expect(r.code, r.stderr).toBe(0);
    const lines = readFileSync(join(box.cwd, "trace.jsonl"), "utf8").trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({ embodiment: "clinical" });
  });
});

describe("play --embodied", () => {
  it("takes /look /where /find /go /inspect /map /skill /delegate and shows the room on the status line", { timeout: T }, async () => {
    const box = sandbox();
    const input = ["/where", "/look", "/find monitor", "/go patient", "/inspect patient-monitor", "/map", "/skill", "/delegate nurse attach_monitor", "/quit", ""].join("\n");
    const r = await run(["play", "stemi-inferior-rv", "--embodied", "--provider", "offline", "--ephemeral", "--lang", "en"], box, input);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/You are in/);
    expect(r.stdout).toMatch(/What you perceive/);
    expect(r.stdout).toMatch(/eq:resus1-monitor/);
    expect(r.stdout).toMatch(/Arrived at/);
    expect(r.stdout).toMatch(/perform_ecg/);
    expect(r.stdout).toMatch(/attach the monitor: done/);
    // The status line names the room once the body is in one.
    expect(r.stdout).toMatch(/@ Resuscitation Room/);
  });

  it("in a clinical session the embodied commands point to --embodied", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["play", "stemi-inferior-rv", "--provider", "offline", "--ephemeral", "--lang", "zh-CN"], box, "/look\n/quit\n");
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/具身/);
  });
});
