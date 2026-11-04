/**
 * A staff line worded by the speaker's model (docs/CHARACTERS.md §4): the engine decides that the line is said and
 * what it states (`facts`, and the template it would say); the model says it in the speaker's own words, from their
 * role card. The line is accepted only when it is grounded (`lineProblem`: one line, the session's language, no
 * number that is not in the facts, nobody named who is not in them) and, when the engine says where the speaker is
 * (`where`), claims no other place (`placeClaimProblem`: a responder shut out never says "I'm at the bedside" or
 * "checking the patient", one at the patient never says they cannot get there); otherwise — and without a model, or
 * when the model is slow or fails — the template is said. Never throws.
 */
import { completeText } from "../loop.js";
import type { ChatRequest } from "../providers/types.js";
import type { MindModel } from "./team-mind.js";
import { lineProblem } from "./team-mind.js";
import { roleSection, type RoleCard } from "./roles.js";

export interface LineRequest {
  speaker: string;
  card: RoleCard | null;
  /** What the line is for ("you answer a new monitor alarm"). */
  intent: string;
  /** What the speaker knows that the line may state. */
  facts: readonly string[];
  /** What the rules would say (also the fallback). */
  template: string;
  locale: string;
  model: MindModel | null;
  timeoutMs: number;
  staffNames: readonly string[];
  /** Where the speaker is, by the record: at the patient, or away from them (null: the line says nothing of it). */
  where?: "at-patient" | "away";
  signal?: AbortSignal;
}

