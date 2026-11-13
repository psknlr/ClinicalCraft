/**
 * A colleague's own hands on a device (docs/EMBODIED.md §8, `delegate_task … operate_device`): the learner asks,
 * and the member of staff nearest that device — named by role, by staff position or by id — walks to it and does
 * the device's own operation. The world decides whether they may (their role, the device's state) and says why not;
 * the `/delegate` line carries the operation as `operation=<id>`.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";

const FRIDGE = "eq:ed-med-fridge";
const NURSE = "staff:ed-nurse";
type Delegation = { status: string; staffId: string | null; task: string; steps: { operation: string; status: string; code?: string }[]; refusal?: string };
const delegationOf = (data: unknown) => (data as { delegation: Delegation }).delegation;

async function started(): Promise<TestSession> {
  const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
  await t.session.run({ type: "clinical_action", action: { type: "start" } });
  return t;
}

describe("delegate_task operate_device", () => {
  it("the nurse nearest the device opens it with her own hands; the learner has not moved", async () => {
    const t = await started();
    const w = t.session.world()!;
    const before = { ...w.actor(PRIMARY_ACTOR)!.pose };
    expect(w.stateOf(FRIDGE)).toBe("closed");
    const r = await command(t, "delegate", `nurse operate_device ${FRIDGE} operation=open`);
    expect(r.ok, r.text).toBe(true);
    const d = delegationOf(r.data);
    expect(d).toMatchObject({ status: "completed", task: "operate_device", staffId: NURSE });
    expect(d.steps.at(-1)).toMatchObject({ operation: "open", status: "completed" });
    expect(w.stateOf(FRIDGE)).toBe("open");
    expect(w.actor(PRIMARY_ACTOR)!.pose).toMatchObject({ x: before.x, z: before.z });
    // the act is the nurse's own in the world's record
    const nurse = w.actor(NURSE)!.pose;
    const fridge = w.entity(FRIDGE)!.position;
    expect(Math.hypot(nurse.x - fridge.x, nurse.z - fridge.z)).toBeLessThan(2.5);
    await t.session.close();
  });

  it("as a tool: by staff id, with the result's steps; an operation the device does not offer now is refused in the world's words", async () => {
    const t = await started();
    const call = async (args: Record<string, unknown>) => {
      const events = await t.session.run({ type: "external_tool_call", callId: `c-${Math.random().toString(36).slice(2)}`, tool: "delegate_task", args, allowBypass: true });
      return msgsOf(events, "tool_call_end").at(-1) as { ok: boolean; output: string; data?: { delegation?: Delegation } };
    };
    const opened = await call({ role: NURSE, task: "operate_device", target: FRIDGE, params: { operation: "open" } });
    expect(opened.data?.delegation).toMatchObject({ status: "completed", staffId: NURSE });
    // already open: the world refuses, and the refusal is said
    const again = await call({ role: "nurse", task: "operate_device", target: FRIDGE, params: { operation: "open" } });
    expect(again.data?.delegation?.status).toBe("failed");
    expect(again.data?.delegation?.refusal).toMatch(/open/i);
    expect(t.session.world()!.stateOf(FRIDGE)).toBe("open");
    await t.session.close();
  });

  it("what is missing is asked for: the device, then its operation; a role outside the task's scope is refused before a step", async () => {
    const t = await started();
    expect((await command(t, "delegate", "nurse operate_device")).text).toMatch(/needs a target/);
    expect((await command(t, "delegate", `nurse operate_device ${FRIDGE}`)).text).toMatch(/needs the device's operation \(params\.operation/);
    const porter = await command(t, "delegate", `porter operate_device ${FRIDGE} operation=open`);
    expect(delegationOf(porter.data).status).toBe("failed");
    expect(t.session.world()!.stateOf(FRIDGE)).toBe("closed");
    await t.session.close();
  });
});
