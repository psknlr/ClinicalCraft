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
