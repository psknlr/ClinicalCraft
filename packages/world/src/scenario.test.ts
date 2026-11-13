/**
 * A run's scenario, an operation's outcomes and a run's marks, as catalog data (docs/FACILITIES.md "One test, more
 * than one result", "A run's scenario", "A run's marks"): the same test comes out another way under a scenario the
 * instructor arranged (`scenarios`, `outcomes`, `arms`) — hidden from whoever acts —; a step is a staff position's
 * (`position`); and a run is marked member by member, each against the sign they had (`runs.marks`).
 */
import { checkCatalogs, parseCatalog, type EquipmentCatalog, type RunMark } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type RunEntry, type WorldActionResult } from "./contracts.js";
import { catalogs, makeWorld, type TestWorld } from "./__fixtures__/world.js";
import { loadFacility } from "./__fixtures__/content.js";
import { markRun } from "./marks.js";

const L = (en: string) => ({ "zh-CN": en, en });
const part = [{ m: "white", p: [0, 0.3, 0], s: [0.3, 0.6, 0.3] }];
const op = (from: string[], to: string | undefined, extra: Record<string, unknown> = {}) => ({ name: L(`${from.join("|")}→${to ?? "="}`), from, ...(to ? { to } : {}), ...extra });
const st = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { name: L(id) }]));
const SURGEON = ["clinician"];
const FACULTY = ["attending", "nurse"];

const MARKS: RunMark[] = [
  { id: "press-first", name: L("Pressure first"), by: ["clinician"], sign: { op: "cut", to: "bleeding" }, response: { op: "press" }, within: 60, first: true },
  { id: "support", name: L("The anaesthetist supports the circulation"), by: ["anaesthetist"], sign: { op: "cut", to: "bleeding" }, response: { op: "support", device: "t-vitals" }, within: 120 },
  { id: "tray", name: L("The nurse opens the tray on the call"), by: ["nurse"], sign: { op: "call" }, response: { op: "open", device: "t-tray" } },
];

function behaviours(station: Record<string, unknown> = {}): unknown[] {
  const device = (id: string, behavior: unknown) => ({ id, name: L(id), category: "teaching", description: L(id), footprint: { w: 0.4, d: 0.3, h: 1 }, solid: false, parts: part, interaction: { kind: "device" }, behavior });
  return [
    device("t-vitals", { initial: "stable", states: st("stable", "alarm", "supported"), operations: { support: op(["alarm"], "supported", { requires: [{ position: ["anaesthetist"] }], assessed: ["anaesthetist"] }) } }),
    device("t-tray", { initial: "sealed", states: st("sealed", "open"), operations: { open: op(["sealed"], "open") } }),
    device("t-desk", { initial: "on", states: st("on"), operations: { set_scenario: op(["on"], undefined, { roles: FACULTY, arms: { type: "t-drill", within: 8 } }) } }),
    device("t-drill", {
      initial: "ready",
      scenarios: { "air-leak": { name: L("An air leak at the stump") }, bleed: { name: L("A bleed at the cut") } },
      runs: { with: ["t-vitals", "t-tray"], within: 8, marks: MARKS },
      states: st("ready", "bubbles", "repaired", "tested", "bleeding", "pressed", "done"),
      operations: {
        // one test, two results: under the air-leak scenario the first test shows bubbles; repaired, it holds
        test: op(["ready", "repaired"], "tested", { outcomes: [{ when: [{ scenario: "air-leak" }, { state: "ready" }], to: "bubbles", result: L("Bubbles rise from the stump.") }] }),
        repair: op(["bubbles"], "repaired"),
        cut: op(["tested"], "done", { roles: SURGEON, outcomes: [{ when: [{ scenario: "bleed" }], to: "bleeding", sets: [{ type: "t-vitals", to: "alarm", within: 8 }], result: L("Blood wells up.") }] }),
        look: op(["bleeding"], undefined),
        call: op(["bleeding", "pressed"], undefined),
        press: op(["bleeding"], "pressed"),
        reset: op(["tested", "done", "pressed", "bubbles", "bleeding"], "ready", { newRun: true, sets: [{ type: "t-vitals", to: "stable", within: 8 }, { type: "t-tray", to: "sealed", within: 8 }] }),
        ...station,
      },
    }),
  ];
}

function drillCatalog(station: Record<string, unknown> = {}): EquipmentCatalog {
  const r = parseCatalog({ schema: "clinicalcraft/equipment-catalog@1", id: "scenario-test", name: L("Scenario test"), equipment: behaviours(station) });
  if (!r.ok) throw new Error(JSON.stringify(r.issues).slice(0, 2000));
  return r.value;
}

