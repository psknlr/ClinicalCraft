/**
 * Test-only (excluded from the build: it reads the world's test fixtures): an in-world session in an operating theatre
 * with a full care team, for the session's places in the team, the operate tool by control, the scope of practice by
 * control, delegation at the operating table and lookup by position (docs/TEAM.md §1, docs/EMBODIED.md §8.3). Nothing
 * here is new data: the facility, the catalog and the case are the world's theatre fixture
 * (`packages/world/src/__fixtures__/theatre.ts`) — general-hospital's theatre with core's lap-chole team
 * (`lap-chole-team.ts`) as its members of staff: the circulating nurse `nurse-1`, the scrub nurse `nurse-2`, the first
 * assistant `doc-1`, the second assistant `doc-2` (the line-up `three-surgeons`), the anaesthetist `anaes-1`, the
 * stand-in surgeon `doc-0`, the relief scrub nurse `nurse-9` in the scrub room and a porter outside the team.
 *
 * A place in the team is taken by dispatching the start straight to the session kernel (`ClinicalSession.dispatch`),
 * as a replay or QA does — the learner's own path still refuses a place until a stand-in surgeon operates (WP5) — and
 * the operator's steps are raw actor-less dispatches (the operator's, as every reference step is).
 */
import type { ClinicalAction, ProcedureOp, ReduceResult } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type ActorId, type Pose } from "@clinicalcraft/world";
import { STAFF, THEATRE, theatreCase, theatreCatalog, theatreFacility, WHOLE_OPERATION } from "../../../../world/src/__fixtures__/theatre.js";
import { catalogs } from "../../../../world/src/__fixtures__/world.js";
import { makeSession, type TestSession, type TestSessionOptions } from "../../__fixtures__/harness.js";
import type { SessionKernel } from "../kernel.js";

export { STAFF, THEATRE, theatreCase, theatreFacility, WHOLE_OPERATION };

/**
 * The session's kernel (test-only access to what no op reaches directly): the learner's own tool path — the one the
 * CLI's slash commands run a tool through (`CommandHost.runTool` → `LearnerPath.runToolDetailed`, no body) — and the
 * embodied session the care team acts through (`EmbodiedSession.act` with the team's caller).
 */
export function kernelOf(t: TestSession): SessionKernel {
  return (t.session as unknown as { k: SessionKernel }).k;
}

/** The access the operator makes before anyone else touches the field: the plan, the gas, the scope in A, a grasper in B, the Maryland in C. */
export const ACCESS: readonly ProcedureOp[] = WHOLE_OPERATION.slice(0, 5);

/** The reference traction on the infundibulum, in port B. */
export const LATERAL: ProcedureOp = WHOLE_OPERATION[5]!;

export interface TheatreSessionOptions extends TestSessionOptions {
  /**
   * The session's first action, dispatched to the session kernel (not the learner's path) and required to be accepted:
   * a place in the team is `{ type: "start", seat: "first-assistant" }`.
   */
  start?: Extract<ClinicalAction, { type: "start" }>;
  /** A clinical-mode session of the same case (no world). */
  clinical?: boolean;
}

/** A session of the theatre case in the theatre (in-world unless `clinical`). */
export async function theatreSession(opts: TheatreSessionOptions = {}): Promise<TestSession> {
  const { start, clinical = false, settingsPatch, ...rest } = opts;
  const t = await makeSession({
    caseDef: theatreCase(),
    facility: theatreFacility(),
    catalogs: [...catalogs(), theatreCatalog()],
    ...rest,
    settingsPatch: { embodiment: clinical ? "clinical" : "embodied", ...(settingsPatch ?? {}) },
  });
  if (start) {
    const r = t.session.dispatch({ ...start, by: "system" });
    if (r.rejected) throw new Error(`start rejected: ${r.rejected.message}`);
  }
  return t;
}

/** Dispatch through the session kernel; every action must be accepted. */
export function system(t: TestSession, action: ClinicalAction): ReduceResult {
  const r = t.session.dispatch(action);
  if (r.rejected) throw new Error(`${action.type}${action.type === "operate" ? ` ${action.op.op}` : ""}: ${r.rejected.message}`);
  return r;
}

/** The operator's steps (raw, actor-less dispatches), into the theatre first when the case is not there yet. */
export function operatorSteps(t: TestSession, ops: readonly ProcedureOp[]): void {
  if (!t.session.state.started) system(t, { type: "start", by: "system" });
  if (t.session.state.phase !== "theatre") system(t, { type: "set-phase", phase: "theatre", by: "system" });
  for (const op of ops) system(t, { type: "operate", op, by: "system" });
}

/** The patient's entity id in the world. */
export function patientOf(t: TestSession): string {
  const w = t.session.world()!;
  const id = w.entities().find((e) => e.kind === "patient")?.id;
  if (!id) throw new Error("no patient in the world");
  return id;
}

/** Put a body right beside the patient (a sensor pose: no walk), `dz` metres to the patient's south. */
export function standAtTable(t: TestSession, actorId: ActorId, dz = 0.6): void {
  const p = t.session.world()!.patientPlace()!;
  t.session.submit({ type: "world_pose", actorId, pose: { x: p.x, y: 0, z: p.z + dz, yaw: 0, pitch: 0, level: p.level } });
}

/** Put a body in the scrub room next door, away from the table (a sensor pose). */
export function sendToScrubRoom(t: TestSession, actorId: ActorId = PRIMARY_ACTOR): void {
  const nurse9 = t.session.world()!.actor(STAFF.relief)!.pose;
  const pose: Pose = { ...nurse9, x: nurse9.x + 0.8 };
  t.session.submit({ type: "world_pose", actorId, pose });
}
