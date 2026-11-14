/**
 * The approval gate of a session (docs/ARCHITECTURE.md §4.1): the permission ladder (`checkPermission` — deny →
 * ask → allow rules, then the approval mode × practice scope table) and, for an "ask", the `approval_request`
 * flow through the `ApprovalBroker`: the turn's phase goes to `awaiting_approval` and back, and an "approve for
 * session" answer adds an in-memory allow rule for each thing the call acts on. Every agent's tool calls
 * (`LoopHost.authorize`) and the learner's tool path go through it.
 */
import { t } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import type { AuthorizeRequest, GateOutcome } from "../loop.js";
import { callSpecifiers, checkPermission, PermissionState, teamPermission } from "../permissions.js";
import type { ApprovalDecision } from "../protocol.js";
import { ApprovalBroker } from "./approvals.js";
import type { SessionKernel } from "./kernel.js";
import { calloutLine, isCallout, operateArgsOp, TEAM_CALLER } from "./team/callout.js";

/** The permission ladder and the approval_request flow of one session. */
export class ApprovalGate {
  /** Session-scoped allow rules ("approve for session" answers). */
  readonly permissionState = new PermissionState();
  private readonly broker: ApprovalBroker;

  constructor(private readonly k: SessionKernel) {
    this.broker = new ApprovalBroker((id, msg) => k.emit(id, msg), k.newId);
  }

  /** Settle a pending approval request with the learner's answer; false when there is no such request. */
  respond(responseSubmissionId: string, requestId: string, decision: ApprovalDecision, reason?: string): boolean {
    return this.broker.respond(responseSubmissionId, requestId, decision, reason);
  }

  /** Cancel every pending approval request (interrupt, shutdown). */
  cancelAll(submissionId: string): void {
    this.broker.cancelAll(submissionId);
  }

  /** The approval gate (permission ladder + approval_request flow). */
  async authorize(id: string, req: AuthorizeRequest): Promise<GateOutcome> {
    const k = this.k;
    const s = k.settings;
    let check = checkPermission(req.tool, req.args as never, req.ctx, s.approvalMode, s.practiceScope, s.permissions, this.permissionState);
    // the care team's own steps (docs/TEAM.md §4.5): never asked about — but the stand-in surgeon's critical step, which
    // is asked as their call-out ("Clipping the cystic duct.": No objection / Stop), in every mode but bypass
    let callout: string | undefined;
    if (String(req.agent) === TEAM_CALLER) {
      const op = req.tool.name === "operate" ? operateArgsOp(req.args) : null;
      const state = req.ctx.state();
      const asks = isCallout(req.ctx.caseDef, state, req.ctx.actorId, op);
      check = teamPermission(check, s.approvalMode, asks, req.ctx.locale);
      const line = asks && op ? calloutLine(req.ctx.caseDef, state, op) : null;
      if (line) callout = t(line, req.ctx.locale);
    }
    if (check.decision === "deny") return { kind: "deny", reason: check.reason, ruleId: check.ruleId };
    if (check.decision === "allow" || req.hookApproved) return { kind: "allow", ruleId: check.ruleId };
    const phase = (p: "awaiting_approval" | "executing_tools") => {
      if (req.turnId) k.emit(id, { type: "turn_phase", turnId: req.turnId, agent: String(req.agent), phase: p });
    };
    phase("awaiting_approval");
    let summary: string;
    try {
      summary = req.tool.summarize(req.args as never, req.ctx);
    } catch {
      summary = req.tool.name;
    }
    // the body that would act, when it is not the caller's own (a colleague's, the stand-in surgeon's): a front-end
    // shows whose step it is asked about (the stand-in's call-out)
    const actorId = req.ctx.actorId !== undefined && req.ctx.actorId !== PRIMARY_ACTOR ? req.ctx.actorId : undefined;
    const answer = await this.broker.request(
      id,
      { agent: req.agent, ...(actorId ? { actorId } : {}), ...(callout ? { callout } : {}), tool: req.tool.name, args: req.args, risk: check.risk, summary, reason: check.reason, ruleId: check.ruleId, allowSession: check.allowSession },
      req.signal,
    );
    phase("executing_tools");
    switch (answer.decision) {
      case "approved":
        return { kind: "allow", ruleId: "learner.approved" };
      case "approved_for_session": {
        let specifier: string | null = null;
        try {
          specifier = req.tool.specifier?.(req.args as never, req.ctx) ?? null;
        } catch {
          specifier = null;
        }
        // One rule per thing the call acts on (its canonical name): a composite walk covers exactly its leaves.
        if (check.allowSession) for (const [name] of callSpecifiers(req.tool, req.args as never, req.ctx, specifier)) this.permissionState.addSessionRule(req.tool.name, name ?? null);
        return { kind: "allow", ruleId: "learner.approved_for_session" };
      }
      case "denied":
        return { kind: "deny", reason: answer.reason ?? "", ruleId: "learner.denied", byLearner: true };
      case "abort":
        return { kind: "abort" };
      default: {
        const never: never = answer.decision;
        return never;
      }
    }
  }
}
