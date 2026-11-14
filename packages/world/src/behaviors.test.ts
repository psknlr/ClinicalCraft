import { describe, expect, it } from "vitest";
import { behaviorOf, evaluatePredicate, isPlacementPredicate, type PredicateEnv } from "./behaviors.js";
import { PRIMARY_ACTOR, type ActorState, type Pose, type WorldPredicate } from "./contracts.js";
import { createWorldRuntime } from "./runtime.js";
import { catalogs, hospitalWithTestItems, makeWorld, type TestWorld } from "./__fixtures__/world.js";
import { loadFacility } from "./__fixtures__/content.js";
import { DEVICE, STAFF, standBeside, theatreCatalog, theatreWorld } from "./__fixtures__/theatre.js";

const A = PRIMARY_ACTOR;
const ops = (w: TestWorld, id: string) => behaviorOf(w.runtime.entity(id)!).operations.map((o) => o.id);

/** Stand at the patient's best interaction point (the policy's hint goal). */
async function toPatient(w: TestWorld, actorId = A) {
  const r = await w.act({ actorId, operation: "approach", targetId: w.patientId });
  expect(r.status, r.message).toBe("completed");
}

describe("operations by kind (built-in and catalog behaviours)", () => {
  const w = makeWorld("stemi-inferior-rv");

  it("each entity offers only what its behaviour defines", () => {
    expect(ops(w, "eq:ct-scanner")).toEqual(["use"]); // a CT scanner never offers pick_up
    expect(ops(w, "eq:lab-workstation")).toEqual(["order", "read"]);
    expect(ops(w, "eq:resus1-monitor")).toEqual(["attach", "read", "cycle_nibp"]);
    expect(ops(w, "eq:resus1-ecg")).toEqual(["prepare", "connect", "record", "reset", "move_to"]);
    expect(ops(w, "eq:resus1-defibrillator")).toEqual(["use", "move_to"]);
    expect(ops(w, "eq:resus-sink")).toEqual(["wash_hands"]);
    expect(ops(w, "eq:resus1-bed")).toEqual([]);
    expect(ops(w, "eq:evidence-board")).toEqual([]);
    // the patient is wheeled (or walked) to a device, a bed space or back (EMBODIED §8, G8), or walks with you / waits
    expect(ops(w, w.patientId)).toEqual(["transport_patient", "escort_patient", "release_patient", "reposition_patient"]);
    for (const id of ["staff:ed-nurse", "room:ed-resus", "level:L0"]) expect(ops(w, id), id).toEqual([]);
    const doors = w.runtime.entities().filter((e) => e.kind === "door");
    expect(doors.length).toBeGreaterThan(5);
    for (const d of doors) expect(ops(w, d.id)).toEqual(["open", "close", "lock", "unlock"]); // a door never offers order
    for (const e of w.runtime.entities().filter((x) => x.kind === "equipment")) {
      expect(ops(w, e.id).includes("pick_up"), e.id).toBe(false); // no handheld items in the built-in catalogs
      expect(ops(w, e.id).includes("move_to"), e.id).toBe(e.portable === "cart");
    }
    const cabinet = w.runtime.entities().find((e) => e.type === "cabinet")!;
    expect(ops(w, cabinet.id)).toEqual(["open", "close"]);
  });

  it("handheld items add pick_up / put_down / equip / hand_over", () => {
    const { facility, catalogs } = hospitalWithTestItems();
    const t = makeWorld("stemi-inferior-rv", { facility, catalogs });
    expect(ops(t, "eq:pocket-glu-1")).toEqual(["use", "pick_up", "put_down", "equip", "hand_over"]);
  });
});

describe("world predicates", () => {
  const env = (o: Partial<PredicateEnv> = {}): PredicateEnv => ({ state: "idle", role: "nurse", handsClean: false, holding: (x) => x === "gloves", actorWithin: (m) => m >= 2, patientWithin: () => false, deviceAtBedside: () => true, ...o });
  const cases: [WorldPredicate, boolean][] = [
    [{ state: "idle" }, true],
    [{ state: ["prepared", "connected"] }, false],
    [{ role: ["nurse", "attending"] }, true],
    [{ role: ["porter"] }, false],
    [{ handsClean: true }, false],
    [{ actorHolding: "gloves" }, true],
    [{ actorWithin: 1.5 }, false],
    [{ actorWithin: 2 }, true],
    [{ deviceAtBedside: true }, true],
    [{ all: [{ state: "idle" }, { deviceAtBedside: true }] }, true],
    [{ any: [{ handsClean: true }, { patientWithin: 1 }] }, false],
    [{ not: { handsClean: true } }, true],
  ];
  it.each(cases)("%j → %s", (p, expected) => {
    expect(evaluatePredicate(p, env())).toBe(expected);
  });
  it("placement predicates are told apart from preconditions", () => {
    expect(isPlacementPredicate({ actorWithin: 1 })).toBe(true);
    expect(isPlacementPredicate({ any: [{ state: "x" }, { not: { patientWithin: 1 } }] })).toBe(true);
    expect(isPlacementPredicate({ deviceAtBedside: true })).toBe(false);
    expect(isPlacementPredicate({ all: [{ handsClean: true }, { role: ["nurse"] }] })).toBe(false);
  });
});

