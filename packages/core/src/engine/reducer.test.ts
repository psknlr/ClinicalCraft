import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, DomainEvent, SessionState } from "../schema/session.js";
import { availableDecisions, createSession, currentWaypoint, orderStatus, parseCase, progress, reduce, replay, resultFor, resultKey } from "./index.js";

const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

function load(name: string): CaseDefinition {
  const parsed = parseCase(fixture(name));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

/** V4-style static case (historical review, no physiology). */
const V4 = load("v4-smzl-mini.case.json");
/** Simulated-clock case with physiology, events and interventions. */
const SIM = load("mini-anaphylaxis.case.json");

/** Apply actions, asserting each is accepted; returns the final state and all events. */
function play(c: CaseDefinition, actions: ClinicalAction[], from: SessionState = createSession(c)) {
  let state = from;
  const events: DomainEvent[] = [];
  for (const action of actions) {
    const result = reduce(c, state, action);
    if (result.rejected) throw new Error(`${action.type} rejected: ${result.rejected.code} ${result.rejected.message}`);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

const types = (events: DomainEvent[]) => events.map((e) => e.type);
const ofType = <T extends DomainEvent["type"]>(events: DomainEvent[], type: T) => events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);

function expectRejected(c: CaseDefinition, s: SessionState, a: ClinicalAction, code: string) {
  const result = reduce(c, s, a);
  expect(result.rejected?.code).toBe(code);
  expect(result.state).toBe(s);
  expect(result.events).toEqual([{ type: "action.rejected", action: a.type, code, message: result.rejected?.message }]);
  return result;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe("createSession", () => {
  it("starts unstarted at minute 0 in the initial (or first) phase", () => {
    const s = createSession(V4);
    expect(s).toMatchObject({ schema: "clinicalcraft/session@1", caseId: "v4-smzl-mini", caseVersion: "1.0.0", started: false, finished: false, clock: 0, phase: "pre", seq: 0 });
    expect(createSession(SIM).phase).toBe("arrival");
  });
});

describe("lifecycle guards", () => {
  it("rejects everything but set-phase, note and flag before start", () => {
    const s0 = createSession(V4);
    for (const a of [
      { type: "ask", itemId: "pain" },
      { type: "examine", findingId: "abdomen" },
      { type: "order", investigationId: "cbc" },
      { type: "read", investigationId: "cbc" },
      { type: "hint" },
      { type: "answer", decisionId: "diagnosis", optionIds: ["dual"] },
      { type: "advance-time", minutes: 5 },
      { type: "finish" },
    ] as ClinicalAction[]) {
      expectRejected(V4, s0, a, "not-started");
    }
    const { state, events } = play(V4, [{ type: "set-phase", phase: "post" }, { type: "note", text: "hm" }, { type: "flag", flag: "x" }], s0);
    expect(state).toMatchObject({ phase: "post", flags: ["x"], notes: [{ at: 0, text: "hm" }], seq: 3, started: false });
    expect(types(events)).toEqual(["phase.changed", "note.added", "flag.changed"]);
  });

  it("start emits session.started once; a second start is invalid", () => {
    const r = reduce(V4, createSession(V4), { type: "start" });
    expect(r.events).toEqual([{ type: "session.started" }]);
    expect(r.state.started).toBe(true);
    expectRejected(V4, r.state, { type: "start" }, "invalid");
  });

  it("rejects malformed actions as invalid", () => {
    const s = play(V4, [{ type: "start" }]).state;
    expectRejected(V4, s, { type: "ask" } as unknown as ClinicalAction, "invalid");
    expectRejected(V4, s, { type: "teleport" } as unknown as ClinicalAction, "invalid");
    expectRejected(V4, s, { type: "advance-time", minutes: -1 }, "invalid");
  });

  it("never mutates the input state", () => {
    const s = deepFreeze(play(SIM, [{ type: "start" }, { type: "ask", itemId: "trigger" }]).state);
    expect(() => replay(SIM, SIM.solution as ClinicalAction[])).not.toThrow();
    expect(() => reduce(SIM, s, { type: "intervene", interventionId: "epi" })).not.toThrow();
    expect(() => reduce(SIM, s, { type: "advance-time", minutes: 20 })).not.toThrow();
  });
});

describe("static clock (V4 behaviour)", () => {
  it("actions cost nothing and results are ready immediately", () => {
    const { state, events } = play(V4, [{ type: "start" }, { type: "ask", itemId: "pain" }, { type: "order", investigationId: "cbc" }, { type: "read", investigationId: "cbc" }]);
    expect(state.clock).toBe(0);
    expect(state.orders).toEqual([{ key: "cbc@pre", investigationId: "cbc", phase: "pre", orderedAt: 0, readyAt: 0 }]);
    expect(types(events)).toEqual(["session.started", "history.asked", "order.placed", "result.ready", "result.read"]);
    expect(orderStatus(V4, state)).toEqual([{ order: state.orders[0], ready: true, read: true }]);
  });

  it("advance-time still moves the clock explicitly", () => {
    const { state, events } = play(V4, [{ type: "start" }, { type: "advance-time", minutes: 3 }]);
    expect(state.clock).toBe(3);
    expect(ofType(events, "time.advanced")).toEqual([{ type: "time.advanced", from: 0, to: 3 }]);
  });
});

describe("ask / examine", () => {
  const started = play(V4, [{ type: "start" }]).state;

  it("records history idempotently with a firstTime flag", () => {
    const { state, events } = play(V4, [{ type: "ask", itemId: "other" }, { type: "ask", itemId: "other" }], started);
    expect(state.asked).toEqual(["other"]);
    expect(ofType(events, "history.asked")).toEqual([
      { type: "history.asked", itemId: "other", firstTime: true, disclosure: "unknown" },
      { type: "history.asked", itemId: "other", firstTime: false, disclosure: "unknown" },
    ]);
    expect(state.seq).toBe(3);
  });

  it("rejects unknown ids and items restricted to other phases", () => {
    expectRejected(V4, started, { type: "ask", itemId: "nope" }, "unknown-id");
    expectRejected(V4, started, { type: "ask", itemId: "side-effects" }, "phase-locked");
    const post = play(V4, [{ type: "set-phase", phase: "post" }, { type: "ask", itemId: "side-effects" }], started).state;
    expect(post.asked).toEqual(["side-effects"]);
  });

  it("examines with the same pattern", () => {
    expectRejected(V4, started, { type: "examine", findingId: "nope" }, "unknown-id");
    const { state, events } = play(V4, [{ type: "examine", findingId: "nodes" }, { type: "examine", findingId: "nodes" }], started);
    expect(state.examined).toEqual(["nodes"]);
    expect(ofType(events, "exam.performed").map((e) => e.firstTime)).toEqual([true, false]);
    const post = play(V4, [{ type: "set-phase", phase: "post" }], started).state;
    expectRejected(V4, post, { type: "examine", findingId: "nodes" }, "phase-locked");
  });
});

describe("order / read", () => {
  const started = play(V4, [{ type: "start" }]).state;

  it("keys orders by phase and treats duplicates as a no-op", () => {
    const once = play(V4, [{ type: "order", investigationId: "cbc", at: "ws-lab" }], started).state;
    expect(once.orders[0]).toMatchObject({ key: "cbc@pre", at: "ws-lab" });
    const dup = reduce(V4, once, { type: "order", investigationId: "cbc" });
    expect(dup.rejected).toBeUndefined();
    expect(dup.state).toBe(once);
    expect(dup.events).toEqual([{ type: "order.duplicate", investigationId: "cbc", phase: "pre", key: "cbc@pre" }]);
    const post = play(V4, [{ type: "set-phase", phase: "post" }, { type: "order", investigationId: "cbc" }], once).state;
    expect(post.orders.map((o) => o.key)).toEqual(["cbc@pre", "cbc@post"]);
    expectRejected(V4, started, { type: "order", investigationId: "nope" }, "unknown-id");
  });

  it("rejects reads of unknown, unordered and unrecorded results", () => {
    expectRejected(V4, started, { type: "read", investigationId: "nope" }, "unknown-id");
    expectRejected(V4, started, { type: "read", investigationId: "cbc", phase: "later" }, "unknown-id");
    expectRejected(V4, started, { type: "read", investigationId: "cbc" }, "not-ordered");
    const s = play(V4, [{ type: "set-phase", phase: "post" }, { type: "order", investigationId: "pet" }], started).state;
    expect(resultFor(V4, "pet", "post")).toBeNull();
    expectRejected(V4, s, { type: "read", investigationId: "pet" }, "no-record");
  });

  it("reads a result of another phase and results marked unavailable", () => {
    const { state, events } = play(
      V4,
      [
        { type: "order", investigationId: "cbc" },
        { type: "set-phase", phase: "post" },
        { type: "read", investigationId: "cbc", phase: "pre" },
        { type: "order", investigationId: "marrow" },
        { type: "read", investigationId: "marrow" },
        { type: "read", investigationId: "marrow" },
      ],
      started,
    );
    expect(state.seen).toEqual(["cbc@pre", "marrow@post"]);
    expect(resultFor(V4, "marrow", "post")?.available).toBe(false);
    expect(ofType(events, "result.read").map((e) => [e.key, e.firstTime])).toEqual([
      ["cbc@pre", true],
      ["marrow@post", true],
      ["marrow@post", false],
    ]);
    expect(resultKey("cbc", "pre")).toBe("cbc@pre");
  });
});

describe("set-phase / hint / flag / note", () => {
  it("validates phases and respects learnerSwitchable", () => {
    const s = play(SIM, [{ type: "start" }]).state;
    expectRejected(SIM, s, { type: "set-phase", phase: "nowhere" }, "unknown-id");
    expectRejected(SIM, s, { type: "set-phase", phase: "observation" }, "phase-locked");
    const same = reduce(SIM, s, { type: "set-phase", phase: "arrival" });
    expect(same.events).toEqual([]);
    expect(same.state.seq).toBe(s.seq + 1);
  });

  it("lets a learner who looked back return to a locked phase the case has reached", () => {
    const reached = play(SIM, [
      { type: "start" },
      { type: "intervene", interventionId: "epi" },
      { type: "intervene", interventionId: "oxygen" },
    ]).state;
    expect(reached.phase).toBe("observation");
    // Back to the switchable arrival phase: the locked phase's condition stays true, so no automatic edge brings
    // the learner back — selecting it by hand must work, or the case can never be finished.
    const back = play(SIM, [{ type: "set-phase", phase: "arrival" }], reached).state;
    expect(back.phase).toBe("arrival");
    const returned = reduce(SIM, back, { type: "set-phase", phase: "observation" });
    expect(returned.rejected).toBeUndefined();
    expect(returned.state.phase).toBe("observation");
    expect(returned.events).toContainEqual({ type: "phase.changed", from: "arrival", to: "observation", automatic: false });
    // Before the case reaches it, the phase stays locked.
    expectRejected(SIM, play(SIM, [{ type: "start" }]).state, { type: "set-phase", phase: "observation" }, "phase-locked");
  });

  it("hint reports the current objective", () => {
    const { state, events } = play(V4, [{ type: "start" }, { type: "hint" }, { type: "ask", itemId: "pain" }, { type: "ask", itemId: "spleen" }, { type: "ask", itemId: "lung" }, { type: "hint" }]);
    expect(state.hints).toBe(2);
    expect(ofType(events, "hint.used")).toEqual([
      { type: "hint.used", objectiveId: "history" },
      { type: "hint.used", objectiveId: "pattern" },
    ]);
  });

  it("flags set and clear with change events only", () => {
    const { state, events } = play(V4, [
      { type: "start" },
      { type: "flag", flag: "a" },
      { type: "flag", flag: "a", value: true },
      { type: "flag", flag: "a", value: false },
      { type: "note", text: "ddx: SMZL" },
    ]);
    expect(state.flags).toEqual([]);
    expect(ofType(events, "flag.changed")).toEqual([
      { type: "flag.changed", flag: "a", value: true },
      { type: "flag.changed", flag: "a", value: false },
    ]);
    expect(state.notes).toEqual([{ at: 0, text: "ddx: SMZL" }]);
  });
});

describe("answer (decisions)", () => {
  const ready = play(V4, [
    { type: "start" },
    { type: "ask", itemId: "pain" },
    { type: "ask", itemId: "spleen" },
    { type: "ask", itemId: "lung" },
    { type: "order", investigationId: "cbc" },
    { type: "read", investigationId: "cbc" },
    { type: "order", investigationId: "us" },
    { type: "read", investigationId: "us" },
    { type: "order", investigationId: "biopsy" },
    { type: "read", investigationId: "biopsy" },
    { type: "order", investigationId: "flow" },
    { type: "read", investigationId: "flow" },
  ]).state;

  it("rejects locked, unknown and malformed answers", () => {
    const early = play(V4, [{ type: "start" }]).state;
    const locked = expectRejected(V4, early, { type: "answer", decisionId: "diagnosis", optionIds: ["dual"] }, "requirements-unmet");
    expect(locked.rejected?.message).toBe("先完成病史、血常规／腹部影像、骨髓活检及流式证据。");
    expectRejected(V4, ready, { type: "answer", decisionId: "nope", optionIds: ["dual"] }, "unknown-id");
    expectRejected(V4, ready, { type: "answer", decisionId: "diagnosis", optionIds: ["nope"] }, "unknown-id");
    expectRejected(V4, ready, { type: "answer", decisionId: "diagnosis", optionIds: ["dual", "infection"] }, "invalid");
  });

  it("single-answer: wrong then right, then already-decided", () => {
    expect(availableDecisions(V4, ready).find((d) => d.decision.id === "diagnosis")).toMatchObject({ unlocked: true, decided: false });
    const wrong = reduce(V4, ready, { type: "answer", decisionId: "diagnosis", optionIds: ["metastasis"] });
    expect(wrong.events).toEqual([{ type: "decision.answered", decisionId: "diagnosis", correct: false, firstTry: true, optionIds: ["metastasis"] }]);
    expect(wrong.state.decisions).toEqual({});
    const right = reduce(V4, wrong.state, { type: "answer", decisionId: "diagnosis", optionIds: ["dual"] });
    expect(right.events[0]).toEqual({ type: "decision.answered", decisionId: "diagnosis", correct: true, firstTry: false, optionIds: ["dual"] });
    expect(right.state.decisions).toEqual({ diagnosis: 0 });
    expect(right.state.attempts.map((a) => [a.optionIds, a.correct])).toEqual([
      [["metastasis"], false],
      [["dual"], true],
    ]);
    expectRejected(V4, right.state, { type: "answer", decisionId: "diagnosis", optionIds: ["dual"] }, "already-decided");
  });

  it("multiple-answer: correct iff the chosen set equals the correct set", () => {
    const s = play(SIM, [
      { type: "start" },
      { type: "intervene", interventionId: "epi" },
      { type: "intervene", interventionId: "oxygen" },
    ]).state;
    expect(s.phase).toBe("observation");
    const subset = reduce(SIM, s, { type: "answer", decisionId: "disposition", optionIds: ["observe", "autoinjector"] });
    expect(subset.events[0]).toMatchObject({ correct: false });
    const extra = reduce(SIM, subset.state, { type: "answer", decisionId: "disposition", optionIds: ["observe", "autoinjector", "referral", "discharge-now"] });
    expect(extra.events[0]).toMatchObject({ correct: false });
    const exact = reduce(SIM, extra.state, { type: "answer", decisionId: "disposition", optionIds: ["referral", "observe", "autoinjector", "observe"] });
    expect(exact.events[0]).toEqual({ type: "decision.answered", decisionId: "disposition", correct: true, firstTry: false, optionIds: ["referral", "observe", "autoinjector"] });
    expect(exact.state.decisions.disposition).toBe(s.clock);
  });
});

describe("intervene", () => {
  const started = play(SIM, [{ type: "start" }]).state;

  it("classifies appropriateness before applying and sets flags", () => {
    expectRejected(SIM, started, { type: "intervene", interventionId: "nope" }, "unknown-id");
    const { state, events } = play(
      SIM,
      [
        { type: "intervene", interventionId: "epi" },
        { type: "ask", itemId: "trigger" },
        { type: "intervene", interventionId: "epi" },
        { type: "intervene", interventionId: "beta-blocker" },
        { type: "intervene", interventionId: "oxygen" },
      ],
      started,
    );
    expect(state.interventions.map((r) => [r.interventionId, r.at, r.appropriateness])).toEqual([
      ["epi", 0, "neutral"],
      ["epi", 3, "indicated"],
      ["beta-blocker", 5, "contraindicated"],
      // spo2 = 95 - 0.5·7 = 91.5 → displayed/compared as 92 < 94
      ["oxygen", 7, "indicated"],
    ]);
    expect(ofType(events, "intervention.applied").map((e) => e.appropriateness)).toEqual(["neutral", "indicated", "contraindicated", "indicated"]);
    expect(ofType(events, "flag.changed")).toEqual([{ type: "flag.changed", flag: "oxygen-on", value: true }]);
    expect(state.flags).toContain("oxygen-on");
    expectRejected(SIM, state, { type: "intervene", interventionId: "epi" }, "max-doses");
  });
});

describe("simulated clock", () => {
  it("charges action costs and enforces turnaround", () => {
    const s1 = play(SIM, [{ type: "start" }, { type: "examine", findingId: "airway" }, { type: "ask", itemId: "allergies" }, { type: "order", investigationId: "abg" }]).state;
    expect(s1.clock).toBe(4);
    expect(s1.orders[0]).toMatchObject({ key: "abg@arrival", orderedAt: 3, readyAt: 8 });
    expect(orderStatus(SIM, s1)[0].ready).toBe(false);
    const notReady = expectRejected(SIM, s1, { type: "read", investigationId: "abg" }, "not-ready");
    expect(notReady.rejected?.message).toContain("minute 8");
    const waited = reduce(SIM, s1, { type: "advance-time", minutes: 4 });
    expect(waited.state.clock).toBe(8);
    expect(waited.events[0]).toEqual({ type: "time.advanced", from: 4, to: 8 });
    expect(ofType(waited.events, "result.ready")).toEqual([{ type: "result.ready", key: "abg@arrival", investigationId: "abg", phase: "arrival", critical: true }]);
    const read = reduce(SIM, waited.state, { type: "read", investigationId: "abg" });
    expect(read.state.clock).toBe(9);
    expect(read.state.seen).toEqual(["abg@arrival"]);
  });

  it("fires scenario events by atMinute and by condition, with alarms on newly crossed limits", () => {
    const { state, events } = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 16 }]);
    expect(state.clock).toBe(16);
    expect(state.firedEvents).toEqual({ stridor: 10, collapse: 15 });
    expect(state.baselineOverrides).toEqual({ rr: 30, hr: 140 });
    expect(state.flags).toEqual(["stridor", "collapsed"]);
    expect(types(events).filter((t) => t !== "session.started")).toEqual([
      "time.advanced",
      "vitals.alarm", // 6: sbp 88
      "vitals.alarm", // 8: spo2 91
      "scenario.event", // 10: stridor
      "flag.changed",
      "vitals.alarm", // 10: sbp 80 critical
      "vitals.alarm", // 10: rr 30 critical
      "vitals.alarm", // 14: spo2 88 critical
      "scenario.event", // 15: collapse (sbp ≤ 70)
      "flag.changed",
      "vitals.alarm", // 15: hr 140
    ]);
    expect(ofType(events, "vitals.alarm")).toEqual([
      { type: "vitals.alarm", vital: "sbp", level: "warning", value: 88 },
      { type: "vitals.alarm", vital: "spo2", level: "warning", value: 91 },
      { type: "vitals.alarm", vital: "sbp", level: "critical", value: 80 },
      { type: "vitals.alarm", vital: "rr", level: "critical", value: 30 },
      { type: "vitals.alarm", vital: "spo2", level: "critical", value: 88 },
      { type: "vitals.alarm", vital: "hr", level: "warning", value: 140 },
    ]);
    expect(ofType(events, "scenario.event")).toEqual([
      { type: "scenario.event", eventId: "stridor", severity: "warning" },
      { type: "scenario.event", eventId: "collapse", severity: "critical" },
    ]);
  });

  it("alarms only on a rising level, again after recovery", () => {
    // sbp enters the warning band at minute 6; epi at 7 lifts it back out, so it alarms exactly once
    const { events } = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 7 }, { type: "intervene", interventionId: "epi" }, { type: "advance-time", minutes: 10 }]);
    const sbp = ofType(events, "vitals.alarm").filter((e) => e.vital === "sbp");
    expect(sbp).toEqual([{ type: "vitals.alarm", vital: "sbp", level: "warning", value: 88 }]);
  });

  it("records trend stops when `until` becomes true", () => {
    const { state } = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 4 }, { type: "intervene", interventionId: "epi" }, { type: "intervene", interventionId: "oxygen" }]);
    expect(state.trendStops).toEqual({ "bp-fall": 4, "dbp-fall": 4, desat: 6 });
    expect(state.clock).toBe(8);
  });

  it("applies automatic phase transitions on a false→true edge", () => {
    const { state, events } = play(SIM, [{ type: "start" }, { type: "intervene", interventionId: "oxygen" }, { type: "intervene", interventionId: "epi" }]);
    expect(state.phase).toBe("observation");
    const epiEvents = types(events).slice(types(events).lastIndexOf("intervention.applied"));
    expect(epiEvents.slice(0, 4)).toEqual(["intervention.applied", "objective.completed", "objective.completed", "phase.changed"]);
    expect(ofType(events, "phase.changed")).toEqual([{ type: "phase.changed", from: "arrival", to: "observation", automatic: true }]);
    expect(ofType(events, "objective.completed")).toEqual([
      { type: "objective.completed", objectiveId: "treat", index: 1 },
      { type: "objective.completed", objectiveId: "stabilise", index: 2 },
    ]);
  });

  it("finishes with timedOut when limitMinutes is reached", () => {
    const { state, events } = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 100 }]);
    expect(state.clock).toBe(60);
    expect(state.finished).toBe(true);
    expect(ofType(events, "time.advanced")).toEqual([{ type: "time.advanced", from: 0, to: 60 }]);
    expect(events.at(-1)).toEqual({ type: "case.finished", timedOut: true });
    expectRejected(SIM, state, { type: "ask", itemId: "trigger" }, "finished");
  });

  it("an action whose cost crosses the limit is accepted, then the case times out", () => {
    const near = play(SIM, [{ type: "start" }, { type: "advance-time", minutes: 59 }]).state;
    const r = reduce(SIM, near, { type: "examine", findingId: "skin" });
    expect(r.rejected).toBeUndefined();
    expect(r.state).toMatchObject({ clock: 60, finished: true, examined: ["skin"] });
  });
});

