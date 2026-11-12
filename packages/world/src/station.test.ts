/**
 * A training station as catalog data (the 2026-11-12 audit of a thoracoscopy station): what a step works with is that
 * very instrument, in the state it is in (`uses`, `itemState`); what is connected is connected by instance (`link`,
 * `unlink`, `linked`); a reset puts back what the instructor presets (`sets`) and starts the next trainee's own run
 * (`runs`, `newRun`); a step taken by a role it is not assessed for is a labelled substitution (`assessed`); and a
 * camera's picture needs what the steps done under vision need (`screenNeeds`) — every display reads one rule.
 */
import { parseCatalog, type EquipmentCatalog } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type WorldActionResult } from "./contracts.js";
import { catalogs, makeWorld, type TestWorld } from "./__fixtures__/world.js";
import { loadFacility } from "./__fixtures__/content.js";

const L = (en: string) => ({ "zh-CN": en, en });
const part = [{ m: "white", p: [0, 0.3, 0], s: [0.3, 0.6, 0.3] }];
const screenPart = [{ m: "white", p: [0, 0.3, 0], s: [0.3, 0.6, 0.3] }, { m: "screen-dark", p: [0, 0.5, 0.16], s: [0.2, 0.15, 0.01], name: "screen" }];
const op = (from: string[], to: string | undefined, extra: Record<string, unknown> = {}) => ({ name: L(`${from.join("|")}→${to ?? "="}`), from, ...(to ? { to } : {}), ...extra });
const st = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { name: L(id) }]));
const near = (type: string, state: string | string[], within = 6) => ({ nearbyState: { type, state, within } });
const SURGEON = ["clinician", "attending"];
const TEAM = ["clinician", "attending", "nurse"];
/** The view: the tower on and the scope in the chest — one rule for every step done under vision and every display. */
const VIEW = [near("t-tower", "on"), near("t-scope", "in-chest")];

function stationCatalog(): EquipmentCatalog {
  const hand = (id: string, states: string[], ops: Record<string, unknown> = {}) => ({
    id, name: L(id), category: "surgery", description: L(id), footprint: { w: 0.3, d: 0.1, h: 0.05 }, solid: false, parts: [{ m: "white", p: [0, 0.02, 0], s: [0.3, 0.04, 0.1] }],
    interaction: { kind: "device" }, portable: "handheld", reach: 1.2, behavior: { initial: states[0], states: st(...states), operations: ops },
  });
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "station-test",
    name: L("Station test"),
    equipment: [
      hand("t-stapler", ["sterile", "loaded", "fired"], { load: op(["sterile", "fired"], "loaded", { requires: [{ state: "held" }] }) }),
      hand("t-scope", ["sterile", "in-chest", "out"], { withdraw: op(["in-chest"], "out") }),
      hand("t-tube", ["sterile", "placed"]),
      { id: "t-tower", name: L("Tower"), category: "surgery", description: L("Tower"), capabilities: ["endoscopic-camera", "light-source"], footprint: { w: 0.5, d: 0.5, h: 1.2 }, parts: screenPart, interaction: { kind: "device" }, screen: "thoracoscopy",
        screenNeeds: [{ state: "on" }, near("t-scope", "in-chest")],
        behavior: { initial: "off", states: { off: { supplies: [] }, on: {} }, operations: { power_on: op(["off"], "on"), power_off: op(["on"], "off") } } },
      { id: "t-display", name: L("Display"), category: "surgery", description: L("Display"), footprint: { w: 0.5, d: 0.2, h: 1.2 }, parts: screenPart, screen: "thoracoscopy", screenNeeds: VIEW },
      { id: "t-unit", name: L("Drainage unit"), category: "therapy", description: L("Drainage unit"), footprint: { w: 0.3, d: 0.3, h: 0.6 }, solid: false, parts: part, interaction: { kind: "device" },
        behavior: { initial: "sealed", states: st("sealed", "primed", "water-seal"), operations: {
          prime: op(["sealed"], "primed"),
          connect: op(["primed"], "water-seal", { link: { type: "t-tube", state: "placed", within: 4 } }),
          disconnect: op(["water-seal"], "primed", { unlink: "t-tube" }),
        } } },
      { id: "t-count", name: L("Count board"), category: "teaching", description: L("Count board"), footprint: { w: 0.6, d: 0.1, h: 1 }, solid: false, parts: part, interaction: { kind: "device" },
        behavior: { initial: "not-started", states: st("not-started", "baseline"), operations: { baseline_count: op(["not-started"], "baseline") } } },
      { id: "t-console", name: L("Console"), category: "teaching", description: L("Console"), footprint: { w: 0.4, d: 0.3, h: 1 }, parts: part, interaction: { kind: "device" },
        behavior: { initial: "assessment", states: st("assessment", "practice"), operations: { practice: op(["assessment"], "practice"), assess: op(["practice"], "assessment") } } },
      { id: "t-station", name: L("Station"), category: "teaching", description: L("Station"), footprint: { w: 1.2, d: 0.6, h: 1 }, parts: screenPart, interaction: { kind: "device" }, screen: "thoracoscopy", screenNeeds: VIEW,
        behavior: { initial: "ready", runs: { with: ["t-unit", "t-count"], within: 6 }, states: st("ready", "open", "divided", "drained", "expanded"), operations: {
          open: op(["ready"], "open", { roles: SURGEON, requires: [near("t-tower", "on")], uses: [{ item: "t-scope", from: ["sterile", "out"], to: "in-chest" }] }),
          divide: op(["open"], "divided", {
            roles: TEAM, assessed: SURGEON,
            requires: [{ any: [{ role: SURGEON }, near("t-console", "practice", 8)] }, ...VIEW],
            uses: [{ item: "t-stapler", from: ["loaded"], to: "fired" }],
          }),
          drain: op(["divided"], "drained", { roles: SURGEON, uses: [{ item: "t-tube", from: ["sterile"], to: "placed", link: true }] }),
          expand: op(["drained"], "expanded", { roles: SURGEON, requires: [{ linked: { type: "t-unit", state: "water-seal", via: "t-tube" } }] }),
          reset: op(["expanded"], "ready", {
            roles: TEAM, newRun: true, unlink: true,
            sets: [{ type: "t-unit", to: "sealed" }, { type: "t-tube", to: "sterile" }, { type: "t-stapler", to: "sterile" }, { type: "t-scope", to: "sterile" }, { type: "t-tower", to: "on" }, { type: "t-count", to: "not-started" }],
          }),
        } } },
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues).slice(0, 2000));
  return r.value;
}