describe("available actions depend on state, role and preconditions — not on position", () => {
  it("at the resus bedside", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const actions = (id: string) => w.runtime.find(A, { awareness: ["visible", "nearby", "remembered", "mapped"] }).find((e) => e.id === id)?.availableActions ?? w.runtime.inspect(A, id)?.availableActions;
    await toPatient(w);
    expect(actions("eq:resus1-ecg")).toEqual(["prepare", "move_to"]);
    expect(actions("eq:resus1-monitor")).toEqual(["attach"]);
    expect(actions("eq:resus2-monitor")).toEqual([]); // not this patient's monitor
    expect(actions("eq:resus1-crash-cart")).toEqual(["use", "move_to"]);
    const door = w.runtime.collision.doors.find((d) => d.rooms.includes("ed-resus") && d.rooms.includes("ed-hall"))!.id;
    expect(actions(door)).toEqual(["open"]); // closed; lock is not the clinician's
    // a far ECG cart is known once seen; away from the bedside it can only be wheeled
    w.runtime.updatePose(A, { x: -26.5, y: 0, z: -34, yaw: Math.PI, pitch: 0, level: "L0" });
    expect(w.runtime.canSee(A, "eq:ward-ecg")).toBe(true);
    expect(actions("eq:ward-ecg")).toEqual(["move_to"]);
    const inspect = w.runtime.inspect(A, "eq:ward-ecg")!;
    expect(inspect.operations.find((o) => o.op === "prepare")).toMatchObject({ available: false, reason: expect.stringMatching(/bedside/) });
    // after attaching, the monitor offers read and cycle_nibp
    w.harness.dispatch({ type: "intervene", interventionId: "cardiac-monitoring" });
    expect(actions("eq:resus1-monitor")).toEqual(["read", "cycle_nibp"]);
  });
});

