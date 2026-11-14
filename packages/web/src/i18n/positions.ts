/**
 * UI strings of the places in the care team (docs/TEAM.md §1) — merged into the zh-CN and en tables (`zh-CN.ts`,
 * `en.ts`), so `tr()` type-checks their keys: the places the intro's picker offers and the line-ups, the positions and
 * controls by their names (core's `POSITION_TITLES` and `CONTROL_TITLES`, the one source of those names), and the words
 * for who holds what ("you"). Words follow docs/GLOSSARY.md: "your place in the team" (你担任的岗位), "line-up" (团队配置),
 * "stand-in surgeon" (主刀同事), controls (分工权限) — never "seat" or "role" in learner text.
 */
import { CONTROL_TITLES, POSITION_TITLES, type StaffPosition, type SurgicalControl } from "@clinicalcraft/core";

const zh = (p: StaffPosition): string => POSITION_TITLES[p]["zh-CN"];
const en = (p: StaffPosition): string => POSITION_TITLES[p].en;
/** A title at the head of a label ("First assistant"). */
const head = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const czh = (c: SurgicalControl): string => CONTROL_TITLES[c]["zh-CN"];
const cen = (c: SurgicalControl): string => CONTROL_TITLES[c].en;

export const POSITIONS_ZH = {
  /* ---------------- the places (the intro's picker; docs/GLOSSARY.md "your place in the team") ---------------- */
  "place.surgeon": "主刀医生（团队各岗位的事也可由你做）",
  "place.first-assistant": zh("first-assistant"),
  "place.second-assistant": zh("second-assistant"),
  "place.scrub-nurse": zh("scrub-nurse"),
  "intro.place.label": "你担任的岗位",
  "intro.place.hint": "选择团队中的岗位：你在手术台旁加入团队（此前的工作由团队完成），由主刀同事主刀。",
  "intro.place.saved": "保存的接诊：{place}",
  "intro.place.refused": "未能以{place}岗位开始",
  "intro.place.resumeRefused": "未能以{place}岗位继续",
  "intro.place.unavailable": "{place}（此团队配置下不提供）",
  "intro.lineup.label": "团队配置",
  "intro.lineup.base": "病例原有团队",
  "intro.lineup.tagged": "{name}（{tag}）",
  "intro.lineup.tag.authored": "编写",
  "intro.lineup.tag.published-case": "如原报告",
  "intro.place.loading": "正在获取加入团队所需的参考步骤……",
  "intro.place.pathFailed": "未能获取加入团队所需的参考步骤",
  "intro.place.path.notFound": "此服务器不提供这些步骤（可能是较旧的版本）：请以主刀医生身份开始，或更新服务器。",
  "intro.place.path.http": "服务器拒绝了请求（HTTP {status}）。",
  "intro.place.path.timeout": "服务器未能及时响应：请重试。",
  "intro.place.path.network": "无法连接服务器：请重试。",
  "intro.place.path.malformed": "服务器返回的不是本病例的步骤。",
  /* ---------------- positions (core POSITION_TITLES) ---------------- */
  "position.surgeon": zh("surgeon"),
  "position.assistant-surgeon": zh("assistant-surgeon"),
  "position.first-assistant": zh("first-assistant"),
  "position.second-assistant": zh("second-assistant"),
  "position.anaesthetist": zh("anaesthetist"),
  "position.scrub-nurse": zh("scrub-nurse"),
  "position.circulating-nurse": zh("circulating-nurse"),
  "position.ward-nurse": zh("ward-nurse"),
  "position.recovery-nurse": zh("recovery-nurse"),
  "position.theatre-coordinator": zh("theatre-coordinator"),
  "position.physician": zh("physician"),
  "position.educator": zh("educator"),
  "position.radiologist": zh("radiologist"),
  "position.radiographer": zh("radiographer"),
  "position.pathologist": zh("pathologist"),
  "position.lab-technician": zh("lab-technician"),
  "position.transfusion-scientist": zh("transfusion-scientist"),
  "position.pharmacist": zh("pharmacist"),
  "position.receptionist": zh("receptionist"),
  "position.porter": zh("porter"),
  "position.paramedic": zh("paramedic"),
  /* ---------------- controls (core CONTROL_TITLES; docs/GLOSSARY.md "controls") ---------------- */
  "control.operate": czh("operate"),
  "control.camera": czh("camera"),
  "control.retract": czh("retract"),
  "control.suction": czh("suction"),
  "control.close": czh("close"),
  "control.instruments": czh("instruments"),
  "control.count": czh("count"),
  "control.equipment": czh("equipment"),
  "control.anaesthesia": czh("anaesthesia"),
  /* ---------------- who holds what ---------------- */
  "holder.you": "你",
  "holder.named": "{name}（{position}）",
} as const;

