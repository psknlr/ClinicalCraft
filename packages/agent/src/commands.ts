/**
 * Slash commands (docs/PROTOCOL.md §9). Built-ins produce localised text
 * (compact tables usable in a terminal) AND structured `data` for GUIs, both
 * in one `command_output` event. Clinical commands go through the same tool
 * path and approval gate as everything else (as the learner). Custom
 * Markdown commands expand `$ARGUMENTS` / `$1…$9` and send the result to
 * their agent (default: the current interlocutor).
 */
import {
  currentObjective,
  orderStatus,
  presentedOptions,
  progress,
  t,
  type CaseDefinition,
  type ClinicalAction,
  type ReduceResult,
  type SessionState,
} from "@clinicalcraft/core";
import { expandCommandTemplate, splitArgs } from "./agents/markdown.js";
import type { SlashCommand } from "./agents/types.js";
import type { PlanItem, RuntimeConfigPatch } from "./protocol.js";
import { PROVIDER_TEMPLATES, localizedName } from "./providers/catalog.js";
import type { SessionSnapshot } from "./session/types.js";
import { isZh, joinList, rt, type RuntimeKey } from "./session/i18n.js";
import { resolveAgentAlias } from "./session/router.js";
import type { ResolvedSettings } from "./settings/schema.js";
import { caseStatusText, listOptionsText } from "./tools/clinical.js";
import { clockTime, investigationName, objectiveTitle, phaseLabel, table } from "./tools/format.js";
import type { ToolOutput } from "./tools/types.js";

/** What commands need from the session. */
export interface CommandHost {
  readonly caseDef: CaseDefinition;
  readonly settings: ResolvedSettings;
  readonly locale: string;
  state(): SessionState;
  plan(): { items: PlanItem[]; explanation: string | null };
  interlocutor(): string;
  sessionRules(): string[];
  agentNames(): string[];
  commands(): SlashCommand[];
  /** Emit `command_output` for this command. */
  output(text: string, data?: unknown): void;
  warn(message: string): void;
  /** The model the session's agents call (provider defaults and overrides resolved); optional. */
  resolvedModel?(): string | null;
  /** Run a tool as the learner (approval gate + PreToolUse hooks apply). */
  runTool(name: string, args: Record<string, unknown>): Promise<ToolOutput>;
  /** Dispatch a clinical action as the learner (gated). Null when denied/cancelled. */
  learnerAction(action: ClinicalAction): Promise<ReduceResult | null>;
  sendMessage(to: string | null, text: string): Promise<void>;
  /**
   * True when `agent` has no model and its offline responder does not read
   * the message (examiner, attending): custom prompt commands then explain
   * that they need a language model. Optional (absent = never).
   */
  ignoresPromptsOffline?(agent: string): boolean;
  autopilot(goal?: string): Promise<void>;
  assess(): Promise<void>;
  compact(agent?: string): Promise<void>;
  configure(patch: RuntimeConfigPatch): Promise<void>;
  clearConversations(): void;
  snapshot(): SessionSnapshot;
  shutdown(): Promise<void>;
}

const BUILTIN_NAMES = [
  ["help", ""],
  ["case", ""],
  ["ask", "[n|text]"],
  ["exam", "[query]"],
  ["order", "<query>"],
  ["results", ""],
  ["read", "<id> [phase]"],
  ["give", "<query>"],
  ["vitals", ""],
  ["board", ""],
  ["answer", "<decision> <option…>"],
  ["phase", "[id]"],
  ["wait", "<minutes>"],
  ["hint", ""],
  ["status", ""],
  ["plan", ""],
  ["note", "<text>"],
  ["talk", "<role>"],
  ["consult", "<role> <question>"],
  ["autopilot", "[goal]"],
  ["finish", ""],
  ["assess", ""],
  ["debrief", ""],
  ["model", "[id]"],
  ["provider", "[id]"],
  ["approval", "[mode]"],
  ["scope", "[scope]"],
  ["permissions", ""],
  ["compact", "[agent]"],
  ["export", "[path]"],
  ["lang", "[zh-CN|en]"],
  ["clear", ""],
  ["quit", ""],
] as const;

