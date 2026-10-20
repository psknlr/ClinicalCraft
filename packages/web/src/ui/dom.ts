/**
 * Minimal DOM helpers. Dynamic text (case content, model output) always goes
 * through `textContent`; `html` is only for our own trusted i18n markup.
 */
export type Child = Node | string | number | null | undefined | false | Child[];

export interface Attrs {
  class?: string | (string | false | null | undefined)[];
  style?: string;
  html?: string;
  dataset?: Record<string, string>;
  [key: string]: unknown;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = Array.isArray(v) ? v.filter(Boolean).join(" ") : String(v);
      // CSSOM (not a style="" attribute): allowed under a CSP without style-src 'unsafe-inline'.
      else if (k === "style") el.style.cssText = String(v);
      else if (k === "html") el.innerHTML = String(v);
      else if (k === "dataset") Object.assign(el.dataset, v as Record<string, string>);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === "value" && "value" in el) (el as HTMLInputElement).value = String(v);
      else if (k === "checked" || k === "disabled" || k === "hidden" || k === "selected" || k === "open" || k === "readOnly" || k === "multiple") (el as unknown as Record<string, unknown>)[k] = !!v;
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(parent, c);
    else if (c instanceof Node) parent.appendChild(c);
    else parent.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function $(sel: string, root: ParentNode = document): HTMLElement {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`missing element ${sel}`);
  return el as HTMLElement;
}

export function $$(sel: string, root: ParentNode = document): HTMLElement[] {
  return [...root.querySelectorAll(sel)] as HTMLElement[];
}

/** Replace an element's children. */
export function mount(el: Element, ...children: Child[]): void {
  clear(el);
  append(el, children);
}

/** Simple rAF-throttled callback. */
export function throttleFrame(fn: () => void): () => void {
  let pending = false;
  return () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      fn();
    });
  };
}

export function prefersReducedMotion(): boolean {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** HH:MM from a start label and minutes. */
export function clockLabel(start: string | undefined, minutes: number): string {
  const [hh, mm] = (start ?? "00:00").split(":").map(Number);
  const total = Math.floor((hh || 0) * 60 + (mm || 0) + minutes);
  const d = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
}

/** Focusable elements inside a container (visible only). */
export function focusables(root: HTMLElement): HTMLElement[] {
  return ([...root.querySelectorAll("button:not(:disabled), input:not([hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex]:not([tabindex='-1'])")] as HTMLElement[]).filter(
    (el) => el.getClientRects().length > 0,
  );
}
