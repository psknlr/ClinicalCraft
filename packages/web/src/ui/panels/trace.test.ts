/**
 * The autopilot window's live trace (no DOM): spans grouped into steps, a
 * running step shown before its plan span is recorded, failures with their
 * code and the place the world's hint names.
 */
import type { TraceSpan } from "@clinicalcraft/world";
import { describe, expect, it } from "vitest";
import { traceGroups } from "./trace.js";

let n = 0;
const span = (kind: TraceSpan["kind"], name: string, parentId: string | null, extra: Partial<TraceSpan> = {}): TraceSpan => ({
  id: extra.id ?? `s${++n}`,
  parentId,
  kind,
  name,
  actorId: "actor:clinician",
  startedAt: n,
  endedAt: n,
  clockStart: 0,
  clockEnd: 0,
  worldVersion: 1,
  ok: true,
  refs: {},
  ...extra,
});

describe("traceGroups", () => {
  it("groups a finished step's spans under its plan span, in order, with depths", () => {
    const nav = span("navigation", "navigate", "p1", { id: "n1" });
    const moved = span("state_change", "actor.moved", "n1");
    const use = span("interaction", "record", "p1", { id: "i1" });
    const order = span("clinical_action", "order_test", "i1");
    const plan = span("plan", "order_test ecg-12lead", null, { id: "p1" });
    const groups = traceGroups([nav, moved, use, order, plan]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id: "p1", name: "order_test ecg-12lead", ok: true, actorId: "actor:clinician" });
    expect(groups[0]!.steps.map((s) => [s.kind, s.name, s.depth])).toEqual([
      ["navigation", "navigate", 0],
      ["state_change", "actor.moved", 1],
      ["interaction", "record", 0],
      ["clinical_action", "order_test", 1],
    ]);
  });

  it("shows a step that is still running (its plan span not recorded yet)", () => {
    const groups = traceGroups([span("navigation", "navigate", "p9", { id: "n9" }), span("state_change", "actor.moved", "n9")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id: "p9", ok: null, name: "navigate" });
    expect(groups[0]!.steps).toHaveLength(2);
  });

  it("marks failures with their error code and the place the hint names", () => {
    const fail = span("interaction", "use", "p2", { ok: false, refs: { actionId: "wa-1", errorCode: "NOT_IN_RANGE" } });
    const plan = span("plan", "intervene iv-access", null, { id: "p2", ok: false });
    const groups = traceGroups([fail, plan], (id) => (id === "wa-1" ? "Resus 1" : null));
    expect(groups[0]).toMatchObject({ ok: false });
    expect(groups[0]!.steps[0]).toMatchObject({ ok: false, errorCode: "NOT_IN_RANGE", hint: "Resus 1" });
  });

  it("keeps a lone action as its own step and leaves lone observations out", () => {
    const look = span("observation", "inspect", null);
    const attach = span("interaction", "attach", null, { id: "a1" });
    const child = span("state_change", "entity.state", "a1");
    const groups = traceGroups([look, attach, child]);
    expect(groups.map((g) => g.id)).toEqual(["a1"]);
    expect(groups[0]!.steps.map((s) => [s.name, s.depth])).toEqual([
      ["attach", 0],
      ["entity.state", 1],
    ]);
  });

  it("returns the last `limit` steps, oldest first", () => {
    const spans: TraceSpan[] = [];
    for (let i = 0; i < 12; i++) spans.push(span("interaction", `op${i}`, null, { id: `x${i}` }));
    const groups = traceGroups(spans, undefined, 5);
    expect(groups.map((g) => g.name)).toEqual(["op7", "op8", "op9", "op10", "op11"]);
  });
});
