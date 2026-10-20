/**
 * History phase twins (`history[].supersedes`) and order-warning `unless`
 * conditions (docs/ARCHITECTURE.md §2–3, docs/CASE_AUTHORING.md §3/§5).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import {
  assess,
  checkCaseIntegrity,
  createSession,
  creditedHistory,
  evaluate,
  historyAvailable,
  historyCredited,
  historyTwin,
  matchHistory,
  orderWarnings,
  parseCase,
  reduce,
  replay,
  supersededIn,
  supersededItems,
  verifyCase,
} from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const fixture = (): Json => JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

/**
 * The mini anaphylaxis case with a phase twin: "breathing" (arrival only,
 * required) is superseded in "observation" by "breathing-now".
 */
function twinJson(): Json {
  const json = fixture();
  const breathing = json.history.find((h: Json) => h.id === "breathing");
  breathing.phases = ["arrival"];
  breathing.required = true;
  json.history.push({
    id: "breathing-now",
    topic: "associated-symptoms",
    question: { en: "How is your breathing now?", "zh-CN": "现在呼吸怎么样？" },
    answer: { en: "Much easier now.", "zh-CN": "现在好多了。" },
    keywords: { en: ["breathing now"], "zh-CN": ["现在呼吸"] },
    phases: ["observation"],
    supersedes: ["breathing"],
  });
  return json;
}

const TWIN = load(twinJson());

function run(c: CaseDefinition, actions: ClinicalAction[]): SessionState {
  const r = replay(c, actions);
  expect(r.rejections).toEqual([]);
  return r.state;
}

/** Start → adrenaline → oxygen: the "stabilise" objective moves the case to "observation". */
const TO_OBSERVATION: ClinicalAction[] = [
  { type: "start" },
  { type: "intervene", interventionId: "epi" },
  { type: "intervene", interventionId: "oxygen" },
];

describe("history[].supersedes — schema", () => {
  it("parses as an optional id list (absent by default)", () => {
    expect(TWIN.history.find((h) => h.id === "breathing-now")?.supersedes).toEqual(["breathing"]);
    expect(TWIN.history.find((h) => h.id === "breathing")?.supersedes).toBeUndefined();
    const bad = twinJson();
    bad.history.at(-1).supersedes = ["Not An Id"];
    expect(parseCase(bad).ok).toBe(false);
  });
});