function world(): TestWorld {
  const facility = structuredClone(loadFacility("general-hospital"));
  const at = (id: string, type: string, x: number, z: number) => ({ id, type, x, z, y: 0, rot: 0, room: "ed-resus" });
  facility.placements.push(at("drill", "t-drill", 36, -13.4), at("vitals", "t-vitals", 37.2, -13.4), at("tray", "t-tray", 34.8, -13.4), at("desk", "t-desk", 36, -12.2));
  // the faculty: an anaesthetist and a circulating nurse (staff positions: finer than their roles)
  for (const s of facility.staff ?? []) {
    if (s.id === "attending") s.position = "anaesthetist";
    if (s.id === "ed-nurse") s.position = "circulating-nurse";
  }
  return makeWorld("stemi-inferior-rv", { facility, catalogs: [...catalogs(), drillCatalog()] });
}

const A = PRIMARY_ACTOR;
const NURSE = "staff:ed-nurse";
const ANAESTHETIST = "staff:attending";
const DRILL = "eq:drill";

async function act(w: TestWorld, actorId: string, operation: string, targetId: string, parameters?: Record<string, unknown>): Promise<WorldActionResult> {
  const request = { actorId, operation, targetId, ...(parameters ? { parameters } : {}) };
  let r = await w.act(request);
  for (let i = 0; i < 2 && r.status === "failed" && r.hint && (r.errorCode === "NOT_IN_RANGE" || r.errorCode === "NOT_VISIBLE"); i++) {
    expect((await w.act({ actorId, operation: "navigate", goal: r.hint.goal })).status).toBe("completed");
    r = await w.act(request);
  }
  return r;
}
const done = async (w: TestWorld, actorId: string, operation: string, targetId: string, parameters?: Record<string, unknown>) => {
  const r = await act(w, actorId, operation, targetId, parameters);
  expect(r.status, `${operation} ${targetId}: ${r.message}`).toBe("completed");
  return r;
};
const state = (w: TestWorld, id: string) => w.runtime.stateOf(id);
/** Everything the trainee's body is told: what it observes, what it reads of the devices, what it is told happened. */
const told = (w: TestWorld) => JSON.stringify([w.runtime.observe(A), w.runtime.inspect(A, DRILL), w.runtime.inspect(A, "eq:desk")]);

describe("a run's scenario and an operation's outcomes", () => {
  it("with no scenario the test comes out its own way, and nothing more is said", async () => {
    const w = world();
    const r = await done(w, A, "test", DRILL);
    expect(state(w, DRILL)).toBe("tested");
    expect(r.message).not.toContain("Bubbles");
    expect(w.runtime.scenarioOf(DRILL)).toBeNull();
  });

  it("the instructor arms the run at the console; the trainee is shown nothing of it, and the same test shows bubbles — repaired, it holds", async () => {
    const w = world();
    // the trainee cannot arm it; an unknown scenario is refused with the ones there are
    expect(await act(w, A, "set_scenario", "eq:desk", { scenario: "air-leak" })).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED" });
    const unknown = await act(w, NURSE, "set_scenario", "eq:desk", { scenario: "flood" });
    expect(unknown).toMatchObject({ status: "failed", errorCode: "INVALID_REQUEST" });
    expect(unknown.message).toContain("air-leak (An air leak at the stump)");
    const armed = await done(w, NURSE, "set_scenario", "eq:desk", { scenario: "air-leak" });
    expect(armed.message).toContain("An air leak at the stump");
    expect(w.runtime.scenarioOf(DRILL)).toBe("air-leak");
    // hidden: no observation, no device read, no event names it — the station still reads "ready"
    expect(state(w, DRILL)).toBe("ready");
    // (that there is an arming operation at the console is no secret; which scenario it set is)
    expect(told(w)).not.toMatch(/air-leak|air leak/i);
    expect(w.runtime.runsOf(DRILL).current?.scenario).toBeUndefined();
    // the test: bubbles, said with the result
    const first = await done(w, A, "test", DRILL);
    expect(state(w, DRILL)).toBe("bubbles");
    expect(first.message).toContain("Bubbles rise from the stump.");
    // what is seen is the result, never the scenario's name
    expect(told(w)).not.toMatch(/air-leak|air leak/i);
    await done(w, A, "repair", DRILL);
    await done(w, A, "test", DRILL);
    expect(state(w, DRILL)).toBe("tested");
    // the run closed says what it was under; the next has none until the instructor arranges one
    await done(w, NURSE, "reset", DRILL);
    const { current, closed } = w.runtime.runsOf(DRILL);
    expect(closed.at(-1)).toMatchObject({ n: 1, scenario: "air-leak" });
    expect(closed.at(-1)!.entries.map((e) => `${e.op}:${e.to}`)).toEqual(["test:bubbles", "repair:repaired", "test:tested", "reset:ready"]);
    expect(current).toMatchObject({ n: 2, entries: [] });
    expect(w.runtime.scenarioOf(DRILL)).toBeNull();
    await done(w, A, "test", DRILL);
    expect(state(w, DRILL)).toBe("tested");
    // cleared at the console: `none`
    await done(w, NURSE, "reset", DRILL);
    await done(w, NURSE, "set_scenario", "eq:desk", { scenario: "air-leak" });
    expect((await done(w, NURSE, "set_scenario", "eq:desk", { scenario: "none" })).message).toContain("No scenario");
    expect(w.runtime.scenarioOf(DRILL)).toBeNull();
  });

  it("the facilitator's set-up is the same scenario; an outcome sets other devices too, and a snapshot keeps it", async () => {
    const w = world();
    expect(w.runtime.setScenario(DRILL, "flood")).toBe(false);
    expect(w.runtime.setScenario("eq:vitals", "bleed")).toBe(false);
    expect(w.runtime.setScenario(DRILL, "bleed")).toBe(true);
    expect(w.runtime.snapshot().entities[DRILL]?.data?.scenario).toBe("bleed");
    await done(w, A, "test", DRILL);
    const r = await done(w, A, "cut", DRILL);
    expect(r.message).toContain("Blood wells up.");
    expect([state(w, DRILL), state(w, "eq:vitals")]).toEqual(["bleeding", "alarm"]);
  });
});

