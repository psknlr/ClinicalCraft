/**
 * Patient transport (review G8, EMBODIED §8): the patient's body moves — relocations by a transfer or a
 * phase (the team moves the patient: no time charged) and `transport_patient` (a body wheels the bed or
 * walks the patient there: travel charged once) — and the world follows it: registry place, collider,
 * navigation, the bedside rule, the patient's monitor, perception, the policy (studies on the patient at a
 * fixed device need the patient there), snapshots.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type PatientPlace, type WorldEvent } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { makeWorld, steppingMover, type TestWorld } from "./__fixtures__/world.js";
import { createWorldRuntime } from "./runtime.js";

/** Walk the clinician to the patient's side. */
async function toPatient(w: TestWorld, actorId = PRIMARY_ACTOR) {
  const r = await w.act({ actorId, operation: "navigate", goal: { kind: "interact", id: w.patientId } });
  expect(r.status, r.message).toBe("completed");
}

function events(w: TestWorld): WorldEvent[] {
  const out: WorldEvent[] = [];
  w.runtime.subscribe((e) => out.push(e));
  return out;
}

const place = (w: TestWorld): PatientPlace => w.runtime.patientPlace()!;
const near = (a: { x: number; z: number }, b: { x: number; z: number }, m: number) => Math.hypot(a.x - b.x, a.z - b.z) <= m;

describe("the patient's place", () => {
  it("starts in the case's bed space: on its bed, the bed is the trolley that travels with them", () => {
    const w = makeWorld("stemi-inferior-rv");
    const p = place(w);
    expect(p).toMatchObject({ slot: "resus-1", provider: null, home: { slot: "resus-1", provider: null }, posture: "lying", support: "eq:resus1-bed", trolley: "eq:resus1-bed", room: "ed-resus" });
    const bed = w.runtime.entity("eq:resus1-bed")!;
    expect(near(p, bed.position, 1e-6)).toBe(true);
    expect(w.runtime.patientMonitor()).toBe("eq:resus1-monitor");
  });

  it("a garden patient sits on the bench: a support but no trolley", () => {
    const w = makeWorld("anaphylaxis-garden");
    expect(place(w)).toMatchObject({ slot: "garden-bench", posture: "sitting", support: "eq:garden-bench-north", trolley: null });
  });
});

