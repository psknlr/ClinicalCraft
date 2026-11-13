/**
 * Facts that follow the record (case `branches`, docs/CASE_AUTHORING.md §3.1) and the `phase` of an attempt
 * (`{intervened, phase}`): what is said, found and read depends on what was done, what the learner was told stays what
 * they were told, and a refused attempt at the first visit is not one at the review.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import { checkCaseIntegrity, checkContentStandard, createSession, evaluate, examBranch, historyAnswers, historyBranch, parseCase, reduce, replay, resultBranch, toldFinding, toldHistory, toldResult } from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const fixture = (): Json => JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

/**
 * The mini anaphylaxis case with facts that follow the record: how the breathing is depends on whether adrenaline or
 * oxygen was given; the chest on auscultation and the blood gas report likewise.
 */
function branchedJson(): Json {
  const json = fixture();
  const breathing = json.history.find((h: Json) => h.id === "breathing");
  breathing.branches = [
    { id: "after-adrenaline", when: { intervened: "epi" }, answer: { en: "Easier since the injection.", "zh-CN": "打针以后好多了。" } },
    { id: "on-oxygen", when: { intervened: "oxygen" }, answer: { en: "The mask helps a little.", "zh-CN": "戴上面罩好一点。" } },
  ];
  const chest = json.exam.find((e: Json) => e.id === "chest");
  chest.abnormal = true;
  chest.branches = [{ id: "after-adrenaline", when: { intervened: "epi" }, finding: { en: "Air entry improved; a few scattered wheezes.", "zh-CN": "通气改善，散在少许哮鸣音。" }, abnormal: false }];
  const abg = json.investigations.find((i: Json) => i.id === "abg");
  abg.results.arrival.note = { en: "Taken on arrival.", "zh-CN": "到达时采集。" };
  abg.results.arrival.branches = [{ id: "on-oxygen", when: { intervened: "oxygen" }, text: { en: "On high-flow oxygen: PaO2 above the reference interval.", "zh-CN": "高流量吸氧下：PaO2 高于参考范围。" } }];
  return json;
}

const CASE = load(branchedJson());
const item = (id: string) => CASE.history.find((h) => h.id === id)!;
const finding = (id: string) => CASE.exam.find((e) => e.id === id)!;

function run(actions: ClinicalAction[]): SessionState {
  const r = replay(CASE, [{ type: "start" }, ...actions]);
  expect(r.rejections).toEqual([]);
  return r.state;
}

