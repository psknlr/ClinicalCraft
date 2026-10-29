/**
 * Movement requests in the learner's own words (docs/EMBODIED.md §8.4), recognised deterministically in both
 * languages — never by a model, whose claims would not move anybody:
 *
 * | said to                 | e.g.                                                         | intent |
 * |-------------------------|--------------------------------------------------------------|--------|
 * | the patient / companion | "Follow me", "Come with me", "跟我来"                         | `follow` (no destination) |
 * |                         | "Come with me to the CT scanner", "请跟我去CT室", "我们去做CT吧" | `follow` with the destination phrase |
 * |                         | "Wait here", "Please stay here", "请在这里等一下"               | `wait` |
 * |                         | "Let's go back to your bed", "回病床吧"                        | `home` |
 * | a colleague             | "Please take the patient to CT", "帮我把病人送去CT室"          | `take` with the destination phrase (`home`: back to bed) |
 *
 * The patterns are anchored to the whole (short) utterance, so a history question that merely contains one of the
 * words ("Do you follow the diet?", "Can you follow my finger?", "Wait — when did it start?") is talk, never a
 * request. Where the destination phrase leads is the world's to say (`movement.ts`).
 */

/** A movement request (see the module table); `destination`: the words naming where, null when none was said. */
export type MovementIntent =
  | { kind: "follow"; destination: string | null }
  | { kind: "wait" }
  | { kind: "home" }
  | { kind: "take"; destination: string | null };

/** Longest utterance taken as a movement request (a request is short; a long sentence is talk). */
const MAX_LENGTH = 90;

/** Courtesy and fillers before a request ("OK, please", "Mr Wang,", "好的，"). */
const EN_LEAD = /^(?:(?:ok(?:ay)?|right|alright|all right|good|great|now|so|then|well|thanks?|thank you|sir|madam|ma'?am|(?:mr|mrs|ms|miss|dr)\.?\s+[\p{L}'-]+)[\s,!.]+)*/iu;
const ZH_LEAD = /^(?:(?:好的?|好了|那|那么|嗯|行|来|现在|谢谢)[，,。！!\s]*)*/u;
/** Courtesy after a request ("please", "thanks", "吧", "好吗"). */
const EN_TAIL = /[\s,]*(?:please|now|then|thanks?|thank you|for me|with me)?[\s.!?。！？]*$/iu;
const ZH_TAIL = /[，,\s]*(?:吧|好吗|好不好|可以吗|行吗|一下|谢谢)?[。.!！?？\s]*$/u;

const tidy = (s: string) => s.trim().replace(/^(?:the|a|an)\s+/i, "").trim();

/** The destination words of "… to X" / "…去X" (null: none), courtesy trimmed. */
function destinationOf(rest: string, zh: boolean): string | null {
  const r = rest.replace(zh ? ZH_TAIL : EN_TAIL, "").trim();
  if (!r) return null;
  if (zh) {
    const m = /^(?:一起)?(?:去|到|上|回)?(?:做个?|拍个?|查个?)?(.+)$/u.exec(r);
    const d = (m?.[1] ?? r).replace(/^(?:那个|这个)/u, "").trim();
    return d || null;
  }
  const m = /^(?:,\s*)?(?:to|over to|down to|up to|into|in to|towards?|for)\s+(?:(?:a|an|the|your|my|our)\s+)?(.+)$/iu.exec(r);
  return m ? tidy(m[1]!) || null : null;
}

