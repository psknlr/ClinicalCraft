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
  countCorrect: { en: "Count of {item} correct: {n} of {of}.", "zh-CN": "{item}清点无误：{n}/{of}。" },
  countHold: { en: "Count incorrect — {n} of {of} {item}. Please hold closure and check the wound.", "zh-CN": "清点不符——{item}只有{n}/{of}。请暂停关闭，检查术野。" },
  holdReadback: { en: "Holding closure — checking the wound.", "zh-CN": "暂停关闭——我检查术野。" },
  holdConfirm: { en: "Yes — hold closure.", "zh-CN": "对，暂停关闭。" },
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
