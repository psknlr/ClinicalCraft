import { describe, expect, it } from "vitest";
import { PERSONAL_KIT, facilityCapabilities, type CaseDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type ClinicalIntent, type Pose, type SpatialCheck } from "./contracts.js";
import { BEDSIDE_CAPABILITIES, KIND_DEFAULT_CAPABILITIES, LAB_CAPABILITIES, PATIENT_AT_PROVIDER_CAPABILITIES, PATIENT_PERFORMED_CAPABILITIES } from "./capabilities.js";
import { DefaultSpatialPolicy } from "./policy.js";
import { caseIds, catalogs, loadCase, makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const order = (investigationId: string): ClinicalIntent => ({ tool: "order_test", kind: "order", investigationId });
const read = (investigationId: string): ClinicalIntent => ({ tool: "read_result", kind: "read", investigationId });
const intervene = (interventionId: string): ClinicalIntent => ({ tool: "intervene", kind: "intervene", interventionId });
const examine = (findingId: string): ClinicalIntent => ({ tool: "examine", kind: "examine", findingId });
const ASK: ClinicalIntent = { tool: "ask_patient", kind: "ask" };
const VITALS: ClinicalIntent = { tool: "check_vitals", kind: "vitals" };

const at = (x: number, z: number, yaw = 0): Pose => ({ x, y: 0, z, yaw, pitch: 0, level: "L0" });
const spawnOf = (w: TestWorld): Pose => at(w.facility.spawn.x, w.facility.spawn.z, w.facility.spawn.yaw ?? 0);

function failure(c: SpatialCheck) {
  if (c.ok) throw new Error(`expected a refusal, got ok (${JSON.stringify(c.requirement)})`);
  return c;
}

/** Navigate to the hint's goal (and, for a cart to fetch, wheel it to the patient); returns the check after. */
async function follow(w: TestWorld, intent: ClinicalIntent, c: SpatialCheck): Promise<SpatialCheck> {
  const f = failure(c);
  expect(f.hint, f.message).not.toBeNull();
  const nav = await w.act({ actorId: A, operation: "navigate", goal: f.hint!.goal });
  expect(nav.status, nav.message).toBe("completed");
  const then = f.hint!.then;
  // the patient to bring to a device, or back to their bed space where fixed kit stands (G8): at their side, wheel them there
  if (f.reason === "patient-not-at-provider") expect(then?.operation).toBe("transport_patient");
  if (then?.operation === "transport_patient") {
    expect(f.hint!.goal).toEqual({ kind: "interact", id: w.patientId });
    const moved = await w.act({ actorId: A, operation: "transport_patient", targetId: then.targetId, ...(then.parameters ? { parameters: then.parameters } : {}) });
    expect(moved.status, moved.message).toBe("completed");
  } else if (f.reason === "provider-not-at-bedside" || (f.reason === "provider-busy" && f.hint!.goal.kind === "interact" && f.hint!.goal.id !== w.patientId)) {
    expect(f.hint!.goal.kind).toBe("interact");
    const cart = (f.hint!.goal as { id: string }).id;
    const moved = await w.act({ actorId: A, operation: "move_to", targetId: cart, goal: { kind: "interact", id: w.patientId } });
    expect(moved.status, moved.message).toBe("completed");
  }
  return w.runtime.checkSpatial(A, intent);
}

/** A device operation by an actor, following its hints (a walk; a fetch: then wheel the cart to the patient) until done. */
async function operate(w: TestWorld, actorId: string, id: string, operation: string): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const r = await w.act({ actorId, operation, targetId: id });
    if (r.status === "completed") return;
    expect(r.hint, `${operation} ${id}: ${r.message}`).toBeTruthy();
    expect((await w.act({ actorId, operation: "navigate", goal: r.hint!.goal })).status).toBe("completed");
    const then = r.hint!.then;
    if (then) expect((await w.act({ actorId, operation: then.operation, targetId: then.targetId, ...(then.goal ? { goal: then.goal } : {}) })).status).toBe("completed");
  }
  throw new Error(`${operation} ${id} never completed`);
}

const ivAccess = { kind: "clinical", condition: { intervened: "iv-access" }, need: "iv-access", interventionId: "iv-access" } as const;
const sample = (iv: string) => ({ kind: "clinical", condition: { intervened: iv }, need: "sample", interventionId: iv }) as const;
const CHART = { kind: "at-provider", capabilities: ["records"] } as const;

