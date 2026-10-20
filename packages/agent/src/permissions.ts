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
 * run of characters (newlines included), `?` one character, a backslash escapes
 * the next character; case-insensitive, e.g. `intervene(alteplase*)`.
 */
import type { ClinicalAction } from "@clinicalcraft/core";
import type { ApprovalMode, PracticeScope, RiskLevel } from "./protocol.js";
import { rt, type RuntimeKey } from "./session/i18n.js";
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

type GlobToken = { star: true } | { star: false; any: boolean; ch: string };

const globCache = new Map<string, GlobToken[]>();

/** Tokenise a glob: `*`, `?`, backslash + x = literal x, everything else literal (case-folded). */
function compileGlob(glob: string): GlobToken[] {
  let tokens = globCache.get(glob);
  if (!tokens) {
    tokens = [];
    const chars = Array.from(glob);
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i]!;
      if (c === "\\" && i + 1 < chars.length) tokens.push({ star: false, any: false, ch: chars[++i]!.toLowerCase() });
      else if (c === "*") {
        if (!tokens.at(-1)?.star) tokens.push({ star: true }); // `**` ≡ `*`
      } else tokens.push({ star: false, any: c === "?", ch: c.toLowerCase() });
    }
    if (globCache.size > 1000) globCache.clear();
    globCache.set(glob, tokens);
  }
  return tokens;
}

/**
 * Case-insensitive wildcard match in O(pattern × text) — no RegExp, so no
 * catastrophic backtracking and `*`/`?` match any character including
 * newlines (a multi-line specifier cannot slip past a deny rule).
 */
export function globMatch(glob: string, text: string): boolean {
  const pattern = compileGlob(glob);
  const chars = Array.from(text, (c) => c.toLowerCase());
  let p = 0;
  let t = 0;
  let starP = -1;
  let starT = 0;
  while (t < chars.length) {
    const tok = pattern[p];
    if (tok && !tok.star && (tok.any || tok.ch === chars[t])) {
      p++;
      t++;
    } else if (tok && tok.star) {
      starP = p++;
      starT = t;
    } else if (starP !== -1) {
      p = starP + 1;
      t = ++starT;
    } else {
      return false;
    }
  }
  while (pattern[p]?.star) p++;
  return p === pattern.length;
}

/** Escape glob metacharacters so `text` matches only itself. */
export function escapeGlob(text: string): string {
  return text.replace(/[\\*?]/g, "\\$&");
}

/**
 * Does `rule` match a call of `toolName` with `specifier`? `tool` alone
 * matches every call of that tool; `tool(glob)` requires the specifier to
 * match (a missing specifier only matches `*`). The tool part may be a glob.
 * Globs: `*` any run, `?` one character, a backslash escapes the next character; case-insensitive.
 */
export function matchRule(rule: string, toolName: string, specifier?: string | null): boolean {
  const parsed = parseRule(rule);
  if (!parsed) return false;
  if (!globMatch(parsed.tool, toolName)) return false;
  if (parsed.specifier === null) return true;
  return globMatch(parsed.specifier, (specifier ?? "").trim());
}

/** First matching rule in `rules`, if any. */
export function findMatchingRule(rules: readonly string[] | undefined, toolName: string, specifier?: string | null): string | undefined {
  return rules?.find((r) => matchRule(r, toolName, specifier));
}

/**
 * The things a call acts on, each with its spellings (`ToolDefinition.specifiers`; default `[[specifier]]`).
 * A failing classifier gives the plain specifier.
 */
export function callSpecifiers<A>(tool: ToolDefinition<A>, args: A, ctx: ToolContext, specifier: string | null): (string | null)[][] {
  let leaves: string[][] | null = null;
  try {
    leaves = tool.specifiers?.(args, ctx) ?? null;
  } catch {
    leaves = null;
  }
  const cleaned = (leaves ?? []).map((spellings) => spellings.filter((x) => typeof x === "string")).filter((spellings) => spellings.length > 0);
  return cleaned.length ? cleaned : [[specifier]];
}

/** A rule matching ANY spelling of ANY thing the call acts on (deny and ask rules). */
export function findRuleForAny(rules: readonly string[] | undefined, toolName: string, things: readonly (readonly (string | null)[])[]): string | undefined {
  return rules?.find((r) => things.some((spellings) => spellings.some((s) => matchRule(r, toolName, s))));
}

