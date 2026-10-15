/**
 * End-to-end tests: spawn the real CLI (`tsx packages/cli/src/bin.ts`, the
 * workspace packages resolved from source via tsconfig.source.json) with an
 * isolated CLINICALCRAFT_HOME / HOME and a scratch working directory.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AgentEvent } from "@clinicalcraft/agent";
import { buildV4Html, splitParts, writeZip } from "./__fixtures__/v4.js";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const BIN = join(REPO, "packages/cli/src/bin.ts");
const TSX = join(REPO, "node_modules/.bin/tsx");
const SOURCE_TSCONFIG = join(REPO, "packages/cli/tsconfig.source.json");
const CLI_VERSION = (JSON.parse(readFileSync(join(REPO, "packages/cli/package.json"), "utf8")) as { version: string }).version;

const SECRET = "sk-test-SECRET-0123456789abcdef";
const T = 90_000;

let root = "";
let home = "";
let work = "";

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cc-cli-e2e-"));
  home = join(root, "home");
  work = join(root, "work");
  mkdirSync(home, { recursive: true });
  mkdirSync(work, { recursive: true });
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Run the CLI; `input` (if any) is written to stdin, which is then closed. */
function cli(args: string[], opts: { input?: string; env?: Record<string, string>; cwd?: string } = {}): Promise<RunResult> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || /_API_KEY$/.test(k) || k.startsWith("CLINICALCRAFT_") || k === "FORCE_COLOR") continue;
    env[k] = v;
  }
  Object.assign(env, { CLINICALCRAFT_HOME: home, HOME: home, TSX_TSCONFIG_PATH: SOURCE_TSCONFIG, NO_COLOR: "1" }, opts.env ?? {});
  return new Promise((resolve, reject) => {
    const child = spawn(existsSync(TSX) ? TSX : "npx", existsSync(TSX) ? [BIN, ...args] : ["tsx", BIN, ...args], { cwd: opts.cwd ?? work, env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    if (opts.input !== undefined) child.stdin.end(opts.input);
    else child.stdin.end();
  });
}

function jsonLines(text: string): unknown[] {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as unknown);
}