describe("phase twins — selection", () => {
  it("routes a hit on the superseded item to its twin where the twin is available", () => {
    expect(supersededIn(TWIN, "breathing", "observation")).toBe("breathing-now");
    expect(supersededIn(TWIN, "breathing", "arrival")).toBeNull();
    expect(historyTwin(TWIN, "breathing", "observation")).toBe("breathing-now");
    expect(historyTwin(TWIN, "breathing", "arrival")).toBe("breathing");
    expect(historyTwin(TWIN, "breathing-now", "arrival")).toBeNull();
    expect(historyTwin(TWIN, "ghost", "arrival")).toBeNull();

    const q = "Are you short of breath?";
    expect(matchHistory(TWIN, q, "en", { phase: "arrival" })[0]).toEqual({ id: "breathing", score: 1 });
    // In observation the scene-time answer is never selected: its question selects the twin (with its score).
    const later = matchHistory(TWIN, q, "en", { phase: "observation" });
    expect(later.map((h) => h.id)).toEqual(["breathing-now"]);
    expect(later[0]!.score).toBe(1);
    // Without a phase nothing is routed (raw matcher, all phases).
    expect(matchHistory(TWIN, q, "en").map((h) => h.id)).toContain("breathing");
  });

  it("drops the superseded item when both are listed for the phase (no contradictory co-selection)", () => {
    const json = twinJson();
    json.history.find((h: Json) => h.id === "breathing").phases = ["arrival", "observation"];
    const c = load(json);
    expect(historyAvailable(c, "breathing", "arrival")).toBe(true);
    expect(historyAvailable(c, "breathing", "observation")).toBe(false);
    expect(historyAvailable(c, "breathing-now", "observation")).toBe(true);
    const hits = matchHistory(c, "is your breathing now ok", "en", { phase: "observation" });
    expect(hits.map((h) => h.id)).toEqual(["breathing-now"]);
    // The engine refuses to ask the superseded item there, naming the twin.
    const s = run(c, TO_OBSERVATION);
    expect(s.phase).toBe("observation");
    const r = reduce(c, s, { type: "ask", itemId: "breathing" });
    expect(r.rejected?.code).toBe("phase-locked");
    expect(r.rejected?.message).toContain("breathing-now");
    expect(reduce(c, s, { type: "ask", itemId: "breathing-now" }).rejected).toBeFalsy();
  });

  it("follows chains transitively and stops on cycles", () => {
    const json = twinJson();
    json.phases.push({ id: "discharge", label: { en: "Discharge", "zh-CN": "出院" } });
    json.history.find((h: Json) => h.id === "breathing-now").phases = ["observation", "discharge"];
    json.history.push({ id: "breathing-home", topic: "associated-symptoms", question: { en: "Breathing at home?", "zh-CN": "在家呼吸？" }, answer: { en: "Fine.", "zh-CN": "好。" }, phases: ["discharge"], supersedes: ["breathing-now"] });
    const c = load(json);
    expect(historyTwin(c, "breathing", "discharge")).toBe("breathing-home");
    expect(supersededItems(c, "breathing-home").sort()).toEqual(["breathing", "breathing-now"]);
    const s: SessionState = { ...createSession(c), asked: ["breathing-home"] };
    expect(historyCredited(c, s, "breathing")).toBe(true);
    expect(historyCredited(c, s, "breathing-now")).toBe(true);

    // review round 3: the chain is followed through an intermediate twin that is not available in the phase
    const gap = twinJson();
    gap.phases.push({ id: "discharge", label: { en: "Discharge", "zh-CN": "出院" } });
    gap.history.push({ id: "breathing-home", topic: "associated-symptoms", question: { en: "Breathing at home?", "zh-CN": "在家呼吸？" }, answer: { en: "Fine.", "zh-CN": "好。" }, phases: ["discharge"], supersedes: ["breathing-now"] });
    const g = load(gap); // breathing [arrival] ← breathing-now [observation] ← breathing-home [discharge]
    expect(supersededIn(g, "breathing", "discharge")).toBe("breathing-home");
    expect(historyTwin(g, "breathing", "discharge")).toBe("breathing-home");
    const hits = matchHistory(g, "Are you short of breath?", "en", { phase: "discharge" });
    expect(hits[0]).toMatchObject({ id: "breathing-home" });
    expect(hits[0]!.score).toBeGreaterThanOrEqual(0.55);
    // an unrestricted original is superseded there too: never asked, nor co-selected with its twin
    const open = JSON.parse(JSON.stringify(gap));
    delete open.history.find((h: Json) => h.id === "breathing").phases;
    const o = load(open);
    expect(historyAvailable(o, "breathing", "discharge")).toBe(false);
    expect(historyTwin(o, "breathing", "discharge")).toBe("breathing-home");
    expect(matchHistory(o, "Are you short of breath?", "en", { phase: "discharge" }).map((h) => h.id)).not.toContain("breathing");
    // the deepest twin available answers when several are
    expect(supersededIn(c, "breathing", "discharge")).toBe("breathing-home");
    expect(checkCaseIntegrity(g).filter((i) => i.severity === "error")).toEqual([]);

    const loop = twinJson();
    loop.history.find((h: Json) => h.id === "breathing").supersedes = ["breathing-now"];
    const cyc = load(loop);
    expect(historyTwin(cyc, "breathing", "observation")).toBe("breathing-now");
    expect(historyTwin(cyc, "breathing-now", "arrival")).toBe("breathing");
  });
});

