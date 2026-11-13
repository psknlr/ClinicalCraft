/**
 * The operative site's verification (docs/TEAM.md §4.5): one record per encounter of where the skin mark is, what
 * says where the operation is, and who did what about it.
 *
 * The record holds the mark and what each piece of evidence states (as the case and the team scenario have them —
 * hidden until someone reads them); every entry is evidence of what a member of the team did: looked at the mark,
 * read a document or the imaging's orientation marker, asked the patient; raised a discrepancy between two things
 * they had read themselves; marked the site; corrected a document; confirmed; escalated. Nobody supplies what they
 * saw: the engine writes it. The pause a discrepancy calls and its release are explicit holds on the step the
 * case's site names (`hold` / `release-hold`: who called it and why; who released it and on what).
 *
 * The status is derived (`siteStatus`), and so is the story a debrief or a benchmark reads (`siteLedger`): who
 * detected it, who called the pause, who verified which evidence, what was put right, who confirmed, what justified
 * resuming — and whether the pause was released, or the held step given, before the discrepancy was verified and
 * confirmed. Pure.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { SiteStatus } from "../schema/common.js";
import type { HoldRecord, RejectionCode, SessionState, SiteEntry, SiteOp, SiteRecord } from "../schema/session.js";
import type { TeamSite } from "../schema/team.js";
import { patientNonVerbal } from "./speech.js";

type Evidence = TeamSite["evidence"][number];

/** The record as an encounter opens it: the mark and the evidence as the case's team site and the team scenario have them. */
export function openSite(c: CaseDefinition, scenarioId: string | undefined): SiteRecord | null {
  const site = c.team?.site;
  if (!site) return null;
  const scenario = scenarioId ? c.team?.scenarios.find((x) => x.id === scenarioId)?.site : undefined;
  const mark = scenario && scenario.mark !== undefined ? scenario.mark : (site.mark ?? null);
  const says = Object.fromEntries(site.evidence.map((e) => [e.id, scenario?.evidence?.[e.id] ?? e.says]));
  return { mark, says, entries: [] };
}

/** What a source states now: the mark's side (null: not marked), or a piece of evidence's. */
function stated(r: SiteRecord, source: string): string | null {
  return source === "mark" ? r.mark : (r.says[source] ?? null);
}

