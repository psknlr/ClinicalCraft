/**
 * The web's settings reach a running session (`configure`): the model, approvals, scope, language — and how the
 * characters are driven (docs/CHARACTERS.md), so the "Model-driven characters" switch applies at once.
 */
import { describe, expect, it } from "vitest";
import { mergeSettings } from "@clinicalcraft/agent";
import { configurePatch } from "./session.js";

describe("the settings switch reaches a running session", () => {
  it("carries the character engine with the rest of the settings", () => {
    const on = mergeSettings([{ source: "user", settings: { approvalMode: "strict", characters: { engine: "llm" } } }]);
    expect(configurePatch(on, { provider: "anthropic", model: "m-1" }, "en")).toEqual({ provider: "anthropic", model: "m-1", approvalMode: "strict", practiceScope: "full", characters: { engine: "llm" }, locale: "en" });
    const off = mergeSettings([]);
    expect(configurePatch(off, { provider: "offline", model: null }, "zh-CN")).toMatchObject({ provider: "offline", characters: { engine: "rules" }, locale: "zh-CN" });
  });
});
