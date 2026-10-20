/**
 * Embodied mode: what the panels show of the world's verdict on an act
 * (`EmbodiedLink.verdict`, docs/EMBODIED.md §6) before the learner clicks —
 * done here, after a short step, only at the patient's side (one notice with
 * "Go there" for the whole tab), or elsewhere / first something else (the
 * world's words on the row; the click shows the way). Panels never decide by
 * a rule of their own.
 */
import type { Verdict } from "../../app/embodied-link.js";
import type { Game } from "../../app/context.js";
import { tr } from "../../i18n/index.js";
import { h } from "../dom.js";

/** Refusals a walk to the patient's side fixes. */
export const PATIENT_DISTANCE: ReadonlySet<string> = new Set(["not-at-patient", "not-near-patient", "patient-not-visible"]);

/** Is this refusal only that the learner stands away from the patient? */
export function onlyDistance(v: Verdict): boolean {
  return v.kind === "refused" && PATIENT_DISTANCE.has(v.reason) && !!v.hint && v.hint.goal.kind === "interact" && v.hint.goal.id.startsWith("patient:");
}

/** Can the act be started from the panel (here, a step away, or at the patient's side — the click walks or explains)? */
export function offered(v: Verdict): boolean {
  return v.kind !== "refused" || onlyDistance(v) || !!v.hint || !!v.prerequisite;
}

/**
 * The tab's notice when the learner stands away from the patient: the world's words for the first act refused
 * only for that, and the way to the patient's side. Null when nothing is refused for distance.
 */
export function distanceNotice(game: Game, verdicts: readonly Verdict[]): HTMLElement | null {
  const v = verdicts.find(onlyDistance);
  if (!v || v.kind !== "refused" || !v.hint) return null;
  const hint = v.hint;
  return h(
    "div",
    { class: "notice distance-notice", id: "distance-notice" },
    h("p", null, v.message),
    h("button", { type: "button", class: "primary", id: "distance-go", onclick: () => void game.embodied?.goTo(hint.goal, hint.label) }, hint.label || tr("emb.goThere")),
  );
}

/** A row's note for a refusal that is not only distance: the world's words (the click shows the way). */
export function refusalNote(v: Verdict): HTMLElement | null {
  if (v.kind !== "refused" || onlyDistance(v)) return null;
  return h("small", { class: "needs world-needs" }, v.message);
}
