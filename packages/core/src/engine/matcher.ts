/**
 * Offline intent matching (docs/ARCHITECTURE.md §3.3) — used by the UI, the
 * CLI, scripted agents, and as retrieval hints for LLM agents.
 *
 * * `matchOrders` generalises V4's hand-written order matcher (`Xd`):
 *   normalised-substring aliases → declarative `orderMatching.rules` →
 *   `orderMatching.exact` overrides. With the V4 rules it reproduces V4
 *   exactly (see matcher.test.ts).
 * * `matchHistory` / `matchExam` / `matchInterventions` are scored keyword
 *   matchers over candidate phrases from the requested locale and every
 *   other locale (cross-lingual), returning hits ≥ `MATCH_THRESHOLD`
 *   ordered by score, then declaration order. An item whose
 *   `excludeKeywords` (any locale) occur in the normalised utterance has its
 *   score multiplied by `EXCLUDE_KEYWORD_FACTOR` before the threshold.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { t } from "../i18n.js";
import { evaluate } from "./conditions.js";
import { hasHistoryTwins, historyTwin } from "./twins.js";
import { allListEntries, allTexts, compactText, normalizeQuery, phraseCoverage, phraseScore, prepare, unique, type Prepared } from "./text.js";
import type { MatchHit, MatchOptions } from "./types.js";

export { normalizeQuery } from "./text.js";

/** Minimum score for a hit to be returned. */
export const MATCH_THRESHOLD = 0.34;

/** Score multiplier for an item one of whose `excludeKeywords` occurs in the utterance. */
export const EXCLUDE_KEYWORD_FACTOR = 0.2;

/* ------------------------------------------------------------------ */
/* Regular expressions from case data                                  */
/* ------------------------------------------------------------------ */

const regexCache = new Map<string, RegExp | null>();

/** Compile a case-supplied regular expression (cached); `null` when invalid. */
export function compileCaseRegex(source: string): RegExp | null {
  let re = regexCache.get(source);
  if (re === undefined) {
    try {
      re = new RegExp(source);
    } catch {
      re = null;
    }
    regexCache.set(source, re);
  }
  return re;
}

