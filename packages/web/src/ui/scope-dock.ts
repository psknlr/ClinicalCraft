/**
 * The scope dock: the laparoscopic picture beside the theatre, whatever else is open (the engineering
 * recommendations' "two views throughout"). The world canvas is the theatre — people, equipment, hand-overs —;
 * the dock is what the operator sees, from the moment a port plan is chosen until the operation ends. It follows the
 * session's record, whoever acted (the learner's controls, a demonstration, a colleague at the table, an external
 * agent): every accepted step is shown on its own, in order (`ScopePresenter`), a refused one with its reason and
 * the field unchanged. The scope out of the patient says so; a conversion to open ends the feed (the theatre view
 * goes on). The surgery window, when open, shows the same picture full size, so the dock steps aside meanwhile.
 * It draws the operator's `FieldView` only — never a structure's name, an injury the field does not show, or a score.
 */
import { createProcedureState, observeField, procedureFor, t, type ProcedureDefinition } from "@clinicalcraft/core";
import type { App } from "../app/context.js";
import type { LaparoscopeApi } from "../contracts.js";
import { createLaparoscope } from "../laparoscopy/index.js";
import { getLocale, tr } from "../i18n/index.js";
import { h, mount, prefersReducedMotion } from "./dom.js";
import { label, labelList } from "./panels/surgery-controls.js";
import { lapScene } from "./panels/surgery-scene.js";
import { ScopePresenter, type StepEvent } from "./scope-presenter.js";

/** How long each step stays on screen before the next one (ms); a step with something to notice stays longer. */
export const STEP_MS = 650;
export const SIGNAL_MS = 1800;

export class ScopeDock {
  readonly el: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly labels: HTMLElement;
  private readonly dark: HTMLElement;
  private readonly caption: HTMLElement;
  private readonly chip: HTMLElement;
  private readonly body: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private lap: LaparoscopeApi | null = null;
  private presenter: ScopePresenter | null = null;
  private def: ProcedureDefinition | null = null;
  /** The case and session the dock was built for (a new game builds it afresh). */
  private key = "";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private collapsed = false;
  /** The last refused operative step seen (shown until the next accepted one). */
  private rejected: { count: number; message: string } | null = null;
  private rejectedSeen = 0;

  constructor(private readonly app: App) {
    this.canvas = h("canvas", { class: "scope-canvas", id: "scope-canvas", "aria-label": tr("surgery.screen") });
    this.labels = h("div", { class: "lap-labels" });
    this.dark = h("div", { class: "scope-dark", role: "status" });
    this.caption = h("div", { class: "scope-caption", id: "scope-caption", role: "status", "aria-live": "polite" });
    this.chip = h("span", { class: "scope-chip", id: "scope-chip" });
    this.toggle = h("button", { type: "button", class: "scope-toggle", id: "scope-toggle", "aria-expanded": "true", onclick: () => this.setCollapsed(!this.collapsed) }, tr("scope.hide"));
    this.body = h("div", { class: "scope-body" }, h("div", { class: "scope-stage" }, this.canvas, this.labels, this.dark), this.caption, h("button", { type: "button", class: "scope-open", id: "scope-open", onclick: () => this.app.open("surgery") }, tr("scope.open")));
    this.el = h("aside", { class: "scope-dock", id: "scope-dock", hidden: true, "aria-label": tr("scope.title") }, h("div", { class: "scope-head" }, h("b", null, tr("scope.title")), this.chip, this.toggle), this.body);
  }

  private setCollapsed(on: boolean): void {
    this.collapsed = on;
    this.body.hidden = on;
    this.toggle.textContent = on ? tr("scope.show") : tr("scope.hide");
    this.toggle.setAttribute("aria-expanded", String(!on));
  }

  /** Re-read the session (called with the HUD's refresh). */
  update(): void {
    const game = this.app.game;
    const state = game ? (game.session.store.snapshot?.state ?? game.session.session.state) : null;
    const def = game && state ? procedureFor(game.caseDef, state) : undefined;
    // shown once the operation has begun (a port plan chosen), while the surgery window is not open
    const begun = !!def && !!state?.procedure?.plan;
    const visible = !!game?.entered && begun && this.app.panels.current !== "surgery";
    if (!visible || !game || !def || !state) {
      this.el.hidden = true;
      this.stop();
      return;
    }
    const key = `${game.caseDef.id}:${game.session.session.id}`;
    if (key !== this.key || def !== this.def) {
      this.key = key;
      this.def = def;
      this.presenter = new ScopePresenter(def);
      this.rejectedSeen = game.session.store.domainEvents("action.rejected").filter((e) => e.action === "operate").length;
      this.rejected = null;
    }
    this.el.hidden = false;
    if (!this.lap) this.start();
    const store = game.session.store;
    this.presenter!.sync(store.domainEvents("procedure.step"), state.procedure ?? createProcedureState());
    const refusals = store.domainEvents("action.rejected").filter((e) => e.action === "operate");
    const refused = refusals.length > this.rejectedSeen;
    if (refused) this.rejected = { count: refusals.length, message: refusals.at(-1)!.message };
    this.rejectedSeen = refusals.length;
    if (this.presenter!.pending() > 0) this.run();
    // a frame keeps its time on screen; a refusal is shown at once (the field unchanged)
    else if (refused || (!this.timer && performance.now() >= this.until)) this.draw(null);
  }

