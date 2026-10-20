/**
 * Tool registry: clinical tools (§3), NPC tools, optional dynamic tools the
 * front-end declared (`walk_to`) and plugin tools. `forAgent` applies the
 * agent's allow-list, the practice scope (tools outside it are never shown —
 * Codex sandbox analogue) and bare `deny` rules (a denied tool is removed from
 * the model's context entirely).
 */
import type { CaseDefinition } from "@clinicalcraft/core";
import type { AgentProfile } from "../agents/types.js";
import { inScope, parseRule } from "../permissions.js";
import type { PracticeScope } from "../protocol.js";
import { clinicalTools, walkToTool, type ToolArgs } from "./clinical.js";
import { npcTools, type NpcToolOptions } from "./npc.js";
import type { ToolDefinition } from "./types.js";

export * from "./clinical.js";
export * from "./npc.js";
export * from "./spatial.js";
export * from "./scope.js";
export * from "./world.js";
export { isLearnerTool, LEARNER_CLINICAL_TOOLS, LEARNER_TOOL_NAMES, LEARNER_TOOLS } from "./learner.js";
export * from "./world-format.js";
export * from "./format.js";
export * from "./validate.js";
export { toToolSpec, type PermissionCheck, type SideEffect, type ToolContext, type ToolDefinition, type ToolOutput, type VitalsView } from "./types.js";

/** Dynamic (client-executed) tools a front-end may declare. */
export const DYNAMIC_TOOLS = ["walk_to"] as const;

export interface ToolRegistryOptions {
  /** Dynamic tools the front-end supports (e.g. ["walk_to"] in the 3D world). */
  dynamicTools?: readonly string[];
  /** Plugin tools; a plugin tool replaces a built-in tool with the same name. */
  extra?: readonly ToolDefinition<any>[];
  npc?: NpcToolOptions;
}

export interface AgentToolFilter {
  scope: PracticeScope;
  /** Permission deny rules; bare `tool` rules hide the tool. */
  deny?: readonly string[];
  /** Case (used to hide `wait` on static clocks). */
  caseDef?: Pick<CaseDefinition, "clock">;
}

/** All tools of a session, by name. */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition<any>>();

  constructor(options: ToolRegistryOptions = {}) {
    for (const tool of clinicalTools()) this.tools.set(tool.name, tool);
    for (const tool of npcTools(options.npc)) this.tools.set(tool.name, tool);
    if (options.dynamicTools?.includes(walkToTool.name)) this.tools.set(walkToTool.name, walkToTool);
    for (const tool of options.extra ?? []) this.tools.set(tool.name, tool);
  }

  /** Every registered tool. */
  all(): ToolDefinition<any>[] {
    return [...this.tools.values()];
  }

  get(name: string): ToolDefinition<any> | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Register a tool, replacing one with the same name (embodied mode: spatially gated clinical tools, world tools). */
  replace(tool: ToolDefinition<any>): void {
    this.tools.set(tool.name, tool);
  }

  /** Unregister a tool (embodied mode: the front-end's `walk_to`, replaced by the world's `navigate_to`). */
  remove(name: string): void {
    this.tools.delete(name);
  }

  /** Tools an agent may see under the current scope and deny rules, in allow-list order. */
  forAgent(profile: Pick<AgentProfile, "tools">, filter: AgentToolFilter): ToolDefinition<any>[] {
    const names = profile.tools.includes("*") ? [...this.tools.keys()] : profile.tools;
    const out: ToolDefinition<any>[] = [];
    for (const name of names) {
      const tool = this.tools.get(name);
      if (!tool || out.includes(tool)) continue;
      if (!inScope(tool.scope, filter.scope)) continue;
      if (isHiddenByDeny(tool.name, filter.deny)) continue;
      if (tool.name === "wait" && filter.caseDef && filter.caseDef.clock.mode !== "simulated") continue;
      out.push(tool);
    }
    return out;
  }
}

/** True when a bare deny rule (`tool`, no specifier) names this tool. */
export function isHiddenByDeny(toolName: string, deny: readonly string[] | undefined): boolean {
  return (deny ?? []).some((rule) => {
    const parsed = parseRule(rule);
    return parsed !== null && parsed.specifier === null && parsed.tool === toolName;
  });
}

/** Convenience: a registry with default options. */
export function createToolRegistry(options: ToolRegistryOptions = {}): ToolRegistry {
  return new ToolRegistry(options);
}

export type { ToolArgs };
