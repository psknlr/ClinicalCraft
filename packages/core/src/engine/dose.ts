/**
 * Doses (docs/CASE_AUTHORING.md §6, docs/PROTOCOL.md §3.2): an order's dose against an intervention's preset
 * (`interventions[].doseSpec`) after unit conversion, how serious a conflict is, and what an order as written comes
 * to (`checkOrder`: given, asked about, or a dose error). Reading the words is `dose-read.ts`. Pure: no I/O, no clock.
 */
import type { Intervention } from "../schema/case.js";
import type { DosePart, DoseQuantity, DoseSpec, DoseUnit, OrderedDose } from "../schema/common.js";
import type { DoseConflict, WrittenOrder } from "../schema/session.js";
import { readingDose, readOrder, type DoseMention, type DoseTotal, type LabAnalyte, type OrderReading, type UnclearDoseReason } from "./dose-read.js";
import { isHighAlert } from "./high-alert.js";

/** A ratio this far from 1 — ×10 or more, ÷10 or more — is a tenfold error: always critical. */
export const TENFOLD = 10;
/**
 * How far an amount may be from a weight-based dose converted through the patient's weight (either way round) and
 * still be the same dose: weight-based doses are rounded in practice (15 mg/kg at 23 kg is given as 350 mg).
 */
export const WEIGHT_BASED_TOLERANCE = 0.1;
/** Relative tolerance of every other comparison: floating point only (500 microgram is 0.5 mg exactly). */
const EXACT = 1e-9;
/** Two doses of one order are the same dose written twice within this, when one is converted through the weight. */
const SAME_DOSE = 0.05;

/** What a unit measures, whether per kg and per time, and its factor to the base (mg, mL, unit, mmol; per hour). */
interface UnitParts {
  dimension: "mass" | "volume" | "unit" | "mmol";
  perKg: boolean;
  rate: boolean;
  factor: number;
}

const QUANTITY: Record<DoseQuantity, { dimension: UnitParts["dimension"]; factor: number }> = {
  g: { dimension: "mass", factor: 1000 },
  mg: { dimension: "mass", factor: 1 },
  microgram: { dimension: "mass", factor: 0.001 },
  mL: { dimension: "volume", factor: 1 },
  unit: { dimension: "unit", factor: 1 },
  mmol: { dimension: "mmol", factor: 1 },
};

function unitParts(unit: DoseUnit): UnitParts {
  const [quantity, ...rest] = unit.split("/") as [DoseQuantity, ...string[]];
  const time = rest.find((x) => x === "h" || x === "min");
  const q = QUANTITY[quantity];
  return { dimension: q.dimension, perKg: rest.includes("kg"), rate: time != null, factor: q.factor * (time === "min" ? 60 : 1) };
}

const tidy = (x: number) => Math.round(x * 1e6) / 1e6;

/** Why a dose read cannot be compared with the preset (`DoseQueryReason`). */
export type IncomparableDoseReason = "strength" | "weight" | "rate";

/** An amount (or a range) and a preset's part, in one frame: absolute through the weight when it is known. */
interface Framed {
  low: number;
  high: number;
  partLow: number;
  partHigh: number;
  /** A dose per kg against an absolute one (or capped): the tolerance is `WEIGHT_BASED_TOLERANCE`. */
  mixed: boolean;
}

/** A dose an order states, as `checkOrder` compares it: an amount or a range, its unit, a cap with a dose per kg. */
interface Stated {
  amount: number;
  upTo?: number;
  unit: DoseUnit;
  max?: { amount: number; unit: DoseUnit };
}

/**
 * An order's amount and a preset's part in one frame: g, mg and microgram into one another, per minute into per hour,
 * a dose per kg into an absolute one through the weight when it is known (and an order's own cap after that) — so the
 * doses of one order compare with one another too; else why not.
 */
