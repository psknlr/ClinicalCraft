/**
 * The operative benchmark's scenario contract — `clinicalcraft/operative-scenario@1`
 * (docs/BENCHMARK_OPERATIVE.md). A scenario puts an agent at the operating table of a case with a
 * `procedure`: the case is brought to its operative phase (its own reference solution up to the first
 * `operate`), the patient's anatomy is a procedure variant — fixed, or drawn from a pool by the run seed
 * and never shown to the agent — and the agent works with `observe_field` and `operate` only. Success
 * is judged on the final authoritative state (the core Condition DSL and the case's safety gates), never
 * on the agent's text. Each variant the scenario can draw has an expert-reviewable reference trajectory.
 *
 * Files live in `<content dir>/operative/<suite>/*.json` (the built-in content and the directories in
 * `contentDirs`).
 */
import { ClinicalActionSchema, ConditionSchema, IdSchema, LocalizedTextSchema, ProcedureOpSchema } from "@clinicalcraft/core";
import { z } from "zod";
import { BenchJsonSchema } from "../schema.js";

export const OPERATIVE_SCENARIO_SCHEMA_ID = "clinicalcraft/operative-scenario@1" as const;

/** `dev` scenarios may be inspected while improving an agent; `test` scenarios are held out. */
export const OPERATIVE_SPLITS = ["dev", "test"] as const;
export type OperativeSplit = (typeof OPERATIVE_SPLITS)[number];

/** What a safe operator does in the scenario (for the bail-out metrics; success is the predicates). */
export const OPERATIVE_EXPECTATIONS = ["complete", "bailout", "either"] as const;
export type OperativeExpectation = (typeof OPERATIVE_EXPECTATIONS)[number];

export const OPERATIVE_VERDICTS = ["clear", "complication", "safety-critical"] as const;
export type OperativeVerdict = (typeof OPERATIVE_VERDICTS)[number];

/** The tools an operative agent is given. */
export const OPERATIVE_TOOLS = ["observe_field", "operate"] as const;

const ToolName = z.string().regex(/^[a-z][a-z0-9_]{0,59}$/, "a tool name");

/** A handle written as the structure it must be (`@cystic-duct`): resolved to the handle the field gives it (`resolveTrajectory`). */
export const HANDLE_PLACEHOLDER = /^@[a-z0-9][a-z0-9-]{0,79}$/;

/**
 * One step of a reference trajectory: a `ProcedureOp` whose `handle` may be a placeholder `@<structure id>`
 * (reviewers read the anatomy, not T-numbers; the runner resolves it by replaying the steps on the engine).
 */
export const TrajectoryOpSchema = z.record(z.string().max(80), BenchJsonSchema).superRefine((op, ctx) => {
  const probe = typeof op.handle === "string" && HANDLE_PLACEHOLDER.test(op.handle) ? { ...op, handle: "T1" } : op;
  const r = ProcedureOpSchema.safeParse(probe);
  if (!r.success) for (const i of r.error.issues.slice(0, 3)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: i.path, message: i.message });
});
export type TrajectoryOp = z.infer<typeof TrajectoryOpSchema>;
const Ops = z.array(TrajectoryOpSchema).min(1).max(300);

export const OperativePredicateSchema = z.union([
  /** The engine state (core Condition DSL; `procedure` leaves read the field's truth). */
  z.object({ clinical: ConditionSchema }).strict(),
  /** The case's safety verdict (its `safetyGates`) is one of these. */
  z.object({ verdict: z.array(z.enum(OPERATIVE_VERDICTS)).min(1).max(3) }).strict(),
]);
export type OperativePredicate = z.infer<typeof OperativePredicateSchema>;

