/**
 * The surgical count (docs/TEAM.md §4.3): one record per encounter and operating room, kept by item identity.
 *
 * The baseline is the set of items opened onto the field (entity ids, counted before incision and before anything
 * a scenario sets up moves an item). Every later count names the items accounted for — what someone's body saw in
 * the room or in someone's hands — and is compared with the expected set (the baseline, plus documented additions,
 * less documented transfers off the field): an expected item not there is `missing`, an item there that is not in
 * the count is `unexpected`. So six of five, and five of five made up with a swab from another room, are
 * discrepancies, never "correct". The record is append-only evidence (who counted, scanned, recovered, transferred,
 * escalated); its status is derived here, and the count board, the detection wand, the closing checks, the WHO Sign
 * Out (through case conditions) and the assessment all read the same record. Pure.
 */
import { COUNT_SETTLED, type CountPredicate, type CountStatus } from "../schema/common.js";
import type { CaseDefinition } from "../schema/case.js";
import type { CountEntry, CountOp, CountRecord, SessionState } from "../schema/session.js";

/** What the count holds now: the expected items, and those documented as added or transferred. */
export interface CountLedgerView {
  expected: string[];
  added: string[];
  transferred: string[];
}

const uniq = (xs: readonly string[]) => [...new Set(xs)];

/** The expected set now (baseline + additions), and what was documented as leaving the field. */
export function countLedger(r: CountRecord): CountLedgerView {
  const added = uniq(r.entries.flatMap((e) => (e.op === "add" ? e.ids : [])));
  const transferred = uniq(r.entries.flatMap((e) => (e.op === "transfer" ? e.ids : [])));
  return { expected: uniq([...r.expected, ...added]), added, transferred };
}

/**
 * Compare the items accounted for with the record: `missing` — expected, not transferred, not there; `unexpected` —
 * there, but neither expected nor transferred (set aside).
 */
export function compareCount(r: CountRecord, ids: readonly string[]): { missing: string[]; unexpected: string[] } {
  const { expected, transferred } = countLedger(r);
  const seen = new Set(ids);
  const out = new Set(transferred);
  const inCount = new Set(expected);
  return {
    missing: expected.filter((id) => !out.has(id) && !seen.has(id)),
    unexpected: uniq(ids).filter((id) => !inCount.has(id) && !out.has(id)),
  };
}

/**
 * The count's status from its record (see `CountStatusSchema`), read entry by entry. A count that misses an expected
 * item or finds one not in the count opens a discrepancy, and so does a scan that detects an item in the patient; an
 * escalation makes an open discrepancy `unresolved`, and a clear scan after it `excluded` (no retained item). A clean
 * count closes it (`reconciled`; `correct` when nothing was ever open) — unless an item the latest scan detected is
 * still in the patient (neither recovered nor scanned clear since). Until a count after incision, a clean record is
 * `baseline`.
 */
export function countStatus(r: CountRecord | undefined): CountStatus {
  if (!r) return "none";
  let open = false;
  let escalated = false;
  let excluded = false;
  // detected by the latest scan and not recovered since
  let retained = new Set<string>();
  let lastClean = false;
  let had = false;
  let counted = false;
  for (const e of r.entries) {
    if (e.op === "count") {
      lastClean = !(e.missing?.length || e.unexpected?.length);
      // the count before incision settles nothing about closure: only a later count does
      if (e.stage !== "baseline") counted = true;
      if (!lastClean) {
        if (!open) [open, escalated, excluded] = [true, false, false];
        had = true;
      } else if (retained.size === 0) [open, escalated, excluded] = [false, false, false];
    } else if (e.op === "scan") {
      retained = new Set(e.detected);
      if (retained.size > 0) {
        if (!open) [open, escalated] = [true, false];
        excluded = false;
        had = true;
      } else if (open && lastClean) [open, escalated, excluded] = [false, false, false];
      else if (open && escalated) excluded = true;
    } else if (e.op === "recover") {
      for (const id of e.ids) retained.delete(id);
    } else if (e.op === "escalate" && open) escalated = true;
  }
  if (open) return excluded ? "excluded" : escalated ? "unresolved" : "discrepancy";
  if (!counted) return "baseline";
  return had ? "reconciled" : "correct";
}

