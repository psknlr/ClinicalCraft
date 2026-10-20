import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type WorldEvent } from "./contracts.js";
import { hospitalWithTestItems, makeWorld, steppingMover, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const N = "staff:ed-nurse";

async function toPatient(w: TestWorld, actorId = A) {
  const r = await w.act({ actorId, operation: "approach", targetId: w.patientId });
  expect(r.status, r.message).toBe("completed");
}

/** A gate that holds every clinical call until released (or aborted). */
function holdingGate(w: TestWorld) {
  let release!: (v: "ok" | "denied") => void;
  const held = new Promise<"ok" | "denied">((r) => (release = r));
  let entered!: () => void;
  const started = new Promise<void>((r) => (entered = r));
  w.harness.gate = (_tool, _args, signal) => {
    entered();
    return new Promise((resolve) => {
      held.then(resolve);
      signal?.addEventListener("abort", () => resolve("ok"));
    });
  };
  return { release, started };
}

describe("validation and resolution", () => {
  const w = makeWorld("stemi-inferior-rv");

  it("malformed requests → INVALID_REQUEST (recorded only under a usable action id)", async () => {
    const noId = await w.runtime.execute({ actorId: A, operation: "navigate" } as never);
    expect(noId).toMatchObject({ status: "failed", errorCode: "INVALID_REQUEST", actionId: "" });
    const badGoal = await w.act({ actionId: "bad-goal", actorId: A, operation: "navigate", goal: { kind: "point", x: Number.NaN, z: 0 } });
    expect(badGoal).toMatchObject({ errorCode: "INVALID_REQUEST" });
    expect(badGoal.message).toMatch(/finite/);
    expect(w.runtime.feedback("bad-goal")).toBe(badGoal);
    expect(await w.act({ actorId: A, operation: "navigate", goal: { kind: "warp" } as never })).toMatchObject({ errorCode: "INVALID_REQUEST" });
    expect(await w.act({ actorId: A, operation: "open", parameters: [] as never, targetId: "x" })).toMatchObject({ errorCode: "INVALID_REQUEST" });
    expect(await w.act({ actorId: A, operation: "navigate" })).toMatchObject({ errorCode: "INVALID_REQUEST" });
    expect(await w.act({ actorId: A, operation: "open" })).toMatchObject({ errorCode: "INVALID_REQUEST" });
  });

  it("unknown actor, unknown target, unsupported operation", async () => {
    expect(await w.act({ actorId: "actor:ghost", operation: "navigate", goal: { kind: "room", id: "lobby" } })).toMatchObject({ errorCode: "UNKNOWN_ACTOR" });
    expect(await w.act({ actorId: A, operation: "open", targetId: "eq:nope" })).toMatchObject({ errorCode: "TARGET_NOT_FOUND" });
    const door = w.runtime.collision.doors[0].id;
    const order = await w.act({ actorId: A, operation: "order", targetId: door });
    expect(order).toMatchObject({ status: "failed", errorCode: "OPERATION_NOT_SUPPORTED" });
    // operations by their names in the reader's language, never their ids (extra review item 3)
    expect(order.message).toMatch(/"Order a test"\. Its operations: Open, Close, Lock, Unlock\./);
    const zh = makeWorld("stemi-inferior-rv", { locale: "zh-CN" });
    const zhOrder = await zh.act({ actorId: A, operation: "order", targetId: door });
    expect(zhOrder.message).not.toMatch(/\b(order|open|close|lock|unlock)\b/);
    expect(zhOrder.message).toMatch(/、/);
    expect(await w.act({ actorId: A, operation: "pick_up", targetId: "ct-scanner" })).toMatchObject({ errorCode: "OPERATION_NOT_SUPPORTED" });
    expect(await w.act({ actorId: A, operation: "use", targetId: w.patientId })).toMatchObject({ errorCode: "OPERATION_NOT_SUPPORTED" });
  });

  it("aliases resolve: unprefixed placement ids, staff ids, 'patient', 'clinician'", () => {
    expect(w.runtime.resolveId("resus1-ecg")).toBe("eq:resus1-ecg");
    expect(w.runtime.resolveId("patient")).toBe(w.patientId);
    expect(w.runtime.resolveId("ed-nurse")).toBe(N);
    expect(w.runtime.resolveId("clinician")).toBe(A);
    expect(w.runtime.resolveId("nothing-here")).toBeNull();
  });
});

describe("navigation", () => {
  it("plans, moves, commits the pose, records what is seen, charges travel once; the record has the telemetry", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const seen: [WorldEvent["type"], number][] = [];
    w.runtime.subscribe((e, v) => seen.push([e.type, v]));
    const r = await w.act({ actionId: "nav-1", actorId: A, operation: "approach", targetId: w.patientId });
    expect(r).toMatchObject({ status: "completed", worldVersion: 1, targetVersion: 0 });
    expect(r.events.map((e) => e.type)).toEqual(["actor.moved", "actor.entered-room", "actor.discovered", "action.completed"]);
    expect(r.navigation).toMatchObject({ actionId: "nav-1", actorId: A, goal: { kind: "interact", id: w.patientId }, ok: true, replans: 0, arrivalError: 0 });
    expect(r.navigation!.length).toBeGreaterThan(40);
    expect(r.navigation!.path.length).toBeGreaterThan(1);
    expect(w.harness.elapsed).toHaveLength(1);
    expect(w.harness.elapsed[0].reason).toBe("travel");
    expect(w.harness.elapsed[0].seconds).toBeCloseTo(r.navigation!.travelSeconds, 1);
    expect(r.elapsedSeconds).toBeCloseTo(r.navigation!.travelSeconds, 2);
    expect(w.runtime.actor(A)).toMatchObject({ room: "ed-resus", task: null });
    expect(seen.find(([type]) => type === "actor.moved")).toEqual(["actor.moved", 1]);
    expect(seen.filter(([type]) => type === "task.changed")).toHaveLength(2);
    // the retry returns the recorded result: no second move, no second charge
    expect(await w.act({ actionId: "nav-1", actorId: A, operation: "approach", targetId: w.patientId })).toBe(r);
    expect(w.harness.elapsed).toHaveLength(1);
    // already there: nothing to walk, no charge
    expect(await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).toMatchObject({ status: "completed", elapsedSeconds: 0 });
    expect(w.harness.elapsed).toHaveLength(1);
    // a failed plan charges nothing and changes no version
    const v = w.runtime.version;
    expect(await w.act({ actorId: A, operation: "navigate", goal: { kind: "point", x: 999, z: 999 } })).toMatchObject({ status: "failed", errorCode: "TARGET_NOT_REACHABLE", navigation: { ok: false, code: "TARGET_NOT_REACHABLE" } });
    expect(w.runtime.version).toBe(v);
    expect(w.harness.elapsed).toHaveLength(1);
  });

  it("look_at faces the target (a vantage point with a clear view)", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "look_at", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.canSee(A, w.patientId)).toBe(true);
  });

  it("move_to: the cart is parked next to the actor at the goal, the grid follows it; travel is charged once", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: "ed-glucometer" })).status).toBe("completed");
    w.harness.elapsed.length = 0;
    expect(await w.act({ actorId: A, operation: "move_to", targetId: "ed-glucometer" })).toMatchObject({ errorCode: "INVALID_REQUEST" });
    const r = await w.act({ actorId: A, operation: "move_to", targetId: "ed-glucometer", goal: { kind: "interact", id: w.patientId } });
    expect(r).toMatchObject({ status: "completed", targetVersion: 1 });
    expect(r.events.map((e) => e.type)).toContain("entity.moved");
    expect(w.harness.elapsed.map((e) => e.reason)).toEqual(["travel"]);
    const cart = w.runtime.snapshot().entities["eq:ed-glucometer"].position!;
    const me = w.runtime.actor(A)!.pose;
    expect(Math.hypot(cart.x - me.x, cart.z - me.z)).toBeLessThanOrEqual(1.25 + 1e-9);
    expect(w.runtime.inspect(A, "eq:ed-glucometer")!.room).toBe("ed-resus");
    // the planner routes to the cart where it stands now
    const plan = w.runtime.plan(N, { kind: "interact", id: "ed-glucometer" });
    expect(plan.ok && Math.hypot(plan.target.x - cart.x, plan.target.z - cart.z)).toBeLessThan(2);
    // carts cannot be moved by someone who is not at them
    expect(await w.act({ actorId: N, operation: "move_to", targetId: "ed-glucometer", goal: { kind: "room", id: "ed-station" } })).toMatchObject({ errorCode: "NOT_IN_RANGE", hint: { goal: { kind: "interact", id: "eq:ed-glucometer" } } });
  });
});

