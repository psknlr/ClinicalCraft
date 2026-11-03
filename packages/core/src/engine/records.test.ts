/**
 * Records in the simulated timeline (the engineering recommendations, P0-1): a document written later in the
 * encounter is not there before its phase — never read from another phase — while an earlier phase's record stays in
 * the notes; an authored `available: false` record is "not present"; ordering a future record is refused.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import { createSession, parseCase, reduce } from "./index.js";
import { recordAvailability } from "./records.js";

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2).slice(0, 2000));
  return parsed.value;
}
const V4 = load(JSON.parse(readFileSync(new URL("./__fixtures__/v4-smzl-mini.case.json", import.meta.url), "utf8")));

/** V4 with a document of a later phase and one held back by a condition. */
function withRecords(): CaseDefinition {
  const c = structuredClone(V4);
  const later = c.phases.at(-1)!.id;
  const first = c.phases[0]!.id;
  const base = c.investigations[0]!;
  c.investigations.push(
    { ...structuredClone(base), id: "outcome-record", performedAt: "records", requires: [], aliases: {}, results: { [later]: { ...structuredClone(Object.values(base.results)[0]!), text: { en: "THE OUTCOME", "zh-CN": "结局" } } } } as never,
    { ...structuredClone(base), id: "old-report", performedAt: "records", requires: [], aliases: {}, results: { [first]: { ...structuredClone(Object.values(base.results)[0]!), text: { en: "an old report", "zh-CN": "旧报告" } } } } as never,
    { ...structuredClone(base), id: "held-back", performedAt: "records", requires: [], aliases: {}, availability: { when: { flag: "never-set" } }, results: { [first]: structuredClone(Object.values(base.results)[0]!) } } as never,
  );
  return load(c);
}

describe("records in the simulated timeline", () => {
  it("a later phase's record does not exist yet — never read from that phase; ordering it is refused, nothing recorded", () => {
    const c = withRecords();
    let s = reduce(c, createSession(c), { type: "start" }).state;
    expect(recordAvailability(c, s, "outcome-record")).toEqual({ kind: "not-yet", phase: c.phases.at(-1)!.id });
    const r = reduce(c, s, { type: "order", investigationId: "outcome-record" });
    expect(r.rejected).toMatchObject({ code: "not-ready" });
    expect(r.state.orders).toEqual([]);
    // once the encounter is in that phase, the record is there — and stays there afterwards
    const last = c.phases.at(-1)!.id;
    s = { ...s, phase: last, phasesReached: [...(s.phasesReached ?? []), last] };
    expect(recordAvailability(c, s, "outcome-record")).toMatchObject({ kind: "available", phase: last, historical: false });
    expect(reduce(c, s, { type: "order", investigationId: "outcome-record" }).rejected).toBeUndefined();
  });

  it("an earlier phase's record stays in the notes; a condition holds a record back; an unknown one is none", () => {
    const c = withRecords();
    const s = reduce(c, createSession(c), { type: "start" }).state;
    expect(recordAvailability(c, s, "old-report")).toMatchObject({ kind: "available", phase: c.phases[0]!.id, historical: true });
    expect(recordAvailability(c, s, "held-back")).toMatchObject({ kind: "not-yet" });
    expect(recordAvailability(c, s, "nothing")).toEqual({ kind: "none" });
    expect(s.phasesReached).toEqual([s.phase]);
  });
});
