import { z } from "zod";

/** Options of a `KeyedUnion`: object schemas (at least two, as for `z.union`). */
export type KeyedUnionOptions = Readonly<[z.AnyZodObject, z.AnyZodObject, ...z.AnyZodObject[]]>;

/**
 * `z.union` of object schemas told apart by their keys (the condition DSL:
 * `{ all }`, `{ asked }`, `{ vital, op, value }`…) with a fast path for a
 * value one of them accepts: only the options whose required keys are all
 * present are parsed, and the first of them that accepts the value is the
 * result — the option `z.union` returns too, since an option missing a
 * required key never accepts a value. A value no option accepts is parsed by
 * `z.union` itself, so its issues and error messages are exactly zod's.
 *
 * Why: `z.union` parses the options in turn until one accepts the value, and
 * a rejected option holding a union of its own (`{ not: Condition }` meeting
 * `{ asked: … }` parses `undefined` as a condition) builds a `ZodError` —
 * stack trace included — per option of that inner union: about twenty per
 * condition, most of the time a large case library took to load.
 */
export class KeyedUnion<T extends KeyedUnionOptions> extends z.ZodUnion<T> {
  /** The required keys of each option, found on first use (a recursive option's lazy schema may not exist before); null meanwhile. */
  #required: readonly (readonly string[])[] | null | undefined;

  override _parse(input: z.ParseInput): z.ParseReturnType<this["_output"]> {
    const { ctx } = this._processInputParams(input);
    const data: unknown = ctx.data;
    const required = !ctx.common.async && typeof data === "object" && data !== null && !Array.isArray(data) ? this.#requiredKeys() : null;
    if (required) {
      const value = data as Record<string, unknown>;
      for (let i = 0; i < this.options.length; i++) {
        if (required[i]!.some((key) => value[key] === undefined)) continue;
        // Parsed as `z.union` parses an option: in a context of its own, whose issues are dropped.
        const child: z.ParseContext = { ...ctx, common: { ...ctx.common, issues: [] }, parent: null };
        const result = this.options[i]!._parseSync({ data, path: ctx.path, parent: child });
        if (result.status === "valid") return result as z.ParseReturnType<this["_output"]>;
      }
    }
    return super._parse(input);
  }

  /** A key is required when its schema rejects `undefined`. Null while being found (a nested parse takes the slow path). */
  #requiredKeys(): readonly (readonly string[])[] | null {
    if (this.#required === undefined) {
      this.#required = null;
      this.#required = this.options.map((o) => Object.entries(o.shape as z.ZodRawShape).flatMap(([key, schema]) => (schema.isOptional() ? [] : [key])));
    }
    return this.#required;
  }
}

/** `z.union(options)` as a `KeyedUnion`: the same definition, so JSON Schemas generated from it do not change. */
export function keyedUnion<T extends KeyedUnionOptions>(options: T): KeyedUnion<T> {
  return new KeyedUnion({ options, typeName: z.ZodFirstPartyTypeKind.ZodUnion });
}
