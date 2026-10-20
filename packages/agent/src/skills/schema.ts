/**
 * Skills (docs/EMBODIED.md R9, §9): declarative workflows — data, never
 * code. A skill names typed parameters, preconditions, steps (tool calls
 * with templated arguments, an optional `when`, retry and error policy),
 * postconditions checked against authoritative state (the engine through
 * core `evaluate`, the world through its runtime) and recovery strategies.
 * Built-in skills, project skills (`.clinicalcraft/skills/*.json`) and
 * inline skills proposed by a model are validated by the same schema.
 *
 * Templates (strings in step arguments and predicates):
 * `${<param>}` · `${steps.<stepId>.data.<path>}` (a step's tool `data`;
 * array indices as numbers: `${steps.find.data.entities.0.id}`) ·
 * `${steps.<stepId>.ok}`. A string that is exactly one placeholder takes the
 * value itself (numbers, objects); otherwise placeholders are interpolated.
 * Every placeholder must name a declared parameter or an earlier step.
 *
 * Parameter defaults may be resolver macros: `$patient` (the bound patient),
 * `$patient-monitor` (the patient's monitor), `$monitoring` (the case's
 * monitoring intervention), `$capability:<cap>[,<cap>…]` (the first case
 * item of the parameter's type whose requirements those capabilities meet).
 */
import { ConditionSchema, IdSchema, LocalizedTextSchema, WorldPredicateSchema, type Condition, type LocalizedText, type WorldPredicate } from "@clinicalcraft/core";
import { z } from "zod";
import { LEARNER_TOOL_NAMES } from "../tools/learner.js";

export const SKILL_SCHEMA_ID = "clinicalcraft/skill@1" as const;
export const SKILL_PARAM_TYPES = ["entity", "investigation", "intervention", "finding", "string", "number"] as const;
export const SKILL_SAFETY = ["read-only", "physical", "clinical", "high-risk"] as const;
export const RECOVERY_STRATEGIES = ["replan", "alternate-provider", "fetch-equipment"] as const;

export type SkillParamType = (typeof SKILL_PARAM_TYPES)[number];
export type SkillSafety = (typeof SKILL_SAFETY)[number];
export type RecoveryStrategy = (typeof RECOVERY_STRATEGIES)[number];

/** A precondition, `when` or postcondition of a skill. */
export type SkillPredicate =
  /** An engine condition (core Condition DSL, `evaluate`). */
  | { clinical: Condition }
  /** The acting body is within `range` m of an entity's footprint. */
  | { actorNear: string; range: number }
  /** An entity's behaviour state (stored or derived from the engine) is one of these. */
  | { entityState: string; state: string | string[] }
  /** A world predicate (`actorWithin`, `patientWithin`, `deviceAtBedside`, `handsClean`, `actorHolding`, `state`, `role`) for the acting body and an optional target entity. */
  | { world: WorldPredicate; target?: string }
  | { all: SkillPredicate[] }
  | { any: SkillPredicate[] }
  | { not: SkillPredicate };

const PLACEHOLDER = /\$\{([^}]+)\}/g;

/**
 * Condition leaves a skill may test (review G1): only what the learner can see — their own record (asked,
 * examined, ordered, read, a result ready, given, decided, attempted), objectives, the phase, the clock, hints —
 * and `vital`, which the interpreter evaluates against what the bedside SHOWS the acting body (nothing shown:
 * false). Never `flag` (authored scoring markers and findings) or `decidedFirstTry` (the scoring of an answer):
 * a skill's preconditions, `when` and postconditions would otherwise be an oracle over hidden engine state.
 */
export const SKILL_CONDITION_LEAVES = ["always", "asked", "examined", "ordered", "read", "resultReady", "intervened", "decided", "attempted", "objective", "phase", "elapsed", "hints", "vital"] as const;
const COMBINATORS = new Set(["all", "any", "not"]);
const LEAVES: ReadonlySet<string> = new Set(SKILL_CONDITION_LEAVES);

/** The condition leaves of a (possibly templated) condition a skill may not use. */
export function hiddenConditionLeaves(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => hiddenConditionLeaves(v, out));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (COMBINATORS.has(key)) hiddenConditionLeaves(v, out);
      else if (!LEAVES.has(key) && !["phase", "minCount", "op", "value", "gte", "lte"].includes(key) && !out.includes(key)) out.push(key);
    }
  }
  return out;
}

/**
 * Failure codes of a refusal by a person or a hook — the approval gate, a deny rule, a hook, a cancellation —
 * directly or inside a world operation (review C9): final, never retried or recovered.
 */
export const FINAL_FAILURE_CODES: readonly string[] = ["APPROVAL_DENIED", "CANCELLED", "HOOK_BLOCKED", "DENIED", "BLOCKED", "INTERRUPTED"];

/** Replace every `${…}` in string leaves by a valid id, so templated conditions can be validated for structure. */
function placeholderized(value: unknown): unknown {
  if (typeof value === "string") return value.replace(PLACEHOLDER, "x");
  if (Array.isArray(value)) return value.map(placeholderized);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, placeholderized(v)]));
  return value;
}

