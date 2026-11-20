/**
 * Orders as written (docs/PROTOCOL.md §3.2). An `intervene` call that states its order in words (`query`, `dose`)
 * sends it as the action's `ordered`: the words that order the item — the clause that names it, when the words order
 * several items (`itemOrder`, `orderClause`) — and the dose read from them (core `parseDose`, zh-CN and en). The
 * engine checks the words against the intervention's preset (`doseSpec`, core `checkOrder`): an equivalent dose is
 * given, a conflicting one is not — the session records a dose error (`dose.error`) —, and one it cannot read or
 * compare is refused (`dose-unclear`) — the nurse asks. Words that order several items order the first of them, in
 * either language (`resolveOrderedIntervention`); the others' clauses are checked too, each against its own item's
 * preset (`otherClauses`: a dose error recorded and read back though that item is not given). This module builds the
 * order and says what the learner reads back: a dose in their language, the nurse's read-back of an order whose dose
 * differs from the dose prepared and their question about one that is not clear (nothing given either way), and the
 * check of an order's dose.
 */
import { checkOrder, compareDose, readOrder, parseDose, ROUTE_WORDS, t, type CaseDefinition, type DomainEvent, type DosePart, type DoseRoute, type DoseSpec, type DoseUnit, type Intervention, type OrderCheck, type OrderedDose, type WrittenOrder } from "@clinicalcraft/core";
import { isZh, rt, type RuntimeKey } from "../session/i18n.js";
import { resolveIntervention, strArg, withoutDoses, type Resolution, type ToolArgs } from "./clinical-resolve.js";

/** Longest order text kept (core `WrittenOrderSchema`). */
const MAX_ORDER_LENGTH = 1000;

/** A dose error as the engine reports it (`dose.error`, the session's `DoseErrorRecord`). */
export type DoseErrorEvent = Extract<DomainEvent, { type: "dose.error" }>;

/**
 * The order an `intervene` call writes (the action's `ordered`): its words — `query` then `dose`, as written — and the
 * dose read from them: the amount and the route the `dose` argument states, else those of the whole order (the engine
 * reads the words again itself, and asks when they state two doses). Undefined when the call names its item by id
 * alone: a choice from a list states no order.
 */
export function writtenOrder(args: ToolArgs): WrittenOrder | undefined {
  const query = strArg(args, "query");
  const doseArg = strArg(args, "dose");
  const text = [query, doseArg].filter(Boolean).join(" ").slice(0, MAX_ORDER_LENGTH).trim();
  if (!text) return undefined;
  const own = doseArg ? parseDose(doseArg) : null;
  const whole = parseDose(text);
  const amount = own?.amount != null ? own : whole?.amount != null ? whole : null;
  const route = own?.route ?? whole?.route;
  const dose: OrderedDose = { ...(amount?.amount != null && amount.unit ? { amount: amount.amount, unit: amount.unit } : {}), ...(route ? { route } : {}) };
  return { text, ...(dose.amount != null || dose.route != null ? { dose } : {}) };
}

const number = (x: number) => String(Math.round(x * 1e6) / 1e6);

/** A dose's unit in words: "mg", "micrograms", "units/kg/h"; zh-CN "微克", "单位/kg/h". */
export function doseUnitText(unit: DoseUnit, amount: number, locale: string): string {
  const [quantity, ...per] = unit.split("/");
  const form = quantity === "microgram" || quantity === "unit" ? `${quantity}.${amount === 1 ? "one" : "many"}` : quantity;
  return [rt(locale, `dose.unit.${form}` as RuntimeKey), ...per].join("/");
}

/** A route in words: "IM", "inhaled"; zh-CN "肌注", "吸入". */
export function doseRouteText(route: DoseRoute, locale: string): string {
  return rt(locale, `dose.route.${route}` as RuntimeKey);
}

/**
 * The words of an `intervene` call that order this item (`writtenOrder`, then `orderClause`): the whole order when it
 * orders one item, else the clause that names it ("沙丁胺醇2.5毫克+异丙托溴铵250微克雾化" gives ipratropium its own
 * "异丙托溴铵250微克雾化"); the whole order still when no clause names it alone — the engine then reads every dose in it
 * and asks when they disagree. Undefined for an id alone.
 */