function world(): TestWorld {
  const facility = structuredClone(loadFacility("general-hospital"));
  const at = (id: string, type: string, x: number, z: number) => ({ id, type, x, z, y: 0, rot: 0, room: "ed-resus" });
  facility.placements.push(
    at("station", "t-station", 36, -13.4), at("tower", "t-tower", 37.6, -13.4), at("display", "t-display", 34.6, -13.4), at("console", "t-console", 36, -12.2),
    at("unit", "t-unit", 37.2, -12.4), at("stapler", "t-stapler", 35.4, -12.6), at("scope", "t-scope", 35.8, -12.6), at("tube", "t-tube", 36.4, -12.6),
    at("count", "t-count", 34.8, -12.4),
  );
  return makeWorld("stemi-inferior-rv", { facility, catalogs: [...catalogs(), stationCatalog()] });
}

const A = PRIMARY_ACTOR;
const NURSE = "staff:ed-nurse";

async function act(w: TestWorld, actorId: string, operation: string, targetId: string): Promise<WorldActionResult> {
  let r = await w.act({ actorId, operation, targetId });
  for (let i = 0; i < 2 && r.status === "failed" && r.hint && (r.errorCode === "NOT_IN_RANGE" || r.errorCode === "NOT_VISIBLE"); i++) {
    expect((await w.act({ actorId, operation: "navigate", goal: r.hint.goal })).status).toBe("completed");
    r = await w.act({ actorId, operation, targetId });
  }
  return r;
}
const done = async (w: TestWorld, actorId: string, operation: string, targetId: string) => {
  const r = await act(w, actorId, operation, targetId);
  expect(r.status, `${operation} ${targetId}: ${r.message}`).toBe("completed");
  return r;
};
const own = (w: TestWorld, id: string) => w.runtime.snapshot().entities[id]?.state;
const links = (w: TestWorld, id: string) => (w.runtime.snapshot().entities[id]?.data?.links as string[] | undefined) ?? [];

