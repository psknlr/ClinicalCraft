/**
 * Field journal (V4 `sr`): tasks, acquired evidence, workup plan
 * (`plan_updated`), notes, source & scope, source PDF (when installed) and
 * the learning-record export. Also the "Sources & scope" credits panel.
 */
import { assetContentType, assetExists, caseAssetUrl } from "../../app/assets.js";
import { progress } from "@clinicalcraft/core";
import type { App } from "../../app/context.js";
import { caseDisclaimer, ct, tr } from "../../i18n/index.js";
import { clear, h } from "../dom.js";
import type { PanelView } from "../panel.js";
import { evidenceGrid } from "./common.js";
import { debriefUnlocked } from "./debrief.js";
import { sourceMaterialUnlocked } from "../../app/source-access.js";

export function journalPanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const store = game.session.store;
    const tasks = h("div", { id: "task-list" });
    const evidence = h("div", { id: "journal-evidence" });
    const plan = h("div", { class: "plan" });
    const notes = h("div");
    // The authored debrief unlocks like the CLI's /debrief (finished, or every objective complete);
    // before that an assessment (e.g. /assess) only offers the formative "assessment so far" view.
    const debriefBtn = h("button", { type: "button", id: "journal-debrief", hidden: true, onclick: () => app.open("debrief") }, tr("journal.debrief"));
    const progressBtn = h("button", { type: "button", id: "journal-progress", hidden: true, onclick: () => app.open("debrief") }, tr("journal.progress"));
    const pdfAsset = c.assets.find((a) => a.kind === "pdf");
    const pdf = pdfAsset ? caseAssetUrl(c, pdfAsset.id) : null;
    const pdfBtn = h("button", { type: "button", id: "download-paper", disabled: true, title: tr("journal.pdfMissing") }, tr("journal.pdf"));
    let pdfReady = false;
    const updatePdf = (): void => {
      const unlocked = sourceMaterialUnlocked(c, store.snapshot?.state ?? game.session.session.state);
      pdfBtn.disabled = !pdfReady || !unlocked;
      pdfBtn.title = !unlocked ? tr("journal.pdfLocked") : pdfReady ? "" : tr("journal.pdfMissing");
    };
    if (pdf?.url) {
      // Opened in a same-origin tab: only a real PDF (never an SVG/HTML file with that name).
      void assetContentType(pdf.url).then((type) => {
        pdfReady = type === "application/pdf";
        updatePdf();
        if (pdfReady) pdfBtn.onclick = () => {
          if (sourceMaterialUnlocked(c, store.snapshot?.state ?? game.session.session.state)) window.open(pdf.url!, "_blank", "noopener");
        };
      });
    }

    const render = (): void => {
      const snap = store.snapshot;
      const s = snap?.state ?? game.session.session.state;
      updatePdf();
      const done = new Set(Object.keys(s.objectivesDone));
      clear(tasks);
      // The teaching hint is a scored action (HUD hint button): the journal shows it only for completed
      // objectives and for the current one after a recorded hint; otherwise the current objective's
      // guidance, and later objectives by title only.
      const currentIndex = snap?.progress.currentIndex ?? progress(c, s).currentIndex;
      c.objectives.forEach((o, i) => {
        const isDone = done.has(o.id);
        const isCurrent = !isDone && currentIndex === i;
        const detail = isDone || (isCurrent && store.hinted.has(o.id)) ? ct(o.hint) : isCurrent ? ct(o.guidance) || ct(o.short) : "";
        tasks.append(
          h(
            "div",
            { class: ["task-row", isDone ? "done" : "", isCurrent ? "current" : "", !isDone && !isCurrent ? "upcoming" : ""] },
            h("span", { class: "badge" }, isDone ? "✓" : String(i + 1)),
            h("div", null, h("b", null, ct(o.title)), detail ? h("small", null, detail) : null),
          ),
        );
      });
      clear(evidence);
      evidence.append(evidenceGrid(game, () => true, (o) => app.open("report", { investigationId: o.investigationId, phase: o.phase, back: { panel: "journal" } })));
      clear(plan);
      plan.append(h("h3", null, tr("journal.plan")));
      if (store.plan?.items.length) {
        if (store.plan.explanation) plan.append(h("p", { class: "small muted" }, store.plan.explanation));
        plan.append(
          h(
            "ul",
            { class: "plan-list" },
            store.plan.items.map((p) => h("li", { class: `plan-${p.status}` }, h("span", { class: "plan-status" }, tr(`journal.plan.${p.status}` as "journal.plan.pending")), h("span", null, p.text))),
          ),
        );
      } else plan.append(h("p", { class: "small muted" }, tr("journal.planEmpty")));
      const unlocked = debriefUnlocked(c, s);
      debriefBtn.hidden = !(unlocked && (store.assessment || s.finished));
      progressBtn.hidden = unlocked || !store.assessment;
      clear(notes);
      if (s.notes.length) {
        notes.append(h("h3", null, tr("journal.notes")), h("div", { class: "note-list" }, [...s.notes].reverse().map((n) => h("div", { class: "note-item" }, h("small", null, tr("notes.at", { min: Math.round(n.at) })), h("p", null, n.text)))));
      }
    };
    render();
    let last = store.version;
    return {
      id: "journal",
      kicker: tr("journal.kicker"),
      title: tr("journal.title"),
      body: [
        h("p", { class: "muted small" }, tr("journal.lead")),
        tasks,
        evidence,
        plan,
        notes,
        h(
          "div",
          { class: "row wrap", style: "margin-top:20px" },
          h("button", { type: "button", id: "source-btn", onclick: () => app.open("source") }, tr("journal.source")),
          pdfAsset ? pdfBtn : null,
          h("button", { type: "button", id: "export-session", onclick: () => app.exportRecord() }, tr("journal.export")),
          debriefBtn,
          progressBtn,
        ),
      ],
      update() {
        if (store.version === last) return;
        last = store.version;
        render();
      },
    };
  };
}

