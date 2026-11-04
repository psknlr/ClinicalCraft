/**
 * A staff line worded by the speaker's model (docs/CHARACTERS.md §4): the engine decides that the line is said and
 * what it states (`facts`, and the template it would say); the model says it in the speaker's own words, from their
 * role card. The line is accepted only when it is grounded (`lineProblem`: one line, the session's language, no
 * number that is not in the facts, nobody named who is not in them); otherwise — and without a model, or when the
 * model is slow or fails — the template is said. Never throws.
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
  signal?: AbortSignal;
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
    const problem = lineProblem(text, { locale: r.locale, perceived: `${r.facts.join("\n")}\n${r.template}`, staffNames: r.staffNames, namesInView: [r.speaker] });
    return problem ? { text: r.template, source: "template", refused: problem } : { text, source: "model" };
  } catch (err) {
    return { text: r.template, source: "template", refused: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(handle);
    r.signal?.removeEventListener("abort", onAbort);
  }
}
