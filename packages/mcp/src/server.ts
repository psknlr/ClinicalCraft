/**
 * `@clinicalcraft/mcp` — a Model Context Protocol server over stdio
 * (newline-delimited JSON-RPC 2.0) that lets external agents (Claude Code,
 * Codex, Grok CLI…) play the clinician: `initialize`, `ping`, `tools/list`,
 * `tools/call`, `resources/list`, `resources/templates/list`,
 * `resources/read`, and the `notifications/initialized` /
 * `notifications/cancelled` notifications.
 *
 * stdout carries protocol messages only; diagnostics go to stderr. Requests
 * are handled concurrently (calls on one session are serialised), so `ping`
 * and cancellations stay responsive during a long model turn. End of input
 * waits for in-flight requests, closes every session (flushing transcripts)
 * and resolves.
 */
import type { Readable, Writable } from "node:stream";
import { CLINICALCRAFT_VERSION, type AgentProfile, type LLMProvider, type ProviderConfig, type ResolvedSettings } from "@clinicalcraft/agent";
import { loadContent, type Env, type LoadedContent } from "@clinicalcraft/agent/node";
import { normalizeLocale } from "@clinicalcraft/core";
import { classifyMessage, LineSplitter, RPC_ERRORS, RpcError, rpcError, rpcResult, type JsonRpcId, type JsonRpcRequest, type JsonRpcResponse } from "./jsonrpc.js";
import { listResources, listResourceTemplates, readResource } from "./resources.js";
import { SessionManager } from "./sessions.js";
import { callTool, checkArguments, mcpTools, type McpToolSpec, type ToolHost } from "./tools.js";

/** Newest protocol revision this server speaks. */
export const LATEST_PROTOCOL_VERSION = "2025-06-18";
/** Revisions accepted from clients (echoed back when requested). */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS =
  "ClinicalCraft runs grounded virtual-patient encounters. Call list_cases, then start_case to get a session_id, and act as the clinician " +
  "with the clinical tools (ask_patient, examine, order_test, read_result, answer_decision, …), passing session_id each time. " +
  "Patients and staff only know what the case records; missing data stays missing. Use case_status to see objectives and open decisions, " +
  "finish_case when every objective is done, and get_debrief for the assessment (a teaching-script measure, not a validated competency score).";

/** Diagnostics go to stderr: stdout belongs to the protocol. */
function stderrLog(message: string): void {
  process.stderr.write(`[clinicalcraft mcp] ${message}\n`);
}

export interface McpServerOptions {
  settings: ResolvedSettings;
  env?: Env;
  /** Project directory for settings, memory, agents, commands and hooks (default `process.cwd()`). */
  cwd?: string;
  /** Pre-loaded content (default: loaded once from the built-in and `settings.contentDirs`). */
  content?: LoadedContent;
  /** Maximum open sessions before the least recently used is closed (default 32). */
  maxSessions?: number;
  /** Diagnostics sink (default: stderr; never stdout). */
  log?: (message: string) => void;
  /** Model provider override for every agent (tests). */
  providerFactory?: (agent: AgentProfile, config: ProviderConfig) => LLMProvider;
}

export interface RunMcpServerOptions extends McpServerOptions {
  /** Input stream of newline-delimited JSON-RPC (default `process.stdin`). */
  input?: Readable | NodeJS.ReadableStream;
  /** Output stream (default `process.stdout`). */
  output?: Writable | NodeJS.WritableStream;
  /** Aliases used by the CLI. */
  stdin?: Readable | NodeJS.ReadableStream;
  stdout?: Writable | NodeJS.WritableStream;
}

/** Transport-independent MCP request handler. */
export class McpServer {
  readonly sessions: SessionManager;
  private readonly settings: ResolvedSettings;
  private readonly log: (message: string) => void;
  private contentPromise: Promise<LoadedContent> | null;
  private protocolVersion: string | null = null;
  private readonly inflight = new Map<JsonRpcId, AbortController>();
  private toolCache: { specs: McpToolSpec[]; byName: Map<string, McpToolSpec> } | null = null;

  constructor(private readonly opts: McpServerOptions) {
    this.settings = opts.settings;
    this.log = opts.log ?? stderrLog;
    this.contentPromise = opts.content ? Promise.resolve(opts.content) : null;
    this.sessions = new SessionManager({
      settings: opts.settings,
      env: opts.env ?? process.env,
      cwd: opts.cwd ?? process.cwd(),
      content: () => this.content(),
      log: this.log,
      ...(opts.maxSessions !== undefined ? { maxSessions: opts.maxSessions } : {}),
      ...(opts.providerFactory ? { providerFactory: opts.providerFactory } : {}),
    });
  }

  /** Negotiated protocol revision (null before `initialize`). */
  get negotiatedVersion(): string | null {
    return this.protocolVersion;
  }

  /** Handle one parsed message (or batch). Returns the response(s) to send, or null. */
  async handle(value: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
    if (Array.isArray(value)) {
      if (value.length === 0) return rpcError(null, RPC_ERRORS.invalidRequest, "Invalid Request: empty batch");
      const responses = (await Promise.all(value.map((v) => this.handleOne(v)))).filter((r): r is JsonRpcResponse => r !== null);
      return responses.length > 0 ? responses : null;
    }
    return this.handleOne(value);
  }

  /** Close every session. */
  async close(): Promise<void> {
    for (const controller of this.inflight.values()) controller.abort();
    await this.sessions.closeAll();
  }

  private async handleOne(value: unknown): Promise<JsonRpcResponse | null> {
    const incoming = classifyMessage(value);
    switch (incoming.kind) {
      case "invalid":
        return rpcError(incoming.id, RPC_ERRORS.invalidRequest, `Invalid Request: ${incoming.reason}`);
      case "response":
        return null;
      case "notification":
        this.notification(incoming.message.method, incoming.message.params);
        return null;
      case "request":
        return this.request(incoming.message);
      default: {
        const never: never = incoming;
        return never;
      }
    }
  }