function regexTest(source: string, text: string): boolean {
  const re = compileCaseRegex(source);
  return re != null && re.test(text);
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

type Investigation = CaseDefinition["investigations"][number];

const aliasCache = new WeakMap<Investigation, string[]>();

/** Normalised order aliases of an investigation (every locale; the localized names count as aliases). */
function orderAliases(investigation: Investigation): string[] {
  let aliases = aliasCache.get(investigation);
  if (!aliases) {
    const phrases = [...allListEntries(investigation.aliases, "*"), ...allTexts(investigation.name, "*")];
    aliases = unique(phrases.map(normalizeQuery).filter((p) => p.length > 0));
    aliasCache.set(investigation, aliases);
  }
  return aliases;
}

type MatchRule = CaseDefinition["orderMatching"]["rules"][number];

function ruleApplies(rule: MatchRule, candidates: string[], query: string): boolean {
  if (rule.ifHas != null && !candidates.includes(rule.ifHas)) return false;
  if (rule.unlessHas != null && candidates.includes(rule.unlessHas)) return false;
  if (rule.ifMatches != null && !regexTest(rule.ifMatches, query)) return false;
  if (rule.unlessMatches != null && regexTest(rule.unlessMatches, query)) return false;
  return true;
}

function applyRule(rule: MatchRule, candidates: string[]): string[] {
  const next = candidates.filter((id) => !rule.remove.includes(id));
  for (const id of rule.add) if (!next.includes(id)) next.push(id);
  return next;
}

function exactMatch(c: CaseDefinition, query: string): string[] | null {
  for (const [key, ids] of Object.entries(c.orderMatching.exact)) {
    if (normalizeQuery(key) === query) return [...ids];
  }
  return null;
}

/**
 * Investigation ids an order-entry query refers to (V4 semantics, generalised):
 *
 * 1. candidates = investigations (declaration order) with an alias or name
 *    (of any locale — `locale` does not narrow them; normalised) contained in
 *    the normalised query;
 * 2. `orderMatching.rules` in order — a rule applies when all of `ifHas`,
 *    `unlessHas`, `ifMatches`, `unlessMatches` hold; it removes `remove`,
 *    then appends missing `add` ids;
 * 3. an `orderMatching.exact` entry equal to the query replaces the result.
 *
 * Unknown ids produced by rules are dropped.
 */
export function matchOrders(c: CaseDefinition, query: string, _locale: string): string[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  let candidates = c.investigations.filter((inv) => orderAliases(inv).some((alias) => q.includes(alias))).map((inv) => inv.id);
  for (const rule of c.orderMatching.rules) {
    if (ruleApplies(rule, candidates, q)) candidates = applyRule(rule, candidates);
  }
  candidates = exactMatch(c, q) ?? candidates;
  const known = new Set(c.investigations.map((i) => i.id));
  return candidates.filter((id) => known.has(id));
}

/**
 * Notices for ordering `investigationId` with `query` (V4: "平扫CT" warns that
 * only contrast-enhanced CT images exist), localized. With `state` (the
 * session as the order is placed, i.e. before it), a warning whose `unless`
 * condition holds no longer applies and is left out; without `state`,
 * `unless` is not evaluated (every matching warning is returned).
 */
export function orderWarnings(c: CaseDefinition, query: string, investigationId: string, locale: string, state?: SessionState): string[] {
  const q = normalizeQuery(query);
  return c.orderMatching.warnings
    .filter((w) => w.investigation === investigationId && regexTest(w.ifMatches, q))
    .filter((w) => !(state && w.unless && evaluate(c, state, w.unless)))
    .map((w) => t(w.message, locale));
}

/* ------------------------------------------------------------------ */
/* Scored matching                                                     */
/* ------------------------------------------------------------------ */

interface IndexedItem {
  id: string;
  phrases: Prepared[];
  /** `excludeKeywords` of every locale, as `compactText` (non-empty, unique). */
  exclude: string[];
  /** Phases the item is restricted to (undefined = every phase). */
  phases?: string[];
  /** History item with `disclosure: "unknown"`. */
  unknown?: boolean;
}

/** Prepared phrase indexes per case collection (case data is treated as immutable). */
const indexCache = new WeakMap<object, Map<string, IndexedItem[]>>();

function cachedIndex(owner: object, key: string, build: () => IndexedItem[]): IndexedItem[] {
  let perOwner = indexCache.get(owner);
  if (!perOwner) {
    perOwner = new Map();
    indexCache.set(owner, perOwner);
  }
  let index = perOwner.get(key);
  if (!index) {
    index = build();
    perOwner.set(key, index);
  }
  return index;
}

/** Items eligible under `options`: `phase` drops items restricted to other phases; `includeUnknown: false` drops unknown-disclosure items. */
function eligible(item: IndexedItem, options: MatchOptions): boolean {
  if (options.phase != null && item.phases && !item.phases.includes(options.phase)) return false;
  if (options.includeUnknown === false && item.unknown) return false;
  return true;
}

function scoreItems(items: IndexedItem[], utterance: string, options: MatchOptions = {}): MatchHit[] {
  const u = prepare(utterance);
  if (!u.compact) return [];
  const hits: MatchHit[] = [];
  for (const item of items) {
    if (!eligible(item, options)) continue;
    let best = 0;
    for (const phrase of item.phrases) {
      best = Math.max(best, phraseScore(u, phrase));
      if (best >= 1) break;
    }
    if (best > 0 && item.exclude.some((x) => u.compact.includes(x))) best *= EXCLUDE_KEYWORD_FACTOR;
    const score = Math.round(best * 10000) / 10000;
    if (score >= MATCH_THRESHOLD) hits.push({ id: item.id, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}

function preparePhrases(texts: string[]): Prepared[] {
  return unique(texts)
    .map(prepare)
    .filter((p) => p.compact.length > 0);
}

/** Normalised exclude phrases of every locale (`excludeKeywords` may be absent on cases built in code). */
function excludePhrases(list: Parameters<typeof allListEntries>[0]): string[] {
  return unique(allListEntries(list, "*").map(compactText).filter((x) => x.length > 0));
}

/**
 * History items matching a learner utterance (question + keywords, all
 * locales). `options.phase` drops items restricted to other phases and
 * applies phase twins (`history[].supersedes`): a hit on an item superseded
 * in that phase counts for the item that supersedes it there (`historyTwin`;
 * the twin keeps the best of the scores) — whether or not the superseded
 * item is itself listed for the phase — so its answer is never selected
 * there. `options.includeUnknown: false` drops `disclosure: "unknown"` items
 * (default: included, so the patient can say "not recorded").
 */
export function matchHistory(c: CaseDefinition, utterance: string, locale: string, options: MatchOptions = {}): MatchHit[] {
  const index = historyIndex(c, locale);
  const phase = options.phase;
  if (phase == null || !hasHistoryTwins(c)) return scoreItems(index, utterance, options);
  const unknown = new Set(index.filter((item) => item.unknown).map((item) => item.id));
  const best = new Map<string, number>();
  for (const hit of scoreItems(index, utterance, { ...options, phase: undefined })) {
    const id = historyTwin(c, hit.id, phase);
    if (id === null || (options.includeUnknown === false && unknown.has(id))) continue;
    best.set(id, Math.max(best.get(id) ?? 0, hit.score));
  }
  const order = new Map(index.map((item, i) => [item.id, i]));
  return [...best]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

function historyIndex(c: CaseDefinition, locale: string): IndexedItem[] {
  return cachedIndex(c.history, `history:${locale}`, () =>
    c.history.map((h) => ({
      id: h.id,
      phrases: preparePhrases([...allTexts(h.question, locale), ...allListEntries(h.keywords, locale)]),
      exclude: excludePhrases(h.excludeKeywords),
      phases: h.phases,
      unknown: h.disclosure === "unknown",
    })),
  );
}

/**
 * Exam findings matching a learner utterance (maneuver + keywords, all
 * locales). `options.phase` drops findings restricted to other phases
 * (`includeUnknown` does not apply: findings have no disclosure policy).
 */
export function matchExam(c: CaseDefinition, utterance: string, locale: string, options: MatchOptions = {}): MatchHit[] {
  return scoreItems(examIndex(c, locale), utterance, options);
}

function examIndex(c: CaseDefinition, locale: string): IndexedItem[] {
  return cachedIndex(c.exam, `exam:${locale}`, () =>
    c.exam.map((e) => ({
      id: e.id,
      phrases: preparePhrases([...allTexts(e.maneuver, locale), ...allListEntries(e.keywords, locale)]),
      exclude: excludePhrases(e.excludeKeywords),
      phases: e.phases,
    })),
  );
}

/** Interventions matching a learner utterance (name + aliases, all locales). */
export function matchInterventions(c: CaseDefinition, utterance: string, locale: string): MatchHit[] {
  return scoreItems(interventionIndex(c, locale), utterance);
}

function interventionIndex(c: CaseDefinition, locale: string): IndexedItem[] {
  return cachedIndex(c.interventions, `interventions:${locale}`, () =>
    c.interventions.map((i) => ({
      id: i.id,
      phrases: preparePhrases([...allTexts(i.name, locale), ...allListEntries(i.aliases, locale)]),
      exclude: excludePhrases(i.excludeKeywords),
    })),
  );
}

/** Which scored matcher `matchSpecificity` consults. */
export type MatchKind = "history" | "exam" | "interventions";

/**
 * Specificity of an item's match (tie-break only; scores are unchanged): the
 * coverage (`phraseCoverage`, in characters) of the item's best-scoring
 * phrase(s) for the utterance — so of two items tied at the same score the
 * one whose matched alias is longer and more specific ("activate the cath
 * lab" over "go to cath lab", "defib pads" over "defib") can be preferred.
 * 0 for an unknown id or no matching phrase.
 */
export function matchSpecificity(c: CaseDefinition, kind: MatchKind, utterance: string, locale: string, id: string): number {
  const index = kind === "history" ? historyIndex(c, locale) : kind === "exam" ? examIndex(c, locale) : interventionIndex(c, locale);
  const item = index.find((x) => x.id === id);
  const u = prepare(utterance);
  if (!item || !u.compact) return 0;
  let best = 0;
  let coverage = 0;
  for (const phrase of item.phrases) {
    const score = phraseScore(u, phrase);
    if (score <= 0) continue;
    const cover = phraseCoverage(u, phrase);
    if (score > best + 1e-9) {
      best = score;
      coverage = cover;
    } else if (Math.abs(score - best) <= 1e-9) coverage = Math.max(coverage, cover);
  }
  return coverage;
}
