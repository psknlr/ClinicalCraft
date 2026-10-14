/**
 * NPC-only tools (docs/PROTOCOL.md §3): `reveal_facts` (patient/companion),
 * `get_vitals` (nurse), `get_results` (nurse/radiologist/pathologist),
 * `get_progress` and `give_hint` (attending).
 *
 * Need-to-know: `get_results` returns report content only for results the
 * learner has already read (the nurse may additionally report that a result
 * is back or pending); consultants restricted by the case's `npcs[].interprets`
 * see nothing outside it. `reveal_facts` enforces the disclosure policy
 * (phase availability; `specific` facts need a direct question).
 */
import {
  availableDecisions,
  currentObjective,
  matchHistory,
  orderStatus,
  progress,
  t,
  vitalsAt,
  type CaseDefinition,
} from "@clinicalcraft/core";
import { isZh, joinList, rt } from "../session/i18n.js";
import { actorFor, strArg, type ToolArgs } from "./clinical.js";
import { formatResult, investigationName, objectiveTitle, phaseLabel, vitalsText } from "./format.js";
import type { ToolContext, ToolDefinition } from "./types.js";

/** Matcher score a `specific` fact needs from the learner's question (ARCHITECTURE §4.2). */
export const SPECIFIC_DISCLOSURE_THRESHOLD = 0.55;

export interface NpcToolOptions {
  /** The learner utterance currently being answered (for the `specific` disclosure gate). */
  utterance?: () => string | null;
}

function uniqueIds(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [...new Set(list.map((x) => String(x).trim()).filter(Boolean))];
}

/** Fact answers for ids (ledger/tool output formatting). */
export function factAnswers(c: CaseDefinition, ids: readonly string[], locale: string): { id: string; answer: string }[] {
  return ids.flatMap((id) => {
    const h = c.history.find((x) => x.id === id);
    return h ? [{ id, answer: t(h.answer, locale) }] : [];
  });
}

function revealFacts(options: NpcToolOptions): ToolDefinition<ToolArgs> {
  return {
    name: "reveal_facts",
    description:
      "Look up the authored answers for history facts (ids from your fact index) BEFORE you mention them. " +
      "You may only say what this tool returns. Ask for the fewest facts that answer the question.",
    inputSchema: {
      type: "object",
      properties: { fact_ids: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1, maxItems: 5 } },
      required: ["fact_ids"],
      additionalProperties: false,
    },
    readOnly: true,
    sideEffect: "record",
    scope: "history-only",
    risk: () => "none",
    summarize: (args, ctx) => rt(ctx.locale, "sum.reveal", { ids: uniqueIds(args.fact_ids).join(", ") }),
    async run(args, ctx) {
      const c = ctx.caseDef;
      const L = ctx.locale;
      const s = ctx.state();
      const ids = uniqueIds(args.fact_ids);
      const utterance = options.utterance?.() ?? null;
      const scores = utterance ? new Map(matchHistory(c, utterance, L).map((h) => [h.id, h.score])) : null;
      const unknown: string[] = [];
      const locked: string[] = [];
      const specific: string[] = [];
      const revealed: string[] = [];
      for (const id of ids) {
        const item = c.history.find((h) => h.id === id);
        if (!item) unknown.push(id);
        else if (item.phases && !item.phases.includes(s.phase)) locked.push(id);
        else if (item.disclosure === "specific" && scores && (scores.get(id) ?? 0) < SPECIFIC_DISCLOSURE_THRESHOLD) specific.push(id);
        else revealed.push(id);
      }
      for (const id of revealed) {
        if (!ctx.state().asked.includes(id)) ctx.dispatch({ type: "ask", itemId: id, via: "agent", by: actorFor(ctx) });
      }
      const lines: string[] = [];
      const answers = factAnswers(c, revealed, L);
      if (answers.length > 0) {
        lines.push(rt(L, "tool.facts.revealed"));
        for (const a of answers) lines.push(`[${a.id}] ${a.answer}`);
      }
      if (unknown.length > 0) lines.push(rt(L, "tool.facts.unknown", { ids: unknown.join(", ") }));
      if (locked.length > 0) lines.push(rt(L, "tool.facts.phase", { ids: locked.join(", ") }));
      if (specific.length > 0) lines.push(rt(L, "tool.facts.specific", { ids: specific.join(", ") }));
      return { ok: revealed.length > 0, output: lines.join("\n"), data: { grounded: revealed, revealed: answers, unknown, locked, specific } };
    },
  };
}

const getVitals: ToolDefinition<ToolArgs> = {
  name: "get_vitals",
  description: "Read the bedside monitor (current vital signs, trends, alarms).",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  readOnly: true,
  sideEffect: "none",
  scope: "history-only",
  risk: () => "none",
  summarize: (_args, ctx) => rt(ctx.locale, "sum.vitals"),
  async run(_args, ctx) {
    const snapshot = vitalsAt(ctx.caseDef, ctx.state());
    return { ok: true, output: vitalsText(snapshot, ctx.locale, `${ctx.state().clock} ${rt(ctx.locale, "label.minute")}`), data: snapshot };
  },
};

/** Investigation ids an NPC role may interpret (empty = no restriction). */
export function interpretableBy(c: CaseDefinition, role: string): string[] {
  return c.npcs.filter((n) => n.role === role).flatMap((n) => n.interprets);
}

