/**
 * In-process regression tests (fast: `main()` with in-memory streams) for
 * defects found by the front-end review: localised bootstrap errors, stale
 * speaker labels after a language switch, `config set` validation and
 * shadowing, and `sessions list|show` presentation.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import type { AgentEvent, EventMsg } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { isLoopbackHost } from "@clinicalcraft/server";
import { createPalette } from "./ansi.js";
import type { CliIO } from "./context.js";
import { m, type MsgKey } from "./i18n.js";
import { main } from "./main.js";
import { caseChoiceMeta, sortedCases } from "./picker.js";
import { EventRenderer } from "./render.js";
import { isLoopback } from "./serve.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-reg-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const SMZL = "smzl-lung-adeno";
const smzl = content.cases.get(SMZL)?.def;
const T = 60_000;

/** A fresh CLINICALCRAFT_HOME and project directory (optionally with project settings). */
function sandbox(projectSettings?: Record<string, unknown>): { env: Record<string, string>; cwd: string; home: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  if (projectSettings) writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify(projectSettings));
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, cwd, home };
}

/** Run `main` with in-memory, non-TTY streams. */
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

describe("bootstrap errors are localised usage errors with a hint", () => {
  it.skipIf(!smzl)("unknown case (play / exec / bare id) → exit 2, localised, did-you-mean", { timeout: T }, async () => {
    const box = sandbox();
    const zh = await run(["play", "smzl"], box);
    expect(zh.code).toBe(2);
    expect(zh.stderr).toContain("未知病例“smzl”");
    expect(zh.stderr).toContain(SMZL);
    expect(zh.stderr).not.toContain("Unknown case");

    const en = await run(["exec", "hi", "--case", "smzl-lung-adeo", "--lang", "en"], box);
    expect(en.code).toBe(2);
    expect(en.stderr).toContain('Unknown case "smzl-lung-adeo".');
    expect(en.stderr).toContain(`Did you mean ${SMZL}?`);

    const bare = await run(["smzl-lung", "--lang", "en"], box);
    expect(bare.code).toBe(2);
    expect(bare.stderr).toContain(`Did you mean ${SMZL}?`);
  });

  it("no case selected → exit 2 with the list of cases", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["exec", "hi"], box);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("未选择病例");
    expect(r.stderr).not.toContain("No case selected");
  });

  it.skipIf(!smzl)("unknown facility → exit 2, localised", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["exec", "hi", "--case", SMZL, "--facility", "clinic-v5", "--lang", "en"], box);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('Unknown facility "clinic-v5".');
    expect(r.stderr).toContain("Did you mean clinic-v4?");
  });

  it.skipIf(!smzl)("--resume / --continue problems → exit 2, localised", { timeout: T }, async () => {
    const box = sandbox();
    const none = await run(["exec", "hi", "--resume", "nope"], box);
    expect(none.code).toBe(2);
    expect(none.stderr).toContain("没有可恢复的会话记录");

    const first = await run(["exec", "哪里疼", "--case", SMZL, "--output-format", "json"], box);
    expect(first.code).toBe(0);
    const unknown = await run(["exec", "hi", "--resume", "nope", "--lang", "en"], box);
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain('No session "nope".');

    const mismatch = await run(["exec", "hi", "--continue", "--case", "acute-appendicitis", "--lang", "en"], box);
    expect(mismatch.code).toBe(2);
    expect(mismatch.stderr).toMatch(/Session \S+ is for case "smzl-lung-adeno", not "acute-appendicitis"\./);
  });
});

describe("global options", () => {
  it.skipIf(!smzl)("an unknown --profile is a localised usage error listing the known profiles", { timeout: T }, async () => {
    const box = sandbox({ profiles: { osce: { approvalMode: "strict" } } });
    const r = await run(["exec", "hi", "--case", SMZL, "--profile", "nope"], box);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("未知的设置预设“nope”（已有：osce）");
  });

  it("a --cwd that is not a directory is a usage error", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["cases", "list", "--cwd", join(box.cwd, "missing"), "--lang", "en"], box);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("is not a directory");
  });
});

