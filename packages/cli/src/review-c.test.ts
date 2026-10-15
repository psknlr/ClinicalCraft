/**
 * CLI follow-ups: case text is terminal-sanitised in `cases show`, `cases
 * list`/`validate` and the REPL banner — escape sequences (colours included)
 * stripped, not just the dangerous ones (C6); the utterance corpus applies
 * phase twins (`supersedes`) as the patient pipeline does (C2); an
 * unsupported configured locale is reported (C3).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import { parseCase } from "@clinicalcraft/core";
import { checkUtterances } from "./cases.js";
import type { CliIO } from "./context.js";
import { main } from "./main.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-c-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const SMZL = "smzl-lung-adeno";
const smzlFile = content.cases.get(SMZL)?.file;
const T = 60_000;
const ESC = "\u001b";
const EVIL_ID = "evil-escapes";

/** A project whose content directory holds a copy of the SMZL case with escape sequences in its texts. */
function evilProject(env: Record<string, string> = {}): { env: Record<string, string>; cwd: string } {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  const json = JSON.parse(readFileSync(smzlFile!, "utf8"));
  json.id = EVIL_ID;
  json.title = { "zh-CN": `红${ESC}[31m色${ESC}]52;c;cm0gLXJmIH4=\u0007标题`, en: `Red${ESC}[31mTitle${ESC}]0;pwned\u0007 here` };
  json.summary = { "zh-CN": `摘要${ESC}[2J`, en: `Summary${ESC}[2J clear` };
  json.patient.chiefComplaint = { "zh-CN": `咳嗽${ESC}[5m`, en: `Cough${ESC}[5m blink` };
  json.patient.triageNote = { "zh-CN": `分诊${ESC}[8m`, en: `Triage${ESC}[8m hidden` };
  json.disclaimer = { "zh-CN": `声明${ESC}[1m`, en: `Disclaimer${ESC}[1m bold` };
  json.objectives[0].title = { "zh-CN": `目标${ESC}[4m`, en: `Objective${ESC}[4m one` };
  mkdirSync(join(cwd, "content", "cases", EVIL_ID), { recursive: true });
  writeFileSync(join(cwd, "content", "cases", EVIL_ID, "case.json"), JSON.stringify(json));
  writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify({ contentDirs: ["../content"] }));
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1", ...env }, cwd };
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

/** Escape sequences other than the palette's own SGR codes for bold/dim/colours (1, 2, 22, 3x, 39, 90). */
const FOREIGN_ESCAPE = /\u001b(?!\[(?:1|2|3|22|23|3[0-9]|39|90)m)/;

describe("case text reaches the terminal without escape sequences (C6)", () => {
  it.skipIf(!smzlFile)("`cases show` strips every escape sequence from case text", { timeout: T }, async () => {
    const box = evilProject();
    const r = await run(["cases", "show", EVIL_ID, "--lang", "en"], box);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).not.toContain(ESC);
    expect(r.stdout).not.toContain("\u0007");
    expect(r.stdout).toContain("RedTitle here");
    expect(r.stdout).toContain("Summary clear");
    expect(r.stdout).toContain("Cough blink");
    expect(r.stdout).toContain("Objective one");
    // With colours on, only the palette's own codes remain (the case's red/blink/hidden/clear codes are gone).
    const colour = await run(["cases", "show", EVIL_ID, "--lang", "en"], { ...box, env: { ...box.env, NO_COLOR: "", FORCE_COLOR: "1" } });
    expect(colour.stdout).toContain(`${ESC}[1m`); // the palette is on
    for (const code of ["[31m", "[2J", "[5m", "[8m", "[4m", "]52;", "]0;"]) expect(colour.stdout).not.toContain(`${ESC}${code}`);
  });

  it.skipIf(!smzlFile)("`cases list` and `cases validate` sanitise titles, ids and messages", { timeout: T }, async () => {
    const box = evilProject();
    const list = await run(["cases", "list", "--lang", "en"], box);
    expect(list.stdout).toContain("RedTitle here");
    expect(list.stdout).not.toContain(ESC);
    const dir = join(box.cwd, "content", "cases", "broken");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "case.json"), JSON.stringify({ id: `bad${ESC}]0;x\u0007id`, schema: "clinicalcraft/case@1" }));
    const validate = await run(["cases", "validate", join(dir, "case.json"), "--lang", "en"], box);
    expect(validate.code).toBe(1);
    expect(validate.stdout).toContain("badid");
    expect(validate.stdout).not.toContain(ESC);
  });

  it.skipIf(!smzlFile)("the REPL banner strips escape sequences (colours included) from case text", { timeout: T }, async () => {
    const box = evilProject({ NO_COLOR: "", FORCE_COLOR: "1" });
    const r = await run(["play", EVIL_ID, "--lang", "en", "--ephemeral"], box, "/quit\n");
    expect(r.code, r.stderr).toBe(0);
    const banner = r.stdout.split("\n").slice(0, 6).join("\n");
    expect(banner.replace(/\u001b\[[0-9;]*m/g, "")).toContain("RedTitle here");
    for (const code of ["[31m", "[5m", "[8m", "]0;"]) expect(r.stdout).not.toContain(`${ESC}${code}`);
    expect(r.stdout).not.toMatch(FOREIGN_ESCAPE);
  });
});

describe("utterance corpus and phase twins (C2)", () => {
  it.skipIf(!smzlFile)("a hit on an item superseded in the expected item's phase counts for its twin", () => {
    const json = JSON.parse(readFileSync(smzlFile!, "utf8"));
    const phase = json.phases[json.phases.length - 1].id as string;
    const pain = json.history.find((h: { id: string }) => h.id === "pain");
    json.history.push({
      id: "pain-now",
      topic: pain.topic,
      question: { "zh-CN": "现在还疼吗？", en: "Does it still hurt now?" },
      answer: { "zh-CN": "现在不太疼了。", en: "Not much now." },
      keywords: { "zh-CN": ["现在还疼"], en: ["still hurt"] },
      phases: [phase],
      supersedes: ["pain"],
    });
    json.extensions = { testUtterances: [{ text: t(pain.question, "en"), locale: "en", expect: ["pain-now"] }] };
    const parsed = parseCase(json);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
    // Raw, the question selects "pain"; in the twin's phase it selects the twin.
    expect(checkUtterances(parsed.value).failures).toEqual([]);
    const without = structuredClone(json);
    delete without.history.at(-1).supersedes;
    const plain = parseCase(without);
    if (!plain.ok) throw new Error("parse");
    expect(checkUtterances(plain.value).failures).toHaveLength(1);
  });
});

describe("unsupported configured locale (C3)", () => {
  it.skipIf(!smzlFile)("CLINICALCRAFT_LOCALE=fr is reported and the session runs in a supported language", { timeout: T }, async () => {
    const box = evilProject({ CLINICALCRAFT_LOCALE: "fr" });
    const r = await run(["exec", "hi", "--case", EVIL_ID, "--output-format", "json", "--ephemeral"], box);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stderr).toContain("“fr”");
    expect(r.stdout).not.toContain('"locale":"fr"');
  });
});

function t(text: string | Record<string, string>, locale: string): string {
  return typeof text === "string" ? text : (text[locale] ?? Object.values(text)[0]!);
}
