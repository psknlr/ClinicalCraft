import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import { checkCaseIntegrity, parseCase, parseCatalog, parseFacility, verifyCase, type Issue } from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const fixture = (name: string): Json => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const V4 = load(fixture("v4-smzl-mini.case.json"));
const SIM = load(fixture("mini-anaphylaxis.case.json"));

const at = (issues: Issue[], path: string) => issues.filter((i) => i.path === path);

describe("parseCase", () => {
  it("accepts the fixtures without warnings", () => {
    for (const name of ["v4-smzl-mini.case.json", "mini-anaphylaxis.case.json"]) {
      const r = parseCase(fixture(name));
      expect(r.ok && r.warnings).toEqual([]);
    }
  });

  it("applies schema defaults", () => {
    expect(V4.clock).toEqual({ mode: "static", realtimeScale: 0, actionCosts: { ask: 1, examine: 2, order: 1, read: 1, intervene: 2, answer: 0 } });
    expect(V4.history[0].disclosure).toBe("on-ask");
    expect(V4.investigations[0].turnaroundMinutes).toBe(0);
  });

  it("reports zod errors with dot paths and readable union messages", () => {
    const json = fixture("v4-smzl-mini.case.json");
    delete json.title;
    json.objectives[0].completeWhen = { askd: "pain" };
    json.objectives[1].completeWhen = { asked: 5 };
    json.objectives[2].completeWhen = { all: [{ read: "biopsy" }, { phase: "pre", extra: 1 }] };
    json.history[0].disclosure = "sometimes";
    json.patient.chiefComplaint = 42;
    json.phases = [];
    const r = parseCase(json);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.every((i) => i.severity === "error")).toBe(true);
    expect(at(r.issues, "title")).toEqual([{ path: "title", message: "Required", severity: "error" }]);
    expect(at(r.issues, "objectives.0.completeWhen")[0].message).toBe("no allowed form matches object with keys {askd}");
    expect(at(r.issues, "objectives.1.completeWhen.asked")[0].message).toBe("Expected string, received number");
    expect(at(r.issues, "objectives.2.completeWhen.all.1")[0].message).toMatch(/Unrecognized key\(s\) in object: 'extra'/);
    expect(at(r.issues, "history.0.disclosure")[0].message).toMatch(/Invalid enum value/);
    expect(at(r.issues, "patient.chiefComplaint")[0].message).toBe("expected string or object, received number");
    expect(at(r.issues, "phases")[0].message).toMatch(/at least 1/);
  });

  it("warns about non-canonical capabilities and missing translations", () => {
    const json = fixture("v4-smzl-mini.case.json");
    json.investigations[0].requires = ["lab-hematology", "x-ray-vision"];
    json.patient.chiefComplaint = { "zh-CN": "左上腹痛" };
    json.history[1].keywords = { "zh-CN": ["脾大"] };
    const r = parseCase(json);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toEqual([
      { path: "patient.chiefComplaint", message: 'text is missing the "en" translation', severity: "warning" },
      { path: "history.1.keywords", message: 'list is missing the "en" translation', severity: "warning" },
      { path: "investigations.0.requires.1", message: 'non-canonical capability "x-ray-vision" (see CAPABILITIES)', severity: "warning" },
    ]);
  });
});

describe("parseFacility / parseCatalog", () => {
  it("accept the fixtures without warnings", () => {
    const f = parseFacility(fixture("mini.facility.json"));
    const c = parseCatalog(fixture("mini.catalog.json"));
    expect(f.ok && f.warnings).toEqual([]);
    expect(c.ok && c.warnings).toEqual([]);
  });

  it("report errors and warnings with paths", () => {
    const json = fixture("mini.facility.json");
    json.placements[0].x = "a";
    json.rooms[0].kind = "spaceship";
    const r = parseFacility(json);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.map((i) => i.path)).toEqual(["rooms.0.kind", "placements.0.x"]);

    const cat = fixture("mini.catalog.json");
    cat.equipment[0].name = { "zh-CN": "工作站" };
    cat.equipment[2].capabilities.push("telepathy");
    const rc = parseCatalog(cat);
    expect(rc.ok && rc.warnings).toEqual([
      { path: "equipment.0.name", message: 'text is missing the "en" translation', severity: "warning" },
      { path: "equipment.2.capabilities.2", message: 'non-canonical capability "telepathy" (see CAPABILITIES)', severity: "warning" },
    ]);
  });
});

