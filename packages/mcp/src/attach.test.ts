/**
 * `clinicalcraft mcp --attach` (AttachedMcpServer) over in-memory stdio with
 * a stubbed bridge server (`fetch`): tools without `confirm` (the learner
 * approves in the browser), live-session selection (auto, several, pinned,
 * none), capability checks, result mapping (status, approvals, notices),
 * cancellation (`notifications/cancelled` → a cancel request, no response),
 * timeouts, auth and network errors; the token never reaches the logs.
 */
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import type { BridgeToolResult, LiveSessionInfo } from "@clinicalcraft/agent";
import { runAttachedMcpServer } from "./attach.js";
import { LineSplitter, type JsonRpcResponse } from "./jsonrpc.js";

const SERVER = "http://127.0.0.1:5178";
const TOKEN = "attach-token-0123456789";

function live(id: string, patch: Partial<LiveSessionInfo> = {}): LiveSessionInfo {
  return {
    id,
    caseHandle: "case-0abc123",
    title: "Chest pain · 58-year-old man",
    facilityId: "general-hospital",
    embodiment: "embodied",
    locale: "en",
    capabilities: ["observe_world", "navigate_to", "interact_object", "intervene", "examine"],
    createdAt: "2026-10-19T00:00:00.000Z",
    lastSeenAt: "2026-10-19T00:00:00.000Z",
    connected: true,
    pendingCalls: 0,
    ...patch,
  };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** A stub of `clinicalcraft serve`'s bridge routes. */
class FakeBridge {
  sessions: LiveSessionInfo[] = [];
  readonly calls: { id: string; body: Record<string, any> }[] = [];
  readonly cancels: { id: string; correlationId: string }[] = [];
  readonly auth: (string | null)[] = [];
  result: (body: Record<string, any>, signal?: AbortSignal | null) => Promise<Response> = async () => json(200, { correlationId: "x", result: { ok: true, status: "ok", output: "done" }, deduplicated: false });

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = (init?.headers ?? {}) as Record<string, string>;
    this.auth.push(headers.authorization ?? null);
    const parts = url.pathname.replace(/^\/api\/world\/sessions\/?/, "").split("/").filter(Boolean);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, any>) : {};
    if (parts.length === 0) return json(200, { sessions: this.sessions });
    const session = this.sessions.find((s) => s.id === parts[0]);
    if (!session) return json(404, { error: { code: "unknown_session", message: `No live session "${parts[0]}".` } });
    if (parts.length === 1) return json(200, session);
    if (parts[1] === "cancel") {
      this.cancels.push({ id: session.id, correlationId: body.correlationId });
      return json(200, { ok: true, cancelled: true });
    }
    this.calls.push({ id: session.id, body });
    return this.result(body, init?.signal);
  };
}

type ToolResult = { content: { type: string; text: string }[]; structuredContent?: Record<string, any>; isError?: boolean };

class Client {
  readonly input = new PassThrough();
  readonly output = new PassThrough();
  readonly logs: string[] = [];
  readonly done: Promise<void>;
  readonly replies: JsonRpcResponse[] = [];
  private id = 1;
  private readonly waiting = new Map<number, (r: JsonRpcResponse) => void>();

  constructor(bridge: FakeBridge, extra: { token?: string; worldSession?: string; callTimeoutMs?: number; locale?: string } = {}) {
    const splitter = new LineSplitter();
    this.output.on("data", (chunk: Buffer) => {
      for (const line of splitter.push(chunk)) {
        const msg = JSON.parse(line) as JsonRpcResponse;
        this.replies.push(msg);
        if (typeof msg.id === "number") this.waiting.get(msg.id)?.(msg);
      }
    });
    this.done = runAttachedMcpServer({ input: this.input, output: this.output, serverUrl: SERVER, fetch: bridge.fetch, idPrefix: "mcp-test", log: (m) => this.logs.push(m), ...extra });
  }

  send(message: Record<string, unknown>): void {
    this.input.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  }

  async request<T = any>(method: string, params?: unknown): Promise<T> {
    const id = this.id++;
    const reply = new Promise<JsonRpcResponse>((resolve) => this.waiting.set(id, resolve));
    this.send({ id, method, ...(params !== undefined ? { params } : {}) });
    const r = await reply;
    if ("error" in r) throw Object.assign(new Error(`${method}: ${r.error.message}`), { code: r.error.code });
    return r.result as T;
  }

  call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    return this.request<ToolResult>("tools/call", { name, arguments: args });
  }

  async end(): Promise<void> {
    this.input.end();
    await this.done;
  }
}

