/**
 * Standing tasks of the staff, carried out on their own (docs/TEAM.md §5.1): after every act and on the staff's own
 * clock, each task of the case that has fallen due is taken up by the colleague it names — a clinic assistant who
 * brings the acupuncture cart to the couch and switches the heat lamp on once the patient has consented — without the
 * learner asking for a step.
 *
 * - Without a world the staff have no bodies: a due task is done at once.
 * - In in-world mode the colleague does it **with their own body**: a `fetch` step wheels a cart that provides the
 *   capability to the patient's side (the same delegation a learner could ask for — nothing to do when one stands
 *   there already); an `operate` step walks them to a device that provides the capability and runs the named operation
 *   of its behaviour through the world's action bus (nothing to do when the device is already in the state it leads
 *   to). Only then is the task recorded as done, and what the case has them say is said.
 * - What cannot proceed — nobody of that name or role in the facility, no device, no way there, an operation that
 *   fails — is recorded as blocked with its reason, said once per reason, and tried again every round.
 *
 * A standing task never acts on the patient: an operation with a clinical effect is refused (it is the clinician's).
 */
import { dueStaffTasks, staffTaskRecord, t, type ClinicalAction, type StaffTask } from "@clinicalcraft/core";
import { behaviorOf, PRIMARY_ACTOR, type WorldRuntime } from "@clinicalcraft/world";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { staffAgent } from "./staff-voice.js";

const firstLine = (text: string | undefined) => (text ?? "").split("\n")[0]!.replace(/[.。]\s*$/u, "");

export class SessionStaffTasks {
  /** What was said already, by `task:what` (a block: by its reason) — each once. */
  private readonly said = new Set<string>();

  constructor(private readonly k: SessionKernel) {}

  /** Does the case give its staff standing tasks? */
  available(): boolean {
    return (this.k.caseDef.staffTasks ?? []).length > 0;
  }

