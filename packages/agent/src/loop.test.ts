import { describe, expect, it } from "vitest";
import { makeSession, msgsOf, waitFor } from "./__fixtures__/harness.js";
import { parseJsonObject, runAgentTurn, type LoopHost } from "./loop.js";
import type { ApprovalDecision, EventMsg } from "./protocol.js";
import { ScriptedProvider, textScript, toolCallScript } from "./providers/scripted.js";
import type { StreamEvent } from "./providers/types.js";

const call = (id: string, name: string, args: unknown) => ({ id, name, args });

/** Auto-answer approval requests with `decision`. */
function autoApprove(t: Awaited<ReturnType<typeof makeSession>>, decision: ApprovalDecision, reason?: string): void {
  t.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision, ...(reason ? { reason } : {}) });
  });
}

const clinician = (text: string) => ({ type: "user_message" as const, text, to: "clinician" });

describe("runAgentTurn via the clinician agent", () => {
  it("streams text, runs tools and returns all results in ONE user message", async () => {
    const t = await makeSession({
      scripts: [
        toolCallScript([call("a", "check_vitals", {}), call("b", "list_options", { kind: "investigations" })], { text: "Let me look." }),
        textScript("Vitals reviewed."),
      ],
    });
    const events = await t.session.run(clinician("Start by checking the monitor."));
    expect(msgsOf(events, "agent_message_delta").map((d) => d.delta).join("")).toBe("Let me look.Vitals reviewed.");
    expect(msgsOf(events, "tool_call_begin").map((b) => b.tool)).toEqual(["check_vitals", "list_options"]);
    const ends = msgsOf(events, "tool_call_end");
    expect(ends.every((e) => e.ok)).toBe(true);
    expect(ends.find((e) => e.tool === "list_options")!.output).toContain("[ecg] ECG");
    const second = t.provider!.requests[1]!;
    const last = second.messages.at(-1)!;
    expect(last.role).toBe("user");
    expect(last.content.map((p) => p.type)).toEqual(["tool_result", "tool_result"]);
    expect(msgsOf(events, "turn_complete")[0]).toMatchObject({ agent: "clinician", lastMessage: "Vitals reviewed." });
    const phases = msgsOf(events, "turn_phase").map((p) => p.phase);
    expect(phases).toEqual(expect.arrayContaining(["awaiting_model", "streaming", "executing_tools", "completing", "idle"]));
    // the clinician's tool list respects its allow-list
    expect(t.provider!.requests[0]!.tools!.map((x) => x.name)).toContain("order_test");
    expect(t.provider!.requests[0]!.tools!.map((x) => x.name)).not.toContain("reveal_facts");
  });

  it("validates arguments and reports unknown tools as errors to the model", async () => {
    const t = await makeSession({
      scripts: [toolCallScript([call("a", "order_test", { investigation_id: 42, bogus: true }), call("b", "nonexistent", {})]), textScript("ok")],
    });
    await t.session.run(clinician("go"));
    const results = t.provider!.requests[1]!.messages.at(-1)!.content;
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ type: "tool_result", isError: true });
    expect(JSON.stringify(results[0])).toMatch(/bogus: unknown property/);
    expect(JSON.stringify(results[1])).toMatch(/Unknown tool \\"nonexistent\\"/);
    expect(t.session.state.orders).toEqual([]);
  });

  it("asks before a high-risk intervention and runs it once approved", async () => {
    const t = await makeSession({ scripts: [toolCallScript([call("a", "intervene", { query: "thrombolysis" })]), textScript("Given.")] });
    autoApprove(t, "approved");
    const events = await t.session.run(clinician("treat"));
    const request = msgsOf(events, "approval_request")[0]!;
    expect(request).toMatchObject({ agent: "clinician", tool: "intervene", risk: "high", ruleId: "tool.always-ask", allowSession: false });
    expect(request.summary).toBe("Give Tenecteplase thrombolysis?");
    // approval_resolved carries the id of the approval_response submission that caused it
    expect(t.msgs("approval_resolved")[0]).toMatchObject({ requestId: request.requestId, decision: "approved" });
    expect(t.session.state.interventions.map((i) => i.interventionId)).toEqual(["lysis"]);
    expect(msgsOf(events, "turn_phase").map((p) => p.phase)).toContain("awaiting_approval");
  });

  it("returns the learner's denial reason to the agent as the tool error", async () => {
    const t = await makeSession({ scripts: [toolCallScript([call("a", "intervene", { intervention_id: "lysis" })]), textScript("Understood.")] });
    autoApprove(t, "denied", "check for contraindications first");
    await t.session.run(clinician("treat"));
    expect(t.session.state.interventions).toEqual([]);
    const result = t.provider!.requests[1]!.messages.at(-1)!.content[0]!;
    expect(result).toMatchObject({ type: "tool_result", isError: true });
    expect(JSON.stringify(result)).toContain("check for contraindications first");
  });

  it("approved_for_session adds a session rule so the next call is not asked", async () => {
    const t = await makeSession({
      scripts: [
        toolCallScript([call("a", "order_test", { investigation_id: "ct-chest" })]),
        toolCallScript([call("b", "read_result", { investigation_id: "ct-chest" })]),
        textScript("done"),
      ],
      settingsPatch: { approvalMode: "strict" },
    });
    autoApprove(t, "approved_for_session");
    const events = await t.session.run(clinician("order a CT chest"));
    const requests = msgsOf(events, "approval_request");
    expect(requests).toHaveLength(2); // strict asks for order_test and then read_result (different tools)
    const t2 = await makeSession({
      scripts: [toolCallScript([call("a", "order_test", { investigation_id: "ct-chest" })]), toolCallScript([call("b", "order_test", { investigation_id: "ct-chest" })]), textScript("x")],
      settingsPatch: { approvalMode: "strict" },
    });
    autoApprove(t2, "approved_for_session");
    const events2 = await t2.session.run(clinician("order twice"));
    expect(msgsOf(events2, "approval_request")).toHaveLength(1);
    expect(msgsOf(events2, "tool_call_end").map((e) => e.ok)).toEqual([true, true]);
  });

  it("abort cancels the whole turn", async () => {
    const t = await makeSession({ scripts: [toolCallScript([call("a", "intervene", { intervention_id: "lysis" }), call("b", "check_vitals", {})])] });
    autoApprove(t, "abort");
    const events = await t.session.run(clinician("treat"));
    expect(msgsOf(events, "turn_aborted")[0]).toMatchObject({ agent: "clinician", reason: "denied" });
    expect(t.provider!.requests).toHaveLength(1);
    // history stays consistent: both calls have results
    const history = t.session.conversationOf("clinician");
    expect(history.at(-1)!.content.filter((p) => p.type === "tool_result")).toHaveLength(2);
  });

  it("plan mode denies state-changing tools with a propose-instead message", async () => {
    const t = await makeSession({ scripts: [toolCallScript([call("a", "order_test", { investigation_id: "ecg" })]), textScript("I would order an ECG.")], settingsPatch: { approvalMode: "plan" } });
    const events = await t.session.run(clinician("work up"));
    expect(msgsOf(events, "approval_request")).toHaveLength(0);
    const end = msgsOf(events, "tool_call_end")[0]!;
    expect(end.ok).toBe(false);
    expect(end.output).toMatch(/Plan mode/);
    expect(t.session.state.orders).toEqual([]);
  });

  it("practice scope hides tools from the model and denies them if called anyway", async () => {
    const t = await makeSession({ scripts: [toolCallScript([call("a", "order_test", { investigation_id: "ecg" })]), textScript("ok")], settingsPatch: { practiceScope: "history-only" } });
    const names = t.session.toolsFor("clinician").map((x) => x.name);
    expect(names).not.toContain("order_test");
    expect(names).not.toContain("intervene");
    expect(names).not.toContain("consult");
    expect(names).toContain("ask_patient");
    await t.session.run(clinician("order an ECG"));
    expect(t.provider!.requests[0]!.tools!.map((x) => x.name)).not.toContain("order_test");
    expect(msgsOf(t.events, "tool_call_end")[0]!.ok).toBe(false);
    expect(t.session.state.orders).toEqual([]);
  });

  it("a PreToolUse hook can block a call; PostToolUse context is appended as data", async () => {
    const t = await makeSession({
      scripts: [toolCallScript([call("a", "order_test", { investigation_id: "ct-head" }), call("b", "check_vitals", {})]), textScript("ok")],
      settingsPatch: { approvalMode: "bypass" },
    });
    t.session.hooks.on("PreToolUse", (input) => (input.hook_event_name === "PreToolUse" && input.tool_name === "order_test" ? { decision: "block", reason: "no CT for chest pain" } : undefined));
    t.session.hooks.on("PostToolUse", () => ({ additionalContext: "Monitor reviewed by the nurse." }));
    await t.session.run(clinician("go"));
    const results = t.provider!.requests[1]!.messages.at(-1)!.content as { content: string }[];
    expect(results[0]!.content).toMatch(/Blocked by a hook: no CT for chest pain/);
    expect(results[1]!.content).toMatch(/<hook_context source="handler#1">\nMonitor reviewed by the nurse.\n<\/hook_context>/);
    expect(t.session.state.orders).toEqual([]);
  });

  it("stops after maxToolRounds", async () => {
    const t = await makeSession({
      scripts: [toolCallScript([call("a", "check_vitals", {})]), toolCallScript([call("b", "check_vitals", {})]), toolCallScript([call("c", "check_vitals", {})])],
      settingsPatch: { agents: { clinician: { maxToolRounds: 2 } } },
    });
    const events = await t.session.run(clinician("loop"));
    expect(t.provider!.requests).toHaveLength(3);
    expect(msgsOf(events, "turn_aborted")[0]).toMatchObject({ reason: "max_tool_rounds" });
    expect(msgsOf(events, "tool_call_begin")).toHaveLength(2);
    const last = t.session.conversationOf("clinician").at(-1)!;
    expect(JSON.stringify(last)).toMatch(/tool-round limit/);
  });

  it("a Stop hook can force one more step", async () => {
    const t = await makeSession({ scripts: [textScript("Done."), textScript("Also: plan updated.")] });
    let stops = 0;
    t.session.hooks.on("Stop", (input) => {
      if (input.hook_event_name !== "Stop") return;
      stops++;
      return input.stop_hook_active ? undefined : { decision: "block", reason: "summarise your plan" };
    });
    const events = await t.session.run(clinician("finish up"));
    expect(stops).toBe(2);
    expect(t.provider!.requests).toHaveLength(2);
    expect(JSON.stringify(t.provider!.requests[1]!.messages.at(-1))).toContain("summarise your plan");
    expect(msgsOf(events, "turn_complete")[0]!.lastMessage).toBe("Also: plan updated.");
  });

  it("interrupt aborts a streaming turn and drops the partial assistant message", async () => {
    const t = await makeSession({ scripts: [textScript("The handover: a long, slow reply that streams in many small chunks.", { chunk: 4 })], delayMs: 15 });
    const done = t.session.run({ type: "user_message", text: "handover please", to: "nurse" });
    await waitFor(() => t.msgs("agent_message_delta").length > 0);
    t.session.submit({ type: "interrupt" });
    await done;
    expect(t.msgs("turn_aborted")[0]).toMatchObject({ agent: "nurse", reason: "interrupted" });
    expect(t.msgs("agent_message")).toHaveLength(0);
    const history = t.session.conversationOf("nurse");
    expect(history.map((m) => m.role)).toEqual(["user"]);
  });

  it("accumulates token usage", async () => {
    const usage = (input: number, output: number): StreamEvent[] => [
      { type: "start", model: "m" },
      { type: "text_delta", text: "Hi." },
      { type: "finish", stopReason: "end_turn", usage: { inputTokens: input, outputTokens: output } },
    ];
    const t = await makeSession({ scripts: [usage(10, 5), usage(7, 3)] });
    await t.session.run({ type: "user_message", text: "hello", to: "nurse" });
    await t.session.run({ type: "user_message", text: "again", to: "nurse" });
    const totals = t.msgs("token_usage");
    expect(totals.at(-1)!.total).toMatchObject({ inputTokens: 17, outputTokens: 8 });
  });
});

