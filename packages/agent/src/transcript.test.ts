import { describe, expect, it } from "vitest";
import type { TranscriptItem } from "./session/types.js";
import { MemoryTranscript, redactSecrets, replayTranscript, TranscriptRecorder } from "./transcript.js";

const meta = {
  sessionId: "s1",
  caseId: "acs-stemi",
  caseVersion: "1.0.0",
  facilityId: "ed",
  locale: "en",
  provider: "offline",
  model: "deterministic",
  clinicalcraftVersion: "5.0.0",
};

describe("MemoryTranscript + TranscriptRecorder", () => {
  it("stamps monotonic ordinals and timestamps", async () => {
    const sink = new MemoryTranscript();
    const rec = new TranscriptRecorder(sink, () => Date.UTC(2026, 9, 14, 12, 0, 0));
    rec.record("session_meta", meta);
    rec.record("action", { action: { type: "start" }, accepted: true });
    await rec.flush();
    expect(sink.items.map((i) => i.ordinal)).toEqual([0, 1]);
    expect(sink.items[0]!.ts).toBe("2026-10-14T12:00:00.000Z");
    expect(sink.ofType("action")).toHaveLength(1);
    expect(sink.path).toBeNull();
  });
});

describe("replayTranscript", () => {
  it("restores meta, accepted actions, per-agent messages, compactions and ops", () => {
    const ts = "2026-10-14T12:00:00.000Z";
    const items: TranscriptItem[] = [
      { type: "action", ordinal: 3, ts, payload: { action: { type: "ask", itemId: "onset", via: "agent" }, accepted: true } },
      { type: "session_meta", ordinal: 0, ts, payload: meta },
      { type: "op", ordinal: 1, ts, payload: { id: "sub1", op: { type: "user_message", text: "When did it start?" } } },
      { type: "action", ordinal: 2, ts, payload: { action: { type: "start" }, accepted: true } },
      { type: "action", ordinal: 4, ts, payload: { action: { type: "finish" }, accepted: false } },
      { type: "message", ordinal: 5, ts, payload: { agent: "patient", role: "user", content: [{ type: "text", text: "When did it start?" }] } },
      { type: "message", ordinal: 6, ts, payload: { agent: "patient", role: "assistant", content: "Two hours ago." } },
      { type: "message", ordinal: 7, ts, payload: { agent: "nurse", role: "user", content: [{ type: "text", text: "Vitals?" }, { type: "bogus" }] } },
      { type: "message", ordinal: 8, ts, payload: { agent: "nurse", role: "system" as never, content: "ignored" } },
      { type: "compacted", ordinal: 9, ts, payload: { agent: "patient", summary: "Chest pain 2 h." } },
      { type: "message", ordinal: 10, ts, payload: { agent: "patient", role: "assistant", content: [{ type: "text", text: "Still hurts." }] } },
      { type: "event", ordinal: 11, ts, payload: { id: "", seq: 1, msg: { type: "warning", message: "x" } } },
    ];
    const r = replayTranscript(items);
    expect(r.sessionMeta).toEqual(meta);
    expect(r.actions).toEqual([{ type: "start" }, { type: "ask", itemId: "onset", via: "agent" }]);
    expect(r.ops).toEqual([{ id: "sub1", op: { type: "user_message", text: "When did it start?" } }]);
    expect(r.messages.nurse).toEqual([{ role: "user", content: [{ type: "text", text: "Vitals?" }] }]);
    expect(r.messages.patient).toEqual([
      { role: "user", content: [{ type: "text", text: "Chest pain 2 h." }] },
      { role: "assistant", content: [{ type: "text", text: "Still hurts." }] },
    ]);
    expect(r.summaries).toEqual({ patient: "Chest pain 2 h." });
    expect(r.lastOrdinal).toBe(11);
  });

  it("handles an empty transcript", () => {
    expect(replayTranscript([])).toEqual({ sessionMeta: null, actions: [], messages: {}, summaries: {}, ops: [], lastOrdinal: -1, dialogue: [] });
  });
});

describe("transcript hardening", () => {
  it("redactSecrets masks key formats, bearer tokens and listed secrets but leaves clinical text alone", () => {
    const text =
      "auth failed for sk-ant-api03-AbCdEf0123456789_xyz; Authorization: Bearer abcdefghijklmnopqrstu; " +
      "keys sk-proj-AAAAbbbbCCCCdddd1234 xai-ABCDEFGHIJKLMNOPQRSTUVWX AIzaSyA1234567890abcdefghijklmnopqrstuv " +
      "zhipu 0123456789abcdef0123456789abcdef.AbCdEfGhIjKlMnOp x-api-key: plainheaderkey123 custom tok_live_123456789 — " +
      "risk-stratification (TIMI 3), task-1 ok, 患者胸痛 2 小时";
    const out = redactSecrets(text, ["tok_live_123456789", "abc"]);
    for (const leaked of ["sk-ant-api03", "abcdefghijklmnopqrstu", "sk-proj-AAAA", "xai-ABCD", "AIzaSy", "0123456789abcdef0123", "plainheaderkey123", "tok_live"]) {
      expect(out).not.toContain(leaked);
    }
    expect(out).toContain("Bearer [REDACTED]");
    expect(out).toContain("risk-stratification (TIMI 3), task-1 ok, 患者胸痛 2 小时");
  });

  it("TranscriptRecorder never throws when a sink fails synchronously or asynchronously", () => {
    const sync = new TranscriptRecorder({
      write() {
        throw new Error("disk full");
      },
    });
    expect(() => sync.record("action", { action: { type: "start" }, accepted: true })).not.toThrow();
    const async = new TranscriptRecorder({ write: () => Promise.reject(new Error("disk full")) });
    expect(() => async.record("action", { action: { type: "start" }, accepted: true })).not.toThrow();
  });
});