describe("relocation by a transfer or a phase (the team moves the patient)", () => {
  it("to the equipment providing a capability: the cath-lab table beside the C-arm — no time charged, the bed parked there", () => {
    const w = makeWorld("stemi-inferior-rv");
    const seen = events(w);
    const r = w.runtime.relocatePatient({ capability: "fluoroscopy" });
    expect(r.ok).toBe(true);
    const p = place(w);
    expect(p).toMatchObject({ slot: null, provider: "eq:cathlab-c-arm", support: "eq:cathlab-table", posture: "lying", room: "rad-cathlab", trolley: "eq:resus1-bed" });
    // a relocation is where the patient now belongs: no transport back from it
    expect(p.home).toEqual({ slot: null, provider: "eq:cathlab-c-arm" });
    expect(w.harness.elapsed).toEqual([]);
    const moved = seen.find((e) => e.type === "patient.moved");
    expect(moved).toMatchObject({ type: "patient.moved", entityId: w.patientId, by: null });
    expect(moved && moved.type === "patient.moved" && moved.path.length).toBeGreaterThan(0);
    // the travelling bed waits in the cath lab
    expect(w.runtime.snapshot().entities["eq:resus1-bed"]?.position?.level).toBe("L0");
    expect(w.runtime.regionName(w.runtime.snapshot().entities["eq:resus1-bed"]!.position!)).toBe(w.runtime.regionName({ level: "L0", x: 38.5, z: -37 }));
    // the bedside follows the patient: the cath lab's kit, not the resus bay's
    expect(w.runtime.atBedside("eq:cathlab-c-arm")).toBe(true);
    expect(w.runtime.atBedside("eq:resus1-monitor")).toBe(false);
    expect(w.runtime.patientMonitor()).toBe("eq:cathlab-monitor");
    // the resus bay's bed space is free floor now: a walk can end where the bed stood
    const bed = w.runtime.entity("eq:resus1-bed")!;
    const plan = w.runtime.plan(PRIMARY_ACTOR, { kind: "point", x: bed.position.x, z: bed.position.z });
    expect(plan.ok && near(plan.target, bed.position, 0.4)).toBe(true);
  });

  it("to the first bed space of a setting: the HDU bed — the ward bed goes back to the ward", () => {
    const w = makeWorld("pulmonary-embolism-postop");
    expect(place(w).slot).toBe("ward-1");
    const r = w.runtime.relocatePatient({ setting: "icu" });
    expect(r.ok).toBe(true);
    expect(place(w)).toMatchObject({ slot: "icu-1", provider: null, home: { slot: "icu-1", provider: null }, support: "eq:icu-bed-1", trolley: "eq:icu-bed-1", room: "icu" });
    expect(w.runtime.snapshot().entities["eq:ward-bed-1"]?.position).toBeUndefined();
    expect(w.runtime.patientMonitor()).toBe("eq:icu-monitor-1");
  });

  it("already there: nothing moves and nothing is emitted", () => {
    const w = makeWorld("stemi-inferior-rv");
    const seen = events(w);
    const r = w.runtime.relocatePatient({ setting: "emergency" });
    expect(r).toMatchObject({ ok: true, moved: false });
    expect(seen).toEqual([]);
  });

  it("no such place in the facility: the patient stays and the result says so (both languages)", () => {
    const en = makeWorld("smzl-lung-adeno");
    const r = en.runtime.relocatePatient({ capability: "fluoroscopy" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("no-destination");
      expect(r.message).toMatch(/stays/);
    }
    expect(place(en).slot).toBe("consult-1");
    const zh = makeWorld("smzl-lung-adeno", { locale: "zh-CN" });
    const z = zh.runtime.relocatePatient({ capability: "fluoroscopy" });
    expect(!z.ok && /留在/.test(z.message)).toBe(true);
  });

  it("a team relocation records its route even with a cart left at the bedside and people by the bed (the team moves them aside)", async () => {
    const facility = loadFacility("teaching-hospital" as "general-hospital");
    const w = makeWorld("pulmonary-embolism-postop", { facility });
    // the ward's ECG cart wheeled to the bed (parked by its foot), the clinician beside it, the porter on the other side
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:ward-station.ecg" } });
    const wheeled = await w.act({ actorId: PRIMARY_ACTOR, operation: "move_to", targetId: "eq:ward-station.ecg", goal: { kind: "interact", id: w.patientId } });
    expect(wheeled.status, wheeled.message).toBe("completed");
    const porter = await w.act({ actorId: "staff:porter", operation: "navigate", goal: { kind: "point", x: -13.75, z: 7.25, level: "L1" } });
    expect(porter.status, porter.message).toBe("completed");
    const seen = events(w);
    const r = w.runtime.relocatePatient({ setting: "icu" });
    expect(r.ok, r.ok ? "" : r.message).toBe(true);
    expect(place(w).room).toBe("icu-1");
    const moved = seen.find((e) => e.type === "patient.moved");
    expect(moved?.type).toBe("patient.moved");
    if (moved?.type !== "patient.moved") return;
    expect(moved.distance).toBeGreaterThan(20);
    expect(moved.path.length).toBeGreaterThan(1);
  });
});

describe("transport_patient (a body wheels the bed or walks the patient there)", () => {
  it("the clinician wheels the patient to the CT scanner: travel charged once, the patient on the scanner table, the bed beside it", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    await toPatient(w);
    const before = w.harness.elapsed.length;
    const seen = events(w);
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    expect(r.status, r.message).toBe("completed");
    const travel = w.harness.elapsed.slice(before);
    expect(travel).toHaveLength(1);
    expect(travel[0]!.reason).toBe("travel");
    expect(travel[0]!.seconds).toBeCloseTo(r.navigation!.travelSeconds, 1);
    expect(r.navigation!.length).toBeGreaterThan(30);
    const p = place(w);
    expect(p).toMatchObject({ slot: null, provider: "eq:ct-scanner", support: "eq:ct-scanner", posture: "lying", room: "rad-ct", trolley: "eq:ward-bed-1", home: { slot: "ward-1", provider: null } });
    expect(w.runtime.snapshot().entities["eq:ward-bed-1"]?.position).toBeDefined();
    expect(seen.find((e) => e.type === "patient.moved")).toMatchObject({ by: PRIMARY_ACTOR });
    // the clinician stands by the patient
    const me = w.runtime.actor(PRIMARY_ACTOR)!;
    expect(me.room).toBe("rad-ct");
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "examine", kind: "examine" }).ok).toBe(true);
    // the study can be ordered now
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "ctpa" }).ok).toBe(true);
  });

  it("and back to the ward bed: the bed goes home with the patient on it", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    await toPatient(w);
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } })).status).toBe("completed");
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "home" } });
    expect(r.status, r.message).toBe("completed");
    expect(place(w)).toMatchObject({ slot: "ward-1", provider: null, support: "eq:ward-bed-1", trolley: "eq:ward-bed-1", room: "ward" });
    expect(w.runtime.snapshot().entities["eq:ward-bed-1"]?.position).toBeUndefined();
    // the clinician wheeled the bed into the bed space: they end beside it there, not where it was parked
    const me = w.runtime.actor(PRIMARY_ACTOR)!;
    expect(me.room).toBe("ward");
    expect(near(me.pose, w.runtime.entity("eq:ward-bed-1")!.position, 1.6)).toBe(true);
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "examine", kind: "examine" }).ok).toBe(true);
  });

  it("needs the body at the patient's side first (a reach refusal with the way there)", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    expect(r.status).toBe("failed");
    expect(r.errorCode).toBe("NOT_IN_RANGE");
    expect(r.hint?.goal).toEqual({ kind: "interact", id: w.patientId });
    expect(place(w).slot).toBe("ward-1");
  });

  it("an unknown destination is refused before anyone moves", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    await toPatient(w);
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:no-such-thing" } });
    expect(r.status).toBe("failed");
    expect(r.errorCode).toBe("TARGET_NOT_FOUND");
    expect(place(w).slot).toBe("ward-1");
  });

  it("a patient-performed test: the child walks to the peak-flow station and stands there; the bed stays", async () => {
    const w = makeWorld("pediatric-asthma");
    await toPatient(w);
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:triage-peak-flow" } });
    expect(r.status, r.message).toBe("completed");
    expect(place(w)).toMatchObject({ provider: "eq:triage-peak-flow", posture: "standing", support: null, room: "ed-triage" });
    expect(w.runtime.snapshot().entities["eq:resus1-bed"]?.position).toBeUndefined();
  });

  it("a porter does it too (teaching hospital: from upstairs, by the lift) — busy while it lasts", async () => {
    const facility = loadFacility("teaching-hospital" as "general-hospital");
    const w = makeWorld("stemi-inferior-rv", { facility });
    const porter = "staff:porter";
    expect(w.runtime.actor(porter)?.role).toBe("porter");
    await toPatient(w, porter);
    const r = await w.act({ actorId: porter, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct.scanner" }, onBehalfOf: PRIMARY_ACTOR });
    expect(r.status, r.message).toBe("completed");
    expect(place(w)).toMatchObject({ provider: "eq:ct.scanner", room: "ct" });
  });

  it("only clinical staff and porters wheel a patient: a receptionist may not", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const R = "staff:receptionist";
    expect(w.runtime.actor(R)?.role).toBe("receptionist");
    await toPatient(w, R);
    const r = await w.act({ actorId: R, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    expect(r).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED" });
    expect(place(w).slot).toBe("resus-1");
  });

  it("the patient being wheeled cannot be taken by another body meanwhile; while in transit the place says who wheels them on what", async () => {
    let armed = false;
    const seen: unknown[] = [];
    const mover = steppingMover((i) => {
      if (armed && i === 1) seen.push(place(w).transit);
    });
    const w = makeWorld("pulmonary-embolism-postop", { mover });
    await toPatient(w);
    await toPatient(w, "staff:ward-nurse");
    expect(place(w).transit ?? null).toBeNull();
    armed = true;
    const first = w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    await mover.started;
    const second = await w.act({ actorId: "staff:ward-nurse", operation: "transport_patient", targetId: w.patientId, parameters: { destination: "home" } });
    expect(second.status).toBe("failed");
    expect(second.errorCode).toBe("DEVICE_BUSY");
    expect((await first).status).toBe("completed");
    // the renderer draws the bed pushed in front of the walker, the patient lying on it — then where they are
    expect(seen[0]).toEqual({ by: PRIMARY_ACTOR, trolley: "eq:ward-bed-1", posture: "lying" });
    expect(place(w).transit ?? null).toBeNull();
  });

  it("an interrupted transport leaves the patient where the walk stopped (on the trolley), charged for the part walked", async () => {
    const ctrl = new AbortController();
    let armed = false;
    const mover = steppingMover((i) => {
      if (armed && i === 2) ctrl.abort();
    });
    const w = makeWorld("pulmonary-embolism-postop", { mover });
    await toPatient(w);
    armed = true;
    const before = w.harness.elapsed.length;
    const full = w.runtime.plan(PRIMARY_ACTOR, { kind: "interact", id: "eq:ct-scanner" });
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } }, ctrl.signal);
    expect(r.status).toBe("cancelled");
    expect(r.errorCode).toBe("MOVEMENT_INTERRUPTED");
    // charged once, for the part walked only
    const charged = w.harness.elapsed.slice(before);
    expect(charged).toHaveLength(1);
    expect(charged[0]).toMatchObject({ reason: "travel" });
    expect(charged[0]!.seconds).toBeGreaterThan(0);
    expect(full.ok && charged[0]!.seconds < full.travelSeconds).toBe(true);
    const p = place(w);
    expect(p).toMatchObject({ slot: null, provider: null, posture: "lying", support: "eq:ward-bed-1" });
    // the bedside is where the patient is now
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "examine", kind: "examine" }).ok).toBe(true);
  });

  it("restores from a snapshot", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    await toPatient(w);
    await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    const snapshot = w.runtime.snapshot();
    const restored = createWorldRuntime({ facility: w.facility, catalogs: (await import("./__fixtures__/world.js")).catalogs(), binding: { caseDef: w.caseDef, slotId: w.slotId, locale: "en" }, clinical: w.harness.view, port: w.harness.port, now: () => 0, newId: () => "x", snapshot });
    expect(restored.patientPlace()).toEqual(place(w));
    expect(restored.snapshot()).toEqual(snapshot);
  });
});

