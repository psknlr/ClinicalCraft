/**
 * Embodied mode of the session (docs/EMBODIED.md R3, R8, §4–§10; PROTOCOL
 * §12) on built-in cases in their own facility, headless: contracts, the
 * spatial gate (incl. TOCTOU), world tools, travel time, deny rules through
 * world tools, delegation, traces, transcripts and resume, a scripted model
 * driving the clinician, camera frames for vision models.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { monitorAttached, type ClinicalAction } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type CameraSensor, type NavGoal, type Pose, type TraceSpan, type WorldActionResult } from "@clinicalcraft/world";
import { answerAll, command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, waitFor, type TestSession } from "../__fixtures__/harness.js";
import { BootstrapError, createNodeSession } from "../node/bootstrap.js";
import { ScriptedProvider, textScript, toolCallScript } from "../providers/scripted.js";
import type { ProviderConfig } from "../providers/types.js";
import { WORLD_READ_ONLY_TOOLS, WORLD_TOOL_NAMES } from "../tools/world.js";
import { MemoryTranscript, replayTranscript } from "../transcript.js";
import { traceJsonl } from "./trace.js";

const root = mkdtempSync(join(tmpdir(), "cc-embodied-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const STEMI_PATIENT = "patient:resus-1";
const FAR: Pose = { x: 0, y: 0, z: 27, yaw: 0, pitch: 0, level: "L0" };

/** Walk the learner's body (a `world_action` op: the learner's own action, no tool gate). */
async function walk(t: TestSession, goal: NavGoal): Promise<WorldActionResult> {
  const events = await t.session.run({ type: "world_action", request: { actionId: `wa-walk-${Math.random().toString(36).slice(2)}`, actorId: PRIMARY_ACTOR, operation: "navigate", goal } });
  return msgsOf(events, "world_action_result")[0]!.result;
}

/** `/use` an entity; when the world answers with a hint (walk first), follow it once and retry. */
async function use(t: TestSession, target: string, operation: string, params = ""): Promise<Awaited<ReturnType<typeof command>>> {
  const args = `${target} ${operation}${params ? ` ${params}` : ""}`;
  const first = await command(t, "use", args);
  const goal = (first.data as { result?: WorldActionResult } | null)?.result?.hint?.goal;
  if (first.ok || !goal) return first;
  await walk(t, goal);
  return command(t, "use", args);
}

const travelActions = (transcript: MemoryTranscript, reason: "travel" | "procedure" = "travel") =>
  transcript
    .ofType("action")
    .map((i) => i.payload.action)
    .filter((a): a is Extract<ClinicalAction, { type: "advance-time" }> => a.type === "advance-time" && a.reason === reason);

