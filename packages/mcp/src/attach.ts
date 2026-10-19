/**
 * `clinicalcraft mcp --attach <server>` (docs/EMBODIED.md §12, docs/PROTOCOL.md
 * §13): an MCP stdio server whose clinical and world tools act in a learner's
 * LIVE browser session through `clinicalcraft serve` (the world bridge),
 * instead of a headless session of its own.
 *
 * - `list_live_sessions` lists the sessions whose learner enabled external
 *   control; every other tool takes an optional `session_id` (a live-session
 *   id): default `--world-session`, else the only open session (connected ones
 *   first); none open → "no live browser session — open the web world and
 *   enable external control"; several → an error asking to choose.
 * - Each call gets a correlation id and a timeout (`callTimeoutMs`); MCP
 *   `notifications/cancelled` cancels it in the browser (a `cancel` command)
 *   and the request gets no response.
 * - The browser runs the call as the clinician through its session's own tool
 *   path; an approval request goes to the LEARNER, who approves or denies it in
 *   the browser — this server cannot answer approvals (no `confirm` argument,
 *   no route), it only reports what the learner decided.
 */
import { CLINICALCRAFT_VERSION, clinicalTools, isLiveSessionId, WORLD_TOOL_SPECS, WorldAttachClient, type AttachFailure, type BridgeToolResult, type LiveSessionInfo } from "@clinicalcraft/agent";
import { normalizeLocale } from "@clinicalcraft/core";
import { mm } from "./i18n.js";
import { classifyMessage, RPC_ERRORS, RpcError, rpcError, rpcResult, type JsonRpcId, type JsonRpcRequest, type JsonRpcResponse } from "./jsonrpc.js";
import { LATEST_PROTOCOL_VERSION, safeLog, SUPPORTED_PROTOCOL_VERSIONS } from "./server.js";
import { serveStdio, type JsonRpcHandler } from "./stdio.js";
import { checkArguments, MCP_WORLD_TOOLS, textResult, toolAnnotations, type McpToolResult, type McpToolSpec } from "./tools.js";

const INSTRUCTIONS =
  "You are attached to a learner's LIVE ClinicalCraft encounter in the browser (the 3D web world served by `clinicalcraft serve`). " +
  "Your tools act there as the clinician: the learner sees what you do, and every action that needs approval (e.g. a moderate- or high-risk drug) " +
  "is shown to the learner, who approves or denies it — you cannot approve your own requests; a denial is reported as status \"denied\". " +
  "list_live_sessions shows the open sessions; pass session_id when there are several. Patients and staff only know what the case records. " +
  "In an embodied encounter you have a body: observe_world, find_entities, navigate_to and interact_object move and act, and the clinical tools need " +
  "you in the right place — a refusal carries data.hint.goal to pass to navigate_to.";

const LIVE_SESSION_ID_SCHEMA = {
  type: "string",
  minLength: 8,
  maxLength: 64,
  description: "Live session id from list_live_sessions (optional while exactly one live session is open, or with --world-session).",
};

function liveSpec(name: string, description: string, inputSchema: Record<string, unknown>): McpToolSpec {
  const annotations = toolAnnotations(name);
  const properties = (inputSchema.properties ?? {}) as Record<string, unknown>;
  return {
    name,
    title: annotations.title,
    description: `${description} Acts in the learner's live browser session (see list_live_sessions); an action that needs approval waits for the learner to approve or deny it there.`,
    inputSchema: { ...inputSchema, type: "object", properties: { session_id: LIVE_SESSION_ID_SCHEMA, ...properties }, additionalProperties: false },
    annotations,
  };
}

