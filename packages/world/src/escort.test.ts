/**
 * Walking with the patient (EMBODIED §8.4): `escort_patient` ("follow me") and `release_patient` ("wait here").
 * A patient who can walk goes wherever the actor goes — a world walk or a sensor pose — and every rule that
 * measures from the patient follows; it ends with a wait, a transport, a transfer or clinical state that no longer
 * lets them walk. Who cannot walk (lying, unresponsive, unwell) is refused with the reason.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type PatientPlace, type WorldEvent } from "./contracts.js";
import { catalogs, makeWorld, type TestWorld } from "./__fixtures__/world.js";
import { createWorldRuntime } from "./runtime.js";

const place = (w: TestWorld): PatientPlace => w.runtime.patientPlace()!;
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

function events(w: TestWorld): WorldEvent[] {
  const out: WorldEvent[] = [];
  w.runtime.subscribe((e) => out.push(e));
  return out;
}

async function follow(w: TestWorld, actorId = PRIMARY_ACTOR) {
  const near = await w.act({ actorId, operation: "navigate", goal: { kind: "interact", id: w.patientId } });
  expect(near.status, near.message).toBe("completed");
  return w.act({ actorId, operation: "escort_patient", targetId: w.patientId });
}

describe("follow me (escort_patient)", () => {
  it("an outpatient gets up and walks with the clinician wherever they go — no time charged, no body on the floor meanwhile", async () => {
    const w = makeWorld("smzl-lung-adeno");
    const seen = events(w);
    const before = w.harness.elapsed.length;
    const r = await follow(w);
    expect(r.status, r.message).toBe("completed");
    expect(r.message).toMatch(/walks with you/);
    expect(place(w)).toMatchObject({ slot: null, provider: null, posture: "standing", support: null, escort: PRIMARY_ACTOR, home: { slot: "consult-1", provider: null } });
    expect(seen.find((e) => e.type === "patient.escort")).toMatchObject({ escort: PRIMARY_ACTOR, actorId: PRIMARY_ACTOR });
    // the clinician walks to the imaging room: the patient is at their side there
    const go = await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ws-imaging" } });
    expect(go.status, go.message).toBe("completed");
    const me = w.runtime.actor(PRIMARY_ACTOR)!;
    const p = place(w);
    expect(dist(p, me.pose)).toBeLessThan(1.2);
    expect(p.room).toBe(me.room);
    // only the walk was charged (the clinician's own), nothing for getting up
    expect(w.harness.elapsed.slice(before).map((e) => e.reason)).toEqual(["travel", "travel"]);
    // every rule measured from the patient follows: hands on is possible here
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "examine", kind: "examine" }).ok).toBe(true);
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "ask_patient", kind: "ask" }).ok).toBe(true);
    // the patient is not drawn into the grids while walking with someone: the clinician's own spot stays free
    expect(w.runtime.plan(PRIMARY_ACTOR, { kind: "point", x: p.x, z: p.z }).ok).toBe(true);
  });

  it("a hand-steered avatar (sensor poses) takes the patient along without a stored step or a version", async () => {
    const w = makeWorld("smzl-lung-adeno");
    expect((await follow(w)).status).toBe("completed");
    const v = w.runtime.version;
    const me = w.runtime.actor(PRIMARY_ACTOR)!;
    w.runtime.updatePose(PRIMARY_ACTOR, { ...me.pose, x: me.pose.x + 2, z: me.pose.z });
    const p = place(w);
    expect(dist(p, { x: me.pose.x + 2, z: me.pose.z })).toBeLessThan(1.2);
    expect(w.runtime.version).toBe(v);
  });

  it("a study at a fixed device still needs the patient on it: the hint takes them there, which ends the walk together", async () => {
    const w = makeWorld("smzl-lung-adeno");
    expect((await follow(w)).status).toBe("completed");
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ct-scanner" } });
    const ct = w.caseDef.investigations.find((i) => i.requires?.includes("ct"))!;
    const check = w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: ct.id });
    expect(!check.ok && check.reason).toBe("patient-not-at-provider");
    if (check.ok || !check.hint?.then) return;
    const seen = events(w);
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: check.hint.then.operation, targetId: check.hint.then.targetId, ...(check.hint.then.parameters ? { parameters: check.hint.then.parameters } : {}) });
    expect(r.status, r.message).toBe("completed");
    expect(place(w)).toMatchObject({ provider: "eq:ct-scanner", posture: "lying" });
    expect(place(w).escort).toBeUndefined();
    expect(seen.find((e) => e.type === "patient.escort")).toMatchObject({ escort: null, actorId: null });
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: ct.id }).ok).toBe(true);
  });

  it("back to their own bed space afterwards: they walk home and are there again", async () => {
    const w = makeWorld("smzl-lung-adeno");
    expect((await follow(w)).status).toBe("completed");
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ct-scanner" } });
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "home" } });
    expect(r.status, r.message).toBe("completed");
    expect(place(w)).toMatchObject({ slot: "consult-1", posture: "standing" });
    expect(place(w).escort).toBeUndefined();
  });

  it("is asked from conversation range: from across the clinic, the way to the patient", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ct-scanner" } });
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "escort_patient", targetId: w.patientId });
    expect(r).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE" });
    expect(r.hint?.goal).toMatchObject({ id: w.patientId });
    expect(place(w).escort).toBeUndefined();
  });

  it("who cannot walk is refused with the reason (both languages): lying by clinical state, unresponsive, unwell", async () => {
    const lying = makeWorld("pulmonary-embolism-postop");
    const a = await follow(lying);
    expect(a).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect(a.message).toMatch(/lying down|bed/);
    const zh = makeWorld("pulmonary-embolism-postop", { locale: "zh-CN" });
    expect((await follow(zh)).message).toMatch(/卧床/);
    const mute = makeWorld("smzl-lung-adeno");
    mute.harness.cues.cannotSpeak = "";
    expect((await follow(mute)).message).toMatch(/cannot respond/);
    const sick = makeWorld("smzl-lung-adeno");
    sick.harness.cues.distressed = true;
    expect((await follow(sick)).message).toMatch(/too unwell/);
    // the patient's offered operations say so too
    const me = sick.runtime.observe(PRIMARY_ACTOR).entities.find((e) => e.id === sick.patientId);
    expect(me?.availableActions).not.toContain("escort_patient");
    expect(me?.availableActions).not.toContain("release_patient");
  });

  it("only the clinical team and porters ask a patient to come along (a receptionist may not)", async () => {
    const w = makeWorld("new-onset-t2dm");
    const r = await follow(w, "staff:receptionist");
    expect(r).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED" });
  });

  it("asked twice: the second time says they already walk with you", async () => {
    const w = makeWorld("smzl-lung-adeno");
    expect((await follow(w)).status).toBe("completed");
    const again = await w.act({ actorId: PRIMARY_ACTOR, operation: "escort_patient", targetId: w.patientId });
    expect(again).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect(again.message).toMatch(/already/);
  });
});

describe("wait here (release_patient) and the end of a walk together", () => {
  it("the patient stops and stands where they are; the clinician walks on alone", async () => {
    const w = makeWorld("smzl-lung-adeno");
    expect((await follow(w)).status).toBe("completed");
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ws-imaging" } });
    const seen = events(w);
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "release_patient", targetId: w.patientId });
    expect(r.status, r.message).toBe("completed");
    expect(r.message).toMatch(/waits in/);
    const stayed = place(w);
    expect(stayed).toMatchObject({ slot: null, provider: null, posture: "standing", support: null });
    expect(stayed.escort).toBeUndefined();
    expect(seen.find((e) => e.type === "patient.escort")).toMatchObject({ escort: null, actorId: PRIMARY_ACTOR });
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ct-scanner" } });
    expect(place(w)).toMatchObject({ x: stayed.x, z: stayed.z });
    // waiting is no walk together: nothing to stop
    const again = await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: w.patientId } });
    expect(again.status).toBe("completed");
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "release_patient", targetId: w.patientId })).message).toMatch(/not walking with anyone/);
  });

  it("clinical state lays them down on the way: they lie down where they are and the walk ends", async () => {
    const w = makeWorld("smzl-lung-adeno");
    expect((await follow(w)).status).toBe("completed");
    const seen = events(w);
    w.harness.cues.posture = "lying";
    expect(w.runtime.refreshPatient()).toBe(true);
    const p = place(w);
    expect(p.posture).toBe("lying");
    expect(p.escort).toBeUndefined();
    expect(seen.find((e) => e.type === "patient.escort")).toMatchObject({ escort: null, actorId: null });
  });

  it("a walk together is physical state: snapshots restore it", async () => {
    const w = makeWorld("smzl-lung-adeno");
    expect((await follow(w)).status).toBe("completed");
    const snapshot = w.runtime.snapshot();
    expect(snapshot.entities[w.patientId]?.patient?.escort).toBe(PRIMARY_ACTOR);
    const restored = createWorldRuntime({ facility: w.facility, catalogs: catalogs(), binding: { caseDef: w.caseDef, slotId: w.slotId, locale: "en" }, clinical: w.harness.view, port: w.harness.port, now: () => 0, newId: () => "x", snapshot });
    expect(restored.patientPlace()).toEqual(place(w));
    expect(restored.snapshot()).toEqual(snapshot);
  });

  it("the observer's recent events say who walks with whom (second person for the clinician)", async () => {
    const w = makeWorld("smzl-lung-adeno");
    expect((await follow(w)).status).toBe("completed");
    const recent = w.runtime.observe(PRIMARY_ACTOR).recentEvents.map((e) => e.summary);
    expect(recent.some((s) => /walks with you/.test(s))).toBe(true);
  });
});
