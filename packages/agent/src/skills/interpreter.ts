/**
 * The skill interpreter (docs/EMBODIED.md §9): runs a validated skill as the
 * calling agent — every step is an ordinary tool call through the caller's
 * tool path (hooks, precheck, the approval gate, deny rules) — and checks
 * the postconditions against authoritative state: the engine (core
 * `evaluate`) and the world (its runtime). Never `eval`, never code.
 *
 * Per step: `when` (skip when false) → templated arguments → the tool →
 * on failure: `retry` (same call, codes listed) → `recovery` strategies
 * (`replan`: walk to the refusal's hint goal; `fetch-equipment`: wheel the
 * hinted cart to the patient; `alternate-provider`: another entity with the
 * same capabilities, used for the REST of the skill — every later step,
 * `when` and postcondition — restarting from the first step that targeted
 * the replaced one) → `onError` (`abort` the skill, or `continue`).
 *
 * Review round:
 * - a refusal by a person or a hook — directly (`denied`, `blocked`) or
 *   inside a world operation (`APPROVAL_DENIED`, `HOOK_BLOCKED`) — is final:
 *   never retried or recovered (the step's `onError` still decides whether
 *   the skill goes on, e.g. to reset a device); a cancellation stops the
 *   skill (C9);
 * - the interpreter yields to the event loop before every step, so an interrupt
 *   or a timer is never starved by a long or recursive skill (C10);
 * - predicates see only what the learner can see: `vital` is evaluated
 *   against what the bedside SHOWS the acting body (`SkillRunner.shownVitals`;
 *   nothing shown: false), `flag` / `decidedFirstTry` never hold (G1);
 * - reported postconditions never echo step outputs: parameters are filled
 *   in, `${steps.<id>.output}` stays as written, step data only when it is a
 *   short scalar (S2);
 * - `SkillRunner.progress` carries the clinical acts an earlier attempt of
 *   the same call already did (a confirmed repeat after an approval refusal,
 *   MCP): they are not done again (S1).
 */
import { ConditionSchema, evaluate, t, WorldPredicateSchema, type CaseDefinition, type Condition, type SessionState, type VitalKey, type WorldPredicate } from "@clinicalcraft/core";
import { evaluatePredicate, monitoringIntervention, type ActorId, type NavGoal, type WorldRuntime } from "@clinicalcraft/world";
import type { SessionTrace } from "../session/trace.js";
import { rt, type RuntimeKey } from "../session/i18n.js";
import { resolveFinding, resolveIntervention, resolveInvestigation } from "../tools/clinical.js";
import type { ToolOutput } from "../tools/types.js";
import { FINAL_FAILURE_CODES, type SkillDefinition, type SkillPredicate, type SkillStep } from "./schema.js";

/** One tool call made by a skill step (through the caller's tool path). */
export interface SkillToolCall {
  ok: boolean;
  output: ToolOutput;
  /** Tool path status: ok, error, invalid, blocked, denied, cancelled, interrupted. */
  status: string;
}

/** A step's outcome as later templates see it (`${steps.<id>.ok|output|data…}`). */
export interface StepScopeEntry {
  ok: boolean;
  data: unknown;
  output: string;
}

/**
 * What earlier attempts of the same call did (review S1): the clinical acts already done, by step id. A step
 * found here is not run again (its scope entry is restored); the interpreter adds every clinical act it completes.
 * The caller keeps it between a refused attempt and its confirmed repeat (the MCP two-step confirmation).
 */
export interface SkillProgress {
  readonly done: Map<string, StepScopeEntry>;
  /** Key prefix of a nested skill's steps (`<step id>/`). */
  readonly prefix?: string;
}

