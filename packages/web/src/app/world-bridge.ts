/**
 * World integration: the three.js world (src/world, via the contracts in
 * src/contracts.ts) ⇄ the clinical session.
 *
 *   WorldHost      creates/recreates the world for a facility + patient (also the intro backdrop)
 *   patientFor     the case's patient in the first facility slot accepting `case.setting`
 *   routeInteraction  E on a target → which panel opens (patient/staff/workstation/device/monitor/board/atlas/craft)
 *   GameWorldLink  per game: waypoint beacon from `state_snapshot.waypoint`, NPC speaking/distress,
 *                  oxygen accessories, real-time simulated clock ticks, the `walk_to` dynamic tool
 */
import { resolveWaypoint, t, type CaseDefinition, type EquipmentCatalog, type FacilityDefinition, type PatientSlot } from "@clinicalcraft/core";
import type { InteractionTarget, WorldApi, WorldCallbacks, WorldPatient, WorldSave, WorldSettings } from "../contracts.js";
import { createWorld } from "../world/index.js";
import type { VitalsSnapshot } from "@clinicalcraft/core";
import { tr } from "../i18n/index.js";
import type { AppSession } from "./session.js";
import { Stations } from "./stations.js";
import type { LogEntry } from "./store.js";

/* ------------------------------------------------------------------ */
/* Patient placement                                                   */
/* ------------------------------------------------------------------ */

/** First facility slot accepting the case setting (core assignPatientSlot semantics, with the case's preferred slot kind as a tie-breaker). */
export function slotFor(c: Pick<CaseDefinition, "setting">, f: FacilityDefinition): PatientSlot | null {
  return f.patientSlots.find((s) => s.accepts.includes(c.setting)) ?? f.patientSlots[0] ?? null;
}

export function ageText(c: CaseDefinition): string {
  const p = c.patient;
  const key = p.ageUnit === "months" ? "age.months" : p.ageUnit === "days" ? "age.days" : "age.years";
  return tr(key, { n: p.age });
}

export function sexText(c: CaseDefinition): string {
  return tr(`sex.${c.patient.sex}` as "sex.male");
}

export function patientFor(c: CaseDefinition, f: FacilityDefinition, locale: string): WorldPatient | null {
  const slot = slotFor(c, f);
  if (!slot) return null;
  const name = t(c.patient.displayName, locale);
  return {
    slotId: slot.id,
    caseId: c.id,
    name,
    appearance: c.patient.appearance,
    posture: c.patient.posture ?? slot.posture ?? "standing",
    tag: tr("patient.tag", { age: ageText(c), sex: sexText(c) }),
  };
}

/* ------------------------------------------------------------------ */
/* World host                                                          */
/* ------------------------------------------------------------------ */

export interface WorldSpec {
  facility: FacilityDefinition;
  catalogs: EquipmentCatalog[];
  patient: WorldPatient | null;
  saved: WorldSave | null;
  locale: string;
}

export class WorldHost {
  api: WorldApi | null = null;
  key: string | null = null;
  spec: WorldSpec | null = null;
  error: unknown = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly settings: () => WorldSettings,
    private readonly callbacks: WorldCallbacks,
    private readonly vitals: (slotId: string) => VitalsSnapshot | null,
  ) {}

  static keyOf(spec: WorldSpec): string {
    return `${spec.facility.id}|${spec.patient?.caseId ?? "-"}|${spec.patient?.slotId ?? "-"}|${spec.locale}`;
  }

  /** Create the world unless the current one already matches `spec`. */
  ensure(spec: WorldSpec, force = false): WorldApi | null {
    const key = WorldHost.keyOf(spec);
    if (this.api && this.key === key && !force) return this.api;
    const saved = spec.saved ?? (this.api && this.spec?.facility.id === spec.facility.id ? this.api.serialize() : null);
    this.dispose();
    try {
      this.api = createWorld({
        canvas: this.canvas,
        facility: spec.facility,
        catalogs: spec.catalogs,
        patients: spec.patient ? [spec.patient] : [],
        settings: this.settings,
        saved,
        callbacks: this.callbacks,
        vitals: (slotId) => this.vitals(slotId),
      });
      this.key = key;
      this.spec = spec;
      this.error = null;
    } catch (err) {
      console.error(err);
      this.error = err;
      this.api = null;
      this.key = null;
    }
    return this.api;
  }

  dispose(): void {
    if (this.api) {
      try {
        this.api.dispose();
      } catch {
        /* ignore */
      }
    }
    this.api = null;
    this.key = null;
  }
}

/* ------------------------------------------------------------------ */
/* Interaction routing                                                 */
/* ------------------------------------------------------------------ */

