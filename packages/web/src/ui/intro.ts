/**
 * Intro screen (V4 hero, now "V5 · AGENT EDITION") with the case library:
 * cards (title, specialty, difficulty dots, setting, minutes, provenance,
 * locales, saved progress), specialty/setting filters and search, the
 * facility selector (case default preselected; clinic-v4 only for
 * outpatient cases), the case's clinical review status (on every card and
 * the selected case) and its learning outcomes (a closed disclosure with the
 * full case's text: they usually name the diagnosis, so the index carries a
 * count only — docs/GLOSSARY.md §4), the teaching-case
 * disclaimer, Continue / Start new, language toggle, LLM status pill
 * (opens settings) and help. The library is the case index; the selected
 * case's full file loads in the background (its status line: loading,
 * failed — with a retry, or a page reload for a bundled case —, invalid).
 * The case list keeps one card element per case (library-list.ts): a search or
 * filter attaches and detaches cards, and a selection changes only the selected
 * state, the start buttons, the selected case's panel and the footer — no card
 * is rebuilt, so the tapped card stays under the finger.
 */
import { specialtyLabel as sharedSpecialtyLabel } from "@clinicalcraft/core";
import type { ClinicalCraftApp } from "../app/app.js";
import type { CaseCard } from "../app/content.js";
import type { CaseSave } from "../app/persistence.js";
import { statusLabel } from "../app/llm.js";
import { caseDisclaimer, ct, getLocale, reviewLine, tr, trMaybe } from "../i18n/index.js";
import { clear, h } from "./dom.js";
import { caseCollectionBadge, caseCollections, matchesLibraryQuery } from "./library.js";
import { cardOffset, listAnchor, placeChildren, renderAbove, revealOffset, scrollCardTo } from "./library-list.js";
import { searchInput, type SearchInput } from "./search-input.js";

type Status = "loading" | "ready" | "failed";

/** A case card's element and what it shows: rebuilt when the card, the language or the case's save changes. */
interface CardEntry {
  el: HTMLButtonElement;
  card: CaseCard;
  key: string;
}