describe("global", () => {
  it("prints the version and help", { timeout: T }, async () => {
    const v = await cli(["--version"]);
    expect(v.code).toBe(0);
    expect(v.stdout.trim()).toBe(CLI_VERSION);
    const h = await cli(["exec", "--help", "--lang", "en"]);
    expect(h.code).toBe(0);
    expect(h.stdout).toContain("--output-format");
    expect(h.stdout).toContain("headless: approval required");
  });

  it("exits 2 with a suggestion for typos", { timeout: T }, async () => {
    const r = await cli(["cases", "lst", "--lang", "en"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("Did you mean list?");
    const f = await cli(["exec", "--outptu-format", "json", "--lang", "en"]);
    expect(f.code).toBe(2);
    expect(f.stderr).toContain("--output-format");
    const p = await cli(["exec", "--case", "smzl-lung-adeno", "--lang", "en"]);
    expect(p.code).toBe(2);
  });
});

describe("exec (headless, offline)", () => {
  it("autopilot with --output-format json finishes the case", { timeout: T }, async () => {
    const r = await cli(["exec", "--case", "smzl-lung-adeno", "--autopilot", "--approval", "bypass", "--output-format", "json", "--provider", "offline", "--lang", "en"]);
    expect(r.code, r.stderr).toBe(0);
    const lines = jsonLines(r.stdout);
    expect(lines).toHaveLength(1);
    const result = lines[0] as Record<string, any>;
    expect(result).toMatchObject({ type: "result", subtype: "success", is_error: false, case_id: "smzl-lung-adeno", finished: true, completed: true });
    expect(typeof result.session_id).toBe("string");
    expect(typeof result.result).toBe("string");
    expect(result.assessment.report.score.percent).toBe(100);
    expect(result.usage).toMatchObject({ inputTokens: 0, outputTokens: 0 });
    expect(result.num_turns).toBeGreaterThanOrEqual(1);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("stream-json emits parseable events then the result; default approvals are denied headlessly", { timeout: T }, async () => {
    const r = await cli(["-p", "Work up this patient", "--case", "smzl-lung-adeno", "--autopilot", "--output-format", "stream-json", "--provider", "offline", "--lang", "en"]);
    expect(r.code, r.stderr).toBe(0);
    const lines = jsonLines(r.stdout) as Record<string, any>[];
    const result = lines[lines.length - 1]!;
    expect(result.type).toBe("result");
    expect(result.subtype).toBe("success");
    const events = lines.slice(0, -1) as unknown as AgentEvent[];
    expect(events[0]!.msg.type).toBe("session_configured");
    const seqs = events.map((e) => e.seq);
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs);
    const types = new Set(events.map((e) => e.msg.type));
    for (const t of ["turn_started", "tool_call_begin", "tool_call_end", "clinical_event", "approval_request", "assessment", "shutdown_complete"]) expect(types).toContain(t);
    const resolved = events.flatMap((e) => (e.msg.type === "approval_resolved" ? [e.msg] : []));
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.every((m) => m.decision === "denied" && m.reason === "headless: approval required")).toBe(true);
    // The biopsy order was denied, so the case cannot be completed in default mode.
    expect(result.finished).toBe(false);
  });

  it("exits 3 when --max-turns is exhausted", { timeout: T }, async () => {
    const r = await cli(["exec", "--case", "dka-adult", "--autopilot", "--approval", "bypass", "--max-turns", "1", "--output-format", "json", "--provider", "offline"]);
    expect(r.code).toBe(3);
    expect((jsonLines(r.stdout)[0] as Record<string, unknown>).subtype).toBe("error_max_turns");
  });

  it("answers a single prompt in text mode and records a resumable session", { timeout: T }, async () => {
    const r = await cli(["-p", "Where does it hurt?", "--case", "smzl-lung-adeno", "--lang", "en", "--quiet"]);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout.trim().length).toBeGreaterThan(0);
    const list = await cli(["sessions", "list", "--json"]);
    expect(list.code).toBe(0);
    const sessions = JSON.parse(list.stdout) as { id: string; caseId: string }[];
    expect(sessions.some((s) => s.caseId === "smzl-lung-adeno")).toBe(true);
    const cont = await cli(["-p", "Any fever?", "--continue", "--output-format", "json", "--lang", "en"]);
    expect(cont.code, cont.stderr).toBe(0);
    const result = jsonLines(cont.stdout)[0] as Record<string, unknown>;
    expect(result.session_id).toBe(sessions[0]!.id);
    const show = await cli(["sessions", "show", sessions[0]!.id, "--lang", "en"]);
    expect(show.code).toBe(0);
    expect(show.stdout).toContain("Where does it hurt?");
    expect(show.stdout).toContain("Any fever?");
  });

  it("reads Op JSON lines with --input-format stream-json", { timeout: T }, async () => {
    const input = [JSON.stringify({ type: "slash_command", name: "vitals", args: "" }), JSON.stringify({ type: "user_message", text: "Do you have a fever?" })].join("\n");
    const r = await cli(["exec", "--case", "smzl-lung-adeno", "--input-format", "stream-json", "--output-format", "stream-json", "--ephemeral", "--lang", "en"], { input });
    expect(r.code, r.stderr).toBe(0);
    const lines = jsonLines(r.stdout) as Record<string, any>[];
    expect(lines.some((l) => l.msg?.type === "command_output" && l.msg.name === "vitals")).toBe(true);
    expect(lines.some((l) => l.msg?.type === "agent_message" && l.msg.agent === "patient")).toBe(true);
    expect(lines[lines.length - 1]!.type).toBe("result");
  });
});

describe("play (REPL with piped stdin)", () => {
  it("talks to the patient, runs commands and quits", { timeout: T }, async () => {
    const r = await cli(["play", "smzl-lung-adeno", "--lang", "en", "--ephemeral"], { input: "Do you have a fever?\n/talk nurse\nwhat are the vitals?\n/quit\n" });
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("[patient] › Do you have a fever?");
    expect(r.stdout).toContain("[nurse] › what are the vitals?");
    expect(r.stdout).toMatch(/0\/5/); // status line: progress n/total
    expect(r.stdout).toContain("offline/deterministic");
    expect(r.stdout).not.toMatch(/\u001b\[/); // NO_COLOR + non-TTY
  });

  it("without a case and without a TTY asks for one (usage error)", { timeout: T }, async () => {
    const r = await cli(["play", "--lang", "en"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("smzl-lung-adeno");
  });
});

describe("cases", () => {
  it("validate --all reports every case file", { timeout: T }, async () => {
    const r = await cli(["cases", "validate", "--all", "--lang", "en"]);
    const marks = r.stdout.split("\n").filter((l) => /^[✓✗] /.test(l));
    expect(marks.length).toBeGreaterThanOrEqual(1);
    if (r.code === 0) {
      expect(marks.every((l) => l.startsWith("✓"))).toBe(true);
      expect(r.stdout).toContain("are valid");
    } else {
      // Content is edited concurrently: invalid files must be reported with their issues.
      expect(r.code).toBe(1);
      expect(marks.some((l) => l.startsWith("✗"))).toBe(true);
      expect(r.stdout).toMatch(/error {2}/);
    }
  });

  it("new scaffolds a template case that validates and verifies", { timeout: T }, async () => {
    const dir = join(root, "authoring");
    const r = await cli(["cases", "new", "my-test-case", "--dir", dir, "--lang", "en"]);
    expect(r.code, r.stdout + r.stderr).toBe(0);
    expect(existsSync(join(dir, "my-test-case", "case.json"))).toBe(true);
    expect(readFileSync(join(dir, "my-test-case", "README.md"), "utf8")).toContain("my-test-case");
    const c = JSON.parse(readFileSync(join(dir, "my-test-case", "case.json"), "utf8")) as { title: Record<string, string>; extensions: { testUtterances: unknown[] } };
    expect(Object.keys(c.title).sort()).toEqual(["en", "zh-CN"]);
    expect(c.extensions.testUtterances.length).toBeGreaterThan(0);
    const v = await cli(["cases", "validate", join(dir, "my-test-case"), "--lang", "en"]);
    expect(v.code, v.stdout).toBe(0);
    const again = await cli(["cases", "new", "my-test-case", "--dir", dir]);
    expect(again.code).toBe(1);
    const bad = await cli(["cases", "new", "Bad Id", "--dir", dir]);
    expect(bad.code).toBe(2);
  });

  it("list and show use the requested language and hide the solution", { timeout: T }, async () => {
    const list = await cli(["cases", "list", "--json", "--lang", "en"]);
    expect(list.code).toBe(0);
    const cases = JSON.parse(list.stdout) as { id: string; title: string }[];
    expect(cases.find((c) => c.id === "smzl-lung-adeno")?.title).toMatch(/[A-Za-z]/);
    const zh = await cli(["cases", "list", "--json", "--lang", "zh-CN"]);
    const zhTitle = (JSON.parse(zh.stdout) as { id: string; title: string }[]).find((c) => c.id === "smzl-lung-adeno")?.title ?? "";
    expect(zhTitle).toMatch(/[一-鿿]/);
    const show = await cli(["cases", "show", "smzl-lung-adeno", "--json"]);
    expect(show.code).toBe(0);
    expect(JSON.parse(show.stdout)).not.toHaveProperty("solution");
    const typo = await cli(["cases", "show", "smzl-lung-aden", "--lang", "en"]);
    expect(typo.code).toBe(2);
    expect(typo.stderr).toContain("smzl-lung-adeno");
  });

  it("schema prints the JSON Schema path", { timeout: T }, async () => {
    const r = await cli(["cases", "schema", "case"]);
    expect(r.code).toBe(0);
    expect(existsSync(r.stdout.trim())).toBe(true);
  });
});

describe("providers & config", () => {
  it("providers list never prints secrets", { timeout: T }, async () => {
    const env = { OPENAI_API_KEY: SECRET, ANTHROPIC_API_KEY: SECRET, ZHIPU_API_KEY: SECRET };
    const r = await cli(["providers", "list", "--lang", "en"], { env });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("anthropic");
    expect(r.stdout).toContain("https://api.openai.com/v1");
    expect(r.stdout + r.stderr).not.toContain(SECRET);
    const j = await cli(["providers", "list", "--json"], { env });
    expect(j.stdout).not.toContain(SECRET);
    const rows = JSON.parse(j.stdout) as { id: string; configured: boolean }[];
    expect(rows.find((p) => p.id === "openai")?.configured).toBe(true);
    expect(rows.find((p) => p.id === "xai")?.configured).toBe(false);
  });

  it("config set/get round-trips, redacts secrets and rejects unknown keys", { timeout: T }, async () => {
    const s = await cli(["config", "set", "providers.openai.apiKey", SECRET, "--lang", "en"]);
    expect(s.code, s.stderr).toBe(0);
    expect(s.stdout).not.toContain(SECRET);
    const get = await cli(["config", "get", "providers"]);
    expect(get.stdout).toContain("[redacted]");
    expect(get.stdout).not.toContain(SECRET);
    const list = await cli(["providers", "list", "--json"]);
    expect(list.stdout).not.toContain(SECRET);
    const typo = await cli(["config", "set", "lokale", "en", "--lang", "en"]);
    expect(typo.code).toBe(2);
    expect(typo.stderr).toContain("locale");
    const path = await cli(["config", "path"]);
    expect(path.stdout).toContain(join(home, "settings.json"));
  });
});

describe("import-v4", () => {
  const fx = buildV4Html(2);

  it("installs from a synthetic merged html (SHA mismatch is a warning)", { timeout: T }, async () => {
    const file = join(root, "Virtual_Patient_V4(1).html");
    writeFileSync(file, fx.html);
    const dest = join(root, "assets-html");
    const r = await cli(["import-v4", file, "--dest", dest, "--lang", "en"]);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("anatomy/anatomy.glb.gz");
    expect(r.stdout).toContain("cases/smzl-lung-adeno/fig2.png");
    expect(r.stdout).toMatch(/Copyright/i);
    expect(r.stdout).toMatch(/SHA-256/);
    expect(readFileSync(join(dest, "anatomy/anatomy.glb.gz")).equals(fx.glbGz)).toBe(true);
    expect(readFileSync(join(dest, "cases/smzl-lung-adeno/source_case_report.pdf")).equals(fx.pdf)).toBe(true);
    const manifest = JSON.parse(readFileSync(join(dest, "manifest.json"), "utf8")) as { files: { path: string; sha256: string }[]; source: { verified: boolean } };
    expect(manifest.source.verified).toBe(false);
    expect(manifest.files.map((f) => f.path)).toContain("anatomy/catalog.json");
  });

  it("installs from zip archives holding .part01/.part02 (default destination under CLINICALCRAFT_HOME)", { timeout: T }, async () => {
    const [p1, p2] = splitParts(fx.html, 2);
    const z1 = join(root, "Virtual_Patient_V4_Part1.zip");
    const z2 = join(root, "Virtual_Patient_V4_Part2.zip");
    writeFileSync(z1, writeZip([{ name: "Virtual_Patient_V4(1).html.part01", data: p1! }, { name: "README.txt", data: Buffer.from("merge"), method: 0 }]));
    writeFileSync(z2, writeZip([{ name: "Virtual_Patient_V4(1).html.part02", data: p2!, method: 0 }]));
    const r = await cli(["import-v4", z2, z1, "--lang", "en"]);
    expect(r.code, r.stderr).toBe(0);
    expect(readFileSync(join(home, "assets", "cases/smzl-lung-adeno/fig1.png")).equals(fx.figures[0]!)).toBe(true);
    expect(existsSync(join(home, "assets", "manifest.json"))).toBe(true);
  });

  it("fails with exit 1 on an incomplete input", { timeout: T }, async () => {
    const [p1] = splitParts(fx.html, 2);
    const f = join(root, "lonely.html.part01");
    writeFileSync(f, p1!);
    const r = await cli(["import-v4", f, "--dest", join(root, "assets-bad"), "--lang", "en"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("CASE_DATA");
  });
});

describe("eval", () => {
  it("runs an offline smoke benchmark and writes Markdown + JSON", { timeout: T }, async () => {
    const out = join(root, "eval", "report.md");
    const r = await cli(["eval", "--cases", "smzl-lung-adeno", "--provider", "offline", "--out", out, "--lang", "en"]);
    expect(r.code, r.stderr).toBe(0);
    expect(readFileSync(out, "utf8")).toContain("| `smzl-lung-adeno` |");
    const report = JSON.parse(readFileSync(join(root, "eval", "report.json"), "utf8")) as { summary: { runs: number; finished: number; errors: number } };
    expect(report.summary).toMatchObject({ runs: 1, finished: 1, errors: 0 });
  });
});