describe("embodied mode — contracts (PROTOCOL §12)", () => {
  it("builds the encounter's world from the case's facility; a clinical session has none", async () => {
    const t = await makeEmbodiedSession();
    const first = await t.session.events()[Symbol.asyncIterator]().next();
    expect(first.value!.msg).toMatchObject({ type: "session_configured", embodiment: "embodied" });
    expect(t.session.embodiment).toBe("embodied");
    const w = t.session.world()!;
    expect(w.entity(STEMI_PATIENT)?.kind).toBe("patient");
    expect(w.actor(PRIMARY_ACTOR)?.role).toBe("clinician");
    expect(t.session.trace()).toMatchObject({ format: "clinicalcraft-trace@1", caseId: "stemi-inferior-rv", facilityId: "general-hospital", embodiment: "embodied" });
    expect(t.session.snapshot()).toMatchObject({ embodiment: "embodied" });
    // Every world tool but camera frames (no camera headless).
    for (const name of WORLD_TOOL_NAMES) expect(Boolean(t.session.tool(name)), name).toBe(name !== "get_camera_frame");
    await t.session.close();

    // A front-end's dynamic walk_to is not offered: bodies move through the world (navigate_to and its Mover).
    const web = await makeEmbodiedSession({ dynamicTools: ["walk_to"] });
    expect(web.session.tool("walk_to")).toBeUndefined();
    await web.session.close();

    const c = await makeEmbodiedSession({ clinical: true, dynamicTools: ["walk_to"] });
    expect(c.session.tool("walk_to")).toBeDefined();
    const configured = await c.session.events()[Symbol.asyncIterator]().next();
    expect(configured.value!.msg).toMatchObject({ type: "session_configured", embodiment: "clinical" });
    expect(c.session.world()).toBeNull();
    expect(c.session.trace()).toMatchObject({ embodiment: "clinical", spans: [] });
    expect(c.session.tool("observe_world")).toBeUndefined();
    await c.session.close();
  });

  it("refuses to build an embodied session without a facility (embodiment_requires_facility, both languages)", async () => {
    const err = await makeEmbodiedSession({ facility: null }).then(
      () => null,
      (e: unknown) => e as Error & { code?: string },
    );
    expect(err?.code).toBe("embodiment_requires_facility");
    expect(err?.message).toMatch(/facility/);
    expect(err?.message).toMatch(/场馆/);
  });

  it("fixes the embodiment for the encounter: configure refuses a change (localised)", async () => {
    for (const [locale, pattern] of [
      ["en", /embodied/i],
      ["zh-CN", /具身/],
    ] as const) {
      const t = await makeEmbodiedSession({ settingsPatch: { locale } });
      const events = await t.session.run({ type: "configure", patch: { embodiment: "clinical" } });
      const error = msgsOf(events, "error")[0];
      expect(error).toMatchObject({ code: "invalid_config" });
      expect(error!.message).toMatch(pattern);
      expect(t.session.embodiment).toBe("embodied");
      expect(t.session.tool("navigate_to")).toBeDefined();
      // The same mode again is not a change.
      expect(msgsOf(await t.session.run({ type: "configure", patch: { embodiment: "embodied" } }), "error")).toEqual([]);
      await t.session.close();
    }
  });

  it("applies world_pose at once, never transcribed; a clinical session refuses it once (not_embodied)", async () => {
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ transcript });
    const before = t.session.world()!.version;
    t.session.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: { ...FAR, x: 1.5, z: 26 } });
    // Synchronous: sensor data never waits for the queue.
    expect(t.session.world()!.actor(PRIMARY_ACTOR)!.pose).toMatchObject({ x: 1.5, z: 26 });
    // A sensor pose bumps only the actor's own counter, not the world version.
    expect(t.session.world()!.version).toBe(before);
    await t.session.close();
    expect(transcript.ofType("op").some((i) => (i.payload.op as { type: string }).type === "world_pose")).toBe(false);

    const c = await makeEmbodiedSession({ clinical: true });
    c.session.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: FAR });
    c.session.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: FAR });
    await waitFor(() => c.msgs("error").length > 0);
    expect(c.msgs("error").filter((e) => e.code === "not_embodied")).toHaveLength(1);
    await c.session.close();
  });

  it("runs a world_action op as the learner's action (world_event + world_action_result); a clinical session refuses (not_embodied)", async () => {
    const t = await makeEmbodiedSession();
    const events = await t.session.run({ type: "world_action", request: { actionId: "wa-op-1", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: STEMI_PATIENT } } });
    const result = msgsOf(events, "world_action_result")[0]!.result;
    expect(result).toMatchObject({ actionId: "wa-op-1", status: "completed" });
    expect(result.navigation!.length).toBeGreaterThan(10);
    expect(msgsOf(events, "world_event").some((e) => e.event.type === "actor.moved")).toBe(true);
    // Idempotent by action id: the same request again answers with the recorded result.
    const again = msgsOf(await t.session.run({ type: "world_action", request: { actionId: "wa-op-1", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: STEMI_PATIENT } } }), "world_action_result")[0]!.result;
    expect(again.worldVersion).toBe(result.worldVersion);
    await t.session.close();

    const c = await makeEmbodiedSession({ clinical: true });
    const refused = await c.session.run({ type: "world_action", request: { actionId: "wa-op-2", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: STEMI_PATIENT } } });
    expect(msgsOf(refused, "error")[0]).toMatchObject({ code: "not_embodied" });
    expect(msgsOf(refused, "world_action_result")).toEqual([]);
    await c.session.close();
  });
});

