/**
 * Text normalisation and fuzzy scoring for the offline matcher.
 *
 * Chinese (and other CJK) text has no word boundaries, so it is scored with
 * a longest-common-substring ratio on compact strings — counting only runs
 * that hold a topic character, not function characters alone (的什么, 有没有),
 * skipping particles a learner adds to a phrase (吸过毒 ⊇ 吸毒) and reading 痛
 * as 疼. Latin-script text is additionally tokenised on word boundaries with
 * English stop-words removed, British spellings folded to American ones, a
 * light suffix stemmer and a tiny lemma table, so "do you smoke" matches
 * "smoking history" while "medical" and "medication" stay distinct.
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
export function toHalfWidth(text: string): string {
  return text.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
}

/** `normalizeQuery` without punctuation/symbols — the string used for character scoring. */
export function compactText(text: string): string {
  return normalizeQuery(text).replace(/[\p{P}\p{S}]/gu, "");
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const HAN = /\p{Script=Han}/u;

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
 * Stems (after `foldSpelling` + `stem` + the `-ological` → `-ology` fold)
 * mapped to a shared lemma because the shared-prefix rule of `tokensMatch`
 * cannot relate them: the medicine family (so "medical" never matches it)
 * and clinical adjective/noun pairs whose stems diverge too much.
 */
export const ENGLISH_LEMMAS: ReadonlyMap<string, string> = new Map([
  ["med", "medication"], // meds
  ["medicin", "medication"], // medicine(s)
  ["medicat", "medication"], // medicate(d)
  ["prescription", "prescrib"], // prescription(s) ~ prescribe(d)
  ["abdominal", "abdomen"],
  ["cardiovascular", "cardiac"],
]);

/**
 * Canonical token for a (lower-case, stop-word-free) word: spelling fold →
 * stem → `-ological` → `-ology` (pathological, oncological, serological) →
 * lemma.
 */
export function canonicalToken(word: string): string {
  const stemmed = stem(foldSpelling(word)).replace(/^([a-z]+olog)ical$/, "$1y");
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
/** Shared-prefix length from which one more letter of tail is allowed. */
const LONG_SHARED_PREFIX = 8;

/**
 * Endings (as `canonicalToken` leaves them: -ness → -nes, -less → -les) a
 * short (4–5 letter) token may gain and still be the same word —
 * pain ~ painful, itch ~ itchy, numb ~ numbness, heart ~ hearts — so a short
 * stem does not swallow an unrelated longer word: hear ≁ heart, hear ≁
 * heartburn, back ≁ background, heart ≁ heartburn.
 */
const SHORT_STEM_ENDINGS: ReadonlySet<string> = new Set(["s", "es", "ed", "d", "ing", "er", "ers", "y", "ly", "ily", "ful", "fully", "ness", "nes", "less", "les", "ish", "ie", "ies", "ier", "iest", "e", "en"]);
/** From this length a token that prefixes another is the same word whatever the ending (breath ~ breathless). */
const FREE_PREFIX_LENGTH = 6;

/** Names (canonical tokens) that are no stem of another word: ring ≁ Ringer's, heart ≁ Hartmann's. */
const PROPER_NAME_TOKENS: ReadonlySet<string> = new Set(["ringer", "hartmann"]);
/** A medicine's ending: a word ending so is no form of a word that ends otherwise (aspirin ≁ aspirate, atropine ≁ atrophy, penicillin ≁ penicillamine). */
const MEDICINE_TAIL = /^(?:in|ine|ins|ines)$/;
/** An agent noun's ending against an adjective's: the anaesthetist is not the anaesthetic. */
const AGENT_NOUN = /ists?$/;
const ADJECTIVE = /(?:ic|ics|ical)$/;

/** True when two tokens that share a prefix are different words whatever their tails' length (a medicine's ending, an agent noun's). */
function differentWords(a: string, b: string, prefix: number): boolean {
  if (MEDICINE_TAIL.test(a.slice(prefix)) !== MEDICINE_TAIL.test(b.slice(prefix))) return true;
  return (AGENT_NOUN.test(a) && ADJECTIVE.test(b)) || (AGENT_NOUN.test(b) && ADJECTIVE.test(a));
}

/**
 * Token equivalence (on canonical tokens):
 *
 * * identical;
 * * one token is a prefix of the other — any ending when the shorter has
 *   ≥ 6 letters (breath ~ breathless, diabet ~ diabetic), only an
 *   inflectional/derivational ending (`SHORT_STEM_ENDINGS`) when it has 4–5
 *   (pain ~ painful, but hear ≁ heart, back ≁ background);
 * * a shared prefix of ≥ 5 letters after which **both** tokens end within
 *   3 letters (4 letters when the shared prefix has ≥ 8) — allergy ~
 *   allergic, nausea ~ nauseous, pregnant ~ pregnancy, anticoagulant ~
 *   anticoagulation, prophylaxis ~ prophylactic — but not medical ~
 *   medication, history ~ historical, hypertension ~ hyperthermia,
 *   thrombosis ~ thrombolysis, pneumonia ~ pneumothorax or cholecystitis ~
 *   cholecystectomy; nor when one tail is a medicine's and the other is not
 *   (aspirin ≁ aspirate, atropine ≁ atrophy), or an agent noun's against an
 *   adjective's (anaesthetist ≁ anaesthetic).
 *
 * A name (`PROPER_NAME_TOKENS`: Ringer's, Hartmann's) matches only itself.
 */
export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (PROPER_NAME_TOKENS.has(a) || PROPER_NAME_TOKENS.has(b)) return false;
  const shorter = Math.min(a.length, b.length);
  const prefix = commonPrefixLength(a, b);
  if (shorter >= 4 && prefix === shorter) {
    if (shorter >= FREE_PREFIX_LENGTH) return true;
    const ending = (a.length > b.length ? a : b).slice(shorter);
    if (SHORT_STEM_ENDINGS.has(ending)) return true;
  }
  const maxTail = prefix >= LONG_SHARED_PREFIX ? MAX_DIVERGENT_TAIL + 1 : MAX_DIVERGENT_TAIL;
  return prefix >= 5 && Math.max(a.length, b.length) - prefix <= maxTail && !differentWords(a, b, prefix);
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
  /** Indices in `compact` where a word of Latin letters or digits begins in the text (`containsExclusion`). */
  starts?: ReadonlySet<number>;
  /** Tokens of a text that mixes Han characters and Latin words, the Latin words read on their own ("BEP方案" → bep). */
  mixedTokens?: string[];
  /** `compact` with the 下 of the particle 一下 masked (same length), when it has one: what a phrase without 一下 is scored against. */
  particleSafe?: string;
  /** Share of a CJK phrase that is Latin letters or digits, a Han function character counting half ("BEP方案": 3/5; "有过TIA吗": 3/4.5). */
  latin?: number;
  /** A phrase's tokens that match nothing on their own (an intervention's "give", "start"): a match on these alone scores 0. */
  weak?: ReadonlySet<string>;
}

/** Characters spelled one way for scoring: 痛 → 疼 (both "pain": 头痛 ~ 头疼, 有多痛 ~ 有多疼). */
const CJK_FOLDS: ReadonlyMap<string, string> = new Map([["痛", "疼"]]);
const CJK_FOLD_RE = new RegExp(`[${[...CJK_FOLDS.keys()].join("")}]`, "gu");

/** `compactText` with the characters of `CJK_FOLDS` folded — the string the matcher scores and checks `excludeKeywords` against. */
export function scoringText(text: string): string {
  return compactText(text).replace(CJK_FOLD_RE, (ch) => CJK_FOLDS.get(ch) ?? ch);
}

const LATIN_OR_DIGIT = /[a-z0-9]/;

/**
 * Indices in `scoringText(text)` where a word of Latin letters or digits begins: the character before it in the text
 * (spaces and punctuation included) is no Latin letter or digit — so "continue" begins no word in "discontinue", nor
 * "at first" in "what first", nor "50" in "250".
 */
function wordStarts(text: string): Set<number> {
  const starts = new Set<number>();
  const folded = toHalfWidth(text).toLowerCase();
  let index = 0;
  let previous = "";
  for (const ch of folded) {
    const kept = !/\s/u.test(ch) && !/[\p{P}\p{S}]/u.test(ch);
    if (kept) {
      if (LATIN_OR_DIGIT.test(ch) && !LATIN_OR_DIGIT.test(previous)) starts.add(index);
      index += ch.length;
    }
    previous = ch;
  }
  return starts;
}

/** The particle 一下 ("look a bit"), not 一下子 (suddenly) or 一下午 (all afternoon). */
const YIXIA = /一下(?![子午])/g;
/** What masks the 下 of 一下: no phrase holds it, so no phrase begins inside the particle (量一下体温 holds no 下体). */
const PARTICLE_MASK = "\uE000";

/** Prepare text for `phraseScore`. */
export function prepare(text: string): Prepared {
  const compact = scoringText(text);
  const cjk = hasCjk(text);
  const prepared: Prepared = { compact, tokens: tokenize(text), cjk };
  if (LATIN_OR_DIGIT.test(compact)) {
    prepared.starts = wordStarts(text);
    if (cjk) {
      prepared.mixedTokens = tokenize(text.replace(/\p{Script=Han}+/gu, " "));
      // the Latin part's share of the phrase: a function character (有过…吗, 请) counts half
      const latin = compact.replace(/[^a-z0-9]/g, "").length;
      const han = [...compact].filter((ch) => HAN.test(ch));
      const functional = han.filter((ch) => CJK_FUNCTION_CHARS.has(ch)).length;
      prepared.latin = latin / (latin + (han.length - functional) + functional / 2);
    }
  }
  if (compact.includes("一下")) prepared.particleSafe = compact.replace(YIXIA, `一${PARTICLE_MASK}`);
  return prepared;
}

/** An exclusion (`excludeKeywords`) as the matcher checks it. */
export interface Exclusion {
  /** As `scoringText` leaves it. */
  compact: string;
  /** It begins with a function word ("at first") or a digit ("50%"): it counts only where it begins a word. */
  wordStart: boolean;
}

/** An exclusion for `containsExclusion`, or null when it is empty. */
export function exclusion(text: string): Exclusion | null {
  const compact = scoringText(text);
  if (!compact) return null;
  const first = toHalfWidth(text).toLowerCase().trim().split(/[^\p{L}\p{N}']+/u)[0] ?? "";
  return { compact, wordStart: /^[0-9]/.test(compact) || (/^[a-z']+$/.test(first) && ENGLISH_STOP_WORDS.has(first)) };
}

/** Prefixes that make a word its opposite: "discontinue" is no "continue", "unstable" no "stable". */
const REVERSING_PREFIX = /^(?:dis|un|non|in|im|ir|il|de|anti)$/;

/**
 * True when the prepared text holds the exclusion: anywhere for one that begins with a Han character; for one that
 * begins with a Latin letter or digit, anywhere but after a prefix that reverses the word it is in ("discontinue"
 * holds no "continue") — and, for one that begins with a function word or a digit, only where it begins a word
 * ("what first" holds no "at first", "250" no "50").
 */
export function containsExclusion(text: Prepared, x: Exclusion): boolean {
  const phrase = x.compact;
  if (!LATIN_OR_DIGIT.test(phrase[0] ?? "")) return text.compact.includes(phrase);
  for (let at = text.compact.indexOf(phrase); at >= 0; at = text.compact.indexOf(phrase, at + 1)) {
    if (text.starts?.has(at)) return true;
    if (x.wordStart) continue;
    let start = at;
    while (start > 0 && !text.starts?.has(start)) start--;
    if (!REVERSING_PREFIX.test(text.compact.slice(start, at))) return true;
  }
  return false;
}

/** The utterance a CJK phrase is scored against: with 一下's 下 masked unless the phrase itself holds 一下. */
function cjkView(utterance: Prepared, phrase: Prepared): string {
  return utterance.particleSafe && !phrase.compact.includes("一下") ? utterance.particleSafe : utterance.compact;
}

/** Bonus when the whole utterance is a fragment of the phrase. */
const FRAGMENT_BONUS = 0.15;
/**
 * Cap (before the fragment bonus) for a CJK phrase that shares only a
 * 2-character run with the utterance — not its first two characters, or a
 * generic question bigram — and is not contained in it: below the patient
 * pipeline's select band (0.55), so "量过血压" ∩ "出过血" = "过血", "看东西" ∩
 * "吃东西" or "怎么用" ∩ "怎么疼" never selects (and credits) a fact on its
 * own; it can still be a re-rank candidate.
 */
const SHORT_OVERLAP_CAP = 0.5;
/**
 * Question/function bigrams that carry no topic: a phrase starting with one
 * ("怎么疼", "什么时候") is capped like any other 2-character overlap.
 */
const GENERIC_CJK_BIGRAMS = new Set(["怎么", "什么", "有没", "没有", "是不", "不是", "会不", "能不", "要不", "哪里", "哪儿", "多少", "为什", "时候", "这个", "那个", "一下"]);
/** Score of a Latin phrase found verbatim (spacing/punctuation aside) inside the utterance. */
const LATIN_COMPACT_CONTAINMENT = 0.9;

/** Extra characters a phrase may be spread over in the utterance and still count as spelled out. */
const SUBSEQUENCE_SLACK = 4;

/**
 * Positions in `u` of the characters of `p`, in order, within a span of
 * `p.length + slack` (the first such span); null when there is none.
 */
function gappedPositions(u: string, p: string, slack: number): number[] | null {
  if (!p) return null;
  for (let start = u.indexOf(p[0]!); start >= 0; start = u.indexOf(p[0]!, start + 1)) {
    const positions = [start];
    const end = Math.min(u.length, start + p.length + slack);
    for (let i = start + 1; i < end && positions.length < p.length; i++) if (u[i] === p[positions.length]) positions.push(i);
    if (positions.length === p.length) return positions;
  }
  return null;
}

/** True when every character of `p` occurs in `u` in order, within a span of `p.length + slack`. */
function gappedSubsequence(u: string, p: string, slack: number): boolean {
  return gappedPositions(u, p, slack) !== null;
}

/**
 * Characters that carry no topic on their own — particles, pronouns, question
 * words, auxiliaries, conjunctions, time deictics, "look". A run shared by
 * the utterance and a phrase made only of these ("的什么" of 你室友得的什么病 ∩
 * 吐的什么, "现在在" of 现在在哪, "看什么" of 看什么电影 ∩ 来看什么病的) is no
 * overlap at all, and they are no evidence (`phraseEvidence`).
 */
const CJK_FUNCTION_CHARS: ReadonlySet<string> = new Set(
  "的了吗呢吧啊呀嘛么什怎哪谁几多少有没是不会能要可以在现这那些个一下还都也就又再过得着你我他她它们您请问说讲想看时候很太最近平常经曾已之前后样为因所对把被给跟和与或者如果该应自己好",
);

/**
 * The longest run of `u` that `p` also contains and that holds a topic
 * character (one not in `CJK_FUNCTION_CHARS`, and no Latin letter or digit:
 * the tokens score a CJK phrase's Latin part, so "ep" of "the pulse" is no
 * overlap with "BEP方案"): its start in `u` and its length (0 when there is
 * none).
 */
function topicRun(u: string, p: string): { start: number; length: number } {
  let best = { start: 0, length: 0 };
  if (!u || !p) return best;
  const topical = new Array<number>(u.length + 1).fill(0);
  for (let i = 0; i < u.length; i++) topical[i + 1] = topical[i]! + (CJK_FUNCTION_CHARS.has(u[i]!) || LATIN_OR_DIGIT.test(u[i]!) ? 0 : 1);
  let prev = new Array<number>(p.length + 1).fill(0);
  let curr = new Array<number>(p.length + 1).fill(0);
  for (let i = 1; i <= u.length; i++) {
    for (let j = 1; j <= p.length; j++) {
      const run = u.charCodeAt(i - 1) === p.charCodeAt(j - 1) ? prev[j - 1]! + 1 : 0;
      curr[j] = run;
      if (run > best.length && topical[i]! > topical[i - run]!) best = { start: i - run, length: run };
    }
    [prev, curr] = [curr, prev];
  }
  return best;
}

/** Score of a CJK phrase found in the utterance once particles the utterance adds are skipped (`particlePositions`). */
const PARTICLE_CONTAINMENT = 0.9;

/** Aspect, structural and sentence-final particles a learner may add to a keyword: 吸过毒 is 吸毒, 住过院 is 住院. */
const CJK_PARTICLES: ReadonlySet<string> = new Set("过了着的地得吗呢吧啊呀嘛");

/**
 * Positions in `u` of the characters of `p` when they occur together and in
 * order once the utterance's particles (`CJK_PARTICLES`) are skipped — the
 * learner added an aspect or structural particle to the phrase ("吸过毒吗" ⊇
 * 吸毒, "住过院吗" ⊇ 住院). A phrase with a particle of its own is taken
 * literally (null: "吃了啥药" is not 吃的啥药, "晕倒过" not 想晕倒), and so is one
 * with fewer than 2 Han topic characters (not `CJK_FUNCTION_CHARS`).
 */
function particlePositions(u: string, p: string): number[] | null {
  if ([...p].some((ch) => CJK_PARTICLES.has(ch))) return null;
  if ([...p].filter((ch) => HAN.test(ch) && !CJK_FUNCTION_CHARS.has(ch)).length < 2) return null;
  let chars = "";
  const positions: number[] = [];
  for (let i = 0; i < u.length; i++) {
    if (CJK_PARTICLES.has(u[i]!)) continue;
    chars += u[i];
    positions.push(i);
  }
  const at = chars.indexOf(p);
  return at < 0 ? null : positions.slice(at, at + p.length);
}

function characterScore(u: string, p: string): number {
  if (!u || !p) return 0;
  if (u.includes(p)) return 1;
  const common = topicRun(u, p).length;
  let score = 0;
  if (common >= 2) {
    score = common / p.length;
    if (common < 3) {
      // Kept: a shared start of the phrase ("糖尿" of 糖尿病) unless it is a question bigram, or the whole
      // phrase spelled out with a few characters between ("摸一下肚子" ⊇ 摸…肚子, "喝水会不会呛" ⊇ 喝水…呛).
      const lead = p.slice(0, common);
      const leading = u.includes(lead) && !GENERIC_CJK_BIGRAMS.has(lead);
      if (!leading && !gappedSubsequence(u, p, SUBSEQUENCE_SLACK)) score = Math.min(score, SHORT_OVERLAP_CAP);
    }
  }
  if (particlePositions(u, p)) score = Math.max(score, PARTICLE_CONTAINMENT);
  if (score > 0 && u.length >= 2 && p.includes(u)) score += FRAGMENT_BONUS;
  return Math.min(1, score);
}

function tokenScore(u: string[], p: string[], weak?: ReadonlySet<string>): number {
  if (p.length === 0 || u.length === 0) return 0;
  const matched = p.filter((pt) => u.some((ut) => tokensMatch(ut, pt)));
  if (weak && matched.every((pt) => weak.has(pt))) return 0;
  return matched.length / p.length;
}

/**
 * Similarity of an utterance to one candidate phrase, 0..1.
 * CJK phrases: 1 when the phrase is contained, 0.9 when it is but for
 * particles (`particlePositions`), else the length of the longest common
 * substring holding a topic character / phrase length — or, for a phrase with
 * a Latin part ("BEP方案"), that part's share of the phrase times the share of
 * its tokens present, when more; the 下 of the particle 一下 begins no phrase
 * (量一下体温 holds no 下体). Latin phrases: share of phrase tokens present in
 * the utterance (1 when all are), or 0.9 for a ≥ 4-letter compact containment.
 */
export function phraseScore(utterance: Prepared, phrase: Prepared): number {
  if (phrase.cjk) {
    const characters = characterScore(cjkView(utterance, phrase), phrase.compact);
    // a Latin part ("BEP方案") is scored by its words, for its share of the phrase
    if (!phrase.latin || !phrase.mixedTokens) return characters;
    return Math.max(characters, phrase.latin * tokenScore(utterance.mixedTokens ?? utterance.tokens, phrase.mixedTokens, phrase.weak));
  }
  const tokens = tokenScore(utterance.tokens, phrase.tokens, phrase.weak);
  const compact = phrase.compact.length >= 4 && utterance.compact.includes(phrase.compact) ? LATIN_COMPACT_CONTAINMENT : 0;
  return Math.max(tokens, compact);
}

/**
 * How much of a phrase an utterance accounts for, in characters: the whole
 * compact phrase when the utterance contains it, else the shared run (CJK) or
 * the summed length of the phrase tokens found (Latin). Used only to break
 * ties between equally scored items (a longer, more specific alias wins).
 */
export function phraseCoverage(utterance: Prepared, phrase: Prepared): number {
  if (!phrase.compact || !utterance.compact) return 0;
  const u = phrase.cjk ? cjkView(utterance, phrase) : utterance.compact;
  if (u.includes(phrase.compact)) return phrase.compact.length;
  if (phrase.cjk) return longestCommonSubstring(u, phrase.compact);
  return phrase.tokens.filter((pt) => utterance.tokens.some((ut) => tokensMatch(ut, pt))).reduce((n, pt) => n + pt.length, 0);
}

/**
 * What of an utterance a phrase accounts for, as keys of compact characters
 * ("c3", CJK phrases) or word tokens ("t1", Latin phrases): the topic
 * characters (not `CJK_FUNCTION_CHARS`) of a contained CJK phrase's span, of
 * one spelled out with a few characters between (`SUBSEQUENCE_SLACK`) or but
 * for particles (`particlePositions`), else of its longest shared
 * run with a topic character (≥ 2 characters); for a Latin phrase the
 * utterance tokens (stop-words aside) that match one of its tokens. Empty
 * when it accounts for nothing.
 */
export function phraseEvidence(utterance: Prepared, phrase: Prepared): string[] {
  const u = phrase.cjk ? cjkView(utterance, phrase) : utterance.compact;
  const keys = (positions: number[]) => positions.filter((i) => !CJK_FUNCTION_CHARS.has(u[i]!)).map((i) => `c${i}`);
  const span = (start: number, length: number) => keys(Array.from({ length }, (_, k) => start + k));
  if (phrase.cjk) {
    const p = phrase.compact;
    if (!u || !p) return [];
    const at = u.indexOf(p);
    if (at >= 0) return span(at, p.length);
    const spelled = gappedPositions(u, p, SUBSEQUENCE_SLACK) ?? particlePositions(u, p);
    if (spelled) return keys(spelled);
    const run = topicRun(u, p);
    return run.length >= 2 ? span(run.start, run.length) : [];
  }
  return utterance.tokens.flatMap((ut, i) => (phrase.tokens.some((pt) => tokensMatch(ut, pt)) ? [`t${i}`] : []));
}

/** An English greeting that opens a question ("Good morning", "Hi there"), and the name after it up to a comma ("Hi Tom,"). */
const EN_GREETING = /^\s*(?:good\s+(?:morning|afternoon|evening)|hello|hiya|hi|hey)\b(?:\s+there\b)?/i;
const EN_GREETING_NAME = /^[^,.!?;:]{0,30}?[,.!;:]/;
/** "Morning," on its own (not "morning sickness"). */
const EN_BARE_GREETING = /^\s*(?:morning|afternoon|evening)\s*[,.!;:]/i;
/** A Chinese greeting with the name or title before it and punctuation, a space or the end after it ("王阿姨，您好，"). */
const ZH_GREETING = /^\s*(?:[^，,。.!！?？；;\s]{1,8}?[，,]?\s*)?(?:早上好|早安|上午好|中午好|下午好|晚上好|你好|您好|大家好)[呀啊]?(?:[，,。.!！~～；;]+|\s+|$)/;

/**
 * A question without the greeting that opens it ("Good morning, what brings you in?" → "what brings you in?", "您好，
 * 哪里不舒服？" → "哪里不舒服？"): a greeting says nothing to match a fact on ("morning" is no answer to "Good morning").
 * A question that is only a greeting is returned whole.
 */
export function stripGreeting(question: string): string {
  let rest = question;
  const en = EN_GREETING.exec(rest);
  if (en) {
    rest = rest.slice(en[0].length);
    const name = EN_GREETING_NAME.exec(rest);
    // a name or title before a comma ("Hi Tom,", "Good morning Mrs Li,"): at most three words
    if (name && name[0].trim().split(/\s+/).length <= 4) rest = rest.slice(name[0].length);
  } else {
    const bare = EN_BARE_GREETING.exec(rest) ?? ZH_GREETING.exec(rest);
    if (bare) rest = rest.slice(bare[0].length);
  }
  rest = rest.replace(/^[\s,.!;:，。！；：、~～—–-]+/, "");
  return rest.trim() ? rest : question;
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
