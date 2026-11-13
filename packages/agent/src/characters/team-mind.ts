/**
 * A care-team member driven by a model (docs/CHARACTERS.md §3): each round the member decides with their own model,
 * working from their role card and what they perceive (`MemberView`) — never from the hidden state.
 *
 * The model chooses; the engine keeps the physics and the protocol. The options are the legal moves the engine
 * lists for this member now:
 * - `act`: the team's protocol move — the policy's own proposal (ask the colleague whose duty it is, read back,
 *   hand over, report, count, search…), worded in the member's own words when it speaks;
 * - `wait`: not now — once in a row for the same move, and never for a closed-loop obligation (a read-back, a
 *   confirmation, a report, a decline, an escalation), the count or the operative site's verification;
 * - `notice`: say something you see to a colleague in the room (no obligation created);
 * - `escalate`: raise your own task, stuck waiting, to the person it is for.
 * A line is accepted only when it is grounded: one line, in the session's language, every number in it is in what
 * the member perceives, and no staff member is named who is not in their view. Anything else — no model, a slow or
 * failed call, an option not offered, an ungrounded line — and the rules decide (the policy's proposal, its own
 * words), with one warning per member and a diagnostic record of what was refused.
 */
import { t, type StaffPosition } from "@clinicalcraft/core";
import { completeText, parseJsonObject } from "../loop.js";
import type { RetryPolicy } from "../providers/factory.js";
import type { ChatRequest, LLMProvider } from "../providers/types.js";
import type { TokenUsage } from "../protocol.js";
import { escalateTask, type MemberView } from "../session/team/policy.js";
import type { MemberId, MemberState, Proposal, TeamMessage } from "../session/team/types.js";
import { ROLE_CARDS, roleSection, type RoleCard } from "./roles.js";

/** A member's model, resolved by the session. */
export interface MindModel {
  provider: LLMProvider;
  /** The agent profile it is configured under (usage, retries): `nurse`, `attending`. */
  agent: string;
  request: Partial<Pick<ChatRequest, "model" | "maxTokens" | "temperature" | "effort">>;
  retry?: RetryPolicy | false;
}

/** What the mind needs from the session. */
export interface MindHost {
  readonly locale: string;
  readonly timeoutMs: number;
  /** The member's model (null: none — the rules decide). */
  model(member: MemberState): MindModel | null;
  /** The member's position (their role card). */
  position(member: MemberState): StaffPosition | null;
  /** A body or an entity by name, in the session's language. */
  name(id: string): string;
  /** Every staff member's name in the session's language (a line never names one who is not in view). */
  staffNames(): readonly string[];
  warn(message: string): void;
  record(entry: Record<string, unknown>): void;
  usage(agent: string, usage: TokenUsage): void;
}

/** An option offered to the model. */
interface Option {
  id: "act" | "wait" | "notice" | "escalate";
  text: string;
}

/** Closed-loop messages a member owes: never deferred. */
const OWED: ReadonlySet<TeamMessage["kind"]> = new Set(["readback", "confirm", "report", "decline", "escalate"]);
const KIND_WORD: Readonly<Record<TeamMessage["kind"], string>> = {
  request: "request",
  readback: "read-back",
  confirm: "confirmation",
  report: "report",
  decline: "decline",
  escalate: "escalation",
  notice: "notice",
};
const LINE_MAX = 240;

/** Numbers in a text (ages, counts, minutes, ports — as written). */
function numbers(text: string): string[] {
  return text.match(/\d+(?:[.,]\d+)?/gu) ?? [];
}

/** How a person may be named in speech: the full name, without its title in brackets, and the surname alone. */
function nameForms(name: string): string[] {
  const core = name.replace(/\s*[(（][^)）]*[)）]\s*$/u, "").trim();
  const bare = core.replace(/^(?:Dr|Nurse|Charge Nurse|Porter|Pharmacist|Ms|Mr|Mrs|Prof)\.?\s+/iu, "").trim();
  const surname = bare.split(/[\s,]+/u)[0] ?? "";
  return [...new Set([name, core, bare, ...(surname.length >= 3 ? [surname] : [])].filter((x) => x.length >= 2))];
}

