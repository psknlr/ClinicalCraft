/**
 * The team scheduler (docs/TEAM.md §2, §4.4) on a stub world: what the learner answers as the surgeon is answered once.
 */
import { describe, expect, it } from "vitest";
import type { CaseTeam } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type WorldRuntime } from "@clinicalcraft/world";
import { TeamScheduler, type TeamHost } from "./scheduler.js";
import type { TeamMessage } from "./types.js";

const CIRC = "staff:or.circ";
const SURGEON = PRIMARY_ACTOR;

/** Two bodies in room "or", nothing else: enough for the scheduler's messages and its members' views. */
function stubWorld(): WorldRuntime {
  const actors = [CIRC, SURGEON].map((id) => ({ id, role: id === SURGEON ? "attending" : "nurse", room: "or", holding: [] as string[], pose: { x: 0, z: 0, level: "L1", yaw: 0 } }));
  return {
    version: 1,
    actor: (id: string) => actors.find((a) => a.id === id) ?? null,
    actors: () => actors,
    canSee: () => true,
    find: () => [],
    snapshot: () => ({ entities: {} }),
    entity: () => null,
    entities: () => [],
    placeItem: () => undefined,
    patientPlace: () => null,
    feedback: () => null,
  } as unknown as WorldRuntime;
}

function scheduler(): TeamScheduler {
  const world = stubWorld();
  const host: TeamHost = {
    world: () => world,
    act: () => Promise.reject(new Error("no world act expected")),
    clock: () => 0,
    phase: () => "operation",
    locale: "en",
    emit: () => undefined,
    say: () => undefined,
    holds: () => false,
    count: () => null,
    record: () => undefined,
  };
  const config = { room: "or", phases: ["operation"], waitRounds: 3, members: [{ staff: "or.circ", duties: ["circulate"] }, { staff: "surgeon", duties: ["surgeon"] }], scenarios: [] } as unknown as CaseTeam;
  return new TeamScheduler(host, config, null);
}

describe("the team scheduler", () => {
  it("a hold the learner read back is not read back again once the surgeon is simulated (observer mode)", async () => {
    const s = scheduler();
    const hold: TeamMessage = { id: "msg-1", thread: "thread-1", from: CIRC, to: SURGEON, kind: "request", text: { en: "Count incorrect — 4 of 5 swabs. Please hold closure and check the wound.", "zh-CN": "清点不符——纱布只有4/5。请暂停关闭，检查术野。" }, about: { item: "swab", count: 4, of: 5, hold: true }, room: "or", patient: null, at: 0, round: 0, evidence: [], delivered: true, read: false };
    s.state.messages.push(hold);
    s.state.seq = 1;
    const surgeon = s.state.members.find((m) => m.id === SURGEON)!;
    surgeon.inbox.push("msg-1");
    // learner mode: the learner reads the hold back — taken in, as any member takes a message in
    expect("message" in s.reply("msg-1", "readback")).toBe(true);
    expect(surgeon.inbox).toEqual([]);
    // then the learner watches: the simulated surgeon has nothing left to answer
    s.surgeon = "simulated";
    await s.round(new AbortController().signal);
    expect(s.state.messages.filter((m) => m.thread === "thread-1" && m.from === SURGEON && m.kind === "readback")).toHaveLength(1);
    expect(s.state.tasks.filter((t) => t.kind === "wound")).toEqual([]);
  });
});
