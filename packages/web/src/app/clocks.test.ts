/**
 * Case time in the browser (docs/PROTOCOL.md "Case time"): the staff's round and a real-time case clock run while the
 * learner reads the chart, the orders, the surgery window or the team's panel; they stop when the learner pauses and
 * while an approval waits; resuming starts them again.
 */
import { describe, expect, it } from "vitest";
import type { PanelName } from "./context.js";
import { encounterClockRuns, PAUSING_PANELS } from "./clocks.js";

const runs = (panel: PanelName | null, approvalOpen = false, entered = true) => encounterClockRuns({ entered, approvalOpen, panel });

describe("when the encounter's time runs", () => {
  it("reading the chart, the orders, the surgery window or the team's panel does not stop it", () => {
    for (const panel of [null, "orders", "report", "journal", "surgery", "team", "monitor", "conversation", "board"] as const) expect(runs(panel), String(panel)).toBe(true);
  });

  it("an explicit pause stops it, and resuming starts it again", () => {
    for (const panel of PAUSING_PANELS) expect(runs(panel), panel).toBe(false);
    // paused, then resumed (the pause menu closed): it runs again
    expect([runs("pause"), runs(null)]).toEqual([false, true]);
    // an approval waiting for the learner's answer holds it too, until answered
    expect([runs("orders", true), runs("orders", false)]).toEqual([false, true]);
  });

  it("before the encounter is entered nothing runs", () => {
    expect(runs(null, false, false)).toBe(false);
  });
});
