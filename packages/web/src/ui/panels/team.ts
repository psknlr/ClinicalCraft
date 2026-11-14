/**
 * The care team's panel (docs/TEAM.md): what the team said (each message with whom it was to, its kind and its
 * check-back), its tasks (who carries them, how far they got, and whether the result was seen to be done), and the
 * count's record. The controls are `team` ops — the same ones a headless run uses: the team's pace (auto: it moves on
 * its own; step: only on "Next step"), who answers as the surgeon (the learner, or a simulated surgeon to watch), and
 * the learner's own answers as the surgeon (a read-back, "wound checked", "understood"). Searching is the learner's
 * own world action (`search`, within reach or of the wound) — the world decides what is found.
 */
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import type { TeamCheckpoint, TeamMessage, TeamTask } from "@clinicalcraft/agent";
import type { App } from "../../app/context.js";
import { getLocale, tr, trMaybe } from "../../i18n/index.js";
import { h, mount, type Child } from "../dom.js";
import type { PanelView } from "../panel.js";

/** Messages shown (the latest). */
const SHOWN = 14;

const text = (m: TeamMessage) => (getLocale().startsWith("zh") ? m.text["zh-CN"] : m.text.en);

export function teamPanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const session = game.session.session;
    const world = () => game.session.world();
    // what the team calls the learner: the case team's name for them ("the doctor" in an ED team), else the surgeon
    const lead = game.caseDef.team?.members.find((m) => m.staff === "surgeon")?.name;
    const leadName = lead ? (typeof lead === "string" ? lead : (lead[getLocale()] ?? lead.en ?? "")) : "";
    // an operating team (instruments, a count) is a 手术团队; any other a 医护团队 (docs/GLOSSARY.md)
    const theatre = !!game.caseDef.team?.members.some((m) => m.duties.includes("instruments") || m.duties.includes("count")) || !!game.caseDef.team?.count;
    const name = (id: string): string => {
      if (id === PRIMARY_ACTOR) return leadName || tr("team.surgeon");
      const e = world()?.entity(id);
      return e ? (typeof e.name === "string" ? e.name : (e.name[getLocale()] ?? e.name.en ?? id)) : id;
    };
    const op = (o: Record<string, unknown>) => void session.run({ type: "team", ...o } as never);
    const search = (targetId?: string) => game.embodied?.worldAction({ operation: "search", ...(targetId ? { targetId } : {}) });
    const body = h("div", { class: "team-panel", id: "team-panel" });

    const controls = (cp: TeamCheckpoint): HTMLElement => {
      const pace = h(
        "div",
        { class: "team-row", role: "group", "aria-label": tr("team.autonomy") },
        h("span", { class: "muted" }, tr("team.autonomy")),
        h("button", { type: "button", id: "team-auto", "aria-pressed": String(cp.autonomy === "auto"), title: tr("team.autoTitle"), onclick: () => op({ action: "resume" }) }, tr("team.auto")),
        h("button", { type: "button", id: "team-step-mode", "aria-pressed": String(cp.autonomy === "step"), title: tr("team.stepTitle"), onclick: () => op({ action: "pause" }) }, tr("team.step")),
        h("button", { type: "button", id: "team-next", disabled: cp.autonomy !== "step", onclick: () => op({ action: "step" }) }, tr("team.next")),
        h("span", { class: "muted" }, tr("team.round", { n: cp.state.round })),
      );
      const who = h(
        "div",
        { class: "team-row", role: "group", "aria-label": tr("team.surgeon") },
        h("span", { class: "muted" }, leadName || tr("team.surgeon")),
        h("button", { type: "button", id: "team-learner", "aria-pressed": String(cp.surgeon === "learner"), title: tr("team.learnerTitle"), onclick: () => op({ action: "surgeon", surgeon: "learner" }) }, leadName ? tr("team.learnerAs", { name: leadName }) : tr("team.learner")),
        h("button", { type: "button", id: "team-observer", "aria-pressed": String(cp.surgeon === "simulated"), title: tr("team.observerTitle"), onclick: () => op({ action: "surgeon", surgeon: "simulated" }) }, tr("team.observer")),
      );
      const patient = world()?.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id;
      const hands = h(
        "div",
        { class: "team-row" },
        h("button", { type: "button", id: "team-search", onclick: () => search() }, tr("team.searchHere")),
        patient ? h("button", { type: "button", id: "team-search-wound", onclick: () => search(patient) }, tr("team.searchWound")) : null,
      );
      return h("div", { class: "team-controls" }, pace, who, hands);
    };

    /** The learner's answers, as the surgeon, to what was said to them. */
    const answers = (cp: TeamCheckpoint, m: TeamMessage): Child => {
      if (cp.surgeon !== "learner" || m.to !== PRIMARY_ACTOR) return null;
      const answered = cp.state.messages.some((x) => x.replyTo === m.id && x.from === PRIMARY_ACTOR);
      if (answered) return null;
      const reply = (kind: string, words?: string) => op({ action: "reply", message: m.id, kind, ...(words ? { text: words } : {}) });
      if (m.kind === "request")
        return h(
          "span",
          { class: "team-answers" },
          h("button", { type: "button", class: "team-readback", onclick: () => reply("readback") }, tr("team.readBack")),
          m.about.hold ? h("button", { type: "button", class: "team-wound", onclick: () => reply("report", tr("team.woundChecked")) }, tr("team.woundChecked")) : null,
        );
      if (m.kind === "escalate") return h("button", { type: "button", class: "team-understood", onclick: () => reply("report", tr("team.understood")) }, tr("team.understood"));
      // information told to the learner (docs/TEAM.md §4.5): read back, as said — only then is it recorded in the case
      if (m.kind === "report" && m.about.info) return h("button", { type: "button", class: "team-readback", onclick: () => reply("readback") }, tr("team.readBack"));
      return null;
    };

    const messages = (cp: TeamCheckpoint): HTMLElement => {
      const list = cp.state.messages.slice(-SHOWN);
      return h(
        "section",
        { class: "team-messages", "aria-live": "polite" },
        h("h3", null, tr("team.messages")),
        list.length
          ? h(
              "ol",
              null,
              ...list.map((m) =>
                h(
                  "li",
                  { class: ["team-msg", `kind-${m.kind}`, m.to === PRIMARY_ACTOR ? "to-you" : ""], dataset: { kind: m.kind, id: m.id } },
                  h("span", { class: "team-who" }, `${name(m.from)} → ${m.to === PRIMARY_ACTOR ? tr("team.toYou") : name(m.to)}`),
                  h("span", { class: "team-kind pill" }, trMaybe(`team.kind.${m.kind}`, m.kind)),
                  h("span", { class: "team-text" }, text(m)),
                  answers(cp, m),
                ),
              ),
            )
          : h("p", { class: "muted" }, tr("team.noMessages")),
      );
    };

    const task = (x: TeamTask): HTMLElement =>
      h(
        "li",
        { class: ["team-task", `status-${x.status}`], dataset: { kind: x.kind, status: x.status } },
        h("span", { class: "team-kind pill" }, trMaybe(`team.task.${x.kind}`, x.kind)),
        h("span", null, `${name(x.owner)} · ${trMaybe(`team.status.${x.status}`, x.status)}`),
        x.verified ? h("span", { class: "team-verified" }, `✓ ${tr("team.verified")}`) : null,
      );

    const tasks = (cp: TeamCheckpoint): HTMLElement =>
      h("section", { class: "team-tasks" }, h("h3", null, tr("team.tasks")), cp.state.tasks.length ? h("ul", null, ...cp.state.tasks.slice(-10).map(task)) : h("p", { class: "muted" }, tr("team.noTasks")));

    const count = (cp: TeamCheckpoint): Child => {
      const ledger = cp.state.count;
      const def = game.caseDef.team?.count;
      if (!ledger || !def || ledger.dueRound === undefined) return null;
      const label = def.name ? (typeof def.name === "string" ? def.name : (def.name[getLocale()] ?? def.name.en ?? def.item)) : def.item;
      const state = ledger.outcome ? tr(`team.count.${ledger.outcome}`) : ledger.holds ? tr("team.count.open") : "";
      return h("p", { class: "team-count", id: "team-count" }, `${tr("team.count", { name: label, of: ledger.baseline })} — ${state}`, ledger.closedOnHold ? h("strong", null, ` · ${tr("team.count.closedOnHold")}`) : null);
    };

    const render = () => {
      const cp = session.team();
      if (!game.caseDef.team) return mount(body, h("p", null, tr("team.none")));
      if (!cp) return mount(body, h("p", null, tr("team.notStarted")));
      mount(body, controls(cp), count(cp), messages(cp), tasks(cp));
    };
    render();
    return { id: "team", kicker: tr(theatre ? "team.kicker" : "team.kickerCare"), title: tr(theatre ? "team.title" : "team.titleCare"), body, variant: "wide", update: render };
  };
}
