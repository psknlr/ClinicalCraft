/**
 * Debrief: the V4 completion screen (done mark, metrics, conclusion, key
 * reasoning, evidence boundaries, unknowns, the case's learning outcomes,
 * teaching points, references, its clinical review status, notice) plus the `AssessmentReport`
 * visualised — objectives, history/exam coverage, investigation stewardship,
 * first-try decisions, safety events, the operation (cases with a `procedure`,
 * once the case is finished: `debrief-operation.ts`), the rubric (deterministic met/unmet,
 * examiner-judged items with evidence) and the examiner narrative. Scores are
 * formative only (DESIGN_PRINCIPLES §2.6).
 */
import { availableDecisions, progress, type AssessmentReport, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import type { App } from "../../app/context.js";
import type { AssessmentView } from "../../app/store.js";
import { ct, joinList, reviewLine, tr, trMaybe } from "../../i18n/index.js";
import { clear, h, mount } from "../dom.js";
import type { PanelView } from "../panel.js";
import { investigationName } from "./common.js";
import { operationSection } from "./debrief-operation.js";

function bar(done: number, total: number): HTMLElement {
  const pct = total ? Math.round((done / total) * 100) : 100;
  return h("div", { class: "meter", role: "meter", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(done) }, h("span", { style: `width:${pct}%` }));
}

function historyLabels(c: CaseDefinition, ids: string[]): string {
  return joinList(ids.map((id) => ct(c.history.find((x) => x.id === id)?.question) || id));
}

function examLabels(c: CaseDefinition, ids: string[]): string {
  return joinList(ids.map((id) => ct(c.exam.find((x) => x.id === id)?.maneuver) || id));
}

/**
 * Whether the authored debrief (diagnosis, key reasoning, teaching points,
 * rubric texts) may be shown — the CLI `/debrief` and MCP `get_debrief` rule:
 * the case is finished or every objective is complete.
 */
export function debriefUnlocked(c: CaseDefinition, s: SessionState): boolean {
  return s.finished || progress(c, s).complete;
}

/**
 * The formative assessment. Mid-case (`final` false) it leaves out what
 * would act as an answer key: the rubric item texts, the names of essential
 * tests not yet ordered (a count instead) and locked decisions' prompts.
 */
function assessmentSection(c: CaseDefinition, view: AssessmentView, offline: boolean, final: boolean, state: SessionState): HTMLElement {
  const r: AssessmentReport = view.report;
  const visibleDecision = new Set(final ? c.decisions.map((d) => d.id) : availableDecisions(c, state).filter((d) => d.unlocked || d.decided).map((d) => d.decision.id));
  const shownDecisions = r.decisions.filter((d) => visibleDecision.has(d.id));
  const hiddenDecisions = r.decisions.length - shownDecisions.length;
  const judged = new Map(view.judged.map((j) => [j.id, j]));
  const list = (items: string[]) => (items.length ? joinList(items) : tr("debrief.none"));
  const unread = r.investigations.unread.map((k) => {
    const [id, phase] = k.split("@");
    const p = c.phases.find((x) => x.id === phase);
    return `${investigationName(c, id)}${p ? `（${ct(p.label)}）` : ""}`;
  });
  return h(
    "section",
    { class: "assessment" },
    h("div", { class: "assess-head" }, h("h3", null, tr("debrief.assessment")), h("span", { class: "formative" }, tr("debrief.formative"))),
    h(
      "div",
      { class: "assess-grid" },
      h(
        "div",
        { class: "assess-card" },
        h("h4", null, tr("debrief.objectives")),
        h(
          "ul",
          { class: "check-list" },
          r.objectives.map((o) => h("li", { class: o.done ? "ok" : "no" }, h("span", { class: "mark" }, o.done ? "✓" : "·"), ct(c.objectives.find((x) => x.id === o.id)?.title) || o.id)),
        ),
      ),
      h(
        "div",
        { class: "assess-card" },
        h("h4", null, tr("debrief.history")),
        h("small", null, tr("debrief.coverage", { done: r.history.requiredAsked, total: r.history.required })),
        bar(r.history.requiredAsked, r.history.required),
        r.history.missingRequired.length ? h("p", { class: "small muted" }, tr("debrief.missing", { list: historyLabels(c, r.history.missingRequired) })) : null,
        h("h4", { style: "margin-top:14px" }, tr("debrief.exam")),
        h("small", null, tr("debrief.coverage", { done: r.exam.requiredPerformed, total: r.exam.required })),
        bar(r.exam.requiredPerformed, r.exam.required),
        r.exam.missingRequired.length ? h("p", { class: "small muted" }, tr("debrief.missing", { list: examLabels(c, r.exam.missingRequired) })) : null,
      ),
      h(
        "div",
        { class: "assess-card" },
        h("h4", null, tr("debrief.investigations")),
        h("p", { class: "small" }, tr("debrief.ordered", { n: r.investigations.ordered })),
        h(
          "dl",
          { class: "mini-dl" },
          h("dt", null, tr("debrief.essentialMissing")),
          h(
            "dd",
            { class: r.investigations.essentialMissing.length ? "bad" : "" },
            final || r.investigations.essentialMissing.length === 0
              ? list(r.investigations.essentialMissing.map((id) => investigationName(c, id)))
              : tr("debrief.essentialMissingCount", { n: r.investigations.essentialMissing.length }),
          ),
          h("dt", null, tr("debrief.lowValue")),
          h("dd", { class: r.investigations.lowValue.length ? "warn" : "" }, list(r.investigations.lowValue.map((id) => investigationName(c, id)))),
          h("dt", null, tr("debrief.harmful")),
          h("dd", { class: r.investigations.harmful.length ? "bad" : "" }, list(r.investigations.harmful.map((id) => investigationName(c, id)))),
          h("dt", null, tr("debrief.unread")),
          h("dd", { class: unread.length ? "warn" : "" }, list(unread)),
        ),
      ),
      h(
        "div",
        { class: "assess-card" },
        h("h4", null, tr("debrief.decisions")),
        h(
          "ul",
          { class: "check-list" },
          shownDecisions.map((d) =>
            h(
              "li",
              { class: d.firstTryCorrect ? "ok" : d.decided ? "partial" : "no" },
              h("span", { class: "mark" }, d.firstTryCorrect ? "✓" : d.decided ? "~" : "·"),
              h("span", null, ct(c.decisions.find((x) => x.id === d.id)?.prompt) || d.id),
              h("small", null, d.firstTryCorrect ? tr("debrief.firstTryYes") : d.decided ? tr("debrief.firstTryNo", { n: d.attempts }) : tr("debrief.undecided")),
            ),
          ),
          hiddenDecisions > 0 ? h("li", { class: "no" }, h("span", { class: "mark" }, "·"), tr("debrief.decisionsLocked", { n: hiddenDecisions })) : null,
        ),
        h("h4", { style: "margin-top:14px" }, tr("debrief.safety")),
        r.safety.contraindicated.length || r.safety.criticalAlarms
          ? h(
              "ul",
              { class: "check-list" },
              r.safety.contraindicated.map((s) => h("li", { class: "no" }, h("span", { class: "mark" }, "⚠"), tr("debrief.contra", { name: ct(c.interventions.find((x) => x.id === s.interventionId)?.name) || s.interventionId, min: Math.round(s.at) }))),
              r.safety.criticalAlarms ? h("li", { class: "partial" }, h("span", { class: "mark" }, "!"), tr("debrief.criticalAlarms", { n: r.safety.criticalAlarms })) : null,
            )
          : h("p", { class: "small muted" }, tr("debrief.noSafety")),
      ),
    ),
    operationSection(c, r, state.finished),
    r.rubric.length && final
      ? h(
          "div",
          { class: "rubric" },
          h("h4", null, tr("debrief.rubric")),
          h(
            "table",
            { class: "rubric-table" },
            h(
              "tbody",
              null,
              r.rubric.map((item) => {
                const def = c.rubric.find((x) => x.id === item.id);
                const j = judged.get(item.id);
                // `scored: false`: its precondition (`scoredWhen`) did not arise — it counts neither way
                const status =
                  item.scored === false
                    ? h("span", { class: "pill pending", title: tr("debrief.notScoredHint") }, tr("debrief.notScored"))
                    : item.met === true
                      ? h("span", { class: "pill ok" }, tr("debrief.met"))
                      : item.met === false
                        ? h("span", { class: "pill no" }, tr("debrief.unmet"))
                        : j
                          ? h("span", { class: `pill ${j.met ? "ok" : "no"} judged` }, j.met ? tr("debrief.judgedMet") : tr("debrief.judgedUnmet"))
                          : h("span", { class: "pill pending" }, tr("debrief.needsExaminer"));
                return h(
                  "tr",
                  { class: item.critical ? "critical" : undefined, dataset: { item: item.id } },
                  h("td", { class: "domain" }, trMaybe(`debrief.domain.${item.domain}`, item.domain)),
                  h("td", null, ct(def?.text) || item.id, item.critical ? h("span", { class: "pill critical" }, tr("debrief.critical")) : null, j?.evidence ? h("small", { class: "evidence" }, tr("debrief.evidence", { text: j.evidence })) : null),
                  h("td", { class: "num" }, `×${item.weight}`),
                  h("td", null, status),
                );
              }),
            ),
          ),
        )
      : null,
    view.narrative ? h("div", { class: "narrative" }, h("div", { class: "eyebrow" }, offline ? tr("debrief.narrativeOffline") : tr("debrief.narrative")), h("p", null, view.narrative)) : null,
  );
}

/**
 * "病例完成 · {title}" unless the case title already carries that prefix (V4 SMZL does); "病例结束 · {title}"
 * when the case ended (finished or timed out) before every objective was done — never "complete" then.
 */
function debriefTitle(title: string, ended: boolean): string {
  const prefix = tr("debrief.title", { title: "" }).replace(/[\s·:：-]+$/, "");
  const carries = !!prefix && title.toLowerCase().startsWith(prefix.toLowerCase());
  if (!ended) return carries ? title : tr("debrief.title", { title });
  return tr("debrief.endedTitle", { title: carries ? title.slice(prefix.length).replace(/^[\s·:：-]+/, "") : title });
}

/** The debrief's opening line: completed (✓), or ended with objectives open — by the time limit (⏱) or by finishing early. */
function leadBlock(c: CaseDefinition, s: SessionState): HTMLElement {
  const ended = !progress(c, s).complete;
  const timeUp = ended && c.clock.limitMinutes != null && s.clock >= c.clock.limitMinutes;
  const mark = !ended ? "✓" : timeUp ? "⏱" : "–";
  const lead = !ended ? "debrief.lead" : timeUp ? "debrief.endedLeadTime" : "debrief.endedLead";
  return h(
    "div",
    { style: "text-align:center", id: "debrief-lead", "data-ended": ended ? (timeUp ? "time" : "early") : "no" },
    h("div", { class: ended ? "done-mark ended" : "done-mark" }, mark),
    h("h3", null, tr(lead)),
    h("p", null, tr(ended ? "debrief.endedLeadSub" : "debrief.leadSub")),
  );
}

export function debriefPanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const store = game.session.store;
    if (!store.assessment && !store.assessing) app.submit({ type: "assess" });
    const content = h("div", { class: "debrief" });
    const opened = store.snapshot?.state ?? game.session.session.state;
    const openedUnlocked = debriefUnlocked(c, opened);
    // Unlocked by finishing (or the time limit) with objectives open: the case ended, it was not completed.
    const openedEnded = openedUnlocked && !progress(c, opened).complete;
    const render = (): void => {
      clear(content);
      const s = store.snapshot?.state ?? game.session.session.state;
      const report = store.assessment?.report ?? null;
      const decisions = c.decisions.length;
      const firstTry = report ? report.decisions.filter((d) => d.firstTryCorrect).length : 0;
      const d = c.debrief;
      // Mid-case (e.g. after /assess) only the formative assessment: the authored debrief is the answer.
      const unlocked = debriefUnlocked(c, s);
      // Learning outcomes usually name the diagnosis: listed with the unlocked debrief only (docs/GLOSSARY.md §4).
      const outcomes = c.learningOutcomes.map((x) => ct(x)).filter(Boolean);
      const review = reviewLine(c.provenance.review);
      const guidelines = c.provenance.review?.guidelines ?? [];
      // Critical items missed (`rubric[].critical`), prominently — once the debrief is unlocked (mid-case they would be an answer key).
      const critical = unlocked ? (report?.criticalMissed ?? []).map((id) => ct(c.rubric.find((x) => x.id === id)?.text) || id) : [];
      mount(
        content,
        unlocked ? leadBlock(c, s) : null,
        critical.length ? h("div", { class: "critical-missed", id: "debrief-critical", role: "alert" }, h("h4", null, `⚠ ${tr("debrief.criticalMissed")}`), h("ul", null, critical.map((x) => h("li", null, x)))) : null,
        !s.finished ? h("p", { class: "notice" }, tr("debrief.notFinished")) : null,
        !unlocked ? h("p", { class: "notice", id: "debrief-locked" }, tr("debrief.locked")) : null,
        h(
          "div",
          { class: "metric-grid" },
          h("div", null, h("b", null, String(s.seen.length)), h("small", null, tr("debrief.metric.seen"))),
          h("div", null, h("b", null, `${firstTry}/${decisions}`), h("small", null, tr("debrief.metric.firstTry"))),
          h("div", null, h("b", null, String(s.hints)), h("small", null, tr("debrief.metric.hints"))),
          // an operation's score mid-case would tell whether a hidden view or injury holds (docs/PROCEDURE.md §7)
          h("div", null, h("b", null, report ? (c.procedure && !unlocked ? "—" : `${report.score.percent}%`) : "…"), h("small", null, tr("debrief.metric.score"))),
        ),
        c.clock.mode === "simulated" ? h("p", { class: "small muted", style: "text-align:center" }, tr("debrief.minutes", { n: Math.round(s.clock) })) : null,
        unlocked
          ? [
              h("p", { id: "debrief-conclusion" }, h("b", null, tr("debrief.conclusion")), ct(d.conclusion)),
              d.keyReasoning.length ? h("p", null, h("b", null, tr("debrief.keyReasoning")), d.keyReasoning.map((x) => ct(x)).join(" ")) : null,
              d.boundaries ? h("p", null, h("b", null, tr("debrief.boundaries")), ct(d.boundaries)) : null,
              d.unknowns.length ? h("p", null, h("b", null, tr("debrief.unknowns")), joinList(d.unknowns.map((x) => ct(x)))) : null,
              outcomes.length ? [h("h4", null, tr("debrief.outcomes")), h("ol", { class: "teaching outcomes", id: "debrief-outcomes" }, outcomes.map((x) => h("li", null, x)))] : null,
              d.teachingPoints.length ? [h("h4", null, tr("debrief.teaching")), h("ul", { class: "teaching" }, d.teachingPoints.map((x) => h("li", null, ct(x))))] : null,
              d.references.length ? [h("h4", null, tr("debrief.references")), h("ul", { class: "refs small" }, d.references.map((x) => h("li", null, x)))] : null,
              review
                ? h(
                    "p",
                    { class: "small muted", id: "debrief-review" },
                    h("b", null, tr("debrief.review")),
                    review,
                    guidelines.length ? [h("br"), tr("review.guidelines", { list: guidelines.join("; ") })] : null,
                  )
                : null,
            ]
          : null,
        h("div", { class: "notice" }, ct(d.notice) || tr("debrief.notice")),
        store.assessment ? assessmentSection(c, store.assessment, store.offline, unlocked, s) : h("div", { class: "pending-box" }, h("span", { class: "spinner", "aria-hidden": "true" }), tr("debrief.assessing")),
        h(
          "div",
          { class: "row wrap", style: "margin-top:20px" },
          h("button", { type: "button", id: "export-learning", class: "primary", onclick: () => app.exportRecord() }, tr("debrief.export")),
          h("button", { type: "button", id: "continue-world", onclick: () => app.close() }, tr("debrief.continue")),
          h("button", { type: "button", onclick: () => void app.backToLibrary() }, tr("debrief.library")),
          h("button", { type: "button", disabled: store.assessing, onclick: () => app.submit({ type: "assess" }) }, tr("debrief.reassess")),
        ),
      );
    };
    render();
    let last = store.version;
    return {
      id: "debrief",
      kicker: openedUnlocked ? tr(openedEnded ? "debrief.endedKicker" : "debrief.kicker") : tr("debrief.progressKicker"),
      // The debrief title names the diagnosis: mid-case the panel is the progress view.
      title: openedUnlocked ? debriefTitle(ct(c.debrief.title), openedEnded) : tr("debrief.progressTitle"),
      variant: "wide",
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
