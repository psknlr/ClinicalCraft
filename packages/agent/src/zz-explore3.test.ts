import { it } from "vitest";
import { matchHistory } from "@clinicalcraft/core";
import { loadMiniCase } from "./__fixtures__/harness.js";
it("band", () => {
  const c = loadMiniCase();
  for (const u of ["how long chest", "chest", "how long", "pain arm", "heavy", "tell me about the pain timing", "is the pain like pressure", "start", "family heart", "describe", "when", "pills", "radiate", "how long has the pain"]) {
    console.log(JSON.stringify(u), JSON.stringify(matchHistory(c, u, "en")));
  }
});
