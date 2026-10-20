/**
 * Review round (R2 correctness): the embodied runtime's tool paths, cancellation, language switches and resume.
 * Each test is a reviewer's reproduction turned into a regression test:
 *
 * - C4  a world action's clinical effect runs through exactly that action's caller (not the most recent one);
 * - C5  cancelling a world action withdraws its pending approval and reports CANCELLED (nothing committed);
 * - C13 a spatial refusal inside a world operation keeps its code and hint;
 * - C6  a language switch while a world action is in flight loses nothing and charges nothing twice;
 * - C17 an interrupted delegation reports `cancelled`;
 * - C12 a resumed session equals an uninterrupted one (clock; the idempotency window).
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR, type Mover } from "@clinicalcraft/world";
import { answerAll, command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { counterIds, msgsOf, waitFor } from "../__fixtures__/harness.js";
import { MemoryTranscript, replayTranscript } from "../transcript.js";

/** A mover that takes `ms` of wall time per move (in steps, stopping where it is when aborted). */
function slowMover(ms: number): Mover {
  return {
    async move(_actor, plan, signal) {
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        await new Promise((r) => setTimeout(r, ms / steps));
        if (signal?.aborted) {
          const p = plan.path[Math.min(plan.path.length - 1, Math.floor((i / steps) * plan.path.length))] ?? plan.target;
          return { arrived: false, pose: { ...plan.target, x: p.x, z: p.z, level: p.level }, replans: 0 };
        }
      }
      return { arrived: true, pose: { ...plan.target }, replans: 0 };
    },
  };
}

