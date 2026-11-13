/**
 * Orders as written (audit 2026-11-12 P0-2, docs/PROTOCOL.md §3.2): the audit's dose replays in the built-in
 * anaphylaxis case — "IM adrenaline 0.5 mg" and "IM adrenaline 5 mg", and the Chinese "肌注肾上腺素 5 mg", with
 * automatic confirmation. A tenfold order is never carried out as the 0.5 mg preset: the nurse reads it back and asks
 * for confirmation, nothing is given, and the dose error stays for the debrief — whose safety outcome does not pass.
 * Equivalent units are given. The order as written, the dose read from it and the dose given are kept apart.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assess, createSession as createCoreSession, parseCase, type CaseDefinition, type DoseSpec, type Requirement } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { makeSession, msgsOf } from "./__fixtures__/harness.js";
import { giveArgs } from "./commands.js";
import { actionFromToolInput, actionToolArgs } from "./session/action-input.js";
import { safetyHeadline, safetyLines } from "./safety.js";
import { resolveIntervention, withoutDoses } from "./tools/clinical-resolve.js";
import { administeredDose, doseQueryReadBack, doseText, orderCheck, orderClause, presetText, writtenOrder, type DoseQuery } from "./tools/dose-order.js";
import { requirementText } from "./tools/requirements.js";

/**
 * The anaphylaxis case's IM adrenaline preset (its `doseSpec`): 0.3–0.5 mg IM — 0.5 mg from an ampoule, the dose its
 * text states, and 0.3 mg from an adult auto-injector, which the item also stands for.
 */
const PRESET: DoseSpec = { amount: 0.3, upTo: 0.5, unit: "mg", route: "IM" };

/** A built-in case, as the content holds it. */
function builtin(id: string): CaseDefinition {
  const parsed = parseCase(JSON.parse(readFileSync(fileURLToPath(new URL(`../../content/cases/${id}/case.json`, import.meta.url)), "utf8")) as unknown);
  if (!parsed.ok) throw new Error(`${id} does not parse`);
  return parsed.value;
}

const ana = builtin("anaphylaxis-garden");

it("the anaphylaxis case prepares IM adrenaline as 0.3–0.5 mg IM (the preset the replays check against)", () => {
  expect(ana.interventions.find((i) => i.id === "adrenaline-im")?.doseSpec).toEqual(PRESET);
});

async function give(locale: "en" | "zh-CN", caseDef: CaseDefinition, order: string) {
  const t = await makeSession({ caseDef, settingsPatch: { locale, approvalMode: "auto" } });
  const events = await t.session.run({ type: "user_message", text: `/give ${order}` });
  const out = msgsOf(events, "command_output").at(-1)!;
  return { t, events, out, state: t.session.state };
}

