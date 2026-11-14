/**
 * NPC-only tools (docs/PROTOCOL.md §3): `reveal_facts` (patient/companion),
 * `get_vitals` (nurse), `get_results` (nurse/radiologist/pathologist),
 * `get_progress`, `give_hint`, `place_hold` and `release_hold` (attending: an explicit hold on a step, in the
 * speaker's own name — docs/PROTOCOL.md §3.1).
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
  historyAvailable,
  historyTwin,
  matchHistory,
  orderStatus,
  progress,
  t,
  vitalsAt,
  type CaseDefinition,
} from "@clinicalcraft/core";
import { isZh, joinList, rt } from "../session/i18n.js";
import { actorFor, lockedDecisionLabel, rejectedOutput, resolveIntervention, strArg, type ToolArgs } from "./clinical.js";
import { modalityText, resultStatus } from "./clinical-resolve.js";
import { sentence } from "../session/i18n-checklist.js";
import { holdLines, objectiveRequirementLines } from "./requirements.js";
import { clockTime, formatResult, interventionLabel, investigationName, objectiveTitle, phaseLabel, vitalsText } from "./format.js";
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
      const utterance = options.utterance?.() ?? null;
      // Phase twins: a fact superseded in this phase is revealed as the item that supersedes it (`supersedes`).
      const ids = uniqueIds(uniqueIds(args.fact_ids).map((id) => historyTwin(c, id, s.phase) ?? id));
      const scores = utterance ? new Map(matchHistory(c, utterance, L, { phase: s.phase }).map((h) => [h.id, h.score])) : null;
      const unknown: string[] = [];
      const locked: string[] = [];
      const specific: string[] = [];
      const revealed: string[] = [];
      for (const id of ids) {
        const item = c.history.find((h) => h.id === id);
        if (!item) unknown.push(id);
        else if (!historyAvailable(c, id, s.phase)) locked.push(id);
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
    return { ok: true, output: vitalsText(snapshot, ctx.locale, clockTime(ctx.caseDef, ctx.state().clock, ctx.locale)), data: snapshot };
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
      // the clinician's own status (`resultStatus`): a result the case has none of is never "back"
      const name = investigationName(c, id, L);
      const phase = phaseLabel(c, o.order.phase, L);
      const status = resultStatus(c, o);
      lines.push(
        status === "no-record"
          ? rt(L, "tool.results.noRecord", { name, phase })
          : status === "not-acquired"
            ? rt(L, "tool.results.atModality", { name, phase, modality: modalityText(o.order, L) })
            : status === "ready"
              ? rt(L, "tool.results.ready", { name, phase })
              : rt(L, "tool.results.pending", { name, phase, time: clockTime(c, o.order.readyAt ?? o.order.orderedAt, L, "ceil") }),
      );
      data.push({ investigationId: id, phase: o.order.phase, ready: status === "ready", read: false, status });
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
  // what the current objective still needs, and who holds what (the attending's own holds among them)
  lines.push(...objectiveRequirementLines(c, s, L, new Set([s.phase])), ...holdLines(c, s, L));
  const decisions = availableDecisions(c, s).filter((d) => !d.decided);
  // A locked decision's prompt may state results not yet obtained: name it, show what it needs.
  for (const d of decisions) lines.push(`- ${d.unlocked ? t(d.decision.prompt, L) : lockedDecisionLabel(c, d.decision.id, L)}: ${d.unlocked ? rt(L, "label.unlocked") : t(d.decision.need, L)}`);
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

/**
 * Who holds: the speaking agent's role ("attending"), never an argument — a model cannot place or release a hold
 * in someone else's name (docs/PROTOCOL.md §3.1).
 */
function holderOf(ctx: Pick<ToolContext, "agent">): string {
  return ctx.agent;
}

function holdTarget(args: ToolArgs, ctx: Pick<ToolContext, "caseDef" | "locale">): { id: string; name: string } | null {
  const r = resolveIntervention(ctx.caseDef, args, ctx.locale);
  if (r.kind !== "id") return null;
  return { id: r.id, name: interventionLabel(ctx.caseDef, r.id, ctx.locale) };
}

