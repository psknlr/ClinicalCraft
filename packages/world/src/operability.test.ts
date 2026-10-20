/**
 * C7 — an operation with a clinical effect has two placement rules: its own
 * range to the device (`actorWithin`, else the device's reach) and the
 * policy's (e.g. at the patient). When both can hold somewhere, the refusal
 * hints that spot (a `point` goal); when they cannot (a cart too far from
 * the patient), it hints fetching the cart (`move_to` it to the patient), a
 * fixed device says so without a hint — never hints that alternate between
 * the device and the patient. A study on the patient at a fixed station (a
 * peak-flow station: G8) hints taking the patient there (`transport_patient`). Property: for every patient slot of the three
 * built-in facilities and every device at its bedside (plus the nearest
 * portable provider elsewhere of each bedside capability the case needs),
 * driving each clinical operation from the patient's side by following
 * hints converges: the operation completes, or ends on a refusal without a
 * hint; never the same refusal at the same spot twice.
 */
import { describe, expect, it } from "vitest";
import type { FacilityDefinition } from "@clinicalcraft/core";
import { behaviorOf, type OperationSpec } from "./behaviors.js";
import { selectClinical } from "./clinical.js";
import { PRIMARY_ACTOR, type NavGoal, type Pose, type SemanticEntity } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { loadCase, makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const FACILITIES = ["general-hospital", "teaching-hospital", "clinic-v4"] as const;

/** The cases bound to a slot: STEMI everywhere (ECG, monitor, IV, drugs, pumps), the asthma nebuliser in emergency slots. */
function casesFor(f: FacilityDefinition, slotId: string): string[] {
  const slot = f.patientSlots.find((s) => s.id === slotId)!;
  if (slot.accepts.includes("community")) return ["anaphylaxis-garden"];
  if (slot.accepts.includes("outpatient") && !slot.accepts.includes("emergency")) return ["new-onset-t2dm"];
  return slot.accepts.includes("emergency") ? ["stemi-inferior-rv", "pediatric-asthma"] : ["stemi-inferior-rv"];
}

/** Clinical operations of a device and the case items each can carry out. */
function clinicalOps(w: TestWorld, e: SemanticEntity): { op: OperationSpec; parameters: Record<string, unknown> }[] {
  const out: { op: OperationSpec; parameters: Record<string, unknown> }[] = [];
  const c = w.caseDef;
  for (const op of behaviorOf(e).operations) {
    if (!op.clinical && !op.toolByParam) continue;
    const tries: Record<string, unknown>[] = op.toolByParam
      ? [...c.investigations.map((i) => ({ investigation: i.id })), ...c.interventions.map((i) => ({ intervention: i.id }))]
      : op.clinical!.select === "param"
        ? (op.clinical!.tool === "intervene" ? c.interventions.map((i) => ({ intervention: i.id })) : c.investigations.map((i) => ({ investigation: i.id })))
        : [{}];
    for (const parameters of tries) {
      const sel = selectClinical({ effect: op.clinical ?? { tool: "order_test", select: "param" }, toolByParam: op.toolByParam, caps: e.capabilities, match: op.toolByParam ? "intersect" : "subset", parameters, caseDef: c, locale: "en", target: e.id });
      if (sel.ok && sel.value.tool !== "read_result") out.push({ op, parameters });
    }
  }
  return out.slice(0, 3); // a few items per device keep the sweep fast; their placement rules are the device's
}

/** Operations leading from a state to one where `goal` is offered (non-clinical, shortest first). */
function pathTo(e: SemanticEntity, state: string | null, goal: OperationSpec): string[] | null {
  const spec = behaviorOf(e);
  const offered = (s: string | null, o: OperationSpec) => o.from === "*" || (s !== null && o.from.includes(s));
  if (offered(state, goal)) return [];
  if (state === null) return null;
  const queue: { s: string; path: string[] }[] = [{ s: state, path: [] }];
  const seen = new Set([state]);
  while (queue.length) {
    const { s, path } = queue.shift()!;
    for (const o of spec.operations) {
      if (o.clinical || o.toolByParam || o.to === undefined || !offered(s, o) || seen.has(o.to)) continue;
      if (offered(o.to, goal)) return [...path, o.id];
      seen.add(o.to);
      queue.push({ s: o.to, path: [...path, o.id] });
    }
  }
  return null;
}

/** Run one operation, following its hints: navigate (a point, a provider, the patient) or fetch the cart. */
async function drive(w: TestWorld, id: string, operation: string, parameters: Record<string, unknown>, trail: string[]): Promise<"done" | "stopped"> {
  const seen = new Set<string>();
  for (let step = 0; step < 8; step++) {
    const r = await w.act({ actorId: A, operation, targetId: id, parameters });
    if (r.status === "completed") return "done";
    const here = w.runtime.actor(A)!.pose;
    const key = `${Math.round(here.x * 2)},${Math.round(here.z * 2)},${here.level}|${r.errorCode}|${JSON.stringify(r.hint?.goal ?? null)}`;
    trail.push(`${operation}: ${r.errorCode} ${JSON.stringify(r.hint?.goal ?? null)}`);
    if (seen.has(key)) throw new Error(`hint loop on ${id} ${operation}: ${trail.join(" → ")}`);
    seen.add(key);
    if (!r.hint) return "stopped";
    const goal: NavGoal = r.hint.goal;
    const nav = await w.act({ actorId: A, operation: "navigate", goal });
    if (nav.status !== "completed") return "stopped";
    // a fetch hint says what to do on arrival: wheel the cart to the patient; a transport hint (G8): at the
    // patient's side, take them to the station (a patient-performed test) or back to their bed space
    const then = r.hint.then;
    if (then?.operation === "transport_patient") {
      expect(goal).toEqual({ kind: "interact", id: w.patientId });
      expect(then).toMatchObject({ targetId: w.patientId, parameters: { destination: expect.any(String) } });
      const moved = await w.act({ actorId: A, operation: then.operation, targetId: then.targetId, parameters: then.parameters! });
      if (moved.status !== "completed") return "stopped";
    } else if (then) {
      expect(then).toEqual({ operation: "move_to", targetId: goal.kind === "interact" ? goal.id : "?", goal: { kind: "interact", id: w.patientId } });
      const moved = await w.act({ actorId: A, operation: then.operation, targetId: then.targetId, ...(then.goal ? { goal: then.goal } : {}) });
      if (moved.status !== "completed") return "stopped";
    }
  }
  throw new Error(`no convergence on ${id} ${operation}: ${trail.join(" → ")}`);
}

describe("C7: device operations with a clinical effect never alternate hints (three facilities, every slot)", () => {
  for (const facilityId of FACILITIES) {
    const facility = loadFacility(facilityId);
    for (const slot of facility.patientSlots) {
      it(`${facilityId} ${slot.id}`, async () => {
        for (const caseId of casesFor(facility, slot.id)) {
          const probe = makeWorld(caseId, { facility, slotId: slot.id });
          const c = loadCase(caseId);
          const level = probe.runtime.entity(probe.patientId)!.level;
          const devices = probe.runtime.entities().filter((e) => e.kind === "equipment" && probe.runtime.atBedside(e.id));
          // the nearest portable provider elsewhere of each bedside capability the case needs
          const caps = new Set([...c.investigations, ...c.interventions].flatMap((i) => i.requires));
          for (const cap of caps) {
            if (devices.some((d) => d.capabilities.includes(cap))) continue;
            const far = probe.runtime
              .entities()
              .filter((e) => e.kind === "equipment" && e.portable && e.capabilities.includes(cap))
              .sort((a, b) => (a.level === level ? 0 : 1) - (b.level === level ? 0 : 1) || Math.hypot(a.position.x - slot.x, a.position.z - slot.z) - Math.hypot(b.position.x - slot.x, b.position.z - slot.z))[0];
            if (far) devices.push(far);
          }
          // one world per case (built once: the sweep's cost), every operation started again from the entrance
          const w = makeWorld(caseId, { facility, slotId: slot.id });
          w.harness.dispatch({ type: "intervene", interventionId: "iv-access", by: "agent" }); // IV access (where the case has it): IV items reach their placement rules
          // start at the patient's side: where a clinician operating bedside equipment stands (the walk from the entrance is the navigation tests')
          expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
          const spawn = w.runtime.actor(A)!.pose;
          for (const device of devices) {
            for (const { op, parameters } of clinicalOps(probe, device)) {
              w.runtime.updatePose(A, spawn);
              const trail: string[] = [];
              const state = w.runtime.inspect(A, device.id)?.state ?? null;
              const path = pathTo(device, state, op);
              if (!path) continue;
              let ok = true;
              for (const step of path) if ((await drive(w, device.id, step, {}, trail)) !== "done") ok = false;
              if (!ok) continue;
              await drive(w, device.id, op.id, parameters, trail);
            }
          }
        }
      }, 120000);
    }
  }
});

describe("C7: the reviewer's ECG cart in the teaching hospital's resus bay", () => {
  it("record is reached from a spot within reach of the cart and the patient — or the cart is fetched — never alternating", async () => {
    const facility = loadFacility("teaching-hospital");
    const w = makeWorld("stemi-inferior-rv", { facility, slotId: "resus-1.slot" });
    const CART = "eq:resus-1.ecg";
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    const trail: string[] = [];
    for (const op of ["prepare", "connect", "record"]) expect(await drive(w, CART, op, {}, trail), trail.join(" → ")).toBe("done");
    expect(w.harness.state().orders.map((o) => o.investigationId)).toContain("ecg-12lead");
    // the hint that fixed record never pointed at the cart or the patient alone
    const pose: Pose = w.runtime.actor(A)!.pose;
    const patient = w.runtime.inspect(A, w.patientId)!;
    const cart = w.runtime.inspect(A, CART)!;
    expect(patient.distance).toBeLessThanOrEqual(1.5);
    expect(cart.distance).toBeLessThanOrEqual(1.5);
    expect(pose.level).toBe(patient.level);
  });
});

describe("C7: an ECG cart is used at the patient's side — never leads stretched across the room", () => {
  it("general-hospital ward bed 1: the ward's cart across the room is fetched first (prepare refuses at once with a fetch hint); at the bed prepare → connect → record work", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    const CART = "eq:ward-ecg";
    expect(w.runtime.atBedside(CART)).toBe(true); // same room: the capability is at the bedside…
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.inspect(A, CART)!.distance).toBeGreaterThan(10);
    // …but the machine must stand by the bed to be used: no walk to the cart and back, a fetch (nothing charged)
    const charged = w.harness.elapsed.length;
    const prepare = await w.act({ actorId: A, operation: "prepare", targetId: CART });
    expect(prepare).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED", hint: { goal: { kind: "interact", id: CART }, then: { operation: "move_to", targetId: CART, goal: { kind: "interact", id: w.patientId } } } });
    expect(w.harness.elapsed.length).toBe(charged);
    // the leads cannot reach across the ward either
    const trail: string[] = [];
    for (const op of ["prepare", "connect", "record"]) expect(await drive(w, CART, op, {}, trail), trail.join(" → ")).toBe("done");
    expect(w.runtime.inspect(A, CART)!.distance).toBeLessThanOrEqual(1.5);
    expect(w.runtime.inspect(A, w.patientId)!.distance).toBeLessThanOrEqual(1.5);
  });

  it("connect from the patient's side with the cart across the room is refused (fetch), not done", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    const CART = "eq:ward-ecg";
    expect((await w.act({ actorId: A, operation: "approach", targetId: CART })).status).toBe("completed");
    // prepared where it stands (a fixed rule would refuse that too: the patient is across the room)
    const prepare = await w.act({ actorId: A, operation: "prepare", targetId: CART });
    expect(prepare).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED", hint: { then: { operation: "move_to" } } });
  });
});
