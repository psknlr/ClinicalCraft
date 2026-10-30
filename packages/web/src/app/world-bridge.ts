/**
 * World integration: the three.js world (src/world, via the contracts in
 * src/contracts.ts) ⇄ the clinical session.
 *
 *   WorldHost      creates/recreates the world for a facility + patient (also the intro backdrop)
 *   patientFor     the case's patient in the first facility slot accepting `case.setting`
 *   routeInteraction  E on a target → which panel opens (patient/staff/workstation/device/monitor/board/atlas/craft)
 *   GameWorldLink  per game: waypoint beacon from `state_snapshot.waypoint`, NPC speaking (the one who spoke: the
 *                  patient, their companion, the colleague the turn names — a narration moves no mouth), the patient's
 *                  bystander cues (core `patientCues`: distress, oxygen accessory, posture — in embodied mode the
 *                  world model places and poses the patient), real-time simulated
 *                  clock ticks — paused while an agent drives a body (EMBODIED R8) —, the clinical-mode
 *                  `walk_to` dynamic tool (embodied: mapped onto a world navigation)
 */
import { patientAgeText, patientCues, resolveWaypoint, t, type CaseDefinition, type EquipmentCatalog, type FacilityDefinition, type PatientSlot } from "@clinicalcraft/core";
import type { InteractionTarget, WorldApi, WorldCallbacks, WorldPatient, WorldSave, WorldSettings } from "../contracts.js";
import { createWorld } from "../world/index.js";
import type { VitalsSnapshot } from "@clinicalcraft/core";
import { STAFF_AGENT, type EventMsg } from "@clinicalcraft/agent";
import { getLocale, tr } from "../i18n/index.js";
import type { EmbodiedLink } from "./embodied-link.js";
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

/** The patient's age in the UI language as clinicians write it ("8岁4个月", "18 hours"): core `patientAgeText`. */
export function ageText(c: CaseDefinition): string {
  return patientAgeText(c.patient, getLocale());
}

export function sexText(c: CaseDefinition): string {
  return tr(`sex.${c.patient.sex}` as "sex.male");
}

/** A companion's look when the case authors none: an adult visitor in day clothes. */
const VISITOR: Partial<CaseDefinition["patient"]["appearance"]> = { shirt: "#8c6d9e", pants: "#3d3a4a", hairStyle: "short", stature: "adult" };

