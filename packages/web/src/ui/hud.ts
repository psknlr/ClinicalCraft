/**
 * The in-world HUD (V4 layout, upgraded): brand + buttons, chapter/quest
 * card with hint, region & coordinates, clickable minimap, crosshair and
 * target tooltip, turn-phase bubble, compact vitals strip, V4 hotbar with
 * block counts, controls legend, status bar (phase, save state, simulated
 * clock, provider pill), autopilot dock and V4 touch controls; in embodied mode the embodiment badge
 * (where the world model has the learner's body, "walking…" while the world moves it) and the slot for
 * action feedback ("Go there"); while external control is on (PROTOCOL §13.6) the external-agent badge —
 * its state, the live-session id and attach key the learner hands to their agent (copyable), the calls
 * running, the bridge's error, one-click disconnect — and the autopilot button is disabled. Everything
 * renders from the app store; nothing here keeps its own history. On
 * entering the world the quest card also carries the case's teaching-case
 * disclaimer for a few seconds (inside the card, so it never covers a control).
 * Embodied mode: the vitals strip shows the monitor's live values only while
 * the world says the learner can read its screen (`EmbodiedLink.screen`, the
 * same verdict as the monitor panel); out of view it says so, without a value.
 */
import { progress as coreProgress, type CaseDefinition, type VitalKey } from "@clinicalcraft/core";
import type { App } from "../app/context.js";
import { statusLabel } from "../app/llm.js";
import type { BlockType } from "../app/persistence.js";
import type { BlockInfo, InteractionTarget, MoveInfo } from "../contracts.js";
import { caseDisclaimer, ct, getLocale, tr, trMaybe } from "../i18n/index.js";
import { append, clear, clockLabel, h } from "./dom.js";
import { phaseBadge } from "./panels/common.js";
import { nameLabel } from "./panels/trace-labels.js";

interface SlotDef {
  key: "talk" | "journal" | "map" | "wood" | "stone" | "glass" | "lamp" | "inventory" | "help";
  icon?: string;
  type?: BlockType;
}

/** V4 hotbar (9 slots). */
export const HOTBAR: SlotDef[] = [
  { key: "talk", icon: "♧" },
  { key: "journal", icon: "▤" },
  { key: "map", icon: "⌖" },
  { key: "wood", type: "wood" },
  { key: "stone", type: "stone" },
  { key: "glass", type: "glass" },
  { key: "lamp", type: "lamp" },
  { key: "inventory", icon: "▦" },
  { key: "help", icon: "?" },
];

/** How long the case disclaimer stays in the quest card after entering the world. */
export const DISCLAIMER_MS = 15_000;

const STRIP: { key: VitalKey | "bp"; unit: string }[] = [
  { key: "hr", unit: "" },
  { key: "bp", unit: "" },
  { key: "spo2", unit: "%" },
  { key: "rr", unit: "" },
  { key: "temp", unit: "°" },
];