describe("idempotency", () => {
  it("the same action id returns the recorded result; a concurrent duplicate shares the run; the clinical tool runs once", async () => {
    const w = makeWorld("dka-adult");
    await toPatient(w);
    const v = w.runtime.version;
    const { release, started } = holdingGate(w);
    const first = w.act({ actionId: "attach-1", actorId: A, operation: "attach", targetId: "resus1-monitor" });
    await started;
    const second = w.act({ actionId: "attach-1", actorId: A, operation: "attach", targetId: "resus1-monitor" });
    expect(second).toBe(first);
    release("ok");
    const r = await first;
    expect(r.status).toBe("completed");
    expect(await w.act({ actionId: "attach-1", actorId: A, operation: "attach", targetId: "resus1-monitor" })).toBe(r);
    expect(w.runtime.feedback("attach-1")).toBe(r);
    expect(w.harness.calls).toHaveLength(1);
    expect(w.runtime.version).toBe(v + 1);
    expect(w.runtime.feedback("never-ran")).toBeNull();
  });
});

describe("optimistic concurrency (EMBODIED R4)", () => {
  it("another actor moving does not stale a device action; a changed device does; the strict global check does", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await toPatient(w);
    const ecg = "eq:resus1-ecg";
    const deviceVersion = w.runtime.inspect(A, ecg)!.stateVersion;
    const worldVersion = w.runtime.version;
    expect((await w.act({ actorId: N, operation: "navigate", goal: { kind: "room", id: "ed-hall" } })).status).toBe("completed");
    w.runtime.updatePose(A, { ...w.runtime.actor(A)!.pose, yaw: 0.3 }); // the human turns: a sensor update
    expect(w.runtime.version).toBeGreaterThan(worldVersion);
    expect(await w.act({ actorId: A, operation: "prepare", targetId: ecg, expectedWorldVersion: worldVersion })).toMatchObject({ status: "failed", errorCode: "STALE_STATE" });
    const ok = await w.act({ actorId: A, operation: "prepare", targetId: ecg, expectedTargetVersion: deviceVersion });
    expect(ok).toMatchObject({ status: "completed", targetVersion: deviceVersion + 1 });
    const stale = await w.act({ actorId: A, operation: "connect", targetId: ecg, expectedTargetVersion: deviceVersion });
    expect(stale).toMatchObject({ status: "failed", errorCode: "STALE_STATE" });
    expect(stale.message).toMatch(/changed since/);
    expect((await w.act({ actorId: A, operation: "connect", targetId: ecg, expectedTargetVersion: ok.targetVersion })).status).toBe("completed");
    // sensor updates never move the global version
    const v = w.runtime.version;
    for (let i = 0; i < 10; i++) w.runtime.updatePose(A, { ...w.runtime.actor(A)!.pose, x: w.runtime.actor(A)!.pose.x + 0.01 });
    expect(w.runtime.version).toBe(v);
  });
});

