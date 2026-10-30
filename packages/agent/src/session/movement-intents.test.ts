/**
 * Movement requests in the learner's words (`movement-intents.ts`): both languages, anchored to the whole short
 * utterance — a history question that merely contains one of the words stays talk.
 */
import { describe, expect, it } from "vitest";
import { destinationCapability, meansHome, movementIntent } from "./movement-intents.js";

describe("said to the patient", () => {
  it.each([
    ["Follow me", { kind: "follow", destination: null }],
    ["Please follow me.", { kind: "follow", destination: null }],
    ["OK Mr Wang, come with me please", { kind: "follow", destination: null }],
    ["Could you walk with me?", { kind: "follow", destination: null }],
    ["Come with me to the CT scanner, please", { kind: "follow", destination: "CT scanner" }],
    ["Let's go to radiology", { kind: "follow", destination: "radiology" }],
    ["Follow me to the X-ray room", { kind: "follow", destination: "X-ray room" }],
    ["Wait here", { kind: "wait" }],
    ["Please stay here for a moment", { kind: "wait" }],
    ["You can wait here", { kind: "wait" }],
    ["Let's go back to your bed", { kind: "home" }],
    ["Back to bed, please", { kind: "home" }],
    ["Please lie down on the couch", { kind: "posture", posture: "lying" }],
    ["Could you lie down on the couch?", { kind: "posture", posture: "lying" }],
    ["Lie flat for me", { kind: "posture", posture: "lying" }],
    ["Lie on your back, please", { kind: "posture", posture: "lying" }],
    ["Sit up for me", { kind: "posture", posture: "sitting" }],
    ["Could you sit forward for me, please?", { kind: "posture", posture: "sitting" }],
    ["Stand up, please", { kind: "posture", posture: "standing" }],
  ])("%s", (text, intent) => {
    expect(movementIntent(text, "patient")).toEqual(intent);
  });

  it.each([
    ["跟我来", { kind: "follow", destination: null }],
    ["请跟我走吧", { kind: "follow", destination: null }],
    ["跟着我", { kind: "follow", destination: null }],
    ["请跟我去CT室", { kind: "follow", destination: "CT室" }],
    ["好的，跟我到放射科", { kind: "follow", destination: "放射科" }],
    ["我们去做个CT吧", { kind: "follow", destination: "CT" }],
    ["请在这里等一下", { kind: "wait" }],
    ["您先在这儿坐一下", { kind: "wait" }],
    ["回病床休息吧", { kind: "home" }],
    ["我们回去吧", { kind: "home" }],
    ["请躺下", { kind: "posture", posture: "lying" }],
    ["您先躺到床上吧", { kind: "posture", posture: "lying" }],
    ["请坐起来", { kind: "posture", posture: "sitting" }],
    ["站起来一下好吗", { kind: "posture", posture: "standing" }],
  ])("%s", (text, intent) => {
    expect(movementIntent(text, "patient")).toEqual(intent);
  });

  it.each([
    "Do you follow me?",
    "Did you follow the diet?",
    "Can you follow my finger with your eyes?",
    "Wait — when did the pain start?",
    "How far can you walk?",
    "Does it go to your back?",
    "Go on.",
    "跟我说说你的症状",
    "跟我讲一下哪里痛",
    "我们去年体检正常吗",
    "等一下，疼痛是什么时候开始的？",
    "您平时走路会喘吗？",
    "Can you lie flat?",
    "Can you lie flat at night without getting breathless?",
    "Do you get up at night to pass urine?",
    "Can you stand up without using your arms?",
    "你能平躺吗？",
    "晚上能躺平睡觉吗？",
    "",
  ])("talk, not a request: %s", (text) => {
    expect(movementIntent(text, "patient")).toBeNull();
  });
});

describe("said to a colleague", () => {
  const names = ["Wang Jianguo", "王建国"];
  it.each([
    ["Please take the patient to CT", { kind: "take", destination: "CT" }],
    ["Could you bring him to the cath lab?", { kind: "take", destination: "cath lab" }],
    ["Take Wang Jianguo for an X-ray", { kind: "take", destination: "X-ray" }],
    ["Can you take her back to her bed?", { kind: "take", destination: "home" }],
    ["Take the patient back", { kind: "take", destination: "home" }],
    ["Please take the patient", { kind: "take", destination: null }],
    ["帮我把病人送去CT室", { kind: "take", destination: "CT室" }],
    ["带患者去做CT", { kind: "take", destination: "CT" }],
    ["麻烦把王建国推到导管室", { kind: "take", destination: "导管室" }],
    ["把他送回病床", { kind: "take", destination: "home" }],
    ["把患者送回去吧", { kind: "take", destination: "home" }],
  ])("%s", (text, intent) => {
    expect(movementIntent(text, "staff", names)).toEqual(intent);
  });

  it.each(["Did you take the patient's blood pressure?", "Take a look at the ECG", "What did you give him?", "帮我看看心电图", "患者去过CT室吗？"])("talk, not a request: %s", (text) => {
    expect(movementIntent(text, "staff", names)).toBeNull();
  });
});

describe("where the words lead", () => {
  it("names a study's capability in either language, the most specific first", () => {
    expect(destinationCapability("the CT scanner")).toBe("ct");
    expect(destinationCapability("CT室")).toBe("ct");
    expect(destinationCapability("PET-CT")).toBe("pet-ct");
    expect(destinationCapability("cath lab")).toBe("fluoroscopy");
    expect(destinationCapability("导管室")).toBe("fluoroscopy");
    expect(destinationCapability("X-ray")).toBe("xray");
    expect(destinationCapability("拍片")).toBe("xray");
    expect(destinationCapability("磁共振")).toBe("mri");
    expect(destinationCapability("peak flow")).toBe("peak-flow");
    expect(destinationCapability("pharmacy")).toBeNull();
  });

  it("knows the patient's own bed", () => {
    for (const s of ["bed", "your bed", "home", "back", "病床", "回病床"]) expect(meansHome(s), s).toBe(true);
    for (const s of ["CT", "the pharmacy", "ICU"]) expect(meansHome(s), s).toBe(false);
  });
});