describe("serve", () => {
  it("treats the same hosts as loopback as the server does", async () => {
    for (const host of ["127.0.0.1", "127.1.2.3", "localhost", "app.localhost", "::1", "[::1]", "0:0:0:0:0:0:0:1", "127.evil.com", "0.0.0.0", "192.168.1.2", "localhost.evil.com"]) {
      expect(isLoopback(host), host).toBe(isLoopbackHost(host));
    }
    const box = sandbox();
    const r = await run(["serve", "--host", "127.evil.com", "--lang", "en"], box);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("--token");
  });

  it("refuses short tokens and unreadable token files (usage errors, localised)", { timeout: T }, async () => {
    const box = sandbox();
    const short = await run(["serve", "--host", "0.0.0.0", "--token", "tok-123", "--lang", "en"], box);
    expect(short.code).toBe(2);
    expect(short.stderr).toContain("at least 16");
    expect(short.stderr).not.toContain("tok-123");
    const zh = await run(["serve", "--token", "short"], { ...box, env: { ...box.env } });
    expect(zh.code).toBe(2);
    expect(zh.stderr).toContain("16");
    const fromEnv = await run(["serve", "--host", "0.0.0.0", "--lang", "en"], { ...box, env: { ...box.env, CLINICALCRAFT_SERVER_TOKEN: "short" } });
    expect(fromEnv.code).toBe(2);
    const missing = await run(["serve", "--token-file", join(box.cwd, "nope.txt"), "--lang", "en"], box);
    expect(missing.code).toBe(2);
    expect(missing.stderr).toContain("nope.txt");
  });
});

describe("EventRenderer", () => {
  it.skipIf(!smzl)("labels streamed text with the speaker name of the current language", () => {
    let locale = "zh-CN";
    let out = "";
    const renderer = new EventRenderer({
      out: { write: (s: string) => ((out += s), true) },
      palette: createPalette(false),
      caseDef: smzl!,
      locale: () => locale,
      interactive: false,
      verbose: false,
    });
    let seq = 0;
    const emit = (msg: EventMsg) => renderer.handle({ id: "s", seq: ++seq, msg } as AgentEvent);
    emit({ type: "agent_message", turnId: "t1", agent: "patient", speaker: "王先生（化名）", text: "医生您好。", grounded: [] });
    expect(out).toContain("王先生（化名）: 医生您好。");

    locale = "en"; // `/lang en`
    emit({ type: "config_changed", patch: { locale: "en" } });
    emit({ type: "agent_message_delta", turnId: "t2", agent: "patient", delta: "Hello." });
    emit({ type: "agent_message", turnId: "t2", agent: "patient", speaker: "Mr. Wang (pseudonym)", text: "Hello.", grounded: [] });
    emit({ type: "turn_complete", turnId: "t2", agent: "patient", lastMessage: "Hello.", durationMs: 1 });
    expect(out).toContain("Mr. Wang (pseudonym): Hello.");
    expect(out).not.toContain("王先生（化名）: Hello.");
  });

  it.skipIf(!smzl)("/provider without a model shows that provider's default model in the status line", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["play", SMZL, "--lang", "en"], box, "/provider anthropic\n/provider offline\n/model\n");
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("anthropic/claude-opus-5-5");
    expect(r.stdout).not.toContain("anthropic/deterministic");
    expect(r.stdout).toContain("offline/deterministic");
  });

  it.skipIf(!smzl)("prints a denied command once (the ✗ line), not again as its output", () => {
    let out = "";
    const renderer = new EventRenderer({ out: { write: (s: string) => ((out += s), true) }, palette: createPalette(false), caseDef: smzl!, locale: () => "en", interactive: false, verbose: false });
    let seq = 0;
    const emit = (msg: EventMsg) => renderer.handle({ id: "s", seq: ++seq, msg } as AgentEvent);
    emit({ type: "approval_resolved", requestId: "r", decision: "denied", reason: "no input available" });
    emit({ type: "error", message: "Action not permitted: no input available", code: "permission_denied" });
    emit({ type: "command_output", name: "order", text: "Action not permitted: no input available", data: { ok: false } });
    expect(out.split("Action not permitted").length - 1).toBe(1);
    emit({ type: "command_output", name: "status", text: "Status text" });
    expect(out).toContain("Status text");
  });
});

describe("config set", () => {
  it("rejects an invalid value as a localised usage error and writes nothing", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["config", "set", "approvalMode", "yolo"], box);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("approvalMode 的值无效");
    const en = await run(["config", "set", "practiceScope", "everything", "--lang", "en"], box);
    expect(en.code).toBe(2);
    expect(en.stderr).toContain("Invalid value for practiceScope");
    const get = await run(["config", "get", "approvalMode"], box);
    expect(get.stdout.trim()).toBe("default");
  });

  it("warns when a higher-precedence layer still decides the value", { timeout: T }, async () => {
    const box = sandbox({ approvalMode: "strict" });
    const r = await run(["config", "set", "approvalMode", "auto", "--lang", "en"], box);
    expect(r.code).toBe(0);
    expect(r.stderr).toContain('approvalMode is still "strict"');
    expect(r.stderr).toContain("project");
    // No warning when the user layer is the effective one.
    const quiet = await run(["config", "set", "practiceScope", "workup", "--lang", "en"], box);
    expect(quiet.code).toBe(0);
    expect(quiet.stderr).not.toContain("is still");
  });
});

