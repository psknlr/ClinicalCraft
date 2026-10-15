/**
 * Flag specifications shared by several commands.
 */
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
  { name: "scope", type: "string", valueName: "<scope>", choices: SCOPE_CHOICES, description: { en: "Practice scope: history-only | workup | full", zh: "执业范围：history-only | workup | full" } },
  { name: "facility", type: "string", valueName: "<id>", description: { en: "Facility (world) to place the case in", zh: "病例所在的场馆" } },
  { name: "max-tool-rounds", type: "number", valueName: "<n>", description: { en: "Tool rounds per agent turn", zh: "每个智能体回合的工具调用轮数上限" } },
  { name: "ephemeral", type: "boolean", description: { en: "Do not write a session transcript", zh: "不写入会话记录" } },
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

/** Headless flags (exec / -p). */
export const EXEC_FLAGS: FlagSpec[] = [
  { name: "print", short: "p", type: "string", optionalValue: true, valueName: "[prompt]", description: { en: "Run headless with this prompt (same as `exec <prompt>`)", zh: "以无界面模式运行该提示（等同 `exec <prompt>`）" } },
  { name: "case", type: "string", valueName: "<id>", description: { en: "Case id", zh: "病例 ID" } },
  { name: "autopilot", type: "boolean", description: { en: "Let the clinician agent drive; the prompt becomes its goal", zh: "由临床医生智能体自动接诊；提示作为其目标" } },
  { name: "output-format", type: "string", valueName: "<fmt>", choices: OUTPUT_FORMATS, description: { en: "text | json | stream-json", zh: "text | json | stream-json" } },
  { name: "input-format", type: "string", valueName: "<fmt>", choices: INPUT_FORMATS, description: { en: "text | stream-json (Op JSON lines on stdin)", zh: "text | stream-json（stdin 每行一个 Op JSON）" } },
  { name: "max-turns", type: "number", valueName: "<n>", description: { en: "Autopilot turns (or tool rounds for a single prompt); exceeding it exits 3", zh: "自动驾驶回合数（单条提示时为工具轮数）；超出时退出码 3" } },
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
];

export const JSON_FLAG: FlagSpec = { name: "json", type: "boolean", description: { en: "Machine-readable JSON output", zh: "输出 JSON" } };
