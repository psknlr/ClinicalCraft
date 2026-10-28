/**
 * MCP embodied mode (PROTOCOL §11–§12) over newline-delimited JSON-RPC on
 * in-memory stdio streams: `start_case { embodied: true }` builds a
 * headless world per session; world tools carry annotations; clinical tools
 * are spatially gated (refusals carry hint.goal for navigate_to); world tools
 * on a clinical session are refused (`not_embodied`); an approval asked
 * inside a world operation (its clinical effect) follows the two-step
 * confirmation.
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

const root = mkdtempSync(join(tmpdir(), "cc-mcp-embodied-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const content = await loadContent();
const STEMI = caseHandle("stemi-inferior-rv");

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

  /** Operate a device; when the world says where to stand first (hint), walk there and retry once. */
  async operate(session: string, target: string, operation: string, parameters?: Record<string, unknown>, confirm?: boolean): Promise<ToolResult> {
    const args = { session_id: session, target, operation, ...(parameters ? { parameters } : {}), ...(confirm ? { confirm } : {}) };
    const first = await this.call("interact_object", args);
    const goal = first.structuredContent?.data?.result?.hint?.goal;
    if (!first.isError || !goal) return first;
    expect((await this.call("navigate_to", { session_id: session, goal })).isError).toBeUndefined();
    return this.call("interact_object", args);
  }

  async end(): Promise<void> {
    this.input.end();
    await this.done;
  }
}

const settings = (patch: Record<string, unknown> = {}) => mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false }, ...patch } }]);

