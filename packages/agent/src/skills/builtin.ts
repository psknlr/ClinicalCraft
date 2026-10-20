/**
 * Built-in skills (docs/EMBODIED.md §9) — declarative workflows over the
 * world and clinical tools, validated with the same schema as project and
 * inline skills (`parseSkill`). Every step runs through the caller's normal
 * tool path; a skill succeeds only when its postconditions hold in
 * authoritative state.
 */
import { parseSkill, SKILL_SCHEMA_ID, type SkillDefinition } from "./schema.js";

const S = SKILL_SCHEMA_ID;
const PATIENT = { type: "entity", default: "$patient", description: { "zh-CN": "患者（默认本次接诊的患者）", en: "The patient (default: the encounter's patient)" } } as const;
const notNear = (range: number) => ({ not: { actorNear: "${patient}", range } });
const REPLAN = { on: ["SPATIAL_REQUIREMENT_UNMET", "NOT_IN_RANGE", "NOT_VISIBLE", "NO_INTERACTION_POINT"], strategy: "replan" } as const;
const FETCH = { on: ["SPATIAL_REQUIREMENT_UNMET", "PRECONDITION_FAILED"], strategy: "fetch-equipment" } as const;
const ALTERNATE = { on: ["DEVICE_BUSY", "DEVICE_UNAVAILABLE"], strategy: "alternate-provider" } as const;
const ECG = "${steps.find.data.entities.0.id}";

