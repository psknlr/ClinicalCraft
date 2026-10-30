/**
 * Workstation order entry (V4 `Jd`/`Zd`): free-text matching with the case's
 * order rules (core `matchOrders`), chips for this station, candidates
 * "开具 X →" (not yet ordered in this phase: a click places the order),
 * "调阅 X →" (ordered) or "X · 请前往 Y" (sets the destination, V4 behaviour), order
 * warnings, turnaround countdown in simulated cases, and the station's
 * evidence grid. Also the device panel (tests + bedside treatments; in
 * embodied mode also the device's own operations — an ECG cart's prepare →
 * connect → record → reset — and "Bring to the patient" for a cart, all
 * through `world_action`, the path the agents use). Embodied mode: what a
 * candidate offers is the world's verdict from where the learner stands
 * (`EmbodiedLink.verdict`) — a test that cannot be ordered here says why
 * before anything is placed (a lab test before any sample: at the patient's
 * side), and its click shows the way. "Sent" is said once the engine has the
 * order, never for a refused one.
 */
import { matchOrders, orderWarnings, resultFor, type CaseDefinition, type Investigation, type SessionState } from "@clinicalcraft/core";
import type { App, Game } from "../../app/context.js";
import type { Verdict } from "../../app/embodied-link.js";
import { ct, getLocale, tr } from "../../i18n/index.js";
import { clear, h } from "../dom.js";
import type { PanelView } from "../panel.js";
import { capList, evidenceGrid, minutesLeft, phaseName, riskBadge } from "./common.js";
import { carryRow } from "./hands.js";
import { treatRow } from "./treat-row.js";
import type { ReportBack } from "./report.js";

export interface OrdersArgs {
  placementId: string;
  query?: string;
}

/**
 * Run `then` once the engine holds the order `key`; nothing when its submission was refused (where the body
 * stands, the approval, the practice scope) — given up after two minutes.
 */
export function whenOrdered(game: Game, key: string, submission: string, then: () => void): void {
  const store = game.session.store;
  let off: () => void = () => undefined;
  let done = false;
  const finish = () => {
    done = true;
    off();
    clearTimeout(timer);
  };
  const timer = setTimeout(finish, 120_000);
  const check = (): void => {
    if (done) return;
    const s = store.snapshot?.state ?? game.session.session.state;
    if (s.orders.some((o) => o.key === key)) {
      finish();
      then();
    } else if (store.failureOf(submission) !== undefined) finish();
  };
  off = store.onChange(check);
  check();
}

/** Order (if needed) and open an investigation's report for the current phase. */
export function orderAndOpen(app: App, game: Game, inv: Investigation, placementId: string | null, back: ReportBack): void {
  const s = game.session.store.snapshot?.state ?? game.session.session.state;
  const phase = s.phase;
  const key = `${inv.id}@${phase}`;
  const existing = s.orders.find((o) => o.key === key);
  let submission: string | null = null;
  if (!existing) {
    submission = app.act({ type: "order", investigationId: inv.id, ...(placementId ? { at: placementId } : {}) });
    const simulatedWait = game.caseDef.clock.mode === "simulated" && inv.turnaroundMinutes > 0;
    if (simulatedWait) {
      // "sent, result in about N min" once the engine has the order — never for one that was refused
      if (submission) whenOrdered(game, key, submission, () => app.toast(ct(inv.name), tr("orders.pending", { name: ct(inv.name), min: Math.ceil(inv.turnaroundMinutes) }), "info", `order-${inv.id}`));
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

/**
 * Embodied: a test the world says cannot be ordered (or read) from where the learner stands — its name and the
 * world's words; the click shows the way (Go there, or the act to do first), nothing is placed.
 */
export function refusedCandidate(game: Game, inv: Investigation, v: Verdict): HTMLElement {
  return h(
    "button",
    { type: "button", class: "candidate refused", dataset: { investigation: inv.id, reason: v.kind === "refused" ? v.reason : "" }, onclick: () => game.embodied?.explain(v) },
    h("span", null, ct(inv.name)),
    h("small", { class: "candidate-why" }, v.kind === "refused" ? v.message : ""),
  );
}

/** Embodied: the world's verdict on ordering — or, once ordered in this phase, reading — a test from here. */
export function testVerdict(game: Game, inv: Investigation): Verdict | null {
  const emb = game.embodied;
  if (!emb) return null;
  const s = game.session.store.snapshot?.state ?? game.session.session.state;
  const ordered = s.orders.some((o) => o.key === `${inv.id}@${s.phase}`);
  return emb.verdict(ordered ? { type: "read", investigationId: inv.id, phase: s.phase } : { type: "order", investigationId: inv.id });
}

/** The order / open button of a test (its label says what a click does). */
export function testButton(app: App, game: Game, inv: Investigation, placementId: string | null, query: string, back: ReportBack): HTMLElement {
  const c = game.caseDef;
  const L = getLocale();
  const s = game.session.store.snapshot?.state ?? game.session.session.state;
  const name = ct(inv.name);
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
        orderAndOpen(app, game, inv, placementId, back);
      },
    },
    h("span", null, label),
    inv.risk === "moderate" || inv.risk === "high" ? riskBadge(inv.risk) : null,
  );
}

