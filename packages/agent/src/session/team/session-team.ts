/**
 * The care team of a session (docs/TEAM.md): the `TeamScheduler` wired to the session — created once the
 * encounter has started (the team scenario is chosen at `start`), driven by the `team` op and, in autonomy
 * `auto`, after each op of the learner; its world acts go through the embodied session's action bus with the
 * member's own body (a nurse's tool path), its steps in the operative field through the team's caller (`team`: the
 * `operate` tool with the member's body, in a turn of its own that always ends), its lines are heard as the member's
 * own (spoken through the profile of their role), and its state is saved (`team` transcript items,
 * `SessionSnapshot.team`) and restored mid-task.
 */
import { evaluate, memberBody, standInOf, t, type ProcedureOp, type RefusalReason, type TeamNeed } from "@clinicalcraft/core";
import type { Op } from "../../protocol.js";
import { reasonText } from "../../tools/field-words.js";
import { spatialCodeOf } from "../../tools/spatial.js";
import type { NavGoal } from "@clinicalcraft/world";
import { runToolAs } from "../embodied-wiring.js";
import { rt } from "../i18n.js";
import type { SessionKernel } from "../kernel.js";
import { staffAgent } from "../staff-voice.js";
import { TEAM_CALLER } from "./callout.js";
import { TeamScheduler, type OperateOutcome, type TeamHost } from "./scheduler.js";
import type { MemberState, TeamCheckpoint } from "./types.js";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { ModelTeamMind } from "../../characters/team-mind.js";
import { positionOf } from "../../characters/roles.js";
import { characterModel } from "../character-models.js";
import { SURGEON_NAME } from "./i18n.js";
import { parseFieldAsk } from "./ask-input.js";

export { validTeamCheckpoint } from "./checkpoint.js";

type TeamOp = Extract<Op, { type: "team" }>;

export class SessionTeam {
  private scheduler: TeamScheduler | null = null;
  /** What the last `team` transcript item recorded (one item per change). */
  private recorded = "";

  constructor(
    private readonly k: SessionKernel,
    private readonly saved: TeamCheckpoint | null,
  ) {}

  /** Does this session have a care team (a case with a `team`, embodied mode)? */
  available(): boolean {
    return !!this.k.caseDef.team && !!this.k.embodied;
  }

  /** The scheduler, once the encounter has started; null without a team. */
  get(): TeamScheduler | null {
    if (this.scheduler) return this.scheduler;
    const k = this.k;
    const team = k.caseDef.team;
    if (!team || !k.embodied || !k.state.started) return null;
    const scenario = k.state.teamScenario ?? null;
    const s = new TeamScheduler(this.host(), team, scenario);
    // a saved team of another scenario (a different case version) is not this one's
    if (this.saved && this.saved.state.scenario === scenario) s.restore(this.saved);
    this.scheduler = s;
    this.recorded = this.changeKey(s);
    return s;
  }

  private host(): TeamHost {
    const k = this.k;
    return {
      caseDef: k.caseDef,
      facility: k.facility,
      state: () => k.state,
      world: () => k.embodied!.world(),
      // a member acts with their own body on a nurse's tool path (their role's scope of practice)
      act: (request, signal) => k.embodied!.act({ agent: "nurse", submission: k.currentSubmission, signal }, request, signal),
      // a member's step in the operative field: the team's caller, their own body
      operate: (member, op, ref, signal) => this.operateAs(member, op, ref, signal),
      observe: (member, signal) => this.observeAs(member, signal),
      // a step of the operation through a device (the tower's gas): the member's body, its effect on the team's caller
      deviceStep: (request, ref, signal) => k.inTurn(k.currentSubmission, TEAM_CALLER, (turnId) => k.embodied!.act({ agent: TEAM_CALLER, submission: k.currentSubmission, turnId, signal, stepRef: ref }, request, signal)),
      stepDone: (ref) => (k.state.procedure?.refs ?? []).includes(ref),
      clock: () => k.state.clock,
      phase: () => k.state.phase,
      get locale() {
        return k.locale;
      },
      emit: (msg) => k.emit(k.currentSubmission, msg),
      holds: (cond) => evaluate(k.caseDef, k.state, cond),
      count: () => k.embodied?.count ?? null,
      record: () => k.state.count,
      say: (speaker, text, member) => {
        // spoken through the profile of the speaker's role (the nurses' through the nurse's, an assistant's or the
        // stand-in's through the attending's); the learner's own words as before
        const staffId = member?.startsWith("staff:") ? member.slice("staff:".length) : undefined;
        const role = staffId ? k.facility?.staff.find((x) => x.id === staffId)?.role : undefined;
        const agent = role ? staffAgent(role) : "nurse";
        k.speakLine(k.currentSubmission, { agent, speaker, text, grounded: [], ...(staffId ? { staffId } : {}) });
        k.conversations.addDialogue({ who: agent, speaker, text });
      },
      // every member decides with their own model (docs/CHARACTERS.md): read at each round, so a `configure` applies
      decide: (member, view, rules, signal) => (k.settings.characters.engine === "llm" ? this.mind().decide(member, view, rules, signal) : Promise.resolve(rules)),
    };
  }

