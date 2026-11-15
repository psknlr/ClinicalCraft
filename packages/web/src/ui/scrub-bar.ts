/**
 * The scrub nurse's bar (docs/TEAM.md §1, the scrub nurse's place): stacked on the scope dock, non-modal — it never
 * pauses the encounter's time as a window does (app/clocks.ts) — while the learner holds the scrub nurse's place and
 * the team works in this phase, out of the way of every window (hidden while one is open: what it offers is in the team
 * and surgery windows too) and folded away with its own Hide. It says what the stand-in surgeon asks for (its open pass
 * request to the learner — the request itself, whichever line of its thread came last: read back and confirmed, the
 * pass is still asked for until the field shows it), what was passed and waits to go in, and whether the count is due;
 * its buttons are offers the session or the world decides, while the learner plays the place (observing, the team does):
 * the pass of the instrument asked for, when the field takes it now (`tableOffer`: core's gates and the engine's own
 * verdict), the count (`team count` — never typed), what the learner carries handed to whoever operates (a world
 * `hand_over` to the surgeon member's body: the needle holder to the stand-in) and "In my hands" (the inventory), and
 * the instrument table — the operative field's (the surgery window: the case's instruments, passing, the passes
 * waiting); the world's instrument sets are device panels of their own, opened at the set. Worked out in
 * `scrubBarView`.
 */
import type { TeamCheckpoint } from "@clinicalcraft/agent";
import { memberBody, observeField, procedureFor, t, type InstrumentId, type ProcedureOp } from "@clinicalcraft/core";
import { atOperatingTable, PRIMARY_ACTOR, type WorldRuntime } from "@clinicalcraft/world";
import type { App } from "../app/context.js";
import { getLocale, tr } from "../i18n/index.js";
import { h, mount } from "./dom.js";
import { label, labelList, tableOffer, type FieldSeat } from "./panels/surgery-controls.js";
import { countRow, openRequest, type TeamOp } from "./panels/team-view.js";

/** What the bar shows and offers (see the module docs). */
export interface ScrubBarView {
  /** The instrument the stand-in asks the learner for, and its pass when the field takes it now and the learner plays the place. */
  asked: { instrument: InstrumentId; pass: ProcedureOp | null } | null;
  /** Passed, waiting to go in. */
  waiting: InstrumentId[];
  /** What the learner carries (not worn) that may be handed to whoever operates — the surgeon member's body —, while they play the place. */
  handTo: { to: string; items: string[] } | null;
  /** The count, the learner's to say (in learner mode). */
  count: { op: TeamOp; due: boolean } | null;
  /** The learner plays their place (learner mode); observing, the team does and the bar only shows. */
  plays: boolean;
}

/**
 * The bar's view (null: not shown — the learner does not hold the scrub nurse's place, the team does not work in this
 * phase, or the encounter is over): the stand-in's open pass request said to the learner's member (its request on the
 * plan task, not the latest line of its thread: after the read-back and the stand-in's confirmation it still waits for
 * the pass) and its pass to the operator when the field takes it now; what was passed and waits; what the learner
 * carries (`carried`: the world's — not worn) to hand to whoever operates; the count when it is the learner's to say.
 * Observing, the team plays the place: nothing is offered.
 */
export function scrubBarView(f: FieldSeat, cp: TeamCheckpoint | null, carried: readonly string[] = []): ScrubBarView | null {
  const { c, s } = f;
  if (s.seat !== "scrub-nurse" || !c.team || !c.team.phases.includes(s.phase) || s.finished || !cp) return null;
  const plays = cp.surgeon === "learner";
  const def = procedureFor(c, s);
  const v = def && s.procedure ? observeField(def, s.procedure) : null;
  const field = openRequest(cp)?.field;
  let asked: ScrubBarView["asked"] = null;
  if (field?.op === "pass" && field.instrument) {
    const takers = plays && def && v ? (tableOffer(f, def, v).pass?.to[field.instrument] ?? []) : [];
    asked = { instrument: field.instrument, pass: takers.includes(undefined) ? { op: "pass", instrument: field.instrument } : null };
  }
  const surgeon = memberBody(c, s, "surgeon");
  const handTo = plays && carried.length && surgeon !== PRIMARY_ACTOR ? { to: surgeon, items: [...carried] } : null;
  return { asked, waiting: (v?.passed ?? []).map((p) => p.instrument), handTo, count: plays ? countRow(cp) : null, plays };
}

/** What the learner's body carries in its hands now — never what is worn (equipped): the world's own record. */
export function carriedItems(world: Pick<WorldRuntime, "actor" | "snapshot">): string[] {
  const me = world.actor(PRIMARY_ACTOR);
  if (!me) return [];
  const entities = world.snapshot().entities;
  return me.holding.filter((id) => !entities[id]?.data?.equipped);
}

/** The gap between the scope dock and the bar stacked on it (px), and the bar's distance from the bottom without the dock. */
const STACK_GAP = 10;
const BOTTOM = 16;

export class ScrubBar {
  readonly el: HTMLElement;
  private readonly head: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly body: HTMLElement;
  private collapsed = false;

