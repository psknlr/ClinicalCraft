/**
 * Review round: rule specifiers and information boundaries — the reviewers' reproductions as regression tests.
 * - S6  world-tool rule specifiers are canonical ids: a deny rule is not bypassed by an alias, a composite goal or
 *       a delegated task's params;
 * - G13 get_agent_state tells another actor's whereabouts only when the caller perceives them, remembers where it
 *       saw them, or they work for it — never an unseen staff member anywhere;
 * - G3  no ECG morphology in learner-facing structured data (check_vitals) before a 12-lead is read;
 * - G11 every vitals channel of an embodied session shows the bedside only where the learner's body can see it:
 *       the clinician model's `<monitor>`, `wait`, the session's `vitalsView` (MCP resource, REPL status line).
 */
import { describe, expect, it } from "vitest";
import { ECG_MORPHOLOGIES } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { builtinContent, command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { textScript, toolCallScript } from "../providers/scripted.js";
import { EmbodimentError, embodimentProblem } from "./embodied.js";

async function ext(t: TestSession, callId: string, tool: string, args: Record<string, unknown>) {
  // `allowBypass`: some of these sessions run in bypass to keep approvals out of the way.
  const events = await t.session.run({ type: "external_tool_call", callId, tool, args, allowBypass: true });
  const end = msgsOf(events, "tool_call_end").find((m) => m.callId === callId);
  const aborted = msgsOf(events, "turn_aborted")[0];
  return { ok: end?.ok ?? false, output: end?.output ?? "", data: end?.data as Record<string, any> | undefined, aborted: aborted?.reason ?? null };
}

/** Morphologies an ECG interpretation names (everything but "normal", a word too common to search for). */
const INTERPRETATIONS = ECG_MORPHOLOGIES.filter((m) => m !== "normal");

describe("S6: deny rules see canonical ids", () => {
  it("an alias, a composite goal and a delegated task's params are denied like the canonical call (the reviewer's repro)", async () => {
    const t = await makeEmbodiedSession({
      settingsPatch: { approvalMode: "default", permissions: { deny: ["interact_object(* eq:resus1-ecg)", "navigate_to(room:rad-ct)", "delegate_task(give_intervention aspirin)", "approach_object(eq:resus2-ecg)", "look_at(eq:resus2-ecg)"] } },
    });
    const w = t.session.world()!;
    expect(w.resolveId("resus1-ecg")).toBe("eq:resus1-ecg");
    for (const [i, target] of ["eq:resus1-ecg", "resus1-ecg"].entries()) {
      const r = await ext(t, `a${i}`, "interact_object", { target, operation: "prepare" });
      expect(r.aborted, target).toBe("denied");
    }
    for (const tool of ["approach_object", "look_at"]) {
      const r = await ext(t, `${tool}-alias`, tool, { target: "resus2-ecg" });
      expect(r.aborted, tool).toBe("denied");
    }
    const ct = w.facility.rooms.find((r) => r.id === "rad-ct")!;
    const goals = [{ target: "room:rad-ct" }, { target: "rad-ct" }, { goal: { kind: "any", goals: [{ kind: "room", id: "rad-ct" }] } }, { goal: { kind: "any", goals: [{ kind: "interact", id: "patient" }, { kind: "point", x: ct.rect.x, z: ct.rect.z }] } }];
    for (const [i, args] of goals.entries()) {
      const r = await ext(t, `n${i}`, "navigate_to", args);
      expect(r.aborted, JSON.stringify(args)).toBe("denied");
    }
    expect(w.actor(PRIMARY_ACTOR)!.room).not.toBe("rad-ct");
    for (const [i, args] of [{ target: "aspirin" }, { params: { intervention: "aspirin" } }, { params: { intervention: "Aspirin" } }].entries()) {
      const r = await ext(t, `d${i}`, "delegate_task", { role: "nurse", task: "give_intervention", ...args });
      expect(r.aborted, JSON.stringify(args)).toBe("denied");
    }
    expect(t.session.state.interventions).toEqual([]);
    await t.session.close();
  });
});

describe("G13: get_agent_state only knows what the caller knows", () => {
  it("an unseen staff member is unknown; a perceived one is live; one seen earlier is where the caller saw them", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    const w = t.session.world()!;
    const state = (actor?: string) => ext(t, `s-${actor ?? "self"}-${w.version}`, "get_agent_state", actor ? { actor } : {});
    const own = await state();
    expect(own.ok).toBe(true);
    // The radiologist sits at the radiology console, far out of sight: nothing about where.
    expect(w.canSee(PRIMARY_ACTOR, "staff:radiologist")).toBe(false);
    const unseen = await state("staff:radiologist");
    expect(unseen.ok).toBe(false);
    expect(unseen.output).not.toMatch(/Radiology|rad-control/i);
    expect(JSON.stringify(unseen.data ?? {})).not.toMatch(/pose|room/);
    // The nurse comes to the patient; the clinician walks there and sees her: live.
    expect((await w.execute({ actionId: "n1", actorId: "staff:ed-nurse", operation: "navigate", goal: { kind: "interact", id: "patient" } })).status).toBe("completed");
    await command(t, "go", "patient");
    expect(w.canSee(PRIMARY_ACTOR, "staff:ed-nurse")).toBe(true);
    const live = await state("staff:ed-nurse");
    expect(live.ok).toBe(true);
    expect(live.data?.actor?.pose).toBeDefined();
    // The clinician walks away: where it last saw her, not where she is.
    await command(t, "go", "rad-control");
    expect(w.canSee(PRIMARY_ACTOR, "staff:ed-nurse")).toBe(false);
    const remembered = await state("staff:ed-nurse");
    expect(remembered.ok).toBe(true);
    expect(remembered.data?.actor).toMatchObject({ awareness: "remembered" });
    expect(remembered.data?.actor?.pose).toBeUndefined();
    await t.session.close();
  });
});

