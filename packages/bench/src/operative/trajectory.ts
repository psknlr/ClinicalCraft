/**
 * Reference trajectories (docs/BENCHMARK_OPERATIVE.md §2): a trajectory names each duct or vessel by the
 * structure it must be (`@cystic-duct`), so a reviewer reads anatomy, not T-numbers, and a change in the
 * order structures come into view does not silently retarget a step. `resolveTrajectory` replays the
 * case (start with the variant, the preamble, then each step) on the pure engine and replaces each
 * placeholder by the handle the field gave that structure — reading hidden state, which only the
 * validation agents (reference, scripted-llm) may do. A placeholder for a structure not in view, or a
 * step the engine refuses, is an error in the scenario.
 */
import { BASE_VARIANT, createSession, ProcedureOpSchema, reduce, type CaseDefinition, type ClinicalAction, type ProcedureOp } from "@clinicalcraft/core";
import { HANDLE_PLACEHOLDER, type TrajectoryOp } from "./schema.js";

export type ResolvedTrajectory = { ok: true; ops: ProcedureOp[] } | { ok: false; error: string };

/** Resolve a trajectory's placeholders for `variant`, after `setup` (the actions that bring the case to the table). */
export function resolveTrajectory(c: CaseDefinition, variant: string, setup: readonly ClinicalAction[], steps: readonly TrajectoryOp[]): ResolvedTrajectory {
  let s = createSession(c);
  const start = reduce(c, s, { type: "start", ...(variant !== BASE_VARIANT ? { variant } : {}) });
  if (start.rejected) return { ok: false, error: `start: ${start.rejected.message}` };
  s = start.state;
  for (const a of setup) {
    const r = reduce(c, s, a);
    if (r.rejected) return { ok: false, error: `setup ${a.type}: ${r.rejected.message}` };
    s = r.state;
  }
  const ops: ProcedureOp[] = [];
  for (const [i, raw] of steps.entries()) {
    let step: Record<string, unknown> = { ...raw };
    if (typeof step.handle === "string" && HANDLE_PLACEHOLDER.test(step.handle)) {
      const id = step.handle.slice(1);
      const handle = s.procedure?.handles.find((h) => h.structure === id)?.handle;
      if (!handle) return { ok: false, error: `step ${i + 1} (${String(step.op)}): ${id} is not in view yet` };
      step = { ...step, handle };
    }
    const parsed = ProcedureOpSchema.safeParse(step);
    if (!parsed.success) return { ok: false, error: `step ${i + 1}: ${parsed.error.issues[0]?.message ?? "invalid"}` };
    const r = reduce(c, s, { type: "operate", op: parsed.data } as ClinicalAction);
    if (r.rejected) return { ok: false, error: `step ${i + 1} (${parsed.data.op}) refused: ${r.rejected.message}` };
    s = r.state;
    ops.push(parsed.data);
  }
  return { ok: true, ops };
}
