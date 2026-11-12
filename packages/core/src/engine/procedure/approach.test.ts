/**
 * Changes of approach and the presentation record (the Case 126 engineering brief, delivery 1): a bail-out asked
 * twice has no second effect and costs no second minute; a different subtotal technique needs an explicit revision;
 * conversion releases pressure, instruments and traction together and ends the laparoscopic view; exposure is the
 * traction held now — withdrawing the neck grasper narrows it at once — while dissection already done stays done;
 * every committed step carries a stable id and its sequence; the score carries the case version and the engine.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { ClinicalAction, DomainEvent } from "../../schema/session.js";
import type { ProcedureOp } from "../../schema/procedure.js";
import { assess } from "../assessment.js";
import { createSession, reduce } from "../reducer.js";
import { ENGINE_VERSION } from "../version.js";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { observeField } from "./observe.js";

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
