/**
 * Explicit holds (docs/PROTOCOL.md §3.1): an anaesthetist or attending withholding clearance is case state — who
 * placed it, why, and who released it after a recorded reassessment. While it stands the intervention is refused;
 * missing information alone never places one; only the holder releases it. And `explainCondition` names what a
 * condition still needs.
 */
import { describe, expect, it } from "vitest";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import { evaluate } from "./conditions.js";
import { explainCondition, requirementLeaves } from "./explain.js";
import { checkCaseIntegrity } from "./integrity.js";
import { parseCase } from "./parse.js";
import { createSession, reduce, replay } from "./reducer.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";

const L = (en: string) => ({ en, "zh-CN": en });

function theatreCase() {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.clock = { mode: "simulated", startTime: "08:00", actionCosts: { ask: 1, examine: 1, order: 1, read: 1, intervene: 0, answer: 0 } };
  raw.phases = [
    { id: "theatre", label: L("Theatre") },
    { id: "operation", label: L("Operation"), enterWhen: { intervened: "time-out", valid: true } },
  ];
  raw.procedure.phases = ["operation"];
  raw.interventions = [
    { id: "attach-monitor", name: L("Attach the monitor"), kind: "monitoring", maxDoses: 1 },
    { id: "sign-in", name: L("Sign In"), kind: "consult", checklist: true, maxDoses: 1, contraindicatedWhen: { not: { intervened: "attach-monitor" } } },
    { id: "induction", name: L("Induction"), kind: "airway", risk: "high", maxDoses: 1, contraindicatedWhen: { not: { intervened: "sign-in", valid: true } } },
    {
      id: "time-out",
      name: L("Time Out"),
      kind: "consult",
      checklist: true,
      maxDoses: 1,
      contraindicatedWhen: { not: { all: [{ intervened: "sign-in", valid: true }, { intervened: "induction" }] } },
    },
  ];
  raw.objectives = [
    {
      id: "periop",
      title: L("Checks"),
      hint: L("Sign In, induction, Time Out"),
      completeWhen: { all: [{ intervened: "sign-in", valid: true }, { intervened: "induction" }, { intervened: "time-out", valid: true }] },
      waypoints: [{ target: "patient" }],
    },
  ];
  raw.safetyGates = [...raw.safetyGates, { id: "under-hold", label: L("Held"), when: { held: "induction" }, verdict: "complication" }];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

const c = theatreCase();
const iv = (id: string): ClinicalAction => ({ type: "intervene", interventionId: id });
const hold = (by = "attending", reason = "antithrombotic status unknown after the stroke"): ClinicalAction => ({ type: "hold", interventionId: "induction", placedBy: by, reason });
const release = (by = "attending", reassessment = "Aspirin only, last dose 7 days ago: proceed."): ClinicalAction => ({
  type: "release-hold",
  interventionId: "induction",
  releasedBy: by,
  reassessment,
});

function play(actions: ClinicalAction[], from?: SessionState) {
  let s = from ?? reduce(c, createSession(c), { type: "start" }).state;
  const rejected: { type: string; code: string; message: string }[] = [];
  for (const a of actions) {
    const r = reduce(c, s, a);
    if (r.rejected) rejected.push({ type: a.type, ...r.rejected });
    s = r.state;
  }
  return { s, rejected };
}

describe("explicit holds", () => {
  it("the case with a `held` condition passes the integrity checks", () => {
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("missing information alone places no hold: induction after a valid Sign In proceeds", () => {
    const r = play([iv("attach-monitor"), iv("sign-in"), iv("induction")]);
    expect(r.rejected).toEqual([]);
    expect(r.s.interventions.map((x) => [x.interventionId, x.appropriateness])).toEqual([
      ["attach-monitor", "neutral"],
      ["sign-in", "neutral"],
      ["induction", "neutral"],
    ]);
    expect(r.s.holds).toBeUndefined();
  });

  it("a placed hold refuses induction with who and why; only the holder releases it, after a reassessment", () => {
    const placed = play([iv("attach-monitor"), iv("sign-in"), hold()]);
    expect(placed.rejected).toEqual([]);
    expect(placed.s.holds).toMatchObject([{ interventionId: "induction", placedBy: "attending", reason: "antithrombotic status unknown after the stroke" }]);
    expect(evaluate(c, placed.s, { held: "induction" })).toBe(true);
    // the clinician claims approval and induces: refused, nothing recorded
    const tried = play([iv("induction")], placed.s);
    expect(tried.rejected).toEqual([{ type: "intervene", code: "on-hold", message: expect.stringContaining("placed by attending: antithrombotic status unknown") }]);
    expect(tried.s.interventions.some((x) => x.interventionId === "induction")).toBe(false);
    // somebody else cannot release it
    const notTheirs = play([release("clinician")], placed.s);
    expect(notTheirs.rejected[0]).toMatchObject({ code: "requirements-unmet", message: expect.stringContaining("only attending can release it") });
    expect(evaluate(c, notTheirs.s, { held: "induction" })).toBe(true);
    // the holder reassesses and releases (case-insensitively the same holder); induction now proceeds
    const released = play([release("Attending"), iv("induction")], placed.s);
    expect(released.rejected).toEqual([]);
    expect(released.s.holds?.[0]?.released).toMatchObject({ by: "Attending", reassessment: "Aspirin only, last dose 7 days ago: proceed." });
    expect(evaluate(c, released.s, { held: "induction" })).toBe(false);
    expect(released.s.interventions.at(-1)).toMatchObject({ interventionId: "induction" });
  });

  it("two holders: one release leaves the other's hold standing", () => {
    const r = play([hold("attending"), hold("anaesthetist", "airway not assessed"), release("attending"), iv("induction")]);
    expect(r.rejected.map((x) => x.code)).toEqual(["on-hold"]);
    expect(r.rejected[0]!.message).toContain("placed by anaesthetist: airway not assessed");
  });

  it("rejects a hold on an unknown or already-given intervention, a duplicate, and a release with nothing held", () => {
    const given = play([iv("attach-monitor"), iv("sign-in"), iv("induction")]);
    expect(play([hold()], given.s).rejected[0]?.code).toBe("invalid");
    expect(play([{ type: "hold", interventionId: "nope", placedBy: "attending", reason: "x" }]).rejected[0]?.code).toBe("unknown-id");
    expect(play([hold(), hold()]).rejected.map((x) => x.code)).toEqual(["invalid"]);
    expect(play([release()]).rejected[0]?.code).toBe("invalid");
    // an empty reason or reassessment is not a recorded reassessment
    expect(play([{ type: "hold", interventionId: "induction", placedBy: "attending", reason: "  " }]).rejected[0]?.code).toBe("invalid");
    expect(play([hold(), release("attending", "")]).rejected[0]?.code).toBe("invalid");
  });

  it("holds replay deterministically (a reload rebuilds them from the actions)", () => {
    const actions: ClinicalAction[] = [{ type: "start" }, iv("attach-monitor"), iv("sign-in"), hold(), iv("induction"), release(), iv("induction")];
    const a = replay(c, actions);
    const b = replay(c, actions);
    expect(a.state).toEqual(b.state);
    expect(a.rejections.map((x) => x.code)).toEqual(["on-hold"]);
  });
});

describe("explainCondition", () => {
  it("names what is met and what is still pending: induction recorded, the Time Out pending", () => {
    const { s } = play([iv("attach-monitor"), iv("sign-in"), iv("induction")]);
    const tree = explainCondition(c, s, c.objectives[0]!.completeWhen);
    expect(tree.met).toBe(false);
    expect(requirementLeaves(tree).map((r) => [r.kind === "leaf" ? JSON.stringify(r.cond) : r.kind, r.met])).toEqual([
      ['{"intervened":"sign-in","valid":true}', true],
      ['{"intervened":"induction"}', true],
      ['{"intervened":"time-out","valid":true}', false],
    ]);
  });

  it("keeps `any` and `not` whole", () => {
    const { s } = play([]);
    const tree = explainCondition(c, s, { all: [{ any: [{ intervened: "sign-in" }, { held: "induction" }] }, { not: { intervened: "induction" } }] });
    const leaves = requirementLeaves(tree);
    expect(leaves.map((x) => [x.kind, x.met])).toEqual([
      ["any", false],
      ["not", true],
    ]);
  });
});
