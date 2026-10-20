/**
 * How a session's embodied mode is wired to it (docs/EMBODIED.md R3, §2): the `EmbodiedHost` the session hands
 * to `EmbodiedSession` (engine state and dispatch, settings, clock and ids, events and `world` transcript
 * snapshots, skills), and `runToolAs` — the tool path a world operation's clinical effect, a skill step or a
 * delegated staff member's act runs through: the learner's own tool path, or a model agent's `executeToolCall`
 * (its allow-list, hooks and approval gate), with the acting body. Never a shortcut.
 */
import type { ActorId } from "@clinicalcraft/world";
import { clockLabel } from "../agents/prompts.js";
import { executeToolCall } from "../loop.js";
import type { SkillToolCall } from "../skills/interpreter.js";
import { isLearnerTool } from "../tools/learner.js";
import type { ClinicalCaller, EmbodiedHost } from "./embodied.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";
import type { ToolPathExtra } from "./tool-path.js";

/** What the embodied mode needs from its session. */
export function embodiedHost(k: SessionKernel): EmbodiedHost {
  return {
    sessionId: k.id,
    caseDef: k.caseDef,
    facility: k.facility,
    catalogs: k.catalogs,
    locale: () => k.locale,
    state: () => k.state,
    settings: () => k.settings,
    now: () => k.now(),
    newId: () => k.newId(),
    dispatch: (action) => k.dispatch(action, k.currentSubmission),
    runTool: (caller, tool, args, extra) => runToolAs(k, caller, tool, args, extra),
    tool: (name) => k.registry.get(name),
    emit: (msg, submission) => k.emit(submission ?? k.currentSubmission, msg),
    recordWorld: (snapshot) => void k.recorder?.record("world", { snapshot }),
    clockText: () => clockLabel(k.caseDef, k.state.clock, k.locale),
    skills: () => k.skillList,
  };
}

/**
 * Run a tool through a caller's tool path with an acting body (embodied mode: world operations' clinical
 * effects, skill steps, delegated staff): the learner's (`runTool`) or a model agent's
 * (`executeToolCall` with its allow-list, hooks and approval gate). Never a shortcut.
 */
async function runToolAs(k: SessionKernel, caller: ClinicalCaller, tool: string, args: Record<string, unknown>, extra: ToolPathExtra & { actorId: ActorId }): Promise<SkillToolCall> {
  const id = caller.submission ?? k.currentSubmission;
  const signal = caller.signal ?? k.ops.activeSignal;
  // A skill or delegated step is a learner tool whoever the caller is (review S2): checked before anything else.
  if (!isLearnerTool(tool)) return { ok: false, output: { ok: false, output: rt(k.locale, "tool.notLearnerTool", { tool }), data: { code: "NOT_A_LEARNER_TOOL" } }, status: "invalid" };
  if (caller.agent === "learner") {
    const r = await k.learner.runToolDetailed(id, tool, args, signal, extra);
    return { ok: r.output.ok && r.status === "ok", output: r.output, status: r.status };
  }
  const agent = String(caller.agent);
  const turnId = caller.turnId ?? k.newId();
  const outcome = await executeToolCall({
    host: k.tools.loopHost(id),
    agent,
    tools: k.toolsFor(agent),
    call: { id: k.newId(), name: tool, args },
    ctx: k.tools.context(agent, id, signal, { ...extra, turnId }),
    emit: (msg) => k.emit(id, msg),
    turnId,
    ...(signal ? { signal } : {}),
    now: k.now,
  });
  return { ok: outcome.status === "ok" && outcome.output.ok, output: outcome.output, status: outcome.status };
}
