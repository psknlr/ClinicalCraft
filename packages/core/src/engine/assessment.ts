/**
 * Deterministic assessment of a session — a teaching-script measure, never a
 * validated competency score (docs/ARCHITECTURE.md §2.1 rule 5).
 */
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { evaluate, parseResultKey, resultFor } from "./conditions.js";
import { patientAlarmsAt } from "./physiology.js";
import { progress } from "./queries.js";
import { creditedHistory } from "./twins.js";
import { unique } from "./text.js";
import type { AssessmentReport } from "./types.js";

/** `count` = distinct known ids in `done`; required items count as done when `credited` (default `done`) has them. */
function coverage(items: { id: string; required: boolean }[], done: string[], credited: string[] = done) {
  const known = new Set(items.map((i) => i.id));
  const required = items.filter((i) => i.required);
  const missingRequired = required.filter((i) => !credited.includes(i.id)).map((i) => i.id);
  return {
    count: unique(done).filter((id) => known.has(id)).length,
    required: required.length,
    requiredDone: required.length - missingRequired.length,
    missingRequired,
  };
}

/**
 * Investigations linked to `id` by `alternativeTo` in either direction
 * (the relation is mutual: "A is an alternative to B" ⇔ "B is an alternative to A").
 */
function alternativesOf(c: CaseDefinition, id: string): string[] {
  // `?? []`: cases built in code (not via parseCase) may omit the defaulted field
  const own = c.investigations.find((i) => i.id === id)?.alternativeTo ?? [];
  const reverse = c.investigations.filter((i) => i.id !== id && (i.alternativeTo ?? []).includes(id)).map((i) => i.id);
  return unique([...own, ...reverse]).filter((alt) => alt !== id);
}

function investigationSummary(c: CaseDefinition, s: SessionState): AssessmentReport["investigations"] {
  const orderedIds = unique(s.orders.map((o) => o.investigationId));
  // investigations with an informative result read in some phase (an `available: false` record yields no information)
  const informativeReads = new Set(
    s.seen.flatMap((key) => {
      const { investigationId, phase } = parseResultKey(key);
      return resultFor(c, investigationId, phase)?.available === true ? [investigationId] : [];
    }),
  );
  const byValue = (value: string) => c.investigations.filter((i) => i.value === value && orderedIds.includes(i.id)).map((i) => i.id);
  // an essential investigation is satisfied by ordering it, or by reading (any phase) an available result of one of its alternatives
  const satisfied = (id: string) => orderedIds.includes(id) || alternativesOf(c, id).some((alt) => informativeReads.has(alt));
  return {
    ordered: s.orders.length,
    essentialMissing: c.investigations.filter((i) => i.value === "essential" && !satisfied(i.id)).map((i) => i.id),
    lowValue: byValue("low-value"),
    harmful: byValue("harmful"),
    // ordered results that carry information but were never read ("no record" / available:false results are not counted)
    unread: s.orders.filter((o) => !s.seen.includes(o.key) && resultFor(c, o.investigationId, o.phase)?.available === true).map((o) => o.key),
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

/**
 * Minutes at which vitals are sampled for alarm counting: every integer
 * minute up to the clock, the clock, and every recorded moment at which the
 * reducer settled (action start times of orders, results, interventions,
 * attempts, notes; fired events, trend stops and objective completions) —
 * so fractional settle points are seen as the reducer saw them.
 */
function sampleMinutes(c: CaseDefinition, s: SessionState): number[] {
  const points = new Set<number>();
  for (let m = 0; m < s.clock; m++) points.add(m);
  const recorded = [
    ...s.orders.flatMap((o) => (c.clock.mode === "simulated" ? [o.orderedAt, o.readyAt] : [o.orderedAt])),
    ...s.interventions.map((r) => r.at),
    ...s.attempts.map((a) => a.at),
    ...s.notes.map((n) => n.at),
    ...Object.values(s.firedEvents),
    ...Object.values(s.trendStops),
    ...Object.values(s.objectivesDone),
  ];
  for (const at of recorded) if (at >= 0 && at < s.clock) points.add(at);
  points.add(s.clock);
  return [...points].sort((a, b) => a - b);
}

/**
 * Number of critical-alarm onsets (a vital entering the critical band) over
 * the session, sampled at every simulated minute from 0 to the clock plus
 * the recorded fractional moments — the grid the reducer settles on, so it
 * matches the `vitals.alarm` events of a monitor on from the start (an alarm
 * that starts and ends between two unrecorded fractional action boundaries
 * can still be missed). It counts the patient's critical episodes
 * (`patientAlarmsAt`), not the alarms a monitor raised: a case whose monitor
 * the learner must attach (`physiology.monitor`) scores the same course the
 * same whether the monitor went on early, late or never.
 */
export function countCriticalAlarms(c: CaseDefinition, s: SessionState): number {
  if (!c.physiology || !s.started) return 0;
  let count = 0;
  let critical = new Set<string>();
  for (const minute of sampleMinutes(c, s)) {
    const now = new Set(patientAlarmsAt(c, s, minute).filter((a) => a.level === "critical").map((a) => a.vital));
    for (const vital of now) if (!critical.has(vital)) count++;
    critical = now;
  }
  return count;
}

/** Remove binary floating-point noise from weight sums (0.1 + 0.2 → 0.3). */
function tidy(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * The rubric as assessed: each item's `met` (null for a judged item), `scored: false` while its `scoredWhen`
 * does not hold (it then counts neither as earned nor as possible — an avoided-harm item is not earned by
 * doing nothing), `critical: true` for a critical item; the score over the scored deterministic items; and,
 * when the case marks critical items, the ones missed.
 */
function rubricSummary(c: CaseDefinition, s: SessionState): Pick<AssessmentReport, "rubric" | "score" | "criticalMissed"> {
  const rubric: AssessmentReport["rubric"] = c.rubric.map((item) => ({
    id: item.id,
    domain: item.domain,
    weight: item.weight,
    met: item.met ? evaluate(c, s, item.met) : null,
    ...(item.scoredWhen && !evaluate(c, s, item.scoredWhen) ? { scored: false as const } : {}),
    ...(item.critical ? { critical: true as const } : {}),
  }));
  const scored = rubric.filter((r) => r.met !== null && r.scored !== false);
  const possible = scored.reduce((sum, r) => sum + r.weight, 0);
  const earned = scored.filter((r) => r.met).reduce((sum, r) => sum + r.weight, 0);
  const percent = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  const critical = c.rubric.some((item) => item.critical) ? { criticalMissed: scored.filter((r) => r.critical && r.met === false).map((r) => r.id) } : {};
  return { rubric, score: { earned: tidy(earned), possible: tidy(possible), percent }, ...critical };
}

/** Assess a session against its case (pure). */
export function assess(c: CaseDefinition, s: SessionState): AssessmentReport {
  const p = progress(c, s);
  // Required history asked through a phase twin (`supersedes`) is credited; `asked` counts the questions really asked.
  const history = coverage(c.history, s.asked, creditedHistory(c, s));
  const exam = coverage(c.exam, s.examined);
  const { rubric, score, criticalMissed } = rubricSummary(c, s);
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
    ...(criticalMissed ? { criticalMissed } : {}),
  };
}