/** The tools of attach mode: `list_live_sessions`, then every clinical and world tool, forwarded (no `confirm`: the learner approves). */
export function attachTools(): McpToolSpec[] {
  const clinical = clinicalTools().map((tool) => liveSpec(tool.name, tool.description, tool.inputSchema));
  const world = WORLD_TOOL_SPECS.filter((spec) => MCP_WORLD_TOOLS.includes(spec.name)).map((spec) => liveSpec(spec.name, `${spec.description} Embodied encounters only.`, spec.inputSchema));
  const title = "Live sessions";
  return [
    {
      name: "list_live_sessions",
      title,
      description:
        "List the learners' live browser sessions you can act in (their learner enabled external control): id, spoiler-free case handle and title, embodied or clinical, " +
        "facility, whether the browser is connected, and the tools each accepts.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    ...clinical,
    ...world,
  ];
}

export interface AttachMcpOptions {
  /** `clinicalcraft serve`'s base URL (no credentials, query or fragment). */
  serverUrl: string;
  /** The server's access token, when it has one (never logged). */
  token?: string | null;
  /** Pin one live session (`--world-session`). */
  worldSession?: string | null;
  /** How long a call waits for the live session (ms, default 120 s; approvals included). */
  callTimeoutMs?: number;
  /** Language of this server's own messages (tool outputs come from the live session). */
  locale?: string;
  /** Diagnostics (default stderr; receives terminal-sanitised text). */
  log?: (message: string) => void;
  fetch?: typeof fetch;
  /** Correlation id prefix (default random). */
  idPrefix?: string;
}

export interface RunAttachedMcpServerOptions extends AttachMcpOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
}

function stderrLog(message: string): void {
  process.stderr.write(`[clinicalcraft mcp] ${message}\n`);
}

function randomPrefix(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return `mcp-${(c?.randomUUID?.() ?? Math.random().toString(16).slice(2)).replace(/-/g, "").slice(0, 10)}`;
}

/** MCP over the world bridge (transport-independent; see `runAttachedMcpServer`). */
export class AttachedMcpServer implements JsonRpcHandler {
  readonly client: WorldAttachClient;
  private readonly specs = attachTools();
  private readonly byName = new Map(this.specs.map((s) => [s.name, s]));
  private readonly inflight = new Map<JsonRpcId, AbortController>();
  private readonly log: (message: string) => void;
  private readonly L: string;
  private readonly timeoutMs: number;
  private readonly prefix: string;
  private seq = 0;
  private protocolVersion: string | null = null;

  constructor(private readonly opts: AttachMcpOptions) {
    this.client = new WorldAttachClient({ serverUrl: opts.serverUrl, token: opts.token ?? null, ...(opts.fetch ? { fetch: opts.fetch } : {}) });
    this.log = safeLog(opts.log ?? stderrLog);
    this.L = normalizeLocale(opts.locale ?? "en");
    this.timeoutMs = opts.callTimeoutMs ?? 120_000;
    this.prefix = opts.idPrefix ?? randomPrefix();
  }

  /** Negotiated protocol revision (null before `initialize`). */
  get negotiatedVersion(): string | null {
    return this.protocolVersion;
  }

  async handle(value: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
    if (Array.isArray(value)) {
      if (value.length === 0) return rpcError(null, RPC_ERRORS.invalidRequest, "Invalid Request: empty batch");
      const responses = (await Promise.all(value.map((v) => this.handleOne(v)))).filter((r): r is JsonRpcResponse => r !== null);
      return responses.length > 0 ? responses : null;
    }
    return this.handleOne(value);
  }

  /** Abort every in-flight call (each is cancelled in the browser). */
  async close(): Promise<void> {
    for (const controller of this.inflight.values()) controller.abort();
  }

  private async handleOne(value: unknown): Promise<JsonRpcResponse | null> {
    const incoming = classifyMessage(value);
    switch (incoming.kind) {
      case "invalid":
        return rpcError(incoming.id, RPC_ERRORS.invalidRequest, `Invalid Request: ${incoming.reason}`);
      case "response":
        return null;
      case "notification":
        if (incoming.message.method === "notifications/cancelled") {
          const id = (incoming.message.params as { requestId?: unknown } | undefined)?.requestId;
          if (typeof id === "string" || typeof id === "number") this.inflight.get(id)?.abort();
        }
        return null;
      case "request":
        return this.request(incoming.message);
      default: {
        const never: never = incoming;
        return never;
      }
    }
  }

