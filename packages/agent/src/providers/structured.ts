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
