/**
 * A tongue capture as a new investigation (docs/STUDIES.md §8) and evidence with provenance and a picture
 * (docs/CASE_AUTHORING.md §5.2): the observations come from the tongue as it is at acquisition, what stains it then
 * and the station's capture; the acquisition keeps its picture as data; results and findings carry their provenance
 * and picture, and a branch that follows the record replaces them.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import type { StudyOp } from "../schema/study.js";
import { checkCaseIntegrity, createSession, parseCase, reduce, toldFinding, toldResult } from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const L = (en: string, zh: string) => ({ en, "zh-CN": zh });
const fixture = (): Json => JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));

const TONGUE = {
  code: "tongue-capture",
  name: L("Tongue image at the station", "舌象采集"),
  acquisition: "department",
  collectors: ["nurse"],
  requires: ["tongue-imaging"],
  model: {
    kind: "tongue",
    appearance: { body: "pale", shape: ["enlarged", "teeth-marked"], coating: { color: "white", thickness: "thin", texture: "greasy" } },
    changes: [{ when: { flag: "treated" }, appearance: { coating: { thickness: "thin", texture: "moist" } } }],
    stains: [{ id: "coffee", when: { not: { flag: "rinsed" } }, coating: { color: "brown", thickness: "thick" }, cause: L("coffee this morning", "早上喝了咖啡") }],
  },
};

function load(edit?: (json: Json) => void): CaseDefinition {
  const json = fixture();
  json.studies = [TONGUE];
  json.interventions = [...json.interventions, { id: "rinse", name: L("Rinse the mouth", "漱口"), kind: "other", setFlags: ["rinsed"] }, { id: "treat", name: L("Treat", "治疗"), kind: "other", setFlags: ["treated"] }];
  edit?.(json);
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3), null, 2));
  return parsed.value;
}

const study = (op: StudyOp): ClinicalAction => ({ type: "study", study: op, by: "system" });
function capture(c: CaseDefinition, s: SessionState, key: string): SessionState {
  const steps: ClinicalAction[] = [
    study({ op: "order", code: "tongue-capture", key, requester: "learner", priority: "routine" }),
  ];
  let state = s;
  for (const a of steps) state = reduce(c, state, a).state;
  const order = state.studies!.orders.at(-1)!.id;
  for (const a of [
    study({ op: "assign", order, to: "nurse" }),
    study({ op: "progress", order, stage: "en-route" }),
    study({ op: "progress", order, stage: "at-patient" }),
    study({ op: "acquire", order, collector: "nurse", quality: "good" }),
  ]) {
    const r = reduce(c, state, a);
    expect(r.rejected).toBeUndefined();
    state = r.state;
  }
  return state;
}
const text = (s: SessionState, id: string) => s.studies!.accessions.at(-1)!.observations.find((o) => o.id === id)?.text?.en;

describe("a tongue capture", () => {
  const c = load();
  const started = () => reduce(c, createSession(c), { type: "start" }).state;

  it("shows what lies on the tongue now: before a rinse the coffee stains the coating; after it, the tongue itself", () => {
    let s = capture(c, started(), "k1");
    expect(text(s, "body")).toBe("pale");
    expect(text(s, "shape")).toBe("enlarged, tooth marks at the edges");
    expect(text(s, "coating")).toBe("thick yellow-brown, greasy, over the whole surface");
    // the station's capture passes its check: it cannot see a stain
    expect(text(s, "capture")).toBe("standard light, colour card in the frame, in focus");
    expect(text(s, "quality")).toBe("passed");
    expect(s.studies!.accessions.at(-1)!.quality).toBe("good");
    const first = s.studies!.accessions.at(-1)!;
    expect(first.picture).toEqual({ kind: "tongue", appearance: { body: "pale", shape: ["enlarged", "teeth-marked"], coating: { color: "brown", thickness: "thick", texture: "greasy", distribution: "full" } }, capture: { light: "standard", colorCard: true, focus: "sharp" } });
    s = reduce(c, s, { type: "intervene", interventionId: "rinse" }).state;
    s = capture(c, s, "k2");
    expect(text(s, "coating")).toBe("thin white, greasy, over the whole surface");
    // the first capture keeps what it showed
    expect(s.studies!.accessions[0]!.picture).toEqual(first.picture);
    s = reduce(c, s, { type: "intervene", interventionId: "treat" }).state;
    s = capture(c, s, "k3");
    expect(text(s, "coating")).toBe("thin white, moist, over the whole surface");
  });

  it("a station that cannot check colour fails the capture, and the words name what a reader would see", () => {
    const warm = load((j) => (j.studies[0].model.capture = { light: "warm", colorCard: false }));
    const s = capture(warm, reduce(warm, createSession(warm), { type: "start" }).state, "k1");
    expect(text(s, "body")).toBe("pale red");
    expect(text(s, "quality")).toMatch(/^failed: Non-standard light \(warm room light\).*No colour reference card/u);
    expect(s.studies!.accessions.at(-1)!.quality).toBe("limited");
    // the picture keeps the tongue as captured and the light it was taken in; the drawing does the cast
    expect(s.studies!.accessions.at(-1)!.picture?.appearance.body).toBe("pale");
  });

  it("its conditions are checked like any other; a stain's id is unique", () => {
    const bad = load((j) => {
      j.studies[0].model.stains.push({ id: "coffee", when: { asked: "nope" }, coating: { color: "black" }, cause: L("x", "x") });
      j.studies[0].model.changes.push({ when: { intervened: "ghost" }, appearance: { body: "red" } });
    });
    const messages = checkCaseIntegrity(bad).map((i) => `${i.path}: ${i.message}`);
    expect(messages).toContain('studies.0.model.stains.1.id: duplicate stain id "coffee"');
    expect(messages.some((m) => m.startsWith("studies.0.model.stains.1.when") && m.includes('unknown history item "nope"'))).toBe(true);
    expect(messages.some((m) => m.startsWith("studies.0.model.changes.1.when") && m.includes('unknown intervention "ghost"'))).toBe(true);
    expect(checkCaseIntegrity(c).filter((i) => i.path.startsWith("studies"))).toEqual([]);
  });
});

describe("evidence with provenance and a picture", () => {
  const KIOSK = { kind: "tongue", appearance: { body: "pale", coating: { color: "brown", thickness: "thick", texture: "greasy", distribution: "root" } }, capture: { light: "warm", colorCard: false } };
  const kioskProvenance = { source: "patient-captured", by: L("the waiting-area intake kiosk", "候诊区自助问诊机"), capturedAt: L("Today 10:12", "今日10:12"), quality: { status: "failed", reasons: [L("No colour card", "无比色卡")] }, basis: "authored" };

  it("a result and a finding carry them; a branch that follows the record replaces them", () => {
    const c = load((j) => {
      const inv = j.investigations[0];
      const phase = Object.keys(inv.results)[0];
      inv.results[phase].picture = KIOSK;
      inv.results[phase].provenance = kioskProvenance;
      inv.results[phase].branches = [{ id: "rinsed", when: { flag: "rinsed" }, provenance: { ...kioskProvenance, quality: { status: "passed" } } }];
      j.exam[0].picture = { kind: "tongue", appearance: { body: "pale", coating: { color: "white", thickness: "thin" } } };
      j.exam[0].provenance = { source: "direct-observation" };
    });
    const inv = c.investigations[0]!;
    const phase = Object.keys(inv.results)[0]!;
    const s = reduce(c, createSession(c), { type: "start" }).state;
    const own = toldResult(c, s, inv.id, phase)!;
    expect(own.result.picture).toMatchObject({ kind: "tongue", capture: { light: "warm", colorCard: false } });
    expect(own.result.provenance).toMatchObject({ source: "patient-captured", quality: { status: "failed" } });
    const rinsed = toldResult(c, reduce(c, s, { type: "intervene", interventionId: "rinse" }).state, inv.id, phase)!;
    expect(rinsed.branch).toBe("rinsed");
    expect(rinsed.result.provenance?.quality?.status).toBe("passed");
    // what the branch does not replace stays the result's own
    expect(rinsed.result.picture).toEqual(own.result.picture);
    const found = toldFinding(c, s, c.exam[0]!);
    expect(found.picture?.kind).toBe("tongue");
    expect(found.provenance).toEqual({ source: "direct-observation" });
  });
});