/** A first-person claim to be at the patient, or to be acting on them now (either language). */
const AT_PATIENT = [
  /\bI(?:'m| am)\s+(?:now\s+|already\s+|right\s+)?(?:here\b|(?:at|by|beside|with|next to)\s+(?:the\s+|his\s+|her\s+|their\s+)?(?:patient|bed|bedside|table|head|monitor|side)\b|in\s+(?:the\s+)?(?:theatre|OR|operating room)\b)/iu,
  /\bI(?:'ve| have)\s+(?:just\s+)?(?:arrived|got here|got to (?:the\s+)?(?:patient|bed))/iu,
  /\bI(?:'m| am)\s+(?:now\s+)?(?:checking|examining|assessing|treating|bagging|ventilating|managing|looking at)\b/iu,
  /\b(?:checking|examining|assessing)\s+(?:the\s+)?patient\b/iu,
  /我(?:已经|现在|已)?(?:到了|到床旁|到床边|在床旁|在床边|在(?:病人|患者)(?:身边|旁边)|在手术室|就在这)/u,
  /(?:正在|在)(?:检查|查看|评估|处理)(?:病人|患者)/u,
];
/**
 * A claim of having touched the patient or done something at the bedside — completed or under way, in any person or
 * none ("I have just palpated the patient's pulse", "pulse feels thready", 刚摸了脉搏, 正在给他吸氧): only someone
 * who is there can say it, and the record must hold it (either language).
 */
const CONTACT = [
  /\b(?:palpat\w*|auscultat\w*|percuss\w*|examin(?:ed|ing))\b/iu,
  /\b(?:felt|feel(?:s|ing)?|checked|checking|took|taken|taking|got|have)\s+(?:a\s+|the\s+|his\s+|her\s+|their\s+)?(?:pulse|carotid|radial|femoral|pressure|airway|chest|abdomen|belly|pupils?|skin|breathing|cannula|line|drip|tube)\b/iu,
  /\b(?:pulse|carotid|radial)\s+(?:is\s+|feels\s+|felt\s+)?(?:thready|weak|strong|bounding|present|absent|palpable)\b/iu,
  /\blisten(?:ed|ing)\s+to\s+(?:the\s+|his\s+|her\s+|their\s+)?(?:chest|heart|lungs|breath)/iu,
  /\b(?:touch(?:ed|ing)|holding|held|squeez(?:ed|ing)|bagg(?:ed|ing)|ventilat(?:ed|ing)|suction(?:ed|ing)|reposition(?:ed|ing)|intubat(?:ed|ing))\b/iu,
  /\bI(?:'ve| have)\s+(?:just\s+)?(?:given|pushed|administered|started|run|bolused|flushed|turned up|checked|looked at|seen)\b/iu,
  /(?:摸了|摸到|摸着|触诊|叩诊|听诊|听了|按压|测了|量了|检查了|查看了|看了看|握着|扶着|托着|吸痰|插管|给了|推了|注射了|用了药|加了|开大了|调高了|正在给|刚给|刚摸|刚测|刚查)/u,
  /(?:脉搏|颈动脉|桡动脉|股动脉)(?:搏动)?(?:细|弱|有力|摸不到|可及|很快|很慢)/u,
];
/** A treatment claimed as given (either language): the record must hold it — the responder's line never does. */
const TREATMENT = [
  /\bI(?:'ve| have)\s+(?:just\s+)?(?:given|pushed|administered|started|run|bolused|intubated|re-?intubated|defibrillated|shocked|cardioverted)\b/iu,
  /我(?:已经|刚|刚刚)?(?:给了|推了|用了|注射了|静推了|插管了|电击了|除颤了|复律了)/u,
];

/** A claim of not being able to get to the patient, or of being still on the way (either language). */
const AWAY = [/\b(?:can't|cannot|can not|unable to)\s+(?:get|reach|come)\b|\b(?:locked|stuck|blocked)\b|\bon my way\b/iu, /过不去|进不去|被锁|门锁|在路上|马上到|赶过去/u];

/**
 * Why a line claims a place or an act the record does not have (null: it does not): `away` — shut out, on the way —
 * never says they are at the patient, nor that they touched the patient or did anything at the bedside (palpated,
 * listened, bagged, "the pulse is thready"); `at-patient` never says they cannot get there or are still coming; and
 * neither claims a treatment given ("I've given…", 我推了…) — that is an intervention, in the record or not at all.
 */
export function placeClaimProblem(text: string, where: "at-patient" | "away"): string | null {
  const first = (claims: readonly RegExp[]) => claims.map((re) => text.match(re)?.[0]).find(Boolean);
  if (where === "away") {
    const there = first(AT_PATIENT);
    if (there) return `claims to be at the patient ("${there}") while away from them`;
    // away, nobody touches the patient: no contact, no bedside act, done or under way, however it is worded
    const touched = first(CONTACT);
    if (touched) return `claims contact with the patient ("${touched}") while away from them`;
  } else {
    const away = first(AWAY);
    if (away) return `claims not to be at the patient ("${away}") while there`;
  }
  // a treatment is the record's (an intervention), never a line's
  const treated = first(TREATMENT);
  return treated ? `claims a treatment ("${treated}") the record does not hold` : null;
}

export interface WordedLine {
  text: string;
  /** `model`: the speaker's words; `template`: the rules' (and why). */
  source: "model" | "template";
  refused?: string;
}

/** The line to say (the model's when it is grounded, else the template). */
export async function wordLine(r: LineRequest): Promise<WordedLine> {
  if (!r.model) return { text: r.template, source: "template", refused: "no model" };
  const request: ChatRequest = {
    model: r.model.request.model ?? r.model.provider.model,
    system: [
      { id: "role", text: r.card ? roleSection(r.card, r.speaker) : `You are ${r.speaker}, a member of staff.`, cache: "stable" },
      {
        id: "line",
        cache: "stable",
        text: `<speaking>\nSay ONE short, natural sentence aloud, in your role, as you would in a real hospital. Use only the facts given; a number only if it is in them; name nobody else. Speak ${r.locale === "zh-CN" ? "Simplified Chinese" : "English"}. Reply with the sentence only.\n</speaking>`,
      },
    ],
    messages: [{ role: "user", content: [{ type: "text", text: `<why>${r.intent}</why>\n<facts>\n${r.facts.map((f) => `- ${f}`).join("\n")}\n</facts>\n<usual_words>${r.template}</usual_words>` }] }],
    maxTokens: r.model.request.maxTokens ?? 200,
    temperature: r.model.request.temperature ?? 0.5,
    conversationId: `line:${r.speaker}`,
  };
  const timer = new AbortController();
  const onAbort = () => timer.abort();
  r.signal?.addEventListener("abort", onAbort, { once: true });
  const handle = setTimeout(() => timer.abort(), r.timeoutMs);
  try {
    const res = await completeText({ provider: r.model.provider, request, agent: r.model.agent, signal: timer.signal, ...(r.model.retry !== undefined ? { retry: r.model.retry } : {}) });
    if (res.aborted || res.error) return { text: r.template, source: "template", refused: res.error?.message ?? "no line in time" };
    const text = res.text.trim().replace(/^["“”']+|["“”']+$/gu, "");
    const problem = lineProblem(text, { locale: r.locale, perceived: `${r.facts.join("\n")}\n${r.template}`, staffNames: r.staffNames, namesInView: [r.speaker] }) ?? (r.where ? placeClaimProblem(text, r.where) : null);
    return problem ? { text: r.template, source: "template", refused: problem } : { text, source: "model" };
  } catch (err) {
    return { text: r.template, source: "template", refused: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(handle);
    r.signal?.removeEventListener("abort", onAbort);
  }
}