describe("facts that follow the record", () => {
  it("the fixture with branches is sound", () => {
    expect(checkCaseIntegrity(CASE).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("answers with the item's own text while no branch holds, and records that", () => {
    const s = run([{ type: "ask", itemId: "breathing" }]);
    expect(s.told).toEqual({ "history:breathing": "" });
    expect(toldHistory(CASE, s, item("breathing"))).toEqual({ answer: item("breathing").answer, branch: null });
  });

  it("answers with the first branch that holds, in declaration order", () => {
    const s = run([{ type: "intervene", interventionId: "oxygen" }, { type: "intervene", interventionId: "epi" }, { type: "ask", itemId: "breathing" }]);
    expect(s.told).toEqual({ "history:breathing": "after-adrenaline" });
    expect(toldHistory(CASE, s, item("breathing")).answer).toEqual({ en: "Easier since the injection.", "zh-CN": "打针以后好多了。" });
    const oxygenOnly = run([{ type: "intervene", interventionId: "oxygen" }, { type: "ask", itemId: "breathing" }]);
    expect(toldHistory(CASE, oxygenOnly, item("breathing")).branch).toBe("on-oxygen");
  });

  it("the event names the branch that answered", () => {
    let s = createSession(CASE);
    s = reduce(CASE, s, { type: "start" }).state;
    s = reduce(CASE, s, { type: "intervene", interventionId: "epi" }).state;
    const asked = reduce(CASE, s, { type: "ask", itemId: "breathing" });
    expect(asked.events.find((e) => e.type === "history.asked")).toMatchObject({ itemId: "breathing", branch: "after-adrenaline" });
    const plain = reduce(CASE, s, { type: "ask", itemId: "allergies" });
    expect(plain.events.find((e) => e.type === "history.asked")).not.toHaveProperty("branch");
  });

  it("what the learner was told stays what they were told; asking again hears what is true now", () => {
    const before = run([{ type: "ask", itemId: "breathing" }]);
    const after = reduce(CASE, before, { type: "intervene", interventionId: "epi" }).state;
    // the truth has moved on, the record of what was heard has not
    expect(historyBranch(CASE, after, item("breathing"))).toBe("after-adrenaline");
    expect(toldHistory(CASE, after, item("breathing")).branch).toBeNull();
    const again = reduce(CASE, after, { type: "ask", itemId: "breathing" }).state;
    expect(toldHistory(CASE, again, item("breathing")).branch).toBe("after-adrenaline");
    expect(again.asked.filter((x) => x === "breathing")).toHaveLength(1);
  });

  it("an item not asked yet is previewed as it would be answered now", () => {
    const s = run([{ type: "intervene", interventionId: "oxygen" }]);
    expect(s.told).toBeUndefined();
    expect(toldHistory(CASE, s, item("breathing")).branch).toBe("on-oxygen");
  });

  it("a finding's branch carries its own abnormality", () => {
    const untreated = run([{ type: "examine", findingId: "chest" }]);
    expect(toldFinding(CASE, untreated, finding("chest"))).toMatchObject({ abnormal: true, branch: null });
    const treated = run([{ type: "intervene", interventionId: "epi" }, { type: "examine", findingId: "chest" }]);
    expect(examBranch(CASE, treated, finding("chest"))).toBe("after-adrenaline");
    expect(toldFinding(CASE, treated, finding("chest"))).toMatchObject({ abnormal: false, branch: "after-adrenaline", finding: { en: "Air entry improved; a few scattered wheezes." } });
    expect(treated.told).toEqual({ "exam:chest": "after-adrenaline" });
  });

  it("a result's branch replaces only the fields it gives", () => {
    const s = run([{ type: "intervene", interventionId: "oxygen" }, { type: "order", investigationId: "abg" }, { type: "advance-time", minutes: 30 }, { type: "read", investigationId: "abg" }]);
    expect(resultBranch(CASE, s, "abg", "arrival")).toBe("on-oxygen");
    const told = toldResult(CASE, s, "abg", "arrival")!;
    expect(told.branch).toBe("on-oxygen");
    expect(told.result.text).toEqual({ en: "On high-flow oxygen: PaO2 above the reference interval.", "zh-CN": "高流量吸氧下：PaO2 高于参考范围。" });
    expect(told.result.note).toEqual({ en: "Taken on arrival.", "zh-CN": "到达时采集。" });
    expect(told.result).not.toHaveProperty("branches");
    expect(s.told).toEqual({ "result:abg@arrival": "on-oxygen" });
    expect(toldResult(CASE, s, "abg", "observation")).toBeNull();
  });

  it("facts without branches leave the state as it was (no record of them)", () => {
    const s = run([{ type: "ask", itemId: "allergies" }, { type: "examine", findingId: "airway" }]);
    expect(s).not.toHaveProperty("told");
  });

  it("every text an item can answer with is known to a grounding check", () => {
    expect(historyAnswers(item("breathing"))).toHaveLength(3);
    expect(historyAnswers(item("allergies"))).toHaveLength(1);
  });

  it("the same actions replay to the same record", () => {
    const actions: ClinicalAction[] = [{ type: "start" }, { type: "ask", itemId: "breathing" }, { type: "intervene", interventionId: "epi" }, { type: "ask", itemId: "breathing" }, { type: "examine", findingId: "chest" }];
    expect(replay(CASE, actions).state).toEqual(replay(CASE, actions).state);
  });
});

describe("branches in validation", () => {
  const issuesOf = (edit: (json: Json) => void) => {
    const json = branchedJson();
    edit(json);
    return checkCaseIntegrity(load(json));
  };

  it("reports a duplicate branch id, an unknown id in a branch condition and an unknown figure", () => {
    const issues = issuesOf((json) => {
      const breathing = json.history.find((h: Json) => h.id === "breathing");
      breathing.branches[1].id = "after-adrenaline";
      breathing.branches[0].when = { intervened: "no-such-drug" };
      json.investigations.find((i: Json) => i.id === "abg").results.arrival.branches[0].figures = ["no-such-figure"];
    });
    const paths = issues.filter((i) => i.severity === "error").map((i) => i.path);
    expect(paths).toContain("history.3.branches.1.id");
    expect(paths).toContain("history.3.branches.0.when.intervened");
    expect(paths).toContain("investigations.0.results.arrival.branches.0.figures.0");
  });

  it("warns about a branch that can never answer", () => {
    const issues = issuesOf((json) => {
      json.history.find((h: Json) => h.id === "breathing").branches[0].when = { always: true };
    });
    expect(issues.find((i) => i.path === "history.3.branches.1")).toMatchObject({ severity: "warning" });
  });

  it("a result branch must replace something", () => {
    const json = branchedJson();
    json.investigations.find((i: Json) => i.id === "abg").results.arrival.branches = [{ id: "empty", when: { always: true } }];
    expect(parseCase(json).ok).toBe(false);
  });

  it("a branch needs both languages like any text", () => {
    const json = branchedJson();
    json.history.find((h: Json) => h.id === "breathing").branches[0].answer = { en: "Easier since the injection." };
    const parsed = parseCase(json);
    expect(parsed.ok && parsed.warnings.some((w) => w.path === "history.3.branches.0.answer")).toBe(true);
  });

  it("a branch that says a finding is not recorded is linted like the finding itself", () => {
    const json = branchedJson();
    json.exam.find((e: Json) => e.id === "chest").branches[0].finding = { en: "Not recorded.", "zh-CN": "未记录。" };
    expect(checkContentStandard(load(json)).some((i) => i.path === "exam.2.branches.0.finding")).toBe(true);
  });
});

describe("the phase of an attempt", () => {
  it("counts only attempts made in that phase", () => {
    const first = run([{ type: "intervene", interventionId: "beta-blocker" }]);
    expect(first.interventions[0]).toMatchObject({ phase: "arrival" });
    expect(evaluate(CASE, first, { intervened: "beta-blocker", phase: "arrival" })).toBe(true);
    expect(evaluate(CASE, first, { intervened: "beta-blocker", phase: "observation" })).toBe(false);
    expect(evaluate(CASE, first, { intervened: "beta-blocker", valid: false, phase: "arrival" })).toBe(true);
    expect(evaluate(CASE, first, { intervened: "beta-blocker", valid: true, phase: "arrival" })).toBe(false);
  });

  it("an attempt recorded before attempts carried a phase matches none", () => {
    const s = run([{ type: "intervene", interventionId: "epi" }]);
    const legacy: SessionState = { ...s, interventions: s.interventions.map(({ phase: _phase, ...r }) => r) };
    expect(evaluate(CASE, legacy, { intervened: "epi" })).toBe(true);
    expect(evaluate(CASE, legacy, { intervened: "epi", phase: "arrival" })).toBe(false);
  });

  it("an unknown phase is an integrity error", () => {
    const json = branchedJson();
    json.rubric.push({ id: "late-epi", domain: "management", text: { en: "x", "zh-CN": "x" }, met: { intervened: "epi", phase: "nowhere" } });
    expect(checkCaseIntegrity(load(json)).some((i) => i.severity === "error" && i.path.endsWith("met.phase"))).toBe(true);
  });
});
