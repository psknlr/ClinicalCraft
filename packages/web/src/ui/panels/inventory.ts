/**
 * Inventory (V4 `Qd`) and the build-zone crafting bench (V4 `ef`): block
 * counts, build rules, touch mine/place buttons, the two V4 recipes.
 */
import type { App } from "../../app/context.js";
import { BLOCK_TYPES } from "../../app/persistence.js";
import { tr } from "../../i18n/index.js";
import { h } from "../dom.js";
import type { PanelView } from "../panel.js";

export function inventoryPanel(app: App): () => PanelView {
  return () => {
    const inv = app.inventory;
    const bench = app.game?.facility.placements.find((p) => app.game?.stations.kindOf(p) === "craft");
    return {
      id: "inventory",
      kicker: tr("inv.kicker"),
      title: tr("inv.title"),
      body: [
        h(
          "div",
          { class: "inventory-grid" },
          BLOCK_TYPES.map((type, i) =>
            h(
              "div",
              { class: "inventory-item", dataset: { block: type } },
              h("span", { class: `cube-icon ${type}-icon` }),
              h("b", null, tr(`hotbar.${type}`)),
              h("strong", null, String(inv[type])),
              h("small", null, tr("inv.hotkey", { n: i + 4 })),
            ),
          ),
        ),
        h("p", null, tr("inv.lead")),
        h("p", { class: "notice" }, tr("inv.notice")),
        h("h3", null, tr("inv.more")),
        h("p", { class: "small muted" }, tr("inv.moreBody")),
        h(
          "div",
          { class: "row wrap" },
          h(
            "button",
            {
              type: "button",
              id: "go-craft",
              onclick: () => {
                if (bench) app.markDestination({ x: bench.x, z: bench.z, label: app.game!.stations.label(bench, app.prefs.locale) });
                app.close();
                app.toast(tr("inv.craftWhere"), tr("inv.craftWhereBody"));
              },
            },
            tr("inv.goCraft"),
          ),
          h(
            "button",
            {
              type: "button",
              id: "touch-mine",
              onclick: () => {
                app.close();
                app.world.api?.build(false);
              },
            },
            tr("inv.mine"),
          ),
          h(
            "button",
            {
              type: "button",
              id: "touch-place",
              onclick: () => {
                app.close();
                app.world.api?.build(true);
              },
            },
            tr("inv.place"),
          ),
        ),
      ],
    };
  };
}

export function craftPanel(app: App): () => PanelView {
  const builder = (): PanelView => {
    const inv = app.inventory;
    const done = () => {
      app.inventoryChanged();
      app.sound("success");
      app.toast(tr("craft.done"), tr("craft.doneBody"), "success");
      app.open("craft");
    };
    return {
      id: "craft",
      kicker: tr("craft.kicker"),
      title: tr("craft.title"),
      body: [
        h("p", null, tr("craft.lead")),
        h(
          "div",
          { class: "recipe" },
          h("div", null, h("span", { class: "recipe-icons", "aria-hidden": "true" }, h("span", { class: "cube-icon stone-icon" }), "→", h("span", { class: "cube-icon glass-icon" })), h("b", null, tr("craft.glass")), h("small", null, tr("craft.glassAvail", { n: inv.stone }))),
          h(
            "button",
            {
              type: "button",
              id: "craft-glass",
              disabled: inv.stone < 4,
              onclick: () => {
                if (inv.stone < 4) return;
                inv.stone -= 4;
                inv.glass += 4;
                done();
              },
            },
            tr("craft.glassBtn"),
          ),
        ),
        h(
          "div",
          { class: "recipe" },
          h(
            "div",
            null,
            h("span", { class: "recipe-icons", "aria-hidden": "true" }, h("span", { class: "cube-icon wood-icon" }), "+", h("span", { class: "cube-icon stone-icon" }), "→", h("span", { class: "cube-icon lamp-icon" })),
            h("b", null, tr("craft.lamp")),
            h("small", null, tr("craft.lampAvail", { w: inv.wood, s: inv.stone })),
          ),
          h(
            "button",
            {
              type: "button",
              id: "craft-lamp",
              disabled: inv.wood < 2 || inv.stone < 2,
              onclick: () => {
                if (inv.wood < 2 || inv.stone < 2) return;
                inv.wood -= 2;
                inv.stone -= 2;
                inv.lamp += 4;
                done();
              },
            },
            tr("craft.lampBtn"),
          ),
        ),
        h("p", { class: "small muted" }, tr("craft.note")),
      ],
    };
  };
  return builder;
}
