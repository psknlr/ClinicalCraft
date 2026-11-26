/**
 * A colleague voiced by a model acts too (docs/EMBODIED.md §8.4): in a turn the learner started by talking to them,
 * a staff agent with a model gets `do_task` — a delegation task done with that colleague's own body, exactly as if
 * the learner had asked in the words `staff-requests.ts` understands: the learner's tool path (`delegate_task`:
 * hooks, the approval gate — a high-risk drug still asks the learner), the colleague's scope of practice, the
 * world's rules. A model never moves a body by saying so: without the tool's `ok`, nothing happened. Not offered
 * in a nested ask (another agent consulting the colleague) nor in clinical mode. A treatment's order is the learner's
 * own words — the clause of their turn that orders it (`orderClause`) —, never the model's paraphrase: a dose the
 * model tidied or left out is not what was ordered (docs/PROTOCOL.md §3.2).
 */
import { rt, type RuntimeKey } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { DELEGATION_TASKS } from "../tools/world.js";
import { resolveIntervention } from "../tools/clinical-resolve.js";
import { orderClause } from "../tools/dose-order.js";
import type { ToolDefinition, ToolOutput } from "../tools/types.js";
import type { Colleague } from "./staff-requests.js";

/**
 * A `give_intervention` task's params with the order as the learner said it (`utterance`, their turn): the clause that
 * orders this treatment — its dose and route checked against the dose prepared — and no dose of the model's own. A
 * refusal when the words order several treatments and none of them alone is this one (one order at a time).
 */
function ownOrder(k: SessionKernel, params: Record<string, unknown>, target: string, utterance: string, locale: string): { params: Record<string, unknown> } | { refusal: ToolOutput } {
  const { dose: _dose, order: _order, ...rest } = params;
  const wanted = typeof params.intervention === "string" && params.intervention ? params.intervention : target;
  const byId = wanted ? resolveIntervention(k.caseDef, { intervention_id: wanted }, locale) : null;
  const r = byId?.kind === "id" ? byId : wanted ? resolveIntervention(k.caseDef, { query: wanted }, locale) : null;
  if (r?.kind !== "id" || !utterance.trim()) return { params: rest };
  const clause = orderClause(k.caseDef, utterance, r.id, locale);
  if (clause == null) return { refusal: { ok: false, output: rt(locale, "req.oneAtATime") } };
  // words that order another treatment are not this one's order
  const named = resolveIntervention(k.caseDef, { query: clause }, locale);
  return { params: named.kind === "id" && named.id !== r.id ? rest : { ...rest, order: clause } };
}

/** The `do_task` tool of one staff turn: tasks done by `who` on the learner's request (submission `id`, their words `utterance`). */
export function staffTaskTool(k: SessionKernel, id: string, who: Colleague, utterance = ""): ToolDefinition<Record<string, unknown>> {
  const task = (args: Record<string, unknown>) => (typeof args.task === "string" ? args.task : "");
  return {
    name: "do_task",
    description:
      "Do a task with your own hands — only when the learner asks you to in this conversation: attach_monitor, record_ecg, obtain_iv_access, fetch_equipment (target: the equipment), give_intervention (params.intervention: the treatment the learner named — the order is the learner's own words, its dose and route checked against the dose prepared and read back when it differs; never add a dose of your own), transport_patient (target: a study device, a bed space or \"home\"), hold_traction (params.port: take the instrument in that port at the operating table and keep its traction), release_traction (let go and hand it back). You walk there and act; your role's scope of practice and the learner's approvals apply. Never say you did something unless this tool returned ok; if it refuses, say why in your own words.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", enum: [...DELEGATION_TASKS] },
        target: { type: "string", maxLength: 120 },
        params: { type: "object" },
      },
      required: ["task"],
      additionalProperties: false,
    },
    readOnly: false,
    sideEffect: "world",
    scope: "workup",
    // the act's own risk is judged where it happens (the delegation's clinical step through the approval gate)
    risk: () => "low",
    summarize: (args, ctx) => rt(ctx.locale, "sum.byStaff", { who: who.name, role: who.actor.role, summary: rt(ctx.locale, `delegate.task.${task(args)}` as RuntimeKey) }),
    async run(args, ctx) {
      const target = typeof args.target === "string" ? args.target : "";
      let params = args.params && typeof args.params === "object" && !Array.isArray(args.params) ? (args.params as Record<string, unknown>) : undefined;
      if (task(args) === "give_intervention") {
        const own = ownOrder(k, params ?? {}, target, utterance, ctx.locale);
        if ("refusal" in own) return own.refusal;
        params = own.params;
      }
      const r = await k.learner.runToolDetailed(id, "delegate_task", { role: who.actor.id, task: task(args), ...(target ? { target } : {}), ...(params ? { params } : {}) }, ctx.signal);
      // reported as `/delegate` reports it (the conversation's outcome line, the HUD's toast)
      k.emit(id, { type: "command_output", name: "delegate", text: r.output.output, data: { ok: r.output.ok, data: r.output.data ?? null } });
      return r.output;
    },
  };
}
