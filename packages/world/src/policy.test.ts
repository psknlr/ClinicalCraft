import { describe, expect, it } from "vitest";
import { PERSONAL_KIT, facilityCapabilities } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type ClinicalIntent, type Pose, type SpatialCheck } from "./contracts.js";
import { BEDSIDE_CAPABILITIES, DefaultSpatialPolicy } from "./policy.js";
import { caseIds, catalogs, loadCase, makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const order = (investigationId: string): ClinicalIntent => ({ tool: "order_test", kind: "order", investigationId });
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
  if (f.reason === "provider-not-at-bedside") {
    expect(f.hint!.goal.kind).toBe("interact");
    const cart = (f.hint!.goal as { id: string }).id;
    const moved = await w.act({ actorId: A, operation: "move_to", targetId: cart, goal: { kind: "interact", id: w.patientId } });
    expect(moved.status, moved.message).toBe("completed");
  }
  return w.runtime.checkSpatial(A, intent);
}

describe("DefaultSpatialPolicy: the requirement of each clinical action (EMBODIED §6)", () => {
  const binding = { caseDef: loadCase("stemi-inferior-rv"), slotId: "resus-1", locale: "en" };
  const p = new DefaultSpatialPolicy();
  const req = (i: ClinicalIntent, b = binding) => p.requirementFor(i, b);

  it("conversation, contact, the monitor screen or the chart", () => {
    expect(req(ASK)).toEqual({ kind: "near-patient", range: 3, lineOfSight: true });
    expect(req(examine("general"))).toEqual({ kind: "at-patient", range: 1.5 });
    expect(req(examine("bilateral-bp"))).toEqual({ kind: "bedside-provider", capabilities: ["cardiac-monitor"], patientRange: 1.5 });
    const asthma = { ...binding, caseDef: loadCase("anaphylaxis-garden") };
    expect(req(examine("ex-chest-scene"), asthma)).toEqual({ kind: "at-patient", range: 1.5 }); // stethoscope: personal kit
    expect(req(VITALS)).toEqual({ kind: "any-of", options: [{ kind: "near-patient", range: 6, lineOfSight: true }, { kind: "at-provider", capabilities: ["records"] }] });
  });

  it("investigations: bedside capabilities at the bedside or a fixed station; others at a provider; none anywhere", () => {
    expect(req(order("ecg-12lead"))).toEqual({ kind: "any-of", options: [{ kind: "bedside-provider", capabilities: ["ecg-12lead"], patientRange: 1.5 }, { kind: "at-provider", capabilities: ["ecg-12lead"], fixedOnly: true }] });
    expect(req(order("hs-troponin"))).toEqual({ kind: "at-provider", capabilities: ["lab-chemistry"] });
    expect(req(order("lipids-hba1c"))).toEqual({ kind: "at-provider", capabilities: ["lab-chemistry", "lab-endocrine"] });
    expect(req({ tool: "read_result", kind: "read", investigationId: "cxr-portable" })).toEqual({ kind: "at-provider", capabilities: ["xray"] });
    expect(req(order("poc-glucose"), { ...binding, caseDef: loadCase("anaphylaxis-garden") })).toEqual({ kind: "anywhere" }); // requires nothing
    for (const cap of ["ecg-12lead", "point-of-care", "ultrasound", "peak-flow", "scale"]) expect(BEDSIDE_CAPABILITIES).toContain(cap);
  });

  it("interventions: consult and disposition anywhere; others at the patient with their capabilities at the bedside", () => {
    expect(req(intervene("aspirin"))).toEqual({ kind: "bedside-provider", capabilities: ["medications"], patientRange: 1.5 });
    expect(req(intervene("dobutamine"))).toEqual({ kind: "bedside-provider", capabilities: ["infusion-pump", "medications"], patientRange: 1.5 });
    expect(req(intervene("cpr"))).toEqual({ kind: "at-patient", range: 1.5 });
    expect(req(intervene("activate-cath-lab"))).toEqual({ kind: "anywhere" }); // consult
    expect(req(intervene("transfer-cath-lab"))).toEqual({ kind: "anywhere" }); // disposition
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
    // both resus monitors out of service: the others are fixed elsewhere — nothing can be brought
    w.runtime.setAvailability("resus1-monitor", false);
    w.runtime.setAvailability("resus2-monitor", false);
    expect(w.runtime.checkSpatial(A, examine("bilateral-bp"))).toMatchObject({ ok: false, reason: "provider-not-at-bedside", hint: null, details: { missing: ["cardiac-monitor"] } });
    for (const e of w.runtime.entities().filter((x) => x.capabilities.includes("cardiac-monitor"))) w.runtime.setAvailability(e.id, false);
    expect(w.runtime.checkSpatial(A, examine("bilateral-bp"))).toMatchObject({ ok: false, reason: "no-provider-in-facility", hint: null });
  });

  it("check_vitals: the screen from 6 m, or the chart at a records station", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const fromSpawn = failure(w.runtime.checkSpatial(A, VITALS));
    expect(["not-near-patient", "no-provider-in-reach"]).toContain(fromSpawn.reason);
    expect(await follow(w, VITALS, fromSpawn)).toMatchObject({ ok: true });
    const patient = w.runtime.entity(w.patientId)!;
    w.runtime.updatePose(A, at(patient.position.x + 5, patient.position.z, -Math.PI / 2));
    expect(w.runtime.checkSpatial(A, VITALS)).toMatchObject({ ok: true, satisfiedBy: [w.patientId] });
    expect(w.runtime.checkSpatial(A, examine("general")).ok).toBe(false);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "ed-records" })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, VITALS)).toMatchObject({ ok: true, satisfiedBy: ["eq:ed-records"] });
  });

  it("order_test (lab): at a provider in reach; the nearest in-service one is the hint; none → no-provider-in-facility", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const t = order("hs-troponin");
    const far = failure(w.runtime.checkSpatial(A, t));
    expect(far).toMatchObject({ reason: "no-provider-in-reach", hint: { goal: { kind: "interact" } } });
    expect(far.details!.providers).toEqual(expect.arrayContaining(["eq:lab-workstation", "eq:lab-chemistry"]));
    const ok = await follow(w, t, far);
    expect(ok.ok).toBe(true);
    const used = ok.ok ? ok.satisfiedBy[0] : "";
    w.runtime.setAvailability(used, false);
    const other = failure(w.runtime.checkSpatial(A, t));
    expect(other.reason).toBe("no-provider-in-reach");
    expect((other.hint!.goal as { id: string }).id).not.toBe(used);
    expect((await follow(w, t, other)).ok).toBe(true);
    for (const id of ["eq:lab-workstation", "eq:lab-chemistry"]) w.runtime.setAvailability(id, false);
    expect(w.runtime.checkSpatial(A, t)).toMatchObject({ ok: false, reason: "no-provider-in-facility", hint: null });
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
    const cart = (fetch.hint!.goal as { id: string }).id;
    expect(["eq:cub2-ecg", "eq:ward-ecg", "eq:icu-ecg"]).toContain(cart);
    const after = await follow(w, ecg, fetch);
    expect(after).toMatchObject({ ok: true, satisfiedBy: [w.patientId, cart] });
    // a point-of-care test: the glucometer lives at the ED station, not at the bedside
    const glu = failure(w.runtime.checkSpatial(A, order("poc-glucose")));
    expect(glu.reason).toBe("provider-not-at-bedside");
    expect((await follow(w, order("poc-glucose"), glu)).ok).toBe(true);
  });

  it("order_test (ultrasound): POCUS at the bedside, or a formal request at the radiology console — never a cart elsewhere", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const us = order("pocus-echo");
    expect((await w.act({ actorId: A, operation: "approach", targetId: "radiology-console" })).status).toBe("completed");
    expect(w.runtime.checkSpatial(A, us)).toMatchObject({ ok: true, satisfiedBy: ["eq:radiology-console"] });
    expect((await w.act({ actorId: A, operation: "approach", targetId: "ultrasound-machine" })).status).toBe("completed");
    const cartElsewhere = failure(w.runtime.checkSpatial(A, us));
    expect(cartElsewhere.reason).not.toBe("no-provider-in-facility");
    expect((await follow(w, us, cartElsewhere)).ok).toBe(true);
  });

  it("intervene: medications at the bedside; consults from anywhere; a fixed provider elsewhere cannot be brought", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect(w.runtime.checkSpatial(A, intervene("activate-cath-lab"))).toMatchObject({ ok: true, satisfiedBy: [] });
    expect(w.runtime.checkSpatial(A, { tool: "answer_decision", kind: "cognitive" })).toMatchObject({ ok: true });
    const aspirin = failure(w.runtime.checkSpatial(A, intervene("aspirin")));
    expect(aspirin.reason).toBe("not-at-patient");
    expect(await follow(w, intervene("aspirin"), aspirin)).toMatchObject({ ok: true, satisfiedBy: [w.patientId, expect.stringMatching(/crash-cart/)] });
    expect(w.runtime.checkSpatial(A, intervene("defib-pads")).ok).toBe(true);
    expect(w.runtime.checkSpatial(A, intervene("cpr")).ok).toBe(true);
    const stroke = makeWorld("acute-ischemic-stroke");
    expect((await stroke.act({ actorId: A, operation: "approach", targetId: stroke.patientId })).status).toBe("completed");
    expect(stroke.runtime.checkSpatial(A, intervene("sich-protocol"))).toMatchObject({ ok: false, reason: "provider-not-at-bedside", hint: null, details: { missing: ["blood-bank"] } });
  });

  it("a facility without the capability: no-provider-in-facility, no hint (STEMI placed in the V4 clinic)", () => {
    const w = makeWorld("stemi-inferior-rv", { facility: "clinic-v4", slotId: "consult-1" });
    expect(w.runtime.checkSpatial(A, order("ecg-12lead"))).toMatchObject({ ok: false, reason: "no-provider-in-facility", hint: null });
    expect(w.runtime.checkSpatial(A, order("hs-troponin"))).toMatchObject({ ok: false, reason: "no-provider-in-reach", hint: { goal: { kind: "interact", id: "eq:ws-lab" } } });
    expect(w.runtime.checkSpatial(A, ASK, { recheck: true })).toMatchObject({ ok: false, code: "SPATIAL_PRECONDITION_CHANGED" });
  });

  it("messages are localised", () => {
    const w = makeWorld("stemi-inferior-rv", { locale: "zh-CN" });
    const c = failure(w.runtime.checkSpatial(A, ASK));
    expect(c.message).toMatch(/刘振华/);
    expect(c.hint!.label).toMatch(/前往/);
  });
});

