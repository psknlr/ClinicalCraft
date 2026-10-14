import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCase, type CaseDefinition, type DomainEvent } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase, makeSession, msgsOf, testSettings, counterIds, steppingClock } from "../__fixtures__/harness.js";
import type { AgentEvent, ApprovalDecision } from "../protocol.js";
import { textScript, toolCallScript } from "../providers/scripted.js";
import { MemoryTranscript, replayTranscript } from "../transcript.js";
import { isDurableEvent } from "./events.js";
import { createSession } from "./session.js";

function loadSmzl(): CaseDefinition | null {
  const path = fileURLToPath(new URL("../../../content/cases/smzl-lung-adeno/case.json", import.meta.url));
  if (!existsSync(path)) return null;
  const parsed = parseCase(JSON.parse(readFileSync(path, "utf8")) as unknown);
  return parsed.ok ? parsed.value : null;
}

function answerApprovals(t: Awaited<ReturnType<typeof makeSession>>, decision: ApprovalDecision, reason?: string): void {
  t.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision, ...(reason ? { reason } : {}) });
  });
}

const domain = (events: readonly AgentEvent[]): DomainEvent[] => msgsOf(events, "clinical_event").map((e) => e.event);

describe("session start-up", () => {
  it("replays start-up events to the first events() iterator", async () => {
    const t = await makeSession();
    const it = t.session.events()[Symbol.asyncIterator]();
    const first = await it.next();
    expect(first.value!.msg).toMatchObject({ type: "session_configured", caseId: "mini-chest-pain", provider: "offline", offline: true, approvalMode: "default", interlocutor: "patient" });
    expect(((await it.next()).value!.msg as { type: string }).type).toBe("state_snapshot");
    await t.session.close();
    for (;;) if ((await it.next()).done) break;
  });

  it("lists agents (no companion without one) and built-in + custom commands", async () => {
    const t = await makeSession({ commands: [{ name: "sbar", description: "SBAR handover", source: "project", template: "Give an SBAR for $ARGUMENTS", agent: "nurse" }] });
    expect(t.session.availableAgents()).toEqual(["patient", "nurse", "radiologist", "pathologist", "attending", "examiner", "clinician"]);
    expect(t.session.commands().map((c) => c.name)).toContain("sbar");
    expect(t.session.commands().map((c) => c.name)).toContain("autopilot");
  });
});

describe("learner clinical actions", () => {
  it("gates a high-risk intervention with approval_request and applies it when approved", async () => {
    const t = await makeSession();
    answerApprovals(t, "approved");
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const events = await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "lysis" } });
    const request = msgsOf(events, "approval_request")[0]!;
    expect(request).toMatchObject({ agent: "learner", tool: "intervene", risk: "high", allowSession: false, ruleId: "tool.always-ask" });
    expect(t.session.state.interventions.map((i) => i.interventionId)).toEqual(["lysis"]);
  });

  it("does not apply a denied action and reports it", async () => {
    const t = await makeSession();
    answerApprovals(t, "denied", "not now");
    const events = await t.session.run({ type: "clinical_action", action: { type: "intervene", interventionId: "lysis" } });
    expect(t.session.state.interventions).toEqual([]);
    expect(msgsOf(events, "error")[0]).toMatchObject({ code: "permission_denied" });
  });

  it("does not gate notes/hints and rejects out-of-scope actions", async () => {
    const t = await makeSession({ settingsPatch: { practiceScope: "history-only" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "clinical_action", action: { type: "note", text: "consider ACS" } });
    const events = await t.session.run({ type: "clinical_action", action: { type: "order", investigationId: "ecg" } });
    expect(msgsOf(events, "approval_request")).toHaveLength(0);
    expect(msgsOf(events, "error")[0]!.message).toMatch(/practice scope/);
    expect(t.session.state.orders).toEqual([]);
    expect(t.session.state.notes).toHaveLength(1);
  });

  it("a button ask makes the patient speak the authored answer", async () => {
    const t = await makeSession();
    const events = await t.session.run({ type: "clinical_action", action: { type: "ask", itemId: "smoking", via: "button" } });
    expect(msgsOf(events, "agent_message")[0]).toMatchObject({ agent: "patient", text: "I've smoked a pack a day for 30 years.", grounded: ["smoking"] });
    expect(t.session.state.started).toBe(true);
  });

  it("rejects malformed actions", async () => {
    const t = await makeSession();
    const events = await t.session.run({ type: "clinical_action", action: { type: "order" } as never });
    expect(msgsOf(events, "error")[0]).toMatchObject({ code: "invalid_action" });
  });
});

