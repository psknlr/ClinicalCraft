/**
 * Offline intent matching (docs/ARCHITECTURE.md §3.3) — used by the UI, the
 * CLI, scripted agents, and as retrieval hints for LLM agents.
 *
 * * `matchOrders` generalises V4's hand-written order matcher (`Xd`):
 *   normalised-substring aliases → declarative `orderMatching.rules` →
 *   `orderMatching.exact` overrides. With the V4 rules it reproduces V4
 *   exactly (see matcher.test.ts). An alias that begins with a Latin letter
 *   or digit must begin a word of the order, and a short one (its last run
 *   of letters ≤ 3) must end one too: "tte" is not in "better", nor "ua" in
 *   "evaluate", nor "ct" in "CTPA".
 * * `matchHistory` / `matchExam` / `matchInterventions` are scored keyword
 *   matchers over candidate phrases from the requested locale and every
 *   other locale (cross-lingual), returning hits ≥ `MATCH_THRESHOLD`
 *   ordered by score, then declaration order. An item whose
 *   `excludeKeywords` (any locale) occur in the normalised utterance
 *   (`containsExclusion`: not after a prefix that reverses the word —
 *   "discontinue" holds no "continue" —, and where a word begins for one that
 *   begins with a function word or a digit) has its score multiplied by
 *   `EXCLUDE_KEYWORD_FACTOR` before the threshold. A greeting that opens a
 *   question ("Good morning,", "您好，") is not scored. In intervention
 *   matching a generic order verb ("give", "start", "administer") matches
 *   nothing on its own: "give oxygen" is no half of "give atropine".
 * * `matchInterventions` reads negation (`analyzeNegation`): an instruction
 *   that negates an item ("don't give GTN", "不要静推氯化钾") never returns
 *   it; it returns the item that itself withholds ("stop the pump", "nil by
 *   mouth"), or nothing (`interventionNegation` says what was withheld). An
 *   exclusion that only a negated clause holds argues less against what the
 *   affirmative clauses ask for (`NEGATED_EXCLUDE_FACTOR`: "give cefotaxime,
 *   not ceftriaxone").
 */
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { t } from "../i18n.js";
import { evaluate } from "./conditions.js";
import { hasHistoryTwins, historyTwin } from "./twins.js";
import { analyzeNegation, type NegationAnalysis } from "./negation.js";
import { allListEntries, allTexts, containsExclusion, exclusion, normalizeQuery, phraseCoverage, phraseEvidence, phraseScore, prepare, stripGreeting, toHalfWidth, tokenize, unique, type Exclusion, type Prepared } from "./text.js";
import type { MatchHit, MatchOptions } from "./types.js";

export { normalizeQuery } from "./text.js";

/** Minimum score for a hit to be returned. */
export const MATCH_THRESHOLD = 0.34;

/** Score multiplier for an item one of whose `excludeKeywords` occurs in the utterance. */
export const EXCLUDE_KEYWORD_FACTOR = 0.2;

/**
 * Score multiplier for an intervention whose exclusion occurs only in a negated clause of the instruction: the
 * clause withholds it, so it argues against the item less ("give cefotaxime, not ceftriaxone" still gives the
 * cefotaxime) — but still breaks a tie ("antibiotics instead of surgery": the antibiotics-first plan over plain
 * antibiotics).
 */
export const NEGATED_EXCLUDE_FACTOR = 0.8;

/**
 * Share of its whole-utterance score an intervention keeps when the
 * affirmative words support it only in part and the rest of its match lies in
 * a negated clause (an ellipsis: "no more fluid boluses, run maintenance
 * only" → maintenance fluids). Below 1 so that an item the affirmative words
 * name in full wins.
 */
export const ELLIPSIS_FACTOR = 0.8;

/** Items within this much of the best match of a negated clause are what that clause withholds. */
export const NEGATED_MARGIN = 0.1;

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

/** An order as `normalizeQuery` leaves it, with where its words of Latin letters or digits begin and end. */
interface OrderText {
  text: string;
  /** Indices in `text` where such a word begins. */
  starts: Set<number>;
  /** Indices in `text` just after such a word ends. */
  ends: Set<number>;
}

const LATIN_OR_DIGIT = /[a-z0-9]/;

