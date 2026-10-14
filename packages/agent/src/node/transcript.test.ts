import { appendFileSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { TranscriptItem } from "../session/types.js";
import { replayTranscript } from "../transcript.js";
import { JsonlTranscript, listSessions, readTranscript, transcriptPath } from "./transcript.js";

const root = mkdtempSync(join(tmpdir(), "cc-jsonl-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const meta = (sessionId: string, caseId: string): TranscriptItem => ({
  type: "session_meta",
  ordinal: 0,
  ts: "2026-10-14T08:00:00.000Z",
  payload: { sessionId, caseId, caseVersion: "1.0.0", facilityId: null, locale: "zh-CN", provider: "offline", model: "deterministic", clinicalcraftVersion: "5.0.0" },
});

describe("JsonlTranscript", () => {
  it("builds dated paths", () => {
    expect(transcriptPath("/base", "abc/../x", new Date(Date.UTC(2026, 0, 2, 3, 4, 5)))).toBe("/base/2026/01/02/2026-01-02T03-04-05Z-abc____x.jsonl");
  });

  it("round-trips items through a single ordered writer", async () => {
    const env = { CLINICALCRAFT_HOME: join(root, "home") };
    const t = JsonlTranscript.create({ sessionId: "s-1", env, now: () => Date.UTC(2026, 9, 14, 8, 0, 0) });
    expect(t.path).toBe(join(root, "home", "sessions", "2026", "10", "14", "2026-10-14T08-00-00Z-s-1.jsonl"));
    const items: TranscriptItem[] = [meta("s-1", "acs-stemi")];
    for (let i = 1; i <= 50; i++) items.push({ type: "action", ordinal: i, ts: "2026-10-14T08:00:01.000Z", payload: { action: { type: "note", text: `n${i} 患者` }, accepted: true } });
    for (const item of items) void t.write(item);
    await t.flush();
    expect(t.failures).toBe(0);
    const back = await readTranscript(t.path);
    expect(back).toEqual(items);
    if (process.platform !== "win32") expect(statSync(t.path).mode & 0o777).toBe(0o600);

    // a torn last line (crash mid-write) is skipped
    appendFileSync(t.path, '{"type":"action","ordinal":51');
    expect(await readTranscript(t.path)).toHaveLength(51);
    expect(replayTranscript(back).actions).toHaveLength(50);

    // resume appends to the same file
    const resumed = JsonlTranscript.at(t.path);
    await resumed.write({ type: "compacted", ordinal: 52, ts: "2026-10-14T09:00:00.000Z", payload: { agent: "patient", summary: "s" } });
    expect((await readTranscript(t.path)).at(-1)).toMatchObject({ type: "compacted", ordinal: 52 });
  });

  it("reports write failures without throwing", async () => {
    const errors: Error[] = [];
    const t = JsonlTranscript.at(join(root, "missing-dir", "x.jsonl"), (e) => errors.push(e));
    await t.write(meta("x", "y"));
    await t.flush();
    expect(t.failures).toBe(1);
    expect(errors).toHaveLength(1);
  });

  it("lists sessions newest first from session_meta lines", async () => {
    const env = { CLINICALCRAFT_HOME: join(root, "list-home") };
    const a = JsonlTranscript.create({ sessionId: "older", env, now: () => Date.UTC(2026, 8, 1) });
    await a.write({ ...meta("older", "case-a"), ts: "2026-09-01T00:00:00.000Z" });
    const b = JsonlTranscript.create({ sessionId: "newer", env, now: () => Date.UTC(2026, 9, 1) });
    await b.write({ ...meta("newer", "case-b"), ts: "2026-10-01T00:00:00.000Z" });
    const sessions = await listSessions(env);
    expect(sessions.map((s) => [s.id, s.caseId, s.startedAt])).toEqual([
      ["newer", "case-b", "2026-10-01T00:00:00.000Z"],
      ["older", "case-a", "2026-09-01T00:00:00.000Z"],
    ]);
    expect(sessions[0]!.path).toBe(b.path);
    expect(await listSessions(env, { limit: 1 })).toHaveLength(1);
    expect(await listSessions({ CLINICALCRAFT_HOME: join(root, "nowhere") })).toEqual([]);
  });
});