function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  try {
    return new Date(then).toLocaleString(getLocale(), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

/** A specialty by its label in the UI language — core's one table for every front-end (`SPECIALTY_LABELS`). */
export function specialtyLabel(id: string): string {
  return sharedSpecialtyLabel(id, getLocale());
}

export class Intro {
  private readonly root: HTMLElement;
  private status: Status = "loading";
  private query = "";
  private specialty = "";
  private setting = "";
  private collection = "";
  private listEl: HTMLElement | null = null;
  private countEl: HTMLElement | null = null;
  private resetEl: HTMLButtonElement | null = null;
  /** What follows the selected case, replaced in place when it changes: the hero card (start buttons), the library section's selected-case panel, the footer. */
  private heroEl: HTMLElement | null = null;
  private libraryEl: HTMLElement | null = null;
  private selectedEl: HTMLElement | null = null;
  private footEl: HTMLElement | null = null;
  /** The search box's input handling: the list follows typing once it pauses, never pinyin being composed. */
  private search: SearchInput | null = null;
  /** The case whose learning-outcomes disclosure the learner opened (kept across re-renders). */
  private outcomesOpenFor: string | null = null;
  /** The case cards by case id, reused by every list change and render (`cardEl`). */
  private readonly cards = new Map<string, CardEntry>();

  constructor(
    root: HTMLElement,
    private readonly app: ClinicalCraftApp,
  ) {
    this.root = root;
  }

  show(): void {
    this.root.hidden = false;
    this.render();
  }

  hide(): void {
    this.search?.cancel();
    this.root.hidden = true;
  }

  setStatus(status: Status): void {
    this.status = status;
    this.render();
  }

  private selectedCard(): CaseCard | null {
    const sel = this.app.selection;
    return (sel && this.app.content.cards.find((c) => c.id === sel.caseId)) || this.app.content.cards[0] || null;
  }

  private select(card: CaseCard, facilityId?: string): void {
    const f = facilityId ?? this.app.content.defaultFacility(card)?.id;
    if (!f) return;
    const keepListFocus = document.activeElement?.classList.contains("case-card");
    this.app.selectionChanged({ caseId: card.id, facilityId: f });
    // In place: no card is rebuilt or moved (only the selected state changes), so the tapped card stays under the
    // finger. A facility chosen in the selected case's panel leaves the panel (and its focus) as it is.
    this.showSelection(facilityId === undefined);
    if (keepListFocus) this.listEl?.querySelector<HTMLButtonElement>(".case-card.active")?.focus({ preventScroll: true });
  }

  /** The selection changed: the list's selected state, the start buttons, the footer and (`panel`) the selected case's panel follow it. */
  private showSelection(panel: boolean): void {
    if (this.root.hidden || !this.listEl?.isConnected) return this.render();
    const card = this.selectedCard();
    this.syncCards();
    const hero = this.hero(card);
    this.heroEl?.replaceWith(hero);
    this.heroEl = hero;
    const foot = this.foot(card);
    this.footEl?.replaceWith(foot);
    this.footEl = foot;
    if (panel && card) {
      const next = this.selectedSummary(card);
      if (this.selectedEl) this.selectedEl.replaceWith(next);
      else this.libraryEl?.append(next);
      this.selectedEl = next;
    }
    this.revealSelected(false);
  }

  render(): void {
    if (this.root.hidden) return;
    const card = this.selectedCard();
    // The list keeps its place: the selected card when it is in view, else the first card in view, stays where it was
    // (measured before the old list leaves the document: a detached element has no geometry).
    const anchor = this.listEl ? listAnchor(this.listEl) : null;
    const listScroll = this.listEl?.scrollTop ?? 0;
    clear(this.root);
    this.heroEl = this.hero(card);
    this.footEl = this.foot(card);
    this.root.append(this.topBar(), h("div", { class: "intro-layout" }, this.heroEl, this.library(card)), this.footEl);
    const list = this.listEl;
    if (!list) return;
    const kept = anchor ? this.cards.get(anchor.caseId)?.el : undefined;
    if (anchor && kept?.parentElement === list) scrollCardTo(list, kept, anchor.offset);
    else list.scrollTop = listScroll;
  }

  /** Version, LLM status pill (opens settings) and language toggle. */
  private topBar(): HTMLElement {
    const app = this.app;
    const pill = statusLabel(app.choice());
    const pillText = pill.mode === "offline" ? tr("llm.pill.offline") : pill.mode === "proxy" ? tr("llm.pill.proxy", { model: pill.model || pill.provider }) : tr("llm.pill.direct", { provider: pill.provider, model: pill.model });
    return h(
      "div",
      { class: "intro-top" },
      h("div", { class: "version" }, tr("app.version")),
      h(
        "button",
        {
          type: "button",
          id: "intro-llm",
          class: `llm-pill mode-${pill.mode}`,
          title: tr("llm.pill.title"),
          onclick: () => app.open("settings", { section: "llm" }),
        },
        h("span", { class: "dot", "aria-hidden": "true" }),
        pillText,
        app.choice().fellBack ? h("small", null, tr("llm.pill.fallback")) : null,
      ),
      h(
        "button",
        { type: "button", id: "lang-toggle", class: "lang-toggle", "aria-label": tr("intro.langLabel"), onclick: () => app.setLocale(getLocale() === "zh-CN" ? "en" : "zh-CN") },
        tr("intro.langToggle"),
      ),
    );
  }

  /** The hero card: Enter / Continue and Start new for the selected case (at the facility selected when pressed), help, continue the last case, loading state. */
  private hero(card: CaseCard | null): HTMLElement {
    const app = this.app;
    const saved = card ? app.saves.caseSave(card.id) : null;
    const lastId = app.saves.data.lastCase;
    const last = lastId && lastId !== card?.id ? app.saves.caseSave(lastId) : null;
    const lastCard = last ? app.content.cards.find((c) => c.id === lastId) : null;
    const ready = this.status !== "loading";
    const startSelected = (resume: boolean) => {
      const sel = app.selection;
      if (card && sel) void this.start(card.id, sel.facilityId, resume);
    };
    const enter = h(
      "button",
      { type: "button", id: "enter", class: "primary", disabled: !ready || !card || !app.selection, onclick: () => startSelected(!!saved) },
      !ready ? tr("intro.preparing") : this.status === "failed" ? tr("intro.readOnly") : saved ? tr("intro.continue") : tr("intro.enter"),
    );
    const startNew = saved && ready ? h("button", { type: "button", id: "start-new", onclick: () => startSelected(false) }, tr("intro.startNew")) : null;
    const help = h("button", { type: "button", id: "intro-help", onclick: () => app.open("help") }, tr("intro.help"));
    return h(
      "div",
      { class: "intro-card" },
      h("div", { class: "eyebrow" }, tr("intro.eyebrow")),
      h("h1", null, "CLINICAL", h("br"), "CRAFT"),
      h("h2", null, tr("intro.h2")),
      h("p", { html: tr("intro.lead.html") }),
      h("div", { class: "intro-actions" }, enter, startNew, help),
      lastCard && last
        ? h(
            "button",
            {
              type: "button",
              id: "continue-last",
              class: "continue-last",
              disabled: !ready,
              onclick: () => void this.start(lastCard.id, last.facilityId, true),
            },
            h("span", null, tr("intro.continueLast")),
            h("b", null, ct(lastCard.title)),
            h("small", null, tr("intro.saveFound", { done: last.done, total: last.total, when: relativeTime(last.savedAt) })),
          )
        : null,
      h("div", { id: "loading", class: "loading" }, this.status === "loading" ? tr("intro.loading") : this.status === "failed" ? tr("intro.failed") : tr("intro.ready", { cases: app.content.cards.length })),
      h("div", { class: "intro-info" }, h("span", null, tr("intro.key.move")), h("span", null, tr("intro.key.use")), h("span", null, tr("intro.key.talk")), h("span", null, tr("intro.key.hotbar"))),
    );
  }

  /** The footer, naming the selected case. */
  private foot(card: CaseCard | null): HTMLElement {
    return h("div", { class: "intro-foot", html: tr("intro.foot.html", { caseLabel: card ? escapeHtml(footLabel(card)) : "" }) });
  }

  private async start(caseId: string, facilityId: string, resume: boolean): Promise<void> {
    const btns = [...this.root.querySelectorAll("button")] as HTMLButtonElement[];
    for (const b of btns) b.disabled = true;
    const enter = this.root.querySelector("#enter");
    if (enter) enter.textContent = this.app.content.caseStatus(caseId) === "ready" ? tr("intro.preparing") : tr("intro.loadingCase");
    await this.app.startCase(caseId, facilityId, resume);
    if (!this.app.game) this.render();
  }

  /** The selected case's load status (in place: re-rendering would steal the focus from the library). */
  updateCaseStatus(): void {
    const el = this.root.querySelector<HTMLElement>("#case-load-status");
    const card = this.selectedCard();
    if (!el || !card) return;
    el.replaceWith(this.caseStatusLine(card));
    // The learning outcomes are the full case's: fill them in once it has loaded (open state kept).
    const outcomes = this.root.querySelector<HTMLElement>("#case-outcomes");
    const fresh = outcomes ? this.outcomesDisclosure(card) : null;
    if (outcomes && fresh) outcomes.replaceWith(fresh);
  }

  /**
   * Loading / failed / invalid, under the selected case. A server case is fetched and can be retried in
   * place; a bundled case's chunk cannot (browsers remember a failed `import()` for the page's lifetime,
   * and a redeployed server has new chunk names anyway): the page is reloaded instead (saves are kept).
   */
  private caseStatusLine(card: CaseCard): HTMLElement {
    const content = this.app.content;
    const status = content.caseStatus(card.id);
    const text =
      status === "loading"
        ? tr("library.caseLoading")
        : status === "failed"
          ? tr(card.source === "server" ? "library.caseFailed" : "library.caseFailedReload")
          : status === "invalid"
            ? tr("library.invalid")
            : "";
    const action =
      status !== "failed"
        ? null
        : card.source === "server"
          ? h("button", { type: "button", id: "case-load-retry", class: "link", onclick: () => void content.loadCase(card.id) }, tr("library.caseRetry"))
          : h("button", { type: "button", id: "case-load-reload", class: "link", onclick: () => location.reload() }, tr("library.caseReload"));
    return h("p", { id: "case-load-status", class: ["case-load-status", `status-${status}`], role: "status", "aria-live": "polite", hidden: !text, dataset: { status } }, text, action);
  }

  private selectedSummary(card: CaseCard): HTMLElement {
    const app = this.app;
    const options = app.content.facilitiesFor(card);
    const def = app.content.defaultFacility(card);
    const sel = app.selection;
    // The review notes are the full case's (the index carries status and date only).
    const reviewNotes = app.content.peekCase(card.id)?.provenance.review?.notes;
    const facility = h(
      "select",
      {
        id: "facility-select",
        "aria-label": tr("library.facility"),
        onchange: (e: Event) => this.select(card, (e.target as HTMLSelectElement).value),
      },
      options.map((f) => h("option", { value: f.id, selected: f.id === sel?.facilityId }, `${ct(f.name)}${f.id === def?.id ? ` ${tr("library.facilityDefault")}` : ""}`)),
    );
    return h(
      "footer",
      { class: "intro-selected" },
      h("div", { class: "eyebrow" }, tr("intro.selected")),
      h("b", { id: "selected-case" }, ct(card.title)),
      h("p", { id: "selected-case-summary", class: "selected-case-summary" }, ct(card.summary)),
      card.review
        ? h("p", { id: "case-review", class: ["case-review", `review-${card.review.status}`], title: reviewNotes ? ct(reviewNotes) : null, dataset: { status: card.review.status } }, reviewLine(card.review))
        : null,
      // The teaching-case notice and the (closed) learning outcomes come before the controls: they stay in view
      // however short the panel's scroll area is.
      h("p", { id: "case-disclaimer", class: "case-disclaimer", role: "note" }, caseDisclaimer(card.disclaimer)),
      this.outcomesDisclosure(card),
      h("label", { class: "facility-row" }, h("span", null, tr("library.facility")), facility),
      card.setting !== "outpatient" ? h("small", { class: "facility-note" }, tr("library.facilityOutpatient")) : null,
      this.embodimentRow(card),
      this.caseStatusLine(card),
    );
  }

  /**
   * The case's learning outcomes, closed by default: specific outcomes usually name the diagnosis, so a
   * learner opens them only on purpose (a facilitator preparing the session); the debrief lists them too.
   */
  private outcomesDisclosure(card: CaseCard): HTMLElement | null {
    const n = card.learningOutcomeCount;
    if (n <= 0) return null;
    // The text comes from the full case (loaded in the background once selected): the index carries the count only.
    const content = this.app.content;
    const def = content.peekCase(card.id);
    const outcomes = def ? def.learningOutcomes.map((o) => ct(o)).filter(Boolean) : [];
    const status = content.caseStatus(card.id);
    return h(
      "details",
      {
        id: "case-outcomes",
        class: "case-outcomes",
        open: this.outcomesOpenFor === card.id,
        ontoggle: (e: Event) => {
          this.outcomesOpenFor = (e.target as HTMLDetailsElement).open ? card.id : null;
        },
      },
      h("summary", null, tr("outcomes.disclosure", { n })),
      h("small", { class: "case-outcomes-hint" }, tr("outcomes.disclosureHint")),
      outcomes.length > 0
        ? h("ol", null, outcomes.map((o) => h("li", null, o)))
        : status === "failed" || status === "invalid"
          ? null
          : h("small", { class: "case-outcomes-hint" }, tr("library.caseLoading")),
    );
  }

  /**
   * "In-world mode" at case start (docs/EMBODIED.md R3; technically the embodiment): the mode of a new
   * encounter — fixed while it runs; continuing a save keeps the saved mode (said under the switch).
   * Clinical without a 3D world.
   */
  private embodimentRow(card: CaseCard): HTMLElement {
    const app = this.app;
    const on = app.preferredEmbodiment() === "embodied";
    const toggle = h("input", {
      type: "checkbox",
      id: "embodied-toggle",
      checked: on,
      disabled: app.worldFailed,
      onchange: (e: Event) => {
        const checked = (e.target as HTMLInputElement).checked;
        app.prefs.update((s) => {
          s.agent.embodiment = checked ? "embodied" : "clinical";
        });
      },
    });
    const saved = app.saves.caseSave(card.id);
    const savedMode = saved ? (saved.snapshot.embodiment === "embodied" ? "emb.mode.embodied" : "emb.mode.clinical") : null;
    return h(
      "div",
      { class: "embodied-row" },
      h("label", { for: "embodied-toggle" }, toggle, h("span", null, tr("intro.embodied"))),
      h("small", null, tr("intro.embodiedHint")),
      savedMode ? h("small", { class: "embodied-saved", id: "embodied-saved" }, tr("intro.embodiedSaved", { mode: tr(savedMode) })) : null,
    );
  }

  private library(selected: CaseCard | null): HTMLElement {
    const app = this.app;
    const cards = app.content.cards;
    // One option per label: ids that share a label (e.g. older content's "pulmonology" and
    // "respiratory-medicine", both 呼吸内科) are one filter.
    const specialties = [...new Set(cards.flatMap((c) => c.specialty.map(specialtyLabel)))].sort((a, b) => a.localeCompare(b, getLocale()));
    if (this.specialty && !specialties.includes(this.specialty)) this.specialty = ""; // a label from the previous language
    const settings = [...new Set(cards.map((c) => c.setting))];
    // The list follows typing once it pauses, and never while an input method composes pinyin (search-input.ts);
    // `aria-busy` marks the list while a search waits.
    this.search?.cancel();
    const typed = searchInput({
      query: (text) => {
        this.query = text;
        this.listEl?.setAttribute("aria-busy", "true");
      },
      refresh: () => this.renderList(),
    });
    this.search = typed;
    const search = h("input", {
      type: "search",
      id: "library-search",
      placeholder: tr("library.search"),
      "aria-label": tr("library.search"),
      value: this.query,
      autocomplete: "off",
      oninput: (e: Event) => typed.input((e.target as HTMLInputElement).value, (e as InputEvent).isComposing),
      oncompositionstart: () => typed.compositionStart(),
      oncompositionend: (e: Event) => typed.compositionEnd((e.target as HTMLInputElement).value),
    });
    search.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter" && !e.isComposing) typed.flush();
    });
    const spec = h(
      "select",
      {
        id: "filter-specialty",
        "aria-label": tr("library.allSpecialties"),
        onchange: (e: Event) => {
          this.specialty = (e.target as HTMLSelectElement).value;
          this.renderList();
        },
      },
      h("option", { value: "" }, tr("library.allSpecialties")),
      specialties.map((label) => h("option", { value: label, selected: label === this.specialty }, label)),
    );
    const sett = h(
      "select",
      {
        id: "filter-setting",
        "aria-label": tr("library.allSettings"),
        onchange: (e: Event) => {
          this.setting = (e.target as HTMLSelectElement).value;
          this.renderList();
        },
      },
      h("option", { value: "" }, tr("library.allSettings")),
      settings.map((s) => h("option", { value: s, selected: s === this.setting }, trMaybe(`setting.${s}`, s))),
    );
    const collections = caseCollections(cards);
    const collection = collections.length ? h("select", {
      id: "filter-collection",
      "aria-label": tr("library.allCollections"),
      onchange: (e: Event) => {
        this.collection = (e.target as HTMLSelectElement).value;
        this.renderList();
      },
    },
    h("option", { value: "", selected: !this.collection }, tr("library.allCollections")),
    collections.map((item) => h("option", { value: item.id, selected: this.collection === item.id }, item.label))) : null;
    this.countEl = h("span", { class: "count", role: "status", "aria-live": "polite", "aria-atomic": "true" });
    this.resetEl = h("button", { type: "button", id: "library-reset", class: "link", onclick: () => {
      this.search?.cancel();
      this.query = this.specialty = this.setting = this.collection = "";
      this.render();
      this.root.querySelector<HTMLInputElement>("#library-search")?.focus();
    } }, tr("library.clearFilters"));
    this.listEl = h("div", { class: "case-list", id: "case-list", role: "listbox", "aria-label": tr("library.title"), onkeydown: (e: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const buttons = [...this.listEl!.querySelectorAll<HTMLButtonElement>(".case-card")];
      const current = buttons.indexOf(e.target as HTMLButtonElement);
      if (current < 0) return;
      e.preventDefault();
      const next = e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, current + (e.key === "ArrowDown" ? 1 : -1)));
      buttons.forEach((button, index) => { button.tabIndex = index === next ? 0 : -1; });
      buttons[next]?.focus();
    } });
    const lib = h(
      "section",
      { class: "library", "aria-labelledby": "library-title" },
      h("header", { class: "library-head" }, h("div", null, h("div", { class: "eyebrow" }, tr("library.kicker")), h("h2", { id: "library-title" }, tr("library.title"))), h("span", { class: "library-total" }, tr("library.count", { n: cards.length }))),
      h("div", { class: "library-filters" }, search, h("div", { class: "row wrap" }, collection, spec, sett), h("div", { class: "library-results" }, this.countEl, this.resetEl)),
      this.listEl,
    );
    this.libraryEl = lib;
    this.selectedEl = selected ? this.selectedSummary(selected) : null;
    if (this.selectedEl) lib.append(this.selectedEl);
    this.renderList();
    return lib;
  }

  private matches(c: CaseCard): boolean {
    if (this.collection && !c.tags.includes(this.collection)) return false;
    if (this.specialty && !c.specialty.some((id) => specialtyLabel(id) === this.specialty)) return false;
    if (this.setting && c.setting !== this.setting) return false;
    return matchesLibraryQuery(c, this.query);
  }

  /**
   * The cases the filters and the search let through, in library order: the cards that stay are not rebuilt or moved
   * (they keep their layout, and the keyboard focus stays on the card it was on), the others are detached.
   */
  private renderList(): void {
    const list = this.listEl;
    if (!list) return;
    // This applies the current query: a search waiting for the typing pause is done.
    this.search?.cancel();
    list.removeAttribute("aria-busy");
    const active = document.activeElement;
    const focusedCase = active instanceof HTMLElement && list.contains(active) ? active.dataset.case : undefined;
    const all = this.app.content.cards;
    const shown = all.filter((c) => this.matches(c));
    const filtered = !!(this.query || this.specialty || this.setting || this.collection);
    if (this.countEl) this.countEl.textContent = filtered ? tr("library.matchCount", { n: shown.length, total: all.length }) : tr("library.browseHint");
    if (this.resetEl) this.resetEl.hidden = !filtered;
    // The list keeps its scroll offset, as a rebuilt list did (cards above may now stand in at another height).
    const listScroll = list.scrollTop;
    placeChildren(list, shown.length ? shown.map((c) => this.cardEl(c)) : [h("div", { class: "empty library-empty" }, h("b", null, tr("library.empty")), h("p", null, tr("library.emptyHint")))]);
    if (this.cards.size > all.length) this.forgetCards(all);
    const refocus = focusedCase ? this.cards.get(focusedCase)?.el : undefined;
    const focused = refocus?.parentElement === list ? refocus : undefined;
    if (focused && document.activeElement !== focused) focused.focus({ preventScroll: true });
    this.syncCards(focused);
    if (list.isConnected) list.scrollTop = listScroll;
    this.revealSelected(true);
  }

  /**
   * The selected state of the cards in the list (`active`, `aria-selected`) and the one card in the tab order: the
   * focused card, else the selected one, else the first. Cards are enabled again (`start` disables every button).
   */
  private syncCards(focused?: HTMLElement): void {
    const list = this.listEl;
    if (!list) return;
    const selectedId = this.selectedCard()?.id;
    const cards = [...list.querySelectorAll<HTMLButtonElement>(".case-card")];
    const tabbable = focused ?? cards.find((b) => b.dataset.case === selectedId) ?? cards[0];
    for (const b of cards) {
      const on = b.dataset.case === selectedId;
      if (b.classList.contains("active") !== on) b.classList.toggle("active", on);
      if (b.getAttribute("aria-selected") !== String(on)) b.setAttribute("aria-selected", String(on));
      const tabIndex = b === tabbable ? 0 : -1;
      if (b.tabIndex !== tabIndex) b.tabIndex = tabIndex;
      if (b.disabled) b.disabled = false;
    }
  }

  /**
   * Keep the selected card in view inside the list only (scrollIntoView would also scroll the page), moving it no
   * further than it takes: a card in view does not move. After a selection the list is as painted; after a list
   * change, cards may still stand in at an estimated height, so the ones around the selected card are rendered
   * first (`scrollCardTo`) and it lands where the painted list shows it.
   */
  private revealSelected(changed: boolean): void {
    const list = this.listEl;
    if (!list) return;
    requestAnimationFrame(() => {
      const act = list.querySelector<HTMLElement>(".case-card.active");
      if (!act || !list.isConnected || list.scrollHeight <= list.clientHeight + 2) return;
      if (changed) renderAbove(act, 0);
      const offset = cardOffset(list, act);
      const target = revealOffset(offset, act.getBoundingClientRect().height, list.getBoundingClientRect().height);
      if (changed) scrollCardTo(list, act, target);
      else if (target !== offset) list.scrollTop += offset - target;
    });
  }

  /** The card element of a case: the one built before while the card, the language and the case's save are unchanged. */
  private cardEl(c: CaseCard): HTMLButtonElement {
    const save = this.app.saves.caseSave(c.id);
    const key = `${getLocale()}|${save ? `${save.done}/${save.total}/${save.finished}` : ""}`;
    const kept = this.cards.get(c.id);
    if (kept && kept.card === c && kept.key === key) return kept.el;
    const el = this.caseCard(c, save);
    this.cards.set(c.id, { el, card: c, key });
    return el;
  }

  /** Forget the cards of cases no longer in the library. */
  private forgetCards(all: readonly CaseCard[]): void {
    const ids = new Set(all.map((c) => c.id));
    for (const id of this.cards.keys()) if (!ids.has(id)) this.cards.delete(id);
  }

  /** A case card (its selected state and tab order are set by `syncCards`). */
  private caseCard(c: CaseCard, save: CaseSave | null): HTMLButtonElement {
    const app = this.app;
    const dots = h("span", { class: "dots", title: tr("library.difficulty", { n: c.difficulty }), "aria-label": tr("library.difficulty", { n: c.difficulty }) });
    for (let i = 1; i <= 5; i++) dots.append(h("i", { class: i <= c.difficulty ? "on" : "" }));
    return h(
      "button",
      {
        type: "button",
        class: ["case-card", `prov-${c.provenance}`],
        role: "option",
        "aria-selected": "false",
        tabindex: -1,
        dataset: { case: c.id },
        onclick: () => this.select(c),
        ondblclick: () => {
          const f = app.content.defaultFacility(c);
          if (f && this.status !== "loading") void this.start(c.id, app.selection?.caseId === c.id ? app.selection.facilityId : f.id, !!app.saves.caseSave(c.id));
        },
      },
      h(
        "div",
        { class: "case-top" },
        h("span", { class: `prov prov-${c.provenance}` }, trMaybe(`library.prov.${c.provenance}`, c.provenance)),
        c.source === "server" ? h("span", { class: "setting-tag server-tag", title: tr("library.serverCase.title") }, tr("library.serverCase")) : null,
        h("span", { class: "setting-tag" }, trMaybe(`setting.${c.setting}`, c.setting)),
        c.physiology ? h("span", { class: "phys-tag", title: tr("library.physiology") }, "♥ ", tr("library.physiology")) : null,
        c.review ? h("span", { class: ["review-tag", `review-${c.review.status}`], title: reviewLine(c.review) }, trMaybe(`library.review.${c.review.status}`, c.review.status)) : null,
      ),
      h("b", { class: "case-title" }, ct(c.title)),
      h("small", { class: "case-spec" }, c.specialty.map(specialtyLabel).join(" · ")),
      h("span", { class: "case-summary" }, ct(c.summary)),
      h(
        "div",
        { class: "case-meta" },
        dots,
        caseCollectionBadge(c) ? h("span", { class: "collection-label" }, caseCollectionBadge(c)) : null,
        c.estimatedMinutes ? h("span", null, tr("library.minutes", { n: c.estimatedMinutes })) : null,
        h("span", { class: "locales", title: tr("library.locales") }, c.locales.map((l) => (l.startsWith("zh") ? "中" : l.toUpperCase())).join(" · ")),
        save ? h("span", { class: ["saved", save.finished ? "finished" : ""] }, save.finished ? tr("library.finished") : tr("library.saved", { done: save.done, total: save.total })) : null,
      ),
    );
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}

/**
 * Footer label for the selected case: the V4 "CASE 01" prefix (if any) plus the
 * spoiler-free library title. V4's full label names the diagnosis, so the
 * index carries only its prefix (`labelPrefix`).
 */
export function footLabel(card: Pick<CaseCard, "labelPrefix" | "title">): string {
  const prefix = card.labelPrefix ? ct(card.labelPrefix).trim() : "";
  const title = ct(card.title);
  return prefix ? `${prefix} · ${title}` : title;
}