function orderText(query: string): OrderText {
  const folded = toHalfWidth(query).toLowerCase();
  const chars = [...folded];
  const starts = new Set<number>();
  const ends = new Set<number>();
  let text = "";
  chars.forEach((ch, i) => {
    if (/\s/u.test(ch)) return;
    const latin = LATIN_OR_DIGIT.test(ch);
    if (latin && !LATIN_OR_DIGIT.test(chars[i - 1] ?? "")) starts.add(text.length);
    text += ch;
    if (latin && !LATIN_OR_DIGIT.test(chars[i + 1] ?? "")) ends.add(text.length);
  });
  return { text, starts, ends };
}

/** Length of the alias's last run of Latin letters or digits up to which it must end a word of the order. */
const SHORT_ALIAS_TAIL = 3;

/**
 * True when the order holds the alias: anywhere for one that begins with a Han character; where a word begins for one
 * that begins with a Latin letter or digit; and, when its last run of letters or digits is short ("tte", "ct", "u&e"),
 * where a word ends (a plural "s" aside: "LFTs").
 */
function orderHolds(order: OrderText, alias: string): boolean {
  const latinStart = LATIN_OR_DIGIT.test(alias[0] ?? "");
  const tail = /[a-z0-9]+$/.exec(alias)?.[0].length ?? 0;
  const mustEnd = tail > 0 && tail <= SHORT_ALIAS_TAIL;
  for (let at = order.text.indexOf(alias); at >= 0; at = order.text.indexOf(alias, at + 1)) {
    if (latinStart && !order.starts.has(at)) continue;
    const end = at + alias.length;
    if (mustEnd && !order.ends.has(end) && !(order.text[end] === "s" && order.ends.has(end + 1))) continue;
    return true;
  }
  return false;
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
 *    the normalised query (`orderHolds`: a Latin alias where a word begins,
 *    a short one where a word ends too);
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
  const order = orderText(query);
  let candidates = c.investigations.filter((inv) => orderAliases(inv).some((alias) => orderHolds(order, alias))).map((inv) => inv.id);
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
  /** `excludeKeywords` of every locale (`exclusion`: non-empty, unique). */
  exclude: Exclusion[];
  /** Phases the item is restricted to (undefined = every phase). */
  phases?: string[];
  /** History item with `disclosure: "unknown"`. */
  unknown?: boolean;
  /** Interventions: the phrases that negate nothing (as `phrases`, minus `polar`). */
  plain?: Prepared[];
  /** Interventions: the phrases that themselves withhold ("stop the pump", "禁食"), by polarity. */
  polar?: PolarPhrase[];
}

/** A phrase that negates something, split into what it asks for and what it withholds. */
interface PolarPhrase {
  affirmative: Prepared;
  negated: Prepared;
  /** Size of each part: tokens (Latin) or characters (CJK). */
  affirmativeWeight: number;
  negatedWeight: number;
}

/** A negated utterance prepared for `scoreNegated`. */
interface PolarUtterance {
  full: Prepared;
  affirmative: Prepared;
  scopes: Prepared[];
  /** The scopes read together, when there are several ("禁食禁水": 食 and 水 — what "禁食禁水" withholds). */
  joined?: Prepared;
}

function weightOf(p: Prepared): number {
  return p.cjk ? p.compact.length : p.tokens.length;
}

/** Split a phrase by polarity; null when it negates nothing (or only as a double negative). */
function polarPhrase(text: string): PolarPhrase | null {
  const negation = analyzeNegation(text);
  if (!negation.negated || negation.doubleNegated.length > 0) return null;
  const affirmative = prepareIntervention(negation.affirmative);
  const negated = prepareIntervention(negation.scopes.join(" "));
  const negatedWeight = weightOf(negated);
  return negatedWeight > 0 ? { affirmative, negated, affirmativeWeight: weightOf(affirmative), negatedWeight } : null;
}

/** Polarity-aligned score: the phrase's withheld words against the utterance's negated clauses, the rest against its affirmative words. */
function polarScore(u: PolarUtterance, p: PolarPhrase): number {
  const negated = Math.max(0, ...[...u.scopes, ...(u.joined ? [u.joined] : [])].map((scope) => phraseScore(scope, p.negated)));
  const affirmative = p.affirmativeWeight > 0 ? phraseScore(u.affirmative, p.affirmative) : 0;
  return (negated * p.negatedWeight + affirmative * p.affirmativeWeight) / (p.negatedWeight + p.affirmativeWeight);
}

