/**
 * Staff role states (docs/TEAM.md §5, `ClinicalSession.staffStates()`): derived from the record and the world — a care
 * team member's tasks and the requests they have not answered are theirs.
 */
import { describe, expect, it } from "vitest";
import type { SessionKernel } from "./kernel.js";
import { StaffAutonomy } from "./staff-autonomy.js";
import type { TeamCheckpoint, TeamTask } from "./team/types.js";

describe("staff role states", () => {
  it("a scrub nurse's team task and the request she has not answered are in her role state", () => {
    const SCRUB = "staff:or.scrub";
    const CIRC = "staff:or.circ";
    const actors = [{ id: SCRUB, role: "nurse", holding: [], pose: { x: 0, z: 0, level: "L1" }, task: null }];
    const world = { snapshot: () => ({ entities: {} }), actors: () => actors, entity: () => ({ name: "Nurse Lim" }), roomOf: () => "or" };
    const deliver: TeamTask = { id: "task-3", kind: "deliver", need: "n1", item: "needle-holder", for: "actor:clinician", owner: SCRUB, initiator: CIRC, thread: "thread-9", status: "accepted", since: 0, tried: [], acts: 0 };
    const answered = { id: "msg-2", thread: "thread-9", from: CIRC, to: SCRUB, kind: "request" };
    const cp = {
      format: "clinicalcraft-team@1",
      autonomy: "auto",
      surgeon: "learner",
      state: { messages: [answered, { id: "msg-3", thread: "thread-9", from: SCRUB, to: CIRC, kind: "readback" }, { id: "msg-4", thread: "thread-2", from: CIRC, to: SCRUB, kind: "request" }], tasks: [deliver] },
    } as unknown as TeamCheckpoint;
    const k = {
      embodied: { world: () => world },
      caseDef: { patient: {}, team: { members: [{ staff: "or.scrub", duties: ["instruments"] }], scenarios: [] } },
      locale: "en",
      state: { clock: 3 },
      facility: { staff: [{ id: "or.scrub", role: "nurse", name: "Nurse Lim" }] },
      team: { checkpoint: () => cp },
    } as unknown as SessionKernel;
    const [lim] = new StaffAutonomy(k).states();
    expect(lim).toMatchObject({ actorId: SCRUB, position: "scrub-nurse", currentGoal: "n1", currentTask: "task-3", pendingRequests: ["msg-4"] });
    expect(lim!.responsibility).toContain("task task-3");
  });
});
