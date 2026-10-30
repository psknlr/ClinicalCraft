/** The case list changes in place: the fewest moves to the filtered list, and the selected card kept in view as before. */
import { describe, expect, it } from "vitest";
import { planChildren, revealOffset } from "./library-list.js";

/** Apply a plan the way `placeChildren` applies it to the DOM. */
function apply<T>(current: readonly T[], desired: readonly T[]): { result: T[]; moved: T[] } {
  const plan = planChildren(current, desired);
  const live = current.filter((item) => !plan.remove.includes(item));
  const moved: T[] = [];
  for (const { item, before } of plan.insert) {
    const from = live.indexOf(item);
    if (from >= 0) {
      moved.push(item);
      live.splice(from, 1);
    }
    live.splice(before === null ? live.length : live.indexOf(before), 0, item);
  }
  return { result: live, moved };
}

describe("case list children", () => {
  const all = Array.from({ length: 135 }, (_, n) => `case-${n}`);

  it("a narrower search only detaches cards; a wider one only attaches them, in library order", () => {
    const narrow = all.filter((_, n) => n % 7 === 0);
    const toNarrow = planChildren(all, narrow);
    expect(toNarrow.insert).toEqual([]);
    expect(toNarrow.remove).toHaveLength(135 - narrow.length);
    const toAll = planChildren(narrow, all);
    expect(toAll.remove).toEqual([]);
    expect(toAll.insert.map((op) => op.item)).toEqual(all.filter((_, n) => n % 7 !== 0));
    expect(apply(narrow, all)).toEqual({ result: all, moved: [] });
    // Nothing changes when the search lets the same cases through.
    expect(planChildren(all, all)).toEqual({ remove: [], insert: [] });
  });

  it("swaps the empty-list notice for cards and back", () => {
    expect(apply(["empty"], ["case-1", "case-2"]).result).toEqual(["case-1", "case-2"]);
    expect(apply(["case-1", "case-2"], ["empty"]).result).toEqual(["empty"]);
  });

  it("reaches any order, moving only what the order change needs (a card added to the library takes its place)", () => {
    expect(apply(["a", "c", "d"], ["a", "b", "c", "d"])).toEqual({ result: ["a", "b", "c", "d"], moved: [] });
    expect(apply(["a", "b", "c", "d"], ["d", "a", "b", "c"])).toEqual({ result: ["d", "a", "b", "c"], moved: ["d"] });
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let round = 0; round < 200; round++) {
      const current = all.filter(() => random() < 0.5).sort(() => random() - 0.5);
      const desired = all.filter(() => random() < 0.5).sort(() => random() - 0.5);
      expect(apply(current, desired).result).toEqual(desired);
    }
  });
});

describe("keeping the selected card in view", () => {
  it("moves a card in view nowhere, and one beyond an edge to 8 px inside it", () => {
    expect(revealOffset(40, 150, 480)).toBe(40);
    expect(revealOffset(0, 150, 480)).toBe(0);
    expect(revealOffset(-30, 150, 480)).toBe(8);
    expect(revealOffset(400, 150, 480)).toBe(322);
    expect(revealOffset(2000, 150, 480)).toBe(322);
  });

  it("puts a card taller than the list's view at its top edge", () => {
    expect(revealOffset(100, 170, 160)).toBe(8);
    expect(revealOffset(-200, 170, 160)).toBe(8);
  });
});
