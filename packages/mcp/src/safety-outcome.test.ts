/**
 * Orders as written and the safety outcome over MCP (audit 2026-11-12 P0-2 / P0-3, docs/PROTOCOL.md §3.2): an
 * `intervene` whose dose differs from the dose prepared is read back by the nurse and not given; an equivalent dose
 * in other units is given; the state resource keeps the dose error; `get_debrief` shows the safety outcome beside the
 * score; the transcript resource's assessment carries it.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings, type ResolvedSettings } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { caseHandle } from "./format.js";
import { LineSplitter, type JsonRpcResponse } from "./jsonrpc.js";
import { runMcpServer } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-safety-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();
const ana = content.cases.get("anaphylaxis-garden")?.def;
const preset = ana?.interventions.find((i) => i.id === "adrenaline-im")?.doseSpec;

type ToolResult = { content: { type: string; text: string }[]; structuredContent?: Record<string, any>; isError?: boolean };

/** A client on the server's stdio (in-memory streams). */
class Client {
  readonly input = new PassThrough();
  readonly output = new PassThrough();
  readonly done: Promise<{ sessions: number }>;
  private id = 1;
  private readonly waiting = new Map<number, (r: JsonRpcResponse) => void>();

  constructor(settings: ResolvedSettings) {
    const dir = mkdtempSync(join(root, "p-"));
    const home = join(dir, "home");
    const cwd = join(dir, "project");
    mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
    mkdirSync(home, { recursive: true });
    const splitter = new LineSplitter();
    this.output.on("data", (chunk: Buffer) => {
      for (const line of splitter.push(chunk)) {
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (typeof msg.id === "number") this.waiting.get(msg.id)?.(msg);
      }
    });
    this.done = runMcpServer({ input: this.input, output: this.output, settings, env: { CLINICALCRAFT_HOME: home, HOME: home }, cwd, content, log: () => undefined });
  }

  static async start(settings: ResolvedSettings): Promise<Client> {
    const c = new Client(settings);
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    return c;
  }

  async request<T = any>(method: string, params?: unknown): Promise<T> {
    const id = this.id++;
    const reply = new Promise<JsonRpcResponse>((resolve) => this.waiting.set(id, resolve));
    this.input.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) })}\n`);
    const r = await reply;
    if ("error" in r) throw new Error(`${method}: ${r.error.message}`);
    return r.result as T;
  }

  call(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.request<ToolResult>("tools/call", { name, arguments: args });
  }

  async resource(session: string, kind: "state" | "transcript"): Promise<any> {
    const r = await this.request<{ contents: { text: string }[] }>("resources/read", { uri: `clinicalcraft://session/${session}/${kind}` });
    return JSON.parse(r.contents[0]!.text);
  }

  async end(): Promise<void> {
    this.input.end();
    await this.done;
  }
}

const settings = (patch: Record<string, unknown> = {}) => mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false }, ...patch } }]);

describe("MCP: a written dose is checked, and the debrief shows the safety outcome", () => {
  it("5 mg is read back and not given; 500 micrograms is given; get_debrief and the resources show the dose error", async () => {
    expect(preset).toEqual({ amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" });
    const c = await Client.start(settings({ approvalMode: "auto" }));
    const session = (await c.call("start_case", { case_id: caseHandle("anaphylaxis-garden"), embodied: false })).structuredContent!.session_id as string;

    const wrong = await c.call("intervene", { session_id: session, query: "IM adrenaline 5 mg" });
    expect(wrong.isError).toBe(true);
    expect(wrong.content[0]!.text).toMatch(/^Nurse: “Before I give .*you ordered 5 mg IM; the dose for this is 0\.3–0\.5 mg IM\. Can you confirm the dose\?”\nNot given: /);
    expect(wrong.structuredContent!.data).toMatchObject({ given: false, doseError: { text: "IM adrenaline 5 mg", ratio: 10, severity: "critical" } });

    let state = await c.resource(session, "state");
    expect(state.state.interventions).toEqual([]);
    expect(state.state.doseErrors).toEqual([expect.objectContaining({ interventionId: "adrenaline-im", text: "IM adrenaline 5 mg", ordered: { amount: 5, unit: "mg", route: "IM" } })]);

    const right = await c.call("intervene", { session_id: session, intervention_id: "adrenaline-im", dose: "500 micrograms IM" });
    expect(right.isError).toBeUndefined();
    expect(right.content[0]!.text).toContain("Dose checked: 500 micrograms IM as ordered is the preset dose (0.3–0.5 mg IM).");
    state = await c.resource(session, "state");
    expect(state.state.interventions).toEqual([expect.objectContaining({ interventionId: "adrenaline-im", ordered: { text: "500 micrograms IM", dose: { amount: 500, unit: "microgram", route: "IM" } } })]);

    const debrief = await c.call("get_debrief", { session_id: session });
    const lines = debrief.content[0]!.text.split("\n");
    const score = lines.findIndex((l) => l.startsWith("Score "));
    expect(lines[score + 1]).toBe("Safety: not passed — critical dose errors: 1");
    expect(lines[score + 2]).toMatch(/^⚠ Critical dose error: .* — as ordered “IM adrenaline 5 mg”, read as 5 mg IM; preset dose 0\.3–0\.5 mg IM — 10 times the top of the preset range; not given \(minute \d+\)$/);
    expect(debrief.structuredContent!.report.safety.passed).toBe(false);

    const transcript = await c.resource(session, "transcript");
    const assessed = transcript.events.filter((e: { type: string }) => e.type === "assessment").at(-1);
    expect(assessed.safety).toMatchObject({ passed: false, criticalFailures: [], doseErrors: [expect.objectContaining({ severity: "critical", ratio: 10 })] });
    await c.end();
  });
});
