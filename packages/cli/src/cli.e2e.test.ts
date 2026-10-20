/**
 * End-to-end tests: spawn the real CLI (`tsx packages/cli/src/bin.ts`, the
 * workspace packages resolved from source via tsconfig.source.json) with an
 * isolated CLINICALCRAFT_HOME / HOME and a scratch working directory.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, it } from "vitest";
import type { AgentEvent } from "@clinicalcraft/agent";
import { buildV4Html, splitParts, writeZip } from "./__fixtures__/v4.js";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const BIN = join(REPO, "packages/cli/src/bin.ts");
const TSX = join(REPO, "node_modules/.bin/tsx");
/**
 * tsx's loader, for running the CLI in ONE node process. The `tsx` command relays a signal to its child and
 * SIGKILLs it (exit 130) when the child does not acknowledge within 30 ms — a busy machine turns a graceful
 * SIGINT into a force kill — so tests that stop the CLI with a signal bypass it.
 */
const TSX_LOADER = join(REPO, "node_modules/tsx/dist/loader.mjs");
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

/** A separate ClinicalCraft home for tests that depend on recorded state. */
function freshHome(name: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface CliOptions {
  input?: string;
  env?: Record<string, string>;
  cwd?: string;
  /** Interactive: called for every stdout line; stdin stays open until the callback ends it. */
  onLine?: (line: string, stdin: NodeJS.WritableStream, child: ChildProcess) => void;
  /** The test stops the CLI with a signal: run it in one node process (see `TSX_LOADER`). */
  signals?: boolean;
}

/** Run the CLI; `input` (if any) is written to stdin, which is then closed (unless `onLine`). */
function cli(args: string[], opts: CliOptions = {}): Promise<RunResult> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || /_API_KEY$/.test(k) || k.startsWith("CLINICALCRAFT_") || k === "FORCE_COLOR") continue;
    env[k] = v;
  }
  Object.assign(env, { CLINICALCRAFT_HOME: home, HOME: home, TSX_TSCONFIG_PATH: SOURCE_TSCONFIG, NO_COLOR: "1" }, opts.env ?? {});
  return new Promise((resolve, reject) => {
    const [cmd, argv] =
      opts.signals && existsSync(TSX_LOADER)
        ? [process.execPath, ["--import", pathToFileURL(TSX_LOADER).href, BIN, ...args]]
        : existsSync(TSX)
          ? [TSX, [BIN, ...args]]
          : ["npx", ["tsx", BIN, ...args]];
    const child = spawn(cmd, argv, { cwd: opts.cwd ?? work, env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let pendingLine = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => {
      stdout += d;
      if (!opts.onLine) return;
      pendingLine += d;
      const lines = pendingLine.split("\n");
      pendingLine = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) opts.onLine(line, child.stdin, child);
    });
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    if (opts.input !== undefined) {
      if (opts.onLine) child.stdin.write(opts.input);
      else child.stdin.end(opts.input);
    } else if (!opts.onLine) child.stdin.end();
  });
}

function jsonLines(text: string): unknown[] {
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as unknown);
}

