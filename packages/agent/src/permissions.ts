/**
 * Approval gate — the ordered permission ladder of docs/PROTOCOL.md §6
 * (first match wins), with stable rule ids for auditing (ZCode):
 *
 *   1 scope.out-of-scope        deny  tool scope > practice scope
 *   2 rule.deny                 deny  a deny rule matches
 *   3 mode.plan.state-changing  deny  non-read-only tool in plan mode
 *   4 tool.read-only            allow read-only tools
 *   5 tool.always-ask           ask   tool says alwaysAsk (unless bypass); no "approve for session"
 *   6 rule.ask                  ask   an ask rule matches
 *   7 session.allow             allow an "approved for session" rule matches
 *   8 rule.allow                allow an allow rule matches
 *   9 mode.<mode>               per approval-mode × risk table (ARCHITECTURE §4.1)
 *
 * Rule syntax (Claude Code): `tool` or `tool(specifier-glob)`; `*` matches any
 * run of characters, `?` one character, e.g. `intervene(alteplase*)`.
 */
import type { ClinicalAction } from "@clinicalcraft/core";
import type { ApprovalMode, PracticeScope, RiskLevel } from "./protocol.js";
import type { PermissionCheck, ToolContext, ToolDefinition } from "./tools/types.js";

/** Stable rule ids (exported for UIs, transcripts and tests). */
export const PERMISSION_RULE_IDS = {
  outOfScope: "scope.out-of-scope",
  deny: "rule.deny",
  planStateChanging: "mode.plan.state-changing",
  readOnly: "tool.read-only",
  alwaysAsk: "tool.always-ask",
  ask: "rule.ask",
  sessionAllow: "session.allow",
  allow: "rule.allow",
  bypass: "mode.bypass",
  auto: "mode.auto",
  default: "mode.default",
  strict: "mode.strict",
} as const;

const SCOPE_RANK: Record<PracticeScope, number> = { "history-only": 0, workup: 1, full: 2 };

/** Rank of a practice scope (history-only 0 ⊂ workup 1 ⊂ full 2). Unknown → full. */
export function scopeRank(scope: PracticeScope | string): number {
  return SCOPE_RANK[scope as PracticeScope] ?? 2;
}

/** True when a tool registered at `toolScope` is available under `practiceScope`. */
export function inScope(toolScope: PracticeScope, practiceScope: PracticeScope): boolean {
  return scopeRank(toolScope) <= scopeRank(practiceScope);
}

export interface ParsedRule {
  tool: string;
  specifier: string | null;
}

/** Parse `tool` / `tool(spec)`; returns null for malformed rules. */
export function parseRule(rule: string): ParsedRule | null {
  const text = rule.trim();
  if (!text) return null;
  const open = text.indexOf("(");
  if (open === -1) return /[()]/.test(text) ? null : { tool: text, specifier: null };
  if (!text.endsWith(")") || open === 0) return null;
  return { tool: text.slice(0, open).trim(), specifier: text.slice(open + 1, -1).trim() };
}

const globCache = new Map<string, RegExp>();
function globToRegExp(glob: string): RegExp {
  let re = globCache.get(glob);
  if (!re) {
    const body = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    re = new RegExp(`^${body}$`, "i");
    globCache.set(glob, re);
  }
  return re;
}

/**
 * Does `rule` match a call of `toolName` with `specifier`? `tool` alone
 * matches every call of that tool; `tool(glob)` requires the specifier to
 * match (a missing specifier only matches `*`). The tool part may be a glob.
 */
export function matchRule(rule: string, toolName: string, specifier?: string | null): boolean {
  const parsed = parseRule(rule);
  if (!parsed) return false;
  if (!globToRegExp(parsed.tool).test(toolName)) return false;
  if (parsed.specifier === null) return true;
  return globToRegExp(parsed.specifier).test(specifier ?? "");
}

/** First matching rule in `rules`, if any. */
export function findMatchingRule(rules: readonly string[] | undefined, toolName: string, specifier?: string | null): string | undefined {
  return rules?.find((r) => matchRule(r, toolName, specifier));
}

/** Format a session rule `tool(specifier)` (or bare `tool`). */
export function formatRule(tool: string, specifier?: string | null): string {
  return specifier ? `${tool}(${specifier})` : tool;
}

