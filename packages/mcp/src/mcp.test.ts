import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings, type ResolvedSettings } from "@clinicalcraft/agent";
import { listSessions, loadContent, readTranscript } from "@clinicalcraft/agent/node";
import { t, type ClinicalAction } from "@clinicalcraft/core";
import { LineSplitter, type JsonRpcResponse } from "./jsonrpc.js";
import { McpServer, runMcpServer } from "./server.js";
import { mcpApprovalMode } from "./sessions.js";

const root = mkdtempSync(join(tmpdir(), "cc-mcp-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const SMZL = "smzl-lung-adeno";
const smzl = content.cases.get(SMZL)?.def;

function project(): { home: string; cwd: string; env: Record<string, string> } {
  const dir = mkdtempSync(join(root, "p-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  mkdirSync(home, { recursive: true });
  return { home, cwd, env: { CLINICALCRAFT_HOME: home, HOME: home } };
}

function settings(patch: Record<string, unknown> = {}): ResolvedSettings {
  return mergeSettings([{ source: "flag", settings: { locale: "en", ...patch } }]);
}

type ToolResult = { content: { type: string; text: string }[]; structuredContent?: Record<string, any>; isError?: boolean };

/** An MCP client talking to `runMcpServer` over in-memory streams. */
class TestClient {
  readonly input = new PassThrough();
  readonly output = new PassThrough();
  readonly lines: string[] = [];
  readonly stderr: string[] = [];
  readonly done: Promise<{ sessions: number }>;
  private nextId = 1;
  private readonly waiting = new Map<number | string, (r: JsonRpcResponse) => void>();
  private readonly orphans: JsonRpcResponse[] = [];

  constructor(opts: { settings: ResolvedSettings; env: Record<string, string>; cwd: string }) {
    const splitter = new LineSplitter();
    this.output.on("data", (chunk: Buffer) => {
      for (const line of splitter.push(chunk)) {
        this.lines.push(line);
        const msg = JSON.parse(line) as JsonRpcResponse;
        const resolve = msg.id !== null ? this.waiting.get(msg.id) : undefined;
        if (resolve) {
          this.waiting.delete(msg.id!);
          resolve(msg);
        } else this.orphans.push(msg);
      }
    });
    this.done = runMcpServer({ input: this.input, output: this.output, ...opts, content, log: (m) => this.stderr.push(m) });
  }

  send(raw: string): void {
    this.input.write(`${raw}\n`);
  }

  request(method: string, params?: unknown): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    const reply = new Promise<JsonRpcResponse>((resolve) => this.waiting.set(id, resolve));
    this.send(JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined ? { params } : {}) }));
    return reply;
  }

  notify(method: string, params?: unknown): void {
    this.send(JSON.stringify({ jsonrpc: "2.0", method, ...(params !== undefined ? { params } : {}) }));
  }

  async result<T = any>(method: string, params?: unknown): Promise<T> {
    const r = await this.request(method, params);
    if ("error" in r) throw new Error(`${method}: ${r.error.code} ${r.error.message}`);
    return r.result as T;
  }

  call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    return this.result<ToolResult>("tools/call", { name, arguments: args });
  }

  /** Next response that was not awaited by id (parse errors etc.). */
  async orphan(): Promise<JsonRpcResponse> {
    for (let i = 0; i < 100 && this.orphans.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
    return this.orphans.shift()!;
  }

  async end(): Promise<{ sessions: number }> {
    this.input.end();
    return this.done;
  }
}

/** The MCP tool call that performs one reference-solution step. */
function stepCall(step: ClinicalAction): [string, Record<string, unknown>] | null {
  switch (step.type) {
    case "ask":
      return ["ask_patient", { question: t(smzl!.history.find((h) => h.id === step.itemId)!.question, "en") }];
    case "order":
      return ["order_test", { investigation_id: step.investigationId }];
    case "read":
      return ["read_result", { investigation_id: step.investigationId, ...(step.phase ? { phase: step.phase } : {}) }];
    case "answer":
      return ["answer_decision", { decision_id: step.decisionId, option_ids: step.optionIds }];
    case "set-phase":
      return ["set_phase", { phase: step.phase }];
    case "examine":
      return ["examine", { finding_id: step.findingId }];
    case "intervene":
      return ["intervene", { intervention_id: step.interventionId }];
    case "finish":
      return ["finish_case", {}];
    default:
      return null; // start is implicit
  }
}