describe("spatial gating of the clinical tools (EMBODIED §6)", () => {
  it("refuses out of reach before the approval gate (SPATIAL_REQUIREMENT_UNMET + hint.goal), then runs once the hint was followed", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "strict" } });
    answerAll(t);
    // A learner command (tool path)…
    const refused = await command(t, "exam", "general");
    expect(refused.ok).toBe(false);
    expect(refused.data).toMatchObject({ code: "SPATIAL_REQUIREMENT_UNMET", requirement: { kind: "at-patient" }, hint: { goal: { kind: "interact", id: STEMI_PATIENT } } });
    expect(refused.text).toMatch(/navigate_to/);
    expect(msgsOf(refused.events, "approval_request")).toEqual([]);
    // … and a clinical_action op (button) are refused alike: no approval prompt, nothing recorded.
    const op = await t.session.run({ type: "clinical_action", action: { type: "examine", findingId: "general" } });
    expect(msgsOf(op, "error")[0]).toMatchObject({ code: "SPATIAL_REQUIREMENT_UNMET" });
    expect(msgsOf(op, "approval_request")).toEqual([]);
    expect(t.session.state.examined).toEqual([]);

    expect((await walk(t, refused.data.hint.goal as NavGoal)).status).toBe("completed");
    const done = await command(t, "exam", "general");
    expect(done.ok).toBe(true);
    expect(msgsOf(done.events, "approval_request").map((r) => r.tool)).toEqual(["examine"]);
    expect(t.session.state.examined).toEqual(["general"]);
    await t.session.close();
  });

  it("leaves cognitive tools usable anywhere (status, notes, phase board)", async () => {
    const t = await makeEmbodiedSession();
    expect((await command(t, "status")).text).not.toMatch(/SPATIAL|navigate_to/);
    await t.session.run({ type: "clinical_action", action: { type: "note", text: "think ACS" } });
    expect(t.session.state.notes).toHaveLength(1);
    expect((await command(t, "board")).text.length).toBeGreaterThan(0);
    await t.session.close();
  });

  it("re-checks right before the engine commit: moved while the approval was pending → SPATIAL_PRECONDITION_CHANGED, nothing committed", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "strict" } });
    const goal: NavGoal = { kind: "interact", id: STEMI_PATIENT };
    // The approval is answered only after the body was moved away (a sensor pose arrives out of band).
    const moveThenApprove = () => {
      const off = t.session.subscribe((e) => {
        if (e.msg.type !== "approval_request") return;
        off();
        const requestId = e.msg.requestId;
        setTimeout(() => {
          t.session.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: FAR });
          t.session.submit({ type: "approval_response", requestId, decision: "approved" });
        }, 5);
      });
    };
    await walk(t, goal);
    moveThenApprove();
    const op = await t.session.run({ type: "clinical_action", action: { type: "examine", findingId: "general" } });
    expect(msgsOf(op, "error")[0]).toMatchObject({ code: "SPATIAL_PRECONDITION_CHANGED" });
    expect(t.session.state.examined).toEqual([]);

    // The tool path (a learner command; model tool calls share it): the dispatch is guarded.
    await walk(t, goal);
    moveThenApprove();
    const viaTool = await command(t, "exam", "general");
    expect(viaTool.ok).toBe(false);
    expect(viaTool.data).toMatchObject({ code: "SPATIAL_PRECONDITION_CHANGED" });
    expect(t.session.state.examined).toEqual([]);
    await t.session.close();
  });
});