  private notification(method: string, params: unknown): void {
    if (method === "notifications/cancelled") {
      const id = (params as { requestId?: unknown } | undefined)?.requestId;
      if (typeof id === "string" || typeof id === "number") this.inflight.get(id)?.abort();
    }
    // notifications/initialized and unknown notifications need no action.
  }

  private async request(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const controller = new AbortController();
    this.inflight.set(req.id, controller);
    try {
      const result = await this.dispatch(req.method, req.params, controller.signal);
      // A cancelled request gets no response (MCP cancellation).
      return controller.signal.aborted ? null : rpcResult(req.id, result);
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
    const p = (params && typeof params === "object" && !Array.isArray(params) ? params : {}) as Record<string, unknown>;
    if (params !== undefined && params !== null && (typeof params !== "object" || Array.isArray(params))) {
      throw new RpcError(RPC_ERRORS.invalidParams, "params must be an object");
    }
    switch (method) {
      case "initialize":
        return this.initialize(p);
      case "ping":
        return {};
      case "tools/list":
        return { tools: (await this.tools()).specs };
      case "tools/call": {
        if (typeof p.name !== "string" || !p.name) throw new RpcError(RPC_ERRORS.invalidParams, "tools/call needs a string \"name\"");
        const spec = (await this.tools()).byName.get(p.name);
        if (!spec) throw new RpcError(RPC_ERRORS.invalidParams, `Unknown tool: ${p.name}`);
        const args = checkArguments(spec, p.arguments);
        return callTool(this.toolHost(), spec.name, args, signal);
      }
      case "resources/list":
        return listResources(this.toolHost());
      case "resources/templates/list":
        return listResourceTemplates();
      case "resources/read": {
        if (typeof p.uri !== "string" || !p.uri) throw new RpcError(RPC_ERRORS.invalidParams, "resources/read needs a string \"uri\"");
        return readResource(this.toolHost(), p.uri);
      }
      default:
        throw new RpcError(RPC_ERRORS.methodNotFound, `Method not found: ${method}`);
    }
  }

  private initialize(p: Record<string, unknown>) {
    const requested = typeof p.protocolVersion === "string" ? p.protocolVersion : null;
    this.protocolVersion = requested && SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION;
    const name = (p.clientInfo as { name?: unknown } | undefined)?.name;
    this.log(`initialize from ${typeof name === "string" ? name : "client"} (protocol ${this.protocolVersion})`);
    return {
      protocolVersion: this.protocolVersion,
      capabilities: { tools: {}, resources: {} },
      serverInfo: { name: "clinicalcraft", title: "ClinicalCraft", version: CLINICALCRAFT_VERSION },
      instructions: INSTRUCTIONS,
    };
  }

  private content(): Promise<LoadedContent> {
    this.contentPromise ??= loadContent({ dirs: this.settings.contentDirs }).then((c) => {
      for (const { file, issues } of c.issues) for (const i of issues) if (i.severity === "error") this.log(`content: ${file}: ${i.path || "(root)"}: ${i.message}`);
      return c;
    });
    return this.contentPromise;
  }

  private async tools(): Promise<{ specs: McpToolSpec[]; byName: Map<string, McpToolSpec> }> {
    if (this.toolCache) return this.toolCache;
    const specs = mcpTools({ practiceScope: this.settings.practiceScope, deny: this.settings.permissions.deny });
    this.toolCache = { specs, byName: new Map(specs.map((s) => [s.name, s])) };
    return this.toolCache;
  }

  private toolHost(): ToolHost {
    return {
      sessions: this.sessions,
      locale: normalizeLocale(this.settings.locale),
      practiceScope: this.settings.practiceScope,
      deny: this.settings.permissions.deny,
      content: () => this.content(),
      log: this.log,
    };
  }
}

/**
 * Serve MCP over newline-delimited stdio until the input ends. Resolves after
 * in-flight requests finished and every session was closed.
 */
export async function runMcpServer(opts: RunMcpServerOptions): Promise<{ sessions: number }> {
  const input = (opts.input ?? opts.stdin ?? process.stdin) as NodeJS.ReadableStream;
  const output = (opts.output ?? opts.stdout ?? process.stdout) as NodeJS.WritableStream;
  const server = new McpServer(opts);
  const log = opts.log ?? stderrLog;
  let outputBroken = false;
  output.on("error", (err: Error) => {
    outputBroken = true;
    log(`output error: ${err.message}`);
  });
  const send = (message: JsonRpcResponse | JsonRpcResponse[] | null) => {
    if (message === null || outputBroken) return;
    output.write(`${JSON.stringify(message)}\n`);
  };
  const pending = new Set<Promise<void>>();
  const onLine = (line: string) => {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (err) {
      send(rpcError(null, RPC_ERRORS.parseError, `Parse error: ${(err as Error).message}`));
      return;
    }
    const task = server
      .handle(value)
      .then(send, (err: unknown) => log(`unhandled: ${err instanceof Error ? err.message : String(err)}`))
      .finally(() => pending.delete(task));
    pending.add(task);
  };

  const splitter = new LineSplitter();
  try {
    for await (const chunk of input as AsyncIterable<string | Uint8Array>) {
      for (const line of splitter.push(chunk)) onLine(line);
    }
  } catch (err) {
    log(`input error: ${err instanceof Error ? err.message : String(err)}`);
  }
  for (const line of splitter.end()) onLine(line);
  while (pending.size > 0) await Promise.allSettled([...pending]);
  const count = server.sessions.list().length;
  await server.close();
  return { sessions: count };
}
