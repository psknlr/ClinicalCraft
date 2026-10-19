/**
 * The benchmark scenario contract — `clinicalcraft/bench-scenario@1`
 * (docs/EMBODIED.md §13, R11). A scenario is data: the case and facility,
 * the start state (`setup`: the acting body's pose, dynamic obstacles,
 * out-of-service devices, locked doors, scripted staff actions, approval
 * mode and answering policy, permission rules, practice scope), the task in
 * both languages, the success predicates — evaluated on the FINAL
 * AUTHORITATIVE state only (the engine state through the core Condition DSL,
 * the world snapshot, the recorded refusals and audits; never the agent's
 * text) —, the limits, the reference solver's steps and the scripted model
 * plan. Scenario files live in `packages/content/bench/<suite>/*.json`.
 */
import { ClinicalActionSchema, ConditionSchema, IdSchema, LocalizedTextSchema, type ClinicalAction, type Condition, type LocalizedText } from "@clinicalcraft/core";
import type { NavGoal } from "@clinicalcraft/world";
import { clinicalTools, WORLD_TOOL_NAMES } from "@clinicalcraft/agent";
import { z } from "zod";

export const BENCH_SCENARIO_SCHEMA_ID = "clinicalcraft/bench-scenario@1" as const;

/** Scenario categories (EMBODIED §13). */
export const BENCH_CATEGORIES = ["perception", "spatial", "navigation", "interaction", "clinical-workflow", "recovery", "multi-agent", "safety"] as const;
export type BenchCategory = (typeof BENCH_CATEGORIES)[number];

export const BENCH_LOCALES = ["zh-CN", "en"] as const;
export type BenchLocale = (typeof BENCH_LOCALES)[number];

/** The bench-only answer tool (perception / spatial tasks). */
export const SUBMIT_ANSWER_TOOL = "submit_answer";

/**
 * Normalised refusal codes the runner records (`refusedWith`): the world's
 * error codes, the spatial gate's, `APPROVAL_DENIED` (any refusal by the
 * approval gate — a deny rule, the practice scope, plan mode or a denied
 * approval request), `CLINICAL_REJECTED` (the engine refused the act),
 * `HOOK_BLOCKED`, `UNKNOWN_TOOL`, `INVALID_ARGS`, `TOOL_ERROR`.
 */
export const REFUSAL_CODES = [
  "TARGET_NOT_FOUND",
  "TARGET_NOT_REACHABLE",
  "PATH_BLOCKED",
  "STALE_DESTINATION",
  "MOVEMENT_INTERRUPTED",
  "NAVIGATION_TIMEOUT",
  "ACCESS_DENIED",
  "NO_INTERACTION_POINT",
  "INVALID_REQUEST",
  "UNKNOWN_ACTOR",
  "OPERATION_NOT_SUPPORTED",
  "PRECONDITION_FAILED",
  "NOT_IN_RANGE",
  "NOT_VISIBLE",
  "NOT_AUTHORIZED",
  "DEVICE_BUSY",
  "DEVICE_UNAVAILABLE",
  "STALE_STATE",
  "HANDS_FULL",
  "NOT_HOLDING",
  "CANCELLED",
  "SPATIAL_REQUIREMENT_UNMET",
  "SPATIAL_PRECONDITION_CHANGED",
  "CLINICAL_REJECTED",
  "APPROVAL_DENIED",
  "HOOK_BLOCKED",
  "UNKNOWN_TOOL",
  "INVALID_ARGS",
  "TOOL_ERROR",
] as const;
export type RefusalCode = (typeof REFUSAL_CODES)[number];

/** Every tool a bench session can offer: the clinical tools, the world tools and `submit_answer`. */
export function knownToolNames(): string[] {
  return [...new Set([...clinicalTools().map((t) => t.name), ...WORLD_TOOL_NAMES, SUBMIT_ANSWER_TOOL])];
}

const Ref = z.string().min(1).max(160);
const ToolName = z.string().regex(/^[a-z][a-z0-9_]{0,59}$/, "a tool name");
const ActorRef = z.string().regex(/^(actor|staff):[A-Za-z0-9._-]+$/, "an actor id (actor:<name> or staff:<id>)");
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
/** A JSON value (tool arguments, operation parameters). */
export const BenchJsonSchema: z.ZodType<Json> = z.lazy(() => z.union([z.string().max(4000), z.number(), z.boolean(), z.null(), z.array(BenchJsonSchema).max(64), z.record(z.string().max(80), BenchJsonSchema)]));
const JsonObject = z.record(z.string().max(80), BenchJsonSchema);

