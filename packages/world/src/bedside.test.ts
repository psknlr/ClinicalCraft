/**
 * ONE bedside rule (EMBODIED §6, `WorldRuntime.atBedside`): on the slot's
 * level, and in the slot's room — or within `BEDSIDE_RADIUS` of the slot
 * point AND (visible from it OR reachable by a walk ≤ the radius), where the
 * radius bridges a room boundary only for an open slot (outdoors) or a cart
 * standing in open space just outside the room. Never through a wall. Used
 * by the spatial policy (`bedside-provider`), `deviceAtBedside` and the
 * patient's monitor; moved and carried items follow the same rule.
 */
import { describe, expect, it } from "vitest";
import type { FacilityDefinition } from "@clinicalcraft/core";
import { BEDSIDE_RADIUS, PRIMARY_ACTOR, type SpatialPolicy } from "./contracts.js";
import { DefaultSpatialPolicy } from "./policy.js";
import { loadFacility } from "./__fixtures__/content.js";
import { hospitalWithTestItems, loadCase, makeWorld, type TestWorld } from "./__fixtures__/world.js";
import { entityLevel } from "./levels.js";

const A = PRIMARY_ACTOR;
const FACILITIES = ["general-hospital", "teaching-hospital", "clinic-v4"] as const;

/** A case to bind to any slot (the slot's own setting when a built-in case has it, else STEMI). */
function caseFor(f: FacilityDefinition, slotId: string): string {
  const slot = f.patientSlots.find((s) => s.id === slotId)!;
  for (const id of ["stemi-inferior-rv", "pulmonary-embolism-postop", "new-onset-t2dm", "anaphylaxis-garden"]) {
    if (slot.accepts.includes(loadCase(id).setting)) return id;
  }
  return "stemi-inferior-rv";
}

/** The default policy, plus a probe intent: `bedside-provider` for one capability (`itemId`) at 1.5 m from the patient. */
const probePolicy: SpatialPolicy = {
  requirementFor: (intent, binding) =>
    intent.tool === "probe" ? { kind: "bedside-provider", capabilities: [intent.itemId!], patientRange: 1.5 } : new DefaultSpatialPolicy().requirementFor(intent, binding),
};

const enclosed = (w: TestWorld, room: string | null) => {
  if (!room) return false;
  const r = w.facility.rooms.find((x) => x.id === room);
  return !!r?.building && r.kind !== "corridor";
};

describe("atBedside: never through a wall (every slot of the three built-in facilities)", () => {
  for (const facilityId of FACILITIES) {
    const facility = loadFacility(facilityId);
    for (const slot of facility.patientSlots) {
      it(`${facilityId} ${slot.id}`, async () => {
        const w = makeWorld(caseFor(facility, slot.id), { facility, slotId: slot.id });
        const probe = makeWorld(caseFor(facility, slot.id), { facility, slotId: slot.id, extra: { policy: probePolicy } });
        const level = entityLevel(facility, slot);
        const offenders: string[] = [];
        for (const e of w.runtime.entities().filter((x) => x.kind === "equipment")) {
          const at = w.runtime.atBedside(e.id);
          if (e.level !== level) {
            if (at) offenders.push(`${e.id}: another level`);
            continue;
          }
          if (e.room === slot.room) {
            if (!at) offenders.push(`${e.id}: in the slot's room but not at the bedside`);
            continue;
          }
          // another enclosed room: never, however close (a partition or a wall is between them)
          if (enclosed(w, e.room) && enclosed(w, slot.room) && at) offenders.push(`${e.id}@${e.room}: through a wall`);
          if (Math.hypot(e.position.x - slot.x, e.position.z - slot.z) > BEDSIDE_RADIUS && at) offenders.push(`${e.id}: beyond the radius`);
        }
        expect(offenders).toEqual([]);
        // The policy counts only what the rule counts: at the patient, the bedside-provider of every capability on this level.
        expect((await probe.act({ actorId: A, operation: "approach", targetId: probe.patientId })).status).toBe("completed");
        const caps = new Set(probe.runtime.entities().filter((e) => e.kind === "equipment" && e.level === level).flatMap((e) => e.capabilities));
        for (const cap of caps) {
          const check = probe.runtime.checkSpatial(A, { tool: "probe", kind: "cognitive", itemId: cap });
          if (!check.ok) continue;
          for (const id of check.satisfiedBy.filter((x) => x !== probe.patientId)) {
            const e = probe.runtime.entity(id)!;
            expect(probe.runtime.atBedside(id), `${cap}: ${id}`).toBe(true);
            expect(enclosed(probe, e.room) && e.room !== slot.room && enclosed(probe, slot.room), `${cap}: ${id}@${e.room} through a wall`).toBe(false);
          }
          for (const id of probe.runtime.bedsideProviders(cap)) expect(probe.runtime.atBedside(id), `${cap}: ${id}`).toBe(true);
        }
      });
    }
  }
});