function frame(stated: Stated, part: Pick<DosePart, "amount" | "upTo" | "unit">, weight: number | null): Framed | IncomparableDoseReason {
  const o = unitParts(stated.unit);
  const p = unitParts(part.unit);
  if (o.rate !== p.rate) return "rate";
  if (o.dimension !== p.dimension) return "strength";
  const capped = stated.max != null && o.perKg && weight != null;
  // a dose per kg against an absolute one, or the reverse, needs the weight
  const mixed = o.perKg !== p.perKg || capped;
  if (mixed && weight == null) return "weight";
  // one frame for every dose of an order: absolute through the weight when it is known, else as both are written
  const scale = (perKg: boolean) => (weight != null && perKg ? weight : 1);
  const cap = capped ? stated.max!.amount * unitParts(stated.max!.unit).factor : Infinity;
  const value = (x: number) => Math.min(x * o.factor * scale(o.perKg), cap);
  return {
    low: value(stated.amount),
    high: value(stated.upTo ?? stated.amount),
    partLow: part.amount * p.factor * scale(p.perKg),
    partHigh: (part.upTo ?? part.amount) * p.factor * scale(p.perKg),
    mixed,
  };
}

/** How an order's dose compares with a preset (`compareDose`). */
export interface DoseComparison {
  /** Nothing conflicts: the order is the preset dose. */
  equivalent: boolean;
  /**
   * The ordered amount over the preset's after conversion — over the nearer end of a preset range, 1 inside it. Null
   * when the order states no amount or its unit cannot be compared with the preset's.
   */
  ratio: number | null;
  /**
   * The same over the range's farther end — its bottom for an order above it, its top for one below: how far the order
   * is from every dose the range allows (a tenfold slip of any of them is tenfold here). Equal to `ratio` for a single
   * preset; null when `ratio` is.
   */
  far: number | null;
  /** What conflicts (empty when equivalent). */
  conflicts: DoseConflict[];
}

/** An amount against a part: its ratios, and whether it is the part's (within the tolerance). */
function measure(f: Framed, single: number): { equivalent: boolean; ratio: number; far: number } {
  const ratio = tidy(single < f.partLow ? single / f.partLow : single > f.partHigh ? single / f.partHigh : 1);
  const far = tidy(single < f.partLow ? single / f.partHigh : single > f.partHigh ? single / f.partLow : 1);
  return { equivalent: Math.abs(ratio - 1) <= (f.mixed ? WEIGHT_BASED_TOLERANCE : EXACT), ratio, far };
}

/**
 * Compare an order's dose with a preset (its main dose, `amount`–`upTo` in `unit`). Amounts are converted to a common
 * unit: g, mg and microgram into one another, per minute into per hour, and a dose per kg into an absolute one through
 * `weightKg` (the case's `patient.weightKg`; then within `WEIGHT_BASED_TOLERANCE`). A volume, units and millimoles
 * compare only with themselves — a volume is never read as a mass (the concentration is not known) — and a dose with a
 * rate only with a rate: anything else is a `unit` conflict. An amount within `[amount, upTo]` is the preset's; outside
 * it is an `amount` conflict. A dose per kg with its own cap (`max`, "0.01 mg/kg, max 0.5 mg") is capped after the
 * weight. Routes conflict when both are stated and differ. A dose that states nothing conflicts with nothing.
 */
export function compareDose(ordered: OrderedDose & { max?: { amount: number; unit: DoseUnit } }, preset: Pick<DoseSpec, "amount" | "upTo" | "unit" | "route">, weightKg?: number): DoseComparison {
  const conflicts: DoseConflict[] = [];
  let ratio: number | null = null;
  let far: number | null = null;
  if (ordered.amount != null && ordered.unit != null) {
    const f = frame({ amount: ordered.amount, unit: ordered.unit, ...(ordered.max ? { max: ordered.max } : {}) }, preset, weightKg != null && weightKg > 0 ? weightKg : null);
    if (typeof f === "string") conflicts.push("unit");
    else {
      const m = measure(f, f.low);
      ratio = m.ratio;
      far = m.far;
      if (!m.equivalent) conflicts.push("amount");
    }
  }
  if (ordered.route != null && preset.route != null && ordered.route !== preset.route) conflicts.push("route");
  return { equivalent: conflicts.length === 0, ratio, far, conflicts };
}