describe("cases list", () => {
  it.skipIf(!smzl)("localises the care setting column", { timeout: T }, async () => {
    const box = sandbox();
    const zh = await run(["cases", "list"], box);
    const row = zh.stdout.split("\n").find((l) => l.startsWith(SMZL))!;
    expect(row).toContain("门诊");
    expect(row).not.toContain("outpatient");
    const json = await run(["cases", "list", "--json"], box);
    expect(json.stdout).toContain('"setting": "outpatient"');
  });
});

describe("cases new", () => {
  it("gives a contentDirs hint that actually finds the case", { timeout: T }, async () => {
    const box = sandbox();
    const contentRoot = join(box.cwd, "my-content");
    const made = await run(["cases", "new", "demo-case", "--dir", join(contentRoot, "cases"), "--lang", "en"], box);
    expect(made.code).toBe(0);
    expect(made.stdout).toContain(`add "${contentRoot}" to \`contentDirs\``);
    writeFileSync(join(box.cwd, ".clinicalcraft", "settings.json"), JSON.stringify({ contentDirs: [contentRoot] }));
    const verified = await run(["cases", "verify", "demo-case", "--lang", "en"], box);
    expect(verified.code, verified.stderr).toBe(0);

    // A --dir not named "cases" cannot be found through its parent: say how to lay it out instead.
    const odd = await run(["cases", "new", "odd-case", "--dir", join(box.cwd, "drafts"), "--lang", "en"], box);
    expect(odd.code).toBe(0);
    expect(odd.stdout).not.toContain("to `contentDirs` in your settings");
    expect(odd.stdout).toContain("<dir>/cases/<id>/case.json");
  });
});

describe("sessions", () => {
  it.skipIf(!smzl)("show prints each queued learner message just before its reply", { timeout: T }, async () => {
    const box = sandbox();
    const ops = [
      JSON.stringify({ type: "user_message", text: "where does it hurt?" }),
      JSON.stringify({ type: "user_message", text: "any allergies?" }),
      JSON.stringify({ type: "slash_command", name: "order", args: "cbc" }),
    ].join("\n");
    const exec = await run(["exec", "--case", SMZL, "--lang", "en", "--input-format", "stream-json", "--output-format", "json"], box, `${ops}\n`);
    expect(exec.code).toBe(0);
    const show = await run(["sessions", "show", "latest", "--lang", "en"], box);
    expect(show.code).toBe(0);
    const lines = show.stdout.split("\n");
    const firstQ = lines.findIndex((l) => l.includes("where does it hurt?"));
    const secondQ = lines.findIndex((l) => l.includes("any allergies?"));
    const firstA = lines.findIndex((l) => l.startsWith("Mr. Wang") && /abdomen/.test(l));
    expect(firstQ).toBeGreaterThanOrEqual(0);
    expect(firstA).toBeGreaterThan(firstQ);
    expect(secondQ).toBeGreaterThan(firstA);
    // Command output is shown under its command.
    const order = lines.findIndex((l) => l.trim() === "/order cbc");
    expect(order).toBeGreaterThan(secondQ);
    expect(lines[order + 1]).toContain("Ordered Complete blood count");
  });

  it("list shows a file name, not a path, for a transcript without session_meta", { timeout: T }, async () => {
    const box = sandbox();
    const dir = join(box.home, "sessions", "web");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "web-upload-1.jsonl"), `${JSON.stringify({ type: "op", ordinal: 1, ts: "2026-01-01T00:00:00Z", payload: { id: "a", op: { type: "interrupt" } } })}\n`);
    const plain = await run(["sessions", "list", "--lang", "en"], box);
    expect(plain.stdout).not.toContain("web-upload-1"); // web uploads are listed only with --web
    const r = await run(["sessions", "list", "--web", "--lang", "en"], box);
    expect(r.code).toBe(0);
    const row = r.stdout.split("\n").find((l) => l.includes("web-upload-1"))!;
    expect(row.trim().startsWith("web-upload-1 (web) ")).toBe(true);
  });
});

