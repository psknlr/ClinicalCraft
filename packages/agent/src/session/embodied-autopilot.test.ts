/**
 * The embodied offline autopilot (the reference agent, docs/EMBODIED.md §7):
 * every built-in case, in its own facility, in both locales, finishes with
 * every objective done and the same score as the clinical-mode autopilot —
 * walking, fetching and operating equipment instead of acting from anywhere.
 */
import { describe, expect, it } from "vitest";
import { assess, progress, type ClinicalAction } from "@clinicalcraft/core";
import { answerAll, builtinContent, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { MemoryTranscript } from "../transcript.js";

const content = await builtinContent();
const CASES = [...content.cases.keys()].sort();

interface Run {
  finished: boolean;
  done: number;
  total: number;
  score: number;
  distance: number;
  travelMinutes: number;
  cannot: string[];
}

async function autopilot(caseId: string, locale: string, clinical: boolean): Promise<Run> {
  const transcript = new MemoryTranscript();
  const t = await makeEmbodiedSession({ caseId, clinical, transcript, settingsPatch: { locale, approvalMode: "bypass" } });
  answerAll(t);
  let distance = 0;
  const cannot: string[] = [];
  t.session.subscribe((e) => {
    if (e.msg.type === "world_action_result" && e.msg.result.navigation && e.msg.result.status === "completed") distance += e.msg.result.navigation.length;
    if (e.msg.type === "agent_message" && /cannot do this|无法完成/.test(e.msg.text)) cannot.push(e.msg.text);
  });
  await t.session.run({ type: "autopilot", maxTurns: 40 });
  const c = t.session.caseDef;
  const p = progress(c, t.session.state);
  const travelMinutes = transcript
    .ofType("action")
    .map((i) => i.payload.action)
    .filter((a): a is Extract<ClinicalAction, { type: "advance-time" }> => a.type === "advance-time" && a.reason === "travel")
    .reduce((sum, a) => sum + a.minutes, 0);
  const run = { finished: t.session.state.finished, done: p.done, total: p.total, score: assess(c, t.session.state).score.percent, distance, travelMinutes, cannot };
  await t.session.close();
  return run;
}

describe("embodied offline autopilot — trace verification", () => {
  it("STEMI: every plan span is verified, the waits it inserts before a result is readable included", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    answerAll(t);
    await t.session.run({ type: "autopilot", maxTurns: 60 });
    expect(t.session.state.finished).toBe(true);
    const spans = t.session.trace().spans;
    const plans = spans.filter((s) => s.kind === "plan" && s.parentId === null);
    const waits = plans.filter((s) => s.name === "wait");
    expect(waits.length).toBeGreaterThan(0);
    for (const plan of plans) {
      const verification = spans.find((s) => s.parentId === plan.id && s.kind === "verification");
      expect(verification?.ok, `${plan.id} ${plan.name}`).toBe(true);
      expect(plan.ok, `${plan.id} ${plan.name}`).toBe(true);
    }
    // A wait's verification is the clock it advanced.
    for (const wait of waits) expect(wait.clockEnd! - wait.clockStart!).toBeGreaterThan(0);
    await t.session.close();
  });
});

describe("embodied offline autopilot — every built-in case, both locales", () => {
  it("covers the built-in library", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(10);
  });

  it.each(CASES)("%s: finishes in its own facility with the clinical-mode score (en + zh-CN)", { timeout: 120_000 }, async (caseId) => {
    for (const locale of ["en", "zh-CN"]) {
      const clinical = await autopilot(caseId, locale, true);
      const embodied = await autopilot(caseId, locale, false);
      const label = `${caseId} ${locale}`;
      expect(clinical.finished, label).toBe(true);
      expect(embodied.finished, label).toBe(true);
      expect(embodied.cannot, label).toEqual([]);
      expect(embodied.done, label).toBe(embodied.total);
      expect(embodied.score, label).toBe(clinical.score);
      // It walked (EMBODIED R8: and paid for it on a simulated clock).
      expect(embodied.distance, label).toBeGreaterThan(0);
      if (content.cases.get(caseId)!.def.clock.mode === "simulated") expect(embodied.travelMinutes, label).toBeGreaterThan(0);
      else expect(embodied.travelMinutes, label).toBe(0);
    }
  });
});
