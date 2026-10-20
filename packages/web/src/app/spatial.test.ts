/**
 * Spatial rules of the web UI in embodied mode (pure): when the UI steps the
 * avatar over by itself, when it shows the refusal with "Go there", saved
 * world snapshots, where moved equipment stands, whether the learner can read
 * the patient's monitor (the world's own check) and refusal text for people.
 */
import type { NavPlan, SpatialCheck, WorldActionResult, WorldStateSnapshot } from "@clinicalcraft/world";
import { describe, expect, it } from "vitest";
import { approachDecision, AUTO_APPROACH_M, checkIsRange, entitySpot, learnerText, resultIsRange, SAVED_RESULTS, screenState, trimWorldSnapshot, validWorldSnapshot } from "./spatial.js";

const goal = { kind: "interact", id: "eq:resus1-monitor" } as const;
const plan = (length: number): NavPlan => ({ ok: true, length, travelSeconds: length / 1.4, path: [], target: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, level: "L0" }, goal }) as unknown as NavPlan;

describe("approachDecision", () => {
  it("steps over by itself when only distance is the problem and the walk is within the aim reach", () => {
    expect(approachDecision({ goal, label: "Resus 1" }, true, plan(AUTO_APPROACH_M))).toEqual({ kind: "approach", goal });
  });

  it("shows the refusal with Go there for a longer walk, or when walking does not fix it", () => {
    expect(approachDecision({ goal, label: "Resus 1" }, true, plan(AUTO_APPROACH_M + 0.5))).toEqual({ kind: "refuse", goal, label: "Resus 1" });
    expect(approachDecision({ goal, label: "Resus 1" }, false, plan(2))).toEqual({ kind: "refuse", goal, label: "Resus 1" });
    expect(approachDecision({ goal, label: "Resus 1" }, true, { ok: false, code: "NO_PATH", message: "no route" } as unknown as NavPlan)).toMatchObject({ kind: "refuse" });
  });

  it("refuses without a place to go when there is no hint", () => {
    expect(approachDecision(null, true, plan(1))).toEqual({ kind: "refuse", goal: null, label: null });
  });

  it("tells range problems from the others", () => {
    expect(checkIsRange({ ok: false, reason: "not-near-patient" } as never)).toBe(true);
    expect(checkIsRange({ ok: false, reason: "missing-capability" } as never)).toBe(false);
    const r = (errorCode: string, status = "failed") => ({ actionId: "a", status, message: "", worldVersion: 1, events: [], errorCode }) as unknown as WorldActionResult;
    expect(resultIsRange(r("NOT_IN_RANGE"))).toBe(true);
    expect(resultIsRange(r("NOT_VISIBLE"))).toBe(true);
    expect(resultIsRange(r("DEVICE_BUSY"))).toBe(false);
    expect(resultIsRange(r("NOT_IN_RANGE", "completed"))).toBe(false);
  });
});

const snapshot = (): WorldStateSnapshot => ({
  format: "clinicalcraft-world@1",
  facilityId: "general-hospital",
  version: 7,
  actors: [
    { id: "actor:clinician", role: "clinician", pose: { x: 1, y: 0, z: 2, yaw: 0, pitch: 0, level: "L0" }, seen: [], holding: ["eq:pulse-ox"] },
    { id: "staff:ed-nurse", role: "nurse", pose: { x: 30, y: 0, z: -15, yaw: 1, pitch: 0, level: "L0" }, seen: [], holding: [] },
  ] as never,
  entities: {
    "eq:ecg-cart": { version: 2, position: { x: 29, y: 0, z: -16, level: "L0" } },
    "eq:pulse-ox": { version: 1, heldBy: "actor:clinician" },
    "eq:resus1-monitor": { version: 3 },
  } as never,
  obstacles: [],
  results: Array.from({ length: 40 }, (_, i) => ({ actionId: `a${i}`, status: "completed", message: "", worldVersion: i, events: [{ id: "e", type: "x" }], navigation: { path: [{ x: 1, z: 1, level: "L0" }], ok: true } })) as never,
});

describe("saved world snapshots", () => {
  it("keeps the last results without paths or events", () => {
    const t = trimWorldSnapshot(snapshot());
    expect(t.results).toHaveLength(SAVED_RESULTS);
    expect(t.results[0]!.actionId).toBe(`a${40 - SAVED_RESULTS}`);
    expect(t.results.every((r) => r.events.length === 0 && (r.navigation?.path.length ?? 0) === 0)).toBe(true);
    expect(t.actors).toEqual(snapshot().actors);
  });

  it("accepts a well-formed snapshot of the facility and rejects anything else", () => {
    expect(validWorldSnapshot(snapshot(), "general-hospital")).not.toBeNull();
    expect(validWorldSnapshot(snapshot(), "teaching-hospital")).toBeNull();
    expect(validWorldSnapshot({ ...snapshot(), format: "other" })).toBeNull();
    const bad = snapshot();
    (bad.actors[0]!.pose as { x: number }).x = Number.NaN;
    expect(validWorldSnapshot(bad)).toBeNull();
    expect(validWorldSnapshot({ ...snapshot(), entities: { "eq:x": { version: "1" } } })).toBeNull();
    expect(validWorldSnapshot("{}")).toBeNull();
    expect(validWorldSnapshot(null)).toBeNull();
  });
});

