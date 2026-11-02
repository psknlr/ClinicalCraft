/**
 * What an embodied action says it did is what it did (docs/EMBODIED.md §5, R8; the Case 126 audit):
 *
 * - `navigate_to` applies a top-level `range` to the goal (or says why it does not apply) and reports, on arrival,
 *   the distance, "in view" apart from "within reach", and what can be operated from there;
 * - a cart already at its destination is not "moved 0 m": it says so; a destination it cannot reach names what is in
 *   the way and a reachable alternative, which works; the result carries the real displacement;
 * - a delegated `give_intervention` tells a missing target, equipment given as a treatment and an unknown treatment
 *   apart; a fetched cart reports where it stands;
 * - `clock.worldTime: "actual"`: a walk costs its travel time on the clinical clock;
 * - the monitor's `attach` never records a checklist step.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, monitoringIntervention } from "@clinicalcraft/world";
import { parseCase } from "@clinicalcraft/core";
import { builtinContent, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";

let seq = 0;
async function tool(t: TestSession, name: string, args: Record<string, unknown> = {}) {
  const events = await t.session.run({ type: "external_tool_call", callId: `e-${++seq}`, tool: name, args, allowBypass: true });
  return msgsOf(events, "tool_call_end").at(-1) as { ok: boolean; output: string; data?: any };
}
const patientOf = (t: TestSession) => t.session.world()!.find(PRIMARY_ACTOR, { kind: "patient" })[0]!.id;

describe("embodied feedback says what happened", () => {
  it("navigate_to: a range with a goal is applied, an interact goal says why not, and the arrival separates view from reach", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    const patient = patientOf(t);
    const monitor = t.session.world()!.patientMonitor()!;
    const far = await tool(t, "navigate_to", { goal: { kind: "entity", id: monitor }, range: 6 });
    expect(far.ok, far.output).toBe(true);
    expect(far.output).toContain("(range 6.0 m applied to the goal)");
    expect(far.data.arrival).toMatchObject({ target: monitor });
    expect(far.data.arrival.distance).toBeLessThanOrEqual(6.25);
    expect(far.output).toMatch(far.data.arrival.inReach ? /within its reach/ : /in view, but NOT within its reach|not in view/);
    const ignored = await tool(t, "navigate_to", { goal: { kind: "interact", id: patient }, range: 6 });
    expect(ignored.output).toContain("(range ignored: a goal of kind interact goes to where the target can be operated");
    expect(ignored.data.arrival).toMatchObject({ target: patient, inReach: true });
    await t.session.close();
  });

  it("move_to: already there says so; out of reach names the obstacle and an alternative that works", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    const w = t.session.world()!;
    const patient = patientOf(t);
    const ecg = "eq:resus1-ecg";
    expect((await tool(t, "approach_object", { target: ecg })).ok).toBe(true);
    const already = await tool(t, "interact_object", { target: ecg, operation: "move_to", parameters: { goal: { kind: "interact", id: patient } } });
    expect(already.ok, already.output).toBe(true);
    expect(already.output).toMatch(/already at its destination, nothing was moved/);
    expect(already.data.result.moved).toMatchObject({ displacement: 0, satisfied: true, alreadyAtDestination: true });
    // the middle of the patient's trolley cannot be reached by a cart
    const bed = w.entity(patient)!;
    const blocked = await tool(t, "interact_object", { target: ecg, operation: "move_to", parameters: { goal: { kind: "point", x: bed.position.x, z: bed.position.z, level: bed.level, range: 0.2 } } });
    expect(blocked.ok).toBe(false);
    // a reachable alternative to wheel it to — or, when it already stands at the nearest free spot, that said instead
    const hint = blocked.data.result.hint;
    if (hint) {
      expect(hint.then).toMatchObject({ operation: "move_to", targetId: ecg });
      const alternative = await tool(t, "interact_object", { target: ecg, operation: "move_to", parameters: { goal: hint.then.goal } });
      expect(alternative.ok, alternative.output).toBe(true);
      expect(alternative.data.result.moved).toMatchObject({ satisfied: true });
      expect(alternative.data.result.moved.displacement).toBeGreaterThan(0.25);
    } else expect(blocked.output).toMatch(/already stands at the nearest free spot/);
    await t.session.close();
  });

  it("give_intervention tells its failures apart; a fetched cart reports where it stands", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    const none = await tool(t, "delegate_task", { role: "nurse", task: "give_intervention" });
    expect(none.output).toBe("Task give a treatment needs an intervention (params.intervention or target: an id from list_options interventions).");
    const thing = await tool(t, "delegate_task", { role: "nurse", task: "give_intervention", target: "eq:resus1-ecg" });
    expect(thing.output).toMatch(/^.+ \(eq:resus1-ecg\) is a thing in the room, not a treatment: give_intervention takes one of the case's interventions/);
    const unknown = await tool(t, "delegate_task", { role: "nurse", task: "give_intervention", target: "a unicorn blessing" });
    expect(unknown.output).toBe("This case has no intervention that matches “a unicorn blessing” (see list_options interventions). Nobody was sent.");
    const fetched = await tool(t, "delegate_task", { role: "nurse", task: "fetch_equipment", params: { capability: "ultrasound" } });
    expect(fetched.output).toMatch(/\n {2}Now: .+ in .+, \d+\.\d m from the patient \(x -?\d+\.\d, z -?\d+\.\d\)\./);
    await t.session.close();
  });

  it("clock.worldTime actual: a walk costs its travel time on the clinical clock", async () => {
    const content = await builtinContent();
    const raw = structuredClone(content.cases.get("stemi-inferior-rv")!.def) as unknown as Record<string, any>;
    raw.clock = { ...raw.clock, mode: "simulated", realtimeScale: 0, worldTime: "actual" };
    const parsed = parseCase(raw);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 2)));
    const t = await makeEmbodiedSession({ caseDef: parsed.value, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const before = t.session.state.clock;
    const walk = await tool(t, "navigate_to", { target: "eq:office-records" });
    expect(walk.ok, walk.output).toBe(true);
    const seconds = walk.data.result.elapsedSeconds as number;
    expect(seconds).toBeGreaterThan(0);
    expect(t.session.state.clock - before).toBeCloseTo(seconds / 60, 1);
    await t.session.close();
  });
});

describe("the monitor's attach records no checklist step", () => {
  it("monitoringIntervention skips a checklist step even when it is the case's monitoring intervention", async () => {
    const content = await builtinContent();
    const raw = structuredClone(content.cases.get("stemi-inferior-rv")!.def) as unknown as Record<string, any>;
    const L = (en: string) => ({ en, "zh-CN": en });
    raw.interventions = [
      { id: "sign-in", name: L("WHO Sign In"), kind: "monitoring", checklist: true, maxDoses: 1 },
      ...raw.interventions.filter((i: { kind: string }) => i.kind !== "monitoring"),
    ];
    if (raw.physiology?.monitor) raw.physiology.monitor.attachedWhen = { intervened: "sign-in" };
    const parsed = parseCase(raw);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 2)));
    expect(monitoringIntervention(parsed.value, ["cardiac-monitor"])).toBeNull();
    const withMonitor = parseCase({ ...raw, interventions: [...raw.interventions, { id: "attach-monitor", name: L("Monitor"), kind: "monitoring", maxDoses: 1 }] });
    if (!withMonitor.ok) throw new Error(JSON.stringify(withMonitor.issues.slice(0, 2)));
    expect(monitoringIntervention(withMonitor.value, ["cardiac-monitor"])).toBe("attach-monitor");
  });
});
