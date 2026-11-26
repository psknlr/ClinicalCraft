import { describe, expect, it } from "vitest";
import { analyzeNegation } from "./negation.js";

/** The parts of an analysis most tests check. */
function read(text: string) {
  const a = analyzeNegation(text);
  return { scopes: a.scopes, affirmative: a.affirmative, double: a.doubleNegated.length > 0 };
}

describe("analyzeNegation", () => {
  it("returns text without a cue whole", () => {
    expect(analyzeNegation("give aspirin 300 mg")).toEqual({ negated: false, affirmative: "give aspirin 300 mg", scopes: [], context: [], doubleNegated: [] });
  });

  it("a cue negates the rest of its clause (en)", () => {
    expect(read("don't give GTN")).toEqual({ scopes: ["give gtn"], affirmative: "", double: false });
    expect(read("hold the heparin").scopes).toEqual(["the heparin"]);
    expect(read("give paracetamol, not morphine")).toEqual({ scopes: ["morphine"], affirmative: "give paracetamol", double: false });
    expect(read("keep her flat, legs elevated, no standing")).toEqual({ scopes: ["standing"], affirmative: "keep her flat legs elevated", double: false });
    expect(read("antibiotics instead of surgery")).toEqual({ scopes: ["surgery"], affirmative: "antibiotics", double: false });
    expect(read("hold off on medication — diet and exercise first")).toEqual({ scopes: ["on medication"], affirmative: "diet and exercise first", double: false });
    expect(read("Nil by mouth").scopes).toEqual(["by mouth"]);
  });

  it("a cue negates the rest of its clause (zh-CN)", () => {
    expect(read("不要静推氯化钾").scopes).toEqual(["静推氯化钾"]);
    expect(read("暂时不插管").scopes).toEqual(["插管"]);
    expect(read("停用阿替普酶").scopes).toEqual(["阿替普酶"]);
    expect(read("家里别抽烟")).toEqual({ scopes: ["抽烟"], affirmative: "家里", double: false });
    expect(read("不吃不喝").scopes).toEqual(["吃", "喝"]);
    expect(read("不要吗啡、芬太尼").scopes).toEqual(["吗啡、芬太尼"]);
  });

  it("negates the words before a cue that has nothing after it, a predicate, or a participle after its object", () => {
    expect(read("吗啡先不给").scopes).toEqual(["吗啡"]);
    expect(read("肝素停掉").scopes).toEqual(["肝素"]);
    expect(read("aspirin not indicated").scopes).toEqual(["aspirin"]);
    expect(read("the aspirin is held until the scan").scopes).toEqual(["the aspirin is"]);
    expect(read("stopped the heparin").scopes).toEqual(["the heparin"]);
    expect(read("morphine — no").scopes).toEqual(["morphine"]);
    expect(read("oxygen: not needed").scopes).toEqual(["oxygen"]);
  });

  it("carries a negation over 'and' / 'or' and keeps a subordinate clause out of both readings", () => {
    expect(read("do not intubate and ventilate").scopes).toEqual(["intubate and ventilate"]);
    expect(read("don't give morphine or fentanyl").scopes).toEqual(["give morphine or fentanyl"]);
    expect(analyzeNegation("nothing to eat, until the operation")).toMatchObject({ scopes: ["to eat"], affirmative: "", context: ["until the operation"] });
    expect(analyzeNegation("先不给吗啡，等外科医生查完体再说")).toMatchObject({ scopes: ["给吗啡"], affirmative: "", context: ["等外科医生查完体再说"] });
    expect(analyzeNegation("give aspirin, until the scan is back")).toMatchObject({ negated: false, affirmative: "give aspirin until the scan is back", context: [] });
  });

  it("reads a double negative neither way", () => {
    for (const text of ["do not delay antibiotics", "don't stop the pump", "no need to stop the infusion", "never withhold oxygen", "不要停泵", "别停胰岛素"]) {
      expect(analyzeNegation(text)).toMatchObject({ negated: false, scopes: [], affirmative: "", doubleNegated: [text.toLowerCase()] });
    }
    expect(read("intubate, no delay")).toEqual({ scopes: [], affirmative: "intubate", double: true });
  });

  it("reads Latin letters in Chinese text as words (不做ERCP)", () => {
    for (const text of ["不做ERCP", "不要做ERCP", "暂不做ERCP", "没必要做ERCP", "没有必要做ERCP", "不必做ERCP", "不能做ERCP"]) {
      expect(read(text), text).toEqual({ scopes: ["做ercp"], affirmative: "", double: false });
    }
    expect(read("先不查CT，做B超").scopes).toEqual(["查ct"]);
  });

  it("reads a Chinese predicate backward when something comes before it", () => {
    expect(read("ERCP没有指征")).toEqual({ scopes: ["ercp"], affirmative: "", double: false });
    expect(read("溶栓无指征").scopes).toEqual(["溶栓"]);
    expect(read("出院还不行")).toEqual({ scopes: ["出院还"], affirmative: "", double: false });
    expect(read("吗啡不可以给").scopes).toEqual(["吗啡"]);
    expect(read("不可以给吗啡").scopes).toEqual(["给吗啡"]);
    expect(read("没有指征做ERCP").scopes).toEqual(["做ercp"]);
  });

  it("a cue followed only by a verb of taking negates what comes before it", () => {
    expect(read("新斯的明不要再吃了")).toEqual({ scopes: ["新斯的明"], affirmative: "", double: false });
    expect(read("新斯的明别吃了")).toEqual({ scopes: ["新斯的明"], affirmative: "", double: false });
    expect(read("这个药先不要服了").scopes).toEqual(["这个药"]);
    expect(read("不吃不喝").scopes).toEqual(["吃", "喝"]);
    expect(read("不要吃阿司匹林").scopes).toEqual(["吃阿司匹林"]);
  });

  it("a hold's duration is no object of the negation", () => {
    expect(read("去氨加压素停一次").scopes).toEqual(["去氨加压素"]);
    expect(read("肝素停3天").scopes).toEqual(["肝素"]);
    expect(read("heparin — hold it for 2 days").scopes).toEqual(["heparin"]);
    expect(read("hold the heparin for 2 days").scopes).toEqual(["the heparin for 2 days"]);
  });

  it("reads 'isn't indicated' as a predicate and 'without' as a cue, but not 'without delay'", () => {
    expect(read("Lavage isn't indicated")).toEqual({ scopes: ["lavage"], affirmative: "", double: false });
    expect(read("antibiotics aren't needed").scopes).toEqual(["antibiotics"]);
    expect(read("Do the CT without sedation")).toEqual({ scopes: ["sedation"], affirmative: "do the ct", double: false });
    expect(read("discharge without follow-up")).toEqual({ scopes: ["follow-up"], affirmative: "discharge", double: false });
    for (const text of ["Give antibiotics without delay", "continue CPR without stopping", "start the infusion without any delay", "intubate without hesitation"]) {
      expect(analyzeNegation(text), text).toMatchObject({ negated: false, affirmative: text.toLowerCase(), doubleNegated: [] });
    }
  });

  it("reads lifting a withholding as a double negative (解除禁食, don't keep her nil by mouth)", () => {
    for (const text of ["解除禁食", "don't keep her nil by mouth", "she doesn't need to be nil by mouth"]) {
      expect(analyzeNegation(text), text).toMatchObject({ negated: false, scopes: [], doubleNegated: [text.toLowerCase()] });
    }
  });

  it("ignores words that only look like cues", () => {
    for (const text of [
      "用不透气的敷料封住伤口",
      "不透明",
      "hold pressure on the groin",
      "stop the bleeding",
      "non-rebreather mask",
      "No, give paracetamol",
      "心脏骤停，立即胸外按压",
      "呼吸暂停",
      "要不要溶栓",
      "给不给吗啡",
      "阿莫西林",
      "鉴别诊断",
      "胸闷不适，吸氧",
      "不得不插管",
      "剂量不超过10 mg",
    ]) {
      expect(analyzeNegation(text).negated, text).toBe(false);
    }
  });
});
