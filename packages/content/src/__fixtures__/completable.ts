/**
 * Test helper for the collection contracts: can a learner who does a step of the reference path late still finish?
 * Finishing needs every objective, so an objective (or a decision it waits for) that can become impossible to meet
 * — a record readable only in a phase that cannot be selected again — would leave the case impossible to finish.
 */
import { createSession, reduce, type CaseDefinition } from "@clinicalcraft/core";

type Step = CaseDefinition["solution"][number];

/**
 * The orders and interventions of `c.solution` that, skipped where the reference path does them and done late,
 * leave the case impossible to finish — each as `"<index> <JSON of the step>"`. The late learner's recovery is
 * generous, so what remains is a real trap: twice over, in every phase they may (still) select, they order and read
 * every record, then repeat every step of the reference path except its phase changes. Static timelines only — a
 * simulated case's physiology may legitimately deteriorate when an act is late.
 */
export function stepsThatTrapALateLearner(c: CaseDefinition): string[] {
  const traps: string[] = [];
  const rest = c.solution.filter((step) => step.type !== "finish" && step.type !== "set-phase");
  c.solution.forEach((late, k) => {
    if (late.type !== "intervene" && late.type !== "order") return;
    let state = createSession(c);
    const tryStep = (step: Step) => {
      const next = reduce(c, state, step);
      if (!next.rejected) state = next.state;
    };
    c.solution.forEach((step, i) => i !== k && step.type !== "finish" && tryStep(step));
    tryStep(late);
    for (let pass = 0; pass < 2; pass++) {
      for (const phase of c.phases) {
        tryStep({ type: "set-phase", phase: phase.id });
        for (const inv of c.investigations) {
          tryStep({ type: "order", investigationId: inv.id });
          tryStep({ type: "read", investigationId: inv.id });
        }
        for (const step of rest) tryStep(step);
      }
    }
    if (reduce(c, state, { type: "finish" }).rejected) traps.push(`${k} ${JSON.stringify(late)}`);
  });
  return traps;
}
