/**
 * Workstation order entry (V4 `Jd`/`Zd`): free-text matching with the case's
 * order rules (core `matchOrders`), chips for this station, candidates
 * "开具 X →" (not yet ordered in this phase: a click places the order),
 * "调阅 X →" (ordered) or "X · 请前往 Y" (sets the destination, V4 behaviour), order
 * warnings, turnaround countdown in simulated cases, and the station's
 * evidence grid. Also the device panel (tests + bedside treatments).
 */
import { matchOrders, orderWarnings, resultFor, type CaseDefinition, type Investigation, type SessionState } from "@clinicalcraft/core";
import type { App, Game } from "../../app/context.js";
import { ct, getLocale, tr } from "../../i18n/index.js";
import { clear, h } from "../dom.js";
import type { PanelView } from "../panel.js";
import { capList, evidenceGrid, minutesLeft, phaseName, riskBadge } from "./common.js";
import { treatRow } from "./conversation.js";

export interface OrdersArgs {
  placementId: string;
  query?: string;
}

/** Order (if needed) and open an investigation's report for the current phase. */
export function orderAndOpen(app: App, game: Game, inv: Investigation, placementId: string | null, back: { panel: "orders" | "device" | "journal"; placementId?: string }): void {
  const s = game.session.store.snapshot?.state ?? game.session.session.state;
  const phase = s.phase;
  const key = `${inv.id}@${phase}`;
  const existing = s.orders.find((o) => o.key === key);
  let submission: string | null = null;
  if (!existing) {
    submission = app.act({ type: "order", investigationId: inv.id, ...(placementId ? { at: placementId } : {}) });
    const simulatedWait = game.caseDef.clock.mode === "simulated" && inv.turnaroundMinutes > 0;
    if (simulatedWait) {
      app.toast(ct(inv.name), tr("orders.pending", { name: ct(inv.name), min: Math.ceil(inv.turnaroundMinutes) }));
      return;
    }
    // Risky orders wait for the approval dialog; the report opens from the evidence grid afterwards.
    if (inv.risk === "moderate" || inv.risk === "high") return;
  }
  app.open("report", { investigationId: inv.id, phase, back, ...(submission ? { orderSubmission: submission } : {}) });
}

/**
 * The order notices to toast as `investigationId` is ordered from `query`:
 * `orderMatching.warnings` matching the query whose `unless` does not hold on
 * the session before the order — the same as the order_test tool.
 */
export function orderNotices(c: CaseDefinition, query: string, investigationId: string, locale: string, state: SessionState): string[] {
  return orderWarnings(c, query, investigationId, locale, state);
}

function candidateButton(app: App, game: Game, inv: Investigation, placementId: string, query: string): HTMLElement {
  const c = game.caseDef;
  const L = getLocale();
  const s = game.session.store.snapshot?.state ?? game.session.session.state;
  const here = game.stations.caps(placementId);
  const atHere = inv.requires.length > 0 && inv.requires.every((r) => here.includes(r));
  const name = ct(inv.name);
  if (!atHere) {
    const where = game.stations.nearestProvider(inv.requires, app.playerPos(), L);
    if (!where)
      return h("button", { type: "button", class: "candidate", disabled: true, title: capList(inv.requires) }, tr("orders.nowhere", { name }));
    return h(
      "button",
      {
        type: "button",
        class: "candidate elsewhere",
        dataset: { investigation: inv.id },
        onclick: () => {
          app.markDestination({ x: where.x, z: where.z, label: where.label, ...(where.level ? { level: where.level } : {}) });
          app.close();
          app.toast(tr("toast.markDest"), where.label);
        },
      },
      tr("orders.goTo", { name, station: where.label }),
    );
  }
  const order = s.orders.find((o) => o.key === `${inv.id}@${s.phase}`);
  const left = order ? minutesLeft(c, s, order) : 0;
  const hasRecord = resultFor(c, inv.id, s.phase) !== null;
  // Say what a click does: without an order for this phase it places one (time, approval, assessment) —
  // "Open" only once the test has been ordered.
  const label = order && left > 0 ? tr("orders.pending", { name, min: left }) : !hasRecord ? tr("orders.noRecord", { name }) : order ? tr("orders.open", { name }) : tr("orders.order", { name });
  return h(
    "button",
    {
      type: "button",
      class: ["candidate", !hasRecord ? "no-record" : ""],
      dataset: { investigation: inv.id },
      onclick: () => {
        const before = game.session.store.snapshot?.state ?? game.session.session.state;
        for (const w of orderNotices(c, query, inv.id, L, before)) app.toast(tr("orders.warning"), w, "warning");
        orderAndOpen(app, game, inv, placementId, { panel: "orders", placementId });
      },
    },
    h("span", null, label),
    inv.risk === "moderate" || inv.risk === "high" ? riskBadge(inv.risk) : null,
  );
}

