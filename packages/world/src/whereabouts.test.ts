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
    // the clinician learns where it is (asks the nurse who moved it), walks up to it and sees it there…
    expect(w.runtime.askWhereabouts(A, ECG, NURSE)).toMatchObject({ answeredBy: NURSE, updated: true });
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

/** The audit's set-up: the clinician in the physician office, the nurse wheels the bay's ECG cart to cubicle 1. */
async function cartMovedOutOfSight(locale = "en") {
  const w = makeWorld("stemi-inferior-rv", { locale });
  expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
  expect((await w.act({ actorId: NURSE, operation: "approach", targetId: ECG })).status).toBe("completed");
  expect((await w.act({ actorId: NURSE, operation: "move_to", targetId: ECG, goal: { kind: "room", id: "ed-cubicle-1" } })).status).toBe("completed");
  expect(w.runtime.roomOf(ECG)).toBe("ed-cubicle-1");
  return w;
}

describe("audit 2026-11-12 P1-8: navigation goes where the actor believes a thing is", () => {
  it("the audit's replay: sought where believed, missing when not there, found by asking the nurse who moved it — each step in the trace", async () => {
    const w = await cartMovedOutOfSight();
    // what the clinician is told is unchanged: usually kept in the resus room
    expect(w.runtime.whereabouts(A, ECG)).toMatchObject({ kind: "usual", room: "ed-resus" });
    // approaching it by id goes there — the resus room — not to the cubicle where it really is
    const r = await w.act({ actorId: A, operation: "approach", targetId: ECG });
    expect(r).toMatchObject({ status: "failed", errorCode: "STALE_DESTINATION", belief: { entityId: ECG, kind: "usual", room: "ed-resus", found: "absent" }, hint: null });
    expect(r.message).toBe("12-lead ECG 1 is not in Resuscitation Room, where it is usually kept. Look around, or ask a colleague.");
    expect(w.runtime.actor(A)!.room).toBe("ed-resus");
    expect(r.events.map((e) => e.type)).toContain("actor.moved");
    // now it knows only that it is not there
    expect(w.runtime.whereabouts(A, ECG)).toMatchObject({ kind: "missing", place: null, room: null, missed: { room: "ed-resus" } });
    const listed = w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!;
    expect(listed).toMatchObject({ room: null, reachable: null, inReach: false, lastKnown: { kind: "missing", label: "not in Resuscitation Room when you looked — whereabouts unknown" } });
    expect(listed.pathDistance).toBeUndefined();
    expect(w.runtime.find(A, { room: "ed-resus", capabilities: ["ecg-12lead"] }).map((e) => e.id)).not.toContain(ECG);
    // going there again leads nowhere: no walk, no time
    const elapsed = w.harness.elapsed.length;
    const again = await w.act({ actorId: A, operation: "approach", targetId: ECG });
    expect(again).toMatchObject({ status: "failed", errorCode: "STALE_DESTINATION", belief: { found: "unknown" } });
    expect(again.message).toMatch(/You do not know where 12-lead ECG 1 is now: it was not in Resuscitation Room/);
    expect(again.events.map((e) => e.type)).not.toContain("actor.moved");
    expect(w.harness.elapsed.length).toBe(elapsed);
    expect(w.runtime.plan(A, { kind: "interact", id: ECG })).toMatchObject({ ok: false, code: "STALE_DESTINATION" });
    // asking around: the nurse who wheeled it there knows; the clinician now believes it there
    const answer = w.runtime.askWhereabouts(A, ECG);
    expect(answer).toMatchObject({ answeredBy: NURSE, updated: true, whereabouts: { room: "ed-cubicle-1" } });
    expect(answer.asked).toContain(NURSE);
    expect(answer.message).toBe("Lin Xiao: 12-lead ECG 1 is in ED Cubicle 1.");
    expect(w.runtime.whereabouts(A, ECG)).toMatchObject({ kind: "told", room: "ed-cubicle-1", toldBy: NURSE });
    expect(w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!.lastKnown).toEqual({ kind: "told", label: "Lin Xiao said it is in ED Cubicle 1" });
    const there = await w.act({ actorId: A, operation: "approach", targetId: ECG });
    expect(there.status, there.message).toBe("completed");
    expect(w.runtime.find(A, { capabilities: ["ecg-12lead"], awareness: ["visible", "nearby"] }).map((e) => e.id)).toContain(ECG);
    // the trace: the stale belief and the walk to it, the absence, the inquiry, the update
    const spans = w.trace.spans();
    const nav = spans.find((sp) => sp.kind === "navigation" && sp.refs.errorCode === "STALE_DESTINATION");
    expect(nav).toMatchObject({ name: "approach", ok: false, data: { belief: { entityId: ECG, kind: "usual", room: "ed-resus", found: "absent" } } });
    const knowledge = spans.filter((sp) => sp.name === "whereabouts" || sp.name === "ask_whereabouts").map((sp) => [sp.name, sp.data?.change ?? sp.data?.answeredBy]);
    expect(knowledge).toEqual([
      ["whereabouts", "absent"],
      ["ask_whereabouts", NURSE],
      ["whereabouts", "told"],
    ]);
    expect(spans.find((sp) => sp.name === "whereabouts" && sp.data?.change === "told")).toMatchObject({ actorId: A, refs: { entities: [ECG, NURSE] }, data: { room: "ed-cubicle-1", by: NURSE } });
  });

  it("or it searches by looking: seen again, it is known where it is (the trace records the update)", async () => {
    const w = await cartMovedOutOfSight();
    expect((await w.act({ actorId: A, operation: "approach", targetId: ECG })).errorCode).toBe("STALE_DESTINATION");
    // looking round the department: into the cubicle — it comes into view
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "ed-cubicle-1" } })).status).toBe("completed");
    expect(w.runtime.whereabouts(A, ECG)!.kind).toMatch(/perceived|last-seen/);
    expect(w.trace.spans().filter((sp) => sp.name === "whereabouts").map((sp) => sp.data?.change)).toEqual(["absent", "seen"]);
    expect((await w.act({ actorId: A, operation: "approach", targetId: ECG })).status).toBe("completed");
  });

  it("not where it was believed but in view from there: the walk goes on to it", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    // the nurse wheels the cart from where it is kept to the patient, in the same room
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: "eq:resus2-ecg" })).status).toBe("completed");
    expect((await w.act({ actorId: NURSE, operation: "move_to", targetId: "eq:resus2-ecg", goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    const r = await w.act({ actorId: A, operation: "approach", targetId: "eq:resus2-ecg" });
    expect(r).toMatchObject({ status: "completed", belief: { entityId: "eq:resus2-ecg", kind: "usual", found: "in-view" } });
    expect(r.message).toMatch(/^12-lead ECG 2 was not in Resuscitation Room, where you expected it; you saw it from there and went to it\. Arrived/);
    expect(r.events.filter((e) => e.type === "actor.moved")).toHaveLength(2);
    expect(w.runtime.whereabouts(A, "eq:resus2-ecg")!.kind).toBe("perceived");
  });

  it("staff go by the same rule: the nurse seeks a cart the clinician moved where she believes it is, and asks", async () => {
    const w = makeWorld("stemi-inferior-rv");
    // the clinician wheels the bay's cart out to cubicle 1 while the nurse is at her station
    expect((await w.act({ actorId: A, operation: "approach", targetId: ECG })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "move_to", targetId: ECG, goal: { kind: "room", id: "ed-cubicle-1" } })).status).toBe("completed");
    // whoever moved it knows where it is
    expect(w.runtime.whereabouts(A, ECG)!.room).toBe("ed-cubicle-1");
    const r = await w.act({ actorId: NURSE, operation: "approach", targetId: ECG });
    expect(r).toMatchObject({ status: "failed", errorCode: "STALE_DESTINATION", belief: { kind: "usual", room: "ed-resus", found: "absent" } });
    // she asks; the clinician who moved it answers
    expect(w.runtime.askWhereabouts(NURSE, ECG)).toMatchObject({ answeredBy: A, updated: true });
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: ECG })).status).toBe("completed");
  });

  it("an actor walking for another (a delegated fetch) tells them where they left it", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: ECG, onBehalfOf: A })).status).toBe("completed");
    expect((await w.act({ actorId: NURSE, operation: "move_to", targetId: ECG, goal: { kind: "room", id: "ed-cubicle-1" }, onBehalfOf: A })).status).toBe("completed");
    expect(w.runtime.whereabouts(A, ECG)).toMatchObject({ kind: "told", room: "ed-cubicle-1", toldBy: NURSE });
    expect((await w.act({ actorId: A, operation: "approach", targetId: ECG })).status).toBe("completed");
  });

  it("refusals and hints follow the belief: no true distance of a thing out of view; a missing cart is the last to be hinted", async () => {
    const w = await cartMovedOutOfSight();
    const far = await w.act({ actorId: A, operation: "move_to", targetId: ECG, goal: { kind: "interact", id: w.patientId } });
    expect(far).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE", hint: { goal: { kind: "interact", id: ECG } } });
    expect(far.message).toBe('"12-lead ECG 1" is not within your reach here: you believe it is in Resuscitation Room.');
    expect(far.message).not.toMatch(/\d+(\.\d)? m away/);
    // inspecting it says the same of every operation out of reach
    const ops = w.runtime.inspect(A, ECG)!.operations.filter((o) => o.code === "NOT_IN_RANGE");
    expect(ops.length).toBeGreaterThan(0);
    for (const o of ops) expect(o.reason).toBe('"12-lead ECG 1" is not within your reach here: you believe it is in Resuscitation Room.');
    expect((await w.act({ actorId: A, operation: "approach", targetId: ECG })).errorCode).toBe("STALE_DESTINATION");
    // the ECG is needed at the bedside: the hint names a cart the clinician can go to, not the one it knows is missing
    const check = w.runtime.checkSpatial(A, { tool: "order_test", kind: "order", investigationId: "ecg-12lead" });
    expect(check.ok).toBe(false);
    if (check.ok) return;
    const named = check.hint && "id" in check.hint.goal ? check.hint.goal.id : null;
    expect(named).not.toBe(ECG);
  });

  it("an operation on a cart out of sight answers where the actor believes it is — never its true distance, spot or bedside (re-review)", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const CUB2 = "eq:cub2-ecg";
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    // the nurse wheels the cubicle's cart to the patient's bedside out of the clinician's sight
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: CUB2 })).status).toBe("completed");
    expect((await w.act({ actorId: NURSE, operation: "move_to", targetId: CUB2, goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    expect(w.runtime.whereabouts(A, CUB2)).toMatchObject({ kind: "usual", room: "ed-cubicle-2" });
    const truth = w.runtime.snapshot().entities[CUB2]!.position!;
    for (const operation of ["prepare", "record"]) {
      const r = await w.act({ actorId: A, operation, targetId: CUB2 });
      expect(r, operation).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE", hint: { goal: { kind: "interact", id: CUB2 } } });
      expect(r.message, operation).toBe('"Cubicle ECG Cart" is not within your reach here: you believe it is in ED Cubicle 2.');
      expect(r.message, operation).not.toMatch(/\d+(\.\d)? m away/);
      // the hint leads to the belief (an entity goal), never to a point by its true spot
      expect(r.hint?.goal, operation).not.toMatchObject({ kind: "point" });
    }
    // inspecting it says the same of every operation done at it (no bedside, state or distance of the truth)
    for (const o of w.runtime.inspect(A, CUB2)!.operations) if (!o.available) expect(o.reason, o.op).toBe('"Cubicle ECG Cart" is not within your reach here: you believe it is in ED Cubicle 2.');
    // the bay's own cart wheeled to cubicle 1: "prepare" no longer answers "not at the patient's bedside" from afar
    const moved = await cartMovedOutOfSight();
    const prep = await moved.act({ actorId: A, operation: "prepare", targetId: ECG });
    expect(prep).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE" });
    expect(prep.message).toBe('"12-lead ECG 1" is not within your reach here: you believe it is in Resuscitation Room.');
    // known to be missing: no hint at all
    expect((await moved.act({ actorId: A, operation: "approach", targetId: ECG })).errorCode).toBe("STALE_DESTINATION");
    expect(await moved.act({ actorId: A, operation: "prepare", targetId: ECG })).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE", hint: null });
    void truth;
  });

  it("a body steered by hand (sensor poses) remembers what it sees: seen by walking up to it, found again by id (re-review)", async () => {
    const w = await cartMovedOutOfSight();
    const cart = w.runtime.snapshot().entities[ECG]!.position!;
    const plan = w.runtime.plan(A, { kind: "point", x: cart.x, z: cart.z - 1.6, level: cart.level });
    expect(plan.ok).toBe(true);
    const me = w.runtime.actor(A)!.pose;
    const v = w.runtime.version;
    for (const p of plan.ok ? plan.path : []) w.runtime.updatePose(A, { ...me, x: p.x, z: p.z, level: p.level, yaw: Math.atan2(-(cart.x - p.x), -(cart.z - p.z)) });
    expect(w.runtime.canSee(A, ECG)).toBe(true);
    expect(w.runtime.whereabouts(A, ECG)).toMatchObject({ kind: "perceived" });
    // back to the resus room by hand: remembered where it was seen — memory only, no world version
    const back = w.runtime.plan(A, { kind: "room", id: "ed-resus" });
    for (const p of back.ok ? back.path : []) w.runtime.updatePose(A, { ...w.runtime.actor(A)!.pose, x: p.x, z: p.z, level: p.level });
    expect(w.runtime.whereabouts(A, ECG)).toMatchObject({ kind: "last-seen", room: "ed-cubicle-1" });
    expect(w.runtime.version).toBe(v);
    // "Go there": the walk by id finds it where it was seen
    expect((await w.act({ actorId: A, operation: "approach", targetId: ECG })).status).toBe("completed");
  });

  it("what an actor knows survives a snapshot: missing, then told", async () => {
    const w = await cartMovedOutOfSight();
    expect((await w.act({ actorId: A, operation: "approach", targetId: ECG })).errorCode).toBe("STALE_DESTINATION");
    const missing = makeWorld("stemi-inferior-rv", { extra: { snapshot: w.runtime.snapshot() } });
    expect(missing.runtime.whereabouts(A, ECG)).toMatchObject({ kind: "missing", missed: { room: "ed-resus" } });
    w.runtime.askWhereabouts(A, ECG, NURSE);
    const told = makeWorld("stemi-inferior-rv", { extra: { snapshot: w.runtime.snapshot() } });
    expect(told.runtime.whereabouts(A, ECG)).toMatchObject({ kind: "told", toldBy: NURSE, room: "ed-cubicle-1" });
    expect(JSON.stringify(told.runtime.snapshot())).toBe(JSON.stringify(w.runtime.snapshot()));
  });

  it("zh-CN wording", async () => {
    const w = await cartMovedOutOfSight("zh-CN");
    const r = await w.act({ actorId: A, operation: "approach", targetId: ECG });
    expect(r.message).toBe("12 导联心电图机 1不在抢救室（通常放在那里）。请在周围找找，或问问同事。");
    expect(w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!.lastKnown).toEqual({ kind: "missing", label: "你去抢救室找过，不在那里——下落不明" });
    expect(w.runtime.askWhereabouts(A, ECG, "staff:radiologist").message).toBe("陈立不知道12 导联心电图机 1现在在哪里（通常放在抢救室）。");
    expect(w.runtime.askWhereabouts(A, ECG, NURSE).message).toBe("林晓：12 导联心电图机 1在急诊诊室 1。");
    expect(w.runtime.find(A, { capabilities: ["ecg-12lead"] }).find((e) => e.id === ECG)!.lastKnown).toEqual({ kind: "told", label: "林晓说在急诊诊室 1" });
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