describe("DefaultSpatialPolicy: the requirement of each clinical action (EMBODIED §6)", () => {
  const binding = { caseDef: loadCase("stemi-inferior-rv"), slotId: "resus-1", locale: "en" };
  const p = new DefaultSpatialPolicy();
  const req = (i: ClinicalIntent, b = binding) => p.requirementFor(i, b);
  const of = (id: string) => ({ ...binding, caseDef: loadCase(id) });

  it("conversation, contact; vitals: the attached monitor's screen, observations by hand at the patient, or the chart", () => {
    expect(req(ASK)).toEqual({ kind: "near-patient", range: 3, lineOfSight: true });
    expect(req(examine("general"))).toEqual({ kind: "at-patient", range: 1.5 });
    expect(req(examine("bilateral-bp"))).toEqual({ kind: "bedside-provider", capabilities: ["cardiac-monitor"], patientRange: 1.5 });
    expect(req(examine("ex-chest-scene"), of("anaphylaxis-garden"))).toEqual({ kind: "at-patient", range: 1.5 }); // stethoscope: personal kit
    expect(req(VITALS)).toEqual({ kind: "any-of", options: [{ kind: "monitor-screen", range: 6 }, { kind: "at-patient", range: 1.5, why: "observations" }, CHART] });
  });

  it("bedside investigations: ordered at the bedside or a fixed station with the patient there; read at the patient or a records terminal — never the device", () => {
    // a fixed station counts only with the patient within its reach (G8)
    const station = { kind: "all-of", options: [{ kind: "patient-at-provider", capabilities: ["ecg-12lead"] }, { kind: "at-provider", capabilities: ["ecg-12lead"], fixedOnly: true }] };
    expect(req(order("ecg-12lead"))).toEqual({ kind: "any-of", options: [{ kind: "bedside-provider", capabilities: ["ecg-12lead"], patientRange: 1.5 }, station] });
    expect(req(read("ecg-12lead"))).toEqual({ kind: "any-of", options: [{ kind: "at-patient", range: 1.5 }, CHART, { kind: "at-provider", capabilities: ["ecg-12lead"], fixedOnly: true, providerKinds: ["workstation"] }] });
    expect(req(read("cxr-portable"))).toEqual({ kind: "at-provider", capabilities: ["xray"] });
    expect(req(order("poc-glucose"), of("anaphylaxis-garden"))).toEqual({ kind: "anywhere" }); // requires nothing
    for (const cap of ["ecg-12lead", "point-of-care", "ultrasound", "peak-flow", "scale"]) expect(BEDSIDE_CAPABILITIES).toContain(cap);
  });

  it("studies on the patient at a fixed device: the patient brought there, then ordered at the device or its console; the report read anywhere it is shown (G8)", () => {
    // CT, fluoroscopy: the patient at the scanner / on the cath-lab table, ordered there or at the console
    expect(req(order("ct-aortogram"))).toEqual({ kind: "all-of", options: [{ kind: "patient-at-provider", capabilities: ["ct"] }, { kind: "at-provider", capabilities: ["ct"] }] });
    expect(req(order("coronary-angiography"))).toEqual({ kind: "all-of", options: [{ kind: "patient-at-provider", capabilities: ["fluoroscopy"] }, { kind: "at-provider", capabilities: ["fluoroscopy"] }] });
    expect(req(read("ct-aortogram"))).toEqual({ kind: "at-provider", capabilities: ["ct"] }); // the report: never the patient
    // a portable film (performedAt "bedside") moves nobody
    expect(req(order("cxr-portable"))).toEqual({ kind: "at-provider", capabilities: ["xray"] });
    // a patient-performed test: the patient at the station, ordered with them or at the station
    const asthma = of("pediatric-asthma");
    expect(req(order("pef"), asthma)).toEqual({ kind: "all-of", options: [{ kind: "patient-at-provider", capabilities: ["peak-flow"] }, { kind: "any-of", options: [{ kind: "at-patient", range: 1.5 }, { kind: "at-provider", capabilities: ["peak-flow"] }] }] });
    // a fixed X-ray machine without the portable flag: the patient goes to X-ray
    expect(req(order("cxr"), asthma)).toEqual({ kind: "all-of", options: [{ kind: "patient-at-provider", capabilities: ["xray"] }, { kind: "at-provider", capabilities: ["xray"] }] });
    expect(PATIENT_AT_PROVIDER_CAPABILITIES).toEqual(["ct", "mri", "xray", "fluoroscopy", "pet-ct", "endoscopy"]);
    expect(PATIENT_PERFORMED_CAPABILITIES).toEqual(["peak-flow", "scale"]);
  });

  it("laboratory: the sample at the patient — or, after the IV-access procedure drew the bloods, order entry at a records terminal or a lab station; results on any records terminal", () => {
    expect(req(order("hs-troponin"))).toEqual({
      kind: "any-of",
      options: [{ kind: "at-patient", range: 1.5, why: "sample" }, { kind: "all-of", options: [sample("iv-access"), { kind: "any-of", options: [CHART, { kind: "at-provider", capabilities: ["lab-chemistry"] }] }] }],
    });
    expect(req(read("hs-troponin"))).toEqual({ kind: "any-of", options: [CHART, { kind: "at-patient", range: 1.5 }, { kind: "at-provider", capabilities: ["lab-chemistry"] }] });
    expect(req(order("lipids-hba1c")).kind).toBe("any-of");
    // urine is collected at the patient (no IV-access shortcut); a case without an IV-access procedure: the patient
    expect(req(order("inv-ua"), of("acute-appendicitis"))).toEqual({ kind: "at-patient", range: 1.5, why: "sample" });
    expect(req(order("inv-hba1c"), of("new-onset-t2dm"))).toEqual({ kind: "at-patient", range: 1.5, why: "sample" });
    // anaphylaxis: the cannula takes the bloods
    expect(req(order("tryptase-1"), of("anaphylaxis-garden"))).toMatchObject({ kind: "any-of", options: [{ kind: "at-patient" }, { kind: "all-of", options: [sample("iv-cannula"), {}] }] });
    for (const cap of ["lab-chemistry", "lab-hematology", "blood-bank", "flow-cytometry"]) expect(LAB_CAPABILITIES).toContain(cap);
  });

  it("interventions: consult and disposition anywhere; others at the patient with their capabilities at the bedside", () => {
    // pharmacy-dispensed drugs are delivered to the bedside: only facility availability (`delivered`)
    expect(req(intervene("aspirin"))).toEqual({ kind: "bedside-provider", capabilities: [], patientRange: 1.5, delivered: ["medications"] });
    expect(req(intervene("cpr"))).toEqual({ kind: "at-patient", range: 1.5 });
    expect(req(intervene("activate-cath-lab"))).toEqual({ kind: "anywhere" }); // consult
    expect(req(intervene("transfer-cath-lab"))).toEqual({ kind: "anywhere" }); // disposition
  });

  it("IV access is patient state: IV drugs need the case's IV-access procedure done first; that procedure needs the cannulation kit at the bedside", () => {
    expect(req(intervene("dobutamine"))).toEqual({ kind: "all-of", options: [ivAccess, { kind: "bedside-provider", capabilities: ["infusion-pump"], patientRange: 1.5, delivered: ["medications"] }] });
    expect(req(intervene("ufh"))).toEqual({ kind: "all-of", options: [ivAccess, { kind: "bedside-provider", capabilities: [], patientRange: 1.5, delivered: ["medications"] }] });
    expect(req(intervene("iv-access"))).toEqual({ kind: "bedside-provider", capabilities: ["iv-access"], patientRange: 1.5 });
    // a cannula in situ (the post-operative ward patient): IV drugs need nothing first
    expect(req(intervene("ufh"), of("pulmonary-embolism-postop"))).toEqual({ kind: "bedside-provider", capabilities: ["infusion-pump"], patientRange: 1.5, delivered: ["medications"] });
    // no IV-access procedure in the case: none can be required (the line goes in with the drug)
    expect(req(intervene("hydrocortisone-iv"), of("pediatric-asthma"))).toEqual({ kind: "bedside-provider", capabilities: [], patientRange: 1.5, delivered: ["medications"] });
    const ana = of("anaphylaxis-garden");
    expect(req(intervene("iv-cannula"), ana)).toEqual({ kind: "bedside-provider", capabilities: ["iv-access"], patientRange: 1.5 });
    expect(req(intervene("fluid-bolus"), ana)).toEqual({ kind: "all-of", options: [{ ...ivAccess, condition: { intervened: "iv-cannula" }, interventionId: "iv-cannula" }, { kind: "at-patient", range: 1.5 }] });
  });

  it("the garden kit (G6): oxygen, a nebuliser driven by it, a monitor — and the kind defaults when `requires` is empty", () => {
    const ana = of("anaphylaxis-garden");
    expect(req(intervene("oxygen-high-flow"), ana)).toEqual({ kind: "bedside-provider", capabilities: ["oxygen"], patientRange: 1.5 });
    expect(req(intervene("salbutamol-neb"), ana)).toEqual({ kind: "bedside-provider", capabilities: ["nebulizer", "oxygen"], patientRange: 1.5 });
    expect(req(intervene("monitoring"), ana)).toEqual({ kind: "bedside-provider", capabilities: ["cardiac-monitor"], patientRange: 1.5 });
    expect(req(intervene("adrenaline-im"), ana)).toEqual({ kind: "at-patient", range: 1.5 }); // from the nurse's emergency bag
    // an intervention of a kit-dependent kind authored without `requires`: the kind's defaults
    const bare: CaseDefinition = structuredClone(ana.caseDef);
    for (const iv of bare.interventions) if (["oxygen-high-flow", "monitoring", "fluid-bolus"].includes(iv.id)) iv.requires = [];
    const b = { ...binding, caseDef: bare };
    expect(req(intervene("oxygen-high-flow"), b)).toEqual({ kind: "bedside-provider", capabilities: ["oxygen"], patientRange: 1.5 });
    expect(req(intervene("monitoring"), b)).toEqual({ kind: "bedside-provider", capabilities: ["cardiac-monitor"], patientRange: 1.5 });
    expect(req(intervene("fluid-bolus"), b)).toMatchObject({ kind: "all-of", options: [{ kind: "clinical", need: "iv-access" }, { kind: "at-patient" }] });
    expect(KIND_DEFAULT_CAPABILITIES).toEqual({ oxygen: ["oxygen"], monitoring: ["cardiac-monitor"], fluid: ["iv-access"], airway: ["airway"] });
  });

  it("consult, delegation, cognitive tools and unresolved items: anywhere", () => {
    for (const kind of ["consult", "delegate", "cognitive"] as const) expect(req({ tool: kind, kind })).toEqual({ kind: "anywhere" });
    expect(req(order("no-such-test"))).toEqual({ kind: "anywhere" });
    expect(req(intervene("no-such-drug"))).toEqual({ kind: "anywhere" });
    expect(req({ tool: "examine", kind: "examine" })).toEqual({ kind: "at-patient", range: 1.5 });
  });
});