  /** After an act: every task that is due and not done is worked on by its colleague. Never throws. */
  async afterLearner(id: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    if (!this.available() || !k.state.started || k.state.finished) return;
    try {
      for (const task of dueStaffTasks(k.caseDef, k.state)) {
        await this.work(id, task, signal);
        if (signal.aborted) return;
      }
    } catch (err) {
      k.emit(id, { type: "warning", message: `staff task: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  /** Who does a task: the facility's staff member it names, else the first of the role it names (text mode: the name as written). */
  private who(task: StaffTask): { by: string; staffId: string | null; name: string; role: string } {
    const staff = this.k.facility?.staff ?? [];
    const s = staff.find((x) => x.id === task.staff) ?? staff.find((x) => x.role === task.staff);
    return { by: s?.id ?? task.staff, staffId: s?.id ?? null, name: s ? t(s.name, this.k.locale) : task.staff, role: s?.role ?? "nurse" };
  }

  private dispatch(action: ClinicalAction, id: string) {
    return this.k.dispatch(action, id);
  }

  /** A line in the colleague's own voice (once per key). */
  private say(id: string, task: StaffTask, key: string, text: string): void {
    if (this.said.has(key)) return;
    this.said.add(key);
    const k = this.k;
    const who = this.who(task);
    const agent = staffAgent(who.role) as never;
    k.speakLine(id, { agent, speaker: who.name, text, grounded: [], ...(who.staffId ? { staffId: who.staffId } : {}) });
    k.conversations.addDialogue({ who: staffAgent(who.role), speaker: who.name, text });
  }

  private async work(id: string, task: StaffTask, signal: AbortSignal): Promise<void> {
    const k = this.k;
    const L = k.locale;
    const who = this.who(task);
    const status = () => staffTaskRecord(k.state, task.id)?.status;
    const start = () => {
      if (status() !== "started") this.dispatch({ type: "staff-task", task: { op: "start", task: task.id, by: who.by }, by: "system" }, id);
    };
    const done = () => {
      this.dispatch({ type: "staff-task", task: { op: "done", task: task.id, by: who.by }, by: "system" }, id);
      if (status() === "done" && task.say) this.say(id, task, `${task.id}:done`, t(task.say, L));
    };
    const blocked = (reason: string) => {
      if (!status()) start();
      this.dispatch({ type: "staff-task", task: { op: "blocked", task: task.id, by: who.by, reason }, by: "system" }, id);
      this.say(id, task, `${task.id}:blocked:${reason}`, rt(L, "task.staff.blocked", { what: t(task.name, L), reason }));
    };
    const e = k.embodied;
    if (!e) {
      // no bodies: due is done
      start();
      return done();
    }
    const w = e.world();
    const actorId = who.staffId ? `staff:${who.staffId}` : null;
    if (!actorId || !w.actor(actorId)) return blocked(rt(L, "task.wait.noStaff"));
    start();
    for (const step of task.steps) {
      const home = k.facility?.staff.find((s) => s.id === who.staffId)?.room ?? null;
      const failure = "fetch" in step ? await this.fetch(id, actorId, step.fetch, signal) : await this.operate(id, w, actorId, who.role, home, step.operate, step.operation, signal);
      if (signal.aborted) return;
      if (failure) return blocked(failure);
    }
    done();
  }

  /** A cart that provides `capability` wheeled to the patient's side; the reason when it could not be (null: it stands there). */
  private async fetch(id: string, actorId: string, capability: string, signal: AbortSignal): Promise<string | null> {
    const k = this.k;
    const e = k.embodied!;
    const L = k.locale;
    const w = e.world();
    if (w.bedsideProviders(capability).length) return null;
    if (!w.entities().some((x) => x.kind === "equipment" && x.capabilities.includes(capability))) return rt(L, "task.wait.noDevice", { caps: capability });
    const r = await e.delegate(k.tools.context("nurse", id, signal), { role: actorId, task: "fetch_equipment", params: { capability } });
    if (r.ok && w.bedsideProviders(capability).length) return null;
    return firstLine(r.output) || rt(L, "task.wait.noDevice", { caps: capability });
  }

  /**
   * One operation of a device that provides `capability` and offers it — the one in the patient's room first, then one
   * in the room the colleague works in (`home`), then one where they are now, then the nearest; the reason when it
   * could not be run (null: done, or the device is in that state already). An operation with a clinical effect is the clinician's, and one that reserves the device would keep it
   * from whoever is to use it: neither is a colleague's standing task.
   */
  private async operate(id: string, w: WorldRuntime, actorId: string, role: string, home: string | null, capability: string, operation: string, signal: AbortSignal): Promise<string | null> {
    const k = this.k;
    const e = k.embodied!;
    const L = k.locale;
    const snapshot = w.snapshot().entities;
    const providers = w.entities().filter((x) => x.kind === "equipment" && x.capabilities.includes(capability) && snapshot[x.id]?.available !== false);
    if (!providers.length) return rt(L, "task.wait.noDevice", { caps: capability });
    const devices = providers.filter((x) => behaviorOf(x).operations.some((o) => o.id === operation)).map((x) => x.id);
    if (!devices.length) return rt(L, "task.wait.noOperation", { device: t(providers[0]!.name, L), operation });
    const patient = e.patientId();
    const pose = w.actor(actorId)?.pose;
    const far = (d: string) => {
      const e = w.entity(d);
      return e && pose ? Math.hypot(e.position.x - pose.x, e.position.z - pose.z) + (e.level === pose.level ? 0 : 1000) : Infinity;
    };
    const rooms = [patient ? w.roomOf(patient) : null, home, w.roomOf(actorId)].filter((r): r is string => r != null);
    const device = rooms.map((room) => devices.find((d) => w.roomOf(d) === room)).find((d) => d != null) ?? [...devices].sort((a, b) => far(a) - far(b))[0]!;
    const entity = w.entity(device)!;
    const name = t(entity.name, L);
    const op = behaviorOf(entity).operations.find((o) => o.id === operation)!;
    if (op.clinical || op.toolByParam) return rt(L, "task.wait.clinical", { device: name, operation });
    if (op.reserve) return rt(L, "task.wait.reserves", { device: name, operation });
    const state = w.inspect(actorId, device)?.state ?? snapshot[device]?.state ?? null;
    if (op.to !== undefined && state === op.to) return null;
    const caller = { agent: staffAgent(role), submission: id, signal };
    const walked = await e.act(caller, { actorId, operation: "navigate", goal: { kind: "interact", id: device }, onBehalfOf: PRIMARY_ACTOR }, signal);
    if (signal.aborted) return null;
    if (walked.status !== "completed") return rt(L, "task.wait.cannotReach", { device: name, reason: firstLine(walked.message) || "—" });
    let r = await e.act(caller, { actorId, operation, targetId: device, onBehalfOf: PRIMARY_ACTOR }, signal);
    // where the operation is done from is the device's own requirement (at the patient's side): the world says where
    if (r.status === "failed" && r.hint && !signal.aborted) {
      const there = await e.act(caller, { actorId, operation: "navigate", goal: r.hint.goal, onBehalfOf: PRIMARY_ACTOR }, signal);
      if (there.status === "completed") r = await e.act(caller, { actorId, operation, targetId: device, onBehalfOf: PRIMARY_ACTOR }, signal);
    }
    return r.status === "completed" ? null : firstLine(r.message) || rt(L, "task.wait.cannotReach", { device: name, reason: "—" });
  }

  /** The task a staff member is on now, for their role state (null: none). */
  goalOf(staffId: string): string | null {
    const k = this.k;
    for (const task of k.caseDef.staffTasks ?? []) {
      const r = staffTaskRecord(k.state, task.id);
      if (r && r.status !== "done" && this.who(task).staffId === staffId) return t(task.name, k.locale);
    }
    return null;
  }

  /** Why a staff member's task cannot go on now (null: nothing blocks them). */
  blockedOf(staffId: string): string | null {
    const k = this.k;
    for (const task of k.caseDef.staffTasks ?? []) {
      const r = staffTaskRecord(k.state, task.id);
      if (r?.status === "blocked" && this.who(task).staffId === staffId) return r.reason ?? null;
    }
    return null;
  }
}