describe("domain events → notifications, nurse lines, snapshots, hooks", () => {
  it("phones through a critical result, announces scenario events and objective completion", async () => {
    const t = await makeSession();
    const seen: string[] = [];
    t.session.hooks.on("ClinicalEvent", (input) => {
      if (input.hook_event_name === "ClinicalEvent") seen.push(input.event.type);
    });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await t.session.run({ type: "clinical_action", action: { type: "order", investigationId: "ecg" } });
    const waited = await t.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 5 } });
    expect(domain(waited).some((e) => e.type === "result.ready" && e.critical)).toBe(true);
    expect(msgsOf(waited, "notification")[0]).toMatchObject({ level: "critical", title: "Critical result" });
    expect(msgsOf(waited, "agent_message")[0]).toMatchObject({ agent: "nurse", speaker: "Nurse Wang" });
    expect(msgsOf(waited, "agent_message")[0]!.text).not.toContain("ST elevation");
    const snap = msgsOf(waited, "state_snapshot").at(-1)!;
    expect(snap.state.clock).toBe(5);
    expect(snap.progress.total).toBe(3);
    expect(snap.vitals.vitals.spo2).toBeLessThan(96);

    const later = await t.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 30 } });
    expect(msgsOf(later, "agent_message").some((m) => m.text === "The patient says the pain is getting worse.")).toBe(true);
    expect(msgsOf(later, "notification").some((n) => n.title === "Monitor alarm")).toBe(true);

    await t.session.run({ type: "user_message", text: "When did the chest pain start?" });
    const done = await t.session.run({ type: "user_message", text: "What does the pain feel like?" });
    expect(msgsOf(done, "notification").some((n) => n.title === "Objective completed" && n.body === "Take a history")).toBe(true);
    await new Promise((r) => setTimeout(r, 10));
    expect(seen).toEqual(expect.arrayContaining(["session.started", "order.placed", "result.ready", "objective.completed"]));
  });

  it("advanceRealTime moves a simulated clock by realtimeScale", async () => {
    const caseDef = loadMiniCase((c) => {
      c.clock = { ...c.clock!, realtimeScale: 2 };
    });
    const t = await makeSession({ caseDef });
    expect(t.session.advanceRealTime(60_000)).toBeNull(); // not started
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    expect(t.session.advanceRealTime(3_000)).toBeNull(); // 0.1 min accumulates
    t.session.advanceRealTime(60_000);
    expect(t.session.state.clock).toBeCloseTo(2.1, 5);
  });
});

describe("NPC agents offline", () => {
  it("nurse: handover, vitals and pending results without result content", async () => {
    const t = await makeSession();
    await t.session.run({ type: "clinical_action", action: { type: "order", investigationId: "troponin" } });
    const events = await t.session.run({ type: "user_message", text: "@nurse can I get a handover?" });
    const text = msgsOf(events, "agent_message")[0]!.text;
    expect(text).toContain("58-year-old man with 2 hours of chest pain.");
    expect(text).toContain("Troponin");
    expect(text).not.toContain("85 ng/L");
    const vitals = msgsOf(await t.session.run({ type: "user_message", text: "@nurse what's the blood pressure?" }), "agent_message")[0]!.text;
    expect(vitals).toMatch(/BP 138\/84/);
  });

  it("radiologist: only results the learner has read, within remit", async () => {
    const t = await makeSession();
    const none = msgsOf(await t.session.run({ type: "user_message", text: "@radiologist anything on the CT?" }), "agent_message")[0]!.text;
    expect(none).toMatch(/haven't retrieved any imaging/);
    await t.session.run({ type: "clinical_action", action: { type: "order", investigationId: "ct-chest" } });
    await t.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 20 } });
    const unread = msgsOf(await t.session.run({ type: "user_message", text: "@radiologist ct chest?" }), "agent_message")[0]!.text;
    expect(unread).not.toContain("dissection");
    await t.session.run({ type: "clinical_action", action: { type: "read", investigationId: "ct-chest" } });
    const read = msgsOf(await t.session.run({ type: "user_message", text: "@radiologist ct chest?" }), "agent_message")[0]!.text;
    expect(read).toContain("No aortic dissection.");
    expect(read).toContain("Interprets only reports already reviewed.");
  });

  it("attending: Socratic hint for the current objective (records a hint)", async () => {
    const t = await makeSession();
    const text = msgsOf(await t.session.run({ type: "user_message", text: "@attending I'm stuck" }), "agent_message")[0]!.text;
    expect(text).toContain("Ask when the pain started and what it feels like.");
    expect(text).toMatch(/\?$/);
    expect(t.session.state.hints).toBe(1);
  });

  it("warns once when an agent falls back offline for lack of a key", async () => {
    const t = await makeSession({ settingsPatch: { provider: "anthropic" }, resolveProvider: (id, model) => ({ id, wire: "anthropic-messages", model: model ?? "claude-opus-5-5" }) });
    await t.session.run({ type: "user_message", text: "@nurse hi" });
    await t.session.run({ type: "user_message", text: "@nurse hi again" });
    expect(t.msgs("warning").filter((w) => /nurse/.test(w.message) && /API key/.test(w.message))).toHaveLength(1);
  });
});