/** Built-in slash commands (descriptions in English; `/help` localises them). */
export const BUILTIN_COMMANDS: readonly SlashCommand[] = BUILTIN_NAMES.map(([name, hint]) => ({
  name,
  description: rt("en", `cmd.${name}` as RuntimeKey),
  ...(hint ? { argumentHint: hint } : {}),
  source: "builtin" as const,
}));

/** Localised description of a command. */
export function commandDescription(command: SlashCommand, locale: string): string {
  if (command.source === "builtin") return rt(locale, `cmd.${command.name}` as RuntimeKey);
  return command.description;
}

const APPROVAL_MODES = ["default", "strict", "auto", "plan", "bypass"] as const;
const SCOPES = ["history-only", "workup", "full"] as const;
const LANGS = ["zh-CN", "en"] as const;

function usage(host: CommandHost, name: string, hint: string): void {
  host.output(rt(host.locale, "cmd.usage", { name, hint }), { error: "usage" });
}

/**
 * Print a tool result for the learner. A rejected engine action is shown
 * by its reason only ("Not possible: …"); the rejection code stays in the
 * data (and in the model-facing tool output).
 */
function toolOut(host: CommandHost, out: ToolOutput, command?: string): void {
  const data = out.data as { rejected?: unknown; message?: unknown; unresolved?: unknown } | undefined;
  const text =
    !out.ok && data?.rejected && typeof data.message === "string"
      ? rt(host.locale, "action.rejected", { message: data.message })
      : !out.ok && command && typeof data?.unresolved === "string"
        ? unresolvedText(host.locale, command, data as UnresolvedData)
        : out.output;
  host.output(text, { ok: out.ok, data: out.data ?? null });
}

interface UnresolvedData {
  unresolved: string;
  candidates?: { id: string; label: string }[];
  query?: string;
  id?: string;
}

/**
 * Learner wording for a query that named no single item (the tool's own text
 * speaks to a model: "call again with an exact id", "use list_options"): one
 * candidate → "Did you mean …? Type /exam <id>"; several → numbered choices
 * with the command for each; none → try other words.
 */
function unresolvedText(locale: string, command: string, data: UnresolvedData): string {
  const candidates = data.candidates ?? [];
  if (data.unresolved === "ambiguous" && candidates.length === 1) {
    const only = candidates[0]!;
    return rt(locale, "cmd.unresolved.didYouMean", { label: only.label, command: `/${command} ${only.id}` });
  }
  if (data.unresolved === "ambiguous" && candidates.length > 1) {
    return [rt(locale, "cmd.unresolved.choose"), ...candidates.map((c, i) => rt(locale, "cmd.unresolved.option", { n: i + 1, label: c.label, command: `/${command} ${c.id}` }))].join("\n");
  }
  if (data.unresolved === "unknown-id") return rt(locale, "cmd.unresolved.unknownId", { id: data.id ?? "" });
  return rt(locale, "cmd.unresolved.none", { query: data.query ?? "" });
}

/** Levenshtein distance (short ids only). */
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length]!;
}

/** The closest candidate within a small edit distance (or a unique prefix), for "did you mean". */
export function closestMatch(input: string, candidates: readonly string[]): string | null {
  const needle = input.toLowerCase();
  if (!needle) return null;
  const prefixed = candidates.filter((c) => needle.length >= 2 && c.toLowerCase().startsWith(needle));
  if (prefixed.length === 1) return prefixed[0]!;
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const c of candidates) {
    const d = editDistance(needle, c.toLowerCase());
    if (d <= Math.max(1, Math.min(3, Math.floor(Math.max(needle.length, c.length) / 3))) && d < bestDistance) {
      best = c;
      bestDistance = d;
    }
  }
  return best;
}

/** Resolve "3" (1-based) or an id against a list. */
function pick<T extends { id: string }>(items: readonly T[], token: string): T | undefined {
  if (/^\d+$/.test(token)) return items[Number(token) - 1];
  return items.find((i) => i.id === token) ?? items.find((i) => i.id.toLowerCase() === token.toLowerCase());
}

