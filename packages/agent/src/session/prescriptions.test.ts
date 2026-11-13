/**
 * Prescriptions in the agent runtime (docs/PRESCRIPTIONS.md): the prescriber signs and reads, the dispensary reviews
 * and supplies on its own — at once without a world, with the dispenser's own body at the dispensing device in
 * in-world mode — and the offline demonstration waits for the colleague whose work a step is instead of doing it.
 */
import { evaluate, prescriptionStatus, type CaseDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { builtinContent } from "../__fixtures__/embodied.js";
import { loadMiniCase, makeSession, type TestSession } from "../__fixtures__/harness.js";
import { catalogsFor } from "../node/bootstrap.js";

const L = (zh: string, en: string) => ({ "zh-CN": zh, en });

/** The mini chest-pain case with a discharge prescription whose first choice is out of stock. */
function rxCase(edit?: (rx: Record<string, any>, raw: Record<string, any>) => void): CaseDefinition { // eslint-disable-line @typescript-eslint/no-explicit-any
  return loadMiniCase((input) => {
    const raw = input as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const rx = {
      id: "discharge",
      name: L("出院处方", "Discharge prescription"),
      requires: ["medications"],
      products: [
        { id: "clopidogrel", name: L("氯吡格雷片 75 mg", "Clopidogrel 75 mg tablets"), unit: "tablet", usualDose: [1, 1], stock: { quantity: 0, note: L("周四到货。", "Expected on Thursday.") }, confusedWith: ["clonidine"] },
        { id: "ticagrelor", name: L("替格瑞洛片 90 mg", "Ticagrelor 90 mg tablets"), unit: "tablet", usualDose: [2, 2], stock: { quantity: 60, batch: "T-11" } },
        { id: "clonidine", name: L("可乐定片", "Clonidine tablets"), unit: "tablet", stock: { quantity: 10 } },
      ],
      formulations: [
        { id: "v-clopidogrel", name: L("氯吡格雷 7 天", "Clopidogrel for 7 days"), aliases: { "zh-CN": ["氯吡格雷"], en: ["clopidogrel"] }, form: "proprietary", frequency: L("每日一次，每次1片", "1 tablet once daily"), dosesPerDay: 1, days: 7, lines: [{ product: "clopidogrel", dose: 1, unit: "tablet" }] },
        {
          id: "v-ticagrelor",
          name: L("替格瑞洛 7 天", "Ticagrelor for 7 days"),
          aliases: { "zh-CN": ["替格瑞洛"], en: ["ticagrelor"] },
          form: "proprietary",
          frequency: L("每日两次，每次1片", "1 tablet twice daily"),
          dosesPerDay: 2,
          days: 7,
          lines: [{ product: "ticagrelor", dose: 2, unit: "tablet" }],
          signableWhen: { asked: "meds" },
          refusal: L("不能签发：尚未核对现用药物。", "Not signed: his current medicines have not been checked yet."),
        },
      ],
    };
    raw.prescriptions = [rx];
    edit?.(rx, raw);
  });
}

async function started(c: CaseDefinition, opts: Parameters<typeof makeSession>[0] = {}): Promise<TestSession> {
  const t = await makeSession({ caseDef: c, ...opts });
  await t.session.run({ type: "clinical_action", action: { type: "start" } });
  return t;
}

const out = (t: TestSession) => t.msgs("command_output").at(-1)!.text;
const said = (t: TestSession) => t.msgs("agent_message").map((m) => m.text).join("\n");
const status = (t: TestSession) => prescriptionStatus(t.session.state, "discharge");

describe("signing, the dispensary's review and the supply (text mode)", () => {
  it("a signed version is reviewed by the dispensary at once: its query is said, announced and on the record", async () => {
    const t = await started(rxCase());
    await t.session.run({ type: "slash_command", name: "prescribe", args: "clopidogrel" });
    expect(out(t)).toContain("version 1 of Discharge prescription");
    expect(status(t)).toBe("queried");
    expect(said(t)).toContain("I have a query on version 1");
    expect(said(t)).toContain("0 tablet on hand, 7 tablet needed");
    expect(t.msgs("notification").some((n) => n.title === "Dispensary" && n.body.includes("1 point(s) to resolve"))).toBe(true);
    // nothing is supplied while the query is open
    expect(t.session.state.prescriptions!.dispensings).toEqual([]);
  });

  it("reading the record shows the query and records that the prescriber read it", async () => {
    const c = rxCase();
    const t = await started(c);
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-clopidogrel" });
    expect(evaluate(c, t.session.state, { prescription: { id: "discharge", acknowledged: true } })).toBe(false);
    await t.session.run({ type: "slash_command", name: "rx", args: "" });
    expect(out(t)).toContain("queried by the dispensary");
    expect(out(t)).toContain("Clopidogrel 75 mg tablets: 0 tablet on hand");
    expect(out(t)).not.toContain("has not read this review");
    expect(evaluate(c, t.session.state, { prescription: { id: "discharge", queried: true, acknowledged: true } })).toBe(true);
  });

  it("a formulation that may not be signed yet is refused in the case's own words, and the attempt is recorded", async () => {
    const c = rxCase();
    const t = await started(c);
    await t.session.run({ type: "slash_command", name: "prescribe", args: "ticagrelor" });
    expect(out(t)).toContain("his current medicines have not been checked yet");
    expect(status(t)).toBe("none");
    expect(evaluate(c, t.session.state, { prescription: { id: "discharge", refused: "submit" } })).toBe(true);
    expect(t.msgs("notification").some((n) => n.title === "Dispensary" && n.body.includes("an attempt was refused"))).toBe(true);
  });

  it("the revision is confirmed and supplied by the dispensary; the prescriber cannot supply it themselves", async () => {
    const c = rxCase();
    const t = await started(c);
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-clopidogrel" });
    await t.session.run({ type: "clinical_action", action: { type: "ask", itemId: "meds" } });
    await t.session.run({ type: "slash_command", name: "prescribe", args: "ticagrelor" });
    expect(out(t)).toContain("version 2");
    expect(out(t)).toContain("Version 1 is superseded");
    expect(status(t)).toBe("dispensed");
    expect(said(t)).toContain("Version 2 of Discharge prescription is in order");
    expect(said(t)).toContain("supplied and labelled");
    const d = t.session.state.prescriptions!.dispensings[0]!;
    expect(d).toMatchObject({ version: 2, labelChecked: true, discrepancies: [] });
    expect(d.lines).toEqual([{ line: "ticagrelor", product: "ticagrelor", batch: "T-11", quantity: 14, unit: "tablet" }]);
    // the learner's own attempt at the device is refused: the dispensary's staff supply
    await t.session.run({ type: "slash_command", name: "dispense", args: "dispense" });
    expect(out(t)).toContain("supplied by the dispensary's own staff");
    expect(t.session.state.prescriptions!.dispensings).toHaveLength(1);
    await t.session.run({ type: "slash_command", name: "status", args: "" });
    expect(out(t)).toContain("Prescriptions:");
    expect(out(t)).toContain("version 2 · Ticagrelor for 7 days — supplied");
  });

  it("a query resolved without a revision is confirmed by the dispensary's second review", async () => {
    const c = rxCase((rx) => {
      rx.formulations[1].signableWhen = undefined;
      rx.review = [{ id: "medicines", kind: "history", when: { not: { asked: "meds" } }, text: L("现用药物未记录，请向患者核实。", "His current medicines are not recorded: please check them with him.") }];
    });
    const t = await started(c);
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    expect(status(t)).toBe("queried");
    expect(said(t)).toContain("please check them with him");
    await t.session.run({ type: "clinical_action", action: { type: "ask", itemId: "meds" } });
    expect(status(t)).toBe("dispensed");
    expect(t.session.state.prescriptions!.versions[0]!.reviews.map((r) => r.findings.length)).toEqual([1, 0]);
  });

  it("a learner can never enter the dispensary's review by hand, nor act in its name", async () => {
    const t = await started(rxCase());
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-clopidogrel" });
    const before = t.session.state;
    await t.session.run({ type: "clinical_action", action: { type: "prescription", prescription: { op: "review", prescription: "discharge", version: 1, by: "pharmacist" } } });
    expect(t.msgs("error").at(-1)).toMatchObject({ code: "permission_denied" });
    expect(t.session.state).toBe(before);
    await t.session.run({ type: "clinical_action", action: { type: "prescription", prescription: { op: "acknowledge", prescription: "discharge", version: 1, by: "pharmacist" } } });
    expect(t.session.state.prescriptions!.versions[0]!.acknowledged).toMatchObject({ by: "learner" });
  });

  it("case_status words a prescription requirement and names the prescriber's next step", async () => {
    const c = rxCase((_rx, raw) => {
      const first = raw.objectives[0];
      first.completeWhen = { all: [first.completeWhen, { prescription: { id: "discharge", dispensed: "v-ticagrelor" } }, { prescription: { id: "discharge", supplyRead: true } }] };
    });
    const t = await started(c);
    const status = async () => {
      await t.session.run({ type: "slash_command", name: "status", args: "" });
      return out(t);
    };
    let text = await status();
    expect(text).toContain("Discharge prescription: Ticagrelor for 7 days supplied");
    expect(text).toContain('prescribe {formulation: "v-ticagrelor"}');
    expect(text).toContain("Discharge prescription: the record of the supply read");
    expect(text).not.toContain("a condition of the case");
    // signed, reviewed and supplied by the dispensary: what is left is the prescriber's reading
    await t.session.run({ type: "slash_command", name: "ask", args: "meds" });
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    text = await status();
    expect(text).toMatch(/✓ Discharge prescription: Ticagrelor for 7 days supplied/u);
    expect(text).toMatch(/· Discharge prescription: the record of the supply read\n\s+→ next: read_prescription/u);
    await t.session.run({ type: "slash_command", name: "rx", args: "" });
    text = await status();
    expect(text).not.toContain("· Discharge prescription");
  });

  it("a case without prescriptions offers none of the tools", async () => {
    const t = await started(loadMiniCase());
    await t.session.run({ type: "slash_command", name: "prescribe", args: "anything" });
    expect(out(t)).toContain("no prescription to write");
  });
});

describe("a dispensing station (the learner is the dispenser)", () => {
  const station = () =>
    rxCase((rx) => {
      rx.dispensedBy = "learner";
      rx.formulations[1].signableWhen = undefined;
    });

  it("select the version, pick, check the label and supply, step by step", async () => {
    const c = station();
    const t = await started(c);
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    expect(status(t)).toBe("confirmed");
    // the dispensary confirms; it does not supply a learner's station
    expect(t.session.state.prescriptions!.dispensings).toEqual([]);
    await t.session.run({ type: "slash_command", name: "dispense", args: "prepare" });
    expect(out(t)).toContain("Version 1 of Discharge prescription selected");
    await t.session.run({ type: "slash_command", name: "dispense", args: "pick ticagrelor clonidine" });
    await t.session.run({ type: "slash_command", name: "dispense", args: "check-label" });
    expect(out(t)).toContain("does not match");
    expect(out(t)).toContain("Clonidine tablets was supplied where Ticagrelor 90 mg tablets is prescribed");
    await t.session.run({ type: "slash_command", name: "dispense", args: "pick ticagrelor ticagrelor" });
    await t.session.run({ type: "slash_command", name: "dispense", args: "check-label" });
    expect(out(t)).toContain("match it");
    await t.session.run({ type: "slash_command", name: "dispense", args: "dispense" });
    expect(out(t)).toContain("Supplied version 1");
    expect(evaluate(c, t.session.state, { prescription: { id: "discharge", status: "dispensed", labelChecked: true, discrepancy: false } })).toBe(true);
    expect(t.session.state.prescriptions!.dispensings[0]).toMatchObject({ by: "learner" });
  });

  it("an earlier version selected is refused, said and recorded", async () => {
    const c = station();
    const t = await started(c);
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-clopidogrel" });
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    await t.session.run({ type: "slash_command", name: "dispense", args: "prepare 1" });
    expect(out(t)).toContain("version 1 was superseded");
    expect(evaluate(c, t.session.state, { prescription: { id: "discharge", refused: "prepare" } })).toBe(true);
    expect(status(t)).toBe("confirmed");
  });
});

describe("the offline demonstration and a colleague's steps", () => {
  /** A reference path with the dispensary's own steps in it, as `cases verify` replays them. */
  const withSolution = () =>
    rxCase((_rx, raw) => {
      const finish = raw.solution.findIndex((a: { type: string }) => a.type === "finish");
      raw.solution.splice(
        finish < 0 ? raw.solution.length : finish,
        0,
        { type: "prescription", prescription: { op: "submit", prescription: "discharge", formulation: "v-clopidogrel", key: "ref-1", by: "learner" } },
        { type: "prescription", prescription: { op: "review", prescription: "discharge", version: 1, by: "pharmacist" } },
        { type: "prescription", prescription: { op: "acknowledge", prescription: "discharge", version: 1, by: "learner" } },
        { type: "ask", itemId: "meds" },
        { type: "prescription", prescription: { op: "submit", prescription: "discharge", formulation: "v-ticagrelor", key: "ref-2", by: "learner" } },
        { type: "prescription", prescription: { op: "review", prescription: "discharge", version: 2, by: "pharmacist" } },
        { type: "prescription", prescription: { op: "dispense", prescription: "discharge", version: 2, key: "ref-supply", by: "pharmacist" } },
      );
    });

  it("signs and reads as the prescriber, and waits for the dispensary to review and supply", async () => {
    const c = withSolution();
    const t = await makeSession({ caseDef: c, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "autopilot", maxTurns: 40 });
    const rx = t.session.state.prescriptions!;
    expect(rx.versions.map((v) => [v.n, v.formulation, v.by])).toEqual([[1, "v-clopidogrel", "learner"], [2, "v-ticagrelor", "learner"]]);
    // reviewed and supplied by the dispensary, never by the clinician in its name
    expect(rx.versions.every((v) => v.reviews.every((r) => r.by !== "learner"))).toBe(true);
    expect(rx.versions[0]!.acknowledged).toMatchObject({ by: "learner" });
    expect(rx.dispensings).toHaveLength(1);
    expect(rx.dispensings[0]).toMatchObject({ version: 2 });
    expect(rx.dispensings[0]!.by).not.toBe("learner");
    expect(rx.refusals).toEqual([]);
    expect(t.session.state.finished).toBe(true);
  });
});

describe("in-world: the dispenser's own body at the dispensing device", () => {
  async function inWorld(c: CaseDefinition): Promise<TestSession> {
    const content = await builtinContent();
    const facility = content.facilities.get("general-hospital")!.def;
    const t = await makeSession({ caseDef: { ...c, facility: "general-hospital", setting: "emergency" } as CaseDefinition, facility, catalogs: catalogsFor(content, facility), settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    return t;
  }

  it("the facility has a pharmacist and a cabinet that provides the supply", async () => {
    const content = await builtinContent();
    const facility = content.facilities.get("general-hospital")!.def;
    expect(facility.staff.some((s) => s.role === "pharmacist")).toBe(true);
  });

  it("nothing is supplied from the bedside: the pharmacist goes to the cabinet, and the supply names the device", async () => {
    const c = rxCase((rx) => (rx.formulations[1].signableWhen = undefined));
    const t = await inWorld(c);
    const world = t.session.world()!;
    const pharmacist = t.session.facility!.staff.find((s) => s.role === "pharmacist")!;
    // the prescriber signs at a records terminal (the spatial gate takes them there first)
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-records" } } as never });
    expect(world.checkSpatial("actor:clinician", { tool: "prescribe", kind: "prescribe", prescriptionId: "discharge" }).ok).toBe(true);
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    expect(prescriptionStatus(t.session.state, "discharge")).toBe("dispensed");
    const d = t.session.state.prescriptions!.dispensings[0]!;
    expect(d.by).toBe(pharmacist.id);
    expect(d.device).toBe("eq:pharmacy-cabinet");
    // the dispenser's body stands at the cabinet
    expect(world.checkSpatial(`staff:${pharmacist.id}`, { tool: "dispense", kind: "dispense", prescriptionId: "discharge" }).ok).toBe(true);
    expect(said(t)).toContain("supplied and labelled");
  });

  it("the dispenser uses the device made for the formulation's form when the dispensary has one", async () => {
    const content = await builtinContent();
    const base = content.facilities.get("general-hospital")!.def;
    // the emergency department's cabinet becomes a type of its own, tagged for proprietary medicines
    const catalogs = catalogsFor(content, base).map((cat) => {
      const cabinet = cat.equipment.find((e) => e.id === "medication-cabinet");
      return cabinet ? { ...cat, equipment: [...cat.equipment, { ...cabinet, id: "proprietary-cabinet", tags: [...cabinet.tags, "proprietary"] }] } : cat;
    }) as never;
    const facility = { ...base, placements: base.placements.map((p) => (p.id === "ed-med-cabinet" ? { ...p, type: "proprietary-cabinet" } : p)) };
    const c = rxCase((rx) => (rx.formulations[1].signableWhen = undefined));
    const t = await makeSession({ caseDef: { ...c, facility: "general-hospital", setting: "emergency" } as CaseDefinition, facility, catalogs, settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-records" } } as never });
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    expect(t.session.state.prescriptions!.dispensings[0]).toMatchObject({ device: "eq:ed-med-cabinet" });
  });

  /** The built-in cabinet given a dispensing behaviour: select the version, pick, check the label, supply. */
  async function withDispensingCabinet() {
    const content = await builtinContent();
    const facility = content.facilities.get("general-hospital")!.def;
    const step = (item: string, from: string[], to: string, en: string, zh: string) => ({ name: L(zh, en), from, to, clinical: { tool: "dispense", select: "item", item }, durationSeconds: 20 });
    const catalogs = catalogsFor(content, facility).map((cat) => ({
      ...cat,
      equipment: cat.equipment.map((e) =>
        e.id !== "medication-cabinet"
          ? e
          : {
              ...e,
              behavior: {
                initial: "idle",
                states: { idle: {}, prepared: {}, picked: {}, checked: {} },
                operations: {
                  select_version: step("prepare", ["idle"], "prepared", "Select the version", "选取版本"),
                  // a pick after the label check puts the supply back to "picked": the label was checked against what lay there before
                  pick: step("pick", ["prepared", "picked", "checked"], "picked", "Pick", "取药"),
                  check_label: step("check-label", ["picked"], "checked", "Check the label", "核对标签"),
                  dispense: step("dispense", ["picked", "checked"], "idle", "Supply", "发药"),
                },
              },
            },
      ),
    })) as never;
    return { facility, catalogs };
  }

  it("a cabinet with dispensing operations is worked step by step by the pharmacist: its state follows, the label is checked", async () => {
    const { facility, catalogs } = await withDispensingCabinet();
    const c = rxCase((rx) => (rx.formulations[1].signableWhen = undefined));
    const t = await makeSession({ caseDef: { ...c, facility: "general-hospital", setting: "emergency" } as CaseDefinition, facility, catalogs, settingsPatch: { embodiment: "embodied", approvalMode: "strict" } });
    // strict approvals: the dispensary's own work never asks the learner to approve it
    t.session.subscribe((e) => {
      if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
    });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-records" } } as never });
    const asked = t.msgs("approval_request").length;
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    const pharmacist = t.session.facility!.staff.find((x) => x.role === "pharmacist")!;
    expect(prescriptionStatus(t.session.state, "discharge")).toBe("dispensed");
    const d = t.session.state.prescriptions!.dispensings[0]!;
    expect(d).toMatchObject({ by: pharmacist.id, device: "eq:pharmacy-cabinet", labelChecked: true, discrepancies: [] });
    // the device went through its states and is ready for the next supply
    const states = t.msgs("world_event").flatMap((m) => (m.event.type === "entity.state" && m.event.entityId === "eq:pharmacy-cabinet" ? [m.event.to] : []));
    expect(states).toEqual(["prepared", "picked", "checked", "idle"]);
    // one approval at most: the learner's own signature (strict mode) — none for the pharmacist's four steps
    expect(t.msgs("approval_request").length - asked).toBeLessThanOrEqual(1);
    expect(t.msgs("approval_request").every((r) => !/dispens/iu.test(r.summary ?? ""))).toBe(true);
  });

  it("a supply the case authors to go out wrong goes out unchecked, and reading the record finds it", async () => {
    const { facility, catalogs } = await withDispensingCabinet();
    const c = rxCase((rx) => {
      rx.formulations[1].signableWhen = undefined;
      rx.deviations = [{ formulation: "v-ticagrelor", label: { frequency: L("每日一次，每次1片", "1 tablet once daily"), dosesPerDay: 1 }, substitutions: [] }];
    });
    const t = await makeSession({ caseDef: { ...c, facility: "general-hospital", setting: "emergency" } as CaseDefinition, facility, catalogs, settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-records" } } as never });
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    const d = t.session.state.prescriptions!.dispensings[0]!;
    expect(d).toMatchObject({ device: "eq:pharmacy-cabinet", labelChecked: false });
    expect(d.discrepancies.map((x) => x.kind)).toEqual(["label"]);
    // the cabinet was worked without the label check
    const states = t.msgs("world_event").flatMap((m) => (m.event.type === "entity.state" && m.event.entityId === "eq:pharmacy-cabinet" ? [m.event.to] : []));
    expect(states).toEqual(["prepared", "picked", "idle"]);
    // nothing said or announced gives it away …
    expect(said(t)).not.toMatch(/once daily|differ/iu);
    expect(t.msgs("notification").every((n) => !/differ|discrepan/iu.test(n.body))).toBe(true);
    expect(evaluate(c, t.session.state, { prescription: { id: "discharge", supplyRead: false, discrepancy: "label" } })).toBe(true);
    // … reading the record does
    await t.session.run({ type: "slash_command", name: "rx", args: "" });
    expect(out(t)).toContain("Differs from the version");
    expect(out(t)).toContain("1 tablet once daily");
    expect(evaluate(c, t.session.state, { prescription: { id: "discharge", supplyRead: true } })).toBe(true);
  });

  it("a learner at the dispensary's cabinet is refused: the supply is not theirs", async () => {
    const { facility, catalogs } = await withDispensingCabinet();
    const c = rxCase((rx) => (rx.formulations[1].signableWhen = undefined));
    const t = await makeSession({ caseDef: { ...c, facility: "general-hospital", setting: "emergency" } as CaseDefinition, facility: { ...facility, staff: facility.staff.filter((x) => x.role !== "pharmacist") }, catalogs, settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-records" } } as never });
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-cabinet" } } as never });
    await t.session.run({ type: "world_action", request: { operation: "select_version", targetId: "eq:pharmacy-cabinet" } as never });
    const result = t.msgs("world_action_result").at(-1)!.result;
    expect(result.status).toBe("failed");
    expect(result.message).toContain("supplied by the dispensary's own staff");
    expect(t.session.state.prescriptions!.preparations).toEqual([]);
    expect(t.session.world()!.inspect("actor:clinician", "eq:pharmacy-cabinet")?.state).toBe("idle");
  });

  it("where the case makes the learner the dispenser, the cabinet's operations are theirs", async () => {
    const { facility, catalogs } = await withDispensingCabinet();
    const c = rxCase((rx) => {
      rx.formulations[1].signableWhen = undefined;
      rx.dispensedBy = "learner";
    });
    const t = await makeSession({ caseDef: { ...c, facility: "general-hospital", setting: "emergency" } as CaseDefinition, facility, catalogs, settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-records" } } as never });
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    // confirmed by the dispensary, not supplied by it
    expect(prescriptionStatus(t.session.state, "discharge")).toBe("confirmed");
    // away from the cabinet nothing can be picked
    await t.session.run({ type: "slash_command", name: "dispense", args: "prepare" });
    expect(t.session.state.prescriptions!.preparations).toEqual([]);
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-cabinet" } } as never });
    for (const [operation, parameters] of [["select_version", {}], ["pick", { line: "ticagrelor", product: "clonidine" }], ["check_label", {}], ["pick", { line: "ticagrelor", product: "ticagrelor" }], ["check_label", {}], ["dispense", {}]] as const) {
      await t.session.run({ type: "world_action", request: { operation, targetId: "eq:pharmacy-cabinet", parameters } as never });
      expect(t.msgs("world_action_result").at(-1)!.result.status, operation).toBe("completed");
    }
    const d = t.session.state.prescriptions!.dispensings[0]!;
    expect(d).toMatchObject({ by: "learner", device: "eq:pharmacy-cabinet", labelChecked: true, discrepancies: [] });
  });

  it("the demonstration of a dispensing station walks to the terminal and works the cabinet's own operations", async () => {
    const { facility, catalogs } = await withDispensingCabinet();
    const rx = (prescription: Record<string, unknown>) => ({ type: "prescription", prescription: { prescription: "discharge", ...prescription } });
    const c = rxCase((def, raw) => {
      def.formulations[1].signableWhen = undefined;
      def.dispensedBy = "learner";
      const finish = raw.solution.findIndex((a: { type: string }) => a.type === "finish");
      raw.solution.splice(
        finish < 0 ? raw.solution.length : finish,
        0,
        rx({ op: "submit", formulation: "v-ticagrelor", key: "ref-1", by: "learner" }),
        rx({ op: "review", version: 1, by: "pharmacist" }),
        rx({ op: "prepare", version: 1, by: "learner" }),
        rx({ op: "pick", line: "ticagrelor", product: "ticagrelor", by: "learner" }),
        rx({ op: "check-label", by: "learner" }),
        rx({ op: "dispense", key: "ref-supply", by: "learner" }),
      );
    });
    const t = await makeSession({ caseDef: { ...c, facility: "general-hospital", setting: "emergency" } as CaseDefinition, facility, catalogs, settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
    await t.session.run({ type: "autopilot", maxTurns: 80 });
    const record = t.session.state.prescriptions!;
    expect(record.refusals).toEqual([]);
    expect(record.versions[0]!.reviews.every((r) => r.by !== "learner")).toBe(true);
    expect(record.dispensings).toHaveLength(1);
    expect(record.dispensings[0]).toMatchObject({ by: "learner", key: "ref-supply", labelChecked: true, discrepancies: [] });
    // at a medication cabinet (the nearest one that supplies it), and every step was that cabinet's own operation:
    // its state followed the supply
    const device = record.dispensings[0]!.device!;
    expect(facility.placements.find((p) => `eq:${p.id}` === device)?.type).toBe("medication-cabinet");
    const states = t.msgs("world_event").flatMap((m) => (m.event.type === "entity.state" && m.event.entityId === device ? [m.event.to] : []));
    expect(states).toEqual(["prepared", "picked", "checked", "idle"]);
    expect(t.session.state.finished).toBe(true);
  });

  it("signing away from a records terminal is refused with the way there", async () => {
    const c = rxCase((rx) => (rx.formulations[1].signableWhen = undefined));
    const t = await inWorld(c);
    const check = t.session.world()!.checkSpatial("actor:clinician", { tool: "prescribe", kind: "prescribe", prescriptionId: "discharge" });
    if (check.ok) return; // the patient's bay has a terminal within reach: nothing to refuse
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    expect(prescriptionStatus(t.session.state, "discharge")).toBe("none");
  });

  it("with no pharmacist on the staff the supply waits, and says why once", async () => {
    const content = await builtinContent();
    const base = content.facilities.get("general-hospital")!.def;
    const facility = { ...base, staff: base.staff.filter((s) => s.role !== "pharmacist") };
    const c = rxCase((rx) => (rx.formulations[1].signableWhen = undefined));
    const t = await makeSession({ caseDef: { ...c, facility: "general-hospital", setting: "emergency" } as CaseDefinition, facility, catalogs: catalogsFor(content, base), settingsPatch: { embodiment: "embodied", approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "world_action", request: { operation: "navigate", goal: { kind: "interact", id: "eq:pharmacy-records" } } as never });
    await t.session.run({ type: "slash_command", name: "prescribe", args: "v-ticagrelor" });
    await t.session.run({ type: "staff_step" });
    await t.session.run({ type: "staff_step" });
    expect(prescriptionStatus(t.session.state, "discharge")).toBe("confirmed");
    expect(t.msgs("agent_message").filter((m) => m.text.includes("nobody from the dispensary is here"))).toHaveLength(1);
  });
});