describe("the patient's posture and body follow clinical state", () => {
  it("a standing outpatient who lies down on the couch has no body of their own on the floor any more", () => {
    const w = makeWorld("smzl-lung-adeno");
    const slot = w.facility.patientSlots.find((s) => s.id === w.slotId)!;
    // standing at the slot: the body blocks the point
    const blocked = w.runtime.plan(PRIMARY_ACTOR, { kind: "point", x: slot.x, z: slot.z });
    expect(blocked.ok && near(blocked.target, slot, 0.3)).toBe(false);
    const seen = events(w);
    w.harness.cues.posture = "lying";
    expect(w.runtime.refreshPatient()).toBe(true);
    expect(seen.find((e) => e.type === "patient.posture")).toMatchObject({ from: "standing", to: "lying" });
    expect(place(w)).toMatchObject({ posture: "lying", support: "eq:exam-couch" });
    const free = w.runtime.plan(PRIMARY_ACTOR, { kind: "point", x: slot.x, z: slot.z });
    expect(free.ok && near(free.target, slot, 0.3)).toBe(true);
    // unchanged: nothing to do
    expect(w.runtime.refreshPatient()).toBe(false);
  });

  it("a bystander sees the posture the place forces (lying on the scanner table) over the clinical one", async () => {
    const w = makeWorld("smzl-lung-adeno");
    await toPatient(w);
    const r = await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    expect(r.status, r.message).toBe("completed");
    const seenPatient = w.runtime.observe(PRIMARY_ACTOR).entities.find((e) => e.id === w.patientId);
    expect(seenPatient?.cues?.posture).toBe("lying");
    expect(seenPatient?.room).toBe("imaging");
  });
});

