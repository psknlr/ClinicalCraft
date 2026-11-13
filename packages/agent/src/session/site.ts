/**
 * The operative site's verification in a session (docs/TEAM.md §4.5): the one place that writes the case's site
 * record (`ClinicalAction` `site`, kept by the engine) from the world. Every writer goes through it — the care team's
 * members, the learner's own checks (the `team` op's `site` action) and an agent's (the tool `verify_site`) — so the
 * Sign In, the team, a debrief and the benchmark read one record.
 *
 * What is recorded is what a body did where it stood, never what a caller says: the skin mark is looked at, and made,
 * at the patient's side; the patient is asked within talking distance, while he can speak; a document or the
 * imaging's orientation marker is read in the room the patient is in. What a source says is written by the engine
 * from the record (the case's site and the team scenario — hidden until someone looks). The pause a discrepancy calls
 * is the engine's hold on the step the site names, in the name of whoever called it; its release is theirs too, with
 * a reassessment made from the record: who confirmed, on what, what was verified and what was put right.
 */
import { evaluate, openDiscrepancy, patientNonVerbal, siteLedger, siteStatus, siteVerification, t, type CaseDefinition, type ClinicalAction, type ReduceResult, type SessionState, type SiteOp, type SiteRecord, type SiteStatus, type TeamSite } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, RANGES, type ActorId, type NavGoal, type WorldRuntime } from "@clinicalcraft/world";
import { joinList, rt, type RuntimeKey } from "./i18n.js";
import { sentence } from "./i18n-checklist.js";

export interface SiteHost {
  readonly caseDef: CaseDefinition;
  world(): WorldRuntime;
  state(): SessionState;
  /** Dispatch an engine action outside any tool (the record of what a body did, by the system). */
  dispatch(action: ClinicalAction): ReduceResult;
  /** Simulated seconds a step takes (charged like a procedure's time; nothing on an actual-time clock that is paused). */
  elapse(seconds: number): void;
  locale(): string;
}

/**
 * What a step takes, in simulated seconds — a look at the mark, a document found and read, the imaging read off its
 * orientation marker, the patient asked, a mark made, a document corrected; the rest is said in a breath. Authored
 * teaching values: they order the record in time (who looked when), they are not a measured standard.
 */
export const SITE_SECONDS = { mark: 10, document: 20, imaging: 30, patient: 15, marking: 20, amend: 30, said: 5 } as const;

/** A step of the verification, by a body: a look, a discrepancy, a mark, a correction, a confirmation; the pause and its release. */
export type SiteStep =
  | { step: "read"; source: string }
  | { step: "raise"; sources: [string, string] }
  | { step: "mark"; side: string }
  | { step: "amend"; source: string; to: string }
  | { step: "confirm" }
  | { step: "escalate"; reason?: string }
  | { step: "pause"; reason?: string }
  | { step: "resume"; reassessment?: string };

export const SITE_STEPS = ["read", "raise", "mark", "amend", "confirm", "escalate", "pause", "resume"] as const;

/** What a step recorded (or why not: `code`; `goal`: where the body has to stand for it). */
export interface SiteOutcome {
  ok: boolean;
  output: string;
  code?: "NOT_AT_PATIENT" | "NOT_IN_ROOM" | "REFUSED";
  goal?: NavGoal;
  /** Simulated seconds the step took (absent: refused before it began). */
  seconds?: number;
  data: { step: string; status: SiteStatus; staff: string; source?: string; value?: string | null; side?: string; rejected?: { code: string; message: string } };
}

export class SiteVerification {
  constructor(private readonly h: SiteHost) {}

  /** The case's site (sides, evidence, the step held), or null: the team verifies none. */
  config(): TeamSite | null {
    return this.h.caseDef.team?.site ?? null;
  }

  /** Who did it, as the record names people: a staff id, `surgeon` (the learner in a case team with a surgeon), else `learner`. */
  staffOf(actorId: ActorId): string {
    if (actorId.startsWith("staff:")) return actorId.slice("staff:".length);
    if (actorId === PRIMARY_ACTOR) return this.h.caseDef.team?.members.some((m) => m.staff === "surgeon") ? "surgeon" : "learner";
    return actorId;
  }

  status(): SiteStatus {
    return siteStatus(this.h.state().site);
  }