describe("mcp --attach (AttachedMcpServer)", () => {
  it("lists list_live_sessions and the forwarded tools: optional session_id, never confirm; the learner approves", async () => {
    const c = new Client(new FakeBridge());
    const init = await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    expect(init).toMatchObject({ protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "clinicalcraft" } });
    expect(init.instructions).toMatch(/cannot approve your own requests/);
    const { tools } = await c.request<{ tools: { name: string; inputSchema: any; annotations: any }[] }>("tools/list");
    const names = tools.map((t) => t.name);
    expect(names[0]).toBe("list_live_sessions");
    expect(names).toEqual(expect.arrayContaining(["ask_patient", "examine", "order_test", "intervene", "case_status", "observe_world", "navigate_to", "interact_object", "delegate_task", "execute_skill"]));
    for (const absent of ["start_case", "list_cases", "get_debrief", "get_camera_frame", "walk_to"]) expect(names).not.toContain(absent);
    for (const t of tools) {
      expect(t.inputSchema.properties.confirm, t.name).toBeUndefined();
      expect(t.inputSchema.required ?? [], t.name).not.toContain("session_id");
      expect(t.inputSchema.additionalProperties, t.name).toBe(false);
    }
    expect(tools.find((t) => t.name === "intervene")!.annotations).toMatchObject({ destructiveHint: true, readOnlyHint: false });
    expect(tools.find((t) => t.name === "observe_world")!.annotations).toMatchObject({ readOnlyHint: true });
    // `confirm` is not an argument: the external agent cannot approve its own requests.
    await expect(c.call("intervene", { intervention_id: "tenecteplase", confirm: true })).rejects.toMatchObject({ code: -32602 });
    expect(await c.request("resources/list")).toEqual({ resources: [] });
    await c.end();
  });

  it("no live session: a clear error telling the learner what to enable", async () => {
    const bridge = new FakeBridge();
    const c = new Client(bridge);
    const r = await c.call("observe_world");
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toMatchObject({ error: "no_live_session" });
    expect(r.content[0]!.text).toMatch(/No live browser session — open the web world .* enable “Allow an external agent to control this session”/);
    const list = await c.call("list_live_sessions");
    expect(list.isError).toBeUndefined();
    expect(list.structuredContent).toMatchObject({ sessions: [] });
    await c.end();
  });

  it("auto-selects the only (connected) session; forwards tool, args and a correlation id; maps the result", async () => {
    const bridge = new FakeBridge();
    bridge.sessions = [live("ls_aaaaaaaaaaaaaaaa"), live("ls_bbbbbbbbbbbbbbbb", { connected: false })];
    const result: BridgeToolResult = {
      ok: true,
      status: "ok",
      output: "Given: ticagrelor 180 mg PO.",
      data: { interventionId: "ticagrelor" },
      notices: ["Monitor: SpO2 91%"],
      approvals: [{ tool: "intervene", risk: "moderate", summary: "Give ticagrelor?", decision: "approved" }],
    };
    bridge.result = async (body) => json(200, { correlationId: body.correlationId, result, deduplicated: false });
    const c = new Client(bridge, { callTimeoutMs: 90_000 });
    const r = await c.call("intervene", { intervention_id: "ticagrelor" });
    expect(bridge.calls).toEqual([{ id: "ls_aaaaaaaaaaaaaaaa", body: { correlationId: "mcp-test-1", tool: "intervene", args: { intervention_id: "ticagrelor" }, timeoutMs: 90_000 } }]);
    expect(r.isError).toBeUndefined();
    expect(r.structuredContent).toMatchObject({ session_id: "ls_aaaaaaaaaaaaaaaa", tool: "intervene", ok: true, status: "ok", correlation_id: "mcp-test-1", data: { interventionId: "ticagrelor" }, approvals: [{ decision: "approved" }], notices: ["Monitor: SpO2 91%"] });
    expect(r.content[0]!.text).toMatch(/Given: ticagrelor[\s\S]*! Monitor: SpO2 91%[\s\S]*Approvals answered by the learner: Give ticagrelor\? → approved/);

    // A denial by the learner is an error result with status "denied".
    bridge.result = async (body) => json(200, { correlationId: body.correlationId, result: { ok: false, status: "denied", output: "Denied by the learner.", approvals: [{ tool: "intervene", risk: "moderate", summary: "Give clopidogrel?", decision: "denied" }] }, deduplicated: false });
    const denied = await c.call("intervene", { intervention_id: "clopidogrel" });
    expect(denied.isError).toBe(true);
    expect(denied.structuredContent).toMatchObject({ status: "denied", ok: false });
    expect(bridge.calls[1]!.body.correlationId).toBe("mcp-test-2");
    await c.end();
  });

  it("several sessions: asks to choose; session_id and --world-session pick one; unknown ids are reported", async () => {
    const bridge = new FakeBridge();
    bridge.sessions = [live("ls_aaaaaaaaaaaaaaaa"), live("ls_cccccccccccccccc", { title: "Wheeze · 6-year-old" })];
    const c = new Client(bridge);
    const r = await c.call("observe_world");
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toMatchObject({ error: "choose_live_session" });
    expect(r.content[0]!.text).toMatch(/2 live sessions are open: pass session_id/);
    expect(r.content[0]!.text).toContain("ls_cccccccccccccccc — Wheeze · 6-year-old");
    expect((await c.call("observe_world", { session_id: "ls_cccccccccccccccc" })).isError).toBeUndefined();
    expect(bridge.calls.at(-1)).toMatchObject({ id: "ls_cccccccccccccccc", body: { tool: "observe_world", args: {} } });
    const unknown = await c.call("observe_world", { session_id: "ls_zzzzzzzzzzzzzzzz" });
    expect(unknown.structuredContent).toMatchObject({ error: "unknown_live_session" });
    expect(unknown.content[0]!.text).toMatch(/Open sessions: ls_aaaaaaaaaaaaaaaa, ls_cccccccccccccccc/);
    await c.end();

    const pinned = new Client(bridge, { worldSession: "ls_cccccccccccccccc" });
    expect((await pinned.call("examine", { finding_id: "general" })).isError).toBeUndefined();
    expect(bridge.calls.at(-1)).toMatchObject({ id: "ls_cccccccccccccccc", body: { tool: "examine" } });
    await pinned.end();
  });

  it("refuses tools the live session does not accept (world tools on a clinical session: not_embodied)", async () => {
    const bridge = new FakeBridge();
    bridge.sessions = [live("ls_aaaaaaaaaaaaaaaa", { embodiment: "clinical", capabilities: ["examine", "intervene"] })];
    const c = new Client(bridge);
    const world = await c.call("navigate_to", { target: "patient" });
    expect(world.structuredContent).toMatchObject({ error: "not_embodied" });
    expect(world.content[0]!.text).toMatch(/needs an embodied encounter/);
    const other = await c.call("order_test", { investigation_id: "ecg-12lead" });
    expect(other.structuredContent).toMatchObject({ error: "not_available" });
    expect(bridge.calls).toEqual([]);
    await c.end();
  });

  it("notifications/cancelled cancels the call in the browser; the request gets no response", async () => {
    const bridge = new FakeBridge();
    bridge.sessions = [live("ls_aaaaaaaaaaaaaaaa")];
    bridge.result = (_body, signal) =>
      new Promise<Response>((_resolve, reject) => signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
    const c = new Client(bridge);
    c.send({ id: 41, method: "tools/call", params: { name: "intervene", arguments: { intervention_id: "nitroglycerin" } } });
    await new Promise((r) => setTimeout(r, 50));
    expect(bridge.calls).toHaveLength(1);
    c.send({ method: "notifications/cancelled", params: { requestId: 41, reason: "user stopped" } });
    await new Promise((r) => setTimeout(r, 50));
    expect(bridge.cancels).toEqual([{ id: "ls_aaaaaaaaaaaaaaaa", correlationId: "mcp-test-1" }]);
    expect(await c.request("ping")).toEqual({});
    await c.end();
    expect(c.replies.some((r) => r.id === 41)).toBe(false);
  });

  it("maps timeouts, auth and network failures to clear errors; the token is sent, never logged", async () => {
    const bridge = new FakeBridge();
    bridge.sessions = [live("ls_aaaaaaaaaaaaaaaa")];
    bridge.result = async () => json(504, { error: { code: "call_timeout", message: "The live session did not finish intervene within 120 s.", acknowledged: true } });
    const c = new Client(bridge, { token: TOKEN });
    const timeout = await c.call("intervene", { intervention_id: "ticagrelor" });
    expect(timeout.isError).toBe(true);
    expect(timeout.structuredContent).toMatchObject({ error: "call_timeout", acknowledged: true });
    expect(timeout.content[0]!.text).toMatch(/did not finish within 120 s .* approval/);
    expect(bridge.auth.every((a) => a === `Bearer ${TOKEN}`)).toBe(true);
    await c.end();
    expect(c.logs.join("\n")).not.toContain(TOKEN);

    const refusing = new FakeBridge();
    const origFetch = refusing.fetch;
    (refusing as { fetch: typeof fetch }).fetch = async (input, init) => (String(input).includes("/api/world/sessions") ? json(401, { error: { code: "unauthorized", message: "token" } }) : origFetch(input, init));
    const u = new Client(refusing, { locale: "zh-CN" });
    const denied = await u.call("observe_world");
    expect(denied.structuredContent).toMatchObject({ error: "unauthorized" });
    expect(denied.content[0]!.text).toMatch(/拒绝了访问令牌/);
    await u.end();

    const down = new FakeBridge();
    (down as { fetch: typeof fetch }).fetch = async () => {
      throw new TypeError("fetch failed", { cause: new Error("connect ECONNREFUSED 127.0.0.1:5178") });
    };
    const n = new Client(down);
    const unreachable = await n.call("observe_world");
    expect(unreachable.structuredContent).toMatchObject({ error: "network" });
    expect(unreachable.content[0]!.text).toMatch(/Cannot reach the ClinicalCraft server at http:\/\/127\.0\.0\.1:5178: connect ECONNREFUSED/);
    await n.end();
  });
});
