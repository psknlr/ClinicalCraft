/**
 * Deterministic assessment of a session — a teaching-script measure, never a
 * validated competency score (docs/ARCHITECTURE.md §2.1 rule 5).
 */
import { claimsMatchField } from "./procedure/claims.js";
import { countSummary } from "./count.js";
import { ENGINE_VERSION } from "./version.js";
import { procedureFor } from "./procedure/variant.js";
import type { CaseDefinition, RubricItem } from "../schema/case.js";
import type { JoinRecord, SessionState } from "../schema/session.js";
import { evaluate, parseResultKey, resultFor } from "./conditions.js";
import { patientAlarmsAt } from "./physiology.js";
import { progress } from "./queries.js";
import { creditedHistory } from "./twins.js";
import { studyStatus } from "./study.js";
import { unique } from "./text.js";
import type { AssessmentReport } from "./types.js";

/** Source-only or expanded (new investigations ordered), and how far each new investigation got (docs/STUDIES.md §7). */
function studySummary(s: SessionState): Pick<AssessmentReport, "evidence" | "studies"> {
  const codes = [...new Set((s.studies?.orders ?? []).map((o) => o.code))];
  if (!codes.length) return { evidence: "source-only" };
  return { evidence: "expanded", studies: codes.map((code) => ({ code, status: studyStatus(s, code)!, accessions: s.studies!.accessions.filter((a) => a.code === code).length })) };
}

/**
 * `count` = distinct known ids in `done`; required items count as done when `credited` (default `done`) has them.
 * Items in `team` (what the team had done when the learner joined it in a place) are the team's: left out altogether.
 */
function coverage(items: { id: string; required: boolean }[], done: string[], credited: string[] = done, team: ReadonlySet<string> = new Set()) {
  const own = items.filter((i) => !team.has(i.id));
  const known = new Set(own.map((i) => i.id));
  const required = own.filter((i) => i.required);
  const missingRequired = required.filter((i) => !credited.includes(i.id)).map((i) => i.id);
  return {
    count: unique(done).filter((id) => known.has(id)).length,
    required: required.length,
    requiredDone: required.length - missingRequired.length,
    missingRequired,
  };
}

/** What the team had done when the learner joined it in a place (`SessionState.joined`); null for the operating surgeon. */
function joinedOf(s: SessionState): JoinRecord | null {
  return s.seat && s.joined ? s.joined : null;
}

