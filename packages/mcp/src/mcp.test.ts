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
import { caseHandle } from "./format.js";
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
    // `confirm` (optional) is the second step of a confirmation, on every state-changing tool.
    expect(Object.keys(ask.inputSchema.properties)).toEqual(["session_id", "question", "confirm"]);
    expect(tools.find((tool) => tool.name === "case_status")!.annotations.readOnlyHint).toBe(true);

    // Case ids name the diagnoses: the clinician (the MCP client) sees opaque handles, in library order.
    const startCase = tools.find((tool) => tool.name === "start_case")!;
    expect((startCase.inputSchema.properties.case_id as { enum?: unknown }).enum).toBeUndefined();
    expect(JSON.stringify(startCase.inputSchema)).not.toMatch(/smzl|stemi|embolism|dka/);
    const listed = await client.call("list_cases");
    expect(listed.isError).toBeUndefined();
    const handle = caseHandle(SMZL);
    expect(listed.content[0]!.text).toContain(handle);
    expect(listed.structuredContent!.cases.map((c: { id: string }) => c.id)).toContain(handle);
    for (const id of content.cases.keys()) expect(JSON.stringify(listed)).not.toContain(id);
    expect(JSON.stringify(listed)).not.toContain("solution");

    const started = await client.call("start_case", { case_id: handle, locale: "en" });
    expect(started.isError).toBeUndefined();
    expect(started.structuredContent!.case_id).toBe(handle);
    expect(JSON.stringify(started)).not.toContain(SMZL);
    const sessionId = started.structuredContent!.session_id as string;
    expect(sessionId).toMatch(/\S/);
    expect(started.structuredContent!.opening).toBe(t(smzl!.patient.persona.openingLine, "en"));
    expect(started.structuredContent!.approvalMode).toBe("auto");
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

  const ana = content.cases.get("anaphylaxis-garden")?.def;
  it.skipIf(!ana)("ask_patient returns only the patient's words; staff/monitor lines its time cost triggers come back as notices", async () => {
    const p = project();
    const client = new TestClient({ settings: settings(), env: p.env, cwd: p.cwd });
    const started = await client.call("start_case", { case_id: "anaphylaxis-garden" });
    const sessionId = started.structuredContent!.session_id as string;
    const replies: string[] = [];
    const notices: string[] = [];
    for (const step of ana!.solution) {
      if (step.type !== "ask") continue;
      const question = t(ana!.history.find((h) => h.id === step.itemId)!.question, "en");
      const r = await client.call("ask_patient", { session_id: sessionId, question });
      replies.push(String(r.structuredContent!.data?.text ?? ""));
      notices.push(...((r.structuredContent!.notices as string[] | undefined) ?? []));
    }
    expect(replies.length).toBeGreaterThan(3);
    for (const reply of replies) {
      expect(reply).not.toMatch(/monitor is alarming|Doctor, \S+ is \d|critical result|Doctor, the lab/i);
      expect(reply.trim()).not.toBe("");
    }
    expect(notices.some((n) => /Vital-sign alert/i.test(n))).toBe(true); // the alarms still reach the client
    await client.end();
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
    const badCase = await client.call("start_case", { case_id: "no-such-case" });
    expect(badCase.isError).toBe(true);
    expect(badCase.structuredContent).toMatchObject({ error: "unknown_case" });

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
    expect(mcpApprovalMode(settings())).toBe("auto");
    const client = new TestClient({ settings: strict, env: p.env, cwd: p.cwd });
    await client.result("initialize", { protocolVersion: "2025-06-18", capabilities: {} });
    const started = await client.call("start_case", { case_id: SMZL, locale: "zh-CN" });
    const sessionId = started.structuredContent!.session_id as string;
    expect(started.structuredContent!.approvalMode).toBe("strict");
    expect(started.structuredContent!.locale).toBe("zh-CN");

    const order = await client.call("order_test", { session_id: sessionId, investigation_id: "cbc" });
    expect(order.isError).toBe(true);
    expect(order.content[0]!.text).toContain("order_test(cbc)");
    expect(order.content[0]!.text).toContain('"confirm": true');
    expect(order.structuredContent).toMatchObject({ ok: false, refused: { reason: "ask", ruleId: "mode.strict", confirm: "required" } });
    // The second step: the client confirmed with its user.
    const confirmed = await client.call("order_test", { session_id: sessionId, investigation_id: "cbc", confirm: true });
    expect(confirmed.isError).toBeUndefined();
    // Read-only tools never need approval.
    const status = await client.call("case_status", { session_id: sessionId });
    expect(status.isError).toBeUndefined();
    const nurse = await client.call("consult", { session_id: sessionId, role: "nurse", question: "生命体征怎么样？" });
    expect(nurse.isError).toBeUndefined();
    expect(nurse.content[0]!.text.length).toBeGreaterThan(0);
    await client.end();
  });

  const stroke = content.cases.get("acute-ischemic-stroke")?.def;
  it.skipIf(!stroke)("default mode is auto: thrombolysis needs a second call with confirm: true; deny rules and explicit bypass behave as configured", async () => {
    const p = project();
    const client = new TestClient({ settings: settings({ permissions: { deny: ["intervene(alteplase)"] } }), env: p.env, cwd: p.cwd });
    const { tools } = await client.result<{ tools: { name: string; inputSchema: { properties: Record<string, { type?: string }> } }[] }>("tools/list");
    const schema = (name: string) => tools.find((tool) => tool.name === name)!.inputSchema.properties;
    expect(schema("intervene").confirm).toMatchObject({ type: "boolean" });
    expect(schema("order_test").confirm).toMatchObject({ type: "boolean" });
    expect(schema("case_status").confirm).toBeUndefined(); // read-only tools never ask
    const started = await client.call("start_case", { case_id: "acute-ischemic-stroke", locale: "en" });
    expect(started.structuredContent!.approvalMode).toBe("auto");
    const sessionId = started.structuredContent!.session_id as string;
    const given = () => client.call("case_status", { session_id: sessionId }).then(() => undefined);

    // Moderate risk runs in auto.
    const labetalol = await client.call("intervene", { session_id: sessionId, intervention_id: "labetalol" });
    expect(labetalol.isError).toBeUndefined();
    // High risk (always-ask): the first call explains and refuses; nothing happens.
    const first = await client.call("intervene", { session_id: sessionId, intervention_id: "tenecteplase" });
    expect(first.isError).toBe(true);
    expect(first.content[0]!.text).toMatch(/confirm/i);
    expect(first.content[0]!.text).toContain('"confirm": true');
    expect(first.content[0]!.text).toMatch(/high/i);
    expect(first.structuredContent).toMatchObject({ ok: false, refused: { reason: "ask", ruleId: "tool.always-ask", risk: "high", confirm: "required" } });
    await given();
    const interventions = async () => {
      const state = await client.result<{ contents: { text: string }[] }>("resources/read", { uri: `clinicalcraft://session/${sessionId}/state` });
      return (JSON.parse(state.contents[0]!.text) as { state: { interventions: { interventionId: string }[] } }).state.interventions.map((i) => i.interventionId);
    };
    expect(await interventions()).not.toContain("tenecteplase");
    // confirm: false is no confirmation.
    expect((await client.call("intervene", { session_id: sessionId, intervention_id: "tenecteplase", confirm: false })).isError).toBe(true);
    // The second call with confirm: true runs it.
    const second = await client.call("intervene", { session_id: sessionId, intervention_id: "tenecteplase", confirm: true });
    expect(second.isError, second.content[0]!.text).toBeUndefined();
    expect(await interventions()).toContain("tenecteplase");
    // A deny rule is not something a confirmation overrides.
    const denied = await client.call("intervene", { session_id: sessionId, intervention_id: "alteplase", confirm: true });
    expect(denied.isError).toBe(true);
    expect(denied.structuredContent).toMatchObject({ refused: { reason: "deny", ruleId: "rule.deny" } });
    expect(await interventions()).not.toContain("alteplase");
    await client.end();

    // bypass stays available when chosen explicitly (benchmarks; unsafe): no confirmation step.
    const q = project();
    const bypass = new TestClient({ settings: settings({ approvalMode: "bypass" }), env: q.env, cwd: q.cwd });
    const s2 = (await bypass.call("start_case", { case_id: "acute-ischemic-stroke", locale: "en" })).structuredContent!.session_id as string;
    expect((await bypass.call("intervene", { session_id: s2, intervention_id: "tenecteplase" })).isError).toBeUndefined();
    await bypass.end();
  });

  it.skipIf(!stroke)("confirm: true on a first attempt is not a confirmation (F2): it is refused like an unconfirmed call", async () => {
    const p = project();
    const client = new TestClient({ settings: settings(), env: p.env, cwd: p.cwd });
    const sessionId = (await client.call("start_case", { case_id: "acute-ischemic-stroke", locale: "en" })).structuredContent!.session_id as string;
    const interventions = async () => {
      const state = await client.result<{ contents: { text: string }[] }>("resources/read", { uri: `clinicalcraft://session/${sessionId}/state` });
      return (JSON.parse(state.contents[0]!.text) as { state: { interventions: { interventionId: string }[] } }).state.interventions.map((i) => i.interventionId);
    };
    const first = await client.call("intervene", { session_id: sessionId, intervention_id: "tenecteplase", confirm: true });
    expect(first.isError).toBe(true);
    expect(first.structuredContent).toMatchObject({ ok: false, refused: { reason: "ask", ruleId: "tool.always-ask", confirm: "required" } });
    expect(first.content[0]!.text).toMatch(/only counts when it repeats/);
    expect(await interventions()).not.toContain("tenecteplase");
    // The confirmed repeat of that refused call runs — once.
    const second = await client.call("intervene", { session_id: sessionId, intervention_id: "tenecteplase", confirm: true });
    expect(second.isError, second.content[0]!.text).toBeUndefined();
    expect(await interventions()).toContain("tenecteplase");
    // A different call is not covered by that confirmation.
    const other = await client.call("intervene", { session_id: sessionId, intervention_id: "alteplase", confirm: true });
    expect(other.isError).toBe(true);
    await client.end();
  });

  it("answer_decision on a locked decision names neither the prompt nor any option (F0)", async () => {
    const p = project();
    const client = new TestClient({ settings: settings(), env: p.env, cwd: p.cwd });
    const caseRef = stroke ? "acute-ischemic-stroke" : SMZL;
    const def = content.cases.get(caseRef)!.def;
    const sessionId = (await client.call("start_case", { case_id: caseRef, locale: "en" })).structuredContent!.session_id as string;
    const listed = await client.call("list_options", { session_id: sessionId, kind: "decisions" });
    const locked = (listed.structuredContent!.data as { items: { id: string; unlocked: boolean; decided: boolean }[] }).items.find((d) => !d.unlocked && !d.decided);
    expect(locked).toBeDefined();
    const decision = def.decisions.find((d) => d.id === locked!.id)!;
    const out = await client.call("answer_decision", { session_id: sessionId, decision_id: decision.id, option_ids: ["zzz"] });
    expect(out.isError).toBe(true);
    const text = out.content[0]!.text + JSON.stringify(out.structuredContent);
    for (const o of decision.options) {
      expect(text).not.toContain(t(o.text, "en"));
      expect(text).not.toContain(`${o.id} (`);
    }
    expect(text).not.toContain(t(decision.prompt, "en"));
    // Even with an ask rule there is no confirmation round-trip for it.
    await client.end();
  });

  it.skipIf(!stroke)("mid-case get_debrief gives a count of missing essential tests, not their names (F8)", async () => {
    const p = project();
    const client = new TestClient({ settings: settings(), env: p.env, cwd: p.cwd });
    const def = content.cases.get("acute-ischemic-stroke")!.def;
    const sessionId = (await client.call("start_case", { case_id: "acute-ischemic-stroke", locale: "en" })).structuredContent!.session_id as string;
    const debrief = await client.call("get_debrief", { session_id: sessionId });
    expect(debrief.structuredContent!.complete).toBe(false);
    const report = debrief.structuredContent!.report as { investigations: Record<string, unknown> };
    expect(report.investigations.essentialMissing).toBeUndefined();
    expect(report.investigations.essentialMissingCount).toBeGreaterThan(0);
    const text = debrief.content[0]!.text;
    for (const inv of def.investigations.filter((i) => i.value === "essential")) expect(text).not.toContain(t(inv.name, "en"));
    expect(text).toMatch(/not obtained yet: \d+/);
    await client.end();
  });

  it.skipIf(!smzl)("a provider without its key is not a silent offline patient (C0): start_case and later calls carry a notice", async () => {
    const p = project();
    const client = new TestClient({ settings: settings({ provider: "anthropic" }), env: p.env, cwd: p.cwd });
    const started = await client.call("start_case", { case_id: SMZL, locale: "en" });
    const warnings = (started.structuredContent!.warnings ?? []) as string[];
    expect(warnings.join("\n")).toMatch(/offline responder/);
    expect(started.content[0]!.text).toMatch(/Notice: .*offline responder/);
    expect(client.stderr.join("\n")).toMatch(/offline responder/);
    const sessionId = started.structuredContent!.session_id as string;
    const nurse = await client.call("consult", { session_id: sessionId, role: "nurse", question: "How is he?" });
    expect(((nurse.structuredContent!.warnings ?? []) as string[]).join("\n")).toMatch(/nurse.*offline responder/);
    await client.end();
  });

  it("the shipped project settings leave the approval mode to each front-end (MCP: auto)", async () => {
    const { loadSettings } = await import("@clinicalcraft/agent/node");
    const p = project();
    const repo = new URL("../../../", import.meta.url).pathname;
    const loaded = await loadSettings({ cwd: repo, env: p.env });
    expect(loaded.sources.approvalMode).toBe("default");
    expect(mcpApprovalMode(loaded)).toBe("auto");
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

  it.skipIf(!smzl)("a call cancelled while queued behind another call on the session never acts", async () => {
    const p = project();
    // A slow PreToolUse hook on ask_patient keeps the session busy for a moment.
    const slow = settings({ hooks: { PreToolUse: [{ matcher: "^ask_patient$", hooks: [{ type: "command", command: "sleep 1" }] }] } });
    const server = new McpServer({ settings: slow, env: p.env, cwd: p.cwd, content, log: () => undefined });
    const started = (await server.handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "start_case", arguments: { case_id: SMZL } } })) as { result: ToolResult };
    const sessionId = started.result.structuredContent!.session_id as string;
    const ask = server.handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "ask_patient", arguments: { session_id: sessionId, question: "Where does it hurt?" } } });
    const order = server.handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "order_test", arguments: { session_id: sessionId, investigation_id: "cbc" } } });
    await new Promise((r) => setTimeout(r, 100));
    await server.handle({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 3, reason: "changed my mind" } });
    expect(((await ask) as { result: ToolResult }).result.isError).toBeUndefined();
    expect(await order).toBeNull();
    const state = server.sessions.get(sessionId)!.session.state;
    expect(state.orders.map((o) => o.investigationId)).not.toContain("cbc");
    // The session still works afterwards.
    const again = (await server.handle({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "order_test", arguments: { session_id: sessionId, investigation_id: "cbc" } } })) as { result: ToolResult };
    expect(again.result.isError).toBeUndefined();
    expect(server.sessions.get(sessionId)!.session.state.orders.map((o) => o.investigationId)).toContain("cbc");
    await server.close();
  });
});
