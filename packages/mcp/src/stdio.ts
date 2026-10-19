/**
 * The MCP stdio transport loop shared by `clinicalcraft mcp` (`McpServer`)
 * and `clinicalcraft mcp --attach` (`AttachedMcpServer`): newline-delimited
 * JSON-RPC in, responses out (stdout carries protocol messages only), requests
 * handled concurrently, a parse error answered with -32700. Resolves once the
 * input ended and every in-flight request finished.
 */
import { LineSplitter, RPC_ERRORS, rpcError, type JsonRpcResponse } from "./jsonrpc.js";

/** Something that answers JSON-RPC messages (a request, a notification or a batch). */
export interface JsonRpcHandler {
  handle(value: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | null>;
}

export interface StdioOptions {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
  /** Diagnostics (never stdout). */
  log: (message: string) => void;
}

/** Serve `handler` on newline-delimited stdio until the input ends. */
export async function serveStdio(handler: JsonRpcHandler, io: StdioOptions): Promise<void> {
  let outputBroken = false;
  io.output.on("error", (err: Error) => {
    outputBroken = true;
    io.log(`output error: ${err.message}`);
  });
  const send = (message: JsonRpcResponse | JsonRpcResponse[] | null) => {
    if (message === null || outputBroken) return;
    io.output.write(`${JSON.stringify(message)}\n`);
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
    const task = handler
      .handle(value)
      .then(send, (err: unknown) => io.log(`unhandled: ${err instanceof Error ? err.message : String(err)}`))
      .finally(() => pending.delete(task));
    pending.add(task);
  };

  const splitter = new LineSplitter();
  try {
    for await (const chunk of io.input as AsyncIterable<string | Uint8Array>) {
      for (const line of splitter.push(chunk)) onLine(line);
    }
  } catch (err) {
    io.log(`input error: ${err instanceof Error ? err.message : String(err)}`);
  }
  for (const line of splitter.end()) onLine(line);
  while (pending.size > 0) await Promise.allSettled([...pending]);
}
