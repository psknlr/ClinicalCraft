/**
 * A case as the content API serves it leaves its reference solution out (`publicCase`, `learnerCase`), and a place in
 * the care team joins the team along that path (docs/TEAM.md §1): the places such a case offers are the places its start
 * accepts — the operating surgeon's only — so the browser is never offered a place its own session would then refuse.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSession, parseCase, reduce, seatsOf, TEAM_PLACES } from "@clinicalcraft/core";
import { placesCase } from "../../core/src/engine/__fixtures__/team-places.js";
import { learnerCase, publicCase } from "./content.js";

const MINI = JSON.parse(readFileSync(new URL("../../core/src/engine/__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Record<string, unknown>;

describe("places in the care team of a served case", () => {
  it("the full case offers places in the team; the served forms only the operating surgeon's, and their start refuses another", () => {
    const full = placesCase(MINI);
    expect(seatsOf(full)).toEqual(["surgeon", "first-assistant", "scrub-nurse"]);
    for (const form of [publicCase(full), learnerCase(full)]) {
      // parsed as a front-end parses what it fetched
      const parsed = parseCase(JSON.parse(JSON.stringify(form)));
      if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
      const served = parsed.value;
      expect(served.solution).toEqual([]);
      for (const lineup of [undefined, "three-surgeons"]) {
        expect(seatsOf(served, { lineup })).toEqual(["surgeon"]);
        for (const seat of TEAM_PLACES) {
          const r = reduce(served, createSession(served), { type: "start", seat, ...(lineup ? { lineup } : {}) });
          expect(r.rejected, `${seat} ${lineup}`).toEqual({
            code: "invalid",
            message: "this case was loaded without its reference solution, which a place in the team joins along: only the operating surgeon's place is offered",
          });
        }
        expect(reduce(served, createSession(served), { type: "start", seat: "surgeon", ...(lineup ? { lineup } : {}) }).rejected).toBeUndefined();
      }
    }
  });
});
