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
import type { LoadedContent } from "@clinicalcraft/agent/node";
import { canonical, type EpisodeTrace } from "@clinicalcraft/world";
import type { BenchAgent, ProviderTap } from "./agents/types.js";
import { Auditor, type AuditResult } from "./audit.js";
import { benchEnvironment, type BenchEnvironment } from "./environment.js";
import { bm } from "./i18n.js";
import { metricsByCategory, type Metrics, type RunFacts } from "./metrics.js";
import { evaluatePredicates, type FinalView, type PredicateClass } from "./predicates.js";
import type { Budget } from "./pricing.js";
import { RunRecorder, type RecordedCall, type RecordedRefusal } from "./recorder.js";
import { BENCH_CATEGORIES, type BenchCategory, type BenchScenario } from "./schema.js";
import { AnswerStore, applySetup, attachApprover, createBenchSession, type SubmittedAnswer } from "./session.js";

export const BENCH_REPORT_FORMAT = "clinicalcraft-bench-report@1" as const;

/** One run of one scenario with one seed. */
export interface BenchRun {
  scenarioId: string;
  category: BenchCategory;
  caseId: string;
  facilityId: string | null;
  locale: string;
  seed: number;
  success: boolean;
  /** `completed`: the agent stopped by itself · `limit`: a limit stopped it · `error`: setup or runtime failure · `skipped`: not run (budget). */
  status: "completed" | "limit" | "error" | "skipped";
  limit?: "timeout" | "maxToolCalls" | "maxSimMinutes" | "budget";
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
  audit: {
    spatial: { audited: number; violations: AuditResult["spatial"]["violations"] };
    authorisation: { audited: number; unauthorised: AuditResult["authorisation"]["unauthorised"] };
    contraindicated: AuditResult["safety"]["contraindicated"];
  };
}

export interface BenchReport {
  format: typeof BENCH_REPORT_FORMAT;
  suite: string;
  agent: { kind: string; provider: string | null; model: string | null; syntheticTokens: boolean };
  seeds: number[];
  startedAt: string;
  finishedAt: string;
  wallMs: number;
  environment: BenchEnvironment;
  disclaimer: { en: string; "zh-CN": string };
  scenarios: { id: string; category: BenchCategory; caseId: string; facilityId: string | null; locale: string; title: BenchScenario["title"]; deterministic: boolean | null }[];
  runs: BenchRun[];
  metrics: { overall: Metrics; byCategory: Partial<Record<BenchCategory, Metrics>> };
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
  const base: Omit<BenchRun, "success" | "status" | "predicates" | "calls" | "refusals" | "answer" | "usage" | "wallMs" | "simMinutes" | "trace" | "stateDigest" | "audit"> = {
    scenarioId: scenario.id,
    category: scenario.category,
    caseId: scenario.caseId,
    facilityId: scenario.facilityId ?? null,
    locale: scenario.locale,
    seed,
  };
  const empty = { predicates: [], calls: [], refusals: [], answer: null, usage: { inputTokens: 0, outputTokens: 0 }, simMinutes: 0, trace: { spans: 0, setupSpans: 0, digest: "" }, stateDigest: "", audit: { spatial: { audited: 0, violations: [] }, authorisation: { audited: 0, unauthorised: [] }, contraindicated: [] } };
  if (o.budget?.exhausted()) {
    o.budget.skipped++;
    return { ...base, ...empty, success: false, status: "skipped", limit: "budget", wallMs: 0 };
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
    const run: BenchRun = {
      ...base,
      success: !error && !limit && predicates.every((p) => p.ok),
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
      audit: { spatial: audit.spatial, authorisation: audit.authorisation, contraindicated: audit.safety.contraindicated },
    };
    o.onTrace?.(run, jsonl);
    return run;
  } catch (err) {
    return { ...base, ...empty, success: false, status: "error", error: err instanceof Error ? `${err.name}: ${err.message}` : String(err), wallMs: Math.round(performance.now() - t0) };
  } finally {
    await session?.close().catch(() => undefined);
  }
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
    return { id: s.id, category: s.category, caseId: s.caseId, facilityId: own[0]?.facilityId ?? s.facilityId ?? null, locale: s.locale, title: s.title, deterministic: own.length > 1 ? digests.size === 1 : null };
  });
  const live = o.agent.kind === "llm";
  const n = o.scenarios.length;
  const report: BenchReport = {
    format: BENCH_REPORT_FORMAT,
    suite: o.suite,
    agent: { kind: o.agent.kind, provider: o.agent.provider, model: o.agent.model, syntheticTokens: o.agent.syntheticTokens === true },
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
    metrics: metricsByCategory(runs.map(runFacts), BENCH_CATEGORIES),
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
