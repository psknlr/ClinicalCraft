/**
 * The learner's tool set (review S2) is exactly the clinical tools of PROTOCOL §3 (without the front-end's
 * `walk_to`) and the world tools of §12.4 — never an NPC's tool.
 */
import { describe, expect, it } from "vitest";
import { clinicalTools, walkToTool } from "./clinical.js";
import { isLearnerTool, LEARNER_CLINICAL_TOOLS, LEARNER_TOOL_NAMES, WORLD_TOOL_NAMES } from "./learner.js";
import { npcTools } from "./npc.js";
import { WORLD_TOOL_SPECS } from "./world.js";

describe("learner tools", () => {
  it("are the clinical tools (no walk_to) and the world tools, in a stable order", () => {
    expect([...LEARNER_CLINICAL_TOOLS].sort()).toEqual(clinicalTools().map((t) => t.name).filter((n) => n !== walkToTool.name).sort());
    expect([...WORLD_TOOL_NAMES]).toEqual(WORLD_TOOL_SPECS.map((s) => s.name));
    expect(LEARNER_TOOL_NAMES).toEqual([...LEARNER_CLINICAL_TOOLS, ...WORLD_TOOL_NAMES]);
  });

  it("never include an NPC's tool or a front-end's", () => {
    const npc = npcTools().map((t) => t.name);
    expect(npc.length).toBeGreaterThan(0);
    for (const name of [...npc, walkToTool.name, "submit_answer"]) expect(isLearnerTool(name), name).toBe(false);
  });
});
