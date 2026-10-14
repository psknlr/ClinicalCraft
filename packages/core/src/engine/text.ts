/**
 * Text normalisation and fuzzy scoring for the offline matcher.
 *
 * Chinese (and other CJK) text has no word boundaries, so it is scored with
 * a longest-common-substring ratio on compact strings. Latin-script text is
 * additionally tokenised on word boundaries with English stop-words removed,
 * British spellings folded to American ones, a light suffix stemmer and a
 * tiny lemma table, so "do you smoke" matches "smoking history" while
 * "medical" and "medication" stay distinct.
 */
import { t, tList, type LocalizedList, type LocalizedText } from "../i18n.js";

/**
 * V4 query normalisation: full-width ASCII forms (letters, digits,
 * punctuation incl. `（）`) → ASCII, lower-case, all whitespace removed.
 */
export function normalizeQuery(text: string): string {
  return toHalfWidth(text).toLowerCase().replace(/\s+/g, "");
}

/** Full-width ASCII forms (U+FF01–U+FF5E: letters, digits, punctuation incl. `（）`) → ASCII. */
function toHalfWidth(text: string): string {
  return text.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

/** `normalizeQuery` without punctuation/symbols — the string used for character scoring. */
export function compactText(text: string): string {
  return normalizeQuery(text).replace(/[\p{P}\p{S}]/gu, "");
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** True when the text contains CJK characters. */
export function hasCjk(text: string): boolean {
  return CJK.test(text);
}

/** Common English function words ignored by token scoring (clinical terms are never listed). */
export const ENGLISH_STOP_WORDS: ReadonlySet<string> = new Set(
  (
    "a an the and or but if so of in on at to for from with without by as about into onto over under up down out off " +
    "is are was were be been being am do does did done doing have has had having will would shall should can could may might must " +
    "i me my mine myself you your yours yourself he him his she her hers it its we us our ours they them their theirs " +
    "this that these those there here what which who whom whose when where why how " +
    "any some all each every no not nor than then too very just also only ever again more most much many such own same " +
    "please tell let get got go going okay ok yes yeah hi hello doctor patient sir madam mr mrs ms dr " +
    "like anything something everything"
  ).split(/\s+/),
);

const SUFFIXES: readonly [string, string][] = [
  ["ingly", ""],
  ["edly", ""],
  ["ies", "y"],
  ["ied", "y"],
  ["ing", ""],
  ["ed", ""],
  ["es", ""],
  ["ly", ""],
  ["s", ""],
  ["e", ""],
];

/** Very light English stemmer (strip one common suffix, keep ≥ 3 letters). */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  for (const [suffix, replacement] of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length) + replacement;
  }
  return word;
}

/**
 * British → American spelling folds, applied to both sides before stemming:
 * `ae`/`oe` → `e` in words of ≥ 5 letters (haemoglobin, oedema, diarrhoea,
 * anaemia) and `-ise/-ised/-ising/-iser/-isation…` → `-iz…` after ≥ 3
 * letters (immunisation, nebuliser).
 */
export function foldSpelling(word: string): string {
  const folded = word.length >= 5 ? word.replace(/[ao]e/g, "e") : word;
  return folded.replace(/^([a-z]{3,})is(e|es|ed|ing|er|ers|ation|ations)$/, "$1iz$2");
}

/**
 * Stems that the shared-prefix rule must not (or cannot) relate on its own,
 * mapped to one lemma: the medicine family (so "medical" never matches it)
 * and adjective → noun forms whose stems diverge by more than 3 letters.
 */
export const ENGLISH_LEMMAS: ReadonlyMap<string, string> = new Map([
  ["med", "medication"], // meds
  ["medicin", "medication"], // medicine(s)
  ["medicat", "medication"], // medicate(d)
  ["abdominal", "abdomen"],
]);

/** Canonical token for a (lower-case, stop-word-free) word: spelling fold → stem → lemma. */
export function canonicalToken(word: string): string {
  const stemmed = stem(foldSpelling(word));
  return ENGLISH_LEMMAS.get(stemmed) ?? stemmed;
}

