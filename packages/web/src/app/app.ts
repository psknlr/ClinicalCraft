/**
 * The application controller (implements `App` from context.ts): intro &
 * case library → game (session + world + HUD) → panels, plus persistence,
 * keyboard, language switching and the `?qa` hooks. UI modules only talk to
 * this object; the world only talks to it through `WorldCallbacks`.
 */
import type { Op } from "@clinicalcraft/agent";
import { historyVoice, regionAt, t, type ClinicalAction } from "@clinicalcraft/core";
import type { BlockInfo, InteractionTarget, SoundKind, WorldCallbacks, WorldSave } from "../contracts.js";
import { ct, getLocale, initLocale, onLocaleChange, setLocale as setUiLocale, tr, type UiLocale } from "../i18n/index.js";
import { ApprovalDialog } from "../ui/approval.js";
import { throttleFrame } from "../ui/dom.js";
import { Hud } from "../ui/hud.js";
import { Intro } from "../ui/intro.js";
import { PanelHost, type PanelBuilder } from "../ui/panel.js";
import { atlasPanel } from "../ui/panels/atlas.js";
import { surgeryPanel } from "../ui/panels/surgery.js";
import { autopilotPanel } from "../ui/panels/autopilot.js";
import { elevatorPanel, type ElevatorArgs } from "../ui/panels/elevator.js";
import { boardPanel, comparePanel } from "../ui/panels/board.js";
import { conversationPanel, type ConversationArgs } from "../ui/panels/conversation.js";
import { debriefPanel } from "../ui/panels/debrief.js";
import { helpPanel } from "../ui/panels/help.js";
import { craftPanel, inventoryPanel } from "../ui/panels/inventory.js";
import { journalPanel, sourcePanel } from "../ui/panels/journal.js";
import { mapPanel } from "../ui/panels/map.js";
import { monitorPanel, type MonitorArgs } from "../ui/panels/monitor.js";
import { devicePanel, ordersPanel, type OrdersArgs } from "../ui/panels/orders.js";
import { confirmResetPanel, pausePanel, type PauseArgs } from "../ui/panels/pause.js";
import { imagePanel, reportPanel, type ImageArgs, type ReportArgs } from "../ui/panels/report.js";
import { Toaster, type ToastLevel } from "../ui/toast.js";
import { ActionFeedback } from "../ui/feedback.js";
import { playSound } from "./audio.js";
import { fetchServerCase, loadContent, loadServerContent, type ContentIndex } from "./content.js";
import type { App, Game, PanelName } from "./context.js";
import { detectServer, fetchJson, runtimeChoice, STANDALONE, type RuntimeChoice, type ServerInfo } from "./llm.js";
import { BLOCK_TYPES, download, MAX_IMPORT_BYTES, SaveStore, type BlockType, type Inventory } from "./persistence.js";
import { buildLearningRecord } from "./record.js";
import { startAppSession } from "./session.js";
import { BrowserCamera, BrowserMover } from "./embodied.js";
import { EmbodiedLink } from "./embodied-link.js";
import { ExternalControl, externalOffered } from "./external.js";
import { coarse, preferredEmbodiment, Prefs } from "./settings.js";
import { staffForAgent } from "./staff.js";
import type { LogEntry } from "./store.js";
import { GameWorldLink, patientFor, routeInteraction, slotFor, WorldHost, type Route, type WorldSpec } from "./world-bridge.js";

const AUTOSAVE_MS = 5000;

export interface AppDom {
  canvas: HTMLCanvasElement;
  intro: HTMLElement;
  hud: HTMLElement;
  panel: HTMLElement;
  approval: HTMLElement;
  toast: HTMLElement;
}

export interface Selection {
  caseId: string;
  facilityId: string;
}

declare global {
  interface Window {
    __QA__?: Record<string, unknown>;
  }
}

export class ClinicalCraftApp implements App {
  readonly content: ContentIndex;
  readonly prefs = new Prefs();
  readonly saves = new SaveStore();
  readonly panels: PanelHost;
  readonly world: WorldHost;
  readonly qa: boolean;
  readonly hud: Hud;
  readonly intro: Intro;
  game: Game | null = null;
  server: ServerInfo | null = null;
  selection: Selection | null = null;
  /** The 3D world could not be created (WebGL unavailable): panels-only "read the case file" mode. */
  worldFailed = false;

  private readonly toaster: Toaster;
  private readonly approval: ApprovalDialog;
  private readonly dom: AppDom;
  /** Embodied mode: the world model's body mover and camera, backed by the 3D world (app/embodied.ts). */
  readonly mover: BrowserMover;
  readonly camera: BrowserCamera;
  /** Refusals of the learner's actions with "Go there" (embodied mode). */
  readonly feedback: ActionFeedback;
  /** External control of the running encounter (`clinicalcraft mcp --attach`): per encounter, never persisted. */
  readonly external: ExternalControl;
  private _slot = 0;
  private lastTalk: ConversationArgs = { agent: "patient" };
  private aim: InteractionTarget | null = null;
  private starting = false;
  private storeOff: (() => void)[] = [];
  private suppressNotice: string | null = null;
  private lastSave = 0;
  private backdropTimer: ReturnType<typeof setTimeout> | null = null;
  /** The encounter finished: external control ends once no external call is running. */
  private externalEnding: ReturnType<typeof setTimeout> | null = null;
  private readonly refresh = throttleFrame(() => {
    this.hud.update();
    this.panels.update();
  });

