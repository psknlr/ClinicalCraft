/**
 * Device operations as an embodied agent plans them: the clinical operation
 * of a device for a tool call (the world's selection rules) and the path of
 * non-clinical operations leading to it.
 */
import { describe, expect, it } from "vitest";
import { behaviorOf } from "@clinicalcraft/world";
import { makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { clinicalOperation, operationPath, releaseOperation } from "./device-ops.js";

describe("device operations (STEMI, general hospital)", () => {
  it("finds the operation carrying out a tool call and the way to reach it", async () => {
    const t = await makeEmbodiedSession();
    const w = t.session.world()!;
    const c = t.session.caseDef;
    // The ECG cart records a 12-lead ECG (order_test), after prepare → connect.
    const ecg = clinicalOperation(w, "eq:resus1-ecg", "order_test", "ecg-12lead", c, "en")!;
    expect(ecg.op.id).toBe("record");
    expect(ecg.parameters).toEqual({ investigation: "ecg-12lead" });
    expect(operationPath(ecg.spec, "idle", ecg.op)).toEqual(["prepare", "connect"]);
    expect(operationPath(ecg.spec, "prepared", ecg.op)).toEqual(["connect"]);
    // A tracing left on the cart: reset first (it also releases the reservation).
    expect(operationPath(ecg.spec, "completed", ecg.op)).toEqual(["reset", "prepare", "connect"]);
    expect(releaseOperation(ecg.spec, "completed")?.id).toBe("reset");
    // The monitor's attach gives the monitoring intervention.
    const monitor = clinicalOperation(w, "eq:resus1-monitor", "intervene", "cardiac-monitoring", c, "en")!;
    expect(monitor.op.id).toBe("attach");
    expect(operationPath(monitor.spec, "detached", monitor.op)).toEqual([]);
    // Not this device's business.
    expect(clinicalOperation(w, "eq:resus1-ecg", "order_test", "hs-troponin", c, "en")).toBeNull();
    expect(clinicalOperation(w, "eq:resus1-monitor", "order_test", "ecg-12lead", c, "en")).toBeNull();
    expect(clinicalOperation(w, "patient:resus-1", "intervene", "aspirin", c, "en")).toBeNull();
    // Unreachable goal states.
    expect(operationPath(behaviorOf(w.entity("eq:resus1-ecg")!), null, ecg.op)).toBeNull();
    await t.session.close();
  });
});
