/**
 * Structured output (`ChatRequest.responseFormat`) support per wire/vendor.
 *
 *   - Anthropic first-party Claude → `output_config.format {type:"json_schema", schema}`;
 *   - OpenAI-compatible → `response_format` `json_schema` (strict) where the
 *     vendor supports it, `json_object` + instruction where only JSON mode
 *     exists, otherwise an instruction appended to the system prompt.
 * Callers must still parse the reply defensively.
 */
import type { ChatRequest, SystemSection } from "./types.js";

export type ResponseFormat = NonNullable<ChatRequest["responseFormat"]>;
export type StructuredOutputMode = "json_schema" | "json_object" | "none";

const JSON_SCHEMA_PROVIDERS = new Set(["openai", "xai", "ollama", "lmstudio"]);
const JSON_OBJECT_PROVIDERS = new Set(["zhipu", "zai", "deepseek", "moonshot", "qwen"]);

/** How an OpenAI-compatible provider can be asked for JSON. */
export function structuredOutputMode(providerId: string, model: string): StructuredOutputMode {
  if (providerId === "openai") return /^(gpt-4o|gpt-4\.1|gpt-5|o[1-9])/i.test(model) ? "json_schema" : "json_object";
  if (JSON_SCHEMA_PROVIDERS.has(providerId)) return "json_schema";
  if (JSON_OBJECT_PROVIDERS.has(providerId)) return "json_object";
  return "none";
}

/** Whether a Claude model accepts `output_config.format` (first-party API, Claude 4.1+). */
export function anthropicSupportsStructuredOutput(model: string, firstParty: boolean): boolean {
  return firstParty && /^claude-(?!3|instant|2|opus-4-0|sonnet-4-0|opus-4-\d{8}|sonnet-4-\d{8}|opus-4$|sonnet-4$)/i.test(model);
}

/**
 * Whether a JSON Schema satisfies OpenAI strict structured-output rules:
 * every object node lists ALL its properties in `required` and sets
 * `additionalProperties: false` (checked recursively through properties,
 * items, anyOf/oneOf/allOf, $defs/definitions). Strict mode with a
 * non-conforming schema is a 400, so such schemas are sent with strict:false.
 */
export function isStrictCompatibleSchema(schema: unknown, depth = 0): boolean {
  if (depth > 32 || schema === null || typeof schema !== "object") return true;
  if (Array.isArray(schema)) return schema.every((s) => isStrictCompatibleSchema(s, depth + 1));
  const node = schema as Record<string, unknown>;
  const props = node.properties && typeof node.properties === "object" && !Array.isArray(node.properties) ? (node.properties as Record<string, unknown>) : null;
  const isObject = node.type === "object" || (Array.isArray(node.type) && node.type.includes("object")) || props !== null;
  if (isObject) {
    if (node.additionalProperties !== false) return false;
    const required = Array.isArray(node.required) ? node.required : [];
    if (props && !Object.keys(props).every((k) => required.includes(k))) return false;
  }
  const children: unknown[] = [];
  if (props) children.push(...Object.values(props));
  for (const key of ["items", "anyOf", "oneOf", "allOf", "prefixItems"]) if (node[key] !== undefined) children.push(node[key]);
  for (const key of ["$defs", "definitions"]) {
    const defs = node[key];
    if (defs && typeof defs === "object" && !Array.isArray(defs)) children.push(...Object.values(defs));
  }
  return children.every((c) => isStrictCompatibleSchema(c, depth + 1));
}

/** Keywords Claude's structured outputs reject (the SDK's `.parse()` strips them too; callers re-validate). */
const ANTHROPIC_UNSUPPORTED = new Set(["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "maxItems", "uniqueItems", "minProperties", "maxProperties"]);
/** Keywords whose value is a map of name → subschema. */
const SCHEMA_MAPS = new Set(["properties", "$defs", "definitions", "patternProperties"]);
/** Keywords whose value is a subschema or a list of subschemas. */
const SCHEMA_CHILDREN = new Set(["items", "not", "contains", "anyOf", "oneOf", "allOf", "prefixItems"]);

/**
 * Adapt a JSON Schema to Claude's structured-output subset (`output_config.format`):
 * every object gets `additionalProperties: false` (required by the API) and
 * unsupported numeric/string/array constraints are removed (callers parse and
 * validate the reply anyway). Returns null when the schema cannot be adapted
 * (an object whose `additionalProperties` is a schema or `true` on purpose, e.g.
 * a map) — the caller then falls back to a JSON instruction. Never mutates the input.
 */
export function toAnthropicOutputSchema(schema: Record<string, unknown>): Record<string, unknown> | null {
  let adaptable = true;
  const walk = (node: unknown, depth: number): unknown => {
    if (depth > 64 || node === null || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map((n) => walk(n, depth + 1));
    const src = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(src)) {
      if (ANTHROPIC_UNSUPPORTED.has(key)) continue;
      if (key === "minItems" && typeof value === "number" && value > 1) continue;
      if (SCHEMA_MAPS.has(key) && value && typeof value === "object" && !Array.isArray(value)) {
        out[key] = Object.fromEntries(Object.entries(value).map(([name, sub]) => [name, walk(sub, depth + 1)]));
      } else if (SCHEMA_CHILDREN.has(key)) {
        out[key] = walk(value, depth + 1);
      } else {
        out[key] = value;
      }
    }
    const isObject = src.type === "object" || (Array.isArray(src.type) && src.type.includes("object")) || (src.properties !== undefined && src.type === undefined);
    if (isObject) {
      if (src.additionalProperties === undefined || src.additionalProperties === false) out.additionalProperties = false;
      else adaptable = false;
    }
    return out;
  };
  const adapted = walk(schema, 0) as Record<string, unknown>;
  return adaptable ? adapted : null;
}

/** OpenAI requires `^[a-zA-Z0-9_-]{1,64}$` for json_schema names. */
export function sanitizeSchemaName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return cleaned || "response";
}

/** Instruction text used when the wire cannot enforce the schema. */
export function jsonInstruction(format: ResponseFormat): string {
  return (
    `Respond with ONLY one JSON object (no prose, no Markdown code fences) named "${format.name}" ` +
    `that validates against this JSON Schema:\n${JSON.stringify(format.schema)}`
  );
}

/** System sections plus a trailing dynamic section carrying the JSON instruction. */
export function withJsonInstruction(system: readonly SystemSection[], format: ResponseFormat): SystemSection[] {
  return [...system, { id: "response-format", text: jsonInstruction(format), cache: "dynamic" }];
}