describe("G3/G11: vitals channels", () => {
  it("check_vitals data never carries the ECG morphology (clinical and embodied, before any 12-lead)", async () => {
    for (const clinical of [true, false]) {
      const t = await makeEmbodiedSession({ clinical, settingsPatch: { approvalMode: "bypass" } });
      await t.session.run({ type: "clinical_action", action: { type: "start" } });
      if (!clinical) {
        await command(t, "go", "patient");
        await command(t, "use", "patient-monitor attach");
      }
      const r = await ext(t, `v${clinical}`, "check_vitals", {});
      expect(r.ok, r.output).toBe(true);
      const json = JSON.stringify(r.data);
      expect(json).not.toContain('"ecg"');
      for (const m of INTERPRETATIONS) expect(json, m).not.toContain(m);
      const view = t.session.vitalsView();
      expect(view.inView).toBe(true);
      if (view.inView) expect(view.snapshot.vitals.ecg).toBeUndefined();
      await t.session.close();
    }
  });

  it("away from the bedside: the clinician model's <monitor> says not in view, wait reports no vitals, vitalsView is empty with the reason", async () => {
    const t = await makeEmbodiedSession({
      scripts: [toolCallScript([{ id: "c1", name: "wait", args: { minutes: 1 } }]), textScript("ok")],
      settingsPatch: { approvalMode: "bypass" },
    });
    await command(t, "go", "patient");
    await command(t, "use", "patient-monitor attach");
    const at = t.session.vitalsView();
    expect(at.inView).toBe(true);
    await command(t, "go", "radiology-console");
    const away = t.session.vitalsView();
    expect(away).toMatchObject({ inView: false });
    if (!away.inView) expect(away.message.length).toBeGreaterThan(5);
    await t.session.run({ type: "user_message", text: "Wait a minute, then tell me his vitals.", to: "clinician" });
    const system = JSON.stringify(t.provider!.requests[0]!.system ?? "");
    const monitor = /<monitor>(.*?)<\/monitor>/s.exec(system)?.[1] ?? "";
    expect(monitor).toMatch(/not in view/i);
    expect(monitor).not.toMatch(/HR \d+/);
    const waited = msgsOf(t.events, "tool_call_end").find((m) => m.tool === "wait")!;
    expect(waited.output).toMatch(/not in view/i);
    expect(waited.output).not.toMatch(/HR \d+/);
    await t.session.close();
  });
});

describe("C15: no place in the facility for the case", () => {
  it("an embodied session of the garden case in the teaching hospital is refused (embodiment_no_slot, both languages)", async () => {
    const content = await builtinContent();
    const teaching = content.facilities.get("teaching-hospital")!.def;
    const garden = content.cases.get("anaphylaxis-garden")!.def;
    const problem = embodimentProblem(teaching, garden);
    expect(problem).toBeInstanceOf(EmbodimentError);
    expect(problem?.code).toBe("embodiment_no_slot");
    expect(problem?.localized("en")).toMatch(/no place/i);
    expect(problem?.localized("zh-CN")).toMatch(/[一-鿿]/);
    const err = await makeEmbodiedSession({ caseId: "anaphylaxis-garden", facility: teaching }).then(
      () => null,
      (e: unknown) => e as EmbodimentError,
    );
    expect(err?.code).toBe("embodiment_no_slot");
    // Its own facility has a place: no problem.
    expect(embodimentProblem(content.facilities.get(garden.facility ?? "general-hospital")!.def, garden)).toBeNull();
  });
});