describe("an order's words: the dose and route read from them (en + zh-CN)", () => {
  it("reads amount, unit and route from the order, the dose argument first", () => {
    expect(writtenOrder({ query: "IM adrenaline 0.5 mg" })).toEqual({ text: "IM adrenaline 0.5 mg", dose: { amount: 0.5, unit: "mg", route: "IM" } });
    expect(writtenOrder({ query: "肌注肾上腺素 5 mg" })).toEqual({ text: "肌注肾上腺素 5 mg", dose: { amount: 5, unit: "mg", route: "IM" } });
    expect(writtenOrder({ query: "adrenaline 500 mcg IM" })?.dose).toEqual({ amount: 500, unit: "microgram", route: "IM" });
    expect(writtenOrder({ query: "adrenaline 500 µg IM" })?.dose).toEqual({ amount: 500, unit: "microgram", route: "IM" });
    expect(writtenOrder({ query: "0.5毫克肾上腺素静推" })?.dose).toEqual({ amount: 0.5, unit: "mg", route: "IV" });
    expect(writtenOrder({ query: "肾上腺素500微克肌注" })?.dose).toEqual({ amount: 500, unit: "microgram", route: "IM" });
    // an id and the dose as written: the words are the dose argument
    expect(writtenOrder({ intervention_id: "adrenaline-im", dose: "5 mg IM" })).toEqual({ text: "5 mg IM", dose: { amount: 5, unit: "mg", route: "IM" } });
    // the dose argument's amount and route win over the query's
    expect(writtenOrder({ query: "IV adrenaline 1 mg", dose: "0.5 mg IM" })?.dose).toEqual({ amount: 0.5, unit: "mg", route: "IM" });
    // words without a dose are still the order as written; an id alone writes none
    expect(writtenOrder({ query: "adrenaline" })).toEqual({ text: "adrenaline" });
    expect(writtenOrder({ intervention_id: "adrenaline-im" })).toBeUndefined();
  });

  it("the words name the item, the dose is read apart: a dose that weakens the match is set aside, one in an item's own name is not", () => {
    expect(withoutDoses("adrenaline 0.5 mg i.m.")).toBe("adrenaline i.m.");
    expect(withoutDoses("Adrenaline 500 µg I.M.")).toBe("Adrenaline I.M.");
    expect(withoutDoses("肾上腺素0.5毫克肌注")).toBe("肾上腺素 肌注");
    expect(withoutDoses("青霉素40万单位肌注")).toBe("青霉素 肌注");
    expect(withoutDoses("insulin 0.1 units/kg/h IV")).toBe("insulin IV");
    // not doses: a ratio, a count, a percentage
    expect(withoutDoses("adrenaline 1:1000 IM")).toBe("adrenaline 1:1000 IM");
    expect(withoutDoses("2 doses of salbutamol")).toBe("2 doses of salbutamol");
    expect(withoutDoses("0.9% sodium chloride")).toBe("0.9% sodium chloride");
    // a dotted route with a dose: the drug and the route name the item (the dose alone made the match too weak)
    expect(resolveIntervention(ana, { query: "adrenaline 0.5 mg i.m." }, "en")).toEqual({ kind: "id", id: "adrenaline-im" });
    expect(resolveIntervention(ana, { query: "Adrenaline 500 µg I.M." }, "en")).toEqual({ kind: "id", id: "adrenaline-im" });
    // a dose never decides between routes
    expect(resolveIntervention(ana, { query: "adrenaline 0.5 mg" }, "en").kind).toBe("ambiguous");
    // items told apart by the dose in their own names resolve as written
    const dka = builtin("dka-adult");
    expect(resolveIntervention(dka, { query: "0.9% sodium chloride 500 mL" }, "en")).toEqual({ kind: "id", id: "nacl-500-bolus" });
    expect(resolveIntervention(dka, { query: "0.9% sodium chloride 1000 mL IV over 1 hour" }, "en")).toEqual({ kind: "id", id: "nacl-1l-1h" });
  });

  it("the dose given is the preset, in data and in the case's words", () => {
    expect(administeredDose(ana, "adrenaline-im", "en")).toEqual({ dose: PRESET, text: expect.stringMatching(/^Adrenaline 0\.5 mg IM/) });
    expect(administeredDose(ana, "call-help", "en")).toEqual({ dose: null, text: null });
  });

  it("/give: an exact id alone, an id then the dose, else the order in words", () => {
    const c = { interventions: [{ id: "adrenaline-im" }] } as unknown as CaseDefinition;
    expect(giveArgs(c, "adrenaline-im")).toEqual({ intervention_id: "adrenaline-im" });
    expect(giveArgs(c, "adrenaline-im 0.5 mg IM")).toEqual({ intervention_id: "adrenaline-im", dose: "0.5 mg IM" });
    expect(giveArgs(c, "IM adrenaline 5 mg")).toEqual({ query: "IM adrenaline 5 mg" });
  });

  it("a dose in the learner's language", () => {
    expect(doseText({ amount: 0.5, unit: "mg", route: "IM" }, "en")).toBe("0.5 mg IM");
    expect(doseText({ amount: 500, unit: "microgram", route: "IM" }, "en")).toBe("500 micrograms IM");
    expect(doseText({ amount: 0.1, unit: "unit/kg/h" }, "en")).toBe("0.1 units/kg/h");
    expect(doseText({ amount: 10, upTo: 20, unit: "mg", route: "IV" }, "en")).toBe("10–20 mg IV");
    expect(doseText({ amount: 0.5, unit: "mg", route: "IM" }, "zh-CN")).toBe("0.5 mg 肌注");
    expect(doseText({ amount: 500, unit: "microgram", route: "IM" }, "zh-CN")).toBe("500 微克 肌注");
  });
});

