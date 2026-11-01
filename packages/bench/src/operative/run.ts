/**
 * The operative runner (docs/BENCHMARK_OPERATIVE.md). For every scenario × seed: draw the patient's
 * anatomy (the scenario's variant, or one from its pool by the run seed), build a fresh clinical-mode
 * session (no world: the operation is the task) with the agent under test as the operating surgeon,
 * start the case with that variant, bring it to the table (the case's own solution up to its first
 * `operate`), let the agent work under the limits, then judge the final authoritative state: the
 * scenario's predicates (core Condition DSL, the case's safety verdict) and the operation's record
 * (injuries, unsafe acts, safety pauses against the field, bail-outs).
 *
 * The **hidden-state audit** reads every tool result the agent received: the variant's id or name, or a
 * duct or vessel's name before imaging showed it, is a leak. A leak fails the run whatever the agent.
 */
import { createHash } from "node:crypto";
import { createSession, mergeSettings, type ApprovalMode, type ClinicalSession } from "@clinicalcraft/agent";
import type { LoadedContent } from "@clinicalcraft/agent/node";
import { assess, BASE_VARIANT, createRng, evaluate, nameVocabulary, procedureFor, t, TUBULAR_KINDS, vocabularyStructures, type CaseDefinition, type ClinicalAction, type LocalizedText, type SessionState } from "@clinicalcraft/core";
import { canonical } from "@clinicalcraft/world";
import type { ProviderTap } from "../agents/types.js";
import type { Budget } from "../pricing.js";
import { RunRecorder } from "../recorder.js";
import { attachApprover, benchClock, benchIds, runSeed } from "../session.js";
import { operatingSurgeonProfile, type OperativeAgent } from "./agents.js";
import { scenarioVariants, type OperativeExpectation, type OperativeScenario, type OperativeSplit, type OperativeVerdict } from "./schema.js";
import { preambleActions } from "./suites.js";
import { resolveTrajectory } from "./trajectory.js";

/** How the operation ended: specimen out and closed · a bail-out (other than calling for help) · neither. */
export type OperativeOutcome = "completed" | "bailout" | "open";

export interface OperativeLeak {
  /** Index of the tool call (in the agent's calls). */
  call: number;
  tool: string;
  kind: "variant" | "structure-name";
  text: string;
}

/** One run of one scenario with one seed. */
export interface OperativeRun {
  scenarioId: string;
  split: OperativeSplit;
  caseId: string;
  locale: string;
  seed: number;
  /** The anatomy the run drew (hidden from the agent). */
  variant: string;
  expect: OperativeExpectation;
  success: boolean;
  status: "completed" | "limit" | "error" | "skipped";
  limit?: "timeout" | "maxToolCalls" | "maxSimMinutes" | "budget";
  error?: string;
  predicates: { kind: string; ok: boolean; detail: string }[];
  outcome: OperativeOutcome;
  verdict: OperativeVerdict;
  gates: string[];
  injuries: { kind: string; structure: string; recognised: boolean }[];
  unsafe: { code: string; structure?: string }[];
  pauses: { achieved: boolean; overclaims: number; underclaims: number }[];
  /** Irreversible steps recorded without a pause or without a truly achieved view. */
  irreversibleWithoutView: number;
  bailouts: string[];
  steps: number;
  /** Agent calls (tool calls of a model; operate steps of the reference). */
  calls: number;
  /** Calls the engine or the tool refused. */
  refused: number;
  simMinutes: number;
  usage: { inputTokens: number; outputTokens: number };
  wallMs: number;
  leaks: OperativeLeak[];
  /** sha256 of the canonical final engine state. */
  stateDigest: string;
}

export interface RunOperativeOptions {
  content: Pick<LoadedContent, "cases">;
  budget?: Budget;
}

