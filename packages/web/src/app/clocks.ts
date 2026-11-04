/**
 * When the encounter's time runs in the browser (docs/PROTOCOL.md "Case time"): one policy for the staff's own
 * round (`staff_step`), the care team's round (`team step`) and a real-time case clock. They run whenever the
 * encounter is open and not paused — operating in the surgery window, reading the chart or the orders, or watching
 * the team does not stop them, as it would not in a real theatre. They stop while the learner has paused (the pause
 * menu and what opens from it: settings, help, a reset confirmation) and while an approval waits for the learner's
 * answer. A case whose clock moves only with what is done (no real time) shows what it waits for next instead, with a
 * control to wait until it (the HUD's next-event button).
 */
import type { PanelName } from "./context.js";

/** Panels that pause the encounter. */
export const PAUSING_PANELS: ReadonlySet<PanelName> = new Set<PanelName>(["pause", "settings", "help", "confirm-reset"]);

/** Does the encounter's time run now? */
export function encounterClockRuns(s: { entered: boolean; approvalOpen: boolean; panel: PanelName | null }): boolean {
  return s.entered && !s.approvalOpen && !(s.panel && PAUSING_PANELS.has(s.panel));
}