describe("runAgentTurn (direct)", () => {
  const host = (): LoopHost => ({
    toolContext: () => ({
      caseDef: undefined as never,
      facility: null,
      catalogs: [],
      locale: "en",
      agent: "nurse",
      state: () => undefined as never,
      dispatch: () => undefined as never,
      ask: async () => ({ text: "", grounded: [] }),
      updatePlan: () => undefined,
    }),
    authorize: async () => ({ kind: "allow" }),
  });

  it("retries retryable pre-content errors with api_retry events", async () => {
    const provider = new ScriptedProvider([[{ type: "error", error: { message: "overloaded", kind: "overloaded", retryable: true } }], textScript("ok")]);
    const emitted: EventMsg[] = [];
    const result = await runAgentTurn({
      host: host(),
      agent: { name: "nurse" },
      provider,
      system: [],
      history: [],
      userParts: [{ type: "text", text: "hi" }],
      tools: [],
      maxToolRounds: 2,
      turnId: "t1",
      emit: (m) => emitted.push(m),
      retry: { sleep: async () => undefined, random: () => 0.5 },
    });
    expect(result.text).toBe("ok");
    expect(emitted.filter((m) => m.type === "api_retry")).toHaveLength(1);
  });

  it("stops on refusal with a warning and on errors with stopReason error", async () => {
    const refusal = new ScriptedProvider([[{ type: "start", model: "m" }, { type: "finish", stopReason: "refusal", usage: { inputTokens: 1, outputTokens: 0 } }]]);
    const emitted: EventMsg[] = [];
    const r1 = await runAgentTurn({ host: host(), agent: { name: "nurse" }, provider: refusal, system: [], history: [], userParts: [{ type: "text", text: "x" }], tools: [], maxToolRounds: 1, turnId: "t", emit: (m) => emitted.push(m), retry: false });
    expect(r1.stopReason).toBe("refusal");
    expect(emitted.some((m) => m.type === "warning")).toBe(true);
    const failing = new ScriptedProvider([[{ type: "error", error: { message: "bad key", kind: "auth", retryable: false } }]]);
    const r2 = await runAgentTurn({ host: host(), agent: { name: "nurse" }, provider: failing, system: [], history: [], userParts: [{ type: "text", text: "x" }], tools: [], maxToolRounds: 1, turnId: "t", emit: () => undefined, retry: false });
    expect(r2.stopReason).toBe("error");
    expect(r2.error?.kind).toBe("auth");
    expect(r2.appended.map((m) => m.role)).toEqual(["user"]);
  });

  it("does not run tool calls cut off by max_tokens", async () => {
    const provider = new ScriptedProvider([
      [
        { type: "start", model: "m" },
        { type: "tool_call", id: "x", name: "check_vitals", args: {}, index: 0 },
        { type: "finish", stopReason: "max_tokens", usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ]);
    const r = await runAgentTurn({ host: host(), agent: { name: "nurse" }, provider, system: [], history: [], userParts: [{ type: "text", text: "x" }], tools: [], maxToolRounds: 3, turnId: "t", emit: () => undefined, retry: false });
    expect(r.stopReason).toBe("max_tokens");
    expect(r.toolCalls).toBe(0);
  });

  it("parses JSON objects from fenced or chatty model text", () => {
    expect(parseJsonObject('Sure! {"a": {"b": "}"}} trailing')).toEqual({ a: { b: "}" } });
    expect(parseJsonObject("```json\n{\"x\":1}\n```")).toEqual({ x: 1 });
    expect(parseJsonObject("no json")).toBeNull();
  });
});
