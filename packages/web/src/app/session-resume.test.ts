/**
 * Web session start-up from a local save (no DOM): the workup plan survives a
 * save/load (L11), and a page not served by `clinicalcraft serve` keeps no
 * transcript copy in memory (L12).
 */
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionSnapshot, TranscriptItem } from "@clinicalcraft/agent";
import { parseCase } from "@clinicalcraft/core";
import { DEFAULT_INVENTORY, EXPORT_FORMAT, SaveStore } from "./persistence.js";
import { NullTranscriptSink, restoredPlan, startAppSession, type AppSession } from "./session.js";
import { defaultSettings } from "./settings.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const parsed = parseCase(JSON.parse(fs.readFileSync(path.resolve(here, "../../../content/cases/stemi-inferior-rv/case.json"), "utf8")));
if (!parsed.ok) throw new Error("stemi-inferior-rv does not parse");
const caseDef = parsed.value;

const offline = { provider: "offline", model: null, mode: "offline" as const, fellBack: false };
const plan = [
  { text: "12-lead ECG within 10 minutes", status: "completed" },
  { text: "Right-sided leads", status: "in_progress" },
  { text: "Activate the cath lab", status: "pending" },
];

function snapshot(extra: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    format: "clinicalcraft-session@1",
    sessionId: "saved-1",
    caseId: caseDef.id,
    caseVersion: caseDef.version,
    facilityId: null,
    locale: "en",
    actions: [{ type: "start" }, { type: "ask", itemId: "pain-site" }],
    messages: {},
    plan,
    createdAt: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

let open: AppSession | null = null;
async function start(resume: SessionSnapshot | null): Promise<AppSession> {
  open = await startAppSession({ caseDef, facility: null, catalogs: [], stored: defaultSettings(), choice: offline, locale: "en", served: false, resume });
  return open;
}

afterEach(async () => {
  await open?.close();
  open = null;
});

describe("resuming a saved web game (L11)", () => {
  it("restores the published workup plan into the session and the journal store", async () => {
    const app = await start(snapshot());
    expect(app.session.state.asked).toContain("pain-site");
    expect(app.session.workupPlan()).toEqual({ items: plan, explanation: null });
    expect(app.store.plan?.items).toEqual(plan);
    // …and the next save carries it again.
    expect(app.snapshot().plan).toEqual(plan);
  });

  it("drops plan items with an unknown status", async () => {
    expect(restoredPlan([{ text: "a", status: "done" }, { text: "b", status: "pending" }, { text: 3, status: "pending" } as never])).toEqual([{ text: "b", status: "pending" }]);
    const app = await start(snapshot({ plan: [{ text: "x", status: "bogus" }] }));
    expect(app.session.workupPlan().items).toEqual([]);
    expect(app.store.plan).toBeNull();
  });

  it("a new game starts with no plan", async () => {
    const app = await start(null);
    expect(app.session.workupPlan().items).toEqual([]);
    expect(app.store.plan).toBeNull();
  });

  it("save validation keeps only well-formed plan items", () => {
    const known = { cases: new Set([caseDef.id]), facilities: new Set(["general-hospital"]) };
    const session = snapshot({ plan: [...plan, { text: "y", status: "maybe" }, { text: 5, status: "pending" } as never] });
    const r = SaveStore.parseImport(JSON.stringify({ format: EXPORT_FORMAT, version: 1, session, facilityId: "general-hospital", world: null, inventory: { ...DEFAULT_INVENTORY }, settings: {} }), known);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.session.plan).toEqual(plan);
  });
});

describe("transcript retention when not served (L12)", () => {
  it("uses a sink that keeps nothing", async () => {
    const app = await start(null);
    expect(app.transcript).toBeInstanceOf(NullTranscriptSink);
    for (let i = 0; i < 40; i++) await app.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 0.25 } });
    expect(app.session.state.clock).toBe(10);
    expect(Object.values(app.transcript).some((v) => Array.isArray(v) && v.length > 0)).toBe(false);
    // The recorder still numbers items, so a later resume into a transcript continues the sequence.
    expect(app.snapshot().nextOrdinal).toBeGreaterThan(0);
  });

  it("NullTranscriptSink accepts writes and flushes without retaining them", async () => {
    const sink = new NullTranscriptSink();
    sink.write({ type: "action", ordinal: 0, ts: "2026-01-01T00:00:00.000Z", payload: { action: { type: "start" }, accepted: true } } as TranscriptItem);
    await expect(sink.flush()).resolves.toBeUndefined();
    expect(sink.path).toBeNull();
    expect(Object.keys(sink)).toEqual(["path"]);
  });
});
