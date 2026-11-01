/**
 * The V4 window: one modal panel host (cream window, header kicker + title,
 * close ×, footer). Esc closes, Tab is trapped inside, the backdrop click
 * closes, focus returns to the world on close. Panels are re-built from
 * their builder on language change and receive `update()` on store changes.
 *
 * Focus (a11y): the initial focus is applied synchronously (a slow frame must
 * not let the next keystrokes reach the world), it survives `update()`
 * re-renders (same element by id / data-* key, else the same position), focus
 * that escapes the window (Tab from <body> after a re-render, programmatic
 * focus) is pulled back, and closing returns focus to where it came from
 * unless the app moved it (the world canvas).
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
  | "surgery"
  | "autopilot"
  | "elevator"
  | "confirm";

export interface PanelView {
  id: PanelId;
  kicker: string;
  title: string;
  body: Child;
  /** Window modifiers: "wide", "narrow", "atlas", "surgery", "tall". */
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
  /** Action feedback inside the window (a refused action and "Go there"), kept across panel changes. */
  readonly feedbackSlot: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly listeners = new Set<(open: boolean) => void>();
  /** Focused element before the panel opened (restored on close unless the app moved focus). */
  private returnFocus: HTMLElement | null = null;
  private returnKey: string | null = null;
  /** True while a modal above the panel (the approval dialog) owns the focus. */
  modalAbove: () => boolean = () => false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.closeBtn = h("button", { class: "close", type: "button", "aria-label": tr("panel.close"), onclick: () => this.close() }, "×");
    this.kicker = h("div", { class: "eyebrow", id: "panel-kicker" });
    this.title = h("h2", { id: "panel-title" });
    this.body = h("div", { class: "window-body", id: "panel-body" });
    this.foot = h("span", { id: "panel-foot" });
    this.brand = h("span", null, tr("panel.brand"));
    this.feedbackSlot = h("div", { class: "window-feedback", id: "panel-feedback" });
    this.win = h(
      "section",
      { class: "window", role: "dialog", "aria-modal": "true", "aria-labelledby": "panel-title", tabindex: "-1" },
      h("header", { class: "window-head" }, h("div", null, this.kicker, this.title), this.closeBtn),
      this.body,
      this.feedbackSlot,
      h("footer", { class: "window-foot" }, this.foot, this.brand),
    );
    root.appendChild(this.win);
    root.hidden = true;
    root.addEventListener("mousedown", (e) => {
      if (e.target === root) this.close();
    });
    root.addEventListener("keydown", (e) => this.trap(e));
    // Focus that lands outside the open window (Tab from <body>, a stray programmatic focus) comes back.
    document.addEventListener(
      "focusin",
      (e) => {
        if (!this.view || this.modalAbove() || this.root.contains(e.target as Node)) return;
        this.focusFirst();
      },
      true,
    );
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
    if (!wasOpen) {
      const a = document.activeElement;
      this.returnFocus = a instanceof HTMLElement && a !== document.body && !this.root.contains(a) ? a : null;
      this.returnKey = this.returnFocus ? focusKey(this.returnFocus) : null;
    }
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
    if (!this.modalAbove()) this.focusInto(view.focus ?? this.closeBtn);
    if (!wasOpen) for (const fn of this.listeners) fn(true);
  }

  /** Focus an element now (it is visible: the root was just un-hidden); retry next frame if layout was not ready. */
  private focusInto(el: HTMLElement): void {
    const apply = () => {
      try {
        el.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    };
    apply();
    if (document.activeElement !== el)
      requestAnimationFrame(() => {
        if (this.view && el.isConnected && !this.modalAbove() && !this.win.contains(document.activeElement)) apply();
      });
  }

  /** Move focus to the first focusable element of the window (or the window itself). */
  focusFirst(): void {
    if (!this.view) return;
    const list = focusables(this.win);
    (list[0] ?? this.win).focus({ preventScroll: true });
  }

  /** Put focus back inside the window (after a dialog above it closed): `prefer` when still attached. */
  refocus(prefer: HTMLElement | null): void {
    if (!this.view) return;
    if (prefer?.isConnected && this.win.contains(prefer) && focusables(this.win).includes(prefer)) prefer.focus({ preventScroll: true });
    else if (!this.win.contains(document.activeElement)) this.focusFirst();
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
    if (!this.view?.update) return;
    // Panels re-render parts of their body on store changes: keep the keyboard focus where it was.
    const active = document.activeElement;
    const had = active instanceof HTMLElement && this.body.contains(active) ? active : null;
    const key = had ? focusKey(had) : null;
    const index = had ? focusables(this.win).indexOf(had) : -1;
    try {
      this.view.update();
    } catch (err) {
      console.error(err);
    }
    if (!had || had.isConnected || this.modalAbove()) return;
    if (document.activeElement && document.activeElement !== document.body && this.win.contains(document.activeElement)) return;
    const list = focusables(this.win);
    const same = key ? (this.body.querySelector<HTMLElement>(key) ?? null) : null;
    const target = same && list.includes(same) ? same : (list[Math.min(Math.max(index, 0), list.length - 1)] ?? this.win);
    target.focus({ preventScroll: true });
  }

  close(): void {
    if (!this.view) return;
    this.disposeView();
    this.view = null;
    this.builder = null;
    this.root.hidden = true;
    clear(this.body);
    for (const fn of this.listeners) fn(false);
    // The app moves focus to the world while playing; otherwise go back to where the panel was opened from.
    // (re-rendered meanwhile, e.g. the intro after a language switch: the same control by id / data-*).
    const back = this.returnFocus?.isConnected ? this.returnFocus : this.returnKey ? document.querySelector<HTMLElement>(this.returnKey) : null;
    this.returnFocus = null;
    this.returnKey = null;
    const now = document.activeElement;
    if (back && (!now || now === document.body) && !this.modalAbove()) back.focus({ preventScroll: true });
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
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (e.shiftKey && (document.activeElement === first || at < 0)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || at < 0)) {
      e.preventDefault();
      first.focus();
    }
  }

  /** The body element (for panels that query their own content). */
  get bodyEl(): HTMLElement {
    return this.body;
  }
}

/** A selector that finds "the same" control after a re-render (id, else tag + data-* attributes). */
export function focusKey(el: HTMLElement): string | null {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const data = Object.entries(el.dataset);
  if (!data.length) return null;
  return el.tagName.toLowerCase() + data.map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${CSS.escape(v ?? "")}"]`).join("");
}

export function panelRoot(): HTMLElement {
  return $("#panel");
}