describe("where equipment stands", () => {
  it("follows moved carts and carried items, else the registry spot", () => {
    const s = snapshot();
    expect(entitySpot(s, "eq:ecg-cart", { x: 0, z: 0, level: "L0" })).toEqual({ x: 29, z: -16, level: "L0" });
    expect(entitySpot(s, "eq:pulse-ox", { x: 0, z: 0, level: "L0" })).toEqual({ x: 1, z: 2, level: "L0" });
    expect(entitySpot(s, "eq:resus1-monitor", { x: 5, z: 6, level: "L0" })).toEqual({ x: 5, z: 6, level: "L0" });
    expect(entitySpot(s, "eq:unknown", null)).toBeNull();
  });
});

describe("the monitor's screen (EMBODIED §6 monitor-screen)", () => {
  const vitals = { tool: "check_vitals", kind: "any-of" } as never;
  const ok = (satisfiedBy: string[]): SpatialCheck => ({ ok: true, requirement: vitals, satisfiedBy });
  const refused = (reason: string): SpatialCheck => ({ ok: false, code: "SPATIAL_REQUIREMENT_UNMET", requirement: vitals, reason, message: "m", hint: null });

  it("is readable only when the world's vitals check holds through that monitor's screen", () => {
    expect(screenState(ok(["eq:resus1-monitor"]), "eq:resus1-monitor", true)).toEqual({ readable: true, reason: null, monitorId: "eq:resus1-monitor" });
  });

  it("is out of view when the vitals come from the hands at the patient or the chart, or are refused", () => {
    expect(screenState(ok(["patient:resus-1"]), "eq:resus1-monitor", true)).toEqual({ readable: false, reason: "monitor-not-in-view", monitorId: "eq:resus1-monitor" });
    expect(screenState(ok(["eq:ed-records"]), "eq:resus1-monitor", true)).toMatchObject({ readable: false, reason: "monitor-not-in-view" });
    expect(screenState(refused("no-provider-in-reach"), "eq:resus1-monitor", true)).toMatchObject({ readable: false, reason: "monitor-not-in-view" });
    expect(screenState(refused("monitor-not-in-view"), "eq:resus1-monitor", true)).toMatchObject({ readable: false, reason: "monitor-not-in-view" });
    // another monitor's screen is not this one's
    expect(screenState(ok(["eq:other-monitor"]), "eq:resus1-monitor", true)).toMatchObject({ readable: false, reason: "monitor-not-in-view" });
  });

  it("says when nothing is attached, and when the patient has no monitor at all", () => {
    expect(screenState(ok(["patient:resus-1"]), "eq:resus1-monitor", false)).toEqual({ readable: false, reason: "no-monitor-attached", monitorId: "eq:resus1-monitor" });
    expect(screenState(refused("no-monitor-attached"), "eq:resus1-monitor", true)).toMatchObject({ readable: false, reason: "no-monitor-attached" });
    expect(screenState(null, null, true)).toEqual({ readable: false, reason: "no-monitor", monitorId: null });
  });
});

describe("refusals for the learner", () => {
  it("takes the first line of a session refusal and reads a command's spatial data", async () => {
    const { commandRefusal, refusalLead } = await import("./spatial.js");
    expect(refusalLead("Not here: too far.\nGo there first: navigate_to {}")).toBe("Not here: too far.");
    expect(refusalLead("plain")).toBe("plain");
    const hint = { goal: { kind: "interact", id: "patient:resus-1" }, label: "Resus 1" };
    expect(commandRefusal({ ok: false, data: { code: "SPATIAL_REQUIREMENT_UNMET", message: "too far", hint } })).toEqual({ code: "SPATIAL_REQUIREMENT_UNMET", message: "too far", hint });
    expect(commandRefusal({ ok: false, data: { code: "SPATIAL_PRECONDITION_CHANGED", message: "moved", hint: null } })).toEqual({ code: "SPATIAL_PRECONDITION_CHANGED", message: "moved", hint: null });
    expect(commandRefusal({ ok: false, data: { code: "OTHER", message: "x" } })).toBeNull();
    expect(commandRefusal({ ok: true, data: null })).toBeNull();
    expect(commandRefusal(undefined)).toBeNull();
  });

  it("drops the operation ids a model needs from what a person reads", () => {
    expect(learnerText('Needs ECG at the bedside; "ECG cart 2" is elsewhere — wheel it to Liu Zhenhua (move_to).')).toBe('Needs ECG at the bedside; "ECG cart 2" is elsewhere — wheel it to Liu Zhenhua.');
    expect(learnerText("床旁需要十二导联心电图；「心电图机 2」在别处——请把它推到刘振华身边（move_to）。")).toBe("床旁需要十二导联心电图；「心电图机 2」在别处——请把它推到刘振华身边。");
    expect(learnerText("取来「心电图机 2」并推到刘振华身边（move_to）")).toBe("取来「心电图机 2」并推到刘振华身边");
    // ordinary parentheses stay
    expect(learnerText("Peripheral IV access (left forearm)")).toBe("Peripheral IV access (left forearm)");
    expect(learnerText("建立静脉通路（左前臂）")).toBe("建立静脉通路（左前臂）");
  });
});