/** A navigation goal (`@clinicalcraft/world` `NavGoal`). */
export const NavGoalSchema: z.ZodType<NavGoal> = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal("point"), x: z.number(), z: z.number(), level: Ref.optional(), range: z.number().positive().max(50).optional() }).strict(),
    z.object({ kind: z.literal("entity"), id: Ref, range: z.number().positive().max(50).optional() }).strict(),
    z.object({ kind: z.literal("interact"), id: Ref, operation: Ref.optional() }).strict(),
    z.object({ kind: z.literal("room"), id: Ref }).strict(),
    z.object({ kind: z.literal("follow"), id: Ref, range: z.number().positive().max(50).optional() }).strict(),
    z.object({ kind: z.literal("look"), id: Ref, range: z.number().positive().max(50).optional() }).strict(),
    z.object({ kind: z.literal("any"), goals: z.array(NavGoalSchema).min(1).max(8) }).strict(),
  ]),
) as z.ZodType<NavGoal>;

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

/** Who answers approval requests: a supervising clinician who approves, one who declines, or the CLI's headless rules. */
export const APPROVAL_POLICIES = ["approve", "deny", "headless"] as const;
export type ApprovalPolicy = (typeof APPROVAL_POLICIES)[number];

const PoseSchema = z.object({ x: z.number(), z: z.number(), yaw: z.number().min(-360).max(360).optional(), level: Ref.optional() }).strict();

const SetupActionSchema = z
  .object({
    /** The acting body: a staff member (`staff:<id>`) or the clinician (`actor:clinician`). */
    actor: ActorRef,
    operation: Ref,
    target: Ref.optional(),
    goal: NavGoalSchema.optional(),
    parameters: JsonObject.optional(),
  })
  .strict();

export const SetupSchema = z
  .object({
    /** The clinician's body: a start pose (`pose`), a place to walk to before the run (`at`), the initial facing in degrees (or `random`: seeded per run). */
    actor: z.object({ pose: PoseSchema.optional(), at: NavGoalSchema.optional(), yaw: z.union([z.number().min(-360).max(360), z.literal("random")]).optional() }).strict().optional(),
    /** Scenario-controlled world actions before the run (a nurse reserving a device, a cart moved into a corridor, the clinician's walk past equipment). */
    actions: z.array(SetupActionSchema).max(32).optional(),
    /** Dynamic obstacles (centre-based rect, metres). */
    obstacles: z
      .array(z.object({ id: Ref, level: Ref.optional(), rect: z.object({ x: z.number(), z: z.number(), w: z.number().positive(), d: z.number().positive() }).strict(), label: LocalizedTextSchema.optional() }).strict())
      .max(16)
      .optional(),
    /** Equipment taken out of service. */
    unavailable: z.array(Ref).max(32).optional(),
    /** Door states (locking implies closing). */
    doors: z.array(z.object({ id: Ref, open: z.boolean().optional(), locked: z.boolean().optional() }).strict()).max(16).optional(),
    /** Engine actions dispatched before the agent starts (prior workup), after `start`. */
    clinical: z.array(ClinicalActionSchema).max(32).optional(),
    approvalMode: z.enum(["default", "strict", "auto", "plan", "bypass"]).optional(),
    /** Who answers approval requests (default `headless`: the CLI's unattended rules). */
    approvals: z.enum(APPROVAL_POLICIES).optional(),
    permissions: z.object({ allow: z.array(Ref).max(32).optional(), ask: z.array(Ref).max(32).optional(), deny: z.array(Ref).max(32).optional() }).strict().optional(),
    practiceScope: z.enum(["history-only", "workup", "full"]).optional(),
  })
  .strict();
export type BenchSetup = z.infer<typeof SetupSchema>;

/* ------------------------------------------------------------------ */
/* Success predicates                                                  */
/* ------------------------------------------------------------------ */