function templated<T>(schema: z.ZodType<T>): z.ZodType<T> {
  return z.unknown().superRefine((value, ctx) => {
    // Missing: fatal, so a union of predicate shapes reports the shape that was meant, not this one.
    if (value === undefined) return void ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", fatal: true });
    const r = schema.safeParse(placeholderized(value));
    if (!r.success) for (const issue of r.error.issues) ctx.addIssue({ code: z.ZodIssueCode.custom, path: issue.path, message: issue.message });
  }) as unknown as z.ZodType<T>;
}

const Ref = z.string().min(1).max(160);

/** A templated condition limited to the learner-visible leaves (`SKILL_CONDITION_LEAVES`). */
const VisibleConditionSchema = templated(ConditionSchema).superRefine((value, ctx) => {
  for (const leaf of hiddenConditionLeaves(value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${leaf}" is not something the learner can see: a skill may test only ${SKILL_CONDITION_LEAVES.join(", ")} (vital: what the bedside shows)` });
  }
});

export const SkillPredicateSchema: z.ZodType<SkillPredicate> = z.lazy(() =>
  z.union([
    z.object({ clinical: VisibleConditionSchema }).strict(),
    z.object({ actorNear: Ref, range: z.number().positive().max(100) }).strict(),
    z.object({ entityState: Ref, state: z.union([Ref, z.array(Ref).min(1).max(8)]) }).strict(),
    z.object({ world: templated(WorldPredicateSchema), target: Ref.optional() }).strict(),
    z.object({ all: z.array(SkillPredicateSchema).max(16) }).strict(),
    z.object({ any: z.array(SkillPredicateSchema).max(16) }).strict(),
    z.object({ not: SkillPredicateSchema }).strict(),
  ]),
);

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
/** A JSON value in step arguments (bounded strings and arrays). */
export const SkillJsonSchema: z.ZodType<Json> = z.lazy(() => z.union([z.string().max(2000), z.number(), z.boolean(), z.null(), z.array(SkillJsonSchema).max(32), z.record(z.string().max(80), SkillJsonSchema)]));

export const SkillParamSchema = z
  .object({
    type: z.enum(SKILL_PARAM_TYPES),
    description: LocalizedTextSchema.optional(),
    /** Default true (false when a `default` is given). */
    required: z.boolean().optional(),
    /** A value, or a resolver macro (`$patient`, `$patient-monitor`, `$monitoring`, `$capability:<cap>…`). */
    default: z.union([z.string().max(200), z.number()]).optional(),
  })
  .strict();

export const SkillStepSchema = z
  .object({
    id: IdSchema,
    /** A learner tool (a clinical or world tool — never an NPC's or a front-end's) run through the caller's normal tool path (review S2). */
    tool: z.enum(LEARNER_TOOL_NAMES, { errorMap: () => ({ message: "not a tool a skill may call: only the clinical and world tools (never an NPC's tool or a front-end's)" }) }),
    args: z.record(z.string().max(80), SkillJsonSchema).optional(),
    /** Run the step only when this holds (else it is skipped). */
    when: SkillPredicateSchema.optional(),
    /** Retry the step when it fails with one of these codes (world / spatial / engine rejection codes). */
    retry: z.object({ attempts: z.number().int().min(1).max(5), on: z.array(z.string().min(1).max(60)).min(1).max(16) }).strict().optional(),
    /** After a failure that no retry or recovery fixed: stop the skill (default) or go on. */
    onError: z.enum(["abort", "continue"]).optional(),
    description: LocalizedTextSchema.optional(),
  })
  .strict();

export const SkillRecoverySchema = z
  .object({
    /** Failure codes this strategy handles ("*" = any failure that carries a hint). */
    on: z.array(z.string().min(1).max(60)).min(1).max(16),
    /** `replan`: walk to the refusal's hint goal and retry · `alternate-provider`: another entity with the same capabilities · `fetch-equipment`: wheel the hinted cart to the patient and retry. */
    strategy: z.enum(RECOVERY_STRATEGIES),
  })
  .strict();

const SkillShape = z
  .object({
    $schema: z.string().optional(),
    schema: z.literal(SKILL_SCHEMA_ID),
    id: IdSchema,
    name: LocalizedTextSchema,
    description: LocalizedTextSchema,
    params: z.record(IdSchema, SkillParamSchema).optional(),
    safety: z.enum(SKILL_SAFETY),
    preconditions: z.array(SkillPredicateSchema).max(16).optional(),
    steps: z.array(SkillStepSchema).min(1).max(32),
    postconditions: z.array(SkillPredicateSchema).max(16).optional(),
    recovery: z.array(SkillRecoverySchema).max(8).optional(),
  })
  .strict();

/** Every `${…}` reference in a value (string leaves). */
export function placeholders(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") for (const m of value.matchAll(PLACEHOLDER)) out.push(m[1]!.trim());
  else if (Array.isArray(value)) value.forEach((v) => placeholders(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => placeholders(v, out));
  return out;
}

/** The skill definition schema (structure + template references). */
export const SkillSchema = SkillShape.superRefine((skill, ctx) => {
  const params = new Set(Object.keys(skill.params ?? {}));
  const seen = new Set<string>();
  const check = (value: unknown, path: (string | number)[], steps: ReadonlySet<string>) => {
    for (const ref of placeholders(value)) {
      const step = /^steps\.([^.]+)\.(data(\..+)?|ok|output)$/.exec(ref);
      if (step) {
        if (!steps.has(step[1]!)) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `"\${${ref}}" refers to step "${step[1]}", which does not run before this point` });
      } else if (!params.has(ref)) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `"\${${ref}}" is not a declared parameter` });
    }
  };
  check(skill.preconditions ?? [], ["preconditions"], new Set());
  skill.steps.forEach((step, i) => {
    if (seen.has(step.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["steps", i, "id"], message: `duplicate step id "${step.id}"` });
    check(step.args ?? {}, ["steps", i, "args"], seen);
    check(step.when ?? {}, ["steps", i, "when"], seen);
    seen.add(step.id);
  });
  check(skill.postconditions ?? [], ["postconditions"], seen);
  // A person's or a hook's refusal is final (review C9): no retry, no recovery may list it.
  const finals = (codes: readonly string[]) => codes.filter((c) => FINAL_FAILURE_CODES.includes(c));
  skill.steps.forEach((step, i) => {
    for (const code of finals(step.retry?.on ?? [])) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["steps", i, "retry", "on"], message: `"${code}" is a final refusal (a person or a hook said no): it is never retried` });
  });
  (skill.recovery ?? []).forEach((rec, i) => {
    for (const code of finals(rec.on)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recovery", i, "on"], message: `"${code}" is a final refusal (a person or a hook said no): it is never recovered` });
  });
  for (const [name, p] of Object.entries(skill.params ?? {})) {
    if (typeof p.default === "string" && p.default.startsWith("$") && !/^\$(patient|patient-monitor|monitoring|capability:[A-Za-z0-9._,-]+)$/.test(p.default)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["params", name, "default"], message: `unknown resolver macro "${p.default}"` });
    }
  }
});

