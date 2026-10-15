/**
 * Approval dialog bound to `approval_request` / `approval_response`
 * (Codex approved / approved_for_session / denied / abort; Grok CLI "don't
 * ask again this session"). Modal above every panel, role="alertdialog",
 * focus defaults to "deny" for high-risk requests (moved synchronously, so
 * keys pressed right after the request never reach the panel underneath),
 * Esc denies (the app routes Esc here whatever has focus) and keeps a typed
 * reason, Enter in the reason field denies with it.
 */
import type { ApprovalDecision } from "@clinicalcraft/agent";
import type { App } from "../app/context.js";
import type { ApprovalRequest } from "../app/store.js";
import { tr, trMaybe } from "../i18n/index.js";
import { clear, focusables, h } from "./dom.js";
import { riskBadge } from "./panels/common.js";

export class ApprovalDialog {
  private current: ApprovalRequest | null = null;
  private readonly root: HTMLElement;
  private readonly box: HTMLElement;
  private readonly listeners = new Set<(open: boolean) => void>();
  private lastFocus: HTMLElement | null = null;
  private initialFocus: HTMLElement | null = null;
  private reasonEl: HTMLInputElement | null = null;
  /** Where focus goes when the dialog closes (default: the element focused before it opened). */
  restoreFocus: (previous: HTMLElement | null) => void = (previous) => previous?.focus?.({ preventScroll: true });

  constructor(
    root: HTMLElement,
    private readonly app: App,
  ) {
    this.root = root;
    this.box = h("section", { class: "window approval-window", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "approval-title", "aria-describedby": "approval-summary" });
    root.appendChild(this.box);
    root.hidden = true;
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      } else if (e.key === "Enter" && e.target === this.reasonEl && !e.isComposing) {
        e.preventDefault();
        this.cancel();
      } else if (e.key === "Tab") {
        const list = focusables(this.box);
        if (!list.length) return;
        if (e.shiftKey && document.activeElement === list[0]) {
          e.preventDefault();
          list[list.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === list[list.length - 1]) {
          e.preventDefault();
          list[0].focus();
        }
      }
      e.stopPropagation();
    });
  }

  get isOpen(): boolean {
    return !!this.current;
  }

  /** Esc / Enter in the reason field: deny, keeping whatever reason was typed. */
  cancel(): void {
    this.answer("denied", this.reasonEl?.value);
  }

  onToggle(fn: (open: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Re-evaluate against the store (called on every store change). */
  sync(): void {
    const store = this.app.game?.session.store;
    const pending = store?.pendingApprovals() ?? [];
    const next = pending[0] ?? null;
    if (next?.requestId === this.current?.requestId) {
      if (next) this.renderQueue(pending.length - 1);
      return;
    }
    const wasOpen = !!this.current;
    this.current = next;
    if (!next) {
      this.root.hidden = true;
      clear(this.box);
      this.reasonEl = null;
      this.initialFocus = null;
      if (wasOpen) {
        for (const fn of this.listeners) fn(false);
        const previous = this.lastFocus;
        this.lastFocus = null;
        this.restoreFocus(previous);
      }
      return;
    }
    if (!wasOpen) this.lastFocus = document.activeElement as HTMLElement | null;
    this.render(next, pending.length - 1);
    this.root.hidden = false;
    try {
      this.initialFocus?.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
    if (!wasOpen) for (const fn of this.listeners) fn(true);
    this.app.sound("beep");
  }

  private queueEl: HTMLElement | null = null;

  private renderQueue(more: number): void {
    if (this.queueEl) this.queueEl.textContent = more > 0 ? tr("approval.queue", { n: more }) : "";
  }

  private render(req: ApprovalRequest, more: number): void {
    clear(this.box);
    const high = req.risk === "high";
    const agent = req.agent === "learner" ? tr("role.learner") : trMaybe(`role.${req.agent}`, String(req.agent));
    const reason = h("input", { type: "text", id: "approval-reason", placeholder: tr("approval.denyReason"), "aria-label": tr("approval.denyReason"), maxlength: "300", autocomplete: "off" });
    this.reasonEl = reason;
    const approve = h("button", { type: "button", class: high ? "" : "primary", id: "approval-approve", onclick: () => this.answer("approved") }, tr("approval.approve"));
    const session = req.allowSession ? h("button", { type: "button", id: "approval-session", onclick: () => this.answer("approved_for_session") }, tr("approval.session")) : null;
    const deny = h("button", { type: "button", class: high ? "primary danger-solid" : "", id: "approval-deny", onclick: () => this.answer("denied", reason.value) }, tr("approval.deny"));
    const abort = h("button", { type: "button", class: "ghost", id: "approval-abort", onclick: () => this.answer("abort") }, tr("approval.abort"));
    this.queueEl = h("small", { class: "muted" });
    this.box.className = `window approval-window${high ? " high" : ""}`;
    this.box.append(
      h(
        "header",
        { class: "window-head" },
        h("div", null, h("div", { class: "eyebrow" }, tr("approval.kicker")), h("h2", { id: "approval-title" }, tr("approval.title"))),
        riskBadge(req.risk),
      ),
      h(
        "div",
        { class: "window-body" },
        h("p", { class: "approval-from" }, req.agent === "learner" ? tr("approval.fromLearner") : tr("approval.from", { agent })),
        h("p", { class: "approval-summary", id: "approval-summary" }, req.summary),
        high ? h("p", { class: "notice danger" }, tr("approval.highRisk")) : null,
        h(
          "dl",
          { class: "approval-meta" },
          h("dt", null, tr("approval.tool")),
          h("dd", null, h("code", null, req.tool)),
          h("dt", null, tr("approval.risk")),
          h("dd", null, trMaybe(`risk.${req.risk}`, req.risk)),
          req.reason ? [h("dt", null, tr("approval.reason")), h("dd", null, req.reason)] : null,
          h("dt", null, tr("approval.rule")),
          h("dd", null, h("code", null, req.ruleId)),
        ),
        reason,
        h("div", { class: "approval-actions" }, approve, session, deny, abort),
        this.queueEl,
      ),
    );
    this.renderQueue(more);
    this.initialFocus = high ? deny : approve;
  }

  private answer(decision: ApprovalDecision, reason?: string): void {
    const req = this.current;
    if (!req) return;
    this.app.submit({ type: "approval_response", requestId: req.requestId, decision, ...(reason?.trim() ? { reason: reason.trim() } : {}) });
    const label = tr(`approval.resolved.${decision}` as "approval.resolved.approved");
    // Learner actions: the session itself reports the refusal (no duplicate toast).
    if (decision !== "approved" && decision !== "approved_for_session" && req.agent !== "learner") this.app.toast(label, req.summary, "warning");
  }
}
