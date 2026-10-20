import { describe, expect, it } from "vitest";
import type { WorldActionRequest, WorldActionResult } from "./contracts.js";
import { TraceRecorder, recordActionSpans } from "./trace.js";
import { counters } from "./__fixtures__/world.js";

const recorder = (maxSpans?: number) => {
  const { newId, now } = counters("s");
  let minute = 0;
  return { r: new TraceRecorder({ episodeId: "e", caseId: "c", facilityId: "f", now, clock: () => (minute += 1), newId, ...(maxSpans ? { maxSpans } : {}) }) };
};

describe("TraceRecorder", () => {
  it("open spans record their end; parent ids link them; injected clocks", () => {
    const { r } = recorder();
    const root = r.start("plan", "plan-route", { actorId: "actor:clinician", worldVersion: 3 });
    const child = r.start("verification", "check", { parentId: root.id, refs: { actionId: "a" } });
    const c = child.end({ ok: false, refs: { errorCode: "NOT_IN_RANGE" } });
    const p = root.end({ ok: true, data: { steps: 2 } });
    expect(c).toMatchObject({ parentId: root.id, kind: "verification", ok: false, refs: { actionId: "a", errorCode: "NOT_IN_RANGE" }, worldVersion: 0 });
    expect(p).toMatchObject({ id: root.id, parentId: null, actorId: "actor:clinician", worldVersion: 3, data: { steps: 2 } });
    expect(p.endedAt).toBeGreaterThan(p.startedAt);
    expect(p.clockEnd).toBeGreaterThan(p.clockStart);
    expect(r.spans().map((s) => s.name)).toEqual(["check", "plan-route"]);
    expect(r.trace()).toMatchObject({ format: "clinicalcraft-trace@1", episodeId: "e", embodiment: "embodied", spans: r.spans() });
  });

  it("an open span keeps the data it was started with; data given at its end is merged over it (like refs)", () => {
    const { r } = recorder();
    const plan = r.start("plan", "order_test ecg-12lead", { data: { tool: "order_test", args: { investigationId: "ecg-12lead" } } });
    expect(plan.end({ ok: true, data: { status: "ok" } }).data).toEqual({ tool: "order_test", args: { investigationId: "ecg-12lead" }, status: "ok" });
    expect(r.start("plan", "p", { data: { a: 1 } }).end({ ok: true, data: { a: 2 } }).data).toEqual({ a: 2 });
    expect(r.start("plan", "q").end({ ok: true }).data).toBeUndefined();
  });

  it("keeps at most maxSpans; JSONL has a header and one span per line", () => {
    const { r } = recorder(2);
    for (let i = 0; i < 3; i++) r.add({ parentId: null, kind: "assessment", name: `n${i}`, actorId: null, startedAt: i, endedAt: i, clockStart: 0, clockEnd: 0, worldVersion: 0, ok: true, refs: {} });
    expect(r.spans().map((s) => s.name)).toEqual(["n1", "n2"]);
    const lines = r.toJsonl().trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0])).toEqual({ format: "clinicalcraft-trace@1", episodeId: "e", caseId: "c", facilityId: "f", embodiment: "embodied" });
  });

  it("recordActionSpans: a root per action and children for the clinical effect and the state change", () => {
    const { r } = recorder();
    const request: WorldActionRequest = { actionId: "a1", actorId: "actor:clinician", operation: "record", targetId: "eq:ecg" };
    const result: WorldActionResult = {
      actionId: "a1",
      status: "completed",
      message: "ok",
      worldVersion: 7,
      clinical: { tool: "order_test", ok: true, output: "ordered" },
      clinicalEventIds: ["e1"],
      events: [{ id: "x", type: "entity.state", entityId: "eq:ecg", from: "connected", to: "completed", operation: "record", actorId: "actor:clinician" }],
    };
    const spans = recordActionSpans(r, request, result, { startedAt: 1, endedAt: 2, clockStart: 0, clockEnd: 1 });
    expect(spans.map((s) => [s.kind, s.parentId === null])).toEqual([
      ["interaction", true],
      ["clinical_action", false],
      ["state_change", false],
    ]);
    expect(spans[0].refs).toEqual({ actionId: "a1", entities: ["eq:ecg"], clinicalEventIds: ["e1"] });
    expect(spans[1]).toMatchObject({ name: "order_test", refs: { clinicalEventIds: ["e1"] } });
    expect(spans[2]).toMatchObject({ name: "entity.state", refs: { entities: ["eq:ecg"] } });
    const nav = recordActionSpans(r, { ...request, operation: "move_to" }, { ...result, clinical: undefined, events: [] }, { startedAt: 1, endedAt: 2, clockStart: 0, clockEnd: 1 });
    expect(nav.map((s) => s.kind)).toEqual(["navigation"]);
  });
});
