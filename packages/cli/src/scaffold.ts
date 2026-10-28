/**
 * `clinicalcraft cases new <id>` template: a minimal, schema-valid synthetic
 * case (zh-CN + en placeholders marked 【待填写】/[TODO]) whose reference
 * `solution` passes `cases verify`, plus a README in the facilitator-guide
 * template of docs/CASE_AUTHORING.md §9.6.
 */

const TODO_ZH = "【待填写】";
const TODO_EN = "[TODO] ";

function both(zh: string, en: string): { "zh-CN": string; en: string } {
  return { "zh-CN": zh, en };
}

/** Template case JSON for `id`. */
export function caseTemplate(id: string): Record<string, unknown> {
  return {
    schema: "clinicalcraft/case@1",
    id,
    version: "0.1.0",
    title: both(`${TODO_ZH}主诉 · 年龄性别`, `${TODO_EN}Presenting complaint · age and sex`),
    summary: both(`${TODO_ZH}一句不剧透的病例简介（不写诊断）。`, `${TODO_EN}One spoiler-free sentence for the case library (no diagnosis).`),
    specialty: ["general-practice"],
    difficulty: 2,
    setting: "outpatient",
    facility: "general-hospital",
    locales: ["zh-CN", "en"],
    estimatedMinutes: 20,
    learningOutcomes: [
      both(`${TODO_ZH}一条可测量的学习目标：动词加标准（例如“依据……识别……并……”）。`, `${TODO_EN}One measurable learning outcome: an action verb and its standard (e.g. "Recognise … from … and …").`),
    ],
    tags: ["synthetic", "template"],
    provenance: {
      kind: "synthetic",
      authors: ["TODO"],
      license: "MIT",
      notes: both(`${TODO_ZH}依据哪些指南编写；声明为虚构病例。`, `${TODO_EN}Which guidelines the case follows; state that it is fictional.`),
      // Honest from the start: nobody has reviewed a new case (docs/CASE_AUTHORING.md §9.5).
      review: { status: "unreviewed", reviewers: [], guidelines: [] },
    },
    disclaimer: both("虚构教学病例，不构成医疗建议。", "Fictional teaching case — not medical advice."),
    patient: {
      displayName: both("张明（化名）", "Mr Zhang Ming (pseudonym)"),
      age: 45,
      ageUnit: "years",
      sex: "male",
      chiefComplaint: both(`${TODO_ZH}咳嗽3天`, `${TODO_EN}Cough for 3 days`),
      triageNote: both(`${TODO_ZH}分诊护士的交班（不含诊断）。`, `${TODO_EN}Triage handover (no diagnosis).`),
      tags: [],
      persona: {
        personality: both(`${TODO_ZH}性格特点。`, `${TODO_EN}Personality.`),
        speechStyle: both(`${TODO_ZH}说话方式（口语、简短）。`, `${TODO_EN}How they speak (lay words, short sentences).`),
        healthLiteracy: "medium",
        affect: "calm",
        openingLine: both(`${TODO_ZH}医生您好，我来看看……`, `${TODO_EN}Hello doctor, I've come about…`),
        fallbackUnknown: both("我不太清楚，医生。", "I'm not sure, doctor."),
        concerns: [both(`${TODO_ZH}患者最担心的事。`, `${TODO_EN}What worries the patient most.`)],
      },
      posture: "sitting",
    },
    phases: [{ id: "visit", label: both("门诊", "Clinic visit") }],
    clock: { mode: "static" },
    history: [
      {
        id: "hx-complaint",
        topic: "presenting-complaint",
        question: both("您今天哪里不舒服？", "What brings you in today?"),
        answer: both(`${TODO_ZH}患者用自己的话描述主诉。`, `${TODO_EN}The complaint in the patient's own words.`),
        keywords: { "zh-CN": ["哪里不舒服", "什么问题", "怎么了"], en: ["brings you in", "what's wrong", "problem"] },
        disclosure: "volunteer",
        required: true,
      },
      {
        id: "hx-allergies",
        topic: "allergies",
        question: both("您对什么药物或食物过敏吗？", "Are you allergic to any medicines or foods?"),
        answer: both("没有发现过什么过敏。", "No allergies that I know of."),
        keywords: { "zh-CN": ["过敏", "药物过敏"], en: ["allergic", "allergy", "allergies"] },
        required: true,
      },
      {
        id: "hx-travel",
        topic: "social",
        question: both("最近有没有出过远门？", "Have you travelled anywhere recently?"),
        answer: both("这个我说不上来。", "I couldn't really say."),
        keywords: { "zh-CN": ["出远门", "旅行", "旅游"], en: ["travel", "travelled", "trip abroad"] },
        disclosure: "unknown",
      },
    ],
    exam: [
      {
        id: "ex-general",
        system: "general",
        maneuver: both("一般情况视诊", "General inspection"),
        keywords: { "zh-CN": ["一般情况", "精神状态", "看起来"], en: ["general inspection", "general appearance", "look at the patient"] },
        finding: both(`${TODO_ZH}查体所见。`, `${TODO_EN}What the examiner finds.`),
        required: true,
      },
    ],
    examNotRecorded: both("原始资料未记录该项查体结果。", "This examination is not recorded for this case."),
    investigations: [
      {
        id: "inv-fbc",
        name: both("血常规", "Full blood count"),
        category: "lab",
        aliases: { "zh-CN": ["血常规", "血象"], en: ["fbc", "cbc", "full blood count", "blood count"] },
        requires: ["lab-hematology"],
        value: "essential",
        results: {
          visit: {
            text: both(`${TODO_ZH}检验报告文字。`, `${TODO_EN}Report text.`),
            values: [{ analyte: both("白细胞", "White cell count"), value: 7.2, unit: "×10⁹/L", refLow: 3.5, refHigh: 9.5 }],
          },
        },
      },
    ],
    interventions: [],
    objectives: [
      {
        id: "obj-history",
        title: both("采集病史", "Take a history"),
        hint: both(`${TODO_ZH}教学提示。`, `${TODO_EN}Teaching hint.`),
        guidance: both("和患者交谈。", "Talk to the patient."),
        completeWhen: { all: [{ asked: "hx-complaint" }, { asked: "hx-allergies" }] },
        waypoints: [{ target: "patient" }],
      },
      {
        id: "obj-workup",
        title: both("查体与检查", "Examine and investigate"),
        hint: both(`${TODO_ZH}教学提示。`, `${TODO_EN}Teaching hint.`),
        completeWhen: { all: [{ examined: "ex-general" }, { read: "inv-fbc" }] },
        waypoints: [{ unless: { ordered: "inv-fbc" }, target: "lab-hematology" }, { target: "patient" }],
      },
      {
        id: "obj-decide",
        title: both("作出判断", "Make a decision"),
        hint: both(`${TODO_ZH}教学提示。`, `${TODO_EN}Teaching hint.`),
        completeWhen: { decided: "dec-diagnosis" },
        waypoints: [{ target: "board" }],
      },
    ],
    decisions: [
      {
        id: "dec-diagnosis",
        kind: "single",
        prompt: both(`${TODO_ZH}最可能的诊断是？`, `${TODO_EN}What is the most likely diagnosis?`),
        requires: { read: "inv-fbc" },
        need: both("先查看血常规结果。", "Read the full blood count first."),
        options: [
          { id: "opt-a", text: both(`${TODO_ZH}正确选项`, `${TODO_EN}Correct option`), correct: true, feedback: both(`${TODO_ZH}为什么正确。`, `${TODO_EN}Why this is right.`) },
          { id: "opt-b", text: both(`${TODO_ZH}错误选项`, `${TODO_EN}Wrong option`), correct: false, feedback: both(`${TODO_ZH}为什么错误。`, `${TODO_EN}Why this is wrong.`) },
        ],
      },
    ],
    rubric: [
      { id: "rb-history", domain: "history", text: both("询问主诉和过敏史", "Asked about the complaint and allergies"), weight: 1, met: { all: [{ asked: "hx-complaint" }, { asked: "hx-allergies" }] } },
      { id: "rb-workup", domain: "investigations", text: both("查看了血常规", "Reviewed the full blood count"), weight: 1, met: { read: "inv-fbc" } },
      { id: "rb-diagnosis", domain: "diagnosis", text: both("首次即作出正确判断", "Correct decision at the first attempt"), weight: 2, met: { decidedFirstTry: "dec-diagnosis" } },
      {
        id: "rb-communication",
        domain: "communication",
        text: both("与患者沟通清晰、有同理心", "Communicated clearly and with empathy"),
        weight: 1,
        judgeGuidance: both("是否使用通俗语言、回应患者的担忧。", "Plain language; responds to the patient's concerns."),
      },
    ],
    npcs: [{ role: "nurse", name: both("李护士", "Nurse Li"), knowledge: both(`${TODO_ZH}护士知道的流程信息（不含诊断）。`, `${TODO_EN}Logistics the nurse knows (no diagnosis).`) }],
    debrief: {
      title: both("病例总结", "Case debrief"),
      conclusion: both(`${TODO_ZH}结论。`, `${TODO_EN}Conclusion.`),
      keyReasoning: [both(`${TODO_ZH}关键推理。`, `${TODO_EN}Key reasoning point.`)],
      boundaries: both(`${TODO_ZH}本病例的证据边界。`, `${TODO_EN}Evidence boundaries of this case.`),
      unknowns: [both("是否近期旅行未记录。", "Recent travel is not recorded.")],
      teachingPoints: [both(`${TODO_ZH}教学要点。`, `${TODO_EN}Teaching point.`)],
      references: ["TODO: guideline citation (plain text, no invented DOIs or URLs)"],
      notice: both("本评分衡量教学脚本完成度，不是经过验证的能力评分。", "This score measures completion of a teaching script; it is not a validated competency score."),
    },
    unknowns: [both("近期旅行史未记录。", "Recent travel history is not recorded.")],
    assets: [],
    solution: [
      { type: "start" },
      { type: "ask", itemId: "hx-complaint" },
      { type: "ask", itemId: "hx-allergies" },
      { type: "examine", findingId: "ex-general" },
      { type: "order", investigationId: "inv-fbc" },
      { type: "read", investigationId: "inv-fbc" },
      { type: "answer", decisionId: "dec-diagnosis", optionIds: ["opt-a"] },
      { type: "finish" },
    ],
    extensions: {
      testUtterances: [
        { text: "您今天哪里不舒服？", locale: "zh-CN", expect: ["hx-complaint"] },
        { text: "What brings you in today?", locale: "en", expect: ["hx-complaint"] },
        { text: "您有药物过敏吗？", locale: "zh-CN", expect: ["hx-allergies"] },
        { text: "Do you have any allergies?", locale: "en", expect: ["hx-allergies"] },
        { text: "你家里养宠物吗？", locale: "zh-CN", expect: [] },
        { text: "Do you keep any pets?", locale: "en", expect: [] },
      ],
    },
  };
}