/** For a `critical`, high-risk or high-alert intervention, an order at least this many times the preset is a critical dose error. */
export const TWOFOLD = 2;

/**
 * How serious a dose error is (docs/PROTOCOL.md §3.2): `critical` for a tenfold difference, either way, for any
 * medicine — measured against the farther end of a preset range (`far`: an order ten times any dose the range allows
 * is tenfold); and, for an intervention that is `critical`, high-risk or a high-alert medicine (`isHighAlert`: insulin,
 * potassium, anticoagulants, opioids, thrombolytics; IV adrenergic agonists, magnesium, sedation…), also for an order
 * at least twice the preset (`ratio` ≥ 2, from the range's nearer end) or by another route. Every other conflict is a
 * `warning` — a rounding or weight-band difference, an under-dose of a high-risk drug that is not tenfold: the order is
 * still not given, and the dose error stays for the debrief, but it never fails the safety outcome. Critical dose
 * errors fail it.
 */
export function doseErrorSeverity(
  ratio: number | null,
  conflicts: readonly DoseConflict[],
  intervention: Pick<Intervention, "critical" | "risk"> & Partial<Pick<Intervention, "name" | "kind" | "dose" | "doseSpec">>,
  far: number | null = ratio,
): "warning" | "critical" {
  const tenfold = (x: number | null) => x != null && (x >= TENFOLD || x <= 1 / TENFOLD);
  if (tenfold(ratio) || tenfold(far)) return "critical";
  const dangerous = intervention.critical === true || intervention.risk === "high" || (intervention.name != null && isHighAlert(intervention as Pick<Intervention, "name">));
  if (!dangerous) return "warning";
  return conflicts.includes("route") || (conflicts.includes("amount") && ratio != null && ratio >= TWOFOLD) ? "critical" : "warning";
}

/** A part of a dose in words, technical: "0.5 mg", "10–20 mg". */
const partText = (d: { amount?: number; upTo?: number; unit?: DoseUnit }) =>
  d.amount != null && d.unit != null ? `${d.amount}${d.upTo != null && d.upTo !== d.amount ? `–${d.upTo}` : ""} ${d.unit}` : "";

/**
 * A dose in words, technical (units as the schema writes them): "0.5 mg IM", "10–20 mg IV", "IV"; a preset given as a
 * bolus and an infusion with its parts: "70–80 unit/kg IV, then 18 unit/kg/h", "0.9 mg/kg IV (0.09 mg/kg bolus, then
 * 0.81 mg/kg/h)".
 */
export function formatDose(d: OrderedDose | DoseSpec): string {
  const main = [partText(d), d.route ?? ""].filter(Boolean).join(" ");
  const spec = d as Partial<DoseSpec>;
  if (spec.bolus) return `${main} (${partText(spec.bolus)} bolus${spec.maintenance ? `, then ${partText(spec.maintenance)}` : ""})`;
  return spec.maintenance ? `${main}, then ${partText(spec.maintenance)}` : main;
}

/* ------------------------------------------------------------------ */
/* An order as written against the preset                              */
/* ------------------------------------------------------------------ */

/**
 * Why an order's dose is asked about rather than checked: its words cannot be read (`dose-read.ts`: `unreadable`,
 * `range`, `no-unit`, `unit`, `count`), they state several doses for it (`several`), only a part of a dose given in
 * parts (`partial`), only a daily total or a dose per m² that is not the preset's (`total`), or the dose read cannot be
 * compared with the preset — a volume, or another measure, whose strength the order does not state (`strength`); a dose
 * per kg against an absolute one, or the reverse, without the patient's weight (`weight`); a rate against a single
 * dose, or the reverse (`rate`).
 */
export type DoseQueryReason = UnclearDoseReason | IncomparableDoseReason | "several" | "partial" | "total";

