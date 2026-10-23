/**
 * Clause-level negation of a free-text instruction, English and Chinese
 * (docs/GROUNDING.md §2): "don't give GTN", "hold the heparin", "aspirin not
 * indicated", "不要静推氯化钾" and "吗啡先不给" name what must NOT be done.
 * `matchInterventions` uses it so that a negated instruction never acts on
 * the item it negates.
 *
 * Lexical and conservative by design:
 *
 * * Clauses end at punctuation (not at the enumeration comma 、), dashes and
 *   brackets, and at contrastive or sequencing conjunctions (but, then,
 *   instead, 但是, 然后, 改用 …) — never at "and" / "or", which a negation
 *   carries over ("do not intubate and ventilate"). A clause that opens with
 *   a subordinator (until, before, unless, 等, 直到, 如果 …) stays part of
 *   the clause before it, so in "nothing to eat, until the operation" the
 *   operation stays negated. A clause that is only a cue ("morphine — no",
 *   "oxygen: not needed") negates the clause before it.
 * * A cue negates the words after it, up to the next cue or the end of its
 *   clause. It negates the words before it instead when nothing but function
 *   words follow ("吗啡先不给", "肝素停掉"), when it is a predicate ("not
 *   indicated", "contraindicated", "on hold"), or when it is a participle after
 *   its object ("aspirin withheld").
 * * Two cues with only function words between them ("do not delay", "never
 *   stop", "no need to stop", "不要停") make a double negative: the clause is
 *   reported in `doubleNegated` and read neither way.
 * * Words that only look like cues are not cues: "hold pressure", "stop the
 *   bleeding" (a symptom is treated, not withheld), 心脏骤停, 呼吸暂停, 鉴别,
 *   不适, 要不要 (a question), 阿莫西林.
 */
import { tokenize, toHalfWidth } from "./text.js";

/** What `analyzeNegation` finds in a text. */
export interface NegationAnalysis {
  /** Some clause negates something (once). */
  negated: boolean;
  /** The words outside every negated scope and double-negated clause, cues removed. */
  affirmative: string;
  /** What each cue negates, cue removed (lower-case, half-width). */
  scopes: string[];
  /** Subordinate clauses of a negated clause ("…, until the surgeon has seen him", "…，等手术"): neither asked for nor withheld. */
  context: string[];
  /** Clauses with a double negative, read neither way. */
  doubleNegated: string[];
}

type CueKind = "particle" | "verb" | "participle" | "predicate";

interface Cue {
  start: number;
  end: number;
  kind: CueKind;
}

/* ------------------------------------------------------------------ */
/* Lexicon                                                             */
/* ------------------------------------------------------------------ */

const EN_PREDICATE =
  "contraindicated|unnecessary|on\\s+hold|not\\s+(?:needed|required|indicated|necessary|recommended|appropriate|advised|wanted|warranted|suitable|safe|allowed|permitted|given)";
const EN_PARTICIPLE =
  "withheld|held|suspended|stopped|discontinued|ceased|paused|avoided|deferred|delayed|postponed|cancell?ed|omitted|skipped|halted|withdrawn|(?:turned|switched)\\s+off";
const EN_VERB =
  "withhold(?:s|ing)?|hold(?:s|ing)?(?:\\s+off)?|suspend(?:s|ing)?|stop(?:s|ping)?|discontinu(?:e|es|ing)|ceas(?:e|es|ing)|paus(?:e|es|ing)|avoid(?:s|ing)?|defer(?:s|ring)?|delay(?:s|ing)?|postpon(?:e|es|ing)|cancel(?:s|ling|ing)?|omit(?:s|ting)?|skip(?:s|ping)?|refrain(?:s|ing)?|halt(?:s|ing)?|abstain(?:s|ing)?|withdraw(?:s|ing)?|(?:turn|switch)(?:s|ing)?\\s+off|come\\s+off|rather\\s+than|instead\\s+of|in\\s+place\\s+of";
const EN_PARTICLE = "no|not|never|nothing|nil|none|neither|nor|cannot|[a-z]+n't";

/** English cues, most specific first (a predicate "not indicated" before the particle "not"). */
const EN_CUE = new RegExp(`\\b(?:(${EN_PREDICATE})|(${EN_PARTICIPLE})|(${EN_VERB})|(${EN_PARTICLE}))\\b`, "g");

