/**
 * Review round: role authority and scope of practice (R1 S3 = R2 C2 = R3 G2) — the reviewers' reproductions as
 * regression tests. A body may only do what its role may: a porter or a receptionist nothing clinical, a nurse
 * medication/fluid/oxygen/monitoring/positioning, the case's IV access and the items authored `scope: "nursing"`
 * (CPR, defibrillation, catheters… — no airway, arterial line, other medical procedure, consult or disposition),
 * a paramedic also the airway, the lab, pharmacy and imaging staff no patient
 * interventions. Delegations are refused before the staff member takes a step; the spatial gate refuses a clinical
 * act by a body outside its role before anyone is asked; the approval names the staff member who would act.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { answerAll, builtinContent, command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { checkClinicalScope, checkTaskScope, SCOPE_OF_PRACTICE } from "../tools/scope.js";
import { DELEGATION_TASKS } from "../tools/world.js";
import { ACCESS, kernelOf, operatorSteps, STAFF, standAtTable, theatreSession } from "./__fixtures__/theatre.js";

/** Run `delegate_task` as an external agent's call (the reviewer's route); its result. */
async function delegate(t: TestSession, callId: string, args: Record<string, unknown>) {
  const events = await t.session.run({ type: "external_tool_call", callId, tool: "delegate_task", args });
  const end = msgsOf(events, "tool_call_end").find((m) => m.callId === callId)!;
  return { end, delegation: (end.data as { delegation: { status: string; message?: string; refusal?: string; steps: { operation: string; code?: string }[] } }).delegation, events };
}

describe("S3: delegation within the staff member's scope of practice", () => {
  it("a receptionist is never sent to give a drug or cannulate: refused before a step, nothing asked, nothing given", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "default" } });
    let asked = 0;
    t.session.subscribe((e) => {
      if (e.msg.type === "approval_request") {
        asked++;
        t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
      }
    });
    const w = t.session.world()!;
    const before = w.actor("staff:receptionist")!.pose;
    const drug = await delegate(t, "c1", { role: "receptionist", task: "give_intervention", params: { intervention: "aspirin" } });
    expect(drug.delegation).toMatchObject({ status: "failed", message: "not-authorized" });
    expect(drug.delegation.steps).toEqual([expect.objectContaining({ code: "NOT_AUTHORIZED" })]);
    expect(drug.end.output).toMatch(/receptionist/i);
    const iv = await delegate(t, "c2", { role: "staff:receptionist", task: "obtain_iv_access" });
    expect(iv.delegation).toMatchObject({ status: "failed", message: "not-authorized" });
    expect(w.actor("staff:receptionist")!.pose).toEqual(before);
    expect(asked).toBe(0);
    expect(t.session.state.interventions).toEqual([]);
    // What a receptionist may do: fetch a cart.
    const fetch = await delegate(t, "c3", { role: "receptionist", task: "fetch_equipment", target: "eq:cub2-ecg" });
    expect(fetch.delegation.message).toBeUndefined();
    await t.session.close();
  });

  it("a lab technician or a pharmacist never gives tenecteplase; a nurse never intubates; a radiologist never places an arterial line", async () => {
    for (const [caseId, role, item] of [
      ["stemi-inferior-rv", "lab-tech", "tenecteplase"],
      ["stemi-inferior-rv", "pharmacist", "tenecteplase"],
      ["septic-shock-cap", "nurse", "intubation"],
      ["septic-shock-cap", "radiologist", "arterial-line"],
    ] as const) {
      const t = await makeEmbodiedSession({ caseId });
      answerAll(t, "approved");
      const d = await command(t, "delegate", `${role} give_intervention ${item}`);
      expect(d.data.delegation, `${role} ${item}: ${d.text}`).toMatchObject({ status: "failed", message: "not-authorized" });
      expect(d.text, `${role} ${item}`).toMatch(/scope of practice/);
      expect(t.session.state.interventions.map((i) => i.interventionId), `${role} ${item}`).toEqual([]);
      await t.session.close();
    }
  });

  it("a nurse gives a drug in her scope; the approval names her (and a Chinese session words it in Chinese)", async () => {
    for (const locale of ["en", "zh-CN"]) {
      const t = await makeEmbodiedSession({ settingsPatch: { locale, permissions: { ask: ["intervene"] } } });
      const summaries: string[] = [];
      t.session.subscribe((e) => {
        if (e.msg.type === "approval_request") {
          summaries.push(e.msg.summary);
          t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
        }
      });
      const d = await command(t, "delegate", "ed-nurse give_intervention aspirin");
      expect(d.data.delegation.status, d.text).toBe("completed");
      expect(t.session.state.interventions.map((i) => i.interventionId)).toEqual(["aspirin"]);
      const name = t.session.world()!.entity("staff:ed-nurse")!.name;
      expect(summaries.length).toBe(1);
      expect(summaries[0]).toContain(locale === "en" ? (name as { en: string }).en : (name as { "zh-CN": string })["zh-CN"]);
      expect(summaries[0]).toMatch(locale === "en" ? /Nurse/i : /护士/);
      await t.session.close();
    }
  });
});

