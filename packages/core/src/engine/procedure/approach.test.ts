/**
 * Changes of approach and the presentation record (the Case 126 engineering brief, delivery 1): a bail-out asked
 * twice has no second effect and costs no second minute; a different subtotal technique needs an explicit revision;
 * conversion releases pressure, instruments and traction together and ends the laparoscopic view; exposure is the
 * traction held now — withdrawing the neck grasper narrows it at once — while dissection already done stays done;
 * every committed step carries a stable id and its sequence; the score carries the case version and the engine.
 * Colleagues at the table (docs/PROCEDURE.md §3): the hand-over rules; a colleague putting the scope or an assist
 * instrument into an empty port and holding it; consent, two hands and the control a step needs; crossed hands the
 * operator's; whose step an unsafe act or an injury was; the camera — aimed and zoomed by its holder, or by the operator
 * while nobody holds it —, the work off its aim, out of frame at a close view, the scope taken out during a bleed; and
 * the scrub nurse's passes, waiting until the one they were passed to inserts them.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { CaseDefinition } from "../../schema/case.js";
import type { ClinicalAction, DomainEvent } from "../../schema/session.js";
import type { ProcedureDefinition, ProcedureOp } from "../../schema/procedure.js";
import { assess } from "../assessment.js";
import { evaluate } from "../conditions.js";
import { createSession, reduce } from "../reducer.js";
import { ENGINE_VERSION } from "../version.js";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { lapCholeTeamCase, REFERENCE_OPS } from "./__fixtures__/lap-chole-team.js";
import { observeField } from "./observe.js";
import { operate } from "./reduce.js";
import { createProcedureState } from "./state.js";

const c = lapCholeCase();
const def = c.procedure!;

function run(ops: ProcedureOp[]) {
  let s = reduce(c, createSession(c), { type: "start" }).state;
  s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
  const rejected: { op: string; message: string }[] = [];
  const events: DomainEvent[] = [];
  for (const op of ops) {
    const r = reduce(c, s, { type: "operate", op, by: "agent" } as ClinicalAction);
    if (r.rejected) rejected.push({ op: op.op, message: r.rejected.message });
    events.push(...r.events);
    s = r.state;
  }
  return { s, p: s.procedure!, rejected, events };
}

const ACCESS: ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
];
const NECK: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" };
const TRIANGLE = Array.from({ length: 3 }, () => ({ op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }) as ProcedureOp);

describe("changes of approach", () => {
  it("a bail-out asked twice is refused: no second effect, no second minute", () => {
    const once = run([...ACCESS, { op: "bailout", strategy: "call-help" }]);
    const twice = run([...ACCESS, { op: "bailout", strategy: "call-help" }, { op: "bailout", strategy: "call-help" }]);
    expect(twice.rejected).toEqual([{ op: "bailout", message: expect.stringContaining("already under way") }]);
    expect(twice.p.bailouts).toEqual(["call-help"]);
    expect(twice.s.clock).toBe(once.s.clock);
  });

  it("a different subtotal technique needs an explicit revision; the superseded one is kept", () => {
    const r = run([...ACCESS, { op: "bailout", strategy: "subtotal-fenestrating" }, { op: "bailout", strategy: "subtotal-reconstituting" }]);
    expect(r.rejected[0]?.message).toMatch(/needs an explicit revision/);
    const revised = run([...ACCESS, { op: "bailout", strategy: "subtotal-fenestrating" }, { op: "bailout", strategy: "subtotal-reconstituting", revise: true }]);
    expect(revised.rejected).toEqual([]);
    expect(revised.p.bailouts).toEqual(["subtotal-reconstituting"]);
    expect(revised.p.superseded).toEqual(["subtotal-fenestrating"]);
  });

  it("conversion releases pressure, instruments and traction together and ends the laparoscopic view", () => {
    const r = run([...ACCESS, NECK, { op: "bailout", strategy: "convert-open" }]);
    expect(r.p).toMatchObject({ insufflated: false, pressure: 0, retractions: {} });
    expect(r.p.ports.every((p) => p.instrument === null && p.tip === null)).toBe(true);
    expect(observeField(def, r.p).inView).toBe(false);
  });
});

describe("exposure is the traction held now; dissection done stays done", () => {
  it("withdrawing the neck grasper narrows the window at once, before any further step", () => {
    const held = run([...ACCESS, NECK, ...TRIANGLE]);
    const triangle = (p: typeof held.p) => observeField(def, p).regions.find((x) => x.id === "hepatocystic-triangle")!;
    const before = triangle(held.p);
    const let_go = run([...ACCESS, NECK, ...TRIANGLE, { op: "withdraw", port: "B" }]);
    const after = triangle(let_go.p);
    expect(["partial", "good"]).toContain(before.exposure);
    expect(["none", "poor"]).toContain(after.exposure);
    expect(after.dissection).toBe(before.dissection);
    expect(let_go.p.retractions).toEqual({});
  });
});

describe("the presentation record", () => {
  it("every committed step has a stable id, its number, the sequence, the clock, who acted and the op", () => {
    const { events } = run([...ACCESS, NECK]);
    const steps = events.filter((e): e is Extract<DomainEvent, { type: "procedure.step" }> => e.type === "procedure.step");
    expect(steps.map((e) => e.id)).toEqual(["op-1", "op-2", "op-3", "op-4", "op-5", "op-6"]);
    expect(steps.at(-1)).toMatchObject({ op: "retract", step: 6, by: "agent", detail: NECK });
    expect(steps.map((e) => e.seq)).toEqual([...steps.map((e) => e.seq)].sort((a, b) => a! - b!));
  });

  it("the score carries the case version, the engine and whether the encounter finished", () => {
    const { s } = run(ACCESS);
    expect(assess(c, s)).toMatchObject({ caseVersion: c.version, engine: ENGINE_VERSION, finished: false });
    const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as { version: string };
    expect(ENGINE_VERSION).toBe(pkg.version);
  });
});

/** Steps with an actor: the assistant (a staff id) or the operator (none). */
function runAs(steps: { op: ProcedureOp; actor?: string }[]) {
  let s = reduce(c, createSession(c), { type: "start" }).state;
  s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
  const rejected: { op: string; message: string }[] = [];
  const events: DomainEvent[] = [];
  for (const { op, actor } of steps) {
    const r = reduce(c, s, { type: "operate", op, by: "agent", ...(actor ? { actor } : {}) } as ClinicalAction);
    if (r.rejected) rejected.push({ op: op.op, message: r.rejected.message });
    events.push(...r.events);
    s = r.state;
  }
  return { s, p: s.procedure!, rejected, events };
}