describe("checkSpatial: every row, ok and each failure, with a hint that fixes it (STEMI, resus bay 1)", () => {
  it("ask_patient: not-near-patient → hint → ok; patient-not-visible behind a wall", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const far = failure(w.runtime.checkSpatial(A, ASK));
    expect(far).toMatchObject({ code: "SPATIAL_REQUIREMENT_UNMET", reason: "not-near-patient", hint: { goal: { kind: "interact", id: w.patientId } } });
    expect(far.details!.distance).toBeGreaterThan(40);
    expect(far.message).toMatch(/Liu Zhenhua/);
    expect(await follow(w, ASK, far)).toMatchObject({ ok: true, satisfiedBy: [w.patientId] });
    // a free floor spot within 3 m of the patient without a line of sight to them
    const patient = w.runtime.entity(w.patientId)!;
    let hidden: Pose | null = null;
    for (let dx = -4.5; dx <= 4.5 && !hidden; dx += 0.25)
      for (let dz = -4.5; dz <= 4.5 && !hidden; dz += 0.25) {
        const pose = at(patient.position.x + dx, patient.position.z + dz);
        const plan = w.runtime.plan(A, { kind: "point", x: pose.x, z: pose.z });
        if (!plan.ok || Math.hypot(plan.target.x - pose.x, plan.target.z - pose.z) > 1e-6) continue;
        w.runtime.updatePose(A, pose);
        const c = w.runtime.checkSpatial(A, ASK);
        if (!c.ok && c.reason === "patient-not-visible") hidden = pose;
      }
    expect(hidden).not.toBeNull();
    const behind = failure(w.runtime.checkSpatial(A, ASK));
    expect(behind.details!.distance).toBeLessThanOrEqual(3);
    expect((await follow(w, ASK, behind)).ok).toBe(true);
  });

  it("examine: at-patient (contact range) and bedside-provider (the monitor at the bedside)", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const patient = w.runtime.entity(w.patientId)!;
    w.runtime.updatePose(A, at(patient.position.x + 3, patient.position.z, -Math.PI / 2));
    expect(w.runtime.checkSpatial(A, ASK).ok).toBe(true); // within 3 m, in view
    const contact = failure(w.runtime.checkSpatial(A, examine("general")));
    expect(contact).toMatchObject({ reason: "not-at-patient", details: { range: 1.5 } });
    expect(await follow(w, examine("general"), contact)).toMatchObject({ ok: true });
    expect(w.runtime.checkSpatial(A, examine("bilateral-bp"))).toMatchObject({ ok: true, satisfiedBy: [w.patientId, expect.stringMatching(/monitor/)] });
    // both resus monitors out of service: the defibrillator-monitors on their carts still read the pressure
    w.runtime.setAvailability("resus1-monitor", false);
    w.runtime.setAvailability("resus2-monitor", false);
    expect(w.runtime.checkSpatial(A, examine("bilateral-bp"))).toMatchObject({ ok: true, satisfiedBy: [w.patientId, expect.stringMatching(/defibrillator/)] });
    for (const e of w.runtime.entities().filter((x) => x.capabilities.includes("cardiac-monitor") && !x.portable)) w.runtime.setAvailability(e.id, false);
    for (const e of w.runtime.entities().filter((x) => x.capabilities.includes("cardiac-monitor") && x.portable && x.room === "ed-resus")) w.runtime.setAvailability(e.id, false);
    const fetch = failure(w.runtime.checkSpatial(A, examine("bilateral-bp")));
    expect(fetch).toMatchObject({ reason: "provider-not-at-bedside", details: { missing: ["cardiac-monitor"] } });
    expect((await follow(w, examine("bilateral-bp"), fetch)).ok).toBe(true);
    for (const e of w.runtime.entities().filter((x) => x.capabilities.includes("cardiac-monitor"))) w.runtime.setAvailability(e.id, false);
    expect(w.runtime.checkSpatial(A, examine("bilateral-bp"))).toMatchObject({ ok: false, reason: "no-provider-in-facility", hint: null });
  });

  it("check_vitals without a monitor: by hand at the patient or in the chart; never from 5 m away", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const fromSpawn = failure(w.runtime.checkSpatial(A, VITALS));
    expect(["not-at-patient", "no-provider-in-reach"]).toContain(fromSpawn.reason);
    expect(await follow(w, VITALS, fromSpawn)).toMatchObject({ ok: true });
    const patient = w.runtime.entity(w.patientId)!;
    w.runtime.updatePose(A, at(patient.position.x + 5, patient.position.z, -Math.PI / 2));
    const far = failure(w.runtime.checkSpatial(A, VITALS));
    expect(far.reason).toBe("not-at-patient");
    expect(far.message).toMatch(/by hand|chart/);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "ed-records" })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, VITALS)).toMatchObject({ ok: true, satisfiedBy: ["eq:ed-records"] });
  });

  it("check_vitals with the monitor attached: its screen from 6 m in its own room (never through a wall or window)", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const patient = w.runtime.entity(w.patientId)!;
    w.runtime.updatePose(A, at(patient.position.x + 3.5, patient.position.z, -Math.PI / 2));
    expect(w.runtime.checkSpatial(A, VITALS).ok).toBe(false); // not attached yet: nothing on its screen
    w.harness.dispatch({ type: "intervene", interventionId: "cardiac-monitoring", by: "agent" });
    expect(w.runtime.checkSpatial(A, VITALS)).toMatchObject({ ok: true, satisfiedBy: ["eq:resus1-monitor"] });
    // beyond the screen range in the same room: back towards the monitor or the patient
    w.runtime.updatePose(A, at(patient.position.x + 7, patient.position.z, -Math.PI / 2));
    expect(w.runtime.checkSpatial(A, VITALS).ok).toBe(false);
    // the nurse station next door: no screen through the partition — the chart there instead
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "room", id: "ed-station" } })).status).toBe("completed");
    const seen = w.runtime.checkSpatial(A, VITALS);
    if (seen.ok) expect(seen.satisfiedBy).not.toContain("eq:resus1-monitor");
    // the monitor out of service: not attached for anyone → by hand or the chart
    w.runtime.setAvailability("resus1-monitor", false);
    w.runtime.updatePose(A, at(patient.position.x + 3.5, patient.position.z, -Math.PI / 2));
    expect(failure(w.runtime.checkSpatial(A, VITALS)).reason).toBe("not-at-patient");
  });

  it("check_vitals from outside the building, through the consult room's window: refused (no monitor: at the patient)", () => {
    const w = makeWorld("new-onset-t2dm");
    w.runtime.updatePose(A, at(-29.27, 11.2));
    expect(w.runtime.actor(A)!.room).toBeNull();
    expect(w.runtime.checkSpatial(A, VITALS).ok).toBe(false);
  });

  it("order_test (lab): the sample at the patient; once IV access drew the bloods, any records terminal or lab station", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const t = order("hs-troponin");
    const far = failure(w.runtime.checkSpatial(A, t));
    expect(far).toMatchObject({ reason: "not-at-patient", hint: { goal: { kind: "interact", id: w.patientId } }, details: { why: "sample" } });
    expect(far.message).toMatch(/sample/);
    expect(await follow(w, t, far)).toMatchObject({ ok: true, satisfiedBy: [w.patientId] });
    // at a records terminal before any sample: refused, back to the patient
    expect((await w.act({ actorId: A, operation: "approach", targetId: "ed-records" })).status).toBe("completed");
    const early = failure(w.runtime.checkSpatial(A, t));
    expect(early.hint!.goal).toEqual({ kind: "interact", id: w.patientId });
    // the IV-access procedure drew the bloods: order entry at the terminal, or the lab workstation — no walk to the patient
    w.harness.dispatch({ type: "intervene", interventionId: "iv-access", by: "agent" });
    expect(w.runtime.checkSpatial(A, t)).toMatchObject({ ok: true, satisfiedBy: ["eq:ed-records"] });
    expect((await w.act({ actorId: A, operation: "approach", targetId: "lab-workstation" })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, t)).toMatchObject({ ok: true, satisfiedBy: ["eq:lab-workstation"] });
    // results on any records terminal (or at the patient)
    expect((await w.act({ actorId: A, operation: "approach", targetId: "ed-records" })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, read("hs-troponin"))).toMatchObject({ ok: true, satisfiedBy: ["eq:ed-records"] });
    // every terminal and lab station out of service: still at the patient (pneumatic tube)
    for (const e of w.runtime.entities().filter((x) => x.capabilities.includes("records") || x.capabilities.includes("lab-chemistry"))) w.runtime.setAvailability(e.id, false);
    const none = failure(w.runtime.checkSpatial(A, t));
    expect(none.hint!.goal).toEqual({ kind: "interact", id: w.patientId });
    expect((await follow(w, t, none)).ok).toBe(true);
  });

  it("read_result of a recorded ECG: at the patient or a records terminal — the cart may be gone", async () => {
    const w = makeWorld("stemi-inferior-rv");
    w.harness.dispatch({ type: "order", investigationId: "ecg-12lead", by: "agent" });
    for (const id of ["resus1-ecg", "resus2-ecg"]) w.runtime.setAvailability(id, false);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "ed-records" })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, read("ecg-12lead"))).toMatchObject({ ok: true, satisfiedBy: ["eq:ed-records"] });
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, read("ecg-12lead"))).toMatchObject({ ok: true, satisfiedBy: [w.patientId] });
  });

  it("order_test (bedside): at the patient with the cart there; fetch a cart when none is at the bedside; or a fixed station", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const ecg = order("ecg-12lead");
    const far = failure(w.runtime.checkSpatial(A, ecg));
    expect(far).toMatchObject({ reason: "not-at-patient", hint: { goal: { kind: "interact", id: w.patientId } } });
    expect(await follow(w, ecg, far)).toMatchObject({ ok: true, satisfiedBy: [w.patientId, "eq:resus1-ecg"] });
    // no ECG cart at this bedside any more: fetch one from elsewhere and wheel it here
    w.runtime.setAvailability("resus1-ecg", false);
    w.runtime.setAvailability("resus2-ecg", false);
    const fetch = failure(w.runtime.checkSpatial(A, ecg));
    expect(fetch).toMatchObject({ reason: "provider-not-at-bedside", details: { missing: ["ecg-12lead"] } });
    expect(fetch.hint!.label).toMatch(/wheel it to|move_to/);
    expect(fetch.message).toMatch(/12-lead ECG/);
    expect(fetch.message).not.toMatch(/ecg-12lead/);
    const cart = (fetch.hint!.goal as { id: string }).id;
    expect(["eq:cub2-ecg", "eq:ward-ecg", "eq:icu-ecg"]).toContain(cart);
    // the hint says what to do at the cart: wheel it to the patient
    expect(fetch.hint!.then).toEqual({ operation: "move_to", targetId: cart, goal: { kind: "interact", id: w.patientId } });
    const after = await follow(w, ecg, fetch);
    expect(after).toMatchObject({ ok: true, satisfiedBy: [w.patientId, cart] });
    // a point-of-care test: the glucometer lives at the ED station, not at the bedside
    const glu = failure(w.runtime.checkSpatial(A, order("poc-glucose")));
    expect(glu.reason).toBe("provider-not-at-bedside");
    expect((await follow(w, order("poc-glucose"), glu)).ok).toBe(true);
  });

  it("a device reserved by someone else is not a provider: the other cart in the room, else an alternative to fetch", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const ecg = order("ecg-12lead");
    // the nurse prepares (and so reserves) the bay's own cart, at the patient's side
    await operate(w, "staff:ed-nurse", "eq:resus1-ecg", "prepare");
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, ecg)).toMatchObject({ ok: true, satisfiedBy: [w.patientId, "eq:resus2-ecg"] });
    // the second cart reserved too (wheeled over from bay 2 and prepared): busy — fetch one from elsewhere
    await operate(w, "staff:triage-nurse", "eq:resus2-ecg", "prepare");
    const busy = failure(w.runtime.checkSpatial(A, ecg));
    expect(busy).toMatchObject({ reason: "provider-busy", details: { busy: ["ecg-12lead"] } });
    expect(busy.message).toMatch(/in use by/);
    const alternative = (busy.hint!.goal as { id: string }).id;
    expect(["eq:resus1-ecg", "eq:resus2-ecg"]).not.toContain(alternative);
    expect((await follow(w, ecg, busy)).ok).toBe(true);
    // the device operation on the busy cart: DEVICE_BUSY with a hint to an alternative
    const op = await w.act({ actorId: A, operation: "connect", targetId: "eq:resus1-ecg" });
    expect(op).toMatchObject({ status: "failed", errorCode: "DEVICE_BUSY" });
    expect(op.hint?.goal).toMatchObject({ kind: "interact" });
    expect((op.hint!.goal as { id: string }).id).not.toBe("eq:resus1-ecg");
  });

  it("IV drugs before cannulation: refused with the procedure to do first, no walk fixes it; then given at the patient", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    const early = failure(w.runtime.checkSpatial(A, intervene("ufh")));
    expect(early).toMatchObject({ reason: "clinical-prerequisite", hint: null, details: { need: "iv-access", prerequisite: { tool: "intervene", intervention_id: "iv-access" } } });
    expect(early.message).toMatch(/IV access|cannula/);
    // the IV-access procedure itself: the cannulation kit (the crash cart) at the bedside — not the IV pole
    expect(w.runtime.checkSpatial(A, intervene("iv-access"))).toMatchObject({ ok: true, satisfiedBy: [w.patientId, "eq:resus1-crash-cart"] });
    w.harness.dispatch({ type: "intervene", interventionId: "iv-access", by: "agent" });
    expect(w.runtime.checkSpatial(A, intervene("ufh"))).toMatchObject({ ok: true, satisfiedBy: [w.patientId] });
  });

  it("intervene: drugs at the patient (delivered); consults from anywhere; blood products delivered too", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect(w.runtime.checkSpatial(A, intervene("activate-cath-lab"))).toMatchObject({ ok: true, satisfiedBy: [] });
    expect(w.runtime.checkSpatial(A, { tool: "answer_decision", kind: "cognitive" })).toMatchObject({ ok: true });
    const aspirin = failure(w.runtime.checkSpatial(A, intervene("aspirin")));
    expect(aspirin.reason).toBe("not-at-patient");
    expect(await follow(w, intervene("aspirin"), aspirin)).toMatchObject({ ok: true, satisfiedBy: [w.patientId] });
    expect(w.runtime.checkSpatial(A, intervene("defib-pads")).ok).toBe(true);
    expect(w.runtime.checkSpatial(A, intervene("cpr")).ok).toBe(true);
    // the stroke case's sICH protocol needs blood products: the blood bank (fixed in the laboratory) delivers them
    const stroke = makeWorld("acute-ischemic-stroke");
    const sich = failure(stroke.runtime.checkSpatial(A, intervene("sich-protocol")));
    expect(sich).toMatchObject({ reason: "not-at-patient", hint: { goal: { kind: "interact", id: stroke.patientId } } });
    expect(await follow(stroke, intervene("sich-protocol"), sich)).toMatchObject({ ok: true, satisfiedBy: [stroke.patientId] });
  });

  it("delivered capabilities need an in-service provider somewhere in the facility, never at the bedside", async () => {
    const w = makeWorld("acute-ischemic-stroke");
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, intervene("sich-protocol")).ok).toBe(true);
    const fridges = w.runtime.entities().filter((e) => e.capabilities.includes("blood-bank"));
    expect(fridges.length).toBeGreaterThan(0);
    for (const e of fridges) w.runtime.setAvailability(e.id, false);
    expect(w.runtime.checkSpatial(A, intervene("sich-protocol"))).toMatchObject({ ok: false, reason: "no-provider-in-facility", hint: null, details: { missing: ["blood-bank"] } });
    const stemi = makeWorld("stemi-inferior-rv");
    expect((await stemi.act({ actorId: A, operation: "approach", targetId: stemi.patientId })).status).toBe("completed");
    expect(stemi.runtime.checkSpatial(A, intervene("aspirin")).ok).toBe(true);
    for (const e of stemi.runtime.entities().filter((x) => x.capabilities.includes("medications"))) stemi.runtime.setAvailability(e.id, false);
    expect(stemi.runtime.checkSpatial(A, intervene("aspirin"))).toMatchObject({ ok: false, reason: "no-provider-in-facility", details: { missing: ["medications"] } });
    // a custom policy may keep drugs at the bedside
    const strict = new DefaultSpatialPolicy({ deliveredCapabilities: [] });
    expect(strict.requirementFor(intervene("aspirin"), { caseDef: stemi.caseDef, slotId: stemi.slotId, locale: "en" })).toEqual({ kind: "bedside-provider", capabilities: ["medications"], patientRange: 1.5 });
  });

  it("a facility without the capability: no-provider-in-facility, no hint (STEMI placed in the V4 clinic)", () => {
    const w = makeWorld("stemi-inferior-rv", { facility: "clinic-v4", slotId: "consult-1" });
    expect(w.runtime.checkSpatial(A, order("ecg-12lead"))).toMatchObject({ ok: false, reason: "no-provider-in-facility", hint: null });
    // a lab test: the sample at the patient (the clinic's patient), ordered there
    expect(w.runtime.checkSpatial(A, order("hs-troponin"))).toMatchObject({ ok: false, reason: "not-at-patient", hint: { goal: { kind: "interact", id: w.patientId } } });
    expect(w.runtime.checkSpatial(A, ASK, { recheck: true })).toMatchObject({ ok: false, code: "SPATIAL_PRECONDITION_CHANGED" });
  });

  it("messages are localised; capabilities by their display labels", () => {
    const w = makeWorld("stemi-inferior-rv", { locale: "zh-CN" });
    const c = failure(w.runtime.checkSpatial(A, ASK));
    expect(c.message).toMatch(/刘振华/);
    expect(c.hint!.label).toMatch(/前往/);
    for (const id of ["eq:ed-glucometer", "eq:ward-glucometer"]) w.runtime.setAvailability(id, false);
    const none = failure(w.runtime.checkSpatial(A, order("poc-glucose")));
    expect(none.message).toMatch(/床旁快速检测/);
    expect(none.message).not.toMatch(/point-of-care/);
  });
});