describe("checkCaseIntegrity", () => {
  it("finds no issues in consistent cases", () => {
    expect(checkCaseIntegrity(V4)).toEqual([]);
    expect(checkCaseIntegrity(SIM)).toEqual([]);
  });

  it("reports dangling references everywhere with paths", () => {
    const c = structuredClone(V4);
    c.objectives[0].completeWhen = { all: [{ asked: "pain" }, { asked: "nope" }] };
    c.objectives[1].waypoints[0].unless = { read: "cbc", phase: "later" };
    c.objectives[2].completeWhen = { any: [{ examined: "ghost" }, { not: { ordered: "ghost-test" } }] };
    c.objectives[3].completeWhen = { objective: "diagnosis" };
    c.objectives[4].completeWhen = { flag: "mystery" };
    c.decisions[0].requires = { objective: "ghost" };
    c.decisions[3].requires = { vital: "hr", op: "gt", value: 100 };
    c.phases[1].enterWhen = { decided: "ghost" };
    c.rubric[1].met = { read: "biopsy", phase: "post" };
    c.rubric[2].met = { intervened: "ghost" };
    c.history[4].phases = ["post", "later"];
    c.investigations[0].results.later = { available: true, text: "x", values: [], figures: [], critical: false };
    c.investigations[1].results.pre.figures = ["fig3", "fig99"];
    c.exam[0].media = "fig404";
    c.initialPhase = "nowhere";
    c.history.push({ ...c.history[0] });
    const issues = checkCaseIntegrity(c);
    const expectError = (path: string, message: RegExp) => expect(at(issues, path)).toEqual([{ path, message: expect.stringMatching(message), severity: "error" }]);
    const expectWarning = (path: string, message: RegExp) => expect(at(issues, path)).toEqual([{ path, message: expect.stringMatching(message), severity: "warning" }]);

    expectError("objectives.0.completeWhen.all.1.asked", /unknown history item "nope"/);
    expectError("objectives.1.waypoints.0.unless.phase", /unknown phase "later"/);
    expectError("objectives.2.completeWhen.any.0.examined", /unknown exam finding "ghost"/);
    expectError("objectives.2.completeWhen.any.1.not.ordered", /unknown investigation "ghost-test"/);
    expectError("objectives.3.completeWhen.objective", /depends on itself/);
    expectWarning("objectives.4.completeWhen.flag", /never set/);
    expectError("decisions.0.requires.objective", /unknown objective "ghost"/);
    expectWarning("decisions.3.requires.vital", /no physiology/);
    expectError("phases.1.enterWhen.decided", /unknown decision "ghost"/);
    expectError("rubric.1.met.phase", /no result for phase "post"/);
    expectError("rubric.2.met.intervened", /unknown intervention "ghost"/);
    expectError("history.4.phases.1", /unknown phase "later"/);
    expectError("investigations.0.results.later", /not a declared phase/);
    expectError("investigations.1.results.pre.figures.1", /unknown asset "fig99"/);
    expectError("exam.0.media", /unknown asset "fig404"/);
    expectError("initialPhase", /not declared/);
    expectError("history.5.id", /duplicate history item id "pain"/);
  });

  it("checks order matching, decisions and the solution", () => {
    const c = structuredClone(V4);
    c.orderMatching.rules[0].remove = ["ghost"];
    c.orderMatching.rules[1].unlessMatches = "(";
    c.orderMatching.exact["超声"] = ["us", "ghost"];
    c.orderMatching.warnings[0].investigation = "nope";
    c.decisions[1].options = c.decisions[1].options.map((o) => ({ ...o, correct: false }));
    c.decisions[2].options = c.decisions[2].options.map((o) => ({ ...o, correct: true }));
    c.decisions[0].options.push({ ...c.decisions[0].options[0] });
    c.solution.push(
      { type: "ask", itemId: "ghost" },
      { type: "teleport" },
      { type: "answer", decisionId: "diagnosis", optionIds: ["dual", "nope"] },
      { type: "read", investigationId: "cbc", phase: "later" },
    );
    const issues = checkCaseIntegrity(c);
    const paths = issues.map((i) => i.path);
    expect(paths).toEqual([
      "decisions.0.options.3.id",
      "orderMatching.rules.0.remove.0",
      "orderMatching.rules.1.unlessMatches",
      "orderMatching.exact.超声.1",
      "orderMatching.warnings.0.investigation",
      "decisions.1.options",
      "decisions.2.options",
      "solution.26.itemId",
      "solution.27.type",
      "solution.28.optionIds.1",
      "solution.29.phase",
    ]);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
    expect(at(issues, "orderMatching.rules.1.unlessMatches")[0].message).toMatch(/invalid regular expression/);
    expect(at(issues, "decisions.1.options")[0].message).toMatch(/no correct option/);
    expect(at(issues, "decisions.2.options")[0].message).toMatch(/2 correct options/);
  });

  it("checks interventions and physiology conditions", () => {
    const c = structuredClone(SIM);
    c.interventions[0].indicatedWhen = { examined: "ghost" };
    c.interventions[3].contraindicatedWhen = { asked: "ghost" };
    c.interventions[1].effects.push({ vital: "glucose", delta: 1, onsetMinutes: 0, rampMinutes: 1 });
    c.physiology!.trends[0].until = { intervened: "ghost" };
    c.physiology!.trends.push({ id: "etco2-rise", vital: "etco2", perMinute: 1, startMinute: 0 });
    c.physiology!.events[1].when = { resultReady: "ghost" };
    c.physiology!.events.push({ id: "never", setFlags: [], severity: "info" });
    c.physiology!.events.push({ ...c.physiology!.events[0] });
    const issues = checkCaseIntegrity(c);
    expect(issues.map((i) => [i.path, i.severity])).toEqual([
      ["physiology.events.3.id", "error"],
      ["interventions.0.indicatedWhen.examined", "error"],
      ["interventions.3.contraindicatedWhen.asked", "error"],
      ["physiology.trends.0.until.intervened", "error"],
      ["physiology.events.1.when.resultReady", "error"],
      ["physiology.trends.3.vital", "warning"],
      ["physiology.events.2", "warning"],
      ["interventions.1.effects.1.vital", "warning"],
    ]);
  });
});

