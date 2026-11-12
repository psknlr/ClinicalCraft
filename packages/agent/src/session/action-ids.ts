/**
 * Persistent action ids (the engineering recommendations, P2-14): every committed clinical action is `act-<seq>` —
 * `seq` the session's action sequence once it is applied (`SessionState.seq`), so the same action has the same id in
 * a replay, after a reload and in every front-end. Clinical events carry it (`clinical_event.actionId`), a tool
 * call's result names the actions it committed (`tool_call_end.actionIds`; MCP `structuredContent.actionIds`), and
 * `get_action_feedback` resolves it — and an operative step's `op-<n>` — from the record itself (no second store
 * that a save could lose).
 */
import { createSession, reduce, type CaseDefinition, type ClinicalAction, type DomainEvent } from "@clinicalcraft/core";

/** The id of the action that brought the session to `seq`. */
export function actionIdOf(seq: number): string {
  return `act-${seq}`;
}

/** The ids of the actions committed between two sequence numbers (`after` exclusive, `upTo` inclusive). */
export function actionIdsBetween(after: number, upTo: number): string[] {
  const ids: string[] = [];
  for (let n = after + 1; n <= upTo; n++) ids.push(actionIdOf(n));
  return ids;
}

/** What the record holds about one committed action. */
export interface ClinicalActionFeedback {
  actionId: string;
  seq: number;
  type: ClinicalAction["type"];
  /** Who did it (`learner`, an agent, `system`). */
  by: string;
  /** A colleague who did it (staff id), if not the operator. */
  actor?: string;
  /** Simulated minute it was applied at. */
  at: number;
  /** An operative step's own id (`op-<n>`). */
  step?: string;
  /** The events it produced, by type. */
  events: DomainEvent["type"][];
  action: ClinicalAction;
}

/**
 * Resolve `act-<seq>` or `op-<n>` against the accepted record (replayed through the pure engine; null when no
 * committed action has that id).
 */
export function clinicalActionFeedback(c: CaseDefinition, accepted: readonly ClinicalAction[], id: string): ClinicalActionFeedback | null {
  const m = /^(act|op)-(\d+)$/u.exec(id.trim());
  if (!m) return null;
  const want = Number(m[2]);
  let s = createSession(c);
  for (const action of accepted) {
    const at = s.clock;
    const r = reduce(c, s, action);
    if (r.rejected) continue;
    const changed = r.state.seq !== s.seq;
    s = r.state;
    if (!changed) continue;
    const step = r.events.find((e): e is Extract<DomainEvent, { type: "procedure.step" }> => e.type === "procedure.step");
    const hit = m[1] === "act" ? s.seq === want : step?.id === `op-${want}`;
    if (!hit) continue;
    const actor = action.type === "operate" ? action.actor : undefined;
    return {
      actionId: actionIdOf(s.seq),
      seq: s.seq,
      type: action.type,
      by: String(action.by ?? "learner"),
      ...(actor ? { actor } : {}),
      at,
      ...(step?.id ? { step: step.id } : {}),
      events: r.events.map((e) => e.type),
      action: structuredClone(action),
    };
  }
  return null;
}