  /**
   * A member's step in the operative field (docs/TEAM.md §4.5): the `operate` tool through the one tool path, under the
   * team's caller (`team`: hooks, deny rules, the scope of practice, the spatial gate and the approval gate all apply),
   * with the member's own body and the step's `ref` (from the tool context only); what it says is said to the learner
   * (`addressee`). In a turn of its own, which always ends: a front-end following each agent's phase sees it idle again.
   */
  async operateAs(member: string, op: ProcedureOp, ref: string, signal?: AbortSignal): Promise<OperateOutcome> {
    const k = this.k;
    const id = k.currentSubmission;
    const call = await k.inTurn(id, TEAM_CALLER, (turnId) =>
      runToolAs(k, { agent: TEAM_CALLER, submission: id, turnId, ...(signal ? { signal } : {}) }, "operate", { ...op } as Record<string, unknown>, { actorId: member, stepRef: ref, addressee: PRIMARY_ACTOR }),
    );
    if (call.ok) return { status: "completed", message: call.output.output };
    const d = call.output.data as { code?: string; hint?: { goal?: NavGoal } | null; rejected?: { code?: string; reason?: RefusalReason }; refusal?: RefusalReason; denied?: { byLearner?: boolean } } | undefined;
    const cancelled = call.status === "cancelled" || call.status === "interrupted";
    // the field's reason (a refusal by control, or the field's own), in both languages as the learner is told it
    const refusal = d?.refusal ?? d?.rejected?.reason;
    const said = (locale: string) => reasonText({ caseDef: k.caseDef, facility: k.facility, locale, state: () => k.state, actorId: member, addressee: PRIMARY_ACTOR }, refusal);
    const en = said("en");
    const zh = said("zh-CN");
    return {
      status: cancelled ? "cancelled" : "failed",
      code: spatialCodeOf(call.output) ?? d?.code ?? d?.rejected?.code ?? call.status.toUpperCase(),
      message: call.output.output,
      ...(d?.hint?.goal ? { hint: d.hint.goal } : {}),
      ...(en && zh ? { reason: { en, "zh-CN": zh } } : {}),
      ...(call.status === "denied" && d?.denied?.byLearner ? { byLearner: true } : {}),
    };
  }

  /**
   * A member's look at the operative field (docs/TEAM.md §4.5, the stand-in's after the learner stopped it): the
   * `observe_field` tool under the team's caller with the member's own body, in a turn of its own that always ends.
   */
  async observeAs(member: string, signal?: AbortSignal): Promise<OperateOutcome> {
    const k = this.k;
    const id = k.currentSubmission;
    const call = await k.inTurn(id, TEAM_CALLER, (turnId) => runToolAs(k, { agent: TEAM_CALLER, submission: id, turnId, ...(signal ? { signal } : {}) }, "observe_field", {}, { actorId: member, addressee: PRIMARY_ACTOR }));
    const cancelled = call.status === "cancelled" || call.status === "interrupted";
    return call.ok ? { status: "completed", message: call.output.output } : { status: cancelled ? "cancelled" : "failed", code: call.status.toUpperCase(), message: call.output.output };
  }

  private mindInstance: ModelTeamMind | null = null;

