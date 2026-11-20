/**
 * One treatment of the case as a row (the patient's Treat tab, a device's
 * panel): name, dose, risk, how it went, and "Give". Embodied mode: whether
 * it can be given from where the learner stands is the world's verdict
 * (`EmbodiedLink.verdict`: the kit at the bedside, the IV access first, a
 * busy device…) — the click goes through the learner's act (a short step,
 * or the refusal with the way there / the act to do first); clinical mode:
 * the facility's bedside capabilities (FACILITIES.md).
 *
 * `ordered`: the learner's words when the row was found by an order that
 * states a dose ("adrenaline 5 mg") — the words that order this row's item
 * (its own clause when they order several: "salbutamol 2.5 mg + ipratropium
 * 250 micrograms"). The row shows the dose read from them and "Give" sends
 * them as the action's `ordered`: the engine checks that dose against the
 * preset — one that differs is read back by the nurse and not given
 * (docs/PROTOCOL.md §3.2). Without it the row gives the preset it shows.
 */
import { doseText, itemOrder } from "@clinicalcraft/agent";
import { readOrder, type CaseDefinition, type Intervention, type WrittenOrder } from "@clinicalcraft/core";
import type { App, Game } from "../../app/context.js";
import { missingCaps } from "../../app/stations.js";
import { ct, getLocale, tr } from "../../i18n/index.js";
import { h } from "../dom.js";
import { capList, riskBadge } from "./common.js";
import { offered, onlyDistance } from "./verdicts.js";

/**
 * The order a treatment search states for one item it found (agent `itemOrder`: the words, or the clause that names the
 * item when they order several) and the dose read from them, when they state an amount ("adrenaline 5 mg",
 * "肾上腺素0.5毫克肌注", "肌注肾上腺素五毫克", a range "morphine 2–3 mg") or a dose that cannot be read ("0。5mg", "1/2 mg",
 * "adrenaline 0.5" — the engine asks about it, never gives the preset instead) — the row gives it; else none (a search
 * by name, or by route alone, chooses from the list and gives the preset shown).
 */
export function searchOrder(c: CaseDefinition, text: string, interventionId: string, locale: string): WrittenOrder | undefined {
  const written = itemOrder(c, { query: text }, interventionId, locale);
  return written && (written.dose?.amount != null || readOrder(written.text).unclear != null) ? written : undefined;
}

/** One treatment as a row with its "Give" (see the module docs); `ordered`: the search's order as written, when it states a dose. */
export function treatRow(app: App, game: Game, iv: Intervention, caps: Set<string>, scopeLocked: boolean, ordered?: WrittenOrder): HTMLElement {
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
      // the dose read from the search's order — or that it is not clear (asked about only where a preset checks it)
      ordered?.dose?.amount != null
        ? h("small", { class: "as-ordered" }, tr(iv.doseSpec ? "treat.asOrdered" : "treat.asOrderedUnchecked", { dose: doseText(ordered.dose, getLocale()) }))
        : ordered && iv.doseSpec
          ? h("small", { class: "as-ordered" }, tr("treat.asOrderedUnclear", { words: readOrder(ordered.text).unclear?.words ?? ordered.text }))
          : null,
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
        onclick: () => app.act({ type: "intervene", interventionId: iv.id, ...(ordered ? { ordered } : {}) }),
      },
      maxed ? tr("treat.max") : tr("treat.give"),
    ),
  );
}
