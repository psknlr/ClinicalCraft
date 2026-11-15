/**
 * Approval dialog bound to `approval_request` / `approval_response`
 * (Codex approved / approved_for_session / denied / abort; Grok CLI "don't
 * ask again this session"). Modal above every panel, role="alertdialog",
 * focus defaults to "deny" for high-risk requests (moved synchronously, so
 * keys pressed right after the request never reach the panel underneath),
 * Esc denies (the app routes Esc here whatever has focus) and keeps a typed
 * reason, Enter in the reason field denies with it. A request raised by an
 * external agent's call (`app.external.owns(submissionId)`, PROTOCOL §13.6)
 * is labelled as coming from the external agent — the learner decides it like
 * any other; nothing on the bridge can answer it. The stand-in surgeon's
 * call-out before a critical step (docs/TEAM.md §4.5) is its own card: the line
 * said by name, "No objection" / "Stop" bound to the same approval response.
 */
import type { ApprovalDecision } from "@clinicalcraft/agent";
import { t } from "@clinicalcraft/core";
import type { App } from "../app/context.js";
import type { ApprovalRequest } from "../app/store.js";
import { getLocale, tr, trMaybe } from "../i18n/index.js";
import { clear, focusables, h } from "./dom.js";
import { riskBadge } from "./panels/common.js";
import { calloutAnswer, calloutOf, type CalloutCard } from "./panels/team-view.js";

export class ApprovalDialog {
  private current: ApprovalRequest | null = null;
  private readonly root: HTMLElement;
  private readonly box: HTMLElement;
  private readonly listeners = new Set<(open: boolean) => void>();
  private lastFocus: HTMLElement | null = null;
  private initialFocus: HTMLElement | null = null;
  private answered: string | null = null;
  private reasonEl: HTMLInputElement | null = null;
  /** The call-out on show (`renderCallout`): its card — the answers it sends —, whose line it is and the line, for the answer's toast. */
  private callout: { card: CalloutCard; name: string; line: string } | null = null;
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

  /**
   * The stand-in surgeon's call-out (`team-view.ts` `calloutOf`: a request carrying its line, raised for its body): its
   * line said by name — "Dr Ito: Clipping the cystic duct." —, and "No objection" / "Stop", each sending the card's own
   * approval response (`calloutAnswer`: `card.go` / `card.stop`; Esc stops, as it denies any request; a high-risk step's
   * card starts with the focus on Stop). Stopped, the stand-in looks at the field and asks the learner what they see:
   * the team's window offers "Go on" (opened at once when no other window is open; the HUD's Team button says the
   * surgeon waits).
   */
  private renderCallout(card: CalloutCard, req: ApprovalRequest, more: number): void {
    clear(this.box);
    this.reasonEl = null;
    const game = this.app.game;
    const who = game?.session.world()?.entity(card.actorId);
    const name = who ? t(who.name, getLocale()) : card.actorId.replace(/^staff:/u, "");
    const go = h("button", { type: "button", class: "primary", id: "approval-approve", dataset: { callout: "go" }, onclick: () => this.answer("approved") }, tr("callout.go"));
    const stop = h("button", { type: "button", class: "danger-solid", id: "approval-deny", dataset: { callout: "stop" }, title: tr("callout.stopTitle"), onclick: () => this.answer("denied") }, tr("callout.stop"));
    this.queueEl = h("small", { class: "muted" });
    this.callout = { card, name, line: card.line };
    this.box.className = "window approval-window callout-card";
    delete this.box.dataset.source;
    this.box.append(
      h("header", { class: "window-head" }, h("div", null, h("div", { class: "eyebrow" }, tr("callout.kicker")), h("h2", { id: "approval-title", class: "callout-line" }, tr("callout.title", { name, line: card.line })))),
      h("div", { class: "window-body" }, h("p", { class: "approval-summary", id: "approval-summary" }, tr("callout.lead")), h("div", { class: "approval-actions callout-actions" }, go, stop), this.queueEl),
    );
    this.renderQueue(more);
    // as for any high-risk request, the focus starts on the answer that stops: a key pressed at once never lets it go on
    this.initialFocus = req.risk === "high" ? stop : go;
  }

