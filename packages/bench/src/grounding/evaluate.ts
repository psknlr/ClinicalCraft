/**
 * Evaluation of grounding items (docs/GROUNDING.md §2): every item runs
 * through the SAME functions the runtime uses — the patient pipeline's
 * selection and offline re-rank, the clinical tools' resolution, the patient
 * router and the voice grounding check — on a fresh session of its case.
 * Pure given the loaded content: no model, no clock, no randomness.
 */
import { createSession, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import {
  classifyUtterance,
  offlineRerank,
  resolveFinding,
  resolveIntervention,
  resolveInvestigation,
  selectFacts,
  verifyGrounding,
  voiceGroundingInputs,
  type Resolution,
} from "@clinicalcraft/agent";
import { proportion, type Proportion } from "../stats.js";
import type { GroundingRoute, GroundingSet, GroundingSplit, GroundingTrack, HistoryItem, RoutingItem, ToolItem, ToolTrack, VerifierItem } from "./schema.js";
import { GROUNDING_TRACKS } from "./schema.js";

/** How one item came out. */
export type GroundingOutcome =
  /** history: every expected fact revealed, nothing else (or nothing, for `expect: []`). */
  | "correct"
  /** history: an expected fact was not revealed (and no wrong one was). */
  | "missed"
  /** history: a fact outside `expect` / `alsoOk` was revealed. */
  | "leaked"
  /** tools: the tool acts on the expected item (or on none when `expect` is null). */
  | "resolved"
  /** tools: the tool acts on another item. */
  | "wrong-item"
  /** tools: no action, but the reply names the expected item (one step to recover). */
  | "recoverable"
  /** tools: no action and the expected item is not named. */
  | "unresolved"
  /** routing: the expected route. */
  | "routed"
  /** routing: an out-of-fiction utterance answered in fiction. */
  | "missed-attack"
  /** routing: an in-fiction utterance deflected. */
  | "false-deflection"
  /** routing: deflected, but as another kind (meta / real-advice / injection). */
  | "other-deflection"
  /** verifier: the expected verdict. */
  | "verified"
  /** verifier: a fabricated reply let through. */
  | "missed-fabrication"
  /** verifier: a faithful reply blocked. */
  | "false-block";

/** One evaluated item. */
export interface GroundingItemResult {
  track: GroundingTrack;
  split: GroundingSplit;
  /** `<split>/<file>.json`. */
  file: string;
  caseId: string | null;
  itemId: string;
  locale: string;
  /** What was evaluated (the question, the tool argument, the reply). */
  input: string;
  expected: string;
  got: string;
  outcome: GroundingOutcome;
  ok: boolean;
  /** The item's tags (absent when it has none). */
  tags?: string[];
}

/** A file to evaluate with its case. */
export interface GroundingInput {
  split: GroundingSplit;
  path: string;
  set: GroundingSet;
  caseDef: CaseDefinition | null;
}

export interface GroundingFilter {
  tracks?: readonly GroundingTrack[];
  cases?: readonly string[];
  locales?: readonly string[];
  /** Keep items carrying any of these tags. */
  tags?: readonly string[];
}

function stateAt(c: CaseDefinition, phase: string | undefined, asked: readonly string[] = []): SessionState {
  const s = createSession(c);
  return { ...s, ...(phase ? { phase } : {}), asked: [...asked] };
}

const listText = (ids: readonly string[]) => (ids.length ? ids.join(", ") : "—");

/** The history track: what the offline patient pipeline reveals for a question. */
export function evaluateHistoryItem(c: CaseDefinition, item: HistoryItem): Pick<GroundingItemResult, "input" | "expected" | "got" | "outcome" | "ok"> {
  const state = stateAt(c, item.phase);
  let selection = selectFacts(c, state, item.text, item.locale);
  if (selection.selected.length === 0 && selection.candidates.length > 0) selection = offlineRerank(c, selection);
  const revealed = selection.selected;
  const allowed = new Set([...item.expect, ...(item.alsoOk ?? [])]);
  const leaked = revealed.some((id) => !allowed.has(id));
  const complete = item.expect.every((id) => revealed.includes(id));
  const outcome: GroundingOutcome = leaked ? "leaked" : complete ? "correct" : "missed";
  const got = revealed.length ? revealed.join(", ") : selection.clarifyTopics.length ? `clarify(${selection.clarifyTopics.join("|")})` : "—";
  return { input: item.text, expected: item.expect.length ? item.expect.join(" + ") : "(nothing)", got, outcome, ok: outcome === "correct" };
}

const ID_KEYS: Record<ToolTrack, string> = { exam: "finding_id", orders: "investigation_id", interventions: "intervention_id" };

/**
 * The ids a tool's unresolved reply names to the model (`unresolvedOutput`):
 * the ambiguous candidates, and any `suggestions` a future resolution adds
 * for an unknown id or an unmatched query (so a model can recover in one
 * step). Reads the field defensively — absent today.
 */
export function namedCandidates(r: Resolution): string[] {
  const named = new Set<string>();
  if (r.kind === "ambiguous") for (const id of r.ids) named.add(id);
  const extra = (r as { suggestions?: unknown }).suggestions;
  if (Array.isArray(extra)) for (const x of extra) if (typeof x === "string") named.add(x);
  return [...named];
}

/** A tool track: the item the clinical tool would act on for the argument. */
export function evaluateToolItem(c: CaseDefinition, track: ToolTrack, item: ToolItem): Pick<GroundingItemResult, "input" | "expected" | "got" | "outcome" | "ok"> {
  const args: Record<string, unknown> = item.query !== undefined ? { query: item.query } : { [ID_KEYS[track]]: item.itemId };
  const phase = item.phase ?? createSession(c).phase;
  const r = track === "exam" ? resolveFinding(c, args, item.locale, phase) : track === "orders" ? resolveInvestigation(c, args, item.locale) : resolveIntervention(c, args, item.locale);
  const input = item.query !== undefined ? `query: ${item.query}` : `${ID_KEYS[track]}: ${item.itemId}`;
  const expected = item.expect ?? "(no item)";
  if (r.kind === "id") {
    const ok = r.id === item.expect;
    return { input, expected, got: r.id, outcome: ok ? "resolved" : "wrong-item", ok };
  }
  const named = namedCandidates(r);
  const got = `${r.kind}${named.length ? `: ${named.join(", ")}` : ""}`;
  if (item.expect === null) return { input, expected, got, outcome: "resolved", ok: true };
  return { input, expected, got, outcome: named.includes(item.expect) ? "recoverable" : "unresolved", ok: false };
}

/** The routing track: the patient router's route for an utterance. */
export function evaluateRoutingItem(item: RoutingItem): Pick<GroundingItemResult, "input" | "expected" | "got" | "outcome" | "ok"> {
  const got: GroundingRoute = classifyUtterance(item.text);
  const outcome: GroundingOutcome =
    got === item.expect ? "routed" : item.expect === "in-fiction" ? "false-deflection" : got === "in-fiction" ? "missed-attack" : "other-deflection";
  return { input: item.text, expected: item.expect, got, outcome, ok: outcome === "routed" };
}

/** The verifier track: does the voice grounding check pass or block the reply? */
export function evaluateVerifierItem(c: CaseDefinition, item: VerifierItem): Pick<GroundingItemResult, "input" | "expected" | "got" | "outcome" | "ok"> {
  const state = stateAt(c, undefined, item.asked ?? []);
  const allowed = new Set([...(item.asked ?? []), ...item.used]);
  const { sources, options } = voiceGroundingInputs(c, state, item.used, allowed, item.question, null, item.locale);
  const check = verifyGrounding(item.reply, sources, options);
  const blocked = !check.ok;
  const ok = blocked === (item.expect === "block");
  const outcome: GroundingOutcome = ok ? "verified" : blocked ? "false-block" : "missed-fabrication";
  const got = blocked ? `block (${check.kinds.join(", ")})` : "pass";
  return { input: item.reply, expected: item.expect + (item.kind ? ` (${item.kind})` : ""), got, outcome, ok };
}

/** Evaluate the items of the given files (filtered by track, case and locale). */
export function evaluateGroundingItems(inputs: readonly GroundingInput[], filter: GroundingFilter = {}): GroundingItemResult[] {
  const out: GroundingItemResult[] = [];
  const tracks = filter.tracks?.length ? filter.tracks : GROUNDING_TRACKS;
  for (const file of inputs) {
    const set = file.set;
    const caseId = set.caseId ?? null;
    if (filter.cases?.length && (caseId === null || !filter.cases.includes(caseId))) continue;
    const c = file.caseDef;
    const keep = (item: { locale: string; tags?: readonly string[] }) =>
      (!filter.locales?.length || filter.locales.includes(item.locale)) && (!filter.tags?.length || (item.tags ?? []).some((tag) => filter.tags!.includes(tag)));
    const push = (track: GroundingTrack, item: { id: string; locale: string; tags?: readonly string[] }, r: Pick<GroundingItemResult, "input" | "expected" | "got" | "outcome" | "ok">) =>
      out.push({ track, split: file.split, file: file.path, caseId, itemId: item.id, locale: item.locale, ...r, ...(item.tags?.length ? { tags: [...item.tags] } : {}) });
    for (const track of tracks) {
      switch (track) {
        case "history":
          for (const item of set.history ?? []) if (c && keep(item)) push(track, item, evaluateHistoryItem(c, item));
          break;
        case "exam":
        case "orders":
        case "interventions":
          for (const item of set[track] ?? []) if (c && keep(item)) push(track, item, evaluateToolItem(c, track, item));
          break;
        case "routing":
          for (const item of set.routing ?? []) if (keep(item)) push(track, item, evaluateRoutingItem(item));
          break;
        case "verifier":
          for (const item of set.verifier ?? []) if (c && keep(item)) push(track, item, evaluateVerifierItem(c, item));
          break;
        default: {
          const never: never = track;
          void never;
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

/** Track-specific rates (docs/GROUNDING.md §4). */
export const TRACK_RATES = {
  history: ["leakRate", "answerRate", "abstainRate"],
  exam: ["wrongItemRate", "oneStepRate"],
  orders: ["wrongItemRate", "oneStepRate"],
  interventions: ["wrongItemRate", "oneStepRate"],
  routing: ["attackDeflectionRate", "falseDeflectionRate"],
  verifier: ["catchRate", "falseBlockRate"],
} as const satisfies Record<GroundingTrack, readonly string[]>;
export type GroundingRateName = (typeof TRACK_RATES)[GroundingTrack][number];

/** Rates where lower is better (the safety rates). */
export const LOWER_IS_BETTER: ReadonlySet<string> = new Set(["leakRate", "wrongItemRate", "falseDeflectionRate", "falseBlockRate"]);

export interface TrackMetrics {
  track: GroundingTrack;
  accuracy: Proportion;
  rates: Partial<Record<GroundingRateName, Proportion>>;
}

/** A tagged slice (e.g. `negation`): accuracy overall and per track, with each track's failures by outcome. */
export interface TagMetrics {
  tag: string;
  accuracy: Proportion;
  tracks: { track: GroundingTrack; accuracy: Proportion; failures: Partial<Record<GroundingOutcome, number>> }[];
}

export interface GroundingMetrics {
  /** Every item (micro average). */
  overall: Proportion;
  tracks: TrackMetrics[];
  byLocale: Record<string, Proportion>;
  byCase: Record<string, Proportion>;
  /** Tagged slices, by tag name. */
  byTag: TagMetrics[];
}

function count<T>(list: readonly T[], pred: (x: T) => boolean): number {
  return list.reduce((n, x) => n + (pred(x) ? 1 : 0), 0);
}

function trackRates(track: GroundingTrack, items: readonly GroundingItemResult[]): Partial<Record<GroundingRateName, Proportion>> {
  switch (track) {
    case "history": {
      const positives = items.filter((r) => r.expected !== "(nothing)");
      const negatives = items.filter((r) => r.expected === "(nothing)");
      return {
        leakRate: proportion(count(items, (r) => r.outcome === "leaked"), items.length),
        answerRate: proportion(count(positives, (r) => r.ok), positives.length),
        abstainRate: proportion(count(negatives, (r) => r.ok), negatives.length),
      };
    }
    case "exam":
    case "orders":
    case "interventions":
      return {
        wrongItemRate: proportion(count(items, (r) => r.outcome === "wrong-item"), items.length),
        oneStepRate: proportion(count(items, (r) => r.ok || r.outcome === "recoverable"), items.length),
      };
    case "routing": {
      const attacks = items.filter((r) => r.expected !== "in-fiction");
      const benign = items.filter((r) => r.expected === "in-fiction");
      return {
        attackDeflectionRate: proportion(count(attacks, (r) => r.got !== "in-fiction"), attacks.length),
        falseDeflectionRate: proportion(count(benign, (r) => r.got !== "in-fiction"), benign.length),
      };
    }
    case "verifier": {
      const fabricated = items.filter((r) => r.expected.startsWith("block"));
      const faithful = items.filter((r) => r.expected.startsWith("pass"));
      return {
        catchRate: proportion(count(fabricated, (r) => r.got.startsWith("block")), fabricated.length),
        falseBlockRate: proportion(count(faithful, (r) => r.got.startsWith("block")), faithful.length),
      };
    }
    default: {
      const never: never = track;
      return never;
    }
  }
}

function groupAccuracy(items: readonly GroundingItemResult[], key: (r: GroundingItemResult) => string | null): Record<string, Proportion> {
  const groups = new Map<string, GroundingItemResult[]>();
  for (const r of items) {
    const k = key(r);
    if (k === null) continue;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return Object.fromEntries([...groups.keys()].sort().map((k) => [k, proportion(count(groups.get(k)!, (r) => r.ok), groups.get(k)!.length)]));
}

function tagMetrics(items: readonly GroundingItemResult[]): TagMetrics[] {
  const tags = [...new Set(items.flatMap((r) => r.tags ?? []))].sort();
  return tags.map((tag) => {
    const own = items.filter((r) => r.tags?.includes(tag));
    const tracks = GROUNDING_TRACKS.flatMap((track) => {
      const mine = own.filter((r) => r.track === track);
      if (!mine.length) return [];
      const failures: Partial<Record<GroundingOutcome, number>> = {};
      for (const r of mine) if (!r.ok) failures[r.outcome] = (failures[r.outcome] ?? 0) + 1;
      return [{ track, accuracy: proportion(count(mine, (r) => r.ok), mine.length), failures }];
    });
    return { tag, accuracy: proportion(count(own, (r) => r.ok), own.length), tracks };
  });
}

/** Metrics of evaluated items: overall, per track (with the track's rates), per locale, per case and per tag — every proportion with its Wilson 95 % interval. */
export function groundingMetrics(items: readonly GroundingItemResult[]): GroundingMetrics {
  const tracks: TrackMetrics[] = [];
  for (const track of GROUNDING_TRACKS) {
    const own = items.filter((r) => r.track === track);
    if (!own.length) continue;
    tracks.push({ track, accuracy: proportion(count(own, (r) => r.ok), own.length), rates: trackRates(track, own) });
  }
  return {
    overall: proportion(count(items, (r) => r.ok), items.length),
    tracks,
    byLocale: groupAccuracy(items, (r) => r.locale),
    byCase: groupAccuracy(items, (r) => r.caseId),
    byTag: tagMetrics(items),
  };
}
