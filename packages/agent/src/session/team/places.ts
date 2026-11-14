/**
 * What a session needs before it lets the learner take a place in the care team (docs/TEAM.md §1, docs/PROTOCOL.md
 * §3.1): while the learner holds a place the stand-in surgeon operates, through the team's caller (`TEAM_CALLER`) —
 * so a session whose permission settings would refuse that caller's steps (plan mode, a practice scope that leaves the
 * operation out, a deny rule matching `operate` or `observe_field`) refuses the place at the start, saying why, and the
 * stand-in never meets a refusal by a rule in the middle of the operation.
 */
import { memberBody, type Place, type ProcedureOp } from "@clinicalcraft/core";
import { checkPermission } from "../../permissions.js";
import type { SessionKernel } from "../kernel.js";
import { TEAM_CALLER } from "./callout.js";

/** Steps the stand-in may take besides the reference's own (`./operator.ts`): taking a port back, the camera, an injury said aloud, suction. */
const STAND_IN_EXTRAS: readonly ProcedureOp[] = [
  { op: "hand-over", port: "A" },
  { op: "aim", port: "A" },
  { op: "zoom", port: "A", level: "wide" },
  { op: "recognise", injury: "bleeding" },
  { op: "suction", port: "C" },
  { op: "irrigate", port: "C" },
];

/**
 * Why the session's permission settings would refuse the stand-in surgeon's steps (the ladder's own reason, in the
 * session's language), or null: the reference's operative steps and the stand-in's own, and its look at the field, as
 * the team's caller with the stand-in's body would ask them.
 */
export function standInRefusal(k: SessionKernel, id: string, seat: Place): string | null {
  const s = k.settings;
  const ctx = k.tools.context(TEAM_CALLER, id, undefined, { actorId: memberBody(k.caseDef, { seat }, "surgeon") });
  const steps = [...k.caseDef.solution.flatMap((a) => (a.type === "operate" ? [a.op] : [])), ...STAND_IN_EXTRAS];
  const seen = new Set<string>();
  const calls: [string, Record<string, unknown>][] = [["observe_field", {}]];
  for (const op of steps) {
    if (seen.has(op.op)) continue;
    seen.add(op.op);
    calls.push(["operate", { ...op }]);
  }
  for (const [name, args] of calls) {
    const tool = k.registry.get(name);
    if (!tool) continue;
    const check = checkPermission(tool, args as never, ctx, s.approvalMode, s.practiceScope, s.permissions);
    if (check.decision === "deny") return check.reason;
  }
  return null;
}