describe("the policy: a study done on the patient at a fixed device needs the patient there (G8)", () => {
  it("a CT is refused at the console while the patient is in the ward: the hint takes the patient there", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:radiology-console" } });
    const check = w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "ctpa" });
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.reason).toBe("patient-not-at-provider");
    expect(check.hint?.goal).toEqual({ kind: "interact", id: w.patientId });
    expect(check.hint?.then).toEqual({ operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    expect(check.message).not.toMatch(/transport_patient|move_to/);
  });

  it("with the patient on the scanner: ordered at the scanner or at the console; the report is read without the patient", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    await toPatient(w);
    await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    const atScanner = w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "ctpa" });
    expect(atScanner.ok && atScanner.satisfiedBy.includes("eq:ct-scanner")).toBe(true);
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:radiology-console" } });
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "ctpa" }).ok).toBe(true);
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: w.patientId } });
    await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "home" } });
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:radiology-console" } });
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "read_result", kind: "read", investigationId: "ctpa" }).ok).toBe(true);
  });

  it("satisfiedBy names first what the clinician acts through where they stand, then the device the patient is at", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    await toPatient(w);
    await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:radiology-console" } });
    const atConsole = w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "ctpa" });
    // a consumer operating the first device (the offline autopilot, the bench reference) orders at the console it
    // stands at instead of walking on to the scanner
    expect(atConsole).toMatchObject({ ok: true, satisfiedBy: ["eq:radiology-console", "eq:ct-scanner"] });
  });

  it("a peak flow is no longer done at the triage station with the child left in the resus bay", async () => {
    const w = makeWorld("pediatric-asthma");
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:triage-peak-flow" } });
    const away = w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "pef" });
    expect(!away.ok && away.reason).toBe("patient-not-at-provider");
    await toPatient(w);
    await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:triage-peak-flow" } });
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "pef" }).ok).toBe(true);
  });

  it("a portable chest X-ray (performedAt bedside) moves nobody: ordered at the console as before", async () => {
    const w = makeWorld("stemi-inferior-rv");
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:radiology-console" } });
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "cxr-portable" }).ok).toBe(true);
  });

  it("a cart wheeled to the patient on the scanner table is parked beside the clinician, never between them (the echo at the CT)", async () => {
    const w = makeWorld("pulmonary-embolism-postop");
    await toPatient(w);
    await w.act({ actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: w.patientId, parameters: { destination: "eq:ct-scanner" } });
    const echo = { tool: "order_test", kind: "order", investigationId: "echo" } as const;
    const before = w.runtime.checkSpatial(PRIMARY_ACTOR, echo);
    expect(!before.ok && before.hint?.then?.operation).toBe("move_to");
    if (before.ok || !before.hint?.then) return;
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: before.hint.goal })).status).toBe("completed");
    const { operation, targetId, goal } = before.hint.then;
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation, targetId, ...(goal ? { goal } : {}) })).status).toBe("completed");
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, echo)).toMatchObject({ ok: true });
  });

  it("after the transfer to the cath lab the angiogram is ordered with the patient on the table", async () => {
    const w = makeWorld("stemi-inferior-rv");
    w.runtime.relocatePatient({ capability: "fluoroscopy" });
    await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "eq:cathlab-c-arm" } });
    expect(w.runtime.checkSpatial(PRIMARY_ACTOR, { tool: "order_test", kind: "order", investigationId: "coronary-angiography" }).ok).toBe(true);
  });
});
