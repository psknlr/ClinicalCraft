/**
 * Report viewer (V4 `xh`): meta (date / phase record), narrative text,
 * structured lab table with flags and reference ranges, notice, figures grid
 * (local-only originals with the "not installed" placeholder), source footer;
 * plus the V4 zoom/pan original-image viewer with download.
 */
import { isOrderReady, resultFor, type LabValue } from "@clinicalcraft/core";
import type { App } from "../../app/context.js";
import { ct, tr } from "../../i18n/index.js";
import { clear, h } from "../dom.js";
import type { PanelView } from "../panel.js";
import { figureTile, investigationName, minutesLeft, phaseName } from "./common.js";

export interface ReportBack {
  panel: "orders" | "device" | "journal" | "board";
  placementId?: string;
}

export interface ReportArgs {
  investigationId: string;
  phase: string;
  back?: ReportBack;
  justOrdered?: boolean;
}

function refRange(v: LabValue): string {
  if (v.refText) return v.refText;
  if (v.refLow !== undefined && v.refHigh !== undefined) return `${v.refLow}–${v.refHigh}`;
  if (v.refLow !== undefined) return `≥ ${v.refLow}`;
  if (v.refHigh !== undefined) return `≤ ${v.refHigh}`;
  return "";
}

function labTable(values: LabValue[]): HTMLElement {
  return h(
    "div",
    { class: "lab-wrap" },
    h(
      "table",
      { class: "lab-table" },
      h("thead", null, h("tr", null, h("th", null, tr("report.analyte")), h("th", null, tr("report.value")), h("th", null, tr("report.unit")), h("th", null, tr("report.ref")), h("th", null, tr("report.flag")))),
      h(
        "tbody",
        null,
        values.map((v) => {
          const flag = v.flag && v.flag !== "N" ? v.flag : "";
          return h(
            "tr",
            { class: flag ? `flag-${flag.toLowerCase()}` : "" },
            h("td", null, ct(v.analyte)),
            h("td", { class: "num" }, String(v.value)),
            h("td", null, v.unit),
            h("td", { class: "num" }, refRange(v)),
            h("td", { class: "flag" }, flag ? h("span", { class: `flag-badge f-${flag.toLowerCase()}` }, flag) : ""),
          );
        }),
      ),
    ),
  );
}

export function reportPanel(app: App, args: ReportArgs): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const store = game.session.store;
    const name = investigationName(c, args.investigationId);
    const key = `${args.investigationId}@${args.phase}`;
    const content = h("div", { class: "report" });
    let readRequested = false;
    let assumeReady = !!args.justOrdered && (c.clock.mode !== "simulated" || (c.investigations.find((i) => i.id === args.investigationId)?.turnaroundMinutes ?? 0) === 0);

    const back = (): HTMLElement | null => {
      const b = args.back;
      if (!b) return null;
      const label = b.panel === "journal" || b.panel === "board" ? tr("report.backJournal") : tr("report.back");
      return h(
        "button",
        {
          type: "button",
          id: "report-back",
          onclick: () => {
            if (b.panel === "orders" && b.placementId) app.open("orders", { placementId: b.placementId });
            else if (b.panel === "device" && b.placementId) app.open("device", { placementId: b.placementId });
            else if (b.panel === "board") app.open("board");
            else app.open("journal");
          },
        },
        label,
      );
    };

    const render = (): void => {
      clear(content);
      const s = store.snapshot?.state ?? game.session.session.state;
      const order = s.orders.find((o) => o.key === key);
      const result = resultFor(c, args.investigationId, args.phase);
      const ready = order ? isOrderReady(c, s, order) : assumeReady;
      if (order && !ready) assumeReady = false;
      // Read once it is ordered, ready and has a record (reading costs simulated time — never twice).
      if (!readRequested && order && ready && result && !s.seen.includes(key)) {
        readRequested = true;
        app.act({ type: "read", investigationId: args.investigationId, phase: args.phase });
      }
      const meta = h("div", { class: "report-meta" }, h("span", null, result?.date ? ct(result.date) : "—"), h("span", null, tr("report.phaseRecord", { phase: phaseName(c, args.phase) })));
      content.append(meta);
      const buttons = h("div", { class: "row wrap", style: "margin-top:20px" }, back(), h("button", { type: "button", id: "report-journal", onclick: () => app.open("journal") }, tr("report.all")));
      if (!result) {
        content.append(h("p", { class: "notice" }, tr("report.unavailable")), buttons);
        return;
      }
      if (!ready) {
        const left = order ? minutesLeft(c, s, order) : 0;
        content.append(h("div", { class: "pending-box" }, h("span", { class: "spinner", "aria-hidden": "true" }), left ? tr("report.pending", { min: left }) : tr("orders.pending", { name, min: "…" })), buttons);
        return;
      }
      if (result.critical) content.append(h("div", { class: "critical-banner" }, tr("report.critical")));
      content.append(h("p", { class: ["report-text", result.available ? "" : "unavailable"] }, ct(result.text)));
      if (!result.available) content.append(h("p", { class: "notice" }, tr("report.notAvailableText")));
      if (result.values.length) content.append(labTable(result.values));
      if (result.note) content.append(h("p", { class: "notice" }, ct(result.note)));
      const figs = result.figures;
      content.append(
        h(
          "div",
          { class: "report-images" },
          figs.length
            ? figs.map((id) => figureTile(c, id, (url) => app.open("image", { url, assetId: id, report: args })))
            : h("div", { class: "empty", style: "width:100%" }, tr("report.noFigures")),
        ),
      );
      content.append(h("div", { class: "report-foot" }, result.source ? tr("report.source", { source: ct(result.source) }) : tr("report.added")), buttons);
    };
    render();
    let last = store.version;
    return {
      id: "report",
      kicker: tr("report.kicker"),
      title: name,
      body: content,
      update() {
        if (store.version === last) return;
        last = store.version;
        const scroll = content.parentElement?.scrollTop ?? 0;
        render();
        if (content.parentElement) content.parentElement.scrollTop = scroll;
      },
    };
  };
}