describe("world tools", () => {
  it("perception reads only: no world version change, no approval even in strict mode; localised", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "strict" } });
    answerAll(t, "denied");
    const w = t.session.world()!;
    const version = w.version;
    const look = await command(t, "look");
    expect(look.ok).toBe(true);
    expect(look.text).toMatch(/^You are /);
    expect((look.data as { observation: { entities: unknown[] } }).observation.entities.length).toBeGreaterThan(0);
    for (const [name, args] of [
      ["where", ""],
      ["find", "ECG"],
      ["inspect", "patient"],
      ["map", ""],
    ] as const) {
      const r = await command(t, name, args);
      expect(r.ok, name).toBe(true);
      expect(msgsOf(r.events, "approval_request"), name).toEqual([]);
    }
    expect(w.version).toBe(version);
    for (const name of WORLD_TOOL_NAMES) {
      const tool = t.session.tool(name);
      if (!tool) continue;
      expect(tool.readOnly, name).toBe(WORLD_READ_ONLY_TOOLS.includes(name));
      expect(tool.sideEffect, name).toBe(WORLD_READ_ONLY_TOOLS.includes(name) ? "none" : "world");
    }
    await t.session.close();

    const zh = await makeEmbodiedSession({ settingsPatch: { locale: "zh-CN" } });
    expect((await command(zh, "look")).text).toMatch(/^你在/);
    expect((await command(zh, "where")).text).toMatch(/你在/);
    await zh.session.close();
  });

  it("charges travel time once on a simulated clock (advance-time reason travel), never on a static clock", async () => {
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ transcript });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const clock = t.session.state.clock;
    const go = await command(t, "go", "patient");
    expect(go.ok).toBe(true);
    const travel = (go.data as { result: WorldActionResult }).result.navigation!.travelSeconds;
    expect(travel).toBeGreaterThan(5);
    const charged = travelActions(transcript);
    expect(charged).toHaveLength(1);
    // realtimeScale 1: seconds / 60, in hundredths (the remainder carries over).
    expect(Math.abs(charged[0]!.minutes - travel / 60)).toBeLessThanOrEqual(0.01);
    expect(t.session.state.clock).toBeCloseTo(clock + charged[0]!.minutes, 5);
    // Already there: no second charge.
    await command(t, "go", "patient");
    expect(travelActions(transcript)).toHaveLength(1);
    await t.session.close();

    const staticTranscript = new MemoryTranscript();
    const s = await makeEmbodiedSession({ caseId: "smzl-lung-adeno", transcript: staticTranscript });
    expect(s.session.caseDef.clock.mode).toBe("static");
    await s.session.run({ type: "clinical_action", action: { type: "start" } });
    expect((await command(s, "go", "patient")).ok).toBe(true);
    expect(s.session.state.clock).toBe(0);
    expect(travelActions(staticTranscript)).toEqual([]);
    await s.session.close();
  });

  it("runs an operation's clinical effect through the learner's tool path (the gate asks about order_test): recording the ECG", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "strict" } });
    answerAll(t);
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await walk(t, { kind: "interact", id: STEMI_PATIENT });
    for (const op of ["prepare", "connect"]) expect((await use(t, "eq:resus1-ecg", op)).ok, op).toBe(true);
    const record = await use(t, "eq:resus1-ecg", "record", "investigation=ecg-12lead");
    expect(record.ok).toBe(true);
    const result = (record.data as { result: WorldActionResult }).result;
    expect(result.clinical).toMatchObject({ tool: "order_test", ok: true });
    expect(result.clinicalEventIds!.length).toBeGreaterThan(0);
    // The inner clinical tool asked the gate as the learner (strict mode).
    expect(msgsOf(record.events, "approval_request").map((r) => [r.agent, r.tool])).toContainEqual(["learner", "order_test"]);
    expect(t.session.state.orders.map((o) => o.investigationId)).toContain("ecg-12lead");
    await t.session.close();
  });

  it("is never a way around a deny rule: deny intervene(alteplase) blocks devices, world_action ops, delegation, skills and inline skills", async () => {
    const CART = "eq:resus1-crash-cart";
    /** Stand between the crash cart and the patient (within reach of both). */
    const position = async (t: TestSession) => {
      const w = t.session.world()!;
      const cart = w.entity(CART)!.position;
      const patient = w.entity(STEMI_PATIENT)!.position;
      const d = Math.hypot(patient.x - cart.x, patient.z - cart.z);
      const goal: NavGoal = { kind: "point", x: cart.x + ((patient.x - cart.x) * 0.6) / d, z: cart.z + ((patient.z - cart.z) * 0.6) / d };
      expect((await walk(t, goal)).status).toBe("completed");
    };
    /** Place the IV cannula (the crash cart's kit, at the patient). */
    const cannulate = async (t: TestSession) => {
      await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "iv-access" } });
      expect(t.session.state.interventions.map((i) => i.interventionId)).toContain("iv-access");
    };
    const deny = { permissions: { deny: ["intervene(alteplase)"] }, approvalMode: "bypass" };
    const inline = { schema: "clinicalcraft/skill@1", id: "sneaky-lysis", name: "Sneaky", description: "Give a thrombolytic", safety: "clinical", steps: [{ id: "give", tool: "intervene", args: { intervention_id: "alteplase" } }] };
    const scripts = [toolCallScript([{ id: "c1", name: "execute_skill", args: { skill: inline } }]), textScript("Could not.")];
    const t = await makeEmbodiedSession({ caseId: "acute-ischemic-stroke", settingsPatch: deny, scripts });
    await position(t);
    // IV access is patient state (G7): the cannula first, so the deny rule is what stops the thrombolytic
    await cannulate(t);

    const device = await command(t, "use", `${CART} use intervention=alteplase`);
    expect(device.ok).toBe(false);
    expect((device.data as { result: WorldActionResult }).result).toMatchObject({ status: "failed", errorCode: "APPROVAL_DENIED" });
    expect(device.text).toMatch(/intervene\(alteplase\)/);

    const op = await t.session.run({ type: "world_action", request: { actionId: "wa-lysis", actorId: PRIMARY_ACTOR, operation: "use", targetId: CART, parameters: { intervention: "alteplase" } } });
    expect(msgsOf(op, "world_action_result")[0]!.result).toMatchObject({ status: "failed", errorCode: "APPROVAL_DENIED" });

    const delegated = await command(t, "delegate", "nurse give_intervention alteplase");
    expect(delegated.ok).toBe(false);
    expect((delegated.data as { delegation: { status: string } }).delegation.status).not.toBe("completed");

    const skill = await command(t, "skill", "administer_treatment intervention=alteplase");
    expect(skill.ok).toBe(false);
    expect((skill.data as { skill: { status: string } }).skill.status).not.toBe("succeeded");

    // A model proposing an inline skill (JSON) runs its steps through its own gate.
    const turn = await t.session.run({ type: "user_message", text: "Give alteplase now.", to: "clinician" });
    const end = msgsOf(turn, "tool_call_end").find((e) => e.tool === "execute_skill")!;
    expect(end.ok).toBe(false);
    expect(end.output).toMatch(/intervene\(alteplase\)/);

    expect(t.session.state.interventions.map((i) => i.interventionId)).not.toContain("alteplase");
    await t.session.close();

    // Control: without the rule the same device operation gives it.
    const free = await makeEmbodiedSession({ caseId: "acute-ischemic-stroke", settingsPatch: { approvalMode: "bypass" } });
    await position(free);
    await cannulate(free);
    expect((await command(free, "use", `${CART} use intervention=alteplase`)).ok).toBe(true);
    expect(free.session.state.interventions.map((i) => i.interventionId)).toContain("alteplase");
    await free.session.close();
  });
});

