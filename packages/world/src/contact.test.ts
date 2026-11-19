import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { catalogs, makeWorld, testCatalog } from "./__fixtures__/world.js";

const actorId = PRIMARY_ACTOR;

describe("physical contact at the consultation room window", () => {
  function atWindow(locale: "en" | "zh-CN") {
    const facility = structuredClone(loadFacility("clinic-v4"));
    // The patient and a handheld device just inside the south window. The front door is several metres east.
    const slot = facility.patientSlots.find((s) => s.id === "consult-1")!;
    slot.x = -8;
    slot.z = 7.15;
    facility.placements.push({ id: "window-meter", type: "pocket-glucometer", x: -8.7, y: 0, z: 7.2, rot: 0, room: "consult" });
    const devices = testCatalog();
    devices.equipment.find((e) => e.id === "pocket-glucometer")!.reach = 2;
    const w = makeWorld("smzl-lung-adeno", { facility, catalogs: [...catalogs(), devices], locale });
    w.runtime.updatePose(actorId, { x: -8.25, y: 0, z: 8.8, yaw: 0, pitch: 0, level: "L0" });
    return w;
  }

  for (const locale of ["en", "zh-CN"] as const) {
    it(`sees the patient through glass but must enter to examine them (${locale})`, async () => {
      const w = atWindow(locale);
      const patient = w.runtime.inspect(actorId, w.patientId);
      expect(patient).toMatchObject({ visible: true, inReach: false, reachable: true });
      expect(patient!.pathDistance!).toBeGreaterThan(5);
      expect(w.runtime.checkSpatial(actorId, { tool: "ask_patient", kind: "ask" })).toMatchObject({ ok: false, reason: "contact-blocked" });
      const exam = { tool: "examine", kind: "examine" } as const;
      const check = w.runtime.checkSpatial(actorId, exam);
      expect(check).toMatchObject({ ok: false, reason: "contact-blocked", hint: { goal: { kind: "interact", id: w.patientId } } });
      if (check.ok) throw new Error("An examination through glass succeeded");
      expect(check.message).toContain(locale === "en" ? "glass" : "玻璃");
      const arrived = await w.act({ actorId, operation: "navigate", goal: check.hint!.goal });
      expect(arrived.status, arrived.message).toBe("completed");
      expect(w.runtime.actor(actorId)!.room).toBe("consult");
      expect(w.runtime.checkSpatial(actorId, exam).ok).toBe(true);
    });
  }

  it("plans separate places for looking and picking up the meter", async () => {
    const w = atWindow("en");
    const id = "eq:window-meter";
    const look = w.runtime.plan(actorId, { kind: "look", id, range: 2 });
    expect(look.ok && look.target.z > 8).toBe(true);
    const action = { actorId, operation: "pick_up", targetId: id };
    const blocked = await w.act(action);
    expect(blocked).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE" });
    expect(blocked.message).toContain("glass");
    expect(w.runtime.actor(actorId)!.holding).not.toContain(id);
    const arrived = await w.act({ actorId, operation: "navigate", goal: blocked.hint!.goal });
    expect(arrived.status, arrived.message).toBe("completed");
    expect((await w.act(action)).status).toBe("completed");
    expect(w.runtime.actor(actorId)!.holding).toContain(id);
  });
});