describe("objectives & finish", () => {
  it("gates finish on all objectives (V4)", () => {
    const s = play(V4, [{ type: "start" }, { type: "ask", itemId: "pain" }]).state;
    const r = expectRejected(V4, s, { type: "finish" }, "objectives-incomplete");
    expect(r.rejected?.message).toBe("5 objective(s) still open");
  });

  it("completes objectives out of order, in definition order per action, and case.completed exactly once", () => {
    const { state, events } = play(SIM, [
      { type: "start" },
      { type: "intervene", interventionId: "oxygen" },
      { type: "intervene", interventionId: "epi" },
      { type: "examine", findingId: "airway" },
      { type: "ask", itemId: "allergies" },
      { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] },
      { type: "answer", decisionId: "disposition", optionIds: ["observe", "autoinjector", "referral"] },
      { type: "note", text: "done" },
      { type: "hint" },
    ]);
    expect(ofType(events, "objective.completed").map((e) => e.objectiveId)).toEqual(["treat", "stabilise", "assess", "diagnose", "dispose"]);
    expect(types(events).filter((t) => t === "case.completed")).toHaveLength(1);
    expect(types(events).indexOf("case.completed")).toBe(types(events).lastIndexOf("objective.completed") + 1);
    // completion is stamped with the minute the completing action started
    expect(state.objectivesDone).toEqual({ treat: 2, stabilise: 2, assess: 6, diagnose: 7, dispose: 7 });
    const p = progress(SIM, state);
    expect(p).toMatchObject({ complete: true, done: 5, total: 5, currentIndex: 5 });
    expect(ofType(events, "hint.used")).toEqual([{ type: "hint.used", objectiveId: null }]);
    const finished = reduce(SIM, state, { type: "finish" });
    expect(finished.events).toEqual([{ type: "case.finished", timedOut: false }]);
    expectRejected(SIM, finished.state, { type: "note", text: "late" }, "finished");
  });

  it("tracks progress and the current waypoint", () => {
    const s0 = play(SIM, [{ type: "start" }]).state;
    expect(progress(SIM, s0)).toMatchObject({ currentIndex: 0, done: 0, complete: false });
    expect(progress(SIM, s0).objectives[0]).toEqual({ id: "assess", done: false, current: true });
    expect(currentWaypoint(SIM, s0)).toBe("patient");
    const s1 = play(SIM, [{ type: "examine", findingId: "airway" }], s0).state;
    expect(currentWaypoint(SIM, s1)).toBe("records");
    const s2 = play(SIM, [{ type: "ask", itemId: "allergies" }], s1).state;
    expect(progress(SIM, s2).objectives[0]).toEqual({ id: "assess", done: true, doneAt: 2, current: false });
    expect(currentWaypoint(SIM, s2)).toBe("medications");
  });
});