  private start(): void {
    try {
      this.lap = createLaparoscope({
        canvas: this.canvas,
        labels: this.labels,
        modelUrl: null,
        reducedMotion: () => !this.app.prefs.ui.bob || prefersReducedMotion(),
        onPick: () => this.app.open("surgery"),
        labelTitle: (handle) => tr("surgery.tube.select", { handle }),
      });
    } catch (err) {
      console.error(err);
      this.lap = null;
    }
  }

  /**
   * Play the queue: one step at a time, each on screen for `STEP_MS` (`SIGNAL_MS` when it carries a signal) — also
   * when the next step arrives only after the frame was drawn (the frame keeps its time).
   */
  private run(): void {
    if (this.timer) return;
    const tick = () => {
      this.timer = null;
      const step = this.presenter?.next() ?? null;
      if (!step) return;
      this.rejected = null;
      this.draw(step.event);
      const dwell = step.event.signals.length ? SIGNAL_MS : STEP_MS;
      this.until = performance.now() + dwell;
      if (this.presenter?.pending()) this.timer = setTimeout(tick, dwell);
    };
    const wait = this.until - performance.now();
    if (wait > 0) this.timer = setTimeout(tick, wait);
    else tick();
  }

  /** Until when the frame on screen stays (ms, `performance.now()`). */
  private until = 0;

  private stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Draw the field the presenter shows, with what just happened. */
  private draw(step: StepEvent | null): void {
    const def = this.def;
    const p = this.presenter?.current();
    if (!def || !p) return;
    const v = observeField(def, p);
    this.lap?.update(lapScene(def, p, v));
    const converted = v.bailouts.includes("convert-open");
    this.chip.textContent = converted ? tr("scope.converted").split(/[:：]/u)[0]! : v.inView ? tr("scope.live") : tr("scope.outside");
    this.chip.dataset.state = converted ? "converted" : v.inView ? "live" : "outside";
    this.dark.hidden = v.inView;
    this.dark.textContent = converted ? tr("scope.converted") : tr("scope.outside");
    this.el.dataset.step = String(p.counters.steps);
    const lines = [];
    if (this.rejected) lines.push(h("div", { class: "lap-line bad", dataset: { status: "rejected" } }, tr("scope.rejected", { message: this.rejected.message })));
    const shown = step ?? this.lastShown(p.counters.steps);
    if (shown) {
      const who = shown.actor ? this.staffName(shown.actor) : "";
      lines.push(
        h(
          "div",
          { class: "lap-line", dataset: { status: "step", op: shown.op, id: shown.id ?? "" } },
          tr("scope.step", { n: shown.step ?? p.counters.steps, op: label("op", shown.op) }),
          who ? tr("scope.by", { who }) : "",
          shown.signals.length ? ` · ${labelList("signal", shown.signals)}` : "",
        ),
      );
    }
    // the window over a region being dissected that the traction no longer holds open, in words
    if (v.inView && v.specimen === "in-situ")
      for (const r of v.regions) if (r.dissection !== "untouched" && r.exposure !== "good") lines.push(h("div", { class: "lap-line warn", dataset: { window: r.id, exposure: r.exposure } }, tr("scope.window", { region: t(r.name, getLocale()), exposure: label("exposure", r.exposure), dissection: label("dissection", r.dissection) })));
    const pending = this.presenter?.pending() ?? 0;
    if (pending) lines.push(h("div", { class: "lap-line muted" }, tr("scope.queue", { n: pending })));
    mount(this.caption, lines);
  }

  /** The step event the field shows now (the one that took it to `steps`). */
  private lastShown(steps: number): StepEvent | null {
    const events = this.app.game?.session.store.domainEvents("procedure.step") ?? [];
    return (events.find((e) => e.step === steps) ?? events.at(-1) ?? null) as StepEvent | null;
  }

  private staffName(id: string): string {
    const staff = this.app.game?.facility.staff.find((s) => s.id === id);
    return staff ? t(staff.name, getLocale()) : id;
  }

  /** Release the view (a new game builds a fresh one). */
  dispose(): void {
    this.stop();
    this.lap?.dispose();
    this.lap = null;
    this.presenter = null;
    this.key = "";
    this.el.hidden = true;
  }
}