  constructor(private readonly app: App) {
    this.toggle = h("button", { type: "button", class: "scrub-toggle", id: "scrub-toggle", "aria-expanded": "true", onclick: () => this.setCollapsed(!this.collapsed) });
    this.head = h("div", { class: "scrub-head" });
    this.body = h("div", { class: "scrub-body", id: "scrub-body" });
    this.el = h("aside", { class: "scrub-bar", id: "scrub-bar", hidden: true }, this.head, this.body);
    // stacked on the scope dock, whatever its height (shown, folded away, hidden)
    const dock = typeof document !== "undefined" ? document.getElementById("scope-dock") : null;
    if (dock && typeof ResizeObserver !== "undefined") new ResizeObserver(() => this.place()).observe(dock);
  }

  private setCollapsed(on: boolean): void {
    this.collapsed = on;
    delete this.el.dataset.key;
    this.update();
  }

  /** Stand on the scope dock when it shows (the dock and the bar beside the theatre, one column), else at the bottom. */
  private place(): void {
    if (this.el.hidden) return;
    const dock = document.getElementById("scope-dock");
    const height = dock && !dock.hidden ? dock.getBoundingClientRect().height : 0;
    this.el.style.bottom = `${BOTTOM + (height ? height + STACK_GAP : 0)}px`;
  }

  /** Re-read what the bar shows (with the HUD's refresh). */
  update(): void {
    const game = this.app.game;
    const world = game?.session.world() ?? null;
    const state = game ? (game.session.store.snapshot?.state ?? game.session.session.state) : null;
    // never over a window or the approval dialog (`isPlaying`: in the world, nothing open): what it offers is in the
    // team and surgery windows too
    const view =
      game && world && state && this.app.isPlaying()
        ? scrubBarView({ c: game.caseDef, s: state, facility: game.facility, atTable: (body) => atOperatingTable(world, body) }, game.session.session.team(), carriedItems(world))
        : null;
    this.el.hidden = !view;
    if (!view || !game || !world) return;
    this.place();
    const key = JSON.stringify([view, this.collapsed, getLocale()]);
    if (this.el.dataset.key === key) return;
    this.el.dataset.key = key;
    this.el.setAttribute("aria-label", tr("scrub.title"));
    this.el.dataset.collapsed = String(this.collapsed);
    this.toggle.textContent = this.collapsed ? tr("scrub.title") : tr("scrub.hide");
    this.toggle.setAttribute("aria-expanded", String(!this.collapsed));
    mount(this.head, this.collapsed ? null : h("b", null, tr("scrub.title")), view.asked && this.collapsed ? h("span", { class: "scrub-chip" }, label("instrument", view.asked.instrument)) : null, this.toggle);
    this.body.hidden = this.collapsed;
    if (this.collapsed) return;
    const act = (op: ProcedureOp) => this.app.act({ type: "operate", op });
    const say = (op: TeamOp) => void game.session.session.run(op);
    const L = getLocale();
    const itemName = (id: string) => {
      const e = world.entity(id);
      return e?.equipmentType ? t(e.equipmentType.name, L) : e ? t(e.name, L) : id;
    };
    mount(
      this.body,
      h(
        "div",
        { class: "scrub-row", id: "scrub-asked", dataset: { instrument: view.asked?.instrument ?? "" } },
        view.asked ? h("span", null, tr("scrub.asked", { instrument: label("instrument", view.asked.instrument) })) : h("span", { class: "muted" }, tr("scrub.none")),
        view.asked?.pass ? h("button", { type: "button", class: "primary", id: "scrub-pass", onclick: () => act(view.asked!.pass!) }, tr("scrub.pass", { instrument: label("instrument", view.asked.instrument) })) : null,
      ),
      view.waiting.length ? h("div", { class: "scrub-row", id: "scrub-waiting" }, tr("scrub.waiting", { list: labelList("instrument", view.waiting) })) : null,
      view.handTo
        ? h(
            "div",
            { class: "scrub-row", id: "scrub-hand" },
            view.handTo.items.map((item) =>
              h("button", { type: "button", class: "scrub-hand-to", dataset: { item, to: view.handTo!.to }, title: tr("scrub.handToTitle"), onclick: () => void game.embodied?.worldAction({ operation: "hand_over", targetId: item, parameters: { to: view.handTo!.to } }) }, tr("scrub.handTo", { item: itemName(item) })),
            ),
          )
        : null,
      h(
        "div",
        { class: "scrub-row" },
        view.count ? h("button", { type: "button", id: "scrub-count", class: view.count.due ? "primary" : "", title: tr("team.countSayTitle"), onclick: () => say(view.count!.op) }, view.count.due ? `${tr("team.countSay")} · ${tr("team.countDue")}` : tr("team.countSay")) : null,
        view.plays ? h("button", { type: "button", id: "scrub-hands", title: tr("scrub.handsTitle"), onclick: () => this.app.open("inventory") }, tr("scrub.hands")) : null,
        h("button", { type: "button", id: "scrub-table", title: tr("scrub.openTitle"), onclick: () => this.app.open("surgery") }, tr("scrub.open")),
      ),
    );
  }
}