describe("atBedside: the reviewer's cases", () => {
  it("teaching-hospital resus-1: the ED station's glucometer and resus-2's ECG cart behind the partition are not at the bedside", () => {
    const facility = loadFacility("teaching-hospital");
    const w = makeWorld("stemi-inferior-rv", { facility, slotId: "resus-1.slot" });
    for (const id of ["eq:ed-station.glucometer", "eq:ed-station.ecg", "eq:resus-2.ecg", "eq:resus-2.pocus", "eq:resus-2.nebulizer", "eq:ed-station.drug-cabinet"]) expect(w.runtime.atBedside(id), id).toBe(false);
    for (const id of ["eq:resus-1.ecg", "eq:resus-1.monitor", "eq:resus-1.oxygen"]) expect(w.runtime.atBedside(id), id).toBe(true);
    // resus-1's ECG cart out of service: the policy does not borrow resus-2's through the wall — fetch one instead
    w.runtime.setAvailability("eq:resus-1.ecg", false);
    const patient = w.runtime.entity(w.patientId)!;
    w.runtime.updatePose(A, { x: patient.position.x, y: patient.position.y, z: patient.position.z + 1.6, yaw: 0, pitch: 0, level: patient.level });
    const check = w.runtime.checkSpatial(A, { tool: "order_test", kind: "order", investigationId: "ecg-12lead" });
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("provider-not-at-bedside");
  });

  it("general-hospital: a cubicle's cart is not at the next cubicle's bedside; the ICU's pump is not at ward bed 4", () => {
    const cub = makeWorld("stemi-inferior-rv", { slotId: "ed-cubicle-1" });
    expect(cub.runtime.atBedside("eq:cub2-ecg")).toBe(false);
    const ward = makeWorld("pulmonary-embolism-postop", { slotId: "ward-4" });
    for (const id of ["eq:icu-monitor-1", "eq:icu-iv-pole-1", "eq:icu-infusion-pump-1"]) expect(ward.runtime.atBedside(id), id).toBe(false);
    expect(ward.runtime.atBedside("eq:ward-monitor-4")).toBe(true);
  });

  it("a cart wheeled across the slot's own room stays at the bedside (same room); wheeled into another room it is not", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:resus2-ecg" })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "move_to", targetId: "eq:resus2-ecg", goal: { kind: "point", x: 42.5, z: -12 } })).status).toBe("completed");
    expect(w.runtime.atBedside("eq:resus2-ecg")).toBe(true); // > 6 m from resus-1, but in ed-resus
    expect((await w.act({ actorId: A, operation: "move_to", targetId: "eq:resus2-ecg", goal: { kind: "room", id: "laboratory" } })).status).toBe("completed");
    expect(w.runtime.atBedside("eq:resus2-ecg")).toBe(false);
  });

  it("a cart parked just outside the room (corridor, a short walk through the door) is at the bedside; in the next room it is not", async () => {
    // teaching-hospital ICU bed 1, moved towards its door so that the corridor in front of it is within the radius
    const facility = structuredClone(loadFacility("teaching-hospital"));
    const slot = facility.patientSlots.find((s) => s.id === "icu-1.slot")!;
    slot.z = -5;
    facility.placements.find((p) => p.id === slot.bed)!.z = -5;
    const w = makeWorld("septic-shock-cap", { facility, slotId: "icu-1.slot" });
    const CART = "eq:icu-station.crash-cart";
    expect((await w.act({ actorId: A, operation: "approach", targetId: CART })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "move_to", targetId: CART, goal: { kind: "point", x: 7.75, z: -1.2, level: "L1" } })).status).toBe("completed");
    const parked = w.runtime.snapshot().entities[CART]!.position!;
    expect(w.runtime.inspect(A, CART)!.room).toBe("corridor-l1");
    expect(Math.hypot(parked.x - slot.x, parked.z - slot.z)).toBeLessThanOrEqual(BEDSIDE_RADIUS);
    expect(w.runtime.atBedside(CART)).toBe(true);
    // the same distance into the next ICU bed space (enclosed): never through the partition
    expect((await w.act({ actorId: A, operation: "move_to", targetId: CART, goal: { kind: "point", x: 11.6, z: -5, level: "L1" } })).status).toBe("completed");
    const next = w.runtime.snapshot().entities[CART]!.position!;
    expect(w.runtime.inspect(A, CART)!.room).toBe("icu-2");
    expect(Math.hypot(next.x - slot.x, next.z - slot.z)).toBeLessThanOrEqual(BEDSIDE_RADIUS);
    expect(w.runtime.atBedside(CART)).toBe(false);
    // the resuscitation room's north corridor is 3.9 m from bed 1 but behind a solid wall: no cart counts there
    const gh = makeWorld("stemi-inferior-rv");
    expect((await gh.act({ actorId: A, operation: "approach", targetId: "eq:resus1-defibrillator" })).status).toBe("completed");
    expect((await gh.act({ actorId: A, operation: "move_to", targetId: "eq:resus1-defibrillator", goal: { kind: "point", x: 33, z: -21.3 } })).status).toBe("completed");
    expect(gh.runtime.inspect(A, "eq:resus1-defibrillator")!.room).toBe("north-corridor");
    expect(gh.runtime.atBedside("eq:resus1-defibrillator")).toBe(false);
  });

  it("the garden bench (open slot): a cart parked within the radius counts; one beyond it does not; carried items go with their holder", async () => {
    const w = makeWorld("anaphylaxis-garden");
    expect(w.slotId).toBe("garden-bench");
    const O2 = "eq:ed-store-o2-1";
    expect((await w.act({ actorId: A, operation: "approach", targetId: O2 })).status).toBe("completed");
    expect(w.runtime.atBedside(O2)).toBe(false);
    expect((await w.act({ actorId: A, operation: "move_to", targetId: O2, goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    expect(w.runtime.atBedside(O2)).toBe(true);
    // outdoors beside the garden (outside its room, in view): the radius bridges for an open slot
    expect((await w.act({ actorId: A, operation: "move_to", targetId: O2, goal: { kind: "point", x: -28, z: 26 } })).status).toBe("completed");
    expect(w.runtime.inspect(A, O2)!.room).toBeNull();
    expect(w.runtime.atBedside(O2)).toBe(true);
    // beyond the radius (and outside the garden's room)
    expect((await w.act({ actorId: A, operation: "move_to", targetId: O2, goal: { kind: "point", x: -18.5, z: 21.7 } })).status).toBe("completed");
    expect(w.runtime.inspect(A, O2)!.room).toBeNull();
    expect(w.runtime.atBedside(O2)).toBe(false);
  });

  it("carried items follow their holder (test catalog: a pocket glucometer)", async () => {
    const { facility, catalogs: cats } = hospitalWithTestItems();
    const w = makeWorld("stemi-inferior-rv", { facility, catalogs: cats });
    expect(w.runtime.atBedside("eq:pocket-glu-1")).toBe(true); // in the resus room
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:pocket-glu-1" })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "pick_up", targetId: "eq:pocket-glu-1" })).status).toBe("completed");
    expect(w.runtime.atBedside("eq:pocket-glu-1")).toBe(true);
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "laboratory" } })).status).toBe("completed");
    expect(w.runtime.atBedside("eq:pocket-glu-1")).toBe(false);
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    expect(w.runtime.atBedside("eq:pocket-glu-1")).toBe(true);
  });

  it("isPatientMonitor follows the rule: the next bay's monitor is never this patient's (no link)", () => {
    const facility = structuredClone(loadFacility("teaching-hospital"));
    for (const s of facility.patientSlots) delete (s as { monitor?: string }).monitor;
    const w = makeWorld("stemi-inferior-rv", { facility, slotId: "resus-1.slot" });
    expect(w.runtime.inspect(A, "eq:resus-1.monitor")!.availableActions).toContain("attach");
    expect(w.runtime.inspect(A, "eq:resus-2.monitor")!.availableActions).not.toContain("attach");
  });
});
