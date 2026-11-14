/**
 * The benchmark runner (docs/EMBODIED.md §13, R11). For every scenario ×
 * seed: a fresh session (reset per run: new world, new engine state,
 * deterministic ids and logical clock), the scenario setup, the recorder and
 * the audits attached, the agent at work under the scenario's limits (wall
 * time, tool calls, simulated minutes; a live agent's spending cap), then
 * the evaluation of the success predicates on the final authoritative state
 * — never on the agent's text. Each run records its tool calls and results,
 * refusals, token usage, wall latency, simulated minutes, trace size and
 * digests (trace and final state).
 */
import { createHash } from "node:crypto";
import { traceJsonl, type TokenUsage } from "@clinicalcraft/agent";
import { assess, type AssessedDoseError, type AssessmentReport } from "@clinicalcraft/core";
import type { LoadedContent } from "@clinicalcraft/agent/node";
import { canonical, type EpisodeTrace } from "@clinicalcraft/world";
import type { BenchAgent, ProviderTap } from "./agents/types.js";
import { Auditor, type AuditResult } from "./audit.js";
import { benchEnvironment, type BenchEnvironment } from "./environment.js";
import { bm } from "./i18n.js";
import { suiteCoverage, type SuiteCoverage } from "./coverage.js";
import { computeMetrics, metricsByCategory, type Metrics, type RunFacts } from "./metrics.js";
import { evaluatePredicates, type FinalView, type PredicateClass } from "./predicates.js";
import type { Budget } from "./pricing.js";
import { RunRecorder, type RecordedCall, type RecordedRefusal } from "./recorder.js";
import { BENCH_CATEGORIES, BENCH_SPLITS, type BenchCategory, type BenchScenario, type BenchSplit } from "./schema.js";
import { AnswerStore, applySetup, attachApprover, createBenchSession, type SubmittedAnswer } from "./session.js";

export const BENCH_REPORT_FORMAT = "clinicalcraft-bench-report@1" as const;

/** One run of one scenario with one seed. */
export interface BenchRun {
  scenarioId: string;
  category: BenchCategory;
  caseId: string;
  facilityId: string | null;
  locale: string;
  /** The scenario's split: `dev`, or `test` (held out). */
  split: BenchSplit;
  seed: number;
  success: boolean;
  /** `completed`: the agent stopped by itself · `limit`: a limit stopped it · `error`: setup or runtime failure · `skipped`: not run (budget, or a held-out scenario this agent may not run). */
  status: "completed" | "limit" | "error" | "skipped";
  limit?: "timeout" | "maxToolCalls" | "maxSimMinutes" | "budget";
  /** Why a skipped run was not run: the budget was spent, or the scenario is held out from this agent (the scripted control has no plan for it). */
  skip?: "budget" | "held-out";
  error?: string;
  predicates: { kind: string; class: PredicateClass; ok: boolean; detail: string }[];
  calls: RecordedCall[];
  refusals: RecordedRefusal[];
  answer: SubmittedAnswer | null;
  usage: TokenUsage;
  wallMs: number;
  simMinutes: number;
  trace: { spans: number; setupSpans: number; digest: string };
  /** sha256 of the canonical final engine state + world snapshot. */
  stateDigest: string;
  /**
   * `source-only`: the run used the published record alone; `expanded`: it ordered new (simulated) investigations
   * (docs/STUDIES.md §7) — a report scores the two apart (`metrics.byEvidence`).
   */
  evidence: "source-only" | "expanded";
  audit: {
    spatial: { audited: number; violations: AuditResult["spatial"]["violations"] };
    authorisation: { audited: number; unauthorised: AuditResult["authorisation"]["unauthorised"] };
    contraindicated: AuditResult["safety"]["contraindicated"];
  };
  /**
   * The safety outcome of the final state (core `assess`, docs/PROTOCOL.md §3.2), reported beside the predicates:
   * `passed` is false after a critical safety failure, a critical dose error or a safety-critical gate — such a run
   * never counts as a success, whatever its predicates; null when the run left no state to assess (skipped, or
   * failed before its session started).
   */
  safety: BenchSafety;
}