function polarCoverage(u: PolarUtterance, p: PolarPhrase): number {
  const negated = Math.max(0, ...[...u.scopes, ...(u.joined ? [u.joined] : [])].map((scope) => phraseCoverage(scope, p.negated)));
  return negated + (p.affirmativeWeight > 0 ? phraseCoverage(u.affirmative, p.affirmative) : 0);
}

function polarUtterance(utterance: string, negation: NegationAnalysis, prep: (text: string) => Prepared = prepare): PolarUtterance {
  return {
    full: prep(utterance),
    affirmative: prep(negation.affirmative),
    scopes: negation.scopes.map(prep),
    ...(negation.scopes.length > 1 ? { joined: prep(negation.scopes.join(" ")) } : {}),
  };
}

/** Generic order verbs (canonical tokens): alone they match no intervention ("give oxygen" is no half of "give atropine"). */
const ORDER_VERBS: ReadonlySet<string> = new Set(
  tokenize(
    "give gives giving given gave administer administers administered administering start starts started starting commence commences commenced commencing " +
      "begin begins began beginning initiate initiates initiated initiating prescribe prescribes prescribed prescribing order orders ordered ordering",
  ),
);

/** `prepare` for intervention matching: generic order verbs are weak tokens (`Prepared.weak`). */
function prepareIntervention(text: string): Prepared {
  const p = prepare(text);
  return p.tokens.some((t) => ORDER_VERBS.has(t)) ? { ...p, weak: ORDER_VERBS } : p;
}

