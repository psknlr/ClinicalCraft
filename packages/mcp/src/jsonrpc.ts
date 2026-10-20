/**
 * JSON-RPC 2.0 over newline-delimited stdio (the MCP stdio transport):
 * message shapes, standard error codes and a line splitter that tolerates
 * CRLF, blank lines and chunk boundaries anywhere.
 */

export type JsonRpcId = string | number;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId | null; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId | null; error: JsonRpcErrorObject };

/** Standard JSON-RPC and MCP error codes. */
export const RPC_ERRORS = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  /** MCP: resource not found. */
  resourceNotFound: -32002,
} as const;

/** An error that becomes a JSON-RPC error response. */
export class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

export function rpcResult(id: JsonRpcId | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(id: JsonRpcId | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

/** Classified incoming message. */
export type Incoming =
  | { kind: "request"; message: JsonRpcRequest }
  | { kind: "notification"; message: JsonRpcNotification }
  /** A response to a server→client request (unused: this server sends none). */
  | { kind: "response" }
  | { kind: "invalid"; id: JsonRpcId | null; reason: string };

function isId(v: unknown): v is JsonRpcId {
  return typeof v === "string" || (typeof v === "number" && Number.isFinite(v));
}

/** Classify one parsed JSON value. */
export function classifyMessage(value: unknown): Incoming {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { kind: "invalid", id: null, reason: "message must be a JSON object" };
  const m = value as Record<string, unknown>;
  const id = isId(m.id) ? m.id : null;
  if (m.jsonrpc !== "2.0") return { kind: "invalid", id, reason: 'jsonrpc must be "2.0"' };
  if (m.method === undefined && ("result" in m || "error" in m)) return { kind: "response" };
  if (typeof m.method !== "string" || m.method === "") return { kind: "invalid", id, reason: "method must be a non-empty string" };
  if (!("id" in m)) return { kind: "notification", message: { jsonrpc: "2.0", method: m.method, ...("params" in m ? { params: m.params } : {}) } };
  if (!isId(m.id)) return { kind: "invalid", id: null, reason: "id must be a string or a number" };
  return { kind: "request", message: { jsonrpc: "2.0", id: m.id, method: m.method, ...("params" in m ? { params: m.params } : {}) } };
}

/** Splits a byte/char stream into lines (`\n`, optional `\r`), skipping blank lines. */
export class LineSplitter {
  private buffer = "";
  private readonly decoder = new TextDecoder();

  /** Feed a chunk; returns the complete lines it finished. */
  push(chunk: string | Uint8Array): string[] {
    this.buffer += typeof chunk === "string" ? chunk : this.decoder.decode(chunk, { stream: true });
    const lines: string[] = [];
    let nl = this.buffer.indexOf("\n");
    while (nl >= 0) {
      const line = this.buffer.slice(0, nl).replace(/\r$/, "");
      this.buffer = this.buffer.slice(nl + 1);
      if (line.trim()) lines.push(line);
      nl = this.buffer.indexOf("\n");
    }
    return lines;
  }

  /** The unterminated remainder at end of input (if any). */
  end(): string[] {
    const rest = (this.buffer + this.decoder.decode()).trim();
    this.buffer = "";
    return rest ? [rest] : [];
  }
}
