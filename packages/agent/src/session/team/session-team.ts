/**
 * The care team of a session (docs/TEAM.md): the `TeamScheduler` wired to the session — created once the
 * encounter has started (the team scenario is chosen at `start`), driven by the `team` op and, in autonomy
 * `auto`, after each op of the learner; its acts go through the embodied session's action bus with the
 * member's own body (a nurse's tool path), its lines are heard as the member's own, and its state is saved
 * (`team` transcript items, `SessionSnapshot.team`) and restored mid-task.
 */
import { evaluate, t, type TeamNeed } from "@clinicalcraft/core";
import type { Op } from "../../protocol.js";
import { rt } from "../i18n.js";
import type { SessionKernel } from "../kernel.js";
import { TeamScheduler, type TeamHost } from "./scheduler.js";
import type { MemberState, TeamCheckpoint } from "./types.js";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { ModelTeamMind } from "../../characters/team-mind.js";
import { positionOf } from "../../characters/roles.js";
import { characterModel } from "../character-models.js";
import { both, SURGEON_NAME } from "./i18n.js";

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
      world: () => k.embodied!.world(),
      // a member acts with their own body on a nurse's tool path (their role's scope of practice)
      act: (request, signal) => k.embodied!.act({ agent: "nurse", submission: k.currentSubmission, signal }, request, signal),
      clock: () => k.state.clock,
      phase: () => k.state.phase,
      get locale() {
        return k.locale;
      },
      emit: (msg) => k.emit(k.currentSubmission, msg),
      holds: (cond) => evaluate(k.caseDef, k.state, cond),
      count: () => k.embodied?.count ?? null,
      record: () => k.state.count,
      // information (docs/TEAM.md §4.5): only what the case records — a history item's question and its recorded answer
      history: (id) => {
        const h = k.caseDef.history.find((x) => x.id === id);
        return h ? { question: both(h.question), answer: both(h.answer) } : null;
      },
      interventionName: (id) => {
        const iv = k.caseDef.interventions.find((x) => x.id === id);
        return iv ? both(iv.name) : null;
      },
      // read back to the clinician in charge and confirmed: the case records it as known to them (`ask` via the team)
      relay: (history, to) => to === PRIMARY_ACTOR && !k.dispatch({ type: "ask", itemId: history, via: "team", by: "system" }, k.currentSubmission).rejected,
      say: (speaker, text, member) => {
        const staffId = member?.startsWith("staff:") ? member.slice("staff:".length) : undefined;
        k.speakLine(k.currentSubmission, { agent: "nurse", speaker, text, grounded: [], ...(staffId ? { staffId } : {}) });
        k.conversations.addDialogue({ who: "nurse", speaker, text });
      },
      // every member decides with their own model (docs/CHARACTERS.md): read at each round, so a `configure` applies
      decide: (member, view, rules, signal) => (k.settings.characters.engine === "llm" ? this.mind().decide(member, view, rules, signal) : Promise.resolve(rules)),
    };
  }

  private mindInstance: ModelTeamMind | null = null;

  /** The model-driven team (one per session: it remembers who deferred what). */
  private mind(): ModelTeamMind {
    if (this.mindInstance) return this.mindInstance;
    const k = this.k;
    const staffOf = (member: MemberState) => k.facility?.staff.find((s) => s.id === member.staff);
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
        // the case team's name for the clinician in charge ("the doctor"), when it gives one
        const named = id === PRIMARY_ACTOR ? k.caseDef.team?.members.find((m) => m.staff === "surgeon")?.name : undefined;
        if (named) return t(named, k.locale);
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

  /**
   * After an op of the learner: the team acts on its own (autonomy `auto`) until it is idle. A team with nothing that
   * could set it to work (no scenario, no count, nothing asked of it) takes no round: the case played alone is as it
   * was without a team.
   */
  async afterLearner(signal: AbortSignal): Promise<void> {
    const s = this.get();
    if (!s || s.autonomy !== "auto" || !s.active() || !s.hasWork()) return;
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
        const forRef = typeof op.for === "string" && op.for.trim() ? op.for.trim() : "surgeon";
        const need: TeamNeed = { id: `asked-${s.state.posted.length + 1}`, item, for: forRef };
        s.postNeed(need);
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
    this.k.emit(this.k.currentSubmission, { type: "team_event", event: { kind: "status", round: s.state.round, autonomy: s.autonomy, surgeon: s.surgeon } });
  }

  private invalid(id: string, reason: string): void {
    this.k.emit(id, { type: "error", message: rt(this.k.locale, "team.invalid", { reason }), code: "invalid_op" });
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
