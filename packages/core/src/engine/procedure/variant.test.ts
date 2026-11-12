/**
 * Anatomical variants (docs/PROCEDURE.md §9): the variant chosen at `start` is the patient's real
 * anatomy for the session. The operator's view and vocabulary are the same whatever the variant; the
 * consequences follow from the variant's anatomy (a duct crossing the triangle, a second artery, a duct
 * in the bed, a triangle that cannot be cleared safely).
 */
import { describe, expect, it } from "vitest";
import type { ClinicalAction } from "../../schema/session.js";
import type { ProcedureOp } from "../../schema/procedure.js";
import { assess } from "../assessment.js";
import { evaluate } from "../conditions.js";
import { checkCaseIntegrity } from "../integrity.js";
import { parseCase } from "../parse.js";
import { createSession, reduce } from "../reducer.js";
import { LAP_CHOLE_SIT, lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { observeField } from "./observe.js";
import { nameVocabulary, procedureFor, resolveProcedure, tubeVocabulary } from "./variant.js";

const c = lapCholeCase();

function begin(variant?: string) {
  let s = reduce(c, createSession(c), { type: "start", ...(variant ? { variant } : {}) }).state;
  s = reduce(c, s, { type: "set-phase", phase: "theatre" }).state;
  return s;
}

function run(variant: string | undefined, ops: ProcedureOp[], from = begin(variant)) {
  let s = from;
  const rejected: { op: ProcedureOp; message: string }[] = [];
  const signals: string[] = [];
  for (const op of ops) {
    const r = reduce(c, s, { type: "operate", op } as ClinicalAction);
    if (r.rejected) rejected.push({ op, message: r.rejected.message });
    for (const e of r.events) if (e.type === "procedure.step") signals.push(...e.signals);
    s = r.state;
  }
  return { s, p: s.procedure!, rejected, signals };
}

/** Test-only: the hidden handle of a structure. */
function handle(p: { handles: { handle: string; structure: string }[] }, structure: string): string {
  const h = p.handles.find((x) => x.structure === structure);
  if (!h) throw new Error(`no handle for ${structure}`);
  return h.handle;
}

const ACCESS: ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
];
const LATERAL: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" };
const BED_PULL: ProcedureOp = { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["anterior", "cephalad"], force: "firm" };
const steps = (n: number, region: string, energy = false): ProcedureOp[] => Array.from({ length: n }, () => ({ op: "dissect", port: "C", region, energy }) as ProcedureOp);
const TRIANGLE = steps(6, "hepatocystic-triangle");
const PLATE = steps(3, "cystic-plate");
const swap = (instrument: "clip-applier" | "scissors" | "hook" | "maryland" | "retrieval-bag"): ProcedureOp[] => [
  { op: "withdraw", port: "C" },
  { op: "insert", port: "C", instrument },
];
const PAUSE: ProcedureOp = { op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: true } };

/** Clip and divide every handle given (identified as named), after a true critical view. */
function secure(named: [string, string][]): ProcedureOp[] {
  return [
    ...named.map(([h]) => ({ op: "isolate", port: "C", handle: h }) as ProcedureOp),
    ...named.map(([h, as]) => ({ op: "identify", handle: h, as }) as ProcedureOp),
    PAUSE,
    ...swap("clip-applier"),
    ...named.map(([h]) => ({ op: "clip", port: "C", handle: h, count: 2 }) as ProcedureOp),
    ...swap("scissors"),
    ...named.map(([h]) => ({ op: "divide", port: "C", handle: h }) as ProcedureOp),
  ];
}

const FINISH: ProcedureOp[] = [...swap("retrieval-bag"), { op: "bag", port: "C" }, { op: "extract", port: "A" }, { op: "close" }];

