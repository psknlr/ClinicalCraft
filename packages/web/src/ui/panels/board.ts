/**
 * Evidence board (V4 `Ja`): phase select (learner-switchable phases),
 * decisions with options / feedback / locked "need" text, multi-phase image
 * comparison (generalised V4 "治疗前后原图对照": any investigation with figures
 * read in ≥ 2 phases) and "finish" → debrief.
 */
import { availableDecisions, presentedOptions, resultFor, type CaseDefinition, type Decision, type LocalizedText, type SessionState } from "@clinicalcraft/core";
import type { App, Game } from "../../app/context.js";
import { ct, tr } from "../../i18n/index.js";
import { clear, h } from "../dom.js";
import type { PanelView } from "../panel.js";
import { figureTile, investigationName, phaseName } from "./common.js";

/** Investigations whose figures the learner has read in at least two phases. */
export function comparablePairs(c: CaseDefinition, s: SessionState): { investigationId: string; phases: { phase: string; figures: string[] }[] }[] {
  const out: { investigationId: string; phases: { phase: string; figures: string[] }[] }[] = [];
  for (const inv of c.investigations) {
    const phases = c.phases
      .map((p) => ({ phase: p.id, figures: resultFor(c, inv.id, p.id)?.figures ?? [] }))
      .filter((p) => p.figures.length > 0 && s.seen.includes(`${inv.id}@${p.phase}`));
    if (phases.length >= 2) out.push({ investigationId: inv.id, phases });
  }
  return out;
}

/** Whether the case has any figures in ≥ 2 phases at all. */
function caseHasComparisons(c: CaseDefinition): boolean {
  return c.investigations.some((inv) => c.phases.filter((p) => (resultFor(c, inv.id, p.id)?.figures.length ?? 0) > 0).length >= 2);
}

function feedbackFor(d: Decision, optionIds: string[]): string {
  return d.options
    .filter((o) => optionIds.includes(o.id))
    .map((o) => ct(o.feedback))
    .join(" ");
}

function decisionCard(app: App, game: Game, d: Decision, unlocked: boolean, decided: boolean): HTMLElement {
  const answers = game.session.store.answers.get(d.id) ?? [];
  const last = answers[answers.length - 1];
  const status = decided ? tr("board.done") : unlocked ? tr("board.ready") : tr("board.waiting");
  // A locked prompt can state results not yet obtained, or another decision's answer: only its number and need.
  const title = unlocked || decided ? ct(d.prompt) : tr("board.lockedTitle", { n: game.caseDef.decisions.findIndex((x) => x.id === d.id) + 1 });
  const card = h("article", { class: ["decision", decided ? "correct" : "", !unlocked ? "locked" : ""], dataset: { decision: d.id } }, h("div", { class: "eyebrow", style: "margin-bottom:9px" }, status), h("h3", null, title));
  if (!unlocked) {
    card.append(h("p", { class: "small muted" }, ct(d.need)));
    return card;
  }
  // Presentation order (seeded per case and decision): never the authored order, where the answer tends to come first.
  const options = presentedOptions(game.caseDef, d);
  if (d.kind === "multiple" && !decided) {
    const picked = new Set<string>();
    card.append(h("p", { class: "small muted" }, tr("board.multiple")));
    for (const o of options) {
      const cb = h("input", { type: "checkbox", value: o.id, onchange: (e: Event) => ((e.target as HTMLInputElement).checked ? picked.add(o.id) : picked.delete(o.id)) });
      card.append(h("label", { class: "decision-option check" }, cb, h("span", null, ct(o.text))));
    }
    card.append(
      h(
        "button",
        {
          type: "button",
          class: "primary",
          style: "margin-top:10px",
          onclick: () => {
            if (picked.size) app.act({ type: "answer", decisionId: d.id, optionIds: [...picked] });
          },
        },
        tr("board.submit"),
      ),
    );
  } else {
    for (const o of options) {
      const chosen = last?.optionIds.includes(o.id);
      card.append(
        h(
          "button",
          {
            type: "button",
            class: ["decision-option", decided && o.correct ? "right" : "", chosen && !last?.correct ? "wrong" : ""],
            disabled: decided,
            dataset: { option: o.id },
            onclick: () => app.act({ type: "answer", decisionId: d.id, optionIds: [o.id] }),
          },
          `${decided && o.correct ? "✓ " : ""}${ct(o.text)}`,
        ),
      );
    }
  }
  if (decided || last) {
    const text = decided ? feedbackFor(d, d.options.filter((o) => o.correct).map((o) => o.id)) : feedbackFor(d, last!.optionIds);
    if (text) card.append(h("div", { class: "feedback", role: "status" }, text));
  }
  if (answers.length) card.append(h("small", { class: "muted attempts" }, tr("board.attempts", { n: answers.length })));
  return card;
}

