/** The benchmark's strings exist in both languages with the same placeholders. */
import { describe, expect, it } from "vitest";
import { bm, BENCH_MESSAGE_KEYS, BENCH_MESSAGES_EN, BENCH_MESSAGES_ZH } from "./i18n.js";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("bench i18n", () => {
  it("zh-CN and en define the same keys, non-empty, with the same placeholders", () => {
    expect(Object.keys(BENCH_MESSAGES_ZH).sort()).toEqual([...BENCH_MESSAGE_KEYS].sort());
    for (const key of BENCH_MESSAGE_KEYS) {
      expect(BENCH_MESSAGES_EN[key].trim(), key).not.toBe("");
      expect(BENCH_MESSAGES_ZH[key].trim(), key).not.toBe("");
      expect(placeholders(BENCH_MESSAGES_ZH[key]), key).toEqual(placeholders(BENCH_MESSAGES_EN[key]));
    }
  });

  it("learner-facing text is translated (zh-CN strings carry Chinese)", () => {
    const untranslated = BENCH_MESSAGE_KEYS.filter((k) => !/[一-鿿]/.test(BENCH_MESSAGES_ZH[k]) && !/^(category|report\.(na|trials|node))\b/.test(k));
    expect(untranslated).toEqual([]);
  });

  it("fills placeholders and picks the language", () => {
    expect(bm("en", "cli.run.below", { rate: "50.0 %", required: "100 %" })).toBe("Success rate 50.0 % is below the required 100 %.");
    expect(bm("zh-CN", "demo.step", { n: 3, name: "x" })).toBe("第 3 步 —— x");
    expect(bm("en", "demo.step", { n: 3 })).toBe("Step 3 — {name}");
  });
});