export function itemOrder(c: CaseDefinition, args: ToolArgs, interventionId: string, locale: string): WrittenOrder | undefined {
  const written = writtenOrder(args);
  if (!written) return undefined;
  // an id and then the order as written ("/give ticagrelor 180 mg PO and aspirin 300 mg PO"): the words' first clause,
  // naming no item, is the id's
  const leading = strArg(args, "intervention_id") && !strArg(args, "query") ? interventionId : undefined;
  const clause = orderClause(c, written.text, interventionId, locale, leading);
  return clause == null || clause === written.text ? written : writtenOrder({ query: clause });
}

/** A dose in the learner's language: "0.5 mg IM", "500 micrograms IM", "10–20 mg IV", "IV"; zh-CN "0.5 mg 肌注". */
export function doseText(d: OrderedDose | DoseSpec | DosePart, locale: string): string {
  const upTo = "upTo" in d && d.upTo != null && d.upTo !== d.amount ? d.upTo : null;
  const amount = d.amount != null && d.unit != null ? `${number(d.amount)}${upTo != null ? `–${number(upTo)}` : ""} ${doseUnitText(d.unit, upTo ?? d.amount, locale)}` : "";
  const route = "route" in d && d.route ? doseRouteText(d.route, locale) : "";
  return [amount, route].filter(Boolean).join(" ");
}

/** A dose (or a part of one) in the learner's language, with what it comes to for this patient when it is per kg. */
function forPatient(c: Partial<Pick<CaseDefinition, "patient">>, d: DoseSpec | DosePart, locale: string): string {
  const base = doseText(d, locale);
  const weight = c.patient?.weightKg;
  if (!d.unit.includes("/kg") || weight == null || !(weight > 0)) return base;
  const unit = d.unit.replace("/kg", "") as DoseUnit;
  const absolute = doseText({ amount: d.amount * weight, ...(d.upTo != null ? { upTo: d.upTo * weight } : {}), unit }, locale);
  return rt(locale, "dose.perKgFor", { dose: base, absolute });
}

/**
 * The dose prepared, in the learner's language — with what it comes to for this patient when it is per kg and the
 * case states the weight: "0.25 mg/kg IV (20 mg)", "0.1 units/kg/h IV (5.5 units/h)"; zh-CN "0.25 mg/kg 静脉（20 mg）";
 * a bolus and an infusion with both parts: "70–80 units/kg IV (4900–5600 units), then 18 units/kg/h (1260 units/h)",
 * "0.9 mg/kg IV (72 mg) (0.09 mg/kg (7.2 mg) as a bolus, the rest at 0.81 mg/kg/h (64.8 mg/h))".
 */
export function presetText(c: Partial<Pick<CaseDefinition, "patient">>, preset: DoseSpec, locale: string): string {
  const dose = forPatient(c, { amount: preset.amount, ...(preset.upTo != null ? { upTo: preset.upTo } : {}), unit: preset.unit, ...(preset.route ? { route: preset.route } : {}) }, locale);
  const rate = preset.maintenance ? forPatient(c, preset.maintenance, locale) : null;
  if (preset.bolus) return rt(locale, rate ? "dose.preset.parts" : "dose.preset.partsBolus", { dose, bolus: forPatient(c, preset.bolus, locale), rate: rate ?? "" });
  return rate ? rt(locale, "dose.preset.then", { dose, rate }) : dose;
}

/**
 * How far an ordered amount is from the preset: "10 times the preset dose", "1/10 of the preset dose" — against a range
 * (`range`), from its nearer end: "10 times the top of the preset range"; null at 1 or unknown.
 */
export function doseRatioText(ratio: number | null, locale: string, range = false): string | null {
  if (ratio == null || !(ratio > 0) || ratio === 1) return null;
  const more = range ? "dose.conflict.moreRange" : "dose.conflict.more";
  if (ratio > 1) return rt(locale, more, { ratio: number(Math.round(ratio * 100) / 100) });
  // an under-dose within half of the preset in percent ("80% of the preset dose"), else as a fraction ("1/10")
  if (ratio > 0.5) return rt(locale, range ? "dose.conflict.lessRangePercent" : "dose.conflict.lessPercent", { percent: String(Math.round(ratio * 100)) });
  return rt(locale, range ? "dose.conflict.lessRange" : "dose.conflict.less", { ratio: number(Math.round((1 / ratio) * 100) / 100) });
}

/** Is the preset a range (`upTo` above `amount`), or given in parts — "the dose for this is …", not "what I have prepared"? */
export const isRange = (preset: DoseSpec): boolean => (preset.upTo != null && preset.upTo !== preset.amount) || preset.maintenance != null || preset.bolus != null;

