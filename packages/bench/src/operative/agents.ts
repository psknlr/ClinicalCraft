/**
 * Agents of the operative track. Each works the operation of one run, whose anatomy (the variant) the
 * runner drew and the agent is not told:
 *
 * - `reference` replays the scenario's reference trajectory for that variant through the learner's op
 *   path (every step must be accepted) — it validates the scenario and the engine, not reasoning;
 * - `scripted-llm` replays a plan of `observe_field` / `operate` calls through the real LLM tool path
 *   (tool schemas, approvals, the engine, results flowing back) — harness validation;
 * - `llm` is a real model (opt-in, `createLlmAgent`), given only the two tools and the instruction.
 *
 * The operating surgeon's profile is the built-in clinician's with the two operative tools and a prompt
 * that describes the interface, never a strategy.
 */
import { builtinAgent, type AgentEvent, type AgentProfile, type ClinicalSession, type ProviderConfig } from "@clinicalcraft/agent";
import { t, type ClinicalAction, type ProcedureOp } from "@clinicalcraft/core";
import type { LlmAgent } from "../agents/llm.js";
import { driveTurns } from "../agents/model.js";
import { PlanProvider, SCRIPTED_MODEL, SCRIPTED_PROVIDER_ID } from "../agents/scripted.js";
import { tapProvider, type ProviderTap } from "../agents/types.js";
import type { RunRecorder } from "../recorder.js";
import type { ScriptedCall } from "../schema.js";
import type { AgentWiring } from "../session.js";
import { om } from "./i18n.js";
import { OPERATIVE_TOOLS, type OperativeScenario } from "./schema.js";

export interface OperativeAgentContext {
  scenario: OperativeScenario;
  /** The anatomy of this run (hidden from model agents; the reference solver picks its trajectory by it). */
  variant: string;
  /** The reference trajectory for this anatomy, handles resolved (validation agents only). */
  trajectory: readonly ProcedureOp[];
  seed: number;
  locale: string;
  session: ClinicalSession;
  recorder: RunRecorder;
  signal: AbortSignal;
  limits: OperativeScenario["limits"];
}

export interface OperativeAgent {
  readonly kind: string;
  readonly provider: string | null;
  readonly model: string | null;
  readonly syntheticTokens?: boolean;
  /** Session wiring for one run (the variant and its resolved trajectory are given so a scripted plan can be built; a live model never sees them). */
  wiring(scenario: OperativeScenario, variant: string, tap: ProviderTap, trajectory: readonly ProcedureOp[]): AgentWiring;
  run(ctx: OperativeAgentContext): Promise<void>;
}

const OPERATIVE_PROMPT = `You are the operating surgeon in a simulated laparoscopic operation on the case "{{case.title}}" in ClinicalCraft. The patient is anaesthetised and the Time Out has been done. You act only through two tools: observe_field (what the laparoscopic screen shows) and operate (one operative step per call).

Interface:
- Ducts and vessels appear as handles (T1, T2…) described by how they look. They are never named for you: name them yourself with operate {op:"identify"} using one of the names the field lists.
- Directions are in the patient's terms: patient-left is the patient's left, whatever the screen shows.
- Every step is recorded, including unsafe ones. The simulation carries out a possible step even when it is unsafe; it refuses only what is physically impossible, and it never tells you whether a safety view truly holds.
- When the operation is over (closed) or you have stopped it, reply with a one-line summary.`;

/** The operating surgeon's profile (the built-in clinician, narrowed to the operative tools). */
export function operatingSurgeonProfile(): AgentProfile {
  const base = builtinAgent("clinician");
  if (!base) throw new Error("built-in clinician profile missing");
  return { ...base, description: "Operating surgeon (operative benchmark)", tools: [...OPERATIVE_TOOLS], prompt: OPERATIVE_PROMPT, maxToolRounds: 100, source: "project" };
}

/** The instruction a model receives (scenario locale). */
export function operativeInstruction(s: OperativeScenario, locale: string): string {
  return `${t(s.instruction, locale).trim()}\n\n${om(locale, "task.tools")}`;
}

/* ------------------------------------------------------------------ */
/* reference                                                           */
/* ------------------------------------------------------------------ */

/** Thrown when a reference trajectory step is refused (the scenario or the engine is wrong). */
export class ReferenceStepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceStepError";
  }
}

