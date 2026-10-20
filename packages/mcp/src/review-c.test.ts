/**
 * MCP follow-ups: `list_cases` and `clinicalcraft://cases` use the CLI's
 * deterministic library order with opaque handles (C5); stderr diagnostics
 * are terminal-sanitised (C6).
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { libraryOrder, mergeSettings } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { caseHandle } from "./format.js";
import { LineSplitter, type JsonRpcResponse } from "./jsonrpc.js";
import { McpServer, runMcpServer, safeLog } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-c-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();
const ESC = "\u001b";

function project() {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  mkdirSync(home, { recursive: true });
  return { cwd, env: { CLINICALCRAFT_HOME: home, HOME: home } };
}

function server(log: string[]): McpServer {
  const p = project();
  return new McpServer({ settings: mergeSettings([{ source: "flag", settings: { locale: "en" } }]), env: p.env, cwd: p.cwd, content, log: (m) => log.push(m) });
}

async function call(s: McpServer, method: string, params?: unknown): Promise<any> {
  const r = (await s.handle({ jsonrpc: "2.0", id: 1, method, ...(params !== undefined ? { params } : {}) })) as JsonRpcResponse;
  if ("error" in r) throw new Error(r.error.message);
  return r.result;
}

describe("list_cases order (C5)", () => {
  it("lists opaque handles in the CLI's library order, whatever the locale; the cases resource agrees", async () => {
    const log: string[] = [];
    const s = server(log);
    await call(s, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const expected = libraryOrder([...content.cases.values()].map((e) => e.def)).map((c) => caseHandle(c.id));
    expect(expected.length).toBeGreaterThan(1);
    for (const locale of ["en", "zh-CN"]) {
      const listed = await call(s, "tools/call", { name: "list_cases", arguments: { locale } });
      expect(listed.structuredContent.cases.map((c: { id: string }) => c.id)).toEqual(expected);
      // The text lists them in the same order.
      const text: string = listed.content[0].text;
      const positions = expected.map((h) => text.indexOf(h));
      expect(positions.every((p) => p >= 0)).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      for (const id of content.cases.keys()) expect(JSON.stringify(listed)).not.toContain(id);
    }
    const resource = await call(s, "resources/read", { uri: "clinicalcraft://cases" });
    expect(JSON.parse(resource.contents[0].text).cases.map((c: { id: string }) => c.id)).toEqual(expected);
    await s.close();
  });
});

describe("stderr diagnostics are terminal-safe (C6)", () => {
  it("safeLog strips escape sequences and control characters, keeping newlines", () => {
    const seen: string[] = [];
    safeLog((m) => seen.push(m))(`a${ESC}[31mred${ESC}]52;c;cm0=\u0007b\u0000\nnext\tline`);
    expect(seen).toEqual(["aredb\nnext\tline"]);
  });

  it("a client name with escape sequences is logged without them (McpServer and runMcpServer)", async () => {
    const log: string[] = [];
    const s = server(log);
    await call(s, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: `evil${ESC}]0;owned\u0007${ESC}[2J`, version: "1" } });
    expect(log.some((l) => l.includes("initialize from evil"))).toBe(true);
    expect(log.join("\n")).not.toContain(ESC);
    expect(log.join("\n")).not.toContain("\u0007");
    await s.close();

    const p = project();
    const input = new PassThrough();
    const output = new PassThrough();
    const lines: string[] = [];
    const splitter = new LineSplitter();
    output.on("data", (chunk: Buffer) => lines.push(...splitter.push(chunk)));
    const runLog: string[] = [];
    const done = runMcpServer({ input, output, settings: mergeSettings([]), env: p.env, cwd: p.cwd, content, log: (m) => runLog.push(m) });
    input.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: `x${ESC}[31my`, version: "1" } } })}\n`);
    input.end();
    await done;
    expect(runLog.join("\n")).toContain("initialize from xy");
    expect(runLog.join("\n")).not.toContain(ESC);
    expect(lines.length).toBeGreaterThan(0);
  });
});
