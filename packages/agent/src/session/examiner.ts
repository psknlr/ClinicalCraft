/**
 * Examiner (ZCode goal verifier): judges rubric items without a deterministic
 * criterion from the encounter transcript. The model must quote evidence; a
 * `met: true` verdict whose quote cannot be found verbatim in the transcript
 * is downgraded to not met. Offline: nothing is judged (items stay null) and
 * the narrative summarises the deterministic report.
 */
import { t, type AssessmentReport, type CaseDefinition, type SessionState } from "@clinicalcraft/core";
import { examinerOffline } from "../agents/offline.js";
import { buildSystemSections } from "../agents/prompts.js";
import type { AgentProfile } from "../agents/types.js";
import { completeText, parseJsonObject } from "../loop.js";
import type { EventMsg, TokenUsage } from "../protocol.js";
import type { RetryPolicy } from "../providers/factory.js";
import type { ChatRequest, LLMProvider } from "../providers/types.js";
import { rt } from "./i18n.js";

/** One line of the encounter transcript shown to the examiner. */
export interface DialogueEntry {
  /** "learner", an agent name, or "action" for clinical actions. */
  who: string;
  speaker: string;
  text: string;
}

export interface ExaminerVerdict {
  judged: { id: string; met: boolean; evidence: string }[];
  narrative: string | null;
}

export interface ExaminerParams {
  caseDef: CaseDefinition;
  state: SessionState;
  locale: string;
  report: AssessmentReport;
  dialogue: readonly DialogueEntry[];
  profile: AgentProfile;
  provider: LLMProvider | null;
  model?: string | null;
  effort?: ChatRequest["effort"];
  maxTokens?: number;
  memory?: string | null;
  signal?: AbortSignal;
  emit?: (msg: EventMsg) => void;
  retry?: RetryPolicy | false;
  onUsage?: (usage: TokenUsage) => void;
}

/** Render the dialogue as numbered transcript lines (learner text marked as untrusted data). */
export function renderDialogue(dialogue: readonly DialogueEntry[], maxChars = 60_000): string {
  const lines = dialogue.map((d, i) => `${i + 1}. ${d.who === "learner" ? "LEARNER" : d.who === "action" ? "ACTION" : `${d.speaker} (${d.who})`}: ${d.text.replace(/\s+/g, " ").trim()}`);
  let text = lines.join("\n");
  if (text.length > maxChars) text = `[… earlier lines omitted …]\n${text.slice(text.length - maxChars)}`;
  return text;
}

function normaliseQuote(text: string): string {
  return text
    .replace(/[“”„"'‘’`「」『』]/g, "")
    .replace(/[.。…,，;；:：!！?？]+$/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** True when `quote` occurs (whitespace/quote-mark insensitive) in the transcript. */
export function quoteInTranscript(quote: string, transcript: string): boolean {
  const q = normaliseQuote(quote);
  if (q.length < 2) return false;
  return normaliseQuote(transcript).includes(q);
}

/** Judge transcript-based rubric items (LLM) or fall back to the deterministic narrative (offline). Never throws. */
export async function runExaminer(p: ExaminerParams): Promise<ExaminerVerdict> {
  const c = p.caseDef;
  const L = p.locale;
  const pending = c.rubric.filter((r) => r.met === undefined);
  if (!p.provider || pending.length === 0) {
    const offline = examinerOffline(c, p.report, L);
    return { judged: offline.items, narrative: offline.narrative };
  }
  const transcript = renderDialogue(p.dialogue);
  const items = pending.map((r) => `- id: ${r.id} | domain: ${r.domain} | item: ${t(r.text, L)}${r.judgeGuidance ? ` | what good looks like: ${t(r.judgeGuidance, L)}` : ""}`);
  const summary = `Deterministic results (already scored, for context only): ${p.report.score.percent}% of deterministic points; objectives ${p.report.objectives.filter((o) => o.done).length}/${p.report.objectives.length}.`;
  const request: ChatRequest = {
    model: p.model ?? p.provider.model,
    system: buildSystemSections(p.profile, { caseDef: c, state: p.state, locale: L, memory: p.memory ?? null }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `<rubric_items>\n${items.join("\n")}\n</rubric_items>\n\n<transcript>\n${transcript}\n</transcript>\n\n${summary}\n\nJudge every rubric item above. Respond with the JSON object only.`,
          },
        ],
      },
    ],
    maxTokens: p.maxTokens ?? 2_000,
    ...(p.effort ? { effort: p.effort } : {}),
    responseFormat: {
      name: "examiner_verdict",
      schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string", enum: pending.map((r) => r.id) }, met: { type: "boolean" }, evidence: { type: "string" } },
              required: ["id", "met", "evidence"],
              additionalProperties: false,
            },
          },
          narrative: { type: "string" },
        },
        required: ["items", "narrative"],
        additionalProperties: false,
      },
    },
    conversationId: "examiner",
  };
  const res = await completeText({
    provider: p.provider,
    request,
    agent: p.profile.name,
    ...(p.emit ? { emit: p.emit } : {}),
    ...(p.signal ? { signal: p.signal } : {}),
    ...(p.retry !== undefined ? { retry: p.retry } : {}),
    ...(p.onUsage ? { onUsage: p.onUsage } : {}),
  });
  const obj = res.error || res.aborted ? null : parseJsonObject(res.text);
  if (!obj) {
    // Never a silent fallback to offline: the learner must know nothing was judged.
    if (!res.aborted) p.emit?.({ type: "warning", message: rt(L, "warning.examinerFallback", { error: res.error?.message ?? "unparseable verdict" }) });
    const offline = examinerOffline(c, p.report, L);
    return { judged: [], narrative: offline.narrative };
  }
  const ids = new Set(pending.map((r) => r.id));
  const judged: ExaminerVerdict["judged"] = [];
  for (const raw of Array.isArray(obj.items) ? obj.items : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    if (!ids.has(id) || judged.some((j) => j.id === id) || typeof item.met !== "boolean") continue;
    const evidence = typeof item.evidence === "string" ? item.evidence.trim().slice(0, 400) : "";
    if (item.met && !quoteInTranscript(evidence, transcript)) {
      judged.push({ id, met: false, evidence: `${rt(L, "examiner.unverifiedQuote")} ${evidence}`.trim() });
    } else {
      judged.push({ id, met: item.met, evidence });
    }
  }
  const narrative = typeof obj.narrative === "string" && obj.narrative.trim() ? obj.narrative.trim() : examinerOffline(c, p.report, L).narrative;
  return { judged, narrative };
}
