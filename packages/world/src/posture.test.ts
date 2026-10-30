/**
 * The patient changes position when asked (`reposition_patient`, EMBODIED §8.4): physical state that holds while
 * clinical state still gives the posture it was asked over; what they cannot do where they are is refused with the
 * reason (both languages).
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type WorldEvent } from "./contracts.js";
import { catalogs, makeWorld, type TestWorld } from "./__fixtures__/world.js";
import { createWorldRuntime } from "./runtime.js";

async function near(w: TestWorld) {
  const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: w.patientId } });
  expect(r.status, r.message).toBe("completed");
}
const ask = (w: TestWorld, posture: string) => w.act({ actorId: PRIMARY_ACTOR, operation: "reposition_patient", targetId: w.patientId, parameters: { posture } });
const place = (w: TestWorld) => w.runtime.patientPlace()!;

describe("reposition_patient", () => {
  it("an outpatient lies down on the couch, sits up, stands again — no body on the floor while on the couch", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await near(w);
    const seen: WorldEvent[] = [];
    w.runtime.subscribe((e) => seen.push(e));
    const lie = await ask(w, "lying");
    expect(lie.status, lie.message).toBe("completed");
    expect(lie.message).toMatch(/lies down/);
    expect(place(w)).toMatchObject({ slot: "consult-1", posture: "lying", support: "eq:exam-couch" });
    expect(seen.find((e) => e.type === "patient.posture")).toMatchObject({ from: "standing", to: "lying" });
    const slot = w.facility.patientSlots.find((s) => s.id === w.slotId)!;
    const plan = w.runtime.plan(PRIMARY_ACTOR, { kind: "point", x: slot.x, z: slot.z });
    expect(plan.ok && Math.hypot(plan.target.x - slot.x, plan.target.z - slot.z) < 0.3).toBe(true);
    // lying on the couch, their body is where the couch is: step over again
    await near(w);
    expect((await ask(w, "sitting")).status).toBe("completed");
    expect(place(w).posture).toBe("sitting");
    await near(w);
    expect((await ask(w, "standing")).status).toBe("completed");
    expect(place(w).posture).toBe("standing");
    // back to the clinical posture: nothing asked is kept
    expect(w.runtime.snapshot().entities[w.patientId]?.patient?.asked).toBeUndefined();
    // asked again for what they already do: done, nothing changes
    const again = await ask(w, "standing");
    expect(again).toMatchObject({ status: "completed" });
    expect(again.message).toMatch(/already/);
  });

  it("clinical positioning replaces a posture taken when asked (and it is forgotten)", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await near(w);
    expect((await ask(w, "lying")).status).toBe("completed");
    w.harness.cues.posture = "sitting";
    expect(w.runtime.refreshPatient()).toBe(true);
    expect(place(w).posture).toBe("sitting");
    expect(w.runtime.snapshot().entities[w.patientId]?.patient?.asked).toBeUndefined();
    // and when clinical state gives the old posture again, the old request does not come back
    w.harness.cues.posture = "standing";
    w.runtime.refreshPatient();
    expect(place(w).posture).toBe("standing");
  });

  it("a patient who must lie does not stand up (both languages); sitting up in bed is fine", async () => {
    const en = makeWorld("pulmonary-embolism-postop");
    await near(en);
    const stand = await ask(en, "standing");
    expect(stand).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect(stand.message).toMatch(/stay lying down/);
    const zh = makeWorld("pulmonary-embolism-postop", { locale: "zh-CN" });
    await near(zh);
    expect((await ask(zh, "standing")).message).toMatch(/卧床/);
    expect((await ask(en, "sitting")).status).toBe("completed");
    expect(place(en)).toMatchObject({ slot: "ward-1", posture: "sitting" });
  });

  it("refused: unresponsive, on a scanner table, while walking with someone, nothing to lie on, a bad posture, from afar", async () => {
    const mute = makeWorld("smzl-lung-adeno");
    mute.harness.cues.cannotSpeak = "";
    await near(mute);
    expect((await ask(mute, "lying")).message).toMatch(/cannot respond/);

    const ct = makeWorld("smzl-lung-adeno");
    await near(ct);
    expect((await ct.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: ct.patientId, parameters: { destination: "eq:ct-scanner" } })).status).toBe("completed");
    expect((await ask(ct, "sitting")).message).toMatch(/stays as they are/);

    const walking = makeWorld("smzl-lung-adeno");
    await near(walking);
    expect((await walking.act({ actorId: PRIMARY_ACTOR, operation: "escort_patient", targetId: walking.patientId })).status).toBe("completed");
    expect((await ask(walking, "lying")).message).toMatch(/ask them to wait first/);
    await walking.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ws-imaging" } });
    expect((await walking.act({ actorId: PRIMARY_ACTOR, operation: "release_patient", targetId: walking.patientId })).status).toBe("completed");
    // waiting in the imaging room, standing on the floor: nothing to lie on there
    expect((await ask(walking, "lying")).message).toMatch(/nothing here/);

    const bad = makeWorld("smzl-lung-adeno");
    await near(bad);
    expect(await ask(bad, "kneeling")).toMatchObject({ status: "failed", errorCode: "INVALID_REQUEST" });

    const far = makeWorld("smzl-lung-adeno");
    await far.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ct-scanner" } });
    expect(await ask(far, "lying")).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE" });
  });

  it("is physical state: snapshots restore it", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await near(w);
    await ask(w, "lying");
    const snapshot = w.runtime.snapshot();
    expect(snapshot.entities[w.patientId]?.patient?.asked).toEqual({ posture: "lying", over: "standing" });
    const restored = createWorldRuntime({ facility: w.facility, catalogs: catalogs(), binding: { caseDef: w.caseDef, slotId: w.slotId, locale: "en" }, clinical: w.harness.view, port: w.harness.port, now: () => 0, newId: () => "x", snapshot });
    expect(restored.patientPlace()).toEqual(place(w));
    expect(restored.snapshot()).toEqual(snapshot);
  });
});