export const POSITIONS_EN: Record<keyof typeof POSITIONS_ZH, string> = {
  /* ---------------- the places (the intro's picker; docs/GLOSSARY.md "your place in the team") ---------------- */
  "place.surgeon": "Operating surgeon (you may also do the team's parts)",
  "place.first-assistant": head(en("first-assistant")),
  "place.second-assistant": head(en("second-assistant")),
  "place.scrub-nurse": head(en("scrub-nurse")),
  "intro.place.label": "Your place in the team",
  "intro.place.hint": "A place in the team: you join the team at the operating table (what came before is done by the team), and the stand-in surgeon operates.",
  "intro.place.saved": "Saved encounter: {place}",
  "intro.place.refused": "Could not start as the {place}",
  "intro.place.resumeRefused": "Could not continue as the {place}",
  "intro.place.unavailable": "{place} — not offered with this team",
  "intro.lineup.label": "Team",
  "intro.lineup.base": "The case's own team",
  "intro.lineup.tagged": "{name} ({tag})",
  "intro.lineup.tag.authored": "authored",
  "intro.lineup.tag.published-case": "as reported",
  "intro.place.loading": "Fetching the reference steps the team joins along…",
  "intro.place.pathFailed": "Could not fetch the reference steps the team joins along",
  "intro.place.path.notFound": "This server does not serve them (an older version?): start as the operating surgeon, or update the server.",
  "intro.place.path.http": "The server refused the request (HTTP {status}).",
  "intro.place.path.timeout": "The server did not answer in time: try again.",
  "intro.place.path.network": "The server could not be reached: try again.",
  "intro.place.path.malformed": "The server's answer is not this case's steps.",
  /* ---------------- positions (core POSITION_TITLES) ---------------- */
  "position.surgeon": en("surgeon"),
  "position.assistant-surgeon": en("assistant-surgeon"),
  "position.first-assistant": en("first-assistant"),
  "position.second-assistant": en("second-assistant"),
  "position.anaesthetist": en("anaesthetist"),
  "position.scrub-nurse": en("scrub-nurse"),
  "position.circulating-nurse": en("circulating-nurse"),
  "position.ward-nurse": en("ward-nurse"),
  "position.recovery-nurse": en("recovery-nurse"),
  "position.theatre-coordinator": en("theatre-coordinator"),
  "position.physician": en("physician"),
  "position.educator": en("educator"),
  "position.radiologist": en("radiologist"),
  "position.radiographer": en("radiographer"),
  "position.pathologist": en("pathologist"),
  "position.lab-technician": en("lab-technician"),
  "position.transfusion-scientist": en("transfusion-scientist"),
  "position.pharmacist": en("pharmacist"),
  "position.receptionist": en("receptionist"),
  "position.porter": en("porter"),
  "position.paramedic": en("paramedic"),
  /* ---------------- controls (core CONTROL_TITLES; docs/GLOSSARY.md "controls") ---------------- */
  "control.operate": cen("operate"),
  "control.camera": cen("camera"),
  "control.retract": cen("retract"),
  "control.suction": cen("suction"),
  "control.close": cen("close"),
  "control.instruments": cen("instruments"),
  "control.count": cen("count"),
  "control.equipment": cen("equipment"),
  "control.anaesthesia": cen("anaesthesia"),
  /* ---------------- who holds what ---------------- */
  "holder.you": "you",
  "holder.named": "{name} ({position})",
};
