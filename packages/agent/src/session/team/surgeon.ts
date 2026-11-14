/**
 * The surgeon's own part in the team's closed loops (docs/TEAM.md §4.3, §4.6): what whoever operates answers when the
 * team speaks to them — a hold on closure read back (check-back), the wound then checked with their own body and what
 * it brings to light taken out, an escalation acknowledged. The simulated surgeon of observer mode does only this; the
 * stand-in surgeon (`./operator.ts`) does it first, before its own plan. Pure: from the member's view only.
 */
import { phrase } from "./i18n.js";
import type { MemberView } from "./policy.js";
import type { Proposal, TeamMessage, TeamTask } from "./types.js";

/** A hold on closure (read back, the wound check taken on) or an escalation (acknowledged) said to the surgeon; null: anything else. */
export function surgeonAnswer(v: MemberView, m: TeamMessage): Proposal | null {
  if (m.kind === "request" && m.about.hold) {
    // check-back: the hold read back; then the wound is checked
    const task: TeamTask = { id: v.newId("task"), kind: "wound", need: "count", item: m.about.item ?? "", for: v.me.id, owner: v.me.id, initiator: m.from, thread: m.thread, status: "accepted", since: v.round, tried: [], acts: 0 };
    return { kind: "say", to: m.from, message: { thread: m.thread, kind: "readback", text: phrase("holdReadback"), about: m.about, evidence: [], replyTo: m.id }, patch: [{ read: m.id }, { create: task }] };
  }
  if (m.kind === "escalate") {
    return { kind: "say", to: m.from, message: { thread: m.thread, kind: "report", text: phrase("acknowledged"), about: m.about, evidence: [m.id], replyTo: m.id }, patch: [{ read: m.id }] };
  }
  return null;
}

/** The wound checked for a hold on closure: walked to, searched, what it brings to light taken out, then reported checked. */
export function woundStep(v: MemberView): Proposal | null {
  for (const task of v.tasks) {
    if (task.kind !== "wound" || task.status !== "accepted" || !v.patient) continue;
    if (task.goal) return { kind: "act", task: task.id, operation: "navigate", goal: task.goal, patch: [{ id: task.id, set: { goal: undefined } }] };
    if (task.step !== "searched") return { kind: "act", task: task.id, operation: "search", targetId: v.patient };
    // what the search brought to light is taken out (and so counted); then the wound is reported checked
    const out = v.count && v.me.holding.length < 2 ? v.items(v.count.item).find((s) => s.perceived && !s.holder && s.distance <= 2.5) : undefined;
    if (out) return { kind: "act", task: task.id, operation: out.inReach ? "pick_up" : "approach", targetId: out.id };
    return { kind: "say", to: task.initiator, message: { thread: task.thread, kind: "report", text: phrase("woundChecked"), about: { item: task.item }, evidence: [] }, patch: [{ id: task.id, set: { status: "done", since: v.round } }] };
  }
  return null;
}

/** The simulated surgeon (observer mode, no place): answers what the team says to them, checks the wound when asked. */
export function surgeon(v: MemberView): Proposal | null {
  const first = v.inbox[0];
  if (first) return surgeonAnswer(v, first) ?? { kind: "update", patch: [{ read: first.id }] };
  return woundStep(v);
}
