/**
 * Hooks — lifecycle extension points (Claude Code / ZCode / Grok CLI contract).
 *
 * Two handler kinds:
 *   - in-process functions (`session.hooks.on(event, fn)`) — browser and node
 *   - shell commands from settings (`hooks.<Event>[{matcher, hooks:[{type:"command", command, timeout}]}]`) — node only
 *
 * Command protocol: one JSON object (HookInput) on stdin. Exit 0 → success
 * (stdout may be a HookOutput JSON); exit 2 → block (stderr is the reason);
 * any other exit code → non-blocking error (reported as a warning).
 *
 * Security: hooks are loaded only from user/project/local settings — never
 * from case packs or facility content (untrusted data).
 */
import type { DomainEvent } from "@clinicalcraft/core";
import type { HookEventName } from "../settings/schema.js";

export interface HookInputBase {
  hook_event_name: HookEventName;
  session_id: string;
  case_id: string;
  transcript_path: string | null;
  cwd: string | null;
  approval_mode: string;
  locale: string;
}

export type HookInput =
  | (HookInputBase & { hook_event_name: "SessionStart"; source: "startup" | "resume" })
  | (HookInputBase & { hook_event_name: "UserPromptSubmit"; prompt: string; to: string })
  | (HookInputBase & { hook_event_name: "PreToolUse"; agent: string; tool_name: string; tool_input: unknown })
  | (HookInputBase & { hook_event_name: "PostToolUse"; agent: string; tool_name: string; tool_input: unknown; tool_response: { ok: boolean; output: string } })
  | (HookInputBase & { hook_event_name: "ClinicalEvent"; event: DomainEvent })
  | (HookInputBase & { hook_event_name: "Notification"; level: string; title: string; body: string })
  | (HookInputBase & { hook_event_name: "PreCompact"; agent: string; trigger: "manual" | "auto" })
  | (HookInputBase & { hook_event_name: "Stop"; agent: string; last_message: string | null; stop_hook_active: boolean })
  | (HookInputBase & { hook_event_name: "SessionEnd"; reason: "shutdown" | "finished" | "error" });

export interface HookOutput {
  /** "block" stops the action/prompt (PreToolUse, UserPromptSubmit, Stop → forces one more step). "approve" skips the approval prompt (PreToolUse only). */
  decision?: "block" | "approve";
  reason?: string;
  /** Extra context appended for the agent (UserPromptSubmit, PostToolUse, SessionStart). Treated as data, capped at 10k chars. */
  additionalContext?: string;
  /** PreToolUse only: replace the tool input. */
  updatedInput?: unknown;
  /** Suppress the event from transcripts. */
  suppressOutput?: boolean;
}

export type HookHandler = (input: HookInput) => HookOutput | void | Promise<HookOutput | void>;

/** Executes settings-defined command hooks; injected by `@clinicalcraft/agent/node` (absent in browsers). */
export interface CommandHookExecutor {
  run(command: string, input: HookInput, timeoutSeconds: number, signal?: AbortSignal): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

export interface HookResult {
  blocked: boolean;
  approved: boolean;
  reason?: string;
  additionalContext: string[];
  updatedInput?: unknown;
  warnings: string[];
}
