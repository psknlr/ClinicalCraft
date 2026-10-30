/**
 * Requests to a colleague in the learner's own words (docs/EMBODIED.md §8.4), recognised deterministically in both
 * languages — what the colleague then does is a world action with their own body, within their role
 * (`staff-requests.ts`), never a model's claim:
 *
 * | e.g.                                                         | intent |
 * |--------------------------------------------------------------|--------|
 * | "Please put him on the monitor", "给他上监护"                  | `task` attach_monitor |
 * | "Could you do a 12-lead ECG?", "做个心电图"                    | `task` record_ecg |
 * | "Put in a cannula", "建立静脉通路"                             | `task` obtain_iv_access |
 * | "Bring the defibrillator", "把除颤仪推过来"                     | `fetch` (the words naming what) |
 * | "Pass me the scalpel", "Scalpel, please", "把手术刀递给我", "纱布" | `hand` (a carried item, from their hands to the learner's) |
 * | "Give aspirin 300 mg", "给他用阿司匹林"                         | `give` (the words naming what; talk unless the case has it) |
 * | "Please take the patient to CT", "把患者送到CT室"               | `take` (`movement-intents.ts`) |
 * | "Come here", "Come to the bedside", "过来一下", "到床旁来"       | `come` (to the learner / to the patient) |
 * | "You can go back now", "回护士站吧"                            | `back` (to their post) |
 * | "Show me the way to the pharmacy", "带我去药房"                 | `guide` |
 * | "Where is the CT scanner?", "CT室在哪里？"                     | `where` |
 *
 * Anchored to the whole short utterance, like the patient's requests: "Did you give the aspirin?", "What did the
 * ECG show?", "Where did he fall?" are talk. A bare noun ("Scalpel.", "纱布") is a `hand` request only as a guess:
 * the colleague passes it when the world has a handheld item called that, else the words stay talk.
 */
import { EN_ASK, EN_LEAD, EN_TAIL, isZhText, MAX_LENGTH, movementIntent, ZH_LEAD, ZH_TAIL } from "./movement-intents.js";

/** Delegation tasks a request names directly. */
export type NamedTask = "attach_monitor" | "record_ecg" | "obtain_iv_access";

/** A request to a colleague (see the module table). */
export type StaffIntent =
  | { kind: "task"; task: NamedTask }
  | { kind: "fetch"; what: string }
  | { kind: "hand"; what: string }
  | { kind: "give"; what: string }
  | { kind: "take"; destination: string | null }
  | { kind: "come"; to: "me" | "patient" }
  | { kind: "back" }
  | { kind: "guide"; place: string }
  | { kind: "where"; place: string };

const tidy = (s: string) =>
  s
    .trim()
    .replace(/^(?:the|a|an|some|another|that|this|my)\s+/iu, "")
    .replace(/^(?:那个|这个|一个|一台|一下|一把|一支|一块|一根|一包|一副)/u, "")
    .trim();

