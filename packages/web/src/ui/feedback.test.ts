/**
 * Action feedback that asks the learner to act ("Go there", the act to do first) stays until handled; a step being
 * taken or a refusal nothing fixes leaves by itself (audit §4.2: important guidance must not vanish in a busy
 * encounter).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { actionRequired, ActionFeedback, FEEDBACK_MS } from "./feedback.js";

afterEach(() => vi.useRealTimers());

const feedback = () => new ActionFeedback(() => null, () => null, () => undefined);

describe("action feedback", () => {
  it("a refusal with the way there stays until the learner takes it or dismisses it", () => {
    vi.useFakeTimers();
    const f = feedback();
    const item = { text: "Not here", goal: { kind: "interact", id: "patient" } as const, label: "Go to the patient", tone: "refused" as const };
    expect(actionRequired(item)).toBe(true);
    f.show(item);
    vi.advanceTimersByTime(FEEDBACK_MS * 4);
    expect(f.current).toBe(item);
    f.clear();
    expect(f.current).toBeNull();
  });

  it("an act to do first is action-required too", () => {
    expect(actionRequired({ text: "IV first", goal: null, label: null, tone: "refused", action: { label: "IV access first", run: () => undefined } })).toBe(true);
  });

  it("a short step being taken, or a refusal nothing fixes, leaves by itself", () => {
    vi.useFakeTimers();
    const f = feedback();
    f.show({ text: "Walking over…", goal: null, label: null, tone: "info" });
    vi.advanceTimersByTime(FEEDBACK_MS + 1);
    expect(f.current).toBeNull();
    f.show({ text: "Nothing here can do this", goal: null, label: null, tone: "refused" });
    vi.advanceTimersByTime(FEEDBACK_MS + 1);
    expect(f.current).toBeNull();
  });
});
