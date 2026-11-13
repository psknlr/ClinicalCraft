/**
 * Prescriptions as versioned, executable records (docs/PRESCRIPTIONS.md): the versions signed in an encounter, the
 * dispensary's reviews, the supply put together at the dispensing device and what was supplied. Pure and
 * deterministic — the same actions replay to the same record.
 *
 * - **Versions.** Signing a formulation makes the next version of its prescription and supersedes the one before.
 *   The same request key again is the same version.
 * - **Review.** The findings are computed here, from the data (stock on hand, a line's unit and dose against its
 *   product, a product named twice) and from the case's review rules as they apply now — never supplied by the
 *   caller. No findings: the version is confirmed.
 * - **Supply.** Only the current version, confirmed, is prepared and dispensed. What was supplied is compared with
 *   the version line by line (a look-alike picked, a line left out, a label not checked or printed otherwise): every
 *   difference is a recorded discrepancy.
 * - **Refusals.** An attempt refused for a clinical reason — a formulation that may not be signed yet, an earlier or
 *   unreviewed version, a second supply, a pick the shelf cannot cover — is recorded with its reason (`refusals`) and
 *   changes nothing else, so an intercepted error stays apart from what was done.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { PrescriptionPredicate, PrescriptionStatus } from "../schema/common.js";
import type {
  Dispensing,
  Formulation,
  MedicinalProduct,
  Preparation,
  PrescriptionDefinition,
  PrescriptionOp,
  PrescriptionRecord,
  PrescriptionRefusal,
  PrescriptionVersion,
  ReviewFinding,
  SuppliedLine,
  SupplyDeviation,
  SupplyDiscrepancy,
  VersionStatus,
} from "../schema/prescription.js";
import type { SessionState } from "../schema/session.js";
import { t } from "../i18n.js";
import { evaluate } from "./conditions.js";

type Bi = { en: string; "zh-CN": string };

const both = (text: unknown): Bi => {
  if (typeof text === "string") return { en: text, "zh-CN": text };
  const r = (text ?? {}) as Record<string, string>;
  return { en: r.en ?? r["zh-CN"] ?? "", "zh-CN": r["zh-CN"] ?? r.en ?? "" };
};

const round = (v: number) => Math.round(v * 1000) / 1000;

/** The case's prescription of `id`, or undefined. */
export function prescriptionDef(c: CaseDefinition, id: string): PrescriptionDefinition | undefined {
  return (c.prescriptions ?? []).find((p) => p.id === id);
}

/** A product of a prescription, or undefined. */
export function medicinalProduct(def: PrescriptionDefinition, id: string): MedicinalProduct | undefined {
  return def.products.find((p) => p.id === id);
}

/** A formulation of a prescription, or undefined. */
export function formulationOf(def: PrescriptionDefinition, id: string): Formulation | undefined {
  return def.formulations.find((f) => f.id === id);
}

/** The quantity of a line's product one supply of the formulation takes: the daily dose over its days. */
export function quantityNeeded(formulation: Formulation, line: { dose: number }): number {
  return round(line.dose * formulation.days);
}

const stockKey = (prescription: string, product: string) => `${prescription}:${product}`;

/** An empty record with the stock every product of every prescription starts with. */
function emptyRecord(c: CaseDefinition): PrescriptionRecord {
  const stock: Record<string, number> = {};
  for (const def of c.prescriptions ?? []) for (const p of def.products) if (p.stock) stock[stockKey(def.id, p.id)] = p.stock.quantity;
  return { versions: [], preparations: [], dispensings: [], refusals: [], stock };
}

/** Stock of a product that can be supplied now: on hand, none when the batch has expired; null when it is not tracked. */
export function stockOnHand(c: CaseDefinition, s: SessionState, def: PrescriptionDefinition, product: MedicinalProduct): number | null {
  if (!product.stock) return null;
  if (product.stock.expired) return 0;
  return s.prescriptions?.stock[stockKey(def.id, product.id)] ?? product.stock.quantity;
}

