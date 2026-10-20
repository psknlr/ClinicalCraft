/**
 * Review round: role authority and scope of practice (R1 S3 = R2 C2 = R3 G2) — the reviewers' reproductions as
 * regression tests. A body may only do what its role may: a porter or a receptionist nothing clinical, a nurse
 * medication/fluid/oxygen/monitoring/positioning and the case's IV access (no airway, arterial line, procedure,
 * consult or disposition), a paramedic also the airway, the lab, pharmacy and imaging staff no patient
 * interventions. Delegations are refused before the staff member takes a step; the spatial gate refuses a clinical
 * act by a body outside its role before anyone is asked; the approval names the staff member who would act.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { answerAll, builtinContent, command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { checkClinicalScope, checkTaskScope, SCOPE_OF_PRACTICE } from "../tools/scope.js";

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

  it("the scope table: a paramedic may manage the airway, a nurse may not; porters only fetch", async () => {
    const septic = (await builtinContent()).cases.get("septic-shock-cap")!.def;
    expect(checkClinicalScope({ role: "paramedic" }, "intervene", "intubation", septic, "en").ok).toBe(true);
    expect(checkClinicalScope({ role: "nurse" }, "intervene", "intubation", septic, "en").ok).toBe(false);
    expect(checkClinicalScope({ role: "nurse" }, "intervene", "iv-access", septic, "en").ok).toBe(true);
    expect(checkClinicalScope({ role: "nurse" }, "intervene", "arterial-line", septic, "en").ok).toBe(false);
    expect(checkClinicalScope({ role: "nurse" }, "intervene", "icu-referral", septic, "en").ok).toBe(false);
    expect(checkClinicalScope({ role: "attending" }, "intervene", "arterial-line", septic, "en").ok).toBe(true);
    expect(checkClinicalScope({ role: "nurse" }, "order_test", septic.investigations.find((i) => i.requires.includes("ct"))!.id, septic, "en").ok).toBe(false);
    expect(SCOPE_OF_PRACTICE.porter.tasks).toEqual(["fetch_equipment"]);
    expect(checkTaskScope({ role: "porter" }, "attach_monitor", septic, "zh-CN").ok).toBe(false);
    const zh = checkTaskScope({ role: "porter", name: "王师傅" }, "attach_monitor", septic, "zh-CN");
    expect(!zh.ok && zh.message).toMatch(/王师傅.*执业范围/);
  });
});
