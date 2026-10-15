/**
 * Field journal (V4 `sr`): tasks, acquired evidence, workup plan
 * (`plan_updated`), notes, source & scope, source PDF (when installed) and
 * the learning-record export. Also the "Sources & scope" credits panel.
 */
import { assetExists, caseAssetUrl } from "../../app/assets.js";
import type { App } from "../../app/context.js";
import { ct, tr } from "../../i18n/index.js";
import { clear, h } from "../dom.js";
import type { PanelView } from "../panel.js";
import { evidenceGrid } from "./common.js";

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
    // Appears as soon as the case is finished / assessed, also while the journal is open.
    const debriefBtn = h("button", { type: "button", id: "journal-debrief", hidden: true, onclick: () => app.open("debrief") }, tr("journal.debrief"));
    const pdfAsset = c.assets.find((a) => a.kind === "pdf");
    const pdf = pdfAsset ? caseAssetUrl(c, pdfAsset.id) : null;
    const pdfBtn = h("button", { type: "button", id: "download-paper", disabled: true, title: tr("journal.pdfMissing") }, tr("journal.pdf"));
    if (pdf?.url) {
      void assetExists(pdf.url).then((ok) => {
        pdfBtn.disabled = !ok;
        pdfBtn.title = ok ? "" : tr("journal.pdfMissing");
        if (ok) pdfBtn.onclick = () => window.open(pdf.url!, "_blank", "noopener");
      });
    }

    const render = (): void => {
      const snap = store.snapshot;
      const s = snap?.state ?? game.session.session.state;
      const done = new Set(Object.keys(s.objectivesDone));
      clear(tasks);
      c.objectives.forEach((o, i) =>
        tasks.append(
          h(
            "div",
            { class: ["task-row", done.has(o.id) ? "done" : "", snap?.progress.currentIndex === i ? "current" : ""] },
            h("span", { class: "badge" }, done.has(o.id) ? "✓" : String(i + 1)),
            h("div", null, h("b", null, ct(o.title)), h("small", null, ct(o.hint))),
          ),
        ),
      );
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
      debriefBtn.hidden = !(store.assessment || s.finished);
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
        c.disclaimer ? h("p", { class: "notice" }, h("b", null, tr("source.disclaimer")), " ", ct(c.disclaimer)) : null,
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