describe("audit replays: /give in the anaphylaxis case with automatic confirmation (P0-2)", () => {
  it("“IM adrenaline 0.5 mg” is given and keeps the order as written apart from the dose given", async () => {
    const { out, state } = await give("en", ana, "IM adrenaline 0.5 mg");
    expect(out.text).toMatch(/^Given: Intramuscular adrenaline/);
    expect(out.text).toContain("Dose checked: 0.5 mg IM as ordered is the preset dose (0.3–0.5 mg IM).");
    expect(state.interventions).toHaveLength(1);
    expect(state.interventions[0]).toMatchObject({ interventionId: "adrenaline-im", ordered: { text: "IM adrenaline 0.5 mg", dose: { amount: 0.5, unit: "mg", route: "IM" } } });
    expect(state.doseErrors ?? []).toEqual([]);
    // the tool's data: what was written and read, and what was given (the preset)
    const data = (out.data as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ ordered: { text: "IM adrenaline 0.5 mg", dose: { amount: 0.5, unit: "mg", route: "IM" } }, administered: { dose: PRESET, text: expect.stringMatching(/^Adrenaline 0\.5 mg IM/) } });
    expect(assess(ana, state).safety).toMatchObject({ passed: true, criticalFailures: [], doseErrors: [] });
  });

  it("“IM adrenaline 5 mg” never executes the 0.5 mg preset: the nurse reads it back, nothing is given, the dose error stays", async () => {
    const { out, events, state } = await give("en", ana, "IM adrenaline 5 mg");
    expect(out.text).toBe(
      "Nurse: “Before I give intramuscular adrenaline, let me read it back: you ordered 5 mg IM; the dose for this is 0.3–0.5 mg IM. Can you confirm the dose?”\n" +
        "Not given: the dose ordered differs from the preset dose (10 times the top of the preset range). Order it again with the dose you mean.",
    );
    expect(out.text).not.toMatch(/^Given/m);
    expect(state.interventions).toEqual([]);
    expect(state.doseErrors).toEqual([
      expect.objectContaining({ interventionId: "adrenaline-im", text: "IM adrenaline 5 mg", ordered: { amount: 5, unit: "mg", route: "IM" }, preset: PRESET, ratio: 10, conflicts: ["amount"], severity: "critical" }),
    ]);
    const clinical = msgsOf(events, "clinical_event").map((m) => m.event.type);
    expect(clinical).toContain("dose.error");
    expect(clinical).not.toContain("intervention.applied");
    // the debrief: safety not passed, the dose error named — whatever the score
    const report = assess(ana, state);
    expect(report.safety.passed).toBe(false);
    expect(safetyLines(ana, report, "en")).toEqual([
      "Safety: not passed — critical dose errors: 1",
      "⚠ Critical dose error: Intramuscular adrenaline — as ordered “IM adrenaline 5 mg”, read as 5 mg IM; preset dose 0.3–0.5 mg IM — 10 times the top of the preset range; not given (minute 0)",
    ]);
  });

  it("“肌注肾上腺素 5 mg” is read back in Chinese and not given", async () => {
    const { out, state } = await give("zh-CN", ana, "肌注肾上腺素 5 mg");
    expect(out.text).toBe(
      "护士：“给肾上腺素肌内注射之前我复述一下：您开的是 5 mg 肌注，这个药的剂量是 0.3–0.5 mg 肌注。请您确认剂量。”\n" +
        "未给药：医嘱剂量与预设剂量不符（为预设剂量上限的 10 倍）。请写明您要给的剂量，重新下医嘱。",
    );
    expect(state.interventions).toEqual([]);
    expect(state.doseErrors?.[0]).toMatchObject({ text: "肌注肾上腺素 5 mg", ordered: { amount: 5, unit: "mg", route: "IM" }, ratio: 10, severity: "critical" });
    expect(safetyHeadline(assess(ana, state).safety, "zh-CN")).toBe("安全性：未通过——严重剂量错误 1 次");
  });

  it("equivalent units are recognised and given (500 micrograms, 500 mcg, 500 µg, 0.5毫克, 500微克)", async () => {
    for (const [locale, order] of [
      ["en", "IM adrenaline 500 micrograms"],
      ["en", "adrenaline 500 mcg IM"],
      ["en", "adrenaline 500 µg IM"],
      ["zh-CN", "肌注肾上腺素0.5毫克"],
      ["zh-CN", "肾上腺素500微克肌注"],
    ] as const) {
      const { state, out } = await give(locale, ana, order);
      expect(state.interventions.map((r) => r.interventionId), order).toEqual(["adrenaline-im"]);
      expect(state.interventions[0]!.ordered?.text, order).toBe(order);
      expect(state.doseErrors ?? [], order).toEqual([]);
      expect(out.text, order).toMatch(locale === "en" ? /Dose checked: / : /剂量已核对：/);
    }
  });

  it("an order whose words resolve only without their dose (“adrenaline 5 mg i.m.”) still has its dose checked", async () => {
    const wrong = await give("en", ana, "adrenaline 5 mg i.m.");
    expect(wrong.state.interventions).toEqual([]);
    expect(wrong.state.doseErrors?.[0]).toMatchObject({ interventionId: "adrenaline-im", text: "adrenaline 5 mg i.m.", ordered: { amount: 5, unit: "mg", route: "IM" }, ratio: 10 });
    const right = await give("en", ana, "adrenaline 0.5 mg i.m.");
    expect(right.state.interventions.map((r) => r.interventionId)).toEqual(["adrenaline-im"]);
    expect(right.out.text).toContain("Dose checked: 0.5 mg IM as ordered is the preset dose (0.3–0.5 mg IM).");
  });

  it("a route that differs is read back too; an order without a dose gives the preset", async () => {
    const iv = await give("en", ana, "adrenaline-im 0.5 mg IV");
    expect(iv.state.interventions).toEqual([]);
    expect(iv.out.text).toContain("the dose for this is 0.3–0.5 mg IM");
    expect(iv.out.text).toContain("route IV, preset IM");
    const plain = await give("en", ana, "adrenaline-im");
    expect(plain.state.interventions.map((r) => r.interventionId)).toEqual(["adrenaline-im"]);
    expect(plain.state.interventions[0]!.ordered).toBeUndefined();
  });

  it("/debrief and /assess show the safety outcome beside the score, a complete case at full score included", async () => {
    const t = await makeSession({ caseDef: ana, settingsPatch: { locale: "en", approvalMode: "bypass" } });
    await t.session.run({ type: "user_message", text: "/give IM adrenaline 5 mg" });
    // then the reference path: every objective done — the dose error still fails the safety outcome
    for (const action of ana.solution) if (action.type !== "start") await t.session.run({ type: "clinical_action", action });
    expect(t.session.state.finished).toBe(true);
    const debrief = msgsOf(await t.session.run({ type: "user_message", text: "/debrief" }), "command_output").at(-1)!;
    expect(debrief.text).toContain("Safety: not passed — critical dose errors: 1");
    expect(debrief.text).toContain("⚠ Critical dose error: Intramuscular adrenaline — as ordered “IM adrenaline 5 mg”");
    expect((debrief.data as { safety: { passed: boolean } }).safety.passed).toBe(false);
    const assessed = msgsOf(await t.session.run({ type: "assess" }), "assessment").at(-1)!;
    expect(assessed.report.score.percent).toBe(100);
    expect(assessed.report.safety.passed).toBe(false);
    expect(assessed.narrative).toContain("Safety: not passed — critical dose errors: 1.");
  });
});

