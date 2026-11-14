/**
 * Ports held by a colleague at the operating table (docs/PROCEDURE.md §3 `hand-over`, docs/EMBODIED.md §8): an
 * assistant who took an instrument in a port (`delegate_task hold_traction`) keeps its traction with their own hands,
 * the camera holder the camera. Hands go where the body goes — the holder's body is their member's (core `memberBody`:
 * the learner's own while the learner holds a place in the team and holds a port) — and when it is no longer at the
 * table (sent elsewhere, walked away, moved by anyone), what it held has fallen: after every act the session records
 * the holder's release and hand-back as their own steps (no walk back to do it), and says so. The window closes on the
 * screen before the operator's next instrument step, which then meets the exposure that is really there; a camera let
 * go is the surgeon's again.
 */
import { memberBody, t } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { rt } from "./i18n.js";
import { procedureLabel } from "./i18n-procedure.js";
import type { SessionKernel } from "./kernel.js";
import { staffAgent } from "./staff-voice.js";

/** After an act: every port held by someone who has left the table is let go (their steps), and said. */
export function dropTractionAwayFromTable(k: SessionKernel, id: string): void {
  const e = k.embodied;
  const procedure = k.state.procedure;
  if (!e || !procedure || !k.state.started || k.state.finished) return;
  for (const port of procedure.ports) {
    if (!port.holder || !port.instrument) continue;
    const holder = port.holder;
    const body = memberBody(k.caseDef, k.state, holder);
    // at the table: the operate rule (the patient on the operating table, the body within contact range)
    if (e.world().checkSpatial(body, { tool: "operate", kind: "operate" }).ok) continue;
    const instrument = port.instrument;
    for (const [structure, r] of Object.entries(k.state.procedure?.retractions ?? {})) {
      if (r.port === port.site) k.dispatch({ type: "operate", op: { op: "release", structure }, actor: holder, by: "system" }, id);
    }
    k.dispatch({ type: "operate", op: { op: "hand-over", port: port.site }, actor: holder, by: "system" }, id);
    const L = k.locale;
    const learner = body === PRIMARY_ACTOR;
    const staff = learner ? undefined : k.facility?.staff.find((s) => s.id === holder);
    const who = learner ? rt(L, "place.You") : staff ? t(staff.name, L) : holder;
    const why = rt(L, learner ? "assist.letGo.left.you" : "assist.letGo.left");
    const camera = instrument === "laparoscope";
    const text = (camera ? rt(L, "assist.letGo.camera", { who, port: port.site, why }) : rt(L, "assist.letGo", { who, instrument: procedureLabel(L, instrument), port: port.site, why })) + " " + rt(L, camera ? "assist.cameraLost" : "assist.exposureLost");
    k.emit(id, { type: "notification", level: "warning", title: rt(L, "assist.title"), body: text });
    // a colleague says it in their own voice; the learner's own hands are told, not voiced
    if (learner) continue;
    k.speakLine(id, { agent: (staff ? staffAgent(staff.role) : "nurse") as never, speaker: who, text, grounded: [] });
    k.conversations.addDialogue({ who: staff ? staffAgent(staff.role) : "nurse", speaker: who, text });
  }
}
