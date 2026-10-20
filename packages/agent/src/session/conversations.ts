/**
 * The agents' conversations and the examiner's dialogue, as the transcript records them: every message appended
 * to a conversation is written as a `message` item (patient/companion messages with the speaker's affect, so a
 * resume restores it), every dialogue line as a `dialogue` item; compaction (manual, or automatic past the
 * token threshold) replaces a conversation by its summary and records it as `compacted` (docs/PROTOCOL.md §10).
 */
import { compactConversation, estimateTokens } from "../compaction.js";
import type { TurnResult } from "../loop.js";
import type { AgentRole } from "../protocol.js";
import type { ChatMessage } from "../providers/types.js";
import type { DialogueEntry, TranscriptItem } from "./types.js";
import { rt } from "./i18n.js";
import type { SessionKernel } from "./kernel.js";

/** The conversations and the dialogue of one session. */
export class ConversationLog {
  /** Each agent's conversation (provider-neutral messages). */
  readonly byAgent = new Map<string, ChatMessage[]>();
  /** The examiner's evidence lines: learner words, agent replies, ACTION narrations, notes, rationales. */
  readonly dialogue: DialogueEntry[] = [];

  constructor(private readonly k: SessionKernel) {}

  /** An agent's conversation (the live list, created empty). */
  of(agent: AgentRole): ChatMessage[] {
    let list = this.byAgent.get(agent);
    if (!list) {
      list = [];
      this.byAgent.set(agent, list);
    }
    return list;
  }

  /** A copy of an agent's conversation. */
  copyOf(agent: AgentRole): ChatMessage[] {
    return [...(this.byAgent.get(agent) ?? [])];
  }

  /** Add examiner evidence lines (and record them, so a resume can restore them). */
  addDialogue(...entries: DialogueEntry[]): void {
    for (const entry of entries) {
      this.dialogue.push(entry);
      this.k.recorder?.record("dialogue", { ...entry });
    }
  }

  /**
   * Transcript item for one conversation message. Patient/companion messages
   * also carry the speaker's current affect intensity (`affectIntensity`,
   * 0–3) so a resume restores the emotional state (`resumedRuntimeConfig`).
   */
  recordMessage(agent: AgentRole, m: ChatMessage): void {
    const recorder = this.k.recorder;
    if (!recorder) return;
    const payload: Extract<TranscriptItem, { type: "message" }>["payload"] = { agent, role: m.role, content: m.content };
    const speaker = agent === "patient" ? "patient" : agent === "companion" ? "companion" : null;
    if (speaker) {
      const withAffect: typeof payload & { affectIntensity: number } = { ...payload, affectIntensity: this.k.patientMemory[speaker].affectIntensity };
      recorder.record("message", withAffect);
    } else {
      recorder.record("message", payload);
    }
  }

  /** Append messages to an agent's conversation (and record them). */
  append(agent: AgentRole, messages: readonly ChatMessage[]): void {
    const list = this.of(agent);
    for (const m of messages) {
      list.push(m);
      this.recordMessage(agent, m);
    }
  }

  /**
   * Persist a finished model turn: append only the messages the turn added.
   * `turn.messages` is the history snapshot taken when the turn started plus
   * those messages, so replacing the list with it would drop staff lines
   * (alarms, scenario announcements) appended to this agent's conversation
   * while the turn ran; appending keeps them, in the transcript's order.
   */
  commitTurn(agent: AgentRole, turn: TurnResult): void {
    this.append(agent, turn.appended);
  }

  /** Forget every conversation — persisted as an empty compaction per agent, so a resume does not resurrect them. */
  clear(): void {
    for (const agent of this.byAgent.keys()) this.k.recorder?.record("compacted", { agent, summary: "" });
    this.byAgent.clear();
  }

  /* ---------------------------------------------------------------- */
  /* Compaction                                                        */
  /* ---------------------------------------------------------------- */

  /** Compact an agent's conversation when it has grown past the auto-compaction threshold. */
  async maybeAutoCompact(id: string, agent: AgentRole, signal?: AbortSignal): Promise<void> {
    const cfg = this.k.settings.autoCompact;
    if (!cfg.enabled) return;
    const history = this.byAgent.get(agent);
    if (!history || history.length < 4) return;
    if (estimateTokens(history) <= cfg.thresholdTokens) return;
    await this.compactAgent(id, agent, "auto", signal);
  }

  /** Compact one agent's conversation, or every conversation (`agent` null). */
  async compact(id: string, agent: AgentRole | null, trigger: "manual" | "auto", signal?: AbortSignal): Promise<void> {
    const targets = agent ? [agent] : [...this.byAgent.keys()];
    for (const name of targets) {
      if (signal?.aborted) return;
      await this.compactAgent(id, name, trigger, signal);
    }
  }

  private async compactAgent(id: string, agent: AgentRole, trigger: "manual" | "auto", signal?: AbortSignal): Promise<void> {
    const k = this.k;
    const history = this.byAgent.get(agent);
    if (!history || history.length < 2) return;
    const hook = await k.runHook({ hook_event_name: "PreCompact", agent, trigger });
    for (const w of hook.warnings) k.emit(id, { type: "warning", message: w });
    if (hook.blocked) {
      k.emit(id, { type: "warning", message: rt(k.locale, "warning.compactBlocked", { agent, reason: hook.reason ?? "" }) });
      return;
    }
    const before = estimateTokens(history);
    const provider = k.profiles.has(agent) ? k.models.model(agent, false).provider : null;
    const result = await compactConversation({ provider, messages: history, locale: k.locale, ...(signal ? { signal } : {}) });
    if (result.compactedCount === 0) return;
    if (provider && result.deterministic && !signal?.aborted) k.emit(id, { type: "warning", message: rt(k.locale, "warning.compactFallback", { agent }) });
    history.length = 0;
    history.push(...result.messages);
    const [first, ...rest] = result.messages;
    const block = first?.content[0]?.type === "text" ? first.content[0].text : result.summary;
    k.recorder?.record("compacted", { agent, summary: block });
    const tail: ChatMessage[] = [];
    if (first && first.content.length > 1) tail.push({ role: first.role, content: first.content.slice(1) });
    tail.push(...rest);
    for (const m of tail) this.recordMessage(agent, m);
    k.emit(id, { type: "compacted", agent, beforeTokens: before, afterTokens: estimateTokens(history) });
  }
}
