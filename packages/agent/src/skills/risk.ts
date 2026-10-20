/**
 * What a skill can do (review S8): `execute_skill`'s risk and always-ask
 * come from the most dangerous act its steps can perform — a drug given
 * directly or by a device, a test ordered, a delegated treatment, a nested
 * skill — never from the skill's own declared `safety` (which can only
 * raise them: `high-risk` asks always). An act the gate cannot know before
 * the step runs (an item or a device taken from an earlier step's output)
 * counts as high risk and always asks. The approval summary lists the steps.
 *
 * Pure over the session's tool definitions, the case and the world (read
 * only): it never runs a step.
 */
import { t, type CaseDefinition } from "@clinicalcraft/core";
import { behaviorOf, ivAccessIntervention, monitoringIntervention, selectClinical, type WorldRuntime } from "@clinicalcraft/world";
import type { RiskLevel } from "../protocol.js";
import { rt } from "../session/i18n.js";
import type { ToolContext, ToolDefinition } from "../tools/types.js";
import { resolveSkillParams } from "./interpreter.js";
import { findSkill, parseSkill, type SkillDefinition } from "./schema.js";

/** What the assessment reads (all read-only). */
export interface SkillRiskHost {
  readonly caseDef: CaseDefinition;
  /** The session's definition of a tool (the gated clinical tools, the world tools). */
  tool(name: string): ToolDefinition<any> | undefined;
  /** The context the gate computes risks in (the caller's). */
  readonly ctx: ToolContext;
  skills(): readonly SkillDefinition[];
  world(): WorldRuntime;
  resolveEntity(alias: string): string | null;
  patientId(): string | null;
  patientMonitorId(): string | null;
}

export interface SkillAssessment {
  risk: RiskLevel;
  alwaysAsk: boolean;
  /** One line per step: "navigate_to: Walk to Liu Zhenhua (pseudonym)", "intervene: Give Ticagrelor loading dose?". */
  steps: string[];
}

const ORDER: Record<RiskLevel, number> = { none: 0, low: 1, moderate: 2, high: 3 };
const higher = (a: RiskLevel, b: RiskLevel): RiskLevel => (ORDER[b] > ORDER[a] ? b : a);
const UNKNOWN = { risk: "high" as RiskLevel, alwaysAsk: true };
const NONE = { risk: "none" as RiskLevel, alwaysAsk: false };
/** Deepest nesting assessed (beyond it: unknown, high). */
const MAX_DEPTH = 2;
/** Operations of built-in behaviours that may carry a clinical effect (an unknown target with one: high). */
const CLINICAL_OPERATIONS = new Set(["attach", "record", "use", "order", "read"]);

const isTemplated = (value: unknown): boolean => JSON.stringify(value ?? null).includes("${");
const str = (value: unknown): string => (typeof value === "string" ? value : "");

/** Fill in `${param}` placeholders only (an earlier step's output stays a template: unknown until it runs). */
function withParams(value: unknown, params: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    const exact = /^\$\{([^}.]+)\}$/.exec(value);
    if (exact && exact[1]!.trim() in params) return params[exact[1]!.trim()];
    return value.replace(/\$\{([^}.]+)\}/g, (m, ref: string) => (ref.trim() in params ? String(params[ref.trim()]) : m));
  }
  if (Array.isArray(value)) return value.map((v) => withParams(v, params));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withParams(v, params)]));
  return value;
}

/** The risk of one call of a session tool (a failing classifier: high, as the gate rates it). */
function callRisk(host: SkillRiskHost, tool: string, args: Record<string, unknown>): { risk: RiskLevel; alwaysAsk: boolean } {
  const def = host.tool(tool);
  if (!def) return NONE; // not a tool of this session: the step is refused when it runs
  try {
    return { risk: def.risk(args, host.ctx), alwaysAsk: def.alwaysAsk?.(args, host.ctx) ?? false };
  } catch {
    return UNKNOWN;
  }
}

/** A clinical act on a case item (intervene / order_test) — unknown item: high. */
function itemRisk(host: SkillRiskHost, tool: "intervene" | "order_test", item: unknown): { risk: RiskLevel; alwaysAsk: boolean } {
  if (typeof item !== "string" || !item || isTemplated(item)) return UNKNOWN;
  return callRisk(host, tool, tool === "intervene" ? { intervention_id: item } : { investigation_id: item });
}

