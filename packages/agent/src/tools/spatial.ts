/**
 * Spatial gating of the clinical tools in embodied mode (docs/EMBODIED.md
 * R3, §6). Every clinical tool call maps to a `ClinicalIntent` — free-text
 * queries resolved to item ids first, exactly as the tool resolves them (an
 * unresolved request would otherwise count as "anywhere") — and:
 *
 * 1. `precheck` (before the approval gate, on every tool path: model tool
 *    calls, learner commands, learner `clinical_action` ops, MCP): the
 *    acting body's role must be allowed the act (its clinical authority and
 *    scope of practice, `./scope.ts` — else `NOT_AUTHORIZED`, review S3),
 *    then it must satisfy the requirement (`checkSpatial`) — else a
 *    refusal with code `SPATIAL_REQUIREMENT_UNMET`, the localised reason and
 *    `hint.goal` (pass it to `navigate_to`) in `data`;
 * 2. `run`: immediately before the engine commit (the tool's first
 *    `dispatch`, or `ask` for `ask_patient`) the check runs again with
 *    `recheck` — the body may have moved while an approval was pending —
 *    and a failure refuses with `SPATIAL_PRECONDITION_CHANGED`; nothing is
 *    committed.
 *
 * A failed check never falls back to the non-spatial path. Cognitive tools
 * (decisions, phases, waiting, the plan, status, finishing) and `consult`
 * (phone/pager) are not gated.
 */
import type { ClinicalAction } from "@clinicalcraft/core";
import { roleName, type ActorId, type ClinicalIntent, type SpatialCheck } from "@clinicalcraft/world";
import { rt } from "../session/i18n.js";
import { resolveFinding, resolveIntervention, resolveInvestigation, strArg } from "./clinical.js";
import { checkClinicalScope, type ScopeActor, type ScopeRefusal } from "./scope.js";
import type { ToolContext, ToolDefinition, ToolOutput, VitalsView } from "./types.js";
import { hintLines } from "./world-format.js";

/** Clinical tools held to the spatial policy (EMBODIED §6). */
export const SPATIALLY_GATED_TOOLS: readonly string[] = ["ask_patient", "examine", "check_vitals", "order_test", "read_result", "intervene"];

/** Stable codes of spatial refusals. */
export const SPATIAL_CODES = ["SPATIAL_REQUIREMENT_UNMET", "SPATIAL_PRECONDITION_CHANGED"] as const;

/**
 * The `ClinicalIntent` of a clinical tool call (null: not spatially gated).
 * Queries resolve as the tool resolves them; an unresolved item leaves the id
 * out (the policy then asks for nothing but what the tool kind needs).
 */
export function clinicalIntent(tool: string, args: Record<string, unknown>, ctx: Pick<ToolContext, "caseDef" | "locale" | "state">): ClinicalIntent | null {
  const c = ctx.caseDef;
  const L = ctx.locale;
  switch (tool) {
    case "ask_patient":
      return { tool, kind: "ask" };
    case "check_vitals":
      return { tool, kind: "vitals" };
    case "examine": {
      const r = resolveFinding(c, args, L, ctx.state().phase);
      return r.kind === "id" ? { tool, kind: "examine", findingId: r.id, itemId: r.id } : { tool, kind: "examine" };
    }
    case "order_test":
    case "read_result": {
      const r = resolveInvestigation(c, args, L);
      const kind = tool === "order_test" ? "order" : "read";
      return r.kind === "id" ? { tool, kind, investigationId: r.id, itemId: r.id } : { tool, kind };
    }
    case "intervene": {
      const r = resolveIntervention(c, args, L);
      return r.kind === "id" ? { tool, kind: "intervene", interventionId: r.id, itemId: r.id } : { tool, kind: "intervene" };
    }
    case "consult":
      return { tool, kind: "consult", agent: strArg(args, "role") };
    default:
      return null;
  }
}

/** The `ClinicalIntent` of a learner `clinical_action` (null: not spatially gated). */
export function actionIntent(action: ClinicalAction): ClinicalIntent | null {
  switch (action.type) {
    case "ask":
      return { tool: "ask_patient", kind: "ask", itemId: action.itemId };
    case "examine":
      return { tool: "examine", kind: "examine", findingId: action.findingId, itemId: action.findingId };
    case "order":
      return { tool: "order_test", kind: "order", investigationId: action.investigationId, itemId: action.investigationId };
    case "read":
      return { tool: "read_result", kind: "read", investigationId: action.investigationId, itemId: action.investigationId };
    case "intervene":
      return { tool: "intervene", kind: "intervene", interventionId: action.interventionId, itemId: action.interventionId };
    default:
      return null;
  }
}

/** The refusal of a failed spatial check, as a tool output (`data.code`, `data.hint.goal`…). */
export function spatialRefusal(check: Extract<SpatialCheck, { ok: false }>, locale: string): ToolOutput {
  const lead = rt(locale, check.code === "SPATIAL_PRECONDITION_CHANGED" ? "spatial.changed" : "spatial.refused", { message: check.message });
  const next = check.hint ? hintLines(check.hint, locale).join("\n") : rt(locale, "spatial.noHint");
  return {
    ok: false,
    output: `${lead}\n${next}`,
    data: { code: check.code, reason: check.reason, message: check.message, requirement: check.requirement, hint: check.hint, ...(check.details ? { details: check.details } : {}) },
  };
}

