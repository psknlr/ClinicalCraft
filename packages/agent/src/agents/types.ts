/**
 * Agent profiles — Markdown + YAML-ish frontmatter (Claude Code subagents,
 * ZCode agent profiles). Built-ins live in `agents/builtin/*.ts` (as strings so
 * they bundle for the browser); projects add/override in
 * `.clinicalcraft/agents/<name>.md`:
 *
 *   ---
 *   name: nurse
 *   description: Charge nurse in the emergency department
 *   role: npc            # npc | assistant | examiner
 *   tools: [get_vitals, get_order_status]
 *   model: inherit       # or a model id
 *   provider: inherit
 *   effort: low
 *   temperature: 0.6
 *   maxToolRounds: 3
 *   ---
 *   System prompt body (supports {{patient.displayName}}, {{case.title}}, {{locale}} … placeholders)
 */
export interface AgentProfile {
  name: string;
  description: string;
  role: "npc" | "assistant" | "examiner";
  /** Tool allow-list; tools not listed are never shown to the model. */
  tools: string[];
  model: string | "inherit";
  provider: string | "inherit";
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  temperature?: number;
  maxToolRounds: number;
  /** Prompt template body. */
  prompt: string;
  source: "builtin" | "user" | "project";
  /** Inject CLINICALCRAFT.md memory into this agent (assistants/examiner yes; patient no by default). */
  injectMemory: boolean;
}

export interface SlashCommand {
  name: string;
  description: string;
  argumentHint?: string;
  source: "builtin" | "user" | "project";
  /** Built-in handler, or a Markdown template expanded with $ARGUMENTS / $1..$9 and sent to `agent`. */
  template?: string;
  agent?: string;
}
