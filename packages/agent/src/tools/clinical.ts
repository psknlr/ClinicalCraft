/**
 * Clinical tools (docs/PROTOCOL.md §3). Each wraps the deterministic engine
 * through `ctx.dispatch` (so every state change emits clinical events and is
 * transcribed) and returns localised text for the model plus typed `data`
 * for UIs.
 *
 * Information discipline: tools only return what the action itself reveals
 * (an examined finding, a result that was read) or learner-visible
 * metadata (names, ids, phases, objective titles). `list_options` never
 * returns findings, results or answers; ambiguous queries return the
 * candidate names and perform no action.
 */
import {
  availableDecisions,
  currentObjective,
  historyAvailable,
  historyVoice,
  orderStatus,
  orderWarnings,
  presentedOptions,
  progress,
  resultFor,
  t,
  vitalsAt,
  type CaseDefinition,
  type ClinicalAction,
  type DomainEvent,
  type ReduceResult,
  type SessionState,
} from "@clinicalcraft/core";
import type { PlanItem } from "../protocol.js";
import { isZh, joinList, rt, type RuntimeKey } from "../session/i18n.js";
import { nonVerbalNarration, nonVerbalReason } from "../session/nonverbal.js";
import { availableInPhase, clockTime, formatResult, interventionLabel, investigationName, learnerVitals, noReading, objectiveTitle, phaseLabel, vitalLabel, vitalWithUnit, vitalsText } from "./format.js";
import {
  actorFor,
  capabilityRefusal,
  maxDosesRefusal,
  orderStatusText,
  readPhase,
  rejectedOutput,
  resolveFinding,
  resolveIntervention,
  resolveInvestigation,
  strArg,
  unresolvedOutput,
  type ToolArgs,
} from "./clinical-resolve.js";
import type { ToolContext, ToolDefinition, ToolOutput } from "./types.js";

export {
  RESOLVE_MARGIN,
  RESOLVE_THRESHOLD,
  actorFor,
  missingCapabilities,
  orderStatusText,
  readPhase,
  rejectedOutput,
  rejectionText,
  resolveFinding,
  resolveHits,
  resolveIntervention,
  resolveInvestigation,
  strArg,
  unresolvedOutput,
  type Resolution,
  type ToolArgs,
} from "./clinical-resolve.js";

/** "Result expected at 09:46 (now 09:01)." — due times round up, the current time down (`clockTime`). */
function readyAtText(c: CaseDefinition, readyAt: number, now: number, locale: string): string {
  return rt(locale, "tool.ordered.readyAt", { time: clockTime(c, readyAt, locale, "ceil"), now: clockTime(c, now, locale) });
}

function findingLabel(c: CaseDefinition, id: string, locale: string): string {
  const f = c.exam.find((e) => e.id === id);
  return f ? t(f.maneuver, locale) || id : id;
}

function eventsOf<T extends DomainEvent["type"]>(result: ReduceResult, type: T): Extract<DomainEvent, { type: T }>[] {
  return result.events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);
}

function dispatch(ctx: ToolContext, action: ClinicalAction): ReduceResult {
  return ctx.dispatch({ ...action, by: actorFor(ctx) } as ClinicalAction);
}

const EMPTY_SCHEMA = { type: "object", properties: {}, additionalProperties: false } as const;

/* ------------------------------------------------------------------ */
/* History & examination                                               */
/* ------------------------------------------------------------------ */