describe("delegation (delegate_task)", () => {
  it("a nurse attaches the monitor: engine, world and simulated time", async () => {
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ transcript });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    expect(monitorAttached(t.session.caseDef, t.session.state)).toBe(false);
    const r = await command(t, "delegate", "nurse attach_monitor");
    expect(r.ok).toBe(true);
    const delegation = (r.data as { delegation: { status: string; role: string; staffId: string; steps: { operation: string; status: string }[]; elapsedSeconds: number; distance: number } }).delegation;
    expect(delegation).toMatchObject({ status: "completed", role: "nurse", task: "attach_monitor" });
    expect(delegation.staffId).toMatch(/^staff:/);
    expect(delegation.steps.map((s) => s.operation)).toContain("attach");
    expect(delegation.steps.every((s) => s.status === "completed")).toBe(true);
    expect(delegation.elapsedSeconds).toBeGreaterThan(0);
    expect(delegation.distance).toBeGreaterThan(0);
    // Engine: the monitoring intervention, given through the gate as the delegating learner.
    expect(monitorAttached(t.session.caseDef, t.session.state)).toBe(true);
    expect(t.session.state.interventions.map((i) => i.interventionId)).toContain("cardiac-monitoring");
    // World: the patient's monitor shows attached; the nurse stands at the bedside.
    const w = t.session.world()!;
    expect(w.inspect(PRIMARY_ACTOR, "eq:resus1-monitor")!.state).toBe("attached");
    const nurse = w.actor(delegation.staffId)!.pose;
    const patient = w.entity(STEMI_PATIENT)!.position;
    expect(Math.hypot(nurse.x - patient.x, nurse.z - patient.z)).toBeLessThan(3);
    // Time: the nurse's walk was charged as travel.
    expect(travelActions(transcript).length).toBeGreaterThan(0);
    expect(r.text).toMatch(/attach/i);
    await t.session.close();
  });
});

