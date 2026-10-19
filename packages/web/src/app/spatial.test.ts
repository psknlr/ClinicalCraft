/**
 * Spatial rules of the web UI in embodied mode (pure): when the UI steps the
 * avatar over by itself, when it shows the refusal with "Go there", saved
 * world snapshots, where moved equipment stands and what counts as at the
 * bedside.
 */
import { BEDSIDE_RADIUS, type NavPlan, type WorldActionResult, type WorldStateSnapshot } from "@clinicalcraft/world";
import { PERSONAL_KIT } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { approachDecision, AUTO_APPROACH_M, bedsideCapsNow, checkIsRange, entitySpot, resultIsRange, SAVED_RESULTS, trimWorldSnapshot, validWorldSnapshot } from "./spatial.js";

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

  it("counts the personal kit, equipment near the bed or in its room, and delivered capabilities", () => {
    const facility = {
      patientSlots: [{ id: "resus-1", room: "resus", x: 31, z: -17 }],
      rooms: [{ id: "resus", rect: { x: 26, z: -20, w: 20, d: 8 } }],
    } as never;
    const eq = (id: string, capabilities: string[], x: number, z: number, room: string | null, available = true) => ({ id, capabilities, x, z, level: "L0", room, available });
    const caps = bedsideCapsNow(
      facility,
      "resus-1",
      [
        eq("monitor", ["monitoring"], 29.6, -19.5, "resus"),
        eq("cart-near", ["ecg"], 31, -17 + BEDSIDE_RADIUS - 0.5, null),
        eq("cart-far", ["ultrasound"], 0, 0, null),
        eq("pharmacy", ["medications"], -14, 5, "pharmacy"),
        eq("broken", ["defibrillation"], 30, -17, "resus", false),
      ],
      "L0",
    );
    for (const k of PERSONAL_KIT) expect(caps.has(k)).toBe(true);
    expect(caps.has("monitoring")).toBe(true);
    expect(caps.has("ecg")).toBe(true);
    expect(caps.has("medications")).toBe(true);
    expect(caps.has("ultrasound")).toBe(false);
    expect(caps.has("defibrillation")).toBe(false);
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
});
