/**
 * Staff working on their own (docs/TEAM.md §5; the engineering recommendations, P1-12). Each round — on the staff's
 * own clock (`staff_step`, sent by a front-end on a timer whatever the learner is looking at) and after every act —
 * every staff member observes, picks up what is theirs, moves with their own body and acts, without being told each
 * step:
 * - investigations: the circulating nurse fetches, reserves and brings the device, the study is acquired at the
 *   patient, reported and reviewed (`SessionStudies`);
 * - traction: a colleague holding a port who is no longer at the table has let go (`assist.ts`);
 * - alarms: the responsible anaesthetist of an anaesthetised patient recognises a new critical alarm, goes to the
 *   patient and says so — the response the simulation authors, no drug or treatment of their own;
 * - prescriptions: the dispensary reviews each version the prescriber signs, raises its query or confirms it, and
 *   supplies the confirmed version at the dispensing device with the dispenser's own body (`SessionPrescriptions`).
 * `states()` is each staff member's role state, derived from the authoritative record and the world (so a reload
 * agrees by construction): goal, task, location, responsibility, held items, reservations, pending requests and
 * what blocks them.
 */
import { anaesthetised, capabilityLabel, openAlarm, responsibleAnaesthetist, t, vitalsAt, type StaffPosition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { dropTractionAwayFromTable } from "./assist.js";
import { positionOf, roleCardOf } from "../characters/roles.js";
import { wordLine } from "../characters/voice.js";
import { characterModel } from "./character-models.js";
import { idleSupplier, syncProcedureSupply } from "./procedure-supply.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";

/** One staff member's state as the session knows it. */
export interface RoleState {
  actorId: string;
  name: string;
  role: string;
  /** The job they hold (docs/CHARACTERS.md): their role card's position. */
  position: StaffPosition | null;
  /** What they are there for now ("keep the patient anaesthetised", "hold the traction in port B", "acquire ord-2"). */
  currentGoal: string | null;
  /** What their body is doing (a walk, a device operation), if anything. */
  currentTask: string | null;
  location: { room: string | null; x: number; z: number; level: string } | null;
  /** What they are responsible for: the anaesthetic, a port, an order. */
  responsibility: string[];
  heldItems: string[];
  reservations: string[];
  pendingRequests: string[];
  blockedReason: string | null;
  lastObservation: number | null;
}

const DONE = new Set(["done", "declined", "escalated"]);

/** Who never touches a non-sterile device during the operation (they keep the sterile field). */
const STERILE: ReadonlySet<StaffPosition> = new Set<StaffPosition>(["scrub-nurse", "surgeon", "assistant-surgeon"]);

export class StaffAutonomy {
  /** Equipment a colleague could not switch on, by `device:reason` (said once each). */
  private readonly notReady = new Set<string>();

  constructor(private readonly k: SessionKernel) {}

  /** One round of what staff do on their own (never throws). */
  async step(id: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    if (!k.state.started || k.state.finished) return;
    try {
      dropTractionAwayFromTable(k, id);
      // equipment failing or brought in changes what the operator sees, whoever is looking
      syncProcedureSupply(k, id);
      await this.readyEquipment(id, signal);
      if (k.studies.available()) await k.studies.afterLearner(id, signal);
      // the dispensary: a version just signed reviewed, a confirmed one supplied at the dispensing device
      if (k.prescriptions.available()) await k.prescriptions.afterLearner(id, signal);
      await this.answerAlarm(id, signal);
    } catch (err) {
      k.emit(id, { type: "warning", message: `staff: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  /**
   * The circulating nurse keeps the operation's equipment running: a device in the patient's room that the operation
   * lacks and that is only switched off (a spare tower just brought in, a tower someone powered down) is switched on
   * by them with their own body — the world's own operation, its roles and its time — and they say what it gives
   * back. Never a sterile member of the team; nobody suitable in the room: the field says why, and the learner (or a
   * colleague asked by name) does it. A device out of service is not theirs to fix (a backup is fetched instead).
   */
  private async readyEquipment(id: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    const e = k.embodied;
    const need = e ? idleSupplier(k) : null;
    if (!e || !need) return;
    const w = e.world();
    const room = w.roomOf(need.device);
    const here = (k.facility?.staff ?? []).filter((s) => w.actor(`staff:${s.id}`) && w.roomOf(`staff:${s.id}`) === room && (!need.roles.length || need.roles.includes(s.role)));
    const position = (s: { id: string }) => positionOf(k.caseDef, k.facility, s.id);
    const who = here.find((s) => position(s) === "circulating-nurse") ?? here.find((s) => s.role === "nurse" && !STERILE.has(position(s) as StaffPosition));
    if (!who) return;
    const actorId = `staff:${who.id}`;
    const L = k.locale;
    const name = t(who.name, L);
    const device = w.entity(need.device);
    const deviceName = device ? t(device.name, L) : need.device;
    const caller = { agent: "nurse", submission: id, signal };
    let r = await e.act(caller, { actorId, operation: "navigate", goal: { kind: "interact", id: need.device }, onBehalfOf: PRIMARY_ACTOR }, signal);
    if (signal.aborted) return;
    if (r.status === "completed") r = await e.act(caller, { actorId, operation: need.operation, targetId: need.device, onBehalfOf: PRIMARY_ACTOR }, signal);
    if (signal.aborted) return;
    const labels = need.capabilities.map((c) => capabilityLabel(c, L));
    const supplies = L === "zh-CN" ? labels.join("、") : labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}` : (labels[0] ?? "");
    if (r.status !== "completed") {
      const reason = (r.message || "").split("\n")[0]!;
      const key = `${need.device}:${reason}`;
      if (this.notReady.has(key)) return;
      this.notReady.add(key);
      const text = await this.line(who.id, name, rt(L, "staff.equipment.notOn", { device: deviceName, reason }), "the operation needs a device in the room that is switched off, and you could not switch it on", [`${deviceName} is switched off`, `why it failed: ${reason}`], signal);
      k.speakLine(id, { agent: "nurse", speaker: name, text, grounded: [], staffId: who.id });
      k.conversations.addDialogue({ who: "nurse", speaker: name, text });
      return;
    }
    // the record follows the device at once, so the field and every view agree before anyone looks
    syncProcedureSupply(k, id);
    const text = await this.line(who.id, name, rt(L, "staff.equipment.on", { device: deviceName, supplies }), "you have just switched on a device the operation needs", [`${deviceName} is now switched on`, `it now supplies: ${supplies}`], signal);
    k.speakLine(id, { agent: "nurse", speaker: name, text, grounded: [], staffId: who.id });
    k.conversations.addDialogue({ who: "nurse", speaker: name, text });
  }

  /**
   * The responsible anaesthetist's response to critical alarms, one episode each in the record (`alarm-response`):
   * a new alarm is detected; they go to the patient with their own body; the world must confirm them there before
   * anyone hears "I'm at the patient" (`arrived`). A walk that fails — a locked door, no route — is recorded with its
   * reason (`blocked`) and said once, and the walk is tried again every round until it succeeds; an alarm that is no
   * longer critical closes its episode (`cleared`). A save and resume replays the episodes: an arrival already said is
   * never said again, and a blocked responder keeps trying.
   */
  private async answerAlarm(id: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    const c = k.caseDef;
    const e = k.embodied;
    if (!e) return;
    const v = vitalsAt(c, k.state);
    const critical = v.alarms.filter((a) => a.level === "critical");
    // an alarm no longer critical ends its episode (a recurrence is a new one)
    for (const ep of k.state.alarms ?? []) if (ep.stage !== "cleared" && !critical.some((a) => a.vital === ep.vital)) k.dispatch({ type: "alarm-response", alarm: { op: "cleared", vital: ep.vital }, by: "system" }, id);
    if (!anaesthetised(c, k.state)) return;
    const staffId = responsibleAnaesthetist(c, k.state);
    const patient = e.patientId();
    if (!staffId || !patient) return;
    const actorId = `staff:${staffId}`;
    if (!e.world().actor(actorId)) return;
    for (const a of critical) if (!openAlarm(k.state, a.vital)) k.dispatch({ type: "alarm-response", alarm: { op: "detect", vital: a.vital, value: Math.round(a.value), by: staffId }, by: "system" }, id);
    const pending = critical.filter((a) => openAlarm(k.state, a.vital)?.stage !== "arrived");
    if (!pending.length) return;
    const L = k.locale;
    const staff = k.facility?.staff.find((s) => s.id === staffId);
    const name = staff ? t(staff.name, L) : staffId;
    const vitals = pending.map((a) => `${a.vital.toUpperCase()} ${Math.round(a.value)}`).join(", ");
    const atPatient = () => e.world().checkSpatial(actorId, { tool: "examine", kind: "examine" }).ok;
    let reason: string | null = null;
    if (!atPatient()) {
      const r = await e.act({ agent: "attending", submission: id, signal }, { actorId, operation: "navigate", goal: { kind: "interact", id: patient }, onBehalfOf: PRIMARY_ACTOR }, signal);
      if (signal.aborted) return;
      if (r.status !== "completed" || !atPatient()) reason = (r.message || rt(L, "staff.alarm.noWay")).split("\n")[0]!;
    }
    if (reason) {
      // not there: recorded with its reason, said once per new reason; the walk is tried again next round
      const fresh = pending.filter((a) => openAlarm(k.state, a.vital)?.reason !== reason);
      for (const a of fresh) k.dispatch({ type: "alarm-response", alarm: { op: "blocked", vital: a.vital, by: staffId, reason }, by: "system" }, id);
      if (fresh.length) {
        const text = await this.line(staffId, name, rt(L, "staff.alarm.blocked", { vitals, reason }), "a new critical alarm on the monitor of the anaesthetised patient you are responsible for; you cannot get to the patient", [`critical alarm: ${vitals}`, `you cannot get to the patient: ${reason}`], signal, "away");
        k.speakLine(id, { agent: "attending", speaker: name, text, grounded: [], staffId });
        k.conversations.addDialogue({ who: "attending", speaker: name, text });
      }
      return;
    }
    // the world has them at the patient: now, and only now, it is said
    for (const a of pending) k.dispatch({ type: "alarm-response", alarm: { op: "arrived", vital: a.vital, by: staffId }, by: "system" }, id);
    const text = await this.line(staffId, name, rt(L, "staff.alarm.answered", { vitals }), "a new critical alarm on the monitor of the anaesthetised patient you are responsible for; you are now at the patient", [`critical alarm: ${vitals}`, "you are at the patient, checking"], signal, "at-patient");
    k.speakLine(id, { agent: "attending", speaker: name, text, grounded: [], staffId });
    k.conversations.addDialogue({ who: "attending", speaker: name, text });
  }

  /** A staff line: the template, or the speaker's own words when characters are model-driven and grounded. */
  private async line(staffId: string, name: string, template: string, intent: string, facts: string[], signal: AbortSignal, where?: "at-patient" | "away"): Promise<string> {
    const k = this.k;
    const staff = k.facility?.staff.find((s) => s.id === staffId);
    const worded = await wordLine({
      speaker: name,
      card: roleCardOf(k.caseDef, k.facility, staffId),
      intent,
      facts,
      template,
      ...(where ? { where } : {}),
      locale: k.locale,
      model: characterModel(k, staff?.role ?? "attending"),
      timeoutMs: k.settings.characters.timeoutMs,
      staffNames: (k.facility?.staff ?? []).map((s) => t(s.name, k.locale)),
      signal,
    });
    if (worded.refused && k.settings.characters.engine === "llm") k.recorder?.record("diagnostic", { agent: "attending", source: "characters", detail: [JSON.stringify({ source: "line", speaker: staffId, refused: worded.refused })] });
    return worded.text;
  }

  /** Every staff member's role state now (derived: a reload agrees). */
  states(): RoleState[] {
    const k = this.k;
    const e = k.embodied;
    if (!e) return [];
    const w = e.world();
    const c = k.caseDef;
    const L = k.locale;
    const s = k.state;
    const snapshot = w.snapshot().entities;
    const anaesthetist = anaesthetised(c, s) ? responsibleAnaesthetist(c, s) : null;
    const team = k.team.checkpoint();
    return w.actors().flatMap((a) => {
      if (!a.id.startsWith("staff:")) return [];
      const sid = a.id.slice("staff:".length);
      const ent = w.entity(a.id);
      const name = ent ? t(ent.name, L) : sid;
      const responsibility: string[] = [];
      if (anaesthetist === sid) responsibility.push("anaesthesia");
      for (const p of s.procedure?.ports ?? []) if (p.holder === sid) responsibility.push(`port ${p.site}`);
      const orders = (s.studies?.orders ?? []).filter((o) => o.assignee === sid && !o.accessions.length);
      for (const o of orders) responsibility.push(o.id);
      const reservations = Object.entries(snapshot).flatMap(([eid, st]) => (st.reservedBy === a.id ? [eid] : []));
      // the care team's work of theirs (a member is a staff id): requests not yet answered, tasks not yet done
      const pending = (team?.state.messages ?? []).filter((m) => m.to === sid && m.kind === "request" && !(team?.state.messages ?? []).some((r) => r.thread === m.thread && r.from === sid)).map((m) => m.id);
      const tasks = (team?.state.tasks ?? []).filter((x) => x.owner === sid && !DONE.has(x.status));
      for (const x of tasks) responsibility.push(`task ${x.id}`);
      const port = s.procedure?.ports.find((p) => p.holder === sid)?.site;
      const supply = k.prescriptions.goalOf(sid);
      if (supply) responsibility.push(supply);
      const goal = anaesthetist === sid ? rt(L, "staff.goal.anaesthesia") : port ? rt(L, "staff.goal.traction", { port }) : orders[0] ? rt(L, "staff.goal.study", { order: orders[0].id }) : (supply ?? (tasks[0] ? tasks[0].need : null));
      return [
        {
          actorId: a.id,
          name,
          role: a.role,
          position: positionOf(c, k.facility, sid),
          currentGoal: goal,
          currentTask: a.task?.label ?? tasks[0]?.id ?? null,
          location: { room: w.roomOf(a.id), x: Math.round(a.pose.x * 100) / 100, z: Math.round(a.pose.z * 100) / 100, level: a.pose.level },
          responsibility,
          heldItems: [...a.holding],
          reservations,
          pendingRequests: pending,
          blockedReason: orders.find((o) => o.waiting)?.waiting?.reason ?? null,
          lastObservation: s.clock,
        },
      ];
    });
  }
}