describe("traces, transcripts and resume", () => {
  it("STEMI headless (embodied offline autopilot): spans link observation → navigation → interaction → clinical_action → state_change → verification for the ECG and the monitor", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "autopilot", maxTurns: 40 });
    expect(t.session.state.finished).toBe(true);
    const trace = t.session.trace();
    const spans = trace.spans;
    const order = new Map(spans.map((s, i) => [s.id, i]));
    const children = (id: string) => spans.filter((s) => s.parentId === id);
    const descendants = (id: string): TraceSpan[] => children(id).flatMap((c) => [c, ...descendants(c.id)]);

    const chain = (plan: TraceSpan, operation: string, tool: string) => {
      const inside = descendants(plan.id);
      const observation = inside.find((s) => s.kind === "observation")!;
      const interaction = inside.find((s) => s.kind === "interaction" && s.name === operation && s.ok)!;
      const clinical = children(interaction.id).find((s) => s.kind === "clinical_action" && s.name === tool)!;
      const change = children(clinical.id).find((s) => s.kind === "state_change")!;
      const verification = children(plan.id).find((s) => s.kind === "verification")!;
      expect(observation, `${plan.name}: observation`).toBeDefined();
      expect(interaction, `${plan.name}: interaction ${operation}`).toBeDefined();
      expect(clinical, `${plan.name}: clinical_action ${tool}`).toMatchObject({ ok: true });
      expect(clinical.refs.actionId).toBe(interaction.refs.actionId);
      expect(change).toMatchObject({ ok: true, data: { source: "engine" } });
      expect(change.refs.clinicalEventIds!.length).toBeGreaterThan(0);
      expect(verification).toMatchObject({ ok: true });
      const at = (s: TraceSpan) => order.get(s.id)!;
      expect(at(observation)).toBeLessThan(at(interaction));
      expect(at(interaction)).toBeLessThan(at(clinical));
      expect(at(clinical)).toBeLessThan(at(change));
      expect(at(change)).toBeLessThan(at(verification));
      return { inside, interaction };
    };

    const plans = spans.filter((s) => s.kind === "plan");
    const ecgPlan = plans.find((s) => s.name === "order_test ecg-12lead")!;
    const ecg = chain(ecgPlan, "record", "order_test");
    // The ECG plan walked to the bedside before recording.
    const nav = ecg.inside.find((s) => s.kind === "navigation" && s.ok)!;
    expect(nav).toBeDefined();
    expect(order.get(nav.id)!).toBeLessThan(order.get(ecg.interaction.id)!);

    const monitorPlan = plans.find((s) => s.name === "intervene cardiac-monitoring")!;
    const monitor = chain(monitorPlan, "attach", "intervene");
    // The body reached the bedside by a navigation recorded before the attach.
    expect(spans.some((s) => s.kind === "navigation" && s.ok && order.get(s.id)! < order.get(monitor.interaction.id)!)).toBe(true);

    const jsonl = traceJsonl(trace).trim().split("\n");
    expect(JSON.parse(jsonl[0]!)).toMatchObject({ format: "clinicalcraft-trace@1", embodiment: "embodied", caseId: "stemi-inferior-rv" });
    expect(jsonl).toHaveLength(spans.length + 1);
    await t.session.close();
  });

  it("writes world snapshots to the transcript; resume restores the physical state", async () => {
    const transcript = new MemoryTranscript();
    const t = await makeEmbodiedSession({ transcript });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await command(t, "go", "patient");
    const pose = { ...t.session.world()!.actor(PRIMARY_ACTOR)!.pose };
    const clock = t.session.state.clock;
    await t.session.close();
    expect(transcript.ofType("world").length).toBeGreaterThan(0);
    const replayed = replayTranscript(transcript.items);
    expect(replayed.world).not.toBeNull();

    const resumed = await makeEmbodiedSession({
      resume: { sessionId: t.session.id, actions: replayed.actions, messages: replayed.messages },
      embodied: { snapshot: replayed.world! },
    });
    expect(resumed.session.world()!.actor(PRIMARY_ACTOR)!.pose).toMatchObject({ x: pose.x, z: pose.z, level: pose.level });
    expect(resumed.session.state.clock).toBe(clock);
    // At the bedside again: examining needs no walk.
    expect((await command(resumed, "exam", "general")).ok).toBe(true);
    await resumed.session.close();
  });

  it("--resume through createNodeSession (JSONL): the recorded embodiment and the body's place come back; another embodiment is refused", async () => {
    const home = join(root, "home");
    const cwd = join(root, "project");
    mkdirSync(home, { recursive: true });
    mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
    const env = { CLINICALCRAFT_HOME: home, HOME: home };
    const flags = { provider: "offline", locale: "en", embodiment: "embodied" };
    const s = await createNodeSession({ caseId: "stemi-inferior-rv", cwd, env, flags, transcript: true });
    await s.run({ type: "clinical_action", action: { type: "start" } });
    await s.run({ type: "slash_command", name: "go", args: "patient" });
    const pose = { ...s.world()!.actor(PRIMARY_ACTOR)!.pose };
    await s.close();

    const resumed = await createNodeSession({ resume: s.id, cwd, env, flags: { provider: "offline" } });
    expect(resumed.embodiment).toBe("embodied");
    expect(resumed.world()!.actor(PRIMARY_ACTOR)!.pose).toMatchObject({ x: pose.x, z: pose.z });
    await resumed.close();

    await expect(createNodeSession({ resume: s.id, cwd, env, flags: { provider: "offline", embodiment: "clinical" } })).rejects.toBeInstanceOf(BootstrapError);
  });
});

