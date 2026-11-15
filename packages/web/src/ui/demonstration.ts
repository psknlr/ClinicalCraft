/**
 * Whether the demonstration (示范接诊; technical name: the autopilot — docs/GLOSSARY.md "demonstration") can be started
 * now, and why not: never while external control is on (an external agent and the demonstration would both drive the
 * clinician — docs/PROTOCOL.md §13.6), nor while the learner holds a place in the care team, said in the session's own
 * words (agent `demonstrationRefused`: the demonstration works the case as the operating surgeon — docs/TEAM.md §1).
 * The HUD's button, the pause menu's and the panel's Start are greyed out with this reason as their title; the session
 * refuses the demonstration in a place all the same.
 */
import { demonstrationRefused } from "@clinicalcraft/agent";
import type { SessionState } from "@clinicalcraft/core";
import { getLocale, tr } from "../i18n/index.js";

/** Why the demonstration cannot be started now (null: it can) — `state`: the encounter's, when one is running. */
export function demonstrationLock(external: boolean, state: Pick<SessionState, "seat"> | null | undefined, locale: string = getLocale()): string | null {
  if (external) return tr("ext.autopilotOff");
  return state ? demonstrationRefused(state, locale) : null;
}
