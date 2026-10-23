/**
 * Yes/no polarity of a spoken answer, for the grounding verifier
 * (ARCHITECTURE §4.2 step 4). A voiced reply to a yes/no question may not
 * turn the facts' answer around ("Any vomiting?" — fact: "No vomiting, no
 * diarrhoea" — reply: "Yes, a few times today"), and may not answer a yes/no
 * question that no fact answers ("Do you have diabetes?" — no fact used —
 * "No, I don't"): that would add a "normal" default the case never recorded.
 *
 * Lexical and conservative, English and Chinese:
 *
 * * Only yes/no questions are read ("Do you…?", "Any…?", "有没有…", "…吗？"),
 *   not choices ("sharp or dull?", "…还是…") or questions for information
 *   ("When did it start?", "以前有什么病？").
 * * An answer's polarity is its lead word ("yes", "no", "never", "有",
 *   "没有", "不疼") or else that of the first clause naming the question's
 *   topic, negated or not ("过敏……没有" is a no). A fact that does neither
 *   reads as its first clause ("I threw up once around 10" answers "Any
 *   vomiting?" with yes). Speaker labels ("(Wife)", "（妈妈）") and question
 *   sentences ("Down there? No…") before the answer are skipped.
 * * No answer either way: "not sure", "不清楚" and the like, and "only…" /
 *   "just…" / "就…" (an answer that limits, not one that affirms or denies).
 * * Inability is not a "no": "I can't breathe", "喘不上来", "看不清" affirm a
 *   symptom.
 * * A flip is excused when the reply shares at least two content words with
 *   what the facts affirm, beyond the question's own words (a mixed answer:
 *   "Not any more — he quit ten years ago" for "He used to … He quit ten
 *   years ago").
 */
import { tokenize, tokensMatch } from "@clinicalcraft/core";

/** What a yes/no answer says. */
export type Polarity = "yes" | "no";

/** The topic of a question: English canonical tokens, Chinese bigrams, and Chinese content characters standing alone ("喘吗"). */
interface Topics {
  words: string[];
  bigrams: string[];
  chars: string[];
}

/* ------------------------------------------------------------------ */
/* Lexicon                                                             */
/* ------------------------------------------------------------------ */