/** The versions of a prescription, oldest first. */
export function prescriptionVersions(s: SessionState, prescription: string): PrescriptionVersion[] {
  return (s.prescriptions?.versions ?? []).filter((v) => v.prescription === prescription);
}

/** The current version of a prescription: the latest one, not superseded (undefined: nothing signed). */
export function currentVersion(s: SessionState, prescription: string): PrescriptionVersion | undefined {
  return prescriptionVersions(s, prescription).findLast((v) => v.supersededBy == null);
}

function statusIn(r: PrescriptionRecord, v: PrescriptionVersion): VersionStatus {
  if (v.supersededBy != null) return "superseded";
  if (r.dispensings.some((d) => d.prescription === v.prescription && d.version === v.n)) return "dispensed";
  if (r.preparations.some((p) => p.prescription === v.prescription && p.version === v.n)) return "preparing";
  const review = v.reviews.at(-1);
  if (!review) return "submitted";
  return review.findings.length ? "queried" : "confirmed";
}

/** Where a version stands (see `VersionStatus`). */
export function versionStatus(s: SessionState, v: PrescriptionVersion): VersionStatus {
  return s.prescriptions ? statusIn(s.prescriptions, v) : "submitted";
}

/** A prescription's status: its current version's (`none`: nothing signed). */
export function prescriptionStatus(s: SessionState, prescription: string): PrescriptionStatus {
  const v = currentVersion(s, prescription);
  return v && s.prescriptions ? (statusIn(s.prescriptions, v) as PrescriptionStatus) : "none";
}

/**
 * What the dispensary's review of a version finds **now** (docs/PRESCRIPTIONS.md §3): from the data — a product
 * named twice, a line whose unit is not its product's, a daily dose outside the product's usual range, stock on hand
 * short of the supply (an expired batch counts as none) — and from the case's review rules that apply (a rule's
 * products named by the version — at its `minDose` or more —, its `formulations` including the version's, its `when`
 * holding). Empty: the version can be confirmed.
 */
export function reviewFindings(c: CaseDefinition, s: SessionState, def: PrescriptionDefinition, formulation: Formulation): ReviewFinding[] {
  const out: ReviewFinding[] = [];
  const seen = new Set<string>();
  const doubled = new Set<string>();
  for (const line of formulation.lines) {
    const product = medicinalProduct(def, line.product);
    if (!product) continue;
    const name = both(product.name);
    if (seen.has(product.id)) {
      if (!doubled.has(product.id)) out.push({ kind: "duplicate", product: product.id, text: { en: `${name.en} is on the prescription twice.`, "zh-CN": `${name["zh-CN"]}在处方中重复出现。` } });
      doubled.add(product.id);
      continue;
    }
    seen.add(product.id);
    if (line.unit !== product.unit) {
      out.push({ kind: "unit", product: product.id, text: { en: `${name.en} is prescribed in ${line.unit}; it is dispensed in ${product.unit}.`, "zh-CN": `${name["zh-CN"]}处方单位为 ${line.unit}，调剂单位为 ${product.unit}。` } });
      continue;
    }
    if (product.usualDose && (line.dose < product.usualDose[0] || line.dose > product.usualDose[1])) {
      const [low, high] = product.usualDose;
      out.push({ kind: "dose", product: product.id, text: { en: `${name.en} ${line.dose} ${line.unit} a day is outside the usual ${low}–${high} ${product.unit} a day.`, "zh-CN": `${name["zh-CN"]}每日 ${line.dose} ${line.unit}，超出常用量每日 ${low}–${high} ${product.unit}。` } });
    }
    const onHand = stockOnHand(c, s, def, product);
    const needed = quantityNeeded(formulation, line);
    if (onHand != null && onHand < needed) {
      const why = product.stock?.expired ? { en: "the batch on hand has expired", "zh-CN": "现有批次已过期" } : { en: `${onHand} ${product.unit} on hand, ${needed} ${product.unit} needed`, "zh-CN": `现有 ${onHand} ${product.unit}，需要 ${needed} ${product.unit}` };
      const note = product.stock?.note ? both(product.stock.note) : null;
      out.push({ kind: "stock", product: product.id, text: { en: `${name.en}: ${why.en}.${note ? ` ${note.en}` : ""}`, "zh-CN": `${name["zh-CN"]}：${why["zh-CN"]}。${note ? note["zh-CN"] : ""}` } });
    }
  }
  for (const rule of def.review) {
    if (rule.formulations && !rule.formulations.includes(formulation.id)) continue;
    if (rule.products && !formulation.lines.some((l) => rule.products!.includes(l.product) && (rule.minDose == null || l.dose >= rule.minDose))) continue;
    if (rule.when && !evaluate(c, s, rule.when)) continue;
    out.push({ kind: rule.kind, rule: rule.id, text: both(rule.text) });
  }
  return out;
}

