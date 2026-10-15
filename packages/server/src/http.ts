/**
 * Small node:http helpers: JSON responses, typed API errors and a bounded
 * request-body reader.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

/** Default request body limit (2 MB). */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** An error that maps to an HTTP status and a stable API error code. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Send a JSON body (no-op when the response has already started). */
export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  if (res.headersSent) {
    if (!res.writableEnded) res.end();
    return;
  }
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(Buffer.byteLength(text)),
    "cache-control": "no-store",
    ...headers,
  });
  res.end(res.req?.method === "HEAD" ? undefined : text);
}

/** `{ error: { code, message } }` with the given status. */
export function sendError(res: ServerResponse, status: number, code: string, message: string, headers: Record<string, string> = {}): void {
  sendJson(res, status, { error: { code, message } }, headers);
}

/**
 * Read the whole request body, refusing more than `limit` bytes (413). The
 * declared `Content-Length` is checked before reading anything.
 */
export function readBody(req: IncomingMessage, limit: number, tooLarge: () => HttpError): Promise<Buffer> {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > limit) {
    req.resume();
    return Promise.reject(tooLarge());
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    const finish = (err: Error | null, value?: Buffer) => {
      if (done) return;
      done = true;
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
      req.off("aborted", onAborted);
      if (err) reject(err);
      else resolve(value!);
    };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.resume(); // drain without buffering
        finish(tooLarge());
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => finish(null, Buffer.concat(chunks, size));
    const onError = (err: Error) => finish(err);
    const onAborted = () => finish(new HttpError(400, "aborted", "request aborted"));
    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
    req.on("aborted", onAborted);
  });
}

/** Media type of the request (`application/json; charset=utf-8` → `application/json`). */
export function mediaType(req: IncomingMessage): string {
  return String(req.headers["content-type"] ?? "")
    .split(";")[0]!
    .trim()
    .toLowerCase();
}