describe("MCP embodied mode", () => {
  it("lists the world tools (annotated) and start_case's embodied flag", async () => {
    const c = new Client(settings());
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const { tools } = await c.request<{ tools: { name: string; inputSchema: any; annotations: any; description: string }[] }>("tools/list");
    const byName = new Map(tools.map((t) => [t.name, t]));
    expect(byName.get("start_case")!.inputSchema.properties.embodied).toMatchObject({ type: "boolean" });
    expect(byName.get("observe_world")!.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
    expect(byName.get("navigate_to")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false });
    expect(byName.get("interact_object")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    expect(byName.get("navigate_to")!.inputSchema.required).toEqual(["session_id"]);
    expect(byName.get("navigate_to")!.inputSchema.properties.confirm).toBeDefined();
    expect(byName.get("observe_world")!.inputSchema.properties.confirm).toBeUndefined();
    expect(byName.get("navigate_to")!.description).toMatch(/embodied: true/);
    expect(byName.has("get_camera_frame")).toBe(false);
    await c.end();
  });

  it("start_case { embodied: true }: a headless world per session; clinical tools need the right place; hint.goal → navigate_to", async () => {
    const c = new Client(settings());
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const started = await c.call("start_case", { case_id: STEMI, embodied: true });
    expect(started.isError).toBeUndefined();
    const session = started.structuredContent!.session_id as string;
    expect(started.structuredContent).toMatchObject({ embodiment: "embodied", place: expect.any(String) });
    expect(started.content[0]!.text).toMatch(/In-world mode \(embodied\)/);

    const refused = await c.call("examine", { session_id: session, finding_id: "general" });
    expect(refused.isError).toBe(true);
    expect(refused.structuredContent!.data).toMatchObject({ code: "SPATIAL_REQUIREMENT_UNMET", hint: { goal: { kind: "interact", id: "patient:resus-1" } } });
    const walk = await c.call("navigate_to", { session_id: session, goal: refused.structuredContent!.data.hint.goal });
    expect(walk.isError).toBeUndefined();
    expect(walk.structuredContent!.data.result).toMatchObject({ status: "completed" });
    const examined = await c.call("examine", { session_id: session, finding_id: "general" });
    expect(examined.isError).toBeUndefined();

    const look = await c.call("observe_world", { session_id: session });
    expect(look.isError).toBeUndefined();
    expect(look.content[0]!.text).toMatch(/Resuscitation Room/);
    const state = JSON.parse((await c.request<{ contents: { text: string }[] }>("resources/read", { uri: `clinicalcraft://session/${session}/state` })).contents[0]!.text);
    expect(state).toMatchObject({ embodiment: "embodied", place: "Resuscitation Room" });
    const transcript = JSON.parse((await c.request<{ contents: { text: string }[] }>("resources/read", { uri: `clinicalcraft://session/${session}/transcript` })).contents[0]!.text);
    expect(transcript.events.some((e: { type: string }) => e.type === "world_action_result")).toBe(true);

    // A clinical session has no world: world tools are refused with a clear error.
    const clinical = (await c.call("start_case", { case_id: STEMI })).structuredContent!;
    expect(clinical.embodiment).toBe("clinical");
    const noWorld = await c.call("navigate_to", { session_id: clinical.session_id, target: "patient" });
    expect(noWorld.isError).toBe(true);
    expect(noWorld.structuredContent).toMatchObject({ error: "not_embodied", tool: "navigate_to" });
    expect(noWorld.content[0]!.text).toMatch(/embodied/);
    // … and its clinical tools act from anywhere, as before.
    expect((await c.call("examine", { session_id: clinical.session_id, finding_id: "general" })).isError).toBeUndefined();
    await c.end();
  });

  it("an approval asked inside a world operation (its clinical effect) is a two-step confirmation", async () => {
    const c = new Client(settings({ permissions: { ask: ["order_test(ecg-12lead)"] } }));
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const session = (await c.call("start_case", { case_id: STEMI, embodied: true })).structuredContent!.session_id as string;
    expect((await c.call("navigate_to", { session_id: session, target: "patient" })).isError).toBeUndefined();
    for (const op of ["prepare", "connect"]) expect((await c.operate(session, "eq:resus1-ecg", op)).isError, op).toBeUndefined();

    const first = await c.operate(session, "eq:resus1-ecg", "record", { investigation: "ecg-12lead" });
    expect(first.isError).toBe(true);
    expect(first.structuredContent!.refused).toMatchObject({ reason: "ask", confirm: "required", tool: "order_test" });
    expect(first.content[0]!.text).toMatch(/order_test\(ecg-12lead\)/);
    expect(first.content[0]!.text).toMatch(/confirm/);
    const state = () => c.request<{ contents: { text: string }[] }>("resources/read", { uri: `clinicalcraft://session/${session}/state` }).then((r) => JSON.parse(r.contents[0]!.text));
    expect((await state()).state.orders).toEqual([]);

    const confirmed = await c.operate(session, "eq:resus1-ecg", "record", { investigation: "ecg-12lead" }, true);
    expect(confirmed.isError).toBeUndefined();
    expect(confirmed.structuredContent!.data.result.clinical).toMatchObject({ tool: "order_test", ok: true });
    expect((await state()).state.orders.map((o: { investigationId: string }) => o.investigationId)).toEqual(["ecg-12lead"]);
    await c.end();
  });

  it("a deny rule is never bypassed through a world tool", async () => {
    const c = new Client(settings({ permissions: { deny: ["order_test(ecg-12lead)"] } }));
    await c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "vitest", version: "1" } });
    const session = (await c.call("start_case", { case_id: STEMI, embodied: true })).structuredContent!.session_id as string;
    await c.call("navigate_to", { session_id: session, target: "patient" });
    for (const op of ["prepare", "connect"]) await c.operate(session, "eq:resus1-ecg", op);
    const denied = await c.operate(session, "eq:resus1-ecg", "record", { investigation: "ecg-12lead" }, true);
    expect(denied.isError).toBe(true);
    expect(denied.structuredContent!.data.result).toMatchObject({ status: "failed", errorCode: "APPROVAL_DENIED" });
    expect(denied.content[0]!.text).toMatch(/order_test\(ecg-12lead\)/);
    await c.end();
  });
});
