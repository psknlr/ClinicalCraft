/**
 * Checklist steps and the order of committed acts (docs/ARCHITECTURE.md §3.1, docs/CASE_AUTHORING.md §6.1):
 * an out-of-order checklist attempt is logged but applies nothing and uses none of its doses; a gate on a
 * valid attempt keeps the operation locked until one is made; `inOrder` compares committed sequence, so
 * two acts in the same simulated minute keep their order. And the critical view's counting criterion:
 * the operator reports how many structures they see entering — two is credited only when two enter.
 */
import { describe, expect, it } from "vitest";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import type { ProcedureOp } from "../schema/procedure.js";
import { assess } from "./assessment.js";
import { evaluate } from "./conditions.js";
import { checkCaseIntegrity } from "./integrity.js";
import { parseCase } from "./parse.js";
import { createSession, reduce } from "./reducer.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";

const L = (en: string) => ({ en, "zh-CN": en });

/** The fixture case with a WHO checklist: Sign In → induction → Time Out opens the operation; Sign Out after closing. */
function checklistCase(opts: { counting?: boolean } = {}) {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.clock = { mode: "simulated", startTime: "08:00", actionCosts: { ask: 1, examine: 1, order: 1, read: 1, intervene: 0, answer: 0 } };
  raw.phases = [
    { id: "ward", label: L("Ward") },
    { id: "theatre", label: L("Theatre") },
    { id: "operation", label: L("Operation"), enterWhen: { intervened: "time-out", valid: true } },
  ];
  raw.procedure.phases = ["operation"];
  raw.interventions = [
    { id: "sign-in", name: L("Sign In"), kind: "monitoring", checklist: true, maxDoses: 1, indicatedWhen: { phase: "theatre" } },
    { id: "induction", name: L("Induction"), kind: "airway", risk: "high", maxDoses: 1, contraindicatedWhen: { not: { intervened: "sign-in", valid: true } } },
    { id: "time-out", name: L("Time Out"), kind: "consult", checklist: true, maxDoses: 1, contraindicatedWhen: { not: { intervened: "induction", valid: true } } },
  ];
  raw.safetyGates = [
    ...raw.safetyGates,
    { id: "induction-before-sign-in", label: L("Induction before the Sign In"), when: { intervened: "induction", valid: false }, verdict: "safety-critical", capPercent: 70 },
  ];
  raw.rubric = [...raw.rubric, { id: "r-signin", text: L("Sign In before induction"), domain: "safety", weight: 10, met: { inOrder: ["sign-in", "induction"] } }];
  if (opts.counting) raw.procedure.views[0].criteria[2].test = { onlyEntering: "gallbladder", count: 2 };
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

function play(c: ReturnType<typeof checklistCase>, actions: ClinicalAction[], from?: SessionState) {
  let s = from ?? reduce(c, createSession(c), { type: "start" }).state;
  const rejected: { action: ClinicalAction; code: string; message: string }[] = [];
  for (const a of actions) {
    const r = reduce(c, s, a);
    if (r.rejected) rejected.push({ action: a, code: r.rejected.code, message: r.rejected.message });
    s = r.state;
  }
  return { s, rejected };
}

const iv = (id: string): ClinicalAction => ({ type: "intervene", interventionId: id });
const op = (o: ProcedureOp): ClinicalAction => ({ type: "operate", op: o });
const THEATRE: ClinicalAction = { type: "set-phase", phase: "theatre" };

describe("checklist steps", () => {
  const c = checklistCase();

  it("the case with a checklist passes the integrity checks", () => {
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("an early Time Out is logged, applies nothing, leaves the operation locked, and a later valid one opens it", () => {
    const early = play(c, [THEATRE, iv("time-out")]);
    expect(early.rejected).toEqual([]);
    expect(early.s.interventions).toMatchObject([{ interventionId: "time-out", appropriateness: "contraindicated", invalid: true }]);
    expect(early.s.phase).toBe("theatre");
    expect(evaluate(c, early.s, { intervened: "time-out" })).toBe(true);
    expect(evaluate(c, early.s, { intervened: "time-out", valid: true })).toBe(false);
    expect(evaluate(c, early.s, { intervened: "time-out", valid: false })).toBe(true);
    // surgery stays locked
    const locked = play(c, [op({ op: "plan-ports", plan: "three-port-left" })], early.s);
    expect(locked.rejected[0]?.code).toBe("phase-locked");
    // the invalid attempt used none of the single dose: the valid Time Out still counts
    const valid = play(c, [iv("sign-in"), iv("induction"), iv("time-out")], early.s);
    expect(valid.rejected).toEqual([]);
    expect(valid.s.phase).toBe("operation");
    expect(play(c, [op({ op: "plan-ports", plan: "three-port-left" })], valid.s).rejected).toEqual([]);
    // and a second valid one is refused by its maxDoses
    expect(play(c, [iv("time-out")], valid.s).rejected[0]?.code).toBe("max-doses");
  });

  it("induction before the Sign In is a real act, out of order: the order check, the gate and the verdict show it", () => {
    const reversed = play(c, [THEATRE, iv("induction"), iv("sign-in")]);
    expect(reversed.rejected).toEqual([]);
    expect(reversed.s.interventions.find((r) => r.interventionId === "induction")).toMatchObject({ appropriateness: "contraindicated" });
    expect(reversed.s.interventions.find((r) => r.interventionId === "induction")?.invalid).toBeUndefined();
    expect(evaluate(c, reversed.s, { inOrder: ["sign-in", "induction"] })).toBe(false);
    const report = assess(c, reversed.s);
    expect(report.safety.verdict).toBe("safety-critical");
    expect(report.safety.gates?.map((g) => g.id)).toContain("induction-before-sign-in");
    expect(report.rubric.find((r) => r.id === "r-signin")?.met).toBe(false);
    const inOrder = play(c, [THEATRE, iv("sign-in"), iv("induction")]);
    expect(evaluate(c, inOrder.s, { inOrder: ["sign-in", "induction"] })).toBe(true);
    expect(assess(c, inOrder.s).safety.verdict).toBe("clear");
  });

  it("acts in the same simulated minute keep their committed order", () => {
    const same = play(c, [THEATRE, iv("sign-in"), iv("induction")]);
    const [a, b] = same.s.interventions;
    expect(a!.at).toBe(b!.at);
    expect(a!.seq! < b!.seq!).toBe(true);
    expect(evaluate(c, same.s, { inOrder: ["sign-in", "induction"] })).toBe(true);
    expect(evaluate(c, same.s, { inOrder: ["induction", "sign-in"] })).toBe(false);
  });
});

describe("the critical view's counting criterion", () => {
  const ACCESS: ProcedureOp[] = [
    { op: "plan-ports", plan: "three-port-left" },
    { op: "insufflate", pressure: 12 },
    { op: "insert", port: "A", instrument: "laparoscope" },
    { op: "insert", port: "B", instrument: "grasper" },
    { op: "insert", port: "C", instrument: "maryland" },
    { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" },
    ...Array.from({ length: 6 }, () => ({ op: "dissect", port: "C", region: "hepatocystic-triangle" }) as ProcedureOp),
    ...Array.from({ length: 3 }, () => ({ op: "dissect", port: "C", region: "cystic-plate" }) as ProcedureOp),
  ];
  const ready = [THEATRE, iv("sign-in"), iv("induction"), iv("time-out"), ...ACCESS.map(op)];

  function paused(variant: string | undefined, claim: boolean | number, isolate: string[]) {
    const c = checklistCase({ counting: true });
    let s = reduce(c, createSession(c), { type: "start", ...(variant ? { variant } : {}) }).state;
    s = play(c, ready, s).s;
    const handle = (id: string) => s.procedure!.handles.find((h) => h.structure === id)!.handle;
    const r = play(c, [...isolate.map((id) => op({ op: "isolate", port: "C", handle: handle(id) })), op({ op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: claim } })], s);
    return { c, r };
  }

  it("in the usual anatomy, reporting two (or ticking the usual number) is credited; three is not", () => {
    for (const claim of [2, true] as const) {
      const { c, r } = paused(undefined, claim, ["cystic-duct", "cystic-artery"]);
      expect(r.rejected).toEqual([]);
      expect(evaluate(c, r.s, { procedure: { documented: "cvs", valid: true } })).toBe(true);
    }
    const { c, r } = paused(undefined, 3, ["cystic-duct", "cystic-artery"]);
    expect(evaluate(c, r.s, { procedure: { documented: "cvs", valid: true } })).toBe(false);
    expect(assess(c, r.s).procedure?.pauses.at(-1)).toMatchObject({ achieved: true, claimsMatchField: false });
  });

  it("with a second artery, three structures truly enter: 'two' is not credited even with all three freed, and 'three' is", () => {
    const all = ["cystic-duct", "cystic-artery", "posterior-cystic-artery"];
    const two = paused("posterior-artery", true, all);
    expect(two.r.s.procedure!.pauses.at(-1)).toMatchObject({ achieved: true, entering: { two: 3 } });
    expect(evaluate(two.c, two.r.s, { procedure: { documented: "cvs", valid: true } })).toBe(false);
    const three = paused("posterior-artery", 3, all);
    expect(evaluate(three.c, three.r.s, { procedure: { documented: "cvs", valid: true } })).toBe(true);
  });

  it("a number for a criterion that is not a count is refused", () => {
    const { r } = (() => {
      const c = checklistCase();
      return { r: play(c, [...ready, op({ op: "safety-pause", view: "cvs", claims: { triangle: 1, plate: true, two: true } })]) };
    })();
    expect(r.rejected.at(-1)?.message).toMatch(/not a count/);
  });

  it("'uncertain' names nothing: an irreversible step on it is on an unidentified structure", () => {
    const c = checklistCase();
    const s = play(c, ready).s;
    const cd = s.procedure!.handles.find((h) => h.structure === "cystic-duct")!.handle;
    const r = play(c, [
      op({ op: "isolate", port: "C", handle: cd }),
      op({ op: "identify", handle: cd, as: "uncertain" }),
      op({ op: "withdraw", port: "C" }),
      op({ op: "insert", port: "C", instrument: "clip-applier" }),
      op({ op: "clip", port: "C", handle: cd, count: 2 }),
    ], s);
    expect(r.rejected).toEqual([]);
    expect(r.s.procedure!.claims[cd]).toBe("uncertain");
    expect(r.s.procedure!.unsafe.map((u) => u.code)).toContain("irreversible-on-unidentified");
  });
});
