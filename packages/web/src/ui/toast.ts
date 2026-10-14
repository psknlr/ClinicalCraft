/**
 * V4 toast (top centre, slides down) with a small queue; critical
 * notifications are red and stay longer. Announced politely (aria-live).
 */
import { h } from "./dom.js";

export type ToastLevel = "info" | "success" | "warning" | "critical";

interface Item {
  title: string;
  body: string;
  level: ToastLevel;
}

export class Toaster {
  private readonly el: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly bodyEl: HTMLElement;
  private queue: Item[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private showing: Item | null = null;

  constructor(root: HTMLElement) {
    this.titleEl = h("b", { class: "toast-title" });
    this.bodyEl = h("p", { class: "toast-copy" });
    this.el = h("div", { class: "toast", role: "status", "aria-live": "polite" }, this.titleEl, this.bodyEl);
    root.appendChild(this.el);
  }

  show(title: string, body = "", level: ToastLevel = "info"): void {
    const item = { title, body, level };
    // Critical messages jump the queue; identical consecutive toasts collapse.
    if (this.showing && this.showing.title === title && this.showing.body === body) return;
    if (level === "critical") this.queue.unshift(item);
    else this.queue.push(item);
    if (this.queue.length > 4) this.queue = this.queue.slice(0, 4);
    if (!this.showing) this.next();
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.showing = null;
      this.el.classList.remove("show");
      return;
    }
    this.showing = item;
    this.titleEl.textContent = item.title;
    this.bodyEl.textContent = item.body;
    this.bodyEl.hidden = !item.body;
    this.el.className = `toast show toast-${item.level}`;
    this.el.setAttribute("role", item.level === "critical" ? "alert" : "status");
    if (this.timer) clearTimeout(this.timer);
    const ms = item.level === "critical" ? 6000 : 3800;
    this.timer = setTimeout(() => {
      this.el.classList.remove("show");
      this.timer = setTimeout(() => this.next(), 220);
    }, this.queue.length ? Math.min(ms, 2600) : ms);
  }
}
