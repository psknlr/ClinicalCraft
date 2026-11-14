/**
 * The stand-in surgeon's plan, read from the record (docs/TEAM.md §4.5): the case's reference solution's operative steps
 * (`PlanStep`), and where the operation has got to — a pure function of the field's own record (`ProcedureState.refs`)
 * and of what the screen shows, never of the team's memory, so a save and resume at any point carries on from the same
 * step, exactly once.
 * - A plan step `k` is done once the field has recorded a step with its ref, `standin:<k>`.
 * - A run of dissections of one region is one move: done once the region shows cleared, or once every reference step of
 *   it and the extra dissections it allows (as many as the run has steps: `standin:<k>:dissect:<n>`) are recorded.
 * - The stand-in's own extra steps — a port taken back, the camera aimed, an instrument put back, an injury said aloud,
 *   suction — are `standin:<k>:<kind>:<n>` (`k`: the plan step they are for), counted from the record to bound them.
 * - A reference step the reference gives a colleague (`actor`) is that colleague's own: the plan passes over it.
 */
import { describeDirection, directionVector, type Direction, type DirectionName, type FieldView, type InstrumentId, type ProcedureOp } from "@clinicalcraft/core";
import type { PlanStep } from "./types.js";

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
function runEnd(plan: readonly PlanStep[], i: number): number {
  const first = plan[i]!.op;
  if (first.op !== "dissect") return i;
  let j = i;
  while (j + 1 < plan.length) {
    const next = plan[j + 1]!;
    if (next.actor !== undefined || next.op.op !== "dissect" || next.op.region !== first.region || next.op.port !== first.port || next.op.energy !== first.energy) break;
    j++;
  }
  return j;
}

/** A region shows cleared on the screen. */
function cleared(f: FieldView | null, region: string): boolean {
  return f?.regions.find((r) => r.id === region)?.dissection === "cleared";
}

/**
 * The stand-in's next step (null: the plan is done): the first of its own plan steps whose ref the field has not
 * recorded — a dissection run passed over once its region shows cleared or a later plan step is recorded (the stand-in
 * never goes back), else continued past its reference steps with extra dissections up to the run's length.
 */
export function nextStep(plan: readonly PlanStep[], refs: readonly string[], f: FieldView | null): NextStep | null {
  const done = new Set(refs);
  // the furthest plan step the field has recorded (the stand-in works its plan in order)
  let furthest = -1;
  plan.forEach((x, i) => {
    if (done.has(planRef(x.k))) furthest = i;
  });
  for (let i = 0; i < plan.length; i++) {
    const step = plan[i]!;
    if (step.actor !== undefined) continue;
    if (step.op.op !== "dissect") {
      if (!done.has(planRef(step.k))) return { step, ref: planRef(step.k) };
      continue;
    }
    const end = runEnd(plan, i);
    const run = plan.slice(i, end + 1);
    const region = step.op.region;
    i = end;
    if (cleared(f, region) || furthest > end) continue;
    const open = run.find((x) => !done.has(planRef(x.k)));
    if (open) return { step: open, ref: planRef(open.k) };
    const last = run.at(-1)!;
    const n = extras(refs, last.k, "dissect");
    if (n < run.length) return { step: last, ref: extraRef(last.k, "dissect", n + 1), extra: true };
  }
  return null;
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