  constructor(dom: AppDom) {
    this.dom = dom;
    this.qa = new URLSearchParams(location.search).has("qa");
    initLocale(this.prefs.locale);
    this.content = loadContent();
    this.panels = new PanelHost(dom.panel);
    this.toaster = new Toaster(dom.toast);
    this.approval = new ApprovalDialog(dom.approval, this);
    this.world = new WorldHost(
      dom.canvas,
      () => this.prefs.world(),
      this.callbacks(),
      (slotId) => this.vitalsFor(slotId),
    );
    this.hud = new Hud(dom.hud, this);
    this.intro = new Intro(dom.intro, this);
    this.mover = new BrowserMover({
      renderer: () => this.world.api,
      onStart: (actorId, plan) => {
        this.game?.embodied?.onBodyStart(actorId, plan);
        this.refresh();
      },
      onEnd: (actorId, move) => {
        this.game?.embodied?.onBodyEnd(actorId, move);
        this.refresh();
      },
      pushing: (actorId) => this.game?.embodied?.pushing(actorId) ?? null,
      carrying: (actorId) => this.game?.embodied?.carrying(actorId) ?? null,
      // a hidden tab draws no frames: bodies are put at their targets (an external agent's walk does not stall)
      hidden: () => typeof document !== "undefined" && document.hidden,
      onHidden: (listener) => {
        const onChange = () => {
          if (document.hidden) listener();
        };
        document.addEventListener("visibilitychange", onChange);
        return () => document.removeEventListener("visibilitychange", onChange);
      },
    });
    this.external = new ExternalControl({
      onChange: () => {
        this.refresh();
        this.maybeEndExternal();
      },
    });
    this.camera = new BrowserCamera({ renderer: () => this.world.api, clock: () => this.game?.session.session.state.clock ?? 0 });
    this.feedback = new ActionFeedback(
      () => this.hud.feedbackSlot,
      () => (this.panels.isOpen ? this.panels.feedbackSlot : null),
      (goal, label, then) => void this.game?.embodied?.goTo(goal, label, then),
    );

    this.panels.modalAbove = () => this.approval.isOpen;
    this.approval.restoreFocus = (previous) => {
      if (this.panels.isOpen) this.panels.refocus(previous);
      else if (this.game?.entered && this.world.api) this.focusWorld();
      else if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
    this.panels.onToggle((open) => this.onOverlay(open));
    this.approval.onToggle((open) => this.onOverlay(open));
    onLocaleChange(() => this.onLocaleChanged());
  }

  /* ---------------------------------------------------------------- */
  /* Boot                                                              */
  /* ---------------------------------------------------------------- */

  boot(): void {
    this.installKeyboard();
    const last = this.saves.data.lastCase;
    const lastSave = last ? this.saves.caseSave(last) : null;
    const card = (lastSave && this.content.cards.find((c) => c.id === last)) || this.content.cards[0];
    if (card) {
      const facility = lastSave && this.content.facilities.has(lastSave.facilityId) ? this.content.facilities.get(lastSave.facilityId)! : this.content.defaultFacility(card);
      if (facility) this.selection = { caseId: card.id, facilityId: facility.id };
    }
    // Full cases are lazy chunks: the selected one (its patient stands in the backdrop) loads while the
    // intro paints; the intro shows the selected case's loading state as it changes.
    const selectedCase = this.selection ? this.content.loadCase(this.selection.caseId) : Promise.resolve(null);
    this.content.onCaseStatus((id) => {
      if (!this.game && id === this.selection?.caseId) this.intro.updateCaseStatus();
    });
    this.intro.show();
    this.hud.show(false);
    const detected = detectServer().then(async (info) => {
      this.server = info;
      // Served by `clinicalcraft serve`: its contentDirs cases (index entries; each case is fetched when
      // needed), facilities and catalogs join the library.
      if (info.served) await loadServerContent(this.content, (url) => fetchJson(url, 6000), (id) => fetchServerCase(id)).catch(() => 0);
      this.intro.render();
      this.hud.update();
    });
    // The world build blocks the main thread for a while: let server detection (a couple of
    // local requests) and the selected case finish first so their timeouts never race the build, and
    // let the intro paint.
    void Promise.race([Promise.all([detected, selectedCase]), new Promise((r) => setTimeout(r, 1500))]).then(() =>
      requestAnimationFrame(() =>
        setTimeout(() => {
          this.buildBackdrop();
          this.intro.setStatus(this.worldFailed ? "failed" : "ready");
        }, 30),
      ),
    );
    setInterval(() => {
      if (this.game?.entered) this.save();
    }, AUTOSAVE_MS);
    // Leaving (or hiding) the page: save, and push the last buffered transcript lines to the server.
    const leaving = () => {
      this.save();
      this.game?.session.transcript.flushOnExit?.();
    };
    addEventListener("pagehide", leaving);
    // Leaving the page ends external control (the bridge's DELETE uses keepalive); hiding it does not.
    addEventListener("pagehide", () => void this.external.disable());
    addEventListener("beforeunload", () => this.save());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") leaving();
    });
    if (this.qa) this.installQa();
  }

  /** Build (or reuse) the world behind the intro for the current selection. */
  buildBackdrop(): void {
    const spec = this.specFor(this.selection);
    if (!spec) return;
    const api = this.world.ensure(spec);
    this.worldFailed = !api;
    if (api) api.pause(true);
  }

  /** The intro selection changed: rebuild the backdrop when the facility differs (debounced). */
  selectionChanged(sel: Selection): void {
    this.selection = sel;
    // Prefetch the full case (a lazy chunk or a server document) so entering is quick.
    void this.content.loadCase(sel.caseId);
    if (this.backdropTimer) clearTimeout(this.backdropTimer);
    if (this.world.spec?.facility.id === sel.facilityId && this.world.api) return;
    this.backdropTimer = setTimeout(() => {
      if (!this.game) this.buildBackdrop();
    }, 450);
  }

  private specFor(sel: Selection | null): WorldSpec | null {
    if (!sel) return null;
    const facility = this.content.facilities.get(sel.facilityId);
    if (!facility) return null;
    // Only a case already loaded: the backdrop never waits for one (it shows the patient once loaded).
    const caseDef = this.content.peekCase(sel.caseId);
    const locale = getLocale();
    return {
      facility,
      catalogs: this.content.catalogsFor(facility),
      patient: caseDef ? patientFor(caseDef, facility, locale) : null,
      saved: this.saves.data.worlds[facility.id] ?? null,
      locale,
    };
  }

  /* ---------------------------------------------------------------- */
  /* App interface                                                     */
  /* ---------------------------------------------------------------- */

  get inventory(): Inventory {
    return this.saves.data.inventory;
  }

  get slot(): number {
    return this._slot;
  }

  choice(): RuntimeChoice {
    return runtimeChoice(this.prefs.llm, this.server);
  }

  toast(title: string, body = "", level: ToastLevel = "info", key?: string): void {
    this.toaster.show(title, body, level, key);
  }

  sound(kind: SoundKind): void {
    playSound(kind, this.prefs.ui.sound);
  }

  isPlaying(): boolean {
    return !!this.game?.entered && !this.panels.isOpen && !this.approval.isOpen;
  }

  open(name: PanelName, arg?: unknown): void {
    const builder = this.builder(name, arg);
    if (!builder) return;
    this.world.api?.pause(true);
    this.panels.open(builder);
    this.hud.update();
  }

  private needGame(): Game | null {
    if (!this.game) this.toast(tr("toast.warning"), tr("app.noCase"), "warning");
    return this.game;
  }

  private builder(name: PanelName, arg: unknown): PanelBuilder | null {
    switch (name) {
      case "pause":
      case "settings":
        return pausePanel(this, {
          ...((arg as PauseArgs | undefined) ?? {}),
          menu: name === "pause" && !!this.game,
        });
      case "help":
        return helpPanel(this);
      case "confirm-reset":
        return this.needGame() ? confirmResetPanel(this) : null;
      default:
        break;
    }
    const game = this.needGame();
    if (!game) return null;
    switch (name) {
      case "conversation": {
        const a = (arg as ConversationArgs | undefined) ?? this.lastTalk;
        this.lastTalk = {
          agent: a.agent,
          ...(a.staffId ? { staffId: a.staffId } : {}),
          ...(a.staffRole ? { staffRole: a.staffRole } : {}),
          ...(a.name ? { name: a.name } : {}),
        };
        return conversationPanel(this, a);
      }
      case "orders":
        return ordersPanel(this, arg as OrdersArgs);
      case "device":
        return devicePanel(this, arg as { placementId: string });
      case "report":
        return reportPanel(this, arg as ReportArgs);
      case "image":
        return imagePanel(this, arg as ImageArgs);
      case "journal":
        return journalPanel(this);
      case "source":
        return sourcePanel(this);
      case "board":
        return boardPanel(this);
      case "compare":
        return comparePanel(this);
      case "debrief":
        return debriefPanel(this);
      case "monitor": {
        const slot = game.facility.patientSlots.find((s) => s.id === game.slotId);
        return monitorPanel(
          this,
          (arg as MonitorArgs | undefined) ?? {
            placementId: slot?.monitor ?? null,
          },
        );
      }
      case "map":
        return mapPanel(this);
      case "inventory":
        return inventoryPanel(this);
      case "craft":
        return craftPanel(this);
      case "atlas":
        return atlasPanel(this);
      case "surgery":
        return surgeryPanel(this);
      case "autopilot":
        return autopilotPanel(this);
      case "elevator":
        return elevatorPanel(this, arg as ElevatorArgs);
      default:
        return null;
    }
  }

  route(route: Route): void {
    switch (route.panel) {
      case "toast":
        this.toast(route.title, route.body ?? "");
        return;
      case "conversation":
        this.open("conversation", {
          agent: route.agent,
          ...(route.staffId ? { staffId: route.staffId } : {}),
          ...(route.staffRole ? { staffRole: route.staffRole } : {}),
          ...(route.name ? { name: route.name } : {}),
        });
        return;
      case "orders":
        this.open("orders", { placementId: route.placementId });
        return;
      case "device":
        this.open("device", { placementId: route.placementId });
        return;
      case "monitor":
        this.open("monitor", { placementId: route.placementId });
        return;
      case "board":
      case "atlas":
      case "surgery":
      case "craft":
        this.open(route.panel);
        return;
      case "elevator":
        this.open("elevator", { connectorId: route.connectorId, level: route.level, name: route.name, stops: route.stops } satisfies ElevatorArgs);
        return;
      case "world-op": {
        // embodied: an operation on equipment through the world (a sink's wash_hands)
        const emb = this.game?.embodied;
        if (!emb) return;
        void emb.worldAction({ operation: route.operation, targetId: route.targetId }).then((r) => {
          if (r?.status === "completed") this.toast(route.title, r.message, "success");
        });
        return;
      }
    }
  }

  close(): void {
    this.panels.close();
  }

  submit(op: Op, view?: string): string | null {
    if (!this.game) return null;
    // embodied: the world judges what an op asks for from where the avatar stands — tell it first
    if (op.type !== "world_pose") this.game.embodied?.syncPose();
    return this.game.session.submit(op, view);
  }

  act(action: ClinicalAction, rationale?: string): string | null {
    if (!this.game) return null;
    // embodied: checked against the world first (a short walk, or "Go there")
    if (this.game.embodied) return this.game.embodied.act(action, rationale);
    return this.game.session.act(action, rationale);
  }

  say(text: string, to: string, staff?: string | null): string | null {
    if (!this.game) return null;
    const op = { type: "user_message" as const, text, to, ...(staff ? { staff } : {}) };
    // embodied: words for the patient are checked against the world first (within earshot), like an act
    if (this.game.embodied) return this.game.embodied.say(op);
    return this.submit(op);
  }

  externalOffered(): boolean {
    return externalOffered(this.server);
  }

  /**
   * The learner's per-encounter opt-in (PROTOCOL §13.6): on — the running session is offered to their external
   * agent (`connectWorldBridge`, same origin); off — running external calls are cancelled and the session
   * unregistered. Never stored: every encounter starts off.
   */
  async setExternalControl(on: boolean): Promise<void> {
    if (!on) {
      const was = this.external.on;
      await this.external.disable();
      if (was) this.toast(tr("ext.toast.off"), "", "info", "external");
      return;
    }
    const game = this.game;
    if (!game || !this.externalOffered() || this.external.on) return;
    this.external.enable(game.session.session);
    this.toast(tr("ext.toast.on"), tr("ext.toast.onBody"), "info", "external");
  }

  /**
   * The encounter has ended (finished or timed out): external control ends too — once no external call is running,
   * after a short grace so the call that ended it still gets its result to the caller.
   */
  private maybeEndExternal(): void {
    const busy = (this.external.status?.activeCalls ?? 0) > 0;
    if (busy && this.externalEnding) {
      // another call came in during the grace: wait for it too
      clearTimeout(this.externalEnding);
      this.externalEnding = null;
    }
    if (busy || this.externalEnding || !this.external.on || !this.game?.session.session.state.finished) return;
    this.externalEnding = setTimeout(() => {
      this.externalEnding = null;
      if (this.game?.session.session.state.finished && (this.external.status?.activeCalls ?? 0) === 0) void this.setExternalControl(false);
    }, 1500);
  }

  /** The mode a new encounter starts in: the "In-world mode" preference, clinical without a 3D world. */
  preferredEmbodiment(): "clinical" | "embodied" {
    return this.worldFailed ? "clinical" : preferredEmbodiment(this.prefs.value);
  }

  save(): boolean {
    const game = this.game;
    if (!game) return false;
    const s = game.session.session.state;
    const progress = game.session.store.snapshot?.progress;
    try {
      this.saves.data.sessions[game.caseDef.id] = {
        snapshot: game.session.snapshot(),
        facilityId: game.facility.id,
        savedAt: new Date().toISOString(),
        done: progress?.done ?? Object.keys(s.objectivesDone).length,
        total: progress?.total ?? game.caseDef.objectives.length,
        finished: s.finished,
      };
    } catch (err) {
      console.error(err);
    }
    const api = this.world.api;
    if (api && this.world.spec?.facility.id === game.facility.id) this.saves.data.worlds[game.facility.id] = api.serialize();
    this.saves.data.lastCase = game.caseDef.id;
    this.saves.data.settings = { ...this.prefs.ui };
    const ok = this.saves.write();
    this.lastSave = performance.now();
    this.hud.setSaved(ok ? "saved" : "failed");
    return ok;
  }

  playerPos(): { x: number; z: number } {
    const p = this.world.api?.position;
    if (p) return { x: p.x, z: p.z };
    const f = this.game?.facility ?? (this.selection ? this.content.facilities.get(this.selection.facilityId) : undefined);
    return f ? { x: f.spawn.x, z: f.spawn.z } : { x: 0, z: 0 };
  }

  setLocale(locale: UiLocale): void {
    this.prefs.update((s) => {
      s.ui.locale = locale;
    });
    if (locale === getLocale()) return;
    setUiLocale(locale);
  }

  private onLocaleChanged(): void {
    const locale = getLocale();
    this.intro.render();
    this.hud.rebuild();
    const game = this.game;
    // World strings (signs, labels, NPC tags) are baked in at creation: rebuild it in place.
    const spec = game
      ? {
          facility: game.facility,
          catalogs: game.catalogs,
          patient: patientFor(game.caseDef, game.facility, locale),
          saved: null,
          locale,
        }
      : this.specFor(this.selection);
    if (spec) {
      const api = this.world.ensure(spec);
      if (api) {
        if (game?.entered) {
          api.start();
          api.select(this._slot);
          if (this.panels.isOpen || this.approval.isOpen) api.pause(true);
        } else api.pause(true);
      }
    }
    if (game) {
      game.link.refresh();
      game.session.reconfigure(this.prefs.value, this.choice(), locale);
      // a rebuilt scene starts from the facility data: draw the world's physical state again
      game.embodied?.syncScene();
    }
    this.feedback.render();
    this.panels.rebuild();
    this.hud.update();
    this.toast(tr("toast.langChanged"));
  }

  applySettings(): void {
    const game = this.game;
    if (game) game.session.reconfigure(this.prefs.value, this.choice(), getLocale());
    this.intro.render();
    this.hud.update();
  }

  async backToLibrary(): Promise<void> {
    this.panels.close();
    await this.endGame(true);
    this.world.api?.pause(true);
    this.intro.show();
    this.intro.render();
  }

  async resetCase(): Promise<void> {
    const game = this.game;
    if (!game) return;
    const { id } = game.caseDef;
    const facilityId = game.facility.id;
    this.panels.close();
    await this.endGame(false);
    this.saves.clearCase(id, facilityId);
    this.world.dispose();
    await this.startCase(id, facilityId, false);
  }

  exportSave(): void {
    const game = this.game;
    if (!game) return;
    this.save();
    const file = this.saves.exportFile(game.caseDef.id, this.prefs.ui);
    if (!file) return;
    download(JSON.stringify(file, null, 2), tr("record.saveFile"), "application/json");
    this.toast(tr("toast.exported"), tr("record.saveFile"));
  }

  async importSave(file: File): Promise<void> {
    if (file.size > MAX_IMPORT_BYTES) {
      this.toast(tr("save.importFail"), tr("save.tooLarge"), "warning");
      return;
    }
    const text = await file.text();
    const parsed = SaveStore.parseImport(text, {
      cases: new Set(this.content.cards.map((c) => c.id)),
      facilities: new Set(this.content.facilities.keys()),
    });
    if (!parsed.ok) {
      this.toast(tr("save.importFail"), tr(parsed.error, { id: parsed.id ?? "" }), "warning");
      return;
    }
    const f = parsed.file;
    if (this.game) await this.endGame(false);
    this.saves.applyImport(f);
    this.prefs.update((s) => {
      s.ui = { ...f.settings, locale: s.ui.locale };
    });
    this.world.dispose();
    this.selection = { caseId: f.session.caseId, facilityId: f.facilityId };
    this.panels.close();
    await this.startCase(f.session.caseId, f.facilityId, true);
    this.toast(tr("save.importOk"), ct(this.game?.caseDef.title));
  }

  exportRecord(): void {
    const game = this.game;
    if (!game) return;
    const record = buildLearningRecord(game, getLocale(), this.choice());
    download(JSON.stringify(record, null, 2), tr("record.file"), "application/json");
    this.toast(tr("toast.exported"), tr("record.file"));
  }

  markDestination(dest: { x: number; z: number; label: string; level?: string } | null, walk = false): void {
    const game = this.game;
    if (!game) return;
    game.link.setManual(dest);
    this.hud.update();
    const api = this.world.api;
    if (!walk || !dest || !api) return;
    this.panels.close();
    if (game.embodied) {
      // embodied: the world plans the walk (access, locks, connectors) and charges its time
      void game.embodied.goTo({ kind: "point", x: dest.x, z: dest.z, ...(dest.level ? { level: dest.level } : {}) }, dest.label);
      return;
    }
    api.walkTo({ x: dest.x, z: dest.z, ...(dest.level ? { level: dest.level } : {}) }).then(
      () => this.toast(tr("toast.arrived"), dest.label),
      (err: unknown) => this.toast(tr("toast.walkFailed"), err instanceof Error ? err.message : String(err), "warning"),
    );
  }

  inventoryChanged(): void {
    this.hud.updateInventory();
    if (performance.now() - this.lastSave > 1500) this.save();
  }

  hotbar(n: number): void {
    if (n < 0 || n > 8) return;
    const api = this.world.api;
    if (n === 7 || n === 8) {
      api?.select(this._slot);
      this.open(n === 7 ? "inventory" : "help");
      return;
    }
    this._slot = n;
    api?.select(n);
    this.hud.setSlot(n);
    this.sound("tap");
    if (n === 1) this.open("journal");
    else if (n === 2) this.open("map");
  }

  chat(): void {
    const game = this.game;
    if (!game) return;
    const a = this.aim;
    if (a?.kind === "staff" || a?.kind === "patient") {
      const r = routeInteraction(a, {
        caseDef: game.caseDef,
        slotId: game.slotId,
      });
      if (r.panel === "conversation") {
        this.open("conversation", {
          agent: r.agent,
          ...(r.staffId ? { staffId: r.staffId } : {}),
          ...(r.staffRole ? { staffRole: r.staffRole } : {}),
          ...(r.name ? { name: r.name } : {}),
          focusInput: true,
        });
        return;
      }
    }
    this.open("conversation", { ...this.lastTalk, focusInput: true });
  }

  /* ---------------------------------------------------------------- */
  /* Game lifecycle                                                    */
  /* ---------------------------------------------------------------- */

  async startCase(caseId: string, facilityId: string, resume: boolean): Promise<void> {
    if (this.starting) return;
    this.starting = true;
    try {
      // Load (lazily, cached) and validate the full case before leaving the current one.
      const loaded = await this.content.loadCase(caseId);
      if (!loaded.ok) {
        if (loaded.reason === "invalid") this.toast(tr("library.invalid"), loaded.issues.join("\n"), "critical");
        else this.toast(tr("library.loadFailed"), loaded.issues.join("\n") || caseId, "critical");
        return;
      }
      const caseDef = loaded.def;
      if (this.game) await this.endGame(true);
      const save = resume ? this.saves.caseSave(caseId) : null;
      const facility = this.content.facilities.get(save?.facilityId ?? facilityId) ?? this.content.facilities.get(facilityId);
      if (!facility) return;
      if (!resume) {
        delete this.saves.data.sessions[caseId];
        const ws = this.saves.data.worlds[facility.id];
        // A new attempt starts at the facility entrance; build-zone blocks are kept.
        if (ws)
          this.saves.data.worlds[facility.id] = {
            ...ws,
            position: [facility.spawn.x, 0, facility.spawn.z],
            yaw: facility.spawn.yaw ?? 0,
            pitch: 0,
          };
        this.saves.write();
      }
      const catalogs = this.content.catalogsFor(facility);
      const locale = getLocale();
      this.selection = { caseId, facilityId: facility.id };
      const session = await startAppSession({
        caseDef,
        facility,
        catalogs,
        stored: this.prefs.value,
        choice: this.choice(),
        locale,
        served: !!this.server?.served,
        resume: save?.snapshot ?? null,
        onTranscriptStopped: () => this.toast(tr("toast.transcriptStopped"), tr("toast.transcriptStoppedBody"), "warning", "transcript-stopped"),
        // "In-world mode" (a save keeps the mode it was recorded in)
        embodiment: this.preferredEmbodiment(),
        embodied: { mover: this.mover, camera: this.camera },
      });
      const slot = slotFor(caseDef, facility);
      const saved: WorldSave | null = this.saves.data.worlds[facility.id] ?? null;
      const spec: WorldSpec = {
        facility,
        catalogs,
        patient: patientFor(caseDef, facility, locale),
        saved,
        locale,
      };
      const reused = !!this.world.api && this.world.key === WorldHost.keyOf(spec);
      const api = this.world.ensure(spec);
      this.worldFailed = !api;
      if (api && reused && saved) {
        // back onto the floor of the saved height's level (multi-level facilities; the ground otherwise)
        const level = api.levels().filter((l) => l.elevation <= saved.position[1] + 0.6).pop()?.id;
        api.teleport(saved.position[0], saved.position[2], saved.yaw, level);
      }
      const link = new GameWorldLink({
        world: () => this.world.api,
        app: session,
        caseDef,
        facility,
        catalogs,
        slotId: slot?.id ?? null,
        locale: () => getLocale(),
        playing: () => this.isPlaying(),
        activeStaff: () => this.game?.activeStaff ?? null,
        staffFor: (agent) => staffForAgent(agent, { facility, slotId: slot?.id ?? null, world: session.world() })?.staffId ?? null,
        agentDriving: () => this.game?.embodied?.agentDriving() ?? false,
        embodied: () => this.game?.embodied ?? null,
      });
      const embodied =
        session.embodiment === "embodied"
          ? new EmbodiedLink({
              app: session,
              renderer: () => this.world.api,
              mover: this.mover,
              facility,
              caseDef,
              slotId: slot?.id ?? null,
              feedback: this.feedback,
              toast: (title, body, level, key) => this.toast(title, body ?? "", level ?? "info", key),
              locale: () => getLocale(),
            })
          : null;
      const game: Game = {
        caseDef,
        facility,
        catalogs,
        slotId: slot?.id ?? null,
        session,
        link,
        stations: link.stations,
        entered: false,
        activeStaff: null,
        embodied,
      };
      this.game = game;
      // the scene shows the world's physical state (a restored world: staff, carts, locks)
      embodied?.syncScene();
      // Who answers history first (core `historyVoice`): the companion who answers it, or any companion while the patient cannot speak.
      this.lastTalk = {
        agent: historyVoice(caseDef, session.session.state) === "companion" ? "companion" : "patient",
      };
      this.storeOff.push(
        session.store.onEntry((e) => this.onEntry(e)),
        session.store.onChange(() => {
          this.approval.sync();
          this.refresh();
        }),
      );
      if (!session.session.state.started && !session.session.state.finished) session.act({ type: "start" });
      this.enter(!!save);
    } catch (err) {
      console.error(err);
      this.toast(tr("toast.error"), err instanceof Error ? err.message : String(err), "critical");
    } finally {
      this.starting = false;
    }
  }

  private enter(resumed: boolean): void {
    const game = this.game;
    if (!game) return;
    game.entered = true;
    this.intro.hide();
    this.hud.show(true);
    this.hud.rebuild();
    const api = this.world.api;
    if (api) {
      api.start();
      api.select(this._slot);
      this.focusWorld();
    }
    const p = this.playerPos();
    // multi-level facility: the region on the avatar's level (the world adds the level's name indoors)
    const level = api && api.levels().length > 1 ? api.position.level : undefined;
    this.hud.onMove({
      x: p.x,
      z: p.z,
      yaw: api?.position.yaw ?? 0,
      region: regionAt(game.facility, p.x, p.z, getLocale(), level),
      roomId: null,
      moving: false,
      ...(level ? { level } : {}),
    });
    game.link.syncWaypoint();
    // the human avatar is the world model's input device: where it stands now
    game.embodied?.syncPose();
    this.hud.update();
    // "Fictional teaching case — not medical advice", once per entry (quest card: never over a control).
    this.hud.showDisclaimer();
    if (resumed) this.toast(tr("toast.resume.title"), tr("toast.resume.body"));
    else
      this.toast(
        tr("toast.welcome.title", {
          place: t(game.facility.name, getLocale()),
        }),
        // Touch devices have an on-screen "Interact" button, not an E key.
        tr(coarse() ? "toast.welcome.bodyTouch" : "toast.welcome.body"),
      );
    if (!api) this.open("journal");
    this.save();
  }

  private async endGame(save: boolean): Promise<void> {
    const game = this.game;
    if (!game) return;
    // The encounter ends (left, reset, another case): external control ends with it — before the session closes.
    await this.external.disable();
    if (save) this.save();
    for (const off of this.storeOff) off();
    this.storeOff = [];
    game.link.dispose();
    game.embodied?.dispose();
    this.game = null;
    this.aim = null;
    this.approval.sync();
    this.hud.show(false);
    try {
      await game.session.close();
    } catch (err) {
      console.error(err);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Events                                                            */
  /* ---------------------------------------------------------------- */

  private onEntry(entry: LogEntry): void {
    if (entry.kind !== "event") return;
    const msg = entry.event.msg;
    const game = this.game;
    if (!game) return;
    const L = getLocale();
    switch (msg.type) {
      case "notification":
        if (this.suppressNotice && msg.body === this.suppressNotice) {
          this.suppressNotice = null;
          return;
        }
        this.toast(msg.title, msg.body, msg.level === "critical" ? "critical" : msg.level === "warning" ? "warning" : "info");
        if (msg.level === "critical") this.sound("alarm");
        return;
      case "warning":
        // Shown in the open conversation it belongs to (store chat line): no duplicate toast.
        if (this.panels.current === "conversation" && game.session.store.viewOf(entry.event.id)) return;
        this.toast(tr("toast.warning"), msg.message, "warning");
        return;
      case "error":
        this.toast(msg.code === "permission_denied" ? tr("toast.denied") : tr("toast.error"), msg.message, msg.code === "permission_denied" ? "warning" : "critical");
        return;
      case "clinical_event": {
        const e = msg.event;
        if (e.type === "objective.completed") {
          const c = game.caseDef;
          const title = t(c.objectives.find((o) => o.id === e.objectiveId)?.title, L);
          this.suppressNotice = title;
          const next = c.objectives[e.index + 1];
          this.sound("success");
          // Several chapters can complete at once (autopilot, a decisive result): show only the latest.
          // The next chapter's guidance (its teaching hint is the scored HUD hint).
          const nextText = next ? t(next.guidance, L) || t(next.short, L) || t(next.title, L) : "";
          this.toast(tr("toast.chapter", { title }), next ? tr("toast.next", { hint: nextText }) : tr("toast.toBoard"), "success", "chapter");
        } else if (e.type === "case.finished") {
          // the encounter has ended: so does external control (once its running calls have answered)
          this.maybeEndExternal();
        } else if (e.type === "case.completed") {
          this.sound("success");
        } else if (e.type === "vitals.alarm" && e.level === "critical") {
          this.sound("alarm");
        }
        return;
      }
      default:
        return;
    }
  }

  private onOverlay(open: boolean): void {
    const api = this.world.api;
    this.syncInert();
    // a refusal with "Go there" moves into the window (the HUD is inert under it) and back
    this.feedback.render();
    if (open) {
      api?.pause(true);
    } else if (!this.panels.isOpen && !this.approval.isOpen && this.game?.entered && api) {
      api.pause(false);
      this.focusWorld();
      if (this.game) this.save();
    }
    this.hud.update();
  }

  /** Everything under a modal is inert (no focus, no clicks, hidden from assistive tech). */
  private syncInert(): void {
    const modal = this.panels.isOpen || this.approval.isOpen;
    this.dom.hud.inert = modal;
    this.dom.intro.inert = modal;
    this.dom.canvas.inert = modal;
    this.dom.panel.inert = this.approval.isOpen;
  }

  private focusWorld(): void {
    try {
      this.dom.canvas.focus({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }

  private vitalsFor(slotId: string) {
    const game = this.game;
    if (!game || game.slotId !== slotId) return null;
    const snap = game.session.store.snapshot;
    if (!snap || snap.vitals.baselineOnly) return null;
    return snap.vitals;
  }

  /* ---------------------------------------------------------------- */
  /* World callbacks & keyboard                                        */
  /* ---------------------------------------------------------------- */

  private callbacks(): WorldCallbacks {
    return {
      onInteract: (target) => {
        const game = this.game;
        if (!game) return;
        this.sound("tap");
        this.route(
          routeInteraction(target, {
            caseDef: game.caseDef,
            slotId: game.slotId,
            embodied: !!game.embodied,
            phase: (game.session.store.snapshot?.state ?? game.session.session.state).phase,
          }),
        );
      },
      onTarget: (target: InteractionTarget | null, block: BlockInfo | null) => {
        this.aim = target;
        this.hud.onTarget(target, block);
      },
      onMove: (info) => {
        // the avatar's pose → the world model (~10 Hz; embodied mode), then the HUD (the badge reads it)
        this.game?.embodied?.syncPose();
        this.hud.onMove(info);
      },
      onDoor: (doorId, open) => this.game?.embodied?.onDoor(doorId, open),
      onLockedDoor: (doorId) => this.game?.embodied?.unlockDoor(doorId) ?? false,
      onBlock: (kind, type) => {
        if (!BLOCK_TYPES.includes(type as BlockType)) return kind === "check" ? false : undefined;
        const inv = this.inventory;
        const k = type as BlockType;
        if (kind === "check") return inv[k] > 0;
        if (kind === "mine") inv[k]++;
        else if (kind === "place") inv[k] = Math.max(0, inv[k] - 1);
        this.inventoryChanged();
        return undefined;
      },
      onToast: (title, body) => this.toast(title, body ?? ""),
      onSound: (kind) => this.sound(kind),
      onShortcut: (action, arg) => {
        if (!this.game?.entered) return;
        switch (action) {
          case "journal":
            this.open("journal");
            break;
          case "map":
            this.open("map");
            break;
          case "inventory":
            this.open("inventory");
            break;
          case "pause":
            this.open("pause");
            break;
          case "chat":
            this.chat();
            break;
          case "hotbar":
            if (typeof arg === "number") this.hotbar(arg);
            break;
        }
      },
      onPauseRequest: () => {
        if (this.isPlaying()) this.open("pause");
      },
    };
  }

  private installKeyboard(): void {
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);
    };
    // Capture phase: runs before panel inputs (which stop propagation so the world ignores
    // typing) and before the world's own key handler.
    addEventListener(
      "keydown",
      (e) => {
        if (this.approval.isOpen) {
          // Esc always answers the approval dialog (deny), wherever the focus is.
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.approval.cancel();
          }
          return;
        }
        if (e.key === "Escape") {
          if (this.panels.isOpen) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.panels.close();
          }
          return;
        }
        if (!this.isPlaying() || typing() || e.repeat) return;
        if (e.code === "KeyV") {
          e.preventDefault();
          this.open("monitor");
        }
      },
      true,
    );
  }

  /* ---------------------------------------------------------------- */
  /* QA                                                                */
  /* ---------------------------------------------------------------- */

  private installQa(): void {
    const app = this;
    window.__QA__ = {
      app,
      get world() {
        return app.world.api;
      },
      get session() {
        return app.game?.session.session ?? null;
      },
      get store() {
        return app.game?.session.store ?? null;
      },
      get game() {
        return app.game;
      },
      get content() {
        return app.content;
      },
      route: (panel: PanelName | Route, arg?: unknown) => (typeof panel === "string" ? app.open(panel, arg) : app.route(panel)),
      closePanel: () => app.close(),
      interact: (target: InteractionTarget) => app.callbacks().onInteract(target),
      act: (action: ClinicalAction) => app.act(action),
      submit: (op: Op) => app.submit(op),
      /** The learner's words through the UI's path (in-world: within earshot of the patient first). */
      say: (text: string, to = "patient", staff?: string) => app.say(text, to, staff ?? null),
      /** Deterministic engine action without the approval gate (test set-up only). */
      dispatch: (action: ClinicalAction) => app.game?.session.session.dispatch(action) ?? null,
      start: (caseId: string, facilityId?: string, resume = false) => {
        const card = app.content.cards.find((c) => c.id === caseId);
        const fid = facilityId ?? (card ? app.content.defaultFacility(card)?.id : undefined) ?? "general-hospital";
        return app.startCase(caseId, fid, resume);
      },
      /** Load a full case (its lazy chunk, or the server document); resolves true when it is valid. */
      loadCase: async (caseId: string) => (await app.content.loadCase(caseId)).ok,
      caseStatus: (caseId: string) => app.content.caseStatus(caseId),
      save: () => app.save(),
      locate: (id: string) => app.world.api?.locate(id) ?? null,
      hotbar: (n: number) => app.hotbar(n),
      get playing() {
        return app.isPlaying();
      },
      get panel() {
        return app.panels.current;
      },
      get standalone() {
        return STANDALONE;
      },
      /* ---- embodiment (docs/EMBODIED.md): authoritative state for e2e assertions ---- */
      /** The running encounter's mode ("embodied" | "clinical"), null without a game. */
      get embodiment() {
        return app.game?.session.embodiment ?? null;
      },
      /** The world model (`ClinicalSession.world()`), null in clinical mode. */
      get worldModel() {
        return app.game?.session.world() ?? null;
      },
      /** The world's physical state (canonical snapshot), null in clinical mode. */
      worldSnapshot: () => app.game?.session.world()?.snapshot() ?? null,
      /** What an actor perceives (EMBODIED §4; records an observation span). */
      observe: (actorId = "actor:clinician") => app.game?.session.world()?.observe(actorId) ?? null,
      /** The last `n` spans of the episode trace (all when `n` is omitted). */
      traceSpans: (n?: number) => {
        const spans = app.game?.session.session.trace().spans ?? [];
        return n ? spans.slice(-n) : spans;
      },
      /** A learner world action through the UI's path (auto-approach, "Go there"); resolves with the result. */
      worldAction: (request: Record<string, unknown>) => app.game?.embodied?.worldAction(request as never) ?? Promise.resolve(null),
      /** A camera frame of the avatar (the `CameraSensor` the session's `get_camera_frame` uses). */
      cameraFrame: (maxWidth = 768) => app.camera.frame("actor:clinician", { maxWidth, quality: 0.7 }),
      /** Bodies the world is moving now (Mover). */
      get moving() {
        return app.mover.moving().map((m) => m.actorId);
      },
      /** The action feedback on screen (a refusal with "Go there"), null when none. */
      get feedback() {
        return app.feedback.current;
      },
      /** The real-time clock is paused because an agent drives a body. */
      get agentDriving() {
        return app.game?.embodied?.agentDriving() ?? false;
      },
      /* ---- external control (PROTOCOL §13.6) ---- */
      /** The world bridge's status while external control is on (state, live-session id, attach key, calls), else null. */
      get external() {
        return app.external.status;
      },
    };
  }
}