const askPatient: ToolDefinition<ToolArgs> = {
  name: "ask_patient",
  description:
    "Ask the patient (or the companion who answers for them) one natural-language question, as you would at the bedside. " +
    "Returns what they say. They only know their own history; they never report exam findings, results or diagnoses.",
  inputSchema: {
    type: "object",
    properties: { question: { type: "string", minLength: 1, maxLength: 2000, description: "The question, in the session language." } },
    required: ["question"],
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "record",
  scope: "history-only",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.ask", { question: strArg(args, "question") }),
  async run(args, ctx) {
    const reply = await ctx.ask("patient", strArg(args, "question"), ctx.signal);
    return { ok: true, output: reply.text, data: { text: reply.text, factIds: reply.grounded } };
  },
};

const LIST_KINDS = ["history", "exam", "investigations", "interventions", "decisions", "phases"] as const;
type ListKind = (typeof LIST_KINDS)[number];

const LIST_LABEL: Record<ListKind, RuntimeKey> = {
  history: "label.history",
  exam: "label.exam",
  investigations: "label.investigations",
  interventions: "label.interventions",
  decisions: "label.decisions",
  phases: "label.phases",
};

/** "Decision 3" — what a locked decision is called instead of its prompt. */
export function lockedDecisionLabel(c: CaseDefinition, decisionId: string, locale: string): string {
  return rt(locale, "label.decisionN", { n: c.decisions.findIndex((d) => d.id === decisionId) + 1 });
}

/**
 * Phases a learner (or clinician model) may be told about: the current one,
 * learner-switchable ones, the initial phase and phases the session has
 * worked in (orders, reads). Future automatic phases stay unannounced.
 */
export function visiblePhases(c: CaseDefinition, s: SessionState): Set<string> {
  const shown = new Set<string>([s.phase, c.initialPhase ?? c.phases[0]?.id ?? s.phase]);
  for (const p of c.phases) if (p.learnerSwitchable) shown.add(p.id);
  for (const o of s.orders) shown.add(o.phase);
  for (const key of s.seen) shown.add(key.slice(key.lastIndexOf("@") + 1));
  return new Set(c.phases.map((p) => p.id).filter((id) => shown.has(id)));
}

/** Names/ids only — never findings, results or correct answers. */
export function listOptionsText(ctx: Pick<ToolContext, "caseDef" | "locale" | "state">, kind: ListKind): { text: string; data: unknown[] } {
  const c = ctx.caseDef;
  const s = ctx.state();
  const L = ctx.locale;
  const mark = (on: boolean, label: RuntimeKey) => (on ? ` (${rt(L, label)})` : "");
  const lines: string[] = [];
  const data: unknown[] = [];
  switch (kind) {
    case "history":
      // Nobody can answer now (the patient cannot speak and there is no companion): no item can be asked.
      if (historyVoice(c, s) === "none") {
        lines.push(rt(L, "tool.list.cannotAnswer", { text: nonVerbalNarration(c, nonVerbalReason(c, s, L) ?? "", L) }));
        break;
      }
      // Items superseded in this phase by a phase twin (`supersedes`) cannot be asked here.
      for (const h of c.history.filter((x) => historyAvailable(c, x.id, s.phase))) {
        const asked = s.asked.includes(h.id);
        lines.push(`- [${h.id}] ${t(h.question, L)}${mark(asked, "label.asked")}`);
        data.push({ id: h.id, question: t(h.question, L), topic: h.topic, asked });
      }
      break;
    case "exam":
      for (const e of c.exam.filter((x) => availableInPhase(x, s))) {
        const done = s.examined.includes(e.id);
        lines.push(`- [${e.id}] ${t(e.maneuver, L)}${mark(done, "label.done")}`);
        data.push({ id: e.id, maneuver: t(e.maneuver, L), system: e.system, examined: done });
      }
      break;
    case "investigations":
      for (const i of c.investigations) {
        const ordered = s.orders.some((o) => o.investigationId === i.id && o.phase === s.phase);
        lines.push(`- [${i.id}] ${t(i.name, L)} · ${i.category}${ordered ? " ✓" : ""}`);
        data.push({ id: i.id, name: t(i.name, L), category: i.category, orderedThisPhase: ordered, risk: i.risk });
      }
      break;
    case "interventions":
      for (const i of c.interventions) {
        const given = s.interventions.filter((r) => r.interventionId === i.id).length;
        lines.push(`- [${i.id}] ${interventionLabel(c, i.id, L)}${given > 0 ? ` ×${given}` : ""}`);
        data.push({ id: i.id, name: t(i.name, L), dose: i.dose ? t(i.dose, L) : null, kind: i.kind, risk: i.risk, given });
      }
      break;
    case "decisions":
      for (const d of availableDecisions(c, s)) {
        const status = d.decided ? "label.decided" : d.unlocked ? "label.unlocked" : "label.locked";
        // A locked decision's prompt and options can state results not yet obtained (or another
        // decision's answer): only a placeholder and what it still needs.
        if (!d.unlocked && !d.decided) {
          lines.push(`- [${d.decision.id}] ${lockedDecisionLabel(c, d.decision.id, L)}`);
          lines.push(`    ${t(d.decision.need, L)}`);
          data.push({ id: d.decision.id, prompt: null, kind: d.decision.kind, unlocked: false, decided: false, need: t(d.decision.need, L), options: [] });
          continue;
        }
        const options = presentedOptions(c, d.decision);
        lines.push(`- [${d.decision.id}] ${t(d.decision.prompt, L)} (${rt(L, status)})`);
        for (const o of options) lines.push(`    [${o.id}] ${t(o.text, L)}`);
        data.push({
          id: d.decision.id,
          prompt: t(d.decision.prompt, L),
          kind: d.decision.kind,
          unlocked: d.unlocked,
          decided: d.decided,
          options: options.map((o) => ({ id: o.id, text: t(o.text, L) })),
        });
      }
      break;
    case "phases": {
      // Future automatic phases are not announced (their labels can name what will happen).
      const shown = visiblePhases(c, s);
      for (const p of c.phases.filter((x) => shown.has(x.id))) {
        const current = p.id === s.phase;
        // An automatic phase is not "locked": it follows the case clock (the current one is just current).
        lines.push(`- [${p.id}] ${t(p.label, L)}${mark(current, "label.current")}${mark(!current && !p.learnerSwitchable, "label.autoPhase")}`);
        data.push({ id: p.id, label: t(p.label, L), current, switchable: p.learnerSwitchable });
      }
      const hidden = c.phases.length - shown.size;
      if (hidden > 0) lines.push(`  ${rt(L, "tool.list.laterPhases", { count: hidden })}`);
      break;
    }
    default: {
      const never: never = kind;
      return never;
    }
  }
  return { text: `${rt(L, LIST_LABEL[kind])}:\n${lines.length > 0 ? lines.join("\n") : rt(L, "tool.list.empty")}`, data };
}

const listOptions: ToolDefinition<ToolArgs> = {
  name: "list_options",
  description:
    "List what can be asked, examined, ordered, given, decided or which phases exist (ids and names only — never findings or results). " +
    "Use it to find exact ids for other tools.",
  inputSchema: {
    type: "object",
    properties: { kind: { type: "string", enum: [...LIST_KINDS] } },
    required: ["kind"],
    additionalProperties: false,
  },
  readOnly: true,
  sideEffect: "none",
  scope: "history-only",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.listOptions", { kind: strArg(args, "kind") }),
  async run(args, ctx) {
    const kind = strArg(args, "kind") as ListKind;
    const { text, data } = listOptionsText(ctx, kind);
    return { ok: true, output: text, data: { kind, items: data } };
  },
};

const examine: ToolDefinition<ToolArgs> = {
  name: "examine",
  description:
    "Perform one physical-examination manoeuvre, by finding id or a free-text description (e.g. \"palpate the abdomen\"). " +
    "Returns the recorded finding, or that it is not recorded. Ambiguous descriptions return candidates and examine nothing.",
  inputSchema: {
    type: "object",
    properties: {
      finding_id: { type: "string", description: "Exact exam finding id from list_options(exam)." },
      query: { type: "string", maxLength: 500, description: "Free-text manoeuvre when the id is unknown." },
    },
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "record",
  scope: "history-only",
  risk: () => "none",
  summarize: (args, ctx) => {
    const r = resolveFinding(ctx.caseDef, args, ctx.locale, ctx.state().phase);
    return rt(ctx.locale, "sum.examine", { target: r.kind === "id" ? findingLabel(ctx.caseDef, r.id, ctx.locale) : strArg(args, "query") || strArg(args, "finding_id") });
  },
  specifier: (args, ctx) => {
    const r = resolveFinding(ctx.caseDef, args, ctx.locale, ctx.state().phase);
    return r.kind === "id" ? r.id : strArg(args, "finding_id") || strArg(args, "query");
  },
  precheck(args, ctx) {
    const r = resolveFinding(ctx.caseDef, args, ctx.locale, ctx.state().phase);
    const f = r.kind === "id" ? ctx.caseDef.exam.find((e) => e.id === r.id) : undefined;
    return f ? capabilityRefusal(ctx, findingLabel(ctx.caseDef, f.id, ctx.locale), f.requires) : null;
  },
  async run(args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const r = resolveFinding(c, args, L, ctx.state().phase);
    if (r.kind === "none") {
      const text = c.examNotRecorded ? t(c.examNotRecorded, L) : rt(L, "tool.examNotRecorded");
      return { ok: true, output: text, data: { findingId: null, notRecorded: true } };
    }
    if (r.kind !== "id") return unresolvedOutput(L, r, (id) => findingLabel(c, id, L), ["finding_id", "query"]);
    const unavailable = capabilityRefusal(ctx, findingLabel(c, r.id, L), c.exam.find((e) => e.id === r.id)?.requires ?? []);
    if (unavailable) return unavailable;
    const result = dispatch(ctx, { type: "examine", findingId: r.id });
    if (result.rejected) return rejectedOutput(L, result);
    const f = c.exam.find((e) => e.id === r.id)!;
    const maneuver = t(f.maneuver, L);
    const finding = t(f.finding, L);
    return { ok: true, output: rt(L, "tool.examined", { maneuver, finding }), data: { findingId: f.id, system: f.system, maneuver, finding, abnormal: f.abnormal, media: f.media ?? null } };
  },
};

/* ------------------------------------------------------------------ */
/* Investigations                                                      */
/* ------------------------------------------------------------------ */

const orderTest: ToolDefinition<ToolArgs> = {
  name: "order_test",
  description:
    "Order one investigation for the current phase, by id or by a free-text order (\"CBC\", \"增强CT\"). " +
    "If the text matches several tests, the candidates are returned and nothing is ordered. Read results with read_result once ready.",
  inputSchema: {
    type: "object",
    properties: {
      investigation_id: { type: "string", description: "Exact investigation id from list_options(investigations)." },
      query: { type: "string", maxLength: 300, description: "Free-text order when the id is unknown." },
    },
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "record",
  scope: "workup",
  risk(args, ctx) {
    const r = resolveInvestigation(ctx.caseDef, args, ctx.locale);
    const inv = r.kind === "id" ? ctx.caseDef.investigations.find((i) => i.id === r.id) : undefined;
    // a record review retrieves an existing report: no procedure, so no procedure risk (CASE_AUTHORING §5)
    return inv && inv.performedAt !== "records" ? inv.risk : "none";
  },
  summarize(args, ctx) {
    const r = resolveInvestigation(ctx.caseDef, args, ctx.locale);
    return rt(ctx.locale, "sum.order", { name: r.kind === "id" ? investigationName(ctx.caseDef, r.id, ctx.locale) : strArg(args, "query") || strArg(args, "investigation_id") });
  },
  specifier(args, ctx) {
    const r = resolveInvestigation(ctx.caseDef, args, ctx.locale);
    return r.kind === "id" ? r.id : strArg(args, "investigation_id") || strArg(args, "query");
  },
  precheck(args, ctx) {
    const r = resolveInvestigation(ctx.caseDef, args, ctx.locale);
    const inv = r.kind === "id" ? ctx.caseDef.investigations.find((i) => i.id === r.id) : undefined;
    return inv ? capabilityRefusal(ctx, investigationName(ctx.caseDef, inv.id, ctx.locale), inv.requires) : null;
  },
  async run(args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const r = resolveInvestigation(c, args, L);
    if (r.kind !== "id") return unresolvedOutput(L, r, (id) => investigationName(c, id, L), ["investigation_id", "query"]);
    const unavailable = capabilityRefusal(ctx, investigationName(c, r.id, L), c.investigations.find((i) => i.id === r.id)?.requires ?? []);
    if (unavailable) return unavailable;
    // Order warnings whose `unless` holds no longer apply: judged on the session as the order is placed.
    const before = ctx.state();
    const result = dispatch(ctx, { type: "order", investigationId: r.id });
    if (result.rejected) return rejectedOutput(L, result);
    const name = investigationName(c, r.id, L);
    const s = ctx.state();
    const duplicate = eventsOf(result, "order.duplicate")[0];
    if (duplicate) return { ok: true, output: rt(L, "tool.orderDuplicate", { name, phase: phaseLabel(c, duplicate.phase, L) }), data: { investigationId: r.id, duplicate: true, phase: duplicate.phase } };
    const placed = eventsOf(result, "order.placed")[0];
    const phase = placed?.phase ?? s.phase;
    const readyAt = placed?.readyAt ?? s.clock;
    const hasRecord = resultFor(c, r.id, phase) != null;
    const ready = !hasRecord
      ? rt(L, "tool.ordered.noRecord", { phase: phaseLabel(c, phase, L) })
      : readyAt <= s.clock
        ? rt(L, "tool.ordered.readyNow")
        : readyAtText(c, readyAt, s.clock, L);
    const lines = [rt(L, "tool.ordered", { name, phase: phaseLabel(c, phase, L), ready })];
    const query = strArg(args, "query");
    if (query) for (const w of orderWarnings(c, query, r.id, L, before)) lines.push(rt(L, "tool.orderWarning", { text: w }));
    return { ok: true, output: lines.join("\n"), data: { investigationId: r.id, phase, readyAt, ready: hasRecord && readyAt <= s.clock, hasRecord } };
  },
};

const readResult: ToolDefinition<ToolArgs> = {
  name: "read_result",
  description:
    "Read the result of an investigation you ordered (default: current phase; pass `phase` to review another phase's result). " +
    "Returns the report date, text, values and notes exactly as recorded.",
  inputSchema: {
    type: "object",
    properties: {
      investigation_id: { type: "string", minLength: 1 },
      phase: { type: "string", description: "Phase id (default: the current phase)." },
    },
    required: ["investigation_id"],
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "record",
  scope: "workup",
  risk: () => "none",
  summarize(args, ctx) {
    const r = resolveInvestigation(ctx.caseDef, args, ctx.locale);
    const phase = r.kind === "id" ? readPhase(ctx.state(), r.id, strArg(args, "phase")) : strArg(args, "phase") || ctx.state().phase;
    return rt(ctx.locale, "sum.read", { name: r.kind === "id" ? investigationName(ctx.caseDef, r.id, ctx.locale) : strArg(args, "investigation_id"), phase: phaseLabel(ctx.caseDef, phase, ctx.locale) });
  },
  specifier(args, ctx) {
    const r = resolveInvestigation(ctx.caseDef, args, ctx.locale);
    return r.kind === "id" ? r.id : strArg(args, "investigation_id");
  },
  async run(args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const r = resolveInvestigation(c, args, L);
    if (r.kind !== "id") return unresolvedOutput(L, r, (id) => investigationName(c, id, L), ["investigation_id", "query"]);
    const phaseArg = strArg(args, "phase");
    const phase = readPhase(ctx.state(), r.id, phaseArg);
    const result = dispatch(ctx, { type: "read", investigationId: r.id, ...(phaseArg || phase !== ctx.state().phase ? { phase } : {}) });
    if (result.rejected) {
      if (result.rejected.code === "not-ready") {
        const order = ctx.state().orders.find((o) => o.investigationId === r.id && o.phase === phase);
        return rejectedOutput(L, result, order ? readyAtText(c, order.readyAt, ctx.state().clock, L) : undefined);
      }
      if (result.rejected.code === "not-ordered") {
        // Name the phase(s) it was ordered in, with the exact command (/results shows labels).
        const ordered = [...new Set(ctx.state().orders.filter((o) => o.investigationId === r.id).map((o) => o.phase))];
        if (ordered.length > 0) {
          const where = ordered.map((p) => rt(L, "tool.read.orderedIn", { phase: phaseLabel(c, p, L), command: `/read ${r.id} ${p}` }));
          return rejectedOutput(L, result, where.join(isZh(L) ? "；" : "; "));
        }
      }
      return rejectedOutput(L, result);
    }
    const formatted = formatResult(c, r.id, phase, L);
    return { ok: true, output: formatted.text, data: formatted.data };
  },
};

/* ------------------------------------------------------------------ */
/* Monitoring & treatment                                              */
/* ------------------------------------------------------------------ */

const checkVitals: ToolDefinition<ToolArgs> = {
  name: "check_vitals",
  description: "Look at the bedside monitor: current vital signs, trends and active alarms.",
  inputSchema: EMPTY_SCHEMA,
  readOnly: true,
  sideEffect: "none",
  scope: "history-only",
  risk: () => "none",
  summarize: (_args, ctx) => rt(ctx.locale, "sum.vitals"),
  async run(_args, ctx) {
    const snapshot = vitalsAt(ctx.caseDef, ctx.state());
    // embodied: never a rhythm without a monitor / ECG at the bedside (observations by hand, the chart)
    if (ctx.bedsideRhythm && !ctx.bedsideRhythm()) {
      delete snapshot.vitals.rhythm;
      delete snapshot.vitals.ecg;
    }
    // the data shows what the text shows: never the ECG morphology or a placeholder (review G3)
    return { ok: true, output: vitalsText(snapshot, ctx.locale, clockTime(ctx.caseDef, ctx.state().clock, ctx.locale)), data: learnerVitals(snapshot) };
  },
};

function interventionRisk(args: ToolArgs, ctx: ToolContext) {
  const r = resolveIntervention(ctx.caseDef, args, ctx.locale);
  return r.kind === "id" ? (ctx.caseDef.interventions.find((i) => i.id === r.id)?.risk ?? "low") : "none";
}

const intervene: ToolDefinition<ToolArgs> = {
  name: "intervene",
  description:
    "Give a treatment or perform a procedure (drug, oxygen, fluids, airway, disposition…), by id or free text. " +
    "High-risk interventions always need the learner's confirmation. Returns the patient's response; contraindicated choices cause harm.",
  inputSchema: {
    type: "object",
    properties: {
      intervention_id: { type: "string", description: "Exact intervention id from list_options(interventions)." },
      query: { type: "string", maxLength: 300, description: "Free text when the id is unknown." },
    },
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "patient",
  scope: "full",
  risk: interventionRisk,
  alwaysAsk: (args, ctx) => interventionRisk(args, ctx) === "high",
  summarize(args, ctx) {
    const r = resolveIntervention(ctx.caseDef, args, ctx.locale);
    return rt(ctx.locale, "sum.intervene", { name: r.kind === "id" ? interventionLabel(ctx.caseDef, r.id, ctx.locale) : strArg(args, "query") || strArg(args, "intervention_id") });
  },
  specifier(args, ctx) {
    const r = resolveIntervention(ctx.caseDef, args, ctx.locale);
    return r.kind === "id" ? r.id : strArg(args, "intervention_id") || strArg(args, "query");
  },
  precheck(args, ctx) {
    const r = resolveIntervention(ctx.caseDef, args, ctx.locale);
    const iv = r.kind === "id" ? ctx.caseDef.interventions.find((i) => i.id === r.id) : undefined;
    if (!iv) return null;
    // Refused before the approval gate: no high-risk confirmation for a dose that cannot be given.
    return capabilityRefusal(ctx, interventionLabel(ctx.caseDef, iv.id, ctx.locale), iv.requires) ?? maxDosesRefusal(ctx, iv);
  },
  async run(args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const r = resolveIntervention(c, args, L);
    if (r.kind !== "id") return unresolvedOutput(L, r, (id) => interventionLabel(c, id, L), ["intervention_id", "query"]);
    const unavailable = capabilityRefusal(ctx, interventionLabel(c, r.id, L), c.interventions.find((i) => i.id === r.id)?.requires ?? []);
    if (unavailable) return unavailable;
    const result = dispatch(ctx, { type: "intervene", interventionId: r.id });
    // Name what the query matched ("give the pump a rest" → the IV insulin infusion), so a refusal is not opaque.
    if (result.rejected) return rejectedOutput(L, result, result.rejected.code === "max-doses" ? rt(L, "tool.rejected.item", { name: t(c.interventions.find((i) => i.id === r.id)!.name, L) }) : undefined);
    const iv = c.interventions.find((i) => i.id === r.id)!;
    const applied = eventsOf(result, "intervention.applied")[0];
    const appropriateness = applied?.appropriateness ?? "neutral";
    const dose = iv.dose ? t(iv.dose, L) : "";
    const name = t(iv.name, L);
    const lines = [rt(L, "tool.intervened", { name, dose: dose && !name.includes(dose) ? ` (${dose})` : "" })];
    if (iv.response) lines.push(rt(L, "tool.intervention.response", { text: t(iv.response, L) }));
    if (appropriateness === "contraindicated" && iv.harm) lines.push(rt(L, "tool.intervention.harm", { text: t(iv.harm, L) }));
    return { ok: true, output: lines.join("\n"), data: { interventionId: iv.id, appropriateness, kind: iv.kind } };
  },
};

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

/** Roles reachable through `consult`. */
export const CONSULT_ROLES = ["nurse", "radiologist", "pathologist", "attending"] as const;

const consult: ToolDefinition<ToolArgs> = {
  name: "consult",
  description:
    "Ask a team member a question: the nurse (handover, vitals, logistics), radiologist or pathologist (interpretation of results you already obtained), " +
    "or the attending (Socratic teaching; asking for help costs a hint).",
  inputSchema: {
    type: "object",
    properties: { role: { type: "string", enum: [...CONSULT_ROLES] }, question: { type: "string", minLength: 1, maxLength: 2000 } },
    required: ["role", "question"],
    additionalProperties: false,
  },
  readOnly: true,
  sideEffect: "conversation",
  scope: "workup",
  risk: () => "none",
  summarize: (args, ctx) => {
    const role = strArg(args, "role");
    const key = `speaker.${role}` as RuntimeKey;
    return rt(ctx.locale, "sum.consult", { role: (CONSULT_ROLES as readonly string[]).includes(role) ? rt(ctx.locale, key) : role, question: strArg(args, "question") });
  },
  specifier: (args) => strArg(args, "role"),
  async run(args, ctx) {
    const role = strArg(args, "role");
    if (!(CONSULT_ROLES as readonly string[]).includes(role)) return { ok: false, output: rt(ctx.locale, "tool.consult.unknownRole", { role }) };
    const reply = await ctx.ask(role, strArg(args, "question"), ctx.signal);
    return { ok: true, output: reply.text, data: { role, text: reply.text } };
  },
};

/* ------------------------------------------------------------------ */
/* Decisions, phases, time, plan                                       */
/* ------------------------------------------------------------------ */

function optionIds(args: ToolArgs): string[] {
  const v = args.option_ids;
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

/**
 * A decision the caller may not see yet (neither unlocked nor decided): its
 * prompt and options can state results not yet obtained, so a call naming it
 * gets only what it still needs — never its prompt, option texts or ids.
 */
function lockedDecisionRefusal(ctx: Pick<ToolContext, "caseDef" | "locale" | "state">, decisionId: string): ToolOutput | null {
  const c = ctx.caseDef;
  const entry = availableDecisions(c, ctx.state()).find((x) => x.decision.id === decisionId);
  if (!entry || entry.unlocked || entry.decided) return null;
  return { ok: false, output: rt(ctx.locale, "tool.answer.need", { need: t(entry.decision.need, ctx.locale) }), data: { rejected: { code: "requirements-unmet" } } };
}

const answerDecision: ToolDefinition<ToolArgs> = {
  name: "answer_decision",
  description:
    "Answer a decision on the case board (single best answer: one option id; select-all: every option id you choose). " +
    "Returns whether it is correct and feedback. Decisions unlock once their evidence has been gathered.",
  inputSchema: {
    type: "object",
    properties: {
      decision_id: { type: "string", minLength: 1 },
      option_ids: { type: "array", items: { type: "string", minLength: 1 }, minItems: 1, maxItems: 12 },
    },
    required: ["decision_id", "option_ids"],
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "record",
  scope: "history-only",
  risk: () => "low",
  summarize(args, ctx) {
    const decisionId = strArg(args, "decision_id");
    const d = ctx.caseDef.decisions.find((x) => x.id === decisionId);
    const L = ctx.locale;
    // A locked decision is named by its number only (approval dialogs are shown to the learner).
    if (d && lockedDecisionRefusal(ctx, d.id)) return rt(L, "sum.answerLocked", { label: lockedDecisionLabel(ctx.caseDef, d.id, L) });
    const options = optionIds(args).map((id) => {
      const o = d?.options.find((x) => x.id === id);
      return o ? t(o.text, L) : id;
    });
    return rt(L, "sum.answer", { prompt: d ? t(d.prompt, L) : decisionId, options: joinList(L, options) });
  },
  specifier: (args) => strArg(args, "decision_id"),
  precheck: (args, ctx) => lockedDecisionRefusal(ctx, strArg(args, "decision_id")),
  async run(args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const decisionId = strArg(args, "decision_id");
    const d = c.decisions.find((x) => x.id === decisionId);
    if (!d) return { ok: false, output: rt(L, "tool.noSuchId", { id: decisionId }) };
    // Locked first: an unknown option id must not list a locked decision's options.
    const locked = lockedDecisionRefusal(ctx, decisionId);
    if (locked) return locked;
    const ids = optionIds(args);
    const bad = ids.filter((id) => !d.options.some((o) => o.id === id));
    if (bad.length > 0) {
      // Presentation order (presentedOptions), never the authored order (correct answer usually first).
      const listed = presentedOptions(c, d).map((o) => `${o.id} (${t(o.text, L)})`).join(isZh(L) ? "；" : "; ");
      return { ok: false, output: rt(L, "tool.answer.badOption", { ids: bad.join(", "), options: listed }) };
    }
    const result = dispatch(ctx, { type: "answer", decisionId, optionIds: ids });
    if (result.rejected) {
      if (result.rejected.code === "requirements-unmet") return { ok: false, output: rt(L, "tool.answer.need", { need: t(d.need, L) }), data: { rejected: result.rejected } };
      if (result.rejected.code === "already-decided") return { ok: false, output: rt(L, "tool.answer.already"), data: { rejected: result.rejected } };
      return rejectedOutput(L, result);
    }
    const answered = eventsOf(result, "decision.answered")[0];
    const correct = answered?.correct ?? false;
    const lines = [rt(L, correct ? "tool.answer.correct" : "tool.answer.incorrect")];
    for (const id of ids) {
      const o = d.options.find((x) => x.id === id)!;
      lines.push(`- ${t(o.text, L)}: ${t(o.feedback, L)}`);
    }
    return { ok: true, output: lines.join("\n"), data: { decisionId, optionIds: ids, correct, firstTry: answered?.firstTry ?? false } };
  },
};

const setPhase: ToolDefinition<ToolArgs> = {
  name: "set_phase",
  description: "Switch the case phase (e.g. from the diagnostic phase to follow-up) to review that phase's history and results.",
  inputSchema: { type: "object", properties: { phase: { type: "string", minLength: 1 } }, required: ["phase"], additionalProperties: false },
  readOnly: false,
  sideEffect: "record",
  scope: "history-only",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.phase", { label: phaseLabel(ctx.caseDef, strArg(args, "phase"), ctx.locale) }),
  specifier: (args) => strArg(args, "phase"),
  async run(args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const phaseId = strArg(args, "phase");
    const result = dispatch(ctx, { type: "set-phase", phase: phaseId });
    if (result.rejected) return rejectedOutput(L, result);
    const phase = c.phases.find((p) => p.id === phaseId)!;
    const description = phase.description ? ` ${t(phase.description, L)}` : "";
    return { ok: true, output: rt(L, "tool.phase.set", { label: t(phase.label, L), description }), data: { phase: phaseId } };
  },
};

/**
 * Sentences joined into one: each item's trailing full stop/semicolon/comma
 * is dropped, items are separated by "; " (zh "；") and one final stop is
 * added unless the last item already ends a sentence ("？", "!", "…”").
 */
export function sentenceList(locale: string, items: readonly string[]): string {
  const zh = isZh(locale);
  const parts = items.map((s) => s.trim().replace(/[\s.;,。；，、]+$/u, "")).filter(Boolean);
  if (parts.length === 0) return "";
  const joined = parts.join(zh ? "；" : "; ");
  return /[.!?。！？…]["'”’」]?$/u.test(joined) ? joined : `${joined}${zh ? "。" : "."}`;
}

function eventSummary(c: CaseDefinition, events: readonly DomainEvent[], locale: string): string[] {
  const out: string[] = [];
  for (const e of events) {
    switch (e.type) {
      case "result.ready":
        // Neutral wording: whoever waited (the learner via /wait, or a clinician model) should read it.
        out.push(rt(locale, "tool.wait.resultReady", { name: investigationName(c, e.investigationId, locale), phase: phaseLabel(c, e.phase, locale) }));
        break;
      case "vitals.alarm":
        // An arrest's placeholder 0 is no reading: hr says so; BP and SpO₂ are covered by the hr/rhythm alarm.
        if (e.unmeasurable && e.vital !== "hr") break;
        out.push(`${vitalLabel(e.vital, locale)} ${e.unmeasurable ? noReading(locale) : vitalWithUnit(e.vital, e.value)} (${rt(locale, e.level === "critical" ? "level.critical" : "level.warning")})`);
        break;
      case "scenario.event": {
        const ev = c.physiology?.events.find((x) => x.id === e.eventId);
        if (ev?.message) out.push(t(ev.message, locale));
        break;
      }
      case "phase.changed":
        out.push(rt(locale, "tool.phase.set", { label: phaseLabel(c, e.to, locale), description: "" }));
        break;
      case "case.finished":
        out.push(rt(locale, e.timedOut ? "notify.timedOut.body" : "notify.finished.body"));
        break;
      default:
        break;
    }
  }
  return out;
}

const wait: ToolDefinition<ToolArgs> = {
  name: "wait",
  description: "Let simulated time pass (simulated-clock cases only), e.g. to wait for a result or to reassess after treatment.",
  inputSchema: {
    type: "object",
    properties: { minutes: { type: "number", exclusiveMinimum: 0, maximum: 240 } },
    required: ["minutes"],
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "clock",
  scope: "workup",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.wait", { minutes: Number(args.minutes) || 0 }),
  async run(args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    if (c.clock.mode !== "simulated") return { ok: false, output: rt(L, "tool.wait.static") };
    const from = ctx.state().clock;
    const result = dispatch(ctx, { type: "advance-time", minutes: Number(args.minutes) });
    if (result.rejected) return rejectedOutput(L, result);
    const s = ctx.state();
    const lines = [rt(L, "tool.wait.done", { minutes: Number(args.minutes), from: clockTime(c, from, L), to: clockTime(c, s.clock, L) })];
    const events = eventSummary(c, result.events, L);
    // For a model (it sees no live events); `/wait` leaves this line out — the learner watched them happen.
    const meanwhile = events.length > 0 ? rt(L, "tool.wait.events", { events: sentenceList(L, events) }) : null;
    if (meanwhile) lines.push(meanwhile);
    // Embodied mode: only what the body can see from where it stands (review G11).
    const view = ctx.vitalsView?.();
    lines.push(view && !view.inView ? rt(L, "vitals.notInView", { reason: view.message }) : vitalsText(view?.inView ? view.snapshot : vitalsAt(c, s), L));
    return { ok: true, output: lines.join("\n"), data: { from, to: s.clock, meanwhile } };
  },
};

const PLAN_STATUSES = ["pending", "in_progress", "completed"] as const;

const updateWorkup: ToolDefinition<ToolArgs> = {
  name: "update_workup",
  description:
    "Publish your working plan and differential (like a todo list): each item has text and a status (pending | in_progress | completed). " +
    "Replaces the previous plan. Does not change the case.",
  inputSchema: {
    type: "object",
    properties: {
      explanation: { type: "string", maxLength: 2000 },
      plan: {
        type: "array",
        maxItems: 30,
        items: {
          type: "object",
          properties: { text: { type: "string", minLength: 1, maxLength: 300 }, status: { type: "string", enum: [...PLAN_STATUSES] } },
          required: ["text", "status"],
          additionalProperties: false,
        },
      },
    },
    required: ["plan"],
    additionalProperties: false,
  },
  readOnly: true,
  sideEffect: "none",
  scope: "history-only",
  risk: () => "none",
  summarize: (_args, ctx) => rt(ctx.locale, "sum.plan"),
  async run(args, ctx) {
    const plan = (Array.isArray(args.plan) ? args.plan : []) as PlanItem[];
    const explanation = strArg(args, "explanation");
    ctx.updatePlan(plan, explanation || undefined);
    return { ok: true, output: rt(ctx.locale, "tool.plan.updated", { count: plan.length }), data: { plan, explanation: explanation || null } };
  },
};

/** Learner-visible status: objectives, orders, decisions, phase, clock. */
export function caseStatusText(ctx: Pick<ToolContext, "caseDef" | "locale" | "state">): { text: string; data: unknown } {
  const c = ctx.caseDef;
  const s = ctx.state();
  const L = ctx.locale;
  const p = progress(c, s);
  const lines = [rt(L, "tool.status.header", { phase: phaseLabel(c, s.phase, L), clock: clockTime(c, s.clock, L), finished: s.finished ? rt(L, "tool.status.finished") : "" })];
  lines.push(`${rt(L, "label.objectives")} (${p.done}/${p.total}):`);
  for (const o of p.objectives) lines.push(`  ${o.done ? "✓" : o.current ? "▶" : "·"} ${objectiveTitle(c, o.id, L)}`);
  const orders = orderStatus(c, s);
  if (orders.length > 0) {
    lines.push(`${rt(L, "label.orders")}:`);
    for (const o of orders) {
      lines.push(`  - ${investigationName(c, o.order.investigationId, L)} [${o.order.investigationId}@${o.order.phase}] ${orderStatusText(c, o, L)}`);
    }
  }
  const decisions = availableDecisions(c, s);
  if (decisions.length > 0) {
    lines.push(`${rt(L, "label.decisions")}:`);
    for (const d of decisions) {
      // A locked decision's label already says it is not yet available: no "(locked)" suffix.
      if (!d.unlocked && !d.decided) lines.push(`  - [${d.decision.id}] ${lockedDecisionLabel(c, d.decision.id, L)}`);
      else lines.push(`  - [${d.decision.id}] ${t(d.decision.prompt, L)} (${rt(L, d.decided ? "label.decided" : "label.unlocked")})`);
    }
  }
  const objective = currentObjective(c, s);
  return {
    text: lines.join("\n"),
    data: {
      phase: s.phase,
      clock: s.clock,
      started: s.started,
      finished: s.finished,
      progress: p,
      currentObjective: objective?.id ?? null,
      orders: orders.map((o) => ({ key: o.order.key, investigationId: o.order.investigationId, phase: o.order.phase, ready: o.ready, read: o.read, readyAt: o.order.readyAt, record: resultFor(c, o.order.investigationId, o.order.phase) !== null })),
      decisions: decisions.map((d) => ({ id: d.decision.id, unlocked: d.unlocked, decided: d.decided })),
      hints: s.hints,
    },
  };
}

const caseStatus: ToolDefinition<ToolArgs> = {
  name: "case_status",
  description: "Review the case status: objectives, pending and ready orders, which decisions are open, phase and clock.",
  inputSchema: EMPTY_SCHEMA,
  readOnly: true,
  sideEffect: "none",
  scope: "history-only",
  risk: () => "none",
  summarize: (_args, ctx) => rt(ctx.locale, "sum.status"),
  async run(_args, ctx) {
    const { text, data } = caseStatusText(ctx);
    return { ok: true, output: text, data };
  },
};

const finishCase: ToolDefinition<ToolArgs> = {
  name: "finish_case",
  description: "Finish the case once every objective is complete (fails with the list of open objectives otherwise).",
  inputSchema: EMPTY_SCHEMA,
  readOnly: false,
  sideEffect: "record",
  scope: "history-only",
  risk: () => "low",
  summarize: (_args, ctx) => rt(ctx.locale, "sum.finish"),
  async run(_args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const result = dispatch(ctx, { type: "finish" });
    if (result.rejected) {
      if (result.rejected.code === "objectives-incomplete") {
        const open = progress(c, ctx.state()).objectives.filter((o) => !o.done).map((o) => objectiveTitle(c, o.id, L));
        return { ok: false, output: rt(L, "tool.finish.incomplete", { objectives: joinList(L, open) }), data: { rejected: result.rejected } };
      }
      return rejectedOutput(L, result);
    }
    return { ok: true, output: rt(L, "tool.finish.done"), data: { finished: true } };
  },
};

/** `walk_to` — a client-executed dynamic tool (only registered when the front-end declares it). */
export const walkToTool: ToolDefinition<ToolArgs> = {
  name: "walk_to",
  description: "Walk to a place in the 3D world: a capability (\"ct\"), a room id or kind, \"patient\", \"board\" or \"atlas\".",
  inputSchema: { type: "object", properties: { target: { type: "string", minLength: 1, maxLength: 80 } }, required: ["target"], additionalProperties: false },
  readOnly: true,
  sideEffect: "none",
  scope: "history-only",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.walk", { target: strArg(args, "target") }),
  specifier: (args) => strArg(args, "target"),
  async run(args, ctx) {
    if (!ctx.dynamicTool) return { ok: false, output: rt(ctx.locale, "tool.dynamic.unsupported", { tool: "walk_to" }) };
    const res = await ctx.dynamicTool("walk_to", { target: strArg(args, "target") }, ctx.signal);
    return { ok: res.ok, output: res.output };
  },
};

/** Every clinical tool of PROTOCOL §3 except the dynamic `walk_to`. */
export function clinicalTools(): ToolDefinition<ToolArgs>[] {
  return [askPatient, listOptions, examine, orderTest, readResult, checkVitals, intervene, consult, answerDecision, setPhase, wait, updateWorkup, caseStatus, finishCase];
}

/** Names of the clinical tools (the clinician's default allow-list). */
export const CLINICAL_TOOL_NAMES: readonly string[] = [...clinicalTools().map((tool) => tool.name), walkToTool.name];