describe("the ECG machine (catalog state machine)", () => {
  it("prepare → connect → record (order_test by capability) → reset, with its reservation and durations", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await toPatient(w);
    w.harness.elapsed.length = 0;
    const ecg = "eq:resus1-ecg";
    const prepare = await w.act({ actorId: A, operation: "prepare", targetId: ecg });
    expect(prepare).toMatchObject({ status: "completed", targetVersion: 1 });
    expect(prepare.events.map((e) => e.type)).toEqual(["entity.state", "reservation.changed", "action.completed"]);
    expect(prepare.events[0]).toMatchObject({ from: "idle", to: "prepared", operation: "prepare", actorId: A });
    expect(w.runtime.snapshot().entities[ecg]).toMatchObject({ state: "prepared", reservedBy: A });
    expect(await w.act({ actorId: A, operation: "record", targetId: ecg })).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect((await w.act({ actorId: A, operation: "connect", targetId: ecg })).status).toBe("completed");
    const record = await w.act({ actorId: A, operation: "record", targetId: ecg });
    expect(record).toMatchObject({ status: "completed", clinical: { tool: "order_test", ok: true } });
    expect(record.clinicalEventIds!.length).toBeGreaterThan(0);
    expect(w.harness.calls.at(-1)).toEqual({ actorId: A, tool: "order_test", args: { investigation_id: "ecg-12lead" }, actionId: record.actionId });
    expect(w.harness.state().orders.map((o) => o.investigationId)).toContain("ecg-12lead");
    const reset = await w.act({ actorId: A, operation: "reset", targetId: ecg });
    expect(reset.events.map((e) => e.type)).toEqual(["entity.state", "reservation.changed", "action.completed"]);
    expect(w.runtime.snapshot().entities[ecg]).toEqual({ version: 4, state: "idle" });
    // physical steps charge their duration; the clinical step is the engine's action cost
    expect(w.harness.elapsed).toEqual([
      { seconds: 30, reason: "procedure" },
      { seconds: 120, reason: "procedure" },
      { seconds: 30, reason: "procedure" },
    ]);
  });

  it("a parameter picks another investigation the cart provides; one it does not provide is refused", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await toPatient(w);
    for (const op of ["prepare", "connect"]) expect((await w.act({ actorId: A, operation: op, targetId: "eq:resus1-ecg" })).status).toBe("completed");
    const other = await w.act({ actorId: A, operation: "record", targetId: "eq:resus1-ecg", parameters: { investigation: "hs-troponin" } });
    expect(other).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect(other.message).toMatch(/cannot provide/);
    // capabilities by their display labels, never raw ids
    expect(other.message).toContain("clinical chemistry");
    expect(other.message).not.toContain("lab-chemistry");
    expect(other.hint).toBeUndefined(); // troponin is a lab test whose sample is taken right here: no walk needed
    const right = await w.act({ actorId: A, operation: "record", targetId: "eq:resus1-ecg", parameters: { investigation: "ecg-right-sided" } });
    expect(right.status).toBe("completed");
    expect(w.harness.calls.at(-1)!.args).toEqual({ investigation_id: "ecg-right-sided" });
  });

  it("a denied or rejected clinical step commits no transition", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await toPatient(w);
    for (const op of ["prepare", "connect"]) await w.act({ actorId: A, operation: op, targetId: "eq:resus1-ecg" });
    w.harness.gate = () => "denied";
    const denied = await w.act({ actorId: A, operation: "record", targetId: "eq:resus1-ecg" });
    expect(denied).toMatchObject({ status: "failed", errorCode: "APPROVAL_DENIED", clinical: { ok: false } });
    expect(w.runtime.snapshot().entities["eq:resus1-ecg"]).toMatchObject({ state: "connected", reservedBy: A });
    w.harness.gate = null;
    // reading a result never ordered: the engine rejects it
    w.runtime.updatePose(A, { x: 9.5, y: 0, z: -7.2, yaw: Math.PI, pitch: 0, level: "L0" });
    const read = await w.act({ actorId: A, operation: "read", targetId: "lab-workstation", parameters: { investigation: "hs-troponin" } });
    expect(read).toMatchObject({ status: "failed", errorCode: "CLINICAL_REJECTED" });
  });
});

describe("workstations: a records terminal is order entry and the result viewer (EMBODIED §6)", () => {
  it("lab orders once the sample is taken; lab and bedside results; never a bedside test's order", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: "ed-records" })).status).toBe("completed");
    expect(w.runtime.inspect(A, "ed-records")!.availableActions).toEqual(expect.arrayContaining(["order", "read"]));
    // no sample yet: refused by the policy, back to the patient
    const early = await w.act({ actorId: A, operation: "order", targetId: "ed-records", parameters: { investigation: "hs-troponin" } });
    expect(early).toMatchObject({ status: "failed", errorCode: "SPATIAL_REQUIREMENT_UNMET", hint: { goal: { kind: "interact", id: w.patientId } } });
    // the IV-access procedure drew the bloods: the order goes in from the terminal
    w.harness.dispatch({ type: "intervene", interventionId: "iv-access", by: "agent" });
    const ordered = await w.act({ actorId: A, operation: "order", targetId: "ed-records", parameters: { investigation: "hs-troponin" } });
    expect(ordered.status, ordered.message).toBe("completed");
    expect(w.harness.calls.at(-1)).toMatchObject({ tool: "order_test", args: { investigation_id: "hs-troponin" } });
    // a bedside test is never ordered at a terminal (the cart, at the patient)
    const ecg = await w.act({ actorId: A, operation: "order", targetId: "ed-records", parameters: { investigation: "ecg-12lead" } });
    expect(ecg).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    // results: the troponin once ready, a recorded ECG — both from the terminal
    w.harness.dispatch({ type: "advance-time", minutes: 60, by: "agent" });
    expect((await w.act({ actorId: A, operation: "read", targetId: "ed-records", parameters: { investigation: "hs-troponin" } })).status).toBe("completed");
    w.harness.dispatch({ type: "order", investigationId: "ecg-12lead", by: "agent" });
    w.harness.dispatch({ type: "advance-time", minutes: 10, by: "agent" });
    const readEcg = await w.act({ actorId: A, operation: "read", targetId: "ed-records", parameters: { investigation: "ecg-12lead" } });
    expect(readEcg.status, readEcg.message).toBe("completed");
    expect(w.harness.calls.at(-1)).toMatchObject({ tool: "read_result", args: { investigation_id: "ecg-12lead" } });
  });
});

