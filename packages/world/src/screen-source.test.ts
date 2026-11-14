/**
 * THE screen rule, the device's side (EMBODIED §6, audit 2026-11-12 P2-13): what a device's own live screen shows is
 * the world's answer where the device stands now — the audit's replay: a cart from another bed wheeled to the patient
 * and connected shows the patient; wheeled away again (to the other bed, still "connected"), it shows nobody; the
 * equipment of the next bed in the same bay never shows this patient; nothing shows a patient who was taken away.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "./contracts.js";
import { makeWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;

describe("screenPatient: whose bedside a device's live screen shows", () => {
  it("STEMI in resus 1: its monitor, defibrillator and ventilator show the patient; resus 2's equipment, the idle ECG carts and the cubicles' do not", () => {
    const w = makeWorld("stemi-inferior-rv");
    const P = w.patientId;
    expect(P).toBe("patient:resus-1");
    expect(w.runtime.screenPatient("eq:resus1-monitor")).toBe(P);
    expect(w.runtime.screenPatient("eq:resus1-defibrillator")).toBe(P);
    expect(w.runtime.screenPatient("eq:resus1-ventilator")).toBe(P);
    // the next bed of the same bay: at the bedside by THE bedside rule (the room), but by resus 2's bed
    expect(w.runtime.atBedside("eq:resus2-defibrillator")).toBe(true);
    expect(w.runtime.screenPatient("eq:resus2-defibrillator")).toBeNull();
    expect(w.runtime.screenPatient("eq:resus2-monitor")).toBeNull();
    // an ECG cart at rest shows nobody, even by the patient's bed
    expect(w.runtime.stateOf("eq:resus1-ecg")).toBe("idle");
    expect(w.runtime.screenPatient("eq:resus1-ecg")).toBeNull();
    expect(w.runtime.screenPatient("eq:resus2-ecg")).toBeNull();
    for (const id of ["eq:cub1-monitor", "eq:cub2-ecg", "eq:icu-ventilator-1", "eq:ward-monitor-1"]) expect(w.runtime.screenPatient(id), id).toBeNull();
    // a device at her bedside without a live screen (her bed's suction unit): nobody
    expect(w.runtime.atBedside("eq:resus1-suction")).toBe(true);
    expect(w.runtime.screenPatient("eq:resus1-suction")).toBeNull();
    // not a device, or unknown: nobody
    expect(w.runtime.screenPatient(P)).toBeNull();
    expect(w.runtime.screenPatient("eq:no-such-thing")).toBeNull();
  });

  it("the audit's replay: resus 2's cart wheeled to the patient and connected shows her; wheeled back to its bed it shows nobody", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const P = w.patientId;
    const CART = "eq:resus2-ecg";
    expect((await w.act({ actorId: A, operation: "approach", targetId: CART })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "move_to", targetId: CART, goal: { kind: "interact", id: P } })).status).toBe("completed");
    expect(w.runtime.atBedside(CART)).toBe(true);
    // by her bed, but idle: nothing on the patient yet
    expect(w.runtime.screenPatient(CART)).toBeNull();
    // prepared, the leads not on yet: still nobody (the type marks `connected` and `completed` live — re-review)
    expect((await w.act({ actorId: A, operation: "prepare", targetId: CART })).status).toBe("completed");
    expect(w.runtime.screenPatient(CART)).toBeNull();
    expect((await w.act({ actorId: A, operation: "connect", targetId: CART })).status).toBe("completed");
    expect(w.runtime.stateOf(CART)).toBe("connected");
    expect(w.runtime.screenPatient(CART)).toBe(P);
    // wheeled away to the other bed of the bay: the leads come off (back to "prepared") — still in the room (at the
    // bedside by the room), and by resus 2's bed: it shows nobody
    expect((await w.act({ actorId: A, operation: "move_to", targetId: CART, goal: { kind: "interact", id: "eq:resus2-monitor" } })).status).toBe("completed");
    expect(w.runtime.stateOf(CART)).toBe("prepared");
    expect(w.runtime.atBedside(CART)).toBe(true);
    expect(w.runtime.screenPatient(CART)).toBeNull();
    // out of the room altogether: nobody
    expect((await w.act({ actorId: A, operation: "move_to", targetId: CART, goal: { kind: "room", id: "laboratory" } })).status).toBe("completed");
    expect(w.runtime.atBedside(CART)).toBe(false);
    expect(w.runtime.screenPatient(CART)).toBeNull();
    // back to her: not on her until the leads are connected again; reset (the leads off): nobody again
    expect((await w.act({ actorId: A, operation: "move_to", targetId: CART, goal: { kind: "interact", id: P } })).status).toBe("completed");
    expect(w.runtime.screenPatient(CART)).toBeNull();
    expect((await w.act({ actorId: A, operation: "connect", targetId: CART })).status).toBe("completed");
    expect(w.runtime.screenPatient(CART)).toBe(P);
    expect((await w.act({ actorId: A, operation: "reset", targetId: CART })).status).toBe("completed");
    expect(w.runtime.screenPatient(CART)).toBeNull();
  });

  it("the cart that stood at her bed, connected and wheeled to the other bed, no longer shows her", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const P = w.patientId;
    const CART = "eq:resus1-ecg";
    expect((await w.act({ actorId: A, operation: "approach", targetId: P })).status).toBe("completed");
    for (const op of ["prepare", "connect"]) expect((await w.act({ actorId: A, operation: op, targetId: CART })).status, op).toBe("completed");
    expect(w.runtime.screenPatient(CART)).toBe(P);
    expect((await w.act({ actorId: A, operation: "move_to", targetId: CART, goal: { kind: "interact", id: "eq:resus2-monitor" } })).status).toBe("completed");
    expect(w.runtime.screenPatient(CART)).toBeNull();
    expect(w.runtime.stateOf(CART)).toBe("prepared");
  });

  it("out of service: nobody, the patient's own monitor included", () => {
    const w = makeWorld("stemi-inferior-rv");
    w.runtime.setAvailability("eq:resus1-monitor", false);
    expect(w.runtime.screenPatient("eq:resus1-monitor")).toBeNull();
    w.runtime.setAvailability("eq:resus1-monitor", true);
    expect(w.runtime.screenPatient("eq:resus1-monitor")).toBe(w.patientId);
  });

  it("PE on ward 1: her monitor shows her until she is wheeled to the CT; nothing of the ward does then; back home, it does again", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    const P = w.patientId;
    expect(P).toBe("patient:ward-1");
    expect(w.runtime.screenPatient("eq:ward-monitor-1")).toBe(P);
    expect(w.runtime.screenPatient("eq:ward-monitor-2")).toBeNull();
    expect((await w.act({ actorId: A, operation: "approach", targetId: P })).status).toBe("completed");
    const there = await w.act({ actorId: A, operation: "transport_patient", targetId: P, parameters: { destination: "eq:ct-scanner" } });
    expect(there.status, there.message).toBe("completed");
    expect(w.runtime.patientPlace()).toMatchObject({ provider: "eq:ct-scanner", room: "rad-ct" });
    const live = w.runtime
      .entities()
      .filter((e) => e.kind === "equipment" && (e.equipmentType?.screen === "vitals" || e.equipmentType?.screen === "ecg"))
      .map((e) => e.id);
    expect(live.length).toBeGreaterThan(10);
    // no live screen of the hospital shows her: the CT suite has none, and every other one is away from her
    for (const id of live) expect(w.runtime.screenPatient(id), id).toBeNull();
    const back = await w.act({ actorId: A, operation: "transport_patient", targetId: P, parameters: { destination: "home" } });
    expect(back.status, back.message).toBe("completed");
    expect(w.runtime.screenPatient("eq:ward-monitor-1")).toBe(P);
  });
});
