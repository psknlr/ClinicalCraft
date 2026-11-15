/**
 * What the stand-in waits on the learner for (docs/TEAM.md §4.5, §5): the count before closing is the learner's to say
 * only while they can say it — due and not said, or a recount asked of them —; once said (the team checks it), or before
 * it falls due, a text front-end's `team run` goes on (`owedByLearner`) and the team's status says so (`teamLines`).
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { teamLines } from "../../team-text.js";
import { awaitedLine, learnerCountState, owedByLearner } from "./awaits.js";
import type { MemberState, TeamCheckpoint, TeamMessage, TeamState, TeamTask } from "./types.js";
import { theatreCase } from "../__fixtures__/theatre.js";
import { createSession as createEngineState } from "@clinicalcraft/core";

const STAND_IN = "staff:doc-0";

const member = (id: string, duties: MemberState["duties"], inbox: string[] = []): MemberState => ({ id, staff: id === PRIMARY_ACTOR ? "nurse-2" : id.replace(/^staff:/u, ""), duties, inbox, memory: [], relief: false, absent: false });

const task = (patch: Partial<TeamTask> & Pick<TeamTask, "id" | "kind" | "owner">): TeamTask => ({ need: "x", item: "", for: patch.owner, initiator: patch.owner, thread: `th-${patch.id}`, status: "waiting", since: 0, tried: [], acts: 0, ...patch });

/** The stand-in at the closure, waiting for the count; the learner — in the scrub nurse's place — holds the count duty. */
function waitingForCount(patch: Partial<TeamState> = {}): TeamState {
  return {
    version: 2,
    scenario: null,
    lifecycle: "active",
    round: 30,
    seq: 0,
    members: [member(STAND_IN, ["surgeon"]), member(PRIMARY_ACTOR, ["instruments", "count"]), member("staff:nurse-1", ["circulating"])],
    messages: [],
    receipts: [],
    tasks: [task({ id: "op", kind: "operate", owner: STAND_IN, reason: "count" })],
    claims: {},
    completed: [],
    posted: [],
    extra: [],
    count: { item: "test-swab", baseline: 5, holds: 0, dueRound: 28 },
    ...patch,
  };
}

describe("the count the stand-in waits for", () => {
  it("owed while due and not said; said once the learner's count is recorded; not due before it falls due; owed again on a recount asked", () => {
    const due = waitingForCount();
    expect(learnerCountState(due)).toBe("owed");
    expect(awaitedLine(due, "learner")).toMatchObject({ kind: "count", count: "owed" });
    expect(owedByLearner(due, "learner")).toBe(true);

    const said = waitingForCount({ tasks: [...due.tasks, task({ id: "c", kind: "count", owner: PRIMARY_ACTOR, status: "done" })] });
    expect(learnerCountState(said)).toBe("said");
    expect(awaitedLine(said, "learner")).toMatchObject({ kind: "count", count: "said" });
    // said: a run goes on — the stand-in sees the count settled in its next round
    expect(owedByLearner(said, "learner")).toBe(false);

    const notDue = waitingForCount({ count: { item: "test-swab", baseline: 5, holds: 0 } });
    expect(learnerCountState(notDue)).toBe("notDue");
    expect(owedByLearner(notDue, "learner")).toBe(false);

    const recount: TeamMessage = { id: "msg-9", thread: "th-r", from: "staff:nurse-1", to: PRIMARY_ACTOR, kind: "request", text: { en: "Count again, please.", "zh-CN": "请再清点一次。" }, about: { recount: true }, evidence: [] } as TeamMessage;
    const asked = waitingForCount({ ...said, messages: [recount], members: [member(STAND_IN, ["surgeon"]), member(PRIMARY_ACTOR, ["instruments", "count"], ["msg-9"]), member("staff:nurse-1", ["circulating"])] });
    expect(learnerCountState(asked)).toBe("owed");
    expect(owedByLearner(asked, "learner")).toBe(true);

    // observing, or a member who does not count: nothing is the learner's
    expect(owedByLearner(due, "simulated")).toBe(false);
    expect(learnerCountState(waitingForCount({ members: [member(STAND_IN, ["surgeon"]), member(PRIMARY_ACTOR, ["assist"])] }))).toBeNull();
  });

  it("the team's status says it: say it while owed, the team checks it once said, not due yet", () => {
    const c = theatreCase();
    const state = { ...createEngineState(c), seat: "scrub-nurse" as const };
    const ctx = { caseDef: c, facility: null, state, locale: "en" };
    const words = { reply: (m: string, k: string) => `/team reply ${m} ${k}`, count: () => "/team count" };
    const status = (st: TeamState) => teamLines(ctx, { format: "clinicalcraft-team@1", autonomy: "step", surgeon: "learner", state: st } satisfies TeamCheckpoint, words);
    const due = waitingForCount();
    expect(status(due).lines).toContain("The surgeon waits for the count before closing: say it — /team count.");
    expect(status(due).report?.awaited).toEqual({ kind: "count", count: "owed" });
    const said = waitingForCount({ tasks: [...due.tasks, task({ id: "c", kind: "count", owner: PRIMARY_ACTOR, status: "done" })] });
    expect(status(said).lines).toContain("The surgeon waits for the count before closing: you said it — the team checks it.");
    expect(status(said).report?.awaited).toEqual({ kind: "count", count: "said" });
    expect(status(waitingForCount({ count: { item: "test-swab", baseline: 5, holds: 0 } })).lines).toContain("The surgeon waits for the count before closing: it is not due yet.");
  });
});
