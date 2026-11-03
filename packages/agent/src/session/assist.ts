/**
 * Traction held by a colleague at the operating table (docs/PROCEDURE.md §3 `hand-over`, docs/EMBODIED.md §8): an
 * assistant who took an instrument in a port (`delegate_task hold_traction`) keeps its traction with their own hands.
 * Hands go where the body goes — when the body is no longer at the table (sent elsewhere, walked away, moved by
 * anyone), the traction has fallen: after every act the session records the colleague's release and hand-back as
 * their own steps (no walk back to do it), and they say so. The window closes on the screen before the operator's
 * next instrument step, which then meets the exposure that is really there.
 */
import { t } from "@clinicalcraft/core";
import { rt } from "./i18n.js";
import { procedureLabel } from "./i18n-procedure.js";
import type { SessionKernel } from "./kernel.js";
import { staffAgent } from "./staff-voice.js";

/** After an act: every port held by a colleague who has left the table is let go (their steps), and said. */
export function dropTractionAwayFromTable(k: SessionKernel, id: string): void {
  const e = k.embodied;
  const procedure = k.state.procedure;
  if (!e || !procedure || !k.state.started || k.state.finished) return;
  for (const port of procedure.ports) {
    if (!port.holder || !port.instrument) continue;
    const holder = port.holder;
    // at the table: the operate rule (the patient on the operating table, the body within contact range)
    if (e.world().checkSpatial(`staff:${holder}`, { tool: "operate", kind: "operate" }).ok) continue;
    const instrument = port.instrument;
    for (const [structure, r] of Object.entries(k.state.procedure?.retractions ?? {})) {
      if (r.port === port.site) k.dispatch({ type: "operate", op: { op: "release", structure }, actor: holder, by: "system" }, id);
    }
    k.dispatch({ type: "operate", op: { op: "hand-over", port: port.site }, actor: holder, by: "system" }, id);
    const L = k.locale;
    const staff = k.facility?.staff.find((s) => s.id === holder);
    const who = staff ? t(staff.name, L) : holder;
    const text = rt(L, "assist.letGo", { who, instrument: procedureLabel(L, instrument), port: port.site, why: rt(L, "assist.letGo.left") }) + " " + rt(L, "assist.exposureLost");
    k.emit(id, { type: "notification", level: "warning", title: rt(L, "assist.title"), body: text });
    k.speakLine(id, { agent: (staff ? staffAgent(staff.role) : "nurse") as never, speaker: who, text, grounded: [] });
    k.conversations.addDialogue({ who: staff ? staffAgent(staff.role) : "nurse", speaker: who, text });
  }
}
