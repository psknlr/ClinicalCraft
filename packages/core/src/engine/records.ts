/**
 * When a clinical document exists in the simulated timeline (the engineering recommendations, P0-1). A document in the
 * case is not a document the learner can see now: the operation record, the pathology report and the follow-up are
 * written later in the encounter, and asking for them earlier finds nothing — never their text from another phase.
 *
 * A record is read from the current phase, or from a phase the encounter has already been in (an earlier report is
 * still in the notes); a phase not yet reached is never searched. Its `availability` (case schema) can hold it back
 * further: not before `earliestPhase` has been reached, nor while `when` does not hold.
 */
import type { CaseDefinition, Investigation, Result } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { evaluate } from "./conditions.js";

/** Mark a phase reached (the reducer and the timeline call it on every phase change). */
export function reachPhase(s: SessionState, phase: string): void {
  const reached = s.phasesReached ?? [];
  if (!reached.includes(phase)) s.phasesReached = [...reached, phase];
}

/** Has the encounter been in this phase (now or before)? */
export function phaseReached(s: Pick<SessionState, "phase" | "phasesReached">, phase: string): boolean {
  return s.phase === phase || (s.phasesReached ?? []).includes(phase);
}

/**
 * The four states a record can be in for the learner now:
 * - `available` — the record exists and is visible (`phase`: the phase it is read from);
 * - `not-present` — the source has no such record (an authored `available: false` result: "No ECG is recorded");
 * - `not-yet` — it is created later in the simulated timeline (`phase`: when it will exist);
 * - `none` — the case has no such document at all.
 * (A new, simulated investigation is the fifth thing the chart shows — docs/STUDIES.md — and never one of these.)
 */
export type RecordState =
  | { kind: "available"; phase: string; result: Result; historical: boolean }
  | { kind: "not-present"; phase: string; result: Result }
  | { kind: "not-yet"; phase: string }
  | { kind: "none" };

/** The phases a record has results in, in the case's phase order. */
function resultPhases(c: CaseDefinition, inv: Investigation): string[] {
  return c.phases.map((p) => p.id).filter((p) => Object.prototype.hasOwnProperty.call(inv.results, p));
}

/** The record's state for the learner now (see `RecordState`). Pure. */
export function recordAvailability(c: CaseDefinition, s: SessionState, investigationId: string): RecordState {
  const inv = c.investigations.find((i) => i.id === investigationId);
  if (!inv) return { kind: "none" };
  const phases = resultPhases(c, inv);
  if (!phases.length) return { kind: "none" };
  const policy = inv.availability;
  const earliest = policy?.earliestPhase ?? phases[0]!;
  if (!phaseReached(s, earliest)) return { kind: "not-yet", phase: earliest };
  // the current phase first, else the latest phase already reached — never one still ahead
  const reached = phases.filter((p) => phaseReached(s, p));
  const phase = reached.includes(s.phase) ? s.phase : reached.at(-1);
  if (!phase) return { kind: "not-yet", phase: phases.find((p) => !phaseReached(s, p)) ?? earliest };
  if (policy?.when && !evaluate(c, s, policy.when)) return { kind: "not-yet", phase };
  const result = inv.results[phase]!;
  if (result.available === false) return { kind: "not-present", phase, result };
  // historical: it predates the encounter (authored; default: a record there from the encounter's first phase)
  return { kind: "available", phase, result, historical: policy?.historical ?? earliest === (c.initialPhase ?? c.phases[0]!.id) };
}