export function ordersPanel(app: App, args: OrdersArgs): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const placement = game.stations.placement(args.placementId);
    const station = placement ? game.stations.label(placement, getLocale()) : tr("orders.station");
    const local = game.stations.investigationsAt(c, args.placementId);
    const state = () => game.session.store.snapshot?.state ?? game.session.session.state;
    const switchable = c.phases.filter((p) => p.learnerSwitchable).length > 1;

    const input = h("input", { id: "exam-input", autocomplete: "off", placeholder: tr("orders.placeholder", { example: local[0] ? ct(local[0].name) : ct(c.investigations[0]?.name) }), "aria-label": tr("orders.inputLabel") });
    input.addEventListener("keydown", (e) => e.stopPropagation());
    const candidates = h("div", { class: "candidates", id: "candidates", "aria-live": "polite" });
    const evidence = h("div", { id: "station-evidence" });
    const pill = h("span", { class: "phase-pill" });
    let lastQuery = "";

    const match = (): void => {
      const q = input.value;
      lastQuery = q;
      clear(candidates);
      if (!q.trim()) return;
      const ids = matchOrders(c, q, getLocale());
      if (!ids.length) {
        candidates.append(h("div", { class: "empty" }, tr("orders.noMatch")));
        return;
      }
      for (const id of ids) {
        const inv = c.investigations.find((x) => x.id === id);
        if (inv) candidates.append(candidateButton(app, game, inv, args.placementId, q));
      }
    };

    const ids = new Set(local.map((i) => i.id));
    const renderEvidence = (): void => {
      clear(evidence);
      evidence.append(
        evidenceGrid(
          game,
          (o) => ids.has(o.investigationId),
          (o) => app.open("report", { investigationId: o.investigationId, phase: o.phase, back: { panel: "orders", placementId: args.placementId } }),
        ),
      );
      pill.textContent = tr("orders.phase", { phase: phaseName(c, state().phase) });
    };
    renderEvidence();
    if (args.query) {
      input.value = args.query;
      match();
    }

    const body = h(
      "div",
      null,
      h("div", { class: "row wrap" }, pill, h("span", { class: "small muted" }, switchable ? tr("orders.phaseHint") : tr("orders.phaseAuto"))),
      h("p", null, tr("orders.lead")),
      h("form", { id: "exam-form", class: "exam-search", onsubmit: (e: Event) => (e.preventDefault(), match()) }, input, h("button", { class: "primary" }, tr("orders.match"))),
      h(
        "div",
        { class: "chips" },
        local.map((inv) =>
          h(
            "button",
            {
              type: "button",
              dataset: { fill: ct(inv.name) },
              onclick: () => {
                input.value = ct(inv.name);
                match();
              },
            },
            ct(inv.name),
          ),
        ),
      ),
      candidates,
      evidence,
    );

    let lastState = state();
    return {
      id: "orders",
      kicker: tr("orders.kicker", { station }),
      title: station,
      body,
      focus: input,
      update() {
        if (state() === lastState) return;
        lastState = state();
        renderEvidence();
        if (lastQuery.trim()) {
          const q = input.value;
          input.value = lastQuery;
          match();
          input.value = q;
        }
      },
    };
  };
}

/** Device panel: tests and treatments whose requirements intersect this device. */
export function devicePanel(app: App, args: { placementId: string }): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const L = getLocale();
    const placement = game.stations.placement(args.placementId);
    const name = placement ? game.stations.label(placement, L) : args.placementId;
    const caps = game.stations.caps(args.placementId);
    const content = h("div");
    const render = (): void => {
      clear(content);
      const { investigations, interventions } = game.stations.deviceActions(c, args.placementId);
      const s = game.session.store.snapshot?.state ?? game.session.session.state;
      content.append(h("p", { class: "small muted" }, tr("device.lead"), " ", tr("device.caps", { caps: capList(caps) })));
      if (!investigations.length && !interventions.length) {
        content.append(h("div", { class: "empty" }, tr("device.nothing")));
        return;
      }
      if (investigations.length) {
        content.append(h("h3", null, tr("device.investigations")));
        const list = h("div", { class: "candidates" });
        for (const inv of investigations) list.append(candidateButton(app, game, inv, args.placementId, ct(inv.name)));
        content.append(list);
      }
      if (interventions.length) {
        const bedside = game.stations.bedsideCaps(game.slotId);
        const scope = game.session.store.config?.practiceScope ?? game.session.settings.practiceScope;
        content.append(h("h3", null, tr("device.interventions")));
        if (placement && !game.stations.atBedside(placement, game.slotId)) content.append(h("p", { class: "notice" }, tr("treat.notBedside")));
        content.append(h("div", { class: "treat-list" }, interventions.map((iv) => treatRow(app, game, iv, bedside, scope !== "full"))));
      }
      if (investigations.length) {
        const ids = new Set(investigations.map((i) => i.id));
        // No search box here: the empty state points at the tests listed above.
        content.append(evidenceGrid(game, (o) => ids.has(o.investigationId), (o) => app.open("report", { investigationId: o.investigationId, phase: o.phase, back: { panel: "device", placementId: args.placementId } }), tr("device.none")));
      }
      void s;
    };
    render();
    let last = game.session.store.snapshot?.state;
    return {
      id: "device",
      kicker: tr("device.kicker", { name }),
      title: name,
      body: content,
      update() {
        const now = game.session.store.snapshot?.state;
        if (now === last) return;
        last = now;
        render();
      },
    };
  };
}