/**
 * Property: in its own facility, from the entrance, following the hints of
 * every investigation (order and read), intervention and exam finding of
 * every built-in case — and the vitals and history — reaches a place where
 * the check passes: a navigation for a patient / provider / monitor hint,
 * navigation + `move_to` for a cart to fetch, and for a clinical
 * prerequisite (no hint) the act it names (`details.prerequisite`, itself
 * reached by following its own hints). Never a loop (the same refusal at the
 * same spot twice), never stuck.
 */
describe("property: hints lead to a passing check for every item of every built-in case", () => {
  for (const caseId of caseIds()) {
    it(caseId, async () => {
      const w = makeWorld(caseId);
      const c = w.caseDef;
      const intents: ClinicalIntent[] = [
        ...c.investigations.flatMap((i) => [order(i.id), read(i.id)]),
        ...c.interventions.map((i) => intervene(i.id)),
        ...c.exam.map((f) => examine(f.id)),
        ASK,
        VITALS,
      ];
      const caps = facilityCapabilities(w.facility, catalogs());
      const stuck: string[] = [];
      const satisfy = async (intent: ClinicalIntent, depth = 0): Promise<SpatialCheck> => {
        const item = intent.investigationId ?? intent.interventionId ?? intent.findingId ?? intent.kind;
        let check = w.runtime.checkSpatial(A, intent);
        const seen = new Set<string>();
        for (let step = 0; step < 8 && !check.ok; step++) {
          const here = w.runtime.actor(A)!.pose;
          const key = `${Math.round(here.x * 4)},${Math.round(here.z * 4)},${here.level}|${check.reason}|${JSON.stringify(check.hint?.goal ?? null)}`;
          if (seen.has(key)) throw new Error(`${caseId} ${intent.kind} ${item}: hint loop at ${key}`);
          seen.add(key);
          if (check.reason === "clinical-prerequisite") {
            const pre = check.details?.prerequisite as { tool: string; intervention_id: string } | undefined;
            expect(pre, `${caseId} ${item}: a prerequisite without its act`).toBeDefined();
            expect(depth, `${caseId} ${item}: nested prerequisites`).toBeLessThan(2);
            const done = await satisfy(intervene(pre!.intervention_id), depth + 1);
            expect(done.ok, `${caseId} ${item}: its prerequisite ${pre!.intervention_id} cannot be done`).toBe(true);
            w.harness.dispatch({ type: "intervene", interventionId: pre!.intervention_id, by: "agent" });
            check = w.runtime.checkSpatial(A, intent);
            continue;
          }
          if (!check.hint) break;
          check = await follow(w, intent, check);
        }
        return check;
      };
      for (const intent of intents) {
        const item = intent.investigationId ?? intent.interventionId ?? intent.findingId ?? intent.kind;
        w.runtime.updatePose(A, spawnOf(w));
        // a read needs its order first (the engine refuses otherwise): order it through the same rules
        if (intent.kind === "read" && !w.harness.state().orders.some((o) => o.investigationId === intent.investigationId)) w.harness.dispatch({ type: "order", investigationId: intent.investigationId!, by: "agent" });
        const check = await satisfy(intent);
        if (check.ok) continue;
        // only nothing in the facility may stop an item: an absent capability, never a missing hint or a loop
        expect(check.reason, `${caseId} ${intent.kind} ${item}: ${check.message}`).toBe("no-provider-in-facility");
        const missing = (check.details?.missing as string[] | undefined) ?? (check.details?.capabilities as string[]);
        expect(missing.some((cap) => !caps.has(cap) && !(PERSONAL_KIT as readonly string[]).includes(cap)) || check.details?.fixedOnly !== undefined, `${caseId} ${item}`).toBe(true);
        stuck.push(`${intent.kind} ${item}`);
      }
      // every item of the built-in content can be done embodied in its own facility
      expect(stuck).toEqual([]);
    }, 120000);
  }
});