  /** The case's site record now (undefined until the verification falls due in an in-world encounter). */
  current(): SiteRecord | undefined {
    return this.h.state().site;
  }

  /** Can the patient say which side now (his own word is evidence only while he can speak)? */
  canAnswer(): boolean {
    return !patientNonVerbal(this.h.caseDef, this.h.state());
  }

  /** The verification falls due (the site's `when` holds on the case record). */
  due(): boolean {
    const site = this.config();
    return !!site && evaluate(this.h.caseDef, this.h.state(), site.when);
  }

  /** Open the record once the verification falls due (idempotent; the session's own entry). */
  ensureOpen(): boolean {
    if (!this.config()) return false;
    if (this.h.state().site) return true;
    if (!this.due()) return false;
    this.record({ op: "open", staff: "system" });
    return !!this.h.state().site;
  }

  /** A step by an acting body, as the record keeps it. */
  perform(actorId: ActorId, step: SiteStep): SiteOutcome {
    const L = this.h.locale();
    const staff = this.staffOf(actorId);
    const site = this.config();
    if (!site) return this.refused(step.step, staff, rt(L, "site.none"));
    if (!this.ensureOpen()) return this.refused(step.step, staff, rt(L, "site.notDue"));
    const where = this.placed(actorId, step);
    if (where) return { ...where, data: { step: step.step, status: this.status(), staff } };
    // the step takes its time before it is on the record (an entry's time is when it was done)
    const seconds = this.seconds(step);
    this.h.elapse(seconds);
    return { ...this.apply(site, staff, step), seconds };
  }

  private apply(site: TeamSite, staff: string, step: SiteStep): SiteOutcome {
    const L = this.h.locale();
    switch (step.step) {
      case "read":
        return this.outcome(step.step, staff, this.record({ op: "read", source: step.source, staff }));
      case "raise":
        return this.outcome(step.step, staff, this.record({ op: "raise", sources: step.sources, staff }));
      case "mark":
        return this.outcome(step.step, staff, this.record({ op: "mark", side: step.side, staff }));
      case "amend":
        return this.outcome(step.step, staff, this.record({ op: "amend", source: step.source, to: step.to, staff }));
      case "confirm":
        return this.outcome(step.step, staff, this.record({ op: "confirm", staff }));
      case "escalate":
        return this.outcome(step.step, staff, this.record({ op: "escalate", staff, reason: step.reason?.trim() || this.discrepancyText("site.pause.reason") || rt(L, "site.status.unresolved") }));
      case "pause": {
        const reason = step.reason?.trim() || this.discrepancyText("site.pause.reason");
        if (!reason) return this.refused(step.step, staff, rt(L, "site.refused", { reason: rt(L, "site.pause.none") }));
        const r = this.h.dispatch({ type: "hold", interventionId: site.holds, placedBy: staff, reason, by: "system" });
        if (r.rejected) return this.refused(step.step, staff, rt(L, "site.refused", { reason: sentence(r.rejected.message) }), r.rejected);
        return { ok: true, output: rt(L, "hold.placed", { name: this.stepName(site.holds), by: this.name(staff), reason: sentence(reason) }), data: { step: step.step, status: this.status(), staff } };
      }
      case "resume": {
        const reassessment = step.reassessment?.trim() || this.justification();
        const r = this.h.dispatch({ type: "release-hold", interventionId: site.holds, releasedBy: staff, reassessment, by: "system" });
        if (r.rejected) return this.refused(step.step, staff, rt(L, "site.refused", { reason: sentence(r.rejected.message) }), r.rejected);
        return { ok: true, output: rt(L, "hold.released", { name: this.stepName(site.holds), by: this.name(staff), reassessment: sentence(reassessment) }), data: { step: step.step, status: this.status(), staff } };
      }
      default:
        return this.refused(String((step as { step?: unknown }).step), staff, rt(L, "site.refused", { reason: rt(L, "site.unknownStep", { step: String((step as { step?: unknown }).step) }) }));
    }
  }

  /** The hold on the site's step that stands now (placed since the discrepancy), if any: who placed it. */
  pausedBy(): string | null {
    const site = this.config();
    if (!site) return null;
    return (this.h.state().holds ?? []).find((h) => h.interventionId === site.holds && !h.released)?.placedBy ?? null;
  }

