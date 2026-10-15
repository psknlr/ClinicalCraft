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
  locale?: string;
  interlocutor?: AddressTarget;
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