describe("a learner's clinical action carries the order through hooks and the gate", () => {
  it("kept as written while the input is unchanged; read again from rewritten words", () => {
    const action = { type: "intervene" as const, interventionId: "adrenaline-im", ordered: { text: "IM adrenaline 5 mg", dose: { amount: 5, unit: "mg" as const, route: "IM" as const } } };
    const args = actionToolArgs(ana, action, "en");
    expect(args).toEqual({ intervention_id: "adrenaline-im", query: "IM adrenaline 5 mg" });
    expect(actionFromToolInput(ana, action, args, "en")).toEqual({ ok: true, action });
    const rewritten = actionFromToolInput(ana, action, { intervention_id: "adrenaline-im", query: "IM adrenaline 0.5 mg" }, "en");
    expect(rewritten).toEqual({ ok: true, action: { type: "intervene", interventionId: "adrenaline-im", ordered: { text: "IM adrenaline 0.5 mg", dose: { amount: 0.5, unit: "mg", route: "IM" } } } });
  });

  it("a direct clinical action with a tenfold dose: the nurse reads it back, nothing is given", async () => {
    const t = await makeSession({ caseDef: ana, settingsPatch: { approvalMode: "auto" } });
    const events = await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "adrenaline-im", ordered: { text: "adrenaline 5 mg IM", dose: { amount: 5, unit: "mg", route: "IM" } } } });
    const nurse = msgsOf(events, "agent_message").find((m) => m.agent === "nurse");
    expect(nurse?.text).toBe("Before I give intramuscular adrenaline, let me read it back: you ordered 5 mg IM; the dose for this is 0.3–0.5 mg IM. Can you confirm the dose?");
    expect(t.session.state.interventions).toEqual([]);
    expect(t.session.state.doseErrors).toHaveLength(1);
  });
});

