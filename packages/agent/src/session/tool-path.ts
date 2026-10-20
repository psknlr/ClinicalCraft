/**
 * How every agent's tool calls reach the session: the `ToolContext` a tool runs with (engine dispatch, nested
 * asks to other agents — bounded by `MAX_NESTED_ASKS` and kept in the examiner's dialogue —, the workup plan,
 * the front-end's dynamic tools such as `walk_to`) and the `LoopHost` of the generic tool loop (the approval
 * gate, hooks that an interrupt cancels). Dynamic tool calls wait for the front-end's `dynamic_tool_response`.
 */
import { npcDisplayName } from "../agents/prompts.js";
import type { LoopHost } from "../loop.js";
import type { AgentRole } from "../protocol.js";
import type { CallProgress, ToolContext } from "../tools/types.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";

/** Maximum nesting of agent-to-agent asks (clinician → patient, consultant → …). */
export const MAX_NESTED_ASKS = 3;

/** What a tool path call carries beyond the caller (embodied mode): the acting body, the world action, the skill nesting. */
export interface ToolPathExtra {
  actorId?: string;
  worldActionId?: string;
  skillDepth?: number;
  /** A nested skill's share of its caller's `CallProgress` (review S1). */
  progress?: CallProgress;
}

/** A dynamic tool's answer (`dynamic_tool_response`). */
type DynamicResult = { ok: boolean; output: string };

/** The tool path shared by every agent of one session. */
export class ToolPath {
  private readonly pendingDynamic = new Map<string, (r: DynamicResult) => void>();
  private askDepth = 0;

  constructor(private readonly k: SessionKernel) {}

  /** The context a tool runs with for `agent` within submission `id`. */
  context(agent: AgentRole | "learner", id: string, signal?: AbortSignal, extra: ToolPathExtra & { turnId?: string } = {}): ToolContext {
    const k = this.k;
    const dynamic = k.registry.has("walk_to");
    return {
      ...(extra.actorId ? { actorId: extra.actorId } : {}),
      ...(extra.worldActionId ? { worldActionId: extra.worldActionId } : {}),
      ...(extra.turnId ? { turnId: extra.turnId } : {}),
      ...(extra.skillDepth ? { skillDepth: extra.skillDepth } : {}),
      ...(extra.progress ? { progress: extra.progress } : {}),
      caseDef: k.caseDef,
      facility: k.facility,
      catalogs: k.catalogs,
      locale: k.locale,
      agent,
      state: () => k.state,
      dispatch: (action) => k.dispatch(action, id),
      ask: async (target, utterance, sig) => {
        if (this.askDepth >= MAX_NESTED_ASKS) return { text: rt(k.locale, "tool.nestedLimit", { agent: target }), grounded: [] };
        // The examiner judges the encounter from this dialogue: keep the asker's words with the reply.
        if (utterance.trim()) {
          const who = agent === "learner" ? "learner" : String(agent);
          const speaker = agent === "learner" ? "learner" : npcDisplayName(k.caseDef, k.facility, String(agent), k.locale);
          k.conversations.addDialogue({ who, speaker, text: target === "patient" ? utterance : `@${target} ${utterance}` });
        }
        this.askDepth++;
        try {
          const reply = await k.agents.runAgent(id, target, utterance, sig ?? signal);
          return { text: reply.text, grounded: reply.grounded };
        } finally {
          this.askDepth--;
        }
      },
      updatePlan: (plan, explanation) => k.updatePlan(id, agent, plan, explanation),
      ...(dynamic ? { dynamicTool: (tool: string, args: unknown, sig?: AbortSignal) => this.callDynamicTool(id, tool, args, sig ?? signal) } : {}),
      ...(signal ? { signal } : {}),
    };
  }

  /** The generic tool loop's host for submission `id`. */
  loopHost(id: string): LoopHost {
    const k = this.k;
    return {
      toolContext: (agent, signal) => this.context(agent, id, signal),
      authorize: (request) => k.gate.authorize(id, request),
      // Tool/Stop hooks belong to the running turn: an interrupt also cancels a slow hook command.
      runHooks: (spec) => k.runHook(spec, k.ops.activeSignal),
    };
  }

  /** The waiting call of a `dynamic_tool_response` (taken: it is answered once), or undefined. */
  takeDynamic(callId: string): ((r: DynamicResult) => void) | undefined {
    const resolve = this.pendingDynamic.get(callId);
    if (resolve) this.pendingDynamic.delete(callId);
    return resolve;
  }

  /** Answer every waiting dynamic tool call as aborted (interrupt). */
  abortDynamic(): void {
    for (const [callId, resolve] of [...this.pendingDynamic]) {
      this.pendingDynamic.delete(callId);
      resolve({ ok: false, output: rt(this.k.locale, "tool.aborted") });
    }
  }

  private callDynamicTool(id: string, tool: string, args: unknown, signal?: AbortSignal): Promise<DynamicResult> {
    const k = this.k;
    const callId = k.newId();
    return new Promise((resolve) => {
      if (signal?.aborted) return resolve({ ok: false, output: rt(k.locale, "tool.aborted") });
      const onAbort = () => {
        this.pendingDynamic.delete(callId);
        resolve({ ok: false, output: rt(k.locale, "tool.aborted") });
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.pendingDynamic.set(callId, (r) => {
        signal?.removeEventListener("abort", onAbort);
        resolve(r);
      });
      k.emit(id, { type: "dynamic_tool_call", callId, tool, args });
    });
  }
}
