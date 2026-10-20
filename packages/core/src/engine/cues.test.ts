import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import { ClinicalActionSchema } from "../schema/session.js";
import { createSession, inExtremis, oxygenAccessory, parseCase, patientCues, reduce, replay } from "./index.js";

function builtin(id: string): CaseDefinition {
  const parsed = parseCase(JSON.parse(readFileSync(new URL(`../../../content/cases/${id}/case.json`, import.meta.url), "utf8")));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.value;
}

describe("patient cues (bystander view, EMBODIED R7)", () => {
  it("a patient in extremis looks distressed before any monitor is attached; a stable one does not", () => {
    const sick = builtin("anaphylaxis-garden");
    const s = reduce(sick, createSession(sick), { type: "start" }).state;
    expect(inExtremis(sick, s)).toBe(true);
    expect(patientCues(sick, s)).toEqual({ distressed: true, accessory: null, posture: "sitting" });
    const stable = builtin("stemi-inferior-rv");
    const t = reduce(stable, createSession(stable), { type: "start" }).state;
    expect(inExtremis(stable, t)).toBe(false);
    expect(patientCues(stable, t).distressed).toBe(false);
  });

  it("the accessory follows the latest oxygen intervention (mask vs nasal cannula)", () => {
    const c = builtin("septic-shock-cap");
    let s = reduce(c, createSession(c), { type: "start" }).state;
    s = reduce(c, s, { type: "intervene", interventionId: "o2-nasal" }).state;
    expect(patientCues(c, s).accessory).toBe("nasal-cannula");
    s = reduce(c, s, { type: "intervene", interventionId: "o2-nrb" }).state;
    expect(patientCues(c, s).accessory).toBe("oxygen-mask");
    expect(oxygenAccessory(c.interventions.find((i) => i.id === "o2-venturi")!)).toBe("oxygen-mask");
    expect(oxygenAccessory(c.interventions.find((i) => i.kind !== "oxygen")!)).toBeNull();
  });
});

describe("advance-time reason (EMBODIED R8)", () => {
  it("is optional and informational: the engine treats travel, procedure and wait time alike", () => {
    expect(ClinicalActionSchema.safeParse({ type: "advance-time", minutes: 1.5, reason: "travel" }).success).toBe(true);
    expect(ClinicalActionSchema.safeParse({ type: "advance-time", minutes: 1.5, reason: "teleport" }).success).toBe(false);
    const c = builtin("stemi-inferior-rv");
    const plain = replay(c, [{ type: "start" }, { type: "advance-time", minutes: 3 }, { type: "advance-time", minutes: 0.25 }]);
    const reasoned = replay(c, [{ type: "start" }, { type: "advance-time", minutes: 3, reason: "wait" }, { type: "advance-time", minutes: 0.25, reason: "travel" }]);
    expect(reasoned.state).toEqual(plain.state);
    expect(reasoned.events).toEqual(plain.events);
  });
});
