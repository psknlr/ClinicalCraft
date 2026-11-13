/**
 * Doses (docs/CASE_AUTHORING.md §6, docs/PROTOCOL.md §3.2): an order's dose against an intervention's preset
 * (`interventions[].doseSpec`) after unit conversion, how serious a conflict is, and what an order as written comes
 * to (`checkOrder`: given, asked about, or a dose error). Reading the words is `dose-read.ts`. Pure: no I/O, no clock.
 */
import type { Intervention } from "../schema/case.js";
import type { DoseQuantity, DoseSpec, DoseUnit, OrderedDose } from "../schema/common.js";
import type { DoseConflict, WrittenOrder } from "../schema/session.js";
import { readingDose, readOrder, type DoseMention, type OrderReading, type UnclearDoseReason } from "./dose-read.js";

/** A ratio this far from 1 — ×10 or more, ÷10 or more — is a tenfold error: always critical. */
export const TENFOLD = 10;
/**
 * How far an amount may be from a weight-based dose converted through the patient's weight (either way round) and
 * still be the same dose: weight-based doses are rounded in practice (15 mg/kg at 23 kg is given as 350 mg).
 */
export const WEIGHT_BASED_TOLERANCE = 0.1;
/** Relative tolerance of every other comparison: floating point only (500 microgram is 0.5 mg exactly). */
const EXACT = 1e-9;

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

/** How an order's dose compares with a preset (`compareDose`). */
export interface DoseComparison {
  /** Nothing conflicts: the order is the preset dose. */
  equivalent: boolean;
  /**
   * The ordered amount over the preset's after conversion — over the nearer end of a preset range, 1 inside it. Null
   * when the order states no amount or its unit cannot be compared with the preset's.
   */
  ratio: number | null;
  /** What conflicts (empty when equivalent). */
  conflicts: DoseConflict[];
}

/**
 * Compare an order's dose with a preset. Amounts are converted to a common unit: g, mg and microgram into one
 * another, per minute into per hour, and a dose per kg into an absolute one through `weightKg` (the case's
 * `patient.weightKg`; then within `WEIGHT_BASED_TOLERANCE`). A volume, units and millimoles compare only with
 * themselves — a volume is never read as a mass (the concentration is not known) — and a dose with a rate only with
 * a rate: anything else is a `unit` conflict. An amount within `[amount, upTo]` is the preset's; outside it is an
 * `amount` conflict. Routes conflict when both are stated and differ. A dose that states nothing conflicts with nothing.
 */
export function compareDose(ordered: OrderedDose, preset: DoseSpec, weightKg?: number): DoseComparison {
  const conflicts: DoseConflict[] = [];
  let ratio: number | null = null;
  if (ordered.amount != null && ordered.unit != null) {
    const o = unitParts(ordered.unit);
    const p = unitParts(preset.unit);
    const weight = weightKg != null && weightKg > 0 ? weightKg : null;
    if (o.dimension !== p.dimension || o.rate !== p.rate || (o.perKg !== p.perKg && weight == null)) conflicts.push("unit");
    else {
      // both per kg, or both absolute; else the one per kg is made absolute through the weight
      const mixed = o.perKg !== p.perKg;
      const scale = (perKg: boolean) => (mixed && perKg ? weight! : 1);
      const value = ordered.amount * o.factor * scale(o.perKg);
      const low = preset.amount * p.factor * scale(p.perKg);
      const high = (preset.upTo ?? preset.amount) * p.factor * scale(p.perKg);
      ratio = tidy(value < low ? value / low : value > high ? value / high : 1);
      const tolerance = mixed ? WEIGHT_BASED_TOLERANCE : EXACT;
      if (Math.abs(ratio - 1) > tolerance) conflicts.push("amount");
    }
  }
  if (ordered.route != null && preset.route != null && ordered.route !== preset.route) conflicts.push("route");
  return { equivalent: conflicts.length === 0, ratio, conflicts };
}

/** For a `critical` or high-risk intervention, an order at least this many times the preset is a critical dose error. */
export const TWOFOLD = 2;

/**
 * How serious a dose error is (docs/PROTOCOL.md §3.2): `critical` for a tenfold difference, either way (ratio ≥ 10 or
 * ≤ 0.1), for any medicine; and, for an intervention that is `critical` or high-risk, also for an order at least twice
 * the preset (ratio ≥ 2) or by another route. Every other conflict is a `warning` — a rounding or weight-band
 * difference, or an under-dose of a high-risk drug that is not tenfold: the order is still not given, and the dose
 * error stays for the debrief, but it never fails the safety outcome. Critical dose errors fail it.
 */
