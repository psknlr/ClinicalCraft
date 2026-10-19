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
  "start.embodied":
    "Embodied mode: you have a body in the hospital and are at {place}. Clinical tools need you in the right place (the patient's bedside, a workstation, a device): " +
    "observe_world and find_entities show what is around, navigate_to walks there (it takes simulated time), interact_object operates equipment. " +
    "A clinical tool refused as out of reach (SPATIAL_REQUIREMENT_UNMET) carries data.hint.goal — pass it to navigate_to as goal.",
  "embodied.required":
    "{tool} needs an embodied session: start the case with start_case and \"embodied\": true. This session is in clinical mode (the mode is fixed for an encounter).",
  "start.unknownCase": "No case \"{ref}\". Use a case handle (id) from list_cases.",
  "session.unknown": "Unknown session_id \"{id}\". Start one with start_case (open sessions: {open}).",
  "session.none": "none",
  "approval.needed":
    "{rule} needs confirmation and was NOT carried out: {reason} (risk: {risk}; rule {ruleId}). " +
    "Tell the person you act for what this action is and its risk; only if they agree, call {tool} again with the same arguments plus \"confirm\": true.",
  "approval.confirmFirst":
    "{rule} needs confirmation and was NOT carried out: \"confirm\": true only counts when it repeats a call that was refused as needing confirmation. {reason} (risk: {risk}; rule {ruleId}). " +
    "Tell the person you act for what this action is and its risk; only if they agree, call {tool} again with the same arguments plus \"confirm\": true.",
  "approval.denied": "{tool} is not permitted: {reason} (rule {ruleId}).",
  "notice.line": "Notice: {text}",
  "hook.blocked": "{tool} was blocked by a PreToolUse hook: {reason}",
  "tool.failed": "{tool} failed: {message}",
  "tool.aborted": "{tool} was cancelled.",
  "debrief.header": "Assessment — {title}",
  "debrief.interim": "The case is not finished: this is an interim assessment.",
  "debrief.score": "Score {percent}% ({earned}/{possible}); objectives {done}/{total}; decisions right first time {firstTry}/{decisions}.",
  "debrief.coverage": "Required history asked {asked}/{required}; required examination {examined}/{examRequired}; hints used {hints}.",
  "debrief.missing": "Essential investigations not obtained: {list}",
  "debrief.missingCount": "Essential investigations not obtained yet: {count} (named once the case is complete).",
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
  "start.embodied":
    "具身模式：你在医院里有一个身体，现在位于{place}。临床工具要求你身处正确的位置（患者床旁、工作站、设备旁）：" +
    "observe_world 和 find_entities 显示周围情况，navigate_to 前往目的地（会消耗模拟时间），interact_object 操作设备。" +
    "因距离不够而被拒绝的临床工具（SPATIAL_REQUIREMENT_UNMET）会返回 data.hint.goal——把它作为 goal 传给 navigate_to。",
  "embodied.required":
    "{tool} 需要具身模式的会话：请用 start_case 并加上 \"embodied\": true 开始病例。本会话为临床模式（模式在一次接诊中固定不变）。",
  "start.unknownCase": "没有病例“{ref}”。请使用 list_cases 返回的病例编号（id）。",
  "session.unknown": "未知的 session_id “{id}”。请先用 start_case 开始会话（当前会话：{open}）。",
  "session.none": "无",
  "approval.needed":
    "{rule} 需要确认，尚未执行：{reason}（风险：{risk}；规则 {ruleId}）。" +
    "请先向你所代表的用户说明该操作及其风险；只有在对方同意后，才以相同参数并加上 \"confirm\": true 再次调用 {tool}。",
  "approval.confirmFirst":
    "{rule} 需要确认，尚未执行：\"confirm\": true 只对先前因需要确认而被拒绝的同一调用有效。{reason}（风险：{risk}；规则 {ruleId}）。" +
    "请先向你所代表的用户说明该操作及其风险；只有在对方同意后，才以相同参数并加上 \"confirm\": true 再次调用 {tool}。",
  "approval.denied": "不允许执行 {tool}：{reason}（规则 {ruleId}）。",
  "notice.line": "提示：{text}",
  "hook.blocked": "{tool} 被 PreToolUse 钩子阻止：{reason}",
  "tool.failed": "{tool} 执行失败：{message}",
  "tool.aborted": "{tool} 已取消。",
  "debrief.header": "评估——{title}",
  "debrief.interim": "病例尚未完成：以下为中期评估。",
  "debrief.score": "得分 {percent}%（{earned}/{possible}）；目标 {done}/{total}；决策首次答对 {firstTry}/{decisions}。",
  "debrief.coverage": "必问病史 {asked}/{required}；必做查体 {examined}/{examRequired}；使用提示 {hints} 次。",
  "debrief.missing": "未获得的关键检查：{list}",
  "debrief.missingCount": "尚未获得的关键检查：{count} 项（病例完成后列出名称）。",
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
