/**
 * The care team's panel (docs/TEAM.md): what the team said (each message with whom it was to, its kind and its
 * check-back), its tasks (who carries them, how far they got, and whether the result was seen to be done), and the
 * count's record. The controls are `team` ops — the same ones a headless run uses: the team's pace (auto: it moves on
 * its own; step: only on "Next step"), who answers as the surgeon (the learner, or a simulated surgeon to watch), and
 * the learner's own answers as the surgeon (a read-back, "wound checked", "understood"). Searching is the learner's
 * own world action (`search`, within reach or of the wound) — the world decides what is found.
 *
 * The operative site (docs/TEAM.md §4.5): its status, the discrepancy as it was raised and who holds the step; and,
 * for the learner as the surgeon, their own checks — a look at the mark, a document read, the patient asked, the site
 * marked, a discrepancy raised, the pause and its release — each a `team` op (`site`) done with their own body where
 * it stands; what the record answered is shown under the buttons.
 */
import { openDiscrepancy, siteStatus, t } from "@clinicalcraft/core";
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
    const name = (id: string): string => {
      if (id === PRIMARY_ACTOR) return tr("team.surgeon");
      const e = world()?.entity(id);
      return e ? (typeof e.name === "string" ? e.name : (e.name[getLocale()] ?? e.name.en ?? id)) : id;
    };
    const op = (o: Record<string, unknown>) => void session.run({ type: "team", ...o } as never);
    const search = (targetId?: string) => game.embodied?.worldAction({ operation: "search", ...(targetId ? { targetId } : {}) });
    const body = h("div", { class: "team-panel", id: "team-panel" });
    /** What the record answered to the learner's last site step. */
    let siteAnswer: { ok: boolean; output: string } | null = null;
    const siteOp = (o: Record<string, unknown>) =>
      void session.run({ type: "team", action: "site", ...o } as never).then((events) => {
        const own = events.flatMap((e) => (e.msg.type === "team_event" && e.msg.event.kind === "site" ? [e.msg.event] : []))[0];
        if (own) siteAnswer = { ok: own.ok, output: own.output };
        render();
      });

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
        h("span", { class: "muted" }, tr("team.surgeon")),
        h("button", { type: "button", id: "team-learner", "aria-pressed": String(cp.surgeon === "learner"), title: tr("team.learnerTitle"), onclick: () => op({ action: "surgeon", surgeon: "learner" }) }, tr("team.learner")),
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
          m.about.site?.verify ? h("button", { type: "button", class: "team-site-verified", onclick: () => reply("report", tr("team.site.verified")) }, tr("team.site.verified")) : null,
        );
      if (m.kind === "escalate") return h("button", { type: "button", class: "team-understood", onclick: () => reply("report", tr("team.understood")) }, tr("team.understood"));
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

    /** The operative site: where its verification stands, and the learner's own checks (learner mode). */
    const site = (cp: TeamCheckpoint): Child => {
      const def = game.caseDef.team?.site;
      const record = session.state.site;
      if (!def || !record) return null;
      const L = getLocale();
      const me = game.caseDef.team?.members.some((m) => m.staff === "surgeon") ? "surgeon" : "learner";
      const who = (staff: string) => (staff === "surgeon" || staff === "learner" ? tr("team.surgeon") : name(`staff:${staff}`));
      const side = (id: string | null | undefined) => (id == null ? tr("team.site.notMarked") : def.sides[id] ? t(def.sides[id]!, L) : id);
      const source = (id: string) => (id === "mark" ? tr("team.site.mark") : t(def.evidence.find((e) => e.id === id)?.name ?? id, L));
      const stepName = def.holdsName ? t(def.holdsName, L) : t(game.caseDef.interventions.find((i) => i.id === def.holds)?.name ?? def.holds, L);
      const status = siteStatus(record);
      const open = openDiscrepancy(record);
      const hold = (session.state.holds ?? []).find((x) => x.interventionId === def.holds && !x.released);
      const lines: Child[] = [
        h(
          "p",
          { class: "team-site-status", id: "team-site-status", dataset: { status } },
          h("strong", null, tr(`team.site.status.${status}`)),
          open ? ` — ${tr("team.site.between", { a: source(open.sources[0]), va: side(open.values?.[0]), b: source(open.sources[1]), vb: side(open.values?.[1]), who: who(open.staff) })}` : null,
          hold ? ` · ${tr("team.site.onHold", { step: stepName, who: who(hold.placedBy) })}` : null,
        ),
      ];
      if (cp.surgeon === "learner") {
        // what the learner has looked at with their own eyes (the latest of each)
        const seen = new Map<string, string | null>();
        for (const e of record.entries) if (e.op === "read" && e.staff === me) seen.set(e.source, e.value ?? null);
        const settled = status === "confirmed" || status === "corrected";
        const button = (id: string, label: string, o: Record<string, unknown>) => h("button", { type: "button", class: "team-site-step", dataset: { step: id }, onclick: () => siteOp(o) }, label);
        const look = [
          button("read-mark", tr("team.site.look.mark"), { step: "read", source: "mark" }),
          ...def.evidence.map((e) => button(`read-${e.id}`, tr(`team.site.look.${e.kind}`, { name: t(e.name, L) }), { step: "read", source: e.id })),
        ];
        // a confirmed site is not marked again (the record refuses it): the buttons go with it
        const mark = settled ? [] : Object.keys(def.sides).map((id) => button(`mark-${id}`, tr("team.site.markOn", { side: side(id) }), { step: "mark", side: id }));
        const differing = [...seen].filter(([id, value]) => id !== "mark" && seen.has("mark") && value !== seen.get("mark"));
        const act: Child[] = [];
        if (!open) for (const [id] of differing) act.push(button(`raise-${id}`, tr("team.site.raise", { a: source("mark"), b: source(id) }), { step: "raise", sources: ["mark", id] }));
        if (open && !hold) act.push(button("pause", tr("team.site.pause", { step: stepName }), { step: "pause" }));
        if (hold?.placedBy === me) act.push(button("resume", tr("team.site.resume"), { step: "resume" }));
        if (open) {
          for (const e of def.evidence.filter((x) => x.kind === "document" && !x.primary)) for (const id of Object.keys(def.sides)) act.push(button(`amend-${e.id}-${id}`, tr("team.site.amend", { name: t(e.name, L), side: side(id) }), { step: "amend", source: e.id, side: id }));
          act.push(button("escalate", tr("team.site.escalate"), { step: "escalate" }));
        }
        if (status === "unchecked" || status === "discrepancy" || status === "unresolved") act.push(button("confirm", tr("team.site.confirm"), { step: "confirm" }));
        lines.push(
          h("h4", null, tr("team.site.yours")),
          h("div", { class: "team-row team-site-look" }, ...look),
          mark.length ? h("div", { class: "team-row team-site-mark" }, ...mark) : null,
          act.length ? h("div", { class: "team-row team-site-act" }, ...act) : null,
          seen.size ? h("p", { class: "team-site-seen", id: "team-site-seen" }, `${tr("team.site.seen")}: ${[...seen].map(([id, value]) => `${source(id)} — ${side(value)}`).join("; ")}`) : h("p", { class: "muted" }, tr("team.site.nothingSeen")),
          siteAnswer ? h("p", { class: ["team-site-answer", siteAnswer.ok ? "ok" : "refused"], id: "team-site-answer", role: "status" }, siteAnswer.output) : null,
        );
      }
      return h("section", { class: "team-site", id: "team-site" }, h("h3", null, tr("team.site")), ...lines);
    };

    /** What the panel last drew (its body is rebuilt only when this changes: a button under the pointer stays put). */
    let drawn = "";
    const render = () => {
      const cp = session.team();
      const st = session.state;
      const key = JSON.stringify([
        getLocale(),
        !!game.caseDef.team,
        cp ? [cp.autonomy, cp.surgeon, cp.state.round, cp.state.seq, cp.state.completed.length, cp.state.count ?? null, cp.state.messages.map((m) => `${m.id}${m.read ? "r" : ""}${m.readBack ? "b" : ""}${m.verified ? "v" : ""}`), cp.state.tasks.map((x) => `${x.id}:${x.status}:${x.verified ? 1 : 0}`)] : null,
        st.phase,
        st.site ? [st.site.mark, st.site.entries.length] : null,
        (st.holds ?? []).map((x) => `${x.interventionId}:${x.placedBy}:${x.released ? 1 : 0}`),
        siteAnswer,
        world()?.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id ?? null,
      ]);
      if (key === drawn) return;
      drawn = key;
      if (!game.caseDef.team) return mount(body, h("p", null, tr("team.none")));
      if (!cp) return mount(body, h("p", null, tr("team.notStarted")));
      mount(body, controls(cp), site(cp), count(cp), messages(cp), tasks(cp));
    };
    render();
    return { id: "team", kicker: tr("team.kicker"), title: tr("team.title"), body, variant: "wide", update: render };
  };
}