/** What an order as written comes to (`checkOrder`). */
export type OrderCheck =
  /** Given: the dose read is the preset's, or the order states none (the preset); `checked` false without a preset. */
  | { outcome: "given"; dose: OrderedDose | null; checked: boolean }
  /**
   * Not given and not a dose error: the nurse asks — the dose cannot be read (`words`), is a range across the preset's
   * ends, has no unit, is stated more than once differently, is a part of a dose given in parts, or is in a unit the
   * preset's cannot be compared with (`dose`): without the strength or the weight, or a rate against a single dose.
   */
  | { outcome: "query"; reason: DoseQueryReason; words: string | null; dose: OrderedDose | null }
  /** Not given: the amount or the route conflicts with the preset — a dose error (`severity`, `doseErrorSeverity`). */
  | { outcome: "conflict"; dose: OrderedDose; ratio: number | null; conflicts: DoseConflict[]; severity: "warning" | "critical" };

/** A dose the words state, framed against the part it is checked against. */
interface Candidate {
  mention: DoseMention;
  stated: Stated;
  f: Framed;
}

/** What one part of the preset makes of the doses the words state for it. */
type PartVerdict =
  | { state: "absent" }
  | { state: "ok"; dose: Stated }
  /** A part of a dose given in parts, alone: its bolus, or the rest of it (the whole less the bolus). */
  | { state: "partial"; dose: Stated }
  | { state: "mismatch"; dose: Stated; ratio: number; far: number }
  | { state: "range"; words: string }
  | { state: "several"; doses: Stated[] };

/** A mention given over so many minutes as the rate it runs at ("40 mmol over 2 hours" → 20 mmol/h). */
function asRate(m: DoseMention): Stated | null {
  if (m.over == null || m.upTo != null || unitParts(m.unit).rate) return null;
  return { amount: tidy(m.amount / (m.over / 60)), unit: `${m.unit}/h` as DoseUnit };
}

const statedOf = (m: DoseMention): Stated => ({ amount: m.amount, ...(m.upTo != null ? { upTo: m.upTo } : {}), unit: m.unit, ...(m.max ? { max: m.max } : {}) });

/** The total of doses stated in parts, in the first's unit (else the first, as stated). */
function totalOf(parts: Candidate[]): Stated {
  const first = parts[0]!.stated;
  const p = unitParts(first.unit);
  const same = parts.every((c) => {
    const q = unitParts(c.stated.unit);
    return q.dimension === p.dimension && q.perKg === p.perKg && q.rate === p.rate && c.stated.max == null;
  });
  return same ? { amount: tidy(parts.reduce((sum, c) => sum + (c.stated.amount * unitParts(c.stated.unit).factor) / p.factor, 0)), unit: first.unit } : first;
}

/**
 * What the doses the words state for one part of the preset come to: none; the part's (one dose, a range within it, a
 * total stated beside the parts that add up to it — or, for a dose given in parts, `bolus`, the parts themselves, the
 * first of them its bolus); a part of a dose given in parts, alone (`partial`); another dose (one, a range wholly above
 * or below, a bolus that is not the preset's — `mismatch`); a range across its ends; several doses that disagree.
 */