export interface PermissionRules {
  allow?: readonly string[];
  ask?: readonly string[];
  deny?: readonly string[];
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Run the permission ladder for one tool call. Never throws: a failing risk
 * classifier is treated as `high` risk, a failing specifier as none.
 */
export function checkPermission<A>(
  tool: ToolDefinition<A>,
  args: A,
  ctx: ToolContext,
  mode: ApprovalMode,
  scope: PracticeScope,
  rules: PermissionRules = {},
  sessionRules: readonly string[] | PermissionState = [],
): PermissionCheck {
  const risk: RiskLevel = safe(() => tool.risk(args, ctx), "high" as RiskLevel);
  const specifier = safe(() => tool.specifier?.(args, ctx) ?? null, null);
  const session = sessionRules instanceof PermissionState ? sessionRules.sessionRules : sessionRules;
  const label = formatRule(tool.name, specifier);
  const result = (decision: PermissionCheck["decision"], ruleId: string, reason: string, allowSession = false): PermissionCheck => ({
    decision,
    ruleId,
    reason,
    risk,
    allowSession,
  });

  // 1. scope
  if (!inScope(tool.scope, scope)) {
    return result("deny", PERMISSION_RULE_IDS.outOfScope, `${tool.name} requires practice scope "${tool.scope}" (current: "${scope}")`);
  }
  // 2. deny rules
  const deny = findMatchingRule(rules.deny, tool.name, specifier);
  if (deny) return result("deny", PERMISSION_RULE_IDS.deny, `${label} is denied by rule "${deny}"`);
  // 3. plan mode
  if (mode === "plan" && !tool.readOnly) {
    return result("deny", PERMISSION_RULE_IDS.planStateChanging, `Plan mode: ${label} changes the case state — propose it in your plan (update_workup) instead of executing it`);
  }
  // 4. read-only
  if (tool.readOnly) return result("allow", PERMISSION_RULE_IDS.readOnly, `${tool.name} is read-only`);
  // 5. always ask
  if (mode !== "bypass" && safe(() => tool.alwaysAsk?.(args, ctx) ?? false, true)) {
    return result("ask", PERMISSION_RULE_IDS.alwaysAsk, `${label} always requires confirmation (irreversible or high risk)`, false);
  }
  // 6. ask rules
  const ask = findMatchingRule(rules.ask, tool.name, specifier);
  if (ask) return result("ask", PERMISSION_RULE_IDS.ask, `${label} requires confirmation by rule "${ask}"`, risk !== "high");
  // 7. session approvals
  const sessionRule = findMatchingRule(session, tool.name, specifier);
  if (sessionRule) return result("allow", PERMISSION_RULE_IDS.sessionAllow, `${label} was approved for this session ("${sessionRule}")`);
  // 8. allow rules
  const allow = findMatchingRule(rules.allow, tool.name, specifier);
  if (allow) return result("allow", PERMISSION_RULE_IDS.allow, `${label} is allowed by rule "${allow}"`);
  // 9. mode table
  return modeDecision(mode, risk, label, result);
}

function modeDecision(
  mode: ApprovalMode,
  risk: RiskLevel,
  label: string,
  result: (decision: PermissionCheck["decision"], ruleId: string, reason: string, allowSession?: boolean) => PermissionCheck,
): PermissionCheck {
  const offerSession = risk !== "high";
  switch (mode) {
    case "bypass":
      return result("allow", PERMISSION_RULE_IDS.bypass, `bypass mode allows ${label}`);
    case "auto":
      return risk === "high"
        ? result("ask", PERMISSION_RULE_IDS.auto, `auto mode asks before high-risk ${label}`, false)
        : result("allow", PERMISSION_RULE_IDS.auto, `auto mode allows ${risk}-risk ${label}`);
    case "strict":
      return result("ask", PERMISSION_RULE_IDS.strict, `strict mode asks before every state-changing action (${label}, risk ${risk})`, offerSession);
    case "plan":
      // Unreachable for state-changing tools (step 3); kept for exhaustiveness.
      return result("deny", PERMISSION_RULE_IDS.planStateChanging, `Plan mode: propose ${label} instead of executing it`);
    case "default":
    default:
      return risk === "none" || risk === "low"
        ? result("allow", PERMISSION_RULE_IDS.default, `default mode allows ${risk}-risk ${label}`)
        : result("ask", PERMISSION_RULE_IDS.default, `default mode asks before ${risk}-risk ${label}`, offerSession);
  }
}

/** In-memory "approved for session" rules (Grok CLI "don't ask again this session"). */
export class PermissionState {
  private readonly rules: string[] = [];

  constructor(initial: readonly string[] = []) {
    for (const r of initial) this.addRule(r);
  }

  /** Current session rules (copy). */
  get sessionRules(): string[] {
    return [...this.rules];
  }

  /** Add `tool(specifier)` (or bare `tool`) after an `approved_for_session` answer. Returns the rule. */
  addSessionRule(tool: string, specifier?: string | null): string {
    return this.addRule(formatRule(tool, specifier));
  }

  /** Add a raw rule string (deduplicated). */
  addRule(rule: string): string {
    const r = rule.trim();
    if (r && parseRule(r) && !this.rules.includes(r)) this.rules.push(r);
    return r;
  }

  matches(toolName: string, specifier?: string | null): boolean {
    return findMatchingRule(this.rules, toolName, specifier) !== undefined;
  }

  clear(): void {
    this.rules.length = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Learner direct actions → equivalent tool                            */
/* ------------------------------------------------------------------ */

/** Tool equivalent of each clinical action type (null = never gated). */
export const ACTION_TOOL: Readonly<Record<ClinicalAction["type"], string | null>> = {
  start: null,
  ask: "ask_patient",
  examine: "examine",
  order: "order_test",
  read: "read_result",
  "set-phase": "set_phase",
  hint: null,
  answer: "answer_decision",
  intervene: "intervene",
  "advance-time": "wait",
  flag: null,
  note: null,
  finish: "finish_case",
};

/** Equivalent tool name for a learner `clinical_action` (null when the action is not gated). */
export function actionToolName(action: Pick<ClinicalAction, "type">): string | null {
  return ACTION_TOOL[action.type] ?? null;
}

/** Rule specifier for a clinical action (investigation/intervention/finding/decision id, phase). */
export function actionSpecifier(action: ClinicalAction): string | null {
  switch (action.type) {
    case "ask":
      return action.itemId;
    case "examine":
      return action.findingId;
    case "order":
    case "read":
      return action.investigationId;
    case "intervene":
      return action.interventionId;
    case "answer":
      return action.decisionId;
    case "set-phase":
      return action.phase;
    default:
      return null;
  }
}
