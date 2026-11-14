import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { msgsOf } from "../__fixtures__/harness.js";
import { lookupStaff, resolveConsultStaff } from "../tools/consult-target.js";
import { ACCESS, operatorSteps, STAFF, standAtTable, theatreSession } from "./__fixtures__/theatre.js";

const show = (evs: any[]) => evs.map((e) => `${e.msg.type}:${JSON.stringify(e.msg.message ?? e.msg.output ?? e.msg.code ?? e.msg.event?.type ?? "")}`).join("\n");

describe("probe", () => {
  it.skip("refusals in a place", async () => {
    for (const locale of ["en", "zh-CN"]) {
      const t = await theatreSession({ start: { type: "start", seat: "first-assistant" }, settingsPatch: { locale } });
      const s = t.session;
      operatorSteps(t, ACCESS);
      // retract on port C (the operator's maryland)
      const r1 = await s.run({ type: "clinical_action", action: { type: "operate", op: { op: "retract", port: "C", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" } } });
      console.log(locale, "retract C:\n" + show(r1));
      const r2 = await s.run({ type: "external_tool_call", callId: "e1", tool: "operate", args: { op: "retract", port: "C", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" } });
      console.log(locale, "ext retract C:\n", msgsOf(r2, "tool_call_end").map((m) => m.output));
      const r3 = await s.run({ type: "external_tool_call", callId: "e2", tool: "operate", args: { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false } });
      console.log(locale, "ext dissect:\n", msgsOf(r3, "tool_call_end").map((m) => m.output), JSON.stringify(msgsOf(r3, "tool_call_end").map((m) => m.data)));
      const r4 = await s.run({ type: "clinical_action", action: { type: "operate", op: { op: "insert", port: "C", instrument: "hook" } } });
      console.log(locale, "insert hook:\n" + show(r4));
      await s.close();
    }
  });
  it.skip("scrub place", async () => {
    const t = await theatreSession({ start: { type: "start", seat: "scrub-nurse" } });
    const s = t.session;
    operatorSteps(t, [ACCESS[0]!, ACCESS[1]!]);
    const r1 = await s.run({ type: "clinical_action", action: { type: "operate", op: { op: "pass", instrument: "laparoscope" } } });
    console.log("scrub pass:\n" + show(r1));
    console.log("passed", JSON.stringify(s.state.procedure?.passed));
    const r2 = await s.run({ type: "clinical_action", action: { type: "operate", op: { op: "hand-over", port: "A", to: "nurse-2" } } });
    console.log("scrub hand-over:\n" + show(r2));
    const r3 = await s.run({ type: "external_tool_call", callId: "e1", tool: "intervene", args: { query: "oxygen" } });
    console.log("scrub intervene:", msgsOf(r3, "tool_call_end").map((m) => m.output));
    const obs = await s.run({ type: "external_tool_call", callId: "o", tool: "observe_field", args: {} });
    console.log("scrub observe:", msgsOf(obs, "tool_call_end").map((m) => m.output));
    await s.close();
  });
  it("delegation", async () => {
    const t = await theatreSession({ settingsPatch: { approvalMode: "default" } });
    const s = t.session;
    s.subscribe((e) => { if (e.msg.type === "approval_request") { console.log("ASK", e.msg.summary, e.msg.actorId); s.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" }); } });
    operatorSteps(t, ACCESS);
    const d = async (args: Record<string, unknown>) => {
      const ev = await s.run({ type: "external_tool_call", callId: `c${Math.random()}`, tool: "delegate_task", args });
      const end = msgsOf(ev, "tool_call_end")[0]!;
      return { out: end.output, d: (end.data as any)?.delegation ?? {}, raw: JSON.stringify(end.data)?.slice(0, 300) };
    };
    const a = await d({ role: "attending", task: "hold_traction", params: { port: "B" } });
    console.log("attending traction:", a.out, a.d.staffId, a.d.status, a.raw);
    const b = await d({ role: "attending", task: "hold_camera" });
    console.log("attending camera:", b.out, b.d.staffId, b.d.status);
    const c = await d({ role: "first assistant", task: "aim_camera", params: { region: "hepatocystic-triangle", zoom: "close" } });
    console.log("aim:", c.out, c.d.staffId, c.d.status, JSON.stringify(s.state.procedure?.camera));
    const e = await d({ role: "nurse", task: "pass_instrument", params: { instrument: "hook" } });
    console.log("pass:", e.out, e.d.staffId, e.d.status, JSON.stringify(s.state.procedure?.passed));
    const f = await d({ role: "staff:anaes-1", task: "hold_traction", params: { port: "B" } });
    console.log("anaes:", f.out, f.d.status);
    const g = await d({ role: "一助", task: "release_traction" });
    console.log("release:", g.out, g.d.staffId, g.d.status);
    const w = s.world()!;
    console.log("lookup", ["一助", "二助", "主刀", "术者", "扶镜手", "camera holder", "first assistant", "scrub nurse"].map((q) => `${q}=>${JSON.stringify(lookupStaff(s.facility, q, "or-theatre", { caseDef: s.caseDef, state: s.state }))}`).join("\n"));
    console.log("consult", JSON.stringify(resolveConsultStaff(s.caseDef, s.facility, "一助", "en", s.state)));
    console.log(w.roomOf(PRIMARY_ACTOR));
    await s.close();
  });
});