describe("variants resolve over the base definition", () => {
  it("the fixture with its variants passes the integrity checks", () => {
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("a variant replaces, adds and patches; the base is untouched and resolution is cached", () => {
    const def = c.procedure!;
    const frozen = resolveProcedure(def, "frozen-triangle");
    expect(frozen.regions.find((r) => r.id === "hepatocystic-triangle")?.fibrosis?.safeTo).toBe(0.5);
    expect(frozen.regions.find((r) => r.id === "hepatocystic-triangle")?.units).toBe(6);
    expect(def.regions.find((r) => r.id === "hepatocystic-triangle")?.fibrosis).toBeUndefined();
    expect(resolveProcedure(def, "aberrant-duct").anatomy.some((s) => s.id === "aberrant-right-posterior-duct")).toBe(true);
    expect(def.anatomy.some((s) => s.id === "aberrant-right-posterior-duct")).toBe(false);
    expect(resolveProcedure(def, "frozen-triangle")).toBe(frozen);
    expect(resolveProcedure(def, "reference")).toBe(def);
    expect(resolveProcedure(def, undefined)).toBe(def);
  });

  it("start records the variant; an unknown one is refused", () => {
    expect(begin("frozen-triangle").variant).toBe("frozen-triangle");
    expect(begin().variant).toBeUndefined();
    const r = reduce(c, createSession(c), { type: "start", variant: "no-such" });
    expect(r.rejected?.code).toBe("unknown-id");
    expect(procedureFor(c, begin("posterior-artery"))?.anatomy.some((s) => s.id === "posterior-cystic-artery")).toBe(true);
  });

  it("the variant predicate reads the hidden truth (reference = the base)", () => {
    expect(evaluate(c, begin("frozen-triangle"), { procedure: { variant: "frozen-triangle" } })).toBe(true);
    expect(evaluate(c, begin(), { procedure: { variant: "reference" } })).toBe(true);
    expect(evaluate(c, begin("aberrant-duct"), { procedure: { variant: "reference" } })).toBe(false);
  });

  it("integrity reports a variant that patches a region the base lacks, removes an unknown structure or names a condition's unknown variant", () => {
    const raw = structuredClone(LAP_CHOLE_SIT) as unknown as { procedure: { variants: Record<string, unknown>[] }; safetyGates: Record<string, unknown>[] };
    raw.procedure.variants.push({ id: "bad", name: { en: "Bad", "zh-CN": "Bad" }, summary: { en: "x", "zh-CN": "x" }, provenance: "authored", remove: ["nothing"], regions: [{ id: "no-region", units: 2 }] });
    raw.safetyGates.push({ id: "v", label: { en: "v", "zh-CN": "v" }, when: { procedure: { variant: "missing" } }, verdict: "complication" });
    const parsed = parseCase(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const messages = checkCaseIntegrity(parsed.value).map((i) => i.message);
    expect(messages).toContain('unknown structure "nothing"');
    expect(messages.some((m) => m.includes('unknown region "no-region"'))).toBe(true);
    expect(messages).toContain('unknown procedure variant "missing"');
  });
});

describe("the variant is hidden from the operator", () => {
  it("the view lists the same names whatever the variant, and names of any variant can be given", () => {
    const views = [undefined, "aberrant-duct", "posterior-artery", "subvesical-duct", "frozen-triangle"].map((v) => observeField(procedureFor(c, begin(v))!, run(v, ACCESS).p));
    for (const v of views) expect(v.names).toEqual(views[0]!.names);
    expect(views[0]!.names).toContain("aberrant-right-posterior-duct");
    expect(views[0]!.names).toEqual(tubeVocabulary(c.procedure!));
    // naming a structure the patient does not have is accepted (and is simply wrong)
    const { p } = run(undefined, [...ACCESS, LATERAL, ...TRIANGLE]);
    const r = run(undefined, [{ op: "identify", handle: handle(p, "cystic-duct"), as: "aberrant-right-posterior-duct" }], run(undefined, [...ACCESS, LATERAL, ...TRIANGLE]).s);
    expect(r.rejected).toEqual([]);
    expect(nameVocabulary(c.procedure!)).toContain("posterior-cystic-artery");
  });

  it("no variant shows itself in the operator's view (only what the field shows)", () => {
    const text = JSON.stringify(observeField(procedureFor(c, begin("aberrant-duct"))!, run("aberrant-duct", [...ACCESS, LATERAL, ...TRIANGLE]).p));
    expect(text).not.toContain("Aberrant right posterior sectoral duct");
    expect(text).not.toContain('"aberrant-duct"');
  });
});

describe("consequences follow from the variant's anatomy", () => {
  it("aberrant duct: until the triangle is fully cleared it appears to enter the gallbladder, so the view does not hold; clipping it is a bile duct injury", () => {
    const partial = run("aberrant-duct", [...ACCESS, LATERAL, ...steps(5, "hepatocystic-triangle")]);
    const def = procedureFor(c, partial.s)!;
    const ab = handle(partial.p, "aberrant-right-posterior-duct");
    expect(observeField(def, partial.p).tubes.find((t) => t.handle === ab)?.appears?.en).toContain("seems to run into the gallbladder neck");
    const full = run("aberrant-duct", [...ACCESS, LATERAL, ...TRIANGLE, ...PLATE]);
    expect(observeField(def, full.p).tubes.find((t) => t.handle === ab)?.appears?.en).toContain("running down to the common duct");
    const cd = handle(full.p, "cystic-duct");
    const ca = handle(full.p, "cystic-artery");
    const safe = run("aberrant-duct", [...ACCESS, LATERAL, ...TRIANGLE, ...PLATE, ...secure([[cd, "cystic-duct"], [ca, "cystic-artery"]]), ...swap("hook"), BED_PULL, ...steps(4, "gallbladder-bed", true), ...FINISH]);
    expect(safe.rejected).toEqual([]);
    expect(safe.p.pauses.at(-1)?.achieved).toBe(true);
    expect(safe.p.injuries).toEqual([]);
    expect(assess(c, safe.s).safety.verdict).toBe("clear");
    // the duct taken for the cystic duct
    const wrong = run("aberrant-duct", [...ACCESS, LATERAL, ...TRIANGLE, ...PLATE, { op: "isolate", port: "C", handle: ab }, { op: "identify", handle: ab, as: "cystic-duct" }, ...swap("clip-applier"), { op: "clip", port: "C", handle: ab, count: 2 }]);
    expect(wrong.p.injuries.map((i) => [i.kind, i.structure])).toEqual([["bile-duct-injury", "aberrant-right-posterior-duct"]]);
    expect(assess(c, wrong.s).safety.verdict).toBe("safety-critical");
  });

  it("double cystic artery: the view needs the second artery free too; left alone it is torn when the bed is completed", () => {
    const d = run("posterior-artery", [...ACCESS, LATERAL, ...TRIANGLE, ...PLATE]);
    const cd = handle(d.p, "cystic-duct");
    const ca = handle(d.p, "cystic-artery");
    const pca = handle(d.p, "posterior-cystic-artery");
    // the reference-anatomy routine: two structures isolated, the pause is not truly achieved
    const routine = run("posterior-artery", [...ACCESS, LATERAL, ...TRIANGLE, ...PLATE, ...secure([[cd, "cystic-duct"], [ca, "cystic-artery"]]), ...swap("hook"), BED_PULL, ...steps(4, "gallbladder-bed", true)]);
    expect(routine.p.pauses.at(-1)?.achieved).toBe(false);
    expect(routine.p.unsafe.map((u) => u.code)).toContain("irreversible-without-view");
    expect(routine.p.injuries.map((i) => [i.kind, i.structure])).toEqual([["bleeding", "posterior-cystic-artery"]]);
    expect(routine.signals).toContain("bleeding");
    // all three secured: a true view, no injury
    const safe = run("posterior-artery", [...ACCESS, LATERAL, ...TRIANGLE, ...PLATE, ...secure([[cd, "cystic-duct"], [ca, "cystic-artery"], [pca, "posterior-cystic-artery"]]), ...swap("hook"), BED_PULL, ...steps(4, "gallbladder-bed", true), ...FINISH]);
    expect(safe.rejected).toEqual([]);
    expect(safe.p.pauses.at(-1)?.achieved).toBe(true);
    expect(safe.p.injuries).toEqual([]);
    expect(safe.p.specimen).toBe("extracted");
  });

  it("subvesical duct: completing the bed through it leaks bile unless it was clipped first", () => {
    const d = run("subvesical-duct", [...ACCESS, LATERAL, ...TRIANGLE, ...PLATE]);
    const cd = handle(d.p, "cystic-duct");
    const ca = handle(d.p, "cystic-artery");
    const prefix = [...ACCESS, LATERAL, ...TRIANGLE, ...PLATE, ...secure([[cd, "cystic-duct"], [ca, "cystic-artery"]]), ...swap("hook"), BED_PULL];
    const through = run("subvesical-duct", [...prefix, ...steps(4, "gallbladder-bed", true)]);
    expect(through.p.injuries.map((i) => [i.kind, i.structure])).toEqual([["bile-leak", "subvesical-duct"]]);
    expect(through.signals).toContain("bile-in-field");
    const three = run("subvesical-duct", [...prefix, ...steps(3, "gallbladder-bed", true)]);
    const sv = handle(three.p, "subvesical-duct");
    const careful = run("subvesical-duct", [{ op: "isolate", port: "C", handle: sv }, { op: "identify", handle: sv, as: "subvesical-duct" }, ...swap("clip-applier"), { op: "clip", port: "C", handle: sv, count: 2 }, ...swap("hook"), ...steps(1, "gallbladder-bed", true), ...FINISH], three.s);
    expect(careful.rejected).toEqual([]);
    expect(careful.p.injuries).toEqual([]);
    expect(careful.p.divided).toContain("subvesical-duct");
    expect(assess(c, careful.s).safety.verdict).toBe("clear");
  });

  it("dense fibrosis: dissection stops at the safe plane (felt, and seen once begun); going on tears the common bile duct; a subtotal ends safely", () => {
    const first = run("frozen-triangle", [...ACCESS, LATERAL, ...steps(1, "hepatocystic-triangle")]);
    const def = procedureFor(c, first.s)!;
    expect(observeField(def, first.p).regions.find((r) => r.id === "hepatocystic-triangle")?.finding?.en).toContain("dense");
    expect(observeField(procedureFor(c, begin())!, run(undefined, [...ACCESS, LATERAL, ...steps(1, "hepatocystic-triangle")]).p).regions.find((r) => r.id === "hepatocystic-triangle")?.finding).toBeUndefined();
    const stop = run("frozen-triangle", [...ACCESS, LATERAL, ...steps(3, "hepatocystic-triangle")]);
    expect(stop.signals).toContain("dense-fibrosis");
    expect(stop.p.cleared["hepatocystic-triangle"]).toBe(3);
    expect(stop.p.injuries).toEqual([]);
    expect(stop.p.unsafe).toEqual([]);
    // nothing in the triangle can be freed short of the plane
    const cd = handle(stop.p, "cystic-duct");
    expect(run("frozen-triangle", [{ op: "isolate", port: "C", handle: cd }], stop.s).rejected).toHaveLength(1);
    const onward = run("frozen-triangle", steps(1, "hepatocystic-triangle"), stop.s);
    expect(onward.p.unsafe.map((u) => u.code)).toEqual(["dissection-beyond-safe-plane"]);
    expect(onward.p.injuries.map((i) => [i.kind, i.structure, i.visible])).toEqual([["bile-duct-injury", "common-bile-duct", true]]);
    expect(onward.signals).toContain("bile-in-field");
    expect(assess(c, onward.s).safety.verdict).toBe("safety-critical");
    const bail = run("frozen-triangle", [{ op: "bailout", strategy: "subtotal-fenestrating" }, { op: "close" }], stop.s);
    expect(bail.rejected).toEqual([]);
    expect(bail.p.closed).toBe(true);
    expect(bail.p.injuries).toEqual([]);
    expect(assess(c, bail.s).safety.verdict).toBe("clear");
  });

  it("an energy step that would pass the safe plane stops at it", () => {
    const r = run("frozen-triangle", [...ACCESS, LATERAL, ...swap("hook"), ...steps(2, "hepatocystic-triangle", true)]);
    expect(r.p.cleared["hepatocystic-triangle"]).toBe(3);
    expect(r.signals).toContain("dense-fibrosis");
    expect(r.p.injuries).toEqual([]);
  });
});