export interface ImageArgs {
  url: string;
  assetId: string;
  report?: ReportArgs;
}

/** V4 original-image viewer: zoom (buttons + wheel), drag to pan, download. */
export function imagePanel(app: App, args: ImageArgs): () => PanelView {
  return () => {
    const game = app.game;
    const asset = game?.caseDef.assets.find((a) => a.id === args.assetId);
    const title = asset ? ct(asset.title) || asset.id : args.assetId;
    let zoom = 1;
    let drag: [number, number, number, number] | null = null;
    const value = h("span", { id: "zoom-value" }, "100%");
    const img = h("img", { id: "image-full", src: args.url, alt: title, draggable: "false" });
    const scroller = h("div", { id: "image-scroll" }, img);
    const set = (d: number) => {
      zoom = Math.max(0.5, Math.min(5, zoom + d));
      img.style.width = `${zoom * 100}%`;
      value.textContent = `${Math.round(zoom * 100)}%`;
    };
    scroller.addEventListener("wheel", (e) => {
      e.preventDefault();
      set(e.deltaY < 0 ? 0.1 : -0.1);
    });
    scroller.addEventListener("pointerdown", (e) => {
      drag = [e.clientX, e.clientY, scroller.scrollLeft, scroller.scrollTop];
      scroller.setPointerCapture(e.pointerId);
    });
    scroller.addEventListener("pointermove", (e) => {
      if (!drag) return;
      scroller.scrollLeft = drag[2] + drag[0] - e.clientX;
      scroller.scrollTop = drag[3] + drag[1] - e.clientY;
    });
    const end = () => (drag = null);
    scroller.addEventListener("pointerup", end);
    scroller.addEventListener("pointercancel", end);
    const file = asset?.path.split("/").pop() ?? `${args.assetId}.png`;
    const viewerNote = ct((game?.caseDef.extensions?.v4 as { imageViewerNote?: never } | undefined)?.imageViewerNote);
    return {
      id: "image",
      kicker: tr("image.kicker"),
      title: tr("image.title", { name: title }),
      variant: "wide",
      body: [
        h(
          "div",
          { class: "image-tools" },
          args.report ? h("button", { type: "button", id: "image-back", onclick: () => app.open("report", args.report) }, tr("image.back")) : null,
          h("button", { type: "button", id: "zoom-out", "aria-label": tr("image.zoomOut"), onclick: () => set(-0.25) }, "−"),
          value,
          h("button", { type: "button", id: "zoom-in", "aria-label": tr("image.zoomIn"), onclick: () => set(0.25) }, "＋"),
          h(
            "button",
            {
              type: "button",
              id: "zoom-reset",
              onclick: () => {
                zoom = 1;
                set(0);
                scroller.scrollTo(0, 0);
              },
            },
            tr("image.reset"),
          ),
          h("a", { class: "btn", download: file, href: args.url }, tr("image.download")),
        ),
        scroller,
        h("p", { class: "small muted" }, tr("image.note"), viewerNote ? ` ${viewerNote}` : ""),
      ],
    };
  };
}