describe("a verbal order to a colleague in the world (embodied)", () => {
  it("a tenfold dose is read back in the nurse's own voice and nothing is given; the dose prepared is given", async () => {
    const { builtinContent, makeEmbodiedSession } = await import("./__fixtures__/embodied.js");
    const c = (await builtinContent()).cases.get("stemi-inferior-rv")!.def;
    expect(c.interventions.find((i) => i.id === "aspirin")?.doseSpec).toEqual({ amount: 150, upTo: 325, unit: "mg", route: "PO" });
    const t = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", caseDef: c, settingsPatch: { approvalMode: "bypass" } });
    const wrong = await t.session.run({ type: "user_message", text: "Give aspirin 300 g", to: "nurse", staff: "ed-nurse" });
    const said = msgsOf(wrong, "agent_message").filter((m) => m.staffId === "ed-nurse").map((m) => m.text);
    expect(said.at(-1)).toMatch(/^Before I give .*let me read it back: you ordered 300 g; the dose for this is 150–325 mg PO\. Can you confirm the dose\?$/);
    expect(t.session.state.interventions.some((r) => r.interventionId === "aspirin")).toBe(false);
    expect(t.session.state.doseErrors?.[0]).toMatchObject({ interventionId: "aspirin", text: "Give aspirin 300 g", severity: "critical" });
    expect(t.session.state.doseErrors?.[0]?.ratio).toBeGreaterThan(900);
    await t.session.run({ type: "user_message", text: "Give aspirin 300 mg", to: "nurse", staff: "ed-nurse" });
    expect(t.session.state.interventions.find((r) => r.interventionId === "aspirin")?.ordered).toMatchObject({ text: "Give aspirin 300 mg", dose: { amount: 300, unit: "mg" } });
    await t.session.close();
    // in Chinese: the read-back in the nurse's words, nothing given
    const zh = await makeEmbodiedSession({ caseId: "stemi-inferior-rv", caseDef: c, settingsPatch: { approvalMode: "bypass", locale: "zh-CN" } });
    const out = await zh.session.run({ type: "user_message", text: "给他用阿司匹林3000 mg", to: "nurse", staff: "ed-nurse" });
    expect(msgsOf(out, "agent_message").filter((m) => m.staffId === "ed-nurse").at(-1)?.text).toMatch(/^给.+之前我复述一下：您开的是 3000 mg，这个药的剂量是 150–325 mg 口服。请您确认剂量。$/);
    expect(zh.session.state.interventions.some((r) => r.interventionId === "aspirin")).toBe(false);
    await zh.session.close();
  });
});