describe("the patient monitor (derived from the engine, EMBODIED R6)", () => {
  it("its state follows the engine's monitor attachment; only the patient's monitor has one", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const state = (id: string) => w.runtime.inspect(A, id)?.state;
    await toPatient(w);
    expect(state("eq:resus1-monitor")).toBe("detached");
    // attached through the clinical tool path, outside the world: the world shows it at once
    w.harness.dispatch({ type: "intervene", interventionId: "cardiac-monitoring" });
    expect(state("eq:resus1-monitor")).toBe("attached");
    expect(state("eq:resus2-monitor")).toBe("detached");
    expect(w.runtime.snapshot().entities["eq:resus1-monitor"]).toBeUndefined(); // never stored
  });

  it("attach runs the case's monitoring intervention; another bed's monitor is refused", async () => {
    const w = makeWorld("dka-adult");
    await toPatient(w);
    const other = await w.act({ actorId: A, operation: "attach", targetId: "eq:resus2-monitor" });
    expect(other).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    const r = await w.act({ actorId: A, operation: "attach", targetId: "eq:resus1-monitor" });
    expect(r).toMatchObject({ status: "completed", clinical: { tool: "intervene", ok: true } });
    expect(w.harness.calls.map((c) => c.args)).toEqual([{ intervention_id: "cardiac-monitoring" }]);
    expect(r.events[0]).toMatchObject({ type: "entity.state", from: "detached", to: "attached" });
    const read = await w.act({ actorId: A, operation: "read", targetId: "eq:resus1-monitor" });
    expect(read.status).toBe("completed");
    expect(read.message).toMatch(/HR \d+\/min/);
  });

  it("a monitor without a reachable interaction point: attach from the patient's side, read the screen from range, cycle_nibp is refused without a hint", async () => {
    // ward bed 1's monitor at its pre-fix position, wedged between the wall, the bed and the pump
    const facility = structuredClone(loadFacility("general-hospital"));
    Object.assign(facility.placements.find((p) => p.id === "ward-monitor-1")!, { x: -44.7, z: -41.15 });
    const w = makeWorld("pulmonary-embolism-postop", { facility });
    expect(w.runtime.plan(A, { kind: "interact", id: "ward-monitor-1" })).toMatchObject({ ok: false, code: "TARGET_NOT_REACHABLE" });
    expect(w.slotId).toBe("ward-1");
    await toPatient(w);
    expect((await w.act({ actorId: A, operation: "attach", targetId: "eq:ward-monitor-1" })).status).toBe("completed");
    w.runtime.updatePose(A, { x: -36, y: 0, z: -34, yaw: 0, pitch: 0, level: "L0" });
    const far = await w.act({ actorId: A, operation: "read", targetId: "eq:ward-monitor-1" });
    expect(far).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE", hint: { goal: { kind: "look", id: "eq:ward-monitor-1", range: 6 } } });
    expect((await w.act({ actorId: A, operation: "navigate", goal: far.hint!.goal })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "read", targetId: "eq:ward-monitor-1" })).status).toBe("completed");
    const nibp = await w.act({ actorId: A, operation: "cycle_nibp", targetId: "eq:ward-monitor-1" });
    expect(nibp).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE", hint: null });
    expect(nibp.message).toMatch(/TARGET_NOT_REACHABLE|NO_INTERACTION_POINT/);
  });
});

