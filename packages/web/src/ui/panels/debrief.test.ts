/**
 * The web debrief of a place in the care team (docs/TEAM.md §1): the "first try" metric counts the decisions that are
 * the learner's to answer — the report's, as the CLI's assess summary does: in a place, a decision the team answered
 * before the learner joined is the team's, never counted against them; a rubric item of another place is said to be
 * so ("Not scored in your place"), never that its situation did not arise.
 */
import { readFileSync } from "node:fs";
import { assess, replay, type ClinicalAction } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { PLACES_TEAM, placesCase } from "../../../../core/src/engine/__fixtures__/team-places.js";
import { setLocale, tr } from "../../i18n/index.js";
import { firstTryMetric, notScoredWhy } from "./debrief.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const MINI: Json = JSON.parse(readFileSync(new URL("../../../../core/src/engine/__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));

describe("the debrief's first-try metric", () => {
  it("in a place: of the decisions left to the learner when they joined (the report's), never the case's all", () => {
    // the diagnosis made before the team's phase: the team's in the scrub nurse's place
    const EARLY: ClinicalAction[] = [
      ...MINI.solution.slice(0, 4),
      { type: "order", investigationId: "abg" },
      { type: "answer", decisionId: "dx", optionIds: ["anaphylaxis"] },
      ...MINI.solution.slice(4, 6),
      { type: "answer", decisionId: "disposition", optionIds: ["referral", "observe", "autoinjector"] },
      { type: "finish" },
    ];
    const k = placesCase(MINI, PLACES_TEAM, { solution: EARLY });
    const scrub = replay(k, [{ type: "start", seat: "scrub-nurse" }, { type: "answer", decisionId: "disposition", optionIds: ["referral", "observe", "autoinjector"] }, { type: "finish" }]);
    expect(scrub.rejections).toEqual([]);
    const report = assess(k, scrub.state);
    expect(report.joined?.decisions).toEqual(["dx"]);
    expect(firstTryMetric(k, report)).toEqual({ firstTry: 1, of: 1 });
    // the operator's encounter counts every decision, as always
    expect(firstTryMetric(k, assess(k, replay(k, EARLY).state))).toEqual({ firstTry: 2, of: 2 });
    // before the report: the case's decisions
    expect(firstTryMetric(k, null)).toEqual({ firstTry: 0, of: k.decisions.length });
  });
});

describe("a rubric item the debrief does not score", () => {
  it("in a place: another place's item says so — not scored in your place —; one whose situation did not arise says that", () => {
    // the mini case's rubric is the operating surgeon's (no `seats`) but for one the scrub nurse's place shares
    const rubric = (MINI.rubric as Json[]).map((r) => (r.id === "comms" ? { ...r, seats: ["surgeon", "scrub-nurse"] } : r.id === "airway" ? { ...r, scoredWhen: { asked: "meds" } } : r));
    const k = placesCase(MINI, PLACES_TEAM, { rubric });
    const scrub = assess(k, replay(k, [{ type: "start", seat: "scrub-nurse" }]).state);
    expect(scrub.seat).toBe("scrub-nurse");
    expect(notScoredWhy(k, scrub, "epi-given")).toBe("place");
    expect(notScoredWhy(k, scrub, "no-beta")).toBe("place");
    // the place's own item is scored; one the place does not list is another place's, whatever its situation
    expect(notScoredWhy(k, scrub, "comms")).toBeNull();
    expect(notScoredWhy(k, scrub, "airway")).toBe("place");
    // operating (no place): the item whose situation did not arise says so; every other is scored
    const operating = assess(k, replay(k, [{ type: "start" }]).state);
    expect(operating.seat).toBeUndefined();
    expect(notScoredWhy(k, operating, "airway")).toBe("situation");
    expect(notScoredWhy(k, operating, "epi-given")).toBeNull();
    // in the learner's words, in both languages
    setLocale("en");
    expect([tr("debrief.otherPlace"), tr("debrief.otherPlaceHint")]).toEqual(["Not scored in your place", "This item is another place's."]);
    setLocale("zh-CN");
    expect([tr("debrief.otherPlace"), tr("debrief.otherPlaceHint")]).toEqual(["不计入你担任的岗位", "该项属于其他岗位。"]);
  });
});
