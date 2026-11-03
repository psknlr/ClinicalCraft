/**
 * Staff working on their own (docs/TEAM.md §5; the engineering recommendations, P1-12). Each round — on the staff's
 * own clock (`staff_step`, sent by a front-end on a timer whatever the learner is looking at) and after every act —
 * every staff member observes, picks up what is theirs, moves with their own body and acts, without being told each
 * step:
 * - investigations: the circulating nurse fetches, reserves and brings the device, the study is acquired at the
 *   patient, reported and reviewed (`SessionStudies`);
 * - traction: a colleague holding a port who is no longer at the table has let go (`assist.ts`);
 * - alarms: the responsible anaesthetist of an anaesthetised patient recognises a new critical alarm, goes to the
 *   patient and says so — the response the simulation authors, no drug or treatment of their own.
 * `states()` is each staff member's role state, derived from the authoritative record and the world (so a reload
 * agrees by construction): goal, task, location, responsibility, held items, reservations, pending requests and
 * what blocks them.
 */
import { anaesthetised, responsibleAnaesthetist, t, vitalsAt } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { dropTractionAwayFromTable } from "./assist.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";

/** One staff member's state as the session knows it. */
export interface RoleState {
  actorId: string;
  name: string;
  role: string;
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

export class StaffAutonomy {
  /** Alarms already answered (by `minute:vital`). */
  private readonly answered = new Set<string>();

  constructor(private readonly k: SessionKernel) {}

  /** One round of what staff do on their own (never throws). */
  async step(id: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    if (!k.state.started || k.state.finished) return;
    try {
      dropTractionAwayFromTable(k, id);
      if (k.studies.available()) await k.studies.afterLearner(id, signal);
      await this.answerAlarm(id, signal);
    } catch (err) {
      k.emit(id, { type: "warning", message: `staff: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  /** The responsible anaesthetist answers a new critical alarm of the anaesthetised patient: at the patient, said. */
  private async answerAlarm(id: string, signal: AbortSignal): Promise<void> {
    const k = this.k;
    const c = k.caseDef;
    const e = k.embodied;
    if (!e || !anaesthetised(c, k.state)) return;
    const staffId = responsibleAnaesthetist(c, k.state);
    const patient = e.patientId();
    if (!staffId || !patient) return;
    const actorId = `staff:${staffId}`;
    if (!e.world().actor(actorId)) return;
    const v = vitalsAt(c, k.state);
    const critical = v.alarms.filter((a) => a.level === "critical");
    const fresh = critical.filter((a) => !this.answered.has(`${a.vital}`));
    // an alarm that has cleared may be answered again when it recurs
    for (const key of [...this.answered]) if (!critical.some((a) => a.vital === key)) this.answered.delete(key);
    if (!fresh.length) return;
    for (const a of fresh) this.answered.add(a.vital);
    if (!e.world().checkSpatial(actorId, { tool: "examine", kind: "examine" }).ok) await e.act({ agent: "attending", submission: id, signal }, { actorId, operation: "navigate", goal: { kind: "interact", id: patient }, onBehalfOf: PRIMARY_ACTOR }, signal);
    const L = k.locale;
    const staff = k.facility?.staff.find((s) => s.id === staffId);
    const name = staff ? t(staff.name, L) : staffId;
    const text = rt(L, "staff.alarm.answered", { vitals: fresh.map((a) => `${a.vital.toUpperCase()} ${Math.round(a.value)}`).join(", ") });
    k.speakLine(id, { agent: "attending", speaker: name, text, grounded: [], staffId });
    k.conversations.addDialogue({ who: "attending", speaker: name, text });
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
      const goal = anaesthetist === sid ? rt(L, "staff.goal.anaesthesia") : port ? rt(L, "staff.goal.traction", { port }) : orders[0] ? rt(L, "staff.goal.study", { order: orders[0].id }) : tasks[0] ? tasks[0].need : null;
      return [
        {
          actorId: a.id,
          name,
          role: a.role,
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
