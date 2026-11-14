/**
 * A place in the care team for a case played without its reference solution (docs/TEAM.md §1): the place path a server
 * serves beside the case (`placePath`) is what core's start needs — with it in as the solution (`withPlacePath`), the
 * served case offers the full case's places and a start in a place joins the team exactly as with the full case — and
 * nothing else of the solution: no answer, order or finish beyond the join, only the operator's operative steps.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import { placesCase } from "./__fixtures__/team-places.js";
import { lapCholeTeamCase } from "./procedure/__fixtures__/lap-chole-team.js";
import { placePath, withPlacePath } from "./place-path.js";
import { createSession, reduce } from "./reducer.js";
import { canJoinTeam, seatsOf } from "./seats.js";
import { TEAM_PLACES } from "../schema/positions.js";

const MINI = JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Record<string, unknown>;

/** The case as a server serves it: no reference solution. */
const served = (c: CaseDefinition): CaseDefinition => ({ ...c, solution: [] });

/** Every start a learner may make in the case: with each line-up (or none), in each place. */
function starts(c: CaseDefinition) {
  return [undefined, ...(c.team?.lineups ?? []).map((l) => l.id)].flatMap((lineup) => TEAM_PLACES.map((seat) => ({ type: "start" as const, seat, ...(lineup ? { lineup } : {}) })));
}

describe("the place path of a case served without its solution", () => {
  for (const [name, full] of [
    ["the mini case's team (the join: an airway, two questions, two drugs)", placesCase(MINI)],
    ["the lap-chole team (an operation the stand-in works)", lapCholeTeamCase()],
  ] as const) {
    it(`${name}: the served case with its path offers the same places and joins the same way`, () => {
      const path = placePath(full);
      const withPath = withPlacePath(served(full), path);
      // nothing offered without it (the join cannot follow the reference path) ...
      expect(seatsOf(served(full))).toEqual(["surgeon"]);
      // ... the full case's places with it, with every line-up
      for (const lineup of [undefined, ...(full.team?.lineups ?? []).map((l) => l.id)]) expect(seatsOf(withPath, { lineup })).toEqual(seatsOf(full, { lineup }));
      for (const start of starts(full)) {
        const a = reduce(full, createSession(full), start);
        const b = reduce(withPath, createSession(withPath), start);
        expect(b.rejected, JSON.stringify(start)).toEqual(a.rejected);
        expect(b.state, JSON.stringify(start)).toEqual(a.state);
        expect(b.events, JSON.stringify(start)).toEqual(a.events);
      }
      // the operator's plan is the full solution's: every operative step, in order
      expect(path.filter((x) => x.type === "operate")).toEqual(full.solution.filter((x) => x.type === "operate"));
    });
  }

  it("carries the start, the join's own actions and the operative steps — no later answer, order or finish", () => {
    const full = placesCase(MINI);
    const joined = reduce(full, createSession(full), { type: "start", seat: "first-assistant" }).state.joined!.actions;
    expect(joined).toBe(5);
    expect(placePath(full)).toEqual(full.solution.slice(0, 1 + joined));
    expect(placePath(full).map((a) => a.type)).toEqual(["start", "examine", "ask", "ask", "intervene", "intervene"]);
    expect(full.solution.some((a) => a.type === "answer" || a.type === "finish")).toBe(true);
    const lap = lapCholeTeamCase();
    expect(placePath(lap).map((a) => a.type)).toEqual(["start", "set-phase", ...lap.solution.filter((a) => a.type === "operate").map(() => "operate")]);
    expect(placePath(lap).some((a) => a.type === "finish")).toBe(false);
  });

  it("an operation-only case (it starts in the team's phase): joined at once without its solution, but the stand-in's plan is in the path only", () => {
    const solution = lapCholeTeamCase().solution.filter((a) => a.type !== "set-phase");
    const full = lapCholeTeamCase({ initialPhase: "theatre", solution });
    // served, it can be joined (nothing to join along: it starts in the team's phase) and offers its places ...
    expect(canJoinTeam(served(full))).toBe(true);
    expect(seatsOf(served(full))).toEqual(seatsOf(full));
    expect(reduce(full, createSession(full), { type: "start", seat: "first-assistant" }).state.joined?.actions ?? 0).toBe(0);
    // ... but the operative steps the stand-in surgeon works from are the solution's: none in the served case, all in its path
    expect(served(full).solution.filter((a) => a.type === "operate")).toEqual([]);
    const path = placePath(full);
    expect(path.map((a) => a.type)).toEqual(["start", ...solution.filter((a) => a.type === "operate").map(() => "operate")]);
    expect(withPlacePath(served(full), path).solution.filter((a) => a.type === "operate")).toEqual(full.solution.filter((a) => a.type === "operate"));
    for (const start of starts(full)) expect(reduce(withPlacePath(served(full), path), createSession(full), start).state, JSON.stringify(start)).toEqual(reduce(full, createSession(full), start).state);
  });

  it("is empty for a case that offers no place in the team; the path never replaces a solution a case carries", () => {
    const noStandIn = placesCase(MINI, { ...JSON.parse(JSON.stringify(placesCase(MINI).team)), members: placesCase(MINI).team!.members.map((m) => (m.staff === "surgeon" ? { staff: "surgeon", duties: ["surgeon"] } : m)) });
    expect(placePath(noStandIn)).toEqual([]);
    expect(placePath(served(placesCase(MINI)))).toEqual([]);
    const full = placesCase(MINI);
    expect(withPlacePath(full, [{ type: "start" }])).toBe(full);
    expect(withPlacePath(served(full), [])).toEqual(served(full));
  });
});
