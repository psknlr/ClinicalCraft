/**
 * Decisions are named by their number in case order ("Decision 2" / "决策 2") — never by authored ids, which can
 * name the diagnosis or the answer ("carney", "phosphate-wasting") — and `answer_decision` / `/answer` read the
 * number back in the forms a learner or a model writes it, or an exact id (older clients).
 */
import { describe, expect, it } from "vitest";
import { decisionNumber, decisionRefFor, resolveDecisionRef } from "./decision-refs.js";

const c = { decisions: [{ id: "diagnosis" }, { id: "carney" }, { id: "2" }, { id: "d1" }, { id: "Phosphate-Wasting" }] };
const id = (ref: string) => resolveDecisionRef(c.decisions, ref)?.id;

describe("decision references", () => {
  it("number decisions in case order", () => {
    expect(c.decisions.map((d) => decisionNumber(c, d.id))).toEqual([1, 2, 3, 4, 5]);
    expect(decisionNumber(c, "nope")).toBe(0);
  });

  it("read a number in the forms people write it", () => {
    for (const ref of ["2", " 2 ", "D2", "d2", "#2", "Decision 2", "decision2", "DECISION 2", "决策2", "决策 2", "[2]", "(2)", "２", "（２）", "Ｄ２", "2.", "2)", "Decision 2.", "决策 2。"]) expect(id(ref), ref).toBe("carney");
  });

  it("a number in range wins over an id spelt the same; else an exact id, else a case-insensitive one", () => {
    // "2" is decision 2, not the decision whose id is "2" (decision 3); "d1" is decision 1.
    expect(id("2")).toBe("carney");
    expect(id("d1")).toBe("diagnosis");
    expect(id("carney")).toBe("carney");
    expect(id("CARNEY")).toBe("carney");
    expect(id("phosphate-wasting")).toBe("Phosphate-Wasting");
    for (const ref of ["0", "6", "D0", "", "  ", "nope", "dec 2", "第2个", "2a"]) expect(id(ref), ref).toBeUndefined();
  });

  it("callers holding ids pass the id, or the number when the id would read as another decision", () => {
    expect(decisionRefFor(c, "carney")).toBe("carney");
    expect(decisionRefFor(c, "2")).toBe("3");
    expect(decisionRefFor(c, "d1")).toBe("4");
    expect(decisionRefFor(c, "nope")).toBe("nope");
    for (const d of c.decisions) expect(id(decisionRefFor(c, d.id))).toBe(d.id);
  });
});