/** "hold" that is not withholding: hold pressure, hold her hand, hold still. */
const HOLD_NOT_A_CUE = /^\s+(?:(?:the|a|an|some|firm|his|her|their)\s+)*(?:pressure|firm(?:ly)?|still|steady|tight(?:ly)?|hands?|head|breath|position|traction)\b/;
const HOLD_WORD = /^hold|^held/;
/** "stop" + a symptom treats the symptom: stop the bleeding, stop the vomiting. */
const STOP_NOT_A_CUE =
  /^\s+(?:(?:the|his|her|their|this|that|any|further)\s+)*(?:bleed\w*|pain\w*|vomit\w*|seiz\w*|fit(?:s|ting)?|itch\w*|wheez\w*|cough\w*|nause\w*|ha?emorrhag\w*|convuls\w*|swelling|fever\w*|shiver\w*|shaking|spasm\w*|cramp\w*|diarrh\w*|hiccup\w*|arrhythmi\w*|tachycardi\w*)\b/;
const STOP_WORD = /^stop/;

/** Chinese verb-like cues (stop, suspend, defer, avoid, forbid …). */
const ZH_VERB = "(?<!呼吸)暂停|(?<!心跳|呼吸|心脏|搏动)停止|停用|停掉|(?<!骤|暂|心跳|呼吸|心脏|搏动)停(?![搏经顿留车滞歇靠])|暂缓|避免|取消|禁止|禁用|禁|推迟|延迟|中止";
/** Chinese particle-like cues; bare 不 last, minus compounds that negate nothing to do (不适, 不全, 不得不, 不超过 …). */
const ZH_PARTICLE =
  "不需要|不必要|没必要|无需|无须|不用|不要|不必|不给|不予|不能|不可|不宜|不应|不该|不准|不许|不再|不得(?!不)|先不|先别|暂不|勿|" +
  "(?<![特区分个级类识鉴性告辨差派离送])别(?![人的处名称墅])|" +
  "(?<!差|不得)不(?!适|舒|良|全|齐|稳|清|足|明|安|畅|佳|振|规|对称|耐|典型|一定|管|久|断|同|少|过|仅|然|论|到|超过|低于|高于|大于|小于|少于|多于|敏感|可逆|洁|孕|育|遂|利|错|好|太|是很|得不|止一|变|定|详|退|降|升|缓解|改善|好转|消|起)";
const ZH_CUE = new RegExp(`(${ZH_VERB})|(${ZH_PARTICLE})`, "g");

/** Clause boundaries: punctuation (not 、), dashes, brackets, contrastive and sequencing conjunctions. */
const BOUNDARY = new RegExp(
  "[,.;:!?()\\[\\]{}<>。！？；：【】《》「」\\n\\r…]|—+|–|\\s-\\s|" +
    "\\b(?:but|then|instead(?!\\s+of)|however|though|although|whereas|otherwise)\\b|" +
    "但是|但|不过|然后|而是|改为|改用|换成|换用|接着|随后|另外|此外",
  "g",
);

/** A clause opening with one of these continues the clause before it. */
const SUBORDINATE_START = new RegExp(
  "^\\s*(?:(?:until|till|before|after|unless|pending|while|whilst|when|because|since|if|once|in\\s+case|given|due|so\\s+that|for\\s+(?:now|the\\s+moment|today|the\\s+time\\s+being))\\b|" +
    "等到|等|直到|直至|待|在|之前|以前|因为|由于|如果|若|除非|以免|以防|免得)",
);

/** English words that carry no content of their own in a scope ("hold it for now"). */
const EN_FILLER: ReadonlySet<string> = new Set(
  ["now", "today", "tonight", "yet", "anymore", "moment", "currently", "still", "longer", "time", "further", "notice", "immediately", "straight", "away", "right", "completely", "altogether", "entirely", "temporarily", "permanently", "need", "needs", "want", "wants", "try", "ever", "really", "please"].map(
    (w) => tokenize(w)[0] ?? w,
  ),
);

/** Chinese function words stripped before deciding whether a stretch has content. */
const ZH_FUNCTION = /暂时|现在|目前|马上|立即|立刻|一下|病人|患者|[了吧啊呢掉先再就也还都要的地得么嘛哦呀给用做打上加去把将被让他她它们这那个下]/g;

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

/** True when a stretch of text says something beyond function words. */
function hasContent(text: string): boolean {
  if (tokenize(text).some((t) => !EN_FILLER.has(t))) return true;
  const cjk = text.replace(/[^\p{Script=Han}]/gu, "").replace(ZH_FUNCTION, "");
  return cjk.length > 0;
}