/** Resolve an option token: id, letter (A, b…) or 1-based number. */
function pickOption<T extends { id: string }>(options: readonly T[], token: string): T | undefined {
  if (/^[A-Za-z]$/.test(token)) {
    const byId = options.find((o) => o.id === token);
    return byId ?? options[token.toUpperCase().charCodeAt(0) - 65];
  }
  return pick(options, token);
}

/* ------------------------------------------------------------------ */
/* Individual commands                                                 */
/* ------------------------------------------------------------------ */

function helpCommand(host: CommandHost): void {
  const L = host.locale;
  const all = host.commands();
  const builtin = all.filter((c) => c.source === "builtin");
  const custom = all.filter((c) => c.source !== "builtin");
  const rows = builtin.map((c) => [`/${c.name}${c.argumentHint ? ` ${c.argumentHint}` : ""}`, commandDescription(c, L)]);
  let text = `${rt(L, "cmd.help.header")}:\n${table(rows)}`;
  if (custom.length > 0) {
    text += `\n\n${rt(L, "cmd.help.custom")}:\n${table(custom.map((c) => [`/${c.name}${c.argumentHint ? ` ${c.argumentHint}` : ""}`, c.description]))}`;
  }
  host.output(text, { commands: all.map((c) => ({ name: c.name, description: commandDescription(c, L), argumentHint: c.argumentHint ?? null, source: c.source })) });
}

function caseCommand(host: CommandHost): void {
  const c = host.caseDef;
  const L = host.locale;
  const s = host.state();
  const p = progress(c, s);
  const sexKey = c.patient.sex === "male" ? "cmd.sex.male" : c.patient.sex === "female" ? "cmd.sex.female" : "cmd.sex.other";
  const ageUnit = isZh(L) ? { years: "岁", months: "个月", days: "天" }[c.patient.ageUnit] : { years: " y", months: " mo", days: " d" }[c.patient.ageUnit];
  const lines = [
    rt(L, "cmd.case.summary", { title: t(c.title, L), summary: t(c.summary, L) }),
    rt(L, "cmd.case.patient", { name: t(c.patient.displayName, L), age: `${c.patient.age}${ageUnit}`, sex: rt(L, sexKey), complaint: t(c.patient.chiefComplaint, L) }),
  ];
  if (c.patient.triageNote) lines.push(t(c.patient.triageNote, L));
  lines.push(`${rt(L, "label.objectives")} (${p.done}/${p.total}):`);
  for (const o of p.objectives) lines.push(`  ${o.done ? "✓" : o.current ? "▶" : "·"} ${objectiveTitle(c, o.id, L)}`);
  if (c.disclaimer) lines.push(rt(L, "cmd.case.disclaimer", { text: t(c.disclaimer, L) }));
  // No case id in the data either: ids name the diagnosis.
  host.output(lines.join("\n"), {
    title: t(c.title, L),
    summary: t(c.summary, L),
    patient: { name: t(c.patient.displayName, L), age: c.patient.age, ageUnit: c.patient.ageUnit, sex: c.patient.sex, chiefComplaint: t(c.patient.chiefComplaint, L) },
    objectives: p.objectives.map((o) => ({ ...o, title: objectiveTitle(c, o.id, L) })),
  });
}

async function askCommand(host: CommandHost, args: string): Promise<void> {
  const c = host.caseDef;
  const L = host.locale;
  if (!args) {
    const listed = listOptionsText({ caseDef: c, locale: L, state: () => host.state() }, "history");
    const items = listed.data as { id: string; question: string; asked: boolean }[];
    const rows = items.map((it, i) => [`${i + 1}.`, `${it.asked ? "✓" : " "} ${it.question}`]);
    host.output(`${rt(L, "label.history")}:\n${table(rows)}`, { items });
    return;
  }
  if (/^\d+$/.test(args)) {
    const items = listOptionsText({ caseDef: c, locale: L, state: () => host.state() }, "history").data as { id: string; question: string }[];
    const item = items[Number(args) - 1];
    if (!item) {
      host.output(rt(L, "cmd.badIndex", { index: args }), { error: "bad-index" });
      return;
    }
    const result = await host.learnerAction({ type: "ask", itemId: item.id, via: "button" });
    host.output(rt(L, "cmd.ask.answered", { question: item.question }), { itemId: item.id, accepted: result !== null && !result.rejected });
    return;
  }
  await host.sendMessage("patient", args);
}

