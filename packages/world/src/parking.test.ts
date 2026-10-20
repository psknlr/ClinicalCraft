/**
 * Review C7, crowded bedside: carts brought one after another around an operating table can leave no spot from
 * which the next one can be worked. Its refusal used to hint the same fetch ("wheel it to the patient") forever,
 * although the cart already stood there; now the hint chain ends — the operation is done, or refused once, saying
 * no reachable spot is free to work the cart from (found when the theatre gained a treatment cart).
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR as A, type WorldActionResult } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { makeWorld, type TestWorld } from "./__fixtures__/world.js";

/** Run one operation, following its hints; fails on a repeated refusal. The last result. */
async function drive(w: TestWorld, id: string, operation: string, parameters: Record<string, unknown>): Promise<WorldActionResult> {
  const trail: string[] = [];
  const seen = new Set<string>();
  for (let step = 0; step < 8; step++) {
    const r = await w.act({ actorId: A, operation, targetId: id, parameters });
    if (r.status === "completed" || !r.hint) return r;
    const here = w.runtime.actor(A)!.pose;
    const key = `${Math.round(here.x * 2)},${Math.round(here.z * 2)}|${r.errorCode}|${JSON.stringify(r.hint.goal)}`;
    trail.push(`${operation}: ${r.errorCode} ${JSON.stringify(r.hint.goal)}`);
    expect(seen.has(key), `hint loop on ${id} ${operation}: ${trail.join(" → ")}`).toBe(false);
    seen.add(key);
    expect((await w.act({ actorId: A, operation: "navigate", goal: r.hint.goal })).status).toBe("completed");
    const then = r.hint.then;
    if (then) expect((await w.act({ actorId: A, operation: then.operation, targetId: then.targetId, ...(then.goal ? { goal: then.goal } : {}) })).status).toBe("completed");
  }
  throw new Error(`no convergence on ${id} ${operation}`);
}

describe("C7 crowded bedside: the hint chain ends", () => {
  it("teaching hospital theatre: the treatment cart, the ECG cart and the glucometer are worked at the table; the ultrasound from downstairs is done or refused once, never fetched forever", async () => {
    const w = makeWorld("stemi-inferior-rv", { facility: loadFacility("teaching-hospital"), slotId: "theatre.slot" });
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect((await drive(w, "eq:theatre.treatment-cart", "use", { intervention: "iv-access" })).status).toBe("completed");
    for (const op of ["prepare", "connect", "record"]) expect((await drive(w, "eq:ward-station.ecg", op, {})).status).toBe("completed");
    expect((await drive(w, "eq:ward-station.glucometer", "use", { investigation: "poc-glucose" })).status).toBe("completed");
    const last = await drive(w, "eq:xray.ultrasound", "use", { investigation: "pocus-echo" });
    expect(w.runtime.atBedside("eq:xray.ultrasound")).toBe(true);
    if (last.status !== "completed") {
      expect(last).toMatchObject({ errorCode: "PRECONDITION_FAILED", hint: null });
      expect(last.message).toMatch(/already at .* side, but no free spot to work it from can be reached/);
    }
  }, 120000);

  it("the refusal is bilingual", async () => {
    const { worldMessage } = await import("./i18n.js");
    expect(worldMessage("pre.noRoomToWork", "zh-CN", { target: "超声", patient: "刘振华" })).toMatch(/已在刘振华身边.*挪开/);
    expect(worldMessage("pre.noRoomToWork", "en", { target: "Ultrasound", patient: "Liu" })).toMatch(/move a cart out of the way/);
  });
});
