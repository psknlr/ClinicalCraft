/**
 * HookRunner — runs lifecycle hooks: in-process handlers first (registration
 * order), then matching settings-defined command hooks (node only, through a
 * `CommandHookExecutor`). Results are aggregated into one `HookResult`:
 *
 *   - any `block` wins (reasons joined); `approve` only counts without a block;
 *   - `updatedInput`: last one wins (PreToolUse);
 *   - `additionalContext`: each capped at 10 000 chars and wrapped as data;
 *   - handler exceptions / non-zero non-2 exits become warnings.
 *
 * Command protocol: HookInput JSON on stdin; exit 0 → success (stdout may be
 * a HookOutput JSON; plain stdout is context for UserPromptSubmit and
 * SessionStart); exit 2 → block with stderr as the reason; other → warning.
 */
import type { HookEventName, HooksConfig } from "../settings/schema.js";
import type { CommandHookExecutor, HookHandler, HookInput, HookOutput, HookResult } from "./types.js";

/** Max characters kept from each additionalContext. */
export const HOOK_CONTEXT_MAX_CHARS = 10_000;
/** Default command timeout (seconds). */
export const HOOK_DEFAULT_TIMEOUT_S = 60;

export interface RunHooksOptions {
  /** `settings.hooks` (only from user/project/local settings — never content). */
  settingsHooks?: HooksConfig;
  /** Command executor (node); without it command hooks are skipped. */
  executor?: CommandHookExecutor;
  /** Subject tested against matchers (default derived from the input: tool name, domain event type…). */
  matcherSubject?: string;
  signal?: AbortSignal;
}

/** A fresh, empty result. */
export function emptyHookResult(): HookResult {
  return { blocked: false, approved: false, additionalContext: [], warnings: [] };
}

/** Default matcher subject for an input. */
export function hookMatcherSubject(input: HookInput): string | undefined {
  switch (input.hook_event_name) {
    case "PreToolUse":
    case "PostToolUse":
      return input.tool_name;
    case "ClinicalEvent":
      return input.event.type;
    case "SessionStart":
      return input.source;
    case "Notification":
      return input.level;
    case "PreCompact":
      return input.trigger;
    case "SessionEnd":
      return input.reason;
    case "Stop":
      return input.agent;
    case "UserPromptSubmit":
      return input.to;
    default:
      return undefined;
  }
}

const SIMPLE_MATCHER = /^[A-Za-z0-9_.:-]+(\|[A-Za-z0-9_.:-]+)*$/;

/**
 * Claude Code matcher semantics: omitted / "" / "*" match everything; a plain
 * name list (`a|b`) matches exactly; anything else is an (unanchored) regex.
 * An invalid regex falls back to exact comparison.
 */
export function matchesHookMatcher(matcher: string | undefined, subject: string | undefined): boolean {
  if (matcher === undefined || matcher === "" || matcher === "*") return true;
  if (subject === undefined) return false;
  if (SIMPLE_MATCHER.test(matcher)) return matcher.split("|").includes(subject);
  try {
    return new RegExp(matcher).test(subject);
  } catch {
    return matcher === subject;
  }
}