/**
 * The authored supply deviation that applies to this formulation as the dispensary supplies it now (undefined: none;
 * never for a learner's supply). It is what the dispensary gets wrong however its steps are recorded — at once, or one
 * by one at the device: the substituted products are what is supplied, the label is printed as authored, and the
 * label was not checked (that is how it got out).
 */
export function supplyDeviation(c: CaseDefinition, s: SessionState, def: PrescriptionDefinition, formulation: Formulation): SupplyDeviation | undefined {
  if (def.dispensedBy !== "staff") return undefined;
  return def.deviations.find((d) => d.formulation === formulation.id && (!d.when || evaluate(c, s, d.when)));
}

export type PrescriptionResult =
  | { ok: true; record: PrescriptionRecord; changed: boolean; version?: number; refused?: PrescriptionRefusal; findings?: number; discrepancies?: number }
  | { ok: false; code: "invalid" | "unknown-id" | "requirements-unmet"; message: string };

const sameFindings = (a: readonly ReviewFinding[], b: readonly ReviewFinding[]) => a.length === b.length && a.every((f, i) => f.kind === b[i]!.kind && f.rule === b[i]!.rule && f.product === b[i]!.product);

/**
 * Apply one prescription op (pure): the new record, or why the request itself is wrong (an unknown id, nothing to act
 * on). `changed: false`: a repeated request — nothing new. `refused`: the attempt was refused for a clinical reason
 * and recorded as such; nothing else changed.
 */