/** Author README for a new case. */
export function readmeTemplate(id: string): string {
  return `# ${id} — TODO presentation · TODO patient

> **Facilitator guide — spoilers.** Learners open the case from the case
> library; keep the title, summary, chief complaint and tags spoiler-free.

> **Synthetic case.** Fictional teaching case — not medical advice. The patient
> is a pseudonym; no value is based on a real patient.

The sections follow docs/CASE_AUTHORING.md §9.6; its §9 is the clinical content
standard every case meets.

## Case card

| | |
|---|---|
| id / version | \`${id}\` / \`0.1.0\` |
| setting / facility | \`outpatient\` / \`general-hospital\` |
| difficulty / estimated time | 2 / 20 min |
| specialty | TODO |
| languages | \`zh-CN\` (source language), \`en\` |
| review status | not yet reviewed (\`provenance.review.status: unreviewed\`) |

## Learning outcomes

1. TODO — an action verb and its standard (\`learningOutcomes\`, 4–6).

## Clinical summary

TODO — diagnosis and key findings.

## Scenario timeline and physiology

TODO

## Decisions and assessment

TODO — objectives, rubric, how wrong choices score.

## Reference path (\`solution\`)

TODO

## Clinical numbers check

TODO — derived values and scores, each with its inputs.

## Facilitator notes

TODO — debrief questions in PEARLS order (reactions → description → analysis →
summary), common learner errors and how the case surfaces them.

## Embodied mode

TODO — the learners' in-world mode: grounding, scope of practice, where the
patient goes.

## Fidelity limits

TODO

## References

TODO — Vancouver style; a DOI only once verified (docs/CASE_AUTHORING.md §9.4).

## Changelog

- 0.1.0 — scaffolded with \`clinicalcraft cases new\`.

## Validation

\`\`\`bash
clinicalcraft cases validate path/to/${id}/case.json
clinicalcraft cases verify ${id}
clinicalcraft play ${id} --provider offline
\`\`\`

## 中文摘要

TODO — 病例概要、学习目标、关键决策、复盘要点。

## Authoring checklist

- [ ] Replace every 【待填写】 / [TODO] placeholder in both languages.
- [ ] 15–40 history items (SOCRATES, red flags, PMH, medications, allergies, social, family, ROS, ICE); 4–10 \`required\`.
- [ ] 8–25 exam findings incl. pertinent negatives; vital signs in \`physiology.baseline\` for acute cases.
- [ ] A realistic investigation panel (essential/useful/neutral/low-value) with results per phase.
- [ ] 4–6 objectives, 4–6 learning outcomes, 2–5 decisions with feedback on every option, 8–15 rubric items (+1–3 examiner-judged).
- [ ] Guidance checked by version in \`provenance.review.guidelines\`; Vancouver-style \`debrief.references\` (DOIs only once verified; never invented).
- [ ] \`solution\` completes every objective and answers every decision; \`extensions.testUtterances\` has 15–40 bilingual entries.
`;
}