/** A validated skill definition. */
export type SkillDefinition = z.infer<typeof SkillShape>;
export type SkillStep = z.infer<typeof SkillStepSchema>;
export type SkillParam = z.infer<typeof SkillParamSchema>;

/** Validate a skill definition (built-in, project or inline): the skill, or readable issues. */
export function parseSkill(value: unknown): { ok: true; skill: SkillDefinition } | { ok: false; issues: string[] } {
  const r = SkillSchema.safeParse(value);
  if (r.success) return { ok: true, skill: r.data };
  return { ok: false, issues: r.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
}

/** Localised text of a skill field. */
export type SkillText = LocalizedText;

/** Prefix of every skill loaded from disk (user and project skills): they never shadow a built-in (review S8). */
export const PROJECT_SKILL_PREFIX = "project:";

/** The skill a `skill_id` names among `skills`: an exact id (built-ins first), else a project skill `project:<id>`. */
export function findSkill<T extends { id: string }>(skills: readonly T[], id: string): T | undefined {
  return skills.find((s) => s.id === id) ?? (id.startsWith(PROJECT_SKILL_PREFIX) ? undefined : skills.find((s) => s.id === `${PROJECT_SKILL_PREFIX}${id}`));
}

/** The skill ids a skill's steps run by name (`execute_skill {skill_id}`; templated ids are not names). */
export function skillReferences(skill: Pick<SkillDefinition, "steps">): string[] {
  return skill.steps.flatMap((step) => {
    const id = step.tool === "execute_skill" ? step.args?.skill_id : undefined;
    return typeof id === "string" && id && !id.includes("${") ? [id] : [];
  });
}

/**
 * Cycles among skills loaded together (review C10): a skill that runs itself, or skills that run each other,
 * through `execute_skill {skill_id}` — references resolved like `findSkill` against these skills (namespaced as
 * project skills) and the ids given. Each cycle is listed once as the ids along it, back to its start
 * ("loop>loop", "ping>pong>ping").
 */
export function skillCycles(skills: readonly Pick<SkillDefinition, "id" | "steps">[], builtinIds: readonly string[] = []): string[][] {
  const byId = new Map(skills.map((s) => [s.id, s]));
  const resolve = (ref: string): string | null => {
    if (builtinIds.includes(ref)) return null; // built-ins run no skills
    const bare = ref.startsWith(PROJECT_SKILL_PREFIX) ? ref.slice(PROJECT_SKILL_PREFIX.length) : ref;
    return byId.has(bare) ? bare : null;
  };
  const cycles: string[][] = [];
  const seen = new Set<string>();
  const visit = (id: string, path: string[]) => {
    const at = path.indexOf(id);
    if (at >= 0) {
      const cycle = [...path.slice(at), id];
      const key = [...cycle.slice(0, -1)].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        cycles.push(cycle);
      }
      return;
    }
    const skill = byId.get(id);
    if (!skill || path.length > 64) return;
    for (const ref of skillReferences(skill)) {
      const next = resolve(ref);
      if (next) visit(next, [...path, id]);
    }
  };
  for (const s of skills) visit(s.id, []);
  return cycles;
}