async function examCommand(host: CommandHost, args: string): Promise<void> {
  if (!args) {
    const { text, data } = listOptionsText({ caseDef: host.caseDef, locale: host.locale, state: () => host.state() }, "exam");
    host.output(text, { items: data });
    return;
  }
  const isId = host.caseDef.exam.some((e) => e.id === args);
  toolOut(host, await host.runTool("examine", isId ? { finding_id: args } : { query: args }), "exam");
}

function resultsCommand(host: CommandHost): void {
  const c = host.caseDef;
  const L = host.locale;
  const orders = orderStatus(c, host.state());
  if (orders.length === 0) {
    host.output(rt(L, "tool.results.none"), { orders: [] });
    return;
  }
  const rows = [[isZh(L) ? "检查" : "Test", "id", rt(L, "label.phase"), isZh(L) ? "状态" : "Status"]];
  for (const o of orders) {
    const status = o.read ? rt(L, "label.read") : o.ready ? rt(L, "label.ready") : rt(L, "label.pendingUntil", { time: clockTime(c, o.order.readyAt, L, "ceil") });
    rows.push([investigationName(c, o.order.investigationId, L), o.order.investigationId, phaseLabel(c, o.order.phase, L), status]);
  }
  host.output(table(rows, { header: true }), {
    orders: orders.map((o) => ({ key: o.order.key, investigationId: o.order.investigationId, phase: o.order.phase, ready: o.ready, read: o.read, readyAt: o.order.readyAt })),
  });
}

async function answerCommand(host: CommandHost, args: string): Promise<void> {
  const tokens = splitArgs(args);
  if (tokens.length < 2) return usage(host, "answer", "<decision> <option…>");
  const decision = pick(host.caseDef.decisions, tokens[0]!);
  if (!decision) {
    host.output(rt(host.locale, "tool.noSuchId", { id: tokens[0]! }), { error: "unknown-decision" });
    return;
  }
  // Numbers/letters count in the order /board presents the options (presentedOptions), not the authored order.
  const presented = presentedOptions(host.caseDef, decision);
  const options = tokens.slice(1).flatMap((tok) => tok.split(/[,，]/)).filter(Boolean).map((tok) => pickOption(presented, tok)?.id ?? tok);
  toolOut(host, await host.runTool("answer_decision", { decision_id: decision.id, option_ids: options }));
}

function statusCommand(host: CommandHost): void {
  const L = host.locale;
  const s = host.settings;
  const status = caseStatusText({ caseDef: host.caseDef, locale: L, state: () => host.state() });
  const rows = [
    // Title only: case ids name the diagnosis (the picker, MCP and the web library never show them).
    [rt(L, "label.case"), t(host.caseDef.title, L)],
    [rt(L, "label.provider"), s.provider],
    [rt(L, "label.model"), host.resolvedModel?.() ?? s.model ?? "-"],
    [rt(L, "label.approval"), s.approvalMode],
    [rt(L, "label.scope"), s.practiceScope],
    [rt(L, "label.locale"), L],
    [rt(L, "label.interlocutor"), host.interlocutor()],
    [rt(L, "label.hints"), String(host.state().hints)],
  ];
  host.output(`${table(rows)}\n\n${status.text}`, {
    settings: { provider: s.provider, model: s.model, approvalMode: s.approvalMode, practiceScope: s.practiceScope, locale: L, interlocutor: host.interlocutor() },
    status: status.data,
  });
}