/** Text of the results this agent may see (read results only; the nurse also reports readiness). */
export function obtainedResultsText(ctx: Pick<ToolContext, "caseDef" | "locale" | "state" | "agent">, investigationId: string | null): { ok: boolean; text: string; data: unknown[] } {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const s = ctx.state();
  const role = String(ctx.agent);
  const remit = interpretableBy(c, role);
  const isNurse = role === "nurse";
  const lines: string[] = [];
  const data: unknown[] = [];
  const orders = orderStatus(c, s).filter((o) => investigationId === null || o.order.investigationId === investigationId);
  if (investigationId !== null && !isNurse && remit.length > 0 && !remit.includes(investigationId)) {
    return { ok: false, text: rt(L, "tool.results.notInScope"), data: [] };
  }
  for (const o of orders) {
    const id = o.order.investigationId;
    if (!isNurse && remit.length > 0 && !remit.includes(id)) continue;
    if (o.read) {
      const formatted = formatResult(c, id, o.order.phase, L);
      lines.push(formatted.text);
      data.push(formatted.data);
    } else if (isNurse) {
      const name = investigationName(c, id, L);
      const phase = phaseLabel(c, o.order.phase, L);
      lines.push(o.ready ? rt(L, "tool.results.ready", { name, phase }) : rt(L, "tool.results.pending", { name, phase, minute: o.order.readyAt }));
      data.push({ investigationId: id, phase: o.order.phase, ready: o.ready, read: false });
    }
  }
  if (lines.length === 0) return { ok: false, text: investigationId ? rt(L, "tool.results.notObtained") : rt(L, "tool.results.none"), data };
  return { ok: true, text: lines.join("\n\n"), data };
}

const getResults: ToolDefinition<ToolArgs> = {
  name: "get_results",
  description:
    "Look up results the learner has already obtained (omit investigation_id for all of them). " +
    "Results the learner has not read are not available to you — never guess them.",
  inputSchema: { type: "object", properties: { investigation_id: { type: "string" } }, additionalProperties: false },
  readOnly: true,
  sideEffect: "none",
  scope: "history-only",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.getResults", { name: strArg(args, "investigation_id") ? investigationName(ctx.caseDef, strArg(args, "investigation_id"), ctx.locale) : "*" }),
  specifier: (args) => strArg(args, "investigation_id"),
  async run(args, ctx) {
    const id = strArg(args, "investigation_id") || null;
    const r = obtainedResultsText(ctx, id);
    return { ok: r.ok, output: r.text, data: r.data };
  },
};

/** Attending view of progress: objectives (with the current hint), locked decisions' requirements. Never answers. */
export function progressText(ctx: Pick<ToolContext, "caseDef" | "locale" | "state">): { text: string; data: unknown } {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const s = ctx.state();
  const p = progress(c, s);
  const objective = currentObjective(c, s);
  const lines = [`${rt(L, "label.objectives")} (${p.done}/${p.total}):`];
  for (const o of p.objectives) lines.push(`  ${o.done ? "✓" : o.current ? "▶" : "·"} ${objectiveTitle(c, o.id, L)}`);
  if (objective) {
    lines.push(`${isZh(L) ? "当前目标提示" : "Current objective hint"}: ${t(objective.hint, L)}`);
    if (objective.guidance) lines.push(`${isZh(L) ? "指引" : "Guidance"}: ${t(objective.guidance, L)}`);
  }
  const decisions = availableDecisions(c, s).filter((d) => !d.decided);
  for (const d of decisions) lines.push(`- ${t(d.decision.prompt, L)}: ${d.unlocked ? rt(L, "label.unlocked") : t(d.decision.need, L)}`);
  lines.push(
    `${rt(L, "label.history")}: ${s.asked.length}/${c.history.length} · ${rt(L, "label.exam")}: ${s.examined.length}/${c.exam.length} · ${rt(L, "label.orders")}: ${s.orders.length} · ${rt(L, "label.hints")}: ${s.hints}`,
  );
  return { text: lines.join("\n"), data: { progress: p, currentObjective: objective?.id ?? null, hints: s.hints } };
}

const getProgress: ToolDefinition<ToolArgs> = {
  name: "get_progress",
  description: "See the learner's progress: objectives, the current objective's teaching hint, what each open decision still needs, and counts.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  readOnly: true,
  sideEffect: "none",
  scope: "history-only",
  risk: () => "none",
  summarize: (_args, ctx) => rt(ctx.locale, "sum.progress"),
  async run(_args, ctx) {
    const { text, data } = progressText(ctx);
    return { ok: true, output: text, data };
  },
};

const giveHint: ToolDefinition<ToolArgs> = {
  name: "give_hint",
  description: "Record that you gave the learner a hint (counts against their score) and get the current objective's hint text to paraphrase Socratically.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  readOnly: true,
  sideEffect: "record",
  scope: "history-only",
  risk: () => "none",
  summarize: (_args, ctx) => rt(ctx.locale, "sum.hint"),
  async run(_args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const objective = currentObjective(c, ctx.state());
    if (!objective) return { ok: true, output: rt(L, "tool.hint.none"), data: { objectiveId: null } };
    ctx.dispatch({ type: "hint", by: actorFor(ctx) });
    const parts = [t(objective.hint, L), objective.guidance ? t(objective.guidance, L) : ""].filter(Boolean);
    return { ok: true, output: joinList(L, parts), data: { objectiveId: objective.id, hint: t(objective.hint, L) } };
  },
};

/** NPC tools; `options.utterance` feeds the `specific` disclosure gate of reveal_facts. */
export function npcTools(options: NpcToolOptions = {}): ToolDefinition<ToolArgs>[] {
  return [revealFacts(options), getVitals, getResults, getProgress, giveHint];
}
