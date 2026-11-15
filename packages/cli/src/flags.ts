/**
 * Flag specifications shared by several commands.
 */
import { POSITION_TITLES, SEAT_POSITIONS, type Seat } from "@clinicalcraft/core";
import type { FlagSpec } from "./argv.js";

export const OUTPUT_FORMATS = ["text", "json", "stream-json"] as const;
export const INPUT_FORMATS = ["text", "stream-json"] as const;
export const APPROVAL_CHOICES = ["default", "strict", "auto", "plan", "bypass"] as const;
export const SCOPE_CHOICES = ["history-only", "workup", "full"] as const;

/** Accepted anywhere on the command line. */
export const GLOBAL_FLAGS: FlagSpec[] = [
  { name: "cwd", type: "string", valueName: "<dir>", description: { en: "Working directory (project settings, memory, relative paths)", zh: "工作目录（项目设置、记忆文件、相对路径）" } },
  { name: "lang", type: "string", valueName: "<zh-CN|en>", description: { en: "Language of the CLI and the session", zh: "命令行与会话语言" } },
  { name: "profile", type: "string", valueName: "<name>", description: { en: "Settings profile (profiles.<name>)", zh: "设置预设（profiles.<name>）" } },
  { name: "verbose", type: "boolean", description: { en: "Print debug details to stderr", zh: "在 stderr 输出调试信息" } },
  { name: "version", short: "V", type: "boolean", description: { en: "Print the version", zh: "显示版本号" } },
  { name: "help", short: "h", type: "boolean", description: { en: "Show help", zh: "显示帮助" } },
];

/** Session bootstrap flags (play, exec, mcp, eval). */
export const SESSION_FLAGS: FlagSpec[] = [
  { name: "provider", type: "string", valueName: "<id>", description: { en: "LLM provider (see `providers list`; offline = no model)", zh: "大模型服务商（见 `providers list`；offline 为离线确定性模式）" } },
  { name: "model", type: "string", valueName: "<id>", description: { en: "Model id", zh: "模型 ID" } },
  { name: "base-url", type: "string", valueName: "<url>", description: { en: "Override the provider's base URL", zh: "覆盖服务商的 Base URL" } },
  { name: "approval", type: "string", valueName: "<mode>", choices: APPROVAL_CHOICES, description: { en: "Approval mode: default | strict | auto | plan | bypass", zh: "审批模式：default | strict | auto | plan | bypass" } },
  {
    name: "characters",
    type: "string",
    valueName: "<engine>",
    choices: ["rules", "llm"],
    description: {
      en: "How characters are driven: rules (default) | llm — every character model-driven within its role card (docs/CHARACTERS.md)",
      zh: "角色驱动方式：rules（默认）| llm——每个角色都由大模型在其岗位职责卡内驱动（docs/CHARACTERS.md）",
    },
  },
  { name: "scope", type: "string", valueName: "<scope>", choices: SCOPE_CHOICES, description: { en: "Practice scope: history-only | workup | full", zh: "操作范围：history-only | workup | full" } },
  { name: "facility", type: "string", valueName: "<id>", description: { en: "Facility (world) to place the case in", zh: "病例所在的场馆" } },
  { name: "max-tool-rounds", type: "number", valueName: "<n>", description: { en: "Tool rounds per agent turn", zh: "每个智能体回合的工具调用轮数上限" } },
  { name: "ephemeral", type: "boolean", description: { en: "Do not write a session transcript", zh: "不写入会话记录" } },
  {
    name: "embodied",
    type: "boolean",
    description: {
      en: "In-world mode: a headless 3D hospital — walk, find and operate equipment; clinical acts need you in the right place",
      zh: "实景模式：无界面三维医院——走动、寻找并操作设备；临床操作需要身处正确的位置",
    },
  },
  {
    name: "allowed-tools",
    type: "list",
    valueName: "<rules>",
    description: { en: 'Extra allow rules, e.g. "order_test(*),examine"', zh: '追加允许规则，如 "order_test(*),examine"' },
  },
  {
    name: "disallowed-tools",
    type: "list",
    valueName: "<rules>",
    description: { en: 'Extra deny rules, e.g. "intervene(alteplase*)"', zh: '追加拒绝规则，如 "intervene(alteplase*)"' },
  },
];

/** Resume flags (play, exec). */
export const RESUME_FLAGS: FlagSpec[] = [
  { name: "resume", short: "r", type: "string", valueName: "<id>", description: { en: "Resume a recorded session (id, id prefix or transcript path)", zh: "恢复已记录的会话（ID、ID 前缀或记录文件路径）" } },
  { name: "continue", short: "c", type: "boolean", description: { en: "Resume the most recent session", zh: "恢复最近一次会话" } },
];