describe("reservations and in-flight locks", () => {
  it("a reserved device is busy for everyone else until released", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await toPatient(w);
    await toPatient(w, N);
    const ecg = "eq:resus1-ecg";
    const prep = await w.act({ actorId: A, operation: "prepare", targetId: ecg });
    expect(prep.events.find((e) => e.type === "reservation.changed")).toMatchObject({ reservedBy: A });
    for (const op of ["connect", "reset", "move_to"]) {
      const r = await w.act({ actorId: N, operation: op, targetId: ecg, goal: { kind: "room", id: "ed-hall" } });
      expect(r, op).toMatchObject({ status: "failed", errorCode: "DEVICE_BUSY" });
      expect(r.message).toMatch(/Clinician/);
    }
    expect(w.runtime.inspect(N, ecg)!.availableActions).toEqual([]);
    expect((await w.act({ actorId: A, operation: "reset", targetId: ecg })).status).toBe("completed");
    expect((await w.act({ actorId: N, operation: "prepare", targetId: ecg })).status).toBe("completed");
  });

  it("a device running a clinical effect for one actor is busy for another", async () => {
    const w = makeWorld("dka-adult");
    await toPatient(w);
    await toPatient(w, N);
    const { release, started } = holdingGate(w);
    const mine = w.act({ actorId: A, operation: "attach", targetId: "resus1-monitor" });
    await started;
    const theirs = await w.act({ actorId: N, operation: "attach", targetId: "resus1-monitor" });
    expect(theirs).toMatchObject({ status: "failed", errorCode: "DEVICE_BUSY" });
    release("ok");
    expect((await mine).status).toBe("completed");
    expect(w.runtime.inspect(N, "resus1-monitor")!.state).toBe("attached");
  });
});

