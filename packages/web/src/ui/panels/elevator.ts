/**
 * Elevator car panel (EMBODIED R10): the floors the car serves (top floor
 * first, like a real car panel), the current one marked. Choosing another
 * closes the window and rides there — the world closes the doors, runs a
 * short ride and opens the doors on arrival.
 */
import type { App } from "../../app/context.js";
import { getLocale, tr } from "../../i18n/index.js";
import { h } from "../dom.js";
import type { PanelView } from "../panel.js";

export interface ElevatorArgs {
  connectorId: string;
  /** Level of the car panel that was used (the avatar's level). */
  level: string;
  /** Elevator name (· level), as the world labels the panel. */
  name: string;
  /** Levels the car serves, lowest first. */
  stops: string[];
}

export function elevatorPanel(app: App, args: ElevatorArgs): () => PanelView {
  return () => {
    const api = app.world.api;
    const names = new Map((api?.levels(getLocale()) ?? []).map((l) => [l.id, l.name]));
    const here = api?.position.level ?? args.level;
    const ride = (level: string) => {
      app.close();
      if (!api) return;
      api.rideElevator(args.connectorId, level).catch((err: unknown) => app.toast(tr("elevator.failed"), err instanceof Error ? err.message : String(err), "warning"));
    };
    const buttons = [...args.stops].reverse().map((level) => {
      const name = names.get(level) ?? level;
      const current = level === here;
      return h(
        "button",
        {
          type: "button",
          class: ["elevator-level", current ? "current" : ""],
          dataset: { level },
          disabled: current,
          "aria-label": current ? `${name} · ${tr("elevator.here")}` : tr("elevator.go", { level: name }),
          onclick: () => ride(level),
        },
        h("b", null, name),
        current ? h("small", null, tr("elevator.here")) : null,
      );
    });
    return {
      id: "elevator",
      kicker: tr("elevator.kicker"),
      title: args.name,
      variant: "narrow",
      body: h("div", { class: "elevator-panel" }, h("p", { class: "small muted" }, tr("elevator.lead")), h("div", { class: "elevator-levels", role: "group", "aria-label": tr("map.levels") }, buttons)),
      focus: buttons.find((b) => !b.disabled) ?? null,
    };
  };
}
