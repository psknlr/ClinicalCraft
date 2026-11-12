/**
 * The surgical count by item identity (docs/TEAM.md §4.3): the expected items are the baseline's ids; a count names
 * the ids accounted for. A clean 5/5 is correct; a recoverable 4/5 is reconciled after the recovery and a recount;
 * an unresolved 4/5 is escalated (credited) but stays open, and closure on it is recorded as an unsafe progression
 * that no later act erases (or refused, by the case's policy); 6/5 and a false 5/5 made up with another room's swab
 * are discrepancies; a documented transfer is neither missing nor a discrepancy. The assessment reads the same record.
 */
import { describe, expect, it } from "vitest";
import type { ClinicalAction, CountOp, SessionState } from "../schema/session.js";
import { assess } from "./assessment.js";
import { evaluate } from "./conditions.js";
import { countStatus, compareCount } from "./count.js";
import { checkCaseIntegrity } from "./integrity.js";
import { parseCase } from "./parse.js";
import { createSession, reduce, replay } from "./reducer.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";

const L = (en: string) => ({ en, "zh-CN": en });
const SWABS = [1, 2, 3, 4, 5].map((n) => `eq:or-7-swab-${n}`);
const SPARE = "eq:or-6-swab-1";

function theatreCase(closure: "record" | "refuse" = "record") {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.phases = [
    { id: "theatre", label: L("Theatre") },
    { id: "operation", label: L("Operation") },
  ];
  raw.initialPhase = "operation";
  raw.procedure.phases = ["operation"];
  raw.team = {
    room: "or-7",
    phases: ["operation"],
    members: [
      { staff: "or-7.circulating-nurse", duties: ["circulate"] },
      { staff: "or-7.scrub-nurse", duties: ["instruments", "count"] },
      { staff: "surgeon", duties: ["surgeon"] },
    ],
    count: { item: "sc-gauze-swab", name: L("swabs"), when: { procedure: { specimen: "extracted" } }, searchPlaces: ["or-7.mayo"], closure },
  };
  raw.safetyGates = [...raw.safetyGates, { id: "count-unsafe", label: L("Closed on an open count"), when: { count: { unsafe: true } }, verdict: "safety-critical", capPercent: 50 }];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

const c = theatreCase();
const count = (op: CountOp): ClinicalAction => ({ type: "count", count: op, by: "system" });
const baseline = count({ op: "baseline", ids: SWABS, staff: "or-7.scrub-nurse" });
const counted = (ids: string[], stage: "closing" | "recount" | "final" = "closing") => count({ op: "count", ids, staff: "or-7.scrub-nurse", stage });
const escalate = count({ op: "escalate", staff: "or-7.circulating-nurse", to: "surgeon", reason: "still 4 of 5 after the search — X-ray before the patient leaves" });
const scan = (detected: string[] = []) => count({ op: "scan", detected, staff: "or-7.circulating-nurse" });
const toClosure: ClinicalAction[] = [
  { type: "operate", op: { op: "plan-ports", plan: "three-port-left" } },
  { type: "operate", op: { op: "insufflate", pressure: 12 } },
  { type: "operate", op: { op: "bailout", strategy: "subtotal-fenestrating" } },
];
const close: ClinicalAction = { type: "operate", op: { op: "close" } };

function play(actions: ClinicalAction[], caseDef = c, from?: SessionState) {
  let s = from ?? reduce(caseDef, createSession(caseDef), { type: "start" }).state;
  const rejected: { type: string; code: string; message: string }[] = [];
  for (const a of actions) {
    const r = reduce(caseDef, s, a);
    if (r.rejected) rejected.push({ type: a.type, ...r.rejected });
    s = r.state;
  }
  return { s, rejected };
}

describe("the surgical count by item identity", () => {
  it("a case keeping a count passes the integrity checks; a case without one refuses count entries", () => {
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
    const plain = parseCase(LAP_CHOLE_SIT);
    if (!plain.ok) throw new Error("fixture");
    expect(play([baseline], plain.value).rejected[0]).toMatchObject({ code: "invalid", message: expect.stringContaining("keeps no surgical count") });
  });

  it("clean 5/5: correct; closure records nothing unsafe; the verdict stays clear", () => {
    const r = play([baseline, ...toClosure, counted(SWABS), close]);
    expect(r.rejected).toEqual([]);
    expect(countStatus(r.s.count)).toBe("correct");
    expect(r.s.count!.unsafe).toEqual([]);
    const a = assess(c, r.s);
    expect(a.count).toMatchObject({ status: "correct", expected: 5, missing: [], unexpected: [], unsafe: [] });
    expect(a.safety.verdict).toBe("clear");
  });

  it("recoverable 4/5: missing by id, recovered from the wound, recounted — reconciled, with the evidence kept", () => {
    const r = play([
      baseline,
      ...toClosure,
      counted(SWABS.slice(0, 4)),
      count({ op: "recover", ids: [SWABS[4]!], staff: "surgeon", from: "patient:or-7.slot" }),
      counted(SWABS, "recount"),
      close,
    ]);
    expect(r.rejected).toEqual([]);
    expect(r.s.count!.entries[1]).toMatchObject({ op: "count", missing: [SWABS[4]], unexpected: [] });
    expect(countStatus(r.s.count)).toBe("reconciled");
    expect(assess(c, r.s).count).toMatchObject({ status: "reconciled", recovered: [{ ids: [SWABS[4]], staff: "surgeon", from: "patient:or-7.slot" }], unsafe: [] });
  });

  it("unresolved 4/5: the escalation is credited, the count stays open; closure is an unsafe progression a later count never erases", () => {
    const short = play([baseline, ...toClosure, counted(SWABS.slice(0, 4))]);
    expect(countStatus(short.s.count)).toBe("discrepancy");
    const escalated = play([escalate], c, short.s);
    expect(countStatus(escalated.s.count)).toBe("unresolved");
    expect(evaluate(c, escalated.s, { count: { escalated: true } })).toBe(true);
    expect(evaluate(c, escalated.s, { count: { status: ["correct", "reconciled", "excluded"] } })).toBe(false);
    const closed = play([close], c, escalated.s);
    expect(closed.rejected).toEqual([]);
    expect(closed.s.count!.unsafe).toEqual([expect.objectContaining({ what: "closure", status: "unresolved", missing: [SWABS[4]] })]);
    // a later count that happens to find five (the swab came back from next door) does not erase what happened
    const later = play([counted(SWABS, "final")], c, closed.s);
    expect(countStatus(later.s.count)).toBe("reconciled");
    expect(evaluate(c, later.s, { count: { unsafe: true } })).toBe(true);
    const a = assess(c, later.s);
    expect(a.safety.verdict).toBe("safety-critical");
    expect(a.score.percent).toBeLessThanOrEqual(50);
    expect(a.count!.unsafe).toHaveLength(1);
  });

  it("an escalation and a clear scan exclude a retained item: closure is then not unsafe", () => {
    const r = play([baseline, ...toClosure, counted(SWABS.slice(0, 4)), escalate, scan([]), counted(SWABS.slice(0, 4), "final"), close]);
    expect(r.rejected).toEqual([]);
    expect(countStatus(r.s.count)).toBe("excluded");
    expect(r.s.count!.unsafe).toEqual([]);
    // a clear scan without the escalation excludes nothing
    expect(countStatus(play([baseline, counted(SWABS.slice(0, 4)), scan([])]).s.count)).toBe("discrepancy");
    // a scan that detects the swab inside keeps it open even after a count that cannot see it
    expect(countStatus(play([baseline, counted(SWABS), scan([SWABS[4]!])]).s.count)).toBe("discrepancy");
    expect(countStatus(play([baseline, counted(SWABS.slice(0, 4)), scan([SWABS[4]!]), counted(SWABS.slice(0, 4), "recount")]).s.count)).toBe("discrepancy");
    // recovered from the wound, then a clean recount: reconciled (the detected swab is out)
    const out = play([baseline, counted(SWABS.slice(0, 4)), scan([SWABS[4]!]), count({ op: "recover", ids: [SWABS[4]!], staff: "surgeon", from: "patient" }), counted(SWABS, "recount")]);
    expect(countStatus(out.s.count)).toBe("reconciled");
  });

  it("closure policy refuse: closure waits for a settled count, naming what is missing", () => {
    const strict = theatreCase("refuse");
    const r = play([baseline, ...toClosure, counted(SWABS.slice(0, 4)), close], strict);
    expect(r.rejected).toEqual([{ type: "operate", code: "requirements-unmet", message: expect.stringContaining(`missing: ${SWABS[4]}`) }]);
    expect(r.s.procedure?.closed).toBeFalsy();
  });

  it("6/5 and a false 5/5 made up with another room's swab are discrepancies, never correct", () => {
    const six = play([baseline, counted([...SWABS, SPARE])]);
    expect(six.s.count!.entries[1]).toMatchObject({ missing: [], unexpected: [SPARE] });
    expect(countStatus(six.s.count)).toBe("discrepancy");
    const substituted = play([baseline, counted([...SWABS.slice(0, 4), SPARE])]);
    expect(substituted.s.count!.entries[1]).toMatchObject({ missing: [SWABS[4]], unexpected: [SPARE] });
    expect(countStatus(substituted.s.count)).toBe("discrepancy");
    // the extra one set aside off the field (documented), the missing one recovered: reconciled
    const settled = play([count({ op: "transfer", ids: [SPARE], staff: "or-7.circulating-nurse", to: "set aside off the field", reason: "not in this count" }), counted([...SWABS, SPARE], "recount")], c, substituted.s);
    expect(countStatus(settled.s.count)).toBe("reconciled");
  });

  it("a documented transfer (a swab sent with the specimen) is neither missing nor a discrepancy", () => {
    const r = play([baseline, count({ op: "transfer", ids: [SWABS[4]!], staff: "or-7.circulating-nurse", to: "the specimen pot", reason: "sent with the specimen" }), ...toClosure, counted(SWABS.slice(0, 4)), close]);
    expect(r.rejected).toEqual([]);
    expect(countStatus(r.s.count)).toBe("correct");
    expect(compareCount(r.s.count!, SWABS.slice(0, 4))).toEqual({ missing: [], unexpected: [] });
    expect(assess(c, r.s).count).toMatchObject({ transferred: [SWABS[4]], unsafe: [] });
  });

  it("no record (text mode: no room to count in) leaves closure unjudged; a clean count before incision settles nothing", () => {
    expect(play([...toClosure, close]).s.count).toBeUndefined();
    const before = play([baseline, count({ op: "count", ids: SWABS, staff: "or-7.scrub-nurse", stage: "baseline" }), ...toClosure]);
    expect(countStatus(before.s.count)).toBe("baseline");
    const closed = play([close], c, before.s);
    expect(closed.s.count!.unsafe).toEqual([expect.objectContaining({ what: "closure", status: "baseline" })]);
  });

  it("entries need a baseline; a second baseline and an idle escalation are refused", () => {
    expect(play([counted(SWABS)]).rejected[0]?.code).toBe("requirements-unmet");
    expect(play([baseline, baseline]).rejected[0]?.code).toBe("invalid");
    expect(play([baseline, counted(SWABS), escalate]).rejected[0]).toMatchObject({ code: "invalid", message: expect.stringContaining("nothing to escalate") });
  });

  it("the record replays deterministically (a reload rebuilds it from the actions)", () => {
    const actions: ClinicalAction[] = [{ type: "start" }, baseline, ...toClosure, counted(SWABS.slice(0, 4)), escalate, close];
    expect(replay(c, actions).state).toEqual(replay(c, actions).state);
  });
});
