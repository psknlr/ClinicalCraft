/**
 * Lead notes 1, 2 and 4b — what actors know of where things are:
 *
 * - portable equipment is on everyone's map where the department keeps it
 *   ("usually kept in …"): a clinician in the garden finds the ECG cart, a
 *   nurse at her station knows the department's carts;
 * - a movable thing seen since is believed where it was last seen ("last
 *   seen in …"), not where it really is: moving it out of sight changes
 *   nothing an actor is told (distances, room and the path sort follow the
 *   belief); the belief survives a snapshot;
 * - location text: a room's name; inside a building but in no room, its
 *   corridor; outdoors, the facility's outdoor region (never "corridor").
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type Pose } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { makeWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const NURSE = "staff:ed-nurse";
const ECG = "eq:resus1-ecg";
const at = (x: number, z: number, yaw = 0, level = "L0"): Pose => ({ x, y: 0, z, yaw, pitch: 0, level });

describe("lead note 1 / 4b: portable equipment is mapped where it is usually kept", () => {
  it("from the garden (and the entrance) a clinician finds the ECG carts, with where they are usually kept", () => {
    for (const caseId of ["anaphylaxis-garden", "stemi-inferior-rv"]) {
      const w = makeWorld(caseId);
      const found = w.runtime.find(A, { capabilities: ["ecg-12lead"] });
      const cart = found.find((e) => e.id === ECG);
      expect(cart, caseId).toMatchObject({ awareness: "mapped", room: "ed-resus", reachable: true, lastKnown: { kind: "usual", label: "usually kept in Resuscitation Room" } });
      expect(w.runtime.find(A, { name: "ecg" }).map((e) => e.id)).toContain(ECG);
      // staff are still known only by seeing them
      expect(w.runtime.find(A, { kind: "staff" }).map((e) => e.id)).not.toContain(NURSE);
    }
  });

  it("zh-CN wording", () => {
    const w = makeWorld("stemi-inferior-rv", { locale: "zh-CN" });
    expect(w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!.lastKnown).toEqual({ kind: "usual", label: "通常放在抢救室" });
  });

  it("a nurse at her station knows the department's ECG carts and the oxygen cylinder (teaching hospital too)", () => {
    const gh = makeWorld("stemi-inferior-rv");
    expect(gh.runtime.find(NURSE, { kind: "equipment", capabilities: ["ecg-12lead"] }).length).toBeGreaterThan(0);
    expect(gh.runtime.find(NURSE, { kind: "equipment", capabilities: ["oxygen"] }).map((e) => e.id)).toContain("eq:ed-store-o2-1");
    const th = makeWorld("stemi-inferior-rv", { facility: loadFacility("teaching-hospital") });
    const staff = th.runtime.actors().find((a) => a.id.startsWith("staff:") && a.role === "nurse")!;
    expect(th.runtime.find(staff.id, { kind: "equipment", capabilities: ["ecg-12lead"] }).length).toBeGreaterThan(0);
  });

  it("perceived things are where they are, without a lastKnown note", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    const cart = w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!;
    expect(cart.awareness).toBe("visible");
    expect(cart.lastKnown).toBeUndefined();
  });
});

describe("lead note 1: moved things are believed where last seen", () => {
  it("moved out of sight: still believed at its usual place; seen elsewhere: believed there; moved again unseen: still there", async () => {
    const w = makeWorld("stemi-inferior-rv");
    // the clinician in the physician office; the nurse wheels the cart to the ED corridor by the station
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: ECG })).status).toBe("completed");
    const moved = await w.act({ actorId: NURSE, operation: "move_to", targetId: ECG, goal: { kind: "room", id: "ed-cubicle-1" } });
    expect(moved.status).toBe("completed");
    const truth = w.runtime.inspect(NURSE, ECG)!;
    expect(truth.room).toBe("ed-cubicle-1");
    const believed = w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!;
    expect(believed).toMatchObject({ awareness: "mapped", room: "ed-resus", lastKnown: { kind: "usual" } });
    // the clinician walks to the cubicle and sees it there…
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "ed-cubicle-1" } })).status).toBe("completed");
    expect(w.runtime.find(A, { capabilities: ["ecg-12lead"], awareness: ["visible", "nearby"] }).map((e) => e.id)).toContain(ECG);
    // …walks away: remembered in the cubicle
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    const seen = w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!;
    expect(seen).toMatchObject({ awareness: "remembered", room: "ed-cubicle-1", lastKnown: { kind: "last-seen", label: expect.stringMatching(/^last seen in /) } });
    // the nurse takes it back to the resus room out of the clinician's sight: the clinician still believes the cubicle
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: ECG })).status).toBe("completed");
    expect((await w.act({ actorId: NURSE, operation: "move_to", targetId: ECG, goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    expect(w.runtime.inspect(NURSE, ECG)!.room).toBe("ed-resus");
    const stale = w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!;
    expect(stale).toMatchObject({ awareness: "remembered", room: "ed-cubicle-1", lastKnown: { kind: "last-seen" } });
    // the room filter follows the belief
    expect(w.runtime.find(A, { room: "ed-cubicle-1", capabilities: ["ecg-12lead"] }).map((e) => e.id)).toContain(ECG);
    // the belief survives a snapshot (the actor's memory)
    const again = makeWorld("stemi-inferior-rv", { extra: { snapshot: w.runtime.snapshot() } });
    expect(again.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)).toMatchObject({ room: "ed-cubicle-1", lastKnown: { kind: "last-seen" } });
  });
});

describe("lead note 2: where a place is", () => {
  it("a room by name; a corridor inside the building; outdoors the facility's outdoor region", () => {
    const en = makeWorld("stemi-inferior-rv");
    const zh = makeWorld("stemi-inferior-rv", { locale: "zh-CN" });
    const resus = en.runtime.entity("room:ed-resus")!;
    expect(en.runtime.regionName({ level: "L0", x: resus.position.x, z: resus.position.z })).toBe("Resuscitation Room");
    // the spawn, outside the main building and in no room
    const spawn = en.facility.spawn;
    expect(en.runtime.regionName({ level: "L0", x: spawn.x, z: spawn.z })).toBe("Healing Garden");
    expect(zh.runtime.regionName({ level: "L0", x: spawn.x, z: spawn.z })).toBe("疗愈花园");
    // a point of the main building in no room: its corridor
    const corridor = findCorridorPoint(en);
    expect(en.runtime.regionName({ level: "L0", ...corridor })).toBe("a corridor of ClinicalCraft General Hospital");
    expect(zh.runtime.regionName({ level: "L0", ...corridor })).toBe("临床方块综合医院走廊");
  });

  it("room exits name what lies beyond: a room, the corridor or the outdoor region", () => {
    const w = makeWorld("stemi-inferior-rv");
    const info = w.runtime.roomInfo(A, "ed-resus")!;
    for (const x of info.exits) expect(x.toName).toBeTruthy();
    expect(info.exits.some((x) => x.to === null && /corridor/.test(x.toName))).toBe(true);
    const lobby = w.runtime.roomInfo(A, "lobby")!;
    expect(lobby.exits.some((x) => x.to === null && x.toName === "Healing Garden")).toBe(true);
    expect(lobby.exits.every((x) => !/outside \/ a corridor/.test(x.toName))).toBe(true);
  });
});

/** A free point inside the main building but in no room (the actor stands there). */
function findCorridorPoint(w: ReturnType<typeof makeWorld>): { x: number; z: number } {
  const b = w.facility.buildings[0]!.rect;
  for (let z = b.z - b.d / 2 + 1; z < b.z + b.d / 2; z += 0.5)
    for (let x = b.x - b.w / 2 + 1; x < b.x + b.w / 2; x += 0.5) {
      w.runtime.updatePose(A, at(x, z));
      if (w.runtime.actor(A)!.room === null) return { x, z };
    }
  throw new Error("no corridor point");
}
