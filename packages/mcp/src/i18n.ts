/**
 * Runtime strings of the MCP server (zh-CN + en). Texts shared with the rest
 * of the runtime (case header, debrief notice…) come from the agent
 * package's `rt()`; these cover what only the MCP front-end says.
 */
import { normalizeLocale } from "@clinicalcraft/core";

const EN = {
  "cases.header": "Available cases ({count}):",
  "cases.line": "- {id} — {title} · {specialty} · difficulty {difficulty}/5{minutes}",
  "cases.minutes": " · ~{minutes} min",
  "start.header": "Session {session} started.",
  "start.says": "{speaker}: “{text}”",
  "start.next":
    "Pass session_id \"{session}\" to every clinical tool. Talk with ask_patient, find ids with list_options, then examine / order_test / read_result / answer_decision; " +
    "case_status shows objectives and open decisions; finish_case when every objective is complete; get_debrief for the assessment.",
  "start.failed": "Could not start the case: {message}",
  "session.unknown": "Unknown session_id \"{id}\". Start one with start_case (open sessions: {open}).",
  "session.none": "none",
  "approval.needed":
    "{tool} needs approval ({reason} — rule {ruleId}) and this MCP server cannot ask a person. " +
    "Allow it in the ClinicalCraft settings (approvalMode \"bypass\" or \"auto\", or a permissions.allow rule such as \"{rule}\").",
  "approval.denied": "{tool} is not permitted: {reason} (rule {ruleId}).",
  "hook.blocked": "{tool} was blocked by a PreToolUse hook: {reason}",
  "tool.failed": "{tool} failed: {message}",
  "tool.aborted": "{tool} was cancelled.",
  "debrief.header": "Assessment — {title}",
  "debrief.interim": "The case is not finished: this is an interim assessment.",
  "debrief.score": "Score {percent}% ({earned}/{possible}); objectives {done}/{total}; decisions right first time {firstTry}/{decisions}.",
  "debrief.coverage": "Required history asked {asked}/{required}; required examination {examined}/{examRequired}; hints used {hints}.",
  "debrief.missing": "Essential investigations not obtained: {list}",
  "debrief.lowValue": "Low-value investigations: {list}",
  "debrief.harmful": "Potentially harmful investigations: {list}",
  "debrief.unread": "Results ordered but never read: {list}",
  "debrief.unsafe": "Contraindicated interventions given: {count}",
  "debrief.judged": "Examiner judgements:",
  "debrief.failed": "The assessment could not be produced: {message}",
} as const;

export type McpMessageKey = keyof typeof EN;

const ZH: Record<McpMessageKey, string> = {
  "cases.header": "可用病例（{count}）：",
  "cases.line": "- {id} — {title} · {specialty} · 难度 {difficulty}/5{minutes}",
  "cases.minutes": " · 约 {minutes} 分钟",
  "start.header": "会话 {session} 已开始。",
  "start.says": "{speaker}：“{text}”",
  "start.next":
    "每个临床工具都要传入 session_id \"{session}\"。用 ask_patient 问诊，用 list_options 查找 id，然后 examine / order_test / read_result / answer_decision；" +
    "case_status 显示目标与待作答的决策；所有目标完成后调用 finish_case；get_debrief 获取评估。",
  "start.failed": "无法开始病例：{message}",
  "session.unknown": "未知的 session_id “{id}”。请先用 start_case 开始会话（当前会话：{open}）。",
  "session.none": "无",
  "approval.needed":
    "{tool} 需要批准（{reason}——规则 {ruleId}），而此 MCP 服务器无法询问用户。" +
    "请在 ClinicalCraft 设置中允许它（approvalMode 设为 \"bypass\" 或 \"auto\"，或添加 permissions.allow 规则，如 \"{rule}\"）。",
  "approval.denied": "不允许执行 {tool}：{reason}（规则 {ruleId}）。",
  "hook.blocked": "{tool} 被 PreToolUse 钩子阻止：{reason}",
  "tool.failed": "{tool} 执行失败：{message}",
  "tool.aborted": "{tool} 已取消。",
  "debrief.header": "评估——{title}",
  "debrief.interim": "病例尚未完成：以下为中期评估。",
  "debrief.score": "得分 {percent}%（{earned}/{possible}）；目标 {done}/{total}；决策首次答对 {firstTry}/{decisions}。",
  "debrief.coverage": "必问病史 {asked}/{required}；必做查体 {examined}/{examRequired}；使用提示 {hints} 次。",
  "debrief.missing": "未获得的关键检查：{list}",
  "debrief.lowValue": "低价值检查：{list}",
  "debrief.harmful": "可能有害的检查：{list}",
  "debrief.unread": "已开具但未查看的结果：{list}",
  "debrief.unsafe": "给予了禁忌的处置：{count} 次",
  "debrief.judged": "考官判定：",
  "debrief.failed": "无法生成评估：{message}",
};

/** Localised MCP message with `{name}` placeholders filled in. */
export function mm(locale: string, key: McpMessageKey, params: Record<string, string | number> = {}): string {
  const table = normalizeLocale(locale) === "zh-CN" ? ZH : EN;
  return table[key].replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}