/* ------------------------------------------------------------------ */
/* The independent review's replays (audit 2026-11-12, P0-2)           */
/* ------------------------------------------------------------------ */

describe("review replays: a dose in words or Chinese numerals, a volume, an unclear dose (/give, anaphylaxis)", () => {
  it("a tenfold dose in Chinese numerals, in English words or with 个 is never given as the preset: a critical dose error", async () => {
    for (const [locale, order] of [
      ["zh-CN", "肌注肾上腺素五毫克"],
      ["en", "IM adrenaline five milligrams"],
      ["zh-CN", "肌注肾上腺素5个毫克"],
    ] as const) {
      const { state } = await give(locale, ana, order);
      expect(state.interventions, order).toEqual([]);
      expect(state.doseErrors, order).toEqual([expect.objectContaining({ text: order, ordered: { amount: 5, unit: "mg", route: "IM" }, ratio: 10, severity: "critical" })]);
      expect(assess(ana, state).safety.passed, order).toBe(false);
    }
  });

  it("a volume with its strength is the dose it holds, and the adult auto-injector's 0.3 mg is within the preset: given", async () => {
    for (const [locale, order] of [
      ["en", "IM adrenaline 0.5 mL of 1 mg/mL"],
      ["en", "IM adrenaline 1:1000 0.5 mL"],
      ["zh-CN", "肌注1:1000肾上腺素0.5ml"],
      ["en", "EpiPen 0.3 mg IM"],
    ] as const) {
      const { state } = await give(locale, ana, order);
      expect(state.interventions.map((r) => r.interventionId), order).toEqual(["adrenaline-im"]);
      expect(state.doseErrors ?? [], order).toEqual([]);
    }
  });

  it("a dose the nurse cannot read or check is asked about: nothing given, no dose error, safety untouched", async () => {
    const unclear = await give("zh-CN", ana, "肌注肾上腺素0。5mg");
    expect(unclear.out.text).toBe("护士：“给肾上腺素肌内注射之前我需要把剂量确认清楚：“0。5mg”这个剂量我看不清楚。这个药的剂量是 0.3–0.5 mg 肌注。请用数字加单位告诉我剂量。”\n未给药：医嘱剂量不明确。请用数字加单位写明剂量，重新下医嘱。");
    expect(unclear.state.interventions).toEqual([]);
    expect(unclear.state.doseErrors ?? []).toEqual([]);
    expect(assess(ana, unclear.state).safety).toMatchObject({ passed: true, doseErrors: [] });
    expect((unclear.out.data as { data: { doseQuery: unknown } }).data.doseQuery).toMatchObject({ interventionId: "adrenaline-im", reason: "unreadable", words: "0。5mg", preset: PRESET });
    // a volume without its strength: the nurse needs the strength
    const volume = await give("en", ana, "IM adrenaline 0.3 mL");
    expect(volume.out.text).toContain("I need the dose clearly: you ordered 0.3 mL IM, and without the strength I can't tell how much drug that is.");
    expect(volume.state.interventions).toEqual([]);
    expect(volume.state.doseErrors ?? []).toEqual([]);
  });
});