describe("S3: the spatial gate refuses a clinical act outside the acting body's role", () => {
  it("before the approval gate: NOT_AUTHORIZED for a porter-like body, a nurse's airway; the learner's avatar may", async () => {
    const t = await makeEmbodiedSession({ caseId: "septic-shock-cap" });
    const s = t.session;
    const intervene = s.tool("intervene")!;
    const ctx = (actorId: string) => ({ caseDef: s.caseDef, facility: s.facility, catalogs: s.catalogs, locale: "en", agent: "learner", state: () => s.state, actorId }) as never;
    const nurse = intervene.precheck!({ intervention_id: "intubation" }, ctx("staff:ed-nurse"));
    expect(nurse).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED", reason: "intervention" } });
    const clerk = intervene.precheck!({ intervention_id: "iv-access" }, ctx("staff:receptionist"));
    expect(clerk).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED", reason: "no-clinical-authority" } });
    // The learner's avatar: no scope refusal (the spatial requirement is a different matter).
    const own = intervene.precheck!({ intervention_id: "intubation" }, ctx(PRIMARY_ACTOR));
    expect((own?.data as { code?: string } | undefined)?.code).not.toBe("NOT_AUTHORIZED");
    await t.session.close();
  });

  it("the scope table: a paramedic may manage the airway, a nurse may not; porters fetch and wheel patients", async () => {
    const septic = (await builtinContent()).cases.get("septic-shock-cap")!.def;
    expect(checkClinicalScope({ role: "paramedic" }, "intervene", "intubation", septic, "en").ok).toBe(true);
    expect(checkClinicalScope({ role: "nurse" }, "intervene", "intubation", septic, "en").ok).toBe(false);
    expect(checkClinicalScope({ role: "nurse" }, "intervene", "iv-access", septic, "en").ok).toBe(true);
    expect(checkClinicalScope({ role: "nurse" }, "intervene", "arterial-line", septic, "en").ok).toBe(false);
    expect(checkClinicalScope({ role: "nurse" }, "intervene", "icu-referral", septic, "en").ok).toBe(false);
    expect(checkClinicalScope({ role: "attending" }, "intervene", "arterial-line", septic, "en").ok).toBe(true);
    expect(checkClinicalScope({ role: "nurse" }, "order_test", septic.investigations.find((i) => i.requires.includes("ct"))!.id, septic, "en").ok).toBe(false);
    // porters fetch equipment and wheel patients to a study and back (EMBODIED §8, G8); the front desk only fetches
    expect(SCOPE_OF_PRACTICE.porter.tasks).toEqual(["fetch_equipment", "transport_patient"]);
    expect(SCOPE_OF_PRACTICE.receptionist.tasks).toEqual(["fetch_equipment"]);
    for (const role of ["nurse", "paramedic", "clinician", "attending"] as const) expect(SCOPE_OF_PRACTICE[role].tasks, role).toContain("transport_patient");
    expect(checkTaskScope({ role: "porter" }, "transport_patient", septic, "en").ok).toBe(true);
    expect(checkTaskScope({ role: "receptionist" }, "transport_patient", septic, "en").ok).toBe(false);
    expect(checkTaskScope({ role: "porter" }, "attach_monitor", septic, "zh-CN").ok).toBe(false);
    const zh = checkTaskScope({ role: "porter", name: "王师傅" }, "attach_monitor", septic, "zh-CN");
    expect(!zh.ok && zh.message).toMatch(/王师傅.*执业范围/);
  });

  it("authored scope: nurses do the nursing procedures (CPR, defibrillation, catheters, NG tube, swallow screen…), never the medical ones", async () => {
    const { cases } = await builtinContent();
    const def = (id: string) => cases.get(id)!.def;
    const nursing: [string, string][] = [
      ["stemi-inferior-rv", "cpr"],
      ["stemi-inferior-rv", "defibrillation"],
      ["anaphylaxis-garden", "remove-sting"],
      ["dka-adult", "suspend-pump"],
      ["dka-adult", "urinary-catheter"],
      ["septic-shock-cap", "urinary-catheter"],
      ["acute-appendicitis", "ng-tube"],
      ["acute-ischemic-stroke", "swallow-screen"],
      ["pulmonary-embolism-postop", "ipc"],
      ["pediatric-asthma", "inhaler-teaching"],
    ];
    for (const [caseId, item] of nursing) {
      expect(def(caseId).interventions.find((i) => i.id === item)?.scope, `${caseId} ${item} is authored as nursing`).toBe("nursing");
      for (const role of ["nurse", "paramedic", "clinician"]) expect(checkClinicalScope({ role }, "intervene", item, def(caseId), "en").ok, `${role} ${caseId} ${item}`).toBe(true);
      for (const role of ["porter", "receptionist", "pharmacist", "lab-tech"]) expect(checkClinicalScope({ role }, "intervene", item, def(caseId), "en").ok, `${role} ${caseId} ${item}`).toBe(false);
    }
    // Medical procedures stay with the doctors.
    for (const [caseId, item] of [
      ["septic-shock-cap", "arterial-line"],
      ["pulmonary-embolism-postop", "rescue-reperfusion"],
      ["pulmonary-embolism-postop", "ivc-filter"],
      ["acute-ischemic-stroke", "sich-protocol"],
      ["acute-appendicitis", "lap-appendectomy"],
    ] as const) {
      expect(checkClinicalScope({ role: "nurse" }, "intervene", item, def(caseId), "en").ok, `nurse ${caseId} ${item}`).toBe(false);
      expect(checkClinicalScope({ role: "attending" }, "intervene", item, def(caseId), "en").ok, `attending ${caseId} ${item}`).toBe(true);
    }
    // `scope: "medical"` overrides the kind: a drug only a doctor gives.
    const stemi = def("stemi-inferior-rv");
    const drug = stemi.interventions.find((i) => i.kind === "medication")!;
    const medicalOnly = { ...stemi, interventions: stemi.interventions.map((i) => (i.id === drug.id ? { ...i, scope: "medical" as const } : i)) };
    expect(checkClinicalScope({ role: "nurse" }, "intervene", drug.id, stemi, "en").ok).toBe(true);
    const refused = checkClinicalScope({ role: "nurse", name: "Lin Xiao" }, "intervene", drug.id, medicalOnly, "en");
    expect(refused).toMatchObject({ ok: false, code: "NOT_AUTHORIZED", reason: "intervention" });
    expect(checkClinicalScope({ role: "attending" }, "intervene", drug.id, medicalOnly, "en").ok).toBe(true);
    // The refusal lists what a nurse may do, nursing procedures included.
    expect(!refused.ok && refused.message).toMatch(/nursing procedures/);
  });

  it("a delegated nurse gives the chest compressions and the shock in the STEMI arrest", async () => {
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv" });
    answerAll(t, "approved");
    for (const item of ["cpr", "defibrillation"]) {
      const d = await command(t, "delegate", `nurse give_intervention ${item}`);
      expect((d.data.delegation as { message?: string }).message, `${item}: ${d.text}`).not.toBe("not-authorized");
    }
    await t.session.close();
  });
});