describe("cancellation", () => {
  it("cancel(actorId) mid-navigation: MOVEMENT_INTERRUPTED, the partial pose is kept, the part walked is charged once", async () => {
    const mover = steppingMover();
    const w = makeWorld("stemi-inferior-rv", { mover });
    const start = { ...w.runtime.actor(A)!.pose };
    const plan = w.runtime.plan(A, { kind: "interact", id: w.patientId });
    if (!plan.ok) throw new Error(plan.message);
    const pending = w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: w.patientId } });
    await mover.started;
    await new Promise((r) => setTimeout(r, 3));
    expect(w.runtime.actor(A)!.task).toMatchObject({ kind: "navigate" });
    expect(w.runtime.cancel(A)).toBe(true);
    const r = await pending;
    expect(r).toMatchObject({ status: "cancelled", errorCode: "MOVEMENT_INTERRUPTED", navigation: { ok: false, code: "MOVEMENT_INTERRUPTED" } });
    const pose = w.runtime.actor(A)!.pose;
    expect(Math.hypot(pose.x - start.x, pose.z - start.z)).toBeGreaterThan(0);
    expect(Math.hypot(pose.x - plan.target.x, pose.z - plan.target.z)).toBeGreaterThan(1);
    expect(w.harness.elapsed).toHaveLength(1);
    expect(w.harness.elapsed[0].seconds).toBeGreaterThan(0);
    expect(w.harness.elapsed[0].seconds).toBeLessThan(plan.travelSeconds);
    expect(r.navigation!.length).toBeLessThan(plan.length);
    expect(w.runtime.actor(A)!.task).toBeNull();
    expect(w.runtime.cancel(A)).toBe(false);
  });

  it("an aborted signal cancels too; queued actions of the same actor are cancelled with it", async () => {
    const mover = steppingMover();
    const w = makeWorld("stemi-inferior-rv", { mover });
    const controller = new AbortController();
    const first = w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "laboratory" } }, controller.signal);
    const queued = w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "pharmacy" } });
    await mover.started;
    controller.abort();
    expect((await first).errorCode).toBe("MOVEMENT_INTERRUPTED");
    // the queued action now runs (only the aborted one was cancelled)…
    expect((await queued).status).toBe("completed");
    // …while cancel(actorId) drops what is queued as well
    const a = w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "laboratory" } });
    const b = w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "lobby" } });
    w.runtime.cancel(A);
    expect([(await a).status, (await b).status]).toEqual(["cancelled", "cancelled"]);
    expect((await b).errorCode).toBe("CANCELLED");
    expect(await w.act({ actorId: A, operation: "cancel" })).toMatchObject({ status: "completed" });
  });

  it("cancelling a clinical operation waiting for approval commits nothing", async () => {
    const w = makeWorld("dka-adult");
    await toPatient(w);
    const { started } = holdingGate(w);
    const pending = w.act({ actorId: A, operation: "attach", targetId: "resus1-monitor" });
    await started;
    w.runtime.cancel(A);
    expect(await pending).toMatchObject({ status: "cancelled", errorCode: "CANCELLED" });
    expect(w.harness.state().interventions).toEqual([]);
    expect(w.runtime.inspect(A, "resus1-monitor")!.state).toBe("detached");
  });

  it("actions of one actor run in order: an operation queued behind a walk runs on arrival", async () => {
    const mover = steppingMover();
    const w = makeWorld("dka-adult", { mover });
    const walk = w.act({ actorId: A, operation: "approach", targetId: w.patientId });
    const attach = w.act({ actorId: A, operation: "attach", targetId: "resus1-monitor" });
    expect((await walk).status).toBe("completed");
    expect((await attach).status).toBe("completed");
  });
});