  /** The model-driven team (one per session: it remembers who deferred what). */
  private mind(): ModelTeamMind {
    if (this.mindInstance) return this.mindInstance;
    const k = this.k;
    // each member's own: the surgeon member is the stand-in while the learner holds a place
    const staffOf = (member: MemberState) => k.facility?.staff.find((s) => s.id === (member.staff === "surgeon" ? (member.id.startsWith("staff:") ? standInOf(k.caseDef) : undefined) : member.staff));
    this.mindInstance = new ModelTeamMind({
      get locale() {
        return k.locale;
      },
      get timeoutMs() {
        return k.settings.characters.timeoutMs;
      },
      // a member's model is the one their role speaks through (`agents.nurse`, `agents.attending`)
      model: (member) => characterModel(k, staffOf(member)?.role ?? (member.staff === "surgeon" ? "attending" : "nurse")),
      position: (member) => (member.staff === "surgeon" ? "surgeon" : positionOf(k.caseDef, k.facility, member.staff)),
      name: (id) => {
        const e = k.embodied?.world().entity(id);
        return e ? t(e.name, k.locale) : id === PRIMARY_ACTOR ? t(SURGEON_NAME, k.locale) : id;
      },
      staffNames: () => (k.facility?.staff ?? []).map((s) => t(s.name, k.locale)),
      warn: (message) => k.emit(k.currentSubmission, { type: "warning", message }),
      // what each model decided, or why the rules did (transcript only: never an event)
      record: (entry) => void k.recorder?.record("diagnostic", { agent: "team", source: "characters", detail: [JSON.stringify(entry)] }),
      usage: (agent, u) => k.models.trackUsage(k.currentSubmission, agent, u),
    });
    return this.mindInstance;
  }

  /** After an op of the learner: the team acts on its own (autonomy `auto`) until it is idle. */
  async afterLearner(signal: AbortSignal): Promise<void> {
    const s = this.get();
    if (!s || s.autonomy !== "auto" || !s.active()) return;
    await s.run(signal, { untilIdle: true });
    this.record();
  }

  /** A `team` op. */
  async op(id: string, op: TeamOp, signal: AbortSignal): Promise<void> {
    const k = this.k;
    if (!this.available()) {
      k.emit(id, { type: "error", message: rt(k.locale, "team.none"), code: "no_team" });
      return;
    }
    k.ensureStarted(id);
    const s = this.get();
    if (!s) return;
    switch (op.action) {
      case "step":
        if (!this.working(id, s)) return;
        await s.round(signal);
        break;
      case "run": {
        if (!this.working(id, s)) return;
        const rounds = typeof op.rounds === "number" && Number.isInteger(op.rounds) && op.rounds > 0 ? Math.min(op.rounds, 200) : undefined;
        await s.run(signal, { maxRounds: rounds ?? 40, untilIdle: false });
        break;
      }
      case "pause":
        s.autonomy = "step";
        this.status(s);
        break;
      case "resume":
        s.autonomy = "auto";
        this.status(s);
        await this.afterLearner(signal);
        break;
      case "surgeon":
        if (op.surgeon !== "learner" && op.surgeon !== "simulated") return this.invalid(id, "surgeon must be learner or simulated");
        s.surgeon = op.surgeon;
        this.status(s);
        break;
      case "reply": {
        const kinds = new Set(["readback", "confirm", "decline", "report"]);
        if (typeof op.message !== "string" || !op.kind || !kinds.has(op.kind)) return this.invalid(id, "reply needs message and kind (readback, confirm, decline, report)");
        const r = s.reply(op.message, op.kind, typeof op.text === "string" && op.text.trim() ? op.text.trim() : undefined, typeof op.item === "string" ? op.item : undefined);
        if ("refused" in r && r.refused === "observer") return this.observing(id);
        if ("refused" in r && r.refused === "unknown") return this.invalid(id, `no team message "${op.message}"`);
        if ("refused" in r && r.refused === "notYours") {
          const to = t(k.embodied!.world().entity(r.to)?.name ?? r.to, k.locale);
          k.emit(id, { type: "error", message: rt(k.locale, "team.notYours", { to }), code: "permission_denied" });
          return;
        }
        break;
      }
      case "need": {
        const item = typeof op.item === "string" ? op.item.trim() : "";
        const world = k.embodied!.world();
        if (!item || !world.entities().some((e) => e.equipmentType?.id === item)) return this.invalid(id, `no equipment of type "${item}" in this hospital`);
        const forRef = typeof op.for === "string" && op.for.trim() ? op.for.trim().replace(/^staff:/u, "") : "surgeon";
        // whom it is for: the surgeon (by default; whoever operates, a member of the team or not), or a member of the team
        // by the body their reference works with (core `memberBody`: the stand-in's own id is the surgeon in a place)
        const body = memberBody(k.caseDef, k.state, forRef);
        if (forRef !== "surgeon" && !s.state.members.some((m) => m.id === body)) {
          k.emit(id, { type: "error", message: rt(k.locale, "team.unknownMember", { who: forRef }), code: "invalid_op" });
          return;
        }
        const need: TeamNeed = { id: `asked-${s.state.posted.length + 1}`, item, for: body === memberBody(k.caseDef, k.state, "surgeon") ? "surgeon" : forRef };
        s.postNeed(need);
        if (s.autonomy === "auto") await s.run(signal, { untilIdle: true });
        break;
      }
      case "ask": {
        if (!this.working(id, s)) return;
        const to = typeof op.to === "string" ? op.to.trim() : "";
        const field = parseFieldAsk(op.field);
        if (!to) return this.invalid(id, "ask needs to (a member's staff id) and field");
        if (typeof field === "string") return this.invalid(id, field);
        const r = s.ask(to, field);
        if ("refused" in r) {
          if (r.refused === "observer") return this.observing(id);
          const nameOf = (body: string) => t(k.embodied!.world().entity(body)?.name ?? body.replace(/^staff:/u, ""), k.locale);
          if (r.refused === "ambiguous") {
            k.emit(id, { type: "error", message: rt(k.locale, "team.ask.ambiguous", { asked: to, who: r.who.map(nameOf).join(", ") }), code: "invalid_op" });
            return;
          }
          const who = "to" in r ? nameOf(r.to) : to;
          const key = r.refused === "unknown" ? "team.unknownMember" : r.refused === "self" ? "team.ask.self" : r.refused === "absent" ? "team.ask.absent" : r.refused === "away" ? "team.ask.away" : "team.ask.operator";
          k.emit(id, { type: "error", message: rt(k.locale, key, { who }), code: r.refused === "unknown" ? "invalid_op" : "permission_denied" });
          return;
        }
        if (s.autonomy === "auto") await s.run(signal, { untilIdle: true });
        break;
      }
      case "count": {
        if (!this.working(id, s)) return;
        const r = s.count();
        if ("refused" in r) {
          if (r.refused === "observer") return this.observing(id);
          if (r.refused === "none") return void k.emit(id, { type: "error", message: rt(k.locale, "team.count.none"), code: "invalid_op" });
          if (r.refused === "notDue") return void k.emit(id, { type: "warning", message: rt(k.locale, "team.count.notDue") });
          if (r.refused === "said") return void k.emit(id, { type: "warning", message: rt(k.locale, "team.count.said") });
          const counters = ("counters" in r ? r.counters : []).map((x: string) => t(k.embodied!.world().entity(x)?.name ?? x, k.locale)).join(", ");
          k.emit(id, { type: "error", message: rt(k.locale, "team.count.notYours", { who: counters || "—" }), code: "permission_denied" });
          return;
        }
        if (s.autonomy === "auto") await s.run(signal, { untilIdle: true });
        break;
      }
      default:
        return this.invalid(id, `unknown team action "${String((op as { action?: unknown }).action)}"`);
    }
    this.record();
  }

