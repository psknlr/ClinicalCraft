/**
 * Orders as written (docs/PROTOCOL.md §3.2). An `intervene` call that states its order in words (`query`, `dose`)
 * sends it as the action's `ordered`: the words that order the item — the clause that names it, when the words order
 * several items (`itemOrder`, `orderClause`) — and the dose read from them (core `parseDose`, zh-CN and en). The
 * engine checks the words against the intervention's preset (`doseSpec`, core `checkOrder`): an equivalent dose is
 * given, a conflicting one is not — the session records a dose error (`dose.error`) —, and one it cannot read or
 * compare is refused (`dose-unclear`) — the nurse asks. This module builds the order and says what the learner reads
 * back: a dose in their language, the nurse's read-back of an order whose dose differs from the dose prepared and
 * their question about one that is not clear (nothing given either way), and the check of an order's dose.
 */
import { checkOrder, readOrder, parseDose, ROUTE_WORDS, t, type CaseDefinition, type DomainEvent, type DosePart, type DoseRoute, type DoseSpec, type DoseUnit, type Intervention, type OrderCheck, type OrderedDose, type WrittenOrder } from "@clinicalcraft/core";
import { isZh, joinList, rt, type RuntimeKey } from "../session/i18n.js";
import { resolveIntervention, strArg, withoutDoses, type ToolArgs } from "./clinical-resolve.js";

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

/** What conflicts, in words: the amount (how far), the route, an incomparable unit. */
function conflictText(e: Pick<DoseErrorEvent, "conflicts" | "ordered" | "preset" | "ratio">, locale: string): string {
  const parts: string[] = [];
  if (e.conflicts.includes("amount")) {
    // against a range's nearer end; a dose given in parts is one dose (its whole), not a range
    const ratio = doseRatioText(e.ratio, locale, e.preset.upTo != null && e.preset.upTo !== e.preset.amount);
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
 * Where an order moves to its next one: "…, then …", "…; …", "然后", "接着" — and where it adds another drug: "+", "&",
 * "and", "plus", "with", "和", "及", "与", "联合", "加" (a comma between digits is a number's; a join inside a dose or a
 * preparation, "50U+NS 50ml", "KCl 40 mmol with saline", is not one).
 */
const CLAUSE = /\s*(?:(?<!\d),|,(?!\d)|，|;|；|。|\+|＋|&|\b(?:and then|then|after that|followed by|and|plus|with)\b|然后|接着|随后|之后|再给|并给|联合|并用|加用|加上|加(?![入至量快慢压温热])|和|及|与)\s*/giu;

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

/**
 * The orders of a request: each stretch of its words and the item it names (null: none named alone). `leadingId`: the
 * item a first clause naming none orders (an id written before the order's words).
 */
function orderClauses(c: CaseDefinition, text: string, locale: string, leadingId?: string): { start: number; end: number; id: string | null }[] {
  // a join inside a dose or a preparation is not a clause's end (core `readOrder` spans, NFKC — the same length here)
  const nfkc = text.normalize("NFKC");
  const inside = nfkc.length === text.length ? readOrder(nfkc).spans : [];
  const parts: { start: number; end: number }[] = [];
  let at = 0;
  for (const m of text.matchAll(CLAUSE)) {
    const core = m.index + Math.max(0, m[0].search(/\S/u));
    if (inside.some(([a, b]) => core >= a && core < b)) continue;
    if (m.index > at) parts.push({ start: at, end: m.index });
    at = m.index + m[0].length;
  }
  if (at < text.length) parts.push({ start: at, end: text.length });
  if (parts.length <= 1) return [{ start: 0, end: text.length, id: null }];
  // each part's item: one it names alone, else none (joined to the part before) — never through its dose and route
  // alone ("500ml/h静滴"), nor the diluent of a preparation ("加生理盐水至50毫升")
  const named = parts.map((p, i) => {
    const words = text.slice(p.start, p.end);
    const r = namesNothing(words) ? null : resolveIntervention(c, { query: words }, locale);
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
  return orders;
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
  const orders = orderClauses(c, text, locale, leadingId);
  if (orders.length === 1) return text;
  const own = orders.find((o) => o.id === interventionId);
  return own ? text.slice(own.start, own.end).trim() : null;
}

/** The other items an order names beside this one, each in its own clause (`orderClause`): ordered, not given here. */
export function otherOrders(c: CaseDefinition, request: string, interventionId: string, locale: string): string[] {
  return [...new Set(orderClauses(c, request.trim(), locale).map((o) => o.id).filter((id): id is string => id != null && id !== interventionId))];
}

/** "Your order also names salbutamol: each treatment is given on its own order." — null when it names no other. */
export function otherOrdersText(c: CaseDefinition, request: string, interventionId: string, locale: string): string | null {
  const others = otherOrders(c, request, interventionId, locale);
  return others.length ? rt(locale, "dose.alsoOrdered", { items: joinList(locale, others.map((id) => interventionNameText(c, id, locale))) }) : null;
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
  // in the parts the order gave: a bolus, then the infusion's rate ("7.2 mg as a bolus, then 64.8 mg/h")
  const rate = !isRate(dose.unit) && spec.bolus ? readOrder(ordered.text).mentions.find((m) => isRate(m.unit) && !m.then) : undefined;
  if (rate) return rt(locale, "dose.checkedParts", { bolus: doseText(dose, locale), rate: doseText({ amount: rate.amount, unit: rate.unit }, locale), preset });
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
