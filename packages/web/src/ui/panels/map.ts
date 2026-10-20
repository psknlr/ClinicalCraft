/**
 * World map (V4 `nc`): the big map drawn by the world and a destination
 * list — case destinations (patient, evidence board, atlas, crafting),
 * the workstations/devices this case needs, and the facility's rooms.
 * Picking a destination marks the golden beacon (V4); "walk" lets the
 * world auto-walk there. A multi-level facility gets floor tabs: the map
 * opens on the avatar's floor and shows any other one on request.
 */
import { roomLevel, t } from "@clinicalcraft/core";
import type { App } from "../../app/context.js";
import { ct, getLocale, tr, trMaybe } from "../../i18n/index.js";
import { h } from "../dom.js";
import type { PanelView } from "../panel.js";
import { capList } from "./common.js";

interface Dest {
  id: string;
  label: string;
  hint: string;
  x: number;
  z: number;
  /** Level (multi-level facilities). */
  level?: string;
}

const SKIP_ROOM_KINDS = new Set(["corridor", "restroom", "storage", "elevator", "stairwell"]);

export function mapPanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const L = getLocale();
    const c = game.caseDef;
    const f = game.facility;
    const st = game.stations;
    const api = app.world.api;
    const canvas = h("canvas", { id: "bigmap", class: "bigmap", width: "640", height: "640", role: "img", "aria-label": tr("map.title") });
    const current = game.link.destination();
    // floors (multi-level facilities): the map shows the avatar's floor first, the tabs switch it
    const levels = api?.levels(L) ?? [];
    const multi = levels.length > 1;
    const levelName = (id: string | undefined) => levels.find((l) => l.id === id)?.name ?? id ?? "";
    let shown = api?.position.level ?? levels[0]?.id ?? "";
    canvas.dataset.level = shown;
    const draw = () => {
      if (!api) return;
      try {
        const dest = game.link.destination();
        api.drawMap(canvas, { big: true, waypoint: dest ? { x: dest.x, z: dest.z, ...(dest.level ? { level: dest.level } : {}) } : null, locale: L, ...(multi ? { level: shown } : {}) });
      } catch (err) {
        console.error(err);
      }
    };
    const tabs = multi
      ? h(
          "div",
          { class: "map-levels", id: "map-levels", role: "tablist", "aria-label": tr("map.levels") },
          levels.map((l) =>
            h(
              "button",
              {
                type: "button",
                role: "tab",
                class: ["map-level", l.id === shown ? "active" : ""],
                dataset: { level: l.id },
                "aria-selected": l.id === shown ? "true" : "false",
                title: tr("map.levelOf", { level: l.name }),
                onclick: () => showLevel(l.id),
              },
              l.name,
            ),
          ),
        )
      : null;
    const showLevel = (id: string) => {
      shown = id;
      canvas.dataset.level = id;
      canvas.setAttribute("aria-label", `${tr("map.title")} · ${levelName(id)}`);
      for (const b of tabs?.querySelectorAll<HTMLButtonElement>("button[data-level]") ?? []) {
        const on = b.dataset.level === id;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      }
      draw();
    };
    if (multi) canvas.setAttribute("aria-label", `${tr("map.title")} · ${levelName(shown)}`);
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last > 250) {
        last = now;
        draw();
      }
    };
    raf = requestAnimationFrame(loop);

    const near = (x: number, z: number) => {
      const p = app.playerPos();
      return Math.hypot(p.x - x, p.z - z);
    };

    /* case destinations */
    const caseDests: Dest[] = [];
    if (game.slotId) {
      const loc: { x: number; z: number; level?: string } | null =
        api?.locate(game.slotId) ??
        (() => {
          const s = f.patientSlots.find((x) => x.id === game.slotId);
          return s ? { x: s.x, z: s.z } : null;
        })();
      if (loc) caseDests.push({ id: "patient", label: `${tr("role.patient")} · ${ct(c.patient.displayName)}`, hint: tr("map.dest.patient"), x: loc.x, z: loc.z, ...(loc.level ? { level: loc.level } : {}) });
    }
    const byKind = (kind: string): Dest | null => {
      const list = f.placements.filter((p) => st.kindOf(p) === kind).sort((a, b) => near(a.x, a.z) - near(b.x, b.z));
      const p = list[0];
      return p ? { id: p.id, label: st.label(p, L), hint: tr(`map.dest.${kind === "board" ? "board" : kind === "atlas" ? "atlas" : "craft"}` as "map.dest.board"), x: p.x, z: p.z, level: st.levelOf(p) } : null;
    };
    for (const kind of ["board", "atlas", "craft"]) {
      const d = byKind(kind);
      if (d) caseDests.push(d);
    }

    /* stations this case uses */
    const stationDests: Dest[] = [];
    const seen = new Set<string>();
    const needs = new Map<string, Set<string>>();
    for (const inv of c.investigations) {
      for (const p of st.providersOf(inv.requires)) {
        if (!needs.has(p.id)) needs.set(p.id, new Set());
        needs.get(p.id)!.add(ct(inv.name));
      }
    }
    const placements = f.placements.filter((p) => needs.has(p.id)).sort((a, b) => near(a.x, a.z) - near(b.x, b.z));
    for (const p of placements) {
      const label = st.label(p, L);
      const room = p.room ? f.rooms.find((r) => r.id === p.room) : undefined;
      const key = `${label}|${room?.id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const names = [...needs.get(p.id)!];
      stationDests.push({
        id: p.id,
        label: room ? `${t(room.name, L)} · ${label}` : label,
        hint: names.slice(0, 3).join(" · ") + (names.length > 3 ? " …" : "") || capList(st.caps(p.id)),
        x: p.x,
        z: p.z,
        level: st.levelOf(p),
      });
      if (stationDests.length >= 12) break;
    }

    /* rooms */
    const roomDests: Dest[] = f.rooms
      .filter((r) => !SKIP_ROOM_KINDS.has(r.kind))
      .map((r) => ({ id: r.id, label: t(r.name, L), hint: trMaybe(`room.${r.kind}`, tr("map.dest.room")), x: r.rect.x, z: r.rect.z, ...(multi ? { level: roomLevel(f, r) } : {}) }));

    const row = (d: Dest): HTMLElement =>
      h(
        "div",
        { class: ["dest-row", current && (current.level ?? "") === (d.level ?? "") && Math.hypot(current.x - d.x, current.z - d.z) < 1.5 ? "current" : ""] },
        h(
          "button",
          {
            type: "button",
            class: "dest",
            dataset: { waypoint: d.id, ...(d.level ? { level: d.level } : {}) },
            onclick: () => {
              app.markDestination({ x: d.x, z: d.z, label: d.label, ...(d.level ? { level: d.level } : {}) });
              app.close();
              app.toast(tr("toast.markDest"), tr("toast.markDestBody", { place: d.label }));
            },
          },
          d.label,
          h("small", null, multi && d.level ? `${levelName(d.level)} · ${d.hint}` : d.hint),
        ),
        api ? h("button", { type: "button", class: "walk", title: tr("map.walk"), "aria-label": `${tr("map.walk")} · ${d.label}`, onclick: () => app.markDestination({ x: d.x, z: d.z, label: d.label, ...(d.level ? { level: d.level } : {}) }, true) }, "➜") : null,
      );

    const group = (title: string, list: Dest[], open: boolean) =>
      list.length ? h("details", { class: "dest-group", open }, h("summary", null, title, h("span", { class: "count" }, String(list.length))), list.map(row)) : null;

    return {
      id: "map",
      kicker: tr("map.kicker"),
      title: tr("map.title"),
      variant: "wide",
      body: h(
        "div",
        { class: "mapwrap" },
        h("div", { class: "map-canvas-wrap" }, tabs, api ? canvas : h("div", { class: "empty" }, tr("intro.failed"))),
        h(
          "div",
          { class: "map-legend" },
          h("h3", null, tr("map.choose")),
          h("p", { class: "small muted" }, tr("map.lead")),
          current ? h("p", { class: "current-dest" }, h("b", null, tr("map.current")), " ", current.label, " ", h("button", { type: "button", class: "link", onclick: () => (app.markDestination(null), app.close()) }, tr("map.clear"))) : null,
          group(tr("map.group.case"), caseDests, true),
          group(tr("map.group.stations"), stationDests, true),
          group(tr("map.group.rooms"), roomDests, false),
          f.buildZone ? h("p", { class: "small muted" }, tr("map.buildNote")) : null,
        ),
      ),
      dispose() {
        cancelAnimationFrame(raf);
      },
    };
  };
}
