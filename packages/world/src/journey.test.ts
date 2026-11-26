/**
 * The patient's journeys in the event log (EMBODIED §8.4, audit 2026-11-12 P2-11): a walk with someone (the
 * follower's own spot, steps and path along a route planned for them — never the walker's pose, never through a wall
 * or a window: audit W3), a transport on their bed, a trolley or on foot (departure, transit, arrival, the colleague
 * who takes over), and a relocation by a phase or an intervention (no journey) — told by `patient.departed` /
 * `patient.arrived` and kept in `PatientPlaceState.legs`.
 */
import { describe, expect, it } from "vitest";
import { buildCollisionModel } from "./collision.js";
import { PRIMARY_ACTOR, type PatientLeg, type PathPoint, type Pose, type WorldEvent } from "./contracts.js";
import { levelElevation } from "./levels.js";
import { PHYSICS } from "./physics.js";
import { segmentCrossesArea } from "./raster.js";
import { catalogs, makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;

function events(w: TestWorld): WorldEvent[] {
  const out: WorldEvent[] = [];
  w.runtime.subscribe((e) => out.push(e));
  return out;
}

const legs = (w: TestWorld): PatientLeg[] => w.runtime.snapshot().entities[w.patientId]?.patient?.legs ?? [];
const arrived = (seen: WorldEvent[]) => seen.filter((e): e is Extract<WorldEvent, { type: "patient.arrived" }> => e.type === "patient.arrived");
const departed = (seen: WorldEvent[]) => seen.filter((e): e is Extract<WorldEvent, { type: "patient.departed" }> => e.type === "patient.departed");
const near = (a: { x: number; z: number }, b: { x: number; z: number }, m = 0.05) => Math.hypot(a.x - b.x, a.z - b.z) <= m;

/** The walls, partitions, windows and balustrades (at body height) a path's steps cross: none when a person walked it. */
function crossings(w: TestWorld, path: readonly PathPoint[]): string[] {
  const floor = (level: string) => levelElevation(w.facility, level);
  const barriers = buildCollisionModel(w.facility, catalogs()).colliders.filter((c) => ["wall", "partition", "window", "rail"].includes(c.kind) && c.maxY - floor(c.level) > 0.05 && c.minY - floor(c.level) < PHYSICS.height);
  const out: string[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!, b = path[i]!;
    if (a.level === b.level) for (const c of barriers) if (c.level === a.level && segmentCrossesArea(a, b, c)) out.push(c.id);
  }
  return out;
}

async function follow(w: TestWorld) {
  expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
  expect((await w.act({ actorId: A, operation: "escort_patient", targetId: w.patientId })).status).toBe("completed");
}

describe("walking with someone: the follower's own path and arrival (audit P2-11)", () => {
  it("each walk of the walker is a leg of the patient's own — departure, their path a step behind along the walker's way, arrival", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await follow(w);
    const start = w.runtime.patientPlace()!;
    expect(legs(w)).toEqual([]);
    const seen = events(w);
    const walk = await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: "eq:ws-imaging" } });
    expect(walk.status).toBe("completed");
    const end = w.runtime.patientPlace()!;
    expect(departed(seen)).toEqual([expect.objectContaining({ kind: "escort", by: A, role: "clinician", mode: "walk", vehicle: null, to: null, from: { slot: null, provider: null, room: start.room } })]);
    const [done] = arrived(seen);
    expect(done!.leg).toMatchObject({ kind: "escort", mode: "walk", by: A, status: "arrived", vehicle: null, receivedBy: null, monitor: null, to: { room: end.room } });
    // their own path: from where they stood, along the walker's way, to where they arrived — not the walker's pose
    const path = done!.path!;
    expect(near(path[0]!, start)).toBe(true);
    expect(near(path.at(-1)!, end)).toBe(true);
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(done!.leg.distance).toBeGreaterThan(walk.navigation!.length - 2);
    // their own route (W3): planned for them from where they stood — through no wall or window
    expect(crossings(w, path)).toEqual([]);
    // the walk's events carry it; the record keeps the leg
    expect(walk.events.map((e) => e.type)).toEqual(expect.arrayContaining(["patient.departed", "patient.arrived"]));
    expect(legs(w)).toEqual([done!.leg]);
    // a walk on: one more leg, from where they arrived
    await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: "eq:ct-scanner" } });
    expect(legs(w)).toHaveLength(2);
    expect(legs(w)[1]).toMatchObject({ kind: "escort", from: { room: end.room } });
  });

  it("a hand-steered walk (sensor poses): the patient walks by their own steps, a step behind — no world version; the stretch is recorded with their path when they stop (audit W3)", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await follow(w);
    const seen = events(w);
    const v = w.runtime.version;
    const me = w.runtime.actor(A)!.pose;
    const start = w.runtime.patientPlace()!;
    // facing the way they walk (+x), steered by hand in steps of a quarter of a metre (a slow walk's sensor poses)
    const east = -Math.PI / 2;
    const step = (dx: number, yaw = east): Pose => ({ ...me, x: me.x + dx, yaw });
    for (let i = 1; i <= 12; i++) w.runtime.updatePose(A, step(i * 0.25));
    // the walk is in progress: set off, nothing recorded yet, no world version (their own steps change only them)
    expect(departed(seen)).toHaveLength(1);
    expect(arrived(seen)).toEqual([]);
    expect(w.runtime.version).toBe(v);
    // their own spot, a step behind the walker — they step once the walker is more than 1.2 m away (FOLLOW_KEEP)
    const walked = w.runtime.patientPlace()!;
    expect(walked.escort).toBe(A);
    expect(Math.hypot(walked.x - (me.x + 3), walked.z - me.z)).toBeLessThanOrEqual(1.2);
    expect(near(walked, { x: me.x + 3, z: me.z }, 0.3)).toBe(false);
    // turning round on the spot is no walk: they stay where they stand (before W3 their place was derived from the
    // walker's pose and swung round behind the new facing)
    w.runtime.updatePose(A, step(3, east + Math.PI));
    expect(w.runtime.patientPlace()).toMatchObject({ x: walked.x, z: walked.z });
    const r = await w.act({ actorId: A, operation: "release_patient", targetId: w.patientId });
    expect(r.status).toBe("completed");
    const [done] = arrived(seen);
    expect(done!.leg).toMatchObject({ kind: "escort", mode: "walk", by: A, status: "arrived" });
    const path = done!.path!;
    expect(near(path[0]!, start)).toBe(true);
    // their steps, one each time the walker got away from them: none through a wall or a window
    expect(path.length).toBeGreaterThan(3);
    expect(crossings(w, path)).toEqual([]);
    expect(done!.leg.distance).toBeGreaterThan(2.5);
    expect(legs(w)).toHaveLength(1);
  });

  it("the verifier's replay (audit W3): a hand-steered move through a window is no step — the patient stays in the room, the walk together ends there, the jump is no leg", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await follow(w);
    const seen = events(w);
    const me = w.runtime.actor(A)!.pose;
    const north = Math.PI;
    // by hand to the consultation room's window onto the garden (facing +z, steps of half a metre)
    for (let z = me.z; z <= 6; z += 0.5) w.runtime.updatePose(A, { ...me, z, yaw: north });
    for (let x = me.x; x >= -7.75; x -= 0.5) w.runtime.updatePose(A, { ...me, x, z: 6, yaw: north });
    const before = w.runtime.patientPlace()!;
    expect(before).toMatchObject({ room: "consult", escort: A });
    // one sensor pose 3.4 m on, through the window: sight passes a window, a body does not
    w.runtime.updatePose(A, { ...me, x: -8, z: 9.4, yaw: north });
    expect(w.runtime.actor(A)!.room).toBeNull();
    const after = w.runtime.patientPlace()!;
    // before W3: at (-8.45, 8.7) in the garden, still walking with the clinician
    expect(after.escort).toBeUndefined();
    expect(after.room).toBe("consult");
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.5);
    expect(seen.some((e) => e.type === "patient.escort" && e.escort === null)).toBe(true);
    // the walk up to the window is their leg, stopped where they stood; the jump is none of it
    const [leg] = arrived(seen);
    expect(leg!.leg).toMatchObject({ kind: "escort", mode: "walk", status: "stopped", to: { room: "consult" } });
    expect(leg!.path!.every((p) => p.z < 6.5)).toBe(true);
    expect(crossings(w, leg!.path!)).toEqual([]);
  });

  it("a transport picks them up where the walk together ended: two legs, the walk's and the transport's", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await follow(w);
    const me = w.runtime.actor(A)!.pose;
    w.runtime.updatePose(A, { ...me, x: me.x + 2 });
    const seen = events(w);
    const r = await w.act({ actorId: A, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    expect(r.status, r.message).toBe("completed");
    expect(arrived(seen).map((e) => e.leg.kind)).toEqual(["escort", "transport"]);
    expect(legs(w).map((l) => [l.kind, l.mode])).toEqual([
      ["escort", "walk"],
      ["transport", "walk"],
    ]);
  });

  it("a jump of the walker's body is no walk: the follower stops where they last were, and the leg says so (re-review)", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await follow(w);
    const seen = events(w);
    const me = w.runtime.actor(A)!.pose;
    // two real steps by hand, then one sensor update 30 m away (outside any room, through walls)
    for (const dx of [1, 2]) w.runtime.updatePose(A, { ...me, x: me.x + dx });
    const before = w.runtime.patientPlace()!;
    w.runtime.updatePose(A, { ...me, x: me.x + 32 });
    const after = w.runtime.patientPlace()!;
    expect(after.escort).toBeUndefined();
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(1.6);
    const [leg] = arrived(seen);
    expect(leg!.leg).toMatchObject({ kind: "escort", mode: "walk", status: "stopped" });
    expect(leg!.leg.distance).toBeLessThan(4);
    expect(leg!.path!.every((p) => Math.abs(p.x - me.x) < 4)).toBe(true);
    expect(seen.some((e) => e.type === "patient.escort" && e.escort === null)).toBe(true);
  });

  it("clinical state stops them on the way: the stretch ends 'stopped' where they are", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await follow(w);
    const me = w.runtime.actor(A)!.pose;
    w.runtime.updatePose(A, { ...me, x: me.x + 2 });
    w.harness.cues.posture = "lying";
    expect(w.runtime.refreshPatient()).toBe(true);
    expect(legs(w)).toEqual([expect.objectContaining({ kind: "escort", status: "stopped" })]);
  });
});