  /**
   * What justifies releasing the pause, from the record: who confirmed the site and on what, what was verified since
   * the discrepancy, what was put right. Before the site is confirmed there is nothing to say but that.
   */
  justification(): string {
    const L = this.h.locale();
    const c = this.h.caseDef;
    const ledger = siteLedger(c, this.h.state());
    const status = ledger.status;
    if (!ledger.confirmed || (status !== "confirmed" && status !== "corrected")) return rt(L, "site.resume.unverified");
    const confirm = this.h.state().site?.entries.findLast((e) => e.op === "confirm");
    const list = (ids: readonly string[]) => joinList(L, [...new Set(ids)].map((id) => this.sourceName(id)));
    const corrections = ledger.corrections
      .map((x) => (x.what === "mark" ? rt(L, "site.resume.marked", { side: this.sideName(x.side), by: this.name(x.by) }) : rt(L, "site.resume.amended", { source: this.sourceName(x.source), side: this.sideName(x.to), by: this.name(x.by) })))
      .join("");
    return rt(L, "site.resume.justified", {
      side: this.sideName(ledger.confirmed.side),
      confirmer: this.name(ledger.confirmed.by),
      basis: list(confirm?.op === "confirm" ? (confirm.basis ?? []) : []),
      verified: list(ledger.verified.map((v) => v.source)) || this.sourceName("mark"),
      corrections,
    });
  }

  /** Dispatch a site op by the system (the record of what a body did); the engine validates it and writes what was seen. */
  record(op: SiteOp): ReduceResult {
    return this.h.dispatch({ type: "site", site: op, by: "system" });
  }

  /** Is this body at the patient's side now (where the mark is looked at, and made)? */
  atPatient(actorId: ActorId): boolean {
    const patient = this.h.world().find(actorId, { kind: "patient", limit: 1 })[0];
    return !!patient && patient.distance <= RANGES.contact;
  }

  /* ---------------------------------------------------------------- */

  private seconds(step: SiteStep): number {
    const kind = (source: string) => (source === "mark" ? "mark" : (this.config()?.evidence.find((e) => e.id === source)?.kind ?? "document"));
    if (step.step === "read") return SITE_SECONDS[kind(step.source)];
    if (step.step === "mark") return SITE_SECONDS.marking;
    if (step.step === "amend") return SITE_SECONDS.amend;
    return SITE_SECONDS.said;
  }

  /**
   * Where the body has to be for the step: at the patient's side for the mark (to look at it or make it), within
   * talking distance for the patient's own word, in the patient's room for a document or the imaging. Null: it is.
   */
  private placed(actorId: ActorId, step: SiteStep): Pick<SiteOutcome, "ok" | "output" | "code" | "goal"> | null {
    const L = this.h.locale();
    const site = this.config()!;
    const w = this.h.world();
    const source = step.step === "read" || step.step === "amend" ? step.source : step.step === "mark" ? "mark" : null;
    if (!source) return null;
    const patient = w.find(actorId, { kind: "patient", limit: 1 })[0];
    const room = w.patientPlace()?.room ?? null;
    const body = w.actor(actorId);
    if (!patient || !body) return null;
    const kind = source === "mark" ? "mark" : site.evidence.find((e) => e.id === source)?.kind;
    const metres = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
    if (kind === "mark" && !(patient.distance <= RANGES.contact)) {
      return { ok: false, code: "NOT_AT_PATIENT", output: rt(L, "site.atPatient", { range: RANGES.contact, distance: metres(patient.distance) }), goal: { kind: "interact", id: patient.id } };
    }
    if (kind === "patient" && !(body.room === room && patient.distance <= RANGES.talk)) {
      return { ok: false, code: "NOT_AT_PATIENT", output: rt(L, "site.withPatient", { range: RANGES.talk }), goal: { kind: "entity", id: patient.id, range: RANGES.talk - 0.5 } };
    }
    if ((kind === "document" || kind === "imaging") && room && body.room !== room) {
      return { ok: false, code: "NOT_IN_ROOM", output: rt(L, "site.inRoom"), goal: { kind: "room", id: room } };
    }
    return null;
  }

  private refused(step: string, staff: string, output: string, rejected?: { code: string; message: string }): SiteOutcome {
    return { ok: false, code: "REFUSED", output, data: { step, status: this.status(), staff, ...(rejected ? { rejected } : {}) } };
  }