describe("C4: a world action's clinical effect runs through that action's caller", () => {
  it("an agent's device operation queued behind the learner's walk stays the agent's when the learner acts again", async () => {
    const t = await makeEmbodiedSession({ embodied: { mover: slowMover(150) }, settingsPatch: { permissions: { ask: ["intervene"] } } });
    const requests: { agent: string; tool: string }[] = [];
    t.session.subscribe((e) => {
      if (e.msg.type === "approval_request") {
        requests.push({ agent: String(e.msg.agent), tool: e.msg.tool });
        t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
      }
    });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    expect((await w.execute({ actionId: "go", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" })).status).toBe("completed");
    const learnerWalk = w.execute({ actionId: "L1", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" });
    t.session.submit({ type: "external_tool_call", callId: "ext-1", tool: "interact_object", args: { target: "patient-monitor", operation: "attach" } });
    await new Promise((r) => setTimeout(r, 20));
    const learnerLook = w.execute({ actionId: "L2", actorId: PRIMARY_ACTOR, operation: "look_at", targetId: "patient-monitor" });
    await learnerWalk;
    await waitFor(() => t.session.state.interventions.some((i) => i.interventionId === "cardiac-monitoring"), 5000);
    await learnerLook;
    // The approval was the external agent's (the clinician), and so was the engine action.
    expect(requests).toEqual([{ agent: "clinician", tool: "intervene" }]);
    const action = t.session.snapshot().actions.find((a) => a.type === "intervene" && a.interventionId === "cardiac-monitoring");
    expect(action).toMatchObject({ by: "agent" });
    const begins = t.msgs("tool_call_begin").map((m) => `${m.agent}:${m.tool}`);
    expect(begins).toEqual(expect.arrayContaining(["clinician:interact_object", "clinician:intervene"]));
    await t.session.close();
  });
});

describe("C5: cancelling a world action withdraws its pending approval", () => {
  for (const how of ["runtime.cancel", "a cancel operation"] as const) {
    it(`${how}: the approval is withdrawn at once, the action is CANCELLED, nothing is given`, async () => {
      const t = await makeEmbodiedSession({ settingsPatch: { permissions: { ask: ["intervene"] } } });
      const requests: string[] = [];
      const resolved: string[] = [];
      t.session.subscribe((e) => {
        if (e.msg.type === "approval_request") requests.push(e.msg.requestId);
        if (e.msg.type === "approval_resolved") resolved.push(e.msg.decision);
      });
      await t.session.run({ type: "clinical_action", action: { type: "start" } });
      const w = t.session.world()!;
      await w.execute({ actionId: "go", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" });
      t.session.submit({ type: "world_action", request: { actionId: "att-1", actorId: PRIMARY_ACTOR, operation: "attach", targetId: "eq:resus1-monitor" } });
      await waitFor(() => requests.length > 0, 5000);
      if (how === "runtime.cancel") expect(w.cancel(PRIMARY_ACTOR)).toBe(true);
      else await w.execute({ actionId: "c-1", actorId: PRIMARY_ACTOR, operation: "cancel" });
      await waitFor(() => t.msgs("world_action_result").some((m) => m.result.actionId === "att-1"), 5000);
      expect(resolved).toEqual(["abort"]);
      // An answer arriving late finds nothing to approve.
      t.session.submit({ type: "approval_response", requestId: requests[0]!, decision: "approved" });
      const res = t.msgs("world_action_result").find((m) => m.result.actionId === "att-1")!.result;
      expect(res).toMatchObject({ status: "cancelled", errorCode: "CANCELLED" });
      expect(t.session.state.interventions.some((i) => i.interventionId === "cardiac-monitoring")).toBe(false);
      expect(w.inspect(PRIMARY_ACTOR, "eq:resus1-monitor")!.state).toBe("detached");
      await t.session.close();
    });
  }
});

describe("C13: a spatial refusal inside a world operation keeps its code and hint", () => {
  it("the body stepped away while the approval was pending: SPATIAL_PRECONDITION_CHANGED with a hint back to the patient", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { permissions: { ask: ["intervene"] } } });
    const requests: string[] = [];
    t.session.subscribe((e) => {
      if (e.msg.type === "approval_request") requests.push(e.msg.requestId);
    });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    await w.execute({ actionId: "go", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" });
    t.session.submit({ type: "world_action", request: { actionId: "att-1", actorId: PRIMARY_ACTOR, operation: "attach", targetId: "eq:resus1-monitor" } });
    await waitFor(() => requests.length > 0, 5000);
    const p = w.actor(PRIMARY_ACTOR)!.pose;
    t.session.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: { ...p, x: p.x + 4 } });
    t.session.submit({ type: "approval_response", requestId: requests[0]!, decision: "approved" });
    await waitFor(() => t.msgs("world_action_result").some((m) => m.result.actionId === "att-1"), 5000);
    const res = t.msgs("world_action_result").find((m) => m.result.actionId === "att-1")!.result;
    expect(res).toMatchObject({ status: "failed", errorCode: "SPATIAL_PRECONDITION_CHANGED" });
    expect(res.hint?.goal).toMatchObject({ kind: "interact", id: "patient:resus-1" });
    expect(t.session.state.interventions.some((i) => i.interventionId === "cardiac-monitoring")).toBe(false);
    // Following the hint, the same operation then succeeds.
    await w.execute({ actionId: "back", actorId: PRIMARY_ACTOR, operation: "navigate", goal: res.hint!.goal });
    t.session.submit({ type: "world_action", request: { actionId: "att-2", actorId: PRIMARY_ACTOR, operation: "attach", targetId: "eq:resus1-monitor" } });
    await waitFor(() => requests.length > 1, 5000);
    t.session.submit({ type: "approval_response", requestId: requests[1]!, decision: "approved" });
    await waitFor(() => t.msgs("world_action_result").some((m) => m.result.actionId === "att-2"), 5000);
    expect(t.msgs("world_action_result").find((m) => m.result.actionId === "att-2")!.result.status).toBe("completed");
    await t.session.close();
  });
});

describe("C6: a language switch while a world action is in flight", () => {
  it("keeps the walk's committed pose and its feedback; the travel time is charged once; later messages use the new language", async () => {
    const t = await makeEmbodiedSession({ embodied: { mover: slowMover(200) } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    const before = { ...w.actor(PRIMARY_ACTOR)!.pose };
    const clock0 = t.session.state.clock;
    const walk = w.execute({ actionId: "walk-1", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" });
    await new Promise((r) => setTimeout(r, 50));
    await t.session.run({ type: "configure", patch: { locale: "zh-CN" } });
    const r = await walk;
    expect(r.status).toBe("completed");
    const after = w.actor(PRIMARY_ACTOR)!.pose;
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(5);
    expect(w.feedback("walk-1")).toMatchObject({ actionId: "walk-1", status: "completed" });
    const charged = t.session.state.clock - clock0;
    const expected = ((r.navigation?.travelSeconds ?? 0) / 60) * t.session.caseDef.clock.realtimeScale;
    expect(charged).toBeGreaterThan(0);
    expect(Math.abs(charged - expected)).toBeLessThan(0.02);
    // The retry of the same action id is answered from the record: no second walk, no second charge.
    const clock1 = t.session.state.clock;
    expect((await w.execute({ actionId: "walk-1", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" })).status).toBe("completed");
    expect(t.session.state.clock).toBe(clock1);
    // The world now speaks Chinese.
    const look = await command(t, "look");
    expect(look.text).toMatch(/[一-鿿]/);
    await t.session.close();
  });
});

describe("C17: an interrupted delegation reports cancelled", () => {
  it("the learner's stop mid-walk: status cancelled (not failed)", async () => {
    const t = await makeEmbodiedSession({ embodied: { mover: slowMover(400) } });
    answerAll(t, "approved");
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const run = t.session.run({ type: "slash_command", name: "delegate", args: "triage-nurse attach_monitor" });
    await new Promise((r) => setTimeout(r, 150));
    t.session.submit({ type: "interrupt" });
    const events = await run;
    const out = msgsOf(events, "command_output")[0]!;
    const data = out.data as { data?: { delegation?: { status?: string } } };
    expect(data.data?.delegation?.status).toBe("cancelled");
    expect(out.text).toMatch(/cancelled/);
    await t.session.close();
  });
});

describe("C3: no device stays reserved after a failed route", () => {
  const reserved = (t: { session: { world(): { snapshot(): { entities: Record<string, { reservedBy?: string | null }> } } | null } }) =>
    Object.entries(t.session.world()!.snapshot().entities)
      .filter(([, e]) => e.reservedBy)
      .map(([id, e]) => `${id}@${e.reservedBy}`);

  it("a delegated ECG whose record the learner denies: the nurse resets the cart — idle, reserved by nobody, usable by the clinician", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { permissions: { ask: ["order_test"] } } });
    answerAll(t, "denied");
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    expect((await w.execute({ actionId: "n1", actorId: "staff:ed-nurse", operation: "approach", targetId: "patient" })).status).toBe("completed");
    const out = await command(t, "delegate", "nurse record_ecg");
    expect(out.data.delegation).toMatchObject({ status: "failed" });
    expect(out.data.delegation.steps.map((s: { operation: string }) => s.operation)).toContain("reset");
    expect(reserved(t)).toEqual([]);
    expect(w.inspect(PRIMARY_ACTOR, "eq:resus1-ecg")!.state).toBe("idle");
    expect(t.session.state.orders).toEqual([]);
    await w.execute({ actionId: "c0", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" });
    expect((await w.execute({ actionId: "c1", actorId: PRIMARY_ACTOR, operation: "prepare", targetId: "eq:resus1-ecg" })).status).toBe("completed");
    await t.session.close();
  });

  it("perform_ecg whose record is denied: its final reset step runs (onError continue) — nothing stays reserved", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { permissions: { ask: ["order_test"] } } });
    let decision: "denied" | "approved" = "denied";
    t.session.subscribe((e) => {
      if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision });
    });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    await w.execute({ actionId: "c0", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" });
    const out = await command(t, "skill", "perform_ecg");
    const skill = out.data.skill as { status: string; steps: { id: string; status: string; code?: string }[] };
    expect(skill.status).not.toBe("succeeded");
    expect(skill.steps.find((s) => s.id === "record")).toMatchObject({ status: "failed", code: "APPROVAL_DENIED" });
    expect(skill.steps.find((s) => s.id === "reset")).toMatchObject({ status: "ok" });
    expect(reserved(t)).toEqual([]);
    expect(w.inspect(PRIMARY_ACTOR, "eq:resus1-ecg")!.state).toBe("idle");
    // The nurse can now record it (approvals granted from here on).
    decision = "approved";
    await w.execute({ actionId: "n1", actorId: "staff:ed-nurse", operation: "approach", targetId: "patient" });
    const d = await command(t, "delegate", "nurse record_ecg");
    expect(d.data.delegation).toMatchObject({ status: "completed" });
    await t.session.close();
  });

  it("a skill that aborts after reserving a device (no cleanup step of its own): the session releases it", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const w = t.session.world()!;
    await w.execute({ actionId: "c0", actorId: PRIMARY_ACTOR, operation: "approach", targetId: "patient" });
    const skill = {
      schema: "clinicalcraft/skill@1",
      id: "half_ecg",
      name: { "zh-CN": "半个心电图", en: "Half an ECG" },
      description: { "zh-CN": "准备后失败", en: "Prepares, then fails" },
      safety: "physical",
      steps: [
        { id: "prep", tool: "interact_object", args: { target: "eq:resus1-ecg", operation: "prepare" } },
        { id: "boom", tool: "interact_object", args: { target: "eq:resus1-ecg", operation: "record", parameters: { investigation: "no-such-test" } } },
      ],
    };
    const ev = await t.session.run({ type: "external_tool_call", callId: "s1", tool: "execute_skill", args: { skill }, allowBypass: true });
    const end = msgsOf(ev, "tool_call_end").find((m) => m.callId === "s1")!;
    expect((end.data as { skill: { status: string } }).skill.status).toBe("aborted");
    expect(reserved(t)).toEqual([]);
    expect(w.inspect(PRIMARY_ACTOR, "eq:resus1-ecg")!.state).toBe("idle");
    await t.session.close();
  });

  it("the embodied autopilot whose ECG the learner denies leaves nothing reserved", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { permissions: { ask: ["order_test(ecg-12lead)"] } } });
    answerAll(t, "denied");
    await t.session.run({ type: "autopilot", maxTurns: 8 });
    expect(t.session.state.orders.some((o) => o.investigationId === "ecg-12lead")).toBe(false);
    expect(t.msgs("world_action_result").some((m) => m.result.errorCode === "APPROVAL_DENIED")).toBe(true);
    expect(reserved(t)).toEqual([]);
    await t.session.close();
  });
});

describe("C12: resume equals an uninterrupted run", () => {
  const route = ["patient", "ed-station", "patient", "rad-control", "patient"];

  it("the clock after a resume (the travel-time remainder is kept with the world snapshot)", async () => {
    const a = await makeEmbodiedSession({ transcript: new MemoryTranscript() });
    await a.session.run({ type: "clinical_action", action: { type: "start" } });
    const clocksA: number[] = [];
    for (const target of route) {
      await command(a, "go", target);
      clocksA.push(a.session.state.clock);
    }
    const snapA = a.session.world()!.snapshot();
    await a.session.close();

    const transcript = new MemoryTranscript();
    const b = await makeEmbodiedSession({ transcript });
    await b.session.run({ type: "clinical_action", action: { type: "start" } });
    await command(b, "go", route[0]!);
    const clocksB: number[] = [b.session.state.clock];
    await b.session.close();
    const replayed = replayTranscript(transcript.items);
    const r = await makeEmbodiedSession({ resume: { sessionId: b.session.id, actions: replayed.actions, messages: replayed.messages }, embodied: { snapshot: replayed.world! }, newId: counterIds("r") });
    for (const target of route.slice(1)) {
      await command(r, "go", target);
      clocksB.push(r.session.state.clock);
    }
    const snapB = r.session.world()!.snapshot();
    await r.session.close();
    expect(clocksB).toEqual(clocksA);
    expect(snapB.actors.find((x) => x.id === PRIMARY_ACTOR)!.pose).toEqual(snapA.actors.find((x) => x.id === PRIMARY_ACTOR)!.pose);
  });

  it("the idempotency window (128 results) survives a resume: a retried action id is answered from its record", async () => {
    const goals = [
      { kind: "room", id: "ed-resus" },
      { kind: "room", id: "ed-station" },
    ] as const;
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ transcript });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    for (let i = 0; i < 20; i++) await t.session.run({ type: "world_action", request: { actionId: `walk-${i}`, actorId: PRIMARY_ACTOR, operation: "navigate", goal: goals[i % 2]! } });
    await t.session.close();
    const replayed = replayTranscript(transcript.items);
    expect(replayed.world!.results.length).toBe(20);
    const r = await makeEmbodiedSession({ resume: { sessionId: t.session.id, actions: replayed.actions, messages: replayed.messages }, embodied: { snapshot: replayed.world! } });
    const w = r.session.world()!;
    expect(w.feedback("walk-2")).not.toBeNull();
    const c0 = r.session.state.clock;
    const v0 = w.version;
    const res = msgsOf(await r.session.run({ type: "world_action", request: { actionId: "walk-2", actorId: PRIMARY_ACTOR, operation: "navigate", goal: goals[0] } }), "world_action_result")[0]!.result;
    expect(res.actionId).toBe("walk-2");
    expect(w.version).toBe(v0);
    expect(r.session.state.clock).toBe(c0);
    await r.session.close();
  });
});
