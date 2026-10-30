/** The library search waits for typing to pause and never searches an input method's unfinished pinyin. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_PAUSE_MS, searchInput } from "./search-input.js";

function box() {
  const queries: string[] = [];
  let refreshes = 0;
  const input = searchInput({ query: (text) => queries.push(text), refresh: () => refreshes++ });
  return { input, queries, refreshes: () => refreshes };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("library search input", () => {
  it("keeps the query current at once but filters the list once, after typing pauses", () => {
    const { input, queries, refreshes } = box();
    for (const text of ["c", "ch", "che", "ches", "chest"]) {
      input.input(text);
      vi.advanceTimersByTime(SEARCH_PAUSE_MS - 50);
    }
    expect(queries).toEqual(["c", "ch", "che", "ches", "chest"]);
    expect(refreshes()).toBe(0);
    expect(input.pending).toBe(true);
    vi.advanceTimersByTime(50);
    expect(refreshes()).toBe(1);
    expect(input.pending).toBe(false);
  });

  it("ignores composition updates (pinyin) and searches the committed text when composition ends", () => {
    const { input, queries, refreshes } = box();
    input.compositionStart();
    for (const pinyin of ["x", "xi", "xiong", "xiong t", "xiong tong"]) input.input(pinyin, true);
    // Chromium sends the committed text in one more composing input event, before compositionend.
    input.input("胸痛", true);
    vi.advanceTimersByTime(SEARCH_PAUSE_MS * 4);
    expect(queries).toEqual([]);
    expect(refreshes()).toBe(0);
    input.compositionEnd("胸痛");
    expect(queries).toEqual(["胸痛"]);
    vi.advanceTimersByTime(SEARCH_PAUSE_MS);
    expect(refreshes()).toBe(1);
    // A browser that flags composing input only by compositionstart/end (no isComposing) is covered too.
    input.compositionStart();
    input.input("tou");
    input.compositionEnd("胸痛 头痛");
    expect(queries).toEqual(["胸痛", "胸痛 头痛"]);
  });

  it("flushes on Enter, and a rebuild with the current query cancels the waiting refresh", () => {
    const { input, refreshes } = box();
    input.input("fever");
    input.flush();
    expect(refreshes()).toBe(1);
    input.flush();
    expect(refreshes()).toBe(1);
    input.input("fever rash");
    input.cancel();
    vi.advanceTimersByTime(SEARCH_PAUSE_MS * 2);
    expect(refreshes()).toBe(1);
    expect(input.pending).toBe(false);
  });
});