/** Why a line is not grounded (null: it is). */
export function lineProblem(line: string, o: { locale: string; perceived: string; staffNames: readonly string[]; namesInView: readonly string[] }): string | null {
  const s = line.trim();
  if (!s) return "empty";
  if (s.length > LINE_MAX) return `longer than ${LINE_MAX} characters`;
  if (/[\r\n]/u.test(s)) return "more than one line";
  const cjk = /[㐀-鿿]/u.test(s);
  if (o.locale === "zh-CN" && !cjk) return "not in Chinese";
  if (o.locale !== "zh-CN" && cjk) return "not in English";
  const allowed = new Set(numbers(o.perceived));
  const stray = numbers(s).filter((n) => !allowed.has(n));
  if (stray.length) return `numbers not in what the member perceives: ${stray.join(", ")}`;
  const inView = new Set(o.namesInView.flatMap(nameForms));
  const named = o.staffNames.filter((n) => n && nameForms(n).some((f) => s.includes(f) && !inView.has(f)) && !nameForms(n).some((f) => inView.has(f)));
  if (named.length) return `names someone not in view: ${named.join(", ")}`;
  return null;
}

/** A model-driven care-team member (one per team; it keeps who waited on what). */
export class ModelTeamMind {
  /** Member → the move they deferred last round (a second wait on the same move is not offered). */
  private readonly waited = new Map<MemberId, string>();
  private readonly warned = new Set<MemberId>();

  constructor(private readonly host: MindHost) {}