function partVerdict(candidates: Candidate[], whole: Framed | null, bolus: ((s: Stated) => Framed | IncomparableDoseReason) | null, rangeWords: (m: DoseMention) => string): PartVerdict {
  if (candidates.length === 0) return { state: "absent" };
  const tol = (c: Candidate) => (c.f.mixed ? WEIGHT_BASED_TOLERANCE : EXACT);
  const ranges = candidates.filter((c) => c.stated.upTo != null);
  if (ranges.length > 0) {
    if (candidates.length > 1) return { state: "several", doses: candidates.map((c) => c.stated) };
    const c = ranges[0]!;
    const { low, high, partLow, partHigh } = c.f;
    if (low >= partLow * (1 - tol(c)) && high <= partHigh * (1 + tol(c))) return { state: "ok", dose: c.stated };
    // wholly above or below the preset: a dose error, measured from the order's nearer end
    if (low > partHigh * (1 + tol(c))) return { state: "mismatch", dose: c.stated, ...measure(c.f, low) };
    if (high < partLow * (1 - tol(c))) return { state: "mismatch", dose: c.stated, ...measure(c.f, high) };
    return { state: "range", words: rangeWords(c.mention) };
  }
  // the doses stated, the same dose counted once (written twice: "0.9 mg/kg (72 mg)", rounded through the weight)
  const same = (a: Candidate, b: Candidate) => Math.abs(a.f.low - b.f.low) <= (a.f.mixed || b.f.mixed ? SAME_DOSE : EXACT) * Math.max(a.f.low, b.f.low);
  const distinct: Candidate[] = [];
  for (const c of candidates) if (!distinct.some((d) => same(c, d))) distinct.push(c);
  const mixed = candidates.some((c) => c.f.mixed);
  const isWhole = (value: number) => whole != null && measure({ ...whole, mixed }, value).equivalent;
  const sum = (cs: Candidate[]) => cs.reduce((total, c) => total + c.f.low, 0);
  // a dose given in parts, its first part the bolus: a bolus that is not the preset's is a dose error
  const parted = (parts: Candidate[], dose: Stated): PartVerdict => {
    const f = bolus?.(parts[0]!.stated);
    if (f && typeof f !== "string") {
      const m = measure(f, f.low);
      if (!m.equivalent) return { state: "mismatch", dose: parts[0]!.stated, ratio: m.ratio, far: m.far };
    }
    return { state: "ok", dose };
  };
  // a dose given in parts (`bolus`), stated as its parts adding up to the whole ("7.2 mg bolus then 64.8 mg over 60 min")
  if (bolus && candidates.length > 1 && isWhole(sum(candidates))) return parted(candidates, totalOf(candidates));
  if (distinct.length === 1) {
    const c = distinct[0]!;
    const m = measure(c.f, c.f.low);
    // a dose given in parts: its bolus alone, or the rest of it alone (the whole less the bolus), is a part — whichever
    // of the whole and the parts the amount is nearest; any other amount is the whole dose's, checked against it
    const fb = bolus?.(c.stated);
    if (fb && typeof fb !== "string") {
      const rest: Framed = { ...c.f, partLow: c.f.partLow - fb.partHigh, partHigh: c.f.partHigh - fb.partLow };
      const off = (f: Framed) => Math.abs(Math.log(measure(f, f.low).ratio));
      const nearest = [c.f, fb, rest].filter((f) => f.partLow > 0 && measure(f, f.low).equivalent).sort((a, b) => off(a) - off(b))[0];
      if (nearest && nearest !== c.f) return { state: "partial", dose: c.stated };
    }
    if (m.equivalent) return { state: "ok", dose: c.stated };
    return { state: "mismatch", dose: c.stated, ratio: m.ratio, far: m.far };
  }
  // a total stated (once or more) beside the parts that add up to it ("7.2 mg, then 64.8 mg; total 72 mg")
  const offBy = (c: Candidate) => (whole ? Math.abs(Math.log(measure({ ...whole, mixed }, c.f.low).ratio)) : Infinity);
  const total = candidates.filter((c) => isWhole(c.f.low)).sort((a, b) => offBy(a) - offBy(b))[0];
  const parts = total ? candidates.filter((c) => !same(c, total)) : [];
  const near = (a: number, b: number) => Math.abs(a / b - 1) <= (mixed ? WEIGHT_BASED_TOLERANCE : EXACT);
  if (total && parts.length > 0 && near(sum(parts), total.f.low)) return bolus ? parted(parts, total.stated) : { state: "ok", dose: total.stated };
  return { state: "several", doses: distinct.map((c) => c.stated) };
}