/** A run's safety outcome (`BenchRun.safety`). */
export interface BenchSafety {
  passed: boolean | null;
  /** Critical interventions given while contraindicated: the case's dangerous errors, made. */
  criticalFailures: { interventionId: string; at: number }[];
  /** Orders not given because their dose conflicted with the preset. */
  doseErrors: AssessedDoseError[];
  /** The operation's verdict (cases with a `procedure`), when the case has safety gates. */
  verdict?: NonNullable<AssessmentReport["safety"]["verdict"]>;
}

/** The safety outcome of an assessment as a run records it. */
export function benchSafety(report: Pick<AssessmentReport, "safety">): BenchSafety {
  const s = report.safety;
  return {
    passed: s.passed,
    criticalFailures: s.criticalFailures.map(({ interventionId, at }) => ({ interventionId, at })),
    doseErrors: s.doseErrors.map((e) => ({ ...e, ordered: { ...e.ordered }, preset: { ...e.preset }, conflicts: [...e.conflicts] })),
    ...(s.verdict ? { verdict: s.verdict } : {}),
  };
}

/**
 * What the agent of a report is (EMBODIED §13.4): a `control` (the reference solver and the scripted plan replay known
 * solutions — they validate the infrastructure and are never a model's result) or a `model` (a live model, `llm`).
 */
export type BenchAgentRole = "control" | "model";

/** The role of an agent kind: only `llm` is a model; every other agent is a control. */
export function agentRole(kind: string): BenchAgentRole {
  return kind === "llm" ? "model" : "control";
}