  /** The member's move this round (null: nothing). `rules`: the policy's proposal. Never throws. */
  async decide(member: MemberState, view: MemberView, rules: Proposal | null, signal: AbortSignal): Promise<Proposal | null> {
    // bookkeeping (taking a message in, a task's own update) is not a decision; nothing to do and nothing heard is quiet
    if (rules?.kind === "update") return rules;
    if (!rules && view.inbox.length === 0) return null;
    const model = this.host.model(member);
    if (!model) return this.fallback(member, rules, "no model");
    const L = this.host.locale;
    const position = this.host.position(member);
    const card = position ? ROLE_CARDS[position] : null;
    const options = this.options(member, view, rules);
    const situation = this.situation(member, view, card);
    const optionText = options.map((o) => `- ${o.id}: ${o.text}`).join("\n");
    const addressable = this.addressable(view);
    const request: ChatRequest = {
      model: model.request.model ?? model.provider.model,
      system: [
        { id: "role", text: card ? roleSection(card, this.host.name(member.id)) : `You are ${this.host.name(member.id)}, a member of the operating team.`, cache: "stable" },
        {
          id: "decide",
          cache: "stable",
          text: [
            "<deciding>",
            "This is one round of the team's work. Choose exactly ONE of the options listed — they are what the world and the team's protocol let you do now; nothing else can happen this round.",
            "`line` is what you say aloud when your option speaks: one short, natural, addressed sentence, in your role, the way a colleague in a real theatre would say it.",
            "State only what is in your situation; use a number only if it appears there; name only people in your situation.",
            `Speak ${L === "zh-CN" ? "Simplified Chinese" : "English"}.`,
            "`why` is your private reason (one sentence), for the record.",
            "Respond with the JSON object only.",
            "</deciding>",
          ].join("\n"),
        },
      ],
      messages: [{ role: "user", content: [{ type: "text", text: `<situation>\n${situation}\n</situation>\n\n<options>\n${optionText}\n</options>` }] }],
      maxTokens: model.request.maxTokens ?? 400,
      ...(model.request.temperature !== undefined ? { temperature: model.request.temperature } : { temperature: 0.4 }),
      ...(model.request.effort ? { effort: model.request.effort } : {}),
      responseFormat: {
        name: "team_decision",
        schema: {
          type: "object",
          properties: {
            option: { type: "string", enum: options.map((o) => o.id) },
            to: { type: "string", enum: addressable.length ? addressable : [""] },
            line: { type: "string" },
            why: { type: "string" },
          },
          required: ["option", "line", "why"],
          additionalProperties: false,
        },
      },
      conversationId: `team:${member.staff}`,
    };
    const timer = new AbortController();
    const onAbort = () => timer.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    const handle = setTimeout(() => timer.abort(), this.host.timeoutMs);
    let res: Awaited<ReturnType<typeof completeText>>;
    try {
      res = await completeText({ provider: model.provider, request, agent: model.agent, signal: timer.signal, ...(model.retry !== undefined ? { retry: model.retry } : {}), onUsage: (u) => this.host.usage(model.agent, u) });
    } finally {
      clearTimeout(handle);
      signal.removeEventListener("abort", onAbort);
    }
    if (signal.aborted) return null;
    if (res.aborted) return this.fallback(member, rules, `no decision within ${this.host.timeoutMs} ms`);
    const obj = res.error ? null : parseJsonObject(res.text);
    if (!obj) return this.fallback(member, rules, res.error?.message ?? "no JSON decision");
    const option = typeof obj.option === "string" ? obj.option : "";
    const line = typeof obj.line === "string" ? obj.line.trim() : "";
    const why = typeof obj.why === "string" ? obj.why.trim().slice(0, 300) : "";
    if (!options.some((o) => o.id === option)) return this.fallback(member, rules, `option "${option}" was not offered`);
    const perceived = `${situation}\n${optionText}`;
    const namesInView = [this.host.name(member.id), ...addressable.map((id) => this.host.name(id))];
    const problem = line ? lineProblem(line, { locale: L, perceived, staffNames: this.host.staffNames(), namesInView }) : null;
    const record = (accepted: boolean, extra: Record<string, unknown> = {}) => this.host.record({ source: "team-mind", member: member.id, round: view.round, option, accepted, ...(why ? { why } : {}), ...extra });
    switch (option) {
      case "wait":
        this.waited.set(member.id, digest(rules));
        record(true);
        return null;
      case "act": {
        this.waited.delete(member.id);
        if (rules?.kind !== "say" || !line) {
          record(true);
          return rules;
        }
        if (problem) {
          record(false, { refused: problem, line });
          return rules;
        }
        record(true, { line });
        // the member's own words in the session's language; the other language keeps the team's wording
        return { ...rules, message: { ...rules.message, text: { ...rules.message.text, [L]: line } } };
      }
      case "notice": {
        const to = typeof obj.to === "string" && addressable.includes(obj.to) ? obj.to : null;
        if (!to || !line || problem) {
          record(false, { refused: problem ?? (line ? "no colleague to tell" : "nothing said"), ...(line ? { line } : {}) });
          return this.fallback(member, rules, problem ?? "notice without a colleague or a line", false);
        }
        record(true, { to, line });
        return { kind: "say", to, message: { thread: view.newId("thread"), kind: "notice", text: { en: line, "zh-CN": line }, about: {}, evidence: [] } };
      }
      case "escalate": {
        const task = view.tasks.find((x) => x.owner === member.id && x.status === "waiting");
        if (!task || !line || problem) {
          record(false, { refused: problem ?? "nothing to escalate", ...(line ? { line } : {}) });
          return this.fallback(member, rules, problem ?? "escalation without a waiting task", false);
        }
        this.waited.delete(member.id);
        record(true, { task: task.id, line });
        return escalateTask(view, task, { en: line, "zh-CN": line });
      }
    }
    return this.fallback(member, rules, "unknown option");
  }

  /** The rules decide (the policy's proposal), with one warning per member. */
  private fallback(member: MemberState, rules: Proposal | null, reason: string, warn = true): Proposal | null {
    if (warn && !this.warned.has(member.id)) {
      this.warned.add(member.id);
      this.host.warn(`${this.host.name(member.id)}: ${reason} — the team's rules decided this round.`);
    }
    this.host.record({ source: "team-mind", member: member.id, fallback: reason });
    return rules;
  }