export class Hud {
  private readonly root: HTMLElement;
  private readonly el: Record<string, HTMLElement> = {};
  private mini!: HTMLCanvasElement;
  private slots: HTMLButtonElement[] = [];
  private lastMinimap = 0;
  private savedState: "saved" | "failed" | "idle" = "idle";
  private miniTimer: ReturnType<typeof setInterval> | null = null;
  /** `performance.now()` until which the quest card shows the case disclaimer. */
  private disclaimerUntil = 0;
  /** What the external-agent badge shows now (re-rendered only when it changes: its buttons keep focus). */
  private externalKey = "";
  /** Embodied: whether the strip last showed the monitor's screen as readable (re-rendered when it changes). */
  private screenKey = "";
  private disclaimerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    root: HTMLElement,
    private readonly app: App,
  ) {
    this.root = root;
    this.rebuild();
  }

  show(visible: boolean): void {
    this.root.hidden = !visible;
    if (visible && !this.miniTimer) this.miniTimer = setInterval(() => this.drawMinimap(), 500);
    if (!visible && this.miniTimer) {
      clearInterval(this.miniTimer);
      this.miniTimer = null;
    }
    if (!visible) {
      this.disclaimerUntil = 0;
      if (this.disclaimerTimer) clearTimeout(this.disclaimerTimer);
      this.disclaimerTimer = null;
    }
  }

  /** Show the case disclaimer in the quest card once (on entering the world); it leaves by itself after `ms`. */
  showDisclaimer(ms = DISCLAIMER_MS): void {
    this.disclaimerUntil = performance.now() + ms;
    if (this.disclaimerTimer) clearTimeout(this.disclaimerTimer);
    this.disclaimerTimer = setTimeout(() => {
      this.disclaimerTimer = null;
      this.disclaimerUntil = 0;
      this.renderDisclaimer();
    }, ms);
    this.renderDisclaimer();
  }

  private renderDisclaimer(): void {
    const game = this.app.game;
    const on = !!game && performance.now() < this.disclaimerUntil;
    this.el.disclaimer.hidden = !on;
    this.el.disclaimer.textContent = on && game ? caseDisclaimer(game.caseDef.disclaimer) : "";
  }

  /** Where action feedback (a refusal with "Go there") shows while no window is open. */
  get feedbackSlot(): HTMLElement | null {
    return this.el.feedback ?? null;
  }

  /** Re-create the markup (language change / new game). */
  rebuild(): void {
    clear(this.root);
    const e = this.el;
    const btn = (id: string, label: string, key: string, onclick: () => void) => h("button", { type: "button", id, onclick }, label, " ", h("kbd", null, key));
    e.brandSub = h("small", null);
    e.chapter = h("span", { id: "chapter" });
    e.completion = h("span", { id: "completion" });
    e.questTitle = h("h3", { id: "quest-title" });
    e.questCopy = h("p", { id: "quest-copy" });
    e.questProgress = h("div", { id: "quest-progress", class: "quest-progress", "aria-hidden": "true" });
    e.questDest = h("span", { id: "quest-destination" });
    e.disclaimer = h("div", { id: "quest-disclaimer", class: "quest-disclaimer", role: "note", "aria-label": tr("hud.disclaimerLabel"), hidden: true });
    e.region = h("strong", { id: "region" });
    e.coords = h("small", { id: "coordinates" });
    e.targetName = h("strong", { id: "target-name" });
    e.targetHint = h("span", { id: "target-hint" });
    e.target = h("div", { id: "target", hidden: true }, e.targetName, h("p", null, h("kbd", null, "E"), e.targetHint));
    e.crosshair = h("div", { id: "crosshair", class: "crosshair" });
    e.bubble = h("div", { id: "turn-bubble", class: "turn-bubble", hidden: true, role: "status", "aria-live": "polite" });
    e.selected = h("div", { id: "selected-label", class: "selected-label" });
    e.hotbar = h("div", { id: "hotbar", class: "hotbar", role: "toolbar", "aria-label": tr("hud.hotbar") });
    e.phase = h("b", { id: "phase-label" });
    e.saved = h("span", { id: "saved" });
    e.clock = h("span", { id: "sim-clock", class: "sim-clock" });
    e.pill = h("button", { type: "button", id: "hud-llm", class: "llm-pill small-pill", onclick: () => this.app.open("settings", { section: "llm" }) });
    e.vitals = h("button", { type: "button", id: "vitals-strip", class: "vitals-strip", hidden: true, title: tr("hud.vitalsTitle"), "aria-label": tr("hud.vitalsTitle"), onclick: () => this.app.open("monitor") });
    e.dock = h("div", { id: "autopilot-dock", class: "autopilot-dock", hidden: true });
    e.finished = h("div", { class: "finished-banner", hidden: true });
    e.embodiment = h("button", { type: "button", id: "embodiment-badge", class: "embodiment-badge", hidden: true, onclick: () => this.app.open("settings", { section: "agents" }) });
    e.feedback = h("div", { id: "hud-feedback", class: "hud-feedback", hidden: true });
    e.external = h("section", { id: "external-badge", class: "external-badge", hidden: true, role: "status", "aria-label": tr("ext.badgeLabel") });
    this.externalKey = "";
    this.mini = h("canvas", { id: "mini", width: "240", height: "240" });

    this.root.append(
      h(
        "div",
        { class: "topbar" },
        h("div", { class: "brand" }, h("div", { class: "brandmark", "aria-hidden": "true" }, "✚"), h("div", null, h("div", { class: "brand-title" }, tr("app.title")), e.brandSub)),
        h(
          "div",
          { class: "hud-buttons" },
          btn("journal-btn", tr("hud.journal"), "J", () => this.app.open("journal")),
          btn("map-btn", tr("hud.map"), "M", () => this.app.open("map")),
          (e.autopilot = h("button", { type: "button", id: "autopilot-btn", onclick: () => this.app.open("autopilot") }, tr("hud.autopilot"))),
          btn("pause-btn", tr("hud.pause"), "Esc", () => this.app.open("pause")),
        ),
      ),
      e.vitals,
      h(
        "div",
        { class: "quest", id: "quest" },
        h("div", { class: "quest-top" }, e.chapter, e.completion),
        e.questTitle,
        e.questCopy,
        e.questProgress,
        h("div", { class: "quest-footer" }, e.questDest, h("button", { type: "button", id: "hint-btn", title: tr("hud.hintTitle"), "aria-label": tr("hud.hintTitle"), onclick: () => this.hint() }, tr("hud.hint"))),
        e.disclaimer,
      ),
      h("div", { class: "place" }, e.region, e.coords),
      h("button", { type: "button", id: "minimap-btn", class: "minimap", "aria-label": tr("hud.openMap"), onclick: () => this.app.open("map") }, this.mini),
      h("div", { class: "map-label" }, tr("hud.mapLabel")),
      e.embodiment,
      e.external,
      e.crosshair,
      e.bubble,
      e.target,
      e.finished,
      e.feedback,
      h("div", { class: "bottom" }, e.selected, e.hotbar, h("div", { class: "controls", html: tr("hud.controls.html") })),
      h("div", { class: "statusbar" }, e.phase, e.clock, h("br"), e.saved, h("br"), e.pill),
      e.dock,
      ...this.touchControls(),
    );
    this.renderHotbar();
    this.setSaved(this.savedState);
    this.update();
  }

  private touchControls(): HTMLElement[] {
    const key = (code: string, label: string, aria: string) => {
      const b = h("button", { type: "button", dataset: { key: code }, "aria-label": aria }, label);
      b.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        try {
          b.setPointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
        this.app.world.api?.setKey(code, true);
      });
      const up = () => this.app.world.api?.setKey(code, false);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      return b;
    };
    return [
      h("div", { class: "touch-controls" }, h("div", { class: "touch-pad" }, h("span"), key("KeyW", "▲", "W"), h("span"), key("KeyA", "◀", "A"), key("KeyS", "▼", "S"), key("KeyD", "▶", "D"))),
      h(
        "div",
        { class: "touch-actions" },
        h("button", { type: "button", id: "touch-talk", onclick: () => this.app.chat() }, tr("touch.talk")),
        h("button", { type: "button", id: "touch-use", onclick: () => this.app.world.api?.interact() }, tr("touch.use")),
        key("Space", tr("touch.jump"), "Space"),
      ),
    ];
  }

  private renderHotbar(): void {
    const bar = this.el.hotbar;
    clear(bar);
    this.slots = HOTBAR.map((s, i) => {
      const name = tr(`hotbar.${s.key}` as "hotbar.talk");
      const b = h(
        "button",
        {
          type: "button",
          class: ["slot", i === this.app.slot ? "active" : ""],
          dataset: { slot: String(i) },
          title: `${i + 1} ${name}`,
          "aria-label": name,
          ...(i < 7 ? { "aria-pressed": String(i === this.app.slot) } : {}),
          onclick: () => this.app.hotbar(i),
        },
        h("span", { class: "num" }, String(i + 1)),
        s.type ? [h("span", { class: `cube-icon ${s.type}-icon` }), h("span", { class: "count", dataset: { count: s.type } }, String(this.app.inventory[s.type]))] : h("span", { class: "icon" }, s.icon),
      );
      return b;
    });
    bar.append(...this.slots);
    this.setSlot(this.app.slot);
  }

  setSlot(n: number): void {
    this.slots.forEach((b, i) => {
      b.classList.toggle("active", i === n);
      if (i < 7) b.setAttribute("aria-pressed", String(i === n));
    });
    const def = HOTBAR[n];
    if (def) this.el.selected.textContent = tr(`hotbar.${def.key}.label` as "hotbar.talk.label");
  }

  updateInventory(): void {
    for (const el of this.el.hotbar.querySelectorAll<HTMLElement>("[data-count]")) {
      const t = el.dataset.count as BlockType;
      el.textContent = String(this.app.inventory[t] ?? 0);
    }
  }

  setSaved(state: "saved" | "failed" | "idle"): void {
    this.savedState = state;
    this.el.saved.textContent = state === "failed" ? tr("hud.saveFailed") : state === "saved" ? tr("hud.savedNow") : tr("hud.saved");
    this.el.saved.classList.toggle("warn", state === "failed");
  }

  onMove(info: MoveInfo): void {
    this.el.region.textContent = info.levelName ? `${info.region} · ${info.levelName}` : info.region;
    this.el.coords.textContent = `X ${Math.round(info.x)} · Z ${Math.round(info.z)}`;
    this.renderEmbodiment();
    // embodied: walking in or out of view of the monitor's screen changes what the strip may show
    const game = this.app.game;
    if (game?.embodied && this.screenKey !== this.readableKey()) this.renderVitals(game.caseDef);
    const now = performance.now();
    if (now - this.lastMinimap > 120) {
      this.lastMinimap = now;
      this.drawMinimap();
    }
  }

  onTarget(target: InteractionTarget | null, block: BlockInfo | null): void {
    const e = this.el;
    e.target.hidden = !target && !block;
    e.crosshair.classList.toggle("target", !!target || !!block);
    if (target) {
      e.targetName.textContent = target.name;
      e.targetHint.textContent = target.hint;
    } else if (block) {
      const def = HOTBAR.find((s) => s.type === block.type);
      e.targetName.textContent = def ? tr(`hotbar.${def.key}` as "hotbar.wood") : tr("target.block");
      e.targetHint.textContent = tr("target.blockHint");
    }
  }

  drawMinimap(): void {
    const api = this.app.world.api;
    if (!api || this.root.hidden) return;
    const dest = this.app.game?.link.destination() ?? null;
    try {
      api.drawMap(this.mini, { big: false, waypoint: dest ? { x: dest.x, z: dest.z, ...(dest.level ? { level: dest.level } : {}) } : null, locale: getLocale() });
    } catch (err) {
      console.error(err);
    }
  }

  private hint(): void {
    const game = this.app.game;
    if (!game) return;
    const c = game.caseDef;
    const s = game.session.session.state;
    const p = coreProgress(c, s);
    // A hint is a scored action (debrief "hints used"): none is recorded once the case is finished.
    if (!s.finished) this.app.act({ type: "hint" });
    const obj = c.objectives[p.currentIndex];
    const v4 = (c.extensions?.v4 as { completeQuest?: { hint?: never } } | undefined)?.completeQuest;
    this.app.toast(tr("toast.hint"), s.finished ? tr("hud.finishedHint") : p.complete || !obj ? ct(v4?.hint) || tr("hud.completeHint") : ct(obj.hint), "info");
  }

  /** Re-render from the store (rAF-throttled by the app). */
  update(): void {
    const e = this.el;
    const pill = statusLabel(this.app.choice());
    e.pill.textContent = pill.mode === "offline" ? tr("llm.pill.offline") : pill.mode === "proxy" ? tr("llm.pill.proxy", { model: pill.model || pill.provider }) : tr("llm.pill.direct", { provider: pill.provider, model: pill.model });
    e.pill.className = `llm-pill small-pill mode-${pill.mode}`;
    const game = this.app.game;
    if (!game) return;
    const c = game.caseDef;
    const store = game.session.store;
    const snap = store.snapshot;
    const s = snap?.state ?? game.session.session.state;
    const p = snap?.progress ?? coreProgress(c, s);
    const L = getLocale();
    const label = (c.extensions?.v4 as { caseLabel?: never } | undefined)?.caseLabel;
    e.brandSub.textContent = `${label ? ct(label).split("·")[0].trim() : ct(c.title)} · ${tr("app.brandSub")}`;

    /* quest card */
    const v4 = (c.extensions?.v4 as { completeQuest?: { title?: never; copy?: never } } | undefined)?.completeQuest;
    const n = c.objectives.length;
    if (s.finished) {
      // After "finish" the review exists: point at it instead of "go back to the board and finish".
      e.chapter.textContent = tr("hud.finishedShort");
      e.questTitle.textContent = tr("hud.finishedTitle");
      e.questCopy.textContent = tr("hud.finishedCopy");
    } else if (p.complete) {
      e.chapter.textContent = tr("hud.complete");
      e.questTitle.textContent = ct(v4?.title) || tr("hud.completeTitle");
      e.questCopy.textContent = ct(v4?.copy) || tr("hud.completeCopy");
    } else {
      const obj = c.objectives[p.currentIndex];
      e.chapter.textContent = tr("hud.chapter", { n: String(p.currentIndex + 1).padStart(2, "0") });
      e.questTitle.textContent = ct(obj?.title);
      e.questCopy.textContent = ct(obj?.guidance) || ct(obj?.hint);
    }
    e.completion.textContent = `${p.done} / ${n}`;
    clear(e.questProgress);
    for (const o of p.objectives) e.questProgress.append(h("span", { class: [o.done ? "done" : "", o.current ? "current" : ""] }));
    const dest = game.link.destination();
    e.questDest.textContent = dest ? tr("hud.destination", { place: dest.label }) : tr("hud.noDestination");
    this.renderDisclaimer();

    /* status bar */
    e.phase.textContent = phaseBadge(c, s.phase, L);
    if (c.clock.mode === "simulated") {
      e.clock.hidden = false;
      e.clock.textContent = c.clock.startTime ? ` · ${tr("hud.clock", { time: clockLabel(c.clock.startTime, s.clock) })}` : ` · ${tr("hud.elapsed", { min: Math.round(s.clock) })}`;
    } else e.clock.hidden = true;

    /* vitals strip */
    this.renderVitals(c);

    /* turn bubble */
    const busy = this.app.isPlaying() ? [...store.phases.entries()].find(([agent]) => agent !== "clinician" && agent !== "examiner") : undefined;
    if (busy) {
      const [agent, phase] = busy;
      const who = agent === "patient" ? ct(c.patient.displayName) : agent === "companion" && c.patient.persona.companion ? ct(c.patient.persona.companion.name) : trMaybe(`role.${agent}`, agent);
      e.bubble.textContent = phase === "awaiting_approval" ? tr("turn.approval") : phase === "executing_tools" ? tr("turn.tools", { name: who }) : phase === "streaming" ? tr("turn.speaking", { name: who }) : tr("turn.thinking", { name: who });
      e.bubble.hidden = false;
    } else e.bubble.hidden = true;

    /* finished banner */
    e.finished.hidden = !s.finished || !this.app.isPlaying();
    e.finished.textContent = tr("hud.finished");

    /* autopilot dock */
    this.renderDock();

    /* embodiment badge */
    this.renderEmbodiment();

    /* external agent */
    this.renderExternal();
  }

  /**
   * The external-agent badge (PROTOCOL §13.6), while external control is on: "External agent connected" (or
   * connecting / reconnecting / failed, with the bridge's localised error), the live-session id and the attach
   * key — what the learner hands to their own agent (`--world-session`, `--attach-key-file`), copyable —, the
   * calls running and the last one, and Disconnect (cancels running external calls, withdraws their approval
   * prompts, unregisters). Off: hidden, and the autopilot button is enabled again.
   */
  private renderExternal(): void {
    const e = this.el;
    const ext = this.app.external;
    const st = ext.status;
    if (e.autopilot) {
      const locked = ext.on;
      if (e.autopilot.hasAttribute("disabled") !== locked) e.autopilot.toggleAttribute("disabled", locked);
      e.autopilot.title = locked ? tr("ext.autopilotOff") : "";
    }
    const b = e.external;
    if (!b) return;
    const last = ext.lastCall;
    const key = st ? JSON.stringify([st.state, st.liveSessionId, st.attachKey, st.activeCalls, st.error?.message ?? "", last?.tool ?? "", last?.phase ?? "", last?.ok ?? null]) : "";
    if (key === this.externalKey) return;
    this.externalKey = key;
    b.hidden = !st;
    clear(b);
    if (!st) return;
    b.dataset.state = st.state;
    const busy = st.activeCalls > 0;
    const copyButton = (id: string, label: string, value: () => string, code: HTMLElement) =>
      h("button", { type: "button", id, class: "ext-copy", title: label, "aria-label": label, disabled: !value(), onclick: () => void this.copy(value(), code) }, tr("ext.copy"));
    const session = h("code", { id: "external-session" }, st.liveSessionId ?? tr("ext.pending"));
    const attachKey = h("code", { id: "external-key" }, st.attachKey);
    const failed = st.state === "failed";
    append(b, [
      h(
        "div",
        { class: "ext-head" },
        h("span", { class: ["dot", busy ? "busy" : ""], "aria-hidden": "true" }),
        h("b", { id: "external-state" }, tr(`ext.state.${st.state === "closed" ? "failed" : st.state}` as "ext.state.connected")),
        h("span", { class: "ext-calls", id: "external-calls" }, busy ? tr("ext.calls.busy", { n: st.activeCalls }) : tr("ext.calls.idle")),
      ),
      h(
        "div",
        { class: "ext-ids" },
        h("span", { class: "ext-label" }, tr("ext.session")),
        session,
        copyButton("external-copy-session", tr("ext.copySession"), () => ext.status?.liveSessionId ?? "", session),
        h("span", { class: "ext-label" }, tr("ext.key")),
        attachKey,
        copyButton("external-copy-key", tr("ext.copyKey"), () => ext.status?.attachKey ?? "", attachKey),
      ),
      st.error && (failed || st.state === "reconnecting") ? h("p", { class: "ext-error", id: "external-error" }, st.error.message) : null,
      h(
        "div",
        { class: "ext-foot" },
        h("small", { class: "ext-last", id: "external-last", title: last?.tool ?? "" }, last ? tr("ext.last", { tool: `${nameLabel(last.tool)}${last.phase === "finished" ? (last.ok ? " ✓" : " ✕") : " …"}` }) : ""),
        h("button", { type: "button", id: "external-disconnect", class: "danger", onclick: () => void this.app.setExternalControl(false) }, failed ? tr("ext.turnOff") : tr("ext.disconnect")),
      ),
    ]);
  }

  /** Copy an id or key for the learner (clipboard; where that is not allowed, the text is selected to copy by hand). */
  private async copy(text: string, from: HTMLElement): Promise<void> {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.app.toast(tr("ext.copied"), "", "success", "external-copy");
      return;
    } catch {
      /* not a secure context, or refused */
    }
    const range = document.createRange();
    range.selectNodeContents(from);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      /* unsupported */
    }
    this.app.toast(copied ? tr("ext.copied") : tr("ext.copyManual"), "", copied ? "success" : "info", "external-copy");
  }

  /**
   * The embodiment badge: embodied — the place where the world model has the learner's body (it must match
   * the scene: the avatar is the world's input device), "walking…" while the world moves it; clinical mode
   * says so. Clicking it opens the settings ("Embodied agents").
   */
  private renderEmbodiment(): void {
    const b = this.el.embodiment;
    const game = this.app.game;
    if (!b) return;
    b.hidden = !game;
    if (!game) return;
    const emb = game.embodied;
    let text: string;
    let cls: string;
    if (emb) {
      const walking = emb.walking;
      text = walking ? tr("emb.badgeWalking") : tr("emb.badge", { place: emb.placeLabel() ?? tr("emb.outside") });
      cls = `embodiment-badge mode-embodied${walking ? " walking" : ""}`;
      b.title = tr("emb.badgeTitle");
    } else {
      text = tr("emb.badgeClinical");
      cls = "embodiment-badge mode-clinical";
      b.title = tr("emb.badgeClinicalTitle");
    }
    if (b.textContent !== text) b.textContent = text;
    if (b.className !== cls) b.className = cls;
    b.setAttribute("aria-label", `${text} — ${b.title}`);
    b.dataset.mode = emb ? "embodied" : "clinical";
  }

  /**
   * The compact vitals strip. Before the bedside monitor is attached
   * (`monitorAttached: false`) it says so — "NO MONITOR · TRIAGE" / "未接监护 ·
   * 分诊手测" before the spot checks, which are muted (taken by hand: no trend
   * arrows, no alarm colours), or "MONITOR · OFF" when there are none; once
   * attached, the live values.
   */
  /** Embodied: "readable" / "monitor-not-in-view" / other — whether the strip may show the monitor's live values. */
  private readableKey(): string {
    return this.app.game?.embodied?.screenKey() ?? "";
  }

  private renderVitals(c: CaseDefinition): void {
    const e = this.el;
    const game = this.app.game;
    const snap = game?.session.store.snapshot;
    this.screenKey = this.readableKey();
    if (!c.physiology || !snap || snap.vitals.baselineOnly) {
      e.vitals.hidden = true;
      return;
    }
    e.vitals.hidden = false;
    const v = snap.vitals;
    const off = v.monitorAttached === false;
    // embodied: attached, but its screen is out of view from where the learner stands — no live value here
    const unseen = !off && this.screenKey === "monitor-not-in-view";
    e.vitals.classList.toggle("out-of-view", unseen);
    if (unseen) {
      e.vitals.classList.remove("off-monitor", "critical");
      e.vitals.title = tr("hud.outOfViewTitle");
      e.vitals.setAttribute("aria-label", tr("hud.outOfViewTitle"));
      clear(e.vitals);
      e.vitals.append(h("span", { class: "vital v-monitor", dataset: { vital: "monitor" } }, h("small", null, tr("hud.monitor")), h("b", null, tr("hud.outOfView"))));
      return;
    }
    const manual = new Set<string>(v.spotChecks ?? []);
    e.vitals.classList.toggle("off-monitor", off);
    const title = off ? tr(manual.size ? "hud.monitorOffTitle" : "hud.monitorOffNone") : tr("hud.vitalsTitle");
    e.vitals.title = title;
    e.vitals.setAttribute("aria-label", title);
    // Cardiac arrest: the monitor has no reading for these (never show the placeholder 0).
    const unread = new Set<string>(v.unmeasurable ?? []);
    const levelOf = (k: VitalKey) => (unread.has(k) && k !== "hr" ? null : (v.alarms.find((a) => a.vital === k)?.level ?? null));
    clear(e.vitals);
    if (off) {
      // "NO MONITOR / TRIAGE": the values after it were taken by hand at triage, not live.
      e.vitals.append(
        h(
          "span",
          { class: "vital v-monitor", dataset: { vital: "monitor" } },
          h("small", null, tr(manual.size ? "hud.monitorOff" : "hud.monitor")),
          h("b", null, tr(manual.size ? "hud.triage" : "hud.off")),
        ),
      );
    }
    for (const item of STRIP) {
      let value: string;
      let level: "warning" | "critical" | null;
      if (item.key === "bp") {
        if (v.vitals.sbp == null || v.vitals.dbp == null) continue;
        value = unread.has("sbp") ? "---" : `${Math.round(v.vitals.sbp)}/${Math.round(v.vitals.dbp)}`;
        const a = levelOf("sbp");
        const b = levelOf("dbp");
        level = a === "critical" || b === "critical" ? "critical" : a ?? b;
      } else {
        const raw = v.vitals[item.key as keyof typeof v.vitals] as number | undefined;
        if (raw === undefined) continue;
        value = unread.has(item.key) ? "---" : item.key === "temp" ? raw.toFixed(1) : String(Math.round(raw));
        level = levelOf(item.key as VitalKey);
      }
      const isManual = manual.has(item.key === "bp" ? "sbp" : item.key);
      const trend = isManual ? 0 : item.key !== "bp" ? v.trend[item.key as VitalKey] : v.trend.sbp;
      const label = item.key === "spo2" ? "SpO₂" : item.key.toUpperCase();
      e.vitals.append(
        h(
          "span",
          { class: ["vital", `v-${item.key}`, isManual ? "manual" : "", level ? `alarm-${level}` : ""], dataset: { vital: item.key } },
          h("small", null, label),
          h("b", null, value + item.unit),
          trend ? h("i", { class: "trend", "aria-hidden": "true" }, trend > 0 ? "↑" : "↓") : null,
        ),
      );
    }
    const critical = v.alarms.some((a) => a.level === "critical");
    e.vitals.classList.toggle("critical", critical);
  }

  private renderDock(): void {
    const e = this.el;
    const game = this.app.game;
    const store = game?.session.store;
    if (!store?.autopilotRunning) {
      e.dock.hidden = true;
      return;
    }
    e.dock.hidden = false;
    const calls = store.toolCalls.filter((c) => c.agent === "clinician");
    const last = calls[calls.length - 1];
    clear(e.dock);
    append(e.dock, [
      h("span", { class: "dot", "aria-hidden": "true" }),
      h("b", null, tr("auto.dock")),
      last ? h("small", { title: last.tool }, `${nameLabel(last.tool)}${last.status === "running" ? " …" : ""}`) : null,
      h("button", { type: "button", onclick: () => this.app.open("autopilot") }, "↗"),
      h("button", { type: "button", class: "danger", onclick: () => game?.session.interrupt() }, tr("auto.stop")),
    ]);
  }
}
