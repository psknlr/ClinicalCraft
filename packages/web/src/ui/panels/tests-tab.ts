/**
 * The patient's Tests tab (embodied mode): tests are ordered at the patient's
 * side — the sample is taken there and goes to the lab by pneumatic tube; a
 * bedside test needs its device at the bed (EMBODIED §6). Each test as the
 * world judges it from where the learner stands (ordering it, or reading it
 * once ordered): at the bedside — here, a step away, or once at the
 * patient's side (one notice with the way) — or elsewhere, with the world's
 * words and the way there. Then the evidence gathered, read here too.
 */
import type { App, Game } from "../../app/context.js";
import { ct, tr } from "../../i18n/index.js";
import { h } from "../dom.js";
import { evidenceGrid } from "./common.js";
import { refusedCandidate, testButton, testVerdict } from "./orders.js";
import { distanceNotice, onlyDistance } from "./verdicts.js";

export function bedsideTests(app: App, game: Game): HTMLElement {
  const wrap = h("div", { class: "tests-tab", id: "bedside-tests" });
  wrap.append(h("p", { class: "small muted" }, tr("tests.lead")));
  const list = game.caseDef.investigations;
  if (!list.length) {
    wrap.append(h("div", { class: "empty" }, tr("tests.none")));
    return wrap;
  }
  const rows = list.map((inv) => ({ inv, v: testVerdict(game, inv) }));
  const away = distanceNotice(game, rows.flatMap((r) => (r.v ? [r.v] : [])));
  if (away) wrap.append(away);
  const back = { panel: "conversation" as const, tab: "tests" as const };
  const here = rows.filter((r) => !r.v || r.v.kind !== "refused" || onlyDistance(r.v));
  const elsewhere = rows.filter((r) => r.v && r.v.kind === "refused" && !onlyDistance(r.v));
  if (here.length) wrap.append(h("h4", { class: "group-title" }, tr("tests.here")), h("div", { class: "candidates", id: "tests-here" }, here.map((r) => testButton(app, game, r.inv, null, ct(r.inv.name), back))));
  if (elsewhere.length)
    wrap.append(
      h(
        "details",
        { class: "topic tests-elsewhere", id: "tests-elsewhere" },
        h("summary", null, tr("tests.elsewhere", { n: elsewhere.length })),
        h("p", { class: "small muted" }, tr("tests.elsewhereHint")),
        h("div", { class: "candidates" }, elsewhere.map((r) => refusedCandidate(game, r.inv, r.v!))),
      ),
    );
  wrap.append(evidenceGrid(game, () => true, (o) => app.open("report", { investigationId: o.investigationId, phase: o.phase, back })));
  return wrap;
}
