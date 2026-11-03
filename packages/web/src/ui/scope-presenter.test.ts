/**
 * The operation on screen, step by step (the engineering recommendations' visual acceptance test, headless):
 * at the neck retraction the window opens; when the grasper is withdrawn the neck falls back and the window narrows
 * before the next energy step — the tissue already cleared stays cleared (the picture's dissection layer and its
 * exposure window are apart); several steps committed at once (an accelerated demonstration) are shown one by one,
 * each clip on its own, and the last frame is the session's own field; a first look shows the field as it is.
 */
import { createSession, observeField, reduce, type ClinicalAction, type DomainEvent, type ProcedureOp, type SessionState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { lapCholeCase } from "./panels/__fixtures__/lap-chole-sit.js";
import { lapScene } from "./panels/surgery-scene.js";
import { ScopePresenter, type StepEvent } from "./scope-presenter.js";

const c = lapCholeCase();
const def = c.procedure!;

function run(ops: ProcedureOp[], from?: { s: SessionState; events: StepEvent[] }) {
  let s = from?.s ?? reduce(c, reduce(c, createSession(c), { type: "start" }).state, { type: "set-phase", phase: "theatre" }).state;
  const events: StepEvent[] = [...(from?.events ?? [])];
  for (const op of ops) {
    const r = reduce(c, s, { type: "operate", op } as ClinicalAction);
    if (r.rejected) throw new Error(`${op.op}: ${r.rejected.message}`);
    events.push(...r.events.filter((e): e is Extract<DomainEvent, { type: "procedure.step" }> => e.type === "procedure.step"));
    s = r.state;
  }
  return { s, events };
}
const ACCESS: ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
];
const NECK: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" };
const dissect = (n: number): ProcedureOp[] => Array.from({ length: n }, () => ({ op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }) as ProcedureOp);
const windowOf = (s: SessionState) => lapScene(def, s.procedure!, observeField(def, s.procedure!)).windows.find((w) => w.id === "hepatocystic-triangle");
const tissueOf = (s: SessionState) => lapScene(def, s.procedure!, observeField(def, s.procedure!)).tissue.find((w) => w.id === "hepatocystic-triangle");

describe("the scope's picture: exposure apart from dissection", () => {
  it("retracted, the window is open; the grasper withdrawn, it narrows at once while the cleared tissue stays cleared", () => {
    const held = run([...ACCESS, NECK, ...dissect(3)]).s;
    expect(windowOf(held)?.exposure).toBe(1);
    const dropped = run([{ op: "withdraw", port: "B" }], { s: held, events: [] }).s;
    expect(windowOf(dropped)!.exposure).toBeLessThan(1);
    // the dissection layer did not change: the tissue over the region is as thin as it was
    expect(tissueOf(dropped)?.opacity).toBe(tissueOf(held)?.opacity);
    // nothing about the window before the region is begun
    expect(windowOf(run([...ACCESS, NECK]).s)).toBeUndefined();
  });
});

describe("the presentation queue", () => {
  it("a first look shows the field as it is, without replaying the operation", () => {
    const { s, events } = run([...ACCESS, NECK]);
    const p = new ScopePresenter(def);
    p.sync(events, s.procedure!);
    expect(p.pending()).toBe(0);
    expect(p.current()).toEqual(s.procedure);
  });

  it("several steps committed at once are shown one by one, in order, each with its own field; the last is the session's", () => {
    const start = run([...ACCESS, NECK, ...dissect(6)]);
    const p = new ScopePresenter(def);
    p.sync(start.events, start.s.procedure!);
    // isolate, then three clips and a withdrawal in one go (an accelerated demonstration)
    const handle = start.s.procedure!.handles[0]!.handle;
    const burst = run(
      [
        { op: "isolate", port: "C", handle },
        { op: "withdraw", port: "C" },
        { op: "insert", port: "C", instrument: "clip-applier" },
        { op: "clip", port: "C", handle, count: 1 },
        { op: "clip", port: "C", handle, count: 1 },
        { op: "clip", port: "C", handle, count: 1 },
      ],
      start,
    );
    p.sync(burst.events, burst.s.procedure!);
    expect(p.pending()).toBe(6);
    const shown: { op: string; clips: number }[] = [];
    for (let step = p.next(); step; step = p.next()) {
      const structure = step.state.handles.find((x) => x.handle === handle)!.structure;
      shown.push({ op: step.event.op, clips: step.state.clips[structure] ?? 0 });
    }
    expect(shown).toEqual([
      { op: "isolate", clips: 0 },
      { op: "withdraw", clips: 0 },
      { op: "insert", clips: 0 },
      { op: "clip", clips: 1 },
      { op: "clip", clips: 2 },
      { op: "clip", clips: 3 },
    ]);
    expect(p.current()).toBe(burst.s.procedure);
    // the steps carry their identity in the record's order
    expect(burst.events.map((e) => e.seq)).toEqual([...burst.events.map((e) => e.seq)].sort((a, b) => a! - b!));
  });
});