  private async request(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const controller = new AbortController();
    this.inflight.set(req.id, controller);
    try {
      const result = await this.dispatch(req.method, req.params, controller.signal);
      return controller.signal.aborted ? null : rpcResult(req.id, result); // a cancelled request gets no response
    } catch (err) {
      if (controller.signal.aborted) return null;
      if (err instanceof RpcError) return rpcError(req.id, err.code, err.message, err.data);
      this.log(`${req.method} failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
      return rpcError(req.id, RPC_ERRORS.internalError, `Internal error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (this.inflight.get(req.id) === controller) this.inflight.delete(req.id);
    }
  }

  private async dispatch(method: string, params: unknown, signal: AbortSignal): Promise<unknown> {
    if (params !== undefined && params !== null && (typeof params !== "object" || Array.isArray(params))) throw new RpcError(RPC_ERRORS.invalidParams, "params must be an object");
    const p = (params ?? {}) as Record<string, unknown>;
    switch (method) {
      case "initialize": {
        const requested = typeof p.protocolVersion === "string" ? p.protocolVersion : null;
        this.protocolVersion = requested && SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION;
        const name = (p.clientInfo as { name?: unknown } | undefined)?.name;
        this.log(`initialize from ${typeof name === "string" ? name : "client"} (protocol ${this.protocolVersion}), attached to ${this.client.serverUrl}`);
        return {
          protocolVersion: this.protocolVersion,
          capabilities: { tools: {} },
          serverInfo: { name: "clinicalcraft", title: "ClinicalCraft (live session)", version: CLINICALCRAFT_VERSION },
          instructions: INSTRUCTIONS,
        };
      }
      case "ping":
        return {};
      case "tools/list":
        return { tools: this.specs };
      case "tools/call": {
        if (typeof p.name !== "string" || !p.name) throw new RpcError(RPC_ERRORS.invalidParams, 'tools/call needs a string "name"');
        const spec = this.byName.get(p.name);
        if (!spec) throw new RpcError(RPC_ERRORS.invalidParams, `Unknown tool: ${p.name}`);
        return this.callTool(spec.name, checkArguments(spec, p.arguments), signal);
      }
      case "resources/list":
        return { resources: [] };
      case "resources/templates/list":
        return { resourceTemplates: [] };
      default:
        throw new RpcError(RPC_ERRORS.methodNotFound, `Method not found: ${method}`);
    }
  }

  private failure(tool: string, live: LiveSessionInfo | null, error: AttachFailure): McpToolResult {
    const L = this.L;
    const server = this.client.serverUrl;
    let text: string;
    if (error.code === "network") text = mm(L, "attach.unreachable", { server, message: error.message });
    else if (error.code === "unauthorized" || error.status === 401) text = mm(L, "attach.unauthorized", { server });
    else if (error.code === "call_timeout") text = mm(L, "attach.timeout", { tool, seconds: Math.round(this.timeoutMs / 1000), message: error.message });
    else text = mm(L, "attach.failed", { tool, message: error.message, code: error.code });
    return textResult(text, { ...(live ? { session_id: live.id } : {}), tool, ok: false, error: error.code, ...(error.acknowledged !== undefined ? { acknowledged: error.acknowledged } : {}) }, true);
  }

  private sessionLine(s: LiveSessionInfo): string {
    return mm(this.L, "attach.sessionLine", {
      id: s.id,
      title: s.title ?? s.caseHandle,
      embodiment: s.embodiment,
      facility: s.facilityId ?? "-",
      state: mm(this.L, s.connected ? "attach.connected" : "attach.disconnected"),
    });
  }

  private async listLive(signal: AbortSignal): Promise<McpToolResult> {
    const list = await this.client.list(signal);
    if (!list.ok) return this.failure("list_live_sessions", null, list.error);
    const server = this.client.serverUrl;
    const text = list.value.length === 0 ? mm(this.L, "attach.noSession", { server }) : [mm(this.L, "attach.sessionsHeader", { server, count: list.value.length }), ...list.value.map((s) => this.sessionLine(s))].join("\n");
    return textResult(text, { server, sessions: list.value });
  }

  /** The live session a call acts in: requested, pinned, or the only one open. */
  private async pick(requested: string | null, signal: AbortSignal): Promise<{ session: LiveSessionInfo } | { error: McpToolResult }> {
    const L = this.L;
    const server = this.client.serverUrl;
    const id = requested ?? this.opts.worldSession ?? null;
    if (id !== null) {
      const got = isLiveSessionId(id) ? await this.client.get(id, signal) : ({ ok: false, error: { code: "unknown_session", status: 404, message: "" } } as const);
      if (got.ok) return { session: got.value };
      if (!["unknown_session", "session_expired", "session_closed"].includes(got.error.code)) return { error: this.failure("list_live_sessions", null, got.error) };
      const open = await this.client.list(signal);
      const names = open.ok && open.value.length ? open.value.map((s) => s.id).join(", ") : mm(L, "attach.none");
      return { error: textResult(mm(L, "attach.unknownSession", { id, server, open: names }), { session_id: id, ok: false, error: "unknown_live_session" }, true) };
    }
    const list = await this.client.list(signal);
    if (!list.ok) return { error: this.failure("list_live_sessions", null, list.error) };
    const connected = list.value.filter((s) => s.connected);
    const candidates = connected.length > 0 ? connected : list.value;
    if (candidates.length === 0) return { error: textResult(mm(L, "attach.noSession", { server }), { ok: false, error: "no_live_session", server }, true) };
    if (candidates.length > 1) {
      return { error: textResult(mm(L, "attach.choose", { count: candidates.length, list: candidates.map((s) => this.sessionLine(s)).join(" ") }), { ok: false, error: "choose_live_session", sessions: candidates }, true) };
    }
    return { session: candidates[0]! };
  }

  private async callTool(name: string, args: Record<string, unknown>, signal: AbortSignal): Promise<McpToolResult> {
    if (name === "list_live_sessions") return this.listLive(signal);
    const { session_id: requested, ...toolArgs } = args;
    const picked = await this.pick(typeof requested === "string" ? requested : null, signal);
    if ("error" in picked) return picked.error;
    const live = picked.session;
    if (!live.capabilities.includes(name)) {
      const embodiedOnly = MCP_WORLD_TOOLS.includes(name) && live.embodiment !== "embodied";
      return textResult(mm(this.L, embodiedOnly ? "attach.notEmbodied" : "attach.notAvailable", { tool: name, tools: live.capabilities.join(", ") || "-" }), { session_id: live.id, tool: name, ok: false, error: embodiedOnly ? "not_embodied" : "not_available" }, true);
    }
    const correlationId = `${this.prefix}-${++this.seq}`;
    // MCP cancellation: stop the call in the browser too (the request itself gets no response).
    const onAbort = () => void this.client.cancel(live.id, correlationId);
    signal.addEventListener("abort", onAbort, { once: true });
    let outcome: Awaited<ReturnType<WorldAttachClient["call"]>>;
    try {
      outcome = await this.client.call(live.id, { correlationId, tool: name, args: toolArgs, timeoutMs: this.timeoutMs }, signal);
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
    if (!outcome.ok) {
      this.log(`${name} in live session ${live.id} (${correlationId}): ${outcome.error.code}`);
      return this.failure(name, live, outcome.error);
    }
    const r = outcome.value.result;
    this.log(`${name} in live session ${live.id} (${correlationId}): ${r.status}`);
    return textResult(this.resultText(r), {
      session_id: live.id,
      tool: name,
      ok: r.ok,
      status: r.status,
      correlation_id: correlationId,
      data: r.data ?? null,
      ...(r.approvals?.length ? { approvals: r.approvals } : {}),
      ...(r.notices?.length ? { notices: r.notices } : {}),
      ...(r.warnings?.length ? { warnings: r.warnings } : {}),
      ...(r.truncated ? { truncated: true } : {}),
    }, !r.ok);
  }

  private resultText(r: BridgeToolResult): string {
    const approvals = r.approvals?.length ? mm(this.L, "attach.approvals", { list: r.approvals.map((a) => `${a.summary || a.tool} → ${a.decision}`).join("; ") }) : "";
    return [r.output, r.notices?.length ? r.notices.map((n) => `! ${n}`).join("\n") : "", (r.warnings ?? []).map((w) => mm(this.L, "notice.line", { text: w })).join("\n"), approvals].filter(Boolean).join("\n\n");
  }
}

/**
 * Serve attach mode over newline-delimited stdio until the input ends and the
 * in-flight calls finished (each bounded by its timeout; a call whose HTTP
 * request goes away — this process exiting — is cancelled by the server).
 */
export async function runAttachedMcpServer(opts: RunAttachedMcpServerOptions): Promise<void> {
  const input = (opts.input ?? opts.stdin ?? process.stdin) as NodeJS.ReadableStream;
  const output = (opts.output ?? opts.stdout ?? process.stdout) as NodeJS.WritableStream;
  const log = safeLog(opts.log ?? stderrLog);
  const server = new AttachedMcpServer({ ...opts, log });
  log(`attach mode: ${server.client.serverUrl}${opts.worldSession ? ` (live session ${opts.worldSession})` : ""}`);
  await serveStdio(server, { input, output, log });
  await server.close();
}