describe("project trust", () => {
  it.skipIf(!smzl || process.platform === "win32")("exec warns on stderr and skips an untrusted project's hooks; `trust` allows them", { timeout: T }, async () => {
    const hook = { SessionStart: [{ hooks: [{ type: "command", command: "echo ran > hook-marker.txt" }] }] };
    const box = sandbox({ hooks: hook });
    writeFileSync(join(box.cwd, ".clinicalcraft", "settings.local.json"), JSON.stringify({ providers: { anthropic: { apiKeyEnv: ["UNRELATED_SECRET"] } } }));
    const marker = join(box.cwd, "hook-marker.txt");

    const first = await run(["exec", "hi", "--case", SMZL, "--lang", "en", "--ephemeral"], box);
    expect(first.code).toBe(0);
    expect(existsSync(marker)).toBe(false);
    const warnings = first.stderr.split("\n").filter((l) => l.includes("not trusted"));
    expect(warnings).toHaveLength(1); // once per invocation, without --verbose
    expect(warnings[0]).toContain("hooks");
    expect(warnings[0]).toContain("providers.anthropic.apiKeyEnv");
    expect(warnings[0]).toContain("clinicalcraft trust");

    const trust = await run(["trust", "--lang", "en"], box);
    expect(trust.code).toBe(0);
    expect(trust.stdout).toContain("SessionStart: echo ran > hook-marker.txt");
    const second = await run(["exec", "hi", "--case", SMZL, "--lang", "en", "--ephemeral"], box);
    expect(second.code).toBe(0);
    expect(second.stderr).not.toContain("not trusted");
    expect(existsSync(marker)).toBe(true);

    const list = await run(["trust", "--list", "--json"], box);
    expect(JSON.parse(list.stdout)).toHaveLength(1);
    const revoke = await run(["trust", "--revoke", "--lang", "en"], box);
    expect(revoke.stdout).toContain("No longer trusting");
    const zh = await run(["exec", "hi", "--case", SMZL, "--ephemeral"], box);
    expect(zh.stderr).toContain("此项目尚未被信任");
  });
});

