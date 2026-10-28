import { progress, type CaseDefinition, type SessionState } from "@clinicalcraft/core";

/** Full published references contain the diagnosis; disclose them with the debrief. */
export function sourceMaterialUnlocked(c: CaseDefinition, state: SessionState): boolean {
  return c.provenance.kind === "synthetic" || state.finished || progress(c, state).complete;
}