export function patientFor(c: CaseDefinition, f: FacilityDefinition, locale: string): WorldPatient | null {
  const slot = slotFor(c, f);
  if (!slot) return null;
  const name = t(c.patient.displayName, locale);
  const companion = c.patient.persona.companion;
  return {
    slotId: slot.id,
    caseId: c.id,
    name,
    appearance: c.patient.appearance,
    posture: c.patient.posture ?? slot.posture ?? "standing",
    tag: tr("patient.tag", { age: ageText(c), sex: sexText(c) }),
    // the case's companion stands at the patient's side (drawn; the world model has no body for them)
    ...(companion
      ? { companion: { appearance: { ...VISITOR, gown: false, accessory: "none", ...(companion.appearance ?? {}) }, label: tr("companion.tag", { role: tr(`companionRole.${companion.role}` as "companionRole.parent"), name: t(companion.name, locale) }) } }
      : {}),
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

/** A destination (waypoint / walk target): `level` in a multi-level facility. */
export interface Destination {
  x: number;
  z: number;
  label: string;
  level?: string;
}

export type Route =
  | { panel: "conversation"; agent: string; staffId?: string; staffRole?: string; name?: string }
  | { panel: "orders"; placementId: string }
  | { panel: "device"; placementId: string }
  | { panel: "monitor"; placementId: string | null }
  | { panel: "board" }
  | { panel: "atlas" }
  | { panel: "craft" }
  | { panel: "elevator"; connectorId: string; level: string; name: string; stops: string[] }
  /** Embodied mode: an operation on equipment through the world model (a sink's `wash_hands`). */
  | { panel: "world-op"; targetId: string; operation: string; title: string }
  | { panel: "toast"; title: string; body?: string };

/** Facility staff role → session agent profile (the session's own mapping: a staff member addressed by name speaks through it). */
export { STAFF_AGENT };

export function routeInteraction(target: InteractionTarget, ctx: { caseDef: CaseDefinition | null; slotId: string | null; embodied?: boolean }): Route {
  switch (target.kind) {
    case "patient":
      if (ctx.caseDef && target.caseId === ctx.caseDef.id) return { panel: "conversation", agent: "patient" };
      return { panel: "toast", title: target.name, body: target.hint };
    case "staff":
      return { panel: "conversation", agent: STAFF_AGENT[target.role] ?? "nurse", staffId: target.staffId, staffRole: target.role, name: target.name };
    case "door":
      return { panel: "toast", title: target.name };
    case "elevator":
      // the call panel outside the car is handled by the world (the car door opens); inside: choose a floor
      return { panel: "elevator", connectorId: target.connectorId, level: target.level, name: target.name, stops: target.stops };
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
        case "sink":
          // embodied: washing hands is a world operation (hygiene for the operations that need it)
          if (ctx.embodied) return { panel: "world-op", targetId: `eq:${target.placementId}`, operation: "wash_hands", title: target.name };
          return { panel: "toast", title: target.name, body: target.hint };
        default:
          return { panel: "toast", title: target.name, body: target.hint };
      }
  }
}

/* ------------------------------------------------------------------ */
/* Per-game link                                                       */
/* ------------------------------------------------------------------ */

/**
 * Who to animate for a line (null: nobody): a narration is nobody's words (the patient cannot speak, an aside, a
 * movement request carried out); the patient or their companion by the line's agent; a colleague by the staff id
 * the line (or its turn) names — else the one who stands for that agent here, else the window open now.
 */
export function lineSpeaker(
  msg: Pick<Extract<EventMsg, { type: "agent_message" }>, "agent" | "grounding" | "staffId">,
  ctx: { slotId: string | null; turnStaff?: string | null; staffFor?: (agent: string) => string | null; activeStaff?: () => string | null },
): { kind: "patient" | "companion" | "staff"; id: string } | null {
  if (msg.grounding === "narrated") return null;
  const agent = String(msg.agent);
  if (agent === "patient" || agent === "companion") return ctx.slotId ? { kind: agent, id: ctx.slotId } : null;
  const staff = msg.staffId ?? ctx.turnStaff ?? ctx.staffFor?.(agent) ?? ctx.activeStaff?.() ?? null;
  return staff ? { kind: "staff", id: staff } : null;
}

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
  /** Staff currently in conversation (the last resort of the speaking animation: a line that names nobody). */
  activeStaff: () => string | null;
  /** The staff member who stands for a session agent here (`@nurse` → the nurse the world would send), or null. */
  staffFor?: (agent: string) => string | null;
  /** An agent drives a body (embodied: autopilot, clinician, delegated staff, a world walk) — real-time ticks pause. */
  agentDriving?: () => boolean;
  /** The embodied controller (null: clinical mode). */
  embodied?: () => EmbodiedLink | null;
}

export class GameWorldLink {
  readonly stations: Stations;
  /** A destination picked on the map or "go to <station>" (wins until the objective changes). */
  manual: Destination | null = null;
  private manualObjective = -1;
  private lastWaypointKey = "";
  private speakTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** The staff member each running turn speaks as (`turn_started.staffId`). */
  private readonly turnStaff = new Map<string, string>();
  private tick: ReturnType<typeof setInterval> | null = null;
  private lastTick = performance.now();
  private offEntry: () => void;
  private offChange: () => void;
  private walkAbort: AbortController | null = null;
  private distressed = false;
  private accessory: string | null = null;
  private posture: string | null = null;

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
  destination(): Destination | null {
    const snap = this.o.app.store.snapshot;
    if (this.manual && snap && snap.progress.currentIndex === this.manualObjective) return this.manual;
    this.manual = null;
    if (snap?.waypoint) return this.resolveTarget(snap.waypoint);
    // Every chapter done but not yet finished: back to the evidence board (V4 behaviour).
    if (snap && snap.progress.complete && !snap.state.finished) return this.resolveTarget("board");
    return null;
  }

  setManual(dest: Destination | null): void {
    this.manual = dest;
    this.manualObjective = this.o.app.store.snapshot?.progress.currentIndex ?? -1;
    this.lastWaypointKey = "";
    this.syncWaypoint();
  }

  /** Resolve a waypoint/walk target string to world coordinates. */
  resolveTarget(target: string): Destination | null {
    const world = this.o.world();
    const locale = this.o.locale();
    if (target === "patient" && this.o.slotId) {
      const loc = world?.locate(this.o.slotId);
      if (loc) return loc;
    }
    const from = world ? { x: world.position.x, z: world.position.z } : undefined;
    // multi-level facilities: "nearest" prefers the learner's own floor
    const level = world && world.levels().length > 1 ? world.position.level : undefined;
    // Bedside kit (monitor, pumps, ECG cart…) means the patient's own, wherever the learner stands.
    const hit = resolveWaypoint(this.o.facility, this.o.catalogs, target, { ...(from ? { from } : {}), ...(level ? { level } : {}), locale, ...(this.o.slotId ? { slotId: this.o.slotId, preferPatientSlot: true } : {}) });
    if (hit) return hit;
    return world?.locate(target) ?? null;
  }