/**
 * Was a dose error's amount compared with a range — the preset's own, or, for a rate ordered beside a single dose, its
 * infusion's (`maintenance`: a heparin rate against 18 units/kg/h, not against the bolus's 70–80 units/kg)? A dose
 * given in parts is one dose (its whole), not a range. How far apart they are is then said from the range's nearer end
 * (`doseRatioText`).
 */
export function againstRange(e: Pick<DoseErrorEvent, "ordered" | "preset">): boolean {
  const isRate = (unit: string | undefined) => unit != null && /\/(?:h|min)$/u.test(unit);
  const part = isRate(e.ordered.unit) && !isRate(e.preset.unit) && e.preset.maintenance ? e.preset.maintenance : e.preset;
  return part.upTo != null && part.upTo !== part.amount;
}

/** What conflicts, in words: the amount (how far), the route, an incomparable unit. */
function conflictText(e: Pick<DoseErrorEvent, "conflicts" | "ordered" | "preset" | "ratio">, locale: string): string {
  const parts: string[] = [];
  if (e.conflicts.includes("amount")) {
    // against a range's nearer end
    const ratio = doseRatioText(e.ratio, locale, againstRange(e));
    if (ratio) parts.push(ratio);
  }
  if (e.conflicts.includes("route") && e.ordered.route && e.preset.route) {
    parts.push(rt(locale, "dose.conflict.route", { ordered: doseRouteText(e.ordered.route, locale), preset: doseRouteText(e.preset.route, locale) }));
  }
  if (e.conflicts.includes("unit") && e.ordered.unit) {
    parts.push(rt(locale, "dose.conflict.unit", { ordered: doseUnitText(e.ordered.unit, e.ordered.amount ?? 2, locale), preset: doseUnitText(e.preset.unit, e.preset.amount, locale) }));
  }
  return parts.join(isZh(locale) ? "；" : "; ");
}

/** An intervention's name inside an English sentence ("you ordered intramuscular adrenaline"); acronyms stay. */
function inSentence(name: string, locale: string): string {
  return !isZh(locale) && /^[A-Z][a-z]/.test(name) ? `${name[0]!.toLowerCase()}${name.slice(1)}` : name;
}

/** An intervention's name alone in the learner's language (its id when the case lacks it); `interventionLabel` adds the dose text. */
export function interventionNameText(c: Pick<CaseDefinition, "interventions">, id: string, locale: string): string {
  const iv = c.interventions.find((i) => i.id === id);
  return (iv ? t(iv.name, locale) : "") || id;
}

/**
 * The nurse's closed-loop read-back of an order whose dose differs from the dose prepared (core `dose.error`), in
 * their words: "Before I give intramuscular adrenaline, let me read it back: you ordered 5 mg IM; what I have
 * prepared is 0.5 mg IM. Can you confirm the dose?" (the item by its name — which may itself state the preset —, the
 * two doses apart).
 */
export function doseReadBack(c: Pick<CaseDefinition, "interventions"> & Partial<Pick<CaseDefinition, "patient">>, e: DoseErrorEvent, locale: string): string {
  return rt(locale, isRange(e.preset) ? "dose.readBackRange" : "dose.readBack", {
    name: inSentence(interventionNameText(c, e.interventionId, locale), locale),
    ordered: doseText(e.ordered, locale),
    preset: presetText(c, e.preset, locale),
  });
}

/** That nothing was given, and how far apart the dose ordered and the preset are: "Not given: the dose ordered differs from the preset dose (10 times the preset dose). …". */
export function doseNotGivenText(e: DoseErrorEvent, locale: string): string {
  return rt(locale, "dose.notGiven", { detail: conflictText(e, locale) || doseText(e.ordered, locale) });
}

/** The tool's reply to a dose error: the nurse's read-back as said ("Nurse: “…”"), then that nothing was given. */
export function doseChallengeText(c: Pick<CaseDefinition, "interventions"> & Partial<Pick<CaseDefinition, "patient">>, e: DoseErrorEvent, locale: string): string {
  const said = rt(locale, "dose.said", { speaker: rt(locale, "speaker.nurse"), words: doseReadBack(c, e, locale) });
  return `${said}\n${doseNotGivenText(e, locale)}`;
}

/** An order the engine asked about (core `checkOrder` `query`, the rejection `dose-unclear`). */
export type DoseQuery = Extract<OrderCheck, { outcome: "query" }>;