describe("a scripted model drives the embodied clinician", () => {
  it("observe_world → navigate_to → order_test → read_result through its own tool path", async () => {
    const scripts = [
      toolCallScript([{ id: "c1", name: "observe_world", args: {} }]),
      toolCallScript([{ id: "c2", name: "navigate_to", args: { target: "patient" } }]),
      toolCallScript([{ id: "c3", name: "order_test", args: { investigation_id: "ecg-12lead" } }]),
      // The tracing takes 5 simulated minutes.
      toolCallScript([{ id: "c4", name: "wait", args: { minutes: 5 } }]),
      toolCallScript([{ id: "c5", name: "read_result", args: { investigation_id: "ecg-12lead" } }]),
      textScript("ECG recorded and read."),
    ];
    const t = await makeEmbodiedSession({ scripts });
    const events = await t.session.run({ type: "user_message", text: "Get an ECG and read it.", to: "clinician" });
    const ends = msgsOf(events, "tool_call_end");
    expect(ends.map((e) => [e.tool, e.ok])).toEqual([
      ["observe_world", true],
      ["navigate_to", true],
      ["order_test", true],
      ["wait", true],
      ["read_result", true],
    ]);
    expect(t.session.state.orders.map((o) => o.investigationId)).toEqual(["ecg-12lead"]);
    expect(t.session.state.seen.some((key) => key.startsWith("ecg-12lead"))).toBe(true);
    // The clinician's body is at the bedside; the walk produced a world_action_result.
    expect(msgsOf(events, "world_action_result").some((r) => r.result.status === "completed" && r.result.navigation)).toBe(true);
    const requests = t.provider!.requests;
    const offered = requests[0]!.tools!.map((tool) => tool.name);
    expect(offered).toEqual(expect.arrayContaining(["observe_world", "navigate_to", "interact_object", "delegate_task", "execute_skill", "order_test"]));
    expect(offered).not.toContain("get_camera_frame");
    // The embodied prompt section is part of the clinician's system prompt.
    expect(requests[0]!.system.map((s) => s.text).join("\n")).toMatch(/navigate_to/);
    await t.session.close();
  });

  it("refuses an out-of-reach clinical tool call of the model with the hint, which the model then follows", async () => {
    const scripts = [
      toolCallScript([{ id: "c1", name: "examine", args: { finding_id: "general" } }]),
      toolCallScript([{ id: "c2", name: "navigate_to", args: { goal: { kind: "interact", id: STEMI_PATIENT } } }]),
      toolCallScript([{ id: "c3", name: "examine", args: { finding_id: "general" } }]),
      textScript("Examined."),
    ];
    const t = await makeEmbodiedSession({ scripts });
    const events = await t.session.run({ type: "user_message", text: "Examine the patient.", to: "clinician" });
    const ends = msgsOf(events, "tool_call_end");
    expect(ends.map((e) => [e.tool, e.ok])).toEqual([
      ["examine", false],
      ["navigate_to", true],
      ["examine", true],
    ]);
    expect(ends[0]!.data).toMatchObject({ code: "SPATIAL_REQUIREMENT_UNMET", hint: { goal: { kind: "interact", id: STEMI_PATIENT } } });
    // The model saw the refusal (with the hint) as its tool result.
    const second = t.provider!.requests[1]!.messages.flatMap((m) => m.content);
    expect(second.some((p) => p.type === "tool_result" && /navigate_to/.test(p.content))).toBe(true);
    await t.session.close();
  });
});