describe("a training station as catalog data", () => {
  it("a step works with that very instrument, in its state: an empty or spent stapler is refused; fired, its reload is spent", async () => {
    const w = world();
    await done(w, A, "power_on", "eq:tower");
    await done(w, A, "pick_up", "eq:scope");
    await done(w, A, "open", "eq:station");
    // the scope went in: that scope, in the chest
    expect(own(w, "eq:scope")).toBe("in-chest");
    await done(w, A, "put_down", "eq:scope");
    await done(w, A, "pick_up", "eq:stapler");
    // no reload in: refused, and the refusal says which state it needs and which it is in
    const empty = await act(w, A, "divide", "eq:station");
    expect(empty).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect(empty.message).toMatch(/t-stapler.*loaded.*sterile/);
    expect(w.runtime.stateOf("eq:station")).toBe("open");
    await done(w, A, "load", "eq:stapler");
    await done(w, A, "divide", "eq:station");
    // fired at the station is fired on that stapler: the reload is spent, it fires no second time
    expect(own(w, "eq:stapler")).toBe("fired");
    const run = w.runtime.runsOf("eq:station").current!;
    expect(run.entries.at(-1)).toMatchObject({ op: "divide", from: "open", to: "divided", actor: A, role: "clinician", used: [{ id: "eq:stapler", type: "t-stapler", from: "loaded", to: "fired" }] });
    expect(run.entries.at(-1)).not.toHaveProperty("substitution");
  });

  it("a role outside the assessed task: refused in assessment; in practice done, labelled a substitution in the result and the run", async () => {
    const w = world();
    await done(w, A, "power_on", "eq:tower");
    await done(w, A, "pick_up", "eq:scope");
    await done(w, A, "open", "eq:station");
    await done(w, A, "put_down", "eq:scope");
    await done(w, NURSE, "pick_up", "eq:stapler");
    await done(w, NURSE, "load", "eq:stapler");
    // assessment (the console's default): the circulating nurse may not divide
    const assessed = await act(w, NURSE, "divide", "eq:station");
    expect(assessed.status).toBe("failed");
    expect(w.runtime.stateOf("eq:station")).toBe("open");
    expect(own(w, "eq:stapler")).toBe("loaded");
    // practice: allowed, and said to be a substitution
    await done(w, A, "practice", "eq:console");
    const practice = await done(w, NURSE, "divide", "eq:station");
    expect(practice.message).toMatch(/role substitution, not assessed/);
    expect(w.runtime.runsOf("eq:station").current!.entries.at(-1)).toMatchObject({ op: "divide", actor: NURSE, role: "nurse", substitution: { assessed: ["clinician", "attending"] } });
  });

  it("one view for every display and every step under vision: power, illumination of the scope, withdrawal — restored, the next step", async () => {
    const w = world();
    const screens = () => ["eq:station", "eq:tower", "eq:display"].map((id) => w.runtime.screenOf(id));
    expect(screens()).toEqual(["none", "none", "none"]);
    await done(w, A, "power_on", "eq:tower");
    // on, but no scope in the chest: still no picture anywhere
    expect(screens()).toEqual(["none", "none", "none"]);
    await done(w, A, "pick_up", "eq:scope");
    await done(w, A, "open", "eq:station");
    expect(screens()).toEqual(["thoracoscopy", "thoracoscopy", "thoracoscopy"]);
    // what a body sees of a display it looks at is the same picture: its cue says so
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "look", id: "eq:display" } })).status).toBe("completed");
    expect(w.runtime.inspect(A, "eq:display")?.cues?.screen).toBe("showing the thoracoscope's picture of the chest");
    await done(w, A, "put_down", "eq:scope");
    await done(w, A, "pick_up", "eq:stapler");
    await done(w, A, "load", "eq:stapler");
    // the tower switched off: every screen dark, and the step under vision refused
    await done(w, A, "power_off", "eq:tower");
    expect(screens()).toEqual(["none", "none", "none"]);
    expect((await act(w, A, "divide", "eq:station")).status).toBe("failed");
    expect(own(w, "eq:stapler")).toBe("loaded");
    await done(w, A, "power_on", "eq:tower");
    expect(screens()).toEqual(["thoracoscopy", "thoracoscopy", "thoracoscopy"]);
    // the scope withdrawn: dark again, refused again
    await done(w, A, "put_down", "eq:stapler");
    await done(w, A, "pick_up", "eq:scope");
    await done(w, A, "withdraw", "eq:scope");
    expect(screens()).toEqual(["none", "none", "none"]);
    await done(w, A, "put_down", "eq:scope");
    await done(w, A, "pick_up", "eq:stapler");
    expect((await act(w, A, "divide", "eq:station")).status).toBe("failed");
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "look", id: "eq:display" } })).status).toBe("completed");
    expect(w.runtime.inspect(A, "eq:display")?.cues?.screen).toBe("dark — no picture");
    // out of service: a display is dark whatever it would show
    w.runtime.setAvailability("eq:display", false);
    expect(w.runtime.screenOf("eq:display")).toBe("none");
  });

  it("connected by instance: the drain's unit on that tube, disconnected and reconnected; handed over, the same tube", async () => {
    const w = world();
    await done(w, A, "power_on", "eq:tower");
    await done(w, A, "pick_up", "eq:scope");
    await done(w, A, "open", "eq:station");
    await done(w, A, "put_down", "eq:scope");
    await done(w, A, "pick_up", "eq:stapler");
    await done(w, A, "load", "eq:stapler");
    await done(w, A, "divide", "eq:station");
    await done(w, A, "put_down", "eq:stapler");
    // primed, no tube in: nothing to connect to
    await done(w, NURSE, "prime", "eq:unit");
    expect((await act(w, NURSE, "connect", "eq:unit")).message).toMatch(/t-tube/);
    // the tube handed from the nurse to the operator: the same instance goes in, and stays with the station
    await done(w, NURSE, "pick_up", "eq:tube");
    const handed = await w.act({ actorId: NURSE, operation: "hand_over", targetId: "eq:tube", parameters: { to: A } });
    expect(handed.status, handed.message).toBe("completed");
    await done(w, A, "drain", "eq:station");
    expect(own(w, "eq:tube")).toBe("placed");
    expect(links(w, "eq:tube")).toEqual(["eq:station"]);
    await done(w, A, "put_down", "eq:tube");
    // primed is not connected: the lung stays down
    const primedOnly = await act(w, A, "expand", "eq:station");
    expect(primedOnly.status).toBe("failed");
    expect(primedOnly.message).toMatch(/"t-tube" in Station to be connected to a "Drainage unit" that is water-seal/);
    await done(w, NURSE, "connect", "eq:unit");
    expect(links(w, "eq:unit")).toEqual(["eq:tube"]);
    // disconnected: refused again; reconnected: done
    await done(w, NURSE, "disconnect", "eq:unit");
    expect(links(w, "eq:unit")).toEqual([]);
    expect((await act(w, A, "expand", "eq:station")).status).toBe("failed");
    await done(w, NURSE, "connect", "eq:unit");
    await done(w, A, "expand", "eq:station");
    // a reload keeps the connections
    const again = makeWorld("stemi-inferior-rv", { facility: w.facility, catalogs: [...catalogs(), stationCatalog()], extra: { snapshot: w.runtime.snapshot() } });
    expect((again.runtime.snapshot().entities["eq:unit"]?.data?.links as string[]) ?? []).toEqual(["eq:tube"]);
  });

  it("the next trainee: the reset puts back the instructor's presets, undoes the connections and starts a run of their own", async () => {
    const w = world();
    await done(w, A, "power_on", "eq:tower");
    await done(w, A, "pick_up", "eq:scope");
    await done(w, A, "open", "eq:station");
    await done(w, A, "put_down", "eq:scope");
    await done(w, A, "pick_up", "eq:stapler");
    await done(w, A, "load", "eq:stapler");
    await done(w, A, "divide", "eq:station");
    await done(w, A, "put_down", "eq:stapler");
    await done(w, NURSE, "prime", "eq:unit");
    await done(w, A, "pick_up", "eq:tube");
    await done(w, A, "drain", "eq:station");
    await done(w, A, "put_down", "eq:tube");
    await done(w, NURSE, "connect", "eq:unit");
    await done(w, A, "expand", "eq:station");
    await done(w, A, "power_off", "eq:tower");
    // a count entered late, after the step: in the run, in its place
    await done(w, NURSE, "baseline_count", "eq:count");
    await done(w, NURSE, "reset", "eq:station");
    expect(w.runtime.stateOf("eq:station")).toBe("ready");
    expect(["eq:unit", "eq:tube", "eq:stapler", "eq:scope", "eq:tower", "eq:count"].map((id) => own(w, id))).toEqual(["sealed", "sterile", "sterile", "sterile", "on", "not-started"]);
    expect(["eq:station", "eq:unit", "eq:tube"].map((id) => links(w, id))).toEqual([[], [], []]);
    const { current, closed } = w.runtime.runsOf("eq:station");
    // the run is the trainee's: the station's steps and the drill's devices, in the order they were done
    expect(closed.map((r) => [r.n, r.entries.map((e) => (e.device ? `${e.device}:${e.op}` : e.op))])).toEqual([
      [1, ["open", "divide", "eq:unit:prime", "drain", "eq:unit:connect", "expand", "eq:count:baseline_count", "reset"]],
    ]);
    expect(closed[0]!.closedAt).toBeTypeOf("number");
    expect(current).toMatchObject({ n: 2, entries: [] });
    expect(current!.presets!.map((p) => [p.id, p.state])).toEqual([["eq:unit", "sealed"], ["eq:tube", "sterile"], ["eq:stapler", "sterile"], ["eq:scope", "sterile"], ["eq:tower", "on"], ["eq:count", "not-started"]]);
    // the second trainee's first step is in their own run
    await done(w, A, "pick_up", "eq:scope");
    await done(w, A, "open", "eq:station");
    expect(w.runtime.runsOf("eq:station").current!.entries.map((e) => e.op)).toEqual(["open"]);
  });
});