/** Drop English clitics: "what's" → "what", "don't" → "do", "you're" → "you". */
function stripContraction(word: string): string {
  return word.replace(/n't$/, "").replace(/'(s|re|ve|ll|d|m)$/, "").replace(/'/g, "");
}

/**
 * Latin-script word tokens (lower-case, contractions and stop-words removed,
 * then `canonicalToken`: spelling fold, stem, lemma). CJK runs are dropped.
 */
export function tokenize(text: string): string[] {
  return toHalfWidth(text)
    .replace(/[\u2018\u2019]/g, "'")
    .toLowerCase()
    .split(/[^\p{L}\p{N}']+/u)
    .map((w) => stripContraction(w.replace(/^'+|'+$/g, "")))
    .filter((w) => w.length > 0 && /^[a-z0-9]+$/.test(w) && !ENGLISH_STOP_WORDS.has(w))
    .map(canonicalToken);
}

function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
}

/** Longest tail either token may have after their shared prefix for the shared-prefix rule. */
const MAX_DIVERGENT_TAIL = 3;

/**
 * Token equivalence (on canonical tokens):
 *
 * * identical;
 * * one token (≥ 4 letters) is a prefix of the other — breath ~ breathless,
 *   pain ~ painful, diabet ~ diabetic;
 * * a shared prefix of ≥ 5 letters after which **both** tokens end within
 *   3 letters — allergy ~ allergic, nausea ~ nauseous, pregnant ~ pregnancy —
 *   but not medical ~ medication, history ~ historical, hypertension ~
 *   hyperthermia, thrombosis ~ thrombolysis or pneumonia ~ pneumothorax.
 */
export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  const prefix = commonPrefixLength(a, b);
  if (shorter >= 4 && prefix === shorter) return true;
  return prefix >= 5 && Math.max(a.length, b.length) - prefix <= MAX_DIVERGENT_TAIL;
}

/** Length of the longest common substring (dynamic programming, O(n·m) time, O(m) space). */
export function longestCommonSubstring(a: string, b: string): number {
  if (!a || !b) return 0;
  let best = 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  let curr = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      curr[j] = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? prev[j - 1] + 1 : 0;
      if (curr[j] > best) best = curr[j];
    }
    [prev, curr] = [curr, prev];
  }
  return best;
}

/** A phrase or utterance prepared for scoring. */
export interface Prepared {
  compact: string;
  tokens: string[];
  cjk: boolean;
}

/** Prepare text for `phraseScore`. */
export function prepare(text: string): Prepared {
  return { compact: compactText(text), tokens: tokenize(text), cjk: hasCjk(text) };
}

/** Bonus when the whole utterance is a fragment of the phrase. */
const FRAGMENT_BONUS = 0.15;
/** Score of a Latin phrase found verbatim (spacing/punctuation aside) inside the utterance. */
const LATIN_COMPACT_CONTAINMENT = 0.9;

function characterScore(u: string, p: string): number {
  if (!u || !p) return 0;
  if (u.includes(p)) return 1;
  const common = longestCommonSubstring(u, p);
  if (common < 2) return 0;
  let score = common / p.length;
  if (u.length >= 2 && p.includes(u)) score += FRAGMENT_BONUS;
  return Math.min(1, score);
}

function tokenScore(u: string[], p: string[]): number {
  if (p.length === 0 || u.length === 0) return 0;
  const matched = p.filter((pt) => u.some((ut) => tokensMatch(ut, pt))).length;
  return matched / p.length;
}

/**
 * Similarity of an utterance to one candidate phrase, 0..1.
 * CJK phrases: longest-common-substring length / phrase length (1 when the
 * phrase is contained). Latin phrases: share of phrase tokens present in
 * the utterance (1 when all are), or 0.9 for a ≥ 4-letter compact containment.
 */
export function phraseScore(utterance: Prepared, phrase: Prepared): number {
  if (phrase.cjk) return characterScore(utterance.compact, phrase.compact);
  const tokens = tokenScore(utterance.tokens, phrase.tokens);
  const compact = phrase.compact.length >= 4 && utterance.compact.includes(phrase.compact) ? LATIN_COMPACT_CONTAINMENT : 0;
  return Math.max(tokens, compact);
}

/** Every rendering of a localized text: the requested locale first, then every locale. */
export function allTexts(text: LocalizedText | undefined, locale: string): string[] {
  if (text == null) return [];
  const values = [t(text, locale), ...(typeof text === "string" ? [] : Object.values(text))];
  return unique(values.filter((v) => v.trim().length > 0));
}

/** Every entry of a localized list: the requested locale first, then every locale. */
export function allListEntries(list: LocalizedList | undefined, locale: string): string[] {
  if (list == null) return [];
  return unique([...tList(list, locale), ...tList(list, "*")].filter((v) => v.trim().length > 0));
}

/** De-duplicate preserving first occurrence. */
export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
