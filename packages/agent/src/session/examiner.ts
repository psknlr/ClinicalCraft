/**
 * Examiner (ZCode goal verifier): judges rubric items without a deterministic
 * criterion from the encounter transcript. The model must quote evidence; a
 * `met: true` verdict whose quote cannot be found verbatim in the words of a
 * transcript line (labels and line numbers do not count) is downgraded to not
 * met. Offline: nothing is judged (items stay null) and
 * the narrative summarises the deterministic report.
 *
 * Need-to-know: before the case is finished (an assessment asked for
 * mid-case) the examiner sees only the rubric item texts — never
 * `judgeGuidance` ("what good looks like" often names the diagnosis or
 * results) nor the debrief — and is told the encounter is still in progress.
 * After `finish` it also gets the guidance and the full authored debrief.
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

import type { DialogueEntry } from "./types.js";

/** One line of the encounter transcript shown to the examiner (defined with the transcript types). */
export type { DialogueEntry };

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

/** Letters/digits in a quote, CJK characters counting double ("No" → 2, "吸烟" → 4). */
function quoteWeight(normalised: string): number {
  let n = 0;
  for (const ch of normalised.replace(/[^\p{L}\p{N}]/gu, "")) n += /[\u3400-\u9fff\uf900-\ufaff]/u.test(ch) ? 2 : 1;
  return n;
}

/** Smallest `quoteWeight` accepted as evidence. */
export const MIN_EVIDENCE_WEIGHT = 4;

/**
 * True when `quote` is evidence from the encounter: it occurs (whitespace and
 * quote-mark insensitive) inside the words of ONE dialogue entry — never in
 * the rendered labels ("LEARNER", "ACTION", speaker names, line numbers) —
 * and is more than a token ("No", "ok").
 */
export function quoteInDialogue(quote: string, dialogue: readonly DialogueEntry[]): boolean {
  const q = normaliseQuote(quote);
  if (quoteWeight(q) < MIN_EVIDENCE_WEIGHT) return false;
  return dialogue.some((d) => normaliseQuote(d.text).includes(q));
}

/** The authored debrief as an examiner context block (only ever given after the case is finished). */
export function debriefBlock(c: CaseDefinition, locale: string): string {
  const d = c.debrief;
  const list = (label: string, items: readonly string[]) => (items.length > 0 ? [`${label}:`, ...items.map((x) => `- ${x}`)] : []);
  return [
    "<debrief>",
    `Title: ${t(d.title, locale)}`,
    `Conclusion: ${t(d.conclusion, locale)}`,
    ...list("Key reasoning", d.keyReasoning.map((x) => t(x, locale))),
    ...list("Teaching points", d.teachingPoints.map((x) => t(x, locale))),
    ...(d.boundaries ? [`Evidence boundaries: ${t(d.boundaries, locale)}`] : []),
    ...list("Unknowns", d.unknowns.map((x) => t(x, locale))),
    ...list("References", d.references),
    "</debrief>",
  ].join("\n");
}

/** What the examiner is told about the encounter's status (mid-case vs finished). */
function encounterStatus(finished: boolean): string {
  return finished
    ? "<encounter_status>finished</encounter_status>\nThe case is finished. The debrief below is the authored teaching summary: your narrative may refer to it (diagnosis, key reasoning, teaching points). It is not evidence — judge every item on the transcript only."
    : "<encounter_status>in progress</encounter_status>\nThe case is not finished yet: the learner asked for feedback mid-case. Judge only what the transcript shows so far. Your narrative is formative feedback on the encounter so far; do not name or hint at a diagnosis, the correct answer to any decision or the steps that remain.";
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
  const finished = p.state.finished;
  // Mid-case: the item texts only (judgeGuidance often spells out the diagnosis or results).
  const items = pending.map((r) => `- id: ${r.id} | domain: ${r.domain} | item: ${t(r.text, L)}${finished && r.judgeGuidance ? ` | what good looks like: ${t(r.judgeGuidance, L)}` : ""}`);
  const debrief = finished ? `${debriefBlock(c, L)}\n\n` : "";
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
            text: `${encounterStatus(finished)}\n\n<rubric_items>\n${items.join("\n")}\n</rubric_items>\n\n${debrief}<transcript>\n${transcript}\n</transcript>\n\n${summary}\n\nJudge every rubric item above. Respond with the JSON object only.`,
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
    if (item.met && !quoteInDialogue(evidence, p.dialogue)) {
      judged.push({ id, met: false, evidence: `${rt(L, "examiner.unverifiedQuote")} ${evidence}`.trim() });
    } else {
      judged.push({ id, met: item.met, evidence });
    }
  }
  const narrative = typeof obj.narrative === "string" && obj.narrative.trim() ? obj.narrative.trim() : examinerOffline(c, p.report, L).narrative;
  return { judged, narrative };
}
