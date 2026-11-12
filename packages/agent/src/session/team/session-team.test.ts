/**
 * The care team in a session (docs/TEAM.md §5): the `team` op needs a case team in in-world mode, and a resume
 * restores the last saved team (`team` transcript items; anything malformed is ignored).
 */
import { describe, expect, it } from "vitest";
import { makeSession, msgsOf } from "../../__fixtures__/harness.js";
import { replayTranscript } from "../../transcript.js";
import type { TranscriptItem } from "../types.js";
import { validTeamCheckpoint } from "./checkpoint.js";
import type { TeamCheckpoint } from "./types.js";

const checkpoint = (round: number): TeamCheckpoint => ({
  format: "clinicalcraft-team@1",
  state: { version: 1, scenario: "s", round, seq: 0, members: [], messages: [], receipts: [], tasks: [], claims: {}, completed: [], posted: [], extra: [] },
  autonomy: "auto",
  surgeon: "learner",
});

describe("the care team in a session", () => {
  it("a case without a team: the team op is refused, in the session's language", async () => {
    const t = await makeSession();
    const events = await t.session.run({ type: "team", action: "step" });
    expect(msgsOf(events, "error")).toMatchObject([{ code: "no_team" }]);
    expect(msgsOf(events, "team_event")).toEqual([]);
    await t.session.close();
  });

  it("resume: the last well-formed team checkpoint of the transcript", () => {
    const item = (ordinal: number, payload: unknown) => ({ type: "team", ordinal, ts: "", payload }) as TranscriptItem;
    const replayed = replayTranscript([item(1, { checkpoint: checkpoint(3) }), item(2, { checkpoint: checkpoint(7) }), item(3, { checkpoint: { format: "other" } })]);
    expect(replayed.team?.state.round).toBe(7);
    expect(replayTranscript([]).team).toBeNull();
  });

  it("a saved team is checked before it is trusted", () => {
    expect(validTeamCheckpoint(checkpoint(1))).not.toBeNull();
    expect(validTeamCheckpoint({ ...checkpoint(1), autonomy: "sometimes" })).toBeNull();
    expect(validTeamCheckpoint({ ...checkpoint(1), state: { ...checkpoint(1).state, version: 2 } })).toBeNull();
    expect(validTeamCheckpoint(null)).toBeNull();
  });
});