function wrapContext(text: string, source: string): string {
  const truncated = text.length > HOOK_CONTEXT_MAX_CHARS ? `${text.slice(0, HOOK_CONTEXT_MAX_CHARS)}\n[… truncated]` : text;
  const safeBody = truncated.replace(/<\/hook_context/gi, "<\\/hook_context");
  const safeSource = source.replace(/["<>]/g, "'");
  return `<hook_context source="${safeSource}">\n${safeBody}\n</hook_context>`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Loose validation of a HookOutput coming from a handler or a command's stdout. */
function normaliseOutput(value: unknown): HookOutput | null {
  if (!isRecord(value)) return null;
  const out: HookOutput = {};
  if (value.decision === "block" || value.decision === "approve") out.decision = value.decision;
  if (typeof value.reason === "string") out.reason = value.reason;
  if (typeof value.additionalContext === "string") out.additionalContext = value.additionalContext;
  if ("updatedInput" in value && value.updatedInput !== undefined) out.updatedInput = value.updatedInput;
  if (typeof value.suppressOutput === "boolean") out.suppressOutput = value.suppressOutput;
  return out;
}

class Aggregator {
  readonly result = emptyHookResult();
  private readonly blockReasons: string[] = [];
  private anyApprove = false;
  private approveReason: string | undefined;

  constructor(private readonly event: HookEventName) {}

  apply(output: HookOutput | null | undefined, source: string): void {
    if (!output) return;
    if (output.decision === "block") {
      this.result.blocked = true;
      this.blockReasons.push(output.reason?.trim() || `blocked by ${source}`);
    } else if (output.decision === "approve") {
      this.anyApprove = true;
      this.approveReason ??= output.reason;
    }
    if (output.updatedInput !== undefined && this.event === "PreToolUse") this.result.updatedInput = output.updatedInput;
    if (output.additionalContext && output.additionalContext.trim()) this.result.additionalContext.push(wrapContext(output.additionalContext, source));
  }

  warn(message: string): void {
    this.result.warnings.push(message);
  }

  finish(): HookResult {
    const r = this.result;
    if (r.blocked) {
      r.approved = false;
      r.reason = this.blockReasons.join("\n");
    } else if (this.anyApprove) {
      r.approved = true;
      if (this.approveReason) r.reason = this.approveReason;
    }
    return r;
  }
}

/** Registry of in-process handlers + command-hook execution. */
export class HookRunner {
  private readonly handlers = new Map<HookEventName, HookHandler[]>();

  /** Register an in-process handler; returns an unsubscribe function. */
  on(event: HookEventName, handler: HookHandler): () => void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return () => {
      const current = this.handlers.get(event);
      if (!current) return;
      const i = current.indexOf(handler);
      if (i >= 0) current.splice(i, 1);
    };
  }

  /** Whether anything (handler or command) could run for `event`. */
  has(event: HookEventName, settingsHooks?: HooksConfig): boolean {
    return (this.handlers.get(event)?.length ?? 0) > 0 || (settingsHooks?.[event]?.length ?? 0) > 0;
  }

  /** Run every hook for `event` and aggregate the outcome. Never throws. */
  async runHooks(event: HookEventName, input: HookInput, options: RunHooksOptions = {}): Promise<HookResult> {
    const agg = new Aggregator(event);
    const signal = options.signal;

    for (const [i, handler] of [...(this.handlers.get(event) ?? [])].entries()) {
      if (signal?.aborted) break;
      try {
        const output = await handler(input);
        agg.apply(normaliseOutput(output), `handler#${i + 1}`);
      } catch (err) {
        agg.warn(`${event} hook handler #${i + 1} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const groups = options.settingsHooks?.[event] ?? [];
    if (groups.length > 0 && options.executor) {
      const subject = options.matcherSubject ?? hookMatcherSubject(input);
      for (const group of groups) {
        if (!matchesHookMatcher(group.matcher, subject)) continue;
        for (const hook of group.hooks) {
          if (signal?.aborted) break;
          await this.runCommand(event, input, hook.command, hook.timeout ?? HOOK_DEFAULT_TIMEOUT_S, options.executor, agg, signal);
        }
      }
    }
    return agg.finish();
  }

  private async runCommand(
    event: HookEventName,
    input: HookInput,
    command: string,
    timeoutSeconds: number,
    executor: CommandHookExecutor,
    agg: Aggregator,
    signal?: AbortSignal,
  ): Promise<void> {
    const label = `command "${command.length > 80 ? `${command.slice(0, 77)}...` : command}"`;
    let res: { exitCode: number; stdout: string; stderr: string };
    try {
      res = await executor.run(command, input, timeoutSeconds, signal);
    } catch (err) {
      agg.warn(`${event} hook ${label} could not run: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    if (res.exitCode === 2) {
      agg.apply({ decision: "block", reason: res.stderr.trim() || `blocked by ${label}` }, label);
      return;
    }
    if (res.exitCode !== 0) {
      const detail = res.stderr.trim() ? `: ${res.stderr.trim().slice(0, 500)}` : "";
      agg.warn(`${event} hook ${label} exited with code ${res.exitCode}${detail}`);
      return;
    }
    const stdout = res.stdout.trim();
    if (!stdout) return;
    if (stdout.startsWith("{")) {
      try {
        const output = normaliseOutput(JSON.parse(stdout));
        if (output) {
          agg.apply(output, label);
          return;
        }
      } catch {
        // not JSON — fall through
      }
    }
    if (event === "UserPromptSubmit" || event === "SessionStart") agg.apply({ additionalContext: stdout }, label);
  }
}