describe("a staff position's step, and a run's marks", () => {
  it("the step is the anaesthetist's: a nurse is refused in words; marks read each member against the sign they had", async () => {
    const w = world();
    w.runtime.setScenario(DRILL, "bleed");
    await done(w, A, "test", DRILL);
    // before the sign: nothing is owed
    expect(w.runtime.runsOf(DRILL).current!.marks!.map((m) => m.status)).toEqual(["not-applicable", "not-applicable", "not-applicable"]);
    await done(w, A, "cut", DRILL);
    // the sign is there, the responses are not yet
    expect(w.runtime.runsOf(DRILL).current!.marks!.map((m) => m.status)).toEqual(["missed", "missed", "not-applicable"]);
    const refused = await act(w, NURSE, "support", "eq:vitals");
    expect(refused).toMatchObject({ status: "failed", errorCode: "NOT_AUTHORIZED" });
    expect(refused.message).toBe('"alarm→supported" is the step of the anaesthetist.');
    await done(w, A, "press", DRILL);
    await done(w, ANAESTHETIST, "support", "eq:vitals");
    const marks = Object.fromEntries(w.runtime.runsOf(DRILL).current!.marks!.map((m) => [m.id, m]));
    expect(marks["press-first"]).toMatchObject({ status: "met", actor: A });
    expect(marks.support).toMatchObject({ status: "met", actor: ANAESTHETIST });
    // nobody called: the nurse had no sign, so nothing was owed by her
    expect(marks.tray).toEqual({ id: "tray", status: "not-applicable" });
    // the entry says who did it, in which role and position
    expect(w.runtime.runsOf(DRILL).current!.entries.find((e) => e.op === "support")).toMatchObject({ device: "eq:vitals", actor: ANAESTHETIST, role: "attending", position: "anaesthetist" });
    // the call made: now the nurse owes the tray
    await done(w, A, "call", DRILL);
    expect(w.runtime.runsOf(DRILL).current!.marks!.find((m) => m.id === "tray")!.status).toBe("missed");
    await done(w, NURSE, "open", "eq:tray");
    expect(w.runtime.runsOf(DRILL).current!.marks!.find((m) => m.id === "tray")).toMatchObject({ status: "met", actor: NURSE });
    // closed, the run keeps its marks with its scenario
    await done(w, NURSE, "reset", DRILL);
    const closed = w.runtime.runsOf(DRILL).closed.at(-1)!;
    expect(closed.scenario).toBe("bleed");
    expect(closed.marks!.map((m) => m.status)).toEqual(["met", "met", "met"]);
    expect([state(w, "eq:vitals"), state(w, "eq:tray")]).toEqual(["stable", "sealed"]);
  });

  it("`first`: something else of theirs before the response misses the mark", async () => {
    const w = world();
    w.runtime.setScenario(DRILL, "bleed");
    await done(w, A, "test", DRILL);
    await done(w, A, "cut", DRILL);
    await done(w, A, "look", DRILL);
    await done(w, A, "press", DRILL);
    expect(w.runtime.runsOf(DRILL).current!.marks!.find((m) => m.id === "press-first")!.status).toBe("missed");
  });

  it("marks are read from the entries alone: in time, late, missed, by someone else, never owed", () => {
    const entry = (opId: string, at: number, extra: Partial<RunEntry> = {}): RunEntry => ({ op: opId, from: null, to: null, actor: A, role: "clinician", at, ...extra });
    const typeOf = (id: string) => (id === "eq:vitals" ? "t-vitals" : id === "eq:tray" ? "t-tray" : null);
    const bleed = entry("cut", 10, { to: "bleeding" });
    const support = (at: number, extra: Partial<RunEntry> = {}) => entry("support", at, { device: "eq:vitals", actor: ANAESTHETIST, role: "attending", position: "anaesthetist", ...extra });
    const of = (entries: RunEntry[]) => Object.fromEntries(markRun(MARKS, { entries }, typeOf).map((m) => [m.id, m]));
    // 30 s to pressure, 90 s to support: both in time
    expect(of([bleed, entry("press", 10.5), support(11.5)])).toMatchObject({ "press-first": { status: "met", seconds: 30 }, support: { status: "met", seconds: 90 } });
    // pressure after 90 s: late; support after 3 min: late
    expect(of([bleed, entry("press", 11.5), support(13)])).toMatchObject({ "press-first": { status: "late", seconds: 90 }, support: { status: "late", seconds: 180 } });
    // the support given by someone who is not the anaesthetist is not the anaesthetist's response
    expect(of([bleed, support(10.5, { actor: NURSE, role: "nurse", position: "circulating-nurse" })]).support).toMatchObject({ status: "missed", signAt: 10 });
    // a cut that did not bleed is no sign
    expect(of([entry("cut", 10, { to: "done" }), entry("press", 10.2)])["press-first"]).toEqual({ id: "press-first", status: "not-applicable" });
    // the same operation on another device is not the station's own
    expect(of([entry("cut", 10, { to: "bleeding", device: "eq:tray" })])["press-first"].status).toBe("not-applicable");
  });
});