  /** The team works in this phase (else a warning that says when it does). */
  private working(id: string, s: TeamScheduler): boolean {
    const k = this.k;
    if (s.autonomy === "off") {
      k.emit(id, { type: "warning", message: rt(k.locale, "team.off") });
      return false;
    }
    if (!s.active()) {
      const phases = s.config.phases.map((p) => t(k.caseDef.phases.find((x) => x.id === p)?.label ?? p, k.locale)).join(", ");
      k.emit(id, { type: "warning", message: rt(k.locale, "team.notNow", { phases }) });
      return false;
    }
    return true;
  }

  private status(s: TeamScheduler): void {
    this.k.emit(this.k.currentSubmission, { type: "team_event", event: s.statusEvent() });
  }

  private invalid(id: string, reason: string): void {
    this.k.emit(id, { type: "error", message: rt(this.k.locale, "team.invalid", { reason }), code: "invalid_op" });
  }

  /** Observing (observer mode): the learner's part is played for them — they answer, ask and count in learner mode. */
  private observing(id: string): void {
    this.k.emit(id, { type: "error", message: rt(this.k.locale, "team.observer"), code: "permission_denied" });
  }

  /** The team as saved now (a session snapshot), or null. */
  checkpoint(): TeamCheckpoint | null {
    return this.scheduler?.checkpoint() ?? (this.saved ? structuredClone(this.saved) : null);
  }

  /** A `team` transcript item when the team changed (a resume restores the last one). */
  record(): void {
    const s = this.scheduler;
    if (!s || this.changeKey(s) === this.recorded) return;
    this.recorded = this.changeKey(s);
    this.k.recorder?.record("team", { checkpoint: s.checkpoint() });
  }

  private changeKey(s: TeamScheduler): string {
    return `${s.state.round}:${s.state.seq}:${s.state.completed.length}:${s.autonomy}:${s.surgeon}`;
  }
}
