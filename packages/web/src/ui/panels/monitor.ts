/**
 * Bedside monitor panel: the shared `monitorRenderer` on a large canvas,
 * the alarm list, and NIBP "cycle now" (re-measures the cuff pressure from
 * the current physiology snapshot). Before the case's monitor is attached
 * (`monitorAttached: false`) the screen is dark, the side says so, lists the
 * triage readings taken by hand and offers to attach it (the case's
 * monitoring intervention, through the approval gate like any treatment).
 */
import { conditionRefs, vitalsAt, type CaseDefinition, type Intervention, type VitalKey, type VitalsSnapshot } from "@clinicalcraft/core";
import type { App } from "../../app/context.js";
import { monitorRenderer } from "../../shared/monitor-render.js";
import { ct, getLocale, tr, trMaybe } from "../../i18n/index.js";
import { clear, clockLabel, h } from "../dom.js";
import type { PanelView } from "../panel.js";

export interface MonitorArgs {
  placementId: string | null;
}

const UNITS: Record<string, string> = { hr: "/min", sbp: "mmHg", dbp: "mmHg", rr: "/min", spo2: "%", temp: "°C", gcs: "", glucose: "mmol/L", etco2: "mmHg", pain: "/10" };

/**
 * The intervention that attaches the case's bedside monitor: the first
 * `monitoring` intervention named by an `intervened` leaf of
 * `physiology.monitor.attachedWhen`, in condition order (the case lists the
 * plain monitoring step first, e.g. stroke's `cardiac-monitoring` before the
 * post-thrombolysis monitoring order); null when there is none.
 */
export function monitorIntervention(c: CaseDefinition): Intervention | null {
  const when = c.physiology?.monitor?.attachedWhen;
  if (!when) return null;
  for (const ref of conditionRefs(when)) {
    if (ref.kind !== "intervention") continue;
    const found = c.interventions.find((i) => i.id === ref.id && i.kind === "monitoring");
    if (found) return found;
  }
  return null;
}

/** "HR 96/min · BP 192/104 mmHg · …" — the spot checks of a snapshot taken before the monitor (static readings). */
export function spotCheckText(snap: VitalsSnapshot): string {
  const v = snap.vitals;
  const keys = new Set<VitalKey>(snap.spotChecks ?? []);
  const parts: string[] = [];
  for (const k of snap.spotChecks ?? []) {
    if (k === "dbp" && keys.has("sbp")) continue;
    if (k === "sbp" && v.sbp != null && v.dbp != null && keys.has("dbp")) {
      parts.push(`${trMaybe("vital.bp", "BP")} ${v.sbp}/${v.dbp} mmHg`);
      continue;
    }
    const value = v[k];
    const unit = UNITS[k] ?? "";
    if (typeof value === "number") parts.push(`${trMaybe(`vital.${k}`, k)} ${value}${unit === "%" || unit.startsWith("/") ? unit : unit ? ` ${unit}` : ""}`);
  }
  return parts.join(" · ");
}

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
    let nibp: { sbp: number; dbp: number; at: number; none?: boolean } | null = null;
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
            nibpBtn.disabled = false;
            if (snap.monitorAttached === false || snap.vitals.sbp == null || snap.vitals.dbp == null) {
              nibp = null;
              renderInfo();
              return;
            }
            nibp = { sbp: Math.round(snap.vitals.sbp), dbp: Math.round(snap.vitals.dbp), at: snap.minute, ...(snap.unmeasurable?.includes("sbp") ? { none: true } : {}) };
            renderInfo();
          }, 1400);
        },
      },
      tr("monitor.nibp"),
    );

    const attachWith = monitorIntervention(c);
    const renderInfo = (): void => {
      clear(alarms);
      const snap = snapshot();
      const off = snap?.monitorAttached === false;
      nibpBtn.disabled = !linked || off;
      nibpBtn.title = off ? tr("monitor.nibpOff") : "";
      if (off) {
        alarms.append(h("h4", null, tr("monitor.notAttached")), h("p", { id: "monitor-off", class: "notice" }, tr("monitor.notAttachedBody")));
        const manual = spotCheckText(snap);
        if (manual) alarms.append(h("p", { id: "monitor-spot-checks", class: "small" }, h("b", null, `${tr("monitor.spotChecks")}: `), manual));
        if (attachWith) {
          alarms.append(h("button", { type: "button", id: "monitor-attach", dataset: { intervention: attachWith.id }, onclick: () => app.act({ type: "intervene", interventionId: attachWith.id }) }, tr("monitor.attach")));
        }
      }
      // Without a monitor nothing alarms (the engine raises no alarm then): no "Alarms" section.
      if (!off) alarms.append(h("h4", null, tr("monitor.alarms")));
      if (!linked) alarms.append(h("p", { class: "small muted" }, tr("monitor.notLinked")));
      else if (snap?.baselineOnly) alarms.append(h("p", { class: "notice" }, tr("monitor.baseline")));
      else if (off) {
        /* nothing more to say: the notice above covers it */
      } else {
        // Cardiac arrest: vitals the monitor cannot read do not alarm on their placeholder 0 (hr says "no reading").
        const unread = new Set<string>(snap?.unmeasurable ?? []);
        const list = (snap?.alarms ?? []).filter((a) => a.vital === "hr" || !unread.has(a.vital));
        if (!list.length) alarms.append(h("p", { class: "small muted" }, tr("monitor.noAlarms")));
        else
          alarms.append(
            h(
              "ul",
              { class: "alarms" },
              list.map((a) =>
                h(
                  "li",
                  { class: `alarm ${a.level}` },
                  h("b", null, tr(`monitor.level.${a.level}`)),
                  " ",
                  trMaybe(`vital.${a.vital}`, a.vital),
                  " ",
                  h("span", { class: "num" }, unread.has(a.vital) ? tr("monitor.noReading") : `${Math.round(a.value * 10) / 10} ${UNITS[a.vital] ?? ""}`),
                ),
              ),
            ),
          );
      }
      if (snap && c.clock.mode === "simulated") alarms.append(h("p", { class: "small muted" }, tr("monitor.minute", { n: Math.round(snap.minute) }), c.clock.startTime ? ` · ${clockLabel(c.clock.startTime, snap.minute)}` : ""));
      nibpText.textContent = off ? tr("monitor.nibpOff") : nibp ? tr("monitor.nibpDone", { bp: nibp.none ? tr("monitor.noReading") : `${nibp.sbp}/${nibp.dbp}`, time: c.clock.startTime ? clockLabel(c.clock.startTime, nibp.at) : `T+${Math.round(nibp.at)}` }) : "";
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
