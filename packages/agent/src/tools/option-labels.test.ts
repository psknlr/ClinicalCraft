/**
 * Decision options are presented by letter (A, B, C… in `presentedOptions` order) and read back from a letter, a
 * 1-based number or — for callers that predate the letters — an exact authored id; a letter in range always wins
 * over an authored id spelt the same.
 */
import { presentedOptions } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { labelledOptions, optionLabel, optionLabelsFor, optionTokens, resolveOptionToken, resolveOptionTokens } from "./option-labels.js";

const c = { id: "case-x" };
const decision = {
  id: "dx",
  options: [
    { id: "supported", text: "Inferior STEMI" },
    { id: "alternative-1", text: "Pulmonary embolism" },
    { id: "alternative-2", text: "Aortic dissection" },
    { id: "Mixed.Case", text: "Pericarditis" },
  ],
};

describe("option labels", () => {
  it("letters the options in presentation order", () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(optionLabel)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA"]);
    const labelled = labelledOptions(c, decision);
    expect(labelled.map((o) => o.option)).toEqual(presentedOptions(c, decision));
    expect(labelled.map((o) => o.label)).toEqual(["A", "B", "C", "D"]);
  });

  it("reads a letter (any case, full-width, bracketed, a list marker's), a 1-based number or an exact id", () => {
    const labelled = labelledOptions(c, decision);
    const id = (token: string) => resolveOptionToken(labelled, token)?.option.id;
    const second = labelled[1]!.option.id;
    for (const token of ["B", "b", " b ", "Ｂ", "[B]", "(b)", "（Ｂ）", "2", "２", "B.", "b)", "Ｂ）", "Ｂ。", "2.", "B )"]) expect(id(token), token).toBe(second);
    expect(id("supported")).toBe("supported");
    expect(id("alternative-2")).toBe("alternative-2");
    // an id in another case, when only one option has it
    expect(id("mixed.case")).toBe("Mixed.Case");
    // One trailing marker only, and never a bracket's half.
    for (const token of ["E", "5", "0", "", "  ", "nope", "[supported]", "A B", "B..", "B).", "(B", ".", ")"]) expect(id(token), token).toBeUndefined();
  });

  it("a letter or number in range is the presented option, even when an authored id is spelt the same", () => {
    // The schema allows one-letter authored ids ("a"…"e" in this synthetic decision): the letters a learner reads win.
    const lettered = { id: "abx-timing", options: ["a", "b", "c", "d", "e"].map((x) => ({ id: x, text: `option ${x}` })) };
    const labelled = labelledOptions(c, lettered);
    for (const o of labelled) {
      expect(resolveOptionToken(labelled, o.label)).toBe(o);
      expect(resolveOptionToken(labelled, o.label.toLowerCase())).toBe(o);
    }
    expect(labelled.some((o) => o.label.toLowerCase() !== o.option.id)).toBe(true);
    // callers that hold authored ids pass the letters: the round trip names the same options
    const ids = ["c", "a"];
    const letters = optionLabelsFor(c, lettered, ids);
    expect(letters.map((l) => resolveOptionToken(labelled, l)!.option.id)).toEqual(ids);
    // an id the decision lacks is kept as it is
    expect(optionLabelsFor(c, lettered, ["zz"])).toEqual(["zz"]);
  });

  it("one tokenizer: commas, 、, semicolons, plus signs and spaces split an item; full-width forms stay for the resolver; separators alone give none", () => {
    expect(optionTokens(["A, C"])).toEqual(["A", "C"]);
    expect(optionTokens(["Ａ，Ｃ", "b；d", "e、f", " g  h ", "i;j"])).toEqual(["Ａ", "Ｃ", "b", "d", "e", "f", "g", "h", "i", "j"]);
    expect(optionTokens("A,B")).toEqual(["A", "B"]);
    // The CLI's own rendering of several options ("answer_decision(2: A+C)") reads back.
    expect(optionTokens(["A+C", "B ＋ D"])).toEqual(["A", "C", "B", "D"]);
    for (const value of [[","], [";"], ["、"], [" ，; 、 "], ["+"], [], undefined, 7]) expect(optionTokens(value), JSON.stringify(value)).toEqual([]);
    // A non-string item names nothing.
    expect(optionTokens([1, null, "B"])).toEqual(["B"]);
  });

  it("resolveOptionTokens: each option once, in the order first named; the tokens naming none once each", () => {
    const labelled = labelledOptions(c, decision);
    const supported = labelled.find((o) => o.option.id === "supported")!.label;
    const { chosen, unresolved } = resolveOptionTokens(labelled, optionTokens(["C, a", "1", "Ｃ", "zz", "zz; supported", "[c]"]));
    expect(chosen.map((o) => o.label)).toEqual([...new Set(["C", "A", supported])]);
    expect(unresolved).toEqual(["zz"]);
    expect(resolveOptionTokens(labelled, [])).toEqual({ chosen: [], unresolved: [] });
  });
});
