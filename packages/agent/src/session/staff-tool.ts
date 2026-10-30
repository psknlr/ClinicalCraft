/**
 * A colleague voiced by a model acts too (docs/EMBODIED.md §8.4): in a turn the learner started by talking to them,
 * a staff agent with a model gets `do_task` — a delegation task done with that colleague's own body, exactly as if
 * the learner had asked in the words `staff-requests.ts` understands: the learner's tool path (`delegate_task`:
 * hooks, the approval gate — a high-risk drug still asks the learner), the colleague's scope of practice, the
 * world's rules. A model never moves a body by saying so: without the tool's `ok`, nothing happened. Not offered
 * in a nested ask (another agent consulting the colleague) nor in clinical mode.
 */
import { rt, type RuntimeKey } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import { DELEGATION_TASKS } from "../tools/world.js";
import type { ToolDefinition } from "../tools/types.js";
import type { Colleague } from "./staff-requests.js";

/** The `do_task` tool of one staff turn: tasks done by `who` on the learner's request (submission `id`). */
export function staffTaskTool(k: SessionKernel, id: string, who: Colleague): ToolDefinition<Record<string, unknown>> {
  const task = (args: Record<string, unknown>) => (typeof args.task === "string" ? args.task : "");
  return {
    name: "do_task",
    description:
      "Do a task with your own hands — only when the learner asks you to in this conversation: attach_monitor, record_ecg, obtain_iv_access, fetch_equipment (target: the equipment), give_intervention (params.intervention: the treatment the learner named), transport_patient (target: a study device, a bed space or \"home\"). You walk there and act; your role's scope of practice and the learner's approvals apply. Never say you did something unless this tool returned ok; if it refuses, say why in your own words.",
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
      const r = await k.learner.runToolDetailed(id, "delegate_task", { role: who.actor.id, task: task(args), ...(typeof args.target === "string" ? { target: args.target } : {}), ...(args.params && typeof args.params === "object" ? { params: args.params } : {}) }, ctx.signal);
      // reported as `/delegate` reports it (the conversation's outcome line, the HUD's toast)
      k.emit(id, { type: "command_output", name: "delegate", text: r.output.output, data: { ok: r.output.ok, data: r.output.data ?? null } });
      return r.output;
    },
  };
}