/** Half-width, curly quotes folded, lower-case, "n't" spelled "not" (can't → cannot: inability, not denial). */
function normalize(text: string): string {
  return text
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .toLowerCase()
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bshan't\b/g, "shall not")
    .replace(/n't\b/g, " not");
}

/** A leading speaker label or stage direction: "(Wife)", "（妈妈）", "(a bit embarrassed)". */
const LABEL = /^\s*\([^()]{1,40}\)\s*/;
/** A question sentence before the answer: "Down there? No…", "Shaking? No." */
const LEADING_QUESTION = /^[^.!?。！？]*\?\s*/;

/** "Not sure", "不清楚": no answer either way (checked in the first sentence). */
const UNSURE =
  /\b(?:not\s+(?:sure|certain)|(?:do|did|does)\s+not\s+(?:know|remember|recall)|cannot\s+(?:remember|recall|say|tell)|could\s+not\s+(?:say|tell|remember)|no\s+idea|dunno|hard\s+to\s+say)\b|不知道|不清楚|不太清楚|不记得|不太记得|记不清|记不得|记不太清|说不清|说不好|不好说|不确定|没注意|没留意|没在意|搞不清|弄不清|不晓得|没印象/;
/** "Only now and then", "just insulin", "就是累", "只…": limits rather than affirms or denies. */
const LIMITING = /^(?:only|just|merely|(?:就|只)(?!是的))/;

const EN_YES = /^(?:yes|yeah|yep|yup|aye|uh[\s-]?huh|mm[\s-]?hmm|correct|definitely|absolutely|indeed|of\s+course|sure|i\s+think\s+so|i\s+believe\s+so|that\s*'?s\s+right)\b/;
const EN_NO = /^(?:no|nope|nah|never|none|nothing|nobody|no\s+one|neither|not)\b/;
/** A delimiter after a Chinese lead word ("有，", "是的。"); "有点…" is not a yes. */
const ZH_LEAD_END = "(?=$|[,.!?;:、。…~～\\s—-])";
const ZH_YES = new RegExp(`^(?:是的|是啊|是呀|对的|对啊|对呀|嗯嗯|嗯|有的|有啊|有呀|有过|会的|会啊|没错|当然|肯定|是|对|有|会)${ZH_LEAD_END}`);

/** English negators (after `normalize`); inability ("cannot", "could not", "unable") is removed first. */
const EN_NEGATOR = /\b(?:no|not|never|nothing|none|nobody|neither|nor|without)\b/;
const EN_NOT_A_NEGATION = /\b(?:can|could|will|would)\s+not\b|\bnot\s+only\b|\bno\s+doubt\b/g;
/**
 * Chinese negators, minus look-alikes: 不过 (but; 不过敏 is a negation), 不错, 不少, 不久, 不舒服 / 不适 / 不对劲
 * (affirm a complaint), 不停 / 不断 (keep on), 不一定, and potential complements that affirm an inability
 * (喘不上来, 睡不着, 看不清, 受不了, 说不出); 没错 (correct); 无力 / 无法.
 */
const ZH_NEGATOR =
  "没有|没(?!错|完)|从不|从未|未|无(?!论|聊|力|法)|别(?!人|的|处)|" +
  "不(?!过(?!敏)|错|少|久|好意思|得了|了|停|断|一定|仅|但|管|然|论|同|舒服|适|对劲|行|上|下|着|动|住|出|起|来|去|开|到|完|见|清)";
const ZH_NEGATION = new RegExp(ZH_NEGATOR);
/** A Chinese answer that opens with a negator, after an adverb or two ("都没有", "从来没", "不疼"). */
const ZH_NO = new RegExp(`^(?:从来|一直|都|也|还|根本|完全|并|一点也|一点都|好像|应该|基本上?|暂时)*(?:${ZH_NEGATOR})`);
/** A clause that is only a no: "过敏……没有". */
const BARE_NO = /^(?:no|nope|never|none|nothing|not\s+really|not\s+at\s+all|没有|没|没有的|没的|都没有|不|不是|不会)$/;

/** Clause boundaries: punctuation (incl. 、 and ellipses), dashes, and "but" / 但是 / 不过 … (never "and" / "or": a negation carries over). */
const CLAUSE_BOUNDARY = /[,;:!?.。！？；：、…()\n]+|—+|–|\s-\s|\bbut\b|\bthough\b|\bhowever\b|但是|但|不过(?!敏)|可是|然而/;
/** Further split for the support test: "He quit ten years ago and hasn't touched one since" affirms the quitting. */
const SEGMENT_BOUNDARY = /\band\b|\bwhile\b|并且|而且/;

/** English question words that carry no topic (canonical tokens; `tokenize` already drops stop-words). */
const EN_FILLER: ReadonlySet<string> = new Set(
  (
    "problem problems issue issues trouble history kind sort recently lately currently still now today yet " +
    "take taking taken notice noticed feel feeling felt know think time times last past since before ever " +
    // feelings and requests answered from the persona, not from a fact
    "better worse okay alright fine comfortable settled calm calmer relaxed scared afraid frightened worried anxious nervous upset happy ready " +
    "sure understand follow hear mind help want need right"
  )
    .split(/\s+/)
    .map((w) => tokenize(w)[0] ?? w),
);

/** Chinese characters that carry no topic in a question ("有没有", "你", "吗", "以前", "最近" …). */
const ZH_SCAFFOLD = new Set([..."你您他她它们的了过吗呢吧啊呀么什怎哪谁几多少有没是不会能要可以最近平时现在以前之前这那些个一下还都也就又再曾经请问说讲想感觉得到好点"]);
/** Feelings and requests answered from the persona ("好点了吗", "害怕吗", "听得见吗"): no topic. */
const ZH_AFFECT = /舒服|好些|好多了|难受|害怕|紧张|担心|放心|准备好|明白|懂|听见|听到|听得|听清/g;

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

const HAN = /\p{Script=Han}/u;
const EN_LEAD_FILLER = /^(?:(?:and|so|ok|okay|right|well|now|um+|erm|uh|sorry|also|then|but|alright|great|thanks|thank\s+you|i\s+see|good)\b[\s,]*)+/;
const EN_POLAR_START = /^(?:do|does|did|have|has|had|is|are|was|were|am|can|could|will|would|should|shall|may|might|any|anything|anyone|ever|got)\b/;
const EN_WH_START = /^(?:what|when|where|why|who|whom|whose|which|how|tell|describe|explain)\b/;
const EN_EITHER = /\b(?:any|anything|anyone|ever|either|or\s+not|or\s+anything|or\s+something)\b/;
const EN_REQUEST = /^(?:can|could|will|would|shall|may|might)\s+(?:i|we|you)\b/;
const ZH_POLAR = /有没有|是不是|会不会|能不能|要不要|可不可以|是否|(\p{Script=Han})[不没]\1/u;
const ZH_ENDS_MA = /(?:吗|(?<![什怎这那多])么|嘛)[?？]?\s*$/;
const ZH_REQUEST = /可以吗|好吗|行吗|行不行|可不可以|好不好|让我|我帮你|我给你|我来|方便吗|介意吗|听得见|听得到|听见了吗|听清|明白吗|明白了吗|懂了吗|懂吗|知道了吗/;

/** The question a reply answers: the last sentence of the utterance ending with "?", else the whole utterance. */
function lastQuestion(utterance: string): string {
  const parts = normalize(utterance)
    .split(/(?<=\?)/)
    .map((p) => p.trim())
    .filter(Boolean);
  const asked = parts.filter((p) => p.endsWith("?"));
  const last = (asked.length > 0 ? asked[asked.length - 1]! : parts[parts.length - 1] ?? "").replace(/^.*[.!。！]\s*/, "");
  return last.replace(EN_LEAD_FILLER, "").trim();
}

/** True for a yes/no question ("Do you…?", "Any…?", "有没有…", "…吗？"), false for a choice or a question for information. */
export function isPolarQuestion(utterance: string): boolean {
  const q = lastQuestion(utterance);
  if (!q) return false;
  if (HAN.test(q)) return ZH_ENDS_MA.test(q) || (ZH_POLAR.test(q) && !q.includes("还是"));
  if (EN_WH_START.test(q)) return false;
  if (/\bor\b/.test(q) && !EN_EITHER.test(q)) return false;
  return EN_POLAR_START.test(q) || q.endsWith("?");
}

/**
 * Content of a question: English canonical tokens; Chinese bigrams with a
 * non-scaffold character; and Chinese content characters between scaffold
 * ("喘吗", "疼不疼").
 */
function questionTopics(utterance: string): Topics {
  const q = lastQuestion(utterance);
  const words = tokenize(q).filter((w) => w.length >= 3 && !EN_FILLER.has(w));
  const bigrams: string[] = [];
  const chars = new Set<string>();
  const content = (ch: string | undefined) => ch !== undefined && !ZH_SCAFFOLD.has(ch);
  for (const run of q.replace(ZH_AFFECT, " ").split(/[^\p{Script=Han}]+/u)) {
    for (let i = 0; i < run.length; i++) {
      if (i + 2 <= run.length && (content(run[i]) || content(run[i + 1]))) bigrams.push(run.slice(i, i + 2));
      if (content(run[i]) && !content(run[i - 1]) && !content(run[i + 1])) chars.add(run[i]!);
    }
  }
  return { words, bigrams, chars: [...chars] };
}

/** A yes/no question that a case fact would answer: not a request ("Can I examine you?") or a question about feelings ("Are you OK?"). */
function asksForFact(utterance: string, topics: Topics): boolean {
  const q = lastQuestion(utterance);
  if (EN_REQUEST.test(q) || ZH_REQUEST.test(q)) return false;
  return topics.words.length > 0 || topics.bigrams.length > 0 || topics.chars.length > 0;
}

/* ------------------------------------------------------------------ */
/* Answers                                                             */
/* ------------------------------------------------------------------ */

function clausesOf(text: string): string[] {
  return text
    .split(CLAUSE_BOUNDARY)
    .map((c) => c.trim())
    .filter(Boolean);
}

function negated(clause: string): boolean {
  return EN_NEGATOR.test(clause.replace(EN_NOT_A_NEGATION, " ")) || ZH_NEGATION.test(clause);
}

function namesTopic(clause: string, topics: Topics): boolean {
  if (topics.bigrams.some((b) => clause.includes(b)) || topics.chars.some((ch) => clause.includes(ch))) return true;
  const words = tokenize(clause);
  return topics.words.some((t) => words.some((w) => tokensMatch(w, t)));
}

/** A clause that only names the topic ("Neck… not stiff", "过敏……没有"): the clause after it says yes or no. */
function onlyTopic(clause: string, topics: Topics): boolean {
  let rest = clause;
  for (const b of [...topics.bigrams, ...topics.chars]) rest = rest.split(b).join("");
  if ([...rest.replace(/[^\p{Script=Han}]/gu, "")].some((ch) => !ZH_SCAFFOLD.has(ch))) return false;
  return tokenize(rest).every((w) => topics.words.some((t) => tokensMatch(w, t)));
}

/** A clause opening with a negator ("not stiff", "没有", "不疼"). */
function opensNegated(clause: string): boolean {
  return EN_NO.test(clause) || ZH_NO.test(clause);
}

/** The answer after speaker labels and leading question sentences, normalised. */
function answerBody(text: string): string {
  let body = normalize(text).trim();
  for (let previous = ""; previous !== body; ) {
    previous = body;
    body = body.replace(LABEL, "").replace(LEADING_QUESTION, "").trim();
  }
  return body;
}

/** Polarity of an answer to a yes/no question about `topics` (see the module comment and `answerPolarity`). */
function polarityOf(text: string, topics: Topics, asFact: boolean): Polarity | null {
  const body = answerBody(text);
  if (!body) return null;
  const firstSentence = body.split(/[.!?。！？]/)[0] ?? body;
  if (UNSURE.test(firstSentence) || LIMITING.test(body)) return null;
  if (EN_YES.test(body) || ZH_YES.test(body)) return "yes";
  if (EN_NO.test(body) || ZH_NO.test(body)) return "no";
  const clauses = clausesOf(body);
  const read = (i: number): Polarity => {
    const next = clauses[i + 1] ?? "";
    return negated(clauses[i]!) || BARE_NO.test(next) || (onlyTopic(clauses[i]!, topics) && opensNegated(next)) ? "no" : "yes";
  };
  const topical = clauses.findIndex((c) => namesTopic(c, topics));
  if (topical >= 0) return read(topical);
  return asFact && clauses.length > 0 ? read(0) : null;
}

/** Content units of a text: English canonical tokens of ≥ 4 letters, Chinese bigrams of two content characters. */
function contentUnits(text: string): { words: string[]; bigrams: string[] } {
  const words = tokenize(text).filter((w) => w.length >= 4 && !EN_FILLER.has(w));
  const bigrams: string[] = [];
  for (const run of text.split(/[^\p{Script=Han}]+/u)) {
    for (let i = 0; i + 2 <= run.length; i++) {
      const pair = run.slice(i, i + 2);
      if (!ZH_SCAFFOLD.has(pair[0]!) && !ZH_SCAFFOLD.has(pair[1]!)) bigrams.push(pair);
    }
  }
  return { words, bigrams };
}

/** Shared content between the reply and what the facts affirm (not negate), beyond the question's own words. */
function supportCount(reply: string, answered: readonly string[], topics: Topics): number {
  const affirmed = answered
    .flatMap((a) => clausesOf(answerBody(a)))
    .flatMap((c) => c.split(SEGMENT_BOUNDARY))
    .filter((s) => s.trim() && !negated(s))
    .map(contentUnits);
  const own = contentUnits(answerBody(reply));
  const words = new Set(own.words.filter((w) => !topics.words.some((t) => tokensMatch(w, t)) && affirmed.some((a) => a.words.some((x) => tokensMatch(w, x)))));
  const bigrams = new Set(own.bigrams.filter((b) => !topics.bigrams.includes(b) && affirmed.some((a) => a.bigrams.includes(b))));
  return words.size + bigrams.size;
}

/** Shared content units that excuse a flipped answer (a mixed answer, not a reversal). */
export const POLARITY_SUPPORT_MIN = 2;

/**
 * The polarity violation of a voiced reply, or null: a yes/no answer to a
 * yes/no question that contradicts every fact used (and does not share
 * `POLARITY_SUPPORT_MIN` content units with what they affirm), or one given
 * when no fact was used (`answered` empty) to a question a fact would answer.
 */
export function polarityViolation(say: string, question: string, answered: readonly string[]): string | null {
  if (!isPolarQuestion(question)) return null;
  const topics = questionTopics(question);
  const reply = polarityOf(say, topics, false);
  if (!reply) return null;
  if (answered.length === 0) return asksForFact(question, topics) ? `polarity "${reply}" (no fact used)` : null;
  const facts = answered.map((a) => polarityOf(a, topics, true)).filter((p): p is Polarity => p !== null);
  if (facts.length === 0 || facts.includes(reply)) return null;
  if (supportCount(say, answered, topics) >= POLARITY_SUPPORT_MIN) return null;
  return `polarity "${reply}" (facts: "${facts[0]}")`;
}

/** A fronted topic: at most three words, or six Chinese characters ("The leg pumps — never had them", "过敏……没有"). */
function shortPhrase(stretch: string): boolean {
  return stretch.split(/\s+/).filter(Boolean).length <= 3 && stretch.replace(/[^\p{Script=Han}]/gu, "").length <= 6;
}

/**
 * Stretches of an answer (clauses, split again at "and"), each negated or
 * not; a fronted topic before a negated stretch is negated with it ("The leg
 * pumps — never had them", "过敏……没有").
 */
function stretches(text: string): { text: string; negated: boolean }[] {
  const parts = clausesOf(answerBody(text)).flatMap((c) =>
    c
      .split(SEGMENT_BOUNDARY)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const own = parts.map(negated);
  return parts.map((s, i) => ({ text: s, negated: own[i]! || BARE_NO.test(parts[i + 1] ?? "") || (own[i + 1] === true && shortPhrase(s)) }));
}

/** Where what a negator denies ends in English and a qualifier begins: a time or a modifier ("…since this morning", "…in my chest"). */
const EN_SCOPE_END = /\b(?:since|until|till|when|whenever|before|after|because|while|for|this|last|yesterday|today|tonight|ago|at|on|in|from|with)\b/;

type Units = { words: string[]; bigrams: string[] };

/**
 * What a negated stretch denies: the first two content units after its
 * negator (`head`), and the content of an English qualifier after them
 * (`qualifier`): "never had a leg-pump machine" → pump, machine; "no pain in
 * my chest" → pain, qualified by chest; "haven't eaten since this morning" →
 * eaten, qualified by morning.
 */
function denial(stretch: string): { head: Units; qualifier: Units } {
  const en = stretch.replace(EN_NOT_A_NEGATION, " ");
  const enAt = en.search(EN_NEGATOR);
  const enScope = enAt >= 0 ? en.slice(enAt).replace(EN_NEGATOR, " ") : "";
  const endAt = enScope.search(EN_SCOPE_END);
  const zhAt = stretch.search(ZH_NEGATION);
  const head = contentUnits((endAt >= 0 ? enScope.slice(0, endAt) : enScope) + " " + (zhAt >= 0 ? stretch.slice(zhAt + 1) : ""));
  return { head: { words: head.words.slice(0, 2), bigrams: head.bigrams.slice(0, 2) }, qualifier: contentUnits(endAt >= 0 ? enScope.slice(endAt) : "") };
}

const sharesWord = (a: readonly string[], b: readonly string[]) => a.some((w) => b.some((x) => tokensMatch(w, x)));

/**
 * A detail the reply affirms that a fact used denies, and no source affirms
 * ("Yes, and the leg pumps too" — fact: "I've never had a leg-pump
 * machine"), or null. Only what a negator denies counts (`denial`), and a
 * qualified denial only where the reply names the qualifier too: "No pain in
 * my chest" is not contradicted by "The pain is in my back", nor "I haven't
 * eaten since this morning" by "It started this morning".
 */
export function deniedDetailViolation(say: string, answered: readonly string[], sources: readonly string[]): string | null {
  const denials = answered.flatMap(stretches).filter((s) => s.negated).map((s) => denial(s.text));
  if (denials.length === 0) return null;
  const affirmed = sources.flatMap(stretches).filter((s) => !s.negated).map((s) => contentUnits(s.text));
  for (const stretch of stretches(say)) {
    if (stretch.negated) continue;
    const own = contentUnits(stretch.text);
    for (const { head, qualifier } of denials) {
      const qualified = qualifier.words.length === 0 || sharesWord(own.words, qualifier.words);
      const word = qualified ? own.words.find((w) => sharesWord([w], head.words) && !affirmed.some((a) => sharesWord([w], a.words))) : undefined;
      if (word) return `denied detail "${word}"`;
      const bigram = own.bigrams.find((b) => head.bigrams.includes(b) && !affirmed.some((a) => a.bigrams.includes(b)));
      if (bigram) return `denied detail "${bigram}"`;
    }
  }
  return null;
}

/**
 * Polarity of `text` as an answer to the yes/no question `question` (null
 * when it says neither, or the question is not a yes/no question). `asFact`:
 * an authored fact, read as its first clause when nothing else decides.
 */
export function answerPolarity(text: string, question: string, asFact = false): Polarity | null {
  return isPolarQuestion(question) ? polarityOf(text, questionTopics(question), asFact) : null;
}
