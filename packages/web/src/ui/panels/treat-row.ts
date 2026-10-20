/**
 * One treatment of the case as a row (the patient's Treat tab, a device's
 * panel): name, dose, risk, how it went, and "Give". Embodied mode: whether
 * it can be given from where the learner stands is the world's verdict
 * (`EmbodiedLink.verdict`: the kit at the bedside, the IV access first, a
 * busy device…) — the click goes through the learner's act (a short step,
 * or the refusal with the way there / the act to do first); clinical mode:
 * the facility's bedside capabilities (FACILITIES.md).
 */
import type { Intervention } from "@clinicalcraft/core";
import type { App, Game } from "../../app/context.js";
import { missingCaps } from "../../app/stations.js";
import { ct, getLocale, tr } from "../../i18n/index.js";
import { h } from "../dom.js";
import { capList, riskBadge } from "./common.js";
import { offered, onlyDistance } from "./verdicts.js";

export function treatRow(app: App, game: Game, iv: Intervention, caps: Set<string>, scopeLocked: boolean): HTMLElement {
  const store = game.session.store;
  const outcome = store.interventions.get(iv.id);
  // embodied: the world's verdict from where the learner stands (the kit at the bedside, the IV access first, a
  // busy device…) — the click goes through act (a short step, or the refusal with the way); clinical mode: the
  // facility's bedside capabilities
  const v = game.embodied?.verdict({ type: "intervene", interventionId: iv.id }) ?? null;
  const missing = v ? [] : missingCaps(iv.requires, caps);
  const maxed = iv.maxDoses !== undefined && (outcome?.count ?? 0) >= iv.maxDoses;
  let needs = "";
  if (v?.kind === "refused" && !onlyDistance(v)) needs = v.message;
  else if (missing.length) {
    const where = game.stations.nearestProvider(missing, app.playerPos(), getLocale());
    needs = where ? tr("treat.needsGo", { caps: capList(missing), place: where.label }) : tr("treat.needs", { caps: capList(missing) });
  }
  return h(
    "div",
    { class: ["treat-row", outcome ? `given-${outcome.appropriateness}` : ""] },
    h(
      "div",
      { class: "treat-info" },
      h("b", null, ct(iv.name)),
      iv.dose ? h("small", null, ct(iv.dose)) : null,
      h(
        "div",
        { class: "badges" },
        riskBadge(iv.risk),
        outcome ? h("span", { class: `outcome ${outcome.appropriateness}` }, tr(`treat.outcome.${outcome.appropriateness}`)) : null,
        outcome ? h("span", { class: "muted small" }, tr("treat.given", { n: outcome.count })) : null,
      ),
      needs ? h("small", { class: "needs" }, needs) : null,
    ),
    h(
      "button",
      {
        type: "button",
        class: iv.risk === "high" ? "danger" : "",
        disabled: (v ? !offered(v) : missing.length > 0) || maxed || scopeLocked,
        dataset: { intervention: iv.id },
        onclick: () => app.act({ type: "intervene", interventionId: iv.id }),
      },
      maxed ? tr("treat.max") : tr("treat.give"),
    ),
  );
}