describe("doors", () => {
  it("open / close / lock / unlock; closing on someone in the doorway is refused; locking blocks routes", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const doors = w.runtime.collision.doors.filter((d) => d.rooms.includes("ed-store"));
    expect(doors).toHaveLength(1); // the ED store has a single door
    const door = doors[0];
    const R = "staff:receptionist";
    expect(w.runtime.plan(A, { kind: "room", id: "ed-store" }).ok).toBe(true);
    expect((await w.act({ actorId: R, operation: "approach", targetId: door.id })).status).toBe("completed");
    const lock = await w.act({ actorId: R, operation: "lock", targetId: door.id });
    expect(lock.events[0]).toMatchObject({ type: "door.changed", open: false, locked: true, actorId: R });
    expect(w.runtime.plan(A, { kind: "room", id: "ed-store" })).toMatchObject({ ok: false, code: "PATH_BLOCKED", details: { doors: [door.id] } });
    expect(await w.act({ actorId: R, operation: "open", targetId: door.id })).toMatchObject({ errorCode: "PRECONDITION_FAILED" });
    const unlock = await w.act({ actorId: R, operation: "unlock", targetId: door.id });
    expect(unlock.events[0]).toMatchObject({ type: "door.changed", open: false, locked: false, actorId: R });
    expect(w.runtime.plan(A, { kind: "room", id: "ed-store" }).ok).toBe(true);
    expect((await w.act({ actorId: R, operation: "open", targetId: door.id })).status).toBe("completed");
    expect(w.runtime.inspect(R, door.id)!.state).toBe("open");
    // someone in the doorway
    const inDoorway: Pose = { x: door.centre.x, y: 0, z: door.centre.z - 0.6, yaw: 0, pitch: 0, level: "L0" };
    w.runtime.updatePose(A, inDoorway);
    expect(await w.act({ actorId: R, operation: "close", targetId: door.id })).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    w.runtime.updatePose(A, { ...inDoorway, z: inDoorway.z - 3 });
    expect((await w.act({ actorId: R, operation: "close", targetId: door.id })).status).toBe("completed");
  });
});

describe("sinks, storage, handheld items, preconditions", () => {
  it("wash_hands: hygiene valid for 30 simulated minutes, a hygiene event, 30 s charged; a handsClean operation needs it", async () => {
    const { facility, catalogs } = hospitalWithTestItems();
    const w = makeWorld("stemi-inferior-rv", { facility, catalogs });
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:sterile-tray" })).status).toBe("completed");
    const unwrap = await w.act({ actorId: A, operation: "unwrap", targetId: "eq:sterile-tray" });
    expect(unwrap).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    // the learner sentence names no tool id; the hint carries it (the nearest sink, then wash_hands there)
    expect(unwrap.message).toMatch(/sink/);
    expect(unwrap.message).not.toMatch(/wash_hands/);
    expect(unwrap.hint).toMatchObject({ goal: { kind: "interact", id: "eq:resus-sink" }, then: { operation: "wash_hands", targetId: "eq:resus-sink" } });
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:resus-sink" })).status).toBe("completed");
    w.harness.elapsed.length = 0;
    const wash = await w.act({ actorId: A, operation: "wash_hands", targetId: "eq:resus-sink" });
    expect(wash.events.map((e) => e.type)).toEqual(["hygiene", "action.completed"]);
    expect(w.runtime.actor(A)!.handsCleanUntil).toBe(w.harness.state().clock + 30);
    expect(w.harness.elapsed).toEqual([{ seconds: 30, reason: "procedure" }]);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:sterile-tray" })).status).toBe("completed");
    expect(await w.act({ actorId: A, operation: "unwrap", targetId: "eq:sterile-tray" })).toMatchObject({ status: "completed", targetVersion: 1 });
  });

  it("storage opens and closes (stored state)", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const cabinet = w.runtime.entities().find((e) => e.type === "cabinet")!;
    expect((await w.act({ actorId: A, operation: "approach", targetId: cabinet.id })).status).toBe("completed");
    expect(await w.act({ actorId: A, operation: "close", targetId: cabinet.id })).toMatchObject({ errorCode: "PRECONDITION_FAILED" });
    expect((await w.act({ actorId: A, operation: "open", targetId: cabinet.id })).status).toBe("completed");
    expect(w.runtime.inspect(A, cabinet.id)!.state).toBe("open");
  });

  it("pick_up / equip / put_down, at most two in hand", async () => {
    const { facility, catalogs } = hospitalWithTestItems();
    const w = makeWorld("stemi-inferior-rv", { facility, catalogs });
    expect(await w.act({ actorId: A, operation: "put_down", targetId: "eq:pocket-glu-1" })).toMatchObject({ errorCode: "NOT_HOLDING" });
    expect(await w.act({ actorId: A, operation: "pick_up", targetId: "eq:pocket-glu-1" })).toMatchObject({ errorCode: "NOT_IN_RANGE" });
    for (const id of ["eq:pocket-glu-1", "eq:pocket-glu-2"]) {
      expect((await w.act({ actorId: A, operation: "approach", targetId: id })).status).toBe("completed");
      const r = await w.act({ actorId: A, operation: "pick_up", targetId: id });
      expect(r.events[0]).toMatchObject({ type: "item.held", entityId: id, held: true });
    }
    expect(w.runtime.actor(A)!.holding).toEqual(["eq:pocket-glu-1", "eq:pocket-glu-2"]);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:pocket-glu-3" })).status).toBe("completed");
    expect(await w.act({ actorId: A, operation: "pick_up", targetId: "eq:pocket-glu-3" })).toMatchObject({ errorCode: "HANDS_FULL" });
    expect(w.runtime.snapshot().entities["eq:pocket-glu-1"]).toMatchObject({ heldBy: A });
    // the item travels with its holder
    await w.act({ actorId: A, operation: "approach", targetId: w.patientId });
    const held = w.runtime.observe(A).entities.find((e) => e.id === "eq:pocket-glu-1")!;
    expect(held).toMatchObject({ distance: 0, awareness: "visible", inReach: true, state: "held" });
    expect((await w.act({ actorId: A, operation: "equip", targetId: "eq:pocket-glu-1" })).status).toBe("completed");
    expect(await w.act({ actorId: A, operation: "equip", targetId: "eq:pocket-glu-1" })).toMatchObject({ errorCode: "PRECONDITION_FAILED" });
    const down = await w.act({ actorId: A, operation: "put_down", targetId: "eq:pocket-glu-1" });
    expect(down.events.map((e) => e.type)).toEqual(["item.held", "entity.moved", "action.completed"]);
    expect(w.runtime.actor(A)!.holding).toEqual(["eq:pocket-glu-2"]);
    const at = w.runtime.snapshot().entities["eq:pocket-glu-1"].position!;
    const me = w.runtime.actor(A)!.pose;
    expect(Math.hypot(at.x - me.x, at.z - me.z)).toBeLessThanOrEqual(3);
    expect(w.runtime.snapshot().entities["eq:pocket-glu-1"].data).toBeUndefined();
  });
});

