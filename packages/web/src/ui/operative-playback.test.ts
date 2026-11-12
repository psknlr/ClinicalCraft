/**
 * The operation on screen, step by step (the engineering recommendations' visual acceptance test, headless):
 * at the neck retraction the window opens; when the grasper is withdrawn the neck falls back and the window narrows
 * before the next energy step — the tissue already cleared stays cleared (the picture's dissection layer and its
 * exposure window are apart); several steps committed at once (an accelerated demonstration) are shown one by one,
 * each clip on its own, and the last frame is the session's own field; a refused step is a frame of its own and keeps
 * its time; a first look shows the field as it is.
 */
import { createSession, observeField, reduce, type ClinicalAction, type DomainEvent, type ProcedureOp, type SessionState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { lapCholeCase } from "./panels/__fixtures__/lap-chole-sit.js";
import { lapScene } from "./panels/surgery-scene.js";
import { OperativePlayback, type OperativeEvent } from "./operative-playback.js";

const c = lapCholeCase();
const def = c.procedure!;

function run(ops: ProcedureOp[], from?: { s: SessionState; events: OperativeEvent[] }) {
  let s = from?.s ?? reduce(c, reduce(c, createSession(c), { type: "start" }).state, { type: "set-phase", phase: "theatre" }).state;
  const events: OperativeEvent[] = [...(from?.events ?? [])];
  for (const op of ops) {
    const r = reduce(c, s, { type: "operate", op } as ClinicalAction);
    if (r.rejected) throw new Error(`${op.op}: ${r.rejected.message}`);
    events.push(...r.events.filter((e): e is OperativeEvent => e.type === "procedure.step"));
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

/** Manual timers: the test moves the clock and runs what is due. */
function manualTimers() {
  let now = 0;
  const due: { at: number; fn: () => void }[] = [];
  return {
    timers: { now: () => now, schedule: (fn: () => void, ms: number) => due.push({ at: now + ms, fn }), cancel: () => undefined },
    advance(ms: number) {
      now += ms;
      for (let x = due.findIndex((d) => d.at <= now); x >= 0; x = due.findIndex((d) => d.at <= now)) due.splice(x, 1)[0]!.fn();
    },
  };
}

/** The record's operative events, steps and refusals, in order (as the session emits them). */
function record(ops: ProcedureOp[], from?: { s: SessionState; events: OperativeEvent[] }) {
  let s = from?.s ?? reduce(c, reduce(c, createSession(c), { type: "start" }).state, { type: "set-phase", phase: "theatre" }).state;
  const events: OperativeEvent[] = [...(from?.events ?? [])];
  for (const op of ops) {
    const r = reduce(c, s, { type: "operate", op } as ClinicalAction);
    events.push(...r.events.filter((e): e is OperativeEvent => e.type === "procedure.step" || (e.type === "action.rejected" && e.action === "operate")));
    s = r.state;
  }
  return { s, events };
}

describe("one operative playback for every view", () => {
  it("a first look shows the field as it is, without replaying the operation", () => {
    const { s, events } = record([...ACCESS, NECK]);
    const p = new OperativePlayback(manualTimers().timers);
    p.attach("k", def);
    p.sync(events, s.procedure!);
    expect(p.pending()).toBe(0);
    expect(p.frame().state).toEqual(s.procedure);
    expect(p.frame().item).toMatchObject({ kind: "step", operation: "retract" });
  });

  it("six steps submitted at once are six frames in order; a refused cholangiogram in between is a frame of its own, the field unchanged", () => {
    const clock = manualTimers();
    const start = record([...ACCESS, NECK, ...dissect(6)]);
    const p = new OperativePlayback(clock.timers);
    p.attach("k", def);
    p.sync(start.events, start.s.procedure!);
    const handle = start.s.procedure!.handles[0]!.handle;
    const burst = record(
      [
        { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" },
        { op: "withdraw", port: "B" },
        { op: "image", modality: "ioc", port: "C" },
        { op: "insert", port: "B", instrument: "maryland" },
        { op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false },
        { op: "isolate", port: "C", handle },
        { op: "withdraw", port: "C" },
        { op: "insert", port: "C", instrument: "clip-applier" },
        { op: "clip", port: "C", handle, count: 1 },
        { op: "clip", port: "C", handle, count: 1 },
      ],
      start,
    );
    const frames: { kind: string; op: string; clips: number; steps: number }[] = [];
    p.subscribe(() => {
      const f = p.frame();
      const structure = f.state!.handles.find((x) => x.handle === handle)!.structure;
      frames.push({ kind: f.item!.kind, op: f.item!.operation, clips: f.state!.clips[structure] ?? 0, steps: f.state!.counters.steps });
    });
    p.sync(burst.events, burst.s.procedure!);
    for (let i = 0; i < 40; i++) clock.advance(2000);
    expect(frames.map((f) => `${f.kind}:${f.op}`)).toEqual(["step:retract", "step:withdraw", "rejected:image", "step:insert", "step:dissect", "step:isolate", "step:withdraw", "step:insert", "step:clip", "step:clip"]);
    // the refusal changed nothing: the same field as the frame before it
    const ioc = frames.findIndex((f) => f.kind === "rejected");
    expect(frames[ioc]!.steps).toBe(frames[ioc - 1]!.steps);
    // each clip its own frame
    expect(frames.filter((f) => f.op === "clip").map((f) => f.clips)).toEqual([1, 2]);
    expect(p.frame().state).toBe(burst.s.procedure);
  });

  it("a refusal stays on screen: the next accepted step waits for its time; a second view reads the same frame", () => {
    const clock = manualTimers();
    const start = record([...ACCESS, NECK, ...dissect(3)]);
    const p = new OperativePlayback(clock.timers);
    p.attach("k", def);
    p.sync(start.events, start.s.procedure!);
    const refused = record([{ op: "image", modality: "ioc", port: "C" }], start);
    p.sync(refused.events, refused.s.procedure!);
    expect(p.frame().item).toMatchObject({ kind: "rejected", accepted: false, rejectionReason: expect.any(String) });
    // the next step arrives at once: the refusal keeps its time on screen
    const next = record([{ op: "dissect", port: "C", region: "hepatocystic-triangle", energy: false }], refused);
    p.sync(next.events, next.s.procedure!);
    expect(p.frame().item?.kind).toBe("rejected");
    clock.advance(1000);
    expect(p.frame().item?.kind).toBe("rejected");
    // the dock and the surgery window are two readers of one frame: whichever opens now shows this same refusal
    const dock = p.frame();
    const surgeryWindow = p.frame();
    expect(surgeryWindow).toEqual(dock);
    clock.advance(2000);
    expect(p.frame().item).toMatchObject({ kind: "step", operation: "dissect" });
  });
});

describe("the picture follows the equipment, whatever frame is on screen (the follow-up audit)", () => {
  const supply = (s: SessionState, image: boolean, gas: boolean) => reduce(c, s, { type: "procedure-supply", supply: { image, gas, source: "test tower" } } as ClinicalAction).state;
  const live = (p: OperativePlayback) => observeField(def, p.frame().state!);

  it("a working tower fails with nothing queued: the next render is dark and deflated; a backup brings the picture back", () => {
    const clock = manualTimers();
    const { s, events } = record([...ACCESS, NECK]);
    const p = new OperativePlayback(clock.timers);
    p.attach("k", def);
    p.sync(events, s.procedure!);
    expect(live(p)).toMatchObject({ inView: true, supply: { image: true, gas: true } });
    let renders = 0;
    p.subscribe(() => renders++);
    const failed = supply(s, false, false);
    p.sync(events, failed.procedure!);
    expect(p.pending()).toBe(0);
    expect(renders).toBe(1);
    expect(live(p)).toMatchObject({ inView: false, supply: { image: false, gas: false } });
    expect(p.frame().state).toMatchObject({ insufflated: false, pressure: 0 });
    // the caption is still the last step: the darkness is the equipment's, not a new step's
    expect(p.frame().item).toMatchObject({ kind: "step", operation: "retract" });
    // a spare tower: the picture back, the abdomen still to be insufflated again
    const backup = supply(failed, true, true);
    p.sync(events, backup.procedure!);
    expect(renders).toBe(2);
    // the camera works again, but the abdomen is down: no view until the pneumoperitoneum is made again
    expect(live(p)).toMatchObject({ inView: false, supply: { image: true, gas: true } });
    expect(p.frame().state).toMatchObject({ insufflated: false });
    const again = record([{ op: "insufflate", pressure: 12 }], { s: backup, events });
    p.sync(again.events, again.s.procedure!);
    for (let i = 0; i < 3; i++) clock.advance(2000);
    expect(live(p)).toMatchObject({ inView: true, supply: { image: true, gas: true } });
    // a reload (a first look) under the failed tower is dark from its first frame
    const reloaded = new OperativePlayback(manualTimers().timers);
    reloaded.attach("k2", def);
    reloaded.sync(events, failed.procedure!);
    expect(observeField(def, reloaded.frame().state!).inView).toBe(false);
  });

  it("the tower fails while older steps are still playing: every frame from then on is dark; the steps still play in order", () => {
    const clock = manualTimers();
    const start = record([...ACCESS, NECK]);
    const p = new OperativePlayback(clock.timers);
    p.attach("k", def);
    p.sync(start.events, start.s.procedure!);
    const burst = record(dissect(4), start);
    p.sync(burst.events, burst.s.procedure!);
    expect(p.pending()).toBeGreaterThan(0);
    expect(live(p).inView).toBe(true);
    const failed = supply(burst.s, false, true);
    p.sync(burst.events, failed.procedure!);
    // the older step on screen is shown without a picture at once, not after the queue drains
    expect(live(p)).toMatchObject({ inView: false, supply: { image: false } });
    const ops: string[] = [];
    p.subscribe(() => {
      ops.push(p.frame().item!.operation);
      expect(live(p).inView).toBe(false);
    });
    for (let i = 0; i < 10; i++) clock.advance(2000);
    expect(ops.every((op) => op === "dissect")).toBe(true);
    expect(p.frame().state).toBe(failed.procedure);
  });
});

describe("an abdomen the equipment let down stays down on every frame shown after it (the round 3 audit)", () => {
  const supply = (s: SessionState, on: boolean) => reduce(c, s, { type: "procedure-supply", supply: { image: on, gas: on }, by: "system" } as ClinicalAction).state;

  it("the tower fails and is restored while older dissection frames wait: they play in order, deflated, until a new insufflation", () => {
    const clock = manualTimers();
    const base = record([...ACCESS, NECK]);
    const p = new OperativePlayback(clock.timers);
    p.attach("k", def);
    p.sync(base.events, base.s.procedure!);
    const burst = record(dissect(4), base);
    p.sync(burst.events, burst.s.procedure!);
    const queued = p.pending();
    expect(queued).toBeGreaterThan(0);
    // fails: dark; restored with no reinflation: the engine has 0 mmHg and no view — so has every frame shown
    const failure = supply(burst.s, false);
    p.sync(burst.events, failure.procedure!);
    expect(observeField(def, p.frame().state!).inView).toBe(false);
    const repaired = supply(failure, true);
    p.sync(burst.events, repaired.procedure!);
    expect(repaired.procedure).toMatchObject({ insufflated: false, pressure: 0 });
    expect(p.frame().state).toMatchObject({ insufflated: false, pressure: 0 });
    expect(observeField(def, p.frame().state!).inView).toBe(false);
    // the older steps still play, each its own caption, in order — every one of them down
    const shown: { op: string; steps: number; pressure: number; inView: boolean }[] = [];
    p.subscribe(() => {
      const f = p.frame();
      shown.push({ op: f.item!.operation, steps: f.state!.counters.steps, pressure: f.state!.pressure, inView: observeField(def, f.state!).inView });
    });
    for (let i = 0; i < 20; i++) clock.advance(2000);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((x) => x.op === "dissect" && x.pressure === 0 && !x.inView)).toBe(true);
    expect(shown.map((x) => x.steps)).toEqual([...shown.map((x) => x.steps)].sort((a, b) => a - b));
    expect(p.pending()).toBe(0);
    expect(p.frame().state).toBe(repaired.procedure);
    // a new accepted insufflation: from then on the frames have the pneumoperitoneum again
    const again = record([{ op: "insufflate", pressure: 12 }, ...dissect(1)], { s: repaired, events: burst.events });
    shown.length = 0;
    p.sync(again.events, again.s.procedure!);
    for (let i = 0; i < 6; i++) clock.advance(2000);
    expect(shown.map((x) => [x.op, x.pressure, x.inView])).toEqual([["insufflate", 12, true], ["dissect", 12, true]]);
  });

  it("the same with a long backlog and with none: never a pressure or a view the record does not have", () => {
    for (const backlog of [0, 12]) {
      const clock = manualTimers();
      const base = record([...ACCESS, NECK]);
      const p = new OperativePlayback(clock.timers);
      p.attach(`k${backlog}`, def);
      p.sync(base.events, base.s.procedure!);
      const burst = backlog ? record(dissect(backlog), base) : base;
      p.sync(burst.events, burst.s.procedure!);
      const failure = supply(burst.s, false);
      p.sync(burst.events, failure.procedure!);
      const repaired = supply(failure, true);
      p.sync(burst.events, repaired.procedure!);
      let worst = 0;
      p.subscribe(() => (worst = Math.max(worst, p.frame().state!.pressure)));
      for (let i = 0; i < 60; i++) clock.advance(2000);
      expect([worst, p.frame().state!.pressure, observeField(def, p.frame().state!).inView], `backlog ${backlog}`).toEqual([0, 0, false]);
    }
  });
});