/** Is the count settled (every item accounted for, or a retained item excluded after an escalation)? */
export function countSettled(r: CountRecord | undefined): boolean {
  return COUNT_SETTLED.includes(countStatus(r));
}

/** The latest count's missing and unexpected items (empty when none was taken or it was clean). */
export function countOpenItems(r: CountRecord | undefined): { missing: string[]; unexpected: string[]; detected: string[] } {
  if (!r) return { missing: [], unexpected: [], detected: [] };
  const last = r.entries.findLast((e) => e.op === "count") as Extract<CountEntry, { op: "count" }> | undefined;
  const lastScan = r.entries.findLast((e) => e.op === "scan") as Extract<CountEntry, { op: "scan" }> | undefined;
  return { missing: [...(last?.missing ?? [])], unexpected: [...(last?.unexpected ?? [])], detected: [...(lastScan?.detected ?? [])] };
}

/** Evaluate a `count` condition leaf. */
export function evaluateCount(s: SessionState, p: CountPredicate): boolean {
  const r = s.count;
  if (!r) return p.status !== undefined && (Array.isArray(p.status) ? p.status.includes("none") : p.status === "none") && p.stage === undefined && p.scan === undefined && !p.escalated && !p.unsafe;
  if (p.status !== undefined) {
    const status = countStatus(r);
    if (!(Array.isArray(p.status) ? p.status.includes(status) : p.status === status)) return false;
  }
  if (p.stage !== undefined) {
    const last = r.entries.findLast((e) => e.op === "count") as Extract<CountEntry, { op: "count" }> | undefined;
    if (last?.stage !== p.stage) return false;
  }
  if (p.scan !== undefined) {
    const scan = r.entries.findLast((e) => e.op === "scan") as Extract<CountEntry, { op: "scan" }> | undefined;
    if (!scan || (p.scan === "clear") !== (scan.detected.length === 0)) return false;
  }
  if (p.escalated !== undefined && r.entries.some((e) => e.op === "escalate") !== p.escalated) return false;
  if (p.unsafe !== undefined && r.unsafe.length > 0 !== p.unsafe) return false;
  return true;
}

/** The outcome of a count op on the record (the reducer applies it). */
export type CountResult = { ok: true; record: CountRecord; entry: CountEntry } | { ok: false; code: "invalid" | "requirements-unmet"; message: string };

/** Apply one count op (pure): the new record, or why it is refused. `at`/`seq`: when. */
export function applyCount(c: CaseDefinition, record: CountRecord | undefined, op: CountOp, at: number, seq: number): CountResult {
  const config = c.team?.count;
  if (!config || !c.team) return { ok: false, code: "invalid", message: "this case keeps no surgical count (team.count)" };
  if (op.op === "baseline") {
    if (record) return { ok: false, code: "invalid", message: `the baseline was already counted (${record.expected.length} ${config.item})` };
    const entry: CountEntry = { ...op, ids: uniq(op.ids), at, seq };
    return { ok: true, record: { item: config.item, room: c.team.room, expected: uniq(op.ids), entries: [entry], unsafe: [] }, entry };
  }
  if (!record) return { ok: false, code: "requirements-unmet", message: "no baseline count yet: count what is opened onto the field before incision first" };
  const status = countStatus(record);
  let entry: CountEntry;
  switch (op.op) {
    case "count": {
      const ids = uniq(op.ids);
      entry = { ...op, ids, at, seq, ...compareCount(record, ids) };
      break;
    }
    case "scan":
      entry = { ...op, detected: uniq(op.detected), at, seq };
      break;
    case "recover":
      entry = { ...op, ids: uniq(op.ids), at, seq };
      break;
    case "add": {
      const known = new Set(countLedger(record).expected);
      const again = op.ids.filter((id) => known.has(id));
      if (again.length) return { ok: false, code: "invalid", message: `already in the count: ${again.join(", ")}` };
      entry = { ...op, ids: uniq(op.ids), at, seq };
      break;
    }
    case "transfer": {
      const out = new Set(countLedger(record).transferred);
      const again = op.ids.filter((id) => out.has(id));
      if (again.length) return { ok: false, code: "invalid", message: `already documented off the field: ${again.join(", ")}` };
      entry = { ...op, ids: uniq(op.ids), at, seq };
      break;
    }
    case "escalate":
      if (status !== "discrepancy" && status !== "unresolved") return { ok: false, code: "invalid", message: `nothing to escalate: the count is ${status}` };
      entry = { ...op, at, seq };
      break;
  }
  return { ok: true, record: { ...record, entries: [...record.entries, entry] }, entry };
}