export function boardPanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const store = game.session.store;
    const state = () => store.snapshot?.state ?? game.session.session.state;
    const switchable = c.phases.filter((p) => p.learnerSwitchable);
    const phaseRow = h("div", { class: "row wrap" });
    const decisions = h("div", { id: "decisions" });
    const actions = h("div", { class: "row wrap" });

    const renderPhase = (): void => {
      clear(phaseRow);
      const s = state();
      const current = c.phases.find((p) => p.id === s.phase);
      if (switchable.length > 1 && current?.learnerSwitchable) {
        const sel = h(
          "select",
          {
            id: "phase",
            onchange: (e: Event) => {
              const phase = (e.target as HTMLSelectElement).value;
              app.act({ type: "set-phase", phase });
              const ext = (c.extensions?.v4 as { phaseSwitchToast?: Record<string, LocalizedText | undefined> } | undefined)?.phaseSwitchToast;
              app.toast(ext?.title ? ct(ext.title) : tr("board.phaseSwitched"), ext?.[phase] ? ct(ext[phase]) : tr("board.phaseSwitchedBody", { phase: phaseName(c, phase) }));
            },
          },
          switchable.map((p) => h("option", { value: p.id, selected: p.id === s.phase }, ct(p.label))),
        );
        phaseRow.append(h("label", { for: "phase" }, tr("board.phase")), sel, h("span", { class: "muted small" }, current?.description ? ct(current.description) : tr("board.phaseHint")));
      } else {
        phaseRow.append(h("span", { class: "phase-pill" }, `${tr("board.phase")}：${phaseName(c, s.phase)}`), h("span", { class: "muted small" }, tr("board.phaseAuto")));
      }
    };

    const render = (): void => {
      renderPhase();
      clear(decisions);
      const s = state();
      const list = availableDecisions(c, s);
      if (!list.length) decisions.append(h("div", { class: "empty" }, tr("board.noDecisions")));
      for (const { decision, unlocked, decided } of list) decisions.append(decisionCard(app, game, decision, unlocked, decided));
      clear(actions);
      if (caseHasComparisons(c)) actions.append(h("button", { type: "button", id: "compare", onclick: () => openCompare() }, tr("board.compare")));
      if (s.finished) actions.append(h("button", { type: "button", class: "primary", onclick: () => app.open("debrief") }, tr("board.viewDebrief")));
      else actions.append(h("button", { type: "button", id: "finish", class: "primary", onclick: () => finish() }, tr("board.finish")));
    };

    const openCompare = (): void => {
      if (!comparablePairs(c, state()).length) {
        app.toast(tr("board.compareNeed"), ct((c.extensions?.v4 as { compare?: { requires?: never } } | undefined)?.compare?.requires) || tr("board.compareNeedBody"), "warning");
        return;
      }
      app.open("compare");
    };

    const finish = (): void => {
      const snap = store.snapshot;
      if (!snap?.progress.complete) {
        const current = c.objectives[snap?.progress.currentIndex ?? 0];
        // Guidance, not the teaching hint (that one is the scored HUD hint).
        app.toast(tr("board.unfinished"), current ? ct(current.guidance) || ct(current.title) : "", "warning");
        return;
      }
      app.act({ type: "finish" });
      app.submit({ type: "assess" });
      app.open("debrief");
    };

    render();
    let last = store.version;
    return {
      id: "board",
      kicker: tr("board.kicker"),
      title: tr("board.title"),
      body: [phaseRow, h("p", null, tr("board.lead")), decisions, actions],
      update() {
        if (store.version === last) return;
        last = store.version;
        const scroll = decisions.parentElement?.scrollTop ?? 0;
        render();
        if (decisions.parentElement) decisions.parentElement.scrollTop = scroll;
      },
    };
  };
}

export function comparePanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const s = game.session.store.snapshot?.state ?? game.session.session.state;
    const pairs = comparablePairs(c, s);
    const notice = ct((c.extensions?.v4 as { compare?: { notice?: never } } | undefined)?.compare?.notice) || tr("compare.notice");
    return {
      id: "compare",
      kicker: tr("compare.kicker"),
      title: tr("compare.title"),
      variant: "wide",
      body: [
        h("p", { class: "notice" }, notice),
        pairs.length
          ? pairs.map((p) =>
              h(
                "section",
                { class: "compare-block" },
                h("h3", null, investigationName(c, p.investigationId)),
                h(
                  "div",
                  { class: "comparison", style: `grid-template-columns:repeat(${Math.min(p.phases.length, 3)},1fr)` },
                  p.phases.map((ph) => h("section", null, h("h4", null, phaseName(c, ph.phase)), ph.figures.map((f) => figureTile(c, f, (url) => app.open("image", { url, assetId: f }))))),
                ),
              ),
            )
          : h("div", { class: "empty" }, tr("board.compareNone")),
        h("button", { type: "button", id: "back-board", onclick: () => app.open("board") }, tr("compare.back")),
      ],
    };
  };
}
