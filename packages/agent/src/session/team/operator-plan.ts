/**
 * The stand-in surgeon's plan, read from the record (docs/TEAM.md §4.5): the case's reference solution's operative steps
 * (`PlanStep`), and where the operation has got to — a pure function of the field's own record (`ProcedureState.refs`)
 * and of what the screen shows, never of the team's memory, so a save and resume at any point carries on from the same
 * step, exactly once.
 * - A plan step `k` is done once the field has recorded a step with its ref, `standin:<k>` — or when the learner's start
 *   in a place applied it (core `joinPath`, `SessionState.joined`: the reference up to the team's phase, by the system).
 *   The stand-in works its plan in order: a step of its own before the furthest one done is passed, never gone back to.
 * - A run of dissections of one region is one move: done once the region shows cleared, or once every reference step of
 *   it and the extra dissections it allows (as many as the run has steps: `standin:<k>:dissect:<n>`) are recorded.
 * - The stand-in's own extra steps — a port taken back, the camera aimed, an instrument put back, an injury said aloud,
 *   suction — are `standin:<k>:<kind>:<n>` (`k`: the plan step they are for), counted from the record to bound them.
 * - A reference step the reference gives a colleague (`actor`; the operator's own names — the `surgeon` token, the
 *   stand-in's id — are no actor, as core `normaliseStep` reads them) is that colleague's own, never the stand-in's: its
 *   next step passes over it, and before that step it asks the colleague for it (`colleagueSteps`), or waits for the
 *   learner when the step is their place's. So is a step of its own it hands to a colleague (`handed`: a traction on an
 *   assist port the traction assistant takes, a port the reference hands over) — unless it takes it back after all, as
 *   its own plan step.
 */
import { describeDirection, directionVector, type ClinicalAction, type Direction, type DirectionName, type FieldView, type InstrumentId, type ProcedureOp } from "@clinicalcraft/core";
import type { PlanStep } from "./types.js";

/** How a reference step reads in this encounter (core `normaliseStep`: the operator's own names are no actor, no `to`). */
export type StepReading = (op: ProcedureOp, actor?: string) => { op: ProcedureOp; actor?: string };

/**
 * The stand-in's plan: a case's reference solution's operative steps, in order (`PlanStep.k`: their index among them),
 * each as the field reads it (`normalise`: the `surgeon` token and the stand-in's own id are the operator — no actor);
 * `joined`, the reference actions the learner's start in a place applied (`SessionState.joined.actions`: the first of
 * the solution's actions after its own start) — their operative steps are done.
 */
export function planOf(solution: readonly ClinicalAction[], o: { joined?: number; normalise?: StepReading } = {}): PlanStep[] {
  const start = solution.findIndex((a) => a.type === "start");
  const joined = o.joined ?? 0;
  const steps: PlanStep[] = [];
  solution.forEach((a, i) => {
    if (a.type !== "operate") return;
    const byJoin = i > start && i <= start + joined;
    const read = o.normalise ? o.normalise(structuredClone(a.op), a.actor) : { op: structuredClone(a.op), ...(a.actor ? { actor: a.actor } : {}) };
    steps.push({ k: steps.length, op: read.op, ...(read.actor ? { actor: read.actor } : {}), ...(byJoin ? { joined: true as const } : {}) });
  });
  return steps;
}

/** A step of the stand-in's own plan it hands to a colleague now (docs/TEAM.md §4.5): not its to take, as a colleague's own step is not. */
export type Handed = (x: PlanStep) => boolean;
const NONE_HANDED: Handed = () => false;

/** A plan step done: recorded with its ref, or applied when the learner joined. */
function isDone(x: PlanStep, refs: ReadonlySet<string>): boolean {
  return x.joined === true || refs.has(planRef(x.k));
}

/** The index in the plan of the furthest plan step done (-1: none): the stand-in works its plan in order. */
export function furthestDone(plan: readonly PlanStep[], refs: ReadonlySet<string>): number {
  let furthest = -1;
  plan.forEach((x, i) => {
    if (isDone(x, refs)) furthest = i;
  });
  return furthest;
}