/** Whether a rubric item scores the learner's place: an item without `seats` is the operating surgeon's (no place). */
function scoresPlace(item: RubricItem, s: SessionState): boolean {
  return (item.seats ?? ["surgeon"]).includes(s.seat ?? "surgeon");
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

/**
 * In a place, the orders the team placed before the learner joined are the team's: what was ordered, of low value or
 * harmful, and left unread counts the learner's own orders; an essential test the team ordered is not missing.
 */
function investigationSummary(c: CaseDefinition, s: SessionState, joined: JoinRecord | null = null): AssessmentReport["investigations"] {
  const orderedIds = unique(s.orders.map((o) => o.investigationId));
  const own = joined ? s.orders.filter((o) => !joined.orders.includes(o.key)) : s.orders;
  const ownIds = joined ? unique(own.map((o) => o.investigationId)) : orderedIds;
  // investigations with an informative result read in some phase (an `available: false` record yields no information)
  const informativeReads = new Set(
    s.seen.flatMap((key) => {
      const { investigationId, phase } = parseResultKey(key);
      return resultFor(c, investigationId, phase)?.available === true ? [investigationId] : [];
    }),
  );
  const byValue = (value: string) => c.investigations.filter((i) => i.value === value && ownIds.includes(i.id)).map((i) => i.id);
  // an essential investigation is satisfied by ordering it, or by reading (any phase) an available result of one of its alternatives
  const satisfied = (id: string) => orderedIds.includes(id) || alternativesOf(c, id).some((alt) => informativeReads.has(alt));
  return {
    ordered: own.length,
    essentialMissing: c.investigations.filter((i) => i.value === "essential" && !satisfied(i.id)).map((i) => i.id),
    lowValue: byValue("low-value"),
    harmful: byValue("harmful"),
    // ordered results that carry information but were never read ("no record" / available:false results are not counted)
    unread: own.filter((o) => !s.seen.includes(o.key) && resultFor(c, o.investigationId, o.phase)?.available === true).map((o) => o.key),
  };
}

/** In a place, a decision the team had answered before the learner joined is the team's: not listed. */
function decisionSummary(c: CaseDefinition, s: SessionState, joined: JoinRecord | null = null): AssessmentReport["decisions"] {
  return c.decisions.filter((d) => !joined?.decisions.includes(d.id)).map((d) => {
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
 * doing nothing) or when it is not the learner's place's item (`seats`; an item without them is the operating
 * surgeon's), `critical: true` for a critical item; the score over the scored deterministic items; and,
 * when the case marks critical items, the ones missed.
 */
function rubricSummary(c: CaseDefinition, s: SessionState): Pick<AssessmentReport, "rubric" | "score" | "criticalMissed"> {
  const rubric: AssessmentReport["rubric"] = c.rubric.map((item) => ({
    id: item.id,
    domain: item.domain,
    weight: item.weight,
    met: item.met ? evaluate(c, s, item.met) : null,
    ...(!scoresPlace(item, s) || (item.scoredWhen && !evaluate(c, s, item.scoredWhen)) ? { scored: false as const } : {}),
    ...(item.critical ? { critical: true as const } : {}),
  }));
  const scored = rubric.filter((r) => r.met !== null && r.scored !== false);
  const possible = scored.reduce((sum, r) => sum + r.weight, 0);
  const earned = scored.filter((r) => r.met).reduce((sum, r) => sum + r.weight, 0);
  const percent = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  const critical = c.rubric.some((item) => item.critical) ? { criticalMissed: scored.filter((r) => r.critical && r.met === false).map((r) => r.id) } : {};
  return { rubric, score: { earned: tidy(earned), possible: tidy(possible), percent }, ...critical };
}

/** Safety gates that hold at the end, the verdict, and the cap a safety-critical gate puts on the percentage. */
function gateSummary(c: CaseDefinition, s: SessionState) {
  const gates = c.safetyGates.filter((g) => evaluate(c, s, g.when));
  const critical = gates.filter((g) => g.verdict === "safety-critical");
  const verdict: "clear" | "complication" | "safety-critical" = critical.length ? "safety-critical" : gates.length ? "complication" : "clear";
  const cap = critical.length ? Math.min(...critical.map((g) => g.capPercent ?? 40)) : null;
  return { gates: gates.map((g) => ({ id: g.id, verdict: g.verdict })), verdict, cap };
}

/**
 * What the team had done when the learner joined it in a place, in the case's order: the history credited, findings
 * examined, tests ordered (in the order placed), decisions answered and objectives done.
 */
function joinedSummary(c: CaseDefinition, s: SessionState, joined: JoinRecord, history: ReadonlySet<string>): NonNullable<AssessmentReport["joined"]> {
  return {
    history: c.history.filter((h) => history.has(h.id)).map((h) => h.id),
    exam: c.exam.filter((e) => joined.examined.includes(e.id)).map((e) => e.id),
    investigations: unique(s.orders.filter((o) => joined.orders.includes(o.key)).map((o) => o.investigationId)),
    decisions: c.decisions.filter((d) => joined.decisions.includes(d.id)).map((d) => d.id),
    objectives: c.objectives.filter((o) => joined.objectives.includes(o.id)).map((o) => o.id),
  };
}

function procedureSummary(c: CaseDefinition, s: SessionState): AssessmentReport["procedure"] {
  const p = s.procedure;
  const def = procedureFor(c, s);
  if (!p || !def) return undefined;
  return {
    unsafe: p.unsafe.map((u) => ({ ...u })),
    // who did it and who said it aloud, when a colleague (absent: the operator)
    injuries: p.injuries.map((i) => ({ kind: i.kind, structure: i.structure, recognised: i.recognised, severity: i.severity, ...(i.by ? { by: i.by } : {}), ...(i.recognisedBy ? { recognisedBy: i.recognisedBy } : {}) })),
    pauses: p.pauses.map((x) => ({ view: x.view, at: x.at, achieved: x.achieved, claimsMatchField: claimsMatchField(def, x) })),
    counters: { ...p.counters },
    ...(p.colleagueFalseAlarms ? { colleagueFalseAlarms: p.colleagueFalseAlarms.map((a) => ({ ...a })) } : {}),
  };
}

/**
 * Assess a session against its case (pure). In a place in the team (`seat`, docs/TEAM.md §1) only the place's rubric
 * items are scored, and what the team had done before the learner joined is reported apart (`joined`), never credited:
 * the history, examination, investigation and decision sections count what was left to do then. Safety gates stay the
 * team's outcomes, in every place.
 */
export function assess(c: CaseDefinition, s: SessionState): AssessmentReport {
  const p = progress(c, s);
  const joined = joinedOf(s);
  // Required history asked through a phase twin (`supersedes`) is credited; `asked` counts the questions really asked.
  const teamHistory = joined ? new Set(creditedHistory(c, { ...s, asked: joined.asked })) : undefined;
  const history = coverage(c.history, s.asked, creditedHistory(c, s), teamHistory);
  const exam = coverage(c.exam, s.examined, s.examined, joined ? new Set(joined.examined) : undefined);
  const { rubric, score: raw, criticalMissed } = rubricSummary(c, s);
  const gates = c.safetyGates.length ? gateSummary(c, s) : null;
  const score = gates?.cap != null && raw.percent > gates.cap ? { ...raw, percent: gates.cap, uncapped: raw.percent } : raw;
  const procedure = procedureSummary(c, s);
  const count = countSummary(s);
  return {
    caseId: c.id,
    caseVersion: c.version,
    engine: ENGINE_VERSION,
    completed: p.complete,
    finished: s.finished,
    ...(s.seat ? { seat: s.seat } : {}),
    ...studySummary(s),
    minutes: s.clock,
    hints: s.hints,
    objectives: p.objectives.map((o) => (o.done ? { id: o.id, done: true, at: o.doneAt } : { id: o.id, done: false })),
    ...(joined ? { joined: joinedSummary(c, s, joined, teamHistory!) } : {}),
    history: { asked: history.count, required: history.required, requiredAsked: history.requiredDone, missingRequired: history.missingRequired },
    exam: { performed: exam.count, required: exam.required, requiredPerformed: exam.requiredDone, missingRequired: exam.missingRequired },
    investigations: investigationSummary(c, s, joined),
    decisions: decisionSummary(c, s, joined),
    safety: {
      contraindicated: s.interventions.filter((r) => r.appropriateness === "contraindicated").map((r) => ({ interventionId: r.interventionId, at: r.at })),
      criticalAlarms: countCriticalAlarms(c, s),
      ...(gates ? { gates: gates.gates, verdict: gates.verdict } : {}),
    },
    ...(procedure ? { procedure } : {}),
    ...(count ? { count } : {}),
    rubric,
    score,
    ...(criticalMissed ? { criticalMissed } : {}),
  };
}
