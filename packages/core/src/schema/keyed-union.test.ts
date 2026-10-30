import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { issuesFromZodError } from "../engine/parse.js";
import { ConditionSchema } from "./common.js";
import { keyedUnion, type KeyedUnion, type KeyedUnionOptions } from "./keyed-union.js";

/** The union behind `ConditionSchema`. */
const keyed = (ConditionSchema as unknown as z.ZodLazy<KeyedUnion<KeyedUnionOptions>>).schema;
/** A plain `z.union` of the same options: one level of the condition DSL as zod parses it (nested conditions are parsed alike). */
const plain = z.union(keyed.options);

/** A parse result as data: the `ZodError`s of union issues as their issues. */
function plainResult(r: z.SafeParseReturnType<unknown, unknown>): unknown {
  const issues = (list: readonly z.ZodIssue[]): unknown[] => list.map((i) => (i.code === "invalid_union" ? { ...i, unionErrors: i.unionErrors.map((e) => issues(e.issues)) } : i));
  return r.success ? { success: true, data: r.data } : { success: false, issues: issues(r.error.issues) };
}

const VALID: unknown[] = [
  { all: [] },
  { all: [{ asked: "a" }, { any: [{ examined: "b" }, { not: { decided: "c" } }] }] },
  { not: { not: { flag: "f" } } },
  { always: true },
  { asked: "pain" },
  { ordered: "x", phase: "y" },
  { phase: "y" },
  { read: "r" },
  { resultReady: "r", phase: "p" },
  { decided: "d" },
  { attempted: "d" },
  { decidedFirstTry: "d" },
  { intervened: "x", minCount: 2 },
  { intervened: "x", whenIndicated: true },
  { flag: "f" },
  { objective: "o" },
  { vital: "hr", op: "gt", value: 100 },
  { elapsed: {} },
  { hints: { lte: 2 } },
  Object.create({ asked: "inherited" }),
];

const INVALID: unknown[] = [
  {},
  null,
  undefined,
  [],
  "asked",
  5,
  { asked: "" },
  { asked: 5 },
  { asked: undefined },
  { asked: "a", phase: undefined },
  { asked: "a", examined: "b" },
  { askd: "pain" },
  { not: {} },
  { not: { asked: "" } },
  { all: {} },
  { all: [{ asked: "a" }, {}] },
  { any: [null] },
  { ordered: "x", phase: "" },
  { read: "x", phase: 1 },
  { examined: "e", phase: "p" },
  { attempted: "d", decided: "d" },
  { intervened: "x", minCount: 0 },
  { intervened: "x", minCount: 1.5 },
  { intervened: "x", whenIndicated: "yes" },
  { always: "yes" },
  { flag: "-bad" },
  { vital: "xx", op: "gt", value: 100 },
  { vital: "hr", op: "gt" },
  { vital: "hr", op: "gt", value: "1" },
  { elapsed: { gte: 1, x: 2 } },
  new Map([["asked", "a"]]),
];

describe("KeyedUnion (ConditionSchema)", () => {
  it("parses every value as z.union does: data, issues and readable messages", async () => {
    for (const value of [...VALID, ...INVALID]) {
      const want = plain.safeParse(value);
      const got = ConditionSchema.safeParse(value);
      expect(plainResult(got), JSON.stringify(value)).toEqual(plainResult(want));
      if (!want.success && !got.success) expect(issuesFromZodError(got.error, value)).toEqual(issuesFromZodError(want.error, value));
      expect(plainResult(await ConditionSchema.safeParseAsync(value))).toEqual(plainResult(await plain.safeParseAsync(value)));
    }
    for (const value of VALID) expect(ConditionSchema.safeParse(value).success, JSON.stringify(value)).toBe(true);
    for (const value of INVALID) expect(ConditionSchema.safeParse(value).success, JSON.stringify(value)).toBe(false);
  });

  it("parses only the option a valid condition's keys name", () => {
    ConditionSchema.parse({ always: true }); // the options' required keys are found on first use
    const notParse = vi.spyOn(keyed.options[2], "_parse");
    const allParse = vi.spyOn(keyed.options[0], "_parse");
    try {
      expect(ConditionSchema.safeParse({ asked: "pain" }).success).toBe(true);
      expect(notParse).not.toHaveBeenCalled();
      expect(ConditionSchema.safeParse({ all: [{ not: { examined: "chest" } }] }).success).toBe(true);
      expect(allParse).toHaveBeenCalledTimes(1);
      expect(notParse).toHaveBeenCalledTimes(1);
    } finally {
      notParse.mockRestore();
      allParse.mockRestore();
    }
  });

  it("builds the condition union once", () => {
    const lazy = ConditionSchema as unknown as z.ZodLazy<z.ZodTypeAny>;
    expect(lazy.schema).toBe(lazy.schema);
    expect(lazy.schema).toBeInstanceOf(z.ZodUnion);
  });

  it("returns the first option that accepts a value, as z.union does", () => {
    const options = [z.object({ a: z.string() }), z.object({ a: z.string(), b: z.number().optional() }), z.object({ b: z.number() })] as const;
    const fast = keyedUnion(options);
    const reference = z.union(options);
    for (const value of [{ a: "x" }, { a: "x", b: 1 }, { a: 1, b: 1 }, { b: 1 }, { b: "1" }, {}]) expect(plainResult(fast.safeParse(value))).toEqual(plainResult(reference.safeParse(value)));
    expect(fast.parse({ a: "x", b: 1 })).toEqual({ a: "x" });
  });
});
