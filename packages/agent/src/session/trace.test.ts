/**
 * The session's episode trace (docs/EMBODIED.md §10): scopes re-parent root
 * spans (plan → observation → navigation → …), explicit parents stay,
 * JSONL export, the empty clinical-mode trace.
 */
import { describe, expect, it } from "vitest";
import { emptyTrace, SessionTrace, traceJsonl } from "./trace.js";

function trace(): SessionTrace {
  let id = 0;
  let now = 1000;
  return new SessionTrace({ episodeId: "ep-1", caseId: "case-1", facilityId: "hospital", embodiment: "embodied", now: () => (now += 10), clock: () => 0, newId: () => `s${++id}` });
}

const span = (name: string, parentId: string | null = null) => ({ parentId, kind: "navigation" as const, name, actorId: "actor:clinician", startedAt: 0, endedAt: 1, clockStart: 0, clockEnd: 0, worldVersion: 1, ok: true, refs: {} });

describe("SessionTrace", () => {
  it("re-parents root spans recorded within a scope; nested scopes; explicit parents kept", async () => {
    const t = trace();
    const outside = t.add(span("before"));
    const plan = t.start("plan", "order_test ecg");
    await t.within(plan.id, async () => {
      t.add(span("walk"));
      const inner = t.start("plan", "skill:perform_ecg");
      await t.within(inner.id, async () => {
        t.add(span("prepare"));
      });
      inner.end({ ok: true });
      t.add(span("explicit", outside.id));
    });
    plan.end({ ok: true });
    t.add(span("after"));
    const byName = new Map(t.spans().map((s) => [s.name, s]));
    expect(byName.get("before")!.parentId).toBeNull();
    expect(byName.get("walk")!.parentId).toBe(plan.id);
    expect(byName.get("skill:perform_ecg")!.parentId).toBe(plan.id);
    expect(byName.get("prepare")!.parentId).toBe(byName.get("skill:perform_ecg")!.id);
    expect(byName.get("explicit")!.parentId).toBe(outside.id);
    expect(byName.get("after")!.parentId).toBeNull();
    expect(t.current()).toBeNull();
  });

  it("closes the scope when the flow throws", async () => {
    const t = trace();
    const plan = t.start("plan", "p");
    await expect(t.within(plan.id, async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    expect(t.current()).toBeNull();
  });

  it("exports JSON Lines: a header, then one span per line", () => {
    const t = trace();
    t.add(span("walk"));
    t.start("verification", "check").end({ ok: false, data: { why: "x" } });
    const lines = traceJsonl(t.trace()).trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines[0]).toEqual({ format: "clinicalcraft-trace@1", episodeId: "ep-1", caseId: "case-1", facilityId: "hospital", embodiment: "embodied" });
    expect(lines.slice(1).map((l) => [l.kind, l.name, l.ok])).toEqual([
      ["navigation", "walk", true],
      ["verification", "check", false],
    ]);
  });

  it("an empty clinical-mode trace", () => {
    expect(emptyTrace("ep", "case", null)).toEqual({ format: "clinicalcraft-trace@1", episodeId: "ep", caseId: "case", facilityId: "", embodiment: "clinical", spans: [] });
  });
});
