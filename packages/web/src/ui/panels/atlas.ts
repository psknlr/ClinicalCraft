/**
 * Anatomy atlas panel (V4 `dx` atlas window): hosts `createAtlas` with the
 * locally installed `/local-assets/anatomy/anatomy.glb.gz` (+ catalog.json
 * next to it). When the model is not installed the stage still renders and
 * the status line explains `clinicalcraft import-v4`.
 */
import { createAtlas } from "../../atlas/index.js";
import { embeddedJson, localAssetUrl } from "../../app/assets.js";
import type { App } from "../../app/context.js";
import type { AtlasApi, AtlasOptions } from "../../contracts.js";
import { ct, tr } from "../../i18n/index.js";
import { h, prefersReducedMotion } from "../dom.js";
import type { PanelView } from "../panel.js";

export function atlasPanel(app: App): () => PanelView {
  return () => {
    const canvas = h("canvas", { id: "anatomy", "aria-label": tr("atlas.title") });
    const status = h("div", { id: "atlas-status", class: "atlas-status", role: "status" }, tr("atlas.loading"));
    const picked = h("div", { class: "atlas-picked", hidden: true });
    let atlas: AtlasApi | null = null;
    let disposed = false;
    const modes = ["cutaway", "muscles", "organs", "spleen"] as const;
    const focuses = ["overview", "heart", "lung", "liver", "spleen", "bone"] as const;
    const modeBtns = modes.map((m) =>
      h(
        "button",
        {
          type: "button",
          dataset: { mode: m },
          onclick: () => {
            atlas?.setMode(m);
            for (const b of modeBtns) b.classList.toggle("active", b.dataset.mode === m);
          },
        },
        tr(`atlas.${m}`),
      ),
    );
    const focusBtns = focuses
      .filter((f) => f !== "spleen")
      .map((f) => h("button", { type: "button", dataset: { focus: f }, onclick: () => atlas?.focus(f) }, f === "overview" ? tr("atlas.reset") : tr(`atlas.${f}` as "atlas.heart")));
    const rotate = h("button", { type: "button", id: "atlas-rotate", "aria-pressed": "false", onclick: () => rotate.setAttribute("aria-pressed", String(!!atlas?.rotate())) }, tr("atlas.rotate"));
    const spleenNote = ct((app.game?.caseDef.extensions?.v4 as { atlasSpleenNote?: never } | undefined)?.atlasSpleenNote);
    queueMicrotask(async () => {
      try {
        const a = await createAtlas({
          canvas,
          modelUrl: localAssetUrl("anatomy/anatomy.glb.gz"),
          // Served builds fetch catalog.json next to the model; the standalone build embeds it.
          catalog: embeddedJson<NonNullable<AtlasOptions["catalog"]>>("anatomy/catalog.json"),
          reducedMotion: () => !app.prefs.ui.bob || prefersReducedMotion(),
          onStatus: (text) => {
            status.textContent = text;
            status.hidden = !text;
          },
          onReady: () => {
            status.hidden = true;
          },
          onSelect: (info) => {
            picked.hidden = false;
            picked.textContent = `${tr("atlas.selectTitle")} · ${info.label}${info.kind === "spleen" && spleenNote ? ` — ${spleenNote}` : ""}`;
          },
        });
        if (disposed) a.dispose();
        else atlas = a;
      } catch (err) {
        console.error(err);
        status.textContent = tr("atlas.failed");
      }
    });
    return {
      id: "atlas",
      kicker: tr("atlas.kicker"),
      title: tr("atlas.title"),
      variant: "atlas",
      body: [
        h("div", { class: "atlas-top" }, modeBtns, h("span", { class: "sep" }), focusBtns, rotate),
        h("div", { class: "atlas-stage" }, canvas, status, picked),
        h("div", { class: "atlas-note" }, tr("atlas.note")),
      ],
      foot: tr("atlas.close"),
      dispose() {
        disposed = true;
        atlas?.dispose();
        atlas = null;
      },
    };
  };
}