describe("replay", () => {
  it("is deterministic and equals step-by-step reduction", () => {
    const actions = SIM.solution as ClinicalAction[];
    const a = replay(SIM, actions);
    const b = replay(SIM, actions);
    expect(a).toEqual(b);
    expect(a.rejections).toEqual([]);
    expect(play(SIM, actions).state).toEqual(a.state);
    expect(JSON.parse(JSON.stringify(a.state))).toEqual(a.state);
    expect(a.state).toMatchObject({ finished: true, phase: "observation", clock: 8, seq: 9 });
  });

  it("records rejections with their index and skips them", () => {
    const r = replay(V4, [{ type: "ask", itemId: "pain" }, { type: "start" }, { type: "ask", itemId: "ghost" }, { type: "ask", itemId: "pain" }]);
    expect(r.rejections.map((x) => [x.index, x.code])).toEqual([
      [0, "not-started"],
      [2, "unknown-id"],
    ]);
    expect(r.state.asked).toEqual(["pain"]);
    expect(r.state.seq).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/* Hardening (adversarial review)                                      */
/* ------------------------------------------------------------------ */

/** Parse a (modified) fixture object. */
function loadJson(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

describe("hardening: reducer edge cases", () => {
  const raw = (name: string) => structuredClone(fixture(name)) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  it("single-answer decisions are correct iff the chosen option is correct, even with several correct options", () => {
    const json = raw("v4-smzl-mini.case.json");
    const d = json.decisions.find((x: { id: string }) => x.id === "diagnosis");
    d.requires = { always: true };
    d.options.find((o: { id: string }) => o.id === "metastasis").correct = true; // two correct options (integrity error, but playable)
    const c = loadJson(json);
    const s = play(c, [{ type: "start" }]).state;
    const r = reduce(c, s, { type: "answer", decisionId: "diagnosis", optionIds: ["metastasis"] });
    expect(r.events[0]).toMatchObject({ type: "decision.answered", correct: true });
    expect(r.state.decisions).toEqual({ diagnosis: 0 });
    expect(reduce(c, s, { type: "answer", decisionId: "diagnosis", optionIds: ["infection"] }).events[0]).toMatchObject({ correct: false });
  });

  it("applies an automatic phase transition whose enterWhen is already true when the session starts", () => {
    const json = raw("mini-anaphylaxis.case.json");
    json.phases[1].enterWhen = { flag: "handover-done" };
    const c = loadJson(json);
    const { state, events } = play(c, [{ type: "flag", flag: "handover-done" }, { type: "start" }]);
    expect(state.phase).toBe("observation");
    expect(ofType(events, "phase.changed")).toEqual([{ type: "phase.changed", from: "arrival", to: "observation", automatic: true }]);
    // the edge is consumed: switching back manually is not overridden while the condition stays true
    const json2 = raw("mini-anaphylaxis.case.json");
    json2.phases[1].enterWhen = { flag: "handover-done" };
    json2.phases[1].learnerSwitchable = true;
    const c2 = loadJson(json2);
    const s2 = play(c2, [{ type: "flag", flag: "handover-done" }, { type: "start" }, { type: "set-phase", phase: "arrival" }, { type: "ask", itemId: "trigger" }]).state;
    expect(s2.phase).toBe("arrival");
  });

  it("fires scenario events at a fractional atMinute and emits results at a fractional readyAt exactly", () => {
    const json = raw("mini-anaphylaxis.case.json");
    json.physiology.events[0].atMinute = 2.5;
    json.investigations.find((i: { id: string }) => i.id === "abg").turnaroundMinutes = 1.5;
    json.objectives.push({ id: "gas", title: "gas", hint: "gas", completeWhen: { resultReady: "abg" } });
    const c = loadJson(json);
    const ordered = play(c, [{ type: "start" }, { type: "order", investigationId: "abg" }]).state; // ordered at 0, ready at 1.5, clock 1
    const { state, events } = play(c, [{ type: "advance-time", minutes: 4 }], ordered);
    expect(state.firedEvents.stridor).toBe(2.5);
    expect(state.objectivesDone.gas).toBe(1.5);
    expect(ofType(events, "time.advanced")).toEqual([{ type: "time.advanced", from: 1, to: 5 }]);
    expect(ofType(events, "scenario.event").map((e) => e.eventId)).toEqual(["stridor"]);
    expect(ofType(events, "result.ready").map((e) => e.key)).toEqual(["abg@arrival"]);
  });
});