export type Route =
  | { panel: "conversation"; agent: string; staffId?: string; staffRole?: string; name?: string }
  | { panel: "orders"; placementId: string }
  | { panel: "device"; placementId: string }
  | { panel: "monitor"; placementId: string | null }
  | { panel: "board" }
  | { panel: "atlas" }
  | { panel: "craft" }
  | { panel: "toast"; title: string; body?: string };

/** Facility staff role → session agent profile. */
export const STAFF_AGENT: Record<string, string> = {
  nurse: "nurse",
  radiologist: "radiologist",
  pathologist: "pathologist",
  attending: "attending",
  "lab-tech": "pathologist",
  pharmacist: "nurse",
  receptionist: "nurse",
  paramedic: "nurse",
  porter: "nurse",
};

export function routeInteraction(target: InteractionTarget, ctx: { caseDef: CaseDefinition | null; slotId: string | null }): Route {
  switch (target.kind) {
    case "patient":
      if (ctx.caseDef && target.caseId === ctx.caseDef.id) return { panel: "conversation", agent: "patient" };
      return { panel: "toast", title: target.name, body: target.hint };
    case "staff":
      return { panel: "conversation", agent: STAFF_AGENT[target.role] ?? "nurse", staffId: target.staffId, staffRole: target.role, name: target.name };
    case "door":
      return { panel: "toast", title: target.name };
    case "equipment":
      switch (target.interaction) {
        case "workstation":
          return { panel: "orders", placementId: target.placementId };
        case "device":
          return { panel: "device", placementId: target.placementId };
        case "monitor":
          return { panel: "monitor", placementId: target.placementId };
        case "board":
          return { panel: "board" };
        case "atlas":
          return { panel: "atlas" };
        case "craft":
          return { panel: "craft" };
        case "bed":
          return { panel: "toast", title: tr("toast.talkToPatient"), body: tr("toast.talkToPatientBody") };
        default:
          return { panel: "toast", title: target.name, body: target.hint };
      }
  }
}

/* ------------------------------------------------------------------ */
/* Per-game link                                                       */
/* ------------------------------------------------------------------ */

export interface GameWorldLinkOptions {
  world: () => WorldApi | null;
  app: AppSession;
  caseDef: CaseDefinition;
  facility: FacilityDefinition;
  catalogs: EquipmentCatalog[];
  slotId: string | null;
  locale: () => string;
  /** True while the learner is actually playing (no panel, not paused). */
  playing: () => boolean;
  /** Staff currently in conversation (for the speaking animation). */
  activeStaff: () => string | null;
}

export class GameWorldLink {
  readonly stations: Stations;
  /** A destination picked on the map or "go to <station>" (wins until the objective changes). */
  manual: { x: number; z: number; label: string } | null = null;
  private manualObjective = -1;
  private lastWaypointKey = "";
  private speakTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private tick: ReturnType<typeof setInterval> | null = null;
  private lastTick = performance.now();
  private offEntry: () => void;
  private offChange: () => void;
  private walkAbort: AbortController | null = null;
  private distressed = false;

  constructor(private readonly o: GameWorldLinkOptions) {
    this.stations = new Stations(o.facility, o.catalogs);
    this.offEntry = o.app.store.onEntry((e) => this.onEntry(e));
    this.offChange = o.app.store.onChange(() => this.syncWaypoint());
    this.tick = setInterval(() => this.onTick(), 250);
  }

  dispose(): void {
    this.offEntry();
    this.offChange();
    if (this.tick) clearInterval(this.tick);
    this.walkAbort?.abort();
    for (const timer of this.speakTimers.values()) clearTimeout(timer);
  }

  /** Current objective destination (manual pick wins). */
  destination(): { x: number; z: number; label: string } | null {
    const snap = this.o.app.store.snapshot;
    if (this.manual && snap && snap.progress.currentIndex === this.manualObjective) return this.manual;
    this.manual = null;
    if (snap?.waypoint) return this.resolveTarget(snap.waypoint);
    // Every chapter done but not yet finished: back to the evidence board (V4 behaviour).
    if (snap && snap.progress.complete && !snap.state.finished) return this.resolveTarget("board");
    return null;
  }

  setManual(dest: { x: number; z: number; label: string } | null): void {
    this.manual = dest;
    this.manualObjective = this.o.app.store.snapshot?.progress.currentIndex ?? -1;
    this.lastWaypointKey = "";
    this.syncWaypoint();
  }