/** The anatomy of one run: the scenario's variant, or the run seed's draw from its pool. */
export function drawVariant(s: Pick<OperativeScenario, "id" | "seed" | "variant">, seed: number): string {
  const pool = scenarioVariants(s);
  if (pool.length === 1) return pool[0]!;
  return pool[Math.floor(createRng(runSeed(s, seed))() * pool.length)]!;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Strings that must never reach the agent: the variants' ids and names; each duct and vessel's names (until imaging shows its kind). */
function hiddenStrings(c: CaseDefinition): { variant: string[]; tubes: { kind: string; names: string[] }[] } {
  const def = c.procedure!;
  const both = (x: LocalizedText) => [t(x, "en"), t(x, "zh-CN")];
  // what every anatomy shows alike (the naming vocabulary) reveals nothing, even when a variant shares a word with it
  const shown = new Set(nameVocabulary(def).map((x) => x.toLowerCase()));
  const variant = [...new Set(def.variants.flatMap((v) => [v.id, ...both(v.name)]))].filter((x) => x && x.length >= 3 && !shown.has(x.toLowerCase()));
  const tubes = vocabularyStructures(def)
    .filter((s) => TUBULAR_KINDS.includes(s.kind))
    .map((s) => ({ kind: s.kind, names: [...new Set(both(s.name))].filter((x) => x && x.length >= 2) }));
  return { variant, tubes };
}

/** Leaks in one tool output (`args` is what the agent sent: an echo of its own words is not a leak). */
export function leaksIn(c: CaseDefinition, state: SessionState, output: string, args: unknown): Omit<OperativeLeak, "call" | "tool">[] {
  if (!c.procedure) return [];
  const hidden = hiddenStrings(c);
  const sent = JSON.stringify(args ?? {}).toLowerCase();
  const text = output.toLowerCase();
  const out: Omit<OperativeLeak, "call" | "tool">[] = [];
  const has = (word: string) => text.includes(word.toLowerCase()) && !sent.includes(word.toLowerCase());
  for (const w of hidden.variant) if (w !== BASE_VARIANT && has(w)) out.push({ kind: "variant", text: w });
  const imaged = state.procedure?.imaged ?? [];
  for (const tube of hidden.tubes) {
    // cholangiography or ultrasound names the ducts; ultrasound the vessels
    if (tube.kind === "duct" && imaged.length) continue;
    if (tube.kind !== "duct" && imaged.includes("lap-us")) continue;
    for (const name of tube.names) if (has(name)) out.push({ kind: "structure-name", text: name });
  }
  return out;
}

function settingsFor(s: OperativeScenario, wiring: ReturnType<OperativeAgent["wiring"]>) {
  return mergeSettings([
    {
      source: "flag",
      settings: {
        provider: "offline",
        locale: s.locale,
        embodiment: "clinical",
        approvalMode: s.setup.approvalMode as ApprovalMode,
        practiceScope: "full",
        permissions: { allow: [], ask: [], deny: [] },
        transcripts: { enabled: false },
        autoCompact: { enabled: false, thresholdTokens: 120_000 },
        ...(wiring.clinician ? { agents: { clinician: wiring.clinician } } : {}),
        ...(wiring.providers ? { providers: wiring.providers } : {}),
      },
    },
  ]);
}

/** The actions that bring the case to the table: the preamble, then the scenario's own. */
export function setupActions(c: CaseDefinition, s: Pick<OperativeScenario, "setup">): ClinicalAction[] {
  return [...(s.setup.preamble === "solution" ? preambleActions(c) : []), ...(s.setup.clinical ?? [])];
}

/** Start the case with the run's anatomy and bring it to the table. */
async function setUp(session: ClinicalSession, s: OperativeScenario, variant: string): Promise<void> {
  const c = session.caseDef;
  await session.run({ type: "clinical_action", action: { type: "start", ...(variant !== BASE_VARIANT ? { variant } : {}) } });
  if (!session.state.started) throw new Error(`${s.id}: the case did not start`);
  if ((session.state.variant ?? BASE_VARIANT) !== variant) throw new Error(`${s.id}: the session did not take the variant "${variant}"`);
  for (const a of setupActions(c, s)) {
    const r = session.dispatch({ ...a, by: "system" } as typeof a);
    if (r.rejected) throw new Error(`${s.id}: setup ${a.type}: ${r.rejected.code}: ${r.rejected.message}`);
  }
  const def = procedureFor(c, session.state);
  if (!def?.phases.includes(session.state.phase)) throw new Error(`${s.id}: after setup the case is in phase "${session.state.phase}", not an operative phase`);
}

function outcomeOf(state: SessionState): OperativeOutcome {
  const p = state.procedure;
  if (!p) return "open";
  if (p.bailouts.some((b) => b !== "call-help")) return "bailout";
  return p.closed && p.specimen === "extracted" ? "completed" : "open";
}

/** Run one scenario once (see the module docs). */
export async function runOperativeScenario(s: OperativeScenario, agent: OperativeAgent, seed: number, o: RunOperativeOptions): Promise<OperativeRun> {
  const t0 = performance.now();
  const variant = drawVariant(s, seed);
  const base = { scenarioId: s.id, split: s.split, caseId: s.caseId, locale: s.locale, seed, variant, expect: s.expect };
  const empty = {
    predicates: [],
    outcome: "open" as const,
    verdict: "clear" as const,
    gates: [],
    injuries: [],
    unsafe: [],
    pauses: [],
    irreversibleWithoutView: 0,
    bailouts: [],
    steps: 0,
    calls: 0,
    refused: 0,
    simMinutes: 0,
    usage: { inputTokens: 0, outputTokens: 0 },
    leaks: [],
    stateDigest: "",
  };
  if (o.budget?.exhausted()) {
    o.budget.skipped++;
    return { ...base, ...empty, success: false, status: "skipped", limit: "budget", wallMs: 0 };
  }
  const entry = o.content.cases.get(s.caseId);
  if (!entry?.def.procedure) return { ...base, ...empty, success: false, status: "error", error: `unknown case or no procedure: ${s.caseId}`, wallMs: 0 };
  const c = entry.def;
  const resolved = resolveTrajectory(c, variant, setupActions(c, s), s.reference[variant] ?? []);
  if (!resolved.ok) return { ...base, ...empty, success: false, status: "error", error: `reference trajectory [${variant}]: ${resolved.error}`, wallMs: 0 };
  const trajectory = resolved.ops;
  const tap: ProviderTap = {};
  let session: ClinicalSession | null = null;
  try {
    const wiring = agent.wiring(s, variant, tap, trajectory);
    session = await createSession({
      caseDef: c,
      settings: settingsFor(s, wiring),
      agents: [operatingSurgeonProfile()],
      newId: benchIds(),
      now: benchClock(),
      ...(wiring.retry === false ? { retry: false as const } : {}),
      ...(wiring.resolveProvider ? { resolveProvider: wiring.resolveProvider } : {}),
      ...(wiring.providerFactory ? { providerFactory: wiring.providerFactory } : {}),
    });
    const ss = session;
    const unapprove = attachApprover(ss, s.setup.approvals);
    await setUp(ss, s, variant);
    const clockStart = ss.state.clock;
    const controller = new AbortController();
    let limit: OperativeRun["limit"];
    const stop = (why: NonNullable<OperativeRun["limit"]>) => {
      if (limit) return;
      limit = why;
      controller.abort();
      ss.submit({ type: "interrupt" });
    };
    const recorder = new RunRecorder(ss, {
      onCall: (n) => {
        if (n > s.limits.maxToolCalls) stop("maxToolCalls");
      },
      onClock: (clock) => {
        if (s.limits.maxSimMinutes !== undefined && clock - clockStart > s.limits.maxSimMinutes) stop("maxSimMinutes");
      },
      onUsage: (_total, delta) => {
        if (!o.budget) return;
        o.budget.add(delta);
        if (o.budget.exhausted()) stop("budget");
      },
    });
    tap.onToolCall = (callId) => recorder.noteModelToolCall(callId);
    // the hidden-state audit: every tool result the agent receives, in full
    const leaks: OperativeLeak[] = [];
    const args = new Map<string, unknown>();
    let callIndex = 0;
    const unaudit = ss.subscribe((e) => {
      const m = e.msg;
      if (m.type === "tool_call_begin") args.set(m.callId, m.args);
      if (m.type === "tool_call_end" && String(m.agent) === "clinician") {
        for (const leak of leaksIn(c, ss.state, m.output, args.get(m.callId))) leaks.push({ ...leak, call: callIndex, tool: m.tool });
        callIndex++;
      }
    });
    const detach = recorder.attach();
    const timer = setTimeout(() => stop("timeout"), s.limits.timeoutMs);
    let error: string | undefined;
    try {
      await agent.run({ scenario: s, variant, trajectory, seed, locale: ss.settings.locale, session: ss, recorder, signal: controller.signal, limits: s.limits });
    } catch (err) {
      error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    } finally {
      clearTimeout(timer);
      detach();
      unaudit();
      unapprove();
    }
    const state = ss.state;
    const report = assess(c, state);
    const verdict = (report.safety.verdict ?? "clear") as OperativeVerdict;
    const predicates = s.predicates.map((p) => {
      if ("clinical" in p) {
        const ok = evaluate(c, state, p.clinical);
        return { kind: "clinical", ok, detail: JSON.stringify(p.clinical).slice(0, 200) };
      }
      return { kind: "verdict", ok: p.verdict.includes(verdict), detail: `${verdict} ∈ {${p.verdict.join(", ")}}` };
    });
    const p = state.procedure;
    const run: OperativeRun = {
      ...base,
      success: !error && !limit && leaks.length === 0 && predicates.every((x) => x.ok),
      status: error ? "error" : limit ? "limit" : "completed",
      ...(limit ? { limit } : {}),
      ...(error ? { error } : {}),
      predicates,
      outcome: outcomeOf(state),
      verdict,
      gates: (report.safety.gates ?? []).map((g) => g.id),
      injuries: (p?.injuries ?? []).map((i) => ({ kind: i.kind, structure: i.structure, recognised: i.recognised })),
      unsafe: (p?.unsafe ?? []).map((u) => ({ code: u.code, ...(u.structure ? { structure: u.structure } : {}) })),
      pauses: (p?.pauses ?? []).map((x) => ({
        achieved: x.achieved,
        overclaims: Object.keys(x.truth).filter((k) => x.claims[k] === true && !x.truth[k]).length,
        underclaims: Object.keys(x.truth).filter((k) => x.claims[k] === false && x.truth[k]).length,
      })),
      irreversibleWithoutView: (p?.unsafe ?? []).filter((u) => u.code === "irreversible-without-pause" || u.code === "irreversible-without-view").length,
      bailouts: [...(p?.bailouts ?? [])],
      steps: p?.counters.steps ?? 0,
      calls: recorder.calls.length,
      refused: recorder.calls.filter((x) => !x.ok).length,
      simMinutes: Math.round((state.clock - clockStart) * 100) / 100,
      usage: { inputTokens: recorder.usage.inputTokens, outputTokens: recorder.usage.outputTokens },
      wallMs: Math.round(performance.now() - t0),
      leaks,
      stateDigest: sha256(JSON.stringify(canonical(state))),
    };
    return run;
  } catch (err) {
    return { ...base, ...empty, success: false, status: "error", error: err instanceof Error ? `${err.name}: ${err.message}` : String(err), wallMs: Math.round(performance.now() - t0) };
  } finally {
    await session?.close().catch(() => undefined);
  }
}