describe("camera frames (get_camera_frame)", () => {
  const camera: CameraSensor = {
    frame: async (_actor, opts) => ({ mimeType: "image/png", imageData: "iVBORw0KGgo=", width: Math.min(opts.maxWidth, 64), height: 48, clock: 0, timestamp: 0, cameraPose: FAR }),
  };
  const providerFor = (vision: boolean) => {
    const provider = new ScriptedProvider([toolCallScript([{ id: "c1", name: "get_camera_frame", args: {} }]), textScript("I see the corridor.")], { capabilities: { vision, supportsImages: vision } });
    return {
      provider,
      opts: {
        settingsPatch: { provider: "openai" },
        resolveProvider: (id: string, model: string | null): ProviderConfig => ({ id, wire: "openai-chat-completions", model: model ?? "scripted", apiKey: "test-key" }),
        providerFactory: () => provider,
        embodied: { camera },
      },
    };
  };

  it("is offered only with a camera and a vision model; the frame reaches the model as an image", async () => {
    const seeing = providerFor(true);
    const t = await makeEmbodiedSession(seeing.opts);
    expect(t.session.tool("get_camera_frame")).toBeDefined();
    const events = await t.session.run({ type: "user_message", text: "What do you see?", to: "clinician" });
    expect(msgsOf(events, "tool_call_end")[0]).toMatchObject({ tool: "get_camera_frame", ok: true });
    expect(seeing.provider.requests[0]!.tools!.map((x) => x.name)).toContain("get_camera_frame");
    const result = seeing.provider.requests[1]!.messages.flatMap((m) => m.content).find((p) => p.type === "tool_result");
    expect(result).toMatchObject({ type: "tool_result", images: [{ mediaType: "image/png", data: "iVBORw0KGgo=" }] });
    await t.session.close();

    const blind = providerFor(false);
    const b = await makeEmbodiedSession(blind.opts);
    await b.session.run({ type: "user_message", text: "What do you see?", to: "clinician" });
    expect(blind.provider.requests[0]!.tools!.map((x) => x.name)).not.toContain("get_camera_frame");
    await b.session.close();
  });
});
