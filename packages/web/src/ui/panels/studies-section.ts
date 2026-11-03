/**
 * The chart's second command (docs/STUDIES.md §2): **order a new investigation** — one of the case's test profiles,
 * acquired and reported by the simulated hospital and labelled a simulated investigation — beside the first,
 * retrieving the published case's existing reports (the records above it). Ordering is the learner's `study order`
 * through the normal action path; the session's study service does the rest (the nurse fetches the device, the
 * acquisition, the report, the review), and this section shows the record as it stands — the same words as
 * `read_study`, so a reload or a change of language shows the same report.
 */
import { orderText } from "@clinicalcraft/agent";
import { t, type StudyProfile } from "@clinicalcraft/core";
import type { App, Game } from "../../app/context.js";
import { getLocale, tr } from "../../i18n/index.js";
import { h } from "../dom.js";

/** The new-investigations section of the Tests tab (null: the case offers none). */
export function studiesSection(app: App, game: Game): HTMLElement | null {
  const profiles = game.caseDef.studies ?? [];
  if (!profiles.length) return null;
  const L = getLocale();
  const state = game.session.store.snapshot?.state ?? game.session.session.state;
  const facility = game.session.session.facility;
  const order = (p: StudyProfile, configuration?: string) => {
    const n = (state.studies?.orders.filter((o) => o.code === p.code).length ?? 0) + 1;
    app.act({ type: "study", study: { op: "order", code: p.code, key: `${p.code}:web:${n}`, requester: "learner", priority: "routine", ...(configuration ? { configuration } : {}) } });
  };
  const rows = profiles.map((p) => {
    // every order of the study apart: a reviewed first ECG never hides a second one waiting
    const orders = (state.studies?.orders ?? []).filter((o) => o.code === p.code);
    const ordered = orders.length > 0;
    const buttons =
      p.model.kind === "ecg"
        ? [h("button", { type: "button", dataset: { study: p.code, config: "standard" }, onclick: () => order(p, "standard") }, tr("studies.orderStandard")), ...(p.model.dextrocardia ? [h("button", { type: "button", dataset: { study: p.code, config: "mirror" }, onclick: () => order(p, "mirror") }, tr("studies.orderMirror"))] : [])]
        : [h("button", { type: "button", dataset: { study: p.code }, onclick: () => order(p) }, ordered ? tr("studies.repeat") : tr("studies.order"))];
    const instances = orders.map((o) => {
      const [head, ...rest] = (orderText(game.caseDef, state, o.id, L, facility) ?? "").split("\n");
      return h(
        "div",
        { class: "study-instance", dataset: { order: o.id, accession: o.accessions.at(-1) ?? "", stage: o.stage ?? "ordered" } },
        h("div", { class: "small" }, `${o.id} · ${head}`),
        rest.length ? h("details", { class: "study-report" }, h("summary", null, tr("studies.report")), h("pre", { class: "small" }, rest.join("\n"))) : null,
      );
    });
    return h(
      "div",
      { class: "study-row", dataset: { study: p.code } },
      h("b", null, t(p.name, L)),
      ordered ? instances : h("div", { class: "small", dataset: { status: "none" } }, tr("studies.notOrdered")),
      h("div", { class: "study-actions" }, buttons),
    );
  });
  return h("section", { class: "studies", id: "new-studies" }, h("h4", { class: "group-title" }, tr("studies.title")), h("p", { class: "small muted" }, tr("studies.lead")), rows);
}
