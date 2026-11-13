/**
 * The safety outcome in the browser's uploaded transcripts (audit 2026-11-12 P0-2 / P0-3, docs/PROTOCOL.md §3.2): the
 * server computes no assessment — it stores what the web session recorded, as sent. The final assessment keeps its
 * safety outcome beside the score (a critical safety failure: not passed, whatever the percentage) and a dose error
 * keeps the order as written, the dose read from it and the preset, so `clinicalcraft sessions show --web` and any
 * export read them back.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { mergeSettings } from "@clinicalcraft/agent";
import { loadContent } from "@clinicalcraft/agent/node";
import { assess, replay, type ClinicalAction } from "@clinicalcraft/core";
import { startServer } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-server-safety-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const home = join(root, "home");
mkdirSync(home, { recursive: true });
const content = await loadContent();

describe("POST /api/transcripts/:sessionId keeps the safety outcome as recorded", () => {
  it("the assessment's safety outcome (a second thrombolytic: not passed) and a dose error's three doses survive the upload", async () => {
    const stroke = content.cases.get("acute-ischemic-stroke")!.def;
    expect(stroke.interventions.find((i) => i.id === "alteplase")?.critical).toBe(true);
    // the audit's replay (P0-1): the reference path with alteplase right after tenecteplase
    const state = replay(stroke, stroke.solution.flatMap((a): ClinicalAction[] => (a.type === "intervene" && a.interventionId === "tenecteplase" ? [a, { type: "intervene", interventionId: "alteplase" }] : [a]))).state;
    const report = assess(stroke, state);
    expect(report.safety.passed).toBe(false);
    const doseError = { type: "dose.error", interventionId: "alteplase", text: "alteplase 9 mg IV", ordered: { amount: 9, unit: "mg", route: "IV" }, preset: { amount: 0.9, unit: "mg/kg", route: "IV" }, ratio: 0.13, conflicts: ["amount"], severity: "critical" };
    const items = [
      { type: "event", ordinal: 0, ts: "2026-11-12T00:00:00.000Z", payload: { id: "c1", seq: 1, msg: { type: "clinical_event", event: doseError } } },
      { type: "event", ordinal: 1, ts: "2026-11-12T00:00:01.000Z", payload: { id: "a1", seq: 2, msg: { type: "assessment", report, narrative: null, judged: [] } } },
    ];
    const server = await startServer({ port: 0, host: "127.0.0.1", settings: mergeSettings([{ source: "flag", settings: { locale: "en" } }]), staticDir: null, content, env: { CLINICALCRAFT_HOME: home, HOME: home }, log: () => undefined });
    try {
      const res = await fetch(new URL("api/transcripts/web-safety", server.url), { method: "POST", headers: { "content-type": "application/x-ndjson" }, body: items.map((i) => JSON.stringify(i)).join("\n") + "\n" });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, written: 2, stored: true });
    } finally {
      await server.close();
    }
    const stored = readFileSync(join(home, "sessions", "web", "web-safety.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as { payload: { msg: { type: string; event?: unknown; report?: typeof report } } });
    expect(stored[0]!.payload.msg.event).toEqual(doseError);
    const kept = stored[1]!.payload.msg.report!;
    expect(kept.score).toEqual(report.score);
    expect(kept.safety).toEqual(report.safety);
    expect(kept.safety).toMatchObject({ passed: false, criticalFailures: [{ interventionId: "alteplase" }] });
  });
});