/** World predicates, evaluated on the final world state (default actor: the clinician's body). */
export const BenchWorldPredicateSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("actorInRoom"), actor: ActorRef.optional(), room: Ref }).strict(),
  z.object({ kind: z.literal("actorOnLevel"), actor: ActorRef.optional(), level: Ref }).strict(),
  z.object({ kind: z.literal("actorNear"), actor: ActorRef.optional(), target: Ref, range: z.number().positive().max(50) }).strict(),
  z.object({ kind: z.literal("entityState"), target: Ref, state: z.union([Ref, z.array(Ref).min(1).max(8)]) }).strict(),
  /** A cart is at the patient's bedside: a given one (`target`) or any in-service one providing `capability`. */
  z.object({ kind: z.literal("deviceAtBedside"), target: Ref.optional(), capability: Ref.optional() }).strict(),
  z.object({ kind: z.literal("handsClean"), actor: ActorRef.optional() }).strict(),
  z.object({ kind: z.literal("holding"), actor: ActorRef.optional(), item: Ref }).strict(),
  z.object({ kind: z.literal("doorState"), door: Ref, open: z.boolean().optional(), locked: z.boolean().optional() }).strict(),
]);
export type BenchWorldPredicate = z.infer<typeof BenchWorldPredicateSchema>;

const RefusalCode = z.enum(REFUSAL_CODES);

export const PredicateSchema = z.union([
  /** The engine state (core Condition DSL). */
  z.object({ clinical: ConditionSchema }).strict(),
  z.object({ world: BenchWorldPredicateSchema }).strict(),
  /** The last answer submitted with `submit_answer` resolves to one of these entity ids. */
  z.object({ answerEquals: z.union([Ref, z.array(Ref).min(1).max(8)]) }).strict(),
  /** Some action was refused with this code (optionally by this tool / on this target). */
  z.object({ refusedWith: z.union([RefusalCode, z.object({ code: RefusalCode, tool: ToolName.optional(), target: Ref.optional() }).strict()]) }).strict(),
  /** The spatial audit found no accepted clinical act whose acting body violated the spatial policy. */
  z.object({ noSpatialViolationsAccepted: z.literal(true) }).strict(),
  /** The authorisation audit found no accepted clinical act the approval gate had not authorised. */
  z.object({ noUnauthorisedAcceptance: z.literal(true) }).strict(),
  /** The agent called this tool at most `max` times. */
  z.object({ toolCalledAtMostTimes: z.object({ tool: ToolName, max: z.number().int().min(0).max(1000) }).strict() }).strict(),
  /** The case was finished (`finish_case` accepted). */
  z.object({ caseFinished: z.literal(true) }).strict(),
]);
export type BenchPredicate = z.infer<typeof PredicateSchema>;

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

export const LimitsSchema = z
  .object({
    /** Tool calls by the agent under test (model tool calls; the reference solver's API calls). */
    maxToolCalls: z.number().int().min(1).max(1000).default(40),
    /** Model turns (a turn ends when the model stops calling tools, or at its tool-round limit). */
    maxTurns: z.number().int().min(1).max(50).default(3),
    /** Simulated minutes from the start of the run. */
    maxSimMinutes: z.number().positive().max(24 * 60).optional(),
    /** Wall-clock budget of the run. */
    timeoutMs: z.number().int().min(1000).max(3_600_000).default(120_000),
  })
  .strict();
export type BenchLimits = z.infer<typeof LimitsSchema>;

/* ------------------------------------------------------------------ */
/* Reference solver steps                                              */
/* ------------------------------------------------------------------ */

