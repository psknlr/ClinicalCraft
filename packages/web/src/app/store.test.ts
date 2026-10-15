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