const RAW: readonly unknown[] = [
  {
    schema: S,
    id: "locate_patient",
    name: { "zh-CN": "找到患者", en: "Locate the patient" },
    description: { "zh-CN": "查明患者的位置并走到能看见患者的地方。", en: "Find where the patient is and move to where you can see them." },
    params: { patient: PATIENT },
    safety: "physical",
    steps: [
      { id: "find", tool: "find_entities", args: { kind: "patient" } },
      { id: "look", tool: "look_at", args: { target: "${patient}" } },
    ],
    postconditions: [{ actorNear: "${patient}", range: 15 }],
    recovery: [REPLAN],
  },
  {
    schema: S,
    id: "approach_patient",
    name: { "zh-CN": "走到患者床旁", en: "Approach the patient" },
    description: { "zh-CN": "走到患者身旁（接触距离）。", en: "Walk to the patient's side (contact range)." },
    params: { patient: PATIENT },
    safety: "physical",
    steps: [{ id: "go", tool: "navigate_to", args: { target: "${patient}" }, when: notNear(1.5) }],
    postconditions: [{ actorNear: "${patient}", range: 1.5 }],
  },
  {
    schema: S,
    id: "wash_hands",
    name: { "zh-CN": "手卫生", en: "Wash hands" },
    description: { "zh-CN": "走到最近的洗手池或手消毒器完成手卫生（WHO 时刻 1）。", en: "Walk to the nearest sink or hand-rub dispenser and clean your hands (WHO moment 1)." },
    safety: "physical",
    steps: [
      { id: "find", tool: "find_objects", args: { interaction: "sink", limit: 1 } },
      { id: "go", tool: "approach_object", args: { target: "${steps.find.data.entities.0.id}" } },
      { id: "wash", tool: "interact_object", args: { target: "${steps.find.data.entities.0.id}", operation: "wash_hands" } },
    ],
    postconditions: [{ world: { handsClean: true } }],
    recovery: [REPLAN],
  },
  {
    schema: S,
    id: "fetch_equipment",
    name: { "zh-CN": "取设备到床旁", en: "Fetch equipment to the bedside" },
    description: { "zh-CN": "把提供某项能力的最近的推车推到患者床旁。", en: "Wheel the nearest cart that provides a capability to the patient's bedside." },
    params: { capability: { type: "string", description: { "zh-CN": "能力，如 ecg-12lead", en: "A capability, e.g. ecg-12lead" } }, patient: PATIENT },
    safety: "physical",
    steps: [
      { id: "find", tool: "find_objects", args: { capabilities: ["${capability}"], portable_only: true, limit: 1 } },
      { id: "go", tool: "approach_object", args: { target: "${steps.find.data.entities.0.id}" }, when: { not: { world: { deviceAtBedside: true }, target: "${steps.find.data.entities.0.id}" } } },
      {
        id: "move",
        tool: "interact_object",
        args: { target: "${steps.find.data.entities.0.id}", operation: "move_to", parameters: { goal: { kind: "interact", id: "${patient}" } } },
        when: { not: { world: { deviceAtBedside: true }, target: "${steps.find.data.entities.0.id}" } },
      },
    ],
    postconditions: [{ world: { deviceAtBedside: true }, target: "${steps.find.data.entities.0.id}" }],
    recovery: [REPLAN, ALTERNATE],
  },
  {
    schema: S,
    id: "perform_bedside_exam",
    name: { "zh-CN": "床旁查体", en: "Bedside examination" },
    description: { "zh-CN": "走到患者身旁完成一项查体（需要床旁设备时先推来）。", en: "Go to the patient and perform one examination (fetching bedside equipment it needs)." },
    params: { finding: { type: "finding" }, patient: PATIENT },
    safety: "clinical",
    steps: [
      { id: "go", tool: "navigate_to", args: { target: "${patient}" }, when: notNear(1.5) },
      { id: "exam", tool: "examine", args: { finding_id: "${finding}" } },
    ],
    postconditions: [{ clinical: { examined: "${finding}" } }],
    recovery: [FETCH, REPLAN],
  },
  {
    schema: S,
    id: "perform_ecg",
    name: { "zh-CN": "做 12 导联心电图", en: "Record a 12-lead ECG" },
    description: {
      "zh-CN": "在床旁用心电图机：准备、连接导联、记录（由此下达心电图检查）、复位。",
      en: "At the bedside with an ECG machine: prepare, connect the leads, record (this orders the ECG), reset.",
    },
    params: { investigation: { type: "investigation", default: "$capability:ecg-12lead" }, patient: PATIENT },
    safety: "clinical",
    steps: [
      { id: "go", tool: "navigate_to", args: { target: "${patient}" }, when: notNear(1.5) },
      { id: "find", tool: "find_objects", args: { capabilities: ["ecg-12lead"], portable_only: true, limit: 1 } },
      {
        id: "fetch",
        tool: "interact_object",
        args: { target: ECG, operation: "move_to", parameters: { goal: { kind: "interact", id: "${patient}" } } },
        when: { not: { world: { deviceAtBedside: true }, target: ECG } },
      },
      { id: "back", tool: "navigate_to", args: { target: "${patient}" }, when: notNear(1.5) },
      { id: "clear", tool: "interact_object", args: { target: ECG, operation: "reset" }, when: { entityState: ECG, state: ["completed"] } },
      { id: "prepare", tool: "interact_object", args: { target: ECG, operation: "prepare" }, when: { entityState: ECG, state: ["idle"] } },
      { id: "connect", tool: "interact_object", args: { target: ECG, operation: "connect" }, when: { entityState: ECG, state: ["prepared"] } },
      { id: "record", tool: "interact_object", args: { target: ECG, operation: "record", parameters: { investigation: "${investigation}" } } },
      { id: "reset", tool: "interact_object", args: { target: ECG, operation: "reset" }, onError: "continue" },
    ],
    postconditions: [{ clinical: { ordered: "${investigation}" } }],
    // a cart at the bedside but out of reach of the patient's side is wheeled over (its refusal hints the fetch)
    recovery: [REPLAN, FETCH, ALTERNATE],
  },
  {
    schema: S,
    id: "attach_monitor",
    name: { "zh-CN": "连接床旁监护", en: "Attach the bedside monitor" },
    description: { "zh-CN": "走到患者身旁，连接患者的监护仪（由此执行病例的监护措施）。", en: "Go to the patient and attach their monitor (this gives the case's monitoring intervention)." },
    params: { monitor: { type: "entity", default: "$patient-monitor" }, patient: PATIENT },
    safety: "clinical",
    steps: [
      { id: "go", tool: "navigate_to", args: { target: "${patient}" }, when: notNear(1.5) },
      { id: "attach", tool: "interact_object", args: { target: "${monitor}", operation: "attach" } },
    ],
    postconditions: [{ entityState: "${monitor}", state: "attached" }],
    recovery: [REPLAN],
  },
  {
    schema: S,
    id: "obtain_result",
    name: { "zh-CN": "查看检查结果", en: "Obtain a result" },
    description: { "zh-CN": "走到能查看该结果的地方（电子病历终端、患者身旁或相应工作站——不是床旁设备）并阅读结果。", en: "Go where the result can be read (a records terminal, the patient's side or a workstation for it — never the bedside device) and read it." },
    params: { investigation: { type: "investigation" }, phase: { type: "string", required: false } },
    safety: "clinical",
    steps: [{ id: "read", tool: "read_result", args: { investigation_id: "${investigation}", phase: "${phase}" } }],
    postconditions: [{ clinical: { read: "${investigation}" } }],
    recovery: [REPLAN, FETCH],
  },
  {
    schema: S,
    id: "review_imaging",
    name: { "zh-CN": "阅片", en: "Review imaging" },
    description: { "zh-CN": "到影像工作站阅读影像报告，并请影像科医生一起解读。", en: "Read an imaging report at an imaging station and review it with the radiologist." },
    params: { investigation: { type: "investigation" } },
    safety: "clinical",
    steps: [
      { id: "read", tool: "read_result", args: { investigation_id: "${investigation}" } },
      { id: "discuss", tool: "consult", args: { role: "radiologist", question: "Please review this study with me: ${investigation}." }, onError: "continue" },
    ],
    postconditions: [{ clinical: { read: "${investigation}" } }],
    recovery: [REPLAN],
  },
  {
    schema: S,
    id: "administer_treatment",
    name: { "zh-CN": "实施治疗", en: "Administer a treatment" },
    description: { "zh-CN": "在患者身旁实施治疗（需要床旁设备时先推来）；高风险治疗仍需确认。", en: "Give a treatment at the patient's side (fetching bedside equipment it needs); high-risk ones still need confirmation." },
    params: { intervention: { type: "intervention" } },
    safety: "clinical",
    steps: [{ id: "give", tool: "intervene", args: { intervention_id: "${intervention}" } }],
    postconditions: [{ clinical: { intervened: "${intervention}" } }],
    recovery: [FETCH, REPLAN],
  },
  {
    schema: S,
    id: "reassess_patient",
    name: { "zh-CN": "再次评估患者", en: "Reassess the patient" },
    description: { "zh-CN": "回到患者身旁查看监护和生命体征。", en: "Return to the patient and check the monitor and vital signs." },
    params: { patient: PATIENT },
    safety: "physical",
    steps: [
      { id: "go", tool: "navigate_to", args: { target: "${patient}" }, when: notNear(1.5) },
      { id: "vitals", tool: "check_vitals", args: {} },
    ],
    postconditions: [{ actorNear: "${patient}", range: 1.5 }],
    recovery: [REPLAN],
  },
];

function build(): readonly SkillDefinition[] {
  return RAW.map((raw) => {
    const r = parseSkill(raw);
    if (!r.ok) throw new Error(`built-in skill ${(raw as { id?: string }).id}: ${r.issues.join("; ")}`);
    return Object.freeze(r.skill);
  });
}

/** The built-in skills (validated at load). */
export const BUILTIN_SKILLS: readonly SkillDefinition[] = Object.freeze(build());

/** Ids of the built-in skills. */
export const BUILTIN_SKILL_IDS: readonly string[] = BUILTIN_SKILLS.map((s) => s.id);
