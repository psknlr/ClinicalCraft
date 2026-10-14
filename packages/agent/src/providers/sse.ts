/**
 * Server-Sent Events parser (WHATWG "event stream interpretation") over a
 * byte stream. Handles LF / CRLF / CR line endings (including a CRLF split
 * across chunks), multi-byte UTF-8 split across chunks, multi-line `data:`,
 * comments (`:` keep-alives), a leading BOM, and OpenAI-style `[DONE]`
 * sentinels (yielded, then iteration stops).
 */

export interface SSEMessage {
  /** `event:` field; undefined for the default "message" type. */
  event?: string;
  /** Concatenated `data:` lines (joined with "\n"). */
  data: string;
  /** `id:` field when present. */
  id?: string;
}

export interface ParseSSEOptions {
  /** Stop reading (and cancel the stream) after a `data: [DONE]` message. Default true. */
  stopOnDone?: boolean;
  /** Abort reading; the underlying reader is cancelled. */
  signal?: AbortSignal;
}

/**
 * Parse an SSE byte stream into messages. Breaking out of the loop (or an
 * abort) cancels the underlying stream. Messages without data are skipped,
 * per spec. A final message without a trailing blank line is still emitted.
 */
export async function* parseSSE(stream: ReadableStream<Uint8Array>, options: ParseSSEOptions = {}): AsyncGenerator<SSEMessage> {
  const stopOnDone = options.stopOnDone ?? true;
  const signal = options.signal;
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let first = true;
  let pendingCR = false;
  let data: string[] = [];
  let event: string | undefined;
  let id: string | undefined;
  let hasData = false;

  const onAbort = () => {
    reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  const dispatch = (): SSEMessage | null => {
    if (!hasData) {
      event = undefined;
      return null;
    }
    const msg: SSEMessage = { data: data.join("\n") };
    if (event !== undefined) msg.event = event;
    if (id !== undefined) msg.id = id;
    data = [];
    hasData = false;
    event = undefined;
    return msg;
  };

  const processLine = (line: string): SSEMessage | null => {
    if (line === "") return dispatch();
    if (line.startsWith(":")) return null;
    const colon = line.indexOf(":");
    let field: string;
    let value: string;
    if (colon === -1) {
      field = line;
      value = "";
    } else {
      field = line.slice(0, colon);
      value = line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
    }
    switch (field) {
      case "data":
        data.push(value);
        hasData = true;
        break;
      case "event":
        event = value;
        break;
      case "id":
        if (!value.includes("\0")) id = value;
        break;
      default:
        // `retry` and unknown fields are ignored.
        break;
    }
    return null;
  };

  try {
    while (true) {
      if (signal?.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      let text = decoder.decode(value, { stream: true });
      if (first && text.length > 0) {
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        first = false;
      }
      if (pendingCR && text.startsWith("\n")) text = text.slice(1);
      pendingCR = false;
      buffer += text;

      let start = 0;
      for (let i = 0; i < buffer.length; i++) {
        const ch = buffer.charCodeAt(i);
        if (ch !== 10 && ch !== 13) continue;
        const line = buffer.slice(start, i);
        if (ch === 13) {
          if (i + 1 < buffer.length) {
            if (buffer.charCodeAt(i + 1) === 10) i++;
          } else {
            pendingCR = true;
          }
        }
        start = i + 1;
        const msg = processLine(line);
        if (msg) {
          yield msg;
          if (stopOnDone && msg.data === "[DONE]") return;
        }
      }
      buffer = buffer.slice(start);
    }
    buffer += decoder.decode();
    if (buffer.length > 0) processLine(buffer);
    const last = dispatch();
    if (last) yield last;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.cancel().catch(() => undefined);
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}

/** Encode one SSE message (used by the server proxy and test fixtures). */
export function formatSSE(data: string, event?: string): string {
  const lines = data.split(/\r\n|\r|\n/).map((l) => `data: ${l}`);
  return `${event ? `event: ${event}\n` : ""}${lines.join("\n")}\n\n`;
}
