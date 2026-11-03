/**
 * The surgical count in a session (docs/TEAM.md §4.3): the one place that writes the case's count record
 * (`ClinicalAction` `count`, kept by the engine) from the world. Every writer goes through it — the count board's
 * and the RF wand's operations (`surgical_count`, a device's clinical effect), the care team (its counter, its
 * circulating nurse) and the world itself (an item searched out of the patient) — so the board, the wand, the
 * closing checks, the WHO Sign Out, the team and the assessment read one record.
 *
 * What is recorded is what the world holds, never what a caller says: the baseline is the items opened onto the
 * field (the operating room's placements of the counted type, by entity id — taken before a scenario moves any
 * item); a count is the items the team in the room can account for (lying in the room, or in the hands of someone
 * in it — never one concealed: under a drape, in the wound); a scan is what the RF wand finds inside the patient.
 */
import { COUNT_EFFECT_STEPS, COUNT_STAGES, countLedger, countStatus, t, type CaseDefinition, type ClinicalAction, type CountOp, type CountStage, type ReduceResult, type SessionState } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type ActorId, type WorldActionRequest, type WorldActionResult, type WorldRuntime } from "@clinicalcraft/world";
import { rt, type RuntimeKey } from "./i18n.js";
import { sentence } from "./i18n-checklist.js";
import { countItemName, openItemsText } from "./notifications.js";

/** The clinical tool a count device operation names (`clinical: { tool: "surgical_count", select: "item", item: <step> }`). */
export const COUNT_TOOL = "surgical_count";

/** What a count operation does: a count at a stage (`baseline`: before incision), an RF scan of the patient, an escalation. */
export const COUNT_STEPS = COUNT_EFFECT_STEPS;
export type CountStep = (typeof COUNT_STEPS)[number];
const STAGES: readonly string[] = COUNT_STAGES;

export interface CountHost {
  readonly caseDef: CaseDefinition;
  world(): WorldRuntime;
  state(): SessionState;
  /** Dispatch an engine action outside any tool (the count is a record of the world, by the system). */
  dispatch(action: ClinicalAction): ReduceResult;
  locale(): string;
}

/** What a count op recorded (or why not). */
export interface CountOutcome {
  ok: boolean;
  output: string;
  data: { step: string; status: string; staff?: string; missing?: string[]; unexpected?: string[]; detected?: string[]; rejected?: { code: string; message: string } };
}

export class SurgicalCount {
  constructor(private readonly h: CountHost) {}

  /** The case's count (item, operating room), or null: the case keeps none. */
  config(): { item: string; room: string } | null {
    const team = this.h.caseDef.team;
    return team?.count ? { item: team.count.item, room: team.room } : null;
  }

  /** Who did it, as the record names people: a staff id, `surgeon` (the learner in a case team with a surgeon), else `learner`. */
  staffOf(actorId: ActorId): string {
    if (actorId.startsWith("staff:")) return actorId.slice("staff:".length);
    if (actorId === PRIMARY_ACTOR) return this.h.caseDef.team?.members.some((m) => m.staff === "surgeon") ? "surgeon" : "learner";
    return actorId;
  }

  /** The items opened onto the field: every placement of the counted type in the operating room, by entity id. */
  expected(): string[] {
    const cfg = this.config();
    if (!cfg) return [];
    return this.h
      .world()
      .facility.placements.filter((p) => p.type === cfg.item && p.room === cfg.room)
      .map((p) => `eq:${p.id}`);
  }

  /**
   * The items the team in the room can account for now: lying in the room (where they are now, not where they were
   * placed) or in the hands of someone in it — never one concealed.
   */
  accounted(): string[] {
    const cfg = this.config();
    if (!cfg) return [];
    const w = this.h.world();
    const entities = w.snapshot().entities;
    const actors = w.actors();
    return w
      .entities()
      .filter((e) => e.kind === "equipment" && e.type === cfg.item)
      .filter((e) => {
        const holder = actors.find((a) => a.holding.includes(e.id));
        if (holder) return holder.room === cfg.room;
        return !entities[e.id]?.concealed && w.roomOf(e.id) === cfg.room;
      })
      .map((e) => e.id)
      .sort();
  }

  /** What the RF wand finds in the patient: items of the counted type concealed inside them. */
  detected(): string[] {
    const cfg = this.config();
    const w = this.h.world();
    const patient = w.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id;
    if (!cfg || !patient) return [];
    return Object.entries(w.snapshot().entities)
      .filter(([id, e]) => e.concealed === patient && w.entity(id)?.type === cfg.item)
      .map(([id]) => id)
      .sort();
  }

  /**
   * The items opened onto the field, recorded once — at the start of an in-world encounter, before a scenario moves
   * anything (`staff`: who recorded it; the session's own: `system`, from the tray list). Idempotent.
   */
  ensureBaseline(staff: string): void {
    if (!this.config() || this.h.state().count) return;
    const ids = this.expected();
    if (ids.length) this.record({ op: "baseline", ids, staff });
  }

