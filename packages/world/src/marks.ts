/**
 * A run's marks (docs/FACILITIES.md "A run's marks"): what a device that keeps a run record (`DeviceBehavior.runs`)
 * is marked on, read from the run's own entries — never from anyone's say-so. Each mark is one member of the team,
 * the sign that reached them and the response they owe it: the surgeon who sees the bleed on the screen and puts
 * pressure on it, the anaesthetist whose monitor alarms and who supports the circulation, the nurse who hears the
 * call and opens the tray. A member is scored against the sign they had: a sign that never came (nobody called)
 * leaves their mark `not-applicable`, and the mark of whoever owed the call is the one missed.
 *
 * Pure: the same entries give the same marks, so a saved run reads as it did.
 */
import type { RunMark, RunStepRef } from "@clinicalcraft/core";
import type { EntityId, RunEntry, RunMarkResult, RunRecord } from "./contracts.js";

/** Is this entry the step a mark looks for? `typeOf`: the equipment type of a device recorded with the run. */
function matches(e: RunEntry, ref: RunStepRef, typeOf: (id: EntityId) => string | null): boolean {
  if (e.op !== ref.op) return false;
  // the device itself (the entry names none), or a device of that type recorded with it
  if (ref.device === undefined ? e.device !== undefined : !e.device || typeOf(e.device) !== ref.device) return false;
  if (ref.to === undefined) return true;
  return e.to !== null && (Array.isArray(ref.to) ? ref.to : [ref.to]).includes(e.to);
}

/** Was this entry done by one of those a mark is for (a role, or a staff position)? */
function theirs(e: RunEntry, by: readonly string[]): boolean {
  return by.includes(e.role) || (!!e.position && by.includes(e.position));
}

/** Simulated seconds between two readings of the clinical clock (minutes), to a tenth. */
const secondsBetween = (from: number, to: number): number => Math.round((to - from) * 600) / 10;

/** How a run did on each of its marks, in the order they are declared. */
export function markRun(marks: readonly RunMark[], run: Pick<RunRecord, "entries">, typeOf: (id: EntityId) => string | null): RunMarkResult[] {
  return marks.map((m): RunMarkResult => {
    const at = run.entries.findIndex((e) => matches(e, m.sign, typeOf));
    if (at < 0) return { id: m.id, status: "not-applicable" };
    const sign = run.entries[at]!;
    const after = run.entries.slice(at + 1);
    const found = after.findIndex((e) => matches(e, m.response, typeOf) && theirs(e, m.by));
    if (found < 0) return { id: m.id, status: "missed", signAt: sign.at };
    const response = after[found]!;
    const seconds = secondsBetween(sign.at, response.at);
    // `first`: nothing else of theirs on the device itself between the sign and the response
    const other = !!m.first && after.slice(0, found).some((e) => e.device === undefined && theirs(e, m.by));
    const status: RunMarkResult["status"] = other ? "missed" : m.within !== undefined && seconds > m.within + 1e-6 ? "late" : "met";
    return { id: m.id, status, signAt: sign.at, responseAt: response.at, seconds, actor: response.actor };
  });
}
