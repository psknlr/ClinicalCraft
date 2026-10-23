/**
 * What the clinical tools (clinical.ts) share with each other and with the rest of the runtime (spatial gate,
 * world tools, skills, delegation, slash commands): reading their arguments, resolving an id-or-query argument to
 * a case item (exact ids, then the case's matchers with a clear-winner rule — ambiguous and unmatched queries
 * name candidates and act on nothing), the phase a result is read in and an order's status, and the outputs of a
 * refused call (an engine rejection, a capability the facility lacks, an intervention's dose limit).
 * clinical.ts re-exports the public names, so their import path is unchanged.
 */
import {
  capabilityLabels,
  facilityCapabilities,
  interventionNegation,
  matchExam,
  matchInterventions,
  matchOrders,
  matchSpecificity,
  resultFor,
  t,
  type Actor,
  type CaseDefinition,
  type ClinicalActionType,
  type DomainEvent,
  type Intervention,
  type MatchHit,
  type orderStatus,
  type ReduceResult,
  type RejectionCode,
  type SessionState,
} from "@clinicalcraft/core";
import { isZh, joinList, rt, type RuntimeKey } from "../session/i18n.js";
import { clockTime } from "./format.js";
import type { ToolContext, ToolOutput } from "./types.js";

export type ToolArgs = Record<string, unknown>;

