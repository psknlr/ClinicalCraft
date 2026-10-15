/**
 * Regression tests for the adversarial-review fixes in the CLI front-end:
 * terminal sanitisation of untrusted settings keys and uploaded transcripts,
 * piped approval prompts, content-directory hints, the resolved model in
 * eval/REPL, the first streamed staff label, mid-case assessments and
 * `--provider` without its key.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings, type AgentEvent, type EventMsg } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { assess, createSession as engineState } from "@clinicalcraft/core";
import { createPalette } from "./ansi.js";
import type { CliIO } from "./context.js";
import { main } from "./main.js";
import { EventRenderer, resolvedModelLabel } from "./render.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-review-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const SMZL = "smzl-lung-adeno";
const smzl = content.cases.get(SMZL)?.def;
const stroke = content.cases.get("acute-ischemic-stroke")?.def;
const T = 60_000;
const ESC = "\u001b";

function sandbox(projectSettings?: Record<string, unknown>): { env: Record<string, string>; cwd: string; home: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  if (projectSettings) writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify(projectSettings));
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, cwd, home };
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
  const io = { stdout, stderr, stdin } as unknown as CliIO;
  const code = await main(argv, { io, env: box.env, cwd: box.cwd });
  return { code, stdout: out, stderr: err };
}

describe("untrusted text never reaches the terminal raw (F4, F5)", () => {
  it("an untrusted project's provider/profile names in the dropped-keys warning are sanitised", { timeout: T }, async () => {
    const box = sandbox({
      providers: { [`x${ESC}]52;c;cm0gLXJmIH4=\u0007`]: { wire: "openai-chat-completions", baseUrl: "http://127.0.0.1:9/v1", headers: { a: "b" } } },
      profiles: { [`q${ESC}]0;pwned\u0007`]: { hooks: { SessionStart: [{ hooks: [{ type: "command", command: "echo hi" }] }] } } },
    });
    const r = await run(["config", "get", "provider", "--lang", "en"], box);
    expect(r.stderr).toMatch(/untrusted|trust/i);
    expect(r.stderr).not.toContain(ESC);
    expect(r.stderr).not.toContain("\u0007");
  });

  it.skipIf(!smzl)("sessions list --web and sessions show print uploaded transcripts sanitised", { timeout: T }, async () => {
    const box = sandbox();
    const web = join(box.home, "sessions", "web");
    mkdirSync(web, { recursive: true });
    const items = [
      { type: "session_meta", ordinal: 0, ts: "2026-01-01T00:00:00.000Z", payload: { sessionId: "up1", caseId: `${SMZL}${ESC}]52;c;Zm9v\u0007`, caseVersion: "1", facilityId: null, locale: "en", provider: "offline", model: "", clinicalcraftVersion: "5" } },
      { type: "event", ordinal: 1, ts: "2026-01-01T00:00:01.000Z", payload: { id: "e", msg: { type: "agent_message", turnId: "t", agent: "patient", speaker: `p${ESC}]0;pwned\u0007`, text: `hello${ESC}[2J`, grounded: [] } } },
    ];
    writeFileSync(join(web, "up1.jsonl"), items.map((i) => JSON.stringify(i)).join("\n") + "\n");
    const list = await run(["sessions", "list", "--web", "--lang", "en"], box);
    expect(list.code, list.stderr).toBe(0);
    expect(list.stdout).toContain("up1");
    expect(list.stdout).not.toContain(ESC);
    const show = await run(["sessions", "show", "up1", "--lang", "en"], box);
    expect(show.code, show.stderr).toBe(0);
    expect(show.stdout).toContain("hello");
    expect(show.stdout).not.toContain(ESC);
    expect(show.stdout).not.toContain("\u0007");
  });
});

describe("piped approval prompts (J7)", () => {
  it.skipIf(!smzl)("a /command after a request is the script's next step: the request is denied and the command still runs", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["play", SMZL, "--approval", "strict", "--lang", "en", "--ephemeral"], box, "/order cbc\n/status\n/quit\n");
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("the next input line is a command, not an answer");
    expect(r.stdout).toMatch(/Approval mode\s+strict/); // /status ran
    expect(r.stdout).not.toContain("? › /status");
  });
});

describe("content directories in unknown-case errors (C9)", () => {
  it("lists the directories searched, flagging one that does not exist", { timeout: T }, async () => {
    const box = sandbox({ contentDirs: ["content"] });
    const r = await run(["cases", "verify", "my-new-case", "--lang", "en"], box);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("Content directories searched:");
    expect(r.stderr).toMatch(/\.clinicalcraft[\\/]content \(does not exist\)/);
    expect(r.stderr).toContain("../content");
  });
});

describe("the model actually used (C10)", () => {
  it("resolves provider defaults and custom providers, never '-' or 'default'", () => {
    const settings = mergeSettings([
      { source: "flag", settings: { provider: "my-claude", providers: { "my-claude": { wire: "anthropic-messages", baseUrl: "http://127.0.0.1:9", defaultModel: "claude-sonnet-5-5" } } } },
    ]);
    expect(resolvedModelLabel(settings, {})).toBe("claude-sonnet-5-5");
    expect(resolvedModelLabel(settings, {}, "openai")).toBe("gpt-5");
    expect(resolvedModelLabel(settings, {}, "offline")).toBe("deterministic");
    expect(resolvedModelLabel({ ...settings, model: "x-model" }, {})).toBe("x-model");
  });

  it.skipIf(!smzl)("eval reports the model the runs used", { timeout: T }, async () => {
    const box = sandbox();
    const out = join(box.cwd, "eval.json");
    const md = join(box.cwd, "eval.md");
    const r = await run(["eval", "--cases", SMZL, "--max-turns", "2", "--out", md, "--json", out, "--lang", "en"], box);
    expect([0, 4, 3], r.stderr).toContain(r.code);
    const report = JSON.parse((await import("node:fs")).readFileSync(out, "utf8")) as { model: string };
    expect(report.model).toBe("deterministic");
    expect((await import("node:fs")).readFileSync(md, "utf8")).not.toMatch(/model default/);
  });
});

describe("EventRenderer review fixes (J13/C12, F8)", () => {
  const render = () => {
    let out = "";
    const renderer = new EventRenderer({ out: { write: (s: string) => ((out += s), true) }, palette: createPalette(false), caseDef: smzl!, locale: () => "en", interactive: false, verbose: false });
    let seq = 0;
    const emit = (msg: EventMsg) => renderer.handle({ id: "s", seq: ++seq, msg } as AgentEvent);
    return { renderer, emit, out: () => out };
  };

  it.skipIf(!smzl)("the first streamed staff line carries the staff member's name from turn_started", () => {
    const r = render();
    r.emit({ type: "turn_started", turnId: "t1", agent: "nurse", speaker: "He Jing (resus nurse)" });
    r.emit({ type: "agent_message_delta", turnId: "t1", agent: "nurse", delta: "Let me check the monitor." });
    expect(r.out()).toContain("He Jing (resus nurse): Let me check the monitor.");
    expect(r.out()).not.toMatch(/^Nurse:/m);
  });

  it.skipIf(!stroke)("a mid-case assessment counts the essential tests not yet obtained instead of naming them", () => {
    let out = "";
    const renderer = new EventRenderer({ out: { write: (s: string) => ((out += s), true) }, palette: createPalette(false), caseDef: stroke!, locale: () => "en", interactive: false, verbose: false });
    const report = assess(stroke!, engineState(stroke!));
    expect(report.investigations.essentialMissing.length).toBeGreaterThan(0);
    renderer.renderAssessment(report, null, []);
    expect(out).toMatch(/not obtained yet: \d+/);
    for (const id of report.investigations.essentialMissing) {
      const inv = stroke!.investigations.find((i) => i.id === id)!;
      expect(out).not.toContain(typeof inv.name === "string" ? inv.name : inv.name.en!);
    }
  });
});

describe("--provider without its key is an error (C0)", () => {
  it("play and mcp fail fast instead of a silent offline patient", { timeout: T }, async () => {
    const box = sandbox();
    for (const argv of [["play", SMZL, "--provider", "anthropic", "--lang", "en"], ["mcp", "--provider", "anthropic", "--lang", "en"]]) {
      const r = await run(argv, box);
      expect(r.code).toBe(1);
      expect(r.stderr).toMatch(/ANTHROPIC_API_KEY/);
    }
  });
});