export function sourcePanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const p = c.provenance;
    const state = game.session.store.snapshot?.state ?? game.session.session.state;
    if (!sourceMaterialUnlocked(c, state)) {
      return {
        id: "source",
        kicker: tr("source.kicker"),
        title: tr("source.title"),
        body: [h("p", { class: "notice" }, tr("source.locked")), h("p", { id: "source-disclaimer" }, caseDisclaimer(c.disclaimer)), h("button", { type: "button", onclick: () => app.open("journal") }, tr("report.backJournal"))],
      };
    }
    const rows: [string, string][] = [];
    if (p.citation) rows.push([tr("source.citation"), p.citation]);
    if (p.doi) rows.push([tr("source.doi"), p.doi]);
    if (p.authors.length) rows.push([tr("source.authors"), p.authors.join("; ")]);
    if (p.license) rows.push([tr("source.license"), p.license]);
    const assets = h("ul", { class: "asset-list" });
    for (const a of c.assets) {
      const { url } = caseAssetUrl(c, a.id);
      const status = h("span", { class: "asset-status" }, "…");
      void assetExists(url).then((ok) => {
        status.textContent = ok ? tr("source.assetInstalled") : tr("source.assetMissing");
        status.className = `asset-status ${ok ? "ok" : "missing"}`;
      });
      assets.append(h("li", null, h("b", null, ct(a.title) || a.id), a.credit ? h("small", null, ` · ${ct(a.credit)}`) : null, a.license ? h("small", { class: "muted" }, ` · ${a.license}`) : null, " ", status));
    }
    return {
      id: "source",
      kicker: tr("source.kicker"),
      title: tr("source.title"),
      body: [
        rows.length ? h("dl", { class: "source-dl" }, rows.map(([k, v]) => [h("dt", null, k), h("dd", null, v)])) : null,
        p.kind === "synthetic" ? h("p", { class: "notice" }, tr("source.synthetic")) : null,
        p.notes ? h("p", null, h("b", null, tr("source.notes")), " ", ct(p.notes)) : null,
        h("p", { class: "notice", id: "source-disclaimer" }, h("b", null, tr("source.disclaimer")), " ", caseDisclaimer(c.disclaimer)),
        c.assets.length ? [h("h3", null, tr("source.assets")), assets] : null,
        h("p", null, tr("source.agents")),
        h("p", null, tr("source.engine")),
        h("p", null, tr("source.anatomy")),
        h("p", { class: "small muted" }, tr("source.scope")),
        h("div", { class: "row wrap" }, h("button", { type: "button", onclick: () => app.open("journal") }, tr("report.backJournal"))),
      ],
    };
  };
}
