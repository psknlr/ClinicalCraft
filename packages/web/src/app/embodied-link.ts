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
 *                  parked, locks; delegated staff walking are announced; a body moved by an agent pauses
 *                  the real-time clock (`agentDriving`), so travel is charged once (by the world).
 */
import { actionIntent } from "@clinicalcraft/agent";
import { regionAt, t, type CaseDefinition, type ClinicalAction, type FacilityDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type ActorId, type NavGoal, type NavPlan, type WorldActionRequest, type WorldActionResult, type WorldEvent, type WorldRuntime } from "@clinicalcraft/world";
import type { BodyMove, WorldApi } from "../contracts.js";
import { tr, trMaybe } from "../i18n/index.js";
import type { ActionFeedback } from "../ui/feedback.js";
import { placementIdOf, staffIdOf, type BrowserMover } from "./embodied.js";
import type { AppSession } from "./session.js";
import { approachDecision, bedsideCapsNow, checkIsRange, commandRefusal, entitySpot, refusalLead, resultIsRange } from "./spatial.js";
import type { LogEntry } from "./store.js";

/** World tools during which an agent may drive a body: real-time ticks pause (EMBODIED R8). */
export const BODY_TOOLS: ReadonlySet<string> = new Set(["navigate_to", "approach_object", "look_at", "interact_object", "delegate_task", "execute_skill"]);

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

export class EmbodiedLink {
  private lastPose = "";
  private readonly pending = new Map<string, Pending>();
  /** Actor → kind of its current world task (a `move_to` pushes a cart). */
  private readonly tasks = new Map<ActorId, string>();
  /** Stored device states (ECG cart…) as the world reports them. */
  private readonly states = new Map<string, string>();
  private seq = 0;
  private readonly offEntry: () => void;
  private offWorld: () => void = () => undefined;
  private disposed = false;

