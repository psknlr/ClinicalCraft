/**
 * Headless `exec` behaviour (in-process `main()` with in-memory streams):
 * terminal-safe text output, unattended approvals (only `bypass` approves
 * everything; `auto` denies always-ask / high-risk / ask-rule requests unless
 * `--approve-high-risk`), and an autopilot that ends with the case incomplete
 * reporting it (result subtype `error_incomplete`, exit code 4).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import type { CliIO } from "./context.js";
import { main } from "./main.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-headless-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const stroke = content.cases.get("acute-ischemic-stroke");
const dka = content.cases.get("dka-adult");
const smzl = content.cases.get("smzl-lung-adeno");
const T = 120_000;

function sandbox(projectSettings?: Record<string, unknown>): { env: Record<string, string>; cwd: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  if (projectSettings) writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify(projectSettings));
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

type Line = { type: string; msg?: Record<string, any>; [key: string]: any };
const jsonLines = (stdout: string): Line[] =>
  stdout
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Line);
const requests = (lines: Line[]) => lines.filter((l) => l.msg?.type === "approval_request").map((l) => l.msg!);
const resolved = (lines: Line[]) => new Map(lines.filter((l) => l.msg?.type === "approval_resolved").map((l) => [l.msg!.requestId as string, l.msg!]));

describe("exec text output is terminal-safe", () => {
  it.skipIf(!smzl)("strips escape sequences from case/model text on stdout and stderr", { timeout: T }, async () => {
    const box = sandbox();
    const dir = join(box.cwd, "content", "cases", "esc-demo");
    mkdirSync(dir, { recursive: true });
    const c = structuredClone(JSON.parse(readFileSync(smzl!.file, "utf8"))) as Record<string, any>;
    c.id = "esc-demo";
    const pain = (c.history as { id: string; answer: Record<string, string> }[]).find((h) => h.id === "pain")!;
    pain.answer.en = `Upper left \u001b]52;c;ZXZpbA==\u0007abdomen\u001b[2A\u001b[2K, doctor.\r`;
    c.patient.displayName.en = "Mr.\u001b]0;pwned\u0007 Wang";
    writeFileSync(join(dir, "case.json"), JSON.stringify(c));
    writeFileSync(join(box.cwd, ".clinicalcraft", "settings.json"), JSON.stringify({ contentDirs: [join(box.cwd, "content")] }));
    const r = await run(["exec", "Where does it hurt, and when did it start?", "--case", "esc-demo", "--lang", "en", "--ephemeral"], box);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("Upper left abdomen, doctor.");
    for (const text of [r.stdout, r.stderr]) {
      expect(text).not.toMatch(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/);
    }
  });
});

describe("headless approvals", () => {
  const strokeArgs = ["exec", "--case", "acute-ischemic-stroke", "--autopilot", "--lang", "en", "--ephemeral", "--output-format", "stream-json", "--no-assess"];

  it.skipIf(!stroke)("auto approves low/moderate requests but denies always-ask, high-risk and ask-rule requests with a reason", { timeout: T }, async () => {
    const box = sandbox({ permissions: { ask: ["intervene(*lysis*)", "intervene(labetalol)"] } });
    const r = await run([...strokeArgs, "--approval", "auto"], box);
    const lines = jsonLines(r.stdout);
    const reqs = requests(lines);
    const answers = resolved(lines);
    const lysis = reqs.find((q) => q.ruleId === "tool.always-ask");
    expect(lysis, "the tenecteplase step asks").toBeDefined();
    expect(answers.get(lysis!.requestId)).toMatchObject({ decision: "denied" });
    expect(String(answers.get(lysis!.requestId)!.reason)).toMatch(/headless.*--approve-high-risk/i);
    const askRule = reqs.find((q) => q.ruleId === "rule.ask");
    expect(askRule, "the labetalol ask rule fires").toBeDefined();
    expect(answers.get(askRule!.requestId)).toMatchObject({ decision: "denied" });
    for (const q of reqs) expect([q.ruleId, answers.get(q.requestId)!.decision]).not.toEqual([q.ruleId, "approved"]);
    const result = lines.at(-1)!;
    expect(result.type).toBe("result");
    expect(result.permission_denials.length).toBeGreaterThanOrEqual(2);
    // Nothing high-risk ran.
    const applied = lines.filter((l) => l.msg?.type === "clinical_event" && l.msg.event.type === "intervention.applied").map((l) => l.msg!.event.interventionId as string);
    expect(applied).not.toContain("tenecteplase");
    expect(applied).not.toContain("labetalol");
  });

  it.skipIf(!stroke)("--approve-high-risk lets auto approve them; bypass never asks; default denies everything", { timeout: T }, async () => {
    const box = sandbox({ permissions: { ask: ["intervene(labetalol)"] } });
    const opted = jsonLines((await run([...strokeArgs, "--approval", "auto", "--approve-high-risk"], box)).stdout);
    const answers = resolved(opted);
    expect(requests(opted).length).toBeGreaterThan(0);
    for (const q of requests(opted)) expect(answers.get(q.requestId)).toMatchObject({ decision: "approved" });
    expect(opted.filter((l) => l.msg?.type === "clinical_event" && l.msg.event.type === "intervention.applied").map((l) => l.msg!.event.interventionId)).toContain("tenecteplase");

    const bypass = jsonLines((await run([...strokeArgs, "--approval", "bypass"], box)).stdout);
    // Only ask rules still raise requests in bypass (always-ask is skipped); they are approved.
    for (const q of requests(bypass)) expect([q.ruleId, resolved(bypass).get(q.requestId)!.decision]).toEqual(["rule.ask", "approved"]);

    const strict = jsonLines((await run([...strokeArgs, "--approval", "default"], box)).stdout);
    for (const q of requests(strict)) expect(resolved(strict).get(q.requestId)).toMatchObject({ decision: "denied", reason: "headless: approval required" });
  });

  it("--approve-high-risk is listed in exec --help", { timeout: T }, async () => {
    const r = await run(["exec", "--help", "--lang", "en"], sandbox());
    expect(r.stdout).toContain("--approve-high-risk");
    const zh = await run(["exec", "--help", "--lang", "zh-CN"], sandbox());
    expect(zh.stdout).toContain("--approve-high-risk");
  });
});

describe("an autopilot that ends with the case incomplete is not a success", () => {
  it.skipIf(!dka)("offline walkthrough with denied steps: says so, lists them, subtype error_incomplete, exit 4", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["exec", "--case", "dka-adult", "--autopilot", "--lang", "en", "--ephemeral", "--output-format", "json", "--no-assess"], box);
    const result = JSON.parse(r.stdout.trim().split("\n").at(-1)!) as Line;
    expect(result.completed).toBe(false);
    expect(result.subtype).toBe("error_incomplete");
    expect(result.is_error).toBe(true);
    expect(r.code).toBe(4);
    expect(result.result).not.toMatch(/Reference walkthrough complete/);
    expect(result.result).toMatch(/not complete/);
    expect(result.result).toMatch(/intervene\(stop-friii\)/);

    const text = await run(["exec", "--case", "dka-adult", "--autopilot", "--lang", "zh-CN", "--ephemeral", "--no-assess"], box);
    expect(text.code).toBe(4);
    expect(`${text.stdout}${text.stderr}`).not.toContain("参考路径已完成");
    expect(`${text.stdout}${text.stderr}`).toMatch(/尚未完成/);
  });

  it.skipIf(!dka)("a complete walkthrough still succeeds", { timeout: T }, async () => {
    const r = await run(["exec", "--case", "dka-adult", "--autopilot", "--approval", "bypass", "--lang", "en", "--ephemeral", "--output-format", "json", "--no-assess"], sandbox());
    const result = JSON.parse(r.stdout.trim().split("\n").at(-1)!) as Line;
    expect([result.subtype, r.code, result.completed]).toEqual(["success", 0, true]);
  });
});