function stepRisk(host: SkillRiskHost, tool: string, args: Record<string, unknown>, depth: number): { risk: RiskLevel; alwaysAsk: boolean } {
  const c = host.caseDef;
  switch (tool) {
    case "intervene":
    case "order_test": {
      const item = tool === "intervene" ? args.intervention_id ?? args.query : args.investigation_id ?? args.query;
      return item === undefined ? callRisk(host, tool, args) : itemRisk(host, tool, item);
    }
    case "interact_object": {
      const parameters = (args.parameters && typeof args.parameters === "object" ? args.parameters : {}) as Record<string, unknown>;
      if (parameters.intervention !== undefined) return itemRisk(host, "intervene", parameters.intervention);
      if (parameters.investigation !== undefined || parameters.investigation_id !== undefined) return itemRisk(host, "order_test", parameters.investigation ?? parameters.investigation_id);
      const operation = str(args.operation);
      if (isTemplated(args.target) || isTemplated(operation)) return CLINICAL_OPERATIONS.has(operation) || isTemplated(operation) ? UNKNOWN : NONE;
      const id = host.resolveEntity(str(args.target));
      const entity = id ? host.world().entity(id) : null;
      const op = entity?.kind === "equipment" ? behaviorOf(entity).operations.find((o) => o.id === operation) : undefined;
      if (!op || !(op.clinical || op.toolByParam)) return NONE;
      const sel = selectClinical({ effect: op.clinical ?? { tool: "order_test", select: "param" }, toolByParam: op.toolByParam, caps: entity!.capabilities, match: op.toolByParam ? "intersect" : "subset", parameters, caseDef: c, locale: host.ctx.locale, target: id! });
      if (!sel.ok) return NONE; // the operation is refused when it runs
      return callRisk(host, sel.value.tool, sel.value.args);
    }
    case "delegate_task": {
      const params = (args.params && typeof args.params === "object" ? args.params : {}) as Record<string, unknown>;
      const own = callRisk(host, tool, args);
      const task = str(args.task);
      let act = NONE;
      if (task === "give_intervention") act = itemRisk(host, "intervene", params.intervention ?? args.target);
      else if (task === "obtain_iv_access") act = itemRisk(host, "intervene", ivAccessIntervention(c));
      else if (task === "attach_monitor") act = itemRisk(host, "intervene", monitoringIntervention(c, ["cardiac-monitor"]));
      else if (task === "record_ecg") {
        const wanted = params.investigation ?? args.target ?? c.investigations.find((i) => i.requires.length > 0 && i.requires.every((x) => x === "ecg-12lead"))?.id;
        act = wanted === undefined ? NONE : itemRisk(host, "order_test", wanted);
      } else if (isTemplated(task)) act = UNKNOWN;
      return { risk: higher(own.risk, act.risk), alwaysAsk: own.alwaysAsk || act.alwaysAsk };
    }
    case "execute_skill": {
      if (depth + 1 > MAX_DEPTH) return UNKNOWN;
      let nested: SkillDefinition | null = null;
      if (args.skill !== undefined) {
        const parsed = parseSkill(args.skill);
        nested = parsed.ok ? parsed.skill : null;
        if (!nested) return NONE; // refused as invalid when it runs
      } else {
        const id = str(args.skill_id);
        if (isTemplated(id)) return UNKNOWN;
        nested = findSkill(host.skills(), id) ?? null;
        if (!nested) return NONE; // unknown: refused when it runs
      }
      // Parameters taken from an earlier step's output: what it will do is unknown until it runs.
      if (isTemplated(args.params)) return UNKNOWN;
      const a = assessSkillAt(host, nested, (args.params && typeof args.params === "object" ? args.params : {}) as Record<string, unknown>, depth + 1);
      return { risk: a.risk, alwaysAsk: a.alwaysAsk };
    }
    default:
      return callRisk(host, tool, args);
  }
}

/** One line describing a step for the approval summary. */
function stepLine(host: SkillRiskHost, n: number, tool: string, args: Record<string, unknown>): string {
  let what = "";
  if (tool === "execute_skill") {
    // The nested skill by id — never its own summary, which would assess it again without bound (C10).
    const inner = args.skill && typeof args.skill === "object" ? (args.skill as { id?: unknown }).id : args.skill_id;
    what = typeof inner === "string" ? inner.slice(0, 80) : "";
  } else if (!isTemplated(args)) {
    try {
      what = host.tool(tool)?.summarize(args, host.ctx) ?? "";
    } catch {
      what = "";
    }
  }
  if (!what) {
    const json = JSON.stringify(args);
    what = json.length > 100 ? `${json.slice(0, 97)}…` : json;
  }
  return `${n}. ${tool}: ${what}`;
}

function assessSkillAt(host: SkillRiskHost, skill: SkillDefinition, rawParams: Record<string, unknown>, depth: number): SkillAssessment {
  const resolved = resolveSkillParams(skill, rawParams, {
    caseDef: host.caseDef,
    locale: host.ctx.locale,
    patientId: () => host.patientId(),
    patientMonitorId: () => host.patientMonitorId(),
    resolveEntity: (alias) => host.resolveEntity(alias),
    state: () => host.ctx.state(),
  });
  const steps: string[] = [];
  // Parameters that do not resolve: the run refuses them before any step — nothing to approve.
  if (!resolved.ok) {
    skill.steps.forEach((step, i) => steps.push(stepLine(host, i + 1, step.tool, (step.args ?? {}) as Record<string, unknown>)));
    return { ...NONE, steps };
  }
  const params = resolved.params;
  let risk: RiskLevel = skill.safety === "high-risk" ? "high" : "none";
  let alwaysAsk = skill.safety === "high-risk";
  skill.steps.forEach((step, i) => {
    const args = withParams(step.args ?? {}, params) as Record<string, unknown>;
    const r = stepRisk(host, step.tool, args, depth);
    risk = higher(risk, r.risk);
    alwaysAsk ||= r.alwaysAsk;
    steps.push(stepLine(host, i + 1, step.tool, args));
  });
  return { risk, alwaysAsk, steps };
}

/** The risk, always-ask and step list of running `skill` with `params` (see the module docs). */
export function assessSkill(host: SkillRiskHost, skill: SkillDefinition, params: Record<string, unknown>): SkillAssessment {
  return assessSkillAt(host, skill, params, 0);
}

/** The approval summary of `execute_skill`: the skill's name and its steps. */
export function skillSummary(locale: string, skill: SkillDefinition, assessment: SkillAssessment): string {
  return rt(locale, "sum.skillSteps", { skill: t(skill.name, locale), steps: assessment.steps.join("; ") });
}

/**
 * The rule specifier of an inline skill: `inline:<digest>` of its canonical JSON (an "approve for session" covers
 * that very skill, never another inline one — review S8). FNV-1a, 8 hex digits (isomorphic, not a security hash:
 * the gate still asks for every inner act).
 */
export function inlineSkillSpecifier(skill: unknown): string {
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
    return JSON.stringify(value) ?? "null";
  };
  let h = 0x811c9dc5;
  for (const ch of canonical(skill)) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `inline:${h.toString(16).padStart(8, "0")}`;
}