describe("MCP stdio server", () => {
  it.skipIf(!smzl)("handshake, tools/list and a full SMZL encounter over stdio", async () => {
    const p = project();
    const client = new TestClient({ settings: settings(), env: p.env, cwd: p.cwd });

    const init = await client.result("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    expect(init).toMatchObject({ protocolVersion: "2025-06-18", capabilities: { tools: {}, resources: {} }, serverInfo: { name: "clinicalcraft", version: "5.0.0" } });
    client.notify("notifications/initialized");
    expect(await client.result("ping")).toEqual({});

    const { tools } = await client.result<{ tools: { name: string; inputSchema: { required?: string[]; properties: Record<string, unknown> }; annotations: { readOnlyHint: boolean } }[] }>("tools/list");
    const names = tools.map((tool) => tool.name);
    for (const name of ["list_cases", "start_case", "ask_patient", "list_options", "examine", "order_test", "read_result", "check_vitals", "intervene", "consult", "answer_decision", "set_phase", "wait", "update_workup", "case_status", "finish_case", "get_debrief"]) {
      expect(names).toContain(name);
    }
    expect(names).not.toContain("walk_to");
    expect(names).not.toContain("reveal_facts");
    const ask = tools.find((tool) => tool.name === "ask_patient")!;
    expect(ask.inputSchema.required).toEqual(["session_id", "question"]);
    expect(Object.keys(ask.inputSchema.properties)).toEqual(["session_id", "question"]);
    expect(tools.find((tool) => tool.name === "case_status")!.annotations.readOnlyHint).toBe(true);

    const listed = await client.call("list_cases");
    expect(listed.isError).toBeUndefined();
    expect(listed.content[0]!.text).toContain(SMZL);
    expect(listed.structuredContent!.cases.map((c: { id: string }) => c.id)).toContain(SMZL);
    expect(JSON.stringify(listed)).not.toContain("solution");

    const started = await client.call("start_case", { case_id: SMZL, locale: "en" });
    expect(started.isError).toBeUndefined();
    const sessionId = started.structuredContent!.session_id as string;
    expect(sessionId).toMatch(/\S/);
    expect(started.structuredContent!.opening).toBe(t(smzl!.patient.persona.openingLine, "en"));
    expect(started.structuredContent!.approvalMode).toBe("bypass");
    expect(started.content[0]!.text).toContain(sessionId);
    expect(started.content[0]!.text).toContain(t(smzl!.patient.chiefComplaint, "en"));

    // ask_patient → the patient's authored answer (offline pipeline), credited as asked.
    const pain = await client.call("ask_patient", { session_id: sessionId, question: "Where does it hurt, and when did it start?" });
    expect(pain.isError).toBeUndefined();
    expect(pain.content[0]!.text).toBe(t(smzl!.history.find((h) => h.id === "pain")!.answer, "en"));
    expect(pain.structuredContent!.data.factIds).toContain("pain");

    // order_test + read_result
    const order = await client.call("order_test", { session_id: sessionId, investigation_id: "cbc" });
    expect(order.isError).toBeUndefined();
    const read = await client.call("read_result", { session_id: sessionId, investigation_id: "cbc" });
    expect(read.isError).toBeUndefined();
    expect(read.content[0]!.text.length).toBeGreaterThan(10);
    const unordered = await client.call("read_result", { session_id: sessionId, investigation_id: "karyo" });
    expect(unordered.isError).toBe(true); // engine rejection → tool error

    const early = await client.call("finish_case", { session_id: sessionId });
    expect(early.isError).toBe(true);

    const plan = await client.call("update_workup", { session_id: sessionId, plan: [{ text: "Clarify splenomegaly", status: "in_progress" }] });
    expect(plan.isError).toBeUndefined();

    // Play the rest of the reference walkthrough through the MCP tools.
    for (const step of smzl!.solution) {
      const call = stepCall(step);
      if (!call) continue;
      const [name, args] = call;
      if (name === "finish_case") continue;
      const res = await client.call(name, { session_id: sessionId, ...args });
      if (name !== "order_test") expect({ step, error: res.isError ?? false, text: res.content[0]!.text }).toMatchObject({ error: false });
    }
    const status = await client.call("case_status", { session_id: sessionId });
    expect(status.structuredContent!.data.progress.complete).toBe(true);
    const finished = await client.call("finish_case", { session_id: sessionId });
    expect(finished.isError).toBeUndefined();

    const debrief = await client.call("get_debrief", { session_id: sessionId });
    expect(debrief.isError).toBeUndefined();
    expect(debrief.structuredContent!.report).toMatchObject({ caseId: SMZL, completed: true });
    expect(debrief.structuredContent!.complete).toBe(true);
    // The completion screen always carries the teaching-script notice (the case's own wording when it has one).
    expect(debrief.content[0]!.text).toContain(smzl!.debrief.notice ? t(smzl!.debrief.notice, "en") : "teaching-script measure");
    expect(debrief.content[0]!.text).toContain(t(smzl!.debrief.title, "en"));

    const { resources } = await client.result<{ resources: { uri: string }[] }>("resources/list");
    expect(resources.map((r) => r.uri)).toEqual(expect.arrayContaining(["clinicalcraft://cases", `clinicalcraft://session/${sessionId}/state`, `clinicalcraft://session/${sessionId}/transcript`]));
    const state = await client.result<{ contents: { text: string; mimeType: string }[] }>("resources/read", { uri: `clinicalcraft://session/${sessionId}/state` });
    const parsed = JSON.parse(state.contents[0]!.text) as { state: { finished: boolean; asked: string[] }; plan: { items: { text: string }[] } };
    expect(parsed.state.finished).toBe(true);
    expect(parsed.state.asked).toEqual(expect.arrayContaining(["pain", "spleen", "lung"]));
    expect(parsed.plan.items[0]!.text).toBe("Clarify splenomegaly");
    const transcript = await client.result<{ contents: { text: string }[] }>("resources/read", { uri: `clinicalcraft://session/${sessionId}/transcript` });
    expect(transcript.contents[0]!.text).toContain(t(smzl!.history.find((h) => h.id === "pain")!.answer, "en"));

    // stdout carried JSON-RPC responses only.
    for (const line of client.lines) expect(JSON.parse(line)).toMatchObject({ jsonrpc: "2.0" });

    expect(await client.end()).toEqual({ sessions: 1 });
    const recorded = await listSessions(p.env);
    expect(recorded.map((s) => s.id)).toContain(sessionId);
    const items = await readTranscript(recorded.find((s) => s.id === sessionId)!.path);
    expect(items.filter((i) => i.type === "action" && i.payload.accepted && i.payload.action.type === "finish")).toHaveLength(1);
  });

  it("negotiates the protocol version and reports JSON-RPC errors", async () => {
    const p = project();
    const client = new TestClient({ settings: settings(), env: p.env, cwd: p.cwd });
    expect((await client.result("initialize", { protocolVersion: "2024-11-05", capabilities: {} })).protocolVersion).toBe("2024-11-05");
    expect((await client.result("initialize", { protocolVersion: "2025-03-26", capabilities: {} })).protocolVersion).toBe("2025-03-26");
    expect((await client.result("initialize", { protocolVersion: "1999-01-01", capabilities: {} })).protocolVersion).toBe("2025-06-18");

    const unknownMethod = await client.request("frobnicate");
    expect("error" in unknownMethod && unknownMethod.error.code).toBe(-32601);

    const missingSession = await client.request("tools/call", { name: "ask_patient", arguments: { question: "Hi" } });
    expect("error" in missingSession && missingSession.error.code).toBe(-32602);
    expect("error" in missingSession && missingSession.error.message).toContain("session_id");
    const badType = await client.request("tools/call", { name: "order_test", arguments: { session_id: 42 } });
    expect("error" in badType && badType.error.code).toBe(-32602);
    const extra = await client.request("tools/call", { name: "case_status", arguments: { session_id: "x", bogus: true } });
    expect("error" in extra && extra.error.code).toBe(-32602);
    const unknownTool = await client.request("tools/call", { name: "walk_to", arguments: {} });
    expect("error" in unknownTool && unknownTool.error.code).toBe(-32602);
    const noName = await client.request("tools/call", {});
    expect("error" in noName && noName.error.code).toBe(-32602);
    const badCase = await client.request("tools/call", { name: "start_case", arguments: { case_id: "no-such-case" } });
    expect("error" in badCase && badCase.error.code).toBe(-32602); // not in the case_id enum

    const unknownSession = await client.call("ask_patient", { session_id: "no-such-session", question: "Hello?" });
    expect(unknownSession.isError).toBe(true);
    expect(unknownSession.content[0]!.text).toContain("Unknown session_id");
    expect(unknownSession.structuredContent).toMatchObject({ error: "unknown_session" });

    const missingResource = await client.request("resources/read", { uri: "clinicalcraft://session/nope/state" });
    expect("error" in missingResource && missingResource.error.code).toBe(-32002);

    client.send("{not json");
    const parseError = await client.orphan();
    expect(parseError).toMatchObject({ id: null, error: { code: -32700 } });
    client.send(JSON.stringify({ jsonrpc: "1.0", id: 99, method: "ping" }));
    expect(await client.orphan()).toMatchObject({ id: 99, error: { code: -32600 } });

    expect(await client.end()).toEqual({ sessions: 0 });
    expect(client.lines.every((l) => JSON.parse(l).jsonrpc === "2.0")).toBe(true);
  });

  it.skipIf(!smzl)("honours an explicit approval mode: calls that need approval come back as tool errors", async () => {
    const p = project();
    const strict = settings({ approvalMode: "strict" });
    expect(mcpApprovalMode(strict)).toBe("strict");
    expect(mcpApprovalMode(settings())).toBe("bypass");
    const client = new TestClient({ settings: strict, env: p.env, cwd: p.cwd });
    await client.result("initialize", { protocolVersion: "2025-06-18", capabilities: {} });
    const started = await client.call("start_case", { case_id: SMZL, locale: "zh-CN" });
    const sessionId = started.structuredContent!.session_id as string;
    expect(started.structuredContent!.approvalMode).toBe("strict");
    expect(started.structuredContent!.locale).toBe("zh-CN");

    const order = await client.call("order_test", { session_id: sessionId, investigation_id: "cbc" });
    expect(order.isError).toBe(true);
    expect(order.content[0]!.text).toContain("order_test(cbc)");
    expect(order.structuredContent).toMatchObject({ ok: false, refused: { reason: "ask", ruleId: "mode.strict" } });
    // Read-only tools never need approval.
    const status = await client.call("case_status", { session_id: sessionId });
    expect(status.isError).toBeUndefined();
    const nurse = await client.call("consult", { session_id: sessionId, role: "nurse", question: "生命体征怎么样？" });
    expect(nurse.isError).toBeUndefined();
    expect(nurse.content[0]!.text.length).toBeGreaterThan(0);
    await client.end();
  });

  it.skipIf(!smzl)("runs settings PreToolUse command hooks: exit 2 blocks the call", async () => {
    const p = project();
    const hooked = settings({ hooks: { PreToolUse: [{ matcher: "^order_test$", hooks: [{ type: "command", command: "echo 'no orders in this drill' >&2; exit 2" }] }] } });
    const client = new TestClient({ settings: hooked, env: p.env, cwd: p.cwd });
    const started = await client.call("start_case", { case_id: SMZL, locale: "en" });
    const sessionId = started.structuredContent!.session_id as string;
    const order = await client.call("order_test", { session_id: sessionId, investigation_id: "cbc" });
    expect(order.isError).toBe(true);
    expect(order.content[0]!.text).toContain("no orders in this drill");
    expect(order.structuredContent).toMatchObject({ refused: { reason: "hook" } });
    const exam = await client.call("list_options", { session_id: sessionId, kind: "investigations" });
    expect(exam.isError).toBeUndefined();
    await client.end();
  });

  it.skipIf(!smzl)("McpServer handles batches and suppresses responses to cancelled requests", async () => {
    const p = project();
    const server = new McpServer({ settings: settings(), env: p.env, cwd: p.cwd, content, log: () => undefined });
    const batch = (await server.handle([
      { jsonrpc: "2.0", id: 1, method: "ping" },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ])) as JsonRpcResponse[];
    expect(batch.map((r) => r.id)).toEqual([1, 2]);

    const started = (await server.handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "start_case", arguments: { case_id: SMZL } } })) as { result: ToolResult };
    const sessionId = started.result.structuredContent!.session_id as string;
    const pending = server.handle({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "ask_patient", arguments: { session_id: sessionId, question: "Where does it hurt?" } } });
    await server.handle({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 4, reason: "test" } });
    expect(await pending).toBeNull();
    await server.close();
  });
});