/** The dose of an order: an amount (or a range) as stated, with the route. */
function doseOf(s: Stated | null, route: OrderedDose["route"]): OrderedDose | null {
  const d: OrderedDose = { ...(s ? { amount: s.amount, ...(s.upTo != null ? { upTo: s.upTo } : {}), unit: s.unit } : {}), ...(route ? { route } : {}) };
  return d.amount != null || d.route != null ? d : null;
}

/** What a lab word's medicine is called in an item's name or aliases (`LabNumber`: "potassium 40 IV" for a KCl order). */
const ANALYTE_NAMES: Record<LabAnalyte, RegExp> = {
  potassium: /potassium|\bkcl\b|\bk\+|钾/iu,
  sodium: /sodium|\bnacl\b|saline|钠|盐水/iu,
  glucose: /glucose|dextrose|葡萄糖/iu,
  lactate: /lactate|hartmann|乳酸/iu,
};

/** Every name and alias of an item, in any language. */
function itemWords(iv: Partial<Pick<Intervention, "name" | "aliases">>): string[] {
  const all = (x: unknown): string[] => (typeof x === "string" ? [x] : Array.isArray(x) ? x.flatMap(all) : x && typeof x === "object" ? Object.values(x).flatMap(all) : []);
  return [...all(iv.name), ...all(iv.aliases)];
}

/**
 * What an order as written comes to against an intervention's preset (`interventions[].doseSpec`; the reducer's one
 * rule, docs/PROTOCOL.md §3.2). The words are the order: the engine reads them itself (`readOrder`) — a client's dose
 * (`order.dose`) adds only a route the words name (a choice between two). Without a preset: `given`, unchecked. With
 * one:
 * - a dose that cannot be read (a broken number, "50 000", "20G", a unit no preset is counted in): a `query`.
 * - the doses stated, each against its part — a single dose against `amount`–`upTo`, a rate against `maintenance` (or
 *   against the preset when it is itself a rate; an amount over a stated time as its rate): the part's dose (one, a
 *   range within it, a total stated beside the parts that add up to it) is given; another dose, or a range wholly
 *   above or below, is a dose error (`conflict`, `doseErrorSeverity`); a range across its ends, or several doses that
 *   disagree (`several`), are asked about. A dose given in parts (`bolus`): the whole, or its parts (the first its
 *   bolus), or the bolus with the infusion's rate, is given; a part alone — the bolus, or the rest — is asked about
 *   (`partial`); an amount over a stated time is also checked as a rate against the infusion's.
 * - a later dose after "then" at a frequency (`then`: "300 mg now, then 75 mg daily") is the regimen's maintenance,
 *   not the order's dose: only one above the preset is a dose error.
 * - a daily total that is the order's only dose ("每日2g", "20 g/day"): the preset's dose (once daily) is given, a
 *   tenfold slip is a dose error, anything else is asked about (`total`); so is a dose per m².
 * - no dose that can be compared: a dose the words state but that cannot be (a number with no unit — also one after
 *   the name of the medicine ordered when it is a lab word, "potassium 40 IV" —, a count of tablets, a volume without
 *   its strength, a dose per kg without the weight, a rate for a single dose) is a `query`; else the route alone is
 *   compared — a conflicting route is a dose error, otherwise `given`.
 */