describe("the theatre's work goes by control (EMBODIED §8.3): the control replaces the role for the field and the table's tasks", () => {
  /** A theatre session in the default approval mode whose operative steps ask (each asked approval answered `approved`). */
  async function theatre(start?: { type: "start"; seat: "first-assistant" | "scrub-nurse" }) {
    const t = await theatreSession({ ...(start ? { start } : {}), settingsPatch: { approvalMode: "default", permissions: { ask: ["operate"] } } });
    operatorSteps(t, ACCESS);
    const asked: string[] = [];
    const bodies: (string | null)[] = [];
    t.session.subscribe((e) => {
      if (e.msg.type !== "approval_request") return;
      asked.push(e.msg.summary);
      bodies.push(e.msg.actorId ?? null);
      t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
    });
    return { t, asked, bodies };
  }
  /** The operate (or observe_field) tool's own check, before any approval, for a body. */
  const precheck = (t: TestSession, tool: "operate" | "observe_field", args: Record<string, unknown>, actorId: string) => {
    const s = t.session;
    return s.tool(tool)!.precheck!(args, { caseDef: s.caseDef, facility: s.facility, catalogs: s.catalogs, locale: "en", agent: "clinician", state: () => s.state, actorId } as never);
  };

  it("the anaesthetist is refused traction NOT_AUTHORIZED before a step or an approval; asked of the attendings, the first assistant takes it", async () => {
    const { t, asked, bodies } = await theatre();
    const w = t.session.world()!;
    const before = w.actor(STAFF.anaesthetist)!.pose;
    const refused = await delegate(t, "c1", { role: "staff:anaes-1", task: "hold_traction", params: { port: "B" } });
    expect(refused.delegation).toMatchObject({ status: "failed", message: "not-authorized" });
    expect(refused.delegation.steps).toEqual([expect.objectContaining({ code: "NOT_AUTHORIZED" })]);
    expect(refused.delegation.refusal).toBe(
      "Dr Wang (anaesthetist) cannot be asked to take an instrument in a port and keep its traction: it needs the Traction control, which the anaesthetist does not hold here. In this team the Traction control is held by Dr Abe (first assistant).",
    );
    expect(w.actor(STAFF.anaesthetist)!.pose).toEqual(before);
    expect(asked).toEqual([]);
    // the role word reaches whoever holds traction among the attendings in the room: the first assistant
    const held = await delegate(t, "c2", { role: "attending", task: "hold_traction", params: { port: "B" } });
    expect(held.delegation).toMatchObject({ staffId: STAFF.first, status: "completed", holding: { port: "B", instrument: "grasper" } });
    expect(asked).toEqual([expect.stringMatching(/^Dr Abe \(Attending\): /)]);
    // the approval names the body that would act: his
    expect(bodies).toEqual([STAFF.first]);
    expect(t.session.state.procedure!.ports.find((p) => p.site === "B")!.holder).toBe("doc-1");
    // the learner's own step asks with no other body named
    standAtTable(t, PRIMARY_ACTOR);
    await t.session.run({ type: "clinical_action", action: { type: "operate", op: { op: "insert", port: "B", instrument: "grasper" } } as never });
    expect(bodies.length).toBe(2);
    expect(bodies[1]).toBeNull();
    await t.session.close();
  });

  it("the scrub nurse's body may operate only to pass: her pass is hers; a port, traction or dissection is not; the anaesthetist has no part in the field", async () => {
    const { t } = await theatre();
    standAtTable(t, STAFF.scrub);
    standAtTable(t, STAFF.anaesthetist, -0.6);
    expect(precheck(t, "operate", { op: "pass", instrument: "hook" }, STAFF.scrub)).toBeNull();
    expect(precheck(t, "observe_field", {}, STAFF.scrub)).toBeNull();
    for (const op of [
      { op: "hand-over", port: "B", to: "nurse-2" },
      { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" },
      { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false },
    ]) {
      expect(precheck(t, "operate", op, STAFF.scrub), op.op).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED" } });
    }
    expect(precheck(t, "operate", { op: "pass", instrument: "hook" }, STAFF.anaesthetist)).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED", reason: "control" } });
    expect(precheck(t, "observe_field", {}, STAFF.anaesthetist)).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED", reason: "control" } });
    // speaking up needs no control: anyone at the table may say an injury aloud
    expect((precheck(t, "operate", { op: "recognise", injury: "bleeding" }, STAFF.anaesthetist)?.data as { code?: string } | undefined)?.code).not.toBe("NOT_AUTHORIZED");
    // asked of the nurses, a pass goes to the scrub nurse (the instrument table), never the circulating nurse
    const passed = await delegate(t, "p1", { role: "nurse", task: "pass_instrument", params: { instrument: "hook" } });
    expect(passed.delegation).toMatchObject({ staffId: STAFF.scrub, status: "completed", passed: { instrument: "hook" } });
    expect(t.session.state.procedure!.passed).toEqual([{ instrument: "hook", by: "nurse-2" }]);
    const traction = await delegate(t, "p2", { role: "staff:nurse-2", task: "hold_traction", params: { port: "B" } });
    expect(traction.delegation).toMatchObject({ status: "failed", message: "not-authorized" });
    await t.session.close();
  });

  it("the colleague standing by while the learner holds their place is refused everything theatre — and handed no task at all", async () => {
    const { t, asked } = await theatre({ type: "start", seat: "first-assistant" });
    const s = t.session;
    standAtTable(t, STAFF.first, -0.6);
    const k = kernelOf(t);
    const standing = k.embodied!.staffActor(STAFF.first, "en")!;
    expect(standing).toMatchObject({ role: "attending", controls: [], standingBy: true });
    for (const task of DELEGATION_TASKS) {
      expect(checkTaskScope(standing, task, s.caseDef, "en"), task).toMatchObject({ ok: false, code: "NOT_AUTHORIZED", reason: "standing-by", message: "Dr Abe stands by: you hold the first assistant's place." });
    }
    for (const [task, params] of [
      ["hold_traction", { port: "B" }],
      ["hold_camera", {}],
      ["aim_camera", { region: "hepatocystic-triangle" }],
    ] as const) {
      const d = await delegate(t, `s-${task}`, { role: "staff:doc-1", task, params });
      expect(d.delegation, task).toMatchObject({ status: "failed", message: "not-authorized" });
    }
    expect(precheck(t, "operate", { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" }, STAFF.first)).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED" } });
    expect(precheck(t, "observe_field", {}, STAFF.first)).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED", reason: "standing-by" } });
    // asked of the attendings, traction passes them over
    const held = await delegate(t, "s-role", { role: "attending", task: "hold_traction", params: { port: "B" } });
    expect((held.delegation as { staffId?: string }).staffId).not.toBe(STAFF.first);
    expect(s.staffStates().find((r) => r.actorId === STAFF.first)).toMatchObject({ seat: "first-assistant", controls: [], delegable: [], standingBy: true });
    expect(asked.every((a) => !a.startsWith("Dr Abe"))).toBe(true);
    await s.close();
  });

  it("the learner's body: unscoped without a place; in the scrub nurse's place scoped as a nurse, with her controls", async () => {
    const u = await theatreSession();
    expect(kernelOf(u).embodied!.staffActor(PRIMARY_ACTOR, "en")).toBeNull();
    await u.session.close();
    const t = await theatreSession({ start: { type: "start", seat: "scrub-nurse" } });
    const s = t.session;
    const scrub = kernelOf(t).embodied!.staffActor(PRIMARY_ACTOR, "en")!;
    expect(scrub).toMatchObject({ role: "nurse", position: "scrub-nurse", controls: ["instruments", "count"], standingBy: false });
    expect(checkClinicalScope(scrub, "operate", "pass", s.caseDef, "en").ok).toBe(true);
    expect(checkClinicalScope(scrub, "observe_field", null, s.caseDef, "en").ok).toBe(true);
    expect(checkClinicalScope(scrub, "ask_patient", null, s.caseDef, "en")).toMatchObject({ ok: false, code: "NOT_AUTHORIZED", reason: "tool" });
    expect(checkTaskScope(scrub, "pass_instrument", s.caseDef, "en").ok).toBe(true);
    expect(checkTaskScope(scrub, "hold_traction", s.caseDef, "en")).toMatchObject({ ok: false, reason: "control" });
    // through the gate: asking the patient is a nurse's no more than it was the scrub nurse's — refused before anyone is asked
    const ask = s.tool("ask_patient")!.precheck!({ question: "How are you?" }, { caseDef: s.caseDef, facility: s.facility, catalogs: s.catalogs, locale: "en", agent: "learner", state: () => s.state } as never);
    expect(ask).toMatchObject({ ok: false, data: { code: "NOT_AUTHORIZED", reason: "tool" } });
    await s.close();
  });
});