  constructor(private readonly o: EmbodiedLinkOptions) {
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
      if (!e.portable) continue;
      const pid = placementIdOf(e.id);
      if (!pid) continue;
      const st = snap.entities[e.id];
      if (st?.heldBy) api.placeEquipment(pid, null);
      else if (st?.position) api.placeEquipment(pid, { x: st.position.x, y: st.position.y, z: st.position.z, level: st.position.level, ...(st.position.rot !== undefined ? { rot: st.position.rot } : {}) });
      else api.placeEquipment(pid, "home");
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
      default:
        return;
    }
  }

  /** A device's stored behaviour state (ECG cart: idle / prepared / connected / completed), else null. */
  deviceState(entityId: string): string | null {
    return this.states.get(entityId) ?? null;
  }

  /** The cart an actor pushes in its current `move_to`: the portable cart nearest to it (within 2.5 m). */
  pushing(actorId: ActorId): string | null {
    const world = this.world;
    if (!world || this.tasks.get(actorId) !== "move_to") return null;
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
    const world = this.world;
    const intent = actionIntent(action);
    if (!world || !intent || this.o.mover.isMoving(PRIMARY_ACTOR)) return this.o.app.act(action, rationale);
    this.syncPose();
    const check = world.checkSpatial(PRIMARY_ACTOR, intent);
    if (check.ok) return this.o.app.act(action, rationale);
    const alias = `web-act-${++this.seq}`;
    const plan = check.hint ? world.plan(PRIMARY_ACTOR, check.hint.goal) : null;
    const decision = approachDecision(check.hint, checkIsRange(check), plan);
    if (decision.kind === "approach") {
      void this.approach(decision.goal).then((ok) => {
        if (this.disposed) return;
        if (ok) {
          // retry once (the session checks again: a refusal now shows "Go there")
          this.o.app.store.linkSubmission(alias, this.o.app.act(action, rationale));
          return;
        }
        this.refuse(alias, check.message, check.hint?.goal ?? null, check.hint?.label ?? null);
      });
      return alias;
    }
    this.refuse(alias, check.message, decision.goal, decision.label);
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
    if (!r || this.disposed) return r;
    if (retry && r.hint && resultIsRange(r)) {
      const plan = this.world?.plan(PRIMARY_ACTOR, r.hint.goal) ?? null;
      if (approachDecision(r.hint, true, plan).kind === "approach") {
        if (await this.approach(r.hint.goal)) return this.worldAction(request, false);
      }
    }
    if (r.status === "failed") this.o.feedback.show({ text: r.message, goal: r.hint?.goal ?? null, label: r.hint?.label ?? null, tone: "refused" });
    return r;
  }

  /** "Go there": walk the avatar to a goal the world named (`hint.goal`) — planned and timed by the world. */
  async goTo(goal: NavGoal, label: string | null): Promise<WorldActionResult | null> {
    const r = await this.submitWorld({ operation: "navigate", goal });
    if (!r || this.disposed) return r;
    if (r.status === "completed") this.o.toast(tr("toast.arrived"), label ?? "", "info", "go-there");
    else this.o.feedback.show({ text: r.message, goal: null, label: null, tone: "refused" });
    return r;
  }

  /** A short walk to `goal` (auto-approach); true when the avatar got there. */
  private async approach(goal: NavGoal): Promise<boolean> {
    const r = await this.submitWorld({ operation: "navigate", goal });
    return r?.status === "completed";
  }

  private refuse(alias: string, text: string, goal: NavGoal | null, label: string | null): void {
    this.o.app.store.refused(alias, text);
    this.o.feedback.show({ text, goal, label, tone: "refused" });
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
        if (refused) this.o.feedback.show({ text: refused.message || refusalLead(msg.text), goal: refused.hint?.goal ?? null, label: refused.hint?.label ?? null, tone: "refused" });
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
    const intent = action ? actionIntent(action) : null;
    const check = world && intent ? world.checkSpatial(PRIMARY_ACTOR, intent) : null;
    const hint = check && !check.ok ? check.hint : null;
    // the session's text names the model-facing tool call ("navigate_to {…}"): the learner gets the reason only
    const text = check && !check.ok ? check.message : refusalLead(message);
    this.o.feedback.show({ text, goal: hint?.goal ?? null, label: hint?.label ?? null, tone: "refused" });
  }

  /* ---------------------------------------------------------------- */
  /* What panels need                                                  */
  /* ---------------------------------------------------------------- */

  /** The patient's monitor in the world: the slot's linked monitor, else a monitor at the bedside (null: none). */
  patientMonitor(): string | null {
    const world = this.world;
    const slot = this.o.facility.patientSlots.find((s) => s.id === this.o.slotId);
    if (!world || !slot) return null;
    if (slot.monitor && world.entity(`eq:${slot.monitor}`)) return `eq:${slot.monitor}`;
    const patient = world.entity(`patient:${slot.id}`);
    for (const e of world.entities()) {
      if (e.interaction !== "monitor" || !patient || e.level !== patient.level) continue;
      if (Math.hypot(e.position.x - slot.x, e.position.z - slot.z) <= 6 || (e.room !== null && e.room === slot.room)) return e.id;
    }
    return null;
  }

  /**
   * Capabilities at the patient's bedside as the world counts them now: the personal kit, every in-service
   * device within the bedside radius or in the room — a cart wheeled over counts, one wheeled away not —
   * and the delivered capabilities (EMBODIED §6).
   */
  bedsideCaps(): Set<string> {
    const world = this.world;
    const patient = this.patientId();
    const at = patient ? world?.entity(patient) : null;
    if (!world || !at) return new Set();
    const snap = world.snapshot();
    const equipment = world
      .entities()
      .filter((e) => e.kind === "equipment")
      .flatMap((e) => {
        const st = snap.entities[e.id];
        const spot = entitySpot(snap, e.id, { x: e.position.x, z: e.position.z, level: e.level });
        return spot ? [{ id: e.id, capabilities: e.capabilities, x: spot.x, z: spot.z, level: spot.level, room: st?.position || st?.heldBy ? null : e.room, available: st?.available !== false }] : [];
      });
    return bedsideCapsNow(this.o.facility, this.o.slotId, equipment, at.level);
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