const ScenarioShape = z
  .object({
    $schema: z.string().optional(),
    schema: z.literal(OPERATIVE_SCENARIO_SCHEMA_ID),
    id: IdSchema,
    /** The suite (= the directory the file lives in). */
    suite: IdSchema,
    split: z.enum(OPERATIVE_SPLITS),
    title: LocalizedTextSchema,
    /** The task, as the agent receives it (the scenario locale's text is sent). It must not name the variant. */
    instruction: LocalizedTextSchema,
    caseId: IdSchema,
    locale: z.enum(["zh-CN", "en"]),
    /** Base seed; a run's seed is derived from it and the run seed (`--seeds`). */
    seed: z.number().int().min(0).max(2 ** 31 - 1).default(1),
    /** The patient's anatomy: a variant id (`reference`: the base definition), or a pool the run seed draws from. */
    variant: z.union([IdSchema, z.object({ pool: z.array(IdSchema).min(2).max(16) }).strict()]),
    setup: z
      .object({
        /** `solution`: the case's reference solution up to its first `operate` (history, decisions, the checklist) · `none`. */
        preamble: z.enum(["solution", "none"]).default("solution"),
        /** Engine actions after the preamble (e.g. a phase change). */
        clinical: z.array(ClinicalActionSchema).max(32).optional(),
        /** Who answers approval requests (clip, divide, coagulate, bail-out): a supervising surgeon who approves, one who declines, or the CLI's headless rules. */
        approvals: z.enum(["approve", "deny", "headless"]).default("approve"),
        approvalMode: z.enum(["default", "strict", "auto", "plan", "bypass"]).default("default"),
      })
      .strict()
      .default({}),
    expect: z.enum(OPERATIVE_EXPECTATIONS),
    predicates: z.array(OperativePredicateSchema).min(1).max(32),
    limits: z
      .object({
        maxToolCalls: z.number().int().min(1).max(1000).default(200),
        maxTurns: z.number().int().min(1).max(50).default(4),
        maxSimMinutes: z.number().positive().max(24 * 60).optional(),
        timeoutMs: z.number().int().min(1000).max(3_600_000).default(300_000),
      })
      .strict()
      .default({}),
    /** The reference trajectory for every variant the scenario can draw (expert-reviewable: one `operate` op per step, handles as `@<structure id>` or `T<n>`). */
    reference: z.record(IdSchema, Ops),
    /** Scripted model plans per variant (default: derived from the reference, with `observe_field` before decisions). */
    scripted: z
      .object({
        plans: z.record(IdSchema, z.array(z.object({ tool: ToolName, args: z.record(z.string().max(80), BenchJsonSchema).optional() }).strict()).max(600)).optional(),
        final: LocalizedTextSchema.optional(),
      })
      .strict()
      .optional(),
    tags: z.array(z.string().min(1).max(40)).max(16).optional(),
    /** For reviewers: why this is the expected behaviour (never sent to the agent). */
    rationale: LocalizedTextSchema.optional(),
  })
  .strict();

/** The variants a scenario can draw. */
export function scenarioVariants(s: { variant: OperativeScenario["variant"] }): string[] {
  return typeof s.variant === "string" ? [s.variant] : [...new Set(s.variant.pool)];
}

export const OperativeScenarioSchema = ScenarioShape.superRefine((s, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  for (const v of scenarioVariants(s)) if (!s.reference[v]) issue(["reference"], `no reference trajectory for variant "${v}"`);
  for (const k of Object.keys(s.reference)) if (!scenarioVariants(s).includes(k)) issue(["reference", k], `variant "${k}" is not one the scenario can draw`);
  for (const [k, plan] of Object.entries(s.scripted?.plans ?? {})) {
    if (!scenarioVariants(s).includes(k)) issue(["scripted", "plans", k], `variant "${k}" is not one the scenario can draw`);
    plan.forEach((call, i) => {
      if (!(OPERATIVE_TOOLS as readonly string[]).includes(call.tool)) issue(["scripted", "plans", k, i, "tool"], `an operative agent has only ${OPERATIVE_TOOLS.join(" and ")}`);
    });
  }
  (s.setup.clinical ?? []).forEach((a, i) => {
    if (a.type === "start") issue(["setup", "clinical", i], "the runner starts the case");
  });
});

export type OperativeScenario = z.infer<typeof ScenarioShape>;

/** Validate a scenario: the scenario, or readable issues (`path: message`). */
export function parseOperativeScenario(value: unknown): { ok: true; scenario: OperativeScenario } | { ok: false; issues: string[] } {
  const r = OperativeScenarioSchema.safeParse(value);
  if (r.success) return { ok: true, scenario: r.data };
  return { ok: false, issues: r.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`.slice(0, 240)) };
}
