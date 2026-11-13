/**
 * `verifyCase` — proves a case is winnable by replaying its reference
 * solution (`clinicalcraft case verify`, test-suite).
 */
import type { CaseDefinition } from "../schema/case.js";
import { ClinicalActionSchema, type ClinicalAction, type DomainEvent } from "../schema/session.js";
import { assess } from "./assessment.js";
import { formatDose } from "./dose.js";
import { ecgAttached, monitorAttachedAt } from "./monitor.js";
import { formatPath, issuesFromZodError } from "./parse.js";
import { progress } from "./queries.js";
import { createSession, reduce } from "./reducer.js";
import type { Issue, VerifyResult } from "./types.js";

function parseSolution(c: CaseDefinition): { actions: ClinicalAction[]; sourceIndex: number[]; issues: Issue[] } {
  const actions: ClinicalAction[] = [];
  const sourceIndex: number[] = [];
  const issues: Issue[] = [];
  c.solution.forEach((raw, i) => {
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (parsed.success) {
      actions.push(parsed.data);
      sourceIndex.push(i);
    } else {
      for (const issue of issuesFromZodError(parsed.error, raw)) {
        issues.push({ ...issue, path: formatPath(["solution", i, ...(issue.path ? issue.path.split(".") : [])]) });
      }
    }
  });
  // a solution may begin with pre-start actions (set-phase, note, flag) before its own `start`
  if (!actions.some((a) => a.type === "start")) {
    actions.unshift({ type: "start" });
    sourceIndex.unshift(-1);
  }
  return { actions, sourceIndex, issues };
}

/**
 * What a step of the reference path did against safety (`DomainEvent`s of one accepted action): an intervention given
 * while contraindicated — an error unless `errorRecovery` declares it (then a warning when it was a critical safety
 * failure) — and a dose error (always an error).
 */
function stepSafety(events: DomainEvent[], path: string, declared: ReadonlySet<string>, given: Set<string>): Issue[] {
  const issues: Issue[] = [];
  for (const e of events) {
    if (e.type === "dose.error") {
      issues.push({ path, message: `the dose ordered for "${e.interventionId}" (${formatDose(e.ordered)}) conflicts with its preset (${formatDose(e.preset)}): it was not given — a ${e.severity} dose error`, severity: "error" });
    }
    if (e.type !== "intervention.applied" || e.appropriateness !== "contraindicated") continue;
    const what = e.invalid ? `attempts "${e.interventionId}" out of order (recorded invalid)` : `gives "${e.interventionId}" while it is contraindicated`;
    if (declared.has(e.interventionId)) {
      given.add(e.interventionId);
      if (e.critical) issues.push({ path, message: `${what}, as errorRecovery declares — a critical safety failure: the reference path's assessment does not pass safety`, severity: "warning" });
      continue;
    }
    const critical = e.critical ? " — a critical safety failure" : "";
    issues.push({ path, message: `${what}${critical}: the reference path is the intended course (declare deliberate error-recognition teaching in errorRecovery)`, severity: "error" });
  }
  return issues;
}

/**
 * Replay `c.solution` from a fresh session (a leading `start` is added when
 * the solution has none). `ok` iff every action parses and is accepted,
 * every objective is done, every decision is decided, the session did
 * not run into `clock.limitMinutes` (a timeout debrief is not a win), no
 * step gives an intervention while it is contraindicated (unless the case's
 * `errorRecovery` declares it), no order's dose conflicts with its preset
 * and the final state's safety outcome passes — a safety-critical gate
 * holding at the end fails it (a warning with `errorRecovery`). A
 * solution that never attaches the case's bedside monitor
 * (`physiology.monitor`), or never its ECG leads (`ecgWhen`), draws a
 * warning, as does an `errorRecovery` id the path never gives while
 * contraindicated. The assessment of the final state is included.
 */
export function verifyCase(c: CaseDefinition): VerifyResult {
  const { actions, sourceIndex, issues } = parseSolution(c);
  const where = (i: number) => (sourceIndex[i] >= 0 ? formatPath(["solution", sourceIndex[i]]) : "solution");
  const declared = new Set(c.errorRecovery?.interventions ?? []);
  const declaredGiven = new Set<string>();
  let state = createSession(c);
  actions.forEach((action, i) => {
    const r = reduce(c, state, action);
    state = r.state;
    if (r.rejected) {
      issues.push({ path: where(i), message: `${action.type} rejected (${r.rejected.code}): ${r.rejected.message}`, severity: "error" });
      return;
    }
    issues.push(...stepSafety(r.events, where(i), declared, declaredGiven));
    if (r.events.some((e) => e.type === "case.finished" && e.timedOut)) {
      issues.push({ path: where(i), message: `the case reached its time limit (${c.clock.limitMinutes} min) here and ended with a timeout`, severity: "error" });
    }
  });
  for (const objective of progress(c, state).objectives) {
    if (!objective.done) issues.push({ path: "solution", message: `objective "${objective.id}" is not completed by the solution`, severity: "error" });
  }
  for (const decision of c.decisions) {
    if (!Object.prototype.hasOwnProperty.call(state.decisions, decision.id)) {
      issues.push({ path: "solution", message: `decision "${decision.id}" is not answered correctly by the solution`, severity: "error" });
    }
  }
  if (c.physiology?.monitor && monitorAttachedAt(c, state) == null) {
    issues.push({ path: "physiology.monitor.attachedWhen", message: "the reference solution never attaches the bedside monitor", severity: "warning" });
  } else if (c.physiology?.monitor?.ecgWhen && !ecgAttached(c, state)) {
    issues.push({ path: "physiology.monitor.ecgWhen", message: "the reference solution never puts the ECG leads on (no rhythm on the monitor)", severity: "warning" });
  }
  c.errorRecovery?.interventions.forEach((id, j) => {
    if (!declaredGiven.has(id)) issues.push({ path: formatPath(["errorRecovery", "interventions", j]), message: `the reference path never gives "${id}" while it is contraindicated: drop it from errorRecovery`, severity: "warning" });
  });
  const assessment = assess(c, state);
  for (const gate of assessment.safety.gates ?? []) {
    if (gate.verdict !== "safety-critical") continue;
    const path = formatPath(["safetyGates", c.safetyGates.findIndex((g) => g.id === gate.id)]);
    issues.push({ path, message: `the safety-critical gate "${gate.id}" holds at the end of the reference path`, severity: declared.size ? "warning" : "error" });
  }
  return { ok: issues.every((i) => i.severity !== "error"), issues, finalState: state, assessment };
}
