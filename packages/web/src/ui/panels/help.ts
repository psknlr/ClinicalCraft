/**
 * Controls / help (V4 `yh`) with the V5 keys (T talk, V vitals, Enter chat)
 * and a short explanation of agents, grounding and approvals.
 */
import type { App } from "../../app/context.js";
import { tr } from "../../i18n/index.js";
import { h } from "../dom.js";
import type { PanelView } from "../panel.js";

export function helpPanel(app: App): () => PanelView {
  return () => ({
    id: "help",
    kicker: tr("help.kicker"),
    title: tr("help.title"),
    body: [
      h("p", null, tr("help.lead")),
      h("div", { class: "keylist", html: tr("help.keys.html") }),
      h("p", { class: "notice" }, tr("help.notice")),
      h("p", null, tr("help.tail")),
      h("h3", null, tr("help.agentsTitle")),
      h("ul", { class: "help-list" }, h("li", null, tr("help.agents.grounding")), h("li", null, tr("help.agents.offline")), h("li", null, tr("help.agents.approval")), h("li", null, tr("help.agents.autopilot"))),
      app.game ? null : h("div", { class: "row wrap" }, h("button", { type: "button", class: "primary", onclick: () => app.close() }, tr("pause.back"))),
    ],
  });
}
