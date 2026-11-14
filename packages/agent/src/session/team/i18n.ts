/**
 * What the team says (docs/TEAM.md), in both languages: every message is kept as `LocalizedText` so the record
 * reads the same in either. Words follow docs/GLOSSARY.md (巡回护士, 洗手护士, 术者…).
 */
import type { LocalizedText } from "@clinicalcraft/core";

/** Text in both languages (every team message carries both). */
export type Bilingual = { en: string; "zh-CN": string };

type Params = Record<string, Bilingual>;

const PHRASES = {
  notice: { en: "A {item} for {for} — on its way.", "zh-CN": "给{for}的{item}马上来。" },
  request: { en: "{to}, please pass a {item} to {for}.", "zh-CN": "{to}，请把{item}递给{for}。" },
  readback: { en: "A {item} to {for} — confirm?", "zh-CN": "{item}递给{for}——确认吗？" },
  confirm: { en: "Yes — a {item} to {for}.", "zh-CN": "对，{item}递给{for}。" },
  handed: { en: "{item} passed to {for}.", "zh-CN": "{item}已递给{for}。" },
  verified: { en: "{for} has the {item}.", "zh-CN": "{for}已拿到{item}。" },
  notFound: { en: "I can't find a {item} here.", "zh-CN": "这里找不到{item}。" },
  notHere: { en: "{for} isn't at the table — I can't pass the {item}.", "zh-CN": "{for}不在手术床旁，{item}没法递过去。" },
  handsFull: { en: "{for}'s hands are full — I can't pass the {item}.", "zh-CN": "{for}手里拿满了，{item}递不过去。" },
  failedAct: { en: "I couldn't pass the {item}: {reason}.", "zh-CN": "{item}没能递过去：{reason}。" },
  nobody: { en: "Nobody is free to bring a {item} for {for}.", "zh-CN": "没有人能把{item}拿给{for}。" },
  unresolved: { en: "The {item} for {for} hasn't arrived — {reason}.", "zh-CN": "给{for}的{item}还没送到——{reason}。" },
  surgeon: { en: "the surgeon", "zh-CN": "术者" },
  acknowledged: { en: "Understood.", "zh-CN": "收到。" },
  // the count (docs/TEAM.md §4.3)
  countReport: { en: "Count of {item}: {n} of {of}.", "zh-CN": "{item}清点：{n}/{of}。" },
  countReportExtra: { en: "Count of {item}: {n} of {of}, and {k} not in the count.", "zh-CN": "{item}清点：{n}/{of}，另有{k}件不在清点内。" },
  countHoldExtra: { en: "Count incorrect — {k} {item} not in the count ({n} of {of}). Please hold closure while we check.", "zh-CN": "清点不符——有{k}件{item}不在清点内（{n}/{of}）。请暂停关闭，我们核查。" },
  setAside: { en: "{what} is not in this count — set aside off the field.", "zh-CN": "{what}不在本次清点内——已移出手术野另放。" },
  countUnresolvedExtra: { en: "Count still not reconciled after searching the room ({n} of {of} {item}, {k} not in the count) — an X-ray before the patient leaves.", "zh-CN": "全面查找后清点仍不相符（{item}{n}/{of}，{k}件不在清点内）——患者离开前需拍 X 线片。" },
  countCorrect: { en: "Count of {item} correct: {n} of {of}.", "zh-CN": "{item}清点无误：{n}/{of}。" },
  countHold: { en: "Count incorrect — {n} of {of} {item}. Please hold closure and check the wound.", "zh-CN": "清点不符——{item}只有{n}/{of}。请暂停关闭，检查术野。" },
  holdReadback: { en: "Holding closure — checking the wound.", "zh-CN": "暂停关闭——我检查术野。" },
  holdConfirm: { en: "Yes — hold closure.", "zh-CN": "对，暂停关闭。" },
  holdClarify: { en: "Not that — please hold closure and check the wound for the missing {item}.", "zh-CN": "不是那个——请暂停关闭，检查术野里缺少的{item}。" },
  recount: { en: "{to}, please recount the {item}.", "zh-CN": "{to}，请重新清点{item}。" },
  woundChecked: { en: "Wound checked.", "zh-CN": "术野已检查。" },
  countReconciled: { en: "Recount correct: {n} of {of} {item} — you may close.", "zh-CN": "复点无误：{item}{n}/{of}——可以关闭。" },
  countUnresolved: { en: "Still {n} of {of} {item} after searching the room — an X-ray before the patient leaves.", "zh-CN": "全面查找后{item}仍只有{n}/{of}——患者离开前需拍 X 线片。" },
  // why a task could not be done, as a colleague tells it (escalations)
  "why.noAnswer": { en: "no answer from {to}", "zh-CN": "{to}没有回应" },
  "why.notFound": { en: "{to} can't find one in the room", "zh-CN": "{to}在手术间里找不到" },
  "why.notHere": { en: "{for} isn't at the table", "zh-CN": "{for}不在手术床旁" },
  "why.handsFull": { en: "{for}'s hands are full", "zh-CN": "{for}手里拿满了" },
  "why.failed": { en: "{to} couldn't pass it", "zh-CN": "{to}没能递过去" },
  "why.nobody": { en: "nobody is free to bring it", "zh-CN": "没有人能去拿" },
  // the operative field asked of a colleague (docs/TEAM.md §4.4): the request, its read-back, the report, a decline
  "ask.traction": { en: "{to}, please hold the {instrument} in port {port}, pulling {structure} {direction}{force}.", "zh-CN": "{to}，请拉住 {port} 孔的{instrument}，把{structure}向{direction}牵拉{force}。" },
  "ask.release": { en: "{to}, please let go of port {port}.", "zh-CN": "{to}，请松开 {port} 孔。" },
  "ask.releaseAll": { en: "{to}, please let go.", "zh-CN": "{to}，请松手。" },
  "ask.camera": { en: "{to}, take the camera, please.", "zh-CN": "{to}，请扶镜。" },
  "ask.aim": { en: "{to}, camera on {region}, please.", "zh-CN": "{to}，镜头对准{region}。" },
  "ask.aimClose": { en: "{to}, camera on {region}, close up, please.", "zh-CN": "{to}，镜头对准{region}并推近。" },
  "ask.closer": { en: "{to}, closer, please.", "zh-CN": "{to}，推近。" },
  "ask.wider": { en: "{to}, wider, please.", "zh-CN": "{to}，拉远。" },
  "ask.pass": { en: "{to}, {instrument}, please.", "zh-CN": "{to}，请递{instrument}。" },
  "readback.traction": { en: "The {instrument} in port {port}, pulling {structure} {direction}{force} — confirm?", "zh-CN": "{port} 孔的{instrument}，把{structure}向{direction}牵拉{force}——确认吗？" },
  "readback.release": { en: "Letting go of port {port} — confirm?", "zh-CN": "松开 {port} 孔——确认吗？" },
  "readback.releaseAll": { en: "Letting go of everything I hold — confirm?", "zh-CN": "我手上的全部松开——确认吗？" },
  "readback.camera": { en: "I take the camera in port {port} — confirm?", "zh-CN": "我来扶 {port} 孔的镜头——确认吗？" },
  "readback.cameraAny": { en: "I take the camera — confirm?", "zh-CN": "我来扶镜——确认吗？" },
  "readback.aim": { en: "Camera on {region} — confirm?", "zh-CN": "镜头对准{region}——确认吗？" },
  "readback.aimClose": { en: "Camera on {region}, close up — confirm?", "zh-CN": "镜头对准{region}并推近——确认吗？" },
  "readback.closer": { en: "Closer — confirm?", "zh-CN": "推近——确认吗？" },
  "readback.wider": { en: "Wider — confirm?", "zh-CN": "拉远——确认吗？" },
  "readback.pass": { en: "{instrument} to {for} — confirm?", "zh-CN": "{instrument}递给{for}——确认吗？" },
  "report.holding": { en: "Holding.", "zh-CN": "拉住了。" },
  "report.camera": { en: "I have the camera.", "zh-CN": "镜头我扶好了。" },
  "report.aimed": { en: "Camera on {region}.", "zh-CN": "镜头已对准{region}。" },
  "report.closer": { en: "Closer.", "zh-CN": "已推近。" },
  "report.wider": { en: "Wider.", "zh-CN": "已拉远。" },
  "report.passed": { en: "Passed.", "zh-CN": "递好了。" },
  "report.lettingGo": { en: "Letting go now.", "zh-CN": "我松手了。" },
  "decline.noControl": { en: "I don't hold the {control} control{instead}.", "zh-CN": "我没有{control}的分工权限{instead}。" },
  "decline.operatorInstrument": { en: "The {instrument} in port {port} is the operator's own instrument.", "zh-CN": "{port} 孔的{instrument}是术者自己的器械。" },
  "decline.notTraction": { en: "The {instrument} in port {port} is not for traction.", "zh-CN": "{port} 孔的{instrument}不能用来牵引。" },
  "decline.portHeld": { en: "{holder} holds port {port}: they hand it over themselves.", "zh-CN": "{port} 孔由{holder}握持：需由其本人交出。" },
  "decline.noPort": { en: "There is no port {port}.", "zh-CN": "没有 {port} 孔。" },
  "decline.emptyPort": { en: "There is no instrument in port {port} to hold.", "zh-CN": "{port} 孔里没有可以握持的器械。" },
  "decline.notCameraPort": { en: "Port {port} is not the camera port.", "zh-CN": "{port} 孔不是观察孔。" },
  "decline.noField": { en: "There is no operative field to work in yet.", "zh-CN": "还没有可以操作的术野。" },
  "decline.nothingHeld": { en: "I'm not holding anything.", "zh-CN": "我手上没有握持器械。" },
  "decline.aimFirst": { en: "A close view needs something to look at: tell me where to aim the camera first.", "zh-CN": "推近需要先对准一个部位：请先告诉我镜头对准哪里。" },
  "decline.unknownRegion": { en: "There is no region {region}.", "zh-CN": "没有 {region} 这个区域。" },
  "decline.failed": { en: "I couldn't do it: {reason}.", "zh-CN": "没能做到：{reason}。" },
  // the learner's own answer to a read-back, when they give no words of their own (`team reply` confirm / decline)
  "reply.confirm": { en: "Yes — go ahead.", "zh-CN": "对，开始吧。" },
  "reply.decline": { en: "No — not now.", "zh-CN": "先不用。" },
  // the stand-in surgeon's call-out before a critical step (docs/TEAM.md §4.5): approved "No objection", denied "Stop"
  "callout.clip": { en: "Clipping {structure}.", "zh-CN": "正在夹闭{structure}。" },
  "callout.divide": { en: "Dividing {structure}.", "zh-CN": "正在离断{structure}。" },
  "callout.coagulate": { en: "Coagulating {structure}.", "zh-CN": "正在电凝{structure}。" },
  "callout.bailout": { en: "Bail-out: {strategy}.", "zh-CN": "补救策略：{strategy}。" },
  // clauses (filled into the sentences above; never capitalised)
  "clause.the": { en: "the {name}", "zh-CN": "{name}" },
  "clause.learner": { en: "the {position} (you)", "zh-CN": "{position}（你）" },
  "clause.instead": { en: ": ask {who}", "zh-CN": "：请找{who}" },
  "clause.yours": { en: ": you do", "zh-CN": "：你有" },
  "clause.or": { en: " or ", "zh-CN": "或" },
  "clause.and": { en: " and ", "zh-CN": "、" },
  "clause.force.gentle": { en: ", gently", "zh-CN": "，轻柔一些" },
  "clause.force.excessive": { en: ", hard", "zh-CN": "，用力" },
  "clause.dir.cephalad": { en: "cephalad", "zh-CN": "头侧" },
  "clause.dir.caudal": { en: "caudally", "zh-CN": "尾侧" },
  "clause.dir.patient-left": { en: "to the patient's left", "zh-CN": "患者左侧" },
  "clause.dir.patient-right": { en: "to the patient's right", "zh-CN": "患者右侧" },
  "clause.dir.anterior": { en: "anteriorly", "zh-CN": "腹侧" },
  "clause.dir.posterior": { en: "posteriorly", "zh-CN": "背侧" },
  "clause.bailout.call-help": { en: "calling for senior help", "zh-CN": "呼叫上级医师" },
  "clause.bailout.subtotal-fenestrating": { en: "subtotal cholecystectomy (fenestrating)", "zh-CN": "胆囊次全切除（开窗式）" },
  "clause.bailout.subtotal-reconstituting": { en: "subtotal cholecystectomy (reconstituting)", "zh-CN": "胆囊次全切除（重建式）" },
  "clause.bailout.convert-open": { en: "converting to open", "zh-CN": "中转开腹" },
  "clause.bailout.abandon-refer": { en: "abandoning and referring", "zh-CN": "终止手术并转诊" },
} as const;

