/**
 * The 3D world as an embodied runtime (docs/EMBODIED.md R1, R3, R8, §6) —
 * one controller per game in embodied mode:
 *
 *   input device   the human avatar's pose goes to the world model (`world_pose`, ~10 Hz, out of band;
 *                  synced again right before anything position-dependent is submitted)
 *   same path      the learner's clinical actions are checked against the world (`checkSpatial`) before
 *                  they are submitted — a refusal only about distance within the 5.5 m aim reach walks the
 *                  avatar there (the world plans, the Mover animates, the world charges the time) and
 *                  retries once; otherwise the localised refusal with "Go there". Equipment operations go
 *                  through `world_action` ops the same way.
 *   view           the scene follows the world: staff where the world has them, carts where they were
 *                  parked, the patient where the world has them (a transport: lying on the trolley the
 *                  walker pushes; a transfer: in the new bed space; the posture clinical state gives —
 *                  EMBODIED §8), locks; delegated staff walking are announced; a body moved by an agent pauses
 *                  the real-time clock (`agentDriving`), so travel is charged once (by the world).
 */
import { actionIntent } from "@clinicalcraft/agent";
import { regionAt, t, type CaseDefinition, type ClinicalAction, type FacilityDefinition } from "@clinicalcraft/core";
import type { Op } from "@clinicalcraft/agent";
import { PRIMARY_ACTOR, type ActionHint, type ActorId, type ClinicalIntent, type NavGoal, type NavPlan, type PatientPlace, type WorldActionRequest, type WorldActionResult, type WorldEvent, type WorldRuntime } from "@clinicalcraft/world";
import type { BodyMove, PatientSpot, WorldApi } from "../contracts.js";
import { tr, trMaybe } from "../i18n/index.js";
import type { ActionFeedback, FeedbackItem } from "../ui/feedback.js";
import { placementIdOf, staffIdOf, type BrowserMover } from "./embodied.js";
import type { AppSession } from "./session.js";
import { approachDecision, checkIsRange, commandRefusal, entitySpot, learnerText, refusalLead, resultIsRange, type ScreenState } from "./spatial.js";
import type { LogEntry } from "./store.js";
import { prerequisiteOf, WorldView, type ScreenView, type Verdict } from "./world-view.js";

/** World tools during which an agent may drive a body: real-time ticks pause (EMBODIED R8). */
export const BODY_TOOLS: ReadonlySet<string> = new Set(["navigate_to", "approach_object", "look_at", "interact_object", "transport_patient", "delegate_task", "execute_skill"]);

/** Error codes that end a learner world action before the world ran it (no result will come). */
const DEAD_CODES: ReadonlySet<string> = new Set(["not_embodied", "invalid_op", "closed", "internal"]);

/** How long (ms) a world action may stay without a result after the session reported a problem with it. */
const STALE_MS = 10_000;


export interface EmbodiedLinkOptions {
  app: AppSession;
  renderer(): WorldApi | null;
  mover: BrowserMover;
  facility: FacilityDefinition;
  caseDef: CaseDefinition;
  slotId: string | null;
  feedback: ActionFeedback;
  toast(title: string, body?: string, level?: "info" | "success" | "warning" | "critical", key?: string): void;
  locale(): string;
}

type Pending = { resolve: (r: WorldActionResult | null) => void; submission: string; timer: ReturnType<typeof setTimeout> | null };

export type { ScreenView, Verdict } from "./world-view.js";

export class EmbodiedLink {
  private lastPose = "";
  private readonly pending = new Map<string, Pending>();
  /** Actor → kind of its current world task (a `move_to` pushes a cart). */
  private readonly tasks = new Map<ActorId, string>();
  /** Stored device states (ECG cart…) as the world reports them. */
  private readonly states = new Map<string, string>();
  private seq = 0;
  /** What the panels and the HUD may show, asked of the world (monitor, bedside, screen, verdicts). */
  readonly view: WorldView;
  private readonly offEntry: () => void;
  private offWorld: () => void = () => undefined;
  private disposed = false;