/**
 * Closure and the count (the reducer, `operate close`): null when the case keeps no count, no record is kept (text
 * mode: there is no room to count in) or it is settled; else the status and the open items — refused
 * (`team.count.closure: "refuse"`) or recorded as an unsafe progression. Closing with nothing counted since incision
 * (status `baseline`) is not settled.
 */
export function closureOnOpenCount(c: CaseDefinition, s: SessionState): { policy: "record" | "refuse"; status: CountStatus; missing: string[]; unexpected: string[] } | null {
  const config = c.team?.count;
  if (!config || !s.count) return null;
  if (countSettled(s.count)) return null;
  const open = countOpenItems(s.count);
  return { policy: config.closure ?? "record", status: countStatus(s.count), missing: open.missing, unexpected: open.unexpected };
}

/** The count as the assessment reports it (the debrief's record). */
export interface CountReport {
  status: CountStatus;
  /** Items in the count (the baseline and documented additions). */
  expected: number;
  /** Unless the count is correct or reconciled: the latest count's missing items and items not in the count. */
  missing: string[];
  unexpected: string[];
  transferred: string[];
  added: string[];
  escalations: { staff: string; to: string; reason: string; at: number }[];
  recovered: { ids: string[]; staff: string; from: string; at: number }[];
  scans: { staff: string; detected: string[]; at: number }[];
  /** Closure on an open count (permanent). */
  unsafe: { what: string; status: CountStatus; missing: string[]; unexpected: string[]; at: number }[];
}

/** The count as the assessment reports it (debrief): status, expected, the open items, escalations, unsafe progression. */
export function countSummary(s: SessionState): CountReport | undefined {
  const r = s.count;
  if (!r) return undefined;
  const ledger = countLedger(r);
  const status = countStatus(r);
  // an excluded count is still incorrect: the debrief names what was never found
  const open = status === "correct" || status === "reconciled" ? { missing: [], unexpected: [] } : countOpenItems(r);
  return {
    status,
    expected: ledger.expected.length,
    missing: open.missing,
    unexpected: open.unexpected,
    transferred: ledger.transferred,
    added: ledger.added,
    escalations: r.entries.flatMap((e) => (e.op === "escalate" ? [{ staff: e.staff, to: e.to, reason: e.reason, at: e.at }] : [])),
    recovered: r.entries.flatMap((e) => (e.op === "recover" ? [{ ids: [...e.ids], staff: e.staff, from: e.from, at: e.at }] : [])),
    scans: r.entries.flatMap((e) => (e.op === "scan" ? [{ staff: e.staff, detected: [...e.detected], at: e.at }] : [])),
    unsafe: r.unsafe.map((u) => ({ what: u.what, status: u.status, missing: [...u.missing], unexpected: [...u.unexpected], at: u.at })),
  };
}