/** The ref a plan step is recorded with in the field (`ProcedureState.refs`). */
export function planRef(k: number): string {
  return `standin:${k}`;
}

/** The ref of the stand-in's `n`-th extra step of a kind for plan step `k` (`standin:<k>:<kind>:<n>`). */
export function extraRef(k: number, kind: string, n: number): string {
  return `standin:${k}:${kind}:${n}`;
}

/** How many extra steps of a kind the field has recorded for plan step `k`. */
export function extras(refs: readonly string[], k: number, kind: string): number {
  const prefix = `standin:${k}:${kind}:`;
  return refs.filter((r) => r.startsWith(prefix)).length;
}

/** The plan step to take now: the step, the ref it is recorded with, and — inside a dissection run — the run's last step. */
export interface NextStep {
  step: PlanStep;
  ref: string;
  /** An extra dissection beyond the run's reference steps (the region not cleared yet). */
  extra?: boolean;
}

/** The dissection run a plan step opens: the consecutive dissections of one region, through one port, alike. */
function runEnd(plan: readonly PlanStep[], i: number, handed: Handed): number {
  const first = plan[i]!.op;
  if (first.op !== "dissect") return i;
  let j = i;
  while (j + 1 < plan.length) {
    const next = plan[j + 1]!;
    if (next.actor !== undefined || handed(next) || next.op.op !== "dissect" || next.op.region !== first.region || next.op.port !== first.port || next.op.energy !== first.energy) break;
    j++;
  }
  return j;
}

/** A region shows cleared on the screen. */
function cleared(f: FieldView | null, region: string): boolean {
  return f?.regions.find((r) => r.id === region)?.dissection === "cleared";
}

/**
 * The stand-in's next step (null: the plan is done): the first of its own plan steps — not a colleague's, not one it
 * hands on (`handed`) — whose ref the field has not recorded and that comes after the furthest one done (it never goes
 * back) — a dissection run passed over once its region shows cleared or a later plan step is recorded, else continued
 * past its reference steps with extra dissections up to the run's length.
 */
export function nextStep(plan: readonly PlanStep[], refs: readonly string[], f: FieldView | null, handed: Handed = NONE_HANDED): NextStep | null {
  const done = new Set(refs);
  const furthest = furthestDone(plan, done);
  for (let i = 0; i < plan.length; i++) {
    const step = plan[i]!;
    if (step.actor !== undefined || handed(step)) continue;
    if (step.op.op !== "dissect") {
      if (!isDone(step, done) && i > furthest) return { step, ref: planRef(step.k) };
      continue;
    }
    const end = runEnd(plan, i, handed);
    const run = plan.slice(i, end + 1);
    const region = step.op.region;
    i = end;
    if (cleared(f, region) || furthest > end) continue;
    const open = run.find((x) => !isDone(x, done));
    if (open) return { step: open, ref: planRef(open.k) };
    const last = run.at(-1)!;
    const n = extras(refs, last.k, "dissect");
    if (n < run.length) return { step: last, ref: extraRef(last.k, "dissect", n + 1), extra: true };
  }
  return null;
}

/**
 * The colleagues' own steps the reference has now, and the steps of its own the stand-in hands on (`handed`) — after the
 * furthest plan step done and before the stand-in's next (`next`; null: the plan's end), in order: the stand-in asks for
 * each before it goes on (or waits for the learner, when it is their place's), and never takes a colleague's itself.
 */
export function colleagueSteps(plan: readonly PlanStep[], refs: readonly string[], next: PlanStep | null, handed: Handed = NONE_HANDED): PlanStep[] {
  const done = new Set(refs);
  const furthest = furthestDone(plan, done);
  const end = next ? plan.findIndex((x) => x.k === next.k) : plan.length;
  return plan.filter((x, i) => (x.actor !== undefined || handed(x)) && !x.joined && i > furthest && i < end);
}