function planCommand(host: CommandHost): void {
  const L = host.locale;
  const plan = host.plan();
  if (plan.items.length === 0) {
    host.output(rt(L, "cmd.plan.empty"), plan);
    return;
  }
  const mark = { pending: "·", in_progress: "▶", completed: "✓" } as const;
  const lines = [`${rt(L, "label.plan")}:`, ...(plan.explanation ? [plan.explanation] : []), ...plan.items.map((p) => `  ${mark[p.status] ?? "·"} ${p.text}`)];
  host.output(lines.join("\n"), plan);
}

function debriefCommand(host: CommandHost): void {
  const c = host.caseDef;
  const L = host.locale;
  const s = host.state();
  if (!s.finished && !progress(c, s).complete) {
    host.output(rt(L, "cmd.debrief.locked"), { locked: true });
    return;
  }
  const d = c.debrief;
  const section = (key: RuntimeKey, items: string[]) => (items.length > 0 ? [`${rt(L, key)}:`, ...items.map((x) => `  - ${x}`)] : []);
  const lines = [
    t(d.title, L),
    t(d.conclusion, L),
    ...section("cmd.debrief.reasoning", d.keyReasoning.map((x) => t(x, L))),
    ...section("cmd.debrief.teaching", d.teachingPoints.map((x) => t(x, L))),
    ...(d.boundaries ? [`${rt(L, "cmd.debrief.boundaries")}: ${t(d.boundaries, L)}`] : []),
    ...section("cmd.debrief.unknowns", d.unknowns.map((x) => t(x, L))),
    ...section("cmd.debrief.references", d.references),
    d.notice ? t(d.notice, L) : rt(L, "cmd.debrief.notice"),
  ];
  host.output(lines.join("\n"), {
    title: t(d.title, L),
    conclusion: t(d.conclusion, L),
    keyReasoning: d.keyReasoning.map((x) => t(x, L)),
    teachingPoints: d.teachingPoints.map((x) => t(x, L)),
    boundaries: d.boundaries ? t(d.boundaries, L) : null,
    unknowns: d.unknowns.map((x) => t(x, L)),
    references: d.references,
    notice: d.notice ? t(d.notice, L) : rt(L, "cmd.debrief.notice"),
  });
}

async function settingCommand<V extends string>(
  host: CommandHost,
  name: string,
  args: string,
  label: RuntimeKey,
  current: string,
  allowed: readonly V[] | null,
  patch: (value: V) => RuntimeConfigPatch,
): Promise<void> {
  const L = host.locale;
  if (!args) {
    host.output(rt(L, "cmd.set", { label: rt(L, label), value: current }), { [name]: current, allowed });
    return;
  }
  if (allowed && !allowed.includes(args as V)) {
    host.output(rt(L, "cmd.invalidValue", { value: args, allowed: allowed.join(", ") }), { error: "invalid-value", allowed });
    return;
  }
  await host.configure(patch(args as V));
  host.output(rt(host.locale, "cmd.set", { label: rt(host.locale, label), value: args }), { [name]: args });
}

async function providerCommand(host: CommandHost, args: string): Promise<void> {
  const L = host.locale;
  if (!args) {
    const rows = PROVIDER_TEMPLATES.map((p) => [p.id === host.settings.provider ? `* ${p.id}` : `  ${p.id}`, localizedName(p.name, L), p.defaultModel ?? ""]);
    host.output(`${rt(L, "cmd.providers.header")}:\n${table(rows)}`, {
      current: host.settings.provider,
      providers: PROVIDER_TEMPLATES.map((p) => ({ id: p.id, name: localizedName(p.name, L), wire: p.wire, defaultModel: p.defaultModel ?? null })),
    });
    return;
  }
  // Catalogue templates, providers defined in settings, and `proxy:<upstream>` (as `providers test` accepts).
  const known = [...new Set([...PROVIDER_TEMPLATES.map((p) => p.id), ...Object.keys(host.settings.providers ?? {})])];
  if (!known.includes(args) && !/^proxy:\S+$/.test(args)) {
    const hint = closestMatch(args, known);
    const text = [rt(L, "cmd.invalidValue", { value: args, allowed: known.join(", ") }), ...(hint ? [rt(L, "cmd.didYouMean", { value: hint })] : [])].join("\n");
    host.output(text, { error: "invalid-value", allowed: known, suggestion: hint });
    return;
  }
  await host.configure({ provider: args });
  host.output(rt(host.locale, "cmd.set", { label: rt(host.locale, "label.provider"), value: args }), { provider: args });
}