/** The refusal of an act outside the acting body's role (`data.code` `NOT_AUTHORIZED`, review S3). */
export function scopeRefusal(check: ScopeRefusal): ToolOutput {
  return { ok: false, output: check.message, data: { code: check.code, reason: check.reason, message: check.message } };
}

/** The spatial code of a tool output, if it is a spatial refusal. */
export function spatialCodeOf(out: ToolOutput | null | undefined): (typeof SPATIAL_CODES)[number] | null {
  const code = (out?.data as { code?: unknown } | undefined)?.code;
  return typeof code === "string" && (SPATIAL_CODES as readonly string[]).includes(code) ? (code as (typeof SPATIAL_CODES)[number]) : null;
}

/** What the gate needs from the embodied session. */
export interface SpatialGate {
  /** The body acting for a call (`ctx.actorId`, else the learner's avatar). */
  actorOf(ctx: ToolContext): ActorId;
  /** `checkSpatial` of the world (`recheck`: the second check right before the engine commit). */
  check(actorId: ActorId, intent: ClinicalIntent, recheck: boolean): SpatialCheck;
  /**
   * Record a direct clinical tool call (not a world operation's clinical effect, which the world records itself)
   * as `clinical_action` / `state_change` spans around `run`.
   */
  traced?(actorId: ActorId, tool: string, args: Record<string, unknown>, run: () => Promise<ToolOutput>): Promise<ToolOutput>;
  /** Does a device at the bedside show the heart rhythm (`check_vitals` shows none without one)? */
  rhythm?(): boolean;
  /**
   * The role and name of a body other than the learner's avatar (a staff member), for its scope of practice and
   * the approval summary; null for the learner's avatar (a clinician: every act).
   */
  staff?(actorId: ActorId, locale: string): ScopeActor | null;
  /** The vitals a body can see now (review G11): `wait` reports only these. */
  vitals?(actorId: ActorId): VitalsView;
}

/** `wait` in embodied mode: its closing vitals line only shows what the acting body can see (review G11). */
export function vitalsGated<A extends Record<string, unknown>>(tool: ToolDefinition<A>, gate: SpatialGate): ToolDefinition<A> {
  if (!gate.vitals) return tool;
  return { ...tool, run: (args, ctx) => tool.run(args, { ...ctx, vitalsView: () => gate.vitals!(gate.actorOf(ctx)) }) };
}

const roleLabel = (role: string, locale: string) => roleName(role, locale);

/** Thrown inside a gated run when the re-check fails: nothing was committed. */
class SpatialAbort extends Error {
  constructor(readonly check: Extract<SpatialCheck, { ok: false }>) {
    super(check.message);
  }
}

/**
 * A clinical tool held to the spatial policy (see the module docs). Other
 * members (schema, risk, summary, specifier…) are the tool's own, so the
 * approval gate and deny rules see exactly the same call.
 */
export function spatiallyGated<A extends Record<string, unknown>>(tool: ToolDefinition<A>, gate: SpatialGate): ToolDefinition<A> {
  return {
    ...tool,
    // The approval names the staff member who would act (review S3).
    summarize(args, ctx) {
      const summary = tool.summarize(args, ctx);
      const who = gate.staff?.(gate.actorOf(ctx), ctx.locale);
      return who ? rt(ctx.locale, "sum.byStaff", { who: who.name || who.role, role: roleLabel(who.role, ctx.locale), summary }) : summary;
    },
    precheck(args, ctx) {
      const early = tool.precheck?.(args, ctx);
      if (early) return early;
      const intent = clinicalIntent(tool.name, args, ctx);
      if (!intent) return null;
      const actorId = gate.actorOf(ctx);
      // A body may only do what its role may (authority, scope of practice): refused before anyone is asked.
      const who = gate.staff?.(actorId, ctx.locale);
      if (who) {
        const scoped = checkClinicalScope(who, tool.name, intent.itemId ?? null, ctx.caseDef, ctx.locale);
        if (!scoped.ok) return scopeRefusal(scoped);
      }
      const check = gate.check(actorId, intent, false);
      return check.ok ? null : spatialRefusal(check, ctx.locale);
    },
    async run(args, ctx) {
      const intent = clinicalIntent(tool.name, args, ctx);
      if (!intent) return tool.run(args, ctx);
      const actor = gate.actorOf(ctx);
      let armed = true;
      const guard = () => {
        if (!armed) return;
        armed = false;
        const check = gate.check(actor, intent, true);
        if (!check.ok) throw new SpatialAbort(check);
      };
      const gated: ToolContext = {
        ...ctx,
        ...(gate.rhythm ? { bedsideRhythm: () => gate.rhythm!() } : {}),
        dispatch: (action) => {
          guard();
          return ctx.dispatch(action);
        },
        ask: async (agent, utterance, signal) => {
          guard();
          return ctx.ask(agent, utterance, signal);
        },
      };
      const run = async (): Promise<ToolOutput> => {
        try {
          return await tool.run(args, gated);
        } catch (err) {
          if (err instanceof SpatialAbort) return spatialRefusal(err.check, ctx.locale);
          throw err;
        }
      };
      // A world operation's clinical effect is traced by the world (interaction → clinical_action → state_change).
      return gate.traced && !ctx.worldActionId ? gate.traced(actor, tool.name, args as Record<string, unknown>, run) : run();
    },
  };
}