export function applyPrescription(c: CaseDefinition, s: SessionState, op: PrescriptionOp): PrescriptionResult {
  const def = prescriptionDef(c, op.prescription);
  if (!def) return { ok: false, code: "unknown-id", message: `no prescription "${op.prescription}" in this case` };
  const r: PrescriptionRecord = s.prescriptions ? structuredClone(s.prescriptions) : emptyRecord(c);
  const at = s.clock;
  const seq = s.seq + 1;
  const versions = r.versions.filter((v) => v.prescription === def.id);
  const current = versions.findLast((v) => v.supersededBy == null);
  const version = (n: number) => versions.find((v) => v.n === n);
  const refuse = (what: Omit<PrescriptionRefusal, "prescription" | "by" | "at" | "seq">): PrescriptionResult => {
    const refusal: PrescriptionRefusal = { prescription: def.id, ...what, by: op.by, at, seq };
    r.refusals.push(refusal);
    return { ok: true, record: r, changed: true, refused: refusal, ...(what.version != null ? { version: what.version } : {}) };
  };
  /** Why this version cannot be supplied now (null: it can). */
  const supplyBlock = (v: PrescriptionVersion): Pick<PrescriptionRefusal, "code" | "reason"> | null => {
    if (v.supersededBy != null) return { code: "not-current", reason: `version ${v.n} was superseded by version ${v.supersededBy}: only the current version is supplied` };
    if (r.dispensings.some((d) => d.prescription === def.id && d.version === v.n)) return { code: "already-dispensed", reason: `version ${v.n} has been supplied: a further supply needs a new version` };
    const review = v.reviews.at(-1);
    if (!review) return { code: "not-reviewed", reason: `version ${v.n} has not been reviewed by the dispensary` };
    if (review.findings.length) return { code: "queried", reason: `the dispensary's query on version ${v.n} is open` };
    return null;
  };
  const openPreparation = () => r.preparations.find((p) => p.prescription === def.id);

  switch (op.op) {
    case "submit": {
      const formulation = formulationOf(def, op.formulation);
      if (!formulation) return { ok: false, code: "unknown-id", message: `prescription "${def.id}" has no formulation "${op.formulation}"` };
      const same = r.versions.find((v) => v.key === op.key);
      if (same) return { ok: true, record: r, changed: false, version: same.n };
      if (formulation.signableWhen && !evaluate(c, s, formulation.signableWhen)) {
        return refuse({ op: "submit", formulation: formulation.id, code: "not-signable", reason: formulation.refusal ? t(formulation.refusal, "en") : `"${formulation.id}" cannot be signed at this point of the encounter` });
      }
      const n = versions.length + 1;
      if (current) {
        current.supersededBy = n;
        // a supply of the version before is no longer wanted
        r.preparations = r.preparations.filter((p) => !(p.prescription === def.id && p.version === current.n));
      }
      r.versions.push({ prescription: def.id, n, formulation: formulation.id, key: op.key, by: op.by, at, seq, reviews: [] });
      return { ok: true, record: r, changed: true, version: n };
    }
    case "review": {
      const v = version(op.version);
      if (!v) return { ok: false, code: "unknown-id", message: `prescription "${def.id}" has no version ${op.version}` };
      if (v.supersededBy != null) return { ok: false, code: "invalid", message: `version ${v.n} was superseded by version ${v.supersededBy}: there is nothing to review` };
      if (r.dispensings.some((d) => d.prescription === def.id && d.version === v.n)) return { ok: false, code: "invalid", message: `version ${v.n} has been supplied` };
      const findings = reviewFindings(c, s, def, formulationOf(def, v.formulation)!);
      const last = v.reviews.at(-1);
      if (last && sameFindings(last.findings, findings)) return { ok: true, record: r, changed: false, version: v.n, findings: findings.length };
      v.reviews.push({ by: op.by, at, seq, findings });
      return { ok: true, record: r, changed: true, version: v.n, findings: findings.length };
    }
    case "acknowledge": {
      const v = version(op.version);
      if (!v) return { ok: false, code: "unknown-id", message: `prescription "${def.id}" has no version ${op.version}` };
      const review = v.reviews.at(-1);
      if (!review) return { ok: false, code: "requirements-unmet", message: `version ${v.n} has no review to read yet` };
      // the record is read as it stands: the version's latest review, and every supply made so far
      const unread = r.dispensings.filter((d) => d.prescription === def.id && !d.read);
      const reviewRead = v.acknowledged != null && v.acknowledged.seq > review.seq;
      if (reviewRead && !unread.length) return { ok: true, record: r, changed: false, version: v.n };
      if (!reviewRead) v.acknowledged = { by: op.by, at, seq };
      for (const d of unread) d.read = { by: op.by, at, seq };
      return { ok: true, record: r, changed: true, version: v.n };
    }
    case "prepare": {
      const v = op.version != null ? version(op.version) : current;
      if (!v) return op.version != null ? { ok: false, code: "unknown-id", message: `prescription "${def.id}" has no version ${op.version}` } : { ok: false, code: "requirements-unmet", message: `nothing has been signed for "${def.id}"` };
      const block = supplyBlock(v);
      if (block) return refuse({ op: "prepare", version: v.n, ...block });
      const open = openPreparation();
      if (open?.version === v.n) return { ok: true, record: r, changed: false, version: v.n };
      r.preparations = r.preparations.filter((p) => p.prescription !== def.id);
      r.preparations.push({ prescription: def.id, version: v.n, by: op.by, ...(op.device ? { device: op.device } : {}), at, seq, picks: {} });
      return { ok: true, record: r, changed: true, version: v.n };
    }
    case "pick": {
      const prep = openPreparation();
      if (!prep) return refuse({ op: "pick", code: "not-prepared", reason: `no supply of "${def.id}" is being prepared: select the version first` });
      const formulation = formulationOf(def, version(prep.version)!.formulation)!;
      if (op.line == null) {
        // every line not picked yet, as prescribed
        const left = formulation.lines.filter((l) => !(l.product in prep.picks));
        if (!left.length) return { ok: true, record: r, changed: false, version: prep.version };
        for (const l of left) prep.picks[l.product] = l.product;
        delete prep.labelChecked;
        return { ok: true, record: r, changed: true, version: prep.version };
      }
      if (!formulation.lines.some((l) => l.product === op.line)) return refuse({ op: "pick", version: prep.version, code: "unknown-line", reason: `version ${prep.version} has no line "${op.line}"` });
      const product = op.product ?? op.line;
      if (!medicinalProduct(def, product)) return refuse({ op: "pick", version: prep.version, code: "unknown-product", reason: `the dispensary has no product "${product}"` });
      if (prep.picks[op.line] === product) return { ok: true, record: r, changed: false, version: prep.version };
      prep.picks[op.line] = product;
      // the label was checked against what lay there before
      delete prep.labelChecked;
      return { ok: true, record: r, changed: true, version: prep.version };
    }
    case "check-label": {
      const prep = openPreparation();
      if (!prep) return refuse({ op: "pick", code: "not-prepared", reason: `no supply of "${def.id}" is being prepared: there is no label to check` });
      const formulation = formulationOf(def, version(prep.version)!.formulation)!;
      const matches = supplyDiscrepancies(def, formulation, prep.picks, true, undefined).length === 0;
      prep.labelChecked = { at, seq, matches };
      return { ok: true, record: r, changed: true, version: prep.version, discrepancies: matches ? 0 : supplyDiscrepancies(def, formulation, prep.picks, true, undefined).length };
    }
    case "dispense": {
      const same = r.dispensings.find((d) => d.key === op.key);
      if (same) return { ok: true, record: r, changed: false, version: same.version };
      const prep = openPreparation();
      const v = op.version != null ? version(op.version) : prep ? version(prep.version) : current;
      if (!v) return op.version != null ? { ok: false, code: "unknown-id", message: `prescription "${def.id}" has no version ${op.version}` } : { ok: false, code: "requirements-unmet", message: `nothing has been signed for "${def.id}"` };
      const block = supplyBlock(v);
      if (block) return refuse({ op: "dispense", version: v.n, ...block });
      const formulation = formulationOf(def, v.formulation)!;
      const mine = prep?.version === v.n ? prep : undefined;
      // no supply prepared step by step: the dispensary's whole act — picked as prescribed, the label checked. Either
      // way, what the case authors the dispensary to get wrong is what it supplies
      const deviation = supplyDeviation(c, s, def, formulation);
      const substituted = (line: string) => deviation?.substitutions.find((x) => x.product === line)?.with;
      const picks: Record<string, string> = mine
        ? Object.fromEntries(Object.entries(mine.picks).map(([line, product]) => [line, substituted(line) ?? product]))
        : Object.fromEntries(formulation.lines.map((l) => [l.product, substituted(l.product) ?? l.product]));
      const labelChecked = deviation ? false : mine ? mine.labelChecked != null : true;
      const label = { frequency: both(deviation?.label?.frequency ?? formulation.frequency), dosesPerDay: deviation?.label?.dosesPerDay ?? formulation.dosesPerDay, days: deviation?.label?.days ?? formulation.days };
      const lines: SuppliedLine[] = formulation.lines.flatMap((l) => {
        const picked = picks[l.product];
        const product = picked ? medicinalProduct(def, picked) : undefined;
        if (!picked || !product) return [];
        return [{ line: l.product, product: picked, ...(product.stock?.batch ? { batch: product.stock.batch } : {}), quantity: quantityNeeded(formulation, l), unit: l.unit }];
      });
      // what the shelf cannot cover is not supplied (an expired batch is on the shelf: supplying it is a recorded error)
      const short = lines.find((line) => {
        const product = medicinalProduct(def, line.product);
        const key = stockKey(def.id, line.product);
        return !!product?.stock && !product.stock.expired && (r.stock[key] ?? product.stock.quantity) < line.quantity;
      });
      if (short) return refuse({ op: "dispense", version: v.n, code: "out-of-stock", reason: `not enough "${short.product}" on hand for version ${v.n} (${short.quantity} ${short.unit} needed)` });
      const discrepancies = supplyDiscrepancies(def, formulation, picks, labelChecked, deviation);
      for (const line of lines) {
        const key = stockKey(def.id, line.product);
        if (key in r.stock) r.stock[key] = Math.max(0, round(r.stock[key]! - line.quantity));
      }
      const dispensing: Dispensing = { prescription: def.id, version: v.n, key: op.key, by: op.by, ...((op.device ?? mine?.device) ? { device: op.device ?? mine?.device } : {}), at, seq, lines, label, labelChecked, discrepancies };
      r.dispensings.push(dispensing);
      r.preparations = r.preparations.filter((p) => p.prescription !== def.id);
      return { ok: true, record: r, changed: true, version: v.n, discrepancies: discrepancies.length };
    }
  }
}