const HOLD_SCHEMA = (text: "reason" | "reassessment", what: string) => ({
  type: "object",
  properties: {
    intervention_id: { type: "string", description: "Exact intervention id (e.g. the induction)." },
    query: { type: "string", maxLength: 300, description: "Free text when the id is unknown." },
    [text]: { type: "string", minLength: 1, maxLength: 1000, description: what },
  },
  required: [text],
  additionalProperties: false,
});

const placeHold: ToolDefinition<ToolArgs> = {
  name: "place_hold",
  description:
    "Withhold clearance for a step (e.g. induction) and record it in the case: who you are and why. While the hold stands the step is refused for everyone. " +
    "Missing information alone is not a reason; hold when you judge it unsafe to proceed now.",
  inputSchema: HOLD_SCHEMA("reason", "Why you withhold clearance, and what would change your mind."),
  readOnly: false,
  sideEffect: "record",
  scope: "history-only",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.place_hold", { name: holdTarget(args, ctx)?.name ?? (strArg(args, "intervention_id") || strArg(args, "query")) }),
  specifier: (args) => strArg(args, "intervention_id") || strArg(args, "query"),
  async run(args, ctx) {
    const L = ctx.locale;
    const target = holdTarget(args, ctx);
    if (!target) return { ok: false, output: rt(L, "tool.noMatch", { query: strArg(args, "intervention_id") || strArg(args, "query") }) };
    const by = holderOf(ctx);
    const reason = strArg(args, "reason");
    const result = ctx.dispatch({ type: "hold", interventionId: target.id, placedBy: by, reason, by: actorFor(ctx) });
    if (result.rejected) return rejectedOutput(L, result, result.rejected.message);
    return { ok: true, output: rt(L, "hold.placed", { name: target.name, by, reason: sentence(reason) }), data: { interventionId: target.id, placedBy: by, reason } };
  },
};

const releaseHold: ToolDefinition<ToolArgs> = {
  name: "release_hold",
  description:
    "Release a hold you placed, after you have reassessed: record the reassessment (it may be a documented decision to proceed under stated uncertainty). " +
    "You can release only your own hold.",
  inputSchema: HOLD_SCHEMA("reassessment", "What you reassessed and what you decided."),
  readOnly: false,
  sideEffect: "record",
  scope: "history-only",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.release_hold", { name: holdTarget(args, ctx)?.name ?? (strArg(args, "intervention_id") || strArg(args, "query")) }),
  specifier: (args) => strArg(args, "intervention_id") || strArg(args, "query"),
  async run(args, ctx) {
    const L = ctx.locale;
    const target = holdTarget(args, ctx);
    if (!target) return { ok: false, output: rt(L, "tool.noMatch", { query: strArg(args, "intervention_id") || strArg(args, "query") }) };
    const by = holderOf(ctx);
    const reassessment = strArg(args, "reassessment");
    const result = ctx.dispatch({ type: "release-hold", interventionId: target.id, releasedBy: by, reassessment, by: actorFor(ctx) });
    if (result.rejected?.code === "invalid" && !(ctx.state().holds ?? []).some((h) => h.interventionId === target.id && !h.released)) {
      return { ok: false, output: rt(L, "hold.none", { name: target.name }), data: { rejected: result.rejected } };
    }
    if (result.rejected) return rejectedOutput(L, result, result.rejected.message);
    return { ok: true, output: rt(L, "hold.released", { name: target.name, by, reassessment: sentence(reassessment) }), data: { interventionId: target.id, releasedBy: by, reassessment } };
  },
};

/** NPC tools; `options.utterance` feeds the `specific` disclosure gate of reveal_facts. */
export function npcTools(options: NpcToolOptions = {}): ToolDefinition<ToolArgs>[] {
  return [revealFacts(options), getVitals, getResults, getProgress, giveHint, placeHold, releaseHold];
}
