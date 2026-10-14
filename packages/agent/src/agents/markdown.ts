/**
 * Markdown + frontmatter definitions for agents and slash commands
 * (Claude Code subagents / custom commands).
 *
 * Frontmatter is a small YAML subset: `key: value`, inline arrays
 * `[a, "b c"]`, block lists (`- item`), single/double-quoted strings,
 * numbers, booleans, `null`/`~`, and `#` comments. Anything fancier is kept
 * as a plain string.
 */
import type { AgentProfile, SlashCommand } from "./types.js";

export type FrontmatterValue = string | number | boolean | null | FrontmatterValue[];

export interface ParsedFrontmatter {
  data: Record<string, FrontmatterValue>;
  body: string;
}

/** Split `---` frontmatter from the body. Text without frontmatter → `{data: {}, body: text}`. */
export function parseFrontmatter(text: string): ParsedFrontmatter {
  const source = text.replace(/^﻿/, "");
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { data: {}, body: source };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    const t = lines[i]!.trim();
    if (t === "---" || t === "...") {
      end = i;
      break;
    }
  }
  if (end === -1) return { data: {}, body: source };
  const data = parseYamlSubset(lines.slice(1, end));
  const body = lines.slice(end + 1).join("\n");
  return { data, body };
}

function stripComment(value: string): string {
  let quote: string | null = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (quote) {
      if (ch === "\\" && quote === '"') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#" && (i === 0 || /\s/.test(value[i - 1]!))) {
      return value.slice(0, i).trimEnd();
    }
  }
  return value;
}

function unquote(raw: string): string {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw.slice(1, -1);
    }
  }
  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