function permissionsCommand(host: CommandHost): void {
  const L = host.locale;
  const p = host.settings.permissions;
  const session = host.sessionRules();
  // One rule per line, never truncated: a cut-off rule list hides what still needs approval.
  const ruleRows = (label: string, rules: readonly string[]): string[][] => (rules.length === 0 ? [[label, "-"]] : rules.map((rule, i) => [i === 0 ? label : "", rule]));
  const rows: string[][] = [
    ...ruleRows(rt(L, "perm.label.allow"), p.allow),
    ...ruleRows(rt(L, "perm.label.ask"), p.ask),
    ...ruleRows(rt(L, "perm.label.deny"), p.deny),
    ...ruleRows(rt(L, "cmd.permissions.session"), session),
    [rt(L, "label.approval"), host.settings.approvalMode],
    [rt(L, "label.scope"), host.settings.practiceScope],
  ];
  host.output(table(rows, { maxCell: 400 }), { ...p, session, approvalMode: host.settings.approvalMode, practiceScope: host.settings.practiceScope });
}

async function hintCommand(host: CommandHost): Promise<void> {
  const c = host.caseDef;
  const L = host.locale;
  const objective = currentObjective(c, host.state());
  if (!objective) {
    host.output(rt(L, "tool.hint.none"), { objectiveId: null });
    return;
  }
  const result = await host.learnerAction({ type: "hint" });
  const hint = t(objective.hint, L);
  host.output(rt(L, "cmd.hint.text", { hint }), { objectiveId: objective.id, hint, accepted: result !== null && !result.rejected });
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

/**
 * Execute a slash command. Unknown names emit a localised error output.
 * Never throws for user errors.
 */
export async function executeCommand(host: CommandHost, name: string, args: string): Promise<void> {
  const L = host.locale;
  const c = host.caseDef;
  const a = args.trim();
  const ctx = { caseDef: c, locale: L, state: () => host.state() };
  switch (name) {
    case "help":
    case "?":
      return helpCommand(host);
    case "case":
      return caseCommand(host);
    case "ask":
      return askCommand(host, a);
    case "exam":
    case "examine":
      return examCommand(host, a);
    case "order":
      if (!a) return usage(host, name, "<query>");
      return toolOut(host, await host.runTool("order_test", c.investigations.some((i) => i.id === a) ? { investigation_id: a } : { query: a }), "order");
    case "results":
      return resultsCommand(host);
    case "read": {
      const [id, phase] = splitArgs(a);
      if (!id) return usage(host, name, "<id> [phase]");
      return toolOut(host, await host.runTool("read_result", { investigation_id: id, ...(phase ? { phase } : {}) }), "read");
    }
    case "give":
      if (!a) return usage(host, name, "<query>");
      return toolOut(host, await host.runTool("intervene", c.interventions.some((i) => i.id === a) ? { intervention_id: a } : { query: a }), "give");
    case "vitals":
      return toolOut(host, await host.runTool("check_vitals", {}));
    case "board": {
      const { text, data } = listOptionsText(ctx, "decisions");
      return host.output(text, { decisions: data });
    }
    case "answer":
      return answerCommand(host, a);
    case "phase": {
      if (!a) {
        const { text, data } = listOptionsText(ctx, "phases");
        return host.output(text, { phases: data });
      }
      return toolOut(host, await host.runTool("set_phase", { phase: a }));
    }
    case "wait": {
      if (!a || !Number.isFinite(Number(a))) return usage(host, name, "<minutes>");
      const out = await host.runTool("wait", { minutes: Number(a) });
      // The alarms, staff lines and announcements of the wait were already shown live: do not repeat them.
      const meanwhile = (out.data as { meanwhile?: unknown } | undefined)?.meanwhile;
      return toolOut(host, typeof meanwhile === "string" && meanwhile ? { ...out, output: out.output.split("\n").filter((line) => line !== meanwhile).join("\n") } : out);
    }
    case "hint":
      return hintCommand(host);
    case "status":
      return statusCommand(host);
    case "plan":
      return planCommand(host);
    case "note": {
      if (!a) return usage(host, name, "<text>");
      const result = await host.learnerAction({ type: "note", text: a.slice(0, 4000) });
      return host.output(rt(L, "cmd.note.added"), { accepted: result !== null && !result.rejected });
    }
    case "talk": {
      if (!a) return host.output(rt(L, "cmd.talk.now", { agent: host.interlocutor() }), { interlocutor: host.interlocutor(), agents: host.agentNames() });
      const agent = resolveAgentAlias(a);
      if (!host.agentNames().includes(agent)) return host.output(rt(L, "cmd.talk.unknown", { agent, agents: joinList(L, host.agentNames()) }), { error: "unknown-agent" });
      await host.configure({ interlocutor: agent });
      return host.output(rt(L, "cmd.talk.now", { agent }), { interlocutor: agent });
    }
    case "consult": {
      const [role, ...rest] = splitArgs(a);
      if (!role || rest.length === 0) return usage(host, name, "<role> <question>");
      const agent = resolveAgentAlias(role);
      if (!host.agentNames().includes(agent)) return host.output(rt(L, "cmd.talk.unknown", { agent, agents: joinList(L, host.agentNames()) }), { error: "unknown-agent" });
      return host.sendMessage(agent, a.slice(a.indexOf(role) + role.length).trim());
    }
    case "autopilot":
      return host.autopilot(a || undefined);
    case "finish":
      return toolOut(host, await host.runTool("finish_case", {}));
    case "assess":
      return host.assess();
    case "debrief":
      return debriefCommand(host);
    case "model":
      return settingCommand(host, "model", a, "label.model", host.settings.model ?? "-", null, (v) => ({ model: v }));
    case "provider":
      return providerCommand(host, a);
    case "approval":
      return settingCommand(host, "approvalMode", a, "label.approval", host.settings.approvalMode, APPROVAL_MODES, (v) => ({ approvalMode: v }));
    case "scope":
      return settingCommand(host, "practiceScope", a, "label.scope", host.settings.practiceScope, SCOPES, (v) => ({ practiceScope: v }));
    case "permissions":
      return permissionsCommand(host);
    case "compact":
      return host.compact(a || undefined);
    case "export": {
      const snapshot = host.snapshot();
      return host.output(rt(L, "cmd.export.done", { count: snapshot.actions.length, path: a ? ` → ${a}` : "" }), { snapshot, path: a || null });
    }
    case "lang":
      return settingCommand(host, "locale", a, "label.locale", L, LANGS, (v) => ({ locale: v }));
    case "clear":
      host.clearConversations();
      return host.output(rt(L, "cmd.clear.done"), { cleared: true });
    case "quit":
    case "exit":
      host.output("", { action: "quit" });
      return host.shutdown();
    default: {
      const custom = host.commands().find((cmd) => cmd.name === name && cmd.template !== undefined);
      if (!custom) return host.output(rt(L, "cmd.unknown", { name }), { error: "unknown-command" });
      const target = (custom.agent ?? host.interlocutor()).replace(/^@/, "").toLowerCase();
      // A template is a free-text prompt: an offline responder that ignores prompts (the examiner runs a
      // full assessment, the attending gives its generic nudge) would answer something else — say so.
      if (host.ignoresPromptsOffline?.(target)) {
        return host.output(rt(L, "cmd.custom.needsModel", { name, agent: target }), { error: "needs-model", agent: target });
      }
      const text = expandCommandTemplate(custom.template ?? "", a);
      return host.sendMessage(custom.agent ?? null, text);
    }
  }
}
