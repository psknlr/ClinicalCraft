/** A saved care team (docs/TEAM.md §5), checked before a resume trusts it. */
import { TEAM_STATE_VERSION, type TeamCheckpoint } from "./types.js";

/** A valid saved team (anything else is ignored: the team starts afresh). */
export function validTeamCheckpoint(value: unknown): TeamCheckpoint | null {
  const cp = value as Partial<TeamCheckpoint> | null;
  if (!cp || typeof cp !== "object" || cp.format !== "clinicalcraft-team@1" || !cp.state || typeof cp.state !== "object") return null;
  if (cp.state.version !== TEAM_STATE_VERSION || !Array.isArray(cp.state.members) || !Array.isArray(cp.state.tasks) || !Array.isArray(cp.state.completed)) return null;
  if (cp.autonomy !== "auto" && cp.autonomy !== "step" && cp.autonomy !== "off") return null;
  if (cp.surgeon !== "learner" && cp.surgeon !== "simulated") return null;
  return cp as TeamCheckpoint;
}
