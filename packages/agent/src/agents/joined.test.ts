/**
 * The debrief of a place in the team (docs/TEAM.md §1; docs/GLOSSARY.md "done by the team before you joined"): the
 * offline examiner's narrative and `/debrief` say which place the learner held and what the team had done before they
 * joined — shown, never credited — and count only the objectives that were left to the learner; the operating surgeon's
 * debrief is as it was.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assess, createSession, reduce } from "@clinicalcraft/core";
import { placesCase } from "../../../core/src/engine/__fixtures__/team-places.js";
import { makeSession, msgsOf } from "../__fixtures__/harness.js";
import { examinerOffline } from "./offline.js";

const MINI = JSON.parse(readFileSync(new URL("../../../core/src/engine/__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Record<string, unknown>;
const caseDef = placesCase(MINI);

describe("the debrief of a place in the team", () => {
  it("the offline narrative: the learner's objectives only, then the place and what the team did before they joined — in both languages", () => {
    const placed = reduce(caseDef, createSession(caseDef), { type: "start", seat: "first-assistant" }).state;
    const report = assess(caseDef, placed);
    expect(report.joined?.objectives).toEqual(["assess", "treat", "stabilise"]);
    const en = examinerOffline(caseDef, report, "en").narrative;
    expect(en).toContain("Objectives 0/2.");
    expect(en).toContain(
      "Your place in the team: first assistant. Done by the team before you joined (not credited to you): history (2 question(s)); examination (1 finding(s)); objectives (Assess airway and allergy history, Give first-line treatment, Stabilise oxygenation).",
    );
    const zh = examinerOffline(caseDef, report, "zh-CN").narrative;
    expect(zh).toContain("你担任的岗位：第一助手。你加入前由团队完成（不计入你的成绩）：病史（2 项）；体格检查（1 项）；目标（");
    // the operating surgeon: as always
    const operating = assess(caseDef, reduce(caseDef, createSession(caseDef), { type: "start" }).state);
    const plain = examinerOffline(caseDef, operating, "en").narrative;
    expect(plain).toContain("Objectives 0/5.");
    expect(plain).not.toMatch(/Your place|before you joined/);
  });

  it("/debrief says it too, with the place and the team's part in its data", async () => {
    const t = await makeSession({ caseDef });
    t.session.dispatch({ type: "start", seat: "first-assistant", by: "system" });
    // the rest of the reference path, to the finish
    for (const action of caseDef.solution.slice(1 + t.session.state.joined!.actions)) expect(t.session.dispatch({ ...action, by: "system" }).rejected, action.type).toBeUndefined();
    expect(t.session.state.finished).toBe(true);
    const events = await t.session.run({ type: "user_message", text: "/debrief" });
    const out = msgsOf(events, "command_output").at(-1)!;
    expect(out.text).toContain("Your place in the team: first assistant.");
    expect(out.text).toContain("Done by the team before you joined (not credited to you): history (2 question(s)); examination (1 finding(s)); objectives (");
    expect(out.data).toMatchObject({ place: "first-assistant", joined: { history: ["trigger", "allergies"], exam: ["airway"], objectives: ["assess", "treat", "stabilise"] } });
    await t.session.close();
  });
});