export type TeamPhrase = keyof typeof PHRASES;

/** A team phrase in both languages, `{name}` placeholders filled from per-language values. */
export function phrase(key: TeamPhrase, params: Params = {}): Bilingual {
  const fill = (text: string, lang: "en" | "zh-CN") => text.replace(/\{(\w+)\}/g, (m, name: string) => params[name]?.[lang] ?? m);
  const p = PHRASES[key];
  const en = fill(p.en, "en");
  // a sentence starts with a capital ("The surgeon needs…"); a clause (`why.*`, `clause.*`) is left as it is
  const clause = key.startsWith("why.") || key.startsWith("clause.");
  return { en: clause ? en : en.charAt(0).toUpperCase() + en.slice(1), "zh-CN": fill(p["zh-CN"], "zh-CN") };
}

/** Bilingual values joined as a list ("A, B or C" / "A、B或C"; `last`: the last joiner). */
export function joinBoth(values: readonly Bilingual[], last: "or" | "and" = "and"): Bilingual {
  const join = (lang: "en" | "zh-CN") => {
    const xs = values.map((v) => v[lang]);
    if (xs.length <= 1) return xs[0] ?? "";
    const sep = lang === "en" ? ", " : "、";
    return `${xs.slice(0, -1).join(sep)}${PHRASES[`clause.${last}`][lang]}${xs.at(-1)}`;
  };
  return { en: join("en"), "zh-CN": join("zh-CN") };
}

/** A name in both languages from a localized value (strings stand for both). */
export function both(value: LocalizedText | string): Bilingual {
  if (typeof value === "string") return { en: value, "zh-CN": value };
  return { en: value.en ?? value["zh-CN"] ?? "", "zh-CN": value["zh-CN"] ?? value.en ?? "" };
}

/** The surgeon, as the team calls them. */
export const SURGEON_NAME: Bilingual = PHRASES.surgeon;
