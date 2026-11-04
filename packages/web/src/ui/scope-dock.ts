/**
 * The scope dock: the laparoscopic picture beside the theatre, whatever else is open (the engineering
 * recommendations' "two views throughout"). The world canvas is the theatre — people, equipment, hand-overs —;
 * the dock is what the operator sees, from the moment a port plan is chosen until the operation ends. It draws the
 * frame of the one operative playback (`App.playback`, `operative-playback.ts`) — the same frame the surgery window
 * shows, so the two never disagree and switching between them goes on from the same step: every accepted step on its
 * own, a refused one with its reason and the field unchanged. The scope out of the patient says so; a conversion to
 * open ends the feed (the theatre view goes on). While the surgery window is open it shows the same picture full
 * size, so the dock steps aside. Only the operator's `FieldView` is drawn — never a structure's name, an injury the
 * field does not show, or a score.
 */
import { observeField, procedureFor, t } from "@clinicalcraft/core";
import type { App } from "../app/context.js";
import type { LaparoscopeApi } from "../contracts.js";
import { createLaparoscope } from "../laparoscopy/index.js";
import { getLocale, tr } from "../i18n/index.js";
import { h, mount, prefersReducedMotion } from "./dom.js";
import type { PlaybackItem } from "./operative-playback.js";
import { openFieldText } from "./open-field.js";
import { identifyChoices, label, labelList } from "./panels/surgery-controls.js";
import { lapScene } from "./panels/surgery-scene.js";

/** The caption of a frame: the step (with who did it and what it signalled) or the refusal and its reason. */
export function frameCaption(item: PlaybackItem | null, staffName: (id: string) => string): { text: string; status: "step" | "rejected"; op: string; id: string } | null {
  if (!item) return null;
  if (item.kind === "rejected") return { text: tr("scope.rejected", { message: item.rejectionReason ?? "" }), status: "rejected", op: item.operation, id: item.id };
  const who = item.actor ? tr("scope.by", { who: staffName(item.actor) }) : "";
  const signals = item.signals.length ? ` · ${labelList("signal", item.signals)}` : "";
  return { text: `${tr("scope.step", { n: item.revision, op: label("op", item.operation) })}${who}${signals}`, status: "step", op: item.operation, id: item.id };
}

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
  private collapsed = false;
  private visible = false;

  constructor(private readonly app: App) {
    this.canvas = h("canvas", { class: "scope-canvas", id: "scope-canvas", "aria-label": tr("surgery.screen") });
    this.labels = h("div", { class: "lap-labels" });
    this.dark = h("div", { class: "scope-dark", role: "status" });
    this.caption = h("div", { class: "scope-caption", id: "scope-caption", role: "status", "aria-live": "polite" });
    this.chip = h("span", { class: "scope-chip", id: "scope-chip" });
    this.toggle = h("button", { type: "button", class: "scope-toggle", id: "scope-toggle", "aria-expanded": "true", onclick: () => this.setCollapsed(!this.collapsed) }, tr("scope.hide"));
    this.body = h("div", { class: "scope-body" }, h("div", { class: "scope-stage" }, this.canvas, this.labels, this.dark), this.caption, h("button", { type: "button", class: "scope-open", id: "scope-open", onclick: () => this.app.open("surgery") }, tr("scope.open")));
    this.el = h("aside", { class: "scope-dock", id: "scope-dock", hidden: true, "aria-label": tr("scope.title") }, h("div", { class: "scope-head" }, h("b", null, tr("scope.title")), this.chip, this.toggle), this.body);
    // every frame of the one playback is drawn as it comes (the dock never computes the latest state itself)
    app.playback.subscribe(() => {
      if (this.visible) this.draw();
    });
  }

  private setCollapsed(on: boolean): void {
    this.collapsed = on;
    this.body.hidden = on;
    this.toggle.textContent = on ? tr("scope.show") : tr("scope.hide");
    this.toggle.setAttribute("aria-expanded", String(!on));
  }

  /** Re-read whether the dock is shown (called with the HUD's refresh; the frames come from the playback). */
  update(): void {
    const game = this.app.game;
    const state = game ? (game.session.store.snapshot?.state ?? game.session.session.state) : null;
    const def = game && state ? procedureFor(game.caseDef, state) : undefined;
    // shown once the operation has begun (a port plan chosen), while the surgery window is not open
    this.visible = !!game?.entered && !!def && !!state?.procedure?.plan && this.app.panels.current !== "surgery";
    this.el.hidden = !this.visible;
    if (!this.visible) return;
    if (!this.lap) this.start();
    this.draw();
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

  /** Draw the playback's frame. */
  private draw(): void {
    const game = this.app.game;
    const state = game ? (game.session.store.snapshot?.state ?? game.session.session.state) : null;
    const def = game && state ? procedureFor(game.caseDef, state) : undefined;
    const { state: p, item } = this.app.playback.frame();
    if (!def || !p) return;
    const v = observeField(def, p);
    this.lap?.update(lapScene(def, p, v));
    const converted = v.bailouts.includes("convert-open");
    this.chip.textContent = converted ? tr("scope.converted").split(/[:：]/u)[0]! : v.inView ? tr("scope.live") : tr("scope.outside");
    this.chip.dataset.state = converted ? "converted" : v.inView ? "live" : "outside";
    this.dark.hidden = v.inView;
    // converted: the open field in words instead of a scope picture (the same lines as the surgery window)
    if (converted) mount(this.dark, h("div", { class: "open-field", dataset: { view: "open" } }, h("strong", null, tr("scope.converted")), ...openFieldText(observeField(def, p, "open"), getLocale(), tr, label, (id) => identifyChoices(def, getLocale(), "").find((x) => x.id === id)?.name ?? id).slice(1).map((line) => h("div", { class: "open-line" }, line))));
    else this.dark.textContent = tr("scope.outside");
    this.el.dataset.step = String(p.counters.steps);
    this.el.dataset.frame = item?.id ?? "";
    const lines = [];
    const cap = frameCaption(item, (id) => this.staffName(id));
    if (cap) lines.push(h("div", { class: ["lap-line", cap.status === "rejected" ? "bad" : ""], dataset: { status: cap.status, op: cap.op, id: cap.id } }, cap.text));
    // the window over a region being dissected that the traction no longer holds open, in words
    if (v.inView && v.specimen === "in-situ")
      for (const r of v.regions) if (r.dissection !== "untouched" && r.exposure !== "good") lines.push(h("div", { class: "lap-line warn", dataset: { window: r.id, exposure: r.exposure } }, tr("scope.window", { region: t(r.name, getLocale()), exposure: label("exposure", r.exposure), dissection: label("dissection", r.dissection) })));
    const pending = this.app.playback.pending();
    if (pending) lines.push(h("div", { class: "lap-line muted" }, tr("scope.queue", { n: pending })));
    mount(this.caption, lines);
  }

  private staffName(id: string): string {
    const staff = this.app.game?.facility.staff.find((s) => s.id === id);
    return staff ? t(staff.name, getLocale()) : id;
  }

  /** Release the view (a new game builds a fresh one). */
  dispose(): void {
    this.lap?.dispose();
    this.lap = null;
    this.el.hidden = true;
  }
}
