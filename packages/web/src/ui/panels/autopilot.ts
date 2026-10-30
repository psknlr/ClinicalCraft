/**
 * Autopilot control: start / stop the clinician agent with an optional goal,
 * and watch its tool calls, workup plan and narration (all derived from the
 * store's event log). Approvals still apply to every state change. In an
 * embodied session also the live episode trace — observation → navigation
 * → interaction → clinical action → verification per step, with failures
 * and hints (`ClinicalSession.trace()`). While external control is on
 * (PROTOCOL §13.6) it cannot be started: an external agent and the
 * autopilot would both drive the clinician.
 */
import type { App } from "../../app/context.js";
import { statusLabel } from "../../app/llm.js";
import { learnerText } from "../../app/spatial.js";
import { ct, tr } from "../../i18n/index.js";
import { append, clear, h } from "../dom.js";
import type { PanelView } from "../panel.js";
import { traceGroups, traceList } from "./trace.js";
import { callArgsLabel, nameLabel } from "./trace-labels.js";

export function autopilotPanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const store = game.session.store;
    const goal = h("input", { type: "text", id: "autopilot-goal", placeholder: tr("auto.goalPlaceholder"), "aria-label": tr("auto.goal"), maxlength: "300", autocomplete: "off" });
    goal.addEventListener("keydown", (e) => e.stopPropagation());
    const state = h("span", { class: "auto-state" });
    const controls = h("div", { class: "row wrap" });
    const calls = h("ol", { class: "tool-calls", id: "autopilot-calls" });
    const plan = h("div", { class: "plan" });
    const narration = h("div", { class: "narration" });
    const trace = h("div", { class: "trace-wrap" });
    let traceKey = "";
    const renderTrace = (): void => {
      if (!game.embodied) return;
      const spans = game.session.session.trace().spans;
      const key = `${spans.length}:${spans.at(-1)?.id ?? ""}`;
      if (key === traceKey) return;
      traceKey = key;
      const hintOf = (actionId: string) => {
        const label = store.worldResults.get(actionId)?.result.hint?.label;
        return label ? learnerText(label) : null;
      };
      clear(trace);
      // labels in the learner's language: case items by name (a locked decision by its number only), staff by name
      // (the world's registry)
      const world = game.session.world();
      const name = (id: string) => {
        const e = world?.entity(id);
        return e ? ct(e.name) : null;
      };
      trace.append(traceList(traceGroups(spans, hintOf, 10), { caseDef: game.caseDef, name, state: store.snapshot?.state ?? game.session.session.state }));
      const list = trace.firstElementChild as HTMLElement | null;
      if (list) list.scrollTop = list.scrollHeight;
    };

    const start = (watch: boolean) => {
      if (store.autopilotRunning || app.external.on) return;
      // embodied: the agent takes the body over from where the learner left it
      game.embodied?.syncPose();
      void game.session.autopilot(goal.value);
      if (watch) app.close();
      render();
    };

    const render = (): void => {
      const running = store.autopilotRunning;
      state.textContent = running ? tr("auto.running") : tr("auto.idle");
      state.className = `auto-state ${running ? "running" : ""}`;
      clear(controls);
      const external = app.external.on;
      if (running) controls.append(h("button", { type: "button", id: "autopilot-stop", class: "danger", onclick: () => game.session.interrupt() }, tr("auto.stop")));
      else
        append(controls, [
          h("button", { type: "button", id: "autopilot-start", class: "primary", disabled: external, onclick: () => start(false) }, tr("auto.start")),
          h("button", { type: "button", id: "autopilot-watch", disabled: external, onclick: () => start(true) }, tr("auto.startWatch")),
          external ? h("small", { class: "muted", id: "autopilot-external" }, tr("ext.autopilotOff")) : null,
        ]);
      const list = store.toolCalls.filter((c) => c.agent === "clinician");
      // A decision still locked is named by its number only, as the case board names it.
      const learnerState = store.snapshot?.state ?? game.session.session.state;
      clear(calls);
      if (!list.length) calls.append(h("li", { class: "empty" }, tr("auto.noCalls")));
      for (const c of list.slice(-60)) {
        calls.append(
          h(
            "li",
            { class: `call ${c.status}` },
            h("span", { class: "call-status", "aria-label": c.status === "ok" ? tr("auto.ok") : c.status === "failed" ? tr("auto.fail") : tr("auto.running") }, c.status === "ok" ? "✓" : c.status === "failed" ? "✕" : "…"),
            h("b", { class: "call-tool", title: c.tool, dataset: { tool: c.tool } }, nameLabel(c.tool)),
            h("small", null, callArgsLabel(c.args, game.caseDef, learnerState)),
            c.output ? h("p", { class: "call-output" }, c.output.length > 280 ? `${c.output.slice(0, 277)}…` : c.output) : null,
          ),
        );
      }
      calls.scrollTop = calls.scrollHeight;
      clear(plan);
      plan.append(h("h3", null, tr("auto.plan")));
      if (store.plan?.items.length) {
        if (store.plan.explanation) plan.append(h("p", { class: "small muted" }, store.plan.explanation));
        plan.append(h("ul", { class: "plan-list" }, store.plan.items.map((p) => h("li", { class: `plan-${p.status}` }, h("span", { class: "plan-status" }, tr(`journal.plan.${p.status}` as "journal.plan.pending")), h("span", null, p.text)))));
      } else plan.append(h("p", { class: "small muted" }, tr("journal.planEmpty")));
      // Clinician narration straight from the event log.
      const lines: string[] = [];
      for (const e of store.log) {
        if (e.kind === "event" && e.event.msg.type === "agent_message" && e.event.msg.agent === "clinician" && e.event.msg.text.trim()) lines.push(e.event.msg.text.trim());
      }
      clear(narration);
      if (lines.length) narration.append(h("h3", null, tr("auto.narration")), ...lines.slice(-4).map((l) => h("p", { class: "small" }, l.length > 600 ? `${l.slice(0, 597)}…` : l)));
      renderTrace();
    };
    render();
    const label = statusLabel(app.choice());
    let last = store.version;
    let lastExternal = app.external.on;
    return {
      id: "autopilot",
      kicker: tr("auto.kicker"),
      title: tr("auto.title"),
      variant: "wide",
      body: [
        h("p", null, tr("auto.lead")),
        h("p", { class: "small muted" }, store.offline ? tr("auto.offline") : tr("auto.online", { provider: label.provider, model: store.config?.model || label.model }), " · ", state),
        h("div", { class: "exam-search" }, goal),
        controls,
        h("div", { class: "auto-grid" }, h("section", null, h("h3", null, tr("auto.calls")), calls), h("section", null, plan, narration)),
        game.embodied ? h("section", { class: "auto-trace" }, h("h3", null, tr("auto.trace")), h("p", { class: "small muted" }, tr("auto.traceLead")), trace) : null,
      ],
      focus: goal,
      update() {
        if (store.version === last && app.external.on === lastExternal) return;
        last = store.version;
        lastExternal = app.external.on;
        render();
      },
    };
  };
}