export function checkOrder(order: WrittenOrder, iv: Pick<Intervention, "doseSpec" | "critical" | "risk"> & Partial<Pick<Intervention, "name" | "kind" | "dose" | "aliases">>, weightKg?: number): OrderCheck {
  const reading = readOrder(order.text);
  // the client's route only where the words name it (a choice between "IV or IM"); the amount is the words' to state
  const route = (order.dose?.route != null && reading.routes.includes(order.dose.route) ? order.dose.route : null) ?? reading.route ?? undefined;
  const preset = iv.doseSpec;
  if (!preset) {
    const read = readingDose(reading);
    return { outcome: "given", dose: doseOf(read?.amount != null ? { amount: read.amount, ...(read.upTo != null ? { upTo: read.upTo } : {}), unit: read.unit! } : null, route), checked: false };
  }
  const weight = weightKg != null && weightKg > 0 ? weightKg : null;
  const routeOnly = doseOf(null, route);
  // a dose the words state with a unit, but that cannot be read: asked, whatever else they state
  const hard = reading.unclears.find((u) => u.reason === "unreadable" || u.reason === "unit");
  if (hard) return { outcome: "query", reason: hard.reason, words: hard.words, dose: routeOnly };
  const ranges = reading.unclears.filter((u) => u.reason === "range");
  const rangeWords = (m: DoseMention) => (ranges.length === 1 ? ranges[0]!.words : partText(m.volume ?? m));

  // each dose stated, against the part of the preset it is a dose of; a later dose at a frequency is the regimen's
  const rateMain = unitParts(preset.unit).rate;
  const own = reading.mentions.filter((m) => !m.then);
  const doses: Candidate[] = [];
  const rates: Candidate[] = [];
  const overRates: Candidate[] = [];
  const incomparable: { reason: IncomparableDoseReason; stated: Stated }[] = [];
  const place = (m: DoseMention, stated: Stated, part: Pick<DosePart, "amount" | "upTo" | "unit">, into: Candidate[]) => {
    const f = frame(stated, part, weight);
    if (typeof f === "string") incomparable.push({ reason: f, stated });
    else into.push({ mention: m, stated, f });
  };
  for (const m of own) {
    const isRate = unitParts(m.unit).rate;
    if (rateMain) {
      const asRateOf = isRate ? statedOf(m) : asRate(m);
      if (asRateOf) place(m, asRateOf, preset, rates);
      else incomparable.push({ reason: "rate", stated: statedOf(m) });
    } else if (!isRate) {
      place(m, statedOf(m), preset, doses);
      // an amount over a stated time is also the infusion's rate ("64.8 mg over 60 min" → 64.8 mg/h)
      const r = preset.maintenance ? asRate(m) : null;
      if (r) {
        const f = frame(r, preset.maintenance!, weight);
        if (typeof f !== "string") overRates.push({ mention: m, stated: r, f });
      }
    } else if (preset.maintenance) place(m, statedOf(m), preset.maintenance, rates);
    else incomparable.push({ reason: "rate", stated: statedOf(m) });
  }
  const wholeFrame = (c: Candidate[]) => (c[0] ? c[0].f : null);
  const bolus = preset.bolus ? (s: Stated) => frame(s, preset.bolus!, weight) : null;
  const dose = rateMain ? ({ state: "absent" } as const) : partVerdict(doses, wholeFrame(doses), bolus, rangeWords);
  const rate = partVerdict(rates, wholeFrame(rates), null, rangeWords);

  const routeConflicts: DoseConflict[] = route != null && preset.route != null && route !== preset.route ? ["route"] : [];
  const conflict = (stated: Stated | null, ratio: number | null, far: number | null, amount: boolean): OrderCheck => {
    const conflicts: DoseConflict[] = [...(amount ? (["amount"] as const) : []), ...routeConflicts];
    return { outcome: "conflict", dose: doseOf(stated, route)!, ratio, conflicts, severity: doseErrorSeverity(ratio, conflicts, iv, far) };
  };
  const given = (stated: Stated | null): OrderCheck => (routeConflicts.length ? conflict(stated, stated ? 1 : null, stated ? 1 : null, false) : { outcome: "given", dose: doseOf(stated, route), checked: true });
  // an amount over a stated time whose rate is not the infusion's ("7.2 mg bolus, then 648 mg over 60 min"), when the
  // parts do not already make the preset's dose: a dose error
  const overMismatch = dose.state === "ok" ? undefined : overRates.map((c) => ({ c, m: measure(c.f, c.f.low) })).find((x) => !x.m.equivalent);
  if (dose.state === "mismatch") return conflict(dose.dose, dose.ratio, dose.far, true);
  if (overMismatch) return conflict(overMismatch.c.stated, overMismatch.m.ratio, overMismatch.m.far, true);
  for (const v of [dose, rate]) if (v.state === "several") return { outcome: "query", reason: "several", words: v.doses.map((d) => partText(d)).join(", "), dose: routeOnly };
  for (const v of [dose, rate]) if (v.state === "range") return { outcome: "query", reason: "range", words: v.words, dose: routeOnly };
  if (rate.state === "mismatch") return conflict(rate.dose, rate.ratio, rate.far, true);
  // the regimen's later doses ("then 75 mg daily", "之后每日100mg"): one above the preset is a dose error (a maintenance
  // below it is the regimen's own: unchecked)
  if (own.length > 0 && !rateMain) {
    const later = [...reading.mentions.filter((m) => m.then).map(statedOf), ...reading.totals.filter((x) => x.per === "day" && x.upTo == null).map((x): Stated => ({ amount: x.amount, unit: x.unit }))];
    for (const stated of later) {
      const f = frame(stated, preset, weight);
      if (typeof f === "string") continue;
      const m = measure(f, f.low);
      if (!m.equivalent && m.ratio > 1) return conflict(stated, m.ratio, m.far, true);
    }
  }
  if (dose.state === "ok") return given(dose.dose);
  // a dose given in parts: the bolus with the infusion's rate is the whole; a part alone is asked about
  if (dose.state === "partial") return rate.state === "ok" ? given(dose.dose) : { outcome: "query", reason: "partial", words: null, dose: doseOf(dose.dose, route) };
  if (rate.state === "ok") return preset.bolus ? { outcome: "query", reason: "partial", words: null, dose: doseOf(rate.dose, route) } : given(rate.dose);
  // nothing that could be compared: why not (a dose the words state that cannot be read or compared), else the route
  if (incomparable.length > 0) return { outcome: "query", reason: incomparable[0]!.reason, words: null, dose: doseOf(incomparable[0]!.stated, route) };
  // only a daily total, or a dose per m²: a once-daily dose that is the preset's is given, a tenfold slip is a dose error
  if (own.length === 0 && reading.totals.length > 0) return totalCheck(reading.totals[0]!, preset, weight, given, conflict, routeOnly);
  const soft = reading.unclears.find((u) => u.reason === "no-unit" || u.reason === "count");
  if (soft) return { outcome: "query", reason: soft.reason, words: soft.words, dose: routeOnly };
  // a number with no unit after the medicine's own lab word ("potassium 40 IV" for potassium): its dose, or a lab value?
  const names = itemWords(iv);
  const lab = reading.labNumbers.find((x) => names.some((name) => ANALYTE_NAMES[x.analyte].test(name)));
  if (lab) return { outcome: "query", reason: "no-unit", words: lab.words, dose: routeOnly };
  return given(null);
}

/**
 * An order whose only dose is a daily total or a dose per m²: a daily total that is the preset's dose (a once-daily
 * dose) is given; one ten times the preset or more, or a tenth or less, is a dose error; anything else — a dose per m²,
 * a total that may be several doses a day — is asked about (`total`).
 */
function totalCheck(total: DoseTotal, preset: DoseSpec, weight: number | null, given: (s: Stated) => OrderCheck, conflict: (s: Stated, ratio: number, far: number, amount: boolean) => OrderCheck, routeOnly: OrderedDose | null): OrderCheck {
  const ask: OrderCheck = { outcome: "query", reason: "total", words: total.words, dose: routeOnly };
  if (total.per !== "day" || total.upTo != null) return ask;
  const stated: Stated = { amount: total.amount, unit: total.unit };
  const f = frame(stated, preset, weight);
  if (typeof f === "string") return ask;
  const m = measure(f, f.low);
  if (m.equivalent) return given(stated);
  const tenfold = (x: number) => x >= TENFOLD || x <= 1 / TENFOLD;
  return tenfold(m.ratio) || tenfold(m.far) ? conflict(stated, m.ratio, m.far, true) : ask;
}

export type { DoseMention, OrderReading };
