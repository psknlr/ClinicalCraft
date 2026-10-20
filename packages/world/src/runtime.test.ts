import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type DynamicObstacle } from "./contracts.js";
import { createWorldRuntime } from "./runtime.js";
import { catalogs, clinicalHarness, counters, loadCase, makeWorld, type TestWorld } from "./__fixtures__/world.js";
import { loadFacility } from "./__fixtures__/content.js";

const A = PRIMARY_ACTOR;
const N = "staff:ed-nurse";
const WET: DynamicObstacle = { id: "wet-floor", level: "L0", rect: { x: 0, z: -2, w: 2, d: 1 }, label: { "zh-CN": "地面湿滑", en: "Wet floor" } };

/** A fixed history touching every kind of physical state. */
async function scenario(w: TestWorld): Promise<void> {
  const storeDoor = w.runtime.collision.doors.find((d) => d.rooms.includes("ed-store"))!.id;
  await w.act({ actionId: "s1", actorId: A, operation: "approach", targetId: w.patientId });
  await w.act({ actionId: "s2", actorId: A, operation: "prepare", targetId: "resus1-ecg" });
  await w.act({ actionId: "s3", actorId: A, operation: "attach", targetId: "resus1-monitor" });
  await w.act({ actionId: "s4", actorId: N, operation: "approach", targetId: "ed-glucometer" });
  await w.act({ actionId: "s5", actorId: N, operation: "move_to", targetId: "ed-glucometer", goal: { kind: "interact", id: w.patientId } });
  await w.act({ actionId: "s6", actorId: A, operation: "lock", targetId: storeDoor }); // refused: recorded all the same
  w.runtime.setDoor(storeDoor, { locked: true });
  w.runtime.setObstacle(WET, true);
  w.runtime.setAvailability("resus2-monitor", false);
  w.runtime.observe(A);
  w.runtime.observe(N);
  w.runtime.updatePose(A, { ...w.runtime.actor(A)!.pose, yaw: 1 });
}

