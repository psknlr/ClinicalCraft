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
  // the operative site (docs/TEAM.md §4.5)
  siteConfirmed: { en: "Site checked: the mark is on {side}, and {basis} agree.", "zh-CN": "手术部位已核对：标记在{side}，与{basis}一致。" },
  siteHold: { en: "{to}, please hold {step}: the site is not confirmed — {a}: {va}; {b}: {vb}.", "zh-CN": "{to}，请暂缓{step}：手术部位尚未确认——{a}：{va}；{b}：{vb}。" },
  siteHoldReadback: { en: "Holding {step}.", "zh-CN": "暂缓{step}。" },
  siteHoldConfirm: { en: "Yes — hold {step}.", "zh-CN": "对，暂缓{step}。" },
  siteVerify: {
    en: "Stop, please — the site is not confirmed ({a}: {va}; {b}: {vb}). I am holding {step}. Please verify the side against {evidence}, and mark the site.",
    "zh-CN": "请停一下——手术部位尚未确认（{a}：{va}；{b}：{vb}）。我已暂缓{step}。请对照{evidence}核实手术侧别，并标记手术部位。",
  },
  siteVerifyReadback: { en: "Stopping — I will verify the side myself.", "zh-CN": "停下——我亲自核实侧别。" },
  siteVerified: { en: "Verified against {evidence}: {side}.{done}", "zh-CN": "已对照{evidence}核实：{side}。{done}" },
  siteDoneMarked: { en: " I have marked the site on {side}.", "zh-CN": "我已在{side}做了标记。" },
  siteDoneAmended: { en: " I have corrected {source} to {side}.", "zh-CN": "我已把{source}更正为{side}。" },
  siteDoneRight: { en: " The mark is right.", "zh-CN": "标记无误。" },
  siteConflict: { en: "I cannot confirm the side: {a} says {va}, but {b} says {vb}.", "zh-CN": "我无法确认侧别：{a}是{va}，而{b}是{vb}。" },
  siteStill: { en: "Not confirmed yet: {a} ({va}) still does not agree with {b} ({vb}).", "zh-CN": "还不能确认：{a}（{va}）与{b}（{vb}）仍不一致。" },
  siteUnverified: { en: "Not confirmed yet: nobody has checked {evidence} since the discrepancy.", "zh-CN": "还不能确认：提出不一致后尚未核对{evidence}。" },
  siteBlocked: { en: "Not confirmed yet: {reason}.", "zh-CN": "还不能确认：{reason}。" },
  siteCorrected: {
    en: "Site confirmed on {side}: verified against {evidence}, and I have looked at the mark and {basis} again myself.{hold}",
    "zh-CN": "手术部位确认在{side}：已对照{evidence}核实，标记和{basis}我也重新亲自核对过。{hold}",
  },
  siteSettledBy: { en: "Site confirmed on {side} by {who}.{hold}", "zh-CN": "{who}已确认手术部位在{side}。{hold}" },
  siteHoldReleased: { en: " The hold on {step} is released.", "zh-CN": "{step}的暂缓已解除。" },
  siteHoldTheirs: { en: " The hold on {step} is {who}'s to release.", "zh-CN": "{step}的暂缓由{who}解除。" },
  siteProceed: { en: "{to}, the site is confirmed on {side} — the hold on {step} is released.", "zh-CN": "{to}，手术部位已确认在{side}——{step}的暂缓已解除。" },
  siteUnresolved: {
    en: "Site not confirmed — {a} says {va}, {b} says {vb}: it cannot be settled in this room, and {step} stays on hold.",
    "zh-CN": "手术部位无法确认——{a}是{va}，{b}是{vb}：在手术间内无法解决，{step}继续暂缓。",
  },
  siteStep: { en: "the next step", "zh-CN": "下一步操作" },
  unresolvedSite: { en: "Site not confirmed — {reason}.", "zh-CN": "手术部位无法确认——{reason}。" },
  // why a task could not be done, as a colleague tells it (escalations)
  "why.noAnswer": { en: "no answer from {to}", "zh-CN": "{to}没有回应" },
  "why.notFound": { en: "{to} can't find one in the room", "zh-CN": "{to}在手术间里找不到" },
  "why.notHere": { en: "{for} isn't at the table", "zh-CN": "{for}不在手术床旁" },
  "why.handsFull": { en: "{for}'s hands are full", "zh-CN": "{for}手里拿满了" },
  "why.failed": { en: "{to} couldn't pass it", "zh-CN": "{to}没能递过去" },
  "why.nobody": { en: "nobody is free to bring it", "zh-CN": "没有人能去拿" },
  "why.siteConflict": { en: "{a} says {va}, but {b} says {vb}: what the side is verified against disagrees with itself", "zh-CN": "{a}是{va}，而{b}是{vb}：用来核实侧别的依据自相矛盾" },
} as const;

export type TeamPhrase = keyof typeof PHRASES;

/** A team phrase in both languages, `{name}` placeholders filled from per-language values. */
export function phrase(key: TeamPhrase, params: Params = {}): Bilingual {
  const fill = (text: string, lang: "en" | "zh-CN") => text.replace(/\{(\w+)\}/g, (m, name: string) => params[name]?.[lang] ?? m);
  const p = PHRASES[key];
  const en = fill(p.en, "en");
  // a sentence starts with a capital ("The surgeon needs…"); a clause (`why.*`) is left as it is
  return { en: key.startsWith("why.") ? en : en.charAt(0).toUpperCase() + en.slice(1), "zh-CN": fill(p["zh-CN"], "zh-CN") };
}

/** A name in both languages from a localized value (strings stand for both). */
export function both(value: LocalizedText | string): Bilingual {
  if (typeof value === "string") return { en: value, "zh-CN": value };
  return { en: value.en ?? value["zh-CN"] ?? "", "zh-CN": value["zh-CN"] ?? value.en ?? "" };
}

/** The surgeon, as the team calls them. */
export const SURGEON_NAME: Bilingual = PHRASES.surgeon;