describe("verifyCase", () => {
  it("replays the reference solutions successfully", () => {
    for (const c of [V4, SIM]) {
      const r = verifyCase(c);
      expect(r.issues).toEqual([]);
      expect(r.ok).toBe(true);
      expect(r.finalState.finished).toBe(true);
      expect(r.assessment.completed).toBe(true);
    }
  });

  it("prepends start when the solution omits it", () => {
    const c = structuredClone(SIM);
    c.solution = c.solution.slice(1);
    const r = verifyCase(c);
    expect(r.ok).toBe(true);
    expect(r.finalState.seq).toBe(9);
  });

  it("fails with located issues when the solution falls short", () => {
    const c = structuredClone(V4);
    c.solution = c.solution.filter((a) => !(a.type === "answer" && a.decisionId === "response"));
    c.solution.splice(3, 0, { type: "ask", itemId: "ghost" }, { type: "warp" });
    const r = verifyCase(c);
    expect(r.ok).toBe(false);
    expect(r.issues).toEqual([
      { path: "solution.4.type", message: expect.stringMatching(/Invalid discriminator value/), severity: "error" },
      { path: "solution.3", message: expect.stringMatching(/^ask rejected \(unknown-id\)/), severity: "error" },
      { path: "solution.26", message: expect.stringMatching(/^finish rejected \(objectives-incomplete\)/), severity: "error" },
      { path: "solution", message: 'objective "safety" is not completed by the solution', severity: "error" },
      { path: "solution", message: 'decision "response" is not answered correctly by the solution', severity: "error" },
    ]);
    expect(r.assessment.completed).toBe(false);
    expect(r.finalState.finished).toBe(false);
  });
});
