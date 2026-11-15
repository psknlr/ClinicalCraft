/**
 * The care team's panel (docs/TEAM.md): the learner's place and line-up when they hold one, what the stand-in surgeon
 * waits on them for, what the team said (each message with whom it was to, its kind and its check-back), what was done,
 * its tasks (who carries them, how far they got, and whether the result was seen to be done), and the count's record.
 * The controls are `team` ops — the same ones a headless run uses: the team's pace (auto: it moves on its own; step: only
 * on "Next step"), who plays the learner's part (the learner — as the surgeon, or in their place —, or the team, to
 * watch), the learner's answers to what is said to their member (a read-back, a confirmation, "Go on", a report), and
 * the Ask, Need and Count rows (a request about the operative field, something needed, the count — never typed: the
 * items are what the team in the room accounts for). Searching is the learner's own world action (`search`, within
 * reach or of the wound), offered as the world allows it (`searchRefusal`). What it shows is worked out in
 * `team-view.ts`; the session decides every op.
 */
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { observeField, procedureFor, t, type CaseDefinition, type FieldView, type SessionState } from "@clinicalcraft/core";
import type { AgentEvent, TeamCheckpoint, TeamMessage, TeamTask } from "@clinicalcraft/agent";
import type { App } from "../../app/context.js";
import { ct, getLocale, tr, trMaybe } from "../../i18n/index.js";
import { h, mount, type Child } from "../dom.js";
import type { PanelView } from "../panel.js";
import { DIRECTION_NAMES, FORCES, label } from "./surgery-controls.js";
import { answersFor, ASK_KINDS, askOp, askable, awaitedOf, countRow, learnerName, memberName, needItems, needOp, placeHeader, receiptText, taskLabel, taskShown, type AskChoice, type AskKind, type TeamAnswer, type TeamOp } from "./team-view.js";

/** Messages shown (the latest). */
const SHOWN = 14;
/** What was done (the latest receipts). */
const DONE_SHOWN = 8;

const text = (m: TeamMessage) => (getLocale().startsWith("zh") ? m.text["zh-CN"] : m.text.en);

