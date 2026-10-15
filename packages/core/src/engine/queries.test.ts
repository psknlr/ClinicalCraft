import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCase, presentedOptions } from "./index.js";
import type { CaseDefinition } from "../schema/case.js";

const casesDir = fileURLToPath(new URL("../../../content/cases/", import.meta.url));
const cases: CaseDefinition[] = readdirSync(casesDir).flatMap((id) => {
  try {
    const parsed = parseCase(JSON.parse(readFileSync(`${casesDir}${id}/case.json`, "utf8")) as unknown);
    return parsed.ok ? [parsed.value] : [];
  } catch {
    return [];
  }
});

describe("presentedOptions", () => {
  it("is a deterministic permutation per case and decision (ids unchanged)", () => {
    const d = { id: "dx", options: ["a", "b", "c", "d", "e"].map((id) => ({ id })) };
    const once = presentedOptions({ id: "case-x" }, d);
    expect(presentedOptions({ id: "case-x" }, d)).toEqual(once);
    expect(once.map((o) => o.id).sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(d.options.map((o) => o.id)).toEqual(["a", "b", "c", "d", "e"]); // the authored list is untouched
    const orders = new Set(["case-x", "case-y", "case-z", "case-w"].map((id) => presentedOptions({ id }, d).map((o) => o.id).join("")));
    expect(orders.size).toBeGreaterThan(1);
  });

  it.skipIf(cases.length === 0)("no longer presents the correct option(s) first in most built-in decisions", () => {
    let total = 0;
    let authoredFirst = 0;
    let presentedFirst = 0;
    const prefix = (opts: { correct: boolean }[]) => {
      const n = opts.filter((o) => o.correct).length;
      return n > 0 && n < opts.length && opts.slice(0, n).every((o) => o.correct);
    };
    for (const c of cases) {
      for (const d of c.decisions) {
        total++;
        if (prefix(d.options)) authoredFirst++;
        if (prefix(presentedOptions(c, d))) presentedFirst++;
      }
    }
    expect(authoredFirst / total).toBeGreaterThan(0.5); // the authoring habit the shuffle counters
    expect(presentedFirst / total).toBeLessThan(0.4);
  });
});
