import { describe, expect, it } from "vitest";
import { createRng, hashString, seedFrom } from "./index.js";

describe("createRng", () => {
  it("reproduces the V4 LCG sequence (seed 7103)", () => {
    // V4 custom_cn.js: k = 7103, S = () => (k = k * 1664525 + 1013904223 >>> 0, k / 4294967296)
    let k = 7103;
    const S = () => ((k = (k * 1664525 + 1013904223) >>> 0), k / 4294967296);
    const rng = createRng(7103);
    for (let i = 0; i < 1000; i++) expect(rng()).toBe(S());
  });

  it("yields values in [0, 1) and is deterministic per seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const values = Array.from({ length: 200 }, () => a());
    expect(values).toEqual(Array.from({ length: 200 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(createRng(43)()).not.toBe(createRng(42)());
    expect(createRng(-1)()).toBe(createRng(0xffffffff)());
  });
});

describe("hashString / seedFrom", () => {
  it("implements 32-bit FNV-1a", () => {
    expect(hashString("")).toBe(0x811c9dc5);
    expect(hashString("a")).toBe(0xe40c292c);
    expect(hashString("foobar")).toBe(0xbf9cf968);
  });

  it("derives stable seeds from parts", () => {
    expect(seedFrom("case", 3, "hr")).toBe(hashString("case|3|hr"));
    expect(seedFrom("case", 3, "hr")).not.toBe(seedFrom("case", 4, "hr"));
  });
});
