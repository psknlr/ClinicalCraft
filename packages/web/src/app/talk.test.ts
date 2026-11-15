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
import { setLocale, tr } from "../i18n/index.js";
import { observeField, parseCase, procedureFor } from "@clinicalcraft/core";
import { delegateTasks, theatreLine, theatreOffer } from "../ui/panels/conversation.js";
import { placeSession } from "../ui/panels/__fixtures__/team-play.js";
import type { AppSession } from "./session.js";
import { delegateLine, delegationSummary } from "./staff.js";
import { SessionStore } from "./store.js";
import { lineSpeaker } from "./world-bridge.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const caseJson = JSON.parse(fs.readFileSync(path.resolve(here, "../../../content/cases/pediatric-asthma/case.json"), "utf8"));
const parsed = parseCase(caseJson);
if (!parsed.ok) throw new Error("pediatric-asthma does not parse");
const caseDef = parsed.value;

const open: AppSession[] = [];
afterEach(async () => {
  setLocale("zh-CN");
  for (const app of open.splice(0)) await app.close();
});

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

describe("the chips a colleague's window offers follow what the session says they may be handed (RoleState.delegable)", () => {
  /** Every colleague's state as the session knows it, by staff id. */
  const states = (app: AppSession) => new Map(app.session.staffStates().map((r) => [r.actorId.slice("staff:".length), r]));
  /** The field as the operator sees it, the case's instruments, and what the offers are worked out from (the window's `FieldSeat`). */
  const fieldOf = (app: AppSession) => {
    const s = app.session.state;
    const def = procedureFor(app.session.caseDef, s)!;
    return { v: observeField(def, s.procedure!), instruments: def.instruments.map((i) => i.id), seat: { c: app.session.caseDef, s, facility: app.session.facility } };
  };

  it("bedside: the tasks of their role — nurses, attendings and paramedics; a porter, a receptionist, a radiologist: none", async () => {
    const app = await placeSession();
    open.push(app);
    const byRole = new Map<string, string[]>();
    for (const r of app.session.staffStates()) if (!byRole.has(r.role)) byRole.set(r.role, delegateTasks(r));
    expect(byRole.get("nurse")).toEqual(["attach_monitor", "record_ecg", "obtain_iv_access"]);
    expect(byRole.get("attending")).toEqual(["attach_monitor", "record_ecg", "obtain_iv_access"]);
    for (const role of ["porter", "receptionist", "radiologist", "lab-tech", "pharmacist"]) if (byRole.has(role)) expect(byRole.get(role), role).toEqual([]);
    expect(byRole.has("porter")).toBe(true);
    // no state (clinical mode): no chips
    expect(delegateTasks(null)).toEqual([]);
  });

  it("the operating table's: by control — traction and the camera to the assistant, passes to the scrub nurse; none to the stand-in who operates or the colleague standing by", async () => {
    const app = await placeSession();
    open.push(app);
    app.session.dispatch({ type: "set-phase", phase: "theatre" });
    for (const op of [{ op: "plan-ports", plan: "three-port-left" }, { op: "insufflate", pressure: 12 }, { op: "insert", port: "A", instrument: "laparoscope" }, { op: "insert", port: "B", instrument: "grasper" }] as const) app.session.dispatch({ type: "operate", op });
    const { v, instruments, seat } = fieldOf(app);
    const roles = states(app);
    // the first assistant (two surgeons: the camera too): the grasper's port, theirs to take
    expect(theatreOffer(roles.get("doc-1"), "doc-1", seat, v, instruments)).toEqual({ hold: ["B"], release: false, camera: true, aim: v.regions.map((r) => r.id), pass: [] });
    // the scrub nurse: the instrument table — every instrument the field lets them pass now
    expect(theatreOffer(roles.get("nurse-2"), "nurse-2", seat, v, instruments)).toEqual({ hold: [], release: false, camera: false, aim: [], pass: instruments });
    // once the Maryland dissector is passed and waits to go in, it is not offered again (the field: already passed)
    expect(app.session.dispatch({ type: "operate", op: { op: "pass", instrument: "maryland" }, actor: "nurse-2" }).rejected).toBeUndefined();
    const waiting = fieldOf(app);
    expect(theatreOffer(states(app).get("nurse-2"), "nurse-2", waiting.seat, waiting.v, waiting.instruments)?.pass).toEqual(instruments.filter((i) => i !== "maryland"));
    // the circulating nurse and the anaesthetist: nothing at the table
    expect(theatreOffer(roles.get("nurse-1"), "nurse-1", seat, v, instruments)).toBeNull();
    expect(theatreOffer(roles.get("anaes-1"), "anaes-1", seat, v, instruments)).toBeNull();
    // before the operation, nothing at the table at all
    expect(theatreOffer(roles.get("doc-1"), "doc-1", seat, null, instruments)).toBeNull();
    // a chip is a delegation by name, with what it names
    expect(theatreLine("doc-1", "hold_traction", "B")).toBe("/delegate staff:doc-1 hold_traction B");
    expect(theatreLine("nurse-2", "pass_instrument", "maryland")).toBe("/delegate staff:nurse-2 pass_instrument maryland");
    expect(theatreLine("doc-1", "release_traction")).toBe("/delegate staff:doc-1 release_traction");

    // in the first assistant's place: the stand-in who operates and the colleague standing by are offered nothing
    const placed = await placeSession({ seat: "first-assistant" });
    open.push(placed);
    await placed.session.run({ type: "team", action: "run", rounds: 40 });
    const f = fieldOf(placed);
    const there = states(placed);
    expect(there.get("doc-0")!.delegable.filter((t) => ["hold_traction", "release_traction", "hold_camera", "aim_camera", "pass_instrument"].includes(t))).toEqual([]);
    expect(theatreOffer(there.get("doc-0"), "doc-0", f.seat, f.v, f.instruments)).toBeNull();
    expect(there.get("doc-1")).toMatchObject({ standingBy: true, delegable: [] });
    expect(theatreOffer(there.get("doc-1"), "doc-1", f.seat, f.v, f.instruments)).toBeNull();
    expect(delegateTasks(there.get("doc-1"))).toEqual([]);
    // the scrub nurse still passes what is on the table
    expect(theatreOffer(there.get("nurse-2"), "nurse-2", f.seat, f.v, f.instruments)?.pass.length).toBeGreaterThan(0);
  });

  it("a port is offered to hold only when the field lets the colleague take it: a grasper's, never the operator's own instrument (A13), never a third port", async () => {
    // the operator's Maryland dissector in port C (the reference access): only the grasper's port B is offered
    const app = await placeSession();
    open.push(app);
    app.session.dispatch({ type: "set-phase", phase: "theatre" });
    for (const op of [
      { op: "plan-ports", plan: "three-port-left" },
      { op: "insufflate", pressure: 12 },
      { op: "insert", port: "A", instrument: "laparoscope" },
      { op: "insert", port: "B", instrument: "grasper" },
      { op: "insert", port: "C", instrument: "maryland" },
    ] as const)
      expect(app.session.dispatch({ type: "operate", op }).rejected, op.op).toBeUndefined();
    const f = fieldOf(app);
    expect(theatreOffer(states(app).get("doc-1"), "doc-1", f.seat, f.v, f.instruments)?.hold).toEqual(["B"]);

    // four ports, a grasper in each working and assist port: three to take, until the colleague holds two of them
    const four = await placeSession({ lineup: "three-surgeons" });
    open.push(four);
    four.session.dispatch({ type: "set-phase", phase: "theatre" });
    for (const op of [
      { op: "plan-ports", plan: "mirror-four-port" },
      { op: "insufflate", pressure: 12 },
      { op: "insert", port: "A", instrument: "laparoscope" },
      { op: "insert", port: "B", instrument: "grasper" },
      { op: "insert", port: "C", instrument: "grasper" },
      { op: "insert", port: "D", instrument: "grasper" },
    ] as const)
      expect(four.session.dispatch({ type: "operate", op }).rejected, op.op).toBeUndefined();
    const before = fieldOf(four);
    expect(theatreOffer(states(four).get("doc-1"), "doc-1", before.seat, before.v, before.instruments)?.hold).toEqual(["B", "C", "D"]);
    for (const port of ["B", "C"]) expect(four.session.dispatch({ type: "operate", op: { op: "hand-over", port, to: "doc-1" }, actor: "doc-1" }).rejected, port).toBeUndefined();
    const after = fieldOf(four);
    expect(after.v.ports.filter((p) => p.holder === "doc-1").map((p) => p.port)).toEqual(["B", "C"]);
    expect(theatreOffer(states(four).get("doc-1"), "doc-1", after.seat, after.v, after.instruments)?.hold ?? []).toEqual([]);
    // the second assistant, holding nothing, may still take the last one
    expect(theatreOffer(states(four).get("doc-2"), "doc-2", after.seat, after.v, after.instruments)?.hold).toEqual(["D"]);
  });

  it("a refused delegation says why as the session words it — who holds the control — and the line reads as a sentence", () => {
    const refusal = "Hold the traction is not a scrub nurse's work. In this team the Traction control is held by Dr Abe (first assistant).";
    const data = { delegation: { staffId: "staff:nurse-2", role: "nurse", task: "hold_traction", status: "failed", steps: [], elapsedSeconds: 0, message: "not-authorized", refusal } };
    expect(delegationSummary(data, () => null)!.steps).toEqual([refusal]);
    setLocale("en");
    const nameOf = (id: string) => (id === "doc-1" ? "Dr Abe" : id === "nurse-2" ? "Chen Yu" : id === "ed-nurse" ? "Lin Xiao" : null);
    // what the operating table's delegation names, by name: a port by its letter, an instrument, a region — never an id
    const targetName = (x: string) => ({ B: "B", maryland: "Maryland dissector", "hepatocystic-triangle": "Hepatocystic triangle" })[x] ?? null;
    expect(delegateLine("/delegate staff:doc-1 hold_traction B", nameOf, targetName)).toBe("Dr Abe, please: Hold the traction · B");
    expect(delegateLine("/delegate staff:nurse-2 pass_instrument maryland", nameOf, targetName)).toBe("Chen Yu, please: Pass an instrument · Maryland dissector");
    expect(delegateLine("/delegate staff:doc-1 aim_camera hepatocystic-triangle", nameOf, targetName)).toBe("Dr Abe, please: Aim the camera · Hepatocystic triangle");
    // a target that cannot be named is left out; any other task's target too (as before)
    expect(delegateLine("/delegate staff:doc-1 hold_traction Z9", nameOf, targetName)).toBe("Dr Abe, please: Hold the traction");
    expect(delegateLine("/delegate staff:ed-nurse fetch_equipment eq:cub2-ecg", nameOf, () => "Cubicle ECG Cart")).toBe("Lin Xiao, please: Fetch equipment");
    // a delegation's steps in the operative field by their names, never 'operate · hand-over'
    const steps = delegationSummary({ delegation: { staffId: "staff:doc-1", role: "attending", task: "hold_traction", status: "completed", steps: [{ operation: "operate", target: "hand-over", status: "completed" }, { operation: "operate", status: "completed" }], elapsedSeconds: 1 } }, () => null)!.steps;
    expect(steps).toEqual(["1. Hand over: done", "2. A step in the operative field: done"]);
    setLocale("zh-CN");
    expect(delegationSummary({ delegation: { staffId: "staff:doc-1", role: "attending", task: "hold_traction", status: "completed", steps: [{ operation: "operate", target: "hand-over", status: "completed" }], elapsedSeconds: 1 } }, () => null)!.steps[0]).not.toMatch(/[A-Za-z]/u);
  });
});