/** What an order as written comes to for an intervention of the case (core `checkOrder`, through the patient's weight). */
export function orderCheck(c: Pick<CaseDefinition, "interventions" | "patient">, interventionId: string, order: WrittenOrder): OrderCheck | null {
  const iv = c.interventions.find((i) => i.id === interventionId);
  return iv ? checkOrder(order, iv, c.patient.weightKg) : null;
}

/**
 * Why the nurse asks, in their words (core `DoseQueryReason`): the dose cannot be read, is a range, has no unit — or it
 * cannot be compared with the dose prepared: the strength or the weight is missing, or a rate was ordered for a single
 * dose (or the reverse).
 */
function queryWhy(q: DoseQuery, locale: string): string {
  const words = q.words ?? "";
  if (q.reason === "range") return rt(locale, "dose.query.range", { words });
  if (q.reason === "no-unit") return rt(locale, "dose.query.noUnit", { words });
  if (q.reason === "unit") return rt(locale, "dose.query.unit", { words });
  if (q.reason === "count") return rt(locale, "dose.query.count", { words });
  if (q.reason === "several") return rt(locale, "dose.query.several", { words });
  if (q.reason === "total") return rt(locale, "dose.query.total", { words });
  if (q.reason === "unreadable" || !q.dose?.unit) return rt(locale, "dose.query.unreadable", { words });
  const ordered = doseText(q.dose, locale);
  // a rate ordered for a single dose, or a single dose for a rate
  if (q.reason === "rate") return rt(locale, /\/(?:h|min)$/u.test(q.dose.unit) ? "dose.query.rate" : "dose.query.single", { ordered });
  return rt(locale, q.reason === "weight" ? "dose.query.weight" : "dose.query.strength", { ordered });
}

/**
 * The nurse's question about an order whose dose is not clear (nothing given, no dose error), in their words: "Before
 * I give intramuscular adrenaline, I need the dose clearly: I can't read the dose in “0。5mg”. What I have prepared is
 * 0.5 mg IM. Can you give me the dose as a number with its unit?"
 */
export function doseQueryReadBack(c: Pick<CaseDefinition, "interventions"> & Partial<Pick<CaseDefinition, "patient">>, interventionId: string, q: DoseQuery, locale: string): string {
  const preset = c.interventions.find((i) => i.id === interventionId)?.doseSpec;
  // a part of a dose given in parts: is that the whole dose?
  if (q.reason === "partial" && preset && q.dose?.unit) {
    return rt(locale, "dose.query.partial", { name: inSentence(interventionNameText(c, interventionId, locale), locale), ordered: doseText(q.dose, locale), preset: presetText(c, preset, locale) });
  }
  return rt(locale, preset && isRange(preset) ? "dose.query.readBackRange" : "dose.query.readBack", {
    name: inSentence(interventionNameText(c, interventionId, locale), locale),
    why: preset ? queryWhy(q, locale) : rt(locale, "dose.query.unreadable", { words: q.words ?? "" }),
    preset: preset ? presetText(c, preset, locale) : "",
  });
}

/** The tool's reply to an order whose dose is not clear: the nurse's question as said, then that nothing was given. */
export function doseQueryChallengeText(c: Pick<CaseDefinition, "interventions"> & Partial<Pick<CaseDefinition, "patient">>, interventionId: string, q: DoseQuery, locale: string): string {
  const said = rt(locale, "dose.said", { speaker: rt(locale, "speaker.nurse"), words: doseQueryReadBack(c, interventionId, q, locale) });
  return `${said}\n${rt(locale, q.reason === "partial" ? "dose.query.notGivenPartial" : "dose.query.notGiven")}`;
}

/** A dose query's fields for a tool's `data` (why, the words, the dose read, the preset). */
export function doseQueryData(c: Pick<CaseDefinition, "interventions">, interventionId: string, text: string, q: DoseQuery): { interventionId: string; text: string; reason: DoseQuery["reason"]; words: string | null; ordered: OrderedDose | null; preset: DoseSpec | null } {
  const preset = c.interventions.find((i) => i.id === interventionId)?.doseSpec;
  return { interventionId, text, reason: q.reason, words: q.words, ordered: q.dose ? { ...q.dose } : null, preset: preset ? { ...preset } : null };
}

/**
 * Where an order moves to its next one: "…, then …", "…; …", "然后", "接着" — and where it adds another drug, the same
 * in both languages: "+", "&", "and", "plus", "with", "as well as", "和", "及", "以及", "与", "同时", "联合", "加" and
 * the enumeration comma "、" (a comma between digits is a number's; a join inside a dose or a preparation, "50U+NS
 * 50ml", "KCl 40 mmol with saline", "0、5mg", is not one).
 */