describe("autopilot", () => {
  it("offline clinician replays the reference walkthrough through the tool path", async () => {
    const t = await makeSession();
    const events = await t.session.run({ type: "autopilot" });
    expect(t.session.state.finished).toBe(true);
    expect(t.session.state.decisions).toHaveProperty("dx");
    const narration = msgsOf(events, "agent_message").filter((m) => m.agent === "clinician").map((m) => m.text);
    expect(narration).toContain("Ordering: ECG");
    expect(msgsOf(events, "tool_call_begin").map((b) => b.tool)).toEqual(["ask_patient", "ask_patient", "order_test", "wait", "read_result", "answer_decision", "finish_case"]);
    expect(msgsOf(events, "agent_message").some((m) => m.agent === "patient" && m.text.startsWith("About two hours ago"))).toBe(true);
  });

  it("offline autopilot respects approvals (strict mode asks; abort stops it)", async () => {
    const t = await makeSession({ settingsPatch: { approvalMode: "strict" } });
    answerApprovals(t, "abort");
    const events = await t.session.run({ type: "autopilot" });
    expect(msgsOf(events, "turn_aborted")[0]).toMatchObject({ agent: "clinician", reason: "denied" });
    expect(t.session.state.finished).toBe(false);
  });

  it("LLM clinician: drives the case with tools until finished", async () => {
    const t = await makeSession({
      scripts: [
        toolCallScript([{ id: "1", name: "order_test", args: { investigation_id: "ecg" } }]),
        toolCallScript([{ id: "2", name: "wait", args: { minutes: 5 } }]),
        toolCallScript([{ id: "3", name: "read_result", args: { investigation_id: "ecg" } }]),
        textScript("ECG shows inferior STEMI."),
      ],
    });
    const events = await t.session.run({ type: "autopilot", goal: "Get an ECG", maxTurns: 1 });
    expect(t.session.state.seen).toContain("ecg@ed");
    expect(JSON.stringify(t.provider!.requests[0]!.messages[0])).toContain("Get an ECG");
    expect(msgsOf(events, "turn_complete")[0]).toMatchObject({ agent: "clinician", lastMessage: "ECG shows inferior STEMI." });
  });

  const smzl = loadSmzl();
  it.skipIf(!smzl)("offline autopilot completes the SMZL case (all objectives and decisions)", async () => {
    const t = await makeSession({ caseDef: smzl!, settingsPatch: { locale: "zh-CN" } });
    await t.session.run({ type: "autopilot", maxTurns: 10 });
    const s = t.session.state;
    expect(s.finished).toBe(true);
    for (const d of smzl!.decisions) expect(s.decisions).toHaveProperty(d.id);
    for (const o of smzl!.objectives) expect(s.objectivesDone).toHaveProperty(o.id);
    expect(t.msgs("warning").filter((w) => /grounding/.test(w.message))).toEqual([]);
  });
});

