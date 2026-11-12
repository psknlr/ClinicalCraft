/**
 * A hand-over given at a place, in person (an intervention's `at` and `receivers`; the 2026-11-12 audit: a recovery
 * hand-over accepted while the patient was still on the theatre table). The world's one rule: the patient must be in
 * such a place — elsewhere it is refused with the way there (take the patient) — and a member of staff holding one of
 * the positions must be at the patient, who is the one that took them over (`satisfiedBy`).
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "./contracts.js";
import { loadCase, makeWorld } from "./__fixtures__/world.js";
import { loadFacility } from "./__fixtures__/content.js";

function world() {
  const base = loadCase("stemi-inferior-rv");
  const caseDef = structuredClone(base);
  caseDef.interventions.push({
    ...structuredClone(base.interventions.find((i) => i.kind === "monitoring") ?? base.interventions[0]!),
    id: "ward-handover",
    name: { "zh-CN": "病房交接", en: "Hand over on the ward" },
    kind: "monitoring",
    requires: [],
    at: { roomKind: "ward" },
    receivers: ["ward-nurse"],
    handover: true,
  });
  const facility = structuredClone(loadFacility("general-hospital"));
  facility.staff.find((s) => s.id === "ward-nurse")!.position = "ward-nurse";
  return makeWorld("stemi-inferior-rv", { facility, caseDef });
}

const handover = { tool: "intervene", kind: "intervene", interventionId: "ward-handover" } as const;

describe("a hand-over at a place, in person", () => {
  it("elsewhere: refused with the way there; there without the receiver: refused; with them: theirs", async () => {
    const w = world();
    const rt = w.runtime;
    const patient = rt.find(PRIMARY_ACTOR, { kind: "patient" })[0]!.id;
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } })).status).toBe("completed");
    // in the ED: not on the ward — the hint goes to the patient, then takes them to a ward bed space
    const away = rt.checkSpatial(PRIMARY_ACTOR, handover);
    expect(away).toMatchObject({ ok: false, reason: "patient-elsewhere" });
    if (away.ok) throw new Error("unreachable");
    expect(away.message).toMatch(/ward/);
    expect(away.hint?.then).toMatchObject({ operation: "transport_patient", targetId: patient });
    expect(rt.patientPlace()?.room).not.toBe("ward");
    // the team takes them to the ward
    const moved = rt.relocatePatient({ roomKind: "ward" });
    expect(moved).toMatchObject({ ok: true, moved: true });
    expect(rt.patientPlace()?.room).toBe("ward");
    // on the ward, at the bed — the ward nurse not at the patient: refused, pointing at her
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } })).status).toBe("completed");
    const alone = rt.checkSpatial(PRIMARY_ACTOR, handover);
    expect(alone).toMatchObject({ ok: false, reason: "no-receiver" });
    if (alone.ok) throw new Error("unreachable");
    expect(alone.message).toMatch(/ward nurse/);
    expect(alone.hint?.goal).toMatchObject({ kind: "interact", id: "staff:ward-nurse" });
    // she comes to the patient: the hand-over is hers
    expect((await w.act({ actorId: "staff:ward-nurse", operation: "navigate", goal: { kind: "interact", id: patient } })).status).toBe("completed");
    const given = rt.checkSpatial(PRIMARY_ACTOR, handover);
    expect(given.ok).toBe(true);
    if (!given.ok) throw new Error("unreachable");
    expect(given.satisfiedBy).toContain("staff:ward-nurse");
  });
});
