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
 * same capabilities) → `onError` (`abort` the skill, or `continue`). A call
 * the approval gate or a hook refused is never retried in another form.
 */
import { ConditionSchema, evaluate, t, WorldPredicateSchema, type CaseDefinition, type Condition, type SessionState, type WorldPredicate } from "@clinicalcraft/core";
import { evaluatePredicate, monitoringIntervention, type ActorId, type NavGoal, type WorldRuntime } from "@clinicalcraft/world";
import type { SessionTrace } from "../session/trace.js";
import { rt, type RuntimeKey } from "../session/i18n.js";
import { resolveFinding, resolveIntervention, resolveInvestigation } from "../tools/clinical.js";
import type { ToolOutput } from "../tools/types.js";
import type { SkillDefinition, SkillPredicate, SkillStep } from "./schema.js";

/** One tool call made by a skill step (through the caller's tool path). */
export interface SkillToolCall {
  ok: boolean;
  output: ToolOutput;
  /** Tool path status: ok, error, invalid, blocked, denied, cancelled, interrupted. */
  status: string;
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
  /** Run a tool through the caller's normal tool path. */
  callTool(tool: string, args: Record<string, unknown>): Promise<SkillToolCall>;
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
  steps: Record<string, { ok: boolean; data: unknown; output: string }>;
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

/** Substitute templates (see the schema module); object members that resolve to `undefined` are dropped. */
export function substitute(value: unknown, scope: Scope): unknown {
  if (typeof value === "string") {
    const exact = EXACT.exec(value);
    if (exact) return lookup(exact[1]!, scope);
    return value.replace(ANY, (_m, ref: string) => {
      const v = lookup(ref, scope);
      return v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    });
  }
  if (Array.isArray(value)) return value.map((v) => substitute(v, scope)).filter((v) => v !== undefined);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const s = substitute(v, scope);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return value;
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
export function resolveSkillParams(skill: SkillDefinition, raw: Record<string, unknown>, r: SkillRunner): { ok: true; params: Record<string, unknown> } | { ok: false; problems: string[] } {
  const L = r.locale;
  const c = r.caseDef;
  const params: Record<string, unknown> = {};
  const problems: string[] = [];
  for (const [name, spec] of Object.entries(skill.params ?? {})) {
    let value: unknown = raw[name];
    if ((value === undefined || value === "") && spec.default !== undefined) value = typeof spec.default === "string" && spec.default.startsWith("$") ? macro(spec.default, spec.type, r) : spec.default;
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

/** Does a skill predicate hold now (authoritative state)? */
export function predicateHolds(p: SkillPredicate, scope: Scope, r: SkillRunner): boolean {
  if ("all" in p) return p.all.every((x) => predicateHolds(x, scope, r));
  if ("any" in p) return p.any.some((x) => predicateHolds(x, scope, r));
  if ("not" in p) return !predicateHolds(p.not, scope, r);
  const world = r.world();
  const actor = world.actor(r.actorId);
  if ("clinical" in p) {
    const cond = ConditionSchema.safeParse(substitute(p.clinical, scope));
    return cond.success && evaluate(r.caseDef, r.state(), cond.data as Condition);
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

/** Failures that are never retried or recovered (a person or a hook said no; the turn was stopped). */
const FINAL_STATUSES = new Set(["denied", "blocked", "cancelled", "interrupted"]);

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

function firstLine(text: string): string {
  const line = text.split("\n")[0] ?? "";
  return line.length > 160 ? `${line.slice(0, 157)}…` : line;
}

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
  const scope: Scope = { params: resolved.params, steps: {} };
  const span = r.trace?.start("plan", `skill:${skill.id}`, { actorId: r.actorId, data: { skill: skill.id, params: resolved.params } });
  const body = async (): Promise<SkillRunResult> => {
    for (const p of skill.preconditions ?? []) {
      if (!predicateHolds(p, scope, r)) return done("precondition_failed", rt(L, "skill.precondition", { what: JSON.stringify(substitute(p, scope)) }));
    }
    for (const step of skill.steps) {
      if (r.signal?.aborted) return done("cancelled");
      if (step.when && !predicateHolds(step.when, scope, r)) {
        result.steps.push({ id: step.id, tool: step.tool, status: "skipped", attempts: 0 });
        continue;
      }
      const outcome = await runStep(skill, step, scope, r);
      result.steps.push(outcome.record);
      if (outcome.final === "cancelled") return done("cancelled");
      if (outcome.record.status === "failed" && (outcome.final === "denied" || (step.onError ?? "abort") === "abort")) return done("aborted");
    }
    const posts = (skill.postconditions ?? []).map((p) => ({ predicate: substitute(p, scope), ok: predicateHolds(p, scope, r) }));
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

async function runStep(skill: SkillDefinition, step: SkillStep, scope: Scope, r: SkillRunner): Promise<{ record: SkillStepRecord; final?: "denied" | "cancelled" }> {
  let args = (substitute(step.args ?? {}, scope) ?? {}) as Record<string, unknown>;
  const record: SkillStepRecord = { id: step.id, tool: step.tool, status: "failed", attempts: 0 };
  let retries = step.retry?.attempts ?? 0;
  let recoveries = 0;
  for (;;) {
    record.attempts++;
    const call = await r.callTool(step.tool, args);
    scope.steps[step.id] = { ok: call.ok, data: call.output.data ?? null, output: call.output.output };
    if (call.ok) {
      record.status = "ok";
      record.message = firstLine(call.output.output);
      return { record };
    }
    const failure = failureOf(call, args);
    record.code = failure.code;
    record.message = firstLine(call.output.output);
    if (FINAL_STATUSES.has(call.status) || r.signal?.aborted) return { record, final: call.status === "cancelled" || call.status === "interrupted" || r.signal?.aborted ? "cancelled" : "denied" };
    if (retries > 0 && step.retry!.on.includes(failure.code)) {
      retries--;
      continue;
    }
    if (recoveries >= 3) return { record };
    const recovered = await recover(skill, step, failure, args, r);
    if (!recovered) return { record };
    recoveries++;
    (record.recovery ??= []).push(`${recovered.strategy}@${failure.code}`);
    args = recovered.args;
  }
}

/** Apply the first applicable recovery strategy; the (possibly changed) arguments to retry with, or null. */
async function recover(skill: SkillDefinition, step: SkillStep, f: FailureInfo, args: Record<string, unknown>, r: SkillRunner): Promise<{ strategy: string; args: Record<string, unknown> } | null> {
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
        if (moved.ok) return { strategy: rec.strategy, args };
        break;
      }
      case "replan": {
        if (!f.hint) break;
        const go = await r.callTool("navigate_to", { goal: f.hint.goal });
        if (go.ok) return { strategy: rec.strategy, args };
        break;
      }
      case "alternate-provider": {
        if (step.tool !== "interact_object" || !f.target) break;
        const current = r.resolveEntity(f.target);
        const caps = current ? (r.world().entity(current)?.capabilities ?? []) : [];
        if (!current || !caps.length) break;
        const others = r.world().find(r.actorId, { kind: "equipment", capabilities: caps, limit: 6 }).filter((e) => e.id !== current && e.state !== "out-of-service");
        if (!others.length) break;
        return { strategy: rec.strategy, args: { ...args, target: others[0]!.id } };
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
    lines.push(rt(locale, "skill.step", { id: s.id, tool: s.tool, status: rt(locale, `skill.step.${s.status}` as RuntimeKey), message: s.message && s.status !== "skipped" ? ` — ${s.message}` : "" }));
    for (const rec of s.recovery ?? []) {
      const [strategy, code] = rec.split("@");
      lines.push(rt(locale, "skill.recovery", { strategy: strategy ?? rec, code: code ?? "" }));
    }
  }
  for (const p of res.postconditions) lines.push(rt(locale, "skill.post", { what: JSON.stringify(p.predicate), status: rt(locale, p.ok ? "skill.post.ok" : "skill.post.failed") }));
  return lines.join("\n");
}