describe("assessment", () => {
  it("offline examiner: deterministic report, judged items stay null", async () => {
    const t = await makeSession();
    await t.session.run({ type: "autopilot" });
    const events = await t.session.run({ type: "assess" });
    const a = msgsOf(events, "assessment")[0]!;
    expect(a.judged).toEqual([]);
    expect(a.report.rubric.find((r) => r.id === "rb-comm")!.met).toBeNull();
    expect(a.report.score.percent).toBe(100);
    expect(a.narrative).toMatch(/not a validated competency score/);
  });

  it("LLM examiner: verified quotes count, unverifiable ones are downgraded", async () => {
    const verdict = (met: boolean, evidence: string) =>
      textScript(JSON.stringify({ items: [{ id: "rb-comm", met, evidence }], narrative: "Clear explanation; next time check understanding." }));
    const t = await makeSession({
      scripts: [textScript(JSON.stringify({ say: "OK, doctor.", nonverbal: null, usedFactIds: [], affectHint: "calmer" })), verdict(true, "your heart is not getting enough blood"), verdict(true, "a sentence never said")],
    });
    await t.session.run({ type: "user_message", text: "Your heart is not getting enough blood, so we will treat it now." });
    const first = msgsOf(await t.session.run({ type: "assess" }), "assessment")[0]!;
    expect(first.judged).toEqual([{ id: "rb-comm", met: true, evidence: "your heart is not getting enough blood" }]);
    expect(first.narrative).toBe("Clear explanation; next time check understanding.");
    const second = msgsOf(await t.session.run({ type: "assess" }), "assessment")[0]!;
    expect(second.judged[0]!.met).toBe(false);
    const examinerRequest = t.provider!.requests[1]!;
    expect(examinerRequest.responseFormat?.name).toBe("examiner_verdict");
    expect(JSON.stringify(examinerRequest.messages)).toContain("LEARNER: Your heart is not getting enough blood");
  });
});

describe("transcript, snapshot and resume", () => {
  it("records ops, actions, messages and durable events, and resume reproduces state", async () => {
    const sink = new MemoryTranscript();
    const t = await makeSession({ transcript: sink, sessionId: "s-1" });
    await t.session.run({ type: "user_message", text: "When did the chest pain start?" });
    await t.session.run({ type: "clinical_action", action: { type: "order", investigationId: "ecg" } });
    await t.session.run({ type: "clinical_action", action: { type: "advance-time", minutes: 5 } });
    await t.session.run({ type: "clinical_action", action: { type: "read", investigationId: "ecg" } });
    await t.session.run({ type: "clinical_action", action: { type: "answer", decisionId: "dx", optionIds: ["pe"] } });
    await t.session.run({ type: "user_message", text: "@nurse handover please" });
    await t.session.run({ type: "configure", patch: { approvalMode: "auto", apiKey: "sk-secret" } as never });
    await t.session.close();

    const types = new Set(sink.items.map((i) => i.type));
    expect([...types]).toEqual(expect.arrayContaining(["session_meta", "op", "action", "message", "event"]));
    expect(sink.items.every((i, k) => i.ordinal === k)).toBe(true);
    expect(JSON.stringify(sink.items)).not.toContain("sk-secret");
    for (const item of sink.ofType("event")) expect(isDurableEvent(item.payload.msg)).toBe(true);
    expect(sink.ofType("event").some((i) => i.payload.msg.type === "agent_message_delta")).toBe(false);

    const replayed = replayTranscript(sink.items);
    expect(replayed.sessionMeta).toMatchObject({ sessionId: "s-1", caseId: "mini-chest-pain" });
    const resumed = await createSession({
      caseDef: loadMiniCase(),
      settings: testSettings({ locale: "en" }),
      resume: { sessionId: "s-1", actions: replayed.actions, messages: replayed.messages },
      newId: counterIds("r"),
      now: steppingClock(),
    });
    expect(resumed.id).toBe("s-1");
    expect(resumed.state).toEqual(t.session.state);
    expect(resumed.conversationOf("patient")).toEqual(t.session.conversationOf("patient"));
    expect(resumed.conversationOf("nurse")).toEqual(t.session.conversationOf("nurse"));
    expect(resumed.snapshot().actions).toEqual(t.session.snapshot().actions);
    // a resumed patient does not repeat the opening line
    const again = await resumed.run({ type: "user_message", text: "" });
    expect(msgsOf(again, "agent_message")[0]!.text).toBe("Yes, doctor?");
  });

  it("snapshot carries actions, conversations and the plan", async () => {
    const t = await makeSession({ scripts: [toolCallScript([{ id: "p", name: "update_workup", args: { plan: [{ text: "ECG now", status: "in_progress" }], explanation: "ACS likely" } }]), textScript("ok")] });
    const events = await t.session.run({ type: "user_message", text: "plan?", to: "clinician" });
    expect(msgsOf(events, "plan_updated")[0]).toMatchObject({ agent: "clinician", explanation: "ACS likely" });
    const snap = t.session.snapshot();
    expect(snap.format).toBe("clinicalcraft-session@1");
    expect(snap.plan).toEqual([{ text: "ECG now", status: "in_progress" }]);
    expect(Object.keys(snap.messages)).toContain("clinician");
  });
});