  /** Resolve a waypoint/walk target string to world coordinates. */
  resolveTarget(target: string): { x: number; z: number; label: string } | null {
    const world = this.o.world();
    const locale = this.o.locale();
    if (target === "patient" && this.o.slotId) {
      const loc = world?.locate(this.o.slotId);
      if (loc) return loc;
    }
    const from = world ? { x: world.position.x, z: world.position.z } : undefined;
    const hit = resolveWaypoint(this.o.facility, this.o.catalogs, target, { ...(from ? { from } : {}), locale, ...(this.o.slotId ? { slotId: this.o.slotId } : {}) });
    if (hit) return hit;
    return world?.locate(target) ?? null;
  }

  syncWaypoint(): void {
    const world = this.o.world();
    if (!world) return;
    const dest = this.destination();
    const key = dest ? `${dest.x.toFixed(1)},${dest.z.toFixed(1)},${dest.label}` : "";
    if (key === this.lastWaypointKey) return;
    this.lastWaypointKey = key;
    world.setWaypoint(dest);
  }

  /** Re-apply world state after the world was recreated (language change). */
  refresh(): void {
    this.lastWaypointKey = "";
    this.syncWaypoint();
    const world = this.o.world();
    if (world && this.o.slotId && this.distressed) world.setPatientState(this.o.slotId, { distressed: true });
  }

  private speak(id: string, kind: "patient" | "staff", text: string): void {
    const world = this.o.world();
    if (!world) return;
    const set = (v: boolean) => (kind === "patient" ? world.setPatientState(id, { speaking: v }) : world.setStaffSpeaking(id, v));
    set(true);
    const prev = this.speakTimers.get(id);
    if (prev) clearTimeout(prev);
    this.speakTimers.set(
      id,
      setTimeout(() => set(false), Math.min(9000, 900 + text.length * 70)),
    );
  }

  private onEntry(entry: LogEntry): void {
    if (entry.kind !== "event") return;
    const msg = entry.event.msg;
    const world = this.o.world();
    if (msg.type === "agent_message") {
      const agent = String(msg.agent);
      if ((agent === "patient" || agent === "companion") && this.o.slotId) this.speak(this.o.slotId, "patient", msg.text);
      else {
        const staff = this.o.activeStaff();
        if (staff) this.speak(staff, "staff", msg.text);
      }
    } else if (msg.type === "state_snapshot" && world && this.o.slotId) {
      const critical = msg.vitals.alarms.some((a) => a.level === "critical") && !msg.vitals.baselineOnly;
      if (critical !== this.distressed) {
        this.distressed = critical;
        world.setPatientState(this.o.slotId, { distressed: critical });
      }
    } else if (msg.type === "clinical_event" && msg.event.type === "intervention.applied" && world && this.o.slotId) {
      const iv = this.o.caseDef.interventions.find((i) => i.id === (msg.event as { interventionId: string }).interventionId);
      if (iv?.kind === "oxygen") {
        const label = `${iv.id} ${t(iv.name, "en")}`.toLowerCase();
        world.setPatientState(this.o.slotId, { accessory: /mask|nrb|non-rebreath|venturi/.test(label) ? "oxygen-mask" : "nasal-cannula" });
      }
    } else if (msg.type === "dynamic_tool_call" && msg.tool === "walk_to") {
      void this.walkTo(msg.callId, msg.args);
    }
  }

  private async walkTo(callId: string, args: unknown): Promise<void> {
    const target = typeof (args as { target?: unknown })?.target === "string" ? (args as { target: string }).target : "";
    const world = this.o.world();
    const respond = (ok: boolean, output: string) => this.o.app.submit({ type: "dynamic_tool_response", callId, ok, output });
    if (!world) return void respond(false, "world not available");
    const dest = target ? this.resolveTarget(target) : null;
    if (!dest) return void respond(false, `unknown destination "${target}"`);
    this.walkAbort?.abort();
    const ctrl = new AbortController();
    this.walkAbort = ctrl;
    try {
      world.setWaypoint(dest);
      await world.walkTo({ x: dest.x, z: dest.z }, ctrl.signal);
      respond(true, `arrived at ${dest.label}`);
    } catch (err) {
      respond(false, err instanceof Error ? err.message : String(err));
    } finally {
      this.lastWaypointKey = "";
      this.syncWaypoint();
    }
  }

  private onTick(): void {
    const now = performance.now();
    const dt = now - this.lastTick;
    this.lastTick = now;
    if (!this.o.playing()) return;
    const c = this.o.caseDef;
    if (c.clock.mode !== "simulated" || c.clock.realtimeScale <= 0) return;
    try {
      this.o.app.session.advanceRealTime(Math.min(dt, 1000));
    } catch (err) {
      console.error(err);
    }
  }
}