const CLAUSE = /\s*(?:(?<!\d),|,(?!\d)|，|、|;|；|。|\+|＋|&|\b(?:and then|then|after that|followed by|as well as|and|plus|with)\b|然后|接着|随后|之后|再给|并给|联合|并用|加用|加上|加(?![入至量快慢压温热])|和|以及|及|与|同时)\s*/giu;

/**
 * Words that say how, when or how fast — never what (beside a dose and a route): a clause of only these names no item
 * ("at 500 mL/h", "0.1 units/kg/h IV", "500ml/h静滴", "then 75 mg daily").
 */
const HOW_WORDS =
  /(?<![a-z])(?:at|now|stat|then|over|via|by|and|with|the|a|an|please|give|start|run|running|infuse|infusion|bolus|push|rate|dose|loading|load|slowly|daily|hourly|every|repeat|min(?:ute)?s?|h|hrs?|hours?|per|of|to|up|in|for|after|followed|twice|once|times)(?![a-z])|泵入|滴注|输注|推注|快速|缓慢|立即|马上|立刻|然后|随后|之后|每日|每天|每小时|每|次|负荷|维持|剂量|给予|给|用|再|并|和|及|与|内|分钟|小时|以上|在|于|速度|速率|持续|开始/gu;

/** Does a clause name nothing but doses, routes and how they are given — no item? */
function namesNothing(words: string): boolean {
  let rest = withoutDoses(words).toLowerCase();
  for (const [, pattern] of ROUTE_WORDS) rest = rest.replace(new RegExp(pattern.source, "gu"), " ");
  rest = rest.replace(HOW_WORDS, " ");
  return !/[a-z]{2,}|[\u4e00-\u9fff]/u.test(rest);
}

/** What stands between two letters of a name: a bracket, a separator (",", "—", "、", ";", "/"…), other marks, or spacing alone. */
type Gap = "bracket" | "separator" | "other" | "space";
const gapOf = (between: string): Gap => (/[(（)）[\]【】]/u.test(between) ? "bracket" : /[,，、;；:：—–\-/·]/u.test(between) ? "separator" : /\S/u.test(between) ? "other" : "space");

/** The letters and digits of a text and where each stands in it: a name as written, whatever its punctuation and spacing. */
function letters(text: string): { chars: string; at: number[] } {
  let chars = "";
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (/[\p{L}\p{N}]/u.test(text[i]!)) {
      chars += text[i];
      at.push(i);
    }
  }
  return { chars, at };
}

/**
 * Every name and alias of a case's items, NFKC and lower case — with its letters and digits when it is long enough to be
 * known by them whatever its punctuation (ten, or six Han characters), and whether it holds a join (`CLAUSE`); cached
 * per case (immutable).
 */
interface ItemName {
  name: string;
  joined: boolean;
  /** Its letters and digits, when long enough to be known by them; null otherwise. */
  letters: string | null;
  /** Where its own punctuation or spacing stands — before which of its letters (index into `letters`) — and what it is. */
  gaps: Map<number, Gap>;
}
const itemNamesCache = new WeakMap<CaseDefinition, ItemName[]>();
function itemNames(c: CaseDefinition): ItemName[] {
  let names = itemNamesCache.get(c);
  if (!names) {
    const all = (x: unknown): string[] => (typeof x === "string" ? [x] : Array.isArray(x) ? x.flatMap(all) : x && typeof x === "object" ? Object.values(x).flatMap(all) : []);
    const joins = new RegExp(CLAUSE.source, "iu");
    names = [...new Set(c.interventions.flatMap((iv) => [...all(iv.name), ...all(iv.aliases)]).map((n) => n.normalize("NFKC").toLowerCase().trim()))]
      .filter((n) => n.length > 0)
      .map((name) => {
        const own = letters(name);
        const long = own.chars.length >= 10 || (own.chars.match(/\p{Script=Han}/gu)?.length ?? 0) >= 6;
        const gaps = new Map<number, Gap>();
        for (let k = 1; k < own.at.length; k++) if (own.at[k]! - own.at[k - 1]! > 1) gaps.set(k, gapOf(name.slice(own.at[k - 1]! + 1, own.at[k]!)));
        return { name, joined: joins.test(name), letters: long ? own.chars : null, gaps };
      });
    itemNamesCache.set(c, names);
  }
  return names;
}