describe("review replays: free-text orders against the real presets", () => {
  const check = (id: string, interventionId: string, text: string) => orderCheck(builtin(id), interventionId, { text });

  it("stroke (80 kg): the label's weight band and an alteplase order in parts are given; a volume without its strength is asked about", () => {
    expect(check("acute-ischemic-stroke", "tenecteplase", "IV tenecteplase 22.5 mg bolus")).toMatchObject({ outcome: "given" });
    expect(check("acute-ischemic-stroke", "tenecteplase", "替奈普酶 22.5 mg 静推")).toMatchObject({ outcome: "given" });
    expect(check("acute-ischemic-stroke", "alteplase", "IV alteplase 7.2 mg bolus then 64.8 mg over 60 min")).toMatchObject({ outcome: "given", dose: { amount: 72, unit: "mg" } });
    expect(check("acute-ischemic-stroke", "alteplase", "阿替普酶 7.2 mg 静推，余 64.8 mg 60分钟泵入")).toMatchObject({ outcome: "given", dose: { amount: 72, unit: "mg" } });
    expect(check("acute-ischemic-stroke", "tenecteplase", "tenecteplase 4 mL")).toMatchObject({ outcome: "query", reason: "strength" });
    // the ≥ 90 kg dose: a dose error to review; twice the dose of a thrombolytic: critical
    expect(check("acute-ischemic-stroke", "tenecteplase", "IV tenecteplase 25 mg")).toMatchObject({ outcome: "conflict", severity: "warning" });
    expect(check("acute-ischemic-stroke", "tenecteplase", "IV tenecteplase 50 mg")).toMatchObject({ outcome: "conflict", severity: "critical" });
  });

  it("DKA (55 kg) and PE (70 kg): a tenfold insulin rate or heparin bolus is a critical dose error; a pump order is read as its rate", () => {
    expect(check("dka-adult", "friii", "IV insulin fixed rate 1 unit/kg/h")).toMatchObject({ outcome: "conflict", ratio: 10, severity: "critical" });
    expect(check("dka-adult", "friii", "IV insulin infusion 55 units/h")).toMatchObject({ outcome: "conflict", ratio: 10, severity: "critical" });
    expect(check("dka-adult", "friii", "insulin 50 units in 50 mL at 5.5 mL/h")).toMatchObject({ outcome: "given", dose: { amount: 5.5, unit: "unit/h" } });
    expect(check("dka-adult", "friii", "胰岛素 50U+NS 50ml 5.5ml/h 泵入")).toMatchObject({ outcome: "given", dose: { amount: 5.5, unit: "unit/h" } });
    expect(check("dka-adult", "kcl-replacement", "0.9% NaCl 1000 mL with KCl 40 mmol at 500 mL/h")).toMatchObject({ outcome: "given", dose: { amount: 20, unit: "mmol/h" } });
    expect(check("pulmonary-embolism-postop", "ufh", "IV heparin 80000 units bolus")).toMatchObject({ outcome: "conflict", severity: "critical" });
    expect(check("pulmonary-embolism-postop", "ufh", "IV heparin 5000 units bolus")).toMatchObject({ outcome: "given" });
    expect(check("pulmonary-embolism-postop", "lmwh-treatment", "enoxaparin 1.5 mg/kg SC once daily")).toMatchObject({ outcome: "given" });
  });

  it("guideline-concordant doses are within the presets: aspirin 150–325 mg, ceftriaxone 1 g, magnesium 50 mg/kg or 1 g", () => {
    for (const text of ["aspirin 150 mg", "阿司匹林 150 mg 嚼服", "aspirin 162 mg", "aspirin 325 mg chewed"]) expect(check("stemi-inferior-rv", "aspirin", text), text).toMatchObject({ outcome: "given" });
    for (const text of ["ceftriaxone 1 g IV", "头孢曲松 1 g 静滴"]) expect(check("septic-shock-cap", "abx-ceftriaxone", text), text).toMatchObject({ outcome: "given" });
    for (const text of ["magnesium sulfate 50 mg/kg IV", "magnesium sulfate 1 g IV"]) expect(check("pediatric-asthma", "magnesium-iv", text), text).toMatchObject({ outcome: "given" });
    // cmcr-70044's item name, typed as the order, is its preset
    expect(check("cmcr-70044", "adrenaline-im", "IM adrenaline 300 micrograms (0.3 mL of 1 mg/mL)")).toMatchObject({ outcome: "given" });
    expect(check("cmcr-70044", "adrenaline-im", "肌注肾上腺素0.3毫升")).toMatchObject({ outcome: "query", reason: "strength" });
  });

  it("the nurse says the patient's own dose for a per-kg preset, and asks plainly about a rate ordered for a single dose", () => {
    const stroke = builtin("acute-ischemic-stroke");
    const tnk = stroke.interventions.find((i) => i.id === "tenecteplase")!;
    expect(presetText(stroke, tnk.doseSpec!, "en")).toBe("0.25–0.28 mg/kg IV (20–22.4 mg)");
    expect(presetText(stroke, tnk.doseSpec!, "zh-CN")).toBe("0.25–0.28 mg/kg 静脉（20–22.4 mg）");
    const pe = builtin("pulmonary-embolism-postop");
    const q = orderCheck(pe, "ufh", { text: "heparin infusion 18 units/kg/h" });
    expect(q).toMatchObject({ outcome: "query", reason: "rate" });
    expect(doseQueryReadBack(pe, "ufh", q as DoseQuery, "en")).toBe(
      "Before I give unfractionated heparin IV infusion (weight-based), I need the dose clearly: you ordered 18 units/kg/h, a rate, and this order is for a single dose. The dose for this is 70–80 units/kg IV (4900–5600 units). Can you give me the dose as a number with its unit?",
    );
  });
});

