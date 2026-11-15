/**
 * The scrub nurse's bar (docs/TEAM.md §1, the scrub nurse's place): beside the scope dock, non-modal — it never pauses
 * the encounter's time as a window does (app/clocks.ts) — while the learner holds the scrub nurse's place and the team
 * works in this phase. It says what the stand-in surgeon asks for (its pass request to the learner), what was passed and
 * waits to go in, and whether the count is due; its buttons are offers the session or the world decides: the pass of
 * the instrument asked for, when the field takes it now (`tableOffer`: core's gates and the engine's own verdict), the
 * count (`team count` — never typed), and the instrument table (the surgery window). Worked out in `scrubBarView`.
 */
import type { TeamCheckpoint } from "@clinicalcraft/agent";
import { observeField, procedureFor, type InstrumentId, type ProcedureOp } from "@clinicalcraft/core";
import { atOperatingTable } from "@clinicalcraft/world";
import type { App } from "../app/context.js";
import { tr } from "../i18n/index.js";
import { h, mount } from "./dom.js";
import { label, labelList, tableOffer, type FieldSeat } from "./panels/surgery-controls.js";
import { awaitedOf, countRow, type TeamOp } from "./panels/team-view.js";

/** What the bar shows: the instrument asked for (and its pass, when the field takes it now), the passes waiting, the count. */
export interface ScrubBarView {
  asked: { instrument: InstrumentId; pass: ProcedureOp | null } | null;
  waiting: InstrumentId[];
  count: { op: TeamOp; due: boolean } | null;
}

/**
 * The bar's view (null: not shown — the learner does not hold the scrub nurse's place, the team does not work in this
 * phase, or the encounter is over): the stand-in's open pass request said to the learner and its pass to the operator
 * when the field takes it now; what was passed and waits; the count when it is the learner's to say.
 */
export function scrubBarView(f: FieldSeat, cp: TeamCheckpoint | null): ScrubBarView | null {
  const { c, s } = f;
  if (s.seat !== "scrub-nurse" || !c.team || !c.team.phases.includes(s.phase) || s.finished || !cp) return null;
  const def = procedureFor(c, s);
  const v = def && s.procedure ? observeField(def, s.procedure) : null;
  const w = awaitedOf(cp);
  const field = w?.kind === "line" && w.message.kind === "request" ? w.message.about.field : undefined;
  let asked: ScrubBarView["asked"] = null;
  if (field?.op === "pass" && field.instrument) {
    const takers = def && v ? (tableOffer(f, def, v).pass?.to[field.instrument] ?? []) : [];
    asked = { instrument: field.instrument, pass: takers.includes(undefined) ? { op: "pass", instrument: field.instrument } : null };
  }
  return { asked, waiting: (v?.passed ?? []).map((p) => p.instrument), count: countRow(cp) };
}

export class ScrubBar {
  readonly el: HTMLElement;

  constructor(private readonly app: App) {
    this.el = h("aside", { class: "scrub-bar", id: "scrub-bar", hidden: true, "aria-label": tr("scrub.title") });
  }

  /** Re-read what the bar shows (with the HUD's refresh). */
  update(): void {
    const game = this.app.game;
    const world = game?.session.world() ?? null;
    const view =
      game?.entered && world
        ? scrubBarView({ c: game.caseDef, s: game.session.store.snapshot?.state ?? game.session.session.state, facility: game.facility, atTable: (body) => atOperatingTable(world, body) }, game.session.session.team())
        : null;
    this.el.hidden = !view;
    if (!view) return;
    const key = JSON.stringify(view);
    if (this.el.dataset.key === key) return;
    this.el.dataset.key = key;
    const act = (op: ProcedureOp) => this.app.act({ type: "operate", op });
    const say = (op: TeamOp) => void game?.session.session.run(op);
    mount(
      this.el,
      h("b", null, tr("scrub.title")),
      h(
        "div",
        { class: "scrub-row", id: "scrub-asked", dataset: { instrument: view.asked?.instrument ?? "" } },
        view.asked ? h("span", null, tr("scrub.asked", { instrument: label("instrument", view.asked.instrument) })) : h("span", { class: "muted" }, tr("scrub.none")),
        view.asked?.pass ? h("button", { type: "button", class: "primary", id: "scrub-pass", onclick: () => act(view.asked!.pass!) }, tr("scrub.pass", { instrument: label("instrument", view.asked.instrument) })) : null,
      ),
      view.waiting.length ? h("div", { class: "scrub-row", id: "scrub-waiting" }, tr("scrub.waiting", { list: labelList("instrument", view.waiting) })) : null,
      h(
        "div",
        { class: "scrub-row" },
        view.count ? h("button", { type: "button", id: "scrub-count", class: view.count.due ? "primary" : "", title: tr("team.countSayTitle"), onclick: () => say(view.count!.op) }, view.count.due ? `${tr("team.countSay")} · ${tr("team.countDue")}` : tr("team.countSay")) : null,
        h("button", { type: "button", id: "scrub-table", title: tr("scrub.openTitle"), onclick: () => this.app.open("surgery") }, tr("scrub.open")),
      ),
    );
  }
}
