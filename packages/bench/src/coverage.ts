/**
 * What a suite covers (docs/EMBODIED.md §13.9), so a report never lets one number stand for what it does not
 * measure: the case and scenario denominators apart — the cases covered, the scenarios of each case, the share of the
 * most frequent case —, the splits (`dev`, held-out `test`), and the coverage of history-taking, time-critical
 * emergencies and team coordination, read from scenario and case metadata:
 *
 * | kind | a scenario counts when |
 * |---|---|
 * | `history-taking` | it is tagged so, a predicate needs a history item asked, or its reference takes one (an `ask` step, or `solve-case` of a case whose reference solution asks) |
 * | `time-critical` | it is tagged so, or it is a clinical workflow of a case tagged `time-critical` |
 * | `team` | it is tagged so, it is a `multi-agent` scenario, or its reference delegates to staff |
 *
 * Pure: it reads the scenarios, the runs and the cases it is given.
 */
import { conditionRefs, type CaseDefinition, type Condition } from "@clinicalcraft/core";
import { BENCH_SPLITS, COVERAGE_KINDS, type BenchScenario, type BenchSplit, type CoverageKind } from "./schema.js";
import { proportion, type Proportion } from "./stats.js";

/** A scenario's runs as coverage reads them. */
export interface CoverageRun {
  scenarioId: string;
  success: boolean;
  /** Skipped runs (budget, a held-out scenario the agent may not run) count nowhere. */
  skipped: boolean;
}

/** One case's share of the suite. */
export interface CaseCoverage {
  caseId: string;
  /** Scenarios of the case, in all and by split. */
  scenarios: number;
  dev: number;
  test: number;
  /** Task success over the case's runs (skipped runs left out). */
  success: Proportion;
}

/** One coverage kind: which scenarios and cases count under it, and how their runs went. */
export interface KindCoverage {
  kind: CoverageKind;
  scenarios: string[];
  cases: string[];
  success: Proportion;
}

export interface SuiteCoverage {
  /** Scenarios and distinct cases: two denominators, never one. */
  scenarios: number;
  cases: number;
  /** Per case, the most scenarios first (then by id). */
  perCase: CaseCoverage[];
  /** The case with the most scenarios and its share of the suite (0–1); null for an empty suite. */
  mostFrequent: { caseId: string; scenarios: number; share: number } | null;
  /** Scenarios per split. */
  splits: Record<BenchSplit, number>;
  byKind: KindCoverage[];
}

const CLINICAL_CATEGORIES = new Set<BenchScenario["category"]>(["clinical-workflow"]);

function asksIn(cond: Condition): boolean {
  return conditionRefs(cond).some((r) => r.kind === "history");
}

/** The coverage kinds a scenario counts under (see the module docs); `caseDef`: its case, when loaded. */
export function scenarioCoverage(s: BenchScenario, caseDef?: CaseDefinition | null): CoverageKind[] {
  const tags = new Set(s.tags ?? []);
  const out: CoverageKind[] = [];
  const history =
    tags.has("history-taking") ||
    s.predicates.some((p) => "clinical" in p && asksIn(p.clinical)) ||
    s.reference.steps.some((step) => (step.op === "clinical" && step.action.type === "ask") || (step.op === "solve-case" && !!caseDef?.solution.some((a) => a.type === "ask")));
  if (history) out.push("history-taking");
  const timeCritical = tags.has("time-critical") || (CLINICAL_CATEGORIES.has(s.category) && !!caseDef?.tags?.includes("time-critical"));
  if (timeCritical) out.push("time-critical");
  const team = tags.has("team") || s.category === "multi-agent" || s.reference.steps.some((step) => step.op === "delegate");
  if (team) out.push("team");
  return out;
}

/** The suite's coverage, with each case's and kind's task success over `runs` (see `SuiteCoverage`). */
export function suiteCoverage(scenarios: readonly BenchScenario[], runs: readonly CoverageRun[], cases: (id: string) => CaseDefinition | null | undefined): SuiteCoverage {
  const counted = runs.filter((r) => !r.skipped);
  const success = (ids: ReadonlySet<string>): Proportion => {
    const own = counted.filter((r) => ids.has(r.scenarioId));
    return proportion(own.filter((r) => r.success).length, own.length);
  };
  const byCase = new Map<string, BenchScenario[]>();
  for (const s of scenarios) byCase.set(s.caseId, [...(byCase.get(s.caseId) ?? []), s]);
  const perCase: CaseCoverage[] = [...byCase.entries()]
    .map(([caseId, own]) => ({
      caseId,
      scenarios: own.length,
      dev: own.filter((s) => s.split !== "test").length,
      test: own.filter((s) => s.split === "test").length,
      success: success(new Set(own.map((s) => s.id))),
    }))
    .sort((a, b) => b.scenarios - a.scenarios || (a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0));
  const top = perCase[0];
  const splits = Object.fromEntries(BENCH_SPLITS.map((sp) => [sp, scenarios.filter((s) => (s.split ?? "dev") === sp).length])) as Record<BenchSplit, number>;
  const kinds = new Map(scenarios.map((s) => [s.id, scenarioCoverage(s, cases(s.caseId))]));
  const byKind: KindCoverage[] = COVERAGE_KINDS.map((kind) => {
    const own = scenarios.filter((s) => kinds.get(s.id)!.includes(kind));
    return { kind, scenarios: own.map((s) => s.id), cases: [...new Set(own.map((s) => s.caseId))].sort(), success: success(new Set(own.map((s) => s.id))) };
  });
  return {
    scenarios: scenarios.length,
    cases: byCase.size,
    perCase,
    mostFrequent: top ? { caseId: top.caseId, scenarios: top.scenarios, share: top.scenarios / scenarios.length } : null,
    splits,
    byKind,
  };
}
