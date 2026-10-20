/**
 * Tool contracts. Every learner/agent capability — talking, examining,
 * ordering, treating, consulting — is a typed tool with a JSON schema, a
 * risk classifier and a side-effect declaration (Claude Code tool registry ×
 * ZCode tool permission spec). The same registry backs the LLM agents, the
 * REPL slash commands, the web UI and the MCP server.
 */
import type { CaseDefinition, ClinicalAction, FacilityDefinition, EquipmentCatalog, ReduceResult, SessionState, VitalsSnapshot } from "@clinicalcraft/core";
import type { AgentRole, PlanItem, PracticeScope, RiskLevel } from "../protocol.js";
import type { ToolSpec } from "../providers/types.js";

/**
 * A caller's memory of what earlier attempts of the SAME call did (review S1): the MCP two-step confirmation
 * repeats a refused call, and a multi-step call (a skill) must not do its clinical acts again — `done` holds
 * them by step id (`skills/interpreter.ts` `SkillProgress`).
 */
export interface CallProgress {
  readonly done: Map<string, { ok: boolean; data: unknown; output: string }>;
  /** Key prefix of a nested skill's steps (`<step id>/`), so a skill run by a skill keeps its own record. */
  readonly prefix?: string;
}

/**
 * The bedside vitals as the learner may see them now (reviews G3/G11): the learner's view of the snapshot
 * (`learnerVitals`), or — in embodied mode, where no monitor screen, hands at the patient or a records terminal is
 * within the acting body's reach (`checkSpatial` vitals) — nothing, with the reason.
 */
export type VitalsView = { inView: true; snapshot: VitalsSnapshot } | { inView: false; reason: string; message: string };

/** What a tool changes; `world`: the embodied world (bodies, devices, doors, carts — docs/EMBODIED.md §5). */
export type SideEffect = "none" | "conversation" | "record" | "patient" | "clock" | "world";

export interface ToolContext {
  readonly caseDef: CaseDefinition;
  readonly facility: FacilityDefinition | null;
  readonly catalogs: EquipmentCatalog[];
  readonly locale: string;
  readonly agent: AgentRole | "learner";
  /** Current engine state (read-only snapshot). */
  state(): SessionState;
  /** Apply a clinical action through the engine; emits clinical_event/state_snapshot events. */
  dispatch(action: ClinicalAction): ReduceResult;
  /** Run another agent (patient, nurse, consultant…) and return its final text. */
  ask(agent: AgentRole, utterance: string, signal?: AbortSignal): Promise<{ text: string; grounded: string[] }>;
  /** Publish a workup/differential plan (Codex update_plan / Claude Code TodoWrite analogue). */
  updatePlan(plan: PlanItem[], explanation?: string): void;
  /** Ask the front-end to execute a world action (walk_to, use_equipment). Resolves with its output. */
  dynamicTool?(tool: string, args: unknown, signal?: AbortSignal): Promise<{ ok: boolean; output: string }>;
  readonly signal?: AbortSignal;
  /**
   * Embodied mode: the body acting for this call (`actor:clinician`, `staff:<id>`…). Absent: the learner's and the
   * clinician's calls act with `actor:clinician`. Spatial gates measure from this body (docs/EMBODIED.md §6).
   */
  readonly actorId?: string;
  /** The model turn this call belongs to (set by `executeToolCall`; nested tool calls reuse it). */
  readonly turnId?: string;
  /** Embodied mode: the world action whose clinical effect this call carries out (its spans are recorded by the world). */
  readonly worldActionId?: string;
  /**
   * Embodied mode: does a device at the bedside show the heart rhythm (a monitor, an ECG machine, a defibrillator —
   * the world's `rhythmAtBedside`)? False: `check_vitals` reports no rhythm (observations by hand or the chart, EMBODIED §6).
   */
  readonly bedsideRhythm?: () => boolean;
  /**
   * Embodied mode: how many skills this call runs inside (a skill's step: 1). `execute_skill` and `delegate_task`
   * refuse beyond one level of nesting (review C10).
   */
  readonly skillDepth?: number;
  /** See `CallProgress` (set by a front-end that repeats a refused call: the MCP bridge). */
  readonly progress?: CallProgress;
  /** Embodied mode: the vitals the acting body can see now (`wait` reports only these — review G11). */
  readonly vitalsView?: () => VitalsView;
}

export interface ToolOutput {
  ok: boolean;
  /** What the model sees (concise, localised). */
  output: string;
  /** Typed payload for UIs. */
  data?: unknown;
  /** Images for the model (camera frames): tool_result image blocks (Anthropic) or a follow-up user message (OpenAI-compatible). */
  images?: { mediaType: string; data: string }[];
}

export interface ToolDefinition<A = Record<string, unknown>> {
  name: string;
  /** Model-facing description (English; agents answer in the session locale). */
  description: string;
  inputSchema: Record<string, unknown>;
  /** Read-only tools never need approval and may run in parallel. */
  readOnly: boolean;
  sideEffect: SideEffect;
  /** Minimum practice scope in which the tool is registered at all. */
  scope: PracticeScope;
  /** Risk of this particular call (e.g. intervene → the intervention's declared risk). */
  risk(args: A, ctx: ToolContext): RiskLevel;
  /** Always ask, even in auto/bypass-less modes (irreversible interventions); "approve for session" not offered. */
  alwaysAsk?(args: A, ctx: ToolContext): boolean;
  /** Short localised summary for approval dialogs and transcripts. */
  summarize(args: A, ctx: ToolContext): string;
  /** Rule specifier used by permission rules: `tool(specifier)`, e.g. intervention id. */
  specifier?(args: A, ctx: ToolContext): string;
  /**
   * Every thing the call acts on, for rules (review S6) — when there is more than one (`navigate_to` with a
   * composite goal: each leaf) or one thing has several names (`eq:resus1-ecg` and `resus1-ecg`). One inner list
   * per thing, its spellings — canonical first. A deny or ask rule applies when it matches any spelling of any
   * thing; an allow (or session) rule only when every thing has a spelling it matches. Default: `[[specifier]]`.
   */
  specifiers?(args: A, ctx: ToolContext): string[][];
  /**
   * A refusal decided before the approval gate, for a call that cannot run
   * and whose approval prompt would reveal something the caller has not
   * earned (e.g. `answer_decision` on a locked decision: no prompt, no
   * options). Returns the refusal output, or null to go on. Every tool path
   * (model tool calls, learner commands and actions, MCP) calls it after
   * PreToolUse hooks and before the gate. Never changes state.
   */
  precheck?(args: A, ctx: ToolContext): ToolOutput | null;
  run(args: A, ctx: ToolContext): Promise<ToolOutput>;
}

export function toToolSpec(tool: ToolDefinition<any>): ToolSpec {
  return { name: tool.name, description: tool.description, inputSchema: tool.inputSchema };
}

/** Outcome of the approval gate (ZCode-style stable rule ids for auditing). */
export interface PermissionCheck {
  decision: "allow" | "ask" | "deny";
  ruleId: string;
  reason: string;
  risk: RiskLevel;
  allowSession: boolean;
}
