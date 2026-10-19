/**
 * ClinicalCraft agent protocol — submission queue / event queue (SQ/EQ).
 *
 * Inspired by Codex CLI's `Op`/`EventMsg` protocol: front-ends (3D web
 * world, terminal REPL, headless exec, HTTP server, MCP server) never call
 * agent internals. They `submit()` an `Op` and render the `AgentEvent`
 * stream. Every event carries the id of the submission that caused it.
 *
 * Tags are snake_case so the JSON wire format is stable across languages.
 */
import type {
  AssessmentReport,
  ClinicalAction,
  DomainEvent,
  ObjectiveProgress,
  SessionState,
  VitalsSnapshot,
} from "@clinicalcraft/core";
import type { ActorId, Pose, WorldActionRequest, WorldActionResult, WorldEvent } from "@clinicalcraft/world";
import type { Embodiment } from "./settings/schema.js";

/* ------------------------------------------------------------------ */
/* Shared vocabulary                                                   */
/* ------------------------------------------------------------------ */

/** Built-in agent roles. Custom agents use their own `name`. */
export type AgentRole =
  | "patient"
  | "companion"
  | "nurse"
  | "radiologist"
  | "pathologist"
  | "attending"
  | "examiner"
  | "clinician"
  | (string & {});

/** Who a learner utterance is addressed to (`@nurse …` in the REPL, NPC picked in the world). */
export type AddressTarget = AgentRole;

/**
 * Approval modes (Claude Code permission modes × Codex approval policies × ZCode collaboration modes).
 * See docs/ARCHITECTURE.md §4.1.
 */
export type ApprovalMode = "default" | "strict" | "auto" | "plan" | "bypass";

/**
 * Scope of practice (Codex sandbox analogue): tools outside the scope are not
 * registered for agents at all and are rejected for direct actions.
 * history-only ⊂ workup ⊂ full.
 */
export type PracticeScope = "history-only" | "workup" | "full";

export type RiskLevel = "none" | "low" | "moderate" | "high";

export type ApprovalDecision = "approved" | "approved_for_session" | "denied" | "abort";

/** Turn phases drive UI affordances (thinking bubble, equipment animation, confirm dialog). */
export type TurnPhase =
  | "idle"
  | "awaiting_model"
  | "streaming"
  | "executing_tools"
  | "awaiting_approval"
  | "completing";

