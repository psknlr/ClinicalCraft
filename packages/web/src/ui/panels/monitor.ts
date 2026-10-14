/**
 * Bedside monitor panel: the shared `monitorRenderer` on a large canvas,
 * the alarm list, and NIBP "cycle now" (re-measures the cuff pressure from
 * the current physiology snapshot).
 */
import { vitalsAt, type VitalsSnapshot } from "@clinicalcraft/core";
import type { App } from "../../app/context.js";
import { monitorRenderer } from "../../shared/monitor-render.js";
import { ct, getLocale, tr, trMaybe } from "../../i18n/index.js";
import { clear, clockLabel, h } from "../dom.js";
import type { PanelView } from "../panel.js";

export interface MonitorArgs {
  placementId: string | null;
}

const UNITS: Record<string, string> = { hr: "/min", sbp: "mmHg", dbp: "mmHg", rr: "/min", spo2: "%", temp: "°C", gcs: "", glucose: "mmol/L", etco2: "mmHg", pain: "/10" };

export function monitorPanel(app: App, args: MonitorArgs): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const store = game.session.store;
    const slot = game.facility.patientSlots.find((s) => s.id === game.slotId) ?? null;
    // A monitor placement shows this patient only when it is linked to the patient's slot (or no placement: the patient's own monitor).
    const linked = args.placementId === null || !slot?.monitor || slot.monitor === args.placementId || game.facility.patientSlots.every((s) => s.monitor !== args.placementId);
    const placement = args.placementId ? game.stations.placement(args.placementId) : null;
    const name = placement ? game.stations.label(placement, getLocale()) : ct(game.caseDef.patient.displayName);
    const canvas = h("canvas", { class: "monitor-canvas", width: "960", height: "540", role: "img", "aria-label": tr("monitor.title", { name }) });
    const ctx = canvas.getContext("2d");
    const alarms = h("div", { class: "alarm-list", "aria-live": "polite" });
    const nibpText = h("span", { class: "small muted" });
    let nibp: { sbp: number; dbp: number; at: number } | null = null;
    const snapshot = (): VitalsSnapshot | null => {
      if (!linked) return null;
      return store.snapshot?.vitals ?? vitalsAt(c, game.session.session.state);
    };
    const nibpBtn = h(
      "button",
      {
        type: "button",
        id: "nibp-cycle",
        disabled: !linked,
        onclick: () => {
          nibpBtn.disabled = true;
          nibpText.textContent = tr("monitor.nibpMeasuring");
          app.sound("beep");
          setTimeout(() => {
            const snap = vitalsAt(c, store.snapshot?.state ?? game.session.session.state);
            nibp = { sbp: Math.round(snap.vitals.sbp), dbp: Math.round(snap.vitals.dbp), at: snap.minute };
            nibpBtn.disabled = false;
            renderInfo();
          }, 1400);
        },
      },
      tr("monitor.nibp"),
    );

    const renderInfo = (): void => {
      clear(alarms);
      const snap = snapshot();
      alarms.append(h("h4", null, tr("monitor.alarms")));
      if (!linked) alarms.append(h("p", { class: "small muted" }, tr("monitor.notLinked")));
      else if (snap?.baselineOnly) alarms.append(h("p", { class: "notice" }, tr("monitor.baseline")));
      else if (!snap?.alarms.length) alarms.append(h("p", { class: "small muted" }, tr("monitor.noAlarms")));
      else
        alarms.append(
          h(
            "ul",
            { class: "alarms" },
            snap.alarms.map((a) =>
              h("li", { class: `alarm ${a.level}` }, h("b", null, tr(`monitor.level.${a.level}`)), " ", trMaybe(`vital.${a.vital}`, a.vital), " ", h("span", { class: "num" }, `${Math.round(a.value * 10) / 10} ${UNITS[a.vital] ?? ""}`)),
            ),
          ),
        );
      if (snap && c.clock.mode === "simulated") alarms.append(h("p", { class: "small muted" }, tr("monitor.minute", { n: Math.round(snap.minute) }), c.clock.startTime ? ` · ${clockLabel(c.clock.startTime, snap.minute)}` : ""));
      nibpText.textContent = nibp ? tr("monitor.nibpDone", { bp: `${nibp.sbp}/${nibp.dbp}`, time: c.clock.startTime ? clockLabel(c.clock.startTime, nibp.at) : `T+${Math.round(nibp.at)}` }) : "";
    };
    renderInfo();

    let raf = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!canvas.isConnected || !ctx) return;
      monitorRenderer.draw(ctx, canvas.width, canvas.height, snapshot(), now, getLocale());
    };
    raf = requestAnimationFrame(draw);
    let last = store.snapshot;
    return {
      id: "monitor",
      kicker: tr("monitor.kicker"),
      title: tr("monitor.title", { name }),
      variant: "wide",
      body: h("div", { class: "monitor-wrap" }, h("div", { class: "monitor-screen" }, canvas), h("aside", { class: "monitor-side" }, alarms, h("div", { class: "nibp" }, nibpBtn, nibpText))),
      update() {
        if (store.snapshot === last) return;
        last = store.snapshot;
        renderInfo();
      },
      dispose() {
        cancelAnimationFrame(raf);
      },
    };
  };
}