/** Who the patient is in a request ("him", "the patient", their name). */
function patientWords(names: readonly string[], zh: boolean): string {
  const own = names.filter((n) => n.trim()).map((n) => n.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return (zh ? ["患者", "病人", "他", "她", "这位患者", "病患", ...own] : ["(?:the |this |our )?patient", "him", "her", "them", ...own]).join("|");
}

/** Short replies that are not an item called for (a bare-noun `hand` guess). */
const ZH_NOT_A_THING = /^(?:好的?|好了|好吧|谢谢|是的?|不是|对的?|不对|没有|没事|可以|不行|行|嗯+|哦+|你好|您好|明白|明白了|知道了|收到|等等|稍等|继续|停|开始|结束)$/u;
/** Characters a bare instrument name does not carry (a short sentence: "他是在哪里摔倒的", "来一下"). */
const ZH_NOT_A_NOUN = /[是在吗了呢吧我你您他她它么什怎哪谁有没不要请帮能会看说做给把去来到过还就都也很太呀啊哈嘛]/u;
const EN_NOT_A_THING = /^(?:yes|yeah|yep|no|nope|ok(?:ay)?|sure|fine|good|great|right|thanks?|thank you|hi|hello|hey|sorry|what|why|how|who|when|where|which|wait|stop|go|continue|done|ready|me|you|him|her|them|it|this|that)$/iu;

function zhIntent(text: string, names: readonly string[]): StaffIntent | null {
  const s = text.replace(ZH_LEAD, "");
  const end = (rest: string) => !rest.replace(ZH_TAIL, "").trim();
  const ask = String.raw`^(?:请|麻烦)?(?:你|您)?(?:帮(?:我|忙)?)?(?:先)?`;
  const who = patientWords(names, true);
  let m = new RegExp(String.raw`${ask}(?:给(?:${who}))?(?:上|接|连接|连上|接上|装上|上个)(?:个|一下)?(?:心电)?监护(?:仪)?(.*)$`, "u").exec(s) ?? new RegExp(String.raw`${ask}把(?:心电)?监护(?:仪)?(?:接|连|上|装)(?:上|好)(.*)$`, "u").exec(s);
  if (m && end(m[1]!)) return { kind: "task", task: "attach_monitor" };
  m = new RegExp(String.raw`${ask}(?:给(?:${who}))?(?:做|拉|查|记录|描|来)(?:个|一个|一份|一下|一次)?(?:十二导联|12导联|12 导联)?心电图(.*)$`, "u").exec(s);
  if (m && end(m[1]!)) return { kind: "task", task: "record_ecg" };
  m = new RegExp(String.raw`${ask}(?:给(?:${who}))?(?:建立|开|开放|打|留|扎|上)(?:个|一条|一个|一下)?(?:静脉通路|静脉通道|留置针|静脉(?:输液)?通路)(.*)$`, "u").exec(s);
  if (m && end(m[1]!)) return { kind: "task", task: "obtain_iv_access" };
  // hand: "把手术刀递给我", "递一下纱布", "给我一把持针器"
  m = new RegExp(String.raw`${ask}把(.+?)(?:递给我|递过来|递一下|拿给我|交给我|给我)(.*)$`, "u").exec(s) ?? new RegExp(String.raw`${ask}(?:递给我|递一下|递|拿给我|给我)(?:一下)?(.+)$`, "u").exec(s);
  if (m && (m[2] === undefined || end(m[2])) && tidy(m[1]!.replace(ZH_TAIL, ""))) return { kind: "hand", what: tidy(m[1]!.replace(ZH_TAIL, "")) };
  // fetch: "把除颤仪推过来", "去拿一下心电图机", "拿个氧气瓶来"
  m = new RegExp(String.raw`${ask}把(.+?)(?:推|拿|取|带|搬)(?:过来|来|到床旁|到这里|到这儿)(.*)$`, "u").exec(s) ?? new RegExp(String.raw`${ask}(?:去)?(?:拿|取|推)(?:一下|个|一个|一台)?(.+?)(?:过来|来)(.*)$`, "u").exec(s);
  if (m && end(m[2]!) && tidy(m[1]!)) return { kind: "fetch", what: tidy(m[1]!) };
  // give: "给他用阿司匹林", "给予吸氧", "给患者静推呋塞米"
  m = new RegExp(String.raw`${ask}(?:给(?:${who})|给予)(?:用|上|打|静推|口服|含服|注射|一下)?(.+)$`, "u").exec(s);
  if (m) {
    const what = tidy(m[1]!.replace(ZH_TAIL, ""));
    if (what && !/心电图|监护|静脉通路|留置针/u.test(what)) return { kind: "give", what };
  }
  // come
  m = new RegExp(String.raw`${ask}(?:到|来)(?:床旁|床边|患者身边)(?:来)?(.*)$`, "u").exec(s);
  if (m && end(m[1]!)) return { kind: "come", to: "patient" };
  m = new RegExp(String.raw`${ask}(?:过来|来一下|到这边来|到这儿来|到这里来|来这边)(?:一下)?(.*)$`, "u").exec(s);
  if (m && end(m[1]!)) return { kind: "come", to: "me" };
  // back to their post
  if (/^(?:你|您)?(?:可以)?(?:先)?回(?:去|岗位|护士站|工作台|你的位置|您的位置|原位)(?:吧|了|忙吧)?[。.!！]?$|^(?:没事了|就这些|没别的事了)(?:，|,)?(?:谢谢)?[。.!！]?$/u.test(s)) return { kind: "back" };
  m = /^(?:请|麻烦)?(?:你|您)?(?:带我去|领我去|带我到|领我到)(.+)$/u.exec(s);
  if (m) {
    const place = tidy(m[1]!.replace(ZH_TAIL, ""));
    if (place) return { kind: "guide", place };
  }
  m = /^(?:请问)?(.+?)在哪(?:里|儿)?(?:呢)?[？?]?$/u.exec(s) ?? /^(?:请问)?(?:怎么|如何)(?:去|走到|到)(.+?)[？?]?$/u.exec(s) ?? /^(?:请问)?(?:去)?(.+?)怎么(?:去|走)(?:呢)?[？?]?$/u.exec(s);
  if (m) {
    const place = tidy(m[1]!);
    if (place && place.length <= 16) return { kind: "where", place };
  }
  // a bare noun, the way an instrument is called for at the table: "手术刀", "纱布，谢谢"
  m = /^([\p{Script=Han}A-Za-z0-9-]{2,10}?)(?:[，,\s]*(?:谢谢|麻烦了|麻烦你|麻烦您))?[。.!！]?$/u.exec(s);
  if (m && !ZH_NOT_A_THING.test(m[1]!) && !ZH_NOT_A_NOUN.test(m[1]!)) return { kind: "hand", what: m[1]! };
  return null;
}

function enIntent(text: string, names: readonly string[]): StaffIntent | null {
  const s = text.replace(EN_LEAD, "");
  const end = (rest: string) => !rest.replace(EN_TAIL, "").trim();
  const who = patientWords(names, false);
  const re = (body: string) => new RegExp(String.raw`^${EN_ASK}${body}(.*)$`, "iu");
  let m =
    re(String.raw`(?:put|hook|get|place)\s+(?:${who})\s+(?:on(?:to)?|up to)\s+(?:the\s+|a\s+)?(?:cardiac\s+)?monitor\b`).exec(s) ??
    re(String.raw`(?:attach|connect|set up|start|put on)\s+(?:the\s+|a\s+)?(?:cardiac\s+|bedside\s+)?monitor(?:ing)?\b`).exec(s) ??
    re(String.raw`(?:start|begin)\s+(?:cardiac\s+)?monitoring\b`).exec(s);
  if (m && end(m[1]!)) return { kind: "task", task: "attach_monitor" };
  m = re(String.raw`(?:do|get|record|take|run|perform|grab)\s+(?:a\s+|an\s+|the\s+|another\s+)?(?:12[- ]?lead\s+)?(?:ecg|ekg|electrocardiogram)\b`).exec(s);
  if (m && end(m[1]!)) return { kind: "task", task: "record_ecg" };
  m = re(String.raw`(?:put in|place|insert|get|site|start|establish|pop in|put up)\s+(?:a\s+|an\s+|the\s+|some\s+)?(?:iv access|iv line|intravenous (?:access|line)|cannula|venflon|iv)\b`).exec(s);
  if (m && end(m[1]!)) return { kind: "task", task: "obtain_iv_access" };
  // hand: "pass me the scalpel", "could you hand me a swab?" ("give me a minute" is talk)
  m = new RegExp(String.raw`^${EN_ASK}(?:hand|pass|give)\s+(?:me|us)\s+(?!a\s+(?:minute|moment|second|sec|hand|call|ring|break|chance)\b|(?:a\s+)?(?:some\s+)?(?:time|space|room|privacy)\b)(.+?)(?:\s+(?:here|over|over here|back))?(\s*[.!?]*\s*(?:please)?\s*[.!?]*)$`, "iu").exec(s);
  if (m && end(m[2]!) && tidy(m[1]!.replace(EN_TAIL, ""))) return { kind: "hand", what: tidy(m[1]!.replace(EN_TAIL, "")) };
  // fetch: "bring the defibrillator", "could you get me the ECG cart over here?"
  m = new RegExp(String.raw`^${EN_ASK}(?:bring|fetch|get|grab|wheel)\s+(?:me\s+|us\s+)?(?:the|a|an)\s+(.+?)(?:\s+(?:here|over|over here|in here|to the bed(?:side)?|to the patient))?(\s*[.!?]*\s*(?:please)?\s*[.!?]*)$`, "iu").exec(s);
  if (m && end(m[2]!) && tidy(m[1]!)) return { kind: "fetch", what: tidy(m[1]!.replace(EN_TAIL, "")) };
  // give: "give aspirin 300 mg", "start oxygen", "please give him some morphine"
  m = new RegExp(String.raw`^${EN_ASK}(?:give|administer|start|hang|push|draw up)\s+(?!me\b|us\b|(?:him|her|them)\s+a\s+(?:hand|call|ring|minute)\b)(?:(?:${who})\s+)?(.+)$`, "iu").exec(s);
  if (m) {
    const what = tidy(m[1]!.replace(EN_TAIL, ""));
    if (what) return { kind: "give", what };
  }
  m = re(String.raw`(?:come|go)\s+(?:over\s+)?to\s+the\s+(?:bed(?:side)?|patient)\b`).exec(s);
  if (m && end(m[1]!)) return { kind: "come", to: "patient" };
  m = re(String.raw`(?:come\s+(?:here|over(?:\s+here)?|in|to me|and help(?:\s+me)?)|i need you(?:\s+here)?)\b`).exec(s);
  if (m && end(m[1]!)) return { kind: "come", to: "me" };
  if (/^(?:you can |please )?(?:go back(?: to (?:your )?(?:post|station|desk|work))?|return to (?:your )?(?:post|station|desk))\b[\s,]*(?:now|then|thanks?|thank you)?[\s.!]*$|^(?:that's all|that will be all|that's everything)(?:,? thanks?(?: you)?)?[\s.!]*$/iu.test(s)) return { kind: "back" };
  m = new RegExp(String.raw`^${EN_ASK}(?:show me the way to|take me to|lead me to|walk me to|bring me to)\s+(.+)$`, "iu").exec(s);
  if (m) {
    const place = tidy(m[1]!.replace(EN_TAIL, ""));
    if (place) return { kind: "guide", place };
  }
  m = /^where(?:'s|\s+is|\s+are|\s+can i find|\s+do i find)\s+(.+?)\s*\??$/iu.exec(s);
  if (m) {
    const place = tidy(m[1]!);
    if (place && place.split(/\s+/).length <= 5) return { kind: "where", place };
  }
  // a bare noun, the way an instrument is called for at the table: "Scalpel.", "Mayo scissors, please"
  m = /^((?:the\s+|a\s+|an\s+|some\s+|another\s+)?[\p{L}][\p{L}\d'-]*(?:\s+(?!please\b)[\p{L}\d][\p{L}\d'-]*){0,2})(?:[\s,]+please)?[\s.!]*$/iu.exec(s);
  if (m) {
    const what = tidy(m[1]!);
    if (what && !EN_NOT_A_THING.test(what) && !EN_NOT_A_THING.test(what.split(/\s+/)[0]!)) return { kind: "hand", what };
  }
  return null;
}

/**
 * The request in an utterance to a colleague (null: talk). `names`: the patient's names, so "take Mr Wang to CT"
 * and "put Wang Jianguo on the monitor" are understood.
 */
export function staffIntent(utterance: string, names: readonly string[] = []): StaffIntent | null {
  const text = utterance.trim();
  if (!text || text.length > MAX_LENGTH || text.includes("\n")) return null;
  const take = movementIntent(text, "staff", names);
  if (take?.kind === "take") return take;
  return isZhText(text) ? zhIntent(text, names) : enIntent(text, names);
}