/**
 * How a supply differs from its version: a line supplied with another product (`identity`), a line not supplied
 * (`omitted`), a batch that has expired (`expired`), a label printed otherwise (`label`) or not checked
 * (`label-unchecked`).
 */
function supplyDiscrepancies(def: PrescriptionDefinition, formulation: Formulation, picks: Readonly<Record<string, string>>, labelChecked: boolean, deviation: SupplyDeviation | undefined): SupplyDiscrepancy[] {
  const out: SupplyDiscrepancy[] = [];
  const name = (id: string) => both(medicinalProduct(def, id)?.name ?? id);
  for (const l of formulation.lines) {
    const picked = picks[l.product];
    const want = name(l.product);
    if (!picked) {
      out.push({ kind: "omitted", line: l.product, detail: { en: `${want.en} was not supplied.`, "zh-CN": `未调配${want["zh-CN"]}。` } });
      continue;
    }
    if (picked !== l.product) {
      const got = name(picked);
      out.push({ kind: "identity", line: l.product, detail: { en: `${got.en} was supplied where ${want.en} is prescribed.`, "zh-CN": `处方为${want["zh-CN"]}，实际调配${got["zh-CN"]}。` } });
    }
    if (medicinalProduct(def, picked)?.stock?.expired) {
      const got = name(picked);
      out.push({ kind: "expired", line: l.product, detail: { en: `The batch of ${got.en} supplied has expired.`, "zh-CN": `所调配的${got["zh-CN"]}批次已过期。` } });
    }
  }
  const printed = deviation?.label;
  if (printed && (printed.frequency != null || (printed.dosesPerDay != null && printed.dosesPerDay !== formulation.dosesPerDay) || (printed.days != null && printed.days !== formulation.days))) {
    const want = both(formulation.frequency);
    const got = both(printed.frequency ?? formulation.frequency);
    out.push({
      kind: "label",
      detail: {
        en: `The label reads “${got.en}” (${printed.dosesPerDay ?? formulation.dosesPerDay} a day for ${printed.days ?? formulation.days} days); the version says “${want.en}” (${formulation.dosesPerDay} a day for ${formulation.days} days).`,
        "zh-CN": `标签为“${got["zh-CN"]}”（每日${printed.dosesPerDay ?? formulation.dosesPerDay}次，共${printed.days ?? formulation.days}天）；处方为“${want["zh-CN"]}”（每日${formulation.dosesPerDay}次，共${formulation.days}天）。`,
      },
    });
  }
  if (!labelChecked && !printed) out.push({ kind: "label-unchecked", detail: { en: "The label was not checked against the prescription before the supply.", "zh-CN": "发药前未核对标签与处方。" } });
  return out;
}

