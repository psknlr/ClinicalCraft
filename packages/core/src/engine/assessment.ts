/**
 * Deterministic assessment of a session — a teaching-script measure, never a
 * validated competency score (docs/ARCHITECTURE.md §2.1 rule 5).
 */
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { evaluate, resultFor } from "./conditions.js";
import { alarmsAt } from "./physiology.js";
import { progress } from "./queries.js";
import { unique } from "./text.js";
import type { AssessmentReport } from "./types.js";

function coverage(items: { id: string; required: boolean }[], done: string[]) {
  const known = new Set(items.map((i) => i.id));
  const required = items.filter((i) => i.required);
  const missingRequired = required.filter((i) => !done.includes(i.id)).map((i) => i.id);
  return {
    count: unique(done).filter((id) => known.has(id)).length,
    required: required.length,
    requiredDone: required.length - missingRequired.length,
    missingRequired,
  };
}

function investigationSummary(c: CaseDefinition, s: SessionState): AssessmentReport["investigations"] {
  const orderedIds = unique(s.orders.map((o) => o.investigationId));
  const byValue = (value: string) => c.investigations.filter((i) => i.value === value && orderedIds.includes(i.id)).map((i) => i.id);
  return {
    ordered: s.orders.length,
    essentialMissing: c.investigations.filter((i) => i.value === "essential" && !orderedIds.includes(i.id)).map((i) => i.id),
    lowValue: byValue("low-value"),
    harmful: byValue("harmful"),
    unread: s.orders.filter((o) => !s.seen.includes(o.key) && resultFor(c, o.investigationId, o.phase) != null).map((o) => o.key),
  };
}

function decisionSummary(c: CaseDefinition, s: SessionState): AssessmentReport["decisions"] {
  return c.decisions.map((d) => {
    const attempts = s.attempts.filter((a) => a.decisionId === d.id);
    return {
      id: d.id,
      firstTryCorrect: attempts.length > 0 && attempts[0].correct,
      attempts: attempts.length,
      decided: Object.prototype.hasOwnProperty.call(s.decisions, d.id),
    };
  });
}

/** Minutes at which vitals are sampled for alarm counting: every integer minute up to the clock, plus the clock. */
function sampleMinutes(clock: number): number[] {
  const out: number[] = [];
  for (let m = 0; m < clock; m++) out.push(m);
  out.push(clock);
  return out;
}

/**
 * Number of critical-alarm onsets (a vital entering the critical band) over
 * the session, sampled each simulated minute from 0 to the clock — the same
 * grid the reducer uses, so it matches the `vitals.alarm` events.
 */
export function countCriticalAlarms(c: CaseDefinition, s: SessionState): number {
  if (!c.physiology || !s.started) return 0;
  let count = 0;
  let critical = new Set<string>();
  for (const minute of sampleMinutes(s.clock)) {
    const now = new Set(alarmsAt(c, s, minute).filter((a) => a.level === "critical").map((a) => a.vital));
    for (const vital of now) if (!critical.has(vital)) count++;
    critical = now;
  }
  return count;
}

function rubricSummary(c: CaseDefinition, s: SessionState) {
  const rubric = c.rubric.map((item) => ({
    id: item.id,
    domain: item.domain,
    weight: item.weight,
    met: item.met ? evaluate(c, s, item.met) : null,
  }));
  const scored = rubric.filter((r) => r.met !== null);
  const possible = scored.reduce((sum, r) => sum + r.weight, 0);
  const earned = scored.filter((r) => r.met).reduce((sum, r) => sum + r.weight, 0);
  const percent = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  return { rubric, score: { earned, possible, percent } };
}

/** Assess a session against its case (pure). */
export function assess(c: CaseDefinition, s: SessionState): AssessmentReport {
  const p = progress(c, s);
  const history = coverage(c.history, s.asked);
  const exam = coverage(c.exam, s.examined);
  const { rubric, score } = rubricSummary(c, s);
  return {
    caseId: c.id,
    completed: p.complete,
    minutes: s.clock,
    hints: s.hints,
    objectives: p.objectives.map((o) => (o.done ? { id: o.id, done: true, at: o.doneAt } : { id: o.id, done: false })),
    history: { asked: history.count, required: history.required, requiredAsked: history.requiredDone, missingRequired: history.missingRequired },
    exam: { performed: exam.count, required: exam.required, requiredPerformed: exam.requiredDone, missingRequired: exam.missingRequired },
    investigations: investigationSummary(c, s),
    decisions: decisionSummary(c, s),
    safety: {
      contraindicated: s.interventions.filter((r) => r.appropriateness === "contraindicated").map((r) => ({ interventionId: r.interventionId, at: r.at })),
      criticalAlarms: countCriticalAlarms(c, s),
    },
    rubric,
    score,
  };
}
