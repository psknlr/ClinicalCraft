/**
 * Requests to a colleague in the learner's words (`staff-intents.ts`): both languages, anchored to the whole short
 * utterance — a question about what was done ("Did you give the aspirin?") is talk.
 */
import { describe, expect, it } from "vitest";
import { staffIntent } from "./staff-intents.js";

const names = ["Wang Jianguo", "王建国"];

describe("requests to a colleague", () => {
  it.each([
    ["Please put him on the monitor", { kind: "task", task: "attach_monitor" }],
    ["Could you attach the monitor?", { kind: "task", task: "attach_monitor" }],
    ["Start cardiac monitoring", { kind: "task", task: "attach_monitor" }],
    ["Can you do a 12-lead ECG?", { kind: "task", task: "record_ecg" }],
    ["Get an ECG please", { kind: "task", task: "record_ecg" }],
    ["Please put in a cannula", { kind: "task", task: "obtain_iv_access" }],
    ["Could you get IV access?", { kind: "task", task: "obtain_iv_access" }],
    ["Bring the defibrillator over here", { kind: "fetch", what: "defibrillator" }],
    ["Could you get me the ECG cart?", { kind: "fetch", what: "ECG cart" }],
    ["Pass me the scalpel", { kind: "hand", what: "scalpel" }],
    ["Could you hand me a swab, please?", { kind: "hand", what: "swab" }],
    ["Give me the Mayo scissors", { kind: "hand", what: "Mayo scissors" }],
    ["Scalpel.", { kind: "hand", what: "Scalpel" }],
    ["Needle holder, please", { kind: "hand", what: "Needle holder" }],
    ["Give aspirin 300 mg", { kind: "give", what: "aspirin 300 mg" }],
    ["Please give him some morphine", { kind: "give", what: "morphine" }],
    ["Start oxygen", { kind: "give", what: "oxygen" }],
    ["Please take the patient to CT", { kind: "take", destination: "CT" }],
    ["Come here, please", { kind: "come", to: "me" }],
    ["Could you come to the bedside?", { kind: "come", to: "patient" }],
    ["You can go back now", { kind: "back" }],
    ["That's all, thanks", { kind: "back" }],
    ["Show me the way to the pharmacy", { kind: "guide", place: "pharmacy" }],
    ["Where is the CT scanner?", { kind: "where", place: "CT scanner" }],
    ["Where's the pharmacy?", { kind: "where", place: "pharmacy" }],
  ])("%s", (text, intent) => {
    expect(staffIntent(text, names)).toEqual(intent);
  });

  it.each([
    ["给他上监护", { kind: "task", task: "attach_monitor" }],
    ["请帮我连接监护仪", { kind: "task", task: "attach_monitor" }],
    ["做个心电图", { kind: "task", task: "record_ecg" }],
    ["给患者做一份十二导联心电图吧", { kind: "task", task: "record_ecg" }],
    ["建立静脉通路", { kind: "task", task: "obtain_iv_access" }],
    ["把除颤仪推过来", { kind: "fetch", what: "除颤仪" }],
    ["去拿个氧气瓶来", { kind: "fetch", what: "氧气瓶" }],
    ["把手术刀递给我", { kind: "hand", what: "手术刀" }],
    ["请递一下纱布", { kind: "hand", what: "纱布" }],
    ["给我一把持针器", { kind: "hand", what: "持针器" }],
    ["组织钳。", { kind: "hand", what: "组织钳" }],
    ["电刀，谢谢", { kind: "hand", what: "电刀" }],
    ["给他用阿司匹林", { kind: "give", what: "阿司匹林" }],
    ["给予吸氧", { kind: "give", what: "吸氧" }],
    ["把患者送到CT室", { kind: "take", destination: "CT室" }],
    ["过来一下", { kind: "come", to: "me" }],
    ["请到床旁来", { kind: "come", to: "patient" }],
    ["回护士站吧", { kind: "back" }],
    ["带我去药房", { kind: "guide", place: "药房" }],
    ["CT室在哪里？", { kind: "where", place: "CT室" }],
    ["请问药房怎么去？", { kind: "where", place: "药房" }],
  ])("%s", (text, intent) => {
    expect(staffIntent(text, names)).toEqual(intent);
  });

  it.each([
    "Did you give the aspirin?",
    "What did the ECG show?",
    "Is the monitor on?",
    "Give me a minute",
    "Give me some time",
    "Yes please",
    "Thank you",
    "Is that the scalpel?",
    "好的",
    "谢谢",
    "收到",
    "来一下吧",
    "Where did he fall?",
    "Where does it hurt?",
    "How are the vital signs now?",
    "Any results back?",
    "阿司匹林给了吗？",
    "心电图结果怎么样？",
    "他是在哪里摔倒的",
    "",
  ])("talk, not a request: %s", (text) => {
    expect(staffIntent(text, names)).toBeNull();
  });
});