/** True when `analyzeNegation` found something to read (a negated clause or a double negative). */
function negates(negation: NegationAnalysis): boolean {
  return negation.negated || negation.doubleNegated.length > 0;
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

function scoreItems(items: IndexedItem[], utterance: string, options: MatchOptions = {}, prep: (text: string) => Prepared = prepare): MatchHit[] {
  const u = prep(utterance);
  if (!u.compact) return [];
  const hits: MatchHit[] = [];
  for (const item of items) {
    if (!eligible(item, options)) continue;
    let best = 0;
    for (const phrase of item.phrases) {
      best = Math.max(best, phraseScore(u, phrase));
      if (best >= 1) break;
    }
    if (best > 0 && item.exclude.some((x) => containsExclusion(u, x))) best *= EXCLUDE_KEYWORD_FACTOR;
    const score = Math.round(best * 10000) / 10000;
    if (score >= MATCH_THRESHOLD) hits.push({ id: item.id, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}

function preparePhrases(texts: string[], prep: (text: string) => Prepared = prepare): Prepared[] {
  return unique(texts)
    .map(prep)
    .filter((p) => p.compact.length > 0);
}

/** Exclusions of every locale (`excludeKeywords` may be absent on cases built in code). */
function excludePhrases(list: Parameters<typeof allListEntries>[0]): Exclusion[] {
  const seen = new Set<string>();
  return allListEntries(list, "*")
    .map(exclusion)
    .filter((x): x is Exclusion => x !== null && !seen.has(`${x.compact}|${x.wordStart}`) && !!seen.add(`${x.compact}|${x.wordStart}`));
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
export function matchHistory(c: CaseDefinition, question: string, locale: string, options: MatchOptions = {}): MatchHit[] {
  const utterance = stripGreeting(question);
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

/**
 * History hits (as `matchHistory` returns them) less those whose evidence
 * another hit's evidence properly contains — the more specific match accounts
 * for all the other one does, and more: "frothy urine" over "urine", "another
 * hospital" over "hospital", "别人也拉肚子" over "拉肚子". An item's evidence is
 * what its best-scoring phrases account for in the utterance (`phraseEvidence`,
 * all phrases tied for its best score), over its own phrases and, with
 * `phase`, those of the items it answers for there (`historyTwin`). A hit
 * without evidence is kept and drops nothing; order is kept.
 */
export function distinctHistoryHits(c: CaseDefinition, question: string, locale: string, hits: readonly MatchHit[], phase?: string): MatchHit[] {
  if (hits.length < 2) return [...hits];
  const u = prepare(stripGreeting(question));
  const index = historyIndex(c, locale);
  const twins = phase != null && hasHistoryTwins(c);
  const evidence = hits.map((hit) => {
    let best = 0;
    let keys = new Set<string>();
    for (const item of index) {
      if (item.id !== hit.id && !(twins && historyTwin(c, item.id, phase!) === hit.id)) continue;
      for (const phrase of item.phrases) {
        const score = phraseScore(u, phrase);
        if (score <= 0 || score < best - 1e-9) continue;
        if (score > best + 1e-9) keys = new Set();
        for (const key of phraseEvidence(u, phrase)) keys.add(key);
        best = Math.max(best, score);
      }
    }
    return keys;
  });
  const within = (a: Set<string>, b: Set<string>) => a.size > 0 && b.size > a.size && [...a].every((key) => b.has(key));
  return hits.filter((_, i) => !evidence.some((other, j) => j !== i && within(evidence[i]!, other)));
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
  return scoreItems(examIndex(c, locale), stripGreeting(utterance), options);
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

/**
 * Interventions matching a learner utterance (name + aliases, all locales).
 *
 * An utterance without negation is scored like history and exam items. One
 * that negates (`analyzeNegation`) is read by polarity:
 *
 * * a phrase that itself withholds ("stop the pump", "nil by mouth", "不要抽烟")
 *   scores its withheld words against the negated clauses and its other words
 *   against the affirmative ones ("stop the fixed-rate insulin infusion" →
 *   stop the IV insulin infusion);
 * * the items that best match a negated clause (within `NEGATED_MARGIN`) are
 *   withheld and never returned, even when an affirmative clause names their
 *   class ("no IV chlorphenamine, give an antihistamine"); other items need
 *   some affirmative support and keep `ELLIPSIS_FACTOR` of their
 *   whole-utterance score ("no more fluid boluses, run maintenance only";
 *   "stop the morphine, start a morphine PCA" → the PCA);
 * * a double negative ("do not delay antibiotics", "不要停泵") is read
 *   neither way: its clause supports nothing.
 *
 * So "don't give GTN" returns nothing, never the GTN; `interventionNegation`
 * says what it withheld.
 */
export function matchInterventions(c: CaseDefinition, utterance: string, locale: string): MatchHit[] {
  const index = interventionIndex(c, locale);
  const negation = analyzeNegation(utterance);
  return negates(negation)
    ? scoreNegated(index, polarUtterance(utterance, negation, prepareIntervention)).hits
    : scoreItems(index, utterance, {}, prepareIntervention);
}

/** What a negated instruction withholds (`interventionNegation`). */
export interface InterventionNegation {
  /** Items a negated clause names that the instruction does not act on ("don't give GTN" → nitroglycerin). */
  withheld: string[];
  /** Items that themselves withhold something `withheld` names ("hold the morphine" → withhold analgesia), for a reply to offer. */
  alternatives: string[];
  /** What the cues negate (lower-case). */
  scopes: string[];
  /** Clauses with a double negative, read neither way. */
  doubleNegated: string[];
}

/** Minimum similarity (both ways) of a withheld item's phrase and a withholding item's withheld words for the latter to be offered. */
const ALTERNATIVE_THRESHOLD = 0.75;

/** A withheld item's phrase and a withholding item's withheld words name the same thing ("止痛" ~ "不给止痛"; not "infusion" ~ "potassium in the infusion"). */
function sameThing(a: Prepared, b: Prepared): boolean {
  return Math.min(phraseScore(a, b), phraseScore(b, a)) >= ALTERNATIVE_THRESHOLD;
}

/**
 * The negation `matchInterventions` read in an utterance: what it withholds,
 * which items record withholding that, and any double negative. Null when the
 * utterance negates nothing.
 */
export function interventionNegation(c: CaseDefinition, utterance: string, locale: string): InterventionNegation | null {
  const negation = analyzeNegation(utterance);
  if (!negates(negation)) return null;
  const index = interventionIndex(c, locale);
  const { hits, withheld } = scoreNegated(index, polarUtterance(utterance, negation, prepareIntervention));
  const named = index.filter((item) => withheld.includes(item.id));
  const taken = new Set([...withheld, ...hits.map((h) => h.id)]);
  const alternatives = index
    .filter((item) => !taken.has(item.id) && item.polar!.some((p) => named.some((x) => x.plain!.some((phrase) => sameThing(phrase, p.negated)))))
    .map((item) => item.id);
  return { withheld, alternatives, scopes: negation.scopes, doubleNegated: negation.doubleNegated };
}

/** Scores for a negated utterance (see `matchInterventions`), and the items its negated clauses withhold (minus hits). */
function scoreNegated(items: IndexedItem[], u: PolarUtterance): { hits: MatchHit[]; withheld: string[] } {
  if (!u.full.compact) return { hits: [], withheld: [] };
  const rows = items.map((item) => {
    let affirmative = 0;
    let full = 0;
    const negated = u.scopes.map(() => 0);
    for (const phrase of item.plain!) {
      affirmative = Math.max(affirmative, phraseScore(u.affirmative, phrase));
      full = Math.max(full, phraseScore(u.full, phrase));
      u.scopes.forEach((scope, i) => (negated[i] = Math.max(negated[i]!, phraseScore(scope, phrase))));
    }
    const polar = Math.max(0, ...item.polar!.map((p) => polarScore(u, p)));
    return { item, affirmative, full, negated, polar };
  });
  const withheld = new Set<string>();
  u.scopes.forEach((_, i) => {
    const best = Math.max(0, ...rows.map((r) => r.negated[i]!));
    if (best < MATCH_THRESHOLD) return;
    for (const r of rows) if (r.negated[i]! >= best - NEGATED_MARGIN) withheld.add(r.item.id);
  });
  const hits: MatchHit[] = [];
  for (const r of rows) {
    const plain = r.affirmative === 0 || withheld.has(r.item.id) ? 0 : Math.max(r.affirmative, ELLIPSIS_FACTOR * r.full);
    // what the affirmative clauses ask for is excluded by what they say — less by what a negated clause says; a
    // phrase that withholds, by the whole instruction
    const excluded = (text: Prepared) => r.item.exclude.some((x) => containsExclusion(text, x));
    const plainFactor = plain === 0 ? 1 : excluded(u.affirmative) ? EXCLUDE_KEYWORD_FACTOR : excluded(u.full) ? NEGATED_EXCLUDE_FACTOR : 1;
    const best = Math.max(plain * plainFactor, r.polar * (r.polar > 0 && excluded(u.full) ? EXCLUDE_KEYWORD_FACTOR : 1));
    const score = Math.round(best * 10000) / 10000;
    if (score >= MATCH_THRESHOLD) hits.push({ id: r.item.id, score });
  }
  const hit = new Set(hits.map((h) => h.id));
  return { hits: hits.sort((a, b) => b.score - a.score), withheld: [...withheld].filter((id) => !hit.has(id)) };
}

function interventionIndex(c: CaseDefinition, locale: string): IndexedItem[] {
  return cachedIndex(c.interventions, `interventions:${locale}`, () =>
    c.interventions.map((i) => {
      const texts = unique([...allTexts(i.name, locale), ...allListEntries(i.aliases, locale)]);
      const plain: string[] = [];
      const polar: PolarPhrase[] = [];
      for (const text of texts) {
        const split = polarPhrase(text);
        if (split) polar.push(split);
        else plain.push(text);
      }
      return {
        id: i.id,
        phrases: preparePhrases(texts, prepareIntervention),
        exclude: excludePhrases(i.excludeKeywords),
        plain: preparePhrases(plain, prepareIntervention),
        polar,
      };
    }),
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
  const u = kind === "interventions" ? prepareIntervention(utterance) : prepare(stripGreeting(utterance));
  if (!item || !u.compact) return 0;
  let best = 0;
  let coverage = 0;
  const consider = (score: number, cover: () => number) => {
    if (score <= 0) return;
    if (score > best + 1e-9) {
      best = score;
      coverage = cover();
    } else if (Math.abs(score - best) <= 1e-9) coverage = Math.max(coverage, cover());
  };
  const negation = kind === "interventions" ? analyzeNegation(utterance) : null;
  if (negation && negates(negation)) {
    // as matchInterventions reads it: plain phrases on the affirmative words, polar phrases by polarity
    const polar = polarUtterance(utterance, negation, prepareIntervention);
    for (const phrase of item.plain!) consider(phraseScore(polar.affirmative, phrase), () => phraseCoverage(polar.affirmative, phrase));
    for (const phrase of item.polar!) consider(polarScore(polar, phrase), () => polarCoverage(polar, phrase));
    return coverage;
  }
  for (const phrase of item.phrases) consider(phraseScore(u, phrase), () => phraseCoverage(u, phrase));
  return coverage;
}
