/**
 * Minimal JSON-Schema (draft 2020-12 subset) validator for tool arguments —
 * model JSON is never trusted (docs/PROTOCOL.md §3).
 *
 * Supported keywords: `type` (string or array), `enum`, `const`,
 * `properties`, `required`, `additionalProperties` (boolean or schema),
 * `items`, `minItems`/`maxItems`, `minLength`/`maxLength`,
 * `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`.
 *
 * Lenient coercions for common model slips (only when `coerce` is on):
 * a JSON-encoded object string for the top-level arguments, numeric strings
 * for number/integer fields, "true"/"false" for booleans and a bare value
 * where an array is expected.
 */

export type JsonSchema = Record<string, unknown>;

export interface ValidationResult {
  ok: boolean;
  /** The (possibly coerced) value. */
  value: unknown;
  errors: string[];
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function matchesType(value: unknown, type: string): boolean {
  const actual = typeOf(value);
  if (type === "number") return actual === "number" || actual === "integer";
  return actual === type;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceTo(value: unknown, types: string[]): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((types.includes("number") || types.includes("integer")) && /^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      if (types.includes("number") || Number.isInteger(n)) return n;
    }
    if (types.includes("boolean") && (trimmed === "true" || trimmed === "false")) return trimmed === "true";
  }
  if (types.includes("array") && !Array.isArray(value) && value !== undefined && value !== null) return [value];
  return value;
}

function describe(value: unknown): string {
  try {
    const s = JSON.stringify(value);
    return s && s.length > 60 ? `${s.slice(0, 57)}...` : String(s);
  } catch {
    return String(value);
  }
}

function validateNode(schema: JsonSchema, value: unknown, path: string, errors: string[], coerce: boolean): unknown {
  const where = path || "(root)";
  const rawType = schema.type;
  const types = typeof rawType === "string" ? [rawType] : Array.isArray(rawType) ? rawType.filter((t): t is string => typeof t === "string") : [];
  let v = value;
  if (types.length > 0 && !types.some((t) => matchesType(v, t)) && coerce) v = coerceTo(v, types);
  if (types.length > 0 && !types.some((t) => matchesType(v, t))) {
    errors.push(`${where}: expected ${types.join(" | ")}, got ${typeOf(v)}`);
    return v;
  }
  if ("const" in schema && JSON.stringify(schema.const) !== JSON.stringify(v)) errors.push(`${where}: must equal ${describe(schema.const)}`);
  if (Array.isArray(schema.enum) && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) {
    errors.push(`${where}: must be one of ${schema.enum.map(describe).join(", ")}`);
  }
  if (typeof v === "string") {
    if (typeof schema.minLength === "number" && v.length < schema.minLength) errors.push(`${where}: must have at least ${schema.minLength} characters`);
    if (typeof schema.maxLength === "number" && v.length > schema.maxLength) errors.push(`${where}: must have at most ${schema.maxLength} characters`);
  }
  if (typeof v === "number") {
    if (typeof schema.minimum === "number" && v < schema.minimum) errors.push(`${where}: must be ≥ ${schema.minimum}`);
    if (typeof schema.maximum === "number" && v > schema.maximum) errors.push(`${where}: must be ≤ ${schema.maximum}`);
    if (typeof schema.exclusiveMinimum === "number" && v <= schema.exclusiveMinimum) errors.push(`${where}: must be > ${schema.exclusiveMinimum}`);
    if (typeof schema.exclusiveMaximum === "number" && v >= schema.exclusiveMaximum) errors.push(`${where}: must be < ${schema.exclusiveMaximum}`);
  }
  if (Array.isArray(v)) {
    if (typeof schema.minItems === "number" && v.length < schema.minItems) errors.push(`${where}: must have at least ${schema.minItems} item(s)`);
    if (typeof schema.maxItems === "number" && v.length > schema.maxItems) errors.push(`${where}: must have at most ${schema.maxItems} item(s)`);
    if (isRecord(schema.items)) {
      const itemSchema = schema.items;
      v = v.map((item, i) => validateNode(itemSchema, item, `${path}[${i}]`, errors, coerce));
    }
  }
  if (isRecord(v)) {
    const properties = isRecord(schema.properties) ? (schema.properties as Record<string, JsonSchema>) : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((r): r is string => typeof r === "string") : [];
    const out: Record<string, unknown> = {};
    for (const key of required) {
      if (v[key] === undefined) errors.push(`${path ? `${path}.` : ""}${key}: is required`);
    }
    for (const [key, item] of Object.entries(v)) {
      const childPath = path ? `${path}.${key}` : key;
      if (item === undefined) continue;
      const propSchema = properties[key];
      if (propSchema) {
        out[key] = validateNode(propSchema, item, childPath, errors, coerce);
      } else if (schema.additionalProperties === false) {
        errors.push(`${childPath}: unknown property`);
      } else if (isRecord(schema.additionalProperties)) {
        out[key] = validateNode(schema.additionalProperties, item, childPath, errors, coerce);
      } else {
        out[key] = item;
      }
    }
    v = out;
  }
  return v;
}

/**
 * Validate (and leniently coerce) tool arguments against a JSON schema.
 * `undefined`/`null` top-level arguments are treated as `{}` for object schemas.
 */
export function validateArgs(schema: JsonSchema, value: unknown, options: { coerce?: boolean } = {}): ValidationResult {
  const coerce = options.coerce ?? true;
  let v = value;
  if (schema.type === "object") {
    if (v === undefined || v === null || v === "") v = {};
    else if (typeof v === "string" && coerce) {
      try {
        v = JSON.parse(v) as unknown;
      } catch {
        /* reported below as a type error */
      }
    }
  }
  const errors: string[] = [];
  const out = validateNode(schema, v, "", errors, coerce);
  return { ok: errors.length === 0, value: out, errors };
}