/**
 * Where the words write an item's own name or alias that holds a join, as the item writes it ("Continuous ECG, blood
 * pressure and SpO₂ monitoring", "反应后处理：监护观察、记录致敏药物、告知家属…") — or a long one with other punctuation and
 * spacing where it has its own, from a word's edge to a word's edge ("Lifestyle advice only, recheck in 6–12 months"
 * for "Lifestyle advice only — recheck in 6–12 months", "加压快速大量输注晶体液、直到血压恢复正常" for "…晶体液，直到…"):
 * [start, end) in `text` — no clause ends inside it.
 */
function namedSpans(c: CaseDefinition, text: string): [number, number][] {
  const hay = text.normalize("NFKC").toLowerCase();
  if (hay.length !== text.length) return [];
  const spans: [number, number][] = [];
  const word = /[a-z0-9]/u;
  const written = letters(hay);
  for (const n of itemNames(c)) {
    if (n.joined) for (let at = hay.indexOf(n.name); at >= 0; at = hay.indexOf(n.name, at + 1)) spans.push([at, at + n.name.length]);
    if (!n.letters) continue;
    for (let i = written.chars.indexOf(n.letters); i >= 0; i = written.chars.indexOf(n.letters, i + 1)) {
      const start = written.at[i]!;
      const end = written.at[i + n.letters.length - 1]! + 1;
      const cutsWord = (word.test(hay[start]!) && start > 0 && word.test(hay[start - 1]!)) || (word.test(hay[end - 1]!) && end < hay.length && word.test(hay[end]!));
      // the words' punctuation only of the kind the name has there ("，" for "—", "、" for "，"), their spacing wherever it
      // has either — never a list's comma where the name has a space or a bracket ("adrenaline, im …" is no "adrenaline
      // IM", "IV glucose, dextrose infusion" no "IV glucose (dextrose)")
      let aligned = true;
      for (let k = 1; k < n.letters.length && aligned; k++) {
        const between = hay.slice(written.at[i + k - 1]! + 1, written.at[i + k]!);
        if (between.length === 0) continue;
        const own = n.gaps.get(k);
        const gap = gapOf(between);
        if (own == null || (gap !== "space" && gap !== own)) aligned = false;
      }
      if (!cutsWord && aligned) spans.push([start, end]);
    }
  }
  return spans;
}

/**
 * The orders of a request: each stretch of its words and the item it names (null: none named alone). `leadingId`: the
 * item a first clause naming none orders (an id written before the order's words). `listed`: every clause of the
 * request names an item alone, or nothing but doses, routes and how they are given — a list of orders, not one item's
 * words that hold a join (whose clauses name nothing, or other items by a fragment of its name).
 */
function orderClauses(c: CaseDefinition, text: string, locale: string, leadingId?: string): { orders: { start: number; end: number; id: string | null }[]; listed: boolean } {
  // a join inside a dose or a preparation is not a clause's end (core `readOrder` spans, NFKC — the same length here),
  // nor one inside an item's own name or alias as the words write it
  const nfkc = text.normalize("NFKC");
  const inside = nfkc.length === text.length ? readOrder(nfkc).spans : [];
  const names = namedSpans(c, text);
  const parts: { start: number; end: number }[] = [];
  let at = 0;
  for (const m of text.matchAll(CLAUSE)) {
    const core = m.index + Math.max(0, m[0].search(/\S/u));
    if (inside.some(([a, b]) => core >= a && core < b) || names.some(([a, b]) => core > a && core < b)) continue;
    if (m.index > at) parts.push({ start: at, end: m.index });
    at = m.index + m[0].length;
  }
  if (at < text.length) parts.push({ start: at, end: text.length });
  if (parts.length <= 1) return { orders: [{ start: 0, end: text.length, id: null }], listed: false };
  // each part's item: one it names alone, else none (joined to the part before) — never through its dose and route
  // alone ("500ml/h静滴"), nor the diluent of a preparation ("加生理盐水至50毫升")
  let listed = true;
  const named = parts.map((p, i) => {
    const words = text.slice(p.start, p.end);
    const nothing = namesNothing(words);
    const r = nothing ? null : resolveIntervention(c, { query: words }, locale);
    if (!nothing && r?.kind !== "id" && !(i === 0 && leadingId)) listed = false;
    return r?.kind === "id" ? r.id : i === 0 ? (leadingId ?? null) : null;
  });
  const orders: { start: number; end: number; id: string | null }[] = [];
  parts.forEach((p, i) => {
    const last = orders.at(-1);
    const preamble = last != null && last.id == null && readOrder(text.slice(last.start, last.end)).mentions.length === 0;
    if (last && (named[i] == null || named[i] === last.id || preamble)) {
      last.end = p.end;
      last.id ??= named[i]!;
    } else orders.push({ ...p, id: named[i]! });
  });
  return { orders, listed };
}

