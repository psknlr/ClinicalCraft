import { citesSource } from "@clinicalcraft/agent";
import { progress, type CaseDefinition, type SessionState } from "@clinicalcraft/core";

/**
 * A published or adapted case's source — citation, DOI, authors, references, the source PDF — usually names the
 * diagnosis: the web discloses it with the debrief, once the case is finished or complete (`citesSource`, shared with
 * the CLI, MCP and server).
 */
export function sourceMaterialUnlocked(c: CaseDefinition, state: SessionState): boolean {
  return !citesSource(c) || state.finished || progress(c, state).complete;
}