describe("learner-facing CLI text is fully localised (backlog L16–L20, L24, D2)", () => {
  const DKA = "dka-adult";
  const dka = content.cases.get(DKA)?.def;

  it.skipIf(!dka)("`cases show` (zh-CN) translates the setting, specialties, minutes and clock mode (L16)", { timeout: T }, async () => {
    const box = sandbox();
    const zh = await run(["cases", "show", DKA], box);
    expect(zh.code).toBe(0);
    const setting = zh.stdout.split("\n").find((l) => l.startsWith("场景："))!;
    expect(setting).toContain("急诊");
    expect(setting).toContain("急诊医学");
    expect(setting).toContain("约 45 分钟");
    expect(setting).toContain("临床方块综合医院"); // the facility's name, not its id
    expect(setting).not.toMatch(/emergency|medicine|general-hospital|min\b|~/);
    const languages = zh.stdout.split("\n").find((l) => l.startsWith("语言："))!;
    expect(languages).toContain("模拟时钟");
    expect(languages).toContain("简体中文（zh-CN）、英语（en）");
    expect(languages).not.toContain("simulated");
    expect(zh.stdout).toContain("来源： 虚构教学病例");
    const en = await run(["cases", "show", DKA, "--lang", "en"], box);
    expect(en.stdout).toMatch(/Setting: emergency · .*Emergency medicine.* · ~45 min/);
    expect(en.stdout).toContain("simulated clock");
  });

  it.skipIf(!dka)("the case picker shows the setting in the UI language (L16)", async () => {
    const zhT = (key: MsgKey, params?: Record<string, string | number>) => m("zh-CN", key, params);
    expect(caseChoiceMeta({ t: zhT }, dka!)).toBe("★★★☆☆ · 急诊");
    const enT = (key: MsgKey, params?: Record<string, string | number>) => m("en", key, params);
    expect(caseChoiceMeta({ t: enT }, dka!)).toBe("★★★☆☆ · emergency");
  });

  it("`cases list` (and the picker) use one deterministic order in every language: published first, then difficulty, then id (D2)", { timeout: T }, async () => {
    const box = sandbox();
    const ids = (out: string) => (JSON.parse(out) as { id: string }[]).map((c) => c.id);
    const zh = ids((await run(["cases", "list", "--json"], box)).stdout);
    const en = ids((await run(["cases", "list", "--json", "--lang", "en"], box)).stdout);
    expect(en).toEqual(zh);
    const defs = [...content.cases.values()].map((e) => e.def);
    const expected = [...defs]
      .sort((a, b) => Number(b.provenance.kind === "published-case") - Number(a.provenance.kind === "published-case") || a.difficulty - b.difficulty || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((c) => c.id);
    expect(zh).toEqual(expected);
    expect(sortedCases(content, "zh-CN").map((c) => c.id)).toEqual(expected);
    expect(sortedCases(content, "en").map((c) => c.id)).toEqual(expected);
  });

  it("`config set locale` accepts only supported languages; an unsupported configured language falls back with a warning (L18)", { timeout: T }, async () => {
    const box = sandbox();
    const bad = await run(["config", "set", "locale", "fr"], box);
    expect(bad.code).toBe(2);
    expect(bad.stderr).toContain("locale 的值无效");
    expect(bad.stderr).toContain("zh-CN");
    expect((await run(["config", "get", "locale"], box)).stdout.trim()).toBe("zh-CN");
    const alias = await run(["config", "set", "locale", "english", "--lang", "en"], box);
    expect(alias.code).toBe(0);
    expect(alias.stdout).toContain('locale = "en"');

    const project = sandbox({ locale: "fr" });
    const r = await run(["exec", "hi", "--case", SMZL, "--output-format", "json", "--ephemeral"], project);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stderr).toContain("“fr”");
    expect(r.stderr).toContain("zh-CN");
    const lines = r.stdout.trim().split("\n");
    expect(JSON.parse(lines[lines.length - 1]!)).toMatchObject({ type: "result" });
    expect(r.stdout).not.toContain('"locale":"fr"');
  });

  it("`providers list` says a keyless local provider needs no key instead of 'yes' (L19)", { timeout: T }, async () => {
    const box = sandbox();
    const zh = await run(["providers", "list"], box);
    const ollama = zh.stdout.split("\n").find((l) => /^\s?\*?ollama\s/.test(l))!;
    expect(ollama).toContain("无需密钥");
    expect(ollama).not.toMatch(/\s是$/);
    const en = await run(["providers", "list", "--lang", "en"], box);
    expect(en.stdout.split("\n").find((l) => /^\s?\*?lmstudio\s/.test(l))).toMatch(/not needed$/);
    const json = JSON.parse((await run(["providers", "list", "--json"], box)).stdout) as { id: string; keyRequired: boolean }[];
    expect(json.find((p) => p.id === "ollama")?.keyRequired).toBe(false);
    expect(json.find((p) => p.id === "anthropic")?.keyRequired).toBe(true);
  });

  it.skipIf(!smzl)("`sessions show` names completed objectives by their titles (L20)", { timeout: 120_000 }, async () => {
    const box = sandbox();
    const exec = await run(["exec", "--case", SMZL, "--autopilot", "--approval", "bypass", "--output-format", "json", "--lang", "en"], box);
    expect(exec.code, exec.stderr).toBe(0);
    const show = await run(["sessions", "show", "latest", "--lang", "en"], box);
    expect(show.code).toBe(0);
    const done = show.stdout.split("\n").filter((l) => l.trim().startsWith("✓"));
    expect(done.length).toBe(smzl!.objectives.length);
    expect(done.map((l) => l.trim().slice(2))).toEqual(smzl!.objectives.map((o) => o.title.en));
    expect(show.stdout).not.toMatch(/✓ ch\d-/);
  });

  it("import-v4 failures are localised; raw errno text appears only with --verbose (L24)", { timeout: T }, async () => {
    const box = sandbox();
    writeFileSync(join(box.cwd, "package.json"), "{}");
    const noInput = await run(["import-v4", "package.json", "--dest", join(box.cwd, "assets")], box);
    expect(noInput.code).toBe(1);
    expect(noInput.stderr).toContain("导入失败");
    expect(noInput.stderr).not.toMatch(/no V4 html|[A-Za-z]{4,} [a-z]{4,}/);
    const missing = await run(["import-v4", join(box.cwd, "nonexistent.html")], box);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("找不到文件");
    expect(missing.stderr).toContain("nonexistent.html");
    expect(missing.stderr).not.toContain("ENOENT");
    const verbose = await run(["import-v4", join(box.cwd, "nonexistent.html"), "--verbose"], box);
    expect(verbose.stderr).toContain("ENOENT");
    const en = await run(["import-v4", "package.json", "--lang", "en"], box);
    expect(en.stderr).toContain("none of the inputs is the V4 html");
  });
});
