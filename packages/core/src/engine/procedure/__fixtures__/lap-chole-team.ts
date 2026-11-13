/**
 * The lap-chole fixture (`lap-chole-sit.ts`) with a full theatre team and its reference path — for the field's tests of
 * colleagues, controls and places (docs/PROCEDURE.md §3, docs/TEAM.md §1). The team is the places fixture's
 * (`../../__fixtures__/team-places.ts`) at work in the theatre phase: the circulating nurse `nurse-1`, the scrub nurse
 * `nurse-2` (`[count, instruments]`), the first assistant `doc-1` (who holds the camera while no second assistant is
 * present), the anaesthetist `anaes-1` and the surgeon, whose stand-in is `doc-0`; the line-up `three-surgeons` adds the
 * second assistant `doc-2`; team scenarios: `scrub-break` (the scrub nurse away, `nurse-9` relieving) and `second-away`.
 * The reference path is the safe operation, from the start to the close: the operator's alone, as every reference path
 * is. Test data, not a team any hospital works with.
 */
import type { CaseDefinition } from "../../../schema/case.js";
import type { ProcedureOp } from "../../../schema/procedure.js";
import { PLACES_TEAM } from "../../__fixtures__/team-places.js";
import { parseCase } from "../../parse.js";
import { LAP_CHOLE_SIT } from "./lap-chole-sit.js";

/** The team (raw JSON, as a case author writes it): the places fixture's, in the operating theatre. */
export const LAP_CHOLE_TEAM = { ...structuredClone(PLACES_TEAM), room: "theatre-1", phases: ["theatre"] };

const DISSECT = (region: string, n: number, energy = false): ProcedureOp[] => Array.from({ length: n }, () => ({ op: "dissect", port: "C", region, energy }) as ProcedureOp);

/**
 * The safe operation in the base anatomy (`T2` the cystic duct, `T3` the cystic artery, as the field gives the handles
 * out), the access first (`REFERENCE_OPS.slice(0, 5)`: plan, pneumoperitoneum, the scope in A, a grasper in B, the
 * Maryland in C).
 */
export const REFERENCE_OPS: readonly ProcedureOp[] = [
  { op: "plan-ports", plan: "three-port-left" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "B", instrument: "grasper" },
  { op: "insert", port: "C", instrument: "maryland" },
  { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"], force: "firm" },
  ...DISSECT("hepatocystic-triangle", 6),
  ...DISSECT("cystic-plate", 3),
  { op: "isolate", port: "C", handle: "T2" },
  { op: "isolate", port: "C", handle: "T3" },
  { op: "identify", handle: "T2", as: "cystic-duct" },
  { op: "identify", handle: "T3", as: "cystic-artery" },
  { op: "safety-pause", view: "cvs", claims: { triangle: true, plate: true, two: true } },
  { op: "withdraw", port: "C" },
  { op: "insert", port: "C", instrument: "clip-applier" },
  { op: "clip", port: "C", handle: "T2", count: 3 },
  { op: "clip", port: "C", handle: "T3", count: 2 },
  { op: "withdraw", port: "C" },
  { op: "insert", port: "C", instrument: "scissors" },
  { op: "divide", port: "C", handle: "T2" },
  { op: "divide", port: "C", handle: "T3" },
  { op: "withdraw", port: "C" },
  { op: "insert", port: "C", instrument: "hook" },
  { op: "retract", port: "B", structure: "gallbladder-infundibulum", direction: ["anterior", "cephalad"], force: "firm" },
  ...DISSECT("gallbladder-bed", 4, true),
  { op: "inspect" },
  { op: "withdraw", port: "C" },
  { op: "insert", port: "C", instrument: "retrieval-bag" },
  { op: "bag", port: "C" },
  { op: "extract", port: "A" },
  { op: "close" },
];

/** The case's reference solution: start, into the theatre, the operation, finish. */
export const LAP_CHOLE_SOLUTION = [{ type: "start" }, { type: "set-phase", phase: "theatre" }, ...REFERENCE_OPS.map((op) => ({ type: "operate", op })), { type: "finish" }];

/** The parsed case: the lap-chole fixture with the team and the reference solution; `extra` replaces top-level fields. */
export function lapCholeTeamCase(extra: Record<string, unknown> = {}): CaseDefinition {
  const parsed = parseCase({ ...structuredClone(LAP_CHOLE_SIT), team: structuredClone(LAP_CHOLE_TEAM), solution: structuredClone(LAP_CHOLE_SOLUTION), ...extra });
  if (!parsed.ok) throw new Error(`fixture invalid: ${JSON.stringify(parsed.issues.slice(0, 3))}`);
  return parsed.value;
}
