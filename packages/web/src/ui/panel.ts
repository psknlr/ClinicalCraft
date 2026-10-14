/**
 * The V4 window: one modal panel host (cream window, header kicker + title,
 * close ×, footer). Esc closes, Tab is trapped inside, the backdrop click
 * closes, focus returns to the world on close. Panels are re-built from
 * their builder on language change and receive `update()` on store changes.
 */
import { tr } from "../i18n/index.js";
import { $, clear, focusables, h, type Child } from "./dom.js";

export type PanelId =
  | "conversation"
  | "orders"
  | "device"
  | "report"
  | "image"
  | "journal"
  | "source"
  | "board"
  | "compare"
  | "debrief"
  | "monitor"
  | "pause"
  | "map"
  | "inventory"
  | "craft"
  | "help"
  | "atlas"
  | "autopilot"
  | "confirm";

export interface PanelView {
  id: PanelId;
  kicker: string;
  title: string;
  body: Child;
  /** Window modifiers: "wide", "narrow", "atlas", "tall". */
  variant?: string;
  /** Called (rAF-throttled) whenever the session store changes. */
  update?: () => void;
  dispose?: () => void;
  /** Element focused when the panel opens (default: the close button). */
  focus?: HTMLElement | null;
  foot?: string;
}

export type PanelBuilder = () => PanelView;

export class PanelHost {
  private view: PanelView | null = null;
  private builder: PanelBuilder | null = null;
  private readonly root: HTMLElement;
  private readonly win: HTMLElement;
  private readonly kicker: HTMLElement;
  private readonly title: HTMLElement;
  private readonly body: HTMLElement;
  private readonly foot: HTMLElement;
  private readonly brand: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly listeners = new Set<(open: boolean) => void>();

  constructor(root: HTMLElement) {
    this.root = root;
    this.closeBtn = h("button", { class: "close", type: "button", "aria-label": tr("panel.close"), onclick: () => this.close() }, "×");
    this.kicker = h("div", { class: "eyebrow", id: "panel-kicker" });
    this.title = h("h2", { id: "panel-title" });
    this.body = h("div", { class: "window-body", id: "panel-body" });
    this.foot = h("span", { id: "panel-foot" });
    this.brand = h("span", null, tr("panel.brand"));
    this.win = h(
      "section",
      { class: "window", role: "dialog", "aria-modal": "true", "aria-labelledby": "panel-title" },
      h("header", { class: "window-head" }, h("div", null, this.kicker, this.title), this.closeBtn),
      this.body,
      h("footer", { class: "window-foot" }, this.foot, this.brand),
    );
    root.appendChild(this.win);
    root.hidden = true;
    root.addEventListener("mousedown", (e) => {
      if (e.target === root) this.close();
    });
    root.addEventListener("keydown", (e) => this.trap(e));
  }

  get current(): PanelId | null {
    return this.view?.id ?? null;
  }

  get isOpen(): boolean {
    return !!this.view;
  }

  onToggle(fn: (open: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Open (or replace) the panel with a builder. */
  open(builder: PanelBuilder): void {
    const wasOpen = !!this.view;
    this.disposeView();
    this.builder = builder;
    let view: PanelView;
    try {
      view = builder();
    } catch (err) {
      console.error(err);
      view = { id: "confirm", kicker: "ERROR", title: tr("toast.error"), body: h("p", { class: "notice" }, String(err instanceof Error ? err.message : err)) };
    }
    this.view = view;
    this.kicker.textContent = view.kicker;
    this.title.textContent = view.title;
    this.foot.textContent = view.foot ?? tr("panel.foot");
    this.brand.textContent = tr("panel.brand");
    this.closeBtn.setAttribute("aria-label", tr("panel.close"));
    this.win.className = `window${view.variant ? ` ${view.variant
      .split(" ")
      .map((v) => `window-${v}`)
      .join(" ")}` : ""}`;
    this.win.dataset.panel = view.id;
    clear(this.body);
    const content = view.body;
    if (Array.isArray(content)) for (const c of content) this.appendChild(c);
    else this.appendChild(content);
    this.body.scrollTop = 0;
    this.root.hidden = false;
    const focus = view.focus ?? this.closeBtn;
    requestAnimationFrame(() => {
      try {
        focus.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    });
    if (!wasOpen) for (const fn of this.listeners) fn(true);
  }

  private appendChild(c: Child): void {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) {
      for (const x of c) this.appendChild(x);
      return;
    }
    this.body.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }

  /** Rebuild the current panel (language change, settings applied). */
  rebuild(): void {
    if (this.builder && this.view) {
      const scroll = this.body.scrollTop;
      this.open(this.builder);
      this.body.scrollTop = scroll;
    }
  }

  update(): void {
    try {
      this.view?.update?.();
    } catch (err) {
      console.error(err);
    }
  }

  close(): void {
    if (!this.view) return;
    this.disposeView();
    this.view = null;
    this.builder = null;
    this.root.hidden = true;
    clear(this.body);
    for (const fn of this.listeners) fn(false);
  }

  private disposeView(): void {
    try {
      this.view?.dispose?.();
    } catch (err) {
      console.error(err);
    }
  }

  private trap(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const list = focusables(this.win);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /** The body element (for panels that query their own content). */
  get bodyEl(): HTMLElement {
    return this.body;
  }
}

export function panelRoot(): HTMLElement {
  return $("#panel");
}
