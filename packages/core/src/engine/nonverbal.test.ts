/**
 * Patients who cannot speak (`patient.nonVerbalWhen` / `nonVerbalReason`,
 * docs/CASE_AUTHORING.md §2): while the condition holds the patient never
 * speaks — history goes to the companion when the case has one (whatever
 * `answersHistory` says), otherwise nobody can answer and the engine refuses
 * the question, so no fact is credited from the patient.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import { checkCaseIntegrity, createSession, historyVoice, parseCase, patientCues, patientNonVerbal, reduce, replay, verifyCase } from "./index.js";

type Json = Record<string, any>;
const raw = (): Json => JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));

function build(patch: (json: Json) => void): CaseDefinition {
  const json = raw();
  patch(json);
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const REASON = { "zh-CN": "气管插管镇静中", en: "intubated and sedated" };
const COMPANION = { role: "spouse", name: { en: "Sam Chen", "zh-CN": "陈山" }, persona: { en: "Her husband", "zh-CN": "她的丈夫" } };

describe("patient.nonVerbalWhen", () => {
  it("accepts the condition shapes content is authored with", () => {
    for (const when of [{ always: true }, { phase: "observation" }, { any: [{ phase: "arrival" }, { phase: "observation" }] }, { intervened: "epi" }]) {
      const c = build((j) => Object.assign(j.patient, { nonVerbalWhen: when, nonVerbalReason: REASON }));
      expect(c.patient.nonVerbalWhen).toEqual(when);
      expect(c.patient.nonVerbalReason).toEqual(REASON);
    }
  });

  it("holds only while its condition does (and never without one)", () => {
    const plain = build(() => undefined);
    expect(patientNonVerbal(plain, createSession(plain))).toBe(false);
    const c = build((j) => Object.assign(j.patient, { nonVerbalWhen: { intervened: "epi" }, nonVerbalReason: REASON }));
    const before = replay(c, [{ type: "start" }]).state;
    expect(patientNonVerbal(c, before)).toBe(false);
    const after = replay(c, [{ type: "start" }, { type: "intervene", interventionId: "epi" }]).state;
    expect(patientNonVerbal(c, after)).toBe(true);
  });

  it("routes history: the companion answers while the patient cannot, whatever answersHistory says", () => {
    const quiet = build((j) => {
      Object.assign(j.patient, { nonVerbalWhen: { always: true }, nonVerbalReason: REASON });
      j.patient.persona.companion = { ...COMPANION, answersHistory: false };
    });
    const s = replay(quiet, [{ type: "start" }]).state;
    expect(historyVoice(quiet, s, "allergies")).toBe("companion");
    expect(historyVoice(quiet, s)).toBe("companion");
    // speaking normally: the patient answers unless the companion answers history
    const speaking = build((j) => (j.patient.persona.companion = { ...COMPANION, answersHistory: false }));
    expect(historyVoice(speaking, createSession(speaking), "allergies")).toBe("patient");
    const carer = build((j) => {
      j.patient.persona.companion = { ...COMPANION, answersHistory: true };
      j.history.find((h: Json) => h.id === "breathing").speaker = "patient";
    });
    expect(historyVoice(carer, createSession(carer), "allergies")).toBe("companion");
    expect(historyVoice(carer, createSession(carer), "breathing")).toBe("patient");
    // nobody to answer
    const alone = build((j) => Object.assign(j.patient, { nonVerbalWhen: { always: true }, nonVerbalReason: REASON }));
    expect(historyVoice(alone, createSession(alone), "allergies")).toBe("none");
  });

  it("the engine refuses a question nobody can answer (no fact credited), and accepts it through the companion", () => {
    const alone = build((j) => Object.assign(j.patient, { nonVerbalWhen: { intervened: "epi" }, nonVerbalReason: REASON }));
    let s = replay(alone, [{ type: "start" }, { type: "ask", itemId: "trigger" }]).state;
    expect(s.asked).toEqual(["trigger"]);
    s = reduce(alone, s, { type: "intervene", interventionId: "epi" }).state;
    const refused = reduce(alone, s, { type: "ask", itemId: "allergies" });
    expect(refused.rejected?.code).toBe("cannot-answer");
    expect(refused.state.asked).toEqual(["trigger"]);
    const withCompanion = build((j) => {
      Object.assign(j.patient, { nonVerbalWhen: { intervened: "epi" }, nonVerbalReason: REASON });
      j.patient.persona.companion = { ...COMPANION, answersHistory: false };
    });
    const r = replay(withCompanion, [{ type: "start" }, { type: "intervene", interventionId: "epi" }, { type: "ask", itemId: "allergies" }]);
    expect(r.rejections).toEqual([]);
    expect(r.state.asked).toEqual(["allergies"]);
  });

  it("is a bystander cue", () => {
    const c = build((j) => Object.assign(j.patient, { nonVerbalWhen: { intervened: "epi" }, nonVerbalReason: REASON }));
    expect(patientCues(c, replay(c, [{ type: "start" }]).state).nonVerbal).toBe(false);
    expect(patientCues(c, replay(c, [{ type: "start" }, { type: "intervene", interventionId: "epi" }]).state).nonVerbal).toBe(true);
  });

  it("is checked by cases validate: its ids, and a reason to narrate", () => {
    const unknown = build((j) => Object.assign(j.patient, { nonVerbalWhen: { phase: "icu" }, nonVerbalReason: REASON }));
    expect(checkCaseIntegrity(unknown)).toContainEqual({ path: "patient.nonVerbalWhen.phase", message: 'unknown phase "icu"', severity: "error" });
    const silent = build((j) => (j.patient.nonVerbalWhen = { always: true }));
    expect(checkCaseIntegrity(silent).filter((i) => i.path === "patient.nonVerbalReason").map((i) => i.severity)).toEqual(["warning"]);
    const stray = build((j) => (j.patient.nonVerbalReason = REASON));
    expect(checkCaseIntegrity(stray).filter((i) => i.path === "patient.nonVerbalReason").map((i) => i.severity)).toEqual(["warning"]);
    const ok = build((j) => Object.assign(j.patient, { nonVerbalWhen: { phase: "observation" }, nonVerbalReason: REASON }));
    expect(checkCaseIntegrity(ok).filter((i) => i.path.startsWith("patient."))).toEqual([]);
  });

  it("a reference solution that asks the patient while nobody can answer fails verification (the step is refused)", () => {
    const c = build((j) => Object.assign(j.patient, { nonVerbalWhen: { always: true }, nonVerbalReason: REASON }));
    const r = replay(c, c.solution);
    expect(r.rejections.filter((x) => x.action.type === "ask").map((x) => x.code)).toEqual(["cannot-answer", "cannot-answer"]);
    expect(verifyCase(c).ok).toBe(false);
  });
});
