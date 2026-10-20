/**
 * Approval broker: turns an `ask` from the permission ladder into an
 * `approval_request` event and waits for the matching `approval_response`
 * op (or an abort). Pending requests are cancelled (resolved as `abort`) on
 * interrupt and shutdown, so a turn can never hang on an unanswered dialog.
 */
import type { AgentRole, ApprovalDecision, EventMsg, RiskLevel } from "../protocol.js";

export interface ApprovalAsk {
  agent: AgentRole | "learner";
  tool: string;
  args: unknown;
  risk: RiskLevel;
  summary: string;
  reason: string;
  ruleId: string;
  allowSession: boolean;
}

export interface ApprovalAnswer {
  decision: ApprovalDecision;
  reason?: string;
}

interface Pending {
  submissionId: string;
  allowSession: boolean;
  resolve: (answer: ApprovalAnswer) => void;
  cleanup: () => void;
}

export class ApprovalBroker {
  private readonly pending = new Map<string, Pending>();

  constructor(
    private readonly emit: (submissionId: string, msg: EventMsg) => void,
    private readonly newId: () => string,
  ) {}

  /** Number of unanswered requests. */
  get size(): number {
    return this.pending.size;
  }

  /** Ids of unanswered requests. */
  pendingIds(): string[] {
    return [...this.pending.keys()];
  }

  /** Emit `approval_request` and wait for the answer (abort → `{decision: "abort"}`). */
  request(submissionId: string, ask: ApprovalAsk, signal?: AbortSignal): Promise<ApprovalAnswer> {
    const requestId = this.newId();
    return new Promise<ApprovalAnswer>((resolve) => {
      if (signal?.aborted) {
        resolve({ decision: "abort" });
        return;
      }
      const onAbort = () => this.settle(requestId, submissionId, { decision: "abort" });
      signal?.addEventListener("abort", onAbort, { once: true });
      this.pending.set(requestId, {
        submissionId,
        allowSession: ask.allowSession,
        resolve,
        cleanup: () => signal?.removeEventListener("abort", onAbort),
      });
      this.emit(submissionId, { type: "approval_request", requestId, ...ask });
    });
  }

  /**
   * Answer a request. `approved_for_session` is downgraded to `approved` when
   * the request did not offer it. Returns false for unknown ids.
   */
  respond(responseSubmissionId: string, requestId: string, decision: ApprovalDecision, reason?: string): boolean {
    const pending = this.pending.get(requestId);
    if (!pending) return false;
    const effective: ApprovalDecision = decision === "approved_for_session" && !pending.allowSession ? "approved" : decision;
    this.settle(requestId, responseSubmissionId, reason ? { decision: effective, reason } : { decision: effective });
    return true;
  }

  /** Cancel every pending request (interrupt, shutdown). */
  cancelAll(submissionId = ""): void {
    for (const [requestId, pending] of [...this.pending]) this.settle(requestId, submissionId || pending.submissionId, { decision: "abort" });
  }

  private settle(requestId: string, submissionId: string, answer: ApprovalAnswer): void {
    const pending = this.pending.get(requestId);
    if (!pending) return;
    this.pending.delete(requestId);
    pending.cleanup();
    this.emit(submissionId, { type: "approval_resolved", requestId, decision: answer.decision, ...(answer.reason ? { reason: answer.reason } : {}) });
    pending.resolve(answer);
  }
}
