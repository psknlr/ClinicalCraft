/**
 * The part of a case's reference solution a place in the care team needs (docs/TEAM.md §1), for a case played without
 * its solution: the content API serves a case without it (`clinicalcraft serve`), so a front-end fetches this path
 * beside it and puts it in as the case's `solution` for a start in a place — core's own start then joins exactly as it
 * does for the full case (`canJoinTeam`, `joinPath`), and the stand-in surgeon works from the same operative steps.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction } from "../schema/session.js";
import { createSession, reduce } from "./reducer.js";
import { seatsOf } from "./seats.js";

/**
 * A case's place path: its reference solution's own start, the actions a place's start applies to join the team at its
 * phase — as many as core's join applies for any place the case offers, with any line-up (`SessionState.joined`) — and
 * then the operator's plan, which the stand-in surgeon works from: every operative step after them, in order. Nothing
 * else of the solution: no later answer, order or finish. Empty for a case that offers no place in the team (or that
 * carries no solution: then nothing joins along it).
 */
export function placePath(c: CaseDefinition): ClinicalAction[] {
  let joined = -1;
  for (const lineup of [undefined, ...(c.team?.lineups ?? []).map((l) => l.id)]) {
    for (const seat of seatsOf(c, lineup ? { lineup } : {})) {
      if (seat === "surgeon") continue;
      const r = reduce(c, createSession(c), { type: "start", seat, ...(lineup ? { lineup } : {}) });
      if (!r.rejected) joined = Math.max(joined, r.state.joined?.actions ?? 0);
    }
  }
  if (joined < 0 || c.solution.length === 0) return [];
  const start = c.solution.findIndex((a) => a.type === "start");
  const after = c.solution.slice(start + 1);
  return structuredClone([...c.solution.slice(0, start + 1), ...after.slice(0, joined), ...after.slice(joined).filter((a) => a.type === "operate")]);
}

/**
 * A case served without its solution, with its place path (`placePath`, fetched beside it) as its `solution`: what a
 * start in a place needs. A case that carries its solution, or an empty path, leaves the case as it is.
 */
export function withPlacePath(c: CaseDefinition, path: readonly ClinicalAction[]): CaseDefinition {
  if (c.solution.length > 0 || path.length === 0) return c;
  return { ...c, solution: structuredClone([...path]) };
}
