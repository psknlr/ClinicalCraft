/**
 * Compact synthetic test case for the agent runtime tests (simulated clock,
 * physiology, a critical result, an ambiguous order query, a high-risk
 * intervention, volunteer/specific/unknown history facts, one decision and a
 * transcript-judged rubric item). Fictional; not medical advice.
 */
import { parseCase, type CaseDefinition, type CaseInput } from "@clinicalcraft/core";

const L = (zh: string, en: string) => ({ "zh-CN": zh, en });

export const MINI_CASE_INPUT: CaseInput = {
  schema: "clinicalcraft/case@1",
  id: "mini-chest-pain",
  version: "1.0.0",
  title: L("胸痛（测试）", "Chest pain (test)"),
  summary: L("急诊胸痛测试病例。", "Emergency chest-pain test case."),
  specialty: ["emergency-medicine"],
  difficulty: 2,
  setting: "emergency",
  locales: ["zh-CN", "en"],
  provenance: { kind: "synthetic" },
  disclaimer: L("虚构教学病例，不构成医疗建议。", "Fictional teaching case — not medical advice."),
  patient: {
    displayName: L("李明", "Li Ming"),
    age: 58,
    sex: "male",
    weightKg: 75,
    chiefComplaint: L("胸痛2小时", "Chest pain for 2 hours"),
    triageNote: L("58岁男性，胸痛2小时。", "58-year-old man with 2 hours of chest pain."),
    persona: {
      personality: L("紧张但配合", "Anxious but cooperative"),
      speechStyle: L("短句，口语", "Short, plain sentences"),
      affect: "anxious",
      openingLine: L("医生，我胸口压得慌。", "Doctor, my chest feels so tight."),
      fallbackUnknown: L("这个我不清楚。", "I'm not sure about that."),
      concerns: [L("我是不是心脏病发作了？", "Am I having a heart attack?")],
    },
  },
  phases: [{ id: "ed", label: L("急诊", "Emergency") }],
  clock: { mode: "simulated", startTime: "09:00", actionCosts: { ask: 0, examine: 1, order: 0, read: 0, intervene: 1, answer: 0 } },
  history: [
    {
      id: "onset",
      topic: "presenting-complaint",
      question: L("胸痛什么时候开始的？", "When did the chest pain start?"),
      answer: L("大概两个小时前，搬东西的时候开始的。", "About two hours ago, while I was lifting boxes."),
      keywords: { "zh-CN": ["什么时候开始", "多久了", "胸痛"], en: ["when did", "start", "how long", "chest pain"] },
      disclosure: "volunteer",
      required: true,
    },
    {
      id: "character",
      topic: "pain",
      question: L("是什么样的痛？", "What does the pain feel like?"),
      answer: L("像有块大石头压着，往左胳膊窜。", "Like a heavy weight pressing on me, going down my left arm."),
      keywords: { "zh-CN": ["什么样的痛", "性质", "放射"], en: ["feel like", "character", "describe the pain", "radiate"] },
      required: true,
    },
    {
      id: "meds",
      topic: "medications",
      question: L("平时吃什么药？", "What medicines do you take?"),
      answer: L("我每天吃二甲双胍500毫克，一天两次。", "I take metformin 500 mg twice a day."),
      keywords: { "zh-CN": ["吃什么药", "用药", "药物"], en: ["medicines", "medication", "tablets"] },
    },
    {
      id: "smoking",
      topic: "social",
      question: L("抽烟吗？", "Do you smoke?"),
      answer: L("抽了30年了，一天一包。", "I've smoked a pack a day for 30 years."),
      keywords: { "zh-CN": ["抽烟", "吸烟"], en: ["smoke", "smoking", "cigarettes"] },
      required: true,
    },
    {
      id: "cocaine",
      topic: "social",
      question: L("最近用过可卡因吗？", "Have you used cocaine recently?"),
      answer: L("没有，从来没用过。", "No, never."),
      keywords: { "zh-CN": ["可卡因"], en: ["cocaine"] },
      disclosure: "specific",
    },
    {
      id: "family",
      topic: "family",
      question: L("家里人有心脏病吗？", "Does heart disease run in your family?"),
      answer: L("家里的情况我不太清楚。", "I don't really know about my family's health."),
      keywords: { "zh-CN": ["家里人", "家族"], en: ["family", "relatives"] },
      disclosure: "unknown",
    },
  ],
  exam: [
    {
      id: "heart",
      system: "cardiovascular",
      maneuver: L("心脏听诊", "Auscultate the heart"),
      keywords: { "zh-CN": ["心脏", "心音"], en: ["heart", "heart sounds"] },
      finding: L("心音正常，无杂音。", "Normal heart sounds, no murmur."),
      requires: ["stethoscope"],
      required: true,
    },
    {
      id: "lungs",
      system: "respiratory",
      maneuver: L("肺部听诊", "Auscultate the lungs"),
      keywords: { "zh-CN": ["肺", "呼吸音"], en: ["lungs", "breath sounds"] },
      finding: L("双肺呼吸音清。", "Clear breath sounds bilaterally."),
      requires: ["stethoscope"],
    },
  ],
  examNotRecorded: L("病例未记录该项检查。", "Not recorded in this case."),
  investigations: [
    {
      id: "ecg",
      name: L("心电图", "ECG"),
      category: "bedside",
      aliases: { "zh-CN": ["心电图"], en: ["ecg", "ekg"] },
      turnaroundMinutes: 5,
      value: "essential",
      results: { ed: { text: L("窦性心律，II、III、aVF导联ST段抬高。", "Sinus rhythm; ST elevation in II, III and aVF."), critical: true } },
    },
    {
      id: "troponin",
      name: L("肌钙蛋白", "Troponin"),
      category: "lab",
      aliases: { "zh-CN": ["肌钙蛋白"], en: ["troponin", "trop"] },
      turnaroundMinutes: 45,
      results: {
        ed: {
          text: L("高敏肌钙蛋白T 85 ng/L（升高）。", "hs-troponin T 85 ng/L (raised)."),
          values: [{ analyte: L("高敏肌钙蛋白T", "hs-troponin T"), value: 85, unit: "ng/L", refHigh: 14, flag: "H" }],
        },
      },
    },
    {
      id: "ct-head",
      name: L("头颅CT", "CT head"),
      category: "imaging",
      aliases: { "zh-CN": ["头颅ct", "ct"], en: ["ct head", "ct"] },
      turnaroundMinutes: 20,
      risk: "low",
      value: "low-value",
      results: { ed: { text: L("未见异常。", "No abnormality.") } },
    },
    {
      id: "ct-chest",
      name: L("胸部CT", "CT chest"),
      category: "imaging",
      aliases: { "zh-CN": ["胸部ct", "ct"], en: ["ct chest", "ct"] },
      turnaroundMinutes: 20,
      risk: "moderate",
      value: "neutral",
      results: { ed: { text: L("未见主动脉夹层。", "No aortic dissection.") } },
    },
  ],
  interventions: [
    {
      id: "aspirin",
      name: L("阿司匹林 300 mg 嚼服", "Aspirin 300 mg chewed"),
      kind: "medication",
      aliases: { "zh-CN": ["阿司匹林"], en: ["aspirin"] },
      risk: "low",
      indicatedWhen: { read: "ecg" },
      response: L("患者嚼服了阿司匹林。", "He chews the aspirin."),
    },
    {
      id: "lysis",
      name: L("替奈普酶溶栓", "Tenecteplase thrombolysis"),
      kind: "medication",
      aliases: { "zh-CN": ["溶栓", "替奈普酶"], en: ["thrombolysis", "tenecteplase"] },
      risk: "high",
      maxDoses: 1,
      response: L("溶栓药已推注。", "The thrombolytic has been given."),
    },
  ],
  physiology: {
    baseline: { hr: 96, sbp: 138, dbp: 84, rr: 18, spo2: 96, temp: 36.8 },
    trends: [{ id: "desat", vital: "spo2", perMinute: -0.5, startMinute: 0, min: -10, until: { intervened: "aspirin" } }],
    events: [{ id: "pain-worse", atMinute: 30, message: L("患者诉胸痛加重。", "The patient says the pain is getting worse."), severity: "warning" }],
    noise: 0,
  },
  objectives: [
    {
      id: "history",
      title: L("采集病史", "Take a history"),
      hint: L("问清胸痛的开始时间和性质。", "Ask when the pain started and what it feels like."),
      completeWhen: { all: [{ asked: "onset" }, { asked: "character" }] },
      waypoints: [{ target: "patient" }],
    },
    {
      id: "ecg",
      title: L("完成心电图", "Get an ECG"),
      hint: L("胸痛患者10分钟内要做什么检查？", "Which test must a chest-pain patient have within 10 minutes?"),
      completeWhen: { read: "ecg" },
      waypoints: [{ target: "ecg-12lead" }],
    },
    {
      id: "decide",
      title: L("做出诊断", "Make the diagnosis"),
      hint: L("心电图哪些导联有ST段抬高？", "Which leads show ST elevation?"),
      completeWhen: { decided: "dx" },
      waypoints: [{ target: "board" }],
    },
  ],
  decisions: [
    {
      id: "dx",
      prompt: L("最可能的诊断？", "Most likely diagnosis?"),
      requires: { read: "ecg" },
      need: L("先查看心电图。", "Review the ECG first."),
      options: [
        { id: "stemi", text: L("下壁STEMI", "Inferior STEMI"), correct: true, feedback: L("正确：下壁导联ST段抬高。", "Correct: ST elevation in the inferior leads.") },
        { id: "pe", text: L("肺栓塞", "Pulmonary embolism"), correct: false, feedback: L("心电图不支持。", "The ECG does not support this.") },
      ],
    },
  ],
  rubric: [
    { id: "rb-hx", domain: "history", text: L("问清起病与性质", "Establishes onset and character"), met: { all: [{ asked: "onset" }, { asked: "character" }] } },
    { id: "rb-ecg", domain: "investigations", text: L("查看心电图", "Reviews the ECG"), met: { read: "ecg" } },
    {
      id: "rb-comm",
      domain: "communication",
      text: L("用通俗语言解释诊断", "Explains the diagnosis in plain language"),
      judgeGuidance: L("向患者解释心脏供血问题，不用术语。", "Explains the heart's blood supply problem without jargon."),
    },
  ],
  npcs: [
    { role: "nurse", name: L("王护士", "Nurse Wang"), knowledge: L("患者由家属送来，已建立静脉通路。", "Brought in by family; IV access is in.") },
    { role: "radiologist", knowledge: L("只解读已查看的影像报告。", "Interprets only reports already reviewed."), interprets: ["ct-head", "ct-chest"] },
    { role: "attending", name: L("陈主任", "Dr Chen"), knowledge: L("苏格拉底式带教。", "Socratic teaching.") },
  ],
  debrief: {
    title: L("复盘", "Debrief"),
    conclusion: L("下壁STEMI。", "Inferior STEMI."),
    keyReasoning: [L("典型胸痛 + 下壁导联ST段抬高。", "Typical pain plus inferior ST elevation.")],
    teachingPoints: [L("胸痛10分钟内完成心电图。", "ECG within 10 minutes of chest pain.")],
    references: ["2023 ESC Guidelines for the management of acute coronary syndromes"],
  },
  unknowns: [L("家族史未记录。", "Family history not recorded.")],
  solution: [
    { type: "start" },
    { type: "ask", itemId: "onset" },
    { type: "ask", itemId: "character" },
    { type: "order", investigationId: "ecg" },
    { type: "advance-time", minutes: 5 },
    { type: "read", investigationId: "ecg" },
    { type: "answer", decisionId: "dx", optionIds: ["stemi"] },
    { type: "finish" },
  ],
  extensions: {},
} as CaseInput;

/** Parsed mini case (fresh copy each call); `mutate` edits the raw input first. */
export function loadMiniCase(mutate?: (input: CaseInput) => void): CaseDefinition {
  const input = structuredClone(MINI_CASE_INPUT);
  mutate?.(input);
  const parsed = parseCase(input);
  if (!parsed.ok) throw new Error(`mini case invalid: ${parsed.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
  return parsed.value;
}