  /** The legal moves now. */
  private options(member: MemberState, view: MemberView, rules: Proposal | null): Option[] {
    const L = this.host.locale;
    const out: Option[] = [];
    // owed now: a closed-loop reply, and anything about the count (a count, a hold, a recount, an item set aside)
    const about = rules?.kind === "say" ? rules.message.about : null;
    const owed = rules?.kind === "say" && (OWED.has(rules.message.kind) || !!rules.message.replyTo || about?.count !== undefined || !!about?.hold || !!about?.recount || !!about?.setAside || !!about?.site);
    // the count's work and the site's verification are never put off (a look, the pause, the mark, the confirmation)
    const countWork = rules?.kind === "act" && (rules.operation.startsWith("site.") || view.tasks.some((x) => x.id === rules.task && (x.kind === "count" || x.kind === "check" || x.kind === "site" || x.kind === "verify")));
    if (rules) {
      const text =
        rules.kind === "say"
          ? `say to ${this.host.name(rules.to)} (${KIND_WORD[rules.message.kind]}) — the team's usual words: "${t(rules.message.text, L)}"${owed ? " [owed: the closed loop needs it now]" : ""}`
          : rules.kind === "act"
            ? `do: ${rules.operation}${rules.targetId ? ` ${this.host.name(rules.targetId)}` : ""}${rules.recipient ? ` to ${this.host.name(rules.recipient)}` : ""} (task ${rules.task})`
            : "update the task list";
      out.push({ id: "act", text });
      // an owed move is the only move: nothing else may come first (the member still says it in their own words)
      if (owed || countWork) return out;
    }
    const deferred = this.waited.get(member.id) === digest(rules);
    if (!rules || (!owed && !countWork && !deferred)) out.push({ id: "wait", text: rules ? "not now — this round you do nothing (you cannot wait twice in a row on the same move)" : "nothing to do now" });
    if (this.addressable(view).length) out.push({ id: "notice", text: "tell a colleague in the room something you see or are doing (`to`: who; no request, no obligation)" });
    if (view.tasks.some((x) => x.owner === member.id && x.status === "waiting") && !(rules?.kind === "say" && rules.message.kind === "escalate")) out.push({ id: "escalate", text: "raise your task that is stuck waiting to the person it is for (`line`: what was tried and why it failed)" });
    return out;
  }

  /** Who the member can speak to now: colleagues in the room, and the surgeon. */
  private addressable(view: MemberView): MemberId[] {
    const ids = view.colleagues.filter((c) => c.present && !c.absent).map((c) => c.id);
    return [...new Set(ids)];
  }

  /** What the member perceives, in words (the only facts a line may use). */
  private situation(member: MemberState, view: MemberView, card: RoleCard | null): string {
    const L = this.host.locale;
    const name = (id: string) => this.host.name(id);
    const lines: string[] = [];
    lines.push(`You: ${name(member.id)}${card ? `, ${card.title.en}` : ""}. Round ${view.round}. You are ${view.me.inRoom ? "in" : "outside"} the theatre (${name(view.room)}).`);
    lines.push(`In your hands: ${view.me.holding.length ? view.me.holding.map(name).join(", ") : "nothing"}.`);
    if (view.inbox.length) {
      lines.push("Said to you (unread):");
      for (const m of view.inbox) lines.push(`- ${name(m.from)} (${KIND_WORD[m.kind]}): "${t(m.text, L)}"`);
    }
    const mine = view.tasks.filter((x) => x.status !== "done");
    if (mine.length) {
      lines.push("Your tasks:");
      for (const x of mine) lines.push(`- ${x.id}: ${x.kind}${x.item ? ` — ${t(view.itemName(x.item), L)}` : ""} for ${name(x.for)} — ${x.status}${x.assignee ? ` (asked: ${name(x.assignee)})` : ""}`);
    }
    if (view.needs.length) {
      lines.push("Needs you have noticed:");
      for (const n of view.needs) lines.push(`- ${name(n.forId)} needs a ${t(view.itemName(n.need.item), L)}`);
    }
    if (view.colleagues.length) {
      lines.push("Colleagues:");
      for (const c of view.colleagues) {
        const where = c.absent ? "not available (on a break)" : c.present ? "in the theatre" : c.relief ? "outside, reachable by phone" : "not in the theatre";
        lines.push(`- ${name(c.id)} — ${where}${c.busy ? ", busy with a task" : ""}`);
      }
    }
    if (view.count) lines.push(`The count: ${t(view.count.name, L)} — ${view.count.of} in the count${view.count.due ? "; the count is due now" : ""}.`);
    return lines.join("\n");
  }
}

/** A move's identity (the same move deferred again is the same digest). */
function digest(p: Proposal | null): string {
  if (!p) return "none";
  if (p.kind === "say") return `say:${p.to}:${p.message.kind}:${p.message.thread}`;
  if (p.kind === "act") return `act:${p.task}:${p.operation}:${p.targetId ?? ""}`;
  return "update";
}