/** What the interpreter needs from the session (bound to the calling agent and its body). */
export interface SkillRunner {
  readonly caseDef: CaseDefinition;
  readonly locale: string;
  readonly actorId: ActorId;
  state(): SessionState;
  world(): WorldRuntime;
  /** The bound patient and their monitor (entity ids), when the world has them. */
  patientId(): string | null;
  patientMonitorId(): string | null;
  /** Resolve an entity id or alias (`patient`, `patient-monitor`, unprefixed ids). */
  resolveEntity(alias: string): string | null;
  /** Is the entity at the patient's bedside now (within the bedside radius of the slot or in its room)? */
  atBedside(entityId: string): boolean;
  /** Run a tool through the caller's normal tool path (`progress`: a nested skill's share of this run's record). */
  callTool(tool: string, args: Record<string, unknown>, progress?: SkillProgress): Promise<SkillToolCall>;
  /**
   * The vital signs the bedside shows the acting body now (what `check_vitals` would show it there), or null when
   * it can see none (G1). Absent: no vital is shown — `vital` predicates are false.
   */
  shownVitals?(): Partial<Record<VitalKey, number>> | null;
  /** Clinical acts earlier attempts of this call did (see `SkillProgress`). */
  progress?: SkillProgress;
  trace?: SessionTrace;
  signal?: AbortSignal;
}

export interface SkillStepRecord {
  id: string;
  tool: string;
  status: "ok" | "failed" | "skipped";
  code?: string;
  message?: string;
  attempts: number;
  recovery?: string[];
  /** Done by an earlier attempt of the same call (not run again). */
  resumed?: true;
}

export interface SkillRunResult {
  skillId: string;
  name: string;
  status: "succeeded" | "failed" | "aborted" | "precondition_failed" | "cancelled";
  params: Record<string, unknown>;
  steps: SkillStepRecord[];
  postconditions: { predicate: unknown; ok: boolean }[];
  /** Simulated minutes the skill took. */
  elapsedMinutes: number;
  /** Why it did not run (bad parameters, a precondition). */
  message?: string;
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

interface Scope {
  params: Record<string, unknown>;
  steps: Record<string, StepScopeEntry>;
  /** Entities replaced by an `alternate-provider` recovery: old id (or the alias a step named) → the new one. */
  rebind?: Map<string, string>;
}

const EXACT = /^\$\{([^}]+)\}$/;
const ANY = /\$\{([^}]+)\}/g;

function lookup(ref: string, scope: Scope): unknown {
  const m = /^steps\.([^.]+)\.(ok|output|data)(?:\.(.+))?$/.exec(ref.trim());
  if (!m) return scope.params[ref.trim()];
  const step = scope.steps[m[1]!];
  if (!step) return undefined;
  if (m[2] === "ok") return step.ok;
  if (m[2] === "output") return step.output;
  let v: unknown = step.data;
  for (const seg of (m[3] ?? "").split(".").filter(Boolean)) {
    if (v === null || v === undefined) return undefined;
    v = Array.isArray(v) && /^\d+$/.test(seg) ? v[Number(seg)] : typeof v === "object" ? (v as Record<string, unknown>)[seg] : undefined;
  }
  return v;
}

/** Replace every rebound entity id (`alternate-provider`) in string leaves. */
function rebound(value: unknown, rebind: ReadonlyMap<string, string> | undefined): unknown {
  if (!rebind?.size) return value;
  if (typeof value === "string") return rebind.get(value) ?? value;
  if (Array.isArray(value)) return value.map((v) => rebound(v, rebind));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rebound(v, rebind)]));
  return value;
}