export function teamPanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const session = game.session.session;
    const c: CaseDefinition = game.caseDef;
    const world = () => game.session.world();
    const state = (): SessionState => game.session.store.snapshot?.state ?? session.state;
    const worldName = (id: string): string | null => {
      const e = world()?.entity(id);
      return e ? (typeof e.name === "string" ? e.name : (e.name[getLocale()] ?? e.name.en ?? id)) : null;
    };
    const name = (id: string): string => memberName(id, state(), worldName);
    // the session's refusal or warning of the panel's last op, as it said it (an ask of someone away, a count said already)
    let note = "";
    const op = (o: TeamOp | Omit<TeamOp, "type">) =>
      void session.run({ ...o, type: "team" } as TeamOp).then((events: AgentEvent[]) => {
        const said = events.flatMap((e) => (e.msg.type === "error" || e.msg.type === "warning" ? [e.msg.message] : []));
        note = said.join(" ");
        render();
      });
    const search = (targetId?: string) => game.embodied?.worldAction({ operation: "search", ...(targetId ? { targetId } : {}) });
    const body = h("div", { class: "team-panel", id: "team-panel" });
    // the Ask and Need rows' choices, kept across renders
    const ask: { to: string; kind: AskKind; choice: AskChoice } = { to: "", kind: "traction", choice: {} };
    const need = { item: "", forMe: false };

    const answerButton = (a: TeamAnswer): HTMLElement =>
      a.id === "surgery"
        ? h("button", { type: "button", class: "team-do", dataset: { answer: a.id }, onclick: () => app.open("surgery") }, a.label)
        : h("button", { type: "button", class: `team-${a.id}`, dataset: { answer: a.id }, ...(a.title ? { title: a.title } : {}), onclick: () => op(a.op) }, a.label);

    const header = (): Child => {
      const place = placeHeader(c, state());
      if (!place) return null;
      return h(
        "div",
        { class: "team-place", id: "team-place", dataset: { seat: place.place } },
        h("strong", null, tr("team.you", { place: place.title })),
        place.lineup ? h("span", { class: "muted" }, ` · ${tr("team.lineup", { lineup: place.lineup })}`) : null,
      );
    };

    /** What the stand-in waits on the learner for: shown first, with its answers. */
    const awaited = (cp: TeamCheckpoint): Child => {
      const w = awaitedOf(cp);
      if (!w) return null;
      if (w.kind === "count") {
        const row = countRow(cp);
        return h("div", { class: "team-awaited", id: "team-awaited", role: "status" }, h("strong", null, tr("team.awaited")), h("span", null, tr("team.awaitedCount")), row ? h("button", { type: "button", class: "primary", onclick: () => op(row.op) }, tr("team.countSay")) : null);
      }
      const answers = answersFor(cp, w.message);
      return h(
        "div",
        { class: "team-awaited", id: "team-awaited", role: "status", dataset: { kind: w.message.kind, id: w.message.id } },
        h("strong", null, tr("team.awaited")),
        h("span", null, `${name(w.message.from)}: ${text(w.message)}`),
        answers.length ? h("span", { class: "team-answers" }, answers.map(answerButton)) : null,
      );
    };

    const controls = (cp: TeamCheckpoint): HTMLElement => {
      const placed = !!state().seat;
      const pace = h(
        "div",
        { class: "team-row", role: "group", "aria-label": tr("team.autonomy") },
        h("span", { class: "muted" }, tr("team.autonomy")),
        h("button", { type: "button", id: "team-auto", "aria-pressed": String(cp.autonomy === "auto"), title: tr("team.autoTitle"), onclick: () => op({ action: "resume" }) }, tr("team.auto")),
        h("button", { type: "button", id: "team-step-mode", "aria-pressed": String(cp.autonomy === "step"), title: tr("team.stepTitle"), onclick: () => op({ action: "pause" }) }, tr("team.step")),
        h("button", { type: "button", id: "team-next", disabled: cp.autonomy !== "step", onclick: () => op({ action: "step" }) }, tr("team.next")),
        h("span", { class: "muted", id: "team-round" }, tr("team.round", { n: cp.state.round })),
      );
      // who plays the learner's part: as the surgeon, or in their place (the same ops, the same ids)
      const who = h(
        "div",
        { class: "team-row", role: "group", "aria-label": placed ? tr("team.place") : tr("team.surgeon") },
        h("span", { class: "muted" }, placed ? tr("team.place") : tr("team.surgeon")),
        h("button", { type: "button", id: "team-learner", "aria-pressed": String(cp.surgeon === "learner"), title: placed ? tr("team.playPlaceTitle") : tr("team.learnerTitle"), onclick: () => op({ action: "surgeon", surgeon: "learner" }) }, placed ? tr("team.playPlace") : tr("team.learner")),
        h("button", { type: "button", id: "team-observer", "aria-pressed": String(cp.surgeon === "simulated"), title: placed ? tr("team.observePlaceTitle") : tr("team.observerTitle"), onclick: () => op({ action: "surgeon", surgeon: "simulated" }) }, tr("team.observer")),
      );
      // the wound: offered as the world allows the learner's body (the wound rule during the operation), else its reason
      const patient = game.embodied?.patientId() ?? null;
      const woundRefused = patient ? (world()?.searchRefusal(PRIMARY_ACTOR, patient) ?? null) : null;
      const hands = h(
        "div",
        { class: "team-row" },
        h("button", { type: "button", id: "team-search", onclick: () => search() }, tr("team.searchHere")),
        patient ? h("button", { type: "button", id: "team-search-wound", disabled: !!woundRefused, title: woundRefused?.message ?? "", onclick: () => search(patient) }, tr("team.searchWound")) : null,
        woundRefused ? h("small", { class: "muted team-why", id: "team-wound-why" }, woundRefused.message) : null,
      );
      return h("div", { class: "team-controls" }, pace, who, hands, askRow(cp), needRow(cp), countLine(cp));
    };

    /** The field as the operator sees it (its ports, what can be grasped, its regions), or null before the operation. */
    const field = (): { v: FieldView; instruments: string[] } | null => {
      const s = state();
      const def = procedureFor(c, s);
      if (!def || !s.procedure) return null;
      return { v: observeField(def, s.procedure), instruments: def.instruments.map((i) => i.id) };
    };

    /** The Ask row: whom, what about the field, and its choices (from the field the operator sees). */
    const askRow = (cp: TeamCheckpoint): Child => {
      const whom = askable(cp, c, state());
      const f = field();
      if (!whom.length || !f || cp.surgeon !== "learner") return null;
      if (!whom.some((x) => x.to === ask.to)) ask.to = whom[0]!.to;
      const select = (id: string, aria: string, options: { value: string; label: string }[], value: string | undefined, set: (v: string) => void, empty?: string) =>
        h(
          "select",
          { id, "aria-label": aria, onchange: (e: Event) => (set((e.target as HTMLSelectElement).value), render()) },
          empty !== undefined ? h("option", { value: "", selected: !value }, empty) : null,
          options.map((o) => h("option", { value: o.value, selected: o.value === value }, o.label)),
        );
      const ch = ask.choice;
      const ports = f.v.ports.map((p) => ({ value: p.port, label: p.port }));
      const params: Child[] = [];
      if (ask.kind === "traction") {
        ch.port ??= f.v.ports.find((p) => p.instrument === "grasper")?.port ?? f.v.ports[0]?.port;
        ch.structure ??= f.v.organs[0]?.id;
        ch.direction ??= DIRECTION_NAMES[0];
        params.push(
          select("team-ask-port", tr("team.ask.port"), ports, ch.port, (v) => (ch.port = v)),
          select("team-ask-structure", tr("team.ask.structure"), f.v.organs.map((o) => ({ value: o.id, label: ct(o.name) })), ch.structure, (v) => (ch.structure = v)),
          select("team-ask-direction", tr("team.ask.direction"), DIRECTION_NAMES.map((d) => ({ value: d, label: label("dir", d) })), ch.direction, (v) => (ch.direction = v as AskChoice["direction"])),
          select("team-ask-force", tr("team.ask.force"), FORCES.map((x) => ({ value: x, label: label("force", x) })), ch.force ?? "firm", (v) => (ch.force = v as AskChoice["force"])),
        );
      } else if (ask.kind === "release" || ask.kind === "camera") {
        params.push(select("team-ask-port", tr("team.ask.port"), ports, ch.port, (v) => (ch.port = v || undefined), ask.kind === "release" ? tr("team.ask.anyPort") : ""));
      } else if (ask.kind === "aim") {
        ch.region ??= f.v.regions[0]?.id;
        params.push(select("team-ask-region", tr("team.ask.region"), f.v.regions.map((r) => ({ value: r.id, label: ct(r.name) })), ch.region, (v) => (ch.region = v)));
      } else if (ask.kind === "pass") {
        ch.instrument ??= f.instruments[0] as AskChoice["instrument"];
        params.push(select("team-ask-instrument", tr("team.ask.instrument"), f.instruments.map((i) => ({ value: i, label: label("instrument", i) })), ch.instrument, (v) => (ch.instrument = v as AskChoice["instrument"])));
      }
      const sent = askOp(ask.to, ask.kind, ch);
      return h(
        "div",
        { class: "team-row team-ask", id: "team-ask", role: "group", "aria-label": tr("team.ask"), title: tr("team.ask.title") },
        h("span", { class: "muted" }, tr("team.ask")),
        select("team-ask-to", tr("team.ask.to"), whom.map((x) => ({ value: x.to, label: name(x.body) })), ask.to, (v) => (ask.to = v)),
        select("team-ask-what", tr("team.ask.what"), ASK_KINDS.map((k) => ({ value: k, label: tr(`team.ask.op.${k}`) })), ask.kind, (v) => ((ask.kind = v as AskKind), (ask.choice = {}))),
        params,
        h("button", { type: "button", id: "team-ask-send", disabled: !sent, onclick: () => sent && op(sent) }, tr("team.ask.send")),
      );
    };

    /** The Need row: an item the team's scenarios know, for the surgeon or (holding a place) for the learner. */
    const needRow = (cp: TeamCheckpoint): Child => {
      const w = world();
      if (!w || cp.surgeon !== "learner") return null;
      const L = getLocale();
      const items = needItems(c, (item) => {
        const e = w.entities().find((x) => x.equipmentType?.id === item);
        return e?.equipmentType ? t(e.equipmentType.name, L) : null;
      });
      if (!items.length) return null;
      if (!items.some((x) => x.item === need.item)) need.item = items[0]!.item;
      const placed = !!state().seat;
      return h(
        "div",
        { class: "team-row team-need", id: "team-need", role: "group", "aria-label": tr("team.need"), title: tr("team.need.title") },
        h("span", { class: "muted" }, tr("team.need")),
        h("select", { id: "team-need-item", "aria-label": tr("team.need.item"), onchange: (e: Event) => (need.item = (e.target as HTMLSelectElement).value) }, items.map((x) => h("option", { value: x.item, selected: x.item === need.item }, x.name))),
        placed
          ? h(
              "select",
              { id: "team-need-for", "aria-label": tr("team.need.for"), onchange: (e: Event) => (need.forMe = (e.target as HTMLSelectElement).value === "me") },
              h("option", { value: "surgeon", selected: !need.forMe }, tr("team.need.forSurgeon")),
              h("option", { value: "me", selected: need.forMe }, tr("team.need.forMe")),
            )
          : null,
        h("button", { type: "button", id: "team-need-send", onclick: () => op(needOp(c, state(), need.item, placed && need.forMe)) }, tr("team.need.send")),
      );
    };

    /** The count, when it is the learner's to say (the scrub nurse's place): one button — never typed. */
    const countLine = (cp: TeamCheckpoint): Child => {
      const row = countRow(cp);
      if (!row || cp.surgeon !== "learner") return null;
      return h(
        "div",
        { class: "team-row", id: "team-count-row" },
        h("button", { type: "button", id: "team-count-say", class: row.due ? "primary" : "", title: tr("team.countSayTitle"), onclick: () => op(row.op) }, tr("team.countSay")),
        row.due ? h("span", { class: "pill" }, tr("team.countDue")) : null,
      );
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
              ...list.map((m) => {
                const answers = answersFor(cp, m);
                return h(
                  "li",
                  { class: ["team-msg", `kind-${m.kind}`, m.to === PRIMARY_ACTOR ? "to-you" : ""], dataset: { kind: m.kind, id: m.id } },
                  h("span", { class: "team-who" }, `${name(m.from)} → ${m.to === PRIMARY_ACTOR ? tr("team.toYou") : name(m.to)}`),
                  h("span", { class: "team-kind pill" }, trMaybe(`team.kind.${m.kind}`, m.kind)),
                  h("span", { class: "team-text" }, text(m)),
                  answers.length ? h("span", { class: "team-answers" }, answers.map(answerButton)) : null,
                );
              }),
            )
          : h("p", { class: "muted" }, tr("team.noMessages")),
      );
    };

    const done = (cp: TeamCheckpoint): Child => {
      const list = cp.state.receipts.slice(-DONE_SHOWN);
      if (!list.length) return null;
      return h(
        "section",
        { class: "team-done" },
        h("h3", null, tr("team.done")),
        h("ul", null, list.map((r) => h("li", { class: ["team-receipt", `outcome-${r.outcome}`], dataset: { operation: r.operation } }, `${name(r.actor)}: ${receiptText(r, cp.state.tasks)}`))),
      );
    };

    const task = (x: TeamTask): HTMLElement =>
      h(
        "li",
        { class: ["team-task", `status-${x.status}`], dataset: { kind: x.kind, status: x.status } },
        h("span", { class: "team-kind pill" }, taskLabel(x)),
        h("span", null, `${name(x.owner)} · ${trMaybe(`team.status.${x.status}`, x.status)}`),
        x.verified ? h("span", { class: "team-verified" }, `✓ ${tr("team.verified")}`) : null,
      );

    const tasks = (cp: TeamCheckpoint): HTMLElement => {
      // a member's own following of the work with the camera is no request: not listed
      const shown = cp.state.tasks.filter(taskShown).slice(-10);
      return h("section", { class: "team-tasks" }, h("h3", null, tr("team.tasks")), shown.length ? h("ul", null, ...shown.map(task)) : h("p", { class: "muted" }, tr("team.noTasks")));
    };

    const count = (cp: TeamCheckpoint): Child => {
      const ledger = cp.state.count;
      const def = c.team?.count;
      if (!ledger || !def || ledger.dueRound === undefined) return null;
      const item = def.name ? (typeof def.name === "string" ? def.name : (def.name[getLocale()] ?? def.name.en ?? def.item)) : def.item;
      const outcome = ledger.outcome ? tr(`team.count.${ledger.outcome}`) : ledger.holds ? tr("team.count.open") : "";
      return h("p", { class: "team-count", id: "team-count" }, `${tr("team.count", { name: item, of: ledger.baseline })} — ${outcome}`, ledger.closedOnHold ? h("strong", null, ` · ${tr("team.count.closedOnHold")}`) : null);
    };

    const noteLine = (): Child => (note ? h("p", { class: "notice team-note", id: "team-note", role: "status" }, tr("team.note", { text: note })) : null);

    let shownKey = "";
    /** What the panel shows depends on (the round is drawn in place: the team's clock never redraws the rows). */
    const keyOf = (cp: TeamCheckpoint | null): string => {
      const s = state();
      if (!cp) return `none:${s.seq}`;
      const st = cp.state;
      return JSON.stringify([cp.autonomy, cp.surgeon, s.seq, s.seat ?? "", st.messages.length, st.messages.at(-1)?.id ?? "", st.tasks.map((x) => `${x.id}:${x.status}:${x.request?.key ?? ""}`), st.receipts.length, st.count ?? null, note, getLocale()]);
    };
    const render = () => {
      const cp = session.team();
      shownKey = keyOf(cp);
      if (!c.team) return mount(body, h("p", null, tr("team.none")));
      if (!cp) return mount(body, header(), h("p", null, tr("team.notStarted")));
      mount(body, header(), awaited(cp), controls(cp), noteLine(), count(cp), messages(cp), done(cp), tasks(cp));
    };
    /** On a store change: redrawn only when what it shows changed, and never under a choice being made in one of its lists. */
    const update = () => {
      const cp = session.team();
      const round = body.querySelector<HTMLElement>("#team-round");
      if (round && cp) round.textContent = tr("team.round", { n: cp.state.round });
      if (keyOf(cp) === shownKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLSelectElement && body.contains(active)) return;
      render();
    };
    render();
    return { id: "team", kicker: tr("team.kicker"), title: tr("team.title"), body, variant: "wide", update };
  };
}

/** The learner's member, as named in the panel (re-exported for the HUD and the scrub bar). */
export { learnerName };
