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
    // the clinician in the physician office; the nurse wheels the cart out towards the cubicles
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: ECG })).status).toBe("completed");
    const moved = await w.act({ actorId: NURSE, operation: "move_to", targetId: ECG, goal: { kind: "room", id: "ed-cubicle-1" } });
    expect(moved.status).toBe("completed");
    const away = w.runtime.inspect(NURSE, ECG)!.room!;
    expect(away).not.toBe("ed-resus");
    const believed = w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!;
    expect(believed).toMatchObject({ awareness: "mapped", room: "ed-resus", lastKnown: { kind: "usual" } });
    // the clinician walks up to it and sees it there…
    expect((await w.act({ actorId: A, operation: "approach", targetId: ECG })).status).toBe("completed");
    expect(w.runtime.find(A, { capabilities: ["ecg-12lead"], awareness: ["visible", "nearby"] }).map((e) => e.id)).toContain(ECG);
    // …walks away: remembered where it stood
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    const seen = w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!;
    const awayName = w.runtime.roomInfo(A, away)!.name;
    expect(seen).toMatchObject({ awareness: "remembered", room: away, lastKnown: { kind: "last-seen", label: `last seen in ${awayName}` } });
    // the nurse takes it back to the resus room out of the clinician's sight: the clinician still believes the cubicle
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: ECG })).status).toBe("completed");
    expect((await w.act({ actorId: NURSE, operation: "move_to", targetId: ECG, goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    expect(w.runtime.inspect(NURSE, ECG)!.room).toBe("ed-resus");
    const stale = w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!;
    expect(stale).toMatchObject({ awareness: "remembered", room: away, lastKnown: { kind: "last-seen" }, inReach: false });
    // the room filter follows the belief
    expect(w.runtime.find(A, { room: away, capabilities: ["ecg-12lead"] }).map((e) => e.id)).toContain(ECG);
    expect(w.runtime.find(A, { room: "ed-resus", capabilities: ["ecg-12lead"] }).map((e) => e.id)).not.toContain(ECG);
    // the belief survives a snapshot (the actor's memory)
    const again = makeWorld("stemi-inferior-rv", { extra: { snapshot: w.runtime.snapshot() } });
    expect(again.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)).toMatchObject({ room: away, lastKnown: { kind: "last-seen" } });
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
    // built-in buildings have corridor rooms; a building without one (the clinic's corridor room taken out): its corridor
    const clinic = structuredClone(loadFacility("clinic-v4"));
    const hall = clinic.rooms.find((r) => r.id === "corridor")!.rect;
    clinic.rooms = clinic.rooms.filter((r) => r.id !== "corridor");
    const bare = makeWorld("new-onset-t2dm", { facility: clinic });
    expect(bare.runtime.regionName({ level: "L0", x: hall.x, z: hall.z })).toBe("a corridor of Clinical Discovery Centre");
    expect(makeWorld("new-onset-t2dm", { facility: clinic, locale: "zh-CN" }).runtime.regionName({ level: "L0", x: hall.x, z: hall.z })).toBe("临床探索中心走廊");
    // …and its entrance door joins that corridor to the garden
    const door = bare.runtime.collision.doors.find((d) => d.rooms.every((r) => r === null))!;
    bare.runtime.updatePose(A, at(door.centre.x, door.centre.z + 2, Math.PI));
    expect(bare.runtime.inspect(A, door.id)!.description).toMatch(/a corridor of Clinical Discovery Centre ↔ Healing Garden|Healing Garden ↔ a corridor of Clinical Discovery Centre/);
  });

  it("a cart wheeled outdoors is reported as moved into the outdoor region, never to coordinates", async () => {
    const w = makeWorld("anaphylaxis-garden");
    const O2 = "eq:ed-store-o2-1";
    expect((await w.act({ actorId: A, operation: "approach", targetId: O2 })).status).toBe("completed");
    const moved = await w.act({ actorId: A, operation: "move_to", targetId: O2, goal: { kind: "point", x: -28, z: 26 } });
    expect(moved.status).toBe("completed");
    expect(w.runtime.inspect(A, O2)!.room).toBeNull();
    expect(moved.message).toMatch(/to Healing Garden \(/);
    expect(moved.message).not.toMatch(/\(-?\d+\.\d, -?\d+\.\d\)/);
  });

  it("room exits name what lies beyond: a room, else the corridor or the outdoor region — never 'outside / a corridor'", () => {
    const w = makeWorld("stemi-inferior-rv");
    const info = w.runtime.roomInfo(A, "ed-resus")!;
    for (const x of info.exits) expect(x.toName).toBe(x.to ? w.runtime.roomInfo(A, x.to)!.name : expect.any(String));
    const lobby = w.runtime.roomInfo(A, "lobby")!;
    expect(lobby.exits.some((x) => x.to === null && x.toName === "Healing Garden")).toBe(true);
    const th = makeWorld("stemi-inferior-rv", { facility: loadFacility("teaching-hospital"), locale: "zh-CN" });
    expect(th.runtime.roomInfo(A, "lobby")!.exits.some((x) => x.to === null && x.toName === "医院花园")).toBe(true);
  });
});
