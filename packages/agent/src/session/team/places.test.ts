/**
 * A place in the care team in a session (docs/TEAM.md §1): the engine would join the team at its phase, but nobody
 * would operate while the learner held the place — no stand-in surgeon is driven yet — so a session does not offer one:
 * a learner's `start` in a place is refused in both languages, and the learner operates as always.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSession as freshState, reduce } from "@clinicalcraft/core";
import { placesCase } from "../../../../core/src/engine/__fixtures__/team-places.js";
import { makeSession, msgsOf } from "../../__fixtures__/harness.js";
import { placeNotOffered } from "./places.js";

const MINI = JSON.parse(readFileSync(new URL("../../../../core/src/engine/__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Record<string, unknown>;
const caseDef = placesCase(MINI);

describe("a place in the care team, in a session", () => {
  it("is not offered yet, in either language: the start in it is refused and the learner operates as always", async () => {
    // the engine itself would take the place and join the team at its phase
    expect(reduce(caseDef, freshState(caseDef), { type: "start", seat: "first-assistant" }).rejected).toBeUndefined();
    const refusals = [
      ["en", "Action not permitted: the first assistant's place in the team is not offered yet: no stand-in surgeon would operate while you held it. Start as the operating surgeon."],
      ["zh-CN", "操作不被允许：暂不提供团队中的第一助手岗位：你担任该岗位时，还没有主刀同事来主刀。请以主刀医生身份开始。"],
    ] as const;
    for (const [locale, refusal] of refusals) {
      const t = await makeSession({ caseDef, settingsPatch: { locale } });
      const refused = await t.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
      expect(msgsOf(refused, "error")).toEqual([expect.objectContaining({ code: "permission_denied", message: refusal })]);
      expect(msgsOf(refused, "clinical_event")).toEqual([]);
      expect(t.session.state.started).toBe(false);
      // the operating surgeon's seat is the learner as always: started, no place
      const started = await t.session.run({ type: "clinical_action", action: { type: "start", seat: "surgeon" } });
      expect(msgsOf(started, "error")).toEqual([]);
      expect(t.session.state.started).toBe(true);
      expect(t.session.state.seat).toBeUndefined();
      expect(t.session.state.joined).toBeUndefined();
      await t.session.close();
    }
  });

  it("only a start in a place in the team is held back", () => {
    expect(placeNotOffered({ type: "start", seat: "scrub-nurse" })).toBe("scrub-nurse");
    expect(placeNotOffered({ type: "start", seat: "second-assistant", lineup: "three-surgeons" })).toBe("second-assistant");
    expect(placeNotOffered({ type: "start", seat: "surgeon" })).toBeNull();
    expect(placeNotOffered({ type: "start" })).toBeNull();
    expect(placeNotOffered({ type: "note", text: "Ready." })).toBeNull();
  });
});