/**
 * The version whose record the prescriber has not read as it stands — a review of the current version newer than their
 * last reading, or a supply not read yet (undefined: nothing new to read).
 */
export function unreadVersion(s: SessionState, prescription: string): PrescriptionVersion | undefined {
  const versions = prescriptionVersions(s, prescription);
  const current = versions.findLast((v) => v.supersededBy == null);
  const review = current?.reviews.at(-1);
  if (current && review && !(current.acknowledged && current.acknowledged.seq > review.seq)) return current;
  const supply = (s.prescriptions?.dispensings ?? []).findLast((d) => d.prescription === prescription && !d.read);
  return supply ? versions.find((v) => v.n === supply.version) : undefined;
}

/** The supply being put together for a prescription (undefined: none). */
export function openPreparation(s: SessionState, prescription: string): Preparation | undefined {
  return (s.prescriptions?.preparations ?? []).find((p) => p.prescription === prescription);
}

/** How a supply being prepared differs from its version so far (what a label check shows): empty — it matches. */
export function preparationDiscrepancies(c: CaseDefinition, s: SessionState, prescription: string): SupplyDiscrepancy[] {
  const def = prescriptionDef(c, prescription);
  const prep = openPreparation(s, prescription);
  const v = prep ? prescriptionVersions(s, prescription).find((x) => x.n === prep.version) : undefined;
  const formulation = def && v ? formulationOf(def, v.formulation) : undefined;
  return def && prep && formulation ? supplyDiscrepancies(def, formulation, prep.picks, true, undefined) : [];
}

