/**
 * Who speaks, to whom, in which window (docs/PROTOCOL.md §4, EMBODIED §8.4):
 *
 * - the speaking animation goes to the one who spoke — the patient, their companion (never the patient's mouth for
 *   the companion's words), the colleague the line names (never whoever's window is open now) — and a narration
 *   moves no mouth (a patient who cannot speak, a movement carried out);
 * - two colleagues of one role keep two conversation windows: each shows its own thread;
 * - the movement sentences the UI offers are understood by the session's parser in both languages.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { movementIntent, staffIntent, type AgentEvent } from "@clinicalcraft/agent";
import { parseCase } from "@clinicalcraft/core";
import { setLocale, tr } from "../i18n/index.js";
import { delegateTasks } from "../ui/panels/conversation.js";
import { SessionStore } from "./store.js";
import { lineSpeaker } from "./world-bridge.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const caseJson = JSON.parse(fs.readFileSync(path.resolve(here, "../../../content/cases/pediatric-asthma/case.json"), "utf8"));
const parsed = parseCase(caseJson);
if (!parsed.ok) throw new Error("pediatric-asthma does not parse");
const caseDef = parsed.value;

afterEach(() => setLocale("zh-CN"));

describe("the speaking animation follows the speaker", () => {
  const ctx = { slotId: "resus-1", staffFor: () => "ed-nurse", activeStaff: () => "triage-nurse" };

  it("the patient and the companion each move their own mouth; a narration none", () => {
    expect(lineSpeaker({ agent: "patient" }, ctx)).toEqual({ kind: "patient", id: "resus-1" });
    expect(lineSpeaker({ agent: "companion" }, ctx)).toEqual({ kind: "companion", id: "resus-1" });
    expect(lineSpeaker({ agent: "patient", grounding: "narrated" }, ctx)).toBeNull();
    expect(lineSpeaker({ agent: "companion", grounding: "narrated" }, ctx)).toBeNull();
  });

  it("a colleague: the staff id of the line, else of its turn, else the one who stands for the agent — the open window last", () => {
    expect(lineSpeaker({ agent: "nurse", staffId: "ward-nurse" }, ctx)).toEqual({ kind: "staff", id: "ward-nurse" });
    expect(lineSpeaker({ agent: "nurse" }, { ...ctx, turnStaff: "paramedic" })).toEqual({ kind: "staff", id: "paramedic" });
    expect(lineSpeaker({ agent: "nurse" }, ctx)).toEqual({ kind: "staff", id: "ed-nurse" });
    expect(lineSpeaker({ agent: "nurse" }, { ...ctx, staffFor: () => null })).toEqual({ kind: "staff", id: "triage-nurse" });
  });
});

describe("two colleagues of one role, two windows", () => {
  it("each window shows its colleague's thread and the lines that name nobody", () => {
    const store = new SessionStore(caseDef);
    let n = 0;
    const event = (id: string, msg: AgentEvent["msg"]) => store.event({ id, msg, seq: ++n } as AgentEvent);
    store.op("s1", { type: "user_message", text: "Hello A", to: "nurse", staff: "triage-nurse" });
    event("s1", { type: "turn_started", turnId: "t1", agent: "nurse", speaker: "Nurse A", staffId: "triage-nurse" });
    event("s1", { type: "agent_message_delta", turnId: "t1", agent: "nurse", delta: "Hi, " });
    event("s1", { type: "agent_message", turnId: "t1", agent: "nurse", speaker: "Nurse A", text: "Hi, I'm A", grounded: [], staffId: "triage-nurse" });
    store.op("s2", { type: "user_message", text: "Hello B", to: "nurse", staff: "staff:ed-nurse" });
    event("s2", { type: "agent_message", turnId: "t2", agent: "nurse", speaker: "Nurse B", text: "Hi, I'm B", grounded: [], staffId: "ed-nurse" });
    // an alarm call by "the nurse" (no one in particular)
    event("", { type: "agent_message", turnId: "t3", agent: "nurse", speaker: "Nurse", text: "SpO2 is dropping!", grounded: [] });
    const nurse = new Set(["nurse"]);
    const a = store.chatFor(nurse, "triage-nurse").map((m) => m.text);
    const b = store.chatFor(nurse, "ed-nurse").map((m) => m.text);
    expect(a).toEqual(["Hello A", "Hi, I'm A", "SpO2 is dropping!"]);
    expect(b).toEqual(["Hello B", "Hi, I'm B", "SpO2 is dropping!"]);
    // the streamed line was labelled with the colleague's name from the start
    expect(store.chatFor(nurse, "triage-nurse")[1]).toMatchObject({ speaker: "Nurse A", staffId: "triage-nurse" });
    // every window of the role (no colleague): everything
    expect(store.chatFor(nurse).length).toBe(5);
  });
});

describe("the movement sentences the UI offers are understood (both languages)", () => {
  for (const locale of ["en", "zh-CN"] as const) {
    it(locale, () => {
      setLocale(locale);
      const place = locale === "en" ? "CT scanner" : "CT扫描仪";
      expect(movementIntent(tr("move.follow"), "patient")).toEqual({ kind: "follow", destination: null });
      expect(movementIntent(tr("move.wait"), "patient")).toEqual({ kind: "wait" });
      expect(movementIntent(tr("move.back"), "patient")).toEqual({ kind: "home" });
      expect(movementIntent(tr("move.withMe", { place }), "patient")).toEqual({ kind: "follow", destination: place });
      expect(movementIntent(tr("move.take", { place }), "staff")).toEqual({ kind: "take", destination: place });
      expect(movementIntent(tr("move.takeBack"), "staff")).toEqual({ kind: "take", destination: "home" });
      expect(movementIntent(tr("pose.lying"), "patient")).toEqual({ kind: "posture", posture: "lying" });
      expect(movementIntent(tr("pose.sitting"), "patient")).toEqual({ kind: "posture", posture: "sitting" });
      expect(movementIntent(tr("pose.standing"), "patient")).toEqual({ kind: "posture", posture: "standing" });
      for (const task of ["attach_monitor", "record_ecg", "obtain_iv_access"] as const) expect(staffIntent(tr(`req.say.${task}`)), task).toEqual({ kind: "task", task });
      expect(staffIntent(tr("req.say.come"))).toEqual({ kind: "come", to: "patient" });
      expect(staffIntent(tr("req.say.back"))).toEqual({ kind: "back" });
    });
  }
});

describe("the chips a colleague's window offers follow their role's scope of practice", () => {
  it("nurses and paramedics: the bedside tasks; a porter, a receptionist, a radiologist: none", () => {
    expect(delegateTasks("nurse")).toEqual(["attach_monitor", "record_ecg", "obtain_iv_access"]);
    expect(delegateTasks("paramedic")).toEqual(["attach_monitor", "record_ecg", "obtain_iv_access"]);
    expect(delegateTasks("attending")).toEqual(["attach_monitor", "record_ecg", "obtain_iv_access"]);
    for (const role of ["porter", "receptionist", "radiologist", "lab-tech", "pharmacist"]) expect(delegateTasks(role), role).toEqual([]);
  });
});