describe("availability, authority, scenario controls", () => {
  it("an out-of-service device: DEVICE_UNAVAILABLE; back in service: usable", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await toPatient(w);
    const events: WorldEvent[] = [];
    w.runtime.subscribe((e) => events.push(e));
    w.runtime.setAvailability("resus1-ecg", false);
    expect(events.map((e) => e.type)).toEqual(["entity.availability"]);
    expect(w.runtime.inspect(A, "resus1-ecg")).toMatchObject({ state: "out-of-service", availableActions: [] });
    expect(await w.act({ actorId: A, operation: "prepare", targetId: "resus1-ecg" })).toMatchObject({ errorCode: "DEVICE_UNAVAILABLE" });
    w.runtime.setAvailability("resus1-ecg", true);
    expect((await w.act({ actorId: A, operation: "prepare", targetId: "resus1-ecg" })).status).toBe("completed");
    expect(() => w.runtime.setAvailability("nothing", false)).toThrow();
  });

  it("authority: only porters and receptionists lock doors (not the clinician, not a nurse); they place no orders", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const door = w.runtime.collision.doors.find((d) => d.rooms.includes("ed-store"))!.id;
    for (const actor of [A, N, "staff:receptionist"]) expect((await w.act({ actorId: actor, operation: "approach", targetId: door })).status).toBe("completed");
    const mine = await w.act({ actorId: A, operation: "lock", targetId: door });
    expect(mine).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED" });
    expect(mine.message).toMatch(/Porter, Receptionist/);
    expect(await w.act({ actorId: N, operation: "lock", targetId: door })).toMatchObject({ errorCode: "NOT_AUTHORIZED" });
    expect((await w.act({ actorId: "staff:receptionist", operation: "lock", targetId: door })).status).toBe("completed");
    expect(w.runtime.inspect(A, door)!.availableActions).toEqual([]);
    expect(w.runtime.inspect("staff:receptionist", door)!.availableActions).toEqual(["unlock"]);
    expect((await w.act({ actorId: "staff:receptionist", operation: "approach", targetId: "reception-records" })).status).toBe("completed");
    expect(await w.act({ actorId: "staff:receptionist", operation: "order", targetId: "reception-records", parameters: { investigation: "hs-troponin" } })).toMatchObject({ errorCode: "NOT_AUTHORIZED" });
  });

  it("authority: a catalog operation restricted to porters refuses a nurse", async () => {
    const { facility, catalogs } = hospitalWithTestItems();
    const w = makeWorld("stemi-inferior-rv", { facility, catalogs });
    expect((await w.act({ actorId: N, operation: "approach", targetId: "key-safe" })).status).toBe("completed");
    const r = await w.act({ actorId: N, operation: "open", targetId: "key-safe" });
    expect(r).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED" });
    expect(r.message).toMatch(/Porter/);
  });

  it("scenario controls: doors and obstacles change routes and emit events", () => {
    const w = makeWorld("stemi-inferior-rv");
    const door = w.runtime.collision.doors.find((d) => d.rooms.includes("ed-store"))!;
    const events: WorldEvent[] = [];
    w.runtime.subscribe((e) => events.push(e));
    w.runtime.setDoor(door.id, { open: true, locked: true });
    expect(events[0]).toMatchObject({ type: "door.changed", entityId: door.id, open: false, locked: true, actorId: null });
    expect(w.runtime.plan(A, { kind: "room", id: "ed-store" })).toMatchObject({ ok: false, code: "PATH_BLOCKED" });
    w.runtime.setDoor(door.id, { locked: false });
    w.runtime.setDoor(door.id, { locked: false }); // no change, no event
    expect(events).toHaveLength(2);
    expect(w.runtime.plan(A, { kind: "room", id: "ed-store" }).ok).toBe(true);
    const wet = { id: "wet-floor", level: "L0", rect: { x: door.centre.x, z: door.centre.z - 1, w: 3, d: 1.5 }, label: { "zh-CN": "地面湿滑", en: "Wet floor" } };
    w.runtime.setObstacle(wet, true);
    expect(w.runtime.plan(A, { kind: "room", id: "ed-store" })).toMatchObject({ ok: false, code: "PATH_BLOCKED", details: { obstacles: ["wet-floor"] } });
    w.runtime.setObstacle(wet, false);
    expect(w.runtime.plan(A, { kind: "room", id: "ed-store" }).ok).toBe(true);
    expect(events.map((e) => e.type)).toEqual(["door.changed", "door.changed", "obstacle.changed", "obstacle.changed"]);
    expect(() => w.runtime.setDoor("eq:ct-scanner", { open: true })).toThrow();
  });
});