describe("configure, compact, dynamic tools, shutdown", () => {
  it("configure changes runtime settings and validates them", async () => {
    const t = await makeSession();
    const events = await t.session.run({ type: "configure", patch: { approvalMode: "strict", locale: "zh-CN", interlocutor: "nurse" } });
    expect(msgsOf(events, "config_changed")[0]!.patch).toMatchObject({ approvalMode: "strict" });
    expect(t.session.settings.approvalMode).toBe("strict");
    const reply = msgsOf(await t.session.run({ type: "user_message", text: "血压多少？" }), "agent_message")[0]!;
    expect(reply.agent).toBe("nurse");
    expect(reply.text).toContain("血压");
    const bad = await t.session.run({ type: "configure", patch: { approvalMode: "yolo" as never } });
    expect(msgsOf(bad, "error")[0]).toMatchObject({ code: "invalid_config" });
  });

  it("compact summarises a long conversation (PreCompact hook, compacted event, transcript item)", async () => {
    const sink = new MemoryTranscript();
    const t = await makeSession({ transcript: sink });
    let hooked = 0;
    t.session.hooks.on("PreCompact", () => void hooked++);
    for (let i = 0; i < 6; i++) await t.session.run({ type: "user_message", text: `@nurse update ${i}` });
    const before = t.session.conversationOf("nurse").length;
    const events = await t.session.run({ type: "compact", agent: "nurse" });
    const compacted = msgsOf(events, "compacted")[0]!;
    expect(compacted.agent).toBe("nurse");
    expect(compacted.afterTokens).toBeLessThan(compacted.beforeTokens + 50);
    expect(t.session.conversationOf("nurse").length).toBeLessThan(before);
    expect(hooked).toBe(1);
    expect(sink.ofType("compacted")).toHaveLength(1);
    const replayed = replayTranscript(sink.items);
    expect(replayed.messages.nurse!.length).toBeGreaterThan(0);
  });

  it("walk_to round-trips through dynamic_tool_call / dynamic_tool_response", async () => {
    const t = await makeSession({ dynamicTools: ["walk_to"], scripts: [toolCallScript([{ id: "w", name: "walk_to", args: { target: "ecg-12lead" } }]), textScript("Arrived.")] });
    t.session.subscribe((e) => {
      if (e.msg.type === "dynamic_tool_call") t.session.submit({ type: "dynamic_tool_response", callId: e.msg.callId, ok: true, output: "At the ECG cart." });
    });
    const events = await t.session.run({ type: "user_message", text: "go to the ECG", to: "clinician" });
    expect(msgsOf(events, "dynamic_tool_call")[0]).toMatchObject({ tool: "walk_to", args: { target: "ecg-12lead" } });
    expect(msgsOf(events, "tool_call_end")[0]).toMatchObject({ ok: true, output: "At the ECG cart." });
  });

  it("shutdown runs SessionEnd, emits shutdown_complete and ends events()", async () => {
    const t = await makeSession();
    const ended: string[] = [];
    t.session.hooks.on("SessionEnd", (input) => {
      if (input.hook_event_name === "SessionEnd") ended.push(input.reason);
    });
    const collected: string[] = [];
    const consumer = (async () => {
      for await (const e of t.session.events()) collected.push(e.msg.type);
    })();
    const events = await t.session.run({ type: "shutdown" });
    await consumer;
    expect(msgsOf(events, "shutdown_complete")).toHaveLength(1);
    expect(ended).toEqual(["shutdown"]);
    expect(collected.at(-1)).toBe("shutdown_complete");
    const after = await t.session.run({ type: "user_message", text: "hello?" });
    expect(msgsOf(after, "error")[0]).toMatchObject({ code: "closed" });
  });
});