function englishCues(clause: string): Cue[] {
  const cues: Cue[] = [];
  for (const m of clause.matchAll(EN_CUE)) {
    const word = m[0];
    const end = m.index + word.length;
    const rest = clause.slice(end);
    if (HOLD_WORD.test(word) && HOLD_NOT_A_CUE.test(rest)) continue;
    if (STOP_WORD.test(word) && STOP_NOT_A_CUE.test(rest)) continue;
    const kind: CueKind = m[1] ? "predicate" : m[2] ? "participle" : m[3] ? "verb" : "particle";
    cues.push({ start: m.index, end, kind });
  }
  return cues;
}

function chineseCues(clause: string): Cue[] {
  const cues: Cue[] = [];
  for (const m of clause.matchAll(ZH_CUE)) {
    const i = m.index;
    // an A-not-A question (要不要, 用不用, 给不给, 是不是) asks; it does not negate
    if (m[0].startsWith("不") && i > 0 && clause[i - 1] === clause[i + 1]) continue;
    cues.push({ start: i, end: i + m[0].length, kind: m[1] ? "verb" : "particle" });
  }
  return cues;
}

/** Cues of a clause in order (English and Chinese may mix). */
function cuesOf(clause: string): Cue[] {
  return [...englishCues(clause), ...chineseCues(clause)].sort((a, b) => a.start - b.start);
}

/** A clause, with the subordinate clauses that follow it ("…, until the surgeon has seen him"). */
interface Clause {
  text: string;
  tails: string[];
}

/** Clauses of a (lower-case, half-width) text; a clause opening with a subordinator is a tail of the one before. */
function clausesOf(text: string): Clause[] {
  const clauses: Clause[] = [];
  let last = 0;
  const push = (part: string) => {
    if (!part.trim()) return;
    if (clauses.length > 0 && SUBORDINATE_START.test(part)) clauses[clauses.length - 1]!.tails.push(part.trim());
    else clauses.push({ text: part, tails: [] });
  };
  for (const m of text.matchAll(BOUNDARY)) {
    push(text.slice(last, m.index));
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return clauses;
}

/**
 * Negation in an instruction: what its cues negate (`scopes`), what it still
 * asks for (`affirmative`), subordinate clauses of a negated clause
 * (`context`) and clauses with a double negative (see the module comment for
 * the rules). Text without a cue comes back whole as `affirmative` with
 * `negated: false`.
 */
export function analyzeNegation(text: string): NegationAnalysis {
  const folded = toHalfWidth(text).replace(/[\u2018\u2019\u02bc]/g, "'").toLowerCase();
  const affirmative: string[] = [];
  const scopes: string[] = [];
  const context: string[] = [];
  const doubleNegated: string[] = [];
  /** Index in `affirmative` of the clause before, when it had no cue (a bare cue clause negates it). */
  let plain: number | null = null;
  for (const { text: clause, tails } of clausesOf(folded)) {
    const cues = cuesOf(clause);
    if (cues.length === 0) {
      plain = affirmative.push([clause, ...tails].join(" ")) - 1;
      continue;
    }
    if (cues.some((cue, k) => k > 0 && !hasContent(clause.slice(cues[k - 1]!.end, cue.start)))) {
      doubleNegated.push([clause, ...tails].join(" ").trim());
      plain = null;
      continue;
    }
    const [scopesBefore, affirmativeBefore] = [scopes.length, affirmative.length];
    let pending = clause.slice(0, cues[0]!.start);
    cues.forEach((cue, k) => {
      const after = clause.slice(cue.end, cues[k + 1]?.start ?? clause.length);
      const backward = cue.kind === "predicate" || (cue.kind === "participle" && hasContent(pending)) || !hasContent(after);
      if (backward) {
        if (hasContent(pending)) scopes.push(pending.trim());
        pending = after;
      } else {
        affirmative.push(pending);
        scopes.push(after.trim());
        pending = "";
      }
    });
    affirmative.push(pending);
    const negatedHere = scopes.slice(scopesBefore).some(hasContent);
    const bare = !negatedHere && !affirmative.slice(affirmativeBefore).some(hasContent);
    if (bare && plain !== null) {
      scopes.push(affirmative[plain]!.trim());
      affirmative[plain] = "";
    }
    // a subordinate clause of a negated clause is neither asked for nor withheld ("…, until the operation")
    if (negatedHere || (bare && plain !== null)) context.push(...tails);
    else affirmative.push(...tails);
    plain = null;
  }
  const kept = scopes.filter(hasContent);
  return {
    negated: kept.length > 0,
    affirmative: affirmative.join(" ").replace(/\s+/g, " ").trim(),
    scopes: kept,
    context,
    doubleNegated,
  };
}