/** The latest thing `staff` read of each source (their own eyes only). */
function readBy(r: SiteRecord, staff: string, after = -1): Map<string, string | null> {
  const out = new Map<string, string | null>();
  for (const e of r.entries) if (e.op === "read" && same(e.staff, staff) && e.seq > after) out.set(e.source, e.value ?? null);
  return out;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The discrepancy that is open now: the latest `raise` with no `confirm` after it, or null. An escalation leaves it
 * open — it says the room could not settle it, and whatever settles it later is still held to its verification.
 */
export function openDiscrepancy(r: SiteRecord): Extract<SiteEntry, { op: "raise" }> | null {
  let open: Extract<SiteEntry, { op: "raise" }> | null = null;
  for (const e of r.entries) {
    if (e.op === "raise") open = e;
    else if (e.op === "confirm") open = null;
  }
  return open;
}

/**
 * The primary evidence that can be read now (the patient's own word only while he can speak), and what has been
 * read of it since `after` (a sequence number: the discrepancy's): the side it agrees on, or why it is not verified.
 */
export function siteVerification(c: CaseDefinition, s: SessionState, after: number): { verified: boolean; side: string | null; missing: string[]; conflict: boolean } {
  const site = c.team?.site;
  const r = s.site;
  if (!site || !r) return { verified: false, side: null, missing: [], conflict: false };
  const available = site.evidence.filter((e) => e.primary && (e.kind !== "patient" || !patientNonVerbal(c, s)));
  const seen = new Map<string, string | null>();
  for (const e of r.entries) if (e.op === "read" && e.seq > after && site.evidence.some((x) => x.id === e.source && x.primary)) seen.set(e.source, e.value ?? null);
  const missing = available.filter((e) => !seen.has(e.id)).map((e) => e.id);
  const sides = new Set([...seen.values()]);
  const conflict = sides.size > 1;
  const side = sides.size === 1 ? ([...sides][0] ?? null) : null;
  return { verified: available.length > 0 && missing.length === 0 && !conflict && side !== null, side, missing, conflict };
}

export type SiteResult = { ok: true; record: SiteRecord; entry: SiteEntry | null } | { ok: false; code: RejectionCode; message: string };

/** Apply one entry to the site's record (`null` entry: an `open` on a record already open — unchanged). */
export function applySite(c: CaseDefinition, s: SessionState, op: SiteOp, at: number, seq: number): SiteResult {
  const site = c.team?.site;
  if (!site) return { ok: false, code: "invalid", message: "this case's team verifies no operative site" };
  if (op.op === "open") {
    if (s.site) return { ok: true, record: s.site, entry: null };
    const record = openSite(c, s.teamScenario)!;
    const entry: SiteEntry = { ...op, at, seq };
    return { ok: true, record: { ...record, entries: [entry] }, entry };
  }
  const r = s.site;
  if (!r) return { ok: false, code: "no-record", message: "the site's verification has not been opened for this encounter" };
  const evidence = (id: string): Evidence | undefined => site.evidence.find((e) => e.id === id);
  const known = (source: string) => source === "mark" || !!evidence(source);
  const done = (entry: SiteEntry, patch: Partial<SiteRecord> = {}): SiteResult => ({ ok: true, record: { ...r, ...patch, entries: [...r.entries, entry] }, entry });
  switch (op.op) {
    case "read": {
      if (!known(op.source)) return { ok: false, code: "unknown-id", message: `unknown site evidence "${op.source}"` };
      // the patient's own word: only while he can speak
      if (evidence(op.source)?.kind === "patient" && patientNonVerbal(c, s)) return { ok: false, code: "cannot-answer", message: "the patient cannot answer now" };
      return done({ ...op, at, seq, value: stated(r, op.source) });
    }
    case "raise": {
      const [a, b] = op.sources;
      if (!known(a) || !known(b) || a === b) return { ok: false, code: "unknown-id", message: "a discrepancy is between two different things: the mark, or pieces of the site's evidence" };
      if (openDiscrepancy(r)) return { ok: false, code: "invalid", message: "a discrepancy is already open on the operative site" };
      // only between things the raiser has read themselves, and as they read them
      const mine = readBy(r, op.staff);
      if (!mine.has(a) || !mine.has(b)) return { ok: false, code: "requirements-unmet", message: `${op.staff} has not looked at both: a discrepancy is raised from what one has seen` };
      const values = [mine.get(a) ?? null, mine.get(b) ?? null];
      if (values[0] === values[1] && values[0] !== null) return { ok: false, code: "invalid", message: "they agree: there is no discrepancy to raise" };
      return done({ ...op, at, seq, values });
    }
    case "mark": {
      if (!(op.side in site.sides)) return { ok: false, code: "unknown-id", message: `unknown side "${op.side}"` };
      // a confirmed site stays as it was confirmed: the mark changes only before that, or on a discrepancy
      if (!openDiscrepancy(r) && r.entries.some((e) => e.op === "confirm")) return { ok: false, code: "invalid", message: "the site is confirmed: its mark is changed only on a discrepancy" };
      // the site is marked by the surgeon who operates (a team with a surgeon: nobody else marks)
      const surgeons = (c.team?.members ?? []).filter((m) => m.duties.includes("surgeon")).map((m) => m.staff);
      if (surgeons.length && !surgeons.some((x) => same(x, op.staff))) return { ok: false, code: "requirements-unmet", message: "the site is marked by the operating surgeon" };
      return done({ ...op, at, seq }, { mark: op.side });
    }
    case "amend": {
      const e = evidence(op.source);
      if (!e) return { ok: false, code: "unknown-id", message: `unknown site evidence "${op.source}"` };
      if (!(op.to in site.sides)) return { ok: false, code: "unknown-id", message: `unknown side "${op.to}"` };
      // primary evidence is what a discrepancy is verified against: it is never corrected in the room
      if (e.primary || e.kind !== "document") return { ok: false, code: "invalid", message: `"${op.source}" is not a document that can be corrected in the room` };
      if (!openDiscrepancy(r)) return { ok: false, code: "invalid", message: "a document is corrected on a discrepancy: none is open on the operative site" };
      return done({ ...op, at, seq }, { says: { ...r.says, [op.source]: op.to } });
    }
    case "confirm": {
      const open = openDiscrepancy(r);
      // what the confirmer has seen with their own eyes — since the discrepancy, if one is open
      const mine = readBy(r, op.staff, open ? open.seq : -1);
      const documents = [...mine.keys()].filter((x) => x !== "mark");
      if (!mine.has("mark") || documents.length === 0) {
        return { ok: false, code: "requirements-unmet", message: `${op.staff} has not looked at the mark and read what says where the operation is${open ? " since the discrepancy" : ""}` };
      }
      const side = mine.get("mark") ?? null;
      if (side === null) return { ok: false, code: "requirements-unmet", message: "the site is not marked" };
      // as things are now (a mark made or a document corrected after they looked: they look again)
      const stale = [...mine].find(([source, value]) => stated(r, source) !== value);
      if (stale) return { ok: false, code: "requirements-unmet", message: `"${stale[0]}" has changed since ${op.staff} looked at it` };
      const differs = [...mine].find(([, value]) => value !== side);
      if (differs) return { ok: false, code: "requirements-unmet", message: `"${differs[0]}" does not agree with the mark` };
      if (open) {
        const v = siteVerification(c, s, open.seq);
        if (v.conflict) return { ok: false, code: "requirements-unmet", message: "the primary evidence disagrees with itself: it cannot be confirmed in the room" };
        if (!v.verified) return { ok: false, code: "requirements-unmet", message: `not verified since the discrepancy: ${v.missing.join(", ") || "the primary evidence"} has not been read` };
        if (v.side !== side) return { ok: false, code: "requirements-unmet", message: "the mark does not agree with what was verified" };
      }
      return done({ ...op, at, seq, side, basis: [...mine.keys()] });
    }
    case "escalate": {
      const open = openDiscrepancy(r);
      if (!open) return { ok: false, code: "invalid", message: "no discrepancy is open on the operative site" };
      if (r.entries.some((e) => e.op === "escalate" && e.seq > open.seq)) return { ok: false, code: "invalid", message: "the discrepancy on the operative site is already escalated" };
      return done({ ...op, at, seq });
    }
  }
}

/** The verification's status from its record (see `SiteStatusSchema`). */
export function siteStatus(r: SiteRecord | undefined): SiteStatus {
  if (!r) return "none";
  let status: SiteStatus = "unchecked";
  let raised = false;
  for (const e of r.entries) {
    if (e.op === "raise") {
      raised = true;
      status = "discrepancy";
    } else if (e.op === "escalate") status = "unresolved";
    else if (e.op === "confirm") status = raised ? "corrected" : "confirmed";
  }
  return status;
}

/** Does a `{ site: … }` condition hold? Without a record (no team site, or a session without a world): only for `none`. */
export function evaluateSite(s: SessionState, p: { status: SiteStatus | SiteStatus[] }): boolean {
  const status = siteStatus(s.site);
  return Array.isArray(p.status) ? p.status.includes(status) : p.status === status;
}

/** What happened about the site, as a debrief or a benchmark reads it (see the module docs). */
export interface SiteLedger {
  status: SiteStatus;
  /** Who raised the discrepancy, when, and between what (as they had read it). */
  detected: { by: string; at: number; sources: [string, string]; values: (string | null)[] } | null;
  /** The pause called on it: the hold on the step the site names — who placed it, when and why. */
  pause: { by: string; at: number; reason: string } | null;
  /** Who read which primary evidence after the discrepancy, and what it said. */
  verified: { source: string; value: string | null; by: string; at: number }[];
  /** What was put right after it: the site marked, a document corrected. */
  corrections: ({ what: "mark"; side: string; by: string; at: number } | { what: "amend"; source: string; to: string; by: string; at: number })[];
  /** Who confirmed the site, when, and on which side. */
  confirmed: { by: string; at: number; side: string } | null;
  /** The pause's release: who, when, and the reassessment recorded with it. */
  resumed: { by: string; at: number; justification: string } | null;
  /** Escalated: who, when and why. */
  escalated: { by: string; at: number; reason: string } | null;
  /** The pause was released, or the held step given, while the discrepancy was not verified and confirmed. */
  unjustified: boolean;
}

/** Read the site's story from the record and the holds (see `SiteLedger`). */
export function siteLedger(c: CaseDefinition, s: SessionState): SiteLedger {
  const site = c.team?.site;
  const r = s.site;
  const none: SiteLedger = { status: siteStatus(r), detected: null, pause: null, verified: [], corrections: [], confirmed: null, resumed: null, escalated: null, unjustified: false };
  if (!site || !r) return none;
  const raise = r.entries.find((e) => e.op === "raise") as Extract<SiteEntry, { op: "raise" }> | undefined;
  const confirm = r.entries.findLast((e) => e.op === "confirm") as Extract<SiteEntry, { op: "confirm" }> | undefined;
  const escalate = r.entries.findLast((e) => e.op === "escalate") as Extract<SiteEntry, { op: "escalate" }> | undefined;
  const out: SiteLedger = { ...none, confirmed: confirm ? { by: confirm.staff, at: confirm.at, side: confirm.side ?? "" } : null };
  if (!raise) return out;
  out.detected = { by: raise.staff, at: raise.at, sources: raise.sources, values: raise.values ?? [] };
  const primary = new Set(site.evidence.filter((e) => e.primary).map((e) => e.id));
  for (const e of r.entries) {
    if (e.seq <= raise.seq) continue;
    if (e.op === "read" && primary.has(e.source)) out.verified.push({ source: e.source, value: e.value ?? null, by: e.staff, at: e.at });
    if (e.op === "mark") out.corrections.push({ what: "mark", side: e.side, by: e.staff, at: e.at });
    if (e.op === "amend") out.corrections.push({ what: "amend", source: e.source, to: e.to, by: e.staff, at: e.at });
  }
  if (escalate && escalate.seq > raise.seq) out.escalated = { by: escalate.staff, at: escalate.at, reason: escalate.reason };
  // the pause: the first hold placed on the step from the discrepancy on
  const hold: HoldRecord | undefined = (s.holds ?? []).find((h) => h.interventionId === site.holds && h.seq >= raise.seq);
  if (hold) {
    out.pause = { by: hold.placedBy, at: hold.at, reason: hold.reason };
    if (hold.released) out.resumed = { by: hold.released.by, at: hold.released.at, justification: hold.released.reassessment };
  }
  // resumed, or the held step given, before the discrepancy was confirmed as verified
  const settled = confirm && confirm.seq > raise.seq ? confirm.seq : Infinity;
  const releasedEarly = !!hold?.released && hold.released.seq < settled;
  const givenEarly = s.interventions.some((i) => i.interventionId === site.holds && !i.invalid && (i.seq ?? 0) > raise.seq && (i.seq ?? 0) < settled);
  out.unjustified = releasedEarly || givenEarly;
  return out;
}
