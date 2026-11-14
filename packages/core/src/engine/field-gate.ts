/**
 * The operative field's gate before the physics, for a step a body would take (docs/PROCEDURE.md §3, §7): whether the
 * field takes the step from that body at all. The session's precheck of an `operate` call (agent `placeRefusal`, before
 * any approval) and a front-end's offers (the web's surgery window by place) ask this one composition, so the two never
 * disagree:
 * - the body works the field as its member (`refOfBody`): a body with no part in it — the colleague standing by while
 *   the learner holds their place, a body that is nobody's in the team — takes no step (`no-part`);
 * - a colleague's step that only the operator does is refused (`operator-only`: not in `COLLEAGUE_OPS`);
 * - whom the step names takes part (`party`: core `stepPartyRefusal` — a member the team scenario makes absent; a pass,
 *   in a place a hand-over, to someone outside the team);
 * - the controls cover it (`control`: core `seatCheck` with each body's own controls, `bodyControls` for the field) —
 *   for whoever does the step and whoever takes a port.
 * The physics (who holds a port, what is in it, the gas) answers the rest: the reducer when the step is sent, or
 * `operateRefusal` without taking it.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { FacilityDefinition } from "../schema/facility.js";
import type { ProcedureOp, RefusalReason } from "../schema/procedure.js";
import type { SessionState } from "../schema/session.js";
import { COLLEAGUE_OPS, procedureStateOf } from "./procedure/index.js";
import { bodyControls, LEARNER_BODY, memberBody, normaliseStep, refOfBody, seatCheck, stepPartyRefusal, type Controls, type FieldGateRefusal, type TeamChoice } from "./seats.js";

/** A step as the field records it (`normaliseStep`): its op, and its actor — absent: the operator. */
export interface FieldStep {
  op: ProcedureOp;
  actor?: string;
}

/**
 * Why the field's gate refuses a body's step (`fieldGate`):
 * - `no-part`: the body works no part of the field;
 * - `operator-only`: a colleague's step only the operator does (`reason` key `operator-only` {op, actor});
 * - `party`: whom the step names takes no part (`stepPartyRefusal`'s refusal);
 * - `control`: a control the body — or whoever takes a port — does not hold (`seatCheck`'s refusal).
 * `step`: the step as the field records it.
 */
export type FieldGate =
  | { kind: "no-part" }
  | { kind: "operator-only"; step: FieldStep; reason: RefusalReason }
  | { kind: "party" | "control"; step: FieldStep; refusal: FieldGateRefusal };

/**
 * Whether the operative field's gate lets a body's step through (null), or why not — before any approval and before
 * the physics. `body`: the acting body (a body-less call is the learner's: `LEARNER_BODY`); `facility`: whose positions
 * name the controls of staff outside the team (`bodyControls`).
 */
export function fieldGate(
  c: CaseDefinition,
  s: TeamChoice & Pick<SessionState, "procedure" | "equipment">,
  facility: FacilityDefinition | null | undefined,
  op: ProcedureOp,
  body: string = LEARNER_BODY,
): FieldGate | null {
  const ref = refOfBody(c, s, body);
  if (ref === null) return { kind: "no-part" };
  const step = normaliseStep(c, s, op, ref);
  if (step.actor !== undefined && !COLLEAGUE_OPS.has(step.op.op)) return { kind: "operator-only", step, reason: { key: "operator-only", params: { op: step.op.op, actor: step.actor } } };
  const party = stepPartyRefusal(c, s, step.op, step.actor);
  if (party) return { kind: "party", step, refusal: party };
  const controlsOf = (who: string): Controls => bodyControls(c, s, facility, memberBody(c, s, who), "field");
  const control = seatCheck(c, { ...s, procedure: procedureStateOf(s) }, step.op, step.actor, controlsOf);
  return control ? { kind: "control", step, refusal: control } : null;
}