/**
 * The words of an order that order one item — a spoken request to a colleague (`params.order` of `give_intervention`)
 * or a learner's own order (`intervene`, `/give`, the web's treatment search: `itemOrder`): the order split into
 * clauses, at "then", ";", "+", "and", "with", "和", "加"…; a clause that names no item (or several) belongs to the
 * order before it ("give adrenaline IM, 5 mg" is one order), and so does a clause naming an item after words that
 * named none and stated no dose ("give adrenaline, IM 0.5 mg"); otherwise a clause naming an item starts the next order
 * ("paracetamol 1 g now, then adrenaline 0.5 mg IM", "沙丁胺醇2.5毫克+异丙托溴铵250微克雾化" are two) — the order that
 * names the item. The whole order when it holds one; null when it orders several items and none names this one alone:
 * whose dose is whose is not known (the colleague asks for one order at a time).
 */
export function orderClause(c: CaseDefinition, request: string, interventionId: string, locale: string, leadingId?: string): string | null {
  const text = request.trim();
  const { orders } = orderClauses(c, text, locale, leadingId);
  if (orders.length === 1) return text;
  const own = orders.find((o) => o.id === interventionId);
  return own ? text.slice(own.start, own.end).trim() : null;
}

/**
 * The items a request orders, each with the words that order it (`orderClauses`), in the order written: one per item
 * named alone in its own clause (an item named twice keeps its first clause; words naming none are no order) — fewer
 * than two for words that are one order. `leadingId`: the item a first clause naming none orders (an id written before
 * them).
 */
export function orderedItems(c: CaseDefinition, request: string, locale: string, leadingId?: string): { id: string; text: string }[] {
  return listedItems(c, request, locale, leadingId).items;
}

/** The items a request orders (`orderedItems`), and whether its clauses are a list of orders (`orderClauses` `listed`). */
function listedItems(c: CaseDefinition, request: string, locale: string, leadingId?: string): { items: { id: string; text: string }[]; listed: boolean } {
  const text = request.trim();
  const seen = new Set<string>();
  const out: { id: string; text: string }[] = [];
  const { orders, listed } = orderClauses(c, text, locale, leadingId);
  for (const o of orders) {
    if (o.id == null || seen.has(o.id)) continue;
    seen.add(o.id);
    out.push({ id: o.id, text: text.slice(o.start, o.end).trim() });
  }
  return { items: out, listed };
}

/** The other items an order names beside this one, each in its own clause (`orderedItems`): ordered, not given here. */
export function otherOrders(c: CaseDefinition, request: string, interventionId: string, locale: string): string[] {
  return orderedItems(c, request, locale).map((o) => o.id).filter((id) => id !== interventionId);
}

/**
 * The item an `intervene` call orders, as every step of the call reads it — the tool, its approval and risk, the
 * spatial gate and a hook's rewrite (docs/PROTOCOL.md §3.2): by id (`intervention_id`) that item; free words as
 * `resolveIntervention` reads them — but words that order several items, each in its own clause ("ticagrelor 180 mg
 * PO and aspirin 300 mg PO", "替格瑞洛180mg+阿司匹林300mg口服", "…、…"), order the first of them, in either language:
 * never the one whose name the matcher finds longer, nor none ("which one?"). The others are checked clause by clause
 * against their own presets (`otherClauses`) and given on their own orders. "The first of them" holds only for a list
 * of orders — every clause names an item alone, or nothing but doses, routes and how they are given (`orderClauses`
 * `listed`) —, and an item's own name or alias that holds a join is one clause ("Continuous ECG, blood pressure and SpO₂
 * monitoring" orders monitoring): words that, whole, name one item none of the clauses names alone, or whose clauses
 * are no such list, keep the whole words' item.
 */
