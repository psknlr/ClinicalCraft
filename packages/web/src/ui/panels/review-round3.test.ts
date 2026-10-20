/**
 * Web panels resolve like the agent tools (review round 3): order notices
 * honour `unless`, the suggested questions leave out items superseded by a
 * phase twin, and the exam search breaks ties by specificity.
 */
import { resolveFinding } from "@clinicalcraft/agent";
import { createSession, historyAvailable, orderWarnings, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import { beforeAll, describe, expect, it } from "vitest";
import { loadContent } from "../../app/content.js";
import { resolveExamSearch, suggestedHistory } from "./conversation.js";
import { orderNotices } from "./orders.js";

// Full cases are lazy chunks: load the ones these tests use first.
beforeAll(async () => {
  for (const id of ["stemi-inferior-rv", "anaphylaxis-garden", "acute-appendicitis", "acute-ischemic-stroke"]) await loadContent().loadCase(id);
});
const getCase = (id: string): CaseDefinition => {
  const c = loadContent().peekCase(id);
  if (!c) throw new Error(`${id} missing`);
  return c;
};

describe("web order notices honour `unless` (as order_test does)", () => {
  it("the cath-lab-only notice is not shown in the cath lab", () => {
    const c = getCase("stemi-inferior-rv");
    const ed: SessionState = { ...createSession(c), started: true };
    const cath: SessionState = { ...ed, phase: "cath" };
    for (const L of ["en", "zh-CN"]) {
      expect(orderNotices(c, "Coronary angiography", "coronary-angiography", L, ed)).toEqual(orderWarnings(c, "Coronary angiography", "coronary-angiography", L, ed));
      expect(orderNotices(c, "Coronary angiography", "coronary-angiography", L, ed).length).toBeGreaterThan(0);
      expect(orderNotices(c, "Coronary angiography", "coronary-angiography", L, cath)).toEqual([]);
    }
  });
});

describe("web suggested questions use historyAvailable (phase twins)", () => {
  it("leave out an item superseded in the phase even when it is listed for that phase", () => {
    const c = structuredClone(getCase("anaphylaxis-garden"));
    const original = c.history.find((h) => h.id === "hpi-breathing")!;
    original.phases = [...(original.phases ?? []), "ed"]; // listed for the twin's phase too (CASE_AUTHORING §3 allows it)
    const ed: SessionState = { ...createSession(c), phase: "ed" };
    const ids = suggestedHistory(c, ed).map((h) => h.id);
    expect(ids).toContain("now-breathing-ed");
    expect(ids).not.toContain("hpi-breathing");
    expect(ids).toEqual(c.history.filter((h) => historyAvailable(c, h.id, "ed")).map((h) => h.id));
  });
});

describe("web exam search resolves like the examine tool", () => {
  it("breaks a tie with matchSpecificity", () => {
    const cases: [string, string, string, string][] = [
      ["acute-appendicitis", "skin turgor", "en", "ex-hydration"],
      ["acute-ischemic-stroke", "light reflex", "en", "gaze-pupils"],
      ["acute-ischemic-stroke", "颈动脉杂音", "zh-CN", "neck-carotid"],
    ];
    for (const [id, query, L, expected] of cases) {
      const c = getCase(id);
      const phase = createSession(c).phase;
      const tool = resolveFinding(c, { query }, L, phase);
      expect(tool).toEqual({ kind: "id", id: expected });
      expect(resolveExamSearch(c, query, L, phase).resolution).toEqual(tool);
    }
  });
});