function substituteWith(value: unknown, look: (ref: string) => unknown): unknown {
  if (typeof value === "string") {
    const exact = EXACT.exec(value);
    if (exact) return look(exact[1]!);
    return value.replace(ANY, (_m, ref: string) => {
      const v = look(ref);
      return v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => substituteWith(v, look)).filter((v) => v !== undefined);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const s = substituteWith(v, look);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return value;
}

/** Substitute templates (see the schema module); object members that resolve to `undefined` are dropped; rebound entities replaced. */
export function substitute(value: unknown, scope: Scope): unknown {
  return rebound(
    substituteWith(value, (ref) => lookup(ref, scope)),
    scope.rebind,
  );
}

/** Longest step-data value a reported predicate shows. */
const DISPLAY_MAX = 120;

/**
 * A predicate as the result reports it (review S2): parameters filled in; a step's `ok` and short scalar data
 * (an entity id, a state) too; a step's `output` and any larger data left as written — the result never echoes
 * what a step returned.
 */
export function displayed(value: unknown, scope: Scope): unknown {
  const look = (ref: string): unknown => {
    const m = /^steps\.([^.]+)\.(ok|output|data)/.exec(ref.trim());
    if (!m) return scope.params[ref.trim()];
    if (m[2] === "output") return `\${${ref}}`;
    const v = lookup(ref, scope);
    if (typeof v === "boolean" || typeof v === "number") return v;
    if (typeof v === "string" && v.length <= DISPLAY_MAX) return v;
    return `\${${ref}}`;
  };
  return rebound(substituteWith(value, look), scope.rebind);
}

/* ------------------------------------------------------------------ */
/* Parameters                                                          */
/* ------------------------------------------------------------------ */

function macro(value: string, type: string, r: SkillRunner): unknown {
  const c = r.caseDef;
  if (value === "$patient") return r.patientId() ?? undefined;
  if (value === "$patient-monitor") return r.patientMonitorId() ?? undefined;
  if (value === "$monitoring") return monitoringIntervention(c, ["cardiac-monitor"]) ?? undefined;
  const caps = /^\$capability:(.+)$/.exec(value)?.[1]?.split(",").map((x) => x.trim()).filter(Boolean);
  if (caps) {
    const fits = (requires: readonly string[]) => requires.length > 0 && requires.every((x) => caps.includes(x));
    if (type === "investigation") return c.investigations.find((i) => fits(i.requires))?.id;
    if (type === "intervention") return c.interventions.find((i) => fits(i.requires))?.id;
    if (type === "finding") return c.exam.find((f) => fits(f.requires))?.id;
  }
  return undefined;
}

/** Resolve and type-check the parameters of a skill call. */
export function resolveSkillParams(skill: SkillDefinition, raw: Record<string, unknown>, r: Pick<SkillRunner, "caseDef" | "locale" | "patientId" | "patientMonitorId" | "resolveEntity" | "state">): { ok: true; params: Record<string, unknown> } | { ok: false; problems: string[] } {
  const L = r.locale;
  const c = r.caseDef;
  const params: Record<string, unknown> = {};
  const problems: string[] = [];
  for (const [name, spec] of Object.entries(skill.params ?? {})) {
    let value: unknown = raw[name];
    if ((value === undefined || value === "") && spec.default !== undefined) value = typeof spec.default === "string" && spec.default.startsWith("$") ? macro(spec.default, spec.type, r as SkillRunner) : spec.default;
    const required = spec.required ?? spec.default === undefined;
    if (value === undefined || value === null || value === "") {
      if (required) problems.push(rt(L, "skill.badParam", { param: name, problem: rt(L, "skill.missingParam", { type: spec.type }) }));
      continue;
    }
    const text = String(value).trim();
    const unresolved = () => problems.push(rt(L, "skill.badParam", { param: name, problem: rt(L, "skill.unresolved", { value: text, type: spec.type }) }));
    switch (spec.type) {
      case "entity": {
        const id = r.resolveEntity(text);
        if (id) params[name] = id;
        else unresolved();
        break;
      }
      case "investigation": {
        const res = resolveInvestigation(c, { investigation_id: text }, L);
        const byQuery = res.kind === "id" ? res : resolveInvestigation(c, { query: text }, L);
        if (byQuery.kind === "id") params[name] = byQuery.id;
        else unresolved();
        break;
      }
      case "intervention": {
        const res = resolveIntervention(c, { intervention_id: text }, L);
        const byQuery = res.kind === "id" ? res : resolveIntervention(c, { query: text }, L);
        if (byQuery.kind === "id") params[name] = byQuery.id;
        else unresolved();
        break;
      }
      case "finding": {
        const res = resolveFinding(c, { finding_id: text }, L);
        const byQuery = res.kind === "id" ? res : resolveFinding(c, { query: text }, L, r.state().phase);
        if (byQuery.kind === "id") params[name] = byQuery.id;
        else unresolved();
        break;
      }
      case "number": {
        const n = Number(value);
        if (Number.isFinite(n)) params[name] = n;
        else unresolved();
        break;
      }
      default:
        params[name] = text;
    }
  }
  return problems.length ? { ok: false, problems } : { ok: true, params };
}

/* ------------------------------------------------------------------ */
/* Predicates                                                          */
/* ------------------------------------------------------------------ */

function compare(a: number, op: "lt" | "lte" | "gt" | "gte" | "eq", b: number): boolean {
  switch (op) {
    case "lt":
      return a < b;
    case "lte":
      return a <= b;
    case "gt":
      return a > b;
    case "gte":
      return a >= b;
    default:
      return a === b;
  }
}

/**
 * A condition as the learner could judge it (G1): the learner's own record through core `evaluate`; `vital`
 * against what the bedside shows the acting body (nothing shown: false); `flag` and `decidedFirstTry` — hidden
 * state the schema already refuses — never hold.
 */
function holdsVisible(cond: Condition, r: SkillRunner, shown: () => Partial<Record<VitalKey, number>> | null): boolean {
  if ("all" in cond) return cond.all.every((x) => holdsVisible(x, r, shown));
  if ("any" in cond) return cond.any.some((x) => holdsVisible(x, r, shown));
  if ("not" in cond) return !holdsVisible(cond.not, r, shown);
  if ("vital" in cond) {
    const value = shown()?.[cond.vital];
    return typeof value === "number" && Number.isFinite(value) && compare(value, cond.op, cond.value);
  }
  if ("flag" in cond || "decidedFirstTry" in cond) return false;
  return evaluate(r.caseDef, r.state(), cond);
}

/** Does a skill predicate hold now (authoritative state, as the learner can see it)? */
export function predicateHolds(p: SkillPredicate, scope: Scope, r: SkillRunner): boolean {
  if ("all" in p) return p.all.every((x) => predicateHolds(x, scope, r));
  if ("any" in p) return p.any.some((x) => predicateHolds(x, scope, r));
  if ("not" in p) return !predicateHolds(p.not, scope, r);
  const world = r.world();
  const actor = world.actor(r.actorId);
  if ("clinical" in p) {
    const cond = ConditionSchema.safeParse(substitute(p.clinical, scope));
    let cached: Partial<Record<VitalKey, number>> | null | undefined;
    const shown = () => (cached === undefined ? (cached = r.shownVitals?.() ?? null) : cached);
    return cond.success && holdsVisible(cond.data as Condition, r, shown);
  }
  if ("actorNear" in p) {
    const id = r.resolveEntity(String(substitute(p.actorNear, scope) ?? ""));
    const seen = id ? world.inspect(r.actorId, id) : null;
    return !!seen && !!actor && seen.level === actor.pose.level && seen.distance <= p.range + 1e-6;
  }
  if ("entityState" in p) {
    const id = r.resolveEntity(String(substitute(p.entityState, scope) ?? ""));
    const state = id ? world.inspect(r.actorId, id)?.state : undefined;
    const wanted = substitute(p.state, scope);
    return state !== undefined && (Array.isArray(wanted) ? wanted.map(String) : [String(wanted)]).includes(state);
  }
  const pred = WorldPredicateSchema.safeParse(substitute(p.world, scope));
  if (!pred.success || !actor) return false;
  const targetRef = p.target !== undefined ? String(substitute(p.target, scope) ?? "") : "";
  const target = targetRef ? r.resolveEntity(targetRef) : null;
  if (targetRef && !target) return false;
  const seen = target ? world.inspect(r.actorId, target) : null;
  const patient = r.patientId();
  const patientSeen = patient ? world.inspect(r.actorId, patient) : null;
  return evaluatePredicate(pred.data as WorldPredicate, {
    state: seen?.state ?? null,
    role: actor.role,
    handsClean: actor.handsCleanUntil !== null && r.state().clock <= actor.handsCleanUntil,
    holding: (ref) => actor.holding.some((h) => h === ref || h === `eq:${ref}` || world.entity(h)?.type === ref),
    actorWithin: (m) => !!seen && seen.level === actor.pose.level && seen.distance <= m + 1e-6,
    patientWithin: (m) => !!patientSeen && patientSeen.level === actor.pose.level && patientSeen.distance <= m + 1e-6,
    deviceAtBedside: () => !!target && r.atBedside(target),
  });
}

/* ------------------------------------------------------------------ */
/* Running                                                             */
/* ------------------------------------------------------------------ */

/** Tool path statuses that are a person's or a hook's refusal (never retried or recovered). */
const DENIED_STATUSES = new Set(["denied", "blocked"]);
/** Tool path statuses that stop the skill (the call was cancelled). */
const CANCELLED_STATUSES = new Set(["cancelled", "interrupted"]);

/** Clinical tools whose call is an act on the encounter (done once: a confirmed repeat does not repeat it). */
const CLINICAL_ACTS = new Set(["ask_patient", "examine", "order_test", "read_result", "intervene", "consult", "answer_decision", "set_phase", "wait", "finish_case", "delegate_task", "execute_skill"]);

/** Most entities replaced by `alternate-provider` in one run (each restarts the steps that targeted it). */
const MAX_REBINDS = 3;

interface FailureInfo {
  code: string;
  reason: string | null;
  hint: { goal: NavGoal; label: string } | null;
  message: string;
  target: string | null;
}

function failureOf(call: SkillToolCall, args: Record<string, unknown>): FailureInfo {
  const d = (call.output.data ?? {}) as { code?: unknown; reason?: unknown; hint?: unknown; result?: { errorCode?: unknown; hint?: unknown }; rejected?: { code?: unknown } };
  const code = typeof d.code === "string" ? d.code : typeof d.result?.errorCode === "string" ? d.result.errorCode : typeof d.rejected?.code === "string" ? d.rejected.code : call.status === "error" ? "FAILED" : call.status.toUpperCase();
  const hint = (d.hint ?? d.result?.hint ?? null) as FailureInfo["hint"];
  return { code, reason: typeof d.reason === "string" ? d.reason : null, hint: hint && typeof hint === "object" && "goal" in hint ? hint : null, message: call.output.output.split("\n")[0] ?? "", target: typeof args.target === "string" ? args.target : null };
}

/** A failure no retry or recovery may touch: a refusal by a person or a hook, or a cancellation — directly or inside a world operation (C9). */
function finalKind(call: SkillToolCall, failure: FailureInfo): "denied" | "cancelled" | null {
  if (CANCELLED_STATUSES.has(call.status) || failure.code === "CANCELLED") return "cancelled";
  if (DENIED_STATUSES.has(call.status) || FINAL_FAILURE_CODES.includes(failure.code)) return "denied";
  return null;
}

/** Did this completed step act on the encounter (a clinical tool's act, or a world operation's clinical effect)? */
function wasClinicalAct(tool: string, entry: StepScopeEntry): boolean {
  if (CLINICAL_ACTS.has(tool)) return true;
  const clinical = (entry.data as { result?: { clinical?: { ok?: unknown } } } | null)?.result?.clinical;
  return !!clinical && clinical.ok === true;
}

function firstLine(text: string): string {
  const line = text.split("\n")[0] ?? "";
  return line.length > 160 ? `${line.slice(0, 157)}…` : line;
}

/** A step's message: the first line of its output; for a nested skill that failed, also why (its failed step's message). */
function stepMessage(tool: string, call: SkillToolCall): string {
  const head = firstLine(call.output.output);
  if (tool !== "execute_skill" || call.ok) return head;
  const nested = (call.output.data as { skill?: { steps?: SkillStepRecord[] } } | null)?.skill?.steps?.findLast((s) => s.status === "failed");
  return nested?.message ? firstLine(`${head} ${nested.id}: ${nested.message}`) : head;
}

/** A step's key in a run's progress record. */
function progressKey(progress: SkillProgress, stepId: string): string {
  return `${progress.prefix ?? ""}${stepId}`;
}

/** Let timers and out-of-band ops (an interrupt) run between steps (C10). */
const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Run a validated skill (see the module docs). */
export async function runSkill(skill: SkillDefinition, rawParams: Record<string, unknown>, r: SkillRunner): Promise<SkillRunResult> {
  const L = r.locale;
  const clockStart = r.state().clock;
  const result: SkillRunResult = { skillId: skill.id, name: t(skill.name, L), status: "failed", params: {}, steps: [], postconditions: [], elapsedMinutes: 0 };
  const done = (status: SkillRunResult["status"], message?: string): SkillRunResult => {
    result.status = status;
    if (message) result.message = message;
    result.elapsedMinutes = Math.round((r.state().clock - clockStart) * 100) / 100;
    return result;
  };
  const resolved = resolveSkillParams(skill, rawParams, r);
  if (!resolved.ok) return done("failed", resolved.problems.join("; "));
  result.params = resolved.params;
  const scope: Scope = { params: resolved.params, steps: {}, rebind: new Map() };
  const span = r.trace?.start("plan", `skill:${skill.id}`, { actorId: r.actorId, data: { skill: skill.id, params: resolved.params } });
  const body = async (): Promise<SkillRunResult> => {
    for (const p of skill.preconditions ?? []) {
      if (!predicateHolds(p, scope, r)) return done("precondition_failed", rt(L, "skill.precondition", { what: JSON.stringify(displayed(p, scope)) }));
    }
    let rebinds = 0;
    for (let i = 0; i < skill.steps.length; i++) {
      const step = skill.steps[i]!;
      await yieldToEventLoop();
      if (r.signal?.aborted) return done("cancelled");
      // Done by an earlier attempt of this call: not again (S1).
      const earlier = r.progress?.done.get(progressKey(r.progress, step.id));
      if (earlier) {
        scope.steps[step.id] = earlier;
        result.steps.push({ id: step.id, tool: step.tool, status: "ok", attempts: 0, resumed: true, message: firstLine(earlier.output) });
        continue;
      }
      if (step.when && !predicateHolds(step.when, scope, r)) {
        result.steps.push({ id: step.id, tool: step.tool, status: "skipped", attempts: 0 });
        continue;
      }
      const outcome = await runStep(skill, step, scope, r);
      result.steps.push(outcome.record);
      if (outcome.final === "cancelled") return done("cancelled");
      if (outcome.record.status === "ok") {
        const entry = scope.steps[step.id];
        if (entry && r.progress && wasClinicalAct(step.tool, entry)) r.progress.done.set(progressKey(r.progress, step.id), entry);
      }
      if (outcome.rebind && rebinds < MAX_REBINDS) {
        // Another device for the rest of the skill: restart from the first step that targeted the replaced one (C8).
        rebinds++;
        const from = firstStepTargeting(skill, i, outcome.rebind.from, scope);
        for (const key of outcome.rebind.keys) scope.rebind!.set(key, outcome.rebind.to);
        i = from - 1;
        continue;
      }
      if (outcome.record.status === "failed" && (step.onError ?? "abort") === "abort") return done("aborted");
    }
    const posts = (skill.postconditions ?? []).map((p) => ({ predicate: displayed(p, scope), ok: predicateHolds(p, scope, r) }));
    result.postconditions = posts;
    const ok = posts.every((p) => p.ok);
    const verification = r.trace?.start("verification", `skill:${skill.id}`, { actorId: r.actorId });
    verification?.end({ ok, worldVersion: r.world().version, data: { postconditions: posts } });
    return done(ok ? "succeeded" : "failed");
  };
  try {
    return span ? await r.trace!.within(span.id, body) : await body();
  } finally {
    span?.end({ ok: result.status === "succeeded", worldVersion: r.world().version, data: { status: result.status, steps: result.steps.length } });
  }
}

/** The first step (up to `upTo`) whose arguments name `entity` before any rebinding (the step to restart from). */
function firstStepTargeting(skill: SkillDefinition, upTo: number, entity: string, scope: Scope): number {
  const unbound: Scope = { ...scope, rebind: new Map() };
  for (let j = 0; j <= upTo; j++) {
    const args = substitute(skill.steps[j]!.args ?? {}, unbound);
    if (JSON.stringify(args).includes(JSON.stringify(entity))) return j;
  }
  return upTo;
}

interface StepOutcome {
  record: SkillStepRecord;
  final?: "denied" | "cancelled";
  /** `alternate-provider`: use `to` instead of `from` (and the aliases in `keys`) for the rest of the skill. */
  rebind?: { from: string; to: string; keys: string[] };
}

async function runStep(skill: SkillDefinition, step: SkillStep, scope: Scope, r: SkillRunner): Promise<StepOutcome> {
  let args = (substitute(step.args ?? {}, scope) ?? {}) as Record<string, unknown>;
  const record: SkillStepRecord = { id: step.id, tool: step.tool, status: "failed", attempts: 0 };
  let retries = step.retry?.attempts ?? 0;
  let recoveries = 0;
  for (;;) {
    record.attempts++;
    // A nested skill keeps its own record of done acts inside this run's (S1): a repeat never redoes them.
    const call = await r.callTool(step.tool, args, step.tool === "execute_skill" && r.progress ? { done: r.progress.done, prefix: `${progressKey(r.progress, step.id)}/` } : undefined);
    scope.steps[step.id] = { ok: call.ok, data: call.output.data ?? null, output: call.output.output };
    if (call.ok) {
      record.status = "ok";
      record.message = firstLine(call.output.output);
      return { record };
    }
    const failure = failureOf(call, args);
    record.code = failure.code;
    record.message = stepMessage(step.tool, call);
    const final = r.signal?.aborted ? "cancelled" : finalKind(call, failure);
    if (final) return { record, final };
    if (retries > 0 && step.retry!.on.includes(failure.code)) {
      retries--;
      continue;
    }
    if (recoveries >= 3) return { record };
    const recovered = await recover(skill, step, failure, r);
    if (!recovered) return { record };
    recoveries++;
    (record.recovery ??= []).push(`${recovered.strategy}@${failure.code}`);
    if (recovered.rebind) return { record, rebind: recovered.rebind };
  }
}

/** Apply the first applicable recovery strategy: retry the same call, or rebind a device for the rest of the skill; null when none applies. */
async function recover(skill: SkillDefinition, step: SkillStep, f: FailureInfo, r: SkillRunner): Promise<{ strategy: string; rebind?: StepOutcome["rebind"] } | null> {
  for (const rec of skill.recovery ?? []) {
    if (!rec.on.includes(f.code) && !rec.on.includes("*")) continue;
    switch (rec.strategy) {
      case "fetch-equipment": {
        // A cart that must stand at the bedside: walk to it, wheel it to the patient.
        const cart = f.hint?.goal.kind === "interact" ? f.hint.goal.id : null;
        const patient = r.patientId();
        if (!cart || !patient || (f.reason !== "provider-not-at-bedside" && f.code !== "PRECONDITION_FAILED") || cart === patient) break;
        const go = await r.callTool("navigate_to", { goal: f.hint!.goal });
        if (!go.ok) break;
        const moved = await r.callTool("interact_object", { target: cart, operation: "move_to", parameters: { goal: { kind: "interact", id: patient } } });
        if (moved.ok) return { strategy: rec.strategy };
        break;
      }
      case "replan": {
        if (!f.hint) break;
        const go = await r.callTool("navigate_to", { goal: f.hint.goal });
        if (go.ok) return { strategy: rec.strategy };
        break;
      }
      case "alternate-provider": {
        if (step.tool !== "interact_object" || !f.target) break;
        const current = r.resolveEntity(f.target);
        const caps = current ? (r.world().entity(current)?.capabilities ?? []) : [];
        if (!current || !caps.length) break;
        const reserved = r.world().snapshot().entities;
        const others = r
          .world()
          .find(r.actorId, { kind: "equipment", capabilities: caps, limit: 12 })
          .filter((e) => e.id !== current && e.state !== "out-of-service")
          // a device someone else holds is no alternative
          .filter((e) => !reserved[e.id]?.reservedBy || reserved[e.id]?.reservedBy === r.actorId);
        if (!others.length) break;
        const keys = [...new Set([current, f.target])];
        return { strategy: rec.strategy, rebind: { from: current, to: others[0]!.id, keys } };
      }
    }
  }
  return null;
}

/** The text of a skill result (execute_skill, /skill). */
export function skillResultText(res: SkillRunResult, locale: string): string {
  const lines = [rt(locale, "skill.result", { name: res.name, status: rt(locale, `skill.status.${res.status}` as RuntimeKey) })];
  if (res.message) lines.push(res.message);
  for (const s of res.steps) {
    const status = s.resumed ? rt(locale, "skill.step.resumed") : rt(locale, `skill.step.${s.status}` as RuntimeKey);
    lines.push(rt(locale, "skill.step", { id: s.id, tool: s.tool, status, message: s.message && s.status !== "skipped" ? ` — ${s.message}` : "" }));
    for (const rec of s.recovery ?? []) {
      const [strategy, code] = rec.split("@");
      lines.push(rt(locale, "skill.recovery", { strategy: strategy ?? rec, code: code ?? "" }));
    }
  }
  for (const p of res.postconditions) lines.push(rt(locale, "skill.post", { what: JSON.stringify(p.predicate), status: rt(locale, p.ok ? "skill.post.ok" : "skill.post.failed") }));
  return lines.join("\n");
}