function splitInlineArray(inner: string): string[] {
  const items: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!;
    if (quote) {
      current += ch;
      if (ch === "\\" && quote === '"' && i + 1 < inner.length) current += inner[++i]!;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ",") {
      items.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

/** Parse one scalar or inline array. */
export function parseScalar(raw: string): FrontmatterValue {
  const v = raw.trim();
  if (v === "") return "";
  if (v.startsWith("[") && v.endsWith("]")) return splitInlineArray(v.slice(1, -1)).map(parseScalar);
  if (v.startsWith('"') || v.startsWith("'")) return unquote(v);
  if (v === "true" || v === "True" || v === "TRUE") return true;
  if (v === "false" || v === "False" || v === "FALSE") return false;
  if (v === "null" || v === "~" || v === "Null" || v === "NULL") return null;
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(v)) return Number(v);
  return v;
}

function parseYamlSubset(lines: string[]): Record<string, FrontmatterValue> {
  const data: Record<string, FrontmatterValue> = {};
  let listKey: string | null = null;
  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
    const listItem = /^\s*-(?:\s+(.*))?$/.exec(rawLine);
    if (listItem && listKey) {
      const item = parseScalar(stripComment(listItem[1] ?? ""));
      const current = data[listKey];
      if (Array.isArray(current)) current.push(item);
      else data[listKey] = [item];
      continue;
    }
    const m = /^([A-Za-z_][\w.-]*)\s*:(?:\s+(.*)|\s*)$/.exec(rawLine);
    if (!m) {
      listKey = null;
      continue;
    }
    const key = m[1]!;
    if (key === "__proto__") {
      listKey = null; // never re-prototype the data object
      continue;
    }
    const value = stripComment(m[2] ?? "").trim();
    // An empty value may introduce a block list (`- item` lines); otherwise it stays "".
    data[key] = value === "" ? "" : parseScalar(value);
    listKey = value === "" ? key : null;
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* Agents                                                              */
/* ------------------------------------------------------------------ */

const ROLES = new Set(["npc", "assistant", "examiner"]);
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function asString(v: FrontmatterValue | undefined): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  return String(v);
}

function asStringList(v: FrontmatterValue | undefined): string[] {
  if (v === undefined || v === null || v === "") return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Error raised for invalid agent/command definitions. */
export class DefinitionError extends Error {
  constructor(
    message: string,
    readonly source?: string,
  ) {
    super(message);
    this.name = "DefinitionError";
  }
}

/**
 * Parse an agent profile. Defaults: role `npc`, tools `[]`, model/provider
 * `inherit`, maxToolRounds 4, injectMemory = role !== "npc". `defaultName`
 * (e.g. the file's basename) is used when the frontmatter has no `name`.
 */
export function parseAgentMarkdown(text: string, source: AgentProfile["source"], defaultName?: string): AgentProfile {
  const { data, body } = parseFrontmatter(text);
  const name = asString(data.name)?.trim() || defaultName;
  if (!name) throw new DefinitionError("agent definition is missing `name`");
  if (!NAME_RE.test(name)) throw new DefinitionError(`invalid agent name "${name}" (letters, digits, "-" and "_" only)`);
  const roleRaw = asString(data.role)?.trim() ?? "npc";
  if (!ROLES.has(roleRaw)) throw new DefinitionError(`agent "${name}": role must be npc | assistant | examiner (got "${roleRaw}")`);
  const role = roleRaw as AgentProfile["role"];

  const profile: AgentProfile = {
    name,
    description: asString(data.description)?.trim() ?? "",
    role,
    tools: asStringList(data.tools),
    model: asString(data.model)?.trim() || "inherit",
    provider: asString(data.provider)?.trim() || "inherit",
    maxToolRounds: 4,
    prompt: body.trim(),
    source,
    injectMemory: role !== "npc",
  };
  const effort = asString(data.effort)?.trim();
  if (effort) {
    if (!EFFORTS.has(effort)) throw new DefinitionError(`agent "${name}": effort must be low | medium | high | xhigh | max`);
    profile.effort = effort as NonNullable<AgentProfile["effort"]>;
  }
  if (data.temperature !== undefined && data.temperature !== null && data.temperature !== "") {
    const t = Number(data.temperature);
    if (!Number.isFinite(t) || t < 0 || t > 2) throw new DefinitionError(`agent "${name}": temperature must be a number in [0, 2]`);
    profile.temperature = t;
  }
  if (data.maxToolRounds !== undefined && data.maxToolRounds !== null && data.maxToolRounds !== "") {
    const n = Number(data.maxToolRounds);
    if (!Number.isInteger(n) || n < 0 || n > 100) throw new DefinitionError(`agent "${name}": maxToolRounds must be an integer in [0, 100]`);
    profile.maxToolRounds = n;
  }
  if (typeof data.injectMemory === "boolean") profile.injectMemory = data.injectMemory;
  return profile;
}

/* ------------------------------------------------------------------ */
/* Slash commands                                                      */
/* ------------------------------------------------------------------ */

/**
 * Parse a custom slash command. Frontmatter: `description`, `argument-hint`
 * (or `argumentHint`), `agent`. Without a description the first body line is used.
 */
export function parseCommandMarkdown(name: string, text: string, source: SlashCommand["source"]): SlashCommand {
  const { data, body } = parseFrontmatter(text);
  const template = body.trim();
  const firstLine = template.split("\n").find((l) => l.trim())?.replace(/^#+\s*/, "").trim() ?? "";
  const command: SlashCommand = {
    name,
    description: asString(data.description)?.trim() || (firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine),
    source,
    template,
  };
  const hint = asString(data["argument-hint"] ?? data.argumentHint)?.trim();
  if (hint) command.argumentHint = hint;
  const agent = asString(data.agent)?.trim();
  if (agent) command.agent = agent;
  return command;
}

/** Split arguments on whitespace, honouring "double" and 'single' quotes. */
export function splitArgs(args: string): string[] {
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(args)) !== null) {
    if (m[1] !== undefined) out.push(m[1].replace(/\\(.)/g, "$1"));
    else if (m[2] !== undefined) out.push(m[2]);
    else out.push(m[3]!);
  }
  return out;
}

/** Expand `$ARGUMENTS` (whole string) and `$1`…`$9` (positional, quote-aware) in a template. */
export function expandCommandTemplate(template: string, args: string | readonly string[]): string {
  const whole = typeof args === "string" ? args.trim() : args.join(" ");
  const positional = typeof args === "string" ? splitArgs(args) : [...args];
  return template.replace(/\$(ARGUMENTS|[1-9])/g, (_m, key: string) => (key === "ARGUMENTS" ? whole : (positional[Number(key) - 1] ?? "")));
}