describe("operations restricted by a surgical control (EMBODIED §8.2)", () => {
  /** Beside the device (a sensor pose), what the world offers this body there — and the code of each refusal. */
  const offered = (w: TestWorld, actor: string, id: string) => {
    standBeside(w, actor, id);
    const seen = w.runtime.inspect(actor, id)!;
    return { available: seen.availableActions, refused: Object.fromEntries(seen.operations.filter((o) => !o.available).map((o) => [o.op, o.code])) };
  };
  const act = async (w: TestWorld, actor: string, operation: string, id: string) => {
    standBeside(w, actor, id);
    return w.act({ actorId: actor, operation, targetId: id });
  };

  it("behaviorOf copies an operation's control beside its roles; an operation without one names none", () => {
    const w = theatreWorld();
    const controls = (id: string) => behaviorOf(w.runtime.entity(id)!).operations.map((o) => [o.id, o.control]);
    expect(controls(DEVICE.stapler)).toEqual([
      ["load", "instruments"],
      ["fire", "operate"],
    ]);
    expect(controls(DEVICE.tower)).toEqual([
      ["power_on", "equipment"],
      ["power_off", "equipment"],
    ]);
    expect(controls(DEVICE.lung)).toEqual([
      ["isolate", "anaesthesia"],
      ["restore", "anaesthesia"],
    ]);
    expect(controls(DEVICE.camera)).toEqual([["balance", undefined]]);
    for (const e of w.runtime.entities().filter((x) => x.kind === "equipment" && !x.type.startsWith("test-"))) {
      for (const o of behaviorOf(e).operations) expect(o.control, `${e.id} ${o.id}`).toBeUndefined();
    }
  });

  it("offered and refused by position: the scrub nurse loads the stapler and cannot fire it, the circulating nurse switches the tower on, the anaesthetist isolates the lung", async () => {
    const w = theatreWorld();
    // the scrub nurse: the instrument table, never the operator's step nor the equipment — the control comes before the state
    expect(offered(w, STAFF.scrub, DEVICE.stapler)).toEqual({ available: ["load"], refused: { fire: "NOT_AUTHORIZED" } });
    expect((await act(w, STAFF.scrub, "load", DEVICE.stapler)).status).toBe("completed");
    const fire = await act(w, STAFF.scrub, "fire", DEVICE.stapler);
    expect(fire).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED", message: "Fire the stapler is for the operating surgeon: Chen Yu is the scrub nurse." });
    expect(fire.hint).toBeUndefined(); // no walk gives anyone a position
    expect(w.runtime.stateOf(DEVICE.stapler)).toBe("loaded");
    expect(offered(w, STAFF.scrub, DEVICE.tower)).toEqual({ available: [], refused: { power_on: "NOT_AUTHORIZED", power_off: "NOT_AUTHORIZED" } });
    // the circulating nurse: the equipment outside the sterile field, never the instrument table
    expect(offered(w, STAFF.circulating, DEVICE.tower)).toEqual({ available: ["power_on"], refused: { power_off: "PRECONDITION_FAILED" } });
    expect((await act(w, STAFF.circulating, "power_on", DEVICE.tower)).status).toBe("completed");
    expect(w.runtime.stateOf(DEVICE.tower)).toBe("on");
    expect(offered(w, STAFF.circulating, DEVICE.stapler)).toEqual({ available: [], refused: { load: "NOT_AUTHORIZED", fire: "NOT_AUTHORIZED" } });
    // the anaesthetist isolates the lung; an assistant never does
    expect(offered(w, STAFF.anaesthetist, DEVICE.lung)).toEqual({ available: ["isolate"], refused: { restore: "PRECONDITION_FAILED" } });
    expect((await act(w, STAFF.anaesthetist, "isolate", DEVICE.lung)).status).toBe("completed");
    expect(offered(w, STAFF.first, DEVICE.lung)).toEqual({ available: [], refused: { isolate: "NOT_AUTHORIZED", restore: "NOT_AUTHORIZED" } });
    expect((await act(w, STAFF.first, "restore", DEVICE.lung)).message).toBe("Ventilate both lungs is for the anaesthetist: Dr Abe is the first assistant.");
    // a member of staff outside the team: their position's defaults (a porter holds none)
    expect(offered(w, STAFF.porter, DEVICE.tower).available).toEqual([]);
    expect((await act(w, STAFF.porter, "power_off", DEVICE.tower)).message).toBe("Switch off is for the circulating nurse: Li Qiang is the porter.");
  });

  it("the learner without a place holds every control; in a place, that place's; the colleague standing by, none", async () => {
    // no place: the operator, who may also do the team's parts
    const w = theatreWorld();
    for (const [operation, id] of [
      ["load", DEVICE.stapler],
      ["fire", DEVICE.stapler],
      ["power_on", DEVICE.tower],
      ["isolate", DEVICE.lung],
    ] as const) {
      expect(offered(w, A, id).available, operation).toContain(operation);
      expect((await act(w, A, operation, id)).status, operation).toBe("completed");
    }
    // the scrub nurse's place, taken in core (a session still refuses places): that place's controls
    const s = theatreWorld({ start: { type: "start", seat: "scrub-nurse" } });
    expect(s.harness.state().seat).toBe("scrub-nurse");
    expect(offered(s, A, DEVICE.stapler)).toEqual({ available: ["load"], refused: { fire: "NOT_AUTHORIZED" } });
    expect((await act(s, A, "load", DEVICE.stapler)).status).toBe("completed");
    const fire = await act(s, A, "fire", DEVICE.stapler);
    expect(fire).toMatchObject({ errorCode: "NOT_AUTHORIZED", message: "Fire the stapler is for the operating surgeon: you are the scrub nurse." });
    expect(fire.hint).toBeUndefined();
    expect((await act(s, A, "power_on", DEVICE.tower)).message).toBe("Switch on is for the circulating nurse: you are the scrub nurse.");
    // the scrub nurse whose place it is stands by: nothing
    expect(offered(s, STAFF.scrub, DEVICE.stapler)).toEqual({ available: [], refused: { load: "NOT_AUTHORIZED", fire: "NOT_AUTHORIZED" } });
    const standing = await act(s, STAFF.scrub, "fire", DEVICE.stapler);
    expect(standing).toMatchObject({ errorCode: "NOT_AUTHORIZED", message: "Fire the stapler is for the operating surgeon: Chen Yu stands by — you hold the scrub nurse's place." });
    expect(standing.hint).toBeUndefined();
    // the stand-in operates: the surgeon's controls — the stapler fired, never a reload loaded
    expect(offered(s, STAFF.standIn, DEVICE.stapler)).toEqual({ available: ["fire"], refused: { load: "NOT_AUTHORIZED" } });
    expect((await act(s, STAFF.standIn, "fire", DEVICE.stapler)).status).toBe("completed");
    expect((await act(s, STAFF.standIn, "load", DEVICE.stapler)).message).toBe("Load a reload is for the scrub nurse: Dr Ito is the operating surgeon.");
    // the first assistant's place: traction, suction (and the camera), never the instrument table or the operator's step
    const f = theatreWorld({ start: { type: "start", seat: "first-assistant" } });
    expect(offered(f, A, DEVICE.stapler)).toEqual({ available: [], refused: { load: "NOT_AUTHORIZED", fire: "NOT_AUTHORIZED" } });
    expect((await act(f, A, "load", DEVICE.stapler)).message).toBe("Load a reload is for the scrub nurse: you are the first assistant.");
    expect((await act(f, STAFF.first, "load", DEVICE.stapler)).message).toBe("Load a reload is for the scrub nurse: Dr Abe stands by — you hold the first assistant's place.");
  });

  it("availableActions are exactly the operations the action bus lets through, for every body and device", async () => {
    for (const start of [undefined, { type: "start", seat: "scrub-nurse" } as const, { type: "start", seat: "second-assistant", lineup: "three-surgeons" } as const]) {
      const w = theatreWorld(start ? { start } : {});
      for (const actor of [A, ...Object.values(STAFF)]) {
        for (const id of Object.values(DEVICE)) {
          standBeside(w, actor, id);
          const seen = w.runtime.inspect(actor, id)!;
          // standing beside it, nothing spatial is in the way: offered ⟺ precheck lets it through
          expect(seen.availableActions, `${actor} ${id}`).toEqual(seen.operations.filter((o) => o.available).map((o) => o.op));
          for (const row of seen.operations.filter((o) => !o.available)) {
            const r = await w.act({ actorId: actor, operation: row.op, targetId: id });
            expect([r.errorCode, r.message], `${actor} ${id} ${row.op}`).toEqual([row.code, row.reason]);
          }
        }
      }
    }
  });

  it("a hint's next step is one the actor may take: the tower switched on by the circulating nurse, never by the scrub nurse", async () => {
    const w = theatreWorld();
    const balance = async (actor: string) => {
      standBeside(w, actor, DEVICE.camera);
      return w.act({ actorId: actor, operation: "balance", targetId: DEVICE.camera });
    };
    const nurse = await balance(STAFF.circulating);
    expect(nurse).toMatchObject({ errorCode: "PRECONDITION_FAILED", hint: { goal: { kind: "interact", id: DEVICE.tower }, then: { operation: "power_on", targetId: DEVICE.tower } } });
    const scrub = await balance(STAFF.scrub);
    expect(scrub).toMatchObject({ errorCode: "PRECONDITION_FAILED", hint: { goal: { kind: "interact", id: DEVICE.tower } } });
    expect(scrub.hint!.then).toBeUndefined();
    // the white balance names no control: once the tower is on, anyone its roles allow does it
    standBeside(w, STAFF.circulating, DEVICE.tower);
    expect((await w.act({ actorId: STAFF.circulating, operation: "power_on", targetId: DEVICE.tower })).status).toBe("completed");
    expect((await balance(STAFF.scrub)).status).toBe("completed");
  });

  it("no position or control is stored on a body: a snapshot round trip stays byte-identical", async () => {
    const w = theatreWorld();
    standBeside(w, STAFF.scrub, DEVICE.stapler);
    expect((await w.act({ actorId: STAFF.scrub, operation: "load", targetId: DEVICE.stapler })).status).toBe("completed");
    expect((await w.act({ actorId: STAFF.scrub, operation: "fire", targetId: DEVICE.stapler })).errorCode).toBe("NOT_AUTHORIZED");
    standBeside(w, STAFF.circulating, DEVICE.tower);
    expect((await w.act({ actorId: STAFF.circulating, operation: "power_on", targetId: DEVICE.tower })).status).toBe("completed");
    const snapshot = w.runtime.snapshot();
    const fields: (keyof ActorState)[] = ["id", "role", "controller", "pose", "room", "task", "holding", "seen", "handsCleanUntil", "lastSeen"];
    for (const a of snapshot.actors) for (const key of Object.keys(a)) expect(fields, `${a.id}.${key}`).toContain(key);
    const restored = createWorldRuntime({ facility: w.facility, catalogs: [...catalogs(), theatreCatalog()], binding: { caseDef: w.caseDef, slotId: w.slotId, locale: "en" }, clinical: w.harness.view, port: w.harness.port, now: () => 0, newId: () => "x", snapshot });
    expect(JSON.stringify(restored.snapshot())).toBe(JSON.stringify(snapshot));
    // and the restored world still refuses by control
    expect(restored.inspect(STAFF.scrub, DEVICE.stapler)!.operations.find((o) => o.op === "fire")).toMatchObject({ available: false, code: "NOT_AUTHORIZED" });
  });
});