describe("the assistant holds the traction (a hand-over)", () => {
  const ME = (op: ProcedureOp) => ({ op });
  const AS = (op: ProcedureOp) => ({ op, actor: "or-7.assistant" });
  const triangle = () => observeField(def, runAs([...ACCESS, NECK, ...TRIANGLE].map(ME)).p).regions.find((r) => r.id === "hepatocystic-triangle")!;

  it("taken over, the grasper keeps its traction; only the assistant works that port, the operator dissects on", () => {
    const r = runAs([...ACCESS.map(ME), ME(NECK), ...TRIANGLE.map(ME), AS({ op: "hand-over", port: "B", to: "or-7.assistant" })]);
    expect(r.rejected).toEqual([]);
    expect(r.p.ports.find((p) => p.site === "B")).toMatchObject({ instrument: "grasper", holder: "or-7.assistant" });
    expect(r.p.retractions["gallbladder-infundibulum"]).toMatchObject({ port: "B" });
    // the operator cannot work a port the assistant holds; the assistant cannot dissect
    const busy = runAs([...ACCESS.map(ME), ME(NECK), AS({ op: "hand-over", port: "B", to: "or-7.assistant" }), ME({ op: "withdraw", port: "B" }), AS({ op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false })]);
    expect(busy.rejected.map((x) => x.op)).toEqual(["withdraw", "dissect"]);
    expect(busy.rejected[0]!.message).toMatch(/or-7\.assistant holds the grasper in port "B"/);
    expect(busy.rejected[1]!.message).toMatch(/Only the operator does "dissect"/);
    // the edges: the operator dissects with port C while the assistant holds B
    const on = runAs([...ACCESS.map(ME), ME(NECK), AS({ op: "hand-over", port: "B", to: "or-7.assistant" }), ...TRIANGLE.map(ME)]);
    expect(on.rejected).toEqual([]);
  });

  it("the assistant lets go: the exposure falls at once (exposure-lost), the cleared tissue stays cleared", () => {
    const held = triangle();
    const r = runAs([...ACCESS.map(ME), ME(NECK), ...TRIANGLE.map(ME), AS({ op: "hand-over", port: "B", to: "or-7.assistant" }), AS({ op: "release", structure: "gallbladder-infundibulum" })]);
    expect(r.rejected).toEqual([]);
    const step = r.events.filter((e) => e.type === "procedure.step").at(-1) as Extract<DomainEvent, { type: "procedure.step" }>;
    expect(step).toMatchObject({ op: "release", actor: "or-7.assistant", signals: ["exposure-lost"] });
    const now = observeField(def, r.p).regions.find((x) => x.id === "hepatocystic-triangle")!;
    expect(now.cleared).toBe(held.cleared);
    expect(now.exposure).not.toBe(held.exposure);
    // the operator cannot let go of what the assistant holds
    const notMine = runAs([...ACCESS.map(ME), ME(NECK), AS({ op: "hand-over", port: "B", to: "or-7.assistant" }), ME({ op: "release", structure: "gallbladder-infundibulum" })]);
    expect(notMine.rejected[0]!.message).toMatch(/holds the grasper/);
  });

  it("withdrawn before the assistant takes it: nothing to hold, and the window already fell", () => {
    const r = runAs([...ACCESS.map(ME), ME(NECK), ...TRIANGLE.map(ME), ME({ op: "withdraw", port: "B" }), AS({ op: "hand-over", port: "B", to: "or-7.assistant" })]);
    expect(r.rejected).toEqual([{ op: "hand-over", message: expect.stringMatching(/nothing to hand over/) }]);
    const withdraw = r.events.find((e) => e.type === "procedure.step" && e.op === "withdraw") as Extract<DomainEvent, { type: "procedure.step" }>;
    expect(withdraw.signals).toContain("exposure-lost");
  });

  it("handed back, the operator works the port again; conversion clears every holder", () => {
    const back = runAs([...ACCESS.map(ME), ME(NECK), AS({ op: "hand-over", port: "B", to: "or-7.assistant" }), AS({ op: "hand-over", port: "B" }), ME({ op: "withdraw", port: "B" })]);
    expect(back.rejected).toEqual([]);
    const open = runAs([...ACCESS.map(ME), ME(NECK), AS({ op: "hand-over", port: "B", to: "or-7.assistant" }), ME({ op: "bailout", strategy: "convert-open" })]);
    expect(open.p.ports.every((p) => p.holder === undefined && p.instrument === null)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Colleagues at the table: the team fixture (docs/PROCEDURE.md §3)    */
/* ------------------------------------------------------------------ */

const team = lapCholeTeamCase();

type Step = { op: ProcedureOp; actor?: string };
const OP = (op: ProcedureOp): Step => ({ op });
const BY = (actor: string, op: ProcedureOp): Step => ({ op, actor });

/** Steps on `k` (the operator's, or a colleague's), started with `start` (a line-up…) and in the theatre. */
function at(k: CaseDefinition, steps: readonly Step[], start: Record<string, unknown> = {}) {
  let s = reduce(k, createSession(k), { type: "start", ...start } as ClinicalAction).state;
  if (s.phase !== "theatre") s = reduce(k, s, { type: "set-phase", phase: "theatre" }).state;
  const rejected: { op: string; message: string; reason?: string; code: string }[] = [];
  const events: DomainEvent[] = [];
  for (const { op, actor } of steps) {
    const r = reduce(k, s, { type: "operate", op, by: "agent", ...(actor ? { actor } : {}) } as ClinicalAction);
    if (r.rejected) rejected.push({ op: op.op, code: r.rejected.code, message: r.rejected.message, ...(r.rejected.reason ? { reason: r.rejected.reason.key } : {}) });
    events.push(...r.events);
    s = r.state;
  }
  return { s, p: s.procedure!, rejected, events };
}
const port = (p: { ports: { site: string }[] }, site: string) => p.ports.find((x) => x.site === site)!;
const lastStep = (events: DomainEvent[]) => events.filter((e) => e.type === "procedure.step").at(-1) as Extract<DomainEvent, { type: "procedure.step" }>;

/** Plan and pneumoperitoneum, nothing in the ports yet (the operator's). */
const OPEN = REFERENCE_OPS.slice(0, 2).map(OP);
/** The access: the scope in A, a grasper in B, the Maryland in C (the operator's). */
const IN = REFERENCE_OPS.slice(0, 5).map(OP);
const FOUR: Step[] = [OP({ op: "plan-ports", plan: "mirror-four-port" }), OP({ op: "insufflate", pressure: 12 })];
const SCOPE_IN: ProcedureOp = { op: "insert", port: "A", instrument: "laparoscope" };
const TAKE = (who: string, site: string): Step => BY(who, { op: "hand-over", port: site, to: who });

describe("a colleague puts an instrument in", () => {
  it("the scope into an empty camera port nobody holds: they hold it; they take it out and put it back", () => {
    const r = at(team, [...OPEN, BY("doc-1", SCOPE_IN), BY("doc-1", { op: "withdraw", port: "A" }), BY("doc-1", SCOPE_IN)]);
    expect(r.rejected).toEqual([]);
    expect(port(r.p, "A")).toMatchObject({ instrument: "laparoscope", holder: "doc-1" });
    expect(observeField(team.procedure!, r.p)).toMatchObject({ inView: true, camera: { port: "A", at: null, zoom: "wide", holder: "doc-1" } });
    expect(r.p.counters).toMatchObject({ steps: 5, colleague: 3 });
    // taken out, it is nobody's and empty again
    const out = at(team, [...OPEN, BY("doc-1", SCOPE_IN), BY("doc-1", { op: "withdraw", port: "A" })]);
    expect(port(out.p, "A").holder).toBeUndefined();
    expect(port(out.p, "A").instrument).toBeNull();
  });

  it("a grasper or the suction into an empty assist port; never into a working port, a port in use, or a camera port", () => {
    const assist = at(team, [...FOUR, OP(SCOPE_IN), BY("doc-1", { op: "insert", port: "D", instrument: "suction" })]);
    expect(assist.rejected).toEqual([]);
    expect(port(assist.p, "D")).toMatchObject({ instrument: "suction", holder: "doc-1" });
    const r = at(team, [
      ...FOUR,
      OP(SCOPE_IN),
      BY("doc-1", { op: "insert", port: "B", instrument: "grasper" }),
      BY("doc-1", SCOPE_IN),
      BY("doc-1", { op: "insert", port: "A", instrument: "grasper" }),
    ]);
    expect(r.rejected).toEqual([
      { op: "insert", code: "invalid", reason: "port-role", message: 'A colleague puts the laparoscope only into a camera port, and a grasper or the suction only into an assist port: port "B" is a working port.' },
      { op: "insert", code: "invalid", reason: "port-occupied", message: 'Port "A" already has the laparoscope in it: a colleague puts an instrument only into an empty port.' },
      { op: "insert", code: "invalid", reason: "port-occupied", message: 'Port "A" already has the laparoscope in it: a colleague puts an instrument only into an empty port.' },
    ]);
  });

  it("an operating instrument is never theirs, and a colleague outside the team no longer takes the camera", () => {
    const r = at(team, [...FOUR, BY("doc-1", { op: "insert", port: "D", instrument: "hook" })]);
    expect(r.rejected).toEqual([{ op: "insert", code: "invalid", reason: "needs-control", message: "The hook is the operator's own instrument: doc-1 cannot put the hook in." }]);
    const legacy = at(c, [...FOUR, BY("or-7.assistant", SCOPE_IN)]);
    expect(legacy.rejected).toEqual([{ op: "insert", code: "invalid", reason: "needs-control", message: "or-7.assistant cannot put the laparoscope in: it needs the camera control, which or-7.assistant does not hold." }]);
  });
});

describe("hand-overs: consent, two hands, the control", () => {
  it("a colleague takes a port from the operator, never from another colleague — who hands it over themselves", () => {
    const steps = [...IN, TAKE("doc-1", "B")];
    const taken = at(team, [...steps, TAKE("doc-2", "B")], { lineup: "three-surgeons" });
    expect(taken.rejected).toEqual([{ op: "hand-over", code: "requirements-unmet", reason: "take-from-colleague", message: 'doc-1 holds the grasper in port "B": they hand it over first.' }]);
    expect(port(taken.p, "B").holder).toBe("doc-1");
    const given = at(team, [...steps, BY("doc-1", { op: "hand-over", port: "B", to: "doc-2" })], { lineup: "three-surgeons" });
    expect(given.rejected).toEqual([]);
    expect(port(given.p, "B").holder).toBe("doc-2");
    // the operator always takes a port back
    const back = at(team, [...steps, OP({ op: "hand-over", port: "B" })]);
    expect(back.rejected).toEqual([]);
    expect(port(back.p, "B").holder).toBeUndefined();
    // the same rule for colleagues outside a team
    const legacy = at(c, [...IN, TAKE("or-7.assistant", "B"), TAKE("or-7.second", "B")]);
    expect(legacy.rejected.map((x) => x.reason)).toEqual(["take-from-colleague"]);
  });

  it("a colleague holds two ports at most (the camera port counts as one)", () => {
    const r = at(team, [...FOUR, BY("doc-1", SCOPE_IN), OP({ op: "insert", port: "B", instrument: "grasper" }), TAKE("doc-1", "B"), BY("doc-1", { op: "insert", port: "D", instrument: "suction" })]);
    expect(r.rejected).toEqual([{ op: "insert", code: "requirements-unmet", reason: "hands-full", message: "doc-1 already holds two ports (A, B): a colleague holds at most two." }]);
    const third = at(team, [...FOUR, BY("doc-1", SCOPE_IN), BY("doc-1", { op: "insert", port: "D", instrument: "grasper" }), OP({ op: "insert", port: "B", instrument: "grasper" }), TAKE("doc-1", "B")]);
    expect(third.rejected.map((x) => x.reason)).toEqual(["hands-full"]);
    expect(port(third.p, "B").holder).toBeUndefined();
  });

  it("taking, handing on or putting in an instrument needs its control — the physics answers an empty port", () => {
    const r = at(team, [
      ...IN,
      TAKE("nurse-2", "B"),
      TAKE("anaes-1", "B"),
      TAKE("doc-1", "C"),
      OP({ op: "hand-over", port: "B", to: "nurse-2" }),
      OP({ op: "withdraw", port: "B" }),
      TAKE("doc-1", "B"),
    ]);
    expect(r.rejected).toEqual([
      { op: "hand-over", code: "invalid", reason: "needs-control", message: 'nurse-2 cannot take the grasper in port "B": it needs the retract control, which nurse-2 does not hold.' },
      { op: "hand-over", code: "invalid", reason: "needs-control", message: 'anaes-1 cannot take the grasper in port "B": it needs the retract control, which anaes-1 does not hold.' },
      { op: "hand-over", code: "invalid", reason: "needs-control", message: "The maryland is the operator's own instrument: doc-1 cannot take the maryland in port \"C\"." },
      { op: "hand-over", code: "invalid", reason: "needs-control", message: 'nurse-2 cannot take the grasper in port "B": it needs the retract control, which nurse-2 does not hold.' },
      { op: "hand-over", code: "requirements-unmet", message: 'No instrument is in port "B": there is nothing to hand over.' },
    ]);
  });
});

describe("crossed hands and whose step it was", () => {
  const NECK_OP: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" };

  it("crossed hands count the operator's own steps, never a colleague's", () => {
    const mine = at(team, [...IN, OP(NECK_OP)]);
    const theirs = at(team, [...IN, TAKE("doc-1", "B"), BY("doc-1", NECK_OP)]);
    expect(mine.p.counters.crossings).toBe(1);
    expect(theirs.rejected).toEqual([]);
    expect(theirs.p.counters.crossings).toBe(0);
    expect(theirs.p.retractions["gallbladder-infundibulum"]).toMatchObject({ port: "B" });
  });

  it("excessive traction by the first assistant is theirs: the unsafe act and the perforation carry `by`", () => {
    const r = at(team, [...IN, TAKE("doc-1", "B"), BY("doc-1", { ...NECK_OP, force: "excessive" })]);
    expect(r.p.unsafe).toEqual([{ code: "excessive-traction", at: expect.any(Number), structure: "gallbladder-infundibulum", by: "doc-1" }]);
    expect(r.p.injuries).toEqual([expect.objectContaining({ kind: "perforation", by: "doc-1", recognised: false })]);
    // the condition names the place, resolved through the team as it is; the operator's own acts are `operator`
    const by = (place: string, what: "unsafe" | "injury") => evaluate(team, r.s, { procedure: what === "unsafe" ? { unsafe: "excessive-traction", by: place } : { injury: "perforation", by: place } } as never);
    expect([by("first-assistant", "unsafe"), by("operator", "unsafe"), by("second-assistant", "unsafe"), by("scrub-nurse", "unsafe")]).toEqual([true, false, false, false]);
    expect([by("first-assistant", "injury"), by("operator", "injury")]).toEqual([true, false]);
    const mine = at(team, [...IN, OP({ ...NECK_OP, force: "excessive" })]);
    expect(mine.p.unsafe[0]!.by).toBeUndefined();
    expect(evaluate(team, mine.s, { procedure: { unsafe: "excessive-traction", by: "operator" } })).toBe(true);
    expect(assess(team, r.s).procedure).toMatchObject({ unsafe: [{ code: "excessive-traction", by: "doc-1" }], injuries: [{ kind: "perforation", by: "doc-1" }] });
  });

  it("anyone in the room may say an injury aloud: no control needed, recorded with who said it — crediting nobody else", () => {
    const r = at(team, [...IN, TAKE("doc-1", "B"), BY("doc-1", { ...NECK_OP, force: "excessive" }), BY("anaes-1", { op: "recognise", injury: "perforation" })]);
    expect(r.rejected).toEqual([]);
    // the anaesthetist said it first; the operator has not: it is not the operator's recognition
    expect(r.p.injuries[0]).toMatchObject({ kind: "perforation", recognised: false, recognisedBy: "anaes-1" });
    expect(evaluate(team, r.s, { procedure: { injury: "any", recognised: false } })).toBe(true);
    expect(evaluate(team, r.s, { procedure: { injury: "perforation", recognised: true } })).toBe(false);
    // said by the operator too, it is recognised — and the anaesthetist still said it first
    const both = at(team, [...IN, TAKE("doc-1", "B"), BY("doc-1", { ...NECK_OP, force: "excessive" }), BY("anaes-1", { op: "recognise", injury: "perforation" }), OP({ op: "recognise", injury: "perforation" })]);
    expect(both.p.injuries[0]).toMatchObject({ recognised: true, recognisedBy: "anaes-1" });
    // said by the operator first, it is the operator's alone
    const mine = at(team, [...IN, OP({ ...NECK_OP, force: "excessive" }), OP({ op: "recognise", injury: "perforation" }), BY("nurse-2", { op: "recognise", injury: "perforation" })]);
    expect(mine.p.injuries[0]).toMatchObject({ recognised: true });
    expect(mine.p.injuries[0]!.recognisedBy).toBeUndefined();
  });

  it("a colleague's word is not the operator's: going on to clip after only a colleague said it is continuing after an injury", () => {
    // ready to clip the cystic duct; then the operator's own traction tears the gallbladder
    const ready = [...REFERENCE_OPS.slice(0, 22).map(OP), OP({ ...NECK_OP, force: "excessive" })];
    const CLIP = OP(REFERENCE_OPS[22]!);
    expect(REFERENCE_OPS[22]).toMatchObject({ op: "clip", handle: "T2" });
    const continued = (r: { p: { unsafe: { code: string }[] } }) => r.p.unsafe.some((u) => u.code === "continued-after-injury");
    const heard = at(team, [...ready, BY("anaes-1", { op: "recognise", injury: "perforation" }), CLIP]);
    expect(heard.rejected).toEqual([]);
    expect(continued(heard)).toBe(true);
    const said = at(team, [...ready, OP({ op: "recognise", injury: "perforation" }), CLIP]);
    expect(said.rejected).toEqual([]);
    expect(continued(said)).toBe(false);
  });

  it("a colleague's false alarm is recorded as theirs, never on the operator's count", () => {
    const r = at(team, [...IN, BY("nurse-1", { op: "recognise", injury: "bile-duct-injury" }), OP({ op: "recognise", injury: "bleeding" })]);
    expect(r.rejected).toEqual([]);
    expect(r.p.colleagueFalseAlarms).toEqual([{ injury: "bile-duct-injury", by: "nurse-1", at: expect.any(Number) }]);
    expect(r.p.counters.falseAlarms).toBe(1);
    expect(assess(team, r.s).procedure).toMatchObject({ counters: { falseAlarms: 1 }, colleagueFalseAlarms: [{ injury: "bile-duct-injury", by: "nurse-1" }] });
    // with none, nothing is recorded
    expect(at(team, [...IN, OP({ op: "recognise", injury: "bleeding" })]).p.colleagueFalseAlarms).toBeUndefined();
    expect(assess(team, at(team, IN).s).procedure).not.toHaveProperty("colleagueFalseAlarms");
  });
});

describe("the camera: aimed and zoomed by its holder", () => {
  const TRIANGLE_STEP: ProcedureOp = { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false };
  const AIM = (atRegion?: string): ProcedureOp => ({ op: "aim", port: "A", ...(atRegion ? { at: atRegion } : {}) });
  const ZOOM = (level: "wide" | "close"): ProcedureOp => ({ op: "zoom", port: "A", level });

  it("the holder aims and zooms; the operator does so on a camera port nobody holds, never on one a colleague holds", () => {
    const held = at(team, [...IN, TAKE("doc-1", "A"), BY("doc-1", AIM("hepatocystic-triangle")), BY("doc-1", ZOOM("close"))]);
    expect(held.rejected).toEqual([]);
    expect(held.p.camera).toEqual({ at: "hepatocystic-triangle", zoom: "close" });
    expect(observeField(team.procedure!, held.p).camera).toEqual({ port: "A", at: "hepatocystic-triangle", zoom: "close", holder: "doc-1" });
    // the camera's steps take no time and are the colleague's own
    expect(held.s.clock).toBe(at(team, [...IN, TAKE("doc-1", "A")]).s.clock);
    const operator = at(team, [...IN, OP(AIM("cystic-plate")), OP(ZOOM("close")), OP(ZOOM("wide"))]);
    expect(operator.rejected).toEqual([]);
    expect(operator.p.camera).toEqual({ at: "cystic-plate", zoom: "wide" });
    // three surgeons: the second assistant holds the camera; the operator waits for it back, the first assistant has no camera
    const notMine = at(team, [...IN, TAKE("doc-2", "A"), OP(AIM("cystic-plate")), BY("doc-1", AIM("cystic-plate"))], { lineup: "three-surgeons" });
    expect(notMine.rejected).toEqual([
      { op: "aim", code: "requirements-unmet", reason: "port-held", message: 'doc-2 holds the laparoscope in port "A": ask them to hand it back first.' },
      { op: "aim", code: "invalid", reason: "needs-control", message: "doc-1 cannot aim the camera: it needs the camera control, which doc-1 does not hold." },
    ]);
    // a colleague does not aim a camera port the operator holds
    expect(at(team, [...IN, BY("doc-1", AIM("cystic-plate"))]).rejected).toEqual([{ op: "aim", code: "requirements-unmet", reason: "not-handed", message: 'Port "A" is the operator\'s: it has not been handed to doc-1.' }]);
    // aimed back at the whole field, the view is wide again
    expect(at(team, [...IN, OP(AIM("cystic-plate")), OP(ZOOM("close")), OP(AIM())]).p.camera).toEqual({ at: null, zoom: "wide" });
  });

  it("aim is refused without the scope, with the field closed and at an unknown region; a close view needs an aim", () => {
    const r = at(team, [...OPEN, OP(AIM("cystic-plate")), OP(SCOPE_IN), OP({ op: "desufflate" }), OP(AIM("cystic-plate")), OP({ op: "insufflate", pressure: 12 }), OP(AIM("nowhere")), OP(ZOOM("close")), OP(AIM()), OP(ZOOM("close"))]);
    expect(r.rejected).toEqual([
      { op: "aim", code: "requirements-unmet", reason: "no-instrument", message: 'No instrument is in port "A".' },
      { op: "aim", code: "requirements-unmet", reason: "field-closed", message: "The field is not in view: insufflate and put the laparoscope in." },
      { op: "aim", code: "unknown-id", reason: "unknown-region", message: 'There is no region "nowhere".' },
      { op: "zoom", code: "requirements-unmet", reason: "aim-first", message: "Aim the camera first: a close view needs a region to look at." },
      { op: "zoom", code: "requirements-unmet", reason: "aim-first", message: "Aim the camera first: a close view needs a region to look at." },
    ]);
    // only the laparoscope aims, and only from the camera port of the plan
    expect(at(team, [...IN, OP({ op: "aim", port: "B", at: "cystic-plate" })]).rejected).toEqual([{ op: "aim", code: "invalid", reason: "instrument-cannot", message: 'The grasper in port "B" cannot aim.' }]);
    expect(at(team, [...IN, OP({ op: "zoom", port: "Z", level: "wide" })]).rejected).toEqual([{ op: "zoom", code: "unknown-id", reason: "unknown-port", message: 'There is no port "Z" in the chosen plan.' }]);
    const wide: ProcedureDefinition = { ...team.procedure!, portPlans: team.procedure!.portPlans.map((p) => ({ ...p, ports: p.ports.map((x) => ({ ...x, sizeMm: 10 })) })) };
    let s = createProcedureState();
    for (const op of [REFERENCE_OPS[0]!, REFERENCE_OPS[1]!, { op: "insert", port: "B", instrument: "laparoscope" }] as ProcedureOp[]) s = operate(wide, s, op, 0).state;
    expect(operate(wide, s, { op: "aim", port: "B", at: "cystic-plate" }, 0).rejected).toEqual({ code: "invalid", message: 'Port "B" is a working port: the laparoscope is aimed from the camera port.', reason: { key: "camera-port", params: { port: "B", role: "working" } } });
    // no picture (the tower off): the reason says so, the engine's sentence as it was
    const dark = operate(team.procedure!, { ...at(team, IN).p, supply: { image: false, gas: true } }, { op: "aim", port: "A", at: "cystic-plate" }, 0).rejected;
    expect(dark?.reason).toEqual({ key: "no-picture", params: {} });
    expect(dark?.message).toMatch(/^There is no picture: /);
    // the params a front-end fills its sentence with
    expect(operate(team.procedure!, at(team, IN).p, { op: "aim", port: "B" }, 0).rejected?.reason).toEqual({ key: "instrument-cannot", params: { instrument: "grasper", op: "aim", port: "B" } });
  });

  it("the operator's work off the aim is counted and signalled — never a colleague's, never without an aim; out of frame only when close", () => {
    const never = at(team, [...IN, OP(NECK), OP(TRIANGLE_STEP)]);
    expect(never.p.counters.offView).toBeUndefined();
    expect(never.p.camera).toBeUndefined();
    expect(never.p.working).toBe("hepatocystic-triangle");
    const on = at(team, [...IN, OP(NECK), OP(AIM("hepatocystic-triangle")), OP(ZOOM("close")), OP(TRIANGLE_STEP)]);
    expect([on.p.counters.offView, on.p.unsafe]).toEqual([undefined, []]);
    const off = at(team, [...IN, OP(NECK), TAKE("doc-1", "A"), BY("doc-1", AIM("cystic-plate")), OP(TRIANGLE_STEP), OP(TRIANGLE_STEP)]);
    expect(off.p.counters.offView).toBe(2);
    expect(lastStep(off.events).signals).toContain("off-view");
    expect(off.p.unsafe).toEqual([]);
    // a colleague's own step is never off the view (their traction, the camera's own steps)
    const theirs = at(team, [...IN, TAKE("doc-1", "B"), OP(AIM("cystic-plate")), BY("doc-1", NECK)]);
    expect(theirs.p.counters.offView).toBeUndefined();
    // close on another region: out of frame — the operator's unsafe act
    const close = at(team, [...IN, OP(NECK), OP(AIM("cystic-plate")), OP(ZOOM("close")), OP(TRIANGLE_STEP)]);
    expect(close.p.counters.offView).toBe(1);
    expect(close.p.unsafe).toEqual([{ code: "out-of-frame", at: expect.any(Number) }]);
    expect(evaluate(team, close.s, { procedure: { counter: "offView", gte: 1 } })).toBe(true);
    expect(evaluate(team, never.s, { procedure: { counter: "offView", lte: 0 } })).toBe(true);
    expect(evaluate(team, off.s, { procedure: { counter: "colleague", gte: 2 } })).toBe(true);
  });

  it("the view goes with the scope: taken out, at a conversion and at the close it is dropped", () => {
    const aimed = [...IN, OP(AIM("hepatocystic-triangle"))];
    expect(at(team, aimed).p.camera).toBeDefined();
    expect(at(team, [...aimed, OP({ op: "withdraw", port: "A" })]).p.camera).toBeUndefined();
    expect(at(team, [...aimed, OP({ op: "bailout", strategy: "convert-open" })]).p.camera).toBeUndefined();
    const ref = at(team, [...REFERENCE_OPS.slice(0, -1).map(OP), OP(AIM("gallbladder-bed")), OP(REFERENCE_OPS.at(-1)!)]);
    expect(ref.rejected).toEqual([]);
    expect(ref.p).toMatchObject({ closed: true });
    expect(ref.p.camera).toBeUndefined();
  });

  it("the scope taken out during an uncontrolled bleed is unsafe for a colleague only (the camera holder turns away instead)", () => {
    // the cystic artery divided without clips: a brisk bleed, not controlled
    const bleed = [...IN, OP(NECK), ...Array.from({ length: 6 }, () => OP(TRIANGLE_STEP)), OP({ op: "isolate", port: "C", handle: "T3" }), OP({ op: "withdraw", port: "C" }), OP({ op: "insert", port: "C", instrument: "scissors" }), OP({ op: "divide", port: "C", handle: "T3" })];
    expect(at(team, bleed).p.bleeding).toEqual([expect.objectContaining({ controlled: false })]);
    const theirs = at(team, [...bleed, TAKE("doc-1", "A"), BY("doc-1", { op: "withdraw", port: "A" })]);
    expect(theirs.p.unsafe.filter((u) => u.code === "scope-withdrawn-in-bleeding")).toEqual([{ code: "scope-withdrawn-in-bleeding", at: expect.any(Number), by: "doc-1" }]);
    const mine = at(team, [...bleed, OP({ op: "withdraw", port: "A" })]);
    expect(mine.p.unsafe.some((u) => u.code === "scope-withdrawn-in-bleeding")).toBe(false);
    // no bleed: nothing unsafe in taking it out
    expect(at(team, [...IN, TAKE("doc-1", "A"), BY("doc-1", { op: "withdraw", port: "A" })]).p.unsafe).toEqual([]);
  });
});

describe("the scrub nurse passes", () => {
  it("a pass is recorded and waits for the one it was passed to: their insert takes it", () => {
    const passed = at(team, [...FOUR, OP(SCOPE_IN), BY("nurse-2", { op: "pass", instrument: "grasper", to: "doc-1" }), BY("nurse-2", { op: "pass", instrument: "clip-applier" })]);
    expect(passed.rejected).toEqual([]);
    expect(passed.p.passed).toEqual([
      { instrument: "grasper", to: "doc-1", by: "nurse-2" },
      { instrument: "clip-applier", by: "nurse-2" },
    ]);
    expect(observeField(team.procedure!, passed.p).passed).toEqual(passed.p.passed);
    // the operator's own insert takes the operator's pass, the first assistant's theirs
    const taken = at(team, [...FOUR, OP(SCOPE_IN), BY("nurse-2", { op: "pass", instrument: "grasper", to: "doc-1" }), BY("nurse-2", { op: "pass", instrument: "clip-applier" }), OP({ op: "insert", port: "C", instrument: "clip-applier" })]);
    expect(taken.p.passed).toEqual([{ instrument: "grasper", to: "doc-1", by: "nurse-2" }]);
    const both = at(team, [...FOUR, OP(SCOPE_IN), BY("nurse-2", { op: "pass", instrument: "grasper", to: "doc-1" }), BY("doc-1", { op: "insert", port: "D", instrument: "grasper" })]);
    expect(both.rejected).toEqual([]);
    expect(both.p.passed).toBeUndefined();
    expect(port(both.p, "D")).toMatchObject({ instrument: "grasper", holder: "doc-1" });
    // a pass to someone else waits: the operator's insert does not take it
    const other = at(team, [...FOUR, OP(SCOPE_IN), BY("nurse-2", { op: "pass", instrument: "grasper", to: "doc-1" }), OP({ op: "insert", port: "B", instrument: "grasper" })]);
    expect(other.p.passed).toEqual([{ instrument: "grasper", to: "doc-1", by: "nurse-2" }]);
  });

  it("only a colleague passes, what is on the table, once while it waits, never to themselves — and only with the instrument table's control", () => {
    const r = at(team, [
      ...OPEN,
      OP({ op: "pass", instrument: "grasper" }),
      BY("nurse-2", { op: "pass", instrument: "lap-us" }),
      BY("nurse-2", { op: "pass", instrument: "grasper", to: "nurse-2" }),
      BY("nurse-2", { op: "pass", instrument: "grasper" }),
      BY("nurse-2", { op: "pass", instrument: "grasper" }),
      BY("doc-1", { op: "pass", instrument: "hook" }),
    ]);
    expect(r.rejected).toEqual([
      { op: "pass", code: "invalid", reason: "colleague-only", message: "The operator does not pass instruments: the scrub nurse passes them." },
      { op: "pass", code: "unknown-id", reason: "not-on-table", message: "No lap-us is on the instrument table." },
      { op: "pass", code: "invalid", reason: "pass-self", message: "nurse-2 cannot pass the grasper to themselves." },
      { op: "pass", code: "invalid", reason: "pass-waiting", message: "The grasper has already been passed to the operator: it is waiting to go in." },
      { op: "pass", code: "invalid", reason: "needs-control", message: "doc-1 cannot pass the hook: it needs the instruments control, which doc-1 does not hold." },
    ]);
    expect(r.p.passed).toEqual([{ instrument: "grasper", by: "nurse-2" }]);
  });
});
