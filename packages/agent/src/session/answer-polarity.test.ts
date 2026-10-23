import { describe, expect, it } from "vitest";
import { answerPolarity, deniedDetailViolation, isPolarQuestion, polarityViolation } from "./answer-polarity.js";

describe("isPolarQuestion", () => {
  it("reads yes/no questions in English and Chinese", () => {
    for (const q of ["Do you smoke?", "Any vomiting?", "Ever had a stroke?", "Pain in your chest?", "OK. Has he had his flu jab?", "Any nausea or tummy pain?", "有没有发烧？", "过敏吗？", "疼不疼？", "还是疼吗？"]) {
      expect(isPolarQuestion(q), q).toBe(true);
    }
  });

  it("leaves choices and questions for information alone", () => {
    for (const q of ["When did it start?", "Is it sharp or dull?", "OK, and what brings you in today?", "以前有什么病？", "是持续疼还是一阵一阵的？", "他预防药用的是什么？", "家里都有谁？"]) {
      expect(isPolarQuestion(q), q).toBe(false);
    }
  });
});

describe("answerPolarity", () => {
  it("reads a lead word", () => {
    expect(answerPolarity("Yes, since Tuesday.", "Any fever?")).toBe("yes");
    expect(answerPolarity("No… nothing… there wasn't time…", "Have you taken anything for it?")).toBe("no");
    expect(answerPolarity("Not any more — he quit ten years ago.", "Is he a smoker?")).toBe("no");
    expect(answerPolarity("（妻子）有，十来年了。", "他有高血压吗？")).toBe("yes");
    expect(answerPolarity("没有，从来没碰过。", "用过大麻吗？")).toBe("no");
    expect(answerPolarity("都没有，不恶心也不吐。", "有没有恶心呕吐？")).toBe("no");
    expect(answerPolarity("不疼。", "小便疼吗？")).toBe("no");
    expect(answerPolarity("Down there? No… no pain, no swelling.", "Any pain in your testicles?")).toBe("no");
  });

  it("else reads the first clause naming the question's topic", () => {
    expect(answerPolarity("I've had high blood pressure for many years.", "Do you have high blood pressure?")).toBe("yes");
    expect(answerPolarity("My chest doesn't hurt, it's my back.", "Does your chest hurt?")).toBe("no");
    expect(answerPolarity("(Patient) Head… doesn't hurt. Neck… not stiff.", "Any stiff neck?")).toBe("no");
    expect(answerPolarity("（病人）过敏……没有。", "对什么过敏吗？")).toBe("no");
    expect(answerPolarity("下午看电脑上的字有点模糊。", "看东西模糊吗？")).toBe("yes");
    expect(answerPolarity("Mostly water, I suppose.", "Any vomiting?")).toBe(null);
    // an authored fact reads as its first clause when nothing else decides
    expect(answerPolarity("I've felt sick since about midday. I threw up once around 10 last night.", "Any vomiting?", true)).toBe("yes");
  });

  it("does not read uncertainty, limits or inability as an answer either way", () => {
    expect(answerPolarity("I'm not sure, I don't remember.", "Any fever?")).toBe(null);
    expect(answerPolarity("不太清楚，没注意。", "发烧了吗？")).toBe(null);
    expect(answerPolarity("Only now and then, at the weekend.", "Does he drink?", true)).toBe(null);
    expect(answerPolarity("I can't breathe properly.", "Are you short of breath?")).toBe("yes");
    expect(answerPolarity("喘不上来气。", "喘吗？")).toBe("yes");
    expect(answerPolarity("不舒服，胸口闷。", "胸口闷吗？")).toBe("yes");
  });
});

describe("polarityViolation", () => {
  const vomiting = "I've felt sick since about midday. I threw up once around 10 last night — mostly the water I'd drunk. Nothing since.";

  it("blocks a yes/no answer the facts used turn around", () => {
    expect(polarityViolation("No, I haven't vomited at all.", "Any vomiting?", [vomiting])).toBe('polarity "no" (facts: "yes")');
    expect(polarityViolation("有，咳嗽好几天了。", "最近有没有感冒、咳嗽？", ["没有，嗓子不疼，也没流鼻涕、没咳嗽。"])).toBe('polarity "yes" (facts: "no")');
    expect(polarityViolation("I threw up once around 10 last night. Nothing since.", "Any vomiting?", [vomiting])).toBe(null);
  });

  it("excuses a mixed answer that shares what the facts affirm", () => {
    const smoking = "(Wife) He used to — a pack a day for thirty years. He quit ten years ago and hasn't touched one since.";
    expect(polarityViolation("(Wife) Not any more — he quit ten years ago.", "Is he a smoker?", [smoking])).toBe(null);
    expect(polarityViolation("(Wife) No, never.", "Is he a smoker?", [smoking])).toBe('polarity "no" (facts: "yes")');
  });

  it("blocks a yes/no answer when no fact was used, unless the question is a request or about feelings", () => {
    expect(polarityViolation("No, my heart's fine.", "Do you have any heart problems?", [])).toBe('polarity "no" (no fact used)');
    expect(polarityViolation("没有哮喘。", "有没有哮喘？", [])).toBe('polarity "no" (no fact used)');
    expect(polarityViolation("I'm not sure, doctor.", "Do you have diabetes?", [])).toBe(null);
    expect(polarityViolation("Yes, go ahead.", "Can I examine your tummy?", [])).toBe(null);
    expect(polarityViolation("No, not really.", "Are you OK?", [])).toBe(null);
    expect(polarityViolation("好一点了。", "好点了吗？", [])).toBe(null);
    expect(polarityViolation("No, it started yesterday.", "When did it start?", [])).toBe(null);
  });
});

describe("deniedDetailViolation", () => {
  const stockings = "They put tight stockings on me before the operation — too tight, so I took them off on the second day after the operation and haven't worn them since. I've never had a leg-pump machine.";

  it("blocks a detail a fact used denies", () => {
    expect(deniedDetailViolation("Yes, I've had them on the whole time, and the leg pumps too.", [stockings], [stockings])).toBe('denied detail "pump"');
    expect(deniedDetailViolation("（妻子）他抽筋了，还咬了舌头。", ["（妻子）没有。他从来没抽过筋，也没有咬舌头。"], [])).toBe('denied detail "舌头"');
  });

  it("reads negation, fronted topics and the end of a denial", () => {
    expect(deniedDetailViolation("The leg pumps — never had them.", [stockings], [stockings])).toBe(null);
    expect(deniedDetailViolation("Leg pumps? No, never.", [stockings], [stockings])).toBe(null);
    expect(deniedDetailViolation("It started this morning.", ["I haven't eaten anything since this morning."], [])).toBe(null);
    expect(deniedDetailViolation("The pain is in my back.", ["No pain in my chest."], [])).toBe(null);
    expect(deniedDetailViolation("Yes, there's pain in my chest.", ["No pain in my chest."], [])).toBe('denied detail "pain"');
  });
});