/** Minimum matcher score for a free-text query to resolve to an item. */
export const RESOLVE_THRESHOLD = 0.55;
/** A resolved item must lead the runner-up by at least this much. */
export const RESOLVE_MARGIN = 0.1;

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Read a trimmed string argument. */
export function strArg(args: ToolArgs, key: string): string {
  const v = args[key];
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

/** Engine actor for a tool context. */
export function actorFor(ctx: Pick<ToolContext, "agent">): Actor {
  return ctx.agent === "learner" ? "learner" : "agent";
}

/**
 * Localised text for an engine rejection code. With the rejected action's
 * type, `set-phase` + `phase-locked` says that the phase follows the case
 * clock (the generic text describes ask/examine items of another phase).
 */
export function rejectionText(locale: string, code: RejectionCode, action?: ClinicalActionType): string {
  if (code === "phase-locked" && action === "set-phase") return rt(locale, "reject.phase-not-switchable");
  return rt(locale, `reject.${code}` as RuntimeKey);
}

/**
 * Tool output for a rejected engine action. The model-facing `output` names
 * the rejection code; `data.message` is the same reason without it, for
 * learner-facing text (slash commands), and `data.rejected` keeps the code.
 */
export function rejectedOutput(locale: string, result: ReduceResult, detail?: string): ToolOutput {
  const code = result.rejected?.code ?? "invalid";
  const action = result.events.find((e): e is Extract<DomainEvent, { type: "action.rejected" }> => e.type === "action.rejected")?.action;
  const reason = rejectionText(locale, code, action);
  const message = detail ? `${reason} ${detail}` : reason;
  return { ok: false, output: rt(locale, "tool.rejected", { code, message }), data: { rejected: result.rejected, message } };
}

/**
 * The phase `/read <id>` reads: the one given; else the current phase when
 * the test was ordered there; else the phase of its most recent order — an
 * automatic phase change (transfer, treatment) must not hide a result the
 * learner ordered a moment ago.
 */
export function readPhase(s: SessionState, investigationId: string, phaseArg?: string): string {
  if (phaseArg) return phaseArg;
  if (s.orders.some((o) => o.investigationId === investigationId && o.phase === s.phase)) return s.phase;
  const latest = s.orders.filter((o) => o.investigationId === investigationId).at(-1);
  return latest?.phase ?? s.phase;
}

/**
 * Learner-facing status of an order: read, "no record" (the case has no
 * result for it in that phase — it will never come back), ready, or pending
 * until its due time.
 */
export function orderStatusText(c: CaseDefinition, o: ReturnType<typeof orderStatus>[number], locale: string): string {
  if (o.read) return rt(locale, "label.read");
  if (resultFor(c, o.order.investigationId, o.order.phase) === null) return rt(locale, "label.noRecord");
  return o.ready ? rt(locale, "label.ready") : rt(locale, "label.pendingUntil", { time: clockTime(c, o.order.readyAt, locale, "ceil") });
}

/**
 * Outcome of resolving an id-or-query argument pair. `negated`: an
 * intervention query that says what NOT to do ("don't give GTN") and names no
 * item that itself withholds — nothing is done; `withheld` are the items it
 * names, `suggestions` the case items it may still mean (a withholding item
 * such as "withhold analgesia", or a weak affirmative match).
 */
export type Resolution =
  | { kind: "id"; id: string }
  | { kind: "ambiguous"; ids: string[] }
  | { kind: "none"; query: string }
  | { kind: "negated"; query: string; withheld: string[]; suggestions: string[]; doubleNegative: boolean }
  | { kind: "unknown-id"; id: string }
  | { kind: "missing" };

function exactId(ids: readonly string[], text: string): string | undefined {
  const lower = text.toLowerCase();
  return ids.find((id) => id.toLowerCase() === lower);
}

/**
 * Pick a clear winner from scored hits (≥ threshold and ahead of the
 * runner-up), else ambiguous/none. With `specificity` (`matchSpecificity`),
 * a tie among the leaders goes to the one item whose matched phrase covers
 * strictly more of the query ("activate the cath lab" over "go to cath lab").
 */
export function resolveHits(hits: readonly MatchHit[], query: string, specificity?: (id: string) => number): Resolution {
  const strong = hits.filter((h) => h.score >= RESOLVE_THRESHOLD);
  if (strong.length > 0) {
    const top = strong[0]!;
    const rivals = strong.filter((h) => h.id !== top.id && top.score - h.score < RESOLVE_MARGIN);
    if (rivals.length === 0) return { kind: "id", id: top.id };
    if (specificity) {
      const leaders = [top, ...rivals].map((h) => ({ id: h.id, cover: specificity(h.id) }));
      const most = Math.max(...leaders.map((l) => l.cover));
      const winners = leaders.filter((l) => l.cover === most);
      if (most > 0 && winners.length === 1) return { kind: "id", id: winners[0]!.id };
    }
    return { kind: "ambiguous", ids: [top.id, ...rivals.map((h) => h.id)].slice(0, 6) };
  }
  if (hits.length > 0) return { kind: "ambiguous", ids: hits.slice(0, 6).map((h) => h.id) };
  return { kind: "none", query };
}

/** Resolve `{investigation_id?, query?}` with `matchOrders` (V4 semantics: more than one id = ambiguous). */
export function resolveInvestigation(c: CaseDefinition, args: ToolArgs, locale: string, idKey = "investigation_id"): Resolution {
  const ids = c.investigations.map((i) => i.id);
  const id = strArg(args, idKey);
  if (id) {
    const exact = exactId(ids, id);
    if (exact) return { kind: "id", id: exact };
    const matched = matchOrders(c, id, locale);
    if (matched.length === 1) return { kind: "id", id: matched[0]! };
    return { kind: "unknown-id", id };
  }
  const query = strArg(args, "query");
  if (!query) return { kind: "missing" };
  const exact = exactId(ids, query);
  if (exact) return { kind: "id", id: exact };
  const matched = matchOrders(c, query, locale);
  if (matched.length === 1) return { kind: "id", id: matched[0]! };
  if (matched.length > 1) return { kind: "ambiguous", ids: matched };
  return { kind: "none", query };
}

/**
 * Resolve `{finding_id?, query?}` with `matchExam`. With `phase`, a free-text
 * query only matches findings available in that phase (as the web exam
 * search does): phase twins ("auscultate the chest" at the scene and in the
 * ED) do not tie, and later phases are not hinted at. Exact ids are not
 * filtered, so the engine still reports `phase-locked` for them.
 */
export function resolveFinding(c: CaseDefinition, args: ToolArgs, locale: string, phase?: string): Resolution {
  const ids = c.exam.map((e) => e.id);
  const id = strArg(args, "finding_id");
  if (id) {
    const exact = exactId(ids, id);
    return exact ? { kind: "id", id: exact } : { kind: "unknown-id", id };
  }
  const query = strArg(args, "query");
  if (!query) return { kind: "missing" };
  const exact = exactId(ids, query);
  if (exact) return { kind: "id", id: exact };
  return resolveHits(matchExam(c, query, locale, phase ? { phase } : {}), query, (hit) => matchSpecificity(c, "exam", query, locale, hit));
}

/**
 * Resolve `{intervention_id?, query?}` with `matchInterventions`, which reads
 * negation: a query that negates an item never resolves to it. When such a
 * query resolves to nothing — no hit, or only weak ones — the resolution is
 * `negated` (what it withholds, and what it may still mean) rather than
 * `none` / `ambiguous`, so the reply can say why nothing was done.
 */
export function resolveIntervention(c: CaseDefinition, args: ToolArgs, locale: string): Resolution {
  const ids = c.interventions.map((i) => i.id);
  const id = strArg(args, "intervention_id");
  if (id) {
    const exact = exactId(ids, id);
    return exact ? { kind: "id", id: exact } : { kind: "unknown-id", id };
  }
  const query = strArg(args, "query");
  if (!query) return { kind: "missing" };
  const exact = exactId(ids, query);
  if (exact) return { kind: "id", id: exact };
  const hits = matchInterventions(c, query, locale);
  const r = resolveHits(hits, query, (hit) => matchSpecificity(c, "interventions", query, locale, hit));
  if (r.kind === "id" || (hits[0]?.score ?? 0) >= RESOLVE_THRESHOLD) return r;
  const negation = interventionNegation(c, query, locale);
  if (!negation) return r;
  const suggestions = [...new Set([...negation.alternatives, ...(r.kind === "ambiguous" ? r.ids : [])])].slice(0, 6);
  return { kind: "negated", query, withheld: negation.withheld, suggestions, doubleNegative: negation.doubleNegated.length > 0 };
}

/**
 * Tool output for an unresolved id/query. `output` is for models; `data`
 * (`unresolved`: the resolution kind, plus `candidates` / `query` / `id`)
 * lets learner front-ends word it for a person (slash commands).
 */
export function unresolvedOutput(locale: string, r: Exclude<Resolution, { kind: "id" }>, label: (id: string) => string, keys: [string, string]): ToolOutput {
  switch (r.kind) {
    case "missing":
      return { ok: false, output: rt(locale, "tool.needOne", { a: keys[0], b: keys[1] }), data: { unresolved: "missing" } };
    case "unknown-id":
      return { ok: false, output: rt(locale, "tool.noSuchId", { id: r.id }), data: { unresolved: "unknown-id", id: r.id } };
    case "none":
      return { ok: false, output: rt(locale, "tool.noMatch", { query: r.query }), data: { unresolved: "none", query: r.query } };
    case "ambiguous":
      return {
        ok: false,
        output: rt(locale, "tool.ambiguous", { candidates: r.ids.map((id) => `${id} (${label(id)})`).join(isZh(locale) ? "；" : "; ") }),
        data: { unresolved: "ambiguous", candidates: r.ids.map((id) => ({ id, label: label(id) })) },
      };
    case "negated": {
      const sep = isZh(locale) ? "；" : "; ";
      const withheld = r.withheld.length ? rt(locale, "tool.negated.withheld", { items: joinList(locale, r.withheld.map(label)) }) : "";
      const head = r.doubleNegative && !r.withheld.length ? rt(locale, "tool.negated.double", { query: r.query }) : rt(locale, "tool.negated", { query: r.query, withheld });
      const alternatives = r.suggestions.length ? rt(locale, "tool.negated.alternatives", { candidates: r.suggestions.map((id) => `${id} (${label(id)})`).join(sep) }) : "";
      return {
        ok: false,
        output: `${head}${alternatives}`,
        data: {
          unresolved: "negated",
          query: r.query,
          withheld: r.withheld.map((id) => ({ id, label: label(id) })),
          candidates: r.suggestions.map((id) => ({ id, label: label(id) })),
          doubleNegative: r.doubleNegative,
        },
      };
    }
    default: {
      const never: never = r;
      return never;
    }
  }
}

/** Facility capabilities per facility object (facilities and catalogs are immutable content). */
const capabilityCache = new WeakMap<object, Set<string>>();

/**
 * Capabilities of `requires` the session's facility does not provide
 * (`facilityCapabilities`: every placement's equipment plus the personal
 * kit). Empty without a facility (nothing to check against).
 */
export function missingCapabilities(ctx: Pick<ToolContext, "facility" | "catalogs">, requires: readonly string[]): string[] {
  if (!ctx.facility || requires.length === 0) return [];
  let caps = capabilityCache.get(ctx.facility);
  if (!caps) {
    caps = facilityCapabilities(ctx.facility, ctx.catalogs);
    capabilityCache.set(ctx.facility, caps);
  }
  return requires.filter((r) => !caps!.has(r));
}

/**
 * Refusal for an item the facility cannot provide (docs/FACILITIES.md: CLI,
 * MCP and agent tools check the whole facility; the web also checks where
 * the learner stands). Null when it can be done here.
 */
export function capabilityRefusal(ctx: Pick<ToolContext, "facility" | "catalogs" | "locale">, name: string, requires: readonly string[]): ToolOutput | null {
  const missing = missingCapabilities(ctx, requires);
  if (missing.length === 0) return null;
  const facility = ctx.facility ? t(ctx.facility.name, ctx.locale) : "";
  // capabilities by their display labels (never raw ids to the learner or the model)
  const message = rt(ctx.locale, "tool.noCapability", { name, facility, capabilities: joinList(ctx.locale, capabilityLabels(missing, ctx.locale)) });
  return { ok: false, output: message, data: { rejected: { code: "missing-capability" }, message, missing } };
}

/**
 * Refusal for an intervention whose `maxDoses` the session already reached
 * (the reducer's `max-doses`, named), or null. Not checked once the case is
 * finished (the engine then refuses with `finished`).
 */
export function maxDosesRefusal(ctx: Pick<ToolContext, "caseDef" | "locale" | "state">, iv: Intervention): ToolOutput | null {
  const s = ctx.state();
  if (iv.maxDoses == null || s.finished) return null;
  if (s.interventions.filter((r) => r.interventionId === iv.id).length < iv.maxDoses) return null;
  const L = ctx.locale;
  const message = `${rejectionText(L, "max-doses")} ${rt(L, "tool.rejected.item", { name: t(iv.name, L) })}`;
  return { ok: false, output: rt(L, "tool.rejected", { code: "max-doses", message }), data: { rejected: { code: "max-doses", message: `"${iv.id}" may be given at most ${iv.maxDoses} time(s)` }, message } };
}
