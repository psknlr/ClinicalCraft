/** A saved care team (docs/TEAM.md §5), checked before a resume trusts it. */
import { TEAM_STATE_VERSION, type TeamCheckpoint, type TeamLifecycle } from "./types.js";

const LIFECYCLES: readonly TeamLifecycle[] = ["pending", "active", "completed"];

/**
 * A valid saved team (anything else is ignored: the team starts afresh). A team saved before the scenario's
 * lifecycle was kept (state version 1) is read as set up when anything had happened (a round run, a message, a task,
 * a count), else as pending.
 */
export function validTeamCheckpoint(value: unknown): TeamCheckpoint | null {
  const cp = value as Partial<TeamCheckpoint> | null;
  if (!cp || typeof cp !== "object" || cp.format !== "clinicalcraft-team@1" || !cp.state || typeof cp.state !== "object") return null;
  const st = cp.state as Omit<Partial<TeamCheckpoint["state"]>, "version"> & { version?: number };
  if ((st.version !== TEAM_STATE_VERSION && st.version !== 1) || !Array.isArray(st.members) || !Array.isArray(st.tasks) || !Array.isArray(st.completed)) return null;
  if (cp.autonomy !== "auto" && cp.autonomy !== "step" && cp.autonomy !== "off") return null;
  if (cp.surgeon !== "learner" && cp.surgeon !== "simulated") return null;
  if (st.version === 1) {
    const begun = (st.round ?? 0) > 0 || (st.messages?.length ?? 0) > 0 || st.tasks.length > 0 || !!st.count;
    return { ...(cp as TeamCheckpoint), state: { ...(st as TeamCheckpoint["state"]), version: TEAM_STATE_VERSION, lifecycle: begun ? "active" : "pending" } };
  }
  if (!LIFECYCLES.includes(st.lifecycle as TeamLifecycle)) return null;
  return cp as TeamCheckpoint;
}