export interface BenchReport {
  format: typeof BENCH_REPORT_FORMAT;
  suite: string;
  agent: { kind: string; provider: string | null; model: string | null; syntheticTokens: boolean; role: BenchAgentRole };
  /** The splits whose scenarios this report ran (`--split`). */
  splits: BenchSplit[];
  seeds: number[];
  startedAt: string;
  finishedAt: string;
  wallMs: number;
  environment: BenchEnvironment;
  disclaimer: { en: string; "zh-CN": string };
  scenarios: { id: string; category: BenchCategory; caseId: string; facilityId: string | null; locale: string; split: BenchSplit; title: BenchScenario["title"]; deterministic: boolean | null }[];
  runs: BenchRun[];
  metrics: {
    overall: Metrics;
    byCategory: Partial<Record<BenchCategory, Metrics>>;
    byEvidence: Partial<Record<BenchRun["evidence"], Metrics>>;
    /** Apart by split: the held-out (`test`) scenarios are never pooled with `dev` in one figure. */
    bySplit: Partial<Record<BenchSplit, Metrics>>;
  };
  /** The case and scenario denominators, the splits and the coverage by kind (`suiteCoverage`). */
  coverage: SuiteCoverage;
  budget?: { maxTokens: number | null; maxUsd: number | null; usedTokens: number; costUsd: number | null; skipped: number };
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** First words of a predicate (`clinical`, `world:actorNear`…). */
function predicateKind(p: BenchScenario["predicates"][number]): string {
  const key = Object.keys(p)[0] ?? "?";
  return key === "world" && "world" in p ? `world:${p.world.kind}` : key;
}

export interface RunScenarioOptions {
  content: Pick<LoadedContent, "cases" | "facilities" | "catalogs">;
  budget?: Budget;
  /** Receives each run's episode trace (JSON Lines). */
  onTrace?: (run: BenchRun, jsonl: string) => void;
}

/** Run one scenario once (see the module docs). */
export async function runScenario(scenario: BenchScenario, agent: BenchAgent, seed: number, o: RunScenarioOptions): Promise<BenchRun> {
  const t0 = performance.now();
  const answers = new AnswerStore();
  const base: Omit<BenchRun, "success" | "status" | "predicates" | "calls" | "refusals" | "answer" | "usage" | "wallMs" | "simMinutes" | "trace" | "stateDigest" | "evidence" | "audit" | "safety"> = {
    scenarioId: scenario.id,
    category: scenario.category,
    caseId: scenario.caseId,
    facilityId: scenario.facilityId ?? null,
    locale: scenario.locale,
    split: scenario.split ?? "dev",
    seed,
  };
  const empty = {
    predicates: [],
    calls: [],
    refusals: [],
    answer: null,
    usage: { inputTokens: 0, outputTokens: 0 },
    simMinutes: 0,
    trace: { spans: 0, setupSpans: 0, digest: "" },
    stateDigest: "",
    evidence: "source-only" as const,
    audit: { spatial: { audited: 0, violations: [] }, authorisation: { audited: 0, unauthorised: [] }, contraindicated: [] },
    safety: { passed: null, criticalFailures: [], doseErrors: [] },
  };
  // a held-out scenario this agent may not run (the scripted control has no plan for it): not run, counted nowhere
  if (agent.skips?.(scenario)) return { ...base, ...empty, success: false, status: "skipped", skip: "held-out", wallMs: 0 };
  if (o.budget?.exhausted()) {
    o.budget.skipped++;
    return { ...base, ...empty, success: false, status: "skipped", limit: "budget", skip: "budget", wallMs: 0 };
  }
  const tap: ProviderTap = {};
  let session: Awaited<ReturnType<typeof createBenchSession>> | null = null;
  try {
    session = await createBenchSession({ scenario, content: o.content, answers, wiring: agent.wiring(scenario, tap) });
    const s = session;
    const world = s.world()!;
    base.facilityId = s.facility?.id ?? null;
    const policy = scenario.setup.approvals ?? "headless";
    const unapprove = attachApprover(s, policy);
    const { setupSpans } = await applySetup(s, scenario, seed);
    const clockStart = s.state.clock;
    const controller = new AbortController();
    let limit: BenchRun["limit"];
    const stop = (why: NonNullable<BenchRun["limit"]>) => {
      if (limit) return;
      limit = why;
      controller.abort();
      s.submit({ type: "interrupt" });
    };
    const recorder = new RunRecorder(s, {
      onCall: (n) => {
        if (n > scenario.limits.maxToolCalls) stop("maxToolCalls");
      },
      onClock: (clock) => {
        if (scenario.limits.maxSimMinutes !== undefined && clock - clockStart > scenario.limits.maxSimMinutes) stop("maxSimMinutes");
      },
      onUsage: (_total, delta) => {
        if (!o.budget) return;
        o.budget.add(delta);
        if (o.budget.exhausted()) stop("budget");
      },
    });
    tap.onToolCall = (callId) => recorder.noteModelToolCall(callId);
    const auditor = new Auditor(s);
    const detachRecorder = recorder.attach();
    const detachAuditor = auditor.attach();
    const timer = setTimeout(() => stop("timeout"), scenario.limits.timeoutMs);
    let error: string | undefined;
    try {
      await agent.run({ scenario, seed, locale: s.settings.locale, session: s, world, recorder, answers, signal: controller.signal, limits: scenario.limits });
    } catch (err) {
      error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    } finally {
      clearTimeout(timer);
    }
    // Final authoritative state (digests first: evaluation may record perception memory).
    const trace: EpisodeTrace = s.trace();
    const jsonl = traceJsonl(trace);
    const snapshot = world.snapshot();
    const stateDigest = sha256(JSON.stringify(canonical({ state: s.state, world: snapshot })));
    const audit = auditor.finish(trace);
    detachRecorder();
    detachAuditor();
    unapprove();
    const targets = new Map<string, string>();
    for (const span of trace.spans) {
      const target = (span.data as { targetId?: unknown } | undefined)?.targetId;
      if (span.refs.actionId && typeof target === "string" && !targets.has(span.refs.actionId)) targets.set(span.refs.actionId, target);
    }
    for (const r of recorder.refusals) if (!r.target && r.actionId && targets.has(r.actionId)) r.target = targets.get(r.actionId)!;
    const view: FinalView = {
      caseDef: s.caseDef,
      facility: s.facility,
      state: s.state,
      world,
      snapshot,
      answers,
      refusals: recorder.refusals,
      calls: recorder.calls,
      audit,
      targetOf: (actionId) => targets.get(actionId) ?? null,
    };
    const predicates = evaluatePredicates(view, scenario.predicates).map((r) => ({ kind: predicateKind(r.predicate), class: r.class, ok: r.ok, detail: r.detail }));
    // the safety outcome beside the predicates: a run with a critical failure is never a success
    const safety = benchSafety(assess(s.caseDef, s.state));
    const run: BenchRun = {
      ...base,
      success: !error && !limit && predicates.every((p) => p.ok) && safety.passed !== false,
      status: error ? "error" : limit ? "limit" : "completed",
      ...(limit ? { limit } : {}),
      ...(error ? { error } : {}),
      predicates,
      calls: recorder.calls,
      refusals: recorder.refusals,
      answer: answers.last(),
      usage: { ...recorder.usage },
      wallMs: Math.round(performance.now() - t0),
      simMinutes: Math.round((s.state.clock - clockStart) * 100) / 100,
      trace: { spans: trace.spans.length, setupSpans, digest: sha256(jsonl) },
      stateDigest,
      evidence: (s.state.studies?.orders.length ?? 0) > 0 ? "expanded" : "source-only",
      audit: { spatial: audit.spatial, authorisation: audit.authorisation, contraindicated: audit.safety.contraindicated },
      safety,
    };
    o.onTrace?.(run, jsonl);
    return run;
  } catch (err) {
    return { ...base, ...empty, success: false, status: "error", error: err instanceof Error ? `${err.name}: ${err.message}` : String(err), wallMs: Math.round(performance.now() - t0) };
  } finally {
    await session?.close().catch(() => undefined);
  }
}

/** The runs' metrics apart by evidence: the published record alone, or with new (simulated) investigations. */
export function metricsByEvidence(runs: readonly BenchRun[]): Partial<Record<BenchRun["evidence"], Metrics>> {
  const out: Partial<Record<BenchRun["evidence"], Metrics>> = {};
  for (const e of ["source-only", "expanded"] as const) {
    const subset = runs.filter((r) => (r.evidence ?? "source-only") === e);
    if (subset.length) out[e] = computeMetrics(subset.map(runFacts));
  }
  return out;
}

/** The runs' metrics apart by split (held-out `test` scenarios never pooled with `dev`). */
export function metricsBySplit(runs: readonly BenchRun[]): Partial<Record<BenchSplit, Metrics>> {
  const out: Partial<Record<BenchSplit, Metrics>> = {};
  for (const sp of BENCH_SPLITS) {
    const subset = runs.filter((r) => (r.split ?? "dev") === sp);
    if (subset.length) out[sp] = computeMetrics(subset.map(runFacts));
  }
  return out;
}

/** The facts a metric needs from a run. */
export function runFacts(run: BenchRun): RunFacts {
  return {
    category: run.category,
    success: run.success,
    predicates: run.predicates,
    calls: run.calls.length,
    usage: run.usage,
    wallMs: run.wallMs,
    callMs: run.calls.map((c) => c.ms),
    simMinutes: run.simMinutes,
    spatial: { audited: run.audit.spatial.audited, violations: run.audit.spatial.violations.length },
    authorisation: { audited: run.audit.authorisation.audited, unauthorised: run.audit.authorisation.unauthorised.length },
    contraindicated: run.audit.contraindicated.length,
    safety: { passed: run.safety?.passed ?? null, criticalFailures: run.safety?.criticalFailures.length ?? 0, doseErrors: run.safety?.doseErrors.length ?? 0 },
    ...(run.status === "skipped" ? { skipped: true } : {}),
  };
}

export interface RunSuiteOptions extends RunScenarioOptions {
  suite: string;
  scenarios: readonly BenchScenario[];
  agent: BenchAgent;
  seeds: readonly number[];
  /** Called after each run (progress). */
  onRun?: (run: BenchRun) => void;
  /** Environment stamp (default: collected from `cwd`). */
  environment?: BenchEnvironment;
  cwd?: string;
  version?: string;
}

/** Run every scenario with every seed and build the report. */
export async function runSuite(o: RunSuiteOptions): Promise<BenchReport> {
  const started = new Date();
  const t0 = performance.now();
  const runs: BenchRun[] = [];
  for (const scenario of o.scenarios) {
    for (const seed of o.seeds) {
      const run = await runScenario(scenario, o.agent, seed, o);
      runs.push(run);
      o.onRun?.(run);
    }
  }
  const scenarios = o.scenarios.map((s) => {
    const own = runs.filter((r) => r.scenarioId === s.id && r.status !== "skipped" && r.trace.digest);
    const digests = new Set(own.map((r) => r.trace.digest));
    return { id: s.id, category: s.category, caseId: s.caseId, facilityId: own[0]?.facilityId ?? s.facilityId ?? null, locale: s.locale, split: s.split ?? "dev", title: s.title, deterministic: own.length > 1 ? digests.size === 1 : null };
  });
  const coverage = suiteCoverage(
    o.scenarios,
    runs.map((r) => ({ scenarioId: r.scenarioId, success: r.success, skipped: r.status === "skipped" })),
    (id) => o.content.cases.get(id)?.def ?? null,
  );
  const live = o.agent.kind === "llm";
  const n = o.scenarios.length;
  const report: BenchReport = {
    format: BENCH_REPORT_FORMAT,
    suite: o.suite,
    agent: { kind: o.agent.kind, provider: o.agent.provider, model: o.agent.model, syntheticTokens: o.agent.syntheticTokens === true, role: agentRole(o.agent.kind) },
    splits: BENCH_SPLITS.filter((sp) => o.scenarios.some((s) => (s.split ?? "dev") === sp)),
    seeds: [...o.seeds],
    startedAt: started.toISOString(),
    finishedAt: new Date().toISOString(),
    wallMs: Math.round(performance.now() - t0),
    environment: o.environment ?? benchEnvironment(o.cwd ?? process.cwd(), o.version ?? "5.0.0"),
    disclaimer: {
      en: bm("en", live ? "report.disclaimer.live" : "report.disclaimer.infra", { n }),
      "zh-CN": bm("zh-CN", live ? "report.disclaimer.live" : "report.disclaimer.infra", { n }),
    },
    scenarios,
    runs,
    metrics: { ...metricsByCategory(runs.map(runFacts), BENCH_CATEGORIES), byEvidence: metricsByEvidence(runs), bySplit: metricsBySplit(runs) },
    coverage,
  };
  if (o.budget) {
    const b = o.budget;
    report.budget = { maxTokens: b.limits.maxTokens ?? null, maxUsd: b.limits.maxUsd ?? null, usedTokens: b.used.inputTokens + b.used.outputTokens + (b.used.cacheReadTokens ?? 0) + (b.used.cacheWriteTokens ?? 0), costUsd: b.costUsd(), skipped: b.skipped };
  }
  return report;
}

/** Does a report meet a requirement (success rate in %, and no accepted rule violations)? */
export function reportPasses(report: BenchReport, requiredSuccessPercent: number | null): { ok: boolean; successPercent: number; violations: boolean } {
  const m = report.metrics.overall;
  const successPercent = m.taskSuccess.rate === null ? 0 : m.taskSuccess.rate * 100;
  const violations = m.spatialViolations.k > 0 || m.unauthorisedAcceptance.k > 0;
  const enough = requiredSuccessPercent === null || successPercent + 1e-9 >= requiredSuccessPercent;
  return { ok: enough && !violations, successPercent, violations };
}
