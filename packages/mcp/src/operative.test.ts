/**
 * External agents can operate (MCP, docs/PROCEDURE.md §7, PROTOCOL §3.1): a case with an operation lists
 * `observe_field` and `operate` with annotations, `start_case` says how the operation is done, the tools answer
 * what still opens it before the Time Out, a step is carried out once it is under way, a high-risk step (a
 * bail-out) follows the two-step confirmation, and `consult {staff}` names its recipient. The bridge's tool list
 * carries them too.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { BRIDGE_TOOLS, mergeSettings, type ResolvedSettings } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { parseCase } from "@clinicalcraft/core";
import { LAP_CHOLE_SIT } from "../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { attachTools } from "./attach.js";
import { caseHandle } from "./format.js";
import { LineSplitter, type JsonRpcResponse } from "./jsonrpc.js";
import { runMcpServer } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-operative-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const L = (en: string) => ({ en, "zh-CN": en });

function theatreCase() {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.id = "mcp-lap-chole";
  raw.phases = [
    { id: "theatre", label: L("Theatre") },
    { id: "operation", label: L("Laparoscopic cholecystectomy"), learnerSwitchable: false, enterWhen: { intervened: "time-out", valid: true } },
  ];
  raw.procedure.phases = ["operation"];
  raw.interventions = [
    { id: "sign-in", name: L("WHO Sign In"), kind: "consult", checklist: true, maxDoses: 1 },
    { id: "time-out", name: L("WHO Time Out"), kind: "consult", checklist: true, maxDoses: 1, contraindicatedWhen: { not: { intervened: "sign-in", valid: true } }, harm: L("Out of order.") },
  ];
  raw.npcs = [{ role: "consultant", name: L("Anaesthetist"), knowledge: L("Runs the anaesthetic.") }];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

/** The same theatre case with a new investigation the hospital can do (a blood count: a sample, 30 minutes). */
function studiesCase() {
  const raw = structuredClone(theatreCase()) as unknown as Record<string, any>;
  raw.id = "mcp-lap-chole-studies";
  raw.clock = { mode: "simulated", startTime: "08:00", actionCosts: { ask: 1, examine: 1, order: 1, read: 1, intervene: 0, answer: 0 } };
  raw.studies = [
    {
      code: "cbc-new",
      name: L("Blood count"),
      aliases: { en: ["FBC", "CBC"], "zh-CN": ["血常规"] },
      acquisition: "sample",
      turnaroundMinutes: 30,
      model: { kind: "lab", analytes: [{ id: "hb", name: L("Haemoglobin"), unit: "g/dL", low: 13, high: 17, base: 14, spread: 0, decimals: 1 }] },
    },
  ];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

const builtin = await loadContent();
const operative = theatreCase();
const withStudies = studiesCase();
const content = {
  ...builtin,
  cases: new Map([...builtin.cases, [operative.id, { def: operative, dir: root, file: join(root, "case.json") }], [withStudies.id, { def: withStudies, dir: root, file: join(root, "case-studies.json") }]]),
};
const CASE = caseHandle(operative.id);

type ToolResult = { content: { type: string; text: string }[]; structuredContent?: Record<string, any>; isError?: boolean };

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

  async request<T = any>(method: string, params?: unknown): Promise<T> {
    const id = this.id++;
    const reply = new Promise<JsonRpcResponse>((resolve) => this.waiting.set(id, resolve));
    this.input.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) })}\n`);
    const r = await reply;
    if ("error" in r) throw new Error(`${method}: ${r.error.message}`);
    return r.result as T;
  }

  call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    return this.request<ToolResult>("tools/call", { name, arguments: args });
  }

  async close(): Promise<void> {
    this.input.end();
    await this.done;
  }
}

const text = (r: ToolResult) => r.content.map((c) => c.text).join("\n");

describe("MCP: external agents operate", () => {
  it("lists the operative tools, says how the operation is done, and carries it out step by step (high-risk steps confirmed)", async () => {
    const c = new Client(mergeSettings([{ source: "flag", settings: { locale: "en", approvalMode: "default" } }]));
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    const tools = (await c.request<{ tools: { name: string; annotations: Record<string, unknown>; description: string }[] }>("tools/list")).tools;
    const byName = new Map(tools.map((t) => [t.name, t]));
    expect(byName.get("observe_field")?.annotations).toMatchObject({ title: "Look at the operative field", readOnlyHint: true });
    expect(byName.get("operate")?.annotations).toMatchObject({ title: "Operative step", destructiveHint: true });
    expect(byName.get("operate")?.description).toMatch(/Only in a case with an operation/);

    const started = await c.call("start_case", { case_id: CASE });
    expect(started.isError).not.toBe(true);
    expect(text(started)).toMatch(/This case has an operation \(Laparoscopic cholecystectomy\)\. It is not an intervention/);
    expect(started.structuredContent?.operation).toBe(true);
    const session_id = started.structuredContent!.session_id as string;

    // before the Time Out: what still opens it, never a bare "locked"
    expect(text(await c.call("observe_field", { session_id }))).toMatch(/^Operation: not under way in this phase[\s\S]*WHO Time Out/);
    const asked = await c.call("intervene", { session_id, query: "laparoscopic cholecystectomy" });
    expect(text(asked)).toMatch(/is the operation itself, not an intervention/);
    for (const id of ["sign-in", "time-out"]) expect((await c.call("intervene", { session_id, intervention_id: id })).isError, id).not.toBe(true);
    expect(text(await c.call("case_status", { session_id }))).toMatch(/Operation under way: no port plan yet/);

    // a step, then the field
    const plan = await c.call("operate", { session_id, op: "plan-ports", plan: "three-port-left" });
    expect(plan.isError, text(plan)).not.toBe(true);
    expect(text(await c.call("observe_field", { session_id }))).toMatch(/^Port plan three-port-left/);

    // a high-risk step needs the person's confirmation: refused first, carried out on the confirmed repeat
    const bail = await c.call("operate", { session_id, op: "bailout", strategy: "call-help" });
    expect(bail.isError).toBe(true);
    expect(bail.structuredContent?.refused).toMatchObject({ reason: "ask", confirm: "required" });
    const confirmed = await c.call("operate", { session_id, op: "bailout", strategy: "call-help", confirm: true });
    expect(confirmed.isError, text(confirmed)).not.toBe(true);

    // a named colleague answers as themselves (the recipient first)
    expect(text(await c.call("consult", { session_id, staff: "anaesthetist", question: "Ready?" })).split("\n")[0]).toBe("To: Anaesthetist (consultant)");
    await c.close();
  });

  it("a case without an operation says so", async () => {
    const c = new Client(mergeSettings([{ source: "flag", settings: { locale: "en" } }]));
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    const started = await c.call("start_case", { case_id: caseHandle("stemi-inferior-rv") });
    expect(started.structuredContent?.operation).toBe(false);
    expect(text(started)).not.toMatch(/This case has an operation/);
    expect(text(await c.call("observe_field", { session_id: started.structuredContent!.session_id }))).toBe("This case has no operation.");
    await c.close();
  });

  it("attach mode and the world bridge forward the operative and investigation tools", () => {
    const tools = ["observe_field", "operate", "retrieve_report", "order_study", "read_study", "list_studies"];
    expect(BRIDGE_TOOLS).toEqual(expect.arrayContaining(tools));
    expect(attachTools().map((t) => t.name)).toEqual(expect.arrayContaining(tools));
  });

  it("new investigations over MCP: the record looked up, a study ordered once, its report by accession; an operative cholangiogram never ordered", async () => {
    const c = new Client(mergeSettings([{ source: "flag", settings: { locale: "en" } }]));
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } });
    const tools = new Map((await c.request<{ tools: { name: string; annotations: Record<string, unknown> }[] }>("tools/list")).tools.map((t) => [t.name, t]));
    expect(tools.get("order_study")?.annotations).toMatchObject({ title: "Order a new investigation", readOnlyHint: false, idempotentHint: true });
    expect(tools.get("read_study")?.annotations).toMatchObject({ readOnlyHint: true });
    const started = await c.call("start_case", { case_id: caseHandle(withStudies.id) });
    const session_id = started.structuredContent!.session_id as string;
    const ioc = await c.call("order_study", { session_id, query: "intraoperative cholangiogram" });
    expect(ioc.isError).toBe(true);
    expect(text(ioc)).toMatch(/done at the table, not ordered from the chart: the intraoperative cholangiogram is acquired with operate \{op: "image", modality: "ioc"\}/);
    const ordered = await c.call("order_study", { session_id, query: "FBC", request_key: "fbc-1" });
    expect(ordered.isError, text(ordered)).not.toBe(true);
    expect(text(ordered)).toMatch(/Blood count/);
    // the same key again: the same order, nothing new
    expect(text(await c.call("order_study", { session_id, query: "FBC", request_key: "fbc-1" }))).toMatch(/already/i);
    expect(text(await c.call("list_studies", { session_id }))).toMatch(/cbc-new-1/);
    expect(text(await c.call("read_study", { session_id, accession: "cbc-new-1" }))).toMatch(/not (yet )?(ready|due|reported)|due|pending|awaiting/i);
    await c.call("wait", { session_id, minutes: 30 });
    const report = text(await c.call("read_study", { session_id, accession: "cbc-new-1" }));
    expect(report).toMatch(/Haemoglobin 14(\.0)? g\/dL/);
    expect(report).toMatch(/simulated/i);
    await c.close();
  });
});
