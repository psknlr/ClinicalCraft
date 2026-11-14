/**
 * Shared types of embodied mode (docs/EMBODIED.md R3): who runs a clinical
 * tool when a world operation, a skill step or a delegated task needs one.
 */
import type { AgentRole } from "../protocol.js";

/**
 * The caller whose tool path runs a clinical tool for a world action: a
 * model agent (`executeToolCall` with its allow-list, hooks and approval
 * gate) or the learner (`runLearnerTool`). The acting body is separate (the
 * world action's actor).
 */
export interface ClinicalCaller {
  agent: AgentRole | "learner";
  /** Submission whose events the call emits (default: the current one). */
  submission?: string;
  /** Model turn the nested tool calls belong to. */
  turnId?: string;
  signal?: AbortSignal;
  /**
   * The care team's plan step a device's step of the operation is (the stand-in's gas through the tower, docs/TEAM.md
   * §4.5): its `operate` effect is recorded with this ref. Set by the team's host only.
   */
  stepRef?: string;
}