describe("what the catalog check refuses", () => {
  const issues = (station: Record<string, unknown>, extra: unknown[] = []) => {
    const r = parseCatalog({ schema: "clinicalcraft/equipment-catalog@1", id: "scenario-test", name: L("Scenario test"), equipment: [...behaviours(station), ...extra] });
    if (!r.ok) throw new Error(JSON.stringify(r.issues).slice(0, 1000));
    return checkCatalogs([...catalogs(), r.value]).filter((i) => i.severity === "error").map((i) => i.message);
  };

  it("the test catalog itself is clean", () => {
    expect(issues({})).toEqual([]);
  });

  it("a precondition never reads the scenario; an outcome never reads the actor; scenarios, states and marks are real", () => {
    expect(issues({ peek: op(["ready"], undefined, { requires: [{ scenario: "bleed" }] }) }).join("\n")).toContain("a precondition cannot read the run's scenario");
    expect(issues({ odd: op(["ready"], "tested", { outcomes: [{ when: [{ role: ["nurse"] }], to: "done" }] }) }).join("\n")).toContain("never the actor");
    expect(issues({ odd: op(["ready"], "tested", { outcomes: [{ when: [{ scenario: "flood" }], to: "done" }] }) }).join("\n")).toContain('has no scenario "flood"');
    expect(issues({ odd: op(["ready"], "tested", { outcomes: [{ when: [{ scenario: "bleed" }], to: "nowhere" }] }) }).join("\n")).toContain('unknown state "nowhere"');
    const marked = (mark: Record<string, unknown>) => {
      const all = behaviours() as { id: string; behavior: { runs?: { marks: unknown[] } } }[];
      all.find((e) => e.id === "t-drill")!.behavior.runs!.marks = [{ id: "m", name: L("m"), by: ["clinician"], sign: { op: "cut" }, response: { op: "press" }, ...mark }];
      const r = parseCatalog({ schema: "clinicalcraft/equipment-catalog@1", id: "scenario-test", name: L("Scenario test"), equipment: all });
      if (!r.ok) throw new Error(JSON.stringify(r.issues).slice(0, 1000));
      return checkCatalogs([...catalogs(), r.value]).filter((i) => i.severity === "error").map((i) => i.message).join("\n");
    };
    expect(marked({ response: { op: "squeeze" } })).toContain('has no operation "squeeze"');
    expect(marked({ response: { op: "open", device: "t-desk" } })).toContain("is not a device this run records");
    expect(marked({ sign: { op: "cut", to: "flooded" } })).toContain('has no state "flooded"');
  });

  it("an arming operation names a type that has scenarios", () => {
    const desk = { id: "t-desk2", name: L("d"), category: "teaching", description: L("d"), footprint: { w: 0.4, d: 0.3, h: 1 }, solid: false, parts: part, interaction: { kind: "device" },
      behavior: { initial: "on", states: st("on"), operations: { set_scenario: op(["on"], undefined, { arms: { type: "t-tray" } }) } } };
    expect(issues({}, [desk]).join("\n")).toContain('"t-tray" has no scenarios to arrange');
  });
});