const FindQuerySchema = z
  .object({
    kind: z.enum(["patient", "staff", "actor", "equipment", "door", "room", "level", "connector", "item"]).optional(),
    type: Ref.optional(),
    capabilities: z.array(Ref).min(1).max(8).optional(),
    name: Ref.optional(),
    room: Ref.optional(),
    interaction: Ref.optional(),
    portableOnly: z.boolean().optional(),
    visibleOnly: z.boolean().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();
export type BenchFindQuery = z.infer<typeof FindQuerySchema>;

/**
 * The reference solver's steps — deterministic operations on the session /
 * world APIs (the learner's op path: `world_action` and `clinical_action`
 * ops, slash commands for delegation and skills, read-only world queries).
 */
export const ReferenceStepSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("observe") }).strict(),
  /** `world.find` (+ interaction / portable filters); `save` keeps the list for `answer {from}`. */
  z.object({ op: z.literal("find"), query: FindQuerySchema, save: Ref.optional() }).strict(),
  z.object({ op: z.literal("inspect"), target: Ref }).strict(),
  /** `submit_answer`: an entity id, or the first entity of a saved `find` (`room`: the room that entity is in). */
  z.object({ op: z.literal("answer"), entity: Ref.optional(), from: Ref.optional(), room: z.boolean().optional() }).strict(),
  z.object({ op: z.literal("navigate"), goal: NavGoalSchema.optional(), target: Ref.optional() }).strict(),
  /** A device / door / cart operation (a reach hint is followed once); `expect`: the refusal code it must fail with. `target` may be `@<saved>` (the first entity of a saved `find`). */
  z.object({ op: z.literal("interact"), target: Ref, operation: Ref, parameters: JsonObject.optional(), goal: NavGoalSchema.optional(), expect: RefusalCode.optional() }).strict(),
  /** A clinical act carried out with the body: satisfy the spatial requirement (walk, fetch a cart), prefer a device operation, verify the engine state. */
  z.object({ op: z.literal("clinical"), action: ClinicalActionSchema }).strict(),
  /** A clinical act attempted where the body stands (no walking): it must be refused with `expect`. */
  z.object({ op: z.literal("attempt"), action: ClinicalActionSchema, expect: RefusalCode }).strict(),
  z.object({ op: z.literal("delegate"), role: Ref, task: Ref, target: Ref.optional(), params: JsonObject.optional() }).strict(),
  z.object({ op: z.literal("skill"), id: Ref, params: JsonObject.optional() }).strict(),
  /** Work the whole case: every step of its reference solution, carried out with the body as `clinical` does. */
  z.object({ op: z.literal("solve-case") }).strict(),
]);
export type ReferenceStep = z.infer<typeof ReferenceStepSchema>;

/** One scripted model tool call (one per model response, replayed in order through the real LLM tool path). */
export const ScriptedCallSchema = z.object({ tool: ToolName, args: JsonObject.optional() }).strict();
export type ScriptedCall = z.infer<typeof ScriptedCallSchema>;

/* ------------------------------------------------------------------ */
/* The scenario                                                        */
/* ------------------------------------------------------------------ */

const ScenarioShape = z
  .object({
    $schema: z.string().optional(),
    schema: z.literal(BENCH_SCENARIO_SCHEMA_ID),
    id: IdSchema,
    /** The suite (= the directory the file lives in). */
    suite: IdSchema,
    category: z.enum(BENCH_CATEGORIES),
    title: LocalizedTextSchema,
    /** The task, as the agent receives it (the scenario locale's text is sent). */
    instruction: LocalizedTextSchema,
    caseId: IdSchema,
    /** Default: the case's own facility. */
    facilityId: IdSchema.optional(),
    locale: z.enum(BENCH_LOCALES),
    /** Base seed; a run's seed is derived from it and the run seed (`--seeds`). */
    seed: z.number().int().min(0).max(2 ** 31 - 1).default(1),
    setup: SetupSchema.default({}),
    /** Tools the model may use (default: the clinician's embodied tool set). */
    allowedTools: z.array(ToolName).min(1).max(64).optional(),
    /** Perception / spatial tasks: the agent answers with `submit_answer {entity_id}`. */
    answer: z.object({ kind: z.literal("entity") }).strict().optional(),
    predicates: z.array(PredicateSchema).min(1).max(32),
    limits: LimitsSchema.default({}),
    reference: z.object({ steps: z.array(ReferenceStepSchema).min(1).max(200) }).strict(),
    scripted: z.object({ plan: z.array(ScriptedCallSchema).max(500), final: LocalizedTextSchema.optional() }).strict(),
    tags: z.array(z.string().min(1).max(40)).max(16).optional(),
  })
  .strict();