describe("transports: departure, transit, arrival and the handover (audit P2-11)", () => {
  it("on their bed: who held them, how, from where to where, departure and arrival; at home the ward nurse takes over", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    const seen = events(w);
    const go = await w.act({ actorId: A, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    expect(go.status, go.message).toBe("completed");
    expect(departed(seen)).toEqual([expect.objectContaining({ kind: "transport", by: A, role: "clinician", mode: "bed", vehicle: "eq:ward-bed-1", monitor: null, from: { slot: "ward-1", provider: null, room: "ward" }, to: { slot: null, provider: "eq:ct-scanner", room: "rad-ct" } })]);
    const out = arrived(seen)[0]!.leg;
    expect(out).toMatchObject({ kind: "transport", mode: "bed", vehicle: "eq:ward-bed-1", status: "arrived", to: { provider: "eq:ct-scanner" }, receivedBy: null, receivedRole: null });
    expect(out.distance).toBeGreaterThan(50);
    expect(out.arrivedAt).toBeGreaterThanOrEqual(out.departedAt);
    // the order of the event log: set off, walk, arrive
    const types = go.events.map((e) => e.type);
    expect(types.indexOf("patient.departed")).toBeLessThan(types.indexOf("actor.moved"));
    expect(types.indexOf("patient.moved")).toBeLessThan(types.indexOf("patient.arrived"));
    // back to the ward bay: the ward nurse at the bedside takes over
    const back = await w.act({ actorId: A, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "home" } });
    expect(back.status, back.message).toBe("completed");
    expect(legs(w).at(-1)).toMatchObject({ kind: "transport", mode: "bed", receivedBy: "staff:ward-nurse", receivedRole: "nurse", to: { slot: "ward-1" } });
    expect(back.message).toMatch(/took over/);
    expect(w.runtime.observe(A).recentEvents.map((e) => e.summary)).toEqual(expect.arrayContaining([expect.stringMatching(/took over$/)]));
  });

  it("on a trolley (a cubicle's stretcher); a patient who walks goes on foot", async () => {
    const w = makeWorld("pulmonary-embolism-postop", { slotId: "ed-cubicle-1" });
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } })).status).toBe("completed");
    expect(legs(w).at(-1)).toMatchObject({ kind: "transport", mode: "trolley", vehicle: "eq:cub1-stretcher" });
    const smzl = makeWorld("smzl-lung-adeno");
    expect((await smzl.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: smzl.patientId } })).status).toBe("completed");
    expect((await smzl.act({ actorId: A, operation: "transport_patient", targetId: smzl.patientId, parameters: { destination: "eq:ct-scanner" } })).status).toBe("completed");
    expect(legs(smzl).at(-1)).toMatchObject({ kind: "transport", mode: "walk", vehicle: null });
  });

  it("a relocation by a phase or an intervention is no journey: no departure, nobody in transit, no handover — its cause", () => {
    const w = makeWorld("pulmonary-embolism-postop");
    const seen = events(w);
    expect(w.runtime.relocatePatient({ setting: "icu" }, { intervention: "transfer-hdu" }).ok).toBe(true);
    expect(departed(seen)).toEqual([]);
    const [leg] = arrived(seen).map((e) => e.leg);
    expect(leg).toMatchObject({ kind: "relocation", mode: null, vehicle: null, by: null, role: null, distance: 0, receivedBy: null, cause: { intervention: "transfer-hdu" }, to: { slot: "icu-1" } });
    expect(leg!.arrivedAt).toBe(leg!.departedAt);
    // the patient.moved event still carries the team's route (the record, the browser's placement)
    expect(seen.find((e) => e.type === "patient.moved")).toMatchObject({ by: null });
    // a relocation is told by its patient.moved, not twice
    expect(w.runtime.observe(A).recentEvents.filter((e) => e.type === "patient.arrived")).toEqual([]);
  });

  it("zh-CN wording of the journey's stages", async () => {
    const w = makeWorld("pulmonary-embolism-postop", { locale: "zh-CN" });
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } })).status).toBe("completed");
    const back = await w.act({ actorId: A, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "home" } });
    expect(back.message).toMatch(/由.+在那里接手/);
    const recent = w.runtime.observe(A).recentEvents.map((e) => e.summary);
    expect(recent).toEqual(expect.arrayContaining([expect.stringMatching(/^你带.+出发（推病床）$/), expect.stringMatching(/到达.+，由.+接手$/)]));
  });
});