/** Patient-directed requests. */
function patientIntent(text: string, zh: boolean): MovementIntent | null {
  if (zh) {
    const s = text.replace(ZH_LEAD, "");
    if (/^(?:请|麻烦)?(?:您|你)?(?:先)?(?:回|回到)(?:您的|你的|自己的)?(?:病床|床上|床位|病房|诊室|原位)(?:去|上|吧|躺着|躺下|休息)?/u.test(s) || /^(?:我们|咱们)(?:先)?回去(?:吧)?[。.!！]?$/u.test(s)) return { kind: "home" };
    if (/^(?:请|麻烦)?(?:您|你)?(?:先)?(?:在这(?:里|儿)?|在此|在原地|原地)(?:等|稍等|等一下|等等|等我|坐一下|休息一下|待一会儿?)/u.test(s)) return { kind: "wait" };
    // "跟我来 / 跟我去CT室" — never "跟我说说…" (tell me): a verb of going, or nothing at all after "跟着我"
    const follow = /^(?:请|麻烦)?(?:您|你)?(?:跟|随|跟着)我(?:一起)?(来|走|过来|一起走|去|到)?(.*)$/u.exec(s);
    if (follow) {
      const verb = follow[1] ?? "";
      const rest = (follow[2] ?? "").replace(ZH_TAIL, "").trim();
      if (!verb) return rest ? null : { kind: "follow", destination: null };
      return { kind: "follow", destination: verb === "去" || verb === "到" ? destinationOf(rest, true) : rest ? destinationOf(rest, true) : null };
    }
    // "我们去做CT吧" — a suggestion (吧), never "我们去年…"
    const lets = /^(?:我们|咱们)(?:一起)?(?:去|到)(.{1,12}?)吧[。.!！]?$/u.exec(s);
    if (lets) return { kind: "follow", destination: destinationOf(lets[1]!, true) };
    return null;
  }
  const s = text.replace(EN_LEAD, "");
  const ask = String.raw`(?:(?:can|could|would|will) you\s+(?:please\s+)?|please\s+|kindly\s+)?`;
  if (new RegExp(String.raw`^${ask}(?:(?:let'?s|let us)\s+)?(?:go|head|get|walk|come)\s+back\s+to\s+(?:your|the|bed|his|her|their)\b|^${ask}back to (?:your )?bed\b|^(?:let'?s|let us)\s+(?:go|head)\s+back\b`, "iu").test(s)) return { kind: "home" };
  if (new RegExp(String.raw`^${ask}(?:wait|stay|stop|remain)\s+(?:right\s+)?(?:here|there)\b|^${ask}(?:take|have)\s+a\s+seat\s+here\b|^you\s+can\s+(?:wait|stay)\s+here\b`, "iu").test(s)) return { kind: "wait" };
  const follow = new RegExp(String.raw`^${ask}(?:(?:let'?s|let us)\s+)?(follow me|come(?:\s+along)?\s+with me|walk with me|come this way|this way|come along|go|walk over|head over)\b(.*)$`, "iu").exec(s);
  if (follow) {
    const phrase = follow[1]!.toLowerCase();
    const dest = destinationOf(follow[2] ?? "", false);
    // "let's go" / "go" only with a destination or as "let's go"; "go" alone is too broad
    if ((phrase === "go" || phrase === "walk over" || phrase === "head over") && !dest && !/^(?:let'?s|let us)/iu.test(s)) return null;
    // anything left that is not a destination ("follow me if you can remember…") is talk
    if (!dest && (follow[2] ?? "").replace(EN_TAIL, "").trim()) return null;
    return { kind: "follow", destination: dest };
  }
  return null;
}

/** Colleague-directed requests: take the patient somewhere. `names`: the patient's names (either language). */
function staffIntent(text: string, zh: boolean, names: readonly string[]): MovementIntent | null {
  const nameAlt = names.filter((n) => n.trim()).map((n) => n.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (zh) {
    const who = ["患者", "病人", "他", "她", "这位患者", "这个病人", "病患", ...nameAlt].join("|");
    const m = new RegExp(String.raw`^(?:请|麻烦)?(?:你|您)?(?:帮(?:我|忙)?)?(?:把|带|送|推|陪)(?:${who})(?:送|带|推|陪)?(?:一下)?(去|到|回)(.+)$`, "u").exec(text.replace(ZH_LEAD, ""));
    if (!m) return null;
    const dest = destinationOf(m[2]!, true);
    if (m[1] === "回" && (!dest || /^(?:去|来|病床|床|床位|原床位|病房|原位)/u.test(dest))) return { kind: "take", destination: "home" };
    return { kind: "take", destination: dest };
  }
  const who = ["(?:the |this |our |my )?patient", "him", "her", "them", String.raw`(?:mr|mrs|ms|miss)\.?\s+[\p{L}'-]+`, ...nameAlt].join("|");
  const ask = String.raw`(?:(?:can|could|would|will) you\s+(?:please\s+)?|please\s+|kindly\s+)?`;
  const m = new RegExp(String.raw`^${ask}(?:take|bring|wheel|transport|escort|walk|move)\s+(?:${who})\b(?:\s+(back)\b)?\s*(.*)$`, "iu").exec(text.replace(EN_LEAD, ""));
  if (!m) return null;
  const rest = m[2] ?? "";
  if (m[1] && (!rest.replace(EN_TAIL, "").trim() || /^(?:to\s+)?(?:(?:his|her|their|the|own)\s+)*(?:bed|bed space|room|bay|cubicle)\b/iu.test(rest))) return { kind: "take", destination: "home" };
  const dest = destinationOf(rest, false);
  if (!dest && rest.replace(EN_TAIL, "").trim()) return null;
  return { kind: "take", destination: dest };
}

/**
 * The movement request in an utterance (null: talk). `to`: who it is said to — `patient` (the patient or the companion
 * at their side) or `staff`; `names`: the patient's names, so "take Mr Wang to CT" is understood.
 */
export function movementIntent(utterance: string, to: "patient" | "staff", names: readonly string[] = []): MovementIntent | null {
  const text = utterance.trim();
  if (!text || text.length > MAX_LENGTH || text.includes("\n")) return null;
  const zh = /[㐀-鿿]/u.test(text);
  return to === "patient" ? patientIntent(text, zh) : staffIntent(text, zh, names);
}

/** Capabilities a destination phrase names (both languages), most specific first. */
const CAPABILITY_WORDS: readonly (readonly [string, RegExp])[] = [
  ["fluoroscopy", /cath(?:eteri[sz]ation)?\s*lab|angio(?:graphy|gram)?|fluoro(?:scopy)?|导管室|介入|造影|\bDSA\b/iu],
  ["pet-ct", /\bpet(?:[-\s]?ct)?\b|PET/u],
  ["mri", /\bmri\b|\bmr\s*(?:scan|scanner)?\b|magnetic resonance|磁共振|核磁/iu],
  ["ct", /\bct\b|\bcat scan|computed tomography|CT|ＣＴ/iu],
  ["xray", /x[-\s]?ray|radiograph|X光|X线|x线|拍片|平片|胸片室|\bDR\b/iu],
  ["peak-flow", /peak[-\s]?flow|峰流速|峰值流速/iu],
  ["endoscopy", /endoscop|gastroscop|colonoscop|内镜|胃镜|肠镜/iu],
  ["scale", /\bweigh(?:ing|t)?\b|\bscales?\b|体重秤?|称重/iu],
];

/** The capability a destination phrase names ("the CT scanner" → `ct`, "导管室" → `fluoroscopy`), or null. */
export function destinationCapability(phrase: string): string | null {
  for (const [cap, re] of CAPABILITY_WORDS) if (re.test(phrase)) return cap;
  return null;
}

/** Does a destination phrase mean the patient's own bed space ("back to bed", "回病床", "home")? */
export function meansHome(phrase: string): boolean {
  return /^(?:home|back|(?:(?:his|her|their|your|the|own)\s+)*(?:bed|bed space|bay|cubicle|room))$|^(?:回)?(?:病床|床位|床上|原床位|原位|病房)$/iu.test(phrase.trim());
}