  /** A count op for an acting body (a device operation's clinical effect, or the team), as the record keeps it. */
  perform(actorId: ActorId, step: string, opts: { to?: string; reason?: string } = {}): CountOutcome {
    const L = this.h.locale();
    if (!this.config()) return { ok: false, output: rt(L, "count.none"), data: { step, status: "none" } };
    const staff = this.staffOf(actorId);
    this.ensureBaseline("system");
    if (STAGES.includes(step)) return this.outcome(step, staff, this.record({ op: "count", ids: this.accounted(), staff, stage: step as CountStage }));
    if (step === "scan") return this.outcome(step, staff, this.record({ op: "scan", detected: this.detected(), staff }));
    if (step === "escalate") {
      const reason = opts.reason?.trim() || rt(L, "count.escalate.reason");
      // the surgeon escalates beyond the room (imaging before the patient leaves); anyone else to the surgeon
      return this.outcome(step, staff, this.record({ op: "escalate", staff, to: opts.to?.trim() || (staff === "surgeon" ? "radiology" : "surgeon"), reason }));
    }
    return { ok: false, output: rt(L, "count.refused", { reason: `unknown count step "${step}" (${COUNT_STEPS.join(", ")})` }), data: { step, status: countStatus(this.h.state().count) } };
  }

  /** A documented transfer off the field (a swab sent with the specimen; an item not in the count set aside). */
  transfer(staff: string, ids: readonly string[], to: string, reason: string): CountOutcome {
    return this.outcome("transfer", staff, this.record({ op: "transfer", ids: [...ids], staff, to, reason }));
  }

  /** Dispatch a count op by the system (the record of the world); the engine validates it. */
  record(op: CountOp): ReduceResult {
    return this.h.dispatch({ type: "count", count: op, by: "system" });
  }

  /**
   * After a world act: an item of the counted type searched out of the patient (the wound) is recorded as recovered,
   * with who took it out — evidence, not yet a recount.
   */
  afterAct(request: WorldActionRequest, result: WorldActionResult): void {
    const cfg = this.config();
    if (!cfg || !this.h.state().count || result.status !== "completed" || request.operation !== "search") return;
    const w = this.h.world();
    const revealed = result.events.flatMap((e) => (e.type === "entity.concealed" && !e.concealed && w.entity(e.entityId)?.type === cfg.item ? [e.entityId] : []));
    if (!revealed.length) return;
    const from = request.targetId ?? `around ${request.actorId}`;
    this.record({ op: "recover", ids: revealed, staff: this.staffOf(request.actorId), from });
  }

  private outcome(step: string, staff: string, r: ReduceResult): CountOutcome {
    const L = this.h.locale();
    const record = r.state.count;
    const status = countStatus(record);
    const statusText = rt(L, `count.status.${status}` as RuntimeKey);
    if (r.rejected) return { ok: false, output: rt(L, "count.refused", { reason: sentence(r.rejected.message) }), data: { step, status, staff, rejected: r.rejected } };
    const e = record?.entries.at(-1);
    const item = countItemName(this.h.caseDef, L);
    const name = (id: string) => this.name(id, L);
    if (!e) return { ok: true, output: statusText, data: { step, status, staff } };
    switch (e.op) {
      case "baseline":
        return { ok: true, output: rt(L, "count.baseline", { n: e.ids.length, item, status: statusText }), data: { step, status, staff } };
      case "recover":
        return { ok: true, output: rt(L, "count.recovered", { from: e.from, staff: e.staff, items: e.ids.map(name).join(", ") }), data: { step, status, staff } };
      case "count": {
        const { expected, transferred } = countLedger(record!);
        const of = expected.filter((id) => !transferred.includes(id)).length;
        const missing = e.missing ?? [];
        const unexpected = e.unexpected ?? [];
        const stage = rt(L, `count.stage.${e.stage}` as RuntimeKey);
        return { ok: true, output: rt(L, "count.result", { stage, item, n: of - missing.length, of, open: openItemsText(L, { missing, unexpected }, name), status: statusText }), data: { step, status, staff, missing, unexpected } };
      }
      case "scan":
        return {
          ok: true,
          output: e.detected.length ? rt(L, "count.scan.detected", { items: e.detected.map(name).join(L === "zh-CN" ? "、" : ", "), status: statusText }) : rt(L, "count.scan.clear", { status: statusText }),
          data: { step, status, staff, detected: [...e.detected] },
        };
      case "escalate":
        return { ok: true, output: rt(L, "count.escalated", { to: e.to, reason: sentence(e.reason), status: statusText }), data: { step, status, staff } };
      case "transfer":
        return { ok: true, output: rt(L, "count.transferred", { items: e.ids.map(name).join(", "), staff: e.staff, to: e.to, reason: sentence(e.reason), status: statusText }), data: { step, status, staff } };
      default:
        return { ok: true, output: statusText, data: { step, status, staff } };
    }
  }

  /** An item's name as the room knows it ("Gauze swab (or-7-swab-5)"). */
  private name(id: string, L: string): string {
    const e = this.h.world().entity(id);
    return e ? `${t(e.name, L)} (${id.replace(/^eq:/u, "")})` : id.replace(/^eq:/u, "");
  }
}
