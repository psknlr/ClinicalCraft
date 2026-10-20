/**
 * The action bus ↔ the session's tool path (`ClinicalPort`, review round
 * C4/C13): every clinical effect names the world action it carries out (the
 * session runs it through exactly that action's caller), and a refusal of the
 * session's own gates that is not the approval gate's — the spatial re-check
 * right before the engine commit, the scope of practice — keeps its code and
 * hint instead of becoming a generic `CLINICAL_REJECTED`.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "./contracts.js";
import { makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;

async function toPatient(w: TestWorld): Promise<void> {
  const r = await w.act({ actorId: A, operation: "approach", targetId: w.patientId });
  expect(r.status, r.message).toBe("completed");
}

describe("ClinicalPort.invoke receives the world action id (C4)", () => {
  it("each clinical effect names the action it belongs to", async () => {
    const w = makeWorld("dka-adult");
    await toPatient(w);
    const r = await w.act({ actionId: "att-1", actorId: A, operation: "attach", targetId: "resus1-monitor" });
    expect(r.status, r.message).toBe("completed");
    expect(w.harness.calls.at(-1)).toMatchObject({ tool: "intervene", actionId: "att-1" });
  });
});

describe("a refusal of the session's tool path keeps its code and hint (C13)", () => {
  it("the spatial re-check before the commit: SPATIAL_PRECONDITION_CHANGED with the hint, nothing committed", async () => {
    const w = makeWorld("dka-adult");
    await toPatient(w);
    const hint = { goal: { kind: "interact" as const, id: w.patientId }, label: "the patient" };
    w.harness.gate = () => ({ outcome: "spatial", code: "SPATIAL_PRECONDITION_CHANGED", message: "You moved away from the patient.", hint });
    const r = await w.act({ actorId: A, operation: "attach", targetId: "resus1-monitor" });
    expect(r).toMatchObject({ status: "failed", errorCode: "SPATIAL_PRECONDITION_CHANGED", hint });
    expect(r.message).toMatch(/moved away/);
    expect(r.clinical).toMatchObject({ tool: "intervene", ok: false });
    expect(w.harness.state().interventions).toEqual([]);
    expect(w.runtime.inspect(A, "resus1-monitor")!.state).toBe("detached");
  });

  it("the scope of practice: NOT_AUTHORIZED, no hint (no walk fixes it)", async () => {
    const w = makeWorld("dka-adult");
    await toPatient(w);
    w.harness.gate = () => ({ outcome: "unauthorized", message: "A nurse does not do that." });
    const r = await w.act({ actorId: A, operation: "attach", targetId: "resus1-monitor" });
    expect(r).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED" });
    expect(r.hint ?? null).toBeNull();
    expect(r.message).toMatch(/nurse/);
    expect(w.harness.state().interventions).toEqual([]);
  });
});