describe("phase twins — credit", () => {
  it("asking the twin credits the original for `asked` conditions and required history, without revealing it", () => {
    const s = run(TWIN, [...TO_OBSERVATION, { type: "ask", itemId: "breathing-now" }]);
    expect(s.asked).toEqual(["breathing-now"]);
    expect(historyCredited(TWIN, s, "breathing")).toBe(true);
    expect(evaluate(TWIN, s, { asked: "breathing" })).toBe(true);
    expect(creditedHistory(TWIN, s)).toEqual(["breathing-now", "breathing"]);
    const report = assess(TWIN, s);
    expect(report.history.asked).toBe(1); // questions really asked
    expect(report.history.missingRequired).not.toContain("breathing");
    expect(report.history.requiredAsked).toBe(1);
  });

  it("never credits the twin for asking the original", () => {
    const s = run(TWIN, [{ type: "start" }, { type: "ask", itemId: "breathing" }]);
    expect(evaluate(TWIN, s, { asked: "breathing" })).toBe(true);
    expect(evaluate(TWIN, s, { asked: "breathing-now" })).toBe(false);
    const none = run(TWIN, [{ type: "start" }]);
    expect(evaluate(TWIN, none, { asked: "breathing" })).toBe(false);
    expect(assess(TWIN, none).history.missingRequired).toContain("breathing");
  });

  it("an objective on the original completes when the twin is asked (and verify still passes)", () => {
    const json = twinJson();
    json.objectives[3].completeWhen = { all: [{ decided: "dx" }, { asked: "breathing" }] };
    const c = load(json);
    const s = run(c, [...TO_OBSERVATION, { type: "examine", findingId: "airway" }, { type: "ask", itemId: "allergies" }, { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] }]);
    expect(evaluate(c, s, { objective: "diagnose" })).toBe(false);
    const r = reduce(c, s, { type: "ask", itemId: "breathing-now" });
    expect(r.events.some((e) => e.type === "objective.completed" && e.objectiveId === "diagnose")).toBe(true);
    expect(verifyCase(load(twinJson())).ok).toBe(true);
  });
});

describe("phase twins — integrity", () => {
  const paths = (c: CaseDefinition) => checkCaseIntegrity(c).map((i) => `${i.severity} ${i.path}: ${i.message}`);

  it("accepts a valid twin", () => {
    expect(paths(TWIN).filter((p) => p.includes("supersed"))).toEqual([]);
  });

  it("reports unknown ids, self-references and cycles", () => {
    const json = twinJson();
    const n = json.history.length - 1;
    json.history[n].supersedes = ["breathing", "ghost", "breathing-now"];
    expect(paths(load(json))).toEqual(
      expect.arrayContaining([`error history.${n}.supersedes.1: unknown history item "ghost"`, `error history.${n}.supersedes.2: history item "breathing-now" cannot supersede itself`]),
    );
    const loop = twinJson();
    loop.history.find((h: Json) => h.id === "breathing").supersedes = ["breathing-now"];
    expect(paths(load(loop)).filter((p) => p.includes("supersedes cycle"))).toHaveLength(2);
  });

  it("warns when the superseded item can never be asked", () => {
    const json = twinJson();
    json.history.find((h: Json) => h.id === "breathing").phases = ["observation"];
    const i = json.history.findIndex((h: Json) => h.id === "breathing");
    expect(paths(load(json))).toContain(`warning history.${i}.phases: history item "breathing" is superseded in every phase it is listed for, so it can never be asked (only credited through its twin)`);
  });
});

describe("orderMatching.warnings[].unless", () => {
  function withWarning(unless?: Json): CaseDefinition {
    const json = fixture();
    json.orderMatching = {
      warnings: [{ investigation: "abg", ifMatches: "venous|vbg", message: { en: "Only an arterial gas is recorded.", "zh-CN": "只记录了动脉血气。" }, ...(unless ? { unless } : {}) }],
    };
    return load(json);
  }

  it("parses (strict) and is hidden once the condition holds", () => {
    const c = withWarning({ intervened: "oxygen" });
    const before = run(c, [{ type: "start" }]);
    const after = run(c, [{ type: "start" }, { type: "intervene", interventionId: "oxygen" }]);
    expect(orderWarnings(c, "venous blood gas", "abg", "en", before)).toEqual(["Only an arterial gas is recorded."]);
    expect(orderWarnings(c, "venous blood gas", "abg", "en", after)).toEqual([]);
    // Without a session the condition is not evaluated.
    expect(orderWarnings(c, "venous blood gas", "abg", "zh-CN")).toEqual(["只记录了动脉血气。"]);
    // A warning without `unless` always applies.
    expect(orderWarnings(withWarning(), "vbg", "abg", "en", after)).toEqual(["Only an arterial gas is recorded."]);
    const json = fixture();
    json.orderMatching = { warnings: [{ investigation: "abg", ifMatches: "x", message: "m", when: { always: true } }] };
    expect(parseCase(json).ok).toBe(false);
  });

  it("checks the condition's references", () => {
    const issues = checkCaseIntegrity(withWarning({ all: [{ intervened: "ghost" }, { phase: "nowhere" }] }));
    expect(issues.map((i) => i.path)).toEqual(expect.arrayContaining(["orderMatching.warnings.0.unless.all.0.intervened", "orderMatching.warnings.0.unless.all.1.phase"]));
  });
});
