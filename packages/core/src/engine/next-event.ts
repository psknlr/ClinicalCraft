/**
 * What the encounter is waiting for (docs/STUDIES.md, PROTOCOL "Case time"): the results and reports that will be
 * ready at a known minute — an ordered investigation's result (`readyAt`), a new investigation's report (`dueAt`) —
 * soonest first. Never a scenario event (those would give the case away). A front-end shows the next one and offers
 * to wait until it when the case clock moves only with what is done.
 */
import type { LocalizedText } from "../i18n.js";
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { studyProfile } from "./study.js";

export interface PendingEvent {
  kind: "result" | "study-report";
  /** The order key (a result) or the accession id (a report). */
  id: string;
  /** Simulated minute it is ready. */
  at: number;
  name: LocalizedText;
}

/** Everything ready at a known later minute, soonest first. */
export function pendingEvents(c: CaseDefinition, s: SessionState): PendingEvent[] {
  const out: PendingEvent[] = [];
  for (const o of s.orders) {
    if (o.readyAt <= s.clock + 1e-9) continue;
    const inv = c.investigations.find((x) => x.id === o.investigationId);
    out.push({ kind: "result", id: o.key, at: o.readyAt, name: inv?.name ?? o.investigationId });
  }
  for (const a of s.studies?.accessions ?? []) {
    if (a.dueAt <= s.clock + 1e-9 || (s.studies?.reports ?? []).some((r) => r.accession === a.id)) continue;
    out.push({ kind: "study-report", id: a.id, at: a.dueAt, name: studyProfile(c, a.code)?.name ?? a.code });
  }
  return out.sort((x, y) => x.at - y.at || x.id.localeCompare(y.id));
}

/** The soonest of them (null: nothing is waiting on time). */
export function nextEvent(c: CaseDefinition, s: SessionState): PendingEvent | null {
  return pendingEvents(c, s)[0] ?? null;
}