/**
 * Property: in its own facility, from the entrance, following the hints of
 * every investigation, intervention and exam finding of every built-in case
 * reaches a place where the check passes — a single navigation for a
 * patient / provider hint, navigation + `move_to` for a cart to fetch. A
 * null hint is only given when nothing usable provides a capability or no
 * provider of a missing bedside capability can be brought — never for an
 * item of the case's reference solution.
 */
describe("property: hints lead to a passing check for every item of every built-in case", () => {
  for (const caseId of caseIds()) {
    it(caseId, async () => {
      const w = makeWorld(caseId);
      const c = w.caseDef;
      const solution = new Set(c.solution.flatMap((s) => (s.type === "order" || s.type === "read" ? [s.investigationId] : s.type === "intervene" ? [s.interventionId] : s.type === "examine" ? [s.findingId] : [])));
      const intents: ClinicalIntent[] = [...c.investigations.map((i) => order(i.id)), ...c.interventions.map((i) => intervene(i.id)), ...c.exam.map((f) => examine(f.id)), ASK, VITALS];
      const caps = facilityCapabilities(w.facility, catalogs());
      const portable = new Set(w.runtime.entities().filter((e) => e.portable).flatMap((e) => e.capabilities));
      const stuck: string[] = [];
      for (const intent of intents) {
        const item = intent.investigationId ?? intent.interventionId ?? intent.findingId ?? intent.kind;
        w.runtime.updatePose(A, spawnOf(w));
        let check = w.runtime.checkSpatial(A, intent);
        for (let step = 0; step < 3 && !check.ok && check.hint; step++) {
          const reason = check.reason;
          check = await follow(w, intent, check);
          // one navigation (or one fetch) fixes what the hint names; a fetched cart may leave the walk to the patient
          if (!check.ok && reason !== "provider-not-at-bedside") throw new Error(`${caseId} ${item}: still ${check.reason} after following the hint`);
        }
        if (check.ok) continue;
        expect(check.hint, `${caseId} ${item}: ${check.reason}`).toBeNull();
        expect(solution.has(item), `${caseId} ${item} is in the solution but cannot be done here (${check.reason})`).toBe(false);
        const details = check.details ?? {};
        if (check.reason === "no-provider-in-facility") {
          // bedside: some capability nobody provides; at a provider: no single provider has them all
          if (details.missing) expect((details.missing as string[]).every((cap) => !caps.has(cap))).toBe(true);
          else {
            const need = details.capabilities as string[];
            const providers = w.runtime.entities().filter((e) => ["workstation", "device", "monitor"].includes(e.interaction) && (!details.fixedOnly || !e.portable) && need.every((cap) => e.capabilities.includes(cap)));
            expect(providers).toEqual([]);
          }
        } else {
          expect(check.reason).toBe("provider-not-at-bedside");
          expect((details.missing as string[]).some((cap) => !portable.has(cap) && !(PERSONAL_KIT as readonly string[]).includes(cap))).toBe(true);
        }
        stuck.push(`${item}:${check.reason}`);
      }
      // the only item of the built-in content that cannot be done embodied: the stroke case's sICH protocol needs the blood bank at the bedside
      expect(stuck).toEqual(caseId === "acute-ischemic-stroke" ? ["sich-protocol:provider-not-at-bedside"] : []);
    }, 60000);
  }
});