/** The places a learner may take at the start (`--seat`): core's seat list. */
export const SEAT_CHOICES: readonly Seat[] = SEAT_POSITIONS;

/** "first-assistant — first assistant" for each place, in one language (core's titles). */
function seatChoices(lang: "en" | "zh-CN", sep: string): string {
  return SEAT_CHOICES.map((seat) => `${seat}${sep}${POSITION_TITLES[seat][lang]}`).join(" | ");
}

/**
 * A place in the care team chosen at the start (play, exec; docs/TEAM.md §1, docs/PROTOCOL.md §3.1): the first action
 * becomes `start {seat, lineup, team}`. The session decides — a place needs in-world mode, a case team with a stand-in
 * surgeon and settings that let the stand-in work — and a refusal is printed as it words it.
 */
export const PLACE_FLAGS: FlagSpec[] = [
  {
    name: "seat",
    type: "string",
    valueName: "<place>",
    choices: SEAT_CHOICES,
    description: {
      en: `Your place in the care team, fixed for the encounter (in-world mode; a case whose team has a stand-in surgeon): ${seatChoices("en", " — ")} (default: surgeon)`,
      zh: `你在手术团队中的岗位，本次接诊中不变（实景模式；病例团队需有主刀同事）：${seatChoices("zh-CN", "——")}（默认 surgeon）`,
    },
  },
  {
    name: "lineup",
    type: "string",
    valueName: "<id>",
    description: { en: "The care team's line-up for the encounter (one of the case team's `lineups`, e.g. three-surgeons)", zh: "本次接诊的团队配置（病例团队 `lineups` 中的一个，如 three-surgeons）" },
  },
  {
    name: "team",
    type: "string",
    valueName: "<scenario>",
    description: { en: "Team scenario for the encounter (one of the case team's `scenarios`; a facilitator's choice the team is not told)", zh: "本次接诊的团队情境（病例团队 `scenarios` 中的一个；由导师选择，团队并不知情）" },
  },
];

/** Headless flags (exec / -p). */
export const EXEC_FLAGS: FlagSpec[] = [
  { name: "print", short: "p", type: "string", optionalValue: true, valueName: "[prompt]", description: { en: "Run headless with this prompt (same as `exec <prompt>`)", zh: "以无界面模式运行该提示（等同 `exec <prompt>`）" } },
  { name: "case", type: "string", valueName: "<id>", description: { en: "Case id", zh: "病例 ID" } },
  { name: "autopilot", type: "boolean", description: { en: "Demonstration: the clinician agent works the case; the prompt becomes its goal", zh: "示范接诊：由临床医生智能体处理本病例；提示作为其目标" } },
  { name: "output-format", type: "string", valueName: "<fmt>", choices: OUTPUT_FORMATS, description: { en: "text | json | stream-json", zh: "text | json | stream-json" } },
  { name: "input-format", type: "string", valueName: "<fmt>", choices: INPUT_FORMATS, description: { en: "text | stream-json (Op JSON lines on stdin)", zh: "text | stream-json（stdin 每行一个 Op JSON）" } },
  { name: "max-turns", type: "number", valueName: "<n>", description: { en: "Demonstration (--autopilot) turns, or tool rounds for a single prompt; exceeding it exits 3", zh: "示范接诊的回合数（单条提示时为工具轮数）；超出时退出码 3" } },
  { name: "to", type: "string", valueName: "<agent>", description: { en: "Address the prompt to an agent (patient, nurse, attending…)", zh: "提示发送对象（patient、nurse、attending…）" } },
  { name: "assess", type: "boolean", description: { en: "Run the examiner at the end (default: on with --autopilot)", zh: "结束时运行考官评估（--autopilot 时默认开启）" } },
  {
    name: "approve-high-risk",
    type: "boolean",
    description: {
      en: "With --approval auto, also approve always-ask, high-risk and ask-rule actions unattended (default: denied)",
      zh: "配合 --approval auto，无人值守时也批准必须确认、高风险和 ask 规则的操作（默认拒绝）",
    },
  },
  { name: "quiet", short: "q", type: "boolean", description: { en: "No progress on stderr (text format)", zh: "不在 stderr 输出进度（text 格式）" } },
  { name: "output-last-message", short: "o", type: "string", valueName: "<file>", description: { en: "Also write the final message to this file", zh: "同时把最终消息写入该文件" } },
  { name: "trace", type: "string", valueName: "<file>", description: { en: "Write the episode trace (JSON Lines spans; in-world mode) to this file", zh: "把本次接诊的轨迹（JSON Lines，实景模式）写入该文件" } },
];

export const JSON_FLAG: FlagSpec = { name: "json", type: "boolean", description: { en: "Machine-readable JSON output", zh: "输出 JSON" } };