  private render(req: ApprovalRequest, more: number): void {
    const game = this.app.game;
    const card = game ? calloutOf(req, game.caseDef, game.session.store.snapshot?.state ?? game.session.session.state) : null;
    if (card) return this.renderCallout(card, req, more);
    this.callout = null;
    clear(this.box);
    const high = req.risk === "high";
    // An external agent's call runs as the clinician: its requests carry `agent: "clinician"`, the submission tells them apart.
    const external = this.app.external.owns(req.submissionId);
    const agent = req.agent === "learner" ? tr("role.learner") : trMaybe(`role.${req.agent}`, String(req.agent));
    const reason = h("input", { type: "text", id: "approval-reason", placeholder: tr("approval.denyReason"), "aria-label": tr("approval.denyReason"), maxlength: "300", autocomplete: "off" });
    this.reasonEl = reason;
    const approve = h("button", { type: "button", class: high ? "" : "primary", id: "approval-approve", onclick: () => this.answer("approved") }, tr("approval.approve"));
    const session = req.allowSession ? h("button", { type: "button", id: "approval-session", onclick: () => this.answer("approved_for_session") }, tr("approval.session")) : null;
    const deny = h("button", { type: "button", class: high ? "primary danger-solid" : "", id: "approval-deny", onclick: () => this.answer("denied", reason.value) }, tr("approval.deny"));
    const abort = h("button", { type: "button", class: "ghost", id: "approval-abort", onclick: () => this.answer("abort") }, tr("approval.abort"));
    this.queueEl = h("small", { class: "muted" });
    this.box.className = `window approval-window${high ? " high" : ""}${external ? " external" : ""}`;
    if (external) this.box.dataset.source = "external";
    else delete this.box.dataset.source;
    this.box.append(
      h(
        "header",
        { class: "window-head" },
        h(
          "div",
          null,
          h("div", { class: "eyebrow" }, tr("approval.kicker")),
          h("h2", { id: "approval-title" }, tr("approval.title"), external ? h("span", { class: "approval-source", id: "approval-source" }, tr("approval.externalTag")) : null),
        ),
        riskBadge(req.risk),
      ),
      h(
        "div",
        { class: "window-body" },
        h("p", { class: "approval-from" }, req.agent === "learner" ? tr("approval.fromLearner") : external ? tr("approval.fromExternal") : tr("approval.from", { agent })),
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
    // One answer per request: a double click / repeated Esc before approval_resolved arrives is
    // ignored (a retry is possible again after a few seconds, should the answer have been lost).
    if (!req || this.answered === req.requestId) return;
    const id = (this.answered = req.requestId);
    setTimeout(() => {
      if (this.answered === id) this.answered = null;
    }, 3000);
    // a call-out sends its card's own answer (No objection / Stop); any other request the decision chosen
    const callout = this.callout?.card.requestId === req.requestId ? this.callout : null;
    this.app.submit(callout ? calloutAnswer(callout.card, decision) : { type: "approval_response", requestId: req.requestId, decision, ...(reason?.trim() ? { reason: reason.trim() } : {}) });
    const label = tr(`approval.resolved.${decision}` as "approval.resolved.approved");
    const stopped = decision !== "approved" && decision !== "approved_for_session";
    if (callout && stopped) {
      // a call-out stopped: who was stopped and their line, and where the learner answers the stand-in's question ("Go on")
      this.app.toast(tr("callout.stopped", { name: callout.name }), tr("callout.stoppedBody", { line: callout.line }), "warning");
      if (!this.app.panels.isOpen) setTimeout(() => !this.app.panels.isOpen && this.app.game && this.app.open("team"), 0);
      return;
    }
    // Learner actions: the session itself reports the refusal (no duplicate toast).
    if (stopped && req.agent !== "learner") this.app.toast(label, req.summary, "warning");
  }
}