describe("a spoken request that orders several items: each item's dose is its own clause (review)", () => {
  const sepsis = builtin("septic-shock-cap");

  it("reads the clause that names the item; a request of several orders and none for this item is refused", () => {
    const request = "Give paracetamol 1 g now, then ceftriaxone 2 g IV";
    expect(orderClause(sepsis, request, "abx-ceftriaxone", "en")).toBe("ceftriaxone 2 g IV");
    expect(orderClause(sepsis, request, "paracetamol", "en")).toBe("Give paracetamol 1 g now");
    expect(orderClause(sepsis, "给他扑热息痛 1 g，然后头孢曲松 2 g 静滴", "abx-ceftriaxone", "zh-CN")).toBe("头孢曲松 2 g 静滴");
    // one order with its dose in a later clause stays one order
    expect(orderClause(sepsis, "give ceftriaxone IV, 2 g", "abx-ceftriaxone", "en")).toBe("give ceftriaxone IV, 2 g");
    // several orders, none for this item alone: whose dose is whose is not known
    expect(orderClause(sepsis, request, "abx-azithromycin", "en")).toBeNull();
  });
});

describe("what still opens a step, in words: time since the last dose (review)", () => {
  it("names the interval and the intervention, in both languages", () => {
    const leaf = (gte?: number, lte?: number): Requirement => ({ kind: "leaf", met: false, cond: { elapsedSince: { intervened: "adrenaline-im", ...(gte != null ? { gte } : {}), ...(lte != null ? { lte } : {}) } } });
    const s = createCoreSession(ana);
    const en = requirementText(ana, s, leaf(5), "en", new Set());
    expect(en).toMatch(/^at least 5 min after the last Intramuscular adrenaline/);
    expect(requirementText(ana, s, leaf(undefined, 10), "en", new Set())).toMatch(/^at most 10 min after the last /);
    expect(requirementText(ana, s, leaf(5, 10), "en", new Set())).toMatch(/^5–10 min after the last /);
    expect(requirementText(ana, s, leaf(5), "zh-CN", new Set())).toMatch(/^距上次肾上腺素肌内注射.*至少5分钟$/);
    expect(en).not.toContain("elapsedSince");
  });
});