  constructor(private readonly o: EmbodiedLinkOptions) {
    this.view = new WorldView({ world: () => o.app.world(), facility: o.facility, caseDef: o.caseDef, slotId: o.slotId, state: () => o.app.session.state, locale: o.locale, syncPose: () => this.syncPose() });
    this.offEntry = o.app.store.onEntry((e) => this.onEntry(e));
    const world = this.world;
    if (world) {
      // synchronous world events: they arrive before the Mover is asked to move the body they concern
      this.offWorld = world.subscribe((ev) => this.onWorldEvent(ev));
      for (const [id, st] of Object.entries(world.snapshot().entities)) if (st.state) this.states.set(id, st.state);
    }
  }

  /** The encounter's world model (stable handle). */
  get world(): WorldRuntime | null {
    return this.o.app.world();
  }

  dispose(): void {
    this.disposed = true;
    this.offEntry();
    this.offWorld();
    for (const p of this.pending.values()) {
      if (p.timer) clearTimeout(p.timer);
      p.resolve(null);
    }
    this.pending.clear();
    this.o.feedback.clear();
  }

  /* ---------------------------------------------------------------- */
  /* The human avatar as an input device                               */
  /* ---------------------------------------------------------------- */

  /**
   * Send the avatar's pose to the world (`world_pose`) when it changed — on every throttled move of the
   * renderer (~10 Hz) and right before a position-dependent submission. Never while the world's Mover
   * drives the avatar (the world commits that pose itself).
   */
  syncPose(): void {
    const api = this.o.renderer();
    if (this.disposed || !this.world || !api || this.o.mover.isMoving(PRIMARY_ACTOR)) return;
    const p = api.position;
    if (![p.x, p.y, p.z, p.yaw, p.pitch].every(Number.isFinite)) return;
    const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)},${p.yaw.toFixed(3)},${p.pitch.toFixed(3)},${p.level}`;
    if (key === this.lastPose) return;
    this.lastPose = key;
    // out of band: applied at once, never queued, never transcribed (not logged into the store either)
    this.o.app.session.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, level: p.level } });
  }

  /** The player toggled a door with E: the world's door state follows the scene. */
  onDoor(doorId: string, open: boolean): void {
    const world = this.world;
    if (!world) return;
    try {
      world.setDoor(`door:${doorId}`, { open });
    } catch {
      /* a door the world does not know */
    }
  }

  /**
   * The player pressed E on a locked door: the learner's `unlock` goes to the world like any operation —
   * the world's key rules answer (porters and reception hold the keys: a refusal with its reason; a role
   * that may unlock it opens the lock, and the scene follows the `door.changed` event). True: handled.
   */
  unlockDoor(doorId: string): boolean {
    if (this.disposed || !this.world) return false;
    void this.worldAction({ operation: "unlock", targetId: `door:${doorId}` }, false);
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* The scene follows the world                                       */
  /* ---------------------------------------------------------------- */

  /**
   * Draw the world's physical state: staff where the world has them (a restored world, a rebuilt scene),
   * carts where they were parked (hidden while carried), door locks and stored door states.
   */
  syncScene(): void {
    const world = this.world;
    const api = this.o.renderer();
    if (!world || !api) return;
    const snap = world.snapshot();
    for (const a of snap.actors) {
      const sid = staffIdOf(a.id);
      if (!sid || this.o.mover.isMoving(a.id)) continue;
      const post = world.entity(a.id);
      const atPost = !!post && post.level === a.pose.level && Math.hypot(a.pose.x - post.position.x, a.pose.z - post.position.z) < 0.05;
      const drawn = api.staffPose(sid);
      const want = atPost && post ? { x: post.position.x, z: post.position.z, level: post.level } : { x: a.pose.x, z: a.pose.z, level: a.pose.level };
      if (drawn && drawn.level === want.level && Math.hypot(drawn.x - want.x, drawn.z - want.z) < 0.05) continue;
      api.placeStaff(sid, atPost ? null : a.pose);
    }
    for (const e of world.entities()) {
      const st = snap.entities[e.id];
      // carts and items; a trolley a patient was wheeled on (a bed parked beside a scanner) where it was left
      if (!e.portable && !st?.position) continue;
      const pid = placementIdOf(e.id);
      if (!pid) continue;
      if (st?.heldBy) api.placeEquipment(pid, null);
      else if (st?.position) api.placeEquipment(pid, { x: st.position.x, y: st.position.y, z: st.position.z, level: st.position.level, ...(st.position.rot !== undefined ? { rot: st.position.rot } : {}) });
      else api.placeEquipment(pid, "home");
    }
    // the patient where the world has them (and in the posture clinical state gives)
    if (this.o.slotId) {
      const place = world.patientPlace();
      api.placePatient(this.o.slotId, patientSpotOf(place, this.o.slotId));
      if (place && !patientSpotOf(place, this.o.slotId)) api.setPatientState(this.o.slotId, { posture: place.posture });
      // walking with someone (a restored world, a rebuilt scene): drawn following them again
      if (place?.escort) api.escortPatient(this.o.slotId, walkerOf(place.escort));
    }
    for (const d of world.collision.doors) {
      const st = snap.entities[d.id]?.door;
      api.setDoorLocked(d.id, !!st?.locked);
      api.setDoor(d.id, !!st?.open);
    }
  }

  private onWorldEvent(ev: WorldEvent): void {
    if (this.disposed) return;
    switch (ev.type) {
      case "door.changed":
        this.o.renderer()?.setDoorLocked(ev.entityId, ev.locked);
        return;
      case "task.changed":
        if (ev.task) this.tasks.set(ev.actorId, ev.task.kind);
        else this.tasks.delete(ev.actorId);
        return;
      case "entity.state":
        if (ev.to) this.states.set(ev.entityId, ev.to);
        else this.states.delete(ev.entityId);
        return;
      case "patient.moved": {
        // a transport ended (the walker's push stopped) or the team moved the patient: draw them there
        const api = this.o.renderer();
        if (!api || !this.o.slotId) return;
        const spot = patientSpotOf(ev.to, this.o.slotId);
        api.placePatient(this.o.slotId, spot);
        if (!spot) api.setPatientState(this.o.slotId, { posture: ev.to.posture });
        if (ev.by === null) this.o.toast(tr("emb.toast.patientMoved", { place: this.patientPlaceName(ev.to) }), "", "info", "patient-moved");
        return;
      }
      case "patient.escort": {
        // the patient walks with someone (EMBODIED §8.4): drawn following them; stopped: where the world placed them
        const api = this.o.renderer();
        if (!api || !this.o.slotId) return;
        api.escortPatient(this.o.slotId, ev.escort ? walkerOf(ev.escort) : null);
        if (ev.escort === PRIMARY_ACTOR) this.o.toast(tr("emb.toast.patientFollows", { patient: this.patientName() }), "", "info", "patient-escort");
        else if (!ev.escort && ev.actorId === null) this.o.toast(tr("emb.toast.patientStopped", { patient: this.patientName() }), "", "info", "patient-escort");
        return;
      }
      case "patient.posture": {
        // clinical state changed the posture (positioning, a transfer): the NPC follows
        const api = this.o.renderer();
        if (!api || !this.o.slotId) return;
        const place = this.world?.patientPlace() ?? null;
        const spot = patientSpotOf(place, this.o.slotId);
        if (spot) api.placePatient(this.o.slotId, spot);
        else api.setPatientState(this.o.slotId, { posture: ev.to });
        return;
      }
      default:
        return;
    }
  }

  /** The patient's name in the UI language. */
  private patientName(): string {
    return t(this.o.caseDef.patient.displayName, this.o.locale());
  }

  /** The name of where the patient is (a bed space's room, a device). */
  private patientPlaceName(place: PatientPlace): string {
    const world = this.world;
    const L = this.o.locale();
    if (place.provider) {
      const e = world?.entity(place.provider);
      if (e) return t(e.name, L);
    }
    return regionAt(this.o.facility, place.x, place.z, L, place.level);
  }

  /** A device's stored behaviour state (ECG cart: idle / prepared / connected / completed), else null. */
  deviceState(entityId: string): string | null {
    return this.states.get(entityId) ?? null;
  }

  /** A handheld item in the learner's hands: "held", or "equipped" when worn; null when the learner does not carry it. */
  carriedState(entityId: string): "held" | "equipped" | null {
    const world = this.world;
    if (!world?.actor(PRIMARY_ACTOR)?.holding.includes(entityId)) return null;
    return world.snapshot().entities[entityId]?.data?.equipped ? "equipped" : "held";
  }

  /**
   * The cart an actor pushes in its current `move_to` (the portable cart nearest to it, within 2.5 m), or the
   * trolley the patient lies on in its `transport_patient` (the world's `transit`).
   */
  pushing(actorId: ActorId): string | null {
    const world = this.world;
    if (!world) return null;
    if (this.tasks.get(actorId) === "transport_patient") {
      const transit = world.patientPlace()?.transit;
      return transit?.by === actorId && transit.trolley ? placementIdOf(transit.trolley) : null;
    }
    if (this.tasks.get(actorId) !== "move_to") return null;
    const actor = world.actor(actorId);
    if (!actor) return null;
    const snap = world.snapshot();
    let best: { id: string; d: number } | null = null;
    for (const e of world.entities()) {
      if (e.portable !== "cart") continue;
      const spot = entitySpot(snap, e.id, { x: e.position.x, z: e.position.z, level: e.level });
      if (!spot || spot.level !== actor.pose.level) continue;
      const d = Math.hypot(spot.x - actor.pose.x, spot.z - actor.pose.z);
      if (d <= 2.5 && (!best || d < best.d)) best = { id: e.id, d };
    }
    return best ? placementIdOf(best.id) : null;
  }

  /** The patient an actor takes along in its `transport_patient` (lying on the trolley, or walking): their slot and posture. */
  carrying(actorId: ActorId): { slotId: string; posture: "lying" | "standing" } | null {
    const world = this.world;
    if (!world || !this.o.slotId || this.tasks.get(actorId) !== "transport_patient") return null;
    const transit = world.patientPlace()?.transit;
    return transit?.by === actorId ? { slotId: this.o.slotId, posture: transit.posture === "lying" ? "lying" : "standing" } : null;
  }

  /** A body starts moving (Mover): delegated staff are announced. */
  onBodyStart(actorId: ActorId, plan: Extract<NavPlan, { ok: true }>): void {
    const world = this.world;
    if (!world || !staffIdOf(actorId)) return;
    const L = this.o.locale();
    const place = regionAt(this.o.facility, plan.target.x, plan.target.z, L, plan.target.level);
    this.o.toast(tr("emb.toast.walking", { who: this.staffName(actorId), place }), "", "info", `walk-${actorId}`);
  }

  /** A body stopped (Mover). */
  onBodyEnd(_actorId: ActorId, _move: BodyMove): void {
    /* the HUD reads `moving` on its next update */
  }

  /* ---------------------------------------------------------------- */
  /* Real time (EMBODIED R8)                                           */
  /* ---------------------------------------------------------------- */

  /** An agent drives a body now (autopilot / clinician turn, a body-moving world tool, a Mover walk): ticks pause. */
  agentDriving(): boolean {
    const store = this.o.app.store;
    if (this.o.mover.isMoving() || store.autopilotRunning || store.phaseOf("clinician") !== null) return true;
    return store.runningTools().some((c) => BODY_TOOLS.has(c.tool));
  }

  /* ---------------------------------------------------------------- */
  /* The learner's actions                                             */
  /* ---------------------------------------------------------------- */

  /**
   * A learner clinical action (panel buttons, `__QA__.act`): checked against the world first. Returns the
   * id the UI tracks it by (the submission id, or an alias linked to it once a short walk let it go).
   */
  act(action: ClinicalAction, rationale?: string): string {
    return this.gated(actionIntent(action), () => this.o.app.act(action, rationale));
  }

  /**
   * Learner words for the patient (or the companion at their side): a conversation in the room — the session's
   * `ask` requirement (EMBODIED §6), checked here first like a clinical act: said at once within earshot, after
   * a short walk when only the distance stands in the way, else the refusal with "Go there". Movement requests
   * ("Please follow me") take the same path; the session carries them out.
   */
  say(op: Extract<Op, { type: "user_message" }>, view?: string): string {
    const to = op.to ?? "patient";
    const intent: ClinicalIntent | null = (to === "patient" || to === "companion") && op.text.trim() ? { tool: "ask_patient", kind: "ask" } : null;
    return this.gated(intent, () => this.o.app.submit(op, view));
  }

  /** Run `run` (a submission) when the world allows `intent` from here — after a short walk — else refuse (see `act`). */
  private gated(intent: ClinicalIntent | null, run: () => string): string {
    const world = this.world;
    if (!world || !intent || this.o.mover.isMoving(PRIMARY_ACTOR)) return run();
    this.syncPose();
    const check = world.checkSpatial(PRIMARY_ACTOR, intent);
    if (check.ok) {
      // an earlier refusal no longer stands once the learner does something that can be done here
      this.o.feedback.clear();
      return run();
    }
    const alias = `web-act-${++this.seq}`;
    const plan = check.hint ? world.plan(PRIMARY_ACTOR, check.hint.goal) : null;
    const decision = approachDecision(check.hint, checkIsRange(check), plan);
    if (decision.kind === "approach") {
      // the short walk is said, not a surprise (the window may hide the world): "Walking over — Go to …"
      this.stepping(check.hint?.label ?? null);
      void this.approach(decision.goal).then((ok) => {
        if (this.disposed) return;
        if (ok) {
          if (this.o.feedback.current?.tone === "info") this.o.feedback.clear();
          // retry once (the session checks again: a refusal now shows "Go there")
          this.o.app.store.linkSubmission(alias, run());
          return;
        }
        this.refuse(alias, check.message, check.hint?.goal ?? null, check.hint?.label ?? null, prerequisiteOf(check), check.hint?.then);
      });
      return alias;
    }
    this.refuse(alias, check.message, decision.goal, decision.label, prerequisiteOf(check), check.hint?.then);
    return alias;
  }

  /**
   * A learner world action (`world_action` op): equipment operations from panels (monitor attach / NIBP /
   * read, ECG cart prepare / connect / record, sinks, carts…). A refusal only about distance within the aim
   * reach: a short walk, then once more; otherwise the refusal with "Go there". Resolves with the result
   * (null when the session refused the op itself).
   */
  async worldAction(request: Omit<WorldActionRequest, "actionId" | "actorId">, retry = true): Promise<WorldActionResult | null> {
    this.syncPose();
    const r = await this.submitWorld(request);
    if (r?.status === "completed") this.o.feedback.clear();
    if (!r || this.disposed) return r;
    if (retry && r.hint && resultIsRange(r)) {
      const plan = this.world?.plan(PRIMARY_ACTOR, r.hint.goal) ?? null;
      if (approachDecision(r.hint, true, plan).kind === "approach") {
        this.stepping(r.hint.label);
        if (await this.approach(r.hint.goal)) {
          if (this.o.feedback.current?.tone === "info") this.o.feedback.clear();
          return this.worldAction(request, false);
        }
      }
    }
    if (r.status === "failed") this.o.feedback.show({ text: learnerText(r.message), goal: r.hint?.goal ?? null, label: r.hint ? learnerText(r.hint.label) : null, tone: "refused", ...(r.hint?.then ? { then: r.hint.then } : {}) });
    return r;
  }

  /**
   * "Go there": walk the avatar to a goal the world named (`hint.goal`) — planned and timed by the world —
   * then, for a fetch (`hint.then`), do what the label promises: wheel the cart to the patient (`move_to`).
   */
  async goTo(goal: NavGoal, label: string | null, then?: ActionHint["then"]): Promise<WorldActionResult | null> {
    const r = await this.submitWorld({ operation: "navigate", goal });
    if (!r || this.disposed) return r;
    if (r.status === "completed" && then) return this.worldAction({ operation: then.operation, targetId: then.targetId, ...(then.goal ? { goal: then.goal } : {}), ...(then.parameters ? { parameters: then.parameters } : {}) });
    // arrived: where (a map point by the place's name; anything else as the world names it, not the instruction)
    if (r.status === "completed") this.o.toast(tr("toast.arrived"), goal.kind === "point" ? (label ?? "") : learnerText(r.message), "info", "go-there");
    else this.o.feedback.show({ text: learnerText(r.message), goal: null, label: null, tone: "refused" });
    return r;
  }

  /** Say that the body takes a few steps by itself before doing what the learner asked (info, no button). */
  private stepping(label: string | null): void {
    this.o.feedback.show({ text: label ? tr("emb.steppingTo", { label: learnerText(label) }) : tr("emb.stepping"), goal: null, label: null, tone: "info" });
  }

  /** A short walk to `goal` (auto-approach); true when the avatar got there. */
  private async approach(goal: NavGoal): Promise<boolean> {
    const r = await this.submitWorld({ operation: "navigate", goal });
    return r?.status === "completed";
  }

  private refuse(alias: string, text: string, goal: NavGoal | null, label: string | null, prerequisite: string | null = null, then?: ActionHint["then"]): void {
    const words = learnerText(text);
    this.o.app.store.refused(alias, words);
    this.o.feedback.show({ text: words, goal, label: label ? learnerText(label) : null, tone: "refused", ...(goal && then ? { then } : {}), ...this.firstAction(prerequisite) });
  }

  /** A refusal no walk fixes, with the act that does ("Peripheral IV access first"). */
  private firstAction(interventionId: string | null): Pick<FeedbackItem, "action"> {
    const iv = interventionId ? this.o.caseDef.interventions.find((x) => x.id === interventionId) : undefined;
    if (!iv) return {};
    return { action: { label: tr("emb.doFirst", { name: t(iv.name, this.o.locale()) }), run: () => void this.act({ type: "intervene", interventionId: iv.id }) } };
  }

  /** Submit a learner world action and wait for its result. */
  private submitWorld(request: Omit<WorldActionRequest, "actionId" | "actorId">): Promise<WorldActionResult | null> {
    if (!this.world || this.disposed) return Promise.resolve(null);
    const actionId = `web-${Date.now().toString(36)}-${++this.seq}`;
    return new Promise((resolve) => {
      const submission = this.o.app.submit({ type: "world_action", request: { ...request, actionId, actorId: PRIMARY_ACTOR } as WorldActionRequest });
      this.pending.set(actionId, { resolve, submission, timer: null });
    });
  }

  private settle(actionId: string, result: WorldActionResult | null): void {
    const p = this.pending.get(actionId);
    if (!p) return;
    this.pending.delete(actionId);
    if (p.timer) clearTimeout(p.timer);
    p.resolve(result);
  }

  private onEntry(entry: LogEntry): void {
    if (entry.kind !== "event" || this.disposed) return;
    const { id, msg } = entry.event;
    switch (msg.type) {
      case "world_action_result":
        this.settle(msg.result.actionId, msg.result);
        return;
      case "error":
      case "warning": {
        // a world action the session gave up on before the world ran it
        for (const [actionId, p] of this.pending) {
          if (p.submission !== id) continue;
          if (msg.type === "error" && msg.code && DEAD_CODES.has(msg.code)) this.settle(actionId, null);
          else if (!p.timer) p.timer = setTimeout(() => this.settle(actionId, null), STALE_MS);
        }
        // a learner clinical action the session refused for where the body stands (the body moved meanwhile,
        // or the UI's check could not tell): the refusal with "Go there"
        if (msg.type === "error" && (msg.code === "SPATIAL_REQUIREMENT_UNMET" || msg.code === "SPATIAL_PRECONDITION_CHANGED")) this.spatialError(id, msg.message);
        return;
      }
      case "command_output": {
        // a slash command (`/vitals`, `/order …`) refused for where the body stands: the reason, with "Go there"
        const refused = commandRefusal(msg.data);
        if (refused) this.o.feedback.show({ text: learnerText(refused.message || refusalLead(msg.text)), goal: refused.hint?.goal ?? null, label: refused.hint ? learnerText(refused.hint.label) : null, tone: "refused", ...(refused.hint?.then ? { then: refused.hint.then } : {}) });
        // `/delegate` (the conversation's delegate chips): its outcome
        if (msg.name === "delegate") this.delegated(delegationOf(msg.data));
        return;
      }
      case "tool_call_end":
        if (msg.tool === "delegate_task") this.delegated(delegationOf(msg.data));
        return;
      default:
        return;
    }
  }

  /** A delegated task ended: who did (or could not do) what. */
  private delegated(d: Delegation | null): void {
    if (!d?.staffId) return;
    const done = d.status === "completed";
    this.o.toast(tr(done ? "emb.toast.delegatedDone" : "emb.toast.delegatedFailed", { who: this.staffName(d.staffId), task: trTask(d.task) }), "", done ? "success" : "warning", `delegate-${d.staffId}`);
  }

  /** A staff member as the HUD names them: role and name ("Nurse Lin Xiao" / "护士林晓"). */
  private staffName(actorId: string): string {
    const world = this.world;
    const e = world?.entity(actorId);
    const name = e ? t(e.name, this.o.locale()) : actorId.replace(/^staff:/, "");
    const role = world?.actor(actorId)?.role;
    return role ? staffLabel(role, name) : name;
  }

  private spatialError(submission: string, message: string): void {
    const world = this.world;
    const op = [...this.o.app.store.log].reverse().find((e) => e.kind === "op" && e.id === submission);
    const action = op?.kind === "op" && op.op.type === "clinical_action" ? op.op.action : null;
    // words for the patient refused from across the hospital: the same `ask` requirement, with the way there
    const talk = op?.kind === "op" && op.op.type === "user_message" && (op.op.to === "patient" || op.op.to === "companion");
    const intent: ClinicalIntent | null = action ? actionIntent(action) : talk ? { tool: "ask_patient", kind: "ask" } : null;
    const check = world && intent ? world.checkSpatial(PRIMARY_ACTOR, intent) : null;
    const hint = check && !check.ok ? check.hint : null;
    // the session's text names the model-facing tool call ("navigate_to {…}"): the learner gets the reason only
    const text = learnerText(check && !check.ok ? check.message : refusalLead(message));
    this.o.feedback.show({ text, goal: hint?.goal ?? null, label: hint ? learnerText(hint.label) : null, tone: "refused", ...(hint?.then ? { then: hint.then } : {}), ...(check ? this.firstAction(prerequisiteOf(check)) : {}) });
  }

  /* ---------------------------------------------------------------- */
  /* What panels need                                                  */
  /* ---------------------------------------------------------------- */

  /** The world's patient monitor (`WorldView.patientMonitor`). */
  patientMonitor(): string | null {
    return this.view.patientMonitor();
  }

  /** Capabilities at the bedside as the world counts them now (`WorldView.bedsideCaps`). */
  bedsideCaps(): Set<string> {
    return this.view.bedsideCaps();
  }

  /** Can the learner read the patient's monitor screen from here (`WorldView.screen`)? */
  screen(): ScreenView {
    return this.view.screen();
  }

  /** The same for the HUD's strip, cheap while the body walks (`WorldView.screenKey`). */
  screenKey(now?: number): "readable" | ScreenState["reason"] {
    return this.view.screenKey(now);
  }

  /** The world's verdict on an act from where the body stands (`WorldView.verdict`). */
  verdict(action: ClinicalAction): Verdict {
    return this.view.verdict(action);
  }

  /**
   * Show a refused verdict without submitting anything: the world's words, "Go there" (the hint) or the act
   * to do first (a clinical prerequisite). For a panel row the learner clicked although it cannot be done here.
   */
  explain(v: Verdict): void {
    if (v.kind !== "refused") return;
    this.o.feedback.show({ text: v.message, goal: v.hint?.goal ?? null, label: v.hint?.label ?? null, tone: "refused", ...(v.hint?.then ? { then: v.hint.then } : {}), ...this.firstAction(v.prerequisite) });
  }

  /** The patient's entity id (`patient:<slot>`), or null. */
  patientId(): string | null {
    return this.o.slotId && this.world?.entity(`patient:${this.o.slotId}`) ? `patient:${this.o.slotId}` : null;
  }

  /** Where the learner's body is ("Resus room" / "outside"), the HUD badge. */
  placeLabel(): string | null {
    return this.o.app.session.placeLabel();
  }

  /** The avatar is being walked by the world (an agent, an auto-approach, "Go there"). */
  get walking(): boolean {
    return this.o.mover.isMoving(PRIMARY_ACTOR);
  }
}

/**
 * Where the renderer draws the patient for a place of the world model (EMBODIED §8): null in their own bed space
 * (the case's slot: drawn there in the posture clinical state gives), else the spot — position, posture and the
 * placement they lie or sit on.
 */
export function patientSpotOf(place: PatientPlace | null, slotId: string | null): PatientSpot | null {
  if (!place || (place.slot !== null && place.slot === slotId)) return null;
  return { x: place.x, z: place.z, level: place.level, rot: place.rot, posture: place.posture, support: place.support ? placementIdOf(place.support) : null };
}

/** The renderer's walker of an actor: "avatar" for the learner's body, the staff id of a staff member (null: undrawn). */
export function walkerOf(actorId: ActorId): string | null {
  return actorId === PRIMARY_ACTOR ? "avatar" : staffIdOf(actorId);
}

/** What the UI shows of a delegation's outcome. */
export interface Delegation {
  staffId: string | null;
  task: string;
  status: string;
}

/**
 * The delegation in a `delegate_task` result: a tool call's data (`{ delegation }`) or a `/delegate`
 * command's output data (`{ ok, data: { delegation } }`); null otherwise.
 */
export function delegationOf(data: unknown): Delegation | null {
  const pick = (v: unknown): Delegation | null => {
    const d = v && typeof v === "object" ? (v as { delegation?: unknown }).delegation : undefined;
    if (!d || typeof d !== "object") return null;
    const { staffId, task, status } = d as Record<string, unknown>;
    return typeof task === "string" && typeof status === "string" ? { staffId: typeof staffId === "string" ? staffId : null, task, status } : null;
  };
  return pick(data) ?? pick(data && typeof data === "object" ? (data as { data?: unknown }).data : undefined);
}

/** A staff member's role and name ("Nurse Lin Xiao" / "护士林晓"); the name alone when it already says the role. */
export function staffLabel(role: string, name: string): string {
  const label = trMaybe(`role.${role}`, "");
  if (!label || name.toLowerCase().includes(label.toLowerCase())) return name;
  return tr("emb.staff", { role: label, name });
}

/** A delegation task's name ("Attach the monitor" / "连接监护仪"), else its id. */
export function trTask(task: string): string {
  return trMaybe(`emb.task.${task}`, task);
}