function candidateButton(app: App, game: Game, inv: Investigation, placementId: string, query: string, back: ReportBack): HTMLElement {
  const L = getLocale();
  const here = game.stations.caps(placementId);
  const atHere = inv.requires.length > 0 && inv.requires.every((r) => here.includes(r));
  const name = ct(inv.name);
  // embodied: the world decides from where the learner stands (the station's capabilities are not the rule)
  const verdict = testVerdict(game, inv);
  if (verdict) return verdict.kind === "refused" ? refusedCandidate(game, inv, verdict) : testButton(app, game, inv, placementId, query, back);
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
  return testButton(app, game, inv, placementId, query, back);
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
        if (inv) candidates.append(candidateButton(app, game, inv, args.placementId, q, { panel: "orders", placementId: args.placementId }));
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
    const ops = h("div", { id: "device-ops" });
    const renderOps = (): void => {
      clear(ops);
      const section = deviceOps(game, args.placementId);
      if (section) ops.append(section);
    };
    const render = (): void => {
      clear(content);
      renderOps();
      content.append(ops);
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
        for (const inv of investigations) list.append(candidateButton(app, game, inv, args.placementId, ct(inv.name), { panel: "device", placementId: args.placementId }));
        content.append(list);
      }
      if (interventions.length) {
        // clinical mode: the facility's bedside capabilities (embodied rows follow the world's verdict)
        const bedside = game.embodied ? new Set<string>() : game.stations.bedsideCaps(game.slotId);
        const scope = game.session.store.config?.practiceScope ?? game.session.settings.practiceScope;
        content.append(h("h3", null, tr("device.interventions")));
        // at the bedside: the world's rule in embodied mode (a cart where it stands now), the facility's otherwise
        const away = game.embodied ? !game.session.world()?.atBedside(`eq:${args.placementId}`) : !!placement && !game.stations.atBedside(placement, game.slotId);
        if (away) content.append(h("p", { class: "notice", id: "device-not-bedside" }, tr("treat.notBedside")));
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
    let lastVersion = game.session.store.version;
    return {
      id: "device",
      kicker: tr("device.kicker", { name }),
      title: name,
      body: content,
      update() {
        const now = game.session.store.snapshot?.state;
        if (now !== last) {
          last = now;
          render();
          return;
        }
        // device states and parked carts change with world events, not the engine state
        if (game.session.store.version !== lastVersion && game.embodied) renderOps();
        lastVersion = game.session.store.version;
      },
    };
  };
}

/**
 * Embodied mode: the device's own operations (catalog behaviour, e.g. the ECG cart's prepare → connect →
 * record → reset, offered from its current state) and, for a cart, "Bring to the patient" (`move_to`); for a
 * handheld item, its carry row (`hands.ts`: pick up, put down, equip, hand to someone).
 * Each is a `world_action` — validated, spatially checked and (for `record`) run through the approval gate
 * by the world, exactly as for an agent. Null when the device has none (or clinical mode).
 */
function deviceOps(game: Game, placementId: string): HTMLElement | null {
  const emb = game.embodied;
  const placement = game.stations.placement(placementId);
  const type = placement ? game.stations.type(placement) : undefined;
  if (!emb || !placement || !type) return null;
  const entityId = `eq:${placementId}`;
  const behavior = type.behavior && !type.behavior.derived ? type.behavior : null;
  const portable = type.portable === "cart";
  const patient = emb.patientId();
  const carry = carryRow(game, placementId);
  if (!behavior && !(portable && patient) && !carry) return null;
  const run = (operation: string, extra: Record<string, unknown> = {}) => void emb.worldAction({ operation, targetId: entityId, ...extra });
  const wrap = h("section", { class: "device-ops" }, h("h3", null, tr("device.ops")), h("p", { class: "small muted" }, tr("device.opsLead")));
  if (carry) wrap.append(carry);
  if (behavior) {
    // a handheld item: its own lifecycle state as the world stores it, and "held" / "equipped" while the learner
    // carries it (operations made for the hand: `from: ["held"]`)
    const handheld = type.portable === "handheld";
    const carried = handheld ? emb.carriedState(entityId) : null;
    const state = (handheld ? game.session.world()?.snapshot().entities[entityId]?.state : emb.deviceState(entityId)) ?? behavior.initial;
    const stateName = behavior.states?.[state]?.name;
    wrap.append(h("p", { class: "small", id: "device-state", dataset: { state } }, tr("device.state", { state: stateName ? ct(stateName) : state })));
    wrap.append(
      h(
        "div",
        { class: "row wrap device-op-list" },
        Object.entries(behavior.operations).map(([id, op]) => {
          const from = op.from ?? ["*"];
          const offered = from.includes("*") || from.includes(state) || (!!carried && from.includes(carried));
          return h("button", { type: "button", class: ["device-op", offered ? "" : "unavailable"], disabled: !offered, dataset: { op: id }, onclick: () => run(id) }, op.name ? ct(op.name) : id);
        }),
      ),
    );
  }
  if (portable && patient) {
    wrap.append(h("div", { class: "row wrap" }, h("button", { type: "button", id: "device-bring", dataset: { op: "move_to" }, onclick: () => run("move_to", { goal: { kind: "interact", id: patient } }) }, tr("device.bring"))));
  }
  return wrap;
}