  syncWaypoint(): void {
    const world = this.o.world();
    if (!world) return;
    const dest = this.destination();
    const key = dest ? `${dest.x.toFixed(1)},${dest.z.toFixed(1)},${dest.level ?? ""},${dest.label}` : "";
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
    if (world && this.o.slotId && this.accessory) world.setPatientState(this.o.slotId, { accessory: this.accessory as "oxygen-mask" });
    if (world && this.o.slotId && this.posture && !this.o.embodied?.()) world.setPatientState(this.o.slotId, { posture: this.posture as "lying" });
  }

  private speak(id: string, kind: "patient" | "companion" | "staff", text: string): void {
    const world = this.o.world();
    if (!world) return;
    const set = (v: boolean) => (kind === "patient" ? world.setPatientState(id, { speaking: v }) : kind === "companion" ? world.setCompanionSpeaking(id, v) : world.setStaffSpeaking(id, v));
    set(true);
    const key = `${kind}:${id}`;
    const prev = this.speakTimers.get(key);
    if (prev) clearTimeout(prev);
    this.speakTimers.set(
      key,
      setTimeout(() => set(false), Math.min(9000, 900 + text.length * 70)),
    );
  }

  private onEntry(entry: LogEntry): void {
    if (entry.kind !== "event") return;
    const msg = entry.event.msg;
    const world = this.o.world();
    if (msg.type === "turn_started") {
      if (msg.staffId) this.turnStaff.set(msg.turnId, msg.staffId);
    } else if (msg.type === "turn_complete" || msg.type === "turn_aborted") {
      this.turnStaff.delete(msg.turnId);
    } else if (msg.type === "agent_message") {
      const who = lineSpeaker(msg, { slotId: this.o.slotId, turnStaff: this.turnStaff.get(msg.turnId) ?? null, staffFor: this.o.staffFor, activeStaff: this.o.activeStaff });
      if (who) this.speak(who.id, who.kind, msg.text);
    } else if (msg.type === "state_snapshot" && world && this.o.slotId) {
      // what a bystander sees (core `patientCues`, the same cues the world model shows agents): a sick patient
      // looks sick (a critical alarm, or no monitor yet and in extremis), oxygen on the face
      const cues = patientCues(this.o.caseDef, msg.state);
      if (cues.distressed !== this.distressed) {
        this.distressed = cues.distressed;
        world.setPatientState(this.o.slotId, { distressed: cues.distressed });
      }
      if (cues.accessory && cues.accessory !== this.accessory) {
        this.accessory = cues.accessory;
        world.setPatientState(this.o.slotId, { accessory: cues.accessory });
      }
      // the posture clinical state gives (G12: lying flat, sitting up): in embodied mode the world model says it,
      // with where the patient is (a scanner table forces lying) — the embodied link draws that
      if (cues.posture !== this.posture) {
        this.posture = cues.posture;
        if (!this.o.embodied?.()) world.setPatientState(this.o.slotId, { posture: cues.posture });
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
    const embodied = this.o.embodied?.();
    if (embodied) {
      // embodied: the legacy `walk_to` maps onto a world navigation (planned and timed by the world)
      const r = await embodied.goTo({ kind: "point", x: dest.x, z: dest.z, ...(dest.level ? { level: dest.level } : {}) }, dest.label);
      respond(r?.status === "completed", r?.message ?? `could not walk to ${dest.label}`);
      return;
    }
    this.walkAbort?.abort();
    const ctrl = new AbortController();
    this.walkAbort = ctrl;
    try {
      world.setWaypoint(dest);
      await world.walkTo({ x: dest.x, z: dest.z, ...(dest.level ? { level: dest.level } : {}) }, ctrl.signal);
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
    // an agent drives a body: the world charges that time (travel, procedures) — real time would count it twice
    if (this.o.agentDriving?.()) return;
    const c = this.o.caseDef;
    if (c.clock.mode !== "simulated" || c.clock.realtimeScale <= 0) return;
    try {
      this.o.app.session.advanceRealTime(Math.min(dt, 1000));
    } catch (err) {
      console.error(err);
    }
  }
}
