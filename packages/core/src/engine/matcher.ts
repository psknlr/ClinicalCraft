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
 *   ordered by score, then declaration order.
 */
import type { CaseDefinition } from "../schema/case.js";
import { t } from "../i18n.js";
import { allListEntries, allTexts, normalizeQuery, phraseScore, prepare, unique, type Prepared } from "./text.js";
import type { MatchHit } from "./types.js";

export { normalizeQuery } from "./text.js";

/** Minimum score for a hit to be returned. */
export const MATCH_THRESHOLD = 0.34;

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

/** Normalised order aliases of an investigation (all locales; the localized names count as aliases). */
function orderAliases(investigation: CaseDefinition["investigations"][number], locale: string): string[] {
  const phrases = [...allListEntries(investigation.aliases, locale), ...allTexts(investigation.name, locale)];
  return unique(phrases.map(normalizeQuery).filter((p) => p.length > 0));
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
 *    (any locale, normalised) contained in the normalised query;
 * 2. `orderMatching.rules` in order — a rule applies when all of `ifHas`,
 *    `unlessHas`, `ifMatches`, `unlessMatches` hold; it removes `remove`,
 *    then appends missing `add` ids;
 * 3. an `orderMatching.exact` entry equal to the query replaces the result.
 *
 * Unknown ids produced by rules are dropped.
 */
export function matchOrders(c: CaseDefinition, query: string, locale: string): string[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  let candidates = c.investigations.filter((inv) => orderAliases(inv, locale).some((alias) => q.includes(alias))).map((inv) => inv.id);
  for (const rule of c.orderMatching.rules) {
    if (ruleApplies(rule, candidates, q)) candidates = applyRule(rule, candidates);
  }
  candidates = exactMatch(c, q) ?? candidates;
  const known = new Set(c.investigations.map((i) => i.id));
  return candidates.filter((id) => known.has(id));
}

/**
 * Notices for ordering `investigationId` with `query` (V4: "平扫CT" warns that
 * only contrast-enhanced CT images exist), localized.
 */
export function orderWarnings(c: CaseDefinition, query: string, investigationId: string, locale: string): string[] {
  const q = normalizeQuery(query);
  return c.orderMatching.warnings.filter((w) => w.investigation === investigationId && regexTest(w.ifMatches, q)).map((w) => t(w.message, locale));
}

/* ------------------------------------------------------------------ */
/* Scored matching                                                     */
/* ------------------------------------------------------------------ */

interface IndexedItem {
  id: string;
  phrases: Prepared[];
}

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

function scoreItems(items: IndexedItem[], utterance: string): MatchHit[] {
  const u = prepare(utterance);
  if (!u.compact) return [];
  const hits: MatchHit[] = [];
  for (const item of items) {
    let best = 0;
    for (const phrase of item.phrases) {
      best = Math.max(best, phraseScore(u, phrase));
      if (best >= 1) break;
    }
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

/** History items matching a learner utterance (question + keywords, all locales). */
export function matchHistory(c: CaseDefinition, utterance: string, locale: string): MatchHit[] {
  const index = cachedIndex(c.history, `history:${locale}`, () =>
    c.history.map((h) => ({ id: h.id, phrases: preparePhrases([...allTexts(h.question, locale), ...allListEntries(h.keywords, locale)]) })),
  );
  return scoreItems(index, utterance);
}

/** Exam findings matching a learner utterance (maneuver + keywords, all locales). */
export function matchExam(c: CaseDefinition, utterance: string, locale: string): MatchHit[] {
  const index = cachedIndex(c.exam, `exam:${locale}`, () =>
    c.exam.map((e) => ({ id: e.id, phrases: preparePhrases([...allTexts(e.maneuver, locale), ...allListEntries(e.keywords, locale)]) })),
  );
  return scoreItems(index, utterance);
}

/** Interventions matching a learner utterance (name + aliases, all locales). */
export function matchInterventions(c: CaseDefinition, utterance: string, locale: string): MatchHit[] {
  const index = cachedIndex(c.interventions, `interventions:${locale}`, () =>
    c.interventions.map((i) => ({ id: i.id, phrases: preparePhrases([...allTexts(i.name, locale), ...allListEntries(i.aliases, locale)]) })),
  );
  return scoreItems(index, utterance);
}