export function doseErrorSeverity(ratio: number | null, conflicts: readonly DoseConflict[], intervention: Pick<Intervention, "critical" | "risk">): "warning" | "critical" {
  if (ratio != null && (ratio >= TENFOLD || ratio <= 1 / TENFOLD)) return "critical";
  const dangerous = intervention.critical === true || intervention.risk === "high";
  if (!dangerous) return "warning";
  return conflicts.includes("route") || (conflicts.includes("amount") && ratio != null && ratio >= TWOFOLD) ? "critical" : "warning";
}

/** A dose in words, technical (units as the schema writes them): "0.5 mg IM", "10–20 mg IV", "IV". */
export function formatDose(d: OrderedDose | DoseSpec): string {
  const upTo = "upTo" in d && d.upTo != null && d.upTo !== d.amount ? `–${d.upTo}` : "";
  const amount = d.amount != null && d.unit != null ? `${d.amount}${upTo} ${d.unit}` : "";
  return [amount, d.route ?? ""].filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* An order as written against the preset                              */
/* ------------------------------------------------------------------ */

/**
 * Why an order's dose is asked about rather than checked: its words cannot be read (`dose-read.ts`: `unreadable`,
 * `range`, `no-unit`), or the dose read cannot be compared with the preset — a volume, or another measure, whose
 * strength the order does not state (`strength`); a dose per kg against an absolute one, or the reverse, without the
 * patient's weight (`weight`); a rate against a single dose, or the reverse (`rate`).
 */
export type DoseQueryReason = UnclearDoseReason | IncomparableDoseReason;

/** Why a dose read cannot be compared with the preset (`DoseQueryReason`). */
export type IncomparableDoseReason = "strength" | "weight" | "rate";

/** Why a dose with an amount cannot be compared with the preset: a rate against a single dose, the weight, or the strength. */
function incomparable(dose: OrderedDose, preset: DoseSpec): IncomparableDoseReason {
  const o = unitParts(dose.unit!);
  const p = unitParts(preset.unit);
  if (o.rate !== p.rate) return "rate";
  return o.dimension === p.dimension && o.perKg !== p.perKg ? "weight" : "strength";
}

/** What an order as written comes to (`checkOrder`). */
export type OrderCheck =
  /** Given: the dose read is the preset's, or the order states none (the preset); `checked` false without a preset. */
  | { outcome: "given"; dose: OrderedDose | null; checked: boolean }
  /**
   * Not given and not a dose error: the nurse asks — the dose cannot be read (`words`), is a range, has no unit, or is
   * in a unit the preset's cannot be compared with (`dose`): without the strength or the weight, or a rate against a
   * single dose.
   */
  | { outcome: "query"; reason: DoseQueryReason; words: string | null; dose: OrderedDose | null }
  /** Not given: the amount or the route conflicts with the preset — a dose error (`severity`, `doseErrorSeverity`). */
  | { outcome: "conflict"; dose: OrderedDose; ratio: number | null; conflicts: DoseConflict[]; severity: "warning" | "critical" };

const same = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * A dose a client read that its words state (an amount the words give, as written or as the volume converted; a route
 * the words name) — else null: the words are the order, and a dose they do not state is not believed.
 */
function statedBy(dose: OrderedDose, reading: OrderReading): OrderedDose | null {
  const amountOk =
    dose.amount == null ||
    reading.mentions.some((m) => m.upTo == null && ((m.unit === dose.unit && same(m.amount, dose.amount!)) || (m.volume != null && m.volume.unit === dose.unit && same(m.volume.amount, dose.amount!))));
  const routeOk = dose.route == null || reading.routes.includes(dose.route);
  return amountOk && routeOk ? dose : null;
}

/** Another reading of the same words, against the preset (`checkOrder`). */
function otherReading(reading: OrderReading, stated: OrderedDose, preset: DoseSpec, weightKg?: number): { dose: OrderedDose; comparison: DoseComparison } | null {
  const shape = (u: DoseUnit) => unitParts(u);
  const s = shape(stated.unit!);
  const p = shape(preset.unit);
  const route = stated.route != null ? { route: stated.route } : {};
  const single = reading.mentions.filter((m) => m.upTo == null);
  // a dose of another form than the preset's (a bolus and a rate, a volume and a mass): the dose the words give in the
  // preset's form ("heparin 5000 units bolus then 1000 units/h" against a rate)
  if (s.dimension !== p.dimension || s.rate !== p.rate) {
    const m = single.find((x) => shape(x.unit).dimension === p.dimension && shape(x.unit).rate === p.rate);
    if (m) {
      const dose: OrderedDose = { amount: m.amount, unit: m.unit, ...route };
      return { dose, comparison: compareDose(dose, preset, weightKg) };
    }
    return null;
  }
  // a dose split in parts ("alteplase 7.2 mg bolus then 64.8 mg over 60 min"): their total, when it is the preset's
  const parts = single.filter((x) => {
    const q = shape(x.unit);
    return q.dimension === s.dimension && q.rate === s.rate && q.perKg === s.perKg;
  });
  if (parts.length < 2 || s.rate) return null;
  const base = unitParts(stated.unit!).factor;
  const total = tidy(parts.reduce((sum, x) => sum + (x.amount * unitParts(x.unit).factor) / base, 0));
  const dose: OrderedDose = { amount: total, unit: stated.unit!, ...route };
  const comparison = compareDose(dose, preset, weightKg);
  return comparison.equivalent ? { dose, comparison } : null;
}

/**
 * What an order as written comes to against an intervention's preset (`interventions[].doseSpec`; the reducer's one
 * rule, docs/PROTOCOL.md §3.2). The dose is the client's (`order.dose`) when the words state it, else what the words
 * state (`readOrder`) — so a client that sends no dose, or one its words do not state, never hides the dose written.
 * Without a preset: `given`, unchecked. With one:
 * - no amount stated: a dose the words state but that cannot be read (a fraction, "0。5", a range, a number with no
 *   unit…) is a `query`; else the route alone is compared — a conflicting route is a dose error, otherwise `given`.
 * - an amount: equivalent → `given` with it. Otherwise another reading of the same words that is equivalent is taken —
 *   the dose in the preset's form when the order's first is another (a bolus and a rate, a volume and a mass), or the
 *   total of a dose given in parts ("7.2 mg bolus then 64.8 mg"). Still conflicting: an amount or route conflict is a
 *   dose error (`conflict`, `doseErrorSeverity`); a unit that cannot be compared (a volume of unknown strength, a dose
 *   per kg without the weight, a rate against a single dose) is a `query`.
 */
export function checkOrder(order: WrittenOrder, iv: Pick<Intervention, "doseSpec" | "critical" | "risk">, weightKg?: number): OrderCheck {
  const reading = readOrder(order.text);
  const read = readingDose(reading);
  const client = order.dose ? statedBy(order.dose, reading) : null;
  // the client's reading (an amount it chose among the words', a route) first; what it leaves out, from the words
  const amount = client?.amount != null ? { amount: client.amount, unit: client.unit! } : read?.amount != null ? { amount: read.amount, unit: read.unit! } : {};
  const route = client?.route ?? read?.route;
  const stated: OrderedDose | null = amount.amount != null || route != null ? { ...amount, ...(route ? { route } : {}) } : null;
  const preset = iv.doseSpec;
  if (!preset) return { outcome: "given", dose: stated, checked: false };
  if (stated?.amount == null) {
    if (reading.unclear) return { outcome: "query", reason: reading.unclear.reason, words: reading.unclear.words, dose: stated };
    const cmp = stated ? compareDose(stated, preset, weightKg) : null;
    if (stated && cmp && !cmp.equivalent) return { outcome: "conflict", dose: stated, ratio: cmp.ratio, conflicts: cmp.conflicts, severity: doseErrorSeverity(cmp.ratio, cmp.conflicts, iv) };
    return { outcome: "given", dose: stated, checked: true };
  }
  const cmp = compareDose(stated, preset, weightKg);
  if (cmp.equivalent) return { outcome: "given", dose: stated, checked: true };
  const other = otherReading(reading, stated, preset, weightKg);
  if (other?.comparison.equivalent) return { outcome: "given", dose: other.dose, checked: true };
  const [dose, c] = other ? [other.dose, other.comparison] : [stated, cmp];
  if (c.conflicts.some((x) => x !== "unit")) return { outcome: "conflict", dose, ratio: c.ratio, conflicts: c.conflicts, severity: doseErrorSeverity(c.ratio, c.conflicts, iv) };
  return { outcome: "query", reason: incomparable(dose, preset), words: null, dose };
}

export type { DoseMention };