describe.concurrent("global", () => {
  it("prints the version and help", { timeout: T }, async ({ expect }) => {
    const v = await cli(["--version"]);
    expect(v.code).toBe(0);
    expect(v.stdout.trim()).toBe(CLI_VERSION);
    const h = await cli(["exec", "--help", "--lang", "en"]);
    expect(h.code).toBe(0);
    expect(h.stdout).toContain("--output-format");
    expect(h.stdout).toContain("headless: approval required");
  });

  it("exits 2 with a suggestion for typos", { timeout: T }, async ({ expect }) => {
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

describe.concurrent("exec (headless, offline)", () => {
  it("autopilot with --output-format json finishes the case", { timeout: T }, async ({ expect }) => {
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

  it("stream-json emits parseable events then the result; default approvals are denied headlessly", { timeout: T }, async ({ expect }) => {
    const r = await cli(["-p", "Work up this patient", "--case", "smzl-lung-adeno", "--autopilot", "--output-format", "stream-json", "--provider", "offline", "--lang", "en"]);
    // The denied biopsy leaves objectives open: an incomplete autopilot is not a success (exit 4).
    expect(r.code, r.stderr).toBe(4);
    const lines = jsonLines(r.stdout) as Record<string, any>[];
    const result = lines[lines.length - 1]!;
    expect(result.type).toBe("result");
    expect(result).toMatchObject({ subtype: "error_incomplete", is_error: true, completed: false });
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
    expect(result.permission_denials).toContainEqual({ tool: "order_test", reason: "headless: approval required" });
    expect(result.errors).toEqual([]);
  });

  it("a stream-json client answers approval requests itself", { timeout: T }, async ({ expect }) => {
    const answered: string[] = [];
    const r = await cli(["exec", "--case", "smzl-lung-adeno", "--approval", "strict", "--input-format", "stream-json", "--output-format", "stream-json", "--ephemeral", "--lang", "en"], {
      input: `${JSON.stringify({ type: "slash_command", name: "order", args: "cbc" })}\n`,
      onLine: (line, stdin) => {
        const event = JSON.parse(line) as AgentEvent;
        if (event.msg?.type === "approval_request") {
          answered.push(event.msg.requestId);
          stdin.write(`${JSON.stringify({ type: "approval_response", requestId: event.msg.requestId, decision: "approved" })}\n`);
        }
        if (event.msg?.type === "command_output" && event.msg.name === "order") stdin.end();
      },
    });
    expect(r.code, r.stderr).toBe(0);
    expect(answered).toHaveLength(1);
    const lines = jsonLines(r.stdout) as Record<string, any>[];
    expect(lines.find((l) => l.msg?.type === "approval_resolved")?.msg.decision).toBe("approved");
    const result = lines[lines.length - 1]!;
    expect(result).toMatchObject({ type: "result", subtype: "success", permission_denials: [] });
  });

  it("exits 3 when --max-turns is exhausted", { timeout: T }, async ({ expect }) => {
    const r = await cli(["exec", "--case", "dka-adult", "--autopilot", "--approval", "bypass", "--max-turns", "1", "--output-format", "json", "--provider", "offline"]);
    expect(r.code).toBe(3);
    expect((jsonLines(r.stdout)[0] as Record<string, unknown>).subtype).toBe("error_max_turns");
  });

  it("answers a single prompt in text mode and records a resumable session", { timeout: T }, async ({ expect }) => {
    const env = { CLINICALCRAFT_HOME: freshHome("home-sessions") };
    const r = await cli(["-p", "Where does it hurt?", "--case", "smzl-lung-adeno", "--lang", "en", "--quiet"], { env });
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout.trim().length).toBeGreaterThan(0);
    const list = await cli(["sessions", "list", "--json"], { env });
    expect(list.code).toBe(0);
    const sessions = JSON.parse(list.stdout) as { id: string; caseId: string }[];
    expect(sessions.some((s) => s.caseId === "smzl-lung-adeno")).toBe(true);
    const cont = await cli(["-p", "Any fever?", "--continue", "--output-format", "json", "--lang", "en"], { env });
    expect(cont.code, cont.stderr).toBe(0);
    const result = jsonLines(cont.stdout)[0] as Record<string, unknown>;
    expect(result.session_id).toBe(sessions[0]!.id);
    const show = await cli(["sessions", "show", sessions[0]!.id, "--lang", "en"], { env });
    expect(show.code).toBe(0);
    expect(show.stdout).toContain("Where does it hurt?");
    expect(show.stdout).toContain("Any fever?");
  });

  it("reads Op JSON lines with --input-format stream-json", { timeout: T }, async ({ expect }) => {
    const input = [JSON.stringify({ type: "slash_command", name: "vitals", args: "" }), JSON.stringify({ type: "user_message", text: "Do you have a fever?" })].join("\n");
    const r = await cli(["exec", "--case", "smzl-lung-adeno", "--input-format", "stream-json", "--output-format", "stream-json", "--ephemeral", "--lang", "en"], { input });
    expect(r.code, r.stderr).toBe(0);
    const lines = jsonLines(r.stdout) as Record<string, any>[];
    expect(lines.some((l) => l.msg?.type === "command_output" && l.msg.name === "vitals")).toBe(true);
    expect(lines.some((l) => l.msg?.type === "agent_message" && l.msg.agent === "patient")).toBe(true);
    expect(lines[lines.length - 1]!.type).toBe("result");
  });
});

describe.concurrent("play (REPL with piped stdin)", () => {
  it("talks to the patient, runs commands and quits", { timeout: T }, async ({ expect }) => {
    const r = await cli(["play", "smzl-lung-adeno", "--lang", "en", "--ephemeral"], { input: "Do you have a fever?\n/talk nurse\nwhat are the vitals?\n/quit\n" });
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("[patient] › Do you have a fever?");
    expect(r.stdout).toContain("[nurse] › what are the vitals?");
    expect(r.stdout).toMatch(/0\/5/); // status line: progress n/total
    expect(r.stdout).toContain("offline/deterministic");
    expect(r.stdout).not.toMatch(/\u001b\[/); // NO_COLOR + non-TTY
  });

  it("answers approval prompts from piped lines in order", { timeout: T }, async ({ expect }) => {
    const input = "/order cbc\nmaybe\nn (not needed)\n/order cbc\ns\n/quit\n";
    const r = await cli(["play", "smzl-lung-adeno", "--approval", "strict", "--lang", "en", "--ephemeral"], { input });
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("[y]es / [s]ession / [n]o (reason) / [a]bort");
    expect(r.stdout).toContain("→ denied (not needed)");
    expect(r.stdout).toContain("→ approved for this session");
    expect(r.stdout).toMatch(/Ordered .*blood count/i);
  });

  it("without a case and without a TTY asks for one (usage error)", { timeout: T }, async ({ expect }) => {
    const r = await cli(["play", "--lang", "en"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("smzl-lung-adeno");
  });
});

describe.concurrent("cases", () => {
  it("validate --all reports every case file", { timeout: T }, async ({ expect }) => {
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

  it("new scaffolds a template case that validates and verifies", { timeout: T }, async ({ expect }) => {
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

  it("list and show use the requested language and hide the solution", { timeout: T }, async ({ expect }) => {
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

  it("schema prints the JSON Schema path", { timeout: T }, async ({ expect }) => {
    const r = await cli(["cases", "schema", "case"]);
    expect(r.code).toBe(0);
    expect(existsSync(r.stdout.trim())).toBe(true);
  });
});

describe.concurrent("providers & config", () => {
  it("providers test / models talk to an OpenAI-compatible endpoint without printing the key", { timeout: T }, async ({ expect }) => {
    const seen: { url: string; auth: string | undefined }[] = [];
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (d: Buffer) => (body += d.toString()));
      req.on("end", () => {
        seen.push({ url: req.url ?? "", auth: req.headers.authorization });
        if (req.url?.endsWith("/models")) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ data: [{ id: "fake-model-b" }, { id: "fake-model-a" }] }));
          return;
        }
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "OK" } }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 11, completion_tokens: 1 } })}\n\n`);
        res.end("data: [DONE]\n\n");
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
      const env = { OPENAI_API_KEY: SECRET };
      const t = await cli(["providers", "test", "openai", "--base-url", base, "--model", "fake-model-a", "--lang", "en"], { env });
      expect(t.code, t.stderr).toBe(0);
      expect(t.stdout).toContain("replied: OK");
      expect(t.stdout).toMatch(/tokens in 11 \/ out 1/);
      expect(t.stdout + t.stderr).not.toContain(SECRET);
      const models = await cli(["providers", "models", "openai", "--base-url", base, "--json"], { env });
      expect(models.code, models.stderr).toBe(0);
      expect(JSON.parse(models.stdout)).toEqual(["fake-model-a", "fake-model-b"]);
      expect(seen.every((r) => r.auth === `Bearer ${SECRET}`)).toBe(true);
      const nokey = await cli(["providers", "test", "openai", "--base-url", base, "--lang", "en"]);
      expect(nokey.code).toBe(1);
      expect(nokey.stderr).toContain("OPENAI_API_KEY");
    } finally {
      server.close();
    }
  });

  it("providers list never prints secrets", { timeout: T }, async ({ expect }) => {
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

  it("config set/get round-trips, redacts secrets and rejects unknown keys", { timeout: T }, async ({ expect }) => {
    const cfgHome = freshHome("home-config");
    const env = { CLINICALCRAFT_HOME: cfgHome };
    const s = await cli(["config", "set", "providers.openai.apiKey", SECRET, "--lang", "en"], { env });
    expect(s.code, s.stderr).toBe(0);
    expect(s.stdout).not.toContain(SECRET);
    const get = await cli(["config", "get", "providers"], { env });
    expect(get.stdout).toContain("[redacted]");
    expect(get.stdout).not.toContain(SECRET);
    const list = await cli(["providers", "list", "--json"], { env });
    expect(list.stdout).not.toContain(SECRET);
    expect((JSON.parse(list.stdout) as { id: string; configured: boolean }[]).find((p) => p.id === "openai")?.configured).toBe(true);
    const lang = await cli(["config", "set", "locale", "en"], { env });
    expect(lang.code).toBe(0);
    expect((await cli(["config", "get", "locale"], { env })).stdout.trim()).toBe("en");
    const typo = await cli(["config", "set", "lokale", "en", "--lang", "en"], { env });
    expect(typo.code).toBe(2);
    expect(typo.stderr).toContain("locale");
    const path = await cli(["config", "path"], { env });
    expect(path.stdout).toContain(join(cfgHome, "settings.json"));
  });
});

describe.concurrent("import-v4", () => {
  const fx = buildV4Html(2);

  it("installs from a synthetic merged html (SHA mismatch is a warning)", { timeout: T }, async ({ expect }) => {
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

  it("installs from zip archives holding .part01/.part02 (default destination under CLINICALCRAFT_HOME)", { timeout: T }, async ({ expect }) => {
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

  it("fails with exit 1 on an incomplete input", { timeout: T }, async ({ expect }) => {
    const [p1] = splitParts(fx.html, 2);
    const f = join(root, "lonely.html.part01");
    writeFileSync(f, p1!);
    const r = await cli(["import-v4", f, "--dest", join(root, "assets-bad"), "--lang", "en"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("the V4 case data was not found");
  });
});

describe.concurrent("serve & mcp", () => {
  it("serve starts the HTTP server on loopback and stops on SIGINT", { timeout: T }, async ({ expect }) => {
    let health: unknown = null;
    const r = await cli(["serve", "--port", "0", "--lang", "en"], {
      signals: true,
      onLine: (line, stdin, child) => {
        const url = /(http:\/\/127\.0\.0\.1:\d+\/)/.exec(line)?.[1];
        if (!url) return;
        void fetch(`${url}api/health`)
          .then((res) => res.json())
          .then((body) => (health = body))
          .catch((err: Error) => (health = { error: err.message }))
          .finally(() => {
            stdin.end();
            child.kill("SIGINT");
          });
      },
    });
    if (/not available/.test(r.stderr)) {
      // @clinicalcraft/server not built/implemented in this checkout: reported clearly.
      expect(r.code).toBe(1);
      return;
    }
    expect(r.code, r.stderr).toBe(0);
    expect(health).toMatchObject({ status: "ok" });
  });

  for (const source of ["flag", "env", "file"] as const) {
  it(`serve takes the token from --token, CLINICALCRAFT_SERVER_TOKEN or --token-file (${source}); --lang sets the server's default language`, { timeout: T }, async ({ expect }) => {
    let health: { status?: number; body?: Record<string, unknown> } = {};
    let lines = "";
    const token = "tok-0123456789abcdef";
    const tokenFile = join(work, `serve-token-${source}.txt`);
    writeFileSync(tokenFile, `${token}\n`);
    const args = source === "flag" ? ["--token", token] : source === "file" ? ["--token-file", tokenFile] : [];
    const r = await cli(["serve", "--port", "0", "--lang", "en", ...args], {
      ...(source === "env" ? { env: { CLINICALCRAFT_SERVER_TOKEN: token } } : {}),
      signals: true,
      onLine: (line, stdin, child) => {
        lines += `${line}\n`;
        const url = /(http:\/\/127\.0\.0\.1:\d+\/)/.exec(line)?.[1];
        if (!url || health.status !== undefined) return;
        health.status = 0;
        void (async () => {
          const denied = await fetch(`${url}api/health`);
          const ok = await fetch(`${url}api/health`, { headers: { authorization: `Bearer ${token}` } });
          health = { status: denied.status, body: (await ok.json()) as Record<string, unknown> };
        })()
          .catch(() => undefined)
          .finally(() => {
            setTimeout(() => {
              stdin.end();
              child.kill("SIGINT");
            }, 200);
          });
      },
    });
    if (/not available/.test(r.stderr)) {
      expect(r.code).toBe(1);
      return;
    }
    expect(r.code, r.stderr).toBe(0);
    expect(health.status).toBe(401);
    expect(health.body).toMatchObject({ status: "ok", locale: "en", auth: true });
    expect(lines).toMatch(/http:\/\/127\.0\.0\.1:\d+\/\?token=<token>/);
    expect(r.stdout).not.toContain(token);
    expect(r.stderr).not.toContain(token);
    // A token on the command line is visible to every user in the process list: say so.
    if (source === "flag") expect(r.stderr).toMatch(/process list/);
    else expect(r.stderr).not.toMatch(/process list/);
  });
  }

  it("serve refuses a non-loopback host without a token", { timeout: T }, async ({ expect }) => {
    const r = await cli(["serve", "--host", "0.0.0.0", "--lang", "en"]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("--token");
  });

  it("mcp speaks JSON-RPC on stdio (or reports that the package is unavailable)", { timeout: T }, async ({ expect }) => {
    const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } } };
    const replies: unknown[] = [];
    const r = await cli(["mcp", "--lang", "en"], {
      input: `${JSON.stringify(init)}\n`,
      onLine: (line, stdin) => {
        replies.push(JSON.parse(line));
        stdin.end();
      },
    });
    if (/not available/.test(r.stderr)) {
      expect(r.code).toBe(1);
      expect(r.stdout).toBe(""); // stdout is reserved for JSON-RPC
      return;
    }
    expect(replies[0]).toMatchObject({ jsonrpc: "2.0", id: 1 });
  });

  it("mcp embodied smoke over stdio: start_case {embodied}, a spatial refusal with hint.goal, navigate_to, the tool again", { timeout: T }, async ({ expect }) => {
    // Each request is sent when the previous reply arrived (some depend on it).
    const steps: ((last: Record<string, any> | null) => Record<string, unknown> | null)[] = [
      () => ({ method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "0" } } }),
      () => ({ method: "tools/list" }),
      () => ({ method: "tools/call", params: { name: "start_case", arguments: { case_id: "stemi-inferior-rv", embodied: true } } }),
      () => ({ method: "tools/call", params: { name: "examine", arguments: { session_id: session, finding_id: "general" } } }),
      (last) => ({ method: "tools/call", params: { name: "navigate_to", arguments: { session_id: session, goal: last?.result?.structuredContent?.data?.hint?.goal } } }),
      () => ({ method: "tools/call", params: { name: "examine", arguments: { session_id: session, finding_id: "general" } } }),
      () => ({ method: "tools/call", params: { name: "observe_world", arguments: { session_id: session } } }),
      () => null,
    ];
    let session = "";
    const replies: Record<string, any>[] = [];
    const send = (stdin: NodeJS.WritableStream, last: Record<string, any> | null) => {
      const next = steps[replies.length]!(last);
      if (!next) return void stdin.end();
      stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: replies.length + 1, ...next })}\n`);
    };
    const first = steps[0]!(null)!;
    const r = await cli(["mcp", "--lang", "en", "--provider", "offline"], {
      env: { CLINICALCRAFT_HOME: freshHome("mcp-embodied") },
      input: `${JSON.stringify({ jsonrpc: "2.0", id: 1, ...first })}\n`,
      onLine: (line, stdin) => {
        const reply = JSON.parse(line) as Record<string, any>;
        replies.push(reply);
        if (replies.length === 3) session = reply.result?.structuredContent?.session_id ?? "";
        send(stdin, reply);
      },
    });
    if (/not available/.test(r.stderr)) return; // the MCP package is optional in a CLI install
    expect(replies.map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const names = (replies[1]!.result.tools as { name: string }[]).map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["start_case", "examine", "observe_world", "navigate_to", "interact_object", "delegate_task", "execute_skill"]));
    expect(replies[2]!.result.structuredContent).toMatchObject({ embodiment: "embodied" });
    expect(replies[3]!.result).toMatchObject({ isError: true, structuredContent: { data: { code: "SPATIAL_REQUIREMENT_UNMET", hint: { goal: { kind: "interact" } } } } });
    expect(replies[4]!.result.isError).toBeUndefined();
    expect(replies[5]!.result.isError).toBeUndefined();
    expect(replies[6]!.result.content[0].text).toMatch(/You are in/);
    // stdout carried JSON-RPC only.
    for (const line of r.stdout.split("\n").filter(Boolean)) expect(() => JSON.parse(line)).not.toThrow();
  });
});

describe.concurrent("eval", () => {
  it("runs an offline smoke benchmark and writes Markdown + JSON", { timeout: T }, async ({ expect }) => {
    const out = join(root, "eval", "report.md");
    const r = await cli(["eval", "--cases", "smzl-lung-adeno", "--provider", "offline", "--out", out, "--lang", "en"]);
    expect(r.code, r.stderr).toBe(0);
    expect(readFileSync(out, "utf8")).toContain("| `smzl-lung-adeno` |");
    const report = JSON.parse(readFileSync(join(root, "eval", "report.json"), "utf8")) as { summary: { runs: number; finished: number; errors: number } };
    expect(report.summary).toMatchObject({ runs: 1, finished: 1, errors: 0 });
  });
});