/** A rule set covering EVERY thing the call acts on (some rule matches a spelling of each): the first rule that matched. */
export function findRuleForAll(rules: readonly string[] | undefined, toolName: string, things: readonly (readonly (string | null)[])[]): string | undefined {
  if (!rules?.length) return undefined;
  let first: string | undefined;
  for (const spellings of things) {
    const rule = rules.find((r) => spellings.some((s) => matchRule(r, toolName, s)));
    if (!rule) return undefined;
    first ??= rule;
  }
  return first;
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
 * classifier is treated as `high` risk, a failing specifier as none. Reasons
 * are written in `ctx.locale` (they reach learners and agents verbatim).
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
  // Everything the call acts on, by every name (review S6): deny / ask on any, allow on all.
  const things = callSpecifiers(tool, args, ctx, specifier);
  const session = sessionRules instanceof PermissionState ? sessionRules.sessionRules : sessionRules;
  const label = formatRule(tool.name, specifier);
  const L = ctx?.locale;
  const say = (key: RuntimeKey, params: Record<string, string> = {}) => rt(L, key, { tool: tool.name, label, ...params });
  const result = (decision: PermissionCheck["decision"], ruleId: string, reason: string, allowSession = false): PermissionCheck => ({
    decision,
    ruleId,
    reason,
    risk,
    allowSession,
  });

  // 1. scope
  if (!inScope(tool.scope, scope)) {
    return result("deny", PERMISSION_RULE_IDS.outOfScope, say("perm.outOfScope", { needed: tool.scope, scope }));
  }
  // 2. deny rules
  const deny = findRuleForAny(rules.deny, tool.name, things);
  if (deny) return result("deny", PERMISSION_RULE_IDS.deny, say("perm.deny", { rule: deny }));
  // 3. plan mode
  if (mode === "plan" && !tool.readOnly) {
    return result("deny", PERMISSION_RULE_IDS.planStateChanging, say("perm.plan"));
  }
  // 4. read-only
  if (tool.readOnly) return result("allow", PERMISSION_RULE_IDS.readOnly, say("perm.readOnly"));
  // 5. always ask
  if (mode !== "bypass" && safe(() => tool.alwaysAsk?.(args, ctx) ?? false, true)) {
    return result("ask", PERMISSION_RULE_IDS.alwaysAsk, say("perm.alwaysAsk"), false);
  }
  // 6. ask rules
  const ask = findRuleForAny(rules.ask, tool.name, things);
  if (ask) return result("ask", PERMISSION_RULE_IDS.ask, say("perm.ask", { rule: ask }), risk !== "high");
  // 7. session approvals
  const sessionRule = findRuleForAll(session, tool.name, things);
  if (sessionRule) return result("allow", PERMISSION_RULE_IDS.sessionAllow, say("perm.session", { rule: sessionRule }));
  // 8. allow rules
  const allow = findRuleForAll(rules.allow, tool.name, things);
  if (allow) return result("allow", PERMISSION_RULE_IDS.allow, say("perm.allow", { rule: allow }));
  // 9. mode table
  return modeDecision(mode, risk, (key) => say(key, { risk: rt(L, `perm.risk.${risk}` as RuntimeKey) }), result);
}

function modeDecision(
  mode: ApprovalMode,
  risk: RiskLevel,
  say: (key: RuntimeKey) => string,
  result: (decision: PermissionCheck["decision"], ruleId: string, reason: string, allowSession?: boolean) => PermissionCheck,
): PermissionCheck {
  const offerSession = risk !== "high";
  switch (mode) {
    case "bypass":
      return result("allow", PERMISSION_RULE_IDS.bypass, say("perm.bypass"));
    case "auto":
      return risk === "high" ? result("ask", PERMISSION_RULE_IDS.auto, say("perm.autoAsk"), false) : result("allow", PERMISSION_RULE_IDS.auto, say("perm.autoAllow"));
    case "strict":
      return result("ask", PERMISSION_RULE_IDS.strict, say("perm.strict"), offerSession);
    case "plan":
      // Unreachable for state-changing tools (step 3); kept for exhaustiveness.
      return result("deny", PERMISSION_RULE_IDS.planStateChanging, say("perm.plan"));
    case "default":
    default:
      return risk === "none" || risk === "low"
        ? result("allow", PERMISSION_RULE_IDS.default, say("perm.defaultAllow"))
        : result("ask", PERMISSION_RULE_IDS.default, say("perm.defaultAsk"), offerSession);
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

  /**
   * Add the rule for an `approved_for_session` answer: `tool(specifier)` with
   * glob characters escaped so it covers exactly that specifier (an empty
   * specifier stays `tool()`); bare `tool` only when the tool has no
   * specifier (null/undefined). Returns the rule.
   */
  addSessionRule(tool: string, specifier?: string | null): string {
    return this.addRule(specifier == null ? tool : `${tool}(${escapeGlob(specifier)})`);
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
