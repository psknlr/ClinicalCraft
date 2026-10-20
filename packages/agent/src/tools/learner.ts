/**
 * The learner's tool set (review S2): the tools a learner — a person at the
 * REPL or in the web, an MCP client, and every step a skill or a delegated
 * task runs on a caller's behalf — may call: the clinical tools of
 * docs/PROTOCOL.md §3 and the world tools of §12.4. Never an NPC's tool
 * (`reveal_facts`, `get_vitals`, `get_results`, `get_progress`,
 * `give_hint`: they reveal authored answers, hints and readings without the
 * spatial gate) and never a front-end's dynamic tool (`walk_to`).
 * `ClinicalSession` refuses anything else on the learner's tool path and on
 * the caller path of skill and delegation steps — before validation — and
 * the skill schema accepts only these as step tools. No imports: the skill
 * schema (and the JSON-schema generator) use it.
 */

/** Names of every world tool (embodied mode, PROTOCOL §12.4). */
export const WORLD_TOOL_NAMES = [
  "observe_world",
  "get_agent_state",
  "find_entities",
  "find_objects",
  "inspect_object",
  "get_nearby_objects",
  "get_visible_objects",
  "get_room_info",
  "get_action_feedback",
  "navigate_to",
  "approach_object",
  "look_at",
  "interact_object",
  "cancel_action",
  "delegate_task",
  "execute_skill",
  "get_camera_frame",
] as const;

/** The clinical tools a learner may call (the clinical tools of PROTOCOL §3 without the dynamic `walk_to`). */
export const LEARNER_CLINICAL_TOOLS = [
  "ask_patient",
  "list_options",
  "examine",
  "order_test",
  "read_result",
  "check_vitals",
  "intervene",
  "consult",
  "answer_decision",
  "set_phase",
  "wait",
  "update_workup",
  "case_status",
  "finish_case",
] as const;

/** Every tool a learner (and a skill or delegated step) may call, in a stable order. */
export const LEARNER_TOOL_NAMES: readonly [string, ...string[]] = [...LEARNER_CLINICAL_TOOLS, ...WORLD_TOOL_NAMES];

/** `LEARNER_TOOL_NAMES` as a set. */
export const LEARNER_TOOLS: ReadonlySet<string> = new Set(LEARNER_TOOL_NAMES);

/** May a learner (or a skill / delegated step) call this tool? */
export function isLearnerTool(name: string): boolean {
  return LEARNER_TOOLS.has(name);
}