export function resolveOrderedIntervention(c: CaseDefinition, args: ToolArgs, locale: string): Resolution {
  const r = resolveIntervention(c, args, locale);
  const query = strArg(args, "query");
  if (strArg(args, "intervention_id") || !query || (r.kind !== "id" && r.kind !== "ambiguous")) return r;
  const { items, listed } = listedItems(c, query, locale);
  const ids = items.map((o) => o.id);
  if (ids.length < 2 || !listed || (r.kind === "id" && !ids.includes(r.id))) return r;
  return { kind: "id", id: ids[0]! };
}

/**
 * The other orders of an `intervene` call's words (`writtenOrder`) beside its item's — each item with the words that
 * order it, as written (`orderedItems`; an id written before the words owns their first clause).
 */
export function otherClauses(c: CaseDefinition, args: ToolArgs, interventionId: string, locale: string): { id: string; text: string }[] {
  const words = writtenOrder(args)?.text;
  if (!words) return [];
  const leading = strArg(args, "intervention_id") && !strArg(args, "query") ? interventionId : undefined;
  return orderedItems(c, words, locale, leading).filter((o) => o.id !== interventionId);
}

/**
 * What a given order's stated amount came to: checked — the preset dose, in the units written ("Dose checked: 500
 * micrograms IM as ordered is the preset dose (0.5 mg IM).") — or, for an intervention without a preset, not checked:
 * the case's own dose was given. Null when the order stated no amount.
 */
export function doseCheckText(c: Partial<Pick<CaseDefinition, "patient">>, iv: Pick<Intervention, "doseSpec">, ordered: WrittenOrder | undefined, locale: string): string | null {
  const dose = ordered?.dose;
  if (!ordered || !dose || dose.amount == null || !dose.unit) return null;
  const spec = iv.doseSpec;
  if (!spec) return rt(locale, "dose.unchecked", { ordered: doseText(dose, locale) });
  const preset = presetText(c, spec, locale);
  const isRate = (unit: string) => /\/(?:h|min)$/u.test(unit);
  // in the parts the order gave: a bolus, then the infusion's rate ("7.2 mg as a bolus, then 64.8 mg/h") — or the time
  // its rest runs over ("7.2 mg bolus, the rest over 60 min": the dose given is the bolus's)
  const mentions = !isRate(dose.unit) && spec.bolus ? readOrder(ordered.text).mentions : [];
  const rate = mentions.find((m) => isRate(m.unit) && !m.then);
  if (rate) return rt(locale, "dose.checkedParts", { bolus: doseText(dose, locale), rate: doseText({ amount: rate.amount, unit: rate.unit }, locale), preset });
  const restOver = mentions.find((m) => m.restOver != null)?.restOver;
  const isBolus = spec.bolus != null && dose.amount != null && compareDose({ amount: dose.amount, unit: dose.unit }, { ...spec.bolus }, c.patient?.weightKg).equivalent;
  if (restOver != null && isBolus) return rt(locale, "dose.checkedRest", { bolus: doseText(dose, locale), minutes: number(restOver), preset });
  const checked = rt(locale, "dose.checked", { ordered: doseText(dose, locale), preset });
  // only the infusion's rate, for a dose prepared as a bolus then an infusion: the bolus is the preset's own
  return isRate(dose.unit) && !isRate(spec.unit) && spec.maintenance ? `${checked} ${rt(locale, "dose.bolusNotOrdered", { preset })}` : checked;
}

/** The dose an intervention gives (`administeredDose`): its preset, as data and in the case's words. */
export interface AdministeredDose {
  /** The intervention's `doseSpec`; null when the case states none. */
  dose: DoseSpec | null;
  /** The case's dose text in the learner's language; null when the case states none. */
  text: string | null;
}

/**
 * The dose an intervention gives — always its preset (an order whose dose differs is never given): kept beside the
 * order as written and the dose read from it, so a record shows the three apart (docs/PROTOCOL.md §3.2).
 */
export function administeredDose(c: Pick<CaseDefinition, "interventions">, id: string, locale: string): AdministeredDose {
  const iv = c.interventions.find((i) => i.id === id);
  return { dose: iv?.doseSpec ? { ...iv.doseSpec } : null, text: (iv?.dose ? t(iv.dose, locale) : "") || null };
}

/** A dose error's fields for a tool's `data` (what was written, read and prepared; how far apart; how serious). */
export function doseErrorData(e: DoseErrorEvent): Omit<DoseErrorEvent, "type"> {
  const { type: _type, ...fields } = e;
  return { ...fields, ordered: { ...e.ordered }, preset: { ...e.preset }, conflicts: [...e.conflicts] };
}