describe("createWorldRuntime", () => {
  it("exposes the static layer and starts at version 0", () => {
    const w = makeWorld("smzl-lung-adeno");
    expect(w.runtime.facility.id).toBe("clinic-v4");
    expect(w.runtime.levels.map((l) => l.id)).toEqual(["L0"]);
    expect(w.runtime.version).toBe(0);
    expect(w.runtime.entity("patient:consult-1")!.public).toEqual({ name: (w.caseDef.patient.displayName as Record<string, string>).en, tag: "74 years male", posture: "standing" });
    expect(w.runtime.entities().length).toBeGreaterThan(30);
    expect(w.runtime.actors().map((a) => a.id)).toEqual([A]); // the clinic has no staff
    expect(w.runtime.checkSpatial("actor:ghost", { tool: "ask_patient", kind: "ask" })).toMatchObject({ ok: false, reason: "unknown-actor", hint: null });
    // copies: mutating what the runtime returns changes nothing
    const me = w.runtime.actor(A)!;
    me.pose.x = 999;
    me.holding.push("x");
    expect(w.runtime.actor(A)!.pose.x).not.toBe(999);
    expect(w.runtime.actor(A)!.holding).toEqual([]);
  });

  it("restores a snapshot (resume): the same state, the same routes, the same records", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await scenario(w);
    const snap = w.runtime.snapshot();
    expect(snap.version).toBe(w.runtime.version);
    const r = makeWorld("stemi-inferior-rv", { extra: { snapshot: snap } });
    expect(JSON.stringify(r.runtime.snapshot())).toBe(JSON.stringify(snap));
    expect(r.runtime.version).toBe(w.runtime.version);
    expect(r.runtime.feedback("s5")).toEqual(w.runtime.feedback("s5"));
    // physical state is live again in the grids: the moved cart, the locked door, the obstacle, availability
    for (const goal of [{ kind: "interact", id: w.patientId }, { kind: "room", id: "ed-store" }, { kind: "interact", id: "ed-glucometer" }] as const) {
      expect(JSON.stringify(r.runtime.plan(A, goal))).toBe(JSON.stringify(w.runtime.plan(A, goal)));
    }
    expect(r.runtime.plan(A, { kind: "room", id: "ed-store" })).toMatchObject({ ok: false, code: "PATH_BLOCKED" });
    expect(r.runtime.inspect(A, "resus2-monitor")!.state).toBe("out-of-service");
    expect(r.runtime.inspect(A, "resus1-ecg")).toMatchObject({ state: "prepared" });
    expect(r.runtime.actor(A)).toEqual(w.runtime.actor(A));
    // a retried action id after resume returns the recorded result
    expect(await r.act({ actionId: "s1", actorId: A, operation: "approach", targetId: w.patientId })).toEqual(w.runtime.feedback("s1"));
    expect(r.harness.elapsed).toEqual([]);
  });

  it("is deterministic: the same inputs give the same snapshot, results and trace", async () => {
    const run = async () => {
      const w = makeWorld("stemi-inferior-rv");
      await scenario(w);
      return { snap: JSON.stringify(w.runtime.snapshot()), results: JSON.stringify(["s1", "s2", "s3", "s4", "s5", "s6"].map((id) => w.runtime.feedback(id))), trace: w.trace.toJsonl(), obs: JSON.stringify(w.runtime.observe(A)) };
    };
    const [a, b] = [await run(), await run()];
    expect(a.snap).toBe(b.snap);
    expect(a.results).toBe(b.results);
    expect(a.trace).toBe(b.trace);
    expect(a.obs).toBe(b.obs);
  });

  it("a world without a patient or a port: no clinical effects, no time, no patient requirements met", async () => {
    const f = loadFacility("general-hospital");
    const caseDef = loadCase("stemi-inferior-rv");
    const h = clinicalHarness(caseDef);
    const { newId, now } = counters();
    const runtime = createWorldRuntime({ facility: f, catalogs: catalogs(), binding: { caseDef, slotId: null, locale: "en" }, clinical: h.view, now, newId });
    expect(runtime.entities().filter((e) => e.kind === "patient")).toEqual([]);
    expect(runtime.checkSpatial(A, { tool: "ask_patient", kind: "ask" })).toMatchObject({ ok: false, reason: "no-patient", hint: null });
    const go = await runtime.execute({ actionId: "x", actorId: A, operation: "approach", targetId: "lab-workstation" });
    expect(go.status).toBe("completed");
    // a lab order needs its sample: the IV-access procedure drew the bloods (in the engine), so the policy lets it through
    h.dispatch({ type: "intervene", interventionId: "iv-access", by: "agent" });
    const order = await runtime.execute({ actionId: "y", actorId: A, operation: "order", targetId: "lab-workstation", parameters: { investigation: "hs-troponin" } });
    expect(order).toMatchObject({ status: "failed", errorCode: "CLINICAL_REJECTED" });
    expect(order.message).toMatch(/No clinical session/);
  });
});

describe("traces (EMBODIED §10)", () => {
  it("one span tree per action, observation spans, linked by parent ids; JSONL round-trips", async () => {
    const w = makeWorld("dka-adult");
    await w.act({ actionId: "t1", actorId: A, operation: "approach", targetId: w.patientId });
    w.runtime.observe(A);
    await w.act({ actionId: "t2", actorId: A, operation: "attach", targetId: "resus1-monitor" });
    const spans = w.trace.spans();
    const nav = spans.find((s) => s.refs.actionId === "t1" && s.parentId === null)!;
    expect(nav).toMatchObject({ kind: "navigation", name: "approach", actorId: A, ok: true, worldVersion: 1 });
    expect(nav.data).toMatchObject({ status: "completed", navigation: { ok: true } });
    expect(spans.find((s) => s.kind === "observation")).toMatchObject({ name: "observe", actorId: A, ok: true });
    const attach = spans.find((s) => s.refs.actionId === "t2" && s.parentId === null)!;
    expect(attach).toMatchObject({ kind: "interaction", name: "attach", ok: true, refs: { entities: ["eq:resus1-monitor"] } });
    const children = spans.filter((s) => s.parentId === attach.id);
    expect(children.map((s) => s.kind)).toEqual(["clinical_action", "state_change"]);
    expect(children[0]).toMatchObject({ name: "intervene", ok: true, refs: { clinicalEventIds: expect.arrayContaining([expect.stringMatching(/^ce-/)]) } });
    for (const s of spans) expect(s.endedAt).toBeGreaterThanOrEqual(s.startedAt);
    const lines = w.trace.toJsonl().trim().split("\n").map((l) => JSON.parse(l));
    expect(lines[0]).toEqual({ format: "clinicalcraft-trace@1", episodeId: "ep-1", caseId: "dka-adult", facilityId: "general-hospital", embodiment: "embodied" });
    expect(lines.slice(1)).toEqual(spans);
  });
});