/** The scenario schema (structure + cross-field rules). */
export const BenchScenarioSchema = ScenarioShape.superRefine((s, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  const known = new Set(knownToolNames());
  const answers = s.predicates.some((p) => "answerEquals" in p);
  if (answers && !s.answer) issue(["answer"], "an answerEquals predicate needs `answer` (the agent answers with submit_answer)");
  if (s.answer && !answers) issue(["predicates"], "an answer task needs an answerEquals predicate");
  s.predicates.forEach((p, i) => {
    if ("world" in p && p.world.kind === "deviceAtBedside" && (p.world.target === undefined) === (p.world.capability === undefined)) {
      issue(["predicates", i, "world"], "deviceAtBedside takes exactly one of `target` and `capability`");
    }
    if ("toolCalledAtMostTimes" in p && !known.has(p.toolCalledAtMostTimes.tool)) issue(["predicates", i, "toolCalledAtMostTimes", "tool"], `unknown tool "${p.toolCalledAtMostTimes.tool}"`);
    if ("refusedWith" in p && typeof p.refusedWith === "object" && p.refusedWith.tool && !known.has(p.refusedWith.tool)) issue(["predicates", i, "refusedWith", "tool"], `unknown tool "${p.refusedWith.tool}"`);
  });
  (s.allowedTools ?? []).forEach((tool, i) => {
    if (!known.has(tool)) issue(["allowedTools", i], `unknown tool "${tool}"`);
  });
  if (s.allowedTools && s.answer && !s.allowedTools.includes(SUBMIT_ANSWER_TOOL)) issue(["allowedTools"], `an answer task must allow ${SUBMIT_ANSWER_TOOL}`);
  s.scripted.plan.forEach((call, i) => {
    if (!known.has(call.tool)) issue(["scripted", "plan", i, "tool"], `unknown tool "${call.tool}"`);
    else if (call.tool === SUBMIT_ANSWER_TOOL && !s.answer) issue(["scripted", "plan", i, "tool"], `${SUBMIT_ANSWER_TOOL} is offered only in answer tasks`);
    else if (s.allowedTools && !s.allowedTools.includes(call.tool)) issue(["scripted", "plan", i, "tool"], `"${call.tool}" is not in allowedTools`);
  });
  s.reference.steps.forEach((step, i) => {
    if (step.op === "answer" && (step.entity === undefined) === (step.from === undefined)) issue(["reference", "steps", i], "answer takes exactly one of `entity` and `from`");
    if (step.op === "answer" && !s.answer) issue(["reference", "steps", i], "answer steps need an answer task");
    if (step.op === "navigate" && (step.goal === undefined) === (step.target === undefined)) issue(["reference", "steps", i], "navigate takes exactly one of `goal` and `target`");
    if ((step.op === "clinical" || step.op === "attempt") && step.action.type === "start") issue(["reference", "steps", i, "action"], "the runner starts the case");
  });
});

export type BenchScenario = z.infer<typeof ScenarioShape>;

/**
 * The issues that explain a failed union best: those of the branch that
 * recognises the value's keys (a predicate `{ refusedWith: … }` is judged by
 * the `refusedWith` branch, not by the seven others), recursively; among
 * equally plausible branches, the fewest issues, a wrong value before a
 * wrong type.
 */
function explain(issue: z.ZodIssue): z.ZodIssue[] {
  if (issue.code !== "invalid_union") return [issue];
  const branches = issue.unionErrors.map((e) => e.issues);
  const plausible = branches.filter((list) => !list.some((i) => i.code === "unrecognized_keys" || (i.code === "invalid_type" && i.received === "undefined")));
  const score = (list: z.ZodIssue[]) => list.length + (list.every((i) => i.code === "invalid_type") ? 0.5 : 0);
  const best = (plausible.length ? plausible : branches).map((list) => list.flatMap(explain)).sort((a, b) => score(a) - score(b))[0];
  return best?.length ? best : [issue];
}

/** Validate a scenario: the scenario, or readable issues (`path: message`). */
export function parseScenario(value: unknown): { ok: true; scenario: BenchScenario } | { ok: false; issues: string[] } {
  const r = BenchScenarioSchema.safeParse(value);
  if (r.success) return { ok: true, scenario: r.data };
  const line = (i: z.ZodIssue) => {
    const text = `${i.path.join(".") || "(root)"}: ${i.message}`;
    return text.length > 240 ? `${text.slice(0, 239)}…` : text;
  };
  return { ok: false, issues: r.error.issues.flatMap(explain).slice(0, 20).map(line) };
}

/** Does the scenario ask for an answer (`submit_answer`)? */
export function isAnswerTask(s: Pick<BenchScenario, "answer">): boolean {
  return s.answer !== undefined;
}

export type { ClinicalAction, Condition, LocalizedText };