/** The plan steps before step `k` (the reference as it stands when `k` is next), the stand-in's own and its colleagues'. */
function before(plan: readonly PlanStep[], k: number): PlanStep[] {
  return plan.filter((x) => x.k < k);
}

/** The instrument the reference has in each port before plan step `k` (ports it never used: absent). */
export function expectedInstruments(plan: readonly PlanStep[], k: number): Map<string, InstrumentId | null> {
  const out = new Map<string, InstrumentId | null>();
  for (const { op } of before(plan, k)) {
    if (op.op === "insert") out.set(op.port, op.instrument);
    else if (op.op === "withdraw") out.set(op.port, null);
    else if (op.op === "close" || (op.op === "bailout" && op.strategy === "convert-open")) for (const port of out.keys()) out.set(port, null);
  }
  return out;
}

/** A direction in the patient's terms, named (a pull given as a vector is named as it reads out). */
export function directionNames(d: Direction): DirectionName[] {
  return typeof d[0] === "number" ? (describeDirection(directionVector(d)) as DirectionName[]) : [...(d as DirectionName[])];
}

/** A traction the reference holds: the structure, the port, which way, how hard. */
export interface Traction {
  structure: string;
  port: string;
  direction: DirectionName[];
  force: "gentle" | "firm" | "excessive";
}

/** The tractions the reference holds before plan step `k` (one per port: a new pull through a port replaces its last). */
export function expectedTractions(plan: readonly PlanStep[], k: number): Traction[] {
  const out = new Map<string, Traction>();
  const dropPort = (port: string) => {
    for (const [structure, t] of out) if (t.port === port) out.delete(structure);
  };
  for (const { op } of before(plan, k)) {
    if (op.op === "retract") {
      dropPort(op.port);
      out.set(op.structure, { structure: op.structure, port: op.port, direction: directionNames(op.direction), force: op.force });
    } else if (op.op === "release") out.delete(op.structure);
    else if (op.op === "withdraw" || op.op === "insert") dropPort(op.port);
    else if (op.op === "close" || (op.op === "bailout" && op.strategy === "convert-open")) out.clear();
  }
  return [...out.values()];
}

/** The field shows a traction as the reference holds it (that structure, through that port, that way, that hard). */
export function tractionShown(f: FieldView, t: Traction): boolean {
  const want = describeDirection(directionVector(t.direction));
  return f.retractions.some((r) => r.structure === t.structure && r.port === t.port && r.force === t.force && r.direction.length === want.length && want.every((d) => r.direction.includes(d)));
}

/** The most recent plan step of the stand-in's before `k` that matches (null: none). */
export function lastOwn(plan: readonly PlanStep[], k: number, match: (op: ProcedureOp) => boolean): PlanStep | null {
  for (let i = plan.length - 1; i >= 0; i--) {
    const x = plan[i]!;
    if (x.k < k && x.actor === undefined && match(x.op)) return x;
  }
  return null;
}

/** Steps that work the instrument in their port (it must be the one the reference has there). */
const WORKS_INSTRUMENT: ReadonlySet<ProcedureOp["op"]> = new Set(["retract", "dissect", "isolate", "clip", "divide", "coagulate", "suction", "irrigate", "image", "bag"]);

/** The port a step works with the instrument in it (null: none). */
export function instrumentPort(op: ProcedureOp): string | null {
  return WORKS_INSTRUMENT.has(op.op) && "port" in op ? op.port : null;
}

/** Steps on tissue (where the camera should look, exposure secured first). */
export const TISSUE_OPS: ReadonlySet<ProcedureOp["op"]> = new Set(["dissect", "isolate", "clip", "divide", "coagulate"]);

/** Steps that need the picture (the field open on the screen). */
const PICTURE_OPS: ReadonlySet<ProcedureOp["op"]> = new Set(["retract", "dissect", "isolate", "clip", "divide", "coagulate", "suction", "irrigate", "image", "bag", "aim", "zoom", "inspect"]);

/** Whether a step needs the picture on the screen (the laparoscope's image). */
export function needsPicture(op: ProcedureOp): boolean {
  return PICTURE_OPS.has(op.op);
}
