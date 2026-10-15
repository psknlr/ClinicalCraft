/**
 * Small pieces shared by several panels: capability labels, risk badges,
 * phase names, the V4 evidence grid, case figures with the "not installed"
 * placeholder.
 */
import { isOrderReady, resultFor, type CaseDefinition, type OrderRecord, type SessionState } from "@clinicalcraft/core";
import { assetExists, caseAssetUrl } from "../../app/assets.js";
import type { Game } from "../../app/context.js";
import { ct, joinList, tr, trMaybe } from "../../i18n/index.js";
import { h } from "../dom.js";

export function capLabel(cap: string): string {
  return trMaybe(`cap.${cap}`, cap);
}

export function capList(caps: readonly string[]): string {
  return joinList(caps.map(capLabel));
}

export function riskBadge(risk: string): HTMLElement {
  return h("span", { class: `risk risk-${risk}` }, trMaybe(`risk.${risk}`, risk));
}

export function phaseName(c: CaseDefinition, phaseId: string): string {
  const p = c.phases.find((x) => x.id === phaseId);
  return p ? ct(p.label) : phaseId;
}

/**
 * HUD status-bar label: V4's short "DIAGNOSIS / 诊断期" (case extension) in
 * zh-CN, else the phase label — upper-case in English, the Chinese label
 * alone in zh-CN (an "ENGLISH / 中文" pair of a long label ran under the hotbar).
 */
export function phaseBadge(c: CaseDefinition, phaseId: string, locale: string): string {
  const badges = (c.extensions?.v4 as { phaseBadges?: Record<string, string> } | undefined)?.phaseBadges;
  const v4 = badges?.[phaseId];
  if (v4 && locale === "zh-CN") return v4;
  const p = c.phases.find((x) => x.id === phaseId);
  if (!p) return phaseId.toUpperCase();
  const en = typeof p.label === "string" ? p.label : p.label.en ?? Object.values(p.label)[0] ?? phaseId;
  return locale === "zh-CN" ? ct(p.label) : en.toUpperCase();
}

export function investigationName(c: CaseDefinition, id: string): string {
  const inv = c.investigations.find((x) => x.id === id);
  return inv ? ct(inv.name) : id;
}

/** Minutes until an order is ready (0 = ready). */
export function minutesLeft(c: CaseDefinition, s: SessionState, order: OrderRecord): number {
  if (c.clock.mode !== "simulated" || isOrderReady(c, s, order)) return 0;
  return Math.max(1, Math.ceil(order.readyAt - s.clock));
}

/** V4 evidence grid of orders (newest first) with read/unread/pending state; `empty` replaces the default empty-state line. */
export function evidenceGrid(game: Game, filter: (o: OrderRecord) => boolean, onOpen: (o: OrderRecord) => void, empty?: string): HTMLElement {
  const c = game.caseDef;
  const s = game.session.store.snapshot?.state ?? game.session.session.state;
  const orders = s.orders.filter(filter).slice().reverse();
  if (!orders.length) return h("div", { class: "empty", id: "evidence-empty", style: "margin-top:22px" }, empty ?? tr("orders.none"));
  return h(
    "div",
    null,
    h("h3", { style: "margin-top:22px" }, tr("orders.acquired")),
    h(
      "div",
      { class: "evidence-grid" },
      orders.map((o) => {
        const r = resultFor(c, o.investigationId, o.phase);
        const figs = r?.available ? r.figures.length : 0;
        const left = minutesLeft(c, s, o);
        const read = s.seen.includes(o.key);
        const status = left > 0 ? tr("orders.waiting", { min: left }) : !r ? tr("orders.noRecord", { name: "" }).replace(/^ · /, "") : read ? tr("orders.read") : tr("orders.unread");
        return h(
          "button",
          { type: "button", class: ["evidence-card", left > 0 ? "pending" : "", read ? "read" : "unread", r?.critical ? "critical" : ""], dataset: { order: o.key }, onclick: () => onOpen(o) },
          h("span", { class: "file-icon", "aria-hidden": "true" }, left > 0 ? "◷" : figs ? "▧" : "≡"),
          h(
            "span",
            null,
            h("b", null, investigationName(c, o.investigationId)),
            h("small", null, [phaseName(c, o.phase), figs ? tr("orders.figures", { n: figs }) : tr("orders.textOnly"), status].filter(Boolean).join(" · ")),
          ),
        );
      }),
    ),
  );
}

/** A case figure tile (V4 image-tile) that turns into a placeholder when the local asset is missing. */
export function figureTile(c: CaseDefinition, assetId: string, onZoom: (url: string) => void): HTMLElement {
  const { asset, url } = caseAssetUrl(c, assetId);
  const title = asset ? ct(asset.title) || asset.id : assetId;
  const tile = h("button", { type: "button", class: "image-tile", dataset: { figure: assetId } });
  const missing = () => {
    tile.replaceChildren(h("div", { class: "figure-missing" }, h("b", null, tr("report.figureMissing")), h("small", null, tr("report.figureMissingHint"))), h("span", null, title));
    tile.disabled = true;
    tile.classList.add("missing");
  };
  if (!url) {
    missing();
    return tile;
  }
  const img = h("img", { src: url, alt: title, loading: "lazy" });
  img.addEventListener("error", missing);
  tile.append(img, h("span", null, tr("report.zoom", { name: title })));
  tile.addEventListener("click", () => onZoom(url));
  void assetExists(url).then((ok) => {
    if (!ok) missing();
  });
  return tile;
}