  private outcome(step: string, staff: string, r: ReduceResult): SiteOutcome {
    const L = this.h.locale();
    const status = siteStatus(r.state.site);
    const statusText = rt(L, `site.status.${status}` as RuntimeKey);
    if (r.rejected) return this.refused(step, staff, rt(L, "site.refused", { reason: sentence(r.rejected.message) }), r.rejected);
    const e = r.state.site?.entries.at(-1);
    const who = this.name(staff);
    const data = { step, status, staff };
    // a sentence starts with a capital ("The surgeon looked at…")
    const said = (output: string, more: Partial<SiteOutcome["data"]> = {}): SiteOutcome => ({ ok: true, output: output.charAt(0).toUpperCase() + output.slice(1), data: { ...data, ...more } });
    if (!e) return said(statusText);
    switch (e.op) {
      case "read": {
        const value = e.value ?? null;
        if (e.source === "mark") return said(value === null ? rt(L, "site.read.mark.none", { staff: who }) : rt(L, "site.read.mark", { staff: who, side: this.sideName(value) }), { source: e.source, value });
        const asked = this.config()?.evidence.find((x) => x.id === e.source)?.kind === "patient";
        return said(rt(L, asked ? "site.read.patient" : "site.read.evidence", { staff: who, source: this.sourceName(e.source), side: this.sideName(value) }), { source: e.source, value });
      }
      case "raise":
        return said(rt(L, "site.raised", { staff: who, a: this.sourceName(e.sources[0]), va: this.sideName(e.values?.[0] ?? null), b: this.sourceName(e.sources[1]), vb: this.sideName(e.values?.[1] ?? null), status: statusText }));
      case "mark":
        return said(rt(L, "site.marked", { staff: who, side: this.sideName(e.side) }), { side: e.side });
      case "amend":
        return said(rt(L, "site.amended", { staff: who, source: this.sourceName(e.source), side: this.sideName(e.to) }), { source: e.source, side: e.to });
      case "confirm":
        return said(rt(L, "site.confirmed", { staff: who, side: this.sideName(e.side ?? null), basis: joinList(L, (e.basis ?? []).map((id) => this.sourceName(id))), status: statusText }), e.side ? { side: e.side } : {});
      case "escalate":
        return said(rt(L, "site.escalated", { staff: who, reason: sentence(e.reason), status: statusText }));
      default:
        return said(statusText);
    }
  }

  /** The open discrepancy in words (a hold's reason), or "" when none is open. */
  private discrepancyText(key: RuntimeKey): string {
    const r = this.h.state().site;
    const open = r ? openDiscrepancy(r) : null;
    if (!open) return "";
    return rt(this.h.locale(), key, { a: this.sourceName(open.sources[0]), va: this.sideName(open.values?.[0] ?? null), b: this.sourceName(open.sources[1]), vb: this.sideName(open.values?.[1] ?? null) });
  }

  /** A side in words ("the patient's left"); null: not marked. */
  sideName(side: string | null): string {
    const L = this.h.locale();
    if (side === null) return rt(L, "site.noMark");
    const name = this.config()?.sides[side];
    return name ? t(name, L) : side;
  }

  /** A source in words: the skin mark, or a piece of evidence by its name. */
  sourceName(source: string): string {
    const L = this.h.locale();
    if (source === "mark") return rt(L, "site.source.mark");
    const e = this.config()?.evidence.find((x) => x.id === source);
    return e ? t(e.name, L) : source;
  }

  private stepName(interventionId: string): string {
    const iv = this.h.caseDef.interventions.find((i) => i.id === interventionId);
    return iv ? t(iv.name, this.h.locale()) : interventionId;
  }

  /** A person as the room knows them. */
  private name(staff: string): string {
    const L = this.h.locale();
    if (staff === "surgeon") return rt(L, "site.surgeon");
    const e = this.h.world().entity(`staff:${staff}`);
    return e ? t(e.name, L) : staff;
  }

  /** What has been verified since the discrepancy was raised (the primary evidence read, agreeing or not). */
  verification(): { verified: boolean; side: string | null; missing: string[]; conflict: boolean } {
    const raised = this.h.state().site?.entries.findLast((e) => e.op === "raise");
    return siteVerification(this.h.caseDef, this.h.state(), raised ? raised.seq : -1);
  }
}
