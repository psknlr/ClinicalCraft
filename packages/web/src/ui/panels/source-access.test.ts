import { beforeAll, describe, expect, it } from "vitest";
import { createSession, type CaseDefinition } from "@clinicalcraft/core";
import { loadContent } from "../../app/content.js";
import { sourceMaterialUnlocked } from "../../app/source-access.js";
import { buildLearningRecord } from "../../app/record.js";
import type { Game } from "../../app/context.js";
import type { RuntimeChoice } from "../../app/llm.js";

let published: CaseDefinition;
beforeAll(async () => {
  await loadContent().loadCase("smzl-lung-adeno");
  published = loadContent().peekCase("smzl-lung-adeno")!;
});

describe("published source material does not give away the case", () => {
  it("stays locked at presentation and after partial objective completion", () => {
    const state = createSession(published);
    expect(sourceMaterialUnlocked(published, state)).toBe(false);
    state.objectivesDone[published.objectives[0]!.id] = 0;
    expect(sourceMaterialUnlocked(published, state)).toBe(false);
  });
  it("unlocks with the debrief when all objectives are complete or the case is finished", () => {
    const state = createSession(published);
    for (const o of published.objectives) state.objectivesDone[o.id] = 0;
    expect(sourceMaterialUnlocked(published, state)).toBe(true);
    expect(sourceMaterialUnlocked(published, { ...createSession(published), finished: true })).toBe(true);
  });
  it("keeps synthetic teaching credits available", () => {
    const synthetic = { ...published, provenance: { ...published.provenance, kind: "synthetic" as const } };
    expect(sourceMaterialUnlocked(synthetic, createSession(synthetic))).toBe(true);
  });
  it("omits the diagnosis-bearing citation from an in-progress learning record", () => {
    const state = createSession(published);
    const game = {
      caseDef: published, facility: { id: "general-hospital" },
      session: { session: { state, id: "test", snapshot: () => ({ actions: [] }) }, store: { chat: [] } },
    } as unknown as Game;
    const choice = { mode: "offline" } as RuntimeChoice;
    const initial = buildLearningRecord(game, "en", choice).case as Record<string, unknown>;
    expect(initial.citation).toBeNull();
    expect(initial.doi).toBeNull();
    state.finished = true;
    const completed = buildLearningRecord(game, "en", choice).case as Record<string, unknown>;
    expect(completed.citation).toBe(published.provenance.citation);
    expect(completed.doi).toBe(published.provenance.doi);
  });
});
