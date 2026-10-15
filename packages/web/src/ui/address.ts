/**
 * `@role text` addressing for the conversation input: Chinese role names and
 * full-width @ use the agent router's alias table (`ADDRESS_ALIASES`, shared
 * with the CLI, exec and MCP), so `@护士 …` means the same everywhere.
 */
import { ADDRESS_ALIASES } from "@clinicalcraft/agent";

export { ADDRESS_ALIASES };

/** Resolve `@role text` (incl. Chinese aliases) → {to, text}; unknown roles stay plain text. */
export function parseAddress(raw: string, available: string[]): { to: string | null; text: string } {
  const input = raw.trim();
  const m = /^[@＠](\S+?)[\s,:，：]+([\s\S]*)$/.exec(input) ?? /^[@＠](\S+)$/.exec(input);
  if (!m) return { to: null, text: input };
  const key = m[1];
  const role = (Object.hasOwn(ADDRESS_ALIASES, key) ? ADDRESS_ALIASES[key] : undefined) ?? key.toLowerCase();
  if (available.includes(role)) return { to: role, text: (m[2] ?? "").trim() };
  // Chinese needs no space: "@护士现在血压多少" → nurse, "现在血压多少" (longest alias first).
  const body = input.slice(1);
  const alias = Object.keys(ADDRESS_ALIASES)
    .sort((a, b) => b.length - a.length)
    .find((a) => body.startsWith(a) && available.includes(ADDRESS_ALIASES[a]!));
  if (alias) return { to: ADDRESS_ALIASES[alias]!, text: body.slice(alias.length).replace(/^[\s,:，：]+/, "").trim() };
  return { to: null, text: input };
}