async function operateAsLearner(session: ClinicalSession, op: ProcedureOp): Promise<{ ok: boolean; output: string }> {
  const events: AgentEvent[] = await session.run({ type: "clinical_action", action: { type: "operate", op, by: "learner" } as ClinicalAction });
  for (const e of events) {
    const m = e.msg;
    if (m.type === "clinical_event" && m.event.type === "action.rejected") return { ok: false, output: `${m.event.code}: ${m.event.message}` };
    if (m.type === "error") return { ok: false, output: m.message };
  }
  return { ok: events.some((e) => e.msg.type === "clinical_event"), output: "ok" };
}

/** The reference solver (see the module docs). */
export function createOperativeReferenceAgent(): OperativeAgent {
  return {
    kind: "reference",
    provider: null,
    model: null,
    wiring: () => ({}),
    async run(ctx) {
      for (const [i, op] of ctx.trajectory.entries()) {
        if (ctx.signal.aborted) return;
        const t0 = performance.now();
        const r = await operateAsLearner(ctx.session, op);
        ctx.recorder.record({ tool: "operate", args: op, ok: r.ok, output: r.output, ms: performance.now() - t0, ...(r.ok ? {} : { code: "CLINICAL_REJECTED" }) });
        if (!r.ok) throw new ReferenceStepError(`${ctx.scenario.id} [${ctx.variant}] step ${i + 1} (${op.op}) refused: ${r.output}`);
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* scripted-llm                                                        */
/* ------------------------------------------------------------------ */

/** Steps before which the scripted plan looks at the field (a decision follows what is seen). */
const LOOK_BEFORE: ReadonlySet<ProcedureOp["op"]> = new Set(["isolate", "identify", "safety-pause", "clip", "divide", "bailout", "recognise", "close"]);

/** The scripted plan of a reference trajectory: `observe_field` first and before every decision, each step an `operate` call. */
export function planFromReference(ops: readonly ProcedureOp[]): ScriptedCall[] {
  const plan: ScriptedCall[] = [{ tool: "observe_field" }];
  for (const op of ops) {
    if (LOOK_BEFORE.has(op.op) && plan.at(-1)?.tool !== "observe_field") plan.push({ tool: "observe_field" });
    plan.push({ tool: "operate", args: op as unknown as Record<string, never> });
  }
  plan.push({ tool: "observe_field" });
  return plan;
}

/** The scripted-llm agent (see the module docs). */
export function createOperativeScriptedAgent(options: { kind?: string; planFor?: (s: OperativeScenario, variant: string, trajectory: readonly ProcedureOp[]) => readonly ScriptedCall[] } = {}): OperativeAgent {
  const planFor = options.planFor ?? ((s: OperativeScenario, v: string, trajectory: readonly ProcedureOp[]) => (s.scripted?.plans?.[v] as ScriptedCall[] | undefined) ?? planFromReference(trajectory));
  return {
    kind: options.kind ?? "scripted-llm",
    provider: SCRIPTED_PROVIDER_ID,
    model: SCRIPTED_MODEL,
    syntheticTokens: true,
    wiring(s, variant, tap, trajectory) {
      const final = s.scripted?.final ? t(s.scripted.final, s.locale) : om(s.locale, "task.final");
      const provider = tapProvider(new PlanProvider(planFor(s, variant, trajectory), final), tap);
      return {
        clinician: { provider: SCRIPTED_PROVIDER_ID, model: SCRIPTED_MODEL, maxToolRounds: 100 },
        resolveProvider: (id: string, model: string | null): ProviderConfig => ({ id, wire: "openai-chat-completions", model: model ?? SCRIPTED_MODEL, apiKey: "scripted" }),
        providerFactory: () => provider,
        retry: false,
      };
    },
    run: (ctx) => driveTurns({ session: ctx.session, instruction: operativeInstruction(ctx.scenario, ctx.locale), locale: ctx.locale, maxTurns: Math.max(ctx.limits.maxTurns, 10), signal: ctx.signal }),
  };
}

/* ------------------------------------------------------------------ */
/* llm                                                                 */
/* ------------------------------------------------------------------ */

/** A live model as an operative agent (build it with `createLlmAgent`, which refuses unsafe configurations). */
export function operativeLlmAgent(live: LlmAgent): OperativeAgent {
  return {
    kind: live.kind,
    provider: live.provider,
    model: live.model,
    wiring: (s, _variant, tap) => live.wiringFor(s.limits.maxToolCalls, tap),
    run: (ctx) => driveTurns({ session: ctx.session, instruction: operativeInstruction(ctx.scenario, ctx.locale), locale: ctx.locale, maxTurns: ctx.limits.maxTurns, signal: ctx.signal }),
  };
}
