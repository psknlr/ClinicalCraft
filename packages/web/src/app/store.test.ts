/**
 * SessionStore folding (no DOM): slash-command output and turn warnings land
 * in the conversation they were typed in, and only there.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentEvent, EventMsg } from "@clinicalcraft/agent";
import { parseCase } from "@clinicalcraft/core";
import { SessionStore } from "./store.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const parsed = parseCase(JSON.parse(fs.readFileSync(path.resolve(here, "../../../content/cases/stemi-inferior-rv/case.json"), "utf8")));
if (!parsed.ok) throw new Error("stemi-inferior-rv does not parse");
const caseDef = parsed.value;

let seq = 0;
const ev = (id: string, msg: EventMsg): AgentEvent => ({ id, seq: ++seq, msg });
const patientView = new Set(["patient", "companion"]);
const nurseView = new Set(["nurse"]);

describe("SessionStore conversation lines", () => {
  it("shows a slash command and its output in the conversation it was typed in", () => {
    const store = new SessionStore(caseDef);
    store.op("s1", { type: "user_message", text: "/vitals" }, "nurse");
    store.event(ev("s1", { type: "command_output", name: "vitals", text: "HR 54 · BP 96/62" }));
    const nurse = store.chatFor(nurseView);
    expect(nurse.map((m) => [m.role, m.tone, m.text])).toEqual([
      ["learner", "command", "/vitals"],
      ["system", "command", "HR 54 · BP 96/62"],
    ]);
    expect(nurse[1].speaker).toBe("/vitals");
    expect(store.chatFor(patientView)).toEqual([]);
  });

  it("attaches a turn's warning (model failure → deterministic fallback) to that conversation", () => {
    const store = new SessionStore(caseDef);
    store.op("s2", { type: "user_message", text: "Where does it hurt?", to: "patient" });
    store.event(ev("s2", { type: "warning", message: 'Agent "patient" model error (invalid x-api-key); answered with the deterministic responder.' }));
    store.event(ev("s9", { type: "warning", message: "unrelated background warning" }));
    const chat = store.chatFor(patientView);
    expect(chat.map((m) => m.tone)).toEqual(["speech", "error"]);
    expect(chat[1].text).toContain("deterministic responder");
    expect(store.viewOf("s2")).toBe("patient");
    expect(store.viewOf("s9")).toBeNull();
    expect(store.chatFor(nurseView)).toEqual([]);
  });

  it("un-escapes //text and keeps @role addressing", () => {
    const store = new SessionStore(caseDef);
    store.op("s3", { type: "user_message", text: "//not a command" });
    store.op("s4", { type: "user_message", text: "@nurse is the troponin back?" });
    expect(store.chat.map((m) => [m.agent, m.text])).toEqual([
      ["patient", "/not a command"],
      ["nurse", "is the troponin back?"],
    ]);
  });
});

describe("SessionStore in embodied mode (world actions)", () => {
  const result = (actionId: string, status: "completed" | "failed", message: string, extra: Record<string, unknown> = {}) => ({ actionId, status, message, worldVersion: 3, events: [], ...extra }) as never;

  it("shows the learner's own device operations as action feedback in the conversation they came from", () => {
    const store = new SessionStore(caseDef);
    store.op("w1", { type: "world_action", request: { actionId: "a1", actorId: "actor:clinician", operation: "attach", targetId: "eq:resus1-monitor" } } as never, "patient");
    store.event(ev("w1", { type: "world_action_result", result: result("a1", "completed", "Monitor attached.") }));
    store.op("w2", { type: "world_action", request: { actionId: "a2", actorId: "actor:clinician", operation: "record", targetId: "eq:ecg-cart" } } as never, "patient");
    store.event(ev("w2", { type: "world_action_result", result: result("a2", "failed", "The ECG cart is 12 m away.", { errorCode: "NOT_IN_RANGE" }) }));
    const chat = store.chatFor(patientView);
    expect(chat.map((m) => [m.tone, m.text])).toEqual([
      ["note", "Monitor attached."],
      ["error", "The ECG cart is 12 m away."],
    ]);
    expect(store.failureOf("w1")).toBeUndefined();
    expect(store.failureOf("w2")).toBe("The ECG cart is 12 m away.");
    expect(store.worldResults.get("a2")?.submission).toBe("w2");
  });

  it("keeps other actors' results and completed walks out of the conversation (the trace shows them)", () => {
    const store = new SessionStore(caseDef);
    // an agent's world tool call (no world_action op of the learner)
    store.event(ev("t1", { type: "world_action_result", result: result("b1", "completed", "Nurse Zhou attached the monitor.") }));
    // the learner's walk that arrived
    store.op("w3", { type: "world_action", request: { actionId: "b2", actorId: "actor:clinician", operation: "navigate", goal: { kind: "point", x: 1, z: 2 } } } as never);
    store.event(ev("w3", { type: "world_action_result", result: result("b2", "completed", "Arrived.", { navigation: { ok: true, path: [] } }) }));
    expect(store.chat).toEqual([]);
    expect([...store.worldResults.keys()]).toEqual(["b1", "b2"]);
  });

  it("routes a spatial refusal of a clinical action to the patient's conversation", () => {
    const store = new SessionStore(caseDef);
    store.event(ev("c1", { type: "error", message: "You are 9 m from the patient: go to the bedside first.", code: "SPATIAL_REQUIREMENT_UNMET" }));
    expect(store.chatFor(patientView).map((m) => [m.tone, m.text])).toEqual([["error", "You are 9 m from the patient: go to the bedside first."]]);
    expect(store.failureOf("c1")).toContain("bedside");
  });

  it("logs refusals decided by the UI and resolves aliases of deferred submissions", () => {
    const store = new SessionStore(caseDef);
    store.refused("ui-1", "The ECG cart is in the corridor.");
    expect(store.failureOf("ui-1")).toBe("The ECG cart is in the corridor.");
    expect(store.chat.at(-1)?.tone).toBe("error");
    // an action submitted after an auto-approach: the id handed out earlier finds its outcome
    store.op("s7", { type: "act", action: { type: "order_test", testId: "ecg-12lead" } } as never);
    store.event(ev("s7", { type: "error", message: "not allowed" }));
    expect(store.failureOf("ui-2")).toBeUndefined();
    store.linkSubmission("ui-2", "s7");
    expect(store.failureOf("ui-2")).toBe("not allowed");
  });

  it("bounds the world results it keeps", () => {
    const store = new SessionStore(caseDef);
    for (let i = 0; i < 450; i++) store.event(ev(`x${i}`, { type: "world_action_result", result: result(`r${i}`, "completed", "") }));
    expect(store.worldResults.size).toBe(400);
    expect(store.worldResults.has("r449")).toBe(true);
    expect(store.worldResults.has("r0")).toBe(false);
  });
});

describe("SessionStore: spatial refusals shown to the learner", () => {
  const lead = "Not here: you are 9.0 m from the patient; walk to the bedside.";
  const next = 'Go there first: navigate_to {"kind":"interact","id":"patient:resus-1"} — Resus 1.';

  it("keeps the model-facing tool hint out of a refused slash command's output", () => {
    const store = new SessionStore(caseDef);
    store.op("v1", { type: "user_message", text: "/vitals" }, "patient");
    store.event(ev("v1", { type: "command_output", name: "vitals", text: `${lead}\n${next}`, data: { ok: false, data: { code: "SPATIAL_REQUIREMENT_UNMET", message: "you are 9.0 m from the patient", hint: { goal: { kind: "interact", id: "patient:resus-1" }, label: "Resus 1" } } } }));
    const out = store.chatFor(patientView).at(-1)!;
    expect(out.text).toBe(lead);
    expect(out.tone).toBe("error");
    expect(store.failureOf("v1")).toBe(lead);
  });

  it("keeps it out of a refused clinical action too", () => {
    const store = new SessionStore(caseDef);
    store.event(ev("c2", { type: "error", message: `${lead}\n${next}`, code: "SPATIAL_REQUIREMENT_UNMET" }));
    expect(store.chatFor(patientView).map((m) => m.text)).toEqual([lead]);
  });

  it("leaves other command output as it is", () => {
    const store = new SessionStore(caseDef);
    store.op("v2", { type: "user_message", text: "/vitals" }, "patient");
    store.event(ev("v2", { type: "command_output", name: "vitals", text: "HR 54\nBP 98/62", data: { ok: true, data: null } }));
    expect(store.chatFor(patientView).at(-1)).toMatchObject({ text: "HR 54\nBP 98/62", tone: "command" });
  });
});