/** `{ prescription: {…} }`: every given field holds for the named prescription — or, with no `id`, for one of the case's. */
export function evaluatePrescription(c: CaseDefinition, s: SessionState, p: PrescriptionPredicate): boolean {
  const ids = p.id != null ? [p.id] : (c.prescriptions ?? []).map((x) => x.id);
  const r = s.prescriptions;
  return ids.some((id) => {
    const versions = (r?.versions ?? []).filter((v) => v.prescription === id);
    const dispensings = (r?.dispensings ?? []).filter((d) => d.prescription === id);
    const refusals = (r?.refusals ?? []).filter((x) => x.prescription === id);
    const current = versions.findLast((v) => v.supersededBy == null);
    const formulationOfVersion = (n: number) => versions.find((v) => v.n === n)?.formulation;
    const given = Object.keys(p).filter((k) => k !== "id");
    if (!given.length) return versions.length > 0;
    if (p.status != null) {
      const now = prescriptionStatus(s, id);
      if (!(Array.isArray(p.status) ? p.status : [p.status]).includes(now)) return false;
    }
    if (p.current != null && current?.formulation !== p.current) return false;
    if (p.signed != null && !versions.some((v) => v.formulation === p.signed)) return false;
    if (p.dispensed != null && !(p.dispensed === true ? dispensings.length > 0 : dispensings.some((d) => formulationOfVersion(d.version) === p.dispensed))) return false;
    if (p.versions && !((p.versions.gte == null || versions.length >= p.versions.gte) && (p.versions.lte == null || versions.length <= p.versions.lte))) return false;
    const queried = versions.some((v) => v.reviews.some((x) => x.findings.length > 0));
    if (p.queried != null && queried !== p.queried) return false;
    const acknowledged = versions.some((v) => v.acknowledged != null && v.reviews.some((x) => x.findings.length > 0 && x.seq < v.acknowledged!.seq));
    if (p.acknowledged != null && acknowledged !== p.acknowledged) return false;
    if (p.refused != null) {
      const held = typeof p.refused === "boolean" ? refusals.length > 0 === p.refused : refusals.some((x) => x.op === p.refused);
      if (!held) return false;
    }
    if (p.discrepancy != null) {
      const all = dispensings.flatMap((d) => d.discrepancies);
      const held = typeof p.discrepancy === "boolean" ? all.length > 0 === p.discrepancy : all.some((x) => x.kind === p.discrepancy);
      if (!held) return false;
    }
    if (p.labelChecked != null && dispensings.at(-1)?.labelChecked !== p.labelChecked) return false;
    const last = dispensings.at(-1);
    if (p.supplyRead != null && (last ? last.read != null : undefined) !== p.supplyRead) return false;
    return true;
  });
}