export interface PlanItem {
  text: string;
  status: "pending" | "in_progress" | "completed";
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

/* ------------------------------------------------------------------ */
/* Submissions (front-end → runtime)                                   */
/* ------------------------------------------------------------------ */

export type Op =
  /** Free text from the learner, routed to `to` (default: the session's current interlocutor, initially the patient). */
  | { type: "user_message"; text: string; to?: AddressTarget }
  /** A deterministic clinical action (button press in the world, `/order cbc`, MCP tool). Passes the approval gate. */
  | { type: "clinical_action"; action: ClinicalAction; rationale?: string }
  /** Slash command typed by the learner: `/name args`. */
  | { type: "slash_command"; name: string; args: string }
  /** Answer to an `approval_request`. */
  | { type: "approval_response"; requestId: string; decision: ApprovalDecision; reason?: string }
  /** Let the clinician agent drive (LLM plays the doctor). */
  | { type: "autopilot"; goal?: string; maxTurns?: number }
  /** Result of a client-executed dynamic tool (e.g. `walk_to` performed in the 3D world). */
  | { type: "dynamic_tool_response"; callId: string; ok: boolean; output: string }
  /**
   * Embodied mode (docs/EMBODIED.md §5): a world action (navigate, approach, operate a device…) performed by the
   * learner's body (or another actor): queued like other work; operations with a clinical effect run their
   * clinical tool through the learner's tool path (hooks, approval gate). Answered by `world_action_result`.
   * Refused (`error`, code `not_embodied`) in a clinical-mode session.
   */
  | { type: "world_action"; request: WorldActionRequest }
  /**
   * Embodied mode: a sensor pose update of a human-driven body (the browser avatar, ~10 Hz). Out-of-band: applied
   * at once, never queued behind a turn, never transcribed; bumps only that actor's own version (EMBODIED R4).
   */
  | { type: "world_pose"; actorId: ActorId; pose: Pose }
  /** Cancel the running turn (AbortController). */
  | { type: "interrupt" }
  /** Change runtime configuration (provider, model, approval mode, locale…). */
  | { type: "configure"; patch: RuntimeConfigPatch }
  /** Summarise an agent's conversation to free context. */
  | { type: "compact"; agent?: AgentRole }
  /** Ask the examiner agent for a debrief/assessment. */
  | { type: "assess" }
  | { type: "shutdown" };

export interface Submission {
  id: string;
  op: Op;
}

export interface RuntimeConfigPatch {
  provider?: string;
  model?: string;
  /** Per-agent overrides, e.g. `{ patient: { model: "glm-4.6" } }`. */
  agents?: Record<string, { provider?: string; model?: string; effort?: string; temperature?: number }>;
  approvalMode?: ApprovalMode;
  practiceScope?: PracticeScope;
  /** A supported language ("zh-CN", "en"); aliases such as "zh" or "en-US" are normalised, anything else is refused (`invalid_config`). */
  locale?: string;
  interlocutor?: AddressTarget;
  /** Fixed for an encounter: a patch that would change it is refused (`invalid_config`, the session keeps its mode). */
  embodiment?: Embodiment;
}

/* ------------------------------------------------------------------ */
/* Events (runtime → front-end)                                        */
/* ------------------------------------------------------------------ */

export type EventMsg =
  | {
      type: "session_configured";
      sessionId: string;
      caseId: string;
      caseVersion: string;
      facilityId: string | null;
      locale: string;
      provider: string;
      model: string;
      approvalMode: ApprovalMode;
      practiceScope: PracticeScope;
      agents: string[];
      interlocutor: AddressTarget;
      offline: boolean;
      /** `clinical` or `embodied` (a world runs; clinical tools are spatially gated — docs/EMBODIED.md R3). */
      embodiment: Embodiment;
    }
  /**
   * `synthetic`: a line spoken outside any agent turn (staff alarm/critical-result
   * call, scenario announcement, a button answer) in its own one-line turn (§4
   * Turn bracketing) — not the addressed agent's reply.
   */
  /** `speaker`: the display name the turn's messages will carry (staff with a case/facility name), so a front-end can label the first streamed text. */
  | { type: "turn_started"; turnId: string; agent: AgentRole; synthetic?: true; speaker?: string }
  | { type: "turn_phase"; turnId: string; agent: AgentRole; phase: TurnPhase }
  /** Streaming text from an agent (patient speech, nurse reply, clinician reasoning summary). */
  | { type: "agent_message_delta"; turnId: string; agent: AgentRole; delta: string }
  /** Final text of one agent message. `grounded` = case fact ids revealed in it (patient). */
  | {
      type: "agent_message";
      turnId: string;
      agent: AgentRole;
      speaker: string;
      text: string;
      grounded: string[];
      /** How the text was produced: model output that passed the verifier, the authored answer, offline responder, in-character deflection, opening line, greeting or a clarifying question. */
      grounding?: "llm" | "template" | "offline" | "deflected" | "opening" | "greeting" | "clarify";
      /** Non-verbal cue for the world/UI (e.g. "winces, holding the left flank"). */
      nonverbal?: string | null;
    }
  | { type: "agent_reasoning"; turnId: string; agent: AgentRole; text: string }
  | { type: "tool_call_begin"; turnId: string; agent: AgentRole; callId: string; tool: string; args: unknown }
  | {
      type: "tool_call_end";
      turnId: string;
      agent: AgentRole;
      callId: string;
      tool: string;
      ok: boolean;
      /** Text the model sees. */
      output: string;
      /** Typed payload for UIs (finding, result, vitals…). */
      data?: unknown;
      durationMs: number;
    }
  | {
      type: "approval_request";
      requestId: string;
      agent: AgentRole | "learner";
      tool: string;
      args: unknown;
      risk: RiskLevel;
      /** Human-readable summary, localised ("Give alteplase 0.9 mg/kg IV?"). */
      summary: string;
      reason: string;
      /** Stable id of the permission rule that asked (ZCode-style audit trail). */
      ruleId: string;
      /** Whether "approve for session" is offered (false for alwaysAsk/high-risk). */
      allowSession: boolean;
    }
  | { type: "approval_resolved"; requestId: string; decision: ApprovalDecision; reason?: string }
  /** A request for the front-end to perform a world action (Codex dynamic tools). */
  | { type: "dynamic_tool_call"; callId: string; tool: string; args: unknown }
  /** Engine domain events (objective completed, result ready, alarm…). */
  | { type: "clinical_event"; event: DomainEvent }
  /** Full snapshot after any state change (cheap enough to send each time). */
  | { type: "state_snapshot"; state: SessionState; progress: ObjectiveProgress; vitals: VitalsSnapshot; waypoint: string | null }
  | { type: "plan_updated"; agent: AgentRole; explanation?: string; plan: PlanItem[] }
  | { type: "token_usage"; agent: AgentRole; usage: TokenUsage; total: TokenUsage }
  | { type: "turn_complete"; turnId: string; agent: AgentRole; lastMessage: string | null; durationMs: number }
  | { type: "turn_aborted"; turnId: string; agent: AgentRole; reason: "interrupted" | "max_tool_rounds" | "error" | "denied" }
  | { type: "assessment"; report: AssessmentReport; narrative: string | null; judged: { id: string; met: boolean; evidence: string }[] }
  | { type: "notification"; level: "info" | "warning" | "critical"; title: string; body: string }
  /** Embodied mode: a committed change of the physical world (`version` = the world version after it). Transient (not transcribed). */
  | { type: "world_event"; event: WorldEvent; version: number }
  /** Embodied mode: the outcome of a world action (any actor; world tools, `world_action` ops, skills, delegations, the embodied autopilot). */
  | { type: "world_action_result"; result: WorldActionResult }
  | { type: "command_output"; name: string; text: string; data?: unknown }
  | { type: "config_changed"; patch: RuntimeConfigPatch }
  | { type: "compacted"; agent: AgentRole; beforeTokens: number; afterTokens: number }
  | { type: "api_retry"; agent: AgentRole; attempt: number; delayMs: number; error: string }
  | { type: "warning"; message: string }
  | { type: "error"; message: string; code?: string; retryable?: boolean; auth?: boolean }
  | { type: "shutdown_complete" };

export interface AgentEvent {
  /** Submission id that caused this event ("" for spontaneous events like scenario timers). */
  id: string;
  /** Monotonic per-session sequence number. */
  seq: number;
  msg: EventMsg;
}

export type EventType = EventMsg["type"];
